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

## Known landmines
- The pane rendered on the Cowork surface of the desktop app. The Code tab is a different surface and has not been seen yet (kickoff step 2).
- Whether plugin hooks fire in Cowork cloud sessions is unproven. BOB's gates run in Claude Code, so this touches only the design room.
- Whether `claude plugin validate` and `claude plugin test` run unauthenticated in GitHub Actions is unverified (gate.yml, job `plugin`).
- How a local plugin folder loads into a desktop Code tab session is not documented (desktop docs read 21 October 2026). The proven route is the plugin-authoring skill's dev-mods watch plus the app's turn-on-mods prompt. Kickoff step 2 tries that first and records what worked.
- Whether exit 2 from a SessionStart hook blocks or only warns depends on the installed version (scripts/preflight.sh). Record what is observed.
- Ash's desktop app shows the earlier layout: the new-session folder picker lists only previously opened folders and the docs name no add or browse control for it. Opening a fresh folder needs `claude --desktop` from Terminal (documented) or Add folder inside a running session. For Mags this matters: observe at the pilot whether a folder opened once via `claude --desktop` then appears in her picker, and record it here.
- Local hooks are skippable by one tired person; the remote required checks are the real gate. Do not call R10 or R13 enforced until gate.yml is required and has been red once.

## What the next person should do
1. Claude: run `docs/KICKOFF.md` in a Code tab on this folder. Pane spike first.
2. Claude: after Build 1, write the AquaAgent adopt kickoff; do not start it in the same session.
3. Ash needs to: look at the pane once when asked, and pick a GitHub org only if two exist.
