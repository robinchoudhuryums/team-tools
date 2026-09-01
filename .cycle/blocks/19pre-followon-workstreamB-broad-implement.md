---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- FO (the A4 follow-on) — Manage Time overflowed the page by 44px at 390px
- B1 — the shift-complete state's Adjust button opens on the punch that state implies
- B2 — a submitted punch-adjustment request reached NOBODY
- B3 — the resume path: a way back from a closed day, through the approval queue

Files modified:
- web-app/Code.js
- web-app/tc/script_clock.html
- web-app/tc/script_manager.html
- web-app/Tests.js
- test/client/run.js
- test/client/dom/runDom.js
- test/visual/shoot.mjs
- CLAUDE.md

CHANGES:
FO | web-app/tc/script_manager.html | The analytics pair carried an INLINE
  `grid-template-columns:1fr 1fr`, which beats every stylesheet rule INCLUDING
  the shell's own media queries — so two CARDS stayed 2-up at 390px and the
  Time Off card, whose three coloured status spans could not wrap either,
  pushed the page 44px sideways. Replaced with `.mgr-analytics` (a real class
  with a real 700px breakpoint — the pair holds a 7-bar chart and a status
  line, not the 4-up metric TILES `.metric-grid` is sized for) plus a wrapping
  `.mgr-to-parts`. Compact pop-out geometry is unchanged: the (0,3,0) compact
  rule still wins, exactly as the A2 note describes. MEASURED 390px 434 → 390,
  480px compact and 1440px byte-identical.
  THE MISDIAGNOSIS IS THE FINDING WORTH KEEPING: the first measurement blamed
  the team-punches `.m-table`, because `getBoundingClientRect().right` on a
  table INSIDE an `overflow-x` scroller reports its full layout width and looks
  exactly like an overflow. The wrap was scrolling correctly. To find a real
  overflower, walk the elements past the viewport edge and SKIP any with an
  overflow-x ancestor — a widest-rect scan cannot tell the two apart. The
  CLAUDE.md note that carried the wrong attribution is corrected.
B1 | web-app/tc/script_clock.html | The done state is DERIVED from a trailing
  ClockOut, so the punch a rep is there to add is a ClockIn.
  `openAdjustModal(prefillDate, prefillType)` validates the type against the
  select's OWN options (the prefillDate precedent) and RESETS the select first
  — every other field in that modal is cleared on open, and a <select> keeps
  its last value, so a prefill would otherwise leak into an unrelated visit.
B2 | web-app/Code.js | `submitPunchAdjustRequests` wrote its Pending rows,
  audited, and told nobody. The queue lives inside the manager dashboard, so a
  request was seen only if a manager happened to look — while the rep waited,
  believing it was with their manager. `notifyManagersOfAdjustRequests_` is
  branded (INV-105), PHI-free, best-effort (INV-14) and deferred past
  `releaseLock` (M-7).
B3 | web-app/Code.js, tc/script_clock.html, tc/script_manager.html | The resume
  path. A rep whose day is closed and who is working again had no route except
  asking a manager to edit the sheet.
  THE MODEL IS THE DECISION. Removing the ClockOut so the day reopens is the
  obvious implementation and it silently PAYS every hour between clocking out
  and coming back — harmless for a mistaken clock-out resumed a minute later, a
  payroll error for the case the operator described (finished, went home, asked
  to come back), and invisible on screen either way. So approval CONVERTS: the
  ClockOut row keeps its TIME and becomes an `ADJ-LunchOut`, and an
  `ADJ-LunchIn` is written at the resume time. The away gap is a break, which is
  unpaid — the truth in both cases, exact to the minute, and needing NO new
  arithmetic because `calcHours_` deducts every break pair since the same day's
  multi-break round (INV-176). It is only expressible at all because of that
  round; before it, the second pair was silently discarded.
  It rides the ORDINARY approval queue (the operator's rule: no employee
  self-adjust without approval). `PunchAdjustRequests` gained a TRAILING
  `Action` column ('' / 'set' = the ordinary write, 'resume' = this); the header
  self-heals and all four readers normalize at their one read (the
  DR.STATUS/INV-183 discipline). Validated at SUBMIT and RE-VALIDATED at
  APPROVAL — the day can be edited while a request waits, and converting a
  clock-out that is gone would leave an unpaired LunchIn that `breakPairs_`
  correctly drops, silently costing the rep the whole reopening; a refused
  resume returns {success:false} rather than marking the request Approved.
  Every surface states the EFFECT rather than naming the punch it consumes: the
  rep's confirm, the pending chip ("Resume shift · back at 19:00", never "Clock
  Out 19:00"), the manager queue row, and the decision email. The button renders
  only when there IS a clock-out and no resume is already pending.
  A genuine SECOND SHIFT is still unsupported — deliberately the resume of one
  shift, not a multi-shift model.

TEST RESULTS: passed — pure 707 → 711, DOM 98 → 101, editor 304 → 305 (the new
  `punchAdjust_resumeConvertsClockOut`), visual matrix 61 → 62. 18 mutations
  bite-checked, 18 bites (3 for the follow-on, 15 for Workstream B).
  THREE existing pins legitimately went red and were UPDATED as part of the fix,
  never worked around: the `openAdjustModal` signature match (B1 added an arg),
  the `notifyEmployeeOfAdjustDecision_` call-shape match (B3 added one), and the
  M-7 slice — which took everything up to the next named function and widened
  silently the moment a MailApp-using helper landed between them; it now takes
  the function's own body.
  TWO pin corrections during bite-checking, both the SAME trap: `indexOf` on a
  deleted needle returns -1 and `-1 < anything` is true, so an ordering check
  passed silently. The `assertBefore` helper is now hoisted and shared. INV-188
  recurred a third time this session, again in a ban-shaped assertion tripping
  on the code comment that explains the ban.
  Regression Scenarios (Test Command is `manual`): S96 WRITTEN for the resume
  path and walked mechanically through the B3 pins, the three DOM tests and the
  editor case — the deployment walk is operator-side. S92 (approved adjustment
  catches up on the rep's screen) is unaffected and its pins stay green. S3 /
  S5 / S12 / S13: NOT APPLICABLE mechanically — they need a live deployment, and
  none touches the resume path. The visual half was MEASURED rather than walked:
  the done-state render was driven in Chromium (both buttons, both icons, the
  named clock-out) and `manage-light-mobile` shot clean.

REGRESSION RISKS:
- `PAR` gained a trailing column. Every reader normalizes a missing value to
  'set', so a row written before this deploy behaves exactly as before, and the
  header self-heals rather than requiring a migration. Pinned in all four
  readers.
- `findExistingPunch_` now returns `time` alongside `sheet`/`rowIndex` —
  additive; every prior caller reads only the two it already read.
- `notifyEmployeeOfAdjustDecision_` gained a trailing `action` arg; both call
  sites pass it and an absent value reads as the ordinary punch write.
- The resume CONVERTS rather than deletes, so a day that has been resumed shows
  a break where a clock-out was. That is the intended record, and Day Edit can
  now express it (A4, same day) — before A4 the modal would have collapsed it.
- The old behaviour was not "correct but different": there was no old behaviour.
  The paths B1/B2/B3 fill were empty.

INVARIANTS AT RISK: None violated.
- INV-176 — the resume relies on it (every break pair is deducted) rather than
  adding arithmetic beside it.
- INV-155 — a resume never creates a second clock pair; the day keeps exactly
  one ClockIn/ClockOut, so the multi-shift boundary is unchanged.
- INV-106/107 — the resume rides the existing queue, keeps the window, reason
  and dup guards, and re-validates at approval as INV-107 already required.
- M-7 — both new notifications fire after `releaseLock`; the no-mail-in-lock
  scan covers them and bit when the wiring was removed.
- INV-14 / INV-105 — best-effort, branded, escaped.
- INV-183 — the new `Action` column is normalized at its one read in every
  reader, the discipline that column family exists to enforce.
- INV-187 — the resume states its effect everywhere rather than naming the
  punch it consumes, and a refused approval reports why instead of silently
  marking the request done.

NET SCORE: 3 production fixes − 0 new failure modes = 3
  (a) FO — the 390px overflow: real, present on every phone-width visit to
      Manage Time, and it WOULD have been hit this month by any manager opening
      that tab on a phone;
  (b) B2 — adjustment requests notifying nobody: the operator has reps filing
      them, so this fired this month by construction;
  (c) B3 — counted as a fix rather than a capability because the state it
      addresses (a rep unable to resume a closed day) fired live on 2026-09-01
      and had no route at all; B1 is folded into it as the same loop.
  No new failure mode: the convert model was chosen specifically to avoid the
  one this feature could have introduced (silently paying the away gap), and
  every refusal path states its reason rather than half-applying.

OPERATOR ACTIONS / DEPLOY:
- None to configure. One auto-managed column (`Action` on PunchAdjustRequests)
  appears on first use; its header self-heals. | BLOCKS DEPLOY: N
- Post-deploy `runAllTests()` now expects **305**. | BLOCKS DEPLOY: N
- Expect to start receiving an email when a rep files a punch adjustment — that
  queue previously notified nobody. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage
deployments → Edit → Version: New version → Deploy.

FOLLOW-ON ITEMS:
- A genuine SECOND SHIFT on one date (two separate clock-in/clock-out pairs) is
  still unsupported by construction — `getNextActions_` collapses it and both
  repair paths treat a repeated clock punch as damage. The resume path covers
  the case the operator described; a real multi-shift model was priced and
  rejected as disproportionate, and that decision is unchanged.
- The resume's unpaid-gap framing is a POLICY choice as much as a technical one.
  It is correct for "finished, went home, came back" and slightly conservative
  for "clocked out by mistake, resumed a minute later" (a one-minute unpaid
  break). If the operator wants the mistaken-clock-out case handled as a true
  correction instead, that is a manager Day Edit today and could become a second
  request kind later.
- Manage Time is now shot at mobile, but the ADMIN sub-tabs remain wide-only —
  the equivalent gap recorded in the Visual Audit Stage.

DOCUMENTATION UPDATES NEEDED: DONE in this change —
- A new Key Design Decision for the resume path (why it converts rather than
  deletes, the validation at both ends, and the second-shift boundary).
- The punch-adjustment KDD amended with B1/B2 and a pointer to it.
- A new operator-state entry: no setup, the auto-managed column, and the three
  behaviour changes to expect (manager emails, the Adjust prefill, Resume).
- S96 written; S7/S95 unchanged by this round.
- The follow-on's CLAUDE.md note CORRECTED — it named `.m-table` as the cause,
  which the measurement method made look true and was not.
- Counts: pure 711, DOM 101, runAllTests 305, visual 62.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
