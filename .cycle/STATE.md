# Cycle State

## Current
Cycle: 18
Phase: implement — the DUE Seams & Invariants audit ran 2026-08-21 (fresh
  session, read-only; handoff block pasted into the implement session) and
  its five findings F1–F5 are IMPLEMENTED on `claude/broad-scan-s9b8fd`
  (commits d467b94 + c105f04, block
  `.cycle/blocks/18-seams-F1-F5-broad-implement.md`). Not yet PR'd/merged —
  the user has not asked for a PR for this batch.
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
- /sync-docs for the F1–F5 batch (INV updates: INV-112 gains the server
  whitelist mention; possibly a gotcha for the two first-write pin lessons)
- PR + merge for F1–F5 (only when the user asks)
- /reflect to close cycle 18 (after any remaining implement work)
- DEPLOY (operator): PR #176 batches + this batch ship together on the next
  `clasp push -f` + New version; then `runAllTests()` in the editor

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
F1–F5 implemented + committed + pushed pending. Next: produce/keep the
summary block in `.cycle/blocks/18-seams-F1-F5-broad-implement.md`, push
the branch, then offer /sync-docs. Cycle 18 stays open until /reflect.
