import * as THREE from "three";

// Procedural plants. Geometry by phase, scale by leaf_area_cm2,
// hue by color_health. Each shelf gets a `THREE.Group` we can swap out
// when the phase changes.

const PLANTS_PER_TRAY = 6;
const GERMINATION_MAT = new THREE.MeshStandardMaterial({ color: 0x6aaa3c, roughness: 0.9 });

function makeGeometry(phase) {
  switch (phase) {
    case "germination":
      return new THREE.SphereGeometry(1, 8, 6);
    case "seedling":
      return new THREE.ConeGeometry(0.7, 1.6, 8);
    case "harvest_ready":
    case "veg":
    case "veg_late":
    case "veg_early":
      return new THREE.IcosahedronGeometry(1, 1);
    case "flower":
      return new THREE.IcosahedronGeometry(1, 1);
    default:
      return new THREE.SphereGeometry(1, 8, 6);
  }
}

function leafScale(leaf_area_cm2) {
  // empirical: r ≈ sqrt(A/π), in cm → metres.
  const cm = Math.sqrt(Math.max(1, leaf_area_cm2 ?? 1) / Math.PI);
  return cm / 100;
}

function healthColor(color_health) {
  const h = Math.max(0, Math.min(1, color_health ?? 0.7));
  // HSL 90° (yellow-green) → 130° (deep green)
  const hue = (90 + 40 * h) / 360;
  const sat = 0.5 + 0.3 * h;
  const lig = 0.45 + 0.10 * (1 - h);
  return new THREE.Color().setHSL(hue, sat, lig);
}

// Layout PLANTS_PER_TRAY positions on a tray.
function* trayPositions(rack) {
  const cols = 3, rows = Math.ceil(PLANTS_PER_TRAY / 3);
  const tw = rack.tray.width  * 0.7;
  const td = rack.tray.depth  * 0.7;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols && r * cols + c < PLANTS_PER_TRAY; c++) {
      yield [
        -tw / 2 + (c + 0.5) * (tw / cols),
        0,
        -td / 2 + (r + 0.5) * (td / rows),
      ];
    }
  }
}

export function buildPlantsForShelf(rack, shelfIndex, dims, vision) {
  const group = new THREE.Group();
  group.userData.partId = `shelf.${shelfIndex}.plants`;
  const phase = vision?.phase_estimate ?? "germination";
  const geom = makeGeometry(phase);
  const scale = leafScale(vision?.leaf_area_cm2);
  const baseColor = healthColor(vision?.color_health);

  const trayY = rack.shelf_lowest_y + shelfIndex * rack.shelf_pitch + rack.tray.height;
  const trayCenterZ = rack.z - rack.tray.depth / 2 - 0.06;

  for (const [dx, _dy, dz] of trayPositions(rack)) {
    const mat = (phase === "germination" ? GERMINATION_MAT : new THREE.MeshStandardMaterial({
      color: baseColor, roughness: 0.85, flatShading: true,
    }));
    const m = new THREE.Mesh(geom, mat);
    m.position.set(rack.x + dx, trayY + scale, trayCenterZ + dz);
    m.scale.setScalar(Math.max(0.01, scale));
    group.add(m);

    if (phase === "harvest_ready") {
      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(geom),
        new THREE.LineBasicMaterial({ color: 0xd4a017 })
      );
      outline.position.copy(m.position);
      outline.scale.copy(m.scale);
      group.add(outline);
    }
  }

  return group;
}

export function buildAllPlants(dims, visionByShelf = {}) {
  const root = new THREE.Group();
  root.userData.partId = "plants.root";
  for (const rack of dims.racks) {
    for (let s = 0; s < rack.shelves; s++) {
      root.add(buildPlantsForShelf(rack, s, dims, visionByShelf[s]));
    }
  }
  return root;
}
