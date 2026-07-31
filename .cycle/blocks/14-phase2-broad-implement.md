---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- Phase 2 (CDR sub-queue, transfer-only) | The UI half of the operator's ask:
  view sub-queue detail SEPARATELY and TOGETHER-WITH-TRANSPARENCY in the
  combined view, on the one KPI that can carry a per-queue rep split.

Files modified:
  web-app/Code.js, web-app/script_core.html,
  web-app/metrics/script_metrics.html, web-app/Tests.js,
  test/client/run.js, test/client/dom/runDom.js,
  test/visual/mock.js, test/visual/shoot.mjs

CHANGES:

Phase 2 | script_core.html | `mtRenderTable_` gained OPTIONAL `detailRow(r)` +
  `rowId(r)`. Additive by construction: a caller passing neither renders a
  byte-identical `<tr>`, so the three existing callers are untouched. The
  caller owns the disclosure BUTTON (so it can sit in whichever column suits)
  and points `aria-controls` at the emitted row; the id is charset-restricted
  for the same reason the sort handler is (cycle-11 L-15 — entity-escaping is
  the wrong neutralizer in an attribute the browser decodes before use).

Phase 2 | Code.js | `getTeamMetrics` now reads transfers with
  `{withQueues:true}` and attaches per rep: `transferred`, `transferPct`,
  `queues{}`, `queueTotal`, `queueUnattributed`. It also returns `queueRows`
  (the by-queue view, largest first) and `transferMeta`.
  **BEST-EFFORT, the INV-67 posture:** the Transfer tab is optional and a
  manager's whole team table must not vanish because one auxiliary tab is
  unreachable — a throw degrades to `transferMeta.error` and the table stands.
  Only reps that made the table contribute to `queueRows`, so the two modes
  always describe the same population.

Phase 2 | metrics/script_metrics.html | Two modes behind a `role="tablist"`
  scope switcher, rendered ONLY when the read actually produced queues (an
  inert control is worse than no control):
   - **COMBINED** — the existing per-rep table plus a Transfers column: the
     count is a real `<button>` disclosure (INV-173/174) with a segmented
     contribution bar beneath it, expanding to a per-queue breakdown.
   - **BY QUEUE** — rows are queues (queue, transferred, contributing reps),
     answering "which queue is taking the volume" without a rep dimension.
  **INV-180 is enforced visually, not just in the payload:** the bar draws the
  unattributed remainder as its own muted segment and the detail states
  "9 of 14 transfers attributed to a queue" in words. A bar built from queues
  alone would silently imply the breakdown was complete — which is precisely
  the transparency the operator asked for.
  Queue colour is a deterministic hash (`mQueueHue_`), so a queue keeps its
  colour across renders AND across both modes.
  A failed transfer read renders `errorStateHtml_` (INV-175), never a silent
  zero. Every server string `esc()`'d — queue names cross the
  `call-data-reporting` trust boundary.
  A real VIEWPORT media query at 720px, not a `data-compact` override (the A2
  rule: the two triggers are independent).

Phase 2 | test/visual/ | Team Metrics had NEVER been in the 20-scenario matrix,
  and it is now the home of a segmented-bar UI — exactly what code review
  cannot verify. Added a contract-accurate `getTeamMetrics` fixture (queueTotal
  is the real sum of `queues`; queueUnattributed the real remainder — the V-14
  lesson) and two scenarios (light/dark). Matrix 20 → 22.

TEST RESULTS: PASSED.
  node --check Code.js + Tests.js: OK
  Pure harness: 387 passed, 0 failed (382 → 387)
  DOM harness:  68 passed, 0 failed (66 → 68)
  Visual: `metrics-team-light-wide` / `-dark-wide` shot and READ, `missing: []`
    both — the real view rendered, not a loader. Verified: bars segment
    correctly, a rep with 3 transfers and no attribution renders an all-grey
    bar (correct, legible), and the fixed HSL palette stays legible in dark
    mode against `--muted-3`.
  ALL EIGHT new pins bite-checked (5 pure + 3 DOM), each reverted individually:
  dropping the remainder segment, dropping `esc()` on a queue name, reverting
  the disclosure to a `<span>`, removing the `detailRow` guard, swallowing a
  transfer failure, skipping the `aria-expanded` update, un-hiding the detail
  row by default, and removing the scope normalisation. Reverting the button
  ALSO tripped cycle-13's A1 tripwire, confirming that generalized rule still
  works.
  ONE EXISTING PIN was updated as part of the fix, not reactively: the Phase-1
  opt-in pin counted opted-in callers and Phase 2 immediately made it 2. A bare
  count trains the next author to bump the number, so it now NAMES the opted-in
  callers (`cdrQueueInventory_`, `getTeamMetrics`) while keeping the
  load-bearing assertion — exactly 3 callers stay 3-arg, because those cache
  their assembled payloads.
  Regression Scenarios (manual): no FAILs.
    S42 (Team Metrics date-range + presets) PASS — visual re-render in both
      themes; the range/preset controls and the existing columns are unchanged.
    S41 (My Stats) PASS — `getMyMetrics` is one of the three untouched 3-arg
      callers (pinned).
    S43 (CDR unavailable fallback) PASS — the transfer read is separately
      try/catch'd, so a CDR outage and a Transfer outage degrade independently.
    S44 (shift-stats CDR enrichment) PASS — untouched.
    S57 (Admin panel) PASS — the Phase 0/1 inventory is unchanged.

REGRESSION RISKS:
  - `mtRenderTable_` is a SHARED component with three callers. The change is
    guarded behind `opts.detailRow && opts.rowId`, so the other two render
    identically — but this is the shared table, so any future edit there
    carries the same blast radius. Pinned.
  - `getTeamMetrics` now performs one additional full read of the Transfer tab
    per load. The endpoint is manager-gated and uncached, so this is a real
    per-load cost, accepted because it IS the feature. If Team Metrics ever
    gets a result cache, this payload must be part of the INV-85 reasoning.
  - Queue colours are a fixed HSL hash, not theme tokens. Verified legible in
    both themes at 45% lightness, but they are decoration, not text — do not
    reuse this palette for anything that must meet a contrast ratio.
  - `queueRows` counts only reps that made the table (they need CDR rows or
    notes). A rep with transfers but NO CDR row and NO notes would be excluded
    from both modes — consistent between them, but it means the by-queue totals
    can be lower than the raw sheet's. Noted rather than hidden.

INVARIANTS AT RISK: None.
  - INV-180 is now enforced in the UI as well as the payload (remainder segment
    + the stated fraction).
  - INV-173/174 honored: a real `<button>`, `aria-expanded` kept in step by a
    handler, `role="tablist"`/`aria-selected` on the switcher.
  - INV-175 honored: a failed transfer read is an error strip, not an empty
    table.
  - INV-85: no cached payload changed — `getTeamMetrics` is uncached.
  - INV-124: not in scope; Team Metrics is manager-gated and per-rep by design.

NET SCORE: 0 production fixes − 0 new failure modes = 0
  Phase 2 is a CAPABILITY (1). It repairs no defect. Scored honestly.

OPERATOR ACTIONS / DEPLOY:
  - Deploy to use it | BLOCKS DEPLOY: N
      `cd web-app && clasp push -f`, then Deploy → Manage deployments → Edit →
      Version: New version → Deploy. Then **Metrics → Team Metrics** — the
      Combined/By-queue switcher appears above the per-rep table whenever the
      range contains queue-attributed transfers.
  - Re-run `runAllTests()` — `metrics_getTeamMetrics_queueBreakdown` executes
    ONLY in the editor. Expect 285 total, 0 failed.
  - CARRIED, DEV PROJECT ONLY: add `INSTANCE_IS_PROD=false` | BLOCKS DEPLOY: N
  - No new Script Property, trigger, migration, or CONFIG constant.
  Deploy: `cd web-app && clasp push -f` + New version.

FOLLOW-ON ITEMS:
  - **Queue GROUPING ("By department") is still unbuilt, and the switcher says
    so by offering only Combined / By queue.** The operator's phrasing was
    "departments w/ sub-queues", so grouping is arguably the last mile — but
    the mapping is a guess about their business (FieldOps + FieldOps_Power?)
    and needs their input, not mine. With the queue rows now visible in
    production, they can name the groupings from real data. That is the
    natural Phase 4.
  - The by-queue mode has no sort controls (rows are pre-sorted by volume
    desc). Fine at 11 queues; revisit if the list grows.
  - Phase 0's finding stands: answered / missed / % answered / talk-time can
    never be split by queue.
  - FO-6 (TimesheetArchive readers) unchanged and still deferred.

DOCUMENTATION UPDATES NEEDED:
  - CLAUDE.md needs the Phase 2 surface recorded: the two modes, the
    transparency contract in the UI, `mtRenderTable_`'s new optional
    detail-row capability (it is a documented shared component), and the
    visual-matrix growth 20 → 22.
  - Not applied — this batch touched no doc file.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
