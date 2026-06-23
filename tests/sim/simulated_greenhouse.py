"""Simulated greenhouse.

Drives every NATS subject KrattOS expects in a greenhouse deployment, with
physics that are crude but coupled enough to be useful: the outside air
follows a daily sine, the inside air lags it (thermal mass), every bed
dries between waterings, EC drifts as plants drink, and the composter
moves through its thermal phases. Reads the site profile to know how
many beds to simulate.

Run:
    python tests/sim/simulated_greenhouse.py
    python tests/sim/simulated_greenhouse.py --profile shelf-mini-v1
    python tests/sim/simulated_greenhouse.py --time-scale 60  # 1 minute = 1 hour

The simulator publishes:
  - kratt.zone.{id}.sensor.moisture        every 1 s, every bed in the profile
  - kratt.zone.{id}.sensor.temp            every 2 s
  - kratt.zone.{id}.sensor.ec              every 5 s (NFT/DWC beds only)
  - kratt.manifold.sensor.{ec|ph|flow}     every 5 s
  - kratt.composter.sensor.{temp|ec}       every 10 s
  - kratt.composter.state                  every 30 s
  - kratt.climate.outside                  every 30 s (outside air ref)
  - kratt.climate.inside                   every 30 s (greenhouse interior)
and subscribes to kratt.command.{dose,valve} to log what the planner asks
for, plus simulates the watering effect when a valve opens.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import os
import random
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

from nats.aio.client import Client as NATS

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "services" / "site-config"))

from site_config import load_profile, SiteProfile  # noqa: E402


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


@dataclass
class BedState:
    """One growing bed's running simulation state."""
    zone_id: int
    label: str
    medium: str
    moisture_pct: float = 70.0
    temp_c: float = 22.0
    ec_ms_cm: float = 1.6
    last_watered_at: float = field(default_factory=time.time)


@dataclass
class GreenhouseState:
    """Greenhouse climate, manifold, and composter shared state."""
    inside_air_c: float = 22.0
    inside_rh_pct: float = 55.0
    manifold_ec: float = 1.4
    manifold_ph: float = 6.1
    manifold_flow_lpm: float = 0.0
    reservoir_level_pct: float = 78.0
    composter_temp_c: float = 56.0
    composter_phase: str = "thermophilic"
    composter_hours_above_55c: float = 48.0


def _outside_air_c(t_secs: float) -> float:
    """Daily sine, minimum near 05:00 local (~6 C), peak near 17:00 (~26 C),
    average 16 C. Symmetric 12-hour swing, which is rough but adequate for
    the sim."""
    day_frac = (t_secs / 86400.0) % 1.0
    hour = day_frac * 24.0
    return 16.0 - 10.0 * math.cos(math.pi * (hour - 5.0) / 12.0)


def _solar_flux(t_secs: float) -> float:
    """0 at night, 1 at solar noon. Used to drive plant transpiration."""
    day_frac = (t_secs / 86400.0) % 1.0
    if day_frac < 0.25 or day_frac > 0.83:
        return 0.0
    return math.sin(math.pi * (day_frac - 0.25) / 0.58)


# --------------------------------------------------------------------------
# Per-zone loops
# --------------------------------------------------------------------------

async def _bed_loop(nats: NATS, bed: BedState, gh: GreenhouseState, scale: float) -> None:
    """Moisture, temperature, and (for hydro beds) EC for one zone."""
    sample_period = 1.0
    counter = 0
    while True:
        # Plants drink in proportion to sunlight + heat. Drying is faster
        # in NFT beds (constant flow exposure) than soil.
        sun = _solar_flux(time.time() * scale)
        dry_rate = 0.3 + 1.4 * sun
        if bed.medium == "soil":
            dry_rate *= 0.6
        bed.moisture_pct -= dry_rate * sample_period / 60.0
        bed.moisture_pct += random.gauss(0, 0.08)
        bed.moisture_pct = max(15.0, min(98.0, bed.moisture_pct))

        # Bed temp follows inside air with a small lag.
        bed.temp_c += (gh.inside_air_c - bed.temp_c) * 0.04
        bed.temp_c += random.gauss(0, 0.05)

        # EC creeps up slightly as water evaporates faster than nutrient
        # uptake (concentration effect), unless we just watered.
        if bed.medium in ("nft", "dwc", "ebb_flow"):
            bed.ec_ms_cm += 0.0008 * sun
            bed.ec_ms_cm += random.gauss(0, 0.005)
            bed.ec_ms_cm = max(0.3, min(3.5, bed.ec_ms_cm))

        # Publish moisture every tick
        for probe in ("A", "B"):
            await nats.publish(
                f"kratt.zone.{bed.zone_id}.sensor.moisture",
                json.dumps({
                    "ts": _now(),
                    "shelf_id": bed.zone_id,
                    "probe_id": probe,
                    "value_pct": round(bed.moisture_pct, 2),
                    "raw_adc": 1800,
                    "quality": "ok",
                }).encode(),
            )

        # Temp every 2 ticks
        if counter % 2 == 0:
            await nats.publish(
                f"kratt.zone.{bed.zone_id}.sensor.temp",
                json.dumps({
                    "ts": _now(),
                    "shelf_id": bed.zone_id,
                    "value_c": round(bed.temp_c, 2),
                }).encode(),
            )

        # EC every 5 ticks (hydro only)
        if counter % 5 == 0 and bed.medium in ("nft", "dwc", "ebb_flow"):
            await nats.publish(
                f"kratt.zone.{bed.zone_id}.sensor.ec",
                json.dumps({
                    "ts": _now(),
                    "shelf_id": bed.zone_id,
                    "value": round(bed.ec_ms_cm, 3),
                }).encode(),
            )

        counter += 1
        await asyncio.sleep(sample_period)


# --------------------------------------------------------------------------
# Shared loops (manifold, composter, climate)
# --------------------------------------------------------------------------

async def _climate_loop(nats: NATS, gh: GreenhouseState, scale: float) -> None:
    """Outside + inside air. Inside lags outside; vents pull it back to
    the setpoint when it gets hot."""
    while True:
        t = time.time() * scale
        outside = _outside_air_c(t) + random.gauss(0, 0.3)
        # Solar gain: greenhouses heat fast in the sun
        gain = 8.0 * _solar_flux(t)
        target = outside + gain
        gh.inside_air_c += (target - gh.inside_air_c) * 0.05
        # Vents bleed off above 28 °C
        if gh.inside_air_c > 28.0:
            gh.inside_air_c -= 0.3
        gh.inside_rh_pct = 45.0 + 20.0 * (1.0 - _solar_flux(t)) + random.gauss(0, 1.5)
        gh.inside_rh_pct = max(20.0, min(95.0, gh.inside_rh_pct))

        await nats.publish("kratt.climate.outside",
            json.dumps({"ts": _now(), "air_c": round(outside, 2)}).encode())
        await nats.publish("kratt.climate.inside",
            json.dumps({
                "ts": _now(),
                "air_c": round(gh.inside_air_c, 2),
                "rh_pct": round(gh.inside_rh_pct, 1),
            }).encode())
        await asyncio.sleep(30.0)


async def _manifold_loop(nats: NATS, gh: GreenhouseState, beds: list[BedState]) -> None:
    """Manifold reflects the average of the beds (with noise)."""
    while True:
        # Pull-down: manifold EC roughly follows the beds.
        if beds:
            target_ec = sum(b.ec_ms_cm for b in beds) / len(beds)
            gh.manifold_ec += (target_ec - gh.manifold_ec) * 0.1
        gh.manifold_ec += random.gauss(0, 0.01)
        gh.manifold_ph += random.gauss(0, 0.005)
        gh.manifold_ph = max(5.0, min(7.5, gh.manifold_ph))
        gh.manifold_flow_lpm = 0.85 + random.gauss(0, 0.05) if random.random() < 0.4 else 0.0

        for kind, value in (
            ("ec", gh.manifold_ec),
            ("ph", gh.manifold_ph),
            ("flow", gh.manifold_flow_lpm),
        ):
            await nats.publish(
                f"kratt.manifold.sensor.{kind}",
                json.dumps({"ts": _now(), "kind": kind, "value": round(value, 3)}).encode(),
            )
        await asyncio.sleep(5.0)


async def _composter_loop(nats: NATS, gh: GreenhouseState, scale: float) -> None:
    """Composter slowly works through its FSM phases.

    Now models real thermophilic biology: heat comes from microbial
    activity (no electric heater), so when aeration drops the pile cools
    toward ambient because anaerobic bacteria don't produce the same
    metabolic heat. Two probes at slightly different positions report
    independently so the controller's two-probe min-logic can be tested.
    """
    PHASES = ["grinding", "mesophilic", "thermophilic", "cure", "tank_ready"]
    # Aeration runs by default during mesophilic / thermophilic
    aeration_lpm = 0.85
    counter = 0
    while True:
        is_active = gh.composter_phase in ("mesophilic", "thermophilic")
        aeration_lpm = 0.85 + random.gauss(0, 0.03) if is_active else 0.0
        aeration_lpm = max(0.0, aeration_lpm)

        # Heat target. If aeration is starved during an active phase, the
        # microbes can't sustain temperature and the pile coasts to ambient.
        if not is_active or aeration_lpm < 0.1:
            target = 22.0  # ambient
        elif gh.composter_phase == "thermophilic":
            target = 60.0
        else:
            target = 42.0
        gh.composter_temp_c += (target - gh.composter_temp_c) * 0.05
        gh.composter_temp_c += random.gauss(0, 0.2)

        if gh.composter_phase == "thermophilic" and gh.composter_temp_c >= 55.0:
            gh.composter_hours_above_55c += 30 / 3600.0 * scale

        # Phase transitions every ~20 ticks (real seconds × time_scale).
        if counter > 0 and counter % 20 == 0:
            try:
                idx = PHASES.index(gh.composter_phase)
                if idx < len(PHASES) - 1:
                    gh.composter_phase = PHASES[idx + 1]
            except ValueError:
                gh.composter_phase = "thermophilic"

        # Two probes at slightly different positions. Probe a is center,
        # probe b is closer to the wall and reads ~2 C cooler.
        for probe_id, offset in (("a", 0.0), ("b", -2.0)):
            await nats.publish(
                "kratt.composter.sensor.temp",
                json.dumps({
                    "ts": _now(), "kind": "temp",
                    "probe_id": probe_id,
                    "value": round(gh.composter_temp_c + offset + random.gauss(0, 0.1), 2),
                }).encode(),
            )
        # Aeration flow reading (consumed by the controller's aeration health check)
        await nats.publish(
            "kratt.composter.sensor.aeration_lpm",
            json.dumps({"ts": _now(), "kind": "aeration_lpm", "value": round(aeration_lpm, 3)}).encode(),
        )
        # Higher-level state pulse so the dashboard has something to render.
        await nats.publish(
            "kratt.composter.state",
            json.dumps({
                "ts": _now(),
                "phase": gh.composter_phase,
                "temp_c": round(gh.composter_temp_c, 2),
                "hours_above_55c": round(gh.composter_hours_above_55c, 2),
                "batch_id": "sim-0001",
            }).encode(),
        )
        counter += 1
        await asyncio.sleep(10.0)


# --------------------------------------------------------------------------
# Actuator observers (watering causes moisture to spike)
# --------------------------------------------------------------------------

async def _valve_observer(nats: NATS, beds: dict[int, BedState]) -> None:
    """Listen for valve open commands; if it matches a bed, bump moisture
    and EC behavior so the next physics tick reflects the watering."""
    async def cb(msg):
        try:
            cmd = json.loads(msg.data)
        except Exception:
            return
        if not cmd.get("open"):
            return
        # Convention: valve_id is "bedN" or "shelfN"
        v = str(cmd.get("valve_id", ""))
        for prefix in ("bed", "shelf"):
            if v.startswith(prefix):
                try:
                    zid = int(v[len(prefix):])
                except ValueError:
                    continue
                if zid in beds:
                    b = beds[zid]
                    b.moisture_pct = min(98.0, b.moisture_pct + 18.0)
                    b.last_watered_at = time.time()
                    # A watering dilutes the bed EC toward the manifold.
                    b.ec_ms_cm = (b.ec_ms_cm * 0.7) + (1.4 * 0.3)
                    print(f"sim: bed {zid} watered ({v})")
                return
    await nats.subscribe("kratt.command.valve", cb=cb)


async def _dose_observer(nats: NATS) -> None:
    async def cb(msg):
        try:
            d = json.loads(msg.data)
            print(f"sim: dose observed: {d.get('pump_id')} {d.get('volume_ml')}ml ({d.get('reason')})")
        except Exception:
            pass
    await nats.subscribe("kratt.command.dose", cb=cb)


# --------------------------------------------------------------------------
# Entry
# --------------------------------------------------------------------------

async def amain(args) -> None:
    profile: SiteProfile = load_profile(
        args.profile,
        profile_dir=ROOT / "profiles",
        schema_path=ROOT / "schemas" / "kratt.site.profile.schema.json",
    )

    print(f"sim: profile={profile.name} ({profile.form_factor}), {len(profile.zones)} zones, time_scale={args.time_scale}x")

    beds: dict[int, BedState] = {}
    for z in profile.zones:
        beds[z.id] = BedState(zone_id=z.id, label=z.label, medium=z.medium)

    gh = GreenhouseState()

    nats = NATS()
    await nats.connect(os.environ.get("NATS_URL", "nats://127.0.0.1:4222"))

    tasks = [
        _climate_loop(nats, gh, args.time_scale),
        _manifold_loop(nats, gh, list(beds.values())),
        _composter_loop(nats, gh, args.time_scale),
        _valve_observer(nats, beds),
        _dose_observer(nats),
    ]
    for b in beds.values():
        tasks.append(_bed_loop(nats, b, gh, args.time_scale))

    await asyncio.gather(*tasks)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--profile", default="greenhouse-v1", help="profile name under profiles/")
    p.add_argument("--time-scale", type=float, default=60.0, help="how fast simulated time runs vs real time")
    asyncio.run(amain(p.parse_args()))


if __name__ == "__main__":
    main()
