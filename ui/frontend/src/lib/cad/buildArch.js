import * as THREE from "three";

// 3D node-graph view of the GroveOS service architecture.
// Services are labelled boxes laid out on a horizontal plane;
// NATS subjects are coloured TubeGeometry curves between them.

const NS_COLOR = {
  "grove.zone":      0x4a8cff,
  "grove.manifold":  0x5dbdc7,
  "grove.planner":   0x4caf50,
  "grove.vision":    0xa040c0,
  "grove.composter": 0x8d6e3c,
  "grove.command":   0xff8c00,
  "grove.event":     0xe03030,
};

const SERVICES = [
  // [id, label, tier, x, z]
  // Tier 0 — MCUs at the back
  { id: "sensor-mcu",      label: "sensor-mcu (ESP32)",     tier: 0, x: -1.8, z: -1.0 },
  { id: "safety-mcu",      label: "safety-mcu (ESP32)",     tier: 0, x:  0.0, z: -1.0 },
  { id: "composter-mcu",   label: "composter-mcu (ESP32)",  tier: 0, x:  1.8, z: -1.0 },
  // Tier 1 — Python ingest + control
  { id: "sensor-ingest",   label: "sensor-ingest (py)",     tier: 1, x: -2.4, z:  0.2 },
  { id: "control-loop",    label: "control-loop (rs)",      tier: 1, x: -0.8, z:  0.2 },
  { id: "nutrient-mixer",  label: "nutrient-mixer (rs)",    tier: 1, x:  0.8, z:  0.2 },
  { id: "composter-ctrl",  label: "composter-ctrl (rs)",    tier: 1, x:  2.4, z:  0.2 },
  // Tier 2 — Planner + recipe + safety
  { id: "recipe-engine",   label: "recipe-engine (py)",     tier: 2, x: -2.4, z:  1.2 },
  { id: "ai-planner",      label: "ai-planner (py)",        tier: 2, x: -0.8, z:  1.2 },
  { id: "ai-vision",       label: "ai-vision (py)",         tier: 2, x:  0.8, z:  1.2 },
  { id: "safety-watcher",  label: "safety-watcher (rs)",    tier: 2, x:  2.4, z:  1.2 },
  // Tier 3 — UI + utility
  { id: "ui-backend",      label: "ui-backend (FastAPI)",   tier: 3, x: -1.4, z:  2.4 },
  { id: "ui-frontend",     label: "ui-frontend (SvelteKit)",tier: 3, x:  0.4, z:  2.4 },
  { id: "alerting",        label: "alerting (py)",          tier: 3, x:  2.0, z:  2.4 },
];

// Pubs/subs encode the directed flow; each edge is a NATS subject.
const EDGES = [
  // sensor frames flow MCU → ingest → planner/control/UI
  { from: "sensor-mcu",     to: "sensor-ingest",  subject: "usb.cdc.frame",                 ns: "grove.zone" },
  { from: "sensor-ingest",  to: "control-loop",   subject: "grove.zone.{N}.sensor.moisture", ns: "grove.zone" },
  { from: "sensor-ingest",  to: "ai-planner",     subject: "grove.zone.{N}.sensor.moisture", ns: "grove.zone" },
  { from: "sensor-ingest",  to: "ui-backend",     subject: "grove.zone.{N}.sensor.moisture", ns: "grove.zone" },
  { from: "sensor-ingest",  to: "nutrient-mixer", subject: "grove.manifold.sensor.*",        ns: "grove.manifold" },
  // recipe → planner → control / mixer
  { from: "recipe-engine",  to: "control-loop",   subject: "grove.planner.setpoint.{N}",     ns: "grove.planner" },
  { from: "recipe-engine",  to: "nutrient-mixer", subject: "grove.planner.setpoint.{N}",     ns: "grove.planner" },
  { from: "recipe-engine",  to: "ui-backend",     subject: "grove.planner.setpoint.{N}",     ns: "grove.planner" },
  { from: "ai-planner",     to: "recipe-engine",  subject: "grove.planner.setpoint.{N}",     ns: "grove.planner" },
  // vision
  { from: "ai-vision",      to: "ai-planner",     subject: "grove.vision.observation.{N}",   ns: "grove.vision" },
  { from: "ai-vision",      to: "ui-backend",     subject: "grove.vision.observation.{N}",   ns: "grove.vision" },
  // commands
  { from: "control-loop",   to: "sensor-mcu",     subject: "grove.command.valve",            ns: "grove.command" },
  { from: "control-loop",   to: "sensor-mcu",     subject: "grove.command.light",            ns: "grove.command" },
  { from: "nutrient-mixer", to: "sensor-mcu",     subject: "grove.command.dose",             ns: "grove.command" },
  // composter
  { from: "composter-mcu",  to: "composter-ctrl", subject: "grove.composter.sensor.*",       ns: "grove.composter" },
  { from: "composter-ctrl", to: "ui-backend",     subject: "grove.composter.state",          ns: "grove.composter" },
  { from: "composter-ctrl", to: "composter-mcu",  subject: "grove.composter.command",        ns: "grove.composter" },
  // events
  { from: "safety-mcu",     to: "safety-watcher", subject: "grove.event.safety.trip",        ns: "grove.event" },
  { from: "safety-watcher", to: "ui-backend",     subject: "grove.event.safety.trip",        ns: "grove.event" },
  { from: "control-loop",   to: "alerting",       subject: "grove.event.alert.*",            ns: "grove.event" },
  { from: "alerting",       to: "ui-backend",     subject: "grove.event.alert.*",            ns: "grove.event" },
  // UI fan-out
  { from: "ui-backend",     to: "ui-frontend",    subject: "/api/stream (SSE)",              ns: "grove.zone" },
];

const TIER_Y = [0.0, 0.8, 1.6, 2.4];

function makeLabel(text, color = "#ffffff") {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(20,20,28,0.92)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  ctx.fillStyle = color;
  ctx.font = "bold 42px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(0.9, 0.17, 1);
  return sp;
}

export function buildArch() {
  const root = new THREE.Group();
  root.userData.partId = "arch";

  // Service ground plane
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 6),
    new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.9 })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.02;
  root.add(plane);

  // Service boxes
  const nodes = {};
  for (const s of SERVICES) {
    const g = new THREE.Group();
    g.userData = { partId: `service.${s.id}`, label: s.label };
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.3, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.6 })
    );
    box.position.y = 0.15;
    g.add(box);
    const lbl = makeLabel(s.label);
    lbl.position.set(0, 0.45, 0);
    g.add(lbl);
    g.position.set(s.x, TIER_Y[s.tier], s.z);
    root.add(g);
    nodes[s.id] = g.position.clone().setY(TIER_Y[s.tier] + 0.15);
  }

  // Edges (NATS subjects) as curved tubes
  for (const e of EDGES) {
    const a = nodes[e.from];
    const b = nodes[e.to];
    if (!a || !b) continue;
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0.5, 0));
    const curve = new THREE.CatmullRomCurve3([a, mid, b]);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 32, 0.012, 8, false),
      new THREE.MeshStandardMaterial({
        color: NS_COLOR[e.ns] ?? 0xffffff,
        emissive: NS_COLOR[e.ns] ?? 0xffffff,
        emissiveIntensity: 0.25,
        roughness: 0.4,
      })
    );
    tube.userData = { partId: `edge.${e.from}->${e.to}`, subject: e.subject, ns: e.ns };
    root.add(tube);
  }

  return root;
}

export { SERVICES, EDGES, NS_COLOR };
