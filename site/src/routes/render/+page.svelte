<script>
  // Deterministic single-frame renderer for the scrollytelling capture
  // pipeline. Renders one frame per setT() call, exposes a ready flag on
  // documentElement so Playwright can wait. Never runs an animation loop.
  //
  // Query params:
  //   scene = cabinet | loop  (which sequence module to apply)
  //   t     = 0..1            (progress through the scene)
  //   w, h  = pixels          (canvas size, fixed; no DPR scaling)
  //
  // Exposes window.__krattos = { setT(t), setScene(name) } so a long-lived
  // page can step through many frames without reloading.

  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import { loadDimensions } from "$lib/cad/dimensions.js";

  let canvas;
  let error = null;
  let ready = false;

  function setReadyFlag(flag) {
    if (typeof document === "undefined") return;
    if (flag) {
      document.documentElement.dataset.ready = "1";
      window.__frameReady = true;
    } else {
      delete document.documentElement.dataset.ready;
      window.__frameReady = false;
    }
  }

  async function init() {
    if (!browser) return;
    try {
      const url = $page.url;
      const w = Number(url.searchParams.get("w") || 1600);
      const h = Number(url.searchParams.get("h") || 900);
      const initialScene = url.searchParams.get("scene") || "cabinet";
      const initialT = Number(url.searchParams.get("t") || 0);

      const THREE = await import("three");
      const { buildAppliance } = await import("$lib/cad/buildAppliance.js");
      const { buildGreenhouse } = await import("$lib/cad/buildGreenhouse.js");
      const { GREENHOUSE_DIMS } = await import("$lib/cad/dimensionsGreenhouse.js");
      const { indexParts } = await import("$lib/cad/liveBindings.js");
      const sequences = {
        cabinet: await import("$lib/sequences/cabinet.js"),
        loop: await import("$lib/sequences/loop.js"),
        greenhouse: await import("$lib/sequences/greenhouse.js"),
      };

      const dims = await loadDimensions();
      // Greenhouse scenes use a different geometry + dimensions block.
      const greenhouseDims = GREENHOUSE_DIMS;

      // Canvas + renderer. Fixed pixel ratio = 1 so capture is byte-stable.
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf4f1ea);

      // Which model family a scene belongs to. The cabinet and the
      // greenhouse have disjoint geometry; we build only one.
      const greenhouseScenes = new Set(["greenhouse"]);
      const initialIsGreenhouse = greenhouseScenes.has(initialScene);

      // Lighting + ground are sized to the active model. The cabinet
      // wants a tight 3-point setup over its tabletop footprint; the
      // greenhouse wants sun + sky over a 30 ft length.
      if (initialIsGreenhouse) {
        const W2 = GREENHOUSE_DIMS.width_m;
        const H2 = GREENHOUSE_DIMS.peak_height_m;
        const L2 = GREENHOUSE_DIMS.length_m;
        scene.add(new THREE.HemisphereLight(0xeaf0ff, 0x394050, 0.85));
        const sun = new THREE.DirectionalLight(0xfff0d8, 1.05);
        sun.position.set(W2 * 1.5, H2 * 3, L2 * 0.6);
        scene.add(sun);
        const fill = new THREE.DirectionalLight(0xc8d6ff, 0.3);
        fill.position.set(-W2 * 1.5, H2 * 1.5, -L2 * 0.6);
        scene.add(fill);
        // buildGreenhouse already adds its own ground patch.
      } else {
        const H = dims.cabinet.height;
        const W = dims.cabinet.width;
        scene.add(new THREE.HemisphereLight(0xeaf0ff, 0x394050, 0.7));
        const key = new THREE.DirectionalLight(0xfff2dc, 1.1);
        key.position.set(W * 2, H * 1.6, W * 1.5);
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
        scene.add(ground);
      }

      // Build whichever model the requested scene needs.
      const activeDims = initialIsGreenhouse ? greenhouseDims : dims;
      const root = initialIsGreenhouse
        ? buildGreenhouse(greenhouseDims)
        : buildAppliance(dims);
      scene.add(root);

      // The operator-twin reservoir labels are 2D sprites that always
      // face camera and dominate the cinematic shot. Hide every Sprite
      // in the captured scene.
      root.traverse((o) => {
        if (o.isSprite) o.visible = false;
      });

      const parts = indexParts(root);

      const camera = new THREE.PerspectiveCamera(38, w / h, 0.01, 50);

      // Init only the sequence we'll be rendering. Cross-scene init was
      // safe for the cabinet (cabinet + loop share a model) but the
      // greenhouse sequence touches a totally different parts map.
      const states = {};
      states[initialScene] = sequences[initialScene].init(scene, parts, activeDims);
      // Hide every sequence's helper meshes by default; the active scene
      // re-enables what it wants per frame.
      function hideHelpers() {
        for (const [name, st] of Object.entries(states)) {
          if (st?.pulse) st.pulse.visible = false;
        }
      }

      let currentScene = initialScene;

      function renderFrame(t) {
        setReadyFlag(false);
        hideHelpers();
        const mod = sequences[currentScene];
        if (!mod) throw new Error(`unknown scene: ${currentScene}`);
        mod.apply(t, scene, parts, activeDims, camera, states[currentScene]);
        renderer.render(scene, camera);
        // No async textures in this scene set, so we can flip ready
        // immediately. If async textures are added later, await their
        // .decode() here before flipping.
        setReadyFlag(true);
      }

      // First frame from URL.
      renderFrame(initialT);

      // Capture-control surface.
      window.__krattos = {
        setT(t) {
          renderFrame(Number(t));
        },
        setScene(name) {
          currentScene = name;
        },
        info() {
          return { w, h, currentScene };
        },
      };

      ready = true;
    } catch (e) {
      error = String(e?.stack || e);
      console.error("[render] init failed", e);
    }
  }

  onMount(init);
</script>

<svelte:head>
  <title>render</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="wrap">
  <canvas bind:this={canvas}></canvas>
  {#if error}
    <pre class="err">{error}</pre>
  {/if}
  {#if !ready && !error}
    <div class="boot">booting</div>
  {/if}
</div>

<style>
  :global(html), :global(body) {
    margin: 0;
    padding: 0;
    background: #000;
    overflow: hidden;
  }
  :global(header), :global(footer), :global(nav) {
    display: none !important;
  }
  .wrap {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: #000;
  }
  canvas {
    display: block;
  }
  .err {
    position: fixed;
    inset: 8px;
    color: #fff;
    background: #800;
    padding: 12px;
    font-family: ui-monospace, monospace;
    font-size: 12px;
    white-space: pre-wrap;
    z-index: 1000;
  }
  .boot {
    position: fixed;
    bottom: 8px;
    left: 8px;
    color: #fff;
    font-family: ui-monospace, monospace;
    font-size: 12px;
    opacity: 0.5;
  }
</style>
