---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- S2 (High) — spreadsheet formula injection, in its complete form: EVERY server write (183 sites: all 14 filePushOrder files + DevTools.js) goes through one sheet-safe boundary, held by an AST lint rule and derived pins. Phased as (1) the helper + behavioural pin, (2) the blanket wrap + pin repairs, (2b) a plain-text-cell path for the '@'-formatted writers, (3) the derived nets + bite-checks.

Files modified:
- web-app/10_core.js (helpers: sheetSafe_, sheetSafeRow_, sheetSafeRows_, sheetText_, sheetTextRows_, appendRowsTextSafe_, sheetColLetter_; its own 7 writes)
- web-app/00_config.js (QA_RECORDINGS/EXEMPTIONS/COMMENTS/SCORECARDS_TEXT_IDX)
- web-app/20_timeclock.js, 30_callnotes.js, 50_deptrequests.js, 51_spanish.js, 60_intake.js, 61_forms.js, 70_kb.js, 80_training.js, 81_empdocs.js, 82_coaching.js, 90_qa.js, DevTools.js (every write wrapped)
- scripts/lint-server.mjs (SHEET-SAFE no-restricted-syntax rule)
- test/client/run.js (4 new pins; 26 pins updated from the old write shapes; 3 vm sandboxes given the REAL helpers)
- test/client/server-split-manifest.json (regenerated)
- CLAUDE.md (running totals: pure 937 → 941)
- .cycle/STATE.md, .cycle/blocks/22-S2-broad-implement.md
Estimate: L (~9 h) — helper+pin 1h · wrap ~180 sites + pin repairs 6h · derived pin + bite-checks 2h
Actual: ~5 h (the AST-driven wrap made the 183 sites mechanical; a first hand-rolled tokenizer mis-read regex literals and was discarded before commit; the '@'-cell path was unplanned, ~1 h)

CHANGES:
S2 | 10_core.js | `sheetSafe_(v)`: a string whose first non-whitespace char is `=` — or `+`/`-`/`@` in front of anything that is not a plain number — gets Sheets' literal-text apostrophe prefix (NOT part of the stored value: getValue/getDisplayValue return the text unchanged). Numbers, Dates, booleans, null, '' and plain-number strings ("-1.5", "+2") pass through, so every existing numeric column reads as before. `sheetSafeRow_` / `sheetSafeRows_` map it over a row / a block.
S2 | 14 server files + DevTools.js | Every `.appendRow(x)` → `.appendRow(sheetSafeRow_(x))`, `.setValue(x)` → `.setValue(sheetSafe_(x))`, `.setValues(x)` → `.setValues(sheetSafeRows_(x))` — 183 sites, rewritten from an espree AST (argument ranges exact; no judgement of which text is user-supplied). Closes the time-off note / punch-adjust reason / DeptRequests / ClientErrors / AuditLog paths into the ADP/payroll spreadsheet, and every other store (per-rep Call Notes, Forms incl. the anonymous public submit, Intake, KB, HR docs, Coaching, QA, Spanish, training).
S2 (2b) | 10_core.js, 00_config.js, 90_qa.js, 30_callnotes.js, 70_kb.js | Plain-text ('@') cells take input literally, so the apostrophe would be STORED there ("- call back" → "'- call back"). Those writers — the scratchpad cell, the KB data-table import, and the QA text columns (recordings FileId/Name/Agent/SkipReason/AgentId, exemptions, comment Text, scorecard Notes) — write raw via `sheetText_` / `sheetTextRows_(rows, textIdx)`, each RE-ASSERTING '@' on the exact target cells first (a lost or un-inherited format would otherwise turn raw text back into a formula). The five QA appends use `appendRowsTextSafe_(sheet, rows, textIdx)` (format the new rows' text cells, then one write; grows the grid first — getRange past the grid throws, where appendRow extended it). The QA '@' columns are now ONE index list per tab; getOrCreateQaSheet_ derives the letters (unchanged: A,B,K,N,O / A,B,C / F / F).
S2 | scripts/lint-server.mjs | An ESLint `no-restricted-syntax` rule over the one combined parse: `.appendRow` must take `sheetSafeRow_(…)`, `.setValue` `sheetSafe_`/`sheetText_`, `.setValues` `sheetSafeRows_`/`sheetTextRows_`; `setFormula(s)`, `setFormula(s)R1C1`, `setRichTextValue(s)` banned. Exempt: Tests.js fixtures only. Verified to bite three ways (an unwrapped setValue, a setFormula, a bare appendRow in DevTools.js).
S2 | test/client/run.js | New: (1) sheetSafe_ behaviour — 13 neutralised shapes incl. leading whitespace and a tab, 19 untouched shapes incl. JSON, dates, times, ADJ- markers, "'=already literal" and plain numbers, non-strings by identity; (2) a zero-dep textual net over every pushed non-test file (the CI floor, before npm ci) + the lint rule's shape; (3) the plain-text path DRIVEN against a fake sheet that throws past the grid — grow, format the new rows' text column, one write, raw only there; (4) a derived rule that every raw plain-text write follows setNumberFormat('@') in its own function, every appender holds the lock and passes a _TEXT_IDX list, with the guarded sets named (4 raw writers, 5 appenders). Updated: 26 pins whose regexes/indexOf encoded the old write shapes; 3 vm sandboxes (the shared `sb`, F-10, F3 archive) load the REAL helpers, never a pass-through stub.

TEST RESULTS: pure 941/941 (was 937: +4 new, 26 updated), DOM 145/145, `npm run lint:server` clean (now also the SHEET-SAFE rule), `counts --check` clean. 15 bite-checks, ALL BITE — pure ×12 (`=` not neutralised; `+`/`-` not neutralised; numbers neutralised too; leading whitespace bypasses; a time-off note unwrapped; a raw write with no '@'; the scratchpad without '@'; no grid growth; write before format; raw everywhere; appender outside the lock) and lint ×3 (unwrapped setValue; setFormula; bare appendRow in DevTools.js). Editor suite NOT run (no Apps Script runtime here).
Regression scenarios (Test Command `manual`): the change touches every server write path, so every Server-subsystem scenario overlaps; all are NOT APPLICABLE here (they need the editor or the live app). The walk owed is listed under OPERATOR ACTIONS.

REGRESSION RISKS:
- UNVERIFIED PLATFORM SEMANTICS (the two load-bearing assumptions): (a) Sheets hides a leading apostrophe on a normally formatted cell (documented behaviour); (b) a '@' cell stores its input literally, apostrophe included — the reason for the plain-text path. If (b) is wrong the plain-text path is merely redundant, never unsafe (the cells are '@', which never evaluates). The post-deploy walk checks both directly.
- A server string beginning `+`/`-`/`@` that is NOT a plain number and that some reader expected Sheets to coerce (e.g. "-$5.00" → currency) would now be stored as text. No such writer was found; plain-number strings are exempt precisely to keep numeric columns unchanged.
- The five QA appends moved from the atomic `appendRow` to `getLastRow() + 1` under the ScriptLock they already held — pinned (appender-holds-the-lock). QA sync previously wrote at `getLastRow() + 1` with NO grid growth; it now grows first.
- Existing cells that ALREADY hold an injected formula are untouched: this closes the door, it does not clean the room (operator action below).

INVARIANTS AT RISK: None broken. g09/g10/g13 (coercion): unaffected — only strings starting `= + - @` change, and the apostrophe prefix itself prevents coercion rather than causing it. g17 (lock around writes): the QA appenders stay inside the lock (pinned). INV-150 (ClientErrors PHI-free) and INV-113 (public endpoints) unaffected. The KB import's '@' format (DT-3) and the QA '@' columns (QA-3/QA-10) are preserved and now re-asserted at write time.

NET SCORE: 0 production fixes − 0 new failure modes = 0 (1 defensive, S2). Not confirmed to have FIRED this month: that needs a read of the live stores for cells holding a formula (below). A callback typed `+1 …` storing #ERROR! is the likeliest real firing — the reflection should check a per-rep Notes tab before re-scoring.

OPERATOR ACTIONS / DEPLOY:
- Deploy (Batch 1 and S2 ride the same push) | BLOCKS DEPLOY: N
- Post-deploy walk: (1) Time / PTO → request a day off with the note `=1+1` → the calendar note reads `=1+1` (not 2) and the TimeOffRequests cell shows `=1+1` as text; (2) Call Notes → log a note with callback `+1 555-0100` and issue `- called back` → both read back exactly, no #ERROR!, no visible apostrophe; (3) Scratchpad → type `- first line`, close, reopen → no leading apostrophe (the '@' path); (4) QA → add a comment `- check greeting` → it reads back without an apostrophe; (5) the editor `runSmokeTests` → Failed: 0 | BLOCKS DEPLOY: N
- Optional clean-up: formulas ALREADY stored by the old code stay live. In the editor, for each store (ADP incl. TimeOffRequests/PunchAdjustRequests/DeptRequests/ClientErrors/AuditLog, the per-rep Notes tabs, KB comments/requests, Forms, HR, QA), `sheet.getDataRange().getFormulas()` lists any non-empty formula cell; replace each with its text (prefix `'`) | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- Client "Copy table" buttons write TSV to the clipboard; a manager pasting into their own Sheet re-opens the same class for any cell starting `=`/`+`/`-` (roster names, notes excerpts). Outside the server boundary; a client-side twin of sheetSafe_ in the copy helper would close it.
- No tool yet finds formulas ALREADY stored (see the optional clean-up); a read-only owner-run scanner would make that one click.
- Tests.js fixtures write raw (exempt by design); a fixture that seeds user-shaped text starting `=` would store a formula in the TEST store.
- C1 (archive movers throwing past a 1000-row grid) is untouched; appendRowsTextSafe_ shows the grow-first shape that fix would reuse.

DOCUMENTATION UPDATES NEEDED:
- docs/gotchas.md + the CLAUDE.md index: a new "Sheets coercion & typed reads" gotcha — a string written by setValue/setValues/appendRow is parsed as if typed (`=`, and `+`/`-` before a non-number, become formulas); every write goes through sheetSafe_ (or sheetText_ into a re-asserted '@' cell); Verify: the SHEET-SAFE lint rule + the S2 pins.
- .cycle/config.md: an invariant for the SHEET-SAFE boundary (next free INV-243, or INV-244 if Batch 1's PUBLIC-GATE takes 243); walk steps on the scenarios named above.
- docs/design-decisions.md: why a BLANKET boundary rather than per-field (judgement of "user-supplied" was the failure mode), and why the '@' writers are the one exception.
- docs/operator-state.md: the optional stored-formula clean-up.
- test/client/README.md: lint-server now carries the SHEET-SAFE rule as well as no-undef.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
