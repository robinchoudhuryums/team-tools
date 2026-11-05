---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (P1 is a new capability from the operator's 2026-11-05 round).
New capabilities (G/ST): P1 — the pay-week timesheet reminder: one rule for the day, a Needs-you item with Review and Done, a Time / PTO banner, and an email at 9am the rep's time on the day.
Files modified: web-app/00_config.js, web-app/10_core.js, web-app/20_timeclock.js, web-app/styles.html, web-app/tc/script_clock.html, web-app/tc/script_timeoff.html, web-app/cn/script_callnotes.html, handbook-app/styles.html (the sync copy), test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, CLAUDE.md, .cycle/config.md, .cycle/STATE.md, docs/design-decisions.md, docs/modules.md, docs/operator-state.md
Estimate: M (~4–5 h)
Actual: ~3.5 h (the health registries were the bulk; the pins named each one that was missing)

CHANGES:
P1 | 00_config.js | PENDING_TASKS_KINDS + 'payWeek'; PAY_WEEK_MONTHLY_MIN_DAYS (4) and PAY_WEEK_REMINDER_HOUR (9); the job in runHourlyJobs (before the Spanish auto-assign) and TRIGGER_HANDLER_JOB_KEYS; DIGEST_ERROR_KEYS, AUTOMATION_ERROR_LABELS and the delivery-log labels; the `payWeekReminderEmail` server toggle (default on).
P1 | 20_timeclock.js | payWeekReminder_ (pure: biweeklyRangeFor_'s period or the calendar month; biweekly the final week's Monday, monthly the last Monday with at least four days left; past weekend/holiday, never past the end); payWeekForEmp_ (the company calendar around today); payWeekDateText_, payWeekTask_; the Needs-you item from the rep's own today; the calendar payload's `payWeek`; sendPayWeekReminders (manager-gated, heartbeat before the toggle, hour-equality per rep tz, a delivery row per send, ok/idle/partial/failed); payWeekEmail_ (the branded chrome, the period and the day only, a link to Time / PTO).
P1 | 10_core.js | DIGEST_STALE_HOURS.payWeek = 2 (hourly).
P1 | tc/script_clock.html | the payWeek icon/label; Done (umsPayWeekDone, per browser, try/catch) hides the item for its period while every other row keeps its payload index; the count follows.
P1 | tc/script_timeoff.html, styles.html | the pay-week banner atop the calendar (role=status), info tones.
P1 | cn/script_callnotes.html | Automation Health's digest label and expectation for payWeek.

TEST RESULTS: pure 1525/1525 (3 new pins), DOM 377/377 (2 new drives). Visual: clock-light-wide/mobile and timeoff-light-wide/dark-wide/light-mobile measure 0 overflow, 0 runaway, no squeezed text, no errors; the shots were read. Bite-checks: BITES_PLACEHOLDER. Test Command is manual: S158 overlaps (and S7/S9-class Time / PTO walks) — NOT walked here (operator, after deploy).
REGRESSION RISKS: (1) The email is ON by default: after the deploy, every employee whose reminder day it is gets one email at 9am their time — that is what the operator asked for; the toggle turns it off. (2) A biweekly employee gets nothing while no roster row carries a biweekly PayAnchor (the period cannot be placed; the export has the same need). (3) A trigger firing twice inside one hour would send a duplicate — the EOD digest's accepted posture.
INVARIANTS AT RISK: INV-44 (trigger handlers manager-gated) — held, pinned; INV-151/INV-179 (heartbeat; the digest set derived from DIGEST_STALE_HOURS) — payWeek added to every registry, the coupling pin passes; ST2's outcome contract — every return goes through automationOutcome_; g112 (localStorage) — `umsPayWeekDone`, try/catch, counted. New: INV-399.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (one new capability)

OPERATOR ACTIONS / DEPLOY:
- Team Tools `cd web-app && clasp push -f`, then a New version | BLOCKS DEPLOY: N
- Handbook app `npm run handbook:push`, then a New version (its styles.html copy changed) | BLOCKS DEPLOY: N
- Decide whether the email stays on (Manage → Admin → Feature Toggles → Pay-week timesheet reminder email) | BLOCKS DEPLOY: N
- Walk S158 on DEV | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured

FOLLOW-ON ITEMS:
- The reminder does not name what to check (an open day, a pending request); the manager's close checklist finds those — a per-rep summary would be a second reader of the same data.
- Done is per browser, so a rep who uses two computers dismisses it on each.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made: design-decisions (new entry + CLAUDE.md index link), modules.md, operator-state.md (the toggle), .cycle/config.md (INV-399, S158), the counts block.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
