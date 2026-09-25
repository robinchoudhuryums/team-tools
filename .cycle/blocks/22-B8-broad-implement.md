---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- I2 — the PPD engine's seat check was a single-LETTER substring test, so "Captain Seat" (it contains an s) read as solid seat and passed the clinical solid-seat gate; the validator stayed silent
- I3 — the weight parser stripped everything but digits and dots, so "250-260" became 250260 lbs and no chair matched, with nothing telling the rep
- I4 — the Intake Sent tab rendered "No matching intake submissions" when a submissions tab could not be opened, which can prompt a PHI re-send
- I5 — the PMD/PAP email drew an unanswered Yes/No toggle the same as a deliberate "No"
- I6 — the catalog validator called inherently-solid codes errors when their seat cell was unreadable; the F9 pin asserted the false claim (K0828 is solid by code)
- I8 — `intakeAcctRowsEn_`'s `isSecondary` read the 0-based SECONDARY_QUESTION_ROWS list 1-based (nothing reads it today); the F-27 pin asserted the wrong base
- C7 — `sendExternalEmail` created form tokens before the PDF fetch and the send, leaving phantom "Awaiting" forms (and live links) when either failed
- C8 — a manager's "Clear reply" visibly did nothing: it cleared the legacy keys while the thread renders `feedback[]`
- C9 — inserting a template or the win-back message overwrote inserted OOP price lines, so the send was refused
- I7 — form retention accepted 1–2 days, purging tokens still valid under their 72-hour expiry
- S5 — `qaSetRecordingAgent` never cleared `SharedMs`: re-attributing a shared review released it to the new agent; clearing the agent left it "shared with nobody"
- D8 — Team Training read `{error}` from `getQuizzes`, `getEmployeesList` or `getReferenceTree` as empty lists, and saving a quiz while the Reference tree had failed silently unlinked its Reference item
- D4 — the Verify button was hidden for completed fields-only documents
- D9 — a late QA comment-post success cleared the pin and resumed playback on a DIFFERENT recording
Files modified: web-app/60_intake.js, web-app/61_forms.js, web-app/30_callnotes.js, web-app/80_training.js, web-app/90_qa.js, web-app/intake/script_intake.html, web-app/cn/script_callnotes.html, web-app/train/script_training.html, web-app/train/script_empdocs.html, web-app/qa/script_qa.html, test/client/run.js, test/client/server-split-manifest.json, CLAUDE.md (running totals only), .cycle/STATE.md
Estimate: L (~12 h) — I2 S 1.5h · I3 S 1h · S5 S 1h · D8 S 1.5h · D4 S 1h · C7 S 1.5h · C8 S 1h · C9 S 1h · I4 S 0.5h · I5 S 1h · I6 S 0.5h · I7 S 0.5h · D9 S 0.5h · I8 S 0.25h
Actual: ~3.5 h

CHANGES:
I2 | 60_intake.js, intake/script_intake.html | `intakeSeatKinds_` reads a seat cell word by word (s / solid; c / captain / captain's; seat / and / or filler; anything else UNKNOWN). The engine's two seat reads, the catalog validator and — through the client twin `intakeSeatKindsClient_` — the Catalog browse filter all use it (a grid pin holds the twins equal).
I3 | 60_intake.js | `intakeParseWeight_` takes the FIRST number in the answer (a thousands comma tolerated) and reports `unreadable` when the rep typed something with no number; `intakeExplainFactors_` shows "UNREADABLE — … NO weight-capacity check was applied".
I4 | 60_intake.js, intake/script_intake.html | `intakeListMySubmissions` returns `failedTypes`; the Sent tab names them above the list, and with nothing readable shows only that note instead of "No matching intake submissions".
I5 | 60_intake.js | Account-email checkbox rows are three-state: TRUE a check, FALSE an empty box + "No", '' "Not answered" (the client already sends them apart).
I6 | 60_intake.js | `intakeInherentlySolidCodes_` is the ONE code list (the engine and the validator); an inherently-solid code is never a seat ERROR — an unreadable word on it is a warning ("solid by code, so it still recommends"), a blank cell on it is clean.
I8 | 60_intake.js | `isSecondary` reads SECONDARY_QUESTION_ROWS 0-based, like the email body builder and the client.
C7 | 30_callnotes.js, 61_forms.js | The PDF fetch moved ahead of token creation; a failed send calls `formTokensVoid_` (locked, status 'voided'); `getFormByToken` refuses a voided link ("withdrawn") and `getMySentForms` skips it.
C8 | 80_training.js | `trainingReplyClear_` removes the LATEST manager reply from `feedback[]` and re-points the legacy trainingReply* keys at the manager reply before it (or drops them).
C9 | cn/script_callnotes.html | `cnExtBodyWithQuotes_` re-appends every inserted price line (in order, never duplicated) when the template picker or the win-back nudge replaces the message.
I7 | 61_forms.js | `formRetentionEffectiveDays_` floors a positive retention at the token expiry + 1 day (72 h → 4 days); disabled stays disabled.
S5 | 90_qa.js, qa/script_qa.html | `qaAgentChangeUnshares_`: a changed or cleared agent on a shared recording sets SharedMs to 0 (re-saving the same name keeps it); the audit row says `unshared`, the result carries `unshared`, and the client redraws the share and warns.
D8 | train/script_training.html | `trainMgrSourceFailures_` / `trainMgrSourceWarnHtml_` name a failed source above the dashboard ("incomplete, not empty"); the quiz editor keeps the current Reference link as its own selected option while the tree is unavailable.
D4 | train/script_empdocs.html | Verify is offered for every non-draft document, not only signature-required ones.
D9 | qa/script_qa.html | The comment-post success handler returns (with a toast) before touching the composer, pin or player unless the SAME recording is still open.

TEST RESULTS: passed — pure harness 1011/1011 (was 999; +12 Batch 8 pins), DOM 156/156, `npm run lint:server` clean, `node scripts/counts.mjs --check` agrees (pure 1011), split manifest regenerated (F2c green). Pins updated because they asserted the defect or an old shape (Category A): F9's seat row (K0828 is solid by code — I6), F-27's `isSecondary` base (I8), B8's catalog sandbox loads the client twin (I2), QA-10's audit regex takes the `; unshared` suffix (S5), and the engine / validator sandboxes load the three new helpers. Bite-checked 20 mutations, all BITE (one malformed first attempt at the I2 client twin broke the string rather than the rule — re-run properly): I2 letter test back · I2 client drifts · I3 strip digits · I4 silent skip · I4 empty says none · I5 two-state · I6 solid-by-code errors · I8 1-based again · C7 no void · C7 voided link opens · C8 legacy keys only · C9 template wipes lines · I7 no floor · S5 never unshares · D8 link dropped · D8 error read as empty · D9 guard removed · D4 signature-only again. Visual matrix (intake-catalog-light-wide, intake-pmd-light-wide, training-light-wide, qa-detail-light-wide): 0px overflow, no missing fixture, no console error beyond the pre-existing proxy font-certificate noise; no fixture carries a failed source, an unreadable weight or a word-form seat cell, so nothing photographs a changed pixel.
Regression Scenarios (Test Command `manual`) — every overlapping scenario needs the live app, so NOT APPLICABLE here, each with its harness stand-in: S59 PPD recommendation (the I2/I3 engine pins) · S60 PMD/PAP (the I5 driven render + the F-27 base fix) · S87 Intake Catalog (the I2 twin grid + B8) · S19 / S34 / S56 external composer (the C7 + C9 pins) · S61 fillable forms + retention (the C7 void + I7 floor) · S35 / S50 training replies (the C8 pin) · S67 / S68 Team Training (the D8 driven render) · S69 Employee Docs (the D4 pin) · S90 / S100 QA (the S5 + D9 pins) · S97 System catalog card (the I6 validator pin).

REGRESSION RISKS:
- I2 is stricter: a catalog seat cell whose words are not s / solid / c / captain now offers NEITHER seat (unless the code is solid by code) and the validator names it as an error. A chair that only matched on a stray letter before will stop being recommended until the cell is reworded.
- The recommendation for a weight typed as a range now filters on its first number; a weight with no number at all still applies no capacity filter (unchanged), but now says so.
- `sendExternalEmail` fetches the PDFs before creating tokens; a fetch failure now leaves no token at all (the intended change).
- A form link whose email failed is now refused as withdrawn rather than working until expiry.
- `formRetentionEffectiveDays_` raises a 1–3 day setting to 4 days, so such a deployment keeps form data a little longer than configured.

INVARIANTS AT RISK: None violated. Checked: INV-01 (formTokensVoid_ takes the ScriptLock) · INV-37 (the QA SharedMs write is a number) · INV-41 (C9 changes the message before preview, never after the hash) · INV-96 / INV-113 (token status values stay an enum; the tamper-evidence of submitted forms is untouched) · INV-112 (the explain factors still derive from the one intakeDeriveClinicalFactors_) · INV-186 (the Team Training banner is absent when every source read) · INV-187 (a failed read is named on the Sent tab and in Team Training) · INV-208 (the send still re-verifies every quoted line; C9 keeps them present) · INV-32 / INV-196 (the QA audit row still carries no agent name).
NET SCORE: 1 − 1 = 0
- Production fix (would have fired this month): I5 (every PMD/PAP email with an untouched Yes/No toggle read "No" to the department).
- Defensive or gap (fires only on an event not confirmed this month, or a missing capability): I2, I3, I4, I6, I8, C7, C8, C9, I7, S5, D8, D4, D9.
- New failure mode: (1) I2 — the word-level seat read is fail-closed: a catalog cell worded unexpectedly (e.g. "Sling") that used to match on a letter now matches no seat and its chair drops out of recommendations until the cell is fixed. Named by the validator on Admin → System, so it is visible; Low.

OPERATOR ACTIONS / DEPLOY:
- After deploy, open Manage → Admin → System → the Intake Offerings catalog card and fix any seat-type cell it now calls unreadable (use S, C, Solid or Captain) — until then those chairs are not recommended | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → New version (with Batches 1–7, S2 and the follow-ons, none of which are deployed yet)

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- D4's second half: no read path verifies an Employee Doc's content hash automatically — Verify is still a manual button.
- I3: the unreadable-weight factor shows in the explainability rows; the recommendation screen itself does not yet warn inline before the rep sends.
- C7: a voided token keeps its `FormTokenCreated` audit row with no matching void row.
- The T5 half-day rework recorded on 2026-09-25 (a half day is ≥ 4 hours at any time, not the other half of the shift) is still owed — see STATE.

DOCUMENTATION UPDATES NEEDED:
- docs/gotchas.md + CLAUDE.md index: amend g40 / g42 (the seat cell is read word by word — a letter test is a substring trap; the inherently-solid list is one function), g41 (fail direction chosen: an unreadable seat word matches nothing and is named), g120 / g126 (C9: a template must not wipe a line the send re-verifies), g53 (I4 / D8: a failed read named, not empty), g141-adjacent D9 (a late success acts only on the item still open); consider a gotcha for "a first-number read vs a digit strip" (I3).
- docs/operator-state.md: the retention floor on FORM_DATA_RETENTION_DAYS; the Offerings seat-type vocabulary (S, C, Solid, Captain).
- docs/modules.md (Intake engine + Sent tab + emails, Call Notes external composer, Training replies + Team Training, Employee Docs Verify, QA share on re-attribution), docs/operator-log.md (Batch 8 round), docs/test-harness-log.md (12 pins, 20 bite-checks).
- .cycle/config.md: invariants (next INV-269 onward, after Batch 7's) for the word-level seat read, the first-number weight, tokens-after-PDFs + void-on-failure, the retention floor, unshare-on-reattribution; walk steps on S59, S60, S61, S87, S90.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
