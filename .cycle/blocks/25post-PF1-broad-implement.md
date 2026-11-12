---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (an operator round, not a scan batch)
New capabilities (G/ST): PF1 (operator 2026-11-09) — the Dashboard's "Your numbers" / "Department" cards and the Stats page load faster without changing a number: narrowed CDR reads, CDR window aggregates cached against a stamp of the data, an hourly read-ahead, load times in the execution log
Files modified: web-app/00_config.js, web-app/10_core.js, web-app/40_metrics.js, web-app/cn/script_callnotes.html, web-app/Tests.js, test/client/run.js, test/client/server-split-manifest.json, docs/design-decisions.md, docs/modules.md, docs/operator-state.md, .cycle/config.md, .cycle/STATE.md, CLAUDE.md
Estimate: M (~5 h) — written to STATE.md's Estimates line before the first edit
Actual: ~4 h

CHANGES:
PF1 reads | web-app/40_metrics.js | `cdrDqeReadSpan_`: a DQE window takes values for column 1..TOTAL_ANSWERED and DISPLAY text for TTT..ATT only (was 34 columns, read twice); both DQE readers (`getCdrAgentMetrics_`, the breakdown — now `cdrDailyBreakdownUncached_` behind a cached `getCdrDailyBreakdown_`) read the durations from it. `cdrDateColIsos_`: a tab's date column once per execution (memoized only for a named sheet, keyed by spreadsheet, sheet, row count, tz). The transfer read takes 7 columns unless the per-queue block is asked for.
PF1 caches | web-app/00_config.js, web-app/40_metrics.js | `cdrDataStamp_` (row counts + a digest of the newest CDR_STAMP_TAIL_ROWS rows of the DQE and transfer tabs + the alias tab whole; CacheService 120 s, memoized per execution; '' on failure), pure `cdrStampFromProbes_`, `cdrDigestHex_`, `cdrWindowCacheSpec_` (stamp → 6 h key; none → the five-minute family). The DQE, transfer and breakdown readers key through it; a named failure, a round read without the aliases (F16) and any test-override read are never kept; the breakdown, which had no cache, now has one.
PF1 read-ahead | web-app/40_metrics.js, web-app/00_config.js, web-app/10_core.js, web-app/cn/script_callnotes.html | `warmCdrMetricsCache` on `runHourlyJobs` (key `CdrCacheWarm`, heartbeat `cdrWarm`, 2 h stale, labels server- and client-side): when the stamp differs from the last warmed one, reads the dashboard's three windows and the Stats default 30-day trend for the cohort; remembers the stamp only when every read worked; idle otherwise and under the test override; failed with no stamp. `cdrCohortNames_` is the one cohort list getDashboardMetrics, getMyMetrics and the job share (so the keys match). Both endpoints log "cached"/"read" with ms.
PF1 tests/docs | test/*, web-app/Tests.js, docs/*, .cycle/config.md, CLAUDE.md | Six pure pins (one value-for-value against the 34-column read over a tab whose durations read wrong as values and whose columns past 10 throw); eight older pins widened for the new helpers (H3-2/3/4, M3, M10, F3, C17-4, F-33, Phase 1's caller count, P1's registry regex, MET-1, the shared m3 context); the editor suite's `_clearCdrCacheForDate_` builds its keys through the production spec and `_resetCdrCaches_` clears the two memos; INV-407, S166, the decision `#pf1-cdr-reads-cached-against-a-stamp`, the module note, the operator entry + inventory link, running totals.

TEST RESULTS: pure 1577/1577, DOM 397/397, `lint:server` clean, `handbook-sync --check` clean, `counts.mjs --check` clean, split-manifest rewritten; CI green on the main PF1 commit. Bite-checks: 20 of 20 mutations bite (the durations read as values, a 34-wide read, both ATT offsets, the memo's row count, an unnamed sheet memoized, the no-stamp TTL, the stamp in the key, both degraded guards, the breakdown cache hit, the transfer TTL, the tail in the stamp, the shared stamp, a failed warm remembered, the idle check, the heartbeat, the Stats read-ahead, the cohort's email skip, the transfer width). Regression: S-scenarios over the Dashboard and Stats (the period cards, My Stats, Team Metrics) — PASS by their unchanged drives; S166 new — operator walk owed (before/after timings on the real sheets cannot be measured from here).
REGRESSION RISKS: An edit deep in the DQE history (older than the newest 300 rows, row count unchanged) is not seen by the stamp and shows within the 6 h window TTL — the bound the per-person dashboard cache already had. The read-ahead adds one hourly stamp probe (two tail reads + the alias tab) and, once per data change, the three dashboard windows and the Stats trend. The manager-gated endpoint count and the dispatcher's job count rose by one.
INVARIANTS AT RISK: None — INV-407 added; INV-85 (cache keys carry the shape) — the window key family gained a reader tag and the stamp, the payload shape is unchanged; INV-124 (anonymized team series) untouched — the cohort list is the same predicate in one place; INV-64 / g00 (durations as display text) kept and pinned.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (PF1 is a new capability — a performance change with no behaviour change)

OPERATOR ACTIONS / DEPLOY:
- Before deploying, note a few getDashboardMetrics / getMyMetrics times in Apps Script → Executions to compare | BLOCKS DEPLOY: N
- Team Tools `clasp push -f` + New version (no trigger reinstall — the read-ahead rides the hourly dispatcher) | BLOCKS DEPLOY: N
- Walk S166 on DEV | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` (then New version)

FOLLOW-ON ITEMS:
- getMyMetricsRange and getTeamMetrics use the narrowed, stamp-cached readers but are not read ahead.
- The read-ahead warms CONFIG.TIMEZONE's today; a rep in another timezone on another date reads their own windows.
- The rep's own call-notes count (one column of their Sheet) is still read per open.

DOCUMENTATION UPDATES NEEDED:
- None (done in this batch)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
