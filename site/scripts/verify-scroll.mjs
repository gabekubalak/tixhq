#!/usr/bin/env node
// One-off verification: load the landing page, scroll through it, and
// screenshot at several depths to confirm the scrub canvas is drawing and
// the copy overlays fade in. Not part of the build; a manual check.

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] || "http://127.0.0.1:4173";
const OUT = process.env.SCROLL_CHECK_OUT || join(tmpdir(), "krattos-scroll-check");

async function main() {
  await mkdir(OUT, { recursive: true });
  const launchOpts = { headless: true };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });

  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const total = await page.evaluate(() => document.body.scrollHeight);
  console.log("scrollHeight:", total);

  const stops = [0, 0.12, 0.22, 0.32, 0.45, 0.6, 0.78, 0.92];
  for (let i = 0; i < stops.length; i++) {
    const y = Math.round(stops[i] * (total - 900));
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/stop-${i}-${Math.round(stops[i] * 100)}.png` });
    console.log(`stop ${i} @ y=${y} (${Math.round(stops[i] * 100)}%)`);
  }

  // Also capture a reduced-motion render.
  const ctx2 = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + "/", { waitUntil: "networkidle" });
  await p2.waitForTimeout(1200);
  await p2.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.18));
  await p2.waitForTimeout(800);
  await p2.screenshot({ path: `${OUT}/reduced-motion.png` });
  console.log("reduced-motion captured");

  await browser.close();
  console.log("\nerrors:", errors.length ? errors : "none");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
