# BOB · project status (living file, update in place)

Last updated: 21 October 2026, Cowork session. Rounds 1 and 2 complete, pane spike seen, start pack built.

## Where BOB is
- Stage: Phase 0, design. No code exists. No repo exists. No paid calls made. Shared setup unchanged. Pack `~/Downloads/BOB_Claude-Code-Launch-Pack_v1` verified intact against MANIFEST.json (183 files, 0 mismatches).
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
REVISE. No Stop-if open. Build 1 may start. Open: the pane spike (OQ1) and the GitHub org and repo name (OQ5).

## Next action
Claude: run Build 1 from docs/KICKOFF.md in a Claude Code session on this folder, repo wiring first, then the pane on the Code tab surface first among the build steps. Ash needs to: open the Code tab on this folder, paste docs/KICKOFF.md, and say whether the pane is drawn when Claude reaches step 2.

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
