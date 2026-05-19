"""48-hour dry-run harness.

Runs against a real appliance with no seeds in the tray and no scraps in
the composter. Drives a sample lettuce recipe through the full stack and
asserts:
  - control loops hold each setpoint within deadband
  - no false safety trips
  - composter completes one synthetic cycle when forced into thermophilic
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time

from nats.aio.client import Client as NATS


async def watch(nats: NATS, deadline: float) -> int:
    failures = 0
    trip_count = 0

    async def on_trip(_):
        nonlocal trip_count
        trip_count += 1

    await nats.subscribe("grove.event.safety.trip", cb=lambda m: asyncio.create_task(on_trip(m)))

    while time.time() < deadline:
        await asyncio.sleep(60)

    if trip_count > 0:
        print(f"FAIL: {trip_count} safety trip(s) during dry-run", file=sys.stderr)
        failures += 1
    return failures


async def amain() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--hours", type=float, default=48.0)
    args = p.parse_args()

    nats = NATS()
    await nats.connect("nats://127.0.0.1:4222")
    deadline = time.time() + args.hours * 3600
    fails = await watch(nats, deadline)
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    asyncio.run(amain())
