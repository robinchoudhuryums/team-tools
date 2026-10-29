---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: none (plan batch, not a scan finding)
New capabilities (G/ST): HB1.4 (handbook app plan, operator 2026-10-28; decisions 2026-10-29) — search in the handbook app; section feedback (votes, out of date, suggest an edit) into Team Tools' KbFeedback; the search signal recorded; visual-matrix screens for the app; docs/handbook-app.md
Files modified: web-app/00_config.js, web-app/10_core.js, web-app/70_kb.js, web-app/kb/script_kb.html, web-app/cn/script_callnotes.html, handbook-app/Handbook.js, handbook-app/appsscript.json, handbook-app/index.html, handbook-app/script_handbook.html, handbook-app/styles_handbook.html, handbook-app/kb_shared.js + shell_shared.html (GENERATED), test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json (regenerated), test/visual/build.mjs, shoot.mjs, ci-gate.cjs, mock.js, .gitignore, docs/handbook-app.md (new), docs/design-decisions.md, docs/operator-state.md, docs/test-harness-log.md, CLAUDE.md, .cycle/config.md
Estimate: L (~7 h) — written before the first edit (the plan said S-M (~3 h); the operator's three answers added two writes and a mirror)
Actual: ~5 h (Team Tools splits + mirror 1.2 · handbook server 0.8 · page search + feedback 1 · tests, sandboxes, bites 1.3 · visual + docs 0.7)

CHANGES:
HB1.4 | web-app/70_kb.js | pure kbFeedbackEntry_ (the one feedback check, used by kbFlagItem and the app); kbSearchSignalPlan_ + kbSearchSignalSeen_ split out of kbRecordSearchSignal_ (the app copies the plan, writes its own rows); kbSynonymGroups_; kbMirrorSearchConfig_ writes {synonyms, tags} to KbSearchConfig A2 as an '@' text cell ONLY when changed (a re-import still writes nothing — M1), false on failure; kbSaveSearchConfig / kbImportManual return handbookMirrored; kbSearchSignalRows_ reads KbSearchSignal and KbSearchSignalHb
HB1.4 | web-app/10_core.js, 00_config.js | autoTagRulesNormalize_ (pure); saveAutoTagRules returns handbookMirrored; the nightly diagnostics purge keeps 90 days of KbSearchSignalHb inside the same budget; three tab constants
HB1.4 | web-app/kb/script_kb.html, cn/script_callnotes.html | a warn toast when a save or import could not update the handbook app's copy
HB1.4 | handbook-app/Handbook.js, appsscript.json | the spreadsheets scope; getKbSearchSynonyms_ / getAutoTagRules_ read the mirror (cached; a failed read is not cached); hbAppendTab_; kbRecordSearchSignal_ appends Team Tools' plan to KbSearchSignalHb (terms as text); public searchReference — Team Tools' copy, handbook sections only; public kbFlagItem — kbFeedbackEntry_, man- ids only, appended to KbFeedback with the reader's address. Every write is appendRow (two projects share no lock)
HB1.4 | handbook-app/index.html, script_handbook.html, styles_handbook.html | a search box: 300 ms debounce, a sequenced request (a stale answer, or one after a section opened, is dropped), a section number jumps, results list handbook sections only, a failure says so, Back returns to the results; the reader bar's feedback shown again and suggest-an-edit wired to the copied dialog
HB1.4 | test/visual/* | page-handbook.html built; nine handbook scenarios; three on the CI gate
HB1.4 | tests | pure HB1.4-a..f (validator; feedback append; search filter + mirror + signal tab; appendRow-only structural; mirror write-on-change; report reads both tabs); three DOM drives; twelve existing pins and sandboxes updated for the splits — 6/6 bites (feedback man- guard, signal apostrophe, search filter, mirror no-write-on-same, report reads the Hb tab, DOM stale-answer drop)

TEST RESULTS: pure 1448/1448 (REQUIRE_DEPS=1 too), DOM 311/311, lint-server clean (2 projects, 18 files), handbook-sync --check clean (7 files, 108 server + 26 page declarations), counts --check clean, cycle-closeout --check clean, visual CI gate 27/27 PASS (one pre-existing squeezed-text note on reference-manual-diagram-light-mobile, not gated). Regression Scenarios for the touched Team Tools files: the auto-tag save, the synonyms save, the manual import (a re-import writes nothing), the search signal report and the diagnostics purge — PASS by their driven pins.
REGRESSION RISKS: saveAutoTagRules / kbSaveSearchConfig / kbImportManual now also write one cell on the KB spreadsheet when the config changed — a failure there is caught and reported as handbookMirrored:false, never a failed save. The purge's KbSearchSignal budget is shared with the new tab.
INVARIANTS AT RISK: None — the handbook app's writes are appendRow onto two tabs; Team Tools' writes go through sheetText_ into an '@' cell (SHEET-SAFE).
NET SCORE: 0 production fixes − 0 new failure modes = 0 (one new capability)

OPERATOR ACTIONS / DEPLOY:
- Team Tools: clasp push + New version, then save Reference → Synonyms once (or import the handbook) so KbSearchConfig is created | BLOCKS DEPLOY: N (the app searches without synonyms until then)
- Handbook app: `npm run handbook:push`, open the app once as the deployer to grant the new spreadsheets scope, then Deploy → Manage deployments → New version | BLOCKS DEPLOY: Y (handbook app only)
- The HB1.2 setup if not yet done (clasp create, HANDBOOK_KB_SS_ID, a domain deployment) | BLOCKS DEPLOY: Y (handbook app only)
Deploy: N/A — no Deploy Command configured

FOLLOW-ON ITEMS:
- The app's zero-result signal flag is computed before the handbook-only filter, so a query that matched only Reference articles is not recorded as a zero search.
- reference-manual-diagram-light-mobile reports a squeezed contents title at 390px (pre-existing, Team Tools' reader index) — not gated.
- HB2.1 next: people / the Handbook spreadsheet.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (docs/handbook-app.md, decision + index line, operator entry, harness log, KB store tabs, counts block).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
