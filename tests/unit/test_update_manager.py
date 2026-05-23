"""Unit tests for update-manager manifest verification."""

import hashlib
import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../services/update-manager"))

from update_manager.__main__ import _verify_manifest


def test_manifest_passes_with_correct_hashes():
    with tempfile.TemporaryDirectory() as td:
        out = Path(td)
        content = b"fake model content for testing"
        (out / "models").mkdir()
        (out / "models" / "leafnet-v0.3.onnx").write_bytes(content)
        sha = hashlib.sha256(content).hexdigest()
        manifest = {"version": "0.2.0", "files": {"models/leafnet-v0.3.onnx": sha}}
        (out / "manifest.json").write_text(json.dumps(manifest))
        result = _verify_manifest(out)
        assert result["version"] == "0.2.0"


def test_manifest_fails_on_mismatch():
    with tempfile.TemporaryDirectory() as td:
        out = Path(td)
        (out / "models").mkdir()
        (out / "models" / "bad.onnx").write_bytes(b"actual data")
        manifest = {"version": "0.1.0", "files": {"models/bad.onnx": "0" * 64}}
        (out / "manifest.json").write_text(json.dumps(manifest))
        try:
            _verify_manifest(out)
            assert False, "should have raised"
        except RuntimeError as e:
            assert "sha mismatch" in str(e)


def test_manifest_handles_multiple_files():
    with tempfile.TemporaryDirectory() as td:
        out = Path(td)
        (out / "firmware").mkdir()
        files = {}
        for name in ["firmware/sensor.bin", "firmware/safety.bin"]:
            data = f"content-{name}".encode()
            p = out / name
            p.write_bytes(data)
            files[name] = hashlib.sha256(data).hexdigest()
        manifest = {"version": "0.3.0", "files": files}
        (out / "manifest.json").write_text(json.dumps(manifest))
        result = _verify_manifest(out)
        assert result["version"] == "0.3.0"
