# Evidence store

Every file here is referenced by `ref` from an evidence record in `bob/ledger.json` (or `fixtures/ledger.json` while fixtures stand in). Name files `<evidence-id>-<short-name>.<ext>`.

Rules
- Evidence is a diff, a test result, an artefact or a screenshot captured from a tool result or by a human. Model prose is never evidence. A heartbeat is never evidence.
- A requirement moves to `verified` only with an evidence record; to `accepted` only with a human on the transition.
- Raw logs over 1MB stay out of git (`.gitignore`); keep the extract that proves the point and note where the full log lives.
- Nothing synthetic is ever presented as real: fixture evidence carries `is_synthetic: true` in its ledger record.

This folder is empty on purpose at pack time. The first real entry is Build 1 step 1's `claude plugin validate` output.
