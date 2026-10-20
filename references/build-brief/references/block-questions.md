# Block questions: deeper probes

Read before Block 1. The SKILL.md table holds the core questions. These are the probes to pull when the build's shape makes them relevant. Each is tagged with where it came from:

- **[IL]** Infinite Leverage (Edge8) skills and rules
- **[VGA]** Value Gap Audit build history
- **[TAI]** Battle of the tAItans build history
- **[EXT]** outside best practice (sources in `sources.md`)
- **[SC]** Step Change operating rules (Global/CLAUDE.md)

Ask in rounds (see SKILL.md, The operator's clock), up to four per round. Push back once on a vague answer with "Can you give me a concrete example?" [IL]. Still vague: OPEN QUESTION. Anything the repo, live asset or an existing plan already answers is pre-filled, not asked.
- **[BOT]** Battle of the tAItans council verdict, 2 October 2026 (enforcement over interview)

---

## Block 1. Result and owner

- What is broken today, step by step, and where exactly does it break? Give one real example from the last 90 days. [IL] [zip draft]
- Who specifically suffers? What have they already tried and rejected? [IL]
- In one sentence, what does this do for them? If they read only that sentence, do they know the bet we are making? [IL]
- What do they hire this to do, and what do they fire when they adopt it? [IL]
- Name three anti-personas: who this is explicitly not for. [IL]
- Who owns it after launch: fixes it, pays for it, answers when it breaks? A person, not a team. [Framework]
- What already works that this must not break, duplicate or confuse (a CRM, a weekly ritual, a manual check that keeps data clean)? How does this sit beside it: on top, read-only, replace with a migration plan, or separate? [zip draft]
- What must it not look or sound like? [SC RAM-plus-the-negative]
- Will people actually use it (value), can they figure it out (usability), can we build it with the time and skills we have (feasibility), does it work for the business (viability)? Which of the four is the biggest risk? [EXT Cagan]

## Block 2. Prototype or system

- Database, login, review step, owner: four yes/no answers. Any no means it is a prototype. Say so in the brief. [Framework]
- What is the appetite in days? What gets cut to fit it, rather than what gets added to the timeline? [EXT Shape Up]
- What is explicitly a no-go for this build? [EXT Shape Up]
- What are the rabbit holes we already know about? [EXT Shape Up]
- Which 2 or 3 assumptions, if false, sink the whole thing? How could each be falsified inside 90 days? [IL]
- Imagine it is 90 days out and this failed. What are the most likely reasons? (Pre-mortem.) [EXT Klein]
- Is this a workflow with predictable steps, or a genuine agent? Prefer the simplest thing that works. [EXT Anthropic]
- Which framework does this stand on? "I need to [task]. Teach me [Framework] from [University]." Name it in the plan so QA can test against it. [IL 10]
- What already exists that does something like this (this repo, 8 Edges, another Step Change repo)? What do we reuse, adapt, or build new? [IL Block A]
- Epic size check: is Build 1 a 3 to 7 day epic made of 30 to 90 minute tasks? Bigger means two epics. [IL 09]

## Block 3. Definition of Done

- What can a stranger, in a private window, on a phone, do on the live URL that proves it works? [Framework]
- Write each check as Given / When / Then, where Then is something you can see from outside (a page, a message, an email), not a row buried in a database. [EXT Gherkin]
- Success criteria: 1 to 3, each with a number and a date. One leading signal, one trailing. Not signups, MAU or session length. [IL] [Framework]
- Build 1: the smallest loop that proves the whole thing end to end. Every step ends in a check someone can see. [Framework] [zip draft]
- Later: everything else, named. Deliberately not building: anything that is not load-bearing. [zip draft]
- Must-never-break journeys, ranked by business risk. [zip draft]
- For each step of the critical path: what does the user see while loading, when empty, on error, and how do they recover? Keyboard, labels, contrast? Each becomes a Playwright plus axe assertion. [BOT]
- Which DoD lines are enforced by a required check, which by a test, and which only a human can see (I CHECK THIS)? [BOT]
- Every promise the product makes to a user ("we never train AI on your data", "unsubscribe works", "your report is private"): which test proves the code keeps it? [zip draft]

## Block 4. Architecture and keys

- Local file, hosted static, or hosted with a backend? Present all three with trade-offs and let the operator pick. Anything needing a key defaults to a hosted backend with the key in an env var. [SC]
- Name every key. For each: where locally (`.env`, gitignored), where in production (host env var), and who can rotate it. [Framework]
- Any key with a public prefix (for example `NEXT_PUBLIC_`) is in the browser bundle. Is any secret headed there? Is a Supabase service-role key anywhere near the client? [EXT Next.js, Supabase]
- What is the publish root, and what else sits in that folder? A CLI deploy uploads the working directory, not what git tracks; gitignore does not stop a file shipping. [TAI] [VGA: only `public/` is served]
- Plain JavaScript in the browser? No `type="text/babel"`, no runtime transpile. [SC]
- What security are we buying rather than writing: auth, sessions, RLS, secrets, rate limiting? Anything hand-written goes on the threat map. [BOT]
- New repo, project, database and site names: confirmed unused, read back after linking? Never re-point an existing Netlify site. [zip draft] [EO brief]
- Single source of truth: which file owns each list (models, prices, domains, guards)? Is there a second copy anywhere? [TAI KNOWN_MODELS] [VGA _domains.js, _url.js]
- What happens on a gateway timeout? Our own bounded error, or a bare 504 the page cannot explain? [TAI]
- Nested clocks: worker, status poll and host kill. Which fires first, and what does the user see? [VGA]

## Block 5. Data and privacy

- What personal information is collected? Is each field reasonably necessary, or merely convenient? [EXT APP 3]
- Is a collection notice live at the point of capture? [EXT APP 5]
- Does any data leave Australia (LLM provider, US database region)? What steps were taken? [EXT APP 8]
- Retention: when is it deleted or de-identified, and by what mechanism? [EXT APP 11.2]
- Does it score, rank or qualify people automatically? From 10 December 2026 the privacy policy must disclose the kinds of decisions made. [EXT OAIC]
- How are test, internal, outreach and event runs flagged **at creation** (a `source` or `is_internal` column), so public counters and benchmarks exclude them by rule, not by hand? [VGA run source] [IL W1]
- Row-level security on every exposed table? Has anyone tried to read another user's row with the public key? [EXT Supabase]
- Can any record be overwritten by someone holding a share link? Should finished records be immutable? [VGA]
- Any reader that counts rows: does it page past the host's row cap (Supabase returns 1,000 by default)? [VGA]
- Can synthetic rows be deleted by one command? Does the seed refuse to run twice without `--reset`? [zip draft] [IL Block V]
- Threat map: assets, trust boundaries, who can see what, every input that reaches a model or a fetch. Claude drafts a ChatGPT threat-model prompt; the operator runs it and pastes back the vectors; each becomes a test. [BOT]

## Block 6. Cost and abuse

- True cost of one run, measured from the provider, not the number on screen. [TAI on-screen cost under-reported]
- Daily ceiling: reserved at worst case **before** the call, settled after, metering every retry and fallback. Atomic or not? Say so plainly. Provider-side hard caps are the real backstop. [TAI ship-it-safely 5]
- Who can trigger spend? Public, password, logged-in? Per-IP and per-user rate limits that survive a cold start (an in-memory map does not). [VGA]
- Input caps: file size, image count, document length. Is a clip signalled to the user, or silent? [TAI docClipped] [VGA image cap]
- Does it fetch a URL a user supplies? Block private, loopback and metadata ranges after DNS resolution, re-check where every redirect **lands**, and cover headless browsers too. Keep a must-pass list so the guard does not over-block. [VGA SSRF] [EXT OWASP SSRF]
- Does it render user or model output? Treat model output as untrusted: encode it, fence it at every model-to-model hop. [VGA XSS] [TAI untrusted()] [EXT OWASP LLM05]
- Prompt caching on every Claude call: the breakpoint sits on a prefix that is identical across requests, with no timestamp, user input or shuffled order inside it. Is the prefix above the model's minimum cacheable length (512 to 4,096 tokens, by model)? Below it the cache silently does nothing. Confirm with non-zero cache-read tokens. [VGA voice prompt no-op] [TAI shuffled lenses] [EXT Anthropic]
- Excessive agency: what can the model do after reading untrusted content? [EXT OWASP LLM06]

## Block 7. Brand and design

- Step Change brand: `scm-design-skill` owns palette, type, logo and image library. Never restate them in the brief. [SC]
- Client brand: are the real logo files, fonts and licences in hand? Never approximate a font or logo. [Framework]
- Is a wireframe approved? A mockup? By whom? [Framework]
- A reskin re-skins the storytelling; it never deletes it. What on the current version is the magic that must survive? [TAI]
- Phone width 375px and desktop 1440px, tap targets at least 44px tall. [zip draft]
- Does the PDF or export use the same fonts as the web view? [TAI]

## Block 8. Delivery flow

- Which branch? Never main. [IL] [SC]
- Greenfield (nobody uses it yet) or a live product? Live means every change goes to a preview first and is reviewed there. [IL Block A]
- Is branch protection on, and are secret scan, dependency audit, static analysis and the critical-path check required? [BOT]
- How does a deploy actually happen? A CLI deploy from the laptop skips every remote check; choose git-driven deploys or a deploy script that refuses unless CI is green on this commit. [BOT, defended against VGA's npm run deploy]
- Parallel work: one worktree and one branch per build, conversations named date - repo initials - task, merge one at a time. [IL 11]
- When do we call an engineer? Same error unchanged for 30 minutes, about to bypass a security rule, production down, unsure a command is safe. [IL 04]
- Who reviews? Cap any review at 8 items; the rest go to Later. [IL W3]
- Is the gate a command or a hook (pre-commit, pre-push, deploy script), not a paragraph? "A rule in prose fails silently, a gate fails loudly." [VGA] [IL]
- Is `ship-it-safely` installed? If not, the brief says so and its checks run by hand, reported as hand-run. [TAI]
- Preview first, smoke test there, then production. Does the preview share production storage (Netlify Blobs does)? [TAI]
- Keys in both places: local and production. After any env change, a redeploy, then watch the old value fail. [Framework] [TAI password rotation]
- Deploy as its own step, never chained behind slow network calls. Then verify as its own step. [TAI]
- Does the deploy depend on `npm install` having run locally? [TAI]
- Grep for key prefixes before every deploy. [IL W5]
- Are fonts and other assets present in CI, or will checks false-fail there? [VGA]

## Block 9. Agents and automation

- Trigger: what starts it? Context: what does it read? Instructions: where do they live? Tools: least privilege, named. Log: where does every run land? Rhythm and cost per run? [Framework] [zip draft]
- For each step: AI on its own, AI drafts for a human to approve, or never AI? [zip draft]
- Never list, written down: no customer email without a human click, no deletes, no writes to a live system unattended, no action on test records, no spend without approval. [Framework] [IL W4]
- Maximum iterations and a stopping condition? [EXT Anthropic]
- A scheduled run's recommendation to itself is a note, not a change. Who acts on it? [SC]
- Agent files: are persona overrides filled in, or still "(e.g. ...)" templates the agents are told to read? Do they assume Vercel when the project is Netlify? [TAI] [VGA]
- Are the agents actually registered in the session that will use them? (IL agents load only in a Claude Code session opened on that repo, after a restart.) [TAI]

## Block 10. Handover and kill criteria

- Handover page: what is live, scheduled jobs, env var NAMES only, test modes and how to switch each off, next steps. [Framework] [IL W2]
- `docs/handoff.md` in four parts: summary, the five biggest active decisions with rationale, known landmines, what the next person should do. Written as you go, tested on a fresh session. [IL 18]
- Kill criteria as states and dates: what measurable condition, by what date, makes us stop or pivot? Agreed now, before sunk cost. [EXT Duke]
- Rollback: the exact steps, and has anyone rehearsed them? [EXT Google SRE]
- Silent failures: anything fire-and-forget (a lead to a CRM, an email, a webhook) is logged, alerts someone when it fails, and is reconciled on a schedule. [zip draft]
- Who is the single point of failure today? What does the handover let someone else do without them? [IL W2]
