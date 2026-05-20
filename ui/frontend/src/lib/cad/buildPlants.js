import * as THREE from "three";

const PLANTS_PER_TRAY = 6;

const STEM_MAT = new THREE.MeshStandardMaterial({ color: 0x4a7a2a, roughness: 0.85 });
const POT_MAT  = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.95 });

// Park-Miller LCG — deterministic, no external dep. Pass a seed based
// on shelf index so plants don't jump on every re-render.
function seededRng(seed) {
  let s = (seed + 1) * 16807;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function healthColor(color_health) {
  const h = Math.max(0, Math.min(1, color_health ?? 0.7));
  const hue = (90 + 40 * h) / 360;
  return new THREE.Color().setHSL(hue, 0.55 + 0.25 * h, 0.38 + 0.12 * (1 - h));
}

// Shared leaf geometry — a Shape-based curved leaf so it reads as organic,
// not as a flat triangle. DoubleSide so you see it from any angle.
const LEAF_SHAPE = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.3, 0.25, 0.8, 0.4, 1.0, 0);
  s.bezierCurveTo(0.8, -0.08, 0.3, -0.06, 0, 0);
  return s;
})();
const LEAF_GEOM = new THREE.ShapeGeometry(LEAF_SHAPE, 6);

function makeLeaf(size, color, rng, withGold = false) {
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.8, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(LEAF_GEOM, mat);
  m.scale.setScalar(size);
  m.rotation.y = rng() * Math.PI * 2;
  m.rotation.z = -(0.25 + rng() * 0.35);   // natural droop
  if (withGold) {
    const e = new THREE.LineSegments(
      new THREE.EdgesGeometry(LEAF_GEOM),
      new THREE.LineBasicMaterial({ color: 0xc8a000 })
    );
    e.scale.copy(m.scale);
    e.rotation.copy(m.rotation);
    return [m, e];
  }
  return [m];
}

function makePlant({ height, leafCount, leafSize, color, withGold = false, withFlower = false, rng }) {
  const g = new THREE.Group();
  if (height > 0.045) {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.018, 0.028, 14),
      POT_MAT
    );
    pot.position.y = 0.014;
    g.add(pot);
  }
  // Stem
  const stemH = Math.max(0.005, height);
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0032, 0.006, stemH, 8),
    STEM_MAT
  );
  stem.position.y = stemH / 2;
  g.add(stem);
  // Leaves arranged radially around the top third of the stem with jitter.
  const leafY0 = stemH * 0.60;
  for (let i = 0; i < leafCount; i++) {
    const angle = (i / leafCount) * Math.PI * 2 + rng() * 0.25;
    const yFrac = leafY0 + (stemH - leafY0) * rng();
    const leaves = makeLeaf(leafSize * (0.85 + rng() * 0.3), color, rng, withGold);
    for (const l of leaves) {
      l.position.set(0, yFrac, 0);
      l.rotation.y += angle;
      g.add(l);
    }
  }
  if (withFlower) {
    const fmat = new THREE.MeshStandardMaterial({ color: 0xff55bb, emissive: 0x220011, roughness: 0.6 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const f = new THREE.Mesh(new THREE.SphereGeometry(leafSize * 0.17, 8, 6), fmat);
      f.position.set(Math.cos(a) * leafSize * 0.22, height + leafSize * 0.08, Math.sin(a) * leafSize * 0.22);
      g.add(f);
    }
  }
  return g;
}

function makeGermination(color, rng) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  for (let i = 0; i < 7; i++) {
    const sprout = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.016 + rng() * 0.012, 6), mat);
    sprout.position.set((rng() - 0.5) * 0.05, 0.008, (rng() - 0.5) * 0.05);
    sprout.rotation.z = (rng() - 0.5) * 0.35;
    g.add(sprout);
  }
  return g;
}

function plantForPhase(phase, leafArea, color_health, rng) {
  const color = healthColor(color_health);
  switch (phase) {
    case "germination":
      return makeGermination(color, rng);
    case "seedling":
      return makePlant({ height: 0.038 + Math.min(0.032, leafArea / 900), leafCount: 4,
        leafSize: 0.022 + Math.min(0.018, leafArea / 1600), color, rng });
    case "harvest_ready":
      return makePlant({ height: 0.13 + Math.min(0.05, leafArea / 1800), leafCount: 10,
        leafSize: 0.052 + Math.min(0.036, leafArea / 2600), color, withGold: true, rng });
    case "flower":
      return makePlant({ height: 0.14, leafCount: 9, leafSize: 0.055, color, withFlower: true, rng });
    case "veg":
    case "veg_late":
    case "veg_early":
    default:
      return makePlant({ height: 0.075 + Math.min(0.06, leafArea / 1100),
        leafCount: 6 + Math.min(4, Math.floor(leafArea / 55)),
        leafSize: 0.034 + Math.min(0.038, leafArea / 1400), color, rng });
  }
}

// Deterministic grid-with-jitter positions based on tray size + shelf index.
function trayPositions(rack, shelfIndex) {
  const rng = seededRng(shelfIndex * 37 + 13);
  const cols = 3, rows = Math.ceil(PLANTS_PER_TRAY / 3);
  const tw = rack.tray.width  * 0.62;
  const td = rack.tray.depth  * 0.62;
  const pts = [];
  for (let r = 0; r < rows && pts.length < PLANTS_PER_TRAY; r++) {
    for (let c = 0; c < cols && pts.length < PLANTS_PER_TRAY; c++) {
      pts.push([
        -tw / 2 + (c + 0.5) * (tw / cols) + (rng() - 0.5) * 0.04,
        0,
        -td / 2 + (r + 0.5) * (td / rows) + (rng() - 0.5) * 0.04,
      ]);
    }
  }
  return pts;
}

export function buildPlantsForShelf(rack, shelfIndex, dims, vision) {
  const group = new THREE.Group();
  group.userData.partId  = `shelf.${shelfIndex}.plants`;
  group.userData.phase   = vision?.phase_estimate ?? "germination";

  const trayTopY    = rack.shelf_lowest_y + shelfIndex * rack.shelf_pitch + rack.tray.height;
  const trayCenterZ = rack.z - rack.tray.depth / 2 - 0.06;
  const phase       = group.userData.phase;
  const leafArea    = vision?.leaf_area_cm2 ?? 20;
  const health      = vision?.color_health  ?? 0.85;

  const positions = trayPositions(rack, shelfIndex);
  for (let i = 0; i < positions.length; i++) {
    // Each plant gets its own rng seeded by (shelf, plant-index) so leaf
    // angles are stable on re-render but different per plant.
    const rng = seededRng(shelfIndex * 100 + i);
    const plant = plantForPhase(phase, leafArea, health, rng);
    const [dx, , dz] = positions[i];
    plant.position.set(rack.x + dx, trayTopY, trayCenterZ + dz);
    group.add(plant);
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
