---CYCLE SUMMARY BLOCK---
Scope: broad (all subsystems) | Cycle: 13 / 2026-07-29
Production fixes: 9 — severity: 4 Medium (A1 unreachable clinical control, A2 rep-facing Metrics with zero media queries, A12 failures rendering as "no data", A13 no heading outline on ~30 views), 5 Low (A11, A6, FO-2, FO-3, B5-1)
New capabilities/features: 0
Defensive/structural: 12 (plus 19 new bite-checked tripwires, counted separately)
New failure modes: 1 — severity: 1 Low (A5: an existing dev project drops to smoke tests until `INSTANCE_IS_PROD=false` is added; fail-safe, loudly surfaced)
Net score: 9 − 1 = 8
Invariant candidates: INV-177 (dev-ness requires both markers), INV-178 (a section heading is an h2), INV-179 (tripwires scan a derived file list)
Most structurally significant change: B5-1 — deriving the a11y scan list from PARSE_GUARD_PARTIALS turned a six-item hand list into a rule and immediately found eight live defects the audit had missed.
Should-have-been-deferred: A8 — hardened a helper the scan wrongly called user-visible, which FO-5 deleted entirely one batch later.
---END CYCLE SUMMARY BLOCK---

## Corrections applied to the batch self-reports

The four implementation blocks reported 4 + 1 + 2 + 1 = 8 production fixes and 0
new failure modes. This reflection derives 9 and 1 — the same net, different
composition. A verifier should treat the batch blocks' tallies as superseded by
this one.

1. **Batch 5 under-counted.** It scored its eight newly-found ARIA-state
   instances as DEFENSIVE, reasoning they were "found by this batch's own
   tripwire rather than by the scan." That is a provenance argument; Q1 asks
   only whether the bug would have fired, and R18 is explicit that a
   user-visible interface defect counts YES and must not be demoted. Promoted
   to ONE production fix — bundled, matching how A11's six surfaces were
   counted as one.
2. **Batch 3 under-counted.** It reported 0 new failure modes. A5 requires an
   existing dev project to add `INSTANCE_IS_PROD=false` or it loses its nightly
   full-suite run and its dev tooling refuses. Cycles 9, 10 and 12 all counted
   this exact shape (a fail-safe direction change with a narrow worse case), so
   burying it as a tradeoff would be inconsistent as well as dishonest.

## Full invariant candidates (library max was INV-176)

- **INV-177** | Dev-ness requires BOTH instance markers — `INSTANCE_LABEL` set
  AND `INSTANCE_IS_PROD` explicitly not `'true'`. An UNSET marker is
  production, because unset is production's default state; inferring dev from
  the mere presence of a banner label let a labelled prod run the destructive
  suite against live payroll and anonymize the live roster. | Server /
  operator-state seam | Verify: the A5 dev-detection pin, including its
  "a LABEL alone is NOT dev" case.
- **INV-178** | A section heading is an `<h2>`, not a styled `<div>`. Each
  heading class already carries its own typography, so the conversion is a
  UA-margin reset and nothing else; verify by MEASURING inside the REAL parent,
  since a flex parent blockifies any child and makes a bare `display` delta a
  fixture artifact. | Client (all view partials) | Verify: the A13 class-scan
  tripwire (scans by class, so a new card added as a div fails) +
  `test/visual/a13-measure.mjs`.
- **INV-179** | When a convention is worth a tripwire, scan a DERIVED file list
  (`PARSE_GUARD_PARTIALS`), never a hand-copied one. Hand-listed scan sets have
  now been found short three times — cycle-9 M-10, cycle-11 M-4, cycle-13 B5-1,
  the last of which surfaced eight live defects the moment the list was
  derived. | Test Suite | Verify: the `A11Y_SCAN_PARTIALS` derivation plus the
  existing `PARSE_GUARD_PARTIALS` ↔ `index.html` coupling check.

## Honest impact

- **User, right now:** a keyboard or screen-reader user gained reachable
  controls on 14 surfaces, announced state on both nav levels and every
  stateful toggle, and a heading outline on ~30 views that previously had
  exactly one heading. A rep can use the Metrics tab on a phone. Sixteen
  failure paths say "this failed" instead of "there's nothing here." For a
  sighted desktop user the cycle is nearly invisible — no workflow changed and
  no feature appeared.
- **Next developer:** five prose conventions became enforced tripwires; two
  hand-maintained counts became source-derived; 29 files of dead reference
  material left the tree; `timeToMins_` has a documented null contract that
  names its own trap (`x + null` coerces to `x`).
- **Scale / concurrency:** only A10 (quiz grading moved out of the global
  ScriptLock). This was not a concurrency cycle.
- **Dead-path effort:** A8 hardened a helper FO-5 deleted one batch later —
  one action of pure waste, caught only because batch 3 went looking. A4
  (zero-caller) and A7 (needs archival enabled) are defensible.

## Process notes for the next cycle

- Estimates for batches 1–3 were given in chat when the batches were proposed
  but never written to `estimates.csv` at the time, so their calibration data
  is unrecoverable. **Write the estimate row when a batch is PROPOSED**, not at
  reflect.
- A13's estimate ran 4x UNDER (6h → 1.5h): each heading class already fully
  specified its typography, so it was a tag swap plus a margin reset rather
  than a restyle.
- Three new pins did not bite on the first attempt and were tightened; four
  EXISTING pins broke and were updated as part of the fix rather than
  reactively. Both remain non-optional steps.
