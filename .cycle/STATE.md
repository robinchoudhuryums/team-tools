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
- Batches 1, 2 and 3 (+ the open follow-on items) are IMPLEMENTED, committed
  and pushed to `claude/broad-scan-yhkbe2`; /sync-docs ran after batch 1 and
  batches 2 and 3 applied their own doc edits. Not deployed.
- Verbatim summary blocks are at `.cycle/blocks/13-A1-A3-A11-A12-broad-implement.md`,
  `13-A4-A6-A8-A9-broad-implement.md` and
  `13-A5-A7-A10-followons-broad-implement.md`.
- Every cycle-13 finding is now implemented EXCEPT A13 (batch 4). FO-6 was
  analysed and deliberately deferred — see Open follow-on items.
- Next concrete step: run batch 4 (A13), or close the cycle with /reflect.

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
- Remaining cycle-13 finding:
  - Batch 4 (interface completeness, ~½–1 day): A13 — no heading outline below h1
- /sync-docs has RUN (commit adb2ee7) and batch 2 applied its own deferred edit.
  No documentation work is outstanding.

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

## Where I left off
Batches 1–3 plus every open follow-on are implemented, tested (373 pure + 66 DOM
+ 20/20 visual, all green), documented, committed and pushed to
`claude/broad-scan-yhkbe2`. Nothing doc-wise is outstanding. Only A13 (batch 4 —
no heading outline below h1) remains unimplemented, and FO-6 is deliberately
deferred with its analysis recorded above. Next: run batch 4, or close the cycle
with /reflect (which should also record the proposed INV-177 — dev-ness requires
BOTH instance markers). TWO operator actions now gate delivery: the carried
deploy (cycles 11–13) and, on the DEV project only, adding
`INSTANCE_IS_PROD=false`.
