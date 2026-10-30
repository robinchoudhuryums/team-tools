---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: none (plan batch, not a scan finding)
New capabilities (G/ST): HB2.2 (handbook app plan, operator 2026-10-28 — "notes kept in the browser by default; syncing is optional and warns against patient information") — bookmarks in the reader's account with a Saved page; a note per section in the browser, with export / copy / import and an opt-in sync to the account behind a warning
Files modified: handbook-app/Saved.js (new), handbook-app/.clasp.json, handbook-app/script_handbook.html, handbook-app/styles_handbook.html, handbook-app/shell_shared.html (GENERATED — kbBookmarksToggle_ now copied), test/client/run.js, test/client/dom/runDom.js, test/visual/mock.js, test/visual/shoot.mjs, test/visual/ci-gate.cjs, docs/handbook-app.md, docs/design-decisions.md, docs/operator-state.md, docs/test-harness-log.md, .cycle/config.md, CLAUDE.md
Estimate: M–L (~5 h) — written before the first edit (the plan said M (~3 h))
Actual: ~2.5 h (scoping from the plan 0.2 · server 0.4 · pure drives 0.3 · page 0.6 · DOM drives 0.3 · visual + reading 0.3 · docs 0.2 · bites + the follow-up drive 0.2)

CHANGES:
HB2.2 | handbook-app/Saved.js | two Handbook-spreadsheet tabs, every body a JSON cell (g144/g13): Bookmarks [Email, ListJson, UpdatedMs] — one row per reader, updated in place; Notes [Email, SectionId, NoteJson, UpdatedMs] — one row per reader and section. Endpoints: hbMyBookmarks (setUp: false while unset; an unreadable list is an error, never "none" — g53), hbToggleBookmark (a published section only; the handbook's title, never the page's; answers with the whole list), hbSyncNotes (a MERGE — per section the later note wins, a deletion is a tombstone that travels; bad entries refused and counted, at most 500; only changed rows written), hbForgetNotes (empties the caller's Notes rows only). Caller checked before the lock (g17); unset and unreachable are different answers (g128).
HB2.2 | handbook-app/script_handbook.html, styles_handbook.html | the reader bar's star fills MANUAL_HOST's bookmark hooks (the account; the browser's own list while unset — no server call); Saved in the contents (bookmarks with Open / Remove, one that left the handbook says so; notes newest first with Open / Edit; Export notes, Copy notes, Import notes; "Keep my notes in my account"); "Add a note" / "Your note" in the bar above every section opens an editor that asks before discarding (g166) and says where the note is kept with the no-patient-information line. Turning sync on warns first, sends this browser's notes and keeps the merge; turning it off asks, then removes the account's copies. An import keeps the newer note per section and refuses a file that is not an export; with sync on it sends only what it took. A failed sync keeps the note here and says so.
HB2.2 | tests | pure HB2.2-a..e (helpers; bookmarks in the account; notes sync driven; the gates; the page's merge equals the server's — g120 — and the export round-trips); DOM: four drives (+ the warning's Cancel, added after a NO BITE); two older drives allow the note button on the bar; visual: three scenarios (one on the CI gate). 14/14 bites (8 server, 6 page).

TEST RESULTS: pure 1474/1474, DOM 332/332, lint-server clean (23 files, 2 projects), handbook-sync --check clean, counts --check clean, visual CI gate 32/32 PASS; the three new scenarios measured clean and were read — two defects found by reading ("Remove" in the star's warning colour; "Delete note" wrapping in the phone footer) and fixed before commit. Regression Scenarios: Team Tools untouched (no web-app/ file changed); the handbook app's reading, quiz, training and sign-off drives pass with the note button now on the bar.
REGRESSION RISKS: the bar above a section is now always shown (it carries the note button). Every visit makes one more request (hbMyBookmarks) and, with sync on, one hbSyncNotes carrying every note in the browser (≤500 × ≤4,000 characters). Notes rows emptied by "off" stay as blank rows.
INVARIANTS AT RISK: None — Team Tools is unchanged, the KB is only read, every write is to the app's own spreadsheet under its lock with the caller checked first; a note reaches the server only after the reader accepts the warning.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (one new capability)

OPERATOR ACTIONS / DEPLOY:
- Handbook app: `npm run handbook:push`, then Deploy → Manage deployments → New version (no new permission) | BLOCKS DEPLOY: Y (handbook app only)
- Nothing to set: the Bookmarks and Notes tabs are created on first use; keep the Handbook spreadsheet shared with no one but the deploying account (a synced note is free text the app cannot check) | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured

FOLLOW-ON ITEMS:
- Bookmarks kept in the browser while the store was unset are not carried into the account once it is set (the account starts empty).
- A note cannot be checked for patient information; the warning is the only control. A heuristic hint (dates, long numbers) was considered and left out of scope.
- Emptied Notes rows are never compacted.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (decision + index line, handbook-app.md section, operator note, harness log, Subsystems, CLAUDE.md file list and inventory line, counts).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
