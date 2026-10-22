# Logo and DBA assets — Step Change Brand v1.0

The wordmark is a bespoke lockup: STEP CHANGE in heavy condensed caps, sharpened angles in the "A" of CHANGE, with the gradient streak cutting through it. **The streak is the visual signature and the single most re-typeset element in past failures.** Never rebuild it from scratch. Use the real files below.

## Master files (in this skill's `assets/`)

| File | Variant | Use when |
|---|---|---|
| `full_black_colour.svg` | Full lockup (with tagline), black wordmark + colour streak | Light/white backgrounds, primary applications |
| `full_white_colour.svg` | Full lockup (with tagline), white wordmark + colour streak | Black/dark backgrounds, primary applications |
| `notag_black_colour.svg` | No-tagline mark, black wordmark + colour streak | Light backgrounds, small placements (roughly below 200px wide, footers, favicons) |
| `notag_white_colour.svg` | No-tagline mark, white wordmark + colour streak | Dark backgrounds, small placements |
| `full_single-colour_black.svg` | Full lockup (with tagline), all-black including streak | Light backgrounds, single-colour reproduction only (embroidery, single-colour print) |
| `full_single-colour_white.svg` | Full lockup (with tagline), all-white including streak | Dark backgrounds, single-colour reproduction only |
| `notag_single-colour_black.svg` | No-tagline mark, all-black including streak | Light backgrounds, single-colour reproduction only |
| `notag_single-colour_white.svg` | No-tagline mark, all-white including streak | Dark backgrounds, single-colour reproduction only |

These are vector masters — safe to scale to any size without loss. Reference them directly (`<img src="assets/full_white_colour.svg">` or inline the SVG) rather than re-encoding or redrawing.

## Rules — no exceptions

1. **Black or white only.** The wordmark itself is never any other colour. Only the streak carries the gradient (full-colour application) or matches the wordmark (single-colour application — both sets are covered by the files above, supplied 2026-09-03).
2. **Tagline text is exact:** STRATEGY MEET CREATIVITY. No comma. "Meet", not "meets". It exists only inside the full-lockup file — never typeset as loose text near the logo, never approximated in a different font.
3. **Clear space:** no less than the height of the "S" in the logo, on all sides.
4. **Pick the full lockup by default.** Drop to the no-tag variant only when the tagline would genuinely be illegible at the placement size.

## Identity check (run before shipping any artefact with the logo in it)

- Is the correct file variant in use for the background it sits on (black wordmark only ever on light, white wordmark only ever on dark)?
- Is the gradient streak present and unaltered?
- If the full lockup: is the tagline text exactly "STRATEGY MEET CREATIVITY", no comma, "meet" not "meets"?
- Has the file been redrawn, re-encoded, or approximated in any way, rather than referenced directly? If yes, stop and fix.

If any check fails, or the right variant genuinely isn't in `assets/` for the situation (e.g. a single-colour variant, or a size/format not covered here), **stop and ask** rather than freehanding a replacement.

## Secondary raster reference (`assets/png-reference/`)

The Step Change Claude Design system (synced 2026-08-24) independently extracted the logo family as PNGs and concluded no vector originals existed in its source material — it only had the brand guide PDF and prior extraction passes to work from. The SVGs above predate that system and are genuine Adobe Illustrator exports (confirmed: `Generator: Adobe Illustrator 29.8.4`, fully vectorized paths, zero `<text>` elements) — so they remain the master asset, ahead of what Claude Design itself has access to. The PNGs in `assets/png-reference/` (`logo_fullcolour_white_on-dark.png`, `logo_fullcolour_black_on-light.png`, `logo_single-colour_white.png`, `logo_single-colour_black.png`) are kept only as a secondary cross-check or for contexts that specifically need raster (e.g. matching an existing PNG-based build) — default to the SVGs.

## The DBA (steps motif) — now a real vector asset

**`assets/dba-motion-outline.svg`** is the real vector master, synced from the Claude Design system (2026-08-24). This closes the gap flagged in an earlier version of this file, which had no standalone DBA vector and told builders to derive the geometry by eye — don't do that anymore now that the real file exists.

Confirmed geometry from the actual file: five rounded-rectangle bars (`rx="22"`), skewed via `transform="skewX(-26)"`, ascending in a staircase pattern, stroked (not filled) with the accent gradient (`#F75821` → `#FA381E` → `#FF1900`) at `stroke-width: 3` inside a `900×640` viewBox. This is the "in motion" / outline treatment — cascading stepped outlines used as a slow background element, never a foreground graphic, never more than a subtle motif behind other content.

There's also a solid/filled treatment referenced as `assets/png-reference/dba_shape_white.png` (raster) for the static solid-white steps version described in the brand guide (used e.g. as a small foreground marker rather than a background wash). If a build needs a solid-fill vector DBA and only the raster exists, ask before redrawing it — the same "never approximate" rule applies here as to the wordmark.

## Embedding the DBA in code (Cowork / Claude Code) — the part that was missing

The DBA file carries a specific aspect ratio and anchor baked into its own attributes: `viewBox="0 0 900 640"` and `preserveAspectRatio="xMaxYMid meet"` — meaning it scales to fit its container without distortion (`meet` = contain-like, never stretch), anchored to the right edge, vertically centred. **This only holds if those two attributes survive intact.** Claude Design's own renderer respects them automatically, which is why the same file looks right there and wrong when hand-embedded elsewhere. The fix is procedural, not visual:

1. **Never strip `viewBox` or `preserveAspectRatio`** when copying, inlining, or recolouring the file. If the SVG markup you're about to paste doesn't have both attributes on the root `<svg>` tag, stop — something upstream already broke it.
2. **Never force both width and height to fill an unrelated container** (`width: 100%; height: 100%` on a box with a different aspect ratio, or `object-fit: cover` on an `<img>` use, or CSS `background-size: cover` if it's ever used as a background image). Any of these overrides the file's own contain-and-anchor behaviour and produces exactly the stretched/cropped/wrong-corner failure this was built to prevent. Use `object-fit: contain` for `<img>` usage, or better, inline the raw `<svg>` and let it size itself inside a container that shares or approximates its `900:640` ratio.
3. **Reference implementation** (background motif behind a hero, the standard use case):

```html
<div class="sc-dba-motif" aria-hidden="true">
  <!-- paste the real assets/dba-motion-outline.svg contents here, unaltered -->
</div>
```
```css
.sc-dba-motif {
  position: absolute;
  inset: 0;             /* sized by its parent section, not by itself */
  overflow: hidden;      /* crop intentionally at the section edge, don't stretch to fill it */
  pointer-events: none;
  z-index: 0;            /* behind foreground text/content */
  opacity: 0.35;         /* subtle background element, per the brand's motion rules — never full-strength foreground */
}
.sc-dba-motif svg {
  width: 100%;
  height: 100%;
  /* viewBox + preserveAspectRatio on the SVG itself do the contain/anchor work — don't add object-fit or a forced aspect-ratio override here */
}
```

If a build needs the DBA as a small solid foreground marker instead (not the background-motion treatment), that's the separate raster asset (`assets/png-reference/dba_shape_white.png`) or a filled (non-stroke) variant — don't force the outline file into a foreground role by cranking its opacity up; ask if a dedicated foreground vector doesn't exist yet.

4. **If the gradient looks flat, wrong, or missing:** the file defines its gradient via `<linearGradient id="dbaStroke">`. If the DBA is inlined more than once on the same page, or alongside any other inlined SVG that happens to reuse the id `dbaStroke`, the browser will only honour the first definition and every other instance breaks or goes flat. Give each additional inlined instance a uniquely renamed gradient id (and update its `stroke="url(#...)"` reference to match) rather than pasting the same markup twice unmodified.

## Standalone project builds (own `/assets`, `/fonts` folders)

When the output is a downloadable, standalone project rather than a single artifact living inside Claude, **copy the actual files** — this skill's `assets/dba-motion-outline.svg`, the four logo SVGs, and everything in `assets/fonts/` — into that project's own asset directory as part of the build, and reference them with paths that match the delivered folder structure. Don't leave code pointing at a path like `assets/fonts/GCVank-Regular.woff2` on the assumption it'll resolve — it only resolves if that file was actually placed there in the shipped project. This applies equally whether the deliverable stays a single HTML file (inline everything: SVG markup inline, fonts as base64 `@font-face` `src: url(data:...)` if the file needs to be fully self-contained) or ships as a multi-file project (real font/asset files copied alongside the code, referenced by relative path).
