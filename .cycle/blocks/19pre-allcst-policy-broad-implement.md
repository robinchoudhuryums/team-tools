# 2026-08-28 #4 — ALL-CST policy companions (operator clarification round)

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- CST-1 | Cleanliness verification (the operator's explicit ask: "want to make sure this is a clean solution" given past sheet-tz complications + tz-tied health checks). VERIFIED CLEAN before any code: the sheet-tz machinery (`tzEquivalent_` / `adpSheetTz_` / every `getSpreadsheetTimeZone` consumer, the S1.1 tripwire, Storage Health's tz/locale rows) never reads `EMP.TIMEZONE` — zero overlap with the roster flip. `CONFIG.TIMEZONE` stays Asia/Kolkata; the multi-tz code machinery and the IST/Manila test fixtures are deliberately KEPT (the policy is a data convention, not a code removal). The ONE tz-tied health check that DID need to change is `tzMismatchCheck_` — under the policy its browser-vs-roster comparison would nag exactly the correctly-configured offshore agents every day.
- CST-2 | `tzMismatchCheck_` redesign (script_core.html) — compares the rep's PROFILE timezone against the server-shipped WORK ANCHOR (`empState.workAnchorTz` = `CONFIG.MANAGER_TIMEZONE`, additive on `getEmployeeState`) by UTC offset, never id. Catches the dangerous states for everyone — a blank cell's Asia/Kolkata fallback (the original 2026-08-13 bug) and a pre-policy Manila/Kolkata row — without daily-nagging offshore browsers. Guards: UTC Intl sanity probe; unresolvable anchor or absent `workAnchorTz` (older server) → silent disable; unresolvable PROFILE id still warns (it will be stamped in the fallback tz — the dangerous state). Sticky toast, once per browser-local day (`umsTzWarnedDay`), copy names PROFILE vs anchor + where a manager fixes it.
- CST-3 | `CONFIG.SHIFT_SCHEDULE.BY_TIMEZONE` emptied (Code.js) — the PH `Asia/Manila: 8:30–17:00` entry was wrong twice over under the policy: keyed on a roster value the policy retires, AND written as Manila-LOCAL times when PH agents actually work 8:30–17:00 CST. PH's 8:30 start moves to Employees column O (`8:30-17:00`); India = the 8:00–17:00 DEFAULT. The BY_TIMEZONE mechanism is kept for a future genuine exception; a policy comment above the empty map says all of this in place.

Files modified: web-app/Code.js, web-app/script_core.html, test/client/run.js, CLAUDE.md, .cycle/STATE.md, .cycle/blocks/

CHANGES:
CST-1 | (verification only — no files) | grep-proven zero overlap between EMP.TIMEZONE readers and the sheet-tz axis; `test_perRepSchedule_overrideAndFallback` verified safe for the Manila-entry removal (compares dynamically vs `getShiftSchedule_(tz)`, never asserts the Manila literal).
CST-2 | script_core.html + Code.js | `workAnchorTz: CONFIG.MANAGER_TIMEZONE` on getEmployeeState (additive — an older client ignores it); tzMismatchCheck_ profile-vs-anchor by offset; browser `getTimezoneOffset` comparison RETIRED from the function.
CST-3 | Code.js | `BY_TIMEZONE: {}` + policy comment; Manila entry removed.
PINS | test/client/run.js — count stays **688** | the `tzOffsetMinAt_` behavioural + mismatch-check pin REWRITTEN IN PLACE (the honest bookkeeping for a changed contract): anchor read + `if (!anchor) return;`, `anchorOff === null) return;`, `profileOff !== null && profileOff === anchorOff) return;`, a BAN on `getTimezoneOffset` in the function body, UTC probe + umsTzWarnedDay + sticky + PROFILE copy asserted, the `workAnchorTz: CONFIG.MANAGER_TIMEZONE` wiring (comment-stripped per INV-188), and `BY_TIMEZONE: {}` with the Manila-local entry banned from returning.

TEST RESULTS: pure 688 passed / 0 failed; DOM 82 passed / 0 failed. 3 mutations / 3 bites, commit-before-bite: (A) browser `getTimezoneOffset` comparison restored into tzMismatchCheck_ → pin bites; (B) `workAnchorTz` dropped from getEmployeeState → pin bites; (C) Manila `BY_TIMEZONE` entry re-added → pin bites. Regression Scenarios walked: the tz-warning half of the 2026-08-13 settings-round behaviours (the check still fires once daily, sticky, offset-not-id) PASS under the new comparison; S3/S39/S46 (punch/ribbon/accrual paths) NOT APPLICABLE — no schedule-resolution code changed (the Manila CONFIG entry had no effect once rows read America/Chicago, and column O supersedes per Turn D).

REGRESSION RISKS: (1) Between deploy and the roster flip, offshore agents with pre-policy Manila/Kolkata rows see the new once-daily warning — accurate by design, stops on the flip; the runbook says to do the two close together. (2) A deployment that WANTED per-timezone shifts loses the Manila seed — deliberate: that seed was wrong (Manila-local times), and the mechanism is kept.
INVARIANTS AT RISK: None violated — INV-71/INV-149 resolution order untouched (column O over per-tz over DEFAULT); the sheet-tz invariants (S1.1, Storage Health, INV-29/64/141/142) are provably outside the change; the tz pin was rewritten, not weakened (3 bites).

NET SCORE: 1 production fix (the tz-mismatch check would have mis-fired daily on every correctly-configured offshore agent post-flip — the policy's one code casualty, fixed before the flip) − 0 new failure modes = +1. CST-1 is verification; CST-3 corrects latent-wrong config.

OPERATOR ACTIONS / DEPLOY (the RUNBOOK — also recorded in CLAUDE.md's 2026-08-28 #4 entry):
- (1) Deploy this round (`clasp push -f` + New version) | BLOCKS DEPLOY: — (is the deploy)
- (2) On a WEEKEND (no rep works Sat/Sun CST — no shift straddles the seam): Employees sheet → `Timezone` = `America/Chicago` on EVERY agent row; column O = `8:30-17:00` for PH agents (India = DEFAULT, no column O). Roster cache ≤5 min | BLOCKS DEPLOY: N (post-deploy)
- (3) Break schedules: all times in the Default section as CST wall times; Revert/delete any per-timezone section | BLOCKS DEPLOY: N
- (4) BEFORE SEPT 1 (first hours-driven August accrual credit, 18:00 CST): review offshore agents' August timesheets — pre-flip split days read INCOMPLETE and under-credit the accrual; Day-Edit pairs onto one date or top up balances manually (credits are deltas; audit rows name hoursWorked=) | BLOCKS DEPLOY: N (time-boxed)
- Post-deploy `runAllTests()` — still expects **296** | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

FOLLOW-ON ITEMS:
- The day-keyed structural consequences of pre-policy data (split August days) are repaired by the runbook, not by code; if the operator prefers a bulk repair over Day Edit, that is a new scoped request.
- `sendTrainingOverdueDigest`'s documented rep-tz/manager-tz latent becomes moot once every row is America/Chicago.

DOCUMENTATION UPDATES NEEDED: None — applied in this session (CLAUDE.md: Timezone-model concept (3) rewritten for the policy + the independence-of-axes verification note; the FOURTH-consequence paragraph rewritten for the anchor redesign; the CONFIG.SHIFT_SCHEDULE entry amended; new 2026-08-28 #4 operator entry with the runbook; narrative note that the pin was rewritten in place — count stays 688. STATE.md NEWEST #9.)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
