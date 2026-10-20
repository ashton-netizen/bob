# build-brief (the Step Change Build Brief), v2.1

Interrogates any Step Change build before code is written, turns every answer into enforcement, then verifies the live build against its own Definition of Done.

- **Owner:** Ashton Bishop. **Technical reviewer:** Alicia.
- **Review cadence:** after every third build briefed with it, and quarterly.
- **Connector dependencies:** none required. Uses ListSkills, the Netlify connector (read-only) and Claude in Chrome when available. No database connector; Supabase checks run as repo scripts in Claude Code or as pasted results.
- **Companion skill:** `ship-it-safely` (installed 2 October 2026). Its checks become tests in the required suite.

## What changed in v2 (2 October 2026)

- Operator time capped at 60 minutes, cost announced up front, questions batched in rounds with Claude working between them (Ashton's ruling).
- One four-part Step Change Build Brief: gates, product plan (5 Ds), development plan in the Infinite Leverage format, enforcement map.
- Enforcement over interview, from the Battle of the tAItans verdict: remote required checks, a deploy path that cannot skip them, buy security rather than write it, threat map into tests, AI pen test last.
- Infinite Leverage's 18 protocols, 5 Ds, guard lines and the Karpathy and Bach reviews, with Step Change house rules winning clashes.
- Corrected v1's false claim that no "18 protocols" list exists.
- v2.1: paste-ready named-expert review prompts (Karpathy, senior QA lead, James Bach, code reviewer), and Protocol 16's rule that a senior code review runs before anything emails a customer.

## Install

- **Cowork or claude.ai:** open the `.skill` file from the chat and click Update skill (or Save skill). Then check Customize, Skills for a duplicate of the same name.
- **Claude Code:** unzip into `~/.claude/skills/` or a repo's `.claude/skills/`, then restart the session.

## Use

- **Interview:** "Brief this build: [one line]". It states how many questions and minutes first.
- **Check:** "check my build brief" or "is this ready to build" with a spec or IL product plan. Only the gaps get asked.
- **Verify:** "Check the build against the brief". Read-only; you first, then QA.

The brief lives in `CLAUDE OUTPUTS/<project>/<Project>_Brief_vN.md` until a repo exists, then in the repo at `docs/product/product-plan.md`, with CLAUDE OUTPUTS keeping a dated snapshot only.

## Files

- `SKILL.md`: clock, modes, Step 0, rounds, ten blocks and Stop-ifs, enforcement, verdict, output, hand-off.
- `references/block-questions.md`: deeper probes per block, tagged by source.
- `references/il-playbook.md`: Infinite Leverage distilled, with the house-rule overrides and guard lines.
- `references/review-prompts.md`: paste-ready Karpathy, senior QA lead plus James Bach, and code-reviewer prompts, adapted for Netlify and branch-first.
- `references/enforcement.md`: strength ladder, repo wiring, deploy bypass, buy-don't-write, threat map, UX states.
- `references/lessons-library.md`: what broke on VGA, tAItans and the IL setup, and the rule it became.
- `references/evidence-rules.md`: Verify mode.
- `references/sources.md`: internal and external sources.
- `assets/step-change-build-brief.md`: the four-part brief template.
- `assets/dod-checklist.md`: the DoD, reused unchanged in Verify.
- `evals/evals.json`: seven prompts.

## Evals

Prompts 1 to 3, 6 and 7 should trigger; 4 and 5 should not. Prompt 7 tests the time cap.

## Maintenance

- Re-read the Infinite Leverage site and the tool names in `enforcement.md` at each review; neither is static.
- Add a lesson only when a real build hit it and the fix was confirmed.
- Keep model ids, prices and line numbers out of every file.
- Description at or under 1,000 characters (cap 1,024). Re-count on every edit.
- Success measure: across the next three builds, zero post-deploy defects a block should have caught. Retire or rewrite if two of three still ship one.
