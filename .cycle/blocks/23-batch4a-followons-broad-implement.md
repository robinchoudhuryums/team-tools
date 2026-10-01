---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented (the three Batch 4a FOLLOW-ON items, cycle 23):
- 4a-FU1 — a stale digest heartbeat said "the trigger may be disabled" even when its job had just RUN and stamped a failure (the urgent digest, the health digest and — since CORE-01 — the brief all withhold their heartbeat on a failure), so the Admin finding told the operator to reinstall a working trigger (g142)
- 4a-FU2 — every retention purge (the shared `purgeSheetRowsOlderThan_` — CN live, CN cold, forms, and since QA-3 the QA reviews) deleted one row per call while holding the global ScriptLock, so a first backlog of a few thousand rows held it for minutes
- 4a-FU3 — a stamped failure under a key with no AUTOMATION_JOB_CHECKS row (the three keys Batch 4a added, plus the existing untabled ones) reached the digest, the dot and the System tab as a raw key ("ManagerDailyBrief failed on its last run")

Files modified: web-app/00_config.js, web-app/10_core.js, web-app/cn/script_callnotes.html, test/client/run.js, test/client/server-split-manifest.json, CLAUDE.md (generated running-totals row only), .cycle/STATE.md
Estimate: S (~3 h) — the three follow-ons
Actual: ~1.5 h

CHANGES:
4a-FU1 | 00_config.js, 10_core.js, cn/script_callnotes.html | New `DIGEST_ERROR_KEYS` (heartbeat key → the AUTOMATION_LAST_ERRORS key its job stamps). `computeAutomationHealth_` ships `errorKey` and `failedAt` per digest — `failedAt` is the stamp time only when the stamp lies inside that digest's stale window (new pure `automationFailedWithin_`; an older failure says nothing about why the heartbeat is stale NOW, so the trigger stays the suspect). `automationProblems_`, the System-tab finding (`cnHealthFindings_`) and the Automation detail row now say "it ran and FAILED at … — not a missing trigger / fix the failure, its trigger is running" in that case. Deviation from the follow-on as listed: it named only the urgent digest's withheld heartbeat; the defect is the stale LINE, shared by every job that withholds its heartbeat on a failure (including CORE-01's brief, where withholding is load-bearing for suppression), so it was fixed at the line rather than by stamping the urgent heartbeat on failure (FU-B6a's pinned choice stands).
4a-FU2 | 10_core.js | `purgeSheetRowsOlderThan_` deletes `contiguousRowRunsDesc_(toDelete)` runs with one `deleteRows` each, descending (the diagnostics purge's existing helper); C5's spare-row guard unchanged.
4a-FU3 | 00_config.js, 10_core.js, cn/script_callnotes.html | New `AUTOMATION_ERROR_LABELS` and `automationErrorsLabelled_` — each stamp ships `label` (the job table's for a tabled key, the map's otherwise, the key last); the problem line reads "The <label> (<key>) job FAILED …" and the System finding "<label> failed on its last run". One map on the server; the client keeps no copy.

TEST RESULTS: passed — pure 1133/1133 (was 1130; +3 new pins: 4a-FU1 driven over the window rule, the problem line, the System finding, the detail row and the shipping; 4a-FU3 driven over the labeller and both readers plus a DERIVED net — every key the server stamps is tabled or labelled, and every DIGEST_ERROR_KEYS entry names a real heartbeat and a real stamp; 4a-FU2 driven, two runs → two descending calls. Three older doubles changed with the behaviour: C5's and QA-3's fake sheets gained `deleteRows` with the same Sheets refusal and load `contiguousRowRunsDesc_`; QA-18's "bottom-up" assertion now pins the descending-run delete), DOM 184/184, counts --check agrees, lint:server clean, node --check clean. 8 bite-checks, all BITE (FU1 ×4, FU3 ×3 incl. dropping one label from the map, FU2 ×1).
Test Command is `manual`. Overlapping Regression Scenarios — S117 (automation health, the System tab under a red dot), S55 (urgent digest), S106 (diagnostics retention), the CN/forms/QA purges (S100's retention step) — NOT WALKED: they need the deployed app with a failing job or an enabled purge. Driven by the pins above.
REGRESSION RISKS:
- FU1: a job that failed inside its window AND whose trigger then died reads "not a missing trigger" until the window passes; after it, the trigger is the suspect again. Acceptable: the failure stamp is shown either way.
- FU2: `deleteRows(start, n)` on a contiguous run is one call; a run that spans the whole grid is still guarded by the spare row. Sheets' per-call refusal is the same rule as before.
- FU3: the problem-line text changed shape for untabled keys ("The <label> (<key>) job FAILED"); the one pin that matched the old shape (F-20's DailyExportCheck line) still matches, because the key stays in the text.
INVARIANTS AT RISK: None found broken. Checked: g142 (each stale line now names the right cause), INV-187 (an old failure is not offered as a cause; unknown stays unknown), INV-179 (the digest set is still derived from DIGEST_STALE_HOURS — the new map is checked AGAINST it), INV-153 (lock starvation: the purge is now run-wise), C5/g145 (spare row unchanged), A2/g151 (one problem list, three readers, unchanged).
NET SCORE: 0 − 0 = 0. All three are defensive: FU1 needs a failed job (none observed), FU2 needs an enabled purge with a large backlog (all purges default off), FU3 is wording on a failure surface. No new failure mode identified.

OPERATOR ACTIONS / DEPLOY:
- None. After the deploy, a stale digest line that used to say "the trigger may be disabled" may now say "it ran and failed at … — not a missing trigger"; fix the named failure, do not reinstall triggers for it | BLOCKS DEPLOY: N
Deploy: Server + Client (Call Notes / Admin views): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The archive movers (`archiveSheetRowsOlderThan_`, the CN cold archive) were not in this scope; check whether they still delete per row under the lock.
- The mock's automation-health fixture carries no `failedAt` / `label`, so no visual scenario shows either state.

DOCUMENTATION UPDATES NEEDED:
- Folded into the /sync-docs pass that follows (Batch 4a + these follow-ons together).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
