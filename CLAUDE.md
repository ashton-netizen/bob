# BOB · repo instructions

Read this file, then `docs/product/product-plan.md` (the plan; it is the prompt), then `docs/project-status.md`. Work out which items the task needs. If a needed item below is `[pending]`, a key is a placeholder, or a check is not green on the remote, stop and say: "I need X to do this. Please Y." Do not guess, do not fill the gap with a default.

## What BOB is, in one sentence
A Claude Code plugin (pane, gates, slash commands, repo templates) that lets a Stepper who has never used a terminal take an idea or an existing repo through an approved brief, bounded build rounds and evidence-backed verification, where no round can start unapproved and no round can end unproven.

## How BOB briefs Claude Code (and how this repo is briefed)
1. The brief lives in the repo as files read every session. Never a chat prompt.
2. One round is one approved increment with requirement IDs and DoD lines. It cannot start without a matching approval record and cannot end without evidence against those IDs.
3. Session start runs the preflight in `scripts/preflight.sh`: branch not main, ledger present, approved hash matches, keys present by name only.
4. Evidence is a diff, a test result or an artefact path captured from tool results, timestamped, with origin. Model prose never moves a requirement past "reported".
5. Hard lines sit on the remote as required checks (`.github/workflows/gate.yml`). Hooks are the fast local layer, never the only layer.

## Project map (one line per thing; update as each exists)
- Plan: `docs/product/product-plan.md` · DoD: `docs/product/definition-of-done.md` · Status: `docs/project-status.md` · Handoff: `docs/handoff.md`
- Data contract: `bob/schema.json` (one home for shapes, states, transitions). Fixtures: `fixtures/` (synthetic only).
- Spike: `plugin-spike/` (validated pane mod). Production plugin: `[pending]` (created in Build 1 step 1 at the repo root).
- Remote: GitHub repo `[pending]` · branch protection `[pending]` · required checks `[pending]` (gate.yml must be seen red once before it counts).
- Preflight hook: `.claude/settings.json` → `scripts/preflight.sh` `[pending: first seen running]`.

## Every session and every decision (R-bob-04, R-bob-02)
- The first message of a session names `docs/status.html` and `docs/map.html`, with one line: how many promises are proven and the next step with its doer. Say it before asking anything.
- Each decision for Ash is asked once, as one popup, in the window that will run the answer, and the ask names that window. Never ask the same thing again.

## House rules
- Branch per build. The first commit is the only one straight to main. Everything after goes branch, pull request, merge.
- One home per list, guard, schema and state table. A second copy is a defect.
- Every record carries `id`, `created_at`, `source` (human, ai, tool) and `is_synthetic`.
- A requirement moves to `verified` only when an evidence record exists with kind diff, test, artefact or screenshot. Write the test that proves this.
- Every new test is proven red once against its own bug before it is trusted. A skipped suite reports SKIPPED, never green.
- The reference library under `references/` is read, never edited. Client material never enters this repo.
- Plain TypeScript compiled by the engine. No runtime Babel anywhere.
- Plain Australian English in every message and file. Headline first. No em-dashes. Name the doer on every action line: "Claude" or "Ash needs to".
- Do not ask the operator to continue. Stop only for: the pane look, an ambiguous GitHub org, or an action outside this repo.
- After each step, append one line to `docs/project-status.md`: step, state (planned, implemented, verified, accepted), evidence path.

## Merge policy (build stage)
Ash's standing policy, added 21 October 2026 from the Master Build Template seed (`CLAUDE OUTPUTS/Master Build Template/Master-Build-Template_Doc_v1.md`).
- Claude checks every build itself: tests, preview opened and screenshotted, ship-it-safely if it touches a key or spend.
- Claude ends each build with one verdict: MERGE, FIX FIRST or NEEDS ASH, plus one line of evidence.
- Claude merges MERGE verdicts on internal builds. Ash only sees a build when it is live with a client, touches spend or keys, or Claude says NEEDS ASH.
- No build sits unmerged. Every PR is merged, closed, or listed in one open-PR line at the end of the session.

How it meets BOB's own rules: merging a pull request is not accepting a requirement. A requirement still moves to `accepted` only with a human on the transition (`bob/schema.json`), and the five required checks still have to be green before any merge. BOB has no preview and no keys, so "preview opened" is the pane looked at and ship-it-safely does not apply until an increment adds a key or spend.

## The never-ever list (verbatim from references/build-brief/SKILL.md, the one home)
**Repo and code**
1. Never edit main, force-push or use `--no-verify`. *Branch protection on the remote.*
2. Never put a key in the browser, the repo, a log or a chat, and never print one. Check names only, and count a key as present only if it has a real value: empty, `...` or a `YOUR_` placeholder is missing. *Secret scan as a required check; key-prefix grep returns zero; the build prompt's preflight stops on a placeholder.*
3. Never put personal or client data in `CLAUDE.md`, `AGENTS.md` or `.claude/`. *ship-it-safely check 12, as a CI grep.*
4. Never hand-write auth, sessions or rate limiting the platform already provides. *Block 4 Stop-if.*
5. Never ship runtime Babel. Plain JavaScript only. *Block 4 Stop-if.*
6. Never change a reference library, and never copy its code. 8 Edges is read-only, and Edge8's terms forbid copying without written consent. *Reuse check notes it.*

**Deploy**
7. Never deploy around the remote checks, and never go straight to production on a live product without a preview. *Git-driven deploy, or a deploy script that refuses.*
8. Never start a dev server, headless browser or preview test on Ashton's laptop. `npm run build` is the local check. *Guard line; CI runs the browser tests.*

**Money, data and agents**
9. Never call a paid API without a hard ceiling enforced before the call. *ship-it-safely checks 3 and 5.*
10. Never parse a model reply that has not been checked for truncation and shape. *ship-it-safely check 11.*
11. Never let test data look like real data, and never send to or act on a synthetic record. *`is_synthetic` on every table; Block 5 Stop-if.*
12. Never let an agent email a customer without a human click and a senior code review, delete anything, move a deal past contacted, or change a live system unattended. *Tool permissions, not prose; Block 9 Stop-if.*

**Brand and truth**
13. Never approximate a logo or a font. *Block 7 Stop-if.*
14. Never say it worked when it did not, and never call it done on an agent's summary, a build log or a returned ID. *Verify mode.*

## Keys
BOB holds none. If any future increment needs one, it is named here first with where it lives locally and in CI, and the preflight checks its presence by name.
