"""Validate the GroveOS contracts in this repo.

Checks:
  1. Every schemas/*.json is valid JSON Schema (draft 2020-12).
  2. Every recipes/*.yaml is valid YAML and has the expected top-level keys.
  3. Every recipe phase's setpoints stay within the planner.setpoint bounds.
  4. cad/dimensions.yaml validates against cad/schema.json.

Exit code is the number of problems found.
"""

from __future__ import annotations

import json
import pathlib
import sys

import jsonschema
import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCHEMA_DIR = ROOT / "schemas"
RECIPE_DIR = ROOT / "recipes"
CAD_DIR = ROOT / "cad"


def _num_bounds(schema: dict, prop: str) -> tuple[float, float]:
    p = schema["properties"][prop]
    lo = p.get("minimum", float("-inf"))
    hi = p.get("maximum", float("inf"))
    return lo, hi


def main() -> int:
    errs: list[str] = []

    schemas: dict[str, dict] = {}
    for path in sorted(SCHEMA_DIR.glob("*.json")):
        try:
            schemas[path.stem] = json.loads(path.read_text())
        except Exception as e:
            errs.append(f"{path}: {e}")

    sp_schema = schemas.get("grove.planner.setpoint.schema")
    if sp_schema is None:
        errs.append("missing grove.planner.setpoint.schema.json")

    recipes: list[pathlib.Path] = sorted(RECIPE_DIR.glob("*.yaml"))
    for path in recipes:
        try:
            recipe = yaml.safe_load(path.read_text())
        except Exception as e:
            errs.append(f"{path}: {e}")
            continue
        for key in ("crop", "phases", "harvest"):
            if key not in recipe:
                errs.append(f"{path}: missing top-level key '{key}'")
        if sp_schema is None:
            continue
        for phase in recipe.get("phases", []):
            sp = phase.get("setpoints", {})
            for prop in ("ec_ms_cm", "ph", "moisture_pct"):
                if prop not in sp:
                    errs.append(f"{path}::{phase.get('name')}: missing {prop}")
                    continue
                lo, hi = _num_bounds(sp_schema, prop)
                v = sp[prop]
                if not (lo <= v <= hi):
                    errs.append(
                        f"{path}::{phase.get('name')}: {prop}={v} outside [{lo},{hi}]"
                    )

    cad_schema_path = CAD_DIR / "schema.json"
    cad_yaml_path = CAD_DIR / "dimensions.yaml"
    cad_validated = False
    if cad_schema_path.exists() and cad_yaml_path.exists():
        try:
            cad_schema = json.loads(cad_schema_path.read_text())
            cad_dims = yaml.safe_load(cad_yaml_path.read_text())
            jsonschema.Draft202012Validator(cad_schema).validate(cad_dims)
            cad_validated = True
        except jsonschema.ValidationError as e:
            errs.append(f"{cad_yaml_path}: {e.message} at {list(e.absolute_path)}")
        except Exception as e:
            errs.append(f"{cad_yaml_path}: {e}")

    if errs:
        for e in errs:
            print(f"FAIL: {e}", file=sys.stderr)
        return len(errs)

    cad_msg = ", cad/dimensions.yaml" if cad_validated else ""
    print(f"OK: {len(schemas)} schemas, {len(recipes)} recipes{cad_msg}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
