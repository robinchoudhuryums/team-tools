---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- Phase 1 (CDR sub-queue, RE-SCOPED to transfer-only) | Make per-queue rep
  attribution available where it actually exists — the Transfer tab — after
  Phase 0's gate proved DQE cannot support it.

Files modified:
  web-app/Code.js, web-app/cn/script_callnotes.html, web-app/Tests.js,
  test/client/run.js

CHANGES:

Phase 1 | Code.js | `getCsrTransferPerRepDaily_` gained a 4th `opts` argument
  with `opts.withQueues` (DEFAULT OFF). When on it reads the H:R per-queue
  block and attaches, per rep, `queues {name: count}` on BOTH the range
  aggregate and the per-day shape, plus `queueTotal` / `queueUnattributed`.
  Three design points, each load-bearing:
    • **Columns are discovered BY HEADER NAME**, not from a hardcoded queue
      list. The headers are written by the operator-owned `call-data-reporting`
      repo; name-reading is self-correcting under a reorder inside the block
      and creates no parallel source of truth to drift. New pure helper
      `csrTransferQueueColumns_(headers)` bounded to `CSRT_QUEUE_COL_FIRST/LAST`
      (0-indexed 7..17 — 18 is Comments, 6 is the grand total).
    • **Accumulation matches the cycle-9 L-14 rule** (`+=` on an alias-row /
      raw-row collision) so the per-day shape and the range aggregate cannot
      silently disagree, which is the exact bug L-14 fixed for the totals.
    • **A zero or blank cell is ABSENCE, not a queue with zero traffic** —
      otherwise every rep would appear to staff every queue.

Phase 1 | Code.js | TRANSPARENCY — the operator's actual ask. The per-queue
  counts are a COMPONENT of `transferred`, never a partition of it: a real
  sheet routes some transfers to destinations with no `A_Q_` column (the
  fixture pins 9 of 14 attributed). `queueTotal` + `queueUnattributed` let a UI
  say "9 of 14 attributed" instead of implying the breakdown is complete, and
  `transferred` is NEVER derived by summing queues.

Phase 1 | Code.js | `cdrQueueInventory_` gained a real consumer:
  `transferQueueTotals` (windowed transferred + contributing rep count per
  queue), sourced through the NEW reader. This is deliberate — a data layer
  with no consumer is the "dead-but-tempting entry" this codebase keeps
  warning about, and routing the diagnostic through production code exercises
  it against live data before any UI exists.

Phase 1 | cn/script_callnotes.html | `cnQueueInventoryHtml_` renders a
  "Transfers by queue · in window" block plus its own failure and
  empty-header-block states. Every server string `esc()`'d (these cross the
  `call-data-reporting` trust boundary).

Phase 1 | Tests.js | The CDR fixture's Transfer tab had NO per-queue columns at
  all, so nothing could catch a queue-aggregation bug. It now carries a 3-queue
  H:R block whose counts deliberately sum to LESS than `transferred`, plus a
  zero cell and a blank cell, so the transparency contract and the
  absence-vs-zero rule are both exercised rather than asserted.

TEST RESULTS: PASSED.
  node --check Code.js + Tests.js: OK
  Pure harness: 382 passed, 0 failed (379 → 382)
  DOM harness:  66 passed, 0 failed
  ALL FOUR new pins bite-checked. One did NOT bite first time and was
  tightened: the header-discovery test injected literal bounds `(7, 17)` into
  `new Function`, so widening `CSRT_QUEUE_COL_LAST` to 18 (swallowing the
  Comments column) passed. It now reads the real constants out of `Code.js`
  and asserts them, and the same mutation fails.
  Client render driven in Node with a realistic payload and read directly —
  the Admin sub-tab is not in the visual matrix, so this is the available
  substitute, not visual coverage.
  Regression Scenarios (manual): no FAILs.
    S41 (My Stats) PASS — `getMyMetrics`'s trend call is one of the three
      3-arg callers; pinned unchanged.
    S42 (Team Metrics) PASS — `getTeamMetrics` does not use the Transfer
      reader at all; untouched.
    S43 (CDR unavailable fallback) PASS — the new block sits inside the
      `cdr.ok` branch and is additionally try/catch'd at the call site, so an
      unreachable CDR degrades exactly as before.
    S44 (shift-stats CDR enrichment) PASS — untouched.
    S57 (Admin compliance panel) PASS — static: the CDR block gains one
      appended part; no existing branch changed.
    S30 (trigger handlers reject non-manager) PASS — static: the digest still
      calls `computeAutomationHealth_()` with no opts, so it never pays for
      the queue read (pinned).

REGRESSION RISKS:
  - The opt-in default is the entire compatibility story. `getDashboardMetrics`
    (×2) and `getMyMetrics` cache their ASSEMBLED results; if the default ever
    flipped on, those payloads would change shape with no INV-85 cache bump.
    Pinned by a test that counts 3-arg vs opted-in call sites, bite-checked.
  - The admin panel now does one MORE read of the Transfer tab (the occupancy
    scan and the windowed reader are separate reads of the same tab). Kept
    deliberately: they answer different questions — "do these columns carry
    data historically" vs "how many transfers landed in the window" — and the
    panel already does a 34-column full-sheet DQE read. Both stay behind the
    Phase-0 `scanQueues` gate, so the 10-min badge and daily digest are
    unaffected.
  - `queueUnattributed` uses `Math.max(0, …)`. If a sheet ever reported queue
    counts EXCEEDING the total, that overage would read as 0 rather than as an
    error. Chosen over surfacing a negative because the number is a UI
    subtitle, but it means an inconsistent sheet degrades quietly — noted
    rather than hidden.

INVARIANTS AT RISK: None.
  - INV-64 (duration columns via getDisplayValues) — the whole Transfer reader
    already uses `getDisplayValues()`; the new header read does too.
  - INV-85 (bump the cache key on shape change) — respected by NOT changing any
    cached payload: no caller opts in except the uncached admin panel.
  - INV-124 (N=3 cohort anonymization) — untouched and out of scope: the
    consumer is admin-gated and reports no rep-level figure.
  - INV-169 (a capped reader reports its cap) — the new list is capped by the
    existing `CDR_QUEUE_LIST_CAP` alongside the Phase-0 lists.

NET SCORE: 0 production fixes − 0 new failure modes = 0
  Phase 1 is a CAPABILITY (1), not a fix. It repairs no defect and changes
  nothing a user sees outside the admin panel. Scored honestly rather than
  counted as a fix.

OPERATOR ACTIONS / DEPLOY:
  - Deploy to see it | BLOCKS DEPLOY: N (nothing breaks without it)
      `cd web-app && clasp push -f`, then Deploy → Manage deployments → Edit →
      Version: New version → Deploy. Then Manage → Admin → Overview →
      "System details" → Automation Health → "Transfers by queue · in window".
  - Re-run `runAllTests()` — the new `metrics_csrTransferQueues_optInAndTransparent`
    executes ONLY in the editor. Expect 284 total, 0 failed.
  - CARRIED, DEV PROJECT ONLY: add `INSTANCE_IS_PROD=false` | BLOCKS DEPLOY: N
  - No new Script Property, trigger, migration, or CONFIG constant.
  Deploy: `cd web-app && clasp push -f` + New version.

FOLLOW-ON ITEMS:
  - **Phase 2 (the UI) is the remaining half of the operator's ask** and is
    unstarted: a Team Metrics scope switcher with expandable per-queue rows +
    segmented contribution bars, on the Transfer KPI. The data layer now
    supports it; nothing rep-facing has changed yet.
  - **Queue GROUPING was deliberately NOT built.** The plan carried a
    `CDR_QUEUE_GROUPS` Script Property, and I could infer plausible groupings
    from the names (FieldOps + FieldOps_Power, PowerChairs + Manual_Mobility) —
    but that is a guess about the operator's business, and shipping an
    empty-by-default property plus an Admin editor that nothing consumes would
    be dead code twice over. It belongs in Phase 2, where the "By department"
    switcher makes it load-bearing and the operator can confirm the groupings.
  - Phase 0's finding stands: DQE carries one row per (agent, date), so
    answered / missed / % answered / talk-time can never be split by queue. Any
    future request for those must be answered "not in this data".
  - The DQE `A_Q_*` sentinel rows remain unused — 8 queues, 12 rows in a week
    is too sparse to build a series on.

DOCUMENTATION UPDATES NEEDED:
  - CLAUDE.md needs the Phase 1 contract recorded: the transfer-only scope and
    WHY (Phase 0's verdict), header-name reading, the opt-in default and what
    it protects, and the component-not-partition rule. Not yet applied — this
    batch touched no doc file.
  - Candidate invariant for /reflect: per-queue transfer counts are a COMPONENT
    of `transferred`, never a partition; `transferred` is never derived by
    summing queues, and the unattributed remainder is always reported.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
