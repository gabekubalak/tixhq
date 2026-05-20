/**
 * Headless three.js renderer using headless-gl.
 * Produces assets/render/grove-3d.png — a product-shot of the appliance.
 *
 * Run from the repo root:
 *   node scripts/render_screenshot.mjs
 */
// Auto-start Xvfb when no display is available (headless-gl needs it).
if (!process.env.DISPLAY) {
  const { spawnSync } = await import("child_process");
  const r = spawnSync("xvfb-run", ["--server-args=-screen 0 1280x1024x24", process.execPath, ...process.argv.slice(1)], {
    stdio: "inherit", env: { ...process.env, DISPLAY: ":99" },
  });
  process.exit(r.status ?? 0);
}

import { createRequire } from "module";
const require = createRequire(import.meta.url);

const glLib     = require("../ui/frontend/node_modules/gl/index.js");
const { createCanvas, createImageData } = require("../ui/frontend/node_modules/canvas/index.js");
import * as THREE from "../ui/frontend/node_modules/three/build/three.module.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Load dimensions ──────────────────────────────────────────────────────────
function toMetres(node) {
  const LENGTH_KEYS = new Set([
    "width","depth","height","wall_thickness","inset","pitch","slat_height",
    "shelf_pitch","shelf_lowest_y","thickness","height_above_tray","diameter",
    "offset_z","bezel_radius","arm_length","spacing","x","y","z"
  ]);
  if (Array.isArray(node)) return node.map(toMetres);
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (["mount_xyz","row_origin","position"].includes(k)) out[k] = v.map(n => n/1000);
      else if (LENGTH_KEYS.has(k) && typeof v === "number") out[k] = v / 1000;
      else out[k] = toMetres(v);
    }
    return out;
  }
  return node;
}
const yamlPath = path.join(ROOT, "cad/dimensions.yaml");
const raw = JSON.parse(execSync(
  `python3 -c "import yaml,json,sys; print(json.dumps(yaml.safe_load(open(sys.argv[1]))))" "${yamlPath}"`,
  { encoding: "utf8" }
));
const dims = toMetres(raw);

// ── Polyfill document for Three.js ────────────────────────────────────────────
// Three.js WebGLRenderer calls document.createElementNS('...', 'canvas') in its
// constructor when no canvas is passed. Provide a stub that returns a mock canvas.
const _mockCanvas = {
  width: 1, height: 1,
  style: {},
  addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => {},
  getContext: () => null,
};
global.document = {
  createElement: () => ({ getContext: () => null }),
  createElementNS: (_ns, tag) => tag === "canvas" ? _mockCanvas : {},
};

// ── Build the scene (inline simplified version of buildAppliance) ─────────────
function box(w, h, d, color, rough=0.6, metal=0) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })
  );
}
function cyl(r, h, color, segs=24) {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, h, segs),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
  );
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeaecef);

// Lighting
scene.add(new THREE.HemisphereLight(0xeaf0ff, 0x394050, 0.7));
const key = new THREE.DirectionalLight(0xfff2dc, 1.1);
key.position.set(dims.cabinet.width*2, dims.cabinet.height*1.6, dims.cabinet.width*1.5);
scene.add(key);
const fill = new THREE.DirectionalLight(0xc8d6ff, 0.35);
fill.position.set(-dims.cabinet.width*1.5, dims.cabinet.height*0.8, -dims.cabinet.width);
scene.add(fill);

const { width: W, depth: D, height: H, wall_thickness: t } = dims.cabinet;

// Cabinet shell
const addBox = (w,h,d,color,x,y,z) => {
  const m = box(w,h,d,color);
  m.position.set(x,y,z);
  scene.add(m);
};
addBox(W, t, D, 0x1a1a1a, 0, t/2, -D/2);          // floor
addBox(W, t, D, 0x1a1a1a, 0, H-t/2, -D/2);        // roof
addBox(W, H, t, 0xefefe8, 0, H/2, -D+t/2);        // back
addBox(t, H, D, 0x1a1a1a, -W/2+t/2, H/2, -D/2);   // left
addBox(t, H, D, 0x1a1a1a,  W/2-t/2, H/2, -D/2);   // right

// Door with glass window
const win = dims.door.window;
const winY = H/2;
addBox(W, (H-win.height)/2, t, 0x222426, 0, H-(H-win.height)/4, t/2);
addBox(W, (H-win.height)/2, t, 0x222426, 0, (H-win.height)/4, t/2);
addBox((W-win.width)/2, win.height, t, 0x222426, -W/2+(W-win.width)/4, winY, t/2);
addBox((W-win.width)/2, win.height, t, 0x222426,  W/2-(W-win.width)/4, winY, t/2);
// Glass pane
const glassMesh = new THREE.Mesh(
  new THREE.BoxGeometry(win.width, win.height, t*0.3),
  new THREE.MeshStandardMaterial({ color: 0xbfd5e8, transparent: true, opacity: 0.25, roughness: 0.05 })
);
glassMesh.position.set(0, winY, t/2);
scene.add(glassMesh);

// Shelves + trays + LED panels + plants
const rack = dims.racks[0];
for (let s = 0; s < rack.shelves; s++) {
  const trayY = rack.shelf_lowest_y + s * rack.shelf_pitch;
  const tCZ = rack.z - rack.tray.depth/2 - 0.06;
  addBox(rack.tray.width, rack.tray.height, rack.tray.depth, 0x2c2c2c, rack.x, trayY+rack.tray.height/2, tCZ);
  addBox(rack.tray.width-0.024, rack.tray.height*0.5, rack.tray.depth-0.024, 0x6b4a32, rack.x, trayY+rack.tray.height*0.75, tCZ);

  // LED panel
  const ledY = trayY+rack.tray.height+rack.led_panel.height_above_tray;
  const ledMesh = new THREE.Mesh(
    new THREE.BoxGeometry(rack.led_panel.width, rack.led_panel.thickness, rack.led_panel.depth),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffeec8, emissiveIntensity: 1.1, roughness: 0.3 })
  );
  ledMesh.position.set(rack.x, ledY, rack.z-rack.led_panel.depth/2-0.06);
  scene.add(ledMesh);

  // LED glow point light
  const pt = new THREE.PointLight(0xfff5e0, 0.6, 0.6);
  pt.position.set(rack.x, ledY - 0.05, rack.z - rack.led_panel.depth/2 - 0.06);
  scene.add(pt);

  // Simple plants
  const greenCol = [0x4a9a2a, 0x3a8a1a, 0x5aaa30, 0x60b030, 0x509828, 0x489020][s%6];
  const trayTop = trayY+rack.tray.height;
  for (let p = 0; p < 6; p++) {
    const px = rack.x + (p%3 - 1) * rack.tray.width*0.22;
    const pz = tCZ + (p<3 ? -1 : 1) * rack.tray.depth * 0.22;
    const stemH = 0.07;
    const sc = cyl(0.004, stemH, 0x4a7a2a);
    sc.position.set(px, trayTop + stemH/2, pz);
    scene.add(sc);
    for (let l = 0; l < 4; l++) {
      const la = l/4*Math.PI*2;
      const leafMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 8, 6),
        new THREE.MeshStandardMaterial({ color: greenCol, roughness: 0.85 })
      );
      leafMesh.scale.set(1, 0.4, 1);
      leafMesh.position.set(px + Math.cos(la)*0.04, trayTop+stemH, pz + Math.sin(la)*0.04);
      scene.add(leafMesh);
    }
  }
}

// Composter
const c = dims.composter;
const [cpx,,cpz] = c.position;
addBox(c.width, c.height, c.depth, 0x4a4a4a, cpx, c.height/2, cpz-c.depth/2);
addBox(c.width+0.01, 0.025, c.depth+0.01, 0x303030, cpx, c.height+0.0125, cpz-c.depth/2);

// Reservoirs
const r = dims.reservoirs;
const [ox,,oz] = r.row_origin;
const liqColors = [0x6abf6a,0xc77b58,0xc7a258,0xe6e6e6,0x5599cc,0xbf6a6a];
for (let i=0;i<r.count;i++) {
  const rx = ox + i*r.spacing;
  const liq = cyl(r.diameter*0.47, r.height*0.72, liqColors[i]);
  liq.position.set(rx, r.height*0.36, oz);
  scene.add(liq);
  const cap = cyl(r.diameter/2*1.04, 0.012, 0x202020);
  cap.position.set(rx, r.height, oz);
  scene.add(cap);
}

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(6, 6),
  new THREE.MeshStandardMaterial({ color: 0xd5d8db, roughness: 0.95 })
);
ground.rotation.x = -Math.PI/2;
ground.position.y = -0.04;
scene.add(ground);

// ── Camera ────────────────────────────────────────────────────────────────────
const W_IMG = 1200, H_IMG = 900;
const camera = new THREE.PerspectiveCamera(38, W_IMG/H_IMG, 0.01, 50);
camera.position.set(W*1.6, H*0.5, W*2.0);
camera.lookAt(0, H/2, -D/2);

// ── Renderer via headless-gl ──────────────────────────────────────────────────
const gl = glLib(W_IMG, H_IMG, { antialias: true, preserveDrawingBuffer: true });
if (!gl) {
  console.error("headless-gl failed to create context");
  process.exit(1);
}

// Three.js reads canvas.width/height for viewport setup.
const fakeCanvas = {
  width: W_IMG, height: H_IMG, style: {},
  addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => {},
  getContext: () => gl,
};
gl.canvas = fakeCanvas;

const renderer = new THREE.WebGLRenderer({ canvas: fakeCanvas, context: gl, antialias: true });
renderer.setSize(W_IMG, H_IMG, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

renderer.render(scene, camera);

// ── Read pixels from the framebuffer ─────────────────────────────────────────
const pixels = new Uint8Array(W_IMG * H_IMG * 4);
gl.readPixels(0, 0, W_IMG, H_IMG, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

// WebGL y-axis is flipped — flip vertically before saving.
const flipped = new Uint8ClampedArray(W_IMG * H_IMG * 4);
for (let row = 0; row < H_IMG; row++) {
  const src = (H_IMG - 1 - row) * W_IMG * 4;
  const dst = row * W_IMG * 4;
  flipped.set(pixels.subarray(src, src + W_IMG * 4), dst);
}

// Use node-canvas to encode the raw RGBA as PNG.
const canvas2d = createCanvas(W_IMG, H_IMG);
const ctx = canvas2d.getContext("2d");
const imgData = createImageData(flipped, W_IMG, H_IMG);
ctx.putImageData(imgData, 0, 0);

// ── Save ─────────────────────────────────────────────────────────────────────
const outDir = path.join(ROOT, "assets/render");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "grove-3d.png");
const buf = canvas2d.toBuffer("image/png");
fs.writeFileSync(outPath, buf);
console.log(`Saved ${outPath} (${(buf.length/1024).toFixed(0)} KB)`);
