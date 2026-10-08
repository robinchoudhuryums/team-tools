#!/usr/bin/env python3
"""Render the built manual as a single self-contained HTML page.

Design follows the Stage 0 conventions: palette sampled from the March 2026
guides, the five callout types, and the per-part accent colours.
"""
import re, sys, html, markdown
sys.path.insert(0, '.')
from numbering import display as dnum, old_forms
from built_date import built_date
BUILT = built_date()   # one date for the sidebar and the card footers

# The chapter colours and icons — data/chapter_style.json is the one source
# (operator 2026-10-07); the palette and every icon below are drawn from it.
import json as _jcs
CHAPTERS = _jcs.load(open("data/chapter_style.json", encoding="utf-8"))
def chapter_icon(part, cls, size=None):
    """The chapter's icon as inline SVG (decorative), or "" for an appendix."""
    c = CHAPTERS["parts"].get(part)
    if not c:
        return ""
    wh = f' width="{size}" height="{size}"' if size else ""
    return (f'<svg class="chi {cls}" viewBox="0 0 24 24"{wh} aria-hidden="true" focusable="false">'
            f'{CHAPTERS["icons"][c["icon"]]}</svg>')
def palette(theme):
    return " ".join(f'--{k}:{v[theme]};' for k, v in CHAPTERS["parts"].items())

SRC, DST = sys.argv[1], sys.argv[2]
raw = open(SRC).read()

# Strip the generated markdown TOC — the page builds its own navigation.
raw = re.sub(r"## Contents\n(?:.*\n)*?(?=\n---\n)", "", raw, count=1)

CALLOUTS = ["Critical", "Policy", "Watch-out", "Script", "Note"]

def tag_callouts(text):
    out, lines = [], text.split("\n")
    i = 0
    while i < len(lines):
        m = re.match(r"^> \*\*(" + "|".join(CALLOUTS) + r")(\b[^*]*)\*\*(.*)$", lines[i])
        if m:
            kind = m.group(1).lower().replace("-", "")
            block = [f"> **{m.group(1)}{m.group(2)}**{m.group(3)}"]
            i += 1
            while i < len(lines) and (lines[i].startswith(">") or lines[i].strip() == ">"):
                block.append(lines[i]); i += 1
            body = "\n".join(l[2:] if l.startswith("> ") else l[1:] for l in block)
            body = re.sub(r"^\*\*" + re.escape(m.group(1)) + r"\s*(?:—|-)?\s*", "**", body, count=1)
            body = re.sub(r"^\*\*\*\*\s*", "", body)
            body = re.sub(r"^\*\*\.?\*\*\s*", "", body)
            body = re.sub(r"^[\s\u2014\u2013-]+", "", body)
            body = re.sub(r"^(\*\*)?([a-z])", lambda mm: (mm.group(1) or "") + mm.group(2).upper(), body, count=1)
            inner = markdown.markdown(body, extensions=["tables", "sane_lists"])
            out.append(f'<aside class="cb cb-{kind}"><span class="cb-k">{m.group(1)}</span>{inner}</aside>')
        else:
            out.append(lines[i]); i += 1
    return "\n".join(out)

raw = tag_callouts(raw)
body = markdown.markdown(raw, extensions=["tables", "sane_lists", "attr_list", "md_in_html"])
# a "☐ item" list is a checklist: the box replaces the bullet
body = re.sub(r"<li>☐\s*", '<li class="chk">☐ ', body)

# Anchor every §-numbered heading and collect navigation entries.
nav, part = [], None
SEEN_H1 = {}
PART_LABEL = {}
PART_LABEL_PENDING = ['']
def anchor(m):
    global part
    lvl, txt = m.group(1), m.group(2)
    plain = re.sub(r"<[^>]+>", "", txt)
    sec = re.match(r"(§[\w\-.]+)\s", plain)
    if lvl == "1":
        PART_LABEL_PENDING[0] = re.sub(r"<[^>]+>", "", txt)
        pm = re.match(r"((?:Part|Chapter) (\d+)|Appendix ([A-Z]))", plain)
        if pm and pm.group(2):
            part = "p" + pm.group(2)
        elif pm and pm.group(3):
            part = "ap" + pm.group(3).lower()
        else:
            part = "top"
        hid = part
        if hid in SEEN_H1:
            hid = f"{part}-{SEEN_H1[part]}"
        SEEN_H1[part] = SEEN_H1.get(part, 0) + 1
        nav.append((1, plain, hid, part))
        PART_LABEL[part] = re.sub(r"\s*—\s*", " · ", plain.replace("#", "").strip())
        badge = chapter_icon(part, "pic")
        if badge:
            badge = f'<span class="pbadge">{badge}</span>'
        return f'<h1 id="{hid}" class="part {part}">{badge}<span class="pt">{txt}</span></h1>'
    if sec:
        sid = sec.group(1)[1:].replace(".", "_")
        shown = dnum(sec.group(1))
        cls = "sn card" if shown.startswith("CARD") else "sn"
        txt = txt.replace(sec.group(1), f'<span class="{cls}">{shown}</span>', 1)
        plain = plain.replace(sec.group(1), shown, 1)
        if lvl == "2":
            nav.append((2, plain, sid, part))
            eb = PART_LABEL.get(part, "")
            pre = (f'<div class="eyerow"><span class="eyebrow {part}">{chapter_icon(part, "eic", 12)}{eb}</span>'
                   f'<button class="pinbtn" data-id="{sid}" title="Pin this section">+ Pin</button></div>'
                   ) if eb and not sid.startswith("C-") else ""
            return (pre + f'<h{lvl} id="{sid}">{txt}'
                    f'<a class="ah" href="#{sid}" title="Copy link to this section" '
                    f'aria-label="Link to this section">#</a></h{lvl}>')
        return (f'<h{lvl} id="{sid}">{txt}'
                f'<a class="ah" href="#{sid}" title="Copy link to this section" '
                f'aria-label="Link to this section">#</a></h{lvl}>')
    return m.group(0)

body = re.sub(r"<h([1-4])>(.*?)</h\1>", anchor, body)
_ix_letters = re.findall(r'<h3 id="ix-([0-9a-z])">([^<]*)</h3>', body)
body = body.replace('<h2 id="E-1">',
    '<div id="ixwrap"><input id="ixq" type="search" placeholder="Filter the index…" '
    'autocomplete="off" aria-label="Filter index"><div class="ixaz" role="navigation" aria-label="Index letters">'
    + "".join(f'<a href="#ix-{k}">{html.escape(t)}</a>' for k, t in _ix_letters)
    + '</div></div><h2 id="E-1">', 1)
from bs4 import BeautifulSoup as _BS

def classify_tables(html):
    """Every table stays a table. It used to become a stacked key -> value list when
    it had two short columns — the index letters G/J/Q/V, the 2.3.1 specifications,
    the 5.2 check/where list and the 7.6 symptom/action table all lost their columns
    that way, in the HTML only (operator 2026-10-06). Two conventions are drawn:
      * a table whose first header is "Step" is a STEP table — numbered, with an
        arrow down to the next step;
      * a header that opens with \u2713 or \u2717 tints its column — green for what
        to do or say, red for what not to (the Do's & Don'ts tables).
    Word (render_docx.js) and the Reference renderer (kbMd_) draw the same two."""
    soup = _BS(html, "html.parser")
    stats = {"compact": 0, "matrix": 0, "steps": 0, "dodont": 0}
    for tbl in soup.find_all("table"):
        if tbl.get("class") and "icons" in tbl.get("class"):
            continue
        head = tbl.find("thead")
        ths = head.find_all("th") if head else []
        heads = [th.get_text(" ", strip=True) for th in ths]
        body_rows = tbl.find("tbody").find_all("tr") if tbl.find("tbody") else []
        ncol = max([len(heads)] + [len(r.find_all("td")) for r in body_rows] or [0])
        nrow = len(body_rows)
        cls = "matrix" if (ncol >= 4 or nrow >= 12) else "compact"
        extra = []
        if heads and heads[0].strip().lower() == "step":
            extra.append("steps")
            stats["steps"] += 1
        tone = {i: ("ok" if h.startswith("\u2713") else "no")
                for i, h in enumerate(heads) if h[:1] in ("\u2713", "\u2717")}
        if tone:
            extra.append("dodont")
            stats["dodont"] += 1
            for i, t in tone.items():
                ths[i]["class"] = (ths[i].get("class") or []) + [t]
            for r in body_rows:
                tds = r.find_all("td")
                for i, t in tone.items():
                    if i < len(tds):
                        tds[i]["class"] = (tds[i].get("class") or []) + [t]
        tbl["class"] = (tbl.get("class") or []) + [cls] + extra
        stats[cls] += 1
    print(f"tables: {stats['compact']} compact  {stats['matrix']} matrix  "
          f"({stats['steps']} step, {stats['dodont']} do/don't)")
    return str(soup)


import json as _json0
from roles import anchor as _role_anchor
_ROLE_ID = {r["role"]: _role_anchor(r) for r in _json0.load(open("data/roster.json"))}


def anchor_roles(html):
    """Each row of the B.1 directory gets its role's id, so a role link lands on the
    PERSON — and its preview shows that row — instead of the top of the table."""
    soup = _BS(html, "html.parser")
    h = soup.find(id="B-1")
    tbl = h.find_next("table") if h else None
    n = 0
    if tbl:
        for tr in (tbl.find("tbody").find_all("tr") if tbl.find("tbody") else []):
            td = tr.find("td")
            rid = _ROLE_ID.get(td.get_text(" ", strip=True)) if td else None
            if rid:
                tr["id"] = rid
                n += 1
    print(f"directory    : {n} role rows anchored")
    return str(soup)


def wrap_notes(html):
    """A section's footnotes (footnotes.py marks them <!--notes-->) set in small type."""
    soup = _BS(html, "html.parser")
    from bs4 import Comment
    for c in [x for x in soup.find_all(string=lambda t: isinstance(t, Comment)) if x.strip() == "notes"]:
        box = soup.new_tag("div")
        box["class"] = ["fnotes"]
        node = c.next_sibling
        c.replace_with(box)
        while node is not None:
            nxt = node.next_sibling
            if getattr(node, "name", None) not in (None, "p"):
                break
            box.append(node.extract())
            node = nxt
    return str(soup)


def wrap_cards(html):
    """A card is a <!--card:pN--> marker up to the next card or the next <hr>.
    Wrap it in <section class="qrc pN">, and each group heading with its content
    in <div class="qg">, so cards can carry a border, a grid and a page break."""
    soup = _BS(html, "html.parser")
    from bs4 import Comment
    markers = [c for c in soup.find_all(string=lambda t: isinstance(t, Comment))
               if c.strip().startswith("card:")]
    for c in markers:
        part = c.strip().split(":")[1]
        sec = soup.new_tag("section")
        sec["class"] = ["qrc", part]
        node = c.next_sibling
        c.replace_with(sec)
        while node is not None:
            nxt = node.next_sibling
            if isinstance(node, Comment) and node.strip().startswith("card:"):
                break
            if getattr(node, "name", None) in ("hr", "h1"):
                break
            sec.append(node.extract())
            node = nxt
        # the CARD chip carries its chapter's icon (the marker names the chapter)
        chip = sec.find("span", class_="card")
        ic = chapter_icon(part, "cic", 14)
        if chip is not None and ic:
            chip.insert(0, _BS(ic, "html.parser"))
        # group headings with what follows them
        kids = [k for k in sec.children if getattr(k, "name", None) or str(k).strip()]
        group = None
        for k in list(sec.children):
            nm = getattr(k, "name", None)
            if nm == "h3":
                group = soup.new_tag("div")
                group["class"] = ["qg"]
                k.insert_before(group)
                label = soup.new_tag("div")
                label["class"] = ["ql"]
                label.string = k.get_text(" ", strip=True)
                body = soup.new_tag("div")
                body["class"] = ["qb"]
                group.append(label)
                group.append(body)
                k.extract()
                continue
            if nm == "p" and k.find("strong") and k.get_text(strip=True).startswith("Never"):
                k["class"] = ["never"]
                lab = k.find("strong")
                tail = lab.next_sibling
                if tail is not None and isinstance(tail, str):
                    tail.replace_with(tail.lstrip(" \u2014\u2013-"))
                rest = soup.new_tag("span")
                for n in list(lab.next_siblings):
                    rest.append(n.extract())
                k.append(rest)
                group = None
                continue
            if group is not None and nm in ("ul", "ol", "p", "div", "table", "blockquote", "dl"):
                group.find("div", class_="qb").append(k.extract())
    # running head + folio inside each card, and a contents sheet before the first
    cards = soup.find_all("section", class_="qrc")
    if cards:
        toc = soup.new_tag("section")
        toc["id"] = "cardtoc"
        h = soup.new_tag("div"); h["class"] = ["qrh"]
        l = soup.new_tag("span"); l.string = "Quick Reference"
        r = soup.new_tag("span"); r.string = "Contents"
        h.append(l); h.append(r); toc.append(h)
        t = soup.new_tag("h2"); t["class"] = ["toch"]; t.string = "Quick reference cards"
        toc.append(t)
        lst = soup.new_tag("ol"); lst["class"] = ["toclist"]
        for i, c in enumerate(cards, start=2):
            part = next((x for x in c.get("class", []) if x.startswith("p")), "p0")
            head = c.find("h2")
            num = head.find("span", class_="sn")
            title = head.get_text(" ", strip=True)
            if num:
                title = title.replace(num.get_text(strip=True), "", 1).strip().rstrip("#").strip()
            li = soup.new_tag("li"); li["class"] = [part]
            sw = soup.new_tag("i"); sw["class"] = ["sw"]
            ic = chapter_icon(part, "tic", 16)
            if ic:
                sw.append(_BS(ic, "html.parser"))
            li.append(sw)
            n = soup.new_tag("span"); n["class"] = ["cn"]
            n.string = (num.get_text(strip=True) if num else "").replace("CARD ", "")
            li.append(n)
            nm = soup.new_tag("span"); nm["class"] = ["ct"]; nm.string = title; li.append(nm)
            pg = soup.new_tag("span"); pg["class"] = ["cp"]; pg.string = str(i); li.append(pg)
            lst.append(li)
        toc.append(lst)
        f = soup.new_tag("div"); f["class"] = ["qrf"]
        fa = soup.new_tag("span"); fa.string = f"Built {BUILT}"
        fb = soup.new_tag("span"); fb.string = "1"
        f.append(fa); f.append(fb); toc.append(f)
        cards[0].insert_before(toc)
    for i, c in enumerate(cards, start=2):
        head = c.find("h2")
        partname = ""
        if head:
            partname = head.get_text(" ", strip=True)
            n = head.find("span", class_="sn")
            if n:
                partname = partname.replace(n.get_text(strip=True), "", 1)
            partname = partname.strip().rstrip("#").strip()
        rh = soup.new_tag("div"); rh["class"] = ["qrh"]
        a = soup.new_tag("span"); a.string = "Quick Reference"
        bb = soup.new_tag("span"); bb.string = partname
        rh.append(a); rh.append(bb)
        c.insert(0, rh)
        fo = soup.new_tag("div"); fo["class"] = ["qrf"]
        fa = soup.new_tag("span"); fa.string = f"Built {BUILT}"
        fb = soup.new_tag("span"); fb.string = str(i)
        fo.append(fa); fo.append(fb)
        c.append(fo)
    return str(soup)


body = wrap_cards(body)
body = classify_tables(body)
body = anchor_roles(body)
body = wrap_notes(body)
# the front page is its own panel: build.py brackets it with <!--start--> markers
body = body.replace("<!--start-->", '<section class="start" aria-label="How to use this manual">', 1)
body = body.replace("<!--/start-->", "</section>", 1)
body = re.sub(r"<table", '<div class="tw"><table', body)
body = re.sub(r"</table>", "</table></div>", body)

def build_router(html):
    """Caller phrases from the §1-1 router table, with their groups and targets.
    Real data authored in the manual — nothing invented."""
    soup = _BS(html, "html.parser")
    rows, group = [], ""
    h = soup.find(id="1-1")
    if not h:
        return rows
    node = h
    while True:
        node = node.find_next()
        if node is None:
            break
        nm = getattr(node, "name", "")
        if nm == "h2" and node is not h:
            break
        if nm == "h3":
            group = re.sub(r"^[\d.]+\s*", "", node.get_text(" ", strip=True)).rstrip("#").strip()
        elif nm == "tr":
            cells = node.find_all("td")
            if len(cells) != 2:
                continue
            phrase = cells[0].get_text(" ", strip=True)
            links = cells[1].find_all("a", class_="xr")
            if not links:
                continue
            answer = cells[1].get_text(" ", strip=True)
            for p in re.split(r"\s*/\s*(?=[\"\u201c])", phrase):
                p = p.strip()
                if len(p) < 4:
                    continue
                rows.append({"g": group, "q": p.strip('"\u201c\u201d'),
                             "i": links[0].get("href", "")[1:], "a": answer,
                             "all": [l.get("href", "")[1:] for l in links]})
    return rows


ROUTER = build_router(body)
ALIASES = {}
for _r in ROUTER:
    for _t in _r["all"]:
        ALIASES.setdefault(_t, set()).add(_r["q"].lower().rstrip("."))
ALIASES = {k: sorted(v) for k, v in ALIASES.items()}
print(f"router       : {len(ROUTER)} caller phrases in "
      f"{len({r['g'] for r in ROUTER})} groups")
print(f"aliases      : {sum(len(v) for v in ALIASES.values())} phrases "
      f"across {len(ALIASES)} sections")

# searchable records: id, label, body snippet
import json as _json, html as _html
# the October 2026 renumber: a section is also found by the number it had before
FORMERLY = _json.load(open("data/renumber-2026-10.json", encoding="utf-8"))["formerly"]
SEARCH = []
for m in re.finditer(r'<h([23]) id="([\w_.-]+)">(.*?)</h\1>(.*?)(?=<h[123]|\Z)', body, re.S):
    label = re.sub(r'<a\b[^>]*class="ah"[^>]*>.*?</a>', "", m.group(3))
    label = re.sub(r"<[^>]+>", "", label).strip()
    raw = re.sub(r'<span class="cb-k">[^<]*</span>', " ", m.group(4))
    raw = re.sub(r'<img[^>]*alt="([^"]*)"[^>]*>', r" \1 ", raw)
    raw = re.sub(r"</(p|li|td|h3|h4|div)>", ". ", raw)
    txt = re.sub(r"<[^>]+>", " ", raw)
    txt = _html.unescape(re.sub(r"\s+", " ", txt)).strip()
    txt = re.sub(r"\s*\.\s*\.", ".", txt)
    txt = re.sub(r"([.:;,])\s*\.", r"\1", txt)[:600]
    sid = m.group(2)
    src = "§" + sid.replace("_", ".") if re.match(r"^[0-9A-Z]+-", sid) else ""
    nums = old_forms(src) if src else []
    if src in FORMERLY:
        was = FORMERLY[src]
        nums = nums + [f for f in old_forms(was) if f not in nums] + ["formerly " + dnum(was)]
    SEARCH.append({"i": sid, "t": label, "b": txt,
                   "a": " ".join(nums),
                   "p": ALIASES.get(sid, [])})

navhtml = []
open_part = None
for lvl, txt, tid, p in nav:
    if lvl == 1 and tid == "top":
        navhtml.append(f'<a class="ntop" href="#top">Front matter &amp; how to use</a>')
        continue
    if lvl == 1:
        if open_part is not None:
            navhtml.append("</div></details>")
        navhtml.append(f'<details class="ng {p or ""}"><summary class="n1 {p or ""}">'
                       f'{chapter_icon(p, "nic", 15)}<a href="#{tid}">{html.escape(html.unescape(txt))}</a></summary><div class="ngb">')
        open_part = p
    else:
        t2 = html.unescape(txt)
        mnum = re.match(r"^((?:CARD \d+)|(?:[0-9A-Z]+\.[0-9A-Z]+(?:\.[0-9]+)*))\s+(.*)$", t2)
        if mnum:
            navhtml.append(f'<a class="n2" href="#{tid}"><span class="nn">{html.escape(mnum.group(1))}</span>'
                           f'<span class="nt">{html.escape(mnum.group(2))}</span></a>')
        else:
            navhtml.append(f'<a class="n2" href="#{tid}">{html.escape(t2)}</a>')
if open_part is not None:
    navhtml.append("</div></details>")

TPL = r"""<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CSR Procedures Manual v3.0</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{
  --navy:#1C3A5E; --accent:#3D72A4; --tint:#EBF2FA; --ink:#1F1F1F;
  --muted:#5D6B7A; --rule:#DCE3EB; --bg:#FFFFFF; --panel:#F7F9FC;
  __PAL_LIGHT__
  --hit:#2E7D5B; --pin:#8A6D1B;
  --crit-bg:#FDECEA; --crit-ink:#B3261E;
  --pol-bg:#EBF2FA;  --pol-ink:#1C3A5E;
  --watch-bg:#FFF3CD;--watch-ink:#856404;
  --scr-bg:#E3F2F1;  --scr-ink:#0F6E6E;
  --note-bg:#F4F4F4; --note-ink:#555555; --thead-ink:#FFFFFF;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --navy:#9EC2E6; --accent:#7FB0DC; --tint:#17222E; --ink:#E6EAEF;
  --muted:#9AA7B4; --rule:#2A3947; --bg:#0F161D; --panel:#141D26;
  __PAL_DARK__
  --hit:#63BE95; --pin:#D6B45C;
  --crit-bg:#2C1512; --crit-ink:#F29E95;
  --pol-bg:#152230;  --pol-ink:#9EC2E6;
  --watch-bg:#2C2410;--watch-ink:#E5C978;
  --scr-bg:#12262A;  --scr-ink:#7FCCC6;
  --note-bg:#1A222B; --note-ink:#A8B3BE; --thead-ink:#0F161D;
}}
:root[data-theme="dark"]{
  --navy:#9EC2E6; --accent:#7FB0DC; --tint:#17222E; --ink:#E6EAEF;
  --muted:#9AA7B4; --rule:#2A3947; --bg:#0F161D; --panel:#141D26;
  __PAL_DARK__
  --hit:#63BE95; --pin:#D6B45C;
  --crit-bg:#2C1512; --crit-ink:#F29E95; --pol-bg:#152230; --pol-ink:#9EC2E6;
  --watch-bg:#2C2410;--watch-ink:#E5C978; --scr-bg:#12262A; --scr-ink:#7FCCC6;
  --note-bg:#1A222B; --note-ink:#A8B3BE; --thead-ink:#0F161D;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
 font-family:"IBM Plex Sans",ui-sans-serif,system-ui,sans-serif;
 font-size:16px;line-height:1.6;-webkit-text-size-adjust:100%}
.wrap{display:grid;grid-template-columns:288px minmax(0,1fr);gap:0;max-width:1320px;margin:0 auto}
nav{position:sticky;top:0;align-self:start;max-height:100vh;overflow-y:auto;
 padding:28px 20px 60px;border-right:1px solid var(--rule);background:var(--panel)}
nav .brand{font-weight:700;color:var(--navy);font-size:15px;line-height:1.3;margin-bottom:4px}
nav .ver{color:var(--muted);font-size:13px;margin-bottom:14px}
#q{width:100%;padding:8px 10px;font:inherit;font-size:13.5px;color:var(--ink);
 background:var(--bg);border:1px solid var(--rule);border-radius:5px;margin-bottom:14px}
#q:focus{outline:2px solid var(--accent);outline-offset:-1px;border-color:var(--accent)}
#res{margin-bottom:14px}
#res a{display:block;padding:7px 10px;border-left:3px solid var(--accent);
 background:var(--bg);border-radius:0 4px 4px 0;margin-bottom:5px;text-decoration:none}
#res .rt{display:block;font-size:13px;font-weight:600;color:var(--navy)}
#res .rs{display:block;font-size:12px;color:var(--muted);line-height:1.4;margin-top:2px}
#res .rn{padding:7px 10px;font-size:13px;color:var(--muted)}
mark{background:var(--watch-bg);color:inherit;padding:0 1px;border-radius:2px}
:target{scroll-margin-top:16px}
:target > :first-child, h2:target, h3:target{animation:flash 1.6s ease-out}
@keyframes flash{from{background:var(--watch-bg)}to{background:transparent}}
nav a{display:block;text-decoration:none;color:var(--ink);font-size:13.5px;
 padding:3px 0 3px 12px;border-left:3px solid transparent}
nav a:hover{color:var(--accent)}
nav a.n1{font-weight:600;margin-top:16px;font-size:14px;color:var(--navy)}
nav a.n1.p0{border-left-color:var(--p0)} nav a.n1.p1{border-left-color:var(--p1)}
nav a.n1.p2{border-left-color:var(--p2)} nav a.n1.p3{border-left-color:var(--p3)}
nav a.n1.p4{border-left-color:var(--p4)} nav a.n1.p5{border-left-color:var(--p5)}
nav a.n1.p6{border-left-color:var(--p6)} nav a.n1.p7{border-left-color:var(--p7)}
nav a.n1.p8{border-left-color:var(--p8)} nav a.n1.p9{border-left-color:var(--p9)}
nav a.n1.p10{border-left-color:var(--p10)}
nav a.n1[class*="ap"]{border-left-color:var(--muted)}
nav a.n2{color:var(--muted);padding-left:24px}
main{padding:44px 52px 120px;min-width:0;max-width:none}
h1.part{font-size:30px;line-height:1.2;margin:72px 0 28px;padding:0 0 12px 18px;
 border-left:6px solid var(--navy);border-bottom:1px solid var(--rule);color:var(--navy)}
h1.part.p0{border-left-color:var(--p0);color:var(--p0)} h1.part.p1{border-left-color:var(--p1);color:var(--p1)}
h1.part.p2{border-left-color:var(--p2);color:var(--p2)} h1.part.p3{border-left-color:var(--p3);color:var(--p3)}
h1.part.p4{border-left-color:var(--p4);color:var(--p4)} h1.part.p5{border-left-color:var(--p5);color:var(--p5)}
h1.part.p6{border-left-color:var(--p6);color:var(--p6)} h1.part.p7{border-left-color:var(--p7);color:var(--p7)}
h1.part.p8{border-left-color:var(--p8);color:var(--p8)} h1.part.p9{border-left-color:var(--p9);color:var(--p9)}
h1.part.p10{border-left-color:var(--p10);color:var(--p10)}
h1:first-of-type{margin-top:0}
h2{font-size:21px;color:var(--navy);margin:44px 0 12px;line-height:1.25}
h3{font-size:17px;color:var(--accent);margin:30px 0 10px}
h4{font-size:15px;margin:22px 0 8px}
p{margin:0 0 14px}
a{color:var(--accent)}
hr{border:0;border-top:1px solid var(--rule);margin:40px 0}
code{background:var(--tint);padding:1px 5px;border-radius:3px;font-size:.9em}
h2[id^="C-"]{background:var(--panel);border:1px solid var(--rule);border-left:5px solid var(--accent);
 border-radius:0 5px 0 0;margin:36px 0 0;padding:12px 16px;font-size:18px}
h2[id^="C-"] + p, h2[id^="C-"] ~ *{}
svg a.xr{cursor:pointer}
span.phase{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:8px;vertical-align:0}
.fig svg rect,.fig svg polygon,.fig svg path,.fig svg line,.fig svg circle{pointer-events:none}
.fig svg a.xr,.fig svg a.xr *{pointer-events:auto}
svg a.xr:hover,svg a.xr:focus{text-decoration:underline}
figure.shot{margin:6px 0 24px;max-width:860px;border:1px solid var(--rule);border-radius:4px;
 background:#fff;padding:10px}
figure.shot img{display:block;max-width:100%;height:auto;margin:0 auto}
figure.shot.pair{display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:640px}
figure.shot.pair img{max-height:230px;object-fit:contain}
figure.shot figcaption{font-size:13px;color:#5D6B7A;margin-top:8px;text-align:center}
main > figure.shot{max-width:860px}
@media print{figure.shot{break-inside:avoid}}
img.thumb{float:left;width:52px;height:52px;object-fit:contain;margin:1px 12px 2px 0;
 background:#fff;border:1px solid var(--rule);border-radius:3px;padding:2px}
td:has(> img.thumb){min-width:210px}
@media print{img.thumb{width:40px;height:40px}}
img.ico{height:1.15em;width:auto;vertical-align:-0.2em;margin:0 2px}
table.icons{border-collapse:collapse;width:100%;font-size:14px}
table.icons th{background:var(--navy);color:var(--thead-ink);text-align:left;padding:9px 12px;font-weight:600}
table.icons td{padding:8px 12px;border-top:1px solid var(--rule);vertical-align:middle}
table.icons tbody tr:nth-child(even){background:var(--tint)}
table.icons td.ic{width:56px;text-align:center}
table.icons td.ic img{height:22px;width:auto}
.fig{overflow-x:auto;margin:0 0 10px;padding:14px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.fig svg{min-width:760px;width:100%;height:auto;display:block}
.tw{overflow-x:auto;margin:0 0 20px;border:1px solid var(--rule);border-radius:4px}
table{border-collapse:collapse;width:100%;font-size:14px}
th{background:var(--navy);color:var(--thead-ink);text-align:left;padding:9px 12px;font-weight:600;
 position:static}
td{padding:8px 12px;border-top:1px solid var(--rule);vertical-align:top}
tbody tr:nth-child(even){background:var(--tint)}
.cb{margin:0 0 20px;padding:13px 16px 13px 15px;border-left:4px solid;border-radius:0 4px 4px 0;font-size:14.5px}
.cb p:last-child{margin-bottom:0}
.cb .cb-k{display:block;font-weight:700;font-size:11.5px;letter-spacing:.04em;margin-bottom:5px;opacity:.85}
.cb table{font-size:13.5px;background:var(--bg)}
.cb-critical{background:var(--crit-bg);border-color:var(--crit-ink);color:var(--crit-ink)}
.cb-policy{background:var(--pol-bg);border-color:var(--pol-ink);color:var(--pol-ink)}
.cb-watchout{background:var(--watch-bg);border-color:var(--watch-ink);color:var(--watch-ink)}
.cb-script{background:var(--scr-bg);border-color:var(--scr-ink);color:var(--scr-ink)}
.cb-note{background:var(--note-bg);border-color:var(--note-ink);color:var(--note-ink)}
.cb-critical a,.cb-policy a,.cb-watchout a,.cb-script a,.cb-note a{color:inherit}
blockquote{border-left:3px solid var(--rule);margin:0 0 18px;padding:2px 0 2px 16px;color:var(--muted)}
ul,ol{margin:0 0 16px;padding-left:22px}
li{margin-bottom:5px}
strong{font-weight:600}
img{max-width:100%;height:auto}
.navtoggle{display:none}
@media (max-width:900px){
 .wrap{grid-template-columns:1fr}
 nav{position:static;max-height:none;border-right:0;border-bottom:1px solid var(--rule)}
 main{padding:28px 20px 80px}
 h1.part{font-size:25px;margin-top:48px}
}

/* nav groups */
nav details.ng{margin:0}
nav details.ng > summary{list-style:none;cursor:pointer;display:flex;align-items:center;
 gap:6px;margin-top:16px;padding:3px 0 3px 12px;border-left:3px solid transparent}
nav details.ng > summary::-webkit-details-marker{display:none}
nav details.ng > summary::before{content:"▸";font-size:10px;color:var(--muted);
 transition:transform .15s ease}
nav details.ng[open] > summary::before{transform:rotate(90deg)}
nav details.ng > summary a{display:inline;padding:0;border:0;font-weight:600;font-size:14px;
 color:var(--navy)}
nav summary.p0{border-left-color:var(--p0)} nav summary.p1{border-left-color:var(--p1)}
nav summary.p2{border-left-color:var(--p2)} nav summary.p3{border-left-color:var(--p3)}
nav summary.p4{border-left-color:var(--p4)} nav summary.p5{border-left-color:var(--p5)}
nav summary.p6{border-left-color:var(--p6)} nav summary.p7{border-left-color:var(--p7)}
nav summary.p8{border-left-color:var(--p8)} nav summary.p9{border-left-color:var(--p9)}
nav summary.p10{border-left-color:var(--p10)}
nav summary[class*="ap"]{border-left-color:var(--muted)}
nav .ngb{padding-left:4px}
nav a.n2.cur{color:var(--accent);border-left-color:var(--accent);background:var(--tint)}
/* cross-reference links */
a.xr{color:var(--accent);text-decoration:none;border-bottom:1px solid transparent}
a.xr:hover{border-bottom-color:var(--accent)}
.xr-bad{color:var(--crit-ink);font-weight:600}
/* heading anchors */
.ah{opacity:0;margin-left:8px;font-weight:400;color:var(--muted);text-decoration:none;
 font-size:.8em;transition:opacity .12s}
h2:hover .ah,h3:hover .ah,.ah:focus{opacity:1}
.ah.ok{opacity:1;color:var(--accent)}
/* mobile */
.navtoggle{display:none;position:sticky;top:0;z-index:20;width:100%;padding:11px 20px;
 font:600 14px 'IBM Plex Sans',sans-serif;color:var(--navy);background:var(--panel);
 border:0;border-bottom:1px solid var(--rule);text-align:left;cursor:pointer}
@media (max-width:900px){
 .navtoggle{display:block}
 nav{display:none;position:static;max-height:none;border-right:0;border-bottom:1px solid var(--rule)}
 nav.show{display:block}
}
/* print */
@media print{
 :root{--bg:#fff;--ink:#000;--panel:#fff;--tint:#f2f5f9;--rule:#ccc}
 nav,.navtoggle,#q,#res{display:none!important}
 .wrap{display:block;max-width:none}
 main{padding:0;max-width:none}
 .ah{display:none}
 h1.part{break-before:page}
 h2,h3{page-break-after:avoid}
 .tw,table,.cb,.fig{page-break-inside:avoid}
 a.xr{color:#000;border:0}
 a[href^="#"]::after{content:""}
}

/* index filter */
#ixwrap{position:sticky;top:0;z-index:5;background:var(--bg);padding:10px 0 12px;
 margin-bottom:-4px;border-bottom:1px solid var(--rule)}
#ixq{width:100%;max-width:420px;padding:8px 10px;font:inherit;font-size:14px;color:var(--ink);
 background:var(--bg);border:1px solid var(--rule);border-radius:5px}
#ixq:focus{outline:2px solid var(--accent);outline-offset:-1px;border-color:var(--accent)}
.ixhide{display:none!important}
/* density */
.dens{display:flex;gap:4px;margin:14px 0 4px}
.dens button{flex:1;padding:4px 6px;font:600 11px 'IBM Plex Sans',sans-serif;color:var(--muted);
 background:var(--bg);border:1px solid var(--rule);border-radius:4px;cursor:pointer}
.dens button[aria-pressed="true"]{color:var(--bg);background:var(--accent);border-color:var(--accent)}
:root[data-density="compact"] body{font-size:14.5px;line-height:1.48}
:root[data-density="compact"] td,:root[data-density="compact"] th{padding:5px 9px}
:root[data-density="compact"] table{font-size:13px}
:root[data-density="compact"] p{margin-bottom:9px}
:root[data-density="compact"] .cb{padding:9px 13px;margin-bottom:13px;font-size:13.5px}
:root[data-density="compact"] h2{margin:28px 0 8px;font-size:19px}
:root[data-density="compact"] h3{margin:20px 0 7px}
:root[data-density="compact"] h1.part{margin:44px 0 18px}
:root[data-density="compact"] li{margin-bottom:2px}
/* search keyboard selection */
#res a.sel{outline:2px solid var(--accent);outline-offset:-2px}

/* ---------------------------------------------- type scale & rhythm --- */
body{font-size:16px;line-height:1.62}
main{max-width:none}
h1.part{font-size:31px;letter-spacing:-.01em}
h2{font-size:22px;letter-spacing:-.005em;margin:46px 0 14px}
h3{font-size:15px;margin:30px 0 8px;text-transform:uppercase;letter-spacing:.07em;
 font-weight:700;color:var(--muted)}
h4{font-size:15.5px;margin:24px 0 8px}
p{margin:0 0 15px}
h2 + p,h3 + p,h2 + .kv,h3 + .kv,h2 + .tw,h3 + .tw,h2 + .cb,h3 + .cb{margin-top:0}
ul,ol{margin:0 0 18px;padding-left:20px}
li{margin-bottom:6px}

/* ------------------------------------------------ key/value blocks ---- */
dl.kv{margin:0 0 20px;padding:0}
dl.kv .kvh{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;
 color:var(--muted);margin:0 0 8px}
dl.kv dt{font-weight:600;color:var(--navy);font-size:15px;margin-top:11px}
dl.kv dt:first-of-type{margin-top:0}
dl.kv dd{margin:2px 0 0 0;padding-left:14px;border-left:2px solid var(--rule);
 color:var(--ink);font-size:15px}
dl.kv dd > p{margin:0}

/* ------------------------------------------------------- tables ------- */
.tw{border:0;border-radius:0;margin:0 0 22px}
table.compact{font-size:14.5px}
table.compact th{background:transparent;color:var(--muted);font-size:11px;font-weight:700;
 letter-spacing:.07em;text-transform:uppercase;padding:0 10px 6px;
 border-bottom:2px solid var(--navy);position:static}
table.compact td{padding:9px 10px;border-top:1px solid var(--rule)}
table.compact tbody tr:nth-child(even){background:transparent}
table.compact tbody tr:hover{background:var(--tint)}
table.matrix{font-size:13.5px}
table.matrix th{background:var(--navy);color:var(--thead-ink);padding:8px 11px;
 font-size:12px;letter-spacing:.03em}
table.matrix td{padding:7px 11px}
table.matrix tbody tr:nth-child(even){background:var(--tint)}

/* -------------------------------------------- part context bar -------- */
#ctx{position:sticky;top:0;z-index:8;display:flex;align-items:baseline;gap:10px;
 padding:9px 0 9px 14px;margin:0 0 6px;background:var(--bg);
 border-bottom:1px solid var(--rule);border-left:4px solid var(--cur,var(--navy));
 font-size:12.5px;color:var(--muted);transition:border-color .2s}
#ctx b{color:var(--cur,var(--navy));font-weight:700;font-size:13px}
#ctx span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media (max-width:900px){#ctx{top:41px}}
@media print{#ctx{display:none}}

/* numbering (4c): dotted section numbers in mono, cards as a filled block */
.sn{font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:500;color:var(--muted);
 font-size:.78em;letter-spacing:.01em;margin-right:.55em}
h2 .sn{font-size:.62em}
.sn.card{display:inline-block;background:var(--navy);color:var(--thead-ink);font-weight:600;
 padding:3px 10px;border-radius:3px;font-size:.66em;letter-spacing:.04em;vertical-align:.12em}
nav a .sn{font-size:12px;color:var(--muted);display:inline-block;min-width:3.4em;margin-right:.3em}

/* ======================================================= type scale (5c) === */
h1.part{font-size:40px;font-weight:700;letter-spacing:-.02em;line-height:1.1}
h2{font-size:34px;font-weight:700;letter-spacing:-.015em;line-height:1.12;margin:52px 0 16px}
h2 .sn{font-size:.42em;vertical-align:.32em}
h3{font-size:20px;font-weight:600;line-height:1.3;margin:32px 0 10px;text-transform:none;
 letter-spacing:0;color:var(--navy)}
h3 .sn{font-size:.7em;margin-right:12px}
body{font-size:16px;line-height:1.65}
.cb{font-size:15px;line-height:1.55;padding:18px 22px}
.cb .cb-k{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;font-weight:600;
 letter-spacing:.14em;text-transform:uppercase}
.mono{font-family:'IBM Plex Mono',ui-monospace,monospace}

/* ============================================== quick reference cards (9a) === */
section.qrc{--acc:var(--navy);border:1px solid var(--rule);padding:44px 48px 36px;
 margin:0 0 40px;background:var(--bg);max-width:816px;box-sizing:border-box}
section.qrc.p0{--acc:var(--p0)} section.qrc.p1{--acc:var(--p1)} section.qrc.p2{--acc:var(--p2)}
section.qrc.p3{--acc:var(--p3)} section.qrc.p4{--acc:var(--p4)} section.qrc.p5{--acc:var(--p5)}
section.qrc.p6{--acc:var(--p6)} section.qrc.p7{--acc:var(--p7)} section.qrc.p8{--acc:var(--p8)}
section.qrc.p9{--acc:var(--p9)} section.qrc.p10{--acc:var(--p10)}
section.qrc h2{font-size:26.5px;margin:0 0 20px;padding-bottom:14px;border-bottom:2px solid var(--navy);
 display:flex;align-items:center;gap:14px;background:none;border-left:0;border-top:0;border-right:0}
section.qrc h2 .sn.card{background:var(--acc);font-size:15.5px;padding:4px 12px;vertical-align:0}
section.qrc > p{font-size:14.5px;color:var(--muted);margin:0 0 16px}
section.qrc > p.never{color:var(--ink);font-size:15px;margin:14px 0 0}
.qg{display:grid;grid-template-columns:132px 1fr;gap:0 24px;border-top:1px solid var(--rule);
 padding:12px 0}
.qg:first-of-type{border-top:0}
.ql{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px;font-weight:700;
 letter-spacing:.12em;text-transform:uppercase;color:var(--acc);padding-top:3px;line-height:1.35}
.qb{font-size:15.5px;line-height:1.5}
.qb ul,.qb ol{margin:0;padding-left:0}
.qb ul{list-style:none}
.qb ul > li{position:relative;padding-left:17px;margin-bottom:7px}
.qb ul > li::before{content:"";position:absolute;left:0;top:.62em;width:5px;height:5px;
 background:var(--acc)}
.qb ol{padding-left:20px}
.qb ol > li::marker{color:var(--acc);font-family:'IBM Plex Mono',monospace;font-weight:600}
.qb .tw{margin:4px 0 8px}
.qb li:last-child{margin-bottom:0}
p.never{display:grid;grid-template-columns:132px 1fr;gap:0 24px;margin:14px 0 0;
 padding:12px 12px 12px 0;background:var(--crit-bg);color:var(--ink);font-size:15px;line-height:1.5;
 border-top:1px solid var(--rule)}
p.never > strong:first-child{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px;
 letter-spacing:.12em;text-transform:uppercase;color:var(--crit-ink);padding-left:12px;
 padding-top:2px}
@media (max-width:700px){
 section.qrc{padding:26px 20px}
 .qg,p.never{grid-template-columns:1fr;gap:4px}
}

/* measure: prose is capped at 74ch; cards, tables and figures may run wider */
main > p, main > ul, main > ol, main > h2, main > h3, main > h4, main > dl,
main > blockquote, main > aside.cb, main > .kv, main > h1.part{max-width:74ch}
main > .tw{max-width:92ch}
main > .fig{max-width:1180px}
section.qrc{width:816px;max-width:100%}

/* ================================================= screen layout (5a) === */
.wrap{grid-template-columns:300px minmax(0,1fr) 196px;max-width:1500px}
@media (max-width:1240px){.wrap{grid-template-columns:280px minmax(0,1fr)} #otp{display:none}}
/* nav: only the current part is expanded */
nav a.ntop{display:block;font-size:13px;color:var(--muted);padding:4px 0 10px 12px;text-decoration:none}
nav a.ntop:hover{color:var(--accent)}
nav details.ng > summary{margin-top:2px;padding:6px 10px 6px 12px;border-radius:0 3px 3px 0}
nav details.ng[open] > summary{background:var(--tint);font-weight:600}
nav details.ng > summary::before{content:"\203A";font-size:14px}
nav details.ng[open] > summary::before{transform:rotate(90deg)}
nav a.n2{display:flex;gap:0;padding:4px 8px 4px 22px;border-left:3px solid transparent;font-size:13px}
nav a.n2 .nn{flex:none;width:44px;font-family:'IBM Plex Mono',ui-monospace,monospace;
 font-size:12px;color:var(--muted);padding-top:1px}
nav a.n2 .nt{flex:1;min-width:0}
nav a.n2.cur{background:var(--tint);font-weight:600;color:var(--ink);
 border-left-color:var(--nacc,var(--accent))}
nav details.p0{--nacc:var(--p0)} nav details.p1{--nacc:var(--p1)} nav details.p2{--nacc:var(--p2)}
nav details.p3{--nacc:var(--p3)} nav details.p4{--nacc:var(--p4)} nav details.p5{--nacc:var(--p5)}
nav details.p6{--nacc:var(--p6)} nav details.p7{--nacc:var(--p7)} nav details.p8{--nacc:var(--p8)}
nav details.p9{--nacc:var(--p9)} nav details.p10{--nacc:var(--p10)}
/* breadcrumb replaces the context bar */
#ctx{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px;color:var(--muted);
 padding:12px 0;border-left:0;justify-content:space-between;align-items:center;gap:16px;
 margin:0 0 8px}
#ctx .bc{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
#ctx .bc b{color:var(--cur,var(--navy));font-weight:600;font-size:12px}
#ctx .bc i{font-style:normal}
#ctx .bc i:not(:empty)::before{content:"  /  ";white-space:pre;color:var(--rule)}
#ctx .cardchip{flex:none;font-size:11.5px;font-weight:600;letter-spacing:.06em;
 color:var(--thead-ink);background:var(--cur,var(--navy));padding:3px 10px;border-radius:3px;
 text-decoration:none}
#ctx .cardchip:hover{filter:brightness(1.1)}
/* eyebrow */
.eyebrow{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;font-weight:600;
 letter-spacing:.14em;text-transform:uppercase;margin:52px 0 -40px;color:var(--navy)}
.eyebrow.p0{color:var(--p0)} .eyebrow.p1{color:var(--p1)} .eyebrow.p2{color:var(--p2)}
.eyebrow.p3{color:var(--p3)} .eyebrow.p4{color:var(--p4)} .eyebrow.p5{color:var(--p5)}
.eyebrow.p6{color:var(--p6)} .eyebrow.p7{color:var(--p7)} .eyebrow.p8{color:var(--p8)}
.eyebrow.p9{color:var(--p9)} .eyebrow.p10{color:var(--p10)}
main > .eyebrow{max-width:74ch}
/* on-this-page rail */
#otp{position:sticky;top:0;align-self:start;max-height:100vh;overflow-y:auto;
 padding:28px 18px 60px 14px;font-size:13.5px}
#otp .otph{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;font-weight:600;
 letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
#otpl a{display:block;padding:4px 0 4px 11px;border-left:2px solid var(--rule);color:var(--muted);
 text-decoration:none;line-height:1.35}
#otpl a:hover{color:var(--accent)}
#otpl a.on{border-left-color:var(--cur,var(--accent));color:var(--ink);font-weight:600}
#otpl .otpn{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11.5px;margin-right:6px}
@media print{#otp,.eyebrow{display:none}}
/* headers inside a scrolling table container can't stick to the viewport; keep them in flow */
.tw th{position:static!important;top:auto!important}

/* ============================================ card chrome + print (step 4) === */
.qrh,.qrf{display:flex;justify-content:space-between;align-items:baseline;
 font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12.5px;letter-spacing:.08em;
 text-transform:uppercase;color:var(--muted)}
.qrh{padding-bottom:9px;margin-bottom:22px;border-bottom:1px solid var(--rule)}
.qrf{padding-top:11px;margin-top:22px;border-top:1px solid var(--rule)}
section.qrc{display:flex;flex-direction:column}
section.qrc > .qrf{margin-top:auto;padding-top:20px}
#cardtoc{width:816px;max-width:100%;border:1px solid var(--rule);padding:44px 48px 36px;
 margin:0 0 40px;display:flex;flex-direction:column;box-sizing:border-box}
#cardtoc > .qrf{margin-top:auto;padding-top:20px}
#cardtoc .toch{font-size:26.5px;margin:0 0 20px;padding-bottom:14px;
 border-bottom:2px solid var(--navy);max-width:none}
ol.toclist{list-style:none;margin:0;padding:0}
ol.toclist li{display:grid;grid-template-columns:14px 44px 1fr 40px;align-items:baseline;
 gap:0 12px;padding:9px 0;border-bottom:1px solid var(--rule);font-size:15.5px}
ol.toclist .sw{display:inline-block}
ol.toclist .cn,ol.toclist .cp{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:13px;
 color:var(--muted)}
ol.toclist .cp{text-align:right}

@page{size:Letter;margin:.45in}
@media print{
 :root{--bg:#fff;--ink:#000;--panel:#fff;--rule:#ccc}
 body{font-size:13px;line-height:1.48}
 nav,.navtoggle,#q,#res,#otp,#ctx,.ah,.eyebrow,#ixwrap,.dens{display:none!important}
 .wrap{display:block;max-width:none}
 main{padding:0;max-width:none}
 /* only the cards and their contents sheet print */
 main > *{display:none!important}
 main > #cardtoc, main > section.qrc{display:block!important}
 section.qrc,#cardtoc{display:block!important;border:0;width:auto;max-width:none;
  padding:0;margin:0}
 section.qrc > .qrf,#cardtoc > .qrf{margin-top:28px}
 section.qrc{break-before:page}
 #cardtoc{break-after:auto}
 section.qrc h2,#cardtoc .toch{font-size:23px}
 .qb{font-size:13px}
 .ql,.qrh,.qrf{font-size:10.5px}
 ol.toclist li{font-size:13px}
 .qg,p.never{break-inside:avoid}
 a.xr{color:#000;border:0;text-decoration:none}
}

/* search: alias hits, miss capture */
#res .alh{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10.5px;font-weight:600;
 letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:2px 0 6px}
#res .alh2{margin-top:14px;padding-top:10px;border-top:1px solid var(--rule)}
#res a.ali{border:1px solid var(--hit);border-left-width:3px;padding:9px 10px;margin-bottom:7px}
#res .alc{display:inline-block;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9.5px;
 font-weight:600;letter-spacing:.1em;color:#fff;background:var(--hit);padding:2px 6px;
 border-radius:2px;margin-bottom:5px}
#res .sibs{display:block;font-size:11.5px;color:var(--muted);margin-top:5px}
#res .chip{display:inline-block;border:1px solid var(--rule);border-radius:10px;padding:1px 7px;
 margin:2px 3px 0 0;font-size:11px}
.misscap{margin-top:10px;padding:11px 12px;border:1px dashed var(--pin);border-radius:4px}
.misscap .mch{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10.5px;font-weight:600;
 letter-spacing:.1em;text-transform:uppercase;color:var(--pin);margin-bottom:6px}
.misscap p{font-size:12px;color:var(--muted);line-height:1.45;margin:0 0 8px}
.misscap button{font:inherit;font-size:12px;padding:5px 10px;border:1px solid var(--pin);
 background:var(--bg);color:var(--pin);border-radius:3px;cursor:pointer;width:100%}
.misscap button:disabled{opacity:.55;cursor:default}
.mcnote{font-size:11.5px;color:var(--muted);margin-top:7px}

/* pin control, pinned & recent */
.eyerow{display:flex;align-items:center;gap:12px;margin:52px 0 -40px}
.eyerow .eyebrow{margin:0}
.pinbtn{font:inherit;font-size:10.5px;font-family:'IBM Plex Mono',ui-monospace,monospace;
 letter-spacing:.08em;color:var(--muted);background:var(--bg);border:1px solid var(--rule);
 border-radius:3px;padding:2px 7px;cursor:pointer;opacity:0;transition:opacity .12s}
.eyerow:hover .pinbtn,.pinbtn:focus{opacity:1}
.pinbtn.on{opacity:1;color:var(--pin);border-color:var(--pin)}
#pinbox[hidden]{display:none}
#pinbox{margin:0 0 16px}
#pinbox .pbh{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10.5px;font-weight:600;
 letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:0 0 6px}
#pinbox .pbh2{margin-top:14px}
#pinlist a,#recentlist a{display:flex;align-items:baseline;gap:6px;font-size:12.5px;
 text-decoration:none;color:var(--ink);padding:4px 6px;line-height:1.3}
#pinlist a{background:var(--bg);border-left:3px solid var(--pin);margin-bottom:3px}
#recentlist a{color:var(--muted)}
#pinlist a:hover,#recentlist a:hover{color:var(--accent)}
#pinlist .x{margin-left:auto;color:var(--muted);font-size:12px;padding:0 3px}
#recentlist .age{margin-left:auto;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10.5px;
 color:var(--muted);flex:none}
#pinbox .empty{font-size:11.5px;color:var(--muted);padding:2px 6px}
@media print{#pinbox,.pinbtn{display:none}}

/* call router */
#openrouter{width:100%;margin:0 0 12px;font:inherit;font-size:12.5px;font-weight:600;
 padding:7px 10px;color:var(--thead-ink);background:var(--navy);border:0;border-radius:4px;
 cursor:pointer;text-align:left}
#openrouter:hover{filter:brightness(1.12)}
#router[hidden]{display:none}
#router{position:fixed;inset:0;z-index:60;background:rgba(15,22,29,.42);display:flex;
 align-items:center;justify-content:center;padding:28px}
.rtbox{background:var(--bg);border:1px solid var(--rule);border-radius:6px;width:min(1080px,100%);
 height:min(680px,100%);display:flex;flex-direction:column;overflow:hidden;
 box-shadow:0 18px 50px rgba(0,0,0,.28)}
.rthead{display:flex;align-items:center;justify-content:space-between;padding:13px 18px;
 border-bottom:1px solid var(--rule)}
.rthead b{font-size:15px;color:var(--navy)}
#rtclose{font:inherit;font-size:15px;line-height:1;color:var(--muted);background:none;border:0;
 cursor:pointer;padding:4px 6px}
.rtbody{display:grid;grid-template-columns:344px 1fr;flex:1;min-height:0}
.rtleft{border-right:1px solid var(--rule);display:flex;flex-direction:column;min-height:0;
 background:var(--panel)}
#rtq{margin:12px 14px;padding:7px 9px;font:inherit;font-size:13px;color:var(--ink);
 background:var(--bg);border:1px solid var(--rule);border-radius:4px}
#rtlist{overflow-y:auto;padding:0 8px 16px}
#rtlist .rg{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;font-weight:600;
 letter-spacing:.12em;text-transform:uppercase;color:var(--muted);padding:12px 8px 5px}
#rtlist button{display:block;width:100%;text-align:left;font:inherit;font-size:13.5px;
 line-height:1.35;color:var(--ink);background:none;border:0;border-left:3px solid transparent;
 padding:6px 9px;cursor:pointer;border-radius:0 3px 3px 0}
#rtlist button:hover{background:var(--tint)}
#rtlist button.on{background:var(--tint);border-left-color:var(--accent);font-weight:600}
.rtright{overflow-y:auto;padding:22px 26px}
.rtright .ph{font-size:19px;font-weight:600;color:var(--navy);line-height:1.3;margin:0 0 4px}
.rtright .tg{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;
 letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:16px}
.rtright .ans{font-size:15px;line-height:1.6;margin:0 0 16px}
.rtright .snip{font-size:14.5px;line-height:1.6;color:var(--ink);padding:14px 16px;
 background:var(--tint);border-left:3px solid var(--accent);border-radius:0 4px 4px 0}
.rtright .go{display:inline-block;margin-top:16px;font-size:13px;font-weight:600;
 color:var(--thead-ink);background:var(--accent);padding:7px 14px;border-radius:4px;
 text-decoration:none}
.rtright .empty{color:var(--muted);font-size:14px;margin-top:40px;text-align:center}
@media (max-width:820px){.rtbody{grid-template-columns:1fr}.rtleft{border-right:0;border-bottom:1px solid var(--rule);max-height:40%}}
@media print{#router,#openrouter{display:none}}

/* cross-reference preview */
#xpop[hidden]{display:none}
#xpop{position:absolute;z-index:55;width:min(460px,calc(100vw - 32px));max-height:340px;
 overflow:hidden;background:var(--bg);border:1px solid var(--rule);border-top:3px solid var(--pacc,var(--accent));
 border-radius:0 0 6px 6px;box-shadow:0 12px 34px rgba(0,0,0,.18);font-size:14px;line-height:1.5}
#xpop .xph{display:flex;justify-content:space-between;gap:10px;align-items:baseline;
 padding:10px 14px 8px;border-bottom:1px solid var(--rule);background:var(--panel)}
#xpop .xpt{font-weight:600;color:var(--navy);font-size:14px;line-height:1.3}
#xpop .xpp{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.1em;
 text-transform:uppercase;color:var(--muted);flex:none}
#xpop .xpb{padding:10px 14px 4px;max-height:236px;overflow:hidden;position:relative}
#xpop .xpb::after{content:"";position:absolute;left:0;right:0;bottom:0;height:34px;
 background:linear-gradient(transparent,var(--bg))}
#xpop .xpb p,#xpop .xpb li{font-size:13.5px;max-width:none}
#xpop .xpb p{margin:0 0 8px}
#xpop .xpb .cb{padding:8px 11px;margin:0 0 8px;font-size:13px}
#xpop .xpb .tw{margin:0 0 8px}
#xpop .xpb table{font-size:12.5px}
#xpop .xpb h3,#xpop .xpb h4{font-size:13px;margin:8px 0 4px;text-transform:none;letter-spacing:0}
#xpop .xpb .ah,#xpop .xpb .pinbtn,#xpop .xpb .eyerow{display:none}
#xpop .xpf{display:flex;justify-content:space-between;align-items:center;padding:8px 14px;
 border-top:1px solid var(--rule);font-size:12px;color:var(--muted)}
#xpop .xpf a{font-weight:600;color:var(--accent);text-decoration:none}
@media print{#xpop{display:none!important}}
a:focus-visible,nav a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

/* ============================================ manual-update Phase 1 (2026-10-06) === */
nav .cls{font-size:11.5px;color:var(--muted);margin:-8px 0 14px;line-height:1.4}
/* the front page: a distinct "start here" panel */
section.start{max-width:80ch;margin:8px 0 48px;padding:26px 30px 10px;background:var(--panel);
 border:1px solid var(--rule);border-top:5px solid var(--navy);border-radius:0 0 6px 6px}
section.start > h2{margin-top:0;font-size:28px}
section.start > h3{margin-top:26px}
section.start > hr{display:none}
section.start .cb{margin-bottom:10px}
/* step tables: numbered steps with an arrow down to the next */
table.steps tbody tr:nth-child(even){background:transparent}
table.steps td:first-child{width:3.4em;text-align:center;font-weight:700;color:var(--accent);
 position:relative;vertical-align:middle}
table.steps tbody tr:not(:last-child) td:first-child::after{content:"\2193";position:absolute;
 left:50%;bottom:-.8em;transform:translateX(-50%);z-index:1;font-size:15px;line-height:1.3;
 color:var(--muted);background:var(--bg);padding:0 3px}
/* checklist items: the box stands where the bullet was */
li.chk{list-style:none;margin-left:-1.15em}
/* do / don't columns */
:root{--ok-bg:#E7F4EC;--ok-ink:#1E6B43;--no-bg:#FCEBEA;--no-ink:#A1281F}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--ok-bg:#12271B;--ok-ink:#7FCFA0;--no-bg:#2C1512;--no-ink:#F29E95}}
:root[data-theme="dark"]{--ok-bg:#12271B;--ok-ink:#7FCFA0;--no-bg:#2C1512;--no-ink:#F29E95}
table.dodont th.ok{color:var(--ok-ink);border-bottom-color:var(--ok-ink)}
table.dodont th.no{color:var(--no-ink);border-bottom-color:var(--no-ink)}
/* a wider do/don't table is a matrix, whose header is navy: there the column's own tint carries the header */
table.matrix.dodont th.ok{background:var(--ok-bg);color:var(--ok-ink)}
table.matrix.dodont th.no{background:var(--no-bg);color:var(--no-ink)}
table.dodont td.ok{background:var(--ok-bg)}
table.dodont td.no{background:var(--no-bg)}
table.dodont tbody tr:hover td{filter:brightness(.97)}
/* footnotes */
.fnotes{max-width:74ch;margin:6px 0 24px;padding-top:8px;border-top:1px solid var(--rule);
 font-size:13px;line-height:1.5;color:var(--muted)}
.fnotes p{margin:0 0 4px}
.fnotes p:first-child{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}
/* the directory: a role link lands on its row */
tr:target td{animation:flash 1.6s ease-out}
/* index: a letter bar that stays in reach while the index scrolls */
.ixaz{display:flex;flex-wrap:wrap;gap:2px 4px;margin-top:8px}
.ixaz a{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12.5px;font-weight:600;
 text-decoration:none;color:var(--accent);padding:2px 6px;border:1px solid var(--rule);border-radius:3px}
.ixaz a:hover{background:var(--tint)}
h3[id^="ix-"]{scroll-margin-top:150px}
#ixwrap{top:45px}            /* under the sticky breadcrumb, not behind it */
@media (max-width:900px){#ixwrap{top:86px}}
@media print{.ixaz{display:none}}
/* ===================================== chapter icons (operator 2026-10-07) === */
/* The icon is data/chapter_style.json's, drawn in currentColor. A heading's
   badge is the chapter colour with the page colour inside, so it reads in both
   themes; everywhere else the icon is simply the chapter colour. */
svg.chi{display:block;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
h1.part{display:flex;align-items:center;gap:16px}
h1.part .pbadge{flex:none;display:inline-flex;align-items:center;justify-content:center;
 width:1.15em;height:1.15em;border-radius:50%;background:currentColor}
h1.part .pbadge svg{width:.62em;height:.62em;color:var(--bg)}
nav details.ng > summary .nic{flex:none;color:var(--nacc,var(--navy))}
.eyebrow .eic{display:inline-block;vertical-align:-1px;margin-right:6px}
.sn.card .cic{display:inline-block;vertical-align:-.1em;margin-right:.4em}
ol.toclist .sw{width:16px;height:16px;color:var(--navy);align-self:center}
ol.toclist li.p0 .sw{color:var(--p0)} ol.toclist li.p1 .sw{color:var(--p1)} ol.toclist li.p2 .sw{color:var(--p2)}
ol.toclist li.p3 .sw{color:var(--p3)} ol.toclist li.p4 .sw{color:var(--p4)} ol.toclist li.p5 .sw{color:var(--p5)}
ol.toclist li.p6 .sw{color:var(--p6)} ol.toclist li.p7 .sw{color:var(--p7)} ol.toclist li.p8 .sw{color:var(--p8)}
ol.toclist li.p9 .sw{color:var(--p9)} ol.toclist li.p10 .sw{color:var(--p10)} 
/* ============================ heading hierarchy (manual update D5, 2026-10-07) === */
/* A section's number is a chip in its chapter's colour and the section heading
   carries a thinner left rule than the chapter's; a sub-section's number takes the
   colour as text. The chapter comes from the heading's id (3-7 is Chapter 3), so
   the source needs no markup. The cards keep their own heading. */
h2,h3{--hc:var(--navy)}
h2[id^="0-"],h3[id^="0-"]{--hc:var(--p0)} h2[id^="1-"],h3[id^="1-"]{--hc:var(--p1)} h2[id^="2-"],h3[id^="2-"]{--hc:var(--p2)} h2[id^="3-"],h3[id^="3-"]{--hc:var(--p3)} h2[id^="4-"],h3[id^="4-"]{--hc:var(--p4)} h2[id^="5-"],h3[id^="5-"]{--hc:var(--p5)} h2[id^="6-"],h3[id^="6-"]{--hc:var(--p6)} h2[id^="7-"],h3[id^="7-"]{--hc:var(--p7)} h2[id^="8-"],h3[id^="8-"]{--hc:var(--p8)} h2[id^="9-"],h3[id^="9-"]{--hc:var(--p9)} h2[id^="10-"],h3[id^="10-"]{--hc:var(--p10)}
h2[id^="A-"],h3[id^="A-"],h2[id^="B-"],h3[id^="B-"],h2[id^="C-"],h3[id^="C-"]{--hc:var(--muted)}
h2{border-left:4px solid var(--hc);padding-left:14px}
h2 .sn{display:inline-block;padding:.2em .55em;border-radius:.3em;background:var(--hc);color:var(--bg);
 font-weight:600;letter-spacing:.02em;margin-right:.35em}
h3 .sn{color:var(--hc)}
section.qrc h2{border-left:0;padding-left:0} section.qrc h2 .sn{margin-right:0}
</style></head>
<body><button class="navtoggle" id="nt">☰ &nbsp;Contents &amp; search</button><div class="wrap">
<nav><div class="brand">UniversalMed Supply<br>CSR Procedures Manual</div>
<div class="ver">v3.0 draft &middot; built __BUILT__</div>
<div class="cls">Confidential &mdash; Internal Use Only &middot; Owner: __OWNER__</div>
<input id="q" type="search" placeholder="Search the manual…" autocomplete="off" aria-label="Search">
<button id="openrouter">What did the caller say?</button>
<div id="pinbox" hidden><div class="pbh">Pinned <span id="pincount"></span></div><div id="pinlist"></div>
<div class="pbh pbh2">Recent</div><div id="recentlist"></div></div>
<div class="dens" role="group" aria-label="Text density"><button id="dc" aria-pressed="false">Compact</button><button id="dr" aria-pressed="true">Comfortable</button></div>
<div id="res" hidden></div>
<div id="navlist">__NAV__</div></nav>
<main><div id="ctx"><span class="bc"><b></b><i></i></span><a class="cardchip" hidden></a></div>__BODY__</main>
<aside id="otp" aria-label="On this page"><div class="otph">On this page</div><div id="otpl"></div></aside>
</div>
<div id="xpop" hidden role="tooltip"></div>
<div id="router" hidden role="dialog" aria-label="Call router"><div class="rtbox">
<div class="rthead"><b>What did the caller say?</b><button id="rtclose" aria-label="Close">&#10005;</button></div>
<div class="rtbody"><div class="rtleft"><input id="rtq" type="search" placeholder="Filter phrases&hellip;" aria-label="Filter phrases"><div id="rtlist"></div></div>
<div class="rtright" id="rtpane"></div></div></div></div>
<script>
const D=__SEARCH__;
const RT=__ROUTER__;
const q=document.getElementById('q'),res=document.getElementById('res'),nl=document.getElementById('navlist');
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function mark(t,n){const i=t.toLowerCase().indexOf(n);if(i<0)return esc(t.slice(0,150));
 const a=Math.max(0,i-60);return (a?'…':'')+esc(t.slice(a,i))+'<mark>'+esc(t.slice(i,i+n.length))+'</mark>'+esc(t.slice(i+n.length,i+n.length+90))+'…';}

// ---- search: aliases rank first, plurals stem, misses are capturable ----
const stem=w=>w.replace(/(ies)$/,'y').replace(/(sses|shes|ches|xes)$/,m=>m.slice(0,-2))
                .replace(/([a-z]{3,})s$/,'$1');
const norm=t=>t.toLowerCase().replace(/[^a-z0-9. ]+/g,' ').split(/\s+/).filter(Boolean).map(stem).join(' ');
for(const d of D){ d._t=norm(d.t); d._b=norm(d.b); d._p=(d.p||[]).map(norm); }
function aliasHit(d,q){
  for(let i=0;i<d._p.length;i++) if(d._p[i].includes(q)||q.includes(d._p[i])) return d.p[i];
  return null;
}
function runSearch(raw){
  const n=raw.trim().toLowerCase(), q=norm(raw);
  if(n.length<2){res.hidden=true;res.innerHTML='';nl.hidden=false;return;}
  nl.hidden=true;res.hidden=false;
  const aliasHits=[],textHits=[];
  for(const d of D){
    const numHit=(d.a||'').toLowerCase().split(' ').includes(n.replace(/^§/,''));
    const ah=aliasHit(d,q);
    if(ah) aliasHits.push({d,ah});
    else if(numHit) textHits.push({d,score:-1});
    else{
      const ti=d._t.indexOf(q), bi=d._b.indexOf(q);
      if(ti>=0||bi>=0) textHits.push({d,score:(ti>=0?0:1)+(ti===0?-1:0)});
    }
  }
  textHits.sort((x,y)=>x.score-y.score);
  let html='';
  if(aliasHits.length){
    html+='<div class="alh">Known caller phrase</div>';
    for(const {d,ah} of aliasHits.slice(0,6)){
      const sib=(d.p||[]).filter(x=>x!==ah).slice(0,4)
        .map(x=>`<span class="chip">${esc(x)}</span>`).join('');
      html+=`<a class="ali" href="#${d.i}"><span class="alc">ALIAS</span>`+
            `<span class="rt">${esc(d.t)}</span>`+
            `<span class="rs">&ldquo;${esc(ah)}&rdquo; is a known phrase for this section</span>`+
            (sib?`<span class="sibs">also: ${sib}</span>`:'')+`</a>`;
    }
  }
  if(textHits.length){
    if(aliasHits.length) html+='<div class="alh alh2">In the text</div>';
    html+=textHits.slice(0,30).map(h=>
      `<a href="#${h.d.i}"><span class="rt">${esc(h.d.t)}</span>`+
      `<span class="rs">${mark(h.d.b,n)}</span></a>`).join('');
  }
  if(!aliasHits.length&&!textHits.length) html=missPanel(raw);
  res.innerHTML=html;
}
function missPanel(raw){
  // closest partial match, and what it matched on
  const q=norm(raw), words=q.split(' ').filter(w=>w.length>2);
  let best=null,bestOn='';
  for(const d of D){
    for(const w of words){
      if(d._t.includes(w)){ if(!best){best=d;bestOn=w;} }
      else if(!best&&d._p.some(p=>p.includes(w))){best=d;bestOn=w;}
    }
    if(best) break;
  }
  const near=best?`<a href="#${best.i}"><span class="rt">${esc(best.t)}</span>`+
    `<span class="rs">closest match &mdash; matched on &ldquo;${esc(bestOn)}&rdquo;</span></a>`
    :'<div class="rn">Nothing close enough to suggest.</div>';
  return `<div class="alh">No match</div>${near}`+
    `<div class="misscap"><div class="mch">Log this phrase?</div>`+
    `<p>If you end up using a section for this call, log what the caller actually said so it can be `+
    `added as a phrase. Supervisors review the list.</p>`+
    `<button id="logmiss" data-q="${esc(raw)}">Log &ldquo;${esc(raw.slice(0,40))}&rdquo;</button>`+
    `<div class="mcnote" id="mcnote"></div></div>`;
}
function missStore(){try{return JSON.parse(localStorage.getItem('ums-misses')||'[]')}catch(e){return[]}}
res.addEventListener('click',e=>{
  const btn=e.target.closest('#logmiss'); if(!btn) return;
  e.preventDefault();
  const list=missStore();
  list.push({q:btn.dataset.q, at:new Date().toISOString()});
  try{localStorage.setItem('ums-misses',JSON.stringify(list.slice(-200)))}catch(e){}
  const note=document.getElementById('mcnote');
  note.textContent=`Logged. ${list.length} phrase${list.length===1?'':'s'} waiting for review.`;
  btn.disabled=true;
});
q.addEventListener('input',()=>runSearch(q.value));

q.addEventListener('keydown',e=>{if(e.key==='Escape'){q.value='';q.dispatchEvent(new Event('input'));q.blur();}});
res.addEventListener('click',e=>{if(e.target.closest('a')){q.value='';res.hidden=true;res.innerHTML='';nl.hidden=false;}});


// density
const root=document.documentElement,dc=document.getElementById('dc'),dr=document.getElementById('dr');
function setD(v){root.setAttribute('data-density',v);
 dc.setAttribute('aria-pressed',v==='compact');dr.setAttribute('aria-pressed',v!=='compact');
 try{localStorage.setItem('ums-density',v)}catch(e){}}
try{const sv=localStorage.getItem('ums-density'); if(sv)setD(sv); else setD('comfortable');}catch(e){setD('comfortable');}
dc.addEventListener('click',()=>setD('compact'));
dr.addEventListener('click',()=>setD('comfortable'));

// index filter
const ixq=document.getElementById('ixq');
if(ixq){
 const start=document.getElementById('E-1');
 const rows=[];let n=start;
 while(n=n.nextElementSibling){ if(n.tagName==='H1')break;
  if(n.tagName==='H3')rows.push({h:n,tr:[]});
  else if(n.classList&&n.classList.contains('tw')&&rows.length)
   n.querySelectorAll('tbody tr').forEach(tr=>rows[rows.length-1].tr.push(tr));
  if(n.classList&&n.classList.contains('tw')&&rows.length)rows[rows.length-1].tw=n;
 }
 ixq.addEventListener('input',()=>{
  const v=ixq.value.trim().toLowerCase();
  for(const g of rows){ let any=false;
   for(const tr of g.tr){ const hit=!v||tr.textContent.toLowerCase().includes(v);
    tr.classList.toggle('ixhide',!hit); if(hit)any=true; }
   g.h.classList.toggle('ixhide',!any);
   if(g.tw)g.tw.classList.toggle('ixhide',!any);
  }});
 ixq.addEventListener('keydown',e=>{if(e.key==='Escape'){ixq.value='';ixq.dispatchEvent(new Event('input'));}});
}

// keyboard navigation through search results
let sel=-1;
function moveSel(d){
 const items=[...res.querySelectorAll('a')]; if(!items.length)return;
 if(sel>=0&&items[sel])items[sel].classList.remove('sel');
 sel=(sel+d+items.length)%items.length;
 items[sel].classList.add('sel');
 items[sel].scrollIntoView({block:'nearest'});
}
q.addEventListener('keydown',e=>{
 if(e.key==='ArrowDown'){e.preventDefault();moveSel(1);}
 else if(e.key==='ArrowUp'){e.preventDefault();moveSel(-1);}
 else if(e.key==='Enter'){const items=[...res.querySelectorAll('a')];
  if(sel>=0&&items[sel]){e.preventDefault();items[sel].click();}
  else if(items.length){e.preventDefault();items[0].click();}}
});
q.addEventListener('input',()=>{sel=-1;});


// breadcrumb, card chip, on-this-page rail, nav collapse
const PARTC={p0:'--p0',p1:'--p1',p2:'--p2',p3:'--p3',p4:'--p4',p5:'--p5',
             p6:'--p6',p7:'--p7',p8:'--p8',p9:'--p9',p10:'--p10'};
const ctx=document.getElementById('ctx'),ctxB=ctx.querySelector('.bc b'),ctxS=ctx.querySelector('.bc i'),
      chip=ctx.querySelector('.cardchip'),otpl=document.getElementById('otpl'),
      otp=document.getElementById('otp');
const mainEl=document.querySelector('main');
const heads=[...mainEl.querySelectorAll('h1.part,h2[id],h3[id]')];
const clean=el=>el.textContent.replace(/#$/,'').replace(/\s+/g,' ').trim();
let curPart=null,curH2=null;
function partKey(h){return [...h.classList].find(c=>PARTC[c])||null;}
function buildRail(h2){
  otpl.innerHTML='';
  if(!h2){otp.style.visibility='hidden';return;}
  const subs=[];let n=h2.nextElementSibling;
  while(n&&!/^H[12]$/.test(n.tagName)){
    if(n.tagName==='H3'&&n.id)subs.push(n);
    n=n.nextElementSibling;
  }
  if(!subs.length){otp.style.visibility='hidden';return;}
  otp.style.visibility='visible';
  for(const s of subs){
    const a=document.createElement('a');a.href='#'+s.id;
    const num=s.querySelector('.sn');
    const t=clean(s).replace(num?num.textContent:'','').trim();
    a.innerHTML=(num?`<span class="otpn">${num.textContent}</span>`:'')+t.replace(/[<>&]/g,'');
    a.dataset.t=s.id;otpl.appendChild(a);
  }
}
function setCurrent(el){
  let part=null,h2=null;
  for(const h of heads){
    if(h.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_PRECEDING)break;
    if(h.tagName==='H1')part=h,h2=null;
    else if(h.tagName==='H2')h2=h;
  }
  if(part&&part!==curPart){
    curPart=part;
    const k=partKey(part);
    const col=k?`var(${PARTC[k]})`:'var(--navy)';
    ctx.style.setProperty('--cur',col); otp.style.setProperty('--cur',col);
    ctxB.textContent=clean(part);
    const num=k?k.slice(1):null;
    const card=num!==null&&document.getElementById('C-'+num);
    if(card&&!(h2&&h2.id&&h2.id.startsWith('C-'))){chip.hidden=false;chip.href='#C-'+num;chip.textContent='CARD '+num+' \u2192';}
    else chip.hidden=true;
    // nav: expand only the current part
    document.querySelectorAll('nav details.ng').forEach(d=>{
      const s=d.querySelector('summary a');
      d.open = !!s && s.getAttribute('href')==='#'+part.id;
    });
  }
  if(h2!==curH2){curH2=h2;ctxS.textContent=h2?clean(h2):'';buildRail(h2);if(h2&&h2.id)noteRecent(h2.id);}
  const t=el.tagName==='H3'?el.id:null;
  otpl.querySelectorAll('a').forEach(a=>a.classList.toggle('on',a.dataset.t===t));
}

// ---- pinned (capped at 6) and recent; per-CSR, stored in this browser ----
const PIN_MAX=6;
const titleOf=id=>{const d=D.find(x=>x.i===id);return d?d.t:id;};
const load=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(e){return[]}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const ago=ts=>{const m=Math.round((Date.now()-ts)/60000);
  return m<1?'now':m<60?m+'m':m<1440?Math.round(m/60)+'h':Math.round(m/1440)+'d';};
function renderPins(){
  const pins=load('ums-pins'), rec=load('ums-recent');
  const box=document.getElementById('pinbox');
  box.hidden = !pins.length && !rec.length;
  document.getElementById('pincount').textContent = pins.length?`${pins.length} / ${PIN_MAX}`:'';
  document.getElementById('pinlist').innerHTML = pins.length
    ? pins.map(id=>`<a href="#${id}">${esc(titleOf(id))}<span class="x" data-unpin="${id}">\u2715</span></a>`).join('')
    : '<div class="empty">Nothing pinned</div>';
  document.getElementById('recentlist').innerHTML = rec.length
    ? rec.slice(0,6).map(r=>`<a href="#${r.id}">${esc(titleOf(r.id))}<span class="age">${ago(r.at)}</span></a>`).join('')
    : '<div class="empty">Nothing yet</div>';
  document.querySelectorAll('.pinbtn').forEach(b=>{
    const on=pins.includes(b.dataset.id);
    b.classList.toggle('on',on); b.textContent=on?'\u2713 Pinned':'+ Pin';
  });
}
document.addEventListener('click',e=>{
  const un=e.target.closest('[data-unpin]');
  if(un){e.preventDefault();save('ums-pins',load('ums-pins').filter(x=>x!==un.dataset.unpin));renderPins();return;}
  const b=e.target.closest('.pinbtn'); if(!b) return;
  let pins=load('ums-pins');
  if(pins.includes(b.dataset.id)) pins=pins.filter(x=>x!==b.dataset.id);
  else{ if(pins.length>=PIN_MAX){ b.textContent='6 max'; setTimeout(renderPins,1100); return; }
        pins.push(b.dataset.id); }
  save('ums-pins',pins); renderPins();
});
let recTimer=null;
function noteRecent(id){
  clearTimeout(recTimer);
  recTimer=setTimeout(()=>{
    const rec=load('ums-recent').filter(r=>r.id!==id);
    rec.unshift({id,at:Date.now()});
    save('ums-recent',rec.slice(0,12)); renderPins();
  },2500);
}
renderPins();


// ---- call router: phrase on the left, the rule opening on the right ----
const rt=document.getElementById('router'),rtList=document.getElementById('rtlist'),
      rtPane=document.getElementById('rtpane'),rtQ=document.getElementById('rtq');
function rtRender(filter){
  const f=(filter||'').trim().toLowerCase();
  const rows=RT.filter(r=>!f||r.q.toLowerCase().includes(f)||r.g.toLowerCase().includes(f));
  let html='',g=null;
  rows.forEach((r,idx)=>{
    if(r.g!==g){g=r.g;html+=`<div class="rg">${esc(g)}</div>`;}
    html+=`<button data-k="${RT.indexOf(r)}">&ldquo;${esc(r.q)}&rdquo;</button>`;
  });
  rtList.innerHTML=html||'<div class="rg">No phrase matches</div>';
}
function rtShow(k){
  const r=RT[k]; if(!r) return;
  rtList.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.k==String(k)));
  const d=D.find(x=>x.i===r.i);
  rtPane.innerHTML=`<div class="ph">&ldquo;${esc(r.q)}&rdquo;</div>`+
    `<div class="tg">${esc(r.g)}</div>`+
    `<div class="ans">${esc(r.a)}</div>`+
    (d?`<div class="snip">${esc(d.b.slice(0,420))}${d.b.length>420?'\u2026':''}</div>`:'')+
    `<a class="go" href="#${r.i}">Open ${esc(d?d.t.split(' ')[0]:r.i)} \u2192</a>`;
}
document.getElementById('openrouter').addEventListener('click',()=>{
  rt.hidden=false;rtRender('');rtPane.innerHTML='<div class="empty">Pick what the caller said.</div>';
  rtQ.value='';rtQ.focus();
});
document.getElementById('rtclose').addEventListener('click',()=>rt.hidden=true);
rt.addEventListener('click',e=>{if(e.target===rt)rt.hidden=true;});
rtQ.addEventListener('input',()=>rtRender(rtQ.value));
rtList.addEventListener('click',e=>{const b=e.target.closest('button');if(b)rtShow(+b.dataset.k);});
rtPane.addEventListener('click',e=>{if(e.target.closest('a.go'))rt.hidden=true;});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!rt.hidden)rt.hidden=true;});


// ---- cross-reference preview: the opening of the target section, in place ----
const xpop=document.getElementById('xpop');
const coarse=window.matchMedia('(pointer: coarse)').matches;
let xpShow=null,xpHide=null,xpFor=null;
function sectionOpening(id){
  const h=document.getElementById(id); if(!h) return null;
  if(h.tagName==='TR'){
    // a directory row: the table's header and that one row
    const t=h.closest('table'), tw=document.createElement('div'), nt=document.createElement('table');
    tw.className='tw'; nt.className=t.className;
    if(t.tHead) nt.appendChild(t.tHead.cloneNode(true));
    const tb=document.createElement('tbody'), r=h.cloneNode(true); r.removeAttribute('id');
    tb.appendChild(r); nt.appendChild(tb); tw.appendChild(nt);
    const frag=document.createDocumentFragment(); frag.appendChild(tw);
    return {h,frag,row:true};
  }
  const lvl=+h.tagName.slice(1)||2, frag=document.createDocumentFragment();
  let n=h.nextElementSibling, taken=0;
  while(n&&taken<4){
    if(/^H[1-6]$/.test(n.tagName)&&+n.tagName.slice(1)<=lvl) break;
    if(n.classList.contains('eyerow')||n.classList.contains('eyebrow')){n=n.nextElementSibling;continue;}
    const c=n.cloneNode(true);
    c.removeAttribute&&c.removeAttribute('id');
    c.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
    frag.appendChild(c); taken++; n=n.nextElementSibling;
  }
  return {h,frag};
}
function partOf(h){
  let n=h; while(n&&!(n.tagName==='H1'&&n.classList.contains('part'))) n=n.previousElementSibling;
  return n;
}
function showPreview(a){
  const id=(a.getAttribute('href')||'').slice(1); const got=sectionOpening(id);
  if(!got){xpop.hidden=true;return;}
  const part=partOf(got.row?got.h.closest('.tw'):got.h), key=part&&[...part.classList].find(c=>PARTC[c]);
  xpop.style.setProperty('--pacc', key?`var(${PARTC[key]})`:'var(--accent)');
  const title=got.row?got.h.cells[0].textContent.trim()
    :got.h.textContent.replace(/#$/,'').replace(/\+ Pin|\u2713 Pinned/,'').trim();
  xpop.innerHTML=`<div class="xph"><span class="xpt"></span><span class="xpp"></span></div>`+
    `<div class="xpb"></div><div class="xpf"><span>Esc to close</span><a href="#${id}">Go to section \u2192</a></div>`;
  xpop.querySelector('.xpt').textContent=title;
  xpop.querySelector('.xpp').textContent=part?part.textContent.replace(/#$/,'').split('\u2014')[0].trim():'';
  xpop.querySelector('.xpb').appendChild(got.frag);
  xpop.hidden=false;
  const r=a.getBoundingClientRect(), w=xpop.offsetWidth, hgt=xpop.offsetHeight;
  let left=window.scrollX+r.left; left=Math.min(left, window.scrollX+document.documentElement.clientWidth-w-16);
  left=Math.max(window.scrollX+16,left);
  const below=r.bottom+hgt+12<window.innerHeight;
  xpop.style.left=left+'px';
  xpop.style.top=(below? window.scrollY+r.bottom+6 : window.scrollY+r.top-hgt-6)+'px';
  xpFor=a;
}
function scheduleHide(){clearTimeout(xpShow);clearTimeout(xpHide);xpHide=setTimeout(()=>{xpop.hidden=true;xpFor=null;},220);}
if(!coarse){
  document.addEventListener('mouseover',e=>{
    const a=e.target.closest('a.xr');
    if(a){clearTimeout(xpHide);clearTimeout(xpShow);if(a!==xpFor)xpShow=setTimeout(()=>showPreview(a),320);}
    else if(e.target.closest('#xpop')){clearTimeout(xpHide);}
  });
  document.addEventListener('mouseout',e=>{
    if(e.target.closest('a.xr')||e.target.closest('#xpop')) scheduleHide();
  });
}
document.addEventListener('focusin',e=>{const a=e.target.closest&&e.target.closest('a.xr');if(a)showPreview(a);});
document.addEventListener('focusout',e=>{if(e.target.closest&&e.target.closest('a.xr'))scheduleHide();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!xpop.hidden){xpop.hidden=true;xpFor=null;}});
xpop.addEventListener('click',e=>{if(e.target.closest('a'))xpop.hidden=true;});
window.addEventListener('scroll',()=>{if(!xpop.hidden&&xpFor&&!xpop.matches(':hover'))xpop.hidden=true;},{passive:true});

// mobile nav
const nt=document.getElementById('nt'),navEl=document.querySelector('nav');
nt.addEventListener('click',()=>navEl.classList.toggle('show'));
navEl.addEventListener('click',e=>{if(e.target.closest('a')&&window.innerWidth<=900)navEl.classList.remove('show');});
// scrollspy
const links=[...document.querySelectorAll('nav a.n2')];
const byId=new Map(links.map(a=>[a.getAttribute('href').slice(1),a]));
let cur=null;
const spy=new IntersectionObserver(es=>{
 for(const e of es){ if(!e.isIntersecting) continue;
  const a=byId.get(e.target.id); if(!a) continue;
  if(cur)cur.classList.remove('cur'); a.classList.add('cur'); cur=a;
  const d=a.closest('details'); if(d&&!d.open)d.open=true;
 }},{rootMargin:'0px 0px -75% 0px'});
document.querySelectorAll('h2[id],h3[id]').forEach(h=>spy.observe(h));
const spy2=new IntersectionObserver(es=>{for(const e of es){if(e.isIntersecting)setCurrent(e.target);}},
  {rootMargin:'0px 0px -75% 0px'});
heads.forEach(h=>spy2.observe(h));
setCurrent(heads[0]);
// copy section link
document.addEventListener('click',e=>{
 const a=e.target.closest('.ah'); if(!a) return;
 e.preventDefault();
 const url=location.href.split('#')[0]+a.getAttribute('href');
 navigator.clipboard?.writeText(url);
 history.replaceState(null,'',a.getAttribute('href'));
 a.textContent='copied'; a.classList.add('ok');
 setTimeout(()=>{a.textContent='#';a.classList.remove('ok');},1200);
});

document.addEventListener('keydown',e=>{
 if((e.key==='/'||((e.metaKey||e.ctrlKey)&&e.key==='k')) && document.activeElement!==q){e.preventDefault();q.focus();}
});
</script>
</body></html>"""

OWNER = re.search(r'^OWNER = "([^"]+)"', open("build.py").read(), re.M).group(1)
open(DST, "w").write(TPL.replace("__PAL_LIGHT__", palette("light")).replace("__PAL_DARK__", palette("dark")).replace("__OWNER__", html.escape(OWNER)).replace("__NAV__", "\n".join(navhtml)).replace("__BODY__", body).replace("__SEARCH__", _json.dumps(SEARCH, ensure_ascii=False)).replace("__ROUTER__", _json.dumps(ROUTER, ensure_ascii=False)).replace("__BUILT__", BUILT))
print(f"wrote {DST}  ({len(open(DST).read()):,} bytes)")
print(f"nav entries: {len(nav)}   callouts styled: {body.count('class=\"cb ')}")
