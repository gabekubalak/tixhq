<script>
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  let canvas;
  let archGroup, renderer, scene, camera, controls, raycaster, mouse;
  let tooltip = null;
  let frame;
  let ready = false;
  let NS_COLOR_ENTRIES = [];

  async function init() {
    if (!browser) return;
    const THREE = await import("three");
    const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
    const mod = await import("$lib/cad/buildArch.js");
    NS_COLOR_ENTRIES = Object.entries(mod.NS_COLOR);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d12);

    camera = new THREE.PerspectiveCamera(42, canvas.clientWidth / canvas.clientHeight, 0.01, 100);
    camera.position.set(0, 10, 5.3);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x223040, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 0.7);
    key.position.set(3, 6, 3);
    scene.add(key);

    archGroup = mod.buildArch();
    scene.add(archGroup);

    controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0.8, 0.5);
    controls.update();

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    window.addEventListener("resize", onResize);
    canvas.addEventListener("pointermove", onMove);
    ready = true;
    animate();
  }
  function onResize() {
    if (!renderer) return;
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }
  function onMove(ev) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(archGroup, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData?.partId) o = o.parent;
      if (o) {
        const u = o.userData;
        const label = u.subject ? `${u.subject}  [${u.ns}]` : (u.label ?? u.partId);
        tooltip = { x: ev.clientX, y: ev.clientY, text: label };
        return;
      }
    }
    tooltip = null;
  }
  function animate() {
    frame = requestAnimationFrame(animate);
    controls?.update();
    renderer?.render(scene, camera);
  }
  onMount(() => {
    init().catch(console.error);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      canvas?.removeEventListener("pointermove", onMove);
      renderer?.dispose();
    };
  });
</script>

<svelte:head><title>KrattOS - The system</title></svelte:head>

<section class="page">
  <div class="container intro">
    <h1>The system, end to end.</h1>
    <p class="lede">
      KrattOS is two computers talking to each other. A tiny real-time
      microcontroller deals with valves and pumps. A small AI brain runs the
      planner, the vision pipeline, and the dashboard. They communicate over
      a local message bus. Nothing leaves the cabinet.
    </p>
  </div>

  <div class="viewport">
    <canvas bind:this={canvas}></canvas>
    {#if !ready}
      <div class="loading">Loading the architecture graph...</div>
    {/if}
    {#if tooltip}
      <div class="tooltip" style="left:{tooltip.x + 12}px; top:{tooltip.y + 12}px">{tooltip.text}</div>
    {/if}
    {#if NS_COLOR_ENTRIES.length}
      <div class="legend">
        {#each NS_COLOR_ENTRIES as [ns, hex]}
          <span class="chip" style="color:#{hex.toString(16).padStart(6,'0')}">■ {ns}</span>
        {/each}
      </div>
    {/if}
  </div>

  <div class="container after">
    <div class="cards">
      <article class="card">
        <h3>Tier 0: the microcontrollers</h3>
        <p>Three ESP32-S3 chips. Sensor reads, pump pulses, valve switching, light dimming, and a hardware-watchdog safety supervisor that gates all the 24V power through a relay. No Linux means no software jitter.</p>
      </article>
      <article class="card">
        <h3>Tier 1: ingest and control</h3>
        <p>Python and Rust services that read the sensor stream off USB, run the moisture control loop, dose nutrients, and drive the composter state machine. This is where the safety invariants live.</p>
      </article>
      <article class="card">
        <h3>Tier 2: planner and AI</h3>
        <p>The recipe engine knows what crop is on which shelf and what it needs next. The vision model reads the camera and reports growth stage. The planner combines them and writes setpoints.</p>
      </article>
      <article class="card">
        <h3>Tier 3: the local UI</h3>
        <p>A FastAPI backend re-broadcasts state as a stream, and a SvelteKit dashboard renders it (the dashboard you'd see if you opened the appliance on your phone). All bound to localhost. No outbound connections.</p>
      </article>
    </div>

    <div class="manifesto">
      <h2>Why it's offline</h2>
      <ul>
        <li><strong>Privacy.</strong> Your kitchen shouldn't be a data feed.</li>
        <li><strong>Reliability.</strong> An appliance that bricks when a subscription lapses is a bad deal.</li>
        <li><strong>Safety.</strong> The safety supervisor is its own chip, with its own power-cut relay. No cloud bug can ever open a valve.</li>
        <li><strong>Real users.</strong> Hospital food services, embassy kitchens, biosecurity labs, base mess halls. They cannot put a connected appliance in their food chain. Build for them first.</li>
      </ul>
      <p class="muted">
        Updates ship on a cryptographically signed USB stick. The
        firewall blocks all outbound traffic by default.
      </p>
    </div>
  </div>
</section>

<style>
  .page { padding: 2rem 0 0; }
  .intro { padding-bottom: 1.5rem; }
  .viewport {
    position: relative;
    height: 72vh;
    min-height: 520px;
    background: #0a0d12;
    border-top: 1px solid #DDD3BB;
    border-bottom: 1px solid #DDD3BB;
  }
  canvas { display: block; width: 100%; height: 100%; touch-action: none; }
  .loading {
    position: absolute; inset: 0;
    display: grid; place-items: center;
    color: rgba(244,241,234,0.5);
    pointer-events: none;
  }
  .tooltip {
    position: fixed; pointer-events: none; z-index: 11;
    background: rgba(0,0,0,0.85); color: #fff;
    padding: .3rem .55rem; border-radius: 4px;
    font-family: ui-monospace, monospace; font-size: .85rem;
  }
  .legend {
    position: absolute; bottom: 1rem; left: 1rem;
    display: flex; gap: .9rem; flex-wrap: wrap;
    background: rgba(20,26,22,0.7);
    backdrop-filter: blur(8px);
    border-radius: 8px;
    padding: .5rem .8rem;
    font-size: .82rem;
    color: rgba(244,241,234,0.9);
  }
  .legend .chip { white-space: nowrap; }
  .after { padding: 2.5rem 0 1rem; }
  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; margin-bottom: 3rem; }
  @media (max-width: 940px) { .cards { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 560px) { .cards { grid-template-columns: 1fr; } }
  .card { background: var(--paper-warm); border-radius: 12px; padding: 1.25rem; }
  .card h3 { color: var(--evergreen); }
  .card p { color: #4a4a45; line-height: 1.55; font-size: .95rem; }
  .manifesto { background: var(--ink); color: var(--paper); border-radius: 14px; padding: 2rem clamp(1.5rem, 4vw, 3rem); }
  .manifesto h2 { color: var(--paper); margin-bottom: 1rem; }
  .manifesto ul { list-style: none; padding: 0; margin: 0; }
  .manifesto li { padding: .6rem 0; border-bottom: 1px solid rgba(244,241,234,0.1); }
  .manifesto li:last-of-type { border-bottom: none; }
  .manifesto strong { color: var(--brass); }
  .manifesto .muted { color: rgba(244,241,234,0.6); margin: 1rem 0 0; font-size: .9rem; }
</style>
