# GroveOS Architecture

## Two-tier compute split

**Real-time tier (ESP32-S3 MCUs, FreeRTOS)**
- 1–10 Hz sensor sampling, valve/pump pulse generation, PWM, E-stop
- Deterministic execution, no Linux jitter
- Connected to Jetson via USB-CDC serial (COBS + CRC-16 framing)

**Cognitive tier (NVIDIA Jetson Orin Nano, Ubuntu 22.04 L4T)**
- Vision inference, planning, control math, UI, storage, recipes
- Supervised by systemd (`grove.target`)

## NATS bus

All inter-service communication uses NATS with JetStream, bound to
127.0.0.1:4222. JetStream provides durable replay for sensor history
and command audit.

### Subject namespace

```
grove.zone.{shelf_id}.sensor.{kind}   — per-shelf telemetry
grove.manifold.sensor.{ec|ph|flow}    — shared manifold sensors
grove.composter.state                 — composter FSM state
grove.composter.sensor.{kind}         — composter probes
grove.command.{dose|valve|light}      — actuator commands
grove.event.alert.{severity}          — operator alerts
grove.event.safety.trip               — safety latch events
grove.vision.observation.{shelf_id}   — vision pipeline output
grove.planner.setpoint.{shelf_id}     — recipe/planner setpoints
```

All messages are JSON validated against schemas in `schemas/*.json`.

## Service boot order

Managed by systemd dependencies in `infra/systemd/`:

```
grove-bus (NATS)
  └→ grove-sensor-ingest
  └→ grove-timeseries (VictoriaMetrics)
  └→ grove-safety
       └→ grove-control
       └→ grove-mixer
       └→ grove-composter
  └→ grove-recipe
  └→ grove-vision
  └→ grove-planner
  └→ grove-scheduler
  └→ grove-alerting
  └→ grove-ui
```

## Control loop

Per-zone PI controller (no D term — probes are noisy):
- Deadband around setpoint (no action while within tolerance)
- Integral anti-windup via clamp
- Rate limiting on output changes (no ramp-up bursts)
- Sensor staleness detection (>60s → freeze output, raise alert)
- 30-second control tick

Source: `services/control-loop/src/lib.rs`

## Safety supervisor

Dual-layer design:
1. **Safety MCU (ESP32-S3)** — autonomous, hardware watchdog (TPS3823),
   drives the 24V contactor via latching relay
2. **Safety watcher (Jetson)** — mirrors the same bounds checks, publishes
   trip events to NATS, pings systemd watchdog

Trip conditions (any one triggers contactor OPEN):
- Leak sensor active
- Slurry temp >65°C
- EC >4.0 mS/cm anywhere
- pH <4.5 or >8.0
- MCU heartbeat loss >2s
- Physical E-stop pressed

Latches until: UI ack + physical reset button held 2s.
No remote bypass exists by design.

## Nutrient mixer

Threshold-based dose selection (not a full LP solver in v1):
1. If EC gap exists and slurry EC >1.5 mS/cm → dose slurry
2. Else dose phase-appropriate base nutrient (N for leafy, P+K for flower)
3. pH correction with pH-up/pH-down as last step
4. Hard cap: 25 ml per dose, refuse if flow=0

Source: `services/nutrient-mixer/src/mixer.rs`

## Composter state machine

```
idle → grinding → mesophilic (40-50°C) → thermophilic (≥55°C, 72h)
  → cure (24h) → tank_ready → dispensing → tank_ready
```

Pathogen kill gate: slurry valve CANNOT open until the batch has
accumulated ≥72 hours at ≥55°C. This is enforced independently of
any software command.

Source: `services/composter-controller/src/main.rs`

## Air-gap enforcement

- WiFi/BT disabled in MCU firmware
- nftables drops all egress except loopback + mDNS
- No NTP (hardware RTC)
- Updates arrive as signed offline bundles via USB
- Data export is user-triggered to USB drive only
