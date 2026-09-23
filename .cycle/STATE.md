# Cycle State

## Current
Cycle: 22 — opened 2026-09-23 by a `/broad-scan` (99 findings: 0 Critical /
3 High; nine-batch implementation plan). Cycle 21 + 21post are in HISTORY.md.
Phase: implement
Scope: broad — Batch 1 (security boundary: S1, S2, S3, S4, S9, X2)
Test Command: manual
Estimates: Batch 1: M (~11.5 h) — S1 M 3h · S2 M 4h · S3 S 1.5h · S4 S 0.5h · S9 S 1h · X2 S 1.5h
Subsystem cycles since last Seams audit: 1 — reset to 0 by the 2026-09-18 audit
(batch S), +1 for the 21post reflection. The cadence is every 4.
Updated: 2026-09-23

## In progress (facts to carry forward — NOT judgments)
- Nothing is in flight. T1–T10 are all MERGED. T1–T9 are DEPLOYED
  (2026-09-22/23). **T10 (`Hawaii only`, `MDX Hawaii`) is merged but NOT
  deployed.**

## Completed this cycle
- (No cycle is open. 21post's record is in HISTORY.md, the ten
  `.cycle/blocks/21post-*-broad-implement.md` blocks and `21post-a-reflect.md`.)

## Pending / not yet done
- **Deploy T10** — `cd web-app && clasp push -f`, then New version.
- **The walk — NOTHING in T1–T10 has been walked**; its whole regression
  record is the harnesses. S64 (six T3 + four T4 + six T7 + two T7b + one T8 +
  one T9 step, and the T10-updated no-definition step), S18's denied-clipboard
  step, S112, S73.
- **Operator sheet check:** the `OopPricing` rows rewritten to `Local` on
  2026-09-22 should be back to `100 miles of Dallas warehouse, 100 miles of San
  Antonio warehouse` (the technician-built items). Manage → Admin → System →
  "Reference lookups" lists any `Local` still present under "Cannot read".
  Optional: rename `LocationAcceptance` col `Rule` → `Accepts` so the per-city
  item list is read.
- **Still owed from cycle 19's post-deploy walk:** step 8 — `INSTANCE_IS_PROD=true`
  plus standing up the DEV instance. Named the weakest axis (Operator-Only State
  Gaps) by cycle 21's reflection AND 21post's: without it the integration tier
  runs against PROD and writes TEST_ rows into live payroll and PHI stores.
  Steps 2, 5 and 6 of that walk are also unconfirmed.
- **The cycle-20 post-deploy walk items**, none blocking: S111 step 5 and
  S110 step 5, S7's two new Day Edit steps, S113, and the sheet doctor run.
- **DEFERRED, still an operator decision:** F-09's holiday FALLBACK — keep
  g123's federal fail-open, or match the Department Dashboard's no-fallback.

## Open follow-on items
- **Invariant numbers — do not reuse any:** INV-225..227 RESERVED (cycle 20);
  INV-229..232 + an INV-213 amendment PROPOSED (cycle 21); INV-240..242
  PROPOSED (21post: fixtures the server can still produce · tone/explanation
  agree both ways · doc UI paths resolve against `TOOLS` labels). None is in
  the library yet. **Next free is INV-243.**
- **An intermittent DOM pin**: `the resume request states the unpaid gap
  before it is filed` (runDom.js) failed once during T7 and has passed every
  run since. Flagged, not dismissed — a flake is not a root cause.
- **T4's document-level keydown handler** is scoped to the lookup inputs but
  was never verified against the Call Notes `.ce` fields (g111's trigger).
- `checkOopEligibility` ships a `rule` field no client reads (now with `cities`
  and `any` kinds in it).
- The four T6-grandfathered classes marked "intent unverified" (`dr-mgr`,
  `ny-card`, `coach-drawer`, `kb-gloss-search`); and an EMPTY CSS rule still
  satisfies the T6 ratchet (INV-235's stated limit).
- `intakeCopyImage_` opens a tab on failure without checking the return (g135).
- `Accepts` on a city row is DISPLAY-ONLY; which items a city rule covers is
  decided by which items carry `listed cities` in col I.

## Decisions made (so the next session doesn't re-litigate)
- Price and area eligibility are ONE panel; the address UPGRADES the answer
  rather than gating it.
- The lookup band lives in the LANDING HOST, never the shared section renderer,
  which is what lets one section serve the ~340px drawer.
- A net that enumerates what it guards is paired with a DERIVED check running
  the other way; the guarded set itself is never derived from the code it
  guards (that derivation is self-defeating).
- No backfill of `Verify:` clauses below the ratchet floor.
- **Area Eligibility rules DELEGATE their parameter to `LocationAcceptance`**
  (`listed cities`, `any warehouse`): the column states the rule, the registry
  supplies it. Rules combine with `or` under a FAIL-CLOSED fold. A city limit
  does not lift out of pocket (INV-236/237/239; the ELIG decision's amendment).
- **The code shorthand is read ONLY in the operator-confirmed shape**; any
  wider reading needs the operator's word (INV-233, amended).
- **Bare `OON`/`OUT-OF-NETWORK` is the red refusal; the qualified values are
  amber** with their own explanations (operator, 2026-09-22).

## Where I left off
Cycle 21 and its 21post follow-on are closed and archived; nothing is in
flight. The operator's next steps are the T10 deploy and the S64 walk. The next
session's is either a fresh `/broad-scan` (opens cycle 22) or the DEV instance
— the one debt both recent reflections named as the weakest axis.
