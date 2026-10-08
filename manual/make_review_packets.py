#!/usr/bin/env python3
"""Build the departmental review packets, with the manual's current text beside each question.

Input : packets/spec.json            — the questions, with the sections each cites ("_" keys are notes)
        out/CSR-Procedures-Manual-v3.0.md — the built manual, the source of every excerpt
        $MANUAL_OUT/review-packets/images — the diagrams, from packet_diagrams.py
Output: $MANUAL_OUT/review-packets/Review-Packet-C<N>-<Name>.md

The format is the one approved on 2026-10-01/02: the header, then one numbered list —
each item with its excerpt(s) and an answer box. No instructions, group headings or
"why" lines; an open question carries its ask in its own text.

Re-run after any manual change: excerpts always reflect the current text.
"""
import json, re, sys, os
sys.path.insert(0, ".")
from numbering import display

OUT = os.path.join(os.environ.get("MANUAL_OUT", "dist"), "review-packets")
MANUAL = open("out/CSR-Procedures-Manual-v3.0.md", encoding="utf-8").read()
SPEC = json.load(open("packets/spec.json", encoding="utf-8"))
FAQ = {"p2": "§2-11", "p3": "§3-13", "p5": "§5-10", "p6": "§6-16", "p7": "§7-14",
       "p8": "§8-9", "p10": "§10-21", "denials": "§10-21"}   # Sales (p4) and After Hours (p9) have no FAQ
MAX = 2400
NAMES = {"p2": "C2-Manual-Mobility", "p3": "C3-Respiratory-and-Resupply", "p4": "C4-Sales",
         "p5": "C5-Power-Mobility", "p6": "C6-Field-Operations", "p7": "C7-Service", "p8": "C8-Oxygen",
         "p9": "C9-After-Hours", "p10": "C10-Billing-and-Denials", "denials": "C10-Denials"}
ROSTER = json.load(open("data/roster.json", encoding="utf-8"))
KEYS = [k for k in SPEC if not k.startswith("_")]   # "_about" and the like are notes, not packets


def refs_for(sec_field, part):
    out = []
    for tok in re.split(r",\s*", sec_field or ""):
        tok, _, filt = tok.strip().partition("~")
        if tok.upper() == "FAQ":
            if part in FAQ:
                out.append((FAQ[part], filt or None))
        elif re.match(r"^\d+\.[\dA-Z]+(\.\d+)?$", tok):
            a, rest = tok.split(".", 1)
            out.append((f"§{a}-{rest}", filt or None))
    return out


def clean(md):
    md = re.sub(r'<div class="fig"[^>]*>.*?aria-label="([^"]+)".*?</div>', r"[[DIAGRAM:\1]]", md, flags=re.S)
    md = re.sub(r'<div class="fig"[^>]*>.*?</div>', "*[Diagram — see the manual]*", md, flags=re.S)
    md = re.sub(r"<figure.*?</figure>", "*[Figure — see the manual]*", md, flags=re.S)
    md = re.sub(r"<img[^>]*>", "", md)
    md = re.sub(r'<span class="phase"[^>]*></span>', "", md)
    md = re.sub(r"<a [^>]*>(.*?)</a>", r"\1", md, flags=re.S)
    md = re.sub(r"<!--.*?-->", "", md, flags=re.S)
    md = re.sub(r"</?(?:span|div|strong|em)[^>]*>", "", md)
    md = md.replace("`[PENDING: URLs]`", "*[Links to be added]*")
    md = re.sub(r"`\[PENDING: ([^\]]+)\]`", r"*[To be added: \1]*", md)
    md = re.sub(r"`\[FIGURE: ([^\]]+)\]`", lambda m: "*[Figure to come: " + m.group(1).split(". ")[0].rstrip(".") + "]*", md)
    # several images in a row → one line
    md = re.sub(r"(\*\[Figure — see the manual\]\*)(?:\s*\n\s*\*\[Figure — see the manual\]\*)+",
                lambda m: "*[" + str(m.group(0).count("Figure")) + " figures — see the manual]*", md)
    md = re.sub(r"\n{3,}", "\n\n", md)
    return md.strip()


def only_rows(body, filt):
    """Keep a table's header and just the rows containing `filt`."""
    out, head = [], 0
    for ln in body.split("\n"):
        if ln.startswith("|"):
            head += 1
            if head <= 2 or filt.lower() in ln.lower():
                out.append(ln)
        elif not out:
            continue
    return "\n".join(out)


IMG_INDEX = {}
def diagram_md(label, show):
    """A diagram as an image (when the question asks for it and it's been rendered) or a placeholder."""
    global IMG_INDEX
    if not IMG_INDEX:
        p = os.path.join(OUT, "images", "index.json")
        IMG_INDEX = json.load(open(p)) if os.path.exists(p) else {"_": None}
    d = IMG_INDEX.get(label)
    return f"![{label}](images/{d['file']})" if (show and d) else ""


def excerpt(sec, filt=None, diagrams=False):
    m = re.search(r"^(#{2,3}) " + re.escape(sec) + r" ([^\n]+)\n", MANUAL, re.M)
    if not m:
        return None, None
    level, title = len(m.group(1)), m.group(2).strip()
    body_start = m.end()
    stop = re.compile(r"^#{1,%d} " % level, re.M)
    nxt = stop.search(MANUAL, body_start)
    end = nxt.start() if nxt else len(MANUAL)
    if level == 2 and not sec.endswith("-A"):   # a top-level section: its introduction, unless that's too thin
        sub = re.compile(r"^### ", re.M).search(MANUAL, body_start, end)
        if sub and len(clean(MANUAL[body_start:sub.start()])) > 180:
            end = sub.start()
    body = clean(MANUAL[body_start:end]).rstrip("-").strip()
    if filt:
        body = only_rows(body, filt)
    body = re.sub(r"\[\[DIAGRAM:([^\]]+)\]\]", lambda m: diagram_md(m.group(1), diagrams), body)
    # placeholders tell a reviewer nothing — drop them
    body = re.sub(r"^\s*\*\[(?:\d+ figures|Figure|Diagram) — see the manual\]\*\s*$", "", body, flags=re.M)
    body = re.sub(r"^\s*\*\[Figure to come:[^\]]*\]\*\s*$", "", body, flags=re.M)
    body = re.sub(r"\n{3,}", "\n\n", body).strip()
    limit = 12000 if sec.endswith("-A") else MAX      # the knowledge check needs its answer key
    if len(body) > limit:
        cut = body.rfind("\n", 0, limit)
        body = body[:cut].rstrip() + "\n\n*… continues in the manual.*"
    return f"{display(sec)} {title}", body


def directory_rows(which):
    """The reviewer's own rows of the B.1 directory, cut from the BUILT table, so the
    packet shows exactly what the manual prints. `which` is a chapter key (every row
    whose part it is) or a list of exact role names."""
    roles = {r["role"] for r in ROSTER if r["part"] == which} if isinstance(which, str) else set(which)
    m = re.search(r"^## §B-1 [^\n]*\n", MANUAL, re.M)
    lines = MANUAL[m.end():].split("\n") if m else []
    table, started = [], False
    for ln in lines:
        if ln.startswith("|"):
            started = True
            cells = [c.strip() for c in ln.strip("|").split("|")]
            if len(table) < 2 or cells[0] in roles:
                table.append(ln)
        elif started:
            break
    found = {ln.strip("|").split("|")[0].strip() for ln in table[2:]}
    return "B.1 Directory — your team's rows", "\n".join(table), sorted(roles - found)


def packet(key):
    s = SPEC[key]
    head = s["head"].rstrip()
    shown = {}
    L = [head, ""]
    missing = []
    for g in s["groups"]:
        if g["title"]:
            L += ["---", "", f"## {g['num']}. {g['title']}", ""]
        if g.get("intro") and not g["intro"].startswith("|"):
            L += [g["intro"], ""]
        for r in g["rows"]:
            if "q" in r:                      # an open question — an excerpt only if it cites a section
                L += [f"**{r['n']}. {r['q'].replace('**', '')}**", ""]
                for sec, filt in refs_for(r.get("sec"), key):
                    title, body = excerpt(sec, filt)
                    if title:
                        L += [f"#### From the manual — {title}" + (" (excerpt)" if filt else ""), "", body, ""]
                L += ["**Your answer:**", "", "&nbsp;", ""]
                continue
            L += [f"### {r['n']}. {r['says'].replace('**', '')}", ""]
            if r.get("roster"):
                title, body, gone = directory_rows(r["roster"])
                missing += [(r["n"], "B.1 " + g) for g in gone]
                L += [f"#### From the manual — {title}", "", body, ""]
            for sec, filt in refs_for(r.get("sec"), key):
                if (sec, filt) in shown:
                    L += [f"*The text of {display(sec)} is shown with question {shown[(sec, filt)]}.*", ""]
                    continue
                title, body = excerpt(sec, filt, r.get("diagrams", False))
                if title is None:
                    missing.append((r["n"], sec)); continue
                shown[(sec, filt)] = r["n"]
                L += [f"#### From the manual — {title}" + (" (excerpt)" if filt else ""), "", body, ""]
            L += ["**Your answer:** ☐ Correct &nbsp;&nbsp; ☐ Needs change", "", "**Notes:**", "", "&nbsp;", ""]

    return "\n".join(L), missing


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for key in (sys.argv[1:] or KEYS):
        text, missing = packet(key)
        path = f"{OUT}/Review-Packet-{NAMES[key]}.md"
        open(path, "w", encoding="utf-8").write(text)
        print(f"{key}: {len(text):>7,} chars · {text.count('#### From the manual'):>2} excerpts"
              + (f" · MISSING {missing}" if missing else ""))
