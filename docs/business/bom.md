# KrattOS v1: Bill of Materials

Single-rack home appliance. Quantities for ONE unit. Prices are
ballpark single-unit retail in USD (Q4 2025), at-scale pricing in the
right column is what the unit-economics model uses, assuming 1k-unit
manufacturing runs through a contract manufacturer.

Cabinet size and component placements are anchored in
`cad/dimensions.yaml`; this BOM matches that geometry.

---

## Compute & control

| # | Component | Single | @1k qty |
|---|-----------|-------:|--------:|
| 1 | NVIDIA Jetson Orin Nano 8GB dev kit | $499 | $320 |
| 3 | Espressif ESP32-S3-DevKitC-1 (sensor / safety / composter MCU) | $30 | $14 |
| 1 | USB-CDC hub (powered, 4-port) | $25 | $9 |
| 1 | MicroSD 64GB industrial | $22 | $8 |
| 1 | Raspberry Pi IMX708 camera + pan/tilt mount | $55 | $28 |
| 1 | 20×4 character LCD (front panel status) | $14 | $5 |
| 1 | Latching mushroom E-stop | $22 | $11 |
| **Subtotal** | | **$667** | **$395** |

## Sensors

| # | Component | Single | @1k qty |
|---|-----------|-------:|--------:|
| 4 | SHT41 temp/humidity (one per shelf) | $9 | $4 |
| 4 | Capacitive soil moisture probe (food-grade) | $12 | $5 |
| 1 | Atlas EC probe (manifold) | $69 | $42 |
| 1 | Atlas pH probe (manifold) | $59 | $36 |
| 1 | Flow meter, 0.5 to 10 L/min | $24 | $13 |
| 1 | NTC thermistor in slurry tank | $4 | $1.50 |
| 1 | Leak sensor (drip-pan) | $11 | $4 |
| **Subtotal** | | **$248** | **$152** |

## Actuators & plumbing

| # | Component | Single | @1k qty |
|---|-----------|-------:|--------:|
| 4 | Solenoid valve, 12V, food-grade (per-shelf irrigation) | $18 | $9 |
| 1 | Solenoid valve, slurry, food-grade | $32 | $17 |
| 6 | Peristaltic dosing pump (one per base nutrient) | $28 | $14 |
| 1 | Recirculation pump, 12V, 4 L/min | $42 | $22 |
| 1 | 24V contactor (safety power-cut relay) | $26 | $13 |
| 4 | LED grow panel, full-spectrum, ~80W (per shelf) | $95 | $55 |
| 4 | Noctua NF-A12x25 PWM fan | $32 | $24 |
| 1 | Manifold tubing + fittings kit (food-grade silicone) | $40 | $22 |
| 1 | Reservoir set: 6 base nutrient bottles + slurry + clean-water tanks | $85 | $44 |
| **Subtotal** | | **$911** | **$540** |

## Composter subsystem

| # | Component | Single | @1k qty |
|---|-----------|-------:|--------:|
| 1 | Grinder motor + auger | $110 | $58 |
| 1 | Heater pad, 200W, 24V | $35 | $18 |
| 1 | Aeration pump | $28 | $14 |
| 1 | Composter tank (food-grade, 12L) | $52 | $26 |
| **Subtotal** | | **$225** | **$116** |

## Cabinet & enclosure

| # | Component | Single | @1k qty |
|---|-----------|-------:|--------:|
| 1 | Powder-coated steel frame (700×650×1850 mm) | $260 | $135 |
| 1 | Insulated door + magnetic latch | $90 | $48 |
| 1 | Tempered glass window (480×1200 mm) | $70 | $38 |
| 1 | Drip pan + drain | $24 | $12 |
| 1 | Casters + adjustable feet | $22 | $10 |
| 1 | Louver vent assembly | $18 | $9 |
| 1 | Cable harness + connectors | $35 | $18 |
| **Subtotal** | | **$519** | **$270** |

## Power

| # | Component | Single | @1k qty |
|---|-----------|-------:|--------:|
| 1 | 24V/15A LRS-360 PSU | $48 | $25 |
| 1 | 5V/5A DC-DC buck (Jetson rail) | $14 | $6 |
| 1 | TPS3823 hardware watchdog | $3 | $1 |
| 1 | IEC inlet + breaker | $16 | $7 |
| **Subtotal** | | **$81** | **$39** |

---

## Totals

| Tier | Single-unit | @1k qty |
|------|------------:|--------:|
| Compute & control | $667 | $395 |
| Sensors           | $248 | $152 |
| Actuators & plumbing | $911 | $540 |
| Composter         | $225 | $116 |
| Cabinet & enclosure | $519 | $270 |
| Power             | $81  | $39  |
| **Raw BOM**       | **$2,651** | **$1,512** |
| Assembly labour (3h @ $35) | $105 | $90 |
| Packaging + accessories (seed-pod starter, manual, USB key) | $60 | $35 |
| Warranty reserve (3% returns × repair cost) | $80 | $50 |
| **Landed cost per unit** | **$2,896** | **$1,687** |

## Pricing implication

- Target retail: **$4,499** (consumer) / **$3,999** (B2B fleet of 4+).
- Gross margin at scale: **$2,312 / unit = 51%** at $4,499 retail.
- Gross margin single-unit (year 1): **$1,603 / unit = 36%** at $4,499.

## Notes

- These prices assume off-the-shelf parts. Custom-injected plastic
  tanks and a tooled grinder cut ~$120 at 5k+ qty but require $40k+ in
  tooling, out of scope until Series A.
- Atlas probes are the single biggest cost in the sensor stack. At
  10k+ volume, in-house EC/pH conditioning circuits drop that to ~$25.
- Jetson Orin Nano can be replaced with a Jetson Nano (older) at $149
  if recipe-engine and ai-planner are rewritten to drop ONNX TensorRT.
  Trade-off: 4× slower inference, plant phase detection moves from
  8ms to ~35ms, still well within the 30s control tick.
