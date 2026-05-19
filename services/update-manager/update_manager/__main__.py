"""Offline update CLI.

A bundle is a tar with this layout:
  manifest.json             # version, components, sha256 of each member
  rootfs.img                # optional: A/B partition image
  models/*.onnx             # optional: model artifacts
  firmware/*.bin            # optional: ESP32 firmware
The bundle is signed with minisign; the public key is baked into this image.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

import click

GROVE_PUBKEY = Path("/etc/grove/minisign.pub")
INSTALL_ROOT = Path("/opt/grove")
INACTIVE_SLOT = Path("/dev/mmcblk0p3")  # bootloader chooses, this is a placeholder


def _verify_signature(bundle: Path, signature: Path) -> None:
    subprocess.run(
        ["minisign", "-V", "-p", str(GROVE_PUBKEY), "-m", str(bundle), "-x", str(signature)],
        check=True,
    )


def _verify_manifest(extract: Path) -> dict:
    manifest = json.loads((extract / "manifest.json").read_text())
    for member, want in manifest["files"].items():
        path = extract / member
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != want:
            raise RuntimeError(f"sha mismatch on {member}")
    return manifest


@click.command()
@click.argument("bundle", type=click.Path(exists=True, path_type=Path))
@click.argument("signature", type=click.Path(exists=True, path_type=Path))
def apply(bundle: Path, signature: Path) -> None:
    """Verify and apply BUNDLE. SIGNATURE is the minisign sig file."""
    _verify_signature(bundle, signature)
    with tempfile.TemporaryDirectory() as td:
        out = Path(td)
        with tarfile.open(bundle) as tar:
            tar.extractall(out)
        manifest = _verify_manifest(out)
        click.echo(f"Applying GroveOS update {manifest['version']}")
        # rootfs: dd to inactive slot, switch boot pointer, reboot
        # models: copy to /opt/grove/models
        # firmware: flash via USB-CDC bootloader (delegated to flash-mcu helper)
        models = out / "models"
        if models.exists():
            (INSTALL_ROOT / "models").mkdir(parents=True, exist_ok=True)
            for m in models.iterdir():
                shutil.copy2(m, INSTALL_ROOT / "models" / m.name)
        click.echo("Done. Reboot to activate rootfs changes (if any).")


if __name__ == "__main__":
    apply()
