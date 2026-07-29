---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented (cycle 13, batch 3 + the open follow-on items):
- A5   | The nightly self-test inferred "dev" from a banner label and failed OPEN toward the destructive full suite
- A7   | generateExportSheet_ bailed with "no data" BEFORE the F1 cold-archive read-through
- A10  | submitQuizAttempt held four store reads inside the ONE project-wide ScriptLock
- FO-2 | "Generate ADP Export" was the last button still on the inverted --ink primary V-8 retired
- FO-3 | The Clock shift-strip header could not wrap, so the hours readout clipped in the 360px rail
- FO-4 | _assertEq compared via JSON.stringify, where NaN and null are both "null"
- FO-5 | Two dead response fields (annualPlannedUpcoming, pendingList) with no client readers

Files modified:
- web-app/Code.js
- web-app/Tests.js
- web-app/styles.html
- web-app/tc/script_clock.html
- web-app/cn/script_callnotes.html
- test/client/run.js
- CLAUDE.md

CHANGES:

A5 | Code.js, cn/script_callnotes.html, CLAUDE.md |
  Introduced ONE `isDevInstance_()` predicate requiring BOTH markers: an
  `INSTANCE_LABEL` and an `INSTANCE_IS_PROD` that is explicitly present and not
  'true'. The old test was `label set && !isProdInstance_()`, and
  `isProdInstance_()` is false whenever the property is UNSET — which is
  production's DEFAULT state (both properties are documented as optional and
  prod has neither). So dev-ness was inferred from the mere PRESENCE of a banner
  label, and labelling prod — which the docs actively recommend so the two tabs
  cannot be confused — silently flipped prod into dev:
    • `runNightlySelfTest` would run the FULL `runAllTests` against live payroll
      / audit / PHI sheets nightly at 1am. `assertNotProdInstance_` does NOT
      catch this — it only throws on INSTANCE_IS_PROD === 'true'. cleanupTestData
      sweeps at the end, but a run killed by the 6-minute ceiling (exactly what
      F15's sentinel exists to detect) leaves TEST_ rows behind.
    • `devScrubRoster_` would ANONYMIZE THE LIVE ROSTER — every employee email
      replaced with @example.invalid and column L blanked.
  SCOPE NOTE: the finding named only the self-test, but `assertDevInstance_`
  (which guards the roster scrubber) had the IDENTICAL hole and its own doc
  comment asserted "Prod has no INSTANCE_LABEL → refuses" as if that were
  enforced. Both now route through the one predicate — fixing the shared cause
  once rather than patching one caller, the F14 approach.
  A half-configured instance is no longer SILENT about the downgrade: it runs
  smoke and records a `note` explaining the missing marker, carried through
  computeAutomationHealth_ and rendered on the Admin → Automation Health
  self-test line.

A7 | Code.js |
  `if (rows.length < 3) return { error: 'No timesheet data found.' }` fired
  BEFORE the F1 cold-archive read-through, so once INV-153 archival had drained
  the live tab a retroactive payroll export refused with a misleading error
  instead of reading the archive that held the rows. Only the two HEADER rows
  are genuinely required from the live tab (the export copies them verbatim);
  zero DATA rows is a legitimate state the archive can still satisfy. Guard is
  now `rows.length < 2` with an accurate message. Verified the empty-data path:
  the loop no-ops, `oldestLiveDate` stays null, the archive condition
  (`oldestLiveDate === null || …`) fires, and the header setValues is satisfied.

A10 | Code.js |
  Moved auth, quiz lookup, assignment check and GRADING out of the ScriptLock.
  None is transactional — they only decide whether to accept the submission and
  what score it gets — yet all four sat inside the ONE project-wide lock that
  every punch write contends for on a 15s waitLock ceiling (the F12 shape the
  project already ruled against in deletePunch). Unauthorized / unknown-quiz /
  unassigned requests now never take the lock at all. DELIBERATELY still inside:
  the appends, the completions dedup (a read-check-write guarding against a
  double completion row), and the post-append attempt count, which must observe
  the row just written. Side effect worth noting: grading now uses the quiz
  version the rep was served, which is more correct than re-reading mid-attempt.

FO-2 | styles.html |
  `.export-btn-large` was `background: var(--ink)` — the inverted vocabulary V-8
  removed from `.btn-modal-ok` for exactly this reason ("near-black on 'Generate
  ADP Export', the money-facing action, reads as disabled/error"), but that
  on-page button is a different class and was never covered. Now matches
  `.btn-modal-ok` / `.actions .prime`, keeping its own geometry. Its hover also
  used `color-mix(in oklch, …)`, which INV-165 bans for a semantic colour;
  moving to `--accent-2` removes the mix entirely. VERIFIED by re-rendering the
  visual matrix, not by reasoning.

FO-3 | tc/script_clock.html |
  `.shift-strip-head` was `display: flex` with NO `flex-wrap`, so its five
  children (label · state pill · spacer · coverage · hours) were forced onto one
  line and "5h 54m worked · 32m lunch" ran past the card edge in the 360px
  Dashboard rail. V-4 (cycle 12) had already made `.ss-hours` wrap INTERNALLY
  between its two readouts — but an inner wrap cannot help when the PARENT row
  has nowhere to wrap to. `.ss-grow` is `flex: 1` with a 0 basis so it
  contributes nothing to line-breaking and wide layout is unchanged. VERIFIED by
  re-render: the header now wraps to three clean lines, no clipping.

FO-4 | Tests.js |
  `_assertEq` compared via `JSON.stringify`, and `JSON.stringify(NaN)` is the
  string `"null"` — so `_assertEq(NaN, null)` PASSED, leaving the editor suite
  blind to exactly the sentinel class cycle-13 A3 was fixing. Now uses a
  `JSON.stringify` REPLACER that maps NaN/Infinity/-Infinity to markers.
  IMPORTANT design note: my first attempt was a recursive walker, which ALSO
  changed how `{a: undefined}` compares to `{}` — a semantics shift across ~300
  editor assertions that cannot be run outside the Apps Script editor. The
  replacer form is verified BYTE-IDENTICAL to plain JSON.stringify for every
  non-NaN value while still catching a nested NaN.

FO-5 | Code.js |
  Removed two response fields with no client readers anywhere:
    • `getEmployeeState.annualPlannedUpcoming` — its only reader,
      `renderPtoMini_`, was deleted in cycle 8 when the Dashboard redesign moved
      Annual PTO to the Time/PTO tab, and that tile computes its own
      pending-planned total client-side from `data.allRequests` (INV-72). The
      now-orphaned `getUpcomingAnnualPlanned_` helper went with it — leaving it
      would repeat exactly the A4 trap (a dead helper under an obvious name).
      This SUPERSEDES batch 2's A8, which hardened that helper's error path; the
      honest end state was that the whole path was dead, including a whole
      TimeOffRequests read performed on every getEmployeeState call.
    • `getSpanishInboxStats.pendingList` / `pendingListCap` (and the orphaned
      `SPANISH_PENDING_LIST_CAP`) — both surfaces use the separate, uncapped,
      live-read `getSpanishInboxPending`, which is richer and deliberately never
      cached because it carries request content. F18 correctly flagged the
      silent cap, but the honest fix for a capped list nobody renders is to stop
      shipping it — which also keeps PHI-adjacent subjects out of the 5-minute
      CacheService entry. The `pending` COUNT is unaffected.

TEST RESULTS: PASSED.
  node --check × 3: OK
  Pure harness: 373 passed, 0 failed (366 → 373)
  DOM harness:  66 passed, 0 failed
  Visual harness (re-run because CSS changed): 20/20, 0 missing fixtures.
    FO-2 and FO-3 were verified by MEASURING the re-rendered screenshots, per
    the V-9 lesson, not by reasoning about the CSS.
  All 7 new pins bite-checked; the FO-5 removal pins bite when either dead field
  is re-added.
  TWO EXISTING PINS were updated as part of the fix, not reactively:
    • The batch-2 A8 pin extracted `getUpcomingAnnualPlanned_`, which FO-5
      deleted. Replaced by a pin asserting the whole path STAYS removed —
      strictly stronger than the hardened-catch assertion it supersedes.
    • The cycle-12 F18 pin asserted getSpanishInboxStats DECLARED its pendingList
      cap. Rewritten to assert the reader-less field does not come back while
      `pending` (the count) is still returned. Comments are stripped before the
      scan, since the removal note names the field it removed.
  Regression Scenarios (manual): no FAILs. S8 PASS (static + pin), S39 PASS
    (visual re-render), S3/S4/S13 PASS (static — the removed field had no
    reader), blue-green instance guards PASS (4 harness cases incl. the new
    "a LABEL alone is NOT dev"). S68 NOT APPLICABLE (needs a live deploy; A10 is
    a reordering with byte-identical grading, gating and appends). S72 NOT
    APPLICABLE (untouched this batch).

REGRESSION RISKS:
  - A5 NARROWS dev-detection: a dev project configured per the OLD docs
    (INSTANCE_LABEL only) now reads as not-dev, so devScrubRoster_/devShowConfig_
    refuse and the nightly run drops to smoke. Deliberate — the alternative is a
    labelled prod that anonymizes its own roster — and made LOUD rather than
    silent (the refusal names the property; the downgraded run records a note on
    the Admin self-test line). Listed below as a blocking dev-only operator action.
  - A7 relaxes a guard. The empty-data path was traced end to end; a genuinely
    empty sheet (< 2 rows) now gets an accurate header error instead of a
    misleading data error.
  - A10 reorders but removes nothing from the lock that guards state. Grading
    against the served quiz version is more correct, not less.
  - FO-5 removes two shipped response fields. Repo-wide search confirmed zero
    readers before removal in both cases.
  - FO-4's first implementation would have changed object-comparison semantics
    for ~300 unrunnable editor assertions; the shipped replacer form is verified
    byte-identical for every non-NaN value.

INVARIANTS AT RISK:
  - INV-162 (nightly self-test) — AMENDED by A5 in code and doc together: the
    dev condition is now isDevInstance_(), and the "assertNotProdInstance_ stays
    the backstop" claim was corrected (it is not a backstop for the unset case).
  - INV-01 — upheld; A10 keeps waitLock + finally-release, structural scan green.
  - INV-121 — upheld; A10 moved no key-bearing data, strip-source tripwire green.
  - INV-165 — IMPROVED; FO-2 removed an `in oklch` mix rather than converting it.
  - INV-153 / INV-132 — upheld; A7 reads, never writes.
  - INV-129 / F18 — upheld; FO-5 removed a reader-less list, not a rendered one.
  - INV-72 / INV-124 — upheld; the Time/PTO tile's own client-side total is the
    live path and is untouched.

NET SCORE: 2 production fixes − 0 new failure modes = 2
  (FO-2 and FO-3 are the only two a user actually hit this month. A5 is the
  highest-CONSEQUENCE item in the batch but has not fired — it needs a labelled
  prod. A7 needs archival enabled AND a drained live tab. A10 is contention cost.
  FO-4 is test integrity, FO-5 is hygiene. Counted honestly rather than claiming
  seven.)

OPERATOR ACTIONS / DEPLOY:
- **DEV PROJECT ONLY — add Script Property `INSTANCE_IS_PROD=false`** to any
  existing dev instance. Without it the dev tools refuse and the nightly run
  drops to smoke (visibly, via the Admin self-test note). PROD is unaffected:
  with neither property set it behaves exactly as before. | BLOCKS DEPLOY: N
  (blocks the DEV workflow only)
- CARRIED: the operator deploy remains unconfirmed and now covers cycles 11, 12,
  and 13 batches 1–3. | BLOCKS DEPLOY: N (but it gates all of it reaching users)
Deploy:
  Server + Client (shell / Time Clock / Call Notes) + Test Suite (one command):
    cd web-app && clasp push -f
  then Apps Script editor → Deploy → Manage deployments → Edit → Version:
  **New version** → Deploy.
  Post-deploy: run `runAllTests()` — cycle 13's `timeToMins_nullOnUnparseable`,
  the two renamed `metrics_cnCountNotesResult_*` tests, and cycle 12's still-unrun
  `cn_enrolledSheetId_trimsAndNullGuards` / `cn_appendBounded_capsAndRollsBack`
  execute only in the editor. FO-4 hardened `_assertEq`, so this run is also the
  first real check that no existing assertion depended on the NaN/null collapse.

FOLLOW-ON ITEMS:
- **FO-6 (the remaining TimesheetArchive readers) was ANALYSED and DEFERRED, not
  skipped.** The scan listed three live-tab-only readers; the analysis says they
  are NOT one job:
    • `buildTimesheetForEmployee_` (employee calendar + manager timesheet) and
      `getPunctualityReport` SHOULD read through, behind the same "only when the
      window predates the live floor" gate the export uses — otherwise an
      archived month renders blank. ~M (½ day) for a shared helper + dedup + tests.
    • `tsDoctorScan_` must NOT read through. Its companion
      `fixTimesheetDuplicates` deletes rows by LIVE-tab index, so surfacing
      archived duplicates would report findings the fix cannot act on — and risks
      acting on the wrong row index. This is a design decision the operator should
      make explicitly, which is why I did not fold it into this batch.
  Archival is OFF by default and the ≥120-day floor keeps recent data live, so
  nothing is currently broken.
- The 16-site `getSheetByName(CONFIG.ADP_TAB)` inventory taken while assessing
  FO-6 is worth keeping: most are writers or recent-window dashboards that
  correctly stay live-only. Only the two readers above are candidates.
- Unchanged from earlier batches: A13 (no heading outline below h1) is the whole
  of batch 4; the batch-5 process items (a11y tripwires, the visual lens as a
  standing /broad-scan stage, deleting the frozen directories) are unstarted.

DOCUMENTATION UPDATES NEEDED:
- None outstanding — applied in this batch: the blue-green paragraph now states
  that dev requires BOTH properties and names the one-time operator action;
  INV-162 and the trigger-list entry were corrected to match (including the fact
  that assertNotProdInstance_ is NOT a backstop for the unset case); the
  pure-harness count is 366 → 373; and a cycle-13 batch-3 operator-state note
  records the A5 requirement change and the two removed dead fields.
- Proposed invariant for /reflect: INV-177 — "dev-ness requires BOTH instance
  markers; an unset INSTANCE_IS_PROD is production, because that is prod's
  default state." A5 is the second time an absent marker has been read as an
  affirmative signal, so it is worth a library entry rather than a gotcha.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
