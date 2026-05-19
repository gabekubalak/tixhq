"""Validate the GroveOS contracts in this repo.

Checks:
  1. Every schemas/*.json is valid JSON Schema (draft 2020-12).
  2. Every recipes/*.yaml is valid YAML and has the expected top-level keys.
  3. Every recipe phase's setpoints stay within the planner.setpoint bounds.

Exit code is the number of problems found. No deps beyond pyyaml.
"""

from __future__ import annotations

import json
import pathlib
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCHEMA_DIR = ROOT / "schemas"
RECIPE_DIR = ROOT / "recipes"


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

    if errs:
        for e in errs:
            print(f"FAIL: {e}", file=sys.stderr)
        return len(errs)

    print(f"OK: {len(schemas)} schemas, {len(recipes)} recipes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
