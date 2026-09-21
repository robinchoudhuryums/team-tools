#!/usr/bin/env bash
# ── bite.sh — mutate a file, run the pure harness, restore the file ──────────
#
# A "bite-check": break the thing a pin is supposed to catch and confirm the pin
# goes red. A pin that never bit is a pin that has never been shown to work.
#
#   scripts/bite.sh [--dom] [--fn <function>] "<label>" <file> "<python mutation on the string s>" "<test-name substring>"
#
# `--dom` drives the DOM harness (test/client/dom/runDom.js) instead of the pure
# one. Before it existed, biting a DOM pin meant hand-rolling the same mutate →
# run → `git checkout` loop in a shell one-liner — and the one time that was
# done, the hand-rolled version had no dirty-file guard and discarded an
# uncommitted fix (g65's FIFTH firing, 2026-09-21, logged then as a follow-on).
# Every guard below now covers both harnesses, which is the point: the guards
# are the tool's job, not the caller's memory.
#
# `--fn` SCOPES the mutation to one function's span, and you almost always want
# it. A mutation is a regex or a replace over the WHOLE file, and it edits the
# first match anywhere in it: `_clearTestState(_TEST_INDIA_ID);` appears 24
# times in Tests.js, `SpreadsheetApp.flush();` twice in one server file. Without
# scoping, the tool happily mutates a DIFFERENT function that shares the shape
# and then reports a true verdict about code you were not testing. That has now
# happened twice (Batch 4's F-49, and the accrual ledger fix of 2026-09-18,
# where two NO BITEs in a row were both about an unrelated test). g116's fourth
# direction, made unnecessary rather than remembered.
#
# It ends in `git checkout -- <file>`, which is why the FIRST thing it does is
# refuse a file with uncommitted changes: that restore reverts the file to HEAD
# and takes any unsaved work in it with you. That has now cost this project four
# times (three in cycle-18 batch 5B, once in Batch F1 — where the discarded edit
# was then committed as a revert and only the next full run caught it), and the
# documented mitigation was "remember". This is the guard instead.
set -uo pipefail

harness="test/client/run.js"
harnessName="pure"
if [ "${1:-}" = "--dom" ]; then
  harness="test/client/dom/runDom.js"
  harnessName="DOM"
  shift
fi

fnName=""
if [ "${1:-}" = "--fn" ]; then
  fnName="${2:-}"
  shift 2 || true
  case "$fnName" in
    ''|*[!A-Za-z0-9_]*)
      echo "  REFUSING: --fn takes a bare function name ([A-Za-z0-9_]), got: '$fnName'" >&2
      exit 2 ;;
  esac
fi

if [ "${1:-}" = "--dom" ]; then
  harness="test/client/dom/runDom.js"
  harnessName="DOM"
  shift
fi

if [ $# -lt 4 ]; then
  echo "usage: scripts/bite.sh [--dom] [--fn <function>] <label> <file> <python-mutation-on-s> <test-name-substring>" >&2
  exit 2
fi
label="$1"; file="$2"; mutation="$3"; needle="$4"
cd "$(git rev-parse --show-toplevel)" || exit 2

[ -f "$file" ] || { echo "  NO SUCH FILE: $file" >&2; exit 2; }

# bash reads a script INCREMENTALLY, so mutating this file while it runs makes
# the shell resume mid-token and die — the restore never happens and the tree is
# left dirty. Found the only way it could be: by trying it.
case "$file" in
  */bite.sh|bite.sh)
    echo "  REFUSING: bite.sh cannot bite itself — bash reads it as it runs, so the" >&2
    echo "            mutation corrupts the running shell and the restore never fires." >&2
    echo "            Drive its assertions from a probe instead." >&2
    exit 2 ;;
esac

# The guard. `git status --porcelain <file>` prints nothing for a clean,
# tracked file — anything at all (modified, staged, untracked) means the
# restore below would destroy work, so refuse before touching it.
if [ -n "$(git status --porcelain -- "$file")" ]; then
  echo "  REFUSING: $file has uncommitted changes — bite-checks end in \`git checkout -- $file\`," >&2
  echo "            which would discard them. Commit first, then bite." >&2
  exit 2
fi

# The mutation is embedded in a double-quoted `python3 -c "..."` below, so a
# double quote INSIDE it closes that string early and hands python a mangled
# program. The dangerous part is that the wreckage often still edits the file,
# so the no-op guard passes, the harness goes red for some unrelated reason and
# the check reports BITES — a bite-check that proved nothing, which is worse
# than none. Refuse instead; single quotes reach python untouched.
case "$mutation" in
  *'"'*)
    echo "  REFUSING: the mutation contains a double quote, which closes the python -c" >&2
    echo "            string early and silently mangles the program. Use single quotes" >&2
    echo "            (or chr(34)) inside the mutation." >&2
    exit 2 ;;
esac

python3 -c "
import io, sys
p = '$file'
full = io.open(p, encoding='utf-8').read()
fn = '$fnName'
if fn:
    marker = 'function ' + fn + '('
    n = full.count(marker)
    if n == 0:
        sys.exit('--fn ' + fn + ': no \`function ' + fn + '(\` in ' + p + ' — check the name')
    if n > 1:
        sys.exit('--fn ' + fn + ': ' + str(n) + ' declarations of it in ' + p + ' — ambiguous, scope by hand')
    i = full.index(marker)
    b = full.index('{', i)
    depth = 0
    k = b
    # Naive brace match, the same one run.js's pins use. A brace inside a string
    # literal would fool it; it has not in this codebase, and a wrong span fails
    # LOUDLY here (the no-op guard below) rather than silently.
    while k < len(full):
        c = full[k]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                break
        k += 1
    if depth != 0:
        sys.exit('--fn ' + fn + ': unbalanced braces from its declaration')
    lo, hi = i, k + 1
else:
    lo, hi = 0, len(full)
s = full[lo:hi]
before = s
$mutation
if s == before:
    sys.exit('the mutation changed nothing — it cannot prove anything (wrong target?)')
io.open(p, 'w', encoding='utf-8').write(full[:lo] + s + full[hi:])
" || { echo "  MUTATION FAILED: $label" >&2; exit 1; }

out="$(node "$harness" 2>&1)"
# HERESTRING, not `echo "$out" | grep -q`. Under `set -o pipefail`, `grep -q`
# exits the moment it matches; if the harness output is larger than the pipe
# buffer (~64KB — it is ~83KB) the writer then dies of SIGPIPE and the PIPELINE
# reports 141, so a pin that DID bite was reported as NO BITE. Worse, it was
# size- and position-dependent: an early match flaked, a late one passed, and
# the same bite-check gave different answers on different days. Cost an hour
# while bitting the previewPtoAccruals pin. The herestring has no writer to kill.
if grep -q "✗.*$needle" <<<"$out"; then
  echo "  BITES [$harnessName]: $label"
  rc=0
else
  echo "  NO BITE [$harnessName]: $label"
  echo "$out" | tail -3
  # A NO BITE is a QUESTION, not an answer, and the first thing to ask is what
  # the mutation actually changed — it may have landed somewhere you did not
  # mean, or the claim may not be observable at all (g138). The diff is printed
  # here because the file is about to be restored, so checking it afterwards is
  # too late.
  echo "  --- what the mutation changed (restored immediately after) ---" >&2
  git --no-pager diff -U0 -- "$file" | sed -n '5,40p' >&2
  rc=1
fi
git checkout -- "$file"
exit $rc
