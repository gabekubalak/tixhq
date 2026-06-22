"""Greenhouse simulator: physics functions and state-coupling assertions
(no NATS connection required)."""

from __future__ import annotations

import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tests" / "sim"))
sys.path.insert(0, str(ROOT / "services" / "site-config"))

import simulated_greenhouse as sg  # noqa: E402


def test_outside_air_daily_cycle():
    """Minimum near pre-dawn, peak in late afternoon, average ~16 C."""
    midnight  = sg._outside_air_c(0)
    pre_dawn  = sg._outside_air_c(5 * 3600)
    afternoon = sg._outside_air_c(14 * 3600)
    peak      = sg._outside_air_c(17 * 3600)
    assert pre_dawn < midnight, (pre_dawn, midnight)
    assert pre_dawn < afternoon < peak, (pre_dawn, afternoon, peak)
    assert 25.0 < peak < 27.0
    assert 5.0 < pre_dawn < 7.0


def test_solar_zero_at_night_peak_at_noon():
    assert sg._solar_flux(0) == 0.0
    assert sg._solar_flux(2 * 3600) == 0.0
    assert sg._solar_flux(22 * 3600) == 0.0
    peak = sg._solar_flux(12 * 3600)
    assert 0.95 < peak <= 1.0


def test_bed_state_defaults_sensible():
    bed = sg.BedState(zone_id=0, label="x", medium="nft")
    assert 50.0 < bed.moisture_pct < 95.0
    assert 15.0 < bed.temp_c < 30.0
    assert 0.5 < bed.ec_ms_cm < 3.0


def test_greenhouse_state_defaults_sensible():
    gh = sg.GreenhouseState()
    assert gh.composter_phase in ("grinding", "mesophilic", "thermophilic", "cure", "tank_ready")
    assert 5.0 < gh.manifold_ph < 7.5
    assert gh.composter_hours_above_55c >= 0


def test_solar_flux_continuous():
    """No big jumps; the curve should be smooth-ish through the day."""
    prev = sg._solar_flux(0)
    for h in range(0, 24):
        cur = sg._solar_flux(h * 3600)
        assert abs(cur - prev) < 0.25, f"jump at {h}h: {prev}->{cur}"
        prev = cur
