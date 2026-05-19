# GroveOS

Operating system for a closed-loop, vertically stacked indoor growing appliance.
Air-gapped local AI controls light, water, nutrients, and pH. An on-board
composter turns kitchen scraps into the bulk nutrient supply. Six small base
reservoirs let the AI correct what the compost can't.

The design target is **home and prosumer** scale: 1 rack of 4-8 shelves, up to
~6 racks total, single-tenant.

## Architecture

Two compute tiers talk over USB-CDC (COBS + CRC-16 framing):

- **Real-time tier** — ESP32-S3 MCUs handle sensor sampling, pump pulses,
  valve switching, light dimming, and an independent safety supervisor that
  gates the 24V actuator rail through a hardware contactor.
- **Cognitive tier** — NVIDIA Jetson Orin Nano 8GB runs vision, planning,
  control loops, storage, and the local web UI. All processes coordinate
  over a localhost-bound NATS bus with JetStream.

```
 food scraps ─┐                              clean water ──┐
              ▼                                            ▼
        ┌──────────┐   slurry tank   ┌──────────────────────────┐
        │ composter│ ───────────────►│ mixing manifold + dosers │
        └──────────┘                 │  (slurry + 6 base + H2O) │
              ▲                      └────────────┬─────────────┘
              │                                   │
        composter MCU                             ▼
              ▲                          per-shelf zones (NFT/ebb-flow)
              │                          ─ moisture probes
              │                          ─ SHT41 temp/humidity
              │                          ─ LED panel + fan
              │                          ─ PAR / cameras (pan-tilt)
        ┌─────┴───── USB-CDC ──────┐
        │  Jetson Orin Nano 8GB    │◄── safety MCU (contactor / E-stop)
        │  NATS · UI · AI · TSDB   │◄── sensor MCU(s)
        └──────────────────────────┘
```

## Repo layout

| Directory       | What lives there                                              |
|-----------------|----------------------------------------------------------------|
| `firmware/`     | ESP-IDF projects for sensor / safety / composter MCUs          |
| `services/`     | Jetson-side services (Python + Rust). One per concern.         |
| `ui/`           | FastAPI backend + SvelteKit frontend (LAN-only, mDNS)          |
| `recipes/`      | Per-crop YAML recipes (phases, setpoints, light, harvest gate) |
| `schemas/`      | JSON Schema for every NATS subject                             |
| `models/`       | Local ONNX / LightGBM model artifacts                          |
| `infra/`        | systemd units, nats config, udev rules, nftables egress block  |
| `tests/`        | Unit, simulated-zone, integration, and fault-injection tests   |
| `docs/`         | Hardware BOM, operator manual, developer notes                 |

## Air-gap discipline

- WiFi/BT disabled in MCU firmware.
- `infra/firewall/nftables-grove.conf` blocks all outbound traffic on the
  Jetson except mDNS/LAN.
- Updates ship as `minisign`-verified tar bundles, applied via A/B partition
  swap with health-check rollback.
- `data-export` is the only data-egress path; it is user-triggered and writes
  to a USB drive.

## Getting started

See `docs/operator-manual/getting-started.md` for first-time bring-up, and
`docs/hardware/bom.md` for the canonical bill of materials.

To validate the repo without hardware:

```
make verify    # byte-compile Python, validate schemas, run frame + Rust tests
```

`make help` lists the rest. For development, each service is independently
buildable:

```
services/sensor-ingest      python -m sensor_ingest
services/control-loop       cargo run -p control-loop
services/nutrient-mixer     cargo run -p nutrient-mixer
services/recipe-engine      python -m recipe_engine
services/ai-planner         python -m ai_planner
services/ai-vision          python -m ai_vision
services/composter-controller   cargo run -p composter-controller
services/safety-watcher     cargo run -p safety-watcher
services/scheduler          python -m scheduler
services/alerting           python -m alerting
ui/backend                  uvicorn backend.main:app
```

## Safety

The safety MCU is independent of the Jetson. It cuts the 24V actuator rail
on: leak detected, slurry tank over-temperature, EC > 4.0 mS/cm, pH outside
[4.5, 8.0], any MCU heartbeat loss > 2 s, or the physical E-stop. The trip
is latching — UI ack + physical reset required to re-energize.
