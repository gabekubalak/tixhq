"""Unit tests for the AI planner decision logic."""

import json
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../services/ai-planner"))

from ai_planner.planner import _decide, ZoneSnapshot, EC_DEADBAND, PH_DEADBAND


def test_no_dose_when_sensors_missing():
    z = ZoneSnapshot(measured_ec=None, measured_ph=None)
    assert _decide(z) == []


def test_no_dose_inside_deadband():
    z = ZoneSnapshot(setpoint_ec=1.4, measured_ec=1.35, setpoint_ph=6.0, measured_ph=5.95)
    assert _decide(z) == []


def test_ec_dose_slurry_preferred():
    z = ZoneSnapshot(
        setpoint_ec=1.4, measured_ec=1.0, setpoint_ph=6.0, measured_ph=6.0,
        slurry_ec=2.0, phase="vegetative",
    )
    doses = _decide(z)
    assert len(doses) == 1
    msg = json.loads(doses[0])
    assert msg["pump_id"] == "slurry"
    assert msg["volume_ml"] > 0
    assert msg["reason"] == "ec_below_setpoint:slurry"
    assert msg["max_rate_ml_s"] == 2.0


def test_ec_dose_falls_back_to_base_n_leafy():
    z = ZoneSnapshot(
        setpoint_ec=1.4, measured_ec=1.0, setpoint_ph=6.0, measured_ph=6.0,
        slurry_ec=0.5, phase="vegetative",
    )
    doses = _decide(z)
    assert len(doses) == 1
    msg = json.loads(doses[0])
    assert msg["pump_id"] == "n"


def test_ec_dose_falls_back_to_base_pk_flowering():
    z = ZoneSnapshot(
        setpoint_ec=1.4, measured_ec=1.0, setpoint_ph=6.0, measured_ph=6.0,
        slurry_ec=0.5, phase="flower",
    )
    doses = _decide(z)
    msg = json.loads(doses[0])
    assert msg["pump_id"] == "k"


def test_ph_low_doses_up():
    z = ZoneSnapshot(
        setpoint_ec=1.4, measured_ec=1.4, setpoint_ph=6.0, measured_ph=5.5,
    )
    doses = _decide(z)
    assert len(doses) == 1
    msg = json.loads(doses[0])
    assert msg["pump_id"] == "ph_up"
    assert msg["reason"] == "ph_low"


def test_ph_high_doses_down():
    z = ZoneSnapshot(
        setpoint_ec=1.4, measured_ec=1.4, setpoint_ph=6.0, measured_ph=6.5,
    )
    doses = _decide(z)
    assert len(doses) == 1
    msg = json.loads(doses[0])
    assert msg["pump_id"] == "ph_down"
    assert msg["reason"] == "ph_high"


def test_ec_and_ph_both_out():
    z = ZoneSnapshot(
        setpoint_ec=1.4, measured_ec=0.8, setpoint_ph=6.0, measured_ph=5.0,
        slurry_ec=2.0, phase="vegetative",
    )
    doses = _decide(z)
    assert len(doses) == 2
    pumps = {json.loads(d)["pump_id"] for d in doses}
    assert "slurry" in pumps
    assert "ph_up" in pumps


def test_dose_volume_clamped():
    z = ZoneSnapshot(
        setpoint_ec=5.0, measured_ec=0.0, setpoint_ph=6.0, measured_ph=6.0,
        slurry_ec=3.0, phase="vegetative",
    )
    doses = _decide(z)
    msg = json.loads(doses[0])
    assert msg["volume_ml"] <= 20.0


def test_dose_has_correlation_id():
    z = ZoneSnapshot(
        setpoint_ec=1.4, measured_ec=0.8, setpoint_ph=6.0, measured_ph=6.0,
        slurry_ec=2.0,
    )
    doses = _decide(z)
    msg = json.loads(doses[0])
    assert "correlation_id" in msg
    assert len(msg["correlation_id"]) > 10
