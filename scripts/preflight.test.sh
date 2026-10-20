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

# A minimal healthy repo: the three required files and a fixture ledger.
scaffold() {
  local d; d="$(mktemp -d "${TMPDIR:-/tmp}/bob-preflight.XXXXXX")"
  mkdir -p "$d/docs/product" "$d/bob" "$d/fixtures"
  : > "$d/docs/product/product-plan.md"; : > "$d/bob/schema.json"; : > "$d/docs/project-status.md"
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

# 1b. On main with exactly one commit (the first commit) is allowed.
d="$(scaffold)"; ( cd "$d" && git_quiet init -b main && git_quiet add -A && git_quiet commit -m one )
expect_clear "clear, main with its first commit" "$d"

# 1c. On a branch with many commits is allowed.
d="$(scaffold)"; ( cd "$d" && git_quiet init -b main && git_quiet add -A && git_quiet commit -m one && git_quiet switch -c build-1 && echo x > x && git_quiet add -A && git_quiet commit -m two )
expect_clear "clear, on build-1" "$d"

# 2. A required file is missing: STOP, naming it.
d="$(scaffold)"; rm "$d/docs/product/product-plan.md"
expect_stop "plan file missing" "$d" "missing docs/product/product-plan.md"

# 3. No ledger and no fixture: STOP.
d="$(scaffold)"; rm "$d/fixtures/ledger.json"
expect_stop "no ledger and no fixture" "$d" "no ledger and no fixture"

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

# 5. Runtime Babel: STOP.
d="$(scaffold)"; printf '<script type="text/babel"></script>\n' > "$d/index.html"
expect_stop "runtime Babel" "$d" "runtime Babel found"

echo "preflight.test · $pass passed, $fail failed"
[ "$fail" -eq 0 ]
