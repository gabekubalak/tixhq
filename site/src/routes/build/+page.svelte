<svelte:head><title>KrattOS - Three ways to build one</title></svelte:head>

<section class="section">
  <div class="container">
    <h1>Three ways to build one.</h1>
    <p class="lede">
      The full appliance is the showpiece. But the same brain runs on a
      Raspberry Pi, or on an $8 microcontroller. So KrattOS comes in three
      sizes, and you bring whatever you already have.
    </p>
  </div>
</section>

<section class="section tiers-section">
  <div class="container">
    <div class="tiers">
      <article class="tier nano">
        <header>
          <h2>Nano</h2>
          <div class="price">~$149 <span>as a kit</span></div>
          <p>The absolute floor. A controller you clip onto a wire shelf rack you already own.</p>
        </header>
        <ul>
          <li><strong>Brain</strong>: ESP32-S3 microcontroller</li>
          <li><strong>Lights</strong>: schedule for any 12V grow bar</li>
          <li><strong>Pump</strong>: 12V submersible, duty-cycled</li>
          <li><strong>Sensors</strong>: moisture, temp/humidity, leak, float</li>
          <li><strong>UI</strong>: simple dashboard over its own WiFi</li>
          <li><strong>Bring your own</strong>: rack, trays, seeds, bucket</li>
        </ul>
        <div class="for">
          <strong>For:</strong> students, hackers, anyone who wants real food automation for less than the price of a nice meal.
        </div>
      </article>

      <article class="tier lite highlight">
        <header>
          <h2>Lite</h2>
          <div class="price">~$279 <span>as a kit</span></div>
          <p>The full KrattOS dashboard and recipe library on a Pi. Self-setup on a rack you already own.</p>
        </header>
        <ul>
          <li><strong>Brain</strong>: Raspberry Pi 4 (2GB)</li>
          <li><strong>Lights</strong>: schedule plus per-shelf controls</li>
          <li><strong>Pump</strong>: 12V with moisture-driven watering</li>
          <li><strong>Sensors</strong>: all of Nano, plus a humidity controller</li>
          <li><strong>UI</strong>: full dashboard, recipe library, 3D twin</li>
          <li><strong>Updates</strong>: signed USB bundles, no internet</li>
        </ul>
        <div class="for">
          <strong>For:</strong> households, restaurants, schools. The sweet spot for almost anyone who wants real food coming out of their kitchen.
        </div>
        <span class="ribbon">Most popular</span>
      </article>

      <article class="tier full">
        <header>
          <h2>Full</h2>
          <div class="price">~$4,499 <span>finished appliance</span></div>
          <p>The finished cabinet. Vision AI, auto-dosing, composter, the works.</p>
        </header>
        <ul>
          <li><strong>Brain</strong>: NVIDIA Jetson Orin Nano edge-AI</li>
          <li><strong>Vision</strong>: a camera per cabinet watching the canopy</li>
          <li><strong>Auto-dosing</strong>: EC, pH, six base nutrient channels</li>
          <li><strong>Composter</strong>: scraps in, slurry feeds the plants</li>
          <li><strong>Cabinet</strong>: powder-coated steel, oak trim, glass door</li>
          <li><strong>Safety</strong>: hardware contactor, watchdog, E-stop</li>
        </ul>
        <div class="for">
          <strong>For:</strong> restaurants that want a salad and garnish program on autopilot, biosecurity-sensitive food services, prosumer kitchens.
        </div>
      </article>
    </div>
  </div>
</section>

<section class="section bg-warm">
  <div class="container">
    <h2>Why the cheap tiers are even possible</h2>
    <p class="lede">
      The expensive parts of the full appliance are the cabinet, the
      Jetson, the composter, and the auto-dosing rig. Lite and Nano drop
      all of those. The grower brings a wire rack from the hardware
      store and the kit ships the brain.
    </p>

    <div class="cost-breakdown">
      <div class="cost">
        <h3>The full appliance, broken down</h3>
        <table>
          <tr><td>Compute and control</td><td class="num">$667</td></tr>
          <tr><td>Sensors</td><td class="num">$248</td></tr>
          <tr><td>Actuators and plumbing</td><td class="num">$911</td></tr>
          <tr><td>Composter subsystem</td><td class="num">$225</td></tr>
          <tr><td>Cabinet and enclosure</td><td class="num">$519</td></tr>
          <tr><td>Power</td><td class="num">$81</td></tr>
          <tr class="total"><td>Total parts</td><td class="num">~$2,650</td></tr>
        </table>
      </div>
      <div class="cost">
        <h3>What Lite drops, Lite saves</h3>
        <ul class="drop">
          <li><span>Steel cabinet</span><span class="num">-$519</span></li>
          <li><span>Jetson brain (Pi instead)</span><span class="num">-$455</span></li>
          <li><span>Composter subsystem</span><span class="num">-$225</span></li>
          <li><span>Auto-dosing pumps and probes</span><span class="num">-$296</span></li>
          <li><span>Some power and packaging</span><span class="num">-$110</span></li>
        </ul>
        <p>Plus: a wire rack from a hardware store ($40 to $80) is roughly free compared to a tooled steel cabinet.</p>
      </div>
    </div>
    <p class="muted">
      Numbers from the public BOM in the repo. They are honest single-unit
      retail estimates, not supplier quotes. At-scale pricing is roughly
      half across the board.
    </p>
  </div>
</section>

<section class="section center">
  <div class="container">
    <h2>Build it yourself, or wait for a kit.</h2>
    <p class="lede" style="margin: 0 auto;">
      The Lite and Nano kits are pre-orders. We're currently building the
      first proof unit. Back the project and you'll be first in line.
    </p>
    <div class="cta">
      <a class="btn" href="/pitch">Back the proof unit</a>
      <a class="btn btn-secondary" href="/twin">See the 3D twin</a>
    </div>
  </div>
</section>

<style>
  .center { text-align: center; }
  .center .cta { display: flex; gap: .75rem; justify-content: center; margin-top: 1.5rem; flex-wrap: wrap; }
  .bg-warm { background: var(--paper-warm); }

  .tiers-section { padding-top: 0; }
  .tiers {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }
  @media (max-width: 940px) { .tiers { grid-template-columns: 1fr; } }
  .tier {
    position: relative;
    background: var(--paper);
    border: 1px solid #DDD3BB;
    border-radius: 14px;
    padding: 1.8rem 1.6rem;
    display: flex; flex-direction: column;
  }
  .tier.highlight {
    background: #FBF7EB;
    border-color: var(--evergreen);
    box-shadow: 0 14px 40px -18px rgba(46,90,65,0.4);
  }
  .tier .ribbon {
    position: absolute; top: -12px; right: 18px;
    background: var(--brass); color: #fff;
    padding: .3rem .7rem; border-radius: 999px; font-size: .78rem; font-weight: 600;
  }
  .tier h2 { color: var(--evergreen); }
  .tier .price { font-size: 1.8rem; font-weight: 700; margin: .25rem 0 .5rem; }
  .tier .price span { font-size: .85rem; color: #6c6862; font-weight: 500; margin-left: .25rem; }
  .tier ul { list-style: none; padding: 0; margin: 1rem 0; flex: 1; }
  .tier ul li { padding: .45rem 0; border-bottom: 1px solid rgba(0,0,0,0.05); font-size: .95rem; line-height: 1.4; }
  .tier ul li:last-of-type { border-bottom: none; }
  .tier .for { background: var(--paper-warm); padding: .8rem .9rem; border-radius: 8px; font-size: .9rem; line-height: 1.5; color: #4a4a45; }
  .tier.highlight .for { background: rgba(46,90,65,0.08); }

  .cost-breakdown {
    display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;
    margin-top: 2rem;
  }
  @media (max-width: 760px) { .cost-breakdown { grid-template-columns: 1fr; } }
  .cost h3 { color: var(--evergreen); margin-bottom: .8rem; }
  .cost table { width: 100%; border-collapse: collapse; }
  .cost table td { padding: .55rem 0; border-bottom: 1px solid rgba(0,0,0,0.07); color: #4a4a45; }
  .cost table tr.total td { font-weight: 700; color: var(--ink); border-top: 2px solid var(--ink); padding-top: .8rem; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  ul.drop { list-style: none; padding: 0; margin: 0; }
  ul.drop li { padding: .55rem 0; border-bottom: 1px solid rgba(0,0,0,0.07); display: flex; justify-content: space-between; color: #4a4a45; }
  ul.drop .num { color: var(--evergreen); font-weight: 600; }
  .muted { color: #6c6862; font-size: .9rem; margin-top: 1.5rem; }
</style>
