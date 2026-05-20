import * as THREE from "three";

const MAT = {
  cabinet: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.55, metalness: 0.45 }),
  cabinetInterior: new THREE.MeshStandardMaterial({ color: 0xefefe8, roughness: 0.85 }),
  door: new THREE.MeshStandardMaterial({ color: 0x222426, roughness: 0.45, metalness: 0.55 }),
  doorTrim: new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.3, metalness: 0.9 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xbfd5e8, transparent: true, opacity: 0.12,
    roughness: 0.04, metalness: 0, transmission: 0.92,
    thickness: 0.01, ior: 1.45, depthWrite: false,
  }),
  shelfFrame: new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.4, metalness: 0.85 }),
  tray: new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.95 }),
  trayRim: new THREE.MeshStandardMaterial({ color: 0x2c2c2c, roughness: 0.6 }),
  led: new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffeec8, emissiveIntensity: 0.0, roughness: 0.35
  }),
  fan: new THREE.MeshStandardMaterial({ color: 0x404040, roughness: 0.6 }),
  cameraBody: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.6 }),
  cameraLens: new THREE.MeshStandardMaterial({ color: 0x202060, roughness: 0.1, metalness: 0.9 }),
  arm: new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.3, metalness: 0.9 }),
  lcd: new THREE.MeshStandardMaterial({ color: 0x0a3a0a, emissive: 0x4dff7a, emissiveIntensity: 0.7 }),
  estopBase: new THREE.MeshStandardMaterial({ color: 0xf0c000, roughness: 0.6 }),
  estopCap: new THREE.MeshStandardMaterial({ color: 0xc81a1a, roughness: 0.5 }),
  composter: new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.7 }),
  reservoir: new THREE.MeshPhysicalMaterial({
    color: 0x88b8d4, transparent: true, opacity: 0.45,
    roughness: 0.15, transmission: 0.7, depthWrite: false,
  }),
  reservoirLiquid: new THREE.MeshStandardMaterial({ color: 0x3a6a8a, roughness: 0.3 }),
  slurry: new THREE.MeshStandardMaterial({ color: 0x5c4633, roughness: 0.7 }),
  cleanWater: new THREE.MeshPhysicalMaterial({
    color: 0xbfe3f4, transparent: true, opacity: 0.45,
    roughness: 0.1, transmission: 0.8, depthWrite: false,
  }),
  bezelInfo:     new THREE.MeshStandardMaterial({ color: 0x223a66, emissive: 0x000000 }),
  bezelWarning:  new THREE.MeshStandardMaterial({ color: 0x66501a, emissive: 0x000000 }),
  bezelCritical: new THREE.MeshStandardMaterial({ color: 0x661a1a, emissive: 0x000000 }),
  foot: new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.4, metalness: 0.8 }),
};

function tag(mesh, partId, extra = {}) {
  mesh.userData = { partId, ...extra };
  return mesh;
}

// Cabinet shell as four walls + a floor + a roof, so the door can hide
// independently and you can see straight inside when it's open.
function buildShell(dims, group) {
  const { width: W, depth: D, height: H, wall_thickness: t } = dims.cabinet;
  // Floor (origin at front-bottom-centre; cabinet extends -Z behind origin).
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, t, D), MAT.cabinet);
  floor.position.set(0, t / 2, -D / 2);
  group.add(tag(floor, "cabinet.floor"));
  // Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W, t, D), MAT.cabinet);
  roof.position.set(0, H - t / 2, -D / 2);
  group.add(tag(roof, "cabinet.roof"));
  // Back
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, t), MAT.cabinetInterior);
  back.position.set(0, H / 2, -D + t / 2);
  group.add(tag(back, "cabinet.back"));
  // Left + right walls
  for (const [side, x] of [["left", -W / 2 + t / 2], ["right", W / 2 - t / 2]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(t, H, D), MAT.cabinet);
    wall.position.set(x, H / 2, -D / 2);
    group.add(tag(wall, `cabinet.${side}`));
  }
  // Four squat feet hanging below y=0. The ground plane in the page
  // sits lower to accommodate them.
  const footH = 0.04;
  for (const [dx, dz] of [[-1, 0], [1, 0], [-1, -1], [1, -1]]) {
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(t * 0.9, t * 0.9, footH, 16),
      MAT.foot
    );
    foot.position.set(
      dx * (W / 2 - t * 1.4),
      -footH / 2,
      dz === 0 ? -t * 1.4 : -D + t * 1.4
    );
    group.add(foot);
  }
}

function makeLcdTexture() {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0a2510";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#80ff9e";
  ctx.font = "bold 14px ui-monospace, monospace";
  ctx.textBaseline = "top";
  ctx.fillText("GroveOS  v1", 8, 6);
  ctx.fillText("4 shelves  OK", 8, 22);
  ctx.fillText("compost: 58C", 8, 38);
  ctx.fillText("uptime: 12d", 8, 52);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

function buildDoor(dims, group) {
  const { width: W, height: H, wall_thickness: t } = dims.cabinet;
  const door = new THREE.Group();
  door.userData.partId = "cabinet.front";

  // Door slab with a window cutout faked by four strips around it.
  const win = dims.door.window;
  const winX = 0, winY = H / 2;
  const strips = [
    { w: W, h: (H - win.height) / 2 + winY - H / 2, y: H - ((H - win.height) / 2) / 2 },
    { w: W, h: (H - win.height) / 2, y: ((H - win.height) / 2) / 2 },
    { w: (W - win.width) / 2, h: win.height, x: -W / 2 + ((W - win.width) / 2) / 2, y: H / 2 },
    { w: (W - win.width) / 2, h: win.height, x:  W / 2 - ((W - win.width) / 2) / 2, y: H / 2 },
  ];
  for (const s of strips) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, t), MAT.door);
    m.position.set(s.x ?? 0, s.y, 0);
    door.add(m);
  }
  // Brushed-metal trim around the window so it reads as a real frame.
  const trimT = t * 0.15;
  for (const [w, h, x, y] of [
    [win.width + 0.04, trimT, 0,  winY + win.height / 2 + 0.02],
    [win.width + 0.04, trimT, 0,  winY - win.height / 2 - 0.02],
    [trimT, win.height + 0.04, -win.width / 2 - 0.02, winY],
    [trimT, win.height + 0.04,  win.width / 2 + 0.02, winY],
  ]) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(w, h, t * 0.4), MAT.doorTrim);
    trim.position.set(x, y, t * 0.3);
    door.add(trim);
  }
  // Glass pane — depthWrite false (set in MAT) + high renderOrder so it
  // composites on top after all opaque geometry has been drawn.
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(win.width, win.height, t * 0.3),
    MAT.glass
  );
  glass.position.set(winX, winY, 0);
  glass.renderOrder = 2;
  door.add(tag(glass, "cabinet.window"));

  // Pull handle on the opposite side of the hinge.
  const handleX = dims.door.hinge === "right" ? -W / 2 + 0.06 : W / 2 - 0.06;
  const handle = new THREE.Group();
  const handleBar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.18, 12),
    MAT.doorTrim
  );
  handle.add(handleBar);
  for (const dy of [-0.09, 0.09]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.04, 12),
      MAT.doorTrim
    );
    post.rotation.x = Math.PI / 2;
    post.position.set(0, dy, 0.02);
    handle.add(post);
  }
  handle.position.set(handleX, H * 0.45, t * 0.55);
  door.add(handle);

  // Front-panel LCD + E-stop
  const lcdTex = makeLcdTexture();
  const lcdMat = lcdTex
    ? new THREE.MeshStandardMaterial({ map: lcdTex, emissiveMap: lcdTex, emissive: 0xffffff, emissiveIntensity: 0.7 })
    : MAT.lcd;
  const lcd = new THREE.Mesh(
    new THREE.BoxGeometry(dims.front_panel.lcd.width, dims.front_panel.lcd.height, t * 0.2),
    lcdMat
  );
  lcd.position.set(dims.front_panel.lcd.x, dims.front_panel.lcd.y, t / 2);
  door.add(tag(lcd, "lcd"));

  const estopGroup = new THREE.Group();
  const estopR = dims.front_panel.estop.diameter / 2;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(estopR * 1.15, estopR * 1.15, t * 0.4, 24), MAT.estopBase);
  base.rotation.x = Math.PI / 2;
  base.position.set(0, 0, t * 0.2);
  estopGroup.add(base);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(estopR, estopR * 0.9, estopR * 0.8, 24), MAT.estopCap);
  cap.rotation.x = Math.PI / 2;
  cap.position.set(0, 0, t * 0.4 + estopR * 0.4);
  estopGroup.add(tag(cap, "estop.cap"));
  estopGroup.position.set(dims.front_panel.estop.x, dims.front_panel.estop.y, t / 2);
  estopGroup.userData.partId = "estop";
  door.add(estopGroup);

  // Position the whole door at z=0 (front face of cabinet).
  door.position.set(0, 0, t / 2);
  group.add(door);
}

function buildVents(dims, group) {
  const { width: W, wall_thickness: t } = dims.cabinet;
  const { count, pitch, slat_height } = dims.vents;
  // Bottom band grows upward from y=0.04; top band grows downward from H-0.04
  // so both clusters stay inside the cabinet.
  for (const [edge, y, dir] of [
    ["bottom", 0.04, +1],
    ["top", dims.cabinet.height - 0.04, -1],
  ]) {
    const stack = new THREE.Group();
    stack.userData.partId = `vents.${edge}`;
    for (let i = 0; i < count; i++) {
      const slat = new THREE.Mesh(
        new THREE.BoxGeometry(W * 0.6, slat_height, 2 * t),
        MAT.cabinet
      );
      slat.position.set(0, dir * i * pitch, -dims.cabinet.depth + t);
      stack.add(slat);
    }
    stack.position.y = y;
    group.add(stack);
  }
}

const PIPE_MAT = new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.4, metalness: 0.7 });
const DRIP_MAT = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.5 });

function buildRack(rack, dims, group) {
  const W = dims.cabinet.width;
  const D = dims.cabinet.depth;
  const t = dims.cabinet.wall_thickness;
  const trayY0 = rack.shelf_lowest_y;

  // Vertical uprights — one at each corner of the grow column.
  const upH = rack.shelf_lowest_y + rack.shelves * rack.shelf_pitch + 0.05;
  for (const [ux, uz] of [[-W / 2 + 0.05, -0.08], [W / 2 - 0.05, -0.08],
                           [-W / 2 + 0.05, -D + 0.08], [W / 2 - 0.05, -D + 0.08]]) {
    const upright = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, upH, 0.025),
      MAT.shelfFrame
    );
    upright.position.set(ux, upH / 2, uz);
    group.add(upright);
  }

  for (let s = 0; s < rack.shelves; s++) {
    const shelfGroup = new THREE.Group();
    shelfGroup.userData.partId = `shelf.${s}`;
    const trayY = trayY0 + s * rack.shelf_pitch;
    const trayCenterZ = rack.z - rack.tray.depth / 2 - 0.06;

    // Horizontal cross-bars at this shelf level (front + back).
    for (const cz of [-t - 0.02, -D + t + 0.02]) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(W - 0.12, 0.018, 0.025),
        MAT.shelfFrame
      );
      bar.position.set(rack.x, trayY, cz);
      shelfGroup.add(bar);
    }
    // Two side bars connecting front/back cross-bars.
    for (const bx of [-W / 2 + 0.06, W / 2 - 0.06]) {
      const sbar = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, 0.018, D - 0.12),
        MAT.shelfFrame
      );
      sbar.position.set(bx, trayY, -D / 2);
      shelfGroup.add(sbar);
    }

    // Tray with dark rim + soil inset.
    const soilInset = 0.012;
    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(rack.tray.width, rack.tray.height, rack.tray.depth),
      MAT.trayRim
    );
    rim.position.set(rack.x, trayY + rack.tray.height / 2, trayCenterZ);
    shelfGroup.add(rim);
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(
        rack.tray.width - soilInset * 2,
        rack.tray.height * 0.55,
        rack.tray.depth - soilInset * 2
      ),
      MAT.tray.clone()
    );
    tray.position.set(rack.x, trayY + rack.tray.height * 0.725, trayCenterZ);
    shelfGroup.add(tag(tray, `shelf.${s}.tray`));

    // Drip-irrigation manifold — a thin horizontal pipe along the rear
    // of the tray with 6 small drippers, so it reads as a real
    // hydroponic system rather than a plain tray.
    const manifoldY = trayY + rack.tray.height + 0.015;
    const manifoldZ = trayCenterZ - rack.tray.depth * 0.42;
    const manifold = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, rack.tray.width * 0.82, 12),
      PIPE_MAT
    );
    manifold.rotation.z = Math.PI / 2;
    manifold.position.set(rack.x, manifoldY, manifoldZ);
    shelfGroup.add(manifold);
    for (let d = 0; d < 6; d++) {
      const dx = -rack.tray.width * 0.36 + d * rack.tray.width * 0.144;
      const dripper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.025, 8),
        DRIP_MAT
      );
      dripper.position.set(rack.x + dx, manifoldY - 0.013, manifoldZ);
      shelfGroup.add(dripper);
    }

    // Bezel alert ring
    const bezel = new THREE.Mesh(
      new THREE.TorusGeometry(rack.tray.width * 0.52, 0.008, 8, 48),
      MAT.bezelInfo.clone()
    );
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(rack.x, trayY + rack.tray.height + 0.02, rack.z - 0.04);
    bezel.visible = false;
    shelfGroup.add(tag(bezel, `shelf.${s}.bezel`));

    // LED panel + real PointLight
    const ledY = trayY + rack.tray.height + rack.led_panel.height_above_tray;
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(rack.led_panel.width, rack.led_panel.thickness, rack.led_panel.depth),
      MAT.led.clone()
    );
    led.position.set(rack.x, ledY, rack.z - rack.led_panel.depth / 2 - 0.06);
    const ledLight = new THREE.PointLight(0xfff0d0, 0.0, rack.shelf_pitch * 1.5, 1.8);
    ledLight.position.set(0, -rack.led_panel.thickness, 0);
    led.add(ledLight);
    led.userData.light = ledLight;
    shelfGroup.add(tag(led, `shelf.${s}.led`, {
      ppfd_max: rack.led_panel.ppfd_max,
      light: ledLight,
    }));

    // Fan at the back
    const fan = new THREE.Mesh(
      new THREE.CylinderGeometry(rack.fan.diameter / 2, rack.fan.diameter / 2, 0.03, 24),
      MAT.fan
    );
    fan.rotation.x = Math.PI / 2;
    fan.position.set(rack.x, trayY + rack.shelf_pitch * 0.5, -D + 0.04);
    shelfGroup.add(tag(fan, `shelf.${s}.fan`));

    group.add(shelfGroup);
  }
}

function buildCamera(dims, group) {
  const cam = new THREE.Group();
  cam.userData.partId = "camera";
  const [mx, my, mz] = dims.camera.mount_xyz;
  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, dims.camera.arm_length, 12),
    MAT.arm
  );
  arm.rotation.z = Math.PI / 2;
  arm.position.set(dims.camera.arm_length / 2, 0, 0);
  cam.add(arm);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, 0.03), MAT.cameraBody);
  body.position.set(dims.camera.arm_length, 0, 0);
  cam.add(tag(body, "camera.body"));
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.015, 16), MAT.cameraLens);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(dims.camera.arm_length, 0, 0.018);
  cam.add(lens);
  cam.position.set(mx, my, mz);
  group.add(cam);
}

function buildComposter(dims, group) {
  const c = dims.composter;
  const [px, py, pz] = c.position;
  const cx = px, cy = py + c.height / 2, cz = pz - c.depth / 2;

  const compGroup = new THREE.Group();
  compGroup.userData.partId = "composter";
  compGroup.position.set(cx, cy, cz);

  // Main body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(c.width, c.height, c.depth),
    MAT.composter.clone()
  );
  compGroup.add(body);

  // Lid — slightly wider, darker, with a handle bar on top.
  const lidMat = new THREE.MeshStandardMaterial({ color: 0x303030, roughness: 0.6 });
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(c.width + 0.01, 0.025, c.depth + 0.01),
    lidMat
  );
  lid.position.y = c.height / 2 + 0.0125;
  compGroup.add(lid);
  const lidHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, c.width * 0.4, 12),
    MAT.doorTrim
  );
  lidHandle.rotation.z = Math.PI / 2;
  lidHandle.position.set(0, c.height / 2 + 0.04, 0);
  compGroup.add(lidHandle);

  // Vent grate on the top of the body — a row of thin slots.
  const ventW = 0.03, ventH = 0.01, ventCount = 6;
  const ventMat = new THREE.MeshStandardMaterial({ color: 0x202020 });
  for (let i = 0; i < ventCount; i++) {
    const vx = -c.width * 0.36 + i * c.width * 0.144;
    const vent = new THREE.Mesh(new THREE.BoxGeometry(ventW, 0.008, c.depth * 0.55), ventMat);
    vent.position.set(vx, c.height / 2 + 0.002, 0);
    compGroup.add(vent);
  }

  // Front access door — a recessed square panel.
  const doorPanelMat = new THREE.MeshStandardMaterial({ color: 0x282828, roughness: 0.55 });
  const doorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(c.width * 0.65, c.height * 0.45, 0.012),
    doorPanelMat
  );
  doorPanel.position.set(0, -c.height * 0.08, c.depth / 2 + 0.001);
  compGroup.add(doorPanel);
  // Door hinge studs
  for (const dhy of [-c.height * 0.18, c.height * 0.18]) {
    const stud = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.018, 10),
      MAT.doorTrim
    );
    stud.rotation.x = Math.PI / 2;
    stud.position.set(-c.width * 0.3, dhy, c.depth / 2 + 0.006);
    compGroup.add(stud);
  }

  // Status LED (green = running, amber = thermophilic).
  const statusLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x00ff60, emissive: 0x00ff60, emissiveIntensity: 0.9 })
  );
  statusLed.position.set(c.width * 0.38, c.height * 0.38, c.depth / 2 + 0.005);
  compGroup.add(statusLed);

  group.add(compGroup);
}

function makeTextSprite(text, opts = {}) {
  if (typeof document === "undefined") return null;
  const { bg = "#111827", fg = "#f0f4ff", size = 180, px = 12 } = opts;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = `bold ${size * 0.28 | 0}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width;
  canvas.width = tw + px * 2 + 2;
  canvas.height = size * 0.44;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect?.(0, 0, canvas.width, canvas.height, 6) ?? ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = `bold ${size * 0.28 | 0}px system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(text, px, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  const aspect = canvas.width / canvas.height;
  sp.scale.set(aspect * 0.12, 0.12, 1);
  return sp;
}

function buildReservoirs(dims, group) {
  const r = dims.reservoirs;
  const [ox, oy, oz] = r.row_origin;
  const labels     = ["N", "P", "K", "Ca/Mg", "pH+", "pH-"];
  const labelColors = ["#7aff7a", "#e8b080", "#e8c870", "#e8e8e8", "#80a8ee", "#f08888"];
  const liquidColors = [0x6abf6a, 0xc77b58, 0xc7a258, 0xe6e6e6, 0x5599cc, 0xbf6a6a];
  const fillRatio = 0.72;

  for (let i = 0; i < r.count; i++) {
    const stand = new THREE.Group();
    stand.userData.partId = `reservoir.${i}`;
    stand.userData.label = `${labels[i]} reservoir`;

    // Transparent outer shell (open-ended cylinder for better see-through).
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(r.diameter / 2, r.diameter / 2, r.height, 28, 1, true),
      MAT.reservoir
    );
    shell.renderOrder = 2;
    stand.add(shell);

    // Coloured liquid column.
    const liquid = new THREE.Mesh(
      new THREE.CylinderGeometry(r.diameter * 0.47, r.diameter * 0.47, r.height * fillRatio, 28),
      new THREE.MeshStandardMaterial({ color: liquidColors[i], roughness: 0.3 })
    );
    liquid.position.y = -r.height * (1 - fillRatio) / 2;
    stand.add(liquid);

    // Bottom disc + cap.
    for (const [yp, rad] of [[- r.height / 2, r.diameter / 2], [r.height / 2, r.diameter * 0.52]]) {
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(rad, rad, 0.012, 28),
        MAT.foot
      );
      disc.position.y = yp;
      stand.add(disc);
    }

    // Text sprite label floating above the cap.
    const sprite = makeTextSprite(labels[i], { fg: labelColors[i] });
    if (sprite) {
      sprite.position.set(0, r.height / 2 + 0.1, 0);
      stand.add(sprite);
    }

    stand.position.set(ox + i * r.spacing, oy + r.height / 2, oz);
    group.add(stand);
  }

  // Slurry tank — slightly rougher opaque brown box.
  const slurry = new THREE.Mesh(
    new THREE.BoxGeometry(dims.slurry_tank.width, dims.slurry_tank.height, dims.slurry_tank.depth),
    MAT.slurry
  );
  const [sx, sy, sz] = dims.slurry_tank.position;
  slurry.position.set(sx, sy + dims.slurry_tank.height / 2, sz - dims.slurry_tank.depth / 2);
  group.add(tag(slurry, "slurry_tank"));
  const sSprite = makeTextSprite("Slurry", { fg: "#c8a870" });
  if (sSprite) { sSprite.position.set(sx, sy + dims.slurry_tank.height + 0.1, sz - dims.slurry_tank.depth / 2); group.add(sSprite); }

  // Clean-water tank — semi-transparent blue.
  const cw = new THREE.Mesh(
    new THREE.BoxGeometry(dims.clean_water_tank.width, dims.clean_water_tank.height, dims.clean_water_tank.depth),
    MAT.cleanWater
  );
  const [cwx, cwy, cwz] = dims.clean_water_tank.position;
  cw.position.set(cwx, cwy + dims.clean_water_tank.height / 2, cwz - dims.clean_water_tank.depth / 2);
  cw.renderOrder = 2;
  group.add(tag(cw, "clean_water_tank"));
  const cwSprite = makeTextSprite("H₂O", { fg: "#90d8f8" });
  if (cwSprite) { cwSprite.position.set(cwx, cwy + dims.clean_water_tank.height + 0.1, cwz - dims.clean_water_tank.depth / 2); group.add(cwSprite); }

  // Header pipe connecting the slurry tank to the reservoir row — the
  // visible plumbing that ties the nutrient loop together visually.
  const pipeStart = new THREE.Vector3(sx, sy + dims.slurry_tank.height * 0.7, sz - dims.slurry_tank.depth / 2);
  const pipeEnd   = new THREE.Vector3(ox, oy + r.height * 0.85, oz);
  const pipeLen   = pipeStart.distanceTo(pipeEnd);
  const pipeMid   = pipeStart.clone().lerp(pipeEnd, 0.5);
  const pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, pipeLen, 12),
    PIPE_MAT
  );
  pipe.position.copy(pipeMid);
  pipe.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    pipeEnd.clone().sub(pipeStart).normalize()
  );
  group.add(pipe);
}

export function buildAppliance(dims) {
  const group = new THREE.Group();
  group.userData.partId = "appliance";
  buildShell(dims, group);
  buildVents(dims, group);
  for (const rack of dims.racks) buildRack(rack, dims, group);
  buildCamera(dims, group);
  buildComposter(dims, group);
  buildReservoirs(dims, group);
  buildDoor(dims, group);
  return group;
}
