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
  let doorOpen = true;     // start open so the user sees what's inside
  let renderer, scene, camera, controls, raycaster, mouse, parts, dims, applianceGroup, doorMesh;
  let stop = () => {};
  let frame;

  async function init() {
    dims = await loadDimensions();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeaecef);

    // Three-quarter product-shot angle, framed on the cabinet centre.
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

    // Lighting rig: cool hemi for ambient, warm key from front-right,
    // cool fill from back-left, plus a soft kick from below to lift
    // the underside of the cabinet a touch.
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

    // Ground plane sits just below the cabinet feet (footH = 0.04 m).
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
