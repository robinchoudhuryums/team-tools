---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: none (plan batch, not a scan finding)
New capabilities (G/ST): HB3.4 (handbook app plan, operator 2026-10-28; operator answers 2026-10-29 — reminders built but OFF, the sign-off replaces Mark as read) — a versioned "I've read this" on every section and in My training, a retraining change asking again; the manager's per-person progress with export; training reminder emails, off by default
Files modified: handbook-app/Training.js, handbook-app/Reminders.js (new), handbook-app/appsscript.json, handbook-app/.clasp.json, handbook-app/script_handbook.html, handbook-app/styles_handbook.html, handbook-app/shell_shared.html (GENERATED — tsvRow_/copyWithFeedback_ now copied), test/client/run.js, test/client/dom/runDom.js, test/visual/mock.js, test/visual/shoot.mjs, test/visual/ci-gate.cjs, docs/handbook-app.md, docs/design-decisions.md, docs/operator-state.md, docs/test-harness-log.md, .cycle/config.md, CLAUDE.md
Estimate: L (~6 h) — written before the first edit (the plan said M (~4 h))
Actual: ~3 h (questions + scoping 0.3 · server + reminders 0.9 · pure drives 0.4 · page 0.5 · DOM drives 0.2 · visual + reading 0.3 · docs 0.2 · bites 0.2)

CHANGES:
HB3.4 | handbook-app/Training.js | ReadMarks gains a fifth column, Version — the section's stamp (hbStamp_ of its text), a chapter's the stamp of its sections' stamps (hbPublished_). hbSignMarks_ keeps the latest mark with its version; hbRetrainDate_ the latest changelog entry flagged `retraining` for the section (or the chapter's sections); hbSignState_ → unsigned / resign (a retraining date after the signed day, in the app's timezone) / signed; hbSignOf_ adds `changed` (the version moved). A reading item in a plan is done only while `signed`. New endpoints: hbMySignOffs (the reader's own sign-offs), hbTeamProgress (per person on the author's team — plans done / overdue, quizzes best / attempts / passed / locked, sections signed / to re-sign — manager or admin, refused before any read). My training and the manager view share one context (hbProgressCtx_ / hbPlanProgress_).
HB3.4 | handbook-app/Reminders.js, appsscript.json, .clasp.json | hbSendTrainingReminders (the daily handler) and installHandbookReminders (one 8am trigger, replacing any earlier) — both refuse a caller whose active user is not the effective user (only the deployer or the deployer's trigger — g26/g143); nothing sent unless HANDBOOK_REMINDERS is `on`; one email per overdue reader per day (HANDBOOK_REMINDERS_LAST, kept only for people still overdue), titles and dates escaped, a link, no answers; a failed send is counted. Scopes: script.send_mail, script.scriptapp.
HB3.4 | handbook-app/script_handbook.html, styles_handbook.html | the bar above every section carries the sign-off ("I've read this" → "You read this on …" + Undo; "Changed since you read it — please read it again" + "I've read it again"); My training's reading buttons are the same sign-off (Mark as read removed); Team training gains Progress — a table per person (overdue rows marked, Details per plan and quiz), Copy table (formula-safe TSV — g144) and Download CSV (best-effort; formula-safe and quoted), the reminders' on/off line; a narrow screen says the table scrolls. A failed load says so in the panel; a reader never asks for it.
HB3.4 | tests | pure HB3.4-a..d (helpers; the sign-off driven through a retraining change and an unflagged one; the manager view and its gate; reminders — owner-only, off, once a day, escaped, a failed send, the installer); DOM: three drives; visual: three scenarios (one on the CI gate) + the retraining ask on handbook-quizbar-light-mobile. 17/17 bites (10 server, 7 page).

TEST RESULTS: pure 1469/1469, DOM 328/328, lint-server clean, handbook-sync --check clean, counts --check clean, visual CI gate 31/31 PASS; the three new scenarios measured clean and were read — one defect found by reading (the progress table wider than its column at 1440px, "To re-sign" clipped, nowrap headers) and fixed before commit; the phone shot showed only two columns, so a narrow-screen hint was added. Regression Scenarios: Team Tools untouched (no web-app/ file changed); the handbook app's HB3.3 drives (My training, editors) and HB3.2 quiz drives still pass with Mark as read replaced by the sign-off.
REGRESSION RISKS: the bar above every section is now visible (it held only quizzes before) — one more row of height per section; every bar paint reads HB_SO, loaded once per visit (hbMySignOffs). Reads of ReadMarks are whole-tab and uncached, like HB3.3's.
INVARIANTS AT RISK: None — Team Tools is unchanged, the KB is only read, every write is to the app's own spreadsheet under its lock with the caller checked first, and the reminder email carries no answers or typed text.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (one new capability)

OPERATOR ACTIONS / DEPLOY:
- Handbook app: `npm run handbook:push`, then Deploy → Manage deployments → New version | BLOCKS DEPLOY: Y (handbook app only)
- Open the app once as the deployer and approve the two new permissions (send email, manage triggers) | BLOCKS DEPLOY: Y (handbook app only)
- To turn reminders on (optional): set Script Property HANDBOOK_REMINDERS=on, then run installHandbookReminders once from the Apps Script editor | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured

FOLLOW-ON ITEMS:
- A failed getManualMeta read leaves the changelog empty, so a section changed for retraining reads "signed" rather than asking again (hbMySignOffs / hbProgressCtx_); the page needs the same meta, so it rarely shows alone.
- Download CSV inside the Apps Script iframe is unverified on the live deployment (Copy table is the reliable path).
- QuizAttempts / ReadMarks still grow without a purge (carried from HB3.2).

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (decision + index line, handbook-app.md section, operator note incl. the reminders and the re-approval, harness log, Subsystems, CLAUDE.md file list and inventory line, counts).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
