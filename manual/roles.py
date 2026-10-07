"""`[ROLE: Name]` → its roster row — ONE resolver for build.py and export_reference.py.

The match is tried in three passes, and the first pass that finds a row wins:

  1. the role's own name, exactly (case, dash style and spacing aside);
  2. the role's name containing the words asked for;
  3. the role's name or its NOTE containing them — the old single pass.

The old resolver was pass 3 alone, taking the first row in the file whose role
OR note held every word: `[ROLE: Service Escalation — Insurance Complaints]`
resolved to the Used Equipment Sales Contact, whose note mentions "Service
escalation role for insurance complaints" and which comes earlier in the file.
"""
import re


def _norm(s):
    s = (s or "").lower().replace("—", "-").replace("–", "-")
    s = re.sub(r"\s*-\s*", " - ", s)
    return re.sub(r"\s+", " ", s).strip()


def _words(s):
    return [w for w in _norm(s).split() if w != "-"]


def find(roster, want):
    """The roster row a role marker names, or None."""
    w = _norm(want)
    for r in roster:
        if _norm(r["role"]) == w:
            return r
    ws = _words(want)
    for r in roster:
        hay = _norm(r["role"])
        if w in hay or all(x in hay.split() for x in ws):
            return r
    for r in roster:
        hay = _norm(r["role"] + " " + (r.get("note") or ""))
        if w in hay or all(x in hay for x in ws):
            return r
    return None


def anchor(row):
    """The HTML id of a role's row in the B.1 directory."""
    return "role-" + row["id"]


if __name__ == "__main__":
    R = [{"id": "fo-used", "role": "Used Equipment Sales Contact",
          "note": "Also the Service escalation role for insurance complaints"},
         {"id": "svc-esc", "role": "Service Escalation — Insurance Complaints", "note": ""},
         {"id": "fo-sup", "role": "Field Operations Supervisor", "note": ""}]
    assert find(R, "Service Escalation — Insurance Complaints")["id"] == "svc-esc", "exact name first"
    assert find(R, "service escalation - insurance complaints")["id"] == "svc-esc", "case and dash style aside"
    assert find(R, "Supervisor")["id"] == "fo-sup", "a role-name word match beats a note match"
    assert find(R, "insurance complaints")["id"] == "svc-esc", "the role name is searched before any note"
    assert find(R, "used equipment")["id"] == "fo-used"
    assert find(R, "nobody at all") is None
    assert anchor(R[1]) == "role-svc-esc"
    # a name every word of which another role's name also holds: only the exact pass tells them apart
    R2 = [{"id": "fop-sup", "role": "Field Operations — Power Supervisor", "note": ""},
          {"id": "fo-sup", "role": "Field Operations Supervisor", "note": ""}]
    assert find(R2, "Field Operations Supervisor")["id"] == "fo-sup", "the exact name beats a row holding all its words"
    print("roles selftest ok")
