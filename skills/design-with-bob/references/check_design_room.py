#!/usr/bin/env python3
"""Checks a design-with-bob project folder before /bob adopt (skills/design-with-bob).

Run with: python3 -I skills/design-with-bob/references/check_design_room.py [--synthetic] <project folder>
--synthetic is for fixtures/ only: every record must then be is_synthetic true,
so a fixture can never be mistaken for a real project (and /bob adopt refuses it).
Reads bob/schema.json from this plugin folder (one home). Exit 0 and
"design room: clear" when every rule holds; exit 1 with one line per refusal.
Never reads a key, never writes.
"""
import hashlib
import json
import re
import sys
from pathlib import Path


def find_schema():
    """bob/schema.json is the one home, in the BOB plugin folder. Walk up from
    this file (it ships inside skills/design-with-bob/references/)."""
    for d in [Path(__file__).resolve()] + list(Path(__file__).resolve().parents):
        if (d / "bob" / "schema.json").exists():
            return d / "bob" / "schema.json"
    return None

TEXT_TYPES = {"markdown", "text", "txt", "csv", "json", "md"}
SECTIONS = ["Who", "Job", "Change", "Today", "End game", "Constraints", "Outputs", "Requirements", "Conflicts", "Unknowns"]


def main(folder: str, synthetic: bool = False) -> int:
    root = Path(folder).resolve()
    out: list[str] = []
    sp = find_schema()
    if sp is None:
        print("design room: REFUSED: bob/schema.json not found above this script. Run the check from the BOB plugin folder (a Code tab session on a repo with BOB installed); in Cowork the same shape check runs when /bob adopt is typed.")
        return 1
    schema = json.loads(sp.read_text())
    base_req = schema["record_base"]["required"]
    base_src = schema["record_base"]["source_values"]

    def base(rec, where):
        if not isinstance(rec, dict):
            out.append(f"{where}: not a record"); return
        for f in base_req:
            if f not in rec: out.append(f"{where} {rec.get('id', '(no id)')}: missing {f}")
        if rec.get("source") not in base_src: out.append(f"{where} {rec.get('id')}: source {rec.get('source')!r} is not one of {base_src}")
        if rec.get("is_synthetic") is not synthetic: out.append(f"{where} {rec.get('id')}: is_synthetic must be {str(synthetic).lower()}" + ("" if synthetic else " in a real project"))

    # 1. The brief in plain words, every section present.
    brief_md = root / "bob" / "brief.md"
    if not brief_md.exists():
        out.append("bob/brief.md missing")
        brief_text = ""
    else:
        brief_text = brief_md.read_text()
        heads = {h.strip() for h in re.findall(r"^##\s+(.+?)\s*$", brief_text, re.M)}
        for s in SECTIONS:
            if s not in heads: out.append(f"bob/brief.md: section '{s}' missing (write it, empty if need be)")
    brief_hash = hashlib.sha256(brief_text.encode()).hexdigest()[:12] if brief_text else None

    # 2. The source register: truthful processing states.
    src_path = root / "bob" / "sources.json"
    sources = []
    if not src_path.exists():
        out.append("bob/sources.json missing")
    else:
        sources = json.loads(src_path.read_text()).get("sources", [])
        seen_fp = {}
        for s in sources:
            base(s, "source")
            if s.get("access") not in schema["source"]["access_values"]: out.append(f"source {s.get('id')}: access {s.get('access')!r} not in schema")
            if s.get("processing") not in schema["source"]["processing_values"]: out.append(f"source {s.get('id')}: processing {s.get('processing')!r} not in schema")
            fp = s.get("fingerprint")
            if fp in seen_fp and s.get("name") != seen_fp[fp]:
                pass  # same bytes under another name: allowed, it is the same source
            if fp in seen_fp and s.get("name") == seen_fp[fp]:
                out.append(f"source {s.get('id')}: same name and same fingerprint as an earlier record; a duplicate drop is noted on the existing record, never registered twice")
            seen_fp.setdefault(fp, s.get("name"))
            f = root / "sources" / str(s.get("name", ""))
            if s.get("processing") in ("extracted", "partial"):
                if not f.exists(): out.append(f"source {s.get('id')}: processing {s.get('processing')} but sources/{s.get('name')} is not in the folder")
                elif hashlib.sha256(f.read_bytes()).hexdigest() != fp: out.append(f"source {s.get('id')}: fingerprint does not match sources/{s.get('name')}")
                elif f.stat().st_size == 0: out.append(f"source {s.get('id')}: {s.get('processing')} from an empty file; that is failed, not extracted")
                # A non-text source is "read" only when the text BOB read sits beside it.
                if str(s.get("type", "")).lower() not in TEXT_TYPES:
                    side = root / "sources" / f"{s.get('name')}.extracted.txt"
                    if not side.exists() or side.stat().st_size == 0:
                        out.append(f"source {s.get('id')}: {s.get('processing')} but sources/{s.get('name')}.extracted.txt (the text BOB read) is missing; a file nobody read is queued, failed or unsupported")
                    else:
                        unread = re.search(r"not read|unread|unreadable|could not be read", side.read_text(), re.I)
                        if s.get("processing") == "extracted" and unread: out.append(f"source {s.get('id')}: marked extracted but its extracted text says part of it was not read; that is partial")
                        if s.get("processing") == "partial" and not unread: out.append(f"source {s.get('id')}: marked partial but its extracted text names nothing that was not read")

    # 3. Review pages carry the current brief hash.
    design = root / "docs" / "evidence" / "design"
    for page in ["journey.md", "screen-map.md", "data-trace.md", "readiness.md"]:
        p = design / page
        if not p.exists():
            out.append(f"docs/evidence/design/{page} missing"); continue
        head = p.read_text()[:400]
        if brief_hash and not re.search(r"version\s+" + re.escape(brief_hash) + r"\b", head):
            out.append(f"docs/evidence/design/{page}: generated from another brief version (current {brief_hash} not in its header); regenerate it from bob/brief.md")

    # 4. The proposal shape.
    pp = root / "docs" / "evidence" / "adopt" / "adopt-proposal.json"
    if not pp.exists():
        out.append("docs/evidence/adopt/adopt-proposal.json missing (stage F writes it)")
    else:
        try:
            p = json.loads(pp.read_text())
        except json.JSONDecodeError as e:
            out.append(f"adopt-proposal.json does not parse: {e}"); p = None
        if p:
            brief = p.get("brief") or {}
            ledger = p.get("ledger") or {}
            if p.get("approvals"): out.append("proposal.approvals must be empty: /bob approve is the only writer")
            if brief.get("project"): base(brief["project"], "brief.project")
            reqs = brief.get("requirements") or []
            if not reqs: out.append("brief.requirements is empty")
            ids = set()
            states = schema["requirement"]["states"]
            for r in reqs:
                base(r, "requirement"); ids.add(r.get("id"))
                if r.get("state") not in states: out.append(f"requirement {r.get('id')}: state {r.get('state')!r} not in schema")
                elif r.get("state") not in ("not_assessed", "blocked"): out.append(f"requirement {r.get('id')}: state {r.get('state')} before any build; the design room sets not_assessed or blocked only")
                if r.get("priority") not in schema["requirement"]["priority_values"]: out.append(f"requirement {r.get('id')}: priority {r.get('priority')!r} not in schema")
                if not r.get("check"): out.append(f"requirement {r.get('id')}: check is empty; write what someone can see")
                for sid in r.get("source_ids") or []:
                    if sid not in {s.get("id") for s in p.get("sources") or []}: out.append(f"requirement {r.get('id')}: source {sid} is not in proposal.sources")
            if not any(str(i).endswith("-00") for i in ids): out.append("no R-<slug>-00 (the project is BOB-governed) requirement")
            incs = ledger.get("increments") or []
            if [i.get("id") for i in incs][:2] != ["INC-00", "INC-01"]: out.append("ledger.increments must start INC-00 (govern) then INC-01 (phase one: a working look)")
            if len(incs) > 3: out.append(f"{len(incs)} increments; rounds are phases: INC-00, phase one, phase two, so at most 3")
            planned = {rid for i in incs for rid in (i.get("requirement_ids") or [])}
            for r in (brief.get("requirements") or []):
                if r.get("state") not in ("verified", "accepted") and r.get("id") not in planned: out.append(f"requirement {r.get('id')} is in no increment; put it in phase one or phase two")
            for i in incs:
                base(i, "increment")
                if i.get("state") != "proposed": out.append(f"increment {i.get('id')}: state must be proposed")
                for rid in i.get("requirement_ids") or []:
                    if rid not in ids: out.append(f"increment {i.get('id')}: requirement {rid} is not in brief.requirements")
            for ev in ledger.get("evidence") or []: out.append(f"evidence {ev.get('id')}: the design room has no evidence records; nothing is built")
            psrc = p.get("sources") or []
            by_id = {s.get("id"): s for s in sources}
            for s in psrc:
                base(s, "proposal source")
                reg = by_id.get(s.get("id"))
                if not reg: out.append(f"proposal source {s.get('id')}: not in bob/sources.json")
                elif (reg.get("fingerprint"), reg.get("processing")) != (s.get("fingerprint"), s.get("processing")): out.append(f"proposal source {s.get('id')}: fingerprint or processing differs from bob/sources.json")

    # 5. Status file names the stage.
    st = root / "docs" / "project-status.md"
    if not st.exists(): out.append("docs/project-status.md missing")

    if out:
        for line in out: print(f"design room: REFUSED: {line}")
        return 1
    print(f"design room: clear ({len(sources)} sources, brief {brief_hash})")
    return 0


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--synthetic"]
    if len(args) != 1:
        print("usage: check_design_room.py [--synthetic] <project folder>"); sys.exit(2)
    sys.exit(main(args[0], synthetic="--synthetic" in sys.argv))
