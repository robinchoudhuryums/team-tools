#!/usr/bin/env python3
"""Parse a built manual .md into a JSON block model the docx renderer consumes."""
import json, re, sys, os
sys.path.insert(0, '.')
from numbering import display as dnum

SRC, DST = sys.argv[1], sys.argv[2]
raw = open(SRC).read()

PART_OF = {}  # section id -> part key, for accent colours


def inline(s):
    """Markdown inline -> runs. Handles bold, code, and resolved <a class="xr"> links."""
    s = re.sub(r'<a class="xr" href="#[^"]*">([^<]*)</a>', r"**\1**", s)
    s = re.sub(r'<span class="xr-bad">([^<]*)</span>', r"\1", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = s.replace("&amp;", "&").replace("&#183;", "\u00b7").replace("&#8212;", "\u2014")
    runs, pos = [], 0
    for m in re.finditer(r"\*\*(.+?)\*\*|`([^`]+)`|\*(.+?)\*", s):
        if m.start() > pos:
            runs.append({"t": s[pos:m.start()]})
        if m.group(1) is not None:
            runs.append({"t": m.group(1), "b": True})
        elif m.group(2) is not None:
            runs.append({"t": m.group(2), "c": True})
        else:
            runs.append({"t": m.group(3), "i": True})
        pos = m.end()
    if pos < len(s):
        runs.append({"t": s[pos:]})
    return [r for r in runs if r["t"]]


def split_row(line):
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    return [inline(c) for c in cells]


blocks = []
lines = raw.split("\n")
i = 0
cur_part = None
while i < len(lines):
    L = lines[i]

    # figures are dropped from the docx; handled separately as images
    if L.strip().startswith('<div class="fig">'):
        while i < len(lines) and "</div>" not in lines[i]:
            i += 1
        blocks.append({"k": "figure"})
        i += 1
        continue

    if L.strip().startswith("<!--card:"):
        blocks.append({"k": "pagebreak"})
        i += 1
        continue

    m = re.match(r"^(#{1,4}) (.+)$", L)
    if m:
        lvl, txt = len(m.group(1)), m.group(2)
        pm = re.match(r"Part (\d+)", txt)
        if lvl == 1 and pm:
            cur_part = "p" + pm.group(1)
        elif lvl == 1:
            cur_part = "ap"
        sec = re.match(r"(§[\w\-.]+)\s+(.*)$", txt)
        if sec:
            txt = dnum(sec.group(1)) + " " + sec.group(2)
        blocks.append({"k": "h", "lvl": lvl, "runs": inline(txt),
                       "part": cur_part, "sec": sec.group(1) if sec else None})
        i += 1
        continue

    if L.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|-]+\|$", lines[i + 1]):
        head = split_row(L)
        i += 2
        rows = []
        while i < len(lines) and lines[i].startswith("|"):
            rows.append(split_row(lines[i]))
            i += 1
        blocks.append({"k": "table", "head": head, "rows": rows, "part": cur_part})
        continue

    if L.startswith(">"):
        buf = []
        while i < len(lines) and lines[i].startswith(">"):
            stripped_line = lines[i][1:].lstrip()
            buf.append(stripped_line)
            i += 1
        while i < len(lines) and lines[i].strip() == "":
            i += 1
        body = "\n".join(buf).strip()
        kind = None
        km = re.match(r"\*\*(Critical|Policy|Watch-out|Script|Note)", body)
        if km:
            kind = km.group(1)
        sub = []
        for para in re.split(r"\n\s*\n", body):
            para = para.strip()
            if not para:
                continue
            if para.startswith("|"):
                pl = [x for x in para.split("\n") if x.startswith("|")]
                if len(pl) >= 2:
                    sub.append({"k": "table", "head": split_row(pl[0]),
                                "rows": [split_row(x) for x in pl[2:]]})
                    continue
            if re.match(r"^[-*] ", para) or re.match(r"^\d+\. ", para):
                for item in para.split("\n"):
                    sub.append({"k": "li", "runs": inline(re.sub(r"^(?:[-*]|\d+\.)\s+", "", item))})
                continue
            sub.append({"k": "p", "runs": inline(para.replace("\n", " "))})
        if kind and sub and sub[0].get("runs"):
            f = sub[0]["runs"][0]
            if f["t"].startswith(kind):
                rest = f["t"][len(kind):].lstrip(" \u2013\u2014:.-")
                if rest:
                    sub[0]["runs"][0] = dict(f, t=rest)
                else:
                    rest_runs = sub[0]["runs"][1:]
                    if rest_runs:
                        rest_runs[0] = dict(rest_runs[0],
                                            t=rest_runs[0]["t"].lstrip(" \u2013\u2014:.-"))
                        rest_runs = [r for r in rest_runs if r["t"]]
                    sub[0]["runs"] = rest_runs
        blocks.append({"k": "callout", "kind": kind or "Note", "body": sub, "part": cur_part})
        continue

    if re.match(r"^[-*] ", L) or re.match(r"^\d+\. ", L):
        ordered = bool(re.match(r"^\d+\. ", L))
        items = []
        while i < len(lines) and (re.match(r"^[-*] ", lines[i]) or re.match(r"^\d+\. ", lines[i])):
            items.append(inline(re.sub(r"^(?:[-*]|\d+\.)\s+", "", lines[i])))
            i += 1
        blocks.append({"k": "list", "ordered": ordered, "items": items, "part": cur_part})
        continue

    if L.strip() in ("---", "***"):
        blocks.append({"k": "rule"})
        i += 1
        continue

    if L.strip():
        buf = [L]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(
                r"^(#{1,4} |\||>|[-*] |\d+\. |---)", lines[i]):
            buf.append(lines[i])
            i += 1
        blocks.append({"k": "p", "runs": inline(" ".join(buf)), "part": cur_part})
        continue
    i += 1

json.dump({"blocks": blocks}, open(DST, "w"), ensure_ascii=False)
from collections import Counter
print(f"{len(blocks)} blocks:", dict(Counter(b['k'] for b in blocks)))
