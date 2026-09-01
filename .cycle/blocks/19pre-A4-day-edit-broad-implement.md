---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: A4 — rebuild the Day Edit modal for N break pairs (the last
path in the app that destroyed legal break data; the gap INV-155 named when
PR #213 made multi-break days legal everywhere else)

Files modified:
- web-app/Code.js
- web-app/modals.html
- web-app/styles.html
- web-app/tc/script_manager.html
- web-app/Tests.js
- test/client/run.js
- test/client/dom/runDom.js
- test/visual/mock.js
- test/visual/shoot.mjs
- CLAUDE.md

CHANGES:
A4-server | web-app/Code.js | `managerParseBreakSlots_` accepts `slots.breaks`
  [{out,in}] and falls back to the legacy {LunchOut, LunchIn} scalars (an older
  client, and managerSaveDayRange, which stays single-pair). A pair must be
  complete and well-ordered; pairs must not overlap (checked order-independently);
  each must sit inside the clock span, with the containment check SKIPPED on an
  overnight shift where a plain string compare would reject every legitimate
  break. Over `MANAGER_DAY_MAX_BREAKS` (12) it refuses by name rather than
  truncating. None of these states could arise from four fixed slots; with N rows
  a manager can type them, and calcHours_ would faithfully deduct the nonsense.
A4-reconcile | web-app/Code.js | `managerPlanDay_` EXTRACTED as the reconcile's
  decision half — pure, so it can be driven without a spreadsheet. Every pairing
  bug this feature has had lived in the decision, not the sheet writes. The
  submitted break list IS the day: zero submitted deletes every break row, N
  leaves exactly N. Existing rows pair positionally through the SHARED
  `breakSortKey_` (the ordering `breakPairs_` already uses), so an edit lands on
  the row it was DISPLAYED against even on a scrambled append order or an
  overnight shift; an unpaired leftover half is removed rather than left dangling.
  CLOCK semantics are byte-preserved from S7 (a blank slot still deletes; duplicate
  clock rows still collapse to the displayed/last one). Apply order unchanged:
  updates by row index → deletes descending → appends.
A4-range | web-app/Code.js | `managerSaveDayRange` REFUSES a payload carrying more
  than one break pair, naming why (adding N pairs per day is not idempotent across
  a re-apply; replacing them contradicts range mode's additive contract, INV-108).
  A single pair maps down to the legacy scalars the additive writer understands.
A4-modal | web-app/modals.html, web-app/styles.html | The four fixed slots become a
  ClockIn/ClockOut row plus a Breaks section: a heading with "+ Add break", an
  aria-live list host, and a hidden range note. New CSS for the head/add/row/
  remove/empty/note; the break row is `1fr 1fr auto` with NO compact override and
  no breakpoint — measured 182/182/34px at 480 and 126/126/34 at 390, so a
  re-columning would owe an A2 breakpoint it does not need.
A4-client | web-app/tc/script_manager.html | `deRenderBreaks_` / `deReadBreaks_` /
  `deSetBreaksFromDay_` / `deSyncRangeMode_`; add and remove SNAPSHOT the typed
  values before re-rendering (the cnRenderSubforms_ lesson) and remove is delegated
  on the host so it survives each re-render. Prefill prefers `day.breaks` and falls
  back to the scalars, so a payload cached before the deploy still fills its one
  pair. Submit sends `slots = {ClockIn, ClockOut, breaks}`. Filling "To" disables
  Add and states the limit. The team-calendar "+N" tooltip no longer tells the
  manager to avoid Day Edit.
A4-ordering | web-app/tc/script_manager.html | Found by READING the open path:
  `deRenderBreaks_` re-syncs range mode off the LIVE "To" value, so rendering the
  empty list before clearing "To" left Add disabled from the previous session. The
  prefill normally re-syncs, but it returns early when the day has no row — exactly
  when a manager is entering punches by hand. The render now runs after the reset.
A4-tests | test/client/run.js (+4 → 707), test/client/dom/runDom.js (+7 → 98),
  web-app/Tests.js (+1 → 304), test/visual/{mock,shoot}.mjs (+3 scenarios → 61) |
  A4-1 parser behavioural; A4-2 the reconcile driven through managerPlanDay_
  (incl. the two-break no-op save that the old modal collapsed, and the apply
  order); A4-3 the range refusal; A4-4 the client contract. DOM covers what a
  source scan cannot: the round-trip, the snapshot property, removing the FIRST
  row, an inert disabled Add, the reopen-after-range case, and a hostile stored
  time staying inside its attribute (asserted on getAttribute — an
  <input type="time"> sanitizes .value to '' and would report success either way).
  The Day Edit modal had NEVER been shot; its fixture is a deliberate TWO-break day.

TEST RESULTS: passed — pure 707/0, DOM 98/0. 18 mutations bite-checked, 18 bites.
  Two corrections during bite-checking, both recorded: a pin weaker than its
  property (indexOf on a deleted needle returns -1, and -1 < anything is true, so
  removing the snapshot read passed an ordering check silently — a before() helper
  now asserts presence first), and one MUTATION that was wrong rather than the pin
  (re-adding the early render left the correct later call in place, so it did not
  reproduce the defect; the honest inverse MOVES the call).
  Regression Scenarios (Test Command is `manual`): S7 REWRITTEN for the new
  contract and walked mechanically through A4-2 + the DOM suite — the deployment
  walk is operator-side. S95's Day-Edit clause updated. S3/S5/S6/S13/S16/S39/S46/
  S72/S79/S88/S91/S92: NOT APPLICABLE mechanically — they need a live deployment;
  none touches the break-list path except S91 (team calendar), whose pencil
  prefill is pinned in A4-4 and unchanged.

REGRESSION RISKS:
- `managerSaveDay`'s `slots` shape changed. The legacy `{LunchOut, LunchIn}`
  fallback keeps every OTHER caller working — including `managerSaveDayRange` and
  a client cached from before the deploy — and A4-1 pins both directions plus which
  wins when both are present.
- `managerPlanDay_` is a pure extraction; the apply half is untouched and its
  order is pinned. The now-dead `anchorMins` in the caller was removed (INV-184).
- The break row's 3-column grid has no compact override, so nothing new is owed to
  the A2 scan. Measured: 0 page overflow at 480 and 1440.
- Deploy skew in the other direction is the real one: a client from AFTER the
  deploy talking to a server from BEFORE it would send `breaks` to a parser that
  ignores it, silently dropping the break edits. Not reachable here — Apps Script
  serves one version of both halves — and the deploy-version beacon prompts open
  tabs to reload.

INVARIANTS AT RISK: None violated.
- INV-155: its "KNOWN GAP … Workstream A4" clause is now CLOSED and rewritten.
- INV-176: the summing rule is untouched; the reconcile writes the pairs
  calcHours_ already knew how to read.
- INV-108: range mode's additive contract is preserved BY REFUSING the combination
  rather than bending it.
- INV-05/L-4: the per-slot future-time reject in the TARGET's tz now covers every
  break time, not just the two fixed lunch slots.
- INV-173/195: the add and remove controls are real, named buttons; every input
  carries a label association.
- INV-184: the dead `anchorMins` removed; every emitted class is defined in a
  stylesheet (pinned).
- INV-187: a malformed pair is refused BY NAME rather than written as a plausible
  deduction.

NET SCORE: 2 production fixes − 0 new failure modes = 2
  (a) Day Edit collapsing a legitimate multi-break day on save — the operator has
      two-break days in production today, so this WOULD have fired this month;
  (b) the open-ordering defect, found and fixed within this change before shipping
      (counted once, as a fix, since it was live in the working tree and pinned).
  No new failure mode: the parser refuses rather than half-writes, and the legacy
  fallback keeps every pre-existing caller byte-identical.

OPERATOR ACTIONS / DEPLOY:
- Run `reportMultiBreakDays()` before deploying, if not already done for PR #213 —
  unchanged from that round; A4 adds no new historical impact. | BLOCKS DEPLOY: N
- Post-deploy `runAllTests()` now expects **304**. | BLOCKS DEPLOY: N
- No Script Properties, triggers, migrations, OAuth scopes or CONFIG values.
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage
deployments → Edit → Version: New version → Deploy.

FOLLOW-ON ITEMS:
- MEASURED, out of scope: Manage Time overflows the page by 44px at 390px, with
  the team-punches `.m-table` the widest element. Pre-existing (it measures the
  same with the modal closed) and unrelated to A4. The tab is covered only at
  WIDE, so the derived visual-gap marker cannot see it — recorded in the Visual
  Audit Stage beside the equivalent Admin-at-mobile gap.
- Workstream B is unstarted: B1 (prefill the adjust modal from the done state),
  B2 (notify the manager when an adjustment request is SUBMITTED — today it
  notifies nobody), B3 (the resume path, which needs
  `writeAdjustPunchForEmployee_` to gain a remove/convert capability).
- Day Edit still cannot express a second SHIFT (a repeated Clock In/Clock Out is
  collapsed by both the reconcile and the sheet doctor). That is the deliberate
  multi-shift decision from the plan, not an oversight.

DOCUMENTATION UPDATES NEEDED: DONE in this change —
- INV-155's A4 gap clause rewritten as CLOSED, with the two properties that make
  the reconcile safe (shared ordering, refuse-don't-guess).
- S7 re-derived end to end for the break list; S95's Day-Edit clause updated.
- The multi-break operator-state entry's "avoid Day Edit" warning lifted, with
  the range-mode limit stated in its place.
- Narrative counts: pure 703 → 707, DOM 91 → 98, runAllTests 303 → 304, visual
  matrix 58 → 61.
- Visual Audit Stage: the Day Edit modal joins the shot modal states; the
  Manage-at-390px overflow recorded as an open viewport gap.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
