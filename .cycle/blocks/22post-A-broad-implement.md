---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Batch A of the 22post plan (operator testing notes, agreed 2026-09-27)
- A-1 — a Close Order email REQUIRES a reason: a preset dropdown (CONFIG.CALL_NOTES.CLOSE_ORDER_REASONS, incl. "Dissatisfied with services" and "Due to cost") or "Other — type it"; the server refuses on preview and send
- A-2a — Scratchpad: standard modal buttons; instant reopen from the session copy; prefetch on intent; the backdrop closes only on a press that started there
- A-6 — Dept Requests: a visible sort (Newest / Oldest / Longest open, open first) and a date range (7 / 30 / 90 days / custom) over every list; the server caps the NEWEST rows
- A-7 — Dept Requests for managers/admins: team-wide summary cards beside "Resolution time by department", then team-wide, Incoming, My requests
Files modified: web-app/00_config.js, web-app/30_callnotes.js, web-app/50_deptrequests.js, web-app/cn/script_callnotes.html, web-app/script_core.html, web-app/metrics/script_deptrequests.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md (running totals), .cycle/STATE.md
Estimate: M (~6 h) — 1 S 1.5h · 2a S 1.5h · 6 S 1.5h · 7 S 1.5h
Actual: ~3 h

CHANGES:
A-1 | 00_config.js, 30_callnotes.js, cn/script_callnotes.html, mock.js | CLOSE_ORDER_REASONS (seven presets) shipped by getCallNotesDepartments as `closeReasons` (never mirrored client-side; with no list only "Other" is offered). cnCloseReasonError_ (pure) inside validateEmailSelections_, so previewCallNoteEmail AND emailFromCallNote refuse a Close Order with no reason. The subform is a required <select> + an "Other" text box; closeDetails = {reason, reasonCode} (reason is still the string the email prints). cnComposerGoToPreview_ marks the empty control aria-invalid, focuses it and stops before the preview. The win-back nudge reads the code (cnCloseIsSwitching_): the "Changing suppliers" preset nudges, other presets never do, typed/legacy text keeps the loose read. A saved legacy free-text reason reopens as "Other".
A-2a | cn/script_callnotes.html, script_core.html | Save now / Close use .btn-modal-ok / .btn-modal-cancel in a .modal-footer (.cn-act-btn is styled only in cards and the reminders modal, so they rendered unstyled). CN_SCRATCH.cache holds the last loaded/saved copy: a reopen paints it enabled at once, the read refreshes it only if the rep has not typed, and a failed refresh keeps the copy editable with a stated warning (a cold open still shows the A12 warn card). cnScratchPrefetch_ warms the copy on pointerenter/focus of the button. ensureOverlay's backdrop closes only when the press STARTED on the backdrop (a text selection dragged out of the pad used to close it). The planned "skip the uncached roster read" was dropped: getEmployeeInfo_ reads the cached roster (300 s) — the research note was wrong.
A-6 | 50_deptrequests.js, metrics/script_deptrequests.html, mock.js | Items ship createdMs; mine sorts drNewestOpenFirst_ before the DR_LIST_CAP slice (it kept the OLDEST 100 before). Client: DR_SORT + DR_RANGE, drSortCmp_ / drInRange_ (pure), one drListView_ pipeline (dept chips → range → sort) for mine, incoming and team-wide; the shared mtDateRange_ control with a Custom row; an undated row is kept by a range; a truncated window names the oldest date loaded. Cache key dept_req_v1 → v2.
A-7 | 50_deptrequests.js, metrics/script_deptrequests.html, mock.js | drTeamKpis_ (pure; median over timed resolves only) ships as teamKpis for managers; drKpiStripHtml_ renders the team strip ("· team" labels + a scope line) in the same #dr-kpi wrapper. drManagerSectionHtml_ split into drMgrStatsHtml_ (#dr-mgr-stats) and drMgrTeamHtml_ (#dr-mgr-team); the manager order is controls → [cards | resolution table] → team-wide → Incoming → My requests; a rep's order is unchanged. drApplyResolved_ moves the team counts once per request; drReconcile_ repaints the strip. .dr-top-row stacks under 900 px and in the pop-out (g50).

TEST RESULTS: passed — pure harness 1040/1040 (was 1036; +4), DOM 158/158 (was 156; +2), lint:server clean, counts --check agrees, split manifest regenerated. Pins updated for deliberate changes (Category A): the L-1 validator group's base now carries a close reason; the DR dept-filter pin reads the drListView_ pipeline; the DR cache-key pin reads v2; the repaint-anchor and Not-timed pins read the split renderers. Bite-checks: 19 run, 15 BITE on the final pins — two NO BITEs acted on (the A-1 server pin asserted only that the validator CALLED the helper, and the client pin only the guard's text order; both now drive validateEmailSelections_ / cnComposerGoToPreview_), and one mutation refused for an unescaped quote and re-run. Visual +3 scenarios (deptreq-light-compact, deptreq-dark-wide, cn-scratchpad-dark-wide) + deptreq-light-wide / -expanded re-shot: 0 px overflow, no missing fixture, only the proxy CERT line; the top row stacks in the pop-out; the team Median cell's sub-line ellipsizes at half width.
Regression scenarios (Test Command manual): S74 (Dept Requests), S34/S59-adjacent Call Notes composer, S114/S115-adjacent Scratchpad — NOT APPLICABLE here: each needs the deployed app; the driven pins cover the functions they walk.

REGRESSION RISKS:
- A-1: a Close Order with no reason is now refused by the server — including from a tab still running the pre-deploy client (it sends the free-text reason; a blank one is refused with the message).
- A-2a: a reopen shows the session copy for the moment the refresh takes; a rep who types in that moment keeps their text and their save wins over a newer copy saved from another window (last-write-wins was already the stated rule, but before, the rep saw the newer copy first).
- A-6: the cache key bump costs one cold DR read per rep after deploy.
- A-7: a manager no longer sees their OWN request KPIs in the strip (team-wide by decision); their own list is still below.

INVARIANTS AT RISK: None broken. Touched: g100/INV-145 (overlay close — the backdrop rule tightened, hooks unchanged), g120 (the reason list is the server's, not a mirror), INV-185 (fixtures carry closeReasons, createdMs, teamKpis), g50 (the top row has a data-compact override AND a media query), the T6 ratchet (.cn-req-mark, .dr-top-row, .dr-top-kpi/.dr-top-stats, .dr-controls, .dr-sort, .dr-kpi-scope all have rules), note #3 (the team median skips in-app resolves too).

NET SCORE: 3 − 1 = +2
- Production fixes (would have fired this month): A-1 (a Close Order could go out with no reason — the operator's report), A-2a (every Scratchpad open showed unstyled native buttons and waited on a server read), A-6 (the tracker's order was unlabelled and "My requests" listed oldest-first within each group — the operator's report).
- New capability: A-7 (the manager layout and team-wide cards — a requested change, not a defect).
- New failure mode: A-2a's stale-paint window (above). Low.

OPERATOR ACTIONS / DEPLOY:
- None. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → New version

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- No visual scenario opens the email composer on a Close Order (the required dropdown and its invalid state are not photographed).
- The team Median cell's sub-line ("to resolve · N marked in app, not timed") ellipsizes at half width.
- The date range filters the lists, not the resolution table or the summary cards (both are server-derived over the loaded window) — stated on the page only by the scope line.
- The backdrop tightening applies to every dynamic overlay — deliberate, but only the Scratchpad was reported.

DOCUMENTATION UPDATES NEEDED:
- docs/modules.md (Call Notes: Close Order reason, Scratchpad; Metrics: Dept Requests sort/range + manager layout), docs/operator-log.md (a 22post Batch A entry: no operator state), docs/design-decisions.md (the Close Order reason list; the DR manager layout), docs/gotchas.md (amend g100: the backdrop closes only on a press that started there), docs/operator-state.md (the "Call-notes department list" neighbour: CLOSE_ORDER_REASONS is CONFIG-only), .cycle/config.md (invariants for the required reason, the backdrop rule, the DR list pipeline and team KPIs; walk steps on S74 and a composer scenario), docs/test-harness-log.md.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
