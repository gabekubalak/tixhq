<svelte:head><title>KrattOS - Back the first proof unit</title></svelte:head>

<section class="hero">
  <div class="container">
    <span class="kicker">Live campaign</span>
    <h1>Put fresh food within everyone's reach.</h1>
    <p class="lede">
      The software is built and open. The next step is getting the first
      affordable, self-running grower into a real kitchen and proving it
      feeds people. We're raising $3,000 to build that first unit, and it's
      where the mission starts.
    </p>
    <div class="cta">
      <a class="btn brass" href="https://www.gofundme.com/" target="_blank" rel="noreferrer">Back on GoFundMe</a>
      <a class="btn btn-secondary" href="/twin">See what gets built</a>
    </div>
  </div>
</section>

<section class="section mission-band">
  <div class="container">
    <h2>What we're actually doing</h2>
    <p class="lede">
      Good food is getting more expensive and harder to reach, and the
      people who most need real nutrition have the least time and money to
      chase it. KrattOS is a grower that runs itself, costs as little as
      possible, and belongs entirely to the person who owns it. The aim is
      to make a working garden possible for anyone, no matter their work
      schedule or their budget, as one small, practical answer to food
      insecurity and malnutrition.
    </p>
  </div>
</section>

<section class="section">
  <div class="container">
    <h2>What this raise builds</h2>
    <p class="lede">
      The first working KrattOS, built in two phases so backers see real
      food fast.
    </p>

    <div class="phases">
      <article>
        <h3>Phase 1, the first few weeks</h3>
        <p>A budget build on a wire rack. Raspberry Pi, lights, pump, sensors, and the dashboard, all running offline. Enough to put real lettuce on camera, growing by itself.</p>
        <span class="tag">~$400</span>
      </article>
      <article>
        <h3>Phase 2, the AI add-on</h3>
        <p>The same unit gets the Jetson edge-AI brain, a camera watching the canopy, and the EC and pH probes. The dashboard tells you when to top up. This proves the headline: an offline AI that watches the plants and runs the grow.</p>
        <span class="tag">~$1,900</span>
      </article>
    </div>

    <div class="budget">
      <h3>Where the $3,000 goes</h3>
      <table>
        <tr><td>Phase 1 budget unit</td><td class="num">$400</td><td>Raspberry Pi, sensors, pump, fan, one LED bar, drip manifold, trays, reservoir</td></tr>
        <tr><td>Phase 2 AI add-on</td><td class="num">$1,900</td><td>Used Jetson Nano, camera, EC and pH probes, more LEDs, a dosing pump for manual top-ups, the rack, mounting hardware</td></tr>
        <tr><td>Seeds, nutrients, spares</td><td class="num">$500</td><td>Seed library, nutrient concentrate, backup parts</td></tr>
        <tr><td>Shipping and platform fees</td><td class="num">$200</td><td>Parts shipping, GoFundMe's cut</td></tr>
        <tr class="total"><td>Total</td><td class="num">$3,000</td><td></td></tr>
      </table>
      <div class="notin">
        <strong>What is NOT in this raise:</strong> the full six-channel auto-dosing rig, the composter loop, the steel cabinet, a UL listing, anyone's salary. Those are the next campaign, after the proof is on video.
      </div>
    </div>
  </div>
</section>

<section class="section bg-warm">
  <div class="container">
    <h2>The Kratt</h2>
    <p class="lede">
      In Estonian folklore, a Kratt is a little household servant. You
      build it out of whatever's lying around (straw, old tools, a broken
      pot), and it comes to life to do the chores you'd rather not. It's
      the right name for a machine that grows your food out of water,
      electricity, and your kitchen scraps.
    </p>
    <p class="lede">KrattOS is the software that runs the modern Kratt.</p>
  </div>
</section>

<section class="section">
  <div class="container">
    <h2>What's already done</h2>
    <p class="lede">This isn't a sketch on a napkin.</p>
    <div class="grid">
      <div class="proof">
        <strong>49</strong><span>passing tests in the public repo, covering the control loops, the safety supervisor, the composter logic, the recipe engine, the planner, and the update system.</span>
      </div>
      <div class="proof">
        <strong>Working 3D twin</strong><span>of the appliance. Every shelf, plant, valve, pump, and probe modeled. The pitch site you're on uses it.</span>
      </div>
      <div class="proof">
        <strong>Signed offline updates</strong><span>so the appliance can be upgraded by walking up with a USB stick. No phone-home.</span>
      </div>
      <div class="proof">
        <strong>Two-layer safety</strong><span>that keeps real-time hardware control separate from the AI. A software hiccup can't open a valve or switch on a heater.</span>
      </div>
    </div>
  </div>
</section>

<section class="section faq">
  <div class="container">
    <h2>Common questions</h2>

    <details>
      <summary>Will it actually grow enough food to matter?</summary>
      <p>Yes. Set up for leafy greens, a four-shelf KrattOS gives you roughly 4 to 6 heads of lettuce a week on rotation. That's $25 to $40 of grocery value a week depending on where you live, and a single unit covers most of a restaurant's salad and garnish needs.</p>
    </details>

    <details>
      <summary>Is there a version I can actually afford?</summary>
      <p>Yes. KrattOS Lite is the same software on a $45 Raspberry Pi clipped onto a wire rack you already own. Around $195 in parts or $279 as a pre-built kit. There's also a Nano tier around $149. You supply the room, a rack, and trays. The kit ships the brain.</p>
    </details>

    <details>
      <summary>Why no internet?</summary>
      <p>Privacy, reliability, and safety. Your kitchen shouldn't be a data feed. Appliances that brick when subscriptions lapse are a bad deal. And many of the people who want indoor farming most (hospital food services, biosecurity labs) literally cannot put a connected device in their food chain. Build for them first.</p>
    </details>

    <details>
      <summary>What if the goal isn't met?</summary>
      <p>GoFundMe lets you keep what you raise, so every dollar still moves this forward. Even $400 builds the phase 1 unit and gets real lettuce growing on camera. The full $3,000 funds the AI upgrade on top. There's no version of this where the money sits idle.</p>
    </details>

    <details>
      <summary>What if the build hits a wall?</summary>
      <p>The software already works. The risk is in the physical assembly, and at this budget it's small: one unit on a rack, not a factory. If part of the build proves harder than expected, everything learned gets published and the kit pre-orders get refunded.</p>
    </details>

    <details>
      <summary>Is it open source?</summary>
      <p>The firmware, control loops, and update system are open. The recipe library and the fleet software are commercial. That mix lets a hardware company stay alive without quietly selling your data down the line.</p>
    </details>
  </div>
</section>

<section class="section center cta-final">
  <div class="container">
    <h2>One small ask, in service of something serious.</h2>
    <p class="lede" style="margin: 0 auto;">
      Anyone can back this. Tier amounts run from $10 to $279 (the Lite
      kit pre-order). Even a share helps.
    </p>
    <div class="cta">
      <a class="btn brass" href="https://www.gofundme.com/" target="_blank" rel="noreferrer">Back on GoFundMe</a>
    </div>
  </div>
</section>

<style>
  .hero { background: linear-gradient(180deg, var(--evergreen), #23463a); color: var(--paper); padding: 4rem 0 3.5rem; }
  .hero h1 { color: var(--paper); }
  .hero .lede { color: rgba(244,241,234,0.85); }
  .hero .kicker { display: inline-block; background: var(--brass); color: #fff; padding: .3rem .8rem; border-radius: 999px; font-size: .8rem; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; margin-bottom: 1rem; }
  .hero .cta { display: flex; gap: .75rem; margin-top: 1.5rem; flex-wrap: wrap; }
  .btn.brass { background: var(--brass); color: #fff; }
  .btn.brass:hover { background: #a17e21; }
  .hero .btn-secondary { color: var(--paper); border-color: rgba(244,241,234,0.5); }
  .hero .btn-secondary:hover { background: rgba(244,241,234,0.15); border-color: var(--paper); color: var(--paper); }

  .bg-warm { background: var(--paper-warm); }
  .center { text-align: center; }
  .center .cta { display: flex; gap: .75rem; justify-content: center; margin-top: 1.5rem; flex-wrap: wrap; }
  .cta-final { padding-top: 2rem; padding-bottom: 4rem; }

  .phases { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin: 1.5rem 0 2.5rem; }
  @media (max-width: 760px) { .phases { grid-template-columns: 1fr; } }
  .phases article { background: var(--paper-warm); padding: 1.4rem; border-radius: 12px; position: relative; }
  .phases h3 { color: var(--evergreen); }
  .phases p { color: #4a4a45; line-height: 1.55; margin-bottom: .5rem; }
  .phases .tag { display: inline-block; background: var(--evergreen); color: var(--paper); padding: .2rem .6rem; border-radius: 999px; font-size: .8rem; font-weight: 600; }

  .budget table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
  .budget table td { padding: .75rem 1rem .75rem 0; border-bottom: 1px solid rgba(0,0,0,0.07); color: #4a4a45; vertical-align: top; }
  .budget table td:first-of-type { font-weight: 600; color: var(--ink); white-space: nowrap; }
  .budget table tr.total td { font-weight: 700; color: var(--evergreen); border-top: 2px solid var(--evergreen); padding-top: 1rem; border-bottom: none; }
  .budget .num { font-variant-numeric: tabular-nums; white-space: nowrap; width: 80px; }
  .budget .notin { background: rgba(194,153,46,0.12); border-left: 3px solid var(--brass); padding: 1rem 1.2rem; margin-top: 1.5rem; border-radius: 4px; line-height: 1.55; color: #4a4a45; }

  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.5rem; }
  @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
  .proof { background: var(--paper-warm); border-radius: 12px; padding: 1.4rem; }
  .proof strong { display: block; font-size: 1.4rem; color: var(--evergreen); margin-bottom: .35rem; }
  .proof span { color: #4a4a45; line-height: 1.55; }

  .faq details { background: var(--paper); border: 1px solid #DDD3BB; border-radius: 10px; padding: .9rem 1.2rem; margin-bottom: .6rem; }
  .faq details[open] { border-color: var(--evergreen); }
  .faq summary { font-weight: 600; color: var(--ink); cursor: pointer; list-style: none; padding-right: 1rem; }
  .faq summary::-webkit-details-marker { display: none; }
  .faq summary::after { content: "+"; float: right; color: var(--evergreen); font-weight: 400; font-size: 1.3rem; line-height: 1; }
  .faq details[open] summary::after { content: "-"; }
  .faq p { margin: .8rem 0 0; color: #4a4a45; line-height: 1.6; }

  .mission-band { background: var(--paper-warm); }
  .mission-band .lede { max-width: 70ch; }
</style>
