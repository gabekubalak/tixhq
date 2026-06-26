#!/usr/bin/env node
// Render the /system page to a PNG so a layout fix (tier labels not
// overlapping nodes, no em-dashes) can be eyeballed without booting a
// browser by hand.

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] || "http://127.0.0.1:4173";
const OUT = process.env.OUT_DIR || join(tmpdir(), "krattos-system-check");

const launchOpts = { headless: true };
if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
  launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
}

const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("console: " + m.text());
});

await mkdir(OUT, { recursive: true });
await page.goto(BASE + "/system", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const path = join(OUT, "system.png");
await page.screenshot({ path });
console.log("wrote", path);
console.log("errors:", errors.length ? errors : "none");
await browser.close();
