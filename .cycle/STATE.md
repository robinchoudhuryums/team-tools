# Cycle State

## Current
Cycle: 14
Phase: reflect (complete — cycle 14 is closed)
Scope: CDR sub-queue feature (operator-requested; Phases 0, 1, 2, 4 done)
Test Command: manual
Subsystem cycles since last Seams audit: 4 (cycle 11 was the seams audit;
  /reflect increments — cadence is every 4, so **a Seams & Invariants audit is
  now DUE**; running one resets this to 0)
Updated: 2026-07-31

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
- **Phase 4 (grouping) is IMPLEMENTED with OPERATOR-SUPPLIED groups** (2026-07-31):
  Sales / Customer Success / Field Operations / Power. Sub-queues confirmed
  DISJOINT from parents, so a group total is a plain SUM. Seeded in CONFIG,
  overridable via Script Property `CDR_QUEUE_GROUPS`.
- **Cycle 14 is CLOSED.** /reflect ran: net 0 − 0 = 0 (4 capabilities, 0 fixes,
  0 new failure modes); block at `.cycle/blocks/14-a-reflect.md`; metrics +
  estimates appended; seam counter 3 → 4, so **a Seams audit is now DUE**.
- Next concrete step: a **Seams & Invariants audit** (the cadence is due), or
  the operator's next request.

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
- Re-run `runAllTests()` — the two new integration tests
  (`metrics_getTeamMetrics_queueBreakdown`, `_queueGrouping`) execute ONLY in
  the editor. Expect 286 total, 0 failed.
- /sync-docs HAS run for Phases 2 + 4 (commit eb6b7b9). No doc work outstanding.

## Open follow-on items
- Queue GROUPING was deliberately deferred out of Phase 1 and then built in
  Phase 4 from OPERATOR-SUPPLIED groups — never inferred. That sequencing was
  the right call: the names I would have guessed (Manual_Mobility, Billing,
  Denials) are not the operator's actual queues.
- **No Admin editor for `CDR_QUEUE_GROUPS`.** Changing the mapping means editing
  the Script Property by hand or the CONFIG seed. The established pattern for
  this family (DEPARTMENT_EMAILS, DR_SLA_TARGETS) does have editors, so this is
  the natural next increment if the operator wants to self-serve.
- `Backup CSR` is grouped under Customer Success as the operator listed it, but
  it is a DQE agent-row SENTINEL and it was never confirmed to exist as a
  Transfer H:R column. If it does not, it simply never appears — harmless, but
  that is why, and it is not a bug to chase.
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
- INV-177/178/179 (cycle 13) and INV-180 (cycle 14 Phase 1) are all IN the
  library.

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
**Cycle 14 is CLOSED.** Phases 0, 1, 2 and 4 shipped, tested (391 pure + 69 DOM
+ 22 visual), documented and reflected. Blocks: `.cycle/blocks/14-phase0-`,
`14-phase1-transfer-only-`, `14-phase2-`, `14-a-reflect.md`.

Metrics → Team Metrics has Combined / By department / By queue. The operator's
ask is met for transfers.

**Do not re-open the gate.** DQE is one row per (agent, date); answered/missed/
talk-time can never be split by queue, and `CDR.QUEUE_EXT` is a membership list.

**A Seams & Invariants audit is now DUE** (counter 4 of 4). That is the natural
next cycle unless the operator has a request.

Two process rules this cycle earned, both in the reflect block:
- **Before concluding work is lost, check the REMOTE.** The local checkout
  rewound twice this cycle; both times `git reset --hard origin/<branch>`
  restored everything. Re-implementing from memory creates duplicate commits on
  stale bases (that happened once).
- **Read the guard before diagnosing which call it rejected.** A wrong
  assumption about `hasActiveTimeOffOnDate_` cost a full round-trip with the
  operator.

Outstanding, unchanged: re-run `runAllTests` (expect 286 — two new integration
tests), and on the DEV project only, `INSTANCE_IS_PROD=false`.
