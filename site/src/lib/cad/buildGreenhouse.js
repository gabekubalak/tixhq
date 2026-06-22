// A simple but recognizable 3D twin of the V1 hoop house: galvanized
// steel hoops, end walls, translucent plastic skin, a door, plus inside:
// NFT beds with rows of plants, a reservoir, a manifold, the composter.
//
// Everything is parameterized so the geometry follows the dimensions
// object passed in (see dimensionsGreenhouse.js).

import * as THREE from "three";

const MAT = {
  ground:   new THREE.MeshStandardMaterial({ color: 0xc3b485, roughness: 0.95 }),
  hoop:     new THREE.MeshStandardMaterial({ color: 0xc7cdd2, roughness: 0.35, metalness: 0.85 }),
  endFrame: new THREE.MeshStandardMaterial({ color: 0x8c6b48, roughness: 0.7,  metalness: 0.05 }),
  baseRail: new THREE.MeshStandardMaterial({ color: 0xa0a6ab, roughness: 0.45, metalness: 0.85 }),
  plastic:  new THREE.MeshPhysicalMaterial({
              color: 0xffffff, roughness: 0.55, metalness: 0.0,
              transmission: 0.78, thickness: 0.02, transparent: true, opacity: 0.45,
              side: THREE.DoubleSide,
            }),
  door:     new THREE.MeshStandardMaterial({ color: 0x6b4c2a, roughness: 0.8 }),
  doorGlass:new THREE.MeshPhysicalMaterial({
              color: 0xb8c8d2, roughness: 0.2, transmission: 0.65, transparent: true, opacity: 0.4
            }),
  bed:      new THREE.MeshStandardMaterial({ color: 0xb8b5ad, roughness: 0.5 }),
  bedTrim:  new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.7 }),
  water:    new THREE.MeshPhysicalMaterial({
              color: 0x4a7fb0, roughness: 0.1, transmission: 0.5, transparent: true, opacity: 0.7
            }),
  tank:     new THREE.MeshStandardMaterial({ color: 0x9aa3aa, roughness: 0.35, metalness: 0.85 }),
  slurry:   new THREE.MeshStandardMaterial({ color: 0x5a4a32, roughness: 0.85 }),
  pipe:     new THREE.MeshStandardMaterial({ color: 0xbfa973, roughness: 0.4, metalness: 0.4 }),
  composter:new THREE.MeshStandardMaterial({ color: 0x4a3a26, roughness: 0.7 }),
  composterLid: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 }),
  vent:     new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.5, metalness: 0.4 }),
};

const STEM_MAT = new THREE.MeshStandardMaterial({ color: 0x4a7a2a, roughness: 0.85 });

function _plantClump(rngSeed) {
  // Lightweight lettuce-ish clump: 5 to 7 small leaf cones around a stem.
  const g = new THREE.Group();
  const leafColor = new THREE.Color().setHSL(0.30 + (rngSeed % 13) * 0.005, 0.5, 0.45);
  const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.75 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.008, 0.03), STEM_MAT);
  stem.position.y = 0.015;
  g.add(stem);
  const n = 5 + (rngSeed % 3);
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 + (rngSeed % 7) * 0.1;
    const r = 0.04 + ((rngSeed + i * 17) % 11) * 0.0015;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 4), leafMat);
    leaf.scale.set(1.2, 0.5, 1.2);
    leaf.position.set(Math.cos(angle) * 0.025, 0.035, Math.sin(angle) * 0.025);
    leaf.rotation.y = angle;
    g.add(leaf);
  }
  return g;
}

function _hoop(span, rise, radius, segments = 28) {
  // Half-circle in the X-Y plane, parameterized as an arc.
  // The hoop goes from (-span/2, 0) up over (0, rise) to (+span/2, 0)
  const a = span / 2;
  const b = rise;
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI;
    pts.push(new THREE.Vector3(-Math.cos(t) * a, Math.sin(t) * b, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.TubeGeometry(curve, segments, radius, 10, false);
  return new THREE.Mesh(tube, MAT.hoop);
}

function _bed(width, length, depth, plantCount) {
  const g = new THREE.Group();
  g.userData.partId = "bed";
  const trough = new THREE.Mesh(
    new THREE.BoxGeometry(length, depth, width),
    MAT.bed
  );
  trough.position.y = depth / 2;
  g.add(trough);
  // Water film inside
  const film = new THREE.Mesh(
    new THREE.BoxGeometry(length - 0.04, 0.012, width - 0.04),
    MAT.water
  );
  film.position.y = depth - 0.006;
  g.add(film);
  // Plants in two rows along the length
  for (let i = 0; i < plantCount; i++) {
    const xs = (i + 0.5) * (length / plantCount) - length / 2;
    const plant = _plantClump(i * 7 + 3);
    plant.position.set(xs, depth, -width / 4);
    g.add(plant);
    const plant2 = _plantClump(i * 11 + 7);
    plant2.position.set(xs, depth, width / 4);
    g.add(plant2);
  }
  return g;
}

export function buildGreenhouse(dims) {
  const root = new THREE.Group();
  root.userData.partId = "greenhouse";

  const W = dims.width_m;
  const L = dims.length_m;
  const H = dims.peak_height_m;
  const sidewall = dims.sidewall_height_m;
  const skinR = dims.skin_radius_m;

  // Ground patch under the greenhouse
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 1.8, L * 1.8),
    MAT.ground
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  // Sidewall stub-walls (low knee walls below where the hoops sit)
  if (sidewall > 0.01) {
    const left = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, sidewall, L),
      MAT.baseRail
    );
    left.position.set(-W / 2, sidewall / 2, 0);
    root.add(left);
    const right = left.clone();
    right.position.x = W / 2;
    root.add(right);
  }

  // Galvanized hoops along the length
  const archRise = H - sidewall;
  const archGroup = new THREE.Group();
  archGroup.userData.partId = "frame";
  for (let i = 0; i < dims.hoop_count; i++) {
    const t = dims.hoop_count === 1 ? 0.5 : i / (dims.hoop_count - 1);
    const z = (t - 0.5) * L;
    const hoop = _hoop(W, archRise, 0.018, 28);
    hoop.position.y = sidewall;
    hoop.position.z = z;
    archGroup.add(hoop);
  }
  // Ridge purlin along the apex
  const ridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, L, 12),
    MAT.hoop
  );
  ridge.rotation.x = Math.PI / 2;
  ridge.position.set(0, H, 0);
  archGroup.add(ridge);
  root.add(archGroup);

  // Plastic skin: extruded along the same arc shape as the hoops
  const skinPts = [];
  const segs = 32;
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI;
    skinPts.push(new THREE.Vector2(-Math.cos(t) * (W / 2), Math.sin(t) * archRise));
  }
  const skinShape = new THREE.Shape(skinPts);
  // Use a hollow strip rather than a filled shape so we don't render a
  // back face inside the greenhouse.
  const skinCurve = new THREE.CatmullRomCurve3(
    skinPts.map((p) => new THREE.Vector3(p.x, p.y + sidewall, 0))
  );
  const skinGeo = new THREE.TubeGeometry(skinCurve, segs * 2, 0.005, 16, false);
  // To get a "skin" we sweep a thin tube along the arch and extrude in Z.
  // Simpler approach: make a ParametricGeometry-equivalent by stacking
  // line strips. For brevity here, use a translucent extruded shape:
  const extrudeSettings = { depth: L, bevelEnabled: false, steps: 1 };
  const skinShape2 = new THREE.Shape();
  skinShape2.moveTo(skinPts[0].x, skinPts[0].y + sidewall);
  for (let i = 1; i < skinPts.length; i++) {
    skinShape2.lineTo(skinPts[i].x, skinPts[i].y + sidewall);
  }
  skinShape2.lineTo(skinPts[skinPts.length - 1].x, sidewall);
  skinShape2.lineTo(skinPts[0].x, sidewall);
  skinShape2.closePath();
  const skin = new THREE.Mesh(
    new THREE.ExtrudeGeometry(skinShape2, extrudeSettings),
    MAT.plastic
  );
  skin.position.z = -L / 2;
  skin.userData.partId = "skin";
  root.add(skin);

  // End walls
  const endWallShape = new THREE.Shape();
  endWallShape.moveTo(skinPts[0].x, sidewall);
  endWallShape.lineTo(skinPts[0].x, skinPts[0].y + sidewall);
  for (let i = 1; i < skinPts.length; i++) {
    endWallShape.lineTo(skinPts[i].x, skinPts[i].y + sidewall);
  }
  endWallShape.lineTo(skinPts[skinPts.length - 1].x, sidewall);
  endWallShape.closePath();
  // Subtract a door cutout from the south end
  const doorH = Math.min(2.0, H * 0.85);
  const doorW = 0.85;
  const doorHole = new THREE.Path();
  doorHole.moveTo(-doorW / 2, sidewall);
  doorHole.lineTo(doorW / 2, sidewall);
  doorHole.lineTo(doorW / 2, sidewall + doorH);
  doorHole.lineTo(-doorW / 2, sidewall + doorH);
  doorHole.closePath();
  endWallShape.holes.push(doorHole);
  const endWallGeo = new THREE.ExtrudeGeometry(endWallShape, { depth: 0.04, bevelEnabled: false });
  const endSouth = new THREE.Mesh(endWallGeo, MAT.plastic);
  endSouth.position.z = L / 2;
  endSouth.userData.partId = "endwall.south";
  root.add(endSouth);
  // North end wall (no door)
  const endNorthShape = endWallShape.clone();
  endNorthShape.holes = [];
  const endNorthGeo = new THREE.ExtrudeGeometry(endNorthShape, { depth: 0.04, bevelEnabled: false });
  const endNorth = new THREE.Mesh(endNorthGeo, MAT.plastic);
  endNorth.position.z = -L / 2 - 0.04;
  endNorth.userData.partId = "endwall.north";
  root.add(endNorth);
  // End-wall vertical framing (visible wood like in the photo)
  for (const z of [-L / 2 - 0.02, L / 2 + 0.02]) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, archRise + sidewall, 0.05),
      MAT.endFrame
    );
    post.position.set(0, (archRise + sidewall) / 2, z);
    root.add(post);
  }

  // The door itself (slightly open, hinged on the right)
  const doorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(doorW, doorH, 0.04),
    MAT.door
  );
  // Slight rotation so it reads as ajar
  const doorPivot = new THREE.Group();
  doorPivot.position.set(doorW / 2, sidewall + doorH / 2, L / 2 + 0.02);
  doorPivot.rotation.y = -0.25;
  doorMesh.position.x = -doorW / 2;
  doorPivot.add(doorMesh);
  // Small glass window
  const window = new THREE.Mesh(
    new THREE.PlaneGeometry(doorW * 0.6, doorH * 0.4),
    MAT.doorGlass
  );
  window.position.set(-doorW / 2, doorH * 0.18, 0.022);
  doorPivot.add(window);
  doorPivot.userData.partId = "door";
  root.add(doorPivot);

  // Vents (passive wax-cylinder vents in each end wall, near the apex)
  for (const z of [-L / 2 - 0.04, L / 2 + 0.04]) {
    const vent = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.25, 0.05),
      MAT.vent
    );
    vent.position.set(0, sidewall + archRise * 0.8, z);
    vent.userData.partId = z < 0 ? "vent.north" : "vent.south";
    root.add(vent);
  }

  // Interior: beds, reservoir, manifold, composter
  const interior = new THREE.Group();
  interior.userData.partId = "interior";

  // Lay out beds in two rows (west / east) along the length
  const aisleW = 0.7;
  const bedW = (W - 0.4 - aisleW) / 2;
  const bedRows = ["west", "east"];
  const bedsPerRow = Math.max(1, Math.floor(dims.beds / 2));
  let beddedSoFar = 0;
  for (const row of bedRows) {
    const rowOffset = row === "west" ? -(aisleW / 2 + bedW / 2) : (aisleW / 2 + bedW / 2);
    for (let i = 0; i < bedsPerRow && beddedSoFar < dims.beds; i++) {
      const bedLen = (L - 1.8) / bedsPerRow;
      const z = (i - (bedsPerRow - 1) / 2) * (bedLen + 0.1);
      const bed = _bed(bedW, bedLen, 0.12, 6);
      bed.position.set(rowOffset, 0.5, z);
      bed.userData = { partId: `bed.${beddedSoFar}`, label: `Bed ${beddedSoFar}` };
      // Legs under each bed
      for (const dx of [-bedLen / 2 + 0.1, bedLen / 2 - 0.1]) {
        for (const dz of [-bedW / 2 + 0.1, bedW / 2 - 0.1]) {
          const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.5, 0.04),
            MAT.bedTrim
          );
          leg.position.set(dx, -0.25, dz);
          bed.add(leg);
        }
      }
      interior.add(bed);
      beddedSoFar++;
    }
  }

  // Reservoir (galvanized stock tank) at the north end
  const tankR = 0.45, tankH = 0.55;
  const tankWall = new THREE.Mesh(
    new THREE.CylinderGeometry(tankR, tankR, tankH, 32, 1, true),
    MAT.tank
  );
  tankWall.position.set(-W / 2 + tankR + 0.2, tankH / 2, -L / 2 + tankR + 0.4);
  tankWall.userData.partId = "reservoir";
  interior.add(tankWall);
  const tankWater = new THREE.Mesh(
    new THREE.CylinderGeometry(tankR - 0.02, tankR - 0.02, tankH * 0.6, 32),
    MAT.water
  );
  tankWater.position.copy(tankWall.position);
  tankWater.position.y = tankH * 0.3;
  tankWater.userData.partId = "reservoir.water";
  interior.add(tankWater);

  // Composter drum, outside (or in a corner)
  const compR = 0.25, compH = 0.55;
  const composter = new THREE.Mesh(
    new THREE.CylinderGeometry(compR, compR, compH, 24),
    MAT.composter
  );
  composter.position.set(W / 2 + compR + 0.4, compH / 2, -L / 2 + compR + 0.4);
  composter.userData.partId = "composter";
  interior.add(composter);
  const compLid = new THREE.Mesh(
    new THREE.CylinderGeometry(compR * 1.05, compR * 1.05, 0.04, 24),
    MAT.composterLid
  );
  compLid.position.copy(composter.position);
  compLid.position.y = compH + 0.02;
  compLid.userData.partId = "composter.lid";
  interior.add(compLid);

  // Brass-colored slurry/recirculation lines from tank to a long supply
  // pipe down the aisle and back from the beds
  const supplyZ = -L / 2 + 0.6;
  const supplyPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, L - 1.5, 12),
    MAT.pipe
  );
  supplyPipe.rotation.x = Math.PI / 2;
  supplyPipe.position.set(0, 0.45, 0);
  supplyPipe.userData.partId = "supply.line";
  interior.add(supplyPipe);
  // Risers from the tank up to the supply
  const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.4, 12), MAT.pipe);
  riser.position.set(tankWall.position.x, 0.45, tankWall.position.z);
  interior.add(riser);

  root.add(interior);
  return root;
}
