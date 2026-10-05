---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- CNUI-02 — cancelling Save & Compose more than 5 minutes after the save left the note saved, because the server refuses a self-delete past its window, while its text stayed in the form, so the next Save filed it a second time. The refusal is now named on the response. The cancel keeps the note, clears the form if it still holds that note, and says why.
- CNUI-03 — the patient timeline and the form-submission viewers had no guard against late responses. A late answer re-opened a viewer the rep had closed, or painted the previous patient under the next one's title. Each viewer now carries a sequence number, so a response that is not the current open's is dropped.
- CNUI-04 — saving a manager comment or training reply reloaded the whole per-rep stack, wiping replies half-typed on the other cards. Only the saved card is re-rendered now.
- CNUI-05 — a Clarify follow-up the rep was typing was closed and lost on any stack re-render. The box now keeps its open state, text, focus and caret.
- CNUI-06 — undo-save (Ctrl/⌘+Z after a save) said "note deleted" and restored the text before the server answered. When the delete was then refused, the restored text duplicated the saved note on the next Save. It now announces and restores only after the server deletes.
- CNUI-08 (with TC2-5) — creating a scheduled-call reminder did not refresh "Needs you", although mark-done and cancel already did. Create now busts the server cache and the client list.
- CNUI-09 — the stale-flag count only ever reached the sidebar link, because the `||` lookup always found it (present, merely hidden, at phone width). A phone user, who sees the bottom nav, never saw it. It now lands on both nav forms.

Files modified:
- web-app/cn/script_callnotes.html
- web-app/30_callnotes.js
- test/client/dom/runDom.js
- test/client/run.js
- test/client/server-split-manifest.json
- CLAUDE.md (generated running-totals rows only)
- .cycle/STATE.md
Estimate: M (~7.5 h) — Batch 7b, written before the first edit
Actual: ~2.5 h

CHANGES:
CNUI-02 | 30_callnotes.js, cn/script_callnotes.html | `deleteCallNote`'s window refusal returns `windowClosed: true`.
  - `cnDoDeleteNote_` takes `opts.onWindowClosed` and hands that refusal to the caller; any other refusal toasts as before.
  - Both rollback paths use `cnRollbackDeleteOpts_(note)`: the cancel while composing and the cancel while the save was still in flight (`_deleteOnConfirm`).
  - On `windowClosed` the form is cleared, along with its timer and sticky draft, only when `cnFormHoldsNote_` (caller + issue, trimmed) says it still holds that note. The clear keeps a snapshot, so Ctrl/⌘+Z still restores it.
  - The toast reads "the note stays saved (it is past the 5-minute undo window), so the form was cleared to keep it from being saved twice".
CNUI-03 | cn/script_callnotes.html | `CN_VIEWER_SEQ = { formSub, timeline }`. Every open increments it and captures the value; `cnCloseFormSubOverlay_` / `cnCloseTimelineOverlay_` increment it.
  - The success AND failure handlers of `cnViewFormSubmission_`, `cnMgrViewFormSubmission_` and `cnOpenPatientTimeline_` return when their number is no longer current.
  - A stale failure no longer closes the viewer that replaced it.
CNUI-04 | cn/script_callnotes.html | `cnMgrPatchCard_(repId, note)` replaces only the saved `.cn-card` with the renderer's whole root (g66), using the note the endpoint already returns.
  - `cnMgrSaveComment_`, `cnMgrSaveTrainingReply_` and `cnMgrClearTrainingReply_` use it.
  - No note, a different rep now on screen, or the card gone: the stack reloads, as before.
CNUI-05 | cn/script_callnotes.html | `cnEditSnapshot_` / `cnEditRestore_` (already run by the stack, tray and History renders) also carry every Clarify box that is open or holds text (`cnClarifySnapshot_` / `cnClarifyRestore_`): open state, text, and the focused box's caret.
  - `cnSubmitClarification_` empties and closes the box before its re-render when it still holds the sent text, so a sent follow-up is never put back. Text typed after Send stays.
CNUI-06 | cn/script_callnotes.html | The undo shows "Undoing the save…" and calls `cnDoDeleteNote_` with `onDeleted` (a new hook) and no default toast.
  - `cnFinishSaveUndo_` restores the text only if the form is still empty; otherwise it says the text was not put back because the form is in use.
  - A refused undo restores and claims nothing.
CNUI-08 | 30_callnotes.js, cn/script_callnotes.html | `createScheduledCall` calls `pendingTasksBust_(emp.id)` after the row lands (g67). `cnSchedCreate_` calls `clkNeedsYouInvalidate_()` (T9's broadcast).
CNUI-09 | cn/script_callnotes.html | `cnRenderStaleBadge_(count)` writes or removes the badge on every `.sb-link` / `.nav-btn` for callNotes, using the health dot's pattern.
  - A scoped `.nav-btn .cn-stale-badge` rule puts it on the icon's corner; otherwise it would be a third row in the column button (g140).
  - Measured in cn-log-light-mobile: 0px overflow, the badge sits on the Notes icon.

TEST RESULTS: passed.
- Pure: 1179/1179 (+2: CNUI-02's `windowClosed`, only on the window refusal; CNUI-08's server bust, after the row and before the reply).
- DOM: 198/198 (+8, every one driving the real partial):
  - CNUI-02: the window refusal clears the form and keeps the note; a form holding the next call is untouched; any other refusal keeps the text.
  - CNUI-06: the announcement waits for the server; a refused undo restores nothing; text typed meanwhile is kept.
  - CNUI-03 timeline: a closed viewer stays closed, and A's late answer never paints under B.
  - CNUI-03 submission viewers: rep + manager, and a stale failure.
  - CNUI-04: the other card's input value AND focus survive; one card replaced; a different rep reloads.
  - CNUI-05: open state, text, focus and caret survive `cnReRenderActiveView_`; a sent follow-up is not restored.
  - CNUI-08: create invalidates.
  - CNUI-09: both forms badge, zero clears both.
- lint:server clean; counts --check agrees; split manifest current.
- 17 bite-checks, all BITE:
  - CNUI-02 ×4, CNUI-03 ×4, CNUI-04, CNUI-05 ×3, CNUI-06 ×2, CNUI-08 ×2, CNUI-09
  - One NO BITE first: CNUI-05's sent-text case. The returned thread no longer took a reply, so the box was never re-rendered and the pin could not tell. It now drives a thread the manager answered again, then BITE.
  - Two mutation-quoting reruns (no code change).
- Visual: cn-log-light-mobile — 0px overflow; the badge was read on the bottom-nav icon.
Regression Scenarios (Test Command `manual`), walked against the changed paths; none run on a deployment:
- S34 Save & Compose: PASS — an in-window cancel is unchanged; past the window, the new message.
- S19 composer: PASS.
- S31 optimistic submit: PASS (untouched path).
- S26 / S35 manager per-rep reply and clear: PASS — the card refreshes in place, as the Expected says.
- S50 multi-turn Q&A: PASS — Got it / Clarify unchanged, and the box survives re-renders.
- S28 timeline: PASS.
- S113 reminders modal: PASS — create now also refreshes Needs you.
- S73 phone width: PASS for the badge (shot).
REGRESSION RISKS:
- Undo-save restores the text about one RPC later instead of at once. If the delete RPC never returns, nothing is restored; the text is in the saved note, so nothing is lost.
- A card patched from the comment/reply endpoint's note carries exactly `callNoteRowToObject_`'s fields. `managerGetCallNotes` returns the same shape today; a field it adds in future would be missing from a patched card until the next load.
- The edit snapshot now walks the Clarify rows on every stack render — one `querySelectorAll` over the view, negligible.
INVARIANTS AT RISK: None broken. Checked and holding:
- g141: a targeted patch for the result of the user's own action; typed values, focus and caret survive.
- g66: the whole renderer root is replaced.
- g67: a flow that CREATES a task invalidates, server and client.
- g81 / C17-5: late handlers dropped by sequence.
- g99: the badge is selected by `data-tool`.
- g100 / g130: the close hooks still remove their overlays; the sequence bump sits inside the hook.
- INV-56 (`CN_QA_INFLIGHT` unchanged).
- g140: `.nav-btn .cn-stale-badge` has a rule.
- INV-60: the 5-minute window is unchanged, and now named.
NET SCORE: 0 − 0 = 0. All seven are defensive: real on their paths, none known to have fired.
- CNUI-02 needs a composer left open more than 5 minutes, then cancelled.
- CNUI-04 needs a manager typing on two cards at once.
- CNUI-05 needs a refresh or another card's action mid-follow-up.
- CNUI-06 needs a refused undo.
- CNUI-09 needs a phone-width session with a stale flag.
- No incident is recorded for any of them.
New failure modes: none identified.

OPERATOR ACTIONS / DEPLOY:
- None
Deploy: Server + Client (Call Notes): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The Metrics alert badge has CNUI-09's shape: `script_metrics.html` sets it on the first of `.sb-link` / `.nav-btn` only (`mClearBadge_` already clears both).
- `cnMgrPatchCard_`'s fallback (card gone, rep switched) still reloads the whole stack, wiping typing — rare, and the same as before.
- Undo-save of a note no longer in local state still restores without deleting (pre-existing; now the only path that restores before the server answers).
- The manager per-rep stack has no visual scenario with a typed reply or a multi-card session.

DOCUMENTATION UPDATES NEEDED:
- docs/gotchas.md + CLAUDE.md index:
  - g141: CNUI-04 / CNUI-05 — two more instances; the Clarify box now rides the edit snapshot.
  - g81: CNUI-03 — the viewers' sequence guard; a stale FAILURE must be dropped too.
  - g67: CNUI-08 — create was the missing flow.
  - g99: CNUI-09 — a badge goes on every nav form; an `||` lookup finds the hidden one.
  - g84: CNUI-02 / CNUI-06 — an optimistic "undone" claim rides the server's outcome.
- docs/design-decisions.md: "Optimistic UI is the perceived-speed mechanism" (undo-save waits for the delete), "Stale-flag badge on the manager CN landing" (both nav forms), "Manager comments on ANY note" (card-only refresh), "Patient/TRX timeline" / "In-app form-submission viewer" (stale answers dropped).
- docs/modules.md: Call Notes — Save & Compose cancel past the window, undo-save, the Clarify box, the per-rep card refresh, the phone badge.
- .cycle/config.md:
  - S34 (cancel after 5 minutes: "stays saved", form cleared).
  - S35 / S26 (a reply typed on another card survives a save).
  - S50 (a typed Clarify survives a refresh).
  - S28 (close the timeline before it loads; open a second patient quickly).
  - S113 (create refreshes Needs you).
  - S73 (the phone badge).
  - A new S134 for the undo-save ordering if wanted.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
