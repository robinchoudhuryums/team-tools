# Cycle State

## Current
Cycle: 2
Phase: implement
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 0
Updated: 2026-06-11

## In progress (facts to carry forward — NOT judgments)
- Cycle 2 opened with a fresh /broad-scan (2026-06-11): full Code.js read + 4 sub-audits
  (tc/shell, CN, metrics/intake/kb/forms, tests). Node harness 89/89 at scan time.
- First implementation slice DONE: overlay-lifecycle centralization (the audit's top
  strategic suggestion — root-cause fix for findings H1, M7, F6/L7, and the KB editor
  Esc bypass). Committed on `claude/affectionate-dijkstra-js8rlm`.
- Next concrete step: operator picks the next findings slice (suggested order:
  M2 uiConfirm Enter-on-Cancel; M4 optimistic-revert clobber; M1 pendingTrend
  SubmittedAt coercion; M3 unguarded renderLoading; M5 cnFetchDeptConfigIfNeeded_
  guard layering; M6 external-composer field loss; M9 form_public UTC sign date;
  M8 intake send-success view clobber; M10 missing gate tests).

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
- (Carried from Cycle 1) KB AI Phase A plan (full spec in git history of this file @
  34835f5); KB Phase 2b/3 (image export — operator must first verify domain-shared
  Drive image renders in HtmlService iframe); P#17 Neon out of scope.
- (Carried) Operator: deploy latest (clasp push -f + New version), run runAllTests()
  once; Script Properties INTAKE_SS_ID, INTAKE_*_EMAIL, FORMS_SS_ID,
  FORM_DATA_RETENTION_DAYS=90, WEB_APP_URL, KB_SS_ID.

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

## Where I left off
Cycle 2, implement phase. Done on `claude/affectionate-dijkstra-js8rlm`: overlay
centralization (6bef94b), M2/M4 (3ac6715), Medium slice M1/M3/M5/M6/M8/M9/M10 +
heartbeats (7981f2e + 2b2224e key fix + d075bad tripwire), LOW hygiene batch
(6a89aaa). Node harness 92/92. The ENTIRE Cycle 2 audit backlog (High + Medium +
selected Lows) is closed. Operator is running runAllTests() against the
pre-this-session deploy — note the suite on disk now includes the new gate tests +
publicForm_tokenLifecycle, which need a clasp push before they exist in the editor.
NEXT: operator deploy (clasp push -f + New version) + a post-push runAllTests();
then /reflect to close the implement phase, or proceed to Tier-4 roadmap (KB Phase
2b iframe check → image export → Phase 3 → KB AI Phase A).
