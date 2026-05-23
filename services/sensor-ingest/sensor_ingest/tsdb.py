"""Async helper for writing sensor readings to VictoriaMetrics.

Receives dicts with keys ``ts``, ``shelf_id``, ``kind``, ``value`` and
batches them as Prometheus exposition-format lines before POSTing to the
VictoriaMetrics ``/api/v1/import/prometheus`` endpoint.

Writes are flushed every 5 seconds **or** when the buffer reaches 100
readings, whichever comes first.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

import aiohttp

log = logging.getLogger("sensor-ingest.tsdb")

VM_IMPORT_URL = "http://127.0.0.1:8428/api/v1/import/prometheus"
FLUSH_INTERVAL_S = 5.0
FLUSH_BATCH_SIZE = 100


def _to_prom_line(reading: dict[str, Any]) -> str:
    """Convert a sensor reading dict to a Prometheus exposition line.

    Format:
        grove_sensor{shelf_id="<id>",kind="<kind>"} <value> <timestamp_ms>
    """
    ts_ms = int(float(reading["ts"]) * 1000)
    shelf_id = reading["shelf_id"]
    kind = reading["kind"]
    value = reading["value"]
    return f'grove_sensor{{shelf_id="{shelf_id}",kind="{kind}"}} {value} {ts_ms}'


class TSDBWriter:
    """Batching async writer for VictoriaMetrics."""

    def __init__(
        self,
        url: str = VM_IMPORT_URL,
        flush_interval: float = FLUSH_INTERVAL_S,
        batch_size: int = FLUSH_BATCH_SIZE,
    ) -> None:
        self._url = url
        self._flush_interval = flush_interval
        self._batch_size = batch_size
        self._buf: list[str] = []
        self._lock = asyncio.Lock()
        self._session: aiohttp.ClientSession | None = None
        self._flush_task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        """Create the HTTP session and start the periodic flush loop."""
        self._session = aiohttp.ClientSession()
        self._flush_task = asyncio.create_task(self._periodic_flush())

    async def stop(self) -> None:
        """Flush remaining readings and tear down."""
        if self._flush_task is not None:
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass
        await self._flush()
        if self._session is not None:
            await self._session.close()

    async def write(self, reading: dict[str, Any]) -> None:
        """Enqueue a single sensor reading.

        Parameters
        ----------
        reading:
            Must contain keys ``ts`` (unix epoch float), ``shelf_id``,
            ``kind``, and ``value``.
        """
        line = _to_prom_line(reading)
        async with self._lock:
            self._buf.append(line)
            if len(self._buf) >= self._batch_size:
                await self._flush_locked()

    # ── internals ──────────────────────────────────────────────────────

    async def _periodic_flush(self) -> None:
        while True:
            await asyncio.sleep(self._flush_interval)
            await self._flush()

    async def _flush(self) -> None:
        async with self._lock:
            await self._flush_locked()

    async def _flush_locked(self) -> None:
        """Send buffered lines to VictoriaMetrics.  Must hold ``_lock``."""
        if not self._buf:
            return
        payload = "\n".join(self._buf) + "\n"
        self._buf.clear()
        try:
            assert self._session is not None
            async with self._session.post(
                self._url,
                data=payload.encode(),
                headers={"Content-Type": "text/plain"},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status >= 300:
                    body = await resp.text()
                    log.error(
                        "VictoriaMetrics import failed (%s): %s",
                        resp.status,
                        body[:200],
                    )
        except (aiohttp.ClientError, asyncio.TimeoutError, OSError) as exc:
            log.error("VictoriaMetrics connection error: %s", exc)
