#!/usr/bin/env python3
"""Turn each review packet into a block model for render_packet.js.

Uses the same spec and excerpt logic as make_review_packets.py, so the Word
files and the Markdown files always carry identical content.
"""
import json, re, sys
sys.path.insert(0, ".")
import make_review_packets as MRP
from numbering import display

INLINE = re.compile(r"(\*\*.+?\*\*|`[^`]+`|\*[^*\s][^*]*?\*)")


def runs(text):
    text = text.replace("&nbsp;", " ").strip()
    out = []
    for part in INLINE.split(text):
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            out.append({"text": part[2:-2], "b": True})
        elif part.startswith("`") and part.endswith("`"):
            out.append({"text": part[1:-1], "code": True})
        elif part.startswith("*") and part.endswith("*") and len(part) > 2:
            out.append({"text": part[1:-1], "i": True})
        else:
            out.append({"text": part})
    return out


def cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def blocks(md):
    """A markdown excerpt → paragraphs, tables, callouts, bullets and headings."""
    lines = md.split("\n")
    out, i = [], 0
    while i < len(lines):
        ln = lines[i]
        if not ln.strip():
            i += 1
            continue
        if ln.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                if not re.match(r"^\|[\s:|-]+\|?$", lines[i]):
                    rows.append([runs(c) for c in cells(lines[i])])
                i += 1
            out.append({"t": "table", "rows": rows})
            continue
        if ln.startswith(">"):
            paras, cur = [], []
            while i < len(lines) and lines[i].startswith(">"):
                body = lines[i][1:].strip()
                if body:
                    cur.append(body)
                elif cur:
                    paras.append(" ".join(cur)); cur = []
                i += 1
            if cur:
                paras.append(" ".join(cur))
            m = re.match(r"\*\*(Critical|Policy|Watch-out|Script|Note)", paras[0] if paras else "")
            out.append({"t": "callout", "kind": (m.group(1) if m else "Note").lower(), "paras": [runs(p) for p in paras]})
            continue
        m = re.match(r"^#{2,4} (.+)$", ln)
        if m:
            out.append({"t": "h4", "runs": runs(m.group(1))}); i += 1; continue
        if re.match(r"^- ", ln):
            out.append({"t": "bullet", "runs": runs(ln[2:])}); i += 1; continue
        para = [ln.strip()]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r"^(\||>|#|- )", lines[i]):
            para.append(lines[i].strip()); i += 1
        out.append({"t": "p", "runs": runs(" ".join(para))})
    return out


def model(key):
    s = MRP.SPEC[key]
    head = [l for l in s["head"].split("\n") if l.strip()]
    title = head[0].lstrip("# ").strip()
    meta = [runs(l) for l in head[1:]]
    B = [{"t": "title", "text": title}] + [{"t": "meta", "runs": r} for r in meta]
    B += [{"t": "h2", "text": "How to answer"},
          {"t": "p", "runs": runs("This manual is written for **CSRs** — what they need to know about your department to handle "
                                  "a call well. It isn't a procedure manual for your team, so it deliberately leaves out how "
                                  "your team does its own work.")},
          {"t": "p", "runs": runs("Each question shows **the manual's current text** beneath it, so you don't need to look "
                                  "anything up. Tick **Correct** or **Needs change**, and add a note if something's wrong or "
                                  "missing. If you're unsure about one, say so — that's useful too.")}]
    shown = {}
    for g in s["groups"]:
        B.append({"t": "h2", "text": f"{g['num']}. {g['title']}"})
        if g.get("intro"):
            B.append({"t": "p", "runs": runs(g["intro"])})
        for r in g["rows"]:
            if "q" in r:
                B.append({"t": "h3", "runs": runs(f"{r['n']}. {r['q'].replace('**', '')}")})
                B.append({"t": "answer_open", "n": r["n"]})
                continue
            B.append({"t": "h3", "runs": runs(f"{r['n']}. {r['says'].replace('**', '')}")})
            if r.get("why"):
                B.append({"t": "why", "runs": runs(r["why"])})
            for sec in MRP.refs_for(r["sec"], key):
                if sec in shown:
                    B.append({"t": "pointer", "runs": runs(f"The text of {display(sec)} is shown with question {shown[sec]}.")})
                    continue
                t, body = MRP.excerpt(sec)
                if t is None:
                    continue
                shown[sec] = r["n"]
                B.append({"t": "excerpt", "title": t, "blocks": blocks(body)})
            B.append({"t": "answer", "n": r["n"]})
    B.append({"t": "closing", "runs": runs("Thank you. Please return this to the Customer Service Manager.")})
    return {"title": title, "blocks": B}


if __name__ == "__main__":
    for key in (sys.argv[1:] or MRP.SPEC.keys()):
        json.dump(model(key), open(f"/tmp/packet_{key}.json", "w", encoding="utf-8"), ensure_ascii=False)
        print(key, "model ok")
