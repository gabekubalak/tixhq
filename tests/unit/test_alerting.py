"""Unit tests for the alerting service message handling."""

import json
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../services/alerting"))


def test_alert_schema_compliance():
    """Validate that sample alert messages match the JSON Schema."""
    import jsonschema
    schema_path = os.path.join(os.path.dirname(__file__), "../../schemas/kratt.event.alert.schema.json")
    with open(schema_path) as f:
        schema = json.load(f)

    sample = {
        "ts": "2026-05-23T10:00:00Z",
        "severity": "warning",
        "code": "sensor_offline",
        "message": "moisture probe A offline for 60s",
        "shelf_id": 2,
    }
    jsonschema.validate(sample, schema)


def test_safety_trip_schema():
    """Validate safety trip messages against schema."""
    import jsonschema
    schema_path = os.path.join(os.path.dirname(__file__), "../../schemas/kratt.event.safety.trip.schema.json")
    with open(schema_path) as f:
        schema = json.load(f)

    sample = {
        "ts": "2026-05-23T10:00:00Z",
        "cause": "leak_pan",
        "actuator_rail": "OFF",
        "latched": True,
        "requires_ack": True,
    }
    jsonschema.validate(sample, schema)


def test_dose_command_schema():
    """Validate dose commands against schema."""
    import jsonschema
    schema_path = os.path.join(os.path.dirname(__file__), "../../schemas/kratt.command.dose.schema.json")
    with open(schema_path) as f:
        schema = json.load(f)

    sample = {
        "ts": "2026-05-23T10:00:00Z",
        "issuer": "planner",
        "pump_id": "slurry",
        "volume_ml": 12.5,
        "max_rate_ml_s": 2.0,
        "reason": "ec_below_setpoint",
        "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
    }
    jsonschema.validate(sample, schema)
