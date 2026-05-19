# cad/ — physical dimensions of the GroveOS appliance

This directory is the **single source of truth** for the geometry of the
GroveOS v1 appliance. The 3D twin in the web UI builds itself from
`dimensions.yaml` at runtime; there is no hand-modelled `.blend` or `.glb`
to keep in sync.

## Files

- `dimensions.yaml` — every length, position, and count. Units are
  millimetres. The renderer (`ui/frontend/src/lib/cad/dimensions.js`)
  converts to metres before handing values to three.js.
- `schema.json` — JSON Schema (draft 2020-12) that `dimensions.yaml`
  must satisfy. Validated by `scripts/validate_schemas.py`, which is
  part of `make verify`.

## Coordinate system

- **+X**: right (when facing the front of the cabinet)
- **+Y**: up
- **+Z**: toward the viewer (away from the back wall)
- **Origin**: front-bottom-centre of the cabinet, on the floor.

The cabinet therefore occupies `x ∈ [-W/2, W/2]`, `y ∈ [0, H]`,
`z ∈ [-D, 0]`.

## Editing

1. Edit `dimensions.yaml`. Keep all lengths in **mm**.
2. Run `make verify` — the schema validator must pass before the renderer
   will load the file in the browser.
3. Refresh `http://localhost:5173/3d` to see the change.

If you add a new part to `dimensions.yaml`, you'll also need to:
- Add it to `cad/schema.json`.
- Emit a mesh for it in `ui/frontend/src/lib/cad/buildAppliance.js`
  with a unique `userData.partId`.
- Add a row to `tests/unit/test_cad_dimensions.py::_emitted_part_ids`.

## Manual visual checklist

After backend + frontend are running (`uvicorn backend.main:app --port 8080`
and `cd ui/frontend && npm run dev`):

1. Open `http://localhost:5173/3d` — you should see the cabinet from the
   front, door closed, with the LCD lit and a red mushroom E-stop on the
   door.
2. Click **Open door** in the top bar — the door slab disappears and the
   four shelves, trays, plants, LED panels, fans, pan/tilt camera, and the
   reservoir / composter row at the bottom become visible.
3. In another terminal: `python3 tests/sim/simulated_zone.py --shelf 0`.
   The tray on shelf 0 should drift from brown toward blue as moisture
   rises, then reset and drift again as the simulator dries it out.
4. Hover a part — a tooltip shows its `partId`. Click to pin.
5. Publish a fake safety trip:
   `nats pub grove.event.safety.trip '{"ts":"2026-05-19T00:00:00Z","cause":"leak_pan","actuator_rail":"OFF","latched":true,"requires_ack":true}'` —
   the E-stop cap should turn vivid red.
6. Navigate to `/3d/arch` — services laid out in tiers, NATS subjects
   drawn as coloured tubes; hover any tube to see the subject name.

## Why not Blender?

The whole appliance is boxes, cylinders, and a torus or two — the kind of
geometry three.js builds in ~250 lines from primitives. Adding a headless
Blender toolchain to a Python + Rust + npm repo costs more than the
fidelity bump is worth at this scope. If photoreal product-shot renders
ever become a deliverable, add an opt-in `make renders` target that
exports the same `dimensions.yaml` to a Blender script; do **not** put it
in the default `make verify` path.
