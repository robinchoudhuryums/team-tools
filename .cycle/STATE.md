# Cycle State

## Current
Cycle: 12
Phase: implement — ALL batches done (1: F1–F5 · A: V-1–V-3 · B: F15/F9/F7/
       F6/F10 · C: F14/F16/F18/F11/F3-sibling · D: F17/F12/V-14/V-5/V-6/V-7 ·
       E: V-4/V-8/V-9/V-10/V-11/V-12) 2026-07-27; pending: operator deploy
       + /reflect
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

LOWS — ALL implemented across batches B/C/D: F6/F7/F9/F10/F15 (B),
F11/F14/F16/F18 + the F3-sibling (C), F12/F17 (D). F8/F13 were doc-only and
fixed in the /sync-docs pass. Nothing from the cycle-12 Low list remains open.

VISUAL / UI-UX ADDENDUM (2026-07-27, operator asked whether the scan covered
it — it had NOT; ran test/visual/ + 6 throwaway DOM probes). 20/20 scenarios
rendered, 0 missing fixtures. V-1/V-2/V-3 (batch A), V-14/V-5/V-6/V-7 (batch D)
and V-4/V-8/V-9/V-10/V-11/V-12 (batch E) are all implemented and MEASURED.
DEFERRED BY DESIGN: **V-13** (Metrics' 4 competing date controls +
uninterpretable 30-point sparklines) — a redesign needing an operator opinion,
not a defect. **V-9 is PARTIAL by decision:** the Reference landing's ~535px of
stretched empty card is fixed and measured (panel 260px hugging 241px of
content; a 400-paragraph article still scrolls INTERNALLY — verified, and the
first attempt at this REGRESSED it, see Decisions); the other two instances the
finding named (dashboard rail 284px shorter than the main column, Metrics hero
119px shorter than its rail) are just SHORTER COLUMNS with no stretched card —
rebalancing them means moving content between columns, an operator design call.
RETRACTED after probing (screenshots misled): a suspected mobile bottom-nav
content clip (view-area padding 76px vs a 60px nav — clean) and an initial
"the whole clock card flips with the theme" read (only .ampm did).
PROCESS RECOMMENDATION (still open): add a "Visual & Accessibility" Health
Dimension + a Stage-1.5 visual step to /broad-scan — the harness takes ~2 min
and found 2 Mediums the code lens cannot reach. Both cheap machine checks it
recommended now EXIST (the V-1 hue-drift tripwire; the V-2 fixed-surface
contrast measurement was folded into batch A's verification).

## In progress (facts to carry forward — NOT judgments)
- EVERY batch implemented, pinned, and green: pure 330→356, DOM 65→66,
  node --check x3, visual harness 20/20 (0 missing fixtures). All new pins
  BITE-CHECKED (38/38 across the cycle; restored via a python edit + backup —
  never git checkout mid-batch).
- Batch D/E was verified by MEASUREMENT, not reasoning: V-4 both durations
  render as ONE client rect at 390px (nowrap); V-8 .btn-modal-ok background now
  equals --accent exactly in both modes (was --ink); V-10 zero-bars went 1.10:1
  → 2.28:1 (light) / 2.20:1 (dark) against the card; V-9 Reference panel 260px
  hugging content AND a 400-paragraph article still scrolls internally (page
  does not grow); V-11 renders .m-table/.m-table-wrap with scope="col" headers,
  .m-num/.m-name cells, the overdue rowClass and identical values; V-12 chips
  still set CN_STATE.filter + navigate to callNotesHistory.
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

- F14 | Code.js, Tests.js | ONE `cnEnrolledSheetId_(row)` predicate (trimmed,
  null-guarded) now the ONLY reader of column L — all 21 hand-written sites
  converted (11 of which tested RAW truthiness), the now-redundant re-trims
  removed, and a Node tripwire bans every raw `EMP.CALL_NOTES_SHEET_ID` read
  outside it (exempting only the predicate body + provisionCallNotesSheet's
  setValue WRITE). The employee-object builders keep their `|| null` contract.
  + an editor smoke test on the predicate.
- F16 | cn/script_callnotes.html | the retention panel's withFailureHandler
  renders `errorStateHtml_` instead of blanking the slot (the last
  silently-blanking handler; cycle-10's E7 fixed only the success-with-{error}
  path). Pinned by a source pin AND a new DOM test.
- F18 | Code.js, metrics/script_deptrequests.html, kb/script_kb.html | the
  payload-capped readers now report the pre-slice total: getDeptRequests gains
  listCap/mineTotal/incomingTotal/allOpenTotal (and the magic 100 became
  DR_LIST_CAP), kbGetReviewDue gains total/cap, getSpanishInboxStats gains
  pendingListCap. Clients render "showing N of M" (Dept Requests) and a
  true-total Review-due pill — and render NOTHING when the list is complete or
  the total is absent, so a client on an un-redeployed server is unchanged.
- F11 | Code.js, Tests.js | `cnAppendBounded_` bounds the two APPEND-ONLY
  SubformData arrays (feedback[] x3 sites, externalEmails[] x1) by entry count
  AND serialized size, REFUSING + popping the entry back off rather than
  dropping the oldest (they are the coaching/send record — the INV-96 posture).
  The non-growing flag/resolve/pin writes stay unguarded on purpose: they are
  the recovery path for an already-oversized note. + an editor smoke test.
- F3-sibling | Code.js | archiveOldCallNotes passes a WHOLE-RUN budget
  (CN_NOTE_ARCHIVE_MAX_ROWS_PER_RUN=2000) and stops the rep loop when spent —
  a per-rep cap cannot bound a walk that calls the mover once per rep inside
  one execution + one lock. Capped runs stamp hitPerRunCap=.
- Docs | CLAUDE.md | the F14 gotcha rewritten from "NOT yet everywhere / fix
  not yet applied" to the enforced-predicate form; the SubformData gotcha
  extended with the F11 LENGTH bound + why flag/pin stay unguarded; INV-153
  extended with the CN sibling's whole-run budget.

- F17 | test/client/run.js | the 4 missing MIRROR_INDEX entries now have REAL
  guards, each extracting both sides from raw source: client CLK_DASH_PERIODS ===
  server DASHBOARD_PERIOD_KEYS (order matters — it drives the carousel chips AND
  the three up-front fetches); the coaching severity <select> === COACH_SEVERITIES
  (coachValidate_ whitelists against it, so drift rejects a note AFTER the
  manager typed it); cnExtLinkOptionsHtml_'s inlined catLabels ===
  CN_EXTERNAL_LINK_CATEGORIES (a missing category silently never groups and its
  links vanish from the picker); PUNCH_META ⊇ PUNCH_LABELS_ (a missing type falls
  through to a raw type name + generic glyph on a punch button — an extra-keys
  assert pins that only the client-only `Adjust` may be extra).
- F12 | Code.js | deletePunch derives the duplicate survivor from the
  ALREADY-LOADED rows (skipping the index being deleted, computed BEFORE
  deleteRow) instead of a second whole-Timesheet getDataRange read inside the
  global lock. Equivalent under the lock (every mutating writer takes it), one
  fewer full read of the tab that grows unboundedly until INV-153 is enabled.
- V-14 | test/visual/mock.js | the fixture now satisfies the server's own
  arithmetic: 35 notes / 41 answered → 85% and missing 6 (was 7 / 41 / 85% +
  missingCount 3, i.e. "85% logged · File 34 missing" — data the server cannot
  produce). The range fixture got its OWN weekly cdr totals (218/254 → 86%)
  because it had been reusing the single-day block.
- V-5/V-6/V-7 | script_core.html | `shortLabel` is now the nav-label source on
  ALL THREE width-constrained surfaces (mobile nav, sidebar link, sidebar
  sub-label), with the full label as a title; `callNotes` gained
  shortLabel:'Notes'; the two sidebar user fields carry titles. Every sidebar
  label is now a single word ≤9 chars, so nothing ellipsises at the 168px
  default and the sub-label can never wrap to two lines (which used to push the
  whole nav down 11px on one tool — navigation moving when you navigate).
- V-4 | tc/script_clock.html | each shift-strip duration is its own nowrap span
  (`.ss-val`), so the readout wraps only BETWEEN values, never mid-value.
- V-8 | styles.html | `.btn-modal-ok` (the SHARED modal primary, 25 call sites)
  joins the app's green-primary vocabulary — it was --ink on --ink, the only
  inverted button in the app. `.ui-dialog-ok.is-danger` still wins at (0,2,0).
- V-9 | kb/script_kb.html | the viewport cap moved from the WRAP to the grid
  ITEMS + align-items:start, so a short landing hugs its content while the
  reader keeps internal scroll. PARTIAL — see the addendum note above.
- V-10 | styles.html | a zero-hour sparkline bar is `--muted-3` at 3px (was
  --paper-2 at 1px ≈ the card background in both themes).
- V-11 | train/script_coaching.html | the "By employee" table renders through
  the shared `mtRenderTable_` (overdue tint via rowClass, bespoke table CSS
  deleted); the KPI strip is left-aligned to match its `.telemetry` twin.
- V-12 | cn/script_callnotes.html | the navigating chip row is now a LINK
  affordance (no pill outline, info tone, per-chip chevron, underline on hover,
  "Open in History · this week" label) so it cannot be mistaken for the toggle
  filter pills ~400px above; the click behaviour is unchanged (verified).
- Docs | CLAUDE.md | `shortLabel` documented in the registry decision with its
  three surfaces + the ~9-char rule; the mtRenderTable_ decision names Coaching
  as the third caller; the save-quadrant "kbd-chips hidden" claim notes that
  V-3 made the dead rule actually win.

## Pending / not yet done
- Operator deploy (cd web-app && clasp push -f + New version) + editor
  runAllTests (the F3 maxRows behavioral case, the F2 contract assertions, and
  the F6 cache-reset effect run only there). Covers cycle 11's un-deployed
  visual batch too.
- NOTHING from the cycle-12 finding list remains open except the two items
  deferred BY DESIGN (V-13's Metrics redesign; V-9's two column-balance
  instances) and the /broad-scan process recommendation.
- /reflect (writes the metrics + estimates rows, increments the seams counter).

## Open follow-on items
- Code.js getSpanishInboxStats | `pendingList` is a DEAD field — nothing in the
  client reads it (the Spanish tab and the dashboard card both use the separate
  live-read getSpanishInboxPending, which is uncapped). F18's cap flag there is
  therefore correct-but-unobservable; removing the field is the real cleanup,
  deferred as a response-shape change.
- tc/script_clock.html loadCoverageStrip_ | blanks the strip on a COLD-miss
  failure (`if (!hadCache) slot.innerHTML = ''`). Deliberate + documented as
  the SWR keep-last-good rule, so it was left alone in F16 — but it is the one
  remaining place a failed load renders as absence rather than an error.
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

## Decisions made in batch D/E (added)
- V-9's first attempt put `max-height` on the grid CONTAINER. Measured result:
  the grid ROW is not constrained by it, so a long article grew the page to
  13.7k px and the reader's internal scroll was GONE. The cap has to sit on the
  grid ITEMS. Caught by measuring, not by reasoning — worth remembering.
- V-9 fixes ONE of the three instances the finding named; the other two are
  shorter columns with no stretched card, so filling them means moving content
  between columns — an operator design call, not a defect fix.
- V-8 changed the SHARED `.btn-modal-ok` rather than the one ADP Export button:
  the inversion was never per-button, it was this class (25 call sites). The
  danger variant still overrides at higher specificity.
- V-12 kept the click behaviour identical (verified: filter + navigate) and
  changed only the affordance. The filter row keeps the pill (it has real
  aria-pressed toggle state); the navigating row became a link.
- V-11 kept `.tr-cell-overdue` on the cell AND added a row tint via rowClass —
  the component's hook exists for exactly this, so no bespoke table CSS remains.
- F12's derivation is equivalent ONLY because every mutating writer takes the
  same global ScriptLock (INV-01). If that ever changes, the survivor scan needs
  a fresh read again.
- The F12 pin strips comments before counting `getDataRange().getValues()` — the
  fix's own comment names the call it removed, which would otherwise have made
  the pin permanently red.

## Where I left off
Cycle 12 is IMPLEMENTATION-COMPLETE: the audit + visual addendum found 5 Medium
/ 8 Low / 14 visual, and every one is either shipped (batches 1/A/B/C/D/E) or
deferred by an explicit decision (V-13's Metrics redesign, V-9's two
column-balance instances, the /broad-scan process change, the F1 sibling
readers). All green: pure 356/0, DOM 66/0, node --check x3, visual 20/20, 38/38
new pins bite-checked. Docs synced each round. NEXT: the operator deploy
(cd web-app && clasp push -f, then New version) and an editor runAllTests —
batch C added 2 smoke tests (cn_enrolledSheetId_, cn_appendBounded_) that only
run there — then /reflect to close the cycle.

## History
Closed-cycle records live in `.cycle/HISTORY.md` (append-only, newest first).
This file holds ONLY the current cycle — see CLAUDE.md "Cycle State & Memory"
for the close-out procedure.
