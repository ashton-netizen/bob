#!/usr/bin/env bash
# Tests scripts/preflight.sh: one failing case per STOP condition, plus the
# clear case. Each case builds a throwaway folder under $TMPDIR, runs the
# preflight there and checks the exit code and the STOP line.
#
# Usage: bash scripts/preflight.test.sh [path/to/preflight.sh]
# Exit 0 when every case passes, 1 otherwise. Prints one line per case.
# Never prints a key value: the placeholder cases use obviously fake names.

set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
PREFLIGHT="${1:-$HERE/preflight.sh}"
[ -f "$PREFLIGHT" ] || { echo "no preflight at $PREFLIGHT"; exit 1; }

pass=0; fail=0
say() { printf 'preflight.test · %s · %s\n' "$1" "$2"; }

# A minimal healthy repo: the plan, the status file and a fixture ledger.
# bob/schema.json is NEVER in the repo: the preflight reads it from the plugin
# folder (one home). A scaffold that wrote one would hide an adopted-repo bug.
scaffold() {
  local d; d="$(mktemp -d "${TMPDIR:-/tmp}/bob-preflight.XXXXXX")"
  mkdir -p "$d/docs/product" "$d/bob" "$d/fixtures"
  : > "$d/docs/product/product-plan.md"; : > "$d/docs/project-status.md"
  echo '{}' > "$d/fixtures/ledger.json"
  echo "$d"
}

# run <dir> → sets OUT (stdout+stderr) and CODE
run() {
  OUT="$(cd "$1" && CLAUDE_PROJECT_DIR="$1" bash "$PREFLIGHT" 2>&1)"; CODE=$?
}

expect_stop() { # name dir needle
  run "$2"
  if [ "$CODE" -eq 2 ] && printf '%s' "$OUT" | grep -q "STOP" && printf '%s' "$OUT" | grep -q -- "$3"; then
    say "$1" "red as expected (exit 2, STOP line names: $3)"; pass=$((pass+1))
  else
    say "$1" "FAILED: expected exit 2 with a STOP line naming '$3'; got exit $CODE"; printf '%s\n' "$OUT" | sed 's/^/    /'; fail=$((fail+1))
  fi
}

expect_clear() { # name dir
  run "$2"
  if [ "$CODE" -eq 0 ] && printf '%s' "$OUT" | grep -q "preflight · clear"; then
    say "$1" "clear as expected (exit 0)"; pass=$((pass+1))
  else
    say "$1" "FAILED: expected exit 0 and 'preflight · clear'; got exit $CODE"; printf '%s\n' "$OUT" | sed 's/^/    /'; fail=$((fail+1))
  fi
}

git_quiet() { git -c user.name=t -c user.email=t@example.invalid "$@" >/dev/null 2>&1; }

# 0. Healthy folder, no git: clear.
d="$(scaffold)"; expect_clear "clear, no git" "$d"

# 1. On main with more than one commit: STOP.
d="$(scaffold)"; ( cd "$d" && git_quiet init -b main && git_quiet add -A && git_quiet commit -m one && echo x > x && git_quiet add -A && git_quiet commit -m two )
expect_stop "branch is main with 2 commits" "$d" "on main with 2 commits"
# 1a. The branch message is generic: it names no build number.
if printf '%s' "$OUT" | grep -q "git switch -c" && ! printf '%s' "$OUT" | grep -q "build-1"; then
  say "branch message names no build" "ok (git switch -c, no build-1)"; pass=$((pass+1))
else
  say "branch message names no build" "FAILED: expected 'git switch -c' without 'build-1'"; printf '%s\n' "$OUT" | sed 's/^/    /'; fail=$((fail+1))
fi

# 1b. On main with exactly one commit (the first commit) is allowed.
d="$(scaffold)"; ( cd "$d" && git_quiet init -b main && git_quiet add -A && git_quiet commit -m one )
expect_clear "clear, main with its first commit" "$d"

# 1c. On a branch with many commits is allowed.
d="$(scaffold)"; ( cd "$d" && git_quiet init -b main && git_quiet add -A && git_quiet commit -m one && git_quiet switch -c build-1 && echo x > x && git_quiet add -A && git_quiet commit -m two )
expect_clear "clear, on build-1" "$d"

# 2. Governed (bob/brief.json) with no plan: STOP, naming it. The plan is
# docs/product/product-plan.md, or bob/brief.md for a design-room project.
d="$(scaffold)"; echo '{}' > "$d/bob/brief.json"; echo '{}' > "$d/bob/ledger.json"; rm "$d/docs/product/product-plan.md"
expect_stop "governed, plan file missing" "$d" "missing docs/product/product-plan.md"
d="$(scaffold)"; echo '{}' > "$d/bob/brief.json"; echo '{}' > "$d/bob/ledger.json"; rm "$d/docs/product/product-plan.md"; : > "$d/bob/brief.md"
expect_clear "governed, plan is the design room's bob/brief.md" "$d"

# 2a. Not governed and no plan: clear (a new project is designed after /bob new).
d="$(scaffold)"; rm "$d/docs/product/product-plan.md"
expect_clear "ungoverned without a plan" "$d"

# 3. Governed with no ledger: STOP.
d="$(scaffold)"; echo '{}' > "$d/bob/brief.json"; rm "$d/fixtures/ledger.json"
expect_stop "governed, no ledger" "$d" "missing bob/ledger.json"

# 3a. Not governed, no ledger and no fixture: clear (a new project has neither).
d="$(scaffold)"; rm "$d/fixtures/ledger.json"
expect_clear "ungoverned, no ledger and no fixture" "$d"

# 3b. The exact shape /bob new leaves: git init on main, no commit, one status file.
d="$(mktemp -d "${TMPDIR:-/tmp}/bob-preflight.XXXXXX")"; ( cd "$d" && git_quiet init -b main ); mkdir -p "$d/docs"; : > "$d/docs/project-status.md"
expect_clear "fresh /bob new project" "$d"

# 3c. The workspace folder itself (no git, bob-workspace.json and CLAUDE.md only).
d="$(mktemp -d "${TMPDIR:-/tmp}/bob-preflight.XXXXXX")"; echo '{}' > "$d/bob-workspace.json"; : > "$d/CLAUDE.md"
expect_clear "the workspace folder" "$d"

# 4. A placeholder key in .env: STOP, naming the key NAME only.
d="$(scaffold)"; printf 'FAKE_SERVICE_KEY=YOUR_KEY_HERE\n' > "$d/.env"
expect_stop "placeholder key YOUR_" "$d" "FAKE_SERVICE_KEY has a placeholder value"
d="$(scaffold)"; printf 'FAKE_SERVICE_KEY=\n' > "$d/.env"
expect_stop "empty key value" "$d" "FAKE_SERVICE_KEY has a placeholder value"
d="$(scaffold)"; printf 'FAKE_SERVICE_KEY=...\n' > "$d/.env.local"
expect_stop "dots placeholder in .env.local" "$d" "FAKE_SERVICE_KEY has a placeholder value"

# 4b. A key with a real-looking value is reported present by name, never by value.
d="$(scaffold)"; printf 'FAKE_SERVICE_KEY=not-a-real-value-0123\n' > "$d/.env"
run "$d"
if [ "$CODE" -eq 0 ] && printf '%s' "$OUT" | grep -q "FAKE_SERVICE_KEY present" && ! printf '%s' "$OUT" | grep -q "not-a-real-value"; then
  say "key present by name only" "clear, value never printed"; pass=$((pass+1))
else
  say "key present by name only" "FAILED (exit $CODE)"; printf '%s\n' "$OUT" | sed 's/^/    /'; fail=$((fail+1))
fi

# 6. Adopted repo shape (Build 2): bob/brief.json and bob/ledger.json in the
# repo, NO bob/schema.json there (it lives in the plugin), status present: clear.
d="$(scaffold)"; echo '{}' > "$d/bob/brief.json"; echo '{}' > "$d/bob/ledger.json"
run "$d"
if [ "$CODE" -eq 0 ] && printf '%s' "$OUT" | grep -q "preflight · clear" && printf '%s' "$OUT" | grep -q "schema.json (plugin)"; then
  say "adopted shape, schema from the plugin" "clear as expected (exit 0, schema read from the plugin folder)"; pass=$((pass+1))
else
  say "adopted shape, schema from the plugin" "FAILED: expected exit 0, clear, and 'schema.json (plugin)'; got exit $CODE"; printf '%s\n' "$OUT" | sed 's/^/    /'; fail=$((fail+1))
fi

# 6b. Governed (bob/brief.json present) but no docs/project-status.md: STOP naming it.
d="$(scaffold)"; echo '{}' > "$d/bob/brief.json"; echo '{}' > "$d/bob/ledger.json"; rm "$d/docs/project-status.md"
expect_stop "governed without a status file" "$d" "missing docs/project-status.md"

# 6c. Not governed and no docs/project-status.md: clear (adopt creates it).
d="$(scaffold)"; rm "$d/docs/project-status.md"
expect_clear "ungoverned without a status file" "$d"

# 5. Runtime Babel: STOP.
d="$(scaffold)"; printf '<script type="text/babel"></script>\n' > "$d/index.html"
expect_stop "runtime Babel" "$d" "runtime Babel found"

# 7. Stack list (Build 3): git, gh, gh sign-in, repo access, engine floor. Each
# gap is named, never a value. gh is only required where origin is on GitHub, so
# the folders above (no remote) stay clear. BOB_GIT and BOB_GH are the script's
# test seams (a path to the tool), so a missing tool is reproducible on any OS.
stubs="$(mktemp -d "${TMPDIR:-/tmp}/bob-stubs.XXXXXX")"
cat > "$stubs/gh" <<'STUB'
#!/bin/sh
case "$1 $2" in
  "auth status") exit "${STUB_AUTH:-0}" ;;
  "repo view") exit "${STUB_REPO:-0}" ;;
esac
exit 0
STUB
chmod +x "$stubs/gh"
cat > "$stubs/claude" <<'STUB'
#!/bin/sh
echo "${STUB_ENGINE:-2.1.304} (Claude Code)"
STUB
chmod +x "$stubs/claude"
with_origin() { ( cd "$1" && git_quiet init -b main && git_quiet remote add origin https://github.com/example/none.git && git_quiet add -A && git_quiet commit -m one && git_quiet switch -c work ); }

d="$(scaffold)"; with_origin "$d"
OUT="$(cd "$d" && CLAUDE_PROJECT_DIR="$d" BOB_GH="$stubs/gh" PATH="$stubs:$PATH" bash "$PREFLIGHT" 2>&1)"; CODE=$?
if [ "$CODE" -eq 0 ] && printf '%s' "$OUT" | grep -q "stack: gh signed in" && printf '%s' "$OUT" | grep -q "stack: origin repo reachable" && printf '%s' "$OUT" | grep -q "stack: seat not checked"; then
  say "stack, all present" "clear, each item named"; pass=$((pass+1))
else
  say "stack, all present" "FAILED (exit $CODE)"; printf '%s\n' "$OUT" | sed 's/^/    /'; fail=$((fail+1))
fi

stack_stop() { # name needle, then env assignments in $@ after shift 2
  local name="$1" needle="$2"; shift 2
  d="$(scaffold)"; with_origin "$d"
  OUT="$(cd "$d" && env CLAUDE_PROJECT_DIR="$d" PATH="$stubs:$PATH" "$@" bash "$PREFLIGHT" 2>&1)"; CODE=$?
  if [ "$CODE" -eq 2 ] && printf '%s' "$OUT" | grep -q "STOP" && printf '%s' "$OUT" | grep -q -- "$needle"; then
    say "$name" "red as expected (exit 2, STOP names: $needle)"; pass=$((pass+1))
  else
    say "$name" "FAILED: expected exit 2 naming '$needle'; got exit $CODE"; printf '%s\n' "$OUT" | sed 's/^/    /'; fail=$((fail+1))
  fi
}
stack_stop "stack: git missing" "stack gap: git" BOB_GIT="$stubs/no-such-git" BOB_GH="$stubs/gh"
stack_stop "stack: gh missing" "stack gap: gh (GitHub CLI) not found" BOB_GH="$stubs/no-such-gh"
stack_stop "stack: gh not signed in" "stack gap: gh is not signed in" BOB_GH="$stubs/gh" STUB_AUTH=1
stack_stop "stack: no repo access" "stack gap: no access to the origin repo" BOB_GH="$stubs/gh" STUB_REPO=1

# 7b. The engine floor is a note, not a STOP: the PATH claude is not the app's engine.
d="$(scaffold)"; with_origin "$d"
OUT="$(cd "$d" && CLAUDE_PROJECT_DIR="$d" BOB_GH="$stubs/gh" STUB_ENGINE=2.1.287 PATH="$stubs:$PATH" bash "$PREFLIGHT" 2>&1)"; CODE=$?
if [ "$CODE" -eq 0 ] && printf '%s' "$OUT" | grep -q "stack: claude on PATH is 2.1.287, below the 2.1.304 floor"; then
  say "stack: old PATH engine" "noted, not a STOP (the desktop app carries its own)"; pass=$((pass+1))
else
  say "stack: old PATH engine" "FAILED (exit $CODE)"; printf '%s\n' "$OUT" | sed 's/^/    /'; fail=$((fail+1))
fi

echo "preflight.test · $pass passed, $fail failed"
[ "$fail" -eq 0 ]
