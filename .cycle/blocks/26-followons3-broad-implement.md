---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: the open follow-on items of Batches 9, 10 and Partial Days that needed no operator decision, as FQ1–FQ10 (none is a numbered scan finding)
  FQ1 — the manager card's idle line said "30+ min" whatever the server's threshold was (Batch 9)
  FQ2 — the diagnostics purge note named the shared cap when the activity log, which has its own, hit it (Batch 9)
  FQ3 — a Team window with no transfer rows still drew "Transfers 0" (Batch 10)
  FQ4 — My Stats called Friday's data "Yesterday" on a Monday (Batch 10)
  FQ5 — Refresh blanked Stats to a loader, so a refresh that failed replaced the last-good view with an error card (Batch 10)
  FQ6 — My Stats read its own call totals under a per-rep cache key (Batch 10)
  FQ7 — a rep whose outbound calls were logged under another spelling dropped out silently (Batch 10)
  FQ8 — the My Stats range view did not say which of its days were partial (Partial Days)
  FQ9 — Storage Health could not tell another department's marked agent from a colleague spelled differently, whose partial days were silently not applied (Partial Days)
  FQ10 — a call-data tab trimmed narrower than its stamp probe cost every reader its stamp (carried from the scan)
New capabilities (G/ST): None from the scan's expansion plan. FQ7 and FQ9 are new diagnostics.
Files modified: web-app/40_metrics.js, web-app/20_timeclock.js, web-app/10_core.js, web-app/00_config.js, web-app/tc/script_manager.html, web-app/metrics/script_metrics.html, web-app/cn/script_callnotes.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md, .cycle/config.md, docs/gotchas.md, docs/design-decisions.md, docs/modules.md, docs/operator-state.md, docs/operator-log.md, docs/test-harness-log.md
Estimate: L (~9 h), written to STATE.md's Estimates line before the first edit
Actual: ~6 h

CHANGES:
FQ1 | web-app/20_timeclock.js, web-app/tc/script_manager.html | `getManagerDashboard` ships `idleAlertMin`, and the line under Live Status names that number — or no number when the payload does not carry one.
FQ2 | web-app/10_core.js | The purge's audit note is built by `diagPurgeCapNote_` from each purge's own flag and cap ("ActivityLog:6000", "ViewUsage+ClientErrors:2000").
FQ3 | web-app/40_metrics.js, web-app/metrics/script_metrics.html | `teamTotals.hasTransferData` says whether any listed rep has a transfer row. With none, the rail draws no Transfers row beside "Calls —", and "Transfers — no transfer data for this day" when the calls are in.
FQ4 | web-app/metrics/script_metrics.html | `mDayLabel_`: "Today" and "Yesterday" only for those two days; any other day by weekday and date ("Fri Nov 13").
FQ5 | web-app/metrics/script_metrics.html | Both Stats loaders keep a same-key payload on screen behind the refreshing pill when Refresh is pressed; a failed refresh leaves it and says so.
FQ6 | web-app/40_metrics.js | `getMyMetrics` and `getMyMetricsRange` read the cohort's totals and take the caller's row, so the day is the window Team Metrics and the hourly read-ahead already keep. The range's per-day breakdown is still read for the one rep (a cohort's ninety days would not fit the cache).
FQ7 | web-app/40_metrics.js, web-app/metrics/script_metrics.html | The outbound reader remembers the in-window agent names that are not on the roster; Team Metrics pairs them with the roster reps who show no outbound call and warns managers ("likely outbound name mismatch — Tran, Jo → Jo Tran"). The rep view's `outboundMeta` is now built field by field, so the pairs cannot reach a rep.
FQ8 | web-app/40_metrics.js, web-app/metrics/script_metrics.html | The range payload carries the caller's own partial days; the view lists them in a "Partial days" row under Calls answered. A round read while the marks could not be is not cached.
FQ9 | web-app/10_core.js, web-app/cn/script_callnotes.html | The Storage Health probe pairs marked agents with roster names that have no mark; a pair is a warning naming both ("Tran, Jo (Partial Days) → Jo Tran (roster) — their partial days are not applied"). Names only. Unpaired off-roster agents stay a count.
FQ10 | web-app/40_metrics.js | The stamp probe asks each tab for the smaller of its probe width and the tab's last column. The Partial Days probe can only shrink — never past column C.
Pins | test/client/run.js, test/client/dom/runDom.js, test/visual/mock.js, test/visual/shoot.mjs | Nine pure pins, four DOM drives, one visual scenario. Fifteen older pins and one older DOM drive followed the new keys, call shapes and fields.

TEST RESULTS: passed. Pure 1747/1747, DOM 467/467; `lint-server`, `split-manifest --check`, `handbook-sync --check`, `counts.mjs --check` clean; `cycle-closeout --check` in step. Visual: Team (range and Today) and the new 7D range for a rep with partial days — no overflow, no narrow text, no console error; the range shot was opened and read.
  Bite-checks: 44 mutations, 44 bit (38 pure, 6 DOM).
  CI: run 1804 (1be26ab) is GREEN on the first push — both jobs (client-tests; visual-layout: the layout gate, the tour walk, axe and the contrast self-check).
  NOT verified here: nothing ran in a deployed Apps Script project. The editor suite was not run. FQ6's saving (the first Stats open served from the read-ahead) is the mechanism's, not measured. FQ7 and FQ9 depend on how the Outbound Calls and Partial Days tabs really spell agents, which is not known here.
  Regression scenarios whose Subsystem overlaps the modified files (Server; Client (Metrics views); Client (Time Clock views); the Admin System tab): S41, S42, S43, S110, S111, S146, S152, S166, S174, S180, S187, S188, S189 and the new S190 — NOT WALKED: each is a browser walk on a deployed instance (Test Command is `manual`). What stands in: the driven pins, the DOM drives and the Chromium shots.
REGRESSION RISKS: (1) FQ6 — the day's totals now come from the cohort's cached window. A rep whose roster name is not in the cohort list (a roster row with no email) would read no call data; the caller always has an email, so this should not occur. (2) FQ5 — Refresh no longer flashes a loader; the pill is the only sign the press registered. (3) FQ7 — the pairing can name a different person who shares two name tokens with a rep (two "Maria Garcia"s in different departments); it is a hint to check, capped at twelve, managers only. (4) FQ9 — this app's admins now see agent NAMES from the Partial Days tab when they pair with a roster name (never a date, a share or a reason). (5) FQ3 — a window whose reps genuinely have transfer rows of zero still reads "0"; only the absence of rows reads "—". (6) The Team and range cache keys moved to v6, so those two endpoints read cold once after the deploy. (7) FQ10 — a tab narrower than its probe now yields a stamp over the columns it has; if the missing column is one a reader needs, that reader still fails by its own header check.
INVARIANTS AT RISK: None broken. INV-124 is the one FQ7 touched: the manager payload's `outboundMeta` gained names, and the rep view was changed in the same edit so it cannot carry them — driven by a pin. INV-85 followed (two keys bumped). INV-185 followed (fixtures mirror the five new fields). INV-430 (Partial Days) holds — the stamp's Partial Days probe is still never wider than three columns, and FQ9 ships names only. New: INV-431.
NET SCORE: 3 production fixes − 0 new failure modes = 3 (4 defensive or structural, 2 new diagnostics, 1 capability follow-through). FQ3: YES — "Transfers 0" was on Team → Today every day. FQ4: YES — every Monday and every morning after a holiday. FQ5: YES — any failed Refresh. FQ1, FQ2, FQ6, FQ10: structural or latent (FQ1 is wrong only once the constant changes; FQ2 only when the activity purge hits its cap; FQ10 only if a tab is trimmed). FQ7, FQ9: new diagnostics. FQ8: completes Partial Days on the range view. No new failure mode found: FQ7's and FQ9's pairings are advisory and bounded, and the rep-view change removes a path rather than adding one.

OPERATOR ACTIONS / DEPLOY:
- No Script Property, tab or column to set | BLOCKS DEPLOY: N
- Tell managers: Team Metrics may now show "likely outbound name mismatch"; the fix is an Agent Alias Overrides row in the CDR Report | BLOCKS DEPLOY: N
- Tell admins: Manage → Admin → System may warn "marked agent not matched to the roster" once the Department Dashboard has marks; same fix | BLOCKS DEPLOY: N
Deploy: Team Tools — `cd web-app && clasp push -f`, then Deploy → Manage deployments → Edit → Version: New version (rides the owed Team Tools deploys). The handbook app is not touched.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- DEFERRED, needs your decision — a manager's view of partial-day marks (the handoff limits them to the rep).
- DEFERRED, needs your decision — whether an AMENDED intake send should count in the "Intake" count (it would need a marker on the note).
- DEFERRED by an earlier decision — the hourly read-ahead does not warm the outbound windows.
- DEFERRED, measure first — a server rate limit on activity-count rows; counts inflated inside blocks where the rep was present.
- DEFERRED, needs a design — confirming an inferred punch without changing its time.
- NOT INVESTIGATED in this pass (Batch 9) — a partly failed bulk approval shows a count, not each request's reason; Team Punches keeps today's earlier cached bars after a failed re-read.
- web-app/40_metrics.js — My Stats' range still reads its per-day breakdown and its transfers per rep (stamped, not shared); a totals-only variant for the range would let it share too.
- web-app/metrics/script_metrics.html — the Spanish inbox's Refresh was not checked for the FQ5 pattern.
- The scan's F36 items and Batches 11–14 stand as planned.

DOCUMENTATION UPDATES NEEDED:
- None outstanding — done in this batch: CLAUDE.md (clauses on g131, g33, g136; the decisions index; the counts block), docs/gotchas.md (three amendments), docs/design-decisions.md, docs/modules.md, docs/operator-state.md, docs/operator-log.md, docs/test-harness-log.md, .cycle/config.md (INV-431, S190).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
