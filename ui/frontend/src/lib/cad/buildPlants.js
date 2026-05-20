import * as THREE from "three";

// Procedural plants. Geometry by phase, scale by leaf_area_cm2,
// hue by color_health. Each shelf gets a `THREE.Group` we can swap out
// when the phase changes.

const PLANTS_PER_TRAY = 6;
const SEED_MAT = new THREE.MeshStandardMaterial({
  color: 0x6aaa3c, roughness: 0.9,
});
const STEM_MAT = new THREE.MeshStandardMaterial({
  color: 0x4a7a2a, roughness: 0.85,
});
const POT_MAT = new THREE.MeshStandardMaterial({
  color: 0x3a2a1a, roughness: 0.95,
});

function healthColor(color_health) {
  const h = Math.max(0, Math.min(1, color_health ?? 0.7));
  // HSL 90° (yellow-green) → 130° (deep green)
  const hue = (90 + 40 * h) / 360;
  const sat = 0.5 + 0.3 * h;
  const lig = 0.45 + 0.10 * (1 - h);
  return new THREE.Color().setHSL(hue, sat, lig);
}

function leafGeometry() {
  // A thin curved-ish leaf: an elongated triangle made from a Shape.
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.5, 0.35, 1.0, 0);
  shape.quadraticCurveTo(0.5, -0.05, 0, 0);
  const geom = new THREE.ShapeGeometry(shape);
  return geom;
}

const LEAF_GEOM = leafGeometry();

// A single plant: stem + crown of leaves arranged radially.
function makePlant(opts) {
  const {
    height,       // metres, tip of stem above tray surface
    leafCount,
    leafSize,
    color,
    withFlower = false,
    withGoldOutline = false,
  } = opts;
  const g = new THREE.Group();
  // Optional small pot/cup at the base (microgreens skip it).
  if (height > 0.04) {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.018, 0.025, 12),
      POT_MAT
    );
    pot.position.y = 0.0125;
    g.add(pot);
  }
  // Stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0035, 0.005, height, 8),
    STEM_MAT
  );
  stem.position.y = height / 2;
  g.add(stem);
  // Leaves arranged around the top of the stem with a slight droop.
  const leafMat = new THREE.MeshStandardMaterial({
    color, roughness: 0.85, side: THREE.DoubleSide, flatShading: false,
  });
  for (let i = 0; i < leafCount; i++) {
    const theta = (i / leafCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const droop = -0.25 + Math.random() * -0.2;
    const heightFrac = 0.7 + Math.random() * 0.3;
    const leaf = new THREE.Mesh(LEAF_GEOM, leafMat);
    leaf.scale.setScalar(leafSize);
    leaf.position.set(0, height * heightFrac, 0);
    leaf.rotation.y = theta;
    leaf.rotation.z = droop;
    g.add(leaf);
    if (withGoldOutline) {
      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(LEAF_GEOM),
        new THREE.LineBasicMaterial({ color: 0xd4a017 })
      );
      outline.scale.copy(leaf.scale);
      outline.position.copy(leaf.position);
      outline.rotation.copy(leaf.rotation);
      g.add(outline);
    }
  }
  if (withFlower) {
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(
        new THREE.SphereGeometry(leafSize * 0.18, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xff66cc, emissive: 0x331122 })
      );
      const theta = (i / 3) * Math.PI * 2;
      f.position.set(
        Math.cos(theta) * leafSize * 0.25,
        height + leafSize * 0.1,
        Math.sin(theta) * leafSize * 0.25
      );
      g.add(f);
    }
  }
  return g;
}

function makeGermination(color) {
  // Tiny dome of soil bumps + a few sprouts.
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const sprout = new THREE.Mesh(
      new THREE.ConeGeometry(0.006, 0.018, 6),
      new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
    );
    sprout.position.set(
      (Math.random() - 0.5) * 0.04,
      0.009,
      (Math.random() - 0.5) * 0.04
    );
    sprout.rotation.z = (Math.random() - 0.5) * 0.3;
    g.add(sprout);
  }
  return g;
}

function plantForPhase(phase, leafArea, color_health) {
  const color = healthColor(color_health);
  switch (phase) {
    case "germination":
      return makeGermination(color);
    case "seedling":
      return makePlant({
        height: 0.04 + Math.min(0.04, leafArea / 800),
        leafCount: 4,
        leafSize: 0.025 + Math.min(0.02, leafArea / 1500),
        color,
      });
    case "harvest_ready":
      return makePlant({
        height: 0.13 + Math.min(0.04, leafArea / 2000),
        leafCount: 9,
        leafSize: 0.05 + Math.min(0.04, leafArea / 3000),
        color,
        withGoldOutline: true,
      });
    case "flower":
      return makePlant({
        height: 0.14, leafCount: 8, leafSize: 0.055, color,
        withFlower: true,
      });
    case "veg":
    case "veg_late":
    case "veg_early":
    default:
      return makePlant({
        height: 0.08 + Math.min(0.06, leafArea / 1000),
        leafCount: 6 + Math.floor(Math.min(4, leafArea / 60)),
        leafSize: 0.035 + Math.min(0.04, leafArea / 1500),
        color,
      });
  }
}

// Layout positions on a tray (a soft grid with jitter so the rows don't
// look like LEGO).
function* trayPositions(rack) {
  const cols = 3, rows = Math.ceil(PLANTS_PER_TRAY / 3);
  const tw = rack.tray.width  * 0.65;
  const td = rack.tray.depth  * 0.65;
  let i = 0;
  for (let r = 0; r < rows && i < PLANTS_PER_TRAY; r++) {
    for (let c = 0; c < cols && i < PLANTS_PER_TRAY; c++, i++) {
      const jx = (Math.random() - 0.5) * 0.04;
      const jz = (Math.random() - 0.5) * 0.04;
      yield [
        -tw / 2 + (c + 0.5) * (tw / cols) + jx,
        0,
        -td / 2 + (r + 0.5) * (td / rows) + jz,
      ];
    }
  }
}

export function buildPlantsForShelf(rack, shelfIndex, dims, vision) {
  const group = new THREE.Group();
  group.userData.partId = `shelf.${shelfIndex}.plants`;
  group.userData.phase = vision?.phase_estimate ?? "germination";

  const trayTopY = rack.shelf_lowest_y
    + shelfIndex * rack.shelf_pitch
    + rack.tray.height;            // tray rim top
  const trayCenterZ = rack.z - rack.tray.depth / 2 - 0.06;

  const phase = group.userData.phase;
  const leafArea = vision?.leaf_area_cm2 ?? 20;
  const health = vision?.color_health ?? 0.85;

  for (const [dx, _dy, dz] of trayPositions(rack)) {
    const plant = plantForPhase(phase, leafArea, health);
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
