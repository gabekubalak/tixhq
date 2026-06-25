<script>
  import ScrollScaffold from "$lib/scroll/ScrollScaffold.svelte";
  import ScrubbedSequence from "$lib/scroll/ScrubbedSequence.svelte";

  // Copy overlays keyed to scroll progress through each scene. `at` is the
  // 0..1 point in the pinned scroll where the line is fully lit; it fades
  // on either side. No em-dashes anywhere (voice rule, enforced by
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
</script>

<svelte:head>
  <title>KrattOS, the offline AI farm appliance</title>
</svelte:head>

<ScrollScaffold>
  <!-- Intro -->
  <section class="intro">
    <div class="container">
      <h1>Anyone can grow their own food. KrattOS makes it automatic.</h1>
      <p class="lede">
        Most people can't keep a garden alive, not for lack of wanting to,
        but for lack of time. KrattOS is an appliance that does the work. You
        give it water and power. It gives you fresh food, week after week.
      </p>
      <p class="scroll-hint">Scroll</p>
    </div>
  </section>

  <!-- Beat 3: the cabinet arrives, shelves light -->
  <ScrubbedSequence scene="cabinet" eager={true} copy={cabinetCopy} pin="+=240%" />

  <!-- Beat 4: the closed compost-to-greens loop -->
  <ScrubbedSequence scene="loop" copy={loopCopy} pin="+=260%" />

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
    <div class="container two">
      <div>
        <h2>It does the part you don't have time for.</h2>
        <p>
          Four lit shelves grow lettuce, herbs, and microgreens on a rotation.
          Probes watch moisture, pH, and nutrient strength. A small on-board
          brain follows a recipe and adjusts the lights and water by itself.
          A composter at the base turns your kitchen scraps into the nutrient
          that feeds the plants above.
        </p>
        <p>
          You don't water it on a schedule. You don't learn hydroponics. You
          don't babysit it between long shifts. It just keeps producing, and
          tells you when there's food to pick.
        </p>
        <a class="btn btn-secondary" href="/system">See the system</a>
      </div>
      <div class="claims">
        <div class="claim">
          <strong>4 to 6 heads</strong>
          <span>of fresh greens a week, hands-off</span>
        </div>
        <div class="claim">
          <strong>From $149</strong>
          <span>so cost is never the barrier</span>
        </div>
        <div class="claim">
          <strong>Zero</strong>
          <span>cloud, subscriptions, or green thumb</span>
        </div>
        <div class="claim">
          <strong>Open</strong>
          <span>source, so it can't be taken away</span>
        </div>
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
      <a class="btn brass" href="/pitch">Back the mission</a>
    </div>
  </section>
</ScrollScaffold>

<style>
  .intro {
    min-height: 92vh;
    display: flex;
    align-items: center;
    background: linear-gradient(180deg, #faf6eb 0%, var(--paper) 100%);
  }
  .intro h1 {
    color: var(--ink);
    font-size: clamp(2rem, 5vw, 3.6rem);
    max-width: 18ch;
  }
  .intro .lede {
    margin-top: 1.2rem;
  }
  .scroll-hint {
    margin-top: 3rem;
    font-family: "Space Grotesk", system-ui, sans-serif;
    font-size: 0.85rem;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: #8a8478;
    animation: bob 2s ease-in-out infinite;
  }
  @keyframes bob {
    0%, 100% { transform: translateY(0); opacity: 0.6; }
    50% { transform: translateY(6px); opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .scroll-hint { animation: none; }
  }

  .sash { background: var(--paper-warm); }
  .sash.dark { background: var(--evergreen); color: var(--paper); }
  .sash.dark h2, .sash.dark .lede { color: var(--paper); }
  .sash.dark .lede { color: rgba(244,241,234,0.85); }
  .center { text-align: center; }
  .center .btn { margin-top: 1.5rem; }
  .btn.brass { background: var(--brass); color: #fff; }
  .btn.brass:hover { background: #a17e21; }

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

  .two {
    display: grid;
    grid-template-columns: 1.1fr .9fr;
    gap: 3rem;
    align-items: center;
  }
  @media (max-width: 760px) {
    .two { grid-template-columns: 1fr; }
  }
  .two p { line-height: 1.6; color: #4a4a45; margin-bottom: 1rem; }
  .claims {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .claim {
    background: var(--paper-warm);
    border-radius: 12px;
    padding: 1.25rem;
  }
  .claim strong {
    display: block;
    color: var(--evergreen);
    font-size: 2rem;
    font-weight: 700;
    line-height: 1;
    margin-bottom: .35rem;
  }
  .claim span { color: #4a4a45; font-size: .9rem; line-height: 1.4; display: block; }

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
