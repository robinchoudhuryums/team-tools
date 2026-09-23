---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- F1 (Batch 1 follow-on) — the editor suite's live-tab deletes hold the ScriptLock from the snapshot to the last delete
- F2 (S2 follow-on) — "Copy table" neutralises formula-shaped cells: a client twin of sheetSafe_ on every TSV line
- F3 (S2 follow-on) — a read-only admin scan for formulas stored before S2 shipped (Admin → System → Stored formulas)
- F4 (Batch 2 follow-on) — the Spanish auto-assign claim batch grows the grid before its positional write; a derived net for the whole class
- F5 (Batch 2 follow-on) — Day Edit shows a stray (non-trailing, unpaired) break stamp as a flagged half row and refuses to save until it is resolved, instead of deleting it unseen

Files modified:
- web-app/Tests.js (_deleteRowsWhereLocked_ + every live-tab sweep routed through it; omnibus admin-gate entry for adminScanStoredFormulas; new test_managerSaveDay_strayBreakRefused)
- web-app/10_core.js (formulaScanCol_, formulaHitsFromGrid_, scanStoredFormulas_, adminScanStoredFormulas; appendRowsSafe_)
- web-app/20_timeclock.js (breakStrays_; the day shape ships strayBreaks)
- web-app/51_spanish.js (auto-assign writes through appendRowsSafe_)
- web-app/script_core.html (tsvCell_, tsvRow_)
- web-app/metrics/script_metrics.html (mTeamTableTsv_ builds every line through tsvRow_)
- web-app/cn/script_callnotes.html (cnRenderFormulaScanPanel_, cnRunFormulaScan_, the System pane mounts the panel idle)
- web-app/tc/script_manager.html (deReadBreaks_ keeps the stray flag; deRenderBreaks_ flags + hints; deSetBreaksFromDay_ renders strays before the open break; deStrayUnresolved_ + the save guard)
- test/client/run.js, test/client/dom/runDom.js, test/visual/mock.js, test/client/server-split-manifest.json
- .cycle/config.md (INV-136 names adminScanStoredFormulas)
- CLAUDE.md (running totals: pure 945 → 955, DOM 146 → 147, editor 338 → 339, admin-tier 51 → 52)
- .cycle/STATE.md, .cycle/blocks/22-FO-broad-implement.md
Estimate: M (~7 h) — F1 cleanup lock S 1h · F2 TSV twin S 1h · F3 stored-formula scan M 2h · F4 Spanish grid + grow-first net S 1h · F5 Day Edit stray leaves M 2h
Actual: ~3.5 h (F1 widened from the four named helpers to every live-tab positional delete in the suite, nine sites, because the ratchet pin found them; F3 stayed an on-demand panel rather than a findings-list entry)

CHANGES:
F1 | Tests.js, run.js | `_deleteRowsWhereLocked_(sheet, firstDataRow, pred, max)` takes the ScriptLock, snapshots, deletes bottom-up, flushes, releases in `finally`. `_cleanupRowsByPrefix`, `_clearRowsByEmp`, `_clearPunchesForDay`, `_deleteFormWitnessAuditRow_`, cleanupTestData's AuditLog / FormTokens / FormSubmissions sweeps, the four accrual tests' Timesheet month-row deletes and the DeptRequests test's `finally` now go through it. Before, a production delete that landed mid-sweep (a rep's self-undo, a manager's Day Edit) moved every row below it up by one, so the sweep deleted a REAL row (g132's positional hazard). Tests.js takes no other lock, so re-entrancy is not a concern. Pinned driven (lock → read → deletes → flush → release; the cap; release on a throw; no lock for a missing tab) plus a ratchet: any other `deleteRow` in Tests.js must be in a named function over a TEST-only fixture store, and the helper is the suite's only `getScriptLock`.
F2 | script_core.html, metrics/script_metrics.html, run.js | `tsvCell_` mirrors the server's `sheetSafe_` (apostrophe before `=`, and before `+`/`-`/`@` when the rest is not a number) and turns a tab or line break inside a value into a space; `tsvRow_` joins through it. `mTeamTableTsv_` (the only TSV builder) uses it for every line, so a formula-shaped rep or queue name pastes into the manager's own sheet as text. Pinned: the builder with a hostile name and an embedded tab, the mirror driven over one grid against `sheetSafe_` (g120), and a scan that no client partial hand-joins a TSV line.
F3 | 10_core.js, cn/script_callnotes.html, Tests.js, run.js, config.md | `adminScanStoredFormulas` (ADMIN-tier) walks every store the app writes through the writers' OWN resolvers (ADP, Forms, Dept Requests, Intake, KB, HR, QA) plus every enrolled rep Sheet, and returns each formula cell by store, tab and A1 (Z-and-past columns) with a 60-char excerpt, capped at 200 with the true total. It is READ-ONLY. A store shared by fallback is scanned once. A store that cannot open is named with its error, every store past the 240 s budget is named as unscanned, and an operator-maintained tab's hit is labelled "may be yours on purpose". The CDR Report is not scanned (another repo owns it). Admin → System gains an on-demand "Stored formulas" panel, mounted IDLE (the scan never runs on enter). It says "No stored formulas" ONLY when no store failed and none went unscanned (g53). Pinned: driven grid/walk/panel states, derived coverage (every `get*SS_` resolver except `getCdrSS_` is a target), read-only, admin gate; the omnibus editor gate test covers it.
F4 | 10_core.js, 51_spanish.js, run.js | `appendRowsSafe_(sheet, rows)` is the multi-row appendRow: it grows the grid and then does ONE sheet-safe positional write. `spanishAutoAssignCore_` wrote its claim batch at `getLastRow() + 1` directly, which throws once SpanishClaims outgrows its 1000-row default. That breaks every auto-assign run, button and hourly trigger alike. Pinned driven against a full grid that throws past its edge, plus a derived net: every server function that writes at `getLastRow() + 1` must call `insertRowsAfter(` before its `setValues(` (it finds appendRowsSafe_, appendRowsTextSafe_ and the archive mover today). C-N4's "one batched write" assertion was updated to the helper.
F5 | 20_timeclock.js, tc/script_manager.html, Tests.js, run.js, runDom.js, mock.js | `breakStrays_(lunchOut, lunchIn, clockInMins)` returns every leave or return that neither pairs (breakPairs_) nor is the open leave (breakOpenLeave_). It consumes by value, once each, so a double punch leaves its copy behind. The day shape ships this as `strayBreaks: { outs, ins }`. Day Edit renders each stray as a half row flagged "unmatched punch in the sheet" BEFORE the open break, so it can never be the trailing half the server accepts as open. The flag rides `deReadBreaks_`, so it survives add/remove re-renders. `deStrayUnresolved_` refuses the save by name before any RPC, and the server refuses the same list on its own: a mid-list half row, a stray return, or an overlap. Completing the row makes a pair; removing it is a deliberate deletion. Before this, the prefill never showed a stray and any save of that day deleted it. Pinned: Node (three damage shapes, three legitimate shapes incl. overnight, the client rule plus the guard plus the parser over three cases, the wiring), DOM (the real prefill order, the flag surviving a re-render, a refused save with no RPC, then a removal that saves) and the editor (the real read ships the stray, and the real save refuses the list Day Edit builds, with both leaves still in the sheet).

TEST RESULTS: pure 955/955 (+10 new pins, 2 updated), DOM 147/147 (+1), `lint:server` clean, `counts --check` clean, split manifest regenerated (1329 declarations). 20 bite-checks, 20 BITE (F1 ×3, F2 ×3, F3 ×5, F4 ×2, F5 ×5 incl. 2 DOM, + the two retries after a quoting refusal). Visual matrix re-shot: 114 scenarios, 0 px overflow. The only missing fixtures are the same 16 Admin ones (X1, Batch 5), so the new Stored formulas panel is NOT visually verified. Editor suite NOT run: one new test (`managerSaveDay_strayBreakRefused`, registrations now 339), one new omnibus gate entry, and nine cleanup sites now under a lock.
Regression scenarios (Test Command `manual`) overlapping this batch: S7 (Day Edit), the Metrics team-table copy, the Spanish auto-assign scenario S105, and the Admin System panels. All are NOT APPLICABLE here because they need the editor or the live app. The walk is under OPERATOR ACTIONS.

REGRESSION RISKS:
- F1: a cleanup sweep now WAITS up to 30 s for the ScriptLock, so a full editor run during a busy shift is slower, and throws on timeout where it used to race. The cleanupTestData sweeps sit inside try/catch; `_clearTestState`'s do not (a lock timeout fails that test loudly).
- F2: a pasted cell starting `-` or `+` before a word now arrives with the apostrophe marker, which Sheets hides. A rep name like "-" alone pastes as text rather than a formula error.
- F3: a scan over a large roster can hit the 240 s budget. The rest is then NAMED as unscanned and a re-run is needed; it does not resume where it stopped.
- F4: none. The write is identical, with the grid grown first.
- F5: a day carrying damage that Day Edit used to save through silently now refuses until the manager resolves the stray. That is the intended trade, but a manager meets a new refusal on a day that "used to save". The rep-facing timesheet and hours are unchanged (strays were never paid or deducted).

INVARIANTS AT RISK: None broken. g17 (lock): F1 adds the suite to the lock discipline; F4's write stays inside the auto-assign lock. g132 (positional delete on a live tab): F1 closes the remaining in-suite instances. g120 (mirror whose drift blocks): F2's mirror is driven against sheetSafe_. g53 / g48 (an absence that reassures): F3's empty list is a clean bill only with no failure and nothing unscanned. g15 (Day Edit reconciles): F5 makes the input lossless; the plan is unchanged. INV-136: the admin set grows by one and names it.

NET SCORE: 1 production fix − 0 new failure modes = +1. F4 fires in production the day SpanishClaims passes 1000 rows. Auto-assign runs hourly when enabled, so that is plausible within months, and it is scored as the production fix. F5 fires only on damaged data (a hand-edited or double-punched day), but when it fires it deletes a payroll stamp: a real but conditional fix, scored conservatively as 0. F1 is test-infra on the live stores (owner-only since S1); F2 and F3 are hardening and a diagnostic.

OPERATOR ACTIONS / DEPLOY:
- Deploy (rides with Batch 1, S2 and Batch 2) | BLOCKS DEPLOY: N
- Post-deploy walk: (1) Manage → Admin → System → Stored formulas → Scan stores. The panel lists every formula cell by store/tab/cell, names any store it could not open, and reads "No stored formulas" only on a fully clean run. Fix each non-operator hit by hand: open the cell and prefix an apostrophe. (2) Metrics → Team Metrics → Copy table → paste into a scratch Sheet: every row lands in its columns, and no cell is a formula. (3) Day Edit on a day with a hand-added extra LunchOut inside a finished break: the row shows with the "unmatched punch" note; Save refuses by name; removing the row saves. (4) Editor `runAllTestsPartA`/`PartB` on the DEV instance (or smoke on prod) → Failed: 0, including `managerSaveDay_strayBreakRefused` and the omnibus admin gate | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- F3 is on-demand only: the System findings list does not include a stored-formula count, and the scan does not resume after the budget. A findings entry would need a cached last-scan result.
- The 16 missing Admin visual fixtures (X1, Batch 5) now also hide the Stored formulas panel. Add `adminScanStoredFormulas` to the mock when X1 lands.
- The sheet doctor does not report strays by the same rule (`breakStrays_`). It has its own legit-breaks check; sharing the one rule would make the two agree by construction.
- Not implemented from the earlier follow-on lists (decisions, not defects): assertNotProdInstance_ unset = permit (tied to standing up DEV); the manager brief does not separate "resume waiting for a finish" (the Manage card and the rep chip already say it).

DOCUMENTATION UPDATES NEEDED:
- docs/gotchas.md + index: the grow-the-grid rule now cites appendRowsSafe_ and the F4 derived net; g132 amended (the suite's live-tab deletes go through the locked helper); g15 amended (strays are shown, and the save refuses them); the S2 coercion gotcha notes the client twin (tsvCell_) and the stored-formula scan.
- docs/modules.md / operator-state.md: the Admin → System "Stored formulas" panel; the optional clean-up is now one click.
- .cycle/config.md: invariants for the locked suite deletes, the TSV mirror, the grow-first positional append, and the stray-break round trip; walk steps on S7 and the Metrics copy.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
