# BOB: idle-repo fix kickoff v1 (27 October 2026)

Approved by Ash by popup, 27 October 2026: "Fix BOB, keep it".
Run in ONE Code tab session on the BOB repo folder. Branch, pull request, merge, tag per CLAUDE.md. Report to Ash in three lines.

## The fault (read from hooks/board.ts, approvalVerdict, 27 October 2026)
When a governed repo has no increment with state active, Gate A refuses every Edit, Write and file-writing Bash. AquaAgent has INC-00 and INC-01 both done, so every AquaAgent session froze until Ash pressed Approve. VGA is adopted the same way and will freeze the same way.

## The fix
1. Claude: decide the rule and write it in bob/brief.json as a requirement. Recommended: a governed repo with NO increment proposed, approved or active is idle, and Gate A allows writes. Gate A still refuses when an increment is proposed or approved but not active, when a brief hash no longer matches, and on any parse error (those fail closed, unchanged).
2. Claude: tests first, red then green: idle repo allows an Edit, a Write and a file-writing Bash; a repo with a proposed increment still refuses; hash mismatch still refuses. Evidence under docs/evidence/.
3. Claude: pane and board show "idle: no round started" instead of a blocker. No next action asks anyone to type.
4. Claude: merge on green checks, tag the plugin version, update the plugin on ~/BOB and note in docs/handoff.md (the one next-steps home).
5. Claude: then re-enable BOB on AquaAgent by removing the local off-switch (bob@bob false in .claude/settings.local.json) and prove one AquaAgent edit is allowed with no approval, and one is refused once an increment is proposed.

## Know before starting
- This repo is governed and INC-04 is active; handoff.md says the next approval closes it. Ash presses Approve once in the pane, or the session cannot write.
- Do not weaken Gate B. Do not touch main directly.
