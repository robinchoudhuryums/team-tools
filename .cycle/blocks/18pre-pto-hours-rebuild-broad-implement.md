# BROAD SCAN IMPLEMENTATION SUMMARY — PTO accrual rebuilt on WORKED HOURS

Date: 2026-08-19 · Branch: `claude/broad-scan-up98b9` · Between-cycles operator work
Operator: "3.08 PTO hours per 80 hours worked" → "8 hours per day, and PtoEnabled
will be TRUE. Can then /broad-implement PTO rebuild and tests"

## What changed and why

The 2026-08-18 accrual round credited a flat DAYS-PER-CALENDAR-MONTH figure.
The operator's real rule is a rate against hours WORKED. Reflection had already
counted that mismatch as this thread's one new failure mode; this round closes
it. **The machinery was kept and only the AMOUNT calculation replaced** — same
trigger, same column-R stamp, same in-arrears idempotence, same audit action,
same gate, same cache key.

### Server (`web-app/Code.js`)
- CONFIG: `PTO_ACCRUAL_BASIS_HOURS: 80`, `PTO_HOURS_PER_DAY: 8`.
- Column Q semantics: PTO hours per basis hours WORKED (3.08 for the PH team).
- `accrualDaysForHours_(hours, rate, basis, perDay)` — pure; returns
  `{ptoHours, days}` at 2dp, or **null** on anything unreadable. `null`/`''`
  are rejected BEFORE `Number()`, which coerces them to 0 and would make an
  unread month indistinguishable from a genuinely zero-hours one (INV-176/187).
- `workedHoursByEmpForRange_` — **ONE** range-wide Timesheet index for the whole
  run (C17-9 / INV-153: a per-rep `buildTimesheetForEmployee_` would be N
  full-sheet reads inside the global lock). Reads THROUGH `TimesheetArchive`
  when the catch-up range predates the live tab (INV-153/F1), dedupes a row
  present in both tabs (INV-132), uses `calcHours_` per day, marks an
  unparseable day INCOMPLETE rather than 0 hours, and **throws** on a failed
  read so the run aborts rather than crediting from partial hours.
- `creditMonthlyPtoAccruals` rewritten: two passes (build plans + earliest owed
  month, then one index build), per-rep credit through `adjustLeaveBalance_`,
  audit row carrying `hoursWorked= rate= ptoHours= days= months= through=
  balance=` plus any incomplete-day count, and a distinct zero-hour audit row.
  Credit + audit still land BEFORE the stamp advances.
- `empPtoAccrual_` now parses the **first numeric token** instead of stripping
  non-digits. This was a live defect the new pin caught while it was being
  written: `'3.08 h/80h'` stripped to `3.0880` → **3.088**, a silently wrong
  rate feeding real balance credits.

### Client (`web-app/tc/script_timeoff.html`)
Accrual tile states only what is true: the credited balance, the rate in its
real terms (`ACCRUING 3.08H / 80H`), and a server-computed month-to-date earned
line. The **year-end projection and the progress bar are gone** — an accruing
balance has no ceiling to fill and no knowable future work pattern to project
from, so both were invented numbers (INV-187). The blank-column-Q legacy tile
is untouched, bar and all.

## Tests
- Pure suite **556 → 556** — both accrual pins were REWRITTEN in place, not
  added. That is the honest bookkeeping when a contract changes under a test.
- Editor: `test_creditPtoAccrual_seedCreditIdempotent` rewritten to write two
  8-hour test days into the credited month and assert the credit those hours
  imply (expectation computed from the rule, not read back from the helper
  under test); the fixture rows are deleted in `finally`, because leaving them
  would make every later run credit a different amount and the assertion would
  rot rather than fail honestly.
- Visual fixture: `ptoAccrualPerMonth: 1.25` → the real server field names
  (`ptoAccrualPer80`/`ptoAccrualBasisHours`/`ptoHoursPerDay`/`ptoAccrualMtd`),
  arithmetically self-consistent (INV-185).

### Bite-checks (11, all reverted with python inverse edits)
null-hours guard removed · incomplete-day → 0 · archive read-through disabled ·
live/archive dedupe removed · zero-hour audit row removed · basis 80→40 ·
hours-per-day 8→7.5 · rate parser back to digit-strip · tile rate line dropped ·
tile MTD line dropped · fill bar re-added to the accrual branch.

**One did not bite on the first attempt**: re-adding a progress bar passed,
because the pin asserted the absent *projection* but not the absent *bar* —
the property it claimed. Tightened to a branch-scoped ban (the legacy tile
below keeps its bar, where the max is real) and re-bitten.

## Operator actions
1. **Re-enter every column-Q value in the new units** — a cell left at `1.25`
   from 2026-08-18 now reads as 1.25 PTO hours per 80 worked, roughly a third
   of the intended rate.
2. Re-run `installAutomationTriggers()` once (unchanged from the prior round).
3. Stop routine manual monthly top-ups for accruing agents (unchanged).
4. `runAllTests()` after deploy — the rewritten accrual test executes only in
   the editor.

## Not done
- The visual re-shoot was still running when this block was written; the
  timeoff scenarios need a look before the tile change is considered verified.
