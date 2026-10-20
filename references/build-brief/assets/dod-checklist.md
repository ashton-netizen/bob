# Definition of Done · [project name]
From: [Brief file, version] · Reused unchanged in Verify mode. Never edit a line to match the build.

Each line is tickable yes or no on the live product. Write it as Given / When / Then, where Then is visible from outside. Each line names its enforcement point from Part 3 of the brief; a line with none is unfinished.

## The build-specific lines (from Block 3)
- [ ] Given [starting state], when [a stranger does X on the live URL], then [they see Y].
- [ ] ...
- [ ] Success criterion: [number] by [date] · measured at [where]

## Standing lines (keep the ones that apply, mark the rest N/A with a reason)
- [ ] Branch protection on main; secret scan, dependency audit, static analysis and critical-path plus axe checks are required and green.
- [ ] The deploy path cannot skip the remote checks (git-driven deploy, or a guarded script).
- [ ] Critical path passes its loading, empty, error, recovery and accessibility states.
- [ ] Every threat-map vector has a test; the AI pen test ran after all checks were green.
- [ ] No `--no-verify` and no disabled gate since the brief was signed.
- [ ] Works in a private window AND in a browser with saved state from the previous version.
- [ ] Works at 375px and 1440px; tap targets at least 44px.
- [ ] Every key present by name in local AND production; none in the browser bundle, repo or chat.
- [ ] Browser code is plain JavaScript; no runtime Babel.
- [ ] Daily spend ceiling enforced before the call, watched refusing.
- [ ] Rate limit watched refusing, and it survives a cold start.
- [ ] User-supplied URLs: internal and metadata addresses refused, including after a redirect.
- [ ] User and model output rendered encoded; a payload test was seen to fail when encoding was removed.
- [ ] Prompt cache confirmed hitting (non-zero cache-read tokens) on every Claude call that claims it.
- [ ] Test, internal and outreach records flagged at creation and excluded from public numbers.
- [ ] Every fire-and-forget action (lead, email, webhook) logged and alerting on failure.
- [ ] Every guard and list has one home; no second copy found.
- [ ] Each new test was seen to fail on its own bug before being trusted.
- [ ] No skipped suite reported as a pass.
- [ ] ship-it-safely run: [installed and run / by hand / not run].
- [ ] Deployed artefact matches source (hash or marker), not just a newer timestamp.
- [ ] Handover page live: what's live, jobs, key names, test modes and how to switch them off.
- [ ] Rollback steps written and rehearsed once.
- [ ] Agents (if any): never-list enforced by tool permissions, not prose; every run logged.

## Workflow lines (from The Other 50%, apply to any build that automates a process)
- [ ] The seven elements are written down and each has a named owner: trigger, inputs, decision, routing, output, delivery, measurement.
- [ ] Every step is labelled Human, Machine, or Human checks machine. No step is unlabelled.
- [ ] New Hire Test: someone who has never seen the process ran it from the written steps alone and got the same output.
- [ ] Measurement names one outcome the workflow moves, with a number and a date, and says where it is read.
- [ ] Rung on the book's five-rung ladder is stated: 1 packaged AI, 2 wired workflow, 3 decisions, 4 agent, 5 production. The build does not claim a higher rung than it was tested at, and stops at rung 1 or 2 unless volume and value justify more.

## Weekly check (after launch)
- [ ] Once a week: what shipped that would not have shipped without AI, and which outcome did it move? A week with no answer is logged, not skipped.
