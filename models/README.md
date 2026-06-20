# Models

On-device ML models for KrattOS vision and planning. Models run locally
on the Jetson Orin Nano via ONNX Runtime (TensorRT EP preferred). No
network access is required or used.

## Inventory

| Model | Task | Input | Runtime |
|-------|------|-------|---------|
| leafnet-v0.3.onnx | Phase classification (6 classes) | 224×224 RGB | ~8 ms (TensorRT FP16) |
| leaf-seg-v0.2.onnx | Leaf area segmentation (binary mask) | 256×256 RGB | ~12 ms (TensorRT FP16) |
| ec-drift-lgbm-v0.1.txt | 6-hour EC drift regression | 10 float features | <1 ms (CPU) |

## Delivery

Model files are NOT committed to git. They ship inside signed update
bundles (see `services/update-manager/`). On a fresh appliance, models
are pre-installed at `/opt/kratt/models/` as part of the factory rootfs.

## Training

Training data comes from `data-export` USB dumps that users optionally
contribute. Training happens offline on a workstation. After training:

1. Export ONNX/LightGBM text file
2. Add entry to `manifest.json` with sha256
3. Bundle into a signed tar with `minisign`
4. Distribute via USB stick or local network share

## Schema

See `manifest.json` for the authoritative model registry with input/output
shapes, preprocessing specs, and provider preferences.
