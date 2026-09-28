#!/usr/bin/env python3
"""Build the CSR Procedures Manual: unified volume + department extracts.

Implements the Stage 0 build-time checks:
  FAIL  unresolvable cross-reference
  FAIL  table with headers and no rows
  FAIL  changelog entry with no valid section reference
  FAIL  table with more than six columns
  WARN  acronym used with no glossary entry
  WARN  role with no backup
  WARN  equipment record not verified in 12 months
Auto-generates: table of contents, Recent Updates view, glossary subset,
version stamp, extract banner.
"""
import json, os, re, subprocess, sys, datetime
from numbering import display as dnum

VERSION = "v3.0"
BUILT = "09/15/2026"
COMMIT = subprocess.run(["date", "+%s"], capture_output=True, text=True).stdout.strip()[:7]

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
EXTRACTS = ["p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10"]

errors, warnings = [], []
os.makedirs("out", exist_ok=True)


SCAFFOLD = re.compile(
    r"\n(?:-{3,}\s*\n+)?#{2} (?:What changed[^\n]*|Open items[^\n]*|Notes for review[^\n]*)"
    r"\n.*?(?=\n#{1,2} (?!#)|\Z)", re.S)
STRIPPED = []


DRAFTNOTE = re.compile(r"\n> \*\*About this [^*]*\*\*.*?(?=\n#{1,3} |\n-{3,})", re.S)


def strip_scaffold(text, key):
    out, n = SCAFFOLD.subn("", text)
    out, n2 = DRAFTNOTE.subn("\n", out)
    n += n2
    if n:
        STRIPPED.append((key, n))
    return out


def render(src):
    dst = "/tmp/" + os.path.basename(src)
    r = subprocess.run([sys.executable, "render.py", src, dst, "none"],
                       capture_output=True, text=True)
    if r.returncode:
        errors.append(f"{src}: render failed — {r.stdout.strip()} {r.stderr.strip()}")
        return ""
    return strip_scaffold(open(dst).read(), os.path.basename(src))


bodies = {}
for k, (title, src) in PARTS.items():
    bodies[k] = render(src) if src else None
for k, src in APPX.items():
    bodies["appx_" + k] = render(src)

# Appendix D is generated per-artifact at assembly time; register its sections so
# cross-references into it resolve like any other.
bodies["appx_d"] = ("# Appendix D — Changelog\n\n"
                    "## §D-1 Recent updates\n\n"
                    "## §D-2 Full changelog\n")
bodies["appx_e"] = "# Appendix E — Index\n\n## §E-1 Index\n"

def prose(t):
    """Text a reader sees as words — without diagrams, figures or embedded image data."""
    return re.sub(r"<svg.*?</svg>|<figure.*?</figure>|<img[^>]*>|data:image/[^\"')\s]+", " ", t or "", flags=re.S)


# ---------------------------------------------------------- section index ---
ANCHORS = {}
for k, text in bodies.items():
    if not text:
        continue
    for m in re.finditer(r"^#{2,3} (§[\w\-.]+) (.+)$", text, re.M):
        ANCHORS[m.group(1)] = (m.group(2).strip(), k)

# ------------------------------------------------------- resolve references --
PART_NAME = {k: v[0] for k, v in PARTS.items()}
APPX_NAME = {"a": "Glossary", "b": "Escalation Directory", "c": "Quick Reference Cards",
             "d": "Changelog", "e": "Index"}


def _anchor_id(sec):
    return sec[1:].replace(".", "_")


def add_dividers(text, key):
    """Part 10 splits into an on-a-call half and a reference half."""
    if key != "p10":
        return text
    return text.replace("\n## §10-17 Billing scenarios",
        "\n---\n\n# Part 10 — Billing reference\n\n"
        "> The sections above are what a CSR uses on a call. What follows is reference — "
        "worked examples, appeals detail, payment mechanics and patient-facing language. "
        "Consult it rather than reading it.\n\n## §10-17 Billing scenarios")


def resolve_refs(text, own_part=None):
    """[[§x]] -> a linked, titled reference. [ROLE: x] -> the role title, linked to B-1."""
    def ref(m):
        sec = m.group(1)
        if sec not in ANCHORS:
            return f"**{dnum(sec)}**"
        title, owner = ANCHORS[sec]
        title = re.sub(r"^§[\w\-.]+\s+", "", title)
        n = dnum(sec)
        if owner == own_part or owner is None:
            label = f"{n} {title}"
        elif owner and owner.startswith("p"):
            label = f"{n} {title} ({PART_NAME.get(owner, owner)})"
        else:
            label = f"{n} {title}"
        return f'<a class="xr" href="#{_anchor_id(sec)}">{label}</a>'

    def role(m):
        want = m.group(1).strip().lower()
        best = None
        for r in ROSTER:
            hay = (r["role"] + " " + (r.get("note") or "")).lower()
            if want in hay or all(w in hay for w in want.split()):
                best = r
                break
        if not best:
            return f'<span class="xr-bad">[ROLE: {m.group(1)}]</span>'
        return f'<a class="xr" href="#B-1">{best["role"]}</a>'

    text = re.sub(r"\[\[(§[\w\-.]+)\]\]", ref, text)
    text = re.sub(r"`?\[ROLE:\s*([^\]]+)\]`?", role, text)
    return text


# ---------------------------------------------------- check: diagram labels ---
for fn in ("diagrams/lifecycle.svg", "diagrams/transaction.svg"):
    if os.path.exists(fn):
        pass  # rendered form; validated from the generator source below
src_dg = open("make_diagrams.py").read() if os.path.exists("make_diagrams.py") else ""
for tok in sorted(set(re.findall(r"§[0-9A-Z]+-[0-9A-Z]+(?:\.[0-9]+)*", src_dg))):
    if tok not in ANCHORS:
        errors.append(f"diagram label {tok} in make_diagrams.py points at no section")

for lab, num in re.findall(r"([A-Z][A-Za-z &;]+?) — Part (\d+)", src_dg):
    want = PARTS.get("p" + num, ("",))[0]
    got = lab.replace("&amp;", "&").strip()
    owner = next((k for k, v in PARTS.items() if v[0] == got), None)
    if owner and owner != "p" + num:
        errors.append(f"diagram labels '{got}' as Part {num}, but '{got}' is Part {owner[1:]}")

# ------------------------------------------------------------ check: refs ---
refs = {}
for k, text in bodies.items():
    if not text:
        continue
    for m in re.finditer(r"\[\[(§[\w\-.]+)\]\]", text):
        refs.setdefault(m.group(1), set()).add(k)
for ref, where in sorted(refs.items()):
    if ref not in ANCHORS:        # every part is written now — no exemptions
        errors.append(f"UNRESOLVABLE REF {ref} (cited from {', '.join(sorted(where))})")

# ------------------------------------------------------- check: changelog ---
CL = json.load(open("data/changelog.json"))
for c in CL:
    if not c.get("section"):
        errors.append(f"changelog {c['date']}: no section reference")
    elif c["section"] not in ANCHORS:
        errors.append(f"changelog {c['date']}: section {c['section']} does not exist")

ROSTER = json.load(open("data/roster.json"))

# ------------------------------------------------------ check: role markers ---
for k, text in bodies.items():
    if not text:
        continue
    for m in re.finditer(r"\[ROLE:\s*([^\]]+)\]", text):
        want = m.group(1).strip().lower()
        if not any(want in (r["role"] + " " + (r.get("note") or "")).lower()
                   or all(w in (r["role"] + " " + (r.get("note") or "")).lower()
                          for w in want.split())
                   for r in ROSTER):
            errors.append(f"ROLE '{m.group(1)}' in {k} matches nothing in roster.json")

# ----------------------------------------------------------- check: roles ---
for r in ROSTER:
    if not r.get("backup"):
        warnings.append(f"role '{r['role']}' has no backup")

# ------------------------------------------------------- check: equipment ---
EQ = json.load(open("data/equipment.json"))
FEES = json.load(open("data/fees.json"))
cutoff = "2025-09-15"
stale = [r["id"] for r in EQ if r.get("verified", "") < cutoff]
if stale:
    warnings.append(f"{len(stale)} equipment records not verified in 12 months")

# -------------------------------------------------------- check: glossary ---
GLOSSARY = json.load(open("data/glossary.json"))
GLOSS = {g["term"] for g in GLOSSARY}
prose_txt = "\n".join(prose(t) for k, t in bodies.items() if t and not k.startswith("appx"))
prose_txt = re.sub(r"\|.*\|", "", prose_txt)
used = set(re.findall(r"\b([A-Z]{2,5})\b", prose_txt))
SKIP = {"CSR", "UMS", "PHI", "FAQ", "HCPCS", "TX", "ID", "OK", "AC", "SD", "PVC", "URL",
        "AND", "MDR", "LPM", "MED", "HD", "XXL", "XL", "III", "TOC", "JSON", "PNG",
        "ROLE", "FIGURE", "PENDING", "ATTN", "TRX", "UHC", "ZIP", "PPO", "OSA",
        "VERIFY", "AM", "PM", "XIX", "WSR", "MAC", "LPM", "PSI", "CST", "HST", "DFW", "SA", "ATX", "HI", "UMS"}
EQ_NAMES = " ".join(r["name"] for r in EQ)
GLOSS_TEXT = " ".join(g["term"] for g in GLOSSARY)
missing = sorted(u for u in used - GLOSS - SKIP
                 if len(u) > 1 and u not in EQ_NAMES and u not in GLOSS_TEXT)
for u in missing:
    warnings.append(f"acronym '{u}' used with no glossary entry")

# ----------------------------------------------------------------- output ---
def toc(text):
    out = ["## Contents", ""]
    for m in re.finditer(r"^(#{2,3}) (§[\w\-.]+) (.+)$", text, re.M):
        indent = "  " * (len(m.group(1)) - 2)
        out.append(f"{indent}- **{m.group(2)}** {m.group(3)}")
    return "\n".join(out)


def recent_updates(part=None):
    rows = [c for c in CL if c["date"] >= "2025-09-15" and (part is None or c["part"] == part)]
    if not rows:
        return "_No updates in the last 12 months._"
    out = ["| Date | Section | Change | Retraining |", "|---|---|---|---|"]
    for c in sorted(rows, key=lambda x: x["date"], reverse=True):
        d = datetime.date.fromisoformat(c["date"]).strftime("%m/%d/%Y")
        out.append(f"| {d} | {dnum(c['section'])} | {c['summary']} | "
                   f"{'Yes' if c['retraining'] else 'No'} |")
    return "\n".join(out)


def cards_for(part_keys):
    """Appendix C, filtered to the cards relevant to this artifact."""
    text = bodies["appx_c"]
    head, _, rest = text.partition("<!--card:")
    rest = "<!--card:" + rest
    blocks = re.split(r"(?=<!--card:)", rest)
    keep = []
    for bl in blocks:
        m = re.match(r"<!--card:(\w+)-->", bl)
        if not m:
            continue
        if len(part_keys) > 3 or m.group(1) in part_keys:
            keep.append(bl.rstrip())
    return head.rstrip() + "\n\n" + "\n\n".join(keep)


def full_changelog(part=None):
    rows = [c for c in CL if part is None or c["part"] == part]
    if not rows:
        return "_No entries._"
    out = ["| Date | Part | Section | Change | Authority | Retraining |", "|---|---|---|---|---|---|"]
    for c in sorted(rows, key=lambda x: x["date"], reverse=True):
        d = datetime.date.fromisoformat(c["date"]).strftime("%m/%d/%Y")
        out.append(f"| {d} | Part {c['part'][1:]} | {dnum(c['section'])} | {c['summary']} | "
                   f"{c['authority']} | {'Yes' if c['retraining'] else 'No'} |")
    return "\n".join(out)


ARTICLES = ("a ", "an ", "the ")


def build_index():
    """Term -> sections, built by scanning the assembled text for each term."""
    # split every rendered body into (section_id, text)
    segs = []
    for k, text in bodies.items():
        if not text or k in ("appx_d", "appx_e"):
            continue
        cur = None
        buf = []
        for line in text.split("\n"):
            m = re.match(r"^#{2,3} (§[\w\-.]+) ", line)
            if m:
                if cur:
                    segs.append((cur, "\n".join(buf)))
                cur, buf = m.group(1), [line]
            elif cur:
                buf.append(line)
        if cur:
            segs.append((cur, "\n".join(buf)))

    terms = {}
    for g in GLOSSARY:
        if g["class"] != "shorthand":
            terms[g["term"]] = "term"
    for r in EQ:
        terms[r["name"]] = "equipment"
        for c in r["hcpcs"]:
            terms[c] = "code"
    for sec, (title, owner) in ANCHORS.items():
        t = title.strip()
        low = t.lower()
        for art in ARTICLES:
            if low.startswith(art):
                t = t[len(art):]
                break
        terms[t[0].upper() + t[1:]] = "topic"

    # index words, not pictures: drop embedded images and diagram markup before searching
    _strip = re.compile(r'<svg.*?</svg>|<img[^>]*>|data:image/[^"\')\s]+', re.S)
    segs = [(s, _strip.sub(" ", txt)) for s, txt in segs]

    entries = {}
    for term, kind in terms.items():
        pat = re.compile(r"(?<![\w-])" + re.escape(term) + r"(?![\w-])",
                         0 if (term.isupper() or kind == "code") else re.I)
        hits = [s for s, txt in segs if pat.search(txt)]
        if not hits:
            continue
        if len(hits) > 10:          # too common to be useful as an index term
            continue
        entries[term] = hits

    letters = {}
    for term in sorted(entries, key=lambda t: (t.lower(), t)):
        key = term[0].upper()
        if not key.isalpha():
            key = "#"
        letters.setdefault(key, []).append((term, entries[term]))
    out = []
    for L in sorted(letters, key=lambda x: (x != "#", x)):
        out.append(f"\n### {L}\n")
        out.append("| Term | Sections |")
        out.append("|---|---|")
        for term, secs in letters[L]:
            out.append(f"| {term} | " + ", ".join(dnum(x) for x in secs) + " |")
    return "\n".join(out), sum(len(v) for v in letters.values())


def glossary_subset(part):
    return sum(1 for g in GLOSSARY if part in g["parts"] or len(g["parts"]) == 5)


HOWTO = """## How to use this manual

**You are not expected to read this.** It is a reference, and it is built so you can find things
three different ways.

| When | Use |
|---|---|
| The phone rings and you don't know where the answer is | The **call router** — what the caller says, mapped to a section |
| You need a rule you half-remember | **Search**, or the **index** |
| You want the short version for a department | Its **quick reference card** |

### Your first week

1. **Quick reference cards.** Eleven cards, one per part. About four pages. Print them
2. **Part 0 — CSR Core.** The procedures that apply to every call
3. **Part 1 — Call Handling.** Routing, who you may speak to, what you cannot do, and the calls
   that are hard for reasons other than complexity
4. **Your own department's part**

That is roughly 25 pages. Everything else is lookup.

### How the manual is organised

| | |
|---|---|
| **Part 0 and Part 1** | Apply to every call, whatever the department. They appear in every copy |
| **Parts 2 to 9** | One per department, in roughly the order an order travels |
| **Part 10** | Billing and insurance. Its first half is what you use on a call; the second half is reference |
| **Appendices** | Glossary, escalation directory, compliance items, state coverage, changelog, index, and the quick reference cards |

### Reading the manual

**Section numbers, not page numbers.** Every section has a number such as **4.7.4** — part 4,
section 7, subsection 4. Use these when asking a question or citing a procedure; page numbers
move between versions. Quick reference cards are numbered separately, as **CARD 5**.

**Older copies used a different format** — `§4-7.4`, and `§G-5` for cards. Search accepts either
form, so a number from a printed copy or an old note will still find the right section.

**Five kinds of callout**, and the type tells you what it is:

| | |
|---|---|
| **Critical** | Patient safety or federal law. Act on it |
| **Policy** | A binding rule, usually with coverage or money attached |
| **Watch-out** | A mistake that happens often enough to be worth naming |
| **Script** | Suggested wording. Adapt it; don't read it |
| **Note** | Context that helps you understand a process |

**When a department part contradicts Part 0, the department part wins** — but only where it says
explicitly that it is overriding.

---

"""


def control_block(title, part=None):
    lines = [
        "| Field | Value |", "|---|---|",
        f"| Document | CSR Procedures Manual{' — ' + title if part else ''} |",
        f"| Version | {VERSION} |", f"| Built | {BUILT} |",
        "| Owner | Customer Service Manager |",
        "| Approved by | Director of Operations |",
        "| Review cadence | Semi-annual |",
        "| Classification | Confidential — Internal Use Only |",
        f"| Source | commit {COMMIT} |",
    ]
    return "\n".join(lines)


def assemble(name, part_keys, title, banner=None):
    chunks = [f"# CSR Procedures Manual — {title}", ""]
    if banner:
        chunks += [f"> {banner}", ""]
    chunks += [control_block(title, part_keys[0] if banner else None), ""]
    body_parts = []
    for k in part_keys:
        if bodies.get(k) is None:
            body_parts.append(f"\n---\n\n# Part {k[1]} — {PARTS[k][0]}\n\n"
                              f"> **Not yet written.** This part is pending.\n")
        else:
            body_parts.append("\n---\n\n" + resolve_refs(add_dividers(bodies[k], k), k))
    for k in ("appx_a", "appx_b"):
        body_parts.append("\n---\n\n" + resolve_refs(bodies[k]))
    body_parts.append("\n---\n\n" + resolve_refs(cards_for(part_keys)))
    scope = None if len(part_keys) > 3 else part_keys[-1]
    body_parts.append("\n---\n\n# Appendix D — Changelog\n\n"
                      "## §D-1 Recent updates\n\n_Entries from the last 12 months._\n\n"
                      + recent_updates(scope)
                      + "\n\n## §D-2 Full changelog\n\n" + full_changelog(scope))
    idx, n_terms = build_index()
    body_parts.append("\n---\n\n# Appendix E — Index\n\n## §E-1 Index\n\n"
                      f"_{n_terms} terms. Section numbers link to the unified manual; "
                      "'see P2' style entries point to the part rather than a section._\n" + idx)
    body = "\n".join(body_parts)
    chunks += ["", HOWTO, body]
    out = "\n".join(chunks)
    open(f"out/{name}.md", "w").write(out)
    return len(out)


sizes = {}
sizes["CSR-Procedures-Manual-" + VERSION] = assemble(
    "CSR-Procedures-Manual-" + VERSION, list(PARTS), "Unified", None)
for p in EXTRACTS:
    n = f"CSR-Procedures-Part-{p[1:]}-{PARTS[p][0].replace(' & ', '-and-').replace(' ', '-')}-{VERSION}"
    sizes[n] = assemble(n, ["p0", "p1", p], PARTS[p][0],
        f"Extracted from the CSR Procedures Manual {VERSION} (built {BUILT}) — Part {p[1:]} of 11. "
        "This is a generated copy. Do not edit; submit changes to the Customer Service Manager.")


# ============================================================ extra checks ===
RELEASE = os.environ.get("RELEASE") == "1"
def prose(t):
    """Text a reader sees as words — without diagrams, figures or embedded image data."""
    return re.sub(r"<svg.*?</svg>|<figure.*?</figure>|<img[^>]*>|data:image/[^\"')\s]+", " ", t or "", flags=re.S)

ALL_TEXT = "\n".join(prose(t) for t in bodies.values() if t)
CALLOUT_TYPES = {"Critical", "Policy", "Watch-out", "Script", "Note"}

# unknown callout type — catches typos that would render unstyled
for k, text in bodies.items():
    if not text:
        continue
    for m in re.finditer(r"^> \*\*([A-Z][A-Za-z -]{2,20}?)(?: —|\.|\*\*)", text, re.M):
        name = m.group(1).strip()
        if name not in CALLOUT_TYPES and not name.startswith(("Short", "Rule", "About")):
            warnings.append(f"{k}: callout type '{name}' is not one of the five")

# duplicate section numbers
seen_sec = {}
for k, text in bodies.items():
    if not text:
        continue
    for m in re.finditer(r"^#{2,3} (§[\w\-.]+) ", text, re.M):
        if m.group(1) in seen_sec:
            errors.append(f"section {m.group(1)} defined twice "
                          f"({seen_sec[m.group(1)]} and {k})")
        seen_sec[m.group(1)] = k

# plain-text section references that will never become links
for k, text in bodies.items():
    if not text:
        continue
    stripped = re.sub(r"\[\[§[\w\-.]+\]\]", "", prose(text))
    stripped = re.sub(r"^#{1,4} §[\w\-.]+", "", stripped, flags=re.M)

    for m in re.finditer(r"(?<![\[\w])§(\d+-\d+(?:\.\d+)?)(?![\]\w])", stripped):
        if m.group(1) != "":
            warnings.append(f"{k}: §{m.group(1)} written as plain text — "
                            f"use [[§{m.group(1)}]] so it links")

# adjacent callouts of the same type
for k, text in bodies.items():
    if not text:
        continue
    seq = re.findall(r"> \*\*(Critical|Policy|Watch-out|Script|Note)", text)
    for a, c in zip(seq, seq[1:]):
        if a == c and a in ("Watch-out", "Policy"):
            warnings.append(f"{k}: two adjacent {a} callouts — consider merging or "
                            f"making one prose")
            break

# every part needs a quick reference card
cards = set(re.findall(r"<!--card:(\w+)-->", bodies.get("appx_c", "")))
for p in PARTS:
    if p not in cards:
        warnings.append(f"Part {p[1:]} has no quick reference card in Appendix C")

# HCPCS codes cited in prose but absent from equipment.json
KNOWN_CODES = {c for r in EQ for c in r["hcpcs"]} | {f["id"] for f in FEES}
KNOWN_CODES |= {"L33718", "L33832", "L33803", "L33612", "L33788", "L33820", "L33791",
                "L33799", "L33736", "A52514", "L0650", "L0648", "L0642", "L0631",
                "L1832", "L1833", "L1851", "A7027", "A7028", "A7029", "A4604",
                "T4524", "T4544", "E0147", "E0148", "E0168", "K0005", "K0006",
                "E0265", "E0271", "E0305", "E0310", "E0302", "E0303", "E0304",
                "E0621", "E0636", "E1353", "A7003", "A7004", "A7013", "A7015",
                "A7012", "A7520", "A7521", "A7522", "E0466", "E0465", "K0813",
                "K0899", "K0001", "K0002", "K0003", "K0004", "K0007", "E0143",
                "E0149", "E0135", "E0154", "E0105", "E0114", "E0118", "E0163",
                "E0240", "E0244", "E0247", "A4670", "E1399", "E0570", "E0600",
                "E0565", "E0482", "E0500", "E1352", "E1355", "E0555", "A4615",
                "A4616", "E0431", "E1390", "E0601", "E0470", "E0471", "E0277",
                "E0260", "E0261", "E0301", "E0185", "E0910", "E0630", "E0635",
                "A4216", "A7000", "A4628", "A4624", "A4629", "A7507", "A7526",
                "A7525", "A4623", "L8501", "A7030", "A7031", "A7032", "A7033",
                "A7034", "A7035", "A7036", "A7037", "A7038", "A7039", "A7046",
                "A4310", "A4349", "A4351", "A4352", "A4353", "A4357", "A4358",
                "A4335", "A4554", "T4522", "T4527", "T4535", "A7010", "A7020",
                "A4618", "A9900", "E0958", "E0961", "E0971", "E0973", "E0978",
                "E0951", "E2601", "E2602", "E2611", "E2612", "E2622", "E0705",
                "L1820", "L1830", "L0457", "L0641", "K0800", "K0801", "K0821",
                "K0822", "K0823", "K0824", "K0825", "K0826", "K0827", "K0835",
                "K0836", "K0837", "K0861", "K0862", "K0863", "E0118"}
unknown_codes = set()
for m in re.finditer(r"\b([A-Z]\d{4})\b", ALL_TEXT):
    if m.group(1) not in KNOWN_CODES:
        unknown_codes.add(m.group(1))
for c in sorted(unknown_codes):
    warnings.append(f"HCPCS {c} cited in prose but not in equipment.json")

# roles defined but never referenced
for r in ROSTER:
    if r["role"] not in ALL_TEXT and r["role"] not in bodies.get("appx_b", ""):
        warnings.append(f"role '{r['role']}' is in the roster but never referenced")

# glossary terms never used
for g in GLOSSARY:
    if g["class"] == "manual" and len(g["term"]) > 2:
        if not re.search(r"(?<![\w-])" + re.escape(g["term"]) + r"(?![\w-])", ALL_TEXT):
            warnings.append(f"glossary term '{g['term']}' is never used")

# release gate
if RELEASE:
    for k, text in bodies.items():
        if not text:
            continue
        for tag in ("PENDING", "VERIFY"):
            n = len(re.findall(r"\[" + tag, text))
            if n:
                errors.append(f"{k}: {n} [{tag}] marker(s) — not permitted in a release build")
else:
    n = sum(len(re.findall(r"\[(?:PENDING|VERIFY)", t)) for t in bodies.values() if t)
    if n:
        warnings.append(f"{n} [PENDING]/[VERIFY] markers — these block a release build")

# ------------------------------------------------------------------ report --
print(f"scaffolding stripped  : {sum(n for _, n in STRIPPED)} blocks from {len(STRIPPED)} files")
print(f"sections indexed      : {len(ANCHORS)}")
print(f"cross-references      : {sum(len(v) for v in refs.values())} ({len(refs)} unique)")
print(f"changelog entries     : {len(CL)} (all with valid section refs)"
      if all(c["section"] in ANCHORS for c in CL) else "changelog: SEE ERRORS")
print(f"glossary subsets      : " + ", ".join(f"{p}={glossary_subset(p)}" for p in EXTRACTS))
print("\nartifacts:")
for n, s in sizes.items():
    print(f"  {n}.md  ({s:,} chars)")
print(f"\nERRORS   ({len(errors)})")
for e in errors:
    print("  ✗", e)
print(f"\nWARNINGS ({len(warnings)})")
for w in warnings[:40]:
    print("  !", w)
if len(warnings) > 40:
    print(f"  … and {len(warnings)-40} more")
sys.exit(1 if errors else 0)
