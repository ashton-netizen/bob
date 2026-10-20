# Enforcement: turning the brief into config

The rule from the Battle of the tAItans verdict (2 October 2026): "If it is not in the config file, it does not exist." Every Stop-if and DoD line in the brief gets an enforcement point in Part 3. Strongest first:

| Strength | Where | Skippable by a tired builder? |
|---|---|---|
| 1 | **Required check on the remote** (branch protection; the merge is blocked) | No |
| 2 | **Deploy script that refuses** unless the remote check is green on this commit | Only by editing the script, which shows in the diff |
| 3 | **Test in the suite** the required check runs | No, once it is in the required check |
| 4 | **Claude Code hook** (PreToolUse, Stop) | Yes, locally |
| 5 | **Pre-commit or pre-push hook** | Yes (`--no-verify`) |
| 6 | **CLAUDE.md rule** | Yes; it is advice to the model |
| 7 | **Prose in the brief** | Not enforcement. Mark the line unfinished. |

A line whose best enforcement is 6 or 7 goes into the verdict as REVISE, unless it is a judgement only a human can make (look and feel, tone), which is marked I CHECK THIS.

## Wire the repo first (Claude Code, before feature code)

The council's first fifteen minutes. Claude does the wiring; the operator only approves anything that changes account settings.

1. Branch protection on `main`: pull request required, required status checks must pass, no force-push, no direct pushes.
2. Required checks, run on every pull request:
   - **Secret scan:** the host's native secret scanning plus Gitleaks in CI. Also grep for the key prefixes the project uses: zero hits.
   - **Dependency audit:** native dependency alerts plus `npm audit --omit=dev` (or the stack's equivalent) failing on high.
   - **Static analysis:** native code scanning or Semgrep with a security ruleset.
   - **Accessibility plus critical-path smoke test:** Playwright drives the critical path with an axe check on each state. Runs in CI, never on Ashton's laptop (guard line).
   - **The project's own suite:** unit tests, SSRF and XSS tests, every `ship-it-safely` check as a test.
3. Each new check proven red once against its own bug before it is trusted. A skipped job reports SKIPPED, never green.

Tool names above are the council's recommendations. Confirm each is current and fits the stack before wiring it; none of their URLs were fetched in this session.

## Close the deploy bypass (ask in Round 4)

Remote checks guard the merge, not the deploy. A Netlify CLI deploy uploads the working folder and never sees GitHub. Pick one per build:

- **Git-driven deploys:** the host builds production from `main` only. Remote checks then gate production by construction. Best for new builds.
- **Guarded script:** keep the tool's own deploy routine, but it first confirms the working tree is clean, the commit is on `main`, and CI is green for that exact commit; otherwise it refuses. Deploy from a clean export so stray files cannot ship. Best for existing tools like VGA and tAItans.

Either way the deploy is its own step, then verification is its own step.

## Buy, don't write

Before Round 3 closes, list every security surface and who provides it:

| Surface | Default |
|---|---|
| Auth and sessions | The platform's managed auth (for example Supabase Auth), never hand-rolled |
| Row-level access | Database RLS policies, one per use case |
| Secrets | Host environment variables, marked secret, set in both local and production |
| Rate limiting | Durable store or the host's edge rules, never in-memory |
| Email deliverability | The sending provider's domain setup (SPF, DKIM, DMARC) |

Anything hand-written goes on the threat map as a named risk.

## Threat map and the AI pen test

1. **In Round 2,** Claude writes a ChatGPT threat-model prompt from the data map: assets, trust boundaries, who can see what, every input that reaches a model or a fetch. The operator runs it and pastes the attack vectors back (or skips it, and that becomes an OPEN QUESTION).
2. **Claude converts each vector into a test case** in Part 3, with its enforcement point.
3. **Pre-release,** once every required check is green, run a ChatGPT audit against the threat map. Findings are triaged with the IL priority floors: security is P0 minimum, data integrity P1 minimum. Advisory only: it never replaces a gate.

## UX states on the critical path

For each step of the critical path, the brief names observable pass criteria for: loading, empty, error, recovery (what the user does next), and accessibility (keyboard, labels, contrast, 44px targets). Each becomes a Playwright plus axe assertion in the smoke test.

## When a gate gets disabled

The council's test of the whole system: if any gate is switched off under pressure, move that gate to the remote, or stop. Record the disablement as a defect in `docs/qa/`, with the date and why.
