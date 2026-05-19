"""COBS + CRC-16/CCITT-FALSE framing.

Canonical Python reference. Mirrors firmware/common/{cobs,crc16,frame}.c.
"""

from __future__ import annotations


def crc16(data: bytes) -> int:
    crc = 0xFFFF
    for byte in data:
        crc ^= byte << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF if crc & 0x8000 else (crc << 1) & 0xFFFF
    return crc


def cobs_decode(buf: bytes) -> bytes:
    """Decode a COBS-encoded buffer (without the trailing 0x00 sentinel)."""
    out = bytearray()
    i = 0
    n = len(buf)
    while i < n:
        code = buf[i]
        if code == 0:
            raise ValueError("zero byte inside COBS frame")
        i += 1
        end = i + code - 1
        if end > n:
            raise ValueError("COBS overrun")
        out.extend(buf[i:end])
        i = end
        if code != 0xFF and i < n:
            out.append(0)
    return bytes(out)


def cobs_encode(buf: bytes) -> bytes:
    out = bytearray([0])
    code_idx = 0
    code = 1
    for b in buf:
        if b == 0:
            out[code_idx] = code
            code_idx = len(out)
            out.append(0)
            code = 1
        else:
            out.append(b)
            code += 1
            if code == 0xFF:
                out[code_idx] = code
                code_idx = len(out)
                out.append(0)
                code = 1
    out[code_idx] = code
    return bytes(out)


def unpack(wire: bytes) -> bytes:
    """Verify a frame (without sentinel) and return the JSON payload."""
    decoded = cobs_decode(wire)
    if len(decoded) < 2:
        raise ValueError("frame too short")
    payload, crc_lo, crc_hi = decoded[:-2], decoded[-2], decoded[-1]
    if crc16(payload) != (crc_lo | (crc_hi << 8)):
        raise ValueError("CRC mismatch")
    return payload


def pack(payload: bytes) -> bytes:
    """Pack JSON payload into wire bytes including the trailing sentinel."""
    crc = crc16(payload)
    body = payload + bytes([crc & 0xFF, (crc >> 8) & 0xFF])
    return cobs_encode(body) + b"\x00"
