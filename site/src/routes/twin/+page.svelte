<script>
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { loadDimensions } from "$lib/cad/dimensions.js";

  let canvas;
  let tooltip = null;
  let doorOpen = true;
  let stage = "Auto demo";
  let renderer, scene, camera, controls, raycaster, mouse, parts, dims, applianceGroup, doorMesh;
  let frame, fakeTimer;
  let ready = false;
  let error = null;

  function fakeSnapshot(t) {
    return {
      zones: {
        0: { moisture_pct: 50 + 25 * Math.sin(t / 8.0),  ppfd: 240, hours_on: 16, vision: { phase_estimate: "veg",            leaf_area_cm2: 180, color_health: 0.88 } },
        1: { moisture_pct: 75 - 10 * Math.sin(t / 11.0), ppfd: 180, hours_on: 16, vision: { phase_estimate: "seedling",       leaf_area_cm2: 24,  color_health: 0.92 } },
        2: { moisture_pct: 60 + 20 * Math.sin(t / 6.0),  ppfd: 300, hours_on: 14, vision: { phase_estimate: "harvest_ready",  leaf_area_cm2: 220, color_health: 0.84 } },
        3: { moisture_pct: 65,                           ppfd: 120, hours_on: 16, vision: { phase_estimate: "germination",    leaf_area_cm2: 4,   color_health: 0.70 } }
      },
      composter: { phase: "thermophilic", temp_c: 58.2 + 1.5 * Math.sin(t / 30.0), hours_above_55c: 52 },
      manifold:  { ec: 1.6 + 0.1 * Math.sin(t / 15.0), ph: 6.1 + 0.05 * Math.cos(t / 18.0) },
      slurry_tank_pct: 60 + 8 * Math.sin(t / 20.0)
    };
  }

  async function init() {
    if (!browser) return;
    const THREE = await import("three");
    const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
    const { buildAppliance } = await import("$lib/cad/buildAppliance.js");
    const { buildAllPlants } = await import("$lib/cad/buildPlants.js");
    const { indexParts, applySnapshot } = await import("$lib/cad/liveBindings.js");

    dims = await loadDimensions();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeaecef);

    const H = dims.cabinet.height;
    const W = dims.cabinet.width;
    camera = new THREE.PerspectiveCamera(38, canvas.clientWidth / canvas.clientHeight, 0.01, 50);
    camera.position.set(W * 1.6, H * 0.55, W * 1.8);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene.add(new THREE.HemisphereLight(0xeaf0ff, 0x394050, 0.7));
    const key = new THREE.DirectionalLight(0xfff2dc, 1.1);
    key.position.set(W * 2, H * 1.6, W * 1.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -W * 2;
    key.shadow.camera.right = W * 2;
    key.shadow.camera.top = H * 1.5;
    key.shadow.camera.bottom = -0.2;
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = W * 8;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc8d6ff, 0.35);
    fill.position.set(-W * 1.5, H * 0.8, -W);
    scene.add(fill);
    const kick = new THREE.PointLight(0xfff2dc, 0.25, 3);
    kick.position.set(0, 0.4, 0.6);
    scene.add(kick);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.MeshStandardMaterial({ color: 0xd5d8db, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.04;
    ground.receiveShadow = true;
    scene.add(ground);

    applianceGroup = buildAppliance(dims);
    applianceGroup.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    scene.add(applianceGroup);

    const plants = buildAllPlants(dims);
    plants.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    applianceGroup.add(plants);

    parts = indexParts(applianceGroup);
    doorMesh = parts.get("cabinet.front");
    if (doorMesh) doorMesh.visible = !doorOpen;

    controls = new OrbitControls(camera, canvas);
    controls.target.set(0, H / 2, -dims.cabinet.depth / 2);
    controls.minDistance = 0.6;
    controls.maxDistance = 8;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.update();

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Drive the live bindings with a synthetic snapshot stream.
    const tick = () => {
      const t = performance.now() / 1000;
      applySnapshot(parts, dims, fakeSnapshot(t));
    };
    fakeTimer = setInterval(tick, 250);
    tick();

    window.addEventListener("resize", onResize);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("click", onClick);

    ready = true;
    animate();
  }

  function onResize() {
    if (!renderer) return;
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }
  function pick(ev) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(applianceGroup, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData?.partId) o = o.parent;
      if (o) return { obj: o, point: h.point };
    }
    return null;
  }
  function onMove(ev) {
    const hit = pick(ev);
    if (!hit) { tooltip = null; return; }
    tooltip = { x: ev.clientX, y: ev.clientY, partId: hit.obj.userData.partId };
  }
  function onClick(ev) {
    const hit = pick(ev);
    if (!hit) return;
    tooltip = { x: ev.clientX, y: ev.clientY, partId: hit.obj.userData.partId, pinned: true };
  }
  function toggleDoor() {
    doorOpen = !doorOpen;
    if (doorMesh) doorMesh.visible = !doorOpen;
  }
  function animate() {
    frame = requestAnimationFrame(animate);
    controls?.update();
    renderer?.render(scene, camera);
  }

  onMount(() => {
    init().catch((e) => { error = String(e); console.error(e); });
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(fakeTimer);
      window.removeEventListener("resize", onResize);
      canvas?.removeEventListener("pointermove", onMove);
      canvas?.removeEventListener("click", onClick);
      renderer?.dispose();
    };
  });
</script>

<svelte:head>
  <title>KrattOS - Interactive 3D twin</title>
</svelte:head>

<section class="page">
  <div class="container intro">
    <h1>The 3D digital twin</h1>
    <p class="lede">
      Every shelf, plant, valve, pump, and probe is modeled and wired to live
      sensor data. This is the same view the operator dashboard uses. Drag to
      orbit. Click anything for its part ID. The simulation below is on a fast
      loop so you can see the appliance responding.
    </p>
  </div>

  <div class="viewport">
    <canvas bind:this={canvas}></canvas>
    {#if !ready && !error}
      <div class="loading">Loading the twin...</div>
    {/if}
    {#if error}
      <div class="loading error">Could not load the 3D scene: {error}</div>
    {/if}
    {#if tooltip}
      <div class="tooltip" style="left:{tooltip.x + 12}px; top:{tooltip.y + 12}px">
        {tooltip.partId}
      </div>
    {/if}
    <div class="overlay">
      <span class="dot live"></span>
      <span>{stage}</span>
      <button on:click={toggleDoor}>{doorOpen ? "Close door" : "Open door"}</button>
    </div>
  </div>

  <div class="container after">
    <div class="grid">
      <div>
        <h3>What you're looking at</h3>
        <p>A scale model of the full KrattOS cabinet. Four growing shelves, an integrated composter at the base, a slurry tank, six small reservoirs for base nutrients, and a pan-tilt camera mounted on the inside wall.</p>
      </div>
      <div>
        <h3>The live bindings</h3>
        <p>Moisture, EC, pH, lights, the composter phase, the slurry-tank level: each of these maps onto a piece of geometry in the scene. In production, the same JSON snapshot updates this view 2 times a second.</p>
      </div>
      <div>
        <h3>Why this matters for a pitch</h3>
        <p>A digital twin is not a render. It is the same model the appliance uses to reason about itself. If a shelf is too dry, the moisture geometry shows it. If a valve opens, the dashboard sees it open here.</p>
      </div>
    </div>
  </div>
</section>

<style>
  .page { padding: 2rem 0 0; }
  .intro { padding-bottom: 1.5rem; }
  .viewport {
    position: relative;
    height: 70vh;
    min-height: 480px;
    background: #1a1d22;
    border-top: 1px solid #DDD3BB;
    border-bottom: 1px solid #DDD3BB;
  }
  canvas { display: block; width: 100%; height: 100%; touch-action: none; }
  .loading {
    position: absolute; inset: 0;
    display: grid; place-items: center;
    color: rgba(244,241,234,0.7);
    font-size: 1rem;
    pointer-events: none;
  }
  .loading.error { color: #ffcccc; padding: 0 2rem; text-align: center; }
  .tooltip {
    position: fixed; pointer-events: none; z-index: 11;
    background: rgba(0,0,0,0.85); color: #fff;
    padding: .3rem .55rem; border-radius: 4px;
    font-family: ui-monospace, monospace; font-size: .85rem;
  }
  .overlay {
    position: absolute; top: 1rem; left: 1rem;
    background: rgba(20, 26, 22, 0.7);
    color: var(--paper);
    padding: .5rem .9rem;
    border-radius: 999px;
    font-size: .85rem;
    display: flex; gap: .6rem; align-items: center;
    backdrop-filter: blur(8px);
  }
  .overlay button {
    background: rgba(244,241,234,0.15);
    border: 1px solid rgba(244,241,234,0.3);
    color: var(--paper);
    border-radius: 999px;
    padding: .3rem .8rem;
    font-size: .8rem;
    cursor: pointer;
    margin-left: .5rem;
  }
  .overlay button:hover { background: rgba(244,241,234,0.25); }
  .dot { width: 8px; height: 8px; border-radius: 999px; background: #6FB07A; box-shadow: 0 0 8px #6FB07A; }
  .dot.live { animation: pulse 1.4s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
  .after { padding-top: 2.5rem; padding-bottom: 1rem; }
  .grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem;
  }
  @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
  .grid h3 { color: var(--evergreen); }
  .grid p { color: #4a4a45; line-height: 1.6; }
</style>
