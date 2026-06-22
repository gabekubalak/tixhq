# Keeping the composter thermophilic (and your food safe)

KrattOS does not heat the composter electrically. Active aerobic
composting is exothermic: a properly built pile generates its own heat
through microbial metabolism, climbing to 55-65 C and holding there for
days. The 72 h pathogen-kill window we rely on is biology doing the
work, not a heater pad.

That's the good news. The bad news is biology only does the work if you
give it what it needs. This page is the user-facing checklist.

---

## What the pile needs to self-heat

Four things, in roughly this order of importance.

1. **Aeration.** Thermophilic bacteria are obligate aerobes. Starve
   them of oxygen and they die, the pile cools, and the wrong (anaerobic)
   bacteria take over. KrattOS keeps a small aquarium air pump and a
   diffuser stone running at the bottom of the drum 24/7. **If the
   air-pump flow signal stops, the pathogen-kill gate freezes** even
   though the temperature reading may briefly stay high.
2. **C:N ratio around 25:1 to 30:1.** This is the magic number. Too much
   "brown" (carbon: dry leaves, cardboard, shredded paper) and the pile
   won't heat. Too much "green" (nitrogen: fresh vegetable scraps, coffee
   grounds, grass clippings) and it goes anaerobic and smells like
   ammonia. A practical rule: roughly 2 parts greens to 1 part browns by
   eye, with the browns torn or shredded small.
3. **Moisture 50-60% (the wrung-sponge test).** Squeeze a handful: a
   couple of drops should come out, no more. Too dry and the microbes
   stall. Too wet and oxygen can't move through. If your kitchen scraps
   are mostly wet greens, add shredded cardboard until it feels right.
4. **Minimum thermal mass.** A 12 L cabinet drum or a 40 L greenhouse
   drum is on the small side, which is why the insulation in the BOM is
   non-optional. Don't run a half-empty drum. Below about 7 L of active
   material, even a perfect pile loses heat faster than it makes it and
   never reaches 55 C.

---

## What the dashboard tells you

KrattOS publishes `kratt.composter.state` every 10 s with:

- `phase` (idle, grinding, mesophilic, thermophilic, cure, tank_ready)
- `temp_c` (current pile temperature)
- `thermo_hold_seconds` (running total of time spent at >= 55 C)
- `pathogen_kill_ok` (true once thermo_hold reaches 72 h)

The dashboard shows these. The pathogen-kill flag is also enforced by
the safety MCU as a hardware interlock on the slurry valve, not just a
software boolean. **Until the flag flips, the slurry pump cannot run.**

---

## What you'll see if it stalls

A pile that's getting it right will look like this on the dashboard:

```
hour  0:  temp_c=24,  phase=grinding
hour  4:  temp_c=44,  phase=mesophilic
hour  8:  temp_c=58,  phase=thermophilic   thermo_hold=0:01
hour 24:  temp_c=63,  phase=thermophilic   thermo_hold=16:00
hour 72:  temp_c=60,  phase=thermophilic   thermo_hold=64:00
hour 80:  temp_c=58,  phase=cure           thermo_hold=72:00  pathogen_kill_ok=true
```

A stalled pile looks like one of these failure modes:

- **Never reaches 55 C** (stuck at 35-45 C for >24 h after loading): too
  dry, too little nitrogen, or pile too small. Open the lid, add a
  handful of fresh greens (coffee grounds work great), spray with a bit
  of water if it feels dry, turn the auger to mix.
- **Reaches 55 C then crashes back to 30 C**: ran out of food, or went
  anaerobic. Open, smell. Ammonia means anaerobic, mix more browns in.
  No smell means the pile is done eating, restart with new feedstock.
- **Temperature reading is stuck at one value for >10 minutes**: probe
  failed or detached. The safety MCU refuses to advance the gate under
  these conditions; replace the probe.

Whatever the failure mode, **a batch that doesn't cleanly cross 55 C
for 72 continuous hours never opens the slurry valve.** Software fails
closed. That's the whole point.

---

## What never to put in the composter

| Never                                  | Why                                                                                          |
|----------------------------------------|----------------------------------------------------------------------------------------------|
| Pet waste (dog, cat, bird)             | Pathogen load is far above what 55 C for 72 h reliably kills. Needs 65 C + 7 days minimum.   |
| Raw meat, fish, or anything with bones | Same reason. Also attracts pests.                                                            |
| Dairy in any quantity                  | Small amounts mixed in are fine; large quantities go anaerobic fast and crash the pile.      |
| Diseased plant material                | Some plant pathogens survive composting (especially fungal cysts).                           |
| Anything with stickers, plastic, or coated paper | Doesn't decompose; ends up in the slurry as visible contamination.                  |
| Anything from a yard treated with herbicide | Herbicides (especially clopyralid) survive composting and kill the plants you're feeding. |

This list is what software cannot enforce. Print it. Stick it on the
composter lid.

---

## What KrattOS does, and what you still do

KrattOS does:

- Hold the 55 C / 72 h gate (hardware-enforced on the slurry valve)
- Run aeration 24/7 and refuse to advance the gate if aeration fails
- Refuse to advance the gate on a stuck or missing temperature probe
- Persist batch state to disk so a restart doesn't lose progress
- Log every temperature reading to an append-only audit file per batch

You still do:

- Build the pile right (the four things at the top of this page)
- Keep the wrong stuff out (the table above)
- Wash your produce before eating it, every time, the way you would
  with anything from a grocery store
- If a batch fails the gate, empty it onto your yard or a municipal
  compost stream. Do not "override" software to use a failed batch.
- Clean the slurry tank and lines between batches (10% bleach rinse,
  then a clean-water flush)

This is the same deal as any working compost system: software can hold
the bright line and refuse to cross it, but the inputs are still on you.
