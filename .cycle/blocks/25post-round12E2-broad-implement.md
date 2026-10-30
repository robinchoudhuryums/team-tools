---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: none (operator requests, not scan findings)
New capabilities (G/ST): 25post round 12 E2 (operator 2026-10-27/28), two passes —
  (a) a per-rep app-activity record (ActivityLog), Day Edit's activity strip and "Suggested from app activity" Clock In / Out, and punches saved from it marked "Inferred (app activity)" on the timesheet, Day Edit, the team calendar, the pay statement and beside the payroll export
  (b) a distance rule judged on the DRIVE (eligible when any offered route is within the limit), with a 24-hour route-lookup cap, a stated straight-line fallback, page-level reuse, the drive drawn on the map, and the count on Admin → System
Files modified: web-app/00_config.js, web-app/10_core.js, web-app/20_timeclock.js, web-app/70_kb.js, web-app/Tests.js, web-app/modals.html, web-app/styles.html, web-app/tc/script_manager.html, web-app/tc/script_timeoff.html, web-app/kb/script_kb.html, web-app/cn/script_callnotes.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md (running totals, store map, inventory), docs/modules.md, docs/operator-log.md, docs/operator-state.md, .cycle/STATE.md
Estimate: (a) M-L (~5 h) · (b) M (~2.5 h) — written before the first edit
Actual: ~5.5 h in all ((a) ~3 h · (b) ~2 h · docs, bite-checks, visual ~0.5 h)

CHANGES:
E2a | 00_config.js, 20_timeclock.js | ADP.INFERRED (column J) + ADP_INFERRED_MARK; ACTIVITY_LOG_* constants; recordPresence → activityLogAppend_ (best-effort, unlocked, [time, empId, ms]); activityDayView_ / activityLowerBound_ (pure); managerGetDayActivity (manager-gated; binary search on the Ms column, then only that slice's ids; rep timezone; noLog said)
E2a | 20_timeclock.js | managerSaveDay: slots.inferred (only an explicit true on a set slot) → adpSetInferred_ on update (sets or clears) and add (the appended row, inside the lock), audit text says so; recordPunchCore_ and writeAdjustPunchForEmployee_ clear the mark when they rewrite a time; buildTimesheetForEmployee_ and getTeamCalendar ship infClockIn / infClockOut (the shown, last row's mark)
E2a | 20_timeclock.js | generateExportSheet_ keeps the nine-column upload exactly; the inferred punches ride the return (inferredCount, inferred ≤ EXPORT_INFERRED_LIST_MAX) — the export link lists them, and the automated email names them (exportInferredLines_). A second tab was drafted and REMOVED: the file is the ADP upload
E2a | 10_core.js | purgeOldDiagnostics purges ActivityLog past ACTIVITY_LOG_DAYS (counted in its audit row)
E2a | modals.html, styles.html, tc/script_manager.html, tc/script_timeoff.html | Day Edit: #de-act panel (deActivityHtml_ pure; strip, ticks, aria-label, In / Out suggestions with Apply; Out only on a past day; none in range mode), per-open sequence guard, failure said and never blocks Save; Inferred tag per slot while it holds the applied / loaded value; save sends slots.inferred; .punch-inf-chip on the team calendar and pay statement; .exp-inferred list under the export link
E2b | 00_config.js, 70_kb.js | ROUTE_LOOKUP_CAP 8000, ROUTE_LOOKUP_PROP, OOP_DRIVE_MAX_LOOKUPS 3; oopRoutePick_ (shortest offered route, fastest = first, noRoute vs error), oopDrivingRoute_ (alternatives, driving; a throw keeps no message), routeLookupWindow_ (24 hourly buckets), routeLookupReserve_ (unlocked, via propSetBounded_; past the cap or an unreadable count refuses), routeLookupStatus_, oopDriveForCheck_ (hint reuse — believed only when not shorter than the straight line; reserve then look up; names cap / error / no road), oopMaxRadius_, oopPolylineOk_
E2b | 70_kb.js | checkOopEligibility(address, query, opts): drives only warehouses within the largest limit in a straight line, nearest first; whOut.driveMiles; loc.drive; returns `drive`. oopEligibilityCheck_ radius: a drive on file decides ("N mi drive from X (within M mi; the fastest route is F mi)."), no road is a no, a straight-line yes with no drive behind it says "Driving distance unavailable — straight line shown."; without drive data the old answers are byte-identical. oopEligibilityMap(address, opts) draws a checked route line it is given, never a lookup of its own; returns `route`
E2b | 10_core.js, cn/script_callnotes.html | getStorageHealth ships routeLookups; cnRouteLookupsVerdict_ / cnRouteLookupsHtml_ (ok / warn at 80% / fail at the cap / warn when unknown) on the Storage inventory and in the findings list
E2b | kb/script_kb.html | KB_OOP_DRIVE per address (only answered drives — g129), sent back as opts.drive; header "· N mi drive"; the cap / failure line above the verdicts; the map sends the shortest kept drive's line, keyed per route, and its key names the blue line

TEST RESULTS: pure 1428/1428, DOM 300/300, counts --check clean, lint:server clean, visual CI gate (24) PASS; new scenarios dayedit-activity-light-wide / -dark-mobile shot and read (0 overflow, no errors), reference-elig-cards / -map and admin-system re-shot clean.
Regression scenarios: Test Command is manual — the Time Clock and Reference scenarios touching Day Edit, the team calendar, the pay statement, the export and the eligibility check are owed on deploy (listed in STATE Pending); none walked here.
Existing pins changed on purpose: the email-allowance pin's getStorageHealth return regex (one more field); test sandboxes that load ADP / the cn health helpers / the adjust writers learned adpRowInferred_, ADP_INFERRED_MARK, EXPORT_INFERRED_LIST_MAX, routeLookupStatus_, cnRouteLookupsVerdict_ and an adpSetInferred_ recorder.
Bite-checks (all scoped with --fn), every one BITES:
  E2a: out-of-day minute counted · another rep counted · no manager gate · unmarking grows the grid · the first row's mark instead of the shown one · any truthy flag marks · an edited slot still tagged · Out suggested on the rep's today · a stale activity answer paints · no pay-statement chip
  E2b: fastest instead of shortest · no route read as an error · a 48-hour window · the cap ignored · an unknown count treated as room · a short hint believed · lookups past the cap · the drive ignored by the verdict · the fallback unsaid · no-road warehouses counted · the page drive not kept · a full cap reading fine
REGRESSION RISKS: (1) Timesheet column J — a sheet trimmed to nine columns grows one on the first inferred save (adpSetInferred_); anything that reads the Timesheet by getDataRange now sees ten columns on such rows (the export slices A..I; the archive copies full width, so the mark survives archiving). (2) The radius verdict's wording changes when a drive is available; the OOP send-time price verifier does not read eligibility, so nothing refuses on it. (3) Route-lookup counting is unlocked — two simultaneous checks can under-count by a lookup; the 2,000 margin absorbs it. (4) Google's quota is per the deploying account across ALL its scripts — another script of the deployer's that uses Directions shares it.
INVARIANTS AT RISK: INV-44/INV-109 untouched (no trigger added; the purge rides the existing DiagnosticsPurge job). INV-136 / gate tiers: one new manager endpoint (managerGetDayActivity) — gate test added, counts block 102. INV-187 (a degraded read is said): the route fallback and the activity failure both state themselves. INV-209 (the eligibility engine): the drive changes only the radius measurement; unknown still never lifts. g129: no failure cached (drives, activity, map).
NET SCORE: 0 production fixes − 0 new failure modes = 0 (two new capabilities)

OPERATOR ACTIONS / DEPLOY:
- Deploy a New version | BLOCKS DEPLOY: N
- Accept a Maps re-authorization if Apps Script asks | BLOCKS DEPLOY: N
- Do not type in Timesheet column J ("Source") by hand | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured (clasp push + Deploy → New version by hand)

FOLLOW-ON ITEMS:
- The rolling 24-hour count is the app's own; Google's quota is per deploying account across every script that account runs — if the deployer runs other Directions-heavy scripts, lower ROUTE_LOOKUP_CAP.
- Activity pings are gesture samples (one per window per 10 minutes), so "last activity" can trail the real last gesture by up to ten minutes; the card says so. A rep using two windows pings twice as often — harmless for first / last.
- reference-manual-diagram-light-mobile's pre-existing narrowText warning (not this round's).

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (modules.md, operator-log.md, operator-state.md + its CLAUDE.md inventory line and store map).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
