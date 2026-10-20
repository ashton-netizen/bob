# BOB · Claude Code kickoff (paste this)

Open the Claude desktop app, Code tab, on this folder (exact clicks in START-HERE.md). Either paste everything inside the block, or type this one line and press Enter: `Read docs/KICKOFF.md and carry out the block in it as if I had pasted it.` Nothing needs copying first; every file it names is already here.

```text
Read CLAUDE.md, then docs/product/product-plan.md in full (the Step Change Build Brief for BOB, Parts 0 to 3; it is the controlling document), then docs/project-status.md and docs/handoff.md. references/BOB_Product-and-Build-Brief_v1.md is the original product brief: its sections 5 to 12 (workflow, experience, ingestion, data gate, output contract, build control, requirements R01 to R21, defect scenarios) still apply; its section 4 architecture is superseded by Part 0 of the plan. BOB is a Claude Code plugin, not a local app.

First, say back in five lines what BOB is, who Mags is, what Build 1 proves, what the pane spike is for, and what you will stop for. Then enter plan mode. No feature code until the repo is wired.

Preflight (also runs as scripts/preflight.sh on session start; record whether that hook fired and whether exit 2 blocked or only warned):
1. `python3 -I scripts/check_manifest.py` passes: nothing in this pack drifted.
2. `python3 -I scripts/check_fixtures.py` passes: schema and fixtures agree, approval hash matches.
3. `claude --version` answers. Record it in docs/project-status.md. `claude plugin validate ./plugin-spike` passes.
4. `gh auth status` answers. Report which GitHub account or org it is signed in to. Check whether `step-change/bob` is free (`gh repo view step-change/bob`). If the org does not exist or two orgs are possible, stop and ask Ash which one, with your recommendation. Never create the repo under a personal account without asking.
5. Read the Claude plan name from the signed-in account if the CLI or app shows it; otherwise record "Team plan per Ash, unverified".
Never print a key. BOB holds none.

Wire the repo first (plan Part 3):
- `git init`, first commit straight to main (the only one, ever), push to the agreed org, branch protection on main with pull request required and no force-push.
- Required checks are the jobs in .github/workflows/gate.yml: secret-scan, personal-data, no-runtime-babel, plugin, schema-and-fixtures. If the `plugin` job cannot run unauthenticated in Actions, split it, record the finding in docs/handoff.md, never add a key.
- Each check seen RED once against its own bug (a planted fake key, a planted email in bob/, a planted text/babel tag, a broken fixture) before it is trusted. Record each red run's URL in docs/evidence/ and the ledger.
- Then `git switch -c build-1`.

Then Build 1 from the plan, in this order, each step ending in a check someone can see:
1. Plugin scaffold at the repo root: .claude-plugin/plugin.json, hooks/hooks.json, hooks/register.tsx, types/index.d.ts, with bob/schema.json as the only source of states. Start from plugin-spike/ (reuse, do not rewrite). Check: `claude plugin validate .` passes with zero refusals.
2. PANE FIRST. Get plugin-spike/ loaded into THIS desktop session and open the pane reading fixtures/ledger.json: Now (increment, current task, blocker, next action, owner), Board (each requirement with its state chip) and Evidence. Engine components only; no custom fonts, no brand. The desktop docs (code.claude.com/docs/en/desktop, read 21 October 2026) do not document --plugin-dir for the Code tab, so do not assume it. Try, in order, and record which one worked in docs/handoff.md: (a) load the plugin-authoring skill, which watches this session's dev-mods folder; copy plugin-spike/ into that folder; the app then asks Ash once to turn on mods (this exact route drew the pane in Cowork on 20 October); (b) if that skill is not available in a local session, add this folder as a local marketplace (`claude plugin marketplace add ./plugin-spike` after giving it a .claude-plugin/marketplace.json) and install from it via + next to the prompt box, Add plugins; (c) if neither loads it, stop and record it. Check: Ash looks at the Code tab and says whether the pane is drawn. If it does not draw on this surface, stop, record it, and switch the board to docs/status.html written by the same hooks, as the plan's kill criteria say. Do not go to step 3 before Ash has looked.
3. Gate A, approval: a tool.call hook that denies Edit, Write and file-writing Bash when bob/approvals.json has no record whose brief_hash equals sha256(bob/brief.json) and whose scope_increment_ids holds the active increment. The denial names the missing approval and one next action. Check: `claude plugin test .` red against a fixture with no approval, green with one; red again when brief.json changes by one byte.
4. Gate B, evidence: a Stop hook that blocks ending the turn when the active increment's requirement_ids gained no evidence record this run. The message names the IDs and what counts as evidence. Check: test red then green.
5. State table test: a transition to verified with no evidence record is rejected; a transition to accepted with source other than human is rejected. Check: tests red then green.
6. Preflight: confirm scripts/preflight.sh ran on session start; add a test for each STOP condition. Check: one failing test per condition.
7. /bob status command: increment, current task, blocker, next action, owner, stale flag. Check: output seen in this session.
8. Marketplace: .claude-plugin/marketplace.json in the repo. Check: in a fresh empty folder, install BOB from the pushed repo (desktop: + next to the prompt box, Add plugins, then the marketplace; terminal: `/plugin install bob --marketplace <org>/bob`) and the pane appears in the next session (Ash confirms).

Rules for this build (the full list is CLAUDE.md):
- Never edit main after the first commit. Never --no-verify. Never runtime Babel. Never a key.
- bob/schema.json is the only home for states and transitions. No second copy.
- Model prose never moves a requirement past reported.
- Every record carries id, created_at, source and is_synthetic.
- After each step, append one line to docs/project-status.md: step, state (planned, implemented, verified, accepted), evidence path. Add one line to docs/handoff.md for any decision or landmine.
- Do not ask Ash to continue. Stop only for: the pane look (step 2), the GitHub org if ambiguous, or an action outside this repo. Name the doer on every action line: "Claude" or "Ash needs to".

At the end of Build 1 report: implemented, verified, unverified and not done, each with evidence paths, in plain Australian English, no em-dashes, headline first, and one next action with an owner. Build 2 (adopt AquaAgent) does not start in this session; it needs the pane result and its own kickoff.
```

## What this kickoff does not do
No deploy, no cloud account, no paid API call, no change to AquaAgent, VGA or tAItans, no client material. The launch pack in Downloads stays unchanged.
