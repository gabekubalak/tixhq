import * as THREE from "three";
import { buildPlantsForShelf } from "./buildPlants.js";

// Index all tagged meshes by their partId for O(1) lookups.
export function indexParts(group) {
  const idx = new Map();
  group.traverse((o) => {
    if (o.userData?.partId) idx.set(o.userData.partId, o);
  });
  return idx;
}

function lerpColor(mat, fromHex, toHex, t) {
  const a = new THREE.Color(fromHex);
  const b = new THREE.Color(toHex);
  mat.color.copy(a).lerp(b, Math.max(0, Math.min(1, t)));
}

const ALERT_COLORS = {
  info:     new THREE.Color(0x4a8cff),
  warning:  new THREE.Color(0xffb030),
  critical: new THREE.Color(0xff3a3a),
};

const COMPOSTER_COLORS = {
  idle:         0x4a4a4a,
  grinding:     0x806030,
  mesophilic:   0xc08040,
  thermophilic: 0xd03030,
  cure:         0xb07050,
  tank_ready:   0x7090b0,
  dispensing:   0x6080a0,
};

// Given the latest snapshot from /api/stream, mutate the scene in place.
export function applySnapshot(parts, dims, snapshot) {
  const now = Date.now() / 1000;

  // Per-shelf updates from snapshot.zones[shelfId]
  for (const [sidStr, z] of Object.entries(snapshot.zones || {})) {
    const sid = Number(sidStr);
    // moisture → tray colour
    if (typeof z.moisture_pct === "number") {
      const tray = parts.get(`shelf.${sid}.tray`);
      if (tray) lerpColor(tray.material, "#6b4a32", "#2a5a8c", z.moisture_pct / 100);
    }
    // ppfd setpoint + hours_on → LED emissive
    const led = parts.get(`shelf.${sid}.led`);
    if (led && typeof z.ppfd === "number") {
      const max = led.userData.ppfd_max || 320;
      const hoursOn = typeof z.hours_on === "number" ? z.hours_on : 16;
      const onNow = (Math.floor(now / 3600) % 24) < hoursOn;
      led.material.emissiveIntensity = onNow ? Math.min(1.4, z.ppfd / max) : 0.0;
    }
    // vision → rebuild plants for this shelf if phase changed
    if (z.vision) {
      const existing = parts.get(`shelf.${sid}.plants`);
      const prevPhase = existing?.userData?.phase;
      const newPhase = z.vision.phase_estimate;
      if (existing && prevPhase !== newPhase) {
        const rack = dims.racks[0];
        const replacement = buildPlantsForShelf(rack, sid, dims, z.vision);
        replacement.userData.phase = newPhase;
        existing.parent.add(replacement);
        existing.parent.remove(existing);
        // Re-index just this slot
        parts.set(`shelf.${sid}.plants`, replacement);
      }
    }
  }

  // Composter
  const composter = parts.get("composter");
  if (composter && snapshot.composter?.phase) {
    const c = COMPOSTER_COLORS[snapshot.composter.phase] ?? 0x4a4a4a;
    composter.material.color.setHex(c);
  }

  // Alerts → bezel pulse on the affected shelf (or all if no shelf hint)
  // Clear all bezels first
  for (const [partId, obj] of parts) {
    if (partId.endsWith(".bezel")) obj.visible = false;
  }
  for (const a of snapshot.alerts || []) {
    const sid = a.shelf_id;
    const color = ALERT_COLORS[a.severity] || ALERT_COLORS.info;
    const targets = sid != null
      ? [parts.get(`shelf.${sid}.bezel`)]
      : [...parts.entries()].filter(([k]) => k.endsWith(".bezel")).map(([, v]) => v);
    for (const bezel of targets) {
      if (!bezel) continue;
      bezel.visible = true;
      bezel.material.color.copy(color);
      bezel.material.emissive.copy(color).multiplyScalar(0.5 + 0.5 * Math.sin(now * 4));
    }
  }

  // Safety trip → E-stop cap turns vivid red
  const estopCap = parts.get("estop.cap");
  if (estopCap) {
    if (snapshot.safety_trip) {
      estopCap.material.color.setHex(0xff0000);
      estopCap.material.emissive = new THREE.Color(0x550000);
    } else {
      estopCap.material.color.setHex(0xc81a1a);
      estopCap.material.emissive = new THREE.Color(0x000000);
    }
  }
}
