<script>
  import { onMount } from "svelte";
  import * as THREE from "three";
  import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import { loadDimensions } from "$lib/cad/dimensions.js";
  import { buildAppliance } from "$lib/cad/buildAppliance.js";
  import { buildAllPlants } from "$lib/cad/buildPlants.js";
  import { indexParts, applySnapshot } from "$lib/cad/liveBindings.js";
  import { subscribeStream } from "$lib/api/stream.js";

  let canvas;
  let tooltip = null;
  let doorOpen = false;
  let renderer, scene, camera, controls, raycaster, mouse, parts, dims, applianceGroup, doorMesh;
  let stop = () => {};
  let frame;

  async function init() {
    dims = await loadDimensions();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f5);

    camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.01, 50);
    camera.position.set(1.4, 1.6, 2.0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Lighting: a key + soft fill, plus an interior point light so the
    // cabinet interior reads correctly when the door is open.
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(2, 4, 2);
    scene.add(key);
    const fill = new THREE.PointLight(0xfff2c0, 0.4, 4);
    fill.position.set(0, 1.2, 0.3);
    scene.add(fill);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.MeshStandardMaterial({ color: 0xd5d8db, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    applianceGroup = buildAppliance(dims);
    scene.add(applianceGroup);
    const plants = buildAllPlants(dims);
    scene.add(plants);
    applianceGroup.add(plants);

    parts = indexParts(applianceGroup);
    doorMesh = parts.get("cabinet.front");

    controls = new OrbitControls(camera, canvas);
    controls.target.set(0, dims.cabinet.height / 2, -dims.cabinet.depth / 2);
    controls.update();

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    stop = subscribeStream("/api/stream", (snap) => {
      applySnapshot(parts, dims, snap);
    });

    window.addEventListener("resize", onResize);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("click", onClick);

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
    init().catch(console.error);
    return () => {
      cancelAnimationFrame(frame);
      stop();
      window.removeEventListener("resize", onResize);
      renderer?.dispose();
    };
  });
</script>

<svelte:head><title>GroveOS · 3D twin</title></svelte:head>

<div class="bar">
  <a href="/">← Dashboard</a>
  <h1>GroveOS · 3D twin</h1>
  <a href="/3d/arch">Architecture →</a>
  <button on:click={toggleDoor}>{doorOpen ? "Close door" : "Open door"}</button>
</div>

<canvas bind:this={canvas}></canvas>

{#if tooltip}
  <div class="tooltip" style="left:{tooltip.x + 12}px; top:{tooltip.y + 12}px">
    {tooltip.partId}
  </div>
{/if}

<style>
  :global(body) { margin: 0; overflow: hidden; font-family: system-ui, sans-serif; }
  .bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 10;
    background: rgba(20, 24, 30, 0.85); color: #fff;
    padding: .5rem 1rem; display: flex; gap: 1rem; align-items: center;
  }
  .bar h1 { margin: 0; font-size: 1.0rem; font-weight: 600; flex: 0 0 auto; }
  .bar a { color: #8cf; text-decoration: none; }
  .bar button {
    margin-left: auto; padding: .3rem .8rem; border: 1px solid #aaa;
    background: #222; color: #eee; border-radius: 3px; cursor: pointer;
  }
  canvas { display: block; width: 100vw; height: 100vh; }
  .tooltip {
    position: fixed; pointer-events: none; z-index: 11;
    background: rgba(0,0,0,0.8); color: #fff;
    padding: .25rem .5rem; border-radius: 3px;
    font-family: ui-monospace, monospace; font-size: .85rem;
  }
</style>
