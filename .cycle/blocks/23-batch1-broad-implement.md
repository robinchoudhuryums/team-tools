---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- TC-01 — the payroll export threw past ~998 punch rows (a fresh spreadsheet is a fixed 1000-row grid)
- ADM-05 — a data-table import cleared the live operator table, then threw past the tab's grid (or on a >50k-char cell), leaving it empty
- SH-01 — a reopened overlay kept its old DOM position, so the "Copy it by hand" warning could open BENEATH the Save & Compose overlay
- CNUI-07 — the save toast said "Saved · copied to clipboard" before the copy settled, including when it failed
- CNUI-01 — a save that failed after the rep left Log overwrote the single sticky-draft slot, destroying a newer note
NOT implemented (blocked on a decision — see FOLLOW-ON): TC-02 (a break adjustment overwrites the last same-type punch of the day)

Files modified: web-app/20_timeclock.js, web-app/70_kb.js, web-app/00_config.js, web-app/script_core.html, web-app/cn/script_callnotes.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, CLAUDE.md (generated running-totals rows only), .cycle/STATE.md
Estimate: M (~9 h) — Batch 1 as planned (6 findings)
Actual: ~3 h for 5 findings; TC-02 stopped at the design question (~0.5 h of reading)

CHANGES:
TC-01 | web-app/20_timeclock.js | generateExportSheet_ writes the two header rows, then `appendRowsSafe_(sh, matched)` — which grows the grid first and lands on row 3 — instead of a fixed `getRange(3, 1, matched.length, 9)`.
ADM-05 | web-app/70_kb.js, web-app/00_config.js | kbImportDataTable refuses any cell over KB_DATA_TABLE_MAX_CELL_CHARS (50,000) BEFORE the dry-run return (the preview reports it too); before clear() it captures the tab's display values and grows the grid (new kbEnsureGrid_, rows AND columns); a write that throws restores the previous table and says so, or names Version history if the restore also fails; no restore claim for a first import.
SH-01 | web-app/script_core.html | ensureOverlay moves a reused, direct-child-of-<body> overlay to the end of <body> on a closed→open transition, so whatever opened last paints on top and is what Escape / the focus trap treat as the top. An overlay re-rendered while open is not moved.
CNUI-07 | web-app/script_core.html, web-app/cn/script_callnotes.html | copyWithFeedback_ takes an optional `fail` toast; cnAutoCopyNote_ passes `ok`/`fail` through; the submit path drops its synchronous "Saved · copied to clipboard" and announces through the copy: "Saved · copied to clipboard" on success, "Saved — but nothing was copied to the clipboard" beside the manual-copy modal on failure.
CNUI-01 | web-app/cn/script_callnotes.html | cnRevertPendingSubmit_'s no-form branch checks the new cnStickyDraftHasOtherText_(snapshot): when the slot holds live, DIFFERENT typing, it is kept and the failed note is shown in the manual-copy modal; the slot holding nothing (or the failed note itself, the Save & Compose case) keeps the old park-as-draft path.

TEST RESULTS: passed — pure 1106/1106 (was 1103; +3), DOM 184/184 (was 180; +4), `counts --check` agrees, `lint:server` clean, `node --check` on every server file. Every new pin bite-checked with scripts/bite.sh --fn, all BITE: TC-01 revert; ADM-05 no-grow, no-restore, cell-check-removed; SH-01 no-restack (DOM); CNUI-07 synchronous toast restored (DOM); CNUI-01 overwrite restored, and same-note-as-newer (DOM). Visual re-shoot of the overlay scenarios (manual-copy ×2, dayedit ×3, cn-sched-modal ×3, reference-reader): 0 missing, 0px overflow; dayedit opened and checked.
Test Command is `manual`. Regression Scenarios overlapping the modified subsystems — S1/S2 (editor suite), S8 (ADP export), S18 (submit + auto-copy, incl. the blocked-clipboard step), S32 (sticky draft), S34 (Save & Compose), S49 (manual-copy failover), S54 (uiConfirm/uiPrompt stacking), S113 (modals open AND close) — were NOT walked: each needs the deployed app or the Apps Script editor, which this session cannot reach. The behaviour each change touches is driven by the pins above; the walks are operator steps (below).
REGRESSION RISKS:
- SH-01 changes DOM order for every reused overlay on reopen (all 6 static modals + dynamic ones). Nothing in CSS depends on overlay order (checked); the pay-statement → Adjust close-before-open pin still holds. A reopened overlay now always lands on top — the intended behaviour, but a flow that reopened an older overlay expecting it to stay BEHIND a newer one would change (none found).
- CNUI-07: if navigator.clipboard.writeText never settles (a permission prompt left open), no save toast appears at all; the pending card still renders in the stack. Not counted as a failure mode, noted.
- ADM-05: the restore writes the previous table back as plain-text display values — exactly what the readers (getDisplayValues) saw — but a cell the operator had hand-formatted as a number/date comes back as its displayed text in a '@' cell.
INVARIANTS AT RISK: None found broken. Checked: INV-01 (the import write still inside the ScriptLock), INV-136 (admin gate still before any write — DT-3 green), INV-64 (the import still formats '@' before its write — DT-3 + the plain-text-writer pin green), INV-83 (ensureOverlay focus stash/restore unchanged — the focus DOM pins green), INV-145 (onClose refusal untouched), INV-48 (optimistic revert — the five submit DOM pins green), the g76/T5 copy contract (the T5 DOM pins green), g145 (both writes now grow first).
NET SCORE: 2 − 0 = +2 (SH-01 and CNUI-07 plausibly fired this month for a rep on a clipboard-blocked browser — T5's 2026-09-21 incident shows such browsers exist; TC-01, ADM-05 and CNUI-01 are real but needed a size or a sequence not known to have occurred this month)

OPERATOR ACTIONS / DEPLOY:
- Walk S8 with a range of >1,000 punch rows (e.g. a multi-month manual export) — the export opens and has every row | BLOCKS DEPLOY: N
- Walk S18's blocked-clipboard step twice in one session using Save & Compose — the "Copy it by hand" box is ON TOP of the composer both times, and the toast reads "Saved — but nothing was copied" (never "copied") | BLOCKS DEPLOY: N
- Optional: Admin → Data tables, import a CSV of >1,000 rows into a copy/dev KB store — it imports in full | BLOCKS DEPLOY: N
- Run `runSmokeTests()` from the editor after the push (S1) | BLOCKS DEPLOY: N
Deploy: Server + Client (shell) + Client (Call Notes views): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- TC-02 — BLOCKED ON A DECISION, not implemented. A rep's break adjustment (Apply now, or an approved request) finds the LAST LunchOut/LunchIn of that day and overwrites it (findExistingPunch_ / buildAdjustPunchIndex_). Since multi-break days are legal, the server cannot tell "correct the break I already have" from "add the break I forgot": the adjust modal and the PunchAdjustRequests schema carry no intent. Appending instead loses a genuine correction (the old LunchIn stays and pairs first); updating loses a genuine addition (the current bug). Options: (a) an intent control on break types in the adjust modal ("missing break" vs "correct the break at HH:MM") carried in the request row; (b) break types always APPEND and a correction goes through a manager Day Edit; (c) refuse a break adjustment on a day that already has that type and route it to the manager. (a) is M (~1 day incl. schema + both writers + the queue UI).
- managerSaveDayRange's range mode carries the same last-row overwrite for break types on multi-break days (the TC-02 class, manager path — the modal says range mode accepts one break pair only).
- cnRevertPendingSubmit_'s form-present-but-not-empty branch still tells the rep "the unsaved note is on your clipboard", which is only true if the auto-copy succeeded (same class as CNUI-07, a different branch).
- New visual scenario owed: the "scope granted, service disabled" Drive state (Batch 3 of the plan).

DOCUMENTATION UPDATES NEEDED:
- .cycle/config.md: S18's Expected — the save toast now reads "Saved · copied to clipboard" only after a successful copy, and "Saved — but nothing was copied to the clipboard" otherwise; add S129 (export of >1,000 rows), S130 (data-table import past 1,000 rows + a failed write restores the table), S131 (blocked clipboard, Save & Compose twice — the box is on top).
- docs/gotchas.md + the CLAUDE.md index: g145 extended — a freshly CREATED or CLEARED sheet is the same fixed grid (TC-01, ADM-05); g100 — ensureOverlay restacks a reused overlay on reopen (SH-01).
- docs/operator-state.md / modules: the data-table import now restores the previous table on a failed write.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
