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
Phase: idle — nothing in flight. Cycle 18 is closed and REFLECTED; the
  between-cycles operator work that followed it (PRs #178–#220) is closed and
  reflected too, as `19pre` (net +12; `.cycle/blocks/19pre-a-reflect.md`).
  Cycle 19 opens on the next /broad-scan or /audit — at that point move the
  cycle-18 block to HISTORY.md and reset this file from the template.
  THE ONE OUTSTANDING ACTION IS THE OPERATOR'S DEPLOY: every PR from #176 to
  #220 ships on a single `clasp push -f` + New version. `runAllTests()` after
  it expects **305**; `installAutomationTriggers()` must be re-run once for
  the 18th trigger; `reportMultiBreakDays()` has already been run and came
  back CLEAN (2026-09-01).
Scope: between-cycles operator work (pilot feedback, QA module, timekeeping
  correctness) — no audit-derived cycle is open
Test Command: manual (Node harnesses: `npm test` = pure 752 + DOM 104;
  visual matrix on demand — 94 scenarios, last full shoot 2026-09-01 clean, 67/67
  (the 20 design-handoff additions shot individually, all clean);
  Regression Scenarios run to S99)
Subsystem cycles since last Seams audit: 1
Updated: 2026-09-03 (per-agent break schedules + the break COVERAGE planner — `19pre-per-agent-breaks-broad-implement.md`, `19pre-break-coverage-planner-broad-implement.md`)

## Design handoff — five surfaces (opened 2026-09-02; branch `claude/ums-team-tools-design-r8ar3o`)
The operator's five-surface design bundle (Coaching · Manage · QA · Admin · Time
Clock) is being implemented from `docs/design_handoff_five_surfaces/IMPLEMENTATION_PLAN.md`
(revision 2.1 — every conflict resolved, all 13 operator decisions recorded in
its §3; the detail docs live at `docs/*_HANDOFF.md` + `docs/*.dc.html`). Six PRs
in the plan's §4 order. **PR 1 (cross-cutting sweep) is DONE (`bcba743`;
shoot 67/67 clean)** — block: `.cycle/blocks/19pre-design-pr1-broad-implement.md`.
**PR 2 (Admin) is DONE** — block: `.cycle/blocks/19pre-design-pr2-broad-implement.md`:
six Admin sub-tabs with a findings-first System tab; `cnHealthFindings_` is the ONE
derivation for list + cards + badge (INV-186 amended); storage inventory on
`mtRenderTable_`; X7 on all four loaders; pure 722 / DOM 101; 11/11 bites;
visual matrix 72 (5 new System scenarios incl. `?fixture=empty` all-clear and a
forced-fail error state). **PR 3 (Manage) is DONE (`e50ef8b` + the app-bar
follow-up)** — block: `.cycle/blocks/19pre-design-pr3-broad-implement.md`:
Manage Time grouped Needs-you / Periodic-collapsed with a summary row fed by the
lazy cards; Coverage + Punctuality on `mtDateRange_` (forward vs backward
presets); `getPunctualityReport` gains the 92-day cap, prior-range delta,
`dayDetail` (FIVE states — `nopunch` added beyond the handoff's four, INV-187),
weekly buckets, outliers + Coach-on-this via `COACH_PREFILL`; the shared
`.app-bar` now stacks its control at ≤540px (the one measured defect); pure
727 / DOM 101; 9/9 bites; matrix 78 (6 new scenarios; `coverage` left the
gap marker). Doc conflicts resolved in the codebase's favour: the fifth day
state, and the handoff's Punctuality Export button NOT built (outside M1–M8).
**PR 4 (Coaching) is DONE (`29e6870` + the empty-shape/docs follow-up)** — block:
`.cycle/blocks/19pre-design-pr4-broad-implement.md`: five trailing Coaching
columns; business-day overdue through `coachBizOpts_`; reply on acknowledge;
praise out of open counts + the ack-rate denominator; `setCoachingFollowUp` +
`nudgeCoaching`; critical-only immediate mail + retraction on void;
`sendCoachingRecapDigest` (trigger #19, Friday 8am, heartbeat `coachingRecap`);
the tab rebuilt on the app-bar with a signal board (`coachRepSignal_` — a
FIFTH `nosignal` tier, INFO-toned), filter strip (`umsCoachingFilter`, the
17th localStorage key), a composer DRAWER (shared `.modal.drawer`), rep
recognition feed + callout + reply boxes; note/QA drill hand-offs; pure 734 /
DOM 102; 10/10 bites; matrix 87 (9 coaching scenarios + the `?role=rep` hook).
Doc conflicts resolved in the codebase's favour: praise EXCLUDED from the
denominator (the handoff's wording was ambiguous), five columns not three,
the dead `enterTool('callnotes')` drill replaced by the date-keyed hints, the
two-level crumb `Training › Coaching`, and `nosignal` taking precedence over
steady/clear. `runAllTests()` now expects **307**; `installAutomationTriggers()`
must be re-run once for the 19th trigger.
**PR 5 (QA) is DONE (`bb11d85` + the polish/docs follow-up)** — block:
`.cycle/blocks/19pre-design-pr5-broad-implement.md`: coverage-first queue
(`getQaQueue(period).coverage[]` via the pure `qaCoverageRows_`; month/quarter
periods from `DriveCreatedMs`; `CONFIG.QA_AUDIT_TARGET_PER_PERIOD` = 3 with a
Script Property override; `QaExemptions` tab + manager-gated `qaSetExemption`,
eligibility = two COVERED periods at ≥4.5 and no criterion <4); target-aware
sampler ("Sample the gaps for me (N)"); `DurationSec` + `SkipReason` trailing
columns (self-healing header; write-once duration; Skip asks a reason); the
recordings list as a sortable `mtRenderTable_`; pause-and-pin comments (the
post sends the PIN); two-pane detail; shared transport + score-tone helper on
My Reviews (QA-14 stays gated — decision 13); Coach-on-this-call →
`COACH_PREFILL`; two-level crumbs; `umsQaPeriod` (18th localStorage key);
pure 738 / DOM 103; 12/12 bites; matrix 90 (3 new QA scenarios; the fixture
calls the verbatim `qaCoverageRows_`). Doc conflicts resolved in the
codebase's favour: eligibility tightened to two COVERED periods, the handoff's
Export not built, transport parity shipped despite decision 13, period
arithmetic server-only. `runAllTests()` still expects **307** (gate cases grew
IN PLACE). ONE pre-existing DOM flake noted, not fixed: the resume-request test
fails for the minute after IST midnight (18:30 UTC) — its `'00:01:00'` fixture.
**PR 6 (Time Clock) is DONE — the five-surface handoff is COMPLETE (all six PRs
on `claude/ums-team-tools-design-r8ar3o`).** Block:
`.cycle/blocks/19pre-design-pr6-broad-implement.md`: `getMyPendingTasks` (six
sources — training / coaching / notes / requests / sched / docs — each catching
into `unavailable[]`, cached 120s per rep on CLEAN rounds only, routes pinned
against the TOOLS registry, notes item = previous WORKDAY's answered − notes via
a `CLK_NAV_HINT` hand-off) + the Needs-you block leading `#dash-main`
(skeleton / error card / clean-empty renders nothing / unavailable line;
compact-gated BEFORE any RPC); the clock card's state line on a literal-colour
scrim with hours rendered ONCE; the rail reordered card → actions → strip
(MEASURED 704 → 367px prime-button top at 1440×900); the rotator HELD on an
active shift; break chips absorbing the next-break chip (taken/now/next +
countdown); the world-clock strip, shooting star, greeting pill, next-break
chip and pending-Training card RETIRED under a derived ban pin. Pure 741 / DOM
104; 15/15 bites; matrix 92 (empty + error Needs-you scenarios). Doc conflicts
resolved in the codebase's favour: QA source omitted + Requests = dept requests
+ docs as sixth kind (operator decision 3); hours once on the state line
(decision 4); `.greet-held` chip not built; `clkNextBreak_` kept for the chips.
`runAllTests()` now expects **308**. The one defect found on CAMERA: the
break-chip minute-guard survived a same-minute re-render (fixed + pinned).
Follow-ons: the §3d undo label with countdown is NOT built; the Needs-you
list refreshes on the next Dashboard enter after an action (no per-source
invalidation); the pre-existing IST-midnight DOM flake stands.
**Post-merge (2026-09-02, same afternoon):** the operator flipped the two PH
agents' roster Timezone cells to America/Chicago MID-SHIFT (a PH agent saw
"Clock In" at PHT midnight — the documented split-day state). Landed
`repairTimesheetTimezone` (+ `_dryRun`/`_apply` wrappers reading the one-time
`TZ_REPAIR_2026_09_02`: Anne Garcia, Margie Ingay, Manila → Chicago,
flippedAt '2026-09-02 15:00' — the operator adjusts it) so the Manila-stamped
punches are re-formatted in Chicago; TZR-1/TZR-2 pins. FOLLOW-ON: delete the
constant + wrappers once the operator confirms the repair ran; the August
accrual needs a manual top-up afterwards; any ADP export cut while the rows
were split needs re-exporting.
**Post-deploy `runAllTests()` (2026-09-02 4:35 PM CDT): 303/308.** Fixed the
one real bug (`nudgeCoaching` compared a Kolkata stamp's day to the Chicago
day — `coachStampDayMgr_`, PR4-1 rewritten + bite-checked) and four test-side
faults (setup restores the TEST rows' fixture timezone; `isIncomplete`; the
multi-break refusal case). The operator re-runs after the next push; expect
308/308.
**Browser-timezone scenario dimension (2026-09-02, same evening):** the
operator asked for a "PH CSR view"; the answer is View-as CSR + a DevTools
timezone override for a live look, and for the harness a 7th scenario tuple
entry `{ tz, utc }` (Playwright `timezoneId` + frozen instant) plus the mock's
`?tz=` roster override. `clock-light-wide-pht` (roster Chicago, browser
Manila, 00:05 PHT) shot clean — no client-side browser-clock read surfaced.
VIS-TZ pin; matrix 93.
Next: nothing in flight — the operator's single deploy (`clasp push -f` + New
version, then `runAllTests()` → 308, `installAutomationTriggers()` once) ships
PRs #176–#220 plus the six handoff PRs together. Facts PR 3+ depended on: `mtDateRange_`/`mtPctTone_` now exist in
`script_core.html` (Metrics is the first consumer; Punctuality + Coverage
adopt in PR 3); `?fixture=empty` exists in `mock.js` with an empty
`EMPTY_FIXTURES` map that each block fills (the PR1-4 pin's `OWED` list grows
with it); the `.toolbar-tabs` strip wraps ≤480px, so the six-tab Admin strip
needs no further affordance work in PR 2.

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
CURRENT (2026-09-03). Branch `claude/ums-team-tools-design-r8ar3o`, rebased on
the merged PR #222 main, carries the post-handoff operator work (NOT PR'd —
the operator has not asked): the Timesheet tz repair tool + one-time wrappers
(`TZ_REPAIR_2026_09_02` — delete after the repair), the post-deploy
`runAllTests` triage (coaching nudge frame fix + four test-side faults), the
PHT browser-timezone visual dimension (`clock-light-wide-pht`), and NOW the
per-agent break schedules (`.cycle/blocks/19pre-per-agent-breaks-broad-implement.md`
— pure 745/0, DOM 104/0, 6/6 bites, admin-config re-shot clean).
PR #224 MERGED 2026-09-03 (per-agent breaks + the planner); the operator's
post-merge `runAllTests()` read 308/308. The tz-repair dry run then failed
on a CONFIG-key typo (`EMPLOYEES_TAB` → `EMPLOYEE_TAB`, fixed + the
`F1-inverse` tripwire); the repair was then APPLIED (14 rows, 4 self-colliding
clock-in pairs; 08-27/08-28 have no clock-outs at all — the agents must
confirm) and the one-time constant + wrappers were deleted. The operator then
asked for the Day Edit follow-ups as a FUNCTION: `repairSplitDayPunches(opts)`
(commits 96dfb83 + the TZR-4 tightening) keeps the earliest ClockIn per date,
deletes the rest, re-points the mirror, and writes agent-confirmed `adds`
through the adjust writer — dry-run default, TZR-3/4 pinned, pure 752/0.
NEXT for the operator: dry run it, then apply with `adds` once the agents
confirm their lunch/clock-out times; then the August accrual top-up + ADP
re-export for the affected period.
BUILT the same day: the BREAK COVERAGE PLANNER on that card
(`19pre-break-coverage-planner-broad-implement.md` — pure 749/0, DOM 104/0,
11/11 bites, three admin-config scenarios clean incl. the cold-failure one).
The demand layer reads the CDR Report's `Inbound Calls` export tab (written by
call-data-reporting — confirmed by the operator to exist; its export trigger
must be installed there). The Coverage planner now SUBTRACTS breaks (it
counted a rep on lunch as present). NOTHING is PR'd — the operator has not
asked; the branch carries eleven commits over the merged #222 main.

PREVIOUS (2026-09-01, after the A4 follow-on + Workstream B). Everything is
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

- **PR #216** — the Admin sub-tab mobile coverage (five scenarios + the
  `getAdminSheetView` fixture + VIS-ADMIN) and the stacked tag-table header it
  found.
- **PR #217** — the cycle-19pre REFLECTION (net 12 = 14 fixes − 2 new failure
  modes; 20 capabilities, 15 defensive; block + metrics row + seam counter 0→1).
- **PR #218** — the operator's pre-deploy `runAllTests` reported 302/305 and one
  was a REAL REGRESSION: A4 refused a break with a leave and no return, which is
  an IN-PROGRESS break, so Day Edit was unsavable for any rep on lunch. Fixed at
  both layers; the A4-1 pin (which had encoded the wrong rule) rewritten. The
  other two were test-side — an invented helper and a CALENDAR-dependent accrual
  fixture (documented as a fourth editor-test hazard).
- **PR #219** — note-email line breaks: the `.ce` fields are `pre-wrap` so Enter
  stores a real `\n`, but HTML collapsed it, so a Resolution written as
  paragraphs emailed as one run-on block while the CRM paste was correct.
  `cnNlBr_` runs LAST in `cnFmtEmailHtml_` (the marker regexes are `[^…\n]+`,
  so converting first would make `**a\nb**` start matching).
- **PR #220** — this sync-docs pass.

NEXT: nothing in flight. The operator's deploy is the only outstanding action.
Cycle 19 opens on the next /broad-scan or /audit — at which point the cycle-18
block moves to HISTORY.md and STATE resets from the template.

Standing operator-side: the deploy backlog (PRs #176–#220), `runAllTests()`
expecting **305**, `installAutomationTriggers()` for trigger #18, and the
ALL-CST roster flip on a weekend. **`reportMultiBreakDays()` HAS BEEN RUN
(2026-09-01) and came back CLEAN** — 84 live rows, 46 rep-days, no historical
day changes, so the break-arithmetic change moves no existing timesheet.

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
