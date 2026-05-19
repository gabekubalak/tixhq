"""Safety supervisor fault injection.

Publishes synthetic out-of-bounds telemetry and asserts the safety watcher
emits grove.event.safety.trip within 1 s. Run against a live bus.
"""

from __future__ import annotations

import asyncio
import json
import sys
import time

from nats.aio.client import Client as NATS


async def expect_trip(nats: NATS, cause: str, send: dict) -> None:
    seen: list[dict] = []
    sub = await nats.subscribe(
        "grove.event.safety.trip",
        cb=lambda m: seen.append(json.loads(m.data)),
    )
    await nats.publish(send["subject"], json.dumps(send["body"]).encode())
    deadline = time.monotonic() + 1.0
    while time.monotonic() < deadline and not seen:
        await asyncio.sleep(0.05)
    await sub.unsubscribe()
    if not seen:
        print(f"FAIL: no trip for {cause}", file=sys.stderr); sys.exit(1)
    if seen[0].get("cause") != cause:
        print(f"FAIL: trip cause mismatch: got {seen[0].get('cause')} want {cause}", file=sys.stderr)
        sys.exit(1)
    print(f"PASS: trip on {cause}")


async def amain() -> None:
    nats = NATS()
    await nats.connect("nats://127.0.0.1:4222")
    cases = [
        {
            "cause": "ec_runaway",
            "subject": "grove.manifold.sensor.ec",
            "body": {"ts": "2026-01-01T00:00:00Z", "kind": "ec", "value": 4.5},
        },
        {
            "cause": "ph_high",
            "subject": "grove.manifold.sensor.ph",
            "body": {"ts": "2026-01-01T00:00:00Z", "kind": "ph", "value": 8.5},
        },
        {
            "cause": "over_temp",
            "subject": "grove.composter.sensor.temp",
            "body": {"ts": "2026-01-01T00:00:00Z", "kind": "temp", "value": 70.0},
        },
    ]
    for c in cases:
        await expect_trip(nats, c["cause"], {"subject": c["subject"], "body": c["body"]})


if __name__ == "__main__":
    asyncio.run(amain())
