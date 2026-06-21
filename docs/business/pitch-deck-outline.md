# KrattOS: Pitch Deck Outline

> **Scope.** This deck is the **post-proof** ask, for pre-seed angels,
> agtech accelerators, and SBIR/STTR review panels. The current
> public-facing ask is much smaller: the $3,000 GoFundMe to fund one
> proof unit (see `gofundme-copy.md`). Use this deck after that proof
> ships, when you have a time-lapse of lettuce growing under KrattOS to
> open the demo slide with.

A 10-slide deck for pre-seed angels, agtech accelerators, and SBIR/STTR
review panels. Each slide lists the *one* thing it must land. Total
read-aloud time ≈ 6 minutes.

---

## Slide 1: Title
- **Product:** KrattOS, the operating system for an AI vertical farm
  that runs offline.
- **Tagline (one line):** "Grocery-store produce, grown on your counter,
  with zero cloud."
- Founder name + contact + funding ask in small print.

## Slide 2: Problem
- Indoor farms today are either (a) hobby toys that don't actually grow
  food, or (b) commercial racks that require cloud, network, and a
  technician.
- Restaurants, schools, and biosecurity-sensitive buyers (labs, defence,
  remote operations) can't or won't connect grow gear to the internet.
- Existing "smart garden" appliances phone home, brick on subscription
  lapse, and ship no recipes for anything past basil.

## Slide 3: Solution
- A single appliance the size of a fridge. Plug in water + power, walk
  away for 32 days, pull out lettuce.
- Self-contained: ML vision, planner, control loop, recipes, UI, all
  on-device.
- Air-gapped: no internet, ever. Updates via signed USB bundles.
- Composts kitchen scraps into nutrient slurry inside the same cabinet.
  Closes the loop.

## Slide 4: Demo
- 30-second screen recording: live dashboard, 3D digital twin spinning,
  one shelf transitioning from `veg` to `harvest_ready` in time-lapse.
- Pull the network cable on camera: keep growing.

## Slide 5: Why now
- Jetson-class edge AI is $200 (was $2000 in 2020).
- ESP32-S3 + ONNX Runtime makes the two-tier compute split (real-time
  MCU + cognitive Linux) viable on a hobbyist budget.
- Post-pandemic supply shocks made local food resilience a board-level
  topic at hospital systems, military bases, and remote-site operators.

## Slide 6: Market
- **Beachhead:** restaurants & schools that want $2/lb microgreens
  on-site instead of $14/lb delivered. ~50k US sites.
- **Wedge into:** biosecurity-conscious buyers (labs, defence, embassies,
  Antarctic stations).
- **Eventual:** prosumer kitchens (the GE Monogram of indoor farming).
- TAM/SAM/SOM: cite USDA + Allied Market Research indoor-farming numbers
  (verify before pitching, do NOT guess these on stage).

## Slide 7: Business model
- **Hardware appliance:** $3.5k to $5k retail (target 45% gross margin).
- **Recipe & seed pods:** recurring revenue, $30/month subscription
  delivered by mail (no internet required to run).
- **B2B fleet support:** annual contract for kitchens running 4+ units.
- **Open-core stack:** firmware + control loops are MIT; signed update
  bundles + recipes are the moat.

## Slide 8: Traction (what you'll fill in here)
- N design-partner LOIs (restaurants/schools/etc.), get these before
  the deck goes out.
- 1 working prototype, photographed and videoed.
- Software stack: 49 tests passing, full systemd-supervised service
  graph, 3D digital twin, signed-update path.

## Slide 9: Team & ask
- Founder(s): name, what they built before (link the GitHub if possible).
- **Ask:** $X for 12 months of runway.
  - Hardware bring-up (3 production units): ~40% of budget
  - Recipe development + agronomist contracts: ~25%
  - Founder salaries: ~25%
  - Legal/IP/regulatory: ~10%

## Slide 10: The 12-month milestones
| Month | Milestone |
|-------|-----------|
| 1     | First prototype grows lettuce end-to-end |
| 3     | Pilot install at 1 restaurant + 1 school |
| 6     | 10 paid pilots, $50k MRR equivalent |
| 9     | UL listing in progress; SBIR Phase II submitted |
| 12    | 50 units in field; Series A ready |

---

## Appendix (only show if asked)

- Unit economics (see `unit-economics.md`)
- BOM (see `bom.md`)
- Air-gap threat model
- Comparison vs Click & Grow / AeroGarden / Farmshelf / Plenty
- Regulatory: UL/CE/FDA hydroponic-equipment landscape
