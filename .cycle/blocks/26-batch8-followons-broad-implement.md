---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented (the follow-on items of Batch 8's summary, numbered here FO1–FO11):
  FO1 — the CRITICAL callout's kicker failed contrast in dark mode (3.34:1 measured), in Team Tools' reader and the handbook app
  FO2 — a manager who opened Training or Profile before their profile loaded got no Team training, no Mine / My team, no lock-outs until they left and came back; a profile that failed to load looked the same; Team training's error had no Try again
  FO3 — a link to a section the handbook app does not serve wiped the chapter being read for a one-line error
  FO4 — read aloud was not cancelled before it started or when the page was left (a reload while paused left Listen silent)
  FO5 — the whole search result list was a live region, read out at every search
  FO6 — notes, the bookmark copy and the note-sync switch were kept in the browser under keys shared by everyone using that browser profile
  FO7 — an image inside a link drew the renderer's internal sentinel instead of the image
  FO8 — Profile's two columns folded at 900px while the rail was on screen (the team column 304px at 960, measured)
  FO9 — older handbook DOM drives still ordered events by the clock; none had been re-read for the race that failed CI in Batch 8
  FO10 — a DOM bite-check cost a full DOM run; Batch 8 used an uncommitted filter in worktrees
  FO11 — Team Tools had no visual scenario between 480 and 1440px
  Not implemented, on purpose: F51 (deferred by the scan as a recorded operator decision). Not implementable: an account that turned note sync off before Batch 8's deploy has no marker — there is nothing to derive one from.
New capabilities (G/ST): None
Files modified: handbook-app/script_handbook.html, handbook-app/styles_handbook.html, handbook-app/Handbook.js, web-app/shared/script_manual_render.html, handbook-app/shared/script_manual_render.html (re-synced copy), scripts/bite.sh, scripts/counts.mjs, test/client/run.js, test/client/dom/runDom.js, test/visual/shoot.mjs, test/visual/README.md, CLAUDE.md, docs/gotchas.md, docs/design-decisions.md, docs/handbook-app.md, docs/operator-log.md, docs/test-harness-log.md, .cycle/config.md, .cycle/STATE.md, .cycle/blocks/26-batch8-followons-broad-implement.md
Estimate: L (~15 h), written to STATE.md's Estimates line before the first edit
Actual: ~11 h

CHANGES:
FO1 | web-app/shared/script_manual_render.html (+ the handbook's copy), test/visual/shoot.mjs | In dark mode the kicker's colour is the red mixed toward the ink (the light mode's recipe) instead of the `--danger-deep` token, which in dark mode mixes toward the paper. The token is unchanged — it has other consumers, none measured failing. The banner scenario is back on section 0.11, so axe measures a CRITICAL callout in dark mode; it fails without the rule.
FO2 | handbook-app/script_handbook.html | `hbLeadState_()` — wait, error, yes, no. Team training and the lock-outs record the state they were drawn for, and a profile answer redraws each only when that state changed (so an ordinary profile action rebuilds nothing). A profile that could not be read says "Could not tell whether you manage a team" with Try again; a failed Team training read has a Try again.
FO3 | handbook-app/script_handbook.html | `hbOpen_` refuses an id that is not in the contents BEFORE it leaves the view: a toast, and the page stays exactly as it was. While the chapters are still loading it says so instead.
FO4 | handbook-app/script_handbook.html | Listen calls the speech engine's `cancel()` before its first words; a `pagehide` listener cancels.
FO5 | handbook-app/script_handbook.html | The result list has no role; the count line ("3 results") and "Nothing … matches" are `role="status"`; a failure stays `role="alert"`.
FO6 | handbook-app/Handbook.js, script_handbook.html | `doGet` hands the page a short key for the signed-in account (`hbAccountKey_`: twelve hex digits from two hashes of the address, never the address). The three keys are `umsHbNotes:<key>` and so on (`hbKey_`); with no key the page uses the shared keys as before. What a browser held before is adopted once, at boot, by the first account to open the handbook there, and the shared copy removed (`hbAdoptLegacy_`) — the operator's answer when asked: one person per browser profile. Notes are merged (later wins); the bookmark copy and the switch are taken only where the account has none.
FO7 | web-app/shared/script_manual_render.html (+ copy) | A link's text — never its URL — is expanded when the link is stashed (`linkText`), and an image inside a link is its `<img>` alone, so anchors do not nest. The single-pass restore, which keeps a sentinel in a URL from being expanded, is unchanged.
FO8 | handbook-app/styles_handbook.html, test/visual/shoot.mjs | Profile folds at 1040px, in a rule after its base rule; a 960px scenario carries a minimum width for the team column (it reports 304px on the old rule).
FO9 | test/client/dom/runDom.js | Every `__delay` left in the handbook drives was re-read. One — the form viewer, an assertion after a 30 ms answer and before a 120 ms one — had the racing shape and is released by the test now. The others only wait longer than a delay scheduled before the wait began.
FO10 | test/client/dom/runDom.js, scripts/bite.sh, scripts/counts.mjs | `DOM_ONLY=<regex>` runs the DOM tests whose name matches; `bite.sh --dom --only <regex>` uses it. A pattern that matches nothing or is not a regex is refused; the summary says SUBSET and n of m; `counts.mjs` clears the variable; bite.sh needs `--dom`, refuses a subset that did not run a test its needle names (restoring the file first), and clears an inherited `DOM_ONLY` when `--only` is not given.
FO11 | test/visual/shoot.mjs | Nineteen Team Tools scenarios: a landing view per tool at 800px and two at 960px.
Pins | test/client/run.js, test/client/dom/runDom.js | Seven pure pins, five DOM drives, twenty visual scenarios.

TEST RESULTS: passed. Pure 1699/1699, DOM 453/453; `lint-server`, `handbook-sync --check`, `split-manifest --check`, `counts.mjs --check` clean; `cycle-closeout --check` in step. Visual: 55 handbook scenarios with no finding; axe passes on 53 handbook screens (it fails the 0.11 dark scenario without FO1's rule); CI's visual gate (35 scenarios) passes. Bite-checks: 46 mutations, 46 bit — the DOM ones through the new `--only`, about ten seconds each; both of bite.sh's new refusals were run by hand. CI on the push that carries this block: see the end of this line once read.
  One finding from the new mid-width shots, NOT fixed (it is a new finding, not one of these items): in Team Tools → Reference at an 800px window, a handbook chapter's end-of-chapter card is squeezed to 5px of text (`reference-manual-light-tablet`). The other eighteen mid-width shots are clean.
  NOT verified here: nothing ran in a deployed Apps Script project or a live browser session. The key `doGet` hands over is driven in the Node sandbox; `speechSynthesis`, `pagehide` and a screen reader's announcement are stood in for by jsdom.
  Regression scenarios whose Subsystem overlaps the modified files (Handbook app; Client (Reference views) — the shared reader; Test Suite). None can be walked here (browser walks on a deployed instance; Test Command is manual). S185 (new) — NOT WALKED; each step has a drive, a pin or a measurement (FO1 axe; FO2–FO6 DOM drives; FO7 pin, driven; FO8 measured; FO11 shot). S184, S183, S177, S176 (the handbook page and its records) — NOT WALKED; their drives are green, unchanged. S62, S86, S125, S127, S148, S149 (Reference articles and the handbook reader in Team Tools) — NOT WALKED; what reaches them is the dark kicker colour and the image-in-a-link rendering; their Node drives are green. S1 / S2 (editor suite) — NOT APPLICABLE: `Tests.js` and Team Tools' server are untouched.
REGRESSION RISKS: (1) FO6 — on a browser profile used by more than one person, the first to open the handbook after the deploy takes the notes that were there (the operator said profiles are not shared). An account whose address changes starts with empty browser notes (synced ones are still in the account). (2) FO3 — any open of an id that is not in the contents is now refused up front; every legitimate open (contents, links, bookmarks, search hits, a chapter's first section) names an id that is. (3) FO2 — the team surfaces are redrawn when the profile's state changes; a manager who is unmarked while on Training sees Team training disappear at the next profile answer rather than at the next visit. (4) FO1 — only the CRITICAL kicker changed colour in dark mode; other uses of `--danger-deep` in Team Tools' dark mode are as they were (and unmeasured). (5) FO10 — a shell that exports `DOM_ONLY` runs a subset of the DOM harness when it is run by hand; the summary line says so, and `counts.mjs`, bite.sh without `--only`, and CI do not inherit it.
INVARIANTS AT RISK: None broken. INV-425 (Batch 8) holds — the toolbar's section, the failed-read states, the sitting guard, the banner and the sync marker are untouched; their drives are green, and the sync-flag and bookmark drives run unchanged on the shared keys (no account key in those drives). The handbook's focus and announcement rules (HB2.4) hold; the search's live region is narrower, as that section now says. The host contract holds. CLAUDE.md is at its ceiling (999 lines): clauses on existing lines only. New: INV-426, S185.
NET SCORE: 1 production fix − 1 new failure mode = 0 (10 defensive or tooling). FO1: YES — deterministic for anyone reading a CRITICAL callout in dark mode, in either app (the interface rule in force since cycle 12); it is a contrast failure, not unreadable text. FO2: NO — needs a manager to act in the moment before their profile loads. FO3: NO — needs a link to a section not served. FO4: NO. FO5: NO — needs a screen-reader user. FO6: NO — the operator says profiles are not shared; NEW FAILURE MODE: YES, documented — adoption by the first account is wrong on a shared profile, and a changed address orphans browser notes. FO7: NO — no article is known to hold an image in a link. FO8: NO — cramped, not broken. FO9, FO10, FO11: NO (tooling).

OPERATOR ACTIONS / DEPLOY:
- Still owed from Batch 7: the handbook app's script id where the push can find it | BLOCKS DEPLOY: Y
- Nothing to set | BLOCKS DEPLOY: N
- Walk S185 on DEV | BLOCKS DEPLOY: N
Deploy: the handbook app — `npm run handbook:push`, then Deploy → Manage deployments → Edit → Version: New version (with the owed handbook deploys: HBR3, HBR4, Batches 6–8). Team Tools — `cd web-app && clasp push -f`, then New version (its Reference reader: the dark kicker and the image in a link; it rides the owed Team Tools deploys).

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- web-app (Reference views) — at an 800px window the Reference tree and reader are two columns of about 270px each, and a handbook chapter's end card squeezes its text to 5px; found by FO11's scenarios (`reference-manual-light-tablet`). Choosing where Reference folds is its own change.
- web-app/styles_design_tokens.html — `--danger-deep` in dark mode mixes toward the paper; any other text using it on a `--danger-soft` tint has the same 3.34:1 (FO1 fixed the one that is under an accessibility gate). Team Tools' own screens are not under axe.
- handbook-app/Saved.js — an account that turned note sync off before Batch 8's deploy has no `sync-off` marker until it is turned off once more.
- handbook-app/script_handbook.html — the department, resume point and visit day are still the browser's, not the account's (harmless; left on purpose). A sign-off still names its section only by the toolbar it sits in.
- scan F51 — deferred by the scan as a recorded operator decision; untouched.

DOCUMENTATION UPDATES NEEDED:
- None (done in this batch).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
