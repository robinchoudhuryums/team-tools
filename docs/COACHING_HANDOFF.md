# Handoff: UMS Team Tools — Coaching (Training module)

## Overview
A visual + interaction redesign of the **Coaching** page in the Training module — the one
Training-module surface the earlier `design_handoff_team_tools_redesign*` bundles did not cover.
Built entirely on the app's existing Console design-token system
(`web-app/styles_design_tokens.html`) and existing icon registry (`web-app/script_icons.html`).
No new framework, color system, font, or icon.

**Reference file:** `Coaching Redesign.dc.html` (sections 01–04, light + dark).
**Target file:** `web-app/train/script_coaching.html`.

## About the design file
`Coaching Redesign.dc.html` is a **design reference authored in HTML** — a prototype of the
intended look, layout, and behavior. It is **not** production code to copy. It uses inline
literal hex values because a Design Component cannot reference the app's stylesheet; in the
codebase, **always use the token variable** (`var(--accent)`, `var(--destructive-soft)`, …) and
add view-scoped classes rather than inline styles. Assemble markup with `area.innerHTML = …`
string templates, `icon(name, size)` for every glyph, and `esc()` on every server-derived
string — same invariants as today.

## Fidelity
**High.** Colors, type, spacing, and component structure are final and drawn from the token
system. Behavior notes below are the contract; everything not mentioned stays as it is —
including the `currentView` / `COACH_MODE` / `mgrSeq` late-success guards, the
`_coachAckInFlight` double-click guard, `errorStateHtml_` on failure, and the PHI posture
(narrative renders only behind the authenticated view; the audit log stays content-free).

---

# 1 · What was wrong

| # | Problem | Where |
|---|---------|-------|
| 1 | The composer is expanded on every entry, so the KPIs and the actual list start below the fold. A manager arriving to check on the team is met by a blank form. | `coachRenderMgr_` |
| 2 | Bare `<h1 class="view-title">Coaching</h1>` instead of the shared `.app-bar` (breadcrumb + `.display-title`) every other redesigned view uses. | `enterCoachingView` |
| 3 | Bespoke `.coach-modes` / `.coach-mode` pill duplicating the shared `.toolbar-tabs` vocabulary. | styles block |
| 4 | Severity is a `<select>` of four full sentences — while the redesign's own precedent (Intake yes/no, Intake pain scale) is a color-coded chip scale. | `sevSel` |
| 4b | `Major` reads as a peak rather than a middle step, when it sits between Minor and Critical. Relabelled **Moderate** (display only — see §3). | `sevSel`, `coachSevChip_` |
| 5 | **Praise is the bottom rung of a severity ramp.** Recognition and correction are different acts; ranking one as a mild version of the other is the wrong model, and it makes praise invisible. | `coachSevTone_`, `sevSel` |
| 6 | No filter, no search, no sort on the list — flat and chronological, unbounded, on both the manager and rep side. Contradicts the stated purpose of the tool ("feedback to re-reference if needed"). | `coachRenderMgr_`, `coachRenderMy_` |
| 7 | **`noteId` is captured and stored but never rendered.** The link back to the Call Note that triggered the coaching is silently dropped after create. | `coachCardMgr_`, `coachCardMy_` |
| 8 | **`VoidReason` (cycle-17 M-6) is written but never surfaced.** Investigators have to open the sheet. | `coachCardMgr_` |
| 9 | KPI strip is four bare counts with no trend, no comparison, no names — nothing that tells a manager *who* to act on. | `coachAnalyticsHtml_` |
| 10 | The rep view is a banner plus a stack of cards. Acknowledge is a receipt; there is no reply, no grouping, no way to search back through it. | `coachRenderMy_` |
| 11 | Overdue rows in the per-employee table get a full `--destructive-soft` row background — heavier than the `.panel[data-tone]` inset-rule pattern used for the same meaning elsewhere. | `.coach-row-overdue` |

---

# 2 · Manager · Team Coaching

### 2a. Chrome
- Replace the `view-title-row` with the shared **`.app-bar`**: breadcrumb `Tools / Training / Coaching`
  + `.display-title` "Coaching" on the left; the mode tabs and the primary action on the right.
- Replace `.coach-modes` with **`.toolbar-tabs`** (`Mine` / `Team`, mono-uppercase, active =
  `var(--ink)` bg / `var(--paper)` text). Keep `role="tablist"` / `role="tab"` / `aria-selected` /
  `aria-controls` exactly as the A11 pass left them, and keep the `umsCoachingMode` persistence.
  **Delete the `.coach-modes` / `.coach-mode` rules.**
- Add a primary **Log coaching** button (`plus` icon, `var(--accent)` bg, `#fff` text —
  `var(--paper)` text on dark) in `.app-bar-right`. This is the only entry to the composer.

### 2b. KPI strip
Four cells, `.coach-kpi` geometry unchanged (left-aligned, 14px/18px padding — the V-11 match to
`.telemetry .tel-cell` stands). What changes is the content: each cell gains a second mono line.

| Cell | Value | Sub-line |
|------|-------|----------|
| Logged · 30d | `analytics.total` | delta vs previous 30 days + a 6-bar sparkline (last bar `var(--accent)`, rest `var(--paper-3)`) |
| Awaiting ack | `counts.open` | `median N days` from `analytics.medianDaysToAck` |
| Overdue > 7d | `counts.overdueUnacked` | the surnames, comma-joined, capped at two + "+N" — this is what makes the number actionable |
| Recognition | praise count | share of total |

The Overdue cell carries `inset 3px 0 0 var(--destructive)` when non-zero and its number uses
`var(--danger-deep)` (existing `.coach-kpi-num.crit`). Keep the `coachNum_` null-guards on every
number, and keep the `!a.total` fallback path that renders the lightweight operational counts.

### 2c. "Who needs a 1-on-1" — replaces the per-employee table
The current `mtRenderTable_` view answers "what are the numbers per rep". The stated job is
"which reps need more 1-on-1 training, and how urgently". Keep `mtRenderTable_` (sortable
headers, sticky header, tabular numerals — all still wanted) and change the **columns**:

`Employee · Mix 30d · Total · Last · Overdue · Signal`

- **Mix** is a stacked hairline bar, `height:8px; border-radius:999px; overflow:hidden`, track
  `var(--paper-3)`, segments flexed by count using the **existing** severity tone mapping:
  critical `var(--destructive)` · moderate `var(--warn)` · minor `var(--info)` · praise
  `var(--accent)`. One legend above the table, mono-uppercase. Rendered as a cell `cell()`
  function, so it stays inside the shared component.
- **Last** = relative days since the rep's most recent item.
- **Signal** is a `.kicker-pill`, tone by tier (below).
- Row gets `inset 3px 0 0` in the tier color for Priority (`--destructive`) and Watch (`--warn`)
  via `opts.rowClass` — **replacing** the full-background `.coach-row-overdue` tint.
- Default sort: signal score descending, so the reps needing attention are at the top.

**Where the mock's table chrome deviates from `.m-table` — read this before copying pixels.**
The board hand-draws the table as a CSS grid (a Design Component can't call `mtRenderTable_`).
Header treatment, row rhythm and numeral alignment are matched to the real rules in
`web-app/metrics/script_metrics.html` — no header fill, `border-bottom: 2px solid var(--line)`
on `th`, mono-uppercase at `letter-spacing:.04em` in `var(--muted)`, `6px 10px` / `8px 10px`
padding, `.m-num` right-aligned mono, `.m-name` at weight 500. Three things in the drawing are
not literal:
- **The tier rule.** Drawn as a row-level `inset 3px 0 0`. Under `border-collapse: collapse` an
  inset shadow on a `<tr>` does not paint — put it on the first cell instead
  (`.coach-row-priority td:first-child { box-shadow: inset 3px 0 0 var(--destructive); }`), which
  is also how `opts.rowClass` already reaches the row.
- **`tr:hover td { background: var(--paper-2) }`** exists in the component and isn't shown in a
  static mock. Keep it.
- **The wrapper.** The mock draws a rounded bordered card; in the codebase this is
  `.m-table-wrap` (which owns `max-height:62vh; overflow:auto` and the sticky
  `thead th { background: var(--paper-card) }`) inside a `.panel`. Use the real wrapper — a
  roster longer than the viewport needs the sticky header more than it needs the rounded corner.

**Signal tier — derived client-side, nothing stored.** Weighted 30-day score:
`critical ×4 + moderate ×2 + minor ×1 − praise ×1 + overdue ×2`.

| Tier | Condition | Pill tone |
|------|-----------|-----------|
| Priority | score ≥ 6, or any critical in the window | `destructive` |
| Watch | 3–5 | `warn` |
| Steady | 1–2 | default (neutral) |
| Clear | ≤ 0 | `accent` |
| No signal | nothing logged in 21 days | `info` |

*No signal* is deliberate, not a blank: a rep with no coaching for three weeks is a coverage
question, not a clean bill of health.

### 2d. Filter bar
A `.toolbar-tabs` segmented control with **live counts** —
`All N · Needs ack N · Overdue N · Praise N · Voided N` — plus a search field (narrative + TRX,
client-side over `COACH_STATE.dash.items`) and an employee `<select>`. `Overdue` is tinted
`var(--danger-deep)`, `Praise` `var(--success-deep)`; the rest are `var(--muted)`.
Voided items are **excluded from All** and only appear under their own tab.

All of it filters the already-cached payload — no extra round-trips. Persist the active tab per
browser (`umsCoachingFilter`) the same way the mode toggle persists.

### 2e. The card
```
┌ inset 3px 0 0 var(--destructive)  ← only when overdue
│ [severity pill] Employee  [TRX mono chip]  [Call note ↗]        [status pill] [date]
│ WHAT HAPPENED
│ body copy, var(--muted), 14px/1.55, text-wrap:pretty
│ ┌ var(--paper-2), border-left 2px var(--accent), radius 0 6 6 0
│ │ THE COACHING POINT                    ← var(--success-deep) label
│ │ body copy, var(--ink)
│ └
│ │ Rep replied  ← 2px var(--line) rule, quoted, only when RepResponse is set
│ ─────────────────────────────────────────────────────────────
│ meta (overdue age / revisit date / ack timestamp)   [Nudge] [Revisit] [Void]
└
```
- The two narratives are **not** peers. "What happened" is context, in `var(--muted)`; the
  coaching point is the thing the rep comes back to re-read, so it gets the tinted, accent-ruled
  block and `var(--ink)`. Replaces `coachNarrativeHtml_`'s two identical treatments.
- **Call note link** — render when `noteId` is set: `phone` icon + "Call note", `var(--accent)`,
  mono 11px. Click routes `enterTool('callnotes', …)` to the note. (Note the direction that
  already exists: Call Notes' "Coach on this" does `enterTool('develop','coaching')` — this is
  the return trip, and the data for it has been stored all along.)
- **Status pill** keeps today's three states via `.kicker-pill[data-tone]`: Acknowledged
  `accent` + `check`, Overdue `destructive` + `flag` (now with the age: "Overdue 9d"), Awaiting
  ack `warn`.
- **Nudge** — secondary button, `bell` icon; sends the existing reminder mail and stamps
  `NudgedAt`. Rate-limited to once per item per day; disabled with a tooltip when already nudged
  today. Only on unacknowledged items.
- **Revisit** — secondary button, `timeoff` icon; sets/clears `FollowUpAt`. When set, the card
  foot shows "Revisit 2 Sep".
- **Void** stays a `.tr-link` in `var(--danger-deep)` and keeps the `uiConfirm` flow. Capture the
  reason in that confirm (the field exists server-side, `voidCoaching(coachId, reason)` already
  takes it — today the client passes `''`).
- **Voided card**: dashed `var(--line-2)` border on `var(--paper-2)`, no narrative, one line —
  `VOID REASON` + the stored text. This is the whole of finding #8.

### 2f. Composer drawer
See section 3.

---

# 3 · Composer — drawer, kind split from severity

Opens from the app-bar button (and from a Call Notes `COACH_PREFILL`, which forces Team mode and
opens the drawer immediately — same as today, just into a drawer instead of a scrolled-to panel).
520px, right-anchored, `.panel` vocabulary, overlay behind it. Focus moves to the first empty
field on open (today it focuses `coach-what` when prefilled — keep that).

**Kind** — a 2-up segmented control, `Coaching` / `Praise`. Selected = `var(--accent)` border +
`var(--accent-soft)` bg + `var(--success-deep)` text.

**Severity** — only rendered for Coaching: three chips, `Minor` / `Moderate` / `Critical`, equal
width. Unselected `var(--paper-2)` / `var(--muted)` with a `var(--line)` border; selected fills
with the tone (`var(--info)` / `var(--warn)` / `var(--destructive)`, `#fff` text — dark text on
dark mode). A mono helper line under the row carries the sentence that used to be inside the
`<option>` ("Critical · serious, schedule a 1-on-1").

> **The stored `severity` enum does not change.** Praise still writes `severity: 'praise'`;
> `coachSevTone_` and `COACH_SEVERITIES` are untouched. The kind/severity split is a UI
> decomposition of the same field — `kind === 'praise' ? 'praise' : severityChip`. No migration.

> **`major` is relabelled `Moderate` in the UI only.** The stored value stays `'major'` —
> `COACH_SEVERITIES`, `coachSevTone_`, the `bySeverity` analytics keys, the fixture in
> `test/visual/mock.js` and every existing row are all unchanged. Add one display map
> (`{praise:'Praise', minor:'Minor', major:'Moderate', critical:'Critical'}`) and route
> `coachSevChip_`'s label through it instead of capitalising the raw enum, which is what it does
> today. Do **not** rename the enum: it would need a sheet migration for a word change, and the
> AuditLog rows already reference the old value.

**Praise mode** hides severity, relabels "What happened" → "What they did", hides the coaching-
point field, and shows a mono note: *praise has no severity and needs no acknowledgement.*

**Other fields**: Employee `<select>` (unchanged); Patient/TRX (unchanged, mono input);
**Revisit on** (new, optional date → `FollowUpAt`); linked-call-note chip when prefilled —
`accent-soft`, "Linked to call note CN-4471 · 17 Aug 11:04", with an × to unlink (today the
prefill is invisible, so a manager can't tell whether the link took); What happened (required);
The coaching point (optional, accent-ruled to match the card).

Footer: the existing HR-class hint verbatim, Cancel, and the primary submit
(`send` icon, label switches to "Log praise"). Keep the disable-on-submit + `Saving…` +
re-enable-on-failure behavior exactly as `coachCreate_` has it, and keep both toast validations.

---

# 4 · Rep · My Coaching

### 4a. Chrome & top of page
- Same `.app-bar` (no mode tabs — reps never see the toggle, unchanged), with a **search field**
  on the right: "Search your coaching". Client-side over `COACH_STATE.my.items`, matching both
  narratives and the TRX. This is the feature that makes the page a reference rather than an
  inbox.
- **Action callout** replaces `.coach-banner`: keep `var(--warn-soft)` / `var(--warning-deep)`
  but add `inset 3px 0 0 var(--warn)`, name the age of the oldest unacknowledged item, and put a
  **Jump to it** button on the right that scrolls to the first open card. (Use
  `element.scrollTo` / `window.scrollTo` — not `scrollIntoView`.) Render only when
  `openCount > 0`, as today.
- **Glance strip** — three `.coach-kpi` cells: `Received this quarter` · `Waiting on you`
  (`var(--warning-deep)` when non-zero) · `Recognition` (`var(--success-deep)`). Derived from the
  items already returned by `getMyCoaching`; no new endpoint.

### 4b. Recognition feed — separate, above coaching
Praise items lift out of the main list into their own section: `thumbsUp` icon + "Recognition"
heading + a mono note "no acknowledgement needed". Cards are compact, `var(--accent-soft)`
background, no severity pill, no action row, one narrative. Two per row, wrapping.

**Praise does not require acknowledgement.** Today it lands in the same ack queue as a critical,
which both inflates the chase list and makes recognition feel like a task. Server-side: treat
`severity === 'praise'` as auto-acknowledged at create (or exclude it from `overdueUnacked` and
the accountability digest) — either is fine, but the rep must not see an Acknowledge button on
praise.

### 4c. Coaching feed
- Section heading + a `.toolbar-tabs` filter: `All N` / `To acknowledge N`.
- **Grouped by month** with a mono-uppercase `AUGUST 2026` divider. Newest first.
- Cards use the same anatomy as section 2e, minus the employee name, plus the manager's name in
  the meta line (`23 Aug · R. Choudhury`) — reps currently cannot see who logged it.
- Acknowledged cards drop to `opacity:.86` (today `.78`, which pushes the body copy under AA).

### 4d. Acknowledge with an optional reply — the one real behaviour change
The card foot for an unacknowledged item becomes:

```
REPLY · OPTIONAL
[ textarea — "What you'll do differently, or a question for your manager." ]
Acknowledging confirms you've read it — a reply is optional.     [✓ Acknowledge]
```

- `acknowledgeCoaching(coachId, response)` — second arg optional, 2000-char cap, written to a new
  `RepResponse` column. **The server stays idempotent** (INV-134): a second ack is still a no-op,
  and the response is only written on the transition. Keep the `_coachAckInFlight` guard and the
  button-disable exactly as they are.
- Once acknowledged, the reply renders on **both** views as a quoted block ("Alina replied" /
  "Your reply") — a hairline `var(--line)` rule, mono label, `var(--muted)` body. This is what
  makes coaching a conversation instead of a receipt, and it gives the manager evidence for the
  1-on-1 the board is pointing them at.
- The audit log stays content-free — the response lives only in the HR record, same posture as
  the narrative (INV-134 / M-6).

---

# 5 · Critical notification email

**Reference:** `Coaching Redesign.dc.html` sections 04–05. **Builder: none — call the shared
shell.** The 2026-08-13 email-alignment audit put 19 of the app's 30 `MailApp.sendEmail` sites on
`buildBrandedEmailHtml_` + `brandedKvRows_`, and the Call Notes digests joined them in f477e7e.
This notice is a **caller**, not a template:

```js
buildBrandedEmailHtml_({
  subLabel:    'Training · Coaching',      // module eyebrow, as every branded caller passes
  heading:     mgrName + ' logged a critical coaching item for you',
  tone:        'danger',                   // existing tone — CN Urgent + clientErrSpikeAlert_ use it
  statusLabel: 'Needs your acknowledgement',
  rows:        brandedKvRows_([ … ]),      // navy-tinted detail table
  ctaUrl:      safeWebAppUrl_('develop'),  // '' → the wrapper DROPS the button
  ctaLabel:    'Open Coaching',
});
```

Do not hand-build the URL, the mark, the tone rule, or the detail table — the shell owns all
four, and the mark specifically must sit **on the card over a navy rule**, never on a navy fill
(`logoUrl` is a transparency-free JPEG). Verify the shell's exact slot order in `Code.js` before
building: `Code.js` is past the size a read can reach, so the mock reconstructs the chrome from
the restyle record rather than from source.

Logging a **Critical** item mails the rep. Nothing else does — Minor and Moderate rely on the
in-app badge and the existing accountability digest, and that scarcity is what makes the email
mean something when it arrives.

### 5a. Content contract — read this first
The email carries **no narrative, no patient, no TRX, and no note id.** The in-app posture is
that PHI-adjacent detail renders only behind the authenticated view; an inbox is not behind
authentication, and a forwarded or previewed notice is outside every control the app has. The
payload is: who logged it, when, the severity, that acknowledgement is required, the follow-up
date if set, and a deep link.

- Subject: **"Action needed: coaching logged for you — please acknowledge"** — names no severity
  and no patient, because it renders on lock screens.
- Recipients: the rep's roster address, cc the logging manager (the manager's copy is their
  record that the notice went out).
- The AuditLog row records the send with `coachId` only — content-free, same as every other
  Coaching audit row.

### 5b. Structure
Brand navy `#223b5d`, table layout, all-inline literal hex, `Arial,Helvetica,sans-serif`, 600px
single column — the same email-safe rules as the Call Note and PPD families. No `display:flex`,
no `gap`, no `filter`.

1. **Logo bar** — wordmark, `border-bottom: 2px solid #223b5d`.
2. **Critical banner** — a 4px `#c13030` rail cell beside a `#fce5e5` cell, `#8a1f1f`
   mono-uppercase label "Critical coaching logged". Reuses the Close Order theme triple from the
   email handoff rather than inventing a red.
3. **Heading** in navy: "{Manager} logged a critical coaching item for you", then two short lines
   — what's required, and that the details are in the app.
4. **Detail table** — navy header band, alternating `#ffffff` / `#f5f7fa`, navy-bold label
   column: Logged by · Logged · Severity (badge) · Acknowledgement ("Required — overdue after 7
   days") · 1-on-1. The 1-on-1 row is highlighted in place the way the Call Note email highlights
   Resolution: `background:#eef2f7` with `border-left:3px solid #223b5d` on the label cell.
   Omit the row entirely when `FollowUpAt` is unset.
5. **Button** — a padded `<a>` inside a `#223b5d` cell, "Open in Team Tools", deep-linking to the
   item under Training → Coaching. One line under it noting they can reply in the same place they
   acknowledge.
6. **Privacy note** — `#f6f7f9` panel stating plainly that the notice contains no patient
   information and no narrative. This is for the rep, not for compliance: an email about a
   critical HR item with no detail in it reads as ominous unless you say why.
7. **Footer** — mono `#a5acb8`, and a line explaining that minor and moderate items don't email.

### 5c. Send discipline
- Fire inside `createCoaching`, **after** the row is committed and **outside** the `ScriptLock`.
  Mail inside the lock is the cycle-9 M-7 all-hands-assign problem.
- A send failure must never fail the create: catch, log, and return `success` with
  `mailed: false` so the toast can say "Coaching logged — email didn't send".
- Don't re-mail on edit. Re-sends go through the **Nudge** path (§2e), which stamps `NudgedAt`
  and rate-limits to once a day.
- **Voiding a critical item sends a short retraction** to the same recipients. An unretracted
  "critical" notice sitting in a rep's inbox after the item was voided is worse than no notice.
- Per-manager branded sending already exists for docs and coaching mail (team-scoped, per
  INV-122/134) — the manager daily brief already reads `coachUnackedAll_`. Use that path, not a
  bare `MailApp` call.
- Keep a plain-text fallback, the way the CN digests did when they moved onto the shell.

### 5d. Tests
- A pure test that the builder's output contains none of `whatHappened`, `whatShould`,
  `patientTRX`, or `noteId` — a tripwire, since this is a contract a future edit could quietly
  break.
- A test that a non-critical severity produces no send, and that a send failure still returns
  `success: true`.

---

# 6 · Email unity — what else to update

From the same audit, with the coaching notice now in group 1. Full table in section 05 of the mock.

| Family | Shell | Status |
|--------|-------|--------|
| 19 sites — docs, coaching, training, punch, dept SLA, manager brief, error spike | `buildBrandedEmailHtml_` | Aligned — the critical notice belongs here |
| Call Notes digests (EOD / weekly / Urgent) | `buildBrandedEmailHtml_` | Aligned (f477e7e) |
| Intake trio (PPD / PMD / PAP) | `intakeEmailShell_` | **Flag** — mirrors the branded chrome instead of calling it |
| Dept requests · customer · provider · form submission | legacy UMS identity | **Out of unity** — never restyled |
| Failed-submission notice · trigger-install reminder | plain text | By decision — the first is worth revisiting |

**Flag 1 — the legacy family.** The real remaining gap, named in the audit and still unaddressed.
Move these builders onto `buildBrandedEmailHtml_`; the shell already covers what they need
(`subLabel`, `brandedKvRows_`, tones for SLA state). Two of them are the app's only
externally-facing mail, so they carry the brand furthest with the least design attention — worth a
copy read at the same time, since in-app shorthand doesn't travel outside the company.

**Flag 2 — collapse the second shell.** `intakeEmailShell_` was restyled to *mirror*
`buildBrandedEmailHtml_`'s chrome rather than call it. It looks right today; the problem is that
two shells kept in sync by hand means the next change to the branded chrome silently won't reach
Intake. Make it a thin wrapper. Caveat: the PPD body feeds `intakeBodyHash_`, so any change
rejects previews taken before the deploy (INV-111, working as designed, one page load wide) —
flag it to the operator with the deploy.

**Flag 3 — one palette.** The email handoff's own root-cause finding, still open: colour should
route through a single constant. A CN-named `CN_EMAIL_PALETTE` sitting beside inline literals in
the branded shell is exactly how the Material/Google/Atlassian hexes got in. Rename it to
something app-wide, extend with the semantic badge pairs, have both shells read it, and add a
tripwire that fails on a raw hex in any email builder — same shape as the existing byte-compare
pin.

Also still open from `email_styling.md` and worth confirming: the PPD recommendation list used
`display:flex` + `filter:grayscale` (both dropped by Outlook). If that fix hasn't shipped, it's a
correctness bug, not a styling preference.

> All of the above is drawn from the audit record and the restyle commits, not from the builders
> themselves — `Code.js` exceeds what a read can reach. Re-confirm the counts and groupings in
> source before scheduling any of the three.

---

# 7 · Server work

Three new trailing columns on the Coaching sheet, all self-healing the header row exactly the way
`VoidReason` did in cycle-17 M-6 (`COACH_HEADERS` 14 → 17):

| Column | Written by | Read by | Cap |
|--------|-----------|---------|-----|
| `RepResponse` | `acknowledgeCoaching(coachId, response)` | `getMyCoaching`, `getCoachingDashboard` | 2000 chars |
| `FollowUpAt` | `createCoaching`, a new `setCoachingFollowUp(coachId, dateOrNull)` | dashboard + accountability digest | ISO date |
| `NudgedAt` | a new `nudgeCoaching(coachId)` | dashboard (rate-limit + button state) | timestamp |

Timestamp discipline: write and parse these with the same helper the existing stamps use.
`CreatedAt` is SPACE-form and `parseTimestampMs_` was T-only — that mismatch is what made the
cycle-7 H-1 overdue detector dead on arrival. `FollowUpAt` feeds a digest, so it is exposed to
the same class of bug; pin it with a round-trip test the way `coachingOverdue` is pinned.

Everything else derives from data already on the wire: the signal board from `analytics.perRep`,
the filters and search from the cached items, the call-note link from the stored `noteId`, the
void reason from `CO.VOID_REASON`.

---

# 8 · Token hygiene while you're in the file

- The cross-cutting **`var(--accent-deep, …)` → `var(--success-deep)`** fix from the previous
  handoff applies to `.tr-complete-btn`, which Coaching uses for both Acknowledge and the
  composer submit. `--accent-deep` is not a defined token; it always falls back to flat
  `var(--accent)`.
- Drop redundant hex fallbacks (`var(--danger-soft, #fce5e5)` → `var(--destructive-soft)`).
- `.coach-banner` sets `border` and `background` to the same `var(--warn-soft)` — give it
  `var(--warn)` at low alpha or drop the border and use the inset rule.
- Delete after this change: `.coach-modes`, `.coach-mode`, `.coach-mode:hover`, `.coach-mode.on`,
  `.coach-row-overdue`.

# 9 · Accessibility & responsive
- Keep every A11/A2 gain: `role="tablist"`/`tab`/`aria-selected`/`aria-controls` on the mode
  tabs, `aria-current` on both nav levels, and the real `@media (max-width:540px)` breakpoint on
  `.coach-kpis` (2×2) alongside the `:root[data-compact]` pop-out rule — **they are not the same
  thing.**
- New controls: severity chips are a `role="radiogroup"` with `aria-checked`; filter tabs get
  `aria-pressed`; the drawer is `role="dialog"` `aria-modal="true"` with a focus trap and Escape
  to close; the reply textarea has a real `<label for>`.
- The signal board is a `<table>` via `mtRenderTable_` — the mix bar needs a text equivalent
  (`aria-label="2 moderate, 1 minor, 1 critical"`), since color alone carries it.
- Overdue is never signalled by color alone: the pill carries the word and the age.
- **`--muted-3` is decoration only** — the token file marks it below AA in both modes (`#a5acb8`
  is ~2.2:1 on white). Zero-values, dates, relative times and "no entries" in the signal board
  are content, so they use `--muted-2`, which the token file certifies AA on every surface.
  `--muted-3` is fine for input placeholder text and nothing else here. The AA tripwire in
  `test/client/run.js` measures this.
- Below 720px the board drops the Mix and Last columns and keeps Employee / Total / Overdue /
  Signal.

# 10 · Visual coverage
Add to `test/visual/shoot.mjs`: `coaching-mine-light-wide`, `coaching-mine-dark-wide`,
`coaching-drawer-light-wide`, and a `coaching-empty-light-wide` for the no-items path. The
existing `coaching-light-wide` / `coaching-dark-wide` cover the manager Team view. The fixture in
`test/visual/mock.js` needs `getMyCoaching` populated — it currently returns `{ items: [] }`, so
the rep view has never been shot at all.


---

# Addendum — reviewed against the repo, 2026-09-01

**Overdue tracking should use the new business-hours arithmetic.** `businessMinutesBetween_` and
the pure `bizMinutesLocal_` landed 2026-08-31, reading the Coverage planner's own
`COVERAGE_BUSINESS_START_HOUR` / `_END_HOUR` / `COVERAGE_WEEKDAYS_ONLY` so "working hour" has one
definition across coverage bands and every elapsed-time figure in the app. It defaults to
`CONFIG.MANAGER_TIMEZONE` (the operating anchor, not the storage frame), excludes weekends and US
holidays, and returns `null` rather than a plausible substitute for a corrupt or reversed pair.

That round's motivating rule applies directly here: **a figure in a digest and the same figure on
screen must not use different arithmetic.** It was written because Dept Requests could read
"overdue" in an email and on-time on screen.

Coaching has the same shape and the same exposure:
- "Overdue 9d" on the card and the `Overdue > 7d` KPI are calendar-day math.
- `medianDaysToAck` is calendar-day math.
- The accountability digest reads the same data on a schedule.

An item sent Friday at 4pm is not meaningfully three days unacknowledged on Monday morning, and a
rep on PTO accrues "overdue" the whole time. **Route the overdue window, the age on the card and
`FollowUpAt` through the shared helper**, keep the wall-clock figure as a secondary where it is
useful, and name the window — the BIZ-3 pattern, which the Spanish KPI strip and the Dept Requests
tracker already follow.

Two notes if you do: a `null` from the helper means *unknown*, and must render as unknown rather
than as zero or as on-time (INV-187); and the existing timestamp-discipline warning in §5 gets
sharper, not softer — the helper takes pre-converted points, so a SPACE-form `CreatedAt` reaching
it unparsed still yields `null`.

**Also new:** every roster row moves to `America/Chicago` under the ALL-CST policy, so the manager
anchor and the rep's own timezone now agree. That removes the rep-tz/manager-tz ambiguity noted for
the training digest, and it makes a business-hours overdue window unambiguous for the whole team.
