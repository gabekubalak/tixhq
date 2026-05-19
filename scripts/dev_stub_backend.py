"""Dev-only stub backend for the 3D twin.

The real backend in ui/backend/backend/main.py needs FastAPI + a running
NATS bus. For a local visual smoke-test without that stack, this stdlib
HTTP server serves just enough:

  GET  /api/cad/dimensions    → cad/dimensions.yaml as JSON
  GET  /api/stream            → SSE stream of empty/synthetic state
  GET  /api/zones             → empty {}
  GET  /api/composter         → empty {}
  GET  /api/alerts            → []

Run:  python3 scripts/dev_stub_backend.py [--port 8080]

Not for production. The real backend supersedes this once NATS is up.
"""

from __future__ import annotations

import argparse
import json
import math
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
DIMS_PATH = ROOT / "cad" / "dimensions.yaml"


def _dims() -> dict:
    return yaml.safe_load(DIMS_PATH.read_text())


def _synthetic_snapshot(t: float) -> dict:
    # Drive a believable visual: shelf 0 dries out, shelf 1 stays moist,
    # shelves 2/3 cycle. LED setpoints + a vision observation on shelf 1.
    zones = {
        0: {
            "moisture_pct": 40 + 30 * (0.5 + 0.5 * math.sin(t / 30.0)),
            "ppfd": 240, "hours_on": 16,
            "vision": {"phase_estimate": "veg", "leaf_area_cm2": 180, "color_health": 0.88},
        },
        1: {
            "moisture_pct": 78,
            "ppfd": 180, "hours_on": 16,
            "vision": {"phase_estimate": "seedling", "leaf_area_cm2": 24, "color_health": 0.92},
        },
        2: {
            "moisture_pct": 55 + 20 * math.sin(t / 18.0),
            "ppfd": 300, "hours_on": 14,
            "vision": {"phase_estimate": "harvest_ready", "leaf_area_cm2": 220, "color_health": 0.84},
        },
        3: {
            "moisture_pct": 65,
            "ppfd": 120, "hours_on": 16,
            "vision": {"phase_estimate": "germination", "leaf_area_cm2": 4, "color_health": 0.70},
        },
    }
    composter = {"phase": "thermophilic", "temp_c": 58.2}
    return {"zones": zones, "composter": composter, "alerts": [], "safety_trip": None}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_a):  # quiet
        return

    def _send_json(self, code: int, payload: dict | list) -> None:
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/api/cad/dimensions":
            return self._send_json(200, _dims())
        if self.path == "/api/zones":
            return self._send_json(200, _synthetic_snapshot(time.time())["zones"])
        if self.path == "/api/composter":
            return self._send_json(200, _synthetic_snapshot(time.time())["composter"])
        if self.path == "/api/alerts":
            return self._send_json(200, [])
        if self.path == "/api/stream":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            try:
                while True:
                    snap = _synthetic_snapshot(time.time())
                    self.wfile.write(f"data: {json.dumps(snap)}\n\n".encode())
                    self.wfile.flush()
                    time.sleep(0.5)
            except (BrokenPipeError, ConnectionResetError):
                return
        self.send_response(404)
        self.end_headers()


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=8080)
    args = p.parse_args()
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"[dev_stub_backend] serving on http://127.0.0.1:{args.port}")
    srv.serve_forever()


if __name__ == "__main__":
    main()
