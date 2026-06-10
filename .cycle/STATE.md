# Cycle State

## Current
Cycle: 1
Phase: implement
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 0
Updated: 2026-06-10

## In progress (facts to carry forward — NOT judgments)
- Cycle 1 broad-scan completed 2026-06-10 (findings A1–A10; A11 retracted). ALL selected backlog items are now implemented across this branch: A1–A4, A7 (4f0e170), P#1–P#4 (ac56aa1), P#5/P#6/P#14 (fa78c5e), KB Phase 2 / P#16 (cafad8f), and A8/A9 + P#7–P#13 + P#15 (c956a7d). P#17 (per-call CDR / Neon Option C) is NOT implementable in this repo — external datastore + call-data-reporting pipeline changes; CDR layer already isolated (INV-68).
- Next concrete step: operator deploy + editor `runAllTests()` (first run creates the new `TEST_INTAKE_SS_ID` fixture; ~9 new integration tests haven't executed against a real spreadsheet yet), then `/reflect` to close Cycle 1.

## Completed this cycle
- A1 | web-app/Code.js | FormTokens CreatedAt/ExpiresAt written in CONFIG.TIMEZONE (fixes ±~12h expiry skew)
- A2 | web-app/Code.js, web-app/Tests.js | getTodayPunches_ + dashboard collector sort punches chronologically at the source
- A3 | web-app/script_core.html | "?" shortcut handler skips contenteditable
- A4 | web-app/kb/script_kb.html, test/client/run.js | kbMd_ percent-encodes quotes in link URLs
- A7 | web-app/cn/script_callnotes.html | Sent Forms chips use defined design tokens
- P#1–P#4 | web-app/Code.js | CallNoteManagerComment audit action; domain-only form audit rows; bucket-aware decision email; submitFormByToken notify deferred past lock release
- P#5/P#6 (A6/A5) | web-app/Code.js | bounded per-rep CN reads (ambient/pins/QA/EOD); findFormSubmissionRow_ token-column lookup
- P#14 | Code.js, cn partial, Tests.js | Automation Health admin panel (getAutomationHealth)
- P#16 (KB Phase 2) | Code.js, kb partial, Tests.js, run.js | kbConvertDriveDoc Doc→markdown converter (INV-115, S63)
- A8 (=#13) | web-app/Code.js | getMetricsAmbient cache key threshold-suffixed (`metrics_ambient_v1:<threshold>`)
- A9 (=#10) | web-app/Code.js | submitFormByToken requires `_meta.consentAgreed === true` (absent `_meta` now rejected)
- P#7 | web-app/Tests.js | test_auditPanel_searchAndHistory + getCallNotesAuditLog/getCallNoteAuditHistory gate cases in test_managerGates_rejectNonManager
- P#8 | test/client/run.js | Node tripwire: CN_INTERACTIVE_FORM_IDS (client) === INTERACTIVE_FORM_TYPES (Code.js)
- P#9 | web-app/Tests.js | intake endpoint tests (preview hash+recs, stale-hash send rejected, unauthorized rejected, intakeResolveRecipient_ smoke) + TEST_INTAKE_SS_ID fixture (_setupTestIntakeFixture_, _withTestIntake_)
- P#11 | web-app/Code.js, web-app/Tests.js | punch-adjust dup guards (in-batch + existing-Pending per (date,punchType)) + approval-time adjust-window re-check; 2 integration tests
- P#12 | web-app/cn/script_callnotes.html | sticky form draft 24h TTL (CN_FORM_STICKY_MAX_AGE_MS); stale-PHI drafts discarded, timer reset
- P#15 | Code.js, intake partial, script_core.html, Tests.js | Intake "Sent" tab — intakeListMySubmissions / intakeGetSubmission (caller-scoped, manager-all, bounded detail lookup, read-only); INV-116 + test
- docs | CLAUDE.md | INV-88/106/107/113 amendments; INV-116; S57/S61 expected text; sticky-draft TTL; Intake four-tabs + Sent design decision; TEST_INTAKE_SS_ID fixture note

## Pending / not yet done
- P#17 — per-call CDR data (Neon Option C): NOT implementable in this repo (external Postgres + call-data-reporting pipeline). Revisit only if/when that infrastructure project is undertaken.
- Operator deploy: `cd web-app && clasp push -f` + Apps Script editor → Deploy → New version (covers everything since the last deploy, incl. the NEW Docs OAuth scope from P#16 — first editor run prompts re-auth).
- Operator: run `runAllTests()` once from the editor (creates the TEST_INTAKE_SS_ID fixture on first run; exercises the ~11 new integration tests).
- (Carried) Operator Script Properties for the Intake/forms/KB feature run: INTAKE_SS_ID, INTAKE_*_EMAIL, FORMS_SS_ID, FORM_DATA_RETENTION_DAYS=90, WEB_APP_URL, KB_SS_ID.

## Open follow-on items
- `intakeSend*` treats `expectedBodyHash` as optional (empty hash skips the guard) — `emailFromCallNote` REQUIRES it; consider tightening for parity (client always sends it).
- `notifyRepOfFailedSubmission_` still sends inside the ScriptLock (P#4 deferred-send parity).
- Existing duplicate Pending punch-adjust rows created BEFORE the P#11 guard aren't cleaned up — managers should deny stale dupes in the queue once.
- Optional: KB batch-convert helper once per-item conversion proves out; digest last-run audit rows for the Automation Health panel.

## Decisions made (so the next session doesn't re-litigate)
- FormTokens timestamps stored in CONFIG.TIMEZONE — parse correctness over display fidelity.
- Punch ordering fixed at the data source, not per-consumer.
- External anonymous web-app access is admin-blocked — external fillable-form route non-functional; not a code bug.
- Absent `_meta` on submitFormByToken is now REJECTED (A9) — the back-compat tolerance window is deliberately closed; the shipped client always sends it, and the external route is admin-blocked anyway.
- Punch-adjust approval re-checks ADJUST_WINDOW_DAYS at approve time — aged-in-queue requests must be denied, not approved (window enforced at both ends).
- Sticky CN drafts expire after 24h — PHI-minimization trade-off accepted (a >24h-old draft is discarded silently); pre-TTL drafts without the `at` stamp still restore.
- P#17 (Neon per-call CDR) is out of this repo's scope by design — the CDR data layer isolation (INV-68) is the only in-repo preparation possible.

## Where I left off
Cycle 1 implementation is COMPLETE (all selected findings + the full priority backlog except the out-of-scope P#17), latest commit c956a7d on `claude/gifted-hypatia-aee7wa`; Node harness 78/78. Next: operator deploy (clasp push -f + Docs OAuth re-auth + New version + editor runAllTests once), then `/reflect` to close Cycle 1 and record metrics.
