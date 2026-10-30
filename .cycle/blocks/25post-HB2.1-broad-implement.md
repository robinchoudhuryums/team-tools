---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: none (plan batch, not a scan finding)
New capabilities (G/ST): HB2.1 (handbook app plan, operator 2026-10-28) — the Handbook spreadsheet and its People tab: a reader picks a department and a manager, the manager confirms, the admin keeps the list of managers
Files modified: handbook-app/People.js (new), handbook-app/.clasp.json, handbook-app/index.html, handbook-app/script_handbook.html, handbook-app/styles_handbook.html, handbook-app/kb_shared.js (GENERATED — sheetSafeRows_ now copied), test/client/run.js, test/client/dom/runDom.js, test/visual/mock.js, test/visual/shoot.mjs, test/visual/ci-gate.cjs, docs/handbook-app.md, docs/design-decisions.md, docs/operator-state.md, docs/test-harness-log.md, .cycle/config.md, CLAUDE.md
Estimate: L (~6 h) — written before the first edit (the plan said M (~4 h))
Actual: ~3.5 h (server 0.8 · sandbox + pure pins 0.6 · page 0.8 · DOM drives + visual 0.7 · docs 0.4 · bites + the two follow-up drives 0.2)

CHANGES:
HB2.1 | handbook-app/People.js | the Handbook spreadsheet (HANDBOOK_SS_ID — the app's own store, never the KB) and its People tab: Email, Department, Manager, Role, Status (a word, never TRUE/FALSE), four times; a header row that was edited is "could not read". Endpoints hbGetMe (the caller's view: profile, managers to choose, their team, everyone for an admin), hbSaveProfile (a published chapter; a marked manager, never oneself; a new choice asks again, the same choice writes nothing), hbConfirmPerson (the person's own manager, or an admin; confirm or "not my team"), hbSetManager and hbRemovePerson (admin: HANDBOOK_ADMIN_EMAILS, or the deploying account while unset). Callers are checked before the lock; every write holds this project's ScriptLock and reads the tab fresh (only this project writes it, so rows are updated in place); a busy lock is said. An unmarked manager's people read "choose again", derived. Unset / unreachable / edited header are three answers, and none stops the handbook reading.
HB2.1 | handbook-app/index.html, script_handbook.html, styles_handbook.html | a Profile button (badge: requests waiting, or "!" when the reader's own profile needs them); the home page asks a first visit, says who a request waits on, and tells a manager how many wait; one people view — Your profile, Your team, and for the admin Managers + Everyone — each section painted on its own so an answer never wipes an unsaved choice (g141); an older answer never overwrites a newer; a saved department seeds the reading choice only where a browser has none; Remove asks first; history state {people: true}.
HB2.1 | tests | pure HB2.1-a..e (helpers; a first visit driven end to end; the gates incl. no lock for a refused caller and a busy lock; unmarked manager, remove, three failure answers; structural — no KB reach, caller then lock then write after a fresh read); hbServer_ opens two spreadsheets by id, records setValues/deleteRow, fakes the lock and the deployer, takes the caller per call. DOM: five drives. Visual: three scenarios over invented people, one on the CI gate. 9/9 bites after two NO BITEs were closed with new drives (the dirty guard, the department seed); one equivalent mutant recorded (HB_PP.showing in hbSearch_ — the sections no longer exist).

TEST RESULTS: pure 1453/1453 (REQUIRE_DEPS=1 too), DOM 316/316, lint-server clean (19 files, 2 projects), handbook-sync --check clean, counts --check clean, cycle-closeout --check clean, visual CI gate 28/28 PASS; the three new scenarios measured clean (no overflow, no runaway, no squeezed text, no page errors, no missing fixture) and were read. Regression Scenarios: Team Tools untouched (no web-app/ file changed); the handbook app's reading paths (home, section links, search, feedback) — PASS by their HB1.3/HB1.4 drives, unchanged.
REGRESSION RISKS: every visit now makes one more request (hbGetMe, cached People read for 120 s) — the app shares the deployer's concurrent-execution limit with Team Tools; a failed hbGetMe costs the profile, never the reading. The People cache is this project's, so a hand edit of the sheet shows within two minutes.
INVARIANTS AT RISK: None — Team Tools is unchanged, and the app's KB writes are still appendRow onto its two tabs (HB1.4-d, unchanged and green).
NET SCORE: 0 production fixes − 0 new failure modes = 0 (one new capability)

OPERATOR ACTIONS / DEPLOY:
- Create the Handbook spreadsheet (owned by or shared with the deploying account) and set the handbook project's `HANDBOOK_SS_ID` to its id | BLOCKS DEPLOY: N (unset, the app reads as before and asks nobody)
- Optionally set `HANDBOOK_ADMIN_EMAILS` (unset, the deploying account is the only admin) | BLOCKS DEPLOY: N
- Open the app → Profile → Managers → add each manager | BLOCKS DEPLOY: N
- `npm run handbook:push`, then Deploy → Manage deployments → New version (no new permission) | BLOCKS DEPLOY: Y (handbook app only)
- The HB1.2 setup and the HB1.4 steps if not yet done | BLOCKS DEPLOY: Y (handbook app only)
Deploy: N/A — no Deploy Command configured

FOLLOW-ON ITEMS:
- People rows are never purged; an admin removes someone who has left. A departed account cannot sign in, so a stale row only shows on a manager's team until removed.
- The admin's Everyone list is a flat list; at ~150 people it may want a filter (by department or standing) — HB3.4's manager view is the natural place.
- Readers are named from their address (maria.lopez → Maria Lopez); a domain directory lookup would need the Admin SDK, which the app does not have.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (handbook-app.md People, the decision + index line, operator steps, harness log, Subsystems, CLAUDE.md lines).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
