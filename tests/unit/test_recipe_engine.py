"""Phase-advance logic for the recipe engine.

The engine's main loop wires these together, but the decisions are pure
functions on ShelfState + a recipe dict — easy to test in isolation.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[2] / "services" / "recipe-engine"),
)

from recipe_engine.engine import (
    ShelfState,
    _harvest_ready,
    _maybe_advance,
)


def _recipe(time_only: bool = True) -> dict:
    transition = "time_only" if time_only else "time_or_vision"
    return {
        "crop": "test",
        "phases": [
            {
                "name": "germination",
                "duration_days": 1,
                "setpoints": {"ec_ms_cm": 0.8, "ph": 6.0, "moisture_pct": 80},
                "transition": transition,
                "vision_gate": {"phase_estimate": "seedling", "leaf_area_cm2_min": 12},
            },
            {
                "name": "vegetative",
                "duration_days": 5,
                "setpoints": {"ec_ms_cm": 1.4, "ph": 6.0, "moisture_pct": 65},
                "transition": "time_only",
            },
        ],
        "harvest": {
            "ready_when": {
                "days_since_start_min": 7,
                "vision": {"leaf_area_cm2_min": 200, "color_health_min": 0.85},
            },
            "notify": "ready",
        },
    }


def test_does_not_advance_before_duration() -> None:
    s = ShelfState(shelf_id=0, crop="test")
    assert _maybe_advance(s, _recipe()) is False
    assert s.phase_idx == 0


def test_advances_on_time_only() -> None:
    s = ShelfState(shelf_id=0, crop="test")
    s.phase_started = time.time() - 2 * 86400  # 2 days ago, past duration_days=1
    assert _maybe_advance(s, _recipe()) is True
    assert s.phase_idx == 1


def test_advances_on_vision_gate_before_time() -> None:
    s = ShelfState(shelf_id=0, crop="test")
    s.last_vision_phase = "seedling"
    s.last_vision_leaf_area = 50.0
    assert _maybe_advance(s, _recipe(time_only=False)) is True
    assert s.phase_idx == 1


def test_vision_gate_requires_leaf_area_threshold() -> None:
    s = ShelfState(shelf_id=0, crop="test")
    s.last_vision_phase = "seedling"
    s.last_vision_leaf_area = 5.0  # below leaf_area_cm2_min=12
    assert _maybe_advance(s, _recipe(time_only=False)) is False


def test_will_not_advance_past_last_phase() -> None:
    s = ShelfState(shelf_id=0, crop="test", phase_idx=1)
    s.phase_started = time.time() - 100 * 86400
    assert _maybe_advance(s, _recipe()) is False
    assert s.phase_idx == 1


def test_harvest_blocked_by_time() -> None:
    s = ShelfState(shelf_id=0, crop="test")
    s.last_vision_leaf_area = 300.0
    assert _harvest_ready(s, _recipe()) is False


def test_harvest_ready_when_both_met() -> None:
    s = ShelfState(shelf_id=0, crop="test")
    s.started = time.time() - 8 * 86400
    s.last_vision_leaf_area = 300.0
    assert _harvest_ready(s, _recipe()) is True
