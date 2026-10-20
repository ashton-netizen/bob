# Infinite Leverage playbook, Step Change edition

What the Edge8 Infinite Leverage workshop (Melbourne, 1 to 2 October 2026) teaches, distilled for the Build Brief. Source: infiniteleverage-8.com, `/blueprints/protocols` and the `/workshop/melbourne-2026/` blocks, read 2 October 2026; Blocks 1 to 10 of the build prompts re-read in full on 6 October 2026 (Block 0, the handouts PDF and the survey not read). Re-read the site before quoting it to anyone; it is a live page and may change.

Beyond the build method: the workshop's 90-day plan, the leadership frame and 8 Edges live in `Global/memory/infinite-leverage.md` on the Step Change AI Operating System mount. Point there; do not restate them here.

## House rules win every clash

| Infinite Leverage says | Step Change does instead | Why |
|---|---|---|
| Stack is Claude, GitHub, Vercel, Supabase | Netlify is the default host; Vercel only by choice | Live tools and their deploy routines are on Netlify |
| Greenfield builds may merge straight to main and review on production | Branch first, always; preview before production on anything people use | Global/CLAUDE.md, and IL's own live-product rule |
| Developer agent deploys via git push to CI | Each tool's own deploy routine, run by the owner (for example `npm run deploy` on VGA) until the deploy is git-driven with remote checks | The repo CLAUDE.md house rules |
| "Never run a dev server" | Same, on Ashton's laptop. `npm run build` is the local check | The guard line below |
| Plan lives at `docs/product/product-plan.md` | Same path, but the document is the Step Change Build Brief (Parts 0 to 3) | One home that IL agents already read |

## The 18 protocols (one line each)

Mindset
- **01 CMS is dead, AI is the CMS.** The question is "what is the prompt for this change". A vague prompt produces a vague change.
- **02 The stack.** One job per tool. Works locally, breaks in production: about 80% of the time a missing environment variable.
- **03 The folder is the agent.** Role, skills, context, routines, guardrails, Definition of Done. "If you cannot open the folder, you do not own the agent."
- **04 The build team.** You plus an engineer on call plus four agents (PM, developer, QA, devops). Anything that reaches a customer goes through you. Call the engineer when the same error has not changed in 30 minutes, when you are about to bypass a security rule, when production is down, or when you are unsure a command is safe. Brief them with the exact error, the last commit, what you tried, what you think is happening.

Infrastructure
- **05 GitHub hygiene.** Pull before you start. Nobody edits main directly, not you, not an agent. Never force-push. One worktree, one branch, one plan.
- **06 Host hygiene.** Every branch gets a preview; main is production. When prod breaks and local works, compare the local env file with the host's env settings first.
- **07 Supabase basics.** RLS on every table, then one policy per use case. Schema lives in code. One table per concept; every table has id, created_at, and user_id if user-scoped. An unauthenticated read returns 401.
- **08 Always be cataloguing.** One name per concept. Rules go to CLAUDE.md, decisions to `docs/handoff.md`, things that broke to `docs/qa/`.

Planning
- **09 The plan is the prompt.** The work in one sentence ("if you cannot say it in one sentence, you have two products"), the 3 to 8 steps, who does each today, which steps AI does on its own, as a draft, or never, and that routing written down. Epics run 3 to 7 days, tasks 30 to 90 minutes, one epic at a time. The DoD is written before the build, not after.
- **10 Frameworks.** "I need to [task]. Teach me [Framework] from [University]." The plan names its framework so QA can test against it. The Definition of Done is a pre-mortem.
- **11 Multi-delegating.** The play: plan well, build small, build all, review. One plan per build; parallel builds never share files; check in, don't hover; merge one at a time, and the second build pulls main and re-runs its checks.

Building
- **12 Design systems.** `brand/` holds tokens, voice and examples. At Step Change, `scm-design-skill` is that system.
- **13 Communications.** Separate sending domains for transactional and broadcast. SPF, DKIM, DMARC. Unsubscribe in every nurture email, honoured instantly and forever; consent recorded with a date. Cron secret-protected and idempotent. Test mode first; never send to a synthetic person.
- **14 Admin interfaces.** Lock the protected route on day one. Same design system. `is_synthetic` on every table, a seeded 90 days, and a delete-synthetic script beside the seed.
- **15 Agents in the cloud.** Trigger (secret-protected), context (never the whole database), instructions (with the exact JSON to return), tools (least privilege; never email a customer, delete anything, or change a stage past contacted), log (`agent_runs`). "If it is not in the log, it did not happen." Start daily. Search the repo for the key prefix before merging: zero hits.

Hardening and continuity
- **16 Harden the code.** Plan then branch, build then preview, QA then merge. Unit tests many; an end-to-end suite weekly off-peak; one five-minute human pass per epic on your own phone. QA plan at `docs/plans/qa-plan.md`. Two named reviews (below). You decide what to fix: security, mobile breaks and anything on a critical journey now; the rest to Later.
- **17 Reflect and plan with the PM agent.** Evening: what slowed you down, what surprised you, the one thing for tomorrow. Morning: what shipped, what next. The PM flags drift and never assigns itself work.
- **18 Handoff after you leave.** Three layers: project state, agent state, tacit knowledge. `docs/handoff.md`: summary, the five biggest active decisions with rationale, known landmines, what the next person should do. Write it as you go. Test it on a fresh session: "Read docs/handoff.md and tell me what to do tomorrow."

## The 5 Ds (the Block II planning interview)

Taught as "Act as Dan Shipper... Plan with the 5 D framework." Map onto the rounds:

| D | Core question (IL wording, adapted) | Round |
|---|---|---|
| **Define the problem** | Walk me through what happens now. Where does it go cold, get forgotten, slip through? | 1 |
| **Discover data** | What data, where does it live today, roughly how much? | 2 |
| **Design workflows** | The steps, who does each today, and for each: AI on its own, a draft for you, or never? | 2 |
| **Determine ROI** | Ninety days after launch, what has to be true to call it a win, and what is the weekly volume? | 2 |
| **Definition of Done** | What will you check on the live site with your own eyes? Three to five yes/no lines. | 2 |

IL also asks for look and feel, brand colours and logo, two or three reference sites, three voice words and one thing it never sounds like, pages and domain. Those land in Round 4.

## The play and the plan

- **Plan well:** framework, 5 Ds interview, plan, design system, wireframe (approval 1), mockup (approval 2). Nothing is built until both approvals exist.
- **Build small:** `/goal Build 1 from the plan`. "Not a prototype: a thin slice of the real system." Live on the phone.
- **Build all:** `/goal the next build`, on a branch. "You read the report, not the code."
- **Review:** you first, then QA. "Nothing is marked passing that nobody observed. Then merge."
- **Plan shape:** Part 1 the product plan for the human, Part 2 the development plan for the AI; each build has Goal, Scope, steps each ending in a visible check, Definition of Done as checkboxes, Success Criteria ("how we know it's good, not just done"). Under two pages. Deliberately not building, written down.
- **After each build:** tick the DoD in the plan and add one line to the project map in CLAUDE.md.

## The two named reviews (Block VII)

Paste-ready Step Change versions: `review-prompts.md`. IL's pattern: act as [Expert], review [this] against their standard. Note: IL's installed `qa` agent and `qa-triage` skill do not carry these prompts; they live only in the workshop pages.

- **Karpathy review** ("Act as Andrej Karpathy"): five lenses, correctness, simplicity, security (secrets reachable from the browser, admin pages or API routes without the login check, database access bypassing RLS from the client), web and mobile (375px and 1440px, 44px targets), speed. At most 8 items, to `docs/qa/code-review.md`. Changes nothing until approved.
- **Bach review** ("Act as James Bach", "testing is not checking"): walk each critical journey from code to database; try the wrong input, double submit, back button, expired session; add a unit test for each failure found. To `docs/qa/qa-review.md`.

## Guard lines

Moved 2 October 2026. The guard lines now live in the never-ever list in `SKILL.md`, which is the one home for every hard line on a build. Do not restate them here.

## Running parallel builds (Block A)

- Name every conversation `date - repo initials - task`.
- One worktree and one branch per build; never two worktrees on one branch.
- The larger build branches from `origin/main` so it picks up whatever merged first.
- Reference libraries (8 Edges and similar) are read, never changed.

## Build-prompt mechanics (Melbourne blocks, read 6 October 2026)

Patterns in the workshop's own prompts that our skills did not yet carry. Copy the pattern, not the wording.

- **Preflight on real values, not labels.** Before any build step: every key in `.env.local` has a real value (empty, `...` or a `YOUR_` placeholder counts as missing); the host's environment list shows the same names for Production (names only); `gh auth status` and the host CLI both answer. Anything missing stops the run with a plain-English "which key, where it comes from".
- **The stop rule lives in CLAUDE.md.** Its opening instructions say: read this file and the plan; work out which items the task needs; if a needed item is `[pending]` or a key is a placeholder, stop and say "I need X to do this. Please Y." The Stack and Build status lines start `[pending]` and are filled as each thing exists.
- **One sanity check on production, and only one.** After the ship step: POST the real form route once with the owner's email plus `+sanity`, then query the database and confirm exactly one new person row and one linked contact row. PASS or FAIL in one line. No other live poking. The owner then tests the live site on their own phone.
- **The first commit is the only one straight to main**, because main is empty until then. Everything after goes branch, pull request, merge.
- **Review lines have three states:** PASS, FAIL, or I CHECK THIS for lines only a person on the live site can see. The reviewer works from code and database, never a browser.
- **The portable agent folder.** `agents/<name>/` holds four files. `CONTEXT.md`: who it is, the business, what it reads, who it reports to. `GUARDRAILS.md`: the forbidden list (drafts only, never acts on synthetic people, never moves a stage past contacted, never prints a key). `ROUTINE.md`: when it runs and the workflow as numbered steps, each marked agent does, agent drafts, or me. `SKILL.md`: the scoring rules and the exact JSON returned per item. The cron route loads all four as its instructions. Copy the folder to start the next agent.
- **Agent tables and controls.** A runs table (started, finished, items seen, status, error) and a notes table (score, reason, next step, draft, approved at, sent at). An admin page with a Run now button, and an Approve and send button that refuses synthetic people and says why. Run the job by hand once in chat, on real data, before any code, and fix the agent files while it costs nothing.
- **Nurture sends.** Store the provider's message id on every send so you can prove it went. The cron wakes every 15 minutes, sends what is due, records it, advances the step, and never sends the same step twice. Test mode compresses delays to minutes and rewrites every recipient to the owner.
- **Model names.** Their agent prompt says to use the model "named in the Anthropic docs as the current Sonnet" instead of a remembered id. Look it up at build time.

