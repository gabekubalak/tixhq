import * as THREE from "three";

// 3D node-graph view of the KrattOS service architecture.
// Services are labelled boxes laid out on a horizontal plane;
// NATS subjects are coloured TubeGeometry curves between them.

const NS_COLOR = {
  "kratt.zone":      0x4a8cff,
  "kratt.manifold":  0x5dbdc7,
  "kratt.planner":   0x4caf50,
  "kratt.vision":    0xa040c0,
  "kratt.composter": 0x8d6e3c,
  "kratt.command":   0xff8c00,
  "kratt.event":     0xe03030,
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
  { from: "sensor-mcu",     to: "sensor-ingest",  subject: "usb.cdc.frame",                 ns: "kratt.zone" },
  { from: "sensor-ingest",  to: "control-loop",   subject: "kratt.zone.{N}.sensor.moisture", ns: "kratt.zone" },
  { from: "sensor-ingest",  to: "ai-planner",     subject: "kratt.zone.{N}.sensor.moisture", ns: "kratt.zone" },
  { from: "sensor-ingest",  to: "ui-backend",     subject: "kratt.zone.{N}.sensor.moisture", ns: "kratt.zone" },
  { from: "sensor-ingest",  to: "nutrient-mixer", subject: "kratt.manifold.sensor.*",        ns: "kratt.manifold" },
  // recipe → planner → control / mixer
  { from: "recipe-engine",  to: "control-loop",   subject: "kratt.planner.setpoint.{N}",     ns: "kratt.planner" },
  { from: "recipe-engine",  to: "nutrient-mixer", subject: "kratt.planner.setpoint.{N}",     ns: "kratt.planner" },
  { from: "recipe-engine",  to: "ui-backend",     subject: "kratt.planner.setpoint.{N}",     ns: "kratt.planner" },
  { from: "ai-planner",     to: "recipe-engine",  subject: "kratt.planner.setpoint.{N}",     ns: "kratt.planner" },
  // vision
  { from: "ai-vision",      to: "ai-planner",     subject: "kratt.vision.observation.{N}",   ns: "kratt.vision" },
  { from: "ai-vision",      to: "ui-backend",     subject: "kratt.vision.observation.{N}",   ns: "kratt.vision" },
  // commands
  { from: "control-loop",   to: "sensor-mcu",     subject: "kratt.command.valve",            ns: "kratt.command" },
  { from: "control-loop",   to: "sensor-mcu",     subject: "kratt.command.light",            ns: "kratt.command" },
  { from: "nutrient-mixer", to: "sensor-mcu",     subject: "kratt.command.dose",             ns: "kratt.command" },
  // composter
  { from: "composter-mcu",  to: "composter-ctrl", subject: "kratt.composter.sensor.*",       ns: "kratt.composter" },
  { from: "composter-ctrl", to: "ui-backend",     subject: "kratt.composter.state",          ns: "kratt.composter" },
  { from: "composter-ctrl", to: "composter-mcu",  subject: "kratt.composter.command",        ns: "kratt.composter" },
  // events
  { from: "safety-mcu",     to: "safety-watcher", subject: "kratt.event.safety.trip",        ns: "kratt.event" },
  { from: "safety-watcher", to: "ui-backend",     subject: "kratt.event.safety.trip",        ns: "kratt.event" },
  { from: "control-loop",   to: "alerting",       subject: "kratt.event.alert.*",            ns: "kratt.event" },
  { from: "alerting",       to: "ui-backend",     subject: "kratt.event.alert.*",            ns: "kratt.event" },
  // UI fan-out
  { from: "ui-backend",     to: "ui-frontend",    subject: "/api/stream (SSE)",              ns: "kratt.zone" },
];

const TIER_Y = [0.0, 0.8, 1.6, 2.4];
// Each tier sits at a distinct depth; the separator line and label for a
// tier are anchored to this z so they track the row instead of floating at
// a fixed depth that only lined up under the original flat camera.
const TIER_Z = [-1.0, 0.2, 1.2, 2.4];
// Height of a node (box + label + edge anchor) above its group origin.
const NODE_H = 0.32;

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

// Tier labels for the arch scene — rendered as canvas sprites so they
// stay readable at any camera angle.
function makeTierLabel(text) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 60;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(20,26,36,0.0)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(0, canvas.height - 2, canvas.width, 2);
  ctx.fillStyle = "#8090b0";
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 10, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  const sp  = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(2.2, 0.26, 1);
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

  // Tier separator lines + labels, anchored to each tier's own depth (z)
  // and height (y) so they sit with the row of nodes they describe.
  const tierLabels = [
    "Tier 0 — Embedded MCUs (ESP32-S3, FreeRTOS)",
    "Tier 1 — Ingest & Control (Python / Rust)",
    "Tier 2 — AI Planner & Safety (Python / Rust)",
    "Tier 3 — Local UI (FastAPI + SvelteKit)",
  ];
  for (let t = 0; t < tierLabels.length; t++) {
    const y = TIER_Y[t];
    const z = TIER_Z[t];
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(7.6, 0.005, 0.005),
      new THREE.MeshStandardMaterial({ color: 0x304060, emissive: 0x304060 })
    );
    line.position.set(0, y - 0.05, z);
    root.add(line);
    const sp = makeTierLabel(tierLabels[t]);
    if (sp) { sp.position.set(-3.4, y + NODE_H, z); root.add(sp); }
  }

  // Service nodes. Box, label, and the edge anchor are all co-located at
  // NODE_H above the group origin so tubes visibly terminate at the box the
  // label names — no floating gap between the line and the node.
  const nodes = {};
  for (const s of SERVICES) {
    const g = new THREE.Group();
    g.userData = { partId: `service.${s.id}`, label: s.label };
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.3, 0.4),
      new THREE.MeshStandardMaterial({
        color: 0x2a3340,
        emissive: 0x161c26,
        emissiveIntensity: 0.8,
        roughness: 0.6,
      })
    );
    box.position.y = NODE_H;
    g.add(box);
    const lbl = makeLabel(s.label);
    lbl.position.set(0, NODE_H, 0);
    g.add(lbl);
    g.position.set(s.x, TIER_Y[s.tier], s.z);
    root.add(g);
    // Anchor edges at the node centre so both ends sit inside the box.
    nodes[s.id] = g.position.clone().setY(TIER_Y[s.tier] + NODE_H);
  }

  // Edges (NATS subjects) as curved tubes. A quadratic Bézier through a
  // single lifted control point gives a clean arc that always leaves each
  // node toward the midpoint — no CatmullRom overshoot near the endpoints.
  for (const e of EDGES) {
    const a = nodes[e.from];
    const b = nodes[e.to];
    if (!a || !b) continue;
    // Lift the control point proportionally to span so short hops stay flat
    // and long hops arc enough to clear intervening nodes.
    const lift = 0.18 + 0.12 * a.distanceTo(b);
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, lift, 0));
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 40, 0.013, 8, false),
      new THREE.MeshStandardMaterial({
        color: NS_COLOR[e.ns] ?? 0xffffff,
        emissive: NS_COLOR[e.ns] ?? 0xffffff,
        emissiveIntensity: 0.55,
        roughness: 0.4,
      })
    );
    tube.userData = { partId: `edge.${e.from}->${e.to}`, subject: e.subject, ns: e.ns };
    root.add(tube);
  }

  return root;
}

export { SERVICES, EDGES, NS_COLOR };
