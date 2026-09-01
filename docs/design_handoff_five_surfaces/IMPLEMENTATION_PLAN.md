# Implementation Plan — Five-Surface Design Update (Coaching · Manage · QA · Admin · Time Clock)

> Companion to `HANDOFF_INDEX.md` in this folder (the operator's index doc, saved verbatim).
> This is the **authoritative implementation plan**: it reconciles the handoff index against
> the codebase as of `eed83e3` (main, 2026-09-01 — PR #221 merged), records every conflict with
> its resolution (**the codebase always wins**), collects the operator decisions in one list,
> and sequences the work into per-surface commits with the pins and scenarios each owes.
>
> **Status:** planned, not implemented. Authored 2026-09-01 on branch
> `claude/ums-team-tools-design-r8ar3o`.
>
> **Scope of the source material:** only the INDEX was supplied. The five detail docs
> (`COACHING_HANDOFF.md`, `MANAGE_HANDOFF.md`, `QA_HANDOFF.md`, `ADMIN_HANDOFF.md`,
> `TIME_CLOCK_HANDOFF.md`) and the five `.dc.html` mocks are not in the repo, in git history, or
> in the operator's Drive. Everything below that reaches detail level (field lists, tier
> thresholds, panel order, email recipients) is therefore a **proposal derived from the index
> plus the code**, and is marked ⚠ PROPOSED where the detail doc would normally decide it.

---

## 0 · How this plan was built

Every claim in the index was checked against the live tree, not the snapshot the index was
reviewed against (`df931a9f` is behind `eed83e3` by the A4 follow-on, Workstream B, the Admin
mobile round, the A4 regression fix, the note line-break fix, and a sync-docs pass). Method:
each surface's partial, its server region, its Node/DOM/editor pins, its visual fixtures and its
shoot scenarios were read in full; the cross-cutting claims were grepped across `web-app/`.

Verification counts at the time of writing (the index's Part 6d numbers, corrected):

| Harness | Index says | Actual |
|---|---|---|
| Visual matrix | 67 | **67** (`test/visual/shoot.mjs`) |
| Pure harness (`run.js`) | 712 | **713** (NLBR landed after the index was written) |
| DOM harness | 101 | **101** |
| `runAllTests()` | 305 | **305** |

## 1 · Guiding rules (unchanged from the prior redesign plans, restated because they bind here)

- **Codebase wins.** Every disagreement is logged in § 2 with the resolution and the evidence.
- **No new framework, colour, font or icon.** Tokens from `styles_design_tokens.html`, glyphs
  from `icon()`, markup as `area.innerHTML` string templates, `esc()` on every server string.
- **Every pin that a deliberate contract change breaks is REWRITTEN in place, never deleted**
  (the accrual-round bookkeeping). Every new pin is bite-checked: commit first, mutate, confirm
  red, revert with an inverse edit — never `git checkout` on a dirty file (the batch-5B lesson).
- **A removed selector/function is BANNED from returning** (INV-184), not just deleted.
- **Failed ≠ absent** (INV-175 / INV-187): every new block routes load failures through
  `errorStateHtml_` and carries an `unavailable` flag where it aggregates.
- **A2**: any new grid that stacks in compact also gets a real viewport breakpoint; measure
  `scrollWidth` at 390 px after every stacking change.
- **A14**: every new `ensureOverlay` passes `label` or `labelledBy`; no nested `role="dialog"`.
- **INV-136**: a new admin/manager endpoint must land in the INV-136 list + the omnibus gate
  test in the same commit (the F7/F9 nets fail otherwise).

---

## 2 · Conflict register

Legend — **Doc**: what the index says · **Code**: what the tree does · **Build**: what this plan
does. ⚠ = needs an operator decision (collected again in § 3).

### 2.X · Cross-cutting

**X1 — The detail docs and mocks are missing.** Doc: five detail handoffs + five mocks. Code/repo:
none present; `docs/design_handoff_team_tools_redesign_update/Time Clock Redesign.dc.html` is the
2026-08-18 *previous* Time Clock mock, not this bundle's. Build: this plan proposes the detail
level and marks each such choice ⚠ PROPOSED. ⚠ **Ask:** drop the ten files into
`docs/design_handoff_five_surfaces/` so the per-surface specs can be re-read against them before
each surface is built; several ⚠ items below collapse to "do what the doc says" once they exist.

**X2 — C1 chrome.** Doc: Coaching, QA ×3 and Admin on the old `.view-title-row`; Manage Time's
breadcrumb stale. Code: confirmed exactly — `train/script_coaching.html:64`, `qa/script_qa.html:234,
1021, 1116`, `cn/script_callnotes.html:8813` (the Admin title reads **"Call Notes · Admin"** via
`cnViewTitleBar_`), and `tc/script_manager.html:674` reads `Time Clock › Manager Dashboard`. Build:
all six onto `.app-bar` + `.breadcrumb` + `.display-title` (the Intake vocabulary at
`intake/script_intake.html:678`). Compact hides `.app-bar` via `styles.html:2474`, which is the
same behaviour the current `COMPACT_MODE` guards give the title rows.

**X3 — C2 `mtRenderTable_` adoption.** Doc: four hand-rolled tables incl. the Coaching
per-employee table. Code: **the Coaching table already uses `mtRenderTable_`** (V-11, cycle 12;
`train/script_coaching.html:292`, pinned at `run.js:5449`) — that item is stale. Remaining:
Punctuality `.punct-table` (7 cols, `tc/script_manager.html:2029`), the QA recordings list (cards,
`qa/script_qa.html:278`), and the Admin storage inventory (flex rows, `cn/script_callnotes.html:9880`).
Build: three migrations, not four; the storage inventory uses the component's `detailRow`/`rowId`
hooks (cycle-14 Phase 2) for the per-rep problems + tz-fix hint that do not fit a cell.

**X4 — C3 "written and never shown".** Doc: Coaching `noteId` + `VoidReason`, QA `skipped`, "Admin's
void reason". Code: `noteId` rides the rep AND manager payloads (`coachRowToObj_`, Code.js:25727)
and neither card renders it — confirmed. `VoidReason` is **never read into the object** and voided
rows are filtered out of both reads (Code.js:25813, :25872); worse, the client's void handler sends
an EMPTY reason (`voidCoaching(coachId, '')`, `script_coaching.html:372`), so nothing can write the
column from the UI at all. QA `skipped`: confirmed — in `QA_STATUS_LABELS` + CSS, settable only by
direct RPC. "Admin's void reason": **not reproducible** — the only other void reason is EmpDocs',
which IS rendered (`train/script_empdocs.html:264`). Build: Coaching noteId + VoidReason (§ 2.K5/K6),
QA skipped (§ 2.Q2); the fourth item is dropped as unverifiable and noted.

**X5 — C4 token hygiene.** Doc: `var(--accent-deep, …)` on `.tr-complete-btn`. Code: **false for the
app** — `--accent-deep` appears only in `form_public.html` (its own private token block) and
`.tr-complete-btn` (`train/script_training.html:19`) reads `var(--success-deep)`, which is defined.
`var(--danger-soft, #fce5e5)`: not found anywhere. What IS there: `var(--warning-deep, #b86e00)` ×2
(training), `var(--success-deep, var(--accent))` ×1 (kb), five same-class fallbacks in `cn`, and a
census of 30-odd redundant fallbacks across the partials (`--text-sm`, `--radius-pill`, `--mono`,
`--display`, `--shadow-*`, `--radius*`). `.qa-kbd-hint` on `--muted-3`: confirmed. Build: one sweep
removing every fallback on a token the tokens partial defines, EXCEPT the deliberate inline-animation
defaults `var(--d, 0s)` / `var(--len …)` / `var(--circ …)` (the INV-128 note says those defaults are
load-bearing). `.qa-kbd-hint` → `--muted-2`. Also found: `.tr-complete-btn` has no `:hover`/
`:focus-visible` rule at all (only `.primary` does) — add one while in the file.

**X6 — C5 tab strip.** Doc: "must scroll inside itself". Code: **already does**
(`styles_design_tokens.html:535-547`, 2026-08-11 — `max-width:100%; overflow-x:auto`). The index's
6a row crediting Workstream B is a misattribution: B fixed an inline grid on the manager analytics
pair, unrelated to the strip. What remains is 6c-2, the *affordance*. Build: an edge-fade
(`mask-image` linear gradient, applied only while the strip actually overflows via a tiny
`scrollWidth > clientWidth` check on render/resize) — cheap, no layout change, works for six tabs.
⚠ The honest alternatives (two-row wrap under 480 px, or an overflow menu) are the operator's call.

**X7 — C6 failed ≠ absent.** Doc: rule binds the three new blocks. Code: INV-175/187 already
codify it. Found while checking: four Admin loaders still degrade to inline muted text instead of
`errorStateHtml_` — deploy readiness (`:9089`), health (`:9947`), storage (`:9806`), sheets
(`:9732`). Build: route all four through `errorStateHtml_` in the Admin pass (the A12 scan passes
today only because their failure lines lack the scanned keywords).

**X8 — C7 fixture rule.** Doc: populated + empty variant per fixture. Code: `getMyCoaching` is
`{items: []}` (rep view never shot); `getPtoReconciliation`, `managerGetPendingAdjustments`,
`getTimesheetDoctor` are empty (three Manage cards never shot); **`getCoveragePlan` has no fixture
and Coverage has no scenario at all**; Coaching has no mobile/compact/error scenario; QA has no dark
scenario and the detail is wide-only. Build: implement the rule as a **query hook**, not doubled
fixture objects — `?fixture=empty` (the `?pendingadj=1` / `?failrpc=` precedent) makes `mock.js`
return the empty shape for the named RPCs; each new block ships populated + `?fixture=empty` +
`?failrpc=` scenarios. Add the rule to CLAUDE.md's Visual Audit Stage and pin the new blocks by
name (a fully derived "every fixture has an empty variant" scan is not expressible — fixtures are
objects, not call sites).

**X9 — C8 park-and-consume pattern.** Doc: name it once in CLAUDE.md. Code: four instances today —
`COACH_PREFILL` (`cn:7701` → `coaching:50,199`), `CLK_NAV_HINT` (`clock:1482` → `cn:8465`),
`mgrPendingRepDrill`, `TO_PENDING_DAY_OPEN`. Build: one Key Design Decision entry ("Cross-view
hints are parked on `window`, consumed-and-nulled on the target's enter, never persisted") with the
list; the new QA→Coaching and Punctuality→Coaching hand-offs reuse `COACH_PREFILL`.

**X10 — Part 3 timestamp discipline.** Doc: `parseTimestampMs_` is T-only; new date fields need a
round-trip pin. Code: coaching already reads via `coachParseTs_` (both forms) and the `coachOverdue`
detector round-trips it (Code.js:6759). Build: every new coaching stamp is written in the same
space form and read via `coachParseTs_`; the H-1 tripwire (`run.js:898`) is extended to the new
readers. `FollowUpAt` is a DATE, not a timestamp — see K10.

**X11 — 6b is itself stale.** Doc: "`getMyQaReviews` has no audio path by design … deferred to v3".
Code: `getMyQaReviewAudioChunk` **exists** (2026-08-28 follow-on; Code.js `getMyQaReviewAudioChunk`,
QA-16 pin) — employee-gated, doubly scoped (SharedMs + Agent name) BEFORE Drive, delegating to the
shared `qaAudioChunkFor_` boundary, with the waveform painter (QA-17). Build: **nothing** — do not
widen the scope, do not re-add a reviewer-gated player to the agent view (QA-14 bans it).

**X12 — 6d counts.** See the table in § 0. The System tab's scenario obligation is real and the
VIS-ADMIN pin matches on the tuple SHAPE (`{tool:'manage', tab:'callNotesAdmin'}, MOBILE` + a
`cnAdminTab_('system')` post hook), not on the scenario name.

### 2.K · Coaching

**K1 — Composer → drawer.** Code: composer is inline in Team mode (`script_coaching.html:216-230`),
re-rendered blank on success. Build: `ensureOverlay('coach-compose-overlay', {label:'Log coaching',
onClose})` with a side-anchored `.modal.drawer` variant (new shared CSS in `styles.html`, reusing
the KB drawer's slide motion), opened by one primary button; on success close + refresh. The
`COACH_PREFILL` consumer opens the drawer prefilled instead of prefilling the inline form.

**K2 — Reply on acknowledge.** Code: `acknowledgeCoaching(coachId)` takes ONE arg; no reply anywhere.
Build: optional 2nd arg `response` (trim, cap `COACH_TEXT_MAX`-class 2000, HR store only), written to
the new trailing **`RepResponse`** column inside the same lock; audit row stays `coachId=…; ackAt=…`
(content-free, INV-134). Rep card gets an optional textarea beside Acknowledge; manager card renders
the response. `test_coaching_createAckVoidFlowAndScoping` gains the reply step.

**K3 — Praise stops requiring acknowledgement.** Code: praise rows are `status='open'` like any
other, `counts.open++` includes them (Code.js:25879), the rep card renders Acknowledge on praise, and
`coachAnalytics_` counts praise in the ack-rate denominator. Build (no migration — praise rows keep
`status='open'`): the rep card hides Acknowledge for praise; `counts.open` and the "N item(s) to
acknowledge" banner exclude praise; praise renders in a **Recognition** feed on both views. ⚠
`coachAnalytics_.ackRatePct` — exclude praise from the denominator (a rate over items that require
an answer) or keep it? Recommend exclude; the pure-function pin at `run.js:826` is rewritten in
place either way.

**K4 — `Major` → `Moderate` (display only).** Code: `coachSevChip_` capitalises the raw key
(`:32`), the select carries the long labels (`:209-214`), and the digest/brief emails print
`item.severity` raw. Build: one `COACH_SEVERITY_LABELS` map on the server (used by the three
emails) mirrored on the client (a MIRROR_INDEX entry); the F17 pin (`run.js:1780`) scrapes option
VALUES, so it stays green. Stored enum untouched.

**K5 — `noteId` link back to the Call Note.** Code: the payload carries `noteId`, but a drill-through
needs the note's DATE (`managerGetCallNotes(repId, date)` for managers; the rep's History is
date-keyed) and the Coaching row stores none. Build: ⚠ PROPOSED — a 4th trailing column
**`NoteDate`** (`COACH_HEADERS` 14 → 18, not 17), populated from the prefill (`cnMgrCoachOnNote_`
already holds the note object; extend `COACH_PREFILL` with `noteDate`). Manager card → Team Notes
Per-Rep drill (the `cnAuditDrillToNote_` pattern: `CN_STATE.mgrRepView` + `mgrPendingRepDrill`);
rep card → own History at that date. Legacy rows (id, no date) render the id as inert text with
no link. The index says "3 columns" — this is a deliberate fourth, flagged.

**K6 — `VoidReason` surfaces.** Code: see X4 — never read, never written from the UI, voided rows
never returned. Build: (a) `coachVoid_` prompts via `uiPrompt` for an optional reason (the EmpDocs
`voidDoc` pattern); (b) `coachRowToObj_` reads `voidReason`; (c) `getCoachingDashboard` returns
voided items in a separate `voided[]` (team-scoped like `items`, capped 50, newest first) so a
"Voided" filter chip on the Team view shows the reason. ⚠ Reps continue to NOT see voided items
(the void dialog promises "hidden from the employee") — confirm.

**K7 — Per-rep signal board.** Doc: severity mix / last-coached / a five-tier verdict. Code: nothing
comparable; `analytics.perRep` has total/acked/ackRate/median/overdue. Build: a pure, Node-pinned
`coachRepSignal_(repItems, nowMs, opts)` returning `{tier, last30: {praise, minor, moderate,
critical}, lastCoachedAt, openNonPraise, overdue}`, computed server-side into `analytics.perRep` so
the digest and the board cannot disagree. ⚠ PROPOSED tiers (the detail doc would set these):
Priority = any open critical OR any overdue-unacked OR ≥2 moderate in 30 d; Watch = any open
non-praise OR 1 moderate in 30 d; Steady = coaching in 30 d, all acknowledged; Clear = no coaching
in 30 d but history exists; **No signal** = no items ever — and "No signal" must render as *unknown*,
never as a green Clear (INV-186/187).

**K8 — Critical-severity notification email.** Doc: PHI-free email on critical. Code: the REP already
gets a severity-toned email on create (`notifyRepOfCoaching_`, no narrative/TRX/noteId); nothing
goes to anyone else. Build: on `severity === 'critical'`, a second branded (danger-tone) email
deferred through the existing `notifyAfter` closure (M-7), body = employee name + severity + a
`safeWebAppUrl_('coaching')` CTA, nothing else. ⚠ Recipients: the employee's column-M manager
(when ≠ creator) + `MANAGER_EMAILS`? — the detail doc decides; recommend column-M manager + the
creator's own copy, not the whole manager list.

**K9 — 6e business-hours arithmetic.** Code: `coachUnackedOverdue_` and `coachAnalytics_` are pure
ms arithmetic over a 7-calendar-day cutoff (Code.js:25639, :25671), Node-pinned; the digest
(`coachUnackedAll_`) and the dashboard both use them — so they already agree with each other, but on
calendar time. `businessMinutesBetween_` is Apps-Script-bound (`Utilities`, `getUsHolidays_`), so it
cannot be called from the pure functions directly. Build: inject — `coachAnalytics_(items, nowMs,
reminderDays, {bizMinutes})` and `coachUnackedOverdue_(items, nowMs, days, {bizMinutes})` with a
wall-clock default so the Node pins keep running; production passes `businessMinutesBetween_`.
"Overdue" becomes `bizMinutes(created, now) ≥ reminderDays × businessDayMinutes` (the day length
from `businessHours_()`, 9 h today), and the median becomes business days. ⚠ Confirm the unit:
`COACHING_UNACK_REMINDER_DAYS = 7` re-read as **7 business days**. Every surface that shows the
figure carries the S93 note ("counts business hours only") — the rule that an unexplained drop
reads as a bug. Rewrite the two pure pins in place; add a BIZ-style wiring pin (both consumers
route through the injected helper; a raw `86400000` cutoff banned from returning).

**K10 — `FollowUpAt`.** Doc: a new column feeding a digest. Code: nothing. Build: ⚠ PROPOSED — a
`yyyy-MM-dd` DATE set by the manager in the drawer ("Follow up by"), stored in the trailing
column, surfaced on the card + board, and folded into `sendTrainingOverdueDigest`'s coaching section
when `today (manager tz) > FollowUpAt` on a still-open item. It is a calendar deadline, so it does
NOT go through business-hours arithmetic (6e over-generalises here — only elapsed AGE is a
business-hours quantity). Read via `coachParseTs_`-style date guard; pinned by a round-trip test.

**K11 — `NudgedAt`.** Doc: a column, no behaviour described. Build: ⚠ PROPOSED — a manager
"Nudge" button on an un-acked item → new `nudgeCoaching(coachId)` (manager-gated, team-scoped via
`coachCanManagerSee_`, locked, rate-limited to once per 24 h via the stamp, mail post-lock, audit
`CoachingNudge` id-only). Joins the INV-136-adjacent manager list + the omnibus gate test.

**K12 — Fixtures/scenarios.** Code: `getMyCoaching` empty; the manager fixture has no
overdue/major/critical item, so the Overdue pill, `coach-row-overdue` tint and the warn/destructive
chips have never rendered on camera. Build: populate both fixtures (incl. a critical, an overdue,
a voided-with-reason, a praise), add `coaching-mine-light-wide`, `coaching-light-mobile`,
`coaching-light-compact`, `coaching-error-light-wide` (`?failrpc=getCoachingDashboard`) and the
`?fixture=empty` variants.

### 2.M · Manage

**M1 — Punctuality thresholds.** Doc: 90/75 vs Metrics' 80/50. Code: 90/75 confirmed (`toneCol`
at `tc/script_manager.html:2004`); Metrics' green band starts at `CDR_ALERT_THRESHOLD` (85, legacy
80) and there is no 50 anywhere. Build: keep 90/75 as Punctuality's own constants passed into the
shared tone helper; the "80/50" attribution is just wrong and needs no action.

**M2 — `days[]` per rep.** Code: the server builds per-day `{in, lunch}` minutes (`:14196-14200`)
and DROPS them; the emitted `days` key is already the day COUNT consumed by the client + fixture.
Build: an ADDITIVE `dayDetail: [{date, inMin, lateMin, lunchMin, lunchLateMin}]` per rep (never
rename `days`); the client's expandable per-rep detail (via `mtRenderTable_`'s `detailRow`) renders
it. Also: the doc's "existing team scoping unchanged" — Punctuality has NO team scoping (it walks
the whole roster through `empRosterEmail_`); noted, no change.

**M3 — Outliers at the top.** Build: a pure `punctOutliers_(reps, thresholds)` (below 75 %, or
avgLate > 15 m) rendered as named callouts above the table; facts only, no verdict beyond the
existing bands.

**M4 — `mtDateRange_` shared control.** Code: no such helper. Metrics owns the mature vocabulary
(`.toolbar-tabs` group + `aria-pressed` presets + a `Custom…` chip with the `[hidden]`-safe row,
pinned incl. the `.m-preset-chip` ban); Punctuality has `.punct-preset` (no pressed state, no
aria); Coverage has **no presets at all**. Build: `mtDateRange_(opts)` in `script_core.html`
rendering the Metrics vocabulary (presets + Custom disclosure + from/to inputs + Load), adopted by
Punctuality (7D/30D/QTR) and Coverage (Next 7 / Next 14 — the server caps at 14). ⚠ Metrics
migration onto the helper is deferred: its `#2` pin references the module-local builders and the
gain is zero for reps — recommend leaving Metrics as-is this pass and noting it as a follow-on.

**M5 — Manage Time reorder + collapsible periodic panels.** Code: 13 blocks in fixed order
(`renderManagerView` template `:671-736`), four lazy slots, NO order pin, NO disclosure anywhere in
the view; `mgrSwrRenderBlocked_` blocks a refresh render on checked bulk boxes or an open overlay
(`:129-133`); three lazy cards render NOTHING when clean. Build: ⚠ PROPOSED order — Pending Punch
Adjustments → Pending Time Off → Missed Clock-Outs → PTO Drift + Timesheet Doctor (findings only)
→ Live Status → Team Punches → then collapsible periodic panels: Punch Activity/Time Off (analytics
pair), Recent Punches, Recent Activity, Export. Rules: collapsed state lives in
`MGR_STATE.collapsed` and is re-applied after every re-render (the view rebuilds `innerHTML`); a
collapsed panel's summary row always shows its count pill + tone; a lazy card that is clean
renders "0 findings" in its summary rather than nothing; **collapse is NOT a third
`mgrSwrRenderBlocked_` condition** — a refresh that lands while a panel is collapsed re-renders it
collapsed. Persist collapse per browser under a new `umsManageCollapsed` key (→ the CLAUDE.md
"Sixteen keys" entry becomes seventeen). Breadcrumb → `Manage › Manage Time`.

**M6 — Coverage chrome + controls only.** Build: app-bar + `mtDateRange_`; heatmap, risk panel,
`ptoUnavailable` banner and `_covSeq` untouched. Add the missing `getCoveragePlan` fixture (V-14
already pins the coverage numbers' formula — the fixture must satisfy it) and `coverage-light-wide`
+ `coverage-light-mobile` scenarios; drop `coverage` from the `VISUAL-GAP-TABS` marker.

**M7 — SWR + panels.** Per 6g, `enterManagerView` lives in `script_core.html:1499` and paints from
`mgrData` before refetching; the reorder edits `renderManagerView` only and keeps
`loadManagerDashboard`'s state-write-before-guard order (the PERF pin at `run.js:14053`).

### 2.Q · QA

**Q1 — Comment timestamp.** Code: confirmed — `atSec = audio.currentTime` at submit
(`qa/script_qa.html:832`). Build: on textarea focus, PIN `QA_STATE.commentAt = audio.currentTime`
and pause; the button reads "Comment at m:ss" from the pin (a re-pin chip lets the reviewer
update it); submit sends the pin and resumes playback; blur without text clears the pin. Server
validation unchanged. DOM test (the harness can drive focus/submit on a stubbed `<audio>`).

**Q2 — `skipped` unreachable.** Code: confirmed. Build: a "Skip" action on the detail head (and a
`Skipped` filter chip), whitelisted already server-side; fixture gains a skipped recording.

**Q3 — My Reviews player.** Doc: "with a real player". Code: **built** (Play + scoped audio +
waveform). Build: nothing except making the static comment chips seek (`qaSeekTo_`) now that a
player is present — the detail's chips already do.

**Q4 — Coverage-first Recordings.** Code: `getQaStats` derives agents from the recordings index only
(a roster rep with zero recordings has no row), carries no last-reviewed date (`StatusMs` exists in
the sheet, never surfaced), and the only roster walk in QA is the `agentOptions` datalist. Build: ⚠
PROPOSED (the index defers to `QA_HANDOFF.md §5`'s "4 fields") — `getQaStats` per-agent rows gain
`lastReviewedMs` (max `StatusMs` where done), `lastRecordingMs`, `recordingsInWindow`,
`reviewedInWindow` (window = 30 d, a `windowDays` arg), and a roster-joined `coverage[]` listing
EVERY roster rep (name-matched case-insensitively — the same rule `getMyQaReviews` uses) with
those counts, zero rows included. The "who still needs sampling" table sorts by
`reviewedInWindow` asc then `lastReviewedMs` asc, and a rep with no recordings reads "no recordings
in Drive" (a fact), never "0 reviewed" alone. `qaSamplePick_` is unchanged (it cannot sample what
is not indexed).

**Q5 — Recordings list → sortable table.** Build: `mtRenderTable_` (sortable name/date/status/
assignee/comments; actions column with Open/Claim/Release/Assign) inside `.m-table-wrap`; the five
filter chips + `qaVisibleItems_` unchanged; `animateListSwap_` re-targeted to rows.

**Q6 — Detail: two panes, pinned player.** Code: single column, no `position: sticky` anywhere.
Build: `.qa-det-grid { grid-template-columns: minmax(0,1fr) 380px }` with the player card
`position: sticky; top: …` in the right pane, scorecard + comments in the left; stacks at ≤ 900 px
(A2) and in compact; add `qa-detail-light-mobile` + `qa-queue-dark-wide` scenarios (QA has no dark
scenario today).

**Q7 — Review → coaching hand-off.** Code: `createCoaching` is manager-gated; QA members who are not
managers cannot log coaching; the recording's agent is a free-text NAME with no empId. Build: the
button renders only when `isManager`; `getQaQueue`/detail payload gains `agentEmpId` (server
name→id resolution, `''` when unmatched); click parks `COACH_PREFILL = {empId, patientTRX: '',
whatHappened: <timestamped comments as text>, qaFileId}` and enters `develop/coaching`. No new
Coaching column for the QA link this pass (the comments text carries the file name).

**Q8 — `.qa-kbd-hint`** → `--muted-2` (X5).

### 2.A · Admin

**A1 — "Renamed Admin".** Code: the registry tab is already `Admin` under `Manage`; only the
in-view heading says "Call Notes · Admin". Build: the app-bar reads `Manage › Admin`.

**A2 — System tab.** Code: five `tab()` calls; health + storage panels live inside the Overview
"System details" disclosure and load unconditionally on enter. Build: `tab('system', 'System')`
sixth; the disclosure is removed; both panels move into the new pane; loading stays EAGER on enter
(the Overview status cards need the same payloads, and eager load satisfies M-8 by construction —
no lazy hole to open). Ships with `['admin-system-light-mobile', {tool:'manage',
tab:'callNotesAdmin'}, MOBILE, 'light', '', "cnAdminTab_('system')"]` or VIS-ADMIN fails.

**A3 — `cnHealthFindings_()` refactor.** Code: `cnRenderHealthPanel_` (`:10092-10286`) interleaves
tone rules and markup; the three status cards derive tone separately (`cnSetSysFromHealth_`, and the
storage tone inline at `:9812`) from a SUBSET of the payload (they ignore clientErrors, witnessFails,
selfTest, detectors, intakeCatalog). Build: a pure `cnHealthFindings_(health, storage)` →
`[{key, group: 'automation'|'cdr'|'storage', tone: 'fail'|'warn'|'info'|'ok', title, detail, fix,
link}]`; the renderer groups fail → warn → info, and folds `ok` into one "N checks passing"
disclosure; `cnSetSysCard_` derives each card's tone as the max over its group. **INV-186 governs
the mapping**: anything that is non-zero on a healthy deployment is `info`, never `warn` — the queue
inventory's "per-queue attribution NOT available" verdict (permanently true here), `unmatchedAgents`,
`rosterWithNoCdr`, a never-run self-test, and "no heartbeat yet" on a fresh deploy. `witnessFails`
gets an explicit `ok` line (today a zero renders nothing). Node-pin the pure function with both an
all-clear payload (exactly zero non-ok findings) and a degraded one; a source pin that the cards call
`cnHealthFindings_` and no longer compute tone inline.

**A4 — Storage inventory → `mtRenderTable_`** with `detailRow` for per-rep problems + the tz fix
hint; the muted "not set" pill rule for no-fallback stores (INV-122/196) is preserved as a cell tone.

**A5 — Tab-strip affordance** — see X6. Applies to the same `.toolbar-tabs` rule, so it ships in
the Admin commit.

### 2.T · Time Clock

**T1 — "Needs you".** Doc: five sources, two shown. Code: the extras row shows Training (or Spanish
for members) + Requests; pending adjustments already render as a chip above the punch buttons;
nothing surfaces coaching, QA, docs or missing notes on the dashboard. Every candidate source is a
separate uncached full-tab read except `getDeptRequests` (90 s) and `getMyMetrics` (5 min). Build:
`getMyPendingTasks()` — rep-callable, ONE RPC composing counts: training to-do/overdue
(`getMyTraining`), coaching open non-praise (`getMyCoaching`), docs `needsAction` (`getMyDocs`),
QA shared-unseen (`getMyQaReviews` — employee-gated and scope-safe even while the tool is hidden),
dept requests open + incoming (`getDeptRequests`), missing call notes (re-using `getMyMetrics`'s
answered − noteCount for yesterday's workday), scheduled calls due today. Each source is
try/catch'd into `{count, unavailable}` (INV-187 — a failed source renders "couldn't check", never
0), the whole result is CacheService-cached per rep for `PENDING_TASKS_CACHE_TTL = 120` s and never
cached when any source is unavailable (INV-129), and the loader carries the `COMPACT_MODE` gate.
Spanish pending stays on the extras card (it is a live Gmail read — not for an aggregate). ⚠ The
exact five-source set and their order are the detail doc's; this is the superset the code can
supply cheaply.

**T2 — Denser clock card.** Doc: drop the rotating world-clock strip + the shooting star; keep the
gradient + night phases. Code: region strip = `CLK_REGION_ZONES`/`clkBuildRegionFmts_`/
`clkRotationZones_`/`clkUpdateRegions_` + `.clk-region*` CSS + the compact hide (`:165`), all
UNPINNED; the shooting star is REQUIRED by two pins (`L-35 night-sky runtime gating`, `run.js:4309`,
and the INV-184 photo/moon pin at `:8640` which asserts `clkShootMaybe_`/`clk-shoot` present).
Build: remove both; rewrite those two pins in place (the INV-184 pin flips to BAN `clk-shoot`,
`clkShootMaybe_`, `CLK_REGION_ZONES`, `clkUpdateRegions_`, `.clk-region` from returning); the 1 Hz
tick loses two calls. The tz `<select>` stays. Measured saving will be smaller than the doc's
"~70px" (the strip is one 11 px line + 6 px margin; the star costs no height) — the punch-button
fold claim must be MEASURED at 1440×900 before/after, not asserted.

**T3 — Greeting rotator holds during an active shift.** Code: hover-hold only (`CLK_GREET_ROT.hover`).
Build: `clkGreetHeld_()` = shift state working/lunch (from `computeShiftStats_`) → tick returns
early; a `.greet-held` chip ("Held · on shift") renders beside the slide with `aria-live="off"`;
hover-hold + reduced-motion untouched. Consequence worth stating: What's-new slides never rotate
into view during a shift — the NEW accent stays on the sidebar star, which remains the other entry.

**T4 — Duplicate readouts.** Code: hours worked rendered twice (shift-strip header `hoursReadout`
`:416-424` and the status-sentence slide `:1242`); scheduled breaks rendered four ways (B1/Lunch/B2
chip row, next-break chip, ribbon bands, ribbon legend), lunch duration twice. Build: the status
sentence keeps state + end-of-shift countdown and drops the worked/lunch string (one numeric
readout, in the header); the `clkBreakScheduleHtml_` chip row goes (ribbon bands + next-break chip
carry the schedule) with `.clk-brk-chip` banned per INV-184. ⚠ Which break readout survives is the
detail doc's call — this is the recommendation. The V-4/FO-3 header pins and `remindersTick_` are
untouched.

**T5 — 6f night phases.** Code: `clkSkyFor_` pinned (`run.js:4256`); the visual harness pins the
clock at 09:00 UTC = 14:30 IST (mid-afternoon). Build: nothing — keep the phases; the dark board is
already a working-hours phase in the matrix.

**T6 — Placement + compact.** The Needs-you block leads `#dash-main` above `#dash-cards`; in compact
`#dash-cards` is hidden and the loader is gated, so Needs-you is hidden in the pop-out too (it is a
punch surface). Fixture: populated `getMyPendingTasks` + `?fixture=empty` + `?failrpc=` scenarios.

---

## 3 · Operator decisions (collected)

Ordered by how much they change the build. Everything else in this plan proceeds under the stated
recommendation.

1. **X1** Supply the five detail docs + five mocks (drop into this folder). Until then the ⚠ PROPOSED
   items below are built as proposed.
2. **6c-1** Agents see their own QA reviews? (one registry line + QA-14 rewrite). Changes whether
   the QA source of "Needs you" ever shows a rep anything.
3. **6c-2 / X6** Tab-strip affordance: edge-fade (recommended, cheap) vs two-row wrap vs overflow
   menu.
4. **K8** Critical-email recipients (recommend: the employee's column-M manager + creator copy).
5. **K9** `COACHING_UNACK_REMINDER_DAYS` re-read as 7 **business** days (recommend yes).
6. **K3** Ack-rate denominator excludes praise (recommend yes).
7. **K5** A 4th column `NoteDate` so the noteId link can actually open the note (recommend yes;
   without it the "link" is inert text).
8. **K6** Voided items stay hidden from reps (recommend yes).
9. **K7** Signal-board tier thresholds (proposed values in § 2.K7).
10. **K10/K11** `FollowUpAt` as a manager-set date + `NudgedAt` as a rate-limited Nudge button
    (proposed semantics; the index names the columns only).
11. **M4** Metrics stays on its own range control this pass (recommend defer).
12. **M5** Manage Time urgency order + persisted collapse (proposed order in § 2.M5).
13. **Q4** The QA coverage fields (proposed set in § 2.Q4).
14. **T1** The "Needs you" source set + order (proposed superset in § 2.T1).
15. **T4** Which break readout survives (recommend: keep ribbon bands + next-break chip).

---

## 4 · Build order and commit sequencing

One PR per surface (five), each self-contained and independently deployable, in this order:

### PR 1 — Cross-cutting sweep (no behaviour change)
- X5 token sweep (+ `.tr-complete-btn` hover/focus); Q8.
- X6 `.toolbar-tabs` edge-fade affordance (`styles_design_tokens.html`) — or the operator's pick.
- X8 `?fixture=empty` hook in `mock.js`; X9 CLAUDE.md pattern entry.
- Pins: a derived "no redundant fallback on a defined token" scan (comment-stripped, INV-188;
  exempts the inline animation params by name); the affordance pin measures overflow at 390 px
  in the visual harness, not by reading CSS.

### PR 2 — Admin
- A1 chrome, A2 System tab + eager load, A3 `cnHealthFindings_` + card derivation, A4 storage
  table, X7 `errorStateHtml_` on the four loaders.
- Scenarios: `admin-system-light-mobile` (VIS-ADMIN), `admin-system-light-wide`, `admin-allclear-…`
  via `?fixture=empty` on the health/storage RPCs (C7 — the all-clear path has never been shot),
  `admin-system-error-…` via `?failrpc=getAutomationHealth`.
- Pins: `cnHealthFindings_` behavioural (all-clear → zero non-ok findings; INV-186 classifications
  → `info`); cards-derive-from-findings source pin; the batch-7 fixture-key derivation still holds.
- CLAUDE.md: Admin KDD paragraph (System tab, findings-first), INV-186 amendment naming the
  info-class list.

### PR 3 — Manage
- M1–M3 Punctuality (server `dayDetail` additive + client rebuild on `mtRenderTable_` +
  outliers), M4 `mtDateRange_` (Punctuality + Coverage), M5 Manage Time reorder + collapsible
  panels + breadcrumb, M6 Coverage chrome + fixture + scenarios.
- Scenarios: `coverage-light-wide`, `coverage-light-mobile`, `punctuality-light-mobile`,
  `manage-light-wide` re-shot; `VISUAL-GAP-TABS` loses `coverage`.
- Pins: `getPunctualityReport` `dayDetail` shape derived from the return block (INV-185);
  `punctOutliers_` behavioural; a Manage Time ORDER pin (there is none today) + "collapse is not a
  refresh blocker" (the `mgrSwrRenderBlocked_` body still has exactly two conditions);
  `mtDateRange_` a11y (pressed state + `[hidden]` companion) ; the `.punct-preset` /
  `.punct-table` classes banned from returning.
- CLAUDE.md: localStorage key count 16 → 17 (`umsManageCollapsed`); the Manage KDD.

### PR 4 — Coaching
- Server: `COACH_HEADERS` 14 → 18 (`RepResponse`, `FollowUpAt`, `NudgedAt`, `NoteDate`; header
  self-heals via `getOrCreateEmpDocSheet_`), K2 ack reply, K6 void reason + `voided[]`, K7
  `coachRepSignal_`, K8 critical email, K9 injected business-hours, K10/K11, K4 label map.
- Client: K1 drawer, signal board, Recognition feed, K5 links, chrome (X2).
- Editor suite: extend `test_coaching_createAckVoidFlowAndScoping` (reply, follow-up, nudge,
  voided list); omnibus gate gains `nudgeCoaching`; INV-136 list unchanged (manager tier).
- Scenarios: K12's set.
- Pins: rewrite `coachUnackedOverdue_`/`coachAnalytics_` in place; new `coachRepSignal_`
  behavioural; the label-map MIRROR_INDEX entry; H-1 tripwire extended to the new stamp readers;
  a DOM test for the drawer (open/prefill/close idempotent — the first coaching DOM test ever).
- CLAUDE.md: INV-134 amendment (new columns, reply, praise semantics, business-day overdue),
  the Coaching project bullet, S-scenario for the reply/nudge flow.

### PR 5 — QA
- Q1 pin-on-focus (DOM-tested), Q2 Skip, Q4 coverage fields + roster join, Q5 table, Q6 panes,
  Q7 hand-off, X2 chrome.
- Scenarios: `qa-detail-light-mobile`, `qa-queue-dark-wide`, a skipped recording in the fixture,
  `qa-queue-empty` via `?fixture=empty`.
- Pins: QA-8 rewritten for the new stats fields; QA-7's onclick scan covers the new buttons
  automatically; QA-14 unchanged (the agent view is untouched); a new QA-19 for the coverage
  join (a roster rep with zero recordings IS listed; name match is case-insensitive) and QA-20
  for the comment pin (submit sends the PINNED time, not `currentTime`).
- CLAUDE.md: INV-196 amendment (skipped reachable, coverage rows, the manager-only hand-off).

### PR 6 — Time Clock
- T1 `getMyPendingTasks` + the Needs-you block, T2 card density, T3 held rotator, T4 readouts.
- Scenarios: `clock-light-wide` re-shot + measured fold; `clock-needsyou-empty` and
  `clock-needsyou-error` variants.
- Pins: rewrite the two shooting-star pins (`:4309`, `:8640`) into bans; `getMyPendingTasks`
  contract (per-source `unavailable`, no cache on a degraded round, `COMPACT_MODE` gate, employee
  gate returning the bare `{error}` read shape); the held-chip behavioural (DOM); the
  single-hours-readout source pin.
- CLAUDE.md: Dashboard KDD amendment; INV-190 unchanged.

Each PR ends with `npm test` green (pure + DOM), a full `node build.mjs && node shoot.mjs` with
every affected scenario eyeballed and `overflowPx` 0, and — for PRs 3–6 — the editor-only tests
listed for the operator's post-deploy `runAllTests()` (expected count rises with each new case).

---

## 5 · Verified-accurate (clean to build to the index)

- C1 chrome inventory (six views), the stale Manage Time breadcrumb.
- QA comment timestamp bug; QA `skipped` unreachable; QA detail is single-column with nothing
  sticky; QA recordings list is cards.
- Admin: status cards derive tone independently of the panel (`cnSetSysFromHealth_` + inline
  storage tone), the System-details disclosure holds only the two panels, `okLine` renders a full
  row per passing check, no server work needed.
- Coaching: no reply on ack; noteId + VoidReason never rendered; the composer is inline;
  `getMyCoaching` fixture empty; Part 3's `notifyAfter` post-lock rule already exists in
  `createCoaching`.
- Punctuality server discards per-day data it already computes; Manage Time has no disclosures
  and a two-condition SWR guard; Coverage heatmap is worth keeping as-is.
- Time Clock: hours rendered twice; breaks rendered ≥3 times; rotator is hover-hold only; the
  world-clock strip is unpinned; the star field/shooting star ARE pinned (so removal = rewrite).
- Part 5 "not changing" list — every guard named is present and stays.

## 6 · Stale or wrong in the index (summary of § 2 for the record)

| Index claim | Reality | Effect on plan |
|---|---|---|
| Coaching per-employee table is hand-rolled (C2) | Already `mtRenderTable_` (V-11) | Dropped |
| `.tr-complete-btn` uses undefined `--accent-deep` (C4) | Uses `--success-deep`; `--accent-deep` only in `form_public.html` | Dropped; real sweep list in X5 |
| `var(--danger-soft, #fce5e5)` exists (C4) | Not found | Dropped |
| `.toolbar-tabs` must scroll inside itself (C5) | Built 2026-08-11 | Only the affordance remains |
| C5's Manage Time half shipped via Workstream B (6a) | B fixed an inline grid, not the strip | Note only |
| "Admin's void reason" never shown (C3) | EmpDocs renders it; nothing else matches | Dropped as unverifiable |
| `getMyQaReviews` has no audio path (6b) | `getMyQaReviewAudioChunk` shipped 2026-08-28, scoped | Build nothing; do not widen |
| Punctuality "team scoping unchanged" (Part 3) | No team scoping exists | Note only |
| Coaching needs 3 columns (Part 3) | 4 recommended (`NoteDate`) so the link can open a note | ⚠ K5 |
| Metrics thresholds 80/50 (§ 1.2) | 85 (`CDR_ALERT_THRESHOLD`), legacy 80; no 50 | Note only |
| Pure harness 712 (6d) | 713 | Note only |
| Clock card saves ~70 px (§ 1.5) | Strip is ~17 px; star costs no height | Measure, don't assert |
