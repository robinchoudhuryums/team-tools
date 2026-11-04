---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (operator round 2026-11-02, not audit findings — Batch C of the plan agreed in chat: the Spanish Inbox items)
New capabilities (G/ST): Batch C — the Spanish Inbox:
  - C1 an in-app notice for the assignee: a count on the Spanish Inbox tab, its tool in the sidebar and the phone's bottom nav (g99 — every nav form), and a sticky toast with Open when a NEW request is assigned by someone else while the app is open; polled every 3 minutes from the new `getMySpanishAssignments` (ids, times, the assigner — never content); the first answer in a browser is a silent baseline, seen ids are shared by every window (`umsSpanishAssignSeen`), a self-claim never toasts, an unreadable answer keeps the last count; Needs-you and the badge read through ONE reader, `spanishMyOpen_` (g126)
  - C2 multi-select resolve: a checkbox on every pending card, a bar (Select all shown · N selected · Resolve selected · Clear), ONE call `resolveSpanishThreads` — gated first, at most `SPANISH_BULK_RESOLVE_MAX` (50) refused whole, every thread read outside the lock, one lock / one fold read / one write, each judged by the single resolve's coverage rule (`spanishResolveCovered_`, now shared); what it cannot resolve is named and stays selected; Select all takes only visible cards
  - C3 grouping past `SPANISH_GROUP_MIN` (15) per section: collapsible groups by Date received (Today / Yesterday / a date / Date unknown) or Department (largest first, Other and Voicemail last), the choice kept in `umsSpanishGroupBy`, each group capped on its own and remembering whether it is open; the sender's department from the department map's mailboxes, then the roster's Departments column (`spanishSenderDeptIndexFrom_`, never by domain), a failed read said beside the count; every card shows its received date in the top corner (`receivedMs` on pending and resolved items)
Files modified: web-app/51_spanish.js, web-app/20_timeclock.js, web-app/00_config.js, web-app/metrics/script_metrics.html, web-app/script_core.html, web-app/styles.html, handbook-app/styles.html (the sync's copy), test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, docs/design-decisions.md, docs/modules.md, docs/operator-log.md, docs/test-harness-log.md, .cycle/config.md (INV-392, S151), CLAUDE.md (counts only — no line added), .cycle/STATE.md
Estimate: M (~5 h) — written to STATE.md before the first edit
Actual: M (~4 h)

CHANGES:
C1-server | web-app/51_spanish.js, 20_timeclock.js | `spanishMyOpen_(emp, claims)` (the claims + cached pending ids, a live read only on a miss for a claim holder, throws on a failed read); `getMySpanishAssignments()`; Needs-you's Spanish block reads through `spanishMyOpen_`
C2-server | web-app/51_spanish.js, 00_config.js | `SPANISH_BULK_RESOLVE_MAX`; the pure `spanishResolveCovered_` (shared with `resolveSpanishThread`) and `spanishBulkIds_`; `resolveSpanishThreads(threadIds)`
C3-server | web-app/51_spanish.js | the pure `spanishSenderDeptIndexFrom_`, `spanishSenderDeptIndex_`, `spanishSenderDeptSafe_`; `spanishPendingCore_` and `getSpanishInboxResolved` carry `senderDept` and `receivedMs` per item and `deptUnavailable`
C1-client | web-app/metrics/script_metrics.html, script_core.html | `SP_ASSIGN`, `spAssignStart_` (from the shell's boot), `spAssignPoll_`, `spAssignPollSoon_` (after a claim, release, resolve or auto-assign), the pure `spAssignNew_` / `spAssignToastText_`, `spAssignApply_`, `spAssignPaint_` (renderToolTabBar repaints it); `.sp-assign-badge`
C2-client | web-app/metrics/script_metrics.html, styles.html | `SPANISH_STATE.selected`; `spanishSelBoxHtml_`, `spanishSelPrune_`, `spanishSelIds_`, `spanishSelVisibleBoxes_`, `spanishSelToggle_`, `spanishSelAll_`, `spanishSelClear_`, `spanishBulkBarHtml_`, `spanishSelSync_`, `spanishResolveSelected_`, the pure `spanishBulkResultText_`; the single resolve drops its selection too
C3-client | web-app/metrics/script_metrics.html, styles.html | `SPANISH_GROUP_MIN`, the pure `spanishLocalIso_` / `spanishGroupOf_` / `spanishGroups_`, `spanishGroupMode_`, `spanishSetGroupBy_`, `spanishGroupedSections_`, `spanishGroupSwitchHtml_`, `spanishSectionHtml_` (g133 — the group key is read off its details, never written into the handler), `spanishGroupToggled_`, `spanishDeptNote_`, `spanishReceivedHtml_`; the card head's corner (date + age) and its wrap

TEST RESULTS: Test Command is `manual`. Regression Scenarios touching the Spanish Inbox were walked by reading against the change: the claim / assign / auto-assign / single-resolve scenarios keep their rules (the single resolve now shares its coverage rule and also re-polls the badge); the Needs-you Spanish item is the same item from the same data through the shared reader; S151 is new and NOT RUN in the deployed app (it needs two browsers and a live inbox).
  Pure 1500/1500 (four new pins; the F14 and E4 Needs-you drives, the C-8 and SP-2 source pins, the SP-1 drive, the display-cap pin and the Spanish list sandboxes moved to the new shape). DOM 363/363 (three new drives). Visual: the five spanish scenarios measure clean (two new; the first run measured a 19px sideways overflow at phone width and a requester squeezed to 4px on a crowded card — the head now wraps, re-measured 0); the shots read (the groups, the bar, the date in the corner, the tab's count). lint-server clean; handbook-sync in step (styles.html copy); counts in step; the manifest revision recorded.
  Bite-checks (scratch worktree): see the commit's follow-up line in STATE — listed below once run.
REGRESSION RISKS: (a) The card head's pills now sit beside the requester instead of spread across the row (the corner takes the free space) — a layout change on every Spanish card. (b) A department map or roster read failure no longer fails the list — it is said beside the count and the senders group as Other. (c) The poll adds one light RPC per member every 3 minutes (a hidden window skips); on a pending-id cache miss for a claim holder it can trigger the one live inbox read Needs-you already did. (d) An older open client (not reloaded after the deploy) keeps working; its cards have no date and it has no badge.
INVARIANTS AT RISK: None. INV-392 (new) covers the bulk resolve and the selection; g53 / METUI-1 (a failed poll keeps the count), g99 (every nav form), g126 (one reader for Needs-you and the badge), g133 (no name in a handler literal), g143 (both new endpoints gate on getEmployeeInfo_ + canSeeSpanishInbox_), F58 (the caller before any read or the lock), g145 (appendRowsSafe_), g112 (two new ums… keys, try/catch on every access).
NET SCORE: 0 production fixes − 0 new failure modes = 0 (new capability)

OPERATOR ACTIONS / DEPLOY:
- Team Tools: `clasp push -f` from `web-app/` + New version | BLOCKS DEPLOY: N
- Handbook app: `npm run handbook:push` + New version only when convenient (its styles.html copy changed; nothing in it uses the Spanish rules) | BLOCKS DEPLOY: N
Deploy: Team Tools — `clasp push -f` + New version; handbook app — `npm run handbook:push` + New version (copy only)

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The Metrics answer-rate badge (`mPollAmbient_`) still finds ONE nav form with `||` — the g99 class CNUI-09 fixed for Call Notes; on a phone a manager never sees it. Not changed here.
- The rest of the plan: E, D, G, F, H (STATE.md Pending). Batch E moves the Spanish tab under the Dashboard tool; the badge looks the tool up, so it follows.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
