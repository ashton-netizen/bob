# The proposal shape and the shape check

`docs/evidence/adopt/adopt-proposal.json` is the only handoff from the design room to the engine. `/bob adopt` validates it against the plugin's `bob/schema.json` and refuses the whole file with every reason listed if one rule fails. Draft to the rules; run the check; fix every refusal.

```json
{
  "brief": {
    "project": { "id": "P-<slug>", "name": "<name>", "created_at": "...", "source": "human", "is_synthetic": false },
    "requirements": [
      { "id": "R-<slug>-01", "priority": "MUST", "text": "...", "check": "...", "state": "not_assessed",
        "evidence_ids": [], "source_ids": ["S-01"], "created_at": "...", "source": "ai", "is_synthetic": false }
    ],
    "decisions": [], "assumptions": [], "outputs": []
  },
  "ledger": {
    "increments": [
      { "id": "INC-00", "title": "govern the project under BOB", "requirement_ids": ["R-<slug>-00"], "state": "proposed", "approval_id": null, "created_at": "...", "source": "ai", "is_synthetic": false },
      { "id": "INC-01", "title": "<phase one: the first working look>", "requirement_ids": ["R-<slug>-01"], "state": "proposed", "approval_id": null, "created_at": "...", "source": "ai", "is_synthetic": false }
    ],
    "runs": [], "events": [], "evidence": []
  },
  "sources": [
    { "id": "S-01", "name": "...", "type": "...", "version": "1", "fingerprint": "<sha256>", "scope": "project",
      "access": "available", "processing": "extracted", "knowledge_use": "proposed", "created_at": "...", "source": "tool", "is_synthetic": false }
  ]
}
```

Rules the engine enforces (so the design room drafts to them):
- Every record in every array carries `id`, `created_at`, `source` (human, ai, tool) and `is_synthetic: false`.
- `R-<slug>-00` is always "the project is BOB-governed: bob/ files exist, main unchanged", claimed by `INC-00`.
- Before any build every requirement is `not_assessed` or `blocked`. `verified` and `accepted` need an evidence record; the design room has none.
- At most three increments: `INC-00` (govern), `INC-01` (phase one), `INC-02` (phase two). Every requirement that is not already verified sits in one of them.
- Increments are `proposed`; `active` is refused (approval is `/bob approve`). Every `requirement_ids` entry exists in `brief.requirements`.
- Sources carry `access` and `processing` as observed. A source nobody opened is `queued` or `missing`, never `extracted`.
- No `approvals` key with records.

## The shape check
From a Code tab session with BOB installed (the script finds `bob/schema.json` in the plugin folder above it; in Cowork the same rules run when `/bob adopt` is typed):

```
python3 -I skills/design-with-bob/references/check_design_room.py <project folder>
```

It reads `bob/schema.json` from the plugin, then checks the project folder: the proposal shape above, a non-text source marked extracted or partial has `sources/<name>.extracted.txt` beside it (the text BOB actually read, naming what was not read), `bob/sources.json` against the proposal's sources (same ids, same fingerprints, same processing), `bob/brief.md` sections (Who, Job, Change, Today, End game, Constraints, Outputs, Requirements, Conflicts, Unknowns), and that each review page under `docs/evidence/design/` carries the current brief's hash. Exit 0 with "design room: clear", else exit 1 with one line per refusal. Fix every refusal; a project with refusals is not ready for `/bob adopt`.
