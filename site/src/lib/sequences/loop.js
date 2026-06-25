// Beat 4: the closed compost-to-greens loop. Camera dives into the
// composter, lid lifts, status LED transitions to thermophilic, slurry
// tank fills, a glowing pulse travels up the supply pipe, a plant on
// shelf 2 grows.
//
// Pure function of t in [0, 1]. init() adds exactly two extra meshes
// (the pulse sphere and a centerpiece lettuce clump on shelf 2) so the
// per-frame apply() can stay a pure mutation.

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
const STATUS_GREEN = new THREE.Color(0x00ff60);
const STATUS_AMBER = new THREE.Color(0xffb020);

function makePulse() {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffd070,
      emissive: 0xffb030,
      emissiveIntensity: 1.6,
    })
  );
  m.visible = false;
  return m;
}

function makeHeroLettuce() {
  const g = new THREE.Group();
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x6fb07a,
    roughness: 0.7,
  });
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.012, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x4a7a2a, roughness: 0.85 })
  );
  stem.position.y = 0.025;
  g.add(stem);
  // Seven leaf bulbs around the center, slightly varied in deterministic
  // increments (no Math.random()).
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const r = 0.05 + (i % 3) * 0.004;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), leafMat);
    leaf.scale.set(1.25, 0.55, 1.25);
    leaf.position.set(Math.cos(a) * 0.03, 0.05, Math.sin(a) * 0.03);
    g.add(leaf);
  }
  return g;
}

// Pipe endpoints, in cabinet local space, copied from how
// buildAppliance.buildReservoirs lays out the pipe between the slurry
// tank and the reservoir row.
function pipeEndpoints(dims) {
  const s = dims.slurry_tank;
  const r = dims.reservoirs;
  const [sx, sy, sz] = s.position;
  const [rx, ry, rz] = r.row_origin;
  const start = new THREE.Vector3(
    sx,
    sy + s.height * 0.7,
    sz - s.depth / 2
  );
  const end = new THREE.Vector3(rx, ry + r.height * 0.85, rz);
  return { start, end };
}

export function init(scene, parts, dims) {
  const pulse = makePulse();
  scene.add(pulse);

  const hero = makeHeroLettuce();
  // Park it on shelf 2's tray.
  const rack = dims.racks[0];
  const trayY = rack.shelf_lowest_y + 2 * rack.shelf_pitch + rack.tray.height;
  const trayCenterZ = rack.z - rack.tray.depth / 2 - 0.06;
  hero.position.set(rack.x, trayY, trayCenterZ);
  hero.scale.setScalar(0.0001); // start invisible
  scene.add(hero);

  // Cache the original slurry tank Y so we can grow it from the floor.
  const slurry = parts.get("slurry_tank");
  const slurryOrigY = slurry ? slurry.position.y : 0;
  const slurryOrigScale = slurry ? slurry.scale.y : 1;

  return {
    pulse,
    hero,
    slurry,
    slurryOrigY,
    slurryOrigScale,
    pipe: pipeEndpoints(dims),
  };
}

export function apply(t, scene, parts, dims, camera, state) {
  const W = dims.cabinet.width;
  const H = dims.cabinet.height;
  const D = dims.cabinet.depth;

  scene.background = scene.background || new THREE.Color();
  scene.background.copy(PAPER);

  // Camera phases:
  //  0.00-0.20  hero pose -> close on composter
  //  0.20-0.40  hold on composter as status LED warms
  //  0.40-0.55  pan toward slurry tank as it fills
  //  0.55-0.75  follow pipe up to reservoirs
  //  0.75-1.00  pull back and up to a 3/4 shelf view
  const heroPos = [W * 1.6, H * 0.55, W * 1.8];
  const composterPos = [W * 0.55, H * 0.30, W * 0.55];
  const slurryClose  = [W * 0.20, H * 0.55, W * 0.85];
  const pipeMid      = [W * 0.05, H * 0.85, W * 1.10];
  const shelvesBack  = [W * 1.4, H * 0.95, W * 1.6];

  const composterTgt = [-0.11, 0.17, -0.26];
  const slurryTgt    = [-0.11, 0.45, -0.46];
  const pipeMidTgt   = [0.03, 0.55, -0.30];
  const shelvesTgt   = [0, H * 0.55, -D / 2];

  const tmpPos = new THREE.Vector3();
  const tmpTgt = new THREE.Vector3();

  if (t < 0.20) {
    const u = slice(t, 0.00, 0.20);
    lerpVec3(tmpPos, heroPos, composterPos, u);
    lerpVec3(tmpTgt, shelvesTgt, composterTgt, u);
  } else if (t < 0.40) {
    tmpPos.set(...composterPos);
    tmpTgt.set(...composterTgt);
  } else if (t < 0.55) {
    const u = slice(t, 0.40, 0.55);
    lerpVec3(tmpPos, composterPos, slurryClose, u);
    lerpVec3(tmpTgt, composterTgt, slurryTgt, u);
  } else if (t < 0.75) {
    const u = slice(t, 0.55, 0.75);
    lerpVec3(tmpPos, slurryClose, pipeMid, u);
    lerpVec3(tmpTgt, slurryTgt, pipeMidTgt, u);
  } else {
    const u = slice(t, 0.75, 1.00);
    lerpVec3(tmpPos, pipeMid, shelvesBack, u);
    lerpVec3(tmpTgt, pipeMidTgt, shelvesTgt, u);
  }
  camera.position.copy(tmpPos);
  camera.lookAt(tmpTgt);

  // Composter lid lifts during the dive.
  const composter = parts.get("composter");
  if (composter) {
    const lidU = slice(t, 0.00, 0.20);
    // The lid is the second child added by buildComposter (index 1).
    // Be defensive: walk children for the small lid box.
    const lid = composter.children.find((c) =>
      c.geometry &&
      c.geometry.parameters &&
      c.geometry.parameters.height === 0.025
    );
    if (lid) {
      lid.rotation.x = -0.6 * lidU;
      lid.position.y = dims.composter.height / 2 + 0.0125 + lidU * 0.04;
    }
  }

  // Status LED: green -> amber as thermophilic phase establishes.
  if (composter) {
    const statusU = slice(t, 0.20, 0.40);
    const statusLed = composter.children.find(
      (c) => c.material && c.material.emissive && c.geometry?.type === "SphereGeometry"
    );
    if (statusLed) {
      statusLed.material.color.copy(STATUS_GREEN).lerp(STATUS_AMBER, statusU);
      statusLed.material.emissive.copy(STATUS_GREEN).lerp(STATUS_AMBER, statusU);
      statusLed.material.emissiveIntensity = 0.9 + statusU * 0.8;
    }
  }

  // Pathogen-kill gate opens: slurry tank grows from the floor.
  if (state.slurry) {
    const fillU = slice(t, 0.40, 0.55);
    const minScale = 0.2;
    const sy = minScale + (state.slurryOrigScale - minScale) * fillU;
    state.slurry.scale.y = sy;
    const fullH = dims.slurry_tank.height;
    state.slurry.position.y =
      state.slurryOrigY - (fullH / 2) * (state.slurryOrigScale - sy);
  }

  // Pulse travels up the pipe.
  if (state.pulse) {
    const pipeU = slice(t, 0.55, 0.75);
    if (pipeU > 0 && pipeU < 1.001) {
      state.pulse.visible = true;
      state.pulse.position
        .copy(state.pipe.start)
        .lerp(state.pipe.end, pipeU);
    } else {
      state.pulse.visible = false;
    }
  }

  // Hero lettuce grows on shelf 2.
  if (state.hero) {
    const growU = slice(t, 0.75, 1.00);
    const s = 0.0001 + growU * 0.9999;
    state.hero.scale.setScalar(s);
  }

  // Light shelf 2 from the moment we arrive at it, so the lettuce reads.
  const led2 = parts.get(`shelf.2.led`);
  if (led2) {
    const lightU = slice(t, 0.70, 0.90);
    led2.material.emissiveIntensity = lightU * 0.95;
    if (led2.userData.light) led2.userData.light.intensity = lightU * 5.5;
  }
}
