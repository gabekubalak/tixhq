# Contributing

## Dev environment setup

Requirements:
- Rust 1.75+ (for control-loop, nutrient-mixer, safety-watcher, composter-controller)
- Python 3.11+ (for sensor-ingest, recipe-engine, ai-vision, ai-planner, scheduler, alerting)
- Node 18+ (for frontend)
- ESP-IDF 5.x (for firmware — optional unless touching MCU code)

```bash
# Clone and verify
git clone <repo>
cd tixhq
make verify          # runs all checks, ~10s
```

## Running locally without hardware

```bash
# Terminal 1: stub backend (no NATS/hardware needed)
python3 scripts/dev_stub_backend.py

# Terminal 2: frontend dev server
cd ui/frontend && npm install && npm run dev
# → http://localhost:5173 (dashboard)
# → http://localhost:5173/3d (3D twin)
# → http://localhost:5173/3d/arch (architecture view)
```

For simulated sensor data against a real NATS bus:
```bash
python3 tests/sim/simulated_zone.py --shelf 0 --dry-rate 0.5
```

## Make targets

| Target | What it does |
|--------|-------------|
| `make verify` | Full test suite: schemas, Python, Rust |
| `make rust-check` | `cargo check --workspace` |
| `make rust-test` | `cargo test --workspace` |
| `make python-check` | byte-compile + pytest |
| `make schemas` | validate JSON Schemas + recipes |
| `make sim` | run simulated zone against local NATS |

## Code conventions

- **Rust** for anything real-time or safety-critical (control-loop, mixer, safety, composter)
- **Python** for cognitive services (vision, planner, recipes, alerting)
- **JSON Schema** at every service boundary (validated in `make verify`)
- No external network access at runtime — ever
- All config via YAML or environment variables, not databases

## Testing

Tests live in `tests/`:
- `tests/unit/` — pure-function tests, no NATS needed
- `tests/sim/` — synthetic zone data against real services
- `tests/integration/` — end-to-end with NATS (dry_run, safety_injection)

Add tests for any new decision logic. The verify pipeline must stay green.

## Schemas

Every NATS message has a corresponding schema in `schemas/*.json`.
When adding a new message type:
1. Create `schemas/grove.<namespace>.<type>.schema.json`
2. `scripts/validate_schemas.py` picks it up automatically
3. Reference it in services that publish/subscribe

## Firmware

MCU firmware uses ESP-IDF + FreeRTOS. The common framing library
(`firmware/common/`) is shared across all three MCUs. Changes to
frame format must update both C and Python implementations — the
`test_frame.py` round-trip test catches drift.
