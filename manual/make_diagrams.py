#!/usr/bin/env python3
"""Generate the manual's SVG diagrams.

Colours reference the CSS custom properties defined by the page, so the diagrams
follow the Stage 0 palette and respond to light/dark automatically.
"""
import os

os.makedirs("diagrams", exist_ok=True)
import sys
sys.path.insert(0, '.')
from numbering import display as dnum
import re as _re
def _dn(s):
    def link(m):
        sec = m.group(0)
        anchor = sec[1:].replace(".", "_")
        return f'<a class="xr" href="#{anchor}">{dnum(sec)}</a>'
    return _re.sub(r'§[0-9A-Z]+-[0-9A-Z]+(?:\.[0-9]+)*', link, s)

CSS = """
  .dg-lane{fill:var(--panel)}
  .dg-lane-b{fill:none;stroke:var(--rule);stroke-width:1}
  .dg-lbl{font:600 11px 'IBM Plex Sans',sans-serif;fill:var(--muted);
    letter-spacing:.06em;text-transform:uppercase}
  .dg-box{stroke-width:1.5;rx:4}
  .dg-t{font:600 12px 'IBM Plex Sans',sans-serif;fill:var(--bg)}
  .dg-ti{font:600 12px 'IBM Plex Sans',sans-serif;fill:var(--navy)}
  .dg-s{font:400 10.5px 'IBM Plex Sans',sans-serif;fill:var(--muted)}
  .dg-sec{font:600 10px 'IBM Plex Sans',sans-serif;fill:var(--accent)}
  .dg-arr{stroke:var(--muted);stroke-width:1.5;fill:none;marker-end:url(#MKID)}
  .dg-arr-d{stroke:var(--muted);stroke-width:1.5;fill:none;stroke-dasharray:4 3;
    marker-end:url(#MKID)}
  .dg-h{font:700 13px 'IBM Plex Sans',sans-serif;fill:var(--navy)}
"""

MARK = ('<defs><marker id="MKID" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" '
        'markerHeight="6" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--muted)"/>'
        '</marker></defs>')


def box(x, y, w, h, title, sub, sec, colour, light=False):
    fill = f'var({colour})' if not light else 'var(--bg)'
    stroke = f'var({colour})'
    tcls = "dg-ti" if light else "dg-t"
    out = [f'<rect class="dg-box" x="{x}" y="{y}" width="{w}" height="{h}" '
           f'fill="{fill}" stroke="{stroke}"/>']
    ty = y + 19
    for i, line in enumerate(title.split("|")):
        out.append(f'<text class="{tcls}" x="{x+10}" y="{ty+i*14}">{line}</text>')
    if sub:
        out.append(f'<text class="dg-s" x="{x+10}" y="{y+h-18}">{sub}</text>')
    if sec:
        out.append(f'<text class="dg-sec" x="{x+10}" y="{y+h-6}">{sec}</text>')
    return "".join(out)


# ---------------------------------------------------------------- lifecycle --
W, H = 1160, 470
p = [f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" '
     f'role="img" aria-label="Order lifecycle across departments">'
     f'{MARK.replace("MKID","mkL")}<style>{CSS.replace("MKID","mkL")}</style>']

p.append(f'<text class="dg-h" x="0" y="14">Standard DME order</text>')
p.append('<rect class="dg-lane" x="0" y="26" width="1160" height="96" rx="5"/>')
p.append('<rect class="dg-lane-b" x="0" y="26" width="1160" height="96" rx="5"/>')
std = [("Referral|received", "MDO sends the order", "§0-8", "--navy"),
       ("Insurance|Verification", "Coverage confirmed", "§0-8.1", "--navy"),
       ("Documentation|Request", "SWO, F2F notes", "§10-13.6", "--navy"),
       ("Prior|Authorization", "If required", "§10-9", "--navy"),
       ("Validation", "Final check", "§0-8", "--navy"),
       ("Field Ops|Delivery", "Scheduled, delivered", "§5-1", "--p5"),
       ("Service", "After delivery", "§6-1", "--p6")]
x = 12
for i, (t, s_, sec, c) in enumerate(std):
    p.append(box(x, 38, 148, 72, t, s_, sec, c))
    if i < len(std) - 1:
        p.append(f'<path class="dg-arr" d="M{x+148} 74 H{x+158}"/>')
    x += 160

p.append(f'<text class="dg-h" x="0" y="160">Power mobility order</text>')
p.append('<rect class="dg-lane" x="0" y="172" width="1160" height="210" rx="5"/>')
p.append('<rect class="dg-lane-b" x="0" y="172" width="1160" height="210" rx="5"/>')
p.append('<text class="dg-lbl" x="12" y="192">Sales — Part 9</text>')
p.append('<text class="dg-lbl" x="492" y="192">Power intake — Part 4</text>')
p.append('<text class="dg-lbl" x="972" y="192">Delivery</text>')
p.append('<path class="dg-lane-b" d="M484 200 V372"/><path class="dg-lane-b" d="M964 200 V372"/>')

sales = [("Lead|callback", "Confirm interest", "§9-2"),
         ("Create TRX", "Details, insurance, PCP", "§9-2"),
         ("Mobility Eval|appointment", "Verified both sides", "§9-2")]
x = 12
for i, (t, s_, sec) in enumerate(sales):
    p.append(box(x, 202, 148, 72, t, s_, sec, "--p9"))
    if i < 2:
        p.append(f'<path class="dg-arr" d="M{x+148} 238 H{x+158}"/>')
    x += 160
p.append(box(332, 292, 148, 72, "Eligibility", "Payer verification", "§4-2", "--p9"))
p.append('<path class="dg-arr" d="M406 274 V292"/>')
p.append('<path class="dg-arr" d="M480 328 H484 V238 H494"/>')

power = [("PAK", "Paperwork sent", "§4-3"),
         ("Qualifications", "Docs reviewed", "§4-4"),
         ("PT / ATP", "Where required", "§4-5"),
         ("PAR", "Sent to insurance", "§4-7")]
x = 494
for i, (t, s_, sec) in enumerate(power):
    p.append(box(x, 202, 108, 72, t, s_, sec, "--p4"))
    if i < 3:
        p.append(f'<path class="dg-arr" d="M{x+108} 238 H{x+118}"/>')
    x += 118
p.append(box(494, 292, 226, 72, "Order Verification", "Model, seat, joystick, color", "§4-8", "--p4"))
p.append('<path class="dg-arr-d" d="M607 274 V292"/>')
p.append('<path class="dg-arr" d="M720 328 H964 V238 H974"/>')
p.append(box(974, 202, 172, 72, "Field Ops-Power", "Manufacturer, then delivery", "§4-9", "--p5"))
p.append(box(974, 292, 172, 72, "Service", "Repairs, adjustments", "§6-1", "--p6"))
p.append('<path class="dg-arr" d="M1060 274 V292"/>')

p.append('<rect class="dg-lane" x="0" y="396" width="1160" height="62" rx="5"/>')
p.append('<rect class="dg-lane-b" x="0" y="396" width="1160" height="62" rx="5"/>')
p.append('<text class="dg-lbl" x="12" y="416">Running underneath every stage</text>')
p.append(box(12, 420, 368, 30, "Billing &amp; Insurance — Part 10", "", "", "--p10", light=True))
p.append(box(392, 420, 368, 30, "Call Handling — Part 1", "", "", "--p1", light=True))
p.append(box(772, 420, 374, 30, "Compliance — §3-12", "", "", "--navy", light=True))
p.append("</svg>")
open("diagrams/lifecycle.svg", "w").write(_dn("".join(p)))

# ------------------------------------------------------- transaction anatomy --
GROUPS = [
 ("", [("Patient", "Name, DOB, address, contacts", "§0-3"),
       ("Transaction", "Order type, category, market.", "§7-2.2"),
       ("  \u21b3 Fax History", "button inside Transaction", "§0-2.2"),
       ("State Validation", "", ""),
       ("Grids", "", "")]),
 ("Medical", [("Insurances", "Plan, member ID, effective date", "§0-3.2"),
              ("Doctors", "Prescribing provider", ""),
              ("Diagnoses", "", ""),
              ("Eligibility", "Eligibility Status — Sales or Power", "§9-3")]),
 ("Equipment", [("Refill Request", "Resupply", "§3-3"),
                ("Items", "", ""),
                ("Selection", "Equipment and quantities", "§7-2.2"),
                ("SoS", "Same or Similar check", "§10-13.5"),
                ("Pat. Resp.", "What the patient owes", "§10-20.1"),
                ("Authorization", "Prior authorization", "§10-9"),
                ("DX Validation", "", ""),
                ("Med Nec", "Medical necessity", ""),
                ("Prescriptions", "SWO / Rx", "§10-13.6"),
                ("Presc. Forms", "PPD Completed date", "§9-6"),
                ("Order Validation", "", "")]),
 ("Fulfillment", [("Ticket", "Date scheduled, route, tracking", "§5-2"),
                  ("Procurement", "", "")]),
 ("Claims", [("DX Validation", "", ""),
             ("Date Validation", "", ""),
             ("Claim Plan", "", ""),
             ("Claim Prep", "", ""),
             ("Denials", "Denied claims", "§10-18.3")]),
]
BUTTONS = [("Edit Patient", "Invoices, Payments", "§10-20.2"),
           ("Patient Artifacts", "Signed documents", "§5-6"),
           ("Patient Auths", "", ""),
           ("Process Payment", "Card, Pre-Pay, Save Card", "§10-20.3"),
           ("Messages", "Opens the Notes modal", "§0-11"),
           ("Order Artifacts", "Delivery ticket, PRF", "§5-6"),
           ("Email", "", ""), ("SMS", "", ""),
           ("Resolutions", "Lead Resolutions", "§9-5")]

ROW, SUB, GAP = 18, 10, 10
COLW = 222

def grp_height(items):
    h = 10
    for _, d, sec in items:
        h += ROW + (SUB if sec else 0)
    return h + 6

W2 = 1160
top = 104
col_h = [grp_height(i) for _, i in GROUPS]
by = top + 14 + max(col_h) + 34
H2 = by + 52 + 14

t = [f'<svg viewBox="0 0 {W2} {H2}" xmlns="http://www.w3.org/2000/svg" '
     f'role="img" aria-label="Transaction Workflow navigation">{MARK.replace("MKID","mkT")}<style>{CSS.replace("MKID","mkT")}'
     ".tw-i{font:600 10.5px 'IBM Plex Sans',sans-serif;fill:var(--accent)}"
     ".tw-n{font:400 9.5px 'IBM Plex Sans',sans-serif;fill:var(--muted)}"
     ".tw-g{font:700 9.5px 'IBM Plex Sans',sans-serif;fill:var(--navy);letter-spacing:.07em}"
     "</style>"]
t.append(f'<rect class="dg-lane" x="0" y="0" width="{W2}" height="{H2}" rx="5"/>')
t.append(f'<rect class="dg-lane-b" x="0" y="0" width="{W2}" height="{H2}" rx="5"/>')
t.append('<text class="dg-h" x="16" y="26">Transaction Work Flow — left navigation</text>')
t.append('<text class="dg-s" x="16" y="44">Entries the manual refers to are annotated with the '
         'section that uses them.</text>')
t.append(f'<rect class="dg-box" x="16" y="58" width="{W2-32}" height="28" fill="var(--tint)" stroke="var(--rule)"/>')
t.append('<text class="dg-ti" x="26" y="76">Header bar &#183; Patient &#183; Date of Birth &#183; Gender &#183; Address &#183; Phone</text>')
t.append(f'<text class="dg-sec" x="{W2-380}" y="76">verify name and DOB before discussing &#8212; §10-23</text>')

x = 16
for (gname, items), ch in zip(GROUPS, col_h):
    t.append(f'<text class="tw-g" x="{x}" y="{top}">{(gname or "TRANSACTION").upper()}</text>')
    t.append(f'<rect class="dg-box" x="{x-6}" y="{top+8}" width="{COLW}" height="{ch}" '
             f'fill="var(--bg)" stroke="var(--rule)"/>')
    y = top + 8
    for name, desc, sec in items:
        y += ROW
        t.append(f'<text class="tw-i" x="{x+2}" y="{y}">{name}</text>')
        if desc:
            t.append(f'<text class="tw-n" x="{x+2}" y="{y+SUB}">{desc}</text>')
            t.append(f'<text class="dg-sec" x="{x+COLW-52}" y="{y+SUB}">{sec}</text>' if sec else "")
            y += SUB
        elif sec:
            t.append(f'<text class="dg-sec" x="{x+COLW-52}" y="{y}">{sec}</text>')
    x += COLW + GAP

t.append(f'<text class="tw-g" x="16" y="{by-12}">ACTION BUTTONS &#8212; BOTTOM OF THE WINDOW</text>')
bw = (W2 - 34 - 8 * 6) // 9
bx = 16
for name, desc, sec in BUTTONS:
    t.append(f'<rect class="dg-box" x="{bx}" y="{by}" width="{bw}" height="46" '
             f'fill="var(--bg)" stroke="var(--accent)"/>')
    t.append(f'<text class="tw-i" x="{bx+6}" y="{by+15}">{name}</text>')
    if desc:
        t.append(f'<text class="tw-n" x="{bx+6}" y="{by+28}">{desc}</text>')
    if sec:
        t.append(f'<text class="dg-sec" x="{bx+6}" y="{by+40}">{sec}</text>')
    bx += bw + 6
t.append("</svg>")
open("diagrams/transaction.svg", "w").write(_dn("".join(t)))

for f in ("lifecycle", "transaction"):
    print(f"diagrams/{f}.svg  {len(open(f'diagrams/{f}.svg').read()):,} bytes")


# ------------------------------------------------ oxygen troubleshooting --
def fbox(x, y, w, h, lines, kind="dec"):
    fills = {"dec": ("var(--tint)", "var(--accent)", "var(--navy)"),
             "act": ("var(--bg)", "var(--rule)", "var(--ink)"),
             "start": ("var(--navy)", "var(--navy)", "var(--bg)"),
             "crit": ("var(--crit-bg)", "var(--crit-ink)", "var(--crit-ink)"),
             "tech": ("var(--watch-bg)", "var(--watch-ink)", "var(--watch-ink)"),
             "ok": ("var(--scr-bg)", "var(--scr-ink)", "var(--scr-ink)"),
             "note": ("var(--panel)", "var(--rule)", "var(--ink)"),
             "pol": ("var(--pol-bg)", "var(--pol-ink)", "var(--pol-ink)")}
    fill, stroke, ink = fills[kind]
    sw = 2 if kind in ("crit", "dec") else 1.4
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="5" fill="{fill}" '
           f'stroke="{stroke}" stroke-width="{sw}"/>']
    ls = lines.split("|")
    top = y + h / 2 - (len(ls) - 1) * 8
    for i, l in enumerate(ls):
        weight = "700" if (i == 0 and kind in ("crit", "start")) or l.startswith("**") else "500"
        l = l.replace("**", "")
        out.append(f'<text x="{x + w / 2}" y="{top + i * 16 + 4}" text-anchor="middle" '
                   f'style="font:{weight} 12px \'IBM Plex Sans\',sans-serif;fill:{ink}">{l}</text>')
    return "".join(out)


def fl(x1, y1, x2, y2, label="", lx=None, ly=None):
    s = f'<path class="dg-arr" d="M{x1} {y1} L{x2} {y2}"/>'
    if label:
        lx = lx if lx is not None else (x1 + x2) / 2 + 6
        ly = ly if ly is not None else (y1 + y2) / 2 - 4
        s += (f'<text x="{lx}" y="{ly}" style="font:700 11px \'IBM Plex Mono\',monospace;'
              f'fill:var(--muted)">{label}</text>')
    return s


W3, H3 = 1160, 790
SX, SW = 430, 300          # spine
RX, RW = 790, 330          # right outcomes
LX, LW = 40, 340           # left outcomes
cx = SX + SW / 2
o = [f'<svg viewBox="0 0 {W3} {H3}" xmlns="http://www.w3.org/2000/svg" role="img" '
     f'aria-label="Oxygen concentrator troubleshooting flowchart">'
     f'{MARK.replace("MKID", "mkO")}<style>{CSS.replace("MKID", "mkO")}</style>']
o.append(f'<text class="dg-h" x="{W3/2}" y="22" text-anchor="middle">Concentrator troubleshooting</text>')
o.append(fbox(SX, 36, SW, 40, "Patient reports an oxygen issue", "start"))
o.append(fl(cx, 76, cx, 104))
o.append(fbox(SX, 104, SW, 58, "**Is the patient in distress right now?|Short of breath, can't breathe", "dec"))
o.append(fl(SX + SW, 133, RX, 133, "YES", SX + SW + 12, 126))
o.append(fbox(RX, 104, RW, 58, "Hang up and dial 9-1-1|Stop troubleshooting — §1-4.1", "crit"))
o.append(fl(cx, 162, cx, 196, "NO"))
o.append(fbox(SX, 196, SW, 52, "Did we provide it, and is it|actively billing?", "dec"))
o.append(fl(SX + SW, 222, RX, 222, "NO", SX + SW + 12, 215))
o.append(fbox(RX, 200, RW, 44, "Ask them to call their|actual provider", "act"))
o.append(fl(cx, 248, cx, 282, "YES"))
o.append(fbox(SX, 282, SW, 44, "Does the machine power up?", "dec"))
o.append(fl(SX + SW, 304, RX, 304, "NO", SX + SW + 12, 297))
o.append(fbox(RX, 280, RW, 48, "Plug directly into a wall outlet —|no extension cord. Try another outlet", "act"))
o.append(fl(RX + RW / 2, 328, RX + RW / 2, 350))
o.append(fbox(RX + 40, 350, RW - 80, 34, "Powers up now?", "dec"))
o.append(fl(RX + 90, 384, RX + 90, 412, "YES", RX + 96, 402))
o.append(fl(RX + RW - 90, 384, RX + RW - 90, 412, "NO", RX + RW - 84, 402))
o.append(fbox(RX, 412, 150, 40, "Outlet issue — resolved", "ok"))
o.append(fbox(RX + RW - 150, 412, 150, 40, "Schedule a tech visit", "tech"))
o.append(fl(cx, 326, cx, 372, "YES"))
o.append(fbox(SX, 372, SW, 52, "Alarm or red light|after powering up?", "dec"))
o.append(fl(SX, 398, LX + LW, 398, "NO", SX - 34, 391))
o.append(fbox(LX, 366, LW, 64, "A yellow light at startup is normal|for about 15 minutes. If it persists,|schedule service on a regular weekday", "act"))
o.append(fl(cx, 424, cx, 462, "YES"))
o.append(fbox(SX, 462, SW, 40, "Ask them to remove ALL tubing", "act"))
o.append(fl(cx, 502, cx, 536))
o.append(fbox(SX, 536, SW, 52, "Oxygen flow back to normal?|No overheating?", "dec"))
o.append(fl(SX, 562, LX + LW, 562, "YES", SX - 38, 555))
o.append(fbox(LX, 536, LW, 52, "No machine issue.|Ask them to replace the tubing", "ok"))
o.append(fl(SX + SW, 562, RX, 562, "NO", SX + SW + 12, 555))
o.append(fbox(RX, 536, RW, 52, "Schedule a tech visit|and create a service ticket", "tech"))
o.append(fbox(LX, 630, 520, 92, "**Water in the tubing?|Usually an overfilled humidifier bottle. Ask them|to keep water below the max line, then remove|the bottle and test without it", "note"))
o.append(fbox(600, 630, 520, 92, "**Humidifier bottles|When ordering one, add humidifier adapter tubing.|Patients should keep at least one E cylinder|at home for a power outage", "note"))
o.append(f'<text x="{W3/2}" y="760" text-anchor="middle" class="dg-s">'
         f'Troubleshoot only a patient who is stable and on a backup supply.</text>')
o.append("</svg>")
open("diagrams/o2-troubleshoot.svg", "w").write(_dn("".join(o)))
print(f"diagrams/o2-troubleshoot.svg  {len(open('diagrams/o2-troubleshoot.svg').read()):,} bytes")
