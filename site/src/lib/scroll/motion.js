// Shared smooth-scroll + motion state. A module store rather than Svelte
// context, because context does not flow into slotted children: a
// <ScrubbedSequence> placed inside <ScrollScaffold>'s slot is owned by the
// page, not the scaffold, so it could not read scaffold context. Importing
// this store sidesteps that entirely.

import { writable } from "svelte/store";

// { ready: bool, reduced: bool } - ready flips true once we've decided
// between smooth-scroll and reduced-motion, so sequences know when to wire
// their ScrollTriggers.
export const motionState = writable({ ready: false, reduced: false });

let started = false;
let teardown = () => {};

// Initialize Lenis + GSAP ScrollTrigger once for the whole page. Safe to
// call from any component's onMount; only the first call does work.
// Returns a cleanup function.
export async function initMotion() {
  if (typeof window === "undefined") return () => {};
  if (started) return teardown;
  started = true;

  const reduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const { gsap } = await import("gsap");
  const { ScrollTrigger } = await import("gsap/ScrollTrigger");
  gsap.registerPlugin(ScrollTrigger);

  if (reduced) {
    // No Lenis. Sequences render their stills layout; ScrollTrigger is
    // not used for pinning in this mode.
    motionState.set({ ready: true, reduced: true });
    teardown = () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
      started = false;
    };
    return teardown;
  }

  const Lenis = (await import("lenis")).default;
  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => 1 - Math.pow(1 - t, 3),
    smoothWheel: true,
    syncTouch: false,
  });

  lenis.on("scroll", ScrollTrigger.update);
  const tick = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  motionState.set({ ready: true, reduced: false });
  ScrollTrigger.refresh();

  teardown = () => {
    gsap.ticker.remove(tick);
    ScrollTrigger.getAll().forEach((t) => t.kill());
    lenis.destroy();
    started = false;
  };
  return teardown;
}
