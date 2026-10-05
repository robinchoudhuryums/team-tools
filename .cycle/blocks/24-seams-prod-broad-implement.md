---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: F1 a QA exemption revoke wrote the viewed period, not the key that granted it · F2 the EOD digest swallowed failed sends and unreadable Sheets under a fresh heartbeat · F3 the trigger dispatcher stamped raw handler names no label or heartbeat knew · F4 two KB × buttons bypassed closeOverlay (INV-358) · F6 findCallNoteRow_ fetched by index without re-checking the key, reached unlocked from getDeptRequestDetail · F8 (client note) the Time / PTO calendar never rendered archiveError · F19 an un-approve that could not credit still cleared the Deducted charge
Files modified: web-app/90_qa.js, web-app/qa/script_qa.html, test/visual/mock.js, web-app/30_callnotes.js, web-app/00_config.js, web-app/10_core.js, web-app/kb/script_kb.html, web-app/tc/script_timeoff.html, web-app/20_timeclock.js, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, CLAUDE.md (running-totals block only), .cycle/STATE.md
Estimate: M (~5 h)
Actual: ~2.5 h — under; F19 turned out smaller than the audit framed it (no client path un-approves)

CHANGES:
F1 | 90_qa.js, qa/script_qa.html, test/visual/mock.js | New pure `qaExemptKeyFor_` returns the key that grants an exemption (its own period, or a month's quarter); `qaExemptFor_` is now `!!qaExemptKeyFor_` (one rule). `qaCoverageRows_` ships `exemptKey` / `exemptNextKey`; the client's revoke buttons carry that key and name it when it is not the viewed period ("Revoke exemption (Q4 2026)"); the toast names the period. `qaSetExemption` refuses a revoke of a key with no active grant ("… has no exemption recorded for … — nothing was changed") instead of appending a no-op row. The mock's verbatim copies were updated (the verbatim pin holds them byte-identical).
F2 | 30_callnotes.js, 00_config.js | `sendCallNotesEodDigest` counts unreadable rep Sheets and failed sends and stamps ONE `CallNotesEodDigest` error naming both (the TrainingOverdueDigest shape); a thrown run stamps too. It clears the flag only on a run that reached a rep — an idle hour proves nothing and would wipe a failure before the 9am failure digest reads it. `DIGEST_ERROR_KEYS.eod` and an `AUTOMATION_ERROR_LABELS` entry wire it to the heartbeat and the label map.
F3 | 00_config.js, 10_core.js | New `TRIGGER_HANDLER_JOB_KEYS` maps each grouped handler to its job key and whether the job OWNS it (stamps and clears it itself). `runTriggerGroup_` stamps the job key ("<handler> stopped with an unexpected error: …"), clears it after a clean run only when the job does not own it, and clears any pre-F3 stamp left under the handler name. `OpenPunchCheck` gained a label. A two-sided pin holds the map equal to TRIGGER_GROUPS, checks `owns` against each job's body, and requires every key to be labelled or tabled.
F4 | kb/script_kb.html | Both delegated × handlers call `closeOverlay(ov)`. The SH-02 net now also flags any delegated close click that removes or un-opens a node by hand (it could not see these because both dialogs register an INLINE hook). A DOM drive closes each dialog with × and asserts focus returns to the opener.
F6 | 30_callnotes.js | `findCallNoteRow_` takes the FORM-1 shape: the fetched row must carry the NoteId it was located by (`formLocatedRowIs_`); a moved row is located once more, then refused. Locked callers pay one compare.
F8 | tc/script_timeoff.html | New `calArchiveNoteHtml_` renders a `role="status"` note in the calendar card when `archiveError` is set — the fact only; the server message stays on the server. The 92 < 120 window-relation pin from the same finding is NOT in this batch (the batch named the client note only).
F19 | 20_timeclock.js | The Deducted cell now means what the row CURRENTLY holds against the balance. An un-approve whose credit cannot land keeps the cell (a blank legacy cell records the by-type charge), returns `notRestored: {bucket, days, reason}` and adds it to the audit row; a re-approval of a row still holding a charge takes nothing. No client path un-approves today (the manager's cards are Pending-only), so no client change.

TEST RESULTS: passed. Pure 1227 → 1232, DOM 219 → 221, `lint:server` clean, `counts --check` agrees (the two harness rows of the generated block updated), manifest regenerated with a `--why` per change. Pins updated because they encoded the old behaviour: TQ-2 (the stamp message shape; unmapped jobs keep the pre-F3 key), QA2-1 (the next-period revoke regex), the QA-19/QA2-1/QA sampler contexts (load `qaExemptKeyFor_`). **13 bite-checks, all BITE**, in a throwaway worktree against committed state: F1 client key · F1 server refusal · F2 no stamp · F2 idle-hour clear · F3 raw-name stamp · F3 clearing an owned key · F3 net (a wrong `owns`) · F4 net (hand removal) · F4 DOM · F6 no re-check · F8 DOM · F19 always-clear · F19 re-approve takes twice.
Regression Scenarios (Test Command `manual` — traced against the code and the driven pins; the live walk is owed after deploy): S4 PASS (TC-04 step unchanged on every path that credits; F19 only changes a path no client reaches) · S22 PASS (the reminder path and the log are unchanged; a failure now also stamps) · S30 PASS (`assertManagerCaller_` still first in every handler; the dispatcher change is inside the group runner) · S55 PASS (the urgent digest owns its key; the dispatcher never clears it) · S100 PASS (QA2-1 step: a quarter's grant still reads Exempt in its months; the revoke now clears the quarter) · S117 PASS (4a-FU1/FU3 step: a grouped job's throw now reaches the System tab labelled) · S46 PASS (the calendar card renders as before with no archive error) · S122 NOT APPLICABLE (reply resolution untouched; only the detail lookup changed, covered by the F6 drive).

REGRESSION RISKS:
- F19: a non-Approved row whose earlier clear-stamp FAILED (best-effort, logged) while its credit landed would still read as holding a charge, so re-approving it would take nothing (an under-charge of one request). Rare; it needs a failed cell write on a past un-approve.
- F1: a page loaded before the deploy revokes with the viewed period and is now REFUSED by name instead of silently no-op'd — intended; the message says to reload.
- F3: jobs that do not own their key now get two clears on a clean run (one property read each, under the automation-error lock); jobs that own theirs get one, as before.
- F2: a rep whose Sheet stays unreadable now keeps a standing failure on the dot until it is fixed — intended.

INVARIANTS AT RISK: None violated. Strengthened: INV-355 (the scan-then-fetch rule now covers notes), INV-356 (one key rule now also decides the revoke), INV-358 (both violations fixed; the derived net widened), INV-353 (the cell's meaning is now "currently held"), INV-161/the 4a-FU3 label rule (dispatcher stamps are labelled), INV-372 (the rep calendar names its archive failure). INV-01 holds (qaSetExemption reads the ledger under its own lock).

NET SCORE: 2 − 1 = 1
(Production fixes: 2 — F1 (fires when a manager grants from a quarter view and revokes from a month view; plausible now that Q3 has closed, QA exemption use unverified) and F4 (fires on every × click of those two admin dialogs; interface fix, counted per R18). F2, F3, F6, F8, F19 would not have fired this month: they need a mail outage, an unexpected throw, a millisecond race, archiving on (it is off), or an un-approve no client can make. New failure modes: 1 Low — the F19 stale-stamp under-charge above. Capabilities: 0. Defensive/structural: 5.)

OPERATOR ACTIONS / DEPLOY:
- None new. | BLOCKS DEPLOY: N
- F7 is held for the operator's decision (the email composers' discard question). | BLOCKS DEPLOY: N
Deploy: Server + Client (QA views, Reference views, Time Clock views): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit current deployment → Version: New version → Deploy. Test Suite: same push; `runSmokeTests()` on prod.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The rest of the seams audit (F5, F9, F10, F11, F12, F13, F14, F15, F16, F17, F18, F20, F21, and F8's 92 < 120 pin) — listed in STATE.md Pending as the nets-and-library batch.
- The Search synonyms editor is a typed surface with no `unsaved` guard; it belongs with the F7 decision (INV-357's scope), not here.
- `qaPeriodLabelOf_` labels a key from the server's period options and falls back to the raw key (e.g. "2027-Q1") for a key not in them; harmless, but a server-shipped label would be cleaner.
- F19's `notRestored` is shipped but no client shows it, because no client path un-approves; if one is ever added, it must show it.

DOCUMENTATION UPDATES NEEDED:
- `docs/gotchas.md` + CLAUDE.md index: g164 gains the notes instance (F6); g100 gains the inline-hook bypass (F4); g53 gains the EOD digest (F2); g142/the 4a-FU3 label rule gain the dispatcher stamp (F3).
- `.cycle/config.md`: amend INV-353 (the cell = currently held; re-approval takes nothing; `notRestored`), INV-356 (the revoke clears `exemptKey`; a revoke of an ungranted key is refused), INV-358 (the widened net), INV-355 (notes), INV-372 (the rep calendar's note).
- `docs/operator-state.md`: `AUTOMATION_LAST_ERRORS` gains `CallNotesEodDigest` and the grouped jobs' keys (`TRIGGER_HANDLER_JOB_KEYS`).
- `docs/test-harness-log.md`: the batch, its 13 bites, and the pins rewritten (TQ-2, QA2-1).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
