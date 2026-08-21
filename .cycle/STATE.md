# Cycle State

## Current
Cycle: 18 — CLOSED (reflected 2026-08-21, `.cycle/blocks/18-a-reflect.md`;
metrics row appended: net +4 = 6 prod fixes − 2 Low new failure modes;
3 capabilities; 19 defensive. The row covers the pre-audit batches 1–8 + 5B
(PR #176) + the accrual hours-rebuild + the seams F1–F5 round (PR #177) —
everything un-reflected since `18pre-a-reflect.md`. Batch self-reports
summed to 17−0; strict re-derivation gives 6−2 — the cycle-17 correction
pattern, documented in the metrics notes. When cycle 19 opens, move this
block to HISTORY.md and reset from the template.)
Phase: reflect — DONE. The DUE Seams & Invariants audit ran 2026-08-21 (fresh
  session, read-only; handoff block pasted into the implement session) and
  its five findings F1–F5 are IMPLEMENTED, doc-synced, and **MERGED as
  PR #177** (16aa3b0) — commits d467b94 + c105f04 + a4f33bf + 91f493c,
  block `.cycle/blocks/18-seams-F1-F5-broad-implement.md`. NOT DEPLOYED —
  it ships with the still-owed PR #176 deploy.
  NOTE the cycle-18 PRE-audit batches 1–8 + 5B were implemented BEFORE this
  cycle formally opened (between-cycles operator work) and are already
  MERGED as PR #176 (4d5fc9f) but NOT DEPLOYED — the Apps Script
  `clasp push -f` + New-version deploy and a post-deploy `runAllTests()`
  are still owed (operator-only).
Scope: Seams & Invariants (whole-repo seams pass — the counter was 4/4)
Test Command: manual (Node harnesses: `npm test` = pure 585 + DOM 75;
  visual matrix on demand)
Subsystem cycles since last Seams audit: 0
Updated: 2026-08-21

## In progress (facts to carry forward — NOT judgments)
- Seams F1–F5 implemented, tested (585 pure / 75 DOM, all green), and
  bite-checked (6 mutations, all bite; one pin was widened when its bite
  exposed a too-narrow key extractor — committed separately as c105f04).
- The seams audit also VERIFIED-HELD: 6/6 veteran tripwires bite (in a
  scratch copy), all doc count claims match, INV Verify-clauses resolve,
  `adjustWindowDays` is server-shipped.

## Completed this cycle
- F1 | web-app/Code.js | server `intakeHttpOnly_` scheme whitelist on the
  Offerings pdfLink/imageUrl before they enter `intakeRecListHtml_`'s
  href/src (preview-modal innerHTML reachability); byte-identical regex
  mirror with the client twin, pinned
- F2 | web-app/intake/script_intake.html | dead `INTAKE_TAB_ICON` map +
  `compactIcon` read removed (INV-184; orphaned by compact-header
  retirement); intake scenarios re-shot clean
- F3 | test/visual/mock.js + test/client/run.js | verbatim
  `payPeriodRange_` copy in the DO-NOT-EDIT region, fixture CALLS it; a
  derived pin asserts pay-statement + offerings fixture shapes against the
  server's own return blocks; 3 MIRROR_INDEX entries added
- F4 | test/client/run.js | COUPLING_REGISTRY entry: every
  `AUTOMATION_JOB_CHECKS` action ⊆ `AUTOMATION_AUDIT_ACTIONS`
- F5 | CLAUDE.md | Visual Audit Stage no longer restates the scenario
  count (stale twice); the matrix summary is the single source

## Pending / not yet done
- DEPLOY (operator): PR #176 + PR #177 + the pilot-feedback ROUND 1 branch
  (below) ship together on the next `clasp push -f` + New version; then
  `runAllTests()` in the editor; then the round-1 email spot-check (one dept
  email + one intake email — From name reads "<Agent> · Universal Medical
  Supply", Reply-To is the agent). Nothing reaches users until it runs.

## Between-cycles operator feature work (2026-08-21, the 18pre convention)
- **Pilot-feedback ROUND 1 implemented** (operator-approved roadmap items
  #8 sender identity / #1 review-flag comments / #2 inbound-outbound toggle)
  — commit c15eec7 on branch `claude/team-tools-roadmap-6e2l97`, block
  `.cycle/blocks/19pre-pilot-round1-broad-implement.md`. Pure 585→595 (all
  10 new pins bite-checked), DOM 75, all green. NOT yet PR'd/merged/deployed.
  /sync-docs is OWED for it (the block lists the exact CLAUDE.md updates:
  INV-143 whitelist keys, SubformData gotcha, setCallNoteFlag 4th arg,
  draft-blob shape, operator-round entry).
- Roadmap rounds 2–3 approved in sequence: (2) Spanish Inbox claim/assign +
  scheduled-call reminders; (3) intake arrow-key nav, server-backed
  scratchpad (operator chose per-rep-sheet storage), Reference comments
  Phase A. Operator answers on record: sender v1 = name+replyTo (alias
  later); scratchpad = server-backed.

## Open follow-on items
- Code.js: `intakeHttpOnly_` drops schemeless operator URLs (`www.x.com`)
  — matches the client twin's shipped behavior; if an operator ever types
  one, the link silently doesn't render. A catalog-issues WARNING for
  non-http col E/F values would make it visible (INV-187 spirit).
- CDR col-4 header one-liner (cycle 15, still open — operator)
- `FORMS_SS_ID` segregation recommendation (standing operator item)

## Decisions made (so the next session doesn't re-litigate)
- F3's shape pin extracts keys colon-space over the WHOLE return block
  (nested keys ride along as shape contract) — the line-anchored form
  missed packed keys and its bite proved it
- F3's ban regex scans a comment-stripped view (INV-188) but the SHAPE
  extraction stays on RAW source — the naive //-stripper eats `https://`
  fixture URLs and with them the rows' closing braces
- F1's server helper mirrors the client REGEX LITERAL exactly and the pin
  asserts the literal in both files — the INV-72 parallel-source posture

## Where I left off
Cycle 18 is CLOSED. Pilot-feedback Round 1 (sender identity / review
comments / call direction) is implemented + tested + committed (c15eec7)
on `claude/team-tools-roadmap-6e2l97` and pushed — awaiting the operator's
PR/merge decision, the combined deploy (with PR #176/#177), and /sync-docs
for the round-1 doc updates. Next implementation work: roadmap round 2
(Spanish claim/assign, then scheduled-call reminders).
