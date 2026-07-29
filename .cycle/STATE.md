# Cycle State

## Current
Cycle: 13
Phase: implement
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 2 (cycle 11 was the seams audit;
  /reflect increments — cadence is every 4, so 2 more subsystem cycles before
  the next Seams & Invariants audit is due)
Updated: 2026-07-29

## In progress (facts to carry forward — NOT judgments)
- Cycle 13's broad scan is COMPLETE (3 stages). It found 0 Critical / 0 High /
  6 Medium / 7 Low, with the interface lens producing the top four findings —
  the second cycle running in which that lens outscored the code lens.
- Batches 1 and 2 are IMPLEMENTED, committed and pushed to
  `claude/broad-scan-yhkbe2`; /sync-docs ran between them. Not deployed.
- Verbatim summary blocks are at `.cycle/blocks/13-A1-A3-A11-A12-broad-implement.md`
  and `.cycle/blocks/13-A4-A6-A8-A9-broad-implement.md`.
- Next concrete step: run batch 3 (A5, A7, A10), or close the cycle with
  /reflect.

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
- Remaining cycle-13 findings, batched for a follow-up /broad-implement:
  - Batch 3 (robustness + operator safety, ~3–5h): A5, A7, A10
  - Batch 4 (interface completeness, ~½–1 day): A13
- /sync-docs has RUN (commit adb2ee7) and batch 2 applied its own deferred edit.
  No documentation work is outstanding.

## Open follow-on items
- A11 correction: the CN composer tabs already carried role="tab" + aria-selected;
  the scan over-claimed that instance. Only aria-disabled was missing (added).
- Noticed in the visual matrix, NOT fixed (out of scope for this batch):
  "Generate ADP Export" on the Manager Dashboard is still a near-black full-width
  bar — V-8 fixed the shared modal primary for exactly this reason, but this
  on-page button is a different class.
- Noticed in the visual matrix, NOT fixed: the Clock shift-strip's
  "5h 54m worked · 32m lunch" appears to overflow / overlap the "File N missing"
  chip at wide width. Pre-existing.
- `_assertEq` in Tests.js compares via JSON.stringify, and JSON.stringify(NaN)
  is "null" — so any future `_assertEq(x, null)` is blind to a NaN regression.
  Cycle 13's editor test uses strict `=== null` instead. A general fix (make
  _assertEq distinguish them) is unclaimed.
- TWO dead response fields now, worth one small batch that clears both:
  `getEmployeeState.annualPlannedUpcoming` (found in batch 2 — its only reader,
  renderPtoMini_, was removed in cycle 8) and, carried from cycle 12,
  `getSpanishInboxStats.pendingList`. Both are response-shape changes.
- Carried from cycle 12: the other TimesheetArchive readers
  (buildTimesheetForEmployee_, getPunctualityReport, tsDoctorScan_) are still
  live-tab-only.

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
  F3-sibling's literal break match) and both were repaired deliberately, not
  reactively.

## Where I left off
Batches 1 and 2 are implemented, tested (366 pure + 66 DOM + 20/20 visual, all
green), documented, committed and pushed to `claude/broad-scan-yhkbe2`.
/sync-docs is done and nothing doc-wise is outstanding. Next: either run
batch 3 (A5 nightly self-test fails open, A7 export bails before the archive
read-through, A10 four store reads inside the global lock) or close the cycle
with /reflect. The operator deploy — still covering cycles 11, 12 and 13 — is
the one thing blocking any of this from reaching users.
