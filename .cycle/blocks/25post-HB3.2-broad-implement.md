---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: none (plan batch, not a scan finding)
New capabilities (G/ST): HB3.2 (handbook app plan, operator 2026-10-28) — taking a quiz in the handbook app: a list by chapter and a quiz bar on its section, questions and options shuffled, a pass mark, three tries then 24 hours, a manager's reset, each wrong answer's explanation linking back to its section; attempts and resets in the Handbook spreadsheet
Files modified: handbook-app/Quiz.js (new), handbook-app/.clasp.json, handbook-app/index.html, handbook-app/script_handbook.html, handbook-app/styles_handbook.html, handbook-app/kb_shared.js (GENERATED — the engine, the retry limit and the quiz tab reader now copied), test/client/run.js, test/client/dom/runDom.js, test/visual/mock.js, test/visual/shoot.mjs, test/visual/ci-gate.cjs, docs/handbook-app.md, docs/design-decisions.md, docs/operator-state.md, docs/test-harness-log.md, .cycle/config.md, CLAUDE.md
Estimate: L (~6 h) — written before the first edit (the plan said M (~4 h))
Actual: ~3.5 h (server 0.8 · pure pins 0.5 · page 0.9 · DOM drives + visual + reading the shots 0.7 · docs 0.3 · bites + the follow-up drive 0.3)

CHANGES:
HB3.2 | handbook-app/Quiz.js | reads the KB's ManualQuizzes (kbManualQuizzesStored_, cached HB_CACHE_TTL, a failed read never cached; a row that will not parse is counted as `unreadable`, never served); QuizAttempts [AtMs, Email, QuizId, ScorePct, Passed (yes/no), PerQuestion] and QuizResets [AtMs, Email, QuizId, ResetBy] in the Handbook spreadsheet, appended under hbWithLock_; hbListQuizzes (each quiz with the reader's standing; unset lists, cannot take; unreachable said), hbGetQuiz (stripped questions + standing), hbSubmitQuiz (answers in the original order; refused and NOT recorded while locked; score, perQuestion, review — explanation + section, never the key — and the standing after), hbTeamQuizLocks (the caller's confirmed team, or everyone for an admin), hbResetQuiz (the confirmed manager — still a manager — or an admin; the attempts kept). The engine, trainQuizLockout_ and the tab reader are Team Tools', copied by the sync.
HB3.2 | handbook-app/script_handbook.html, index.html, styles_handbook.html | Quizzes in the contents → the list by chapter with standing chips (a locked quiz's button disabled, "Locked"); the quiz bar on a section with a quiz (markCurrent); a sitting shuffled in the browser (hbQuizOrder_ — true/false keeps True, False) and answered in the original order (hbQuizAnswers_); every question required; the result with each wrong answer's explanation and a "Read N.N" link (only to a section in the contents — never a raw id); attempts left / locked until; Try again; history {quizzes} / {quiz}; the people view's Quiz lock-outs with Reset. Each answer is for its own view (g81) — the list load has its own counter; a failed list load keeps the bar's list (g129) and is said in the view. A disabled .kb-btn now looks disabled.
HB3.2 | tests | pure HB3.2-a..d (helpers; a reader end to end; the reset gate and lock-out list, unset vs unreachable; structural — appends only, the KB read for ManualQuizzes only, caller → lock → append, the engine copied not declared); DOM: five drives (+ a cross-quiz late answer added after a NO BITE); visual: four scenarios (one on the CI gate). 11/11 bites.

TEST RESULTS: pure 1461/1461, DOM 321/321, lint-server clean (20 files, 2 projects), handbook-sync --check clean (121 server declarations copied), counts --check clean, visual CI gate 29/29 PASS; the four new scenarios measured clean and were read — two defects found by reading (a raw section id for an unpublished section; an enabled-looking disabled button) and fixed before commit. Regression Scenarios: Team Tools untouched (no web-app/ file changed); the handbook app's reading, search, feedback and people paths — PASS by their HB1.3/HB1.4/HB2.1 drives, unchanged.
REGRESSION RISKS: every visit makes one more request (hbListQuizzes — the quiz list is cached, the attempts tab is read whole each call); at the plan's scale (~75 readers) the attempts tab stays small, but it is never purged. A quiz sitting is lost if the reader navigates away mid-way (no "leave this quiz?" ask).
INVARIANTS AT RISK: None — the answer key stays server-side (the strip is pinned by HB3.2-b), Team Tools is unchanged, and the KB is only read.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (one new capability)

OPERATOR ACTIONS / DEPLOY:
- Handbook app: `npm run handbook:push`, then Deploy → Manage deployments → New version (no new permission) | BLOCKS DEPLOY: Y (handbook app only)
- Nothing else to set: the attempts tabs are created by the first attempt; quizzes appear once HB3.5's questions are approved, exported and imported in Team Tools | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured

FOLLOW-ON ITEMS:
- Leaving a quiz mid-sitting loses the answers without asking (the page's navigation is synchronous; an ask would need the overlay discard pattern, g166).
- QuizAttempts / QuizResets grow without a purge; HB3.4's manager view and export is the natural place to decide retention.
- The Quizzes entry in the contents is not marked "current" while the list is showing (Home is marked the same way).

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (decision + index line, handbook-app.md, operator note, harness log, Subsystems, CLAUDE.md hand-written file list and inventory line, counts).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
