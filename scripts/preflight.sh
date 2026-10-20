#!/usr/bin/env bash
# BOB preflight. Runs on SessionStart via .claude/settings.json.
# Prints one line per check. Exits 2 (with the reason on stderr) when the
# session must not start work; exits 0 otherwise. Never prints a key value.
#
# UNVERIFIED until seen running in a real session: whether exit 2 on
# SessionStart blocks or only warns depends on the installed Claude Code
# version. Build 1 step 5 records what was observed in docs/project-status.md.

set -u
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$ROOT" || { echo "preflight: cannot cd to $ROOT" >&2; exit 2; }

fail=0
say() { printf 'preflight · %s\n' "$*"; }
bad() { printf 'preflight · STOP · %s\n' "$*" >&2; fail=1; }

# 1. Branch: never work on main once the repo has more than its first commit.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  commits="$(git rev-list --count HEAD 2>/dev/null || echo 0)"
  if [ "$branch" = "main" ] && [ "$commits" -gt 1 ]; then
    bad "on main with $commits commits. Create a branch first: git switch -c build-1"
  else
    say "branch $branch ($commits commits)"
  fi
else
  say "no git repo yet (first session). The kickoff initialises it."
fi

# 2. The plan and the data contract must exist.
for f in docs/product/product-plan.md bob/schema.json docs/project-status.md; do
  if [ -f "$f" ]; then say "present $f"; else bad "missing $f"; fi
done

# 3. Ledger: present once Build 1 step 1 has run; before that, fixtures stand in.
if [ -f bob/ledger.json ]; then say "ledger bob/ledger.json present"
elif [ -f fixtures/ledger.json ]; then say "ledger not yet created; fixtures/ledger.json stands in (synthetic)"
else bad "no ledger and no fixture"; fi

# 4. Keys by NAME only. Any .env* file with an empty, '...' or YOUR_ value is a stop.
for env in .env .env.local; do
  [ -f "$env" ] || continue
  while IFS= read -r line; do
    case "$line" in ''|'#'*) continue;; esac
    name="${line%%=*}"; value="${line#*=}"
    case "$value" in ''|'...'|YOUR_*|'"YOUR_'*|'<'*) bad "$env: $name has a placeholder value";; *) say "$env: $name present";; esac
  done < "$env"
done

# 5. Runtime Babel never ships.
if grep -rIl --include='*.html' --include='*.htm' --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude-dir=references --exclude-dir=.git 'text/babel' . >/dev/null 2>&1; then
  bad "runtime Babel found (text/babel). Plain JavaScript only."
else
  say "no runtime Babel"
fi

if [ "$fail" -ne 0 ]; then
  echo "preflight · one or more STOP lines above. Fix them before any work." >&2
  exit 2
fi
say "clear"
exit 0
