---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Operator batch 6 (2026-08-25) — intake-call analytics:
intake-flagged call counts beside the CDR KPIs + a real monthly intake-volume
table, so long PPD/account-creation calls are EXPLAINABLE in the numbers.
Files modified: web-app/Code.js, web-app/metrics/script_metrics.html,
web-app/Tests.js, test/client/run.js, test/visual/mock.js

CHANGES:
B6-server | web-app/Code.js | `cnCountIntakeNotesResult_(emp, from, to)` — counts
the rep's intake-flagged notes (subformData.intakeType, the INV-143 bounded
enum) via a 2-column bounded read + a `"intakeType"` substring pre-filter
before any JSON.parse; the cnCountNotesResult_ outcome contract ({count,
unavailable, unenrolled}) so a failed read is never a confident 0.
`getMyMetrics` / `getMyMetricsRange` / `getTeamMetrics` per-rep rows attach
`intakeNotes` (null on unavailable — ADDITIVE, client-guarded, NO cache-key
bump per the C17 precedent); teamTotals accumulates only non-null reps and
sets `intakeNotesPartial` otherwise (the cycle-16 F5 aggregate rule). Pure
`intakeVolumeBuckets_` (trailing calendar months, newest-first, year-boundary
safe). `getIntakeVolumeStats()` — manager-gated ('Manager access required.'),
read-only, PHI-free counts from the submission tabs' Timestamp column
(bounded INTAKE_VOLUME_SCAN_MAX=4000 tail per tab via intakeTsString_); an
unreadable tab is NAMED in `failedTypes`, never a silent 0 column.
B6-client | web-app/metrics/script_metrics.html | My Stats rail "Intake calls"
row (null-gated — absence is not 0); Team table Intake column between
Notes/Coverage (null → em dash with a "count unavailable" title); the TSV
export gained the column with null → blank (the behavioural TSV pin
rewritten in place for the deliberate contract change); a lazy
"Intake volume · by month sent" mtRenderTable_ block on Team Metrics —
manager view ONLY on both halves (container + fetch; the rep aggregate never
pays for it), errorStateHtml_ on both failure shapes (A12), nav-guarded,
empty months render nothing, failedTypes renders a role="alert" note.
B6-gate | web-app/Tests.js | `getIntakeVolumeStats` case added to the omnibus
MANAGER_GATED list (the F9 derived tripwire fired as designed and this is
its required gate-test reference).
B6-fixtures | test/visual/mock.js | getIntakeVolumeStats months fixture;
intakeNotes on team rep rows + BOTH My Stats fixtures (the getMyMetricsRange
fixture too — the rail row renders in range mode, the INV-185/F14
argument-dependence class). intakeNotes placed AFTER missingCount — the
first placement split V-14's contiguous coverage-formula match (the pin
fired as designed; the fixture field order moved, not the pin).
B6-pins | test/client/run.js | Four pins (above the tally line):
intakeVolumeBuckets_ behavioural (year boundary, per-type routing,
out-of-window dropped, junk skipped, bad anchor → empty); the counter
contract (bounded 2-col, pre-filter-before-parse, unenrolled distinct,
failed-read-never-0); server wiring (3 attach sites null-on-unavailable,
teamTotals partial flag, gate-before-read, bounded tail, named failedTypes,
no lock); client wiring (rail null-gate, em-dash, manager-only both halves,
errorStateHtml_ ×2 without double-escape, nav guards ×2,
empty-renders-nothing, alert note). ALL SIX mutations bite-checked
(committed first): year-wrap removed, catch→unavailable:false, one attach
site de-nulled, gate removed, rep fetch un-gated, failure handler silenced.

TEST RESULTS: pure 642 / DOM 79, 0 failed. Browser-measured in Chromium:
the "Intake calls" rail row renders on My Stats, the Intake column renders
in the Team table (value 3 between Notes and Coverage), the volume block
renders 6 month rows with correct totals, overflow 0 on both views.
REGRESSION RISKS: every new server field is additive + client-guarded, so an
un-redeployed client renders exactly as before; the TSV column is a
deliberate export-contract change (pinned). No cache-key bumps needed.
INVARIANTS AT RISK: None — INV-187/180 (outcome-carrying counts, absence≠0),
INV-136/171 (gate + gate-test in the same commit), INV-129 (no new caches),
INV-185 (fixtures mirrored, argument-dependent fixture kept a function) all
actively honored.
NET SCORE: 0 − 0 = 0 (capability, not a fix)

OPERATOR ACTIONS / DEPLOY:
- None beyond the standing combined deploy | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` + New version (ships with the whole
roadmap branch); post-deploy `runAllTests()` includes the new
getIntakeVolumeStats gate case.

FOLLOW-ON ITEMS:
- Batch 7 (structured intake feedback) awaits the operator's answer —
  free-text recipient feedback already shipped 2026-08-13; only build
  field-level structured corrections if they confirm wanting them.
- Team Metrics teamTotals.intakeNotes / intakeNotesPartial ride to reps via
  the aggregate whole (fine — aggregate only); no rail row renders it yet
  on the team hero — add one if the operator asks.

DOCUMENTATION UPDATES NEEDED:
- CLAUDE.md: Metrics module description (intakeNotes fields + the volume
  block), the INV-136 admin/manager count note is UNCHANGED (manager-gated,
  not admin), test counts 622→642, mock fixture notes. Handled by the
  consolidated /sync-docs covering batches 1–6.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
