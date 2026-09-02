# Handoff: UMS Team Tools — Manage module

## Overview
A pass over the **Manage** module's four tabs. They needed unequal amounts of work, so this is
three different-sized changes rather than one redesign:

| Tab | Enter | File | Scope here |
|-----|-------|------|-----------|
| Manage Time | `enterManagerView` | `web-app/tc/script_manager.html` | Reorder by urgency; collapse the periodic panels |
| Coverage | `enterCoverageView` | `web-app/tc/script_manager.html` | Chrome + date control only |
| Punctuality | `enterPunctualityView` | `web-app/tc/script_manager.html` | Full redesign |
| Admin | `enterCallNotesAdminView` | `web-app/cn/script_callnotes.html` | **Not touched** — already restructured |

**Reference file:** `Manage Redesign.dc.html` (sections 01–05; Punctuality light + dark, the rest
light). Built on the existing Console token system and icon registry — no new framework, colour,
font, or icon. As with the Coaching handoff, the mock inlines literal hex because a Design
Component can't reference the stylesheet; **use the token variable** in the codebase.

## What is NOT changing
Every guard in this file stays exactly as it is. Several were bought with real bugs:
- `_covSeq` / `_punctSeq` same-view range races (cycle-9 L-31 — two quick Loads landing out of
  order rendered range A's data under range B's inputs).
- The D5 midnight re-anchor of a still-default range, and the rule that a *user-chosen* range is
  never touched.
- `isoDateTz(empTz())` roster-tz anchoring rather than the browser clock (F/L-5).
- `mgrAddDaysIso_` for DST-safe date math.
- `errorStateHtml_` on failure vs the quiet `.no-data` empty state — A12/INV-175. A failed RPC
  must never look like a quiet range.
- Coverage's `ptoUnavailable` warning with `role="alert"` (cycle-16 F4). An understaffing planner
  that silently reports full staffing is worse than one that refuses to answer.

---

# 1 · Shared date-range control

**The cross-cutting finding: three surfaces, three different controls.**

| Surface | Today |
|---------|-------|
| Metrics | Pressed-state preset chips + a shared *Custom…* disclosure, `aria-pressed`, `.m-preset-chip` retired — **correct**, built in the `18pre` round |
| Punctuality | 7D / 30D / QTR buttons with **no pressed state** — the exact defect that round fixed |
| Coverage | **No presets at all** — two date inputs and a Load button |

Extract the Metrics control as **`mtDateRange_`** (naming parallel to `mtRenderTable_`, which
already lives in `script_core.html` and serves three modules) and have all three call it. Carry
over what the Metrics round established: `aria-pressed` on each chip, `aria-expanded` /
`aria-controls` on the *Custom…* disclosure, pressed = "selection matches no preset" for Custom,
and state that survives a re-render.

**One thing must stay different.** Coverage looks *forward* — its range is a staffing plan — and
Punctuality looks *back*. Same component, different preset set:

- Backward (Punctuality, Metrics): `7D` · `30D` · `QTR` · `Custom…`
- Forward (Coverage): `This week` · `Next week` · `2 weeks` · `Custom…`

Reusing 7D/30D/QTR on Coverage would point a staffing planner at the past.

Watch the `.toolbar-tabs` overflow fix while you're here: a five-chip strip is wider than a phone,
and the pill is supposed to scroll *inside itself* rather than push the page sideways (the V-6
25px-overflow fix at 390px).

---

# 2 · Punctuality — full redesign

### 2a. What was wrong
| # | Problem |
|---|---------|
| 1 | Bare `<h1 class="view-title">` — while **`enterManagerView`, in the same file, already uses `.app-bar`**. Two tabs on one tab bar disagreeing. |
| 2 | **Hand-rolled `.punct-table`** — the last hand-rolled manager table in the app. This is the V-11 finding that moved Coaching's rep table onto `mtRenderTable_` in cycle 12, and it contradicts CLAUDE.md's explicit decision that new manager tables reuse the component. No sortable headers, no sticky header, no hover. |
| 3 | Presets with no pressed state (see §1). |
| 4 | "Least punctual first" is asserted in a note with **no sort control** — the user can't verify it or change it. |
| 5 | **No drill-down.** A manager sees "avg late 18m, worst 41m" and cannot see *which days*, so the number can't survive a conversation with the rep. `mtRenderTable_`'s optional `detailRow(r)` hook has existed since cycle 14 and is unused. |
| 6 | `Lunch on-time` renders `—` with no explanation of why it's empty. |
| 7 | Three dead local functions — `isoLocal` in `enterCoverageView` and `enterPunctualityView`, `iso` in `punctPreset_` — leftovers from the L-5 timezone fix, defined and never called. |

### 2b. Structure
This tab serves **two jobs equally**: spotting who needs a conversation, and keeping a complete
attendance record. The design does both rather than choosing — outliers are named at the top, the
full roster stays below.

1. **`.app-bar`** — breadcrumb `Tools › Manage › Punctuality` (separator `›`, matching the
   existing instance in this file — see §3a), `.display-title`, then `mtDateRange_` and an Export
   button in `.app-bar-right`.
2. **Summary strip** — keep `.telemetry` (it's the canonical component; Coaching's `.coach-kpi`
   was matched *to* it in V-11). Four cells: Team on-time, Reps, Avg late, Worst single day. Two
   additions: a **delta vs the previous equivalent range** on Team on-time, and the **rep + date**
   on Worst, so the worst number is attributable at a glance. Worst carries
   `inset 3px 0 0 var(--destructive)` when it exceeds the concern threshold.
3. **"Worth a conversation"** — a `.panel[data-tone="destructive"]` listing reps below 75%, each
   with their percentage, a trend chip (Worsening / Flat / Improving), a late-day count, and a
   **Log coaching** button. Render nothing when the list is empty; do not show an empty panel.
4. **Note line** — the grace-window explanation, unchanged in substance.
5. **Full roster** via `mtRenderTable_`: `Rep · Shift start · Days · On-time · Avg late · Worst ·
   Lunch`, expandable. Default sort on-time ascending. Keep the inline bar under the percentage —
   it survives the move as a cell renderer.

### 2c. Thresholds
Reuse `mPctClass_(pct, thr)`'s *mechanism*, but pass **Punctuality's own 90 / 75** — not Metrics'
80 / 50. The existing `toneCol` already uses 90/75; keep those numbers and drop the local helper.
A shared function with a passed threshold is the point; a shared threshold would be wrong.

### 2d. The expanded row — `detailRow(r)`
A full-width `<tr><td colspan>` on `var(--paper-2)`, two columns:

**Left — the record**
- **Day-by-day strip.** One small block per day in range: on-time `var(--accent)`, late ≤15m
  `var(--warn)`, late >15m `var(--destructive)`, time off `var(--paper-3)` with a dashed border,
  holiday `var(--info-soft)`. Legend below.
  **Time off and holidays must be drawn, not omitted** — an absent day rendered as a gap reads as
  an untracked absence, which is the opposite of what an attendance record should say.
- **Late days** — a small grid of date + minutes chips, worst first, tinted by severity, with a
  "+N more" cell rather than an unbounded list.

**Right — the diagnosis**
- **Scheduled start vs actual.** A short timeline: the scheduled start as a rule, the grace
  window as an `--accent-soft` band, and one dot per clock-in positioned by actual time. This is
  the view that distinguishes "always eight minutes late" from "fine except three bad days" —
  two situations with the same average and completely different conversations.
- **On-time by week** — four bars + a trend chip and the point delta.
- **Actions** — Log coaching (primary), Open timesheet (secondary).

### 2e. Server work — `getPunctualityReport`
Add a per-rep `days[]`, one entry per day in range:

```js
{ date: '2026-08-12', schedStartMin: 480, actualMin: 521, lateMin: 41,
  state: 'ontime' | 'late' | 'off' | 'holiday', ptoType: 'Annual' }
```

Everything the expanded row draws comes from that one array. Also add `prevOnTimePct` (for the
delta) and four weekly buckets (for the trend). Holidays come from the same source the Coverage
grid already reads.

The payload is now per-rep **per-day** across the range, so bound it: cap the server-side range
(the QTR preset is 90 days × roster size), and return `days[]` only for reps the manager can see —
the existing team scoping, unchanged.

### 2f. Coaching hand-off
**Log coaching** routes `enterTool('develop', 'coaching')` with a `COACH_PREFILL` carrying
`empId` and a pre-written narrative — e.g. *"59% on-time over 30 days; 9 late days, worst 41m on
12 Aug."* This reuses the Call Notes prefill mechanism exactly as it stands, including forcing
Team mode and opening the composer.

> The tool key is **`develop`**, not `training`. `enterTool` returns silently on an unknown key,
> which is how Call Notes' "Coach on this" was a dead no-op from the Manage reorg until cycle 18's
> H-1. There is a comment-stripped tripwire asserting every `enterTool('…')` literal is a
> registered TOOL key — it will catch this, but only if you run it.

---

# 3 · Manage Time — same scroll, ordered by urgency

The problem is order and length: ten-plus `.card` panels in source order, mixing things that
block a person *today* with things done monthly. There is also one chrome change (§3a) — this tab
already uses `.app-bar`, but what it puts in it is stale.

### 3a. Chrome — the crumb trail and the H1 are out of date
The existing bar reads `Time Clock › Manager Dashboard` with `<h1 class="display-title">Manager
Dashboard</h1>`. Both predate the Manage reorg, when this view moved out of Time Clock into the
consolidated Manage tool. Change both:

| | Today | Proposed |
|---|-------|----------|
| Breadcrumb | `Time Clock › Manager Dashboard` | `Tools › Manage › Manage Time` |
| H1 | `Manager Dashboard` | `Manage Time` |

The H1 should match the tab label in the `TOOLS.manage` registry (`label: 'Manage Time'`) — a tab
named one thing that opens a page titled another is the drift that makes a deep link feel broken.
Doing it in this pass is what makes all three redesigned tabs' crumb trails consistent.

**Separator glyph:** the app's one rendered `.app-bar` instance uses `›`, and the mock matches
it. The tokens file styles `.breadcrumb .crumb-sep { opacity: .5 }` but doesn't fix the glyph, so
`script_manager.html` is the reference — keep `›` everywhere and don't introduce a second
separator.

### 3b. Order

**Panel order today:** hero + analytics → PTO reconciliation → sheet doctor → adjust queue → live status →
pending time off → missed clock-outs → ADP export → recent punches → audit.

Three panels that block a person (pending time off, missed clock-outs, adjust queue) sit below
four that nobody reads daily. That's the whole finding.

**Proposed — one scroll, two labelled groups:**

- **Needs you today** — Pending time off · Missed clock-outs · Adjust queue · Live status.
  Pending time off gets `inset 3px 0 0 var(--warn)` and an "oldest N days" line; Missed clock-outs
  gets `inset 3px 0 0 var(--destructive)` and keeps "fix before payroll".
- **Periodic** — ADP export · PTO reconciliation · Sheet health · Recent punches · Recent
  activity. Collapsed by default.

Hero and analytics stay where they are. Nothing moves to another tab; nothing is removed.

### The rule that makes collapsing safe
**A collapsed panel still shows its state in the summary row** — a count pill, a status dot, or an
explicit "all clear". Collapse that hides a problem is worse than a long scroll. PTO
reconciliation collapsed with "1 mismatch · P. Raman" is fine; collapsed with just its title is a
regression.

### Free win
The periodic panels already load independently with contained failure. Collapsed, they can
**lazy-load on first open** — fewer round-trips on entry, contained-failure pattern unchanged.
Only each panel's *summary state* needs to arrive with the initial payload.

Accessibility: real `<button aria-expanded aria-controls>` disclosures, not `<div onclick>`. The
Coverage day rows in this same file already do it correctly (A1 + A11) — follow them.

---

# 4 · Coverage — chrome and controls only

The heatmap is good and stays. Do not rebuild:
- the days × hours grid with business-hours bounds from `businessStartHour` / `businessEndHour`
- the three-band legend and the `ok` / `risk` / `low` / `none` thresholds
- the understaffed risk callout, including `covDayRisks_`'s run-grouping of consecutive hours and
  the "— who" suffix naming reps on PTO
- click-a-day rep breakdown, with the `startsPrevDay` marker for cross-timezone shifts
- the `ptoUnavailable` alert

Two changes only:
1. `.view-title-row` → `.app-bar` (breadcrumb `Tools › Manage › Coverage`, separator `›` per
   §3a). The descriptive sentence under the old title moves into the note line above the grid,
   where the manager-tz and business-hours explanation already lives.
2. Bare date inputs + Load → `mtDateRange_` with the **forward** preset set.

---

# 5 · Token hygiene & cleanup
- Delete `.punct-table`, `.punct-card`, `.punct-card-h`, `.punct-bar` and the `.punct-preset` /
  `.punct-presets` rules once the shared table and date control land. Verify unreferenced first —
  the same discipline the CN Stats cleanup used.
- Delete the three dead locals (§2a #7).
- `.cov-controls` is reused by Punctuality via a copied class name — a Coverage-named class
  styling a Punctuality control. Once both use `mtDateRange_`, it goes.

# 6 · Accessibility
- Sortable headers: `aria-sort` on the active column, and the header must be a real button (the
  L-15 `mtRenderTable_` onclick note applies).
- The day-by-day strip carries meaning in colour alone — give the container an `aria-label`
  summarising it ("22 days: 11 on time, 6 late, 3 late over 15 minutes, 2 time off") and each
  block a `title` with its date and minutes.
- Expanded rows: `aria-expanded` on the row trigger, `aria-controls` on the detail row.
- Trend chips carry the word (Worsening / Flat / Improving), never just a colour or an arrow.
- Keep the real viewport breakpoints. Below 720px the roster table drops Shift start, Avg late and
  Lunch, keeping Rep / On-time / Worst; the expanded row stacks to one column.

# 7 · Visual coverage
Add to `test/visual/shoot.mjs`: `punctuality-light-wide`, `punctuality-dark-wide`,
`punctuality-expanded-light-wide`, `manage-time-light-wide`, and `coverage-dark-wide` (Coverage
has a light scenario but the dark-parity round didn't include it). The fixture in
`test/visual/mock.js` needs `getPunctualityReport` extended with the new `days[]` shape — and a
rep with a holiday and a PTO day in range, or the two states that are easiest to get wrong will
never be shot.
