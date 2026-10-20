# Review prompts: the named experts

Infinite Leverage's pattern for every review: **act as [Expert], review [this] against their standard.** Naming a real expert points the model at a specific standard instead of an average one (Protocol 10). These are Step Change adaptations of the Block VII prompts, rewritten for Netlify, branch-first and the owner's own deploy routine. Paste them into a Claude Code session on the repo, after the guard lines in `il-playbook.md`.

| Moment | Expert | Their standard | IL source |
|---|---|---|---|
| Planning interview | Dan Shipper | The 5 Ds, plan before build | Block II |
| Code review after every build | "my code reviewer" | Check the build against its DoD, evidence per line | Blocks III, IV |
| Harden: code | **Andrej Karpathy** | First principles, ruthless about simplicity, allergic to code nobody needs | Block VII.1 |
| Harden: QA plan | A senior QA lead | Critical journeys ranked by business risk | Block VII.2 |
| Harden: testing | **James Bach** | "Testing is not checking": a check confirms what we expected, a test looks for what we did not | Block VII.2 |
| Lead or fit scoring agents | Mark Roberge and Mike Volpe | Fit plus engagement, scored 1 to 5 | Block IX |

Protocol 16 rule, carried into Block 9: **a senior code review runs before anything is allowed to email a customer.**

---

## Karpathy review (harden the code)

Run on a new `harden` branch cut from an up-to-date `main`. It reviews, fixes on the branch, and opens a pull request. It never merges and never deploys.

> Act as Andrej Karpathy reviewing this repository: first principles, ruthless about simplicity, allergic to code nobody needs. Read CLAUDE.md, the Step Change Build Brief and the whole codebase. Look through five lenses:
> 1. Correctness: what is most likely to break something a customer or I would notice.
> 2. Simplicity: dead code, duplication (count the copies of every guard, list and price table), anything more complicated than it needs to be.
> 3. Security: secrets reachable from the browser, admin pages or functions without the login check, database access that bypasses row-level security, user-supplied URLs fetched without the shared guard, model output rendered without encoding.
> 4. Web and mobile: every page at 375px and 1440px; overflow, sideways scrolling, tap targets under 44px, hard-to-read text.
> 5. Speed: oversized images, JavaScript the page does not need, slow or repeated queries, Claude calls without a working prompt cache.
>
> Write docs/qa/code-review.md with at most 8 items, ranked by impact across all five lenses, each with the file, why it matters and the fix. Anything beyond 8 goes under Later, one line each. Fix the 8, most important first, keeping the design system. Prove each fix red against its own bug before trusting it. Run the full suite. Push the branch and open a pull request. Mark each item fixed with one line on what changed. Then give me a plain-English summary (found, fixed, left for later) and the pull request link, and stop. Do not merge and do not deploy; the QA pass comes first.

## Senior QA lead, then Bach review (harden the journeys)

Same `harden` branch. Part one writes the QA plan and stops for approval. Part two runs only after the operator says go.

> Act as a senior QA lead. Read CLAUDE.md, the Step Change Build Brief and every file in docs/qa/. Write docs/plans/qa-plan.md, under two pages:
> 1. Critical journeys that must never break, ranked by business risk.
> 2. For each journey: what a unit test covers, what the end-to-end suite covers, and what only a human can check, one line on why.
> 3. The development protocol for this repo: branch, build and tests pass, code review, required checks green, merge, then the owner checks the live site. Nothing reaches production untested.
> 4. When tests run: unit tests on every change; the end-to-end suite on a schedule, weekly off-peak, in CI and never on my laptop.
> 5. Test data: synthetic rows only (is_synthetic), never real people, cleaned up after.
>
> Add a Testing section to CLAUDE.md pointing at the plan. Explain unit versus end-to-end tests in plain English using this product as the example. Then stop and show: "QA plan ready to review: docs/plans/qa-plan.md. Say go, or tell me what to change." Do not start the QA pass until I say go.
>
> When I say go, act as James Bach. Testing is not checking: a check confirms what we expected; a test goes looking for what we did not. No dev server, no headless browser on this laptop.
> 1. Trace each critical journey from the page through the code to the database, and run the unit tests.
> 2. Query the database (or the repo's own read-only script) to confirm each journey writes the right rows.
> 3. For each journey, try what a real customer gets wrong: wrong input, an empty field, the double submit, the back button, a refresh halfway through, an expired session. Add a unit test for each.
> 4. Write docs/qa/qa-review.md: PASS or FAIL per journey with evidence, plus anything the plan never thought of.
> 5. Fix every FAIL on the branch, push, and re-check until all pass.
> 6. When everything passes and the required checks are green, tell me the pull request is ready to merge. Do not merge and do not deploy; I do both through this tool's own routine. Update CLAUDE.md: Hardened, with the date.

## After every build: "my code reviewer"

> Act as my code reviewer. On a review branch, read the Step Change Build Brief and the build's Definition of Done. For every DoD line, trace it through the code and the database and print PASS, FAIL or I CHECK THIS with one sentence of evidence. Confirm no key is written anywhere in the repo (search the key prefixes: zero hits) and every admin route checks the login. Write docs/qa/build-[n]-review.md. Do not test the live site yourself; I do that first.
