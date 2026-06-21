# KrattOS GoFundMe Campaign Copy

Ready to paste into the GoFundMe page. The only thing to swap before
posting is the `[github.com/yourname/kratt]` placeholder for the real
repo URL.

---

## Campaign title (60 char limit)

**KrattOS: the offline AI farm that grows food in your kitchen**

A few alternates to test if you want:
- *Help me build KrattOS, a kitchen farm that runs without the cloud*
- *KrattOS: an AI kitchen garden you actually own*
- *The helper that grows your salad. No internet. No subscription.*

## Funding goal

**$3,000.** Enough to build one working KrattOS and prove it grows food
on its own, offline, on camera. That's the whole ask. Not a company, not
a factory. One unit that works, filmed start to finish.

## Hero image

The solarpunk product render (`assets/render/kratt-3d.png`) plus the
hero shot.

---

## Story (the page body)

### A cabinet that quietly grows your food

KrattOS is an indoor farming appliance about the size of a fridge. You
plug it into water and power, drop in seed pods, and walk away. Four
lit shelves grow lettuce, herbs, and microgreens on a rotation, so a
household pulls a fresh salad every few days and a small restaurant can
cover its garnish program for the year.

The composter at the bottom eats your kitchen scraps and turns them
into the liquid nutrient that feeds the plants above it. Nothing leaves
the cabinet except the food you take out of it.

And it runs entirely on its own. No subscription. No cloud account. No
internet connection, ever.

### Why it should exist

Right now, if you want to grow food indoors, you get one of two things.
Either a plastic gadget that sprouts three basil leaves and calls it a
harvest, or a $40,000 commercial rack that needs a technician, a cloud
subscription, and a service contract.

There's nothing in the middle. And there's nothing at all for the
people who genuinely can't put grow gear on the internet: schools and
restaurants that worry about data, labs and clinics with biosecurity
rules, remote sites and base kitchens, and a whole lot of households
that simply don't want another appliance reporting on what they had for
dinner.

KrattOS is the thing that should exist in the middle. Under the hood
it's serious food equipment: an edge-AI brain, three real-time
microcontrollers, a closed-loop hydroponic system, and a hardware
safety supervisor that can cut power on its own. But it lives in your
kitchen and behaves like an appliance, not a science project.

### Why the name?

In Estonian folklore, a Kratt is a little household servant. You build
it out of whatever's lying around (straw, old tools, a broken pot), and
it comes to life to do the chores you'd rather not. It's the right name
for a machine that grows your food out of water, electricity, and your
kitchen scraps.

KrattOS is the software that runs the modern Kratt.

### What's already done

This isn't a sketch on a napkin. The software is built and tested:

- **49 passing tests** across the control loops, the safety supervisor,
  the composter logic, the recipe engine, the planner, the vision
  pipeline, and the update system.
- A **working 3D digital twin** of the whole appliance. Every shelf,
  plant, valve, pump, and probe is modeled and wired to live sensor
  data.
- **Signed offline updates**, so you upgrade the appliance by walking up
  to it with a USB stick. It never phones home.
- A **two-layer design** that keeps the real-time hardware control
  separate from the AI, so a software hiccup can't open a valve or
  switch on a heater.

The code is open and on GitHub. The part that isn't built yet, and the
part your money pays for, is the physical box.

### Not just the fancy version

The full appliance is the showpiece. But the same brain runs on a
Raspberry Pi or even a $8 microcontroller, and we want it in as many
hands as possible. So KrattOS ships in three tiers:

| Tier | What it is | Parts cost | As a kit |
|------|------------|-----------:|---------:|
| **Nano** | A small controller that clips onto a wire shelf rack you already own. ESP32 chip, on-device dashboard over its own WiFi. Light schedule, pump, moisture, safety. | ~$112 | ~$149 |
| **Lite** | A Raspberry Pi running the trimmed KrattOS, full dashboard, recipe library. You bring the rack and trays, the kit brings the brain. | ~$195 | ~$279 |
| **Full** | The finished cabinet appliance with vision AI, auto-dosing, composter, the works. | ~$2,900 | ~$4,499 |

What makes the cheap tiers possible: the cabinet, the Jetson, the
composter, and the auto-dosing rig were always the expensive parts. If
you bring a room, a wire rack, and trays (everyone has these or can get
them for under $80), the kit just ships the brain. Lights cycle, pump
runs, sensors report, dashboard tells you when to top up. That's how
most hobby hydroponics already works. KrattOS just runs it for you.

This is the part of the project we're proudest of. A serious food
appliance shouldn't cost as much as a used car to be useful.

### What this raise builds

One thing: the first working KrattOS, built and filmed proving it grows
food on its own. We're doing it in two phases so you see results fast.

- **Phase 1, the first few weeks.** A budget build on a wire rack:
  lights, pump, sensors, and the dashboard, all running offline. Enough
  to put real lettuce on camera, growing by itself.
- **Phase 2, the upgrade.** That same unit gets the AI add-on: a Jetson
  edge-AI brain, a camera watching the canopy, and the EC and pH probes
  that let the planner reason about nutrient state. The dashboard tells
  you when to top up. This proves the headline, an offline AI that
  watches the plants and runs the grow.

Where the $3,000 goes:

| What | Amount | Covers |
|------|-------:|--------|
| Phase 1 budget unit | $400 | Raspberry Pi, two moisture probes, temp/humidity sensor, pump, fan, one LED grow bar, drip manifold, trays, reservoir, controller box and wiring |
| Phase 2 AI add-on | $1,900 | Jetson Nano (used or refurbished, ~$200), IMX708 camera ($55), Atlas EC and pH probes ($128 together), three more LED bars ($90), one dosing pump for manual top-ups ($28), the rack ($60), mounting hardware, cabling, and the spare components every first build burns through |
| Seeds, nutrients, spares | $500 | Seed library, nutrient concentrate, a backup of every sensor and the pump |
| Shipping and platform fees | $200 | Getting parts here, and GoFundMe's cut |

What's NOT in this raise: the full six-channel auto-dosing rig, the
composter loop, the steel cabinet, a UL listing, anyone's salary. Those
are the next campaign, after the proof is on video. This raise covers
exactly one thing: shipping the first working KrattOS and filming it.

Anything past $3,000 goes straight to a second unit and the first
conversations with restaurants who want to test one.

---

## Reward tiers (perks)

GoFundMe doesn't run tiered rewards the way Kickstarter does, so list
these in the story and fulfill them as people opt in. These are sized
for a proof campaign: small thank-yous, plus kit pre-orders for people
who want one once it's proven. No promises that can't be kept yet.

### $10, "Cheer it on"
A real thank-you and every build update as it happens, lettuce included.

### $25, "Name on the first unit"
Your name goes on the first KrattOS we build, with a photo of it
growing. Plus the updates.

### $75, "Seed library"
A starter set of heirloom seeds for the recipes (buttercrunch, basil
genovese, mizuna, microgreens mix). Plus everything above.

### $149, "Nano kit" (pre-order)
A KrattOS Nano, shipped once the design is proven. Clips onto a wire
rack you already own: controller, relay board, pump, fan, sensors, a
12V LED grow bar, drip manifold and tubing, wiring, and the printed
box. Bring your own rack, trays, seeds, and bucket. Estimated ship:
month 6.

### $279, "Lite kit" (pre-order)
Everything in the Nano kit, plus a Raspberry Pi 4 pre-flashed with the
full dashboard and recipe library. Same self-setup on a rack you
already own. Estimated ship: month 6.

### $500, "Back the next unit"
You fund a whole second build. Your name on it, first in line for a kit
when they ship, and early access to the dashboard and the 3D twin.

---

## FAQ

**Will it actually grow enough food to matter?**
Yes. Set up for leafy greens, a four-shelf KrattOS gives you roughly 4
to 6 heads of lettuce a week on rotation. That's about $25 to $40 of
grocery value a week depending on where you live, and a single unit
covers most of a restaurant's salad and garnish needs. The full
projections are in the repo.

**Why no internet?**
Three reasons. First, privacy: your kitchen shouldn't be a data feed.
Second, reliability: an appliance that bricks when a subscription
lapses is a bad deal. Third, a lot of the people who want indoor
farming most (hospital food services, embassy kitchens, biosecurity
labs, base mess halls) literally cannot put a connected device in
their food chain. Build for them first and everyone else benefits too.

**So how do recipes and updates get in?**
On a signed USB stick that ships with your monthly seed pods, or one you
download and copy across yourself. The appliance checks the signature
before it applies anything. There's no remote way in. That's the whole
point.

**Is there a version I can actually afford?**
Yes. KrattOS Lite is the same software running on a $45 Raspberry Pi
and clipped onto a wire shelving rack you already own. Parts come to
around $195. As a pre-built kit it's $279. There's also a Nano tier
that runs on an $8 microcontroller for around $149 as a kit. You
supply the room, a rack from the hardware store, and 1020 trays. The
kit ships the brain. The full spec lives in the repo under
`docs/hardware/krattos-lite.md`.

**What if the goal isn't met?**
GoFundMe lets you keep what you raise, so every dollar still moves this
forward. Even $400 builds the phase 1 unit and gets real lettuce growing
on camera. The full $3,000 funds the AI upgrade on top, which is the part
that proves the whole idea. There's no version of this where your money
sits idle.

**What if the build hits a wall?**
The software already works. The risk is in the physical assembly, and at
this budget it's small: it's one unit on a rack, not a factory. If a
part of the build proves harder than expected, everything learned gets
published and the kit pre-orders ($149 and $279) get refunded. The seed
libraries and thank-you tiers cost almost nothing and ship regardless.

**Is it open source?**
The firmware, control loops, schemas, and update system are MIT
licensed. The recipe library and the fleet software (once it exists)
are commercial. That mix is what lets a hardware company stay alive
without quietly selling your data down the line.

**Where does my money go?**
Into the project's business account, which an attorney is setting up
alongside this campaign. You'll get a contribution receipt by email
right away. These aren't tax-deductible, since this isn't a registered
non-profit.

**Who's behind this?**
The project, not the people. KrattOS is open on GitHub, so if you want
proof, the commit history is right there. Go read it before you back it.

**How do I follow along?**
Updates post right here on the campaign page as the build happens, from
first parts to first harvest. The code keeps shipping at
[github.com/yourname/kratt] in the meantime.

---

## Update schedule (post one every week or two)

Draft these now and queue them up:

1. **Day 0, launch.** "We're live. Here's the software running and what
   the $3,000 builds."
2. **Week 1, parts arrive.** The phase 1 kit on the bench, the rack going
   together.
3. **Week 2, it's alive.** The dashboard running offline, lights cycling,
   pump kicking on, sensors reporting.
4. **Week 3, seeds in.** Trays planted, first sprouts on camera.
5. **Week 5, the AI upgrade.** Phase 2: the Jetson and camera go in, the
   vision pipeline watching the canopy for the first time.
6. **Week 7, growing on its own.** Time-lapse of the unit running the
   grow with nobody touching it.
7. **Week 9, first harvest.** The money shot. Lettuce on a plate,
   dressing optional. Proof.

---

## Social one-liners (for sharing)

- "An indoor farm that grows your salad and runs zero cloud. Crowdfunding
  the box now. KrattOS."
- "Nobody's building this: an AI farm for people who don't want their
  kitchen on the internet."
- "Years of code. 49 passing tests. Zero cloud. Time to put it in a
  cabinet. Meet KrattOS."
- "Named after the Estonian house spirit that does your chores out of
  old junk. This one grows lettuce."
- "Same KrattOS, $149 version: bring a wire rack, ship you the brain.
  Anyone can grow food."
