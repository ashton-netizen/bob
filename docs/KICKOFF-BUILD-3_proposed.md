# BOB · Build 3 kickoff, PROPOSED (not approved; do not paste until Build 2 Part B is closed)

Written 22 October 2026 by the Build 2 Part A session from the plan's "Later" list, the Build 2 kickoff's last line (Build 3 = adopt VGA and tAItans, the bob-design Cowork skill, the Mags pilot) and the Cowork notes of 21 to 22 October (`docs/COWORK-NOTES_2026-10-21.md`, a proposal). Ash needs to: approve the scope below by popup in the session that runs it, after Part B's report. Nothing here is approved.

## Inputs Build 3 needs before it starts
- Build 2 Part B closed: AquaAgent governed on `bob-adopt` or merged, remote checks green, INC-01 done or returned, `docs/handoff.md` updated by the Part B session.
- The Part B lessons: what `/bob adopt` refused on a real proposal, what the first live Gate A denial and Gate B block looked like, and how long steps 7 and 8 took (the rework and briefing-time baseline the plan asks for).
- A decision on `ashton-netizen/bob` public or a read-only token (Part B step 11); Mags needs access either way.

## Scope, in order (each ends in a check someone can see)
1. Claude: `/bob adopt` on VGA, then on tAItans, by the bob-adopt skill. Check: both repos have `bob/` files on a branch, main unchanged, no requirement verified without evidence. tAItans note from MEMORY: its folder is the publish dir, switch to main before any deploy; adopt never deploys.
2. Claude: `bob-design` skill for Cowork: the design room (Capture, Understand, Design, Data, Visible, Challenge and approve) writing `bob/brief.md` and `bob/brief.json` as the one home, review pages as views of brief.json. Calls `build-brief`, never copies it. Check: a synthetic project passes the source, contradiction, version and reopen cases from the pack's defect scenarios.
3. Claude: `/bob new <name>` and the onboarding route (Cowork ADR-03): one saved BOB environment per machine pointing at a workspace root, every project a subfolder the command creates and registers, pane shows the current project. Check: on Ash's Mac, a new project appears in the pane in the next session with no folder picking. UI steps written only from a screenshot of the operator's screen.
4. Claude: per-Stepper stack list (desktop app version, engine floor 2.1.304, git, gh, seat, repo access) as a preflight section that names gaps, never values. Check: preflight test, one failing case per missing item.
5. Claude: rollback rehearsal (pin or uninstall the plugin version in a disposable repo) and the R12 reconcile step after an interrupted run. Check: the DoD standing line "rollback rehearsed" ticks with evidence; a run left `running` reconciles to `failed` or `completed` with a reconciled event.
6. Spike, before any commitment: one scheduled cloud session on a repo carrying BOB. Observe whether `enabledPlugins` loads the plugin and whether Gate A and Gate B fire. Check: a recorded yes or no with the run URL; R21 moves only on a yes.
7. Spike: profile agents (bob-reviewer first: the Karpathy and Bach passes returning PASS or FAIL per DoD line as evidence records). Check: a review run on Build 2's own diff produces evidence records, not prose. bob-builder and bob-designer stay out until the reviewer has run once.
8. The Mags pilot kickoff: opens with the one-time environment setup (step 3), then one real project chosen with Mags. Check: the plan's trailing target, zero missing-requirement rework incidents by 30 November 2026, has a baseline from Part B to be judged against.

## Not in Build 3
Native voice, broad connectors, RAG, hosted multi-user, Word or PDF or Slides renderers (R21 or shelved). A progress percentage. Any client material in the BOB repo.

## Stops
The pane look on each adopted repo, each `/bob approve`, the public-or-token decision if still open, the Mags screenshot before any UI step is written, and any action outside the repos named.
