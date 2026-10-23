# Readiness (view of bob/brief.md, version dae4289451e7)

build-brief, Check mode, run by Claude on 23 October 2026 with zero operator minutes: every answer comes from the four sources or the repo. Build type: Claude Code plugin plus Cowork skill, so Blocks 1, 2, 3, 5, 8, 9, 10 apply, 7 applies (the board page carries the brand), 4 and 6 do not (no key, no paid call).

## Verdict: REVISE
No Stop-if is open. INC-00 (govern) may start on Ash's approval; INC-01 may start once OQ-1 is answered. Operator time used: 0 of 60 minutes.

## Stop-if table
| Block | Stop-if | State |
|---|---|---|
| 1 Result and owner | nobody owns it, or the result is an activity | clear: Ash owns BOB after launch (product plan); the result is "Ash asks where are we at zero times" |
| 2 Prototype or system | a no treated as live | clear: plugin, no database, no login; review step is /bob approve by a person |
| 3 Definition of Done | a line that cannot be ticked on the live thing, or has no enforcement point | clear for R-bob-00, 01, 02, 04, 05, 06; R-bob-03 and R-bob-07 have checks but their mechanism is open (U-01, no enforcement point yet): REVISE |
| 5 Data and privacy | test data indistinguishable from real | clear: every record is_synthetic false; fixtures/ is the only synthetic home; sources hold Ash's words only, no client data |
| 7 Brand | assets missing or design not approved | clear on assets (real mark and fonts, nothing redrawn); approval: C-01 open, see OQ-2 |
| 8 Delivery | edits main, deploys around checks | clear: branch bob-on-bob, pull request, five required checks, docs/status.html gitignored |
| 9 Agents | unattended action on a live system | clear: no agent; every /bob command is typed by a person |
| 10 Handover and kill criteria | no kill criteria or no rollback | clear: docs/handoff.md live; rollback rehearsed 22 October; kill criteria in the product plan Part 0 |

## Block scores
1 ✓ · 2 ~ (appetite not stated: OQ-1) · 3 ~ (one leading criterion added below; two mechanisms open) · 5 ✓ · 7 ~ (OQ-2) · 8 ✓ · 9 ✓ · 10 ✓

## Success criteria (Block 3)
- Leading: in the next two BOB sessions Ash asks "where are we at" or "what's happening" zero times (count in the transcripts). Owner: Claude counts, Ash judges.
- Trailing: Mags completes one real project under BOB with zero missing-requirement rework by 30 November 2026 (product plan, unchanged).

## Omissions, contradictions, assumptions, risks, complexity
- Omission: no appetite in days for the BOB-on-BOB fixes (OQ-1).
- Contradiction C-01: the product plan lists a branded look under Later after mockup approval; the board page shipped 23 October after the wireframe was shown. The plan text is stale either way (OQ-2).
- Assumption A-01 (a Stop hook can read the closing report) is load-bearing for R-bob-01: falsified inside INC-01 by writing the test first.
- Assumption A-02 (a user-level instruction line answers a /bob command where BOB is not loaded) is weak: prose, skippable. Risk accepted for the Mags pilot only if no engine route exists; named as such in the handoff.
- Risk: adopt refuses this repo (existing ledger), so INC-00 is governed by hand-written bob/brief.json; R-bob-05 closes the gap for the next repo.
- Unnecessary complexity: none found; eight requirements, two increments.

## OPEN QUESTIONS (owner)
- OQ-1 (Ash): appetite for the BOB-on-BOB fixes, in days. Recommended: 5 days, INC-01 first.
- OQ-2 (Ash): does the board page count as the mockup approval the plan requires, so the plan's Later list is updated? Recommended: yes.

## Reopened
None: no approval exists yet.

## Next action
Ash needs to: open a new Code tab session on this folder and type /bob approve INC-00. Claude then runs INC-01 under Gate A and Gate B.
