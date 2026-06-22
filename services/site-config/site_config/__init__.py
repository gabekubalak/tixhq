"""Site profile loader for KrattOS services.

A KrattOS deployment is described by a single YAML profile under
profiles/. The path is set with KRATT_PROFILE (absolute path, or a name
that resolves under /opt/kratt/profiles/). Services import load_profile()
to know what they're driving: shelves in a cabinet, beds in a greenhouse,
a single tray on a wire rack, etc.

The profile is validated against schemas/kratt.site.profile.schema.json
at load time, so a broken config fails loudly at service start rather
than during a watering cycle.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

try:
    import jsonschema
except ImportError:
    jsonschema = None

DEFAULT_PROFILE_DIR = Path(os.environ.get("KRATT_PROFILE_DIR", "/opt/kratt/profiles"))
DEFAULT_SCHEMA_PATH = Path(
    os.environ.get(
        "KRATT_PROFILE_SCHEMA",
        "/opt/kratt/schemas/kratt.site.profile.schema.json",
    )
)
DEFAULT_PROFILE = os.environ.get("KRATT_PROFILE", "cabinet-v1")


@dataclass(frozen=True)
class Zone:
    id: int
    label: str
    type: str        # shelf | bed | tray | channel
    medium: str      # soil | coco | rockwool | nft | dwc | ebb_flow | drip
    lighting: dict
    watering: dict
    sensors: tuple[str, ...]
    dimensions: dict


@dataclass(frozen=True)
class SiteProfile:
    name: str
    form_factor: str
    description: str
    zones: tuple[Zone, ...]
    manifold: dict
    composter: dict
    climate: dict
    safety: dict
    cad_path: str | None
    raw: dict

    def zone(self, zone_id: int) -> Zone | None:
        for z in self.zones:
            if z.id == zone_id:
                return z
        return None

    def has_composter(self) -> bool:
        return bool(self.composter.get("enabled"))

    def has_auto_dosing(self) -> bool:
        return bool(self.manifold.get("ec_probe")) and bool(self.manifold.get("ph_probe"))

    def supplemental_lighting(self) -> bool:
        return any(
            z.lighting.get("source") in ("led_panel", "led_bar", "natural_plus_led")
            for z in self.zones
        )


def _resolve_path(name_or_path: str, search_dir: Path) -> Path:
    p = Path(name_or_path)
    if p.is_absolute() and p.exists():
        return p
    candidate = search_dir / (name_or_path if name_or_path.endswith(".yaml") else f"{name_or_path}.yaml")
    if candidate.exists():
        return candidate
    raise FileNotFoundError(f"site profile not found: {name_or_path} (looked in {search_dir})")


def _validate(doc: dict, schema_path: Path) -> None:
    if jsonschema is None or not schema_path.exists():
        return  # best-effort: skip if jsonschema or schema isn't installed
    schema = json.loads(schema_path.read_text())
    jsonschema.Draft202012Validator(schema).validate(doc)


def load_profile(
    name: str | None = None,
    profile_dir: Path | None = None,
    schema_path: Path | None = None,
) -> SiteProfile:
    """Load and validate a site profile. Returns a frozen SiteProfile.

    Lookup order for `name`:
      1. Argument if given
      2. KRATT_PROFILE env var
      3. "cabinet-v1" default
    """
    name = name or DEFAULT_PROFILE
    profile_dir = profile_dir or DEFAULT_PROFILE_DIR
    schema_path = schema_path or DEFAULT_SCHEMA_PATH

    path = _resolve_path(name, profile_dir)
    doc = yaml.safe_load(path.read_text())
    _validate(doc, schema_path)

    zones = tuple(
        Zone(
            id=z["id"],
            label=z.get("label", f"Zone {z['id']}"),
            type=z["type"],
            medium=z["medium"],
            lighting=z["lighting"],
            watering=z["watering"],
            sensors=tuple(z.get("sensors", ())),
            dimensions=z.get("dimensions", {}),
        )
        for z in doc["zones"]
    )

    return SiteProfile(
        name=doc["name"],
        form_factor=doc["form_factor"],
        description=doc.get("description", ""),
        zones=zones,
        manifold=doc.get("manifold", {}),
        composter=doc.get("composter", {}),
        climate=doc.get("climate", {}),
        safety=doc.get("safety", {}),
        cad_path=doc.get("cad"),
        raw=doc,
    )


__all__ = ["SiteProfile", "Zone", "load_profile", "DEFAULT_PROFILE"]
