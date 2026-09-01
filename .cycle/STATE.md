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
Test Command: manual (Node harnesses: `npm test` = pure 712 + DOM 101;
  visual matrix on demand — 67 scenarios, last full shoot 2026-09-01 clean;
  Regression Scenarios run to S96)
Subsystem cycles since last Seams audit: 0
Updated: 2026-08-27

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
- DEPLOY (operator, the ONE outstanding action): PRs #176 + #177 (cycle 18)
  and #184 + #185 + #186 + #187 + #188 (the 2026-08-25 operator round) all
  ship on the SAME `clasp push -f` + New version; then `runAllTests()` in
  the editor (expect 293/293); then the payor CSV import (now in-app via
  Admin → Config → Reference data tables) and the email spot-check (one dept
  + one intake email — From shows the AGENT'S NAME ALONE since the
  2026-08-27 correction, Reply-To the agent, and the agent self-BCC'd).
  Nothing reaches users until the deploy runs.
- BLOCKED ON THE OPERATOR: batch 7 (structured intake feedback) — free-text
  recipient feedback already shipped 2026-08-13.

## Between-cycles operator feature work (2026-08-21, the 18pre convention)
- **Pilot-feedback ROUND 1 implemented** (operator-approved roadmap items
  #8 sender identity / #1 review-flag comments / #2 inbound-outbound toggle)
  — commit c15eec7 on branch `claude/team-tools-roadmap-6e2l97`, block
  `.cycle/blocks/19pre-pilot-round1-broad-implement.md`. Pure 585→595 (all
  10 new pins bite-checked), DOM 75, all green. NOT yet PR'd/merged/deployed.
  /sync-docs is OWED for it (the block lists the exact CLAUDE.md updates:
  INV-143 whitelist keys, SubformData gotcha, setCallNoteFlag 4th arg,
  draft-blob shape, operator-round entry).
- **Round-1 FOLLOW-ONS implemented** (2026-08-24, /broad-implement
  "follow-on items") — commit 86c64df, block
  `.cycle/blocks/19pre-pilot-round1-followons-broad-implement.md`. Four
  items: the DORMANT neutral-sender alias (`REP_SENDER_FROM` Script
  Property + `sendRepEmail_` wrapper over all six rep sends),
  {callDirection} copy-template token (default template unchanged),
  outbound History group chip, and the intakeCatalogIssues_ non-http E/F
  warning (closes STATE's seams-18 F1 open follow-on). Pure 595→600 (5 new
  pins + 2 veteran intake ordering pins repointed at the wrapper send, all
  bite-checked), DOM 75. Explicitly NOT done here: roadmap round 2 (its own
  round) and the operator-only items (CDR col-4, FORMS_SS_ID).
- **Round 2 implemented** (2026-08-24, /broad-implement "roadmap round 2") —
  block `.cycle/blocks/19pre-pilot-round2-broad-implement.md`, feature commit
  + 3188e79 (flex-wrap fix). Spanish Inbox claim/assign (SpanishClaims tab,
  advisory latest-wins fold, member self-claim / manager assign / steal
  guard, card pill + controls) + scheduled-call reminders (ScheduledCalls
  tab on the FORMS PHI store, epoch-ms cells, shell-ticker delivery with
  cross-window dedupe + INV-190 fetch discipline, CN bell modal + card
  More-menu prefill). Pure 600→607 (7 pins, 8 bites), DOM 75; Tests.js
  omnibus Spanish set gained claim/release cases (run post-deploy).
- **/sync-docs APPLIED for all three blocks** (2026-08-24, commit 3d80176) —
  CLAUDE.md updated per the three DOCUMENTATION UPDATES NEEDED lists
  (SubformData/INV-143/INV-77/draft-shape/S24; sendRepEmail_ wrapper text in
  the fire-and-forget gotcha + INV-01/42 + the REP_SENDER_FROM operator
  entry; {callDirection} token; History outbound chip; Offerings E/F
  http(s) requirement; storage-map SpanishClaims + ScheduledCalls rows +
  INV-114; INV-31 seven-endpoint amendment + claim contract; Spanish KDD
  claim paragraph; INV-190 section (d); running test total 585→607; the
  consolidated Operator State Checklist round entry). Harnesses green after
  the edits (pure 607 / DOM 75). No doc lists owed.
- **Round-2 FOLLOW-ONS implemented** (2026-08-24, /broad-implement) —
  commits d748f2f + 39cb0c5, block
  `.cycle/blocks/19pre-pilot-round2-followons-broad-implement.md`. Three
  items: Spanish pending fixture claim-state (all three claim states on
  camera; claimed item leads for the dashboard slide) + the matrix's FIRST
  modal scenario (`cn-sched-modal-light-wide` via a new optional shoot.mjs
  `post` hook), `test_scheduledCalls_flow` in Tests.js (+ the
  cleanupTestData ScheduledCalls TEST_ sweep — runs at the post-deploy
  runAllTests()), and the claim pill on the Dashboard Spanish card preview
  (shared `spanishClaimPillHtml_`, typeof-guarded). Pure 607→612 (5 pins;
  7 mutations / 7 bites — TWO pins strengthened when their first bite
  exposed them: a joined-string indexOf substring-matched `at` inside
  `atMs`, and a first-item-only shape check missed item 2). DOM 75. The
  three affected visual scenarios shot clean and were eyeballed.
  /sync-docs owed: test total 607→612 + the Visual Audit Stage's
  modal-coverage sentence.
- **Round 3 implemented + full 47-scenario matrix re-shot** (2026-08-24,
  /broad-implement "full 43-scenario re-shoot, dark/compact sched-modal
  variants, roadmap round 3") — commits ef489ad + 637bdc9 + 7b62a6b +
  3d87ebc + ba10a49, block
  `.cycle/blocks/19pre-pilot-round3-broad-implement.md`. Three
  capabilities: intake arrow-key field nav (the CN boundary-hop pattern);
  server-backed scratchpad (per-rep CN sheet `Scratchpad` tab,
  `setNumberFormat('@')` coercion pin, USER-lock save — documented INV-01
  exception, CN header fab + autosave modal with flush-on-close); Reference
  comments Phase A (`KbComments` tab, add/soft-delete author-or-manager,
  draft targets invisible, id-only audit rows, Reference TAB only — the
  drawer stays comment-free by the INV-139 parity shape). Plus the two new
  sched-modal scenarios (dark-wide, light-compact via the `post` hook →
  matrix 47) whose FIRST dark shot caught a round-2 latent: the sched
  modal's `.cn-act-btn`s were unstyled native buttons (white boxes in dark
  mode — now a scoped token rule), and the full re-shoot caught the CN
  header fabs scattering as separate grid items (now ONE `.cn-head-fabs`
  group). Pure 612→619 (7 pins; 9 mutations / 9 bites after one
  strengthen — the caret-edge pin needed a boundary-anchored-selection
  case), DOM 75. Editor suite +2 (`scratchpad_saveReadRoundTrip`,
  `kb_comments_flow` — run at the post-deploy runAllTests()). All 47 PNGs
  machine-clean (0 missing, 0 overflowPx) and eyeballed.
  /sync-docs owed (merged with the round-2-followons list): test total
  612→619 + editor ≈307; matrix 47 + modal-coverage sentence; the round-3
  features (Scratchpad tab in the per-rep store row, KbComments in the KB
  store row + endpoints + KbCommentAdd audit action, intake arrow nav,
  the cn-head-fabs note); INV-01 exception list + saveMyScratchpad;
  localStorage + INV-136 counts UNCHANGED.
- **Round-3 FOLLOW-ONS implemented + /sync-docs APPLIED** (2026-08-24,
  /broad-implement "follow-on items … then /sync-docs … then create PR and
  merge") — commits ed13796 → the checkpoint commit, block
  `.cycle/blocks/19pre-pilot-round3-followons-broad-implement.md`. Drawer
  comments parity (Phase B — dual-host shared renderer, per-host input ids,
  closest()-scoped handlers), `kbEditComment` edit-in-place (author-ONLY, no
  manager escape), comment-count fold into Most-used/Review-due via the
  shared chip; scratchpad revision history deliberately NOT built (stated
  design, condition unmet). THREE measured visual catches incl. **the
  invisible edit button — `icon('pencil')` silently returns `''`** ("pencil"
  is only an ICONS comment; key is `adjust`) → the new derived icon-key
  tripwire (pure 619→620; sweep found no other dead key) + the
  `reference-reader-light-wide` post-hook scenario + `getReferenceItem`
  fixture. 5 mutations / 5 bites. /sync-docs applied IN-SESSION: the merged
  round-2-FO + round-3 + follow-ons doc lists (test narrative →620,
  storage-map Scratchpad/KbComments rows, Visual Audit Stage post-hook note,
  round-3 operator entry, INV-01 exception list, S64 drawer-comments walk).
  No doc lists owed.
- Operator answers on record: sender v1 = name+replyTo (alias later);
  scratchpad = server-backed (per-rep sheet). Roadmap rounds 1–3 AND all
  their follow-ons are now implemented; nothing approved remains unbuilt.

## Post-deploy (2026-08-24) — the ONE runAllTests failure
- DEPLOY IS DONE (operator ran `clasp push -f` + New version; runAllTests
  gave **291 passed / 1 failed / 0 skipped**, 292 total).
- The failure was `metrics_cnCountNotesResult_countsToday` (expected 2,
  actual 21). NOT a production defect: the count was CORRECT about a tab
  the FIXTURE had failed to empty. `_clearTestCallNotes()` swallowed every
  failure (bare catch + silent returns), so a dirty fixture surfaced ~20
  tests later as an arithmetic mystery — INV-187 applied to test
  infrastructure.
- Fixed + merged as **PR #181** (21a90c2): the clear now throws naming the
  sheet, flushes, and VERIFIES the tab is empty; the count test asserts
  `ctx.emp.callNotesSheetId === _TEST_CN_SS_ID` (the decisive divergence
  diagnostic); cleanup reports surviving rows; pin 620→621 (2 bites).
- **ROOT CAUSE PROVEN** by the next run (2026-08-24 17:22, 270/22): the loud
  clear threw `Sorry, it is not possible to delete all non-frozen rows` in
  all 22 CN tests. `deleteRows` permanently SHRINKS the grid, so after
  enough runs `maxRows == lastRow` on a tab whose row 1 is frozen
  (`getCallNotesSheet_` sets `setFrozenRows(1)`), and
  `deleteRows(2, last - 1)` becomes "delete every non-frozen row" — which
  Sheets REFUSES. The old bare catch swallowed that throw every run, so the
  tab was never cleared and notes accumulated into the 2-vs-21 count. The
  22 failures were the diagnosis working, not a new defect.
- FIXED: both sweeps (the per-test clear + the end-of-run cleanup) now
  `clearContent()` the data range instead — empties the tab without touching
  the grid, so it stays correct however small the grid already is. The
  post-clear verify counts rows still carrying a DateLocal (semantic, not a
  bare getLastRow that a cleared-but-formatted grid could misreport). Pin
  extended: the helper may not return to `deleteRows` (bite-checked).
- Still owed from the deploy: the round-1 email spot-check (one dept + one
  intake email — From reads the agent's name (suffix dropped 2026-08-27), Reply-To
  the agent).

## Open follow-on items
- **LATENT (production, disabled-by-default features): the same Sheets
  refusal can hit `archiveSheetRowsOlderThan_`.** It `deleteRow`s bottom-up
  from the frozen-header Notes/Timesheet tabs; if a run's cutoff covers
  EVERY data row and the grid has no spare rows, the last delete is
  "delete all non-frozen rows" and throws — the per-rep catch would skip
  that rep's archive forever, logged but unfixed. Only reachable with
  `CN_NOTE_ARCHIVE_DAYS` / `TIMESHEET_ARCHIVE_DAYS` enabled (both default
  0). One-line guard: `insertRowsAfter` a spare row before deleting, or
  keep the final row and clearContent it. NOT fixed here (out of the scope
  asked for, and no urgency while both windows are 0).
- ~~intakeHttpOnly_ schemeless-URL catalog warning~~ — DONE 2026-08-24
  (round-1 follow-ons FO-D, commit 86c64df)
- CDR col-4 header one-liner (cycle 15, still open — operator)
- `FORMS_SS_ID` segregation recommendation (standing operator item)
- To ACTIVATE the neutral sender (optional): Gmail "Send mail as" alias on
  the deploying account + Script Property `REP_SENDER_FROM` (operator; no
  redeploy — dormant until both halves exist)

## Decisions made (so the next session doesn't re-litigate)
- F3's shape pin extracts keys colon-space over the WHOLE return block
  (nested keys ride along as shape contract) — the line-anchored form
  missed packed keys and its bite proved it
- F3's ban regex scans a comment-stripped view (INV-188) but the SHAPE
  extraction stays on RAW source — the naive //-stripper eats `https://`
  fixture URLs and with them the rows' closing braces
- F1's server helper mirrors the client REGEX LITERAL exactly and the pin
  asserts the literal in both files — the INV-72 parallel-source posture

## Post-merge operator round (2026-08-25, after PR #185)
- **Composer**: Preview gained an in-button loader (Role-D .lo-dots, restored
  on both failure paths), and the Note Reference is now an EDITABLE mini note
  template writing back through `updateCallNote` — Preview COMMITS pending
  edits first, so the INV-41 bodyHash is always built from the note as sent.
  Commits e91c3db + b2e3fe2 + a765c48. Pure 642→646, DOM 79→81.
- **Reference ingest** (the "can I upload a doc" ask, answered as TWO
  features): (a) Admin → Config → **Reference data tables** replaces an
  ALLOWLISTED KB sheet tab from a CSV (`KB_DATA_TABLES` is the boundary, not
  the gate; dryRun default TRUE; same server parse previews and writes);
  (b) the KB editor takes a **local file drop/pick** (`kbIngestFile`) — text/CSV
  become the body via the PRODUCTION sheet converter, .docx/.xlsx convert in
  Drive and run through the EXISTING converters, everything else embeds with
  the loss NAMED. Conversion uses the Drive REST endpoint with the token the
  project already holds — NO advanced service, nothing declared in
  appsscript.json, nothing for IT to approve (the operator flagged that risk).
  Commits 1e70942 + eb4b9eb + the pin/doc commits. Pure 646→651, DOM 81.
  INV-136 admin count 43→46 with all four gate cases.
- **Two POST-DEPLOY gate-test fixes**, both red on a CORRECT rejection, both
  now closed by a DERIVED tripwire rather than a corrected hand list:
  (a) `insurance_search_requiresEmployee` used `_assertFailure` (the WRITER
  shape, `success===false`) on a READ endpoint → **GATE-SHAPE**, which links
  each asserted variable back to the endpoint its own `_asUser` call produced;
  (b) `managerGates_rejectNonManager` asserted the MANAGER message for the
  three admin-gated Reference-ingest endpoints, because the omnibus's hand-kept
  `ADMIN_GATED` map had not been updated → **GATE-TIER**, which links every
  omnibus case to the tier `Code.js` actually enforces and fails in BOTH
  directions. `_assertContains` throws, so (b)'s single reported failure was
  masking all three. PRs #187 + #188. Pure 651→653.

## Where I left off
CURRENT (2026-09-01, after the A4 follow-on + Workstream B). Everything is
committed on `claude/team-tools-roadmap-6e2l97`; the PR is the next step.

Shipped this session (all merged unless noted):
- **PR #211** — the accrual stamp REWIND (a forward column-R stamp was handed
  back as last-month and the caller's write rewound it, so a same-day run undid
  an operator's deliberate skip); plus the standing pay-statement pre-flight in
  the runbook.
- **PR #212** — the honest shift-complete message (it now NAMES the ClockOut it
  was derived from, with a way out) and `reloadApp_` for the deploy beacon (the
  Reload button was reloading the HtmlService IFRAME, painting it white).
- **PR #213** — Workstream A core: `breakPairs_` + `calcHours_` deducting EVERY
  break pair, `punchDayAdd_` across all five hours builders,
  `tsDoctorLegitBreaks_` so the doctor stops offering to delete a legal pair,
  and the read-only `reportMultiBreakDays()` impact report.
- **PR #214** — Workstream A4: the Day Edit N-pair rebuild. Server:
  `managerParseBreakSlots_` + the extracted pure `managerPlanDay_` (the
  submitted list IS the day) + the range-mode refusal. Client: the four fixed
  slots replaced by an N-row break list with add/remove, prefill preferring
  `day.breaks` with a scalar fallback.
- **follow-on + Workstream B (this session, NOT yet PR'd)** — the 390px Manage
  Time overflow (an INLINE grid declaration the A2 tripwire cannot see, now a
  named class with a real breakpoint + a derived scan banning the shape);
  **B1** the adjust modal prefilled from the done state; **B2** the manager
  notified when an adjustment request is SUBMITTED (previously nobody was);
  **B3** the RESUME path — a `Resume shift` request converts the day's ClockOut
  into a break (`ADJ-LunchOut`) and appends the return (`ADJ-LunchIn`), so the
  away gap is unpaid and the rep gets their punch buttons back. 18 mutations /
  18 bites; pure 711, DOM 101, runAllTests 305, visual 62.

- **PR #215** — the A4 follow-on + Workstream B (the 390px Manage Time
  overflow; the prefilled adjust modal; the manager notified at SUBMIT; the
  RESUME path converting a ClockOut into a break so the away gap is unpaid).
- **Admin sub-tab follow-on (this session, NOT yet PR'd)** — the matrix's last
  wide-only surface. Five mobile scenarios (62 → 67) + a `getAdminSheetView`
  fixture the Sheets pane never had, and **VIS-ADMIN**, which derives the pane
  set from the client's own `tab()` call sites (the VIS-COVER marker works at
  TAB granularity, and all five panes live inside ONE covered tab). Its first
  run found a live defect: `.cn-tax-head` shared the row's `1fr` stacking rule,
  so the tag-taxonomy header rendered as six labels in a column above the first
  row. 7 mutations / 7 bites; pure 712, matrix 67/67 clean.

NEXT: open the Admin sub-tab PR, wait for CI, squash-merge, reset the branch.
Then /reflect — cycle 18 is closed, so this opens CYCLE 19 and the reflection
covers everything merged since PR #201 (the 2026-08-28 → 2026-09-01 operator
rounds: team calendar, ADJ feedback loop, business hours, test coverage,
Workstreams A/A4/B, and this).

Standing operator-side, unchanged: the deploy backlog (now ~20 PRs), a
`reportMultiBreakDays()` run before deploying the break work, `runAllTests()`
expecting 305, `installAutomationTriggers()` for trigger #18, and the ALL-CST
roster flip.

## Pending / not yet done
- DEPLOY (operator, the ONE outstanding action): PRs #176 + #177 (cycle 18)
  and #184 + #185 + #186 + #187 + #188 (the 2026-08-25 operator round) all
  ship on the SAME `clasp push -f` + New version; then `runAllTests()` in
  the editor (expect 293/293); then the payor CSV import (now in-app via
  Admin → Config → Reference data tables) and the email spot-check (one dept
  + one intake email — From shows the AGENT'S NAME ALONE since the
  2026-08-27 correction, Reply-To the agent, and the agent self-BCC'd).
  Nothing reaches users until the deploy runs.
- BLOCKED ON THE OPERATOR: batch 7 (structured intake feedback) — free-text
  recipient feedback already shipped 2026-08-13.

## Between-cycles operator feature work (2026-08-21, the 18pre convention)
- **Pilot-feedback ROUND 1 implemented** (operator-approved roadmap items
  #8 sender identity / #1 review-flag comments / #2 inbound-outbound toggle)
  — commit c15eec7 on branch `claude/team-tools-roadmap-6e2l97`, block
  `.cycle/blocks/19pre-pilot-round1-broad-implement.md`. Pure 585→595 (all
  10 new pins bite-checked), DOM 75, all green. NOT yet PR'd/merged/deployed.
  /sync-docs is OWED for it (the block lists the exact CLAUDE.md updates:
  INV-143 whitelist keys, SubformData gotcha, setCallNoteFlag 4th arg,
  draft-blob shape, operator-round entry).
- **Round-1 FOLLOW-ONS implemented** (2026-08-24, /broad-implement
  "follow-on items") — commit 86c64df, block
  `.cycle/blocks/19pre-pilot-round1-followons-broad-implement.md`. Four
  items: the DORMANT neutral-sender alias (`REP_SENDER_FROM` Script
  Property + `sendRepEmail_` wrapper over all six rep sends),
  {callDirection} copy-template token (default template unchanged),
  outbound History group chip, and the intakeCatalogIssues_ non-http E/F
  warning (closes STATE's seams-18 F1 open follow-on). Pure 595→600 (5 new
  pins + 2 veteran intake ordering pins repointed at the wrapper send, all
  bite-checked), DOM 75. Explicitly NOT done here: roadmap round 2 (its own
  round) and the operator-only items (CDR col-4, FORMS_SS_ID).
- **Round 2 implemented** (2026-08-24, /broad-implement "roadmap round 2") —
  block `.cycle/blocks/19pre-pilot-round2-broad-implement.md`, feature commit
  + 3188e79 (flex-wrap fix). Spanish Inbox claim/assign (SpanishClaims tab,
  advisory latest-wins fold, member self-claim / manager assign / steal
  guard, card pill + controls) + scheduled-call reminders (ScheduledCalls
  tab on the FORMS PHI store, epoch-ms cells, shell-ticker delivery with
  cross-window dedupe + INV-190 fetch discipline, CN bell modal + card
  More-menu prefill). Pure 600→607 (7 pins, 8 bites), DOM 75; Tests.js
  omnibus Spanish set gained claim/release cases (run post-deploy).
- **/sync-docs APPLIED for all three blocks** (2026-08-24, commit 3d80176) —
  CLAUDE.md updated per the three DOCUMENTATION UPDATES NEEDED lists
  (SubformData/INV-143/INV-77/draft-shape/S24; sendRepEmail_ wrapper text in
  the fire-and-forget gotcha + INV-01/42 + the REP_SENDER_FROM operator
  entry; {callDirection} token; History outbound chip; Offerings E/F
  http(s) requirement; storage-map SpanishClaims + ScheduledCalls rows +
  INV-114; INV-31 seven-endpoint amendment + claim contract; Spanish KDD
  claim paragraph; INV-190 section (d); running test total 585→607; the
  consolidated Operator State Checklist round entry). Harnesses green after
  the edits (pure 607 / DOM 75). No doc lists owed.
- **Round-2 FOLLOW-ONS implemented** (2026-08-24, /broad-implement) —
  commits d748f2f + 39cb0c5, block
  `.cycle/blocks/19pre-pilot-round2-followons-broad-implement.md`. Three
  items: Spanish pending fixture claim-state (all three claim states on
  camera; claimed item leads for the dashboard slide) + the matrix's FIRST
  modal scenario (`cn-sched-modal-light-wide` via a new optional shoot.mjs
  `post` hook), `test_scheduledCalls_flow` in Tests.js (+ the
  cleanupTestData ScheduledCalls TEST_ sweep — runs at the post-deploy
  runAllTests()), and the claim pill on the Dashboard Spanish card preview
  (shared `spanishClaimPillHtml_`, typeof-guarded). Pure 607→612 (5 pins;
  7 mutations / 7 bites — TWO pins strengthened when their first bite
  exposed them: a joined-string indexOf substring-matched `at` inside
  `atMs`, and a first-item-only shape check missed item 2). DOM 75. The
  three affected visual scenarios shot clean and were eyeballed.
  /sync-docs owed: test total 607→612 + the Visual Audit Stage's
  modal-coverage sentence.
- **Round 3 implemented + full 47-scenario matrix re-shot** (2026-08-24,
  /broad-implement "full 43-scenario re-shoot, dark/compact sched-modal
  variants, roadmap round 3") — commits ef489ad + 637bdc9 + 7b62a6b +
  3d87ebc + ba10a49, block
  `.cycle/blocks/19pre-pilot-round3-broad-implement.md`. Three
  capabilities: intake arrow-key field nav (the CN boundary-hop pattern);
  server-backed scratchpad (per-rep CN sheet `Scratchpad` tab,
  `setNumberFormat('@')` coercion pin, USER-lock save — documented INV-01
  exception, CN header fab + autosave modal with flush-on-close); Reference
  comments Phase A (`KbComments` tab, add/soft-delete author-or-manager,
  draft targets invisible, id-only audit rows, Reference TAB only — the
  drawer stays comment-free by the INV-139 parity shape). Plus the two new
  sched-modal scenarios (dark-wide, light-compact via the `post` hook →
  matrix 47) whose FIRST dark shot caught a round-2 latent: the sched
  modal's `.cn-act-btn`s were unstyled native buttons (white boxes in dark
  mode — now a scoped token rule), and the full re-shoot caught the CN
  header fabs scattering as separate grid items (now ONE `.cn-head-fabs`
  group). Pure 612→619 (7 pins; 9 mutations / 9 bites after one
  strengthen — the caret-edge pin needed a boundary-anchored-selection
  case), DOM 75. Editor suite +2 (`scratchpad_saveReadRoundTrip`,
  `kb_comments_flow` — run at the post-deploy runAllTests()). All 47 PNGs
  machine-clean (0 missing, 0 overflowPx) and eyeballed.
  /sync-docs owed (merged with the round-2-followons list): test total
  612→619 + editor ≈307; matrix 47 + modal-coverage sentence; the round-3
  features (Scratchpad tab in the per-rep store row, KbComments in the KB
  store row + endpoints + KbCommentAdd audit action, intake arrow nav,
  the cn-head-fabs note); INV-01 exception list + saveMyScratchpad;
  localStorage + INV-136 counts UNCHANGED.
- **Round-3 FOLLOW-ONS implemented + /sync-docs APPLIED** (2026-08-24,
  /broad-implement "follow-on items … then /sync-docs … then create PR and
  merge") — commits ed13796 → the checkpoint commit, block
  `.cycle/blocks/19pre-pilot-round3-followons-broad-implement.md`. Drawer
  comments parity (Phase B — dual-host shared renderer, per-host input ids,
  closest()-scoped handlers), `kbEditComment` edit-in-place (author-ONLY, no
  manager escape), comment-count fold into Most-used/Review-due via the
  shared chip; scratchpad revision history deliberately NOT built (stated
  design, condition unmet). THREE measured visual catches incl. **the
  invisible edit button — `icon('pencil')` silently returns `''`** ("pencil"
  is only an ICONS comment; key is `adjust`) → the new derived icon-key
  tripwire (pure 619→620; sweep found no other dead key) + the
  `reference-reader-light-wide` post-hook scenario + `getReferenceItem`
  fixture. 5 mutations / 5 bites. /sync-docs applied IN-SESSION: the merged
  round-2-FO + round-3 + follow-ons doc lists (test narrative →620,
  storage-map Scratchpad/KbComments rows, Visual Audit Stage post-hook note,
  round-3 operator entry, INV-01 exception list, S64 drawer-comments walk).
  No doc lists owed.
- Operator answers on record: sender v1 = name+replyTo (alias later);
  scratchpad = server-backed (per-rep sheet). Roadmap rounds 1–3 AND all
  their follow-ons are now implemented; nothing approved remains unbuilt.

## Post-deploy (2026-08-24) — the ONE runAllTests failure
- DEPLOY IS DONE (operator ran `clasp push -f` + New version; runAllTests
  gave **291 passed / 1 failed / 0 skipped**, 292 total).
- The failure was `metrics_cnCountNotesResult_countsToday` (expected 2,
  actual 21). NOT a production defect: the count was CORRECT about a tab
  the FIXTURE had failed to empty. `_clearTestCallNotes()` swallowed every
  failure (bare catch + silent returns), so a dirty fixture surfaced ~20
  tests later as an arithmetic mystery — INV-187 applied to test
  infrastructure.
- Fixed + merged as **PR #181** (21a90c2): the clear now throws naming the
  sheet, flushes, and VERIFIES the tab is empty; the count test asserts
  `ctx.emp.callNotesSheetId === _TEST_CN_SS_ID` (the decisive divergence
  diagnostic); cleanup reports surviving rows; pin 620→621 (2 bites).
- **ROOT CAUSE PROVEN** by the next run (2026-08-24 17:22, 270/22): the loud
  clear threw `Sorry, it is not possible to delete all non-frozen rows` in
  all 22 CN tests. `deleteRows` permanently SHRINKS the grid, so after
  enough runs `maxRows == lastRow` on a tab whose row 1 is frozen
  (`getCallNotesSheet_` sets `setFrozenRows(1)`), and
  `deleteRows(2, last - 1)` becomes "delete every non-frozen row" — which
  Sheets REFUSES. The old bare catch swallowed that throw every run, so the
  tab was never cleared and notes accumulated into the 2-vs-21 count. The
  22 failures were the diagnosis working, not a new defect.
- FIXED: both sweeps (the per-test clear + the end-of-run cleanup) now
  `clearContent()` the data range instead — empties the tab without touching
  the grid, so it stays correct however small the grid already is. The
  post-clear verify counts rows still carrying a DateLocal (semantic, not a
  bare getLastRow that a cleared-but-formatted grid could misreport). Pin
  extended: the helper may not return to `deleteRows` (bite-checked).
- Still owed from the deploy: the round-1 email spot-check (one dept + one
  intake email — From reads the agent's name (suffix dropped 2026-08-27), Reply-To
  the agent).

## Open follow-on items
- **LATENT (production, disabled-by-default features): the same Sheets
  refusal can hit `archiveSheetRowsOlderThan_`.** It `deleteRow`s bottom-up
  from the frozen-header Notes/Timesheet tabs; if a run's cutoff covers
  EVERY data row and the grid has no spare rows, the last delete is
  "delete all non-frozen rows" and throws — the per-rep catch would skip
  that rep's archive forever, logged but unfixed. Only reachable with
  `CN_NOTE_ARCHIVE_DAYS` / `TIMESHEET_ARCHIVE_DAYS` enabled (both default
  0). One-line guard: `insertRowsAfter` a spare row before deleting, or
  keep the final row and clearContent it. NOT fixed here (out of the scope
  asked for, and no urgency while both windows are 0).
- ~~intakeHttpOnly_ schemeless-URL catalog warning~~ — DONE 2026-08-24
  (round-1 follow-ons FO-D, commit 86c64df)
- CDR col-4 header one-liner (cycle 15, still open — operator)
- `FORMS_SS_ID` segregation recommendation (standing operator item)
- To ACTIVATE the neutral sender (optional): Gmail "Send mail as" alias on
  the deploying account + Script Property `REP_SENDER_FROM` (operator; no
  redeploy — dormant until both halves exist)

## Decisions made (so the next session doesn't re-litigate)
- F3's shape pin extracts keys colon-space over the WHOLE return block
  (nested keys ride along as shape contract) — the line-anchored form
  missed packed keys and its bite proved it
- F3's ban regex scans a comment-stripped view (INV-188) but the SHAPE
  extraction stays on RAW source — the naive //-stripper eats `https://`
  fixture URLs and with them the rows' closing braces
- F1's server helper mirrors the client REGEX LITERAL exactly and the pin
  asserts the literal in both files — the INV-72 parallel-source posture

## Post-merge operator round (2026-08-25, after PR #185)
- **Composer**: Preview gained an in-button loader (Role-D .lo-dots, restored
  on both failure paths), and the Note Reference is now an EDITABLE mini note
  template writing back through `updateCallNote` — Preview COMMITS pending
  edits first, so the INV-41 bodyHash is always built from the note as sent.
  Commits e91c3db + b2e3fe2 + a765c48. Pure 642→646, DOM 79→81.
- **Reference ingest** (the "can I upload a doc" ask, answered as TWO
  features): (a) Admin → Config → **Reference data tables** replaces an
  ALLOWLISTED KB sheet tab from a CSV (`KB_DATA_TABLES` is the boundary, not
  the gate; dryRun default TRUE; same server parse previews and writes);
  (b) the KB editor takes a **local file drop/pick** (`kbIngestFile`) — text/CSV
  become the body via the PRODUCTION sheet converter, .docx/.xlsx convert in
  Drive and run through the EXISTING converters, everything else embeds with
  the loss NAMED. Conversion uses the Drive REST endpoint with the token the
  project already holds — NO advanced service, nothing declared in
  appsscript.json, nothing for IT to approve (the operator flagged that risk).
  Commits 1e70942 + eb4b9eb + the pin/doc commits. Pure 646→651, DOM 81.
  INV-136 admin count 43→46 with all four gate cases.
- **Two POST-DEPLOY gate-test fixes**, both red on a CORRECT rejection, both
  now closed by a DERIVED tripwire rather than a corrected hand list:
  (a) `insurance_search_requiresEmployee` used `_assertFailure` (the WRITER
  shape, `success===false`) on a READ endpoint → **GATE-SHAPE**, which links
  each asserted variable back to the endpoint its own `_asUser` call produced;
  (b) `managerGates_rejectNonManager` asserted the MANAGER message for the
  three admin-gated Reference-ingest endpoints, because the omnibus's hand-kept
  `ADMIN_GATED` map had not been updated → **GATE-TIER**, which links every
  omnibus case to the tier `Code.js` actually enforces and fails in BOTH
  directions. `_assertContains` throws, so (b)'s single reported failure was
  masking all three. PRs #187 + #188. Pure 651→653.

## Where I left off
CURRENT (2026-09-01, after A4). Everything through **Workstream A4** is
committed on `claude/team-tools-roadmap-6e2l97`; the PR is the next step.

Shipped this session (all merged unless noted):
- **PR #211** — the accrual stamp REWIND (a forward column-R stamp was handed
  back as last-month and the caller's write rewound it, so a same-day run undid
  an operator's deliberate skip); plus the standing pay-statement pre-flight in
  the runbook.
- **PR #212** — the honest shift-complete message (it now NAMES the ClockOut it
  was derived from, with a way out) and `reloadApp_` for the deploy beacon (the
  Reload button was reloading the HtmlService IFRAME, painting it white).
- **PR #213** — Workstream A core: `breakPairs_` + `calcHours_` deducting EVERY
  break pair, `punchDayAdd_` across all five hours builders,
  `tsDoctorLegitBreaks_` so the doctor stops offering to delete a legal pair,
  and the read-only `reportMultiBreakDays()` impact report.
- **A4 (this session, NOT yet PR'd)** — the Day Edit N-pair rebuild. Server:
  `managerParseBreakSlots_` + the extracted pure `managerPlanDay_` (the
  submitted list IS the day) + the range-mode refusal. Client: the four fixed
  slots replaced by an N-row break list with add/remove, prefill preferring
  `day.breaks` with a scalar fallback. 18 mutations / 18 bites; pure 707,
  DOM 98, runAllTests 304, visual 61.

NEXT: open the A4 PR, wait for CI, squash-merge, reset the branch. Then
**Workstream B** — B1 (prefill the adjust modal from the done state), B2
(notify the manager on adjustment-request SUBMIT — today it notifies nobody),
B3 (the resume path, which needs `writeAdjustPunchForEmployee_` to gain a
remove/convert capability; the operator chose to build it now rather than
warn).

Standing operator-side, unchanged: the deploy backlog (now 19 PRs), a
`reportMultiBreakDays()` run before deploying the break work, `runAllTests()`
expecting 304, `installAutomationTriggers()` for trigger #18, and the ALL-CST
roster flip.
