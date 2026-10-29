---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: none (plan batch, not a scan finding)
New capabilities (G/ST): HB3.1 (handbook app plan, operator 2026-10-28) — one quiz engine for both apps (single, multi-select, true/false; explanation and section per question; the key never leaves a server), the official question bank in the repo with a build check, carried in manual.json and stored by Team Tools' Import
Files modified: web-app/00_config.js, web-app/80_training.js, web-app/70_kb.js, web-app/kb/script_kb.html, manual/quizzes.py (new), manual/data/quizzes.json (new, empty), manual/export_reference.py, manual/README.md, .github/workflows/client-tests.yml, test/client/run.js, test/client/server-split-manifest.json (regenerated), test/visual/mock.js, docs/design-decisions.md, docs/operator-state.md, docs/handbook-app.md, docs/test-harness-log.md, CLAUDE.md
Estimate: L (~6 h) — written before the first edit (the plan said M (~4 h))
Actual: ~3.5 h (scoping 0.5 · engine + Team Tools delegation 0.7 · quizzes.py + export 0.8 · import + dialog 0.8 · pins, bites, docs 0.7)

CHANGES:
HB3.1 | web-app/80_training.js, 00_config.js | the shared engine: quizQuestion_ / quizValidate_ / quizAnswerRight_ / quizGrade_ / quizStripQuestion_ / quizReview_ — pure, no CONFIG (the handbook sync can copy it); types single / multi (right only as exactly the set) / truefalse; explain (≤600) and section/anchor per question; opts.sectionIds requires a known section. Team Tools' trainValidateQuizDef_ (single-answer only), trainGradeQuiz_ and trainStripQuizForRep_ delegate with byte-identical results — their pins and TRN-1 pass unchanged. Limits as named constants (QUIZ_*), plus KB_MANUAL_QUIZZES_* for the tab.
HB3.1 | manual/quizzes.py, data/quizzes.json, export_reference.py, README.md, CI | the bank (shipped empty — HB3.5 writes the questions for review); check(bank, resolve): id q-…, used once; title; passPct 0–100; 1–50 questions; types; options (no two alike); correct; an explanation on every question; every quiz and question names a section that resolves — else the export fails, nothing written; the limits mirror the app's. The export resolves sections through its own index (sec_lookup, sec_target now uses it) and writes `quizzes` into manual.json; its count line no longer claims "verified" when the bank has problems. `--check` self-test (the good bank and 20 refusals) runs in CI's handbook step. Proven against the real manual with a throwaway bank: §3-8.1 → man-3-8#3.8.1; a missing section fails the export.
HB3.1 | web-app/70_kb.js, kb/script_kb.html | kbManualBundle_ reads `quizzes` (null for an older file); kbManualQuizzesValidate_ checks them again with the engine (section must be one of the file's articles; explanation required; one cell of JSON); a bad quiz refuses the whole file. ManualQuizzes (Id, Title, Section, Anchor, PassPct, QuestionsJson) compared under the lock and rewritten only when changed — text columns formatted '@' first (a title "3/4" stays text); an edited header is "could not read". A failed write is said beside the sections and retried by the next Import; the audit row and the dialog say what happened; the post-import toast warns on it.
HB3.1 | tests | pure HB3.1-a..d (engine driven; the Python mirror pinned + CI + export wiring; the import driven over the fake book; the dialog line); sandboxes for the Team Tools quiz pins and the import now load the engine; S2's raw-text list gains kbManualQuizzesWrite_; M2-E1 reads the bundle's quizzes. 10/10 bites (8 Node, 1 of them added after a NO BITE — the format pin named only the columns; 1 after a gap — nothing drove Team Tools' wrapper refusing a multi question; plus the Python section check by hand).

TEST RESULTS: pure 1457/1457, DOM 316/316, lint-server clean (19 files, 2 projects), handbook-sync --check clean (unchanged — Handbook.js does not use the engine yet), counts --check clean, cycle-closeout --check clean, quizzes.py --check ok, the manual export runs clean with the bank. Visual: reference-manual-import/imported measured clean and read (the Quizzes line draws). Regression Scenarios for the touched Team Tools areas — Training quizzes (create, take, grade, retry limit) PASS by their unchanged pins; the manual import (re-import writes nothing, images, meta, orphans) PASS by M1/M2/M3/KB2-8.
REGRESSION RISKS: Team Tools' quiz functions now run through the shared engine — byte-identical for single-answer quizzes (pinned), but a future engine change reaches both apps. A stored Team Tools quiz question that somehow carried `type` is still graded as before (no type → single). The Import now reads one more tab under its lock.
INVARIANTS AT RISK: None — the answer key stays server-side (the strip is whitelist-built, pinned), and the import's write-nothing-on-re-import rule holds for the new tab.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (one new capability)

OPERATOR ACTIONS / DEPLOY:
- Team Tools: clasp push + New version (the engine and the Import changed) | BLOCKS DEPLOY: N
- Nothing to import yet — the bank is empty until HB3.5's questions are approved; a re-import now prints "No quizzes…" for an older file or "Quizzes: 0 …" for a new one | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured

FOLLOW-ON ITEMS:
- HB3.2 copies the engine into the handbook app (its sync will, once Handbook.js names it), reads ManualQuizzes, stores attempts by address in the Handbook spreadsheet and keys the retry limit by address.
- manual/training/billing-knowledge-check.md is a ready source for a first official quiz (HB3.5), once its section references are re-checked against the October numbering.
- quizzes.py refuses two options that read the same; the app's engine does not (Team Tools' editor never needed it) — harmless, but the two rule sets differ there by design.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (decision + index line, operator note on the import, handbook-app.md Quizzes, manual/README, harness log, CLAUDE.md storage line, counts).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
