"""Anonymized telemetry export.

Pulls a time range from VictoriaMetrics, writes parquet to a USB drive.
User-triggered only; never runs on a schedule, never opens a socket.
"""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import click
import httpx
import pyarrow as pa
import pyarrow.parquet as pq

VM_URL = "http://127.0.0.1:8428"


def _query_range(metric: str, start: dt.datetime, end: dt.datetime) -> list[dict]:
    r = httpx.get(f"{VM_URL}/api/v1/query_range", params={
        "query": metric, "start": int(start.timestamp()),
        "end": int(end.timestamp()), "step": "60s",
    }, timeout=60.0)
    r.raise_for_status()
    return r.json()["data"]["result"]


@click.command()
@click.option("--out", type=click.Path(path_type=Path), required=True,
              help="Mountpoint of a writable USB drive")
@click.option("--days", default=30, help="Days of history to export")
def main(out: Path, days: int) -> None:
    if not out.exists():
        raise click.ClickException(f"{out} does not exist; mount the USB drive first")
    end = dt.datetime.now(dt.timezone.utc)
    start = end - dt.timedelta(days=days)

    metrics = [
        "grove_zone_moisture_pct",
        "grove_manifold_ec_ms_cm",
        "grove_manifold_ph",
        "grove_composter_temp_c",
        "grove_vision_leaf_area_cm2",
        "grove_vision_color_health",
    ]

    rows: list[dict] = []
    for m in metrics:
        for series in _query_range(m, start, end):
            labels = series["metric"]
            for ts, val in series["values"]:
                rows.append({
                    "ts": dt.datetime.fromtimestamp(float(ts), dt.timezone.utc),
                    "metric": m,
                    "shelf_id": labels.get("shelf_id"),
                    "value": float(val),
                })

    table = pa.Table.from_pylist(rows)
    stamp = end.strftime("%Y%m%dT%H%M%SZ")
    path = out / f"grove-export-{stamp}.parquet"
    pq.write_table(table, path, compression="zstd")
    click.echo(f"Wrote {len(rows)} rows to {path}")


if __name__ == "__main__":
    main()
