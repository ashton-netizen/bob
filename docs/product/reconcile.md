# Reconcile: what BOB promised against what exists

Written 29 October 2026 in the BOB reset window. Every verdict rests on a fresh read of the code, a fresh run of the test suite (89 of 89 pass on the app's engine 2.1.308; 0 of 89 on the PATH engine 2.1.287, which cannot load the module), BOB's own records, and the code inventory at the side-session notes folder (`bob-code-inventory.md`). Nothing here is carried over from an earlier report. Verdicts: COVERED, PARTIAL, MISSING, CONFLICTING, NOT APPLICABLE.

This file carries ids because it is for the files. The page Ash reads carries none.

## A. The original requirements (product brief, 20 October 2026, section 12)

| Id | Requirement | Verdict | Evidence and reason |
|---|---|---|---|
| R01 | Idea plus attachments produce a saved project and source register; reopening preserves it | PARTIAL | Idea to project works and is tested (`start_project` register.tsx:712-725, tests :1246, :1469; proven live on bob-demo by a relayed call, not the pane box). Attachments are not ingested by any code; `bob/sources.json` is written by the design skill by hand. |
| R02 | Unsupported, failed, partial reads stay visible | PARTIAL | Schema values exist and adopt refuses a source without them (schema.json:200-213; test :588). Nothing in the pane, status page or map shows a source to a person. |
| R03 | Candidate answers cite source and version; conflicts stay open | PARTIAL | Skill text only (design-with-bob SKILL.md:41-43). No code, no test. |
| R04 | Interview reuses known answers, asks only what is open | PARTIAL | Skill text only (SKILL.md:3, :43). No code, no test. |
| R05 | Person edits the brief without a command line | MISSING | Nothing found. Send back with a note (register.tsx:764-781) records an event, not an edit. |
| R06 | Journey, data flow and output contract reviewable before approval | PARTIAL | Review buttons open journey, screens, data trace and readiness once the skill has written them (register.tsx:805-838; test :1565). No output contract exists. Nothing checks content. |
| R07 | One sample input traced to output; missing links block | PARTIAL | The skill writes `data-trace.md`; the pane treats its existence as stage done (register.tsx:833). Nothing traces or blocks. |
| R08 | Approval names a version; a change flags affected items | PARTIAL | Version: COVERED (`brief_hash` and `scope_hash`, register.tsx:415-425, board.ts:62-121; tests :366, :761, :854; seen live on VGA and AquaAgent). Flagging which items changed: nothing; the refusal names the hash. |
| R09 | Exports: readable brief, machine-readable handoff, attachments or missing-file manifest | MISSING | No export command. `scripts/render-status.ts` renders the status page only. |
| R10 | Unapproved build refused by a tested refusal | COVERED | Gate A on Edit, Write, MultiEdit, NotebookEdit and Bash (register.tsx:1152-1193, board.ts:90-122); tests :339, :366, :806, :1057, :1668; seen live 21 and 22 October (handoff). Refused this window's own one-liner too. |
| R11 | A bounded real run produces status events and an artefact | PARTIAL | Approve submits a prompt that starts the work (register.tsx:751-759; test :1297). No hook writes a run or a started, heartbeat or finished event; the only event writers are reconcile and send-back. No cost or time bound. |
| R12 | Interruption preserves work, reconciles, no duplicate run | PARTIAL | Reconcile closes stale runs (register.tsx:574-609; tests :914, :938, :952); Pause aborts the turn (:878). No duplicate-run guard. |
| R13 | Tracker distinguishes reported, implemented, verified, accepted with evidence | COVERED | State table and guard (schema.json:40-84, register.tsx:897-915; test :456); adopt refuses verified without evidence (test :552); map lights only with evidence (map.ts:25; test :1175). |
| R14 | Person sees next action, owner and consequence | COVERED | Next action with doer in pane, page and map (register.tsx:1363, board.ts:166-183, map.ts:66-71; tests :1104, :1622, :1696). Consequence is in the refusal and result texts, not a field. |
| R15 | Cross-project scope; source text cannot grant tools | PARTIAL | Workspace scoping of every path (register.tsx:84-97; tests :1057, :1113); Gate B counts repo writes only (test :412). Source text granting tools: skill text only. |
| R16 | Backup and export restore demonstrated | MISSING | Nothing found. The rollback rehearsal covers the plugin install, not project data. |
| R17 | Keyboard, loading, empty, error and recovery states | PARTIAL | Map page has keyboard handling and focus (map.html:55-183); empty states in pane and page. No loading state. No test of keyboard use. |
| R18 | A complete pilot reaches a verified outcome and a readable handover | MISSING | No pilot has run. BOB on itself: 12 of 19 of its own promises proven; bob-demo: 3 of 11. Mags has not used BOB. |
| R19 | Office files, screenshots and URLs have tested ingestion | MISSING | Skill text and one fixture sidecar only. No code. |
| R20 | A reviewed lesson improves the method without client leak | PARTIAL | CI personal-data grep (gate.yml:28-40). No lessons store. |
| R21 | Multi-user, hosted execution, voice, connectors, renderers | NOT APPLICABLE | Later by the brief's own ruling. |

Count: 3 COVERED, 13 PARTIAL, 5 MISSING, 0 CONFLICTING, 1 NOT APPLICABLE.

## B. Ash's intent (intent.md, 29 October 2026) against what exists

| Intent | Verdict | Evidence and reason |
|---|---|---|
| The ten-stage map as the spine that lights up | MISSING | No code, template, schema, skill or test names any of the ten stages (inventory section 4). The map renders six schema branches (idea, brief, approve, rounds, report, guide) plus Other, or one branch per increment, or six design stages. |
| A product schematic (screens and information flows) inside the map | MISSING | Nothing found. The design skill writes a screen map as markdown; nothing draws it. |
| No requirement codes, increment numbers, hashes or pull request numbers on any page a person reads | CONFLICTING | The code puts them on purpose: pane headings and chips (register.tsx:1262, :1275, :1288), Gate A refusals with hashes (board.ts:113-120), approve and adopt result lines, status page rows, map round chip and per-increment branch names (map.ts:58). |
| Mags's first five minutes: one question, unlit map behind it | MISSING | The pane has a Start a project box (register.tsx:1350) and a separate Open the map button. No map is drawn behind the first question; the pane cannot draw the map. |
| Three approvals per project, by button | PARTIAL | Adopt refuses more than three increments (register.tsx:249-254; tests :636, :647). Approve by button seen live once (AP-05, 26 October). The adopt status line (register.tsx:363), the workspace CLAUDE.md template (:12-13) and both skills' handover lines still tell the person to type `/bob approve`. |
| A click on Approve starts the work; an approval never lands on an idle window | PARTIAL | Prompt submitted on press (register.tsx:751-759; test :1297). Not seen live. The test proves a prompt is recorded, not that an idle window starts a turn. |
| Never stuck: three-line reports, no round ends on a Claude step | PARTIAL | Report check tested (register.tsx:1081-1097; tests :426, :443). First-message and ask-once rules are prose only (SKILL.md:73, template :15-17) though the brief marks them implemented. |
| Step Change thinking inside: build-brief, reviewers, brand | PARTIAL | build-brief called by name from the skills; the brand fonts and mark are in the pages (the status page's mark image is an empty string, board.ts:251). Infinite Leverage reviewers are not wired anywhere. |
| Keep the gates, rebuild the face | (the plan) | See section C. |
| Mags takes an idea to a working thing with no command typed | MISSING | Never run. Every live session so far has been Ash's. |

## C. Keep, reuse, retire

### Keep as is (proven by test, most seen live)
- Gate A with brief hash and scope hash (register.tsx:1152-1193, board.ts:90-122).
- Gate B with carry-over and the gained-evidence rule (register.tsx:625-710, :1205-1235).
- The state guard: verified needs evidence, accepted needs a person (register.tsx:897-915).
- The approvals writer and its refusals: person-only, immutable, one active increment (register.tsx:378-452).
- Adopt validation and merge, with the three-round phase limit (register.tsx:196-376).
- `start_project` tool and the idea box (register.tsx:712-725, :792-800).
- Approve-starts-work prompt (register.tsx:742-760).
- Pane action plumbing judged by surface (register.tsx:732-890).
- Reconcile and Pause (register.tsx:574-609, :878-890).
- `bob/schema.json` as the one home for shapes and states (minus the map branches, below).
- CI: five checks, all seen red once (gate.yml). Preflight script and its tests.
- The test kit and 89 tests (hooks/bob.test.tsx).
- Brand assets under `assets/bob/` and `assets/step-change/`.

### Reuse with rework (the face)
- `hooks/map.ts` and `templates/map.html`: keep the renderer, the dot-lights-only-with-evidence rule and the radial drawing; replace the branches with the ten stages, add the product schematic view, strip every id from labels, fix the hard-coded "seven branches".
- `hooks/board.ts` `describe` and `renderStatusHtml`: keep the ladder and the page; rewrite every string a person reads in plain words; drop ids, hashes and approval numbers from the person-facing lines (keep them in the files).
- The pane (`ui.render`, register.tsx:1238-1414): keep the Waiting on you box and the buttons; rewrite headings, chips and lines in plain words; show the current stage of ten and the one next step.
- `design-with-bob`: keep the six stages as the procedure; map them onto stages 1 to 6 of the ten; make the first question "What do you want to build?"; wire the Infinite Leverage reviewers at stage 9 and build-brief at stage 6.
- `adopt-under-bob`: keep; rewrite the handover line so nobody types.
- Status page and map writing at session start, after commands and at round end: keep the triggers; add a redraw on Gate A refusal (already in 0.9.1, unseen).

### Retire
- The six-branch map in `bob/schema.json` `map.branches` (schema.json:226-250) and per-increment branch names.
- Every line that tells a person to type a `/bob` command: adopt status line (register.tsx:363), `/bob new` usage texts (:501), workspace CLAUDE.md template (:12-13), design-with-bob SKILL.md:29 and :60, adopt-under-bob SKILL.md:62. Typed commands stay as a hidden fallback only.
- Fixture display mode in the pane ("SYNTHETIC ... showing fixtures/") on a person's screen; keep fixtures for tests only.
- `plugin-spike/` (archived spike) and `.claude/worktrees/trusting-northcutt-15fbae/` (a stale copy): park, never delete.
- Stale installs: `~/Downloads/bob-install-check` (0.1.0) and the scratch rollback folder (0.2.1): uninstall or leave; they govern nothing.
- The empty mark image constant in the status page (board.ts:251) once the page is rebuilt.

## D. What this reconcile did not do
- Did not open the pane in a live session (Claude cannot see it). Every "seen live" above cites the handoff or status log by date.
- Did not run the design room in Cowork.
- Did not re-run VGA or AquaAgent sessions.
