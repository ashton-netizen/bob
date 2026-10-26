# BOB · Build 4 kickoff: the workspace (proposed 26 October 2026)

Written 26 October 2026 by the consolidation session, from wireframe v1 (approved by Ash by popup the same day, `docs/evidence/design/reset-gap-map-and-wireframe_v1.html`), the gap map on the same page, and Ash's choice to fold the three engine tests into this build (`docs/evidence/experience/`). Builds 1 to 3 built the rules. Build 4 builds what a person sees and touches, so nobody types a command with syntax rules. Typed `/bob` commands stay as a fallback only.

## Inputs Build 4 needs before it starts
- Wireframe v1 approved: done (26 October 2026).
- Kit stage of the engine tests: done. A pane press runs an action and Claude can start a project through a plugin tool, both proven red then green in a throwaway mod (`docs/evidence/experience/spike-kit-run.txt`).
- Live stage of the engine tests: not done. Step 1 below does it inside BOB's own plugin, which loads at session start in this repo, so no mods switch is needed.

## Scope, in order (each ends in a check someone can see)
1. Claude: the three engine tests, live, inside BOB (plugin 0.6.0). Add a tool `start_project` that Claude calls from plain words (Claude chooses the name; the existing `/bob new` logic does the work), a pane Button "Start a project", and a pane Button "Approve" whose handler asks the engine's person check (`$.ui.view`, which answers `not person-initiated` outside the person's own input) before writing an approval, on top of the existing human-origin rule. Tests first, proven red. Check, live in this repo's session: Claude starts a project from Ash's sentence; Claude's own attempt to approve through a tool is refused, the refusal text recorded; Ash's one click approves, the approval record read back. If the person check does not separate a click from Claude, stop and redesign approval before step 3.
2. Claude: Gate B fixed first-in-line. It is skipped while `cc-plugin-sec-default` runs its Stop hook ahead of BOB (seen 25 and 26 October 2026). Move Gate B to an event no other plugin can send past it, or chain it so it always runs. Check: a round that writes a file and records no evidence is blocked in a live session, the block text recorded.
3. Claude: Project home in the pane (wireframe screen 1). The current project, "Start a project", and the other projects as Buttons that switch with one click. Check: a project started from plain words appears; a click on another project makes it current; nothing typed.
4. Claude: Approve by button (wireframe screen 3). "Approve round N" and "Send back with a note" in a "Waiting on you" box, requirement chips by state, "Pause" and "See evidence". Check: an approval made by a click opens Gate A for that round; a send-back writes the note to the ledger and leaves the round unapproved.
5. Claude: Design stage view (wireframe screen 2). The six design-with-bob stages with the current one marked, "Brief so far", review pages opened from Buttons, not file paths. Check: a synthetic project walked through two stages shows both marked done.
6. Claude: no next action asks a person to type. A test fails the build if any next-action text the pane or a command reply produces contains `/bob`. Check: the test is red on today's 0.5.0 wording, green after.

## Not in Build 4
Branding (the wireframe is unbranded on purpose; a mockup approval comes after it is used). The Mags pilot (Build 5, opening with the saved-environment step once Ash's screenshot of Choose environment exists). tAItans adopt and the two spikes (scheduled cloud session, reviewer agent) stay parked. A progress percentage. Client material in this repo.

## Stops
Ash's look at the pane after steps 1, 3, 4 and 5 (one look each, by screenshot or in person). Each approval, by click once step 4 exists. Anything outside this repo. A failed step 1 person check stops the build.
