# Implementation Plan — Five-Surface Design Update (Coaching · Manage · QA · Admin · Time Clock)

> **Authoritative implementation plan** for the operator's five-surface design handoff. It
> reconciles the handoff bundle against the codebase, records every conflict with its resolution
> (**the codebase always wins** on behaviour; the detail docs win on design where the code is
> silent), collects the operator decisions in one list, and sequences the work into per-surface
> PRs with the pins, fixtures and scenarios each owes.
>
> **Status:** planned, not implemented. Revision 2 — 2026-09-02, branch
> `claude/ums-team-tools-design-r8ar3o`, tree at `cf8f8e5` (main `c9643bc` merged in).
>
> **Source material (now complete).** Revision 1 (2026-09-01, commit `2b0dd61`) was written from
> the INDEX alone and marked every detail-level choice ⚠ PROPOSED. On 2026-09-02 the operator
> dropped the supporting bundle at **`docs/` root** (not this folder — the paths below are as they
> landed): `docs/HANDOFF.md` (the index; byte-identical to `HANDOFF_INDEX.md` here),
> `docs/COACHING_HANDOFF.md`, `docs/MANAGE_HANDOFF.md`, `docs/QA_HANDOFF.md`,
> `docs/ADMIN_HANDOFF.md`, `docs/TIME_CLOCK_HANDOFF.md`, five `docs/*.dc.html` mocks,
> `docs/github.md` (the sync record against tree `df931a9f`) and `docs/support.js` (mock runtime —
> **non-deployed**, never `include()` it). `docs/INTAKE_EMAILS_HANDOFF.md` + its mock also landed;
> they are a SEPARATE handoff and are parked (§ 8). Every ⚠ PROPOSED item from revision 1 has been
> re-read against its detail doc; the ones the doc settled are now stated as settled, and the
> places where a detail doc disagrees with the code are new register entries.

---

## 0 · How this plan was built

Every claim in the bundle was checked against the live tree, not the snapshot the docs were
reviewed against (`df931a9f` is behind `cf8f8e5` by the A4 follow-on, Workstream B, the Admin
mobile round, the A4 regression fix, the note line-break fix and a sync-docs pass). Each surface's
partial, its server region, its Node/DOM/editor pins, its visual fixtures and its shoot scenarios
were read in full; the cross-cutting claims were grepped across `web-app/`; the five detail docs
and `github.md` were read in full.

Verification counts (the index's Part 6d numbers, corrected):

| Harness | Index says | Actual |
|---|---|---|
| Visual matrix | 67 | **67** (`test/visual/shoot.mjs`) |
| Pure harness (`run.js`) | 712 | **713** (NLBR landed after the index was written) |
| DOM harness | 101 | **101** |
| `runAllTests()` | 305 | **305** |

## 1 · Guiding rules (restated because they bind here)

- **Codebase wins on behaviour.** A detail doc that describes today's code wrongly does not change
  what the code does; the register says what the doc assumed, what is true, and what is built.
  Where the code is SILENT (a new field, a layout, a threshold), the detail doc decides.
- **No new framework, colour, font or icon.** Tokens from `styles_design_tokens.html`, glyphs
  from `icon()`, markup as `area.innerHTML` string templates, `esc()` on every server string.
- **A pin a deliberate contract change breaks is REWRITTEN in place, never deleted.** Every new
  pin is bite-checked: commit first, mutate, confirm red, revert with an inverse edit — never
  `git checkout` on a dirty file (the batch-5B lesson).
- **A removed selector/function is BANNED from returning** (INV-184), not just deleted.
- **Failed ≠ absent** (INV-175/187): every new block routes load failures through
  `errorStateHtml_` and carries an `unavailable` flag where it aggregates.
- **A2**: a new grid that stacks in compact also gets a real viewport breakpoint; measure
  `scrollWidth` at 390 px after every stacking change.
- **A14**: every new `ensureOverlay` passes `label` or `labelledBy`; no nested `role="dialog"`.
- **INV-136 / INV-171**: a new gated endpoint lands in the INV-136 list (admin tier) or the
  manager-tier prose + the omnibus gate test in the same commit, or the F7/F9 nets fail.
- **INV-179**: any new "every X owes Y" rule is a derived scan, not a hand list.

---

## 2 · Conflict register

Legend — **Doc**: what the bundle says · **Code**: what the tree does · **Build**: what this plan
does. ⚠ = needs an operator decision (collected in § 3). **Settled** = revision 1 proposed it and
the detail doc now decides it.

### 2.X · Cross-cutting

**X1 — Source material.** Resolved: the bundle is in the repo at `docs/` root (see the header).
`HANDOFF_INDEX.md` in this folder duplicates `docs/HANDOFF.md`; keep it (it is what revision 1 was
written against) and treat `docs/*.md` as the specs to build against.

**X2 — Chrome (C1) and the breadcrumb depth.** Doc: every surface's app-bar breadcrumb is THREE
levels, `Tools › Manage › Punctuality`, `Tools › Training › Coaching`, `Tools › Manage › Admin`
(Manage §3a says "matching the existing instance in this file"). Code: the existing instances are
TWO levels — `Intake › <form>` (`intake/script_intake.html:679`), `Time Clock › Manager Dashboard`
(`tc/script_manager.html:674`), `Time Clock › …` (`tc/script_timeoff.html:336`). There is no
"Tools" level in the registry and no Tools landing to crumb back to; the sidebar already IS that
level. Build: two-level crumbs everywhere (`Manage › Manage Time`, `Manage › Punctuality`,
`Manage › Coverage`, `Manage › Admin`, `Training › Coaching`, `QA › Recordings` / `Stats` /
`My Reviews`), the current crumb = the registry tab label. Separator `›` (the Manage doc's own
choice, and what the three existing instances use). ⚠ Minor — say so if you want the `Tools`
level kept.

**X3 — C2 `mtRenderTable_` adoption.** Code: the Coaching per-employee table ALREADY uses the
component (V-11; `train/script_coaching.html:292`, pinned `run.js:5449`) — the index item is stale;
the Coaching doc §2c agrees (it changes columns, not the component). Remaining: Punctuality
`.punct-table`, the QA recordings list (cards), the Admin storage inventory (flex rows). Build:
three migrations; the storage table and the Punctuality table use `detailRow`/`rowId`.

**X4 — C3 "written and never shown".** Code confirmed: coaching `noteId` rides both payloads
unrendered; `VoidReason` is never read into the object, voided rows are filtered out of both
reads, AND the client's void handler sends an EMPTY reason (`voidCoaching(coachId, '')`) — so the
column cannot be written from the UI at all; QA `skipped` is settable only by direct RPC. "Admin's
void reason": not reproducible (EmpDocs renders its own) — dropped. Build: K5/K6 and Q2.

**X5 — C4 token hygiene.** Doc (index AND Coaching §7 AND Admin §6 repeat it): `.tr-complete-btn`
uses undefined `--accent-deep`; `var(--danger-soft, #fce5e5)` exists. Code: **false** —
`--accent-deep` appears only in `form_public.html`'s private block and `.tr-complete-btn` reads the
defined `--success-deep`; the `--danger-soft` literal is not in the tree. What IS there: ~30
redundant fallbacks on defined tokens (`--warning-deep`, `--text-sm`, `--radius-pill`, `--mono`,
`--display`, `--shadow-*`), `.qa-kbd-hint` on the decoration-only `--muted-3`, `.coach-banner`
setting border and background to the same `--warn-soft`, and no `:hover`/`:focus-visible` on
`.tr-complete-btn`. Build: one sweep removing every fallback on a defined token EXCEPT the
inline-animation defaults (`--d`, `--len`, `--circ` — INV-128 says those are load-bearing);
`.qa-kbd-hint` → `--muted-2`; the banner + button fixes; a derived comment-stripped "no redundant
fallback" scan (INV-188).

**X6 — C5 tab-strip affordance.** Code: `.toolbar-tabs` already scrolls inside itself
(`styles_design_tokens.html:535-547`, 2026-08-11; the index's Workstream-B credit is a
misattribution — B fixed an inline grid on the analytics pair). Doc (Admin §7): "Honest fix: a
two-row wrap or an overflow menu." Revision 1 proposed an edge-fade; the detail doc argues against
exactly that. Build: **two-row wrap below 480 px** (`flex-wrap: wrap` inside a media query on the
shared rule — no JS, no measurement dance, six Admin tabs wrap 4 + 2 at 390 px; verified by the
existing `overflowPx` check). ⚠ Overflow menu instead? It costs a disclosure + focus management on
a shared component; recommend the wrap.

**X7 — C6 failed ≠ absent.** Four Admin loaders still degrade to inline muted text instead of
`errorStateHtml_` (deploy readiness `cn:9089`, health `:9947`, storage `:9806`, sheets `:9732`).
Build: route all four through `errorStateHtml_` in the Admin PR; the Admin doc §5 names the same
rule.

**X8 — C7 populated + empty fixture rule.** Doc: the Time Clock doc calls this "the third time this
gap has appeared" and asks for a fixture-coverage RULE; Coaching §8 names `coaching-empty-light-wide`;
Admin §8 names `admin-system-allclear-light-wide`. Build (settled): a `?fixture=empty` query hook in
`mock.js` (the `?failrpc=` precedent) that returns each named RPC's empty shape; every new block
ships populated + `?fixture=empty` + `?failrpc=` scenarios; CLAUDE.md's Visual Audit Stage gains the
rule and a by-name pin lists the blocks (a fully derived scan is not expressible — fixtures are
objects, not call sites).

**X9 — C8 park-and-consume.** Four instances (`COACH_PREFILL`, `CLK_NAV_HINT`,
`mgrPendingRepDrill`, `TO_PENDING_DAY_OPEN`); QA §4e and Manage §2f both reuse `COACH_PREFILL`.
Build: one CLAUDE.md Key Design Decision naming the pattern + the list.

**X10 — Timestamp discipline.** Coaching §7: new stamps must round-trip through `coachParseTs_`
(the H-1 lesson). Build: every new coaching stamp written in the space form, read via
`coachParseTs_`; the H-1 tripwire (`run.js:898`) extended to the new readers. `FollowUpAt` is a
DATE (K10).

**X11 — 6b is stale; the QA doc knows it, the Time Clock doc does not.** Code:
`getMyQaReviewAudioChunk` exists (2026-08-28), employee-gated and doubly scoped; QA §6 correctly
builds on it (transport parity). But the Time Clock doc's Needs-you lists "QA review to
acknowledge (the My Reviews ack in the QA handoff)" — and QA §6 says the opposite: "there is no
ack and no reply here." Build: see T1.

**X12 — Dead registry key in the Coaching doc.** Doc §2d: the note link "routes
`enterTool('callnotes', …)`". Code: the TOOL key is `callNotes`; `enterTool` returns silently on an
unknown key (`script_core.html:1040`), so that line is a no-op — the cycle-9 H-1 class the doc
itself warns about two lines later. Build: the link routes via the existing drill mechanisms (K5);
the `enterTool` TOOL-key tripwire will catch the literal if anyone types it.

**X13 — Counts.** See § 0. VIS-ADMIN matches the scenario TUPLE (`{tool:'manage',
tab:'callNotesAdmin'}, MOBILE` + `cnAdminTab_('system')`), not the name.

### 2.K · Coaching

**K1 — Composer → drawer; kind split from severity (settled by §3).** A 2-up **Kind** control
(Coaching / Praise); severity chips Minor / Moderate / Critical only in Coaching mode; Praise mode
relabels "What happened" → "What they did", hides the coaching-point field, and states that praise
needs no acknowledgement. **Stored enum unchanged**: `kind === 'praise' ? 'praise' : severityChip`
— no migration, `COACH_SEVERITIES` untouched, the F17 option-VALUES pin (`run.js:1780`) stays
green. Also in the drawer: an optional "Revisit on" date (→ `FollowUpAt`) and a linked-call-note
chip when prefilled. Build: `ensureOverlay('coach-compose-overlay', {label: 'Log coaching',
onClose})`, side-anchored `.modal.drawer` (new shared CSS, KB-drawer slide), `role="dialog"`
`aria-modal`, focus trap + Escape via the shell; the `COACH_PREFILL` consumer opens it prefilled.

**K2 — Reply on acknowledge (settled by §4d).** `acknowledgeCoaching(coachId, response)` — second
arg optional, 2000-char cap, written to trailing `RepResponse` ONLY on the open→acked transition
(the server stays idempotent — a second ack is a no-op and never overwrites the reply); audit row
stays `coachId=…; ackAt=…` (INV-134, content-free). Renders as a quoted block on BOTH views.
Editor test gains the reply step.

**K3 — Praise stops requiring acknowledgement (settled by §4b/§4c).** Doc offers two mechanisms
("auto-acknowledged at create, OR exclude from `overdueUnacked` + the digest — either is fine").
Code: praise rows are `status='open'`, `counts.open++` includes them, the rep card renders
Acknowledge on praise, `coachAnalytics_` counts praise in the ack-rate denominator. Build: the
EXCLUDE form (no write at create, no status migration, a voided-praise row reads the same as
today): rep card hides Acknowledge on praise; `counts.open`, the "N to acknowledge" banner,
`coachUnackedOverdue_` and the digest exclude praise; a **Recognition** feed above the coaching
list on both views (compact `--accent-soft` cards, two per row, no pill, no action row). Acked
cards at `opacity: .86`. ⚠ `coachAnalytics_.ackRatePct` denominator excludes praise — the doc is
silent; recommend exclude (a rate over items that require an answer). The pure pin (`run.js:826`)
is rewritten in place either way.

**K4 — `Major` → `Moderate`, display only (settled by §3).** One label map
`{praise:'Praise', minor:'Minor', major:'Moderate', critical:'Critical'}` on the server (the three
emails print `item.severity` raw today) mirrored on the client — a MIRROR_INDEX entry. The stored
enum, `coachSevTone_`, the `bySeverity` analytics keys and the fixture are untouched.

**K5 — The note link, and how many columns.** Doc §2d: render the linked call note as a mono chip,
click opens the note; Part 3 says "three new columns". Code: a drill-through needs the note's DATE
(`managerGetCallNotes(repId, date)` is date-keyed; so is the rep's History) and the row stores
only the id; the doc's `enterTool('callnotes', …)` is a dead key (X12). Build: a trailing
**`NoteDate`** column populated from the prefill (`cnMgrCoachOnNote_` holds the note object — extend
`COACH_PREFILL` with `noteDate`); manager chip → Team Notes Per-Rep drill (`CN_STATE.mgrRepView` +
`mgrPendingRepDrill`, the `cnAuditDrillToNote_` pattern); rep chip → own History at that date;
legacy rows render the id as inert text. With QA §4e's `reviewId` (K13) the count is **five**
trailing columns, `COACH_HEADERS` 14 → 19: `RepResponse`, `FollowUpAt`, `NudgedAt`, `NoteDate`,
`QaFileId`. ⚠ Confirm the two extra columns (the doc's three cannot make either link work).

**K6 — `VoidReason`, filters, search (settled by §2c/§2e).** Filter strip `All N · Needs ack N ·
Overdue N · Praise N · Voided N` + a search field over narrative + TRX; voided items are EXCLUDED
from All and only appear under Voided, as a dashed one-line card carrying the reason. Persist the
filter per browser as **`umsCoachingFilter`** (the `umsCoachingMode` pattern). Build: (a)
`coachVoid_` prompts via `uiPrompt` for an optional reason (the EmpDocs `voidDoc` pattern);
(b) `coachRowToObj_` reads `voidReason`; (c) `getCoachingDashboard` returns `voided[]`
(team-scoped, capped 50, newest first). Reps continue NOT to see voided items (the doc is silent;
the void dialog promises "hidden from the employee"). ⚠ confirm. localStorage key count 16 → 17.

**K7 — Signal board (settled by §2c — supersedes revision 1's server-side proposal).** Derived
CLIENT-side from the team-scoped `items[]`, nothing stored. Weighted 30-day score
`critical ×4 + moderate ×2 + minor ×1 − praise ×1 + overdue ×2`; tiers: **Priority** score ≥ 6 or
any critical in the window (`destructive`), **Watch** 3–5 (`warn`), **Steady** 1–2 (neutral),
**Clear** ≤ 0 (`accent`), **No signal** nothing logged in 21 days (`info`). Columns: Employee ·
Total · Mix (stacked 8 px hairline bar with an `aria-label` naming the counts) · Last · Overdue ·
Signal; tier rule as `inset 3px 0 0` on `td:first-child` via `opts.rowClass`, REPLACING
`.coach-row-overdue` (INV-184 ban). Below 720 px the board drops Mix and Last (A2 breakpoint).
Build: a pure `coachRepSignal_(items, nowMs)` in the partial, Node-pinned on every tier boundary,
including that No signal renders `info`, never the green Clear (INV-186/187 — the doc's own
reasoning). The manager summary strip (§2b: Awaiting ack / Overdue with surnames capped at two /
Recognition share) derives from the same payload; keep the `!a.total` fallback.

**K8 — Critical notification email — the doc's premise is wrong.** Doc §5: "Logging a Critical
item mails the rep. Nothing else does — Minor and Moderate rely on the in-app badge … that
scarcity is what makes the email land"; the footer "explains that minor and moderate items don't
email". Code: `notifyRepOfCoaching_` (Code.js:25948) already emails the rep on EVERY create,
severity-toned, branded, narrative-free, deferred past the lock via `notifyAfter`. Two honest
resolutions: (a) keep the per-create mail and UPGRADE the critical one to the doc's shape, or
(b) make the doc's scarcity true by removing non-critical rep mail. (b) removes an existing
notification — a product change, not a design one. Build under (a) unless told otherwise: on
`severity === 'critical'` the create mail becomes the doc's email (subject "Action needed:
coaching logged for you — please acknowledge", the `#c13030`/`#fce5e5`/`#8a1f1f` banner triple,
the kv column with the 1-on-1 row only when `FollowUpAt` is set, a plain-text twin), still
post-lock (M-7), still narrative/TRX/noteId-free; `mailed: false` on the response when the send
threw so the toast can say so; **voiding a critical item sends a short retraction** to the same
recipient; the "minor and moderate don't email" footer line is DROPPED (it would be false under
(a)). Recipient = the rep only (the doc names no cc). Editor test: non-critical → the ordinary
mail; critical → the upgraded subject; a throwing send still returns success + `mailed:false`. ⚠
(a) or (b).

**K9 — Business-hours overdue (settled by §9 addendum; unit still open).** `coachUnackedOverdue_`
and `coachAnalytics_` are pure ms arithmetic over 7 calendar days; `businessMinutesBetween_` is
Apps-Script-bound. Build: inject — both take `{bizMinutes}` with a wall-clock default so the Node
pins keep running; production passes `businessMinutesBetween_`; overdue = `bizMinutes(created,
now) ≥ reminderDays × businessDayMinutes`; median in business days; every surface showing the
figure carries the S93 note. Pins rewritten in place + a BIZ-style wiring pin (raw `86400000`
banned). ⚠ `COACHING_UNACK_REMINDER_DAYS = 7` re-read as 7 **business** days.

**K10 — `FollowUpAt` (settled by §2e/§7).** A calendar DATE set from the drawer or the card's
**Revisit** button (`setCoachingFollowUp(coachId, dateOrNull)` — manager-gated, team-scoped,
locked, audit `CoachingFollowUp` id-only); shown on the card; folded into the accountability digest
when `today (manager tz) > FollowUpAt` on a still-open item. Not business-hours arithmetic (§9
over-generalises — only elapsed AGE is). Round-trip pin.

**K11 — `NudgedAt` (settled by §2e).** A **Nudge** button on unacknowledged items →
`nudgeCoaching(coachId)` (manager-gated, team-scoped, locked, once per item per day via the stamp,
disabled + tooltip when already nudged today, mail post-lock, audit `CoachingNudge` id-only).
`setCoachingFollowUp` + `nudgeCoaching` join the manager-tier prose + the omnibus gate test.

**K12 — Fixtures / scenarios (settled by §8).** `coaching-drawer-light-wide` (`post` hook opens
the drawer), `coaching-empty-light-wide` (`?fixture=empty`), plus the rep view
(`coaching-mine-light-wide` — `getMyCoaching` is `{items: []}` today so the rep view has NEVER been
shot), `coaching-light-mobile`, `coaching-error-light-wide` (`?failrpc=getCoachingDashboard`).
Manager fixture gains a critical, an overdue, a voided-with-reason, a praise and a replied item.

**K13 — `reviewId` from QA (new; QA §4e).** The QA hand-off asks to "store a `reviewId` on the
coaching record mirroring `noteId`, and render it". Build: the fifth trailing column **`QaFileId`**
(the recording's Drive file id — the QA index's own key), rendered as a chip on the manager card
that opens the QA detail (`qaQueue` + a parked `{fileId}` hint, the X9 pattern); reps do not see
it (the recording is reviewer-scoped unless shared — INV-196). Counted in K5.

### 2.M · Manage

**M1 — Punctuality thresholds (settled).** 90/75 confirmed (`toneCol`, `tc/script_manager.html:2004`);
the doc's "Metrics 80/50" is wrong (85 via `CDR_ALERT_THRESHOLD`, legacy 80, no 50) but harmless.
Doc asks to "reuse `mPctClass_`'s mechanism, pass 90/75". Code: `mPctClass_(p, thr)` hardcodes its
LOWER band at 50 (`metrics:1137`). Build: a shared `mtPctTone_(p, hi, lo)` in `script_core.html`;
`mPctClass_` becomes `mtPctTone_(p, thr, 50)` (byte-identical output, the `#2` pin stays green);
Punctuality calls it with 90/75 and `toneCol` goes. The doc's row 7 names three dead locals
(`isoLocal` ×2, `iso` in `punctPreset_`) — verify unreferenced, delete, ban.

**M2 — Per-day detail (settled shape; name conflict).** Doc §2e: per-rep `days[]` of
`{date, schedStartMin, actualMin, lateMin, state: ontime|late|off|holiday, ptoType}` +
`prevOnTimePct` + four weekly buckets; "return `days[]` only for reps the manager can see — the
existing team scoping, unchanged". Code: the server builds per-day `{in, lunch}` and DROPS them
(`Code.js:14196-14200`); the emitted **`days` key is already the day COUNT** consumed by the client
and the fixture; Punctuality has NO team scoping (it walks the whole roster via `empRosterEmail_`).
Build: the doc's array under the ADDITIVE name **`dayDetail`** (never rename `days`);
`prevOnTimePct` + `weekly[4]` additive; holidays from `getUsHolidays_` (the Coverage source); the
range is capped server-side at 92 days (the QTR preset × roster); no scoping change. INV-185: the
fixture shape is derived from the return block.

**M3 — "Worth a conversation" (settled by §2b).** A `.panel[data-tone="destructive"]` above the
table listing reps below 75 % (and, per revision 1, avg late > 15 m) — facts, no verdict beyond the
existing bands; a pure `punctOutliers_` Node-pinned.

**M4 — `mtDateRange_` (settled by §1 — Metrics IS the first consumer).** Doc: "Extract the Metrics
control as `mtDateRange_`"; Punctuality takes the BACKWARD presets, Coverage the FORWARD ones (the
server caps at 14). Revision 1 recommended leaving Metrics on its local builders; the doc settles
it the other way and nothing in the code conflicts — only the `#2` metrics-control pin references
the module-local builders, so it is REWRITTEN in place to assert the shared helper (the honest
bookkeeping). The helper renders the Metrics vocabulary exactly (pressed presets, `Custom…` with
`aria-controls`, the `[hidden]`-safe row, the `.m-preset-chip` ban carried over); Coverage's
`_covSeq` and Punctuality's `_punctSeq` wrap it unchanged.

**M5 — Manage Time: order settled, persistence dropped, lazy-load refused.** Doc §3b: hero +
analytics stay; **Needs you today** = Pending time off (`inset --warn` + "oldest N days") · Missed
clock-outs (`inset --destructive`) · Adjust queue · Live status; **Periodic** (collapsed by default)
= ADP export · PTO reconciliation · Sheet health · Recent punches · Recent activity; H1 = the
registry tab label "Manage Time". Two conflicts: (1) the doc's "free win — collapsed panels can
lazy-load on first open; only each panel's summary state needs to arrive with the initial payload"
contradicts its own rule "a collapsed panel still shows its state" for PTO reconciliation and the
sheet doctor, whose summary comes ONLY from their own RPCs (`getPtoReconciliation`,
`getTimesheetDoctor` — nothing on `getManagerDashboard` carries it). Build: those two keep loading
on enter (they are cheap, bounded, contained-failure reads); the truly periodic panels (export,
recent punches, recent activity) render from `mgrData` and cost no RPC, so lazy-loading buys
nothing. (2) The doc's list predates the **Team Punches** card (2026-08-31) — it joins Needs-you
after Live status. Collapse state lives in `MGR_STATE.collapsed` and is re-applied after every
re-render (the view rebuilds `innerHTML`); NOT persisted (the doc says "collapsed by default" and
nothing more — revision 1's `umsManageCollapsed` key is dropped); a clean lazy card renders "all
clear" in its summary instead of nothing; collapse is NOT a third `mgrSwrRenderBlocked_` condition
(a refresh landing on a collapsed panel re-renders it collapsed). A Manage Time ORDER pin (none
exists today).

**M6 — Coverage (settled by §4).** App-bar + `mtDateRange_` (Next 7 / Next 14); heatmap, risk
panel, `ptoUnavailable` banner, `_covSeq` untouched. Doc §5 says Coverage "has a light scenario";
it has **none** and `getCoveragePlan` has no fixture. Build: fixture (V-14 pins the formula — the
fixture must satisfy it) + `coverage-light-wide` + `coverage-light-mobile`; `coverage` leaves the
`VISUAL-GAP-TABS` marker.

**M7 — SWR.** `enterManagerView` paints from `mgrData` before refetching; the reorder edits
`renderManagerView` only and keeps `loadManagerDashboard`'s state-write-before-guard order (the
PERF pin, `run.js:14053`).

**M8 — Retirements (settled by §5).** Delete `.punct-table`, `.punct-card`, `.punct-card-h`,
`.punct-bar`, `.punct-preset(s)` and the Metrics-local preset CSS once the shared pieces land;
verify unreferenced first; INV-184 ban.

### 2.Q · QA

**Q1 — Comment timestamp (settled by §4d — pause and pin).** The first `input` event in the
textarea pauses playback and pins `QA_STATE.pinnedAtSec`; the button reads "Comment at m:ss";
submit sends the PIN, never live `currentTime`; Post/Discard clear the pin and resume; a manual
resume while typing KEEPS the pin. DOM test on a stubbed `<audio>` (QA-20).

**Q2 — `skipped` reachable (settled by §3a).** A **Skip** action in the detail header (the endpoint
whitelists it already), a `Skipped N` filter chip (all chips gain counts), and a new trailing
**`SkipReason`** column on the recordings index shown on the row (the `VoidReason` pairing).

**Q3 — My Reviews (settled by §6 — read-only, transport parity).** No ack, no reply ("Coaching
remains the place a response is recorded"). Build: extract `qaRenderTransport_(audioEl, opts)` so
the agent player gets the reviewer's transport/speed/keyboard chrome; the score-chip tone mapping
(`≤2` destructive · `3` neutral · `≥4` accent) becomes ONE helper both views call; comment chips
seek. Nothing on the server (the scoped endpoint + waveform painter already exist).

**Q4 — Coverage first (settled by §2, with three code-side decisions).** (a) **Audit period**: a
discrete `.toolbar-tabs` control (`Aug 2026 · Q3 2026 · Q2 2026`), NOT `mtDateRange_`; persisted
as **`umsQaPeriod`** (localStorage 17 → 18); default = current period. A recording's period is
DERIVED at read from `DriveCreatedMs`, which the index already stores (`f.getDateCreated()` at
sync) — the doc's `AuditPeriod` column is unnecessary and would freeze a value the operator may
want to re-bucket; no column. (b) **Per-employee target**: the doc's summary math needs one and
never says where it comes from (the mock hardcodes 3). Build: `CONFIG.QA_AUDIT_TARGET_PER_PERIOD =
3`, Script-Property-overridable later. (c) **Coverage block**: `getQaQueue` gains `coverage[]` —
EVERY roster rep (name-matched case-insensitively, the `getMyQaReviews` rule), zero rows
included — with `sampled, target, avg, prevAvg, lastReviewedMs, exemptUntil`; the summary strip
(Coverage n/target with "N employees short" from the real gap, Team avg, …) is SUMMED from that
table client-side, never stored; tiers via one `qaCoverageTier_(row)`: Short·low (under target AND
avg < 3.5, `destructive`), Short (`warn`), Not started (`info`, distinct from Short), Covered
(`accent`), Exempt. (d) **Exemption** (§2e): earned = avg ≥ 4.5 over two consecutive periods with
no criterion < 4; GRANTED by a manager, never automatic; expires at period end; excluded from the
denominator (0/0). Build: a `QaExemptions` tab (empName, period, grantedBy, ms) + `qaSetExemption`
(MANAGER-gated — a QA member marks eligibility, a manager decides; joins the omnibus) and a
`qaExemptEligible_` pure fn. (e) **"Sample the gaps for me"**: same `qaSampleRecordings`, relabelled
— and its `qaSamplePick_` load should read the SAME coverage math (target-aware: an at-target rep
is skipped) so the button does what its label says; QA-11 rewritten in place. `DurationSec`: Drive
exposes no duration, so the doc's "otherwise write back on the first successful decode" is the
path — a `qaSetRecordingDuration(fileId, sec)` write-back (QA-gated, only when blank, bounded);
files over the 25 MB decode gate never get one and the Length column reads an em dash (INV-187).
Header self-heals (`QA_RECORDINGS_HEADERS` +2: `DurationSec`, `SkipReason`); the
`qaStoreConfigured_` early-returns stay.

**Q5 — Recordings list → table (settled by §3).** `mtRenderTable_` with `Recording · Agent · Length
· Dropped · Status · Reviewer · actions`, Agent promoted with Unattributed called out, sortable
headers as real buttons with `aria-sort`; the five filter chips (+ Skipped, + counts) and
`qaVisibleItems_` unchanged; `animateListSwap_` re-targeted to rows.

**Q6 — Detail: two panes (settled by §4).** Above 1000 px: LEFT sticky = agent attribution +
player; RIGHT scrolling = scorecard, comments, coaching hand-off; single column below, player
first; status actions (Skip / Share / Mark done) move into the header. Agent match line "On the
roster · n of target sampled this period". Scenarios: `qa-detail-light-mobile`, `qa-queue-dark-wide`.

**Q7 — Coaching hand-off (settled by §4e; one code fact).** Panel at the foot of the right pane;
routes `enterTool('develop', 'coaching')` with `COACH_PREFILL = {empId, qaFileId, whatHappened}`.
Code: `createCoaching` is MANAGER-gated and the recording's agent is a free-text name — the panel
renders only for managers and only when the name resolves to a roster id (server adds
`agentEmpId`, `''` when unmatched, to the detail payload). `QaFileId` lands on the coaching row
(K13).

**Q8 — `.qa-kbd-hint` → `--muted-2`.** Part of the X5 sweep; ships in PR 1.

### 2.A · Admin

**A1 — Chrome (settled by §2).** Two-level crumb `Manage › Admin` (X2); subtitle per the doc
("System health, storage, tag taxonomy, retention and department config. Changes take effect
immediately — no redeploy.").

**A2 — System tab (settled by §3/§4).** Six panes: `Overview · System · Tags · Compliance · Config
· Sheets`; the System tab carries a findings-count badge with `aria-label="System, N findings"`;
the Overview status cards become LINKS into the System tab scrolled to their section; the
"System details" disclosure goes. System order: status cards → Needs attention → passing count →
storage inventory → queue inventory → detector liveness. Loading stays EAGER on enter (the
Overview cards need the same payloads; no M-8 lazy hole) and `adminTab === 'system'` persists in
`CN_STATE.adminTab` like the others. Ships with the VIS-ADMIN mobile tuple or CI fails.

**A3 — `cnHealthFindings_()` (settled shape; INV-186 handled inside it).** Doc §4:
`cnHealthFindings_(health, storage) → [{id, area, severity: 'ok'|'warn'|'fail', title, detail,
fix, link}]`; non-`ok` renders into Needs attention, the rest are counted; a test that every id
lands in exactly one bucket. The doc's own §4a cites INV-186 (the CDR feed can never go green). With
no `info` tier the permanently-non-empty facts (`unmatchedAgents`, `rosterWithNoCdr`, the queue
inventory's "per-queue attribution NOT available" verdict, "no heartbeat yet" on a fresh deploy, a
never-run self-test) become `ok` findings whose DETAIL carries the number as reference — never
`warn`. `witnessFails` gets an explicit `ok` line. The status cards derive tone as the max over
their area's findings (`cnSetSysFromHealth_` + the inline storage tone at `:9812` go). Pins: the
pure fn on an all-clear payload (zero non-ok) and a degraded one; a source pin that the cards no
longer compute tone inline.

**A4 — Storage inventory → `mtRenderTable_` (settled by §4c).** `Store · Class · Status ·
Timezone · Retention · link`, Script Property name under the store label, `aria-sort`,
`detailRow` for per-rep problems + the tz-fix hint; the no-fallback stores' muted "not set" stays a
FACT pill (INV-122/196). Retire `.cn-storage-row/-main/-role/-meta` (INV-184 ban).

**A5 — Scenarios (settled by §8, names reconciled).** The doc names `admin-system-light-wide`,
`-dark-wide`, `-allclear-light-wide`, `-light-mobile`. Keep the EXISTING `admin-light-wide` /
`admin-dark-wide` names (the batch-7 pin requires those literals) and ADD the four System ones;
all-clear via `?fixture=empty` on the health/storage RPCs. A2's mobile tuple satisfies VIS-ADMIN.

**A6 — a11y (settled by §7).** `aria-controls` on every disclosure, findings as a real list with
severity in words, the storage pills keep text labels, the status cards' link text names the
destination.

### 2.T · Time Clock

**T1 — "Needs you" (settled shape; two sources conflict with other docs).** Doc §2:
`getMyPendingTasks()` returns a flat sorted `[{kind, title, detail, dueIso, overdue, route}]` from
five sources; the extras row keeps Spanish + Requests and Training folds in. Conflicts: (1) "QA —
unacknowledged reviews (the My Reviews ack in the QA handoff)": QA §6 says there is NO ack, and
none exists in code — an item with no completing action is not a task (INV-187). Build: OMIT the
QA source; ⚠ or a non-task "review shared with you (14 d)" line. (2) "Requests — pending
punch-edit / PTO — today's extras card": the extras card shows DEPT requests; a rep's own pending
punch-edit already renders as the chip above the punch buttons (2026-08-31) and their pending PTO
is waiting on the MANAGER, not on them. Build: Requests = dept requests open + incoming (what the
card shows), chip unchanged. (3) Signable **docs** (`getMyDocs` `needsAction`) are absent from the
doc's five — the most literally "needs you" item in the app. ⚠ recommend adding as a sixth kind.
Contract: rep-callable, one RPC composing training / coaching (open non-praise) / notes (answered −
logged for the previous workday, reusing `getMyMetrics`'s cached result and `fileMissingCalls_`'s
`CLK_NAV_HINT` route) / dept requests / scheduled calls due today / docs; each source try/catch'd,
the envelope carrying `unavailable: [kind…]` so a failed source renders "couldn't check", never 0;
CacheService per rep `PENDING_TASKS_CACHE_TTL = 120` s, never on a degraded round (INV-129);
`COMPACT_MODE` gate on the loader (the doc's §5 rule); client SWR like `CLK_DASH` (`undefined` =
skeleton, `null` = error card); a real `<ul>` of links, count announced, overdue in words, 44 px
targets.

**T2 — Denser clock card (settled by §3a/§3b; measure the claim).** Order becomes clock card →
punch actions → shift strip. The rotating world-clock strip goes (`CLK_REGION_ZONES`,
`clkBuildRegionFmts_`, `clkRotationZones_`, `clkUpdateRegions_`, `.clk-region*` — all unpinned);
`clkShootMaybe_` goes (the static star field stays); `#clk-next-break` goes (T4); a full-bleed
**state line** arrives at the card foot — dot + On the clock / On lunch / Not in + hours — over its
own `rgba(10,13,20,.72)` scrim (the doc's §3a measurement: a literal white on the amber end is
≈2.6:1; V-2's rule needs the scrim here). Code: the shooting star is REQUIRED by two pins
(`run.js:4309` night-sky gating, `:8640` INV-184 photo/moon) — both rewritten in place into BANS
(`clk-shoot`, `clkShootMaybe_`, `CLK_REGION_ZONES`, `clkUpdateRegions_`, `.clk-region`). The tz
`<select>` stays. The greeting bar's `.dash-onclock` pill duplicates the new state line — ⚠
recommend removing it (the doc calls the pill "far from the state"; two of them is worse). The
"~70 px / punch buttons clear the fold" claim is MEASURED at 1440×900 before/after, not asserted
(the strip is ~17 px; the star costs no height; the reorder is what moves the buttons).

**T3 — Rotator (settled by §4).** In `clkGreetRotStart_`, hold on slide 0 whenever `stats.state`
is `working` or `lunch`; resume otherwise; hover-hold, `COMPACT_MODE` and reduced-motion untouched.
A `.greet-held` chip is NOT in the doc — dropped. Consequence stated: What's-new slides never
rotate into view during a shift; the sidebar star remains the entry.

**T4 — Duplicate readouts (settled with one residual).** Doc §3c: hours leave the SENTENCE, not
the strip (trim `buildStatusSentence_` to state + countdown); break chips ABSORB the next-break
chip (taken struck through, next outlined) — so the chip row STAYS and `#clk-next-break` goes
(revision 1 had it the other way; the doc wins, no code conflict). Residual: the doc's state line
(§3a) shows "hours worked on the right" AND the strip header keeps `hoursReadout` — hours twice
again, ~100 px apart, which is the doc's own finding 1. ⚠ Build: hours ONCE, on the state line
(nearest the clock — the doc's "where am-I-clocked-in belongs" reasoning); the strip header keeps
lunch total + note coverage only. Doc: "Keep `clkNextBreak_` — the shell's `remindersTick_` still
calls it." Code: `clkNextBreak_` is referenced only inside `tc/script_clock.html` (`:1803`, `:1817`);
the shell computes its own via `remindersSchedule_`. Build: keep `clkNextBreak_` because the
outlined-next chip needs it, not because the shell does. `.clk-brk-chip` survives; the V-4/FO-3
header pins are untouched.

**T5 — Night phases (settled by §6).** Keep; the visual harness's dark board is already a
working-hours phase. Nothing to build.

**T6 — Placement + compact (settled by §5).** Needs-you leads `#dash-main` above `#dash-cards`; in
compact `#dash-cards` is hidden and the loader is gated, so Needs-you is hidden in the pop-out
too. Fixture: populated `getMyPendingTasks` + `?fixture=empty` + `?failrpc=`.

---

## 3 · Operator decisions (collected)

Ordered by how much they change the build. Everything else proceeds under the stated resolution.

1. **K8** Critical email: (a) keep the per-create rep mail and upgrade the critical one (recommend)
   or (b) remove non-critical rep mail so the doc's "nothing else emails" becomes true.
2. **K5/K13** Five trailing coaching columns, not three — `NoteDate` (so the note link can open a
   note) + `QaFileId` (QA §4e's `reviewId`). Recommend yes to both.
3. **T1** Needs-you sources: OMIT QA (no ack exists — QA §6) or show a non-task "shared with you"
   line; ADD signable docs as a sixth kind (recommend yes); Requests = dept requests only.
4. **T4** Hours rendered once — on the clock card's state line, not also in the strip header
   (recommend state line).
5. **X6** Tab-strip affordance: two-row wrap (recommend) vs overflow menu — the Admin doc rejects
   the edge-fade revision 1 proposed.
6. **Q4** Per-employee audit target: `CONFIG.QA_AUDIT_TARGET_PER_PERIOD = 3` (the mock's number);
   audit period DERIVED from `DriveCreatedMs` (no `AuditPeriod` column); exemptions as a
   `QaExemptions` tab with a manager-gated grant.
7. **K9** `COACHING_UNACK_REMINDER_DAYS = 7` re-read as 7 **business** days (recommend yes).
8. **K3** Ack-rate denominator excludes praise (recommend yes).
9. **K6** Voided items stay hidden from reps (recommend yes).
10. **X2** Two-level breadcrumbs (`Manage › Admin`), matching the three existing instances, vs the
    docs' `Tools › Manage › Admin` (recommend two).
11. **T2** Remove the greeting bar's `.dash-onclock` pill once the state line exists (recommend
    yes).
12. **M5** Manage Time: PTO drift + sheet doctor keep loading on enter (their collapsed summary
    has no other source); no collapse persistence (recommend as stated).
13. **6c-1** Agents see their own QA reviews? Unchanged from revision 1 — one registry line +
    QA-14 rewrite; it decides whether a Needs-you QA line could ever mean anything.

Settled by the detail docs since revision 1 (no longer asked): K1 drawer + kind split, K2 reply,
K4 label map, K7 signal tiers, K10/K11 semantics, M2/M3/M4 (incl. Metrics adopting
`mtDateRange_`), Q1 pin-on-first-input, Q2 Skip + `SkipReason`, Q5/Q6 shapes, A2/A3/A4 shapes,
T3, T5, the X8 fixture rule.

---

## 4 · Build order and commit sequencing

One PR per surface, each independently deployable, in this order.

### PR 1 — Cross-cutting sweep (no behaviour change)
- X5 token sweep (+ `.tr-complete-btn` hover/focus, `.coach-banner`); Q8.
- X6 `.toolbar-tabs` two-row wrap ≤ 480 px (`styles_design_tokens.html`).
- X8 `?fixture=empty` hook in `mock.js`; X9 CLAUDE.md pattern entry; the Visual Audit Stage rule.
- `mtPctTone_(p, hi, lo)` + `mtDateRange_(opts)` in `script_core.html`, Metrics as the first
  consumer of both (`#2` pin rewritten in place).
- Pins: derived no-redundant-fallback scan (comment-stripped); the wrap measured by `overflowPx` in
  the visual harness; `mtDateRange_` a11y (pressed state + `[hidden]` companion + `aria-controls`).

### PR 2 — Admin
- A1 chrome, A2 System tab + eager load + badge + card links, A3 `cnHealthFindings_` + card
  derivation, A4 storage table, A6 a11y, X7 `errorStateHtml_` on the four loaders.
- Scenarios: `admin-system-light-mobile` (VIS-ADMIN), `admin-system-light-wide`,
  `admin-system-dark-wide`, `admin-system-allclear-light-wide` (`?fixture=empty`),
  `admin-system-error-light-wide` (`?failrpc=getAutomationHealth`).
- Pins: `cnHealthFindings_` behavioural (all-clear → zero non-ok; every id in exactly one bucket;
  the INV-186 set → `ok`-with-detail); cards-derive-from-findings source pin; `.cn-storage-*` ban.
- CLAUDE.md: Admin KDD (System tab, findings-first), INV-186 amendment naming the ok-with-detail set.

### PR 3 — Manage
- M1–M3 Punctuality (server `dayDetail` + `prevOnTimePct` + `weekly` additive, 92-day cap; client
  on `mtRenderTable_` + `mtPctTone_` + outliers panel), M4 `mtDateRange_` in Punctuality + Coverage,
  M5 Manage Time reorder + grouped collapse + breadcrumb, M6 Coverage chrome + fixture, M8 bans.
- Scenarios: `coverage-light-wide`, `coverage-light-mobile`, `punctuality-light-mobile`,
  `manage-light-wide` re-shot; `VISUAL-GAP-TABS` loses `coverage`.
- Pins: `dayDetail` shape derived from the return block (INV-185); `punctOutliers_` behavioural;
  Manage Time ORDER pin + "collapse is not a refresh blocker" (`mgrSwrRenderBlocked_` keeps exactly
  two conditions); `.punct-*` bans.
- CLAUDE.md: the Manage KDD.

### PR 4 — Coaching
- Server: `COACH_HEADERS` 14 → 19, K2 ack reply, K3 praise exclusion, K4 label map, K6 void reason +
  `voided[]`, K8 critical mail + retraction, K9 injected business hours, K10 `setCoachingFollowUp`,
  K11 `nudgeCoaching`, K13 `QaFileId`.
- Client: K1 drawer, K7 board + summary strip, Recognition feed, K5/K13 chips, K6 filters + search +
  `umsCoachingFilter`, chrome (X2).
- Editor suite: extend `test_coaching_createAckVoidFlowAndScoping` (reply, follow-up, nudge, voided
  list, critical mail shape); omnibus gains `setCoachingFollowUp` + `nudgeCoaching`.
- Scenarios: K12's set.
- Pins: `coachUnackedOverdue_`/`coachAnalytics_` rewritten in place; `coachRepSignal_` behavioural;
  label-map MIRROR_INDEX entry; H-1 tripwire extended; `.coach-row-overdue` ban; the first coaching
  DOM test (drawer open/prefill/close idempotent).
- CLAUDE.md: INV-134 amendment (columns, reply, praise semantics, business-day overdue, critical
  mail + retraction), localStorage 16 → 17, the Coaching bullet, an S-scenario.

### PR 5 — QA
- Server: `QA_RECORDINGS_HEADERS` +`DurationSec` +`SkipReason`; `qaSetRecordingDuration`;
  `QaExemptions` tab + `qaSetExemption` (manager-gated); `getQaQueue.coverage[]` + `agentEmpId`;
  `qaSamplePick_` target-aware; `CONFIG.QA_AUDIT_TARGET_PER_PERIOD`.
- Client: Q1 pin, Q2 Skip + chip counts, Q3 transport parity + shared score-tone helper, Q4 period
  control + summary strip + coverage table + `umsQaPeriod`, Q5 table, Q6 panes, Q7 hand-off, X2.
- Scenarios: `qa-detail-light-mobile`, `qa-queue-dark-wide`, `qa-queue-empty` (`?fixture=empty`);
  fixture gains a skipped recording, an exempt rep, a zero-sampled rep.
- Pins: QA-8 rewritten (stats/coverage fields); QA-11 rewritten (target-aware pick); QA-7's onclick
  scan covers the new buttons; QA-19 coverage join (every roster rep listed, case-insensitive);
  QA-20 comment pin (submit sends the PIN); QA-21 exemption rules behavioural.
- CLAUDE.md: INV-196 amendment; localStorage 17 → 18.

### PR 6 — Time Clock
- T1 `getMyPendingTasks` + Needs-you block, T2 card density + state line + bans, T3 held rotator,
  T4 readouts.
- Scenarios: `clock-light-wide` re-shot + the fold MEASURED; `clock-needsyou-empty`,
  `clock-needsyou-error`.
- Pins: `:4309` and `:8640` rewritten into bans; `getMyPendingTasks` contract (per-source
  `unavailable`, no cache on a degraded round, `COMPACT_MODE` gate, bare `{error}` read shape); the
  single-hours-readout source pin; the state-line scrim present (V-2 class).
- CLAUDE.md: Dashboard KDD amendment; INV-190 unchanged.

Each PR ends with `npm test` green (pure + DOM), `node build.mjs && node shoot.mjs` with every
affected scenario eyeballed and `overflowPx` 0, and — for PRs 3–6 — the editor-only cases listed
for the operator's post-deploy `runAllTests()` (the expected count rises with each).

---

## 5 · Verified-accurate (clean to build to)

- C1 chrome inventory; the stale Manage Time breadcrumb; the QA comment-timestamp bug; QA `skipped`
  unreachable; the QA detail single-column; the QA list as cards; the Admin cards deriving tone
  independently; `okLine` rendering a row per passing check; the Coaching composer inline, no reply,
  `noteId`/`VoidReason` unrendered; `getMyCoaching` fixture empty; Punctuality discarding per-day
  data; Manage Time with no disclosures and a two-condition SWR guard; Time Clock hours twice and
  breaks three ways; the rotator hover-hold only; the region strip unpinned, the star pinned.
- The docs' "do not break" lists (Coaching §1, Manage §0, QA §0, Admin §5, Time Clock §5) — every
  guard named is present and stays; `qaSampleRecordings` really is coverage-fair already.
- Part 5 "not changing" list — unchanged.

## 6 · Stale or wrong in the INDEX (for the record)

| Index claim | Reality | Effect |
|---|---|---|
| Coaching per-employee table is hand-rolled (C2) | Already `mtRenderTable_` (V-11) | Dropped |
| `.tr-complete-btn` uses undefined `--accent-deep` (C4) | Uses `--success-deep` | Dropped; real list in X5 |
| `var(--danger-soft, #fce5e5)` exists (C4) | Not found | Dropped |
| `.toolbar-tabs` must scroll inside itself (C5) | Built 2026-08-11 | Affordance only |
| C5's Manage half shipped via Workstream B (6a) | B fixed an inline grid | Note only |
| "Admin's void reason" never shown (C3) | EmpDocs renders it | Dropped |
| `getMyQaReviews` has no audio path (6b) | Shipped 2026-08-28, scoped | Build nothing |
| Punctuality "team scoping unchanged" (Part 3) | No team scoping exists | Note only |
| Coaching needs 3 columns (Part 3) | 5 (`NoteDate`, `QaFileId`) | Decision 2 |
| Metrics thresholds 80/50 | 85 (legacy 80); no 50 | Note only |
| Pure harness 712 | 713 | Note only |
| Clock card saves ~70 px | Strip ~17 px; star costs none | Measure |

## 7 · Stale or wrong in the DETAIL docs (new in revision 2)

| Doc | Claim | Reality | Effect |
|---|---|---|---|
| Coaching §5 | "Critical mails the rep. Nothing else does." | `notifyRepOfCoaching_` mails on every create | Decision 1 |
| Coaching §2d | Note link `enterTool('callnotes', …)` | Dead key; `enterTool` no-ops silently | K5 via the drill hints |
| Coaching Part 3 / §7 | Three new columns | Five (note link needs a date; QA §4e wants `reviewId`) | Decision 2 |
| Coaching §7, Admin §6 | `--accent-deep` undefined on `.tr-complete-btn` | Reads `--success-deep` | X5 |
| Manage §2e | Add `days[]` | `days` is already the day-count key | `dayDetail` |
| Manage §2e | "existing team scoping, unchanged" | None exists | Note only |
| Manage §3b | Periodic panels can lazy-load on first open | Drift/doctor summaries come only from their own RPCs | Load on enter |
| Manage §3b | Panel list | Predates the Team Punches card | Joins Needs-you |
| Manage §5 | Coverage has a light scenario | None; no fixture either | M6 adds both |
| Manage §1 | Metrics thresholds 80/50 | 85, legacy 80 | Note only |
| Manage §2c | Reuse `mPctClass_` with 90/75 | Its lower band is hardcoded 50 | `mtPctTone_` |
| QA §5 | `AuditPeriod` column, derived at sync | `DriveCreatedMs` already stored; derive at read | No column |
| QA §5 | `DurationSec` "if Drive exposes it" | DriveApp has no duration | Client write-back |
| QA §2 | Per-employee target | Source undefined (mock hardcodes 3) | CONFIG constant |
| QA addendum | Detail has no scenario / no agent audio | `qa-detail-light-wide` exists; scoped audio shipped | Note only |
| Time Clock §2 | "QA review to acknowledge" | QA §6: no ack exists | Decision 3 |
| Time Clock §2 | Requests = punch-edit / PTO | Extras card = dept requests; punch chip exists | Dept requests |
| Time Clock §3a+§3c | Hours on the state line AND in the strip header | Twice again (its own finding 1) | Decision 4 |
| Time Clock §3c | `remindersTick_` calls `clkNextBreak_` | Only the clock partial does | Kept for the chip |
| All five | `Tools › Manage › X` breadcrumbs | Three existing instances are two-level | Decision 10 |

## 8 · Parked — `docs/INTAKE_EMAILS_HANDOFF.md`

A separate handoff (the intake email trio onto `buildBrandedEmailHtml_`, `intakeEmailShell_`
collapsed into the shared shell, one email palette + a raw-hex tripwire). Coaching §6 flags the same
three items. Out of this plan's scope; it lands after PR 6 as its own PR once the operator confirms
the deploy window (the PPD body feeds `intakeBodyHash_`, so a restyle invalidates previews taken
across the deploy — INV-111).
