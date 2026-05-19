import * as THREE from "three";

const MAT = {
  cabinet: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.4 }),
  cabinetInterior: new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.8 }),
  door: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.5 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xbfd5e8, transparent: true, opacity: 0.18,
    roughness: 0.05, metalness: 0, transmission: 0.85
  }),
  shelfFrame: new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.4, metalness: 0.8 }),
  tray: new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.9 }),
  led: new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffeec8, emissiveIntensity: 0.0, roughness: 0.3
  }),
  fan: new THREE.MeshStandardMaterial({ color: 0x404040, roughness: 0.6 }),
  cameraBody: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.6 }),
  cameraLens: new THREE.MeshStandardMaterial({ color: 0x202060, roughness: 0.1, metalness: 0.9 }),
  arm: new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.3, metalness: 0.9 }),
  lcd: new THREE.MeshStandardMaterial({ color: 0x0a3a0a, emissive: 0x0a3a0a, emissiveIntensity: 0.4 }),
  estopBase: new THREE.MeshStandardMaterial({ color: 0xf0c000, roughness: 0.6 }),
  estopCap: new THREE.MeshStandardMaterial({ color: 0xc81a1a, roughness: 0.5 }),
  composter: new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.7 }),
  reservoir: new THREE.MeshStandardMaterial({ color: 0x2a4a6a, transparent: true, opacity: 0.7, roughness: 0.4 }),
  slurry: new THREE.MeshStandardMaterial({ color: 0x5c4633, roughness: 0.7 }),
  cleanWater: new THREE.MeshStandardMaterial({ color: 0x6ab0d6, transparent: true, opacity: 0.8, roughness: 0.3 }),
  bezelInfo:     new THREE.MeshStandardMaterial({ color: 0x223a66, emissive: 0x000000 }),
  bezelWarning:  new THREE.MeshStandardMaterial({ color: 0x66501a, emissive: 0x000000 }),
  bezelCritical: new THREE.MeshStandardMaterial({ color: 0x661a1a, emissive: 0x000000 }),
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
}

function buildDoor(dims, group) {
  const { width: W, height: H, wall_thickness: t } = dims.cabinet;
  const door = new THREE.Group();
  door.userData.partId = "cabinet.front";

  // Door slab with a window cutout faked by two shells around the window.
  const win = dims.door.window;
  const winX = 0, winY = H / 2;
  // Build the door as a frame: four strips around the window.
  const strips = [
    // top
    { w: W, h: (H - win.height) / 2 + winY - H / 2, y: H - ((H - win.height) / 2) / 2 },
    // bottom
    { w: W, h: (H - win.height) / 2, y: ((H - win.height) / 2) / 2 },
    // left
    { w: (W - win.width) / 2, h: win.height, x: -W / 2 + ((W - win.width) / 2) / 2, y: H / 2 },
    // right
    { w: (W - win.width) / 2, h: win.height, x:  W / 2 - ((W - win.width) / 2) / 2, y: H / 2 },
  ];
  for (const s of strips) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, t), MAT.door);
    m.position.set(s.x ?? 0, s.y, 0);
    door.add(m);
  }
  // Glass pane
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(win.width, win.height, t * 0.4),
    MAT.glass
  );
  glass.position.set(winX, winY, 0);
  door.add(tag(glass, "cabinet.window"));

  // Front-panel LCD + E-stop
  const lcd = new THREE.Mesh(
    new THREE.BoxGeometry(dims.front_panel.lcd.width, dims.front_panel.lcd.height, t * 0.2),
    MAT.lcd
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

function buildRack(rack, dims, group) {
  const W = dims.cabinet.width;
  const trayY0 = rack.shelf_lowest_y;
  for (let s = 0; s < rack.shelves; s++) {
    const shelfGroup = new THREE.Group();
    shelfGroup.userData.partId = `shelf.${s}`;
    const trayY = trayY0 + s * rack.shelf_pitch;

    // Shelf frame (two side rails)
    for (const railX of [-W / 2 + 0.04, W / 2 - 0.04]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, rack.shelf_pitch, dims.cabinet.depth - 0.04),
        MAT.shelfFrame
      );
      rail.position.set(railX, trayY + rack.shelf_pitch / 2, -dims.cabinet.depth / 2);
      shelfGroup.add(rail);
    }

    // Tray
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(rack.tray.width, rack.tray.height, rack.tray.depth),
      MAT.tray.clone()
    );
    tray.position.set(rack.x, trayY + rack.tray.height / 2, rack.z - rack.tray.depth / 2 - 0.06);
    shelfGroup.add(tag(tray, `shelf.${s}.tray`));

    // Bezel ring around the front lip — used for alert pulses.
    const bezel = new THREE.Mesh(
      new THREE.TorusGeometry(rack.tray.width * 0.52, 0.008, 8, 48),
      MAT.bezelInfo.clone()
    );
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(rack.x, trayY + rack.tray.height + 0.02, rack.z - 0.04);
    bezel.visible = false; // shows only when an alert is active
    shelfGroup.add(tag(bezel, `shelf.${s}.bezel`));

    // LED panel mounted above the tray.
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(rack.led_panel.width, rack.led_panel.thickness, rack.led_panel.depth),
      MAT.led.clone()
    );
    led.position.set(
      rack.x,
      trayY + rack.tray.height + rack.led_panel.height_above_tray,
      rack.z - rack.led_panel.depth / 2 - 0.06
    );
    shelfGroup.add(tag(led, `shelf.${s}.led`, { ppfd_max: rack.led_panel.ppfd_max }));

    // Fan at the back of the shelf
    const fan = new THREE.Mesh(
      new THREE.CylinderGeometry(rack.fan.diameter / 2, rack.fan.diameter / 2, 0.03, 24),
      MAT.fan
    );
    fan.rotation.x = Math.PI / 2;
    fan.position.set(
      rack.x,
      trayY + rack.shelf_pitch * 0.5,
      -dims.cabinet.depth + 0.04
    );
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
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(c.width, c.height, c.depth),
    MAT.composter.clone()
  );
  const [px, py, pz] = c.position;
  box.position.set(px, py + c.height / 2, pz - c.depth / 2);
  group.add(tag(box, "composter"));
}

function buildReservoirs(dims, group) {
  const r = dims.reservoirs;
  const [ox, oy, oz] = r.row_origin;
  for (let i = 0; i < r.count; i++) {
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(r.diameter / 2, r.diameter / 2, r.height, 24),
      MAT.reservoir.clone()
    );
    cyl.position.set(ox + i * r.spacing, oy + r.height / 2, oz);
    group.add(tag(cyl, `reservoir.${i}`));
  }

  const slurry = new THREE.Mesh(
    new THREE.BoxGeometry(dims.slurry_tank.width, dims.slurry_tank.height, dims.slurry_tank.depth),
    MAT.slurry
  );
  const [sx, sy, sz] = dims.slurry_tank.position;
  slurry.position.set(sx, sy + dims.slurry_tank.height / 2, sz - dims.slurry_tank.depth / 2);
  group.add(tag(slurry, "slurry_tank"));

  const cw = new THREE.Mesh(
    new THREE.BoxGeometry(dims.clean_water_tank.width, dims.clean_water_tank.height, dims.clean_water_tank.depth),
    MAT.cleanWater
  );
  const [cx, cy, cz] = dims.clean_water_tank.position;
  cw.position.set(cx, cy + dims.clean_water_tank.height / 2, cz - dims.clean_water_tank.depth / 2);
  group.add(tag(cw, "clean_water_tank"));
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
