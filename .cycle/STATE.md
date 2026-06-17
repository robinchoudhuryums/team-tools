# Cycle State

## Current
Cycle: 5
Phase: idle (Cycle 5 CLOSED — reflect recorded 2026-06-17)
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 4
Updated: 2026-06-17 (Cycle 5 reflect)

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

## Pending / not yet done
- OPERATOR DEPLOY (still): `cd web-app && clasp push -f` + New version; then
  runAllTests() in the editor (exercises the new gate cases + M-1 test).
- 90q3ap straggler 196948c (cycle-4 metrics row) — reconcile if/when merged.

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

## Pending / not yet done
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
Cycle-4 broad-implement is committed + pushed on claude/affectionate-cori-q4d2hf.
NEXT: operator deploy (clasp push -f + New version) + runAllTests() in the editor,
then /sync-docs for the M-1/L-1/L-2 doc updates. No PR opened (not requested).
