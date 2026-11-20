---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented (the follow-on items Batch 14's block left that need no operator decision — including the five small product ones it listed as not taken):
  FX1 — after a killed test run, the stash restore replaced a setting someone had changed by hand in between, without a word (Batch 14's own new failure mode)
  FX4 — the Reference drawer's blocked-copy dialog opened under the drawer
  FX5 — the rep's Search drew a list the server had cut to its newest 200 as the whole list
  FX6 — the pay-period tile did not say when the timesheet archive could not be read
  FX7 — `voidCoaching` carried a condition that was always true
  FX8 — the reminders list's Mark done and Cancel carried their id inside an onclick literal
  FX2 — the Team Training fixture named a rep the roster fixture does not have (the narrow top cards seen in that shot were examined and left: an 860px cap, by their own rules)
  FX3 — INV-01's documented exceptions still said the Scratchpad save uses the user lock
New capabilities (G/ST): None
Files modified: web-app/script_core.html, web-app/cn/script_callnotes.html, web-app/tc/script_timeoff.html, web-app/82_coaching.js, web-app/Tests.js, handbook-app/shell_shared.html (generated — re-synced), test/visual/mock.js, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, .cycle/config.md, CLAUDE.md, docs/gotchas.md, docs/design-decisions.md, docs/operator-state.md, docs/operator-log.md, docs/test-harness-log.md
Estimate: M (~7 h), written to STATE.md's Estimates line before the first edit
Actual: ~4 h

CHANGES:
FX1 | web-app/Tests.js | A stash is dated (`TEST_STASH_AT_<key>`, never re-dated by a second stash, removed with it). The backstop reads the value it is about to replace BEFORE restoring and logs one line per property: how long ago the stash was taken and — only when the replaced value was not the original — that value; past two hours (or undated) it adds that a hand-made change may be what was replaced. Nothing is refused.
FX4 | web-app/script_core.html, web-app/cn/script_callnotes.html, handbook-app/shell_shared.html | `manualCopyModal_` takes the layer above the two non-modal panels for every caller; the `above` option, which only the Scratchpad passed, is gone.
FX5 | web-app/cn/script_callnotes.html | The search answer's `truncated` is kept, and the count line reads "Showing the newest N results … there are more. Narrow by date range to see older ones" while it is set.
FX6 | web-app/tc/script_timeoff.html | `tsArchiveNoteHtml_` on the pay-period tile, from the `archiveError` the payload already carried; only the fact is shown, as on the calendar.
FX7 | web-app/82_coaching.js | The conjunct `&& found.item.status !== 'void'` (always true after the early return above it) is removed. No behaviour changed.
FX8 | web-app/cn/script_callnotes.html | The row buttons carry `data-sched-id` and `data-sched-status`; the list has one click listener, `cnSchedListClick_`, which ignores a button waiting on the server.
FX2 | test/visual/mock.js | The fixture's reps are the roster fixture's (Leo Kim, Sam Ortiz).
FX3 | .cycle/config.md | INV-01 names the three diagnostics appends that use the user lock, and says the note actions and the Scratchpad hold per-rep leases.
Pins | test/client/run.js, test/client/dom/runDom.js | Two pure pins, three DOM drives. Four older pins followed (the FT1 layer pin, PR4-4's retraction line, the F18 side-rail sandbox, the F73 stash sandbox).

TEST RESULTS: passed. Pure 1812/1812 (with dev dependencies), DOM 508/508; `lint-server`, `split-manifest --check`, `handbook-sync --check`, `counts.mjs --check` clean; `cycle-closeout --check` in step. No visual run was made here for this pass; CI's visual job (the layout subset, the tour, axe) passed on the pushed code.
  Bite-checks: 17 mutations (10 pure, 7 DOM), 17 bit, each on its first run. One drive was corrected before the run: the FX8 step for a button waiting on the server clicked a disabled button, which jsdom ignores, so the listener's own guard was never reached; it dispatches the click on the button's child now, and removing the guard fails it.
  CI: both jobs (client-tests; visual-layout) completed with conclusion success on 06aba17 (the code and the pins) and a682fb6 (the docs, the invariant and the scenario). The commit that adds this block and the checkpoint is pushed with it; its run is not read here.
  NOT verified here: nothing ran in a deployed Apps Script project, and the editor suite was not run. No browser with a blocked clipboard was used: FX4 rests on the four z-indexes read from the rules and on the class the dialog is opened with. The stash line was driven over a stand-in PropertiesService with a moved clock. FX6's note was driven with a made-up `archiveError`; no archive was actually unreadable.
  Regression scenarios whose Subsystem overlaps the modified files (Server; Client (shell); Client (Call Notes views); Client (Time Clock views); Test Suite; Handbook app): every scenario of those subsystems, and the new S210 — NOT WALKED: each is a browser or editor walk on a deployed instance (Test Command is `manual`). What stands in: the driven pins and the DOM drives.
REGRESSION RISKS: (1) FX1 — the restore's log line prints a property's VALUE when it replaced one that was not the original (the feature flags, an email list). It goes to the editor's execution log, which only people who can open the script can read; no secret property is stashed by any test today. (2) FX4 — the copy dialog is now also above the Scratchpad when opened from the Log form; that was already so for the pad's own copy. (3) FX8 — the list's listener is set on the host each time the list is drawn; a caller that built those buttons elsewhere would find them inert (there is none). (4) FX5 — a payload without `truncated` (an older server) reads as a whole list, as before. (5) The handbook app's copied page shell changed, so it needs its own deploy.
INVARIANTS AT RISK: None broken. INV-454 (Batch 14) holds — every stash still has its unstash, the restore still runs first in setup and cleanup, and the value goes back before the stash is dropped; the pin's store comparisons pass with the dated key added and removed. The overlay invariants hold: the dialog still opens through `ensureOverlay` and the class rides `extraClass` (g134). g146: FX6 shows no part of the server's message; FX5's line shows the query the rep typed, on the page only, as the count line always has. g49: the reminder id is read from the attribute and handed to the server, never re-drawn. g141: FX8 redraws nothing it did not before. INV-01's rule is unchanged — only its list of exceptions was corrected. New: INV-455.
NET SCORE: 1 production fix − 0 new failure modes = 1. (a) FX5 YES — a rep's search on a common word passes two hundred matches, and the list read as complete. FX4 NO — it needs a blocked clipboard and a window narrow enough for the drawer to cover the dialog; no report of it. FX1 NO (the stash is not deployed). FX6 NO (the current pay period does not reach the archive). FX7, FX8, FX2, FX3 NO. (b) NO for each.

OPERATOR ACTIONS / DEPLOY:
- No Script Property, tab or column to set | BLOCKS DEPLOY: N
- Still wanted from Batch 12: the decision on text that begins with an apostrophe | BLOCKS DEPLOY: N
Deploy: Team Tools — `cd web-app && clasp push -f`, then Deploy → Manage deployments → Edit → Version: New version. Handbook app — `npm run handbook:push`, then New version in its editor (its copied page shell changed with FX4; `handbook-sync --check` is clean, the copy is committed).

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- FX1 — risk 1: the log line prints values. If a test ever stashes a secret property, the line must not print it.
- FX6 — Day Edit receives `archiveError` too and does not draw it; its date range (the adjust window) never reaches the archive (120 days at the least).
- FX2 — Team Training's summary strip and assign form stay capped at 860px above full-width tables; say if they should match.
- NOT taken — an undo for a card join; the scan's ST1 (a local command equal to CI, a cycle-open script) and the rest of ST2; everything that needs a ruling: F36, F39, F51, the leading apostrophe.
- The fix batches of the scan's plan are all done; `/reflect` closes the cycle.

DOCUMENTATION UPDATES NEEDED:
- None outstanding — done in this pass: CLAUDE.md (clauses on g132, g100, g53 and g133; the stash's date key; the decisions index; the counts block, by `--write`), docs/gotchas.md (four amendments), docs/design-decisions.md, docs/operator-state.md, docs/operator-log.md, docs/test-harness-log.md, .cycle/config.md (INV-455; S210; INV-01's exceptions).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
