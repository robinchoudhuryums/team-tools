---CYCLE SUMMARY BLOCK---
Scope: broad | Cycle: 17 / 2026-08-05
Production fixes: 15 — severity: 8 Medium, 7 Low
New capabilities/features: 3
Defensive/structural: 28
New failure modes: 3 — severity: 3 Low (all fail-safe or deliberate-visibility)
Net score: 15 − 3 = 12
Invariant candidates: INV-189 (hoisted reads in locked batch writers), INV-190 (unrecognized row ≠ state), INV-191 (bite-check reversal by inverse edit, never checkout)
Most structurally significant change: INV-187 closed as a class — no best-effort read anywhere still renders its failure as a confident answer
Should-have-been-deferred: C17-13's negation vocabulary — a clinical-input heuristic shipped while the named raw-DR.STATUS family stayed open a third cycle
---END CYCLE SUMMARY BLOCK---

## Correction to the implementation self-reports (applied here)

The five batch blocks' nets sum to **36 − 3 = 33**. They counted
"production-class" (a real, reachable defect — not dead code) while EACH block
separately marked most of its own items "fired-this-month: NO". The template's
tally is three-way and strict: production fixes = Q1 YES only. Re-derived per
item against the cycle-16 precedents (F9's operator-maintained-sheet YES vs
F8's app-written-store NO; unreadable-Sheet triggers scored per surface
frequency) and with R18's interface rule applied CONSISTENTLY — which cuts both
ways: it demotes ~21 edge/attacker/hand-edit-gated fixes to defensive AND
promotes three interface fixes the ③+④ block's own fired-YES list under-counted
(.tr-section-h unstyled headings, the keyboard-dead PDF⇄Fillable switch, the
CN disclosures' aria-expanded). Result: **15 − 3 = 12**, with 28 defensive/
structural and 3 harness capabilities. The claimed net shrank by nearly
two-thirds; no new failure modes were found beyond the three the blocks
declared (batches ⑥/⑦ re-scrutinized item by item — the full-matrix re-shoot
and behavioral pins verified unchanged-path byte-equivalence).

## The 15 Q1-YES fixes and their triggers

C17-5 (CN loader wipe→empty-day; any transient error, highest-traffic surface),
C17-7 (manager lazy cards blank on failure; the adjust queue misread is
operational), C17-1-interface (.actions/.field-row live at ≤540px NOW),
C17-4 (ATT zero dragged the anonymized team line; monthly), C17-15 (extras SWR
partial-fresh), side-rail silent failure, C17-8 (tour ~1.4:1 dark), C17-10
(My Training clipped at 390px), review-due row overlap, .tr-section-h
(unstyled headings on two manager surfaces), the PDF⇄Fillable switch
(keyboard-dead, NO alternative path), CN disclosures aria-expanded, the intake
Sent silent cap, the PPD image cache-buster (fires on the documented realistic
col-F Drive-thumbnail URLs), C17-9 (each multi-day Day Edit held the ONE
project lock through ~124 full-sheet reads + ~124 openById calls).

## Notes for the next Verification Pass

- The error-state harness (batch ⑦) surfaced a live Low on its FIRST run — the
  Reference LANDING pane hangs on a loSweep loader when getReferenceTree fails
  (photographed: reference-error-light-mobile.png). Same pattern as cycle-16's
  overflowPx: measurement infrastructure repaying itself immediately.
- Process failure, twice this cycle: `git checkout -- <file>` as a bite-check
  reversal wiped ALL uncommitted work in the file (batches ③/④ and ⑥). Hence
  INV-191. Mitigation adopted mid-cycle: python inverse-edits only + commit
  each batch before the next starts.
- ESTIMATES RECOVERED THIS TIME (the cycle-13/16 loss did not repeat): the
  per-batch estimates survived in the transcript and are in estimates.csv.
  Calibration: batch estimates ran ~2–3× HIGH — day-scale estimates completed
  in single 3–4h sessions.
- Still open after seven batches: the drStatus_ predicate (INV-183's three raw
  readers), acknowledgeDoc data:image validation, form_public accordion aria,
  the Reference-landing loader fix, full fixture-skeleton derivation.
- Cycle 17 merged to main as PR #154 (13eeed2, CI green) INSIDE the cycle —
  second cycle running to reach main; deploy remains the one operator action.
