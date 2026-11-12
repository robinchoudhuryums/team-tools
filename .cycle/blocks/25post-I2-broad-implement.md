---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (operator round 2026-11-05, batch I2 of the approved plan)
New capabilities (G/ST): I2 — intake saved drafts: Save draft parks a form as one of several saved drafts in the browser; a Drafts list opens and deletes them
Files modified: web-app/intake/script_intake.html, test/client/run.js, test/client/dom/runDom.js, test/visual/shoot.mjs, docs/design-decisions.md, docs/modules.md, .cycle/config.md, .cycle/STATE.md, CLAUDE.md
Estimate: S–M (~3 h) — written to STATE before the first edit (commit 5bd8fe0)
Actual: ~2.5 h (in range)

CHANGES:
I2 | web-app/intake/script_intake.html | A second browser store beside the autosave: `umsIntakeSaved` (INTAKE_SAVED_KEY, INTAKE_SAVED_MAX = 20), every read/write in try/catch. Pure helpers `intakeSavedKept_` (owner's own, under INTAKE_DRAFT_MAX_AGE_MS), `intakeSavedLabel_` (PPD patient line / account question 1 / "Unnamed patient", 80 chars), `intakeSavedUpsert_` (replace by id, refuse a 21st), `intakeSavedExpiresIn_`. `intakeSaveNamedDraft_` (Save draft on the PPD and account rails): refuses an empty form, asks before leaving card images behind, keeps the opened draft's id, then clears the form. `intakeOpenDraftsList_`: an ensureOverlay dialog (intake modal header) listing every form's drafts newest first with time left, Open and Delete (asks, then repaints). `intakeOpenSavedDraft_`: asks before replacing unsaved answers on that form, then parks the draft on INTAKE_AMEND_PREFILL with `savedId` and enters the form; `intakeConsumeAmendPrefill_` links the form (`INTAKE_STATE[form].savedId`), restores the answers (and any parked amendOf) and mirrors the autosave. Both send paths remove the linked draft; `intakeClearForm_` only unlinks; `intakeSweepDrafts_` sweeps saved drafts at boot. The rail's Drafts button carries the count.
I2 | test/visual/shoot.mjs | `intake-drafts-light-wide` and `intake-drafts-dark-mobile` (three forms' drafts, a long name) — 0 overflow, no squeezed text; the first shot found the close × stacked under the title (the dialog lacked `.intk-modal`'s header rule) — fixed before commit.

TEST RESULTS: Pure harness 1535/1535 and DOM 381/381 green; counts block updated by hand (pure, DOM, visual, localStorage keys +1, invariants, scenarios). Bite-checks: 15 of 15 mutations BITE (8 pure, 7 DOM). Regression scenario S160 written (operator walk owed); S159's intake path untouched beyond the rail. Test Command is `manual`: no Tests.js change.
REGRESSION RISKS: (1) The amend prefill now carries two kinds of payload — a prefill without `savedId` behaves exactly as before (the amend branch is unchanged). (2) The rail gained two buttons; on a phone the rail wraps (shot). (3) A new localStorage key — the boot sweep drops other users' drafts on a shared profile, as the autosave already did.
INVARIANTS AT RISK: None — INV-401 added; INT2-3's owner rule and g112 (ums-prefixed, try/catch) are held by the new store.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (I2 is a new capability)

OPERATOR ACTIONS / DEPLOY:
- Walk S160 on DEV | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Deploy → Manage deployments → Edit → New version (rides with I1; no handbook copy changed)

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- None.

DOCUMENTATION UPDATES NEEDED:
- None — the decision (`#i2-intake-saved-drafts`), modules.md, INV-401, S160 and the running totals were written in this batch.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
