---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- Phase 0 (CDR sub-queue work) | READ-ONLY queue inventory in Admin →
  Automation Health, so the sub-queue feature's load-bearing assumption is
  tested against the operator's real sheet before any UI is designed.

Files modified:
  web-app/Code.js, web-app/cn/script_callnotes.html, test/client/run.js,
  CLAUDE.md

CHANGES:

Phase 0 | Code.js | NEW `cdrQueueInventory_(from, to)` — read-only, tail-capped,
  PHI-free. Reports:
    • distinct `CDR.QUEUE_EXT` values (col 4 — declared since the CDR enum was
      written and read NOWHERE until now), with row + distinct-agent counts
    • the `A_Q_*` / `Backup CSR` queue-aggregate rows `isCdrQueueSentinel_`
      currently discards
    • which CSR Transfer `H:R` columns carry data, with their literal header
      text (that block is fetched into memory on every Transfer read and
      ignored — the comment in `CSRT` says so explicitly)
    • **rows per (agent, date)** — the gate. If DQE is one row per agent per
      day, per-queue REP attribution does not exist in the data and the feature
      has to change shape.
  Bounded by `CDR_QUEUE_SCAN_MAX` (4000, tail) and `CDR_QUEUE_LIST_CAP` (40),
  reporting `truncated` rather than silently describing part of the sheet
  (INV-169). Reads THREE columns (DATE/AGENT/QUEUE_EXT), not the sibling
  reader's 34.

Phase 0 | Code.js | Gating. `computeAutomationHealth_(opts)` gained
  `scanQueues`, **default OFF**, and this is the load-bearing part of the
  change: `getAutomationHealthBadge` polls that function **every 10 minutes per
  manager** and `sendAutomationHealthDigest` runs it daily, both calling it
  directly. A full-sheet read on either path would be a recurring cost
  regression, not a diagnostic. Only `getAutomationHealth()` opts in;
  `getDeployReadiness` passes `{scanQueues:false}` — the
  `getStorageHealth({scanEmbeds:false})` precedent. Deliberately NOT folded
  into `getCdrAgentMetrics_`'s meta: that result is cached and consumed by every
  Metrics call, so widening it would tax the hot path and force an INV-85 cache
  bump for a diagnostic.

Phase 0 | cn/script_callnotes.html | NEW `cnQueueInventoryHtml_(q)` — renders
  the verdict FIRST in plain language, then the three tables, then a scan
  footer. Self-contained (no panel closures) so it is Node-testable like the
  other pure render helpers. Three distinct verdict states, deliberately:
  available / NOT in this data / **cannot be determined** (empty window) — an
  undetermined scan must not read as a negative answer. Every server string is
  `esc()`'d; these cross a repo trust boundary (the CDR sheet is written by
  `call-data-reporting`), the same boundary the Metrics `esc()` gotcha names.

TEST RESULTS: PASSED.
  node --check × 1 (Code.js): OK
  Pure harness: 379 passed, 0 failed (375 → 379)
  DOM harness:  66 passed, 0 failed
  Visual harness: NOT RUN — no CSS or view-partial layout changed, and the
    Admin sub-tab is not in the 20-scenario matrix, so a re-shoot would have
    verified nothing. Instead the render was driven in Node with a realistic
    payload and the output read directly; that is the closest available
    substitute and is stated as such rather than claimed as visual coverage.
  ALL FOUR new pins bite-checked:
    • flipping `scanQueues` to default-ON fails the opt-in pin
    • widening the DQE read from 3 columns to 34 fails the bounded pin
    • dropping `esc()` on a queue name fails the escaping pin
    • collapsing the empty-window branch into the negative verdict fails the
      three-state pin
  Regression Scenarios (manual): no FAILs.
    S30 (trigger handlers reject non-manager) PASS — static:
      `sendAutomationHealthDigest`'s gate is untouched and it still calls
      `computeAutomationHealth_()` with no opts (pinned).
    S43 (Metrics CDR-unavailable fallback) PASS — the inventory is attached
      INSIDE the `cdr.ok` branch and is itself try/catch'd at both the helper
      and the call site, so an unreachable CDR degrades exactly as before.
    S44 (shift-stats CDR enrichment) PASS — untouched.
    S57 (Compliance audit panel) PASS — static: the Admin panel render gains
      one appended part; no existing branch changed.
    S41/S42 (Metrics My Stats / Team Metrics) PASS — static: no metrics reader,
      cache key, or payload shape changed.

REGRESSION RISKS:
  - **The Admin Overview now triggers the scan, not just the expanded "System
    details" disclosure** — the Overview summary and the detail panels share ONE
    `getAutomationHealth` fetch by design (no extra RPCs). So opening the Admin
    tab costs the queue scan. Accepted and stated: it is 3 columns against a
    4000-row tail, materially cheaper than the unfiltered 34-column full-sheet
    `getCdrAgentMetrics_` read already happening in the same call, on a
    manager-gated infrequent surface.
  - `getAutomationHealth` gained a parameter. The single client caller passes
    nothing and gets the opt-in default; `deployReadinessItems_` reads only
    `automation.cdr.ok`, so the new `queueInventory` field is inert to it. Both
    verified.
  - `CDR_QUEUE_LIST_CAP` truncates the queue list at 40. A sheet with more
    distinct queue identifiers than that would under-report — mitigated by the
    row-count sort (the largest queues survive) and by `truncated`, but worth
    knowing before drawing conclusions from a very wide sheet.

INVARIANTS AT RISK: None.
  - INV-64 (duration columns via getDisplayValues) untouched — the inventory
    reads no duration column.
  - INV-85 (bump the cache key on meta shape change) deliberately respected by
    NOT touching `getCdrAgentMetrics_`'s meta.
  - INV-124 not in scope: the inventory is admin-gated and reports no
    per-rep metric.
  - INV-169 (a capped reader reports its total/truncation) followed by the new
    reader.

NET SCORE: 0 production fixes − 0 new failure modes = 0
  Phase 0 is a DIAGNOSTIC, not a fix. It changes nothing a user sees outside
  the admin panel and repairs no defect. Scored honestly as 1 new capability
  rather than inflated into a fix.

OPERATOR ACTIONS / DEPLOY:
  - **REQUIRED to get the answer** | BLOCKS the rest of the feature: Y
      1. `cd web-app && clasp push -f`
      2. Apps Script editor → Deploy → Manage deployments → Edit →
         Version: **New version** → Deploy
      3. Open **Manage → Admin → Automation Health** and read the
         "Queue inventory · discovery" block.
    This deploy also carries cycle 11's visual batch and all of cycles 12–13,
    which remain unconfirmed.
  - CARRIED, DEV PROJECT ONLY: add Script Property `INSTANCE_IS_PROD=false`
    | BLOCKS DEPLOY: N
  - No new Script Property, trigger, or migration is introduced by Phase 0.
  Deploy: `cd web-app && clasp push -f` + New version.

FOLLOW-ON ITEMS:
  - **Phase 0 is a GATE.** If the panel reports "per-queue rep attribution is
    NOT in this data", the approved design (expandable per-queue rows +
    segmented contribution bars over rep numbers) cannot be built as specified,
    and the feature becomes queue-health from the `A_Q_*` aggregates — closer
    to the dedicated-Queues-tab option that was not chosen. That is a decision
    to bring back to the operator, not to resolve silently.
  - Phases 1–2 remain as planned and unstarted: queue-aware readers behind an
    opt-in argument, `CDR_QUEUE_GROUPS` Script Property for the queue→department
    mapping, col 4 + H:R added to the header validators, `CDR_CACHE_KEY` bump,
    multi-queue rows in the CDR fixture, then the manager scope switcher.
  - The CDR fixture still writes one row per agent with no queue, so no test
    exercises the multi-queue path. Extending it belongs with Phase 1, where
    there is aggregation logic to protect.
  - FO-6 (TimesheetArchive readers) unchanged and still deferred.

DOCUMENTATION UPDATES NEEDED:
  - None outstanding — applied in this batch: the Automation Health Key Design
    Decision now documents the queue inventory, why it is opt-in (the 10-minute
    badge poll), why it is not folded into the cached `getCdrAgentMetrics_`
    meta, and that `CDR.QUEUE_EXT` had been declared-but-unread.
  - No invariant proposed yet. The rules worth pinning here (queue→department
    mapping, per-queue anonymization) belong to Phases 1–3 and would be
    speculative before the inventory reports.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
