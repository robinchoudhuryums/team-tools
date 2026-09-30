#!/usr/bin/env python3
"""Export the manual as Reference articles (team-tools Batch M1).

Writes, under $MANUAL_OUT/reference (default dist/reference):

  manual.json    THE upload file (Batch M2): {format, version, built, router,
                 changelog, articles, images}. `articles` holds one object per level-2
                 section of Parts 0-10, one per quick reference card, one per
                 Appendix B section, ONE glossary article for Appendix A and the
                 front page — {Id, Department, Title, Type, BodyMd, SortOrder,
                 SourceHash}. `router` is the Part 1 call router ("the caller
                 says…" → sections), `changelog` the dated changes with the
                 section each touched — what the Reference Manual reader draws
                 as "Updated". The importer is `kbImportManual` (70_kb.js).
                 `images` (Batch M3) is every `manimg:<key>` a body cites —
                 {alt, kind, dataUri} — which the import unpacks into the KB
                 Images folder on Drive; one upload carries everything.

and, when it runs inside the team-tools repo, the diagram partial (Batch M3):

  web-app/kb/script_manual_diagrams.html
                 every diagrams/*.svg as an allowlisted, app-themed string the
                 Reference renderer draws for a ```diagram fence — elements and
                 attributes from a fixed list, styles scoped to their own
                 diagram, the manual's colours renamed to --dg-* (the app maps
                 them onto its design tokens, so dark mode follows), fonts the
                 app's, and each section link a kb cross-reference. It is CODE:
                 a changed diagram reaches the app by commit + deploy, not by
                 import. Rewritten only when its content changes.

The bodies are written in the Markdown the Reference renderer (`kbMd_`) draws:
callouts stay `>` blocks, Script callouts become ```snippet fences, diagrams
become ```diagram fences, images become ![alt](manimg:key), and every
cross-reference becomes [5.9.2 Title](kb:man-5-9#5.9.2). The export FAILS —
exit 1, nothing written — on a cross-reference or role that does not resolve,
a body over BODY_MAX, any HTML the renderer would print literally, or a
leftover placeholder.

Runs the parts through render.py exactly as build.py does (so equipment,
roster, fee and glossary tables are the build's own), but substitutes the
diagram and figure placeholders first so no SVG or base64 reaches a body.
Needs the same Python as the build (3.12). Deterministic: the same source
gives byte-identical output, so a re-import changes nothing.
"""
import hashlib, json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
sys.path.insert(0, HERE)
from numbering import display as dnum  # noqa: E402

# Mirrors KB_BODY_MAX in web-app/00_config.js — the importer refuses a longer
# body, so the export refuses first (pinned equal by the Node harness).
BODY_MAX = 49000

# The parts and appendices, as build.py lists them (pinned equal).
PARTS = {
    "p0": ("CSR Core", "src/p0.md"),
    "p1": ("Call Handling", "src/p1.md"),
    "p2": ("Manual Mobility & General DME", "src/p2.md"),
    "p3": ("Respiratory & Resupply", "src/p3.md"),
    "p4": ("Power Mobility", "src/p4.md"),
    "p5": ("Field Operations", "src/p5.md"),
    "p6": ("Service", "src/p6.md"),
    "p7": ("Oxygen", "src/p7.md"),
    "p8": ("After Hours", "src/p8.md"),
    "p9": ("Sales", "src/p9.md"),
    "p10": ("Billing & Insurance", "src/p10.md"),
}
APPX = {"a": "src/appendix_a.md", "b": "src/appendix_b.md", "c": "src/appendix_c.md"}

# build.py's scaffolding strippers, copied verbatim (pinned equal): the review
# notes are not part of the manual a CSR reads, in any artifact.
SCAFFOLD = re.compile(
    r"\n(?:-{3,}\s*\n+)?#{2} (?:What changed[^\n]*|Open items[^\n]*|Notes for review[^\n]*)"
    r"\n.*?(?=\n#{1,2} (?!#)|\Z)", re.S)
DRAFTNOTE = re.compile(r"\n> \*\*About this [^*]*\*\*.*?(?=\n#{1,3} |\n-{3,})", re.S)

CALLOUTS = ("Critical", "Policy", "Watch-out", "Script", "Note")
SEC_HEAD = re.compile(r"^(#{2,3}) (§[\w\-.]+) (.+)$", re.M)

errors = []
GLOSSARY_FOLDS = []  # case-only duplicate spellings folded into one entry
NOT_IMPORTED = []    # references into the generated Appendices D/E, drawn as text
IMAGES = {}          # key -> {alt, kind, source, dataUri}

GLOSSARY = json.load(open("data/glossary.json", encoding="utf-8"))
ROSTER = json.load(open("data/roster.json", encoding="utf-8"))
ICONS = json.load(open("data/icons.json", encoding="utf-8"))
THUMBS = json.load(open("data/thumbs.json", encoding="utf-8"))
FIGS = json.load(open("data/figures.json", encoding="utf-8"))
FIGB = json.load(open("data/figures_b64.json", encoding="utf-8"))


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def md_plain(s):
    """Markdown emphasis and inline code removed — for text drawn raw."""
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s)
    s = re.sub(r"(^|[^*])\*([^*\s][^*]*)\*", r"\1\2", s)
    return re.sub(r"`([^`]+)`", r"\1", s)


# ---------------------------------------------------------------- images ---
ICON_BY_B64 = {}
for ic in ICONS:
    ICON_BY_B64[ic["b64"]] = ic
THUMB_BY_URI = {v: k for k, v in THUMBS.items()}


def image_ref(alt, key, kind, source, data_uri):
    IMAGES.setdefault(key, {"alt": alt, "kind": kind, "source": source, "dataUri": data_uri})
    alt = alt.replace("[", "(").replace("]", ")")
    return f"![{alt}](manimg:{key})"


def icon_ref(alt, data_uri):
    b64 = data_uri.split(",", 1)[-1]
    ic = ICON_BY_B64.get(b64)
    if ic:
        key = "icon-" + slug(ic["group"] + " " + ic["label"])
        src = f"icons.json:{ic['group']}/{ic['label']}"
    else:
        key = "icon-" + hashlib.sha256(b64.encode()).hexdigest()[:12]
        src = "inline"
    return image_ref(alt, key, "icon", src, data_uri)


def thumb_ref(alt, data_uri):
    name = THUMB_BY_URI.get(data_uri)
    if not name:
        errors.append(f"equipment photo for {alt!r} is not in thumbs.json")
        return ""
    key = "thumb-" + slug(os.path.splitext(name)[0])
    return image_ref(alt, key, "thumb", "thumbs.json:" + name, data_uri)


def figure_md(fid):
    if fid not in FIGS or fid not in FIGB:
        errors.append(f"unknown figure: {fid}")
        return ""
    f = FIGS[fid]
    caption = re.sub(r"<(b|strong)>(.*?)</\1>", r"\2", f["caption"])
    return (image_ref(f["alt"], "fig-" + slug(fid), "figure", "figures.json:" + fid, FIGB[fid])
            + "\n\n*" + caption + "*")


def diagram_md(name):
    path = f"diagrams/{name}.svg"
    if not os.path.exists(path):
        errors.append(f"unknown diagram: {name}")
        return ""
    svg = open(path, encoding="utf-8").read()
    m = re.search(r'aria-label="([^"]+)"', svg)
    label = m.group(1) if m else name
    # The fence body is the diagram's accessible name — what a reader sees
    # until the diagram partial (Phase 3) draws the SVG itself.
    return f"```diagram {name}\n{label}\n```"


def pre_substitute(text, key):
    """Diagram, figure and (Appendix A) glossary placeholders, before render.py."""
    text = re.sub(r"\{\{diagram:([\w\-]+)\}\}", lambda m: diagram_md(m.group(1)), text)
    text = re.sub(r"\{\{figure:([\w\-]+)\}\}", lambda m: figure_md(m.group(1)), text)
    text = re.sub(r"\{\{figure-pair:([^}]+)\}\}",
                  lambda m: "\n\n".join(figure_md(f) for f in m.group(1).split("|")), text)
    if key == "appx_a":
        text = re.sub(r"\{\{glossary:(\w+)[^}]*\}\}", lambda m: glossary_fence(m.group(1)), text)
    return text


def glossary_fence(cls):
    rows = [g for g in GLOSSARY if g["class"] == cls]
    if not rows:
        errors.append(f"glossary class {cls!r} has no terms")
    # The renderer keys a term case-insensitively and DROPS a second spelling,
    # so "MRX" and "MRx" fold into one entry: the fuller definition wins and
    # the other spelling becomes an alias — neither term disappears.
    folded = {}
    for g in rows:
        term = g["term"].replace("|", "/").strip()
        k = term.lower()
        d = md_plain(g["definition"]).replace("\n", " ").strip()
        if k not in folded:
            folded[k] = {"term": term, "aka": list(g.get("aka") or []), "def": d}
            continue
        f = folded[k]
        GLOSSARY_FOLDS.append(f"{f['term']} / {term}")
        if len(d) > len(f["def"]):
            f["aka"].append(f["term"])
            f["term"], f["def"] = term, d
        else:
            f["aka"].append(term)
    out = ["```glossary"]
    for k in sorted(folded):
        f = folded[k]
        head = f["term"] + (f" (aka {', '.join(f['aka'])})" if f["aka"] else "")
        out.append(f"{head}| {f['def']}")
    out.append("```")
    return "\n".join(out)


# ---------------------------------------------------------------- render ---
def render(key, src, tmp):
    raw = open(src, encoding="utf-8").read()
    pre = os.path.join(tmp, key + ".in.md")
    dst = os.path.join(tmp, key + ".out.md")
    open(pre, "w", encoding="utf-8").write(pre_substitute(raw, key))
    r = subprocess.run([sys.executable, "render.py", pre, dst, "none"],
                       capture_output=True, text=True)
    if r.returncode:
        errors.append(f"{src}: render failed — {r.stdout.strip()} {r.stderr.strip()}")
        return ""
    text = open(dst, encoding="utf-8").read()
    text = SCAFFOLD.sub("", text)
    text = DRAFTNOTE.sub("\n", text)
    return html_to_md(text, src)


ICON_TABLE = re.compile(r'<table class="icons">(.*?)</table>', re.S)


def attr(tag, name):
    m = re.search(r'\s' + name + r'="([^"]*)"', tag)
    return m.group(1) if m else ""


def img_md(m):
    """Any <img> the sources carry: an equipment photo, else a dashboard icon."""
    tag = m.group(0)
    alt, src = attr(tag, "alt"), attr(tag, "src")
    if attr(tag, "class") == "thumb":
        return thumb_ref(alt, src) + " "
    return icon_ref(alt, src)


def inline_html(c):
    c = re.sub(r"<(strong|b)>(.*?)</\1>", r"**\2**", c, flags=re.S)
    return re.sub(r"<img\s[^>]*>", img_md, c)


def cell_md(c):
    return re.sub(r"\s+", " ", inline_html(c)).strip().replace("|", "\\|")


def icon_table(m):
    body = m.group(1)
    head = [cell_md(h) for h in re.findall(r"<th(?:\s[^>]*)?>(.*?)</th>", body, re.S)]
    rows = []
    for tr in re.findall(r"<tr>(.*?)</tr>", body, re.S):
        tds = re.findall(r"<td(?:\s[^>]*)?>(.*?)</td>", tr, re.S)
        if tds:
            rows.append([cell_md(t) for t in tds])
    out = ["| " + " | ".join(head) + " |", "|" + "|".join("---" for _ in head) + "|"]
    out += ["| " + " | ".join(r) + " |" for r in rows]
    return "\n".join(out)


def html_to_md(text, src):
    """The handful of HTML shapes the sources carry, as Markdown kbMd_ draws."""
    text = ICON_TABLE.sub(icon_table, text)
    text = re.sub(r'<span class="phase"[^>]*></span>', "", text)   # a colour swatch
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    text = inline_html(text)
    for m in re.finditer(r"</?[a-zA-Z][^>]*>", text):
        line = text.count("\n", 0, m.start()) + 1
        errors.append(f"{src}: HTML the renderer would print literally at line {line}: "
                      f"{m.group(0)[:60]}")
    for m in re.finditer(r"\{\{[^}]*\}\}", text):
        errors.append(f"{src}: placeholder left unexpanded: {m.group(0)[:60]}")
    return text


# ---------------------------------------------------------------- ids ------
def article_id(sec):
    """§5-9 -> man-5-9 · §C-5 -> man-c-5 · §10-B -> man-10-b · §A-* -> man-a."""
    s = sec.lstrip("§").split(".")[0].lower()
    if s.startswith("a-"):
        return "man-a"
    return "man-" + s


def department(key):
    if key.startswith("p"):
        return f"Part {int(key[1:]):02d} — {PARTS[key][0]}"
    return {"appx_a": "Appendix A — Glossary",
            "appx_b": "Appendix B — Escalation Directory",
            "appx_c": "Appendix C — Quick Reference Cards"}[key]


BUNDLE_FORMAT = "ums-manual/1"   # the importer refuses any other format (pinned)


def build_meta():
    """version + built date — build.py's own constants, read rather than copied."""
    src = open("build.py", encoding="utf-8").read()
    ver = re.search(r'^VERSION = "([^"]+)"', src, re.M)
    blt = re.search(r'^BUILT = "([^"]+)"', src, re.M)
    if not ver or not blt:
        errors.append("build.py: VERSION / BUILT not found")
        return "", ""
    return ver.group(1), blt.group(1)


def sec_target(sec, anchors):
    """A section number → {id, anchor} (anchor '' for a whole article)."""
    a = anchors.get(sec)
    if not a:
        errors.append(f"UNRESOLVABLE REF {sec} (router or changelog)")
        return None
    whole = a["level"] == 2 and not sec.startswith("§A-")
    return {"id": a["id"], "anchor": "" if whole else dnum(sec)}


def build_router(p1_text, anchors):
    """The Part 1 call router: each 'The caller says…' row of §1-1, split on
    ' / ' between quoted phrases (make_html.py's rule), with its group (the
    §1-1.x heading) and EVERY section its answer cites, first one primary."""
    m = re.search(r"^## §1-1 .*?(?=^## §)", p1_text, re.M | re.S)
    if not m:
        errors.append("p1: the §1-1 call router was not found")
        return []
    out, group = [], ""
    for line in m.group(0).split("\n"):
        h = re.match(r"^### §[\w\-.]+ (.+)$", line)
        if h:
            group = h.group(1).strip()
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")] if line.startswith("|") else []
        if len(cells) != 2 or cells[0].startswith("---") or cells[0].startswith("The caller"):
            continue
        refs = re.findall(r"\[\[(§[\w\-.]+)\]\]", cells[1])
        if not refs:
            continue
        targets = [t for t in (sec_target(r, anchors) for r in refs) if t]
        answer = md_plain(re.sub(r"\[\[(§[\w\-.]+)\]\]", lambda x: dnum(x.group(1)), cells[1])).strip()
        for ph in re.split(r"\s*/\s*(?=[\"\u201c])", cells[0]):
            ph = ph.strip().strip('"\u201c\u201d').strip()
            if len(ph) < 4:
                continue
            out.append({"g": group, "q": ph, "a": answer, "t": targets})
    if not out:
        errors.append("p1: the §1-1 call router has no rows")
    return out


GLOSSARY_SMALL = {"of", "the", "and", "to", "for", "a", "an", "in", "on", "with", "or", "by", "at", "per"}


def build_synonyms():
    """Batch M5b — the glossary's abbreviations as search synonyms: [[term,
    expansion], ...]. A term qualifies only when its definition SPELLS it out
    — the initials of the definition's leading words are the term's letters
    ("ABN" → "Advance Beneficiary Notice"; "CPAP" → "Continuous Positive
    Airway Pressure", the trailing "device" dropped) — or when the whole
    definition is a short name of at most three words (the note-taking
    shorthand: "MCD" → "Medicaid", "PWC" → "Power Wheelchair"). A definition
    that explains rather than expands ("Two meanings…", "Transaction — the
    order record") never becomes a synonym. The app matches the expansion as a
    PHRASE, never its words one by one."""
    out, seen = [], set()
    for g in GLOSSARY:
        term = g["term"].strip()
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9&]{1,11}", term) or term.lower() in seen:
            continue
        d = md_plain(g["definition"]).replace("\n", " ").strip()
        lead = re.split(r"\s+[—–-]\s+|\.\s|\.$|;|\s\(", d, maxsplit=1)[0].strip().rstrip(".")
        spans = [m for m in re.finditer(r"[^\s\-/]+", lead)]   # each word with WHERE it ends in the lead
        words = [m.group(0) for m in spans]
        letters = re.sub(r"[^a-z]", "", term.lower())
        exp = None
        for keep_small in (False, True):
            picked = [m for m in spans if m.group(0)[0].isalpha() and (keep_small or m.group(0).lower() not in GLOSSARY_SMALL)]
            if len(letters) >= 2 and len(picked) >= len(letters) and "".join(m.group(0)[0].lower() for m in picked[:len(letters)]) == letters:
                exp = lead[: picked[len(letters) - 1].end()]
                break
        if exp is None and len(words) <= 3 and "—" not in d and "/" not in d and not re.search(r"\bmeanings?\b", d, re.I):
            exp = d.rstrip(".")
        if not exp or exp.lower() == term.lower() or len(exp) > 80:
            continue
        seen.add(term.lower())
        out.append([term, exp])
    return sorted(out, key=lambda p: p[0].lower())


def build_changelog(anchors):
    out = []
    for c in json.load(open("data/changelog.json", encoding="utf-8")):
        t = sec_target(c["section"], anchors)
        if not t:
            continue
        out.append({"date": c["date"], "num": dnum(c["section"]), "id": t["id"], "anchor": t["anchor"],
                    "summary": c["summary"], "retraining": bool(c.get("retraining"))})
    out.sort(key=lambda c: (c["date"], c["num"]), reverse=True)
    return out


# ------------------------------------------------------- diagram partial ---
DIAGRAM_PARTIAL = os.path.join(HERE, "..", "web-app", "kb", "script_manual_diagrams.html")
# The manual's diagram colours. Each becomes --dg-<name>, which the app's
# stylesheet maps onto a design token (pinned: every --dg-* used is mapped).
DG_VARS = ("navy", "accent", "tint", "ink", "muted", "rule", "bg", "panel",
           "crit-bg", "crit-ink", "pol-bg", "pol-ink", "watch-bg", "watch-ink",
           "scr-bg", "scr-ink") + tuple(f"p{i}" for i in range(11))
DG_FONTS = {"'IBM Plex Sans',sans-serif": "var(--ui)", "'IBM Plex Mono',monospace": "var(--mono)"}
# The allowlist. Anything else in a diagram fails the export (pinned against
# the committed partial by the Node harness, independently of this code).
DG_ELEMENTS = {"svg", "defs", "marker", "path", "rect", "text", "tspan", "line",
               "polygon", "polyline", "circle", "ellipse", "g", "a", "style", "title", "desc"}
DG_ATTRS = {"viewBox", "xmlns", "role", "aria-label", "id", "class", "style",
            "refX", "refY", "markerWidth", "markerHeight", "orient", "d", "points",
            "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "width", "height",
            "fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray",
            "stroke-linecap", "stroke-linejoin", "opacity", "text-anchor",
            "dominant-baseline", "font-weight", "font-size", "transform",
            "href", "data-kb-id", "data-kb-anchor"}
DG_TAG = re.compile(r"<(/?)([A-Za-z]+)((?:\s+[A-Za-z][\w:-]*=\"[^\"<>]*\")*)\s*(/?)>")
DG_ATTR = re.compile(r"\s+([A-Za-z][\w:-]*)=\"([^\"<>]*)\"")


def dg_css_ok(css, where, ids):
    """Declarations may name colours, sizes and fonts — nothing that fetches or runs."""
    if re.search(r"@|\\|expression|javascript:|behavior", css, re.I):
        errors.append(f"diagram {where}: disallowed CSS")
    for u in re.findall(r"url\(([^)]*)\)", css):
        if not re.fullmatch(r"#[A-Za-z][\w-]*", u) or u[1:] not in ids:
            errors.append(f"diagram {where}: url({u}) is not a marker in the same diagram")


def dg_theme(text):
    for src, dst in DG_FONTS.items():
        text = text.replace(src, dst)

    def var(m):
        if m.group(1) in ("ui", "mono") or m.group(1).startswith("dg-"):
            return m.group(0)   # the app's font tokens, or a colour already renamed
        if m.group(1) not in DG_VARS:
            errors.append(f"diagram colour --{m.group(1)} has no app mapping")
        return f"var(--dg-{m.group(1)})"
    return re.sub(r"var\(--([a-z0-9-]+)\)", var, text)


def diagram_svg(name, svg, anchors, heads):
    """One diagram, made safe to draw inside the app: allowlisted, themed,
    scoped and cross-linked. Returns the string, or None on an error."""
    n0 = len(errors)
    if re.search(r"<!--|<!\[|<\?|<!DOCTYPE", svg):
        errors.append(f"diagram {name}: comment, CDATA or processing instruction")
    ids = set(re.findall(r'(?<![\w-])id="([^"]+)"', svg))
    for i in ids:
        if not re.fullmatch(r"[A-Za-z][\w-]*", i):
            errors.append(f"diagram {name}: odd id {i!r}")
    scope = f".kbdg-{name}"

    def style_block(m):
        css = m.group(1)
        dg_css_ok(css, name, ids)
        out = []
        for sel, body in re.findall(r"([^{}]+)\{([^{}]*)\}", css):
            sels = ", ".join(f"{scope} {x.strip()}" for x in sel.split(",") if x.strip())
            out.append(f"{sels}{{{dg_theme(body.strip())}}}")
        if re.sub(r"([^{}]+)\{([^{}]*)\}", "", css).strip():
            errors.append(f"diagram {name}: CSS outside a plain rule")
        return "<style>" + "".join(out) + "</style>"
    svg = re.sub(r"<style>(.*?)</style>", style_block, svg, flags=re.S)

    def link(m):
        sec = "§" + m.group(1).replace("_", ".")
        a = anchors.get(sec)
        if not a:
            errors.append(f"diagram {name}: link to {sec}, which no section defines")
            return m.group(0)
        n = dnum(sec)
        whole = a["level"] == 2 and a["id"] == article_id(sec) and not sec.startswith("§A-")
        frag = "" if whole else n
        if frag and frag not in heads.get(a["id"], set()):
            errors.append(f"diagram {name}: link to {a['id']}#{frag} — no such heading")
        return f'<a class="kb-xref" href="#" data-kb-id="{a["id"]}" data-kb-anchor="{frag}">'
    svg = re.sub(r'<a class="xr" href="#([\w-]+)">', link, svg)

    has_link = "kb-xref" in svg
    def root(m):
        attrs = m.group(1)
        if 'class="' in attrs:
            errors.append(f"diagram {name}: the root already has a class")
        if has_link:   # a role="img" hides its links from assistive technology
            attrs = attrs.replace('role="img"', 'role="group"')
        return f'<svg class="kbdg {scope[1:]}"{attrs}>'
    svg = re.sub(r"<svg((?:\s[^>]*)?)>", root, svg, count=1)
    svg = dg_theme(svg)

    for m in DG_TAG.finditer(svg):
        tag = m.group(2)
        if tag not in DG_ELEMENTS:
            errors.append(f"diagram {name}: element <{tag}> is not allowlisted")
        for an, av in DG_ATTR.findall(m.group(3)):
            if an not in DG_ATTRS:
                errors.append(f"diagram {name}: attribute {an} on <{tag}> is not allowlisted")
            elif an == "href" and av != "#":
                errors.append(f"diagram {name}: href {av!r} (only a cross-reference's '#')")
            elif an == "style":
                dg_css_ok(av, name, ids)
            elif re.search(r"url\(", av):
                dg_css_ok(av, name, ids)
    if len(re.findall(r"<", svg)) != len(list(DG_TAG.finditer(svg))):
        errors.append(f"diagram {name}: markup the tag reader cannot account for")
    return None if len(errors) > n0 else svg


def diagram_source_hash():
    """The partial records this; the Node harness recomputes it from the same
    files, so an edited diagram with a stale partial fails CI."""
    h = hashlib.sha256()
    for f in sorted(os.listdir("diagrams")):
        if f.endswith(".svg"):
            h.update((f + "\n" + open(os.path.join("diagrams", f), encoding="utf-8").read() + "\n").encode("utf-8"))
    return h.hexdigest()


def build_diagram_partial(anchors, heads):
    out, seen_ids = {}, {}
    for f in sorted(os.listdir("diagrams")):
        if not f.endswith(".svg"):
            continue
        name = f[:-4]
        if not re.fullmatch(r"[a-z0-9-]{1,60}", name):
            errors.append(f"diagram file name {f!r} (lowercase letters, digits, hyphens)")
            continue
        svg = diagram_svg(name, open(os.path.join("diagrams", f), encoding="utf-8").read(), anchors, heads)
        if svg is None:
            continue
        for i in re.findall(r'(?<![\w-])id="([^"]+)"', svg):
            if i in seen_ids:
                errors.append(f"diagram {name}: id {i} is also used by {seen_ids[i]} (ids share one page)")
            seen_ids[i] = name
        out[name] = svg
    body = ",\n".join(json.dumps(k) + ": " + json.dumps(v).replace("</", "<\\/") for k, v in out.items())
    return ("<!-- GENERATED by manual/export_reference.py from manual/diagrams/*.svg — do not edit by hand.\n"
            f"     diagram-source-sha256: {diagram_source_hash()}\n"
            "     Change a diagram in manual/diagrams/, re-run the export, commit this file and deploy. -->\n"
            "<script>\n"
            "// Batch M3 — the procedures manual's diagrams, keyed by the name a ```diagram fence gives.\n"
            "var KB_MANUAL_DIAGRAMS = Object.freeze({\n" + body + "\n});\n"
            "</script>\n"), len(out)


def main():
    with tempfile.TemporaryDirectory() as tmp:
        bodies = {k: render(k, src, tmp) for k, (_, src) in PARTS.items()}
        for k, src in APPX.items():
            bodies["appx_" + k] = render("appx_" + k, src, tmp)

    # Section index: every numbered heading, the article it lands in, and the
    # heading number a kb: link's fragment names.
    anchors = {}
    for k, text in bodies.items():
        for m in SEC_HEAD.finditer(text or ""):
            sec = m.group(2)
            if sec in anchors:
                errors.append(f"section {sec} defined twice")
            anchors[sec] = {"title": m.group(3).strip(), "owner": k, "level": len(m.group(1)),
                            "id": article_id(sec)}

    def ref(m):
        sec = m.group(1)
        a = anchors.get(sec)
        if not a and re.match(r"§[DE]-", sec):
            # Appendix D (changelog) and E (index) are generated per artifact by
            # build.py and are not Reference articles; the number stays readable.
            NOT_IMPORTED.append(sec)
            return f"**{dnum(sec)}** (the manual's {'changelog' if sec[1] == 'D' else 'index'})"
        if not a:
            errors.append(f"UNRESOLVABLE REF {sec}")
            return m.group(0)
        n = dnum(sec)
        title = re.sub(r"^§[\w\-.]+\s+", "", a["title"])
        label = f"{n} {title}"
        if a["owner"].startswith("p") and a["owner"] != ref.own:
            label += f" ({PARTS[a['owner']][0]})"
        whole = a["level"] == 2 and a["id"] == article_id(sec) and not sec.startswith("§A-")
        target = a["id"] if whole else f"{a['id']}#{n}"
        label = label.replace("[", "(").replace("]", ")")
        return f"[{label}](kb:{target})"

    def role(m):
        want = m.group(1).strip().lower()
        for r in ROSTER:
            hay = (r["role"] + " " + (r.get("note") or "")).lower()
            if want in hay or all(w in hay for w in want.split()):
                return f"[{r['role']}](kb:man-b-1)"
        errors.append(f"ROLE {m.group(1)!r} matches nothing in roster.json")
        return m.group(0)

    router = build_router(bodies.get("p1") or "", anchors)
    changelog = build_changelog(anchors)
    synonyms = build_synonyms()
    version, built = build_meta()

    articles = [howto_article()]
    for k, text in bodies.items():
        if not text:
            continue
        ref.own = k
        text = re.sub(r"\[\[(§[\w\-.]+)\]\]", ref, text)
        text = re.sub(r"`?\[ROLE:\s*([^\]]+)\]`?", role, text)
        articles += split_articles(k, text)

    by_id = {}
    for a in articles:
        if a["Id"] in by_id:
            errors.append(f"article id {a['Id']} produced twice")
        by_id[a["Id"]] = a

    # Every kb: link names an article this export writes, and a fragment names
    # a numbered heading inside it.
    heads = {a["Id"]: set(re.findall(r"^#{2,3} (\S+) ", a["BodyMd"], re.M)) for a in articles}
    links = 0
    for a in articles:
        for m in re.finditer(r"\]\(kb:([\w\-]+)(?:#([^)\s]+))?\)", a["BodyMd"]):
            links += 1
            tid, frag = m.group(1), m.group(2)
            if tid not in by_id:
                errors.append(f"{a['Id']}: link to missing article {tid}")
            elif frag and frag not in heads[tid]:
                errors.append(f"{a['Id']}: link to {tid}#{frag} — no such heading")
        if len(a["BodyMd"]) > BODY_MAX:
            errors.append(f"{a['Id']}: body is {len(a['BodyMd']):,} characters "
                          f"(the Reference limit is {BODY_MAX:,})")
        for m in re.finditer(r"\[\[§|\[ROLE:", a["BodyMd"]):
            errors.append(f"{a['Id']}: unresolved marker {m.group(0)}")

    in_repo = os.path.isdir(os.path.dirname(DIAGRAM_PARTIAL))
    partial, n_diagrams = build_diagram_partial(anchors, heads) if in_repo else (None, 0)

    for a in articles:
        a["SourceHash"] = hashlib.sha256(json.dumps(
            [a["Department"], a["Title"], a["SortOrder"], a["BodyMd"]],
            ensure_ascii=False).encode("utf-8")).hexdigest()

    print(f"articles              : {len(articles)}")
    print(f"cross-references      : {links} (every target verified)")
    print(f"images referenced     : {len(IMAGES)}")
    print(f"call router           : {len(router)} caller phrases in {len({r['g'] for r in router})} groups")
    print(f"changelog             : {len(changelog)} dated changes")
    print(f"search synonyms       : {len(synonyms)} glossary abbreviations, matched as phrases")
    print(f"largest body          : {max(len(a['BodyMd']) for a in articles):,} characters")
    if in_repo:
        print(f"diagrams              : {n_diagrams} in the app partial")
    if GLOSSARY_FOLDS:
        print(f"glossary spellings    : folded {', '.join(GLOSSARY_FOLDS)}")
    if NOT_IMPORTED:
        print(f"generated appendices  : {len(NOT_IMPORTED)} reference(s) drawn as text "
              f"({', '.join(sorted(set(NOT_IMPORTED)))})")
    if errors:
        print(f"\nERRORS ({len(errors)}) — nothing written")
        for e in errors[:60]:
            print("  ✗", e)
        if len(errors) > 60:
            print(f"  … and {len(errors) - 60} more")
        return 1

    out = os.path.join(os.environ.get("MANUAL_OUT", "dist"), "reference")
    os.makedirs(out, exist_ok=True)
    images = {k: {"alt": IMAGES[k]["alt"], "kind": IMAGES[k]["kind"], "dataUri": IMAGES[k]["dataUri"]}
              for k in sorted(IMAGES)}
    bundle = {"format": BUNDLE_FORMAT, "version": version, "built": built,
              "router": router, "changelog": changelog, "synonyms": synonyms, "articles": articles, "images": images}
    with open(os.path.join(out, "manual.json"), "w", encoding="utf-8") as f:
        json.dump(bundle, f, ensure_ascii=False, indent=1)
        f.write("\n")
    stale = os.path.join(out, "images.json")   # M1/M2 wrote the images separately
    if os.path.exists(stale):
        os.remove(stale)
    print(f"\nwritten -> {out}/manual.json ({os.path.getsize(os.path.join(out, 'manual.json')):,} bytes, images included)")
    if partial is not None:
        prev = open(DIAGRAM_PARTIAL, encoding="utf-8").read() if os.path.exists(DIAGRAM_PARTIAL) else None
        if prev == partial:
            print("diagram partial       : unchanged")
        else:
            with open(DIAGRAM_PARTIAL, "w", encoding="utf-8") as f:
                f.write(partial)
            print("diagram partial       : UPDATED web-app/kb/script_manual_diagrams.html — "
                  "commit it and deploy; diagrams reach the app with the code, not the import")
    xref_report(os.path.join(out, "manual.json"))
    return 0


def xref_report(path):
    """Batch M5a — which cross-references preview the target's OPENING (no
    block of it clearly matches the link) and carry no heading anchor to fix
    that. The app's own scorer does the work (scripts/manual-xref-report.mjs
    reads it out of script_kb.html), so the report is the preview a rep sees.
    WARNING only: a missing Node or a failed run never fails the export."""
    script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scripts", "manual-xref-report.mjs")
    try:
        r = subprocess.run(["node", script, path], capture_output=True, text=True, timeout=120)
    except (OSError, subprocess.SubprocessError) as e:
        print(f"xref previews         : not checked ({e.__class__.__name__} — Node is needed for the report)")
        return
    lines = (r.stdout or r.stderr or "").strip().splitlines()
    for ln in lines:
        print(("xref previews         : " + ln) if not ln.startswith("  ") else ln)


def howto_article():
    """build.py's front page ("How to use this manual") — Part 0 points at it.
    Read from build.py's own HOWTO literal rather than copied, so it cannot drift."""
    m = re.search(r'^HOWTO = """(.*?)"""', open("build.py", encoding="utf-8").read(), re.M | re.S)
    if not m:
        errors.append("build.py: the HOWTO front page was not found")
        return make_article("man-howto", department("p0"), "How to use this manual", "", 0)
    body = re.sub(r"^## How to use this manual\n", "", m.group(1).strip())
    body = re.sub(r"^### ", "## ", body, flags=re.M)
    return make_article("man-howto", department("p0"), "How to use this manual", body, 0)


def split_articles(k, text):
    """One article per level-2 section; Appendix A is ONE article."""
    dept = department(k)
    if k == "appx_a":
        body = re.sub(r"^# [^\n]*\n", "", text, count=1)
        return [make_article("man-a", dept, "Glossary", body, 1)]
    parts = re.split(r"^(?=## §)", text, flags=re.M)
    head, secs = parts[0], parts[1:]
    lead = re.sub(r"^# [^\n]*\n", "", head.strip(), count=1)
    lead = re.sub(r"(?m)^-{3,}\s*$", "", lead).strip()
    if lead and k != "appx_c":        # Appendix C's lead describes extracts only
        errors.append(f"{k}: text before the first section would be dropped: {lead[:80]!r}")
    out = []
    for i, s in enumerate(secs, 1):
        m = re.match(r"## (§[\w\-.]+) (.+)\n", s)
        sec, title = m.group(1), m.group(2).strip()
        n = dnum(sec)
        full = f"Card {n.split()[-1]} — {title}" if sec.startswith("§C-") else f"{n} {title}"
        out.append(make_article(article_id(sec), dept, full, s[m.end():], i))
    return out


def scripts_to_snippets(body):
    """A Script callout becomes a copyable snippet card; its label rides the fence."""
    lines = body.split("\n")
    out, i = [], 0
    while i < len(lines):
        m = re.match(r"^> \*\*Script(?:\s*[—–-]\s*([^*]*?))?\.?\*\*\s*(.*)$", lines[i])
        if not m:
            out.append(lines[i])
            i += 1
            continue
        label = (m.group(1) or "").strip().rstrip(".")
        chunk = [m.group(2)]
        i += 1
        while i < len(lines) and lines[i].startswith(">"):
            chunk.append(re.sub(r"^> ?", "", lines[i]))
            i += 1
        text = md_plain("\n".join(chunk).strip())
        text = re.sub(r"\[([^\]]+)\]\((?:kb|https?|mailto):[^)]+\)", r"\1", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        q = re.fullmatch(r'["\u201c]([^"\u201c\u201d]*)["\u201d]', text)
        if q:                         # one quoted line: copy the words, not the quotes
            text = q.group(1)
        out.append("```snippet: Script" + (" — " + label if label else ""))
        out.append(text)
        out.append("```")
    return "\n".join(out)


def make_article(aid, dept, title, body, order):
    body = re.sub(r"^### (§[\w\-.]+) ", lambda m: "## " + dnum(m.group(1)) + " ", body, flags=re.M)
    body = re.sub(r"^## (§A-\d+) ", lambda m: "## " + dnum(m.group(1)) + " ", body, flags=re.M)
    body = scripts_to_snippets(body)
    body = body.strip("\n")
    body = re.sub(r"^(?:-{3,}\s*\n+)+", "", body)
    body = re.sub(r"(?:\n+-{3,}\s*)+$", "", body)
    body = re.sub(r"\n{3,}", "\n\n", body).strip() + "\n"
    return {"Id": aid, "Department": dept, "Title": title, "Type": "article",
            "BodyMd": body, "SortOrder": order}


if __name__ == "__main__":
    sys.exit(main())
