# BOB · start here

This folder is the whole starting point for building BOB in Claude Code. Nothing in it is built yet. It is a plan, a data contract, a validated pane spike, the gates as config, and synthetic fixtures. Built with BOB's own rules: outcome first, the plan is the prompt, every rule has a mechanism, evidence before claims, a fresh session can resume.

## Ash needs to (one step)

Open the Claude desktop app, Code tab, on THIS folder, then paste the block in `docs/KICKOFF.md` (or type `Read docs/KICKOFF.md and carry out the block in it as if I had pasted it.` and press Enter). That is all. Claude does the rest and stops only to ask you to look at the pane once, or to pick a GitHub org if two exist.

Exact clicks, checked against Ash's own screen on 21 October 2026 and the official desktop docs (code.claude.com/docs/en/desktop). Ash's app shows the layout the docs call "earlier": the environment selector sits above the prompt box in a card, and the bottom bar holds the folder, the permission mode and the model.
1. Claude menu, Check for Updates.
2. Launch Claude, sign in, click the Code tab, then click + New at the top of the sidebar. The New session screen appears.
3. Put the pack folder in front of the app. Ash's folder picker lists only folders already opened (ash, deep-dive-agent-starter, code-projects) and the docs describe no add or browse control for this layout. The documented route is the CLI flag: open Terminal (Cmd+Space, type Terminal, Enter), paste `cd ~/Downloads/BOB_Claude-Code-Start-Pack_v1 && claude --desktop` and press Enter. The docs say `claude --desktop` "opens the Desktop app on the current directory and exits" (Claude Code v2.1.285 or later, subscription login). The Claude app comes to the front with that folder as the session's folder; close Terminal. Documented fallback with a cost: start in any listed folder, then + next to the prompt box, Add folder, choose the pack; the preflight hook will not fire on session start that way, so the kickoff runs it by hand.
4. Leave the permission mode on Auto (the bottom bar shows it). Auto runs without routine prompts and a classifier checks each action; the kickoff's own stop rule still halts before the GitHub repo is created. Manual is the alternative if you want to approve every change.
5. Click the model name in the bottom bar (it reads Sonnet 5.5 Medium) and pick the strongest model offered. Cmd+Shift+E opens the effort menu: choose High.
6. Type the one line above, or paste the block from docs/KICKOFF.md, and press Enter.
7. When the app asks to turn on mods, click Turn them on, then look beside the chat for the BOB (spike) pane and tell Claude what you see.
Files can also be dragged into the prompt or added with the + button; @ followed by a filename adds a file to context. Cmd+Shift+B opens the Browser pane; BOB does not need it.

If you would rather the repo live with your other code, move this whole folder first (for example into the folder where your code projects live), then open the Code tab on it there. Nothing inside depends on where it sits.

## What is in here

| Path | What it is | State |
|---|---|---|
| `CLAUDE.md` | The repo's standing instructions: the plan is the prompt, the stop rule, the never-ever list verbatim, status lines | ready |
| `docs/KICKOFF.md` | The paste for the first Claude Code session, Build 1 in seven steps, pane spike first | ready |
| `docs/product/product-plan.md` | The Step Change Build Brief for BOB, Parts 0 to 3 (verdict REVISE, enforcement map, coverage manifest) | ready |
| `docs/product/definition-of-done.md` | Build 1 DoD lines plus the standing lines that apply; never edited to match the build | ready |
| `docs/project-status.md` | Truthful state, next action, blockers, resume instructions | ready |
| `docs/handoff.md` | Decisions, landmines, what the next person does; written as the build goes | skeleton |
| `docs/evidence/` | Where evidence files land, referenced by id from the ledger | empty on purpose |
| `bob/schema.json` | The one home for record shapes, states and transitions | ready, to validate in step 1 |
| `fixtures/*.json` | Synthetic example records, `is_synthetic: true`, one representative trace | ready |
| `plugin-spike/` | The pane mod that drew beside the chat in Cowork on 20 October 2026; validated, 1 test passing | ready to load with `--plugin-dir` |
| `.claude/settings.json` + `scripts/preflight.sh` | Session-start preflight: branch, ledger, placeholder keys | written, unverified until a session runs it |
| `.github/workflows/gate.yml` | The required checks: secret scan, plugin validate and test, personal-data grep, no runtime Babel | written, unrun until pushed |
| `references/BOB_Product-and-Build-Brief_v1.md` | The original product brief (sections 5 to 12 still govern; section 4 superseded) | read-only |
| `references/build-brief/` | Your own build-brief skill, copied so the never-ever list and DoD checklist have a local primary source | read-only |
| `references/COVERAGE.md` | What was read to make this pack, what was not, and what is unverified | ready |
| `MANIFEST.json` | sha256 of every file in this pack, so a later session can prove nothing drifted | ready |

## What is deliberately not here

No client material. No keys. No real AquaAgent files. No Step Change brand assets (the branded look is gated behind a mockup approval; the spike uses the engine's own components). No code beyond the validated spike. The custom local app from the original brief is shelved, not built.
