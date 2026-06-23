# KrattOS — Scrollytelling Site Brief

A self-contained brief for building a stunning, immersive, scroll-driven
landing site for KrattOS. Hand this to a fresh session. It assumes no
prior knowledge of the project. The goal is an Awwwards-tier experience
on the level of igloo.inc: 3D, scroll-choreographed, cinematic, but in
KrattOS's own warm solarpunk voice, not cold crypto-minimalism.

Everything below is true to the actual product and repo. Do not invent
specs, prices, or claims beyond what is here.

---

## 1. What KrattOS is, in one breath

**An offline AI farm appliance.** You give it water and power. It runs
the lights, the watering, the nutrient mixing, and the safety cutoffs by
itself, with no internet connection, ever. You take out food.

The flagship is the size of a fridge: four lit shelves of greens, with a
composter in the base that eats your kitchen scraps and turns them into
the liquid nutrient that feeds the plants above. Nothing leaves the
cabinet except the food you take out of it. No subscription, no cloud
account, no internet.

The same brain also runs on a Raspberry Pi clipped to a wire rack you
already own, or on an $8 microcontroller, or out in a greenhouse. One
operating system, many bodies.

## 2. The name (use this, it is the emotional core)

In Estonian folklore, a **Kratt** is a little household servant. You
build it out of whatever is lying around — straw, old tools, a broken pot
— and it comes to life to do the chores you would rather not. KrattOS is
the software that runs the modern Kratt: a machine that grows your food
out of water, electricity, and your own kitchen scraps.

The logo is a **power-on glyph fused with a sprout**: the universal power
symbol (⏻) whose bar becomes a stem, with two leaves unfurling through
the ring's gap. One mark, two readings: *switch it on → it comes alive.*
That is also the whole story in one glyph. Lean on it.

## 3. Why it should exist (the mission, do not soften this)

Today, indoor growing gives you two options: a plastic gadget that
sprouts three basil leaves and calls it a harvest, or a $40,000
commercial rack that needs a technician, a cloud subscription, and a
service contract. There is nothing in the middle, and nothing at all for
the people who cannot put grow gear on the internet: schools and
restaurants worried about data, labs and clinics with biosecurity rules,
remote sites and base kitchens, and households that simply do not want
another appliance reporting on what they had for dinner.

The deeper mission: **empower anyone to grow food regardless of their
work schedule, skill, or budget** — a real answer to food insecurity and
malnutrition, not a lifestyle toy. The cheap tiers are the part of this
project we are proudest of. A serious food appliance should not cost as
much as a used car to be useful.

This is NOT "put lettuce on camera." It is closer to "a quiet machine
that feeds people while they are at work."

## 4. What it actually does (the loop — great material for a 3D scene)

```
  food scraps ─┐                          clean water ──┐
               ▼                                         ▼
         ┌──────────┐  slurry tank  ┌─────────────────────────┐
         │ composter│ ─────────────►│ mixing manifold + dosers│
         └──────────┘               │ (slurry + 6 base + H2O) │
               ▲                     └───────────┬─────────────┘
        scraps in                                ▼
                                       per-shelf grow zones
                                       moisture · temp/humidity
                                       LED light · fan · cameras
```

1. **Scraps go in.** The composter grinds and runs a thermophilic
   (self-heating, no heater needed) cycle that hits 55°C for 72 hours —
   the USDA/EPA standard that kills pathogens. A two-probe minimum-temp
   rule means the *cold spot* has to pass, not the hot spot.
2. **A pathogen-kill gate opens.** Only after that kill step is verified
   does the slurry valve unlock. This gate is enforced in three
   independent places (the composter, the nutrient mixer, and a separate
   safety watcher that trips the whole power rail if anything tries to
   dose unsafe slurry). Safety is the spine of the product.
3. **The mixer blends.** Composted slurry plus six small base-nutrient
   reservoirs plus clean water, dosed to hit the crop's target EC and pH.
4. **The plants drink.** Per-shelf PI control loops read moisture and
   pulse valves. The AI watches the canopy with a camera and plans the
   grow. All of it runs locally on the appliance.
5. **You take out food.** Roughly 4–6 heads of lettuce a week on a
   four-shelf unit, on rotation.

## 5. The two compute tiers (the "serious engineering" beat)

- **Real-time tier:** ESP32-S3 microcontrollers handle sensor sampling,
  pump pulses, valve switching, light dimming, and an **independent
  safety supervisor** that gates the 24V actuator rail through a physical
  hardware contactor. Software cannot override it.
- **Cognitive tier:** an NVIDIA Jetson Orin Nano runs the vision AI,
  planning, control loops, storage, and the local web dashboard. Services
  talk over a localhost-only NATS message bus.

The two tiers are deliberately separate so a software hiccup can never
open a valve or energize a heater. The safety MCU cuts power on: leak
detected, slurry over-temperature, EC > 4.0, pH outside [4.5, 8.0], any
heartbeat loss > 2s, or the physical E-stop. Trips are latching: they
need a human ack plus a physical reset.

**Air-gap discipline is a feature, not an omission.** WiFi/BT disabled in
firmware, all outbound traffic firewalled on the Jetson, updates shipped
as cryptographically signed USB bundles applied via A/B partition swap
with rollback. It never phones home.

## 6. The product line (one brain, many bodies)

| Tier | Brain | What you get | Kit price |
|------|-------|--------------|----------:|
| **Nano** | ESP32 microcontroller | Light schedule, pump, sensors, dashboard over its own WiFi. Bring your own rack. | ~$149 |
| **Lite** | Raspberry Pi 4 | Full dashboard + recipe library on a rack you already own. | ~$279 |
| **Full** | Jetson Orin Nano | The finished cabinet: vision AI, auto-dosing, composter. | ~$4,499 |
| **Greenhouse** | Jetson Orin Nano | 14×30 ft hoop house, 6 NFT hydroponic beds, composter-fed recirculation, no hand-watering. | ~$1,450 in parts |

Whatever you bring — shelves, beds, channels — KrattOS reads its **site
profile** (a YAML description of the physical setup) and adapts. Same OS,
no code branching. This adaptability is a key story beat: it is not four
products, it is one mind that fits the body it is given.

## 7. What is real today (proof, for a "status" beat)

- Software built and tested: ~92 passing tests across control loops,
  safety supervisor, composter logic, recipe engine, planner, vision, and
  the update system.
- A working **3D digital twin** of the appliance and the greenhouse —
  every shelf, plant, valve, pump, and probe modeled and wired to live
  sensor data. (Built in Three.js, already in this repo under
  `site/src/lib/cad/`. Reuse it.)
- Signed offline updates over USB.
- The code is open on GitHub.
- What is NOT built yet: one physical proof unit. A $3,000 GoFundMe funds
  exactly that. (Optional CTA, not the centerpiece.)

---

## 8. Brand system (use these exact tokens)

**Palette** — solarpunk: natural, warm, optimistic, never neon or
clinical. Pulled straight from the appliance render (powder-coated sage
steel, oak, brushed brass).

| Token | Hex | Use |
|-------|-----|-----|
| Evergreen | `#2E5A41` | Primary green, dark fields, ring + stem |
| Leaf back | `#3F7350` | Depth green |
| Leaf front | `#6FB07A` | Bright leaf |
| Vein | `#234734` | Deepest shadow green |
| Brass | `#C2992E` | Premium accent. Use sparingly. The "OS" in the wordmark. |
| Ink | `#23201B` | Body text on light, the "Kratt" wordmark |
| Paper | `#F4F1EA` | Warm off-white background |
| Paper warm | `#ECE6D6` / `#DCD3BC` | Tonal steps |

**Type:** Space Grotesk (600 for the wordmark and headings, tracking
≈ −2.7%; 400–500 for body). It is geometric with just enough character.
Body/UI can fall back to system-ui.

**Wordmark:** one word, a colour shift — `Kratt` in ink, `OS` in brass.
Never a space or hyphen between them. Never recolour "OS" to match.

**Logo assets already in repo** (`assets/brand/`): `krattos-logo.svg`,
`krattos-logo-dark.svg` (for the evergreen field), `krattos-mark.svg`
(icon), `krattos-mark-mono.svg` (one-ink, uses currentColor), plus PNG
exports. There is also a hero render at `assets/render/kratt-3d.png` and
a 3D appliance/greenhouse model usable in Three.js.

## 9. Voice rules (NON-NEGOTIABLE — the project lives and dies on these)

1. **No em-dashes or en-dashes anywhere in copy.** Not "—", not "–". Use
   commas, colons, "to", or full stops. This is a hard rule the founder
   enforces. (This brief uses them for editorial clarity; the *site copy*
   must not.)
2. **Depersonalized.** No founder bio, no "I", no personal story, no
   names or photos of people. Speak as the project: "we", "the project",
   "KrattOS". The founder explicitly does not want this to be about him.
3. **Warm and plain, not corporate or hype.** Short declarative
   sentences. "You give it water and power. You take out food." Avoid
   buzzwords, avoid exclamation, avoid "revolutionary."
4. **Honest.** It is "the thing that should exist in the middle," not a
   miracle. Name what is not built yet.
5. The name is **KrattOS**, always. Never GroveOS (an old name — must
   appear nowhere). Pronounced like "cot," not "Kratt-O-S."

---

## 10. The scrollytelling experience (the actual ask)

Reference quality: **igloo.inc** — full-bleed WebGL, scroll as the only
navigation, scenes that dissolve into each other, a single 3D object
choreographed through the whole story, type that arrives with weight.
But warm and alive (sun, leaves, condensation, growth) rather than cold
and frozen. Solarpunk, not cyberpunk.

**Recommended stack:** SvelteKit (already the repo's framework) +
Three.js (the twin already exists, reuse `site/src/lib/cad/`) + GSAP
ScrollTrigger or Lenis for smooth scroll-linked animation. Prefer one
persistent `<canvas>` whose camera/state is driven by scroll progress
over many separate embeds.

**Suggested narrative arc (one continuous scroll):**

1. **Cold open.** Black-to-paper. The power-on glyph draws itself; the
   bar becomes a stem; two leaves unfurl. Wordmark resolves: Kratt·OS.
   One line: *"An offline AI that grows your food."*
2. **The myth.** A short, quiet beat on the Kratt — a thing built from
   odds and ends that comes alive to do your chores. Sets the warmth.
3. **The cabinet arrives.** The 3D appliance rotates in from darkness,
   fridge-sized, four shelves lighting up one by one as you scroll. This
   is the hero object that carries the rest of the story.
4. **The loop.** Camera dives into the cabinet. Scraps fall into the
   composter; heat rises (55°C/72h); the pathogen-kill gate clicks open;
   slurry flows to the mixer; greens drink; a head of lettuce grows in
   fast-forward. Each stage is a scroll-pinned sub-scene. This is the
   centerpiece — the closed loop is the whole magic.
5. **Two brains, one rule.** Split or layered scene contrasting the
   real-time safety MCU (hard, physical, cuts the rail) with the AI brain
   (watches, plans). Message: software can think, but it can never
   override the hardware that keeps you safe. Air-gap shown as a wall
   light cannot cross.
6. **One mind, many bodies.** The cabinet morphs / cross-dissolves
   through the Nano (a clip-on board), the Lite (a Pi on a wire rack),
   and the Greenhouse (the 3D hoop house with its six NFT beds — also
   already modeled in the repo). Same glyph pulsing in each. Price tiers
   land here as quiet type.
7. **The mission.** Pull back to people: anyone, any schedule, any
   budget, growing food. Food security framed plainly. No faces needed;
   let type and a wide warm field carry it.
8. **Proof + CTA.** What is real today (tests, the twin, open code), then
   one clean call to action (GitHub, or the $3,000 proof-unit raise).
   Close on the glyph again, powered on, leaves out.

**Motion principles:**
- Scroll progress drives a single timeline. Nothing autoplays past the
  user; they hold the clock.
- Light is the recurring motif: grow-light magenta-warmed to brass, sun
  through greenhouse plastic, the power glyph's glow. Let light do the
  transitions.
- Real materials: powder-coated sage steel, oak, brushed brass,
  translucent greenhouse skin, condensation, soil. Avoid glassy neon.
- Respect `prefers-reduced-motion`: ship a graceful non-3D fallback that
  still tells the story with stills and type. The product serves people
  with constraints; the site should too.
- Performance: lazy-load the heavy 3D, target mobile, keep the first
  paint fast. A beautiful site that janks on a phone betrays the "for
  everyone" mission.

**Existing assets to reuse, do not rebuild from scratch:**
- `site/src/lib/cad/buildCabinet.js` — Three.js cabinet builder.
- `site/src/lib/cad/buildGreenhouse.js` — Three.js hoop-house builder.
- `site/src/lib/cad/dimensions*.js` — real dimensions, kept in sync with
  the `profiles/*.yaml` site profiles.
- `assets/brand/*` — logos and marks.
- `assets/render/kratt-3d.png` — hero render.
- Existing routes under `site/src/routes/` (`pitch`, `twin`, `system`,
  `greenhouse`, `build`) for copy and structure to mine.

---

## 11. One-paragraph version (if you only read one thing)

KrattOS is an offline AI appliance that grows your food. Give it water,
power, and your kitchen scraps; it composts the scraps into nutrient,
mixes them with water to the right strength, runs the lights and the
watering, keeps itself safe with independent hardware, and never touches
the internet. It comes as a fridge-sized cabinet, a clip-on board for a
rack you already own, a Raspberry Pi kit, or a greenhouse — one operating
system that adapts to whatever body you give it. Named after the Estonian
Kratt, a servant built from odds and ends and brought to life to do your
chores. The mission is to let anyone grow food regardless of schedule,
skill, or budget. Build the site warm, solarpunk, and honest, with no
em-dashes and no person at the center, only the work.
