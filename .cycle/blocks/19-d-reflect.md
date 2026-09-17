---CYCLE SUMMARY BLOCK---
Scope: Server (PTO accrual, Spanish, KB/OOP), Client (Call Notes, Time Clock manager, Reference), Test Suite | Cycle: 19 / 2026-09-17
Production fixes: 9 — severity: 1 Critical (the accrual credit threw on every run), 2 High (late accrual data lost; integration tests writing to the live PHI/payroll store), 4 Medium (no open-punch visibility; the ambiguous accrual zero; Spanish resolve left the count stale; the voicemail snippet showed vendor chrome), 2 Low (no in-flight signal on resolve; sub-threshold hang-ups became task cards)
New capabilities/features: 7
Defensive/structural: 11
New failure modes: 4 — severity: 1 Critical (the perDay ReferenceError shipped by the resolver extraction), 3 Medium (a lost audit row now over-credits; the blocking client/server quote-line mirror; the shared uncapped geocode quota)
Net score: 9 − 4 = 5
Invariant candidates: INV-210 (a derived ledger that replaces a stamp as the idempotency key must fail toward UNDER-crediting) · INV-211 (every `_TEST_OVERRIDE_*` a resolver reads must be assigned by a fixture, outside its own declaration, to a real value) · INV-212 (a shared external quota needs one accounted consumer path and an honest exhausted message) · INV-213 (a fixture mirrors the operator's real header row, never the code's assumption)
Most structurally significant change: `scripts/lint-server.mjs` — name resolution over the ONE Apps Script global scope, in CI; it closed the gap between "parses" and "runs" that let a Critical payroll defect ship past four green pins and `node --check`, and found three more instances on its first run.
Should-have-been-deferred: ELIG. It contributed both design-level new failure modes (the uncapped shared geocode quota, and with OOP-B the blocking mirror), it was the one L estimate in the window and the least accurate at 0.44x, and the operator's own decision made its city rows information-only — so half the registry it introduced changes no verdict. OOP-A/B answer the question a rep actually asks; the address check could have waited until the quota question was settled.
---END CYCLE SUMMARY BLOCK---

## Corrections to the implementation self-reports

Three, all in the strict direction, all mine to make.

1. **PTO1/PTO2 were scored as 2 production fixes; they are new capabilities.**
   The block itself wrote "NO, in the defect sense: nothing was broken ... a
   capability gap rather than a bug" and then reached for the R18 rule to
   upgrade them. R18 counts user-visible interface DEFECTS — broken layout, an
   unreachable control, a missing error state. A working surface existed (the
   pending card's `12 → 11 d` chip); adding the balance to two more surfaces is
   a feature. Batch PTO: 2 fixes → 0.

2. **OOP-C was scored +1; it is 0 − 0.** The defect (the item name read from
   column A) was introduced by OOP-A and fixed by OOP-C inside this same
   reflection window, and it never ran anywhere — the code was merged but not
   deployed. Q1 asks for "real, currently-reachable"; it was not reachable.
   Counting the fix at +1 while counting OOP-A's own pre-deploy defects at 0
   would be a one-directional accounting. The same rule nets #247's unreachable
   `previewPtoAccruals('YYYY-MM')` against #248's entry point: 0.
   What OOP-C is worth is not a point — see the method note below.

3. **Batch R reported 0 new failure modes; it introduced one.** R moved the
   idempotency key from the column-R stamp to the `PtoAccrualCredit` audit rows.
   A lost audit row therefore makes a credited month read as never-credited, and
   the next reconcile tops it up again — a silent DOUBLE credit, in the
   generous direction. Audit-write failure is not hypothetical here: the
   `WITNESS_AUDIT_FAILS` counter exists because it happens, which is why R
   moved these three writes to `writeWitnessAuditLog_` in the first place. The
   retry and that counter are real mitigations and the finding surfaces on
   Automation Health, but before R a lost audit row was harmless. Medium.

## The one that matters: a Critical regression shipped and fired

`#246` extracted `planPtoAccrualRun_` as the ONE accrual resolver. The credit's
own `const basis = …, perDay = …;` moved into the extracted function and only
`basis` was re-declared at the call site. `creditMonthlyPtoAccruals` then threw
`perDay is not defined` on EVERY run — including the 18:00 run that was supposed
to top 2026-08 up, i.e. the exact run Batch R had just been built to make work.

Four Node pins stand over that function and all four stayed green, correctly:
every pin is built on `serverSource()` and asserts on SHAPE, and the shape was
perfect. `node --check` parses each server file in isolation, where an
undeclared identifier is legal. Between "parses" and "runs" lies name
resolution, and nothing checked it.

This is why the tally counts a Critical new failure mode AND a Critical
production fix for the same identifier: it shipped, it fired for two days, and
it was fixed inside the window. Net zero on the score, and the real yield is
`lint:server`, g118 and INV-207 — a class of defect the project could not
previously see at all.

## Honest impact

**For a user, right now.** A rep can look up an out-of-pocket price from the
Reference landing or the Ctrl/⌘+K drawer, insert a LABELLED price into an
external email that the server re-verifies against the sheet at send time, and
check an address against the eligibility rules. Their Spanish inbox no longer
turns 1-second hang-ups into task cards, shows the transcript instead of ~220
characters of 8x8 boilerplate, and Mark-resolved actually decrements the count.
A manager sees leave balances where the approve decision is made, and an 8am
open-punch scan reaches them in the 9am health digest. And the PTO accrual runs
at all again, tops up late data instead of losing it behind a stamp, and says
which of three things a zero meant.

**For the next developer.** `npm run lint:server` catches a ReferenceError
before the runtime does. FORMS and QA have fixtures, so an integration test no
longer writes to the live PHI store — which IS the ADP/payroll spreadsheet when
`FORMS_SS_ID` is unset. The OOP reader discovers every column by header and has
a diagnostics panel that reports its own assumptions, including which column it
treats as the item name.

**Under scale / concurrent load.** The open-punch scan is read-only and takes no
lock. The reconcile rides the resolver's EXISTING range rather than opening a
second full-sheet read inside the ScriptLock. `searchOopPricing` reads the grid
once instead of a name column plus N row fetches. Against that, honestly: the
daily credit now reads the Timesheet every day rather than only when a month is
owed, a cost taken deliberately so a fix lands the next night.

**Effort on dead code / zero-caller paths.** Some, and it recurs. `sickLeave`
now rides the PTO projection unread (the g04 shape, self-identified). Three
`_TEST_OVERRIDE_*` globals were read by resolvers and declared nowhere.
`_withTestOop_` shipped with OOP-A and nothing called it for a whole batch —
worse than a dead CONFIG key, because it LOOKS like coverage. `.sp-task.is-busy`
had been dead CSS since 2026-08-24 and was finally wired to the action it was
written for. And ELIG's city rows are information-only by decision, so the
`Accepts` column is operator-maintained and changes no verdict.

## Method note — the thing worth more than a point

OOP-C was found by pasting the operator's real header row into a vm sandbox and
running it through the LIVE reader, rather than reading the code against it. The
output printed the role assigned to each of twelve headers, the object a rep
would see, and the score for four plausible queries. Three defects fell out in
one pass; reading would have found the first and probably missed the third.

The reason the defect survived OOP-A and OOP-B is the second half: the fixture
had `Item` in column A — the same belief the code held. A fixture built from the
code's assumption cannot falsify it; it is a second copy of the assumption
wearing a test's clothes. That is INV-213.

## Invariant growth

[INV-210] | When a function's idempotency key moves from a stamped cell to a DERIVED ledger, a lost ledger entry must fail toward UNDER-crediting or toward a reported discrepancy — never toward re-applying the credit. | Server (PTO accrual) | Verify: an editor test that deletes one `PtoAccrualCredit` row and asserts the next `creditMonthlyPtoAccruals` reports a discrepancy instead of topping the month up again.
[INV-211] | Every `_TEST_OVERRIDE_*` a store resolver READS must be ASSIGNED by a fixture — outside its own declaration, and to a real id. A branch that is read but never assigned is not isolation. | Test Suite / store resolvers | Verify: the existing `fixtures: every _TEST_OVERRIDE_*` pin (written in #252, bite-checked three ways) — this numbers a rule that shipped with only a gotcha (g119).
[INV-212] | A shared external quota (the built-in Maps geocoder) has ONE accounted consumer path and an honest exhausted message; a second consumer may not be added without a cap. | Seam: Reference/KB ↔ eligibility | Verify: a pin requiring every geocode entry point to route through one counted helper, plus a DOM pin that the exhausted state says so rather than "could not find that location".
[INV-213] | A fixture for an operator-maintained store mirrors the OPERATOR's real header row, never the reader's default assumption. | Test Suite / fixtures | Verify: a pin asserting the `OopPricing` fixture's header row is NOT the reader's fallback shape (name in column A) — it must carry a non-name column A, as the operator's sheet does.

## Seam counter

Incremented 3 → 4. Recorded honestly: the precedent inside cycle 19 is
inconsistent — 19-a moved it 1 → 2, 19-b deliberately did NOT increment (its
stated reason: a reflection closing a batch set INSIDE a cycle is not a new
subsystem cycle), and 19-c then moved it 2 → 3 while leaving 19-b's "do not
correct this to 3" parenthetical standing underneath the new value. This
reflection follows 19-c and the command, and rewrites the stale parenthetical
rather than leaving a warning that contradicts the number above it.
At 4 the every-4 cadence is met: the next `/audit` should be a Seams &
Invariants audit.
