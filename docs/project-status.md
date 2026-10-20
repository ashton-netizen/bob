# BOB · project status (living file, update in place)

Last updated: 21 October 2026, first Claude Code session on the Code tab. Build 1 COMPLETE and merged to main. Pane seen by Ash on the Code tab, and again in a fresh folder after a one-command install from the repo (step 8 verified by Ash).

## Where BOB is
- Stage: Build 1 merged to main on 21 October 2026 (pull request 2, all five required checks green). Closeout notes on branch `build-1-closeout`. Repo https://github.com/ashton-netizen/bob (private, Ash's choice 21 October 2026; the GitHub org `step-change` belongs to another company). No paid calls made. Shared setup unchanged. Pack `~/Downloads/BOB_Claude-Code-Launch-Pack_v1` verified intact against MANIFEST.json (183 files, 0 mismatches).
- Architecture decided (Round 1, Ash, 20 October 2026): BOB is a Claude Code plugin (pane, gates, slash commands, repo templates) with the design phase in Cowork. The pack's custom local app and adapter are shelved as a measured fallback.
- Login model: Team plan per Ash ("if unsure"), to be read from the account at kickoff. Mags: Mac with the Claude desktop app, Code tab untested.
- Owner after launch: Ash. Fixes ship as plugin versions from the repo.
- First job: `/bob adopt` on AquaAgent. Appetite 10 days. Targets agreed: Build 1 gates green by 24 Oct; AquaAgent adopted with remote checks green by 30 Oct; Mags completes one real project under BOB with zero missing-requirement rework by 30 Nov 2026.

## Canonical files
- THIS PACK is the working copy once opened in Claude Code: docs/product/product-plan.md, docs/product/definition-of-done.md, docs/KICKOFF.md, docs/handoff.md, bob/schema.json, fixtures/, plugin-spike/, scripts/, .claude/settings.json, .github/workflows/gate.yml. MANIFEST.json proves integrity.
- Archive copies in `CLAUDE OUTPUTS/BOB/` (brief, status, kickoff v1) are snapshots; the repo copy is live once the repo exists.
- Brief (Parts 0 to 3): `CLAUDE OUTPUTS/BOB/BOB_Brief_v1.md`
- Claude Code kickoff (paste-ready): `CLAUDE OUTPUTS/BOB/BOB_Claude-Code-Kickoff_v1.md`
- Design review page: https://claude.ai/artifact/RCJHryuR1yBYRvAF58pC6W (private to Ash until shared)
- Source pack: `~/Downloads/BOB_Claude-Code-Launch-Pack_v1` (read-only; preserve)

## Verdict
REVISE. No Stop-if open. Build 1 under way. OQ1 (pane on the Code tab) CLOSED 21 October 2026, Ash's look. OQ5 (repo) CLOSED: ashton-netizen/bob.

## Next action
Claude: write the Build 2 kickoff (`/bob adopt` on AquaAgent) in a new session, starting from docs/product/product-plan.md Build 2 and docs/handoff.md. Build 2 does not start in the Build 1 session.

## Pane spike (OQ1), 20 October 2026
- Throwaway mod `bob-pane-spike` written in the Cowork session container (not on the Mac, not in any repo): pane "BOB (spike)" plus `/bob-status`, synthetic fixture only, reads and writes nothing, blocks nothing.
- `claude plugin validate`: passed (one warning, no author field). `claude plugin test`: 1 pass, 0 fail; the pane tree validates under the terminal, desktop, vscode and mobile element tables.
- Mods enabled by Ash and the mod loaded with no failure reported by the engine (20 October 2026). Ash saw the pane beside the chat on the Cowork surface of the desktop app ("looks good", 21 October 2026). OQ1 is CLOSED for the Cowork surface and OPEN for the Code tab surface until kickoff step 2.

## Blockers
None that stop design work. The pane spike is the first thing that can fail; its fallback is a `docs/status.html` written by the same hooks.

## Resume instructions for a fresh session
1. Read this file, then `BOB_Brief_v1.md` Part 0.
2. Do not re-ask the four Round 1 decisions.
3. Check the mechanism ledger (`CLAUDE OUTPUTS/AI Operating System Rollout/_mechanism-ledger.md`) before claiming any hook is verified.
4. Continue from "Next action". Mark nothing complete without evidence.

## Build 1 log (one line per step: step, state, evidence)
- Preflight, 21 October 2026: `check_manifest.py` and `check_fixtures.py` pass (38 files, no drift). `claude --version` on PATH is 2.1.287; the desktop session's engine is 2.1.304 (bundled at `~/Library/Application Support/Claude/claude-code/2.1.304/.../claude`). The spike's test FAILS on 2.1.287 (Text prop `weight` refused) and passes on 2.1.304: version floor is 2.1.304. Evidence: docs/evidence/build-1/B1-spike-validate-test-2.1.304.txt. The SessionStart preflight hook fired (its lines appeared at session start, exit 0); exit 2 behaviour not observed yet. GitHub: signed in as ashton-netizen, no org memberships; `step-change` on GitHub is another company. Claude plan: organisation "Step Change", Stripe subscription in the local config, tier name not shown by the CLI: "Team plan per Ash, unverified".
- Repo wiring: verified. `git init`, one commit to main (e7bb4dd), pushed to https://github.com/ashton-netizen/bob (private). Branch protection on main: pull request required, admins included, no force-push, no deletion. Evidence: `gh api repos/ashton-netizen/bob/branches/main/protection`.
- Red runs: verified. All five gate.yml checks seen red against their own planted bug. Evidence: docs/evidence/build-1/red-runs.md (five job URLs). Required status checks set on main after the red runs.
- Step 1 plugin scaffold: verified. `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `hooks/hooks.json`, `hooks/register.tsx`, `types/index.d.ts`; states read from bob/schema.json only. `claude plugin validate .` passes with zero refusals (two warnings: CLAUDE.md at plugin root is repo context, not plugin context; none else). Evidence: docs/evidence/build-1/B1-tests-green-stage3.txt.
- Step 2 pane on the Code tab: implemented, awaiting Ash's look. Update: Ash turned mods on and the engine reported the mod under the session's dev-mods folder loaded with no failure named (21 October 2026, same session). A load report is not a look. VERIFIED: Ash looked at the Code tab and said the BOB pane is drawn beside the chat (21 October 2026, in session). OQ1 closed for the Code tab surface. No status.html fallback needed. Route (a): the plugin-authoring skill loaded in this session and the plugin was copied to this session's dev-mods folder; the app asks Ash once to turn mods on. Pane reads fixtures/ledger.json (synthetic) because this repo has no bob/brief.json. Pane test passes on terminal, desktop, vscode and mobile element tables with the stale flag. Evidence: B1-tests-green-stage3.txt.
- Step 3 Gate A: verified by test, red then green. No approval: Write, Edit and file-writing Bash denied, denial names the approval and "Ash needs to". Matching approval: allowed. Brief changed by one requirement: denied naming the stale approval. Evidence: B1-tests-red-stage1.txt (red before the gate existed), B1-tests-red-stage2-allow-paths.txt (allow paths red against an over-strict gate), B1-tests-green-stage3.txt. Not yet seen live in a session (needs a governed repo; Build 2).
- Step 4 Gate B: verified by test, red then green. A round that wrote files and gained no evidence is blocked at Stop with the requirement ids named; passes once an evidence record lands; a round that wrote nothing may end; one block per round (`stop_hook_active`). Evidence: same three files.
- Step 5 state table: verified by test, red then green. verified without evidence rejected; accepted from a tool call rejected (needs human); an illegal transition rejected; a lawful step allowed; Edit and Write both guarded. Evidence: same three files.
- Step 6 preflight: verified. The settings hook ran at session start (seen). `scripts/preflight.test.sh`: 11 cases, one failing case per STOP condition, each seen red against a mutated preflight. Evidence: B1-preflight-tests-green.txt, B1-preflight-tests-red-mutations.txt. Added to the schema-and-fixtures check.
- Step 7 /bob status: implemented and tested (output asserted in the test: increment, task, blocker, next action, owner, stale, preflight). Not yet seen in this session: the command exists only once the mod loads at the end of this turn.
- Step 8 marketplace: implemented (`.claude-plugin/marketplace.json`, validate passes). Install from a fresh folder not yet run; Ash confirms.
- bob/ledger.json: verified. BOB's own ledger (real records, is_synthetic false): INC-B1 active with R08, R10, R12, R13; run RUN-B1-01; five events; seven evidence records pointing at docs/evidence/build-1/. The module now prefers bob/ledger.json over fixtures/ as soon as it exists (test seen red then green: B1-tests-red-own-ledger.txt, B1-tests-green-own-ledger.txt). No hook writes ledger events yet: Claude writes records by hand from tool results. The loaded mod in this session was updated; the preflight reports the ledger present.
- Merge: verified. Pull request 2 merged into main at e3b7a6e with all five required checks green (run 39511124419). main now carries Build 1; every later change goes branch, pull request, merge.
- Step 8 marketplace install: VERIFIED. Ash opened a new Code tab session on `~/Downloads/bob-install-check` and saw the BOB pane (21 October 2026). Earlier detail: In the fresh empty folder `~/Downloads/bob-install-check`, `claude plugin install bob --marketplace ashton-netizen/bob --scope project` (engine 2.1.304) added the marketplace in user settings, installed bob@bob 0.1.0 enabled at project scope, and wrote `.claude/settings.json` with `enabledPlugins: { "bob@bob": true }`. Evidence: docs/evidence/build-1/B1-step8-install-fresh-folder.txt. The pane appearing in the next session on that folder is Ash's check (I CHECK THIS).
- Build 1 closed: INC-B1 set done, RUN-B1-01 completed in bob/ledger.json; evidence E-B1-09 (origin human) records Ash's confirmation of the pane in the fresh folder. Build 1 DoD lines 1 to 3 green by 24 October 2026 target: met on 21 October (lines 1 and 2 by test, line 3 by Ash's look). Open from the DoD standing lines: rollback not rehearsed.
