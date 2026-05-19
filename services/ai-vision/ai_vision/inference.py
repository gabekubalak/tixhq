"""Vision inference.

Pan/tilts the camera through every shelf every VISION_PERIOD_S, captures a
frame, runs leaf segmentation (UNet) and classification (MobileNetV3-Small),
and publishes a grove.vision.observation message per shelf.

Models are loaded from /opt/grove/models and shipped via the update-manager;
this service never downloads anything.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from nats.aio.client import Client as NATS

log = logging.getLogger("ai-vision")

MODELS_DIR = Path(os.environ.get("GROVE_MODELS", "/opt/grove/models"))
VISION_PERIOD_S = 15 * 60
CAMERA_DEV = "/dev/grove-cam"
PHASE_CLASSES = ["germination", "seedling", "veg_early", "veg_late", "flower", "harvest_ready"]


@dataclass
class Shelf:
    shelf_id: int
    pan_deg: float
    tilt_deg: float


def _load_session(name: str) -> ort.InferenceSession:
    return ort.InferenceSession(
        str(MODELS_DIR / name),
        providers=["TensorrtExecutionProvider", "CUDAExecutionProvider", "CPUExecutionProvider"],
    )


def _capture(cam: cv2.VideoCapture, shelf: Shelf) -> np.ndarray:
    # In real deployment, sending shelf.pan_deg/tilt_deg to the camera mount
    # MCU happens over a separate I2C link; here we just read a fresh frame.
    cam.grab(); cam.grab()
    ok, frame = cam.read()
    if not ok:
        raise RuntimeError("camera read failed")
    return frame


def _preprocess(frame: np.ndarray, size: int = 224) -> np.ndarray:
    img = cv2.resize(frame, (size, size))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    img = (img - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    return np.transpose(img, (2, 0, 1))[None].astype(np.float32)


def _leaf_area_cm2(seg_mask: np.ndarray, px_per_cm: float = 18.0) -> float:
    pixels = float((seg_mask > 0.5).sum())
    return pixels / (px_per_cm ** 2)


def _color_health(frame: np.ndarray, mask: np.ndarray) -> float:
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    leaf = hsv[mask > 0.5]
    if leaf.size == 0:
        return 0.0
    healthy = ((leaf[:, 0] > 35) & (leaf[:, 0] < 85) & (leaf[:, 1] > 60)).mean()
    return float(healthy)


async def amain() -> None:
    logging.basicConfig(level=logging.INFO)
    seg = _load_session("leaf-seg-v0.2.onnx")
    cls = _load_session("leafnet-v0.3.onnx")
    model_version = "leafnet-v0.3"

    cam = cv2.VideoCapture(CAMERA_DEV)
    if not cam.isOpened():
        log.error("cannot open camera %s", CAMERA_DEV)
        return

    nats = NATS()
    await nats.connect("nats://127.0.0.1:4222")

    # Shelf pan/tilt presets come from a config file; placeholder here.
    shelves = [Shelf(i, pan_deg=i * 45.0, tilt_deg=10.0) for i in range(4)]

    while True:
        for s in shelves:
            try:
                frame = _capture(cam, s)
            except RuntimeError:
                continue
            x = _preprocess(frame)

            mask = seg.run(None, {seg.get_inputs()[0].name: x})[0][0, 0]
            logits = cls.run(None, {cls.get_inputs()[0].name: x})[0][0]
            probs = np.exp(logits - logits.max()); probs /= probs.sum()
            phase_idx = int(probs.argmax())

            msg = {
                "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "shelf_id": s.shelf_id,
                "phase_estimate": PHASE_CLASSES[phase_idx],
                "leaf_area_cm2": _leaf_area_cm2(mask),
                "color_health": _color_health(frame, mask),
                "model_version": model_version,
            }
            await nats.publish(
                f"grove.vision.observation.{s.shelf_id}",
                json.dumps(msg).encode(),
            )
        await asyncio.sleep(VISION_PERIOD_S)


def run() -> None:
    try:
        asyncio.run(amain())
    except KeyboardInterrupt:
        pass
