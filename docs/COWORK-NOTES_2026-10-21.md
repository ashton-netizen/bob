# Cowork session notes for the BOB repo, 21 to 22 October 2026 (untracked; the next session commits or discards via pull request)

Written by the Cowork session that produced the plan. It found Build 1 and Build 2 Part A already merged on main and did NOT edit any tracked file. One incident to record first.

## Incident: Cowork force-wrote six tracked files at 23:52 on 21 October, then restored them from main HEAD
`device_commit_files` with `force: true` replaced START-HERE.md, docs/handoff.md, docs/KICKOFF.md, docs/project-status.md, docs/product/product-plan.md and MANIFEST.json with Cowork's older versions. All six were restored from `git show HEAD:<file>` (commit 048941f) within the hour; `git status` then showed only this file's sibling `docs/evidence/E-00-spike-validate-and-test.txt` as untracked. Nothing of the session's was lost because everything was committed. Rule now in Step Change working-rules: never `force` a write into a folder a Claude Code session may be working in; an mtime rejection means re-stage and merge.

## Additions for the plan (Part 0 and Part 3), proposed, not applied
1. ADR-03, onboarding. Opening a folder in the Code tab was a wall for a first-time builder (three turns and a Terminal line on Ash's own Mac, 21 October). BOB removes the step: one saved local environment named BOB per machine, created once from the folder picker's "+ New environment" (Local tab, Folders), pointing at one workspace root (`~/BOB`); every project a subfolder that `/bob new <name>` creates and registers; the pane shows the current project. Design in Cowork, which needs no folder. Build 3 scope: `/bob new`, a workspace-root CLAUDE.md template, and the Mags pilot kickoff opening with that one-time setup, written from a screenshot of her screen.
2. Part 3 rows missing for two DoD lines (outcome check 21 October, 9 of 10 pass): Build 1 DoD 4 (marketplace install loads BOB and the pane appears: Ash confirms, plus the validate required check, strength 1 and human) and Build 2 DoD 1 (`/bob adopt` creates a branch with `bob/` files and leaves main unchanged: a suite test asserting the branch exists and main's tree hash is unchanged, strength 3). The Stop-if table claims every line is mapped; add the rows or soften the claim.
3. Part 1 wording: the ROI line still reads "proposed, for Ash to accept in Round 2"; Round 2 locked it on 20 October.
4. Standing rule learned here: operator UI steps are written only after a screenshot of the operator's screen; vendor docs explain what the screenshot shows. Now in Step Change Global/CLAUDE.md. The pilot kickoff for Mags follows it.

## Evidence artefact
`docs/evidence/E-00-spike-validate-and-test.txt`: the Cowork-side spike's validate and test output (engine 2.1.304 in the Cowork container) and Ash's Cowork-surface look. Keep beside `docs/evidence/build-1/B1-spike-validate-test-2.1.304.txt` or drop it; the build-1 file is the one the ledger cites.

## Gap check against Ash's six items (22 October 2026), proposed Build 3 scope
| Item | State | Closes with |
|---|---|---|
| Structured stack and configuration | Partial | Per-Stepper stack list (desktop app version, engine 2.1.304 floor, git, gh, seat, repo access) plus ADR-03 saved environment and `/bob new` |
| Profile agents: design, build, quality control | Missing | Plugin `agents/`: bob-designer (Cowork design room), bob-builder (goal runner under the gates), bob-reviewer (Karpathy and Bach passes returning PASS or FAIL per DoD line as evidence records). Never-list enforced by tool permissions on each |
| Safety and stability | Partial | Rehearse rollback; R12 reconcile after interruption, not only a stale flag; deny rule to strength 1 via the CI grep (Part B step 11) |
| Scheduled agents in the cloud | Not covered | Spike first: one scheduled routine (AquaAgent 7am loop) run as a cloud session on a repo carrying BOB; observe whether `enabledPlugins` loads it and the gates fire. Blocked runs need allow rules or a PermissionRequest hook (documented). R21 moves on the result |
| Partner with Claude in the planning | Method covered, product not | `bob-design` skill and review pages as views of brief.json |
| Optimise data sources before dashing off | Designed, unproven | Part B steps 7 and 8 on AquaAgent are the first real run; INC-01 candidate is the 18 October source consolidation |

## Brand assets added 22 October 2026 (untracked, assets/brand/)
- `favicon.svg` and `favicon-light.svg`: the BOB mark, GC Vank B traced to a path (licence R6ZLS29H4P) on a `#0F0F0F` tile, one flat accent step bar `#F75821` (design-tokens.md: solo accent for icons; gradient reserved). PNGs at 16, 32, 48, 180, 512 for both. `build_mark.py` regenerates them from the font file in scm-design-skill.
- `bob-illustration-steps-2048.jpg`: Nano Banana (Gemini) image chosen by Ash. Monochrome cube staircase, one orange cube with a white B on top. Use for the pane header, README and pilot page; it carries the accent for its section.
- Review page: https://claude.ai/artifact/R4YcMNjJkUDWHHFkG8R36Q (private). Next session: commit via pull request, wire favicon.svg into any HTML BOB serves, and reference the illustration in README.md. No SpongeBob likeness was used or is to be used; the mark and image are original.

## Mark decision, 22 October 2026 (supersedes the favicon lines above)
- Ash chose the sponge B as BOB's mark. Files in `assets/brand/`: `bob-sponge-render-2048.jpg` (near-black sponge, white B, orange band, for light surfaces), `bob-sponge-render-light-2048.jpg` (white sponge, near-black B, for dark surfaces), tiles `bob-sponge-tile-{16,32,48,180,512}.png` and `bob-sponge-tile-light-*.png` with transparent corners, `bob-sponge-proof-pair.png` (16 px check on both tab colours, passed).
- Flat vector fallback where an SVG is required: `bob-favicon.svg` / `bob-favicon-light.svg` (hi-vis tile with eyes, hand-drawn, 639 bytes). The GC Vank B (`favicon.svg`) is retired as the favicon and kept as a wordmark lockup.
- `bob-character-render-2048.jpg` is BOB the character (solid cube, orange band, eyes) for the pane and README hero. Rule carried into the brand: no face ever goes on the sponge; the character with eyes is the solid cube only. No likeness of any existing character in any colourway.
- Method: creative-territories run, three routes rendered, sweep and cull on https://claude.ai/artifact/M9AGEiauZjWwbrb3U2RAey. Mark page v3: https://claude.ai/artifact/R4YcMNjJkUDWHHFkG8R36Q. Renders: Nano Banana via gemini.google.com, 2048 px, QC at full size.
- Next Code session: commit `assets/brand/` via pull request (never main); pick the twin per surface (light tab = dark sponge, dark tab and pane = light sponge); add `<link rel="icon">` to any HTML BOB serves using the PNG tiles, SVG fallback second.
