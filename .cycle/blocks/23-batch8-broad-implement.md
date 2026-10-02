---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- QA2-1 — two defects in how audit exemptions were keyed:
  - An exemption was granted for the period being viewed, but a rep only became eligible once that period was already covered, so an exemption never saved a single review. It is now granted for the NEXT period.
  - Exemption keys did not cross the month and quarter views. A quarter's exemption now holds in each of its months.
- QA2-2 — "Sample the gaps" could assign recordings from other periods. Those count toward nothing, so the gap never closed. The sampler now draws only the period's own calls.
- QA2-3 — the queue and the log kept the first roster row's id for each name. For a name two roster rows share, "Coach on this call" could file a never-purged HR coaching record on the wrong person. The id stored at attribution now wins, and an ambiguous name resolves to nobody.
- QA-2 — the comment write and both review reads (comments, scorecards) lacked the self-review guard. A reviewer could read and annotate reviews of their own call before it was released to them. All three now refuse, except for an admin (S6).
- QA-4 — sampling and assignment handed reviewers their own calls, which the status and scorecard writes then refused, stranding the recording. Both now skip or refuse the reviewer's own calls.
- QA-5 — a recording older than the 2,000-row tail read "Recording not found." for every action and dropped out of its agent's My Reviews. The lookup now falls back to the rest of the id column, and My Reviews reads every row.
- QA2-4 — the previous period's team average was weighted by sampled count, while the current one is weighted by scorecard count, so the "vs previous period" delta compared two different averages. Both are now card-weighted.
- QA2-5 — case-variant agent names ("Maria Garcia" / "maria garcia") made two Stats rows. They now fold into one.
- QAUI-1 — every rating click rebuilt the scorecard form, so keyboard focus fell back to the page. A click now patches the pressed state and the running line in place.

Files modified:
- web-app/90_qa.js
- web-app/qa/script_qa.html
- test/client/run.js
- test/client/dom/runDom.js
- test/client/server-split-manifest.json
- test/visual/mock.js
- CLAUDE.md (generated running-totals row only)
- .cycle/STATE.md
Estimate: M (~9.5 h) — Batch 8, written before the first edit
Actual: ~2.5 h

CHANGES:
QA2-1 | 90_qa.js, qa/script_qa.html, test/visual/mock.js |
  - New pure helpers `qaNextPeriod_` and `qaExemptFor_` (own key, or a month's quarter; a month does not exempt its quarter).
  - `qaCoverageRows_` reads exemptions through `qaExemptFor_`, adds `exemptNext`, and is not `eligible` while next period is already exempt.
  - The sampler's targets use the same rule.
  - `getQaQueue` ships `nextPeriod` / `nextPeriodLabel`.
  - The client's Grant button reads "Exempt for <next period>" and writes `d.nextPeriod`. A next-period grant shows "Revoke for <next>". Each button carries `data-qa-exempt-period`, which the delegated handler and `qaSetExemption_` pass through.
  - The fixture's verbatim region gained `qaNextPeriod_` / `qaExemptFor_` and the new `qaCoverageRows_` (the F4 mirror pin). Its queue payload carries `nextPeriod`.
QA2-2 | 90_qa.js | `qaSampleRecordings` skips candidates outside `periodKey`. The empty case names the period ("no unassigned new recording from Sep 2026 that you can review").
QA2-3 | 90_qa.js | New pure helpers:
  - `qaRosterIdIndex_` maps each name to every included roster id.
  - `qaAgentEmpId_(storedId, name, index)`: a stored AgentId wins; otherwise a name with exactly one id; otherwise ''.
  `getQaQueue` and `getQaLog` use them; the first-wins `rosterIdByName` maps are gone.
QA-2 | 90_qa.js | `qaSelfReviewRefusalFor_(emp, ss, fid)` is read-only and never provisions. `qaListComments` and `qaListScorecards` return its refusal as `{error}`. `qaAddComment` refuses before it appends.
QA-4 | 90_qa.js |
  - The sampler skips a candidate that `qaSelfReviewRefusal_` refuses for the caller.
  - `qaAssignRecording` resolves the assignee (the caller, or `qaReviewerByEmail_` for someone else) and refuses their own call. An address with no roster identity is not refused on a guess.
QA-5 | 90_qa.js |
  - `qaFindRecordingRow_` reads the tail first (newest first), then the rest of the one FileId column.
  - `getMyQaReviews` makes three narrow column reads (Agent, AgentId, SharedMs). The pure `qaMySharedRowIdxs_` picks the caller's shared rows, newest share first, capped, and only those are read in full.
QA2-4 | 90_qa.js, qa/script_qa.html | Coverage rows carry `prevCardCount`. `qaCoverageSummary_` weights the previous period by it, falling back to `prevSampled` for an older payload.
QA2-5 | 90_qa.js | `qaStatsAggregate_` keys agents case-folded and labels each with the first spelling seen.
QAUI-1 | qa/script_qa.html |
  - Each control group (and the select) carries `data-qa-crit`; scale buttons carry `data-v`.
  - `qaSetRating_` sets `aria-pressed` on the group's buttons (or a select's value) and redraws only `.qa-score-running`, through the new shared `qaScoreRunningHtml_`.
  - With no group in the DOM it falls back to the full render, as before.
(tests) | test/client/run.js | Moved pins encoding the old shapes: QA-10's aria-pressed regex (`data-v`), QA-11's exempt-target line, QA-19's sandbox (the two new helpers), QA-21's agent-id line, QA-27's select, and F-17's two exemption-button regexes (the period attribute).

TEST RESULTS: passed.
- Pure: 1186/1186 (was 1179). Seven new pins, each driving the real functions:
  - QA2-1: the next-period grid; quarter-in-month; a coverage row before the grant, after it (`exemptNext`, not re-offered, this period's target kept), and in the next period's own view (target 0); plus the client button and call.
  - QA2-2 + QA-4: `qaSampleRecordings` over a fake sheet (another period's call, the caller's own call, a good one; an admin may take their own; the named empty case).
  - QA-4 assignment: self, a manager assigning a rep her own call, another reviewer, an off-roster address.
  - QA2-3: the index and resolver grid.
  - QA-2: `qaListComments` / `qaListScorecards` for the owner, an admin and another reviewer; `qaAddComment`'s order.
  - QA-5: a 2,500-row sheet with the target at row 2; My Reviews' row picker, order and cap.
  - QA2-4 + QA2-5: the summary's weighting; one Stats row.
- DOM: 198/198. The QA-LOG-DOM drive gained the QAUI-1 checks: the pressed button is the same node and keeps focus, the running line updates, a new rating un-presses the old one. It also exposed that a programmatic `qaSetRating_` must mirror a select's value, which the patch now does.
- lint:server clean; counts --check agrees; split manifest current.
- 14 bite-checks, all BITE: QA2-1 ×3, QA2-2, QA-4 ×2, QA2-3 ×2, QA-2, QA-5 ×2, QA2-4, QA2-5, QAUI-1.
- Visual: qa-queue-light-wide, qa-detail-light-wide and qa-queue-light-mobile — 0px overflow, nothing missing. The wide queue was read: David's row offers "Exempt for Nov 2026", and Sofia's current exemption keeps "Revoke exemption".
Regression Scenarios (Test Command `manual`), walked against the changed code paths; none run on a deployment:
- S90 sync / queue / playback / comments: PASS. A comment on someone else's call is unchanged; on your own call it is now refused.
- S100: PASS for the sampler, the summary strip, the rating clicks and the coaching hand-off. Its exemption step's Expected is now STALE. It says Grant makes the row read Exempt with target 0/0; Grant now exempts the NEXT period, so the row offers "Revoke for <next>" and keeps this period's target. That is a doc update, not a defect.
- S103 QA Log: PASS — the agent id resolves through the shared helper; the typed rubric is unchanged.
REGRESSION RISKS:
- An exemption granted before this deploy sits on the period it was granted for and is still honoured there (target 0), as before.
- A quarter exemption now also exempts the quarter's months — the intended reading, but a change.
- A reviewer opening their OWN call's detail now gets the refusal in the comments and scorecard panels instead of the reviews.
- My Reviews now makes one row read per shared review (up to `QA_MY_REVIEWS_CAP`) after three column reads, instead of one 2,000-row block read. It is slower for an agent with many shared reviews, and complete for all.
- A `qaFindRecordingRow_` miss now costs one more column read.
INVARIANTS AT RISK: None broken. Checked and holding:
- S6 / INV (self-review): enforced on every read and write that touches a recording's reviews; the admin exception kept.
- INV-183: the roster index uses `empRosterEmail_`.
- F-16 (an ambiguous name releases to nobody): extended to the hand-off.
- INV-185: the fixture's verbatim copies were refreshed; the F4 mirror pin passes.
- g49 / F-17: the period rides a `data-*` attribute to a function argument, never back into innerHTML.
- g152: My Reviews and the lookup are no longer bounded by a row-count tail.
- INV-187: a null average stays null.
NET SCORE: 0 − 0 = 0. All nine fixes are defensive. The QA module depends on the recordings Drive folder, and the domain disables Apps Script's Drive (Batch 3), so the queue has had little real use this month. No exemption grant, self-assigned sample, ambiguous-name hand-off, or 2,000-row index is known to have happened. New failure modes: none identified; the trades are listed above.

OPERATOR ACTIONS / DEPLOY:
- None. An exemption a manager granted before this deploy for the CURRENT period still applies to that period. If they meant the next one, grant it again from the coverage row ("Exempt for <next period>"). | BLOCKS DEPLOY: N
Deploy: Server + Client (QA): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The recordings table on the wide queue shot: a Skipped row's reason runs under the "you" reviewer pill, and the New row's third action button is clipped at the right edge. Both are in the recordings table, untouched here.
- `getQaQueue`, `getQaStats`, `getQaLog` and the sampler still read the 2,000-row tail for their LISTS. That is a display bound, not a lookup, but an older un-reviewed recording is never sampled.
- `qaReadExemptions_` reads a `QA_EXEMPTIONS_SCAN` row-count tail (g152's shape); the ledger is small today.
- No editor-suite case drives a self-review refusal on comments, or an exemption round trip.

DOCUMENTATION UPDATES NEEDED:
- .cycle/config.md:
  - S100's exemption step and Expected: Grant reads "Exempt for <next period>", and the next period's view shows target 0.
  - S100 / S90: a reviewer's own call refuses comments and review reads; sampling and assignment never hand you your own call; Sample the gaps draws the period's own calls.
  - S103: the hand-off for a shared name.
  - INV candidate: an exemption applies to the period after the one that earned it, and every reader asks `qaExemptFor_`.
- docs/gotchas.md + CLAUDE.md index:
  - g152: QA-5 — My Reviews and the recording lookup are no longer a row-count tail.
  - g03 / F-16: QA2-3 — the hand-off's first-row-wins name map.
  - g143 / the S6 rule: QA-2 — a read is a review too.
  - Possibly a new gotcha: a grant computed from a period that is already over must apply forward.
- docs/design-decisions.md: the QA coverage / exemption decision (design handoff PR 5) — next-period grants and the quarter-in-month rule; the self-review rule now covers reads.
- docs/modules.md: QA — exemptions, sampling, the hand-off, My Reviews completeness, the rating keyboard behaviour.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
