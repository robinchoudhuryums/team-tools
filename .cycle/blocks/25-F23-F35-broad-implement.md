---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- F23 (deferred for an operator decision; decided 2026-10-15, the recommended option): Ctrl/⌘+Backspace in any Call Notes field cleared the WHOLE form, while the OS binds the same chord to "delete the previous word". A rep deleting a word lost the note. Clear Note now uses Ctrl/⌘+Shift+Backspace.
- F35 (deferred for an operator decision; decided 2026-10-15, the recommended option): a Log quick chip ("Action 42") counts all time, but opened History on whatever range was last used, and History can show at most 90 days. The chip now opens History on the last 90 days with its filter. When the chip's count is larger than that range holds, History says how many notes are older and points to Search.
New capabilities (G/ST): None. (History gains a "Last 90 Days" preset as part of F35.)
Files modified: web-app/cn/script_callnotes.html, test/client/run.js, test/client/dom/runDom.js, test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md, docs/design-decisions.md, docs/operator-log.md, .cycle/config.md, .cycle/STATE.md
Estimate: S (~2 h). Written before the first edit (STATE.md Estimates line, 2026-10-15).
Actual: ~1.5 h

CHANGES:
F23 | web-app/cn/script_callnotes.html | The form keydown handler takes Ctrl/⌘+Shift+Backspace (no Alt) as Clear Note: it calls preventDefault, and a held, auto-repeating chord clears only once. Plain Ctrl/⌘+Backspace is no longer handled, so the browser's word-delete runs. The shortcuts sheet row reads "Ctrl/⌘ + Shift + Backspace".
F35 | web-app/cn/script_callnotes.html | Changes:<br>• `cnHistoryPresetRange_` gains `last90` (today − (CN_HISTORY_MAX_SPAN_DAYS − 1) → today), and History gains a "Last 90 Days" preset button.<br>• Quick chips carry `data-label` / `data-count`. A click sets the filter and the last-90 range, and records `CN_STATE.historyChipHint` ({key: range + filter, label, count}).<br>• The new pure `cnHistoryChipNoteHtml_(hint, curKeyFilter, shown)` returns the note ONLY for the chip's own range and filter, ONLY after that range has loaded, and ONLY when the count exceeds the notes shown. Its text is "Showing the last 90 days: N of your C <Label> notes. The other K are older — … use Search …", with the label escaped and singular/plural handled.<br>• `cnRenderHistoryStack_` appends the note in all three summary branches.<br>• A `.cn-history-chipnote` rule is added.
Tests | test/client/run.js | The new pin "F23 + F35 (cycle 25)":<br>• the one-line Backspace clear is gone and the Shift chord is present;<br>• `cnHistoryChipNoteHtml_` is driven for: escaping, null before load, an equal count, a key mismatch, a filter mismatch, and the singular.<br>`getMyCallNotesRange` is removed from `X1_NO_FIXTURE_READS` because it now has a fixture.
Tests | test/client/dom/runDom.js | Two drives:<br>• "F23 DOM": plain Ctrl and Meta Backspace are neither prevented nor clear the form; Ctrl+Shift clears it; the shortcuts row names Shift.<br>• "F35 DOM": clicking the Action chip (42) gives an 89-day span with the action filter; after the load, the summary says "3 of your 42 Action notes. The other 39 are older" and "use Search"; after the Last 7 preset the note is gone.
Tests | test/visual/mock.js, shoot.mjs | A `getMyCallNotesRange` fixture is added, along with History's first scenarios: `cn-history-light-wide` and `cn-history-light-mobile`. callNotesHistory leaves the VIS-COVER gap marker.
Bites | — | 8 hand mutations, all red:<br>• plain Ctrl/⌘+Backspace clears again;<br>• the Shift chord removed;<br>• the shortcuts sheet row unchanged;<br>• the chip keeps the last range;<br>• the note not rendered;<br>• the note ignores the range/filter key;<br>• the note claims before the range has loaded;<br>• the label unescaped.
Docs | CLAUDE.md, docs/*, .cycle/config.md | The keyboard-shortcuts design decision is amended (Shift chord), and the operator log gets an entry. In `.cycle/config.md`, the VIS-COVER marker drops callNotesHistory and S115 gains the F23 + F35 step. The running totals are updated.

TEST RESULTS: passed.
- Pure harness 1335/1335; DOM harness 256/256.
- `npm run lint:server` clean; `counts.mjs --check` clean; `split-manifest.mjs --check` current.
- Visual `shoot.mjs cn`: 14 scenarios clean. `shoot.mjs cn-history`: 2 new scenarios, 0 overflow, 0 runaway, 0 squeezed text, 0 errors, 0 missing fixtures.
- Test Command is `manual`. S115's new step needs the deployed DEV instance: NOT RUN.
REGRESSION RISKS:
(1) Muscle memory. Anyone who learned Ctrl+Backspace as Clear Note now deletes one word instead. That outcome is safe, since nothing is lost, and the operator log asks the operator to tell the team.
(2) Chip range. A chip now always opens on the last 90 days, replacing the rep's last-used range. That is the decided behaviour; the presets and date fields still change it.
(3) Load cost. A 90-day History load is larger than a 7-day one, but it is still inside the server's existing 90-day cap and per-load bounds.
INVARIANTS AT RISK:
- INV-55: Clear Note still clears the draft through the same `cnClearActiveForm_` path; only the chord changed.
- g94 / C3: the 90-day cap is unchanged, and the chip uses `CN_HISTORY_MAX_SPAN_DAYS`, never a literal.
- g81: the note renders only for the loaded range's key.
- INV-185: the fixture was added and the X1 list shrank.
- Escaping: the label is `esc()`-ed and pinned.
NET SCORE: 2 production fixes − 0 new failure modes = 2.
- F23: YES. Word-delete is a habit in every text field, and it wiped the form.
- F35: YES. The chips are on the Log the reps use all day, and the count disagreed with what opened.
- New failure modes: NO for both.

OPERATOR ACTIONS / DEPLOY:
- Deploy: `clasp push -f` from `web-app/`, then a New version. This rides the owed cycle-25 deploy. No trigger change. | BLOCKS DEPLOY: N
- Tell the team: Clear Note is now Ctrl/⌘+Shift+Backspace. | BLOCKS DEPLOY: N
- Walk S115's cycle-25 F23 + F35 step on the DEV instance. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` (prod), or `npm run push:dev` first for the DEV instance

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The History preset buttons have a `.active` style that no code sets, so no preset ever shows as selected. This predates the batch; noticed while writing S115's step.
- The manager per-rep view has no quick chips, so F35 does not reach it.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
