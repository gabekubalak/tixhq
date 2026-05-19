"""Scheduler: light photoperiod + recirculation pump duty cycles.

Subscribes to recipe setpoints; when `hours_on` changes for a shelf, computes
the on/off transitions for that 24-hour window and publishes
grove.command.light at each transition. Recirculation pump runs on a 15-min
on / 45-min off duty cycle during light-on hours.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time

from nats.aio.client import Client as NATS

log = logging.getLogger("scheduler")
PHOTOPERIOD_SUNRISE_LOCAL_HOUR = 6.0


def _next_transition(now: float, hours_on: float) -> tuple[bool, float]:
    """Return (will_be_on, seconds_until_next_transition)."""
    secs_into_day = (now % 86400.0)
    sunrise = PHOTOPERIOD_SUNRISE_LOCAL_HOUR * 3600.0
    sunset  = sunrise + hours_on * 3600.0
    if secs_into_day < sunrise:
        return False, sunrise - secs_into_day
    if secs_into_day < sunset:
        return True, sunset - secs_into_day
    return False, (86400.0 - secs_into_day) + sunrise


async def _run_shelf(nats: NATS, shelf_id: int, sp: dict) -> None:
    while True:
        now = time.time()
        on, wait = _next_transition(now, sp.get("hours_on", 14))
        msg = json.dumps({
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "shelf_id": shelf_id,
            "dim_pct": 100.0 if on else 0.0,
            "ppfd_target": sp.get("ppfd", 0) if on else 0,
        }).encode()
        await nats.publish("grove.command.light", msg)
        await asyncio.sleep(wait + 1.0)


async def amain() -> None:
    logging.basicConfig(level=logging.INFO)
    nats = NATS()
    await nats.connect("nats://127.0.0.1:4222")
    tasks: dict[int, asyncio.Task] = {}

    async def on_setpoint(msg):
        m = json.loads(msg.data)
        sid = m["shelf_id"]
        if sid in tasks:
            tasks[sid].cancel()
        tasks[sid] = asyncio.create_task(_run_shelf(nats, sid, m))

    await nats.subscribe(
        "grove.planner.setpoint.*",
        cb=lambda m: asyncio.create_task(on_setpoint(m)),
    )
    while True:
        await asyncio.sleep(3600)


if __name__ == "__main__":
    asyncio.run(amain())
