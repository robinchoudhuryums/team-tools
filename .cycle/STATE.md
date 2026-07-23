# Cycle State

## Current
Cycle: 10
Phase: implement — broad scan complete (7-agent fan-out + personal verification;
0 Critical / 0 High / 11 Medium / ~35 Low, all 11 Mediums confirmed, 0 retracted).
TOP-5 BATCH IMPLEMENTED on claude/broad-scan-11m0vf: M-1 (recordPunch live
sequence guard via getNextActions_ + findExistingPunch_ last-match +
managerSaveDay duplicate collapse), M-2 (Day Edit picker bounds in the TARGET
rep's tz; liveStatus ships `timezone`), M-3 (cnReRenderActiveView_ re-renders
the pinned tray; tray render edit-snapshot-safe), M-5 (intake store cell caps
pre-send + storeWarning + IntakeStoreFail audit row + client warn toast), M-6
(seq tokens on mLoadMyStats_/mLoadTeamMetrics_/spanishLoad_). Also applied the
/setup-cycle delta (Seams Audit Cadence = every 4 subsystem cycles; infra files
assigned to Server/Test Suite; form-generator frozen entry). Pure 307/0 (5 new
pins, 2 bite-checked), DOM 61/0, node --check ×3 clean; editor suite +2 tests
(recordPunch_liveSequenceGuard, managerSaveDay_collapsesDuplicateRows;
test_recordPunch_basic gained a _clearTestState — the sort test's today-rows
now correctly trip the new guard).
BATCHES A+B ALSO IMPLEMENTED (same branch): A = M-4 (History edit-snapshot
preservation), M-7 (KB convert identity guards — KB_EDIT object-ref +
view/no-open-editor checks), M-8 (Admin Sheets pane loads on the enter path),
composer Preview instance+in-flight guard. B = M-9 (_withTestKb_ via
TEST_KB_SS_ID fixture + createPinnedSpreadsheet_; 3 KB-writing tests wrapped;
cleanupTestData backstops for KB/KbRevisions live+fixture, HR Coaching +
EmpDocTemplates; HR fixture now factory-pinned), M-10 (2 DOM pins:
stacked-dialog topmost Escape — bite-checked on the real guard — and
drawer-Enter exemption), M-11 (5 editor tests: getMyMetricsRange,
appendCallNoteFeedback, getMyNoteHourBuckets, getPatientTimeline,
deptRequest resolve-link idempotency), tripwire hardening (=(?!=)
comparison-read fix in both coercion scans; GmailApp.sendEmail in the mail
inventory; INV-01 finally/releaseLock structural scan — closes the mail-scan
no-finally hole). Pure 307/0, DOM 63/0, editor suite +7 tests total this
cycle. NOTE for operator: the first post-deploy runAllTests creates a
TEST_KB_Fixture spreadsheet (Script Property TEST_KB_SS_ID) in the deployer's
Drive — expected, one-time.
BATCHES C+D ALSO IMPLEMENTED (same branch): C = C1 reconcile Timestamp
recovery via cnTimestampString_ (INV-142 now strictly true; the scan's
reconcile whole-line exemption REMOVED), C2 exportAdpRange validation, C4
witness-audit reliability (writeAuditLog_ returns outcome; writeWitnessAuditLog_
retry + WITNESS_AUDIT_FAILS property; surfaced in computeAutomationHealth_
+ failure digest (48h recent window) + Admin panel), C5 cleared-{} tax/
suggestion configs stay empty, C6 clientErrorsSummary_ skips malformed ts
rows, C7 deletePunch backward-only window, C8 getTeammateStatus auth before
flag, C9 kbGetRelated column-bound, C10 CDR >95KB cache-put skip, C11
punchTrend roster filter, C12 export-failure email carries the created
sheet URL. C3 RETRACTED (calcHours_ overnight wrap is deliberately pinned
by test_calcHours_overnight — the audit's "unsupported" premise was wrong);
C13 hash delimiters DEFERRED (needs a dual-verify back-compat design on the
attestation paths). D = D1 PTO-reject keeps the day modal open, D2a
dashboard/extras failures keep last-good + never stamp fresh, D2b stranded
"Working…" restore + warn toast on failed post-punch refresh, D3 MGR_STATUS
unknown-enum fallback, D4 adjust-modal min via mgrAddDaysIso_, D5
Coverage/Punctuality default-range day-rollover (defaultDay marker; user
ranges stick), D6 hover-timer document.contains guard, D7 esc() drift
(spark labels, myDate, analytics bars, covDayRisks_), D8 umsLastView
compact-guard, D9 dispTime full escape, D10 beacon Object.create(null),
D11 What's-new star in BOTH sidebar + mobile header, D12 tour Escape
stopImmediatePropagation, D13 MOTION_IO unobserve on nav. Pure 309/0
(2 new grouped pin tests), DOM 63/0.
BATCHES E+F ALSO IMPLEMENTED (same branch) — THE ENTIRE CYCLE-10 BACKLOG IS
NOW DONE. E = E1 umsCallNotesLastDept revived (seeds inside the subformData
branch when the note has no departments), E2 send-success merge whitelisted
to the 9 sanitizeEmailSelections_ keys, E3 ?prefill one-shot consumption,
E4 external tab-strip re-render on note-link (CN-8 ext-draft asymmetry
KEPT-BY-DECISION, doc'd in INV-84), E5 pin-at-capacity client no-op, E6
duplicate mgrSearchField removed, E7 retention-panel error line, E8
storage-pill double-escape, E9 dead Team-Notes loader removed, E10 PPD
agents-hop view guard, E11 KB landing loaders fail-loud (loadFailed →
distinct failure lines for Most-used/Review-due/Content-requests), E12
quiz-analytics failure degrades to panel-level (not whole-view), E13 quiz
submit updates checklist state before the modal-identity guard, E14 PPD
seed label 46 + stale tooltip comment, E15 drawer-search toast open-guard.
F = /sync-docs (Spanish endpoints out of the manager-only list + 4 Code.js
docstrings; What's-new comments match the no-auto-open decision; INV-07/84/
111/113/122/128/142 amendments; the M-1 state-machine gotcha incl. the C3
overnight-wrap decision note; testing gotcha + _withTestKb_; TEST_KB_SS_ID +
WITNESS_AUDIT_FAILS operator entries; Test Command cycle-10 paragraph;
punchTrend 8-bars; NEW INV-155–158), PROJECT_HEALTH.md rolled forward
(cycles 8+9 rows + cycle-10 standing), STATE.md literal NUL bytes replaced
with the six-char backslash-u0000 escape TEXT (greps as text again — and
NOTE: this checkpoint's own first edit reintroduced one by emitting the
escape as a literal; if you write about NULs, write the WORD, never the
sequence). Pure 309/0, DOM 63/0.
BATCHES G+I ALSO IMPLEMENTED (same branch) — the a11y/visual follow-on from
the 2026-07-23 accessibility + visual audits. G (a11y quick wins) = G1 the 7
CN .ce note fields + tag input dropped positive tabindex 1–8 (now tabindex=0 /
natural order; Enter-nav via CN_FIELD_NAV_ORDER is JS-driven and unaffected),
G2 role=textbox + aria-label per .ce field (aria-multiline on Issue/
Resolution), G3 global :focus-visible ring (styles.html, --ring-focus;
#view-area exempted; form_public carries its own copy — it doesn't include
styles.html), G4 role=dialog + aria-modal on ensureOverlay AND uiConfirm/
uiPrompt (aria-labelledby via _uiDialogSeq title ids), G5 role=alert on
error toasts / renderError / form_public #form-error, G6 aria-hidden on the
3 metrics chart-SVG builders + role=status on renderLoading, G7 label
associations (training-q for=, tag-input + intake custom-email aria-label,
form_public sig-date for=), G8 #view-area is now <main tabindex=-1> + a
.skip-link in renderShell (class selectors unchanged; DOM harness green —
boot.js skeleton only carries #app, renderShell builds the rest). I (visual
defects) = I1 flag-training stripe var(--accent)→var(--info) + the
.cn-act-btn.training.is-on bg →var(--info-soft) (training no longer renders
the same green as review), I2 hardcoded-hex fixes (.cn-act-btn.is-on
#fef3cd/#856404 → warn-soft/warning-deep — dark mode now correct; sf-oop
#e67e22 → var(--intake-pmd); .intk-prev #fff KEPT + documented as deliberate
— it hosts rendered EMAIL HTML with inline light-palette hex, a dark canvas
would be unreadable), I3 --muted-2 darkened to AA on every surface both
modes (light #737c8c→#5f6878 ≥5.0:1; dark #6c7587→#7b8496 ≥4.58:1;
--muted-3 documented decoration-only + 11 text-usage sites swapped to
--muted-2 across cn/styles/intake/kb/manager; 4 genuine decoration uses
kept), I4 refreshViewIfCurrent passes the tool's sidebarIcon to
renderLoading (Role-A parity — mutation refreshes no longer leak the legacy
spinner) + 6 modal spinners (cn ×3, train ×2, empdocs ×1) converted to
Role-D lo-dots with role=status. Two NEW run.js tripwires, both
bite-checked: the --muted-2 AA contrast pin (parses the token file, computes
WCAG ratios vs paper/paper-2/paper-card in both modes — failed on the old
dark value) and the CN flag-stripe exact-token pin (action=--warn,
training=--info, review=--good; name-distinctness alone could NOT catch the
regression since --accent aliases the --good green — first bite-check
exposed this, pin tightened to deepStrictEqual). Pure 311/0, DOM 63/0,
node --check ×3. Remaining: operator deploy, /reflect (cycle-10 metrics.csv
+ estimates.csv rows); Batches H/J/K/L await user direction.
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 3
Updated: 2026-07-23 (cycle-10 top-5 batch)

## Cycle 10 — remaining backlog (facts, not judgments — findings re-verified in-session 2026-07-23)
- Mediums not yet implemented: M-4 (History edit-snapshot gap), M-7 (KB convert
  identity guard), M-8 (Admin Sheets blank on re-enter), M-9 (KB tests mutate
  live store — _withTestKb_), M-10 (stacked-dialog + drawer-Enter DOM pins),
  M-11 (5 zero-coverage endpoints).
- Notable Lows: reconcile tz recovery (INV-142 claim false), exportAdpRange
  validation, calcHours_ inverted-pair wrap, writeAuditLog_ witness swallow,
  hash delimiters, tax-rates empty-map, Spanish docstrings, CN preview
  instance guard, dead umsCallNotesLastDept, MGR_STATUS fallback, PTO-reject
  modal close, dashboard error-as-empty caching, shell Lows (umsLastView
  pop-out, dispTime, beacon proto-key, tour Esc), intake/KB client Lows.
- Doc contradictions for /sync-docs: INV-111 (store failure now loud), S7/Day
  Edit duplicate-collapse note, INV-142 reconcile claim, Spanish manager-only
  list vs INV-31 amendment, What's-new stale comments, DOM-harness h.t/opts.markup
  doc drift, umsCallNotesLastDept entry.

## Where I left off (cycle 10)
Entire scan backlog + a11y/visual Batches G+I done + pushed. Next: user
decides on Batches H (a11y structural: calendar cells→buttons, focus
capture/restore, onclick spans→buttons+aria-sort, color-only glyphs, h1
hierarchy), J (visual elevation — taste items need user direction), K (shell
health dot / mirror registry / lock breadth / editor-suite CI), L (sheet
doctor + C13 hash delimiters), and the typed-signature e-sign legal call.
Then operator deploy (clasp push -f + New version + runAllTests — suite +7
this cycle; first run creates TEST_KB_Fixture), then /reflect.

## Cycle 9 — batches 5-7 (2026-07-21, same branch)
Batch 5 (bounded reads / growth-class debt):
- L-3 getAdpSS_ + adpSheetTz_ memoized per execution (the normalize helpers
  called openById + getSpreadsheetTimeZone PER COERCED CELL in whole-sheet
  loops; 4 tz call sites rerouted). NOTE the first sed also hit the new
  helper itself (infinite recursion) — caught and fixed before any test run;
  watch for self-referential replaces when adding memo helpers.
- L-22 getReferenceItem → id-column scan + one-row fetch (the hottest KB
  path pulled every article's BodyMd per open).
- L-21 TRAIN_COMPLETE_MAX_SCAN=10000 / TRAIN_ATTEMPT_MAX_SCAN=4000 tails.
  COMPLETIONS ARE STATE (INV-120: complete = newest row after assignment) so
  their cap is a deliberately-generous decades-out backstop, NOT an
  analytics window — a completion older than the newest 10k rows would read
  Pending again (documented in-code). Attempts are display-only → 4k.
- L-9 getMySentForms tail-bounded (FT_SENT_MAX_SCAN=2000 newest rows; the
  full-width read incl. PHI PrefillData blobs scanned every token ever).
- L-16 intakeListMySubmissions metadata-only projection (two column-bounded
  reads skip AnswersJSON/Recommendations/Selections entirely).
- L-13 getMyMetricsRange endpoint result cache (metrics_range_v1:<id>:<from>:<to>,
  CDR_CACHE_TTL; error results never cached; bypassed under
  _TEST_OVERRIDE_CDR_SS_ID — the exact L-1 pattern).
- L-1 buildTimesheetForEmployee_ validates shape + caps span at 370 days
  (the day-loop could spin ~2.9M iterations on a garbage range); guards BOTH
  getTimesheetData and getEmployeeTimesheetForManager at the shared builder.
- L-14 transfer per-day ACCUMULATES on a (rep,date) collision with
  recomputed pct; the single-row path keeps the sheet's stored pct
  BYTE-IDENTICAL (the editor fixture pins 29.79 — an unconditional recompute
  would round to 29.8 and fail it; caught before commit).
Batch 6 (server hygiene):
- L-5 FS.SUBMITTED_AT (viewer + verify) + markDeptRequestResolved_'s
  already-branch cells → formTokenIsoString_ (coercion-safe on the
  segregated/coercing FORMS_SS_ID — the viewer WAS rendering Date blobs).
- L-7 _meta.openedAt sliced to 64 chars (the one INV-96 cap gap).
- L-8 getPatientTimeline returns partial+failedSources (both {error} returns
  and throws counted); the timeline modal renders a warn banner naming the
  missing streams (failed ≠ no-data on a patient surface).
- L-11 getEnrolledCallNotesReps uses the TRIMMED enrollment predicate
  (parity with getCallNotesEnrollment/provision no-clobber).
- L-12 getStateTaxRates_/getUpdateSuggestions_ sanitize-on-read
  (whitelist-rebuilt entries; scalar/array blobs degrade to CONFIG).
- L-15 clientErrorsSummary_ cutoff formatted in CONFIG.TIMEZONE (the stamped
  tz), not manager tz.
Batch 7 (test pins):
- L-35: PUNCH_MORPH destination pin (LunchIn.to='doorExit' — the F7
  half-step regression re-armed), spanishSearchQuery_ {to: cc:} brace-OR
  behavioral pin, clkShootMaybe_ gating source pin (density/motion/photo/
  midpoint), greeting-rotator stopClock-teardown pin.
- Strategic #2 payload-contract tripwire: client-submitted subformData keys
  (payload.subformData.X assignments + subformData:{...} literals, ternary
  form included, cn + intake) must each be a rawSub.<key> read in
  sanitizeCallNotePayload_ — the M-3 drift class retired. Bite-checked.
- showView('…') literal net (arming floor ≥3; 4 live literals) — completes
  the enterTool/refreshViewIfCurrent registry-key family.

## Pending / not yet done
- /sync-docs owed (batches 3-7 combined): INV-151 (+checkTrigger), the
  "Fire-and-forget email" gotcha + M-7 pattern/tripwire/allowlist, INV-127
  (+email filter), INV-05/108 (manager future-time), INV-83 (drawer Enter),
  8c note (L-30); batches 5-7: INV-129 (+result cache), INV-116 (projection
  read), INV-46-family (new bounded reads: getReferenceItem, getMySentForms,
  training tails incl. the completions-backstop tradeoff, timesheet range
  cap), Test Command section (+payload-contract + showView + L-35 pins),
  L-3 memo note near the normalize-helpers decision.
- OPERATOR (deploy): one `cd web-app && clasp push -f` + New version. NO new
  Script Properties / triggers / migrations. Editor runAllTests (suite
  unchanged in 5-7; the transfer fixture + sent-viewer tests exercise the
  L-14/L-16 edits and were verified shape-compatible by inspection).
- Then /reflect to close cycle 9 (metrics.csv + estimates.csv rows).
- Roadmap-tier (not findings): archived-month visibility; KB undelete.

## Decisions made (batches 5-7)
- L-21: completions cap = 10,000 (state-bearing → generous backstop;
  attempts 4,000 analytics window). If team scale ever 10×es, revisit.
- L-14: single-row path preserves the sheet's stored pct byte-identically;
  only genuine collisions recompute (fixture-pin compatibility).
- L-12: out-of-range hand-edited rates (>1) are now DROPPED by
  sanitize-on-read (the save endpoint always enforced 0–1; a dropped key
  means that state has no tax rate until re-saved).
- L-1: cap = 370 days at the SHARED builder (one guard covers both
  endpoints; client requests are month/pay-period sized).

## Cycle 9 — batches 3-4 (2026-07-21, same branch)
Batch 3 (concurrency + automation edges):
- M-7 | Code.js + run.js | NO mail inside the global ScriptLock: 9 sites
  converted to a `notifyAfter` closure invoked in the finally AFTER
  releaseLock (updateTimeOffStatus, managerSubmitTimeOff, submitCallNote,
  saveTrainingAssignment — the '*' roster-loop headline — acknowledgeDoc,
  issueDoc, releaseDoc, createCoaching, acknowledgeCoaching). NEW two-level
  tripwire: inventory functions touching MailApp., then flag any locked
  try-region referencing one outside a notifyAfter closure; ALLOWLIST =
  emailFromCallNote ONLY (INV-42 send-then-stamp is one locked unit).
  Bite-checked (re-inlining one notify fails CI).
- L-18 | Code.js + run.js | managerBriefSuppressionActive_({checkTrigger:true})
  at the FOUR digest call sites additionally requires a live
  sendManagerDailyBrief trigger (visible in trigger context — the runner is
  the installer); the PANEL briefConfig detector stays ARGLESS (a viewing
  manager isn't the installer — getProjectTriggers would false-alarm). Fail
  direction on any check miss: NOT suppressed (doubled email beats silent
  outage). Closes the manual-brief-run ~26h suppression window the detector
  couldn't see. Suppression tripwire extended (checkTrigger at all 4 sites +
  argless detector). Bite-checked.
- L-19 | Code.js | stampDigestLastRun_ RMW under tryLock(3000) fail-open
  (the kbAiTryReserveSpend_ pattern) — concurrent 8am digests could drop
  each other's heartbeat stamp.
- L-6 | Code.js | getFormByToken's mark-expired now RE-LOCATES the row by
  token under tryLock(2000) — the pre-lock rowIndex could go stale against
  the 3am purge's descending deleteRows (wrong token marked expired /
  submitted status clobbered). tryLock: never block the public visitor.
- L-4 | Code.js | managerSaveDay + managerSaveDayRange reject same-day
  FUTURE times (recordPunch/adjust-queue parity, target-emp tz; HH:mm vs
  HH:mm:ss lexicographic compare is correct). Edge documented: a
  pre-existing future punch now blocks even its no-op re-save (deliberate).
- L-2 | Code.js | getCoveragePlan skips roster rows with no email (sibling
  parity) — name-only offboarded/placeholder rows counted as full shifts.
Batch 4 (client UX / silent-degradation Lows):
- L-23 intake "Open Call Notes" closes the modal first (intakeOpenCallNotes_);
- L-25 drawer search failure toasts (tab-twin parity); L-26 metrics renderers
  null-guard before .error (stranded loader); L-27 win-back subject replaces
  the AUTO-pattern subject too (was dead code — the auto subject is never
  empty; custom subjects untouched); L-28 failure handlers on the 3 bare RPCs
  (pinned-tray toast, ambient badge console-only, audit rep-filter toast);
  L-29 Esc with the KB drawer open closes the drawer WITHOUT clearing the
  note (drawer-open check before cnClearActiveForm_); L-30 PTO submit from a
  pinned day popover resets dayPopoverPinned (hover-open no longer dies);
  L-31 _covSeq/_punctSeq same-view range-race tokens (INV-146 class);
  L-32 uiConfirm Enter from inside #kb-drawer no longer confirms a danger
  dialog; L-33 mgr-timeoff-overlay backdrop-click close (sibling parity).

## Pending / not yet done
- Cycle-9 backlog remaining: Batch 5 bounded reads (L-1, L-3, L-9, L-13,
  L-14, L-16, L-21, L-22); Batch 6 server hygiene (L-5, L-7, L-8, L-11,
  L-12, L-15); Batch 7 test pins (L-35, payload-contract tripwire,
  showView-literal extension). Roadmap-tier: archived-month visibility;
  KB undelete endpoint.
- /sync-docs owed for batches 3-4: INV-151 (+checkTrigger digest-site
  semantics + the doubled-email tradeoff), the "Fire-and-forget email"
  gotcha + Test Command section (+M-7 post-lock notifyAfter pattern +
  no-mail-in-lock tripwire + allowlist), INV-127 (+email-required roster
  filter), INV-05/108 note (manager same-day future-time guards), INV-83
  (L-32 drawer Enter exemption), 8c hover-popover note (L-30).
- OPERATOR (deploy): one `cd web-app && clasp push -f` + New version. NO new
  Script Properties / triggers / migrations (L-18 reads existing triggers).
  Editor runSmokeTests/runAllTests (suite unchanged from batch 2's 268-ish
  count; no new editor tests in batches 3-4).
- Then /reflect to close cycle 9.

## Decisions made (batches 3-4)
- M-7 allowlist: emailFromCallNote is the ONLY sanctioned in-lock sender
  (INV-42 send-then-stamp atomicity). New in-lock mail = move it to a
  notifyAfter closure or allowlist WITH a reason (tripwire enforces).
- L-18 fail direction: any trigger-check miss/error → NOT suppressed. A
  manual digest run by a non-installer now double-emails for that run
  (deliberate fail-safe; counted as the batch's 1 new failure mode).
- L-4 edge: a pre-existing same-day FUTURE punch blocks its own no-op
  re-save in Day Edit (forces cleanup; rare — only pre-fix corruption).

## Cycle 9 — batch 2: M-2, M-5, M-8, M-9, M-10, M-11, L-17, L-20, L-34, L-36 (2026-07-21, same branch)
- M-2 | Code.js | managerSubmitTimeOff: thrown balance write now DELETES the
  just-appended Approved row before rethrowing (retry starts clean; the old
  strand blocked retry via the dup-guard and made Deny→re-Approve credit a
  deduction that never happened). fixPtoReconciliation: restructured to
  PER-BUCKET neutralize→credit units, each with a compensating revert-to-
  'Approved' on a thrown credit — a failed bucket re-detects/re-credits on
  re-run; a committed bucket can't double-credit (rows no longer 'Approved');
  partial commit writes a best-effort audit row before the rethrow. Happy-path
  behavior/return shape byte-compatible (annual then sick, same keys).
- M-5 | cn/script_callnotes.html | external composer resolves a preset
  History/pinned note via cnFindNoteAnywhere_ and pins it atop the note-ref
  dropdown — the linkage (externalEmails[] stamp / manager recipient lookup)
  no longer silently drops to "None (standalone email)".
- M-8 | Code.js + train/script_empdocs.html + Tests.js | fields-only empdoc
  completions now write an append-only DocSignatures row with an EMPTY
  signature cell + a completion hash (empDocSignatureHash_ with '' sig; cert
  kind:'completion'); EmpDocCompleted audit row carries hash=. verifyDocSignature
  detects the empty-sig row → {completed:true, signed:false, match, tampered};
  legacy pre-ship completions (no row) still report unsigned/legacy, never
  tampered. Client verify toast distinguishes completion vs signature. NEW
  editor test test_empdocs_fieldsOnlyCompletionHash (clean verify + ResponsesJson
  rewrite → tampered).
- M-9 | test/client/run.js | the refreshViewIfCurrent tripwire's [^}]* →
  [^{}]* (the tour test's corrected form) + leaf-key asserts
  (clock/timeoff/callNotes/manage must parse) so the regression class itself
  is pinned. Bite-checked.
- M-10 | run.js + dom/boot.js | metrics/script_deptrequests.html +
  train/script_coaching.html added to the parse-guard list (now the named
  PARSE_GUARD_PARTIALS const), the DOM PARTIALS (index.html include order),
  and the M3 scan list. NEW auto-derive tripwire: every index.html-include()d
  partial with a <script> block must be in PARSE_GUARD_PARTIALS. Bite-checked.
- M-11 | run.js + Tests.js | coachCanManagerSee_ Node unit test (stubbed
  lookupEmployeeById_; creator/column-M/unrelated/blank-narrows/non-manager/
  no-roster — all six INV-134 rules) — bite-checked against a weakened helper.
  NEW editor test test_coaching_createAckVoidFlowAndScoping (create→owner-sees→
  cross-rep denied→live-item scoping→ack+idempotent→void→hidden→VoidReason in
  the HR column) + _cleanupCoachingRows_ helper.
- L-17 | Code.js | getTrainingDashboard itemTitle_ drops DRAFT KB items
  (parity with getMyTraining/overdue digest per L-9 — managers no longer nag
  reps about items they can't open).
- L-20 | Code.js | kbDeleteItem snapshots the FINAL row content to KbRevisions
  (action 'delete', best-effort) before deleteRow — a mistaken admin delete is
  recoverable by manual copy; an undelete endpoint stays a follow-on.
- L-34 | .github/workflows/client-tests.yml | node --check web-app/DevTools.js.
- L-36 | Tests.js | CN fixture pins LOCALE alongside tz (createPinnedSpreadsheet_
  parity; a coercing deployer locale made the fixture exercise the ISO-T
  coercion paths unlike a production per-rep sheet).

## Pending / not yet done
- Cycle-9 backlog remaining (ranked batches 3-7 in the session transcript):
  Batch 3 concurrency/automation edges (M-7 email-loop-in-lock + no-MailApp
  tripwire, L-18 brief suppression window, L-19 heartbeat RMW lock, L-6
  getFormByToken unlocked status write, L-4 manager future-time guard, L-2
  coverage emailless-row filter); Batch 4 client UX Lows (L-23, L-25..L-33);
  Batch 5 bounded reads (L-1, L-3, L-9, L-13, L-14, L-16, L-21, L-22);
  Batch 6 server hygiene (L-5, L-7, L-8, L-11, L-12, L-15); Batch 7 test pins
  (L-35, payload-contract tripwire, showView-literal extension). Roadmap-tier:
  archived-month visibility.
- /sync-docs owed: coverage-strip gotcha → SWR (batch 1); INV-143 +intakeType
  (batch 1); INV-135 — fields-only completions now hashed (M-8 amends "the
  responses are attested" to hold for BOTH paths; legacy completions report
  null); Test Command section (+enterTool tripwire, +PARSE_GUARD auto-derive,
  +coachCanManagerSee_ pins, M-9 regex note, DevTools in CI); the "parse-guards
  every JS-bearing partial" claim is now TRUE again (M-10).
- OPERATOR (deploy): one `cd web-app && clasp push -f` + New version. NO new
  Script Properties / triggers / migrations. Editor runSmokeTests/runAllTests —
  suite grew by 2 (test_empdocs_fieldsOnlyCompletionHash,
  test_coaching_createAckVoidFlowAndScoping); test_managerSaveDay_noChangesIsNoOp
  changed (live-seconds fixture) and test_fixPtoReconciliation_creditsAndIdempotent
  exercises the restructured per-bucket path (behavior-compatible).
- Then /reflect when the operator calls the cycle done.

## Decisions made (batch 2 — so the next session doesn't re-litigate)
- M-2 fixPtoReconciliation: PER-BUCKET compensated units (annual then sick),
  NOT all-rows-then-credit — a partial failure must neither double-credit on
  re-run (bucket committed = rows off 'Approved') nor go invisible (bucket
  failed = rows reverted to 'Approved'). A partial commit writes its audit row
  best-effort before the rethrow.
- M-8: the completion artifact REUSES empDocSignatureHash_ with an empty
  signature segment (no new hash function; recompute stays byte-stable via the
  stored responsesRaw cell). An empty SIGNATURE cell in DocSignatures is the
  completion-row marker — do not "fix" that to a placeholder string.
- M-8 back-compat: legacy fields-only completions (no sig row) intentionally
  report {signed:false} with NO completed key — same as pre-fix; never tampered.
- M-11 Node stub mirrors the production contract (lookupEmployeeById_
  lowercases managerEmail at read) — keep the stub lowercase if the roster
  reader ever changes.

## Cycle 9 — scan + fix batch H-1, M-1, M-3, M-4, M-6 (2026-07-21, claude/broad-scan-5eoypm)
Scan-time scores: Overall 8 · Correctness 8 · Security 9 · Data Integrity 8 ·
Timezone 8.5 · Concurrency 8 · Test Coverage 7.5 · Clarity 8.5 · GAS 8.5 ·
MgrUX 7.5 · EmpUX 8 · Automation 8. Full findings list in the session
transcript (Top-5: M-1, H-1, M-3, M-6, M-4 — all five now fixed).

## Completed this cycle
- H-1 | cn/script_callnotes.html + test/client/run.js | "Coach on this" called enterTool('training',…) but the tool key is 'develop' — enterTool returns silently on an unknown key, so the INV-134 deep-link was a dead no-op since the Manage reorg. Fixed to enterTool('develop','coaching'). NEW comment-stripped tripwire: every enterTool('…') literal in all 14 JS partials must be a registered TOOL key (depth-walked registry extraction — immune to the M-9 [^}]* nested-brace flaw; ${…} interpolations exempt). Bite-checked.
- M-1 | Code.js + Tests.js | managerSaveDay no-op guard compared full HH:mm:ss vs the client's HH:mm+':00' — live punches store REAL seconds, so EVERY Day Edit save rewrote every untouched live punch (seconds truncated, COMMENTS → ADJ-{type}, spurious PunchEdit audit row; S7 violation). Now compares HH:mm prefix (the UI can only express HH:mm). test_managerSaveDay_noChangesIsNoOp's ClockIn fixture is now a LIVE punch at 09:00:27 — a regression to full-string compare fails changes=0 + the PunchEdit count.
- M-3 | Code.js + intake/script_intake.html + test/client/run.js | intake auto-log note lost its intakeType chip + intake-* tag (the cycle-7 M-15 whitelist stripped subformData.intakeType; tags nested in subformData were never read). Client now sends tags TOP-LEVEL + subformData:{intakeType}; sanitizeCallNotePayload_ whitelists intakeType as a bounded ppd|pmd|pap enum (case-normalized, off-enum drops). New Node case; bite-checked.
- M-4 | cn/script_callnotes.html + test/client/dom/runDom.js | a STRUCTURED {success:false} from submitCallNote (the catch-→-structured house pattern, so ANY server error) on a Save & Compose flow hit the success handler's error branch, which lacked the failure handler's teardown — composeFlow wedged every later submit ("Still saving…") + the envelope overlay stuck. Now clears composeFlow + cnCloseComposerLoadingIfPending_ before the revert (teardown parity). New DOM test; bite-checked.
- M-6 | tc/script_clock.html | the Clock "N% logged · File N missing" strip was frozen ALL DAY (date-keyed CLK_COVERAGE_CACHE early-return; the documented nav-away-and-back refresh path didn't exist). Now SWR matching CLK_NOTEVOL_CACHE: paint cache instantly, ALWAYS background-refetch (getMyMetrics is server-cached 5 min per L-1, so quota-cheap; same call cadence as the notevol sibling), keep last-good on error, blank only on a cold miss.

## Pending / not yet done
- Cycle-9 backlog NOT selected this batch: M-2 (managerSubmitTimeOff/fixPtoReconciliation missing compensating revert), M-5 (external composer drops note linkage for History/pinned notes), M-7 (all-hands training-assign email loop inside the ScriptLock), M-8 (fields-only empdoc completion has no integrity hash), M-9 (the refreshViewIfCurrent tripwire's [^}]* regex extracts tool keys — false-permissive; the H-1 tripwire uses the safe depth-walk, but M-9's own regex is still wrong), M-10 (metrics/script_deptrequests.html + train/script_coaching.html outside the parse-guard/DOM/M3 lists), M-11 (coachCanManagerSee_ zero tests at any layer), + ~36 Lows (headliners: L-17 training dashboard counts drafted items, L-18 manual-brief-run suppression window, L-20 kbDeleteItem no revision snapshot, L-22 getReferenceItem full-tab read, unbounded-read family L-9/L-16/L-21, L-26 metrics null-guard, L-29 Esc drawer/form-clear collision, L-34 DevTools.js not node --check'd). Full list in the session transcript.
- /sync-docs owed (see Decisions below).
- OPERATOR (deploy): one `cd web-app && clasp push -f` + Apps Script editor → New version. NO new Script Properties / triggers / migrations. Editor runSmokeTests/runAllTests — the modified test_managerSaveDay_noChangesIsNoOp (live-seconds fixture) is the one changed editor test.
- Then /reflect when the operator calls the batch done (cycle-9 metrics.csv row).

## Decisions made (so the next session doesn't re-litigate)
- M-1: no-op compare is HH:mm-prefix — the Day Edit UI (input type=time) can only express HH:mm, and the server validation regex rejects seconds, so no caller loses the ability to set seconds (recordPunch remains the only seconds-writer).
- M-3: intakeType joins the INV-143 whitelist as a BOUNDED enum (ppd|pmd|pap only) — the whitelist stays closed; tags ride TOP-LEVEL p.tags (the only tags path sanitize reads). INV-143 doc needs the +intakeType amendment.
- M-6: chose SWR-always-refetch over submitCallNote-side invalidation — matches the CLK_NOTEVOL_CACHE sibling byte-for-byte in cost profile (same render sites, focus-refresh throttled 20s, server result cached 5 min). The CLAUDE.md coverage-strip gotcha ("won't refresh until nav away/back or day rollover… invalidate from submitCallNote if ever needed") must be rewritten to describe SWR.
- H-1 tripwire: TOOL keys are extracted by a brace-DEPTH WALK of the TOOLS literal, comments stripped first, ${…} interpolations exempt — do NOT "simplify" it to a regex char class (the M-9 bug class).

## Where I left off
Cycle-9 batch H-1+M-1+M-3+M-4+M-6 implemented + tested (pure 291/0, DOM 61/0,
node --check green, 3 bite-checks). Next: commit+push the branch, then
/sync-docs (coverage-strip gotcha → SWR; INV-143 +intakeType; INV-134 deep-link
note; Test Command section + the new enterTool tripwire), then the remaining
cycle-9 backlog on request, then /reflect.

## ── Cycle 8 record (superseded header) ──
Cycle 8 phase log: ALL FOUR batches done on claude/broad-scan-0y5q6b: batch 1 (H-1+M-1..M-6), batches 2-3 (M-7..M-12 + 16 Lows), batches 4-5 (M-13..M-15 test-integrity + NUL escapes + harness hardening + 14 UX-polish Lows). Pure 277/0, DOM 59/0. Reflected 2026-07-10 (metrics.csv row). Extra broad-scan F1-F9 implemented on claude/broad-scan-0zvxiu (2026-07-15).

## Extra broad-scan + F1-F5 implement (2026-07-15, claude/broad-scan-0zvxiu)
Fresh 6-agent broad-scan (fan-out + personal verification of every Medium+):
0 Critical / 0 High / 1 Medium / 8 Low — a very clean result. Scan-time scores:
Overall 8.5 · Correctness 8.5 · Security 9 · Data 8.5 · Timezone 8.5 · Concurrency 9 ·
Test 8 · Clarity 9 · GAS 9 · MgrUX 8 · EmpUX 8 · Automation 8.5.
Operator ran /broad-implement F1-F5 (F2 dropped — operator clarified K0841's
Offerings pdfLink/imageUrl == K0861's, so no mismatch in practice).
IMPLEMENTED (pure 277/0, DOM 59/0, node --check green):
- F1 (Medium) Code.js cnReadCallNoteAuditRows_:~3930 — dateLocal read RAW off the
  coerced PunchDate (col 5) → compliance-panel "View note" deep-link handed
  garbage to managerGetCallNotes (^\d{4}-\d{2}-\d{2}$ reject → silent dead link).
  Now normalizeDate_(data[i][5]) (matches getManagerDashboard:~1098). + Tests.js
  test_auditPanel_searchAndHistory now asserts hit.dateLocal shape (the missing
  guard that let it through).
- F3 (Low) Code.js — form-token ABSENT ExpiresAt now fails CLOSED at all 3 gates
  (getFormByToken/submitFormByToken/getMySentForms): `!expX.present ||` added.
  Blank cell was fail-OPEN (perpetual anonymous PHI submit); createFormToken
  writes ExpiresAt atomically, so blank = only corruption/migration.
- F4 (Low) tc/script_timeoff.html PTO tile — projected "Nd after DATE" was
  `annual - plannedDays` but `annual` already reflects APPROVED deductions
  (INV-03/25), double-counting them. New pendingPlannedDays (pending-only) drives
  the projection; the "Nd planned" tally still shows pending+approved.
- F5 (Low) metrics/script_metrics.html spanishRender_ — esc(String()) around
  d.resolved/pending/total (invariant consistency; integers today).
Findings NOT implemented (deliberate, out of F1-F5 scope): F6 form_public.html
esc() no-quote-escape (latent, literals only), F7 kbMd_ emphasis-over-link-markup
(cosmetic), F8 showView no tabVisibleForUser_ re-check (defense-in-depth), F9
dual manager-source desync (documented-intentional).
DOC UPDATES OWED (/sync-docs): the "AuditLog OTHER coerced columns" gotcha claims
cnReadCallNoteAuditRows_ routes col 5 through a normalize helper — it now does
(normalizeDate_); INV-92 note; F3 fail-closed note near INV-96/113/114.
OPERATOR (deploy): one `cd web-app && clasp push -f` + New version (ships Code.js
+ both partials + Tests.js). No new Script Properties/triggers/migrations.
Optional editor runAllTests to exercise the new dateLocal assertion (India fixture).

## Batch 1 follow-up: F6/F7 + F3 test (2026-07-15, same branch)
Operator ran /broad-implement "Batch 1 + F6/F7". Implemented (pure 278/0, DOM 59/0):
- F6 (Low) form_public.html esc() now escapes " and ' (was textContent→innerHTML,
  quote-blind) — the public PHI form uses it in value="..." attribute contexts.
  All 6 call sites are HTML contexts; neutral for text, closes the attribute
  breakout. (Latent — literals only today.)
- F7 (Low) kbMd_ inline(): emphasis/inline-code ran AFTER link/image generation,
  so a URL with ** or a backtick got <strong>/<code> injected INSIDE href/src
  (broken link). Factored emph() out, applied to link TEXT at generation, stashed
  the generated <a>/<img> markup past the outer emphasis pass via a NUL-delimited
  sentinel (\u0000L<idx>\u0000, the existing \u0000C fence pattern). Link-text
  emphasis preserved. + F7 Node regression test (run.js, 277→278). NOTE: my first
  edit accidentally wrote LITERAL NUL bytes (reintroducing the batch-4 binary-file
  issue); converted all literal 0x00 → the \u0000 escape via a Node script — file
  greps as text again. WATCH FOR THIS if editing kb/script_kb.html sentinels.
- F3 integration test (Tests.js): test_publicForm_blankExpiryFailsClosed —
  creates a token, blanks ExpiresAt, asserts getFormByToken + submitFormByToken
  both fail closed + no submission row persists. Registered in the runner.
  (Pins last session's F3 code fix; editor-only.)
DOC UPDATES OWED (/sync-docs, additive to the F1/F3 notes above): kbMd_ inline()
now stashes link/image markup past the emphasis pass; form_public.html esc()
escapes quotes. [DONE — the F1/F3/F4/F7 + INV-92 CLAUDE.md notes were synced in
commit 72298cc; the F6 esc-quotes note + the F8/F9 notes below remain owed.]

## Batch 2: F8 + F9 detector (2026-07-15, same branch)
Operator ran /broad-implement Batch 2; via AskUserQuestion chose the F9 DRIFT
DETECTOR (not "unify" — unsafe, the split is intentional) and SKIP the separate
setup wizard (Deploy Readiness already covers it). Implemented (pure 281/0, DOM 59/0):
- F8 (Low, defense-in-depth) script_core.html showView(): added a
  tabVisibleForUser_ guard at the low-level dispatch — a DIRECT showView() for a
  gated tab (drill-through / ?tool deep-link / umsLastView / tab-bar) now routes
  back through enterTool (bumps to a visible tab). No recursion (enterTool
  re-enters with a visible tab). empState is set at boot BEFORE the first
  enterTool, so no wrong redirect. Server still re-gates (UI-only hardening).
- F9 (Low → monitoring) Code.js: NEW pure managerSourceDrift_(propEmails,
  rosterPairs) — returns emails in MANAGER_EMAILS whose roster row is marked
  NOT-a-manager (off-boarded/demoted yet still trigger-privileged via
  assertManagerCaller_). FALSE-POSITIVE-FREE: an email with no roster row (a
  legit non-roster deployer) is never flagged. Wired as a 7th
  automationDetectorChecks_ check 'managerSource' (config-coherence, the
  briefConfig pattern) → auto-surfaces in the Admin Automation Health panel +
  the sendAutomationHealthDigest failure email (both esc/esc_ the detail). NO
  gate logic changed (the intentional dual-source split stays); NO new trigger
  (rides the existing 9am digest). 3 Node tests + the detector-keys tripwire
  updated (+managerSource). test_automationDetectorLiveness auto-covers it (7
  checks, all alive in a drift-free env).
DOC UPDATES OWED (/sync-docs): the "Detector liveness (Turn C)" description (6→7
check keys, +managerSource F9); the F5 dual-manager-source gotcha / INV-44 note
that the drift is now surfaced by a detector; F6 esc-quotes note.
[DONE — synced in commit ca3f25f (detector 6→7, F8 showView guard, F6 esc-quotes).]

## Batch 3: AuditLog typed reader — kill the coercion class (2026-07-15, same branch)
Operator ran /broad-implement Batch 3 (the L-effort structural item). Scoped it
to the ROOT CAUSE F1 exposed rather than a full-codebase rewrite: the AuditLog was
the one core sheet with NO named column enum, so its coerced cells were read by
bare index (auditData[i][5]) — untrippable, which is why F1's raw PunchDate read
slipped every per-function tripwire. Behavior-preserving throughout (pure 285/0
(+4), DOM 59/0, node --check clean):
- NEW `AUDIT` enum {TS,EMP_ID,EMP_NAME,ACTOR,ACTION,PUNCH_DATE,PUNCH_TIME,
  IS_ADJUSTMENT,DAYS_BACK,NOTES} (the writeAuditLog_/getOrCreateAuditSheet_ order).
- NEW typed reader `auditRowObj_(row)` — the SINGLE coercion-recovery point:
  recovers TS (normalizeAuditTs_), PUNCH_DATE (normalizeDate_), PUNCH_TIME
  (normalizeTime_), IS_ADJUSTMENT (case-insensitive ===' TRUE') once; callers add
  display/derived fields (timestampMgr, dateLocal alias, noteId parse).
- Retrofitted ALL 4 AuditLog readers to AUDIT.*: the 2 COERCED-col readers
  (getManagerDashboard recentAudits, cnReadCallNoteAuditRows_) now build via
  auditRowObj_; the 2 non-coerced readers (computeAutomationHealth_,
  adminSheetView) use AUDIT.* (TS/ACTION/EMP_*/NOTES). ZERO bare-index audit reads
  remain (ClientErrors ~4114 + KbViews ~14411 are DIFFERENT sheets, left as-is).
- The old getManagerDashboard M-3/M-4 tripwire was REPLACED (the guarantee moved
  into auditRowObj_): 3 source tripwires (auditRowObj_ uses each normalize helper;
  both object-readers route through it; a GLOBAL scan — the INV-142 pattern — fails
  CI on any raw read of a coerced AUDIT column outside auditRowObj_ = the
  F1-catching net) + 2 runtime tests (coerced-Date PunchDate + native-boolean
  IsAdjustment recovery, stubbed deps).
- Field-by-field verified behavior-identical (same normalize helpers, same output
  shapes) — the editor test_auditPanel_searchAndHistory dateLocal assertion + S10
  still hold. SHEET SCHEMA UNCHANGED (enum just names existing columns).
DOC UPDATES OWED (/sync-docs): the "AuditLog OTHER coerced columns" gotcha — all
AuditLog reads now route through the AUDIT enum + auditRowObj_ typed reader (pinned
by the Batch-3 global tripwire, the F1-catching net); consider a new INV for the
typed-reader boundary + the Test Command tripwire-family list.
NOTE: Batch 3 is a PREVENTION/structural change (net 0 — no live bug fixed; F1 was
fixed in Batch 1) — it kills the recurrence mechanism for the AuditLog.

## Batches 4-5 completed (2026-07-10)
Test-integrity (batch 4): M-13 behavioral editor test for
archiveSheetRowsOlderThan_ (temp TEST_ tabs; append-order back-fill,
headerRows:2, width padding, strict-< cutoff, idempotence, append→flush→delete
pin); M-14 _skipTest() mid-body SKIP mechanism — 11 sites converted from
_assertTrue(true,'…skipped') and the S1.1 ADP-tz test now FAILS (not passes)
on an unreachable sheet; M-15 tripwire generalization (SUBMITTED_AT any-index
scan incl. Tests.js, global [CN.TIMESTAMP] whitelist scan + hour-buckets added
to the enumerated INV-142 list, TIME_OFF_TYPES⊆LEAVE_DEDUCTION_CLIENT reverse
check — types without a client entry must resolve to the server default,
'Other' passes); 9 literal NUL bytes escaped to \u0000 in Code.js +
script_kb.html (both files grep as TEXT again); harness hardening
(extractFunction/extractRawFunction paren-anchored — the getQuiz prefix
collision; DOM flushTimers rethrows the first error instead of swallowing).
UX polish (batch 5): midnight self-undo works end-to-end (server elapsed-ms
check accepts yesterday-within-5-min; client -1 sentinel no longer reads
eligible); Log-enter ambient double-poll removed (cache-paint + staleness-
gated start; the poll-driven stack refresh skips when the stack is <15s fresh
— focus/nav refreshes stay unconditional per the DOM pins); stats-mini snaps
instead of re-counting from 0 every minute; refresh preserves in-flight-toggle
note objects (INV-56 guard survives); inline-edit typing survives unrelated
cnRenderStack_ re-renders (snapshot/restore); hover day-popover exempted from
the focus trap (pinned popovers still trap); stacked ui-dialogs: topmost-only
key handling + stopImmediatePropagation; Coverage/Punctuality presets use
UTC-noon mgrAddDaysIso_ (DST-safe); Q39a joined the PPD progress ring/stepper
(stepper Node tests updated); coachAck_ in-flight guard + button disable;
intakeYnKey_ arrow-nav on the ynnum/ynreveal inner radiogroups; esc()/Number()
on p.direction, monthName, covPct, Team-Metrics heroLabel; renderPtoMini_ +
its CSS cluster removed (orphan); coverage note no longer says "Per-tz (v1)";
?prefill applies AFTER the draft restore (deep-link intent wins).

## Pending / not yet done
- /sync-docs for batches 4-5: INV-23 (midnight-wrap self-undo now real),
  INV-83 (topmost-only dialog keys), INV-142 (global scan + 5th reader),
  Test Command section (new tripwire families + _skipTest + paren-anchored
  extraction), 8c hover-popover trap exemption, ambient stats cache note,
  editor-suite expectation (SKIP rows now appear where fixtures are missing).
- OPERATOR (deploy): clasp push -f + New version; RE-RUN
  installAutomationTriggers() once (archive trigger 1am→6pm CT from batch 3);
  editor runSmokeTests/runAllTests — EXPECT some SKIP statuses where fixtures
  are unprovisioned (previously masked as PASS) + the new
  archiveSheetRowsOlderThan_behavioral test.
- Then /reflect to close cycle 8 (metrics.csv + estimates.csv rows).
- Cycle-8 findings NOT implemented (deliberately deferred): TO/PAR archive
  tier (years-horizon), punctuality full-Timesheet read (bounded by the
  archive once enabled), Spanish `to:`-operator caveat now covered, Q31a body
  diagram + follow-up-date-on-action-flags (roadmap features, not findings).

## Where I left off
Batches 4-5 implemented + tested (pure 277/0, DOM 59/0, node --check green);
next: commit+push, then /sync-docs, then /reflect when the operator says done.

## Batches 2-3 completed (2026-07-10)
Client races/dead features: M-7 greet-rotator hover freeze (bind-at-start +
reset, clkGreetRotBind_); M-8 History range race (current-selection guard in
cnLoadDateRange_); M-9 DR resolve view guard; M-10 History honors
CN_STATE.filter + clearable .cn-hist-filterpill (quick-chips now work); M-12
compact pop-out gates clkLoadDashboard_/Extras_/greet rotator on COMPACT_MODE;
exact-tab switch re-fires search (S28 restored); ambient polling starts on ANY
CN tab via showView (idempotent start); audit-search seq token; KB related
L-18 guard; KB tab search failure toast.
Server correctness/PHI/automation: M-11 managerBriefSuppressionActive_ (flag
AND fresh managerBrief heartbeat; fail-safe) + 6th detector check
'briefConfig' + tripwires updated; resolve-token CTA per-recipient split
(internal-only) via resolveEmailRecipients_ internalTo/externalTo; contractor
pending-card PTO projection gated on per-row ptoEnabled; updateTimeOffStatus
compensating status-revert on balance-throw (retry self-healing, no
double-deduct); decimal weight parseFloat (+ engine Node case); hour-buckets
via cnTimestampString_ (INV-142); intakeTsString_/dob recover in the Intake
sheet's OWN tz; 2000-char caps on the 4 post-submit subformData writers;
Spanish exact-address guard (spanishAddrListIncludes_, Node-pinned) + {to: cc:}
search coverage; getWhatsNew id-column scan + row fetch; managerGetCallNotes
bounded via readCallNoteRowsInRange_; verifyDocSignature blank-hash fallback
mirror (no false tamper); quiz dead-KB-link nulled when draft/missing;
Timesheet archive trigger 1am→6pm CT (offshore quiet window); coverage
startsPrevDay flag + "(from prev. day)" client marker.

## Pending / not yet done
- Batch 4 (test-integrity): M-13 archiveSheetRowsOlderThan_ behavioral test;
  M-14 PASS→SKIP (13 sites incl. the S1.1 tz test); M-15 tripwire
  generalization (SUBMITTED_AT any-index scan, global CN.TIMESTAMP scan,
  TIME_OFF_TYPES ⊆ LEAVE_DEDUCTION_CLIENT); NUL→\u0000 escapes; harness
  hardening (getQuiz prefix collision, DOM flushTimers swallow).
- Batch 5 (UX polish Lows): midnight self-undo, Log-enter RPC dedupe +
  countUp-once, refresh in-flight-note preservation, inline-edit wipe, hover
  popover focus-trap exemption, stacked ui-dialogs, DST preset math, Q39a
  progress ring, coach ack guard, ynnum/ynreveal keyboard, esc() nits,
  renderPtoMini_ orphan, coverage "Per-tz (v1)" copy string, prefill-vs-draft
  order.
- /sync-docs pass for batches 2-3 (see Decisions below), then /reflect when
  the operator calls the cycle done.
- OPERATOR (deploy): clasp push -f + New version; RE-RUN
  installAutomationTriggers() once (archiveOldTimesheetRows moved 1am→6pm CT);
  editor runSmokeTests/runAllTests.

## Decisions made (so the next session doesn't re-litigate)
- M-11: suppression = flag AND managerBrief heartbeat <26h (fail-safe: a
  doubled manager email beats a silent outage); heartbeat stamps even while
  the flag is off, so trigger-installed+flag-flip suppresses immediately.
  Detector 'briefConfig' (6th key) surfaces flag-on-without-trigger.
- CTA split: internal copy sends FIRST (an external-copy failure duplicates a
  dept email on retry, never the customer's).
- updateTimeOffStatus: kept status-first ordering + compensating revert in the
  catch (balance-first was rejected — it double-deducts when the status write
  fails after a successful deduction).
- Timesheet archive hour: 6pm CT = the all-team quiet window (CST ended;
  IST/PHT not started).
- Doc updates owed: INV-151 (liveness-gated suppression), INV-142
  (hour-buckets now via cnTimestampString_), INV-153 + trigger list (6pm),
  INV-31 (Spanish exact-match + Cc), Turn-C detector count (6 keys), the
  ambient-polling gotcha (now genuinely any-CN-tab), quick-chips (now filter).

## Where I left off
Batches 2-3 implemented + tested (pure 275/0, DOM 59/0, node --check green);
next: commit+push, /sync-docs for the batch 2-3 doc list, then batch 4 and/or
batch 5 on request.

## Cycle 8 — scan + first fix batch (2026-07-10, claude/broad-scan-0y5q6b)
Scan: 7-agent fan-out + personal verification of the High + all 15 Mediums
(all confirmed, none retracted). ~47 findings: 0 Critical / 1 High / 15 Medium
(+2 Stage-2 Lows) / ~30 Low. Scan-time scores: Overall 8 · Correctness 7.5 ·
Security 8.5 · Data Integrity 8 · Timezone 8 · Concurrency 8 · Test Coverage 8 ·
Clarity 8.5 · AS Practices 8.5 · Mgr UX 7.5 · Emp UX 7.5 · Automation 7.5.
The full findings list lives in the session transcript; the UNIMPLEMENTED
backlog (M-7..M-15 + ~30 Lows) is re-derivable from the Top-5 + Medium tables.

## Completed this cycle
- H-1 | script_core.html | enterTimeoffView/enterManagerView default `area` — the load-error Retry buttons (argless onclick) threw and the retry path was dead
- M-1 | Code.js + Tests.js | runDailyExportCheck exports the morning AFTER the period completes (1st-of-month / biweekly end === yesterday); removed isLastBusinessDayOfMonth_ + its smoke test (old gate fired mid-final-day at 12pm IST and silently omitted afternoon punches)
- M-2 | tc/script_manager.html | Day Edit rejects "To" ≤ edit date instead of silently downgrading to the destructive single-day reconcile; To-picker min tracks the From date (+ deNextDay_ helper)
- M-3 | cn/script_callnotes.html | e.repeat guard on both save chords + a composeFlow re-entry guard in cnSubmitActiveForm_ — a held/double Ctrl/⌘+Shift+Enter wrote N duplicate note rows (keepForm kept the form populated)
- M-4 | cn/script_callnotes.html | external composer mirrors INV-145: close refused while the send RPC is in flight + the success handler only closes its own composer instance (mid-send Esc→reopen destroyed the new draft / duplicated the customer email)
- M-5 | Code.js + test/client/run.js | drSplitDepts_/drSlaForToDept_ — multi-dept sends ("Billing, Shipping" joined ToDept) now reach each component dept's Incoming inbox, member-resolve, SLA (strictest/min), and deptStats (bucketed per component). 2 new Node pins (273 total)
- M-6 | Code.js | voidCoaching writes the free-text reason to a NEW trailing Coaching VoidReason column (header self-heals; COACH_HEADERS 13→14, CO.VOID_REASON:13) — the shared AuditLog row is now content-free (coachId only), mirroring voidDoc (INV-134/INV-32)

## Pending / not yet done
- Cycle-8 backlog NOT selected this batch: M-7 (greet-rotator stale hover freeze), M-8 (History range race), M-9 (DeptRequests resolve view guard), M-10 (quick-chip History filter no-op), M-11 (managerDailyBrief flag-on-without-trigger silence), M-12 (compact pop-out hidden-UI RPCs), M-13 (archiveSheetRowsOlderThan_ behavioral test), M-14 (PASS-instead-of-SKIP masking, incl. the S1.1 tz test), M-15 (tripwire generalization: SUBMITTED_AT any-index scan, global CN.TIMESTAMP scan, TIME_OFF_TYPES ⊆ LEAVE_DEDUCTION_CLIENT), + ~30 Lows (incl. NUL→\u0000 escapes, resolve-token-to-external edge, contractor PTO projection, decimal weight parse, hour-buckets tz recovery).
- OPERATOR (deploy): one `clasp push -f` + New version; run runSmokeTests/runAllTests in the editor (expect the suite minus the removed isLastBusinessDayOfMonth smoke test = 266 registered).

## Decisions made (so the next session doesn't re-litigate)
- M-1: exports now arrive the MORNING AFTER the period ends (deliberate ~1-day-later delivery in exchange for completeness; monthly gate = 1st of month, not last business day).
- M-5: multi-dept SLA = the STRICTEST (minimum hours) component SLA; deptStats counts a multi-dept request under EACH component dept; 'Other' is dropped by the split (legacy 'Other'-only rows fall back to the raw label).
- M-6: void reason lives ONLY in the HR store (VoidReason column, 500-char cap); it is NOT surfaced in the coaching dashboard yet (investigators read the sheet) — surfacing it is a possible follow-on.
- M-3: while a Save & Compose flow is active, ALL form submits are refused (the form content belongs to the flow) — not just keepForm ones.

## Where I left off
Cycle-8 batch H-1+M-1..M-6 implemented + tested (pure 273/0, DOM 59/0, node --check green); next: commit+push this branch, then /sync-docs (INV-134/138/145 + operator-checklist export-timing updates), then either implement the remaining Mediums or /reflect to close the batch.

## Night-sky phases + Dashboard skeletons (2026-07-10, claude/broad-scan-45plfi)
Operator picked options (a) night sub-phases + (b) twinkling/shooting stars +
(d) real moon phases for the IST-overnight-shift sky, and skeleton shapes to
replace the loSweep bar on the Dashboard. Client-only (`tc/script_clock.html`),
zero server/operator state:
- clkSkyFor_ night split: Dusk 17-20 / Nightfall 20-23 / Midnight 23-2 /
  Late night 2-4 / Pre-dawn 4-5, each a distinct gradient + a `stars`
  density 0-3. The existing 10-min sky poll + .sky-layer cross-fade (§10)
  animates the transitions unchanged.
- clkSkyDecor_ renders a deterministic star field (index-hashed positions,
  counts [0,9,16,26] by density; _clkLastStarDensity rebuild guard) + a moon
  disc INSIDE .clk-sky-layers — so the .has-bg photo mode auto-hides all of
  it. Moon phase from the pure clkMoonPhase_ (synodic 29.530588853d from the
  2000-01-06 18:14 UTC new moon; octant → CLK_MOON_SHADE translateX shadow;
  phase name in title/aria-label). Node-pinned (Full/quarters/wrap/neg-mod).
- clkShootMaybe_ piggybacks the 1Hz startClock tick: an occasional .clk-shoot
  streak, only when density≥2 AND rep-local time is past mid-shift
  (clkSchedStartMin_ + lengthMin/2), ~2.5-4.5 min cadence; skipped under
  prefers-reduced-motion and .has-bg. Twinkle keyframes are neutralized by
  the global reduced-motion block.
- Dashboard loaders: initial #dash-cards + the three extras-card loading
  branches now render card-shaped .skel skeletons (clkDashSkeleton_/
  clkDashSkelCard_/clkDashSkelKpis_) instead of loSweep; orphaned
  .dash-cards-loading CSS removed. A Node tripwire pins ZERO loSweep( in
  tc/script_clock.html + the skeleton wiring, so the bar can't quietly return.
- Pure 271/0, DOM 59/0. CLAUDE.md: Loader Role C note + §10 night-sky decor
  paragraph. No editor-suite change (client-only).
- OPERATOR: rides the same pending clasp push -f + New version as #128-#130.

## Testing-feedback round 2 (2026-07-09, claude/broad-scan-45plfi)
Five items from continued live testing; three implemented, two answered with
options (night-shift sky phases; loSweep loader alternatives — operator picks):
- Spanish Inbox manual mark-resolved: resolveSpanishThread (canSeeSpanishInbox_
  gate, ThreadBody-style scope guard, locked, idempotent; uiConfirm client
  button on pending cards; "marked manually" label on Resolved cards).
  PHI-free SpanishManualResolved tab on the ADP sheet (threadId/resolver/ms —
  ms as NUMBER cell, no coercion); readers consult spanishManualResolvedMap_
  (bounded 1000 tail); pending drops immediately, stats within 5-min TTL
  (INV-43 posture). INV-31 amendment now five Spanish endpoints; gate test +
  source tripwire added.
- What's-new → Dashboard greeting carousel: the greet bar's status line now
  rotates upward-carousel style (status ↔ update slides from the article's
  list items via pure whatsNewItems_, Node-pinned; 8s cadence, hover-hold,
  startClock/stopClock lifecycle, clkRegSlide animation reuse, NEW pill gated
  by whatsNewShouldShow_). The panel NO LONGER auto-opens — slides/sidebar
  star open it; dismissal still stamps umsWhatsNew. INV-152 updated.
- Clock background image fix: the upload always worked — the Dashboard
  redesign made hero == clock tile whose OPAQUE sky sat on top of the photo
  layer (invisible photo → "doesn't work"). Now .has-bg hides the sky layers
  + makes the tile transparent, so the photo (baked scrim) IS the clock card.
  CSS-only; umsClockBg gotcha rewritten.
- Pure 268/0, DOM 59/0; editor suite: resolveSpanishThread added to the
  Spanish gate case (five endpoints).

## Intake PPD operator-feedback batch (2026-07-09, claude/broad-scan-45plfi)
Live-testing feedback after the #126/#127 deploy. Two PRs:
- UI polish (PR #128, merged): choice groups → separated pill buttons (the
  joined segmented box wrapped awkwardly on Q2-Q6; CSS-only, .intk-reveal-opts
  too); Q40 → NEW `ynnum` control kind (Yes/No + number-only field + 'hours';
  value ''/'No'/'Yes'/'Yes: 12 hours'; pure intakeYnNumSerialize_/Parse_
  Node-pinned; legacy free-text → unselected); Q25/Q31a/Q34 display-only
  option `tone` (warn/danger/no selected-state colors, No = dark ink chip —
  values byte-unchanged, tone map Node-pinned); help-glyph tooltip → tokened
  CSS bubble (data-tip + .intk-help::after, dark-mode-safe, keyboard focus).
- Q39a dwelling + mobile-home engine rule (OPERATOR-APPROVED via
  AskUserQuestion: build it; ≥285 → standard logic; home constraint WINS over
  clinical gates): new ENGINE-READ choice Q39a (House/Apartment/Mobile Home,
  canonical-EN; numbered 39a so Q40-45 keys/stored answers never shift).
  Engine: patient.dwelling/livesInMobileHome in intakeDeriveClinicalFactors_;
  intakeFilterRecommendations_ short-circuits Mobile Home + 0<weight<285 →
  K0821 ONLY (bypasses seat/group gates, fixed-vocabulary justification;
  no K0821 catalog row → empty result); blank weight → standard logic
  (documented). Explainability += Dwelling + Mobile-home restriction rows.
  Tests: Node engine-contract + rename-guard + explainability (266/0 pure),
  editor test_intake_engine_mobileHomeRestriction (smoke). INV-112 + the
  PPD gotcha updated (engine-critical list += '39a').
- OPERATOR: one clasp push -f + New version; runSmokeTests() picks up the new
  engine smoke test. VERIFY the live Offerings sheet has a K0821 row with
  real pdfLink/imageUrl (col E/F) — the restriction returns empty when absent.

## Feature #7 — Timesheet cold-archive (2026-07-09, claude/broad-scan-45plfi)
The last unbounded store: the Timesheet tab grew forever while
getManagerDashboard / exports / calendars read it whole. Applied the CN cold-
tier model to the payroll tab (INV-153):
- archiveSheetRowsOlderThan_ parameterized with opts {headerRows, width};
  DEFAULTS (1, CN_HEADERS.length) keep the CN call sites byte-identical
  (Node-pinned: archiveOldCallNotes still calls 4-arg).
- archiveOldTimesheetRows (15th trigger, manager-tz 1am, INV-44 gate, INV-01
  locked): MOVES rows older than the window to a TimesheetArchive tab in the
  SAME ADP spreadsheet (created by copying the live tab's TWO-row header);
  scans every row (Timesheet is APPEND order); append-then-delete + flush
  (worst case duplicate, never lose). NO purge tier — payroll keep-forever.
- Window: Script Property TIMESHEET_ARCHIVE_DAYS → CONFIG (default 0 =
  disabled); values in (0,120) clamp UP to TIMESHEET_ARCHIVE_MIN_DAYS so a
  typo can't strip active-window payroll rows; garbage/negative → disabled.
- Audit row 'TimesheetArchive' on every enabled run (in
  AUTOMATION_AUDIT_ACTIONS + client CN_HEALTH_RUN_LABELS — coupling-registry
  enforced; adminAuditRowTone_ already tints /Archive/ as info).
- Tests: pure 258→261 (move-only/floor/CN-defaults; gate-type tripwire
  auto-covered the handler), DOM 59/0 unchanged; editor
  +test_triggerGate_timesheetArchive_nonManagerThrows +
  test_timesheetArchive_windowFloorAndDefault → suite 264.
- Docs: INV-153; INV-44 14→15; trigger list 14→15; operator entry
  (recommend TIMESHEET_ARCHIVE_DAYS=365); storage-map ADP row now lists
  TimesheetArchive + ClientErrors tabs.
- KNOWN TRADEOFF (documented): archived rows leave in-app month navigation
  (calendar/timesheet views read the live tab only); they stay in
  TimesheetArchive for payroll audit. Floor guarantees adjust/export/trend
  windows stay live.
- OPERATOR: clasp push -f + New version; re-run installAutomationTriggers()
  once (15th trigger — harmless while window=0); runAllTests() (expect
  264/0); set TIMESHEET_ARCHIVE_DAYS=365 when ready to enable.

## Feature batch #1/#2/#4 (2026-07-09, claude/broad-scan-45plfi)
Operator-selected from the post-cycle suggestions list ("/broad-implement #1, #2, and #4"):
- #1 Client error beacon (INV-150): window.onerror + unhandledrejection hooks in
  script_core.html post {message, stack, view, source} — CLOSED payload shape,
  PHI-safe by construction (never field values) — to recordClientError
  (rep-gated, locked, server-bounded CLIENT_ERR_MSG_MAX/STACK_MAX, 20/hr/rep
  CacheService rate cap) → append-only ClientErrors tab in the ADP SS
  (getOrCreateClientErrorsSheet_). Client dedupes + caps 5/session; surfaced in
  Automation Health via clientErrorsSummary_ (bounded 2000-row tail, 7d window)
  + a "Client errors" panel section. Deliberately NOT in the failure digest.
- #2 Consolidated manager daily brief (INV-151): sendManagerDailyBrief (14th
  trigger, manager-tz 8am, INV-44 gate) behind the managerDailyBrief flag —
  the registry's FIRST pure-'server'-scope flag, default OFF (behavioral
  no-op). Per-manager branded email (docs+coaching team-scoped per
  INV-122/134) from the SAME factored computations the standalone digests use
  (NEW computeMissedClockOuts_ + deptRequestsOverdueOpen_ factorings; reuses
  managerAggregateUrgent_/trainOverdueForRoster_/empDocsOverdueAll_/
  coachUnackedAll_). While ON, exactly 4 handlers suppress their MANAGER
  sends (missed-punch summary, urgent, training-overdue manager loop,
  dept-SLA) — employee sends untouched; weekly digests + the failure watchdog
  NEVER consult the flag (the watchdog reports a dead brief — circularity
  avoided). Heartbeat 'managerBrief' stamps BEFORE the flag check.
  Pure managerBriefSections_ drives sections/subject/silence.
- #4 What's-new panel (INV-152): getWhatsNew (rep-gated, read-only, {none:true}
  on every quiet-failure path) serves the PUBLISHED KB article named by Script
  Property WHATSNEW_KB_ID (drafts hidden from EVERYONE — broadcast surface);
  stamp = kbCellTs_(UPDATED_AT). Client auto-opens once per stamp change
  (umsWhatsNew seen-stamp — 15th localStorage key; ensureOverlay + kbMd_;
  every dismissal path stamps via the onClose hook), defers to a pending tour,
  never in compact; sidebar star button reopens.
- Tests: pure 248→257 (errBeaconPayload_, managerBriefSections_,
  whatsNewShouldShow_, suppression-set/flag-registry/wiring tripwires; the
  existing TARGETS/gate-type/DIGEST_LABELS tripwires auto-covered the new
  trigger), DOM 55→59 (beacon dedupe+cap, What's-new render + Esc-stamps-seen).
  Editor: +test_triggerGate_managerDailyBrief_nonManagerThrows,
  +test_recordClientError_authBoundsAndAppend (self-cleaning),
  +test_whatsNew_propertyGateAndDraftHidden → suite 262.
- Docs: INV-150/151/152; INV-44 13→14 handlers; localStorage gotcha 14→15
  keys; trigger list 13→14; operator entries (managerDailyBrief flip +
  re-install triggers once, ClientErrors tab, WHATSNEW_KB_ID).
- OPERATOR: one clasp push -f + New version; re-run installAutomationTriggers()
  once (wires the 14th trigger — harmless while the flag is off); runAllTests()
  (expect 262/0). Optional: flip managerDailyBrief in Admin → Feature Toggles;
  create a "What's new" KB article + set WHATSNEW_KB_ID to enable the panel.

## Cycle 7 broad-scan + Turn 1+2 (2026-07-09, claude/broad-scan-45plfi)
Audit: 6-agent fan-out + personal verification of every Medium+ finding (all
confirmed, zero retractions). Scores: Overall 8, Correctness 7.5 (was 8.5),
Sec 8.5, Data 8.5, Tz 8, Conc 8.5, Test 8, Docs 8.5, GAS 9, MgrUX 8, EmpUX 7.5,
Automation 7.5. Full findings list + 8-turn sequencing live in the session
transcript AND are summarized per-turn below (Pending).
Turn 1+2 IMPLEMENTED (commit 3f083a1):
- H-1 coaching overdue dead (space-form CreatedAt vs T-only parseTimestampMs_)
  → both consumers now use coachParseTs_; +source tripwire.
- H-2 generateExportSheet_ pins new-sheet tz to the ADP sheet's (raw coerced
  Date cells; script tz = America/Chicago); +source tripwire. NOTE: interacts
  with the still-pending operator ADP-sheet-tz decision — safe either way now.
- M-1 submitPunch failure handler prime→btn (silent punch failures fixed).
- L-1 voidCoaching finally-release (INV-01).
- M-2 intake draft: root-guard in the debounced save + intakeFlushDraftNow_
  flush wired into showView (typeof-guarded, try/catch'd). DOM tests bite-checked.
- M-5 search stale-guard trimmed-to-trimmed (rep + mgr).
- L-15 untouched acct Yes/No toggle serializes '' not 'FALSE' (send-safe:
  server renders any non-'TRUE' as unchecked box — verified).
- L-22 nav-hint prefill now runs AFTER sticky-draft restore.
- L-26 form-catalog fetch failure no longer cached as [] ("no forms") — null.
Tests: pure 233/0 (+3), DOM 52/0 (+4); node --check clean. Net +5/−0.

## PPD redesign Phase 4 (2026-07-01, claude/broad-scan-2ll5ok)
Display-only polish; ENGINE UNTOUCHED, SERVER UNTOUCHED (none of Q32/Q33a/Q37/Q45
are engine-read; email renders new values via the else branch as escaped text).
- Q32 spasticity tooltip: INTAKE_PPD_HELP map → hover-help `info` glyph on the
  label (native title + aria-label, esc'd).
- Q33a conditional-hide: INTAKE_PPD_REVEAL {'33a':{whenQ:'33',whenVal:'Yes'}} +
  intakePpdApplyReveals_ (hooked in intakePpdAfterChange_ + after draft restore);
  hidden rows are cleared so no stale value rides the payload.
- Q45 ynreveal: NEW control kind (Yes/No reveals a sub-multi-select of arthritis
  types Rheumatoid/Osteoarthritis/Psoriatic). Value ''/No/Yes/'Yes: A, B'. Pure
  intakeYnRevealSerialize_/Parse_ (legacy free-text → unselected, raw text stays
  in the stored row; Sent viewer displays stored text verbatim, no re-parse).
- Q37 height parse: numunit parse:'height' → intakeNumUnitParseHeight_ on blur →
  pure intakeParseHeightInches_ (5'1"→61; plain number untouched).
- DEFERRED: optional Q31a body diagram (operator "cool but not essential" — a big
  SVG-interaction feature disproportionate to a polish phase; Q31a multi already
  captures side/limb structured data).
- Tests: +3 pure (ynreveal serialize/parse, height parse, Phase-4 config wiring).
  Pure 230/0, DOM 48/0, Code.js/Tests.js parse OK (intake partial covered by the
  run.js vm parse-guard). CLAUDE.md gotcha + INV-112 updated.

## PPD redesign Phase 3 (2026-07-01, claude/broad-scan-2ll5ok)
Curated `condition` multi-select pickers for the four condition-list questions.
OPERATOR-CONFIRMED via AskUserQuestion: do ALL of Q29/Q41/Q42/Q43 (Q29 = PVD
sub-conditions e.g. claudication/lymphedema — the operator's own examples), ship
seeded lists flagged for clinical review. NOTE: the original spec said "Q29/Q42/
Q43" but Q29 is really "peripheral vascular disease" and the qualifying-conditions
Q is actually Q41 — surfaced this + the operator chose to picker-ize Q29 too.
- New `condition` control (replaced the Phase-1 plain-text stub): filter box +
  option buttons (from INTAKE_CONDITION_LISTS[list]) + selected-chip row + "Add
  <typed>" off-list escape. Value = comma-joined selected strings in data-val
  (round-trips like `multi`). Handlers: intakeCondToggle_/Filter_/FilterKey_/
  AddCustom_/RemoveChip_/Render_; get/set: intakeConditionGet_/Set_; pure
  intakeCondToggleValue_. intakePpdGetVal_/SetVal_ + hasInputId updated.
- INTAKE_CONDITION_LISTS: vascular/qualifying/cardiopulmonary/neuro (seeded,
  comma-free, English values). INTAKE_PPD_CONTROL += Q29/41/42/43 condition;
  removed '29':'yn' from INTAKE_PPD_TYPE.
- ENGINE UNTOUCHED. Q29/41/42 not engine-read; Q43 read ONLY as truthy-vs-exclude
  (hasValidNeuroDiagnosis) → any non-empty value valid, empty = no Dx. SERVER
  needed NO edit (Q29/41/42/43 render via the else branch as escaped comma text).
- Tests: +4 pure (intakeCondToggleValue_; Q29/41/42/43 are condition + lists
  resolve; every neuro value → valid neuro Dx + none collide with exclude list;
  all list values comma-free). Pure 227/0, DOM 48/0, node --check clean.
- CLAUDE.md: updated the "Intake PPD controls engine-safe" gotcha + INV-112 for
  the Phase-3 condition pickers + drift guard. Q43 free-text framing removed.
- SEEDED LISTS ARE FLAGGED FOR CLINICAL SIGN-OFF (pure editable content constant,
  zero engine risk to refine). LOCALIZED condition labels = follow-on.

## PPD intake redesign (Phases 0–2 merged 2026-07-01, claude/broad-scan-2ll5ok)
UI/UX upgrade of the PPD form's question response formats WITHOUT touching the
fragile recommendation engine (intakeFilterRecommendations_/intakeDeriveClinicalFactors_).
KEY de-risk: engine-critical questions (Q25/Q31a/Q34/Q43/Q38) CAN become structured
controls IF option VALUES emit exactly the English substrings the engine matches
(canonical-English-value rule — also fixes a latent bilingual bug where Spanish
free-text never matched). All controls serialize to/from a STRING so drafts /
intakeCollectPpd_ / engine / email builder work unchanged.
- #113 Phase 0 (merged): engine-contract lock — 6 tests feeding the new structured
  values through the live engine, engine untouched.
- #114 Phase 1 (merged): string-valued control framework (INERT) — INTAKE_PPD_CONTROL
  registry + intakePpdControl_ + control builders (choice/multi/numunit/reveal/
  condition) + pure serialize helpers (intakeMultiToggle_/Serialize_/Parse_,
  intakeRevealSerialize_/Parse_). Null control → legacy path byte-identical.
- #115 Phase 2 (merged): populated INTAKE_PPD_CONTROL per-question (Q1 multi mobility,
  Q2-6/Q24 choice, Q25/Q31a/Q34 multi w/ No-exclusive, Q37/38 numunit, Q39 reveal),
  INTAKE_PPD_TYPE Q14-23 sev→yn, removed Q1/24/37/38/40. FIRST visible form change.
  Server needed NO edit (INTAKE_PPD_YESNO_QS already lists Q14-23; email builder
  already splits comma-joined multi). NEW Phase-2 drift-guard loads the LIVE config
  and feeds values through the engine so a rename fails CI. Pure 223/0, DOM 48/0.
  INV-112 + the "Intake PPD Option A" gotcha rewritten to "engine-safe canonical-
  English values, drift-guarded."

## Where I left off
2026-07-09 (feature batch): shipped the operator-selected suggestions #1
(client error beacon, INV-150), #2 (consolidated manager daily brief behind
the managerDailyBrief server flag, INV-151), and #4 (What's-new panel via
WHATSNEW_KB_ID, INV-152) — see the "Feature batch #1/#2/#4" block above for
full detail. Pure 257/0, DOM 59/0; editor suite grew to 262 (3 new tests).
NEXT: merge the feature-batch PR on green; then operator steps — ONE
clasp push -f + New version, re-run installAutomationTriggers() once (14th
trigger), runAllTests() expecting 262/0; optionally flip managerDailyBrief +
set WHATSNEW_KB_ID. Next audit cycle = fresh /broad-scan (Cycle 8) whenever
desired; seams counter is at 0.

## Pending / not yet done
- NONE — Cycle 7 is fully closed AND operator-verified in production
  (2026-07-09): runAllTests 259 passed / 0 failed; runSmokeTests 113 passed /
  0 failed / 146 skipped-as-integration (the new automationDetectorLiveness
  smoke check passing among them). No open code work.
- OPERATOR (optional, no urgency): fill Employees column O `Schedule`
  (`H:mm-H:mm`, rep-local) for reps with nonstandard shifts; align sheet tzs
  to `Asia/Kolkata` per Storage Health (cosmetic-risk-only since H-2/INV-141);
  set ADMIN_EMAILS to narrow the Admin tab.
- Next audit cycle = a fresh /broad-scan (Cycle 8) whenever desired — seams
  counter 0, no verification debt. Roadmap candidates when wanted: follow-up
  date on action flags (the last cycle-5 rep-value item), Spanish condition
  labels, Q31a body diagram; external-form route stays admin-blocked.

## Completed this cycle (Cycle 7 — all turns)
- Turn 1 (3f083a1): H-1 coaching overdue dead; H-2 export-sheet tz pin; M-1
  submitPunch failure handler; L-1 voidCoaching finally.
- Turn 2 (3f083a1): M-2 intake draft teardown wipe + showView flush; M-5 search
  trim-guard; L-15 acct 'FALSE' fabrication; L-22 nav-hint order; L-26 catalog
  failure cache.
- Turn 3 (eda5a08): M-3 punchTime normalize; M-4 isAdjustment boolean-safe; M-6
  bulk-btn selector overlap; L-6 stranded loaders; L-7 dup title; L-8 esc label.
- Turn 4 (fbaa878): M-10 admins⊆managers enforced; M-15 subformData whitelist;
  M-12 KB-AI draft exclusion (searchReference publishedOnly); M-13 convert
  status carry; L-9 draft-KB training guards.
- Turn 5 (be3fe85): M-9 composer close-refusal mid-send; M-8 Team Notes sub-tab
  seq guard; M-7 Admin Sheets empty-pane reload + Retry; L-20 stuck envelope;
  L-21 note-ref sync; L-23 exact badge; L-25 QA in-flight guard.
- Turn 6 (ef572fa): M-14 cnTimestampString_ boundary (4 readers);
  createPinnedSpreadsheet_ factory (tz+locale) + 3 sites + no-bare-create
  tripwire; Storage Health locale pills.
- Turn 7 (f6a19ba): M-16 'Other'-dept DR skip; M-11 unmatchedAgents alive
  (offRosterAgents, CDR cache v3); L-10 digest TRX drop; L-11 label cap; L-12
  mail-outside-lock; L-13 lone-urgent fold.
- Turn 8 (3e54681): L-2 future-time guard; L-3 Sat-NYD observance; L-4 half-day
  pair exemption (Node-pinned); L-5 roster-tz defaults; L-14 EOD banner; L-16
  comma/negation guard; L-17 lang-flip reveals; L-18 KB item-open seq; L-19
  Offerings scheme whitelist; intakeClearDraft_ debounce cancel; CLAUDE.md sync.
- Tests added: 10 pure (incl. 6 source tripwires) + 6 DOM; several bite-checked
  against pre-fix code. Harnesses: pure 230→240, DOM 48→54.

## Decisions made (so the next session doesn't re-litigate)
- L-24 dup-card race NOT fixed: needs fuzzy pending↔server note matching (risk
  of dropping a real pending note) for a ≤60s self-healing cosmetic issue.
- Diagnostic-liveness in Automation Health deferred as its own designed change.
- 'Other'-only dept sends are untracked by DeptRequests (mixed sends tracked).
- coachParseTs_'s fixed-UTC parse is acceptable for the 7-day overdue window
  (≤tz-offset skew; matches the analytics block's existing tolerance).
- Untouched acct Yes/No toggles now serialize '' (not 'FALSE') — send rendering
  identical (server branches on ==='TRUE'); stored submissions record ''.

## Prior: KB self-improving loop (#1 + #2, 2026-07-01, claude/broad-scan-2ll5ok)
Non-AI Reference-tool enhancements (operator declined the KB-AI Phase B route for
now, chose these instead). Both feed the manager review workflow; PHI-free-by-policy.
- #2 rep freshness signal: kbFlagItem(itemId, kind∈helpful|notHelpful|stale, note)
  — rep-callable, append-only, locked; new KbFeedback tab. A 'stale' flag surfaces
  the item at the TOP of kbGetReviewDue regardless of age (strictly-newer-than-
  last-review reset, the INV-120 pattern — kbMarkReviewed clears it, no status col;
  kbStaleFlags_ + kbCellTs_ helpers). Only 'stale' is audited (KbItemFlagged, id
  only). Reader "Was this helpful? Yes/No + Out of date" bar (kbFeedbackBarHtml_).
- #1 content-gap requests: kbRequestArticle(topic, note, query) rep-callable append
  -only locked; new KbContentRequests tab; kbGetContentRequests / kbResolveContent
  Request(reqId, action) manager-gated. Deliberate rep action on a ZERO-RESULT
  search (kbNoResultsHtml_ CTA → uiPrompt) = PHI-clean by construction. Manager
  "Content requests" block in the Reference landing (kbLoadContentRequestsBlock_).
  Audit PHI-free (reqId only): KbContentRequest / KbContentRequestResolve.
- Tests: 2 manager-gate cases added to test_managerGates_rejectNonManager
  (kbGetContentRequests/kbResolveContentRequest, MANAGER tier not admin);
  test_kb_feedbackAndRequests_requireEmployee (rep-auth + kind/topic validation).
- Pure 207/0, DOM 48/0, node --check clean. Two tabs auto-provision (deployer edit
  access to KB_SS_ID already required) — NO new Script Property / trigger / migration.

## KB self-improving loop (#1 + #2, 2026-07-01, claude/broad-scan-2ll5ok)
Non-AI Reference-tool enhancements (operator declined the KB-AI Phase B route for
now, chose these instead). Both feed the manager review workflow; PHI-free-by-policy.
- #2 rep freshness signal: kbFlagItem(itemId, kind∈helpful|notHelpful|stale, note)
  — rep-callable, append-only, locked; new KbFeedback tab. A 'stale' flag surfaces
  the item at the TOP of kbGetReviewDue regardless of age (strictly-newer-than-
  last-review reset, the INV-120 pattern — kbMarkReviewed clears it, no status col;
  kbStaleFlags_ + kbCellTs_ helpers). Only 'stale' is audited (KbItemFlagged, id
  only). Reader "Was this helpful? Yes/No + Out of date" bar (kbFeedbackBarHtml_).
- #1 content-gap requests: kbRequestArticle(topic, note, query) rep-callable append
  -only locked; new KbContentRequests tab; kbGetContentRequests / kbResolveContent
  Request(reqId, action) manager-gated. Deliberate rep action on a ZERO-RESULT
  search (kbNoResultsHtml_ CTA → uiPrompt) = PHI-clean by construction. Manager
  "Content requests" block in the Reference landing (kbLoadContentRequestsBlock_).
  Audit PHI-free (reqId only): KbContentRequest / KbContentRequestResolve.
- Tests: 2 manager-gate cases added to test_managerGates_rejectNonManager
  (kbGetContentRequests/kbResolveContentRequest, MANAGER tier not admin);
  test_kb_feedbackAndRequests_requireEmployee (rep-auth + kind/topic validation).
- Pure 207/0, DOM 48/0, node --check clean. Two tabs auto-provision (deployer edit
  access to KB_SS_ID already required) — NO new Script Property / trigger / migration.
- Shipped in #107 (merged). Docs synced inline (INV-139 + storage map + audit
  actions + Key Design Decision).

## KB loop follow-ons — drawer parity + 👍/👎 counts (2026-07-01, claude/broad-scan-2ll5ok)
Both follow-ons noted at #107 close, now built on a fresh branch off merged main:
- Drawer parity: the reader "helpful/out-of-date" bar + zero-result "Request an
  article" CTA now render in the Ctrl/⌘+K drawer too (kbDrawerOpenItem_ /
  kbDrawerSearch_). Feedback bar refactored to locate itself via
  closest('.kb-feedback') (no DOM id) so tab + drawer can't collide;
  kbFeedbackDone_ shared helper; kbFlagStale_ now takes the btn.
- 👍/👎 counts: new kbFeedbackCounts_() (cumulative helpful/notHelpful over the
  bounded feedback tail) folded into kbGetReviewDue + kbGetUsageStats items;
  rendered as a kbFbCountHtml_ chip in the manager Most-used + Review-due landing
  rows (hidden when empty). New thumbsDown icon in script_icons.html (mirrors
  thumbsUp) — also used for the reader "No" button.
- No new endpoints/gates (counts fold into existing manager-gated reads) → no
  test changes. Pure 207/0, DOM 48/0, node --check clean.
- Shipped in #108 (merged).

## KB #3 — broken-embed / lost-access checker (2026-07-01, claude/broad-scan-2ll5ok)
Next in the suggested KB sequence (Wave 1: #3 reliability, then #4 revision/draft).
- getStorageHealth now probes every KB embed for Drive reachability via new
  kbScanBrokenEmbeds_ (bounded KB_EMBED_SCAN_CAP=150, best-effort, PHI-free):
  DriveApp.getFileById(id).getName() forces the lazy access check — a
  deleted/moved file or lost deployer access = a dead /preview iframe that errors
  nowhere (neither "stale" nor an unreachable store). DriveApp already a project
  scope → no new OAuth.
- Returns kbEmbeds:{total,probed,reachable,broken[],truncated}; panel
  (cnRenderKbEmbedsHealth_) renders a danger list (title·dept·kind·open↗·reason)
  + folds "N broken embed(s)" warn into the Overview Storage summary card.
- Scan gated by getStorageHealth({scanEmbeds}) (default on); getDeployReadiness
  passes {scanEmbeds:false} so the Admin Overview never double-scans Drive.
- No new endpoint/gate (rides admin-gated getStorageHealth). Pure 207/0, DOM 48/0,
  node --check clean. Docs: Storage Health Key Design Decision updated.
- Shipped in #109 (merged).

## KB #4 — article revision history + draft→publish (2026-07-01, claude/broad-scan-2ll5ok)
Wave-1 pair to the review loop. NEW INV-140.
- Schema: KB gained trailing `Status` col (KB.STATUS=12, KB_HEADERS→13, self-heal;
  kbRowStatus_ pure — blank→published). KB_CACHE_KEY v1→v2 (items carry status).
- Draft→publish: kbSaveItem takes payload.status (explicit wins; plain re-save
  PRESERVES existing status; new=published). Drafts INVISIBLE to reps across all
  read paths (getReferenceTree per-viewer filter of one cache blob / getReferenceItem
  'Not found.' / searchReference skip / kbGetReviewDue skip). kbPublishItem flips
  draft→published (EmpDocs releaseDoc mirror).
- Revision history: append-only KbRevisions tab; kbAppendRevision_ snapshots PRIOR
  content on every kbSaveItem UPDATE + every revert (best-effort). kbGetRevisions
  (read-only, bounded) + kbRevertItem (restores content, snapshots current first →
  reversible). All 3 ADMIN-gated (authoring tier), mutating 2 locked.
- Audit PHI-free: KbItemPublish/KbItemRevert (id/revId); KbItemSave now carries status=.
- Client: "Save as draft" checkbox, Draft pill (tree+reader) + banner, reader
  Publish/History(→restore) actions (KB_STATE.isAdmin-gated). New CSS
  kb-draft-pill/-banner, kb-rev-row.
- Tests: 3 admin-gate cases added to test_managerGates_rejectNonManager. No KB
  fixture in the automated suite → draft-visibility + revision flow are manual (S-walk).
- Pure 207/0, DOM 48/0, node --check clean. Docs: INV-140 + Reference decision +
  storage map (KbRevisions).
- Shipped in #110 (merged).

## KB #6 + #5 — copyable snippets + per-rep bookmarks (2026-07-01, claude/broad-scan-2ll5ok)
Wave-2 rep-facing (Employee-UX). Client-only; no server/schema change.
- #6 snippets: kbMd_ fence handler extended — a ```snippet (or ```snippet: Label)
  block renders a copy-to-clipboard "canned response" card (kbCopySnippet_ reads
  the <pre> textContent = decoded raw). Rides kbMd_'s existing escape boundary
  (content escaped before fence extraction); kbMd_ stays PURE (markup inlined, no
  icon() dep). NOTE: the fence sentinel in kbMd_ uses NUL bytes (\x00C<idx>\x00) —
  the file is "binary" to grep; the fence edit was applied via a latin1
  byte-preserving Node script, not the Edit tool. Node test added (snippet card +
  plain/js fence unchanged + body still escaped).
- #5 bookmarks: pure kbBookmarksToggle_ (Node-pinned) + kbIsBookmarked_/
  kbToggleBookmark_/kbBookmarkBtnHtml_; star on reader + drawer; Bookmarks block
  atop Reference landing + drawer home; stored in umsKbPanel.bookmarks (cap 12).
- Pure 209/0 (+2), DOM 48/0, node --check clean. Docs: Reference decision +
  umsKbPanel localStorage note.
- Shipped in #111 (merged).

## PPD intake redesign — planning + Phase 0 (2026-07-01, claude/broad-scan-2ll5ok)
NEW multi-phase effort (operator request): upgrade PPD question response formats
(multi-select buttons, condition pickers, validation) WITHOUT touching the fragile
substring-based recommendation engine (intakeFilterRecommendations_ /
intakeDeriveClinicalFactors_). KEY INSIGHT: the "must stay free-text" questions
(Q25/Q34/Q31a/Q43, INV-112) can become STRUCTURED controls if the option VALUES
emit the exact substrings the engine matches (feet/legs, knee/left/right,
"Paralysis Left Arm" comma-joined, real neuro condition names). Canonical ENGLISH
value regardless of display language — also fixes a latent bilingual bug (Spanish
free-text never matched English substrings).
- Operator decisions: condition boxes (Q29/Q42/Q43) = CURATED multi-select filter
  (I'll seed starter lists from Medicare PWC guidance for clinical sign-off);
  scope THIS ROUND = Phase 0 only (engine-contract lock), then pause for review.
- Phase 0 DONE (test-only): 6 Node tests in run.js pin that the exact strings the
  new controls will emit produce the same clinical factors / recommendations as
  today's free-text (Q25/Q34/Q31a/Q43/Q38 + an end-to-end structured-vs-free-text
  parity case). Engine untouched. Pure 216/0, DOM 48/0.
- Phase 0 shipped in #113 (merged).

## PPD redesign Phase 1 — control framework (2026-07-01, claude/broad-scan-2ll5ok)
Reusable string-valued PPD control kinds, INERT until Phase 2 opts questions in.
- INTAKE_PPD_CONTROL = {} (empty) + intakePpdControl_(qNum) resolver; intakePpdRowHtml_
  checks it first (null today → legacy INTAKE_PPD_TYPE path byte-identical).
- New kinds (all string-valued): choice (single-select multi-button, canonical-EN
  value + localizable label, reuses intakePick_ — added .intk-choice), multi
  (multi-select + optional exclusive option, comma-joined in OPTION order,
  intakeMultiPick_/Get_/Set_), numunit (number+unit suffix, value=raw number),
  reveal (option that shows a free-text box, value '<opt>' | '<revealOn>: <text>'),
  condition (Phase-3 PLACEHOLDER — renders a plain text field, engine-safe).
- intakePpdGetVal_/SetVal_ extended for multi/reveal/choice (fall through to the
  existing input/yn/sev path when those groups aren't present → unchanged today).
- PURE Node-pinned helpers: intakeMultiToggle_/Serialize_/Parse_,
  intakeRevealSerialize_/Parse_ (3 new tests, primitive comparisons for vm-realm).
- Engine untouched. Draft/collect/email keep working via the string values.
- Pure 219/0 (+3), DOM 48/0, node --check clean. NO live behavior change.
- NOT YET: committed/pushed. NEXT (on approval): Phase 2 (opt questions into the
  new kinds — the per-question format changes) → Phase 3 (curated condition lists,
  clinical sign-off) → Phase 4 (helpers/conditionals/validation); INV-112 rewrite
  ("free-text" → "engine-safe structured values") lands with Phase 2.

## PPD redesign Phase 2 — per-question formats live (2026-07-01, claude/broad-scan-2ll5ok)
First phase where the PPD form visibly changes. Server needed NO edit (email
builder already renders comma-joined multi values + INTAKE_PPD_YESNO_QS already
lists Q14-Q23). Engine untouched.
- INTAKE_PPD_TYPE: dropped Q1/Q24/Q37/Q38/Q40 (→ CONTROL); Q14-Q23 sev→yn (aligns
  client with the server's yesno coloring); Q7-Q12 stay yn, Q13 stays text.
- INTAKE_PPD_CONTROL populated: Q1 multi(devices), Q2-Q6 choice(3 MRADL opts),
  Q24 choice(Rx/OTC/No), Q25 multi ex:No(No/Hands/Feet/Legs), Q31a multi ex:No
  (paralysis/weakness), Q34 multi ex:No(amputation), Q37 numunit(in.), Q38
  numunit(lbs.), Q39 reveal(Alone/Friends-Family/Other→text). Q40 → default text.
- ENGINE-CRITICAL values (Q25/Q31a/Q34/Q38) exactly match the Phase-0-pinned
  substrings; NEW Phase-2 drift-guard (run.js) loads the live INTAKE_PPD_CONTROL
  and feeds its values back through the engine (rename → CI fail, not silent break).
- Pure 223/0 (+4), DOM 48/0, node --check clean. Docs: rewrote INV-112 + the
  "Intake PPD Option A" gotcha (free-text → engine-safe canonical-English values).
- DECISION: Q7-Q13 left as-is (Q7-Q12 Yes/No = my advice; Q13 free-text) rather
  than the literal "free-text" (which would downgrade the binary function Qs) —
  awaiting operator confirm. Q29/Q42/Q43 = Phase 3 (curated pickers). Q32 tooltip
  / Q33a conditional-hide / Q45 reveal-sub-options / Q37 5'1"→61 parse = Phase 4.
- Follow-on: ES option-label localization (values are EN; labels currently EN);
  intakeSevControlHtml_/INTAKE_SEV_LEVELS now unused (harmless dead code).
- NOT YET: committed/pushed. Operator spot-check of the live PPD form recommended
  (DOM harness doesn't render intake).

## (superseded) original NEXT line
- NEXT (on approval): Phase 1 control framework →
  Phase 2 per-question formats → Phase 3 curated condition pickers → Phase 4
  helpers/conditionals/validation; then UPDATE INV-112 (free-text → engine-safe
  structured values, pinned by these Phase-0 tests). Full plan in the chat
  transcript (per-question table + phasing).

## KB #8 + #7 — search synonyms/filters + see-also (2026-07-01, claude/broad-scan-2ll5ok)
Wave-3 (final KB roadmap items). The KB non-AI roadmap (#1–#8) is now COMPLETE.
- #8 synonyms: Script Property KB_SEARCH_SYNONYMS (≥2-term lowercase groups);
  kbExpandSynonymTokens_ expands query tokens in searchReference (unset = no-op,
  byte-identical). Admin editor: kbGetSearchConfig/kbSaveSearchConfig (admin-gated,
  AdminConfigChange audit) + a "Synonyms" modal in the Reference tree header.
- #8 filters: client-side type chips (All/Articles/Embeds + counts) + department
  <select> over the cached KB_STATE.searchResults (kbRenderSearchResults_/
  kbSearchFilterBarHtml_/kbSetSearchFilter_); kbDoSearch_ refactored to cache +
  re-render with NO re-query. Reference tab only; drawer search unchanged.
- #7 see-also: pure Node-pinned kbCoViewRelated_ (distinct (rep,day)-session
  co-view count, ≥2 threshold so thin data is silent, top 5) + kbGetRelated
  (rep-callable, read-only, bounded KbViews tail; drops deleted + non-admin
  drafts). Reader lazy-loads a "See also" block (kbLoadRelated_). Reference tab
  only (drawer stays light).
- Tests: kbCoViewRelated_ Node test; 2 admin-gate cases (kbGetSearchConfig/
  kbSaveSearchConfig); kbGetRelated rep-auth case. Pure 210/0, DOM 48/0, node
  --check clean. Docs: Reference decision + KB_SEARCH_SYNONYMS operator note.
- NOT YET: committed/pushed. KB roadmap #1–#8 DONE. No further KB items queued —
  next work is operator's call (deploy + runAllTests, or a fresh audit).

## Cycle 6 — DeptRequests v2 (all 4 phases, 2026-06-30, claude/broad-scan-2ll5ok)
Planned (decisions: roster column N membership; manager-summary reminder;
wall-clock SLA; 48h default) then built as 4 commits + a docs commit:
- P1 membership: EMP.DEPARTMENTS col N; ROSTER_CACHE_KEY v6→v7; departmentsRaw on
  the roster readers; pure Node-pinned drParseDepartments_ + empDepartments_;
  getEmployeeState ships departments.
- P2 incoming inbox: getDeptRequests → myDepts+incoming (open requests to the
  caller's depts; PHI-free); resolveDeptRequest widened to sender OR manager OR
  receiving-dept MEMBER; client Incoming section; integration test.
- P3 SLA: DR_SLA_DEFAULT_HOURS=48 + DR_SLA_TARGETS property; getDeptRequestSla_/
  Config_ + pure drSlaStatus_ (ontime/atrisk≥75%/overdue≥100%); slaHours+slaStatus
  per item + overdueOpen per dept; admin-gated getDeptRequestSla/saveDeptRequestSla
  (folded into getAdminConfig); client SLA chips + Overdue column + Admin editor.
- P4 reminder digest: sendDeptRequestReminderDigest (13th trigger, manager-tz 10am,
  manager summary, silent when none); heartbeat deptReqReminder added to
  DIGEST_STALE_HOURS+digestHealth (server) + DIGEST_LABELS (client) — the F5
  coupling registry enforced the client label. Gate test added.
NEW INV-138; INV-44 12→13; INV-136 28→30; INV-28 v7. Pure harness 188→207/0;
node --check clean. The trigger-wiring + F1 gate-type + F5 coupling tripwires all
validate the 13th trigger.
OPERATOR (new): populate roster column N (Departments) for dept-desk reps; re-run
installAutomationTriggers() for the 13th trigger; optional DR_SLA_TARGETS via the
Admin editor (else 48h default); runAllTests() (new deptReq + SLA-gate tests).

## Cycle 6 broad-implement — coupling registry + intake explainability (2026-06-30)
Two P3 strategic-depth items:
- Coupling-tripwire registry (test/client/run.js): a declarative COUPLING_REGISTRY
  + generic runner for SOURCE-LEVEL key-set ⊆ couplings (the Axis-B drift net).
  Reusable extractors (topLevelObjectKeys_/flatObjectKeys_/stringArrayItems_).
  Seeded with the 2 F5 Automation-Health label couplings (replaced their ad-hoc
  tests). The next such coupling is ONE entry. Vm-dependent / custom-shaped
  couplings (day-type validator, trigger wiring, gate-type, intake layout mirror,
  forms-ID mirror, token hygiene, SUBMITTED_AT coercion) stay bespoke — documented.
- Intake recommendation explainability (Code.js + intake client): extracted the
  engine's clinical-factor derivation into the shared pure intakeDeriveClinicalFactors_
  (engine destructures it back into the SAME locals — filter/justify byte-for-byte
  unchanged, so NO drift from the explainability surface). New pure
  intakeExplainFactors_ → flat {label,value}[] of the factors that drove the rec.
  intakeGetSubmission returns `factors` for PPD (recomputed from STORED answers —
  no schema change); the Sent detail renders a read-only "Why these recommendations
  · engine factors" block (every value esc()'d). Manager-auditable (+ rep sees own).
  Node harness updated (loads the 2 helpers into the engine vm ctx) + 2 explain
  tests; the 5 engine tests still pass = behavior-preserving. INV-112/INV-116 updated.
DECISIONS: explainability reuses the engine's OWN derivation (shared helper) rather
than re-deriving — the only drift-free design (and the very genus the coupling
registry fights). Recompute-from-stored-answers avoids a schema migration. Registry
scoped to source-level key-set couplings (the clean, generalizable shape); didn't
force-migrate differently-shaped tripwires (would weaken them). Pure harness 204/0;
node --check clean. NEXT: operator deploy (clasp push -f + New version); no new
Script Properties/triggers/migrations for these two.

## Cycle 6 broad-implement P1 + automation-failure digest (2026-06-30, claude/broad-scan-2ll5ok)
Post-F1–F11 follow-up batch (the audit's strategic gaps + the top P2 feature):
- P1#1 (test/client/run.js): trigger-GATE-TYPE tripwire — every install-TARGETS
  handler must call assertManagerCaller_ AND reference no `.isAdmin` IN CODE
  (comment-stripped first — reconcile's comment legitimately says "NOT emp.isAdmin").
  Would have caught F1. The prior tripwire only checked trigger WIRING, not gate type.
- P1#2 (run.js): Automation-Health label-map tripwire — client DIGEST_LABELS ⊇
  server DIGEST_STALE_HOURS keys + CN_HEALTH_RUN_LABELS ⊇ AUTOMATION_AUDIT_ACTIONS.
  Would have caught F5. Source-level regex (top-level line-anchored keys).
- P1#3 (CLAUDE.md): folded the F7 LunchIn→doorExit morph note into the
  "Punch-button motion" decision.
- Automation-failure digest (Code.js): NEW sendAutomationHealthDigest — daily
  manager-tz 9am, 12th trigger. Reuses the UN-gated computeAutomationHealth_
  (extracted from getAutomationHealth — the gate stays in the wrapper, ONE shared
  computation, no parallel-source drift). Emails MANAGER_EMAILS ONLY on a failing
  check: stale digest heartbeat / stale nightly reconcile (the F1 class, via the
  new additive automationLastRuns[].last.ms field, >30h) / personal-sheet
  sync-fails. Silent when healthy; "never ran yet" not flagged. CDR DROPPED from
  the push (unset CDR_SS_ID would false-nag a non-CDR deploy; panels still show
  it). assertManagerCaller_ gate (INV-44, passes the new gate-type tripwire),
  best-effort, PHI-free. Wired into BOTH TARGETS; gate test added. NEW INV-137.
DECISIONS: digest scoped to automation-TRIGGER failures (not integration/CDR) so
"silent when healthy" holds for every deployment. Watcher has no heartbeat/audit
row of its own (verify from the trigger list) — accepted (meta-watcher out of
scope). computeAutomationHealth_ may throw; every caller wraps it.
Pure harness 188→202/0; node --check clean. NEXT: operator deploy (clasp push -f +
New version) — re-run installAutomationTriggers() to wire the 12th trigger +
runAllTests() (new gate test). DOM harness via CI.

## Cycle 6 broad-implement F7–F11 (2026-06-30, branch claude/broad-scan-2ll5ok)
The Low-tier remainder of the broad-scan, all client-only (no Code.js change):
- F7 (tc/script_clock.html): PUNCH_MORPH.LunchIn.to headset→doorExit — a lunch
  RETURN sets afterLunch, making ClockOut (doorExit) the next primary, so the
  morph now carries seamlessly into the re-render (the #103 afterLunch change had
  left it landing on the old LunchOut-primary headset).
- F8 (cn/script_callnotes.html): cnToggleFlag_ training branch re-resolves the
  note from state AFTER the async uiPrompt (a 60s ambient refresh can replace the
  slot via cnReplaceNoteInState_, detaching the captured ref); fresh prev/next on
  the current object; null-safe if deleted mid-prompt. INV-56/48 preserved.
- F9 (cn/script_callnotes.html): cnToggleMoreMenu_ gained outside-click + Escape
  dismissal via a SINGLE self-removing capture-phase document listener
  (cnCloseMoreMenus_ + _cnMoreMenuCloser); opening one menu closes others; no
  accumulating-listener leak (bounded to 1, self-heals on next mousedown).
- F10 (script_core.html): dispTime() now esc()'s its malformed-input verbatim
  fallback (several callers inject its output via innerHTML) — defense-in-depth;
  the formatted branch (valid times) is unchanged.
- F11 (train/script_empdocs.html): void-reason prompt copy now says the reason is
  SHOWN TO THE EMPLOYEE ("keep it free of internal/sensitive notes") — closes the
  manager-assumes-private exposure risk without a data-model change/operator call.
DECISIONS: F7 fixes the morph to honor the documented carry-through invariant
(doorExit) rather than rewriting the doc. F11 resolved via labeling (not server
withholding) — the employee SHOULD know why their doc was voided; the risk was
the false-privacy assumption, which the prompt now removes. F8 happy-path is
byte-identical; the fix only bites the replaced-slot edge. Pure harness 188/0;
node --check clean. The DOM harness exercises cnToggleFlag_('action') (NOT the
training branch), so no double encoded the old behavior. NEXT: operator deploy
(clasp push -f + New version) — F1–F11 all ride one deploy.

## Cycle 6 broad-scan + implement F1–F6 (2026-06-30, branch claude/broad-scan-2ll5ok)
AUDIT: 4 parallel deep-read agents + independent verification of every concrete
finding. Result = NO Critical/High (5th consecutive). One Medium regression (F1)
from #102/INV-136 + 9 Lows. IMPLEMENTED F1–F6 (NOT yet pushed):
- F1/F2 (Medium, the headline): reconcileCallNotes is a daily TRIGGER but #102
  moved its gate to emp.isAdmin — under a narrowed ADMIN_EMAILS (or a non-roster
  installer) the nightly 5am run silently no-op'd, leaving hand-entered rows
  un-indexed forever. Reverted to assertManagerCaller_ (the INV-44 trigger idiom,
  like the other 10 handlers); audit actor falls back to _SYSTEM_AUDIT_EMP_ for a
  non-roster installer. test_reconcileCallNotes_nonManagerRejected now asserts the
  throw. INV-109 + INV-136 (29→28 admin endpoints) updated in CLAUDE.md.
- F3 (Low): submitPunch animated `.actions .prime` not the CLICKED button — after
  a lunch return (ClockOut=prime, LunchOut demoted) a 2nd-lunch click morphed the
  wrong button. Now targets `[data-action=<punchType>]`, falls back to .prime.
- F4 (Low): 3 coaching failure handlers did showToast(esc(...)) but showToast uses
  textContent → entities shown literally. Dropped the redundant esc().
- F5 (Low): Automation Health client label maps stale vs server — added
  trainingOverdue to DIGEST_LABELS + CallNotesArchive/CallNotesArchivePurge to
  CN_HEALTH_RUN_LABELS (were rendering raw keys).
- F6 (Low): clkRefreshState_ re-renders the WHOLE clock view on every 20s focus
  wake, flashing the teammate skeleton + blanking the note-volume histogram +
  refiring 2 RPCs. Added small module SWR caches (CLK_TEAMMATE_CACHE /
  CLK_NOTEVOL_CACHE): paint last-good instantly, refetch in background, skeleton
  only on first load. Same payload cached (INV-24 preserved — no new fields).
DEFERRED (out of F1–F6 scope, noted for next session): F7 morph carry-through
LunchIn→ClockOut (cosmetic), F8 training-flag note-ref across async uiPrompt
(edge), F9 CN more-menu no outside-click close, F10 dispTime() unescaped (latent),
F11 EmpDocs voidReason shown to employee (design Q). Plus the strategic suggestion:
a CI tripwire asserting no trigger-TARGETS handler uses an isAdmin/roster gate
(would have caught F1) + a client-label-map ⊇ server-keys tripwire (F5 class).
Pure harness 188/0; node --check clean (Code.js + Tests.js). DOM harness needs
npm ci (CI runs it). NEXT: operator deploy (clasp push -f + New version) +
runAllTests() in editor (the only check on the reconcile gate test change).

## Cycle 6 retention 3rd-tier + include-archive search (2026-06-23, branch claude/happy-faraday-0grppg)
Closed the two archive follow-ons (pushed). Retention is now a full 3-tier system.
- 3rd tier: purgeArchivedCallNotes() (top-level trigger, assertManagerCaller_-gated
  INV-44, locked) irreversibly deletes NotesArchive rows older than
  CN_ARCHIVE_RETENTION_DAYS (Script Property → CONFIG.CALL_NOTES.ARCHIVE_RETENTION_DAYS,
  default 0) — the ONLY deleter of archived notes; read-only re tab existence
  (never creates it). getArchiveRetentionDays_; PHI-free CallNotesArchivePurge
  audit + AUTOMATION_AUDIT_ACTIONS. 11th daily trigger @ mgr-tz 2am (before the
  3am archive) + both TARGETS (tripwire green). Gate test added.
- Include-archive search: searchMyCallNotes + managerSearchCallNotes gain an
  includeArchive param → also scan the cold NotesArchive tab (read-only
  getSheetByName, never creates) and tag hits _archived. Match logic factored
  into a per-source closure (live path unchanged). Client "Include archived"
  checkbox on both Search bars (CN_STATE.searchIncludeArchive /
  mgrSearchIncludeArchive); archived hits render a read-only "archived" pill.
DECISIONS: the 3 windows are independent operator knobs — NOTE_ARCHIVE_DAYS (move
Notes→archive), NOTE_RETENTION_DAYS (delete from live), ARCHIVE_RETENTION_DAYS
(delete from cold). 2am purge-archive < 3am archive < 4am purge ordering.
includeArchive defaults OFF everywhere (back-compat: getPatientTimeline's 4-arg
searchMyCallNotes call + the omnibus gate's 4-arg managerSearchCallNotes call are
unaffected). Pure 162/0, DOM 48/0, node --check clean. DOC: /sync-docs (11
triggers, CN_ARCHIVE_RETENTION_DAYS, INV-44 10 handlers, INV-132 now the
cold-deleter, include-archive note, a new invariant).

## Cycle 6 call-note retention ARCHIVAL tier (2026-06-23, branch claude/happy-faraday-0grppg)
Stage-3 follow-on: made retention SAFE by adding a cold-archive tier (pushed).
- New archiveOldCallNotes() (top-level trigger handler, assertManagerCaller_-gated
  INV-44, locked INV-01) MOVES per-rep Notes rows older than CN_NOTE_ARCHIVE_DAYS
  into a NotesArchive tab in the SAME per-rep spreadsheet — data preserved, live
  tab bounded, no new operator store. Helpers getNoteArchiveDays_,
  getOrCreateNotesArchiveTab_, archiveSheetRowsOlderThan_ (append-then-delete +
  flush; worst case = duplicate in cold archive, never lose). PHI-free
  CallNotesArchive audit row.
- Disabled by default (CN_NOTE_ARCHIVE_DAYS / CONFIG.CALL_NOTES.NOTE_ARCHIVE_DAYS
  =0). New CONFIG.CALL_NOTES.ARCHIVE_TAB='NotesArchive'.
- 10th daily trigger at mgr-tz 3am (BEFORE the 4am purge); added to BOTH TARGETS
  arrays (trigger-wiring tripwire green) + AUTOMATION_AUDIT_ACTIONS (health panel).
- New gate test test_triggerGate_archiveOldCallNotes_nonManagerThrows. Pure 162/0,
  DOM 48/0, node --check clean.
DECISIONS: archive lives in the SAME per-rep PHI spreadsheet (NotesArchive tab) —
zero new operator state, same PHI boundary, bounds the LIVE tab (which all readers
use via getCallNotesSheet_→NOTES_TAB). Archived notes are intentionally NOT
in-app-searchable (cold). Purge never touches NotesArchive (true cold store).
Recommended SAFE setup: archive on, retention/purge off. FOLLOW-ON: a "purge the
archive after a longer window" 3rd tier + an optional "include archive" search.
DOC: needs /sync-docs (10 triggers, CN_NOTE_ARCHIVE_DAYS, NotesArchive tab in the
storage map, INV-44 + a new INV for the archive tier).

## Cycle 6 Stage-3 FEATURE batch (2026-06-23, branch claude/happy-faraday-0grppg)
Implemented 3 strategic suggestions from the broad-scan Stage 3 (features, not
fixes), all pushed:
- #1 Deploy-readiness checklist: getDeployReadiness() (mgr-gated, PHI-free)
  composes Storage+Automation health + MANAGER_EMAILS count → pass/warn/fail
  (required ADP/KB/Intake fail when unset; optional warn; tz mismatch warns).
  Pure Node-pinned deployReadinessItems_. Panel atop CN Admin Overview
  (cnLoadDeployReadiness_). Gate added to test_managerGates_rejectNonManager.
- #2 Quick Links = official external-collection path: links gain optional
  `category` (survey/review/feedback/other; back-compat default 'other',
  sanitized read+write in getExternalLinks_/saveExternalLinks; new
  CN_EXTERNAL_LINK_CATEGORIES). Composer picker groups by optgroup (original
  indices preserved → insert handler unchanged); Admin editor category select;
  section reframed.
- #3 Patient/TRX timeline: getPatientTimeline(trx) (caller-scoped, read-only)
  stitches the rep's OWN notes (searchMyCallNotes trx) + intake submissions
  (filtered to emp.id even for managers) + sent forms (linked by noteId) →
  newest-first. Pure Node-pinned buildPatientTimeline_. Timeline button in the
  card more-menu → ensureOverlay modal, all server strings esc()'d.
DECISIONS: timeline is strictly caller-scoped (managers see only their own
notes/forms; intake filtered to emp.id) — v1 framed as a rep's own-patient
context, NOT a cross-rep manager view (follow-on if needed). Reused existing
caller-scoped endpoints internally (no new read surface). Pure 162/0 (4 new
tests), DOM 48/0, node --check clean. OPERATOR: clasp push -f + New version;
no new Script Properties/triggers/migrations. DOC: add getDeployReadiness +
getPatientTimeline + the quick-link category to CLAUDE.md (/sync-docs).

## Cycle 6 broad-scan + implement (2026-06-23, branch claude/happy-faraday-0grppg)
AUDIT: 6 parallel deep-read agents + independent verification of every Crit/High
claim. Result = 4th consecutive audit with NO verified Critical/High; every agent
Crit/High collapsed on verification (retracted: hasActiveTimeOffOnDate_ "Reconciled"
block [false — Reconciled ≠ pending/approved], getQuiz answer-key inversion [false —
always strips], audit-ts INV-29 [by design], public-form sig date [intentional local
date], CN bounded-read race [throws→caught, not wrong counts]). Net findings: 6 Low.
Confirmed clean: auth gate, manager gating, CDR getDisplayValues (all 3 readers),
EmpDocs fail-closed scoping, PHI-free audit rows (CallNoteEmail/DeptRequest/IntakeSent/
forms), trigger install/remove TARGETS symmetry (9==9), esc()/localStorage/overlay
hygiene, test suite genuinely bites (781 asserts/249 fns; manager-gate omnibus 50+
endpoints asserts .error + 'Manager access').
IMPLEMENTED (commit pushed):
- F1: currentView guards on 3 CN manager/admin loaders (cnMgrLoadRepView_,
  cnToggleAuditHistory_, cnAdminLoadEnrollment_) — both success+failure handlers,
  matching the documented loader-guard pattern.
- F2: kbAiApplySpend_ console.warn on failed spend-counter write (was silent swallow).
- F4: escaping-contract comment on intakeOpenModal_ (bodyHtml raw; callers must esc).
- F5: two-source manager-gate comment at assertManagerCaller_ (MANAGER_EMAILS vs
  emp.isManager roster column).
DEFERRED:
- F3 (empDocContentHash_/empDocSignatureHash_ space-delimiter collision, Low): NOT
  changed — would mark ALL already-issued keep-forever HR records as tampered
  (INV-122) + refuse new sigs on existing unsigned docs. Needs a HashVersion-column
  migration. Same space-delimiter in computeFormSubmissionHash_ (check under same
  umbrella if ever done).
- F6 (getSpanishInboxThreadBody scope, Low): no change — already manager-gated +
  scope-checked (first msg must be addressed to the configured inbox) + documented.
Net = 0 prod-fixes-that-would-fire − 0 new failure modes (all 4 are preventive/
defensive/doc). Pure harness 158/0; node --check clean. NEXT: operator deploy
(clasp push -f + New version); no new Script Properties/triggers/migrations.

## Targeted audit + implement — Spanish Inbox + DeptRequests (2026-06-22, on practical-gauss-yycwkz)
Context: the designated branch `claude/practical-gauss-yycwkz` was 45 commits behind
main and LACKED the audited code (Spanish/DeptReq/punctuality landed post-#56 on main).
Fast-forwarded the branch to origin/main (clean, 0-ahead), then implemented on it.
- AUDIT verdict: 0 Critical / 0 High / 1 Medium / 7 Low. The XSS surface I most
  expected (external Gmail subject/snippet/body → app) is CLEAN: banner esc()'d,
  Issue prefill + body expand use textContent, suggestion chips only keyword-match.
  All auth gates present; PHI-adjacent Spanish bodies never cached/persisted.
- IMPLEMENTED (commit b4592e5, pushed):
  - A1 (F7): gate-pin getSpanishInboxStats/Pending/ThreadBody + getPunctualityReport
    in test_managerGates_rejectNonManager; + no-leak assertion that getDeptRequests
    (rep-callable, only ADDS manager aggregate) never returns deptStats/allOpen to a
    non-manager.
  - A2 (F4): getSpanishInboxStats cache key scoped by spanishCacheHash_(addr,members)
    so a config change isn't masked for the 5-min TTL.
  - A3 (F3): DeptRequests ToEmail column now stores recipient DOMAIN(s) via
    drRecipientDomains_ (the "Other" dept can be an external/customer email; store can
    fall back to the ADP/payroll sheet) — matches ExternalEmailSent minimization.
    Column is write-only (never read back by any endpoint).
- Node harness 48/48 green; node --check clean. The Apps Script gate test runs
  in-editor (runAllTests) — confirm on next operator deploy.
- A4 DONE (commit 09896e0, F1, the one Medium): getDeptRequests now reads a
  bounded tail (DR_MAX_SCAN=4000, mirrors CN_AUDIT_MAX_SCAN) instead of the whole
  sheet + returns a `truncated` flag (client shows a transparent note). The
  resolve-by-token scans (resolveDeptRequest / markDeptRequestResolved_) were
  LEFT full so old tokens still resolve (the cross-module caveat). Node 48/48 green.
- DOC drift DONE (/sync-docs, commit 6ec0b03): the 4 endpoints added to INV-31;
  DeptRequests ToEmail domain-minimization documented in the "Store" note.
- A6 DONE (commit f9318a7, F6): removed the dead sendDeptRequest endpoint (no
  caller anywhere; tombstone left) — auto-tracking via emailFromCallNote replaced
  it. CLAUDE.md updated. Node 48/48 green.
- A5 DONE (commit 0ab6fd3, F2, Approach A — signed off): re-send of the same note
  to the same dept now REUSES the open row's token (drFindOpenRequest_, bounded
  tail) instead of opening a second request. Schema add DR.NOTE_ID (col 11,
  back-compat); pre-send reuse is hash-safe + best-effort; post-send append guarded
  by !drExistingId. New INV-131; pinned by self-cleaning test_deptReq_resendDedupLookup.
  DO-NOT-TOUCH respected (hash check / MailApp.send / EmailedAt stamping untouched).
- AUDIT ACTION LIST COMPLETE: A1–A6 all landed (A5 was the last). Nothing deferred.

## Design redesign thread (ACTIVE — non-audit, does NOT bump Cycle)
Operator-driven visual/interaction redesign from the design handoff in
`docs/design_handoff_team_tools_redesign/`. Plan + conflict register committed at
`docs/design_handoff_team_tools_redesign/IMPLEMENTATION_PLAN.md` (commit ee5fa96).
Executing as 7 separate per-module commits on branch claude/practical-gauss-yycwkz.
- Operator decisions: C1 remove Sick (confirmed real — UI surfaces only this pass,
  backend deduction/reconcile left dormant); C2 ribbon histogram re-sourced to LIVE
  logged-note volume (CDR has no hourly data); C3 add Phone/TRX search tabs (server
  change, touches INV-45); C4–C7 + all 5 improvements accepted.
- DONE — commit #1 foundation (95516d6): 5 new icons + Intake tab-icon repoint +
  kbItemIcon_→fileText; --accent-deep→--success-deep + soft-fallback hygiene (also
  the 2 --warning-soft uses in cn/ + tc/manager); NEW token-hygiene CI tripwire in
  test/client/run.js (form_public excluded; --brand allowlisted until commit #2).
  Pure 134/0, DOM 48/0, node --check clean. Operator: clasp push -f + New version.
- DONE — commit #2 Intake redesign (64bd150): .app-bar shell + toolbar-tabs EN/ES
  + .panel sections; PPD Option A (Yes/No toggles + severity chips + progress
  header) with ENGINE-SAFE classification (Q25/Q34/Q31a/Q33a/Q43/Q13 stay text per
  INV-112 — README's blanket "additional-info yes/no" was too broad); account
  checkbox→toggle (TRUE/FALSE preserved); Sent ALL/PPD/PMD/PAP filter+search; a11y
  radiogroups; draft autosave (umsIntakeDrafts, 24h expiry). --brand removed from
  tripwire allowlist. Pure 134/0, DOM 48/0. NEW localStorage key umsIntakeDrafts
  (CLAUDE.md "Ten ... keys" list now 11 — /sync-docs).
- DONE — commit #3 Training redesign (df073df): §3a completion-ring header card +
  Done/Left cells + overdue inset rail + primary quiz action; §3b manager matrix →
  reps×items CSS-grid status squares + numbered item key + coverage% column
  (trainCoverageClass_ tones), reps sorted least-covered first. New helpers
  trainRingHtml_/trainCoverageClass_. Pure 134/0, DOM 48/0. Minor: per-cell quiz
  attempt count dropped from the matrix (still in analytics table).
- DONE — commit #4 Reference/KB redesign (4fdb390): collapsible dept headers
  (chevron+count, persisted in umsKbPanel.deptCollapsed via kbToggleDept_);
  .kb-btn→token secondary; landing panel kbRenderLanding_ (Recently viewed +
  Most used 30d + Review due w/ pill+dot+Mark-reviewed) replacing the bare empty
  state — usage/review loaders now cache into KB_STATE + re-render landing (tree
  block render removed); KB_STATE.landing flag guards async re-render vs open
  item/search. Reader/markdown/search/drawer/editor untouched. Pure 134/0, DOM
  48/0. Most used + Review due are manager-only (endpoints manager-gated).
- DONE — commit #5a Time Clock (59b3230): sky-gradient clock card + tz-selector
  pill + phase glyph (off the 1Hz tick); shift strip = control surface (hours +
  state pill header, ribbon break-bands + note-volume histogram, punch buttons
  under, lunch=warn color-coding, LunchOut mid-shift primary); C2 histogram via
  NEW server getMyNoteHourBuckets(date) (rep-local hours; own endpoint avoids the
  getMyCallNotes DOM-flush collision + trims a hot-path RPC); C1 Sick removed —
  one-row Punches·Team·Annual-PTO(ring) replaces the ledger, Sick Leave dropped
  from both modals.html PTO selects (INV-95 ok), backend dormant.
- DONE — commit #5b Coverage (1aa2c0f): days×hours week heatmap (6a–9p, ok/risk/
  low/none cells) + click-to-expand per-day rep detail + Understaffed-slots risk
  callout (panel[data-tone=destructive], grouped ranges + PTO reason). Server
  unchanged. Pure 134/0, DOM 48/0 throughout.
- DONE — commit #6 Metrics (1c6991a): My Stats Today/7D/30D trend-window presets
  (client slice of the 30d trend; window=1=today-only) + rail sparklines (C4:
  answered/missed from trend, attSeconds from series; notes/total-talk plain) +
  sortable+sticky team table (mSortReps_/mTeamSort_/mTh_, default %Ans desc) +
  tri-tone %Ans cells (mPctClass_) + C5 .m-coverage unified on deep tones. Pure
  134/0, DOM 48/0. NOTE/conflict: the mock's range-aggregated My Stats needs a
  server getMyMetrics range variant — deferred (window control is client-only).
- DONE — commit #7 Call Notes, split 7a/7b/7c:
  - 7a (448f434) Search: read-only cnRenderResultCard_ (real cn-card) for rep +
    manager search + result count + KB term highlight + date-range filter +
    Phone/TRX scopes (SERVER change to searchMyCallNotes/managerSearchCallNotes,
    INV-45 doc, Tests.js test_cn_search_phoneTrxFieldScopes) + C7 badge tone.
  - 7b (271db84) manager Stats → scannable .m-table (Notes/Action/Training/Review/
    Median/%Ans/Coverage) reusing mPctClass_/mCoverageBadge_; shared JS component
    (improvement #1) DEFERRED (column sets differ — visual align via .m-table).
  - 7c (56535fd) Admin → Overview/Tags/Compliance/Config sub-tabs (cnAdminTab_,
    show/hide panes; cnRenderAdminAugmentHtml_ → {kpiHtml,taxHtml} split). Folding
    health panels into compact status CARDS deferred (panels already convey tone).
  Pure 134/0, DOM 48/0, node --check clean.

## DEFERRED FOLLOW-UPS #1–#4 DONE (post-redesign, same branch)
- #1 (43ea7ab) range-aggregated My Stats: new server getMyMetricsRange(from,to)
  (caller-scoped self-aggregate, 92d cap, no team/series); Today=single rich /
  7D·30D=server ranges / custom From-To; mRenderMyStats_ handles both.
- #2 (36506d2) Sick deprecation: removed 'Sick Leave' from TIME_OFF_TYPES (no new
  sick via UI or RPC); KEPT getLeaveDeduction_ sick mapping + col J for historical
  reverts (removing would corrupt annual on legacy sick reverts). Node test updated.
- #3 (377b981) shared mtRenderTable_ (script_core) drives BOTH the Metrics team
  table + CN Stats table (CN Stats gained sortable cols); mTh_ removed.
- #4 (48d212c) Admin Overview "System status" cards (Automation/CDR/Storage,
  OK/warn/error) from the existing health/storage fetches; detail panels kept below.
Pure 134/0, DOM 48/0, node --check clean throughout. Still NOT merged (no PR).
Remaining deferred: full col-J excision (only if zero historical sick rows);
Admin health→cards full consolidation (detail panels still shown); + the
small UX niceties (#6–#10 in chat) + /sync-docs doc drift.

## REDESIGN COMPLETE — all 7 commits landed on claude/practical-gauss-yycwkz
(8 commits incl. the #5 Clock/Coverage split). Plan: docs/design_handoff_team_tools_redesign/
IMPLEMENTATION_PLAN.md. NOT merged (no PR requested). OPERATOR: one clasp push -f
+ New deployment version covers all client + the Code.js changes
(getMyNoteHourBuckets, phone/trx search scopes); then runAllTests() in the editor
(exercises test_cn_search_phoneTrxFieldScopes). DEFERRED/conflicts to revisit:
range-aggregated My Stats (server getMyMetrics range variant, C-mock); shared
Metrics/CN-Stats table component; Admin health-status-cards consolidation; Sick
backend deprecation (UI-removed, backend dormant). DOC drift for /sync-docs:
new umsIntakeDrafts + umsKbPanel.deptCollapsed localStorage keys, getMyNoteHourBuckets
endpoint, INV-45 phone/trx, token-hygiene tripwire, Sick UI-removal.

## Cycle 5 CLOSED (2026-06-17)
Audit-opened broad-scan + full backlog implemented same-cycle, merged to main
(PR #53). Numbered 5 (a parallel session claimed Cycle 4 for a non-audit
operator-feedback+T4 batch — its straggler reflect commit 196948c stays only on
`claude/affectionate-cori-90q3ap`, unmerged; renumber/fold it if ever merged).
- Production fix=1 (M-1, Medium narrow trigger): adjustLeaveBalance_ per-row
  PtoEnabled gate (was global-flag-only; contradicted S15/INV-27) + regression test.
- Features=3: #5 tag trends (INV-125), #4 KB review-due (INV-126), #3 coverage
  planner (INV-127).
- Defensive=13: L-1 getMyMetrics cache, L-2 KB-AI spend race, L-3 intake data-URL,
  L-11 metrics null-guard, L-4 verifyDocSignature `tampered`, L-5 KB usage tz,
  L-7/L-8/L-10 bounded CN reads, L-9/L-12/L-13/N-2 comments.
- New failure modes=0. net=1. Pure harness 128→133 green; node --check clean.
- INV-128/129/130 proposed for the next verification pass (M-1 per-row gate,
  KB-AI race-safe spend, getMyMetrics endpoint cache).

## Post-reflect additions (pushed, on q4d2hf — merge when ready)
- runAllTests triage (operator ran it; ADP sheet tz = America/Los_Angeles ≠
  CONFIG Asia/Kolkata): #3 metrics_getMyMetrics_cdrUnavailableErrors FIXED
  (L-1 endpoint cache now bypassed under _TEST_OVERRIDE_CDR_SS_ID, commit
  0557169); #1/#2/#4 (config_adpSheetTzMatchesConfig / publicForm_tokenLifecycle
  / training_assignCompleteFlow) are ONE environmental root cause — the ADP
  sheet tz ≠ CONFIG.TIMEZONE → OPERATOR sets the sheet tz to Asia/Kolkata (or
  reconciles CONFIG), re-run setupTestEnvironment + runAllTests.
- Storage Health panel (#1, commit dee6d96): getStorageHealth (mgr-gated,
  read-only, PHI-free) — all 7 stores' configured/reachable/tz-vs-CONFIG in the
  Admin tab; + operator spreadsheet-map table (#3) in CLAUDE.md. Spreadsheet
  consolidation assessed = NOT advised (boundaries deliberate); consolidated the
  MANAGEMENT surface instead. Operator doing the Drive-folder grouping (#2).

## (historical) Pending — 2026-06-29 operator-feedback session (all items since resolved)
- OPERATOR DEPLOY: `cd web-app && clasp push -f` + New version. ONE deploy ships
  every PR merged this session (#97–#103) + the Manage module / admin tier (#102).
- OPERATOR runAllTests() in the editor — the ONLY check on the #102 admin-gating
  test split (CI can't run the Apps Script suite). Expect 0 failed.
- OPERATOR (optional): set Script Property ADMIN_EMAILS=<your email> to narrow the
  Admin tab + the 29 config/system endpoints + KB content-authoring to just you
  (unset ⇒ admin == manager, today's behavior).
- (Older, only if real for you) ADP spreadsheet tz should be Asia/Kolkata to avoid
  coerced-date drift — carried from a prior cycle; not touched this session.
- Decided/closed: lunch-icon alternatives (apple/crumbs) — staying with the fixed mug.

## P1 hardening batch (commit 1732fa2)
- L-8: getMyCallNotes/Range/searchMyCallNotes → readCallNoteRowsInRange_ (bounded;
  correctness-preserving — the reader finds first/last match across the full date
  column then reads the inclusive block, so order-independent; contiguity is
  efficiency-only).
- L-7: setCallNotePinned pin-count via 2-column scan + "pinned" pre-filter.
- L-10: findCallNoteRow_ row fetch at CN_HEADERS.length (not getLastColumn()).
- L-5: kbUsageCounts_ cutoff in KB ss tz (boundary align). L-4: verifyDocSignature
  `tampered` flag + empdocs client uses it. L-9/L-12/L-13/N-2/M-1-edge: comments.
- NOT taken: forms findFormTokenRow_ getLastColumn() (same class as L-10, out of
  P1 scope) — follow-on.

## Feature builds this session (all on claude/affectionate-cori-q4d2hf, pushed)
- #5 Tag-trend analytics — getCallNotesTagTrends (mgr-gated, cached, PHI-free);
  pure cnTrendWeekStarts_/cnTagTrendsFromEvents_ (Node-pinned); Admin "Tag Trends"
  panel (#cn-admin-trends). Commit 3be0017.
- #4 KB review-due — KB schema +ReviewedAt/ReviewedBy (back-compat header widen);
  kbSaveItem stamps review on save (edit=review); kbMarkReviewed (gated+locked);
  kbGetReviewDue (gated, usage-sorted via factored kbUsageCounts_); 90-day
  threshold (CONFIG.KB.REVIEW_DUE_DAYS); manager "Review due" block. Commit a31ff86.
- #3 Coverage planner — getCoveragePlan (gated, 1–14d, PHI-free, per-tz v1,
  Pending=tentative); pure coverageBucketHours_ (Node-pinned); managerOnly
  `coverage` tab + enterCoverageView. CONFIG.COVERAGE_MIN_STAFF=2. Commit b876e0a.
- All four new endpoints added to test_managerGates_rejectNonManager. Pure
  harness 128→133 green. DOM harness needs npm ci (CI runs it).

## DOC UPDATES NEEDED (run /sync-docs) — beyond the M-1/L-1/L-2 items below
- Add getCallNotesTagTrends / kbGetReviewDue / kbMarkReviewed / getCoveragePlan to
  the INV-31 manager-gated list + the "Manager-only operations" gotcha list.
- New invariants worth adding: tag-trends (cached/bounded/PHI-free), KB review-due
  (edit=review semantics, 90d, legacy UpdatedAt fallback), coverage planner
  (per-tz v1, Pending=tentative, pure bucketing).
- New operator/CONFIG knobs: CONFIG.KB.REVIEW_DUE_DAYS (90), CONFIG.COVERAGE_MIN_STAFF
  (2); new Script Property cache key cn_tag_trends_v1; KB schema gained
  ReviewedAt/ReviewedBy (header self-heals on first post-deploy KB read/save).
- New regression scenarios for #3/#4/#5.

## In progress (facts to carry forward — NOT judgments)
- Cycle 4 /broad-scan ran 2026-06-17: NO Critical/High (mature-codebase signal,
  3rd cycle running). One Medium (M-1 contractor PTO deduction) + Lows.
- /broad-implement done on branch `claude/affectionate-cori-q4d2hf` (pushed).
  Implemented: M-1, L-1, L-2, L-3, L-11 + the missing M-1 regression test (N-1).
- Pure Node harness green (128/0); server `node --check` clean. DOM harness needs
  `npm ci` (jsdom) — not run in this container; CI runs it.

## Completed this cycle
- M-1 | Code.js adjustLeaveBalance_ + Tests.js | per-employee PtoEnabled (col K)
  gate added so contractors aren't deducted; adds test_adjustLeaveBalance_perEmpDisabledNoOp.
- L-1 | Code.js getMyMetrics | result cached per (emp.id, date) for CDR_CACHE_TTL.
- L-2 | Code.js kbGetFacetGuidance | atomic cap check+reserve (kbAiTryReserveSpend_)
  + reconcile/refund (kbAiApplySpend_, renamed from kbAiRecordSpend_).
- L-3 | Code.js intakeDecodeImages_ | robust data-URL parse (require ;base64).
- L-11 | metrics/script_metrics.html mRenderTeamMetrics_ | null-guard teamTotals/reps.

## (historical) Pending — cycle-6 era
- DEPLOY: `cd web-app && clasp push -f` + New version deployment.
- Operator: run runAllTests() in editor (exercises the new M-1 test, S2).
- DOC updates (recommend /sync-docs): M-1 (deduction now per-row gated — reconcile
  S15/INV-27 wording), L-1 (getMyMetrics now result-cached; note vs INV-67 helper
  layer), L-2 (reserve/reconcile spend pattern under INV-119).

## Open follow-on items (NOT taken — out of scope)
- L-4 verifyDocSignature defense-in-depth (audit row is the witness).
- L-5 kbGetUsageStats tz-boundary off-by-one (non-load-bearing).
- L-6 importQuizFromForm multi-answer-checkbox silent single-correct.
- L-7/L-8 setCallNotePinned / searchMyCallNotes / getMyCallNotes unbounded reads.
- L-9 updateCallNote silently drops flag/tag edits (not reachable today).
- L-10 findCallNoteRow_ getLastColumn() width.
- L-12 consentAt == submittedAt; L-13 stale ExpiresAt tz comment.
- N-2 cnNoteMatchesFilter_ 'answered' filter keys off legacy trainingReply (INV-49) —
  add a `// see INV-49` comment at the filter site.
- fixPtoReconciliation can no longer credit a contractor (now ptoEnabled-gated) —
  edge case; remediation for any historical contractor drift is a manual sheet edit.

## Decisions made (so the next session doesn't re-litigate)
- M-1 fix placed in adjustLeaveBalance_ (single chokepoint) — covers updateTimeOffStatus,
  managerSubmitTimeOff, AND fixPtoReconciliation; returns null (callers already handle).
- L-1 cached at the getMyMetrics ENDPOINT layer, NOT the helper — INV-67's "getCdrDailyBreakdown_
  uncached" stays literally true; 5-min TTL matches getMetricsAmbient.
- L-2 reserve = $0.02/call, reconciled to actual; lock NOT held across the vendor fetch
  (the kbResolveDocImages_ lesson). Fails OPEN on lock contention (prior best-effort posture).

## Where I left off
2026-06-29: operator-feedback session (NOT an audit) — all work merged to main
(origin at #103), working tree clean, CLAUDE.md kept current inline + /sync-docs
ran mid-session for the KB-gating change. Merged this session:
- #97 dashboard-feedback batch (compact toggle removed, sidebar→Dashboard,
  rolling-stack flash guard); #98 punch-button animations (press/hover + lunch
  headset↔mug morph) + new punch glyphs; #100 dashboard layout (full-width
  greeting, 2-up metric cards, 1480px, gradient-clock de-boxed, chip overflow);
  #101 Spanish pending-request previews + Today's-Punches/teammate moved to a
  right-column 2-up foot.
- #102 **Manage module + admin tier**: new `manage` TOOLS tool (Manage Time /
  Coverage / Punctuality moved from Time Clock + Admin moved from Call Notes,
  `adminOnly`). empIsAdmin_(email,isManager) — ADMIN_EMAILS set ⇒ that list, unset
  ⇒ isManager (so admin==manager + tests unchanged until set). tabVisibleForUser_/
  toolVisibleForUser_. 29 admin-gated endpoints (the 25 Admin config/system +
  the 4 KB content-authoring: kbSaveItem/kbDeleteItem/kbUploadImage/
  kbConvertDriveDoc). getEnrolledCallNotesReps stays manager (shared). NEW INV-136.
  Reference client authoring (Add/Edit/Delete/Convert) gates on KB_STATE.isAdmin.
- #103 dash/clock batch 3: dashboard SWR cache (kills the focus-driven loader
  flash) + 20s focus throttle; extras → 2-up [Spanish|Requests] / [Training|
  Requests] (new clkDashTrainingCard_, getMyTraining); break chips B1/Lunch/B2
  compact one-row + darker Lunch; renderActions afterLunch ⇒ ClockOut primary;
  coffeeMug handle redrawn (right side, curve outward).
Pure 188/0 + DOM 48/0 green throughout; node --check clean. NEXT = the operator
deploy + runAllTests() + optional ADMIN_EMAILS above. Nothing in-flight on the
code side. A fresh session for NEW work re-derives with fresh eyes (CLAUDE.md is
the current substrate — 136 invariants).
