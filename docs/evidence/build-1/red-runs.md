# gate.yml: each required check seen RED once against its own planted bug

Pull request (never merged, closed after Build 1): https://github.com/ashton-netizen/bob/pull/1 · branch `gate-red-tests` · 21 October 2026.

| Check (status context) | Planted bug | Red run (job URL) | Failing line seen |
|---|---|---|---|
| secret scan (gitleaks, full history) | an AWS-shaped access key id in `docs/evidence/red-tests/planted-secret.txt` (random, not a credential) | https://github.com/ashton-netizen/bob/actions/runs/39507437616/job/118919781901 | `RuleID: aws-access-token`, `leaks found: 1` |
| no personal or client data in Claude files | `bob/planted-personal-data.md` holding an example.com email | https://github.com/ashton-netizen/bob/actions/runs/39506182754/job/118915557422 | `bob/planted-personal-data.md:2:contact: ...`, `personal data found in Claude files` |
| no runtime Babel | `docs/evidence/red-tests/planted-babel.html` with `type="text/babel"` | https://github.com/ashton-netizen/bob/actions/runs/39506182754/job/118915557393 | `./docs/evidence/red-tests/planted-babel.html`, `runtime Babel found` |
| plugin validate and test | `plugin-spike/.claude-plugin/plugin.json` truncated (invalid JSON) | https://github.com/ashton-netizen/bob/actions/runs/39506182754/job/118915557446 | `json: Invalid JSON syntax`, `Validation failed` |
| schema and fixtures parse and agree | `fixtures/brief.json` R-AQ-08 set `verified` with no evidence (also voids the approval hash) | https://github.com/ashton-netizen/bob/actions/runs/39506182754/job/118915556976 | `R-AQ-08: verified with no evidence record`, `approval AP-03: brief_hash does not match` |

First run (https://github.com/ashton-netizen/bob/actions/runs/39506182754): the secret scan was red for the WRONG reason, a 403 from the GitHub API (`Resource not accessible by integration`), because the default token could not read the pull request's commits. Fix: `permissions: contents: read, pull-requests: read` on that job. Second run (39507437616) is the one that counts for the secret scan. The action's attempt to comment on the pull request still warns (it would need `pull-requests: write`); the check fails correctly without it.

Unauthenticated `claude plugin validate` and `claude plugin test` ran in Actions with no login and no key (the plugin job reached the validation step and reported the planted error), so the job did not need splitting.
