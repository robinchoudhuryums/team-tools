# Cycle State

## Current
Cycle: 21
Phase: implement
Scope: Reference lookups — the two-panel restructure (KB / Reference subsystem)
Test Command: manual
Estimates: R (reference lookups restructure): M (~4 h) — one batch, written
before the first edit. Server payload shape + one shared row renderer + the
two-column band with both collapse rules + the degraded-address fallback +
pins (DOM, Node) + a visual pass.
Subsystem cycles since last Seams audit: 6 — **still overdue.** This cycle is
an operator-requested interface batch, not an audit, so it does NOT reset the
counter and does NOT discharge the cadence. The next `/audit` MUST be a Seams
& Invariants audit.
Updated: 2026-09-18

## In progress (facts to carry forward — NOT judgments)
- Nothing is in flight. `main` is at PR #262's merge; the branch
  `claude/festive-noether-unougu` has no unmerged commits.
- Cycle 20 shipped: 52 of the scan's 53 findings are live on prod as of
  2026-09-18, verified by `runAllTestsPartB` 122/122 on the deployed project
  and by the operator's S112 walk.
- The next concrete step is a decision, not a task: either the Seams &
  Invariants audit (overdue) or the Reference three-panel restructure the
  operator raised on 2026-09-18.

## Completed this cycle
- (Cycle 20's per-finding record is in `.cycle/HISTORY.md` and the seven
  `.cycle/blocks/20-batch*-broad-implement.md` blocks. Nothing has been
  completed against a NEW cycle — none is open.)

## Pending / not yet done
- **DEFERRED by the cycle-20 scan, still an operator decision:** F-09's holiday
  FALLBACK. Keep g123's federal fail-open, or match the Department Dashboard's
  no-fallback. Batch 3 surfaces which calendar is live either way, so this is a
  policy call rather than a defect.
- **Reference three-panel restructure (operator, 2026-09-18).** Insurance
  lookup, OOP price lookup and area eligibility are three stacked panels on the
  Reference landing and in the drawer. The operator confirmed they WORK and
  asked for the format/design/UI to be planned. The assessment is in the
  2026-09-18 session; the one item in it that is a defect rather than a polish
  is the pair of unlabelled twin inputs on area eligibility, where the item
  field carries only an `aria-label` and its placeholder vanishes once filled.
- **Still owed from cycle 19's post-deploy walk:** step 8 — `INSTANCE_IS_PROD=true`
  plus standing up the DEV instance. The integration tier ran against the
  deployed PROD project for the first time on 2026-09-18 and immediately found a
  real defect, which is the argument for the dev instance rather than against
  it: that run wrote TEST_ rows to production stores. Steps 2, 5 and 6 of that
  walk are also unconfirmed.
- **The remaining cycle-20 post-deploy walk items**, none blocking: S111 step 5
  and S110 step 5 (the two Admin → System source findings), S7's two new Day
  Edit steps, S113 (the two modals), and the sheet doctor run that would settle
  whether the equal-minute 24-hour-day defect ever actually fired in payroll.
- **INV-225, INV-226 and INV-227 are RESERVED, not written.** Cycle 20's
  reflection proposed them and could not verify any; they are held by name in
  `.cycle/config.md`. Adopt them with the round that can verify them, or let the
  Seams audit take them. Do not reuse the numbers.

## Open follow-on items
- `docs/gotchas.md` g139 and `bite.sh --fn` both landed on 2026-09-18 from the
  first full editor run. The lesson generalises: a test asserting on an
  aggregate over an append-only log needs its own baseline.
- CLAUDE.md's storage map says the OopPricing **Area Eligibility column is
  "READ BY AN ENGINE, not displayed"**, but `eligRenderResults_` renders it as
  `sheet: <value>` under each item. Either the doc line is stale or the display
  is unintended — a `/sync-docs` pass should resolve which.
- The Reference browse tree shows pairs with identical labels distinguished
  only by icon (Billing Procedures Guide, Oxygen Procedures, Power Roster).
  Probably an article beside a Drive embed; if so the icon alone carries the
  distinction and the tree reads as broken.
- `gatedEndpointsFromSource_` in run.js knows TWO gate families while
  counts.mjs now derives three. Widening it would require every
  `assertManagerCaller_` and `canSeeQa_` endpoint to have a gate test in the
  omnibus.
- The geocode quota is shared and uncapped, and the eligibility RULE is not
  shown in the price lookup itself. Both are real work, logged since the OOP
  round.
- `oopEligibilityParse_`'s STATES branch reads "TX or CA" as Texas plus Oregon
  plus California, because it uppercases "or". The radius branch's equivalent
  was closed by F-23; this one was not.

## Decisions made (so the next session doesn't re-litigate)
- Cycle 20's tally is the REFLECT block's (net 25), not the sum of the
  implementation blocks (29). The reflection corrects them in four places and
  is the later, honest source.
- The accrual ledger's high-water-mark rule is CORRECT and must not be changed
  to latest-wins: it is what makes the credit idempotent on hours already paid
  for, and latest-wins would double-credit a month whose audit row went stale.
- A bite mutation is scoped with `--fn`. Unscoped it edits the first match
  anywhere in the file, which produced two true verdicts about the wrong test
  in one session.
- Reserved invariant numbers are written NOT in `INV-N |` entry shape, so the
  derived library count stays honest rather than depending on a regex accident.

## Where I left off
Cycle 20 is closed, deployed and archived. Nothing is in flight and the tree is
clean.

Two candidate next moves, and they are not equivalent. The **Seams & Invariants
audit** is overdue by the project's own cadence and is what the counter says to
do. The **Reference three-panel restructure** is what the operator asked about
on 2026-09-18; it carries one genuine defect (the unlabelled twin inputs) that
could be fixed on its own in minutes without waiting for the redesign.

Whichever opens next sets `Cycle: 21` in this file.
