<script>
  // Boots the shared smooth-scroll engine once for the page, then renders
  // its children. All the real state lives in motion.js (a module store)
  // so slotted sequences can read it; see the note there about why this is
  // not a Svelte context.

  import { onMount } from "svelte";
  import { initMotion } from "./motion.js";

  onMount(() => {
    let cleanup = () => {};
    initMotion().then((fn) => (cleanup = fn));
    return () => cleanup();
  });
</script>

<slot />
