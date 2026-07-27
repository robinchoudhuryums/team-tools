# Cycle State

## Current
Cycle: 12
Phase: implement — F1–F5 implemented + pinned (2026-07-27); pending: PR + operator deploy
Scope: broad (fresh broad scan + an operator-requested VISUAL/UI-UX addendum)
Test Command: manual
Subsystem cycles since last Seams audit: 1 (cycle 11 was the seams audit; /reflect increments)
Updated: 2026-07-27

CYCLE 12 AUDIT (2026-07-27, broad lens — NOT a seams cycle): single-session
scan (no agent fan-out this cycle), baseline verified green FIRST (pure 330,
DOM 65, node --check x3). Focus: the ~520 lines of web-app/ that landed AFTER
cycle 11's audit read the tree (batches 1/2/3 + visual batch 2 — the only
unaudited surface), then category sweeps across the six Axis-B lenses.
Findings: 0 Critical / 0 High / 5 Medium / 8 Low (5th consecutive no-High
cycle). Scan scores: Overall 8 · Correctness 8.5 · Security 9 · Data Integrity
8 · Tz 9 · Concurrency 8 · Test Coverage 7.5 · Docs 7.5 · GAS 8.5 · MgrUX 7.5 ·
EmpUX 8.5 · Automation 8.

MEDIUMS (all five implemented this session):
- F1 TimesheetArchive (INV-153) had NO reader anywhere → a retroactive ADP
  export silently produced a PARTIAL payroll .xlsx behind {success:true} with
  an audit row reporting the truncated count as authoritative. Money-facing,
  one operator setting away (CLAUDE.md RECOMMENDS TIMESHEET_ARCHIVE_DAYS=365).
- F2 getTimesheetDoctor silently truncated at TS_DOCTOR_MAX_GROUPS (no
  truncated flag, unlike every sibling bounded reader) while
  fixTimesheetDuplicates collapsed EVERY group found — so "Collapse 200
  group(s)" could delete 500+ rows — unbounded, holding the ONE project-wide
  ScriptLock (every rep punch fails on waitLock meanwhile).
- F3 archiveSheetRowsOlderThan_ had no per-run bound and deletes row-by-row: a
  large first enable (~20k rows/year here) cannot finish inside the 6-minute
  ceiling, and because the append is flushed FIRST every killed run
  re-appends the undeleted rows → payroll duplicates into the archive while
  the live tab barely shrinks.
- F4 getMyMetrics + getDashboardMetrics roster walks lacked the no-EMAIL skip
  every sibling walk applies (getCoveragePlan got it in cycle-9 L-2), so
  offboarded/placeholder rows entered the INV-124 N=3 cohort count AND the
  team benchmark — weakening the one anonymization guard Metrics has.
- F5 countCallNotesInRange_ returned 0 on ANY read error, indistinguishable
  from "zero notes filed" → the Clock strip rendered "0% logged" in CRIT tone
  + "File <every answered call> missing", telling reps to redo filed work.

KEY LOWS (NOT implemented — operator selected F1–F5 only): F6 _resetCdrCaches_
misses the 3-day-old _csrTransferValidated/_csrTransferWarning flags; F7
INV-136's self-described "authoritative" admin list says 30, code has 35
(missing kbGetRevisions/kbPublishItem/kbRevertItem/kbGetSearchConfig/
kbSaveSearchConfig) — the count has now drifted 4x (24→28→30→35), so the
durable fix is a machine check; F8 "six modules" vs 7 TOOLS entries; F9 gate
coverage is 88/88 but hand-maintained with no tripwire; F10 CI's "always-on
floor" pure harness sits BEHIND npm ci, contradicting its own comment; F11
subformData.feedback[] unbounded in LENGTH (the L-1 class, one surface over);
F12 deletePunch's L-14 survivor re-scan does a 2nd full Timesheet read inside
the lock; F13 README "45-question" vs the 46 ring; F14 "column L trimmed
EVERYWHERE" is false (11 of 21 sites untrimmed — a whitespace-only cell makes
a rep enrolled-but-broken, silently skipped from every manager aggregate);
F15 runNightlySelfTest stamps its heartbeat BEFORE the run and records the
outcome only on a normal return, so an execution-timeout kill (realistic for
the 281-test full suite) leaves a STALE GREEN result beside a FRESH heartbeat
— the newest detector cannot detect its own failure; F16 the retention panel's
withFailureHandler still blanks silently (cycle-10's E7 fixed only the
success-with-error path; the last such site); F17 MIRROR_INDEX omits >=4 live
mirrors (CLK_DASH_PERIODS<->DASHBOARD_PERIOD_KEYS, COACH_SEVERITIES<->the
severity <select>, cnExtLinkOptionsHtml_'s inlined categories, PUNCH_META<->
PUNCH_LABELS_); F18 four capped readers with no truncation flag
(getDeptRequests x2, kbGetReviewDue, getSpanishInboxStats).

VISUAL / UI-UX ADDENDUM (2026-07-27, operator asked whether the scan covered
it — it had NOT; ran test/visual/ + 6 throwaway DOM probes). 20/20 scenarios
rendered, 0 missing fixtures. Two Mediums that 11 cycles of CODE audit
structurally could not see:
- V-1 (Medium) the four derived `-deep` tokens are HUE-SHIFTED in light mode
  because color-mix(in oklch, <semantic>, var(--ink) 45%) interpolates hue on
  the polar arc and --ink sits at hue ~264: --warning-deep resolves to hue
  354.8 (RED, vs the documented #8a4500 amber), --danger-deep 330 (magenta),
  --success-deep 204 (cyan); --info-deep is the only correct one (which is why
  nobody noticed). Dark mode mixes 25% against --paper-card and stays correct,
  so the SAME token is a different hue family per theme. 254 consumers; the
  Lunch Out button renders in a destructive red in the default theme. FIX
  VERIFIED: `in oklab` (rectangular, no hue arc) reproduces the documented
  intent for all four. The cycle-10 WCAG tripwire measures LUMINANCE, which a
  hue shift leaves untouched — the class is outside every existing net.
- V-2 (Medium) .ampm keeps `color: var(--muted)` from styles.html:720 at
  specificity (0,3,0), beating the (0,2,0) `.clk-sky .clk-time { color:#fff }`
  override — a THEME-FLIPPING token painted on the clock card's FIXED sky
  gradient. Measured contrast: light 2.08:1 (blue end) / 3.46 (mid) / 5.82
  (amber end); dark 1.20-2.00:1 across the whole card. AM/PM is illegible in
  dark mode on the live clock of a time-tracking app.
- V-3..V-14 (Low): dead CSS rule (.rail-actions .kbd-chip display:none loses
  to an equal-specificity later rule — chips render and the Ctrl+Shift+Enter
  chip CLIPS in the 480px pinned pop-out; contradicts CLAUDE.md); shift-strip
  hours wrap mid-value ("5h / 54m", the V-10 tz-chip class one surface over);
  the sidebar nav shifts 11px when entering Training & Employee Docs (V-6's
  shortLabel not applied to the sub-label); "Call Notes" still wraps in the
  mobile nav; 4 simultaneous ellipses at the DEFAULT 168px sidebar; the ADP
  Export button is the only --ink-inverted button in the app; ~535px stretched
  dead space on the Reference landing; zero-hour sparkline bars invisible in
  both themes; Coaching's By-employee table bypasses the documented shared
  mtRenderTable_; two visually identical chip rows on the CN Log view; Metrics
  has 4 competing date affordances + uninterpretable 30-point sparklines;
  V-14 the harness's own fixture is internally inconsistent (noteCount 7 +
  answered 41 + noteCoverage 85) — violating its README's first rule.
RETRACTED after probing (screenshots misled): a suspected mobile bottom-nav
content clip (view-area padding 76px vs a 60px nav — clean) and an initial
"the whole clock card flips with the theme" read (only .ampm does).
PROCESS RECOMMENDATION: add a "Visual & Accessibility" Health Dimension +
a Stage-1.5 visual step to /broad-scan — the harness takes ~2 min and found
2 Mediums the code lens cannot reach; plus 2 cheap machine checks (per-token
hue-drift vs its source; contrast for text on the fixed sky card).

## In progress (facts to carry forward — NOT judgments)
- F1–F5 implemented, pinned, and verified green: pure 330→335, DOM 65,
  node --check x3, all 5 new Node pins BITE-CHECKED (5/5 failed on reverted
  code, restored via a python edit + backup — never git checkout mid-batch).
- Client render branches EXECUTED (not just reasoned) in the visual harness:
  the F5 coverage-strip unavailable path emits no CTA and says why; the F2
  card renders "Showing 200 of 512" + "Collapse 200 duplicate row(s) (of
  640 — re-run for the rest)"; the LEGACY server shape (new fields absent)
  still renders sensibly, so a client running against a not-yet-redeployed
  server is safe; the F5 metrics rail + team-table dash cells render.
- Next concrete step: open the PR for this batch, then the operator deploy
  (cd web-app && clasp push -f, then New version) + editor runAllTests.

## Completed this cycle
- F1 | Code.js, tc/script_manager.html | generateExportSheet_ reads through
  TimesheetArchive when startDate predates the live tab's oldest row (gated,
  so current-period exports are byte-identical); skips an archive row
  byte-identical to a live one (the INV-132 append-then-delete duplicate);
  REFUSES with an actionable error if the archive read fails on a range that
  needs it (loud > partial payroll); returns archivedRowCount → AdpExport
  audit row + manager toast.
- F2 | Code.js, tc/script_manager.html | getTimesheetDoctor returns
  totalDuplicates/totalInverted/totalDuplicateRows/truncated/fixMaxRows;
  fixTimesheetDuplicates bounded by TS_DOCTOR_FIX_MAX_ROWS=200 and returns
  `remaining`; the batch is a slice of the DESCENDING-rowIdx list so
  bottom-up deletion + INV-155 last-row-wins still hold on a partial run;
  card shows "showing N of M", labels the button with what the run will
  actually do, and the toast reports the remaining backlog.
- F3 | Code.js | archiveSheetRowsOlderThan_ gains opts.maxRows (absent =
  unbounded → CN call sites byte-identical, their 4-arg pin still passes);
  archiveOldTimesheetRows passes TIMESHEET_ARCHIVE_MAX_ROWS_PER_RUN=2000 and
  stamps hitPerRunCap= in its audit row when a run is capped.
- F4 | Code.js | the no-EMAIL roster skip added to BOTH getDashboardMetrics
  and getMyMetrics before allNames.push.
- F5 | Code.js, tc/script_clock.html, metrics/script_metrics.html |
  cnCountNotesResult_ → {count, unavailable, unenrolled};
  countCallNotesInRange_ is now a thin numeric wrapper (all existing callers
  and both editor tests unchanged); the four coverage surfaces null
  noteCoverage + set noteCountUnavailable / noteCountPartial; ALL THREE result
  caches (getMyMetrics, getMyMetricsRange, getDashboardMetrics) skip the put
  on a degraded read (the L-3/INV-129 rule); the Clock strip renders "notes
  unavailable" and returns BEFORE the "File N missing" CTA; the Metrics rail
  and team-table Notes cell render "—" instead of 0.
- Tests | Tests.js, test/client/run.js | +5 Node pin groups (F1–F5, all
  bite-checked); the archiveSheetRowsOlderThan_ BEHAVIORAL test extended with
  a maxRows case proving bounded + MONOTONIC progress (3 rows drain 2 then 1,
  archive total 3 not 5); the sheet-doctor editor test asserts the new
  truncated/fixMaxRows/remaining contract; the countCallNotesInRange_ smoke
  test asserts unenrolled-vs-unavailable.

## Pending / not yet done
- PR for this batch + operator deploy (clasp push -f + New version) + editor
  runAllTests (the F3 maxRows behavioral case and the F2 contract assertions
  run only there).
- CARRIED FROM CYCLE 11 (still not confirmed done): the operator deploy of
  cycle 11's follow-up visual batch. This batch's deploy covers both.
- The 8 Lows + the 14 visual findings from this cycle's audit (F6–F18,
  V-1–V-14) — NOT selected by the operator this round. V-1 and V-2 are the
  highest-impact remaining items (they fire on every page load, today, with
  no operator action).
- /reflect (writes the metrics + estimates rows, increments the seams counter).

## Open follow-on items
- Code.js archiveOldCallNotes | the CN cold-archive twin still calls the mover
  UNBOUNDED — same non-convergence hazard as F3 for a rep with years of notes.
  Deliberately left: F3 was scoped to the Timesheet and the CN 4-arg call is
  pinned byte-identical. One-line fix (pass maxRows) whenever it is in scope.
- Code.js | the OTHER archive readers are still live-tab-only:
  buildTimesheetForEmployee_ (employee calendar), getPunctualityReport,
  tsDoctorScan_. F1 fixed the money path (the export) only.
- Code.js archiveOldTimesheetRows | hitPerRunCap reads "more remain" on a run
  that moved exactly the cap with nothing left. Cosmetic, audit-note only.
- test/visual/mock.js | V-14 the inconsistent coverage fixture (see above) —
  it makes the renders show impossible data ("85% logged · File 34 missing").

## Decisions made (so the next session doesn't re-litigate)
- F1 chose READ-THROUGH over a warning: the archive is the payroll record, so
  the export should be complete rather than merely honest about being short.
  Gating on `startDate < oldestLiveDate` keeps the hot path unchanged and
  bounds the extra read to genuinely-retroactive exports.
- F1 REFUSES (returns {error}) when a needed archive read throws. This is a
  deliberate new failure mode in the fail-safe direction: a manager gets a
  retry instead of a silently-short payroll file. Counted honestly as 1 new
  failure mode.
- F2 cap = 200 rows/run, chosen from the lock-starvation budget (~0.5s per
  row: deleteRow + audit appendRow ≈ 100s worst case), not from a payload
  concern. The op was already idempotent, so multi-click drain is free.
- F3 cap = 2000 rows/night; opts.maxRows deliberately DEFAULTS to unbounded so
  the CN callers stay byte-identical and their existing 4-arg tripwire passes.
- F5 kept countCallNotesInRange_ numeric (a wrapper) rather than changing its
  return type — two editor tests assert the number, and 0 callers needed to
  change. The outcome rides on the new sibling.
- F5 treats UNENROLLED (INV-35, no Sheet configured) as distinct from a FAILED
  read: only the latter is an error worth surfacing.

## Where I left off
Cycle 12: audit done (5 Medium / 8 Low) + a visual addendum (2 Medium / 12
Low), then the operator selected F1–F5 and all five are implemented, pinned,
bite-checked, and green (pure 335/0, DOM 65/0, node --check x3). Zero
uncommitted scratch files; 6 files modified. NEXT: commit + push to
claude/broad-scan-it3br5, open the PR, then the operator deploy (clasp push -f
+ New version) and an editor runAllTests. After that: /sync-docs for the four
invariant amendments (INV-153 export read-through, INV-159 truncation + per-run
bound, INV-124 roster filter, INV-129 extended to the note read) and /reflect
to close the cycle. V-1 (oklch hue shift) and V-2 (AM/PM contrast) are the
strongest un-implemented items.

## History
Closed-cycle records live in `.cycle/HISTORY.md` (append-only, newest first).
This file holds ONLY the current cycle — see CLAUDE.md "Cycle State & Memory"
for the close-out procedure.
