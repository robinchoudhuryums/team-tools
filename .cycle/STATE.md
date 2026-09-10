# Cycle State

## Current
Cycle: 19 — OPEN (the /broad-scan of 2026-09-09 opened it; cycle 18's block
moved to HISTORY.md at that point, per the close-out procedure). The
between-cycles operator work that preceded it is closed and reflected as
`19pre` (net +12; `.cycle/blocks/19pre-a-reflect.md`).
Phase: implement — the OPERATOR testing-notes round (see the section below; Batches A and B of four are done). Before it: ALL FOUR batches of the audit's IMPLEMENTATION BATCH PLAN
  are DONE and committed, and `/sync-docs` has reconciled the documentation
  behind them. Nothing from the plan remains except its Deferred set, which is
  operator/feature decisions rather than defect work. The cycle is ready for
  `/reflect`.
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 1 (cycle 18's F1–F5 round WAS the
  seams audit; cycle 19 is the first subsystem cycle after it)
Updated: 2026-09-10

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
- Batch C: N4 manager-only "Auto-assign N unclaimed" over SPANISH_INBOX_MEMBERS
  (pure least-loaded picker, qaSamplePick_ precedent; a trigger may follow —
  keep the body reusable); N6 DR trailing `PatientTrx` written at send from
  `note.patientAndTrx`, collapsed card reads "<label> · <patient/TRX>", plus
  Expand/Collapse through a scoped `getDeptRequestDetail(requestId)` (sender OR
  manager OR toDept member — the resolveDeptRequest rule) resolving the stored
  NoteId to the sender's note reference fields; N8 Admin → Config "QA reviewers"
  chip editor (`saveQaMembers`, admin-gated → INV-136 count 49 → 50 + omnibus
  case + doc list) and widen `qaAssignRecording`'s assignee check to any
  `canSeeQa_` user.
- Batch D: N10 — per-rep per-day CacheService presence stamp (first/last seen)
  written inside the endpoints reps already hit; `getTeammateStatus` gains ONE
  additive boolean `activeNotIn` (INV-24 amendment: the boolean only, never the
  timestamps); the card renders a warn chip "active · not clocked in"; PTO days
  not checked in v1 (say so in the tooltip).

## Decisions made in that round (operator, 2026-09-10)
- N6: the Dept Requests store MAY carry the patient name & TRX (it stays inside
  the Workspace). The daily SLA reminder email stays label-only unless asked.
- N4: manager BUTTON first; the scheduled trigger may follow soon after.
- N3: legacy Dept Requests rows with a blank `ResolvedVia` are EXCLUDED from
  the timing stats and reported as "resolved before source tracking".
- N8 answer given: QA access = every manager + the `QA_MEMBERS` Script
  Property; the operator (a manager) already sees all four QA tabs.

## In progress (facts to carry forward — NOT judgments)
- Operator round: Batches A + B landed and pushed; Batches C + D unstarted.
  Both harnesses are green (781 pure / 110 DOM), the tree is committed on
  `claude/broad-scan-fw462g`; every change in A + B was bite-checked
  (6 + 8 mutations, all biting).
- Nothing else in flight. The four AUDIT batches were bite-checked too (20
  mutations / 20 bites across the two sessions).
- `/sync-docs` is DONE and applied (not merely proposed): all fourteen owed
  updates plus three drifts the four checks turned up on their own. The next
  concrete step is `/reflect` to close cycle 19.

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

## Open follow-on items
- web-app/Code.js — a `reportBreakPairingChanges()` twin of `reportMultiBreakDays()` would enumerate the historical days whose hours move under F1. Not written (out of scope); F1's shape is rarer than the multi-break one, and no existing report finds it.
- web-app/Code.js (tsDoctorScan_) — the sheet doctor's inverted-lunch test (`last LunchIn <= first LunchOut`) does not detect F1's shape, so the damaged data F1 now survives is still invisible to the doctor.
- web-app/Code.js (resolveDeptRequest) — F4 residual: another member of the same receiving desk keeps a resolved request in their incoming list for ≤120s. Closing it needs a generation salt (too blunt — it would evict every rep's entry on every resolve).
- web-app/Code.js (submitCallNote) — deliberately NOT hooked into F4: the notes row derives from getMyMetrics' own 5-minute cache, so busting the pending-tasks key alone cannot change the answer.
- test/client/run.js — the audit's two Stage-3 tripwire promotions are now cheap, because F5 and F7 each landed the instance to derive from: (a) a validator-vs-consumer WIDTH scan (a numeric guard must not be narrower than the parse its consumers run); (b) a colour-literal-vs-token scan for values duplicating a token the tokens partial already defines. Neither written — a rule with one instance is worth deriving, but it is its own batch.
- web-app/Code.js (mailMergeBcc_) — `mailBccStatus_` REPORTS an off-domain BCC; it does not block one. Making it enforce is a deliberate policy change and an operator decision, not a defect.
- The audit's Deferred set is untouched and remains operator/feature decisions: agent-visible QA reviews, the blocked external form route, a retention tier for `ViewUsage`/`ClientErrors`, a per-rep working-days source, a manager pay-statement export.

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
- CORRECTION recorded in the 19-batch3-4 block: `robin@umsupply.com` read out of a live-DOM probe is MY fixture value in `test/visual/mock.js`, not evidence about the deployed Script Property. Nothing in the container can read live properties — whether `MAIL_BCC_ALL` is set is settled by opening Admin → System after the deploy.

## Where I left off
Operator testing-notes round: Batches A (notes 1/5/7/9, a96fe16) and B
(notes 2/3, c525c89) are implemented, bite-checked, committed and pushed on
`claude/broad-scan-fw462g` (reset onto origin/main after PR #235 merged).
Pick up with Batch C (N4 auto-assign button, N6 DR PatientTrx + scoped
expand, N8 QA reviewers editor), then D (N10) — the shapes and the operator's
decisions are in the section above. `/sync-docs` is owed for BOTH batches'
documentation lists (in their blocks — B's includes the S74 rewrite and the
harness-hazard wording) and can wait for C/D.
Earlier state (still true): all four audit batches are implemented, bite-checked and pushed to
`claude/broad-scan-fw462g` (blocks at `.cycle/blocks/19-batch1-2-*` and
`19-batch3-4-*`), and `/sync-docs` has now applied every documentation update
they owed. Nothing is half-done and no finding from the plan is outstanding.
Pick up with `/reflect` to close cycle 19. The single `clasp push -f` + New
version owed for PRs #230/#232/#233 now also carries all four batches; after
deploying, open Manage → Admin → System to learn whether MAIL_BCC_ALL is
actually set on this deployment — nothing in the container can read a live
Script Property, so that one look is the only way to settle it.
