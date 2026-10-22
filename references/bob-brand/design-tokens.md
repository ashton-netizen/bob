# Design tokens — Step Change Brand v1.0

Source: `references/colors_and_type.css`, synced from the Step Change Claude Design system (2026-08-24). This is now the authoritative token set — more precise than the brand guide PDF alone, since it was cross-checked against printed RGB and a prior extraction pass. Read `colors_and_type.css` directly when building; this page is a map of what's in there and how the rules stack up.

## Canvas balance (reconciles the operator's correction with the system's own rule)

Two things are both true and need to be honnored together:

- The token system defaults **dark-first**: `--bg` (`#0F0F0F` near-black) is the primary surface, `--bg-pure` (`#000000`) separates an adjacent section without introducing a new colour. White (`--bg-light`) is legal for print, inversion, and light sections — never mixed section-to-section within one page more than once or twice.
- **Never more than two background values in a single artefact.** This is the actual discipline behind "not all-dark" — it isn't "alternate freely," it's "pick your two surfaces on purpose and don't add a third."

So: confirm with the operator (per the alignment step) which two surfaces this build uses — e.g. near-black + white, or near-black + pure-black-for-separation — and hold to exactly those two. Don't default to all-dark, and don't turn it into an unrestrained rainbow of panels either.

## Colour

**Base:** white `#FFFFFF`, near-black `#0F0F0F` (default canvas), black `#000000`.

**Accent (one family only):** orange `#F75821` → red-orange `#FA381E` → red `#FF1900`. This exists to be a gradient; the gradient is the brand's only decorative flourish. Solo `--accent` (= orange) is the fallback when one flat colour is needed — icon strokes, hairline rules, focus states.

**Gradient angles:** `90deg` for surfaces (`--gradient-accent`), `105deg` for text (`--gradient-accent-diagonal`, via `.sc-gradient-text`). The brand guide doesn't specify an angle; these are the values the Claude Design system settled on matching the rendered swatch — treat as the working standard.

**Support (charts/data/categorisation only — never a brand surface, button, or heading):** green `#6DCC6F`, amber `#FF9900`, cyan `#01DDE8`, red `#F40219`.

**Semantic surface tokens (dark-first):** `--surface` `#1A1A1A` (raised panel), `--surface-2` `#242424` (hover/input fill), `--hairline` `rgba(255,255,255,0.12)`, `--hairline-strong` `rgba(255,255,255,0.22)`. Text on dark: `--fg1` white, `--fg2` `rgba(255,255,255,0.66)`, `--fg3` `rgba(255,255,255,0.42)`. Light-surface inverses exist for all of these (`--fg1-on-light` etc.) — use them, don't hand-roll opacity values on the fly.

**Gradient discipline:** reserved for the streak inside the logo's A, primary CTA buttons, and a single keyword inside a display headline. Never a page background, never a card fill, never behind body copy.

## Spacing, radii, elevation, motion

- **Spacing:** 4-based rhythm — 4/8/12/16/24/32/48/64/96/128px (`--space-1` through `--space-32`). Section padding is fluid: `clamp(72px, 9vw, 150px)` vertical, `clamp(24px, 5vw, 72px)` horizontal, inside a `1180px` max-width column.
- **Radii:** pill (`999px`) for buttons/chips, `18–20px` for cards/modals, `10–14px` for inputs/small icon tiles, sharp `0` for full-bleed bands and the DBA device. Nothing in between.
- **Elevation:** value-first, not shadow-first — shadow reads weakly on near-black. `--surface` panels on `--bg`, separated by a hairline, not a heavy drop shadow. `--elev-1`/`--elev-2`/`--elev-3`/`--elev-accent` exist for panels, popovers, modals, and gradient CTAs respectively, each pairing a drop shadow with a 1px inset top highlight.
- **Motion:** short and unfussy — `120–200ms` (`--dur-fast`/`--dur-base`), plain ease-out. Hover on a gradient button is `filter: brightness(1.08)`, press is `scale(0.97)`. Cards lift `translateY(-3px)` on hover. No bounces, no spring, no parallax, no scroll-jacking. **The one motion exception is the DBA motif** — cascading stepped outlines used as a slow background element (see `references/logo-dba-assets.md`). This motion vocabulary applies to HTML/React only — see the output-format routing table in `SKILL.md` for why it never crosses into PPTX/DOCX/PDF.

## Components available as reference

`references/components/` holds the real exported components from the Claude Design system (Button, Card, DataTable, DisplayHeading, Feedback/Alert+Badge, FormControls, Logo, SectionTag) as `.jsx` + rendered `.html` previews. Use these as the pattern reference for HTML/React builds rather than inventing new component conventions — they already encode the token usage correctly (e.g. `Button` renders the gradient pill or hairline ghost variant, `DataTable` sets a Bebas Neue uppercase head with tabular numerals on numeric columns).

## Known caveats (carried over from the Claude Design system's own README)

- The brand guide source is a WIP draft (some slides had lorem ipsum) — get the signed-off version before locking anything permanent.
- CMYK values printed in the original guide are placeholder junk (`C255 M255 Y255 K255`) — don't use them; real print values need separate definition if print output is ever required.
- No icon library is specified in the brand guide. The Claude Design system substitutes Lucide (stroke-width 1.6, 20–26px, coloured `var(--orange)` on dark) as a flagged stand-in, not a confirmed brand asset — swap it if Step Change has a licensed icon set.
- No photography/illustration direction exists in the guide; treat any imagery guidance as inference, confirm with the brand owner before treating it as canon.
