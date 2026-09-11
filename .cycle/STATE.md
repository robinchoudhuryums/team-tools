# Cycle State

## Current
Cycle: 19 — OPEN (the /broad-scan of 2026-09-09 opened it; cycle 18's block
moved to HISTORY.md at that point, per the close-out procedure). The
between-cycles operator work that preceded it is closed and reflected as
`19pre` (net +12; `.cycle/blocks/19pre-a-reflect.md`).
Phase: reflect — DONE 2026-09-11 (`.cycle/blocks/19-a-reflect.md`, net 8 − 0 = 8; metrics row appended; INV-198/199 written, INV-200..204 proposed). Cycle 19 is CLOSED in substance; its STATE block moves to HISTORY.md when the next `/broad-scan` opens cycle 20 (the close-out procedure). The follow-ons round MERGED as PR #237 (2026-09-11 17:10Z, merged by the operator); the operator then `clasp push`ed and ran `runAllTests` → 302/312, whose ten `Admin access required.` failures were `ADMIN_EMAILS` narrowed on the deployment (operator state, not the round — first failure #97 of 312, before the adminEmails test at #247) — the suite accommodation (setup appends / cleanup strips the test manager) MERGED as PR #238 and the re-run read 312/312. THEN the operator's `installAutomationTriggers()` threw `This script has too many triggers` — the trigger-quota fix (three same-slot dispatchers, 16 triggers for 24 handlers) MERGED as PR #239, Batch P of the next-steps plan MERGED as PR #240, and the operator's post-push `runAllTests()` read **315/315** (2026-09-11 — the documented expected count after #239; the three dispatcher gate tests only exist in #239's Tests.js and only pass against #239's Code.js, so both files are on the deployment). The branch `claude/broad-scan-fw462g` was DELETED on GitHub at the #240 merge — restart it from `origin/main` for the next batch. Preceding phase, for the record: the follow-ons round (retention tier + suggestion follow-ons) LANDED on the branch (5 commits, bite-checked) and `/sync-docs` applied its documentation the same day. Before it: the OPERATOR testing-notes round (see the section below; all four batches A–D done, and `/sync-docs` has applied every documentation update the four blocks owed, 2026-09-11). Before it: ALL FOUR batches of the audit's IMPLEMENTATION BATCH PLAN
  are DONE and committed, and `/sync-docs` has reconciled the documentation
  behind them. Nothing from the plan remains except its Deferred set, which is
  operator/feature decisions rather than defect work. The cycle is ready for
  `/reflect`.
Scope: broad
Test Command: manual
Estimates: Batch P — S (~2 h), recorded 2026-09-11 20:24Z BEFORE the first edit · Batch S — M (~4 h), recorded 2026-09-11 BEFORE the first edit
  (P1's own rule, applied to itself; the plan's figure). The remaining
  batches, as estimated at planning time in `.cycle/blocks/19-next-steps-plan.md`:
  S — M (~4 h) · Q — M (~5 h) · C — S–M (~3 h) · D1 — M (~6 h) · D2 — M (~6 h)
  · F1 — S (~2 h) · F2 — L (~2 days).
Subsystem cycles since last Seams audit: 2 (cycle 18's F1–F5 round WAS the
  seams audit; cycle 19 is the first subsystem cycle after it — REFLECTED
  2026-09-11, `.cycle/blocks/19-a-reflect.md`, net 8 − 0 = 8; the counter
  moved 1 → 2 at that reflection)
Updated: 2026-09-11 (operator post-deploy confirmation: `runAllTests()` → 315/315 after PRs #239 + #240 merged; earlier the same day: Batch P landed — d111b10, merged as #240; the trigger-quota fix — 114a16e, merged as #239; the `ADMIN_EMAILS` suite accommodation — #238, 312/312 confirmed)

## Operator testing notes 2026-09-10 (a four-batch round inside cycle 19, PRE-reflect)
The operator posted ten testing notes (nine + a tenth in the follow-up) after
cycle 19's four audit batches merged (PR #235). Plan agreed in chat; the
batches are A (notes 1/5/7/9 — small client + label fixes), B (notes 2/3 —
stats semantics), C (notes 4/6/8 — features needing the decisions below),
D (note 10 — a new presence signal on the Team-right-now card).
- Batch A: DONE, committed a96fe16 on `claude/broad-scan-fw462g` (the branch
  was RESET onto origin/main first — PR #235 had merged), pushed. Block:
  `.cycle/blocks/19-operator-batchA-broad-implement.md` (net +4 self-scored,
  strict — all four operator-observed on the running app; 6 mutations /
  6 bites; pure 778, DOM 110, visual matrix 101).
- Batch B: DONE, committed c525c89 (+ the wrap-up commit) on
  `claude/broad-scan-fw462g`, pushed. Block:
  `.cycle/blocks/19-operator-batchB-broad-implement.md` (net +2 — N3 on both
  surfaces operator-observed; N2 was a verification, scored 0; 8 mutations /
  8 bites; pure 781, DOM 110, visual matrix 101). Shapes as planned: the pure
  `drDeptStats_` fold; DR trailing `ResolvedVia` (`email`/`app`, one reader
  `drResolvedVia_`, writer takes `via`, app + legacy-blank untimed and
  REPORTED as `manualResolved`/`untrackedResolved`/`timed`); Spanish
  `manualCount` + null minutes on the resolved card + cache key v2. The pure
  harness's summary line now prints LAST (three new pins had been running
  after it, uncounted).
- Batch C: DONE, committed 155dd02 (+ the wrap-up commit) on
  `claude/broad-scan-fw462g`, pushed. Block:
  `.cycle/blocks/19-operator-batchC-broad-implement.md` (net +1 — N6's
  unidentifiable collapsed card was operator-observed; N4 / N6-expand / N8's
  editor are capabilities, N8's assign widening is defensive; 13 mutations /
  13 bites across 16 harness runs; pure 784, DOM 112, visual matrix 102,
  editor 309 expected). Shapes as planned: N4 the pure `spanishAutoAssignPick_`
  + reusable `spanishAutoAssignCore_` (one lock, load re-derived inside it,
  ONE batched setValues, counts-only `SpanishInboxAutoAssign` audit) behind a
  MANAGER-gated `autoAssignSpanishThreads` (writer shape; deliberately not the
  canSeeSpanishInbox_ tier), the button beside the filter strip rendered from
  state and refreshed by the list renderer; N6 `DR.PATIENT_TRX:13` written at
  send (capped 120; digest + audit stay label-only), `drCanAct_` extracted as
  the ONE ownership rule, `getDeptRequestDetail` (bare {error} read gate,
  not-found on scope refusal, whitelist note from the sender's Sheet, named
  reasons on note:null), the client subject + a state-driven Expand ⇄ Collapse
  panel; N8 `saveQaMembers` (the saveSpanishInboxMembers shape), the Admin
  card, `getAdminConfig.qaMembers`, `qaCanReviewEmail_` (member OR roster
  manager) behind `qaAssignRecording`'s target check; INV-136 49 → 50 at both
  sites. Two pins rewritten in place: N3-DR (a) for the new trailing slot and
  the cycle-17 batch-3 fixture-shape pin, whose mock-WIDE `patientTrx:` casing
  ban was scoped to the coaching rows (the DR item's server field IS
  `patientTrx`).
- Batch D: DONE, committed 9176908 + 1961691 (+ the wrap-up commit) on
  `claude/broad-scan-fw462g`, pushed. Block:
  `.cycle/blocks/19-operator-batchD-broad-implement.md` (net 0 — N10 is a
  capability; the two layout defects were introduced and fixed inside the
  batch; 11 mutations / 11 bites; pure 785, DOM 113, visual matrix 102
  unchanged, editor 310 expected). ONE deliberate deviation from the shape
  recorded above: the stamp is NOT written inside the polls reps already hit
  — a pinned pop-out left open overnight keeps polling and would read as
  "active" at 7am — it is written by a GESTURE-driven shell beacon
  (`recordPresence`, pointerdown/keydown, ≤1 send per 10 min per window,
  stamp-before-send), TTL ~30 min. `getTeammateStatus` gains the ONE boolean
  `activeNotIn` (self never; present AND not_in/clocked_out only; a failed
  cache read → no flags), INV-24 + S14 amended in-batch. Measured twice
  rather than eyeballed: the first chip (an inline nowrap pill) pushed the
  390px page +34px sideways through the ≤540px `1fr` `.emp-grid`, and the
  longer summary squeezed the card title to three lines under the shared
  `> span:first-child { flex: 1 }` rule (a (0,2,0) fix LOST to it) — both
  fixed, pinned, 0 overflow on all four Clock scenarios.

## Decisions made in that round (operator, 2026-09-10)
- N6: the Dept Requests store MAY carry the patient name & TRX (it stays inside
  the Workspace). The daily SLA reminder email stays label-only unless asked.
- N4: manager BUTTON first; the scheduled trigger may follow soon after.
- N3: legacy Dept Requests rows with a blank `ResolvedVia` are EXCLUDED from
  the timing stats and reported as "resolved before source tracking".
- N8 answer given: QA access = every manager + the `QA_MEMBERS` Script
  Property; the operator (a manager) already sees all four QA tabs.

## In progress (facts to carry forward — NOT judgments)
- Operator round: ALL FOUR batches (A + B + C + D) landed and pushed. Both
  harnesses are green (785 pure / 113 DOM), the tree is committed on
  `claude/broad-scan-fw462g`; every change was bite-checked
  (6 + 8 + 13 + 11 mutations, all biting). The round's documentation is
  NOT yet reconciled — each block's DOCUMENTATION UPDATES list is owed to
  `/sync-docs` (INV-24/S14 were amended in-batch; the rest are listed).
- Nothing else in flight. The four AUDIT batches were bite-checked too (20
  mutations / 20 bites across the two sessions).
- `/sync-docs` is DONE and applied for the operator round (all fourteen owed
  updates plus three drifts the four checks turned up on their own).
- The FOLLOW-ONS round (`/broad-implement retention tier for ViewUsage and
  ClientErrors tabs, suggestion follow-ons`, 2026-09-11) is landed: RT
  (b9c0e9b), BP (dab2999), SA (cafae41), TW (e5576da), DR (cd94af3) — all
  on `claude/broad-scan-fw462g`, every pin bite-checked against a committed
  tree (6 + 6 + 5 + 6 + 3 mutations, all biting). Harnesses: pure 796 / DOM
  113; editor suite now expects 312 (two new trigger-gate tests). Its
  DOCUMENTATION UPDATES list (in the block) is owed to `/sync-docs`; the
  next concrete step after that is `/reflect`.

## Completed this cycle
- (template sync) | .claude/commands/{broad-scan,cycle-init,reflect,setup-cycle}.md, CLAUDE.md | synced to claude-workflow-tools v1.33.0; `Client (QA views)` added to the Deploy Command map. Commit 53b1f44.
- F1 | web-app/Code.js, test/client/run.js | breakPairs_ pairs with independent cursors — a stray early LunchIn no longer un-pairs the whole day (the rep was being PAID for every real break). A1 pin gained its IN-direction cases.
- F6 | web-app/Code.js, test/client/run.js | punchAdjustDecideAll_ discards the cached punch index after a `resume` writes outside it; buildAdjustPunchIndex_ states the precondition a caller owes instead of a universal that is not true.
- F2 | web-app/Code.js, test/client/run.js, test/client/dom/runDom.js, test/visual/mock.js | getMyPendingTasks tells a deliberately-unset store from a failed read (`notConfigured[]`), so the warn line can clear, the block can reach its clean-empty silence, and the 2-minute cache can actually be written.
- F4 | web-app/Code.js, test/client/run.js | every completing flow drops the rep's cached Needs-you list (training read, quiz pass, coaching ack, doc sign, call-back closed, both dept-request resolve paths).
- F3 | web-app/Code.js, web-app/cn/script_callnotes.html, test/client/run.js, test/visual/mock.js | MAIL_BCC_ALL — merged into EVERY email the app sends, including intake bodies and department emails — had NO surface anywhere. It now rides Storage Health via the read-only `mailBccStatus_` and surfaces as a System finding + an inventory line: unset is an ok fact, set-and-internal is a standing warn naming the address, off-domain is blocking. Reports, never enforces.
- F5 | web-app/Code.js, test/client/run.js | qaOptionIsNumeric_ asks `Number()` like its consumers do, so `"4."` / `"1e0"` / `"0x5"` can no longer be a QA dropdown option and fold into the scale averages that drive coverage, calibration and exemption eligibility.
- F7 | web-app/styles_design_tokens.html, web-app/intake/script_intake.html, web-app/cn/script_callnotes.html, test/client/run.js | the PAP purple has ONE home: both consumers ride `--intake-pap` with a new `--intake-pap-soft` tint declared beside it, and the hand-written dark override is gone. Measured AA across all ten palette × mode combinations; the pill alpha moved .16 → .14 (measured 4.47, under AA for 11px).
- F8 | web-app/Code.js, web-app/intake/script_intake.html, test/client/run.js | a failed intake-feedback read is NAMED (`feedbackUnavailable` → `errorStateHtml_`) instead of rendering as "nobody has said anything" — the reading the data cannot support.
- D1 | CLAUDE.md | visual-matrix running total corrected 99→101 to 97→99 and annotated that `shoot.mjs`'s SCENARIOS list is the authority. The S103/S104 half was resolved by construction when STATE.md was reset for cycle 19.
- /sync-docs | CLAUDE.md, README.md, web-app/Code.js | all fourteen owed updates APPLIED (the user's argument overrode the skill's approval gate), plus three the four checks found on their own: `test/visual/fold-measure.mjs` was missing from the Test Suite subsystem list while CLAUDE.md's own PR6 text tells a reader to run it; the README's visual-matrix count had drifted 67 vs the 99 `shoot.mjs` runs; and the README described Intake as three forms (it has five tabs — Sent and Catalog were missing) and still called the QA sampler "Sample 3 for me", which PR 5 renamed. The literally-stale "Pairing is then positional" sentence turned out to live in a **Code.js doc comment**, not in INV-176 — the invariant needed the greedy rule ADDED, the comment needed it CORRECTED; both were done. Scenario coverage followed the fixes rather than only the prose: S95 gained the in-direction break case with its arithmetic (8.5h, not 9.0), S101 the unset-store silence and the completes-and-refreshes step, S97 the two capability lines and all three mail states, S59 the feedback block's third state.
- RT | web-app/Code.js, web-app/cn/script_callnotes.html, web-app/Tests.js, test/client/run.js, test/visual/mock.js | the diagnostics retention tier: `purgeOldDiagnostics` (trigger #20, daily 2am, INV-44 gate, locked, default OFF on BOTH windows — `VIEW_USAGE_RETENTION_DAYS` / `CLIENT_ERR_RETENTION_DAYS`, Script Property first then CONFIG), contiguous bottom-up `deleteRows` runs under a 2000-row budget, the spare-row guard, a fail-safe null timestamp never deleted, a counts-only `DiagnosticsPurge` audit row that is the `AUTOMATION_JOB_CHECKS` heartbeat (enabled only while a window is set — INV-186), `stampAutomationError_` on failure; Admin → Config → Retention gains two "Diagnostics tabs (PHI-free)" rows whose keys are sent only when present (an older client cannot reset a window); Storage Health's ADP row names the live windows. RT-1 pin; `test_triggerGate_diagnosticsPurge_nonManagerThrows`.
- BP | web-app/Code.js, web-app/tc/script_manager.html, test/client/run.js, test/visual/mock.js | `reportBreakPairingChanges()` — the twin of `reportMultiBreakDays()` over the SHARED `tsPunchDaysWithArchive_` reader (live + archive, duplicates counted once, extracted so both reports read the sheet one way), reproducing the pre-F1 figure through the verbatim `breakPairsPositional_` (called exactly once, from the report) + ONE `calcHours_`; the sheet doctor's collapse guard widened from equal-counts to "two-plus stamps of BOTH lunch types" (a double-punched leave on a two-break day would have had a REAL break deleted), and `getTimesheetDoctor` now REPORTS such days whose greedy pairing drops a stamp (`unpaired` + totals + truncated, the dropped stamps NAMED, Day Edit the fix) with the manager card rendering the list. A5 rewritten onto the reader, A2/A3 extended, BP-1..4.
- SA | web-app/Code.js, web-app/cn/script_callnotes.html, web-app/Tests.js, test/client/run.js, test/visual/mock.js | `autoAssignSpanishThreadsScheduled` (trigger #21, hourly) behind the new `spanishAutoAssign` feature flag (server scope, default OFF): the SAME `spanishAutoAssignCore_` as the button, heartbeat `spanishAutoAssign` stamped BEFORE the flag check (INV-151), acts only inside business hours through `businessMinutesBetween_` (the one definition of a working hour), installer as actor with the SYSTEM fallback, failures stamped into `AUTOMATION_LAST_ERRORS`. `DIGEST_STALE_HOURS.spanishAutoAssign: 2` and the reported digest set is now DERIVED from that map (INV-179); both client label maps + both mock fixtures + `test_triggerGate_spanishAutoAssign_nonManagerThrows`. SA-1 (+1 auto-generated by the derived trigger nets).
- TW | test/client/run.js, web-app/qa/script_qa.html, web-app/train/script_empdocs.html | two derived tripwires: TW-A (every function named as a numeric guard uses `isFinite(Number())` and no digit regex — the F5 shape; ≥1 required) and TW-B (a hex literal EQUAL to a declared token value is banned outside canvas fallbacks — which must equal the token they shadow, Console-light — and named INV-166 freezes with a reason; everything else chromatic is a two-sided per-file ratchet with the reason recorded). Writing TW-B found the three canvas fallbacks STALE (qa `--accent` fell back to `--accent-2`'s value; empdocs `--ink` and qa `--muted-3` to values no token declares) — aligned.
- DR | web-app/Code.js, test/client/run.js | `drFindRowByReqId_` (RequestId column scan + ONE row at `DR_HEADERS` width — the `findFormTokenRow_` shape) behind `getDeptRequestDetail`, which fired per Expand click and read the whole tab incl. every request's PatientTrx cell. Scope, gate and the single not-found unchanged (C-N6 holds). DR-1.
- P1 | scripts/cycle-context.mjs, CLAUDE.md, .cycle/STATE.md | estimates in the process — the SessionStart hook reminds, the STATE template carries `Estimates:`, every implement block carries `Estimate:` + `Actual:`; Batch P's own estimate recorded before its first edit.
- P2 | test/client/run.js, web-app/styles_design_tokens.html, web-app/tc/script_clock.html, CLAUDE.md | TW-B's ratchet half retired (ban + FROZEN + canvas rule kept); `--warn-glow` beside `--accent-glow` in the two base blocks only; the ribbon's three fallbacks ride the glow tokens under their unchanged color-mix lines — clock-light-wide + clock-dark-wide re-shot BYTE-IDENTICAL; INV-200 written; new pin P2; 4/4 bites. Commit d111b10.

## Pending / not yet done
- (DONE 2026-09-11) BATCH P of the next-steps plan — `.cycle/blocks/19-batchP-broad-implement.md`;
  net 0 − 0 = 0 (both items defensive/structural by design); Estimate S (2 h) vs Actual ~0.6 h.
  NEXT in the plan: Batch S (suite operability), whose posture needs the operator's Batch 0f
  (the DEV instance) — see the plan block for the order 0 → P → S → Q → C → D1 → D2 → F1 → F2.
- NOTHING from cycle 19's IMPLEMENTATION BATCH PLAN, the operator testing-notes
  round, or the follow-ons round: all landed, documented, reflected, and MERGED
  (PRs #235, #236, #237) plus the post-merge suite accommodation (#238).
- (DONE 2026-09-11, the operator's 0c blocker) the TRIGGER QUOTA fix — `.cycle/blocks/19-trigger-quota-broad-implement.md`:
  Apps Script caps installable triggers at 20/user/script; the installer had 21 and the operator's
  install threw on the LAST create after the dedupe loop deleted everything, leaving the deployment
  with NO `creditMonthlyPtoAccruals`. Now 16 triggers for 24 handlers via three same-slot dispatchers
  (`TRIGGER_GROUPS` the one source), a fail-closed pre-flight, a naming rethrow, TQ-1..3 (7/7 bites),
  three editor gate tests (expect 315). MERGED as PR #239; the operator's post-push `runAllTests()`
  read 315/315 (2026-09-11 — CONFIRMED). Still to confirm from the operator: the ONE
  `installAutomationTriggers()` re-run on the fixed code (expect the "16 of the 20" log line and
  `creditMonthlyPtoAccruals` back in the Triggers panel — nothing is lost if it lands before Oct 1).
- OPERATOR (Batch 0 of the next-steps plan, in this order — 0a is DONE: 312/312, then 315/315 after #239, both on 2026-09-11; 0c was BLOCKED by the quota until #239 — now unblocked, re-run pending confirmation): (0a) `clasp push -f`
  + `runAllTests()` alone → expect 312/312, keep `ADMIN_EMAILS`; (0b) Drive
  re-auth as the deploying account — article images have never rendered;
  (0c) `installAutomationTriggers()` for #20/#21; (0d) `reportBreakPairingChanges()`
  once; (0e) read the mail-routing line on Admin → System; (0f) stand up the DEV
  instance per docs/deployment.md and set `INSTANCE_IS_PROD=true` on prod AFTER
  0a, so the full suite runs nightly on dev and never by hand on prod again.
- The New version deploy carrying #236 + #237 + #239 + #240 (+ #238's Tests.js,
  which needs only the push). The 315/315 run proves the `clasp push` of #239's
  Code.js + Tests.js happened; whether a New VERSION was cut afterwards is
  unconfirmed from here — until it is, open windows still run the pre-#236 client.

## Next-steps plan (post-cycle-19, 2026-09-11)
Full text + measurements + rationale: `.cycle/blocks/19-next-steps-plan.md`. This is the sequence.
SEQUENCE: 0 → P → S → Q → C → D1 → D2 → F1 → F2 — each batch one
`/broad-implement`, independently shippable, estimates recorded in the block.
- **0 OPERATOR** (~1 h + dev setup): the six actions above. 0f is the
  precondition for S.
- **P PROCESS** (S, ~2 h): estimates reminder in the SessionStart hook + an
  `Estimates:` line per batch; retire TW-B's per-file RATCHET half (keep the
  token-equality ban, FROZEN, the canvas rule) and land the `--accent-glow` /
  `--warn-glow` pair that retires the clock ribbon's rgba fallbacks.
- **S SUITE OPERABILITY** (M, ~4 h): shard `_runAllTests` into editor entry
  points A/B (one execution still runs all); `_printSummary` prints the
  DERIVED expected count; `_suiteEnvCheck_()` logs every deployment setting the
  suite depends on (today's class, visible at the top of the log); pins;
  runbook says "smoke on prod, full on dev nightly".
- **Q SCRIPT PROPERTY SIZE GUARD** (M, ~5 h) — the one latent DEFECT:
  `propSetBounded_` (refuse by name at ~9,000 chars for operator blobs;
  degrade by name for auto-managed ones — the geocode cache self-resets on
  BYTES); validators + editors show the serialized budget (templates alone
  admit 200KB today); a Storage Health "Script Properties" line; derived
  every-writer-routes-through-the-helper pin + worst-case arithmetic pins;
  also carries the logged DR whole-tab-read follow-on (`drFindRowByReqId_` in
  both resolve paths).
- **C DERIVED COUNTS** (S–M, ~3 h; after S): `scripts/counts.mjs` derives every
  number the docs carry; ONE generated block in CLAUDE.md between COUNTS
  markers; the 53 "expect N" sentences rewritten to point at it; the guard pin
  + CI `--check` land WITH the rewrite.
- **D1 CLAUDE.md STRUCTURAL MOVES** (M, ~6 h; after C): Cycle Workflow Config →
  `.cycle/config.md` (the hook already prefers it; CLAUDE.md keeps a pointer
  stub for the 16 template commands); KDDs → `docs/design-decisions.md` + a
  one-line index; the 53 dated operator entries → `docs/operator-log.md`; a
  Doc-map section at the top; the three CLAUDE.md-reading pins repointed.
- **D2 CLAUDE.md REWRITES + CEILING** (M, ~6 h; after D1): gotchas → rule +
  trigger + verify pointer, RANKED by hit likelihood (≤600 lines); Projects →
  a module map table; the Test Command narrative → test/client/README.md; then
  the one-sided LINE-COUNT CEILING pin. Target ≤3,000 lines from 12,311.
- **F1 HARNESS SHIM** (S, ~2 h; before F2, its own commit): `serverSource()`
  from `.clasp.json` `filePushOrder`; `extractRawFunction('Code.js',…)` resolves
  through it (586 pins untouched), the 69 direct reads + mock's F4 mirror + CI
  `node --check` follow; a byte-equal pin proves the no-op; a load-order vm pin.
- **F2 Code.js SPLIT** (L, ~2 days): `00_config.js` first in `filePushOrder`,
  then a MOVE-ONLY split by prefix into ~13 files (sizes measured in the block);
  a pin that the function-name set and every body are byte-equal to the
  pre-split tag; Tests.js/DevTools.js unchanged; smoke on dev before prod.
- Rationale for the order and the measurements every estimate rests on are in
  the block. Suggestion #5 (a dedicated deploying account) stays an operator
  question, not a batch.

## Open follow-on items
- (CLOSED 2026-09-11, BP) `reportBreakPairingChanges()` exists; the doctor REPORTS the protected multi-break days whose greedy pairing drops a stamp. RESIDUAL: the one-leave / two-return shape (outs [12:00], ins [11:00, 12:30]) is a classic DUPLICATE LunchIn group, and the collapse keeps the LAST APPENDED row (INV-155's rule) — which is the stray 11:00 if it was appended later. The doctor cannot tell which return is real; Day Edit is the fix, and the `unpaired` report deliberately does not double-report count-disagreeing days.
- (FOLDED INTO BATCH Q5 of the next-steps plan) web-app/Code.js (resolveDeptRequest, markDeptRequestResolved_) — still whole-tab reads by RequestId; DR bounded only the detail read (the per-click one). The same `drFindRowByReqId_` fits both; not done here (scope).
- web-app/Code.js (resolveDeptRequest) — F4 residual: another member of the same receiving desk keeps a resolved request in their incoming list for ≤120s. Closing it needs a generation salt (too blunt — it would evict every rep's entry on every resolve).
- web-app/Code.js (submitCallNote) — deliberately NOT hooked into F4: the notes row derives from getMyMetrics' own 5-minute cache, so busting the pending-tasks key alone cannot change the answer.
- (CLOSED 2026-09-11, TW then Batch P2) both Stage-3 tripwire promotions are written (TW-A, TW-B); P2 retired TW-B's ratchet half and moved the clock ribbon's rgba fallback pairs onto `--accent-glow` / `--warn-glow` (pinned, byte-identical render). RESIDUAL, now unguarded by any ratchet and deliberately so: `styles.html`'s one `rgba(15,23,42,.04)` box-shadow tint — not a token-equal literal; a `--shadow-tint` token if it ever earns a second consumer.
- web-app/Code.js (autoAssignSpanishThreadsScheduled) — the business-hours gate covers hours, weekdays and US holidays; it does NOT consult a member's approved PTO, so with the flag ON a member on leave can be handed claims (the button has the same limit). A PTO-aware picker is an operator decision (the same class as the presence chip's schedule/PTO gating).
- web-app/Code.js (mailMergeBcc_) — `mailBccStatus_` REPORTS an off-domain BCC; it does not block one. Making it enforce is a deliberate policy change and an operator decision, not a defect.
- The audit's Deferred set is untouched EXCEPT the diagnostics retention tier (now RT); the rest remain operator/feature decisions: agent-visible QA reviews, the blocked external form route, a per-rep working-days source, a manager pay-statement export. Also deliberately NOT implemented in the follow-ons round, as operator decisions: presence-chip schedule/PTO gating, BLOCKING an off-domain `MAIL_BCC_ALL`, the `getTeammateStatus` full-Timesheet read, the `dept_req_v1` cache-key bump, the quiz editor's "+ Question" per-block append.

## Decisions made (so the next session doesn't re-litigate)
- F1's pairing is GREEDY, not positional: each `out` takes the earliest `in` that can close it, so an unpairable `in` is dropped ALONE. Greedy is also the conservative reading (the shortest break that can be attributed).
- F6 DISCARDS the employee's cached index after a resume rather than patching the three stale keys — patching would require reasoning about which key a later request in the batch might read, and the read is rare enough that one extra Timesheet read is the cheaper correctness.
- F2 adds `notConfigured[]` rather than widening `unavailable`'s meaning, so the CLIENT needs no change and deploy skew is safe in both directions. The UI stays SILENT about an unset store because Storage Health already reports it (INV-186).
- F2's gates ASK the store (storeConfigured_) rather than string-matching an error message; an active test override counts as configured, so a fixture run never classifies as unset.
- F4 uses a targeted per-rep delete, NOT a generation salt: the key is the rep's own id, and a salt would evict every rep's entry on every dept-request resolve.
- The `pendingTasksBust_` in a quiz submission is gated on `passed` — a failed attempt leaves the item standing, which is correct.
- F3 REPORTS an off-domain BCC rather than dropping it: silently discarding an address the operator deliberately typed would leave them believing they get copies they are not — a worse failure than the one being guarded (INV-187's direction).
- F3 derives the org domain from `Session.getEffectiveUser()` (the account that owns every store and sends every message), NOT a second `@umsupply.com` literal and NOT by touching doGet's access gate — so there is no copy of the domain to drift.
- F7 uses `var(--intake-pap)` directly rather than a new `--intake-pap-deep` alias: the alias was built and REJECTED by measurement (the dark card-mix regressed 7.69 → 4.04).
- REFLECT was scored strictly again — Batches 1+2 net +1, Batches 3+4 net 0. Batch 3+4 contains no fix that fired in production this month; F3 is a Medium for what it GUARDS, not for what it was doing.
- Follow-ons round (2026-09-11): RT purges by CONTIGUOUS bottom-up `deleteRows` runs under a per-run budget rather than row-by-row (the ONE project lock; INV-153's reasoning), and both windows default 0 — installing trigger #20 changes nothing until an operator sets a window from Admin → Config → Retention (danger-confirmed like the CN purges).
- BP reproduces the OLD hours as `new + diffMin/60` from the verbatim pre-F1 pairing, never a second arithmetic; the doctor's widened guard REPORTS a protected day's dropped stamps and never picks which half is real (Day Edit decides).
- SA is the SAME core as the button behind a server-scope flag, default OFF, gated on `businessMinutesBetween_` (no second weekday/hour arithmetic), heartbeat before the flag check; PTO is deliberately not consulted (the button's own limit).
- TW-B's canvas-fallback category REQUIRES the literal to equal the token it shadows (the swatch pin's construction) rather than allowlisting the three stale values it found — so a palette change fails CI until the fallbacks move with it.
- Batch P2 keeps the ribbon's `color-mix` declarations and puts the glow tokens UNDER them as the pre-color-mix fallback, rather than replacing the rules with the tokens outright: `--accent-glow` is 16% and the histogram bars are deliberately 34%, so a token-only rule would have changed the render; the shots are byte-identical this way and the fallback is palette-aware where it was Console-only. `--warn-glow` follows `--accent-glow`'s .16/.22 shape and lives in the base blocks only (a palette never redefines a semantic colour).
- Batch P1 records the estimate convention in CLAUDE.md + the hook rather than editing the `/broad-implement` template's block shape — the command files are synced byte-identical and a local edit would be overwritten by the next `/sync-commands`.
- Batch P did NOT hand-carry the pure-harness running total into CLAUDE.md's narrative beyond stating this batch's own delta; Batch C derives every such number (the Batch 0 precedent).
- DR bounded only the per-click detail read; the two resolve-path whole-tab reads are a logged follow-on, not silently widened into this batch.
- CORRECTION recorded in the 19-batch3-4 block: `robin@umsupply.com` read out of a live-DOM probe is MY fixture value in `test/visual/mock.js`, not evidence about the deployed Script Property. Nothing in the container can read live properties — whether `MAIL_BCC_ALL` is set is settled by opening Admin → System after the deploy.

## Where I left off
STOPPING POINT (2026-09-11, end of session): the tree is clean, every commit is
in `origin/main` (PR #240 was the last merge; `origin/main` = 6667223), and the
GitHub branch `claude/broad-scan-fw462g` was deleted at that merge — the next
session restarts it from `origin/main` (`git checkout -B claude/broad-scan-fw462g
origin/main`). The operator's post-deploy `runAllTests()` read 315/315, which
closes the trigger-quota round's documented check. Nothing is half-done. NEXT is
`/broad-implement S` (suite operability) — see the paragraph below for its
Batch 0f dependency; the estimates.csv row for Batch P (S 2 h vs ~0.6 h actual)
is still owed by the next `/reflect`. One small logged follow-on stays open:
the Admin → System findings read `e.error` where `stampAutomationError_` writes
`message`, so a stamped automation failure renders "unknown error".
Batch P is DONE (2026-09-11, d111b10 + the checkpoint commit, MERGED as PR #240 on
`claude/broad-scan-fw462g` restarted from origin/main after #239 merged):
P1 the estimate convention (hook + template + this file's `Estimates:` line),
P2 the TW-B ratchet retired + `--warn-glow` + the ribbon fallbacks on the glow
tokens (byte-identical shots, 4/4 bites, INV-200). Actual ~0.6 h against the
S (2 h) estimate — the first estimate-vs-actual pair since cycle 12; `/reflect`
owes the estimates.csv row. NEXT: `/broad-implement S` (suite operability),
once the operator confirms Batch 0f (the DEV instance) — S1's nightly full run
on dev depends on it; S2–S4 do not and can land first if 0f is still pending.
Earlier: next-steps plan written (2026-09-11, `.cycle/blocks/19-next-steps-plan.md`;
the sequence is in the section above): 0 → P → S → Q → C → D1 → D2 → F1 → F2.
Pick up with Batch 0 (operator) and then `/broad-implement P` — the process
batch is two hours and its estimate rule applies to everything after it. Batch
Q is the only latent DEFECT in the set (Script Properties cap values at ~9KB;
the template caps admit 200KB) and should not slip behind the doc work.
Post-merge follow-up (2026-09-11, after PR #237 merged and the operator
pushed): the post-push `runAllTests` read 302/312 — all ten failures
`Admin access required.` from admin-tier endpoints called as the manager
fixture (`kbSaveItem` behind the four "…created" ones). Diagnosis: the
deployment's `ADMIN_EMAILS` is SET to a real address (the operator narrowed
Admin to themselves — the property entry invites it) and the suite assumed it
unset; no commit in #236/#237 touched a gate. Fix landed on the branch:
`setupTestEnvironment` appends `_TEST_MGR_EMAIL` to a real list for the run,
`cleanupTestData` strips `@example.invalid` entries back out, ONE predicate
`_testAdminEmailsSplit_` on both sides; CLAUDE.md (residue gotcha, INV-21,
the `ADMIN_EMAILS` entry, a dated operator entry) + a run.js pin. NEXT for the
operator: `clasp push -f`, re-run `runAllTests()` alone, expect 312/312, keep
`ADMIN_EMAILS` as is. Cycle 19 stays closed in substance; the next
`/broad-scan` opens cycle 20 and moves this block to HISTORY.md.
Follow-ons round (2026-09-11): RT / BP / SA / TW / DR are implemented,
bite-checked (26 mutations, 26 bites, every one against a committed tree),
committed on `claude/broad-scan-fw462g` and pushed; harnesses 796 pure /
113 DOM; the summary block is at
`.cycle/blocks/19-followons-retention-broad-implement.md`. NEXT: `/sync-docs`
for that block's DOCUMENTATION UPDATES (the trigger count is twenty-one now,
INV-44's list, the diagnostics-tab entries, INV-176/159/155/138/31 amendments,
the harness totals, README's matrix count), then `/reflect` to close cycle 19
with SIX blocks as inputs (batch 1+2, batch 3+4, operator A–D, this one).
Post-deploy `runAllTests()` expects **312**; `installAutomationTriggers()`
must be re-run once for triggers #20/#21; `reportBreakPairingChanges()`
should be run once from the editor (read-only).
Earlier: Operator testing-notes round: Batches A (notes 1/5/7/9, a96fe16), B
(notes 2/3, c525c89), C (notes 4/6/8, 155dd02) and D (note 10, 9176908 +
1961691) are ALL implemented, bite-checked, committed and pushed on
`claude/broad-scan-fw462g` (reset onto origin/main after PR #235 merged),
and `/sync-docs` (2026-09-11) has applied every documentation update the four
blocks owed: INV-31 (expand toggle, manual resolves untimed,
`autoAssignSpanishThreads` on the MANAGER tier), INV-138 (`ResolvedVia`,
`PatientTrx` — the store is no longer PHI-free, `drCanAct_`,
`getDeptRequestDetail`), INV-196 + the QA operator-state entry (`saveQaMembers`,
`qaCanReviewEmail_`), INV-134 (six sinks + the derived message), the T2 /
Coach-button / Spanish / Dept Requests / business-hours / Time Clock KDDs, a
new Common Gotcha (the two measured layout lessons), the manager-gated list
gotcha, the 2026-09-10 Operator State entry, the running totals
785 / 113 / 102 / 310 + the harness-hazard wording, scenarios
S26/S68/S74/S80/S90/S93/S101 and the new S105, and two README lines. The
pure harness was re-run after the doc edits (785 / 0) because its F7 and
VIS-COVER pins read CLAUDE.md. Pick up with `/reflect` to close cycle 19 —
the four operator blocks' self-reported nets are the inputs. The N4
scheduled trigger and the chip's schedule/PTO gating are logged follow-ons,
not open work.
Earlier state (still true): all four audit batches are implemented, bite-checked and pushed to
`claude/broad-scan-fw462g` (blocks at `.cycle/blocks/19-batch1-2-*` and
`19-batch3-4-*`), and `/sync-docs` has now applied every documentation update
they owed. Nothing is half-done and no finding from the plan is outstanding.
Pick up with `/reflect` to close cycle 19. The single `clasp push -f` + New
version owed for PRs #230/#232/#233 now also carries all four batches; after
deploying, open Manage → Admin → System to learn whether MAIL_BCC_ALL is
actually set on this deployment — nothing in the container can read a live
Script Property, so that one look is the only way to settle it.

`/broad-implement Batch 0` was invoked on 2026-09-11 (post-plan) and found
NOTHING to implement: Batch 0 is the operator batch, "no code" by its own
heading, and none of 0a–0f can run from the container (no clasp, no Apps
Script auth, no Google account). Every precondition was VERIFIED on the branch
instead — #238 merged, the accommodation in Tests.js, triggers #20/#21 in
`installAutomationTriggers`, `reportBreakPairingChanges()`, `mailBccStatus_`,
the dev-setup doc — and both Node harnesses are green on HEAD (797 / 113). The
record is `.cycle/blocks/19-batch0-operator-broad-implement.md`. Do NOT re-run
Batch 0 as a code batch; the operator does it, then `/broad-implement P`.

Trigger-quota fix (2026-09-11, after the operator reported 312/312 and then
`This script has too many triggers` from `installAutomationTriggers()`): landed
on the branch as 114a16e + the docs commit; block at
`.cycle/blocks/19-trigger-quota-broad-implement.md`. MERGED as PR #239; the
operator's `runAllTests()` → 315/315 is CONFIRMED (2026-09-11); the one
`installAutomationTriggers()` re-run (restores the missing accrual trigger) is
the piece still awaiting the operator's word. The
one logged follow-on worth doing next: the Admin → System findings read
`e.error` where the stamp writes `message` (every stamped automation failure
renders "unknown error").
