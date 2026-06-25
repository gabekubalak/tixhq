// Beat 3: the cabinet arrives from darkness, the four shelves light one
// by one. Pure function of t in [0, 1]. No closures over time, no random
// state, no requestAnimationFrame: the same t always produces the same
// pixels so the Playwright capture can step deterministically.

import * as THREE from "three";

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// Smooth a 0..1 slice with a cubic ease (3t^2 - 2t^3).
function slice(t, lo, hi) {
  if (hi <= lo) return t >= hi ? 1 : 0;
  const u = clamp01((t - lo) / (hi - lo));
  return u * u * (3 - 2 * u);
}

function lerpVec3(out, a, b, u) {
  out.set(
    a[0] + (b[0] - a[0]) * u,
    a[1] + (b[1] - a[1]) * u,
    a[2] + (b[2] - a[2]) * u
  );
}

const PAPER = new THREE.Color(0xf4f1ea);
const BLACK = new THREE.Color(0x000000);

// No mounted-once state needed: this scene only mutates props already
// created by buildAppliance(). init returns an empty state.
export function init(_scene, _parts, _dims) {
  return {};
}

export function apply(t, scene, parts, dims, camera, _state) {
  const W = dims.cabinet.width;
  const H = dims.cabinet.height;
  const D = dims.cabinet.depth;

  // Camera path: fly in from far high-right to the hero 3/4 pose.
  const camIn = slice(t, 0.0, 0.30);
  const fromPos = [W * 3.0, H * 1.8, W * 3.0];
  const toPos   = [W * 1.6, H * 0.55, W * 1.8];
  const fromTgt = [0, H * 0.7, -D / 2];
  const toTgt   = [0, H * 0.4, -D / 2];

  const tmpPos = new THREE.Vector3();
  const tmpTgt = new THREE.Vector3();
  lerpVec3(tmpPos, fromPos, toPos, camIn);
  lerpVec3(tmpTgt, fromTgt, toTgt, camIn);
  camera.position.copy(tmpPos);
  camera.lookAt(tmpTgt);

  // Background: black -> paper over the same slice.
  scene.background = scene.background || new THREE.Color();
  scene.background.copy(BLACK).lerp(PAPER, camIn);

  // Shelves light in order. Each ramp is 15% of t.
  const SHELF_RAMPS = [
    [0.40, 0.55], // shelf 0
    [0.55, 0.70], // shelf 1
    [0.70, 0.85], // shelf 2
    [0.85, 1.00], // shelf 3
  ];
  for (let s = 0; s < 4; s++) {
    const led = parts.get(`shelf.${s}.led`);
    if (!led) continue;
    const [lo, hi] = SHELF_RAMPS[s];
    const u = slice(t, lo, hi);
    led.material.emissiveIntensity = u * 0.95;
    if (led.userData.light) {
      led.userData.light.intensity = u * 5.5;
    }
  }
}
