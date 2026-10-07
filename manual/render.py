#!/usr/bin/env python3
"""Expand {{eq:...}} and {{fees}} placeholders in a manual source file from data/*.json.

Demonstrates the Stage 5 build behaviour: tables are never hand-written in source,
so a spec can only be wrong in one place.
"""
import json, os, re, sys

EQ = json.load(open("data/equipment.json"))
GLOSSARY = json.load(open("data/glossary.json"))
ROSTER = json.load(open("data/roster.json"))
FEES = json.load(open("data/fees.json"))
BY_ID = {r["id"]: r for r in EQ}

COLS = [
    ("name", "Model"),
    ("hcpcs", "HCPCS"),
    ("part", "Part"),
    ("product_weight_lbs", "Product Wt."),
    ("capacity_lbs", "User Capacity"),
    ("dimensions", "Dimensions"),
    ("seat", "Seat"),
    ("allowance", "Allowance"),
    ("notes", "Notes"),
]


def cell(r, key):
    v = r.get(key)
    if v in (None, "", []):
        return ""
    if key == "hcpcs":
        return " / ".join(v)
    if key == "part":
        return "Part " + v[1:]
    if key == "product_weight_lbs":
        return f"{v:g} lbs"
    if key == "capacity_lbs":
        return f"{v:g} lbs"
    return str(v)


DIAGRAM_USES = {}

try:
    THUMBS = json.load(open("data/thumbs.json"))
except Exception:
    THUMBS = {}


try:
    FIGS = json.load(open("data/figures.json"))
    FIGB = json.load(open("data/figures_b64.json"))
except Exception:
    FIGS, FIGB = {}, {}


def photo(r):
    """Inline thumbnail for a product, when a photo file is available."""
    for p in r.get("images", []):
        if p in THUMBS:
            alt = r["name"].replace('"', "")
            return f'<img class="thumb" src="{THUMBS[p]}" alt="{alt}">'
    return ""


def table(rows, drop=(), extra_specs=None):
    drop = set(drop) | ({"part"} if "part" not in (extra_specs or []) else set())
    cols = [(k, h) for k, h in COLS if k not in drop]
    # drop columns empty for every row
    cols = [(k, h) for k, h in cols if any(cell(r, k) for r in rows)]
    if extra_specs:
        tail = [c for c in cols if c[0] == "notes"]
        cols = [c for c in cols if c[0] != "notes"]
        for label in extra_specs:
            if any(label == s["label"] for r in rows for s in r["specs"]):
                cols.append(("spec:" + label, label))
        cols += tail
    if len(cols) > 6:
        raise SystemExit(f"TABLE HAS {len(cols)} COLUMNS (max 6) — build would fail")
    out = ["| " + " | ".join(h for _, h in cols) + " |",
           "|" + "|".join("---" for _ in cols) + "|"]
    for r in rows:
        vals = []
        for k, _ in cols:
            if k.startswith("spec:"):
                lbl = k[5:]
                vals.append(next((s["value"] for s in r["specs"] if s["label"] == lbl), ""))
            elif k == "name":
                vals.append(photo(r) + cell(r, k))
            else:
                vals.append(cell(r, k))
        out.append("| " + " | ".join(v.replace("|", "\\|") for v in vals) + " |")
    return "\n".join(out)


# The billing tables name a category as a reader says it, not as its data key
CATEGORY_NAMES = {
    "bed-accessory": "Bed accessories", "bipap": "BiPAP", "cpap": "CPAP",
    "hospital-bed": "Hospital beds", "manual-wheelchair": "Manual wheelchairs",
    "oxygen-concentrator": "Oxygen concentrators", "oxygen-cylinder": "Oxygen cylinders",
    "patient-lift": "Patient lifts", "pov": "Scooters (POV)", "pwc": "Power wheelchairs",
    "respiratory-device": "Respiratory devices", "suction": "Suction machines",
    "ventilator": "Ventilators",
}


def oncall_table():
    """8.5: the on-call people only — one row per person, grouped by location.
    A roster row holding several people ("A / B / C") is split, and its phone
    and email lists are split alongside it; a role with no holder still shows,
    because the escalation chain names it."""
    def where(loc):
        loc = loc or ""
        if loc.startswith("Irving"):
            return "Irving office (DFW)"
        if loc.startswith("San Antonio"):
            return "San Antonio"
        return "All locations"
    order = ["Irving office (DFW)", "San Antonio", "All locations"]
    rows = []
    for r in ROSTER:
        if r["part"] != "p8" or not re.search(r"On-Call|Technician", r["role"]):
            continue
        label = re.sub(r"^On-Call ", "", r["role"])
        if label.endswith(" — San Antonio"):
            label = label[:-len(" — San Antonio")] + " — oxygen concentrator service only"
        label = re.sub(r" — Irving office$", "", label)
        names = [n.strip() for n in (r["holder"] or "").split(" / ") if n.strip()]
        phones = [re.sub(r"\s*\([^)]*[A-Za-z][^)]*\)$", "", p).strip() for p in (r.get("phone") or "").split(" / ")]
        mails = [m.strip() for m in (r.get("email") or "").split(" / ")]
        dom = mails[-1].split("@", 1)[1] if mails and "@" in mails[-1] else ""
        mails = [m + dom if m.endswith("@") else m for m in mails]
        if not names:
            rows.append((where(r.get("location")), "**None currently named**", label, "", ""))
            continue
        for i, n in enumerate(names):
            rows.append((where(r.get("location")), n, label,
                         phones[i] if i < len(phones) else "", mails[i] if i < len(mails) else ""))
    rows.sort(key=lambda x: order.index(x[0]))
    # every address shares the company domain, so the header names it once
    # and the cell carries what precedes the @ — the full address clipped
    doms = {m.split("@", 1)[1] for *_, m in rows if "@" in m}
    one = len(doms) == 1
    if one:
        rows = [(*x[:4], x[4].split("@", 1)[0]) for x in rows]
    out = [f"| Location | Name | Role | Phone | Email{' (@' + doms.pop() + ')' if one else ''} |", "|---|---|---|---|---|"]
    last = None
    for loc, n, label, ph, em in rows:
        ph = ph.replace(" ", "\u00a0").replace("-", "\u2011")  # a phone number never wraps
        out.append(f"| {'**' + loc + '**' if loc != last else ''} | {n} | {label} | {ph} | {em} |")
        last = loc
    return "\n".join(out)


def expand(m):
    spec = m.group(1).strip()
    if spec == "roster:leads":
        leads = [r for r in ROSTER if r.get("lead_of")]
        leads.sort(key=lambda r: (r["lead_of"], 0 if "Manager" in r["role"] else 1, r["role"]))
        out = ["| Department | Supervisor or manager | Role |", "|---|---|---|"]
        for r in leads:
            who = r.get("holder") or r.get("current_named_individual") or "—"
            out.append(f"| {r['lead_of']} | **{who}** | {r['role']} |")
        return "\n".join(out)
    if spec == "roster:oncall":
        return oncall_table()
    if spec.startswith("roster:"):
        scope = spec.split(":")[1]
        rows = [r for r in ROSTER if scope == "all" or r["part"] in (scope, "shared")]
        # Transfer is always shown (the legend explains it); Phone rides last, only
        # where some row has one — it used to REPLACE Transfer, so the directory
        # silently lost "Direct" and every queue name once on-call phones arrived
        show_phone = any(r.get("phone") for r in rows)
        hdr = "| Role | Holder | Backup | Transfer | Email |" + (" Phone |" if show_phone else "")
        sep = "|---|---|---|---|---|" + ("---|" if show_phone else "")
        out = [hdr, sep]
        for r in sorted(rows, key=lambda x: ({"shared":0,"p1":1,"p2":2,"p3":3,"p4":4,"p5":5,"p6":6,"p7":7,"p8":8}.get(x["part"],9), x["role"])):
            bk = r["backup"] or ""
            bk = "**none**" if bk == "NONE" else ("—" if bk.startswith("—") else bk)
            hd = "—" if (r["holder"] or "").startswith("—") else (r["holder"] or r.get("current_named_individual") or "")
            tr = "Direct" if r["direct_transfer"] else (r.get("queue") or "")
            em = r.get("email") or ""
            if r.get("email_attn"):
                em += f" — subject “{r['email_attn']}: [name] [TRX #]”"
            row = f"| {r['role']} | {hd} | {bk} | {tr} | {em} |"
            out.append(row + (f" {r.get('phone') or ''} |" if show_phone else ""))
        return "\n".join(out)
    if spec.startswith("glossary:"):
        _, cls, _, part = spec.split(":")[1], None, None, None
        parts = spec.split(":")
        cls = parts[1]
        part = parts[2] if len(parts) > 2 else "all"
        rows = [g for g in GLOSSARY if g["class"] == cls]
        if part != "all":
            rows = [g for g in rows if part in g["parts"] or "p0" in g["parts"]]
        hdr = "Term" if cls != "system" else "Name"
        out = [f"| {hdr} | Definition | Parts |", "|---|---|---|"]
        for g in rows:
            pl = "All" if len(g["parts"]) == 5 else ", ".join(p[1:] for p in g["parts"])
            out.append(f"| **{g['term']}** | {g['definition']} | {pl} |")
        return "\n".join(out)
    if spec.startswith("billing:"):
        bt = spec.split(":")[1]
        rows = [r for r in EQ if r.get("billing_type") == bt]
        by = {}
        for r in rows:
            by.setdefault(r["category"], []).append(r)
        out = ["| Category | HCPCS |", "|---|---|"]
        for cat in sorted(by, key=lambda c: CATEGORY_NAMES.get(c, c)):
            rs = by[cat]
            codes = sorted({c for r in rs for c in r["hcpcs"]})
            name = CATEGORY_NAMES.get(cat, cat.replace("-", " ").capitalize())
            out.append(f"| {name} | {', '.join(codes)} |")
        return "\n".join(out)
    if spec == "waivers":
        rules = [f for f in FEES if f.get("type") == "rule"]
        out = []
        for r in rules:
            out.append(f"**{r['label']}** — {r['trigger']}")
            if r.get("exception"):
                out.append(f"> {r['exception']}")
            out.append("")
        return "\n".join(out)
    if spec.startswith("figure-pair:"):
        ids = spec.split(":", 1)[1].split("|")
        cells = []
        for fid in ids:
            f = FIGS[fid]
            cells.append(f'<div><img src="{FIGB[fid]}" alt="{f["alt"]}"><figcaption>{f["caption"]}</figcaption></div>')
        return '<figure class="shot pair">' + "".join(cells) + '</figure>'
    if spec.startswith("diagram:"):
        name = spec.split(":", 1)[1]
        svg = open(f"diagrams/{name}.svg", encoding="utf-8").read()
        # each part is rendered in its own process, so tag marker ids with the source file
        # (and a counter, for a diagram used twice in one part)
        DIAGRAM_USES[name] = DIAGRAM_USES.get(name, 0) + 1
        tag = os.path.splitext(os.path.basename(sys.argv[1]))[0] + (f"-{DIAGRAM_USES[name]}" if DIAGRAM_USES[name] > 1 else "")
        for mid in set(re.findall(r'<marker id="([^"]+)"', svg)):
            svg = svg.replace(f'id="{mid}"', f'id="{mid}-{tag}"').replace(f"url(#{mid})", f"url(#{mid}-{tag})")
        return f'<div class="fig" data-diagram="{name}">{svg}</div>'
    if spec.startswith("figure:"):
        fid = spec.split(":", 1)[1]
        if fid not in FIGS or fid not in FIGB:
            raise SystemExit(f"unknown figure: {fid}")
        f = FIGS[fid]
        return (f'<figure class="shot"><img src="{FIGB[fid]}" alt="{f["alt"]}">'
                f'<figcaption>{f["caption"]}</figcaption></figure>')
    if spec == "waiver-matrix":
        byid = {f.get("id"): f for f in FEES}
        cols = [("Standard patient", set())]
        for rid in ("waiver-qmb-only", "waiver-rule-a", "waiver-rule-b", "waiver-rule-c"):
            r = byid[rid]
            w = set(r.get("waives", []))
            for inc in r.get("includes", []):
                w |= set(byid[inc].get("waives", []))
            cols.append((r["label"], w))
        items = [f for f in FEES if f.get("intake_amount")]
        order = ["rollator-standard-upgrade", "rollator-hd-upgrade", "bed-fully-electric-upgrade",
                 "bed-hi-lo-upgrade", "lift-battery-upgrade", "lift-hd-battery-upgrade"]
        items.sort(key=lambda f: order.index(f["id"]) if f["id"] in order else 99)
        short = {"rollator-standard-upgrade": "Rollator", "rollator-hd-upgrade": "Heavy-Duty Rollator",
                 "bed-fully-electric-upgrade": "Fully-Electric Bed", "bed-hi-lo-upgrade": "Hi-Lo Bed",
                 "lift-battery-upgrade": "Battery Lift", "lift-hd-battery-upgrade": "Heavy-Duty Battery Lift"}
        out = ["| Item | " + " | ".join(c for c, _ in cols) + " |",
               "|---" * (len(cols) + 1) + "|"]
        for f in items:
            cells = ["**Waived**" if f["id"] in w else "Charged" for _, w in cols]
            out.append(f"| {short.get(f['id'], f['label'])} | " + " | ".join(cells) + " |")
        return "\n".join(out)
    if spec == "fees":
        rows = [f for f in FEES if f.get("intake_amount")]
        out = ["| Common Upgrades | HCPCS | Intake Fee | Field Ops Fee |", "|---|---|---|---|"]
        for f in rows:
            e = BY_ID.get(f["equipment_id"], {})
            out.append(f"| {f['label']} | {' / '.join(e.get('hcpcs', []))} | "
                       f"${f['intake_amount']:,} | ${f['field_ops_amount']:,} |")
        return "\n".join(out)

    body, _, opts = spec.partition("|")
    kind, _, key = body.partition(":")
    if kind == "eq":
        rows = [r for r in EQ if r["category"] == key]
    elif kind == "flag":
        rows = [r for r in EQ if key in r.get("flags", [])]
    elif kind == "ids":
        rows = [BY_ID[i] for i in key.split(",")]
    else:
        raise SystemExit(f"unknown placeholder: {spec}")
    if not rows:
        raise SystemExit(f"EMPTY TABLE for {spec} — build would fail")
    drop = tuple(o for o in opts.split(",") if o and not o.startswith("+"))
    extra = [o[1:] for o in opts.split(",") if o.startswith("+")]
    return table(rows, drop=drop, extra_specs=extra)


src = open(sys.argv[1]).read()
out = re.sub(r"\{\{(.+?)\}\}", expand, src)
open(sys.argv[2], "w").write(out)

rendered = set()
for kind, key in re.findall(r"\{\{(eq|ids|flag):([^|}]+)", src):
    for k in key.split(","):
        k = k.strip()
        if kind == "eq":
            rendered |= {r["id"] for r in EQ if r["category"] == k}
        elif kind == "flag":
            rendered |= {r["id"] for r in EQ if k in r.get("flags", [])}
        else:
            rendered.add(k)
PART_ = sys.argv[3] if len(sys.argv)>3 else "p2"
missing = sorted(r["id"] for r in EQ if r["part"] == PART_ and r["id"] not in rendered)
PART = sys.argv[3] if len(sys.argv)>3 else "p2"
cats = [r for r in EQ if r["part"] == PART]
print(f"placeholders expanded : {len(re.findall(r'\{\{', src))}")
print(f"records rendered      : {len(cats) - len(missing)}/{len(cats)}")
if missing:
    print(f"NOT RENDERED          : {', '.join(missing)}")
    raise SystemExit(1)
