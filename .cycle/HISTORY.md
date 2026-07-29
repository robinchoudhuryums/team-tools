# Cycle History (append-only archive)

Closed-cycle records moved out of `.cycle/STATE.md` (the 2026-07-24 split —
see CLAUDE.md "Cycle State & Memory"). STATE.md holds ONLY the current cycle;
when a cycle closes, its whole block moves here (newest first, inserted
directly below this header). Blocks are NEVER edited after landing — this
file is append-only, so heading names may repeat freely.

# Cycle 13 — broad (closed 2026-07-29)

Reflected: net 9 - 1 = 8. Reflect block: `.cycle/blocks/13-a-reflect.md`
(it CORRECTED the implementation blocks' tallies in two directions — use
the reflect block's numbers, not theirs). Implementation blocks:
`13-A1-A3-A11-A12-`, `13-A4-A6-A8-A9-`, `13-A5-A7-A10-followons-`,
`13-batch5-batch4-broad-implement.md`.

## In progress (facts to carry forward — NOT judgments)
- Cycle 13's broad scan is COMPLETE (3 stages). It found 0 Critical / 0 High /
  6 Medium / 7 Low, with the interface lens producing the top four findings —
  the second cycle running in which that lens outscored the code lens.
- ALL FIVE BATCHES (1, 2, 3, 5, 4) plus the open follow-on items are
  IMPLEMENTED. Batches 1–3 are committed and pushed to
  `claude/broad-scan-yhkbe2`; batches 5 and 4 are implemented and tested but
  were NOT yet committed at the time this line was written. /sync-docs ran
  after batch 1; every later batch applied its own doc edits. Not deployed.
- Verbatim summary blocks are at `.cycle/blocks/13-A1-A3-A11-A12-broad-implement.md`,
  `13-A4-A6-A8-A9-broad-implement.md`,
  `13-A5-A7-A10-followons-broad-implement.md` and
  `13-batch5-batch4-broad-implement.md`.
- **Every cycle-13 finding is now implemented.** FO-6 is the one item
  deliberately deferred, with its analysis recorded below.
- Next concrete step: close the cycle with /reflect.

## Completed this cycle
- A1  | metrics/, tc/script_clock.html, tc/script_manager.html, intake/, cn/ | six click-only span/div controls → <button type="button"> with a pixel-identical CSS reset
- A2  | metrics/, styles.html, train/script_coaching.html | real viewport media queries for .m-layout (≤720px), .telemetry and .coach-kpis (≤540px) — `:root[data-compact]` is the pop-out, not a breakpoint
- A3  | Code.js | timeToMins_ returns null not NaN; calcHours_ propagates it; all four callers guarded (getCoveragePlan needed an EXPLICIT guard — `x + null` coerces to 0)
- A11 | script_core.html, tc/, train/script_coaching.html, cn/ | aria-current on both nav levels, aria-pressed on the period switcher, role=tab/aria-selected on the Coaching toggle, aria-expanded on two disclosures
- A12 | metrics/, train/script_training.html, train/script_empdocs.html | 16 load-failure sites routed from empty-state containers to errorStateHtml_
- Tests | test/client/run.js (+6 pins, 356→362, all bite-checked), Tests.js (+1 editor smoke test)
- /sync-docs | CLAUDE.md, PROJECT_HEALTH.md | 4 checks run; 2 new gotchas, 2 decisions updated, counts corrected, INV-173..176 added (172→176)
- A4  | Code.js, Tests.js, CLAUDE.md | DELETED countCallNotesInRange_ (no production callers; its 2 tests pinned the 0-on-error shape F5 removed) — both repointed to cnCountNotesResult_
- A6  | kb/script_kb.html | kbReloadTree_ surfaces BOTH failure paths (it was the one KB RPC with no withFailureHandler AND a bare `return` on res.error)
- A8  | Code.js | getUpcomingAnnualPlanned_ returns null not 0 on a failed read (LATENT — the field has no client reader since cycle 8; scan over-claimed)
- A9  | Code.js | the CallNotesArchive audit row stamps hitPerRunCap only when an enrolled rep was left unvisited, not on a clean final run
- Tests | test/client/run.js (+4 batch-2 pins, 362→366, all bite-checked; 2 cycle-12 pins updated as part of the fix and re-bite-checked)
- A5   | Code.js, cn/, CLAUDE.md | ONE isDevInstance_ predicate requiring BOTH markers; assertDevInstance_ had the IDENTICAL hole (devScrubRoster_ could anonymize the LIVE roster) so both route through it; a downgraded run says why on the Admin self-test line
- A7   | Code.js | the export needs only HEADERS from the live tab, so a drained live tab no longer short-circuits the F1 archive read-through
- A10  | Code.js | submitQuizAttempt grades BEFORE the lock; rejections never take it. Completions dedup + post-append count deliberately stay inside
- FO-2 | styles.html | .export-btn-large off the inverted --ink primary V-8 retired (and off an INV-165-banned oklch mix)
- FO-3 | tc/script_clock.html | .shift-strip-head can wrap — V-4's inner wrap could not help a parent row with nowhere to wrap to
- FO-4 | Tests.js | _assertEq tells NaN from null via a stringify REPLACER (byte-identical for every non-NaN value — a recursive walker would have shifted ~300 unrunnable editor assertions)
- FO-5 | Code.js | removed two dead response fields + the orphaned helper/constant (supersedes batch 2's A8)
- Tests | test/client/run.js (+7 pins, 366→373, all bite-checked; 2 more existing pins updated as part of the fix)
- B5-1 | test/client/run.js, cn/, kb/ | GENERALIZED both a11y tripwires to A11Y_SCAN_PARTIALS (derived from PARSE_GUARD_PARTIALS) — the rule then surfaced 8 instances the hand scan missed; all 8 fixed
- B5-2 | CLAUDE.md | added a `### Visual Audit Stage` section to the Cycle Workflow Config (the visual lens as a standing /broad-scan stage — .claude/commands/ is template-synced, so it must live here)
- B5-3 | call-notes/, call-notes-legacy/, incoming/ (29 files) + Code.js, intake/, CLAUDE.md, README.md | DELETED the three frozen directories; provenance comments repointed at git history
- A13  | tc/script_manager.html (15), tc/script_clock.html (5), tc/script_timeoff.html (2), train/script_training.html (5), styles.html | 27 section-heading div/span → <h2> + UA-margin resets; measured pixel-identical
- Tests | test/client/run.js (373→375, both bite-checked), test/visual/a13-measure.mjs (new spot-measure tool)

## Pending / not yet done
- **CARRIED FROM CYCLE 12 — the operator deploy is still UNCONFIRMED**, and now
  also carries cycle 13 batches 1–2 and cycle 11's never-separately-deployed
  visual batch:
  1. `cd web-app && clasp push -f`
  2. Apps Script editor → Deploy → Manage deployments → Edit → Version:
     **New version** → Deploy
  3. Run `runAllTests()` in the editor — these execute ONLY there: cycle 13's
     `timeToMins_nullOnUnparseable` and the two renamed
     `metrics_cnCountNotesResult_*` tests, plus cycle 12's still-unrun
     `cn_enrolledSheetId_trimsAndNullGuards` and `cn_appendBounded_capsAndRollsBack`.
- **NEW OPERATOR ACTION (A5), DEV PROJECT ONLY: add Script Property
  `INSTANCE_IS_PROD=false`.** An unset value now reads as production, so without
  it devScrubRoster_/devShowConfig_ refuse and the nightly self-test drops to
  smoke (visibly — it says so on the Admin self-test line). PROD is unaffected.
- No cycle-13 finding remains unimplemented.
- /sync-docs has RUN (commit adb2ee7) and every later batch applied its own doc
  edits. No documentation work is outstanding.

## Open follow-on items
- A11 correction: the CN composer tabs already carried role="tab" + aria-selected;
  the scan over-claimed that instance. Only aria-disabled was missing (added).
- **FO-6 (the remaining TimesheetArchive readers) — ANALYSED, DEFERRED, and the
  analysis is the point.** They are NOT one job:
    • buildTimesheetForEmployee_ (employee calendar + manager timesheet) and
      getPunctualityReport SHOULD read through, behind the same "only when the
      window predates the live floor" gate the export uses — otherwise an
      archived month renders blank. ~M (½ day): shared helper + dedup + tests.
    • tsDoctorScan_ must NOT read through. fixTimesheetDuplicates deletes rows by
      LIVE-tab index, so surfacing archived duplicates would report findings the
      fix cannot act on and risks acting on the wrong index. That is an operator
      design decision, which is why it was not folded into batch 3.
  Nothing is currently broken: archival is OFF by default and the ≥120-day floor
  keeps recent data live.
- The 16-site `getSheetByName(CONFIG.ADP_TAB)` inventory taken during the FO-6
  assessment is worth keeping — most sites are writers or recent-window
  dashboards that correctly stay live-only; only the two readers above qualify.

## Decisions made (so the next session doesn't re-litigate)
- timeToMins_ returns **null**, not 0 or -1 — callers already had explicit
  null/"not computed" branches, and null is the only sentinel that fails LOUD
  in a comparison while NaN fails silently.
- A corrupt LUNCH pair drops the deduction rather than voiding the day. Voiding
  it would turn one bad cell into a lost 8-hour day.
- An unparseable day in buildTimesheetForEmployee_ counts as INCOMPLETE, not as
  0 hours — the latter would understate payroll silently.
- `.m-layout` stacks at 720px (not 540px) so the split collapses before either
  column gets narrower than the 42px hero numeral. `.telemetry`/`.coach-kpis`
  go 2×2 at 540px, matching their existing compact geometry.
- errorStateHtml_ call sites DROP the outer esc() — it escapes internally, so
  keeping esc() would double-escape.
- Every new pin was bite-checked. Three failed to bite first time and were
  tightened; that step is not optional and caught all three.
- A4 DELETED the wrapper rather than keeping it with a comment: leaving a
  0-on-error helper under the obvious name is what the finding was.
- A8 was fixed even though it is LATENT (no client reads the field). The shape
  was wrong and a future reader would inherit the confident zero; the dead field
  itself is a separate, out-of-scope change.
- When a fix breaks an existing pin, UPDATE the pin as part of the fix and
  re-bite-check it — batch 2 broke two cycle-12 pins (F5's delegation clause,
  F3-sibling's literal break match) and batch 3 broke two more (the A8 helper
  pin, the F18 pendingList clause). All four were repaired deliberately.
- A5 fixed the SHARED predicate rather than the one caller named in the finding:
  assertDevInstance_ had the identical hole and guards a roster mutator, so
  patching only the self-test would have left the worse instance open.
- A5 accepts a real cost — an existing dev project must add INSTANCE_IS_PROD
  =false or its tooling refuses — because the alternative is a labelled PROD
  that anonymizes its own roster. The refusal is loud and names the property.
- FO-4 used a JSON.stringify REPLACER, not a recursive walker: the walker also
  changed how `{a: undefined}` compares, a semantics shift across ~300 editor
  assertions that cannot be run outside the Apps Script editor.
- FO-5 SUPERSEDES batch 2's A8 (which hardened a helper that turned out to be
  dead). Recorded rather than hidden — the honest end state is that the path
  should not exist.
- B5-2 put the Visual Audit Stage in CLAUDE.md, NOT in
  `.claude/commands/broad-scan.md`: that directory is verified byte-identical to
  claude-workflow-tools v1.23.0, so a local edit would be silently reverted by
  the next /sync-commands.
- B5-3 deleted the three frozen directories rather than continuing to carry
  them. Frozen Subsystems is now a deletion RECORD, so the reasoning survives
  the files; two source comments were repointed at git history (last present as
  of 9586b29) rather than dropped.
- A13 converted with a balanced-tag depth walk, not a closing-tag regex, and was
  verified by MEASURING rather than reasoning. `.tr-card-title` is unreachable
  by the scenario matrix, hence `test/visual/a13-measure.mjs`.
- That measurement was WRONG first: measured in a plain div it reported
  `display: inline -> block`, which is a fixture artifact (both classes live in
  flex heads, which blockify any child). Re-measured in the real parents: all
  three identical. Recorded in the harness README.
- `.kicker` stays a div (an eyebrow above a heading is not a heading) and
  `.rail-card` was already `<h4>` — neither is an A13 omission.

## Where I left off
**Cycle 13 is CLOSED.** All five batches plus every open follow-on are
implemented, tested (375 pure + 66 DOM + 20/20 visual, all green), documented,
committed and pushed to `claude/broad-scan-yhkbe2`. /reflect has run:
net 9 − 1 = 8, block at `.cycle/blocks/13-a-reflect.md`, metrics + estimates
appended, seam counter now 3 of 4. It CORRECTED the batch self-reports in two
directions (B5-1's eight ARIA instances promoted to a production fix; A5's
dev-config requirement counted as a Low new failure mode) — same net, different
composition, so a verifier should use the reflect block's tally, not the
implementation blocks'. INV-177/178/179 are proposed but NOT yet written to the
library (that is /sync-docs' job).

Next: the operator has approved **Phase 0 of the CDR sub-queue work** — a
read-only queue inventory added to the existing Automation Health CDR block
(distinct QUEUE_EXT values, distinct A_Q_* sentinel names, populated Transfer
H:R headers, rows-per-agent-per-date). Scope for the whole feature is
MANAGER-ONLY (so no INV-124 anonymization work), and the chosen view shape is
expandable per-queue rows PLUS segmented contribution bars. Phase 0 is a GATE:
if DQE turns out to be one row per agent per day, per-queue rep attribution
does not exist in the data and the design must change — come back to the
operator rather than silently redesigning.

TWO operator actions still gate delivery of cycles 11–13: the carried deploy and,
on the DEV project only, adding `INSTANCE_IS_PROD=false`.

## Cycle-12 history (closed 2026-07-27 — broad scan + the first VISUAL/UI-UX
##   addendum; all 27 findings shipped across six batches; PR #143 merged on
##   green CI (3ad80d8); net score 11 = 13 prod fixes − 2 Low fail-safe.
##   OPERATOR DEPLOY NOT YET CONFIRMED at close-out — carried forward into
##   the cycle-13 STATE as pending work, not lost here)
## Current
Cycle: 12
Phase: reflect DONE (2026-07-27) — all batches implemented (1: F1–F5 ·
       A: V-1–V-3 · B: F15/F9/F7/F6/F10 · C: F14/F16/F18/F11/F3-sibling ·
       D: F17/F12/V-14/V-5/V-6/V-7 · E: V-4/V-8/V-9/V-10/V-11/V-12);
       net score 11 = 13 prod fixes − 2 Low fail-safe failure modes.
       ONLY remaining: the operator deploy (clasp push -f + New version +
       editor runAllTests). Cycle closes when that is confirmed.
Scope: broad (fresh broad scan + an operator-requested VISUAL/UI-UX addendum)
Test Command: manual
Subsystem cycles since last Seams audit: 2 (cycle 11 was the seams audit; /reflect increments — cadence is every 4, so 2 more subsystem cycles before the next Seams audit is due)
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

## Cycle-11 history (closed 2026-07-24 — seams audit; PR #141/#142 merged;
##   operator deploy of the follow-up visual batch still pending at cycle-12 open)
## Current
Cycle: 11
Phase: idle — cycle 11 closed + follow-up visual batch 2 implemented (2026-07-24); pending: PR for the follow-up batch + operator deploy (clasp push -f + New version + editor runAllTests)
Scope: broad (the DUE Seams & Invariants audit — seams counter was 4)
Test Command: manual
Subsystem cycles since last Seams audit: 0 (cycle 11 WAS the seams audit — reset confirmed by /reflect 2026-07-24)
Updated: 2026-07-24

CYCLE 11 AUDIT (2026-07-24, seams-audit lens): 8-agent fan-out (7 subsystem
auditors + 1 cross-cutting seams specialist) + personal verification of every
Medium (0 retracted). ~170 invariant checks against live code — ZERO
substantive drift (every PARTIAL was doc wording: INV-18 anchor rule, INV-23
audit-ordering claim, INV-01/30 "all mutating" overbreadth re lock-free
intake sends). Complete seam sweeps CLEAN: 158 RPC names all resolve, 16
enum-header pairs aligned, 16 triggers wired+gated, 42 script properties all
documented, no write-format/parser pair that fails to round-trip. Findings:
0 Critical / 0 High / 4 Medium / ~30 Low (4th consecutive no-High cycle; the
weight moved into the TEST LAYER — 3 of 4 Mediums are test-integrity).
MEDIUMS: M-1 updateTimeOffStatus lacked the INV-94 dup-date guard on the
to-Approved transition (Denied-to-Approved flip alongside an existing
Approved row double-deducts — the last creator of the H1 signature); M-2
the public-form test's FormSubmissionReceived witness row (synthetic actor
'EXTERNAL', Code.js:7748) escaped the TEST_ cleanup key — every full
runAllTests permanently appended one to the live AuditLog/compliance panel;
M-3 test_training_quizFlow writes the LIVE Quizzes tab and cleanupTestData
never sweeps Quizzes (a timeout-killed run orphans TEST_TRAINING_QUIZ into
the real manager quiz list); M-4 the registry-net/DOM partial lists are four
hand-maintained copies (run.js x3 + dom/boot.js PARTIALS) — only
PARSE_GUARD_PARTIALS is auto-tracked. KEY LOWS: L-1 sanitizeEmailSelections_
passed the four *Details objects through unbounded (SubformData cell
poisoning); L-2 the CSR Transfer tab had NO header validation (cross-repo
seam, silent wrong Transfer KPI on a column reorder); L-3 getMyMetricsRange
cached a failed trend read as fresh for the TTL; L-4 audit-panel truncated
flag false-negative on a CN-empty scan window; L-5 CN.EMAILED_AT raw-read
coercion sibling (untripwired); L-6 fields-only doc completion emails
"Signed"; tripwire false-pass holes (payload-contract nested-brace regex,
SUBMITTED_AT one-variable aliasing, no-mail-in-lock finally region +
depth-1 transitivity, registry nets single-quote-only); MIRROR_INDEX misses
3 documented mirrors (errBeacon caps hardcoded, KB_IMG cap unguarded,
CN_INTERACTIVE_FORM_IDS unindexed); behavioral-coverage gaps on
writeWitnessAuditLog_/health badge/self-test parse/typed signature
(presence-pins only). DOC DRIFT: admin endpoint count 24/28/30 across
CLAUDE.md sections; "fifteen" vs 14 itemized localStorage keys; umsLastView
compact-guard missing from the key list; TimesheetArchive health caption
says 1am (trigger is 6pm); stale "manager-gated" wording on the INV-136
amended endpoints; What's-new "X" button claim. Scan scores: Overall 8.5,
Correctness 8, Security 9, Data Integrity 8.5, Tz 8.5, Concurrency 8.5,
Test Coverage 7.5, Docs 8, GAS Practices 8.5, MgrUX 8, EmpUX 8.5,
Automation 8.5.

BATCH 1 IMPLEMENTED (M-1, M-2, L-1, L-2, L-3 — operator-selected):
- M-1 | Code.js | hasActiveTimeOffOnDate_ gained optional excludeRowIndex;
  updateTimeOffStatus re-runs the dup-guard (own row excluded) before the
  to-Approved deduct. Editor test test_updateTimeOff_dupApproveRejected
  (registered; Utilities.sleep(1100) keeps the two rows' SubmittedAt keys
  distinct; SUBMITTED_AT reads via normalizeAuditTs_ per the tripwire) +
  a Node source pin.
- M-2 | Tests.js | _deleteFormWitnessAuditRow_(token) called from
  test_publicForm_tokenLifecycle's finally; cleanupTestData now sweeps
  (a) FormSubmissionReceived audit rows containing 'example.invalid' and
  (b) orphaned FormTokens/FormSubmissions rows by the same reserved test
  domain (getSheetByName only — never provisions). First post-deploy
  cleanup also removes the LEGACY accumulated witness rows.
- L-1 | Code.js | CN_EMAIL_DETAILS_MAX_CHARS=16000 combined serialized cap
  enforced in validateEmailSelections_ (fires at Preview AND Send);
  sanitizeEmailSelections_ coerces non-object details to null. 3 behavioral
  Node tests (oversize rejected, normal passes, coercion).
- L-2 | Code.js + cn/script_callnotes.html | CSR_TRANSFER_EXPECTED_HEADERS
  (1-indexed = CSRT+1) + pure csrTransferHeaderMismatches_ + session-flagged
  validateCsrTransferColumns_ (the validateCdrColumns_ pattern); wired into
  getCsrTransferPerRepDaily_ (additive meta.columnWarning) and Automation
  Health (cdr.transferColumnWarning; client CDR card tone + a warnBox).
  3 behavioral Node tests + a CSRT-alignment pin + a MIRROR_INDEX entry.
- L-3 | Code.js | getMyMetricsRange: trendFailed marks the round; the cache
  put is gated on !trendFailed; response carries trendUnavailable:true
  (additive, client-ignorable). Node pin on both halves.
Tests: pure 319->327 /0, DOM 65/0, node --check x3 clean. One test-authoring
fix mid-batch: vm-realm array vs deepStrictEqual (switched to .length).

BATCH 2 IMPLEMENTED (M-3, M-4, L-4..L-18, tripwire holes, MIRROR_INDEX):
- M-3 | Tests.js | test_training_quizFlow wraps _withTestKb_ (fixture, not the
  live KB store); cleanupTestData sweeps TRAIN_QUIZ_TAB (live, TQ.TITLE) +
  fixture Quizzes/QuizAttempts (the F-7 gap).
- M-4 | run.js | REGISTRY_SCAN_PARTIALS derived from PARSE_GUARD_PARTIALS
  (minus index/form_public/icons) replaces the 3 hand lists; a new test
  tracks dom/boot.js PARTIALS against it. One derived source, auto-tracked
  via the existing index.html net.
- L-4 | Code.js | cnReadCallNoteAuditRows_ returns oldestScannedDay (window
  oldest, not oldest matching); getCallNotesAuditLog truncated keys off it.
- L-5 | Code.js + run.js | callNoteRowToObject_ emailedAt via
  cnTimestampString_; the INV-142 global scan extended to [CN.EMAILED_AT].
- L-6 | Code.js | notifyEmpDocSigned_(doc, signer, completedOnly) — a
  fields-only completion emails "Completed:", not "Signed:".
- L-7 | Code.js | kbGetUsageStats title join drops drafts (2 thin column
  reads — no BodyMd pull).
- L-8 | metrics/script_metrics.html | SPANISH_STATE.listSeq on the pending +
  resolved list loaders (INV-156 parity with the M-6 stats fetch).
- L-9 | form_public.html | updateFormProgress_ skips hidden conditional
  required fields (offsetParent guard).
- L-10 | script_tour.html | tourVisibleTarget_ — poll + paint require a
  VISIBLE (non-zero-rect) match; first visible wins on multi-match.
- L-11 | Code.js + Tests.js | TIMEOFF_MAX_DAYS_AHEAD=370 / _BACK=90 horizon
  in BOTH submit paths (rep tz / target tz); rejectsBadDate test extended.
- L-12 | Code.js | getIntakeSS_ memoized per execution (getAdpSS_ L-3
  pattern; test override never memoized).
- L-14 | Code.js | deletePunch keeps the personal-sheet mirror when a
  duplicate row of the same (emp,date,type) survives; dashboard canDelete
  backward-only (Math.abs dropped — matches C7).
- L-15 | script_core.html | mtRenderTable_ sortable-header onclick uses
  identifier-charset sanitization (not HTML-entity escaping in a JS-string
  context).
- L-16 | Code.js | archiveSheetRowsOlderThan_ preserves trailing columns
  (width = max(canonical, widest row)) + grows the archive grid if needed —
  INV-132 "never lose" now holds for hand-added columns.
- L-17 | cn/script_callnotes.html | TimesheetArchive health caption 1am→6pm.
- L-18 | Code.js | getFeatureFlags/getDeptRequestSla KEPT by decision with
  comments (they delegate to the same helpers getAdminConfig uses — no
  parallel logic; removal would churn gate tests/INV-136 for zero risk).
- Tripwire holes | run.js | payload-contract: balanced-brace + depth-masked
  key extraction (nested objects no longer hide keys — bite-checked);
  SUBMITTED_AT: new line-whitelist scan over Code.js+Tests.js (alias-proof —
  bite-checked); no-mail-in-lock: region ends at releaseLock() (finally
  pre-release now scanned) + TRANSITIVE sender closure over
  notifyAfter-stripped bodies (bite-checked with a wrapper pair); registry
  nets accept double-quoted literals.
- MIRROR_INDEX | run.js | +3 entries (CN_INTERACTIVE_FORM_IDS, errBeacon
  caps, KB_IMG cap); errBeacon test extracts CLIENT_ERR_MSG_MAX/STACK_MAX
  from Code.js (was hardcoded 400/1500); NEW guard test evaluates the kb
  paste-cap expression against KB_IMG_UPLOAD_MAX_CHARS.
Tests: pure 327->330 /0 (net of consolidations), DOM 65/0, node --check x3;
3 tripwire bite-checks fired + restored (python edits, no git checkout).

VISUAL AUDIT ADDENDUM (2026-07-24, operator-requested "option B"): a
static-render harness (session scratchpad visual/: production partials
inlined into one page, real headless Chromium via Playwright, fixture-backed
google.script.run mock, 20 scenarios = 8 views x light/dark x wide/compact/
mobile, frozen mid-shift clock). Findings V-1..V-10 (1 Medium, 6 Low, 3
Info); two apparent horrors PROVEN artifacts (off-viewport fixed drawer in
fullPage captures; fixed mobile nav stitching). BATCH 3 IMPLEMENTED
(V-1, V-5, V-6, V-7):
- V-1 | styles.html | `.app-shell > * { min-width: 0; }` — the shell main
  column's min-width:auto let note-card nowrap min-content force the 480px
  compact pop-out / 390px mobile to ~822px horizontal scroll (save rail +
  flags off-screen). Fix probe-validated pre-edit AND re-verified post-edit
  in the real partials: scrollWidth 822 -> 480, zero wide elements, ellipsis
  engages; wide mode re-shot unchanged. The shell-level twin of the
  Dashboard minmax(0,1fr) decision.
- V-5 | cn/script_callnotes.html | icon-label gap CSS for the Save &
  Compose / Open Email / Clear inner spans (icon+text share one span; the
  button's own flex gap never applied inside it).
- V-6 | script_core.html | TOOLS.develop gains shortLabel 'Training';
  mobile nav renders shortLabel || label (the full label wrapped 3 lines in
  the 7-item 390px bar). Sidebar keeps the full label.
- V-7 | script_core.html + styles.html | sb-user-id span + nowrap/ellipsis
  (the id wrapped mid-token "E-"/"1042" at the 168px default sidebar).
NOT implemented (visual backlog for a later pick): V-2 ribbon label
collision, V-3 coaching metrics undefined-guards, V-4 coaching ack raw
T-timestamp display, V-8 metrics hero dead space, V-9 reference tree row
wrap + full-width DRAFT pill, V-10 tz-chip wrap (verify on prod data).
Harness stays in the session scratchpad; committing it as test/visual/ was
offered, not yet requested. Tests: pure 330/0, DOM 65/0 after the batch.

## Pending / not yet done
- /reflect (close the cycle; resets the seams counter), PR + operator deploy.
- DONE 2026-07-24: the /sync-docs pass — doc-drift list (admin count 24/28/30, "fifteen" vs
  14 localStorage keys, umsLastView compact-guard, INV-23/18 wording,
  INV-94/129/132/142 amendments from batches 1+2, INV-136 stale
  "manager-gated" annotations, example.invalid cleanup key, Transfer-tab
  validation operator note, What's-new X-button claim).
- Behavioral pins for witness-loss/health-badge/self-test parse (coverage
  gaps CG-1/2/5) — deferred, noted as follow-on.

## Decisions made (so the next session doesn't re-litigate)
- M-1 guard excludes the row's own index — approving a lone Pending row is
  unaffected. Legacy pre-INV-94 half-day pairs with a still-Pending sibling
  now require denying the sibling first (fail-safe; matches the submit-path
  semantics, which already block creating such pairs).
- M-2 sweep key = the reserved-TLD recipient domain 'example.invalid'
  (production-impossible); chosen over changing the witness row's actor
  (production code stays untouched).
- L-1 cap is COMBINED (16k across the four objects) and rejects loudly at
  validate (both Preview and Send) rather than truncating silently.
- L-3 still returns the degraded result for the current render — only the
  cache write is skipped (retry on next open).

FOLLOW-UP VISUAL BATCH 2 (2026-07-24, post-reflect, operator-selected — commit
0779689 on the restarted branch after PR #141 merged): the remaining visual
backlog + harness adoption. (1) test/visual/ ADOPTED into the repo — the
static-render harness (build.mjs include-inliner, mock.js fixture-backed
google.script.run proxy, shoot.mjs 20-scenario matrix, README, gitignored
generated files; manual/on-demand like the editor suite, NOT in CI). Fixture-
fidelity rule established: fixtures MUST mirror the real server contract — two
fixture-shape bugs found and fixed (coachAnalytics_ shape; lastPunchTimeMgr is
raw HH:mm:ss, dispTime formats it). (2) V-2 day-ribbon greedy two-row label
stagger (the daily LunchOut/LunchIn collision; 3+ clusters degrade to bar-only
.collided; .ribbon 60->74px, track top 18->32; compact overrides fully
re-specify so compact untouched). (3) V-3 coachNum_ null-guards on the coaching
analytics KPIs + per-rep table (the 'undefined%' class). (4) V-4 acknowledged
timestamps .replace('T',' ') at both sites. (5) V-8 .m-layout align-items:start
(natural heights, the .dash-trk precedent) + hero spark 60->84px; deliberately
NO vector-effect:non-scaling-stroke (it moves the section-4 draw-in dasharray to
screen space where --len:600 under-runs — documented in-file). (6) V-9
.kb-item-line wrapper span in the tree render (the column-flex .kb-item stacked
icon over title + stretched the DRAFT pill full width). (7) V-10 REPRODUCED on
fixtures: .tz-chip flex-wrap:wrap + .seg white-space:nowrap — segments never
break internally, the chip wraps BETWEEN segments (offshore two-seg chips on
narrow live-status cards). Verified: pure 330/0, DOM 65/0, node --check x3,
full 20-scenario matrix 0 missing fixtures / 0 real errors, before/after
renders for every fix, compact clock byte-identical. Batch reflect tally
(in-summary, NOT a metrics row — /reflect stays the sole writer): 3 prod fixes
(V-2, V-9, V-10) - 0 new failure modes = +3; V-3/V-4 reclassified DEFENSIVE on
the implementation read (the live server always sends the full coachAnalytics_
shape, and coaching timestamps read back SPACE-form via trainCellTs_ — both
'undefined%' and the 'T' were fixture-shape artifacts; the guards protect
partial/legacy/future shapes); V-8 + harness = polish/structural. PROCESS NOTE: the first checkpoint of this batch truncated
STATE.md's rolling history (tail-replace at the FIRST '## Where I left off' in
a file with many historical ones) — repaired same-session from the parent
commit; STATE.md edits must locate the CURRENT section by position, never by
first-occurrence heading search.

## Where I left off
Cycle 11 fully closed (audit -> batches 1+2 -> sync-docs -> visual batch 1 ->
reflect -> PR #141 MERGED) + follow-up visual batch 2 (V-2/3/4/8/9/10 +
test/visual harness adoption) implemented, verified, and pushed on the
restarted claude/broad-scan-seams-audit-88ihg0. Next: PR for the follow-up
batch when the operator asks; then the operator deploy (cd web-app && clasp
push -f + New version + editor runAllTests — retro-purges legacy EXTERNAL
witness rows + TEST_ quiz orphans). The V-backlog is fully cleared. Next audit
cycle is 12 (seams counter 0/4).


## Cycle-10 history (closed 2026-07-24 — deployed, runAllTests passed, triggers re-run)
Original audit record: broad scan (7-agent fan-out + personal verification;
0 Critical / 0 High / 11 Medium / ~35 Low, all 11 Mediums confirmed, 0 retracted).
TOP-5 BATCH IMPLEMENTED on claude/broad-scan-11m0vf: M-1 (recordPunch live
sequence guard via getNextActions_ + findExistingPunch_ last-match +
managerSaveDay duplicate collapse), M-2 (Day Edit picker bounds in the TARGET
rep's tz; liveStatus ships `timezone`), M-3 (cnReRenderActiveView_ re-renders
the pinned tray; tray render edit-snapshot-safe), M-5 (intake store cell caps
pre-send + storeWarning + IntakeStoreFail audit row + client warn toast), M-6
(seq tokens on mLoadMyStats_/mLoadTeamMetrics_/spanishLoad_). Also applied the
/setup-cycle delta (Seams Audit Cadence = every 4 subsystem cycles; infra files
assigned to Server/Test Suite; form-generator frozen entry). Pure 307/0 (5 new
pins, 2 bite-checked), DOM 61/0, node --check ×3 clean; editor suite +2 tests
(recordPunch_liveSequenceGuard, managerSaveDay_collapsesDuplicateRows;
test_recordPunch_basic gained a _clearTestState — the sort test's today-rows
now correctly trip the new guard).
BATCHES A+B ALSO IMPLEMENTED (same branch): A = M-4 (History edit-snapshot
preservation), M-7 (KB convert identity guards — KB_EDIT object-ref +
view/no-open-editor checks), M-8 (Admin Sheets pane loads on the enter path),
composer Preview instance+in-flight guard. B = M-9 (_withTestKb_ via
TEST_KB_SS_ID fixture + createPinnedSpreadsheet_; 3 KB-writing tests wrapped;
cleanupTestData backstops for KB/KbRevisions live+fixture, HR Coaching +
EmpDocTemplates; HR fixture now factory-pinned), M-10 (2 DOM pins:
stacked-dialog topmost Escape — bite-checked on the real guard — and
drawer-Enter exemption), M-11 (5 editor tests: getMyMetricsRange,
appendCallNoteFeedback, getMyNoteHourBuckets, getPatientTimeline,
deptRequest resolve-link idempotency), tripwire hardening (=(?!=)
comparison-read fix in both coercion scans; GmailApp.sendEmail in the mail
inventory; INV-01 finally/releaseLock structural scan — closes the mail-scan
no-finally hole). Pure 307/0, DOM 63/0, editor suite +7 tests total this
cycle. NOTE for operator: the first post-deploy runAllTests creates a
TEST_KB_Fixture spreadsheet (Script Property TEST_KB_SS_ID) in the deployer's
Drive — expected, one-time.
BATCHES C+D ALSO IMPLEMENTED (same branch): C = C1 reconcile Timestamp
recovery via cnTimestampString_ (INV-142 now strictly true; the scan's
reconcile whole-line exemption REMOVED), C2 exportAdpRange validation, C4
witness-audit reliability (writeAuditLog_ returns outcome; writeWitnessAuditLog_
retry + WITNESS_AUDIT_FAILS property; surfaced in computeAutomationHealth_
+ failure digest (48h recent window) + Admin panel), C5 cleared-{} tax/
suggestion configs stay empty, C6 clientErrorsSummary_ skips malformed ts
rows, C7 deletePunch backward-only window, C8 getTeammateStatus auth before
flag, C9 kbGetRelated column-bound, C10 CDR >95KB cache-put skip, C11
punchTrend roster filter, C12 export-failure email carries the created
sheet URL. C3 RETRACTED (calcHours_ overnight wrap is deliberately pinned
by test_calcHours_overnight — the audit's "unsupported" premise was wrong);
C13 hash delimiters DEFERRED (needs a dual-verify back-compat design on the
attestation paths). D = D1 PTO-reject keeps the day modal open, D2a
dashboard/extras failures keep last-good + never stamp fresh, D2b stranded
"Working…" restore + warn toast on failed post-punch refresh, D3 MGR_STATUS
unknown-enum fallback, D4 adjust-modal min via mgrAddDaysIso_, D5
Coverage/Punctuality default-range day-rollover (defaultDay marker; user
ranges stick), D6 hover-timer document.contains guard, D7 esc() drift
(spark labels, myDate, analytics bars, covDayRisks_), D8 umsLastView
compact-guard, D9 dispTime full escape, D10 beacon Object.create(null),
D11 What's-new star in BOTH sidebar + mobile header, D12 tour Escape
stopImmediatePropagation, D13 MOTION_IO unobserve on nav. Pure 309/0
(2 new grouped pin tests), DOM 63/0.
BATCHES E+F ALSO IMPLEMENTED (same branch) — THE ENTIRE CYCLE-10 BACKLOG IS
NOW DONE. E = E1 umsCallNotesLastDept revived (seeds inside the subformData
branch when the note has no departments), E2 send-success merge whitelisted
to the 9 sanitizeEmailSelections_ keys, E3 ?prefill one-shot consumption,
E4 external tab-strip re-render on note-link (CN-8 ext-draft asymmetry
KEPT-BY-DECISION, doc'd in INV-84), E5 pin-at-capacity client no-op, E6
duplicate mgrSearchField removed, E7 retention-panel error line, E8
storage-pill double-escape, E9 dead Team-Notes loader removed, E10 PPD
agents-hop view guard, E11 KB landing loaders fail-loud (loadFailed →
distinct failure lines for Most-used/Review-due/Content-requests), E12
quiz-analytics failure degrades to panel-level (not whole-view), E13 quiz
submit updates checklist state before the modal-identity guard, E14 PPD
seed label 46 + stale tooltip comment, E15 drawer-search toast open-guard.
F = /sync-docs (Spanish endpoints out of the manager-only list + 4 Code.js
docstrings; What's-new comments match the no-auto-open decision; INV-07/84/
111/113/122/128/142 amendments; the M-1 state-machine gotcha incl. the C3
overnight-wrap decision note; testing gotcha + _withTestKb_; TEST_KB_SS_ID +
WITNESS_AUDIT_FAILS operator entries; Test Command cycle-10 paragraph;
punchTrend 8-bars; NEW INV-155–158), PROJECT_HEALTH.md rolled forward
(cycles 8+9 rows + cycle-10 standing), STATE.md literal NUL bytes replaced
with the six-char backslash-u0000 escape TEXT (greps as text again — and
NOTE: this checkpoint's own first edit reintroduced one by emitting the
escape as a literal; if you write about NULs, write the WORD, never the
sequence). Pure 309/0, DOM 63/0.
BATCHES G+I ALSO IMPLEMENTED (same branch) — the a11y/visual follow-on from
the 2026-07-23 accessibility + visual audits. G (a11y quick wins) = G1 the 7
CN .ce note fields + tag input dropped positive tabindex 1–8 (now tabindex=0 /
natural order; Enter-nav via CN_FIELD_NAV_ORDER is JS-driven and unaffected),
G2 role=textbox + aria-label per .ce field (aria-multiline on Issue/
Resolution), G3 global :focus-visible ring (styles.html, --ring-focus;
#view-area exempted; form_public carries its own copy — it doesn't include
styles.html), G4 role=dialog + aria-modal on ensureOverlay AND uiConfirm/
uiPrompt (aria-labelledby via _uiDialogSeq title ids), G5 role=alert on
error toasts / renderError / form_public #form-error, G6 aria-hidden on the
3 metrics chart-SVG builders + role=status on renderLoading, G7 label
associations (training-q for=, tag-input + intake custom-email aria-label,
form_public sig-date for=), G8 #view-area is now <main tabindex=-1> + a
.skip-link in renderShell (class selectors unchanged; DOM harness green —
boot.js skeleton only carries #app, renderShell builds the rest). I (visual
defects) = I1 flag-training stripe var(--accent)→var(--info) + the
.cn-act-btn.training.is-on bg →var(--info-soft) (training no longer renders
the same green as review), I2 hardcoded-hex fixes (.cn-act-btn.is-on
#fef3cd/#856404 → warn-soft/warning-deep — dark mode now correct; sf-oop
#e67e22 → var(--intake-pmd); .intk-prev #fff KEPT + documented as deliberate
— it hosts rendered EMAIL HTML with inline light-palette hex, a dark canvas
would be unreadable), I3 --muted-2 darkened to AA on every surface both
modes (light #737c8c→#5f6878 ≥5.0:1; dark #6c7587→#7b8496 ≥4.58:1;
--muted-3 documented decoration-only + 11 text-usage sites swapped to
--muted-2 across cn/styles/intake/kb/manager; 4 genuine decoration uses
kept), I4 refreshViewIfCurrent passes the tool's sidebarIcon to
renderLoading (Role-A parity — mutation refreshes no longer leak the legacy
spinner) + 6 modal spinners (cn ×3, train ×2, empdocs ×1) converted to
Role-D lo-dots with role=status. Two NEW run.js tripwires, both
bite-checked: the --muted-2 AA contrast pin (parses the token file, computes
WCAG ratios vs paper/paper-2/paper-card in both modes — failed on the old
dark value) and the CN flag-stripe exact-token pin (action=--warn,
training=--info, review=--good; name-distinctness alone could NOT catch the
regression since --accent aliases the --good green — first bite-check
exposed this, pin tightened to deepStrictEqual). Pure 311/0, DOM 63/0,
node --check ×3.
BATCH H ALSO IMPLEMENTED (same branch) — a11y structural. H1 calendar day
cells are keyboard-accessible (role=button + tabindex=0 + a state-summary
aria-label on cells with content; Enter/Space pins the day modal via a
per-cell keydown in bindCalHover_ — hover semantics untouched). H2 overlay
focus lifecycle: ensureOverlay stashes the trigger on a closed→open
transition and defer-focuses the first focusable INSIDE the dialog (skipped
when the module already placed focus inside, or for hover-mode);
closeOverlay restores the trigger ONLY when the overlay actually closed
(the INV-145 refuse-to-close guard is honored — new DOM pin);
uiConfirm/uiPrompt cleanup also restores the trigger. H3 mtRenderTable_
sortable headers: scope=col on every th, tabindex=0 + aria-sort
(ascending/descending/none) + Enter/Space activation on sortable ones
(pure pin added). H4 color-only calendar dots got SHAPE cues (worked =
square, pending = hollow ring, denied day-number struck through; legend
mirrors). H5 the 10 bare <h2> view titles (metrics ×3, kb, coaching,
empdocs ×2, training, manager Coverage + Punctuality) promoted to
<h1 class="view-title"> — consistent hierarchy + display-font typography;
the three title-rows with a description <p> now stack title+p in a left
column (was flex-spread). Pure 312/0 (mtRenderTable_ a11y pin), DOM 65/0
(2 new: focus-lifecycle — bite-checked — and INV-145 no-restore-on-refusal).
BATCH J ALSO IMPLEMENTED (same branch) — visual elevation. J1 empty-vs-ERROR
distinction: the three empty-state classes (.cn-stack-empty/.cn-sf-empty/
.m-empty) restyled as quiet dashed cards; NEW shared errorStateHtml_(msg)
(script_core — warn-toned .error-state card + warning glyph + role=alert,
ESCAPES INTERNALLY so callers pass the raw message) adopted at the 11 CN
sites that previously rendered res.error/Failed: into the empty style
(the "load failed reads as no data" class E11 fixed once already);
renderError (boot) gained a Retry (location.reload) button. J2 public-form
polish (form_public.html): warn-triangle glyph on the error screen tinted
per state (danger vs expired-warn), a live "N of M required fields
completed" progress cue (radio/checkbox groups count via :checked — a
value-check counts them done immediately, caught in-session), a
security-reassurance lock line above Submit, and a logo text-fallback via
img onerror. J3 (scoped): --text-xs/sm/base/lg/xl type-scale +
--radius-pill declared in the tokens partial and adopted in every rule this
batch touched; styles.html literal radii tokenized (8× 6px→--radius-sm,
18× 999px→--radius-pill — byte-equivalent). The .chip base extraction /
20-pill consolidation DEFERRED as follow-on (visual-regression risk with
zero coverage — the L-effort half of the item). J4 mono-uppercase dialed
back on the four secondary-label families (.card-label, CN .cnv-row/.cnv-trio
.lbl, .cn-stat-lbl, .rail-card h4 → sentence-case var(--ui), sizes onto the
new text scale); kickers/chips/table headers KEEP the mono-uppercase
register by design. Pure 312/0, DOM 65/0, node --check clean.
BATCH K ALSO IMPLEMENTED (same branch) — 3 of 4 code suggestions. K-E shell
health dot: the digest's failure derivation is FACTORED into
automationProblems_(report) (ONE source — digest + badge can't drift); NEW
getAutomationHealthBadge() (MANAGER-gated {failing,count}, 10-min org-wide
CacheService result, best-effort — any failure returns {failing:false}
silently since the digest/panel are the backstops); the shell polls it
every 10 min for managers (startHealthBadgePolling_, boot +8s off the
critical path) and lights a danger .sb-health-dot on BOTH Manage nav
buttons (data-tool selectors — the badge-selector gotcha). Detector-wiring
tripwire UPDATED to pin the factored shape (helper covers detectors/
witness/sync/reconcile/stale-digests; digest AND badge consume it; badge
manager-gated); editor omnibus gained the getAutomationHealthBadge
'Manager access' case. K-D mirror registry: NEW self-checking MIRROR_INDEX
in run.js — all 13 known parallel-source mirrors in ONE place, each naming
its live guard test (a renamed/deleted tripwire breaks the index —
bite-checked); plus the previously UNGUARDED AUTO_COPY_FORMAT
server-default ↔ client-fallback mirror got its first machine check
(concat-literal parse + byte compare — bite-checked); CN_EMAIL_PALETTE
stays a documented manual-discipline entry. K-B: kbRecordView +
recordClientError moved from the GLOBAL ScriptLock to LockService
.getUserLock() (fire-and-forget single-appendRow logs must never queue
punch/note writes; user lock still serializes one rep's double-fires;
INV-01 finally-release scan still passes — INV-117/150 wording needs a
/sync-docs amendment). K-A (editor suite → CI via Apps Script API /
clasp run) DEFERRED — operator-side auth setup (API enablement + OAuth
creds as GitHub secrets) can't be done from the repo; plan noted in the
batch summary. Pure 314/0 (2 new tripwires bite-checked), DOM 65/0,
node --check ×3.
BATCH L ALSO IMPLEMENTED (same branch) — data-integrity follow-ons. L1
SHEET DOCTOR (the getPtoReconciliation/fixPtoReconciliation pattern on the
Timesheet): tsDoctorScan_ (92-day window, two-row header, normalize*
coercion discipline) + getTimesheetDoctor (manager-gated READ-ONLY —
duplicate (emp,date,type) groups + inverted first-in/last-out pairs, the
C3 mis-keyed-AM/PM class that calcHours_'s deliberate wrap renders as an
overnight day) + fixTimesheetDuplicates(empIdFilter?) (manager-gated,
locked, IDEMPOTENT — keeps the LAST row per group, the
findExistingPunch_/managerSaveDay INV-155 convention; deletes earlier rows
bottom-up with 'duplicate collapsed (sheet doctor)' PunchDelete audit
rows; inverted pairs are REPORT-ONLY → Day Edit; the optional empId filter
exists so the integration test can never collapse a real rep's rows).
Client: lazy #mgr-sheet-doctor warn card beside the PTO-recon card
(renders only when findings exist; uiConfirm-gated collapse button).
L2/C13: computeFormSubmissionHash_ ALREADY used NUL delimiters — the gap
was the EmpDocs pair. empDocContentHash_/empDocSignatureHash_ now take a
delim param DEFAULTING to the NUL escape (new writes v2); legacy
space-form hashes keep validating via DUAL-VERIFY (empDocContentHashMatches_
+ the verifyDocSignature legacy recompute using EMPDOC_HASH_DELIM_LEGACY,
each attempt using its own era's content-hash for the blank-stored
fallback); acknowledgeDoc's integrity gate dual-verifies so pre-C13 docs
still SIGN. NOTE the Edit-tool NUL trap fired AGAIN writing Code.js (the
escape became 3 literal NUL bytes → 'binary file matches'); repaired with
perl s/backslash-x00/the-6-char-escape/g — when a file needs the NUL
escape, WRITE it via perl/python, never through a raw Edit payload.
Tests: editor +4 (sheetDoctor_detectsAndCollapsesDuplicates,
empdocs_legacyHashDualVerify, + getTimesheetDoctor/fixTimesheetDuplicates
omnibus gate cases); pure 316/0 (2 new pin tests, both bite-checked:
last-row-wins loop + NUL default); DOM 65/0; node --check ×3; zero literal
NULs in every touched file.
OPERATOR-APPROVED FOLLOW-ONS ALSO IMPLEMENTED (same branch, 2026-07-23):
(1) TYPED-SIGNATURE ALTERNATIVE (the a11y Critical #3, user approved) on
BOTH pads — form_public SIG_PAD and the EmpDocs edInitSigPad_ twin each
gained setTypedName(name): a link-style disclosure ("Can't use the pad?
Type your signature instead", aria-expanded) reveals a labeled text input
whose value renders onto the canvas in a script face (Segoe Script/Brush
Script fallbacks, shrink-to-fit) — the exported artifact stays the SAME
PNG data-URL class as a drawn signature, so the entire downstream pipeline
(600px export cap, size caps, hashes, certificates, dual-verify) is
untouched — zero server changes. Clear (both paths) empties the typed
input too. Node parity pin 'both pads carry setTypedName' (bite-checked)
+ a MIRROR_INDEX entry. (2) LUNCH-PAIR INVERSION CHECK (user approved) in
the sheet doctor: tsDoctorScan_ collects LunchOut/LunchIn; inverted[]
entries now carry kind:'clock'|'lunch' (lunch = last return <= first
leave, so legit multi-lunch never false-flags; report-only like the clock
pair); client card renders per-kind copy; editor doctor test extended
with a lunch case; scan pin extended. Pure 317/0, DOM 65/0, checks OK.
Remaining: operator deploy, /reflect (cycle-10 metrics.csv + estimates.csv
rows); K-A editor-suite CI — user asked for non-credential alternatives
(answered in-session: recommended a nightly self-test trigger inside Apps
Script — runSmokeTests on prod + runAllTests on the dev instance —
surfaced through the existing failure-digest machinery; not yet built,
awaiting user pick).
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 4
Updated: 2026-07-24 (cycle 10 closed — deployed + verified)

## Cycle 10 — remaining backlog (facts, not judgments — findings re-verified in-session 2026-07-23)
- Mediums not yet implemented: M-4 (History edit-snapshot gap), M-7 (KB convert
  identity guard), M-8 (Admin Sheets blank on re-enter), M-9 (KB tests mutate
  live store — _withTestKb_), M-10 (stacked-dialog + drawer-Enter DOM pins),
  M-11 (5 zero-coverage endpoints).
- Notable Lows: reconcile tz recovery (INV-142 claim false), exportAdpRange
  validation, calcHours_ inverted-pair wrap, writeAuditLog_ witness swallow,
  hash delimiters, tax-rates empty-map, Spanish docstrings, CN preview
  instance guard, dead umsCallNotesLastDept, MGR_STATUS fallback, PTO-reject
  modal close, dashboard error-as-empty caching, shell Lows (umsLastView
  pop-out, dispTime, beacon proto-key, tour Esc), intake/KB client Lows.
- Doc contradictions for /sync-docs: INV-111 (store failure now loud), S7/Day
  Edit duplicate-collapse note, INV-142 reconcile claim, Spanish manager-only
  list vs INV-31 amendment, What's-new stale comments, DOM-harness h.t/opts.markup
  doc drift, umsCallNotesLastDept entry.

## Where I left off (cycle 10)
EVERYTHING SHIPPED: entire scan backlog + Batches G/I/H/J/K(E,D,B)/L +
the operator-approved follow-ons (typed signature on both pads,
lunch-pair inversion, the runNightlySelfTest trigger as the K-A
credential-free alternative — INV-162) + /sync-docs applied (INV-44
sixteen handlers, INV-117/150 user-lock amendments, INV-122 C13 pointer,
NEW INV-159–162, tokens/loader/overlay/signature decision + gotcha
amendments, sixteen-trigger operator entry + SELF_TEST_LAST_RESULT,
Test Command net additions). Pure 319/0, DOM 65/0, editor suite ≈297
(operator-run). PR #138 merged; /reflect done (metrics + estimates rows,
PR #139); operator deployed 2026-07-24 — runAllTests ALL PASSED and
installAutomationTriggers re-run (16 triggers incl. the 1am self-test).
CYCLE 10 IS FULLY CLOSED. Next session: open cycle 11 with the SEAMS &
INVARIANTS audit (due — counter at 4/4); suggested seam focus list is in
the 2026-07-24 session transcript (Code.js↔Tests.js self-test coupling,
the observability chain, the attestation/pad seam, shell↔module focus
lifecycle, MIRROR_INDEX completeness, the deploy seam). After seams, the
targeted rotation: cn views → punch/timesheet server family → test-suite
quality pass, spaced by real usage. Still open by user choice: .chip
consolidation follow-on; real pre-merge editor CI if credentials ever
materialize.

## Cycle 9 — batches 5-7 (2026-07-21, same branch)
Batch 5 (bounded reads / growth-class debt):
- L-3 getAdpSS_ + adpSheetTz_ memoized per execution (the normalize helpers
  called openById + getSpreadsheetTimeZone PER COERCED CELL in whole-sheet
  loops; 4 tz call sites rerouted). NOTE the first sed also hit the new
  helper itself (infinite recursion) — caught and fixed before any test run;
  watch for self-referential replaces when adding memo helpers.
- L-22 getReferenceItem → id-column scan + one-row fetch (the hottest KB
  path pulled every article's BodyMd per open).
- L-21 TRAIN_COMPLETE_MAX_SCAN=10000 / TRAIN_ATTEMPT_MAX_SCAN=4000 tails.
  COMPLETIONS ARE STATE (INV-120: complete = newest row after assignment) so
  their cap is a deliberately-generous decades-out backstop, NOT an
  analytics window — a completion older than the newest 10k rows would read
  Pending again (documented in-code). Attempts are display-only → 4k.
- L-9 getMySentForms tail-bounded (FT_SENT_MAX_SCAN=2000 newest rows; the
  full-width read incl. PHI PrefillData blobs scanned every token ever).
- L-16 intakeListMySubmissions metadata-only projection (two column-bounded
  reads skip AnswersJSON/Recommendations/Selections entirely).
- L-13 getMyMetricsRange endpoint result cache (metrics_range_v1:<id>:<from>:<to>,
  CDR_CACHE_TTL; error results never cached; bypassed under
  _TEST_OVERRIDE_CDR_SS_ID — the exact L-1 pattern).
- L-1 buildTimesheetForEmployee_ validates shape + caps span at 370 days
  (the day-loop could spin ~2.9M iterations on a garbage range); guards BOTH
  getTimesheetData and getEmployeeTimesheetForManager at the shared builder.
- L-14 transfer per-day ACCUMULATES on a (rep,date) collision with
  recomputed pct; the single-row path keeps the sheet's stored pct
  BYTE-IDENTICAL (the editor fixture pins 29.79 — an unconditional recompute
  would round to 29.8 and fail it; caught before commit).
Batch 6 (server hygiene):
- L-5 FS.SUBMITTED_AT (viewer + verify) + markDeptRequestResolved_'s
  already-branch cells → formTokenIsoString_ (coercion-safe on the
  segregated/coercing FORMS_SS_ID — the viewer WAS rendering Date blobs).
- L-7 _meta.openedAt sliced to 64 chars (the one INV-96 cap gap).
- L-8 getPatientTimeline returns partial+failedSources (both {error} returns
  and throws counted); the timeline modal renders a warn banner naming the
  missing streams (failed ≠ no-data on a patient surface).
- L-11 getEnrolledCallNotesReps uses the TRIMMED enrollment predicate
  (parity with getCallNotesEnrollment/provision no-clobber).
- L-12 getStateTaxRates_/getUpdateSuggestions_ sanitize-on-read
  (whitelist-rebuilt entries; scalar/array blobs degrade to CONFIG).
- L-15 clientErrorsSummary_ cutoff formatted in CONFIG.TIMEZONE (the stamped
  tz), not manager tz.
Batch 7 (test pins):
- L-35: PUNCH_MORPH destination pin (LunchIn.to='doorExit' — the F7
  half-step regression re-armed), spanishSearchQuery_ {to: cc:} brace-OR
  behavioral pin, clkShootMaybe_ gating source pin (density/motion/photo/
  midpoint), greeting-rotator stopClock-teardown pin.
- Strategic #2 payload-contract tripwire: client-submitted subformData keys
  (payload.subformData.X assignments + subformData:{...} literals, ternary
  form included, cn + intake) must each be a rawSub.<key> read in
  sanitizeCallNotePayload_ — the M-3 drift class retired. Bite-checked.
- showView('…') literal net (arming floor ≥3; 4 live literals) — completes
  the enterTool/refreshViewIfCurrent registry-key family.

## Pending / not yet done
- /sync-docs owed (batches 3-7 combined): INV-151 (+checkTrigger), the
  "Fire-and-forget email" gotcha + M-7 pattern/tripwire/allowlist, INV-127
  (+email filter), INV-05/108 (manager future-time), INV-83 (drawer Enter),
  8c note (L-30); batches 5-7: INV-129 (+result cache), INV-116 (projection
  read), INV-46-family (new bounded reads: getReferenceItem, getMySentForms,
  training tails incl. the completions-backstop tradeoff, timesheet range
  cap), Test Command section (+payload-contract + showView + L-35 pins),
  L-3 memo note near the normalize-helpers decision.
- OPERATOR (deploy): one `cd web-app && clasp push -f` + New version. NO new
  Script Properties / triggers / migrations. Editor runAllTests (suite
  unchanged in 5-7; the transfer fixture + sent-viewer tests exercise the
  L-14/L-16 edits and were verified shape-compatible by inspection).
- Then /reflect to close cycle 9 (metrics.csv + estimates.csv rows).
- Roadmap-tier (not findings): archived-month visibility; KB undelete.

## Decisions made (batches 5-7)
- L-21: completions cap = 10,000 (state-bearing → generous backstop;
  attempts 4,000 analytics window). If team scale ever 10×es, revisit.
- L-14: single-row path preserves the sheet's stored pct byte-identically;
  only genuine collisions recompute (fixture-pin compatibility).
- L-12: out-of-range hand-edited rates (>1) are now DROPPED by
  sanitize-on-read (the save endpoint always enforced 0–1; a dropped key
  means that state has no tax rate until re-saved).
- L-1: cap = 370 days at the SHARED builder (one guard covers both
  endpoints; client requests are month/pay-period sized).

## Cycle 9 — batches 3-4 (2026-07-21, same branch)
Batch 3 (concurrency + automation edges):
- M-7 | Code.js + run.js | NO mail inside the global ScriptLock: 9 sites
  converted to a `notifyAfter` closure invoked in the finally AFTER
  releaseLock (updateTimeOffStatus, managerSubmitTimeOff, submitCallNote,
  saveTrainingAssignment — the '*' roster-loop headline — acknowledgeDoc,
  issueDoc, releaseDoc, createCoaching, acknowledgeCoaching). NEW two-level
  tripwire: inventory functions touching MailApp., then flag any locked
  try-region referencing one outside a notifyAfter closure; ALLOWLIST =
  emailFromCallNote ONLY (INV-42 send-then-stamp is one locked unit).
  Bite-checked (re-inlining one notify fails CI).
- L-18 | Code.js + run.js | managerBriefSuppressionActive_({checkTrigger:true})
  at the FOUR digest call sites additionally requires a live
  sendManagerDailyBrief trigger (visible in trigger context — the runner is
  the installer); the PANEL briefConfig detector stays ARGLESS (a viewing
  manager isn't the installer — getProjectTriggers would false-alarm). Fail
  direction on any check miss: NOT suppressed (doubled email beats silent
  outage). Closes the manual-brief-run ~26h suppression window the detector
  couldn't see. Suppression tripwire extended (checkTrigger at all 4 sites +
  argless detector). Bite-checked.
- L-19 | Code.js | stampDigestLastRun_ RMW under tryLock(3000) fail-open
  (the kbAiTryReserveSpend_ pattern) — concurrent 8am digests could drop
  each other's heartbeat stamp.
- L-6 | Code.js | getFormByToken's mark-expired now RE-LOCATES the row by
  token under tryLock(2000) — the pre-lock rowIndex could go stale against
  the 3am purge's descending deleteRows (wrong token marked expired /
  submitted status clobbered). tryLock: never block the public visitor.
- L-4 | Code.js | managerSaveDay + managerSaveDayRange reject same-day
  FUTURE times (recordPunch/adjust-queue parity, target-emp tz; HH:mm vs
  HH:mm:ss lexicographic compare is correct). Edge documented: a
  pre-existing future punch now blocks even its no-op re-save (deliberate).
- L-2 | Code.js | getCoveragePlan skips roster rows with no email (sibling
  parity) — name-only offboarded/placeholder rows counted as full shifts.
Batch 4 (client UX / silent-degradation Lows):
- L-23 intake "Open Call Notes" closes the modal first (intakeOpenCallNotes_);
- L-25 drawer search failure toasts (tab-twin parity); L-26 metrics renderers
  null-guard before .error (stranded loader); L-27 win-back subject replaces
  the AUTO-pattern subject too (was dead code — the auto subject is never
  empty; custom subjects untouched); L-28 failure handlers on the 3 bare RPCs
  (pinned-tray toast, ambient badge console-only, audit rep-filter toast);
  L-29 Esc with the KB drawer open closes the drawer WITHOUT clearing the
  note (drawer-open check before cnClearActiveForm_); L-30 PTO submit from a
  pinned day popover resets dayPopoverPinned (hover-open no longer dies);
  L-31 _covSeq/_punctSeq same-view range-race tokens (INV-146 class);
  L-32 uiConfirm Enter from inside #kb-drawer no longer confirms a danger
  dialog; L-33 mgr-timeoff-overlay backdrop-click close (sibling parity).

## Pending / not yet done
- Cycle-9 backlog remaining: Batch 5 bounded reads (L-1, L-3, L-9, L-13,
  L-14, L-16, L-21, L-22); Batch 6 server hygiene (L-5, L-7, L-8, L-11,
  L-12, L-15); Batch 7 test pins (L-35, payload-contract tripwire,
  showView-literal extension). Roadmap-tier: archived-month visibility;
  KB undelete endpoint.
- /sync-docs owed for batches 3-4: INV-151 (+checkTrigger digest-site
  semantics + the doubled-email tradeoff), the "Fire-and-forget email"
  gotcha + Test Command section (+M-7 post-lock notifyAfter pattern +
  no-mail-in-lock tripwire + allowlist), INV-127 (+email-required roster
  filter), INV-05/108 note (manager same-day future-time guards), INV-83
  (L-32 drawer Enter exemption), 8c hover-popover note (L-30).
- OPERATOR (deploy): one `cd web-app && clasp push -f` + New version. NO new
  Script Properties / triggers / migrations (L-18 reads existing triggers).
  Editor runSmokeTests/runAllTests (suite unchanged from batch 2's 268-ish
  count; no new editor tests in batches 3-4).
- Then /reflect to close cycle 9.

## Decisions made (batches 3-4)
- M-7 allowlist: emailFromCallNote is the ONLY sanctioned in-lock sender
  (INV-42 send-then-stamp atomicity). New in-lock mail = move it to a
  notifyAfter closure or allowlist WITH a reason (tripwire enforces).
- L-18 fail direction: any trigger-check miss/error → NOT suppressed. A
  manual digest run by a non-installer now double-emails for that run
  (deliberate fail-safe; counted as the batch's 1 new failure mode).
- L-4 edge: a pre-existing same-day FUTURE punch blocks its own no-op
  re-save in Day Edit (forces cleanup; rare — only pre-fix corruption).

## Cycle 9 — batch 2: M-2, M-5, M-8, M-9, M-10, M-11, L-17, L-20, L-34, L-36 (2026-07-21, same branch)
- M-2 | Code.js | managerSubmitTimeOff: thrown balance write now DELETES the
  just-appended Approved row before rethrowing (retry starts clean; the old
  strand blocked retry via the dup-guard and made Deny→re-Approve credit a
  deduction that never happened). fixPtoReconciliation: restructured to
  PER-BUCKET neutralize→credit units, each with a compensating revert-to-
  'Approved' on a thrown credit — a failed bucket re-detects/re-credits on
  re-run; a committed bucket can't double-credit (rows no longer 'Approved');
  partial commit writes a best-effort audit row before the rethrow. Happy-path
  behavior/return shape byte-compatible (annual then sick, same keys).
- M-5 | cn/script_callnotes.html | external composer resolves a preset
  History/pinned note via cnFindNoteAnywhere_ and pins it atop the note-ref
  dropdown — the linkage (externalEmails[] stamp / manager recipient lookup)
  no longer silently drops to "None (standalone email)".
- M-8 | Code.js + train/script_empdocs.html + Tests.js | fields-only empdoc
  completions now write an append-only DocSignatures row with an EMPTY
  signature cell + a completion hash (empDocSignatureHash_ with '' sig; cert
  kind:'completion'); EmpDocCompleted audit row carries hash=. verifyDocSignature
  detects the empty-sig row → {completed:true, signed:false, match, tampered};
  legacy pre-ship completions (no row) still report unsigned/legacy, never
  tampered. Client verify toast distinguishes completion vs signature. NEW
  editor test test_empdocs_fieldsOnlyCompletionHash (clean verify + ResponsesJson
  rewrite → tampered).
- M-9 | test/client/run.js | the refreshViewIfCurrent tripwire's [^}]* →
  [^{}]* (the tour test's corrected form) + leaf-key asserts
  (clock/timeoff/callNotes/manage must parse) so the regression class itself
  is pinned. Bite-checked.
- M-10 | run.js + dom/boot.js | metrics/script_deptrequests.html +
  train/script_coaching.html added to the parse-guard list (now the named
  PARSE_GUARD_PARTIALS const), the DOM PARTIALS (index.html include order),
  and the M3 scan list. NEW auto-derive tripwire: every index.html-include()d
  partial with a <script> block must be in PARSE_GUARD_PARTIALS. Bite-checked.
- M-11 | run.js + Tests.js | coachCanManagerSee_ Node unit test (stubbed
  lookupEmployeeById_; creator/column-M/unrelated/blank-narrows/non-manager/
  no-roster — all six INV-134 rules) — bite-checked against a weakened helper.
  NEW editor test test_coaching_createAckVoidFlowAndScoping (create→owner-sees→
  cross-rep denied→live-item scoping→ack+idempotent→void→hidden→VoidReason in
  the HR column) + _cleanupCoachingRows_ helper.
- L-17 | Code.js | getTrainingDashboard itemTitle_ drops DRAFT KB items
  (parity with getMyTraining/overdue digest per L-9 — managers no longer nag
  reps about items they can't open).
- L-20 | Code.js | kbDeleteItem snapshots the FINAL row content to KbRevisions
  (action 'delete', best-effort) before deleteRow — a mistaken admin delete is
  recoverable by manual copy; an undelete endpoint stays a follow-on.
- L-34 | .github/workflows/client-tests.yml | node --check web-app/DevTools.js.
- L-36 | Tests.js | CN fixture pins LOCALE alongside tz (createPinnedSpreadsheet_
  parity; a coercing deployer locale made the fixture exercise the ISO-T
  coercion paths unlike a production per-rep sheet).

## Pending / not yet done
- Cycle-9 backlog remaining (ranked batches 3-7 in the session transcript):
  Batch 3 concurrency/automation edges (M-7 email-loop-in-lock + no-MailApp
  tripwire, L-18 brief suppression window, L-19 heartbeat RMW lock, L-6
  getFormByToken unlocked status write, L-4 manager future-time guard, L-2
  coverage emailless-row filter); Batch 4 client UX Lows (L-23, L-25..L-33);
  Batch 5 bounded reads (L-1, L-3, L-9, L-13, L-14, L-16, L-21, L-22);
  Batch 6 server hygiene (L-5, L-7, L-8, L-11, L-12, L-15); Batch 7 test pins
  (L-35, payload-contract tripwire, showView-literal extension). Roadmap-tier:
  archived-month visibility.
- /sync-docs owed: coverage-strip gotcha → SWR (batch 1); INV-143 +intakeType
  (batch 1); INV-135 — fields-only completions now hashed (M-8 amends "the
  responses are attested" to hold for BOTH paths; legacy completions report
  null); Test Command section (+enterTool tripwire, +PARSE_GUARD auto-derive,
  +coachCanManagerSee_ pins, M-9 regex note, DevTools in CI); the "parse-guards
  every JS-bearing partial" claim is now TRUE again (M-10).
- OPERATOR (deploy): one `cd web-app && clasp push -f` + New version. NO new
  Script Properties / triggers / migrations. Editor runSmokeTests/runAllTests —
  suite grew by 2 (test_empdocs_fieldsOnlyCompletionHash,
  test_coaching_createAckVoidFlowAndScoping); test_managerSaveDay_noChangesIsNoOp
  changed (live-seconds fixture) and test_fixPtoReconciliation_creditsAndIdempotent
  exercises the restructured per-bucket path (behavior-compatible).
- Then /reflect when the operator calls the cycle done.

## Decisions made (batch 2 — so the next session doesn't re-litigate)
- M-2 fixPtoReconciliation: PER-BUCKET compensated units (annual then sick),
  NOT all-rows-then-credit — a partial failure must neither double-credit on
  re-run (bucket committed = rows off 'Approved') nor go invisible (bucket
  failed = rows reverted to 'Approved'). A partial commit writes its audit row
  best-effort before the rethrow.
- M-8: the completion artifact REUSES empDocSignatureHash_ with an empty
  signature segment (no new hash function; recompute stays byte-stable via the
  stored responsesRaw cell). An empty SIGNATURE cell in DocSignatures is the
  completion-row marker — do not "fix" that to a placeholder string.
- M-8 back-compat: legacy fields-only completions (no sig row) intentionally
  report {signed:false} with NO completed key — same as pre-fix; never tampered.
- M-11 Node stub mirrors the production contract (lookupEmployeeById_
  lowercases managerEmail at read) — keep the stub lowercase if the roster
  reader ever changes.

## Cycle 9 — scan + fix batch H-1, M-1, M-3, M-4, M-6 (2026-07-21, claude/broad-scan-5eoypm)
Scan-time scores: Overall 8 · Correctness 8 · Security 9 · Data Integrity 8 ·
Timezone 8.5 · Concurrency 8 · Test Coverage 7.5 · Clarity 8.5 · GAS 8.5 ·
MgrUX 7.5 · EmpUX 8 · Automation 8. Full findings list in the session
transcript (Top-5: M-1, H-1, M-3, M-6, M-4 — all five now fixed).

## Completed this cycle
- H-1 | cn/script_callnotes.html + test/client/run.js | "Coach on this" called enterTool('training',…) but the tool key is 'develop' — enterTool returns silently on an unknown key, so the INV-134 deep-link was a dead no-op since the Manage reorg. Fixed to enterTool('develop','coaching'). NEW comment-stripped tripwire: every enterTool('…') literal in all 14 JS partials must be a registered TOOL key (depth-walked registry extraction — immune to the M-9 [^}]* nested-brace flaw; ${…} interpolations exempt). Bite-checked.
- M-1 | Code.js + Tests.js | managerSaveDay no-op guard compared full HH:mm:ss vs the client's HH:mm+':00' — live punches store REAL seconds, so EVERY Day Edit save rewrote every untouched live punch (seconds truncated, COMMENTS → ADJ-{type}, spurious PunchEdit audit row; S7 violation). Now compares HH:mm prefix (the UI can only express HH:mm). test_managerSaveDay_noChangesIsNoOp's ClockIn fixture is now a LIVE punch at 09:00:27 — a regression to full-string compare fails changes=0 + the PunchEdit count.
- M-3 | Code.js + intake/script_intake.html + test/client/run.js | intake auto-log note lost its intakeType chip + intake-* tag (the cycle-7 M-15 whitelist stripped subformData.intakeType; tags nested in subformData were never read). Client now sends tags TOP-LEVEL + subformData:{intakeType}; sanitizeCallNotePayload_ whitelists intakeType as a bounded ppd|pmd|pap enum (case-normalized, off-enum drops). New Node case; bite-checked.
- M-4 | cn/script_callnotes.html + test/client/dom/runDom.js | a STRUCTURED {success:false} from submitCallNote (the catch-→-structured house pattern, so ANY server error) on a Save & Compose flow hit the success handler's error branch, which lacked the failure handler's teardown — composeFlow wedged every later submit ("Still saving…") + the envelope overlay stuck. Now clears composeFlow + cnCloseComposerLoadingIfPending_ before the revert (teardown parity). New DOM test; bite-checked.
- M-6 | tc/script_clock.html | the Clock "N% logged · File N missing" strip was frozen ALL DAY (date-keyed CLK_COVERAGE_CACHE early-return; the documented nav-away-and-back refresh path didn't exist). Now SWR matching CLK_NOTEVOL_CACHE: paint cache instantly, ALWAYS background-refetch (getMyMetrics is server-cached 5 min per L-1, so quota-cheap; same call cadence as the notevol sibling), keep last-good on error, blank only on a cold miss.

## Pending / not yet done
- Cycle-9 backlog NOT selected this batch: M-2 (managerSubmitTimeOff/fixPtoReconciliation missing compensating revert), M-5 (external composer drops note linkage for History/pinned notes), M-7 (all-hands training-assign email loop inside the ScriptLock), M-8 (fields-only empdoc completion has no integrity hash), M-9 (the refreshViewIfCurrent tripwire's [^}]* regex extracts tool keys — false-permissive; the H-1 tripwire uses the safe depth-walk, but M-9's own regex is still wrong), M-10 (metrics/script_deptrequests.html + train/script_coaching.html outside the parse-guard/DOM/M3 lists), M-11 (coachCanManagerSee_ zero tests at any layer), + ~36 Lows (headliners: L-17 training dashboard counts drafted items, L-18 manual-brief-run suppression window, L-20 kbDeleteItem no revision snapshot, L-22 getReferenceItem full-tab read, unbounded-read family L-9/L-16/L-21, L-26 metrics null-guard, L-29 Esc drawer/form-clear collision, L-34 DevTools.js not node --check'd). Full list in the session transcript.
- /sync-docs owed (see Decisions below).
- OPERATOR (deploy): one `cd web-app && clasp push -f` + Apps Script editor → New version. NO new Script Properties / triggers / migrations. Editor runSmokeTests/runAllTests — the modified test_managerSaveDay_noChangesIsNoOp (live-seconds fixture) is the one changed editor test.
- Then /reflect when the operator calls the batch done (cycle-9 metrics.csv row).

## Decisions made (so the next session doesn't re-litigate)
- M-1: no-op compare is HH:mm-prefix — the Day Edit UI (input type=time) can only express HH:mm, and the server validation regex rejects seconds, so no caller loses the ability to set seconds (recordPunch remains the only seconds-writer).
- M-3: intakeType joins the INV-143 whitelist as a BOUNDED enum (ppd|pmd|pap only) — the whitelist stays closed; tags ride TOP-LEVEL p.tags (the only tags path sanitize reads). INV-143 doc needs the +intakeType amendment.
- M-6: chose SWR-always-refetch over submitCallNote-side invalidation — matches the CLK_NOTEVOL_CACHE sibling byte-for-byte in cost profile (same render sites, focus-refresh throttled 20s, server result cached 5 min). The CLAUDE.md coverage-strip gotcha ("won't refresh until nav away/back or day rollover… invalidate from submitCallNote if ever needed") must be rewritten to describe SWR.
- H-1 tripwire: TOOL keys are extracted by a brace-DEPTH WALK of the TOOLS literal, comments stripped first, ${…} interpolations exempt — do NOT "simplify" it to a regex char class (the M-9 bug class).

## Where I left off
Cycle-9 batch H-1+M-1+M-3+M-4+M-6 implemented + tested (pure 291/0, DOM 61/0,
node --check green, 3 bite-checks). Next: commit+push the branch, then
/sync-docs (coverage-strip gotcha → SWR; INV-143 +intakeType; INV-134 deep-link
note; Test Command section + the new enterTool tripwire), then the remaining
cycle-9 backlog on request, then /reflect.

## ── Cycle 8 record (superseded header) ──
Cycle 8 phase log: ALL FOUR batches done on claude/broad-scan-0y5q6b: batch 1 (H-1+M-1..M-6), batches 2-3 (M-7..M-12 + 16 Lows), batches 4-5 (M-13..M-15 test-integrity + NUL escapes + harness hardening + 14 UX-polish Lows). Pure 277/0, DOM 59/0. Reflected 2026-07-10 (metrics.csv row). Extra broad-scan F1-F9 implemented on claude/broad-scan-0zvxiu (2026-07-15).

## Extra broad-scan + F1-F5 implement (2026-07-15, claude/broad-scan-0zvxiu)
Fresh 6-agent broad-scan (fan-out + personal verification of every Medium+):
0 Critical / 0 High / 1 Medium / 8 Low — a very clean result. Scan-time scores:
Overall 8.5 · Correctness 8.5 · Security 9 · Data 8.5 · Timezone 8.5 · Concurrency 9 ·
Test 8 · Clarity 9 · GAS 9 · MgrUX 8 · EmpUX 8 · Automation 8.5.
Operator ran /broad-implement F1-F5 (F2 dropped — operator clarified K0841's
Offerings pdfLink/imageUrl == K0861's, so no mismatch in practice).
IMPLEMENTED (pure 277/0, DOM 59/0, node --check green):
- F1 (Medium) Code.js cnReadCallNoteAuditRows_:~3930 — dateLocal read RAW off the
  coerced PunchDate (col 5) → compliance-panel "View note" deep-link handed
  garbage to managerGetCallNotes (^\d{4}-\d{2}-\d{2}$ reject → silent dead link).
  Now normalizeDate_(data[i][5]) (matches getManagerDashboard:~1098). + Tests.js
  test_auditPanel_searchAndHistory now asserts hit.dateLocal shape (the missing
  guard that let it through).
- F3 (Low) Code.js — form-token ABSENT ExpiresAt now fails CLOSED at all 3 gates
  (getFormByToken/submitFormByToken/getMySentForms): `!expX.present ||` added.
  Blank cell was fail-OPEN (perpetual anonymous PHI submit); createFormToken
  writes ExpiresAt atomically, so blank = only corruption/migration.
- F4 (Low) tc/script_timeoff.html PTO tile — projected "Nd after DATE" was
  `annual - plannedDays` but `annual` already reflects APPROVED deductions
  (INV-03/25), double-counting them. New pendingPlannedDays (pending-only) drives
  the projection; the "Nd planned" tally still shows pending+approved.
- F5 (Low) metrics/script_metrics.html spanishRender_ — esc(String()) around
  d.resolved/pending/total (invariant consistency; integers today).
Findings NOT implemented (deliberate, out of F1-F5 scope): F6 form_public.html
esc() no-quote-escape (latent, literals only), F7 kbMd_ emphasis-over-link-markup
(cosmetic), F8 showView no tabVisibleForUser_ re-check (defense-in-depth), F9
dual manager-source desync (documented-intentional).
DOC UPDATES OWED (/sync-docs): the "AuditLog OTHER coerced columns" gotcha claims
cnReadCallNoteAuditRows_ routes col 5 through a normalize helper — it now does
(normalizeDate_); INV-92 note; F3 fail-closed note near INV-96/113/114.
OPERATOR (deploy): one `cd web-app && clasp push -f` + New version (ships Code.js
+ both partials + Tests.js). No new Script Properties/triggers/migrations.
Optional editor runAllTests to exercise the new dateLocal assertion (India fixture).

## Batch 1 follow-up: F6/F7 + F3 test (2026-07-15, same branch)
Operator ran /broad-implement "Batch 1 + F6/F7". Implemented (pure 278/0, DOM 59/0):
- F6 (Low) form_public.html esc() now escapes " and ' (was textContent→innerHTML,
  quote-blind) — the public PHI form uses it in value="..." attribute contexts.
  All 6 call sites are HTML contexts; neutral for text, closes the attribute
  breakout. (Latent — literals only today.)
- F7 (Low) kbMd_ inline(): emphasis/inline-code ran AFTER link/image generation,
  so a URL with ** or a backtick got <strong>/<code> injected INSIDE href/src
  (broken link). Factored emph() out, applied to link TEXT at generation, stashed
  the generated <a>/<img> markup past the outer emphasis pass via a NUL-delimited
  sentinel (\u0000L<idx>\u0000, the existing \u0000C fence pattern). Link-text
  emphasis preserved. + F7 Node regression test (run.js, 277→278). NOTE: my first
  edit accidentally wrote LITERAL NUL bytes (reintroducing the batch-4 binary-file
  issue); converted all literal 0x00 → the \u0000 escape via a Node script — file
  greps as text again. WATCH FOR THIS if editing kb/script_kb.html sentinels.
- F3 integration test (Tests.js): test_publicForm_blankExpiryFailsClosed —
  creates a token, blanks ExpiresAt, asserts getFormByToken + submitFormByToken
  both fail closed + no submission row persists. Registered in the runner.
  (Pins last session's F3 code fix; editor-only.)
DOC UPDATES OWED (/sync-docs, additive to the F1/F3 notes above): kbMd_ inline()
now stashes link/image markup past the emphasis pass; form_public.html esc()
escapes quotes. [DONE — the F1/F3/F4/F7 + INV-92 CLAUDE.md notes were synced in
commit 72298cc; the F6 esc-quotes note + the F8/F9 notes below remain owed.]

## Batch 2: F8 + F9 detector (2026-07-15, same branch)
Operator ran /broad-implement Batch 2; via AskUserQuestion chose the F9 DRIFT
DETECTOR (not "unify" — unsafe, the split is intentional) and SKIP the separate
setup wizard (Deploy Readiness already covers it). Implemented (pure 281/0, DOM 59/0):
- F8 (Low, defense-in-depth) script_core.html showView(): added a
  tabVisibleForUser_ guard at the low-level dispatch — a DIRECT showView() for a
  gated tab (drill-through / ?tool deep-link / umsLastView / tab-bar) now routes
  back through enterTool (bumps to a visible tab). No recursion (enterTool
  re-enters with a visible tab). empState is set at boot BEFORE the first
  enterTool, so no wrong redirect. Server still re-gates (UI-only hardening).
- F9 (Low → monitoring) Code.js: NEW pure managerSourceDrift_(propEmails,
  rosterPairs) — returns emails in MANAGER_EMAILS whose roster row is marked
  NOT-a-manager (off-boarded/demoted yet still trigger-privileged via
  assertManagerCaller_). FALSE-POSITIVE-FREE: an email with no roster row (a
  legit non-roster deployer) is never flagged. Wired as a 7th
  automationDetectorChecks_ check 'managerSource' (config-coherence, the
  briefConfig pattern) → auto-surfaces in the Admin Automation Health panel +
  the sendAutomationHealthDigest failure email (both esc/esc_ the detail). NO
  gate logic changed (the intentional dual-source split stays); NO new trigger
  (rides the existing 9am digest). 3 Node tests + the detector-keys tripwire
  updated (+managerSource). test_automationDetectorLiveness auto-covers it (7
  checks, all alive in a drift-free env).
DOC UPDATES OWED (/sync-docs): the "Detector liveness (Turn C)" description (6→7
check keys, +managerSource F9); the F5 dual-manager-source gotcha / INV-44 note
that the drift is now surfaced by a detector; F6 esc-quotes note.
[DONE — synced in commit ca3f25f (detector 6→7, F8 showView guard, F6 esc-quotes).]

## Batch 3: AuditLog typed reader — kill the coercion class (2026-07-15, same branch)
Operator ran /broad-implement Batch 3 (the L-effort structural item). Scoped it
to the ROOT CAUSE F1 exposed rather than a full-codebase rewrite: the AuditLog was
the one core sheet with NO named column enum, so its coerced cells were read by
bare index (auditData[i][5]) — untrippable, which is why F1's raw PunchDate read
slipped every per-function tripwire. Behavior-preserving throughout (pure 285/0
(+4), DOM 59/0, node --check clean):
- NEW `AUDIT` enum {TS,EMP_ID,EMP_NAME,ACTOR,ACTION,PUNCH_DATE,PUNCH_TIME,
  IS_ADJUSTMENT,DAYS_BACK,NOTES} (the writeAuditLog_/getOrCreateAuditSheet_ order).
- NEW typed reader `auditRowObj_(row)` — the SINGLE coercion-recovery point:
  recovers TS (normalizeAuditTs_), PUNCH_DATE (normalizeDate_), PUNCH_TIME
  (normalizeTime_), IS_ADJUSTMENT (case-insensitive ===' TRUE') once; callers add
  display/derived fields (timestampMgr, dateLocal alias, noteId parse).
- Retrofitted ALL 4 AuditLog readers to AUDIT.*: the 2 COERCED-col readers
  (getManagerDashboard recentAudits, cnReadCallNoteAuditRows_) now build via
  auditRowObj_; the 2 non-coerced readers (computeAutomationHealth_,
  adminSheetView) use AUDIT.* (TS/ACTION/EMP_*/NOTES). ZERO bare-index audit reads
  remain (ClientErrors ~4114 + KbViews ~14411 are DIFFERENT sheets, left as-is).
- The old getManagerDashboard M-3/M-4 tripwire was REPLACED (the guarantee moved
  into auditRowObj_): 3 source tripwires (auditRowObj_ uses each normalize helper;
  both object-readers route through it; a GLOBAL scan — the INV-142 pattern — fails
  CI on any raw read of a coerced AUDIT column outside auditRowObj_ = the
  F1-catching net) + 2 runtime tests (coerced-Date PunchDate + native-boolean
  IsAdjustment recovery, stubbed deps).
- Field-by-field verified behavior-identical (same normalize helpers, same output
  shapes) — the editor test_auditPanel_searchAndHistory dateLocal assertion + S10
  still hold. SHEET SCHEMA UNCHANGED (enum just names existing columns).
DOC UPDATES OWED (/sync-docs): the "AuditLog OTHER coerced columns" gotcha — all
AuditLog reads now route through the AUDIT enum + auditRowObj_ typed reader (pinned
by the Batch-3 global tripwire, the F1-catching net); consider a new INV for the
typed-reader boundary + the Test Command tripwire-family list.
NOTE: Batch 3 is a PREVENTION/structural change (net 0 — no live bug fixed; F1 was
fixed in Batch 1) — it kills the recurrence mechanism for the AuditLog.

## Batches 4-5 completed (2026-07-10)
Test-integrity (batch 4): M-13 behavioral editor test for
archiveSheetRowsOlderThan_ (temp TEST_ tabs; append-order back-fill,
headerRows:2, width padding, strict-< cutoff, idempotence, append→flush→delete
pin); M-14 _skipTest() mid-body SKIP mechanism — 11 sites converted from
_assertTrue(true,'…skipped') and the S1.1 ADP-tz test now FAILS (not passes)
on an unreachable sheet; M-15 tripwire generalization (SUBMITTED_AT any-index
scan incl. Tests.js, global [CN.TIMESTAMP] whitelist scan + hour-buckets added
to the enumerated INV-142 list, TIME_OFF_TYPES⊆LEAVE_DEDUCTION_CLIENT reverse
check — types without a client entry must resolve to the server default,
'Other' passes); 9 literal NUL bytes escaped to \u0000 in Code.js +
script_kb.html (both files grep as TEXT again); harness hardening
(extractFunction/extractRawFunction paren-anchored — the getQuiz prefix
collision; DOM flushTimers rethrows the first error instead of swallowing).
UX polish (batch 5): midnight self-undo works end-to-end (server elapsed-ms
check accepts yesterday-within-5-min; client -1 sentinel no longer reads
eligible); Log-enter ambient double-poll removed (cache-paint + staleness-
gated start; the poll-driven stack refresh skips when the stack is <15s fresh
— focus/nav refreshes stay unconditional per the DOM pins); stats-mini snaps
instead of re-counting from 0 every minute; refresh preserves in-flight-toggle
note objects (INV-56 guard survives); inline-edit typing survives unrelated
cnRenderStack_ re-renders (snapshot/restore); hover day-popover exempted from
the focus trap (pinned popovers still trap); stacked ui-dialogs: topmost-only
key handling + stopImmediatePropagation; Coverage/Punctuality presets use
UTC-noon mgrAddDaysIso_ (DST-safe); Q39a joined the PPD progress ring/stepper
(stepper Node tests updated); coachAck_ in-flight guard + button disable;
intakeYnKey_ arrow-nav on the ynnum/ynreveal inner radiogroups; esc()/Number()
on p.direction, monthName, covPct, Team-Metrics heroLabel; renderPtoMini_ +
its CSS cluster removed (orphan); coverage note no longer says "Per-tz (v1)";
?prefill applies AFTER the draft restore (deep-link intent wins).

## Pending / not yet done
- /sync-docs for batches 4-5: INV-23 (midnight-wrap self-undo now real),
  INV-83 (topmost-only dialog keys), INV-142 (global scan + 5th reader),
  Test Command section (new tripwire families + _skipTest + paren-anchored
  extraction), 8c hover-popover trap exemption, ambient stats cache note,
  editor-suite expectation (SKIP rows now appear where fixtures are missing).
- OPERATOR (deploy): clasp push -f + New version; RE-RUN
  installAutomationTriggers() once (archive trigger 1am→6pm CT from batch 3);
  editor runSmokeTests/runAllTests — EXPECT some SKIP statuses where fixtures
  are unprovisioned (previously masked as PASS) + the new
  archiveSheetRowsOlderThan_behavioral test.
- Then /reflect to close cycle 8 (metrics.csv + estimates.csv rows).
- Cycle-8 findings NOT implemented (deliberately deferred): TO/PAR archive
  tier (years-horizon), punctuality full-Timesheet read (bounded by the
  archive once enabled), Spanish `to:`-operator caveat now covered, Q31a body
  diagram + follow-up-date-on-action-flags (roadmap features, not findings).

## Where I left off
Batches 4-5 implemented + tested (pure 277/0, DOM 59/0, node --check green);
next: commit+push, then /sync-docs, then /reflect when the operator says done.

## Batches 2-3 completed (2026-07-10)
Client races/dead features: M-7 greet-rotator hover freeze (bind-at-start +
reset, clkGreetRotBind_); M-8 History range race (current-selection guard in
cnLoadDateRange_); M-9 DR resolve view guard; M-10 History honors
CN_STATE.filter + clearable .cn-hist-filterpill (quick-chips now work); M-12
compact pop-out gates clkLoadDashboard_/Extras_/greet rotator on COMPACT_MODE;
exact-tab switch re-fires search (S28 restored); ambient polling starts on ANY
CN tab via showView (idempotent start); audit-search seq token; KB related
L-18 guard; KB tab search failure toast.
Server correctness/PHI/automation: M-11 managerBriefSuppressionActive_ (flag
AND fresh managerBrief heartbeat; fail-safe) + 6th detector check
'briefConfig' + tripwires updated; resolve-token CTA per-recipient split
(internal-only) via resolveEmailRecipients_ internalTo/externalTo; contractor
pending-card PTO projection gated on per-row ptoEnabled; updateTimeOffStatus
compensating status-revert on balance-throw (retry self-healing, no
double-deduct); decimal weight parseFloat (+ engine Node case); hour-buckets
via cnTimestampString_ (INV-142); intakeTsString_/dob recover in the Intake
sheet's OWN tz; 2000-char caps on the 4 post-submit subformData writers;
Spanish exact-address guard (spanishAddrListIncludes_, Node-pinned) + {to: cc:}
search coverage; getWhatsNew id-column scan + row fetch; managerGetCallNotes
bounded via readCallNoteRowsInRange_; verifyDocSignature blank-hash fallback
mirror (no false tamper); quiz dead-KB-link nulled when draft/missing;
Timesheet archive trigger 1am→6pm CT (offshore quiet window); coverage
startsPrevDay flag + "(from prev. day)" client marker.

## Pending / not yet done
- Batch 4 (test-integrity): M-13 archiveSheetRowsOlderThan_ behavioral test;
  M-14 PASS→SKIP (13 sites incl. the S1.1 tz test); M-15 tripwire
  generalization (SUBMITTED_AT any-index scan, global CN.TIMESTAMP scan,
  TIME_OFF_TYPES ⊆ LEAVE_DEDUCTION_CLIENT); NUL→\u0000 escapes; harness
  hardening (getQuiz prefix collision, DOM flushTimers swallow).
- Batch 5 (UX polish Lows): midnight self-undo, Log-enter RPC dedupe +
  countUp-once, refresh in-flight-note preservation, inline-edit wipe, hover
  popover focus-trap exemption, stacked ui-dialogs, DST preset math, Q39a
  progress ring, coach ack guard, ynnum/ynreveal keyboard, esc() nits,
  renderPtoMini_ orphan, coverage "Per-tz (v1)" copy string, prefill-vs-draft
  order.
- /sync-docs pass for batches 2-3 (see Decisions below), then /reflect when
  the operator calls the cycle done.
- OPERATOR (deploy): clasp push -f + New version; RE-RUN
  installAutomationTriggers() once (archiveOldTimesheetRows moved 1am→6pm CT);
  editor runSmokeTests/runAllTests.

## Decisions made (so the next session doesn't re-litigate)
- M-11: suppression = flag AND managerBrief heartbeat <26h (fail-safe: a
  doubled manager email beats a silent outage); heartbeat stamps even while
  the flag is off, so trigger-installed+flag-flip suppresses immediately.
  Detector 'briefConfig' (6th key) surfaces flag-on-without-trigger.
- CTA split: internal copy sends FIRST (an external-copy failure duplicates a
  dept email on retry, never the customer's).
- updateTimeOffStatus: kept status-first ordering + compensating revert in the
  catch (balance-first was rejected — it double-deducts when the status write
  fails after a successful deduction).
- Timesheet archive hour: 6pm CT = the all-team quiet window (CST ended;
  IST/PHT not started).
- Doc updates owed: INV-151 (liveness-gated suppression), INV-142
  (hour-buckets now via cnTimestampString_), INV-153 + trigger list (6pm),
  INV-31 (Spanish exact-match + Cc), Turn-C detector count (6 keys), the
  ambient-polling gotcha (now genuinely any-CN-tab), quick-chips (now filter).

## Where I left off
Batches 2-3 implemented + tested (pure 275/0, DOM 59/0, node --check green);
next: commit+push, /sync-docs for the batch 2-3 doc list, then batch 4 and/or
batch 5 on request.

## Cycle 8 — scan + first fix batch (2026-07-10, claude/broad-scan-0y5q6b)
Scan: 7-agent fan-out + personal verification of the High + all 15 Mediums
(all confirmed, none retracted). ~47 findings: 0 Critical / 1 High / 15 Medium
(+2 Stage-2 Lows) / ~30 Low. Scan-time scores: Overall 8 · Correctness 7.5 ·
Security 8.5 · Data Integrity 8 · Timezone 8 · Concurrency 8 · Test Coverage 8 ·
Clarity 8.5 · AS Practices 8.5 · Mgr UX 7.5 · Emp UX 7.5 · Automation 7.5.
The full findings list lives in the session transcript; the UNIMPLEMENTED
backlog (M-7..M-15 + ~30 Lows) is re-derivable from the Top-5 + Medium tables.

## Completed this cycle
- H-1 | script_core.html | enterTimeoffView/enterManagerView default `area` — the load-error Retry buttons (argless onclick) threw and the retry path was dead
- M-1 | Code.js + Tests.js | runDailyExportCheck exports the morning AFTER the period completes (1st-of-month / biweekly end === yesterday); removed isLastBusinessDayOfMonth_ + its smoke test (old gate fired mid-final-day at 12pm IST and silently omitted afternoon punches)
- M-2 | tc/script_manager.html | Day Edit rejects "To" ≤ edit date instead of silently downgrading to the destructive single-day reconcile; To-picker min tracks the From date (+ deNextDay_ helper)
- M-3 | cn/script_callnotes.html | e.repeat guard on both save chords + a composeFlow re-entry guard in cnSubmitActiveForm_ — a held/double Ctrl/⌘+Shift+Enter wrote N duplicate note rows (keepForm kept the form populated)
- M-4 | cn/script_callnotes.html | external composer mirrors INV-145: close refused while the send RPC is in flight + the success handler only closes its own composer instance (mid-send Esc→reopen destroyed the new draft / duplicated the customer email)
- M-5 | Code.js + test/client/run.js | drSplitDepts_/drSlaForToDept_ — multi-dept sends ("Billing, Shipping" joined ToDept) now reach each component dept's Incoming inbox, member-resolve, SLA (strictest/min), and deptStats (bucketed per component). 2 new Node pins (273 total)
- M-6 | Code.js | voidCoaching writes the free-text reason to a NEW trailing Coaching VoidReason column (header self-heals; COACH_HEADERS 13→14, CO.VOID_REASON:13) — the shared AuditLog row is now content-free (coachId only), mirroring voidDoc (INV-134/INV-32)

## Pending / not yet done
- Cycle-8 backlog NOT selected this batch: M-7 (greet-rotator stale hover freeze), M-8 (History range race), M-9 (DeptRequests resolve view guard), M-10 (quick-chip History filter no-op), M-11 (managerDailyBrief flag-on-without-trigger silence), M-12 (compact pop-out hidden-UI RPCs), M-13 (archiveSheetRowsOlderThan_ behavioral test), M-14 (PASS-instead-of-SKIP masking, incl. the S1.1 tz test), M-15 (tripwire generalization: SUBMITTED_AT any-index scan, global CN.TIMESTAMP scan, TIME_OFF_TYPES ⊆ LEAVE_DEDUCTION_CLIENT), + ~30 Lows (incl. NUL→\u0000 escapes, resolve-token-to-external edge, contractor PTO projection, decimal weight parse, hour-buckets tz recovery).
- OPERATOR (deploy): one `clasp push -f` + New version; run runSmokeTests/runAllTests in the editor (expect the suite minus the removed isLastBusinessDayOfMonth smoke test = 266 registered).

## Decisions made (so the next session doesn't re-litigate)
- M-1: exports now arrive the MORNING AFTER the period ends (deliberate ~1-day-later delivery in exchange for completeness; monthly gate = 1st of month, not last business day).
- M-5: multi-dept SLA = the STRICTEST (minimum hours) component SLA; deptStats counts a multi-dept request under EACH component dept; 'Other' is dropped by the split (legacy 'Other'-only rows fall back to the raw label).
- M-6: void reason lives ONLY in the HR store (VoidReason column, 500-char cap); it is NOT surfaced in the coaching dashboard yet (investigators read the sheet) — surfacing it is a possible follow-on.
- M-3: while a Save & Compose flow is active, ALL form submits are refused (the form content belongs to the flow) — not just keepForm ones.

## Where I left off
Cycle-8 batch H-1+M-1..M-6 implemented + tested (pure 273/0, DOM 59/0, node --check green); next: commit+push this branch, then /sync-docs (INV-134/138/145 + operator-checklist export-timing updates), then either implement the remaining Mediums or /reflect to close the batch.

## Night-sky phases + Dashboard skeletons (2026-07-10, claude/broad-scan-45plfi)
Operator picked options (a) night sub-phases + (b) twinkling/shooting stars +
(d) real moon phases for the IST-overnight-shift sky, and skeleton shapes to
replace the loSweep bar on the Dashboard. Client-only (`tc/script_clock.html`),
zero server/operator state:
- clkSkyFor_ night split: Dusk 17-20 / Nightfall 20-23 / Midnight 23-2 /
  Late night 2-4 / Pre-dawn 4-5, each a distinct gradient + a `stars`
  density 0-3. The existing 10-min sky poll + .sky-layer cross-fade (§10)
  animates the transitions unchanged.
- clkSkyDecor_ renders a deterministic star field (index-hashed positions,
  counts [0,9,16,26] by density; _clkLastStarDensity rebuild guard) + a moon
  disc INSIDE .clk-sky-layers — so the .has-bg photo mode auto-hides all of
  it. Moon phase from the pure clkMoonPhase_ (synodic 29.530588853d from the
  2000-01-06 18:14 UTC new moon; octant → CLK_MOON_SHADE translateX shadow;
  phase name in title/aria-label). Node-pinned (Full/quarters/wrap/neg-mod).
- clkShootMaybe_ piggybacks the 1Hz startClock tick: an occasional .clk-shoot
  streak, only when density≥2 AND rep-local time is past mid-shift
  (clkSchedStartMin_ + lengthMin/2), ~2.5-4.5 min cadence; skipped under
  prefers-reduced-motion and .has-bg. Twinkle keyframes are neutralized by
  the global reduced-motion block.
- Dashboard loaders: initial #dash-cards + the three extras-card loading
  branches now render card-shaped .skel skeletons (clkDashSkeleton_/
  clkDashSkelCard_/clkDashSkelKpis_) instead of loSweep; orphaned
  .dash-cards-loading CSS removed. A Node tripwire pins ZERO loSweep( in
  tc/script_clock.html + the skeleton wiring, so the bar can't quietly return.
- Pure 271/0, DOM 59/0. CLAUDE.md: Loader Role C note + §10 night-sky decor
  paragraph. No editor-suite change (client-only).
- OPERATOR: rides the same pending clasp push -f + New version as #128-#130.

## Testing-feedback round 2 (2026-07-09, claude/broad-scan-45plfi)
Five items from continued live testing; three implemented, two answered with
options (night-shift sky phases; loSweep loader alternatives — operator picks):
- Spanish Inbox manual mark-resolved: resolveSpanishThread (canSeeSpanishInbox_
  gate, ThreadBody-style scope guard, locked, idempotent; uiConfirm client
  button on pending cards; "marked manually" label on Resolved cards).
  PHI-free SpanishManualResolved tab on the ADP sheet (threadId/resolver/ms —
  ms as NUMBER cell, no coercion); readers consult spanishManualResolvedMap_
  (bounded 1000 tail); pending drops immediately, stats within 5-min TTL
  (INV-43 posture). INV-31 amendment now five Spanish endpoints; gate test +
  source tripwire added.
- What's-new → Dashboard greeting carousel: the greet bar's status line now
  rotates upward-carousel style (status ↔ update slides from the article's
  list items via pure whatsNewItems_, Node-pinned; 8s cadence, hover-hold,
  startClock/stopClock lifecycle, clkRegSlide animation reuse, NEW pill gated
  by whatsNewShouldShow_). The panel NO LONGER auto-opens — slides/sidebar
  star open it; dismissal still stamps umsWhatsNew. INV-152 updated.
- Clock background image fix: the upload always worked — the Dashboard
  redesign made hero == clock tile whose OPAQUE sky sat on top of the photo
  layer (invisible photo → "doesn't work"). Now .has-bg hides the sky layers
  + makes the tile transparent, so the photo (baked scrim) IS the clock card.
  CSS-only; umsClockBg gotcha rewritten.
- Pure 268/0, DOM 59/0; editor suite: resolveSpanishThread added to the
  Spanish gate case (five endpoints).

## Intake PPD operator-feedback batch (2026-07-09, claude/broad-scan-45plfi)
Live-testing feedback after the #126/#127 deploy. Two PRs:
- UI polish (PR #128, merged): choice groups → separated pill buttons (the
  joined segmented box wrapped awkwardly on Q2-Q6; CSS-only, .intk-reveal-opts
  too); Q40 → NEW `ynnum` control kind (Yes/No + number-only field + 'hours';
  value ''/'No'/'Yes'/'Yes: 12 hours'; pure intakeYnNumSerialize_/Parse_
  Node-pinned; legacy free-text → unselected); Q25/Q31a/Q34 display-only
  option `tone` (warn/danger/no selected-state colors, No = dark ink chip —
  values byte-unchanged, tone map Node-pinned); help-glyph tooltip → tokened
  CSS bubble (data-tip + .intk-help::after, dark-mode-safe, keyboard focus).
- Q39a dwelling + mobile-home engine rule (OPERATOR-APPROVED via
  AskUserQuestion: build it; ≥285 → standard logic; home constraint WINS over
  clinical gates): new ENGINE-READ choice Q39a (House/Apartment/Mobile Home,
  canonical-EN; numbered 39a so Q40-45 keys/stored answers never shift).
  Engine: patient.dwelling/livesInMobileHome in intakeDeriveClinicalFactors_;
  intakeFilterRecommendations_ short-circuits Mobile Home + 0<weight<285 →
  K0821 ONLY (bypasses seat/group gates, fixed-vocabulary justification;
  no K0821 catalog row → empty result); blank weight → standard logic
  (documented). Explainability += Dwelling + Mobile-home restriction rows.
  Tests: Node engine-contract + rename-guard + explainability (266/0 pure),
  editor test_intake_engine_mobileHomeRestriction (smoke). INV-112 + the
  PPD gotcha updated (engine-critical list += '39a').
- OPERATOR: one clasp push -f + New version; runSmokeTests() picks up the new
  engine smoke test. VERIFY the live Offerings sheet has a K0821 row with
  real pdfLink/imageUrl (col E/F) — the restriction returns empty when absent.

## Feature #7 — Timesheet cold-archive (2026-07-09, claude/broad-scan-45plfi)
The last unbounded store: the Timesheet tab grew forever while
getManagerDashboard / exports / calendars read it whole. Applied the CN cold-
tier model to the payroll tab (INV-153):
- archiveSheetRowsOlderThan_ parameterized with opts {headerRows, width};
  DEFAULTS (1, CN_HEADERS.length) keep the CN call sites byte-identical
  (Node-pinned: archiveOldCallNotes still calls 4-arg).
- archiveOldTimesheetRows (15th trigger, manager-tz 1am, INV-44 gate, INV-01
  locked): MOVES rows older than the window to a TimesheetArchive tab in the
  SAME ADP spreadsheet (created by copying the live tab's TWO-row header);
  scans every row (Timesheet is APPEND order); append-then-delete + flush
  (worst case duplicate, never lose). NO purge tier — payroll keep-forever.
- Window: Script Property TIMESHEET_ARCHIVE_DAYS → CONFIG (default 0 =
  disabled); values in (0,120) clamp UP to TIMESHEET_ARCHIVE_MIN_DAYS so a
  typo can't strip active-window payroll rows; garbage/negative → disabled.
- Audit row 'TimesheetArchive' on every enabled run (in
  AUTOMATION_AUDIT_ACTIONS + client CN_HEALTH_RUN_LABELS — coupling-registry
  enforced; adminAuditRowTone_ already tints /Archive/ as info).
- Tests: pure 258→261 (move-only/floor/CN-defaults; gate-type tripwire
  auto-covered the handler), DOM 59/0 unchanged; editor
  +test_triggerGate_timesheetArchive_nonManagerThrows +
  test_timesheetArchive_windowFloorAndDefault → suite 264.
- Docs: INV-153; INV-44 14→15; trigger list 14→15; operator entry
  (recommend TIMESHEET_ARCHIVE_DAYS=365); storage-map ADP row now lists
  TimesheetArchive + ClientErrors tabs.
- KNOWN TRADEOFF (documented): archived rows leave in-app month navigation
  (calendar/timesheet views read the live tab only); they stay in
  TimesheetArchive for payroll audit. Floor guarantees adjust/export/trend
  windows stay live.
- OPERATOR: clasp push -f + New version; re-run installAutomationTriggers()
  once (15th trigger — harmless while window=0); runAllTests() (expect
  264/0); set TIMESHEET_ARCHIVE_DAYS=365 when ready to enable.

## Feature batch #1/#2/#4 (2026-07-09, claude/broad-scan-45plfi)
Operator-selected from the post-cycle suggestions list ("/broad-implement #1, #2, and #4"):
- #1 Client error beacon (INV-150): window.onerror + unhandledrejection hooks in
  script_core.html post {message, stack, view, source} — CLOSED payload shape,
  PHI-safe by construction (never field values) — to recordClientError
  (rep-gated, locked, server-bounded CLIENT_ERR_MSG_MAX/STACK_MAX, 20/hr/rep
  CacheService rate cap) → append-only ClientErrors tab in the ADP SS
  (getOrCreateClientErrorsSheet_). Client dedupes + caps 5/session; surfaced in
  Automation Health via clientErrorsSummary_ (bounded 2000-row tail, 7d window)
  + a "Client errors" panel section. Deliberately NOT in the failure digest.
- #2 Consolidated manager daily brief (INV-151): sendManagerDailyBrief (14th
  trigger, manager-tz 8am, INV-44 gate) behind the managerDailyBrief flag —
  the registry's FIRST pure-'server'-scope flag, default OFF (behavioral
  no-op). Per-manager branded email (docs+coaching team-scoped per
  INV-122/134) from the SAME factored computations the standalone digests use
  (NEW computeMissedClockOuts_ + deptRequestsOverdueOpen_ factorings; reuses
  managerAggregateUrgent_/trainOverdueForRoster_/empDocsOverdueAll_/
  coachUnackedAll_). While ON, exactly 4 handlers suppress their MANAGER
  sends (missed-punch summary, urgent, training-overdue manager loop,
  dept-SLA) — employee sends untouched; weekly digests + the failure watchdog
  NEVER consult the flag (the watchdog reports a dead brief — circularity
  avoided). Heartbeat 'managerBrief' stamps BEFORE the flag check.
  Pure managerBriefSections_ drives sections/subject/silence.
- #4 What's-new panel (INV-152): getWhatsNew (rep-gated, read-only, {none:true}
  on every quiet-failure path) serves the PUBLISHED KB article named by Script
  Property WHATSNEW_KB_ID (drafts hidden from EVERYONE — broadcast surface);
  stamp = kbCellTs_(UPDATED_AT). Client auto-opens once per stamp change
  (umsWhatsNew seen-stamp — 15th localStorage key; ensureOverlay + kbMd_;
  every dismissal path stamps via the onClose hook), defers to a pending tour,
  never in compact; sidebar star button reopens.
- Tests: pure 248→257 (errBeaconPayload_, managerBriefSections_,
  whatsNewShouldShow_, suppression-set/flag-registry/wiring tripwires; the
  existing TARGETS/gate-type/DIGEST_LABELS tripwires auto-covered the new
  trigger), DOM 55→59 (beacon dedupe+cap, What's-new render + Esc-stamps-seen).
  Editor: +test_triggerGate_managerDailyBrief_nonManagerThrows,
  +test_recordClientError_authBoundsAndAppend (self-cleaning),
  +test_whatsNew_propertyGateAndDraftHidden → suite 262.
- Docs: INV-150/151/152; INV-44 13→14 handlers; localStorage gotcha 14→15
  keys; trigger list 13→14; operator entries (managerDailyBrief flip +
  re-install triggers once, ClientErrors tab, WHATSNEW_KB_ID).
- OPERATOR: one clasp push -f + New version; re-run installAutomationTriggers()
  once (wires the 14th trigger — harmless while the flag is off); runAllTests()
  (expect 262/0). Optional: flip managerDailyBrief in Admin → Feature Toggles;
  create a "What's new" KB article + set WHATSNEW_KB_ID to enable the panel.

## Cycle 7 broad-scan + Turn 1+2 (2026-07-09, claude/broad-scan-45plfi)
Audit: 6-agent fan-out + personal verification of every Medium+ finding (all
confirmed, zero retractions). Scores: Overall 8, Correctness 7.5 (was 8.5),
Sec 8.5, Data 8.5, Tz 8, Conc 8.5, Test 8, Docs 8.5, GAS 9, MgrUX 8, EmpUX 7.5,
Automation 7.5. Full findings list + 8-turn sequencing live in the session
transcript AND are summarized per-turn below (Pending).
Turn 1+2 IMPLEMENTED (commit 3f083a1):
- H-1 coaching overdue dead (space-form CreatedAt vs T-only parseTimestampMs_)
  → both consumers now use coachParseTs_; +source tripwire.
- H-2 generateExportSheet_ pins new-sheet tz to the ADP sheet's (raw coerced
  Date cells; script tz = America/Chicago); +source tripwire. NOTE: interacts
  with the still-pending operator ADP-sheet-tz decision — safe either way now.
- M-1 submitPunch failure handler prime→btn (silent punch failures fixed).
- L-1 voidCoaching finally-release (INV-01).
- M-2 intake draft: root-guard in the debounced save + intakeFlushDraftNow_
  flush wired into showView (typeof-guarded, try/catch'd). DOM tests bite-checked.
- M-5 search stale-guard trimmed-to-trimmed (rep + mgr).
- L-15 untouched acct Yes/No toggle serializes '' not 'FALSE' (send-safe:
  server renders any non-'TRUE' as unchecked box — verified).
- L-22 nav-hint prefill now runs AFTER sticky-draft restore.
- L-26 form-catalog fetch failure no longer cached as [] ("no forms") — null.
Tests: pure 233/0 (+3), DOM 52/0 (+4); node --check clean. Net +5/−0.

## PPD redesign Phase 4 (2026-07-01, claude/broad-scan-2ll5ok)
Display-only polish; ENGINE UNTOUCHED, SERVER UNTOUCHED (none of Q32/Q33a/Q37/Q45
are engine-read; email renders new values via the else branch as escaped text).
- Q32 spasticity tooltip: INTAKE_PPD_HELP map → hover-help `info` glyph on the
  label (native title + aria-label, esc'd).
- Q33a conditional-hide: INTAKE_PPD_REVEAL {'33a':{whenQ:'33',whenVal:'Yes'}} +
  intakePpdApplyReveals_ (hooked in intakePpdAfterChange_ + after draft restore);
  hidden rows are cleared so no stale value rides the payload.
- Q45 ynreveal: NEW control kind (Yes/No reveals a sub-multi-select of arthritis
  types Rheumatoid/Osteoarthritis/Psoriatic). Value ''/No/Yes/'Yes: A, B'. Pure
  intakeYnRevealSerialize_/Parse_ (legacy free-text → unselected, raw text stays
  in the stored row; Sent viewer displays stored text verbatim, no re-parse).
- Q37 height parse: numunit parse:'height' → intakeNumUnitParseHeight_ on blur →
  pure intakeParseHeightInches_ (5'1"→61; plain number untouched).
- DEFERRED: optional Q31a body diagram (operator "cool but not essential" — a big
  SVG-interaction feature disproportionate to a polish phase; Q31a multi already
  captures side/limb structured data).
- Tests: +3 pure (ynreveal serialize/parse, height parse, Phase-4 config wiring).
  Pure 230/0, DOM 48/0, Code.js/Tests.js parse OK (intake partial covered by the
  run.js vm parse-guard). CLAUDE.md gotcha + INV-112 updated.

## PPD redesign Phase 3 (2026-07-01, claude/broad-scan-2ll5ok)
Curated `condition` multi-select pickers for the four condition-list questions.
OPERATOR-CONFIRMED via AskUserQuestion: do ALL of Q29/Q41/Q42/Q43 (Q29 = PVD
sub-conditions e.g. claudication/lymphedema — the operator's own examples), ship
seeded lists flagged for clinical review. NOTE: the original spec said "Q29/Q42/
Q43" but Q29 is really "peripheral vascular disease" and the qualifying-conditions
Q is actually Q41 — surfaced this + the operator chose to picker-ize Q29 too.
- New `condition` control (replaced the Phase-1 plain-text stub): filter box +
  option buttons (from INTAKE_CONDITION_LISTS[list]) + selected-chip row + "Add
  <typed>" off-list escape. Value = comma-joined selected strings in data-val
  (round-trips like `multi`). Handlers: intakeCondToggle_/Filter_/FilterKey_/
  AddCustom_/RemoveChip_/Render_; get/set: intakeConditionGet_/Set_; pure
  intakeCondToggleValue_. intakePpdGetVal_/SetVal_ + hasInputId updated.
- INTAKE_CONDITION_LISTS: vascular/qualifying/cardiopulmonary/neuro (seeded,
  comma-free, English values). INTAKE_PPD_CONTROL += Q29/41/42/43 condition;
  removed '29':'yn' from INTAKE_PPD_TYPE.
- ENGINE UNTOUCHED. Q29/41/42 not engine-read; Q43 read ONLY as truthy-vs-exclude
  (hasValidNeuroDiagnosis) → any non-empty value valid, empty = no Dx. SERVER
  needed NO edit (Q29/41/42/43 render via the else branch as escaped comma text).
- Tests: +4 pure (intakeCondToggleValue_; Q29/41/42/43 are condition + lists
  resolve; every neuro value → valid neuro Dx + none collide with exclude list;
  all list values comma-free). Pure 227/0, DOM 48/0, node --check clean.
- CLAUDE.md: updated the "Intake PPD controls engine-safe" gotcha + INV-112 for
  the Phase-3 condition pickers + drift guard. Q43 free-text framing removed.
- SEEDED LISTS ARE FLAGGED FOR CLINICAL SIGN-OFF (pure editable content constant,
  zero engine risk to refine). LOCALIZED condition labels = follow-on.

## PPD intake redesign (Phases 0–2 merged 2026-07-01, claude/broad-scan-2ll5ok)
UI/UX upgrade of the PPD form's question response formats WITHOUT touching the
fragile recommendation engine (intakeFilterRecommendations_/intakeDeriveClinicalFactors_).
KEY de-risk: engine-critical questions (Q25/Q31a/Q34/Q43/Q38) CAN become structured
controls IF option VALUES emit exactly the English substrings the engine matches
(canonical-English-value rule — also fixes a latent bilingual bug where Spanish
free-text never matched). All controls serialize to/from a STRING so drafts /
intakeCollectPpd_ / engine / email builder work unchanged.
- #113 Phase 0 (merged): engine-contract lock — 6 tests feeding the new structured
  values through the live engine, engine untouched.
- #114 Phase 1 (merged): string-valued control framework (INERT) — INTAKE_PPD_CONTROL
  registry + intakePpdControl_ + control builders (choice/multi/numunit/reveal/
  condition) + pure serialize helpers (intakeMultiToggle_/Serialize_/Parse_,
  intakeRevealSerialize_/Parse_). Null control → legacy path byte-identical.
- #115 Phase 2 (merged): populated INTAKE_PPD_CONTROL per-question (Q1 multi mobility,
  Q2-6/Q24 choice, Q25/Q31a/Q34 multi w/ No-exclusive, Q37/38 numunit, Q39 reveal),
  INTAKE_PPD_TYPE Q14-23 sev→yn, removed Q1/24/37/38/40. FIRST visible form change.
  Server needed NO edit (INTAKE_PPD_YESNO_QS already lists Q14-23; email builder
  already splits comma-joined multi). NEW Phase-2 drift-guard loads the LIVE config
  and feeds values through the engine so a rename fails CI. Pure 223/0, DOM 48/0.
  INV-112 + the "Intake PPD Option A" gotcha rewritten to "engine-safe canonical-
  English values, drift-guarded."

## Where I left off
2026-07-09 (feature batch): shipped the operator-selected suggestions #1
(client error beacon, INV-150), #2 (consolidated manager daily brief behind
the managerDailyBrief server flag, INV-151), and #4 (What's-new panel via
WHATSNEW_KB_ID, INV-152) — see the "Feature batch #1/#2/#4" block above for
full detail. Pure 257/0, DOM 59/0; editor suite grew to 262 (3 new tests).
NEXT: merge the feature-batch PR on green; then operator steps — ONE
clasp push -f + New version, re-run installAutomationTriggers() once (14th
trigger), runAllTests() expecting 262/0; optionally flip managerDailyBrief +
set WHATSNEW_KB_ID. Next audit cycle = fresh /broad-scan (Cycle 8) whenever
desired; seams counter is at 0.

## Pending / not yet done
- NONE — Cycle 7 is fully closed AND operator-verified in production
  (2026-07-09): runAllTests 259 passed / 0 failed; runSmokeTests 113 passed /
  0 failed / 146 skipped-as-integration (the new automationDetectorLiveness
  smoke check passing among them). No open code work.
- OPERATOR (optional, no urgency): fill Employees column O `Schedule`
  (`H:mm-H:mm`, rep-local) for reps with nonstandard shifts; align sheet tzs
  to `Asia/Kolkata` per Storage Health (cosmetic-risk-only since H-2/INV-141);
  set ADMIN_EMAILS to narrow the Admin tab.
- Next audit cycle = a fresh /broad-scan (Cycle 8) whenever desired — seams
  counter 0, no verification debt. Roadmap candidates when wanted: follow-up
  date on action flags (the last cycle-5 rep-value item), Spanish condition
  labels, Q31a body diagram; external-form route stays admin-blocked.

## Completed this cycle (Cycle 7 — all turns)
- Turn 1 (3f083a1): H-1 coaching overdue dead; H-2 export-sheet tz pin; M-1
  submitPunch failure handler; L-1 voidCoaching finally.
- Turn 2 (3f083a1): M-2 intake draft teardown wipe + showView flush; M-5 search
  trim-guard; L-15 acct 'FALSE' fabrication; L-22 nav-hint order; L-26 catalog
  failure cache.
- Turn 3 (eda5a08): M-3 punchTime normalize; M-4 isAdjustment boolean-safe; M-6
  bulk-btn selector overlap; L-6 stranded loaders; L-7 dup title; L-8 esc label.
- Turn 4 (fbaa878): M-10 admins⊆managers enforced; M-15 subformData whitelist;
  M-12 KB-AI draft exclusion (searchReference publishedOnly); M-13 convert
  status carry; L-9 draft-KB training guards.
- Turn 5 (be3fe85): M-9 composer close-refusal mid-send; M-8 Team Notes sub-tab
  seq guard; M-7 Admin Sheets empty-pane reload + Retry; L-20 stuck envelope;
  L-21 note-ref sync; L-23 exact badge; L-25 QA in-flight guard.
- Turn 6 (ef572fa): M-14 cnTimestampString_ boundary (4 readers);
  createPinnedSpreadsheet_ factory (tz+locale) + 3 sites + no-bare-create
  tripwire; Storage Health locale pills.
- Turn 7 (f6a19ba): M-16 'Other'-dept DR skip; M-11 unmatchedAgents alive
  (offRosterAgents, CDR cache v3); L-10 digest TRX drop; L-11 label cap; L-12
  mail-outside-lock; L-13 lone-urgent fold.
- Turn 8 (3e54681): L-2 future-time guard; L-3 Sat-NYD observance; L-4 half-day
  pair exemption (Node-pinned); L-5 roster-tz defaults; L-14 EOD banner; L-16
  comma/negation guard; L-17 lang-flip reveals; L-18 KB item-open seq; L-19
  Offerings scheme whitelist; intakeClearDraft_ debounce cancel; CLAUDE.md sync.
- Tests added: 10 pure (incl. 6 source tripwires) + 6 DOM; several bite-checked
  against pre-fix code. Harnesses: pure 230→240, DOM 48→54.

## Decisions made (so the next session doesn't re-litigate)
- L-24 dup-card race NOT fixed: needs fuzzy pending↔server note matching (risk
  of dropping a real pending note) for a ≤60s self-healing cosmetic issue.
- Diagnostic-liveness in Automation Health deferred as its own designed change.
- 'Other'-only dept sends are untracked by DeptRequests (mixed sends tracked).
- coachParseTs_'s fixed-UTC parse is acceptable for the 7-day overdue window
  (≤tz-offset skew; matches the analytics block's existing tolerance).
- Untouched acct Yes/No toggles now serialize '' (not 'FALSE') — send rendering
  identical (server branches on ==='TRUE'); stored submissions record ''.

## Prior: KB self-improving loop (#1 + #2, 2026-07-01, claude/broad-scan-2ll5ok)
Non-AI Reference-tool enhancements (operator declined the KB-AI Phase B route for
now, chose these instead). Both feed the manager review workflow; PHI-free-by-policy.
- #2 rep freshness signal: kbFlagItem(itemId, kind∈helpful|notHelpful|stale, note)
  — rep-callable, append-only, locked; new KbFeedback tab. A 'stale' flag surfaces
  the item at the TOP of kbGetReviewDue regardless of age (strictly-newer-than-
  last-review reset, the INV-120 pattern — kbMarkReviewed clears it, no status col;
  kbStaleFlags_ + kbCellTs_ helpers). Only 'stale' is audited (KbItemFlagged, id
  only). Reader "Was this helpful? Yes/No + Out of date" bar (kbFeedbackBarHtml_).
- #1 content-gap requests: kbRequestArticle(topic, note, query) rep-callable append
  -only locked; new KbContentRequests tab; kbGetContentRequests / kbResolveContent
  Request(reqId, action) manager-gated. Deliberate rep action on a ZERO-RESULT
  search (kbNoResultsHtml_ CTA → uiPrompt) = PHI-clean by construction. Manager
  "Content requests" block in the Reference landing (kbLoadContentRequestsBlock_).
  Audit PHI-free (reqId only): KbContentRequest / KbContentRequestResolve.
- Tests: 2 manager-gate cases added to test_managerGates_rejectNonManager
  (kbGetContentRequests/kbResolveContentRequest, MANAGER tier not admin);
  test_kb_feedbackAndRequests_requireEmployee (rep-auth + kind/topic validation).
- Pure 207/0, DOM 48/0, node --check clean. Two tabs auto-provision (deployer edit
  access to KB_SS_ID already required) — NO new Script Property / trigger / migration.

## KB self-improving loop (#1 + #2, 2026-07-01, claude/broad-scan-2ll5ok)
Non-AI Reference-tool enhancements (operator declined the KB-AI Phase B route for
now, chose these instead). Both feed the manager review workflow; PHI-free-by-policy.
- #2 rep freshness signal: kbFlagItem(itemId, kind∈helpful|notHelpful|stale, note)
  — rep-callable, append-only, locked; new KbFeedback tab. A 'stale' flag surfaces
  the item at the TOP of kbGetReviewDue regardless of age (strictly-newer-than-
  last-review reset, the INV-120 pattern — kbMarkReviewed clears it, no status col;
  kbStaleFlags_ + kbCellTs_ helpers). Only 'stale' is audited (KbItemFlagged, id
  only). Reader "Was this helpful? Yes/No + Out of date" bar (kbFeedbackBarHtml_).
- #1 content-gap requests: kbRequestArticle(topic, note, query) rep-callable append
  -only locked; new KbContentRequests tab; kbGetContentRequests / kbResolveContent
  Request(reqId, action) manager-gated. Deliberate rep action on a ZERO-RESULT
  search (kbNoResultsHtml_ CTA → uiPrompt) = PHI-clean by construction. Manager
  "Content requests" block in the Reference landing (kbLoadContentRequestsBlock_).
  Audit PHI-free (reqId only): KbContentRequest / KbContentRequestResolve.
- Tests: 2 manager-gate cases added to test_managerGates_rejectNonManager
  (kbGetContentRequests/kbResolveContentRequest, MANAGER tier not admin);
  test_kb_feedbackAndRequests_requireEmployee (rep-auth + kind/topic validation).
- Pure 207/0, DOM 48/0, node --check clean. Two tabs auto-provision (deployer edit
  access to KB_SS_ID already required) — NO new Script Property / trigger / migration.
- Shipped in #107 (merged). Docs synced inline (INV-139 + storage map + audit
  actions + Key Design Decision).

## KB loop follow-ons — drawer parity + 👍/👎 counts (2026-07-01, claude/broad-scan-2ll5ok)
Both follow-ons noted at #107 close, now built on a fresh branch off merged main:
- Drawer parity: the reader "helpful/out-of-date" bar + zero-result "Request an
  article" CTA now render in the Ctrl/⌘+K drawer too (kbDrawerOpenItem_ /
  kbDrawerSearch_). Feedback bar refactored to locate itself via
  closest('.kb-feedback') (no DOM id) so tab + drawer can't collide;
  kbFeedbackDone_ shared helper; kbFlagStale_ now takes the btn.
- 👍/👎 counts: new kbFeedbackCounts_() (cumulative helpful/notHelpful over the
  bounded feedback tail) folded into kbGetReviewDue + kbGetUsageStats items;
  rendered as a kbFbCountHtml_ chip in the manager Most-used + Review-due landing
  rows (hidden when empty). New thumbsDown icon in script_icons.html (mirrors
  thumbsUp) — also used for the reader "No" button.
- No new endpoints/gates (counts fold into existing manager-gated reads) → no
  test changes. Pure 207/0, DOM 48/0, node --check clean.
- Shipped in #108 (merged).

## KB #3 — broken-embed / lost-access checker (2026-07-01, claude/broad-scan-2ll5ok)
Next in the suggested KB sequence (Wave 1: #3 reliability, then #4 revision/draft).
- getStorageHealth now probes every KB embed for Drive reachability via new
  kbScanBrokenEmbeds_ (bounded KB_EMBED_SCAN_CAP=150, best-effort, PHI-free):
  DriveApp.getFileById(id).getName() forces the lazy access check — a
  deleted/moved file or lost deployer access = a dead /preview iframe that errors
  nowhere (neither "stale" nor an unreachable store). DriveApp already a project
  scope → no new OAuth.
- Returns kbEmbeds:{total,probed,reachable,broken[],truncated}; panel
  (cnRenderKbEmbedsHealth_) renders a danger list (title·dept·kind·open↗·reason)
  + folds "N broken embed(s)" warn into the Overview Storage summary card.
- Scan gated by getStorageHealth({scanEmbeds}) (default on); getDeployReadiness
  passes {scanEmbeds:false} so the Admin Overview never double-scans Drive.
- No new endpoint/gate (rides admin-gated getStorageHealth). Pure 207/0, DOM 48/0,
  node --check clean. Docs: Storage Health Key Design Decision updated.
- Shipped in #109 (merged).

## KB #4 — article revision history + draft→publish (2026-07-01, claude/broad-scan-2ll5ok)
Wave-1 pair to the review loop. NEW INV-140.
- Schema: KB gained trailing `Status` col (KB.STATUS=12, KB_HEADERS→13, self-heal;
  kbRowStatus_ pure — blank→published). KB_CACHE_KEY v1→v2 (items carry status).
- Draft→publish: kbSaveItem takes payload.status (explicit wins; plain re-save
  PRESERVES existing status; new=published). Drafts INVISIBLE to reps across all
  read paths (getReferenceTree per-viewer filter of one cache blob / getReferenceItem
  'Not found.' / searchReference skip / kbGetReviewDue skip). kbPublishItem flips
  draft→published (EmpDocs releaseDoc mirror).
- Revision history: append-only KbRevisions tab; kbAppendRevision_ snapshots PRIOR
  content on every kbSaveItem UPDATE + every revert (best-effort). kbGetRevisions
  (read-only, bounded) + kbRevertItem (restores content, snapshots current first →
  reversible). All 3 ADMIN-gated (authoring tier), mutating 2 locked.
- Audit PHI-free: KbItemPublish/KbItemRevert (id/revId); KbItemSave now carries status=.
- Client: "Save as draft" checkbox, Draft pill (tree+reader) + banner, reader
  Publish/History(→restore) actions (KB_STATE.isAdmin-gated). New CSS
  kb-draft-pill/-banner, kb-rev-row.
- Tests: 3 admin-gate cases added to test_managerGates_rejectNonManager. No KB
  fixture in the automated suite → draft-visibility + revision flow are manual (S-walk).
- Pure 207/0, DOM 48/0, node --check clean. Docs: INV-140 + Reference decision +
  storage map (KbRevisions).
- Shipped in #110 (merged).

## KB #6 + #5 — copyable snippets + per-rep bookmarks (2026-07-01, claude/broad-scan-2ll5ok)
Wave-2 rep-facing (Employee-UX). Client-only; no server/schema change.
- #6 snippets: kbMd_ fence handler extended — a ```snippet (or ```snippet: Label)
  block renders a copy-to-clipboard "canned response" card (kbCopySnippet_ reads
  the <pre> textContent = decoded raw). Rides kbMd_'s existing escape boundary
  (content escaped before fence extraction); kbMd_ stays PURE (markup inlined, no
  icon() dep). NOTE: the fence sentinel in kbMd_ uses NUL bytes (\x00C<idx>\x00) —
  the file is "binary" to grep; the fence edit was applied via a latin1
  byte-preserving Node script, not the Edit tool. Node test added (snippet card +
  plain/js fence unchanged + body still escaped).
- #5 bookmarks: pure kbBookmarksToggle_ (Node-pinned) + kbIsBookmarked_/
  kbToggleBookmark_/kbBookmarkBtnHtml_; star on reader + drawer; Bookmarks block
  atop Reference landing + drawer home; stored in umsKbPanel.bookmarks (cap 12).
- Pure 209/0 (+2), DOM 48/0, node --check clean. Docs: Reference decision +
  umsKbPanel localStorage note.
- Shipped in #111 (merged).

## PPD intake redesign — planning + Phase 0 (2026-07-01, claude/broad-scan-2ll5ok)
NEW multi-phase effort (operator request): upgrade PPD question response formats
(multi-select buttons, condition pickers, validation) WITHOUT touching the fragile
substring-based recommendation engine (intakeFilterRecommendations_ /
intakeDeriveClinicalFactors_). KEY INSIGHT: the "must stay free-text" questions
(Q25/Q34/Q31a/Q43, INV-112) can become STRUCTURED controls if the option VALUES
emit the exact substrings the engine matches (feet/legs, knee/left/right,
"Paralysis Left Arm" comma-joined, real neuro condition names). Canonical ENGLISH
value regardless of display language — also fixes a latent bilingual bug (Spanish
free-text never matched English substrings).
- Operator decisions: condition boxes (Q29/Q42/Q43) = CURATED multi-select filter
  (I'll seed starter lists from Medicare PWC guidance for clinical sign-off);
  scope THIS ROUND = Phase 0 only (engine-contract lock), then pause for review.
- Phase 0 DONE (test-only): 6 Node tests in run.js pin that the exact strings the
  new controls will emit produce the same clinical factors / recommendations as
  today's free-text (Q25/Q34/Q31a/Q43/Q38 + an end-to-end structured-vs-free-text
  parity case). Engine untouched. Pure 216/0, DOM 48/0.
- Phase 0 shipped in #113 (merged).

## PPD redesign Phase 1 — control framework (2026-07-01, claude/broad-scan-2ll5ok)
Reusable string-valued PPD control kinds, INERT until Phase 2 opts questions in.
- INTAKE_PPD_CONTROL = {} (empty) + intakePpdControl_(qNum) resolver; intakePpdRowHtml_
  checks it first (null today → legacy INTAKE_PPD_TYPE path byte-identical).
- New kinds (all string-valued): choice (single-select multi-button, canonical-EN
  value + localizable label, reuses intakePick_ — added .intk-choice), multi
  (multi-select + optional exclusive option, comma-joined in OPTION order,
  intakeMultiPick_/Get_/Set_), numunit (number+unit suffix, value=raw number),
  reveal (option that shows a free-text box, value '<opt>' | '<revealOn>: <text>'),
  condition (Phase-3 PLACEHOLDER — renders a plain text field, engine-safe).
- intakePpdGetVal_/SetVal_ extended for multi/reveal/choice (fall through to the
  existing input/yn/sev path when those groups aren't present → unchanged today).
- PURE Node-pinned helpers: intakeMultiToggle_/Serialize_/Parse_,
  intakeRevealSerialize_/Parse_ (3 new tests, primitive comparisons for vm-realm).
- Engine untouched. Draft/collect/email keep working via the string values.
- Pure 219/0 (+3), DOM 48/0, node --check clean. NO live behavior change.
- NOT YET: committed/pushed. NEXT (on approval): Phase 2 (opt questions into the
  new kinds — the per-question format changes) → Phase 3 (curated condition lists,
  clinical sign-off) → Phase 4 (helpers/conditionals/validation); INV-112 rewrite
  ("free-text" → "engine-safe structured values") lands with Phase 2.

## PPD redesign Phase 2 — per-question formats live (2026-07-01, claude/broad-scan-2ll5ok)
First phase where the PPD form visibly changes. Server needed NO edit (email
builder already renders comma-joined multi values + INTAKE_PPD_YESNO_QS already
lists Q14-Q23). Engine untouched.
- INTAKE_PPD_TYPE: dropped Q1/Q24/Q37/Q38/Q40 (→ CONTROL); Q14-Q23 sev→yn (aligns
  client with the server's yesno coloring); Q7-Q12 stay yn, Q13 stays text.
- INTAKE_PPD_CONTROL populated: Q1 multi(devices), Q2-Q6 choice(3 MRADL opts),
  Q24 choice(Rx/OTC/No), Q25 multi ex:No(No/Hands/Feet/Legs), Q31a multi ex:No
  (paralysis/weakness), Q34 multi ex:No(amputation), Q37 numunit(in.), Q38
  numunit(lbs.), Q39 reveal(Alone/Friends-Family/Other→text). Q40 → default text.
- ENGINE-CRITICAL values (Q25/Q31a/Q34/Q38) exactly match the Phase-0-pinned
  substrings; NEW Phase-2 drift-guard (run.js) loads the live INTAKE_PPD_CONTROL
  and feeds its values back through the engine (rename → CI fail, not silent break).
- Pure 223/0 (+4), DOM 48/0, node --check clean. Docs: rewrote INV-112 + the
  "Intake PPD Option A" gotcha (free-text → engine-safe canonical-English values).
- DECISION: Q7-Q13 left as-is (Q7-Q12 Yes/No = my advice; Q13 free-text) rather
  than the literal "free-text" (which would downgrade the binary function Qs) —
  awaiting operator confirm. Q29/Q42/Q43 = Phase 3 (curated pickers). Q32 tooltip
  / Q33a conditional-hide / Q45 reveal-sub-options / Q37 5'1"→61 parse = Phase 4.
- Follow-on: ES option-label localization (values are EN; labels currently EN);
  intakeSevControlHtml_/INTAKE_SEV_LEVELS now unused (harmless dead code).
- NOT YET: committed/pushed. Operator spot-check of the live PPD form recommended
  (DOM harness doesn't render intake).

## (superseded) original NEXT line
- NEXT (on approval): Phase 1 control framework →
  Phase 2 per-question formats → Phase 3 curated condition pickers → Phase 4
  helpers/conditionals/validation; then UPDATE INV-112 (free-text → engine-safe
  structured values, pinned by these Phase-0 tests). Full plan in the chat
  transcript (per-question table + phasing).

## KB #8 + #7 — search synonyms/filters + see-also (2026-07-01, claude/broad-scan-2ll5ok)
Wave-3 (final KB roadmap items). The KB non-AI roadmap (#1–#8) is now COMPLETE.
- #8 synonyms: Script Property KB_SEARCH_SYNONYMS (≥2-term lowercase groups);
  kbExpandSynonymTokens_ expands query tokens in searchReference (unset = no-op,
  byte-identical). Admin editor: kbGetSearchConfig/kbSaveSearchConfig (admin-gated,
  AdminConfigChange audit) + a "Synonyms" modal in the Reference tree header.
- #8 filters: client-side type chips (All/Articles/Embeds + counts) + department
  <select> over the cached KB_STATE.searchResults (kbRenderSearchResults_/
  kbSearchFilterBarHtml_/kbSetSearchFilter_); kbDoSearch_ refactored to cache +
  re-render with NO re-query. Reference tab only; drawer search unchanged.
- #7 see-also: pure Node-pinned kbCoViewRelated_ (distinct (rep,day)-session
  co-view count, ≥2 threshold so thin data is silent, top 5) + kbGetRelated
  (rep-callable, read-only, bounded KbViews tail; drops deleted + non-admin
  drafts). Reader lazy-loads a "See also" block (kbLoadRelated_). Reference tab
  only (drawer stays light).
- Tests: kbCoViewRelated_ Node test; 2 admin-gate cases (kbGetSearchConfig/
  kbSaveSearchConfig); kbGetRelated rep-auth case. Pure 210/0, DOM 48/0, node
  --check clean. Docs: Reference decision + KB_SEARCH_SYNONYMS operator note.
- NOT YET: committed/pushed. KB roadmap #1–#8 DONE. No further KB items queued —
  next work is operator's call (deploy + runAllTests, or a fresh audit).

## Cycle 6 — DeptRequests v2 (all 4 phases, 2026-06-30, claude/broad-scan-2ll5ok)
Planned (decisions: roster column N membership; manager-summary reminder;
wall-clock SLA; 48h default) then built as 4 commits + a docs commit:
- P1 membership: EMP.DEPARTMENTS col N; ROSTER_CACHE_KEY v6→v7; departmentsRaw on
  the roster readers; pure Node-pinned drParseDepartments_ + empDepartments_;
  getEmployeeState ships departments.
- P2 incoming inbox: getDeptRequests → myDepts+incoming (open requests to the
  caller's depts; PHI-free); resolveDeptRequest widened to sender OR manager OR
  receiving-dept MEMBER; client Incoming section; integration test.
- P3 SLA: DR_SLA_DEFAULT_HOURS=48 + DR_SLA_TARGETS property; getDeptRequestSla_/
  Config_ + pure drSlaStatus_ (ontime/atrisk≥75%/overdue≥100%); slaHours+slaStatus
  per item + overdueOpen per dept; admin-gated getDeptRequestSla/saveDeptRequestSla
  (folded into getAdminConfig); client SLA chips + Overdue column + Admin editor.
- P4 reminder digest: sendDeptRequestReminderDigest (13th trigger, manager-tz 10am,
  manager summary, silent when none); heartbeat deptReqReminder added to
  DIGEST_STALE_HOURS+digestHealth (server) + DIGEST_LABELS (client) — the F5
  coupling registry enforced the client label. Gate test added.
NEW INV-138; INV-44 12→13; INV-136 28→30; INV-28 v7. Pure harness 188→207/0;
node --check clean. The trigger-wiring + F1 gate-type + F5 coupling tripwires all
validate the 13th trigger.
OPERATOR (new): populate roster column N (Departments) for dept-desk reps; re-run
installAutomationTriggers() for the 13th trigger; optional DR_SLA_TARGETS via the
Admin editor (else 48h default); runAllTests() (new deptReq + SLA-gate tests).

## Cycle 6 broad-implement — coupling registry + intake explainability (2026-06-30)
Two P3 strategic-depth items:
- Coupling-tripwire registry (test/client/run.js): a declarative COUPLING_REGISTRY
  + generic runner for SOURCE-LEVEL key-set ⊆ couplings (the Axis-B drift net).
  Reusable extractors (topLevelObjectKeys_/flatObjectKeys_/stringArrayItems_).
  Seeded with the 2 F5 Automation-Health label couplings (replaced their ad-hoc
  tests). The next such coupling is ONE entry. Vm-dependent / custom-shaped
  couplings (day-type validator, trigger wiring, gate-type, intake layout mirror,
  forms-ID mirror, token hygiene, SUBMITTED_AT coercion) stay bespoke — documented.
- Intake recommendation explainability (Code.js + intake client): extracted the
  engine's clinical-factor derivation into the shared pure intakeDeriveClinicalFactors_
  (engine destructures it back into the SAME locals — filter/justify byte-for-byte
  unchanged, so NO drift from the explainability surface). New pure
  intakeExplainFactors_ → flat {label,value}[] of the factors that drove the rec.
  intakeGetSubmission returns `factors` for PPD (recomputed from STORED answers —
  no schema change); the Sent detail renders a read-only "Why these recommendations
  · engine factors" block (every value esc()'d). Manager-auditable (+ rep sees own).
  Node harness updated (loads the 2 helpers into the engine vm ctx) + 2 explain
  tests; the 5 engine tests still pass = behavior-preserving. INV-112/INV-116 updated.
DECISIONS: explainability reuses the engine's OWN derivation (shared helper) rather
than re-deriving — the only drift-free design (and the very genus the coupling
registry fights). Recompute-from-stored-answers avoids a schema migration. Registry
scoped to source-level key-set couplings (the clean, generalizable shape); didn't
force-migrate differently-shaped tripwires (would weaken them). Pure harness 204/0;
node --check clean. NEXT: operator deploy (clasp push -f + New version); no new
Script Properties/triggers/migrations for these two.

## Cycle 6 broad-implement P1 + automation-failure digest (2026-06-30, claude/broad-scan-2ll5ok)
Post-F1–F11 follow-up batch (the audit's strategic gaps + the top P2 feature):
- P1#1 (test/client/run.js): trigger-GATE-TYPE tripwire — every install-TARGETS
  handler must call assertManagerCaller_ AND reference no `.isAdmin` IN CODE
  (comment-stripped first — reconcile's comment legitimately says "NOT emp.isAdmin").
  Would have caught F1. The prior tripwire only checked trigger WIRING, not gate type.
- P1#2 (run.js): Automation-Health label-map tripwire — client DIGEST_LABELS ⊇
  server DIGEST_STALE_HOURS keys + CN_HEALTH_RUN_LABELS ⊇ AUTOMATION_AUDIT_ACTIONS.
  Would have caught F5. Source-level regex (top-level line-anchored keys).
- P1#3 (CLAUDE.md): folded the F7 LunchIn→doorExit morph note into the
  "Punch-button motion" decision.
- Automation-failure digest (Code.js): NEW sendAutomationHealthDigest — daily
  manager-tz 9am, 12th trigger. Reuses the UN-gated computeAutomationHealth_
  (extracted from getAutomationHealth — the gate stays in the wrapper, ONE shared
  computation, no parallel-source drift). Emails MANAGER_EMAILS ONLY on a failing
  check: stale digest heartbeat / stale nightly reconcile (the F1 class, via the
  new additive automationLastRuns[].last.ms field, >30h) / personal-sheet
  sync-fails. Silent when healthy; "never ran yet" not flagged. CDR DROPPED from
  the push (unset CDR_SS_ID would false-nag a non-CDR deploy; panels still show
  it). assertManagerCaller_ gate (INV-44, passes the new gate-type tripwire),
  best-effort, PHI-free. Wired into BOTH TARGETS; gate test added. NEW INV-137.
DECISIONS: digest scoped to automation-TRIGGER failures (not integration/CDR) so
"silent when healthy" holds for every deployment. Watcher has no heartbeat/audit
row of its own (verify from the trigger list) — accepted (meta-watcher out of
scope). computeAutomationHealth_ may throw; every caller wraps it.
Pure harness 188→202/0; node --check clean. NEXT: operator deploy (clasp push -f +
New version) — re-run installAutomationTriggers() to wire the 12th trigger +
runAllTests() (new gate test). DOM harness via CI.

## Cycle 6 broad-implement F7–F11 (2026-06-30, branch claude/broad-scan-2ll5ok)
The Low-tier remainder of the broad-scan, all client-only (no Code.js change):
- F7 (tc/script_clock.html): PUNCH_MORPH.LunchIn.to headset→doorExit — a lunch
  RETURN sets afterLunch, making ClockOut (doorExit) the next primary, so the
  morph now carries seamlessly into the re-render (the #103 afterLunch change had
  left it landing on the old LunchOut-primary headset).
- F8 (cn/script_callnotes.html): cnToggleFlag_ training branch re-resolves the
  note from state AFTER the async uiPrompt (a 60s ambient refresh can replace the
  slot via cnReplaceNoteInState_, detaching the captured ref); fresh prev/next on
  the current object; null-safe if deleted mid-prompt. INV-56/48 preserved.
- F9 (cn/script_callnotes.html): cnToggleMoreMenu_ gained outside-click + Escape
  dismissal via a SINGLE self-removing capture-phase document listener
  (cnCloseMoreMenus_ + _cnMoreMenuCloser); opening one menu closes others; no
  accumulating-listener leak (bounded to 1, self-heals on next mousedown).
- F10 (script_core.html): dispTime() now esc()'s its malformed-input verbatim
  fallback (several callers inject its output via innerHTML) — defense-in-depth;
  the formatted branch (valid times) is unchanged.
- F11 (train/script_empdocs.html): void-reason prompt copy now says the reason is
  SHOWN TO THE EMPLOYEE ("keep it free of internal/sensitive notes") — closes the
  manager-assumes-private exposure risk without a data-model change/operator call.
DECISIONS: F7 fixes the morph to honor the documented carry-through invariant
(doorExit) rather than rewriting the doc. F11 resolved via labeling (not server
withholding) — the employee SHOULD know why their doc was voided; the risk was
the false-privacy assumption, which the prompt now removes. F8 happy-path is
byte-identical; the fix only bites the replaced-slot edge. Pure harness 188/0;
node --check clean. The DOM harness exercises cnToggleFlag_('action') (NOT the
training branch), so no double encoded the old behavior. NEXT: operator deploy
(clasp push -f + New version) — F1–F11 all ride one deploy.

## Cycle 6 broad-scan + implement F1–F6 (2026-06-30, branch claude/broad-scan-2ll5ok)
AUDIT: 4 parallel deep-read agents + independent verification of every concrete
finding. Result = NO Critical/High (5th consecutive). One Medium regression (F1)
from #102/INV-136 + 9 Lows. IMPLEMENTED F1–F6 (NOT yet pushed):
- F1/F2 (Medium, the headline): reconcileCallNotes is a daily TRIGGER but #102
  moved its gate to emp.isAdmin — under a narrowed ADMIN_EMAILS (or a non-roster
  installer) the nightly 5am run silently no-op'd, leaving hand-entered rows
  un-indexed forever. Reverted to assertManagerCaller_ (the INV-44 trigger idiom,
  like the other 10 handlers); audit actor falls back to _SYSTEM_AUDIT_EMP_ for a
  non-roster installer. test_reconcileCallNotes_nonManagerRejected now asserts the
  throw. INV-109 + INV-136 (29→28 admin endpoints) updated in CLAUDE.md.
- F3 (Low): submitPunch animated `.actions .prime` not the CLICKED button — after
  a lunch return (ClockOut=prime, LunchOut demoted) a 2nd-lunch click morphed the
  wrong button. Now targets `[data-action=<punchType>]`, falls back to .prime.
- F4 (Low): 3 coaching failure handlers did showToast(esc(...)) but showToast uses
  textContent → entities shown literally. Dropped the redundant esc().
- F5 (Low): Automation Health client label maps stale vs server — added
  trainingOverdue to DIGEST_LABELS + CallNotesArchive/CallNotesArchivePurge to
  CN_HEALTH_RUN_LABELS (were rendering raw keys).
- F6 (Low): clkRefreshState_ re-renders the WHOLE clock view on every 20s focus
  wake, flashing the teammate skeleton + blanking the note-volume histogram +
  refiring 2 RPCs. Added small module SWR caches (CLK_TEAMMATE_CACHE /
  CLK_NOTEVOL_CACHE): paint last-good instantly, refetch in background, skeleton
  only on first load. Same payload cached (INV-24 preserved — no new fields).
DEFERRED (out of F1–F6 scope, noted for next session): F7 morph carry-through
LunchIn→ClockOut (cosmetic), F8 training-flag note-ref across async uiPrompt
(edge), F9 CN more-menu no outside-click close, F10 dispTime() unescaped (latent),
F11 EmpDocs voidReason shown to employee (design Q). Plus the strategic suggestion:
a CI tripwire asserting no trigger-TARGETS handler uses an isAdmin/roster gate
(would have caught F1) + a client-label-map ⊇ server-keys tripwire (F5 class).
Pure harness 188/0; node --check clean (Code.js + Tests.js). DOM harness needs
npm ci (CI runs it). NEXT: operator deploy (clasp push -f + New version) +
runAllTests() in editor (the only check on the reconcile gate test change).

## Cycle 6 retention 3rd-tier + include-archive search (2026-06-23, branch claude/happy-faraday-0grppg)
Closed the two archive follow-ons (pushed). Retention is now a full 3-tier system.
- 3rd tier: purgeArchivedCallNotes() (top-level trigger, assertManagerCaller_-gated
  INV-44, locked) irreversibly deletes NotesArchive rows older than
  CN_ARCHIVE_RETENTION_DAYS (Script Property → CONFIG.CALL_NOTES.ARCHIVE_RETENTION_DAYS,
  default 0) — the ONLY deleter of archived notes; read-only re tab existence
  (never creates it). getArchiveRetentionDays_; PHI-free CallNotesArchivePurge
  audit + AUTOMATION_AUDIT_ACTIONS. 11th daily trigger @ mgr-tz 2am (before the
  3am archive) + both TARGETS (tripwire green). Gate test added.
- Include-archive search: searchMyCallNotes + managerSearchCallNotes gain an
  includeArchive param → also scan the cold NotesArchive tab (read-only
  getSheetByName, never creates) and tag hits _archived. Match logic factored
  into a per-source closure (live path unchanged). Client "Include archived"
  checkbox on both Search bars (CN_STATE.searchIncludeArchive /
  mgrSearchIncludeArchive); archived hits render a read-only "archived" pill.
DECISIONS: the 3 windows are independent operator knobs — NOTE_ARCHIVE_DAYS (move
Notes→archive), NOTE_RETENTION_DAYS (delete from live), ARCHIVE_RETENTION_DAYS
(delete from cold). 2am purge-archive < 3am archive < 4am purge ordering.
includeArchive defaults OFF everywhere (back-compat: getPatientTimeline's 4-arg
searchMyCallNotes call + the omnibus gate's 4-arg managerSearchCallNotes call are
unaffected). Pure 162/0, DOM 48/0, node --check clean. DOC: /sync-docs (11
triggers, CN_ARCHIVE_RETENTION_DAYS, INV-44 10 handlers, INV-132 now the
cold-deleter, include-archive note, a new invariant).

## Cycle 6 call-note retention ARCHIVAL tier (2026-06-23, branch claude/happy-faraday-0grppg)
Stage-3 follow-on: made retention SAFE by adding a cold-archive tier (pushed).
- New archiveOldCallNotes() (top-level trigger handler, assertManagerCaller_-gated
  INV-44, locked INV-01) MOVES per-rep Notes rows older than CN_NOTE_ARCHIVE_DAYS
  into a NotesArchive tab in the SAME per-rep spreadsheet — data preserved, live
  tab bounded, no new operator store. Helpers getNoteArchiveDays_,
  getOrCreateNotesArchiveTab_, archiveSheetRowsOlderThan_ (append-then-delete +
  flush; worst case = duplicate in cold archive, never lose). PHI-free
  CallNotesArchive audit row.
- Disabled by default (CN_NOTE_ARCHIVE_DAYS / CONFIG.CALL_NOTES.NOTE_ARCHIVE_DAYS
  =0). New CONFIG.CALL_NOTES.ARCHIVE_TAB='NotesArchive'.
- 10th daily trigger at mgr-tz 3am (BEFORE the 4am purge); added to BOTH TARGETS
  arrays (trigger-wiring tripwire green) + AUTOMATION_AUDIT_ACTIONS (health panel).
- New gate test test_triggerGate_archiveOldCallNotes_nonManagerThrows. Pure 162/0,
  DOM 48/0, node --check clean.
DECISIONS: archive lives in the SAME per-rep PHI spreadsheet (NotesArchive tab) —
zero new operator state, same PHI boundary, bounds the LIVE tab (which all readers
use via getCallNotesSheet_→NOTES_TAB). Archived notes are intentionally NOT
in-app-searchable (cold). Purge never touches NotesArchive (true cold store).
Recommended SAFE setup: archive on, retention/purge off. FOLLOW-ON: a "purge the
archive after a longer window" 3rd tier + an optional "include archive" search.
DOC: needs /sync-docs (10 triggers, CN_NOTE_ARCHIVE_DAYS, NotesArchive tab in the
storage map, INV-44 + a new INV for the archive tier).

## Cycle 6 Stage-3 FEATURE batch (2026-06-23, branch claude/happy-faraday-0grppg)
Implemented 3 strategic suggestions from the broad-scan Stage 3 (features, not
fixes), all pushed:
- #1 Deploy-readiness checklist: getDeployReadiness() (mgr-gated, PHI-free)
  composes Storage+Automation health + MANAGER_EMAILS count → pass/warn/fail
  (required ADP/KB/Intake fail when unset; optional warn; tz mismatch warns).
  Pure Node-pinned deployReadinessItems_. Panel atop CN Admin Overview
  (cnLoadDeployReadiness_). Gate added to test_managerGates_rejectNonManager.
- #2 Quick Links = official external-collection path: links gain optional
  `category` (survey/review/feedback/other; back-compat default 'other',
  sanitized read+write in getExternalLinks_/saveExternalLinks; new
  CN_EXTERNAL_LINK_CATEGORIES). Composer picker groups by optgroup (original
  indices preserved → insert handler unchanged); Admin editor category select;
  section reframed.
- #3 Patient/TRX timeline: getPatientTimeline(trx) (caller-scoped, read-only)
  stitches the rep's OWN notes (searchMyCallNotes trx) + intake submissions
  (filtered to emp.id even for managers) + sent forms (linked by noteId) →
  newest-first. Pure Node-pinned buildPatientTimeline_. Timeline button in the
  card more-menu → ensureOverlay modal, all server strings esc()'d.
DECISIONS: timeline is strictly caller-scoped (managers see only their own
notes/forms; intake filtered to emp.id) — v1 framed as a rep's own-patient
context, NOT a cross-rep manager view (follow-on if needed). Reused existing
caller-scoped endpoints internally (no new read surface). Pure 162/0 (4 new
tests), DOM 48/0, node --check clean. OPERATOR: clasp push -f + New version;
no new Script Properties/triggers/migrations. DOC: add getDeployReadiness +
getPatientTimeline + the quick-link category to CLAUDE.md (/sync-docs).

## Cycle 6 broad-scan + implement (2026-06-23, branch claude/happy-faraday-0grppg)
AUDIT: 6 parallel deep-read agents + independent verification of every Crit/High
claim. Result = 4th consecutive audit with NO verified Critical/High; every agent
Crit/High collapsed on verification (retracted: hasActiveTimeOffOnDate_ "Reconciled"
block [false — Reconciled ≠ pending/approved], getQuiz answer-key inversion [false —
always strips], audit-ts INV-29 [by design], public-form sig date [intentional local
date], CN bounded-read race [throws→caught, not wrong counts]). Net findings: 6 Low.
Confirmed clean: auth gate, manager gating, CDR getDisplayValues (all 3 readers),
EmpDocs fail-closed scoping, PHI-free audit rows (CallNoteEmail/DeptRequest/IntakeSent/
forms), trigger install/remove TARGETS symmetry (9==9), esc()/localStorage/overlay
hygiene, test suite genuinely bites (781 asserts/249 fns; manager-gate omnibus 50+
endpoints asserts .error + 'Manager access').
IMPLEMENTED (commit pushed):
- F1: currentView guards on 3 CN manager/admin loaders (cnMgrLoadRepView_,
  cnToggleAuditHistory_, cnAdminLoadEnrollment_) — both success+failure handlers,
  matching the documented loader-guard pattern.
- F2: kbAiApplySpend_ console.warn on failed spend-counter write (was silent swallow).
- F4: escaping-contract comment on intakeOpenModal_ (bodyHtml raw; callers must esc).
- F5: two-source manager-gate comment at assertManagerCaller_ (MANAGER_EMAILS vs
  emp.isManager roster column).
DEFERRED:
- F3 (empDocContentHash_/empDocSignatureHash_ space-delimiter collision, Low): NOT
  changed — would mark ALL already-issued keep-forever HR records as tampered
  (INV-122) + refuse new sigs on existing unsigned docs. Needs a HashVersion-column
  migration. Same space-delimiter in computeFormSubmissionHash_ (check under same
  umbrella if ever done).
- F6 (getSpanishInboxThreadBody scope, Low): no change — already manager-gated +
  scope-checked (first msg must be addressed to the configured inbox) + documented.
Net = 0 prod-fixes-that-would-fire − 0 new failure modes (all 4 are preventive/
defensive/doc). Pure harness 158/0; node --check clean. NEXT: operator deploy
(clasp push -f + New version); no new Script Properties/triggers/migrations.

## Targeted audit + implement — Spanish Inbox + DeptRequests (2026-06-22, on practical-gauss-yycwkz)
Context: the designated branch `claude/practical-gauss-yycwkz` was 45 commits behind
main and LACKED the audited code (Spanish/DeptReq/punctuality landed post-#56 on main).
Fast-forwarded the branch to origin/main (clean, 0-ahead), then implemented on it.
- AUDIT verdict: 0 Critical / 0 High / 1 Medium / 7 Low. The XSS surface I most
  expected (external Gmail subject/snippet/body → app) is CLEAN: banner esc()'d,
  Issue prefill + body expand use textContent, suggestion chips only keyword-match.
  All auth gates present; PHI-adjacent Spanish bodies never cached/persisted.
- IMPLEMENTED (commit b4592e5, pushed):
  - A1 (F7): gate-pin getSpanishInboxStats/Pending/ThreadBody + getPunctualityReport
    in test_managerGates_rejectNonManager; + no-leak assertion that getDeptRequests
    (rep-callable, only ADDS manager aggregate) never returns deptStats/allOpen to a
    non-manager.
  - A2 (F4): getSpanishInboxStats cache key scoped by spanishCacheHash_(addr,members)
    so a config change isn't masked for the 5-min TTL.
  - A3 (F3): DeptRequests ToEmail column now stores recipient DOMAIN(s) via
    drRecipientDomains_ (the "Other" dept can be an external/customer email; store can
    fall back to the ADP/payroll sheet) — matches ExternalEmailSent minimization.
    Column is write-only (never read back by any endpoint).
- Node harness 48/48 green; node --check clean. The Apps Script gate test runs
  in-editor (runAllTests) — confirm on next operator deploy.
- A4 DONE (commit 09896e0, F1, the one Medium): getDeptRequests now reads a
  bounded tail (DR_MAX_SCAN=4000, mirrors CN_AUDIT_MAX_SCAN) instead of the whole
  sheet + returns a `truncated` flag (client shows a transparent note). The
  resolve-by-token scans (resolveDeptRequest / markDeptRequestResolved_) were
  LEFT full so old tokens still resolve (the cross-module caveat). Node 48/48 green.
- DOC drift DONE (/sync-docs, commit 6ec0b03): the 4 endpoints added to INV-31;
  DeptRequests ToEmail domain-minimization documented in the "Store" note.
- A6 DONE (commit f9318a7, F6): removed the dead sendDeptRequest endpoint (no
  caller anywhere; tombstone left) — auto-tracking via emailFromCallNote replaced
  it. CLAUDE.md updated. Node 48/48 green.
- A5 DONE (commit 0ab6fd3, F2, Approach A — signed off): re-send of the same note
  to the same dept now REUSES the open row's token (drFindOpenRequest_, bounded
  tail) instead of opening a second request. Schema add DR.NOTE_ID (col 11,
  back-compat); pre-send reuse is hash-safe + best-effort; post-send append guarded
  by !drExistingId. New INV-131; pinned by self-cleaning test_deptReq_resendDedupLookup.
  DO-NOT-TOUCH respected (hash check / MailApp.send / EmailedAt stamping untouched).
- AUDIT ACTION LIST COMPLETE: A1–A6 all landed (A5 was the last). Nothing deferred.

## Design redesign thread (ACTIVE — non-audit, does NOT bump Cycle)
Operator-driven visual/interaction redesign from the design handoff in
`docs/design_handoff_team_tools_redesign/`. Plan + conflict register committed at
`docs/design_handoff_team_tools_redesign/IMPLEMENTATION_PLAN.md` (commit ee5fa96).
Executing as 7 separate per-module commits on branch claude/practical-gauss-yycwkz.
- Operator decisions: C1 remove Sick (confirmed real — UI surfaces only this pass,
  backend deduction/reconcile left dormant); C2 ribbon histogram re-sourced to LIVE
  logged-note volume (CDR has no hourly data); C3 add Phone/TRX search tabs (server
  change, touches INV-45); C4–C7 + all 5 improvements accepted.
- DONE — commit #1 foundation (95516d6): 5 new icons + Intake tab-icon repoint +
  kbItemIcon_→fileText; --accent-deep→--success-deep + soft-fallback hygiene (also
  the 2 --warning-soft uses in cn/ + tc/manager); NEW token-hygiene CI tripwire in
  test/client/run.js (form_public excluded; --brand allowlisted until commit #2).
  Pure 134/0, DOM 48/0, node --check clean. Operator: clasp push -f + New version.
- DONE — commit #2 Intake redesign (64bd150): .app-bar shell + toolbar-tabs EN/ES
  + .panel sections; PPD Option A (Yes/No toggles + severity chips + progress
  header) with ENGINE-SAFE classification (Q25/Q34/Q31a/Q33a/Q43/Q13 stay text per
  INV-112 — README's blanket "additional-info yes/no" was too broad); account
  checkbox→toggle (TRUE/FALSE preserved); Sent ALL/PPD/PMD/PAP filter+search; a11y
  radiogroups; draft autosave (umsIntakeDrafts, 24h expiry). --brand removed from
  tripwire allowlist. Pure 134/0, DOM 48/0. NEW localStorage key umsIntakeDrafts
  (CLAUDE.md "Ten ... keys" list now 11 — /sync-docs).
- DONE — commit #3 Training redesign (df073df): §3a completion-ring header card +
  Done/Left cells + overdue inset rail + primary quiz action; §3b manager matrix →
  reps×items CSS-grid status squares + numbered item key + coverage% column
  (trainCoverageClass_ tones), reps sorted least-covered first. New helpers
  trainRingHtml_/trainCoverageClass_. Pure 134/0, DOM 48/0. Minor: per-cell quiz
  attempt count dropped from the matrix (still in analytics table).
- DONE — commit #4 Reference/KB redesign (4fdb390): collapsible dept headers
  (chevron+count, persisted in umsKbPanel.deptCollapsed via kbToggleDept_);
  .kb-btn→token secondary; landing panel kbRenderLanding_ (Recently viewed +
  Most used 30d + Review due w/ pill+dot+Mark-reviewed) replacing the bare empty
  state — usage/review loaders now cache into KB_STATE + re-render landing (tree
  block render removed); KB_STATE.landing flag guards async re-render vs open
  item/search. Reader/markdown/search/drawer/editor untouched. Pure 134/0, DOM
  48/0. Most used + Review due are manager-only (endpoints manager-gated).
- DONE — commit #5a Time Clock (59b3230): sky-gradient clock card + tz-selector
  pill + phase glyph (off the 1Hz tick); shift strip = control surface (hours +
  state pill header, ribbon break-bands + note-volume histogram, punch buttons
  under, lunch=warn color-coding, LunchOut mid-shift primary); C2 histogram via
  NEW server getMyNoteHourBuckets(date) (rep-local hours; own endpoint avoids the
  getMyCallNotes DOM-flush collision + trims a hot-path RPC); C1 Sick removed —
  one-row Punches·Team·Annual-PTO(ring) replaces the ledger, Sick Leave dropped
  from both modals.html PTO selects (INV-95 ok), backend dormant.
- DONE — commit #5b Coverage (1aa2c0f): days×hours week heatmap (6a–9p, ok/risk/
  low/none cells) + click-to-expand per-day rep detail + Understaffed-slots risk
  callout (panel[data-tone=destructive], grouped ranges + PTO reason). Server
  unchanged. Pure 134/0, DOM 48/0 throughout.
- DONE — commit #6 Metrics (1c6991a): My Stats Today/7D/30D trend-window presets
  (client slice of the 30d trend; window=1=today-only) + rail sparklines (C4:
  answered/missed from trend, attSeconds from series; notes/total-talk plain) +
  sortable+sticky team table (mSortReps_/mTeamSort_/mTh_, default %Ans desc) +
  tri-tone %Ans cells (mPctClass_) + C5 .m-coverage unified on deep tones. Pure
  134/0, DOM 48/0. NOTE/conflict: the mock's range-aggregated My Stats needs a
  server getMyMetrics range variant — deferred (window control is client-only).
- DONE — commit #7 Call Notes, split 7a/7b/7c:
  - 7a (448f434) Search: read-only cnRenderResultCard_ (real cn-card) for rep +
    manager search + result count + KB term highlight + date-range filter +
    Phone/TRX scopes (SERVER change to searchMyCallNotes/managerSearchCallNotes,
    INV-45 doc, Tests.js test_cn_search_phoneTrxFieldScopes) + C7 badge tone.
  - 7b (271db84) manager Stats → scannable .m-table (Notes/Action/Training/Review/
    Median/%Ans/Coverage) reusing mPctClass_/mCoverageBadge_; shared JS component
    (improvement #1) DEFERRED (column sets differ — visual align via .m-table).
  - 7c (56535fd) Admin → Overview/Tags/Compliance/Config sub-tabs (cnAdminTab_,
    show/hide panes; cnRenderAdminAugmentHtml_ → {kpiHtml,taxHtml} split). Folding
    health panels into compact status CARDS deferred (panels already convey tone).
  Pure 134/0, DOM 48/0, node --check clean.

## DEFERRED FOLLOW-UPS #1–#4 DONE (post-redesign, same branch)
- #1 (43ea7ab) range-aggregated My Stats: new server getMyMetricsRange(from,to)
  (caller-scoped self-aggregate, 92d cap, no team/series); Today=single rich /
  7D·30D=server ranges / custom From-To; mRenderMyStats_ handles both.
- #2 (36506d2) Sick deprecation: removed 'Sick Leave' from TIME_OFF_TYPES (no new
  sick via UI or RPC); KEPT getLeaveDeduction_ sick mapping + col J for historical
  reverts (removing would corrupt annual on legacy sick reverts). Node test updated.
- #3 (377b981) shared mtRenderTable_ (script_core) drives BOTH the Metrics team
  table + CN Stats table (CN Stats gained sortable cols); mTh_ removed.
- #4 (48d212c) Admin Overview "System status" cards (Automation/CDR/Storage,
  OK/warn/error) from the existing health/storage fetches; detail panels kept below.
Pure 134/0, DOM 48/0, node --check clean throughout. Still NOT merged (no PR).
Remaining deferred: full col-J excision (only if zero historical sick rows);
Admin health→cards full consolidation (detail panels still shown); + the
small UX niceties (#6–#10 in chat) + /sync-docs doc drift.

## REDESIGN COMPLETE — all 7 commits landed on claude/practical-gauss-yycwkz
(8 commits incl. the #5 Clock/Coverage split). Plan: docs/design_handoff_team_tools_redesign/
IMPLEMENTATION_PLAN.md. NOT merged (no PR requested). OPERATOR: one clasp push -f
+ New deployment version covers all client + the Code.js changes
(getMyNoteHourBuckets, phone/trx search scopes); then runAllTests() in the editor
(exercises test_cn_search_phoneTrxFieldScopes). DEFERRED/conflicts to revisit:
range-aggregated My Stats (server getMyMetrics range variant, C-mock); shared
Metrics/CN-Stats table component; Admin health-status-cards consolidation; Sick
backend deprecation (UI-removed, backend dormant). DOC drift for /sync-docs:
new umsIntakeDrafts + umsKbPanel.deptCollapsed localStorage keys, getMyNoteHourBuckets
endpoint, INV-45 phone/trx, token-hygiene tripwire, Sick UI-removal.

## Cycle 5 CLOSED (2026-06-17)
Audit-opened broad-scan + full backlog implemented same-cycle, merged to main
(PR #53). Numbered 5 (a parallel session claimed Cycle 4 for a non-audit
operator-feedback+T4 batch — its straggler reflect commit 196948c stays only on
`claude/affectionate-cori-90q3ap`, unmerged; renumber/fold it if ever merged).
- Production fix=1 (M-1, Medium narrow trigger): adjustLeaveBalance_ per-row
  PtoEnabled gate (was global-flag-only; contradicted S15/INV-27) + regression test.
- Features=3: #5 tag trends (INV-125), #4 KB review-due (INV-126), #3 coverage
  planner (INV-127).
- Defensive=13: L-1 getMyMetrics cache, L-2 KB-AI spend race, L-3 intake data-URL,
  L-11 metrics null-guard, L-4 verifyDocSignature `tampered`, L-5 KB usage tz,
  L-7/L-8/L-10 bounded CN reads, L-9/L-12/L-13/N-2 comments.
- New failure modes=0. net=1. Pure harness 128→133 green; node --check clean.
- INV-128/129/130 proposed for the next verification pass (M-1 per-row gate,
  KB-AI race-safe spend, getMyMetrics endpoint cache).

## Post-reflect additions (pushed, on q4d2hf — merge when ready)
- runAllTests triage (operator ran it; ADP sheet tz = America/Los_Angeles ≠
  CONFIG Asia/Kolkata): #3 metrics_getMyMetrics_cdrUnavailableErrors FIXED
  (L-1 endpoint cache now bypassed under _TEST_OVERRIDE_CDR_SS_ID, commit
  0557169); #1/#2/#4 (config_adpSheetTzMatchesConfig / publicForm_tokenLifecycle
  / training_assignCompleteFlow) are ONE environmental root cause — the ADP
  sheet tz ≠ CONFIG.TIMEZONE → OPERATOR sets the sheet tz to Asia/Kolkata (or
  reconciles CONFIG), re-run setupTestEnvironment + runAllTests.
- Storage Health panel (#1, commit dee6d96): getStorageHealth (mgr-gated,
  read-only, PHI-free) — all 7 stores' configured/reachable/tz-vs-CONFIG in the
  Admin tab; + operator spreadsheet-map table (#3) in CLAUDE.md. Spreadsheet
  consolidation assessed = NOT advised (boundaries deliberate); consolidated the
  MANAGEMENT surface instead. Operator doing the Drive-folder grouping (#2).

## (historical) Pending — 2026-06-29 operator-feedback session (all items since resolved)
- OPERATOR DEPLOY: `cd web-app && clasp push -f` + New version. ONE deploy ships
  every PR merged this session (#97–#103) + the Manage module / admin tier (#102).
- OPERATOR runAllTests() in the editor — the ONLY check on the #102 admin-gating
  test split (CI can't run the Apps Script suite). Expect 0 failed.
- OPERATOR (optional): set Script Property ADMIN_EMAILS=<your email> to narrow the
  Admin tab + the 29 config/system endpoints + KB content-authoring to just you
  (unset ⇒ admin == manager, today's behavior).
- (Older, only if real for you) ADP spreadsheet tz should be Asia/Kolkata to avoid
  coerced-date drift — carried from a prior cycle; not touched this session.
- Decided/closed: lunch-icon alternatives (apple/crumbs) — staying with the fixed mug.

## P1 hardening batch (commit 1732fa2)
- L-8: getMyCallNotes/Range/searchMyCallNotes → readCallNoteRowsInRange_ (bounded;
  correctness-preserving — the reader finds first/last match across the full date
  column then reads the inclusive block, so order-independent; contiguity is
  efficiency-only).
- L-7: setCallNotePinned pin-count via 2-column scan + "pinned" pre-filter.
- L-10: findCallNoteRow_ row fetch at CN_HEADERS.length (not getLastColumn()).
- L-5: kbUsageCounts_ cutoff in KB ss tz (boundary align). L-4: verifyDocSignature
  `tampered` flag + empdocs client uses it. L-9/L-12/L-13/N-2/M-1-edge: comments.
- NOT taken: forms findFormTokenRow_ getLastColumn() (same class as L-10, out of
  P1 scope) — follow-on.

## Feature builds this session (all on claude/affectionate-cori-q4d2hf, pushed)
- #5 Tag-trend analytics — getCallNotesTagTrends (mgr-gated, cached, PHI-free);
  pure cnTrendWeekStarts_/cnTagTrendsFromEvents_ (Node-pinned); Admin "Tag Trends"
  panel (#cn-admin-trends). Commit 3be0017.
- #4 KB review-due — KB schema +ReviewedAt/ReviewedBy (back-compat header widen);
  kbSaveItem stamps review on save (edit=review); kbMarkReviewed (gated+locked);
  kbGetReviewDue (gated, usage-sorted via factored kbUsageCounts_); 90-day
  threshold (CONFIG.KB.REVIEW_DUE_DAYS); manager "Review due" block. Commit a31ff86.
- #3 Coverage planner — getCoveragePlan (gated, 1–14d, PHI-free, per-tz v1,
  Pending=tentative); pure coverageBucketHours_ (Node-pinned); managerOnly
  `coverage` tab + enterCoverageView. CONFIG.COVERAGE_MIN_STAFF=2. Commit b876e0a.
- All four new endpoints added to test_managerGates_rejectNonManager. Pure
  harness 128→133 green. DOM harness needs npm ci (CI runs it).

## DOC UPDATES NEEDED (run /sync-docs) — beyond the M-1/L-1/L-2 items below
- Add getCallNotesTagTrends / kbGetReviewDue / kbMarkReviewed / getCoveragePlan to
  the INV-31 manager-gated list + the "Manager-only operations" gotcha list.
- New invariants worth adding: tag-trends (cached/bounded/PHI-free), KB review-due
  (edit=review semantics, 90d, legacy UpdatedAt fallback), coverage planner
  (per-tz v1, Pending=tentative, pure bucketing).
- New operator/CONFIG knobs: CONFIG.KB.REVIEW_DUE_DAYS (90), CONFIG.COVERAGE_MIN_STAFF
  (2); new Script Property cache key cn_tag_trends_v1; KB schema gained
  ReviewedAt/ReviewedBy (header self-heals on first post-deploy KB read/save).
- New regression scenarios for #3/#4/#5.

## In progress (facts to carry forward — NOT judgments)
- Cycle 4 /broad-scan ran 2026-06-17: NO Critical/High (mature-codebase signal,
  3rd cycle running). One Medium (M-1 contractor PTO deduction) + Lows.
- /broad-implement done on branch `claude/affectionate-cori-q4d2hf` (pushed).
  Implemented: M-1, L-1, L-2, L-3, L-11 + the missing M-1 regression test (N-1).
- Pure Node harness green (128/0); server `node --check` clean. DOM harness needs
  `npm ci` (jsdom) — not run in this container; CI runs it.

## Completed this cycle
- M-1 | Code.js adjustLeaveBalance_ + Tests.js | per-employee PtoEnabled (col K)
  gate added so contractors aren't deducted; adds test_adjustLeaveBalance_perEmpDisabledNoOp.
- L-1 | Code.js getMyMetrics | result cached per (emp.id, date) for CDR_CACHE_TTL.
- L-2 | Code.js kbGetFacetGuidance | atomic cap check+reserve (kbAiTryReserveSpend_)
  + reconcile/refund (kbAiApplySpend_, renamed from kbAiRecordSpend_).
- L-3 | Code.js intakeDecodeImages_ | robust data-URL parse (require ;base64).
- L-11 | metrics/script_metrics.html mRenderTeamMetrics_ | null-guard teamTotals/reps.

## (historical) Pending — cycle-6 era
- DEPLOY: `cd web-app && clasp push -f` + New version deployment.
- Operator: run runAllTests() in editor (exercises the new M-1 test, S2).
- DOC updates (recommend /sync-docs): M-1 (deduction now per-row gated — reconcile
  S15/INV-27 wording), L-1 (getMyMetrics now result-cached; note vs INV-67 helper
  layer), L-2 (reserve/reconcile spend pattern under INV-119).

## Open follow-on items (NOT taken — out of scope)
- L-4 verifyDocSignature defense-in-depth (audit row is the witness).
- L-5 kbGetUsageStats tz-boundary off-by-one (non-load-bearing).
- L-6 importQuizFromForm multi-answer-checkbox silent single-correct.
- L-7/L-8 setCallNotePinned / searchMyCallNotes / getMyCallNotes unbounded reads.
- L-9 updateCallNote silently drops flag/tag edits (not reachable today).
- L-10 findCallNoteRow_ getLastColumn() width.
- L-12 consentAt == submittedAt; L-13 stale ExpiresAt tz comment.
- N-2 cnNoteMatchesFilter_ 'answered' filter keys off legacy trainingReply (INV-49) —
  add a `// see INV-49` comment at the filter site.
- fixPtoReconciliation can no longer credit a contractor (now ptoEnabled-gated) —
  edge case; remediation for any historical contractor drift is a manual sheet edit.

## Decisions made (so the next session doesn't re-litigate)
- M-1 fix placed in adjustLeaveBalance_ (single chokepoint) — covers updateTimeOffStatus,
  managerSubmitTimeOff, AND fixPtoReconciliation; returns null (callers already handle).
- L-1 cached at the getMyMetrics ENDPOINT layer, NOT the helper — INV-67's "getCdrDailyBreakdown_
  uncached" stays literally true; 5-min TTL matches getMetricsAmbient.
- L-2 reserve = $0.02/call, reconciled to actual; lock NOT held across the vendor fetch
  (the kbResolveDocImages_ lesson). Fails OPEN on lock contention (prior best-effort posture).

## Where I left off
2026-06-29: operator-feedback session (NOT an audit) — all work merged to main
(origin at #103), working tree clean, CLAUDE.md kept current inline + /sync-docs
ran mid-session for the KB-gating change. Merged this session:
- #97 dashboard-feedback batch (compact toggle removed, sidebar→Dashboard,
  rolling-stack flash guard); #98 punch-button animations (press/hover + lunch
  headset↔mug morph) + new punch glyphs; #100 dashboard layout (full-width
  greeting, 2-up metric cards, 1480px, gradient-clock de-boxed, chip overflow);
  #101 Spanish pending-request previews + Today's-Punches/teammate moved to a
  right-column 2-up foot.
- #102 **Manage module + admin tier**: new `manage` TOOLS tool (Manage Time /
  Coverage / Punctuality moved from Time Clock + Admin moved from Call Notes,
  `adminOnly`). empIsAdmin_(email,isManager) — ADMIN_EMAILS set ⇒ that list, unset
  ⇒ isManager (so admin==manager + tests unchanged until set). tabVisibleForUser_/
  toolVisibleForUser_. 29 admin-gated endpoints (the 25 Admin config/system +
  the 4 KB content-authoring: kbSaveItem/kbDeleteItem/kbUploadImage/
  kbConvertDriveDoc). getEnrolledCallNotesReps stays manager (shared). NEW INV-136.
  Reference client authoring (Add/Edit/Delete/Convert) gates on KB_STATE.isAdmin.
- #103 dash/clock batch 3: dashboard SWR cache (kills the focus-driven loader
  flash) + 20s focus throttle; extras → 2-up [Spanish|Requests] / [Training|
  Requests] (new clkDashTrainingCard_, getMyTraining); break chips B1/Lunch/B2
  compact one-row + darker Lunch; renderActions afterLunch ⇒ ClockOut primary;
  coffeeMug handle redrawn (right side, curve outward).
Pure 188/0 + DOM 48/0 green throughout; node --check clean. NEXT = the operator
deploy + runAllTests() + optional ADMIN_EMAILS above. Nothing in-flight on the
code side. A fresh session for NEW work re-derives with fresh eyes (CLAUDE.md is
the current substrate — 136 invariants).
