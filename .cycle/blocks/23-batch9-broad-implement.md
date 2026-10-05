---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- UI-ESC (KBUI-3 + TRUI-1) — Escape closes the topmost overlay even when pressed inside a textarea, and so does a backdrop click. Four editors lost their work that way with no question asked: the KB article editor, the quiz editor, a fillable HR document, and the coaching composer. An editor overlay is now GUARDED: while it holds unsaved work, every close that goes through `closeOverlay` asks "Discard changes?" and refuses until the answer is Discard.
- INTUI-1 — the intake preview and the coaching drawer could be closed while their send was in flight. The rep was put back on the still-filled form, and a second send went out as a duplicate PHI email or a second (never-purged) HR record. Both now refuse to close until the send answers (the composer's INV-145 rule).
- TRUI-2 — the signature canvas drew in the theme's `--ink`, which is near-white in dark mode. The stored HR signature was near-invisible on paper. The pad is now white in both themes, with a fixed `#101418` ink for drawn and typed signatures.
- KB2-9 — a file dropped into the KB editor could land in the NEXT editor if its read or conversion was slow, and Save then overwrote that article. The ingest now carries the editor it was dropped into, and drops a result for any other.
- KB2-8 — a manual import that wrote a section's KB row but died before its ledger row left that section "foreign" for ever: skipped on every later import, so it never updated again. A row whose text already equals the file's is now recorded on the next run (`repaired`), not rewritten, and the result panel and audit row say so.
- ADM-06 — a blank state tax rate was skipped on save, which deleted the state from the map and from the composer's State list, with no way to add it back in the app. A blank is now refused by name, and nothing is saved.
- ADM-10 — reloading the Team Members panel (after an offboard, say) wiped an "Add team member" form being filled in. The form now rides the re-render: values, open state, focus and caret. Only a completed add empties it.
- KBUI-5 — editing or deleting a comment refreshed the comment block and wiped a new comment being typed below. The draft now survives the re-render, and a POSTED comment leaves the box.
- SH-02 (with TRUI-3 / INTUI-2 / KBUI-4) — close buttons in Call Notes, What's new, Training, Employee Docs, Intake and the KB editor called the close hook directly, so focus was never handed back (g100). They now go through `closeOverlay`, which also runs the UI-ESC question.
- SH-03 — the keyboard-shortcuts dialog sat outside the focus trap (its container is `.cn-shortcuts-modal`), so Tab walked into the page behind it.
- SH-04 — the onboarding tour's popover had no dialog role, name or focus handling. Keyboard and screen-reader users stayed on the controls under the dim layer.
- SH-05 — each view-as switch re-rendered the shell and added another pair of document mousemove/mouseup listeners for the sidebar drag, each holding a stale sidebar.
- TCUI-1 — when the dashboard refresh after a self-undo failed, nothing was said, so the undone punch stayed on screen.

Files modified:
- web-app/script_core.html
- web-app/script_tour.html
- web-app/cn/script_callnotes.html
- web-app/kb/script_kb.html
- web-app/70_kb.js
- web-app/train/script_training.html
- web-app/train/script_empdocs.html
- web-app/train/script_coaching.html
- web-app/intake/script_intake.html
- web-app/tc/script_clock.html
- test/client/run.js
- test/client/dom/runDom.js
- test/client/server-split-manifest.json
- CLAUDE.md (generated running-totals rows only)
- .cycle/STATE.md
Estimate: L (~13 h) — Batch 9, written before the first edit
Actual: ~4 h

CHANGES:
UI-ESC | script_core.html (+ the four editors) |
  - `ensureOverlay` binds `input` and `change` listeners when it creates an overlay; anything typed, picked or toggled marks it dirty. A closed→open transition starts clean. A module's own programmatic fill fires no event, so a prefill is not "work".
  - New opt `unsaved: { what, busy?, dirty? }`.
  - New `overlayMarkDirty_(el|id)` for work no key produced: a converted Doc, an ingested file, imported quiz questions, a structural quiz edit.
  - `closeOverlay(el, opts)` asks `overlayDiscardGuard_` first. While the overlay is dirty (or its own `dirty()` says so), it puts up `uiConfirm` "Discard changes?" (Discard / Keep editing) and refuses; only one question at a time. Discard re-enters `closeOverlay` with `{ discard: true }`.
  - `busy()` true means a save is in flight; the hook's own refusal answers instead, since nothing is being discarded.
  - A module's own close after a successful save calls its hook directly and is never asked.
  - Guarded: `kb-ed-overlay` ("this item"), `train-qed-overlay` ("this quiz"), `ed-reader-overlay` ("this document"; `busy` = `ED_STATE.submitting`; `dirty` = a drawn signature, which fires no input event), `coach-compose-overlay` ("this coaching note"; `busy` = `COACH_SENDING`).
INTUI-1 | intake/script_intake.html, train/script_coaching.html |
  - `intakeCloseModal_` refuses while `INTAKE_STATE.sending`, with "Sending — one moment…". The PPD and account sends set the flag before the RPC and clear it in both handlers, before their own close.
  - `coachCloseDrawer_` refuses while `COACH_SENDING`; `coachCreate_` sets and clears it.
TRUI-2 | train/script_empdocs.html | `ED_SIG_INK = '#101418'` for `strokeStyle` and `fillStyle`. The canvas background is `#ffffff`; the placeholder is `#5b6470` (g58: a fixed-palette surface takes fixed colours).
KB2-9 | kb/script_kb.html | `kbIngestFile_` captures `KB_EDIT`. The read's `onerror`/`onload` and the RPC's success and failure handlers each return when another editor is open.
KB2-8 | 70_kb.js, kb/script_kb.html |
  - `kbManualPlan_` returns `repair`: a man- row with no ledger match whose content hash equals the file's, checked before foreign/edited.
  - `kbImportManual` writes those ledger rows (no KB write), and reports `repaired` in the summary and the audit row.
  - `kbManualResultHtml_` names them, on a check and after an import.
ADM-06 | cn/script_callnotes.html | New pure `cnRateMapFromRows_(rows)` returns `{map}` or `{error}`, naming every blank state. The Save Tax Rates handler refuses before the RPC.
ADM-10 | cn/script_callnotes.html | `cnAdminLoadOnboarding_(opts)` snapshots the add form before the re-render and restores it after (`cnOnboardFormSnapshot_` / `cnOnboardFormRestore_`): values, checked state, open state, `aria-expanded` (INV-174), the anchor's disabled rule, focus and caret. `{ resetForm: true }` comes only from a completed add.
KBUI-5 | kb/script_kb.html | `kbRenderComments_` carries the add box's draft (text, focus, selection) across its `innerHTML`. `kbAddComment_` empties the box before its refresh when it still holds the posted text, so the posted comment is never restored.
SH-02 | cn/script_callnotes.html, script_core.html, train/script_training.html, train/script_empdocs.html, intake/script_intake.html, kb/script_kb.html |
  - Converted to `closeOverlay(...)`: the timeline ×, both submission-viewer Close buttons, the composer and external composer Cancel, What's new "Got it", the training reader Close, quiz Cancel/Done, quiz-editor Cancel, the doc reader Close, the intake `[data-intk-close]` delegate and the KB editor's `[data-kb-close]` delegate.
  - The doc reader's post-sign close uses `closeOverlay(el, { discard: true })`.
  - The Scratchpad is a non-modal panel outside this lifecycle (g100), so it is unchanged.
SH-03 | script_core.html | The focus trap's container lookup adds `.cn-shortcuts-modal`, then the overlay's first child, after `.modal` / `.cn-compose-modal`.
SH-04 | script_tour.html |
  - `#tour-pop` gets `role="dialog"`, `aria-modal`, `aria-labelledby="tour-pop-title"` and `aria-describedby="tour-pop-body"`.
  - Each paint focuses the step's primary button (`tourFocusPop_`), and Tab / Shift+Tab cycle the popover's buttons.
  - `tourStart` stashes the focused element; `tourEnd_` restores it while it is still connected.
SH-05 | script_core.html | The document mousemove/mouseup pair is bound once (`_sidebarDocBound`) and reads `SIDEBAR_DRAG = { sb, startX, startW }`. Each grip binds once (`grip._sbResizeBound`).
TCUI-1 | tc/script_clock.html | `cnDoSelfUndo_`'s refresh toasts "The punch was undone, but the dashboard could not refresh — it may still show it. Reload to see the change." on a failure or an `{error}` reply.
(tests) | test/client/run.js | Moved pins that encoded the old shapes:
  - PR4-5: the coaching `ensureOverlay` line now carries `unsaved`.
  - TW-B: two canvas fallbacks, not four; empdocs left that category for the fixed ink.
  - M1-S3: man-5 is a repair, not foreign.
  - M1-S5: the audit row carries `repaired=0`.

TEST RESULTS: passed.
- Pure: 1191/1191 (was 1186). Five new pins:
  - ADM-06: `cnRateMapFromRows_` driven, plus the handler refusing before the RPC.
  - KB2-8: `kbImportManual` driven over a fake book with a lost ledger row. A check reports it and writes nothing; the import records it without a KB write; the audit counts it; a re-import is then a no-op. The M1-S3 grid gained the repair and foreign cases.
  - SH-02: a DERIVED net. Every hook registered through `ensureOverlay(…, { onClose })` across the partials is collected, and no `onclick="hook()"` or delegated `closest(…)) hook()` may call one.
  - UI-ESC: the four editors register `unsaved`, and the guard runs first in `closeOverlay`.
  - TRUI-2: the fixed ink and the white pad.
- DOM: 210/210 (was 198). Twelve new drives, each on the real partials:
  - UI-ESC KB editor: a clean close at once; Escape inside a field asks; Keep editing keeps the text; no stacked question; the backdrop and the × ask; Discard closes; a module-marked editor asks.
  - UI-ESC quiz and coaching: a structural edit asks; a prefill alone does not; typed text asks; INTUI-1 mid-save refuses without a question, then closes on success; a reopened drawer starts clean.
  - UI-ESC + TRUI-2 doc reader: typed answers ask; a drawn signature asks; dark-mode stroke and typed-name fill are `#101418`.
  - INTUI-1 intake: Escape and × refuse mid-send; after the answer it closes.
  - TCUI-1: a failure and an `{error}` reply toast; a good refresh does not.
  - ADM-10: values, open state, `aria-expanded`, focus and caret survive a reload; `resetForm` empties.
  - KBUI-5: the draft, focus and caret survive; a posted comment is not restored.
  - KB2-9: a late read and a late conversion are both dropped under another editor.
  - SH-02: focus returns from What's new, the quiz editor and the doc reader, by running each button's own onclick text.
  - SH-03: focusin outside the shortcuts dialog is pulled back in.
  - SH-04: role, name, description, focus in, Tab and Shift+Tab inside, focus back on end.
  - SH-05: one document mousemove listener across three shell renders, and a drag still resizes the live sidebar.
- lint:server clean; counts --check agrees; split manifest current.
- 31 bite-checks, all BITE:
  - UI-ESC ×7: the guard, input tracking, the reset on open, busy, the signature `dirty()`, the quiz structural mark, the registration.
  - INTUI-1 ×2, TRUI-2 ×3, TCUI-1 ×2, ADM-06, ADM-10 ×2, KBUI-5 ×2, KB2-9 ×2, KB2-8 ×2.
  - SH-02 ×2 (the derived net and the DOM drive), SH-03, SH-04 ×4, SH-05.
  - One NO BITE first: SH-04's Tab case. jsdom never moves focus on Tab by itself, so "focus is still inside the popover" held with the Tab handler removed (g116 — true only if it works). The pin now asserts that Tab is handled and moves focus, wrapping both ways; then BITE.
  - Two mutation-text reruns (no code change).
- Visual: coaching-drawer-light-wide, admin-config-light-wide and reference-light-wide — 0px overflow, nothing missing; the only console error is the sandbox's font-CDN certificate. The drawer shot was read: unchanged. Every other change is behaviour, and the DOM suite drives it.
Regression Scenarios (Test Command `manual`), walked against the changed paths; none run on a deployment:
- S12 self-undo: PASS — a failed refresh is now named.
- S45 sidebar: PASS — drag, snap and persistence are unchanged; a view-as re-render no longer stacks listeners.
- S54 confirms: PASS — the discard question is a `uiConfirm` (Esc = Keep editing, Enter on OK = Discard).
- S59 intake PPD send: PASS — the preview refuses to close mid-send.
- S62 / S63 / S65 Reference editor, converter and paste: PASS. Escape or the × with typed or converted work now asks. Save closes without asking.
- S68 quiz author: PASS — Cancel, Escape and the backdrop ask once the quiz has been touched.
- S69 Employee Docs sign: PASS — filled fields or a signature ask; signing closes; a dark-mode signature is dark ink on white.
- S75 onboarding: PASS — an offboard keeps a half-filled add form; a completed add empties it.
- S51 Admin config: PASS — a blank tax rate is refused, naming the state.
- S99 coaching drawer: PASS — the prefill is not work; typed text asks; mid-save refuses.
- S113 modals open and close: PASS — the scheduled-reminder modal is unchanged; the Scratchpad is untouched.
- S124 manual import: PASS — an interrupted import's sections are reported as repaired on Check and recorded on Import.
- No scenario covers the onboarding tour or the shortcuts dialog's focus; the DOM drives cover them.
REGRESSION RISKS:
- An editor with typed work now asks before Escape, the backdrop, or its Cancel/× closes it, which is one more step for someone who meant to throw a draft away. A clean editor closes as before.
- Dirtiness is "an input or change event since this open", not a diff. Typing a field back to its original value still counts as work, and a structural edit is caught only where a module marks it (the quiz editor does; the KB type toggle is a button and does not).
- The focus trap now covers EVERY open non-hover overlay, through its first child, not only those holding a `.modal` / `.cn-compose-modal`. An overlay whose first child is not its dialog would trap onto nothing focusable, which is a no-op.
- The tour now takes focus on each step. A user mid-typing who starts the tour from the `?` button loses their caret until the tour ends; it is restored then.
- `closeOverlay` gained a second argument; existing one-argument callers are unchanged.
INVARIANTS AT RISK: None broken. Checked and holding:
- g130 / INV-145: a hook may still refuse (intake, coaching, both composers). The guard runs before the hook, and `busy()` hands the answer to the hook's refusal.
- g100: every converted close goes through `closeOverlay`, and the SH-02 net derives the hook set from the registrations.
- g141: ADM-10 and KBUI-5 carry values, focus and caret.
- g147: KB2-9's identity guard covers the read and both handlers.
- g58: the signature pad is a fixed palette.
- g140: no new class without a rule. The tour ids are attributes on existing classes.
- INV-174: `aria-expanded` follows the restored form.
- INV-83: one Escape answers only the topmost dialog; the discard question is a `uiConfirm`, so its capture handler wins.
- The KB2-8 ledger stays the authority: a repair writes the ledger row only, never the KB row.
NET SCORE: 0 − 0 = 0. All thirteen are defensive: real on their paths, none with a recorded incident this month.
- UI-ESC needs an editor with typed work and a stray Escape or backdrop click.
- INTUI-1 needs a close and a second send during a slow send.
- TRUI-2 needs an HR document signed in dark mode; no signed document has been reported faint.
- KB2-8 needs an import interrupted between its KB write and its ledger write.
- The rest are accessibility or a narrow timing.
New failure modes: none identified. The extra question on a deliberate discard is a trade, listed above.

OPERATOR ACTIONS / DEPLOY:
- None
Deploy: Server + Client (KB, Call Notes, Training, Intake, Time Clock, shell): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The KB editor's Article/Embed type toggle is a button, so a switch alone does not mark the editor dirty (typing does). The converter and ingest marks are in place but not driven by a pin; the DOM test drives `overlayMarkDirty_` directly.
- The doc reader's `busy` (a submit in flight) has no DOM drive.
- The Scratchpad's Close buttons still call `cnCloseScratchpadModal_()` directly. It is a non-modal panel outside the overlay lifecycle (g100), so SH-02's net does not cover it.
- No visual scenario shows the discard question, the tour popover, or a dark-mode signature.
- From Batch 7b, still open: the Metrics alert badge sets only the first nav form.

DOCUMENTATION UPDATES NEEDED:
- docs/gotchas.md + CLAUDE.md index:
  - g100: SH-02 — the converted buttons and the derived net; SH-03 — the trap's container; SH-04 — the tour is a dialog outside the overlay lifecycle.
  - g141: ADM-10 and KBUI-5, two more instances.
  - g147: KB2-9.
  - g58: TRUI-2, the signature pad.
  - g130: INTUI-1, intake and coaching.
  - Possibly a new gotcha: a close path that discards typed work must ask, and "dirty" is an event since open, not a diff.
- docs/design-decisions.md:
  - "`uiConfirm` / `uiPrompt` replace native…" or a new entry: the `unsaved` guard on editor overlays.
  - The procedures-manual import decision: the repair class.
  - "Department emails and state tax rates are editable": a blank rate is refused.
  - "Onboarding tour": dialog semantics.
- docs/modules.md: Reference (editor guard, ingest identity, comment draft, manual repair); Training and Employee Docs (quiz editor and doc reader guard, signature ink); Coaching (guard, mid-save refusal); Intake (mid-send refusal); Manage → Admin (tax rates, Team Members form); shell (tour, shortcuts, sidebar).
- .cycle/config.md:
  - S62 / S68 / S69 / S99: Escape with typed work asks; Discard closes.
  - S59 / S99: close mid-send refuses.
  - S69: a dark-mode signature prints dark.
  - S75: an offboard keeps a half-filled add form.
  - S51: a blank tax rate is refused.
  - S124: an interrupted import is repaired.
  - S45: re-render via view-as; one listener.
  - S12: a failed refresh is named.
  - INV candidates: UI-ESC (every editor overlay opens with `unsaved`); SH-02 (no direct hook call — the derived net).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
