---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- FIX | Intake emails (PPD / PMD / PAP) are always English whatever language the form was completed in — fired live (a PPD reached the Power dept in Spanish).
- FO-1 | Metrics trends (My Stats hero + KPI series, My Stats range, Team Metrics single-day + range) walk WORKDAYS, not calendar days; endpoint caches bumped v1→v2 (INV-85).
- FO-2 | Admin → QA scorecard criteria: a danger confirm before a criterion's TYPE changes under existing answers.
- FO-3 | QA Log: per-agent filter (refetch-free select over the loaded entries, Unattributed bucket).
- FO-4 | `archiveSheetRowsOlderThan_`: a spare-row guard so the final delete is never "all non-frozen rows" (the latent Sheets refusal logged in STATE).
- FO-5 | The three inline `\n`→`<br>` sites (external customer/provider message body ×2, form-submission table cell) route through `cnNlBr_`.
- NOT done | The dashboard-cache warm trigger stays gated on a week of startup-time numbers (no data yet — by design).
Files modified: web-app/intake/script_intake.html, web-app/Code.js, web-app/metrics/script_metrics.html, web-app/cn/script_callnotes.html, web-app/qa/script_qa.html, test/visual/mock.js, test/client/run.js, test/client/dom/runDom.js, CLAUDE.md, .cycle/STATE.md

CHANGES:
FIX | intake/script_intake.html | `intakeCollectPpd_` reads `INTAKE_PPD_Q.EN` + `INTAKE_PPD_NOTES.EN`; `intakeCollectAcct_` reads `intakeAcctBank_(form).EN` — labels are English, answers collected by qNum/index from the rendered form, `language` still records the completion language (Sent tab + amend replay). Zero server change (the builder renders `payload.rows` verbatim).
FO-1 | Code.js | `metricsWorkdayIsos_(from, to)` (pure, Mon–Fri, UTC-noon); `getMyMetrics` dates axis (trend + INV-124 series), `getMyMetricsRange` trend, `getTeamMetrics` single-day + range trends walk it; `metrics_my_v2`, `metrics_range_v2`, `team_metrics_v2`. metrics/script_metrics.html: headings say workdays. mock.js: `trend30`/`kpiSeries` skip weekends (INV-185).
FO-2 | cn/script_callnotes.html | `cnQaCritRetyped_(live, next)` (pure); `CN_STATE.qaCritLive` stashed at render + after save; the save handler wraps the RPC in `go()` and asks via `uiConfirm({tone:'danger'})` when a key's type changed.
FO-3 | qa/script_qa.html | `QA_STATE.log.agent`, `qaLogSetAgent_`, `qaLogAgentOptions_`, a named `<select>` in the tools row, `qaLogFiltered_` applies the agent filter before the search; a remembered agent no loaded entry carries is dropped on load; the empty-filter message is generic.
FO-4 | Code.js | after the archive flush and before the bottom-up deletes: `if (toDelete.length >= getMaxRows() − headerRows) insertRowAfter(getMaxRows())`.
FO-5 | Code.js | `cnNlBr_(esc_(message))` ×2, `cnNlBr_(esc_(formatFormFieldValue_(…)))` ×1 (the helper also folds CRLF).
Pins | run.js: INTK-EN, MW-1, QC-TYPE, ARCH-GUARD, NLBR-2, QA-28; the team-cache pin repointed to v2. runDom.js: INTK-EN-DOM; QA-LOG-DOM grew the agent filter.

TEST RESULTS: pure 768/0, DOM 108/0; 10 mutations / 10 bites (INTK-EN ×1, INTK-EN-DOM ×2, MW-1 ×2, ARCH-GUARD, NLBR-2, QC-TYPE ×2, QA-LOG-DOM ×1). Visual: metrics-light-wide / metrics-team-light-wide / metrics-light-mobile / qa-log-light-wide — 0 overflow, no missing fixtures, trend lines continuous, eyeballed. Regression Scenarios walked: S59 PASS (PPD preview/send — the Spanish toggle now yields an English body; the bodyHash guard is unaffected because preview and send both build from the same English rows), S60 PASS (PMD/PAP), S41/S42 PASS (My Stats / Team Metrics sparklines, headings), S103 PASS (Log + agent filter), S51 NOT APPLICABLE (Admin tag table unchanged; the criteria card's confirm is pinned by QC-TYPE). Editor suite unchanged at 308.
REGRESSION RISKS: (1) A preview taken BEFORE this deploys and sent AFTER is rejected by the bodyHash guard ("the form changed since you previewed it") — one page load wide, the INV-111 posture. (2) Up to `CDR_CACHE_TTL` (5 min) after deploy an old-shape cached metrics payload can still paint — the key bump only prevents it being served under the NEW key. (3) `mBestWorstDays_` and the sparkline x-scale index the array, so 22 points instead of 30 is fine; a range shorter than two workdays renders no sparkline (same as before with <2 points). (4) The archive guard calls `getMaxRows`/`insertRowAfter` only when the run covers every non-header row — both windows default 0, so nothing runs it in production today. (5) `cnNlBr_` folds `\r\n` where the three sites folded only `\n` — a pasted Windows body no longer carries a stray CR.
INVARIANTS AT RISK: INV-85 (bumped — honoured), INV-111 (preview→send hash; both halves build from the same rows), INV-112 (the CANONICAL-ENGLISH VALUE RULE is why only labels needed forcing), INV-124 (the per-day series' cohort guard is per date and unchanged), INV-129 (cache-only-clean-rounds unchanged), INV-185 (fixture mirrors the workday walk). None violated.
NET SCORE: 1 production fix (the Spanish email — fired live) + 1 latent fix (archive refusal) − 0 new failure modes = +1 (strict: the archive guard is unreachable while both windows are 0, so it counts as defensive); 3 capabilities (workday trends, type-change confirm, agent filter); 1 consistency (cnNlBr_).

OPERATOR ACTIONS / DEPLOY:
- None to set up. After the deploy, re-send yourself ONE PPD from the Spanish form and confirm the email is English — the body is built from the client's rows, so CI cannot make that check. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → New version → Deploy; `runAllTests()` after — still **308**.

FOLLOW-ON ITEMS:
- Dashboard-cache warm trigger: still gated on a week of "Startup time · 7d" data.
- The Sent-tab detail re-renders a Spanish-completed submission against the Spanish bank (the completion language) — correct for the agent who filled it; if a manager reviewing Sent submissions wants English there too, that is a one-line change to the detail renderer (not asked).
- The QA Log's agent filter is client-side over the capped payload (300); a server-side `agent` filter would be needed only if a reviewer's log ever exceeds the cap.

DOCUMENTATION UPDATES NEEDED:
- Done in this round: CLAUDE.md (new intake gotcha, the cnNlBr_ gotcha, cache-key names v2, the Manage Time entry's follow-on sentence, a 2026-09-04 late operator entry, the count chain), .cycle/STATE.md.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
