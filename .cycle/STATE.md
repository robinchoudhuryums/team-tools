# Cycle State

## Current
Cycle: 14
Phase: implement
Scope: CDR sub-queue feature (operator-requested; Phase 0 of 4)
Test Command: manual
Subsystem cycles since last Seams audit: 3 (cycle 11 was the seams audit;
  /reflect increments — cadence is every 4, so 1 more subsystem cycle before
  the next Seams & Invariants audit is due)
Updated: 2026-07-29

## In progress (facts to carry forward — NOT judgments)
- Cycle 13 is CLOSED; its whole block is in `.cycle/HISTORY.md`. Use the
  REFLECT block (`.cycle/blocks/13-a-reflect.md`) for its tally — it corrected
  the four implementation blocks in two directions (net 9 − 1 = 8, not the 8 − 0
  they reported between them).
- This cycle is NOT an audit cycle. It is operator-requested feature work:
  departments with sub-queues have no way to view sub-queue detail separately
  or with transparency in the combined view.
- **Approved design (operator answered 2026-07-29):** discovery FIRST;
  MANAGER SURFACES ONLY (which removes the INV-124 per-queue anonymization
  problem entirely); view shape = expandable per-queue rows PLUS segmented
  contribution bars.
- Phase 0 is IMPLEMENTED and pushed. Phases 1–4 are unstarted.
- Next concrete step: the operator deploys and reads the queue inventory in
  Manage → Admin → Automation Health. **That output gates Phase 1.**

## Completed this cycle
- Phase 0 | Code.js | NEW read-only `cdrQueueInventory_(from,to)` — distinct QUEUE_EXT values (col 4, declared since the CDR enum and read NOWHERE until now), the skipped A_Q_*/Backup CSR aggregates, which Transfer H:R columns carry data, and rows-per-(agent,date) — the gate question
- Phase 0 | Code.js | gating: `computeAutomationHealth_(opts)` defaults scanQueues OFF because the health BADGE polls it every 10 min per manager and the digest runs it daily; only `getAutomationHealth()` opts in, `getDeployReadiness` passes false
- Phase 0 | cn/script_callnotes.html | NEW self-contained `cnQueueInventoryHtml_` — verdict first in plain language, three distinct states (available / NOT in this data / cannot determine), every server string esc()'d
- Phase 0 | CLAUDE.md | Automation Health decision documents the inventory, why it is opt-in, and why it is not folded into the cached getCdrAgentMetrics_ meta
- Tests | test/client/run.js (+4 pins, 375→379, all four bite-checked)

## Pending / not yet done
- **THE DEPLOY IS NOW BLOCKING — it is how Phase 0 delivers its answer**, and it
  still carries cycle 11's visual batch plus all of cycles 12–13:
  1. `cd web-app && clasp push -f`
  2. Apps Script editor → Deploy → Manage deployments → Edit → Version:
     **New version** → Deploy
  3. Open Manage → Admin → Automation Health, read "Queue inventory · discovery"
  4. Run `runAllTests()` in the editor — these execute ONLY there: cycle 13's
     `timeToMins_nullOnUnparseable`, the two renamed `metrics_cnCountNotesResult_*`,
     plus cycle 12's still-unrun `cn_enrolledSheetId_trimsAndNullGuards` and
     `cn_appendBounded_capsAndRollsBack`.
- **CARRIED (cycle 13 A5), DEV PROJECT ONLY: add Script Property
  `INSTANCE_IS_PROD=false`.** An unset value now reads as production, so without
  it devScrubRoster_/devShowConfig_ refuse and the nightly self-test drops to
  smoke (visibly). PROD is unaffected.
- Phase 1 (~1 day) — queue-aware readers behind an opt-in argument (existing
  callers byte-identical); `CDR_QUEUE_GROUPS` Script Property for the
  queue→department mapping (sanitize-on-read, the DR_SLA_TARGETS pattern, so
  `call-data-reporting` needs no change); add col 4 + H:R to the header
  validators; bump `CDR_CACHE_KEY` (INV-85); multi-queue rows in the CDR fixture.
- Phase 2 (~1 day) — Team Metrics scope switcher (Combined / By department /
  By queue) with expandable per-queue rows + segmented contribution bars,
  reusing `mtRenderTable_` and its `rowClass` hook.
- Phase 4 (~½ day, deferrable) — Admin editor for the mapping.
- Phase 3 was DROPPED with the manager-only scope decision.

## Open follow-on items
- The CDR fixture writes one row per agent with NO queue, so no test exercises
  the multi-queue path. Extend it in Phase 1, where there is aggregation logic
  worth protecting.
- FO-6 (the remaining TimesheetArchive readers) — carried from cycle 13,
  ANALYSED and DEFERRED, and the analysis is the point:
    • `buildTimesheetForEmployee_` and `getPunctualityReport` SHOULD read through
      behind the export's "window predates the live floor" gate (~½ day).
    • `tsDoctorScan_` must NOT — `fixTimesheetDuplicates` deletes by LIVE-tab
      index, so surfacing archived duplicates would report findings the fix
      cannot act on. That is an operator design decision.
  Nothing is broken: archival is OFF by default and the ≥120-day floor keeps
  recent data live.
- INV-177/178/179 were proposed by cycle 13's /reflect but are NOT yet written
  to the library — that is /sync-docs' job.

## Decisions made (so the next session doesn't re-litigate)
- Phase 0 exists because the design rests on ONE assumption this repo cannot
  verify: that DQE carries a row per (agent, queue, date). The fixture writes
  one row per agent, so nothing here could confirm it.
- The queue scan is OPT-IN and that gate is load-bearing, not tidiness:
  `getAutomationHealthBadge` polls `computeAutomationHealth_` every 10 minutes
  per manager. A full-sheet read there is a recurring cost regression.
- The inventory is NOT folded into `getCdrAgentMetrics_`'s meta even though the
  rows are already in memory there — that result is cached and consumed by every
  Metrics call, so widening it would tax the hot path and force an INV-85 cache
  bump for a diagnostic.
- The render keeps "cannot be determined" (empty window) DISTINCT from the
  negative verdict. An undetermined scan reading as a negative answer would kill
  the feature on no evidence.
- Manager-only scope was chosen deliberately: it drops Phase 3 and with it the
  only part of the feature that could create a privacy regression (a per-queue
  split defeating INV-124's N=3 anonymization on a thinly-staffed queue).
- Queue→department mapping goes in a Script Property, not a CDR sheet tab —
  the sheet is owned by `call-data-reporting`, and a property needs no
  cross-repo change.

## Where I left off
Phase 0 is implemented, tested (379 pure + 66 DOM, all four new pins
bite-checked), documented and pushed to `claude/broad-scan-yhkbe2`. Block:
`.cycle/blocks/14-phase0-broad-implement.md`. Nothing else in the feature is
started.

**Phase 0 is a GATE, and the deploy is how it reports.** After deploying, read
Manage → Admin → Automation Health → "Queue inventory · discovery":
- If it says **per-queue rep attribution IS available**, proceed to Phase 1 as
  planned.
- If it says **NOT in this data**, the approved design (per-queue splits of REP
  numbers) cannot be built as specified and the feature becomes queue-health
  from the `A_Q_*` aggregates — closer to the dedicated-Queues-tab option the
  operator did not pick. **Take that back to the operator; do not silently
  redesign.**
- If it says **cannot be determined**, the 7-day window had no rows — check the
  feed before concluding anything.
