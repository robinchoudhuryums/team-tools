---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- F1 (High) — Day Edit range mode stamped the From day's PREFILLED punches over every day in the range; filling "To" now parks the prefill (clearing it restores), and a range save names what it will SET and waits for a confirm
- F2 (High) — the Dept Request reply scan RESOLVED requests on replies that are not done, promise work, refuse, pass the request on, or only acknowledge it; those are now "needs a look" (a sign-off thank-you still resolves)
New capabilities (G/ST): None
Files modified: web-app/tc/script_manager.html, web-app/modals.html, web-app/50_deptrequests.js, test/client/dom/runDom.js, test/client/run.js, test/client/server-split-manifest.json, CLAUDE.md, docs/design-decisions.md, docs/gotchas.md, .cycle/config.md, .cycle/STATE.md
Estimate: S/M (~5 h) — written before the first edit (STATE.md Estimates line, 2026-10-14)
Actual: ~2 h

CHANGES:
F1 | web-app/tc/script_manager.html | `_dePrefilled` records the slots the async prefill actually filled; `deApplyRangePrefill_` (on the "To" change, registered before `deSyncRangeMode_`) parks every prefilled-and-untouched slot when range mode turns on and restores it when "To" is cleared; a prefill that lands while a range is set is parked, never written into the form; `deResetRangePrefill_` on open and on a From-date change; the save handler refuses an empty range before any RPC and, for a range, shows `uiConfirm` with `deRangeSummary_` (every slot it will SET, 12-hour time, the date span and day count) and sends only on OK — and only if the modal is still on the same employee and day
F1 | web-app/modals.html | the Day Edit hint says filling To clears the loaded times and that the save confirms
F1 | test/client/dom/runDom.js | "F1 (cycle 25)" DOM drive: prefill → To parks it → typed Clock Out kept → Save sends nothing until the confirm, which lists ONLY "Clock Out 5:30 PM" → OK sends ClockIn '' / ClockOut 17:30 / no breaks → clearing To restores the clock-in and break; a late prefill is parked; an empty range sends nothing. Bite-checked by hand (bite.sh refuses a dirty file): parking off → red, confirm skipped → red, late prefill written → red
F2 | web-app/50_deptrequests.js | `drReplyAsksOrHolds_` adds a not-done / promise / refusal / hand-off pattern (not yet, still waiting, waiting, I'll / we will, will do|update|send…, let me check…, on it, checking on|with, reviewing, processing, shortly, asap, cannot, can't, unable, won't, denied, rejected, declined, escalat…) and an acknowledgement-only rule ("Received.", "Got it", "Ok", "Noted" — but a bare "Thanks"/"Thank you" stays a resolution, the DR-2 sign-off); the const regexes the pins extract are unchanged
F2 | test/client/run.js | "F2 (cycle 25)" driven grid (15 holds, 11 completions incl. "All set, thanks again.") + verdict + pick (the answer after a hold resolves; a trailing thank-you does not reopen). Bite-checked: drop the not-done rule → red; drop the ack rule → red
F2 | test/client/server-split-manifest.json | revision recorded by `scripts/split-manifest.mjs --why` (drReplyAsksOrHolds_ changed)
F1/F2 | CLAUDE.md, docs/design-decisions.md, docs/gotchas.md, .cycle/config.md | running-totals block regenerated (1272 / 234); the g159 index line + narrative amended (F2); the Day Edit decision amended (F1); INV-108 and INV-311 amended; S7 and S122 gain cycle-25 steps and expectations

TEST RESULTS: passed — pure harness 1272/1272, DOM harness 234/234, `npm run lint:server` clean, `counts.mjs --check` clean, `split-manifest.mjs --check` current; the three Day Edit visual scenarios re-shot: 0 overflow, 0 missing, 0 errors. Test Command is `manual`: S7 (Day Edit), S122 (reply resolution), S74 (Dept Request tracking) and S91 (calendar pencil → Day Edit) need the deployed app — NOT RUN here, owed to the operator after deploy (S7 and S122 carry the new cycle-25 steps); the harness drives cover the client flow (F1) and the pure rule + pick (F2).
REGRESSION RISKS: (1) F1 — a manager who wanted to copy the From day's times across the range must now type them (deliberate: blank = unchanged is the safe direction, and the hint says so). (2) F1 — the confirm adds one click to every range save. (3) F2 — a genuine completion that also contains a hold word ("Refund issued, I'll send the receipt") is now "needs a look" instead of resolved: one extra click, the g159 fail-safe direction. No server interface, return shape or default changed; `managerSaveDayRange` is untouched.
INVARIANTS AT RISK: None violated — INV-108 (range additivity unchanged; client half amended), INV-311 (rule 4 widened; amended), INV-215 (Save still disabled while the prefill is pending), INV-245 (a parked break list restores through `deSetBreaksFromDay_` / the read-back, strays included), g68 (the async prefill still fills only untouched fields).
NET SCORE: 1 − 1 = 0 (F2 fired-class: the scan is on by default and hourly, so acknowledgement replies resolved requests this month; F1 latent — it fires on every range save from a day with punches, but there is no evidence of one this month; F2's wider over-match is a documented fail-safe new failure mode)

OPERATOR ACTIONS / DEPLOY:
- Walk S7 (the cycle-25 F1 step) and S122 (the cycle-25 F2 step) on the deployed app | BLOCKS DEPLOY: N
Deploy: Server + Client (Time Clock views) + Client (shell): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- INV-311 still says "`drReplyPick_` takes the earliest resolving reply" — stale since cycle 23 DR-2 (the LATEST reply decides); pre-existing docs drift, not touched here
- A bare "Thanks" as the ONLY department reply still resolves (by the DR-2 sign-off rule) — the operator may want a lone thank-you with no earlier answer to be a look
- The F2 over-match will raise the "needs a look" count; worth an operator glance after a week to see whether any completion phrasing is being held
- Day Edit's confirm uses `uiConfirm` over the open Day Edit overlay; the Day Edit overlay itself still has no `unsaved` guard (g166) — out of scope
- The rest of the cycle-25 batch plan (Batches 2–9, E1–E5) is untouched
(see also the cycle-25 /broad-scan report)

DOCUMENTATION UPDATES NEEDED:
- None beyond what this batch made (design decision, gotcha line + narrative, INV-108/INV-311, S7/S122, running totals)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
