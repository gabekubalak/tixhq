<script>
  import { onMount } from "svelte";
  import * as THREE from "three";
  import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import { buildArch, NS_COLOR } from "$lib/cad/buildArch.js";

  let canvas;
  let tooltip = null;
  let renderer, scene, camera, controls, raycaster, mouse, archGroup;
  let frame;

  function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d12);

    camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.01, 100);
    camera.position.set(0, 4.5, 6);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x223040, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 0.7);
    key.position.set(3, 6, 3);
    scene.add(key);

    archGroup = buildArch();
    scene.add(archGroup);

    controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 1.0, 0.8);
    controls.update();

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    window.addEventListener("resize", onResize);
    canvas.addEventListener("pointermove", onMove);

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
    init();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      renderer?.dispose();
    };
  });
</script>

<svelte:head><title>GroveOS · architecture</title></svelte:head>

<div class="bar">
  <a href="/">← Dashboard</a>
  <h1>GroveOS · architecture</h1>
  <a href="/3d">3D twin →</a>
  <span class="legend">
    {#each Object.entries(NS_COLOR) as [ns, hex]}
      <span class="chip" style="color:#{hex.toString(16).padStart(6,'0')}">■ {ns}</span>
    {/each}
  </span>
</div>

<canvas bind:this={canvas}></canvas>

{#if tooltip}
  <div class="tooltip" style="left:{tooltip.x + 12}px; top:{tooltip.y + 12}px">{tooltip.text}</div>
{/if}

<style>
  :global(body) { margin: 0; overflow: hidden; font-family: system-ui, sans-serif; }
  .bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 10;
    background: rgba(10, 14, 20, 0.9); color: #fff;
    padding: .5rem 1rem; display: flex; gap: 1rem; align-items: center;
  }
  .bar h1 { margin: 0; font-size: 1.0rem; font-weight: 600; }
  .bar a { color: #8cf; text-decoration: none; }
  .legend { margin-left: auto; display: flex; gap: .75rem; font-size: .8rem; }
  .chip { white-space: nowrap; }
  canvas { display: block; width: 100vw; height: 100vh; }
  .tooltip {
    position: fixed; pointer-events: none; z-index: 11;
    background: rgba(0,0,0,0.85); color: #fff;
    padding: .25rem .5rem; border-radius: 3px;
    font-family: ui-monospace, monospace; font-size: .85rem;
  }
</style>
