---CYCLE SUMMARY BLOCK---
Scope: between-cycles operator work (three merged PRs) | Cycle: 18pre / 2026-08-19
Production fixes: 4 — severity: 4 Low (all user-visible interface/perf, operator-reported)
New capabilities/features: 8
Defensive/structural: 6
New failure modes: 1 — severity: 1 Medium (accrual model vs. the real entitlement rule)
Net score: 4 − 1 = 3
Invariant candidates: INV-194 (WRITTEN this round — PTO accrual credits are
system-computed, in arrears, idempotent, and fail toward visible over-credit)
Most structurally significant change: `creditMonthlyPtoAccruals` — the first
AUTOMATED write to the payroll-adjacent leave-balance column, with the
credit-before-stamp ordering that makes its worst case a visible over-credit
rather than a silent lost month
Should-have-been-deferred: the accrual RATE MODEL — the machinery was built
before asking what the accrual rule actually is, and the answer (3.08 hours
per 80 hours WORKED) is a different model from the days-per-calendar-month
one that shipped
---END CYCLE SUMMARY BLOCK---

## Why this is a `18pre` block and not a cycle reflection

Cycle 17 closed and was reflected on 2026-08-05 (`17-a-reflect.md`, metrics
row appended). Everything below landed AFTER that, as operator-requested
feature work between cycles — the same `18pre-*` naming the two
broad-implement blocks in this directory already use. **No metrics.csv row is
appended for it:** the template's rule is exactly one `phase=reflect` row per
CYCLE's reflection, cycle 17's already exists, and writing a second cycle-17
row would double-count that cycle in any trend report. The seam counter is
likewise NOT incremented — this is not a subsystem cycle, and cycle 18 (the
DUE Seams & Invariants audit, counter 4/4) has not opened.

## The three PRs

- **#171** — Spanish bilingual-members editor; compact auto-tag rules list;
  full-width sweep (Punctuality/Admin caps dropped + a reported list of other
  pages); load-time/caching sweep incl. a DeptRequests result cache and a 6h
  dashboard TTL; Team Metrics opened to reps as a whitelist-built AGGREGATE
  (per-rep table stays manager-only per INV-124); dashboard→Metrics
  click-throughs.
- **#172** — Time/PTO CONSOLIDATED to one page (the Time Off ⇄ Timesheet mode
  toggle and `umsMergeMode` retired, dead `.mp-mode` CSS deleted per INV-184);
  quick-actions Requests card; pay-statement "Request edit" click-through into
  the adjust flow; CN pop-out fluid `clamp()` type + ≤400px narrow stacking.
- **#173** — multi-day time-off requests (`submitTimeOffRange`: atomic, one
  Pending row per weekday, weekends skipped, conflicts reject the batch naming
  the dates); system-computed PTO accrual credits (INV-194).

## Q1/Q2 per action

**Production fixes (Q1 YES — 4.** Per R18, a user-visible interface defect on
a path users hit counts YES; its trigger is a user opening the surface. All
four were reported by the operator from live use, so "would it have fired" is
not hypothetical — it did.)

1. **Narrow pop-out wrapped one letter per line** (#172). The operator's own
   screenshot of a ~300px pinned pop-out: field values unusable. Fixed by a
   `:root[data-compact]` ≤400px stacking block; measured stacked with zero
   overflow at 300/360px, byte-identical at 480px.
2. **Pages not using the full width** (#171). Punctuality and Admin carried
   inner 780/820px caps; Punctuality had never been screenshotted, which is
   why two prior width passes missed it.
3. **Auto-tag rules card grew without bound** (#171). Reported as "that card
   extends indefinitely"; replaced with a compact 2-up scrolling list.
4. **Dashboard / Spanish / Dept-Requests cards slow to load** (#171).
   Reported twice. JUDGMENT FLAGGED: R18 enumerates layout/control/error-state
   defects, not latency; I am counting it because it is user-visible, on the
   landing surface, and was raised from live use — but a stricter reading
   would classify it as a capability.

**New capabilities (8):** Spanish-members editor; rep-facing Team Metrics
aggregate; dashboard click-throughs; Time/PTO consolidation + quick-actions
card; pay-statement request-edit click-through; pop-out fluid type; multi-day
time-off ranges; system-computed accrual credits.

**Defensive/structural (6):** the `hoursByDate` → `workedHoursByDate` visual-
fixture drift (INV-185 class — the calendar's hour badges had never rendered
in ANY Time/PTO screenshot); a `tzMismatchCheck_`-declared-once pin after I
nearly added a second, weaker boot-time copy of a detector that already
shipped; the `umsTzWarnedDay` harness seed (the sticky tz toast was covering
the top of every screenshot); the sync-docs correction of a superseded
operator instruction (below); the `umsMergeMode`/`.mp-mode` retirement; the
in-session dark-mode contrast fix on the new Request button (caught before
shipping — deliberately NOT counted as a production fix).

**New failure modes (Q2 YES — 1 Medium).**

**The accrual model does not match the entitlement rule for the population it
was built for.** Established after #173 merged, from two facts each verified
against the tree today:
  (a) `creditMonthlyPtoAccruals` skips any rep whose `PtoEnabled` is FALSE
      (Code.js, the INV-27 gate) — and CLAUDE.md documents the PH team as
      exactly that population ("Contractors (e.g. PH team) get `FALSE` in
      column K");
  (b) column Q is a rate in DAYS PER CALENDAR MONTH, credited on a month
      boundary regardless of hours worked, while the real rule is **3.08
      hours per 80 hours WORKED** — an hours-driven entitlement.
Today the feature is INERT for that population (it credits nobody), which is
why this is Medium and not High. It becomes wrong the moment the operator does
the natural thing: set column Q and flip `PtoEnabled` to TRUE. Then balances
are credited on calendar time rather than earned hours, writing numbers the
entitlement rule does not support into a payroll-adjacent column. Counting
this as a new failure mode rather than a "spec gap" is the honest read: the
post-state contains a mechanism that can write wrong balances, and the
template is explicit that a worse state under a realistic scenario is a
regression, not a tradeoff.

## Honest impact summary

- **For a user right now:** the pinned pop-out is usable at narrow widths;
  Time/PTO is one page with a clear request affordance instead of two
  near-identical ones; an incomplete day on the pay statement has a one-click
  path into the fix flow; PTO can be requested for a date range; managers'
  Punctuality/Admin pages use the window they are given. Nothing about
  accrual has changed for any user, because the feature is gated behind a
  column nobody has filled.
- **For the next developer:** INV-194 documents an ordering guarantee worth
  copying (credit-and-audit BEFORE advancing the idempotence stamp, so the
  failure mode is a visible duplicate rather than a silent omission). The
  Time/PTO consolidation removed a whole mode dimension — one page, one rail,
  one submit path for PTO requests. `umsMergeMode` is retired (16 keys).
- **Safer under scale:** honestly, little. This work touched no locks beyond
  the accrual writer, no bounded reads, no trigger cadence except adding one.
  The DR result cache and the 6h dashboard TTL reduce repeat reads on the two
  slowest surfaces; that is the whole of it.
- **Effort on dead code / future-proofing:** the accrual rate model — see
  should-have-been-deferred. The machinery is sound and reusable; the rate
  formula was built on an assumption I did not check.

## Process notes

- **Container rollbacks hit five times** in this stretch (HEAD silently
  reverting to a much older commit mid-session). Recovery is
  `git fetch origin <branch> && git reset --hard origin/<branch>`; the
  practice that made it survivable is committing and pushing after every
  unit, which cycle 17's INV-191 already prescribes for a different reason.
- **A near-miss worth recording:** I wrote a roster-vs-device timezone
  detector into the boot handler before discovering an equivalent one had
  shipped on 2026-08-13 under the same function name. A duplicate `function`
  declaration would have silently won by hoisting while `extractFunction`
  pinned the first. Removed, and pinned declared-once.
- **The derived tripwires paid out again** (INV-179): registering
  `creditMonthlyPtoAccruals` in the trigger TARGETS arrays auto-generated its
  gate-coverage test with no test edit — the pure harness went 554 → 555 on
  the wiring commit alone.

Tests at close: pure **556**, DOM **71**, visual matrix **42** (0 missing /
0 overflow). Editor suite +3 and **UNRUN** — `runAllTests()` is the only
thing that exercises the accrual credit against a real sheet.
