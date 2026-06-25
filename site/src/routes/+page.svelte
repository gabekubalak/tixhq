<script>
  import ScrollScaffold from "$lib/scroll/ScrollScaffold.svelte";
  import ScrubbedSequence from "$lib/scroll/ScrubbedSequence.svelte";
  import ColdOpen from "$lib/scroll/ColdOpen.svelte";

  // All overlay copy: no em-dashes anywhere (voice rule, enforced by
  // scripts/check-dashes.mjs).
  const cabinetCopy = [
    {
      at: 0.1,
      align: "center",
      title: "Meet the appliance",
      body: "About the size of a fridge. Four lit shelves, a composter in the base.",
    },
    {
      at: 0.62,
      align: "left",
      title: "The lights come on",
      body: "Each shelf runs its own schedule, tuned to the crop.",
    },
    {
      at: 0.95,
      align: "left",
      title: "On its own",
      body: "No internet. No subscription. You give it water and power.",
    },
  ];

  const loopCopy = [
    {
      at: 0.08,
      align: "left",
      title: "The loop starts with scraps",
      body: "Kitchen waste goes into the composter at the base.",
    },
    {
      at: 0.32,
      align: "left",
      title: "It heats itself clean",
      body: "Thermophilic composting holds 55C for 72 hours and kills the pathogens. No heater. The pile does it.",
    },
    {
      at: 0.55,
      align: "right",
      title: "A gate, not a guess",
      body: "The nutrient only flows once that kill step is verified.",
    },
    {
      at: 0.88,
      align: "center",
      title: "You take out food",
      body: "Composted nutrient, mixed with water, feeds the greens above.",
    },
  ];

  const greenhouseCopy = [
    {
      at: 0.12,
      align: "left",
      title: "Same mind, bigger body",
      body: "A 14 by 30 ft hoop house. Six NFT beds. The same KrattOS running it.",
    },
    {
      at: 0.55,
      align: "left",
      title: "No hand-watering",
      body: "A composter-fed recirculation manifold runs every bed. You walk in to pick.",
    },
    {
      at: 0.92,
      align: "right",
      title: "From $1,450 in parts",
      body: "Buildable spec, open in the repo.",
    },
  ];
</script>

<svelte:head>
  <title>KrattOS, the offline AI farm appliance</title>
</svelte:head>

<ScrollScaffold>
  <!-- Beat 1: cold open. The mark draws, the leaves unfurl, the
       wordmark resolves, the opening line lands. -->
  <ColdOpen pin="+=120%" />

  <!-- Beat 2: the myth. Plain typography, no 3D, parallax-free. -->
  <section class="myth">
    <div class="container">
      <p class="kicker">Why "Kratt"</p>
      <p class="copy">
        In Estonian folklore, a <strong>Kratt</strong> is a little household
        servant. You build it out of whatever is lying around: straw, old
        tools, a broken pot. It comes to life to do the chores you would
        rather not.
      </p>
      <p class="copy small">
        KrattOS is the software that runs the modern Kratt: a machine that
        grows your food out of water, electricity, and your kitchen scraps.
      </p>
    </div>
  </section>

  <!-- Beat 3: the cabinet arrives, shelves light. -->
  <ScrubbedSequence scene="cabinet" eager={true} copy={cabinetCopy} pin="+=150%" />

  <!-- Beat 5: two brains, one rule. Typography over a paper field. -->
  <section class="two-brains">
    <div class="container">
      <p class="kicker">Two brains, one rule</p>
      <div class="brains">
        <div class="brain">
          <h3>The safety brain</h3>
          <p>
            A small microcontroller that watches the rails. It cuts power
            on a leak, a runaway probe, an over-temperature, or a heartbeat
            loss. It does not need the rest of the system to function.
          </p>
        </div>
        <div class="brain ai">
          <h3>The thinking brain</h3>
          <p>
            A local AI that watches the canopy, follows the recipe, and
            decides when to water, light, and dose. It runs offline on the
            appliance.
          </p>
        </div>
      </div>
      <p class="rule">
        Software can think. Hardware keeps you safe. The line between them
        is real, and the thinking side can never cross it.
      </p>
    </div>
  </section>

  <!-- Beat 4: the closed compost-to-greens loop. -->
  <ScrubbedSequence scene="loop" copy={loopCopy} pin="+=170%" />

  <!-- Beat 6: one mind, many bodies. Greenhouse scrub. -->
  <section class="bridge">
    <div class="container">
      <p class="kicker">One mind, many bodies</p>
      <p class="copy">
        The same KrattOS runs on a clip-on board, a Raspberry Pi, the full
        cabinet, and out in a greenhouse. Whatever you bring, it reads its
        site profile and adapts.
      </p>
    </div>
  </section>

  <ScrubbedSequence scene="greenhouse" copy={greenhouseCopy} pin="+=150%" />

  <noscript>
    <p style="text-align:center;padding:2rem 6vw;">
      This page uses scroll-driven 3D. For the full walkthrough with
      JavaScript off, see the <a href="/twin">cabinet twin</a> and the
      <a href="/system">system overview</a>.
    </p>
  </noscript>

  <!-- The rest of the page: tiers, the pitch, the mission, the CTA. -->
  <section class="section sash">
    <div class="container">
      <h2>Three ways in</h2>
      <p class="lede">
        Same software, three form factors. Bring whatever you already have.
      </p>
      <div class="tiers">
        <article class="tier">
          <h3>Nano</h3>
          <div class="price">~$149 <span>kit</span></div>
          <p>A small controller you clip onto a wire shelf rack you already own. Lights, pump, sensors, and a simple dashboard on its own WiFi.</p>
          <ul>
            <li>ESP32 brain</li>
            <li>4 sensors</li>
            <li>Self-setup</li>
          </ul>
        </article>
        <article class="tier highlight">
          <h3>Lite</h3>
          <div class="price">~$279 <span>kit</span></div>
          <p>The full KrattOS dashboard and recipe library on a Raspberry Pi. Clips onto a rack, opens on your phone, runs offline.</p>
          <ul>
            <li>Raspberry Pi 4</li>
            <li>Full dashboard</li>
            <li>Recipe library</li>
          </ul>
          <div class="ribbon">Most popular</div>
        </article>
        <article class="tier">
          <h3>Full</h3>
          <div class="price">~$4,499</div>
          <p>The finished cabinet appliance. Vision AI watching the canopy, auto-dosing, and a composter that turns scraps into nutrient.</p>
          <ul>
            <li>Jetson edge-AI</li>
            <li>Composter loop</li>
            <li>Auto-dosing</li>
          </ul>
        </article>
      </div>
      <div class="tier-cta">
        <a class="btn btn-secondary" href="/build">Compare the tiers</a>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="mission">
        <h2>Why we're building this</h2>
        <p>
          Fresh food is getting further out of reach. Produce is expensive,
          it travels thousands of miles to wilt on a shelf, and the people
          who most need good nutrition are the ones with the least time and
          money to chase it. A working garden shouldn't require a backyard,
          a flexible schedule, or money to spare.
        </p>
        <p>
          So we're making the opposite: a grower that runs itself, costs as
          little as possible, and belongs entirely to the person who owns it.
          No subscription to lapse. No company that can switch it off. The
          cheapest version is under $150 and clips onto a shelf you already
          have. The goal is simple: <strong>put reliable, fresh food within
          reach of anyone, regardless of their schedule or their budget.</strong>
        </p>
      </div>
    </div>
  </section>

  <section class="section sash dark">
    <div class="container center">
      <h2>Help build the first one</h2>
      <p class="lede" style="margin: 0 auto;">
        The software is done and open. The next step is getting the first
        affordable units into real kitchens. That's what we're raising for,
        and where it starts.
      </p>
      <div class="cta-row">
        <a class="btn brass" href="/pitch">Back the mission</a>
        <a class="btn btn-secondary on-dark" href="https://github.com" target="_blank" rel="noreferrer">Open on GitHub</a>
      </div>
    </div>
  </section>
</ScrollScaffold>

<style>
  /* Typography-only beats between the scrubs. They breathe; they don't
     compete with the 3D for attention. */
  .myth, .two-brains, .bridge {
    padding: clamp(6rem, 14vh, 11rem) 0;
    background: var(--paper);
  }
  .myth { background: linear-gradient(180deg, var(--paper) 0%, #f9f4e6 100%); }
  .bridge { background: linear-gradient(180deg, #f9f4e6 0%, var(--paper) 100%); }
  .two-brains { background: var(--paper-warm); }

  .myth .container,
  .two-brains .container,
  .bridge .container {
    text-align: center;
  }
  .kicker {
    font-family: "Space Grotesk", system-ui, sans-serif;
    font-weight: 600;
    font-size: 0.85rem;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--brass);
    margin: 0 0 1.4rem;
  }
  .myth .copy, .bridge .copy {
    font-family: "Space Grotesk", system-ui, sans-serif;
    font-weight: 500;
    font-size: clamp(1.4rem, 2.4vw, 2rem);
    line-height: 1.4;
    color: var(--ink);
    margin: 0 auto 1rem;
    max-width: 36ch;
  }
  .myth .copy.small {
    font-weight: 400;
    font-size: clamp(1.05rem, 1.5vw, 1.25rem);
    color: #4a4a45;
    max-width: 48ch;
  }
  .myth strong { color: var(--evergreen); }

  .brains {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin: 2rem auto 1.5rem;
    max-width: 920px;
  }
  @media (max-width: 760px) {
    .brains { grid-template-columns: 1fr; }
  }
  .brain {
    background: var(--paper);
    border-radius: 14px;
    padding: 1.6rem 1.5rem;
    text-align: left;
    border: 1px solid #DDD3BB;
  }
  .brain h3 {
    color: var(--evergreen);
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
  }
  .brain p {
    color: #4a4a45;
    line-height: 1.55;
    margin: 0;
  }
  .brain.ai {
    border-color: var(--brass);
  }
  .brain.ai h3 { color: var(--ink); }
  .rule {
    font-family: "Space Grotesk", system-ui, sans-serif;
    font-weight: 500;
    font-size: clamp(1.15rem, 1.8vw, 1.4rem);
    color: var(--ink);
    max-width: 38ch;
    margin: 2rem auto 0;
    line-height: 1.45;
  }

  /* Existing sections, unchanged in look. */
  .sash { background: var(--paper-warm); }
  .sash.dark { background: var(--evergreen); color: var(--paper); }
  .sash.dark h2, .sash.dark .lede { color: var(--paper); }
  .sash.dark .lede { color: rgba(244,241,234,0.85); }
  .center { text-align: center; }
  .center .btn { margin-top: 1.5rem; }
  .btn.brass { background: var(--brass); color: #fff; }
  .btn.brass:hover { background: #a17e21; }
  .btn-secondary.on-dark {
    color: var(--paper);
    border-color: var(--paper);
  }
  .btn-secondary.on-dark:hover {
    background: var(--paper);
    color: var(--evergreen);
  }
  .cta-row {
    display: flex;
    gap: 0.8rem;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 1.5rem;
  }

  .tiers {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
    margin: 2rem 0 1rem;
  }
  @media (max-width: 860px) {
    .tiers { grid-template-columns: 1fr; }
  }
  .tier {
    position: relative;
    background: var(--paper);
    border: 1px solid #DDD3BB;
    border-radius: 14px;
    padding: 1.6rem 1.5rem;
  }
  .tier.highlight {
    border-color: var(--evergreen);
    background: #FBF7EB;
    box-shadow: 0 10px 30px -15px rgba(46,90,65,0.35);
  }
  .tier .ribbon {
    position: absolute; top: -10px; right: 16px;
    background: var(--brass); color: #fff;
    font-size: .75rem; font-weight: 600;
    padding: .25rem .6rem; border-radius: 999px;
    letter-spacing: .02em;
  }
  .tier h3 { color: var(--evergreen); }
  .tier .price { font-size: 1.6rem; font-weight: 700; color: var(--ink); margin: .25rem 0 .5rem; }
  .tier .price span { font-size: .85rem; color: #6c6862; font-weight: 500; margin-left: .25rem; }
  .tier p { line-height: 1.5; color: #4a4a45; }
  .tier ul { padding-left: 1.1rem; margin: .75rem 0 0; color: #4a4a45; font-size: .92rem; }
  .tier-cta { text-align: center; margin-top: 1rem; }

  .mission {
    max-width: 760px;
    margin: 0 auto;
    text-align: center;
  }
  .mission p {
    font-size: clamp(1.05rem, 1.5vw, 1.25rem);
    line-height: 1.65;
    color: #44443f;
    margin: 0 auto 1.2rem;
  }
  .mission strong { color: var(--evergreen); }
</style>
