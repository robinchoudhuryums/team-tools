# Cycle State

## Current
Cycle: 3
Phase: implement (broad-scan + targeted hardening batch)
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 1
Updated: 2026-06-15

## Cycle 3 broad-scan (2026-06-15) — defensive hardening batch
Fresh /broad-scan: codebase exceptionally clean (122 invariants, 2 prior cycles).
NO Critical/High found. Top findings were all Low (defense-in-depth / consistency).
Implemented F1,F2,F3,F5,F7 via /broad-implement; skipped F4 (false positive on
close read), F6 (out of requested scope). Node harness 122/122 post-change.
- F1 | form_public.html | null-guard the boot()/submit success handlers (resolved-
  but-null res doesn't trigger withFailureHandler → was a silent frozen-spinner).
- F2 | metrics/script_metrics.html + cn/script_callnotes.html | esc() the CDR-
  boundary fields into innerHTML (hero pct, per-rep table incl. attFormatted, date
  strings, Stats-card CDR numbers, health-panel rowsMatched) — honors the documented
  "Metrics must esc() every server string" invariant. Numbers → output-identical.
- F3 | intake/script_intake.html | null INTAKE_STATE.preview (holds patient-answer
  PHI) on clear + after both send paths (PPD + acct). st captured into a local before
  the RPC, so INV-111 send/hash unaffected.
- F5 | train/script_training.html + train/script_empdocs.html | guard every
  err.message in failure handlers → (err && err.message) || err (ALL occurrences,
  not just the agent subset).
- F7 | cn/script_callnotes.html | add withFailureHandler (console.warn) to
  cnPollAmbient_ — the only RPC in the file lacking one.
RETRACTED: F4 (Day-Edit picker UTC min) — pure calendar arithmetic on the tz-derived
`today` string, no browser-now drift; equivalent to the Adjust modal. Not a bug.
NEXT: operator deploy (clasp push -f + New version) — client-only, no Script
Properties / operator-state change. Then optionally pick up F6 (_clkRemindedBreaks
unbounded, Low) or proceed to /reflect to close Cycle 3.

## jsdom DOM-lifecycle test harness (L item, in progress) — 5-phase plan APPROVED
Operator picked jsdom (over happy-dom / zero-dep) — adds the FIRST dev dependency
(npm ci now required for the DOM harness; pure run.js stays the zero-install floor).
- Phase 0 (spike + decision gate) DONE — GO. jsdom loads the 8k-line CN partial +
  core into a real window via getInternalVMContext (window===globalThis, with a
  REAL document). runScripts:'outside-only' doesn't auto-fire DOMContentLoaded, so
  module-top init listeners stay dormant — load-time side effects tamed for free.
- Phase 1 (foundation) DONE — test/client/harness-dom.js + run-dom.js, 15/15 green.
  Key mechanics: partials share lexical scope across runInContext calls (browser
  <script> semantics), so a trailing BRIDGE (window.__t / h.t) get/sets the
  const/let module state (CN_STATE const, currentView/empState let — NOT reachable
  as ctx props). Programmable google.script.run mock (run.resolve/reject/lastFor/
  countFor). extractMarkup() added to harness.js to mount modals.html for tc views
  (their module-top listeners bind modal nodes). package.json: test:dom + `test`
  runs both. CI workflow wired (npm ci + run-dom.js as a second step; pure step
  stays first as the floor).
- Phases REMAINING:
  - Phase 2 (overlay lifecycle + escape + focus trap) DONE — run-dom.js now 23/23.
    Escape-discipline tests drive mRenderTeamMetrics_ / mRenderMyStats_ /
    cnRenderCardCore_ with a hostile `<img onerror><script>` field and assert NO
    live node + text-survives — PINS the F2/INV-89 class (proven to bite: reverting
    esc(repName) fails the test). Overlay lifecycle: ensureOverlay reuse re-asserts
    `open` (the hidden-but-stateful composer-dead class), Esc closes only the
    topmost via its hook (stacking), closeOverlay degrades to plain-hide on a
    hookless/throwing hook. Focus trap: focusin outside the topmost modal pulls
    focus to its first focusable (jsdom sets activeElement correctly).
  - Phase 3 (optimistic-UI + late-callback guards) DONE — run-dom.js now 29/29.
    6 tests: INV-48 optimistic submit (pending card → confirmed swap, drives the
    FULL cnSubmitActiveForm_ via mockRun) + the 3 revert branches (form empty →
    cnRestoreFromSnapshot_; new typing → untouched; form gone → sticky-draft
    localStorage); INV-56 _flagInFlight double-fire (cnToggleFlag_ — proven to
    bite: removing the guard fails the test); late-callback guard (cnLoadToday_
    resolving after nav-away updates state but skips the render `then`).
  - Phase 4 (docs polish) DONE — README documents the harness; CLAUDE.md Test
    Command section now describes run-dom.js + the bridge/mockRun mechanics; CI
    wired in Phase 1. Determinism: mockRun handlers fire synchronously on
    run.resolve/reject (no real timers in the lifecycle tests).
JSDOM HARNESS COMPLETE (Phases 0-4). Final: 122 pure + 29 DOM green; jsdom is the
only (dev) dependency; clasp never pushes test/. The client overlay/lifecycle bug
class — every prior cycle's High/Med client findings + this cycle's F2 fixes — now
has CI regression coverage. NEXT options: deploy the pending F1-F7 batch, pick up
F6 (_clkRemindedBreaks), extend DOM coverage to more partials (intake/kb/train
optimistic paths) as they change, or /reflect to close Cycle 3.

## F6 + opportunistic DOM coverage (2026-06-15)
- F6 DONE | tc/script_clock.html | clkUpdateBreak_ now resets _clkRemindedBreaks on
  day rollover (new _clkRemindedDay guard) so the per-break-per-day dedupe map can't
  grow unbounded in a long-lived pinned pop-out. Same-day behavior unchanged.
- DOM coverage extended (run-dom.js 29→32): F3 regression pin (intakeClearForm_
  nulls INTAKE_STATE.preview — patient PHI), intake Sent-list escape
  (intakeRenderSentList_ hostile patientInfo), training reader escape
  (trainRenderReader_ hostile embed title). F6 itself is NOT DOM-tested (time/date
  dependent — would need clock mocking; the parse-guard + manual S39 cover it).
- ALL scan findings now closed: F1,F2,F3,F5,F7 (prior batch) + F6 (this). F4
  retracted (false positive). jsdom harness complete.
## Targeted audit + implement: script_tour.html + appsscript.json (2026-06-16)
Audited the two never-individually-scanned subsystems. appsscript.json CLEAN
(executeAs USER_DEPLOYING / ANYONE_ANONYMOUS as designed). script_tour.html:
XSS-clean (step.title/body are static registry strings). 4 Low findings, all
implemented except T-3:
- T-1 DONE | script_tour.html | tourEnsureNodes_ guard checked `tour-root` (an id
  never created → dead guard). Fixed to check `tour-block`. Proven to bite.
- T-2 DONE | script_tour.html | auto-start now gated on a deep-link landing
  (?tool=) inside tourMaybeAutoStart_ — closes the doc/impl drift (the comment +
  CLAUDE.md claimed "never on a deep-link" but only COMPACT_MODE was checked).
  Same predicate as the boot caller. Replay (tourStart) unaffected.
- T-4 DONE | script_tour.html | tourStart captures _tourReturnView=currentView;
  tourEnd_ restores it via enterTool so the tour no longer strands the rep on the
  last step's view (Call Notes / Team Notes).
- T-3 NOT DONE (inherent + benign) | skipped selector steps call enterTool before
  the skip-check — unavoidable (must be on the view to test its selector), and
  skipped steps schedule NO paint (setTimeout only on the show path), so it's
  synchronous + never painted; only cost is wasted re-render for rare skips.
DOM coverage 32→36: script_tour added to the meta-load list; T-1 idempotency +
T-2 gated/contrast tests (setTimeout-spy detects the auto-start schedule).
WHERE I LEFT OFF: T-1/T-2/T-4 + tour DOM tests committed + green (122 pure + 36
DOM). All scan + targeted findings closed (F1-F7 minus F4 retracted; T-1/T-2/T-4;
T-3 noted benign). NEXT: operator deploy the client batch (clasp push -f + New
version; client-only), then close Cycle 3.

## In progress (facts to carry forward — NOT judgments)
- CYCLE 2 CLOSED 2026-06-11 (reflect recorded: metrics.csv + estimates.csv rows,
  PROJECT_HEALTH.md Current Standing + Score History updated). Net +8 (8 prod fixes
  − 0 shipped new failure modes; ~13 defensive; 3 new tripwires). Operator ran
  runAllTests() post-deploy: ALL PASSED (incl. publicForm_tokenLifecycle + the new
  gate cases). Node harness 92/92.
- KB Phase 2b DONE (committed + pushed): converter emits kbdoc:<fileId>:<n> tokens
  per INLINE_IMAGE (cap 20/doc; drawings stay placeholders); kbSaveItem resolves at
  save via kbResolveDocImages_ (mirrored Doc re-walk kbCollectDocInlineImages_ —
  Node-pinned pair; idempotent kbdoc-<fileId>-<n> exports to the KB_IMAGES_FOLDER_ID
  folder, auto-provisioned domain-link-viewable; thumbnail-URL swap; per-token
  placeholder degradation; resolution OUTSIDE the lock). kbMd_ untouched. Node
  harness 98/98. CLAUDE.md: Phase 2b decision + INV-115 + S63 + operator
  KB_IMAGES_FOLDER_ID entry. FIRST DriveApp use — deploy adds the Drive OAuth
  scope (one-time re-auth) and S63's post-deploy spot-check covers the original
  iframe-render gate.
- KB Phase 3 DONE (d5d5de4): kbUploadImage (manager-gated, PNG/JPEG/GIF/WebP — no
  SVG, ~3MB cap mirrored client-side, validation before Drive work, NO ScriptLock,
  KbImageUpload audit row) + element-scoped paste handler on the editor textarea
  with placeholder-token insert/replace (textarea-first, KB_EDIT fallback). Shares
  the Phase 2b KB Images folder (kbpaste-<stamp>-<rand>). INV-118 + S65 added.
  Node harness 99/99.
- KB AI Phase A DONE (operator decisions confirmed: vendor=Anthropic, cap $3/day
  Admin-adjustable, model claude-haiku-4-5 Admin-adjustable): kbGetFacetGuidance
  (rep-callable, kbAiGuidance flag scope-both default-OFF danger, whitelist-only
  facets via kbAiSanitizeFacets_ — dept/updateType/flag/own-tags vocabularies,
  novel values DROPPED; canonical facet-hash 6h cache generation-salted by
  invalidateKbCache_; searchReference retrieval + KB_AI_SCORE_FLOOR; UrlFetchApp
  → Anthropic /v1/messages; usage-token costing via KB_AI_MODEL_PRICES, unknown
  model billed at dearest rates; KB_AI_SPEND daily counter vs KB_AI_DAILY_CAP;
  PHI-free KbAiGuidance audit row; every failure → {none}) + saveKbAiSettings
  (manager-gated, cap 0–100 + model whitelist) + Admin "AI Guidance (Reference)"
  section (cap/model/spend/key-status; model <select> renders from server's
  KB_AI_MODEL_PRICES keys) + drawer Guidance card (kbAiGatherFacets_ — enum
  facets only; collapse-after-seen via umsKbPanel.aiSeen). INV-119 + S66 +
  operator entries (KB_AI_API_KEY / KB_AI_MODEL / KB_AI_DAILY_CAP /
  KB_AI_GENERATION / KB_AI_SPEND). Node harness 105/105 (6 new: whitelist,
  canonical hash, query terms, prompt INV-119 guard, source tripwire); editor
  test test_kbAi_gatesAndSettingsValidation + saveKbAiSettings gate case.
  Operator setup before flipping the flag: set KB_AI_API_KEY + a hard spend cap
  in the Anthropic console.

## Completed this cycle
- AUDIT | (read-only) | Cycle 2 broad scan: 1 High (H1 Esc kills composers), 9 Medium
  (M1–M10), ~20 Low findings; full report in session transcript / chat 2026-06-11.
- OVERLAY | web-app/script_core.html | NEW shared overlay lifecycle: OVERLAY_CLOSE_HOOKS
  registry + ensureOverlay(id,{onClose,extraClass}) (always re-asserts `overlay open`
  on reuse; wires backdrop-click→closeOverlay in creation branch) + closeOverlay(el)
  (runs registered hook, falls back to class strip; throwing hook degrades to hide) +
  topOpenOverlay_() (LAST `.overlay.open` in DOM order). Esc handler now closes the
  TOPMOST overlay through its hook (was: FIRST match, class strip only).
- OVERLAY | web-app/cn/script_callnotes.html | cnRenderComposerModal_,
  cnRenderExternalEmailModal_, cnRenderFormSubOverlay_ migrated to ensureOverlay with
  their close fns as hooks. FIXES H1: Esc used to leave the composer overlays
  hidden-but-stateful → every later compose rendered into a hidden node until reload;
  Esc also now clears CN_STATE.composer/extComposer (stale-noteId side effect gone).
- OVERLAY | web-app/intake/script_intake.html | intakeOpenModal_ migrated to
  ensureOverlay with intakeCloseModal_ hook. FIXES M7: Esc-closing the PMD/PAP preview
  leaked the document-level paste listener app-wide (silent PHI image accumulation).
- OVERLAY | web-app/kb/script_kb.html | kbRenderEditor_ migrated (kbCloseModal_ hook);
  consistency + Esc now removes the editor node. (kb partial contains raw NUL-byte
  fence sentinels — edited via exact-match Edit, harness confirms intact.)
- DOCS | CLAUDE.md | "Modals close on Escape" gotcha rewritten: topmost-overlay rule,
  ensureOverlay/closeOverlay contract, new-overlay requirement (never hand-roll
  createElement + className), idempotent onClose requirement.
- M2 | web-app/script_core.html | uiConfirm Enter now resolves CANCEL when the Cancel
  button is focused (closest('.ui-dialog-cancel') check); OK anywhere else. Commit 3ac6715.
- M4 | web-app/cn/script_callnotes.html | cnRevertPendingSubmit_ restores only into an
  EMPTY form (same 5-field check as Ctrl+Z); with new typing → leaves form alone
  (clipboard holds the failed note); after nav-away → parks snapshot via NEW
  cnSaveSnapshotAsStickyDraft_ (sticky-draft shape + at stamp, restores on next Log
  enter). Callers' toast text moved into the function (outcome-specific). Commit 3ac6715.
- M1 | Code.js, Tests.js, run.js | ALL TO/PAR.SUBMITTED_AT reads route through
  normalizeAuditTs_ (incl. BOTH match-key sides in updateTimeOffStatus /
  cancelTimeOffRequest + the Tests.js helper + the fixPto test read-back); fixes the
  always-zero pending-trend sparkline + adjustment-queue sort. Node tripwire bans raw
  String() reads of those columns. Commit 7981f2e.
- M3 | script_core.html, tc/script_timeoff.html, tc/script_manager.html | NEW
  refreshViewIfCurrent(viewKey,msg,reloadFn) helper; all 8 mutation success handlers
  converted (no more stranded spinners on nav-away). Commit 7981f2e.
- M5 | cn partial | enterCallNotesView / enterCallNotesSearchView guard the
  cnFetchDeptConfigIfNeeded_ continuation on requestedView. Commit 7981f2e.
- M6 | cn partial | cnX-email/subject/message input-sync listeners; cnExtAutoUpdateSubject_
  writes c.subject back. Mode toggle no longer wipes typed fields. Commit 7981f2e.
- M8+INT-3/4/5 | intake partial | send + sent-detail success handlers currentView-guarded
  (state-only image reset on nav-away); image cap re-checked inside FileReader.onload;
  agent-fetch failure toast. Commit 7981f2e.
- M9+FP-2 | form_public.html | Date Signed = signer's LOCAL date; expiry display shows
  the stored calendar day (no browser-tz reparse). Commit 7981f2e.
- M10 | Tests.js | 8 new gate cases in test_managerGates_rejectNonManager
  (saveEmailTemplates, saveExternalLinks, getFeatureFlags, saveFeatureFlags,
  getCallNotesEnrollment, kbSaveItem, kbDeleteItem, verifyFormSubmissionIntegrity_);
  2 new trigger-gate tests (purgeExpiredFormData, removeAutomationTriggers);
  NEW test_publicForm_tokenLifecycle (consent enforcement, size caps, hash/consent
  stamping, one-time use; self-cleaning). Commit 7981f2e.
- #8 | Code.js, cn partial, CLAUDE.md | Digest heartbeats: stampDigestLastRun_ →
  Script Property AUTOMATION_DIGEST_LAST_RUNS on each eod/weekly/urgent run;
  getAutomationHealth returns digests[] w/ staleness (eod>2h, urgent>26h, weekly>8d);
  health panel renders a "Digest heartbeats" block. Commit 7981f2e.
- LOW BATCH | Code.js, Tests.js, script_core, modals, tc/clock+manager+timesheet,
  cn, metrics, kb partials | hygiene batch — see commit 6a89aaa message for the
  per-item list. Notable contracts: intakeSend* bodyHash now REQUIRED (INV-111
  amended); flagOn_ unknown-key fails closed after map load; tc/script_timesheet.html
  is now ONLY computeRange/isoFromMs (INV-74 amended); kbSaveFromEditor_ takes the
  button arg for dedupe.

## Pending / not yet done (Cycle 2 audit findings backlog)
- ALL Medium findings (M1–M10) DONE; LOW hygiene batch DONE (6a89aaa: L2 bodyHash
  required, L3 export sharing, L8 flagOn_ fail-closed, L9 Day-Edit empId guard,
  L11 dead-code prune incl. timesheet cluster, L12 copy token substitution, L13 KB
  tab polish, L14 metrics tooltip threshold, F5 interval hygiene, L18 dynamic
  reason-threshold copy, T4 archive-test finally). Remaining audit Lows NOT taken
  (accepted/deferred): T2 (reconcile runs for real in tests — benign by design),
  T3 (finally-on-timeout — unfixable in Apps Script), L19 (composer tab-switch
  typed-input loss), KB-6 residual (Esc discards editor edits without confirm),
  X1/KB-5 inline-onclick JS-string contexts (inert, UUIDs), L16 signature canvas
  rotate overflow, FP-4/FP-5 public-form niceties, M2-class Esc-ordering for
  stacked static modals (covered by topmost fix).
- KB AI Phase A SHIPPED (see In progress above). Phase B (Tier-2 ask box, spec @
  34835f5) stays NOT BUILT — gated on observed demand (zero-result/question
  signal); P#17 Neon out of scope.
- (Carried) Operator: deploy latest (clasp push -f + New version), run runAllTests()
  once; Script Properties INTAKE_SS_ID, INTAKE_*_EMAIL, FORMS_SS_ID,
  FORM_DATA_RETENTION_DAYS=90, WEB_APP_URL, KB_SS_ID.
- THREAD (2026-06-12): Training & Employee Docs. Spec APPROVED — all §9
  operator decisions resolved IN the spec (no ADP overlap — audience is
  non-US; PIP ack signature confirmed OK; manager visibility = PER-TEAM via
  NEW roster column M `ManagerEmail`, fail-closed, ROSTER_CACHE_KEY v5→v6 at
  T3; quizzes = unlimited retries, NEVER reveal answers, track attempts;
  label "Training & Employee Docs"). **T1 SHIPPED** (training core): server
  layer at the end of Code.js (TrainingAssignments/TrainingCompletions tabs
  auto-provision in KB_SS_ID; getMyTraining/markTrainingComplete caller-scoped;
  getTrainingDashboard/saveTrainingAssignment/revokeTrainingAssignment
  manager-gated; re-assign resets completion; coercion-guarded reads), client
  `train/script_training.html` (trainingHome + trainingManage tabs, reader
  modal reuses kbMd_ + kbRecordView('training')), TOOLS entry `develop`,
  INV-120 + S67 + design decision in CLAUDE.md, gate cases + 
  test_training_assignCompleteFlow in Tests.js, Node 105→109. **T2 SHIPPED**
  (quizzes): Quizzes/QuizAttempts tabs (auto-provision, KB_SS_ID); pure
  trainValidateQuizDef_/trainGradeQuiz_/trainStripQuizForRep_ (Node-pinned;
  the strip is WHITELIST-built and getQuiz has a source tripwire — INV-121
  answer keys never leave the server); getQuiz/submitQuizAttempt rep-callable
  assignment-required (grades server-side, pass → completion via='quiz' once
  per assignment round, attempt counts per round — reset semantics extend to
  attempts); getQuizzes/saveQuiz/deleteQuiz manager-gated (+gate cases);
  client quiz-taking modal (never shows correct answers, unanswered-confirm,
  retake-on-fail) + quiz editor modal (snapshot-before-rerender, the
  cnRenderSubforms_ lesson) + Quizzes table + quiz optgroup in the assign
  picker + attempt counts on checklist/matrix. test_training_quizFlow;
  Node 109→113. INV-121 + S68 + CLAUDE.md/README/spec updated. **T3
  SHIPPED** (employee docs — module COMPLETE): EMP.MANAGER_EMAIL col M +
  ROSTER_CACHE_KEY v6; HR_DOCS_SS_ID dedicated store (getHrDocsSS_ NO
  fallback — friendly error when unset); EmpDocs/DocSignatures tabs
  auto-provision; issueDoc (frozen markdown + contentHash; reuses
  kbConvertDriveDoc for Doc-authored bodies) / getMyDocs+getMyDoc
  (owner-or-authorized-manager) / acknowledgeDoc (OWNER-only, locked,
  content-hash gate, ≤600px pad export, append-only DocSignatures w/
  SignatureHash excl. timestamp — audit row is the witness, ack version
  stamped) / getDocsDashboard+voidDoc+verifyDocSignature (manager-gated
  AND team-scoped via empDocCanManagerSee_ — issuer OR column-M manager,
  FAIL-CLOSED on blank). Client train/script_empdocs.html (myDocs +
  docsManage tabs; sign modal w/ reveal-resize canvas; issue form;
  verify/void). test_empdocs_issueSignVerifyFlow (fixture
  TEST_HRDOCS_SS_ID) + 4 gate cases; Node 113→117 (validator/chip/
  pad-cap parity). INV-122 + S69; CLAUDE.md operator entries
  (HR_DOCS_SS_ID + column M + v6 cache note). Spec status: COMPLETE.
  Operator BEFORE T3 use: set HR_DOCS_SS_ID + fill column M; then
  deploy + runAllTests() + S67/S68/S69 walks. T4 (overdue digests,
  snapshot-PDF signing, quiz analytics) stays on-demand.

## Open follow-on items
- Esc on the KB editor still discards unsaved edits silently (KB-6 residual — a
  uiConfirm guard would be the polish; out of overlay-centralization scope).
- Audit Stage 3 suggestions still open: never-lose-typed-input invariant for the
  composer tab-switch path (L19 — M4/M6 are done); FT/FS timestamp columns
  (T-format, stored as text today) excluded from the M1 tripwire — extend it if a
  coercion ever shows up there.

## Decisions made (so the next session doesn't re-litigate)
- Overlay lifecycle: hooks registry in script_core is the single close path; static
  modals keep class-strip behavior (no hooks — they hold no module state). New dynamic
  overlays MUST use ensureOverlay. onClose must be idempotent.
- Esc topmost = LAST `.overlay.open` in DOM order (now matches the focus trap).
- ui-dialogs (uiConfirm/uiPrompt) stay OUTSIDE the registry — their capture-phase
  handler with stopPropagation already owns Esc/Enter for the dialog lifetime.
- (Carried) external anonymous web-app access is admin-blocked — not a code bug;
  absent `_meta` rejected; FormTokens timestamps in CONFIG.TIMEZONE; punch ordering
  fixed at source; sticky drafts 24h TTL.

- ONBOARDING TOUR SHIPPED (2026-06-13): hand-rolled coach-marks in
  web-app/script_tour.html (new Client-shell partial). Spotlight engine
  (#tour-block/#tour-spot/#tour-pop on document.body), declarative
  TOUR_STEPS registry (tool/view/selector/title/body/managerOnly?),
  enterTool navigation per step, absent-target skip, managerOnly filter.
  Auto-starts once per TOUR_VERSION (umsTour.seenVersion; not in compact
  pop-out / deep-link) via tourMaybeAutoStart_ in the boot handler;
  replay button in the cn-shortcuts (?) overlay. v1 = 14 steps across
  Time Clock + shell + Call Notes + a managers-only closer. Node tripwire
  pins every step view to a TOOLS tab key (122/122). localStorage key
  count 8→9 (umsTour); CLAUDE.md decision + key-list + subsystem + README.
  Also this session: r1 ergonomics (trio row, 1-line autogrow fields,
  borders, flag tints, red Clear, Enter-nav, select-on-focus, undo-save,
  heuristic tag suggest, managerDeleteCallNote), r2 (2×2 save quadrant +
  ? fab, card icon tints, 3-up dept grid, Save&Compose envelope, arrow
  field-hop, KB link hover card, drawer search spinner), r3 (transactional
  Save&Compose + stale-ref fix, Ctrl+Shift+C, delete loader, thumbsUp).
  Plus the two operator bugfixes (invisible ::selection → --selection-bg;
  blank pop-out → SERVER_WEB_APP_URL).

## Where I left off
Cycle 2 CLOSED; KB Phase 2b + Phase 3 + KB AI Phase A all SHIPPED on
`claude/affectionate-dijkstra-js8rlm` (Node 105/105). NEXT: operator deploy
(clasp push -f + New version + ONE-TIME re-auth for the Drive scope), run
runAllTests() once (new: kbAi_gatesAndSettingsValidation + the saveKbAiSettings
gate case), then the S63 + S65 walks. For Phase A (S66): set Script Property
KB_AI_API_KEY + a hard spend cap in the Anthropic console, flip the kbAiGuidance
feature toggle in Admin, and walk S66. Roadmap after that: KB AI Phase B (gated
on demand) or /broad-scan to open Cycle 3.
