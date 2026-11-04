---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (operator round 2026-11-02, not audit findings — Batch E of the plan agreed in chat: fold the Metrics module away; operator: Dept Requests under Call Notes)
New capabilities (G/ST): Batch E — Metrics folded into the Dashboard and Call Notes:
  - E1 the Metrics tool is gone: the Dashboard tool's tabs are Dashboard · Stats · Time / PTO · Spanish Inbox; Call Notes gains Dept Requests (between Sent Forms and Team Notes); every tab KEY unchanged (metricsMyStats, metricsTeam, metricsSpanish, metricsDeptReq), so deep links, email links, umsLastView, view-usage rows and every `currentView ===` guard keep working
  - E2 one Stats tab: My Stats and Team Metrics behind a Me / Team switch (`mStatsSwitchHtml_`, shown in the pop-out too); the Team half stays a real view — a `hidden` tab with `lights: 'metricsMyStats'` — so its guards, cache and restore are unchanged and it lights the Stats button; reps still see the team aggregate only (INV-124)
  - E3 a tool is resolved by its TAB (`resolveToolTab_` in `enterTool`; `RETIRED_TOOLS` lands a bare `metrics` on Stats), so an older server's Needs-you route, a saved link, a pop-out opened before the deploy or a fixture still lands
  - E4 everything that named the tool follows: the Needs-you routes (server), the Dashboard card links, the answer-rate badge (onto the tool that holds Team Metrics, looked up, on EVERY nav form — the `||` lookup had shown it on the hidden sidebar link only on a phone, g99), the Spanish assignee badge's fallback, the onboarding tour's sidebar text, the operator-state navigation paths, the module map
Files modified: web-app/script_core.html, web-app/metrics/script_metrics.html, web-app/tc/script_clock.html, web-app/20_timeclock.js, web-app/script_tour.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/shoot.mjs, test/visual/mock.js, test/visual/a11y-names.mjs, docs/design-decisions.md, docs/modules.md, docs/operator-log.md, docs/operator-state.md, docs/test-harness-log.md, .cycle/config.md (INV-393, S152), CLAUDE.md (the module map's rows — one line fewer — and the counts), .cycle/STATE.md
Estimate: M–L (~6 h) — written to STATE.md before the first edit
Actual: M (~3 h)

CHANGES:
E1 | web-app/script_core.html | TOOLS: `metrics` removed; its four tabs moved (three to `timeClock`, `metricsDeptReq` to `callNotes`)
E2 | web-app/script_core.html, metrics/script_metrics.html | the `hidden` / `lights` tab flags (renderToolTabBar skips a hidden tab; showView lights its host); `mStatsSwitchHtml_` in both Stats views; `.m-stats-switch`
E3 | web-app/script_core.html | `RETIRED_TOOLS`, `resolveToolTab_`, enterTool resolves first
E4 | web-app/20_timeclock.js, tc/script_clock.html, metrics/script_metrics.html, script_tour.html | the two Needs-you routes; three Dashboard card links; `mAlertBadgeLinks_` (the answer-rate badge on every nav form of the tool holding metricsTeam) + `mClearBadge_`; the Spanish badge fallback; the tour line

TEST RESULTS: Test Command is `manual`. Regression Scenarios that open a Metrics tab (the Spanish, Dept Requests, My Stats / Team Metrics and Dashboard-card scenarios) were walked by reading against the change: each opens the same view by the same tab key, now inside the Dashboard or Call Notes tool — their steps' "Metrics →" navigation reads as the new place; S152 is new and NOT RUN in the deployed app.
  Pure 1502/1502 (two new pins — the registry with the resolver driven, and a DERIVED route/link check; F8, the click-through pin, the module-map floor and the C-8 route pin moved). DOM 364/364 (one new drive; every drive that opened `metrics` now opens the tool that holds the tab, and METUI-1 reads the badge on the Dashboard tool). Visual: the 24 metrics / spanish / deptreq / dash scenarios measure clean (0 overflow, 0 missing, 0 errors); the shots read (Stats lit on the Team view with the switch pressed; no Metrics item; Dept Requests under Notes with Notes highlighted). lint-server clean; counts in step; the manifest revision recorded; handbook-sync in step.
REGRESSION RISKS: (a) A rep who knew Metrics finds Stats under Dashboard and Dept Requests under Call Notes — the operator log says where. (b) Dept Requests now starts the Call Notes ambient poller (the shell starts it on any Call Notes tab) — the stale-flag badge refreshes there too; harmless. (c) The Call Notes pop-out's tab bar gains Dept Requests. (d) A pinned pop-out geometry saved per tool for `metrics` is simply unused.
INVARIANTS AT RISK: None. INV-393 (new) covers the resolution and the hidden tab; INV-124 (the team aggregate for reps — the Team view and its server path unchanged); g99 (the answer-rate badge now on every nav form); g69/INV-78 (deep links by tab key, unchanged); the F8 tab gate (`tabVisibleForUser_` unchanged; the Spanish tab keeps `managerOnly` + `also`).
NET SCORE: 0 production fixes − 0 new failure modes = 0 (new capability; the answer-rate badge missing on a phone was a latent g99 defect fixed because its selector had to change anyway, not counted)

OPERATOR ACTIONS / DEPLOY:
- Team Tools: `clasp push -f` from `web-app/` + New version | BLOCKS DEPLOY: N
Deploy: Team Tools — `clasp push -f` + New version; handbook app — N/A (unchanged)

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The partial files still live under web-app/metrics/ (script_metrics.html, script_deptrequests.html) and the subsystem is still called "Client (Metrics views)" in .cycle/config.md — a rename is churn with no behaviour; left as is.
- The rest of the plan: D, G, F, H (STATE.md Pending).

DOCUMENTATION UPDATES NEEDED:
- None beyond those made.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
