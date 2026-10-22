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
# The plugin folder: this script lives in <plugin>/scripts/. bob/schema.json
# is read from there, the one home; an adopted repo never gets a copy.
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || { echo "preflight: cannot cd to $ROOT" >&2; exit 2; }

fail=0
say() { printf 'preflight · %s\n' "$*"; }
bad() { printf 'preflight · STOP · %s\n' "$*" >&2; fail=1; }

# 1. Branch: never work on main once the repo has more than its first commit.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  commits="$(git rev-list --count HEAD 2>/dev/null || echo 0)"
  if [ "$branch" = "main" ] && [ "$commits" -gt 1 ]; then
    bad "on main with $commits commits. Create a branch first: git switch -c <build-or-adopt-branch>"
  else
    say "branch $branch ($commits commits)"
  fi
else
  say "no git repo yet (first session). The kickoff initialises it."
fi

# 2. The plan must exist in the repo; the data contract lives in the plugin.
if [ -f docs/product/product-plan.md ]; then say "present docs/product/product-plan.md"; else bad "missing docs/product/product-plan.md"; fi
if [ -f "$PLUGIN_ROOT/bob/schema.json" ]; then say "present bob/schema.json (plugin)"; else bad "missing bob/schema.json in the plugin folder $PLUGIN_ROOT. Ash needs to reinstall BOB"; fi

# 2b. The status file: required once the repo is governed (bob/brief.json
# exists). /bob adopt creates it when absent, so before adopt it is optional.
if [ -f docs/project-status.md ]; then
  say "present docs/project-status.md"
elif [ -f bob/brief.json ]; then
  bad "missing docs/project-status.md (governed repo). Ash needs to restore it from git"
else
  say "status file absent (not governed yet; /bob adopt creates docs/project-status.md)"
fi

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

# 6. Stack list (Build 3): what this Stepper's machine needs to finish a build.
# Names gaps, never values. BOB_GIT and BOB_GH are test seams (a path to the tool).
GIT_BIN="${BOB_GIT:-git}"; GH_BIN="${BOB_GH:-gh}"
if command -v "$GIT_BIN" >/dev/null 2>&1; then
  say "stack: git present"
else
  bad "stack gap: git not found. Ash needs to install git before BOB can branch or commit"
fi
origin="$(git remote get-url origin 2>/dev/null || true)"
case "$origin" in
  *github.com*)
    if ! command -v "$GH_BIN" >/dev/null 2>&1; then
      bad "stack gap: gh (GitHub CLI) not found. Ash needs to install it before BOB can open or merge a pull request"
    elif ! "$GH_BIN" auth status >/dev/null 2>&1; then
      bad "stack gap: gh is not signed in. Ash needs to sign in to GitHub with gh"
    else
      say "stack: gh signed in"
      if "$GH_BIN" repo view "$origin" --json name >/dev/null 2>&1; then
        say "stack: origin repo reachable"
      else
        bad "stack gap: no access to the origin repo. Ash needs to be given access to it on GitHub"
      fi
    fi
    ;;
  '') say "stack: no origin remote (gh checks skipped)" ;;
  *) say "stack: origin is not on GitHub (gh checks skipped)" ;;
esac
# The engine floor is a note, not a STOP: the claude on PATH is not the desktop
# app's engine (two engines on Ash's Mac, handoff). The app carries its own.
if command -v claude >/dev/null 2>&1; then
  ver="$(claude --version 2>/dev/null | head -1 | awk '{print $1}')"
  if [ -n "$ver" ] && [ "$(printf '%s\n%s\n' "$ver" 2.1.304 | sort -V | head -1)" != "2.1.304" ]; then
    say "stack: claude on PATH is $ver, below the 2.1.304 floor (the desktop app carries its own engine; plugin test needs 2.1.304)"
  else
    say "stack: claude on PATH is ${ver:-unknown}"
  fi
else
  say "stack: no claude on PATH (the desktop app carries its own engine)"
fi
say "stack: seat not checked by this script (plan tier unverified; Ash confirms)"

if [ "$fail" -ne 0 ]; then
  echo "preflight · one or more STOP lines above. Fix them before any work." >&2
  exit 2
fi
say "clear"
exit 0
