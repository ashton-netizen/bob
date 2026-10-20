# Fixtures (synthetic only)

Four JSON files that mirror a BOB-governed AquaAgent repo at one moment: one increment done, one active, one run completed, five requirements across five states, four sources across the three independent dimensions. Every record has `is_synthetic: true`. No real AquaAgent data, client material or person appears here.

`scripts/check_fixtures.py` (run with `python3 -I`) proves the fixtures agree with `bob/schema.json`, that no requirement is `verified` or `accepted` without evidence, and that the approval hash equals sha256 of `brief.json`. Change `brief.json` by one byte and the approval check fails. That is Gate A in miniature, and it must stay that way.

Deliberately included defect cases, for the gate tests in Build 1
- `R-AQ-09` is `blocked` with no sources: the board must show it red, never hide it.
- `S-05` is audio with `processing: unsupported`: it must never look ingested.
- `S-04` is a partial PDF read with a coverage note: the register must show "partial", not "read".
- The run `RUN-07` exited `success` while `R-AQ-08` stayed `designed`: a successful exit never completes a scope.
