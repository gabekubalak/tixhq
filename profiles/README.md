# Site profiles

A site profile tells KrattOS what kind of physical setup it's driving.
The same code runs an indoor cabinet, a hoop-house, or a single shelf
on a wire rack. Each has a profile that declares its zones, manifold,
composter, climate control, and safety hardware.

## How it's used

1. Pick or write a profile here.
2. Set `KRATT_PROFILE=<name>` (drop the `.yaml`).
3. `systemctl restart kratt.target` (or `kratt-greenhouse.target`, or
   `kratt-lite.target`, whichever matches your hardware tier).

Services that need site context import the loader:

```python
from site_config import load_profile
profile = load_profile()
for zone in profile.zones:
    ...
```

Validation runs as part of `make verify`. The schema is
`schemas/kratt.site.profile.schema.json`.

## Reference profiles

| Profile | Form factor | Zones | Composter | Auto-dosing |
|---------|-------------|------:|:---------:|:-----------:|
| `cabinet-v1.yaml`     | Indoor appliance cabinet | 4 shelves | yes | yes |
| `greenhouse-v1.yaml`  | 14x30 ft hoop house | 6 NFT beds | yes | yes |
| `shelf-mini-v1.yaml`  | Single wire shelf | 1 shelf | no  | no  |

## Writing a new profile

Three rules:

1. Every zone gets a unique integer `id`. Services address zones by id
   (`kratt.zone.{id}.sensor.moisture`), so the id is the bus key.
2. `type` and `medium` are descriptive only at this layer; the control
   loop reads `medium` to know whether to expect moisture (soil/coco)
   or EC (NFT/DWC) as the primary feedback signal.
3. `lighting.source: natural` means KrattOS will not drive any LED
   output for that zone. The recipe's light block is treated as
   informational. Useful for greenhouse beds in summer.

The schema (`schemas/kratt.site.profile.schema.json`) defines every
allowed field and enum. `make verify` will fail loudly on a typo or
out-of-range value.
