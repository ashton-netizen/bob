# BOB · handoff (write as you go; test it on a fresh session)

Test: open a new session and ask "Read docs/handoff.md and tell me what to do tomorrow." If the answer is wrong, this file is wrong.

## Summary
BOB is a Claude Code plugin that makes builds designed-first, gated and visible for non-technical Steppers. State as at 21 October 2026: plan approved to REVISE, pane spike drawn once in the Cowork surface of the desktop app, no production code, no repo on GitHub yet. Owner: Ash.

## The five biggest active decisions, with rationale
1. Plugin, not a custom local app (20 October 2026). The pains were enforcement failures plus setup failures; a plugin fixes both without a third thing to install, and runs under each person's own Claude seat. The custom app and hand-built adapter are shelved as a measured fallback.
2. Team seats, no API keys (20 October 2026). The Agent SDK docs bar third-party products from offering claude.ai login; a plugin inside the user's own Claude Code sidesteps that. Plan tier to be read from the account at kickoff.
3. Git-tracked files as the store, not a database (20 October 2026). Single user per repo in v1; `bob/schema.json` is the one home for shapes and states.
4. First job is `/bob adopt` on AquaAgent, 10 days (20 October 2026). Proves "make existing builds brilliant" before any greenfield work.
5. Pane spike before any gate code (20 October 2026). It is the one assumption that can send the design back; the fallback is `docs/status.html` written by the same hooks.

## Decisions taken in the first Claude Code session (21 October 2026)
- Repo home: `ashton-netizen/bob`, private (Ash's choice by popup). The GitHub org `step-change` belongs to another company (stepchange.work). A private repo means Mags needs GitHub access to it before `/plugin install bob --marketplace ashton-netizen/bob` works; flip to public or add her as a collaborator at the pilot.
- "Governed" means `bob/brief.json` exists in the repo. Without it the pane shows `fixtures/` (marked synthetic) and both gates idle. The gates never read fixture records, so a synthetic approval can never unlock a real write.
- Gate B blocks only a round that wrote files (Edit, Write, file-writing Bash) and gained no evidence; a question-only turn may end. It blocks once per round: when the engine reports `stop_hook_active`, the turn ends with a toast "round left unproven" instead of looping. The written-files list resets at each turn start.
- The file-writing Bash detector is a bounded regex (redirects, tee, sed -i, mv, cp, rm, touch, mkdir, git commit/push/add/..., npm/pip install). A command that writes another way passes it; the remote checks are the real gate, as the plan says.
- The spike's own test is archived (`plugin-spike/hooks/pane.test.tsx.archived`): `claude plugin test .` collects every test under the repo and the root plugin answers the same pane id, so the two cannot share one test tree. Its last green run is in docs/evidence/build-1.
- MANIFEST.json describes the start pack as shipped; after Build 1 `check_manifest.py` reports drift by design. Do not regenerate it to make the check green; it is the pack's record, not the repo's.

## What is live (21 October 2026)
- Plugin `bob` 0.1.0 on main of https://github.com/ashton-netizen/bob (private). Installed: in this session's dev-mods folder (temporary, this session only) and at project scope in `~/Downloads/bob-install-check` from the marketplace. No scheduled jobs. No keys. Fixtures under `fixtures/` are synthetic and never gate; BOB's own records are in `bob/ledger.json` with `is_synthetic: false`.
- Rollback: in a repo, set `"bob@bob": false` in `.claude/settings.json` enabledPlugins, or `claude plugin uninstall bob@bob`; to pin, install a tagged version once one exists (`claude plugin tag` is the release step). Not yet rehearsed.
- The install line for a Stepper: `claude plugin install bob --marketplace ashton-netizen/bob --scope project` in the repo folder, or on the desktop + next to the prompt box, Add plugins, marketplace `ashton-netizen/bob`. The repo is private, so the person needs GitHub access to it and git credentials on their Mac (the install clones over HTTPS).

## Known landmines
- TWO ENGINES ON ASH'S MAC. `claude` on PATH is 2.1.287 (Homebrew); the desktop app runs its own 2.1.304 at `~/Library/Application Support/Claude/claude-code/2.1.304/<hash>/claude.app/Contents/MacOS/claude`. The pane's Text `weight` prop is refused by 2.1.287, so `claude plugin test` from a Terminal fails while the same test passes in the app's engine. Version floor: 2.1.304. Run validate and test with the bundled binary, or update Homebrew's claude.
- `gitleaks/gitleaks-action@v2` needs `permissions: pull-requests: read` on its job or it dies with a 403 before scanning (seen red for the wrong reason on the first run).
- `claude plugin validate .` warns that CLAUDE.md at the plugin root is not loaded as plugin context. Correct: it is repo context for Claude Code sessions on this repo, not something the plugin ships.
- The test kit's `$.ui` has no `invalidate`; the module wraps the call in try/catch. The scan also refuses `typeof $.ui.invalidate`; every `$` use must be a call.
- `atom()` references must be string literals (`{ plugin: 'bob', key: '...' }`), not a const; the scan refuses otherwise.
- In the desktop Code tab, loading a local plugin folder went through route (a): the plugin-authoring skill's dev-mods watch (`~/.claude/dev-mods/<session id>/bob/`), which asks Ash once to turn mods on. The mod loads when the turn that wrote it ends. Whether the pane draws on this surface is recorded in docs/project-status.md, step 2.
- The pane rendered on the Cowork surface (20 October) AND on the Code tab (21 October, Ash's look). OQ1 closed.
- Whether plugin hooks fire in Cowork cloud sessions is unproven. BOB's gates run in Claude Code, so this touches only the design room.
- `claude plugin validate` and `claude plugin test` DO run unauthenticated in GitHub Actions (seen 21 October 2026: the plugin job reached validation and reported the planted error with no login and no key).
- How a local plugin folder loads into a desktop Code tab session is not documented (desktop docs read 21 October 2026). The proven route is the plugin-authoring skill's dev-mods watch plus the app's turn-on-mods prompt. Kickoff step 2 tries that first and records what worked.
- Whether exit 2 from a SessionStart hook blocks or only warns depends on the installed version (scripts/preflight.sh). Record what is observed.
- Ash's desktop app shows the earlier layout: the new-session folder picker lists only previously opened folders and the docs name no add or browse control for it. Opening a fresh folder needs `claude --desktop` from Terminal (documented) or Add folder inside a running session. For Mags this matters: observe at the pilot whether a folder opened once via `claude --desktop` then appears in her picker, and record it here.
- Nothing writes ledger events or evidence records automatically in Build 1. Claude writes them by hand from tool results (ids, refs under docs/evidence/). Evidence capture from tool results is Build 2 work; until then a run in bob/ledger.json left `running` shows as stale after two minutes, which is truthful.
- Local hooks are skippable by one tired person; the remote required checks are the real gate. Do not call R10 or R13 enforced until gate.yml is required and has been red once.

## What the next person should do
1. Claude: run the marketplace install check in a fresh empty folder (step 8) and have Ash confirm the pane appears in a new session there.
2. Claude: after Build 1, write the AquaAgent adopt kickoff; do not start it in the same session.
