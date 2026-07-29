---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented (cycle 13, batch 2 — the silent-degradation + doc-drift set):
- A4 | `countCallNotesInRange_` had no production callers — the 0-on-error variant was alive under the obvious name, kept there by its own tests
- A6 | `kbReloadTree_` swallowed BOTH the RPC failure and a server-returned error
- A8 | `getUpcomingAnnualPlanned_` returned 0 on a failed read
- A9 | `archiveOldCallNotes` stamped `hitPerRunCap` on runs that were not capped

Files modified:
- web-app/Code.js
- web-app/Tests.js
- web-app/kb/script_kb.html
- test/client/run.js
- CLAUDE.md

CHANGES:

A4 | Code.js, Tests.js, CLAUDE.md |
  DELETED `countCallNotesInRange_`. Cycle-12 F5 replaced it with the
  outcome-carrying `cnCountNotesResult_` and kept it as "a thin numeric wrapper
  for the callers that only want the number" — but a repo-wide search found NO
  such callers. The only references left were its own two tests, which ASSERTED
  it returns 0 on an unreadable Sheet: the silently-degrading variant sitting
  under the most obvious name, pinned by tests enshrining the exact behaviour F5
  existed to remove. Both tests now drive `cnCountNotesResult_` directly and were
  renamed to match (`metrics_cnCountNotesResult_noSheetReturnsZero`,
  `metrics_cnCountNotesResult_countsToday`); the integration one additionally
  asserts a successful read is NOT flagged `unavailable`. There is now exactly
  one count path by construction.

A6 | kb/script_kb.html |
  `kbReloadTree_` was the ONE RPC in the KB partial without a
  `withFailureHandler` (29 of 30 had one), and its success path also opened
  `if (!res || res.error) return;`. It runs after every save / delete / publish /
  revert to refresh the tree, so either failure left the admin looking at a list
  that did not show the item they had just saved — or still showed one they had
  just deleted — with no signal at all, whose natural response is to save again.
  Both paths now route through one `stale()` helper whose toast says what is
  actually true: the change WAS saved, the list is out of date, reload to see it.

A8 | Code.js |
  `getUpcomingAnnualPlanned_` returns null instead of 0 when the
  TimeOffRequests read throws — the F5 class one surface over ("the read failed"
  vs "you have nothing planned"), now with a console.warn.
  HONESTY CORRECTION TO THE SCAN: this is a LATENT fix, not a user-visible one.
  The scan claimed it silently blanked "the Clock's amber PTO pips", but the only
  consumer of `annualPlannedUpcoming` was `renderPtoMini_`, removed in cycle 8
  when the Dashboard redesign relocated Annual PTO to the Time/PTO tab — and that
  tile computes its own pending-planned total client-side from `data.allRequests`
  (INV-72). The field ships on `getEmployeeState` with nobody reading it. Fixed
  anyway because the shape is wrong and a future reader would inherit the
  confident zero; the DEAD FIELD is recorded as a follow-on, since removing it is
  a response-shape change and out of A8's scope.

A9 | Code.js |
  The nightly `CallNotesArchive` audit row stamped `hitPerRunCap` whenever
  `budget <= 0`, which ALSO fires when the last rep's move consumed exactly the
  remaining rows and no work was left. INV-153 tells operators to expect several
  capped runs while a first-enable backlog drains, so a clean final run reading
  as "still capped" left them with no way to tell it had finished. The stamp now
  keys off a `truncated` flag set only when the budget ran out AND a remaining
  roster row is actually enrolled, and the message matches the Timesheet twin's
  wording ("more remain — continues tomorrow"). Residual, accepted and commented:
  a remaining enrolled rep might itself have had nothing to archive, so it can
  still over-report by one run at the very end of a drain — but never on a run
  that visited every rep, which is the case an operator watches.

Docs | CLAUDE.md |
  The F5 gotcha's claim that `countCallNotesInRange_` is "kept for the callers
  that only want the number" was DEFERRED from this cycle's /sync-docs precisely
  so it would get one correct edit here rather than two. Corrected, along with
  the "Note coverage + count have a single source of truth" decision (which named
  the removed helper three times) and the editor-suite test-name reference. Pure
  harness count 362 → 366; the cycle-13 operator-state paragraph now covers both
  batches and names A9's one operator-visible effect.

TEST RESULTS: PASSED.
  node --check × 3: OK
  Pure harness: 366 passed, 0 failed (362 → 366; +4 batch-2 pins)
  DOM harness:  66 passed, 0 failed
  All four new pins bite-checked (each fails when its fix is reverted).
  TWO CYCLE-12 PINS BROKE and were updated as part of the fix, not reactively:
    • F5 extracted `countCallNotesInRange_` to assert it delegated — the wrapper
      is gone, so that clause was replaced with a comment explaining that ONE
      count path by construction is a stronger guarantee than the delegation
      check it replaces (the new A4 pin keeps the wrapper from returning).
    • F3-sibling matched `if (budget <= 0) break;` literally; A9 gave that guard
      a body. The regex was loosened to `if (budget <= 0) \{?[\s\S]{0,260}?break;`
      and RE-BITE-CHECKED — it still fails if the rep-loop break is removed, so
      the invariant it guards is intact.
  Regression Scenarios (Test Command = manual): S62 (Reference browse/edit/delete)
    is the scenario A6 touches — its expected behaviour on a FAILED tree refresh
    is now a warn toast rather than silence; needs the operator to confirm.
    S41–S44 unaffected (A4 is a pure rename + deletion with identical semantics).
    All others NOT APPLICABLE — no shared code path.

REGRESSION RISKS:
  - A8 changes a shipped `getEmployeeState` field from 0 to null on the error
    path. No client reads it today (that is the finding), so nothing can break;
    if a future client adds a reader it must treat null as "unknown".
  - A4 is a deletion. Verified by repo-wide search + the new pin that no caller
    exists in Code.js or Tests.js; the two tests were repointed, not deleted, so
    coverage of the CN.DATE_LOCAL coercion class is unchanged.
  - A9 only changes an audit-row STRING. The archival behaviour, the budget, and
    the rep-loop break are byte-identical.
  - A6 adds a toast on a path that previously did nothing. It cannot fire on a
    successful refresh.

INVARIANTS AT RISK:
  - INV-129 / the F5 note-count contract — A4 removes a helper the F5 pin
    referenced. The contract is strengthened (one path, not two); pin updated.
  - INV-132 / INV-153 (cold-archive semantics) — A9 touches only the audit
    string; the append-then-delete, per-run budget and monotonic-progress
    guarantees are untouched.
  - INV-142 / INV-167 (column-L predicate) — A9's look-ahead uses
    `cnEnrolledSheetId_`, so the global raw-read ban still passes.
  - No lock, gate, endpoint signature, or PHI boundary changed.

NET SCORE: 1 production fix − 0 new failure modes = 1
  (A6 would have fired this month — any failed tree refresh after a save. A9 is
  an observability defect that misleads an operator but breaks nothing. A4 is a
  maintenance trap with no runtime effect. A8 is latent by the correction above.
  Counted honestly rather than claiming four.)

OPERATOR ACTIONS / DEPLOY:
- None new. No Script Properties, triggers, migrations, or CONFIG constants. | BLOCKS DEPLOY: N
- CARRIED: the operator deploy remains unconfirmed and now covers cycles 11, 12,
  and 13 batches 1–2. | BLOCKS DEPLOY: N (but it gates all of it reaching users)
Deploy:
  Server + Client (Reference views) + Test Suite (one command ships them all):
    cd web-app && clasp push -f
  then Apps Script editor → Deploy → Manage deployments → Edit → Version:
  **New version** → Deploy.
  Post-deploy: run `runAllTests()` — the two renamed `cnCountNotesResult_` tests
  plus cycle 13's `timeToMins_nullOnUnparseable` and cycle 12's still-unrun
  `cn_enrolledSheetId_trimsAndNullGuards` / `cn_appendBounded_capsAndRollsBack`
  execute only in the editor.

FOLLOW-ON ITEMS:
- `annualPlannedUpcoming` is a DEAD field on `getEmployeeState` — its only reader
  was removed in cycle 8. Removing it is a response-shape change; grouped with the
  identical `getSpanishInboxStats.pendingList` dead field carried from cycle 12.
  Worth one small batch that clears both.
- Still open from the scan: A5 (nightly self-test dev-detection fails open),
  A7 (export bails before the archive read-through), A10 (four store reads inside
  the global lock) — batch 3; A13 (no heading outline below h1) — batch 4; plus
  the batch-5 process items (a11y tripwires, visual lens as a standing stage,
  deleting the frozen directories).
- Carried from batch 1, unchanged: the near-black "Generate ADP Export" button,
  the Clock shift-strip duration overlap, and the `_assertEq`/`JSON.stringify(NaN)`
  hazard in Tests.js.

DOCUMENTATION UPDATES NEEDED:
- None outstanding — the CLAUDE.md edits this batch required were applied here
  (the F5 gotcha, the single-source-of-truth decision, the test-name reference,
  the pure-harness count, and the cycle-13 operator-state paragraph).
- Proposed invariant for /reflect: none new from batch 2. A4 strengthens the
  existing F5/INV-129 contract rather than adding one.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
