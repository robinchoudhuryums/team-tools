---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- C1 | `scripts/counts.mjs` derives every number the docs carry (pure + DOM harness totals, visual scenarios, editor registrations, admin/manager endpoints, triggers, localStorage keys, invariant + scenario counts)
- C2 | CLAUDE.md carries ONE generated "Running totals" block between COUNTS:BEGIN/END markers; README points at it instead of restating a figure
- C3 | Every "expect **N**" / "797 → 798" / "the Nth admin endpoint" prose rewritten to cite the block or the command (the dated operator entries included)
- C4 | GUARD: run.js pins that the block equals `counts.mjs` output, plus a derived ban on a second copy of any total in prose; F7's count assertion now consumes the same derivation; CI runs `counts.mjs --check`

Files modified:
- scripts/counts.mjs (NEW, 269 lines)
- test/client/run.js
- CLAUDE.md
- README.md
- .github/workflows/client-tests.yml
- .cycle/STATE.md

CHANGES:
C1 | scripts/counts.mjs | New ESM script. Each figure comes from the artefact that DEFINES it: harness totals from an actual run (parsed off the summary line — a static count cannot equal either total, since tests registered in loops mean 762 call sites produce 808 runs), scenarios from shoot.mjs's own SCENARIOS, editor registrations from the `_smokeTest`/`_integrationTest` calls, gated endpoints from the message each returns, triggers from the installer + TRIGGER_GROUPS, invariants/scenarios from CLAUDE.md itself. Modes: default (with harness), `--static`, `--json`, `--block`, `--check`. A harness reporting ANY failure refuses to yield a total, so a red suite can never be laundered into a documented number.
C1 | scripts/counts.mjs | Spawn-cycle sentinel: `harnessTotal` sets COUNTS_NO_SPAWN on the child and refuses to spawn when it sees the sentinel already set. counts.mjs spawns run.js, and run.js calls counts.mjs back — unguarded, a dropped `--static` would not fail, it would RECURSE, which in CI burns the whole job timeout and reports nothing. Verified end-to-end: with `--static` removed the run now exits 1 in seconds with the cycle named, instead of hanging.
C2 | CLAUDE.md | One generated block in the Cycle Workflow Config under "Running totals (generated — do not hand-edit)", with a closing note that a second copy is a second source of truth.
C2 | README.md | The "102-scenario matrix" sentence now points at `node scripts/counts.mjs` / the block, and says a hand-carried number here had drifted before.
C3 | CLAUDE.md | Bulk prose rewrite across the invariant library, the Cycle Workflow Config narrative and the 53 dated operator entries. Two sentences mangled by the substitution (an orphaned `(` and its `)`) were found by a paren-balance scan over every added line and repaired.
C4 | test/client/run.js | Four pins: (a) every static figure in the block equals what `counts.mjs --static --json` derives; (b) a derived scan banning a stated harness total or "expect N" outside the block; (c) counts.mjs derives from the defining artefact and `--check` EXITS non-zero — asserted on the drift branch and the missing-block branch separately; (d) CI runs `--check`. F7's INV-136 count assertion now reads the block row rather than its own copy.
C4 | .github/workflows/client-tests.yml | Final step `node scripts/counts.mjs --check`. Runs LAST because it re-runs both harnesses.

TEST RESULTS: passed.
- Pure harness: 808 passed, 0 failed
- DOM harness: 113 passed, 0 failed
- `node scripts/counts.mjs --check`: CLAUDE.md agrees with the tree
- `node --check` on Code.js / Tests.js / DevTools.js: OK
- Bite-checks: 13 mutations, 13 bites. Three pins were corrected mid-batch because the FIRST bite did not bite (the running-total ban required label and number on one line while the narrative wraps at ~76 columns; a bare `) → 387;` carried neither label nor bold; `--check`'s exit was asserted on the file rather than the drift branch, so commenting out one of two `process.exit(1)` calls still passed). One mutation was itself wrong and was re-aimed. A fourth pin was REPLACED outright — see REGRESSION RISKS.

Regression Scenarios walked (Test Command is `manual`; the only subsystem overlapping a modified file is Test Suite):
- S1 Smoke test suite | NOT APPLICABLE — no Apps Script file changed. `git diff origin/main..HEAD -- web-app/` is empty; Tests.js and Code.js are byte-identical to main.
- S2 Full integration test suite | NOT APPLICABLE — same reason. `node --check web-app/Tests.js` passes, confirming no incidental damage.
No other scenario names Test Suite as its subsystem; every Server / Client-partial scenario is NOT APPLICABLE by construction, since this batch ships no deployable file.

REGRESSION RISKS:
- RESOLVED DURING THE BATCH — the recursion guard was false comfort on its first write. The obvious pin (assert run.js's own invocation carries `--static`) CANNOT fire: `countsJson_()` is first called by the C1/C2 test, which runs BEFORE that assertion, so the cycle would start before the pin was reached. Replaced with the counts.mjs sentinel above, which is bite-checkable in three independent halves (the name, the refusal, the child env) and was proven to convert the hang into an exit-1. The source check survives as documentation, explicitly labelled as such.
- CI time roughly doubles: `--check` re-runs both harnesses (~22s added). Accepted — it is the only place the harness totals can be verified, since a pin inside run.js cannot ask for run.js's own total without spawning it.
- A documentation-only change can now fail CI. That is the intent, not a side effect.
- No interface, return type or default changed for any consumer: counts.mjs is new, and F7 was rewired to a derivation that produces the same value it previously hard-coded (verified — F7 passes unchanged).

INVARIANTS AT RISK: None.
- INV-179 (derive scan sets, never hand-copy) — this batch EXTENDS it from scan sets to documentation numbers; no existing derivation was narrowed.
- INV-188 (strip comments before a source scan) — honoured: counts.mjs and the C4 pin both scan a comment-stripped view, because both files document the drift they exist to stop.
- INV-186 (an indicator that can never be clean is worse than none) — `--check` reads clean on a synced tree and was confirmed clean after every edit in this batch.
- No PHI, access-control, gating or Sheets-coercion surface was touched; no `web-app/` file changed at all.

NET SCORE: production fixes 0 − new failure modes 0 = 0.
(a) Would this have fired in production this month? NO for every item — this batch ships no deployable code. Its value is that it makes a class of documentation drift impossible to merge, and it CAUGHT two live instances on its first run: a Key Design Decision reading "the 43 Admin-exclusive endpoints" where the code enforces 50, and an editor-registration count of 315 that Batch Q had moved to 316. Both are now derived.
(b) Did any fix introduce a new failure mode? NO — the one that would have (the counts.mjs ⇄ harness cycle, which hangs rather than fails) is guarded and the guard is bite-checked end-to-end.

OPERATOR ACTIONS / DEPLOY:
- None. | BLOCKS DEPLOY: N
Deploy: N/A — no `web-app/` file changed, so nothing reaches the Apps Script project. No `clasp push`, no New version, no trigger re-install.
Worth telling the operator anyway: the next `runAllTests()` should read 316, not the 315 of the 2026-09-11 run. Batch Q added the 316th registration; Tests.js derives its own `Expected:` line, so the run and the docs now agree.

FOLLOW-ON ITEMS:
- `.cycle/estimates.csv` is still owed rows for Batches P (S, ~0.6 h), S (M, ~1.3 h) and Q (M, ~2.5 h), plus C. Six consecutive reflections have now skipped the calibration row; the SessionStart hook reminds on every session and the reminder is not working. Worth making /reflect's row a derived obligation rather than a remembered one — the same move this batch made for counts.
- counts.mjs derives 11 figures. Others still stated in prose but not yet derived (each a candidate for a future row): the mirror-index entry count, the number of `A11Y_SCAN_PARTIALS`, and the "N of M tabs covered" visual-gap marker (which has its own VIS-COVER pin and may not need one).

DOCUMENTATION UPDATES NEEDED:
- Done in-batch: `scripts/counts.mjs` added to the Cycle Workflow Config's Test Suite subsystem file list (a new harness-adjacent script absent from that list reads as absent to /sync-docs check 2).
- None outstanding.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
