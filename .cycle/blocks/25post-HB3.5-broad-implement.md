---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: none (plan batch, not a scan finding)
New capabilities (G/ST): HB3.5 (handbook app plan, operator 2026-10-28: "I draft questions from the chapters for your review. Nothing is published until you approve them."; operator answers 2026-10-30 — Chapters 0 and 1 first, one quiz per chapter of ~10 questions at 80%, reviewed on a page) — the first two official quizzes, drafted, and the draft status that keeps them from readers until approved
Files modified: manual/quizzes.py, manual/export_reference.py, manual/data/quizzes.json, manual/README.md, test/client/run.js, docs/handbook-app.md, docs/design-decisions.md, docs/operator-state.md, docs/test-harness-log.md, CLAUDE.md, .cycle/STATE.md
Estimate: M (~3 h) — written before the first edit (the plan said M (~3 h per few chapters))
Actual: ~2 h (the plan and questions 0.2 · reading Chapters 0 and 1 0.4 · the status rule + self-test 0.3 · the 20 questions 0.5 · pins + bites 0.3 · review page 0.2 · docs 0.1)

CHANGES:
HB3.5 | manual/quizzes.py | every quiz now carries a REQUIRED `status`, "draft" or "published" (STATUSES); a draft is checked exactly like a published quiz (a broken draft still fails the export) but only a published quiz is appended to the export shape; `drafts(bank)` names the held-back ids; the self-test drives a draft kept back, a broken draft failing, no status and an unknown status refused (23 refusals).
HB3.5 | manual/export_reference.py | reads the bank once, exports the published quizzes, and the summary line names the drafts: "quizzes : 0 (0 questions, every section verified); 2 draft(s) checked, not exported: q-csr-core, q-call-handling".
HB3.5 | manual/data/quizzes.json | two draft quizzes written from the chapter text as it stands — q-csr-core (Chapter 0, attached to §0-1: patient lookup by phone, re-open by email, what not to say, insurance-change fields, OOP handling and its respiratory exception, the subject format, taking an authorization decision, outbound attempts, no details on voicemail) and q-call-handling (Chapter 1, attached to §1-1: verifying a family caller, one-way information, 9-1-1, warn-then-disconnect, gathering before escalating, a death call's pick-up, oxygen never owned, Medicare complaints to a supervisor, the Spanish Queue Voicemail, QMB); ten questions each (single, multi, true/false), 80%, every answer and explanation traced to the section the question names.
HB3.5 | test/client/run.js | HB3.5-a (every quiz says draft or published; the check refuses anything else and exports only published; the export names the drafts); HB3.5-b (the drafts, resolved the way the export resolves a section token, pass Team Tools' own import check — kbManualQuizzesValidate_ and the engine — as they stand; ~10 questions, 80%, each question inside its own chapter). Bites 8/8: 6 pure (published-only, status required, an out-of-range answer, a missing explanation, an off-chapter question, a missing status) + 2 on the Python self-test by hand.
HB3.5 | review page | https://claude.ai/artifact/MC3N9rPaqfctYWR7fWMqon — generated from the bank (every question, the marked answer, the wrong-answer explanation, the section), with Keep / Change / Drop and a note per question and "Copy my notes" (kept in the reviewer's browser only).

TEST RESULTS: pure 1480/1480, `quizzes.py --check` ok, the real export clean over the bank ("every section verified; 2 draft(s) checked, not exported"), counts --check clean. Regression Scenarios: none touch the quiz bank's export path beyond HB3.1's import, which receives no quizzes until one is published (its "Quizzes: 0" path is unchanged).
REGRESSION RISKS: a quiz written without `status` now fails the export instead of publishing — intended; the bank had none before this batch.
INVARIANTS AT RISK: None — no app code changed; the answer keys stay in the repo and the ManualQuizzes tab, never a client.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (G/ST: one new capability)

OPERATOR ACTIONS / DEPLOY:
- Review the drafts on the review page and paste the notes back; on approval the quizzes are flipped to "published" | BLOCKS DEPLOY: Y (for these quizzes only)
- After approval: `manual/make_all.sh` → Team Tools Reference → Handbook → Check → Import (the dialog's "Quizzes:" line names them) | BLOCKS DEPLOY: N
Deploy: no app deploy — the change is in the manual build and the bank

REVIEW (operator 2026-10-30, after the block above): q-csr-core Q7 gained the over-long subject line as a distractor; q-call-handling Q9 now asks what to do first, with the spanishcalls email named the secondary option; §1-7.1 (src/p1.md) was changed to match — a fourth step and a rewritten note — with a changelog entry flagged for retraining; both quizzes approved and set to "published". The export now carries 2 quizzes (20 questions), every section verified; the build's HTML validation reports 0 errors; pure 1480/1480.

FOLLOW-ON ITEMS:
- The remaining chapters (2–10, the appendices) — drafted the same way when the operator asks; manual/training/billing-knowledge-check.md is a ready source for Chapter 10.

DOCUMENTATION UPDATES NEEDED:
- None beyond this batch's (manual/README.md, docs/handbook-app.md "Drafts (HB3.5)", the HB3.1 design decision's HB3.5 paragraph, docs/operator-state.md, docs/test-harness-log.md).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
