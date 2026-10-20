# Step Change Build Brief · [project name]
[Owner] · [date] · Mode: [Interview / Check] · Build type: [app or tool / agent or automation / Claude skill]
Home: [CLAUDE OUTPUTS path, or repo docs/product/product-plan.md once the repo exists] · Version [n]

---

## Part 0 · Gates

**Verdict: [GO / REVISE / BLOCKED]** · [one line: why, and the first step or the blocker]
Operator time used: [n] of 60 minutes · Rounds run: [n] · Questions asked: [n] · Pre-filled from sources: [n]

### Open questions
- OPEN QUESTION: [question] · Block [n] · Owner to close: [name] · Blocks the build: [yes / no]

### Stop-ifs
| 1 Result | 2 System | 3 DoD | 4 Keys | 5 Data | 6 Cost | 7 Brand | 8 Delivery | 9 Agents | 10 Handover |
|---|---|---|---|---|---|---|---|---|---|
| clear / open | | | | | | | | | |

---

## Part 1 · Product plan (for the operator)

**What and why, in one sentence:** [the change when this lands]
**The failure it fixes:** [one real example from the last 90 days]
**For:** [user] · [how often] · [device] · **Not for:** [anti-personas]
**Owner after launch:** [person] · **Must not break, duplicate or confuse:** [systems, rituals] · Sits beside them: [on top / read-only / replace with migration / separate]
**Must not look or sound like:** [the negative]
**Prototype or system:** database [y/n] · login [y/n] · review step [y/n] · owner [y/n] → [prototype / system]
**Appetite:** [days] · **No-gos:** [list] · **Load-bearing assumptions:** [assumption · falsified by · date]
**Framework:** [name, source] · what it says in one line · how QA will test against it

### The 5 Ds
- **Define the problem:** [what happens now, where it breaks]
- **Discover data:** [sources · owner · volume · sensitivity · real, copy or synthetic]
- **Design workflows:**
  1. [step] · [who today] · [AI on its own / AI drafts / never]
  2. ...
- **Determine ROI:** [90-day win as a number] · [weekly volume] · [cost of one failure]
- **Definition of Done:** [3 to 5 yes/no checks on the live site]

**Success criteria:** leading [number by date] · trailing [number by date]
**Reuse:** [existing code to reuse or adapt, with paths] · **New:** [what is genuinely new]
**Design:** [scm-design-skill / client brand] · assets in hand [y/n] · wireframe approved by [name] · mockup approved by [name]
**Deliberately not building:** [list]

---

## Part 2 · Development plan (for the AI)

**The brief (drives every /goal):** [three to five lines: what to build, the stack, the house rules, where the plan lives]
**Stack and tests:** [host · framework · database · test runner, confirmed from the repo]
**Bought, not written:** [auth · sessions · RLS · secrets · rate limits, and the provider of each]
**Data model:** [tables, each with id, created_at, user_id if scoped, is_synthetic]
**Keys (names only):** [KEY_NAME · local · production · who rotates]
**Conventions:** branch per build · never main · guard lines pasted (see il-playbook) · one home per list, guard and price table
**Delivery:** [greenfield / live product, preview first] · deploy path: [git-driven / guarded script] · reviewer [name, 8-item cap]

### Build 1 · prove the loop
**Goal:** [the thinnest real slice that proves the whole loop, live]
**Scope:** [in] · [out]
**Steps** (each ends in a check someone can see):
1. [step] · check: [what you see] · borrows from: [path]
2. ...
**Definition of Done:**
- [ ] Given [state], when [a stranger does X on the live URL], then [they see Y].
**Success criteria:** [measurable]

### Build 2 · the full system
**Goal:** [what it becomes once the loop is proven]
**Steps:** 1. ... (each with a visible check)
**Definition of Done:**
- [ ] ...
**Success criteria:** [measurable]
**Later:** [deferred]

### Agents (if any)
Trigger [secret-protected] · context [never the whole database] · instructions [with the JSON contract] · tools [least privilege] · log [agent_runs] · rhythm [start daily] · cost per run
Never on its own: no customer email without a click · no deletes · no stage change past contacted · no action on synthetic rows

### Handover and kill
Handover page: [location] · what's live · scheduled jobs · key names · test modes and how to switch each off · five biggest decisions · known landmines · next person should
Kill criteria: [measurable state] by [date] · Rollback: [steps] · rehearsed [y/n] · Alerts go to: [person]

---

## Part 3 · Enforcement map

| Rule or DoD line | Enforced by | Strength (1 remote check to 7 prose) | Proven red once? |
|---|---|---|---|
| Branch protection on main, PR required | Remote setting | 1 | n/a |
| No secret in the repo or bundle | Secret scan required check + key-prefix grep | 1 | [y/n] |
| Dependency audit clean on high | Required check | 1 | [y/n] |
| Static analysis clean | Required check | 1 | [y/n] |
| Critical path works, all UX states, accessible | Playwright + axe required check | 1 | [y/n] |
| Deploy only from green main | [git-driven deploy / guarded deploy script] | [1 / 2] | [y/n] |
| Daily spend ceiling enforced before the call | Handler test in the required suite | 3 | [y/n] |
| [each threat-map attack vector] | [test] | [n] | [y/n] |
| [each Build 1 and Build 2 DoD line] | [test / check / I CHECK THIS] | [n] | [y/n] |

**Pre-release:** ChatGPT audit against the threat map, after every check is green. Advisory.
**Hand-off:** [build-step-change-skill / Claude Code on the repo, plan mode, wire the repo first] · **First step:** [one line]
