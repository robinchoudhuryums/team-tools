# Cycle 20 — the 2026-09-17 /broad-scan IMPLEMENTATION BATCH PLAN (verbatim from the scan)

53 findings, none Critical. Every finding appears exactly once. Batch 1 is DONE
(`.cycle/blocks/20-batch1-broad-implement.md`). The full finding text (where,
evidence, pin status) is in the scan's chat output; the one-line fix per item is
what a fresh session needs to start a batch.

Batch 1 — DONE 2026-09-17 | est. 7.5h, actual ~1.5h
  F-01 High | oopVerifyQuotes_ keyed column A → key on oopNameCol_; OOP-B pin gets the real-shape grid
  F-03 High | calcHours_ `<=` wrap paid 24h for an equal-minute pair → strict `<`; managerClockOrderError_ in both writers; doctor compares in minutes
  F-02 High | sched + scratchpad close hooks never removed the overlay → overlay.remove(); DOM close-path pin
  F-04 Medium | checkOopEligibility scored column A → shared oopMatchScore_; diagnostics name the item
  F-05 Medium | Day Edit Save enabled during pending prefill → disabled until the load lands
  F-44 Low | intakePpdControlHtml_ default branch: undefined `text` → ariaLabel

Batch 2 — Honest failure on the client | est. 7h
  F-06 Medium | cn/script_callnotes.html:2652 cnFetchDeptConfigIfNeeded_ caches an EMPTY config on failure for the session → do not cache the stub; handle {error}; refetch on next open | S 1h
  F-13 Medium | tc/script_clock.html:709-743,970-1005 dashboard carousels render a cold-miss RPC failure/{error} as "No call data for this period." → route through errorStateHtml_ | S 1h
  F-18 Medium | intake/script_intake.html:2726 Sent detail renders an untouched PMD/PAP toggle ('') as "No" → N/A, as the PPD branch does | S 0.5h
  F-15 Medium | 70_kb.js:2725-2748,1313,2815 kbGeocodeOne_ collapses quota/REQUEST_DENIED/throws to null → "try a ZIP" → return {error:status}; callers name a service failure; cap kbMapDistances | S 2h
  F-47 Low | 20_timeclock.js:7133-7147 pending tasks read a DQE meta.error as answered=0 and cache it → carry cdr.unavailable, never cache | S 1h
  F-41 Low | tc/script_clock.html:1915-1946 coverage strip renders a whole-call failure as the same blank as "no activity" → warn strip | S 0.5h
  F-25 Low | 70_kb.js:503-537,1824-1901 four KB count helpers return {} on failure; usage/review-due render it as "nothing" → {map, unavailable} | S 1h
  F-45 Low | kb/script_kb.html:3615-3621 "Was this helpful?" says Thanks before/regardless of the RPC → after r.success | S 0.25h

Batch 3 — H1/H2 follow-through | est. 6h
  F-07 Medium | script_metrics.html:1126 mPctClass_ (null band→0, no amber) vs tc/script_clock.html:872 dashPctTone_ (null slack→5pt) → ONE null-band rule; fix the stale run.js:7597 pin message | S 1h
  F-08 Medium | 40_metrics.js:442-504 ships standardSource; nothing reads it; script_metrics.html:1805/1870 keeps `(res.threshold||85)` → render source on the hero + a Storage Health row; drop the 85 | S 1.5h
  F-09 Medium | 10_core.js:3318-3324 holiday fallback silently swaps to the federal list (empty/no-tab/unreadable, cached 1h); source unsurfaced → surface source in Storage Health and on the CDR card (the fallback ITSELF: Deferred) | S 1.5h
  F-35 Low | 40_metrics.js:2076-2083 ambient badge uses calendar yesterday → prevWorkdayIso_ | S 0.5h
  F-32 Low | 40_metrics.js:410-414 cdrAnswerPct_ returns 0 (not null) when answered+missed==0 with rung>0 → null; consumers skip null | S 1h
  F-38 Low | tc/script_timeoff.html:252,289,913; tc/script_manager.html:829,1470,1602 "US holiday / Federal observance" copy → "Company holiday" | S 0.5h

Batch 4 — Automation liveness and accrual diagnostics | est. 7h
  F-20 Medium | 10_core.js:961 AUTOMATION_JOB_CHECKS lacks runDailyExportCheck + sendDailyMissedPunchAlerts; :1409 DIGEST_STALE_HOURS has no key for sendAutomationHealthDigest; :1766 a computeAutomationHealth_ throw returns silently → two JOB_CHECKS rows; a heartbeat for the digest; stamp its own failure | S 2h
  F-19 Medium | 20_timeclock.js:484-491,781,795; 10_core.js:1573 a multi-month ledger key is `skipped` daily for months once one member leaves the 3-month window → per-month ledger keys (or split multi-month rows on read); ledger window keyed to the reconcile window | M 3h
  F-46 Low | 20_timeclock.js:732 vs :800-802 the accrual job's early returns never rewrite PTO_ACCRUAL_RECONCILE nor clear its error → rewrite/clear on the early-return paths | S 0.5h (after F-19)
  F-21 Medium | Tests.js:2528-2544,4932-5241 tests prepend _TEST_MGR_EMAIL to MANAGER_EMAILS; a killed run leaves it; cleanup strips ADMIN_EMAILS only → strip MANAGER_EMAILS residue in cleanupTestData | S 0.5h
  F-22 Medium | Tests.js:6412-6435,5364-5398 TEST_ rows on LIVE DeptRequests/ClientErrors tabs; positional deleteRows; no cleanup backstop → delete by TEST_ key; cleanup backstop | S 1h
  F-49 Low | 20_timeclock.js:2086 getTeamCalendar reads the time-off tab without the provisioner → getOrCreateTimeOffSheet_ | S 0.25h

Batch 5 — Access boundary and data integrity | est. 6h
  F-16 Medium | 90_qa.js:1243,459-466 My Reviews + audio chunk scoped by roster NAME against free-text Agent → scope by roster id resolved at write; name only when unique | S–M 2h
  F-10 Medium | 30_callnotes.js:1336,1366 applyTagTransformAcrossReps_ swallows an unreadable rep Sheet; rename/merge report success + audit reps=N-1 → skippedReps in the return and the audit row | S 1h
  F-11 Medium | 50_deptrequests.js:41, 30_callnotes.js:2358, CLAUDE.md storage map, 10_core.js:1801 DeptRequests carries PatientTrx on the payroll sheet by default; comments say PHI-free; map omits it; Storage Health does not probe DEPT_REQUESTS_SS_ID → fix comments; add the store row + probe; recommend DEPT_REQUESTS_SS_ID = the PHI store | S 1h
  F-17 Medium | qa/script_qa.html:572-573 exemption onclick literal breaks on an apostrophe (esc() already encodes the quote; the replace is a no-op) → data-* + delegated handler | S 0.5h
  F-24 Low | 81_empdocs.js:157-160,347-399 blank ContentHash skips the integrity gate on sign and reads tampered:false → refuse to sign a hash-less doc; verify reports contentMatch:null as a warning | S 1h
  F-23 Low | 70_kb.js:1120-1136 radius branch returns before the states branch: "TX, 100 miles of Dallas" drops the state → states + radius → unknown | S 0.5h
  F-27 Low | 60_intake.js:877,1009 server renders client-sent labels (g43 enforced client-side only) → labels from the server's English bank by qNum | S 1h

Batch 6 — Shell, accessibility and copy | est. 6h
  F-14 Medium | script_core.html:509-516 boot Retry uses location.reload() (g69) → reloadApp_(); tripwire | S 0.5h
  F-12 Medium | cn/script_callnotes.html:9396-9422 Admin KPI strip labels the caller's OWN getCallNotesAmbient counts "across team" → team-wide sources, or relabel | S 1h
  F-40 Low | tc/script_clock.html:2638; tc/script_manager.html:1243,1322,1787; tc/script_timeoff.html:978 five static modals never move/restore focus → the ensureOverlay focus stash | S–M 2h
  F-30 Low | cn/script_callnotes.html:2810-2842 shortcuts overlay outside ensureOverlay (unnamed close, no trap) → through ensureOverlay | S 0.5h
  F-29 Low | cn/script_callnotes.html:7779,8473-8508 duplicate aria-label; "You" for the rep's entries when a manager views → one label; "Rep" | S 0.25h
  F-42 Low | form_public.html:712-747,851-861 accordions lack aria-expanded/aria-controls → add | S 0.25h
  F-43 Low | kb/script_kb.html:4213-4270 drawer has no dialog role/label, no focus restore → add | S 0.5h
  F-36 Low | tc/script_manager.html:1289-1302 export window.open after an async RPC loses the URL to a popup blocker → render the link | S 0.5h
  F-37 Low | script_core.html:427-456 pop-out "blocked" toast unreachable (window.open returns null) → check the return | S 0.25h
  F-28 Low | cn quick-chip row "this week" over all-time counts (30_callnotes.js:634) → match label and count | S 0.25h

Batch 7 — Test and docs hygiene | est. 4.5h
  F-52 Low | run.js:4954,7240,10430,14774 four structural pins stay green under a dead-branch/inverted mutation → behavioural | S 1.5h
  F-50 Low | scripts/lint-server.mjs:36-45 six advanced-service globals not enabled in appsscript.json → derive from enabledAdvancedServices | S 0.5h
  F-51 Low | scripts/counts.mjs:97-110 "Manager-gated endpoints" counts one literal (assertManagerCaller_ 34 + canSeeQa_ 18 invisible) → count all three, or relabel | S 0.5h
  F-53 Low | 00_config.js:2099 _TEST_OVERRIDE_COACH_MAIL lives in production code vs Tests.js:51-57 "one place" → move | S 0.25h
  F-31 Low | 40_metrics.js:535-541,631 getCdrAgentMetrics_ cache tier not bypassed under the CDR override; _clearCdrCacheForDate_ hashes a different roster set → bypass; hash with empRosterEmail_ | S 0.5h
  F-33 Low | 40_metrics.js:1091-1098 cdrQueueInventory_ tail scan; truncated permanently true → span-bound | S 0.5h
  F-34 Low | 51_spanish.js:219-266 vs 347-408 telemetry counts threads only; lists fold voicemails → count VMs in stats | S 0.5h
  F-26 Low | 70_kb.js:2642,2215; 30_callnotes.js:1012,1162; INV-31/82; design-decisions.md:3722 "manager-gated" over admin gates → say admin | S 0.25h
  F-39 Low | tc/script_timesheet.html:19-37 computeRange unpinned mirror of getCurrentBiweeklyRange_ → pin | S 0.25h
  F-48 Low | 20_timeclock.js:1668-1683 sparkline paints an open/unparseable day as a 0h bar (run.js:5726 pins it) → null day = no bar | S 0.5h

Deferred: F-09's holiday FALLBACK itself (keep g123's federal fail-open, or match the dashboard's no-fallback) — operator decision; Batch 3 surfaces the source either way.
