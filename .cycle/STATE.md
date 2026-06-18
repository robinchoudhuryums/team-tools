# Cycle State

## Current
Cycle: 5
Phase: idle (Cycle 5 CLOSED — reflect recorded 2026-06-17)
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 4
Updated: 2026-06-17 (Cycle 5 reflect)

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

## Pending / not yet done
- OPERATOR DEPLOY (still): `cd web-app && clasp push -f` + New version; then
  runAllTests() in the editor.
- OPERATOR: fix the ADP spreadsheet timezone (Asia/Kolkata) to clear the 3
  tz-drift test failures; confirm whether the failing run was a TEST copy or
  prod (if prod, the LA tz is a live data-integrity hazard).
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
