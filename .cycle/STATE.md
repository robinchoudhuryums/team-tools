# Cycle State

## Current
Cycle: 3
Phase: implement (DOM harness Phases 1-3 DONE; Training T4 partial DONE)
Scope: Test Suite (test/client/dom/) — building out the DOM-lifecycle harness
Test Command: manual (+ `npm test` now runs BOTH client harnesses)
Subsystem cycles since last Seams audit: 1
Updated: 2026-06-16

## In progress (facts to carry forward — NOT judgments)
- CYCLE 3 OPENED 2026-06-16 (/broad-scan). Fresh full read (3 server + 2 client
  sub-audits + personal verify): NO Critical/High production bugs. Top finding
  S1.1 (Medium, latent): AuditLog/SUBMITTED_AT timestamps are WRITTEN in
  CONFIG.TIMEZONE (Asia/Kolkata) but RECOVERED by normalizeAuditTs_ in the
  ADP-sheet tz — a coupling that only round-trips while those two tzs match.
  Other Lows: S2.1 submitFormByToken fail-OPEN on unparseable ExpiresAt (PHI
  write); S1.3 Reconciled→Approved re-deduct; C1 KB-AI "today" via UTC
  toISOString; S1.2 dashboard punchDate raw String(); C4 no escaping test-pin
  for buildFormSubmissionCardHtml_. Full report in this session's chat.
- DOM-LIFECYCLE HARNESS — PHASE 1 DONE (this branch, committed + pushed):
  test/client/dom/boot.js (jsdom boot — real shell skeleton from modals.html +
  #app/#toast-stack, loads all 13 partials, controllable google.script.run with
  independent chains + flushSuccess/flushFailure/respond/drain, bootShell,
  dispatchKey/click/setField, read() for lexical bindings, flushTimers) +
  dom/runDom.js (run-mock unit checks + all-partials-load + full shell boot +
  Call Notes Log render smoke = 7/7). jsdom devDependency; npm test runs both
  harnesses; CI does npm ci + both suites. Pure harness unchanged (122/122).
  Two stubs needed for load: window.setTimeClockMode / syncThemeToggleState
  (index.html <head> globals renderShell calls by bare name).
  PHASE 2 DONE (this branch): overlay + dialog lifecycle suite in dom/runDom.js
  (15 tests) — ensureOverlay create/reuse (hidden-but-stateful guard), Esc
  closes TOPMOST through its hook, throwing-hook degrade, Esc-with-no-overlay →
  KB drawer; uiConfirm Esc/backdrop/Enter-on-OK/Enter-on-Cancel(INV-83)/resolved
  sentinel, uiPrompt validator keep-open, dialog-over-base owns Esc
  (stopPropagation, base hook not run); focus-trap pull-back, #kb-drawer trap
  exemption, drawer survives a #view-area rewrite. dispatchKey default target →
  document.body (real capture→bubble path the capture-phase dialog handlers
  need). DOM suite 7→22; pure harness still 122. These pin the Cycle-2 audit's
  H1/M2/topmost-Esc/drawer findings as automated regressions.
  PHASE 3 DONE (this branch): optimistic-UI / RPC-sequencing suite (9 tests) —
  empty-form no-RPC; optimistic submit (pending card + form clear before RPC);
  submit success replaces the array slot AND re-points lastSaveUndo.note at the
  confirmed note (the stale-pending-object regression); failure revert into an
  empty form vs. leave-new-typing-untouched; _flagInFlight drops a double
  toggle to ONE RPC (INV-56) + flag-failure revert; M5 nav-away-during-dept-
  fetch suppresses the notes load; transactional Save & Compose cancel sets
  _deleteOnConfirm and the save-confirm fires the rollback deleteCallNote.
  Harness add: spec-accurate isContentEditable getter on HTMLElement.prototype
  (jsdom returns undefined; the shipped cnGetFieldValue_/cnSetFieldValue_ branch
  on it for the .ce divs). DOM suite 22→31; pure harness still 122. Harness
  build-out COMPLETE (all 3 phases). NEXT: Cycle 3 audit-findings backlog
  (S1.1/S2.1/S1.3/C1/C4) awaiting operator selection, or close the cycle.

- TRAINING T4 (partial) DONE 2026-06-16 (this branch, committed + pushed) —
  operator chose Overdue digests + Quiz analytics; snapshot-PDF signing
  deferred. Server: getQuizAnalytics (manager-gated, read-only) + pure
  trainQuizAnalytics_ (per-quiz attempts/distinct-reps/passRate/avgScore/
  avgTries, no answer keys — INV-121 intact); sendTrainingOverdueDigest
  (top-level trigger, assertManagerCaller_ INV-44, best-effort INV-14) built
  PER MANAGER — org-wide overdue training (INV-120 not team-scoped) + overdue
  unsigned docs scoped via empDocCanManagerSee_ (INV-122), empDocsOverdueAll_
  returns [] if HR_DOCS_SS_ID unset; heartbeat 'trainingOverdue' (stale>26h);
  wired into install+remove TARGETS (now 9 triggers, daily mgr-tz 7am).
  Client: Team Training fires a 5th RPC (getQuizAnalytics) + renders an
  analytics table below Quizzes (degrades to no-panel on error). Tests: Node
  trainQuizAnalytics_ (123), trigger-wiring tripwire still green; editor
  test_triggerGate_trainingOverdue + getQuizAnalytics gate case added.
  INV-123 added; CLAUDE.md (gate list, trigger gotcha, INV-44 7→8, operator
  triggers 8→9, heartbeat note, Training module T4 status) + spec T4 row.
  OPERATOR: re-run installAutomationTriggers() to add the 9th trigger; deploy.

- OPERATOR FEEDBACK THREAD (2026-06-16) — Log + Metrics polish, planning
  APPROVED. Sequence (~14-18h): S1 diagnose #1 (DONE); S2 #2 caller-format
  `Name (relation)` card-only, hide when self + #3 live-refresh rolling stack
  (ambient + focus, merge pending); S3 #4 pop-out (widen default 380->~480,
  persist geometry NEW 10th localStorage key umsPopoutGeom, sticky collapsible
  bottom action bar, compact icon-only flag rail, collapse cn-head stats-mini
  in compact); S4 #5 anonymized team-avg on My Stats (rep-callable aggregate,
  N=3 min-cohort guard) + #6 own-vs-team trend overlay for % Answered/Answered/
  Missed/Transfers/Avg Talk — Transfers from a SEPARATE "CSR Transfer
  Historical Data" tab in the CDR Report ss (schema TBD from operator).
  Decisions: #2 keep paste/email structure unchanged (card aesthetic only);
  #4 sticky bar collapsible + icon flag rail approved.
- STEP 1 DONE (this branch, committed 765bc6d): 2 DOM-harness diagnostic tests
  prove the CLIENT re-fetch-on-Log-enter + render path is sound (notes do NOT
  vanish on nav-back in current code). => #1 is midnight-rollover (Log is
  strictly today; History is ranges) OR deployed-version lag, NOT a client bug.
  Pure 123 / DOM 33. NEXT: operator redeploys current code + retests #1; if it
  still repros same-day, capture steps+times+rep tz (server today-derivation);
  if only across midnight, product decision (strict-today vs rolling window).
- STEP 2 DONE (this branch): #2 cnCallerDisplay_ helper (bold caller + (relation)
  muted, suppressed for self/blank, XSS-escaped) wired into BOTH card renderers
  (rep + manager read-only); CRM paste/email structure UNCHANGED (card aesthetic
  only). #3 live-refresh: cnRefreshRollingStack_ (re-fetch today's notes + merge,
  preserving optimistic _pending, skipped mid inline-edit, requestedView-guarded)
  called from the 60s ambient poll on the Log view + bound to window focus/
  visibilitychange (2s throttle, no-op off Log, idempotent bind). 4 DOM tests
  (caller format + refresh surfaces other-context note + pending preserved +
  edit-guard). Pure 123 / DOM 37. Minor follow-on: refresh re-renders #cn-stack
  every 60s — could diff-before-render to avoid a scroll jump (stack is small,
  accepted for now).
- STEP 3 DONE (this branch): #4 pop-out. Robust core: popOutCurrentView widened
  default 380x780 -> 480x800 + reads persisted geometry; pure popoutParseGeom_
  (range-guarded, Node-pinned) + popoutPersistGeometryInit_ (compact only,
  resize-debounced + beforeunload, writes umsPopoutGeom — NEW 10th localStorage
  key). Compact-only additive CSS (data-compact gated, wide mode untouched):
  icon-only 4-across flag rail (.flag-lbl wrapped + hidden, title/aria carry
  meaning), sticky collapsible save card (#cn-save-card position:sticky bottom +
  .cn-save-collapse chevron toggles .collapsed). stats-mini already hidden in
  compact (no-op, confirmed). Pure 124 / DOM 37. NOTE: the compact VISUAL bits
  (icon rail + sticky bar) are jsdom-unverifiable (no layout) — need operator
  eyeball in the real pop-out; the geometry helper + widen are solid/tested.
  Docs: CLAUDE.md key-count 9->10 + umsPopoutGeom entry + pop-out 380->480
  decision rewrite. NEXT: S4 metrics (#5/#6) — operator to provide "CSR Transfer
  Historical Data" sheet schema.

### (Cycle 2 history — carry forward)
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
Cycle 3 OPENED (/broad-scan). DOM-lifecycle harness Phase 1 (boot infra)
SHIPPED on `claude/affectionate-cori-90q3ap`: test/client/dom/{boot,runDom}.js,
jsdom devDependency, CI wired, README + package-lock. `npm test` green (122 pure
+ 31 DOM after Phase 3 — harness COMPLETE). NEXT: Cycle 3 audit-findings backlog
(S1.1 tz coupling, S2.1 fail-open expiry, S1.3, C1, C4) NOT yet implemented —
awaiting operator selection.

---
(Below: prior Cycle 2 close note, retained.)
Cycle 2 CLOSED; KB Phase 2b + Phase 3 + KB AI Phase A all SHIPPED on
`claude/affectionate-dijkstra-js8rlm` (Node 105/105). NEXT: operator deploy
(clasp push -f + New version + ONE-TIME re-auth for the Drive scope), run
runAllTests() once (new: kbAi_gatesAndSettingsValidation + the saveKbAiSettings
gate case), then the S63 + S65 walks. For Phase A (S66): set Script Property
KB_AI_API_KEY + a hard spend cap in the Anthropic console, flip the kbAiGuidance
feature toggle in Admin, and walk S66. Roadmap after that: KB AI Phase B (gated
on demand) or /broad-scan to open Cycle 3.
