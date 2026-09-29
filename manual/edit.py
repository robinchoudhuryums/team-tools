"""Strict text replacement: fails loudly if the target isn't found exactly once."""
import sys
def rep(path, old, new, count=1):
    t = open(path, encoding="utf-8").read()
    n = t.count(old)
    if n != count:
        sys.exit(f"EDIT FAILED in {path}: expected {count} match(es), found {n}\n  target: {old[:90]!r}")
    open(path, "w", encoding="utf-8").write(t.replace(old, new))
