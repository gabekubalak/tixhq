# KrattOS — GoFundMe Campaign Copy

Ready-to-paste copy for the GoFundMe page. Replace bracketed
[placeholders] with your real numbers before posting.

---

## Campaign title (60 char limit)

**KrattOS — the offline AI farm that grows food in your kitchen**

Alternative titles to A/B if you want to test:
- *Help me build KrattOS — a kitchen farm that runs without the cloud*
- *KrattOS: an AI kitchen-garden you actually own*
- *The household helper that grows your salad. No internet. No subscription.*

## Funding goal

**$45,000** — enough to build three working prototypes, file the
provisional patent, and ship the first ten units to design-partner
restaurants.

## Hero image

The solarpunk product render (`assets/render/kratt-3d.png` + the
ChatGPT-generated hero).

---

## Story (the page body)

### A cabinet-sized farm that quietly grows your food

KrattOS is an indoor vertical-farming appliance about the size of a
fridge. You plug it into water and power, drop in seed pods, and walk
away. Four illuminated shelves grow lettuce, herbs, and microgreens
on rotating cycles — enough that a household pulls a fresh salad
every few days, or a small restaurant covers its garnish program for
the year.

The composter at its base eats your kitchen scraps and turns them
into liquid nutrient that feeds the plants above. Nothing leaves the
cabinet except the food you harvest from it.

It runs an entirely on-device AI. No subscription. No cloud account.
No internet connection — ever.

### Why I'm building this

Existing indoor-farming gadgets are one of two things:

- Plastic toys that grow three basil leaves and call it a harvest.
- Commercial racks that cost $40,000 and require a technician,
  a cloud subscription, and a thick service contract.

There's nothing in between. And there's nothing at all for the
people who *can't* connect grow gear to the internet — schools and
restaurants worried about data leaks, labs and clinics with
biosecurity rules, military and remote-base food programs, and a
growing population of households that just don't want another smart
appliance phoning home about what they had for dinner.

KrattOS is that missing middle. It's a serious piece of food
equipment — a Jetson edge-AI brain, three real-time microcontrollers,
a closed-loop hydroponic plumbing system, a hardware-watchdog safety
supervisor — wrapped in a cabinet that fits in your kitchen and
behaves like an appliance, not a tech demo.

### Why "KrattOS"?

In Estonian folklore, a **Kratt** is a household servant assembled
from whatever junk lies around — straw, old tools, a broken pot —
and brought to life to do the chores its maker would rather not.
It's a perfect image for an appliance that quietly grows food for
you out of water, electricity, and your kitchen scraps.

KrattOS is the operating system that runs the modern Kratt.

### What's already built

This isn't vapourware. The full software stack is done and tested:

- **49 passing tests** across the control loops, safety supervisor,
  composter state machine, recipe engine, planner, vision pipeline,
  and update system.
- A **fully working 3D digital twin** of the appliance — every
  shelf, plant, valve, pump, and probe modelled and live-bound to
  sensor data.
- **Signed offline update bundles** so the appliance can be
  upgraded by walking up to it with a USB stick. No phone-home.
- A **two-tier compute design** that splits real-time hardware
  control (FreeRTOS microcontrollers) from cognitive work (ONNX
  vision + recipe planner on Linux), so a software crash can never
  open a valve or turn on a heater.

The code is open-core on GitHub. What's *not* built yet — and what
your money funds — is the physical box.

### What your money builds

| Bucket | Amount | What it pays for |
|--------|-------:|------------------|
| 3 working prototypes | $18,000 | Jetson Orin Nano × 3, ESP32-S3 × 9, Atlas EC/pH probes, peristaltic pumps, LED panels, cabinet fabrication, food-grade plumbing |
| First production cabinets (custom steel + glass) | $12,000 | Tooling-deposit at a US contract manufacturer for a 10-unit production run |
| Pilot installs at 10 design-partner restaurants | $9,000 | Free units, six months of free seed pods, on-site install and training |
| Provisional patent + IP filings | $2,500 | USPTO provisional, freedom-to-operate review, trademark "KrattOS" |
| Agronomist consulting (recipe development) | $3,500 | Three crop scientists tune the lettuce, basil, microgreens, and strawberry recipes against real harvest data |

Anything raised over the $45k goal goes directly into producing more
pilot units. Every $4,500 above target = one more restaurant or
school getting a free KrattOS to use for six months.

---

## Reward tiers (perks)

GoFundMe doesn't formally support tiered rewards the way Kickstarter
does, but you can list them in the story and ship them yourself as
each donor opts in. (If you switch to Kickstarter later, lift these
straight over.)

### $25 — *Mark on the wall*
Your name etched onto a brass plate inside the first production
KrattOS, mounted next to the composter door. A photo of it installed
gets emailed to you.

### $75 — *Seed library*
A starter library of heirloom seeds for the recipes we're tuning
(buttercrunch, basil genovese, mizuna, microgreens mix). Plus the
photo from $25.

### $250 — *Early access*
Hands-on access to the dashboard and 3D digital twin once we're
running. Monthly behind-the-scenes development updates from the
workshop. Plus everything above.

### $1,500 — *Founding owner*
First production run, ship-to-you. You get unit #001–#010 from the
first manufactured batch at half the eventual $4,499 retail price.
*Estimated ship: month 8.* Limited to 10 backers. **(This is the
real one — it's how the pilot units get into the world.)*

### $5,000 — *Restaurant install*
Pre-purchase one of the pilot kitchen installs. We deliver and set
up a KrattOS in your restaurant, train your team, and tune the
recipes to your menu over the first three months. Limited to 3
backers.

### $25,000 — *Founding patron*
You fund an entire pilot site at a school, food bank, or non-profit
of your choice (we'll help you pick if you don't have one). Your
name (or your foundation's) goes on the install plaque at that site,
and you get a unit for yourself. Limited to 1 backer.

---

## FAQ

**Will this actually grow enough food to matter?**
Yes. A four-shelf KrattOS configured for leafy greens produces
roughly 4–6 heads of lettuce per week on rotation — about $25–$40
of grocery-store value per week, depending on where you live. A
single restaurant unit covers most of a salad-and-garnish program.
We have the projections in the unit-economics doc in the repo.

**Why no internet?**
Three reasons. (1) Privacy: your kitchen shouldn't be a data
source. (2) Reliability: appliances that brick on subscription
lapse are an anti-pattern. (3) Real users we've talked to —
hospital food services, embassy kitchens, biosecurity labs,
defence-base mess halls — literally cannot put a connected device
in their food chain. Building for them first means everyone
benefits.

**How do recipes and software updates arrive then?**
On a signed USB stick that we mail with the monthly seed-pod
shipment (or that you download yourself and copy across, if you
prefer). The appliance verifies the cryptographic signature before
applying anything. There is no remote-execution path. Ever. By
design.

**What happens if you don't hit the goal?**
GoFundMe is keep-what-you-raise, so every dollar still goes
into the project. With $20k we can build one prototype and file
the patent. With $30k we can do the prototype run. The full goal
is what unlocks the pilot installs at restaurants — which is what
turns this from a project into a business.

**What if you can't finish?**
The hardware risk is the cabinet, the plumbing, and getting the UL
listing — those are the parts that have not yet been done. If we hit
a wall we can't get past, we'll publish everything we've learned,
release any pilot-build documentation under the open-core licence,
and refund the unfulfilled physical rewards (the $1,500+ tiers)
proportionally. The brass plates and seed libraries ship regardless
because they cost almost nothing.

**Is this open source?**
The firmware, control loops, schemas, and update system are MIT.
The signed recipe library and fleet-management software (when
those exist) are commercial. This is what's called "open-core" and
it's the model that lets a hardware company survive without
selling out your data later.

**Where does my donation go?**
Straight into the project's business account, which a contract
attorney is setting up at the same time as this campaign launches.
Your contribution receipt arrives by email immediately; receipts
for tax purposes are NOT issued because this is not (yet) a
registered non-profit.

**Who's building this?**
[Your name + 1-2 sentences on background + GitHub link]. The code
is on GitHub — go look at the commit history if you want to see
exactly what's been built so far.

**How do I reach you?**
Email: [you@example.com]. The KrattOS GitHub:
[github.com/yourname/kratt]. Updates post weekly on the campaign
page once the first $5k is raised.

---

## Updates schedule (post one of these every 1–2 weeks)

Pre-launch ones to draft now and queue up:

1. **Day 0 — Launch:** "We're live. Here's the demo video and what
   the first $5k unlocks."
2. **Week 2 — Workshop tour:** photos of the bench setup, the
   Jetson on its breakout board, the first MCU blinking.
3. **Week 4 — First sprouts:** time-lapse of lettuce going from
   seed to first true leaf on shelf 1.
4. **Week 6 — Software walkthrough:** 90-second video of the
   dashboard and the 3D twin updating in real time.
5. **Week 8 — Composter trial:** the first kitchen scraps going
   in, temperature climbing through the thermophilic phase.
6. **Week 10 — Patent filed:** screenshot of the USPTO receipt.
7. **Week 12 — First harvest:** the money shot. Lettuce on a
   plate, dressing optional.

---

## Social / Twitter / IG one-liners (for shares)

- "Built an indoor farm that grows your salad and runs zero cloud.
  Now I'm crowdfunding the box. KrattOS."
- "The new appliance category nobody's serving: AI vertical farming
  for people who don't want their kitchen on the internet."
- "Three years of code, 49 passing tests, zero cloud. Time to put
  it in a cabinet. Meet KrattOS."
- "Named after the Estonian household spirit that does chores for
  you out of old junk. Mine grows lettuce."
