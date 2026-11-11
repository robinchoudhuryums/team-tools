---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (operator-planned work, not audit findings — the handbook refresh's Batch 3, `docs/design_handoff_handbook_refresh/README.md`)
New capabilities (G/ST): HBR3 — the handbook app's quizzes refreshed: the list as cards (chapter-wash head, score ring, status, one action, an All / To do / Passed filter, the chapters with no quiz named); taking a quiz one question per screen with a progress strip; the result page with every answer and a link from each miss to its section
Files modified: handbook-app/script_handbook.html, handbook-app/styles_handbook.html, handbook-app/Quiz.js, test/client/run.js, test/client/dom/runDom.js, test/visual/shoot.mjs, test/visual/mock.js, docs/design-decisions.md, docs/handbook-app.md, .cycle/config.md, .cycle/STATE.md, CLAUDE.md
Estimate: M–L (~5 h) — written to STATE.md's Estimates line before the first edit
Actual: ~3.5 h

CHANGES:
HBR3 list | handbook-app/script_handbook.html, styles_handbook.html | `hbQuizCard_` (PURE: pill / tone / ring / red ring under the pass mark / line / action / disabled from the reader's standing; no action without the Handbook spreadsheet), `hbQuizFilter_` (PURE: To do = not passed, a locked quiz included; Passed), `hbQuizCardHtml_` (a light head in the chapter's `kb-man-pN` colour with the big faint number aria-hidden, a kicker — the chapter or "Team quiz · author" —, the ring named for a screen reader, "N questions · pass X%", Last taken / Review §x / Covers §x / Locked until, the action named with its quiz), `hbRing_`, `hbQuizChapter_`, `hbSecKey_`, `hbShortDate_`; `hbPaintQuizList_` orders the cards by the contents, applies the filter (said when none is left) and names the chapters with no official quiz under "More quizzes"; the header carries the filter (aria-pressed).
HBR3 sitting | handbook-app/script_handbook.html, styles_handbook.html | `hbPaintTake_` draws a light header (the chapter's icon and wash — decision 4 over shot 09's dark bar), a progress strip, one question card and Back / Next / Submit; `hbPaintQuestion_` letters the options (real radios / checkboxes hidden INSIDE a positioned label — g171), restores the reader's choices, moves focus to the question; `hbQuizPick_` keeps a choice; `hbQuizStep_` refuses Next without an answer; `hbQuizStrip_` (PURE); `hbLeaveSitting_` leaves at once with nothing chosen, asks (uiConfirm) when answers would be lost; `hbSubmitQuiz_` takes the reader to the first blank question and says which; the answers still go in the original order (`hbQuizAnswers_`, unchanged). A heading that took focus from script shows no ring (HBR1's rule, extended).
HBR3 result | handbook-app/script_handbook.html, styles_handbook.html | `hbResultRows_` (PURE: every question in the order seen, what the reader chose in words, right or missed; a miss alone its explanation and section — never an option not chosen, so never the right one); `hbPaintResult_` draws a light card in the chapter colour with the big score ring, what happens next (tries left / the lock), Back to quizzes, Try again only when a try is left, Review opening the first miss's section, then the answers list; focus on the result.
HBR3 server | handbook-app/Quiz.js | `hbQuizStanding_` carries `lastMs` (the latest attempt; null when never).
HBR3 tests/docs | test/*, docs/*, .cycle/config.md, CLAUDE.md | Three pure pins (the card rule + filter + strip, the result rows, the CSS rules + lastMs), three new DOM drives (cards + filter + More quizzes; the stepper + Leave; the result), the two HB3.2 drives rewritten for the new screens (one question per screen, cards); the visual result hook answers one question at a time; five new handbook scenarios (quiz cards dark mobile, the To do filter, a sitting on its second question light/dark, the result on a phone) and the mock's list gains a team quiz and lastMs; INV-417, S176, the decision `#the-handbook-app-quizzes-are-cards-and-a-sitting-is-one-question-a-screen`, docs/handbook-app.md.

TEST RESULTS: pure 1631/1631, DOM 414/414, `lint:server` clean, `handbook-sync --check` clean, `counts.mjs --check` clean. Visual: all ten handbook-quiz* scenarios — 0 overflow, 0 runaway, no narrow text, no page errors, no missing fixture; read on camera (one fix found by looking: a phone wrapped the result rows' ✓/✗ onto their own line — now a grid). Axe (`--axe handbook-quiz`, WCAG 2.1 A + AA): PASS. Bite-checks: 19 of 19 mutations bite (12 pure, 7 DOM) on the first run. Regression: the HB3.2 / HB3.3 quiz scenarios (the quiz bar, the list, a sitting, the lock-out, a manager's reset, a failed load, a stale answer dropped, Training's quiz item opening a sitting) — PASS; S176 new — operator walk owed.
REGRESSION RISKS: A sitting is now several screens — a reader who used to scroll and answer in any order now steps through; Back keeps every choice. The visual matrix's result hook changed with it. Leaving through the browser's own Back mid-sitting does not ask (only Leave quiz does), as before.
INVARIANTS AT RISK: None — INV-417 added; TRN-1 (never the right option) kept and now pinned on the result rows; HB3.2's original-order answers unchanged.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (HBR3 is a new capability)

OPERATOR ACTIONS / DEPLOY:
- `npm run handbook:push` + New version (Team Tools unchanged; no new operator state) | BLOCKS DEPLOY: N
- Walk S176 on the DEV handbook app | BLOCKS DEPLOY: N
Deploy: `npm run handbook:push` (then New version)

FOLLOW-ON ITEMS:
- The mockup's "Due Nov 4" / "Assigned by …" on a quiz card would need the training plans joined to the quiz list; not drawn (the list does not carry plans).
- Batch 4 (Training, Profile, Saved, Forms, Display) remains.

DOCUMENTATION UPDATES NEEDED:
- None (done in this batch)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
