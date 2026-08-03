---CYCLE SUMMARY BLOCK---
Scope: broad | Cycle: 16 / 2026-08-03
Production fixes: 8 — severity: 6 Medium, 2 Low
New capabilities/features: 1
Defensive/structural: 5
New failure modes: 1 — severity: 1 Low (fail-safe)
Net score: 8 − 1 = 7
Invariant candidates: INV-187 (best-effort read must carry its outcome; derived
judgements suppressed when degraded), INV-188 (a source-scanning tripwire must
strip comments before matching); plus an amendment to INV-179 — a derived scan
is only as wide as what it derives from
Most structurally significant change: A12 generalized from three named files to
a derived rule — 3 partials became 9 and 28 live defects surfaced from behind a
green CI
Should-have-been-deferred: F7 — a drift guard against a rename nobody proposed,
while three real raw DR.STATUS reads in the same module went untouched
---END CYCLE SUMMARY BLOCK---

## Corrections to the implementation self-reports (applied here)

ONE correction, and it LOWERS the cycle's net rather than raising it. The
Batch 4 + F9 block reported **0 new failure modes**, arguing the fail-closed
weight filter "is not counted as a new failure mode because it ships with its
own detector". Counted as **1 Low, fail-safe** instead: a malformed capacity
cell now makes a chair silently vanish from PPD recommendations — behaviour
that did not exist before — and the detector is PULL-based, requiring a manager
to open Admin → Automation Health. That block's own REGRESSION RISKS section
conceded the mitigation is "weaker than automatic". Cycle 12 counted the
structurally identical trade (the export refusing rather than emitting a partial
payroll .xlsx) as a Low fail-safe.

Session net scores as reported: 5 (F1–F5) + 1 (Batch 4 + F9) + 2 (Batch 2 + 3)
= 8. After the correction: **7**.

## Q1 asymmetry worth preserving: F9 counted YES, F8 counted NO

Both fixes need a malformed row that I cannot see from the container, so the
distinction had to be principled rather than convenient:

- **F9's** malformed cell lives in the **operator-maintained** Offerings sheet,
  hand-edited by the operator. A blank or `'n/a'` capacity is plausible, not
  hypothetical. Counted YES on the cycle-15 F3 precedent (live, reachable path;
  triggering row unverifiable from here).
- **F8's** malformed cell lives in a **code-written** column:
  `markDeptRequestResolved_` writes exactly `'resolved'` via `setValue`, so a
  padded status or blank `ResolvedAt` requires a manual edit of a tracking sheet
  nobody is asked to touch, or a failure between two `setValue` calls. Real
  correctness fix with a compounding blast radius; not a this-month event.

**The F9 operator check has NOT come back.** Opening the Offerings sheet and
reading column C is still what converts that YES from conditional to confirmed.

## What this cycle actually was

Three implementation sessions covering every one of the 11 scan findings
(0 Critical / 0 High / 6 Medium / 5 Low), each followed by /sync-docs, merged as
PR #152 (squash `17c8d6e`) after CI green — the first cycle since 10 to reach
main rather than sitting on a branch.

**The theme, and it is the cycle's finding:** three separate tripwires each
named the right rule and then scanned a FIXED LIST of past fixes.

- **A2** (compact grid overrides need viewport breakpoints) — derived, it
  surfaced a fifth candidate, verified NOT a defect and resolved as a rule
  refinement (`A2_INTRINSIC`) rather than an allowlist entry, because it is a
  property of the rule.
- **A12** (a load failure must not render into an empty-state container) —
  derived, it surfaced **28 violations across six partials** behind a green CI.
  `train/script_coaching.html` is the proof: it renders into `.tr-empty`, a
  class the tripwire ALREADY KNEW, in a file it did not scan.
- **The cycle-15 fixture mirror pin** — named one function by hand; derived from
  the DO-NOT-EDIT region, it now covers whatever lands there next. Its first
  catch was `cnNoteCoverage_`, three tokens of paraphrase that had already
  diverged where it matters (a number for `answered === 0` where the server
  returns `null` — the INV-129 contract F5 had just hardened).

That is INV-179 three times in one cycle, which argues for applying the rule
PROACTIVELY to the remaining hand-listed scans rather than one per audit.

**A limit of that rule, stated before the next generalization:** the clipped
Training heading Batch 4 found is A2-FAMILY, but no derivation from
`:root[data-compact]` will ever reach it — that file has no compact override to
derive from. A derived scan is only as wide as the thing it derives from.

## Honest impact

**User, right now:** a manager stops reading fabricated zeros as a rep's shift
performance; the coverage planner can no longer issue a false all-clear on an
understaffed day; Reference is usable on a phone (its reader measured 70px); a
chair that cannot carry the patient is no longer recommended; and across nine
partials a failed load says so instead of looking like an empty tool.

**Next developer:** three scans derive their file sets instead of naming files,
and the empty-vs-error rule is enforced by NAMING CONVENTION, so a tool shipped
next month is covered on arrival rather than three cycles later. Equally
valuable: INV-183 now states out loud that `DR.STATUS` is only PARTIALLY closed
instead of reading like a solved problem.

**Safer under scale / concurrent load: NOTHING.** This cycle touched no locks,
no caches, no bounded reads, no trigger scheduling. Claiming otherwise would be
padding.

**Effort on dead code / future-proofing:** F7 only. F8's halves are latent but
the corruption they prevent is real and compounding. Batch 4 repaid itself on
its first run.

## Process notes

- **Four pins failed their first write across the cycle, and in every case the
  PIN was wrong about the code, not the reverse.** Two tripped on the code's own
  explanatory comments (which quote the raw reads they removed) — the trap the
  CDR name-match pin already documented, re-learned. Hence INV-188.
- **Estimates are LOST again.** Effort estimates were given in chat when the
  remaining findings were grouped into batches, and never written to
  estimates.csv at the time; the session was compacted before this reflection,
  so reconstructing the hours would be inventing data. This is the identical
  process failure cycle 13 recorded. The fix is to append the row when the
  estimate is GIVEN, not at reflect time.
- Measurement over reasoning held up again: F2/F3 were verified in headless
  Chromium at 390px, and the `.intk-row` stacking exposed a latent tooltip
  overflow (document scrollWidth 468 vs a 390 viewport) that a screenshot alone
  would not have distinguished from a merely squeezed layout.
- Tests: pure **391 → 407**, DOM 69, visual matrix **22 → 29** scenarios with 0
  missing fixtures and 0 horizontal overflow, `node --check` clean. Every fix
  pin bite-checked individually.

## Carried forward

- **DEPLOY is still pending** and now carries cycles 11–16: `clasp push -f` +
  New version, then `runAllTests()` from the editor. S1/S2 and F11's corrected
  queue-grouping assertion have never actually executed.
- **Operator: read Offerings column C** — converts F9's conditional YES.
- Three raw `DR.STATUS` reads remain (`drFindOpenRequest_`,
  `markDeptRequestResolved_`, `deptRequestsOverdueOpen_`). A padded cell there
  means a duplicate request (INV-131) and a permanently nagging SLA digest.
- Error states are unshot by the visual harness — every scenario fixtures the
  success path, so the 28 newly-converted surfaces have no screenshot.
- INV-187/188 proposed. INV-163/164 remain vacant by the established precedent.
