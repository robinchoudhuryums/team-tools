# Cycle State

## Current
Cycle: 6
Phase: implement — non-AI KB enhancements #1+#2 (self-improving-KB loop) on claude/broad-scan-2ll5ok
Scope: KB (Reference tool) content-gap requests + rep freshness signal
Test Command: manual
Subsystem cycles since last Seams audit: 5
Updated: 2026-07-01 (broad-implement: KB #1 content-gap requests + #2 rep freshness signal)

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
- NOT YET: committed/pushed. NEXT in sequence = #4 (article revision history +
  draft→publish), then #6/#5 (rep-facing: snippets, bookmarks).

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

## Pending / not yet done (current — 2026-06-29 operator-feedback session)
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

## Pending / not yet done
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
