#!/usr/bin/env python3
"""Build the departmental review packets, with the manual's current text beside each question.

Input : packets/spec.json            — the questions, grouped, with the sections each cites
        out/CSR-Procedures-Manual-v3.0.md — the built manual, the source of every excerpt
Output: /mnt/user-data/outputs/review-packets-v3/Review-Packet-P*.md

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


def refs_for(sec_field, part):
    out = []
    for tok in re.split(r",\s*", sec_field):
        tok = tok.strip()
        if tok.upper() == "FAQ":
            if part in FAQ:
                out.append(FAQ[part])
        elif re.match(r"^\d+\.[\dA-Z]+(\.\d+)?$", tok):
            a, rest = tok.split(".", 1)
            out.append(f"§{a}-{rest}")
    return out


def clean(md):
    md = re.sub(r'<div class="fig"[^>]*>.*?</div>', "*[Diagram — see the manual]*", md, flags=re.S)
    md = re.sub(r"<figure.*?</figure>", "*[Figure — see the manual]*", md, flags=re.S)
    md = re.sub(r"<img[^>]*>", "", md)
    md = re.sub(r'<span class="phase"[^>]*></span>', "", md)
    md = re.sub(r"<a [^>]*>(.*?)</a>", r"\1", md, flags=re.S)
    md = re.sub(r"<!--.*?-->", "", md, flags=re.S)
    md = re.sub(r"</?(?:span|div|strong|em)[^>]*>", "", md)
    md = re.sub(r"`\[FIGURE: ([^\]]+)\]`", lambda m: "*[Figure to come: " + m.group(1).split(". ")[0].rstrip(".") + "]*", md)
    # several images in a row → one line
    md = re.sub(r"(\*\[Figure — see the manual\]\*)(?:\s*\n\s*\*\[Figure — see the manual\]\*)+",
                lambda m: "*[" + str(m.group(0).count("Figure")) + " figures — see the manual]*", md)
    md = re.sub(r"\n{3,}", "\n\n", md)
    return md.strip()


def excerpt(sec):
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
    L = [head, "",
         "## How to answer", "",
         "This manual is written for **CSRs** — what they need to know about your department to handle a call "
         "well. It isn't a procedure manual for your team, so it deliberately leaves out how your team does its "
         "own work.", "",
         "Each question shows **the manual's current text** beneath it, so you don't need to look anything up. "
         "Tick **Correct** or **Needs change**, and add a note if something's wrong or missing. If you're unsure "
         "about one, say so — that's useful too.", ""]
    missing = []
    for g in s["groups"]:
        L += ["---", "", f"## {g['num']}. {g['title']}", ""]
        if g["intro"] and not g["intro"].startswith("|"):
            L += [g["intro"], ""]
        for r in g["rows"]:
            if "q" in r:                      # an open question: no section, no excerpt
                L += [f"**{r['n']}. {r['q'].replace('**', '')}**", "", "**Your answer:**", "", "&nbsp;", ""]
                continue
            L += [f"### {r['n']}. {r['says'].replace('**', '')}", ""]
            if r.get("why"):
                L += [f"*Why we're asking:* {r['why']}", ""]
            if r.get("roster"):
                title, body, gone = directory_rows(r["roster"])
                missing += [(r["n"], "B.1 " + g) for g in gone]
                L += [f"#### From the manual — {title}", "", body, ""]
            for sec in refs_for(r.get("sec", ""), key):
                if sec in shown:
                    L += [f"*The text of {display(sec)} is shown with question {shown[sec]}.*", ""]
                    continue
                title, body = excerpt(sec)
                if title is None:
                    missing.append((r["n"], sec)); continue
                shown[sec] = r["n"]
                L += [f"#### From the manual — {title}", "", body, ""]
            L += ["**Your answer:** ☐ Correct &nbsp;&nbsp; ☐ Needs change", "", "**Notes:**", "", "&nbsp;", ""]
    L += ["---", "", "*Thank you. Please return this to the Customer Service Manager.*", ""]
    return "\n".join(L), missing


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for key in (sys.argv[1:] or SPEC.keys()):
        text, missing = packet(key)
        path = f"{OUT}/Review-Packet-{NAMES[key]}.md"
        open(path, "w", encoding="utf-8").write(text)
        print(f"{key}: {len(text):>7,} chars · {text.count('#### From the manual'):>2} excerpts"
              + (f" · MISSING {missing}" if missing else ""))
