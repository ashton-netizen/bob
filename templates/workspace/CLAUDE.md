# BOB workspace

This folder is a BOB workspace, one per machine. Each subfolder is one project. `bob-workspace.json` registers the projects and names the current one. The BOB pane shows the current project.

Written once by `/bob new` from the BOB plugin's template. BOB never overwrites it; edit it freely.

## For Claude, every session
1. Read `bob-workspace.json`. The current project is the entry whose `name` equals `current`. Work only inside that folder. Never edit another project's files.
2. Never edit `bob-workspace.json` by hand. `/bob new <name>` and `/bob switch <name>` are its only writers, and a person types them.
3. Run git and every build command inside the current project folder (`git -C <project> ...`). The workspace itself is not a git repo and never becomes one; each project is its own.
4. Then follow the project's own files: `docs/project-status.md` first, then `bob/brief.md` or `docs/product/product-plan.md` where present.
5. No project yet, or a new idea: the person types `/bob new <name>` (lowercase letters, digits and hyphens). Another project: `/bob switch <name>`.
6. A project with no `bob/brief.json` is not designed yet. Design it with the design-with-bob skill; then the adopt-under-bob skill writes the proposal, the person types `/bob adopt`, then `/bob approve INC-00`.

## Every session and every decision (R-bob-04, R-bob-02)
- The first message of every session names the board and the map for the current project: `docs/status.html` and `docs/map.html`, with one line saying how many promises are proven and the next step with its doer. Say it before asking anything.
- Each decision for the person is asked once, as one popup, in the window that will run the answer, and the ask names that window. Never ask the same thing again.

## House rules
- Name the doer on every action line: "Claude" or "<the person's first name> needs to".
- Plain Australian English. Headline first. No em-dashes.
- Client material stays inside its own project folder. No key or password in any file, log or chat.
- No state comes from prose: a requirement moves past "reported" only with an evidence record.
