# KrattOS: Brand & Logo

## The mark

A **power-on glyph fused with a sprout**. The universal power symbol (⏻)
says "this is a device you switch on", KrattOS is an appliance OS. The
power bar becomes a stem; two leaves unfurl through the ring's gap. One
mark, two readings: **switch it on → it comes alive.**

That dual reading is also the Kratt myth in a single glyph, in Estonian
folklore the Kratt is an object assembled from household odds-and-ends
and animated into a living helper. KrattOS animates a steel cabinet into
something that grows food.

## Files

| File | Use |
|------|-----|
| `krattos-logo.svg` | Primary horizontal lockup, light backgrounds. Font embedded, self-contained. |
| `krattos-logo-dark.svg` | Horizontal lockup on the deep-green field. |
| `krattos-mark.svg` | Icon only, full colour. App tiles, watermarks, spot use. |
| `krattos-mark-mono.svg` | One-colour icon. Uses `currentColor`: set `color:` to ink for light bg, cream for dark. Leaf detail is negative-space so it works on any background. |
| `krattos-icon-app.svg` | Rounded-square app icon / social avatar (green field, cream mark). |
| `favicon.svg` | Simplified mark for browser tabs (no veins, holds up at 16px). |
| `exports/*.png` | Rasterised versions for GoFundMe, social, app stores. |

The SVGs embed a subset of **Space Grotesk** (SIL OFL), so the wordmark
renders identically everywhere without the font installed.

## Colour

| Token | Hex | Use |
|-------|-----|-----|
| Evergreen | `#2E5A41` | Mark ring + stem, dark backgrounds, `theme-color` |
| Leaf back | `#3F7350` | Rear leaf (depth) |
| Leaf front | `#6FB07A` | Front leaf |
| Vein | `#234734` | Leaf veins (low opacity) |
| Brass | `#C2992E` | The "OS" in the wordmark; premium accent: use sparingly |
| Ink | `#23201B` | "Kratt" wordmark, body text on light |
| Paper | `#F4F1EA` | Warm off-white background, reversed marks |

Greens and brass come straight from the appliance render (powder-coated
sage steel, oak, brushed brass). The palette is solarpunk: natural,
warm, optimistic, never neon or clinical.

## Typography

- **Wordmark & headings:** Space Grotesk, weight 600, tracking ≈ -2.7%
  (`letter-spacing: -4px` at 150px). Geometric backbone, just enough
  character (note the `a`, `t`, `r`).
- **Body / UI:** system-ui sans is fine; Space Grotesk 400 to 500 if you
  want brand consistency.
- The wordmark is one word with a colour shift: `Kratt` in ink, `OS`
  in brass. Never add a space or hyphen between them.

## Clear space & minimum size

- **Clear space:** keep padding of at least the height of the mark's ring
  stroke (≈ 1/8 of the mark height) on all sides. The fitted SVG viewBoxes
  already bake in sensible padding.
- **Minimum size:** mark works down to 16px (use `favicon.svg` below
  24px). Full lockup: don't go below 120px wide or the brass "OS" muddies.

## Do / Don't

**Do**
- Use `krattos-logo.svg` as the default. Use the mark alone only where the
  brand name appears elsewhere on the page.
- Recolour the mono mark via `color:` for one-ink contexts.
- Put the dark lockup on the evergreen field or photography.

**Don't**
- Don't recolour the leaves outside the palette, add gradients to the
  wordmark, or apply drop shadows.
- Don't stretch, rotate, or rearrange the mark and wordmark.
- Don't put the light (ink) lockup on a dark or busy background, use the
  dark or reversed-mono version.
- Don't make "OS" a separate word or change its colour to match "Kratt".

## Regenerating

The whole set is built by a script (kept out of the repo to avoid a
fontTools runtime dep). To rebuild: download Space Grotesk, subset it to
the wordmark glyphs, base64-embed at weight 600, and emit the SVGs with
the shared mark path. Ping the maintainer for the build script if the
typeface or palette changes.
