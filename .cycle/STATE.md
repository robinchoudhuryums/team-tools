# Cycle State

## Current
Cycle: 21
Phase: implement
Scope: Reference lookups (batch R, done) · Seams & Invariants (batch S, F1–F5)
Test Command: manual
Estimates: R (reference lookups restructure): M (~4 h) — written before the
first edit. Actual ~3.5 h. · S (seams batch F1–F5): M (~5 h) — written before
the first edit. Actual ~2.5 h (two findings were smaller than the audit said).
Subsystem cycles since last Seams audit: 6 — **the audit RAN on 2026-09-18 and
its findings are implemented (batch S). `/reflect` resets this to 0.**
Updated: 2026-09-18

## In progress (facts to carry forward — NOT judgments)
- Batch R (Reference two-panel restructure) and batch S (Seams F1–F5) are both
  implemented and pushed on `claude/festive-noether-unougu`. No PR opened.
- Blocks: `.cycle/blocks/21-reference-lookups-broad-implement.md` and
  `.cycle/blocks/21-seams-broad-implement.md`.
- The Seams & Invariants audit RAN this cycle and is discharged — `/reflect`
  should reset the seam counter to 0.
- Next: `/sync-docs` for batch S (the seams block lists what is owed), then
  `/reflect` for cycle 21. The operator still owes batch R's deploy + S112 walk;
  batch S needs NO deploy (no `web-app/` file changed).

## Completed this cycle
- R-1..R-5 | web-app/70_kb.js, web-app/kb/script_kb.html | the two-panel merge
- R-6 | web-app/kb/script_kb.html | every landing block is a section or the band
- S-F1 | test/client/run.js | AUDIT.TS + CN.DATE_LOCAL covered; the derived half
- S-F2 | test/client/run.js, harness.js | H-1's fifth consumer + serverCallersOf
- S-F3 | .cycle/config.md | INV-208/209 now point at S112
- S-F4 | test/client/run.js | id-uniqueness pin
- S-F5 | test/client/run.js | the Verify ratchet at floor INV-139

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
Batches R and S are both done and pushed; the tree is clean and every harness is
green. Batch R's `/sync-docs` is already applied; batch S's is NOT — its block
lists the four files owed.

Do `/sync-docs` for batch S, then `/reflect` for cycle 21 (which resets the seam
counter to 0 and can adopt the three reserved invariant numbers).

Batch S scored 0 − 0 honestly: every finding was a hole in a safety net, no live
defect existed, and the audit over-reported two of the five. Do not let the
effort tempt an upgrade at reflect time.
