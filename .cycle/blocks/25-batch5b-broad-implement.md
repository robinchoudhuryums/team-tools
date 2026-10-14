---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- F36 (Low) — Call Notes search results could paint under a different scope: the stale guard compared only the query text, not the field tab, the range or the archive box
- F37 (Low) — a manager deleting one note reloaded the whole per-rep stack, wiping comments half-typed on other cards
- F38 (Low) — a late failure for rep A overwrote rep B's loaded notes (`cnMgrLoadRepNotes_`)
- F39 (Low) — the History "Refreshing…" pill could stay up for the rest of the visit
- F40 (Low) — the Call Notes accessibility bundle, parts (a)–(d): both composers closed without returning focus; the save-card collapse button had no `aria-expanded`; History groups re-expanded on every re-render; a Training Answers tray load failure was silent. Part (e), two windows sharing one draft slot, is NOT implemented — it needs an operator decision (see FOLLOW-ON ITEMS)
New capabilities (G/ST): None
Files modified: web-app/cn/script_callnotes.html, test/client/dom/runDom.js, CLAUDE.md, docs/gotchas.md, .cycle/config.md, .cycle/STATE.md
Estimate: M (~5 h, the plan's figure) — written before the first edit (STATE.md Estimates line, 2026-10-14)
Actual: ~2.5 h

CHANGES:
F36 | web-app/cn/script_callnotes.html | `cnFireSearch_` stamps `CN_STATE.searchSeq` on every fire (the under-2-characters path included); its success and failure handlers drop an answer that is not the latest. Every scope change already re-fires (field tab, range, archive box, exact mode), so the newest request is the scope on screen
F37 | web-app/cn/script_callnotes.html | new `cnMgrRemoveCard_(repId, noteId)`: a successful manager delete removes its card only; a different rep on screen, or no card left, reloads the stack (the CNUI-04 `cnMgrPatchCard_` shape)
F38 | web-app/cn/script_callnotes.html | `cnMgrLoadRepNotes_`'s failure handler carries the success handler's rep/date guard
F39 | web-app/cn/script_callnotes.html | `cnLoadDateRange_(start, end, then, opts)`: `opts.always` runs however the load settles (success, failure, a stale-range drop where `then` never runs, a view left, the refused-span path). History's instant-paint refresh clears its pill there — only while History is still the view, since another view's pill shares the element id
F40a | web-app/cn/script_callnotes.html | new `cnComposerReturnFocus_(back)`, called by both composer hooks (`cnCloseComposerModal_`, `cnCloseExternalEmailModal_`) after they remove the overlay, with the trigger `ensureOverlay` stashed at open: deferred a tick (a send re-renders the Log right after the close), the trigger found again by id if it was rebuilt, and never while another overlay is open (a switch to the other composer) or when focus already sits on a connected element
F40b | web-app/cn/script_callnotes.html | the save card's collapse button: `aria-expanded`, `aria-controls="cn-save-actions"` (the actions block now carries that id), `aria-label="Save actions"`, and `cnToggleSaveCard_(btn)` keeps the state in step
F40c | web-app/cn/script_callnotes.html | `CN_STATE.histCollapsed` (session memory, no stored key): `cnToggleHistGroup_` records a collapsed date and the History render draws it collapsed with `aria-expanded="false"`
F40d | web-app/cn/script_callnotes.html | `cnLoadTrainingQA_`: an `{error}` or a transport failure sets `CN_STATE.trainingQAError` (the last answers read stay); `cnRenderTrainingQATray_` adds an `errorStateHtml_` line ("Training answers could not be loaded — … They load again when you next open the Log.")
Tests | test/client/dom/runDom.js | new DOM drives "F36" (two scopes in flight answered out of order; a stale failure), "F37 + F38" (a delete under a half-typed comment on another card; the last-card reload; rep A's late failure after B loaded), "F39" (the instant-paint pill, a range change mid-refresh, the stale answer), "F40 — composer focus" (self-close returns focus, a rebuilt trigger found by id, never over another dialog, the external composer too), "F40 — the rest" (aria-expanded, a failed tray load, a collapsed group through a re-render). Two harness artefacts were met and named in the drives rather than worked around silently: the timer flush also runs the shell's deferred boot renders (which navigate to the Clock and move focus), so the composer drive settles them first. Bite-checked by hand, each mutation asserted to hit exactly one site: F36 success guard; F36 failure guard; F37 back to the reload; F38 guard removed; F39 `always` removed from the success path; F40a the department hook's return removed (re-run scoped — the first attempt was refused because the text occurs in both hooks); F40b aria-expanded removed; F40c groups always open; F40d the failure not recorded — every one red
Docs | CLAUDE.md, docs/gotchas.md, .cycle/config.md | g81 (F36/F38/F39), g141 (F37/F40c), g100 (F40a) and g53 (F40d) amended in both files; INV-45 (F36), INV-146 (F37/F38) and INV-174 (F40) amended; S19, S23, S26 and S115 gain cycle-25 steps; running totals updated

TEST RESULTS: passed — pure harness 1284/1284, DOM harness 247/247, `npm run lint:server` clean, `counts.mjs --check` clean, `split-manifest.mjs --check` current (no server change). Visual matrix `shoot.mjs cn-` (14 scenarios): 0 console errors, 0 horizontal overflow, 0 missing fixtures. Test Command is `manual`: S19, S23, S26 and S115 carry the new steps and need the deployed app — NOT RUN here, owed to the operator after deploy.
REGRESSION RISKS: (1) F36 — none: a scope change always fires a newer search, so dropping an older answer never leaves the results empty (the newer one paints). (2) F39 — `cnLoadDateRange_`'s new fourth argument is optional; its three callers are unchanged except the instant-paint one. (3) F40a — a composer closed while focus had already moved somewhere real (a click elsewhere) leaves focus there by design. (4) F40c — a collapsed group is remembered by date for the visit; reloading the page opens all groups again (no stored key was added, so the localStorage key count is unchanged).
INVARIANTS AT RISK: None violated — INV-45 (amended), INV-146 (amended; the mgrSubSeq bumps are unchanged), INV-174 (amended), INV-145 (both composer hooks still refuse mid-send BEFORE any removal or focus move), g130 (the hooks still own the close and still remove the overlay), A12 (the tray failure renders through `errorStateHtml_`), INV-235 (no new bare class; `cn-save-actions` is an id).
NET SCORE: 0 − 0 = 0 (F36 NO — needs a scope change inside one search's round trip, none evidenced; F37 NO — a manager delete while typing on another card, none evidenced; F38 NO — needs a failed per-rep load after a rep switch; F39 NO — needs a range change inside the refresh's round trip; F40 NO — accessibility defects with no reported incident this month; no new failure mode)

OPERATOR ACTIONS / DEPLOY:
- Decide F40(e) — two windows share one draft slot (options in FOLLOW-ON ITEMS and STATE.md Pending) | BLOCKS DEPLOY: N
- Walk the cycle-25 steps of S19, S23, S26 and S115 on the deployed app | BLOCKS DEPLOY: N
Deploy: Client (Call Notes views): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- F40(e), NOT implemented — the main window and the Call Notes pop-out write ONE localStorage draft (`umsCallNotesActiveFormDraft`): typing in one overwrites the other's draft, a reload restores the other window's note, and a save in one clears both. A per-window slot needs a window identity that survives closing and reopening the pop-out (`sessionStorage` dies with the window; the HtmlService iframe's `window.name` is Google's), and a wrong identity LOSES drafts, which is worse than today's overwrite. Options: (1) keep one slot but record which window wrote it, and on restore in the OTHER window offer it ("A draft from your other window — restore / discard") instead of loading it silently; (2) per-window slots keyed by an id in `sessionStorage`, swept by age (a closed pop-out's draft is gone after the PHI TTL); (3) leave as is and document it. Recommended: (1)
- The Team Notes queue SWR pill (`cnMgrLoadQueue_`'s `pillOff`) and the Log's instant-paint pill were read and clear on every path; not changed
(see also the cycle-25 /broad-scan report and the Batch 1–5a blocks)

DOCUMENTATION UPDATES NEEDED:
- None beyond what this batch made (g81, g141, g100, g53, INV-45, INV-146, INV-174, S19, S23, S26, S115, running totals)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
