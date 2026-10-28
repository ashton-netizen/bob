# Post-mortem: why fourteen builds produced the wrong thing

Written 29 October 2026 in the BOB reset window, from Ash's own words in the corrections log (18 BOB lines, 20 to 29 October 2026), BOB's own records, the reconcile and the code inventory. Each cause was tested against evidence; none is assumed. Each cure is a BOB requirement with a live check, written into bob-demo's brief as requirements R-bob-demo-15 to R-bob-demo-18 (ids for the files only).

## The five causes, tested

### 1. Rules for the builder were switched on before there was a product to see. CONFIRMED.
Evidence: Build 1 (20 to 22 October) shipped Gate A, Gate B, the state guard and the preflight; the first experience wireframe is dated 26 October (docs/evidence/design/reset-gap-map-and-wireframe_v1.html); Ash on 23 October: "from what I can see, Bob isn't built, and getting here has been an absolute nightmare"; on 26 October: "This is the whole reason that we built BOB: to stop this weird Ash needs to type this". The reconcile shows the same shape today: the three fully covered requirements are all gates; the two Ash cares about most (the map, the schematic) are missing.
Why it happened: the 20 October build brief put "prove the loop" (gates in a disposable repo) as Build 1 and the friendly front under "Later". The tAItans council verdict "enforcement over interview" was read as "enforcement first".

### 2. Ash was asked to type or click with no plain-words reason, across many windows. CONFIRMED.
Evidence: five typed attempts at `/bob adopt` and an hour lost (21 October, the picker ate the command); four popups in one build (21 October, "I'm getting so sick of all the approval"); "why you keep popping up with silly requests" (22 October); 13 sessions and 22 branches at the worst point, "like spaghetti" (26 October); a terminal command pasted into chat then a typed approval, "Oh my god, this is so confusing" (27 October). Four places in the current code and skills still tell a person to type a command (reconcile section C).
Why it happened: the plugin's own engine only accepts a person's typed command or click as an approval, and every build took the typed route first because it existed. Each new piece of work got a new window because the rule "one home per list" was prose, not a mechanism.

### 3. Status reports were written for engineers. CONFIRMED and still true in the code.
Evidence: "I am very confused. Where are we at?" after a scoreboard table with pull request numbers (23 October); "scattered and confusing" after a stream of check updates (22 October); the closing report with run ids and evidence paths, "I'm so confused. how can we get this back on track?" (22 October). The inventory (section 3) finds requirement ids, increment ids, approval ids and hashes in the pane headings, chips, refusals, the map's round line and the status page rows, placed there on purpose.
Why it happened: the records use ids (rightly, for the files) and the pages were rendered from the records with no translation layer. The three-line report rule arrived on 22 October as a correction and only became a check (reportCheck) on 29 October.

### 4. Work stopped on a next step Claude could have taken, and an approval landed on an idle window. CONFIRMED.
Evidence: Ash's approval AP-02 on bob-demo landed at 22:27Z on 28 October, after the BOB window had ended its turn at 22:26Z; nothing started; "Once again we've stopped. There isn't a pop-up ... another failure in progression" (29 October). The 0.13.0 fix (Approve submits a prompt that starts the work) is tested, not seen live.
Why it happened: the engine has no way to wake a window; a turn that ends is over. Claude also closed turns on "next: Claude does X" lines because the three-line shape allowed a Claude-owned next step.

### 5. "Done" meant tests pass. CONFIRMED (added by this reset; not in the hand-over's list).
Evidence: 89 of 89 tests pass; BOB's own ledger has 12 of 19 promises verified, almost all by test; the handoff file records "built, never seen" or "NOT seen live" against the pane redraw, the start-from-plain-words route, the Project home, the design room, Approve-starts-work and the idle rule. Ash on 28 October: "no schematic or progress map, no buddy".
Why it happened: the state table lets a requirement reach verified on a tool-origin evidence record (a test result). Nothing distinguishes a promise about what a person sees from a promise about what the engine refuses.

## The cures, as BOB requirements with live checks

| Cure | Requirement (bob-demo id) | Live check |
|---|---|---|
| Never asked to act without a button and a reason | R-bob-demo-15: BOB never asks a person to type, paste or hunt for anything; every ask is one pane button with one plain-words line, or it is a BOB bug | A plugin test fails on any person-facing string that asks to type; a live session ends with zero typed asks, read from the ledger's events |
| Show, don't tell | R-bob-demo-16: every round ends by republishing the map and giving its link as the "live" line of the three-line report | The report check refuses a closing report without the map link; Ash opens the link |
| Plain words only | R-bob-demo-13: nothing a person reads carries a requirement code, increment number, approval number, hash or pull request number | A plugin test greps every pane string, the map and the status page for those patterns; Ash reads them and finds none |
| Never stop on a Claude step; approval starts work | R-bob-demo-17: a round never ends on a next step whose doer is Claude, and an approval starts the work in the same minute | The report check refuses a closing report whose next step is Claude's; a click is followed by a started event in the ledger within a minute |
| Seen before done | R-bob-demo-18: a promise about what a person sees is proven only by a person's own look (a human-origin evidence record), never by a test alone | The state guard refuses verified on a face requirement without a human-origin evidence record |

Cause 1 (rules before product) has no single requirement; its cure is the order of the two phases: phase one is "a working look", and nothing else is approved before Ash has seen it.

## What this reset itself must not repeat
- One window (this one). No side sessions unless Ash asks.
- Every page Ash reads is published and looked at before it is linked.
- Every correction is logged the same turn.
