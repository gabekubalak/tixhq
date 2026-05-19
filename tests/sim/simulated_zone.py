"""Simulated growing zone.

Generates synthetic sensor traces that drive the control loop without any
hardware. Useful for:
  - Replaying a drying-shelf trace and verifying the planner issues the
    expected dose volumes.
  - Smoke-testing the bus end-to-end on a developer laptop.

Run:
    python tests/sim/simulated_zone.py --shelf 3 --hours 24

The simulator publishes:
  - grove.zone.{id}.sensor.moisture            every 1 s
  - grove.manifold.sensor.{ec|ph|flow}         every 5 s
  - grove.composter.sensor.{ec|temp}           every 10 s
and subscribes to grove.command.dose to observe what the planner asks for.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import random
import time

from nats.aio.client import Client as NATS


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


async def _moisture_loop(nats: NATS, shelf: int, dry_rate_pct_per_h: float) -> None:
    moisture = 70.0
    while True:
        moisture -= dry_rate_pct_per_h / 3600.0
        moisture = max(20.0, min(95.0, moisture + random.gauss(0, 0.1)))
        for probe in ("A", "B", "C"):
            await nats.publish(f"grove.zone.{shelf}.sensor.moisture",
                json.dumps({
                    "ts": _now(), "shelf_id": shelf, "probe_id": probe,
                    "value_pct": round(moisture, 2), "raw_adc": 1800,
                    "quality": "ok",
                }).encode())
        await asyncio.sleep(1.0)


async def _manifold_loop(nats: NATS) -> None:
    t = 0.0
    while True:
        ec = 1.2 + 0.1 * math.sin(t / 600.0) + random.gauss(0, 0.01)
        ph = 6.1 + 0.05 * math.sin(t / 900.0) + random.gauss(0, 0.01)
        for kind, value in (("ec", ec), ("ph", ph), ("flow", 1.0)):
            await nats.publish(f"grove.manifold.sensor.{kind}",
                json.dumps({"ts": _now(), "kind": kind, "value": round(value, 3)}).encode())
        t += 5
        await asyncio.sleep(5.0)


async def _composter_loop(nats: NATS) -> None:
    temp = 58.0
    while True:
        temp += random.gauss(0, 0.3)
        for kind, value in (("temp", temp), ("ec", 1.8)):
            await nats.publish(f"grove.composter.sensor.{kind}",
                json.dumps({"ts": _now(), "kind": kind, "value": round(value, 2)}).encode())
        await asyncio.sleep(10.0)


async def _dose_observer(nats: NATS) -> None:
    sub = await nats.subscribe("grove.command.dose")
    async for msg in sub.messages:
        print("dose observed:", msg.data.decode())


async def amain() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--shelf", type=int, default=0)
    p.add_argument("--dry-rate", type=float, default=2.0, help="%/hour")
    args = p.parse_args()

    nats = NATS()
    await nats.connect("nats://127.0.0.1:4222")
    await asyncio.gather(
        _moisture_loop(nats, args.shelf, args.dry_rate),
        _manifold_loop(nats),
        _composter_loop(nats),
        _dose_observer(nats),
    )


if __name__ == "__main__":
    asyncio.run(amain())
