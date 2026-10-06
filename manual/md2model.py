#!/usr/bin/env python3
"""Parse a built manual .md into a JSON block model the docx renderer consumes.

Runs (inline pieces) are {"t": text} with b/i/c flags, or:
  {"img": dataUri, "h": px}            an inline image (icon, product photo)
  {"t": text, "link": url}             an external link
  {"t": text, "anchor": bookmark}      a cross-reference to a heading or a directory row
Blocks add {"k": "image"} (a screenshot with its caption) and {"k": "diagram"}
(rendered to PNG by rasterize_diagrams.py). A heading that must start a page
carries "pb" — the break rides the heading itself, never a separate paragraph
that can land alone on an otherwise empty page.
"""
import json, re, sys, os
sys.path.insert(0, '.')
from numbering import display as dnum
import roles

SRC, DST = sys.argv[1], sys.argv[2]
raw = open(SRC).read()
ROSTER = json.load(open("data/roster.json"))
ROLE_BY_NAME = {r["role"]: r for r in ROSTER}
OWNER = re.search(r'^OWNER = "([^"]+)"', open("build.py").read(), re.M).group(1)


def bookmark(anchor_id):
    """An HTML anchor id as a Word bookmark name (a letter first; letters, digits, _)."""
    return "x_" + re.sub(r"[^A-Za-z0-9]", "_", anchor_id)


TOKEN = re.compile(
    r'<img\s[^>]*>'
    r'|<a class="xr" href="#([^"]*)">(.*?)</a>'
    r'|\[([^\]]+)\]\((https?://[^)\s]+|mailto:[^)\s]+)\)', re.S)


def _attr(tag, name):
    m = re.search(r'\s' + name + r'="([^"]*)"', tag)
    return m.group(1) if m else ""


def _text(s):
    s = re.sub(r'<span class="xr-bad">([^<]*)</span>', r"\1", s)
    s = re.sub(r"<[^>]+>", "", s)
    return (s.replace("&amp;", "&").replace("&#183;", "·").replace("&#8212;", "—")
             .replace("&lt;", "<").replace("&gt;", ">"))


def emphasis(s):
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
    return runs


def inline(s):
    """Markdown inline -> runs: emphasis, code, images, links and cross-references."""
    runs, pos = [], 0
    for m in TOKEN.finditer(s):
        if m.start() > pos:
            runs += emphasis(_text(s[pos:m.start()]))
        tok = m.group(0)
        if tok.startswith("<img"):
            src = _attr(tok, "src")
            if src.startswith("data:image/"):
                runs.append({"img": src, "h": 38 if _attr(tok, "class") == "thumb" else 14})
        elif m.group(1) is not None:
            runs.append({"t": _text(m.group(2)), "b": True, "anchor": bookmark(m.group(1))})
        else:
            runs.append({"t": _text(m.group(3)), "link": m.group(4)})
        pos = m.end()
    if pos < len(s):
        runs += emphasis(_text(s[pos:]))
    return [r for r in runs if r.get("t") or r.get("img")]


def split_row(line):
    cells = [c.strip() for c in re.split(r"(?<!\\)\|", line.strip().strip("|"))]
    return [inline(c.replace("\\|", "|")) for c in cells]


def plain(runs):
    return "".join(r.get("t", "") for r in runs).strip()


FIGURE = re.compile(r'<img\s[^>]*src="(data:image/[^"]+)"[^>]*>(?:\s*<figcaption>(.*?)</figcaption>)?', re.S)

blocks = []
lines = raw.split("\n")
i = 0
cur_part = None
cur_sec = None
pending_pb = False
in_notes = False
while i < len(lines):
    L = lines[i]
    S = L.strip()

    # a diagram: rendered to PNG by rasterize_diagrams.py, embedded by the renderer
    if S.startswith('<div class="fig"'):
        name = _attr(S, "data-diagram")
        while i < len(lines) and "</div>" not in lines[i]:
            i += 1
        blocks.append({"k": "diagram", "name": name})
        i += 1
        continue

    # a screenshot (or a pair of them) with its caption
    if S.startswith("<figure"):
        buf = [L]
        while "</figure>" not in buf[-1] and i + 1 < len(lines):
            i += 1
            buf.append(lines[i])
        for m in FIGURE.finditer("\n".join(buf)):
            blocks.append({"k": "image", "src": m.group(1), "cap": inline(m.group(2) or "")})
        i += 1
        continue

    # the dashboard icon tables (HTML in the source)
    if S.startswith('<table class="icons">'):
        buf = [L]
        while "</table>" not in buf[-1] and i + 1 < len(lines):
            i += 1
            buf.append(lines[i])
        t = "\n".join(buf)
        head = [inline(h) for h in re.findall(r"<th[^>]*>(.*?)</th>", t, re.S)]
        rows = [[inline(c) for c in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)]
                for tr in re.findall(r"<tr>(.*?)</tr>", t, re.S) if "<td" in tr]
        blocks.append({"k": "table", "head": head, "rows": rows, "part": cur_part})
        i += 1
        continue

    if S.startswith("<!--"):
        if S.startswith("<!--card:"):
            pending_pb = True
        elif S == "<!--notes-->":
            in_notes = True
        i += 1
        continue

    m = re.match(r"^(#{1,4}) (.+)$", L)
    if m:
        in_notes = False
        lvl, txt = len(m.group(1)), re.sub(r"\s*\{#[\w-]+\}\s*$", "", m.group(2))
        pm = re.match(r"Part (\d+)", txt)
        if lvl == 1 and pm:
            cur_part = "p" + pm.group(1)
        elif lvl == 1:
            cur_part = "ap"
        sec = re.match(r"(§[\w\-.]+)\s+(.*)$", txt)
        if sec:
            txt = dnum(sec.group(1)) + " " + sec.group(2)
            if lvl <= 3:
                cur_sec = sec.group(1)
        blocks.append({"k": "h", "lvl": lvl, "runs": inline(txt), "part": cur_part,
                       "sec": sec.group(1) if sec else None,
                       "bm": bookmark(sec.group(1)[1:].replace(".", "_")) if sec else None,
                       "pb": pending_pb or lvl == 1})
        pending_pb = False
        i += 1
        continue

    if L.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|-]+\|$", lines[i + 1]):
        head = split_row(L)
        i += 2
        rows, bms = [], []
        while i < len(lines) and lines[i].startswith("|"):
            row = split_row(lines[i])
            rows.append(row)
            r = ROLE_BY_NAME.get(plain(row[0])) if cur_sec == "§B-1" and row else None
            bms.append(bookmark(roles.anchor(r)) if r else None)
            i += 1
        b = {"k": "table", "head": head, "rows": rows, "part": cur_part}
        if any(bms):
            b["bm"] = bms
        blocks.append(b)
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
            if f.get("t", "").startswith(kind):
                rest = f["t"][len(kind):].lstrip(" –—:.-")
                if rest:
                    sub[0]["runs"][0] = dict(f, t=rest)
                else:
                    rest_runs = sub[0]["runs"][1:]
                    if rest_runs and "t" in rest_runs[0]:
                        rest_runs[0] = dict(rest_runs[0],
                                            t=rest_runs[0]["t"].lstrip(" –—:.-"))
                        rest_runs = [r for r in rest_runs if r.get("t") or r.get("img")]
                    sub[0]["runs"] = rest_runs
        blocks.append({"k": "callout", "kind": kind or "Note", "body": sub, "part": cur_part})
        continue

    if re.match(r"^[-*] ", L) or re.match(r"^\d+\. ", L):
        ordered = bool(re.match(r"^\d+\. ", L))
        items = []
        while i < len(lines) and (re.match(r"^[-*] ", lines[i]) or re.match(r"^\d+\. ", lines[i])
                                  or (items and re.match(r"^\s{2,}\S", lines[i]))):
            if re.match(r"^\s{2,}\S", lines[i]) and not re.match(r"^\s*(?:[-*]|\d+\.)\s", lines[i]):
                items[-1] = items[-1] + [{"t": " "}] + inline(lines[i].strip())
            else:
                items.append(inline(re.sub(r"^\s*(?:[-*]|\d+\.)\s+", "", lines[i])))
            i += 1
        blocks.append({"k": "list", "ordered": ordered, "items": items, "part": cur_part})
        continue

    if S in ("---", "***"):
        in_notes = False
        blocks.append({"k": "rule"})
        i += 1
        continue

    if S:
        buf = [L]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(
                r"^(#{1,4} |\||>|[-*] |\d+\. |---|<(?:div|figure|table|!--))", lines[i]):
            buf.append(lines[i])
            i += 1
        b = {"k": "p", "runs": inline(" ".join(buf)), "part": cur_part}
        if in_notes:
            b["small"] = True
        if b["runs"]:
            blocks.append(b)
        continue
    i += 1

json.dump({"meta": {"owner": OWNER}, "blocks": blocks}, open(DST, "w"), ensure_ascii=False)
from collections import Counter
print(f"{len(blocks)} blocks:", dict(Counter(b['k'] for b in blocks)))
