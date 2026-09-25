---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: the follow-on items from the Batch 6, 7 and 8 blocks, plus the owed T5 half-day rework (operator rule 2026-09-25)
- T5r — a half day has NO fixed start or end: graded on HOURS WORKED (at least half the typical day, CONFIG.PTO_HOURS_PER_DAY / 2), never on its start or lunch; the reminder ticker assumes no half
- B6-1 — the urgent digest stamps a failed read (heartbeat withheld) and clears it on a clean run
- B6-2 — the daily brief names the urgent-note rep Sheets it could not read (it read only `.results`)
- B6-3 — an unreadable ClientErrors tab reaches the health dot and the failure digest
- B6-4 — a daily job with NO run on record is flagged once the AuditLog read reaches back past its stale window
- B6-5 — the trigger installer is recorded; a detector names them once offboarded
- B6-6 — QA_MEMBERS / SPANISH_INBOX_MEMBERS: decided NO edit (both gates need a roster employee, so an offboarded member has no access)
- B6-7 — one "cannot confirm" caption under Automation last seen, instead of one per row
- B7-1 — the flows that CREATE a task (assignment, issued document, coaching item) bust the target rep's Needs-you cache
- B7-2 — a repeat caller's voicemail thread expands to the NEWEST voicemail; the card pill says how many are waiting
- B7-3 — finishing a task in one window invalidates the Needs-you list in the others (BroadcastChannel; nothing persisted)
- B8-1 — every Employee Doc read checks the content hash; an altered document says so to whoever reads it
- B8-2 — an unreadable weight answer is warned ON the PPD recommendation screen
- B8-3 — a voided form token writes a FormTokenVoided audit row (by reference, never the live token)
Files modified: web-app/00_config.js, web-app/10_core.js, web-app/20_timeclock.js, web-app/30_callnotes.js, web-app/51_spanish.js, web-app/60_intake.js, web-app/61_forms.js, web-app/80_training.js, web-app/81_empdocs.js, web-app/82_coaching.js, web-app/script_core.html, web-app/tc/script_manager.html, web-app/tc/script_clock.html, web-app/cn/script_callnotes.html, web-app/metrics/script_metrics.html, web-app/intake/script_intake.html, web-app/train/script_empdocs.html, test/client/run.js, test/client/server-split-manifest.json, test/visual/mock.js, CLAUDE.md (running totals), .cycle/STATE.md
Estimate: L (~10 h) — T5 rework M 2h · urgent-digest error S 0.5h · clientErrors on the dot S 0.25h · daily job no-run evidence S 1h · trigger-installer offboard S 1h · QA/Spanish lists S 0.5h · one cannot-confirm caption S 0.25h · creating flows bust S 0.5h · voicemail body + count S 1h · cross-window invalidation S 0.5h · doc integrity on read S 1h · inline weight warning S 0.5h · void audit row S 0.25h
Actual: ~4 h

CHANGES:
T5r | 20_timeclock.js | getPunctualityReport reads the PTO overlay FIRST and over the previous range too; a half-day date keeps all four punch types (punchDayAdd_) and is graded by punctHalfDayVerdict_ through calcHours_: `half` (met), `halfshort` (under; no clock-in = 0 h), `halfopen` (no clock-out / unparseable, or the day is today or later in the rep's frame — not over yet). Half days are excluded from on-time, lunch and the previous range; the rep ships halfDays/halfShort, onTimePct is null when no full day was graded, and a rep with only half days is still listed. punctExpectedStartMin_ (the mid-shift rule) removed; punctIsHalfDay_ added. getEmployeeState ships halfDayMinHours.
T5r | tc/script_manager.html | three strip states with their own rules and legend entries; punctHalfDayTitle_ ("4.5h worked, meets 4h" / "hours not known"); outliers include a short half day; the On-time cell and outlier line render a dash for a null figure; the coaching narrative and the page note name the rule.
T5r | script_core.html | remindWorkWindow_ replaced by remindDayPlan_: a half day has no break reminders, no inferred clock-out (outAt null), and the not-clocked-in nudge opens at shift end − minHours and only when nothing has been worked today (remindWorkedToday_); a full day unchanged.
B6-1 | 30_callnotes.js | sendCallNotesUrgentDigest: stampAutomationError_('CallNotesUrgentDigest') in the catch; clearAutomationError_ on a clean run.
B6-2 | 10_core.js | sendManagerDailyBrief keeps the aggregate and pushes "urgent notes (N rep Sheet(s) unreadable)" onto failedSources (the email and the ManagerDailyBrief stamp).
B6-3 | 10_core.js | automationProblems_: clientErrors.error → a `clientErrors`/`read` problem (the client already renders that kind).
B6-4 | 10_core.js | computeAutomationHealth_ ships auditWindow.startMs (the oldest row read); auditWindowProvesAbsence_; automationJobProblems_ flags a daily job with no run on record when the window reaches back past staleHours.
B6-5 | 00_config.js, 10_core.js | AUTOMATION_TRIGGER_OWNER_PROP stamped by installAutomationTriggers ({email, at}); triggerOwnerOffboarded_ + the `triggerOwner` detector (offboarded record AND not back on the roster — false-positive-free).
B6-7 | cn/script_callnotes.html | cnRunNeverText_ is short; cnRunNeverCaption_ says why once under the section.
B7-1 | 80_training.js, 81_empdocs.js, 82_coaching.js | saveTrainingAssignment busts every target (or all); issueDoc busts on a non-draft; createCoaching busts the rep.
B7-2 | 51_spanish.js, metrics/script_metrics.html | spanishThreadBodyMessage_ picks the newest voicemail (scope guard still on the first message); body ships vmCount; spanishVmPillHtml_ reads "N voicemails".
B7-3 | tc/script_clock.html | clkNeedsYouInvalidate_ posts on a BroadcastChannel ('team-tools-needs-you', not a localStorage key); a peer message invalidates without echoing.
B8-1 | 81_empdocs.js, train/script_empdocs.html | empDocReadIntegrity_ ('ok' / 'altered' / 'unverifiable'); getMyDoc ships `integrity`; edIntegrityNoteHtml_ (the owner and a manager are told of an altered doc; only a manager sees "unverifiable"), .ed-integrity-note rule.
B8-2 | 60_intake.js, intake/script_intake.html | intakePreviewPPD ships weightUnreadable (the engine's own derivation); intakeWeightWarnHtml_ above the recommendation cards, .intk-weight-warn rule.
B8-3 | 61_forms.js, 30_callnotes.js, 00_config.js | formTokensVoid_(tokens, emp) writes FormTokenVoided per withdrawn token (tokenRef only); added to CN_AUDIT_ACTIONS.
Fixtures | test/visual/mock.js | halfDayMinHours; punctuality reps carry a short and a met half day; the Spanish voicemail card carries vmPending 2 and the stats count both; auditWindow.startMs; the triggerOwner detector.

TEST RESULTS: passed — pure harness 1022/1022 (was 1011: T5 split into two pins, +5 FU-B6, +5 FU-B7/B8), DOM 156/156, lint:server clean, counts --check agrees, split manifest regenerated three times with reasons. Every fix bite-checked (20 bites, all BITE): verdict threshold, previous-range exclusion, graded-dates exclusion, today-not-short, the reminder plan, outliers; urgent stamp, brief skipped Sheets, clientErrors read, absence window, installer offboarded, caption; assignment bust, newest voicemail, pill count, broadcast echo, integrity, owner note, weight warning, void audit. Pins updated for the new shapes: A2 (punchDayAdd_ call count 7 → 8), A1 caption pin, C7 (void takes emp + audits), the voicemail pill wiring pin, three sandboxes that load automationJobProblems_. Visual (8 scenarios: punctuality-expanded/mobile/dark, spanish/expanded, admin-system light/dark, intake): 0px overflow, only the known proxy CERT console line; the punctuality strip shows the short half day with its legend entry and the "1 short half day" outlier line; the Spanish card reads "2 voicemails".
Regression scenarios (Test Command manual): S98 (Punctuality diagnostics), S101 (Needs you), S76 (reminders), S55 (urgent digest), S24, S30, S117 (automation health), S80/S105 (Spanish), S69 (Employee Docs), S59 (PPD recommendation + send), S99 (coaching) — NOT APPLICABLE here: each needs the deployed app / the Apps Script editor; the harness pins above drive the server and client functions they walk, and the visual pass covered S98/S80/S117's surfaces.

REGRESSION RISKS:
- getPunctualityReport's payload gains `halfDays`/`halfShort` and day states `half`/`halfshort`/`halfopen`, and `onTimePct` can be null. The client handles all of them; an OLDER client would render "null%" for a half-day-only rep and a grey dot for the new states — the client ships with the server.
- punctWeeklyBuckets_ counts only ontime/late, so half days fall out of the weekly bars automatically — intended.
- The daily no-run check can alarm for a job whose feature flag was switched on less than one run ago (enabled, never run, long AuditLog): the NEW FAILURE MODE below.
- getSpanishInboxThreadBody now returns the newest voicemail on a voicemail thread; an email-request thread is unchanged (first message).
- remindWorkedToday_ reads empState.punches; a stale snapshot says "not worked" — the nudge still requires a freshly confirmed 'out' state, as before.

INVARIANTS AT RISK: None broken. Touched: INV-176 (an unknown duration is not elapsed — `halfopen`, held), INV-187 (a failed read is not an empty one — B6-1/2/3, strengthened), INV-185 (fixtures mirror the payload — halfDayMinHours, half-day states, startMs, triggerOwner, vmPending all mirrored), S4's rule (never the live token in the audit log — FormTokenVoided logs tokenRef), the T6 ratchet (every new class has a rule; the channel name is not an `ums…` literal, so the localStorage-key count is unchanged).

NET SCORE: 3 − 1 = +2
- Production fixes (would have fired this month): T5r (every half day in the Punctuality range was graded against a start it does not have — pre-T5 as ~half a shift late, the shipped T5 against mid-shift), B7-1 (a rep with a cached list did not see a new assignment / document / coaching item until the cache aged out), B7-3 (a task finished in the pinned pop-out left the main window's Needs-you list stale). The rest are defensive (rare failure paths, or behind a flag).
- New failure mode: B6-4 — a daily job enabled moments ago has "no run on record" against a long AuditLog and alarms until its first run (at most one stale window). Documented in the code comment; the message says "may be missing", which is the honest reading.

OPERATOR ACTIONS / DEPLOY:
- After deploy, re-run installAutomationTriggers() once from an active manager account, so the installer record exists (until then the triggerOwner detector has nothing to check and stays silent) | BLOCKS DEPLOY: N
- Verify 8x8 threading on a real repeat caller (M5's premise — the card count and the newest-voicemail body both depend on Gmail threading same-subject voicemails) | BLOCKS DEPLOY: N
- Tell managers the Punctuality page now grades a half day on hours worked (at least 4 h) and flags a short one | BLOCKS DEPLOY: N
- AUTOMATION_TRIGGER_OWNER is a new auto-managed Script Property; delete it to forget the installer | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → New version (with Batches 1–8, S2 and F1–F5 — none is deployed yet)

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The half-day grade uses the day's single ClockIn/ClockOut pair (punchDayAdd_ is last-wins for clock punches, the repo-wide multi-shift limit); a half day worked as two separate stints would under-count.
- The B6-4 check cannot tell "just enabled" from "missing"; recording when a job's flag was switched on would close it.
- A half day with no PTO overlay (ptoUnavailable) is graded as a full day — the page already says the overlay is missing; the half-day rule inherits that.
- The expanded voicemail body shows only the newest voicemail; earlier ones on the thread are reachable through Open in Gmail.
- The half-day strip states, the integrity note, the weight warning and the "cannot confirm" caption have no dedicated visual scenario (the punctuality and Spanish fixtures now show theirs).

DOCUMENTATION UPDATES NEEDED:
- CLAUDE.md gotcha index + docs/gotchas.md: amend g15/g59-family or add a gotcha — "a half day has no fixed start" (grade on hours, the reminder plan assumes no half); amend g152 (a daily job's absence is evidence only past its stale window — auditWindowProvesAbsence_); amend g153 (the trigger installer is a person too — AUTOMATION_TRIGGER_OWNER); amend g67 (creating flows owe the bust too; the cross-window channel).
- docs/operator-state.md: AUTOMATION_TRIGGER_OWNER (auto-managed) + its CLAUDE.md inventory line / storage-map diagnostics list.
- docs/modules.md: Punctuality half-day grading; reminders on a half day; Spanish repeat-voicemail pill and body; Employee Docs read-time integrity; PPD weight warning.
- .cycle/config.md: invariants for the half-day rule, the daily absence window, the installer detector, the read-time integrity check; walk steps on S98, S76, S101, S80, S69, S59, S117.
- docs/operator-log.md: a dated entry for the half-day rule.
- Docs are still owed for Batches 7 and 8 as well.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
