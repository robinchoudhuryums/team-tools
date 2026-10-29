---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: none (plan batch, not a scan finding)
New capabilities (G/ST): HB3.3 (handbook app plan, operator 2026-10-28; operator answers 2026-10-29) — managers write their own quizzes and build training plans (chapters, sections, quizzes; a due date; people and/or departments); readers get My training with progress
Files modified: handbook-app/Training.js (new), handbook-app/Quiz.js, handbook-app/.clasp.json, handbook-app/script_handbook.html, handbook-app/styles_handbook.html, handbook-app/kb_shared.js + shell_shared.html (GENERATED — quizValidate_/QUIZ_TYPES and overlayMarkDirty_ now copied), test/client/run.js, test/client/dom/runDom.js, test/visual/mock.js, test/visual/shoot.mjs, test/visual/ci-gate.cjs, docs/handbook-app.md, docs/design-decisions.md, docs/operator-state.md, docs/test-harness-log.md, .cycle/config.md, CLAUDE.md
Estimate: XL (~8 h) — written before the first edit (the plan said M–L (~5 h))
Actual: ~4.5 h (questions + scoping 0.4 · server 1 · pure drives 0.6 · page + editors 1.2 · visual + reading 0.4 · DOM drives 0.5 · docs 0.2 · bites 0.2)

CHANGES:
HB3.3 | handbook-app/Training.js | three Handbook-spreadsheet tabs, each record's body one JSON cell (no coercion — g144/g13): TeamQuizzes [Id, Author, QuizJson, UpdatedMs, Status], Plans [Id, Author, PlanJson, UpdatedMs, Status], ReadMarks [AtMs, Email, ItemKey, Done (yes/no)] — append-only, the latest mark per reader and item wins. Endpoints hbMyTraining (live plans reaching the reader now; items done — a reading item marked read, a quiz passed; progress; overdue), hbMarkRead (a published chapter or section), hbTeamTraining / hbSaveTeamQuiz / hbSavePlan / hbArchiveTraining (a marked manager or the admin; refused before the lock with "Handbook manager access required."; another author's quiz or plan refused; items must be published or the author's own live quizzes; people the author's confirmed team). Recipients resolved at READ time (hbAuthorTeam_ → hbPlanRecipients_): a manager's department assignment reaches their own confirmed people in it, the admin's everyone. A team quiz is visible only to its plan's recipients, its author and the admin (hbTeamQuizzesVisible_).
HB3.3 | handbook-app/Quiz.js | hbQuizFor_ — an official quiz or a team quiz under the visibility rule; HB_QUIZ_ID_RE takes both; hbListQuizzes lists the reader's visible team quizzes beside the official ones (team, authorName); hbTeamQuizLocks covers live team quizzes; hbGetQuiz now reads the store before the lookup.
HB3.3 | handbook-app/script_handbook.html, styles_handbook.html | Training in the contents → My training (plans: author, due, Overdue, progress bar, items with Open / Mark as read / Take the quiz; one mark ticks the item in every plan) and, for a manager or the admin, Team training (plans with their reach, quizzes, Edit / Archive / Restore, New plan / New quiz); the quiz editor (type, question, options one per line with * for the right ones, explanation, section; true/false hides the options box) and the plan editor (items by kind, each once; departments and people) as overlays with `unsaved` (g166). The editors' labels are kept from growing in a column (`.hb-ed-body .hb-pp-l { flex: none }`), and a hidden label is hidden despite its display rule (g73).
HB3.3 | tests | pure HB3.3-a..d (helpers; a manager's quiz and department plan end to end, the admin's plan, a newly confirmed member picked up at read time; the gates; structural); DOM: four drives; visual: four scenarios (one on the CI gate). 12/12 bites + 1 equivalent mutant recorded (hbAuthorTeam_'s "not a manager → nobody" guard — hbStanding_ already reads an unmarked manager's people as "gone").

TEST RESULTS: pure 1465/1465, DOM 325/325, lint-server clean (21 files, 2 projects), handbook-sync --check clean, counts --check clean, visual CI gate 30/30 PASS; the four new scenarios measured clean and were read — one defect found by reading (editor labels 14em tall in a column) and fixed before commit. Regression Scenarios: Team Tools untouched; the handbook app's quiz paths (HB3.2 drives) still pass with Quiz.js's lookup change; reading/search/feedback/people unchanged.
REGRESSION RISKS: every My training / Quizzes read now also reads the Plans, TeamQuizzes and People tabs (small; no cache). Recipients are derived each read — cheap at the plan's scale, linear in plans × people.
INVARIANTS AT RISK: None — the answer keys stay server-side (a team quiz's reaches only its author's and the admin's editor), Team Tools is unchanged, and the KB is only read.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (one new capability)

OPERATOR ACTIONS / DEPLOY:
- Handbook app: `npm run handbook:push`, then Deploy → Manage deployments → New version (no new permission) | BLOCKS DEPLOY: Y (handbook app only)
- Nothing to set: the three tabs are created on first use; managers build plans under Training | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured

FOLLOW-ON ITEMS:
- HB3.4: the per-person manager view (plan progress, scores, attempts, sign-offs, overdue, export) and the versioned "I've read this" that upgrades Mark as read; reminder emails off by default.
- A plan whose quiz is archived shows the item as not done with no way to finish it — the plan editor does not warn the author.
- Reads of Plans/TeamQuizzes are uncached; worth a short cache if usage grows.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (decision + index line, handbook-app.md Training, operator note, harness log, Subsystems, CLAUDE.md file list and inventory line, counts).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
