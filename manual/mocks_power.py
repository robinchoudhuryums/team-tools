"""Power status diagram — three takes for comparison."""
import sys, io, contextlib
sys.path.insert(0, ".")
with contextlib.redirect_stdout(io.StringIO()):
    import make_diagrams as MD
MARK, CSS, fbox, fl, dn = MD.MARK, MD.CSS, MD.fbox, MD.fl, MD._dn
OUT = {}
MONO = "font:700 11px 'IBM Plex Mono',monospace;fill:var(--muted)"
SANS = "'IBM Plex Sans',sans-serif"


def svg(name, w, h, label, body):
    mk = "mk" + name.replace("-", "")[:6]
    OUT[name] = dn(f'<svg viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg" role="img" '
                   f'aria-label="{label}">{MARK.replace("MKID", mk)}<style>{CSS.replace("MKID", mk)}</style>'
                   + "".join(body) + "</svg>")


def title(w, t, y=22):
    return f'<text class="dg-h" x="{w/2}" y="{y}" text-anchor="middle">{t}</text>'


def T(x, y, t, size=12, weight=500, fill="var(--ink)", anchor="start"):
    return (f'<text x="{x}" y="{y}" text-anchor="{anchor}" '
            f'style="font:{weight} {size}px {SANS};fill:{fill}">{t}</text>')


def lines(x, y, txt, size=11.5, weight=500, fill="var(--ink)", lh=15, anchor="start"):
    return "".join(T(x, y + i * lh, l, size, weight, fill, anchor) for i, l in enumerate(txt.split("|")))


def path(d, dashed=False):
    return f'<path class="dg-arr" d="{d}"{" stroke-dasharray=\"5 3\"" if dashed else ""}/>'


def label(x, y, t, anchor="start"):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" style="{MONO}">{t}</text>'


# =================================================== take 1: phased timeline ===
W, H = 1160, 640
b = [title(W, "Power orders — where is it, and what do I tell the caller?")]
def card(x, y, w, h, t, body, kind="act"):
    return fbox(x, y, w, h, "**" + t + "|" + body, kind)
A, AW = 20, 130
B, BW = 166, 176
C, CW = 358, 256
D, DW = 630, 170
E, EW = 816, 324
b.append(fbox(A, 72, AW, 44, "**Sales and|eligibility", "ok"))
b.append(fbox(B, 72, BW, 44, "**PAK", "dec"))
b.append(fbox(C, 72, CW, 44, "**Qualifications — always|Checks every document is here and correct", "dec"))
b.append(fbox(D, 72, DW, 44, "**PAR", "dec"))
b.append(fbox(E, 72, EW, 44, "**Field Ops-Power", "dec"))
for x1, x2 in ((A + AW, B), (B + BW, C), (C + CW, D), (D + DW, E)):
    b.append(fl(x1, 94, x2, 94))
b.append(path(f"M{A + AW/2} 72 V52 H{C + 60} V72", True))
b.append(label((A + C)/2 + 30, 46, "PAST M.E. DONE IN LAST 6 MOS — SKIPS PAK", "middle"))
b.append(card(A, 132, AW, 150, "Moves on at", "Eligible|(appt confirmed|& insurance|verified)|— §4-3"))
b.append(card(B, 132, BW, 84, "PPD", "~15-minute interview:|mobility needs, options,|the process — §5-2.1"))
b.append(card(B, 224, BW, 84, "Medical Assistant Ed.", "Walks the MDO's office|through the paperwork|— §5-2.2"))
b.append(card(B, 316, BW, 84, "Appt scheduling", "Reschedules if needed;|collects F2F and PAK|after the visit — §5-2.3"))
b.append(label(C + CW/2, 146, "IN PROGRESS AT THE SAME TIME", "middle"))
def bar(x, y, w, t, sub):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="50" rx="5" fill="var(--panel)" stroke="var(--muted)" '
            f'stroke-width="1.4" stroke-dasharray="5 3"/>' + T(x + 10, y + 20, t, 12, 700, "var(--navy)")
            + T(x + 10, y + 38, sub, 11.5))
b.append(bar(C, 156, CW - 40, "PT Eval — if required", "Waiting on the PT Rx or report"))
b.append(bar(C, 214, CW - 10, "ATP Eval — if required", "Field Ops schedules, 2–3 wks out"))
b.append(T(C + CW/2, 290, "Only when the order needs it — §5-4, §5-5", 11, 500, "var(--muted)", "middle"))
b.append(card(D, 132, DW, 104, "Submitted", "Final review and|preparation of all docs,|then submitted to|insurance — §5-6"))
b.append(fl(D + DW/2, 236, D + DW/2, 256))
b.append(fbox(D, 256, DW, 34, "**What came back?", "dec"))
b.append(path(f"M{D + DW/2} 290 V300 H{D + 39} V312"))
b.append(path(f"M{D + DW/2} 290 V300 H{D + DW - 39} V312"))
b.append(fbox(D, 312, 78, 44, "**Denied", "tech"))
b.append(fbox(D + DW - 78, 312, 78, 44, "**Approved", "ok"))
b.append(fbox(D, 366, 150, 52, "Authorization team|reviews for appeal", "tech"))
b.append(path(f"M{D + 39} 356 V366"))
b.append(card(E, 132, 150, 70, "Order placed", "with the|manufacturer"))
b.append(card(E + 174, 132, 150, 70, "Received", "in our|warehouse"))
b.append(fl(E + 150, 167, E + 174, 167))
b.append(card(E, 222, 324, 58, "Field Ops-Power calls to schedule", "Delivery — the patient must be home — §5-8"))
b.append(fl(E + 249, 202, E + 249, 222))
b.append(path(f"M{D + DW} 334 H{E - 22} V167 H{E}"))
OVx1, OVx2, OVy = C + 90, E - 8, 436
b.append(f'<rect x="{OVx1}" y="{OVy}" width="{OVx2 - OVx1}" height="72" rx="5" fill="var(--pol-bg)" stroke="var(--pol-ink)" stroke-width="1.4"/>')
b.append(T(OVx1 + 12, OVy + 22, "Order verification — §5-7", 12, 700, "var(--pol-ink)"))
b.append(T(OVx1 + 12, OVy + 41, "Confirms model, seat, joystick and color. After any PT / ATP eval;", 11.5, 500, "var(--pol-ink)"))
b.append(T(OVx1 + 12, OVy + 58, "can overlap Qualifications or PAR.", 11.5, 500, "var(--pol-ink)"))
b.append(f'<line x1="{E - 8}" y1="{OVy - 30}" x2="{E - 8}" y2="{OVy + 72}" stroke="var(--pol-ink)" stroke-width="2.5"/>')
for i, t in enumerate(["MUST BE DONE", "BEFORE THE ORDER", "IS PLACED"]):
    b.append(f'<text x="{E + 4}" y="{OVy + 30 + i*16}" style="font:700 11px \'IBM Plex Mono\',monospace;fill:var(--pol-ink)">{t}</text>')
TY = 570
b.append(label(20, TY - 14, "TYPICAL TIME"))
b.append(f'<line x1="{A}" y1="{TY}" x2="{D - 8}" y2="{TY}" stroke="var(--muted)" stroke-width="2" stroke-dasharray="6 5"/>')
b.append(T((A + D)/2, TY + 20, "Varies — mostly on how quickly the provider returns correct paperwork", 11, 500, "var(--muted)", "middle"))
b.append(f'<rect x="{D}" y="{TY - 7}" width="{DW}" height="14" rx="3" fill="var(--accent)"/>')
b.append(T(D + DW/2, TY + 22, "14 days or less", 11.5, 700, "var(--navy)", "middle"))
b.append(f'<rect x="{E}" y="{TY - 7}" width="{EW - 120}" height="14" rx="3" fill="var(--accent)"/>')
b.append(T(E + (EW - 120)/2, TY + 22, "2–3 weeks to the warehouse", 11.5, 700, "var(--navy)", "middle"))
b.append(f'<line x1="{E + EW - 116}" y1="{TY}" x2="{E + EW}" y2="{TY}" stroke="var(--muted)" stroke-width="2" stroke-dasharray="6 5"/>')
b.append(T(E + EW - 58, TY + 22, "then scheduled", 11, 500, "var(--muted)", "middle"))
svg("p1-timeline", W, H, "Power order status — phased timeline", b)


# ================================================ take 2: phase panels ===
W, H = 1160, 810
b = [title(W, "Power Order Process")]


def panel(x, y, w, h, color, head, refs=""):
    s = (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="var({color})" fill-opacity=".07" '
         f'stroke="var({color})" stroke-width="1.6"/>'
         f'<rect x="{x}" y="{y}" width="{w}" height="34" rx="8" fill="var({color})"/>'
         f'<rect x="{x}" y="{y + 26}" width="{w}" height="8" fill="var({color})"/>'
         + T(x + 14, y + 22, head, 13, 700, "var(--bg)"))
    if refs:
        s += f'<text x="{x + w - 12}" y="{y + 22}" text-anchor="end" style="font:600 11px \'IBM Plex Mono\',monospace;fill:var(--bg);opacity:.85">{refs}</text>'
    return s


def node(x, y, w, h, t, sub="", dashed=False, fill="var(--bg)", stroke="var(--rule)", ink="var(--navy)"):
    da = ' stroke-dasharray="5 3"' if dashed else ""
    s = (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{fill}" stroke="{stroke}" '
         f'stroke-width="1.4"{da}/>')
    n = len(sub.split("|")) if sub else 0
    tl = t.split("|")                    # a long title may take two lines
    top = y + h / 2 - (n * 14 + (len(tl) - 1) * 15) / 2 + (4 if not n else -2)
    s += lines(x + w/2, top, t, 12.5, 700, ink, 15, "middle")
    top += (len(tl) - 1) * 15
    if sub:
        s += lines(x + w/2, top + 17, sub, 11, 500, "var(--ink)", 14, "middle")
    return s


def diamond(cx, cy, w, h, t, sub=""):
    s = (f'<polygon points="{cx},{cy - h/2} {cx + w/2},{cy} {cx},{cy + h/2} {cx - w/2},{cy}" '
         f'fill="var(--tint)" stroke="var(--accent)" stroke-width="1.8"/>'
         + T(cx, cy + (4 if not sub else -1), t, 12.5, 700, "var(--navy)", "middle"))
    if sub:
        s += T(cx, cy + 15, sub, 10.5, 600, "var(--muted)", "middle")
    return s


def small(x, y, t, fill="var(--muted)", anchor="start"):
    return T(x, y, t, 10.5, 600, fill, anchor)


# ---- panels (section references sit bottom-right, so headers can carry full titles)
def refs(x, y, w, h, t):
    return f'<text x="{x + w - 10}" y="{y + h - 8}" text-anchor="end" style="font:600 10px \'IBM Plex Mono\',monospace;fill:var(--muted)">{t}</text>'
b.append(panel(200, 44, 560, 196, "--p5", "1 · Intake and education — PAK", "§5-2"))
b.append(panel(200, 272, 360, 390, "--p4", "2 · Qualifications", "§5-3 · §5-4 · §5-5"))
b.append(panel(576, 272, 290, 390, "--p8", "3 · Verification & authorization", "§5-6 · §5-7"))
b.append(panel(882, 272, 258, 390, "--p6", "4 · Delivery (Field Ops Power)", "§5-8"))


def tag(x, y, w, text):
    ls = text.split("|"); h = 12 + 13 * len(ls)
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="9" fill="var(--tint)" stroke="var(--accent)" stroke-width="1.2"/>'
            + lines(x + w/2, y + 17, text, 10.5, 700, "var(--navy)", 13, "middle"))


# ---- sales and its two routes in
b.append(node(20, 196, 150, 70, "Sales", "books the M.E.,|checks insurance", fill="var(--scr-bg)", stroke="var(--scr-ink)"))
b.append(path("M150 196 V148 H218"))
b.append(tag(22, 96, 118, "Eligible —|appt confirmed|& insurance verified"))
b.append(path("M60 266 V420 H212", True))
b.append(tag(22, 436, 164, "Past M.E. done in last|6 mos — skips PAK.|Qualifications still|does the PPD"))
b.append(f'<path d="M100 420 V436" stroke="var(--accent)" stroke-width="1.2" fill="none"/>')

# ---- phase 1
b.append(node(218, 96, 160, 100, "PPD", "~15-min interview:|mobility needs,|options, the process"))
b.append(node(400, 96, 160, 100, "Medical Assistant|Education", "walks the MDO's|office through the|PAK paperwork"))
b.append(node(616, 96, 130, 100, "Appointment", "reschedule if|needed; collect F2F|and PAK after visit"))
b.append(fl(378, 146, 400, 146))
b.append(path("M560 132 H616"))
b.append(path("M616 162 H560"))
b.append(small(588, 124, "new appt", anchor="middle"))
b.append(small(588, 178, "confirmed", anchor="middle"))
b.append(path("M480 196 V254 H372 V326 H300 V366"))
b.append(tag(490, 205, 150, "F2F and PAK received"))
b.append(f'<path d="M480 217 H490" stroke="var(--accent)" stroke-width="1.2" fill="none"/>')

# ---- phase 2
b.append(diamond(300, 420, 176, 108, "Qualifications", "always"))
def check(x, y, label, optional=False):
    """A form on the checklist: solid box if always required, dotted if only when applicable."""
    style = ('stroke="var(--muted)" stroke-dasharray="2 2"' if optional else 'stroke="var(--accent)"')
    s = f'<rect x="{x}" y="{y - 9}" width="10" height="10" rx="1.5" fill="none" stroke-width="1.4" {style}/>'
    return s + T(x + 16, y, label, 11, 500, "var(--muted)" if optional else "var(--ink)")


b.append(small(218, 494, "Reviews & requests documents"))
b.append(small(218, 507, "including:"))
forms = [("M.E. F2F", False), ("SWO", False), ("SE", False), ("LCMP Declaration", False), ("Addendum", True),
         ("PT/OT Report Concurrence", True), ("MRx", False)]
y = 526
for form, opt in forms:
    b.append(check(218, y, form, opt))
    y += 16
b.append(node(404, 318, 150, 84, "PT Eval", "scheduling, finding|eligible PT/OT services,|PT/OT explanation", dashed=True, fill="var(--panel)"))
b.append(check(410, 420, "PT Rx", True))
b.append(check(410, 436, "PT Report", True))
b.append('<rect x="404" y="458" width="150" height="84" rx="6" fill="var(--bg)"/>'
         '<rect x="404" y="458" width="150" height="84" rx="6" fill="var(--p6)" fill-opacity=".10"/>')
b.append(node(404, 458, 150, 84, "ATP Eval", "Field Ops schedules, up|to 2–3 weeks out based|on ATP travel route", dashed=True,
              fill="none", stroke="var(--p6)", ink="var(--p6)"))
b.append(check(410, 560, "ATP Report", True))
# a key for the dotted lines and boxes
b.append(f'<path d="M410 640 H440" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 3" fill="none"/>')
b.append(small(446, 644, "= if applicable"))
b.append(path("M388 420 H396 V360 H404", True))
b.append(path("M396 420 V500 H404", True))

# ---- phase 3
b.append(node(590, 318, 262, 72, "Order verification", "confirm item details with patient (model,|color, etc.) for order placement with the|manufacturer, and to ensure satisfaction",
              fill="var(--pol-bg)", stroke="var(--pol-ink)", ink="var(--pol-ink)"))
b.append(path("M554 360 H572 V346 H590"))
b.append(path("M554 500 H580 V364 H590"))
b.append(node(651, 406, 140, 32, "PAR packet prep"))
b.append(fl(721, 390, 721, 406))
b.append(fl(721, 438, 721, 454))
b.append(diamond(721, 492, 164, 76, "PAR Submission"))
b.append(node(590, 548, 118, 48, "Appeals", "up to 1–2 months", fill="var(--watch-bg)", stroke="var(--watch-ink)", ink="var(--watch-ink)"))
b.append(node(716, 548, 144, 48, "Approval confirmed", "", fill="var(--scr-bg)", stroke="var(--scr-ink)", ink="var(--scr-ink)"))
b.append(node(590, 618, 118, 36, "Order closed", "", fill="var(--crit-bg)", stroke="var(--crit-ink)", ink="var(--crit-ink)"))
b.append(fl(649, 596, 649, 618))
b.append(small(655, 611, "denied", "var(--crit-ink)"))
b.append(path("M639 492 H620 V548"))
b.append(small(614, 520, "denied", "var(--crit-ink)", "end"))
b.append(path("M803 492 H822 V548"))
b.append(small(816, 538, "approved", "var(--scr-ink)", "end"))
b.append(path("M708 572 H716"))

# ---- phase 4
b.append(node(898, 318, 226, 50, "Order placed", "with the manufacturer"))
b.append(f'<rect x="966" y="380" width="90" height="24" rx="12" fill="var(--accent)"/>')
b.append(T(1011, 396, "2–3 weeks", 11.5, 700, "var(--bg)", "middle"))
b.append(node(898, 416, 226, 50, "Received", "in our warehouse"))
b.append(node(898, 478, 226, 40, "Scheduling"))
b.append(node(898, 530, 226, 64, "Delivered", "patient must be home; tech will|educate and adjust as needed",
              fill="var(--scr-bg)", stroke="var(--scr-ink)", ink="var(--scr-ink)"))
b.append(fl(1011, 368, 1011, 380))
b.append(fl(1011, 404, 1011, 416))
b.append(fl(1011, 466, 1011, 478))
b.append(fl(1011, 518, 1011, 530))
b.append(path("M860 572 H874 V336 H898"))
b.append(f'<path d="M852 354 H898" stroke="var(--pol-ink)" stroke-width="1.6" stroke-dasharray="4 3" fill="none"/>')

# ---- typical time
TY = 720
b.append(label(20, TY - 18, "TYPICAL TIME"))
b.append(f'<line x1="20" y1="{TY}" x2="566" y2="{TY}" stroke="var(--muted)" stroke-width="2" stroke-dasharray="6 5"/>')
b.append(T(293, TY + 22, "Sales, PAK and Qualifications vary — mostly on how quickly the provider returns correct paperwork", 11, 500, "var(--muted)", "middle"))
b.append(f'<rect x="590" y="{TY - 7}" width="262" height="14" rx="3" fill="var(--accent)"/>')
b.append(T(721, TY + 24, "PAR: about 14 days", 11.5, 700, "var(--navy)", "middle"))
b.append(f'<rect x="898" y="{TY - 7}" width="150" height="14" rx="3" fill="var(--accent)"/>')
b.append(T(973, TY + 24, "2–3 weeks to warehouse", 11.5, 700, "var(--navy)", "middle"))
b.append(f'<line x1="1054" y1="{TY}" x2="1140" y2="{TY}" stroke="var(--muted)" stroke-width="2" stroke-dasharray="6 5"/>')
b.append(T(W/2, 778, "Dashed boxes happen only when the order needs them. With no PT or ATP eval, Qualifications moves straight to order verification.", 11, 500, "var(--muted)", "middle"))
svg("p2-panels", W, H, "Power order phases", b)


# ============================================== take 3: vertical tracker ===
W = 1160
rows = [
 ("Sales and eligibility", "Books the mobility evaluation and checks the insurance. Moves on at Eligible —|the appointment is confirmed and insurance verified. See §4-3",
  "With Sales, confirming the appointment|and insurance", "varies", "--scr-ink"),
 ("PAK", "PPD interview (~15 min), then PAK documents go to the MDO. Medical Assistant Education|walks their office through it. Reschedules if needed; collects F2F and PAK after the visit",
  "Paperwork is with the doctor's office|for the evaluation", "varies", "--accent"),
 ("Qualifications", "Checks every document is here and correct, and requests corrections. PT and ATP|evaluations run alongside — only when needed. ATP is scheduled 2–3 weeks out",
  "Reviewing the provider's paperwork —|say exactly what's outstanding", "varies", "--accent"),
 ("PAR", "Final review and preparation of every document, then submitted to insurance.|Denied → the Authorization team reviews for an appeal",
  "Pending authorization — insurers|take 14 days or less to decide", "≤ 14 days", "--accent"),
 ("Ordered and delivered", "Order placed with the manufacturer, 2–3 weeks to our warehouse. Once it's|received, Field Ops-Power calls to schedule — the patient must be home",
  "Ordered — it takes 2–3 weeks to reach|us, then we call to schedule", "2–3 weeks", "--accent"),
]
RH, Y0 = 92, 96
H = Y0 + RH * len(rows) + 70
b = [title(W, "Power orders — tracking one through")]
SX = 64
for x, t in ((96, "STAGE AND WHAT'S HAPPENING"), (716, "TELL THE CALLER"), (1010, "TYPICAL TIME")):
    b.append(label(x, 66, t))
b.append(f'<line x1="{SX}" y1="{Y0 + 12}" x2="{SX}" y2="{Y0 + RH * (len(rows) - 1) + 12}" stroke="var(--rule)" stroke-width="4"/>')
for i, (st, what, tell, tm, col) in enumerate(rows):
    y = Y0 + i * RH
    b.append(f'<circle cx="{SX}" cy="{y + 12}" r="11" fill="var(--bg)" stroke="var({col})" stroke-width="3"/>')
    b.append(T(SX, y + 16, str(i + 1), 11, 700, f"var({col})", "middle"))
    b.append(T(96, y + 17, st, 14, 700, "var(--navy)"))
    b.append(lines(96, y + 38, what, 11.5, 500, "var(--ink)", 15))
    b.append(f'<rect x="704" y="{y}" width="286" height="62" rx="5" fill="var(--panel)" stroke="var(--rule)"/>')
    b.append(lines(716, y + 24, tell, 11.5, 500, "var(--ink)", 15))
    solid = tm != "varies"
    b.append(f'<rect x="1004" y="{y + 18}" width="136" height="26" rx="13" fill="{"var(--accent)" if solid else "var(--panel)"}" '
             f'stroke="{"var(--accent)" if solid else "var(--rule)"}"{"" if solid else " stroke-dasharray=\"4 3\""}/>')
    b.append(T(1072, y + 35, tm, 11.5, 700, "#fff" if solid else "var(--muted)", "middle"))
# QL skip and order verification bracket
b.append(path(f"M{SX - 22} {Y0 + 12} C{SX - 50} {Y0 + 12}, {SX - 50} {Y0 + 2*RH + 12}, {SX - 18} {Y0 + 2*RH + 12}", True))
b.append(f'<text x="{SX - 44}" y="{Y0 + RH + 16}" text-anchor="middle" transform="rotate(-90 {SX - 44} {Y0 + RH + 16})" style="{MONO}">PAST M.E. ≤ 6 MOS</text>')
bx = 690
b.append(f'<path d="M{bx} {Y0 + 2*RH} H{bx + 6} M{bx} {Y0 + 2*RH} V{Y0 + 4*RH - 8} H{bx + 6}" stroke="var(--pol-ink)" stroke-width="2.5" fill="none"/>')
b.append(f'<rect x="{bx - 10}" y="{Y0 + 4*RH - 8}" width="10" height="1" fill="none"/>')
b.append(fbox(96, H - 58, 590, 40, "**Order verification — model, seat, joystick, color. Any time from Qualifications|through PAR, but it must be done before the order is placed — §5-7", "pol"))
b.append(f'<path d="M{bx} {Y0 + 3*RH + 20} H{686}" stroke="none"/>')
b.append(f'<text x="{bx - 8}" y="{Y0 + 3*RH - 6}" text-anchor="middle" transform="rotate(-90 {bx - 8} {Y0 + 3*RH - 6})" '
         f'style="font:700 10.5px \'IBM Plex Mono\',monospace;fill:var(--pol-ink)">ORDER VERIFICATION</text>')
svg("p3-tracker", W, H, "Power order tracker", b)

# ------------------------------------------------------------ page ---
md = ["# Power status — refined", "",
      "Take 2's phase panels, with Take 1's timing strip, Order Verification's deadline and section references.", ""]
spec = [
 ("Refined · Phase panels with timing", "p2-panels",
  "Order verification now shows its deadline as a dashed link into **Order placed**, and PAR carries its full "
  "description. Section references sit in each phase header."),
]
_unused = [
 ("Take 1 · Phased timeline (revised)", "p1-timeline",
  "The previous version with your edits: Qualifications is the stage header, and the 90-day box is gone. "
  "Strongest on **timing** — the typical-time row and Order Verification's deadline."),
 ("Take 2 · Phase panels, after your original", "p2-panels",
  "Your staircase of four coloured phases, redrawn with current content. Keeps the **hold routes** for PT and ATP "
  "branching off Qualifications, the appointment loop inside PAK, and Appeals → Approval. Strongest on **flow and branching**."),
 ("Take 3 · Vertical tracker", "p3-tracker",
  "A different angle: read top to bottom like tracking a package, with what to tell the caller beside each stage. "
  "Strongest on **the call itself** — it's the version a CSR could use without reading anything else."),
]
for t, key, why in spec:
    md += [f"## {t}", "", why, "", f'<div class="fig">{OUT[key]}</div>', "", "---", ""]
open("/tmp/mocks_power.md", "w").write("\n".join(md))
for k, v in OUT.items():
    print(f"{k:<14} {len(v):>6,} bytes")
