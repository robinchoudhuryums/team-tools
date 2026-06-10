# Cycle State

## Current
Cycle: 1
Phase: idle
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 0
Updated: 2026-06-05

## In progress (facts to carry forward — NOT judgments)
- Nothing in progress — cycle tracking initialized after a large feature run.

## Completed this cycle
- (pre-tracking) Intake tool (PPD recommendation engine + PMD/PAP account creation), external fillable-form hardening (hash/consent/segregation/certificate/retention), the `/a/<domain>` form-link fix, Quick Links picker, the win-back nudge, and the Reference/KB tool. Merged to main via PR #39; later commits (PPD result cards, Reference tool, command sync) on `claude/nifty-knuth-dZUVP`.

## Pending / not yet done
- Open a follow-up PR for the post-#39 commits if not already merged.
- Operator deploy: `clasp push -f` + new version, and set the Script Properties (INTAKE_SS_ID, INTAKE_*_EMAIL, FORMS_SS_ID, FORM_DATA_RETENTION_DAYS=90, WEB_APP_URL, KB_SS_ID).

## Open follow-on items
- web-app/intake — Reference Phase 2 (Google-Doc→article converter for bulk KB migration).
- web-app (forms) — external `?form` route is admin-blocked (environmental, not a code bug); surveys/reviews go via Quick Links → external SaaS.
- `FormSubmissionReceived` audit row carries the recipient email (pre-existing PII) — consider domain-only minimization to match `ExternalEmailSent`.
- Server-side integration tests for the intake/forms endpoints (editor/manual only today).

## Decisions made (so the next session doesn't re-litigate)
- External anonymous web-app access is blocked by Workspace admin policy — the external fillable-form route is non-functional for external recipients; not a code bug.
- Provider claim docs (PT/OT Rx, seating eval) are out-of-scope for signature-of-record; EAA + patient self-serve intake are in-scope.
- Reference KB = native markdown articles (primary) + Drive-embed fallback; articles stored as markdown source, rendered with HTML-escape-first.

## Where I left off
Cycle tracking just initialized; no work in progress. Next: run `/health-pulse` for a directional baseline across the Health Dimensions, or `/broad-scan` to start Cycle 1 properly. The merged Intake/forms/KB work still needs the operator deploy + Script-Property setup (see Pending).
