# Gate B false positive, diagnosed 28 October 2026

Ash, 28 October 2026: "Use BOB itself as the example. Just get it done, get it built. I just need it built. This is so annoying."

Seen three times in one session (writes refused with "The last round changed N file(s) under INC-05 and ended with no evidence record for R-bob-17") although evidence records for R-bob-17 existed in bob/ledger.json (E-BOB-18, E-BOB-19, E-BOB-20, E-BOB-21).

Cause, read from hooks/register.tsx:
- `heldByGateB` (the write-time check) finds evidence the baseline has not seen, adds its ids to the baseline atom and clears the pending hold, but leaves `touchedAtom` (the files written this round) as it is.
- At the next turn start, `carryOver` sees written files and, because the baseline already holds every evidence id, finds nothing "gained". It then sets a new pending hold for a round that did gain evidence.

Fix (R-bob-18): wherever Gate B consumes new evidence into the baseline, it also clears the written-files list, so a round that gained evidence is never carried over.
Proof: a plugin test that lands evidence mid-round (a write that passes the evidence check), then starts the next turn, then writes a source file; it must be allowed. Seen red on 0.10.0 code before the fix.
