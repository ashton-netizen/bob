#!/usr/bin/env python3
"""Proves nothing in this pack drifted since MANIFEST.json was written.

Run with: python3 -I scripts/check_manifest.py
Exit 0 when every listed file is present with the same sha256 and no unlisted
file exists outside the folders that are expected to grow (docs/evidence, bob
after Build 1, .git, node_modules, engine type folders). Exit 1 otherwise.
Run with --write to regenerate the manifest (pack build time only).
"""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "MANIFEST.json"
GROWS = ("docs/evidence/", ".git/", "node_modules/", ".claude-plugin/types/", "bob/")
IGNORE_NAMES = {".DS_Store"}


def walk():
    for p in sorted(ROOT.rglob("*")):
        if not p.is_file() or p.name in IGNORE_NAMES:
            continue
        rel = p.relative_to(ROOT).as_posix()
        if rel == "MANIFEST.json" or any(seg == ".git" for seg in p.parts):
            continue
        yield rel, hashlib.sha256(p.read_bytes()).hexdigest(), p.stat().st_size


if "--write" in sys.argv:
    files = [{"path": r, "sha256": h, "bytes": b} for r, h, b in walk()]
    MANIFEST.write_text(json.dumps({
        "title": "BOB Claude Code Start Pack",
        "version": 1,
        "compiled": "2026-10-21",
        "status": "plan, data contract, gates as config, validated pane spike; application not built",
        "files": files,
    }, indent=2) + "\n")
    print(f"wrote {len(files)} entries")
    sys.exit(0)

m = json.loads(MANIFEST.read_text())
listed = {f["path"]: f["sha256"] for f in m["files"]}
seen = {}
problems = []
for rel, h, _ in walk():
    seen[rel] = h
    if rel in listed:
        if listed[rel] != h:
            problems.append(f"CHANGED {rel}")
    elif not rel.startswith(GROWS) and not rel.startswith("bob/"):
        problems.append(f"UNLISTED {rel}")
for rel in listed:
    if rel not in seen:
        problems.append(f"MISSING {rel}")
if problems:
    print("\n".join(problems))
    print(f"{len(problems)} problem(s) against MANIFEST.json")
    sys.exit(1)
print(f"manifest ok: {len(listed)} files match, nothing missing, nothing unlisted outside growth folders")
