---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: (operator testing notes 2026-09-10, Batch A of A–D)
  - N1 | Coaching severity read "major" in the email notifications while every card and the create/nudge/recap mails said "Moderate".
  - N5 | Spanish Inbox "Show full request" expanded a card with no way back; renamed Expand and given a Collapse.
  - N7 | The quiz editor rebuilt its whole modal on every "+ Option" / "×" (a visible reload, scroll to top, focus lost).
  - N9 | The Team Notes Per-Rep "Coach" button rendered as an unstyled native button beside a styled Delete.
Files modified: web-app/Code.js, web-app/metrics/script_metrics.html, web-app/train/script_training.html, web-app/cn/script_callnotes.html, test/client/run.js, test/client/dom/runDom.js, test/visual/mock.js, test/visual/shoot.mjs

CHANGES:
N1 | web-app/Code.js, test/client/run.js | FOUR mail sinks printed the stored enum: the training-overdue digest's coaching rows (`sendTrainingOverdueEmail_`, html + text twin) and the manager daily brief's coaching rows (`sendManagerBriefEmail_`, html + text twin). All four now route through `COACH_SEV_LABELS`, and `coachValidate_`'s error derives its severity words from the map instead of hand-typing "praise / minor / major / critical" (a THIRD copy of the vocabulary, and the one that leaked). PR4-3 pin extended: the sink list grows 4 → 6, the two row-printing builders are banned from a bare `oc.item.severity` and must label BOTH twins, and the validation message must derive from the map. The coaching sandbox in run.js now loads `COACH_SEV_LABELS` (a test double updated as part of the fix) and the bad-severity case asserts the message reads Moderate, never major.
N5 | web-app/metrics/script_metrics.html, test/client/dom/runDom.js, test/visual/mock.js, test/visual/shoot.mjs | `spanishExpand_` replaced the snippet and REMOVED its own button. Now a real toggle: the first Expand fetches `getSpanishInboxThreadBody` once and caches the body in `SPANISH_STATE.bodies[threadId]`; Collapse restores the snippet FROM THE PAYLOAD (`spanishPendingItem_`, never the DOM) with no RPC; a later Expand reuses the cache; the open set lives in `SPANISH_STATE.expanded`, so a list re-render (a claim, a filter chip) keeps an open card open. The button is `type="button"` with `aria-expanded` kept in step and `aria-controls` naming the body element (`spanishBodyId_`, INV-173/174). Fixture `getSpanishInboxThreadBody` (a function of threadId) + scenario `spanish-expanded-light-wide` (post hook presses Expand). DOM test A5.
N7 | web-app/train/script_training.html, test/client/dom/runDom.js | ONE per-question renderer `trainQedQuestionHtml_(q, qi, total)` (each block carries `data-qed-block`) serves the full render AND a per-block `outerHTML` swap `trainQedRerenderQuestion_(qi, focusSel)` — the block is the whole unit the renderer emits (the drRepaintKpi_ rule), and the delegated click listener on the overlay needs no rebinding. "+ Option" and "×" snapshot the DOM into state first (the rule the full render already followed), swap that block only, and land focus in the new option / on "+ Option". "+ Question" and Remove-question keep the full render by design (they renumber every block). DOM test A7 asserts the `.modal` node IDENTITY survives, typing elsewhere is untouched, focus lands, and the full-render path still carries state.
N9 | web-app/cn/script_callnotes.html, test/client/run.js, test/visual/mock.js, test/visual/shoot.mjs | `.cn-mgr-coach-btn` was emitted by `cnMgrRenderReadonlyCard_` and defined in NO stylesheet. Rule added beside its Delete sibling in the info tone (a constructive act next to the destructive one), and `.cn-mgr-card-actions` gained `gap` + wrap. Pin A9 DERIVES every `cn-mgr-*-btn` literal the card emits and requires a stylesheet rule (the A13 definition-check shape). The Per-Rep view had never been on camera (the Team Notes scenario lands on the training queue): `managerGetCallNotes` fixture (a function of repId/date, INV-185 F14) + scenario `cn-teamnotes-rep-light-wide` via a `cnMgrLoadRepView_()` post hook.

TEST RESULTS: passed.
  - Pure harness `node test/client/run.js`: 778 passed, 0 failed (777 at the merged-main baseline; +1 named test A9; PR4-3 and the coachValidate_ case grew IN PLACE).
  - DOM harness `node test/client/dom/runDom.js`: 110 passed, 0 failed (108 baseline; +A7, +A5).
  - `node --check` clean on Code.js.
  - Visual: `cn-teamnotes-rep-light-wide`, `spanish-expanded-light-wide` (new) + `cn-teamnotes-light-wide`, `spanish-light-wide` (neighbours) shot — 0 overflowPx, 0 missing fixtures, no non-font console errors; both new PNGs eyeballed (Coach styled beside Delete with a gap; the expanded card shows the full body under Collapse, the sibling card offers Expand).
  - EVERY change bite-checked against the COMMITTED tree: 6 mutations, 6 bites (N1 text twin reverted to the raw enum → PR4-3; validation message hand-typed → coachValidate_ case; N9 rule deleted → A9; N7 "+ Option" rebuilding the modal → A7; N5 body cache dropped → A5; N5 Collapse forgetting aria-expanded → A5).
  - One first-run correction, a HARNESS trap not a code one: the A5 DOM test's `h.click()` on the Spanish button ran nothing — jsdom's outside-only mode never compiles an inline `onclick` (the documented trap, hit again); the test presses the button through its handler. A7 was unaffected because the quiz editor delegates through `addEventListener`.
  - Regression Scenarios (Test Command is `manual`) — walked below.

REGRESSION SCENARIOS (Subsystems touched: Server, Client (Metrics views), Client (Training views), Client (Call Notes views), Test Suite):
  Every scenario targets the DEPLOYED Apps Script project, so none is executable here. PASS where a harness or the matrix covers the exact step; NOT APPLICABLE where only the live project can answer.
  - S99 (Coaching surface — the create/nudge/recap mails) | NOT APPLICABLE — live mail. Those builders already labelled correctly; N1's blast radius is the two DIGEST rows (S67/S69's overdue digest and the manager brief, INV-151), which no scenario reads — pinned instead (PR4-3, six sinks + the validation message).
  - S67 / S69 (Training + Employee Docs digests) | NOT APPLICABLE — live mail; the coaching rows in that digest now read Moderate (pin-held).
  - S80 (Spanish resolution-share chart), S93 (business hours) | NOT APPLICABLE — untouched paths; the share chart and the stats head are not in N5's blast radius (the card's action row only).
  - Spanish card expand (the INV-31 Part A "Show full request" step) | PASS (DOM test A5 + `spanish-expanded-light-wide` on camera) — Expand fetches once, Collapse costs nothing, a re-render keeps the card open.
  - S68 (Training T2 — quiz author/take) | PASS for the AUTHORING mechanics (DOM test A7: add/remove option keeps the modal, typing survives, focus lands); NOT APPLICABLE for save/take (live). `trainSaveQuizFromEditor_` and the payload it sends are untouched — the state it reads is filled by the same snapshot as before.
  - S26 (Manager per-rep Call Notes view) | PASS for the card's action row (`cn-teamnotes-rep-light-wide` on camera — Coach + Delete styled and spaced); NOT APPLICABLE for the rep/date reloads (live).
  - S35 (Manager Q&A reply) | NOT APPLICABLE — live; same card, the reply editor is untouched.
  - S1 / S2 (editor suites) | NOT APPLICABLE — editor-only. Tests.js was scanned for doubles of every changed area first: no test asserts the validation message text, none drives the quiz editor DOM, and the Spanish/Coach changes are client-only — nothing in the suite encodes the OLD behaviour.

REGRESSION RISKS:
  - N7: `trainQedSnapshot_` still walks `st.questions[qi].options` against `[data-qed-opt="qi:oi"]` — the swapped block re-emits exactly those attributes, so a later full render reads the same DOM shape. A block whose index no longer exists falls back to the full render.
  - N5: `SPANISH_STATE.expanded`/`bodies` are module-level and outlive a view exit, so a card expanded earlier in the session comes back expanded on re-entry (the same thread's first-message body cannot change, so the cached text stays true). Deliberate; noted so it is not read as a leak.
  - N1: `COACH_SEV_LABELS` is declared ~14k lines below its two new readers — fine in Apps Script (every file evaluates before any call; line 19910 already reads it earlier in the file).
INVARIANTS AT RISK: None — INV-134's stored enum is unchanged (labels are display-only); INV-173/174 are satisfied by construction on the new toggle; INV-185 holds (both new fixtures are functions of their arguments).
NET SCORE: 4 − 0 = +4 (all four were OPERATOR-OBSERVED on the running app in this month's testing; interface defects count since R18. Zero new failure modes — the two deliberate behaviours above are stated, not silent.)

OPERATOR ACTIONS / DEPLOY:
- None new. | BLOCKS DEPLOY: N
Deploy: Server + every client subsystem: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy (the ONE deploy still owed for everything since PR #230; this batch rides it). Test Suite: same push; `runAllTests()` post-deploy — still 308.

FOLLOW-ON ITEMS:
- web-app/train/script_training.html — "+ Question" and Remove-question still take the full modal render (they renumber every block). A per-block append + renumber is possible but was out of the note's scope ("adding answer options reloads the modal").
- test/visual/mock.js — the voicemail pending fixture's snippet already ends with an ellipsis and the renderer appends another when `hasMore` is set, so that card reads "Duration: 1:42……" on camera. The server snippet is a plain slice (no ellipsis), so this is fixture-only; cosmetic.
- Batches B (N2 verify + N3 manual-resolve exclusion incl. `ResolvedVia`), C (N4 auto-assign button, N6 DR expand + stored PatientTrx, N8 QA reviewers editor) and D (N10 "active but not clocked in" on Team right now) are planned and unstarted.

DOCUMENTATION UPDATES NEEDED:
- CLAUDE.md INV-31 / the Spanish Inbox KDD (the "Show full request" expand, ~line 8272): the button is Expand ⇄ Collapse with a cached body and state-held open set.
- CLAUDE.md Training T2 KDD + the quiz editor mention: option add/remove re-renders one question block (`trainQedQuestionHtml_` / `trainQedRerenderQuestion_`); question add/remove keeps the full render.
- CLAUDE.md Team Notes / "Coach on this" wording: the Per-Rep card's Coach button is styled (`.cn-mgr-coach-btn`) and on camera (`cn-teamnotes-rep-light-wide`).
- CLAUDE.md coaching KDD (INV-134 amendment / PR4-3 note): the label sink list is six functions + the validation message.
- CLAUDE.md Test Command section counts: pure 777 → 778, DOM 108 → 110, visual matrix 99 → 101 (`cn-teamnotes-rep-light-wide`, `spanish-expanded-light-wide`); the harness-trap note (inline onclick under outside-only) gained a third instance.
- Regression scenarios: S26 add the styled Coach button step; S68 add the in-place option add/remove step; the Spanish scenario text at INV-31 Part A.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
