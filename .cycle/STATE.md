# Cycle State

## Current
Cycle: 19 — OPEN (the /broad-scan of 2026-09-09 opened it; cycle 18's block
moved to HISTORY.md at that point, per the close-out procedure). The
between-cycles operator work that preceded it is closed and reflected as
`19pre` (net +12; `.cycle/blocks/19pre-a-reflect.md`).
Phase: reflect — DONE 2026-09-11 (`.cycle/blocks/19-a-reflect.md`, net 8 − 0 = 8; metrics row appended; INV-198/199 written, INV-200..204 proposed). Cycle 19 is CLOSED in substance; its STATE block moves to HISTORY.md when the next `/broad-scan` opens cycle 20 (the close-out procedure). The follow-ons round MERGED as PR #237 (2026-09-11 17:10Z, merged by the operator); the operator then `clasp push`ed and ran `runAllTests` → 302/312, whose ten `Admin access required.` failures were `ADMIN_EMAILS` narrowed on the deployment (operator state, not the round — first failure #97 of 312, before the adminEmails test at #247) — the suite accommodation (setup appends / cleanup strips the test manager) is the post-merge follow-up; expect 312/312 on the re-run. Preceding phase, for the record: the follow-ons round (retention tier + suggestion follow-ons) LANDED on the branch (5 commits, bite-checked) and `/sync-docs` applied its documentation the same day. Before it: the OPERATOR testing-notes round (see the section below; all four batches A–D done, and `/sync-docs` has applied every documentation update the four blocks owed, 2026-09-11). Before it: ALL FOUR batches of the audit's IMPLEMENTATION BATCH PLAN
  are DONE and committed, and `/sync-docs` has reconciled the documentation
  behind them. Nothing from the plan remains except its Deferred set, which is
  operator/feature decisions rather than defect work. The cycle is ready for
  `/reflect`.
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 2 (cycle 18's F1–F5 round WAS the
  seams audit; cycle 19 is the first subsystem cycle after it — REFLECTED
  2026-09-11, `.cycle/blocks/19-a-reflect.md`, net 8 − 0 = 8; the counter
  moved 1 → 2 at that reflection)
Updated: 2026-09-11 (post-merge of #237: the `ADMIN_EMAILS` suite accommodation — `setupTestEnvironment` appends the test manager to a narrowed list, `cleanupTestData` strips it; the 302/312 post-push run explained; expect 312/312 on the re-run)

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

## Pending / not yet done
- Nothing from the IMPLEMENTATION BATCH PLAN. All four batches are landed,
  and their documentation is reconciled.
- The audit's own IMPLEMENTATION BATCH PLAN was produced in chat and is NOT
  on disk — it exists only in this session's transcript.
- `/reflect` has not been run; cycle 19 is still OPEN. Its per-batch nets are
  already derived strictly in the two blocks (Batches 1+2 net +1, Batches 3+4
  net 0), so the reflection has honest inputs to start from.
- The ONE deploy owed for PRs #230/#232/#233 now also carries all four
  batches AND these doc changes; nothing here reaches production without it.
- The operator testing-notes round (Batches A–D + this /sync-docs pass) rides
  that SAME deploy; post-deploy `runAllTests()` expects **312** (310 + the
  two follow-ons-round trigger-gate tests).
- The follow-ons round's DOCUMENTATION UPDATES (listed in
  `.cycle/blocks/19-followons-retention-broad-implement.md`) are owed to
  `/sync-docs` — CLAUDE.md still says "nineteen triggers" (it is twenty-one),
  INV-44's handler list lacks the two new handlers, the ViewUsage /
  ClientErrors operator-state entries still say "no retention tier", INV-176
  still calls the doctor gap "a logged follow-on", INV-31 (iii) still calls
  the scheduled trigger "a logged follow-on", the harness totals read
  785 / 113 / 102 / 310, and README's matrix count (99) has been stale since
  before this round (102 real).
- The round's branch is NOT yet in a PR (this invocation did not ask for
  one); `git push -u origin claude/broad-scan-fw462g` carries it.

## Open follow-on items
- (CLOSED 2026-09-11, BP) `reportBreakPairingChanges()` exists; the doctor REPORTS the protected multi-break days whose greedy pairing drops a stamp. RESIDUAL: the one-leave / two-return shape (outs [12:00], ins [11:00, 12:30]) is a classic DUPLICATE LunchIn group, and the collapse keeps the LAST APPENDED row (INV-155's rule) — which is the stray 11:00 if it was appended later. The doctor cannot tell which return is real; Day Edit is the fix, and the `unpaired` report deliberately does not double-report count-disagreeing days.
- web-app/Code.js (resolveDeptRequest, markDeptRequestResolved_) — still whole-tab reads by RequestId; DR bounded only the detail read (the per-click one). The same `drFindRowByReqId_` fits both; not done here (scope).
- web-app/Code.js (resolveDeptRequest) — F4 residual: another member of the same receiving desk keeps a resolved request in their incoming list for ≤120s. Closing it needs a generation salt (too blunt — it would evict every rep's entry on every resolve).
- web-app/Code.js (submitCallNote) — deliberately NOT hooked into F4: the notes row derives from getMyMetrics' own 5-minute cache, so busting the pending-tasks key alone cannot change the answer.
- (CLOSED 2026-09-11, TW) both Stage-3 tripwire promotions are written (TW-A, TW-B). RESIDUALS the TW-B ratchet records rather than fixes: the clock ribbon's two `rgba(15,138,82,…)` / `rgba(183,121,31,…)` colour-mix FALLBACK pairs duplicate `--accent` / `--warn` in rgb form (a `--accent-glow`-style token would retire them); `styles.html`'s one `rgba(15,23,42,.04)` box-shadow tint.
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
- DR bounded only the per-click detail read; the two resolve-path whole-tab reads are a logged follow-on, not silently widened into this batch.
- CORRECTION recorded in the 19-batch3-4 block: `robin@umsupply.com` read out of a live-DOM probe is MY fixture value in `test/visual/mock.js`, not evidence about the deployed Script Property. Nothing in the container can read live properties — whether `MAIL_BCC_ALL` is set is settled by opening Admin → System after the deploy.

## Where I left off
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
