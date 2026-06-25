#!/usr/bin/env node
// Drive the /render route headlessly to produce a deterministic WebP
// sequence per scene, at two widths (desktop + mobile), plus a
// manifest.json the front-end uses to scrub on scroll.
//
// Usage:
//   node scripts/render-sequences.mjs \
//     --base-url http://localhost:4173 \
//     --scenes cabinet,loop \
//     --frames 150
//
// Expects a running server at --base-url (typically `npm run preview`
// from the site/ directory).

import { chromium } from "playwright";
import sharp from "sharp";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
// scripts/ lives inside site/, so site root is one level up.
const SITE = resolve(dirname(__filename), "..");
const OUT_ROOT = join(SITE, "static", "sequence");

// Desktop frames at 1366x768 rather than 1600x900: on a typical laptop
// the canvas is ~1440 wide, so 1366 is plenty, and the smaller frames
// decode faster and hold far less bitmap memory (the thing that makes
// long scrubs jank). Mobile stays half-size.
const DESKTOP = { w: 1366, h: 768, quality: 80 };
const MOBILE = { w: 768, h: 432, quality: 78 };

function parseArgs(argv) {
  const out = {
    baseUrl: "http://localhost:4173",
    scenes: ["cabinet", "loop", "greenhouse"],
    // 100 frames is smooth for a scrub and a third less to decode/hold
    // than 150. Bump with --frames if you want buttery-slow motion.
    frames: 100,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base-url") out.baseUrl = argv[++i];
    else if (a === "--scenes") out.scenes = argv[++i].split(",");
    else if (a === "--frames") out.frames = Number(argv[++i]);
    else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: render-sequences.mjs [--base-url URL] [--scenes a,b] [--frames N]"
      );
      process.exit(0);
    } else {
      console.error(`unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

function pad(n, width = 4) {
  return String(n).padStart(width, "0");
}

async function captureScene(browser, baseUrl, scene, frames) {
  const sceneOut = join(OUT_ROOT, scene);
  await rm(sceneOut, { recursive: true, force: true });
  await mkdir(join(sceneOut, "desktop"), { recursive: true });
  await mkdir(join(sceneOut, "mobile"), { recursive: true });

  const context = await browser.newContext({
    viewport: { width: DESKTOP.w, height: DESKTOP.h },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  page.on("pageerror", (err) => console.error(`[${scene}] page error:`, err));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error(`[${scene}] console:`, msg.text());
  });

  const url = `${baseUrl}/render?scene=${scene}&w=${DESKTOP.w}&h=${DESKTOP.h}&t=0`;
  console.log(`[${scene}] opening ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => document.documentElement.dataset.ready === "1",
    null,
    { timeout: 30_000 }
  );

  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    const t = frames === 1 ? 0 : i / (frames - 1);
    await page.evaluate((val) => window.__krattos.setT(val), t);
    await page.waitForFunction(
      () => document.documentElement.dataset.ready === "1",
      null,
      { timeout: 10_000 }
    );
    const png = await page.locator("canvas").screenshot({ type: "png" });

    const desktopPath = join(sceneOut, "desktop", `frame-${pad(i)}.webp`);
    const mobilePath = join(sceneOut, "mobile", `frame-${pad(i)}.webp`);
    await Promise.all([
      sharp(png).webp({ quality: DESKTOP.quality }).toFile(desktopPath),
      sharp(png)
        .resize(MOBILE.w, MOBILE.h)
        .webp({ quality: MOBILE.quality })
        .toFile(mobilePath),
    ]);

    if (i === 0 || (i + 1) % 25 === 0 || i === frames - 1) {
      const dt = (Date.now() - t0) / 1000;
      console.log(
        `[${scene}] ${i + 1}/${frames}  ${(dt / (i + 1)).toFixed(2)}s/frame`
      );
    }
  }

  const manifest = {
    scene,
    frames,
    desktop: {
      width: DESKTOP.w,
      height: DESKTOP.h,
      pattern: `desktop/frame-####.webp`,
    },
    mobile: {
      width: MOBILE.w,
      height: MOBILE.h,
      pattern: `mobile/frame-####.webp`,
    },
  };
  await writeFile(
    join(sceneOut, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  await context.close();
  console.log(`[${scene}] done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

async function main() {
  const args = parseArgs(process.argv);
  console.log("rendering scenes:", args.scenes.join(", "), "frames:", args.frames);
  const launchOpts = { headless: true };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    console.log("using chromium at", launchOpts.executablePath);
  }
  const browser = await chromium.launch(launchOpts);
  try {
    // Sequential per scene so progress logs stay readable and the
    // single-context-per-scene contract is simple. The capture itself is
    // ~30s for 150 frames so wall-clock is acceptable.
    for (const scene of args.scenes) {
      await captureScene(browser, args.baseUrl, scene, args.frames);
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
