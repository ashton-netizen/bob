---
name: adopt-under-bob
description: Adopt an existing repo under BOB on a branch, main untouched. Use when someone says "bob adopt", "adopt this repo under BOB", "put AquaAgent under BOB", "govern this repo", or runs /bob adopt for the first time. Reads the repo's own plan, build brief, CI workflow, latest drift or QA review and live URL in Verify mode of build-brief; writes a coverage manifest and a proposal file in which every requirement state is backed by an evidence record or is not_assessed; then runs /bob adopt, which validates the proposal against the plugin's bob/schema.json and writes bob/ledger.json, bob/sources.json, bob/approvals.json (empty) and bob/brief.json last, plus one status line. Never sets a state from prose, never writes an approval, never runs git, never copies client material into the BOB repo, never reads a key. Stops for a path that does not open, a wrong remote, a key, or an edit to main. Not for building BOB itself, for a greenfield brief (build-brief), or for deploy-day security (ship-it-safely).
---

# adopt-under-bob: put an existing repo under BOB, truthfully

The result: a branch of the adopted repo holding `bob/brief.json`, `bob/ledger.json`, `bob/sources.json`, `bob/approvals.json` (empty) and `docs/evidence/adopt/coverage-manifest.md`, one appended line in that repo's `docs/project-status.md`, and `main` unchanged. Every requirement state in `bob/brief.json` is `not_assessed` unless an evidence record in `bob/ledger.json` backs it. No state comes from prose, a model summary or a review's sentence: a claim is `reported` with a pointer, never `verified`.

The never-ever list is the one in `references/build-brief/SKILL.md` (the one home). Read it before step 1. This skill does not restate it.

## Files this skill writes (in the adopted repo only)
1. `docs/evidence/adopt/coverage-manifest.md` (step 3, Claude)
2. `docs/evidence/adopt/adopt-proposal.json` (step 4, Claude)
3. `bob/ledger.json`, `bob/sources.json`, `bob/approvals.json`, then `bob/brief.json` LAST (step 5, written by `/bob adopt`, never by hand)
4. One appended line in `docs/project-status.md`, created with a heading if absent (step 5, written by `/bob adopt`)

Nothing else. Nothing in the BOB plugin repo. Nothing on `main`.

## Stops (end the turn with one popup, recommended option first, nothing after it)
- The repo path or a named input file does not open, or the folder's remote is not the one the operator named. Ask for the path; never search other folders and never adopt a sibling checkout.
- Any of the four `bob/` files already exists in the repo (`/bob adopt` refuses; do not delete or overwrite).
- A key would be read, printed, copied or moved. Preflight names keys only.
- A write would land on `main`, or anything would be force-pushed.
- Client material (participant names, transcripts, campaign or client names) would enter the BOB plugin repo or the question-bank sources' method text.
- The only backing for a `verified` or `accepted` state is prose. The state stays `reported` or `not_assessed`; say so.

## Procedure (every step is mandatory)

### 1. Preflight (Claude, read only)
- Branch: `git switch -c bob-adopt` from an up-to-date `main` in the adopted repo. The plugin's preflight runs at session start; read its lines. A STOP line ends the turn.
- Record, by name only: the repo's `.env*` files, `git log -1 main`, `git status` (untracked folders are never staged).
- Confirm the plugin is installed at project scope (`.claude/settings.json` has `"bob@bob": true`) and the pane drew in this session reading `fixtures/` (not governed yet).

### 2. Read the inputs in Verify mode of build-brief (Claude)
Call the `build-brief` skill in Verify mode; never copy its blocks here. Inputs, each opened in full unless the manifest says otherwise: the repo's `CLAUDE.md`, `docs/product/product-plan.md`, its build brief, its CI workflow (every job name), the latest drift or QA review, and the live URL named in `CLAUDE.md` or `netlify.toml`, read with a fetch (never a dev server, never a browser test on the operator's Mac). Anything over 10 MB, binary masters and media are listed, not read.

### 3. Write the coverage manifest (Claude)
`docs/evidence/adopt/coverage-manifest.md` with four lists: read in full, read in part (with what was skipped), listed but not read (with why), not found. Add the live URL's fetch result (status and title, or the error). A file not opened is never "read".

### 4. Draft the proposal (Claude)
`docs/evidence/adopt/adopt-proposal.json`, the exact shape `/bob adopt` validates against the plugin's `bob/schema.json`:
```json
{
  "brief": { "project": {"id": "...", "name": "..."}, "requirements": [], "decisions": [], "assumptions": [], "outputs": [] },
  "ledger": { "increments": [], "runs": [], "events": [], "evidence": [] },
  "sources": []
}
```
Rules the command enforces, so draft to them:
- Every record in every array carries `id`, `created_at`, `source` (human, ai or tool) and `is_synthetic: false`. A synthetic record is refused; `fixtures/` is its only home.
- Requirements come from the repo's own plan and Definition of Done lines, ids `R-<repo>-00` onward. `R-<repo>-00` is "the repo is BOB-governed: bob/ files exist, main unchanged". Each has `priority`, `text`, `check`, `state`, `evidence_ids`, `source_ids`.
- A state of `verified` or `accepted` needs an evidence record in `ledger.evidence` for that id with `kind` diff, test, artefact or screenshot and `ref` pointing at a file in that repo. Where the only backing is a sentence in a review, the state is `reported` and the record's `ref` is the review path. Otherwise `not_assessed`.
- Increments: `INC-00` (the adopt itself, claims `R-<repo>-00`) and `INC-01` (phase one, a working look) and at most an `INC-02` (phase two); rounds are phases, so Ash approves per phase, never per fix, both `proposed`, `approval_id` null.
- Sources: one record per source the operator named, with `access` and `processing` set to what was observed (a source nobody opened is `queued` or `missing`, never `extracted`), plus `type`, `version`, `fingerprint`, `scope`, `knowledge_use`.
- No `approvals`. The command writes `{"approvals": []}`; a proposal carrying an approval is refused.

### 5. Run `/bob adopt` (Claude types the command)
It validates the proposal, refuses with every reason listed if any rule fails (fix the proposal, run again), or writes `bob/ledger.json`, `bob/sources.json`, `bob/approvals.json`, then `bob/brief.json` LAST so Gate A engages only once every file exists, then appends the status line. It runs no git. Read the five files back; `grep -c '"state": "verified"' bob/brief.json` must equal the count of distinct requirement ids with an evidence record in `bob/ledger.json`.

### 6. Hand over the approval (Ash needs to)
The repo is now governed and no increment is active, so Gate A refuses every write, including the commit. Ash needs to type `/bob approve INC-00`. That command is the only writer of `bob/approvals.json`: it appends one immutable record with the brief's sha256 and the approver from `git config user.name`, sets `INC-00` approved then active, and refuses a duplicate or a second active increment. Save Gate A's denial text from before the approval under `docs/evidence/adopt/`: it is live evidence. Committing the `bob/` files afterwards stays a Gate A decision in the session; adopt never commits.

## Verification checklist (tick with evidence, or say which is open)
- [ ] Coverage manifest lists every input in one of four states and the live URL's fetch result.
- [ ] `/bob adopt` output names the four files written and zero refusals.
- [ ] No requirement reads `verified` or `accepted` without an evidence id in `bob/ledger.json`.
- [ ] `bob/approvals.json` is `{"approvals": []}` until a human types `/bob approve`.
- [ ] `git log main -1` unchanged from preflight; `git diff main --stat` shows only `bob/`, `docs/evidence/adopt/`, `docs/project-status.md` and `.claude/settings.json`.
- [ ] Nothing from the adopted repo's client material appears in the BOB plugin repo.
