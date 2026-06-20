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

**$45,000.** That covers three working prototypes, the provisional
patent, and the first ten units going out to restaurants who'll test
them in a real kitchen.

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

### Where your money goes

| What | Amount | Covers |
|------|-------:|--------|
| 3 working prototypes | $18,000 | Edge-AI boards, microcontrollers, EC/pH probes, pumps, LED panels, cabinet fabrication, food-grade plumbing |
| First production cabinets | $12,000 | Tooling deposit at a US contract manufacturer for a 10-unit run |
| 10 pilot installs at restaurants | $9,000 | Free units, six months of free seed pods, on-site setup and training |
| Provisional patent and IP | $2,500 | USPTO filing, a freedom-to-operate check, the "KrattOS" trademark |
| Recipe development | $3,500 | Crop scientists tuning the lettuce, basil, microgreens, and strawberry recipes against real harvest data |

Anything past the $45k goal goes straight into building more pilot
units. Every extra $4,500 puts one more KrattOS in a restaurant or
school kitchen for six months, free.

---

## Reward tiers (perks)

GoFundMe doesn't run tiered rewards the way Kickstarter does, so list
these in the story and fulfill them yourself as people opt in. (If you
move to Kickstarter later, they lift straight over.)

### $25, "Mark on the wall"
Your name on a brass plate inside the first production KrattOS, mounted
by the composter door. We'll email you a photo of it installed.

### $75, "Seed library"
A starter set of heirloom seeds for the recipes we're tuning
(buttercrunch, basil genovese, mizuna, microgreens mix). Includes the
photo from the $25 tier.

### $250, "Early access"
Hands-on access to the dashboard and the 3D twin once we're running,
plus monthly behind-the-scenes updates from the workshop. Includes
everything above.

### $149, "Nano kit"
A pre-built KrattOS Nano shipped to you. Clips onto a wire shelf rack
you already own. ESP32 controller, relay board, pump, fan, two
moisture probes, temperature and humidity sensor, leak sensor, water
float, a 12V LED grow bar, drip manifold and tubing, all the wiring
and the printed controller box. Bring your own rack, trays, seeds,
and bucket. Estimated ship: month 6.

### $279, "Lite kit"
A pre-built KrattOS Lite. Everything in the Nano kit, plus a
Raspberry Pi 4 pre-flashed with the trimmed KrattOS, the full
dashboard, the recipe library, and the local logging. Same self-setup
on a rack you already own. Estimated ship: month 6.

### $1,500, "Founding owner"
One of the first ten units off the line, shipped to you at half the
eventual $4,499 retail price. Estimated ship: month 8. Limited to 10
backers. This is the big one. It's literally how the first units get
into the world.

### $5,000, "Restaurant install"
Reserve one of the pilot kitchen installs. We'll deliver and set up a
KrattOS in your restaurant, train your team, and tune the recipes to
your menu over the first three months. Limited to 3 backers.

### $25,000, "Founding patron"
Fund a whole pilot site at a school, food bank, or non-profit you care
about (we'll help you pick one if you don't have it in mind). Your name,
or your foundation's, goes on the plaque at that site, and you get a
unit of your own. Limited to 1 backer.

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
GoFundMe lets you keep what you raise, so every dollar still moves the
project forward. $20k builds one prototype and files the patent. $30k
covers the full prototype run. The full $45k is what unlocks the
restaurant pilots, and the pilots are what turn this from a project into
a business.

**What if the project can't finish?**
The real risk is the physical side: the cabinet, the plumbing, and the
UL safety listing. None of those are done yet. If the project hits a
wall it can't get past, everything learned gets published, the build
documentation goes fully open, and the physical reward tiers ($1,500
and up) get refunded proportionally. The brass plates and seed
libraries ship no matter what, since they cost almost nothing.

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
Updates post here on the campaign page, every week or two once we're
past the first $5k. The code keeps shipping at
[github.com/yourname/kratt] in the meantime.

---

## Update schedule (post one every week or two)

Draft these now and queue them up:

1. **Day 0, launch.** "We're live. Here's the demo and what the first
   $5k unlocks."
2. **Week 2, workshop tour.** Photos of the bench, the boards, the first
   microcontroller blinking to life.
3. **Week 4, first sprouts.** Time-lapse of lettuce going from seed to
   first true leaf.
4. **Week 6, software walkthrough.** A 90-second clip of the dashboard
   and the 3D twin updating in real time.
5. **Week 8, composter trial.** First scraps going in, temperature
   climbing into the hot phase.
6. **Week 10, patent filed.** A shot of the USPTO receipt.
7. **Week 12, first harvest.** The money shot. Lettuce on a plate,
   dressing optional.

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
