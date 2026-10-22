# Typography — Step Change Brand v1.0

Ground truth for this file is `references/colors_and_type.css`, the actual token CSS from the Step Change Claude Design system (synced 2026-08-24). Read that file directly for exact values; this page explains how to use it correctly.

## Correction from an earlier draft of this skill

An earlier version of this file had the fallback chain wrong: it treated Bebas Neue as a mid-tier fallback for GC Vank. **That's incorrect.** Per the real token CSS, each face has its own independent token and its own Arial-based fallback — Bebas Neue is never a fallback for GC Vank, it's a separate face with its own job. Only one thing steps GC Vank down to Bebas Neue: dropping below the display floor (see below), which is a usage rule, not a font-loading fallback.

## The three faces, one job each

| Face | Token | Where it's allowed | Real files |
|---|---|---|---|
| **GC Vank** | `--font-display` | Display *only*: deck covers, title slides, big stat numbers, web hero headlines, posters. Never body, never in-deck headings, never below the display floor. **One GC Vank moment per artefact — the cover.** Never mixed with Bebas Neue inside one headline. | `assets/fonts/GCVank-Regular.woff2` (web), `.ttf`/`.otf` (desktop/Office). Licensed commercial release. |
| **Bebas Neue** | `--font-headline` | All supporting headlines, every in-deck slide heading, section labels, table heads, alert titles, eyebrows. | `assets/fonts/BebasNeue-Regular.woff2` / `.ttf`. Official Google Fonts (OFL), see `assets/fonts/BebasNeue-OFL.txt`. |
| **Instrument Sans** | `--font-body` | Body copy, bullets, UI, forms, tables, captions, footnotes. Sentence case, weights 400–700. | `assets/fonts/InstrumentSans-Variable.woff2`/`.ttf` (+ italic variable cut). Official Google Fonts (OFL), see `assets/fonts/InstrumentSans-OFL.txt`. |

**GC Vank has a hard floor: `--fs-display-floor` = 56px at 1920 scale.** Below that it stops reading as display type. If a layout would need it smaller, drop to Bebas Neue (headline) or Instrument Sans (body) instead of shrinking GC Vank.

## Fallback chains (per-token, independent — this is the corrected version)

```css
--font-display:  "GC Vank", "Arial Narrow", Arial, sans-serif;
--font-headline: "Bebas Neue", "Arial Narrow", Arial, sans-serif;
--font-body:     "Instrument Sans", Arial, Helvetica, sans-serif;
```

Arial is the one substitute everywhere — never a different fallback per platform, never `system-ui`. If a brand font genuinely can't load, the build should degrade to Arial predictably, not silently pick something else.

## Office / PowerPoint / Word / PDF-from-Office

These formats can't reliably embed GC Vank, Bebas Neue, or Instrument Sans. Use the office-specific tokens:

```css
--font-display-office:  Arial, sans-serif;
--font-headline-office: Arial, sans-serif;
--font-body-office:     Arial, sans-serif;
```

Inside Office itself, the condensed display/headline lines can be set in **Arial Narrow** (ships with Office on Windows and macOS) for a closer visual match — it isn't licensed for web embedding, which is why the web tokens resolve to plain Arial instead.

## If GC Vank isn't available this session

The real files now live in this skill's `assets/fonts/`, so this should rarely come up. If they're somehow missing, stop and ask where to find them (the Step Change Claude Design system, a Drive folder) before defaulting down the chain — don't drop to Bebas Neue or Arial Narrow silently. Note any substitution explicitly in the handoff.

## Scale, line-height, tracking (from `colors_and_type.css`)

| Token | Value | Use |
|---|---|---|
| `--fs-display-xl` | `clamp(3.5rem, 9vw, 8rem)` | Poster / hero headline |
| `--fs-display-l` | `clamp(2.75rem, 6vw, 5rem)` | Large display |
| `--fs-display-m` | `clamp(2rem, 4vw, 3.25rem)` | Medium display |
| `--fs-h1` / `--fs-h2` / `--fs-h3` | `2.5rem` / `1.875rem` / `1.375rem` | Body-face headings |
| `--fs-body-lg` / `--fs-body` / `--fs-small` / `--fs-caption` | `1.25rem` / `1rem` / `0.875rem` / `0.75rem` | Body scale |
| `--lh-display` / `--lh-heading` / `--lh-body` | `0.92` / `1.05` / `1.55` | Line-height by role — display is set tight, body is generous |
| `--tracking-display` / `--tracking-headline` / `--tracking-label` | `-0.01em` / `0.02em` / `0.08em` | Letter-spacing by role |

Body copy sits at 1.55 line-height with a roughly 46-character measure. Display and headline are both uppercase (via `text-transform`, not typed caps).

## Ready-made semantic classes

`colors_and_type.css` ships opinionated classes — prefer these over hand-rolling the same rules: `.sc-display` / `.sc-display-l` / `.sc-display-m` (GC Vank tiers), `.sc-headline` (Bebas Neue), `.sc-h1`/`.sc-h2`/`.sc-h3` (Instrument Sans bold headings), `.sc-body-lg`/`.sc-body`/`.sc-small` (body scale), `.sc-label` (tracked-out eyebrow), `.sc-gradient-text` (gradient keyword — apply to one word, never the logo).
