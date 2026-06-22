"""Site profile loader: validates the three reference profiles parse,
the schema catches obvious errors, and the SiteProfile helpers work."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "services" / "site-config"))

from site_config import load_profile  # noqa: E402

PROFILE_DIR = ROOT / "profiles"
SCHEMA_PATH = ROOT / "schemas" / "kratt.site.profile.schema.json"


def _load(name: str):
    return load_profile(name, profile_dir=PROFILE_DIR, schema_path=SCHEMA_PATH)


def test_cabinet_profile_loads():
    p = _load("cabinet-v1")
    assert p.form_factor == "appliance_cabinet"
    assert len(p.zones) == 4
    assert p.has_composter() is True
    assert p.has_auto_dosing() is True
    assert p.zone(0).type == "shelf"
    assert p.zone(99) is None


def test_greenhouse_profile_loads():
    p = _load("greenhouse-v1")
    assert p.form_factor == "hoop_house"
    assert len(p.zones) >= 4
    assert all(z.type == "bed" for z in p.zones)
    assert all(z.medium == "nft" for z in p.zones)
    assert p.has_composter() is True
    assert p.has_auto_dosing() is True
    assert p.supplemental_lighting() is True
    assert p.climate.get("heating", {}).get("type") == "electric"


def test_shelf_mini_profile_loads():
    p = _load("shelf-mini-v1")
    assert p.form_factor == "wire_rack"
    assert len(p.zones) == 1
    assert p.has_composter() is False
    assert p.has_auto_dosing() is False


def test_missing_profile_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        load_profile("does-not-exist", profile_dir=tmp_path, schema_path=SCHEMA_PATH)


def test_invalid_profile_fails_validation(tmp_path):
    bad = tmp_path / "bad.yaml"
    bad.write_text("name: bad\nform_factor: not_a_real_factor\nzones: []\nmanifold: {recirculation: true}\n")
    # If jsonschema is installed, validation should catch the bad enum AND empty zones.
    import jsonschema
    with pytest.raises(jsonschema.ValidationError):
        load_profile("bad", profile_dir=tmp_path, schema_path=SCHEMA_PATH)
