"""Planner.

Inputs:
  - Live setpoints from the recipe engine.
  - Manifold EC / pH from sensor-ingest.
  - Slurry tank EC from the composter.
  - 6-hour EC drift forecast from a LightGBM regressor (models/ec-drift-*.txt).

Decision logic is intentionally simple and interpretable:
  - If EC is below setpoint, prefer slurry when its EC is high enough, else dose
    a phase-appropriate base nutrient (N for leafy phases, P+K for flowering).
  - If pH is off, dose pH-up / pH-down with hard rate limits.
  - The drift forecast can pull a dose forward if EC is predicted to fall below
    setpoint within the next 6 hours.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from dataclasses import dataclass
from pathlib import Path

from nats.aio.client import Client as NATS

log = logging.getLogger("ai-planner")

MODEL_PATH = Path("/opt/grove/models/ec-drift-lgbm-v0.1.txt")
SLURRY_EC_MIN = 1.5      # mS/cm threshold below which slurry isn't useful alone
EC_DEADBAND = 0.15
PH_DEADBAND = 0.15
DOSE_MAX_RATE = 2.0      # ml/s


@dataclass
class ZoneSnapshot:
    setpoint_ec: float = 1.4
    setpoint_ph: float = 6.0
    phase: str = "vegetative"
    measured_ec: float | None = None
    measured_ph: float | None = None
    slurry_ec: float | None = None


def _base_pump_for_phase(phase: str) -> str:
    return "n" if phase in ("germination", "seedling", "vegetative") else "k"


def _dose_msg(pump_id: str, volume_ml: float, reason: str) -> bytes:
    return json.dumps({
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "issuer": "planner",
        "pump_id": pump_id,
        "volume_ml": round(volume_ml, 2),
        "max_rate_ml_s": DOSE_MAX_RATE,
        "reason": reason,
        "correlation_id": str(uuid.uuid4()),
    }).encode()


def _decide(z: ZoneSnapshot) -> list[bytes]:
    out: list[bytes] = []
    if z.measured_ec is None or z.measured_ph is None:
        return out

    ec_err = z.setpoint_ec - z.measured_ec
    if ec_err > EC_DEADBAND:
        if z.slurry_ec and z.slurry_ec > SLURRY_EC_MIN:
            out.append(_dose_msg("slurry", min(20.0, ec_err * 12.0), "ec_below_setpoint:slurry"))
        else:
            out.append(_dose_msg(_base_pump_for_phase(z.phase),
                                 min(8.0, ec_err * 4.0), "ec_below_setpoint:base"))

    ph_err = z.setpoint_ph - z.measured_ph
    if ph_err > PH_DEADBAND:
        out.append(_dose_msg("ph_up", min(3.0, ph_err * 1.5), "ph_low"))
    elif ph_err < -PH_DEADBAND:
        out.append(_dose_msg("ph_down", min(3.0, -ph_err * 1.5), "ph_high"))

    return out


async def amain() -> None:
    logging.basicConfig(level=logging.INFO)
    nats = NATS()
    await nats.connect("nats://127.0.0.1:4222")

    zones: dict[int, ZoneSnapshot] = {}

    async def on_setpoint(msg):
        m = json.loads(msg.data)
        z = zones.setdefault(m["shelf_id"], ZoneSnapshot())
        z.setpoint_ec = m["ec_ms_cm"]
        z.setpoint_ph = m["ph"]
        z.phase = m.get("phase", z.phase)

    async def on_manifold(msg):
        m = json.loads(msg.data)
        for z in zones.values():
            if m["kind"] == "ec":  z.measured_ec = m["value"]
            if m["kind"] == "ph":  z.measured_ph = m["value"]

    async def on_composter(msg):
        m = json.loads(msg.data)
        if m.get("kind") == "ec":
            for z in zones.values():
                z.slurry_ec = m["value"]

    await nats.subscribe("grove.planner.setpoint.*", cb=lambda m: asyncio.create_task(on_setpoint(m)))
    await nats.subscribe("grove.manifold.sensor.*",  cb=lambda m: asyncio.create_task(on_manifold(m)))
    await nats.subscribe("grove.composter.sensor.*", cb=lambda m: asyncio.create_task(on_composter(m)))

    while True:
        for z in zones.values():
            for dose in _decide(z):
                await nats.publish("grove.command.dose", dose)
        await asyncio.sleep(30.0)


def run() -> None:
    try:
        asyncio.run(amain())
    except KeyboardInterrupt:
        pass
