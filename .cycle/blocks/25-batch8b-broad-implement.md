---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- F30 (Low) — the manager cross-rep search silently capped at 500 results, with no truncated flag
- F31 (Low) — a training question added from a card (`setCallNoteFlag`) never triggered the immediate manager email (g92)
- F32 (Low) — `getMyPinnedCallNotes` scanned without the lock, then fetched by index without re-checking the row (g164)
- F33 (Low) — `getMySentForms` read a 2,000-row tail and capped at 200 with no flag; the patient timeline then said it was complete
- F34 (Low) — `getFormByToken` read the whole token column for any anonymous string, with no shape check first
- F58 (Low) — about 70 mutating endpoints took the global ScriptLock before checking the caller
- F59 (Low) — `reloadApp_`: a blocked `window.open` returned null and the reload silently did nothing (g135)
New capabilities (G/ST): None
Files modified: web-app/00_config.js, web-app/20_timeclock.js, web-app/30_callnotes.js, web-app/60_intake.js, web-app/61_forms.js, web-app/70_kb.js, web-app/80_training.js, web-app/81_empdocs.js, web-app/82_coaching.js, web-app/90_qa.js, web-app/cn/script_callnotes.html, web-app/script_core.html, test/client/run.js, test/client/server-split-manifest.json, CLAUDE.md, docs/gotchas.md, .cycle/config.md, .cycle/STATE.md
Estimate: M (~7 h, the plan's figure) — written before the first edit (STATE.md Estimates line, 2026-10-14)
Actual: ~2 h

CHANGES:
F58 | web-app/20_timeclock.js, 30_callnotes.js, 60_intake.js, 70_kb.js, 80_training.js, 81_empdocs.js, 82_coaching.js, 90_qa.js | in 70 public endpoints the two gate lines (`const <caller> = getEmployeeInfo_();` and its `if (…) return …;` refusal) moved, unchanged, from the top of the locked `try` to above `LockService.getScriptLock()` / `waitLock`. A mechanical transform, applied only where the try opened with exactly that gate; every file passes `node --check` and `lint:server`. Not changed: `submitQuizAttempt` and `installAutomationTriggers` (already gated first), `kbRecordView` and `saveMyScratchpad` (a per-user lock, which queues nobody else), and the two token endpoints (no employee gate — F34 / S9)
F30 | web-app/00_config.js | `CN_MGR_SEARCH_CAP` (500)
F30 | web-app/30_callnotes.js | `managerSearchCallNotes` returns `total` (every match) and `truncated` alongside the newest `CN_MGR_SEARCH_CAP`
F30 | web-app/cn/script_callnotes.html | `CN_STATE.mgrSearchTotal` (kept only for a capped answer, reset on an `{error}`); `cnMgrRenderSearchResults_`'s count line reads "Showing the newest 500 of N results … — narrow by date range to see older ones" (role=status) when capped
F31 | web-app/30_callnotes.js | `setCallNoteFlag` sends `notifyManagerTrainingQuestion_` after the lock (a `notifyAfter` in its `finally`, the submit path's M-7 shape) when a training flag carries a question different from the one already stored
F32 | web-app/30_callnotes.js | new pure `cnBlobPinned_(raw)`; `getMyPinnedCallNotes` reads the NoteId column with the SubformData column, and a fetched row must carry the scanned id (`formLocatedRowIs_`) or the note is found again by id (`findCallNoteRow_`); either way it must still be pinned to be listed
F33 | web-app/61_forms.js | `getMySentForms` returns `truncated` when rows sit above the 2,000-row tail or the list passed 200
F33 | web-app/30_callnotes.js | `getPatientTimeline` adds "sent forms (the newest only)" to `truncatedSources` (so the timeline is `partial`)
F33 | web-app/cn/script_callnotes.html | `cnRenderSentFormsView_(area, forms, errorMsg, truncated)`: a `.cn-sf-trunc` status line ("Showing your most recent forms only — older ones are not listed here"), and an empty truncated list never reads "No fillable forms sent yet"; the rule for `.cn-sf-trunc` added
F34 | web-app/61_forms.js | `getFormByToken` refuses a string not shaped like a v4 UUID (`formTokenShapeOk_`, the S9 check `submitFormByToken` already runs) before any read, with the not-found message
F59 | web-app/script_core.html | `reloadApp_`: `if (window.open(url, '_top')) return;` — a null (blocked) open falls through to the in-frame reload; the two documented reload fallbacks are unchanged
Tests | test/client/run.js | new pins "F58 (cycle 25)" (DERIVED: every public function that calls `getScriptLock(` and `waitLock(` and reads `getEmployeeInfo_` reads it first; DRIVEN: each one called with no caller and a LockService that throws if touched returns its refusal), "F59 (cycle 25)" (the real `reloadApp_` with a refused top navigation: a null open reloads once, a real open does not), "F30 (cycle 25)" (the real endpoint at 600 and 3 matches; the real count line capped and not), "F31 (cycle 25)" (the real `setCallNoteFlag`: mail after the lock, once per question, never for review), "F32 (cycle 25)" (a row deleted and a note unpinned between the two reads), "F33 (cycle 25)" (the cap, the tail cut under the cap, a whole tab; the real timeline; the real view, empty and truncated), "F34 (cycle 25)" (four malformed tokens refused with no read; a well-formed one read). Old shape updated: batch-2's `managerSearchCallNotes` return pin
Bites | — | 12 mutations by hand, all red: F58 one gate moved back below the lock (`kbMarkReviewed`); F59 the unconditional return; F30 `truncated` always false / the count line never capped; F31 the notify removed / sent for a repeated question; F32 no id re-check / no pinned re-check; F33 the tail cut ignored / the timeline source dropped / the empty-list claim; F34 the shape check removed. Two were NO BITE first — F32's pinned re-check and F33's tail-cut half — because the fixture satisfied the defect as well (g116's seventh direction); both fixtures were extended (a note unpinned between reads; a sparse tab under the cap) and then went red
Docs | CLAUDE.md, docs/gotchas.md, .cycle/config.md | g17 (F58), g135 (F59), g53 (F30), g152 (F33), g92 (F31), g164 (F32) and g101 (F34) amended in both files; S23, S35, S36, S28 and S61 gain cycle-25 steps; manifest revisions; running totals updated

TEST RESULTS: passed — pure harness 1313/1313, DOM harness 252/252, `npm run lint:server` clean, `counts.mjs --check` clean, `split-manifest.mjs --check` current (1664 declarations). Visual matrix `shoot.mjs cn` (14 scenarios): 0 console errors, 0 horizontal overflow, 0 missing fixtures. Test Command is `manual`: S23, S35, S36, S28 and S61 carry the new steps and need the deployed app — NOT RUN here, owed to the operator after deploy. F58 and F59 have no scenario step: F58 is structural (pinned, derived and driven); S94 (the update prompt's reload) has no steps body to extend. The editor suite's gate cases for these endpoints (a non-manager refused) still hold — the refusals are unchanged, only earlier — and were not run here.
REGRESSION RISKS: (1) F58 — a roster read that throws in one of the 70 endpoints now surfaces as a transport failure (the client's failure handler) instead of a `{success:false, error}` from the function's catch. Those same calls already surface a `waitLock` timeout that way, so every client has the handler; the message differs. The gate reads the roster outside the lock — as every read endpoint always has. (2) F31 — a manager now receives an email for a question added from a card; a rep re-flagging with an edited question sends a second mail (by design, once per distinct question). (3) F32 — a pinned note whose row moved costs one extra id scan; a note unpinned in another window between the reads is no longer listed (correct). (4) F33 — a rep with a long FormTokens tab now sees the "most recent forms only" line permanently while the tab exceeds 2,000 rows (the line is true; the form-data purge, when enabled, shortens the tab). (5) F34 — a token that is not a v4 UUID can no longer open a form; every token the app mints is one (`Utilities.getUuid`).
INVARIANTS AT RISK: None violated — INV-01 (every mutating op still runs its writes under the lock; only the refusal moved out), INV-02 / INV-136 (no gate changed; the derived pin covers all 70), INV-44 (trigger handlers untouched), INV-187 (a capped search and a short Sent Forms list are named), g34 / M-7 (F31's mail fires after the lock is released), g101 / S9 (the token is still the credential; the shape check refuses before any read), g135 (the null return is read), g69 / BCN-3 (two in-frame reload fallbacks, unchanged).
NET SCORE: 7 production fixes (F30 YES whenever a manager search passes 500 matches; F31 YES — any card-added training question; F32 YES only on a delete racing the tray load — rare, counted; F33 YES on a FormTokens tab past 2,000 rows (the purge is opt-in and off), otherwise latent — counted; F34 YES — any stray request to the public route reads the column; F58 YES — every refused or racing caller waits on the lock; F59 YES where pop-ups are blocked and top navigation is refused) − 0 new failure modes = 7

OPERATOR ACTIONS / DEPLOY:
- Deploy: `clasp push -f` from `web-app/`, then Deploy → Manage deployments → New version | BLOCKS DEPLOY: N
- Walk S23, S35, S36, S28 and S61 (their cycle-25 steps) on the deployed app | BLOCKS DEPLOY: N
- Tell the managers: a training question asked from a note card now emails them, like one asked on the form | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` (prod), or `npm run push:dev` first for the DEV instance

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The rep's own search (`searchMyCallNotes`) ships `truncated` at 200, and the patient timeline reads it, but the Search view itself does not render it — the same shape as F30 on the rep side.
- `kbRecordView` and `saveMyScratchpad` take a per-user lock before their gate; harmless (no one else waits), so left as is.
- The F58 pin covers endpoints that read the caller through `getEmployeeInfo_`; an endpoint gated some other way (none today besides `installAutomationTriggers`, which gates first) would need adding by hand.
- This batch's first transform pass missed six declarations that sat directly after another function — the derived pin found them. Any other one-off regex over server declarations should split with `serverDecls` rather than a `\n}\n` pattern.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (gotchas index + narratives, scenarios, running totals).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
