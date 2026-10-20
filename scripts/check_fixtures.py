#!/usr/bin/env python3
"""Checks that bob/schema.json and fixtures/ agree. Run with python3 -I.

Fails (exit 1) when: a JSON file does not parse; a record lacks the base
fields or has a bad `source`; a requirement state or transition target is not
in the schema; a requirement is `verified` or `accepted` with no evidence
record; an evidence kind is unknown; a run or source value is outside its
list; or the approval hash does not match sha256(fixtures/brief.json).

This is the first BOB gate that exists as code. It is the shape Gate A and the
state-table test take in the production plugin.
"""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
errors = []


def load(rel):
    try:
        return json.loads((ROOT / rel).read_text())
    except Exception as exc:  # noqa: BLE001
        errors.append(f"{rel}: does not parse: {exc}")
        return None


schema = load("bob/schema.json")
brief = load("fixtures/brief.json")
approvals = load("fixtures/approvals.json")
ledger = load("fixtures/ledger.json")
sources = load("fixtures/sources.json")
if errors:
    print("\n".join(errors))
    sys.exit(1)

base = schema["record_base"]["required"]
src_vals = set(schema["record_base"]["source_values"]) | {"bob"}


def check_base(rec, where):
    for f in base:
        if f not in rec:
            errors.append(f"{where}: missing base field {f}")
    if rec.get("source") not in src_vals:
        errors.append(f"{where}: bad source {rec.get('source')!r}")
    if rec.get("is_synthetic") is not True:
        errors.append(f"{where}: fixture record must be is_synthetic true")


req_states = set(schema["requirement"]["states"])
transitions = schema["requirement"]["transitions"]
for s, targets in transitions.items():
    for t in targets:
        if t not in req_states:
            errors.append(f"schema: transition {s} -> {t} names an unknown state")

ev_by_req = {}
for ev in ledger["evidence"]:
    check_base(ev, f"evidence {ev.get('id')}")
    if ev.get("kind") not in schema["evidence"]["kinds"]:
        errors.append(f"evidence {ev.get('id')}: unknown kind {ev.get('kind')!r}")
    ev_by_req.setdefault(ev.get("requirement_id"), []).append(ev["id"])

for r in brief["requirements"]:
    check_base(r, f"requirement {r.get('id')}")
    if r.get("state") not in req_states:
        errors.append(f"requirement {r['id']}: unknown state {r.get('state')!r}")
    if r.get("priority") not in schema["requirement"]["priority_values"]:
        errors.append(f"requirement {r['id']}: unknown priority")
    if r.get("state") in {"verified", "accepted"} and not ev_by_req.get(r["id"]):
        errors.append(f"requirement {r['id']}: {r['state']} with no evidence record (the rule BOB exists for)")
    for e in r.get("evidence_ids", []):
        if e not in ev_by_req.get(r["id"], []):
            errors.append(f"requirement {r['id']}: evidence_ids names {e} but the ledger has no such evidence for it")

for inc in ledger["increments"]:
    check_base(inc, f"increment {inc.get('id')}")
    if inc.get("state") not in schema["increment"]["states"]:
        errors.append(f"increment {inc['id']}: unknown state")
for run in ledger["runs"]:
    check_base(run, f"run {run.get('id')}")
    if run.get("state") not in schema["run"]["states"]:
        errors.append(f"run {run['id']}: unknown state")
for e in ledger["events"]:
    check_base(e, f"event {e.get('run_id')}@{e.get('at')}")
    if e.get("type") not in schema["event"]["type_values"]:
        errors.append(f"event {e.get('at')}: unknown type {e.get('type')!r}")
    if e.get("origin") not in schema["event"]["origin_values"]:
        errors.append(f"event {e.get('at')}: unknown origin")
for s in sources["sources"]:
    check_base(s, f"source {s.get('id')}")
    for dim in ("access", "processing", "knowledge_use"):
        if s.get(dim) not in schema["source"][f"{dim}_values"]:
            errors.append(f"source {s['id']}: bad {dim} {s.get(dim)!r}")

# Approval hash: the Gate A rule, in miniature.
digest = hashlib.sha256((ROOT / "fixtures/brief.json").read_bytes()).hexdigest()
for ap in approvals["approvals"]:
    check_base(ap, f"approval {ap.get('id')}")
    if ap.get("brief_hash") != digest:
        errors.append(
            f"approval {ap['id']}: brief_hash does not match sha256(fixtures/brief.json). "
            "Either the brief changed after approval (then the approval is void, as designed) "
            "or the fixture was not rebuilt. Expected " + digest[:12] + "..."
        )

if errors:
    print("\n".join(errors))
    print(f"{len(errors)} problem(s)")
    sys.exit(1)
print("schema and fixtures agree; approval hash matches; no verified requirement lacks evidence")
