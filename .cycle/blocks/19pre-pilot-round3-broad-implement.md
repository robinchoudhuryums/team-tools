# Pilot-feedback roadmap round 3 + full-matrix re-shoot — broad-implement block
# (between-cycles operator work, pre-cycle-19; branch claude/team-tools-roadmap-6e2l97)

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- R3-#7 | Intake arrow-key field navigation (the CN boundary-hop pattern on PPD + PMD/PAP text fields)
- R3-#5 | Server-backed personal scratchpad (per-rep CN spreadsheet `Scratchpad` tab; CN header fab + autosave modal)
- R3-#6 | Reference comments Phase A (append-only `KbComments` tab; Reference-TAB reader only — drawer stays comment-free)
- SHOOT | Full 47-scenario matrix re-shoot + two new sched-modal variants (dark-wide, light-compact) — every PNG eyeballed
- VIS-1 | CN header fabs grouped into ONE `.cn-head-fabs` grid item (bare buttons scattered across grid rows — measured)
- VIS-2 | Sched modal's `.cn-act-btn`s given a scoped token-based rule (they rendered as UNSTYLED native buttons — glaring
          white boxes in dark mode, caught the moment the new dark variant was shot; a round-2 latent this round's scope
          existed to catch)

Files modified: web-app/Code.js, web-app/Tests.js, web-app/cn/script_callnotes.html,
web-app/kb/script_kb.html, web-app/intake/script_intake.html, test/client/run.js,
test/visual/mock.js, test/visual/shoot.mjs

CHANGES:
R3-#7 | intake/script_intake.html | `intakeCaretAtEdge_` / `intakeNavFields_` / `intakeArrowNav_`; keydown bound at BOTH
        the PPD enter and `intakeEnterAcct_`. ArrowDown at end / ArrowUp at start hops to the next/prev visible text
        field; modifiers, selects, radiogroup chips, date steppers, and mid-text arrows are untouched; no wrap.
R3-#5 | Code.js + cn/script_callnotes.html | `scratchpadSheet_` (provisions with `setNumberFormat('@')` — plain-text pin
        defeats cell coercion), `getMyScratchpad`, `saveMyScratchpad` (USER lock — the kbRecordView posture, documented
        INV-01 exception; over-cap REFUSES before any write; epoch-ms NUMBER stamp; no audit row — high-frequency
        own-store, documented). Client: `cn-scratch-btn` fab + named `ensureOverlay` modal, 800ms debounced autosave with
        saving/queued serialization, flush-on-close (INV-148), failed save keeps dirty + visible warn status, both load
        failures render `errorStateHtml_`. Per-rep isolation BY CONSTRUCTION (the tab lives in the rep's own CN sheet).
R3-#6 | Code.js + kb/script_kb.html | `KbComments` tab (`getOrCreateKbCommentsSheet_`), `kbAddComment` (locked, cap-refuse,
        draft-target invisible via the `getReferenceItem` boundary — 'Not found.', existence never leaks), `kbGetComments`
        (bounded tail, active-only, `{comments, total, cap, canModerate}` — INV-169), `kbDeleteComment` (soft-delete,
        author-or-manager, refusal string deliberately NOT the manager-gate literal, idempotent). Audit rows carry
        commentId ONLY (INV-32 — comment text never reaches the shared AuditLog; pinned). Client: comments block in BOTH
        reader branches, esc()'d throughout, "you" pill, named add form + PHI-free-by-policy line, cap note, uiConfirm
        danger delete, L-18 stale-item guard, A12 error cards ×2. Drawer deliberately comment-free (INV-139 parity shape).
SHOOT | test/visual/shoot.mjs + mock.js | `cn-sched-modal-dark-wide` + `cn-sched-modal-light-compact` via the `post` hook;
        fixtures for getMyScratchpad / kbGetComments / kbAddComment / kbDeleteComment (shape-pinned DERIVED from the
        server's own return/push literals — INV-185). Full 47-scenario run: 0 missing fixtures, 0 overflowPx, no
        non-documented console errors; every PNG eyeballed (CN scenarios twice — pre- and post-VIS fixes).
VIS-1 | cn/script_callnotes.html | `.cn-head-fabs` flex wrapper around the three fabs + CSS ( `.cn-head` is
        `1fr auto`, so each bare button was its own grid item).
VIS-2 | cn/script_callnotes.html | `.cn-sched-modal .cn-act-btn` scoped rule mirroring the card-actions treatment
        (var(--line)/--muted/--paper-2/--ink/--border-strong, --radius-pill per batch J); re-shot all three modal
        variants and verified in dark.
TESTS | Tests.js + run.js | Editor: `test_scratchpad_saveReadRoundTrip` (coercible-looking marker text round-trips
        byte-exact; over-cap refuse leaves content untouched; unenrolled 'not configured'; finally deletes the fixture
        tab) + `test_kb_comments_flow` (add → audit notes carry commentId but NOT the secret text → mine/canModerate →
        foreign delete refused → author soft-delete → over-cap → draft target 'Not found'); cleanupTestData sweeps
        KbComments (live by EMP_ID + fixture). Pure harness: 7 new pins, 612 → 619, EVERY mutation bite-checked
        (9 mutations, 9 bites after one strengthen — the caret-edge pin needed a boundary-anchored-selection case
        before its guard-removal mutation bit).

TEST RESULTS: pure 619/619, DOM 75/75, `node --check` clean on Code.js/Tests.js.
Regression-scenario walk (Test Command = manual; scenarios overlapping modified subsystems):
- S1/S2 — NOT APPLICABLE off-editor; the two NEW integration tests run at the owed post-deploy `runAllTests()`.
- S18/S25 (CN submit/copy, compact/pop-out) — PASS: all 10 CN scenarios re-shot post-fix, overflowPx 0, form/stack
  markup untouched by the header change (pinned).
- S59/S60 (Intake) — PASS: arrow nav binds only ArrowUp/Down on text inputs/textareas (pinned guards); intake renders
  re-shot clean.
- S62 (Reference) — PASS: comments render below the reader in both branches, esc()'d, named add form.
- S64 (drawer) — PASS: drawer reader never loads comments (pinned).
- S86 (KB inertness) — PASS: comment text renders through esc() (pinned ×3); DOM fence tests green.

REGRESSION RISKS: intakeArrowNav_ changes ArrowUp/Down behaviour ONLY at the literal first/last caret position of a
text field (the accepted CN pattern); mid-text and in-textarea line navigation unchanged. All three server families are
additive endpoints — no existing signature, return shape, or default changed. The sched-modal CSS is scoped to
`.cn-sched-modal` only. Otherwise none.

INVARIANTS AT RISK: None violated. Checked: INV-01 (locks + finally; saveMyScratchpad is a documented USER-lock
exception, the kbRecordView posture), INV-32 (id-only audit rows — pinned), INV-96 (over-cap refuses — pinned + editor),
INV-140/147 (draft comment targets invisible; existence never leaks), INV-169 (total/cap + client note), INV-175/A12
(errorStateHtml_ ×4), INV-83/A14 (named overlays), INV-148 (flush-on-close), INV-21 (KbComments + Scratchpad sweeps),
INV-128 (token tripwire green over the new CSS), INV-185 (derived fixture-shape pins), INV-136 (count UNCHANGED — no
admin endpoints added).

NET SCORE: 0 − 0 = 0 (three capabilities + two pre-deploy visual catches; nothing here was ever deployed, so neither
visual defect could have fired in production this month — strict per the cycle-17/18 correction pattern).

OPERATOR ACTIONS / DEPLOY:
- The ONE standing combined deploy (PR #176 + #177 + all pilot rounds incl. this one): `cd web-app && clasp push -f`,
  then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy | BLOCKS DEPLOY: Y
- Post-deploy `runAllTests()` — now ALSO covers `scratchpad_saveReadRoundTrip` + `kb_comments_flow` (alongside
  `scheduledCalls_flow` + the Spanish claim/release gate cases) | BLOCKS DEPLOY: N (post-deploy verification)
- Round-1 email spot-check (dept + intake email: From name + Reply-To) | BLOCKS DEPLOY: N
Deploy: Server + all client partials + Test Suite ship on that single `clasp push -f` + New version.

FOLLOW-ON ITEMS:
- Reference comments in the Ctrl/⌘+K DRAWER (Phase B) — deliberately omitted (the INV-139 drawer-parity shape); gate on
  observed demand.
- Comment EDIT-in-place — Phase A ships delete + re-add only.
- Scratchpad revision history — none by design (last-write-wins, stated in the modal copy); revisit only if reps report
  losing content across windows.
- A "most-commented items" manager analytics block (the kbGetUsageStats posture) — possible later, not asked for.

DOCUMENTATION UPDATES NEEDED (next /sync-docs):
- Running pure-harness total 612 → 619 (six R3 pins + the fabs/sched-style pin); editor suite +2 (≈307).
- Visual Audit Stage: matrix is now 47 scenarios; sched modal covered light/dark/compact via the `post` hook.
- Document round 3: `Scratchpad` tab in the per-rep CN store row + `getMyScratchpad`/`saveMyScratchpad` (USER-lock
  INV-01 exception); `KbComments` tab in the KB store row + `kbAddComment`/`kbGetComments`/`kbDeleteComment` +
  `KbCommentAdd` audit action; intake arrow-key nav; the `.cn-head-fabs` grid-item note.
- localStorage key count UNCHANGED (the scratchpad is server-backed — that is the point); INV-136 count UNCHANGED.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
