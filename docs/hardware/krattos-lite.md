# KrattOS Lite

The full KrattOS is a finished appliance: a steel cabinet, a Jetson, a
camera, an auto-dosing rig, a composter. Beautiful, but a few thousand
dollars. KrattOS Lite is the opposite philosophy.

**Ship the brain, not the box.** You bring a room, a wire rack, and some
trays. KrattOS Lite is a small controller that clips onto your rack and
runs the same software, just trimmed to what a DIY grower actually needs.
Parts come to roughly $200. As a pre-built kit it lands near $279.

It still runs entirely offline. Same air-gap, same local dashboard, same
recipes. It just trusts you to assemble the physical structure.

---

## What you supply

None of this is in the kit. You almost certainly have, or can get
cheaply at any hardware store:

- **A room.** A spare room, a basement corner, a garage, a closet. It
  needs a power outlet and a door or curtain to keep light in.
- **A wire shelving rack.** The chrome or black wire shelves everyone
  has in their garage. A 4-tier unit runs $40 to $80. Adjustable shelf
  height is the only thing that matters.
- **Grow trays.** Standard 1020 trays, the ones every nursery uses, are
  about $3 to $5 each. One per shelf.
- **A reservoir.** Any food-safe bucket or tote, around $8. (We include
  one in the kit option if you'd rather not source it.)
- **Seeds and nutrients.** Consumables. A starter pack ships with the
  kit; after that you buy refills or use any hydroponic nutrient line.

## What's in the kit

The controller and everything that makes the rack *smart*:

**Compute & control**
- Raspberry Pi 4 (2GB), pre-flashed with KrattOS Lite
- 32 GB microSD card
- ESP32-S3 board (the real-time I/O layer that drives the hardware)
- Power supplies (5V for the Pi, 12V for pump, lights, and fan)

**Actuation**
- 4-channel relay/MOSFET board (lights, pump, fan, spare)
- 12V submersible pump for recirculation and drip
- 120 mm fan for airflow
- Drip manifold and food-grade silicone tubing
- One 12V full-spectrum LED grow bar (daisy-chain more as you add shelves)

**Sensing**
- Two capacitive moisture probes
- Temperature and humidity sensor (SHT41)
- Water-level float switch
- Leak sensor for the drip tray

**Enclosure & wiring**
- Controller box (3D-printed or ABS)
- Wiring harness, connectors, inline fuse

## What's different from the full appliance

Lite drops the expensive and the complicated. Here's exactly what you
lose and what you do instead:

| Full appliance | KrattOS Lite | What you do instead |
|----------------|--------------|---------------------|
| Jetson + camera vision AI | none | You glance at the plants. The recipe still runs on schedule. |
| Automated EC/pH dosing rig | none | The dashboard shows your target EC/pH and tells you when to top up. You mix and pour. (This is how most hobby hydroponics already works.) |
| Built-in composter | none | Use bought nutrients. The compost loop is a full-unit feature. |
| VictoriaMetrics history database | lightweight local logging | You keep the last couple of weeks of data, not years. |
| Steel cabinet | your wire rack | You assemble the structure. |

Everything else carries over: the recipe engine, the light and pump
schedules, moisture-driven watering, environmental monitoring, safety
cutoffs, alerts, and the full local dashboard on your phone or laptop.

## Software: the Lite profile

KrattOS Lite is not a fork. It's the same repository running a smaller
set of services, defined in `infra/systemd/kratt-lite.target`:

```
kratt-bus            local message bus
kratt-sensor-ingest  reads the ESP32 sensor stream
kratt-recipe         tracks each crop's stage and target setpoints
kratt-scheduler      lights photoperiod + pump duty cycle
kratt-control        moisture-driven watering
kratt-safety         leak / over-temp / watchdog cutoffs
kratt-alerting       operator alerts
kratt-ui             the dashboard
```

Enable it with:

```bash
systemctl enable --now kratt-lite.target
```

The vision, ML planner, auto-dosing, composter, and time-series services
simply aren't started. The Pi 4 runs the rest with room to spare.

## Setting it up yourself

Start to first seedling is an afternoon.

1. **Build the rack.** Assemble your wire shelving. Set the shelf
   spacing to roughly 30 to 40 cm so the lights clear the canopy.
2. **Mount the lights.** Clip a grow bar under each shelf, facing the
   tray below. Daisy-chain them to the controller's 12V line.
3. **Set the reservoir and pump.** Put the bucket on the bottom shelf or
   the floor. Drop the pump in. Run tubing up to the drip manifold over
   the top tray, with return holes draining back down through the trays.
4. **Place the sensors.** Push the moisture probes into two trays. Clip
   the temp/humidity sensor at canopy height. Drop the float switch in
   the reservoir and the leak sensor in the drip pan.
5. **Wire the controller.** Everything lands on labelled screw
   terminals. Lights, pump, and fan to the relay board; sensors to the
   ESP32 header. One 12V plug, one 5V plug. There's a wiring card in the
   box and a diagram in the dashboard.
6. **Power on.** The Pi boots KrattOS Lite and starts its own local
   network. Connect your phone to it (no internet involved) and open the
   dashboard.
7. **Pick a recipe.** Choose a crop, confirm which shelves it's on, and
   the scheduler takes over the lights and pump. The dashboard tells you
   when to add water and nutrients.
8. **Plant.** Sow your trays, slide them in, close the door or curtain.

From here it runs itself. Check the dashboard when it pings you.

## Going even cheaper: KrattOS Nano

If $200 is still too much, there's a firmware-only tier. **KrattOS Nano**
drops the Raspberry Pi entirely and runs on the ESP32-S3 alone. It serves
a small dashboard over its own WiFi access point (still no internet) and
handles the essentials: light schedule, pump duty, moisture and
temperature, and safety cutoffs. No recipe library, no 3D twin, no rich
history. Parts come to around $110; as a kit, near $149.

It is the absolute floor: a smart grow controller anyone can afford. You
can always upgrade to Lite later by adding the Pi; the wiring is the same.

## Cost summary

| Tier | What runs it | Parts | As a kit |
|------|--------------|------:|---------:|
| KrattOS Nano | ESP32-S3 firmware + mini web UI | ~$110 | ~$149 |
| KrattOS Lite | Raspberry Pi 4, trimmed KrattOS | ~$195 | ~$279 |
| KrattOS (full) | Jetson appliance, cabinet, composter | ~$2,900 | ~$4,499 |

Full parts breakdown for the Lite and Nano tiers is in
`docs/business/bom-lite.md`.

> So, is the few-hundred-dollar KrattOS possible? Yes. The brain is cheap.
> The cabinet was always the expensive part, and the cabinet is the part
> you already own: a room, a rack, and some trays.
