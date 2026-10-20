# Lessons library: what actually broke

Step Change's own builds, sanitised. No keys, no client names, no live figures. Each lesson names the block that should have caught it and the rule it became. Use these as the "for example" when pushing back on a vague answer; they are more persuasive than a generic warning.

Refresh rule: add a lesson only when a real build hit it and the fix was confirmed working. Dated facts (model ids, prices, line numbers) do not belong here; they go stale.

## The pattern behind almost all of them

**A failure that reports itself as a success.** A control that was written but never watched working. A comment above the code describing protection the code did not provide. A deploy log saying one thing while the user's browser did another. Every block exists to make one of these visible before a user finds it.

## Block 1 and 2. Result, owner, prototype or system

| What happened | Rule |
|---|---|
| Advice on a live tool ran off an old version of it, because a static brief was read instead of the live asset. | Open the live URL and handover before advising. |
| A reskin, briefed with no reference to what was working, deleted the hero storytelling and replaced it with text tiles. | Block 1 names what already works and must survive. |
| A tool was built, hardened and then parked as an internal tool once its moat was scored at 2 of 10 as a product. | Block 2 asks whether it is a product at all before the hardening spend. |

## Block 3. Definition of Done

| What happened | Rule |
|---|---|
| A model change was reported live by grepping the served HTML. Every returning browser had a saved setting pinning the old model, for weeks. | DoD checks run the way the operator touches it: private window AND a browser with saved state. |
| A panel was rebuilt and reported done. The operator was looking at a second, separate panel that was untouched. | Count the implementations before calling a UI fix done. |
| "2 of 6 reads landed" displayed in the same green as 6 of 6. An empty read was reported as landed. | A partial result is a DoD failure, and must look like one. |
| A report section failed, was silently dropped from the PDF, and the download still said success. | Every promise the output makes has a named failure state. |

## Block 4. Architecture and keys

| What happened | Rule |
|---|---|
| A CLI deploy shipped agent files and docs because the publish root was the whole folder. Gitignore did not stop it. | Name the publish root. Serve only a `public/` folder, or deploy from a clean export. |
| A reasoning clamp existed as four separate regex copies; a new model id matched none of them. | One definition per rule, asserted by a test on the payload that leaves the building. |
| An SSRF guard had a second hand-rolled copy that skipped every private-range check. | One shared guard module, imported everywhere. |
| A list of test domains drifted between the public counter and the usage report. | One list, one file. |
| The function source existed on one laptop only, because the host's downloadable deploy excludes functions. | Git from day one, with an identity configured. |

## Block 5. Data and privacy

| What happened | Rule |
|---|---|
| Team prospecting runs made up over half of all runs and inflated the public counter and the benchmark. | Flag internal, outreach and event runs at creation with a source column. Exclude by rule. |
| Counts, benchmarks and stats were silently reading the first 1,000 rows. | Every reader pages. |
| A report record could be overwritten by anyone holding its link. | Finished records are immutable. |
| One visitor could be served a verdict based on another visitor's uploaded document, because cache keys counted images instead of hashing them. | Cache keys hash the inputs that change the output. |

## Block 6. Cost and abuse

| What happened | Rule |
|---|---|
| An in-memory rate limiter reset on every cold start. It deployed clean and enforced nothing. | Rate limits live in durable storage and are watched refusing. |
| A token ceiling was present in the source and skipped at every call site. A source-reading test passed. | Ceilings are assigned unconditionally; tests call the handler. |
| A competitor URL redirected to an internal address and was read. Headless Chrome bypassed the guard entirely. | Re-check where every fetch lands, on every route, including the browser path. |
| An encoded loopback address (`::ffff:127.0.0.1`) slipped past a dotted-quad match. | Test the guard with encoded forms, not just the obvious ones. |
| A private-range block over-blocked a whole hosting provider's customer sites. | Keep a must-pass list beside the deny list. |
| The on-screen run cost under-reported by roughly 23x because only one provider returned a cost field. | Cost is measured server-side and reconciled, never read off one provider's field. |
| A prompt-cache marker sat on a prompt below the minimum cacheable length: no error, nothing cached. Another sat on a prefix that was shuffled every run. | The cached prefix is static and above the model's minimum; confirm with cache-read tokens. |
| A split stream frame triggered a second full paid read; the user saw the answer twice. | Judge "did content arrive" on the accumulated stream, not one chunk. |

## Block 7. Brand and design

| What happened | Rule |
|---|---|
| A supplied logo SVG used classes with no style block, so it rendered invisible on a dark hero. | Real assets, checked rendered on the real background. |
| The web view used one display face and the PDF another, because only one format of the font existed. | Name every surface the brand must hold on, including exports. |

## Block 8. Delivery flow

| What happened | Rule |
|---|---|
| The project file said "run ship-it-safely" before every deploy. It was not installed. Six production deploys went out with the checks run by hand. | A gate is a command or a hook that exists. Verify it is installed. |
| A batch of env reads, curls and a production deploy ran past its window. The deploy was dropped; everything before it reported fine. | Deploy as its own step, then verify as its own step. |
| A password was rotated in the host's env. The old one still worked until a redeploy. | Env changes need a redeploy, then watch the old value fail. |
| Listing env vars with a "plain" flag dumped live production keys into a session transcript. | Read names only. Never print a value. |
| A preview deploy's smoke test incremented the production usage tally. | Know which storage a preview shares with production. |
| Seven previously shipped defects were re-introduced and both test suites stayed green. | Prove every new guard red against its own bug. |
| A test harness crashed and the crash read as a pass. A grep matched its own explanatory comment. | A test that has never failed is theatre. |

## Block 9. Agents and automation

| What happened | Rule |
|---|---|
| Agent definitions described Next.js, Supabase and Vercel in a Netlify project with no build step, and a bundled rule mandated a deploy path the project forbids. | House rules in the repo CLAUDE.md override the agent defaults; check the persona files are filled in. |
| Agents sat on disk but were not registered in the session, so a request for them was served by hand. | Confirm the agents load where they will be used. |
| A scheduled run's recommendation to itself was treated as a change. | Scheduled runs propose; a human acts. |

## Block 10. Handover and kill criteria

| What happened | Rule |
|---|---|
| One person is the single point of failure on two live tools. | A handover page per live tool: what's live, jobs, key names, test modes, how to switch them off. |
| A live failure left no trace because the function logged nothing. | Log upstream status and duration on every external call. |
| No alerting was built on one tool, by decision: a self-built alert adds a secret and a cron that can fail silently. | Prefer provider threshold alerts; write the decision into the handover. |
