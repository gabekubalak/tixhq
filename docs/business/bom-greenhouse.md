# Greenhouse V1: cost summary

The first real-world KrattOS deployment is an outdoor hoop house running
hydroponics and a composter-fed nutrient loop, not the indoor appliance.
Three honest tiers, depending on how much automation you want on day one.
Every tier has the same safety + offline brain + dashboard + recipe
engine; what scales is how hands-off it is.

| Tier | Price | Manual attention |
|------|------:|------------------|
| **Pragmatic V1** | **~$830** | Mix nutrients every 1-2 weeks. Crack vents on hot days. No winter. |
| **Comfortable V1** | **~$1,150** | Hands-off through summer. No winter. |
| **Premium V1** | **~$1,450** | Year-round, hands-off. |

The buildable spec, wiring, and assembly order are in
`docs/hardware/greenhouse-v1.md`, with the cut-by-cut breakdown.

### Premium V1 (year-round, fully automated)

| Section | $ |
|---------|--:|
| Brain and I/O (Pi 5, ESP32-S3, enclosure, wiring) | 230 |
| Sensors (temp/humidity, moisture, EC, pH, flow, level, leak, lux) | 222 |
| Actuators and plumbing (4 NFT beds, pumps, valves, dosing) | 393 |
| Climate control (heater, vents, fans) | 230 |
| Composter (40 L drum, heater pad, mixer) | 95 |
| Power and safety (PSU, GFCI, E-stop, contactor) | 152 |
| Subtotal | 1,322 |
| 10% contingency | 130 |
| **All-in** | **~$1,450** |

### Pragmatic V1 (recommended starting point, ~$830)

Same brain, same safety, same recipe engine. 2 DWC totes instead of 4
NFT beds. Skip the heater (March-October growing). Skip auto-dosing
(hand-mix every 1-2 weeks; the recirculation, watering, climate, and
alerting still run themselves). Pi 4 instead of Pi 5. Smaller exhaust
fan and PSU matched to the load. Float switch instead of ultrasonic.

Savings vs Premium: about **$620**. Nothing safety-related lost. The
full cut list with the reasoning is in
`docs/hardware/greenhouse-v1.md`.

What's NOT in this number: the greenhouse frame and plastic itself (the
backer already has one), the wire from the house to the greenhouse if
it's a long run, and the LED grow bars if you want supplemental
lighting (around $40 each).

## How it relates to the GoFundMe ask

The $3,000 GoFundMe now covers more than originally scoped:

- $830 for the Pragmatic greenhouse V1 above
- $400 for a parallel indoor proof unit (the Lite tier on a bench)
- $320 to upgrade the greenhouse Pragmatic to Comfortable mid-campaign
  once the loop works (adds the auto-dosing rig)
- $500 for the seed library, nutrient concentrate, hardware-store
  consumables, spare parts for both sites
- $250 for shipping and platform fees
- $700 contingency or a head start on the SECOND greenhouse build

So the same $3k now covers TWO real-world deployments (the greenhouse
and the controlled indoor bench), with built-in headroom to upgrade
the greenhouse once it proves itself or to start a second site for a
backer who wants one.

## Why a heater isn't in Pragmatic V1

Plants stop growing below ~50 °F and freeze below 32 °F, so a heater
is what would let you grow year-round in a cold climate. But two
things buy you a lot of buffer for free:

1. **The reservoir is thermal mass.** A 200 L tank of water holds ~4×
   the heat of the same volume of concrete and slow-releases through
   the night.
2. **The composter is a heat source.** Thermophilic composting holds
   130-160 °F for days. Routing the slurry return through a coil in
   the composter is a free heat exchanger.

So skip the heater for V1, run March through October, prove the loop
works, and add the heater in V1.1 if you decide year-round is worth
the electric bill.
