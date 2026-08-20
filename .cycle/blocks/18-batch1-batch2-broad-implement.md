---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- F1 | Stored XSS via the `data-src` round-trip (roster + decision KB blocks re-rendered DECODED article content through innerHTML)
- S1 | The structural gap behind F1: interactive blocks had no DOM-harness coverage, and a pure pin blessed the vulnerable line
- F4 | The PTO accrual credit swallowed its own failure — a job that writes leave BALANCES reported failure to nobody
- Gap4/S2 | Per-job automation liveness DERIVED from a table instead of one hand-written check per signal
- (Gap4 investigation) | The manager daily brief silently omitted a section whose source failed, while suppressing the digest that covered it — CONFIRMED, fixed

Files modified:
- web-app/kb/script_kb.html
- web-app/Code.js
- test/client/dom/runDom.js
- test/client/run.js
- test/visual/mock.js

CHANGES:
F1 | web-app/kb/script_kb.html | New `kbFenceEsc_` / `kbFenceDecode_` / `kbFenceSrc_` boundary. Every read of a stored fence source now re-applies kbMd_'s top-level escape, restoring the contract the renderers were written against. EIGHT coupled sites: the 3 `data-src` reads (kbDecideRender_, kbRosterExpand_, kbRosterData_); the 2 path channels the decision walk matches on (kbDecidePath_, kbDecideChoose_); the person-panel lookup (kbRosterOpenPerson_); the flow-edge selector (kbRosterDrawEdges_, which needed the INVERSE — a CSS attribute selector matches the DECODED value); and kbMapDecode_ delegating to the shared decoder rather than keeping a second copy of the entity list.
S1 | test/client/dom/runDom.js | +4 DOM tests (the harness that can actually parse HTML): no live element after ANY roster mode switch or Expand, none from the person panel, none from a decision answer, and a matching test proving `& < >` values still resolve. jsdom does not compile inline onclick under runScripts:'outside-only', so the handlers are called directly — dispatching a click made two assertions vacuous until that was caught.
S1 | test/client/run.js | Corrected the pin that asserted `kbDecideHtml_(root.getAttribute('data-src')` was the CORRECT shape (it pinned the injection), and added a general source ban: exactly one `getAttribute('data-src')` in the file, inside kbFenceSrc_, which must re-escape.
F4 | web-app/Code.js | `creditMonthlyPtoAccruals` stamps `stampAutomationError_('PtoAccrualCredit', …)` in its catch and clears it on a clean run. Apps Script's trigger-failure email fires on a THROW, not a returned error object, and nothing read this return value.
Gap4 | web-app/Code.js | New `AUTOMATION_JOB_CHECKS` table + `automationJobProblems_`, replacing the single hardcoded CallNotesReconcile staleness check. Covers 7 audit-row jobs with cadence ('daily' | 'monthly', in arrears with a grace day) and — the load-bearing part — an `enabled()` predicate so a job that legitimately writes no row on a healthy deployment is never checked (INV-186 in code). AdpExportAuto is DELIBERATELY absent (period-based; neither cadence describes it) and that omission is pinned as reasoned. Also `AUTOMATION_LAST_ERRORS` stamp/clear/read helpers and `rosterHasAccruingRep_`.
Gap4 | web-app/Code.js | `sendManagerDailyBrief`: the six best-effort sources now record which ones failed, stamp an automation error, ride into the email as an "Incomplete brief" banner, and force a send when a source failed — silence now means a true all-clear, not "could not look".
Gap4 | test/visual/mock.js | getAutomationHealth fixture gains `automationErrors: {}` and a PtoAccrualCredit run row — the derived INV-185 fixture-shape pin caught the new return key immediately.

TEST RESULTS: passed.
- Pure harness: 562 passed, 0 failed (was 556; +6 tests)
- DOM harness: 75 passed, 0 failed (was 71; +4 tests)
- node --check: Code.js / Tests.js / DevTools.js all clean
- Visual matrix: 42 scenarios, 0 missing / 0 overflow / 0 non-network console errors
- Bite-checks: 15 mutations, all confirmed biting (6 for F1/S1, 9 for F4/Gap4). THREE pins did not bite on first write and were strengthened: a substring match let a renamed action pass, the producer side had no pin at all, and — the important one — the whole Batch-2 block was appended AFTER run.js's `process.exit()`, so it never executed. Caught only because every mutation was checked.
- Regression Scenarios walked (Test Command is `manual`): S62 PASS (Reference tree + all five block types render, zero live elements, markdown intact), S64 PARTIAL-PASS (the shared block renderer verified inside the drawer body; the drawer itself does not auto-mount in the static harness — harness limitation, not a code change), S2 NOT RUN (editor-only; see operator actions), S63/S65/S66/S71 NOT APPLICABLE (converter/upload/AI/review paths untouched), S46/S72 NOT APPLICABLE (no Time-Clock or coverage code touched).

REGRESSION RISKS:
- `kbRosterAttr_` is UNCHANGED, so every human-facing attribute (title, aria-label, data-tip, and the Copy-name clipboard value) still round-trips to the human form — verified in Chromium: Copy name yields "Smith & Jones", not an entity. A blanket `&`-escape there would have been the smaller diff and would have broken all four.
- The decision block's option matching had to move WITH the source fix: re-escaping only `data-src` would have made `o.label` escaped while `data-opt` stayed decoded, dead-ending any guide whose option label contains `&`, `<` or `>`. Verified working before and after.
- `managerBriefSections_` iterates a fixed whitelist, so the new `failedSources` key on its payload cannot create a phantom section — checked.
- `automationProblems_`'s pre-existing stale-reconcile message is preserved VERBATIM (pinned by a behavioural case) so the digest/badge text does not change for the one signal that already worked.
- New failure direction to know: the automation table now emits MORE problem lines than before. A deployment with retention enabled but the trigger never installed will start reporting it — correct, but it is new noise on first deploy.

INVARIANTS AT RISK:
- INV-193 is now FACTUALLY WRONG as written ("article bodies still cannot carry HTML or script, and that boundary is untouched") — it held for the first render only. Needs the round-trip clause. Flagged under documentation.
- INV-186 is strengthened, not risked: the `enabled()` predicate is that rule expressed in code rather than prose.
- INV-188 (strip comments before scanning) — honored in the two new source pins.
- INV-194 (accrual) — the credit's ORDER, idempotence, arithmetic and lock behaviour are untouched; only the catch now stamps.
- INV-185 — the fixture mirror held and did its job; updated in the same commit as the server change.
- No other invariant touched.

NET SCORE: 3 − 0 = 3
(a) Would it have fired in production this month? F1 YES — any admin converting a roster/decision sheet whose cells carry markup, and it executes for every reader; F4 YES — the accrual runs monthly and any failure was invisible; the brief's silent-omission YES — six sources, each a live store. Gap4/S1 are structural, not counted.
(b) New failure modes introduced? None identified. The one behaviour change (more problem lines) is the intended signal, and every new code path is covered by a biting pin.

OPERATOR ACTIONS / DEPLOY:
- Run `runAllTests()` from the Apps Script editor after deploying (S2 — editor-only; the accrual + automation-health integration tests cannot run off-editor) | BLOCKS DEPLOY: N
- Expect NEW lines in Admin → Automation Health / the daily failure digest if a retention or archive window is enabled without its trigger installed. That is the fix reporting a real gap, not a fault — re-run `installAutomationTriggers()` if so | BLOCKS DEPLOY: N
- No new Script Properties to create. `AUTOMATION_LAST_ERRORS` is auto-managed (delete it to clear a stale failure flag) | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.
(Not complete in production until the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- AdpExportAuto has no liveness check (period-based; needs pay-period-end arithmetic to check honestly). Deliberately deferred rather than guessed.
- The remaining audit batches are untouched: Batch 3 (status-normalize family, F5), Batch 4 (weekend reminders F2, accrual tile F7/F10), Batch 5 (accessibility F6 + unnamed dialogs), Batch 6 (fixture drift F14, timeoff mobile scenario F8), Batch 7 (getTeamMetrics span cap F3, ViewUsage retention F11, doc corrections), Batch 8 (completeness gaps).
- NOTICED, NOT FIXED (out of scope): `kbRosterAttr_` does not escape `&`, so it is an incomplete attribute escaper. It is currently CORRECT for every call site given the compensating decode, but it is a trap for a future attribute that is compared against parsed data. Worth a named `kbFenceAttr_` for machine-read attributes if that class grows.

DOCUMENTATION UPDATES NEEDED:
- INV-193: add the round-trip clause — the escape boundary holds for the first render; a stored source must be re-escaped on read.
- New Common Gotcha: "a value written to a `data-*` attribute comes back DECODED" — the map block already articulated this rule for itself; it belongs at the top level.
- INV-161/INV-186: record that per-job automation liveness is now derived from `AUTOMATION_JOB_CHECKS`, with `enabled()` as the INV-186 mechanism, and AdpExportAuto's omission as reasoned.
- INV-194: note that the credit stamps `AUTOMATION_LAST_ERRORS` on failure.
- INV-151: note that the brief reports unreadable sources rather than omitting them silently.
- Operator State Checklist: `AUTOMATION_LAST_ERRORS` as an auto-managed property.
- Test-count narrative: pure 556 → 562, DOM 71 → 75.
- Test Suite section: record the run.js `process.exit()` hazard — tests appended after it never execute.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
