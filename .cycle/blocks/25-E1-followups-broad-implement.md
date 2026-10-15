---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None. This batch is the four follow-ons from E1's delivery log. The operator asked for them to go into an expansion batch if one fit; none did (E2 is payroll close-out, E3 the handbook loop, E4 request triage, E5 test infrastructure), so they ran now as an E1 follow-up batch.
New capabilities (G/ST):
- G3 extended (1). Rep- and agent-facing automated mail is now logged: the end-of-day flag reminder, the missed clock-out reminder to the rep, the overdue-documents nudge and the coaching recap.
- G3 extended (2). The nightly self-test failure alert and the client-error spike alert are now logged.
- G3 extended (3). A delivery row that could not be WRITTEN is now counted and named on the panel.
- G3 extended (4). On a phone, the delivery table reads as cards.
Files modified: web-app/00_config.js, web-app/10_core.js, web-app/20_timeclock.js, web-app/30_callnotes.js, web-app/80_training.js, web-app/82_coaching.js, web-app/script_core.html, web-app/cn/script_callnotes.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, CLAUDE.md, docs/gotchas.md, docs/design-decisions.md, docs/operator-state.md, docs/operator-log.md, .cycle/config.md, .cycle/STATE.md
Estimate: M (~4 h). Written before the first edit (STATE.md Estimates line, 2026-10-15).
Actual: ~1.5 h

CHANGES:
(1) | web-app/30_callnotes.js | `sendCallNotesEodDigest` writes a row per reminder: `eod` sent or failed, with the count of flagged notes. A rep whose Sheet could not be read gets a failed row. A rep with nothing flagged gets no row, so the log does not fill with an hourly "empty" row per rep.
(1) | web-app/20_timeclock.js | Each missed clock-out reminder to a rep writes a `missedPunchRep` row, sent or failed, with the missed date as the reason.
(1) | web-app/80_training.js | Each overdue-documents nudge to an employee writes a `trainingOverdueRep` row, sent or failed, with the document count.
(1) | web-app/82_coaching.js | Each agent's weekly coaching recap writes a `coachingRecap` row, sent or failed. `coachSendMail_` returns false on a failed send rather than throwing, so the failed row gives a fixed reason.
(2) | web-app/10_core.js | `selfTestFailureEmail_` writes a `selfTest` row, sent or failed; before this, a failed send reached only the Logger. `clientErrSpikeAlert_` writes a `clientErrSpike` row only when it actually sends or fails to send; the threshold and the cooldown decide on every beacon, so they do not write rows.
(1)(2) | web-app/00_config.js | One map, `DIGEST_DELIVERY_LABELS`, now names every key the log is written under. It ships on the Admin payload as `labels`, so the client keeps no copy of its own.
(3) | web-app/00_config.js, web-app/10_core.js | When `logDigestDelivery_` fails to write a row, `noteDigestDeliveryWriteFailure_` records it in `DIGEST_DELIVERY_LOG_FAILS` (`{count, firstMs, lastMs, lastError}`). That write goes through `propSetBounded_`, is lock-free, and never throws. The pure `digestDeliveryWriteFailuresView_` and `getDigestDeliveries` ship the record as `writeFailures`, but only while the latest failure is inside the view window.
(3) | web-app/cn/script_callnotes.html | A warning line names the lost rows: "N delivery rows could not be written to the log (latest: …) — those emails are not listed below, whether or not they went out". It shows on the missing-tab state too.
(4) | web-app/script_core.html | `mtRenderTable_` gains two opt-in options. `tableClass` adds a class to the table, restricted to safe characters. `dataLabels` gives each `<td>` a `data-label` attribute, escaped. A caller that passes neither gets exactly the old markup.
(4) | web-app/cn/script_callnotes.html | Under 540px the table shows one card per row, with label and value side by side. The header row is hidden, cells wrap, and an empty cell such as a blank Reason is hidden. The panel is renamed "Email deliveries", and its intro and empty-state copy are updated.
Tests | test/client/run.js | Five new pins:
- the label net in both directions, plus the payload's labels winning in the client;
- the rep-facing reminders, driven (EOD, missed clock-out and coaching recap) plus the shape of the nudge code;
- the two alerts, driven (the spike alert writes one row per send, none per beacon);
- the write-failure counter, view and panel;
- the card layout in `mtRenderTable_` and its CSS rule.
The G3 rows, Admin-read and panel pins are updated: the lost row is counted; `labels` and `writeFailures` ship; the panel is now "Email deliveries".
Tests | test/client/dom/runDom.js | The G3 DOM drive now checks that every cell carries its `data-label`.
Tests | test/visual/mock.js | The populated fixture gains rep rows, `labels` and `writeFailures`. The empty fixture gains the two fields.
Bites | — | 15 hand mutations, all red: the EOD sent row and the unreadable-Sheet row removed; the missed clock-out failed row removed; coaching always logs "sent"; the self-test failed row removed; the spike alert logs on every beacon; a label missing; labels not shipped; failures not shipped; the write failure not counted; the failure view ignores the window; the lost-rows note hidden on a missing tab; `dataLabels` ignored; `tableClass` not restricted; the panel stops passing `dataLabels` (DOM). "Labels not shipped" did not bite at first, because the Admin-read pin never checked `labels` (g116's seventh direction). Adding that assertion, and one for `writeFailures`, made both bite.
Docs | CLAUDE.md, docs/*, .cycle/config.md | The G3 design decision, the DigestDeliveries operator-state entry, the inventory line and the storage map are amended; the new auto-managed property is listed. g53 gets a follow-ups paragraph. INV-377 and S139 are amended. The operator log gets a bullet. The running totals are updated.

TEST RESULTS: passed.
- Pure harness 1330/1330; DOM harness 253/253.
- `npm run lint:server` clean; `counts.mjs --check` clean; `split-manifest.mjs --check` current (1686 declarations).
- Visual matrix `shoot.mjs admin` (19 scenarios), and `admin-system` again after the empty-cell rule: 0 console errors beyond the fonts line, 0 overflow, 0 runaway, 0 squeezed text, 0 missing fixtures. The wide and phone shots of the panel were read by eye: cards at 390px, the lost-rows warning, labels coming from the payload.
- Test Command is `manual`. S139's new step needs the deployed DEV instance: NOT RUN.
REGRESSION RISKS:
(1) Volume. The log now gains about one row per rep per day with flagged notes, plus the missed-punch and nudge rows. At team size that is well inside the 4,000-row read tail for the 14-day view, and the 90-day purge bounds it. A much larger team would reach that tail sooner, and the panel's "older rows were not read" note would say so.
(2) Run time. Each logged send adds one `appendRow` inside the EOD and missed-punch loops. That is about one second per rep at worst, inside six-minute executions.
(3) Shared table helper. `mtRenderTable_` changed only behind two opt-in options; every existing caller renders the same markup, and this is pinned.
(4) Message wording. The self-test alert and the spike alert now catch their send error to log it, then rethrow into their own outer catch, so their Logger behaviour is unchanged.
INVARIANTS AT RISK: None.
- INV-377 is amended, not weakened.
- PHI: the new rows hold staff addresses, keys, counts and fixed phrases. The missed clock-out reason is a date. The EOD row carries a count, never note content.
- A8 / g17: the writer and the failure counter take no lock.
- Q-1: the counter writes through `propSetBounded_`.
- INV-185: both fixtures are updated, and the X1 net passes.
NET SCORE: 0 production fixes − 0 new failure modes = 0. Every item is an extension of the G3 capability, so (a) is NO. (b) is NO: the only new write path is best-effort and never throws into a send.

OPERATOR ACTIONS / DEPLOY:
- Deploy with `clasp push -f` from `web-app/`, then a New version. This ships with E1's deploy, which has not happened yet. No trigger change, so no re-install. | BLOCKS DEPLOY: N
- Walk S139, including its new E1 follow-ups step, on the DEV instance after deploy. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` (prod), or `npm run push:dev` first for the DEV instance

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- Rep-initiated mail (call-note emails, intake sends, form links, the training-question email from a card) is deliberately not in the log; each has its own audit row. Bringing it in would need a decision on volume and on PHI-adjacent reasons.
- `DIGEST_DELIVERY_LOG_FAILS` is shown on the panel but not on the health dot. Raise it to the dot only if lost rows turn out to happen in practice.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
