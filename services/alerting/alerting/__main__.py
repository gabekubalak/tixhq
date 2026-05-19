"""Alert fan-out.

Subscribes to grove.event.alert.* and grove.event.safety.trip and:
  - Pushes a buzzer + LCD command frame to the sensor MCU.
  - Publishes a JSON message on a LAN-local mDNS-advertised service so
    companion tablets on the same subnet receive a notification.

There is no outbound internet path. Egress is blocked by nftables.
"""

from __future__ import annotations

import asyncio
import json
import logging
import socket

from nats.aio.client import Client as NATS
from zeroconf import ServiceInfo, Zeroconf

log = logging.getLogger("alerting")
COMPANION_PORT = 8090


def _advertise_companion() -> Zeroconf:
    zc = Zeroconf()
    ip = socket.gethostbyname(socket.gethostname())
    info = ServiceInfo(
        "_grove-alerts._tcp.local.",
        "grove-alerts._grove-alerts._tcp.local.",
        addresses=[socket.inet_aton(ip)],
        port=COMPANION_PORT,
        properties={"version": "1"},
        server="grove.local.",
    )
    zc.register_service(info)
    return zc


async def _broadcast(server: asyncio.AbstractServer, msg: bytes) -> None:
    # All connected companions get the same frame.
    for w in getattr(server, "_grove_clients", []):
        try:
            w.write(msg + b"\n")
            await w.drain()
        except (ConnectionError, OSError):
            pass


async def _handle_companion(reader, writer):
    server = writer.get_extra_info("server")
    server._grove_clients = getattr(server, "_grove_clients", []) + [writer]
    try:
        await reader.read()
    finally:
        server._grove_clients.remove(writer)
        writer.close()


async def amain() -> None:
    logging.basicConfig(level=logging.INFO)
    nats = NATS()
    await nats.connect("nats://127.0.0.1:4222")
    _advertise_companion()
    server = await asyncio.start_server(_handle_companion, "0.0.0.0", COMPANION_PORT)
    server._grove_clients = []

    async def on_alert(msg):
        data = json.loads(msg.data)
        severity = data.get("severity", "info")
        log.info("[%s] %s", severity.upper(), data.get("message"))
        # Buzzer/LCD: small "frame me" payload routed to the sensor MCU by control-loop
        await nats.publish("grove.command.buzzer", json.dumps({
            "pattern": "tri" if severity == "critical" else "single",
            "message": data.get("message", "")[:80],
        }).encode())
        await _broadcast(server, msg.data)

    await nats.subscribe("grove.event.alert.*", cb=lambda m: asyncio.create_task(on_alert(m)))
    await nats.subscribe("grove.event.safety.trip", cb=lambda m: asyncio.create_task(on_alert(m)))

    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(amain())
