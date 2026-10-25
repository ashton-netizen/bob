# BOB, governed by BOB

The brief for fixing the BOB experience, written in the BOB design room from Ash's own words (S-01), the corrections log (S-02), the landmines (S-03) and the Build 3 kickoff (S-04). Brief version: the hash in each review page.

## Who
- Ash first, then Mags: a non-technical operator who wants to see where a build is and move it on in one action, without a terminal and without reading logs. [owner instruction, S-01 lines 2, 8, 9; S-04 scope item 8]

## Job
- Know, at a glance, what is built, what is live, and the one next step with its owner. [owner instruction, S-01 lines 2, 8, 9]
- Say yes or no to a build increment once, in one place, and have the build obey. [source claim, S-03 "Approval route proven live"]

## Change
- Today's experience is "scattered and confusing" and "bloody awful" (S-01 lines 2, 10). The change: BOB's own build runs under BOB, so Ash sees state without asking, is asked once per decision, and never types a command into the wrong window. [owner instruction, S-01 lines 2, 5, 9, 10]

## Today
- Reports arrive as streams of pull request numbers, check counts and scoreboards; Ash asks "where are we at" four times in two days. [source claim, S-02 all four lines; S-01 lines 2, 8, 9]
- A typed /bob command in a session where the plugin is not loaded does nothing and says nothing. [source claim, S-01 line 4; S-03 "THE PICKER EATS"]
- Two typed commands per repo arrive as four to six separate stop-start messages across two windows. [source claim, S-02 line 2]
- BOB's own repo has a ledger but no brief, so BOB's gates idled on BOB's build all week; nothing forced evidence or visibility. [AI suggestion, from bob/ledger.json and the absence of bob/brief.json on main 3077a08]
- The design room and the workspace command exist but nobody has used them. [AI suggestion, docs/project-status.md Build 3 log]

## End game
- Ash opens one page or one pane and knows the state of any BOB-governed build, and every BOB session ends with three lines and one owner-named next step. Mags completes one real project under BOB with zero missing-requirement rework by 30 November 2026. [owner instruction, S-01 line 10; source claim, S-04 item 8]

## Constraints
- Plugin only: no app, no server, no keys, no paid calls. [source claim, S-04 "Not in Build 3"; S-03 "What is live"]
- A person types /bob commands; the engine refuses them from Claude. [source claim, S-03 landmine "/bob <command> is typed by a person"]
- A plugin only acts in the session it is loaded in. [source claim, S-03 "RELATIVE PATHS", S-01 line 4]
- The never-ever list in references/build-brief/SKILL.md. [owner instruction]

## Outputs
- bob/brief.json, bob/ledger.json increments, docs/status.html for the BOB repo, and a three-line report at the end of every BOB round. [AI suggestion]

## Requirements
- R-bob-00 MUST: the BOB repo is BOB-governed (bob/brief.json exists, main unchanged until approved). Check: Gate A refuses an unapproved write in a session on this repo. not_assessed.
- R-bob-01 MUST: every BOB round ends with a report of at most three lines (stage, live, next step with its doer) before any detail. Check: a round whose closing report breaks the shape is blocked at Stop with the shape named. not_assessed. S-01 lines 2, 9; S-02.
- R-bob-02 MUST: each decision for Ash is asked once, as one popup, in the window that will run the answer, and the ask names that window. Check: the VGA and tAItans adoptions each cost Ash exactly two typed commands and no retry. not_assessed. S-02 line 2; S-01 lines 3, 5.
- R-bob-03 MUST: a /bob command typed in a session where the plugin is not loaded is answered with the window to use. Check: typing /bob status in a Code tab session on a non-BOB folder returns one line naming the workspace session. not_assessed. S-01 line 4. (Mechanism open: a plugin cannot answer where it is not loaded; candidates are a user-level instruction line, or the parent session relaying; see Unknowns U-01.)
- R-bob-04 MUST: a session on a governed repo opens with the board visible (pane drawn, docs/status.html written and its path in the first message) before any question is asked. Check: the first assistant message of a session on ~/BOB or VGA names docs/status.html. not_assessed. S-01 lines 6, 7, 8.
- R-bob-05 MUST: /bob adopt accepts a repo that already holds bob/ledger.json, merging the proposal's increments and never overwriting a record. Check: adopt on this repo writes bob/brief.json and appends increments, with every existing ledger record byte-identical. not_assessed. S-03 (adopt refuses existing files); this brief's own wrinkle.
- R-bob-06 SHOULD: after /bob approve, the pane and the page show the approver and the time within the same turn. Check: the page's APPROVAL field names the AP record. not_assessed. S-03 "Approval route proven live".
- R-bob-07 SHOULD: the design room's first run in Cowork is recorded with what Ash saw and disliked, as sources for the next increment. Check: a sources/ file from that run exists. not_assessed. S-01 line 6.

## Conflicts
- C-01: S-01 line 1 asks for "this amazing interface"; S-04 and the product plan put a branded look after a mockup approval and list it under Later. Resolved on 23 October by building the board page (PR 22) after the wireframe was shown; recorded here because the plan text still says Later. Ash needs to confirm the plan's Later list is updated, or that the page counts as the mockup approval.

## Unknowns
- U-01: how a session where BOB is not loaded can answer a /bob command (R-bob-03). AI-proposed default, marked as such: one line in the user-level CLAUDE.md ("a /bob command typed here does nothing; type it in the session on the project folder") until the engine offers a global command. Mags needs it before the pilot.
- U-02: whether a Stop hook can read the closing report to enforce R-bob-01. AI-proposed default: the classic Stop event carries transcript_path; the hook reads the last assistant message. To be proven red then green in INC-01.
