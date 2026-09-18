# Cycle State

## Current
Cycle: 21
Phase: implement
Scope: Reference lookups — the two-panel restructure (KB / Reference subsystem)
Test Command: manual
Estimates: R (reference lookups restructure): M (~4 h) — written before the
first edit. Actual ~3.5 h.
Subsystem cycles since last Seams audit: 6 — **still overdue.** This cycle is
an operator-requested interface batch, not an audit, so it does NOT reset the
counter and does NOT discharge the cadence. The next `/audit` MUST be a Seams
& Invariants audit.
Updated: 2026-09-18

## In progress (facts to carry forward — NOT judgments)
- Batch R is implemented, committed and pushed on `claude/festive-noether-unougu`
  (3 commits on top of the cycle-20 close-out). NOT deployed, and no PR opened —
  the operator has not asked for one.
- The block is `.cycle/blocks/21-reference-lookups-broad-implement.md`.
- The next concrete step is the operator's: `clasp push -f` + a New-version
  deploy, then the S112 walk. `/sync-docs` is owed first — five doc files
  describe the three-panel surface that no longer exists.

## Completed this cycle
- R-1 | web-app/70_kb.js | checkOopEligibility ships the whole oopRowObj_ shape
- R-2 | web-app/kb/script_kb.html | one panel, one row renderer, both payloads
- R-3 | web-app/kb/script_kb.html | oopDegraded_ — a failing address keeps the prices
- R-4 | web-app/kb/script_kb.html | the band, both g50 triggers, auto-fit fields, V-9 cap
- R-5 | web-app/kb/script_kb.html | visible labels on both fields
- S112 + S73 rewritten for the merged panel

## Pending / not yet done
- **DEFERRED by the cycle-20 scan, still an operator decision:** F-09's holiday
  FALLBACK. Keep g123's federal fail-open, or match the Department Dashboard's
  no-fallback. Batch 3 surfaces which calendar is live either way, so this is a
  policy call rather than a defect.
- **DONE this cycle — the restructure shipped as TWO panels, not three** (the
  operator chose the merge after the plan showed panels 2 and 3 read the same
  tab). What remains is the deploy and the S112 walk. The superseded note:
  three stacked panels on the Reference landing and in the drawer, the
  assessment being in the
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

## Decisions made (so the next session doesn't re-litigate)
- TWO panels, not three. Panels 2 and 3 read the SAME operator tab through the
  same row reader; panel 1 keys on payor name with no join key to items. The
  operator chose the merge once that was shown.
- The grid lives in the landing HOST, never in the shared section renderer —
  that is what lets one section serve the landing and the ~340px drawer.
- The field pair is `auto-fit`, NOT a media query. A third responsive case
  exists that g50's two triggers cannot see: the drawer's width is set by
  neither the viewport nor data-compact.
- `checkOopEligibility` ships the WHOLE row object rather than a subset. The
  subset is what let the two readers drift; shipping the shape makes one
  renderer possible, which makes the drift unrepresentable rather than
  remembered.

## Where I left off
Batch R is done and pushed; the tree is clean and every harness is green
(pure 914, DOM 131, lint, manifest, counts, visual 6/6 with the shots read).

Do `/sync-docs` next — five doc files still describe three lookup panels, and
the block lists exactly which. Then the operator deploys and walks S112.

The Seams & Invariants audit is STILL overdue (counter 6, cadence 4). This
batch was operator-requested interface work and does not discharge it.
