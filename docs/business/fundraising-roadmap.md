# KrattOS: Fundraising Roadmap

The shortest path from "working software repo" to "funded hardware
company." Read top-to-bottom; don't skip phases.

---

## Phase 0: Make it fundable (months 0 to 2)

You have a complete software stack (49 tests passing, full systemd
service graph, 3D twin, signed-update path). Investors fund traction,
not repos. The gap to close: **one physical thing growing food.**

### Must-have deliverables before any pitch
- [ ] One assembled prototype (Jetson + 3 MCUs + off-the-shelf grow rack)
- [ ] Live lettuce growing on camera, 4-week time-lapse video
- [ ] 5 to 10 design-partner LOIs (restaurants, schools, ag-extension offices)
- [ ] Decision on license model (locked in, see below)
- [ ] Provisional patent filed on the air-gapped composter→slurry→shelf loop

### License decision (do this first)
- **Recommended: open-core.** MIT-licence the firmware, control loops,
  and schemas (already what the repo looks like). Keep proprietary:
  signed recipe bundles, the planner's training data, fleet-management
  cloud features (when those exist).
- Why: investors like a defensible moat, hardware buyers want repair
  rights, accelerators favour open ecosystems. Open-core threads both.

---

## Phase 1: Distribution model (lock in by month 3)

Pick ONE primary channel; don't try to be all three at once.

| Model | Sells to | Capital need | Time to revenue |
|-------|----------|-------------:|----------------:|
| **Hardware appliance** | Restaurants, schools, prosumers | High | 9 to 12 mo |
| **Software + reference design** | DIY/integrators build the box | Low | 3 to 6 mo |
| **B2B SaaS-on-appliance** | Commercial farms (fleet mgmt) | Medium | 6 to 9 mo |

**Recommendation for KrattOS:** Hardware appliance, beachhead = single-
location restaurants and K-12 culinary programs in the US Northeast +
Pacific Northwest. The air-gap angle differentiates from Click & Grow
(consumer toy) and Farmshelf (connected, B2B, expensive).

---

## Phase 2: Funding ladder

Pursue non-dilutive in parallel with everything else, it costs nothing
to apply and the wins fund equipment.

### 2a) Non-dilutive (target $200k to $450k, dilutes zero)
- **USDA SBIR Phase I**: agriculture + automation, $175k. Cycle:
  closes Oct, awards Apr. (Verify cycle on sbir.gov before counting on it.)
- **NSF SBIR Phase I**: edge AI / on-device ML, $275k. Rolling cycles.
- **State agtech grants**: most US states have $25k to $100k matching
  programs (check your specific state's economic development site).
- **DOD SBIR** (defence biosecurity / remote-base food), $200k Phase I.

### 2b) Accelerators (apply by month 4)
- **IndieBio / SOSV**: $525k for ~10%, food/ag-tech focus
- **AgFunder GROW**: agtech specialist, ~$150k
- **Y Combinator**: generalist but well-suited if you frame as edge AI
- **Techstars Farm-to-Fork** (Sprint Acceleration's agtech program)

### 2c) Pre-seed angels (target $500k to $750k, ~15% dilution)
- Best fit: angels who have *exited* food, kitchen-equipment, or
  IoT/embedded companies. They understand BOM-driven margins.
- Avoid SaaS-only angels: they will price the company wrong.
- Use AngelList + Visible.vc to manage the round.

### 2d) Crowdfunding (parallel option, month 8+)
- **Crowd Supply** (built for open hardware), also doubles as market
  validation. Typical agtech project: $200k to $600k raise + 200 to 800 units
  pre-sold.
- **Kickstarter** if you want consumer reach > open-hardware credibility.

### 2e) Eventual seed round (month 12 to 18)
- $2M to $3M at a $10M to $14M cap once you have ~50 units in field and
  $25k+ MRR equivalent (hardware + subs blended).

---

## Phase 3: Materials to prepare

These live in this repo:

| Artifact | Location | Status |
|----------|----------|--------|
| Pitch deck outline | `docs/business/pitch-deck-outline.md` | drafted |
| Bill of materials | `docs/business/bom.md` | drafted, needs price verification |
| Unit economics | `docs/business/unit-economics.md` | drafted |
| Air-gap threat model | `docs/security/threat-model.md` | TODO |
| Competitive landscape | `docs/business/competitors.md` | TODO |
| Regulatory checklist (UL/CE/FDA) | `docs/business/regulatory.md` | TODO |
| Demo video | external | not started: Phase 0 blocker |
| Data room (cap table, IP assignments, LOIs) | external | not started |

---

## Concrete 30/60/90-day checklist

### Days 1 to 30
- Order Jetson Orin Nano dev kit + 3 ESP32-S3 + Atlas probe kit + 4-shelf rack
- Flash KrattOS, wire up first shelf, get one moisture probe → dashboard
- File USPTO provisional patent on composter→slurry→shelf loop ($320)
- Open conversations with 20 restaurants in your city; book 10 site visits

### Days 31 to 60
- Full assembly: 4 shelves + composter + slurry loop
- Plant first lettuce trial; daily 5-minute video log
- Finalize BOM with real supplier quotes (not estimates)
- Apply to USDA SBIR Phase I (if cycle is open) and 2 accelerators

### Days 61 to 90
- Time-lapse video of first harvest goes live
- Convert 5 of the 10 site-visit conversations into signed LOIs
- Soft-circulate the deck to 20 angels for feedback (not asks)
- Set the formal raise live with a target close date 60 days out

---

## Anti-patterns to avoid

- **Don't pitch software.** This stack is impressive but it's not what
  you're selling. You're selling lettuce-from-a-fridge.
- **Don't raise on cloud-comparable metrics.** Hardware investors
  hate "MAU" and "ARPU." Use gross margin per unit, attach rate,
  payback period.
- **Don't open-source the recipes themselves until 100+ paid subs.**
  They're the moat in open-core.
- **Don't take strategic money from a Big Ag player in round one.**
  Their interests diverge from yours on consumer pricing.
- **Don't promise a feature on stage that isn't in the repo.** The
  current scope (49 tests, working twin, signed updates) is enough
  to fund. Anything more is risk you don't need.
