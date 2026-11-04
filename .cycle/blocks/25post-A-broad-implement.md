---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (operator round 2026-11-02, not audit findings — Batch A of the plan agreed in chat; STATE.md Pending holds the batch plan)
New capabilities (G/ST): Batch A — small fixes:
  - A1 Reference above Intake in the sidebar (the TOOLS key order is the nav order)
  - A2 the note template's "Highlight any text inside…" line → an ⓘ tooltip on the frame stamp's own copy hint (the intake data-tip bubble pattern, opening down, right-anchored)
  - A3 Scratchpad: a colour or size chosen with NOTHING selected applies to the next typing (an empty palette span at the caret, splitting the current run; the save strips the zero-width placeholder and unused spans); a visible resize grip drawn over the browser's own handle
  - A4 Spanish Inbox auto-assign: "Assigning…" with the dots loader, disabled and aria-busy, drawn from state so a list render mid-run cannot re-enable it; the flag clears before the view guard
  - A5 the clock reminders carry their punch: Clock out (still clocked in), Clock in (not clocked in), Lunch out (the Lunch break only — a rest break is not punched); offered only when empState.nextActions allows it, re-checked at the click, through the Clock view's own submitPunch from any page
  - A6 the Spanish escalation digest reads the one 30-day pending window (was 90 — operator: last 30 days only; it already went to MANAGER_EMAILS only)
  - A7 Dept Requests: each list's own default order (Oldest open + Incoming longest open; My requests newest; Recently resolved latest RESOLVED — the client had re-sorted it by sent date), named on every heading; a chosen sort applies to all and says so; the manager summary row at the very top, above the chips and the sort
  - A8 `--warn-fill`: filled amber surfaces (Lunch Out, the lunch chip, pressed amber chips, amber badges) paint a lighter amber in light mode (#dda23a, ink 8.02:1); `--warn` stays for amber text (~30 uses, where lighter would fail); dark mode unchanged
Files modified: web-app/script_core.html, web-app/cn/script_callnotes.html, web-app/metrics/script_metrics.html, web-app/metrics/script_deptrequests.html, web-app/styles_design_tokens.html, web-app/tc/script_clock.html, web-app/train/script_coaching.html, web-app/intake/script_intake.html, web-app/00_config.js, handbook-app/styles_design_tokens.html (the sync's copy), test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, docs/design-decisions.md, docs/gotchas.md, docs/modules.md, docs/operator-log.md, docs/operator-state.md, docs/test-harness-log.md, CLAUDE.md (g170's index line + counts — no line added), .cycle/STATE.md
Estimate: M (~4 h) — written to STATE.md before the first edit
Actual: M (~3.5 h)

CHANGES:
A1 | web-app/script_core.html | the `reference` TOOLS entry moved above `intake` (renderShell builds the sidebar and the mobile nav from the key order)
A2 | web-app/cn/script_callnotes.html | `.below-doc` removed; `cnCopyTip_(mod)`; `.cn-tip` (data-tip, role=img + aria-label, hover and focus-visible)
A3 | web-app/cn/script_callnotes.html | `cnScratchPendingStyle_`, `cnScratchHtmlOf_` (every save capture goes through it), `cnScratchToolClick_`'s collapsed branches; `.cn-float-panel::after` grip
A4 | web-app/metrics/script_metrics.html | `SPANISH_STATE.autoAssigning`; `spanishAutoAssignBtnHtml_`'s busy branch; `spanishAutoAssign_` sets and clears it
A5 | web-app/script_core.html | `REMIND_PUNCH_LABELS`, `remindPunchAction_`, `remindPunchNow_`; `remindOnce_` / `notifyRemind_` carry an action into the toast's action slot; the three reminders in `remindersTick_` pass theirs
A6 | web-app/00_config.js | `SPANISH_ESCALATE_READ_DAYS = SPANISH_PENDING_WINDOW_DAYS`
A7 | web-app/metrics/script_deptrequests.html | `DR_SORT='auto'`, `DR_LIST_SORT`, `DR_SORT_NOTES`, `drSortFor_`, `drSortNote_`, `drSortCmp_`'s `resolved`; `drListView_(list, listKey)`; the manager body order
A8 | web-app/styles_design_tokens.html + 6 partials | `--warn-fill` (light #dda23a, dark var(--warn)); every `--on-warn` rule's fill

TEST RESULTS: Test Command is `manual`. Regression Scenarios whose subsystem overlaps these files were walked by reading against the change: the Spanish escalation scenario's window expectation (90 → 30) is the intended change; the reminder scenarios are unchanged in what fires and when (only a button is added); the Dept Requests scenarios' default order changes for the team-wide and incoming lists (intended); NOT RUN in the deployed app (the editor/deployed walk is the operator's).
  Pure 1494/1494 (A-6, MRD-5, the sticky-reminder pin and the escalation sandbox extended); DOM 358/358 (2 new drives; C-N4 and A-7 extended); visual: 31 scenarios (clock, deptreq, spanish, cn-log, cn-scratchpad) measure clean, the shots read (Reference above Intake, the ⓘ on the stamp, the grip, the Dept Requests order and headings); axe over the 38 handbook scenarios PASS after the token copy changed; lint-server clean; handbook-sync in step; counts in step.
  Bite-checks (15, scratch worktree): all BITE — a colour with nothing selected doing nothing; the placeholder saved; no split inside a run; a size with nothing selected doing nothing; a stale reminder punching; a punch not allowed being offered; the toast action dropped; no busy look; the busy flag never cleared; the summary row below the filters (refused once by bite.sh for a literal double quote, rewritten and re-run); one page-wide default; Recently resolved by sent date; the clock-out reminder without its button; the light fill back to the dark amber; the Lunch Out button on the dark amber.
REGRESSION RISKS: (a) A reminder's punch skips handlePunch's confirm dialog — deliberate (the button names the punch), and the server's order check still applies. (b) A zero-width placeholder lives in the LIVE scratchpad editor until saved; character counts may count it (one character). (c) The team-wide and incoming Dept Requests lists now open longest-first — a manager used to newest-first sees a different first card (named on the heading). (d) The handbook app's amber fills change with its token copy on its next push.
INVARIANTS AT RISK: None. INV-173 (the toast action is a real named button), g141 (the busy button is drawn from state, so a re-render keeps it), g170 (text on a filled amber stays --on-warn, now over --warn-fill), g152's one-window rule (the digest now reads it), g147 (no host-keyed cache added).
NET SCORE: 0 production fixes − 0 new failure modes = 0 (new capability; A4's re-enable-mid-run and A7's Recently resolved sent-date order were latent defects fixed in passing, not counted)

OPERATOR ACTIONS / DEPLOY:
- Team Tools: `clasp push -f` from `web-app/` + New version | BLOCKS DEPLOY: N
- Handbook app: `npm run handbook:push` + New version (its colour-token copy changed) | BLOCKS DEPLOY: N
Deploy: Team Tools — `clasp push -f` + New version; handbook app — `npm run handbook:push` + New version

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The rest of the plan: S (Scratchpad extras), B, C, E, D, G, F, H (STATE.md Pending).
- The idle alert's threshold as an Admin setting and a shell-level manager notice — offered, not yet batched.
- The frame stamp reads "CTRLC" (no plus) on Windows — the `mod` string predates this batch; left as is.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
