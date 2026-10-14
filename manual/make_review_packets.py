#!/usr/bin/env python3
"""Build the departmental review packets, with the manual's current text beside each question.

Input : packets/spec.json            — the questions, with the sections each cites ("_" keys are notes)
        out/Policies-and-Procedures-Handbook-v3.0.md — the built manual, the source of every excerpt
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

ANSWER_LINE = "_" * 28   # the blank a reviewer types on (render_packet.js draws the same)

OUT = os.path.join(os.environ.get("MANUAL_OUT", "dist"), "review-packets")
MANUAL = open("out/Policies-and-Procedures-Handbook-v3.0.md", encoding="utf-8").read()
SPEC = json.load(open("packets/spec.json", encoding="utf-8"))
FAQ = {"p2": "§2-11", "p3": "§3-13", "p5": "§5-10", "p6": "§6-15", "p7": "§7-14",
       "p10": "§10-21", "denials": "§10-21"}   # Sales (p4) has no FAQ
MAX = 2400
NAMES = {"p2": "C2-Manual-Mobility", "p3": "C3-Respiratory-and-Resupply", "p4": "C4-Sales",
         "p5": "C5-Power-Mobility", "p6": "C6-Field-Operations", "p7": "C7-Service",
         "p10": "C10-Billing-and-Denials", "denials": "C10-Denials"}
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
    md = re.sub(r'<div class="fig"[^>]*>.*?</div>', "*[Diagram — see the handbook]*", md, flags=re.S)
    md = re.sub(r"<figure.*?</figure>", "*[Figure — see the handbook]*", md, flags=re.S)
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
                lambda m: "*[" + str(m.group(0).count("Figure")) + " figures — see the handbook]*", md)
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


def excerpts_for(r, key, shown, missing):
    """The manual text one question cites, shown ONCE per packet (operator
    2026-10-12: no excerpt repeated): a section an earlier question showed — or
    rows of it, when that question showed it in full — becomes a pointer back to
    that question. `shown` maps (sec, filter) to (question, body). Yields
    ("excerpt", title, body) or ("pointer", text), one pointer per source."""
    out, pointed = [], set()
    for sec, filt in refs_for(r.get("sec"), key):
        if (sec, filt) in shown:
            src = shown[(sec, filt)][0]
        else:
            title, body = excerpt(sec, filt, r.get("diagrams", False))
            if title is None:
                missing.append((r["n"], sec)); continue
            full = shown.get((sec, None))
            if filt and full and all(l in full[1] for l in body.split("\n") if l.strip()):
                src = full[0]  # these rows are already on the page, in the full section
            else:
                shown[(sec, filt)] = (r["n"], body)
                out.append(("excerpt", title + (" (excerpt)" if filt else ""), body))
                continue
        if (sec, src) not in pointed:
            pointed.add((sec, src))
            out.append(("pointer", f"The text of {display(sec)} is shown with question {src}."))
    return out


def excerpt_lines(items):
    L = []
    for it in items:
        L += [f"*{it[1]}*", ""] if it[0] == "pointer" else [f"#### From the handbook — {it[1]}", "", it[2], ""]
    return L


def is_closing(r):
    """The open-ended close every packet ends on."""
    return (r.get("says") or r.get("q") or "").startswith("**Anything else")


def spec_for(key, v=None):
    """A packet's spec, or one recipient's cut of it (operator 2026-10-12: a separate
    packet for each recipient who has questions flagged for them). `v` comes from the
    packet's "recipients" list: {"file", "for", "only": marker} keeps just the
    questions carrying the marker (and drops the marker, which needs no legend
    there) plus the packet's closing "Anything else?" (operator 2026-10-12);
    {"file", "for", "skip": marker} leaves those questions out (they are
    someone else's). Questions are renumbered; excerpts follow the once-per-packet
    rule within the cut, so a question never points at one the reader lacks."""
    if v is not None and "parts" in v:
        return combined_spec(v)
    s = SPEC[key]
    if v is None:
        return s
    lines = s["head"].strip().split("\n")
    mark = v.get("only") or v.get("skip")
    text = lambda r: r.get("says") or r.get("q") or ""
    closing = is_closing
    rows = [r for g in s["groups"] for r in g["rows"]
            if (mark in text(r)) == bool(v.get("only")) or closing(r)]
    head = [lines[0], "", f"**For:** {v['for']}"]
    if v.get("skip"):  # the other recipients' legends still apply
        head += [l for l in lines[1:] if l.startswith("**") and not l.startswith("**For:**") and mark not in l]
    out = []
    for i, r in enumerate(rows):
        r = dict(r, n=str(i + 1))
        if v.get("only"):
            for f in ("says", "q"):
                if f in r:
                    r[f] = r[f].replace(" " + mark, "").replace(mark, "")
        out.append(r)
    return {"head": "\n".join(head) + "\n\n", "groups": [{"num": "", "title": "", "intro": "", "rows": out}]}


def chapter_of(key):
    """'Chapter 5: Power Mobility', from the packet's own title line."""
    return SPEC[key]["head"].split("\n")[0].split(" — ", 1)[1]


def combined_spec(v):
    """One packet for a recipient flagged in more than one chapter (operator 2026-10-13:
    Ozaire had a Power packet and a Field Ops packet) — each chapter's cut under its
    own heading, the questions numbered straight through — and ONE closing "Anything
    else?" for all of them at the end (operator 2026-10-13), citing each chapter's
    resources section."""
    groups, n, closes = [], 0, []
    for k, vk in v["parts"]:
        rows = []
        for r in spec_for(k, vk)["groups"][0]["rows"]:
            if is_closing(r):
                closes.append(r); continue
            n += 1
            rows.append(dict(r, n=str(n)))
        groups.append({"num": "", "title": chapter_of(k), "intro": "", "key": k, "rows": rows})
    keys = [k for k, _ in v["parts"]]
    nums = [chapter_of(k).split(":")[0].replace("Chapter ", "") for k in keys]
    both = f"Chapters {', '.join(nums[:-1])} and {nums[-1]}"
    if closes:
        groups.append({"num": "", "title": "All " + both if len(nums) > 2 else "Both chapters", "intro": "",
                       "key": keys[-1], "rows": [{
            "sec": ", ".join(c["sec"] for c in closes if c.get("sec")),
            "q": f"**Anything else?** Is anything missing, out of date, or worth changing in {both} — and what "
                 f"should a CSR have ready before transferring a call to your team? **Resources** — any links "
                 f"to add to the resource lists of {both}?",
            "n": str(n + 1)}]})
    head = [f"# Review Packet — Chapters {', '.join(nums[:-1])} and {nums[-1]}", "",   # each chapter heads its own part
            f"**For:** {v['for']}"]
    return {"head": "\n".join(head) + "\n\n", "groups": groups}


def build_name(key, v=None):
    if v is not None and "parts" in v:
        return "-".join(NAMES[k].split("-")[0] for k, _ in v["parts"]) + "-" + v["file"]
    return NAMES[key] + ("-" + v["file"] if v else "")


def recipient_builds():
    """Each recipient's cut — and ONE packet for a recipient flagged in several chapters,
    at the place of their first."""
    cuts = [(k, v) for k in KEYS for v in SPEC[k].get("recipients", [])]
    out = []
    for k, v in cuts:
        mine = [(k2, v2) for k2, v2 in cuts if v2["file"] == v["file"]]
        if len(mine) == 1:
            out.append((k, v))
        elif mine[0][0] == k:
            who = v["for"].split(" — ", 1)[0]
            names = [chapter_of(k2).split(": ", 1)[1] for k2, _ in mine]
            out.append(("+".join(k2 for k2, _ in mine),
                        {"file": v["file"], "parts": mine,
                         "for": f"{who} — the {' and '.join(names)} questions marked for you"}))
    return out


# every file the build writes: each packet, then each recipient's cut of it
BUILDS = [(k, None) for k in KEYS] + recipient_builds()


def packet(key, v=None):
    s = spec_for(key, v)
    head = s["head"].rstrip()
    shown = {}
    L = [head, ""]
    missing = []
    for g in s["groups"]:
        if g["title"]:
            L += ["---", "", f"## {g['num'] + '. ' if g['num'] else ''}{g['title']}", ""]
        part = g.get("key", key)   # a combined packet's group names its own chapter
        if g.get("intro") and not g["intro"].startswith("|"):
            L += [g["intro"], ""]
        for r in g["rows"]:
            if "q" in r:                      # an open question — an excerpt only if it cites a section
                L += [f"**{r['n']}. {r['q'].replace('**', '')}**", ""]
                L += excerpt_lines(excerpts_for(r, part, shown, missing))
                if r.get("link"):  # a live document the question refers to, e.g. a team's own sheet
                    L += [f"**[{r['link']['text']}]({r['link']['url']})**", ""]
                L += ["**Your answer:**", "", "&nbsp;", ""]
                continue
            L += [f"### {r['n']}. {r['says'].replace('**', '')}", ""]
            if r.get("roster"):
                title, body, gone = directory_rows(r["roster"])
                missing += [(r["n"], "B.1 " + g) for g in gone]
                L += [f"#### From the handbook — {title}", "", body, ""]
            L += excerpt_lines(excerpts_for(r, part, shown, missing))
            if r.get("link"):  # e.g. the directory question's live roster sheet
                L += [f"**[{r['link']['text']}]({r['link']['url']})**", ""]
            # a fill-in line, not checkboxes: the packets go out as Google Docs, where
            # typing on a line is easier than ticking a box (operator 2026-10-12)
            L += [f"**Correct, or needs change?** {ANSWER_LINE}", "", "**Notes:**", "", "&nbsp;", ""]

    return "\n".join(L), missing


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for key, v in BUILDS:
        if sys.argv[1:] and key not in sys.argv[1:]:
            continue
        text, missing = packet(key, v)
        path = f"{OUT}/Review-Packet-{build_name(key, v)}.md"
        open(path, "w", encoding="utf-8").write(text)
        print(f"{key + (' · ' + v['file'] if v else ''):<24} {len(text):>7,} chars · {text.count('#### From the manual'):>2} excerpts"
              + (f" · MISSING {missing}" if missing else ""))
