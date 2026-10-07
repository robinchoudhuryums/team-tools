"""Diagram mocks, batch 1. Not part of the manual until approved."""
import re, sys
sys.path.insert(0, ".")
import io, contextlib
with contextlib.redirect_stdout(io.StringIO()):
    import make_diagrams as MD          # reuse MARK, CSS, fbox, fl, _dn

MARK, CSS, fbox, fl, dn = MD.MARK, MD.CSS, MD.fbox, MD.fl, MD._dn
OUT = {}


def svg(name, w, h, label, body):
    mk = "mk" + name.replace("-", "")[:6]
    s = (f'<svg viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{label}">'
         f'{MARK.replace("MKID", mk)}<style>{CSS.replace("MKID", mk)}</style>' + "".join(body) + "</svg>")
    OUT[name] = dn(s.replace("url(#MKID)", f"url(#{mk})"))


def elbow(x1, y1, x2, y2, label="", ym=None, lx=None, ly=None):
    ym = ym if ym is not None else (y1 + y2) / 2
    s = f'<path class="dg-arr" d="M{x1} {y1} V{ym} H{x2} V{y2}"/>'
    if label:
        s += (f'<text x="{lx if lx is not None else x2 + 6}" y="{ly if ly is not None else ym + 14}" '
              f'style="font:700 11px \'IBM Plex Mono\',monospace;fill:var(--muted)">{label}</text>')
    return s


def title(w, t, y=22):
    return f'<text class="dg-h" x="{w/2}" y="{y}" text-anchor="middle">{t}</text>'


def flag(x, y, w, t):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="22" rx="3" fill="var(--watch-bg)" '
            f'stroke="var(--watch-ink)" stroke-dasharray="4 3"/>'
            f'<text x="{x + w/2}" y="{y + 15}" text-anchor="middle" '
            f'style="font:600 11px \'IBM Plex Sans\',sans-serif;fill:var(--watch-ink)">{t}</text>')


# =============================================================== 1. status tree ===
W, H = 1160, 680
b = [title(W, "Status update — where is the order?")]
cx = 580
b.append(fbox(cx - 170, 38, 340, 38, "Caller asks where their order is", "start"))
b.append(fl(cx, 76, cx, 100))
b.append(fbox(cx - 170, 100, 340, 44, "**Found the patient by name and DOB?", "dec"))
b.append(fl(cx - 170, 122, 330, 122, "NO", cx - 206, 115))
b.append(fbox(40, 100, 290, 44, "Search the caller's phone number", "act"))
b.append(fl(185, 144, 185, 170))
b.append(fbox(60, 170, 250, 40, "Found a lead?", "dec"))
b.append(fl(185, 210, 185, 238, "YES"))
b.append(fbox(40, 238, 290, 62, "**Sales is working with them|Route to the Sales team member in the|lead notes, or the Sales Q — §9-4", "ok"))
b.append(elbow(310, 190, 350, 238, ym=190, label="NO", lx=316, ly=184))
b.append(fl(350, 238, 350, 322))
b.append(fbox(40, 322, 330, 76, "**No patient in the system|Likely not received, or too recent. Say we'll|update once it exists. Provider calling?|Ask them to resend the referral", "act"))
b.append(fl(cx, 144, cx, 238, "YES"))
b.append(fbox(cx - 150, 238, 300, 40, "**What does the order show?", "dec"))
b.append(fbox(800, 232, 340, 52, "**Power mobility order?|Also see the Power status diagram — §4-1", "note"))
b.append(f'<path d="M{cx + 150} 258 H800" stroke="var(--rule)" stroke-width="1.4" stroke-dasharray="4 3" fill="none"/>')
cols = [(20, "Received recently,|no updates"), (305, "Additional documentation|requested"),
        (590, "Pending|authorization"), (875, "Needs to be|re-opened")]
outs = ["**Still in early review|Say it's under review, and that|any documents are requested|once verification completes",
        "**Waiting on the provider|Transaction tab → Fax History.|Compare the latest request with|what's been received and the|most recent notes. Say what's|outstanding",
        "**Awaiting the insurer's decision|Say we're waiting on approval|before delivery. Questions go to|the intake team's authorization|members — §0-12.2",
        "**Needs review first|No transfer necessary. Email|the department who last worked|on or closed the order"]
kinds = ["act", "act", "act", "tech"]
for i, (x, lab) in enumerate(cols):
    mid = x + 132
    b.append(elbow(cx, 278, mid, 440, ym=420))
    b.append(fbox(x, 440, 264, 44, lab, "dec"))
    b.append(fl(mid, 484, mid, 506))
    b.append(fbox(x, 506, 264, 112, outs[i], kinds[i]))
b.append(f'<text x="{W/2}" y="650" text-anchor="middle" class="dg-s">Documents go out by fax or through '
         f'email or Parachute/SutureSign — a provider who "never got it" may be looking in the wrong place.</text>')
svg("m1-status", W, H, "Status update decision tree", b)

# ========================================================= 2a. after-hours dispatch ===
W, H = 1160, 700
b = [title(W, "After hours — who can be dispatched?")]
b.append(fbox(cx - 150, 38, 300, 38, "After-hours call", "start"))
b.append(fl(cx, 76, cx, 100))
b.append(fbox(cx - 150, 100, 300, 44, "**Is this a medical emergency?", "dec"))
b.append(fl(cx + 150, 122, 830, 122, "YES", cx + 162, 115))
b.append(fbox(830, 100, 300, 44, "Advise 9-1-1 now. Stop here", "crit"))
b.append(fl(cx, 144, cx, 170, "NO"))
b.append(fbox(cx - 150, 170, 300, 52, "Existing patient, and|our equipment?", "dec"))
b.append(fl(cx - 150, 196, 330, 196, "NO", cx - 184, 189))
b.append(fbox(20, 170, 310, 52, "New patient → call in business hours.|Not our equipment → we can't assist", "act"))
b.append(fl(cx, 222, cx, 248, "YES"))
b.append(fbox(cx - 150, 248, 300, 44, "**Where is the patient?", "dec"))
b.append(elbow(cx, 292, 175, 330, ym=312, label="HAWAII / ELSEWHERE", lx=40, ly=326))
b.append(fbox(20, 330, 310, 44, "No after-hours dispatch.|Advise business hours", "act"))
b.append(elbow(cx, 292, 985, 330, ym=312, label="SAN ANTONIO", lx=990, ly=326))
b.append(fbox(830, 330, 310, 60, "Oxygen concentrator service only —|dispatch the San Antonio technician.|Anything else: business hours", "act"))
b.append(fl(cx, 292, cx, 330, "DFW", cx + 6, 318))
b.append(fbox(cx - 150, 330, 300, 44, "**What equipment?", "dec"))
eq = [(20, "Oxygen concentrator|or suction", "Troubleshoot first — §7-6.|Unresolved → dispatch the|on-call DME technician", "act"),
      (305, "Ventilator, cough assist,|IPPB, BiPAP ST", "**Dispatch the on-call RT|immediately. Don't|troubleshoot", "crit"),
      (590, "Power wheelchair", "Advise business hours.|Stuck and vulnerable →|non-emergency services or 9-1-1", "act"),
      (875, "Anything else", "Order status, supplies,|product questions →|business hours. Log the call", "note")]
for x, lab, out, k in eq:
    mid = x + 132
    b.append(elbow(cx, 374, mid, 410, ym=392))
    b.append(fbox(x, 410, 264, 44, lab, "dec"))
    b.append(fl(mid, 454, mid, 476))
    b.append(fbox(x, 476, 264, 64, out, k))
b.append(fbox(20, 568, 1120, 48, "**When dispatching, relay all seven details — §8-3.1|Name · address · phone · caller and relationship · equipment · issue · troubleshooting already tried", "note"))
b.append(f'<text x="{W/2}" y="650" text-anchor="middle" class="dg-s">Oxygen combined with a PAP or ventilator '
         f'may call for the RT instead of a DME technician — confirm before dispatching.</text>')
svg("m2a-dispatch", W, H, "After-hours dispatch decision", b)

# =========================================================== 2b. escalation loop ===
W, H = 1160, 470
b = [title(W, "After hours — when the on-call doesn't answer")]
steps = [(60, "Call and text the|on-call technician|or RT", "wait 30 min"),
         (330, "Call again and|re-send the text", "wait 30 min"),
         (600, "Call and text|Level 1 backup|(RT call: the other RT)", "wait 30 min"),
         (870, "Call Level 2 backup,|if one is listed", "wait 30 min")]
SW2 = 220
for i, (x, t, wait) in enumerate(steps):
    b.append(fbox(x, 62, SW2, 54, f"**{i+1}. {t}", "act"))
    b.append(fl(x + SW2/2, 116, x + SW2/2, 156))
    b.append(f'<text x="{x + SW2/2 + 8}" y="140" '
             f'style="font:600 11px \'IBM Plex Mono\',monospace;fill:var(--muted)">{wait}</text>')
    b.append(fbox(x + 20, 156, SW2 - 40, 36, "Confirmed?", "dec"))
    b.append(fl(x + SW2/2, 192, x + SW2/2, 222, "YES"))
    b.append(fbox(x + 20, 222, SW2 - 40, 32, "Dispatch", "ok"))
    if i < 3:
        nx = steps[i + 1][0]
        b.append(f'<path class="dg-arr" d="M{x + SW2 - 20} 174 H{nx - 18} V89 H{nx}"/>')
        b.append(f'<text x="{x + SW2 - 12}" y="168" style="font:700 11px \'IBM Plex Mono\',monospace;fill:var(--muted)">NO</text>')
lx = steps[-1][0]
b.append(f'<path class="dg-arr" d="M{lx + SW2 - 20} 174 H1130 V300 H30 V89 H{steps[0][0]}"/>')
b.append(f'<text x="{lx + SW2 - 12}" y="168" style="font:700 11px \'IBM Plex Mono\',monospace;fill:var(--muted)">NO</text>')
b.append(fbox(410, 284, 340, 32, "No one responded — repeat from step 1", "tech"))
b.append(fbox(30, 350, 540, 80, "**Throughout the wait|Confirm the patient has a working backup.|Tell the caller you're reaching on-call staff; call back|with updates even when there's no news", "note"))
b.append(fbox(590, 350, 540, 80, "**If distress develops at any point|Tell them to dial 9-1-1 first — the dispatch attempt continues|afterward. Never contact off-schedule staff to fill the gap — §8-4", "crit"))
svg("m2b-escalation", W, H, "After-hours escalation chain", b)

# =============================================================== 3. PMD pick-up ===
W, H = 1160, 540
b = [title(W, "Caller asks us to pick up a power chair")]
b.append(fbox(cx - 170, 40, 340, 38, "Caller asks for a PMD pick-up", "start"))
b.append(fl(cx, 78, cx, 102))
b.append(fbox(cx - 170, 102, 340, 44, "**Why do they want it collected?", "dec"))
reasons = [(20, "Uncomfortable, or sounds|adjustable", "**Transfer to Service|No pick-up ticket.|Fit problems are often|adjustable", "ok"),
           (305, "Technical fault", "**Repair, not pick-up|No pick-up ticket", "ok"),
           (590, "Can't afford it", "**Offer the EAA or a payment|plan first — §5-9.3|(n/a for OOP orders)", "tech"),
           (875, "None of these", "**Is it patient-owned?", "dec")]
for x, lab, out, k in reasons:
    mid = x + 132
    b.append(elbow(cx, 146, mid, 184, ym=164))
    b.append(fbox(x, 184, 264, 44, lab, "dec"))
    b.append(fl(mid, 228, mid, 252))
    b.append(fbox(x, 252, 264, 72 if k != "dec" else 44, out, k))
b.append(fl(960, 296, 960, 340, "YES", 966, 322))
b.append(fbox(870, 340, 180, 62, "Can't be picked up —|theirs to keep, donate|or dispose — §4-9.1", "act"))
b.append(fl(1090, 296, 1090, 420, "NO", 1096, 362))
b.append(fbox(870, 420, 270, 40, "Create the pick-up ticket — §5-9.4", "act"))
b.append(fbox(20, 420, 830, 56, "**A pick-up may be irreversible|A patient who surrenders a PMD may not be able to get another for five years under Same or Similar — §10-13.5", "tech"))

svg("m3-pickup", W, H, "PMD pick-up decision", b)

# ============================================================ 9. rental timeline ===
W, H = 1160, 470
L, R = 190, 1120
def mx(m):                    # month -> x
    return L + (R - L) * m / 60
b = [title(W, "Rental, ownership and the 5-year lifetime")]
b.append(f'<line x1="{L}" y1="70" x2="{R}" y2="70" stroke="var(--rule)" stroke-width="1.5"/>')
for m, lab in [(0, "Delivery"), (13, "Month 13"), (36, "Month 36"), (60, "5 years")]:
    b.append(f'<line x1="{mx(m)}" y1="62" x2="{mx(m)}" y2="390" stroke="var(--rule)" '
             f'stroke-dasharray="{"0" if m in (0,60) else "3 4"}"/>')
    b.append(f'<text x="{mx(m)}" y="54" text-anchor="middle" '
             f'style="font:600 11px \'IBM Plex Mono\',monospace;fill:var(--muted)">{lab}</text>')

def seg(m1, m2, y, text, fill, ink, h=46):
    x1, x2 = mx(m1), mx(m2)
    s = (f'<rect x="{x1}" y="{y}" width="{x2 - x1 - 2}" height="{h}" rx="4" fill="var({fill})" '
         f'stroke="var({ink})" stroke-width="1.2"/>')
    ls = text.split("|")
    for i, l in enumerate(ls):
        w = "700" if i == 0 else "500"
        s += (f'<text x="{(x1 + x2) / 2}" y="{y + h/2 - (len(ls)-1)*7 + i*14 + 4}" text-anchor="middle" '
              f'style="font:{w} 11.5px \'IBM Plex Sans\',sans-serif;fill:var({ink})">{l}</text>')
    return s

def rowlab(y, t, sub):
    return (f'<text x="20" y="{y + 20}" style="font:700 13px \'IBM Plex Sans\',sans-serif;fill:var(--navy)">{t}</text>'
            f'<text x="20" y="{y + 36}" style="font:500 11px \'IBM Plex Sans\',sans-serif;fill:var(--muted)">{sub}</text>')

y = 96
b.append(rowlab(y, "Capped rental", "most DME"))
b.append(seg(0, 13, y, "Rented — 13 months|UMS owns and repairs it", "--tint", "--accent"))
b.append(seg(13, 60, y, "Patient owns it|Medicare covers repairs, with cost-sharing", "--scr-bg", "--scr-ink"))
y = 196
b.append(rowlab(y, "Oxygen", "concentrators, cylinders"))
b.append(seg(0, 36, y, "Rented — 36 months|UMS owns and services it", "--tint", "--accent"))
b.append(seg(36, 60, y, "No rental charge — UMS still owns it|Servicing continues; fee every 6 months", "--watch-bg", "--watch-ink"))
b.append(f'<text x="{mx(60) - 4}" y="{y + 64}" text-anchor="end" '
         f'style="font:500 11px \'IBM Plex Sans\',sans-serif;fill:var(--muted)">After 5 years: a new 36-month rental may begin</text>')
y = 296
b.append(rowlab(y, "Continuous rental", "ventilators, E0471"))
b.append(seg(0, 60, y, "Rented monthly for as long as it's needed — never owned", "--pol-bg", "--pol-ink"))
b.append(fbox(20, 400, 1120, 48, "**The patient never owns oxygen equipment|Say: \"Medicare pays for the rental for 36 months. After that you keep using it at no rental charge and we keep servicing it, for up to 5 years total.\"", "pol"))
svg("m9-rental", W, H, "Rental, ownership and useful lifetime timeline", b)

# ======================================================== 10. deductible, then 80/20 ===
W, H = 1160, 330
L, M, R, TOP, HT = 40, 380, 1120, 70, 150     # M: where the deductible is met
def blk(x1, x2, y, h, lines, fill, ink):
    s = (f'<rect x="{x1}" y="{y}" width="{x2 - x1}" height="{h}" rx="4" fill="var({fill})" '
         f'stroke="var({ink})" stroke-width="1.2"/>')
    for i, l in enumerate(lines):
        w = "700" if i == 0 else "500"
        s += (f'<text x="{(x1 + x2) / 2}" y="{y + h/2 - (len(lines)-1)*8 + i*16 + 4}" text-anchor="middle" '
              f'style="font:{w} 12px \'IBM Plex Sans\',sans-serif;fill:var({ink})">{l}</text>')
    return s
b = [title(W, "Original Medicare — who pays for approved charges through the year")]
b.append(f'<text x="{L}" y="56" style="font:600 11px \'IBM Plex Mono\',monospace;fill:var(--muted)">JANUARY 1</text>')
b.append(f'<text x="{R}" y="56" text-anchor="end" style="font:600 11px \'IBM Plex Mono\',monospace;fill:var(--muted)">DECEMBER 31</text>')
b.append(blk(L, M - 4, TOP, HT, ["Patient pays 100%", "until the annual Part B", "deductible is met — §10-2"], "--watch-bg", "--watch-ink"))
mh = HT * 0.8
b.append(blk(M + 4, R, TOP, mh - 3, ["Medicare pays 80%", "of the approved amount"], "--tint", "--accent"))
b.append(blk(M + 4, R, TOP + mh + 3, HT - mh - 3, ["Patient pays 20%"], "--watch-bg", "--watch-ink"))
b.append(f'<line x1="{M}" y1="{TOP - 10}" x2="{M}" y2="{TOP + HT + 14}" stroke="var(--muted)" stroke-dasharray="4 3"/>')
b.append(f'<text x="{M}" y="{TOP + HT + 30}" text-anchor="middle" '
         f'style="font:600 11px \'IBM Plex Mono\',monospace;fill:var(--muted)">DEDUCTIBLE MET</text>')
b.append(fbox(L, 270, R - L, 44, "**A secondary can take the patient's share|Medigap (most plans) covers the 20%. Full Medicaid or QMB → $0, including the deductible. No secondary → no yearly cap — §10-6", "note"))
svg("m10-costshare", W, H, "Deductible, then the 80/20 split", b)

# ------------------------------------------------------------------ mock page ---
md = ["# Diagram mocks — batch 1", "",
      "Four proposed diagrams for review. Each would sit in the section named, above or beside the "
      "existing table — the tables stay. Toggle light and dark to check both.", ""]
spec = [
 ("1 · Status update decision tree", "§0.2.1–0.2.2", "m1-status",
  "Revised: phone-number search when no patient is found; Power orders follow the same tree, with a "
  "link to their own status diagram; your wording on the provider and re-open outcomes."),
 ("2a · After hours — who can be dispatched", "§8.1–8.3", "m2a-dispatch",
  "Puts location before equipment, which §8.3 asks for in a Watch-out but its table can't show."),
 ("2b · After hours — escalation chain", "§8.4", "m2b-escalation",
  "The repeat loop and the 30-minute waits, with the two things that apply throughout."),
 ("3 · PMD pick-up requests", "§5.9.2 and §6.6.3", "m3-pickup",
  "One diagram for what's currently two sections. Checks ownership last, so a patient-owned chair "
  "with a fault still reaches repair rather than a refusal."),
 ("9 · Rental, ownership and the 5-year lifetime", "§10.13", "m9-rental",
  "The three billing tracks on one timeline — the rule patients dispute most."),
]
for t, where, key, why in spec:
    md += [f"## {t}", "", f"**Would sit in:** {where}. {why}", "",
           f'<div class="fig">{OUT[key]}</div>', "", "---", ""]
open("/tmp/mocks_b1.md", "w").write("\n".join(md))
for k, v in OUT.items():
    print(f"{k:<16} {len(v):>6,} bytes")
