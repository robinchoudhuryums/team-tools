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
- Batch 1 (A1, A2, A3, A11, A12) is IMPLEMENTED on branch
  `claude/broad-scan-yhkbe2`. Not committed, not pushed, not deployed.
- The verbatim summary block is at
  `.cycle/blocks/13-A1-A3-A11-A12-broad-implement.md`.
- Next concrete step: commit + push this batch, then decide whether to run the
  remaining batches (2–4 below) this cycle or close it here.

## Completed this cycle
- A1  | metrics/, tc/script_clock.html, tc/script_manager.html, intake/, cn/ | six click-only span/div controls → <button type="button"> with a pixel-identical CSS reset
- A2  | metrics/, styles.html, train/script_coaching.html | real viewport media queries for .m-layout (≤720px), .telemetry and .coach-kpis (≤540px) — `:root[data-compact]` is the pop-out, not a breakpoint
- A3  | Code.js | timeToMins_ returns null not NaN; calcHours_ propagates it; all four callers guarded (getCoveragePlan needed an EXPLICIT guard — `x + null` coerces to 0)
- A11 | script_core.html, tc/, train/script_coaching.html, cn/ | aria-current on both nav levels, aria-pressed on the period switcher, role=tab/aria-selected on the Coaching toggle, aria-expanded on two disclosures
- A12 | metrics/, train/script_training.html, train/script_empdocs.html | 16 load-failure sites routed from empty-state containers to errorStateHtml_
- Tests | test/client/run.js (+6 pins, 356→362, all bite-checked), Tests.js (+1 editor smoke test)

## Pending / not yet done
- **Commit + push batch 1.** Nothing from cycle 13 is committed yet.
- **CARRIED FROM CYCLE 12 — the operator deploy is still UNCONFIRMED**, and now
  also carries this batch and cycle 11's never-separately-deployed visual batch:
  1. `cd web-app && clasp push -f`
  2. Apps Script editor → Deploy → Manage deployments → Edit → Version:
     **New version** → Deploy
  3. Run `runAllTests()` in the editor — three smoke tests execute ONLY there:
     cycle 13's `timeToMins_nullOnUnparseable` plus cycle 12's still-unrun
     `cn_enrolledSheetId_trimsAndNullGuards` and `cn_appendBounded_capsAndRollsBack`.
- Remaining cycle-13 findings, batched for a follow-up /broad-implement:
  - Batch 2 (silent degradation + docs, ~2.5–4h): A4, A6, A8, A9
  - Batch 3 (robustness + operator safety, ~3–5h): A5, A7, A10
  - Batch 4 (interface completeness, ~½–1 day): A13
- /sync-docs is needed — see the DOCUMENTATION UPDATES NEEDED section of the block.

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
- Carried from cycle 12: `getSpanishInboxStats.pendingList` is a dead field
  (no client reads it); the other TimesheetArchive readers
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
- Every new pin was bite-checked. Two failed to bite first time and were
  tightened; that step is not optional and caught both.

## Where I left off
Batch 1 (A1/A2/A3/A11/A12) is implemented, fully tested (362 pure + 66 DOM +
20/20 visual, all green), and written up in
`.cycle/blocks/13-A1-A3-A11-A12-broad-implement.md` — but NOT committed. Commit
and push to `claude/broad-scan-yhkbe2` first. Then either run batch 2 (A4, A6,
A8, A9 — the silent-degradation + doc-drift set) or close the cycle with
/reflect and /sync-docs.
