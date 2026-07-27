# Cycle State

## Current
Cycle: 12
Phase: implement — batches 1 (F1–F5), A (V-1–V-3), B (F15/F9/F7/F6/F10) done
       (2026-07-27); pending: operator deploy + /reflect
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

MEDIUMS (all five implemented — batch 1):
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

LOWS — F6/F7/F9/F10/F15 implemented (batch B). STILL OPEN: F8 "six modules" vs
7 TOOLS entries (fixed in the /sync-docs pass); F11 subformData.feedback[]
unbounded in LENGTH (the L-1 class, one surface over); F12 deletePunch's L-14
survivor re-scan does a 2nd full Timesheet read inside the lock; F13 README
"45-question" vs the 46 ring (fixed in /sync-docs); F14 "column L trimmed
EVERYWHERE" is false (11 of 21 sites untrimmed — a whitespace-only cell makes
a rep enrolled-but-broken, silently skipped from every manager aggregate; the
DOC claim was corrected in /sync-docs, the CODE gap remains); F16 the
retention panel's withFailureHandler still blanks silently (cycle-10's E7
fixed only the success-with-error path; the last such site); F17 MIRROR_INDEX
omits >=4 live mirrors (CLK_DASH_PERIODS<->DASHBOARD_PERIOD_KEYS,
COACH_SEVERITIES<->the severity <select>, cnExtLinkOptionsHtml_'s inlined
categories, PUNCH_META<->PUNCH_LABELS_); F18 four capped readers with no
truncation flag (getDeptRequests x2, kbGetReviewDue, getSpanishInboxStats).

VISUAL / UI-UX ADDENDUM (2026-07-27, operator asked whether the scan covered
it — it had NOT; ran test/visual/ + 6 throwaway DOM probes). 20/20 scenarios
rendered, 0 missing fixtures. V-1/V-2/V-3 implemented (batch A). V-4–V-14
remain open (see the prioritized batches C/D/E in the /sync-docs reply):
shift-strip hours wrap mid-value; the sidebar nav shifts 11px entering
Training & Employee Docs; "Call Notes" wraps in the mobile nav; 4 simultaneous
ellipses at the DEFAULT 168px sidebar; the ADP Export button is the only
--ink-inverted button in the app; ~535px stretched dead space on the Reference
landing; zero-hour sparkline bars invisible in both themes; Coaching's
By-employee table bypasses the documented shared mtRenderTable_; two visually
identical chip rows on the CN Log view; Metrics has 4 competing date
affordances + uninterpretable 30-point sparklines; V-14 the harness's own
fixture is internally inconsistent (noteCount 7 + answered 41 + coverage 85).
RETRACTED after probing (screenshots misled): a suspected mobile bottom-nav
content clip (view-area padding 76px vs a 60px nav — clean) and an initial
"the whole clock card flips with the theme" read (only .ampm did).
PROCESS RECOMMENDATION (still open): add a "Visual & Accessibility" Health
Dimension + a Stage-1.5 visual step to /broad-scan — the harness takes ~2 min
and found 2 Mediums the code lens cannot reach. The two cheap machine checks
it recommended NOW EXIST (the V-1 hue-drift tripwire; the V-2 fixed-surface
contrast measurement was folded into that batch's verification).

## In progress (facts to carry forward — NOT judgments)
- All three batches implemented, pinned, and green: pure 330→338, DOM 65,
  node --check x3. Every new Node pin BITE-CHECKED (14/14 across the cycle;
  restored via a python edit + backup — never git checkout mid-batch).
- Batch A was verified EMPIRICALLY in test/visual/, not just reasoned:
  V-1 worst hue drift now 10° (was 48–75°, with warn/danger in the wrong
  colour family); V-2 .ampm now theme-IDENTICAL (3.89 / 2.45 / 1.52 against
  the gradient's blue end / midpoint / amber end, vs dark's prior 1.20–2.00);
  V-3 display:none confirmed in both wide and 480px compact.
- Next concrete step: operator deploy (cd web-app && clasp push -f, then
  New version) + editor runAllTests, then /reflect.

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
  bottom-up deletion + INV-155 last-row-wins still hold on a partial run.
- F3 | Code.js | archiveSheetRowsOlderThan_ gains opts.maxRows (absent =
  unbounded → CN call sites byte-identical); archiveOldTimesheetRows passes
  TIMESHEET_ARCHIVE_MAX_ROWS_PER_RUN=2000 + stamps hitPerRunCap=.
- F4 | Code.js | the no-EMAIL roster skip added to BOTH getDashboardMetrics
  and getMyMetrics before allNames.push.
- F5 | Code.js, tc/script_clock.html, metrics/script_metrics.html |
  cnCountNotesResult_ → {count, unavailable, unenrolled}; the four coverage
  surfaces null noteCoverage + flag the round; ALL THREE result caches skip
  the put on a degraded read; clients render "notes unavailable" / "—".
- V-1 | styles_design_tokens.html | the four `-deep` aliases mix `in oklab`
  (not `in oklch`) in BOTH mode blocks. oklch interpolates hue on the polar
  arc and light --ink sits at hue ~264, so amber travelled 70→0→264 THROUGH
  RED: --warning-deep resolved to hue 355, --danger-deep 330, --success-deep
  204 across ~254 consumers (Lunch Out painted destructive-red). --selection-bg
  / --border-strong / --ring-focus deliberately STAY on oklch (hue-safe —
  they mix with transparent or a low-chroma neutral pair), as does the
  @supports probe (a proxy for "supports color-mix at all").
- V-2 | tc/script_clock.html | `.clk-sky .clk-time .ampm` fixed colour
  (rgba(255,255,255,.88)) — it was the one element on the FIXED sky card still
  painted by a theme token, because styles.html's (0,3,0)
  `.hero .clk-time .ampm { color: var(--muted) }` beat the (0,2,0) override.
- V-3 | cn/script_callnotes.html | the dead `.rail-actions .kbd-chip
  { display:none }` rule re-specified at (0,3,0) so it beats the later
  equal-specificity `display:inline-flex` — the chips were rendering and the
  Ctrl+Shift+Enter chip CLIPPED in the 480px pinned pop-out.
- F15 | Code.js, cn/script_callnotes.html | runNightlySelfTest stamps a
  {running:true, startedAt} sentinel BEFORE the suite (the outcome write only
  happens on a normal return or a CATCHABLE throw — an execution-limit kill is
  neither, so a chronically timing-out full suite reported the PREVIOUS green
  result beside a FRESH heartbeat); computeAutomationHealth_ derives `stuck`
  (running + older than SELF_TEST_STUCK_MS = 2h); automationProblems_ check (f)
  pushes it (so it rides the health dot + the failure digest, INV-161); the
  Admin panel reports "never finished" INSTEAD of the stale pass/fail line, and
  a fresh sentinel reads as "Running now" (not a problem).
- F9 | test/client/run.js | gate coverage is now MACHINE-checked: the gated set
  (35 admin + 55 manager) is enumerated from Code.js source and every entry
  must be referenced by a gate test. One reasoned allowlist entry
  (managerAggregateFlagged_ — a private helper whose public wrappers are both
  in the omnibus). Trigger handlers are outside the set by construction (they
  THROW via assertManagerCaller_, so they carry no returned error string).
- F7 | test/client/run.js, CLAUDE.md | the same enumeration asserts INV-136's
  stated count equals the enforced count AND that every admin-gated endpoint is
  backtick-named in that paragraph. The count had drifted 4x (24→28→30→35);
  the DRIFT WARNING prose was replaced with a MACHINE-CHECKED note.
- F6 | Tests.js | _resetCdrCaches_ clears _csrTransferValidated /
  _csrTransferWarning (both `var`, verified assignable) — cycle-11 L-2 added
  the once-per-session flags with a comment citing _cdrColumnsValidated but
  never added them here, so a fixture's verdict leaked into every later read in
  the same execution, including computeAutomationHealth_'s probe.
- F10 | .github/workflows/client-tests.yml | node --check + the zero-dependency
  pure harness now run BEFORE `npm ci`, matching the file's own "always-on
  floor" comment (a registry/jsdom hiccup used to fail the job without ever
  running the only dependency-free checks — in a repo where this workflow is
  the sole automated gate).
- Tests | Tests.js, test/client/run.js | +5 pin groups for F1–F5, +3 for
  V-1/F9/F7, and the existing nightly-self-test pin extended with 5 F15
  assertions (sentinel present + stamped BEFORE the run + carries startedAt +
  `stuck` derived from a STALE sentinel + surfaced in problems and the panel).
  All bite-checked. Pure harness 330 → 338.
- Docs | CLAUDE.md | the two OPEN cycle-12 visual gotchas (V-1 oklch, V-2
  .ampm) rewritten as closed-form entries carrying the mechanism, the measured
  before/after, and the rule for the next author; INV-136's drift warning
  replaced with the machine-check note.

## Pending / not yet done
- Operator deploy (cd web-app && clasp push -f + New version) + editor
  runAllTests (the F3 maxRows behavioral case, the F2 contract assertions, and
  the F6 cache-reset effect run only there). Covers cycle 11's un-deployed
  visual batch too.
- The remaining open findings: F11, F12, F14 (code side), F16, F17, F18,
  V-4–V-14, and the /broad-scan process recommendation. These are batches
  C / D / E in the prioritized list from the /sync-docs reply.
- /reflect (writes the metrics + estimates rows, increments the seams counter).

## Open follow-on items
- Code.js archiveOldCallNotes | the CN cold-archive twin still calls the mover
  UNBOUNDED — same non-convergence hazard as F3 for a rep with years of notes.
  One-line fix (pass maxRows) whenever it is in scope.
- Code.js | the OTHER archive readers are still live-tab-only:
  buildTimesheetForEmployee_ (employee calendar), getPunctualityReport,
  tsDoctorScan_. F1 fixed the money path (the export) only.
- Code.js archiveOldTimesheetRows | hitPerRunCap reads "more remain" on a run
  that moved exactly the cap with nothing left. Cosmetic, audit-note only.
- tc/script_clock.html | the clock card's AMBER gradient end is ~1.5:1 against
  white for `.clk-time` ITSELF, not just the AM/PM span V-2 fixed. That is a
  card-level design call (scrim, or a darker amber end), not a per-span patch
  — needs an operator decision, so V-2 deliberately matched the siblings'
  fixed white rather than adding a lone text-shadow.
- test/visual/mock.js | V-14 the inconsistent coverage fixture — it makes the
  renders show impossible data ("85% logged · File 34 missing").

## Decisions made (so the next session doesn't re-litigate)
- F1 chose READ-THROUGH over a warning: the archive is the payroll record, so
  the export should be complete rather than merely honest about being short.
  Gating on `startDate < oldestLiveDate` keeps the hot path unchanged.
- F1 REFUSES (returns {error}) when a needed archive read throws — a deliberate
  new failure mode in the fail-safe direction. Counted as 1 new failure mode.
- F2 cap = 200 rows/run, from the lock-starvation budget (~0.5s per row), not a
  payload concern. F3 cap = 2000 rows/night; opts.maxRows DEFAULTS to unbounded
  so the CN callers stay byte-identical.
- F5 kept countCallNotesInRange_ numeric (a wrapper) rather than changing its
  return type; UNENROLLED (INV-35) is distinct from a FAILED read.
- V-1 converted ALL FOUR aliases in BOTH mode blocks even though dark mode was
  already ~correct (a 25% mix barely moves the arc) — a token that means one
  hue family in one theme and another in the other is the trap; consistency
  removes it for the next alias added there. The @supports probe stays on
  oklch deliberately (it tests color-mix support, and the two remaining oklch
  mixes are hue-safe).
- V-2 used a flat rgba white rather than the project's text-shadow idiom:
  shadowing only .ampm while its .clk-time sibling has none would look
  inconsistent, and the amber-end legibility is a card-level question (above).
- F15 puts the sentinel AFTER the "test suite not present" early-return, so a
  project without Tests.js never leaves one behind. A catchable throw still
  records fail:1 (not stuck) via the existing catch.
- F9's coverage check matches against the whole gate-test REGION (every
  test_*Gate*/NonManager*/Rejected/Throws body concatenated) rather than
  parsing the omnibus `cases` array — a dedicated test calls its endpoint
  directly with no name string, so a case-list parse would false-fail.
- F7 asserts the doc names every ENFORCED admin endpoint, not the reverse:
  INV-136's paragraph legitimately mentions endpoints it says are NOT
  admin-gated (getEnrolledCallNotesReps, reconcileCallNotes, the KB review
  set), so an equality assertion would be wrong.

## Where I left off
Cycle 12: audit + visual addendum done; batch 1 (F1–F5 Mediums), batch A
(V-1–V-3 visual) and batch B (F15/F9/F7/F6/F10) all implemented, pinned,
bite-checked and green (pure 338/0, DOM 65/0, node --check x3, visual harness
20/20). Docs synced (CLAUDE.md gotchas + INV-136). NEXT: commit + push to
claude/broad-scan-it3br5, then the operator deploy (clasp push -f + New
version) and an editor runAllTests, then /reflect to close the cycle. Batches
C/D/E (F11/F12/F14/F16/F17/F18 + V-4–V-14 + the /broad-scan process change)
are the remaining prioritized work.

## History
Closed-cycle records live in `.cycle/HISTORY.md` (append-only, newest first).
This file holds ONLY the current cycle — see CLAUDE.md "Cycle State & Memory"
for the close-out procedure.
