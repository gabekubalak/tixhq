# KrattOS Lite & Nano: Bill of Materials

Budget builds where the grower supplies the room, the rack, and the
trays. Prices are single-unit retail in USD (Q4 2025) and will drop with
volume. The point of these tiers is reach: get a working KrattOS into
anyone's hands for a few hundred dollars or less.

See `docs/hardware/krattos-lite.md` for the build philosophy and the
self-setup walkthrough.

---

## KrattOS Lite (Raspberry Pi, runs the trimmed software stack)

### Compute & control

| # | Part | Each |
|---|------|-----:|
| 1 | Raspberry Pi 4 (2GB), pre-flashed | $45 |
| 1 | microSD 32GB | $8 |
| 1 | ESP32-S3 board (real-time I/O) | $8 |
| 1 | 5V/3A Pi power supply | $10 |
| 1 | 12V/5A power supply (pump, lights, fan) | $13 |

### Actuation

| # | Part | Each |
|---|------|-----:|
| 1 | 4-channel relay/MOSFET board | $8 |
| 1 | 12V submersible pump | $10 |
| 1 | 120mm fan + guard | $8 |
| 1 | Drip manifold + silicone tubing | $15 |
| 1 | 12V full-spectrum LED grow bar (expandable) | $22 |

### Sensing

| # | Part | Each |
|---|------|-----:|
| 2 | Capacitive moisture probe | $6 |
| 1 | SHT41 temp/humidity | $7 |
| 1 | Water-level float switch | $4 |
| 1 | Leak sensor (drip pan) | $5 |

### Enclosure & wiring

| # | Part | Each |
|---|------|-----:|
| 1 | Controller box (3D-printed / ABS) | $10 |
| 1 | Wiring, connectors, inline fuse | $10 |

### Lite totals

| Line | Amount |
|------|-------:|
| Parts subtotal | **~$195** |
| Optional reservoir tote | +$8 |
| **Self-source (you buy the parts list)** | **~$195** |
| **Pre-built kit** (flashed SD, printed box, harness, manual, margin) | **~$279** |

The grower separately buys: a wire shelving rack ($40 to $80), 1020
trays ($3 to $5 each), seeds, and nutrients. None of that is in the BOM
because everyone already has a rack or can grab one anywhere.

---

## KrattOS Nano (ESP32 only, firmware + on-device web UI)

The absolute floor. No Raspberry Pi, no Linux. The ESP32-S3 runs the
KrattOS Nano firmware and serves a small dashboard over its own WiFi
access point. Light schedule, pump duty, moisture and temperature,
safety cutoffs. No recipe library or 3D twin.

| # | Part | Each |
|---|------|-----:|
| 1 | ESP32-S3 board | $8 |
| 1 | 4-channel relay/MOSFET board | $8 |
| 1 | 12V submersible pump | $10 |
| 1 | 120mm fan + guard | $8 |
| 2 | Capacitive moisture probe | $6 |
| 1 | SHT41 temp/humidity | $7 |
| 1 | Water-level float switch | $4 |
| 1 | 12V full-spectrum LED grow bar | $22 |
| 1 | 12V/5A power supply | $13 |
| 1 | Controller box | $10 |
| 1 | Wiring, connectors, inline fuse | $10 |

### Nano totals

| Line | Amount |
|------|-------:|
| Parts subtotal | **~$112** |
| **Self-source** | **~$112** |
| **Pre-built kit** | **~$149** |

---

## How the three tiers line up

| Tier | Brain | Vision AI | Auto-dosing | Composter | History | Parts | Kit |
|------|-------|:---------:|:-----------:|:---------:|:-------:|------:|----:|
| Nano | ESP32 | no | no | no | minimal | ~$112 | ~$149 |
| Lite | Pi 4 | no | no | no | local | ~$195 | ~$279 |
| Full | Jetson | yes | yes | yes | full | ~$2,900 | ~$4,499 |

## Why this is possible at all

The full appliance's cost is dominated by four things: the steel cabinet
(~$520), the Jetson (~$500), the composter (~$225), and the automated
EC/pH dosing rig (~$300 in probes and pumps). The budget tiers remove all
four. The cabinet becomes your rack. The Jetson becomes a $45 Pi or an $8
ESP32. The composter and auto-dosing become manual steps the dashboard
walks you through.

What's left, the part that was never expensive, is the brain: schedule
the lights, run the pump, watch the moisture and temperature, keep it
safe, and show it all on a local dashboard. That has always been the
cheap part. Lite and Nano just sell that part on its own.

> Numbers are honest estimates, not supplier quotes. Verify with vendors
> before they go in any external document.
