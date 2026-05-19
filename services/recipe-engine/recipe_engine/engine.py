"""Per-shelf recipe engine.

Reads YAML recipes, tracks each active shelf's phase, advances on either
time elapsed OR a satisfying vision observation, publishes setpoints.

State (active recipe per shelf, phase index, phase started timestamp) is
persisted in /var/lib/grove/recipe-state.json so a restart resumes cleanly.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass, field, asdict
from pathlib import Path

import yaml
from nats.aio.client import Client as NATS

RECIPES_DIR = Path(os.environ.get("GROVE_RECIPES", "/opt/grove/recipes"))
STATE_PATH = Path(os.environ.get("GROVE_STATE_DIR", "/var/lib/grove")) / "recipe-state.json"
TICK_SECONDS = 60.0

log = logging.getLogger("recipe-engine")


@dataclass
class ShelfState:
    shelf_id: int
    crop: str
    phase_idx: int = 0
    phase_started: float = field(default_factory=time.time)
    started: float = field(default_factory=time.time)
    last_vision_phase: str | None = None
    last_vision_leaf_area: float = 0.0
    harvest_notified: bool = False


def _load_recipe(crop: str) -> dict:
    path = RECIPES_DIR / f"{crop}.yaml"
    with path.open() as f:
        return yaml.safe_load(f)


def _load_state() -> dict[int, ShelfState]:
    if not STATE_PATH.exists():
        return {}
    raw = json.loads(STATE_PATH.read_text())
    return {int(k): ShelfState(**v) for k, v in raw.items()}


def _save_state(state: dict[int, ShelfState]) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps({k: asdict(v) for k, v in state.items()}))


def _maybe_advance(s: ShelfState, recipe: dict) -> bool:
    phase = recipe["phases"][s.phase_idx]
    elapsed_days = (time.time() - s.phase_started) / 86400.0
    transition = phase.get("transition", "time_only")

    time_done = elapsed_days >= phase["duration_days"]
    vision_done = False
    gate = phase.get("vision_gate")
    if gate and s.last_vision_phase == gate["phase_estimate"]:
        vision_done = s.last_vision_leaf_area >= gate.get("leaf_area_cm2_min", 0)

    advance = (
        (transition == "time_only" and time_done)
        or (transition == "time_or_vision" and (time_done or vision_done))
        or (transition == "vision_only" and vision_done)
    )
    if not advance:
        return False
    if s.phase_idx + 1 < len(recipe["phases"]):
        s.phase_idx += 1
        s.phase_started = time.time()
        return True
    return False


async def _on_vision(state: dict[int, ShelfState], msg) -> None:
    obs = json.loads(msg.data)
    sid = obs["shelf_id"]
    if sid not in state:
        return
    state[sid].last_vision_phase = obs["phase_estimate"]
    state[sid].last_vision_leaf_area = float(obs.get("leaf_area_cm2", 0.0))


async def _publish_setpoint(nats: NATS, s: ShelfState, phase: dict) -> None:
    sp = phase["setpoints"]
    light = phase.get("light", {})
    payload = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "shelf_id": s.shelf_id,
        "phase": phase["name"],
        "ec_ms_cm": sp["ec_ms_cm"],
        "ph": sp["ph"],
        "moisture_pct": sp["moisture_pct"],
        "air_c": sp.get("air_c"),
        "rh_pct": sp.get("rh_pct"),
        "ppfd": light.get("ppfd", 0),
        "hours_on": light.get("hours_on", 0),
    }
    await nats.publish(
        f"grove.planner.setpoint.{s.shelf_id}", json.dumps(payload).encode()
    )


def _harvest_ready(s: ShelfState, recipe: dict) -> bool:
    h = recipe.get("harvest", {}).get("ready_when", {})
    days = (time.time() - s.started) / 86400.0
    if days < h.get("days_since_start_min", 0):
        return False
    v = h.get("vision", {})
    return (
        s.last_vision_leaf_area >= v.get("leaf_area_cm2_min", 0)
    )


async def _on_assign(
    state: dict[int, ShelfState],
    recipes: dict[int, dict],
    msg,
) -> None:
    cmd = json.loads(msg.data)
    sid = int(cmd["shelf_id"])
    crop = cmd["crop"]
    try:
        recipe = _load_recipe(crop)
    except FileNotFoundError:
        log.warning("recipe not found for assign: %s", crop)
        return
    state[sid] = ShelfState(shelf_id=sid, crop=crop)
    recipes[sid] = recipe
    log.info("assigned %s to shelf %d", crop, sid)


async def amain() -> None:
    logging.basicConfig(level=logging.INFO)
    nats = NATS()
    await nats.connect("nats://127.0.0.1:4222")
    state = _load_state()
    recipes = {sid: _load_recipe(s.crop) for sid, s in state.items()}

    await nats.subscribe(
        "grove.vision.observation.*",
        cb=lambda m: asyncio.create_task(_on_vision(state, m)),
    )
    await nats.subscribe(
        "grove.command.assign_recipe",
        cb=lambda m: asyncio.create_task(_on_assign(state, recipes, m)),
    )

    while True:
        for sid, s in list(state.items()):
            r = recipes[sid]
            if _maybe_advance(s, r):
                log.info("shelf %d -> phase %s", sid, r["phases"][s.phase_idx]["name"])
            await _publish_setpoint(nats, s, r["phases"][s.phase_idx])
            if not s.harvest_notified and _harvest_ready(s, r):
                s.harvest_notified = True
                await nats.publish(
                    "grove.event.alert.info",
                    json.dumps({
                        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        "severity": "info",
                        "code": "harvest_ready",
                        "message": r["harvest"]["notify"].format(shelf_id=sid),
                        "shelf_id": sid,
                    }).encode(),
                )
        _save_state(state)
        await asyncio.sleep(TICK_SECONDS)


def run() -> None:
    try:
        asyncio.run(amain())
    except KeyboardInterrupt:
        pass
