"""Round-trip tests for the COBS+CRC framing.

The C side (firmware/common/frame.c) and Python side (sensor_ingest.frame)
must agree byte-for-byte. This file pins the Python implementation.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Allow running as `pytest tests/` without installing the package.
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "services" / "sensor-ingest"))

import pytest

from sensor_ingest.frame import cobs_decode, cobs_encode, crc16, pack, unpack


@pytest.mark.parametrize("payload", [
    b"",
    b"\x01",
    b"hello",
    bytes(range(256)),
    b"\x00" * 50,
    b"\xff" * 600,
])
def test_cobs_roundtrip(payload: bytes) -> None:
    enc = cobs_encode(payload)
    assert b"\x00" not in enc
    dec = cobs_decode(enc)
    assert dec == payload


def test_crc16_known_vector() -> None:
    assert crc16(b"123456789") == 0x29B1


def test_frame_pack_unpack() -> None:
    msg = b'{"shelf_id":3,"value":62.4}'
    wire = pack(msg)
    assert wire.endswith(b"\x00")
    body = wire[:-1]
    assert unpack(body) == msg


def test_frame_rejects_corruption() -> None:
    msg = b'{"a":1}'
    wire = pack(msg)
    bad = bytearray(wire)
    bad[1] ^= 0xFF
    with pytest.raises(ValueError):
        unpack(bytes(bad[:-1]))
