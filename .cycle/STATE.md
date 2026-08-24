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

## Open follow-on items
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

## Where I left off
Cycle 18 is CLOSED. Pilot-feedback Rounds 1 (c15eec7), follow-ons
(86c64df), Round 2 (through 3188e79), Round-2 FOLLOW-ONS (d748f2f +
39cb0c5), and ROUND 3 (ef489ad → ba10a49 — intake arrow nav,
server-backed scratchpad, Reference comments Phase A, matrix → 47 with
the sched-modal dark/compact variants, plus the two visual fixes the
re-shoot caught) are ALL implemented + tested on
`claude/team-tools-roadmap-6e2l97` and pushed, and the round-3
FOLLOW-ONS (drawer comments parity, comment edit-in-place, count fold;
the invisible-icon catch + derived icon-key tripwire) are done with
/sync-docs APPLIED in the same session — no doc lists owed. The
operator asked for PR + merge; once merged, the ONLY remaining step is
the operator-side combined deploy (`clasp push -f` + New version, also
shipping PR #176/#177) + post-deploy runAllTests() (now incl.
scheduledCalls_flow, scratchpad_saveReadRoundTrip, kb_comments_flow
with the edit steps) + the round-1 email spot-check.
