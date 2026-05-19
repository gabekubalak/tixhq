"""LAN-only UI backend.

Subscribes to the bus for live state; exposes:
  GET  /api/zones                  current snapshot per shelf
  GET  /api/composter              composter state
  GET  /api/alerts                 unacknowledged alerts
  POST /api/alerts/{id}/ack        clear an alert
  POST /api/safety/reset           clear a latched trip (requires presence flag)
  GET  /api/recipes                catalogue
  POST /api/zones/{id}/recipe      assign a recipe to a shelf

Manual overrides require a "physically_present" flag in the request body —
this is a soft interlock acknowledging the user is at the appliance, not a
security boundary.
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

import yaml
from fastapi import FastAPI, HTTPException
from nats.aio.client import Client as NATS
from pydantic import BaseModel

RECIPES_DIR = Path(os.environ.get("GROVE_RECIPES", "/opt/grove/recipes"))


class State:
    def __init__(self) -> None:
        self.zones: dict[int, dict] = {}
        self.composter: dict = {}
        self.alerts: list[dict] = []
        self.safety_trip: dict | None = None


state = State()


async def _connect_bus() -> NATS:
    nats = NATS()
    await nats.connect("nats://127.0.0.1:4222")

    async def on_sensor(msg):
        m = json.loads(msg.data)
        sid = m.get("shelf_id")
        if sid is None: return
        state.zones.setdefault(sid, {}).update({"moisture_pct": m.get("value_pct")})

    async def on_setpoint(msg):
        m = json.loads(msg.data)
        state.zones.setdefault(m["shelf_id"], {}).update(m)

    async def on_vision(msg):
        m = json.loads(msg.data)
        state.zones.setdefault(m["shelf_id"], {})["vision"] = m

    async def on_compost(msg):
        state.composter = json.loads(msg.data)

    async def on_alert(msg):
        a = json.loads(msg.data)
        a["id"] = f"{a['ts']}::{a.get('code', 'alert')}"
        state.alerts.append(a)

    async def on_trip(msg):
        state.safety_trip = json.loads(msg.data)

    await nats.subscribe("grove.zone.*.sensor.moisture", cb=lambda m: asyncio.create_task(on_sensor(m)))
    await nats.subscribe("grove.planner.setpoint.*",     cb=lambda m: asyncio.create_task(on_setpoint(m)))
    await nats.subscribe("grove.vision.observation.*",   cb=lambda m: asyncio.create_task(on_vision(m)))
    await nats.subscribe("grove.composter.state",        cb=lambda m: asyncio.create_task(on_compost(m)))
    await nats.subscribe("grove.event.alert.*",          cb=lambda m: asyncio.create_task(on_alert(m)))
    await nats.subscribe("grove.event.safety.trip",      cb=lambda m: asyncio.create_task(on_trip(m)))
    return nats


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.nats = await _connect_bus()
    yield
    await app.state.nats.drain()


app = FastAPI(title="GroveOS", lifespan=lifespan)


@app.get("/api/zones")
def zones() -> dict[int, dict]:
    return state.zones


@app.get("/api/composter")
def composter() -> dict:
    return state.composter


@app.get("/api/alerts")
def alerts() -> list[dict]:
    return state.alerts


class Ack(BaseModel):
    physically_present: bool


@app.post("/api/alerts/{alert_id}/ack")
def ack_alert(alert_id: str) -> dict:
    state.alerts = [a for a in state.alerts if a["id"] != alert_id]
    return {"ok": True}


@app.post("/api/safety/reset")
async def safety_reset(ack: Ack) -> dict:
    if not ack.physically_present:
        raise HTTPException(400, "physically_present must be true")
    if state.safety_trip is None:
        return {"ok": True}
    payload = json.dumps({
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "ack_for": state.safety_trip.get("cause"),
    }).encode()
    await app.state.nats.publish("grove.command.safety.ack", payload)
    state.safety_trip = None
    return {"ok": True}


@app.get("/api/recipes")
def recipes() -> list[dict]:
    return [yaml.safe_load(p.read_text()) for p in RECIPES_DIR.glob("*.yaml")]


class AssignRecipe(BaseModel):
    crop: str
    physically_present: bool


@app.post("/api/zones/{shelf_id}/recipe")
async def assign_recipe(shelf_id: int, body: AssignRecipe) -> dict:
    if not body.physically_present:
        raise HTTPException(400, "physically_present must be true")
    msg = json.dumps({"shelf_id": shelf_id, "crop": body.crop}).encode()
    await app.state.nats.publish("grove.command.assign_recipe", msg)
    return {"ok": True}
