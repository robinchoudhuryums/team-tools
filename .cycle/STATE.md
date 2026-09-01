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
Test Command: manual (Node harnesses: `npm test` = pure 703 + DOM 91;
  visual matrix on demand — 58 scenarios, last full shoot 2026-08-31 clean;
  Regression Scenarios run to S93)
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
CURRENT (2026-08-31, after PR #207). Everything is MERGED to main and the
branch is reset and clean — nothing is half-done in the repo. The three
2026-08-31 operator rounds shipped as **#205** (team punches calendar),
**#206** (punch-adjustment feedback loop: periodic Clock reconcile, pending
chip, decision emails on both outcomes) and **#207** (business-hours elapsed
across the Spanish stats, the per-thread card, Dept Requests' elapsed + SLA
bands, and the daily SLA digest). /sync-docs was applied after each, plus a
drift pass on 2026-08-31 that added the outerHTML-scope gotcha, the S74
business-hours step, and scenarios **S91–S93** (team calendar / adjustment
catch-up / business hours) — the three rounds had shipped without one, which
matters because the Test Command is `manual` and scenarios ARE the
verification protocol. Tests: pure **696**, DOM **82**, matrix **55**
(0 missing, 0 overflow, last full shoot 2026-08-31). runAllTests still 296.
The paragraph below is retained for the older context it carries.

PREVIOUS (2026-08-26). Everything is MERGED to main and the branch is
clean — nothing is half-done in the repo. The 2026-08-25 operator round
shipped as four PRs: **#185** (batches 1–6: intake polish, A_Q_Spanish
voicemails, insurance payor lookup, intake amend & re-send, note marker
formatting, intake-call analytics), **#186** (composer Preview loader +
editable Note Reference; Reference file ingest — editor file-drop AND the
Admin data-table CSV import), **#187** and **#188** (the two post-deploy
gate-test fixes + their derived GATE-SHAPE / GATE-TIER tripwires).
/sync-docs was APPLIED in every round — no doc lists are owed. Tests:
pure **653**, DOM **81**, visual matrix **49** (0 missing, 0 overflow,
last full shoot 2026-08-26).

NOTE #187 was merged by the operator without CI having run (the run was
queued behind a capacity shortage) and as a merge commit rather than a
squash. It is test-harness-only (Tests.js, run.js, shoot.mjs, CLAUDE.md)
and was verified locally at 653/81 on that exact commit.

NEWEST (2026-08-27, post-redeploy operator corrections): the operator
redeployed and pilot testing immediately produced three corrections, all
implemented + merged the same day: (a) the rep-sender display name is the
AGENT'S NAME ALONE — the "· Universal Medical Supply" suffix was the WRONG
company name and fired live; (b) every rep-initiated send now self-BCCs
the sending agent (a true agent Sent-folder entry is impossible — the app
sends as the deployer — so the copy lands in their inbox; append-not-
clobber over caller bccs, deduped); (c) the composer warns dismissibly at
Preview when Patient Name & TRX is empty (a pilot email went out without
one). The customersuccess@ sender ask needed NO code — the operator SET
`REP_SENDER_FROM=customersuccess@universalmedsupply.com` the same day, so
it is live (property changes need no deploy). TWO MORE rounds followed and
are MERGED: the BRAND sweep (PR #190 — the operator supplied the correct
name "UniversalMed Supply"; the wrong form shipped in 14 more user-facing
strings + the visual fixture's retired From line, all corrected, and a
derived BRAND tripwire bans the wrong literal from every shipped file) and
the KB-editor loader round (PR #191 — in-button loaders on Save + both
Doc/Sheet conversions, extending the L13 double-fire guard to the
converts, and converted-Doc images preview as a "appears after Save"
pending chip instead of bare alt text). The sender/TRX round is PR #189.
All three rounds need ONE MORE `clasp push -f` + New version beyond the
deploys the operator ran on 2026-08-27 (both predate these PRs). A FOURTH
same-day round built the DEPLOY-VERSION BEACON (the operator's
mid-shift-deploy question, answered then green-lit): open windows now get
a sticky reload PROMPT within ~20 min of a New-version deploy
(`clientBuildHash_` derived fingerprint + `getDeployStamp` polled from
the shell ticker + `showToast` action-button option). Ships in the same
pending deploy; post-deploy `runAllTests()` expects 294.

NEWEST OF ALL (2026-08-27, Part A — the LIVE timezone reports): a PH rep's
just-logged note was missing from today's rolling stack (present only under
yesterday in History), and the operator's own 2:16 PM CST note displayed
1:46 AM. First diagnosis (blank roster Timezone cell) was FALSIFIED by the
operator checking column H — the cells were correct. Real fault: the
coercion-recovery helpers formatted in the ADP tz (Asia/Kolkata) while a
coercing per-rep sheet interprets its stored digits in ITS OWN tz — the
operator's sheet tz is America/Chicago (14:16 Chicago recovered in IST =
00:46 next day) and the PH rep's is Asia/Manila (midnight Manila recovered
in IST = 21:30 the PREVIOUS day → the vanished note). Fix (block
`.cycle/blocks/19pre-parta-hosttz-broad-implement.md`): `getCallNotesSheet_`
memos the HOST sheet's tz (`cnHostTz_`, ADP-tz fallback on a failed read);
`cnTimestampString_` recovers in it; new `cnDateLocalString_` (the CN twin
of `normalizeDate_`) at all 26 CN-region CN.DATE_LOCAL sites. Round-trip
holds BY CONSTRUCTION for any sheet tz; no-op on pinned sheets;
retroactively corrects historical notes' DISPLAY (stored rows were never
wrong — nothing to re-enter). Pure 657→660 (PTA-1/2 behavioral against a
real Intl oracle + PTA-3 wiring + a derived normalizeDate_-over-DATE_LOCAL
ban; B6 rewritten in place; 4 mutations / 4 bites). Ships in the same
pending deploy.

NEWEST OF ALL #2 (2026-08-27, QA MODULE PHASE 1 — operator /broad-implement
after the Part A deploy): the new QA tool (eighth in the registry) — a
call-recording review queue for the QA rep(s). Both locked operator
decisions honored: Drive-drop ingestion (QA_RECORDINGS_FOLDER_ID + a manual
idempotent Sync) and agents OUTSIDE the gate in v1 (canSeeQa_ = managers +
QA_MEMBERS, a THIRD gate tier 'QA access required.'; the also:'canSeeQa'
tab flag + view-as personas hide the tool client-side). Dedicated QA_SS_ID
store (NO fallback — HR posture), chunked audio playback through the
kbGetImageData Drive boundary (folder parentage before bytes; >40MB names
the Drive link), timestamped comments with click-to-seek timeline markers.
Block `.cycle/blocks/19pre-qa-phase1-broad-implement.md`. Pure 660→667
(QA-1..6 + the auto-added parse-guard test; 6 mutations / 6 bites, TWO pins
strengthened when their first bite exposed them), DOM 82, matrix 49→51
(qa-queue wide+mobile, 0 missing / 0 overflow, eyeballed). Editor +1
(qa_gates_rejectNonMember) ≈ 311 — post-deploy runAllTests expects 295.
INV-196 + S90 + the QA operator-state entry (QA_SS_ID /
QA_RECORDINGS_FOLDER_ID / QA_MEMBERS) written. Phase 2 (waveform,
scorecards, per-agent stats) and Phase 3 (sampling, calibration,
agent-facing reviews) scoped, unbuilt.

NEWEST OF ALL #3 (2026-08-27, KB image-export diagnosability — operator
live report: a converted Doc's images failed to export at Save and the
warn toast vanished unread): kbReplaceDocImageTokens_'s catch reduced any
export throw to a bare null, so the specific Drive reason (policy? quota?)
never surfaced — only the generic count, for 3.5s. Now: the per-image
catch NAMES e.message, image warnings render STICKY, and the KbItemSave
audit row records imageWarnings=<n> + the first reason (Admin → Sheets →
AuditLog). Re-saving is the idempotent retry — the operator reads the
exact reason on the next Save. Pure 667→668 (KBI-3, 3 bites). ROOT CAUSE
STILL UNKNOWN pending that re-save readout.

NEWEST OF ALL #4 (2026-08-27, operator /broad-implement "UI Break schedule
editor, QA Module Phase 2" — block
`.cycle/blocks/19pre-breaks-qa2-broad-implement.md`): (a) the BREAK-SCHEDULE
EDITOR — the answer to "where does the break schedule information go?":
Manage → Admin → Config → "Break schedules" edits breaks + the reminder lead
per timezone with NO redeploy (Script Property SHIFT_BREAK_SCHEDULES;
breakSchedSanitize_ lenient read / saveBreakSchedules strict named-error
save, memoized getter merged into getShiftSchedule_ ahead of the CONFIG
chain, explicit-empty ≠ absent, delete-on-reset; INV-136 count 46→47 with
the F7/F9/GATE-TIER machine checks satisfied; inherited sections read-only
until Customize so an untouched Save never freezes inheritance). (b) QA
PHASE 2 — trailing Agent column (safe in place: Phase 1 merged, undeployed,
QA_SS_ID unset) + qaSetRecordingAgent (name never in the audit row);
QaScorecards tab (append-only, latest per (recording, reviewer) wins;
criteria seed + QA_SCORECARD_CRITERIA property override; unknown ratings
key REJECTS by name); getQaStats + pure qaStatsAggregate_ ((unassigned)
visible, null-not-0) on a new qaStats tab via mtRenderTable_; client
waveform (8 kHz mono OfflineAudioContext → qaPeaks_ → canvas, click-to-seek,
strictly decoration with the flat timeline as every failure path) +
scorecard UI (aria-pressed 1–5, selected-click unselects, form seeds from
my latest card). ALSO FIXED a Phase-1 defect found in review: the detail's
Start review / Mark done / Reopen onclicks called the SERVER helper name
qaStatus_ (dead ReferenceError; jsdom outside-only can't compile inline
onclick and no detail scenario exists) — now qaChangeStatus_ + the QA-7
derived onclick-resolves scan holds the class. AND a build hazard: an Edit
landed a LITERAL NUL byte in Code.js (grep began reporting it binary) —
replaced with a space sentinel via a python bytes-edit; the kbMd_ note's
"escape, never a literal NUL" rule now has a second citation. Pure 668→676
(BRK-1..4 + QA-7..10; 10 mutations / 10 bites), DOM 82, matrix 51→52
(qa-stats-light-wide). Editor ≈ 311 unchanged (omnibus + QA gate cases grew
IN PLACE) — post-deploy runAllTests still expects 295.

NEWEST OF ALL #5 (2026-08-27, operator /broad-implement "QA Phase 3" — block
`.cycle/blocks/19pre-qa-phase3-broad-implement.md`): sampling, calibration,
and the agent-facing reviews the v1 gate deferred — this command WAS the
recorded revisit of "agents do not see their reviews in v1". Conservative
postures: (a) SHARING IS AN EXPLICIT RELEASE (qaSetRecordingShared — the
EmpDocs draft→release precedent): a trailing SharedMs column (0 = unshared;
safe in place, QA merged but undeployed + QA_SS_ID unset everywhere),
refused until the recording is attributed to its agent, never auto-set by a
status flip, id+flag-only audit; (b) getMyQaReviews is EMPLOYEE-gated (bare
read {error} — the GATE-SHAPE rule, deliberately NOT canSeeQa_) and DOUBLY
scoped (SharedMs set AND Agent = caller's roster name), read-only /
never-provisions, active-comments-only, capped 50, NO audio path (playback
stays behind the canSeeQa_ Drive boundary — follow-on); the UNGATED
qaMyReviews tab is what makes the QA tool visible to every rep;
(c) qaSampleRecordings ("Sample 3 for me") assigns new+unassigned
recordings to the CALLER only via the pure coverage-fair qaSamplePick_
(lowest done+picked load per agent, injectable rand tie-break; counts-only
audit); (d) qaCalibration_ rows on the Stats tab — 2+ computable reviewers
only, per-reviewer means + spread + widest per-criterion gap, FACTS ONLY.
Client: My Reviews renders read-only through the SHARED qaScorecardListHtml_
builder (one markup source with the reviewer detail), share pill/button on
the agent row, calibration table, seq guards + errorStateHtml_ throughout.
Pure 676→680 (QA-11..14; 6 mutations / 6 bites — one bite exposed an
EQUIVALENT MUTANT: cards.length<2 in qaCalibration_ is an optimization
shadowed by the load-bearing reviewers.length<2 guard, so the bite was
re-aimed and the pin documents it), DOM 82, matrix 52→53
(qa-myreviews-light-wide). Editor ≈ 311 unchanged (QA gate case grew to 14
endpoints + the getMyQaReviews read-shape rejection IN PLACE) — post-deploy
runAllTests still expects 295.

NEWEST OF ALL #6 (2026-08-28, operator "hide QA from non-QA reps for now" +
/broad-implement follow-on items — block
`.cycle/blocks/19pre-qa-gate-followons-broad-implement.md`): (a) THE GATE
CHANGE — qaMyReviews now carries managerOnly+also:'canSeeQa' like the
reviewer tabs, so the QA tool is invisible to non-admin/non-QA reps again
(Phase 3's ungated tab lasted one day; the My Reviews machinery ships
DORMANT and re-opening is dropping the two flags from that one registry
line — the registry comment + QA-14 both say so; the employee-gated
server reads are unchanged). (b) FOLLOW-ONS IMPLEMENTED: the Admin →
Config "QA scorecard criteria" editor (saveQaScorecardCriteria — INV-136's
48th admin endpoint; strict named-error save over the lenient
qaCriteriaSanitize_ read, delete-on-reset when the exact CONFIG seed is
saved, rename-orphans-ratings warning; reads ride
getAdminConfig.qaCriteria {live, seed}); the agent audio path Phase 3
deferred (qaAudioChunkFor_ extracted as the ONE shared Drive byte
boundary — reviewer qaGetAudioChunk = gate+shape+delegate;
getMyQaReviewAudioChunk = employee gate + the SAME double scope resolved
read-only from the store BEFORE any Drive access, generic not-found on
every scope refusal; My Reviews per-card Play button, seq-guarded, no
Drive-fallback link); and the QA recording-DETAIL visual scenario (a real
1s 8 kHz WAV chunk the mock serves + comments/scorecards fixtures →
qa-detail-light-wide, matrix 53→54 — the standing gap). (c) SKIPPED with
reasoning: the QaScorecards/QaComments retention tier — a retention
window on review records needs an operator decision (the QA store is
HR-adjacent, currently keep-forever). Pure 680→682 (QA-15/16 new;
QA-2 + QA-14 REWRITTEN in place for the changed contracts; 7 mutations /
7 bites; one INV-188 recurrence — QA-14's ban scans the comment-stripped
body because the render fn's own comment names qaGetAudioChunk), DOM 82,
editor ≈311 (omnibus + QA gate cases grew IN PLACE) — post-deploy
runAllTests still expects 295.

NEWEST OF ALL #7 (2026-08-28 #2, operator "/broad-implement follow-on
items + show me a QA mock + are Training/Manage optimized for load time?"
— block `.cycle/blocks/19pre-qa-followons2-perf-broad-implement.md`):
(a) MOCK — delivered as the four real fixture-backed QA screenshots
(queue, detail, stats, my-reviews) rather than a drawing. (b) PERF ANSWER
— Training and Manage were NOT optimized (the 2026-08-13 SWR round never
covered them): Team Training's first paint waited on the SLOWEST of five
parallel RPCs, Manage re-ran getManagerDashboard (the app's heaviest live
read) behind a full-view loader on EVERY enter, My Training re-fetched
every enter. FIXED with session-state SWR: enterTrainingHomeView /
enterTrainingManageView / enterManagerView paint from TRAIN_STATE/mgrData
instantly on a re-enter + refresh behind the pill; the refresh render is
guarded (trainMgrFormDirty_ — picked item/typed due/checked boxes/open
overlay; mgrSwrRenderBlocked_ — checked bulk boxes/open overlay; data
lands in state BEFORE the guard so nothing is lost); a failed refresh
keeps last-good via warn toast (C17-5), cold failures keep the error
card; argless post-mutation callers keep cold semantics. First-load-of-
session is unchanged (real server work). (c) My Reviews Play now renders
the WAVEFORM + click-to-seek through the ONE shared qaDrawWaveOn_ painter
(qaDrawWave_ is a thin delegate; decoration-only — its own try/catch
after the audio mounts, size gate, INV-156 seq guard); the myreviews
scenario PRESSES Play via the post hook so it is on camera, and the mock
aliases getMyQaReviewAudioChunk to the reviewer WAV fixture (INV-185 —
both server routes delegate to qaAudioChunkFor_). (d) QA review-record
RETENTION tier shipped default-OFF (the deferred operator decision made
shippable by the CN/forms 0=disabled precedent): purgeOldQaReviews is
trigger #18 (daily 2am, INV-44 gate, locked; deletes QaComments +
QaScorecards past QA_REVIEW_RETENTION_DAYS; recordings index + Drive
NEVER touched; ms>0 fail-safe; bottom-up; counts-only QaReviewPurge audit
= the liveness heartbeat, job-check row gated on window>0 AND store per
INV-186; early-returns precede the lock). Pure 682→686 (ONE auto-added by
the derived trigger nets when purgeOldQaReviews entered TARGETS — INV-179
— plus QA-17/QA-18/PERF; 6 mutations / 6 bites), DOM 82, matrix stays 54
(myreviews grew in place), editor ≈312 — post-deploy runAllTests now
expects **296** (triggerGate_qaReviewPurge_nonManagerThrows). Operator:
re-run installAutomationTriggers() once (the 18th trigger — harmless
while the window is 0).

NEWEST OF ALL #8 (2026-08-28 #3, operator "check Team Notes for
optimization next; the Storage Health QA line can be enabled" — block
`.cycle/blocks/19pre-teamnotes-swr-storagehealth-broad-implement.md`):
(a) TEAM NOTES CHECKED: the shell already painted synchronously and
mgrEnrolledReps was session-cached, but the two QUEUE fetches
(managerGetTrainingQueue/ReviewCandidates — cross-rep Sheet walks, the
heaviest CN manager reads) and the STATS fetch (managerGetShiftStats,
another cross-rep walk) re-ran with a skeleton on EVERY enter and tab
switch. FIXED with the same session-state SWR: cnMgrLoadQueue_ paints
CN_STATE.mgrQueueCache[kind] + pill, cnMgrLoadStats_ paints the per-DATE
CN_STATE.mgrStatsCache entry; cache writes are key-exact and land BEFORE
the mgrSubSeq check (INV-156) and CLEAN-round-only (an {error} or
skippedReps/notesUnavailable round renders but never becomes the instant
paint — INV-129/187); the C17-5 painted/cold failure split on both
shapes; Per-Rep + Search stay cold by design (bounded single-rep read /
on-demand query) and the pin asserts them OUTSIDE the caches.
(b) STORAGE HEALTH QA LINE (operator-approved): getStorageHealth gains
the QA (recordings) store row — retention BUILT from the live
qaReviewRetentionDays_() ("ENABLED — N days … recordings index + Drive
files never touched" / the disabled default), muted not-set pill (the
no-fallback-by-design tone, INV-196), fixture row per INV-185, and
deployReadinessItems_ picks it up generically (unset → the optional
warn, like HR). Pure 686→688 (TN-SWR + SH-QA; 5 mutations / 5 bites),
DOM 82, matrix 54 (admin scenario renders the new row in place), editor
≈312 — post-deploy runAllTests still expects 296.

NEWEST OF ALL #9 (2026-08-28 #4, operator ALL-CST clarification — block
`.cycle/blocks/19pre-allcst-policy-broad-implement.md`): the operator
clarified that EVERY agent, offshore included, works a CST schedule (PH
8:30–17:00 CST, India 8:00–17:00 CST) — flipping the assumption that the
roster Timezone column = physical location. Verified the flip is CLEAN
along the axis the operator worried about: the sheet-tz machinery
(tzEquivalent_/adpSheetTz_/getSpreadsheetTimeZone) never reads
EMP.TIMEZONE — zero overlap with S1.1 / Storage Health / the coercion
round-trips; CONFIG.TIMEZONE stays Asia/Kolkata. The policy also EXPLAINS
the offshore incorrect-incomplete-punch flags (a CST shift straddles the
rep-local midnight → both halves incomplete → excluded from totals, pay
statements, and the hours-driven accrual) and the recurring
"note missing from today" (DateLocal rolls over mid-shift). CODE
COMPANIONS (commit 153d96f): getEmployeeState ships workAnchorTz
(additive = CONFIG.MANAGER_TIMEZONE); tzMismatchCheck_ REDESIGNED to
compare PROFILE tz vs the work anchor by offset (browser comparison
RETIRED — offshore browser ≠ correct CST profile is normal-by-policy;
unresolvable anchor/absent field disables silently, unresolvable profile
still warns); CONFIG.SHIFT_SCHEDULE.BY_TIMEZONE emptied (the Manila
entry was wrong twice over — keyed on a retiring roster value AND written
as Manila-local; PH 8:30 start moves to column O '8:30-17:00'; mechanism
kept). Pure stays 688 (the tz pin REWRITTEN in place — anchor comparison,
getTimezoneOffset ban, workAnchorTz wiring, BY_TIMEZONE:{} + Manila-entry
ban; 3 mutations / 3 bites), DOM 82. RUNBOOK for the operator (also in
the CLAUDE.md #4 entry): deploy → WEEKEND roster flip (Timezone =
America/Chicago every row; column O 8:30-17:00 for PH) → breaks all in
the Default CST section → before Sept 1 review offshore August timesheets
(split days under-credit the accrual; Day-Edit repairs or manual top-ups)
→ expect the once-daily profile-vs-anchor warning on offshore agents
between deploy and flip.

NEWEST OF ALL #10 (2026-08-31, operator "no manager view of team punch
times for a given date" — block
`.cycle/blocks/19pre-team-calendar-broad-implement.md`): the TEAM PUNCHES
CALENDAR in Manage → Manage Time. Placement deliberated with the operator
(a role-scoped toggle on the rep-facing Time/PTO page was argued against —
the registry-reorg convention puts team surfaces in Manage, and the Day
Edit modal lives in that partial); shape operator-picked via
AskUserQuestion: month calendar in the Time/PTO .cal-* vocabulary + a
FULL-WIDTH team punch table below the selected day + a pencil per row
opening Day Edit prefilled to that rep+date (openDayEditModal gained an
optional bounds-checked 3rd prefillDate arg). Server getTeamCalendar(month)
— manager-gated read, ONE Timesheet + ONE TimeOffRequests read per month,
derivation MIRRORS buildTimesheetForEmployee_ (last-per-type wins,
calcHours_ null → incomplete never 0), empRosterEmail_ inclusion, TO
status normalized once, garbage COMMENTS types skipped, live-tab-only with
archiveNote (INV-187). Client: per-month SWR (key-exact clean-round cache
write BEFORE the seq check — INV-156/129; C17-5 painted/cold split),
absent reps merged as muted "no punches" rows (past/current weekdays only,
deduped by id AND name, off-listed reps excluded), manager-tz dates,
future-nav refused, mtRenderTable_ per V-11. Pure 688→690 (behavioural
endpoint pin + client wiring/fixture-shape pin; 6 mutations / 6 bites —
TWO pins strengthened when first bites exposed them: a corrupt-time
fixture row was needed to make the null-hours path observable, and the
fixture-key mutation had to remove the key everywhere). Omnibus gained
the getTeamCalendar case IN PLACE (runAllTests still 296); mock gained an
argument-dependent getTeamCalendar fixture (the F14 rule), so the card is
on camera in the existing manager scenarios.

NEWEST OF ALL #11 (2026-08-31 #2, operator report: an approved same-day
ClockIn adjustment left the rep's dashboard still offering Clock In — block
`.cycle/blocks/19pre-adjust-feedback-broad-implement.md`). Investigated
BEFORE proposing: the server was correct throughout (an ADJ row is a real
punch; getNextActions_ returns Lunch Out), so this was three CLIENT/loop
gaps, all fixed. ADJ-1 clkPeriodicReconcile_ — throttled 3-min reconcile
riding the existing 1Hz tick (INV-190 cost rule, no new interval), gated
to the Clock view open+visible, window stamped inside clkRefreshState_
before the RPC so every trigger postpones it. ADJ-2 empPendingAdjustments_
on getEmployeeState (today-scoped, range-bounded, never provisions the tab,
status normalized at the one read, fails toward []) + clkPendingAdjustHtml_
chip ABOVE the punch buttons (role=status, empty renders nothing). ADJ-3
notifyEmployeeOfAdjustDecision_ on BOTH approve and deny, deferred past
releaseLock via notifyAfter (M-7), branded/escaped/best-effort — adjustments
were the ONLY request type with no notification (time off always had one),
which is the answer to the operator's broader question: this closes the set
rather than starting a notification subsystem. Pure 690→692 (6 mutations /
6 bites), DOM 82, matrix 54→55 (clock-pendingadj-light-wide via a
?pendingadj=1 mock hook, so the chip is on camera without putting a rare
state in every clock shot). No operator state; runAllTests still 296.

NEWEST OF ALL #12 (2026-08-31 #3, operator: "want to confirm that Median
Spanish Inbox time is not including weekends?" → it WAS; operator picked
option 2, exclude weekends AND holidays — block
`.cycle/blocks/19pre-business-hours-broad-implement.md`). Confirmed by
reading the code first: `getSpanishInboxStats` timed raw wall clock, and
`getDeptRequests`/`drSlaStatus_` shared the class — so a Friday-afternoon
request answered at Monday's open reported as a 3-day reply AND could go
"overdue" purely by sitting through a weekend. BIZ-1 `businessMinutesBetween_`
(+ the PURE `bizMinutesLocal_`, `bizPointInTz_`, `businessHours_`,
`BIZ_MAX_SPAN_DAYS`=400): subtracts nights/weekends/US holidays in
MANAGER_TIMEZONE (operating anchor, not the storage frame), REUSING the
Coverage planner's window constants so coverage bands and response times
share one definition of a working hour. The core takes pre-converted
{date,min} points and walks days UTC-anchored — no Utilities dependency, so
it is Node-testable off-platform. 0 is a real answer (nothing owed during
the span); null is UNKNOWN (reversed pair, corrupt stamp, absurd span,
inverted window) and is never substituted (F8). BIZ-2 applied to the Spanish
stats (additive avgBusinessMinutes/medianBusinessMinutes/businessCount/
businessHours beside the KEPT wall-clock pair), the per-thread resolved card
(resolveMinutes is now business, resolveWallMinutes rides along), and Dept
Requests (elapsedMin IS the business figure so deptStats avg/median follow
free; elapsedWallMin + slaBusiness additive; slaStatus bands on business
minutes) — AND `deptRequestsOverdueOpen_`, the daily SLA digest, which
previously aged with raw wall clock: two readers of one store using
different arithmetic could disagree about whether a request was overdue.
BIZ-3 clients lead with business, keep wall clock as sub-line/tooltip, and
NAME what is excluded (an unexplained 3d→2h drop reads as a bug); the
DR note had to move INSIDE the `#dr-kpi` wrapper because `drRepaintKpi_`
replaces that element's outerHTML on an in-place resolve and a sibling note
would stack one copy per patch (id moved off the .telemetry grid).
Pure 692→696 (13 mutations / 13 bites; ONE pin was too weak on its first
bite — it passed against `bizMin == null ? 0 : bizMin` — and was tightened
to the guarded push). DOM 82. Matrix 55, 0 problems: Spanish now shoots
"Avg 52m / wall clock 1h 18m", "Median 31m / wall clock 45m". No operator
state (it reuses COVERAGE_BUSINESS_* constants); runAllTests still 296.
POST-DEPLOY EXPECTATION worth stating to the operator: every response-time
figure they have been reading gets SMALLER, and Dept-Request SLA bands move
with it. Nothing is recomputed in any sheet — the stored stamps are
untouched, only derived figures change.

NEWEST OF ALL #13 (2026-08-31 #4, operator: "are there any gaps in test
coverage currently in the app?" then "take on the remaining items" — block
`.cycle/blocks/19pre-test-coverage-broad-implement.md`). MEASURED rather than
recited. Five gaps found; the operator closed the biggest by RUNNING
`runAllTests()` (296/296 green — it had not run across 22 PRs and +3,592 lines
of Code.js, and it is the only thing that executes against the real Apps
Script runtime). The rest: T1 the four PMD/PAP intake preview+send endpoints
had ZERO coverage of any kind while the PPD sibling was well covered (now 4
cases: the acct email builder's escaping pin, cross-form hash distinctness —
a PAP preview must not authorize a PMD send — the three-way send hash gate
incl. the sibling's VALID hash, and read-vs-write refusal shapes); T2 five
more zero-coverage endpoints, pinned on what they REFUSE and what they must
NOT return (getIntakeAgents is {id,name} exactly — agent emails are resolved
server-side so they never reach a client); T3 the matrix covered 18 of 29
tabs, +3 scenarios for both Intake ACCOUNT forms and Team Notes; T4 the
documented uncovered-tab list was prose that had drifted to 3 of 11 real gaps
— now a VISUAL-GAP-TABS marker checked by the derived VIS-COVER pin.
Bite-checking T1 exposed a pin that could not fail: GATE-SHAPE resolved to the
one-line wrapper whose own catch carries success:false, so it never saw the
delegate; it now follows the delegation. Pure 696→697, DOM 82, matrix 55→58,
editor suite 296→**302**. No app-behaviour change in this round.
KNOWN REMAINING (documented, not closed): 8 tabs still unshot; 79% of the pure
harness is source-scanning not behavioural (462 of 584 blocks, measured); the
DOM harness is concentrated in the shell + Call Notes, with one test for Time
Clock's punch state machine.

NEWEST OF ALL #14 (2026-08-31 #5, operator: "take on the DOM harness gaps for
Time Clock's punch state machine" — the third of the three gaps #13 recorded
but did not close). The DOM harness had ONE punch test (the M-1 failure
restore) for the app's most consequential client logic: the SERVER state
machine is well covered, but which button a rep SEES and what happens to it
across the four response shapes lived only in source pins. Nine tests, DOM
82→**91**, driven through the REAL renderActions/submitPunch into a live DOM.
Covered: the primary-CTA rules incl. the operator's afterLunch flip (ClockOut
takes prime, LunchOut DEMOTED not removed — a second break stays reachable);
Adjust always last, never primary, exactly ONCE; the completed-shift branch
with no prime button; the F3 clicked-vs-prime morph target plus LunchIn's
doorExit destination matching ClockOut's idle glyph; all four submitPunch
response shapes (state-in-response ⇒ ZERO follow-up RPC, older-server refetch
fallback, {success:false} restoring the button with the SERVER's reason, and
D2b — punch succeeded / refresh died ⇒ restore + WARN not error, since an
error toast tells a rep to re-punch when a duplicate is wrong); the
pending-adjustment chip (announced, escaped, renders nothing when absent);
and self-undo's midnight wrap incl. the −1 sentinel that must fail an obvious
`<= window` test. 9 mutations / 9 bites — the NINTH exposed a weak assertion
rather than a defect: dropping the `a !== 'Adjust'` filter renders Adjust
TWICE, and last-ness/non-primacy/class all still held, so the pin now counts
occurrences. jsdom lesson: `empState`, `renderActions`,
`SELF_UNDO_WINDOW_SECONDS` are LEXICAL module bindings, not window
properties — read via the `h.read()` vm bridge. No app change; pure 697,
matrix 58, runAllTests unchanged at 302.
NEWEST (2026-09-01) — **PR #211**: `accrualMonthsToCredit_` collapsed a BLANK
stamp (seed) and a stamp AHEAD of last month (a deliberate operator skip) into
one branch, both returning `newStamp: ymOf(prev)`. The caller writes newStamp
whenever it differs, so hand-setting column R forward was rewound by that same
day's 18:00 run and the NEXT month credited exactly the month the operator had
said to skip — the one lever they have, silently undone, and one CLAUDE.md
tells them to use. A forward stamp now comes back unchanged so the write is a
no-op; the seed path is untouched. Pins grew IN PLACE (pure stays 697):
forward-stamp no-op in both fields, months-ahead likewise, seed still stamps
last month, and the caller's write is CONDITIONAL (the no-op needs both
halves). 2 mutations / 2 bites. Docs: column R states the forward stamp is
honored + must be zero-padded (`accrualStampYm_` matches `^\d{4}-\d{2}`;
anything else reads blank and SEEDS); INV-194 splits blank-vs-future; and a
NEW **standing pre-flight** on the column-Q entry, referenced from runbook
step 4 — before any month's credit, open an accruing rep's PAY STATEMENT for
that month, since the accrual reads days through the same `calcHours_` and
whatever the statement calls INCOMPLETE contributes ZERO hours. Exact preview,
no timezone inference needed.

ACCRUAL TIMING, as it actually stands (operator filled column Q for the PH
agents on 2026-09-01): the first run with a rate is TODAY 18:00 CST, and with
`nowYm='2026-09'` + a blank R it SEEDS (stamps `2026-08`, credits NOTHING).
So **August is skipped automatically** — the documented enable convention, and
the right outcome given August's offshore hours are split. **September credits
on Oct 1**, which makes the roster flip the deadline that now matters: every
unflipped day is a day of unreadable September hours.

LIVE OPERATOR REPORT (2026-09-01): a PH rep could not clock in — the Dashboard
showed "Shift complete for today". DIAGNOSED, no code defect. `getTodayPunches_`
frames today in the REP's roster tz and `getNextActions_` returns `['Adjust']`
on a trailing ClockOut. With roster tz still Asia/Manila, Monday's 17:00 CST
clock-out is 06:00 Manila TUESDAY, so today's rep-local date already ends with
a ClockOut. Blocks Tue–Fri every week (Monday is clean — Friday's clock-out
lands on Manila-Saturday). Same root cause as the accrual under-count; ONE data
change fixes both. Unblock = manager Day Edit putting Monday's pair on Monday
(ClockIn 21:30 / ClockOut 06:00 — `calcHours_`'s overnight wrap gives 8.5h);
permanent fix = the ALL-CST roster flip, which needs one cleanup Day Edit per
offshore agent for the stray next-day clock-out at the seam.

NEWEST #2 (2026-09-01) — **PR #212**, two operator reports: (a) the Clock
done-state ASSERTED "Shift complete for today" from a trailing ClockOut, which
told an offshore rep their shift was over before it started (INV-187's class in
the punch UI); it now NAMES the punch ("· clocked out at 6:00 AM") + the way out
(Adjust), conditional so a caller passing nothing gets the bare message. (b) The
deploy-beacon's Reload ran `location.reload()` — which reloads the SESSION-BOUND
googleusercontent iframe URL, the one popOutCurrentView already refuses to reuse
(INV-78) — repainting the inner frame WHITE while the real page above never
moved. `reloadApp_` now moves the TOP window to `SERVER_WEB_APP_URL` via
`Location.replace`, then `'_top'` open, then the in-frame reload; compact
carries `?compact=1&tool=`. THIRD instance of the iframe-location class, so it
is a Common Gotcha now with the rule stated once. Pure 697→**699** (CLK-DONE,
BCN-3); BCN-2 + the behavioural `getNextActions_` block grew IN PLACE, the
latter with the operator's own question as a test (stray ClockOut + approved
`ADJ-ClockIn` ⇒ LunchOut/ClockOut/Adjust). DOM stays 91. 6 mutations / 6 bites;
BCN-3's ordering check used `lastIndexOf` and passed a reload-first mutation —
it counts reloads now. Docs: beacon KDD, the new gotcha, the done-state rule,
S94.

ANSWERED for the operator: after approving a same-day ClockIn adjustment the rep
DOES get Lunch Out / Clock Out — `normalizeType_` strips `ADJ-` (INV-09) so it is
a real state, and the backward scan means a stray EARLIER ClockOut no longer
decides. Their screen will not self-update on the deployed code (the 3-min
`clkPeriodicReconcile_` is PR #206, undeployed): reload, or alt-tab away and back.

NEWEST (2026-09-01) — **Workstream A core** (block
`.cycle/blocks/19pre-workstream-A-broad-implement.md`). Three subsystems
disagreed about whether a second break pair is legal data: `getNextActions_`
OFFERS it, `calcHours_` + five last-wins map builders MISCOUNTED it (only the
last pair deducted, so every earlier break was silently PAID), and both repair
paths (sheet doctor, Day Edit) treated it as damage to collapse. A1-A3 make the
first three agree; A5 is the read-only `reportMultiBreakDays()` the operator
runs BEFORE the deploy to see which historical days shrink. pure 699 -> 703,
DOM 91, 4 mutations / 4 bites. THREE existing pins went red and were updated as
part of the fix (two vm sandboxes; the derived fixture-shape pin read
"Additive:" out of a comment as a key — INV-188 again, fixed in the extractor).
Also corrected the team-calendar "+N" tooltip, which told a manager to open the
one screen that destroys the data this change made legal.

**A4 (Day Edit N pairs) is DEFERRED to its own PR and is REQUIRED** — it is the
one remaining path that silently collapses a legal multi-break day, and A1
elevated that from harmless to data loss. Then Workstream B (B1 prefill on the
done state, B2 notify-manager on adjust-request submit — today it notifies
NOBODY, B3 the resume path, which needs `writeAdjustPunchForEmployee_` to gain
a remove/convert capability it does not have).

OPERATOR DECISIONS on record (2026-09-01): breaks ARE legal; rebuild Day Edit
for N pairs rather than warn; build B3 now; wants the historical impact list
(hence A5 — I have no access to their live sheet, so it ships as a function
they run). Overtime is occasional (a few times a month across the team), so the
full multi-shift model was priced and REJECTED as disproportionate — the
break-pair path expresses it with no new authority.

STILL OPEN from #13: 8 tabs unshot; 79% of the pure harness is
source-scanning (462 of 584 blocks).

THE ONLY OUTSTANDING WORK IS OPERATOR-SIDE, in this order:
  1. `cd web-app && clasp push -f`, then Deploy → Manage deployments →
     Edit → Version: **New version**. This one deploy also carries the
     still-undeployed PR #176 + #177 from cycle 18.
  2. DONE 2026-08-31 (296/296 green). The NEXT run expects **302/302** (the beacon +
     QA-gate cases + the QA-purge trigger gate joined after the QA rounds
     landed). ALSO re-run `installAutomationTriggers()` once — the 18th
     trigger (`purgeOldQaReviews`) is harmless while its window is 0.
  3. Import the payor CSV — now doable IN-APP via Manage → Admin → Config →
     **Reference data tables** (previews first; dryRun defaults TRUE), so
     the manual File → Import → rename-to-`InsurancePayors` is optional.
  4. Email spot-check: one dept + one intake email — From reads the
     agent's name ALONE (the org suffix was the wrong company name and was
     dropped 2026-08-27), Reply-To is the agent, and the sending agent
     receives a self-BCC copy in their inbox.
  5. DONE (2026-08-27): `REP_SENDER_FROM=customersuccess@universalmedsupply.com`
     is SET — rep-initiated sends go out from the alias via GmailApp, which
     also records each send in the deployer's own Gmail Sent folder.
  6. Timezone spot-check (Part A): log a note and confirm the card shows
     your wall-clock time; have a PH agent confirm a fresh note appears in
     today's Log immediately. Historical notes' displayed times
     self-correct on the same deploy — nothing to re-enter.
  7. QA setup (Phase 1): set QA_SS_ID (fresh dedicated spreadsheet),
     QA_RECORDINGS_FOLDER_ID (the Drive drop folder, readable by the
     deployer) and QA_MEMBERS (the QA rep emails); then drop one recording,
     Sync, play it, comment at a timestamp (the S90 walk).

BLOCKED ON THE OPERATOR: batch 7 (structured intake feedback). Free-text
recipient feedback already shipped 2026-08-13, so only build field-level
structured corrections if they confirm they want them on top of it.

FOR WHOEVER OPENS CYCLE 19: the `19pre-*` block backlog is now **13**
blocks (pilot rounds 1–3 + follow-ons, operator batches 1–6, and
`19pre-operator-composer-ingest-gates`) and NONE of it is reflected. The
cycle-18 block above is closed and belongs in HISTORY.md the moment
cycle 19 opens; reset STATE.md from the template at the same time. When
reflecting, re-derive the nets strictly — the last THREE cycles all found
batch self-reports over-counted (17−0 → 6−2 most recently), so treat the
per-block numbers as real-defect counts, not fired-this-month counts.
