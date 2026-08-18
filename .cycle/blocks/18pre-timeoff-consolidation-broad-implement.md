---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: (operator-requested round, 2026-08-18)
- OP-1 | Consolidate the Time/PTO Time Off ⇄ Timesheet mode toggle (the two
  modes were verified nearly identical — only the 240px rail swapped)
- OP-2 | Pay-statement click-through: "Request edit" on incomplete/empty
  in-window days → Adjust modal prefilled to that day
- OP-3 | Quick-actions card in the Time/PTO rail (request PTO by date via the
  pinned day modal; request punch edit via the Adjust modal)
Files modified: web-app/tc/script_timeoff.html, web-app/tc/script_clock.html,
web-app/styles.html, test/client/run.js, test/visual/mock.js, CLAUDE.md,
.cycle/STATE.md

CHANGES:
OP-1 | tc/script_timeoff.html, styles.html | mergeMode read/markup/wiring
removed; rail = toActionsCardHtml_ + balance tile + always-on #ts-side-rail;
loadTimesheetSideRail_ unconditional; .mp-modes/.mp-mode CSS deleted
(INV-184); umsMergeMode retired (17→16 localStorage keys; stale value
ignored); rail-error copy no longer says "switch modes".
OP-2 | tc/script_timeoff.html, tc/script_clock.html | payStmtHtml_ renders
.pay-stmt-fix (gated needsFix && inWindow && !d.viewingOther; adjust-window
via daysBetweenIso vs the boot-shipped adjustWindowDays); bound post-inject
via data-adj-date (L-15 discipline); payStmtRequestEdit_ closes the
statement BEFORE opening Adjust (ensureOverlay node sits later in DOM order
at equal z-index — it would paint over the static overlay);
openAdjustModal(prefillDate) honors a well-formed date only inside its own
[min, today] picker bounds; incomplete foot-note names the buttons + the
manager path for older days.
OP-3 | tc/script_timeoff.html, styles.html | .to-actions card: date picker
(defaults next weekday, min=today, max=end of today+3mo — the calendar's own
nav horizon) + Request → openRequestForDate_ (same displayed month → pinned
day modal directly; other month → TO_PENDING_DAY_OPEN + calNavTo_, consumed
at the end of renderTimeOffView gated to the rendered month — covers the
sync cache-hit AND async load paths); "Request punch edit" → openAdjustModal().
Real <button>s (INV-173); primary uses the canonical .prime recipe
(background --accent, color --paper-card — the #fff first cut measured
illegible in dark mode and was corrected).
Fixture | test/visual/mock.js | getTimesheetData fixture added (shape mirrors
buildTimesheetForEmployee_'s return — INV-185); calendar fixture's
hoursByDate → workedHoursByDate (shape drift: the client reads
workedHoursByDate, so the calendar's corner hour badges had NEVER rendered
in a timeoff screenshot).

TEST RESULTS: Test Command = manual. Node harnesses: pure 553/553 (new
consolidation pin, 5 mutations bite-checked: mp-mode-returns,
conditional-rail, viewingOther-gate, close-first-order, prefill-bounds —
all BIT), DOM 71/71. Visual: timeoff-light-wide + timeoff-dark-wide re-shot,
0 missing / 0 overflow, both inspected (light + dark; dark caught the
button-contrast defect, fixed + re-shot). Scenario walk (subsystem-overlap):
S3 PASS-by-inspection (punch flow untouched; openAdjustModal arg optional,
all existing callers argless); S4 PASS (submit path unchanged — the actions
card routes into the SAME day modal); S5 PASS (prefill lands before
updateAdjReasonRequirement, so the reason-required label tracks a prefilled
old date); S39 PASS (Clock untouched; scenario text updated); S46 REWRITTEN
(the toggle it tested no longer exists — now the consolidated-page + actions
card scenario); S47 PASS-by-inspection (openPinnedDayModal_ sets the same
pin flag a click sets; every existing reset path — Esc, click-outside,
submit success, Cancel — still resets it); S79 PASS-by-inspection + extended
(click-through steps added; the pay-statement modal remains outside the
visual matrix — documented gap).

REGRESSION RISKS: (a) openRequestForDate_ can navigate to any month
loadCalendar serves (the native date input's max is advisory in some
browsers) — the render guard + server-side 370-day bound keep it safe;
(b) a rep with ptoEnabled=false now sees the actions card + pay-period block
(balance tile still hidden) — request submission for contractors was always
allowed (S15), so this widens nothing; (c) a stale umsMergeMode value is
dead data in the browser — never read again.

INVARIANTS AT RISK: INV-80 AMENDED (mode toggle retired — the surviving tab-
key clause recorded); INV-173/174 honored (real buttons; no new
disclosure state); INV-83 honored (statement closes via closeOverlay so its
onClose hook runs); INV-184 honored (dead selectors deleted with markup);
INV-185 honored (fixture mirrors the server shape; drift fixed); A2 clean
(the new card is flex-wrap intrinsic — no compact/grid override added).

NET SCORE: 2 − 0 = +2 (the near-duplicate-page consolidation and the
fixture-shape drift are interface/test-integrity fixes; the click-through +
actions card are operator-requested features, not counted).

OPERATOR ACTIONS / DEPLOY:
- None | BLOCKS DEPLOY: N
Deploy: cd web-app && clasp push -f, then Apps Script editor → Deploy →
Manage deployments → Edit → Version: New version → Deploy. Post-deploy: run
runAllTests() in the editor (no new editor tests this round — client-only).

FOLLOW-ON ITEMS:
- The pay-statement modal (and modal states generally) remain outside the
  visual matrix — the documented Visual Audit Stage gap; a getMyPayStatement
  fixture would let it on camera.
- The quick-actions card's date picker horizon matches the calendar's ±3-month
  nav; if the operator ever wants farther-out requests from the card, the
  calendar's canNext bound is the thing to widen, not the card.

DOCUMENTATION UPDATES NEEDED: (all applied this session)
- CLAUDE.md: localStorage entry 17→16 + umsMergeMode retirement note (both
  list sites), Time/PTO merge KDD rewritten for the consolidation,
  pay-statement KDD click-through sentence, INV-80 amendment, S39/S46/S79
  updates, test narrative → 553, the no-new-operator-state round entry, two
  stale "Timesheet mode →" path references fixed (historical round entries
  left as history).
- .cycle/STATE.md round entry.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
