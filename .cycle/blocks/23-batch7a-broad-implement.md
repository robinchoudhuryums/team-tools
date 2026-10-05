---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- FORM-1 — the public form route finds a token in two unlocked reads: it scans the Token column, then fetches the row by index. If a purge deleted rows between the two reads, the fetch returned another token's row, so the visitor got another patient's prefill. The same applied to the submission lookup. Both lookups now re-check that the fetched row carries the token it was found by. A row that moved is located once more, then refused.
- HR-1 + CN-7 — Sheets parses text written into a cell, so number- or date-shaped values were coerced.
  - Employee Docs: a title such as "3/4" was stored as a Date. The content hash recomputed from the cell never matched, so the doc could not be signed and verified as tampered.
  - Call notes: a callback "0123…" lost its zero, and "12/5" became a Date.
  - Coaching: the free-text fields had the same coercion.
  - Those columns are now written into plain-text ('@') cells.
- FORM-2 — the FormSubmissionReceived witness row in the shared AuditLog carried the full token, and so did the failure log (where the token stays live). Both now carry the 8-character reference (cycle 22 S4).
- FORM-3 — a second form submitted on the same note overwrote the first form's link on the card. The note now keeps every submission (`formSubmissions`) and the cards render one pill each.
- FORM-4 — the retention date reader fell back to `Date.parse`, which reads free text like "9/30" as 30 Sep 2001. The purge then deleted that row. The reader now accepts only the two shapes the app writes; anything else is unparseable and never deleted.
- FORM-5 — two fixes:
  - The emails said "expire in 72 hours" whatever `FORM_TOKEN_EXPIRY_HOURS` was set to. They now state the configured value.
  - A submission notice, PHI included, went to the creating rep's address even after the rep was offboarded. It now goes to the managers, saying why.
- CN-1 — scheduled-call reminders were read from the last 2,000 rows of a team-wide tab. A reminder set weeks ahead scrolled out, stopped firing, and stopped counting toward the cap. They are now read by creation time.
- CN-2 — a note whose timestamp could not be parsed skipped the 5-minute self-delete window, so it could be deleted at any age. Such a note is now refused.
- CN-4 — when a later form link in an external email failed to create, the links already made stayed live and were never sent. They are now voided, with the reason on the audit row.
- CN-5 — the patient timeline read only the live Notes tab and reported `partial:false`. A patient whose older notes were cold-archived therefore showed a short history marked complete. It now reads the archive and marks archived notes. A search capped at 200 says so, and the timeline names the capped stream.

Files modified:
- Server: web-app/61_forms.js, web-app/30_callnotes.js, web-app/81_empdocs.js, web-app/82_coaching.js, web-app/00_config.js, web-app/Tests.js
- Client: web-app/cn/script_callnotes.html
- Tests: test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json
- Visual fixture: test/visual/mock.js
- Docs and state: CLAUDE.md (generated running-totals rows only), .cycle/STATE.md
Estimate: M (~10 h) — Batch 7a, written before the first edit
Actual: ~3 h

CHANGES:
FORM-1 | 61_forms.js | `findFormTokenRow_` and `findFormSubmissionRow_` loop at most twice: column scan, single-row fetch, then pure `formLocatedRowIs_(row, col, token)`. A mismatch re-scans; a second mismatch returns null, the caller's "not found". Return shapes are unchanged. `formTokensVoid_` and every public caller inherit the check.
HR-1 | 00_config.js, 81_empdocs.js, 82_coaching.js | `EMPDOC_TEXT_IDX` = Title, BodyMd, VoidReason. `COACH_TEXT_IDX` = PatientTRX, WhatHappened, WhatShould, VoidReason, RepResponse.
  - `issueDoc` and `createCoaching` append through `appendRowsTextSafe_`; both already hold the lock.
  - `voidDoc`, `voidCoaching` and `acknowledgeCoaching` write their text cell with `setNumberFormat('@')` + `sheetText_`.
CN-7 | 00_config.js, 30_callnotes.js | `CN_TEXT_IDX` = the seven contiguous content columns, Callback..Resolution.
  - `submitCallNote` appends through `appendRowsTextSafe_`; `createdNote` takes the returned row index instead of `getLastRow()`.
  - `updateCallNote` writes the seven cells as ONE '@' range via `sheetTextRows_`, so a pre-fix note gains the format on its first edit.
FORM-2 | 61_forms.js, Tests.js | The witness row and the `submitFormByToken` failure log use `'tokenRef=' + formTokenRef_(token)`. The editor suite's `_deleteFormWitnessAuditRow_` now matches the row by that reference.
FORM-3 | 61_forms.js, cn/script_callnotes.html, test/visual/mock.js | Pure `formSubmissionsWith_` returns the note's list oldest-first, one entry per token, seeded from the single slot on a pre-fix note. The stamp writes `formSubmissions` and keeps `formSubmission` as the latest, for any reader of the old key.
  - Client: `cnFormSubsOf_` feeds the rep card (`cnRenderCardCore_`) and the manager card (`cnMgrRenderReadonlyCard_`). Several pills read "form 1", "form 2" and name their type in the title.
  - Layout: side by side, two pills squeezed the compact card's text column to a word per line (measured in cn-log-light-compact). They now stack in `.cn-form-pills` (one column, one pill wide); a single pill renders as before.
  - The fixture's emailed note carries two forms.
FORM-4 | 61_forms.js | `parseRetentionDateMs_` accepts:
  - a coerced Date, as before;
  - "yyyy-MM-dd'T'HH:mm:ss" (forms);
  - "yyyy-MM-dd" (the Timesheet and call-note DATE columns — the archive and purge tiers share this reader).
  Pure `retentionStampPattern_` picks the pattern; anything else is null. The date-only shape is now read as CONFIG.TIMEZONE midnight (`Date.parse` read it as UTC midnight).
FORM-5 | 61_forms.js, 30_callnotes.js | Expiry text: pure `formLinkExpiryPhrase_(CONFIG.FORM_TOKEN_EXPIRY_HOURS)` supplies the wording in the HTML block and both plain-text bodies.
  - Routing: pure `formNotifyRoute_(createdBy, rosterEmails, managerEmails)` mails the creator only while they are on the live roster (the `empRosterEmail_` predicate). Otherwise it mails MANAGER_EMAILS with `rerouted`.
  - `formNotifyTargets_` feeds both notices (submission and failed-submission), post-lock as before.
  - A rerouted notice opens with "This form was sent by X, who is no longer on the team roster…", and its subject says "(sender has left the team)".
CN-1 | 00_config.js, 30_callnotes.js | `SCHED_STATE_SPAN_DAYS = SCHED_MAX_DAYS_AHEAD + 30` (90). `schedReadMine_` reads the CreatedAtMs column once, starts at pure `schedSpanStartRow_` (the SP-3 shape), and reads the span.
  - The list, the cap check and the status write all share the reader.
  - `SCHED_CALLS_SCAN` is removed (F1: declared-but-unread).
CN-2 | 30_callnotes.js | Pure `cnDeleteWindowError_(noteMs, nowMs, windowSeconds)` refuses an unreadable stamp ("cannot be deleted here … ask your manager") or an expired window. `deleteCallNote` refuses before `deleteRow`.
CN-4 | 30_callnotes.js, 61_forms.js | `sendExternalEmail`'s token-failure branch calls `formTokensVoid_` with the links already made and a reason. `formTokensVoid_` takes an optional reason; the default is unchanged.
CN-5 | 30_callnotes.js, cn/script_callnotes.html, test/visual/mock.js | `searchMyCallNotes` returns `truncated` when it hit the 200 cap (an additive field).
  - `getPatientTimeline` searches with `includeArchive` and returns `truncatedSources`; `partial` is true when any source failed or was capped.
  - `buildPatientTimeline_` carries `archived` on a note event.
  - The client banner names both a failed stream ("Retry for the full picture.") and a capped one ("only part shown: …"); an archived note reads "· archived".
  - The fixture's timeline shape gained `truncatedSources: []`.
(tests) | test/client/run.js | Pins moved by the changes, not new defects:
  - S2's raw-writer list (+updateCallNote, voidDoc, voidCoaching, acknowledgeCoaching) and appender list (+createCoaching, issueDoc, submitCallNote); its `_TEXT_IDX` check now accepts any tab's list.
  - PR4-1's createCoaching row literal and reply write.
  - The R2 #3 bounded-read assertion.
  - The C5 and F3 retention drives: their `parseDate` fake threw to force the old `Date.parse` fallback.

TEST RESULTS: passed.
- Pure: 1177/1177 (was 1167). Ten new pins, one per finding, driven wherever the code is pure:
  - FORM-1: the lookup over a table that shifts between its reads.
  - FORM-2: the witness, the log and the suite cleanup.
  - FORM-3: the list helper and the client reader.
  - FORM-4: seven free-text shapes refused; both written shapes parsed.
  - FORM-5: the phrase and the route grid.
  - CN-1: a 2,500-row tab with the rep's reminder at row 3.
  - CN-2: the window grid.
  - CN-4: structural.
  - CN-5: the timeline event, the endpoint wiring and the rendered banner.
  - HR-1 + CN-7: the three lists resolved to header names, plus the writers.
- DOM: 190/190, with one new pin: a real card with two forms renders two stacked pills, and a pre-fix note renders one unwrapped pill.
- Editor suite: +1 registration, `cn_textColumnsKeepTheirText` (a leading-zero callback, a date-shaped caller and issue, a number-shaped TRX read back exactly, on create and on edit). Not run here; it needs the editor.
- counts --check agrees; lint:server is clean; the split manifest is current.
- 18 bite-checks, all BITE, none NO BITE:
  - FORM-1 ×2, FORM-2 ×2, FORM-3 ×3 (incl. DOM ×2), FORM-4, FORM-5 ×2
  - CN-1, CN-2, CN-4, CN-5 ×3, CN-7, HR-1
- Visual: cn-log-light-wide, cn-log-light-compact, cn-log-dark-wide and cn-teamnotes-rep-light-wide — 0px overflow. All four were read. The compact shot first showed the squeezed text column (fixed above).

Regression Scenarios (Test Command `manual`) — walked against the changed code paths; none run on a deployment:
- S18 submit + rolling stack: PASS. Same row and rowIndex, now '@' text columns.
- S21 inline edit: PASS. One '@' range.
- S23 / S28 search, exact match and the timeline: PASS. The timeline now includes archived notes.
- S26 manager per-rep view: PASS (shot).
- S61 fillable form: PASS. The witness keeps `hash=` + `submittedAt=`; the token is now by reference. Retention reads only written stamps.
- S69 Employee Docs: PASS. A text title keeps its hash. A doc issued BEFORE the fix with a coerced title still fails verify — see operator actions.
- S99 coaching: PASS.
- S113 reminders modal: PASS.
- S114: behaviour PASS, but its Expected wording is now stale. It says only the Scratchpad and QA cells are '@'; the note, doc and coaching text cells are '@' too, so they show no apostrophe marker in Sheets.
- S106: NOT APPLICABLE (separate reader).

REGRESSION RISKS:
- A reminder left ACTIVE (overdue, never marked done) more than 30 days past its creation-span drops off the rep's list and out of the cap count. This was chosen: the old tail dropped arbitrary rows, including future ones.
- A notice whose creator's roster email was CHANGED (not offboarded) now goes to the managers instead of the rep.
- A retention date-only cell is now CONFIG.TIMEZONE midnight rather than UTC midnight — a few hours' shift on a ≥90-day cutoff.
- An '@' column stores whatever the app writes as text. A future writer of these columns that relies on Sheets turning a value into a number or Date would read a string; no current reader does (all String() the cell).
- A form link that fails to create mid-email now voids its siblings; previously they stayed pending until expiry.
INVARIANTS AT RISK: None broken. Checked and holding:
- INV-244 / g144: every write through the sheet-safe helpers; the new '@' writers are in the S2 lists, with the format before the write and the lock held.
- g145: `appendRowsTextSafe_` grows the grid.
- INV-282/283: void and retention.
- S4 / g143: no live token in the AuditLog; no new public function, since every helper ends in `_`.
- INV-60 (the 5-min delete window) is now fail-closed.
- g53 / g152: a capped or archived read says so; a span by time, not by row count.
- g153: an offboarded address is not a destination.
- INV-89: pill titles and type esc()'d.
- g140: `.cn-form-pills` has a rule.
- INV-185: the fixture mirrors `formSubmissions` and `truncatedSources`.
NET SCORE: 0 − 0 = 0. Production fixes (fired this month): none known.
- The external `?form` route is blocked by Workspace policy for external recipients, so FORM-1/2/3/5 had no live submissions.
- Form and call-note retention are OFF by default (FORM-4, CN-5's archive).
- The ScheduledCalls tab is far from 2,000 rows (CN-1).
- No date-shaped doc title, unreadable note stamp or failed second form link is known (HR-1, CN-2, CN-4).
- CN-7's coercion is plausible on any note, but no instance was reported.
- All ten are defensive. New failure modes: none identified; the trades are listed above.

OPERATOR ACTIONS / DEPLOY:
- Optional: an Employee Doc issued before this deploy whose title or body reads as a date or number still verifies as tampered and cannot be signed. Void it and reissue it. | BLOCKS DEPLOY: N
- Optional: `FORM_TOKEN_EXPIRY_HOURS` now drives the emails' "expire in N hours" text. Nothing to change unless it was edited. | BLOCKS DEPLOY: N
Deploy: Server + Client (Call Notes, public forms): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- Notes, docs and coaching rows written BEFORE the fix keep whatever Sheets coerced them to. A note gains the format on its next edit; docs and coaching do not. No migration was attempted.
- `getMySentForms` (the timeline's forms stream) has its own bound, and the timeline does not ask whether it was capped.
- `spanishSpanStartRow_` and `schedSpanStartRow_` are the same pure function with two names; a shared `spanStartRow_` would be the tidy form.
- The ScheduledCalls header row has no '@' format on Label (a date-shaped label is coerced). This is the same class as CN-7, outside this batch's scope.

DOCUMENTATION UPDATES NEEDED:
- docs/gotchas.md + CLAUDE.md index:
  - g144: notes, docs and coaching text columns are '@' now — HR-1's hash failure is the sharpest instance.
  - g152: CN-1 — a team-wide row-count tail on a per-rep read.
  - g153: FORM-5 — a creator address on a stored token outlives the person.
  - g53: CN-5 — the timeline read only the live tab and was marked complete.
  - g101/g102: FORM-1 — two unlocked reads must re-check the key.
  - Possibly a new g164: "a row fetched by index after an unlocked scan must carry the key it was found by".
- docs/design-decisions.md: "Interactive fillable web forms" / "In-app form-submission viewer" (a note keeps every submitted form; the notice reroutes for a departed sender); "Patient/TRX timeline" (archive included, a capped stream is partial).
- docs/operator-state.md:
  - `FORM_TOKEN_EXPIRY_HOURS` drives the email text.
  - The Forms store / ScheduledCalls note: reminders are read over a 90-day creation span.
  - Employee Docs: void and reissue a pre-fix doc with a coerced title.
- docs/modules.md: Call Notes (form pills, the timeline, the delete window, reminders) and Training & Employee Docs (text columns).
- .cycle/config.md:
  - S114's Expected (the note, doc and coaching cells are '@').
  - S61 (a second form on one note; the witness by reference; the departed-sender notice).
  - S28 (archived notes in the timeline).
  - S69 (a date-shaped title signs and verifies).
  - S113 (a reminder set far ahead still fires).
  - A new S134 for FORM-1/CN-2/CN-4 if wanted.
  - INV-355 candidate: a row fetched by index after an unlocked column scan carries the key it was located by.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
