# Verify mode: the evidence rules

Read before marking any DoD line. Verify is **read-only everywhere**: browse the live URL, read deploy state and env var names, run the repo's own no-spend checks. No paid runs, no writes, no deploys, no test submissions. Anything that needs a real submission or a paid call goes back to the operator as I CHECK THIS.

## The three marks

| Mark | Means |
|---|---|
| **PASS** | Claude observed it this session, and says how in one sentence. |
| **FAIL** | Claude observed it not working, or the evidence contradicts the DoD. Name the gap. |
| **I CHECK THIS** | Only a person on the live product can see it (a real submission, a paid run, an inbox, a feel judgement). Say exactly what to do and what to look for. |

Never report "no FAILs" when there are some. Never round a partial pass up. A FAIL that comes from a deliberate scope decision is reported as such, and not fixed without asking.

## Order of review

You first, then QA. The operator clicks through the live build on their phone; then QA traces every DoD line through the code and the database. For a harden pass, run the two named reviews (paste-ready in `review-prompts.md`): Karpathy (five lenses, at most 8 items) then Bach (journeys with wrong input, double submit, back button, expired session).

## The rules

1. **Observe, don't accept.** PASS means seen: in the browser, in the database, in the inbox, on the deployed URL. Never on the strength of a build log, an agent's summary, a returned ID or a success toast.
2. **Test what the user touches.** A private window, a phone width (375px), and a stranger's path. Also a browser WITH saved state: check that localStorage or cookies don't pin old behaviour. Cache-bust before any visual check.
3. **Count the copies.** Before passing a UI or rule change, find every implementation of it. Two panels, two matchers, two lists: check each.
4. **Drive the caller, not the helper.** A test of a shared function proves the function, never that the caller uses it.
5. **Keys in both places.** "Works on my Mac, fails live" is almost always a key set locally and missing in production. Check presence by name in each environment. Never print a value.
6. **Prove the test fails on the bug** before trusting it green. Re-introduce the defect in a scratch copy, watch it go red, restore. An empty search result can be a false negative; a crash can read as a pass.
7. **A skip is not a pass.** A suite that could not run is reported SKIPPED, NOT VERIFIED.
8. **Shipped means deployed.** A fix in the code with an older deploy is an unshipped fix. Compare the deployed artefact (content hash or a marker) with the source, not timestamps.
9. **Check the gates are live on the remote.** Branch protection on, required checks listed and green for the deployed commit, the deploy path unable to skip them. A gate that exists only locally is reported as local.
10. **Name the gate that ran.** If `ship-it-safely` is not installed, its checks were run by hand or not at all. Say which.
11. **Fallbacks are partial.** If the primary source is unreachable (no database connector, page behind a login) and a fallback is used, say so. A fallback returning nothing is not "nothing there". Try the operator's logged-in browser before calling a page unreadable.

## Report shape

```
VERIFY · [project] · [date] · against [Brief file, version]

PASS  [DoD line] · [one sentence: what was observed, where]
FAIL  [DoD line] · [one sentence: what was observed instead]
I CHECK THIS  [DoD line] · [what to do, what to look for]

Not verified this session: [anything skipped, and why]
Gate: ship-it-safely [installed and run / run by hand / not run]
```

When the operator asks "is it done", give this list and nothing else. Loose ends, renames and new ideas go in a separate turn, only if asked.
