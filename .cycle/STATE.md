# Cycle State

## Current
Cycle: 14
Phase: implement
Scope: CDR sub-queue feature (operator-requested; Phases 0, 1 and 2 done)
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
- Phase 0 IMPLEMENTED, DEPLOYED, and its GATE HAS REPORTED. Verdict: **DQE
  carries ONE row per (agent, date)** — so answered/missed/%answered/talk-time
  can NEVER be split by queue. Col 4 turned out to hold comma-separated
  MEMBERSHIP lists (`103,108`, and `108,103` — same set, different order), a
  dimension of the agent, not of the call.
- **But the Transfer tab CAN be split**: it is keyed by `CSR Rep Name` and its
  H:R block has 11 real queues (406–2886 populated rows each). The operator
  approved re-scoping to TRANSFER-ONLY, and **Phase 1 is now IMPLEMENTED** on
  that basis.
- **Phase 2 is IMPLEMENTED**: Team Metrics has a Combined / By-queue switcher,
  with a segmented contribution bar + expandable per-queue detail on the
  Transfers column. The operator's ask is met for transfers.
- Next concrete step: close cycle 14 with /reflect, or build the grouping
  ("By department") that is the last unbuilt piece — it needs the operator to
  name the groupings, which they can now do from the live queue rows.

## Completed this cycle
- Phase 0 | Code.js | NEW read-only `cdrQueueInventory_(from,to)` — distinct QUEUE_EXT values (col 4, declared since the CDR enum and read NOWHERE until now), the skipped A_Q_*/Backup CSR aggregates, which Transfer H:R columns carry data, and rows-per-(agent,date) — the gate question
- Phase 0 | Code.js | gating: `computeAutomationHealth_(opts)` defaults scanQueues OFF because the health BADGE polls it every 10 min per manager and the digest runs it daily; only `getAutomationHealth()` opts in, `getDeployReadiness` passes false
- Phase 0 | cn/script_callnotes.html | NEW self-contained `cnQueueInventoryHtml_` — verdict first in plain language, three distinct states (available / NOT in this data / cannot determine), every server string esc()'d
- Phase 0 | CLAUDE.md | Automation Health decision documents the inventory, why it is opt-in, and why it is not folded into the cached getCdrAgentMetrics_ meta
- Tests | test/client/run.js (+4 pins, 375→379, all four bite-checked)
- Phase 1 | Code.js | `getCsrTransferPerRepDaily_(…, {withQueues})` — per-rep per-queue transfer counts, columns discovered BY HEADER NAME, opt-in so the three caching callers stay byte-identical; queueTotal/queueUnattributed enforce component-not-partition (INV-180)
- Phase 1 | Code.js + cn/ | the admin queue inventory gained "Transfers by queue · in window", sourced THROUGH the new reader so it is exercised on live data
- Phase 1 | Tests.js | the CDR fixture's Transfer tab gained a 3-queue H:R block summing to LESS than the total, plus a zero and a blank cell
- Phase 2 | script_core.html | `mtRenderTable_` gained OPTIONAL detailRow/rowId — additive, the other two callers render identically
- Phase 2 | Code.js | `getTeamMetrics` returns per-rep queues + `queueRows` + `transferMeta`; the transfer read is best-effort (INV-67) so the team table survives a Transfer-tab outage
- Phase 2 | metrics/ | Combined / By-queue switcher; segmented contribution bar with the unattributed remainder drawn, expandable per-queue detail stating "N of M attributed"
- Phase 2 | test/visual/ | Team Metrics added to the matrix (20 → 22) with a contract-accurate fixture — it had never been visually covered
- Tests | pure 379→387, DOM 66→68; all 8 new pins bite-checked; the Phase-1 opt-in pin updated to NAME its callers rather than count them

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
- Phase 3 was DROPPED with the manager-only scope decision.
- Phase 4 (queue GROUPING / "By department") is the one unbuilt piece. It needs
  the OPERATOR to name the groupings — inferring them from queue names is a
  guess about their business. They can now do that from the live queue rows.
- Re-run `runAllTests()` — `metrics_getTeamMetrics_queueBreakdown` executes
  ONLY in the editor. Expect 285 total, 0 failed.
- /sync-docs has NOT run for Phase 2: CLAUDE.md needs the two modes, the UI
  transparency contract, mtRenderTable_'s new optional detail-row capability,
  and the visual matrix 20 → 22.

## Open follow-on items
- **Queue GROUPING was deliberately NOT built in Phase 1.** Plausible groupings
  are inferable from the names (FieldOps + FieldOps_Power, PowerChairs +
  Manual_Mobility) but that is a GUESS about the operator's business, and an
  empty-by-default Script Property plus an Admin editor with no consumer would
  be dead code twice over. It belongs in Phase 2, where the "By department"
  switcher makes it load-bearing and the operator can confirm the groupings.
- The DQE `A_Q_*` sentinel rows remain unused — 8 queues / 12 rows in a week is
  too sparse to build a series on.
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
Phases 0, 1 and 2 are implemented and tested (387 pure + 68 DOM + 22 visual
scenarios, all eight Phase-2 pins bite-checked). Blocks:
`.cycle/blocks/14-phase0-`, `14-phase1-transfer-only-`,
`14-phase2-broad-implement.md`.

**The operator's ask is MET for transfers.** Metrics → Team Metrics now has a
Combined / By-queue switcher; the combined view shows each rep's transfer total
with a segmented contribution bar and an expandable per-queue breakdown that
states "N of M attributed" — the transparency half of the request.

**The gate has already reported — do not re-open it.** DQE is one row per
(agent, date); answered/missed/talk-time can never be split by queue, and
`CDR.QUEUE_EXT` is a membership list, not a queue key.

Next, either:
- **/reflect** to close cycle 14 (three phases, net 0 by design — a diagnostic
  plus two capabilities, no defects fixed), or
- **Phase 4, queue GROUPING ("By department")** — the last unbuilt piece. It
  needs the OPERATOR to name the groupings; inferring them from queue names
  (FieldOps + FieldOps_Power?) is a guess about their business. They can now
  read the real queue rows in Team Metrics and tell us.

Also outstanding: /sync-docs has not run for Phase 2 (CLAUDE.md needs the two
modes, the UI transparency contract, `mtRenderTable_`'s new optional detail-row
capability, and the visual matrix 20 → 22); `runAllTests` should be re-run
(expect 285); and on the DEV project only, `INSTANCE_IS_PROD=false` is unset.
