# Roster Request Form (SYNTHETIC fixture project)

Brief version: see the hash in each review page. Every record here is synthetic.

## Who
- CONFLICT, unresolved: S-01 and S-02 say the user is the franchisee; S-03 says the head office roster coordinator. [source claim, S-02 line 2; source claim, S-03 line 1]

## Job
- Request a roster change without texting the manager. [source claim, S-02 line 3]

## Change
- A form whose answers land in the roster sheet. [source claim, S-02 line 3]

## Today
- Franchisees text the manager. [source claim, S-02 line 3]

## End game
- Unknown: nobody said what "done" looks like. [unknown]

## Constraints
- Roster rules on S-04 page 1; page 2 could not be read. [source claim, S-04 p.1; unknown, S-04 p.2]

## Outputs
- Roster sheet row per request. [source claim, S-02]
- CSV export every Friday for head office. [source claim, S-02 line 4; LATE CHANGE, added after the first brief]

## Requirements
- R-roster-00 MUST: the project is BOB-governed (bob/ files exist, main unchanged). not_assessed.
- R-roster-01 MUST: a submitted request appears as one row in the roster sheet within a minute. not_assessed. S-02.
- R-roster-02 MUST: the form refuses a request outside the roster rules on S-04 page 1. blocked: page 2 of the rules is unread. S-04.
- R-roster-03 SHOULD: a CSV of the week's requests exists every Friday. not_assessed. S-02 (late change).

## Conflicts
- C-01: who the user is. S-02 (franchisee) versus S-03 (head office coordinator). Open; Mags needs to decide. Consequence: the form's fields and who sees the sheet.

## Unknowns
- U-01: the shape of the roster sheet. Mags said "I don't know". AI-proposed default, marked as such: one row per request with date, shift, franchisee, reason, status. Shown as one representative record in data-trace.md.
- U-02: what "done" looks like (End game).
