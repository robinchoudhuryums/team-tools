---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: A1 (calcHours_ sums every break pair), A2 (five hours
builders accumulate breaks through one helper), A3 (sheet doctor stops calling
a matched break pair damage), A5 (reportMultiBreakDays impact report), A6
(pins + docs). A4 (Day Edit N-pair rebuild) DEFERRED to its own PR — it
changes the slots payload shared by managerSaveDay and managerSaveDayRange
and re-derives the S7 reconcile contract, which does not belong in the same
diff as payroll arithmetic.

Files modified: web-app/Code.js, web-app/tc/script_manager.html,
test/client/run.js, test/visual/mock.js, CLAUDE.md

CHANGES:
A1 | web-app/Code.js | New `breakPairs_` is THE pairing rule, shared by the
  arithmetic and the display builders so they cannot disagree about which
  stamps pair. Stamps normalize onto the SHIFT timeline before sorting (a time
  at or before the clock-in belongs to the next day — the same wrap the clock
  pair uses), so an overnight 02:00 break sorts after a 23:50 one. Unpaired or
  malformed extras are dropped (the missing-lunch shape, INV-176). calcHours_
  sums the pairs and accepts string OR array, so the four Tests.js string call
  sites are untouched.
A2 | web-app/Code.js | New `punchDayAdd_` accumulator; all five hours builders
  route through it (accrual index, timesheet, employee calendar, team calendar,
  dashboard sparkline). Breaks accumulate; ClockIn/ClockOut stay LAST-WINS
  (multi-shift is a different feature). The two builders that PUBLISH break
  times keep their scalars via `punchFirst_` — deliberately NOT derived from
  breakPairs_, so a rep on lunch right now still shows the unpaired stamp — and
  add `breaks: [{out,in}]` beside them.
A3 | web-app/Code.js | New `tsDoctorLegitBreaks_`, consulted by BOTH the
  detector and the collapse so the card can never offer to delete what the
  repair keeps. N leaves + N returns is legal data; counts that disagree stay
  damage; a repeated clock punch is always damage.
A5 | web-app/Code.js | `reportMultiBreakDays()` — read-only, manager-gated
  (INV-44), reads live + TimesheetArchive with live-vs-archive dedupe
  (INV-132), and reproduces the OLD figure by feeding the SAME calcHours_ the
  last stamp of each type rather than re-implementing removed arithmetic.
A6 | test/client/run.js | Four new pins (699 -> 703), behavioural wherever a
  property can be driven. THREE existing pins went red and were updated as part
  of the fix: two vm sandboxes needed the new helpers, and the derived
  team-calendar fixture-shape pin read the word "Additive:" out of a COMMENT
  inside the push literal as a key (INV-188, shape-extraction direction) —
  fixed by stripping line comments from that literal.
A6 | test/visual/mock.js | Fixtures gain `breaks` per INV-185; the
  team-calendar fixture now carries a REAL two-break day so the new shape is
  on camera.
-- | web-app/tc/script_manager.html | The team-calendar "+N" chip tooltip said
  "open Day Edit for the full day". Making breaks legal turned that into advice
  to perform the one action that destroys them. Rewritten to say the hours
  already count every pair and to avoid Day Edit until A4.

TEST RESULTS: pure 703 passed / 0 failed; DOM 91 passed / 0 failed. Four
mutations, four bites (last-pair-only arithmetic; one builder back to
last-wins; the repair-side guard dropped while the detector keeps its own; a
write added to the read-only report). Visual matrix re-shot after the fixture
change.

REGRESSION RISKS:
- `pm.LunchOut`/`pm.LunchIn` changed type (string -> array) internally. All
  nine readers were enumerated before the change and each handled; the two
  emitters keep scalars so no client wire contract breaks.
- The scalar `lunchOut`/`lunchIn` now name the FIRST break rather than the
  last. Identical on a single-break day (the overwhelming majority);
  deliberate and documented on a multi-break day.
- Hours CHANGE on historical multi-break days — always a reduction. This is
  the fix, not a regression, but it is operator-visible: reportMultiBreakDays()
  exists so it can be seen before deploy rather than discovered after.

INVARIANTS AT RISK:
- INV-176 EXTENDED (breaks sum; the null/unpaired posture is preserved).
- INV-155 amended: multi-lunch is now legal end to end except in Day Edit,
  which is named as the remaining gap.
- INV-188 recurred and was fixed in the tripwire rather than worked around.
- INV-132 / INV-44 / INV-185 honored by the new report and fixtures.
- INV-169: reportMultiBreakDays has no payload cap. Acceptable for a manual
  editor report; noted as a follow-on if a run ever truncates the log.

NET SCORE: 1 production fix (the arithmetic silently paid for every break but
the last) − 1 new failure mode (A1 elevates Day Edit's collapse from
"discards data the arithmetic ignored" to "discards data the arithmetic
counts") = 0. A4 closes it.

OPERATOR ACTIONS / DEPLOY:
- Run `reportMultiBreakDays()` in the Apps Script editor BEFORE deploying, and
  read the execution log. | BLOCKS DEPLOY: N (advisory, but the point)
- Do not use Day Edit on a day the report names until A4 lands. | BLOCKS
  DEPLOY: N
Deploy: cd web-app && clasp push -f, then Deploy -> Manage deployments -> Edit
-> Version: New version.

FOLLOW-ON ITEMS:
- A4 (Day Edit N pairs) — required to close the failure mode above.
- Workstream B (B1 prefill, B2 notify-on-submit, B3 resume path).
- The team-calendar "+N" chip could render the real pairs once A4 lands.

DOCUMENTATION UPDATES NEEDED: done in this PR (INV-176 summing rule, INV-155
amendment + named gap, operator-state entry with the pre-deploy report step,
regression scenario S95, narrative count 699 -> 703).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
