// Beat 6 (one mind, many bodies): the same KrattOS brain runs out in a
// 14x30 hoop house. Camera arrives outside, circles to the door, then
// flies in down the center aisle past the NFT beds.
//
// Pure function of t in [0, 1]. The greenhouse is much larger than the
// cabinet so all camera distances are in metres, not cabinet-widths.

import * as THREE from "three";

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

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
const DUSK = new THREE.Color(0xe8d8b8); // warm pre-dawn tone for the open

export function init(_scene, _parts, _dims) {
  return {};
}

export function apply(t, scene, parts, dims, camera, _state) {
  const W = dims.width_m;        // 4.27
  const L = dims.length_m;       // 9.14
  const H = dims.peak_height_m;  // 2.44

  scene.background = scene.background || new THREE.Color();
  scene.background.copy(DUSK).lerp(PAPER, slice(t, 0.0, 0.4));

  // Camera arc:
  //   0.00-0.25  far establishing 3/4 shot from southeast, low sun
  //   0.25-0.50  drift in toward the south door
  //   0.50-1.00  fly down the aisle, ending looking down its length
  const farPos    = [W * 2.4, H * 1.4, L * 0.95];
  const farTgt    = [0, H * 0.55, 0];

  const doorPos   = [W * 0.4, H * 0.55, L * 0.75];
  const doorTgt   = [0, H * 0.45, L * 0.35];

  const aisleInPos  = [0, H * 0.55, L * 0.40];
  const aisleInTgt  = [0, H * 0.45, 0];

  const aisleEndPos = [0, H * 0.55, L * 0.10];
  const aisleEndTgt = [0, H * 0.45, -L * 0.45];

  const tmpPos = new THREE.Vector3();
  const tmpTgt = new THREE.Vector3();

  if (t < 0.25) {
    const u = slice(t, 0.00, 0.25);
    lerpVec3(tmpPos, farPos, doorPos, u);
    lerpVec3(tmpTgt, farTgt, doorTgt, u);
  } else if (t < 0.50) {
    const u = slice(t, 0.25, 0.50);
    lerpVec3(tmpPos, doorPos, aisleInPos, u);
    lerpVec3(tmpTgt, doorTgt, aisleInTgt, u);
  } else {
    const u = slice(t, 0.50, 1.00);
    lerpVec3(tmpPos, aisleInPos, aisleEndPos, u);
    lerpVec3(tmpTgt, aisleInTgt, aisleEndTgt, u);
  }
  camera.position.copy(tmpPos);
  camera.lookAt(tmpTgt);
}
