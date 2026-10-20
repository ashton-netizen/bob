---
name: "build-brief"
description: Interrogate any Step Change build before code is written, then verify the live build against its own Definition of Done. Use when someone is about to build an app, tool, agent, automation or Claude skill, or says "brief this build", "I'm about to build", "derisk this build", "is this ready to build", "scope this build", "check my build brief", "check the build against the brief", or hands over a spec and says "build this". Use even when "brief" is not said but a new tool, agent or API key is coming. Runs the 5 Ds and ten blocks in batched rounds (operator time capped at 60 minutes, cost stated up front), writes OPEN QUESTIONS instead of defaults, maps every rule to a hook, test or required check, and returns GO, REVISE or BLOCKED. Carries Infinite Leverage, VGA and tAItans lessons. Never codes or deploys. Not for copy or design QA (check-against-brief), whether to build (agile-strategy) or deploy-day security (ship-it-safely).
---

# Step Change Build Brief

**No build starts until every "Stop if" is clear and every rule has somewhere it is enforced. If it is not in the config, it does not exist. If the check is not green on the remote, it does not ship.**

## Why this exists

Every defect that reached a user on Value Gap Audit and Battle of the tAItans traced back to a brief gap, not a coding gap. A key set locally and missing in production. A spend ceiling that could be `undefined`. A second copy of a guard that drifted. A saved browser setting pinning old behaviour while the deploy log said otherwise. A green suite that passed with seven shipped defects re-introduced. A gate named in a project file that was never installed.

The tAItans council's verdict on this exact problem (2 October 2026): the failure is not a missing brief but a missing enforcement layer. Knowledge the builder does not have cannot be interviewed out of them; it has to be imposed where code is written and shipped. So this skill does three things: it interviews fast, inside a hard cap on the operator's time; it turns every answer into config, hooks, tests and required checks; and it verifies the live build against the same Definition of Done.

It brings together, in one Step Change brief: the Build Brief Framework's ten blocks, Infinite Leverage's 5 Ds and 18 protocols, the VGA and tAItans lessons, and outside best practice. Where Infinite Leverage clashes with Step Change house rules, house rules win (see `references/il-playbook.md`).

## When this skill applies

- Anyone at Step Change is about to build an app, tool, dashboard, AI agent, automation, integration or Claude skill.
- A spec, PRD, IL product plan or Claude Code brief exists and someone wants to know if it is ready ("check my brief").
- A build is live or nearly live and someone asks "is it done", "check the build against the brief".
- Latent: the conversation is heading toward code, a deploy, an API key or a scheduled agent.

## When this skill does NOT apply

- **Whether to build at all:** `agile-strategy` (or `hgs-virtual-board` for a high-stakes go/no-go), then come back.
- **Copy, design or document QA:** `check-against-brief`.
- **The deploy-day security pass:** `ship-it-safely`. This skill turns its checks into tests and gates; it does not restate them.
- **Writing the code or deploying.** Out of scope. Always.

## Three principles

1. **A gap is an OPEN QUESTION, never a default.** If the operator cannot answer and it cannot be read from the live asset, the handover or the repo, write `OPEN QUESTION:`. Any open "Stop if" blocks the build.
2. **Gates over prose.** Every rule in the brief names where it is enforced: CLAUDE.md, a Claude Code hook, a test, or a required check on the remote. Local hooks are skippable by one tired person at 11pm; the remote is not. A rule with no enforcement point is unfinished. The first `--no-verify` is a defect in its own right.
3. **Observe, don't accept.** PASS means seen on the deployed URL, in the database, in the inbox. "Not done because the agent said so. Done because you saw it." [IL] A signed brief is a lead measure, never proof the release is right.

## The operator's clock

**The operator gives at most 60 minutes. Claude's own work does not count against it.** The clock exists to manage their time, not to rush the build.

- **Before the first question, say the cost.** "N questions in R rounds, about M minutes of your time." Estimate 1 minute per pick-an-option question and 3 minutes per open-text one. Recount after Step 0's pre-fill.
- **Batch and release.** Ask a round of up to four questions in one `AskUserQuestion` call (recommended option first, real alternatives). Then Claude works: reads, drafts that part of the brief, runs the reuse check or threat map. Show a five-line result. Then release the next round. Do a bit, stop, do a bit, stop. This skill's batching overrides the one-question-per-popup default, on Ashton's ruling of 2 October 2026.
- **Keep a running tally** at the top of each round: "Round 2 of 5 · about 9 minutes left of yours."
- **Never re-ask.** Anything answered in the conversation, the existing brief, the repo or the live asset is shown as pre-filled with a one-line "change it if wrong", not asked.
- **At the cap, stop asking.** Remaining questions become OPEN QUESTIONS with an owner. The verdict reflects them.
- **Push back once** on a vague answer, inside the next round, with a real incident from `references/lessons-library.md` as the example. Still vague: OPEN QUESTION.

## Three modes

| Mode | When | What happens |
|---|---|---|
| **1. Interview** | No brief yet | Step 0, then the rounds below. Writes the Step Change Build Brief and its DoD. |
| **2. Check** | A brief, spec or IL product plan exists | Score every block ✓ answered, ~ vague, ✗ missing, and every rule enforced or not. Ask only the gaps, in rounds. Rewrite into the Build Brief format, keeping the operator's words. |
| **3. Verify** | Something is built or deployed | Read-only. You first, then QA. Each DoD line PASS, FAIL or I CHECK THIS with evidence; each gate confirmed live on the remote. See `references/evidence-rules.md`. |

Unattended runs never block on a popup: they pre-fill what they can, write OPEN QUESTIONS, set the verdict and stop.

## Step 0. Claude's prep (no operator time)

1. **Name the build type:** app or tool, agent or automation, or Claude skill. It decides which blocks apply and the hand-off.
2. **Open the live thing first.** For an existing tool, read the live URL, its handover page and the repo `CLAUDE.md` before asking anything. A static brief is not the live asset.
3. **Read install and project state live.** ListSkills for skills; the repo, its branch protection and required checks, Netlify and Supabase project lists for apps. Name anything the build could duplicate, collide with or re-point.
4. **Reuse check.** Find code that already does something like this: the existing repo, the 8 Edges reference library if cloned (read-only, never changed), other Step Change repos. List what to reuse or adapt, with paths, and what is genuinely new. [IL Block A]
5. **Confirm the stack and test framework from the repo.** The gate set depends on them.
6. **Pre-fill.** Draft every answer the sources support, tagged with its source. Then count what is left and announce the cost.

## The rounds

Five rounds by default. Drop any whose blocks don't apply; merge small ones. Core questions are in the table below; deeper probes, tagged by source, are in `references/block-questions.md`. Pull a probe only when the build's shape triggers it.

| Round | Blocks | Covers | Claude's work after the round |
|---|---|---|---|
| **1 · Define** | 1, 2 | Result, owner, the 5 Ds' Define the Problem, appetite, no-gos, framework | Teach-me-the-framework summary; reuse findings; prototype-or-system call |
| **2 · Discover and design** | 3, 5 | Data, the workflow steps and who does each, AI on its own / AI drafts / never, ROI, DoD | Data map and threat map; ChatGPT threat-model prompt for the operator to run; Build 1 drafted |
| **3 · Architecture and cost** | 4, 6 | Shape, host, keys, buy-don't-write, spend, abuse | Enforcement map drafted; repo-wiring checklist |
| **4 · Brand, delivery, agents** | 7, 8, 9 | Brand and approvals, UX states, branch and deploy path, agent never-list | Build 2 drafted; DoD lines each given an enforcement point |
| **5 · Handover and sign-off** | 10 | Handover, kill criteria, rollback, then sign-off of the whole brief | Verdict; brief written and committed; hand-off |

## The ten blocks

| # | Block | Core questions | Stop if |
|---|---|---|---|
| 1 | **Result and owner** | What changes when this lands, in one sentence, against one real failure from the last 90 days? Who uses it, how often, on what device? Who owns it after launch? What must it not look or sound like? What already works that it must not break, duplicate or confuse? | Nobody owns it after launch, or the result is an activity ("build a dashboard"), not a change |
| 2 | **Prototype or system** | Database, login, review step and owner: yes or no each? Appetite in days? Explicit no-gos? Which framework, from which source, does this plan stand on? The 2 or 3 load-bearing assumptions, and how each is falsified inside 90 days? | Any answer is no but it is treated as a live system |
| 3 | **Definition of Done** | What can a stranger do on the live site that proves it works (3 to 5 yes/no checks)? 1 to 3 success criteria with a number and a date, one leading and one trailing? Build 1, the smallest real slice that proves the loop? Later? Critical path ranked by business risk, with its loading, empty, error, recovery and accessibility states? | A DoD line can't be ticked yes or no on the live site, or has no enforcement point |
| 4 | **Architecture and keys** | Local file, hosted static, or hosted with a backend? Host (Netlify by default)? What is bought from the platform (auth, sessions, row-level security, secrets) rather than written? Every key, where it lives locally and in production? Publish root? New names confirmed unused? | A key is headed for the browser, repo or chat; runtime Babel; security code being hand-written where a managed service exists; a new name could link to a live project; or the build prompt has no preflight that stops on an empty or placeholder key |
| 5 | **Data and privacy** | What is stored, is any personal, is each field necessary? `is_synthetic` / source flag on every table at creation? Who can read it (RLS on)? Region, and does it leave Australia? Deletion? Trust boundaries and abuse cases? | Test or internal data can't be told apart from real data at source |
| 6 | **Cost and abuse** | Measured cost per run? Daily ceiling enforced before the call, and who can trigger spend? Rate limits that survive a cold start? User-supplied URLs (SSRF)? Rendered user or model output (XSS)? Prompt caching on every Claude call, above the model's minimum? | No hard daily ceiling on any paid API call |
| 7 | **Brand and design** | Step Change (`scm-design-skill`) or client brand? Real logo, fonts, assets in hand? Wireframe approved, then mockup approved? Works at 375px and 1440px, 44px tap targets? | Assets missing (never approximate a font or logo), or design not approved |
| 8 | **Delivery flow** | Branch (never main)? Greenfield or live product (live means a preview first, always)? Branch protection and required checks on the remote? How does a deploy happen, and can it bypass the remote checks? Who reviews, capped at 8 items? Keys in both places, redeploy after env changes? | Edits main directly; deploys without the gate; a deploy path that skips remote checks; or a gate named but not installed |
| 9 | **Agents and automation** | Trigger (secret-protected), context (never the whole database), instructions, least-privilege tools, run log? Rhythm and cost (start daily)? Never-list? Approve button before anything leaves the building? Senior code review done before anything can email a customer? Is the agent a portable folder of four files (context, guardrails, routine, skill with the exact JSON it returns), with a run log, a notes table and a Run now button to test without waiting for the schedule? Is the provider's message id stored for every send? | It can email a customer without a human click or before a senior code review, delete anything, act on synthetic records, move a deal past contacted, or change a live system unattended |
| 10 | **Handover and kill criteria** | Handover page: what's live, jobs, key names only, test modes and how to switch them off, decisions and landmines? Kill criteria as states and dates? Rollback steps, rehearsed? Who is alerted on a silent failure? | No kill criteria, or no rollback |

**Which blocks apply.** App or tool: all ten. Agent or automation: all ten, Block 9 is the heart. Claude skill: Blocks 1, 2, 3, 5, 9 and 10 (4 only if it holds a key or calls an API; 7 only if it produces branded output).

## Enforcement

Every Stop-if and DoD line gets an enforcement point in Part 3 of the brief. Defaults and tools are in `references/enforcement.md`. In short:

- **Remote first.** Branch protection with required checks: secret scan, dependency audit, static analysis, accessibility plus critical-path smoke test, the repo's own test suite. These block the merge; they don't advise.
- **Then local:** CLAUDE.md rules, Claude Code hooks, pre-commit. Useful, but skippable, so never the only control.
- **Close the deploy bypass.** A Netlify CLI deploy uploads the working folder and never sees GitHub's checks. Either deploy from `main` via the host's git integration, or the deploy script refuses unless CI is green on that exact commit. Ask this in Round 4.
- **AI pen test last.** A ChatGPT audit against the threat map runs only after every gate is green. It advises; it is not a gate.

## The never-ever list (pasted into every build)

The one home for the hard lines on any Step Change build. Paste it into every Claude Code build prompt, and copy it into the repo `CLAUDE.md`. Each line names where it is enforced; a line with no enforcement point in Part 3 makes the verdict REVISE. Sources: Infinite Leverage protocols 05, 06, 13, 14, 15 and the guard lines; the VGA, tAItans and 8 Edges lessons.

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

## The verdict

- **GO.** Every Stop-if clear, every rule enforced. Name the first step.
- **REVISE.** No Stop-if open, but vague answers or unenforced rules remain. Build 1 may start; list what must close before Build 2.
- **BLOCKED.** A Stop-if is open. Name it and who closes it. No hand-off.

Never soften BLOCKED into REVISE to keep momentum.

## Output: one Step Change Build Brief

One document, from `assets/step-change-build-brief.md`, in four parts. It is written so Infinite Leverage's agents and `/goal` read it without translation.

- **Part 0 · Gates:** verdict, OPEN QUESTIONS with owners, Stop-if table, the operator's time used.
- **Part 1 · Product plan (for the operator):** the result, the 5 Ds, framework, scope, deliberately not building.
- **Part 2 · Development plan (for the AI):** the brief that drives every `/goal`, data model, conventions, then Build 1 and Build 2, each with Goal, Scope, ordered steps each ending in a visible check, the files it borrows from, Definition of Done, Success Criteria. Under two pages.
- **Part 3 · Enforcement map:** each rule and DoD line, and the hook, test, CLAUDE.md line or required check that enforces it.

**One home.** Before a repo exists: `CLAUDE OUTPUTS/<project>/<Project>_Brief_vN.md`. Once a repo exists, the home moves to the repo at `docs/product/product-plan.md` (add-on builds: `docs/plans/<name>-plan.md`), on a branch, never main, committed as the source of CLAUDE.md. CLAUDE OUTPUTS then keeps only a dated snapshot marked "snapshot, the repo copy is live". Read every file back after writing.

The DoD checklist (`assets/dod-checklist.md`) is reused unchanged in Verify. Never edit the DoD to match the build. For any build that automates a process, keep the workflow lines (seven elements, New Hire Test, labelled steps) and set the weekly check: what shipped that would not have without AI, and which outcome it moved.

## Hand-off (GO, or REVISE for Build 1 only)

- **Claude skill:** `build-step-change-skill`, passing the brief as its Stage 2 answers.
- **App, tool or agent:** a Claude Code session on the repo, in plan mode first. Wire the repo (branch protection, required checks) before any feature code. Paste the never-ever list above. Then `/goal Build 1 from the plan`, review, `/goal` the next build. Every build prompt opens with the preflight and stop rule, and ends with one sanity check on production (see `references/il-playbook.md`, "Build-prompt mechanics").
- **Reviews:** hand over the paste-ready prompts in `references/review-prompts.md`: "my code reviewer" after every build, then the Karpathy review and the senior QA lead plus James Bach pass to harden. Act as [Expert], review [this] against their standard.
- **Brand:** `scm-design-skill`. **Voice** on client-facing copy: `ashton-voice`. **Deploy-day pass:** `ship-it-safely`.

## Always

- Announce the question count and the time cost before Round 1, and keep the tally.
- Read the live asset, the repo and the handover before asking.
- Run the reuse check before planning anything new.
- Give every rule an enforcement point; prefer the remote.
- Count the copies: any guard, list or fact with two homes is a finding.
- Flag every figure not from a primary source; cite frameworks and rules from `references/sources.md`.
- Name a missing gate as missing.

## Never

- Never fill a gap with a sensible default.
- Never spend more than 60 minutes of the operator's time; turn the rest into OPEN QUESTIONS.
- Never write code, deploy, run a paid call, or print a key.
- Never accept a local hook, a prose rule or a signed brief as the control.
- Never mark PASS on an agent's summary, a build log, a returned ID or a suite never seen to fail.
- Never change the brief or DoD to match the build.
- Never re-offer a partial scope after the operator has said "fix it all".

## Anti-patterns

- **The marathon interview.** Forty single popups with no sense of how many are left. The operator skips it next time.
- **The prose gate.** "Run ship-it-safely before deploy" in CLAUDE.md, and nothing installed to run.
- **The skippable control.** A pre-commit hook as the only security gate. Deleted at 11pm, never missed.
- **The bypass deploy.** Remote checks all green on GitHub; the laptop CLI deploy shipped something else.
- **Writing security you could buy.** Hand-rolled auth or sessions when the platform provides them.
- **Verifying the artefact you edited.** Grep the served HTML; the operator's browser still holds the old setting.
- **Testing the helper, not the caller.** Two panels, one fix.
- **The quiet skip.** A suite that could not run prints a green line.

## Close

End on the verdict, the operator's time used, and one next action: close the named OPEN QUESTION, or wire the repo and start Build 1.
