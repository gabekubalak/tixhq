"""Read framed MCU traffic, normalize, publish to NATS, write to TSDB.

Each `/dev/grove-*-mcu` symlink (see infra/udev/99-grove.rules) has its own
reader task. A bad CRC increments a counter; sustained CRC failures escalate
to a safety alert.
"""

from __future__ import annotations

import asyncio
import glob
import json
import logging
import os
import time

import serial
import serial_asyncio
from nats.aio.client import Client as NATS

from .frame import unpack

log = logging.getLogger("sensor-ingest")

CRC_ERROR_THRESHOLD = 10            # in any 60-second window
CRC_WINDOW_SECONDS = 60.0


class MCUReader(asyncio.Protocol):
    def __init__(self, nats: NATS, dev: str):
        self.nats = nats
        self.dev = dev
        self.buf = bytearray()
        self.crc_errors: list[float] = []

    def data_received(self, chunk: bytes) -> None:
        for b in chunk:
            if b == 0x00:
                self._drain_frame(bytes(self.buf))
                self.buf.clear()
            else:
                self.buf.append(b)

    def _drain_frame(self, wire: bytes) -> None:
        if not wire:
            return
        try:
            payload = unpack(wire)
        except ValueError as e:
            self._note_crc_error(str(e))
            return
        try:
            msg = json.loads(payload)
        except json.JSONDecodeError:
            log.warning("invalid JSON from %s", self.dev)
            return

        subject = msg.pop("_subject", None)
        if not subject:
            log.warning("frame missing _subject from %s", self.dev)
            return
        asyncio.create_task(self.nats.publish(subject, json.dumps(msg).encode()))

    def _note_crc_error(self, why: str) -> None:
        now = time.monotonic()
        self.crc_errors = [t for t in self.crc_errors if now - t < CRC_WINDOW_SECONDS]
        self.crc_errors.append(now)
        if len(self.crc_errors) > CRC_ERROR_THRESHOLD:
            payload = {
                "ts": _now_iso(),
                "severity": "critical",
                "code": "crc_storm",
                "message": f"{self.dev}: {len(self.crc_errors)} CRC errors / 60s: {why}",
            }
            asyncio.create_task(
                self.nats.publish("grove.event.alert.critical", json.dumps(payload).encode())
            )


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


async def _attach(loop: asyncio.AbstractEventLoop, nats: NATS, dev: str) -> None:
    while True:
        try:
            await serial_asyncio.create_serial_connection(
                loop, lambda: MCUReader(nats, dev), dev, baudrate=921600
            )
            log.info("attached %s", dev)
            return
        except (FileNotFoundError, serial.SerialException) as e:
            log.warning("waiting for %s: %s", dev, e)
            await asyncio.sleep(2.0)


async def amain() -> None:
    logging.basicConfig(level=logging.INFO)
    nats = NATS()
    await nats.connect("nats://127.0.0.1:4222")
    loop = asyncio.get_running_loop()
    devs = sorted(glob.glob("/dev/grove-*-mcu*"))
    if not devs:
        log.error("no /dev/grove-*-mcu* devices found")
        return
    await asyncio.gather(*(_attach(loop, nats, d) for d in devs))
    while True:
        await asyncio.sleep(3600)


def run() -> None:
    try:
        asyncio.run(amain())
    except KeyboardInterrupt:
        pass
