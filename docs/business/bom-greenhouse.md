# Greenhouse V1: cost summary

The first real-world KrattOS deployment is an outdoor hoop house running
hydroponics and a composter-fed nutrient loop, not the indoor appliance.
Cost: **~$1,450 all-in for one V1 site**.

The buildable spec, wiring, and assembly order are in
`docs/hardware/greenhouse-v1.md`. This page is the at-a-glance number
for fundraising materials.

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

What's NOT in this number: the greenhouse frame and plastic itself (the
backer already has one), the wire from the house to the greenhouse if
it's a long run, and the LED grow bars if you want supplemental
lighting (around $40 each).

## How it relates to the GoFundMe ask

The $3,000 GoFundMe goal covers:
- $1,450 for the greenhouse V1 build above
- $400 for a parallel indoor proof unit (the Lite tier on a bench)
- $500 for seeds, nutrient concentrate, hardware-store consumables,
  spare parts
- $250 contingency, shipping, platform fees
- $400 left over goes straight into the SECOND greenhouse build, or
  pre-builds a Lite kit for a backer

So the $3k buys a real outdoor deployment AND a controlled indoor bench
proof, with the cheapest tier (Lite) also covered. The greenhouse is
the hero footage; the indoor unit is the controlled comparison.

## Stripped-down V1 (~$1,120)

If $1,450 isn't doable yet, the cuts in priority order:
1. Skip the electric heater (-$90). Run spring through fall only.
2. Drop EC/pH probes (-$100). Mix nutrients by hand for the first
   month. Add the probes later on the same wiring.
3. Start with two beds, not four (-$60). Tubing, valves, channels
   come down. Expand once the loop is proven.
4. Skip the wax-cylinder vent openers (-$80). Crack the door manually
   on hot days.

Still includes: the offline brain, the composter loop, the
recirculation pump, four sensors, and the safety supervisor. That's a
real KrattOS, just less automated around the edges.
