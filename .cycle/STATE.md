# Cycle State

## Current
Cycle: 17
Phase: implement — the broad scan is COMPLETE (report in chat, 2026-08-05) and
  the operator-selected TOP 5 findings are IMPLEMENTED
  (`.cycle/blocks/17-top5-broad-implement.md`). The remaining ~30 findings from
  the scan are unimplemented — they live in the scan report (chat) and the
  follow-on list below.
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 3 (cycle 15 was the seams audit;
  16 and 17-so-far have completed since. Cadence is every 4, so the next Seams
  audit is due after cycle 18)
Updated: 2026-08-05

## In progress (facts to carry forward — NOT judgments)
- Cycle 16 is CLOSED and archived to `.cycle/HISTORY.md` (this cycle's open).
- The cycle-17 broad scan ran with SIX parallel deep-read subagents + the
  mandatory visual stage (29/29 scenarios, 0 missing fixtures, 0 overflow) +
  an independent re-verification pass of every Medium+ claim (all held, zero
  retractions). Findings: **0 Critical / 1 High / ~10 Medium-band / ~25 Low.**
- The TOP 5 are implemented and bite-check-pinned (pure 407→411, DOM 69,
  `node --check` clean):
  C17-2 (TO.STATUS normalize-once on the balance path),
  C17-7 (three manager lazy cards render error states on both failure shapes),
  C17-5 (CN loaders preserve last-good on structured {error} + failed-round
  freshness invalidation + cold-failure error state),
  C17-1 (A2 tripwire regex now matches `[data-compact="1"]`; styles.html
  contributes real obligations — two new 540px breakpoints for .actions /
  .field-row, five DEAD compact overrides removed, two reasoned allowlist
  entries), and
  C17-6 (exportCallNotesRange carries skippedReps on response + audit row +
  client toast; all-skipped returns a read-failure error).
- The post-fix visual re-shoot was running at checkpoint time — verify
  report.json shows 29/29, 0 overflow, and eyeball clock-light-mobile
  (.actions is now 2-col at ≤540px with the prime spanning).

## Completed this cycle
- C17-2 | web-app/Code.js | updateTimeOffStatus normalizes TO.STATUS once
  (lowercase comparisons; raw kept for the compensating revert + audit note;
  notify no-op check compares both sides normalized).
- C17-5 | web-app/cn/script_callnotes.html | cnLoadToday_/cnLoadDateRange_
  preserve last-good notes on a non-enrollment {error}, set
  rollingLoadFailed/historyLoadFailed in BOTH handlers, null the SWR stamps
  (never serve a failed round as fresh); both stack renders show
  errorStateHtml_ when a failed load has no last-good.
- C17-6 | web-app/Code.js + cn/script_callnotes.html | exportCallNotesRange
  collects skippedReps, returns it (additive field), stamps
  `skippedReps=N (ids) — INCOMPLETE` on the audit row, returns a read-failure
  error when all reps were skipped; client shows a warn toast naming the reps.
- C17-7 | web-app/tc/script_manager.html | loadPendingAdjustments_ /
  loadPtoReconciliation_ / loadSheetDoctor_ split res.error from
  genuinely-empty and render errorStateHtml_ on both the {error} and
  transport paths (the adjust queue is operational — a failed read must never
  read as "queue clear").
- C17-1 | test/client/run.js + web-app/styles.html | A2 regex
  `\[data-compact[^\]]*\]`; .actions + .field-row gained real 540px
  breakpoints; dead compact overrides for .actions-grid / .ledger (×3) /
  .ts-summary / .leave-balance-row removed (INV-184 class); .preset-grid's
  redundant identical-tracks declaration dropped; ts-recent-row + hero
  allowlisted WITH reasons in A2_INVERSE_OK.
- Tests | 4 new pins (C17-2/5/6/7), ALL bite-checked individually (mutate →
  exactly that pin fails → restore). Pure 411, DOM 69.

## Pending / not yet done
- **DEPLOY of the top-5 batch**: `cd web-app && clasp push -f` → New version →
  run `runAllTests()` from the editor (cannot run in the container). Expect
  S4-relevant behavior unchanged for canonical-case rows.
- **`/sync-docs` for this batch is NOT yet run.** Owed items are listed in the
  implement block's DOCUMENTATION UPDATES section (INV-52/46 clause, INV-183
  fourth column, A2 gotcha text, the four doc-drift items from the scan).
- The rest of the cycle-17 findings (1 High none — done; the other Mediums:
  C17-3 ambient walk, C17-4 ATT-zero, C17-8 tour contrast, C17-9
  SaveDayRange lock amplification, C17-10 training clip, C17-11 split-send,
  C17-12 form_public hidden fields, C17-13 Q43 negation phrases, C17-14…17 +
  ~25 Lows) — see the scan report. Natural next batches were proposed in chat:
  ② silent-degradation stragglers, ③ tripwire-integrity sweep, ④ interface set.
- Operator one-liner (cycle-15 F2, still open): DQE col-4 header →
  `CDR_EXPECTED_HEADERS`.
- Operator (cycle-16): delete Offerings row 23 or clear B23.
- CARRIED (cycle-13 A5), DEV PROJECT ONLY: set `INSTANCE_IS_PROD=false`.

## Open follow-on items
- Dead CSS cluster in styles.html (base rules for .ledger/.ledger-3,
  .hero-clock*, .actions-grid/.action-btn, .ts-summary, .leave-balance-row) +
  the stale "ledger" KDD paragraph in CLAUDE.md — the compact halves are gone
  (C17-1), the bases remain.
- cnLoadDate_ is dead code (zero callers) yet CLAUDE.md's loader gotcha lists
  it — remove function + doc mention together (the A4 precedent).
- The scan's full Low list (see report): notably createFormToken prefillData
  uncapped (PHI), getDepartmentEmails_ no sanitize-on-read, signature
  data:image validation, Spanish 200-thread cap, intake Sent INV-169 total,
  fixture field-name drifts (patientTrx/views/contentRequests), A12
  line-scope + A13 first-attr regex, A11 state-class vocabulary, -deep set
  derivation, manager fan-in seq tokens (train/empdocs/coaching).
- Visual matrix: still no Admin panel scenario (needs a getAutomationHealth
  fixture) and no dark Reference/Training/Coaching; error states unshot.
- INV-187 candidates the top-5 batch did NOT close: managerAggregateFlagged_,
  managerSearchCallNotes, taxonomy/trends, managerGetUnresolvedActionCount
  (cached undercount), getMetricsAmbient blanket catch, My Stats no-CDR
  branch, extras SWR partial-fresh, timesheet side-rail skeleton,
  kbDrawerOpenItem_ failure guards, getAdminConfig pane wipe.

## Decisions made (so the next session doesn't re-litigate)
- C17-1 obligations were resolved per-selector, not blanket-allowlisted:
  .actions/.field-row got REAL breakpoints; .actions-grid/.ledger/.ts-summary/
  .leave-balance-row compact overrides were REMOVED as dead (INV-184 — grep
  confirmed zero markup emits them); .preset-grid's compact tracks were
  identical to base (gap-only change) so the redundant declaration was
  dropped rather than allowlisted; .ts-recent-row (auto 1fr auto — content
  tracks) and .hero (only live consumer sets display:block) are allowlisted
  WITH those reasons.
- C17-2 keeps oldStatusRaw for the compensating revert and the audit note so
  the cell is restored/recorded exactly as found; only comparisons normalize.
- C17-7 renders error states for the two DIAGNOSTIC cards too (not just the
  operational queue): a failed check is not a clean check (INV-187), and
  cycle-16's operator note already frames "warn cards where blanks used to
  be" as the fix working.
- C17-5's cold-failure error renders are written multi-line so the
  line-scoped A12 scan can't false-trip on empty-class + failure-marker
  co-occurrence.
- No Tests.js editor case was added for C17-2 (it cannot execute in the
  container and an unexecuted editor test is the cycle-16 "pin wrong about
  the code" hazard); the comment-stripped source pin covers the shape, and a
  `test_updateTimeOff_mixedCaseStatusCell` editor case is noted as a
  follow-on to write AND run at next deploy.

## Where I left off
Top-5 batch complete and green (pure 411 / DOM 69 / bite-checks pass /
`node --check` clean). At checkpoint the post-styles-change visual re-shoot
was finishing — confirm 29/29 + 0 overflow + eyeball clock mobile, then
commit + push to `claude/broad-scan-up98b9`. After that: `/sync-docs` for
this batch, then pick the next batch (② silent-degradation stragglers or
③ tripwire-integrity sweep).
