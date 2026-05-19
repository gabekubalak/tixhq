// Fetches cad/dimensions.yaml (served as JSON by the backend) and converts
// every length-like value from millimetres to metres for three.js. The
// rest of the renderer must never see raw mm.

let cached = null;

const LENGTH_KEYS = new Set([
  "width", "depth", "height", "wall_thickness", "inset",
  "pitch", "slat_height", "shelf_pitch", "shelf_lowest_y",
  "thickness", "height_above_tray", "diameter", "offset_z",
  "bezel_radius", "arm_length", "spacing", "x", "y", "z"
]);

function toMetres(node) {
  if (Array.isArray(node)) return node.map(toMetres);
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "mount_xyz" || k === "row_origin" || k === "position") {
        out[k] = v.map((n) => n / 1000);
      } else if (LENGTH_KEYS.has(k) && typeof v === "number") {
        out[k] = v / 1000;
      } else {
        out[k] = toMetres(v);
      }
    }
    return out;
  }
  return node;
}

export async function loadDimensions(fetchFn = fetch) {
  if (cached) return cached;
  const r = await fetchFn("/api/cad/dimensions");
  if (!r.ok) throw new Error(`dimensions fetch failed: ${r.status}`);
  const raw = await r.json();
  if (raw.units !== "mm") throw new Error(`unexpected units: ${raw.units}`);
  cached = toMetres(raw);
  return cached;
}
