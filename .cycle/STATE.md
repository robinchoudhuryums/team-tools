# Cycle State

## Current
Cycle: 1
Phase: implement
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 0
Updated: 2026-06-10

## In progress (facts to carry forward — NOT judgments)
- Cycle 1 broad-scan completed 2026-06-10 (findings A1–A10; A11 retracted). Implemented A1–A4 + A7 this session; committed on `claude/gifted-hypatia-aee7wa`.
- Next concrete step: operator runs `runAllTests()` from the Apps Script editor (new integration test `getTodayPunches_sortsOutOfOrderBackfill` hasn't executed against a real spreadsheet yet), then `clasp push -f` + new deployment version.

## Completed this cycle
- A1 | web-app/Code.js | FormTokens CreatedAt/ExpiresAt now written in CONFIG.TIMEZONE (matches all readers; fixes ±~12h expiry skew for non-IST reps)
- A2 | web-app/Code.js, web-app/Tests.js | getTodayPunches_ + getManagerDashboard per-emp punches sorted chronologically (same-day back-fills no longer scramble live status / next actions / ribbon); new integration test registered
- A3 | web-app/script_core.html | "?" shortcut handler now skips contenteditable elements (CN .ce fields no longer swallow a typed "?")
- A4 | web-app/kb/script_kb.html, test/client/run.js | kbMd_ percent-encodes quotes in link URLs (href attribute-injection closed); Node test extended (73 passing)
- A7 | web-app/cn/script_callnotes.html | Sent Forms chips: var(--good-deep)/var(--warn-deep) → the defined --success-deep/--warning-deep tokens
- /sync-docs | CLAUDE.md | punch append-order + isContentEditable gotchas; kbMd_ quote-encoding note; FormTokens-tz operator note
- P#1 | web-app/Code.js | CallNoteManagerComment added to CN_AUDIT_ACTIONS (compliance panel + lifecycle now cover manager comments)
- P#2 | web-app/Code.js | FormTokenCreated/FormSubmissionReceived audit rows log recipient DOMAIN only (toDomain=/fromDomain=); synthetic actor identity de-identified
- P#3 | web-app/Code.js | notifyEmployeeOfDecision_ reports the deducted bucket's balance (sick vs annual; none for unpaid)
- P#4 | web-app/Code.js | submitFormByToken sends the rep-notification email (PDF render) AFTER ScriptLock release
- P#5 (A6) | web-app/Code.js | bounded the whole-history per-rep CN reads: ambient (5-col), pinned tray (subform-col prefilter + per-row fetch), training QA (col scans + 5-row fetch), EOD digest (readCallNoteRowsInRange_ today-slice)
- P#6 (A5) | web-app/Code.js | findFormSubmissionRow_ token-column lookup; buildFormSubmissionResult_ + verifyFormSubmissionIntegrity_ no longer full-scan FormSubmissions
- P#14 | web-app/Code.js, web-app/cn/script_callnotes.html, web-app/Tests.js | Automation Health admin panel (getAutomationHealth: sync-fail count/recent, CDR reachability + column drift + alias-aware name mismatches, last-seen audit row per automation job); endpoint added to the parameterized manager-gate test
- /sync-docs (2nd) | CLAUDE.md | Automation Health design entry; gated lists + INV-31 += getAutomationHealth; PersonalSheetSyncFail gotcha -> surfaced in Admin; form audit rows domain-only note; per-rep bounded-reads note
- P#16 (KB Phase 2) | web-app/Code.js, web-app/kb/script_kb.html, web-app/Tests.js, test/client/run.js, CLAUDE.md | kbConvertDriveDoc Doc->markdown converter (manager-gated, read-only, review-before-save in the editor; no batch by design); Node stub tests (77/77); INV-115 + S63 + Docs-OAuth-scope operator note

## Pending / not yet done
- Audit findings NOT selected for implementation: A8 (metrics ambient cache key), A9 (consent _meta back-compat tolerance), A10 (frozen legacy dirs — no action by design). A5/A6 done as P#6/P#5.
- Operator deploy for this session's fixes: `cd web-app && clasp push -f` + Apps Script editor → Deploy → New version; re-run `runAllTests()` once.
- (Carried) Operator Script Properties for the Intake/forms/KB feature run: INTAKE_SS_ID, INTAKE_*_EMAIL, FORMS_SS_ID, FORM_DATA_RETENTION_DAYS=90, WEB_APP_URL, KB_SS_ID.

## Open follow-on items
- `notifyRepOfFailedSubmission_` (size-cap rejections) still sends inside the ScriptLock — fast plain-text sends, but could use the same deferred pattern as P#4 for symmetry.
- Server-side integration tests for the compliance-audit endpoints + intake/forms endpoints.

## Decisions made (so the next session doesn't re-litigate)
- FormTokens timestamps (CreatedAt/ExpiresAt) are stored in CONFIG.TIMEZONE — matching FormSubmissions.SubmittedAt and every parse site; rep-tz display fidelity was deliberately traded for parse correctness.
- Punch ordering is fixed at the data source (getTodayPunches_ / dashboard collector sort), not in each consumer.
- External anonymous web-app access is blocked by Workspace admin policy — the external fillable-form route is non-functional for external recipients; not a code bug.
- Provider claim docs (PT/OT Rx, seating eval) are out-of-scope for signature-of-record; EAA + patient self-serve intake are in-scope.
- Reference KB = native markdown articles (primary) + Drive-embed fallback; articles stored as markdown source, rendered with HTML-escape-first.

## Where I left off
Cycle 1 implementation: A1–A4 + A7, two /sync-docs passes, P#1–P#6, P#14, and KB Phase 2 (Doc->article converter, P#16) — all on `claude/gifted-hypatia-aee7wa` (latest cafad8f; Node harness 77/77). Next: operator deploy (clasp push -f + NEW Docs OAuth scope re-auth + new version + editor runAllTests), then /reflect to close Cycle 1. Remaining backlog: A8/A9 + P7–P13, P15, P17; follow-on: optional batch-convert helper once per-item conversion proves out, digest last-run audit rows for the health panel.
