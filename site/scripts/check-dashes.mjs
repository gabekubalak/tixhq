#!/usr/bin/env node
// Voice-rule CI guard: fail if any em-dash (U+2014) or en-dash (U+2013)
// appears in site source. KrattOS copy uses commas, colons, "to", or
// full stops instead. See docs/business/scrollytelling-brief.md.

import { readdir, readFile, stat } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
// scripts/ lives inside site/, so site root is one level up.
const SITE = resolve(dirname(__filename), "..");
const ROOTS = [join(SITE, "src")];
// User-facing templates only. Code comments in .js / .ts can use em-dashes
// editorially; the voice rule applies to copy shipped to a browser.
const EXTS = new Set([".svelte", ".html"]);
const SKIP_DIRS = new Set(["node_modules", ".svelte-kit", "build", "dist"]);

const EM = "—";
const EN = "–";

async function* walk(root) {
  const entries = await readdir(root, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = join(root, e.name);
    if (e.isDirectory()) {
      yield* walk(p);
    } else {
      const dot = e.name.lastIndexOf(".");
      const ext = dot >= 0 ? e.name.slice(dot) : "";
      if (EXTS.has(ext)) yield p;
    }
  }
}

const findings = [];

for (const root of ROOTS) {
  try {
    await stat(root);
  } catch {
    continue;
  }
  for await (const file of walk(root)) {
    const text = await readFile(file, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (line.includes(EM) || line.includes(EN)) {
        findings.push({ file, line: i + 1, content: line.trim() });
      }
    });
  }
}

if (findings.length) {
  console.error("Voice-rule violation: em-dash or en-dash in site source.");
  console.error("Use a comma, colon, 'to', or full stop instead.\n");
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}`);
    console.error(`    ${f.content}`);
  }
  process.exit(1);
}

console.log("ok: no em-dash or en-dash in site source");
