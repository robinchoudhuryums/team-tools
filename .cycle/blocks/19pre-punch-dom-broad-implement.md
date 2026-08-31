---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- The DOM harness had ONE punch test (the M-1 failure restore) for the app's
  most consequential client logic. The SERVER's state machine is well covered
  (test_recordPunch_liveSequenceGuard + getNextActions_ cases), but which
  button a rep actually SEES, and what happens to it across the four
  submitPunch response shapes, lived only in source pins.

Files modified:
- test/client/dom/runDom.js
- CLAUDE.md
- .cycle/STATE.md

CHANGES:
DOM | test/client/dom/runDom.js | Nine tests (82 → 91), all driven through the
  REAL renderActions / submitPunch into a live DOM rather than asserting on
  source:
  (a) The primary-CTA state machine — ClockIn on a fresh day, LunchOut
      mid-shift with its gold act-lunchout treatment, LunchIn on lunch, and the
      operator's afterLunch flip where ClockOut takes the prime slot while
      LunchOut is DEMOTED to a secondary rather than removed (a genuine second
      break must stay reachable — that is the whole shape of the decision).
  (b) Adjust always renders last, is never the primary, and appears EXACTLY
      once; a completed shift takes the other branch — the completion message
      and NO prime button; an empty action list renders no row at all.
  (c) The F3 regression behaviourally: in the afterLunch layout, clicking the
      SECONDARY LunchOut morphs THAT button and leaves the prime alone (the
      pre-F3 code always grabbed `.prime`). Plus LunchIn's morph destination
      being doorExit — ClockOut's idle glyph — so the icon does not sit a
      half-step behind the re-render.
  (d) All four submitPunch response shapes: state-in-response applies inline
      with ZERO follow-up getEmployeeState (the point of the 2026-08-17
      change); an older server still falls back to the refetch; a
      {success:false} rejection restores the button and shows the SERVER's own
      reason with no state refetch; and the D2b case — the punch SUCCEEDED but
      the refresh died — restores the button and warns that the punch WAS
      recorded. An error toast there would tell a rep to punch again at the
      exact moment a duplicate is wrong.
  (e) The pending-adjustment chip: announced (role=status), naming the punch
      and time, escaping a hostile punch type, and rendering NOTHING when the
      list is empty, absent, or the state is null (an older server).
  (f) Self-undo's midnight wrap, including that an out-of-window wrap returns
      the −1 sentinel rather than a large positive that would satisfy an
      obvious `<= window` eligibility test (the cycle-8 bug).

TEST RESULTS: DOM 82 → 91 passed / 0 failed; pure 697 / 0; no app files
changed, so the visual matrix is unaffected (58, last shoot clean).
9 mutations bite-checked, 9 bite: afterLunch flip removed; morph targeting
`.prime`; one-round-trip removed; D2b turned into an error toast; rejection
not restoring the button; the wrap sentinel returning a raw value; the chip's
empty guard removed; LunchIn's morph reverted to the pre-F7 half-step; and
Adjust's filter dropped.

REGRESSION RISKS: None — tests only, no `web-app/` change.

INVARIANTS AT RISK: None. INV-155's client half and INV-190's chip gain
behavioural coverage they were documented as having but did not.

NET SCORE: 0 production fixes − 0 new failure modes = 0 (a coverage round)

OPERATOR ACTIONS / DEPLOY:
- None. | BLOCKS DEPLOY: N
Deploy: no app change; rides the existing pending deploy.

FOLLOW-ON ITEMS:
- The NINTH bite exposed a weak assertion rather than a defect: dropping the
  `a !== 'Adjust'` filter renders Adjust TWICE (the row appends a trailing one
  unconditionally), and last-ness, non-primacy and the class all still held.
  The pin now counts occurrences. Worth remembering as the recurring shape —
  mutate against the property, not its neighbourhood.
- Still open from the coverage measurement: 8 tabs unshot, and 79% of the pure
  harness is source-scanning rather than behavioural (462 of 584 blocks).

DOCUMENTATION UPDATES NEEDED: None outstanding — CLAUDE.md's narrative count
and STATE.md's Test Command line both carry DOM 91, and STATE gained
NEWEST #14 (incl. the jsdom lexical-binding lesson: empState / renderActions /
SELF_UNDO_WINDOW_SECONDS are NOT window properties — use the h.read() bridge).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
