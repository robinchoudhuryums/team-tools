#!/usr/bin/env bash
# ── bite.sh — mutate a file, run the pure harness, restore the file ──────────
#
# A "bite-check": break the thing a pin is supposed to catch and confirm the pin
# goes red. A pin that never bit is a pin that has never been shown to work.
#
#   scripts/bite.sh "<label>" <file> "<python mutation on the string s>" "<test-name substring>"
#
# It ends in `git checkout -- <file>`, which is why the FIRST thing it does is
# refuse a file with uncommitted changes: that restore reverts the file to HEAD
# and takes any unsaved work in it with you. That has now cost this project four
# times (three in cycle-18 batch 5B, once in Batch F1 — where the discarded edit
# was then committed as a revert and only the next full run caught it), and the
# documented mitigation was "remember". This is the guard instead.
set -uo pipefail

if [ $# -lt 4 ]; then
  echo "usage: scripts/bite.sh <label> <file> <python-mutation-on-s> <test-name-substring>" >&2
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

python3 -c "
import io, sys
p = '$file'
s = io.open(p, encoding='utf-8').read()
before = s
$mutation
if s == before:
    sys.exit('the mutation changed nothing — it cannot prove anything (wrong target?)')
io.open(p, 'w', encoding='utf-8').write(s)
" || { echo "  MUTATION FAILED: $label" >&2; exit 1; }

out="$(node test/client/run.js 2>&1)"
if echo "$out" | grep -q "✗.*$needle"; then
  echo "  BITES: $label"
  rc=0
else
  echo "  NO BITE: $label"
  echo "$out" | tail -3
  rc=1
fi
git checkout -- "$file"
exit $rc
