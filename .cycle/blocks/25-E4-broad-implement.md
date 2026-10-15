---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (E4 is an expansion batch).
New capabilities (G/ST):
- ST1: the Dept Request reply scan becomes a review queue. Operator decisions (2026-10-15):
  - a "Replies to check" group on the Dept Requests tab ONLY;
  - each held reply says WHY, with Resolved / Still open buttons;
  - every answer is logged with the rule that held the reply back, and Admin → System reports per rule how often people overrode it;
  - the scan never loosens itself.
- G5: Spanish Inbox aging and escalation. Operator decisions (2026-10-15):
  - a request is escalated at 7 CALENDAR days;
  - it shows "Escalated · N days" on the tab and the Dashboard card;
  - the claimant's Needs-you item turns overdue;
  - a daily 8am manager email lists the escalated requests (no message text), logged as a digest.
Files modified: web-app/00_config.js, web-app/10_core.js, web-app/20_timeclock.js, web-app/50_deptrequests.js, web-app/51_spanish.js, web-app/metrics/script_deptrequests.html, web-app/metrics/script_metrics.html, web-app/tc/script_clock.html, web-app/cn/script_callnotes.html, web-app/styles.html, web-app/Tests.js, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md, docs/design-decisions.md, docs/modules.md, docs/operator-log.md, docs/operator-state.md, .cycle/config.md, .cycle/STATE.md
Estimate: L (~1.5 days ≈ 12 h, the plan's figure). Written before the first edit, after the operator's four answers (STATE.md Estimates line, 2026-10-15).
Actual: ~4.5 h

CHANGES:
ST1 | web-app/00_config.js | Config changes:<br>• `DR` gains `REPLY_REASON:18`, and `DR_HEADERS` gains `ReplyReason` (the header self-heals).<br>• `DR_REPLY_VERDICTS` gains `'kept-open'`; the order is load-bearing.<br>• New `DR_REPLY_REASONS` (six labelled codes).<br>• New `DR_REVIEWS_TAB` / `DR_REVIEWS_HEADERS` / `DR_REVIEW_ANSWERS` / `DR_REVIEW_REPORT_DAYS` (90).
ST1 | web-app/50_deptrequests.js | Server changes:<br>• The new `drReplyHoldReason_` names rule 4's negative in the old test order (question, asks, not-done, ack); `drReplyAsksOrHolds_` is now its truthiness, so no verdict changed.<br>• The new `drReplyVerdictFull_` returns `{verdict, reason}`, adding `empty` and `unattributed`; `drReplyVerdict_` is its verdict, and `drReplyPick_` carries the reason.<br>• The scan writes RepliedAt + ReplyVerdict + ReplyReason together. It skips a `needs-look` OR `kept-open` row with the same reply time, so a reply a person kept open is never raised again.<br>• `reopenDeptRequest` clears the reason too, and `getDeptRequests` ships `replyReason`, `replyReasonLabel` and `repliedMs`.<br>• The new `answerDeptReplyLook(id, answer)`:<br>&nbsp;&nbsp;– drCanAct_-gated before any write;<br>&nbsp;&nbsp;– takes resolved / open only;<br>&nbsp;&nbsp;– re-reads the row under the lock and returns `stale` unless it is still open and `needs-look`;<br>&nbsp;&nbsp;– `open` sets `kept-open`; `resolved` calls the shared in-app resolve (untimed);<br>&nbsp;&nbsp;– logs a DeptReplyReviews row (id, reason, answer, who) plus an id-only audit row.<br>• The pure `drReplyReviewReport_` counts per rule (waiting, Resolved, Still open, override %); null when unanswered, never 0%.<br>• `getDeptReplyReviewStats` is admin-gated before reads.
ST1 | web-app/metrics/script_deptrequests.html | Client changes:<br>• The pure `drLooksToCheck_` / `drLookRowHtml_` / `drLooksHtml_` build a "Replies to check" group that leads the page: one row per request, the longest-waiting first by `repliedMs`, saying why, with data-* buttons.<br>• `drLookAnswerClick_`: both buttons lock in flight; success patches the cached payload (kept-open, or drApplyResolved_) and repaints the group and the cards; a stale answer re-enters the view; a failure restores the buttons.<br>• The card tooltip and the intro name the reason and the group, with CSS added.
ST1 | web-app/cn/script_callnotes.html | A new Admin → System panel, "Dept Request reply check" (`cnRenderReplyReviews_` / `cnLoadReplyReviews_`):<br>• one row per rule;<br>• amber when people override a rule at least half the time over 5 or more answers;<br>• "no answers yet" for null;<br>• it says when the check is OFF.
G5 | web-app/00_config.js, 10_core.js | Config:<br>• `SPANISH_ESCALATE_DAYS` (7) and `SPANISH_ESCALATE_READ_DAYS` (90).<br>• `sendSpanishEscalationDigest` joins `runDailyChecks` (count-neutral: no new trigger).<br>• The `SpanishEscalationDigest` job key, error key and label are registered; the delivery label is `spanishEscalation`; the stale window is 26h.<br>• The client mirrors (`CN_DIGEST_LABELS_`, `DIGEST_LABELS`) are updated.
G5 | web-app/51_spanish.js | Server changes:<br>• The pure `spanishEscalated_` is the ONE rule.<br>• Each pending item (email and voicemail) ships `escalated`, and the payload ships `escalateDays`.<br>• The pending-id cache carries the escalated ids (`spanishPendingEscalatedGet_`).<br>• The pure `spanishEscalationRows_` (escalated only, oldest first, claimant by roster name, no subject / snippet / requester) and `spanishEscalationBody_` (escaped; says when the read was capped) build the email.<br>• `sendSpanishEscalationDigest` reads the 90-day window through the ungated core:<br>&nbsp;&nbsp;– idle without an inbox or managers;<br>&nbsp;&nbsp;– THROWS on an unread inbox;<br>&nbsp;&nbsp;– on none, logs `empty` and sends nothing;<br>&nbsp;&nbsp;– otherwise sends and logs sent; a failed send is logged failed;<br>&nbsp;&nbsp;– a capped read is `partial`.
G5 | web-app/20_timeclock.js | The Needs-you Spanish item is `overdue` while any of the claimant's claims is escalated, and its detail says "N waiting 7+ days".
G5 | web-app/metrics/script_metrics.html, tc/script_clock.html, styles.html | The pure `spanishEscalatedPillHtml_` draws only the server's flag. The tab card gets the pill and the `.sp-escalated` stripe; the Dashboard card counts "N escalated" and draws the pill (typeof-guarded). CSS added.
Tests | web-app/Tests.js | `getDeptReplyReviewStats` is added to the admin omnibus and tier list.
Tests | test/client/run.js | Ten new E4 pins, all driven:<br>• the reason grid;<br>• the scan with kept-open;<br>• answerDeptReplyLook;<br>• the report and its gate;<br>• the tab's pure functions;<br>• the Admin panel;<br>• the escalation rule and pending flag;<br>• Needs-you overdue over the real block;<br>• the digest job (sent / empty / throw / failed / idle, plus no content leaks) and its wiring;<br>• the card pill.<br>Old-shape updates:<br>• the D-2 / D-3 / DR-1/2 fn lists gain the two new functions;<br>• C-N6 (the DR enum and headers);<br>• R2-FU (the pill now shares the line);<br>• F14 and C-8 (the cached escalated ids);<br>• SP-2 (`spanishEscalated_` in the pending harness);<br>• X1 writes list (`answerDeptReplyLook`).
Tests | test/client/dom/runDom.js | Two new drives and one updated test:<br>• "E4 DOM (ST1)": order, why, the Still open / Resolved / lock / failure / stale paths.<br>• "E4 DOM (G5)": the escalated pill and stripe, and none on a fresh request.<br>• The 22post D drive's card lookup now skips the `.dr-look` rows.
Tests | test/visual/mock.js, shoot.mjs | Fixtures and scenarios:<br>• the needs-look fixture carries a reason and `repliedMs`;<br>• a `getDeptReplyReviewStats` fixture (an over-fired rule, a backed one, an unanswered one);<br>• the oldest Spanish request is 9 days old and escalated.<br>Three scenarios: `deptreq-looks-light-mobile`, `admin-system-replycheck-light-wide` and `admin-system-replycheck-light-mobile`.
Bites | — | 24 hand mutations, all red:<br>• the question reason is lost;<br>• empty is not named;<br>• the pick drops the reason;<br>• the scan drops the reason;<br>• a kept-open reply is re-raised;<br>• the answer gate is moved after the write;<br>• there is no stale check;<br>• open does not set kept-open;<br>• resolved goes via email;<br>• the report gives 0 instead of null;<br>• the report ignores its window;<br>• the stats gate is moved after a read;<br>• the looks include kept-open;<br>• the looks sort by the display string;<br>• the reason is unescaped;<br>• the buttons are not locked;<br>• kept-open is not patched;<br>• the amber is unconditional;<br>• escalation fires at > instead of ≥;<br>• Needs-you is never overdue;<br>• the digest leaks the subject;<br>• the digest swallows a read error;<br>• the digest mails on none;<br>• the pill draws without the flag.
Found by the DOM drive | — | The group first sorted on `repliedAt`, a DISPLAY string ("Oct 15, 11:00 AM" sorts before "Oct 15, 9:00 AM"). The server now ships `repliedMs` and the order uses it; the "looks sort by string" mutation is pinned.
Docs | CLAUDE.md, docs/*, .cycle/config.md | Docs updated:<br>• a new design decision with its index line, plus an amendment to the four-rules decision;<br>• operator-state: the reply-resolution entry (ReplyReason, DeptReplyReviews, the report) and the Spanish entry (escalation, the digest);<br>• the storage map;<br>• INV-380; INV-136 names the endpoint;<br>• S142;<br>• modules.md;<br>• the operator log;<br>• the running totals.

TEST RESULTS: passed.
- Pure harness 1353/1353; DOM harness 260/260.
- `npm run lint:server` clean; `counts.mjs --check` clean; `split-manifest.mjs --check` current (1717 declarations).
- Visual: all clean, read by eye — 0 overflow, 0 runaway, 0 squeezed text, 0 errors, 0 missing fixtures across:<br>• the three new scenarios;<br>• `spanish-light-*`;<br>• `deptreq*`, `admin-system*` and `dashboard*` (16);<br>• `clock-*` (3), where the Dashboard Spanish card shows "1 escalated" and the pill.
- Test Command is `manual`. S142 needs the deployed DEV instance: NOT RUN. The editor suite's new gate case was not run either.
REGRESSION RISKS:
(1) Pre-deploy held replies. Requests held before the deploy have no ReplyReason; they read "the reply did not clearly say it was done" on the row, and "reason not recorded" in the report.
(2) Cached held rows. The `kept-open` verdict is new. A client on the old code (before a reload) never shows it in the "needs a look" label; it reads as a plain open request, which is correct.
(3) Extra Gmail read. The escalation digest does one 90-day Gmail search (capped at 200 threads) at 8am inside `runDailyChecks`, beside the open-punch check and the urgent digest, within the six-minute limit.
(4) Needs-you on a cache hit. Needs-you reads the escalated ids from the same 15-minute cache as the pending ids. A request that crosses 7 days between reads turns overdue at the next pending read.
(5) Dashboard card. It now also counts escalated items; an older server ships no `escalated`, and the count is then simply absent.
INVARIANTS AT RISK:
- INV-139 / g159: the check is unchanged in its verdicts and never loosens itself (INV-380 (4)).
- INV-136: the new admin endpoint is gated before reads and named.
- INV-138 / drCanAct_: the answer uses the ONE ownership rule.
- INV-32: audit rows are id-only; the review rows carry no reply text or PatientTrx.
- INV-376 / ST2: the new job ends through `runAutomationJob_`.
- INV-377 / G3: its decisions are logged.
- g53: an unread inbox throws.
- g131: the client draws the server's flag.
- INV-185: fixtures added.
- INV-380: new.
NET SCORE: 0 production fixes − 0 new failure modes = 0.
- ST1 and G5 are new capabilities: (a) NO.
- (b) New failure modes: NO.
- A display-string sort defect was caught by the DOM drive before commit and is pinned.

OPERATOR ACTIONS / DEPLOY:
- Deploy: `clasp push -f` from `web-app/`, then a New version. This rides the owed cycle-25 deploy. No new trigger: the digest rides `runDailyChecks`. No Script Property. | BLOCKS DEPLOY: N
- Walk S142 on the DEV instance. | BLOCKS DEPLOY: N
- Tell the desks about "Replies to check", and tell the Spanish team and managers about the 7-day escalation and the 8am email. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` (prod), or `npm run push:dev` first for the DEV instance

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The Spanish assignment email (`spanishNotifyAssignees_`) still sends without a `logDigestDelivery_` row. The map showed it; it is outside this batch.
- The escalation digest does not ride the manager daily brief when that is on. The operator chose a separate email; the brief is off by default.
- The review report counts answers, not every held reply. A held reply that resolves on the department's next reply without a person answering is not counted as an override. That is deliberate: no person judged it.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
