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

## Pending / not yet done (Cycle 2 audit findings backlog)
- M1 | Code.js ~1026 | pendingTrend reads TO.SUBMITTED_AT via raw String() — Sheets
  coerces (Tests.js:2180 acknowledges) → sparkline always zero. Needs a
  normalizeAuditTs_-style read. Same class (Low): PAR.SUBMITTED_AT / FT.CREATED_AT
  sorts in getMyPunchAdjustRequests / managerGetPendingAdjustments / getMySentForms.
- M3 | tc/script_timeoff.html:297,705 + tc/script_manager.html:529,537,596,621,740,842 |
  unguarded renderLoading in mutation success handlers strands navigated-away views.
- M5 | cn partial ~1746-1796 | cnFetchDeptConfigIfNeeded_ continuations defeat the
  currentView guard (enterCallNotesView/SearchView).
- M6 | cn partial ~7323-7563 | external composer re-render loses cnX-email/subject/
  message (no input-sync listeners).
- M9 | form_public.html:460 | "Date Signed" is UTC date — wrong for US evening signers.
- M8 | intake partial ~450,609 | send success handlers re-render #view-area without
  currentView guard; also INT-3 image-cap race, INT-4 silent agent-fetch failure.
- M10 | Tests.js | 8 missing manager/trigger gate tests (removeAutomationTriggers,
  purgeExpiredFormData trigger gate, saveEmailTemplates, saveExternalLinks,
  getFeatureFlags, saveFeatureFlags, getCallNotesEnrollment, kbSaveItem/kbDeleteItem);
  zero public-token-endpoint coverage.
- LOW backlog (selected): L2 intakeSend* optional bodyHash (carried); L9 Day-Edit
  empId guard; L12 cnFormatNoteForCopy_ $-token corruption; L13 KB tab seq counter /
  save dedupe / silent editor-load failure; L14 metrics tooltip dead CONFIG guard;
  L11 dead timesheet cluster prune; L8 flagOn_ fail-open comment/behavior; F5
  startClock unguarded restarts + enterCallNotesAdminView missing stopClock; L18
  hardcoded 7-day hint in modals.html; T2–T4 test isolation notes.
- (Carried from Cycle 1) KB AI Phase A plan (full spec in git history of this file @
  34835f5); KB Phase 2b/3 (image export — operator must first verify domain-shared
  Drive image renders in HtmlService iframe); P#17 Neon out of scope.
- (Carried) Operator: deploy latest (clasp push -f + New version), run runAllTests()
  once; Script Properties INTAKE_SS_ID, INTAKE_*_EMAIL, FORMS_SS_ID,
  FORM_DATA_RETENTION_DAYS=90, WEB_APP_URL, KB_SS_ID.

## Open follow-on items
- Esc on the KB editor still discards unsaved edits silently (KB-6 residual — a
  uiConfirm guard would be the polish; out of overlay-centralization scope).
- Digest jobs (EOD/weekly/urgent) write no last-run audit rows — Automation Health
  can't surface a silently-dead digest trigger (audit Stage 3, gap #1).
- Audit Stage 3 suggestions on file: never-lose-typed-input invariant (route M4/M6/L19
  through the sticky-draft machinery); universal timestamp-normalize shim + Node
  tripwire; Automation Health staleness warnings.

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
centralization (6bef94b — H1/M7/F6) + M2/M4 (3ac6715). Node harness 89/89. Remaining
Medium backlog: M1, M3, M5, M6, M8, M9, M10 (priority list given to operator
2026-06-11). Operator deploy + an editor runAllTests() pass are still pending for
everything since 501ab67.
