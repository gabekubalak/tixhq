# Getting started

This guide walks through bringing up a fresh GroveOS appliance and planting
your first crop.

## 1. First boot

1. Connect 24V power. The contactor stays open until the safety MCU
   completes its self-check (~3 seconds — front-panel LCD will show
   `SAFETY: ARMED`).
2. The LCD will display the LAN address (`grove.local` or `grove-XXXX.local`).
3. From a phone or laptop on the same LAN, open `http://grove.local` in a
   browser. No login is required — the UI is LAN-only.

## 2. Calibrate the probes

Replace `lab-grade pH calibration buffer` and `EC reference solution`
according to the on-screen prompts. The UI will guide you through:
- pH: 7.0 → 4.0 → 10.0 (in that order)
- EC: 1.413 mS/cm reference
- moisture probes: dry-in-air → submerged-in-water two-point calibration

Calibration values are stored locally and prompted again every 60 days.

## 3. Load the composter

1. Open the composter hopper (top of the appliance).
2. Drop in clean food scraps. Avoid: meat, dairy, citrus-only, anything oily.
3. Close the hopper and press `Start` on the LCD.
4. The composter runs for ~5 days before the first slurry is available.
   Status is visible in the UI under `Composter`.

## 4. Plant

1. Sow seeds in your medium of choice on a shelf tray.
2. In the UI, open the shelf and choose a recipe (Lettuce, Basil,
   Microgreens). Confirm with the `I am here` toggle.
3. The recipe engine sets the setpoints and the photoperiod begins on
   the next local-time sunrise.

## 5. Maintain

Weekly checklist:
- Top up the clean-water reservoir (line on the front).
- Drop scraps into the composter as needed.
- Glance at the UI for alerts. None? Walk away.

## 6. Harvest

When a shelf is ready the LCD shows `HARVEST READY: shelf N`. Open the
shelf, harvest, refill medium and seeds, re-assign the recipe.

## Recovery from a safety trip

A latched trip means the contactor is OPEN — no actuators can run.
1. Read the cause on the LCD (`leak_pan`, `over_temp`, etc.).
2. Resolve the physical issue.
3. In the UI: `Safety` → `Reset` (toggle `I am here`).
4. Hold the physical reset button for 2 seconds.

The system re-arms only if both the UI ack and the physical button are
seen by the safety MCU. There is no remote bypass.
