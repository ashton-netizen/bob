# Definition of Done · BOB Build 1
From: docs/product/product-plan.md, version 1 (20 October 2026) · Reused unchanged in Verify mode. Never edit a line to match the build.

Each line is tickable yes or no by a stranger in a fresh Claude Code session on a repo with BOB installed. Each names its enforcement point from Part 3 of the plan.

## Build 1 lines
- [ ] Given a repo with BOB and no approval record, when a stranger asks Claude to change a file, then the edit is refused and the message names the missing approval and one next action. · Gate A `tool.call` deny · test seen red then green
- [ ] Given an approved increment, when the round ends with no evidence for its requirement IDs, then the turn is blocked and the IDs are listed. · Gate B Stop block · test seen red then green
- [ ] Given a ledger file, when the Code tab opens, then the pane shows every requirement's state and a stale flag when the file is older than the last run event. · pane render test on all four surfaces, plus Ash's look (I CHECK THIS)
- [ ] Given a changed `bob/brief.json` after approval, when any edit is attempted, then Gate A refuses because the hash no longer matches. · hash test, red then green
- [ ] Given a requirement with no evidence record, when anything tries to set it `verified`, then the transition is rejected. · state-table test (scripts/check_fixtures.py today; the plugin's own test in Build 1)
- [ ] Given a fresh Mac folder, when `/plugin install bob --marketplace <org>/bob` runs, then BOB loads in the next session and the pane appears. · Ash confirms (I CHECK THIS)
- [ ] Success criterion: Build 1 lines 1 to 3 green in a disposable repo by 24 October 2026 · measured in docs/project-status.md with evidence paths

## Standing lines that apply
- [ ] Branch protection on main; gate.yml jobs (secret scan, personal data, no Babel, plugin validate and test, schema and fixtures) are required and green.
- [ ] No `--no-verify` and no disabled gate since the brief was signed.
- [ ] No key anywhere (BOB holds none); preflight stops on any placeholder in a `.env*` file.
- [ ] Plain TypeScript compiled by the engine; no runtime Babel.
- [ ] Synthetic records flagged at creation (`is_synthetic`) and never shown as real.
- [ ] Every guard, list and state table has one home (`bob/schema.json`); no second copy found.
- [ ] Each new test was seen to fail on its own bug before being trusted.
- [ ] No skipped suite reported as a pass.
- [ ] Handover page live: `docs/handoff.md` with decisions, landmines, next steps.
- [ ] Rollback steps written and rehearsed once (pin or uninstall the plugin version).

## Standing lines marked N/A for Build 1, with reason
- Deploy path, preview, 375px and 1440px, tap targets, spend ceiling, rate limit, SSRF, XSS, prompt cache, fire-and-forget alerts, ship-it-safely: N/A. BOB v1 has no web deploy, no paid API call, no user-supplied URL and no rendered untrusted HTML. Re-check at Build 2 if `/bob adopt` adds any of these.

## Workflow lines
- [ ] The seven elements are written for the BOB loop with a named owner: trigger (Mags opens a session), inputs (brief, ledger, approvals), decision (gate pass or refuse), routing (continue, stop with next action, ask), output (evidence and ledger states), delivery (pane and status file), measurement (rework incidents and briefing time, read in `docs/project-status.md`).
- [ ] Every step is labelled Human, Machine, or Human checks machine. No step is unlabelled.
- [ ] New Hire Test: a fresh session reads `docs/project-status.md` and `docs/handoff.md` and states the current stage and next action without the original chat.
- [ ] Rung stated: 2, wired workflow (hooks plus files). BOB does not claim rung 4 or 5.

## Weekly check (after Build 2)
- [ ] Once a week: what shipped under BOB that would not have shipped without it, and which outcome did it move? A week with no answer is logged, not skipped.
