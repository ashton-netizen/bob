# Step Change Build Brief · BOB (Build Optimisation Brief)
Ashton Bishop · 20 October 2026 · Mode: Check (brief v1 existed; rescored and rewritten) · Build type: Claude Code plugin plus Cowork design skill
Home: `docs/product/product-plan.md` in the BOB start pack and then the repo (live copy); `CLAUDE OUTPUTS/BOB/BOB_Brief_v1.md` is the snapshot · Version 1

Supersedes the architecture section of `BOB_Product-and-Build-Brief_v1.md` (the pack). The pack's product intent, workflow A to H, output contract, data gate, R01 to R21 and defect scenarios all stand. Only the shape changes: BOB is a plugin inside the surfaces Steppers already have, not a separate local app.

---

## Part 0 · Gates

**Verdict: REVISE** · No Stop-if is open. Build 1 (the gate-and-pane loop in a disposable repo) may start now. It stays REVISE, not GO, for two reasons: the pane spike is unproven (open question 1), and R10 and R13 are enforced locally until the CI check that greps for the committed deny rule exists and has been seen red once. Build 2 (adopt AquaAgent) waits on the spike result.
Operator time used: about 11 of 60 minutes · Rounds run: 2 of 3 · Questions asked: 7 · Pre-filled from sources: 31

### Decisions taken in Round 1 (20 October 2026)
- Architecture: BOB is a Claude Code plugin (pane, gates, slash commands, repo templates). Design phase runs in Cowork. The custom local app and hand-built adapter are shelved as a measured fallback, not a Phase 0 default.
- Login model: Step Change Team or Enterprise seats with Claude Code included. No API keys. Plan tier still to be verified live (open question 2).
- Owner after launch: Ash. Every fix ships as a plugin version from the repo, never a hand edit on a laptop.
- First target and appetite: `/bob adopt` on AquaAgent, 10 days.

### Decisions taken in Round 2 (20 October 2026)
- Success criteria locked as proposed (see Part 1). Baseline for rework and time is measured during the AquaAgent adopt.
- Plan tier: Team plan, Ash's answer "if unsure". Consequence: no org-managed settings, so the hard gates live on the remote and in each repo. Claude reads the plan name from the account page at the Claude Code kickoff and corrects this line if it differs.
- Mags: Mac with the Claude desktop app installed, Code tab untested. The pilot kickoff opens with a one-step-at-a-time Code tab check for her.

### Open questions
- OPEN QUESTION 1: Does a plugin pane render on the desktop surface in the Claude Code Code tab on Ash's Mac? · Block 2 and 4 · Owner to close: Claude builds the spike, Ash opens it once · Blocks the build: yes, for Build 1 step 2 onward (fallback named in Kill criteria). · Progress 21 October: spike mod validated, pane test passes on all four surface tables, and Ash saw the pane drawn on the Cowork surface of the desktop app. Closed for that surface; open for the Code tab until kickoff step 2.
- OPEN QUESTION 5: Is the GitHub name `step-change/bob` free, and which GitHub account or org hosts Step Change repos today? · Block 8 · Owner to close: Claude checks at the kickoff (`gh repo view`), Ash picks if two orgs exist · Blocks the build: yes for step 7 (marketplace install), no before it.

### Stop-ifs
| 1 Result | 2 System | 3 DoD | 4 Keys | 5 Data | 6 Cost | 7 Brand | 8 Delivery | 9 Agents | 10 Handover |
|---|---|---|---|---|---|---|---|---|---|
| clear | clear (tool, not system; stated) | clear (every line has an enforcement point in Part 3) | clear (no keys; plugin holds none) | clear | clear (no paid API calls; usage is the seat) | clear for Build 1 (engine components, no brand approximation); branded pane is gated behind mockup approval | clear once the repo is wired before feature code | clear (no autonomous agent) | clear (kill criteria and rollback below) |

---

## Part 1 · Product plan (for the operator)

**What and why, in one sentence:** When BOB lands, a Stepper who has never used a terminal can take an idea or an existing repo through an approved brief, bounded build rounds and evidence-backed verification inside Claude Code, where no round can start unapproved and no round can end unproven.

**The failure it fixes:** AquaAgent, September to October 2026. Source and data design were skipped, steps were skipped, Claude Code rounds patched over each other, and substantial rebuilding followed. Ash's account puts the cost in the thousands of dollars; that figure is his report, not an audited number. The 18 October AquaAgent drift review recorded the same pattern: plan said one thing, runtime did another, and nothing refused the gap.

**For:** Mags first, then any Stepper · a few sessions a week during a build · Mac desktop, Claude desktop app · **Not for:** clients; engineers who want the raw terminal; non-build tasks (proposals, decks, content).

**Owner after launch:** Ash · **Must not break, duplicate or confuse:** the AquaAgent, VGA and tAItans repos (adopt is additive, on a branch, never main); the `build-brief` skill (BOB packages and calls it; one home for the ten blocks and the never-ever list); the Infinite Leverage agents already in those repos' `.claude/agents/`; `scm-design-skill` as the only brand authority · Sits beside them: on top.

**Must not look or sound like:** a chatbot with a nicer skin; a terminal; a 92 percent progress bar; a dashboard that invents progress; a forty-question interview.

**Prototype or system:** database n (BOB's state is files in the repo under git) · login n (uses the person's own Claude seat) · review step y · owner y → **a tool with git as its store.** Stated plainly: BOB v1 is single-user per repo. Multi-user sync is R21, Later.

**Appetite:** 10 days to AquaAgent adopted and gated · **No-gos:** custom sidecar app; hand-built Claude Code adapter; hosted multi-user service; native voice; broad connectors; RAG; Word, PDF or Slides renderers (all R21 or shelved) · **Load-bearing assumptions:**
1. A plugin pane renders on the desktop surface in the Code tab. Falsified by: the day-1 spike, seen by Ash on his Mac. Fallback if false: the board becomes `docs/status.html`, regenerated by the same hooks and opened in the browser.
2. Plugin hooks fire reliably in Desktop Code sessions under Team seats, including `tool.call` deny and the Stop block. Falsified by: `claude plugin test` plus one live session where a deliberate unapproved edit is refused.
3. Mags can run the design phase in Cowork and the build phase in the Code tab without touching a terminal. Falsified by: watching her first session in the pilot. If she needs the terminal on the critical path, the pack's stop/rethink condition fires.

**Framework:** Infinite Leverage four moves and both five-D variants (workshop: Definition of Done; book: Deployment) [Build Excellence reference v3, opening synthesis]; the Step Change Build Brief ten blocks; the tAItans council verdict of 2 October 2026 (enforcement over interview). QA tests against them by checking that every MUST requirement has an acceptance check and an enforcement point, and that both DoD and Deployment fields exist on every brief BOB exports.

### The 5 Ds
- **Define the problem:** Builds happen as random rounds. Each round forgets the last, patches rather than finishes, and reports done on its own say-so. Source and data design are skipped because nothing forces them before code. The operator cannot see where a build actually is.
- **Discover data:** Inputs: repo files (`CLAUDE.md`, `docs/`, handover), the launch pack, Step Change method (installed skills), the live assets. BOB's own records: brief, requirements, approvals, increments, runs, events, evidence, sources. Volume: tens of records per project. Sensitivity: client material stays in its project folder; the method and question bank never carry client identities (pack section 8). Tests run on synthetic fixtures only; every BOB record carries `is_synthetic`.
- **Design workflows** (the pack's A to H, with owners and the AI line):
  1. Capture (drop files, talk, dictate) · Mags · AI drafts the source register, Mags confirms.
  2. Understand before asking · AI drafts candidate answers with source pointers · Mags confirms or corrects; contradictions shown, never resolved silently.
  3. Design the product · AI drafts user, use case, end game, smallest loop · Mags decides.
  4. Design the data and sources · AI drafts the source register, entity model and one trace · Mags and Ash approve.
  5. Make it visible · AI on its own (journey, data flow, screen map as views of the same brief file).
  6. Challenge and approve · AI drafts omissions and tradeoffs · Mags approves a named version; approval is a record, never inferred.
  7. Build · AI on its own inside one approved increment · gates enforce the boundary, Mags answers only consequential decisions.
  8. Verify, release, learn · AI collects evidence against requirement IDs · a human accepts; BOB never marks verified from prose.
- **Determine ROI:** Baseline is not measured yet. Proposed measures (pack section 3): rework incidents caused by missing or misunderstood requirements, with cause recorded; human time briefing, clarifying and recovering; omissions caught before code; whether a fresh session resumes from saved state. Proposed 90-day win (for Ash to accept or change in Round 2): Mags completes one real project with zero rework incidents attributed to a missing requirement, and AquaAgent's next three increments ship with every requirement showing evidence.
- **Definition of Done** (checked by a stranger in a fresh Claude Code session on a repo with BOB installed):
  1. Asking Claude to edit code before an approved brief version exists is refused, with a plain-language reason and the next action.
  2. A round whose increment has requirement IDs with no new evidence cannot end; the stop message names the IDs.
  3. The pane (or fallback status page) shows every requirement as not assessed, blocked, designed, implemented, verified or accepted, read from the ledger file, and says "stale" when the file is older than the last run event.
  4. `/bob adopt` on a copy of AquaAgent produces a ledger, a status view and a branch with gates wired, and `main` is untouched.
  5. A Stepper installs BOB with one command from the marketplace repo and the pane appears in the next session.

**Success criteria (agreed, Round 2, 20 October 2026):** leading: Build 1 DoD lines 1 to 3 green in a disposable repo by 24 October 2026; AquaAgent adopted with remote checks green by 30 October 2026 · trailing: Mags completes one real project under BOB with zero missing-requirement rework incidents by 30 November 2026. Baseline for rework incidents and briefing time is recorded during the adopt, before the trailing target is judged.

**Reuse:** `build-brief` skill (ten blocks, never-ever list, DoD checklist, review prompts) · `popup-gate.py` Stop-hook pattern and `step-change-popup-gate` plugin packaging (what a Stop block looks like, what went wrong on the wrong surface) · VGA and tAItans CI `gate.yml` (gitleaks over full history) · Infinite Leverage agents (`product-manager`, `developer`, `qa`, `devops`) already in the repos · the pack's requirement IDs R01 to R21 and defect scenarios · **New:** the pane mod; the ledger and approval file schemas; `/bob adopt`; evidence capture from tool results; the Cowork `bob-design` skill.

**Design:** `scm-design-skill` is the brand authority. Build 1 pane uses the engine's own components (Box, Text, Button), so no brand approximation is possible. Branded review pages and any custom look come in Build 2 after a wireframe approval (Ash) and a mockup approval (Ash), with the real fonts from the pack's `scm-design-skill/assets/fonts`.

**Deliberately not building:** the local browser workspace, local service and adapter from the pack section 4; anything in R21; a question bank with client facts in it; a progress percentage.

---

## Part 2 · Development plan (for the AI)

**The brief (drives every /goal):** BOB is a Claude Code plugin in a new repo `step-change/bob`. It holds `.claude-plugin/plugin.json`; `hooks/hooks.json` and `hooks/register.tsx` (the mod: pane, gates, slash commands, session preflight); `skills/` (`bob-design` for Cowork, `bob-adopt`, `bob-build`, `bob-verify`, each calling `build-brief` rather than copying it); `templates/` (repo `CLAUDE.md`, `docs/product/`, `bob/` schemas); `tests/` run by `claude plugin test`; `fixtures/` synthetic only; `.claude-plugin/marketplace.json` so `/plugin install bob --marketplace step-change/bob` works. House rules: the never-ever list below is pasted into the build prompt and the repo `CLAUDE.md`. The plan lives at `docs/product/product-plan.md`.

**How BOB briefs Claude Code (the method, in five lines):**
1. The brief lives in the repo as files Claude Code reads every session (`CLAUDE.md` points at `bob/brief.md`, `bob/brief.json`, `bob/ledger.json`). Never a chat prompt.
2. One round is one approved increment with requirement IDs and DoD lines. The round cannot start without a matching approval record and cannot end without evidence against those IDs.
3. Session start runs a preflight: branch is not `main`, ledger present, approved hash matches `brief.json`, keys present by name only.
4. Evidence is a diff, a test result or an artefact path captured from tool results, timestamped, with origin. Model prose never changes a requirement's state past "reported".
5. Hard lines sit on the remote as required checks. Hooks are the fast local layer, never the only layer.

**Stack and tests:** Claude Code plugin, TypeScript hooks module compiled by the engine (this build 2.1.304; version floor to be recorded at first validate) · `claude plugin validate` and `claude plugin test` · GitHub repo with branch protection · no host, no database, no server.

**Bought, not written:** identity and auth (Claude seats) · tool permissions (Claude Code permission rules; a deny rule blocks even in `bypassPermissions`, per the official permissions docs) · distribution (plugin marketplace plus `enabledPlugins` in a repo's committed `.claude/settings.json`) · secrets: none held · remote gates (GitHub branch protection and required checks).

**Data model (files, not tables; each record has `id`, `created_at`, `source` human/ai/tool, `is_synthetic`):**
- `bob/brief.md`: the human-readable brief, sections mirror Part 1.
- `bob/brief.json`: `requirements[]` {id, priority MUST/SHOULD/LATER, text, check, state, evidence_ids[], source_ids[]}; `decisions[]`; `assumptions[]`; `outputs[]` (the pack's output contract, each with id, type, status, version).
- `bob/approvals.json`: `approvals[]` {id, brief_hash, scope increment_ids[], approver, approved_at}. Immutable once written; a new approval is a new record.
- `bob/ledger.json`: `increments[]` {id, requirement_ids[], state}; `runs[]` {id, increment_id, state queued/awaiting_permission/running/awaiting_decision/verifying/failed/cancelled/completed, started_at, last_event_at, session_id, exit_reason}; `events[]` {run_id, at, origin, type, detail}; `evidence[]` {id, requirement_id, kind diff/test/artefact/screenshot, ref, captured_at, origin}.
- `bob/sources.json`: the pack's source register fields (name, type, version, fingerprint, access, processing, knowledge_use, scope).
- `docs/evidence/`: raw evidence files referenced by `ref`.
State transitions are defined once, in `bob/schema.json`; the pane, the gates and the export all read the same file.

**One source-to-output trace (illustrative, synthetic ids):** Source S-03 "Ash, 18 October 2026: every AquaAgent question source checked, de-duped, codified in Supabase" → Finding F-01 (cites S-03 v1) → Requirement R-AQ-07 "question bank with provenance, one row per de-duplicated question" → Design: entity `question` {id, text, source_id, category, dedupe_key, version} → Increment INC-02 → Task T-05 "migration plus seed" → Check C-05 "row count equals the de-duplicated set; five sampled rows trace to their source" → Evidence E-05 (query output file, test result) → Output: migration, seed script, one status line in the handover. A missing link anywhere in that chain blocks INC-02 from starting.

**Keys (names only):** none. BOB holds no credentials. Adopted repos keep their own keys under their own rules.

**Conventions:** branch per build · never main · never-ever list pasted · one home per list, schema and state table · plugin version bump on every release · plain TypeScript; no runtime Babel anywhere.

**Delivery:** greenfield plugin repo · git-driven; no deploy exists, "release" is a tagged plugin version · branch protection with required checks: `claude plugin validate`, `claude plugin test`, typecheck, gitleaks over full history, a CLAUDE.md personal-data grep · reviewer: Ash, capped at 8 items, with the Karpathy and Bach review prompts from `build-brief/references/review-prompts.md`.

### Build 1 · prove the loop (days 1 to 4)
**Goal:** In a disposable repo, BOB refuses an unapproved edit, allows an approved increment, refuses to end a round without evidence, and shows the ledger in a pane in the desktop Code tab.
**Scope:** in: plugin scaffold, pane, two gates, preflight, `/bob status`, marketplace install · out: adopt, Cowork design skill, export bundle, branded look.
**Steps** (each ends in a check someone can see):
1. Scaffold the plugin and schemas · check: `claude plugin validate` passes with zero refusals · borrows from: `step-change-popup-gate` plugin layout.
2. Pane spike: open a pane that renders `bob/ledger.json` from a fixture · check: Ash sees it in the Code tab on his Mac and says so (I CHECK THIS) · borrows from: plugin-authoring `pane.tsx` example.
3. Gate A, approval: `tool.call` deny on Edit, Write and file-writing Bash when `approvals.json` has no record whose `brief_hash` matches `brief.json` and whose scope holds the active increment · check: `claude plugin test` shows the test red against a fixture without approval, green with it.
4. Gate B, evidence: Stop block when the active increment's requirement IDs gained no evidence this run · check: test red then green; the block message names the IDs.
5. Preflight on `session.start`: branch, ledger, hash, key names · check: test for each failing condition; the message says which and what to do.
6. `/bob status` command: increment, current task, blocker, next action, owner · check: output seen in a session.
7. Install from the marketplace repo in a fresh folder with one command · check: the pane appears in the next session (I CHECK THIS, Ash).
**Definition of Done:**
- [ ] Given a repo with BOB and no approval, when a stranger asks Claude to change a file, then the edit is refused and the message names the missing approval and the next action.
- [ ] Given an approved increment, when the round ends with no evidence for its IDs, then the turn is blocked and the IDs are listed.
- [ ] Given a ledger file, when the Code tab opens, then the pane shows every requirement's state and a stale flag when the file is older than the last event.
- [ ] Given a fresh Mac folder, when `/plugin install bob --marketplace step-change/bob` runs, then BOB loads in the next session.
**Success criteria:** every gate test proven red once against its own bug before trusted green; zero `--no-verify` in the repo history.

### Build 2 · adopt AquaAgent (days 5 to 10)
**Goal:** `/bob adopt` turns the existing AquaAgent repo into a BOB-governed repo on a branch, with a truthful ledger built from observed state and remote checks wired.
**Steps:** 1. Read `CLAUDE.md`, `docs/product/product-plan.md`, the 18 October drift review, the live URL · check: a coverage manifest listing what was read and what was not. 2. Build `bob/brief.json` and `bob/ledger.json` from Verify-mode findings; every requirement state is reported, implemented, verified or accepted with evidence or "not assessed" · check: no requirement is verified from prose. 3. Write the source register for the question-bank sources Ash named on 18 October · check: each source has access and processing states. 4. Wire branch protection and required checks on the remote · check: a dummy PR is blocked until green. 5. Open the PR; Ash reviews 8 items max · check: PR visible. 6. Run INC-01 under BOB: the smallest real increment from the drift review's open items · check: evidence captured per ID.
**Definition of Done:**
- [ ] Given the AquaAgent repo, when `/bob adopt` runs, then a branch exists with `bob/` files and `main` is unchanged.
- [ ] Given the ledger, when Ash opens the pane, then every requirement shows a state with evidence or "not assessed", and none reads verified without an evidence record.
- [ ] Given the remote, when a PR without green checks is merged by hand, then GitHub refuses it.
**Success criteria:** INC-01 completes with evidence for every ID it claims; the drift review's "plan says, runtime does" gap is measurably closed for those IDs.
**Later:** `bob-design` Cowork skill with Docs and Artifact review pages; export bundle with attachments or missing-file manifest (R09); branded pane after mockup approval; `/bob adopt` on VGA and tAItans; Mags pilot (Phase 3); R19 file formats; everything in R21.

### Agents
None autonomous. BOB's reviewers (PM, QA) run as subagents inside the operator's session only. Never on its own: no customer email · no deletes · no stage change · no action on synthetic rows · no spend outside the seat.

### Handover and kill
Handover page: `docs/handoff.md` in the plugin repo: what is live (plugin version, where installed), no scheduled jobs, no keys, test fixtures and how `is_synthetic` is honoured, the five biggest decisions (this Part 0), known landmines (pane surface, Cowork hooks unproven, SDK login policy), what the next person should do.
Kill criteria: if the pane does not render on the desktop surface by 24 October 2026, the board moves to `docs/status.html` written by the same hooks; if that also fails the operator test by 30 October, stop and revisit the pack's app route. If Mags needs the terminal on the critical path during the pilot, stop and rethink (pack section 3). If BOB's own adapter path can be bypassed to approve a build, stop.
Rollback: pin the previous plugin version in the repo's `.claude/settings.json`, or uninstall the plugin; remote checks on adopted repos remain and are not BOB's to remove · rehearsed: no, scheduled for Build 1 step 7 · Alerts go to: Ash.

---

## Part 3 · Enforcement map

| Rule or DoD line | Enforced by | Strength (1 remote check to 7 prose) | Proven red once? |
|---|---|---|---|
| Branch protection on `main` in the plugin repo and every adopted repo | Remote setting, PR required, no force-push | 1 | n/a |
| No secret in the repo | gitleaks over full history as a required check; key-prefix grep returns zero | 1 | to do, Build 1 |
| No personal or client data in `CLAUDE.md`, `.claude/`, `bob/` | CI grep as a required check (ship-it-safely check 12) | 1 | to do |
| Plugin validates and its tests pass | `claude plugin validate` and `claude plugin test` as required checks | 1 | to do |
| An unapproved build request is refused (R10) | `tool.call` deny in the mod, plus a project `permissions.deny` rule on adopted repos | 4 local, 1 once the deny rule is committed and the merge check greps for it | to do, Build 1 step 3 |
| A round cannot end without evidence against its IDs (R13) | Stop block in the mod | 4 | to do, Build 1 step 4 |
| Preflight before any work | `session.start` hook | 4 | to do, Build 1 step 5 |
| Approval refers to a specific version; a change reopens affected items (R08) | `brief_hash` check in Gate A; test that a changed brief invalidates the approval | 3 | to do |
| Tracker never marks verified from prose (R13) | State transition table in `bob/schema.json`; a test that a state change without an evidence record is rejected | 3 | to do |
| Cross-project scope, source text cannot grant tools (R15) | Mod reads only the current repo; attachment text is data; `tool.call` deny ignores content-borne instructions; test with the pack's "ignore permissions" fixture | 3 | to do |
| Never ship runtime Babel; plain TypeScript compiled by the engine | typecheck required check | 1 | n/a |
| Pane shows stale state when the file is older than the last event (R12) | Unit test on the stale rule | 3 | to do |
| Backup and export restore (R16) | Build 2 Later; test restores a disposable project from an export | 3 | not started |
| Branded look never approximates a font or logo | Build 1 uses engine components; branded Build 2 gated on mockup approval | 6 for the human gate, I CHECK THIS | n/a |
| Never say it worked when it did not | Verify mode of `build-brief` on every release; evidence rules | 6, human | n/a |

**The never-ever list** (pasted into every BOB build prompt and the repo `CLAUDE.md`): the 14 lines in `build-brief/SKILL.md`, unchanged, one home. BOB does not copy them into its own skill text; it calls `build-brief`.

**Pre-release:** ChatGPT audit against the threat map (assets: repo files, approvals, evidence; trust boundaries: attachment text, model output, hook input; inputs reaching a model: brief, ledger, attachments). Advisory only.

**Hand-off:** a Claude Code session on a new empty folder, plan mode first, using `CLAUDE OUTPUTS/BOB/BOB_Claude-Code-Kickoff_v1.md`. Wire the repo (branch protection, required checks) before any feature code. Paste the never-ever list. Then `/goal Build 1 from the plan`. · **First step:** the pane spike (Build 1 step 2), because it is the one thing that can send the design back.

---

## Coverage manifest (what this brief was built from)
Read in full: `BOB_Product-and-Build-Brief_v1.md`; `BOB_Method-and-Lessons_v1.md`; `START-HERE.md`; prompts 00 to 03; `BOB_Product-and-Build-Map_v4.opml`; `SKILL-SOURCE-MANIFEST.json`; `build-brief` SKILL.md and its references (enforcement, il-playbook, evidence-rules, block-questions, template); Global/CLAUDE.md; Global/MEMORY.md; the mechanism ledger; grep hits in tools-and-connectors.md, working-rules.md, skills-system.md.
Read in part: `Infinite-Leverage_Build-Excellence_Claude-Reference_v3.md` (opening synthesis and headings only; the embedded source library was not read).
Listed, not read: `references/skills/*`, `references/scm-design-skill/` (not loaded; brand not applied in this phase).
Verified today against official docs (by subagent, 20 October 2026): headless and SDK interfaces, hooks, plugins and marketplaces, settings precedence, desktop and Cowork control surfaces, auth policy. Not verified: Ash's or Mags' installed Claude Code version, plan tier, the pane rendering on the desktop surface.
