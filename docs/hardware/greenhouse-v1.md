# KrattOS Greenhouse V1

The first real-world KrattOS deployment: a 14 ft by 30 ft hoop house
running six NFT hydroponic beds on a shared recirculation manifold, fed
by an external composter. No hand-watering, no daily attention. The
software is the same KrattOS that runs the indoor appliance, configured
with the `greenhouse-v1` site profile.

This document is the buildable spec. Order the BOM, follow the assembly
order, set the profile, and the brain takes over.

---

## What this proves

- The same KrattOS code runs an indoor cabinet AND an outdoor greenhouse.
- The composter-fed nutrient loop works at greenhouse scale.
- The whole system runs offline and is buildable for under $1,500.

## What you supply (not in the BOM)

- The greenhouse frame and plastic cover (already done in your case).
- Mains power within ~50 ft, or solar.
- The galvanized stock tank (visible in the field photo) becomes the
  reservoir.

## Bill of materials

All prices are honest single-unit retail in USD, late 2025. Quantities
are for one greenhouse. The "Source" column is a sensible default; you
can swap any line for a part you already have.

### Brain and I/O ($230)

| # | Part | Source | $ |
|--:|------|--------|--:|
| 1 | Raspberry Pi 5, 8 GB kit (power supply, case, SD) | RPi distributor | 115 |
| 1 | ESP32-S3-DevKitC-1 | Adafruit / Mouser / AliExpress | 15 |
| 1 | Weatherproof IP65 enclosure (~250x200x150 mm), DIN-rail mount | Hammond / generic | 50 |
| 1 | DIN-rail terminal blocks, fuses, glands, ferrules | Phoenix Contact / generic | 40 |
| 1 | 64 GB industrial microSD (spare) | SanDisk MAX Endurance | 10 |

### Sensors ($222)

| # | Part | Source | $ |
|--:|------|--------|--:|
| 2 | SHT41 temp/humidity breakout (one inside, one outside) | Adafruit | 24 |
| 4 | Capacitive soil moisture probe v2 (food-grade) | DFRobot / generic | 48 |
| 1 | DFRobot Gravity EC analog probe + signal board | DFRobot | 50 |
| 1 | DFRobot Gravity pH analog probe + signal board | DFRobot | 50 |
| 1 | Water flow meter, G1/2", 1 to 30 L/min | YF-S201 or similar | 15 |
| 1 | Ultrasonic water level sensor (JSN-SR04T waterproof) | generic | 15 |
| 1 | Door reed switch | generic | 5 |
| 1 | Drip-pan leak sensor (resistive grid) | generic | 5 |
| 1 | BH1750 lux sensor (canopy reference) | Adafruit / generic | 5 |
| 1 | NTC thermistor for slurry tank | generic | 5 |

### Actuators and plumbing ($393)

| # | Part | Source | $ |
|--:|------|--------|--:|
| 4 | 12 V solenoid irrigation valve, food-grade | US Solid / DFRobot | 48 |
| 1 | 8-channel relay + MOSFET board (5 V logic, 12-240 V switching) | Sainsmart / generic | 25 |
| 1 | 12 V submersible recirculation pump, 10 to 15 L/min | VicTSing / generic | 35 |
| 1 | 12 V aquarium air pump for slurry tank | Hygger / generic | 25 |
| 5 | 12 V peristaltic dosing pumps (slurry + base N + base P+K + pH-up + pH-down) | Kamoer / AliExpress | 100 |
| 4 | NFT channel, 3 m, 3" PVC food-grade with end caps | local hydro shop | 80 |
| 1 | Drip tubing + barbed fittings + 1" manifold + clamps | generic | 50 |
| 1 | 25 L food-grade drum (slurry holding tank) | generic | 30 |

> The galvanized stock tank already on site becomes the main reservoir.

### Climate control ($230)

| # | Part | Source | $ |
|--:|------|--------|--:|
| 1 | 1500 W electric ceramic heater with external 120 VAC relay | Lasko + relay | 90 |
| 2 | Wax-cylinder auto vent openers (no power, passive) | Univent / Bayliss | 80 |
| 1 | 200 mm exhaust fan, 120 VAC, with shutter | iLiving / VIVOSUN | 40 |
| 1 | 120 mm 12 V circulation fan inside the greenhouse | Noctua / generic | 20 |

### Composter, greenhouse scale ($95)

| # | Part | Source | $ |
|--:|------|--------|--:|
| 1 | 40 L food-grade drum with sealing lid | generic | 35 |
| 1 | 200 W silicone heater pad, 24 V | generic | 35 |
| 1 | Small 12 V geared motor for mixing auger | generic | 25 |

### Power and safety ($152)

| # | Part | Source | $ |
|--:|------|--------|--:|
| 1 | 24 V / 15 A meanwell-style PSU (LRS-360 or similar) | Meanwell | 50 |
| 1 | 5 V / 3 A DC-DC buck (Pi power rail) | Pololu / generic | 12 |
| 1 | IEC inlet with 15 A breaker | generic | 20 |
| 1 | Outdoor GFCI outlet, IP65 cover | Leviton | 25 |
| 1 | Latching mushroom E-stop, IP65 | generic | 20 |
| 1 | 24 V contactor relay (cuts all 24 V actuation on E-stop or fault) | Schneider / generic | 25 |

### Totals

| Section | $ |
|---------|--:|
| Brain and I/O | 230 |
| Sensors | 222 |
| Actuators and plumbing | 393 |
| Climate control | 230 |
| Composter | 95 |
| Power and safety | 152 |
| **Subtotal** | **1,322** |
| 10% contingency (parts always break the first time) | 130 |
| **All-in V1 budget** | **~$1,450** |

### Where you can cut cost

If $1,450 is tight, here's the order to trim:
1. **Skip the heater (-$90)** if you only run spring through fall.
2. **Drop EC and pH probes (-$100)** for the first month. Mix nutrients
   by hand; let the system prove itself first. Add probes later, same
   wiring.
3. **Start with two beds, not four (-$60).** Tubing, valves, channels
   come down. Expand once the loop is proven.
4. **Skip auto-vent openers (-$80)** if you'll be there daily to crack
   the door.

Stripped-down V1: roughly **$1,120**. Still hydroponics + composter +
offline brain. Just less automation around the edges.

---

## Build order (5 to 7 weekend-days)

### Day 1 — power and the controller box (4 hours)
1. Run a 12 ga outdoor cable from the house to the greenhouse. Land it
   on the IP65 GFCI outlet inside.
2. Mount the IP65 enclosure on the inside wall, 1.5 m off the ground,
   away from misters.
3. Inside the enclosure: DIN rail at the bottom, terminal blocks
   labeled. PSU at one end. Pi and ESP32-S3 mounted on the rail with
   3D-printed clips (or velcro for V1).
4. Pre-wire the breaker, contactor, and E-stop loop so the contactor
   only stays closed when E-stop is healthy.

### Day 2 — beds and plumbing (8 hours)
1. Set up the stock tank as the main reservoir, plumbed to the
   recirculation pump.
2. Mount the four NFT channels on stands with a 1 in 40 slope toward
   the return.
3. Run the supply manifold along the inside of the south wall. One
   solenoid valve per channel, all on a common 12 V rail.
4. Return line back to the reservoir, filtered through a mesh sock to
   keep roots out of the pump.
5. Slurry tank gets the air pump, the heater pad wrapped around it,
   and the mixing motor on top. Slurry dosing pump pulls from this
   tank into the reservoir.

### Day 3 — sensors and wiring (5 hours)
1. Inside SHT41 in the geometric center of the greenhouse at canopy
   height. Outside SHT41 mounted under the eave for a reference
   reading.
2. One moisture probe in each NFT channel, near the supply end.
3. EC and pH probes in the reservoir, with the BNC isolators between
   the probe and the signal board.
4. Flow meter inline with the supply manifold.
5. Ultrasonic level sensor mounted to the underside of the reservoir
   lid, pointing down.
6. Door reed switch on the entry. Leak sensor in the drip pan under
   the manifold. Lux sensor at canopy.
7. Land every analog and digital signal on the labeled terminal blocks
   in the enclosure. ESP32-S3 reads them all.

### Day 4 — climate and composter (4 hours)
1. Mount the two wax-cylinder vent openers in the end-wall vents.
   They open passively at ~22 C. Zero wiring.
2. Mount the 200 mm exhaust fan in the opposite end wall, on a 120 V
   relay tied to the controller.
3. Mount the 1500 W heater inside, on a relay-switched outlet. The
   relay is software-controlled with a hardware thermostat as backup.
4. Position the 120 mm circulation fan to push air down a row.
5. Mount the composter drum outside (or in a cooler corner). Wire the
   heater pad and mixing motor back to the controller.

### Day 5 — flash KrattOS and bring it up (3 hours)
1. Flash the Pi:
   ```
   git clone <repo> && cd kratt
   make install-greenhouse-v1
   ```
2. Set the profile:
   ```
   echo 'KRATT_PROFILE=greenhouse-v1' | sudo tee /etc/default/kratt
   ```
3. Enable the target:
   ```
   sudo systemctl enable --now kratt-greenhouse.target
   ```
4. Open the dashboard on your phone (the Pi serves it on
   `http://kratt.local`). Watch each sensor come live. Crack the
   E-stop loop to verify all 24 V actuation drops; reset.
5. Run the recirculation pump manually for ten minutes. Confirm flow
   in every channel.

### Days 6 to 7 — planting and tuning (variable)
1. Mix the first batch of nutrient solution to the recipe target EC
   and pH. (Until the composter has run a thermal cycle, you're
   feeding from store-bought nutrients.)
2. Plant rockwool starter cubes into each NFT channel.
3. In the dashboard, assign the `buttercrunch` recipe to each zone.
4. Walk away.

---

## What KrattOS does after that

- **Scheduler** runs the recirculation pump on a 15-min-on / 45-min-off
  cycle during daylight hours (read from the lux sensor).
- **Control loop** watches per-channel moisture; flags any channel
  that drains differently from the others (clog).
- **Nutrient mixer** watches reservoir EC and pH. When EC drops below
  the recipe target, it doses slurry from the composter first, then
  base nutrients to make up the difference. When pH drifts, it doses
  pH-up or pH-down.
- **Composter controller** runs the mesophilic / thermophilic / cure
  cycle on each batch of scraps; gates the slurry valve closed until
  the batch has logged 72 hours at 55 C (pathogen kill).
- **Safety supervisor** owns the contactor. Trip conditions: leak, over
  temperature, EC over 4.0 mS/cm, pH below 4.5 or above 8.0, MCU
  heartbeat loss over 2 s, physical E-stop. Trips latch; require a
  physical reset.
- **Alerting** pushes a buzzer on the controller plus a notification to
  any phone on the LAN whenever anything needs human attention.
- **UI** is the same dashboard the indoor appliance uses, on the local
  WiFi, no cloud.

## What you give up vs the full indoor appliance

- **No vision AI.** A greenhouse camera doesn't have the controlled
  framing the canopy classifier expects. You can add one later as a
  monitoring camera, but the planner runs from sensors alone.
- **No fancy steel cabinet.** That's the point.
- **The composter loop is open.** Scraps go in by hand, slurry comes
  out by pump. The indoor appliance feeds itself via gravity from the
  built-in chute.

Everything else is identical: recipes, scheduling, safety, alerts,
dashboard, signed offline updates.

---

## Software profile

This greenhouse runs against `profiles/greenhouse-v1.yaml`. The profile
declares the four NFT beds, the shared reservoir, the composter, and
the climate control. Read it before you wire; it tells you exactly
which valve ID goes to which bed.

When you change the physical layout (add beds, switch to DWC, swap
heaters), edit the profile and `systemctl restart kratt.target`. No
code changes.
