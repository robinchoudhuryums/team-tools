"""Diagram mocks, batch 2. Not part of the manual until approved."""
import sys, io, contextlib
sys.path.insert(0, ".")
with contextlib.redirect_stdout(io.StringIO()):
    import make_diagrams as MD
MARK, CSS, fbox, fl, dn = MD.MARK, MD.CSS, MD.fbox, MD.fl, MD._dn
OUT = {}
MONO = "font:700 11px 'IBM Plex Mono',monospace;fill:var(--muted)"


def svg(name, w, h, label, body):
    mk = "mk" + name.replace("-", "")[:6]
    OUT[name] = dn(f'<svg viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg" role="img" '
                   f'aria-label="{label}">{MARK.replace("MKID", mk)}<style>{CSS.replace("MKID", mk)}</style>'
                   + "".join(body) + "</svg>")


def elbow(x1, y1, x2, y2, label="", ym=None, lx=None, ly=None):
    ym = ym if ym is not None else (y1 + y2) / 2
    s = f'<path class="dg-arr" d="M{x1} {y1} V{ym} H{x2} V{y2}"/>'
    if label:
        s += f'<text x="{lx if lx is not None else x2 + 6}" y="{ly if ly is not None else ym + 14}" style="{MONO}">{label}</text>'
    return s


def title(w, t, y=22):
    return f'<text class="dg-h" x="{w/2}" y="{y}" text-anchor="middle">{t}</text>'


def txt(x, y, t, anchor="middle", style="dg-s"):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" class="{style}">{t}</text>'


cx = 580


def lbox(x, y, w, items, kind="act", lh=21, pad=14):
    """Left-aligned bullet list. items: list of strings; a '|' inside an item wraps to an indented line."""
    fills = {"act": ("var(--bg)", "var(--rule)", "var(--ink)"), "note": ("var(--panel)", "var(--rule)", "var(--ink)")}
    fill, stroke, ink = fills[kind]
    lines = []
    for it in items:
        parts = it.split("|")
        lines.append(("•", parts[0]))
        lines += [("", p) for p in parts[1:]]
    h = pad * 2 + lh * len(lines) - 6
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="5" fill="{fill}" stroke="{stroke}" stroke-width="1.4"/>']
    for i, (bul, t) in enumerate(lines):
        yy = y + pad + 10 + i * lh
        if bul:
            out.append(f'<text x="{x + 14}" y="{yy}" style="font:700 12.5px \'IBM Plex Sans\',sans-serif;fill:var(--accent)">•</text>')
        out.append(f'<text x="{x + 28}" y="{yy}" style="font:500 12.5px \'IBM Plex Sans\',sans-serif;fill:{ink}">{t}</text>')
    return "".join(out), h


# ======================================================= 5. transfer/email/notate ===
W, H = 1160, 560
b = [title(W, "Transfer, email, or notate?")]
b.append(fbox(cx - 170, 38, 340, 38, "You've heard what the caller needs", "start"))
b.append(fl(cx, 76, cx, 100))
b.append(fbox(cx - 190, 100, 380, 52, "**Did you answer it fully, with nothing|left for anyone else to do?", "dec"))
b.append(elbow(cx, 152, 185, 196, "YES", ym=172, lx=196, ly=190))
b.append(fl(cx, 152, cx, 196, "NO"))
b.append(fbox(cx - 190, 196, 380, 52, "**Does a specialist need it now, or would|immediate action help?", "dec"))
b.append(elbow(cx, 248, 580, 292, ym=270))
b.append(elbow(cx + 190, 222, 975, 292, "NO", ym=222, lx=cx + 200, ly=216))
b.append(txt(cx + 8, 280, "YES", "start", "dg-sec"))
b.append(fbox(20, 196, 330, 34, "**NOTATE ONLY", "ok"))
box, h1 = lbox(20, 240, 330, ["Demographic and contact updates", "Insurance details from the patient",
                               "A caller confirming what we have", "Any call you fully answered"])
b.append(box)
b.append(fbox(415, 292, 330, 34, "**TRANSFER — notate first", "act"))
box, h2 = lbox(415, 336, 330, ["Complex billing → Billing", "Insurer requesting auth info →|intake team's authorization members",
                                "Compliance you can't resolve →|compliance specialists",
                                "Provider clinical questions you|can't resolve → intake team",
                                "Scheduling → Field Ops Q, or|Field Ops-Power Q for PMDs"])
b.append(box)
b.append(fbox(810, 292, 330, 34, "**EMAIL", "note"))
box, h3 = lbox(810, 336, 330, ["Specialist or department unavailable", "Needs action by another department,|not urgent",
                                "Closed-order request", "Out-of-pocket purchase"])
b.append(box)
b.append(fbox(20, 240 + h1 + 16, 330, 104, "**Never|Cold transfer — say what the caller|needs first. Commit to a turnaround|you can't see.|**Generally avoid|Giving out a direct extension", "tech"))
svg("m5-routing", W, H, "Transfer, email or notate decision", b)

# ================================================================ 7. waivers ===
W, H = 1160, 520
b = [title(W, "Does an upgrade fee waiver apply?")]
b.append(fbox(cx - 170, 38, 340, 38, "Order has an upgrade fee", "start"))
b.append(fl(cx, 76, cx, 100))
b.append(fbox(cx - 150, 100, 300, 40, "**Which upgrade?", "dec"))
COLS = [(20, 460, "Rollator — standard or heavy-duty"), (500, 460, "Bed — fully-electric or Hi-Lo"), (980, 160, "Patient lift")]
for x, w, lab in COLS:
    b.append(elbow(cx, 140, x + w / 2, 176, ym=158))
    b.append(fbox(x, 176, w, 36, "**" + lab, "note"))
b.append(fl(1060, 212, 1060, 222))
b.append(fbox(980, 222, 160, 58, "**Always charged|No rule waives it", "tech"))
opts = {20: [("Any Medicaid plan,|except QMB-only", "**Waived — Rule A|Standard and|heavy-duty", "ok"),
             ("QMB only", "**Standard: waived|Heavy-duty:|charged", "ok"),
             ("Neither", "**Charged", "tech")],
        500: [("Full Medicaid or an|MCO, in a state UMS|is enrolled in", "**Waived — Rule B", "ok"),
              ("BCBS commercial|is the primary", "**Waived — Rule C", "ok"),
              ("Neither", "**Charged", "tech")]}
for x0, lst in opts.items():
    b.append(fl(x0 + 230, 212, x0 + 230, 222))
    b.append(fbox(x0, 222, 460, 36, "**What coverage does the patient have?", "dec"))
    for i, (cond, out, k) in enumerate(lst):
        x = x0 + i * 158
        b.append(elbow(x0 + 230, 258, x + 72, 282, ym=270))
        b.append(fbox(x, 282, 144, 54, cond, "act"))
        b.append(fl(x + 72, 336, x + 72, 352))
        b.append(fbox(x, 352, 144, 58, out, k))
b.append(fbox(20, 424, 460, 34, "CSRs can't waive or reduce a fee outside these rules — §10-15", "note"))
b.append(fbox(500, 424, 460, 34, "If unsure whether UMS is enrolled, check with Eligibility", "pol"))
b.append(fbox(20, 470, 1120, 34, "**Uncommon payers — Workers' Compensation or the VA, for example, may pay for the item in full, including the upgrade fee", "pol"))
svg("m7-waivers", W, H, "Upgrade fee waiver decision", b)

# ============================================================ 8a. patient died ===
W, H = 1160, 400
b = [title(W, "When a patient has died")]
b.append(fbox(cx - 180, 38, 360, 38, "A family member calls: the patient has died", "start"))
b.append(fl(cx, 76, cx, 98))
b.append(fbox(cx - 180, 98, 360, 44, "Express condolences. Note the date of death", "act"))
b.append(fl(cx, 142, cx, 166))
b.append(fbox(cx - 180, 166, 360, 44, "**For each item — is it patient-owned?", "dec"))
b.append(elbow(cx, 210, 285, 250, "YES", ym=230, lx=296, ly=244))
b.append(elbow(cx, 210, 875, 250, "NO", ym=230, lx=886, ly=244))
b.append(fbox(80, 250, 410, 62, "**It belongs to the family now|Theirs to keep, donate or dispose of.|Nothing to collect", "ok"))
b.append(fbox(670, 250, 410, 62, "**Create a pick-up ticket|Confirm best contact and pick-up address. Field|Ops will verify and call back in 24–48 hours", "act"))
b.append(fbox(80, 330, 410, 44, "Oxygen is never patient-owned — a|concentrator always comes back", "pol"))
b.append(fbox(670, 330, 410, 44, "Would they rather pay the remaining cost|and keep the items? Transfer to Billing", "note"))
svg("m8a-death", W, H, "Patient death call", b)

# ================================================================ 8b. swap-out ===
W, H = 1160, 420
b = [title(W, "Patient wants a different version of an item")]
b.append(fbox(cx - 170, 38, 340, 38, "Patient asks to swap an item", "start"))
b.append(fl(cx, 76, cx, 100))
b.append(fbox(cx - 230, 100, 460, 52, "**Does the change need new documents from the MDO?|Different or additional HCPCS code, or new MRx", "dec"))
b.append(elbow(cx, 152, 235, 192, "NO", ym=172, lx=246, ly=186))
b.append(elbow(cx, 152, 830, 192, "YES", ym=172, lx=841, ly=186))
b.append(fbox(60, 192, 350, 62, "**Transfer to Service|They create a swap-out service ticket.|Nothing else needed", "ok"))
for i, (t) in enumerate(["**1. Create a pick-up ticket|for the item they already have",
                          "**2. Note on the ticket|coordinate the pick-up with the new delivery",
                          "**3. Email the intake department|so they request documents and open the order"]):
    b.append(fbox(610, 192 + i * 66, 440, 54, t, "act"))
    if i < 2:
        b.append(fl(830, 246 + i * 66, 830, 258 + i * 66))
b.append(fbox(60, 330, 350, 64, "**The email starts the new order|Without it, the patient's equipment is|collected and nothing replaces it", "tech"))
svg("m8b-swap", W, H, "Equipment swap-out decision", b)

# ======================================================== 11. resupply windows ===
W, H = 1160, 420
L, R = 120, 1080
def dx(d):                    # day relative to the supply running out (-32 .. +2)
    return L + (R - L) * (d + 32) / 34
b = [title(W, "Resupply — why we can't send it early")]
b.append(f'<rect x="{dx(-32)}" y="84" width="{dx(-30) - dx(-32)}" height="40" rx="4" fill="var(--panel)" stroke="var(--rule)"/>')
b.append(f'<rect x="{dx(-30)}" y="84" width="{dx(-10) - dx(-30)}" height="40" fill="var(--scr-bg)" stroke="var(--scr-ink)"/>')
b.append(f'<text x="{(dx(-30)+dx(-10))/2}" y="109" text-anchor="middle" style="font:600 12px \'IBM Plex Sans\',sans-serif;fill:var(--scr-ink)">Patient can confirm the refill</text>')
b.append(f'<rect x="{dx(-10)}" y="84" width="{dx(0) - dx(-10)}" height="40" fill="var(--scr-ink)" opacity=".88"/>')
b.append(f'<text x="{(dx(-10)+dx(0))/2}" y="109" text-anchor="middle" style="font:700 12px \'IBM Plex Sans\',sans-serif;fill:var(--bg)">Confirm and ship</text>')
for d, lab, sub in [(-30, "30 days before", "contact window opens"), (-10, "10 days before", "earliest ship date"),
                    (0, "Supply runs out", "next supply due")]:
    b.append(f'<line x1="{dx(d)}" y1="70" x2="{dx(d)}" y2="150" stroke="var(--navy)" stroke-width="1.5"/>')
    b.append(f'<text x="{dx(d)}" y="166" text-anchor="middle" style="{MONO};fill:var(--navy)">{lab}</text>')
    b.append(f'<text x="{dx(d)}" y="182" text-anchor="middle" class="dg-s">{sub}</text>')
b.append(f'<text x="{dx(-10) - 8}" y="62" text-anchor="end" style="{MONO}">Shipping before this line makes the claim non-payable →</text>')
b.append(f'<text x="{dx(-5)}" y="62" text-anchor="middle" style="{MONO};fill:var(--scr-ink)">SHIP DATE = DATE OF SERVICE</text>')
b.append(fbox(40, 206, 350, 66, "**PAP has a second gate|Documented use and a doctor visit —|out of compliance, no supplies — §3-7.4", "pol"))
b.append(fbox(405, 206, 350, 66, "**Nebulizer supplies|No more than a three-month quantity|in one shipment — §3-3.3", "note"))
b.append(fbox(770, 206, 350, 66, "**Oxygen tanks are different|A rental accessory — once a week, two|business days' notice — §8-2.1", "note"))
b.append(fbox(40, 290, 1080, 60, "**Say:|\"Insurance sets the window for when we can send the next shipment — we're not able to ship earlier than the allowed|timeframe before you run out, per insurance guidelines. I'll follow up with that team to make sure it goes out as soon as possible.\"", "note"))
b.append(txt(W/2, 386, "Medicare's rules. Texas Medicaid bills one month's supply at a time, so eligibility is checked each month."))
svg("m11-resupply", W, H, "Resupply contact and shipping windows", b)

# ===================================================== 12. eligibility status ===
W, H = 1160, 330
b = [title(W, "Power orders in Sales — the Eligibility status")]
stages = [("Pending|(Appoint. Req.)", "An appointment is|needed. Nothing|arranged yet", "tint"),
          ("Pending|(Appt. Sched.)", "Being scheduled —|by the patient or|by Sales", "tint"),
          ("Pending|(Appoint. Verification)", "A date exists but|isn't confirmed by|both sides yet", "watch"),
          ("Pending|(Payer Verification)", "Sales Eligibility is|checking the|insurance", "tint"),
          ("Eligible", "Sales is done — the|order is now with|Power. See §5-1", "scr")]
x = 30; w = 208; gap = 16
for i, (name, what, tone) in enumerate(stages):
    fill = {"tint": "--tint", "watch": "--watch-bg", "scr": "--scr-bg"}[tone]
    ink = {"tint": "--navy", "watch": "--watch-ink", "scr": "--scr-ink"}[tone]
    pts = f"{x},70 {x + w - 16},70 {x + w},100 {x + w - 16},130 {x},130 {x + (16 if i else 0)},100"
    b.append(f'<polygon points="{pts}" fill="var({fill})" stroke="var({ink})" stroke-width="1.4"/>')
    for j, ln in enumerate(name.split("|")):
        b.append(f'<text x="{x + w/2}" y="{96 + j*15 - 3}" text-anchor="middle" '
                 f'style="font:{"700" if j == 0 else "600"} 12px \'IBM Plex Sans\',sans-serif;fill:var({ink})">{ln}</text>')
    b.append(fbox(x + 4, 148, w - 12, 70, what, "act"))
    x += w + gap
b.append(f'<rect x="30" y="236" width="{3*(w+gap)-gap}" height="26" rx="3" fill="var(--panel)" stroke="var(--rule)"/>')
b.append(f'<text x="{30 + (3*(w+gap)-gap)/2}" y="253" text-anchor="middle" style="{MONO}">WITH SALES — route calls to Sales</text>')
b.append(f'<rect x="{30 + 3*(w+gap)}" y="236" width="{w}" height="26" rx="3" fill="var(--panel)" stroke="var(--rule)"/>')
b.append(f'<text x="{30 + 3*(w+gap) + w/2}" y="253" text-anchor="middle" style="{MONO}">SALES ELIGIBILITY</text>')
b.append(f'<rect x="{30 + 4*(w+gap)}" y="236" width="{w}" height="26" rx="3" fill="var(--scr-bg)" stroke="var(--scr-ink)"/>')
b.append(f'<text x="{30 + 4*(w+gap) + w/2}" y="253" text-anchor="middle" style="{MONO};fill:var(--scr-ink)">WITH POWER</text>')
b.append(txt(W/2, 300, "Only Appoint. Verification has a date — and it isn't confirmed yet, so don't give it out as settled.  Eligibility can return here if insurance changes."))
svg("m12-eligibility", W, H, "Eligibility status progression", b)

# ======================================================== 13. Power status ===
W, H = 1160, 700
b = [title(W, "Power orders — where is it, and what do I tell the caller?")]
SANS = "'IBM Plex Sans',sans-serif"
def head(x, w, t, sub="", kind="dec"):
    return fbox(x, 72, w, 44, ("**" + t) + (("|" + sub) if sub else ""), kind)
def card(x, y, w, h, t, body, kind="act"):
    return fbox(x, y, w, h, "**" + t + "|" + body, kind)
# column geometry
A, AW = 20, 130
B, BW = 166, 176
C, CW = 358, 256
D, DW = 630, 170
E, EW = 816, 324
b.append(head(A, AW, "Sales and", "eligibility", "ok"))
b.append(head(B, BW, "PAK"))
b.append(head(C, CW, "Documentation", "and evaluations"))
b.append(head(D, DW, "PAR"))
b.append(head(E, EW, "Field Ops-Power"))
for x1, x2 in ((A + AW, B), (B + BW, C), (C + CW, D), (D + DW, E)):
    b.append(fl(x1, 94, x2, 94))
# Qualified Lead shortcut
b.append(f'<path class="dg-arr" d="M{A + AW/2} 72 V52 H{C + 60} V72" stroke-dasharray="5 3"/>')
b.append(f'<text x="{(A + C)/2 + 30}" y="46" text-anchor="middle" style="{MONO}">PAST M.E. DONE IN LAST 6 MOS — SKIPS PAK</text>')
# A: sales
b.append(card(A, 132, AW, 150, "Moves on at", "Eligible|(appt confirmed|& insurance|verified)|— §4-3", "act"))
# B: PAK sub-steps
b.append(card(B, 132, BW, 84, "PPD", "~15-minute interview:|mobility needs, options,|the process — §5-2.1"))
b.append(card(B, 224, BW, 84, "MA Education", "Walks the MDO's office|through the paperwork|— §5-2.2"))
b.append(card(B, 316, BW, 84, "Appt scheduling", "Reschedules if needed;|collects F2F and PAK|after the visit — §5-2.3"))
# C: concurrent tracks as Gantt bars
b.append(f'<text x="{C + CW/2}" y="146" text-anchor="middle" style="{MONO}">IN PROGRESS AT THE SAME TIME</text>')
def bar(x, y, w, t, sub, dashed=False, kind="dec"):
    fill, ink = {"dec": ("var(--tint)", "var(--accent)"), "note": ("var(--panel)", "var(--muted)")}[kind]
    da = ' stroke-dasharray="5 3"' if dashed else ""
    return (f'<rect x="{x}" y="{y}" width="{w}" height="50" rx="5" fill="{fill}" stroke="{ink}" stroke-width="1.4"{da}/>'
            f'<text x="{x + 10}" y="{y + 20}" style="font:700 12px {SANS};fill:var(--navy)">{t}</text>'
            f'<text x="{x + 10}" y="{y + 38}" style="font:500 11.5px {SANS};fill:var(--ink)">{sub}</text>')
b.append(bar(C, 156, CW, "Qualifications — always", "Checks every document is here and correct"))
b.append(bar(C, 214, CW - 70, "PT Eval — if required", "Waiting on the PT Rx or report", True, "note"))
b.append(bar(C, 272, CW - 30, "ATP Eval — if required", "Field Ops schedules, 2–3 wks out", True, "note"))
b.append(f'<text x="{C + CW/2}" y="344" text-anchor="middle" class="dg-s">Dashed = only when the order needs it — §5-4, §5-5</text>')
# D: PAR
b.append(card(D, 132, DW, 104, "Submitted", "Final review and|preparation of all docs,|then submitted to|insurance — §5-6", "act"))
b.append(fl(D + DW/2, 236, D + DW/2, 256))
b.append(fbox(D, 256, DW, 34, "**What came back?", "dec"))
b.append(elbow(D + DW/2, 290, D + 40, 312, "", ym=300))
b.append(elbow(D + DW/2, 290, D + DW - 40, 312, "", ym=300))
b.append(fbox(D, 312, 78, 44, "**Denied", "tech"))
b.append(fbox(D + DW - 78, 312, 78, 44, "**Approved", "ok"))
b.append(fbox(D, 366, 150, 52, "Authorization team|reviews for appeal", "tech"))
b.append(f'<path class="dg-arr" d="M{D + 39} 356 V366"/>')
# E: fulfilment sequence
b.append(card(E, 132, 150, 70, "Order placed", "with the|manufacturer"))
b.append(card(E + 174, 132, 150, 70, "Received", "in our|warehouse"))
b.append(fl(E + 150, 167, E + 174, 167))
b.append(card(E, 222, 324, 58, "Field Ops-Power calls to schedule", "Delivery — the patient must be home — §5-8"))
b.append(fl(E + 249, 202, E + 249, 222))
b.append(f'<path class="dg-arr" d="M{D + DW} 334 H{E - 22} V167 H{E}"/>')
# order verification: floating task with a gate
OVx1, OVx2, OVy = C + 90, E - 8, 436
b.append(f'<rect x="{OVx1}" y="{OVy}" width="{OVx2 - OVx1}" height="72" rx="5" fill="var(--pol-bg)" stroke="var(--pol-ink)" stroke-width="1.4"/>')
b.append(f'<text x="{OVx1 + 12}" y="{OVy + 22}" style="font:700 12px {SANS};fill:var(--pol-ink)">Order verification — §5-7</text>')
b.append(f'<text x="{OVx1 + 12}" y="{OVy + 41}" style="font:500 11.5px {SANS};fill:var(--pol-ink)">Confirms model, seat, joystick and color. After any PT / ATP eval;</text>')
b.append(f'<text x="{OVx1 + 12}" y="{OVy + 58}" style="font:500 11.5px {SANS};fill:var(--pol-ink)">can overlap Qualifications or PAR.</text>')
b.append(f'<line x1="{E - 8}" y1="{OVy - 30}" x2="{E - 8}" y2="{OVy + 72}" stroke="var(--pol-ink)" stroke-width="2.5"/>')
b.append(f'<text x="{E + 4}" y="{OVy + 30}" style="font:700 11px \'IBM Plex Mono\',monospace;fill:var(--pol-ink)">MUST BE DONE</text>')
b.append(f'<text x="{E + 4}" y="{OVy + 46}" style="font:700 11px \'IBM Plex Mono\',monospace;fill:var(--pol-ink)">BEFORE THE ORDER</text>')
b.append(f'<text x="{E + 4}" y="{OVy + 62}" style="font:700 11px \'IBM Plex Mono\',monospace;fill:var(--pol-ink)">IS PLACED</text>')
# timing row
TY = 560
b.append(f'<text x="20" y="{TY - 14}" style="{MONO}">TYPICAL TIME</text>')
b.append(f'<line x1="{A}" y1="{TY}" x2="{D - 8}" y2="{TY}" stroke="var(--muted)" stroke-width="2" stroke-dasharray="6 5"/>')
b.append(f'<text x="{(A + D)/2}" y="{TY + 20}" text-anchor="middle" class="dg-s">Varies — mostly on how quickly the provider returns correct paperwork</text>')
b.append(f'<rect x="{D}" y="{TY - 7}" width="{DW}" height="14" rx="3" fill="var(--accent)"/>')
b.append(f'<text x="{D + DW/2}" y="{TY + 22}" text-anchor="middle" style="font:700 11.5px {SANS};fill:var(--navy)">14 days or less</text>')
b.append(f'<rect x="{E}" y="{TY - 7}" width="{EW - 120}" height="14" rx="3" fill="var(--accent)"/>')
b.append(f'<text x="{E + (EW - 120)/2}" y="{TY + 22}" text-anchor="middle" style="font:700 11.5px {SANS};fill:var(--navy)">2–3 weeks to the warehouse</text>')
b.append(f'<line x1="{E + EW - 116}" y1="{TY}" x2="{E + EW}" y2="{TY}" stroke="var(--muted)" stroke-width="2" stroke-dasharray="6 5"/>')
b.append(f'<text x="{E + EW - 58}" y="{TY + 22}" text-anchor="middle" class="dg-s">then scheduled</text>')
b.append(fbox(20, 620, 1120, 46, "**Don't quote 90 days|Give the stage and what it's waiting on — §5-1.2", "pol"))
svg("m13-power", W, H, "Power order status", b)

# --------------------------------------------------------------- mock page ---
md = ["# Diagram mocks — batch 2", "",
      "Seven proposed diagrams. Each would sit in the section named, alongside the existing text — the "
      "tables stay. Toggle light and dark to check both.", ""]
spec = [
 ("5 · Transfer, email, or notate", "§0.12", "m5-routing",
  "The two questions that decide it, with the lists from each subsection under its outcome. The authorization-"
  "decision procedure gets its own box because it's the one exception people get wrong."),
 ("7 · Upgrade fee waivers", "§10.16", "m7-waivers",
  "The matrix says what each rule waives; this answers which rule applies to the caller in front of you. "
  "The uncertain case — out-of-state Medicaid — is called out rather than hidden."),
 ("8a · When a patient has died", "§1.5", "m8a-death", "One question per item, two outcomes."),
 ("8b · Equipment swap-outs", "§6.7", "m8b-swap", "One question, and the three coordinated steps on the documentation side."),
 ("11 · Resupply windows", "§5.8.1", "m11-resupply",
  "Revised to Medicare's current 30-day contact window, and marking that the ship date — not the arrival — is the date of service."),
 ("12 · Eligibility status", "§9.3", "m12-eligibility",
  "The five statuses as a progression, showing where the order passes from Sales to Power."),
 ("13 · Power status — the companion to the status tree", "§4.1.1", "m13-power",
  "Replaces the supplied process picture. Each stage carries what to tell the caller, with the Qualified "
  "Lead shortcut and the PAR outcomes. This is the diagram the batch 1 status tree links to for Power orders."),
]
for t, where, key, why in spec:
    md += [f"## {t}", "", f"**Would sit in:** {where}. {why}", "",
           f'<div class="fig">{OUT[key]}</div>', "", "---", ""]
open("/tmp/mocks_b2.md", "w").write("\n".join(md))
for k, v in OUT.items():
    print(f"{k:<18} {len(v):>6,} bytes")
