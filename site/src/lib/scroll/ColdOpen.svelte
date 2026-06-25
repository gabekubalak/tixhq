<script>
  // Pinned cold-open beat: black-to-paper background, the power-on glyph
  // draws itself (ring arc, then stem), two leaves unfurl through the
  // ring's gap, then the wordmark and the opening line resolve. Scroll is
  // the clock; no autoplaying timelines.
  //
  // Hand-rolled with CSS custom properties driven by a Svelte reactive
  // variable, rather than pulling in GSAP for one beat. Keeps the cold
  // open's bundle tiny so the LCP image (paper bg + first hint of mark)
  // is fast.

  import { onMount } from "svelte";
  import { motionState } from "./motion.js";

  export let pin = "+=180%";

  let section;
  let progress = 0;
  let reduced = false;

  // Stroke-dash math: a single number we scale per path to "draw on" each
  // stroke as progress moves through its slice.
  function slice(t, lo, hi) {
    if (hi <= lo) return t >= hi ? 1 : 0;
    const u = Math.max(0, Math.min(1, (t - lo) / (hi - lo)));
    return u * u * (3 - 2 * u);
  }

  // Slice budget across the pin (sums to 1):
  //   0.00-0.05  background fades from black toward paper
  //   0.05-0.30  ring arc draws on
  //   0.20-0.40  stem draws on (slight overlap so it reads as one motion)
  //   0.35-0.60  leaves scale up and fade in
  //   0.55-0.75  veins fade in
  //   0.65-0.85  wordmark resolves
  //   0.80-1.00  opening line resolves
  $: bg          = slice(progress, 0.00, 0.05);
  $: arcOn       = slice(progress, 0.05, 0.30);
  $: stemOn      = slice(progress, 0.20, 0.40);
  $: leafScale   = slice(progress, 0.35, 0.60);
  $: veinFade    = slice(progress, 0.55, 0.75);
  $: wordFade    = slice(progress, 0.65, 0.85);
  $: lineFade    = slice(progress, 0.80, 1.00);

  // Stroke lengths for the two strokes (ring arc + stem). The arc is
  // half-circle of r=78 ≈ 245px; stem is 54px. Set generously high so
  // we never "underdraw."
  const ARC_LEN = 260;
  const STEM_LEN = 60;

  onMount(() => {
    let st = null;
    let unsub = () => {};

    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      unsub = motionState.subscribe((m) => {
        if (!m.ready) return;
        reduced = m.reduced;
        if (reduced) return;
        if (st) return;
        st = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: pin,
          pin: true,
          scrub: 0.4,
          onUpdate: (self) => {
            progress = self.progress;
          },
        });
      });
    })();

    return () => {
      st?.kill();
      unsub();
    };
  });
</script>

{#if reduced}
  <!-- Reduced motion: render the mark, the wordmark, and the line as
       static type. Same story, no draw-on. -->
  <section class="cold reduced" bind:this={section}>
    <div class="inner">
      <img class="static-mark" src="/krattos-logo.svg" alt="KrattOS" />
      <p class="line">An offline AI that grows your food.</p>
    </div>
  </section>
{:else}
  <section
    class="cold"
    bind:this={section}
    style="
      --bg: {bg};
      --arc: {(1 - arcOn) * ARC_LEN};
      --stem: {(1 - stemOn) * STEM_LEN};
      --leaf-scale: {leafScale};
      --leaf-opacity: {leafScale};
      --vein: {veinFade};
      --word: {wordFade};
      --line: {lineFade};
    "
  >
    <div class="sticky">
      <div class="inner">
        <svg
          class="mark"
          viewBox="0 0 240 240"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <!-- Ring arc: power-symbol C, drawn on first. -->
          <path
            class="arc"
            d="M 154.2 49.9 A 78 78 0 1 1 85.8 49.9"
            stroke="#2E5A41"
            stroke-width="22"
            stroke-linecap="round"
            fill="none"
            pathLength={ARC_LEN}
            stroke-dasharray={ARC_LEN}
            stroke-dashoffset="var(--arc)"
          />
          <!-- Stem: power-symbol vertical bar. -->
          <path
            class="stem"
            d="M 120 132 L 120 78"
            stroke="#2E5A41"
            stroke-width="22"
            stroke-linecap="round"
            fill="none"
            pathLength={STEM_LEN}
            stroke-dasharray={STEM_LEN}
            stroke-dashoffset="var(--stem)"
          />
          <!-- Two leaves unfurling through the ring's gap. -->
          <g class="leaves">
            <path
              d="M 120 80 C 112 52 100 36 86 26 C 80 48 90 66 120 88 Z"
              fill="#3F7350"
            />
            <path
              d="M 120 80 C 128 52 140 36 154 26 C 160 48 150 66 120 88 Z"
              fill="#6FB07A"
            />
          </g>
          <!-- Veins. -->
          <g class="veins">
            <path
              d="M 118 84 C 108 64 100 50 90 36"
              stroke="#234734"
              stroke-width="3.2"
              stroke-linecap="round"
              opacity="0.45"
              fill="none"
            />
            <path
              d="M 122 84 C 132 64 140 50 150 36"
              stroke="#234734"
              stroke-width="3.2"
              stroke-linecap="round"
              opacity="0.4"
              fill="none"
            />
          </g>
        </svg>

        <h1 class="word">
          <span class="kratt">Kratt</span><span class="os">OS</span>
        </h1>
        <p class="line">An offline AI that grows your food.</p>
      </div>
      <!-- Visible only on first load (progress < 0.05), so visitors who
           land on the black page know there's a story to scroll into. -->
      <p
        class="scroll-cue"
        style="opacity: {Math.max(0, 1 - progress / 0.04)};"
      >
        Scroll
      </p>
    </div>
  </section>
{/if}

<style>
  .cold {
    position: relative;
  }
  .sticky {
    position: relative;
    height: 100vh;
    width: 100%;
    overflow: hidden;
    /* Background interpolates from black to paper via var(--bg) in [0,1] */
    background-color: rgb(
      calc(0 + (244 - 0) * var(--bg, 0)),
      calc(0 + (241 - 0) * var(--bg, 0)),
      calc(0 + (234 - 0) * var(--bg, 0))
    );
    transition: background-color 0.15s linear;
  }
  .inner {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.6rem;
    padding: 0 6vw;
    text-align: center;
  }
  .mark {
    width: min(28vh, 260px);
    height: auto;
  }
  .leaves {
    transform-origin: 120px 88px;
    transform: scale(var(--leaf-scale, 0));
    opacity: var(--leaf-opacity, 0);
    transition: transform 0.15s linear, opacity 0.15s linear;
  }
  .veins {
    opacity: var(--vein, 0);
    transition: opacity 0.15s linear;
  }
  .word {
    font-family: "Space Grotesk", system-ui, sans-serif;
    font-weight: 600;
    letter-spacing: -0.027em;
    font-size: clamp(2.4rem, 7vw, 4.4rem);
    line-height: 1;
    margin: 0;
    opacity: var(--word, 0);
    transform: translateY(calc(8px - 8px * var(--word, 0)));
    transition: opacity 0.15s linear, transform 0.15s linear;
  }
  .word .kratt { color: #23201b; }
  .word .os { color: #c2992e; }
  .line {
    font-family: "Space Grotesk", system-ui, sans-serif;
    font-weight: 400;
    font-size: clamp(1rem, 1.8vw, 1.35rem);
    color: #4a4a45;
    margin: 0;
    max-width: 28ch;
    opacity: var(--line, 0);
    transform: translateY(calc(8px - 8px * var(--line, 0)));
    transition: opacity 0.15s linear, transform 0.15s linear;
  }

  .scroll-cue {
    position: absolute;
    left: 50%;
    bottom: 7vh;
    transform: translateX(-50%);
    font-family: "Space Grotesk", system-ui, sans-serif;
    font-size: 0.78rem;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: rgba(244, 241, 234, 0.55);
    margin: 0;
    pointer-events: none;
    transition: opacity 0.2s linear;
  }

  /* Reduced motion: render as a normal-flow centered block. */
  .cold.reduced .inner {
    position: relative;
    inset: auto;
    min-height: 92vh;
    background: #f4f1ea;
  }
  .static-mark {
    width: min(38vh, 320px);
    height: auto;
  }
</style>
