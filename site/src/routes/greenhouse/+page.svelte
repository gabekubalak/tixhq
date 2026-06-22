<script>
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { GREENHOUSE_DIMS } from "$lib/cad/dimensionsGreenhouse.js";

  let canvas;
  let renderer, scene, camera, controls, ghGroup;
  let frame, fakeTimer;
  let ready = false;
  let error = null;
  let tooltip = null;

  // Fake live values: outside/inside temp, manifold EC/pH, composter
  let snapshot = { outside_c: 16, inside_c: 22, ec: 1.4, ph: 6.1, comp_phase: "thermophilic" };

  async function init() {
    if (!browser) return;
    const THREE = await import("three");
    const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
    const { buildGreenhouse } = await import("$lib/cad/buildGreenhouse.js");

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd8e6ed);
    // Soft fog so the back of the greenhouse fades
    scene.fog = new THREE.Fog(0xd8e6ed, 10, 22);

    const W = GREENHOUSE_DIMS.width_m;
    const L = GREENHOUSE_DIMS.length_m;
    const H = GREENHOUSE_DIMS.peak_height_m;

    camera = new THREE.PerspectiveCamera(38, canvas.clientWidth / canvas.clientHeight, 0.05, 60);
    camera.position.set(W * 1.8, H * 1.35, L * 0.85);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting: warm key sun from south-west, cool sky fill
    scene.add(new THREE.HemisphereLight(0xfff3df, 0x3a4e3a, 0.85));
    const sun = new THREE.DirectionalLight(0xffe8c4, 1.4);
    sun.position.set(W * 3, H * 2.5, L * 0.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -L * 0.7;
    sun.shadow.camera.right = L * 0.7;
    sun.shadow.camera.top = L * 0.7;
    sun.shadow.camera.bottom = -L * 0.7;
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 30;
    scene.add(sun);

    ghGroup = buildGreenhouse(GREENHOUSE_DIMS);
    ghGroup.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    scene.add(ghGroup);

    controls = new OrbitControls(camera, canvas);
    controls.target.set(0, H * 0.4, 0);
    controls.minDistance = 1.5;
    controls.maxDistance = 25;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.update();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onMove(ev) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(ghGroup, true);
      for (const h of hits) {
        let o = h.object;
        while (o && !o.userData?.partId) o = o.parent;
        if (o) {
          tooltip = { x: ev.clientX, y: ev.clientY, label: o.userData.label || o.userData.partId };
          return;
        }
      }
      tooltip = null;
    }
    canvas.addEventListener("pointermove", onMove);
    canvas._onMove = onMove;

    // Fake live data loop so the readout looks alive during a pitch
    fakeTimer = setInterval(() => {
      const t = performance.now() / 1000;
      snapshot = {
        outside_c: +(16 + 10 * Math.cos(Math.PI * (((t / 60) - 5) / 12))).toFixed(1),
        inside_c:  +(22 + 6 * Math.sin(t / 12)).toFixed(1),
        ec:        +(1.4 + 0.1 * Math.sin(t / 8)).toFixed(2),
        ph:        +(6.1 + 0.05 * Math.cos(t / 11)).toFixed(2),
        comp_phase: ["mesophilic", "thermophilic", "cure"][Math.floor((t / 20) % 3)],
      };
    }, 250);

    window.addEventListener("resize", onResize);
    ready = true;
    animate();
  }

  function onResize() {
    if (!renderer) return;
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
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
      if (canvas?._onMove) canvas.removeEventListener("pointermove", canvas._onMove);
      renderer?.dispose();
    };
  });
</script>

<svelte:head><title>KrattOS - The greenhouse twin</title></svelte:head>

<section class="page">
  <div class="container intro">
    <h1>The greenhouse, in 3D.</h1>
    <p class="lede">
      Same KrattOS, different physical setup. This is the V1 outdoor build:
      a 14 by 30 ft hoop house with four NFT beds, a reservoir, a composter,
      and the brain that runs the whole loop. Drag to orbit. Hover to read
      part labels. The readouts on the right are on a fast loop so the
      system looks alive.
    </p>
  </div>

  <div class="viewport">
    <canvas bind:this={canvas}></canvas>
    {#if !ready && !error}
      <div class="loading">Loading the greenhouse...</div>
    {/if}
    {#if error}
      <div class="loading error">Could not load: {error}</div>
    {/if}
    {#if tooltip}
      <div class="tooltip" style="left:{tooltip.x + 12}px; top:{tooltip.y + 12}px">{tooltip.label}</div>
    {/if}
    <div class="readout">
      <div class="row"><span>Outside air</span><strong>{snapshot.outside_c} °C</strong></div>
      <div class="row"><span>Inside air</span><strong>{snapshot.inside_c} °C</strong></div>
      <div class="row"><span>Reservoir EC</span><strong>{snapshot.ec} mS/cm</strong></div>
      <div class="row"><span>Reservoir pH</span><strong>{snapshot.ph}</strong></div>
      <div class="row"><span>Composter</span><strong class="phase">{snapshot.comp_phase}</strong></div>
    </div>
  </div>

  <div class="container after">
    <div class="grid">
      <div>
        <h3>What you're looking at</h3>
        <p>A scale model of the V1 greenhouse: galvanized hoops at 4 ft spacing, translucent plastic skin, end-wall framing with a door and two passive wax-cylinder vents, four hydroponic beds in two rows, a galvanized stock tank reservoir at the north end, and the composter outside the south corner.</p>
      </div>
      <div>
        <h3>What KrattOS does here</h3>
        <p>The same brain that runs the indoor appliance runs this. The recipe engine drives setpoints per bed. The mixer reads reservoir EC and pH and doses from the composter slurry plus base nutrients. The scheduler runs the recirculation pump on duty cycle. The safety supervisor owns a hardware contactor that drops 24 V on any leak, over-temp, or E-stop.</p>
      </div>
      <div>
        <h3>What the profile changes</h3>
        <p>The greenhouse profile tells KrattOS that these zones are NFT beds (not shelves), that lighting is natural with LED supplement (not panels), and that the composter is external. Services adapt. Same code as the cabinet, different YAML.</p>
      </div>
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
    background: #d8e6ed;
    border-top: 1px solid #DDD3BB;
    border-bottom: 1px solid #DDD3BB;
  }
  canvas { display: block; width: 100%; height: 100%; touch-action: none; }
  .loading {
    position: absolute; inset: 0;
    display: grid; place-items: center;
    color: rgba(20,30,40,0.45);
    pointer-events: none;
  }
  .loading.error { color: #aa3030; padding: 0 2rem; text-align: center; }
  .tooltip {
    position: fixed; pointer-events: none; z-index: 11;
    background: rgba(0,0,0,0.85); color: #fff;
    padding: .3rem .55rem; border-radius: 4px;
    font-family: ui-monospace, monospace; font-size: .85rem;
  }
  .readout {
    position: absolute; top: 1rem; right: 1rem;
    background: rgba(20, 26, 22, 0.78);
    backdrop-filter: blur(8px);
    color: var(--paper);
    padding: .9rem 1.1rem;
    border-radius: 12px;
    min-width: 200px;
    font-size: .92rem;
  }
  .readout .row {
    display: flex; justify-content: space-between; gap: 1rem;
    padding: .25rem 0;
    border-bottom: 1px solid rgba(244,241,234,0.12);
  }
  .readout .row:last-child { border-bottom: none; }
  .readout span { opacity: .7; }
  .readout strong { font-variant-numeric: tabular-nums; }
  .readout .phase { color: #d9b85a; text-transform: capitalize; }

  .after { padding: 2.5rem 0 1rem; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
  @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
  .grid h3 { color: var(--evergreen); }
  .grid p { color: #4a4a45; line-height: 1.6; }
</style>
