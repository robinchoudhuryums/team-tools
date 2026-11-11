---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (an operator round, not a scan batch)
New capabilities (G/ST): M1 (operator 2026-11-11) — adjusted metrics, the Team Tools side: each rep's outbound calls (placed, connected) and outbound talk from the CDR Report's Outbound Calls tab; an intake form timer (first input to send) riding the intake call note; an Adjusted panel with an info disclosure in My Stats (day and range) and Team Metrics, plus Outbound / Handled (adj.) / ATT excl. intake columns — beside the actual figures, never in place of them; % Answered never adjusted
Files modified: web-app/00_config.js, web-app/40_metrics.js, web-app/60_intake.js, web-app/intake/script_intake.html, web-app/metrics/script_metrics.html, test/visual/mock.js, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, docs/design-decisions.md, docs/modules.md, docs/operator-state.md, .cycle/config.md, .cycle/STATE.md, CLAUDE.md
Estimate: M–L (~6 h) — written to STATE.md's Estimates line before the first edit
Actual: ~5 h

CHANGES:
M1 config | web-app/00_config.js | CONFIG.CDR_OUTBOUND_TAB 'Outbound Calls'; METRICS_INTAKE_TIMED_MIN_SEC 30 / _MAX_SEC 7200 (a form time no call takes is not counted as timed).
M1 reader | web-app/40_metrics.js | `cdrOutboundColumns_` (by header: Call Date / Agent Name / Connected / Talk Sec, missing named); `cdrOutboundAggregate_` (dates inside the window, agents through the alias overrides and on the roster, Connected TRUE as a boolean or text, talk seconds); `getCdrOutboundPerRep_` (date-column span read, `through` = the tab's newest day, `{error, steady}` — a missing tab or column is steady, a failed read is not; cached CDR_CACHE_TTL only on a clean round with the aliases read; bypassed under the CDR test override).
M1 rule | web-app/40_metrics.js | `metricsAdjusted_` (handled = answered + connected outbound; talk incl. outbound; ATT without the timed intake calls only while a call is left and the form time is under the talk; null with nothing to adjust; no % Answered); `metricsOutboundOf_` (zeros for a read tab, null for an unread one).
M1 endpoints | web-app/40_metrics.js | getMyMetrics / getMyMetricsRange / getTeamMetrics carry outbound, outboundThrough, outboundUnavailable, intakeTimed, adjusted (an unread inbound day has no adjusted); keys v4; a non-steady outbound failure is never cached; the team lists an outbound-only rep, sums the outbound, adds teamTotals.adjusted (no intake part when a rep Sheet was unreadable) and outboundMeta, which the rep view carries (no names).
M1 intake | web-app/60_intake.js, web-app/intake/script_intake.html | cnCountIntakeNotesResult_ returns timed + seconds; INTAKE_TIMER starts on a form's first input or button press, is taken at a successful send before the clear, and rides the intake note as the whitelisted completionSeconds (none when untimed); a cleared form restarts it.
M1 client | web-app/metrics/script_metrics.html | `mOutboundRowHtml_` (drawn when the rep placed a call or the tab was not read — named; "data through" when the export lags); `mAdjustedHtml_` (each line only when it adds something; the info button a real disclosure that says what is and is never adjusted); the no-call-data card keeps an outbound-only day's work below it (never beside a failed inbound read); `mTeamAdjColumns_` (each column only when it has something to say; an unread figure "—"); sort keys; Copy table columns, an unread figure blank.
M1 tests/docs | test/*, docs/*, .cycle/config.md, CLAUDE.md | Seven pure pins (columns, aggregate, the reader over a real-shaped tab, the rule, intake timed bounds, the endpoints incl. a driven range, the client) and three DOM drives (intake timer, My Stats panel + disclosure + outbound-only day, Team Metrics columns + export); the earlier pins' doubles updated (v4 keys, the cache guards, the rep-view whitelist, the MET-1 range context, the F14 fixture shape, the TSV header); fixtures for all three endpoints; INV-415, S174, the decision `#m1-adjusted-metrics`, the module note, the operator entry + inventory link, the storage map line.

TEST RESULTS: pure 1624/1624, DOM 409/409, `lint:server` clean, `handbook-sync --check` clean, `counts.mjs --check` clean, split-manifest current. Visual: metrics (light/dark wide, light mobile), metrics-team (7d light/dark wide, today, light mobile) — 0 overflow, 0 runaway, no narrow text; the Adjusted panel and the team columns read on camera. Bite-checks: 27 of 27 mutations bite (21 pure, 6 DOM). Regression: the Metrics scenarios (MET-1..4, MW-1, H2, the rep-view whitelist, the team cache pins, the Stats DOM drives, the metrics visual scenarios) — PASS; S174 new — operator walk owed.
REGRESSION RISKS: Every Stats open now also reads the Outbound Calls tab (date column + the window's four columns; cached five minutes). The v4 cache keys make the first open after the deploy a cold read. A rep with outbound calls and no inbound ones now appears in the Team Metrics table (a row of zeros plus their outbound). The TSV gains columns when outbound is read, so a spreadsheet that pastes into fixed columns shifts.
INVARIANTS AT RISK: None — INV-415 added; INV-85 (cache keys versioned with the shape) kept by the v4 bump; INV-124 (no peer's numbers in the rep view) kept — the rep view gains only outboundMeta, the tab's state.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (M1 is a new capability)

OPERATOR ACTIONS / DEPLOY:
- Team Tools `clasp push -f` + New version (rides with AC1) | BLOCKS DEPLOY: N
- The CDR Report's Outbound Calls tab must be exported by call-data-reporting (its exportOutboundCalls) — until then Stats says "Outbound calls — not read" | BLOCKS DEPLOY: N
- Tell the team what Adjusted means | BLOCKS DEPLOY: N
- Walk S174 on DEV | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` (then New version)

FOLLOW-ON ITEMS:
- The Outbound Calls tab is not in the PF1 data stamp's probes, so its reader keeps the five-minute cache.
- A reload or a restored draft restarts the intake timer from the next input.
- M2 (exact per-call intake matching) belongs to call-data-reporting.

DOCUMENTATION UPDATES NEEDED:
- None (done in this batch)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
