---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: (cycle-17 batch ② — the INV-187 silent-degradation stragglers)
- C17-3 — getMetricsAmbient's roster walk had NO inclusion guard (departed employee contaminated the manager alert badge) + its blanket silent catch; sibling: saveTrainingAssignment validated targets with raw EMP.EMAIL truthiness
- C17-4 — the per-rep-daily CDR finalize emitted attSeconds 0 for an answered-nothing day, dragging the anonymized team Avg-Talk benchmark toward 0 (and the rep's own point)
- C17-14 — My Stats' no-CDR fallback rendered a confident "Notes Filed: 0" when the note read failed (the one branch the cycle-16 F5 sweep missed)
- C17-15 — the dashboard extras SWR stamped a PARTIAL-failure round fresh, caching error placeholders for the full 60s window
- (side rail) — Timesheet-mode side rail stuck on its LOADING skeleton forever on a failed/errored getTimesheetData
- (kb drawer) — kbDrawerOpenItem_'s failure handler lacked the L-18 stale-response guards its success handler has
- (admin) — a getAdminConfig failure wiped all five Admin panes; now contained to the Config pane's own slot
- (cross-rep walks) — managerAggregateFlagged_/managerAggregateUrgent_ (weekly + urgent digests), managerSearchCallNotes, getCallNotesTagTaxonomy/getCallNotesTagTrends, and managerGetUnresolvedActionCount now carry their read outcome (skippedReps / partial); no partial round is ever cached
- (search) — a failed CN search (rep + manager) rendered stale results labeled with the new query; both now render an error state, query-current-guarded on both handlers

Files modified: web-app/Code.js, web-app/cn/script_callnotes.html, web-app/metrics/script_metrics.html, web-app/tc/script_clock.html, web-app/tc/script_timeoff.html, web-app/kb/script_kb.html, test/client/run.js, .cycle/STATE.md, .cycle/blocks/17-batch2-broad-implement.md

CHANGES:
C17-3 | Code.js + run.js | getMetricsAmbient skips no-email rows via empRosterEmail_ (INV-183 — the fifteenth walk, the one with NO guard, invisible to the banned-shape scan) and its catch now logs (the badge surface has no error affordance; the Automation Health CDR card stays the designated detector — documented at the catch). saveTrainingAssignment's target validation routes through empRosterEmail_ (the positive-truthiness third shape). F3 tripwire WIDENED: a new bare-truthiness ban (`if (x[i][EMP.EMAIL])` — comparison/identification reads deliberately don't match) + both functions added to the by-name list.
C17-4 | Code.js | `p.attSeconds = _attCount > 0 ? … : null` (was `: 0`) in getCdrDailyBreakdown_'s per-rep-daily finalize — the INV-180 zero-is-absence rule. Consumers verified null-safe: metricsTeamAvgSeries_ (`v != null`), metricsBuildKpiSeries_ (`raw != null`), dashboardTeamAggregate_ (`> 0` guards). The AGENT-level aggregates keep their 0 (their consumers guard with `att > 0` and cdrFmtHms_ formats them); no test double encoded the old per-rep-daily zero.
C17-14 | metrics/script_metrics.html | The `if (!c)` fallback renders a warn em dash with the "notes Sheet unreadable" title when data.noteCountUnavailable, matching the CDR branch.
C17-15 | tc/script_clock.html | clkLoadDashboardExtras_ counts expected RPCs (3 Spanish / 2 non-Spanish); the single `extraAt = Date.now()` stamp fires only when the WHOLE round succeeded (anyFail → no stamp → last-good stays, next enter retries) — the metrics loader's anyFail pattern, per INV-156/129.
side rail | tc/script_timeoff.html | loadTimesheetSideRail_ renders errorStateHtml_ into #ts-side-rail on empty response / data.error / transport failure (was: silent return + empty failure handler behind a pre-filled LOADING placeholder).
kb drawer | kb/script_kb.html | kbDrawerOpenItem_'s failure handler now checks KB_DRAWER.view === 'item' && KB_DRAWER.itemId === id before painting the error card.
admin | cn/script_callnotes.html | enterCallNotesAdminView's getAdminConfig error/failure renders into #cn-admin-body (the Config pane), preserving Overview/Tags/Compliance/Sheets and the slots the five sibling loaders target.
walks | Code.js + cn/script_callnotes.html | Five walks collect skippedReps (rep names) in their per-rep catch and carry it on the result: managerAggregateFlagged_ (`{flagType, results, skippedReps}`), managerAggregateUrgent_, managerSearchCallNotes, getCallNotesTagTaxonomy (also: cache put SKIPPED on a partial round — INV-129), getCallNotesTagTrends (same cache guard). managerGetUnresolvedActionCount returns `{count, partial}` and never caches a partial round (it previously CACHED the undercount for the full 2-min TTL). sendManagerFlagDigest_ gains an optional skippedReps arg rendering a "may be incomplete" warning (html + text); all three digest call sites (weekly training/review, urgent) now send WHEN results OR skippedReps is non-empty — a failed read is not an empty queue (S24 carve-out). Client: new shared cnSkippedRepsNoteHtml_ (role=status warn line) rendered atop the training/review queue, the manager search results (both branches), and the Admin merged tags table (union of taxonomy+trends skips); the unresolved badge renders `≥ N … · some rep Sheets unreadable` on partial (including at N=0, where it previously rendered nothing).
search | cn/script_callnotes.html | cnFireSearch_/cnMgrFireSearch_: the {error} branch and the transport failure both render errorStateHtml_ into the results host (naming the query), guarded on requestedView AND the query still being current — no more stale results under a new label after the toast fades.
Pins | test/client/run.js | F3 widened (bare-truthiness ban + 2 named additions) + 4 new comment-stripped (INV-188) batch-2 pins: C17-4 finalize shape; walks (per-function skippedReps collect + return-shape map, both cache guards, partial flag, digest gating + sender arg + body warning); CN client (helper + ≥4 consumers, badge lower bound, both search functions' dual error renders + dual query guards); the four sibling-branch stragglers (C17-14 branch, C17-15 single guarded stamp site, side-rail error render + no empty failure handler, drawer failure guards, admin containment). ALL bite-checked individually (5 mutations, each failing exactly its own pin). One pin was wrong on first write (a generic "last return mentions skippedReps" check — taxonomy attaches the field to a result object built above the return) and was rewritten with per-function expectations; the code was right, the pin was wrong — the recurring cycle-16 lesson.

TEST RESULTS: pure 411→415 / 0 failed; DOM 69/69; `node --check` clean. No stylesheet changes — visual re-shoot not required (the one new client element is an inline-styled note div; the 29-scenario matrix from this cycle's earlier runs stands). Scenario walk (Test Command = manual, overlapping subsystems): S23/S41/S43/S39/S46/S64/S51 PASS by proxy (parse guards + DOM harness + the new pins; every success path byte-preserved). S1/S2/S22/S24/S55/S57 NOT APPLICABLE in-container (editor/live-sheet/mail only — run runAllTests() post-deploy; S24's expected text needs the documented carve-out below).

REGRESSION RISKS:
- All server response changes are ADDITIVE (skippedReps / partial); an old client ignores them, and a new client on an old server renders nothing extra.
- sendManagerFlagDigest_'s new 5th arg is optional; its only three callers were updated in the same change.
- Digest behavior change (deliberate): a queue that is EMPTY but had unreadable rep Sheets now sends a warning-only digest where it previously sent nothing — a transient 8am Sheets blip can email managers a warning. Accepted noise (the C17-7 posture, extended to email); S24's "empty queues are silently skipped" now applies only to clean-and-empty queues.
- Partial rounds are no longer cached (taxonomy/trends/unresolved): under a SUSTAINED Sheet failure these re-scan on every open instead of every TTL — a cost, matching the established INV-129 tradeoff.
- Search: a transient failure now replaces prior results with an error card (previously stale results + toast); the query stays in the input, so re-running is one keystroke — deliberate, the mislabeled stale set was the bug.
- getMetricsAmbient may now exclude a roster row with a blank email that somehow still takes calls — consistent with every sibling walk (such a person cannot log in).

INVARIANTS AT RISK: None violated. INV-129 EXTENDED (three more caches obey cache-only-on-success); INV-183's census gains a closed fifteenth walk + the positive-truthiness shape ban; INV-180's zero-is-absence rule applied to the per-rep-daily matrix (INV-124's team line now honest); INV-82/125 (taxonomy/trends caches) behavior refined — partial rounds uncached; INV-43 untouched (ambient cache unchanged). S24's expected text needs the carve-out.

NET SCORE: 9 − 1 = 8
(Reflect per fix: would have fired this month — C17-4 YES (any rep-day with rung>0/answered 0 biased the team line), C17-15 YES (a transient failure on one of 2–3 dashboard RPCs in a month is likely), side rail YES (same class, pre-filled skeleton made it visible); C17-3/C17-14/kbDrawer/admin/walks/search NO (edge- or coincidence-gated). New failure modes: 1 — the warning-only digest email on a transient blip (Low, deliberate noise-for-visibility tradeoff, documented above). All 9 are production-class fixes.)

OPERATOR ACTIONS / DEPLOY:
- Run `runAllTests()` from the Apps Script editor after deploying | BLOCKS DEPLOY: N
- Expect: the manager alert badge may change on teams with offboarded-but-named roster rows (C17-3); the My Stats team Avg-Talk line may shift up slightly (C17-4 — zeros no longer drag it); a warning-style weekly/urgent digest may arrive when a rep Sheet is unreadable — that is the fix reporting a failure that was previously invisible | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

FOLLOW-ON ITEMS:
- sendCallNotesEodDigest's per-rep walk still swallows read failures silently (rep-facing reminder, not a manager aggregate — lower stakes; not in the scan's finding list but same family).
- The manager daily brief consumes managerAggregateUrgent_().results and drops skippedReps — could append "(+N unreadable)" to its urgent section (Low).
- Remaining cycle-17 batches ③ (tripwire-integrity sweep), ④ (interface set), ⑤ (server hardening), ⑥ (structural/growth), ⑦ (visual-lens expansion) — see the batch list in chat / STATE.md.

DOCUMENTATION UPDATES NEEDED:
- S24 expected text: weekly digests now SEND (with a warning) when a queue had unreadable rep Sheets; "silently skipped" applies only to clean-and-empty.
- INV-82 (taxonomy) + INV-125 (trends): note skippedReps on the result + partial-rounds-uncached; INV-43-adjacent note for managerGetUnresolvedActionCount's `{count, partial}` + conditional cache.
- INV-183: record the fifteenth walk (getMetricsAmbient) closed + the positive-truthiness ban + saveTrainingAssignment.
- INV-124/INV-180: note the per-rep-daily attSeconds null rule (C17-4).
- INV-187: extend the verify line with the batch-2 surfaces.
- Running pure-test count 411 → 415.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
