# Coverage: what this pack was built from, and what it was not

Compiled 21 October 2026 in a Cowork session. "Present" and "read" are different states; this file says which.

## Read in full and used
- `BOB_Product-and-Build-Brief_v1.md` (the original product brief; copied here under references/)
- `BOB_Method-and-Lessons_v1.md`, `START-HERE.md`, prompts 00 to 03, `BOB_Product-and-Build-Map_v4.opml`, `SKILL-SOURCE-MANIFEST.json` from the launch pack
- The `build-brief` skill: SKILL.md, enforcement.md, il-playbook.md, evidence-rules.md, block-questions.md, the brief template and the DoD checklist (copied here under references/build-brief/)
- Step Change Global/CLAUDE.md, Global/MEMORY.md, the mechanism ledger; grep hits in tools-and-connectors.md, working-rules.md and skills-system.md
- The plugin-authoring skill for this Claude Code build (2.1.304): the pane example, its test and the Pane, Text and Box prop types

## Read in part
- `Infinite-Leverage_Build-Excellence_Claude-Reference_v3.md`: opening synthesis and headings only. The embedded source library (SRC001 onward) was not read.

## Listed, not read
- `references/skills/*` and `references/scm-design-skill/` in the launch pack. The brand skill was not loaded; this pack is unbranded on purpose.

## Verified against official Claude Code docs on 20 October 2026
Headless and Agent SDK interfaces, hook events and blocking, plugins and marketplaces, settings precedence and deny behaviour, the absence of any documented Desktop or Cowork control API, and the Agent SDK third-party login policy. URLs are in docs/product/product-plan.md Part 0 and the design review page.

## Demonstrated in this session
- The pane spike validated (`claude plugin validate`), passed its test on four surface tables (`claude plugin test`), loaded in the desktop app and was seen by Ash on the Cowork surface (his words: "looks good", 21 October 2026).

## Not verified, stated plainly
- The pane on the Code tab surface. Installed Claude Code version and plan tier on Ash's and Mags' Macs. Hooks firing in Cowork cloud sessions. gate.yml running at all (unpushed). preflight.sh behaviour on SessionStart in the installed version. Baseline numbers for rework and briefing time.

## Pack integrity
`MANIFEST.json` carries sha256 for every file. Re-run `python3 -I scripts/check_manifest.py` to prove nothing drifted since this pack was written.
