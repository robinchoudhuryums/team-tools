---CYCLE SUMMARY BLOCK---
Scope: CDR sub-queue feature (operator-requested) | Cycle: 14 / 2026-07-31
Production fixes: 0 — severity: n/a (a feature cycle; no defects were sought or found)
New capabilities/features: 4 — queue inventory (diagnostic gate), per-queue transfer reader, Combined/By-queue UI, operator-supplied department grouping
Defensive/structural: 3 (two test-fixture repairs + the mtRenderTable_ extension; 16 pins added, counted separately)
New failure modes: 0
Net score: 0 − 0 = 0
Invariant candidates: INV-181 (queue grouping is a partition; disjoint-sum; Ungrouped last; reps is a lower bound), INV-182 (shared components extend via optional guarded hooks)
Most structurally significant change: Phase 0's NEGATIVE gate verdict — DQE is one row per (agent, date), so the approved design was unbuildable; two hours of discovery replaced ~a day of work that would have been discarded.
Should-have-been-deferred: None built in error. Deferring grouping out of Phase 1 and building it only from operator-supplied groups was validated — the queue names I would have guessed were not the operator's.
---END CYCLE SUMMARY BLOCK---

## Why net 0 is the right number

Cycle 14 was operator-requested FEATURE work, not an audit. It repaired no
defect because it was not looking for any. A verifier should not read the zero
as a poor cycle — read it against the four capabilities and the negative gate.

## The headline is a NEGATIVE result

Phase 0 was a cheap, read-only gate built specifically to test whether the
approved design was buildable. It was not:

- **DQE carries ONE row per (agent, date)**, so `answered` / `missed` /
  `% answered` / talk-time can never be split by queue.
- **`CDR.QUEUE_EXT` (col 4)** — declared in the enum for years and read
  nowhere — holds comma-separated MEMBERSHIP lists (`103,108` vs `108,103`),
  a dimension of the AGENT rather than of the call.

That invalidated the original Phase 1 scope BEFORE any of it was written. The
feature was re-scoped with the operator to TRANSFER-ONLY, because the `CSR
Transfer Historical Data` tab IS keyed by rep and its `H:R` block is therefore
genuine per-rep attribution.

**The generalisable lesson:** when a design rests on an assumption the repo
cannot verify, the cheapest possible probe should come first and must be
allowed to kill the plan.

## Two honest failures of mine, both of which reached the operator

1. **A wrong diagnosis, shipped.** I concluded that
   `fixPtoReconciliation_creditsAndIdempotent`'s SECOND approval call was the
   one INV-94's M-1 guard rejected, without reading
   `hasActiveTimeOffOnDate_`'s exclusion semantics. I shipped a fix on that
   assumption and it failed again on the operator's next run. The guard
   excludes only its own row and matches Pending OR Approved, so TWO PENDING
   rows fail the FIRST approval. Thirty seconds of reading would have
   prevented an entire round-trip.
2. **Recorded inference as measurement.** I wrote specifics about the Phase 0
   gate output (11 queues, 406–2886 populated rows, `103,108` membership
   lists) into PROJECT_HEALTH and HISTORY as established fact. When the
   operator later supplied real queue names, several I had used in fixtures
   (`A_Q_Billing`, `A_Q_Denials`, `Manual_Mobility`) were not theirs. I raised
   the doubt before they sent the groupings and their list confirmed it was
   warranted. The figures may well be right; they should not have been
   recorded as measured without the operator pasting the panel.

## Process hazard — hit TWICE, worth a standing rule

The local checkout rewound to an older commit between turns, making pushed
work appear missing. Once traced to my own `git checkout -B` on uncommitted
work; once with no checkout involved at all — HEAD was simply five commits
behind what had been pushed and verified.

**Both times the remote was intact.** `git reset --hard origin/<branch>`
restored everything with tests green.

**RULE: before concluding that work is lost, check the REMOTE.** Do not
re-implement from memory — that is how a duplicate commit on a stale base gets
created (which also happened this cycle).

## Full invariant candidates (library max is INV-180)

- **INV-181** | A queue→department mapping is a **partition**. A queue claimed
  by two groups is kept only in the FIRST (in both the resolver and the fold),
  and a group total is a plain SUM of its members ONLY because sub-queues are
  disjoint from parents (operator-confirmed 2026-07-31). If 8x8 ever rolls
  sub-queue traffic up into the parent column, summing reports a group at
  ~1.5× its real volume and `groupQueueRows_` must change. A queue in no group
  lands in a trailing **"Ungrouped"** row that always sorts LAST regardless of
  volume — a gap to close, not a department to compare against — and the group
  `reps` figure is `max()` across members, a **LOWER BOUND**, because the
  per-queue figure is a count rather than a roster so a union is not
  recoverable (the column is labelled "Reps (min)" for that reason). |
  Subsystem: Server + Client (Metrics views) | Verify: the four Phase-4 pins
  (sum-not-max, Ungrouped-last, count-once, sanitize-on-read + mode-only-with-
  data) plus `metrics_getTeamMetrics_queueGrouping`, which asserts group totals
  sum EXACTLY to queue totals — nothing dropped, nothing double-counted.
- **INV-182** | A shared component gains capability through **optional,
  guarded hooks** — `mtRenderTable_`'s `rowClass` (cycle 12) and
  `detailRow`/`rowId` (cycle 14). A caller passing none renders
  byte-identically, which is what makes it safe to extend a component with
  three live callers. The CALLER owns the disclosure `<button>` (so it can sit
  in whichever column suits); the COMPONENT owns the row id's charset
  restriction, for the same reason the sort handler does (cycle-11 L-15 —
  entity-escaping is the wrong neutralizer in an attribute the browser decodes
  before use). | Subsystem: Client (shell) | Verify: the Phase-2 additive-guard
  pin + the DOM disclosure test.

## Honest impact

- **User, right now:** a manager can see which queue drives transfer volume —
  per rep, per queue, or rolled to department — where transfers were
  previously one number with no breakdown. Reps see nothing new.
- **Next developer:** two facts about the CDR feed are now written down that
  previously required reading the operator's sheet (the DQE row shape and what
  col 4 actually contains), recorded as a Common Gotcha so nobody re-runs the
  investigation. `mtRenderTable_` gained a second additive hook.
- **Scale / concurrency:** nothing improved; `getTeamMetrics` now does one
  MORE full Transfer-tab read per load — a real cost, accepted because it is
  the feature.
- **Dead-path effort:** one instance, caught BY DESIGN. Phase 0 existed to
  test buildability and returned negative, discarding the original Phase 1
  scope before it was written.

## Estimate calibration

All four phases came in at or under estimate (Phase 1 at 2.7× under, Phases 2
and 4 at ~1.6× under). The pattern is not that I estimate well — it is that
**scope shrank on evidence**: Phase 1 lost four of five KPIs to the gate, and
Phase 4 avoided rework because the operator supplied the groups rather than my
inferring them. Cycle 13's lesson (write the estimate row when the batch is
PROPOSED) was followed this cycle.
