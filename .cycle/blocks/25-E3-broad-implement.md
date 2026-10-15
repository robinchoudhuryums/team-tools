---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (E3 is an expansion batch).
New capabilities (G/ST):
- G2: a handbook feedback export for the repo-side editors. Operator decisions, 2026-10-15:
  - an admin "Export feedback" Google Sheet, one row per section, plus `manual/feedback_report.py` to turn its CSV into a Markdown worklist by source file;
  - "Suggest an edit" gets its own `suggest` kind;
  - a re-import that CHANGES a section's text counts as its review.
- ST3: handbook sections suggested from the Call Notes Issue text. Operator decision, 2026-10-15: a slim "Handbook:" strip under the Issue field, up to 3 sections; a click opens the drawer at the section; it follows the existing per-rep suggest setting.
Files modified: web-app/00_config.js, web-app/70_kb.js, web-app/kb/script_kb.html, web-app/cn/script_callnotes.html, web-app/Tests.js, manual/feedback_report.py (new), manual/README.md, .github/workflows/client-tests.yml, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md, docs/design-decisions.md, docs/modules.md, docs/operator-log.md, .cycle/config.md, .cycle/STATE.md
Estimate: L (~2.5 days ≈ 20 h, the plan's figure). Written before the first edit, after the operator's four answers (STATE.md Estimates line, 2026-10-15).
Actual: ~4 h

CHANGES:
G2 | web-app/00_config.js | `KB_FEEDBACK_KINDS` gains `suggest`. `KB_FEEDBACK_NOTED` (stale, suggest) names the kinds that keep a note and stay open until a review.
G2 | web-app/70_kb.js | Server changes:<br>• `kbFlagItem` takes `suggest` for `man-` ids only. An empty or over-500-character suggestion is REFUSED, never cut. The audit row reads `id=…; kind=suggest`, never the words.<br>• `kbStaleFlags_` counts `stale` and `suggest` apart, each keeping its latest note.<br>• `kbGetReviewDue` ships `suggestFlags` / `suggestNote`. Either kind puts an item in the queue, and both sort it up.<br>• The new pure `kbManualReviewOnUpdate_` is the ONE rule for an import update: a changed body takes ReviewedAt/By = the import; a title or order change keeps the old review. `kbImportManual` uses it for the write and for the summary's `reviewed` count; the audit row gains `reviewed=N`.<br>• New `exportHandbookFeedback()`. Admin-gated before any read, read-only on the stores. Its inputs come through `kbHandbookFeedbackInputs_` (the KB tab plus the KbFeedback tail), so the writer never holds the KB tab (M5b-I2).<br>• The pure `kbHandbookFeedbackRows_`: votes are cumulative; open items count only after the last review; suggestions are labelled apart; notes go on one line; no rep names.<br>• The pure `kbManualSourceRef_` maps an article id to `src/pN.md §N-x`.<br>• The export writes a pinned Sheet: a Feedback tab with the text columns '@', and an About tab giving the feedback window (g152) and the script command. It grows the grid (g145), shares the Sheet with the caller, and writes a counts-only audit row (`KbHandbookFeedbackExport`). An unreadable comment tab is refused.
G2 | web-app/kb/script_kb.html | Client changes:<br>• Suggest an edit sends `suggest`. The prompt refuses over 500 characters (`KB_SUGGEST_MAX`, pinned to the server limit).<br>• Review due shows a blue "suggested edit · N" chip, an info-coloured dot and the suggestion's words, apart from the red "out of date".<br>• The Handbook dialog gains "Feedback for the handbook's editors" with Export feedback. It is disabled in flight; success SHOWS the link (it is never opened after the RPC, g135); a failure gives the button back; a cut window is said in the warn tone.<br>• The import result says how many sections with new text count as reviewed.
G2 | manual/feedback_report.py, manual/README.md, CI workflow | A stdlib-only script reads the exported CSV and refuses a file that is not the export. It prints a worklist grouped by source file, in export order, with the notes made inert, followed by the sections voted not helpful with no open item. `--check` is its self-test, and CI runs it in the handbook step.
ST3 | web-app/kb/script_kb.html | `kbHbStrip*`:<br>• Search timing: a document-level input listener on `#cn-fld-issue` waits 700 ms after the rep stops typing. `kbHbStripRefresh_` then needs at least two words of 3+ characters, honours `umsKbPanel.suggest`, reuses the answer for the same text, sends one search per text in flight, and calls `searchReference(text.substring(0,250), {publishedOnly: true})`.<br>• Answers: a sequence guard drops a stale answer; a failure shows nothing and never beacons (g146).<br>• The pure `kbHbStripPicks_` keeps handbook sections only, one per section at its best part, no drafts, at most 3.<br>• The pure `kbHbStripHtml_` puts the picks in data-* only, escaped, with a labelled × that turns the shared setting off.<br>• `kbHbStripOpen_` opens the drawer at the section, and the drawer's own suggest toggle refreshes the strip.<br>• The `kbSuggestMatches_` comment now says which paths send the text.
ST3 | web-app/cn/script_callnotes.html | A hidden `#cn-hb-suggest` host sits in the Issue row (grid column −2/−1, under the field in every layout), with its CSS. `cnClearActiveForm_` refreshes the strip.
Tests | web-app/Tests.js | `exportHandbookFeedback` is added to the admin-gate omnibus and to the admin-tier list.
Tests | test/client/run.js | Eight new E3 pins, all driven:<br>• kbFlagItem;<br>• the review queue over the real kbStaleFlags_ + kbGetReviewDue;<br>• the import review rule, plus the TDZ guard on the summary count;<br>• the source map, derived over every heading in manual/src;<br>• the export rows;<br>• the export endpoint: gate, refusals, '@' cells, About tab, audit;<br>• the client pure functions and their wiring;<br>• feedback_report.py --check, which FAILS rather than skips without python3.<br>M1-S5 now asserts the import's review on a changed section, with an older manager review in the fixture, plus `reviewed=` in the audit row. Lists updated on purpose: S2's raw-text writers (eleven), the X1 fixture net and batch-3's fixture regex (the review-due fixture now spans lines).
Tests | test/client/dom/runDom.js | Two new drives and one updated test:<br>• "E3 DOM (ST3)": typing, the debounce, published-only search, the stale drop, three picks, a click opening the drawer at the section, reuse of the answer for the same text, Clear Note, a failure, the × setting, and off meaning nothing is sent.<br>• "E3 DOM (G2)": the queue chips and the export button lifecycle.<br>• The M2 DOM suggest test now expects `suggest` and the 500-character prompt refusal.
Tests | test/visual/mock.js, shoot.mjs | Fixtures for `exportHandbookFeedback` (a cut window) and a review-due item with a suggested edit, plus `reviewed` on the import mock. Four scenarios: `reference-manual-feedback-export-light-wide`, `reference-review-due-light-mobile`, `cn-log-handbook-strip-light-mobile` and `cn-log-handbook-strip-dark-wide`.
Bites | — | 26 hand mutations, all red:<br>• the suggestion is written as stale;<br>• a suggestion is allowed on any item;<br>• a suggestion is silently cut;<br>• a suggestion is counted as stale;<br>• a suggestion ignores the review;<br>• a suggestion alone does not make an item due;<br>• the import keeps the old review on a text change;<br>• the import write ignores the helper;<br>• a title change counts as a review;<br>• the source ref has the wrong case;<br>• the rows ignore the review;<br>• the rows keep newlines;<br>• the export gate is moved after the reads;<br>• a comments failure is ignored;<br>• the notes column is not '@';<br>• the export's cut window is not said;<br>• the strip shows drafts;<br>• the strip shows duplicate sections;<br>• the strip paints a stale answer;<br>• the strip sends drafts;<br>• the strip ignores the off setting;<br>• Clear Note leaves the strip;<br>• the queue's suggest chip is missing;<br>• the export button stays enabled;<br>• the export link's url is unescaped.<br>The "import keeps review" mutation first missed M1-S5. Its fixture created and updated the row in the same second, so the old and new stamps were equal (g116: a fixture the code's own timing erases). The row now carries an older manager review, and both import mutations bite M1-S5.
Docs | CLAUDE.md, docs/*, .cycle/config.md | Docs updated:<br>• a new design decision with its index line, plus an amendment to the drawer decision (one toggle for both);<br>• INV-379;<br>• S141;<br>• `.cycle/config.md:1401`'s stale claim that the Issue text never leaves the browser, corrected;<br>• INV-136 names the endpoint;<br>• modules.md (Reference and Call Notes);<br>• the operator log;<br>• the running totals.

TEST RESULTS: passed.
- Pure harness 1343/1343; DOM harness 258/258.
- `npm run lint:server` clean; `counts.mjs --check` clean; `split-manifest.mjs --check` current (1698 declarations); `feedback_report.py --check` passed.
- Visual: the four new scenarios gave 0 overflow, 0 runaway, 0 squeezed text, 0 errors and 0 missing fixtures, and were read by eye. The first wide shot put the strip in the label column; it was fixed with grid-column. Then the `reference` + `cn-` subsets were re-shot.
- Test Command is `manual`. S141 needs the deployed DEV instance: NOT RUN. The editor suite's new gate case was not run either.
REGRESSION RISKS:
(1) Old suggestions. Suggestions sent before the deploy stay `stale` rows and read "out of date" (no migration; the operator log says so).
(2) Review dates after a fix. A changed section's ReviewedAt moves to the import time, so the publish stagger no longer spreads those sections' review dates. They come due one review window after the import, which is the intended meaning.
(3) Duplicate search on drawer open. A Log chip opens the drawer, and the drawer's home first searches the Issue text for its own suggestions before the section opens. That is one extra read-only search; its answer is dropped by the view guard. The pre-existing drawer path is unchanged.
(4) Search load. While typing, the strip adds one search per 700 ms pause on the Log for reps with suggestions on. It hits the cached index and takes no lock.
(5) Export size. The export reads the whole KB tab and the 4000-row feedback tail on an admin press.
INVARIANTS AT RISK:
- INV-139 is extended, not broken: the review queue still clears on Reviewed, and a suggestion is a new open kind.
- INV-136: the new admin endpoint is gated before reads and named.
- INV-119/361: no Issue text reaches a vendor; the strip uses our searchReference only.
- INV-185: fixtures added; the X1 net passes.
- M5b-I2: the export does not take the KB tab in its writer.
- g144 / S2: the text cells are '@'.
- g146: no beacon.
- INV-379: new.
NET SCORE: 0 production fixes − 0 new failure modes = 0.
- G2 and ST3 are new capabilities: (a) NO.
- (b) New failure modes: NO.
- During the batch, a TDZ ReferenceError (`now` read before its declaration in kbImportManual's summary) was caught before commit. It is pinned so it cannot return.

OPERATOR ACTIONS / DEPLOY:
- Deploy: `clasp push -f` from `web-app/`, then a New version. This rides the owed cycle-25 deploy. No trigger change, no new Script Property. | BLOCKS DEPLOY: N
- Walk S141 on the DEV instance. | BLOCKS DEPLOY: N
- Tell the team about the Handbook line under Issue and its ×, and tell the handbook's editors about Export feedback and `manual/feedback_report.py`. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` (prod), or `npm run push:dev` first for the DEV instance

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The drawer's own suggestion fetch fires when the strip opens the drawer at a section (risk 3). A small guard could skip the home render's fetch when an item open follows immediately.
- The export does not include rep names. If the editors need to ask a rep about a suggestion, a names-on-request option (kept out of the repo) would be a follow-on decision.
- The export link renders in the browser's default link colour inside `.kb-man-res`, as other result links in that dialog would. It is not styled to the accent.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
