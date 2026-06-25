<script>
  // A pinned, full-viewport section that scrubs a precomputed image
  // sequence as you scroll through it. One <canvas>, drawImage per frame.
  //
  // Props:
  //   scene      string  sequence folder under /static/sequence/<scene>
  //   pin        string  scroll distance to pin for (GSAP end, e.g. "+=220%")
  //   copy       array   [{ at: 0..1, align, title, body }] overlays whose
  //                      opacity is driven by the same scroll progress
  //   eager      bool    preload immediately on mount (true for the first
  //                      scene; later scenes preload when near viewport)
  //
  // Reduced-motion / no-JS: instead of pinning, we render three stills
  // (start, middle, end) stacked with the copy in normal document flow.

  import { onMount } from "svelte";
  import {
    preloadScene,
    pickVariant,
    frameUrl,
  } from "./decodeQueue.js";
  import { motionState } from "./motion.js";

  export let scene;
  export let pin = "+=220%";
  export let copy = [];
  export let eager = false;

  let section;
  let canvas;
  let manifest = null;
  let variant = "desktop";
  let queue = null;
  let progress = 0; // 0..1 across the pinned scroll
  let reduced = false;
  let started = false;
  let firstDrawn = false;

  // Aspect ratio for the reserved box (avoids layout shift before the
  // canvas has drawn). Defaults to 16:9, corrected once the manifest loads.
  let aspect = 16 / 9;

  function variantDims() {
    if (!manifest) return { w: 1600, h: 900 };
    return manifest[variant] || manifest.desktop;
  }

  function draw() {
    if (!canvas || !queue) return;
    const frames = queue.frames;
    const n = frames.length;
    if (!n) return;
    let idx = Math.round(progress * (n - 1));
    idx = Math.max(0, Math.min(n - 1, idx));

    // Hold the nearest earlier loaded frame if this one has a hole.
    let img = frames[idx];
    if (!img) {
      for (let k = idx; k >= 0; k--) {
        if (frames[k]) { img = frames[k]; break; }
      }
      if (!img) {
        for (let k = idx + 1; k < n; k++) {
          if (frames[k]) { img = frames[k]; break; }
        }
      }
    }
    if (!img) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    const needW = Math.round(cssW * dpr);
    const needH = Math.round(cssH * dpr);
    if (canvas.width !== needW || canvas.height !== needH) {
      canvas.width = needW;
      canvas.height = needH;
    }

    // Cover-fit the frame into the canvas.
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max(needW / iw, needH / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (needW - dw) / 2;
    const dy = (needH - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
    if (!firstDrawn) firstDrawn = true;
  }

  async function loadManifest() {
    const res = await fetch(`/sequence/${scene}/manifest.json`);
    manifest = await res.json();
    const d = variantDims();
    aspect = d.width / d.height;
  }

  function startPreload() {
    if (started || !manifest) return;
    started = true;
    const d = variantDims();
    queue = preloadScene(scene, variant, manifest.frames, { concurrency: 8 });
    // Draw progressively as frames arrive so the first scroll isn't blank.
    const poll = setInterval(() => {
      draw();
      if (queue.loaded() >= manifest.frames) clearInterval(poll);
    }, 120);
    queue.ready.then(() => {
      clearInterval(poll);
      draw();
    });
  }

  onMount(() => {
    variant = pickVariant();
    let st = null;
    let io = null;
    let unsub = () => {};

    (async () => {
      await loadManifest();

      unsub = motionState.subscribe((m) => {
        if (!m.ready) return;
        reduced = m.reduced;
        if (reduced) {
          // Stills layout renders declaratively below; nothing to pin.
          return;
        }
        setupScrub();
      });
    })();

    async function setupScrub() {
      if (st) return; // already wired
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      // Preload: eager scenes now, others when they approach the viewport.
      if (eager) {
        startPreload();
      } else {
        io = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              startPreload();
              io.disconnect();
            }
          },
          { rootMargin: "200% 0px" }
        );
        io.observe(section);
      }

      st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: pin,
        pin: true,
        scrub: 0.4,
        onUpdate: (self) => {
          progress = self.progress;
          draw();
        },
      });
    }

    return () => {
      st?.kill();
      io?.disconnect();
      unsub();
    };
  });
</script>

{#if reduced}
  <!-- Reduced-motion: same story as stacked stills + copy, no pinning. -->
  <section class="stills" bind:this={section}>
    {#each [0, 0.5, 1] as at, i}
      <figure>
        <img
          src={frameUrl(scene, variant, Math.round(at * (((manifest && manifest.frames) || 1) - 1)))}
          alt={(copy[i] && copy[i].title) || `${scene} ${i + 1}`}
          loading={i === 0 ? "eager" : "lazy"}
        />
        {#if copy[i]}
          <figcaption>
            <h2>{copy[i].title}</h2>
            {#if copy[i].body}<p>{copy[i].body}</p>{/if}
          </figcaption>
        {/if}
      </figure>
    {/each}
  </section>
{:else}
  <section
    class="scrub"
    bind:this={section}
    style="--aspect: {aspect};"
  >
    <div class="sticky">
      <canvas bind:this={canvas} aria-hidden="true"></canvas>
      <!-- First frame as a real <img> for LCP + no-JS; canvas covers it
           once drawing starts. -->
      <img
        class="poster"
        src={frameUrl(scene, variant, 0)}
        alt={(copy[0] && copy[0].title) || scene}
        class:hidden={firstDrawn}
      />
      <div class="overlays">
        {#each copy as c}
          <div
            class="overlay {c.align || 'center'}"
            style="opacity: {overlayOpacity(progress, c.at)};"
          >
            <h2>{c.title}</h2>
            {#if c.body}<p>{c.body}</p>{/if}
          </div>
        {/each}
      </div>
    </div>
  </section>
{/if}

<script context="module">
  // Triangular fade: copy peaks at its `at` point and fades on either side.
  export function overlayOpacity(progress, at, width = 0.16) {
    const d = Math.abs(progress - at);
    if (d >= width) return 0;
    return 1 - d / width;
  }
</script>

<style>
  .scrub {
    position: relative;
  }
  .sticky {
    position: relative;
    height: 100vh;
    width: 100%;
    overflow: hidden;
    background: #f4f1ea;
  }
  canvas,
  .poster {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .poster {
    z-index: 0;
  }
  canvas {
    z-index: 1;
  }
  .poster.hidden {
    opacity: 0;
  }
  .overlays {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
  }
  .overlay {
    position: absolute;
    max-width: min(46ch, 86vw);
    padding: 1.2rem 1.4rem;
    transition: opacity 0.15s linear;
    isolation: isolate;
  }
  /* Feathered paper halo so ink copy stays legible over the dark cabinet
     without reading as a hard box. Invisible over the paper background. */
  .overlay::before {
    content: "";
    position: absolute;
    inset: -0.6rem -1.2rem;
    z-index: -1;
    background: radial-gradient(
      ellipse at center,
      rgba(244, 241, 234, 0.94) 0%,
      rgba(244, 241, 234, 0.8) 45%,
      rgba(244, 241, 234, 0) 78%
    );
    filter: blur(6px);
  }
  .overlay h2 {
    font-family: "Space Grotesk", system-ui, sans-serif;
    font-weight: 600;
    letter-spacing: -0.027em;
    font-size: clamp(1.8rem, 4.5vw, 3.4rem);
    line-height: 1.05;
    color: #23201b;
    margin: 0 0 0.5rem;
  }
  .overlay p {
    font-size: clamp(1rem, 1.6vw, 1.25rem);
    line-height: 1.5;
    color: #3a382f;
    margin: 0;
  }
  .overlay.center {
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
  }
  .overlay.left {
    left: 6vw;
    bottom: 12vh;
  }
  .overlay.right {
    right: 6vw;
    bottom: 12vh;
    text-align: right;
  }

  /* Reduced-motion stills */
  .stills {
    display: flex;
    flex-direction: column;
  }
  .stills figure {
    position: relative;
    margin: 0;
  }
  .stills img {
    width: 100%;
    height: auto;
    display: block;
  }
  .stills figcaption {
    padding: 1.4rem 6vw 3rem;
    background: #f4f1ea;
  }
  .stills figcaption h2 {
    font-family: "Space Grotesk", system-ui, sans-serif;
    font-weight: 600;
    letter-spacing: -0.027em;
    font-size: clamp(1.6rem, 4vw, 2.8rem);
    color: #23201b;
    margin: 0 0 0.5rem;
  }
  .stills figcaption p {
    font-size: 1.1rem;
    line-height: 1.5;
    color: #3a382f;
    max-width: 60ch;
    margin: 0;
  }
</style>
