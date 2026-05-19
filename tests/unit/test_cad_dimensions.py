"""Cross-checks for the 3D twin contract.

Ensures the live-data binding manifest, the dimensions YAML, and the
NATS subject schemas stay in lockstep:

  * Every NATS subject referenced in bindings.json points at a real
    schemas/*.schema.json file.
  * Every partId pattern in bindings.json maps onto something the
    appliance builder will actually emit (shelf.{N}.*, reservoir.{N},
    composter, estop, etc.).
  * dimensions.yaml validates against cad/schema.json (a thin sanity
    layer on top of validate_schemas.py).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import jsonschema
import pytest
import yaml

ROOT = Path(__file__).resolve().parents[2]
BINDINGS = ROOT / "ui" / "frontend" / "src" / "lib" / "cad" / "bindings.json"
SCHEMAS_DIR = ROOT / "schemas"
CAD_DIR = ROOT / "cad"


@pytest.fixture(scope="module")
def bindings() -> dict:
    return json.loads(BINDINGS.read_text())


@pytest.fixture(scope="module")
def dims() -> dict:
    return yaml.safe_load((CAD_DIR / "dimensions.yaml").read_text())


def test_dimensions_validate_against_schema(dims):
    schema = json.loads((CAD_DIR / "schema.json").read_text())
    jsonschema.Draft202012Validator(schema).validate(dims)


def test_every_bound_subject_has_a_schema(bindings):
    for entry in bindings["subjects"]:
        schema_path = SCHEMAS_DIR / entry["schema"]
        assert schema_path.exists(), f"missing schema: {schema_path}"


def _shelf_count(dims: dict) -> int:
    return sum(r["shelves"] for r in dims["racks"])


def _emitted_part_ids(dims: dict) -> set[str]:
    parts = {
        "appliance", "cabinet.floor", "cabinet.roof", "cabinet.back",
        "cabinet.left", "cabinet.right", "cabinet.front", "cabinet.window",
        "lcd", "estop", "estop.cap",
        "vents.bottom", "vents.top",
        "camera", "camera.body", "composter", "slurry_tank", "clean_water_tank",
        "plants.root",
    }
    for s in range(_shelf_count(dims)):
        parts |= {
            f"shelf.{s}", f"shelf.{s}.tray", f"shelf.{s}.led",
            f"shelf.{s}.fan", f"shelf.{s}.bezel", f"shelf.{s}.plants",
        }
    for i in range(dims["reservoirs"]["count"]):
        parts.add(f"reservoir.{i}")
    return parts


_PARAM_RE = re.compile(r"\{N\}")


def test_every_bound_part_id_is_emitted(bindings, dims):
    emitted = _emitted_part_ids(dims)
    shelves = _shelf_count(dims)
    res_count = dims["reservoirs"]["count"]
    for entry in bindings["subjects"]:
        pattern = entry["partId"]
        if "{N}" not in pattern:
            assert pattern in emitted, f"unknown partId: {pattern}"
            continue
        # Expand {N} against the appropriate range.
        rng = range(res_count) if pattern.startswith("reservoir.") else range(shelves)
        for n in rng:
            concrete = _PARAM_RE.sub(str(n), pattern)
            assert concrete in emitted, f"unknown partId: {concrete}"
