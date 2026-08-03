---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- Batch 4 | Extend the visual harness's reach — the matrix shot 5 of 9 tools at ONE viewport, which is why F2 (a 70px Reference reader) survived two interface-focused cycles
- F9 (Batch 1) | The PPD engine treated a blank / non-numeric / half-written Offerings weight-capacity cell as UNLIMITED capacity, so a chair could be recommended regardless of patient weight
- F9 companion (Batch 1) | Offerings catalog validator, surfaced as an Automation Health card — without it the fail-closed fix turns a data-entry slip into a chair that silently stops being recommended

Files modified:
- test/visual/shoot.mjs
- web-app/Code.js
- web-app/cn/script_callnotes.html
- test/client/run.js

CHANGES:

Batch 4 | test/visual/shoot.mjs | Added SEVEN scenarios (22 → 29): `reference-light-mobile`, `reference-light-compact`, `intake-light-mobile`, `intake-light-compact`, `metrics-light-mobile`, `metrics-team-light-mobile`, `training-light-mobile`. Every rep-facing tool now has a mobile scenario; the two mid-task tools (the ones the KB drawer's edge tab treats as first-class) also have a compact one. No fixture work was needed — all seven render with `missing: []`, so the existing fixtures already covered these views; only the viewport was missing.

Batch 4 (extension — see REGRESSION RISKS) | test/visual/shoot.mjs | Each report row now carries `viewport` and `overflowPx` (document `scrollWidth − clientWidth`), and the run prints an explicit HORIZONTAL OVERFLOW / MISSING FIXTURES summary at the end. CLAUDE.md's A2 gotcha already states this rule — "a squeezed layout and an overflowing one look identical in a screenshot; re-measure scrollWidth vs clientWidth after any stacking change" — and the harness never implemented it, so every such check has been a manual side-run. Elements inside a legitimate `overflow-x: auto` scroller do not count; only the document's own scroll width does.

F9 | web-app/Code.js | `intakeFilterRecommendations_`'s weight filter now fails CLOSED. `parseInt('')` is NaN and every comparison against NaN is false, so `''`, `'   '`, `'n/a'`, `'300-'` and `'-450'` all admitted a 400 lb patient. Both branches now `isFinite`-guard and exclude the product when the capacity cannot be read. This matches the engine's own posture 40 lines above, where a catalog missing K0821 returns NO recommendations rather than silently dropping the mobile-home constraint.

F9 companion | web-app/Code.js, web-app/cn/script_callnotes.html | New PURE `intakeCatalogIssues_(rows)` checks only what the engine actually reads and only what is objectively wrong (never taste): blank / non-numeric / unreadable / inverted weight capacity and a seat type containing neither `s` nor `c` are ERRORS (the row cannot be recommended); a non-ASCII dash in a range, a blank seat type, and blank pdfLink/imageUrl are WARNINGS. Row numbers are 1-based SHEET rows so the operator can jump to the cell. `getIntakeCatalogHealth_()` wraps the read and carries the OUTCOME (`ok:false` on a failed read, so an unreachable store cannot render as a clean catalog — INV-129). Surfaced as an "Intake Offerings catalog" section in the Admin → Automation Health panel via `cnIntakeCatalogHtml_`, every server string `esc()`'d.

F9 companion — gating | web-app/Code.js | The catalog scan rides the SAME opt-in gate as the cycle-14 queue inventory (`scanCatalog`, default OFF): it opens the Intake spreadsheet, and `getAutomationHealthBadge` polls every 10 minutes PER MANAGER while `sendAutomationHealthDigest` runs daily — both call `computeAutomationHealth_` directly and must not pay for a diagnostic. `getDeployReadiness` already passes `{scanQueues:false}`, which now also suppresses the catalog read. Deliberately NOT wired into `automationProblems_`: that feeds the shell health dot and the daily failure email, and the field is null on both those paths anyway.

TEST RESULTS: passed.
- Pure harness: 399 → **403 passed, 0 failed** (4 new F9 pins).
- DOM harness: **69 passed, 0 failed** (unchanged).
- `node --check` on Code.js / Tests.js / DevTools.js: OK. `shoot.mjs` parse-validity is proven by its successful 29-scenario run.
- Visual matrix: **29/29 scenarios, 0 missing fixtures, 0 horizontal overflow** at every viewport.
- All four F9 pins BITE-CHECKED individually (engine revert, opt-in gate, validator row detection, client unreadable-state guard) — each fails when its fix is reverted.
- Test doubles scanned BEFORE editing: both intake catalog fixtures (`test/client/run.js` CAT, `Tests.js` `_INTAKE_TEST_CAT`) use well-formed capacities, so neither encoded the old NaN-permissive behaviour and neither needed updating. No existing assertion on `computeAutomationHealth_`'s return shape breaks on an additive key (verified by the green suite, and each existing assertion checks for the PRESENCE of a different key).

Regression Scenarios (Test Command is `manual`; the Apps Script suite is editor-only and cannot run in this container):
- **S59 Intake — PPD recommendation + send** — **NOT VERIFIABLE HERE** (needs the deployed app plus the Intake spreadsheet). The engine change is covered by two bite-checked pins that drive the REAL engine, and well-formed behaviour was verified byte-identical across seven cases (over/under a flat cap, inside/below a range, ordinary, and the documented "blank patient weight skips the filter entirely"). **Scenario text needs updating** — see DOCUMENTATION UPDATES.
- **S60 Intake — PMD/PAP account creation** — **NOT APPLICABLE**: the account forms do not run the recommendation engine.
- **S73 Phone-width layout** (added last session) — **now PARTLY MACHINE-CHECKED and PASSING**: `reference-light-mobile` and `intake-light-mobile` render with `overflowPx: 0`, which is exactly what S73's Expected clause asserts. The remaining half (that the reader/question text is actually readable rather than merely non-overflowing) still needs eyes.
- **S51 / S53 / S57 (Admin tab scenarios)** — **NOT APPLICABLE**: they cover the KPI strip, tag taxonomy and compliance panel; the new catalog card is a separate section of the Automation Health panel, which no scenario covers today.
- **S1 / S2 smoke + full Apps Script suite** — **NOT VERIFIABLE HERE** (editor-only).

REGRESSION RISKS:
- **The overflow metric in `shoot.mjs` is a deliberate extension beyond "add scenarios", and I am flagging it rather than burying it.** Rationale: seven more PNGs that nobody can objectively judge is a weak instrument, and the project's own A2 gotcha already mandates this measurement. It is additive to `report.json` (new keys only) and changes no existing behaviour. Push back if you'd rather it were its own change.
- `computeAutomationHealth_` gained one additive key (`intakeCatalog`), null on every pre-existing caller path, so the badge, the daily digest and `getDeployReadiness` are byte-identical.
- **F9 changes engine BEHAVIOUR, and the direction is a real trade**: a catalog row whose capacity cannot be read now stops being recommended, where before it was recommended to everyone. That is the safe direction and matches the engine's existing K0821 posture, but the failure is quiet — which is exactly why the validator shipped in the same batch. **The mitigation is not automatic: it requires a manager to open Admin → Automation Health.** A stronger version would ride the failure digest; I did not do that because the field is gated off on the digest path by design.
- No well-formed catalog input changes behaviour — verified across seven cases, including the documented blank-patient-weight path.

INVARIANTS AT RISK: None violated.
- **INV-129** (a failed read must be surfaced, never rendered as a confident value) — reinforced: `getIntakeCatalogHealth_` carries `ok:false` so an unreachable Intake store cannot render as a clean catalog.
- **INV-112** (the PPD engine's contract, the A–F Offerings column order, and the Node-pinned drift guards) — the column contract is untouched; the engine's filter/substitution/justify logic is unchanged apart from the guarded weight comparison, and all pre-existing engine tests pass.
- **The "what does this count read on a healthy system" rule** (cycle-15, the CDR name-match lesson) — deliberately honoured: a well-formed catalog produces ZERO issues, so this card genuinely reaches green. Pinned by an explicit assertion.
- **INV-89 / the esc-before-innerHTML discipline** — every server-sourced string in the new card is `esc()`'d; pinned.

NET SCORE: 1 production fix − 0 new failure modes = **1**
Honest accounting, because the framing question ("would this have fired in production this month?") does not have a clean answer here:
- **F9 — the code was unambiguously wrong** (reproduced against the exact branch), but whether it has FIRED depends on whether the live Offerings sheet currently contains a malformed capacity cell, which I cannot see from here. Counted as a production fix because the fail-open path was live and reachable; **the operator check I flagged before starting is what would confirm it**.
- **The validator and the seven visual scenarios are CAPABILITIES, not fixes** — scored 0, following the cycle-14 convention where a diagnostic plus three capabilities netted 0.
- The fail-closed trade is not counted as a new failure mode because it ships with its own detector, but see REGRESSION RISKS for why that mitigation is weaker than automatic.

OPERATOR ACTIONS / DEPLOY:
- **Open the Offerings sheet and check column C (weight capacity) for blank or non-numeric cells.** This is the check that tells you whether F9 was live or latent. After deploying, Admin → Automation Health → "Intake Offerings catalog" answers it automatically. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: **New version** → Deploy. (`test/` is outside `web-app/` and is never pushed, so the harness changes ship nothing.)
Post-deploy: run `runAllTests()` from the editor.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- **NEW — found by Batch 4 on its first run, MEASURED not eyeballed:** the Training tab's summary heading is CLIPPED at 390px. `.tr-head-title` has `scrollWidth: 94px` inside `clientWidth: 18px` ("My Training" renders as "My Trai…"), and `.tr-head-sub` is 62px inside 18px ("1 of 2 complete" wraps to four one-word lines). The ring + title + two KPI tiles sit in a row that never stacks. This is a **new A2-family instance in a file the A2 tripwire does not flag** (it has no `:root[data-compact]` grid override, so it is outside that rule's derivation) — worth its own finding. Out of scope for both batches; NOT fixed.
- **F6, F7, F8, F10, F11 remain unimplemented** (Batches 2 and 3 from the prioritised list). F10 — 28 load-failure sites across six partials rendering into empty-state containers, with the A12 tripwire scanning 3 of 9 — is the largest remaining item and the cycle's structural theme.
- The Admin → Automation Health panel has **no visual scenario**, so the new catalog card is not shot. `test/visual/mock.js` stubs `getAutomationHealthBadge` but not `getAutomationHealth`. Adding it would need a fixture, unlike the seven scenarios in this batch.
- **Dark-mode coverage gap:** Reference, Training and Coaching have only `-light-` scenarios at any viewport. Dark-mode defects are a documented class here (cycle-12 V-2 was a dark-mode contrast bug on the live clock). Not addressed — Batch 4's stated scope was mobile/compact.
- Carried unchanged: `.kb-review-row` cramped at 390px; `test/visual/mock.js:161` paraphrasing server logic (INV-185 class); `.cycle/HISTORY.md` has no cycle-14 block; FO-6 remaining TimesheetArchive readers.

DOCUMENTATION UPDATES NEEDED:
- **CLAUDE.md Common Gotchas — a NEW entry for the F9 class**: an operator-maintained data source that a decision engine reads needs a shape check, and the fail direction on unreadable data must be chosen deliberately. The engine had two opposite behaviours for missing catalog data (K0821 absent → return nothing; capacity blank → recommend to everyone) and nobody had noticed the inconsistency.
- **CLAUDE.md Operator State Checklist — the `INTAKE_SS_ID` / Offerings entry**: it currently documents that columns E and F must carry real URLs but says nothing about column C. Add that a blank or non-numeric weight capacity now EXCLUDES the row, and that Admin → Automation Health reports it.
- **Regression Scenario S59** — add the malformed-capacity case and the expectation that such a row is excluded rather than universally recommended.
- **CLAUDE.md Test Command section** — the running pure-harness count 399 → 403, and the visual matrix 22 → 29 scenarios with the new `overflowPx` metric.
- **INV-112** — worth a clause noting the weight filter fails closed on unreadable capacity, since the invariant currently describes only the A–F column contract.
- **The Visual Audit Stage section** — it tells the auditor to read `report.json` for `missing` entries; it should now also say to read `overflowPx`, since that is the check its own prose demands.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
