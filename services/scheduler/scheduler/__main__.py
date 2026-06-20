"""Scheduler: light photoperiod + recirculation pump duty cycles.

Subscribes to recipe setpoints; when `hours_on` changes for a shelf, computes
the on/off transitions for that 24-hour window and publishes
kratt.command.light at each transition. Recirculation pump runs on a 15-min
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

# Recirculation pump duty cycle (seconds)
PUMP_ON_SECS = 15 * 60     # 15 minutes on
PUMP_OFF_SECS = 45 * 60    # 45 minutes off
PUMP_CYCLE_SECS = PUMP_ON_SECS + PUMP_OFF_SECS  # 60-minute cycle


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


def _is_any_light_on(shelves: dict[int, dict], now: float) -> bool:
    """Return True if any tracked shelf is currently in its light-on window."""
    for sp in shelves.values():
        on, _ = _next_transition(now, sp.get("hours_on", 14))
        if on:
            return True
    return False


def _pump_state(now: float) -> tuple[bool, float]:
    """Return (pump_should_be_on, seconds_until_next_pump_transition).

    The pump duty cycle is aligned to the top of each hour (epoch % 3600).
    Within each 60-minute cycle the pump is ON for the first 15 minutes and
    OFF for the remaining 45.
    """
    pos_in_cycle = now % PUMP_CYCLE_SECS
    if pos_in_cycle < PUMP_ON_SECS:
        return True, PUMP_ON_SECS - pos_in_cycle
    return False, PUMP_CYCLE_SECS - pos_in_cycle


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
        await nats.publish("kratt.command.light", msg)
        await asyncio.sleep(wait + 1.0)


async def _run_pump(nats: NATS, shelves: dict[int, dict]) -> None:
    """Manage the recirculation pump duty cycle.

    During light-on hours (any shelf), cycle the pump 15 min on / 45 min off.
    During all-dark hours the pump stays off.
    """
    last_cmd: bool | None = None
    while True:
        now = time.time()
        any_light = _is_any_light_on(shelves, now)

        if any_light:
            pump_on, wait = _pump_state(now)
        else:
            pump_on = False
            # Sleep until the next possible light-on for any shelf.  Fall back
            # to a short poll so we pick up newly-added shelves quickly.
            wait = 60.0
            for sp in shelves.values():
                _, w = _next_transition(now, sp.get("hours_on", 14))
                wait = min(wait, w)

        if pump_on != last_cmd:
            msg = json.dumps({
                "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "valve_id": "recirc",
                "open": pump_on,
            }).encode()
            await nats.publish("kratt.command.valve", msg)
            log.info("recirc pump %s", "ON" if pump_on else "OFF")
            last_cmd = pump_on

        await asyncio.sleep(min(wait + 1.0, 60.0))


async def amain() -> None:
    logging.basicConfig(level=logging.INFO)
    nats = NATS()
    await nats.connect(os.environ.get("NATS_URL", "nats://127.0.0.1:4222"))
    tasks: dict[int, asyncio.Task] = {}
    shelves: dict[int, dict] = {}
    pump_task: asyncio.Task | None = None

    async def on_setpoint(msg):
        nonlocal pump_task
        m = json.loads(msg.data)
        sid = m["shelf_id"]
        shelves[sid] = m
        if sid in tasks:
            tasks[sid].cancel()
        tasks[sid] = asyncio.create_task(_run_shelf(nats, sid, m))
        # (Re)start the pump task so it picks up the new shelf immediately.
        if pump_task is None or pump_task.done():
            pump_task = asyncio.create_task(_run_pump(nats, shelves))

    await nats.subscribe(
        "kratt.planner.setpoint.*",
        cb=lambda m: asyncio.create_task(on_setpoint(m)),
    )
    while True:
        await asyncio.sleep(3600)


if __name__ == "__main__":
    asyncio.run(amain())
