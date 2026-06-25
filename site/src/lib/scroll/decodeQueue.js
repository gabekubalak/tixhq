// Frame preloader for the scrubbed sequences. Loads + decodes WebP frames
// as HTMLImageElements so ScrubbedSequence can drawImage() them with no
// per-frame decode hitch. Never blocks first paint: the page renders the
// first frame as a plain <img> until the queue catches up, then upgrades
// to canvas scrubbing.

function pad(n, width = 4) {
  return String(n).padStart(width, "0");
}

// Build the URL for one frame at a given variant ("desktop" | "mobile").
export function frameUrl(scene, variant, index) {
  return `/sequence/${scene}/${variant}/frame-${pad(index)}.webp`;
}

// Load + decode a single frame. Resolves with the decoded HTMLImageElement,
// or rejects on network error.
function loadFrame(scene, variant, index) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.src = frameUrl(scene, variant, index);
    const done = () => resolve(img);
    if (img.decode) {
      img
        .decode()
        .then(done)
        .catch(() => {
          // decode() can reject for reasons that don't stop drawImage
          // (e.g. it raced the load); fall back to the load event.
          if (img.complete && img.naturalWidth > 0) done();
          else img.addEventListener("load", done, { once: true });
          img.addEventListener("error", reject, { once: true });
        });
    } else {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", reject, { once: true });
    }
  });
}

// Preload an entire scene with bounded concurrency. Returns
// { frames: (HTMLImageElement|null)[], ready: Promise<void>, loaded: () => number }.
// `frames` fills in as images resolve, so a scrubber can draw whatever is
// already present and improve as the rest arrive.
export function preloadScene(scene, variant, count, { concurrency = 8 } = {}) {
  const frames = new Array(count).fill(null);
  let loadedCount = 0;
  let next = 0;

  async function worker() {
    while (next < count) {
      const i = next++;
      try {
        frames[i] = await loadFrame(scene, variant, i);
      } catch {
        frames[i] = null; // leave a hole; scrubber holds the last good frame
      }
      loadedCount++;
    }
  }

  const workers = [];
  for (let w = 0; w < Math.min(concurrency, count); w++) {
    workers.push(worker());
  }
  const ready = Promise.all(workers).then(() => {});

  return {
    frames,
    ready,
    loaded: () => loadedCount,
  };
}

// Pick the variant for the current viewport. Mobile frames are half-width,
// so use them on small screens to halve bytes.
export function pickVariant() {
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia("(max-width: 768px)").matches ? "mobile" : "desktop";
}
