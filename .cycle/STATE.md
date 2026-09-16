# Cycle State

## Current
Cycle: 19 — OPEN (the /broad-scan of 2026-09-09 opened it; cycle 18's block
moved to HISTORY.md at that point, per the close-out procedure). The
between-cycles operator work that preceded it is closed and reflected as
`19pre` (net +12; `.cycle/blocks/19pre-a-reflect.md`).
Phase: **IMPLEMENTATION COMPLETE AND MERGED — DEPLOY PENDING (2026-09-16).** Everything through PR #254 (866ffdc) is on `main` and the branch is fully merged into it. **SIX rounds are now stacked on ONE undeployed Apps Script project** (#251 the `perDay` accrual fix · #252 the FORMS/QA fixtures · #253 SP/SP2/PTO · OOP-A · OOP-B + ELIG + the KB-store move · #254's doc sync). The operator did the sheet-side setup on 2026-09-16 — the `OopPricing` and `LocationAcceptance` tabs exist, the warehouse rows carry real street addresses, and `OOP_SS_ID` / `TEST_OOP_SS_ID` are deleted — and will run the diagnostics + `clasp push -f` + a New-version deploy on 2026-09-17. **Read the consolidated post-deploy checklist in "Where I left off" rather than assembling it from the Pending list: six rounds each left their own "after the push" line, in six different places.** Preceding: **DEPLOYED AND VALIDATED 2026-09-14** — PR #245 merged (bd4fc8c), pushed to Apps Script, and the editor suite run in TWO HALVES on the real runtime: `runAllTestsPartA` **209/209** (`Expected: 209 registrations (118 smoke · 91 integration-A)`, 8.4 min) and `runAllTestsPartB` **107/107** (`Expected: 107 registrations (107 integration-B)`, 14.0 min) — 316 total, 0 failed, 0 skipped, matching the derived registration count exactly. **Part B's 107 is the discriminator that proves the deployment is CURRENT** (the pre-push suite read 315; Batch Q's extra registration lives in shard B, so Part A alone could not tell). Together the two halves ARE `runAllTests` (the S1/S4 pin holds the shards disjoint and their union equal to the registration list), so **regression scenarios S1 AND S2 are PASSED on the fourteen-file server** — the F2 deploy gate is CLOSED, and the Medium new failure mode the 19-c reflection logged (the split's cross-file load class guarded by a MODEL of Apps Script rather than by Apps Script) is DISCHARGED for this deployment: the fourteen files do load as one global scope in the real runtime. **ONE FINDING FROM THE RUN, and it is live operator state:** the suite-environment block read `INSTANCE_LABEL: unset · INSTANCE_IS_PROD: unset → UNMARKED (treated as prod; runAllTests still allowed)` against the REAL stores, so the full integration suite ran on PRODUCTION with the blue-green guard inert — `TEST_` rows into the live payroll/audit/PHI stores (cleaned up in `finally`, and the log confirms `3 re-onboarded`), the TEST accounts visible on team surfaces for ~22 minutes, and ScriptLock contention against live punches from 2:39 to 3:10 PM. See the Pending list. Preceding: implement — **Batch F2 + the four F1 follow-on items DONE 2026-09-14** (`.cycle/blocks/19-F2-followons-broad-implement.md`; net 0 − 0 = 0, a move). **`web-app/Code.js` IS GONE** — 30,789 lines split into fourteen files (`00_config.js` first, then one per module in the numeric order `filePushOrder` declares). Move-only is PROVEN, not claimed: 1,204 top-level units reassembled byte-identically, each checked standalone with `node --check`, and `test/client/server-split-manifest.json` (generated from Code.js at tag `pre-f2-split`) is re-derived by the F2c pin on every run — same names, same bodies, same files. Pure harness 818 → 822 (move-only, duplicate-name, split shape, the bite.sh guard); DOM 113 unchanged; every derived count identical; page.html byte-identical. `'Code.js'` is now an ALIAS for the server in the harness, so the ~500 pins naming it were untouched. **THE PLAN IS FINISHED: 0 → P → S → Q → C → D1 → D2 → F1 → F2 are all done**; only its Deferred set remains, which is operator/feature decisions. **NOT PUSHED/PR'd, and the DEPLOY IS BLOCKING: push to DEV and run `runAllTests` in that editor BEFORE prod** (F2d) — S1/S2 are the one check this container cannot run. Preceding: implement — **Batch F1 DONE 2026-09-14** (`.cycle/blocks/19-F1-broad-implement.md`; net 0 − 0 = 0, a deliberate no-op batch). The harness owns `serverSource()`, derived from `web-app/.clasp.json`'s `filePushOrder` (now `["Code.js"]`, was empty); the 73 direct server reads in run.js, `extractRawFunction`/`extractConstObject`, the two hand-listed server scans and `counts.mjs`'s two derivations all resolve through it, so F2 can move 40,000 lines between files without touching a pin. CI's `node --check` is a glob. Pure harness 814 → 818 (byte-equality, the filePushOrder declaration incl. the dev example, load-order evaluation, and a ban on reading the server by filename); DOM 113 unchanged; `build.mjs` reproduces page.html with no diff. INV-202's acceptance criterion is enforced by a pin rather than asserted. NOT PUSHED/PR'd yet. **REMAINING: F2 only** (the Code.js split — L, ~2 days). Preceding: implement — **Batch D2 + the four D1 follow-on items DONE 2026-09-14** (`.cycle/blocks/19-followons-D2-broad-implement.md`; net 1 − 0 = 1). CLAUDE.md 4,873 → 836 lines and is now MAPS AND INDEXES only: the gotcha narratives are `docs/gotchas.md` (113 entries, verbatim), the module narratives `docs/modules.md`, the operator entries `docs/operator-state.md` (74, verbatim — the D1c compression D1 deferred), the Test Command narrative `docs/test-harness-log.md`; a one-sided 1,000-line ceiling pin keeps it that way. Three NEW index↔entries pins (MODULE-MAP, GOTCHA-INDEX, OPERATOR-INDEX) plus the ceiling: pure harness 810 → 814, DOM 113 unchanged, `counts.mjs --check` green, 14 mutations / 14 bites + one inverse. Follow-ons: INV-202/203 written into the library; `counts.mjs` now reports a red harness in ONE line instead of a 70k-character stack trace; C4's ban gained pattern (d), a plain restated total. NOT PUSHED/PR'd yet. Preceding: implement — Batch D1 DONE 2026-09-14 (`.cycle/blocks/19-batchD1-broad-implement.md`; net 0 − 0 = 0, a structural batch shipping no deployable code). CLAUDE.md 12,662 → 4,873 lines; the Cycle Workflow Config is `.cycle/config.md`, the Key Design Decisions are `docs/design-decisions.md` (137-link index kept), the dated rounds are `docs/operator-log.md`. Pure harness 808 → 810 (two NEW pins on the index↔anchors coupling the split created). Preceding: reflect — DONE 2026-09-14 (SECOND reflection of cycle 19, `.cycle/blocks/19-b-reflect.md`, net 1 − 1 = 0, covering the four post-reflect next-steps batches P/S/Q/C; metrics + estimates rows appended; INV-202/203 proposed). Batch C MERGED as PR #244 (2026-09-14, f10c2ae) — every next-steps batch through C is now on main. Preceding: implement — Batch C DONE 2026-09-14 (see "Where I left off"). Preceding: reflect — DONE 2026-09-11 (`.cycle/blocks/19-a-reflect.md`, net 8 − 0 = 8; metrics row appended; INV-198/199 written, INV-200..204 proposed). Cycle 19 is CLOSED in substance; its STATE block moves to HISTORY.md when the next `/broad-scan` opens cycle 20 (the close-out procedure). The follow-ons round MERGED as PR #237 (2026-09-11 17:10Z, merged by the operator); the operator then `clasp push`ed and ran `runAllTests` → 302/312, whose ten `Admin access required.` failures were `ADMIN_EMAILS` narrowed on the deployment (operator state, not the round — first failure #97 of 312, before the adminEmails test at #247) — the suite accommodation (setup appends / cleanup strips the test manager) MERGED as PR #238 and the re-run read 312/312. THEN the operator's `installAutomationTriggers()` threw `This script has too many triggers` — the trigger-quota fix (three same-slot dispatchers, 16 triggers for 24 handlers) MERGED as PR #239, Batch P of the next-steps plan MERGED as PR #240, and the operator's post-push `runAllTests()` read **315/315** (2026-09-11 — the documented expected count after #239; the three dispatcher gate tests only exist in #239's Tests.js and only pass against #239's Code.js, so both files are on the deployment). The branch `claude/broad-scan-fw462g` was DELETED on GitHub at the #240 merge — restart it from `origin/main` for the next batch. Preceding phase, for the record: the follow-ons round (retention tier + suggestion follow-ons) LANDED on the branch (5 commits, bite-checked) and `/sync-docs` applied its documentation the same day. Before it: the OPERATOR testing-notes round (see the section below; all four batches A–D done, and `/sync-docs` has applied every documentation update the four blocks owed, 2026-09-11). Before it: ALL FOUR batches of the audit's IMPLEMENTATION BATCH PLAN
  are DONE and committed, and `/sync-docs` has reconciled the documentation
  behind them. Nothing from the plan remains except its Deferred set, which is
  operator/feature decisions rather than defect work. The cycle is ready for
  `/reflect`.
Scope: broad
Test Command: manual
Estimates: **Batch OOP-C (the REAL OopPricing shape — operator headers supplied 2026-09-16 after the merge) — M (~4 h), recorded BEFORE the first edit.** Found by running their real header row through the live reader: the item-name column is discovered by header instead of assumed to be column A (theirs is HCPCS, the item is column C, so EVERY name search scored 0 and the quote line would have named a billing code), the search covers name AND code, and the picker offers ONE labelled Insert per priced column because the sheet carries three customer-facing totals (pick-up / shipped / tech delivery) and quoting the base to a shipping customer is a $150 shortfall on a commitment. Also closes a diagnostics gap: against this sheet it reported `missing: []` and read CLEAN while the lookup returned nothing. · **Batch OOP-B (OOP3 the composer price picker) — S–M (~3 h)** and **Batch ELIG (EL1/EL2) — REVISED L (~8 h) from M–L (~6 h)**, both recorded 2026-09-16 BEFORE the first edit. ELIG moved because the operator's real column values put the RADIUS form back into v1 (it is a third of their vocabulary, not an edge case) and revealed that eligibility has TWO answers per item — the column states the INSURANCE rule, and paying OOP lifts a STATE restriction but not a DISTANCE one. · **Batch OOP-A (OOP1 the ninth store read live · OOP2 the dual-surface lookup) — M (~5 h), recorded 2026-09-16 BEFORE the first edit** (a new store + resolver + fixture + Storage Health row + a deterministic reader mirroring searchInsurancePayors on BOTH the Reference tab and the Ctrl/⌘+K drawer). OOP-B S–M (~3 h) and ELIG M–L (~6 h) follow. · **Batch PTO (PTO1 manager-visible leave balance on the live-status card · PTO2 the same on the team calendar) — S (~2 h), recorded 2026-09-16 BEFORE the first edit** — **~1.5 h ACTUAL**. (The balance is ALREADY built per rep in getManagerDashboard; liveStatus just does not carry it, so this is a projection + render, not new data). · **Batch SP2 (SP4 voicemail duration gate + SP5 transcript snippet) — S (~2 h), recorded 2026-09-16 BEFORE the first edit** — **~1.5 h ACTUAL**. (The body is ALREADY fetched at list time, so both ride one parse of a string already in hand; the cost is the two pure parsers, the fail-open counts and their pins, not a new Gmail read). · **Batch SP (operator round 2026-09-16 — the Spanish resolve-count bug, the card fade, the chevron toggle) — S (~2 h), recorded 2026-09-16 BEFORE the first edit** (SP1 is the only defect: spanishResolve_ removes the DOM node without mutating the state the unclaimed count folds; SP2 and SP3 are polish riding the same partial) — **~1.5 h ACTUAL**. · **Batch T (prevention — the open-punch check) — M (~4 h) estimate vs ~2.5 h ACTUAL, recorded 2026-09-15 BEFORE the first edit** (a read-only daily scan for days with no usable clock-in/clock-out pair, riding a NEW count-neutral `runDailyChecks` dispatcher at 8am so the 9am health digest pushes it the same morning; window bounded by CONFIG.ADJUST_WINDOW_DAYS because a day older than that cannot be fixed in-app). · **Batch R (accrual resilience — the AuditLog ledger + top-up reconciliation) — M (~4–5 h) estimate vs ~3 h ACTUAL, recorded 2026-09-15 BEFORE the first edit** (proposed and approved in chat: top-up over a trailing window, ledger derived from the PtoAccrualCredit audit rows, never claws back, fails closed). · Batch D1 — M (~6 h) estimate vs **~3.5 h actual**, recorded BEFORE the first edit and carried into the implement block as the template requires (the first batch to do BOTH halves; Batch C's block shipped without them). `/reflect` owes the estimates.csv row for D1, D2, F1 AND F2 (F2 — L/~6 h estimate vs **~2.5 h actual**) (F1 — S–M/~3 h estimate vs **~1.5 h actual**) (D2 + D1 follow-ons — L/~7 h estimate vs **~3 h actual**, both lines carried into `.cycle/blocks/19-followons-D2-broad-implement.md`). ALL FOUR rows (P/S/Q/C) APPENDED to `.cycle/estimates.csv` on 2026-09-14 — the first calibration rows since cycle 17, ending a six-reflection gap; every batch ran 2–3.3x UNDER its estimate. Batch P — S (~2 h), recorded 2026-09-11 20:24Z BEFORE the first edit · Batch S — M (~4 h), recorded 2026-09-11 BEFORE the first edit · Batch Q — M (~5 h), recorded 2026-09-11 BEFORE the first edit · Batch C — S–M (~3 h), recorded 2026-09-14 15:10Z BEFORE the first edit · **Batch D2 + D1 follow-ons — L (~7 h), recorded 2026-09-14 17:05Z BEFORE the first edit** (D2 is M/~6 h in the plan; the four D1 follow-on items add ~1 h). · **Batch F1 — S–M (~3 h), recorded 2026-09-14 18:05Z BEFORE the first edit** (F1 is S/~2 h in the plan; INV-202 adds `counts. · **Batch F2 + the F1 follow-on items — L (~6 h), recorded 2026-09-14 18:40Z BEFORE the first edit** (the plan says L/~2 days incl. re-verification; the split is mechanical and script-driven here, and the four F1 follow-ons are small).mjs`'s two `Code.js` derivations to its scope).
  (P1's own rule, applied to itself; the plan's figure). The remaining
  batches, as estimated at planning time in `.cycle/blocks/19-next-steps-plan.md`:
  S — M (~4 h) · Q — M (~5 h) · C — S–M (~3 h) · D1 — M (~6 h) · D2 — M (~6 h)
  · F1 — S (~2 h) · F2 — L (~2 days).
Subsystem cycles since last Seams audit: 3 (cycle 18's F1–F5 round WAS the
  seams audit; cycle 19 is the first subsystem cycle after it — REFLECTED
  2026-09-11, `.cycle/blocks/19-a-reflect.md`, net 8 − 0 = 8; the counter
  moved 1 → 2 at that reflection; the 2026-09-14 SECOND reflection (19-b) did NOT
  increment it — it closes a batch set INSIDE cycle 19, not a new subsystem
  cycle, and counting one cycle twice would pull the every-4 seams cadence
  forward by a cycle it did not earn. Do not "correct" this to 3.)
Updated: 2026-09-16 (PR #254 merged — OOP-A/OOP-B/ELIG, the KB-store move and `/sync-docs`; the operator completed the sheet-side setup the same day and deferred the deploy to 2026-09-17. Earlier: Batch Q landed — 3ab7018 + 3afeea6 on `claude/adoring-einstein-b3vs6c`; earlier: Batch S — 84379ee; earlier: operator post-deploy confirmation: `runAllTests()` → 315/315 after PRs #239 + #240 merged; earlier the same day: Batch P landed — d111b10, merged as #240; the trigger-quota fix — 114a16e, merged as #239; the `ADMIN_EMAILS` suite accommodation — #238, 312/312 confirmed)

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
- STORE MOVE | web-app/{00_config,10_core,70_kb,Tests}.js, web-app/kb/script_kb.html, web-app/cn/script_callnotes.html, test/client/{run.js,dom/runDom.js,server-split-manifest.json}, CLAUDE.md, docs/operator-state.md, .cycle/config.md | `OopPricing` + `LocationAcceptance` are NAMED TABS in the KB store beside `InsurancePayors`, not a spreadsheet of their own. NOT the Intake store the operator asked about (PHI, and the app writes to it). `LocationAcceptance` replaced the `OOP_WAREHOUSES` property with NO seed and NO fallback — the seed's bare city names geocoded to city CENTRES, which is g114 inside the one verdict built to avoid it. City rows (POV/scooter delivery) are information only and never move a verdict. `oopSheet_` no longer takes `getSheets()[0]`, which in a shared spreadsheet would have read sheet 0 and rendered every row blank rather than throwing. Nine stores → eight. 848 pure / 121 DOM / 329 registrations; 12 mutations / 12 bites, after four pins were repaired for not biting.
- OOP-A/OOP-B/ELIG | web-app/{00_config,10_core,30_callnotes,70_kb,Tests}.js, web-app/cn/script_callnotes.html, web-app/kb/script_kb.html, test/client/{run.js,dom/runDom.js,server-split-manifest.json}, .cycle/config.md, CLAUDE.md | The OOP pricing feature, end to end. A NINTH store read LIVE (a cache is the staleness this design exists to remove — a rep collects on these numbers); the dual-surface lookup on the Reference landing AND the drawer; the composer price picker whose number is re-derived from the live sheet at SEND time and refused if the message no longer carries it; and area eligibility with TWO verdicts per item, because the sheet's column states the INSURANCE rule and paying out of pocket lifts a state limit but not a delivery radius. `kbGeocodeCached_` extracted from `kbMapDistances` so the radius check shares ONE coordinate cache; the privacy contract's pin now spans three functions and anchors on "ONE writer, only operator-owned addresses in" rather than one function's statement order. INV-208 + INV-209 written; S110 written (the feature had NO manual scenario). Harnesses 832→844 pure, 117→121 DOM, 323→327 editor registrations. 20 mutations / 20 bites. Block: `.cycle/blocks/20pre-OOP-broad-implement.md`.
- DEPLOY | web-app/* (Apps Script) | PR #245 pushed and VALIDATED on the real runtime — PartA 209/209 + PartB 107/107 = 316, 0 failed; S1/S2 passed on the fourteen-file server; the F2 gate is closed
- F2 + F1 follow-ons | web-app/*.js (Code.js split into 14), .clasp.json(+dev example), test/client/{harness.js,run.js,server-split-manifest.json}, test/visual/mock.js, scripts/bite.sh, CLAUDE.md, README.md, docs/{modules,design-decisions}.md, .cycle/config.md | the server split, proven move-only; 4 pins; the bite helper committed with its guard
- F1 | test/client/{harness.js,run.js,README.md}, scripts/counts.mjs, web-app/.clasp.json + .clasp.dev.json.example, .github/workflows/client-tests.yml | the server-source shim, derived from filePushOrder; 4 pins; INV-202 enforced
- D2 + D1 follow-ons | CLAUDE.md, README.md, .cycle/config.md, scripts/counts.mjs, test/client/run.js, test/client/README.md, docs/{gotchas,modules,operator-state,test-harness-log}.md | the doc split finished; three index pins + a size ceiling; INV-202/203 written; counts.mjs red-harness ergonomics; C4 pattern (d)
- (template sync) | .claude/commands/{broad-scan,cycle-init,reflect,setup-cycle}.md, CLAUDE.md | synced to claude-workflow-tools v1.33.0; `Client (QA views)` added to the Deploy Command map. Commit 53b1f44.
- F1 | web-app/Code.js, test/client/run.js | breakPairs_ pairs with independent cursors — a stray early LunchIn no longer un-pairs the whole day (the rep was being PAID for every real break). A1 pin gained its IN-direction cases.
- F6 | web-app/Code.js, test/client/run.js | punchAdjustDecideAll_ discards the cached punch index after a `resume` writes outside it; buildAdjustPunchIndex_ states the precondition a caller owes instead of a universal that is not true.
- F2 | web-app/Code.js, test/client/run.js, test/client/dom/runDom.js, test/visual/mock.js | getMyPendingTasks tells a deliberately-unset store from a failed read (`notConfigured[]`), so the warn line can clear, the block can reach its clean-empty silence, and the 2-minute cache can actually be written.
- F4 | web-app/Code.js, test/client/run.js | every completing flow drops the rep's cached Needs-you list (training read, quiz pass, coaching ack, doc sign, call-back closed, both dept-request resolve paths).
- F3 | web-app/Code.js, web-app/cn/script_callnotes.html, test/client/run.js, test/visual/mock.js | MAIL_BCC_ALL — merged into EVERY email the app sends, including intake bodies and department emails — had NO surface anywhere. It now rides Storage Health via the read-only `mailBccStatus_` and surfaces as a System finding + an inventory line: unset is an ok fact, set-and-internal is a standing warn naming the address, off-domain is blocking. Reports, never enforces.
- F5 | web-app/Code.js, test/client/run.js | qaOptionIsNumeric_ asks `Number()` like its consumers do, so `"4."` / `"1e0"` / `"0x5"` can no longer be a QA dropdown option and fold into the scale averages that drive coverage, calibration and exemption eligibility.
- C1/C2 | scripts/counts.mjs (NEW), CLAUDE.md, README.md | every number the docs carry is DERIVED from the artefact that defines it, and stated ONCE in a generated block between COUNTS:BEGIN/END. Harness totals come from an actual run (a static count cannot equal either — loops), and a harness reporting failures refuses to yield a total.
- C3 | CLAUDE.md | the prose sweep: "expect **N**", "797 → 798" and "the Nth admin endpoint" now cite the block or the command, across the invariant library, the config narrative and the 53 dated operator entries. It CAUGHT two live drifts on its first run — a KDD saying 43 admin endpoints where the code enforces 50, and 315 editor registrations where Batch Q had made it 316.
- C4 | test/client/run.js, .github/workflows/client-tests.yml | four pins (block == derivation; a derived ban on a second copy in prose; --check exits on the drift AND missing branches; CI runs --check). F7's INV-136 assertion now consumes the same derivation. 13 mutations / 13 bites; three pins were corrected mid-batch after a first bite did not bite, and one was REPLACED for being structurally unable to fire.
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
- S1–S5 + FIX | web-app/Tests.js, web-app/Code.js (comment), test/client/run.js, CLAUDE.md, docs/deployment.md, README.md | the editor suite sharded into smoke + integration A/B (`runAllTestsPartA/B`, `runAllTests` still one execution), `_expectedTestCount_` + the derived `Expected: N registrations` line, `_suiteEnvCheck_` at the top of setup, three derived pins (8/8 bites), the runbook sentence; and the shadowed `sendCallNotesWeeklyDigests` gate test restored (the #239 dispatcher test had the same name). Commit 84379ee. Block: `.cycle/blocks/19-batchS-broad-implement.md`. Estimate M (4 h) vs Actual ~1.3 h.
- Q1–Q5 | web-app/Code.js, web-app/Tests.js, web-app/script_core.html, web-app/styles.html, web-app/cn/script_callnotes.html, web-app/kb/script_kb.html, test/client/run.js, test/visual/mock.js | the Script Property SIZE guard: `propSetBounded_` is the ONE writer for every JSON-blob property (14 operator blobs REFUSE by name with nothing written; 6 auto-managed ones DEGRADE through a named shrinker and CLEAR rather than leave a stale value; 9 scalar writers allowlisted BY NAME with a reason each), `utf8Len_` counts the BYTES the platform caps in, every Admin editor + the Reference synonyms modal show the serialized budget through ONE shared builder (`propBudgetHtml_` + `.prop-budget` in the shared stylesheet — the KB modal had its own tone rule for one commit before it was folded in), Storage Health carries a Script Properties line (ok FACT while comfortable — INV-186), and BOTH DeptRequests resolve paths use the bounded `drFindRowByReqId_` instead of reading the whole PHI-bearing tab per click. Five pins (Q-1/Q-1b/Q-2/Q-3/Q-5), 9 mutations / 8 bites + 1 documented equivalent mutant, an editor-suite over-size case (316 registrations). Commits 3ab7018 + 3afeea6. Block: `.cycle/blocks/19-batchQ-broad-implement.md`. Estimate M (5 h) vs Actual ~2.5 h.
- P2 | test/client/run.js, web-app/styles_design_tokens.html, web-app/tc/script_clock.html, CLAUDE.md | TW-B's ratchet half retired (ban + FROZEN + canvas rule kept); `--warn-glow` beside `--accent-glow` in the two base blocks only; the ribbon's three fallbacks ride the glow tokens under their unchanged color-mix lines — clock-light-wide + clock-dark-wide re-shot BYTE-IDENTICAL; INV-200 written; new pin P2; 4/4 bites. Commit d111b10.

## Pending / not yet done
- **OPERATOR (2026-09-17): the deploy, and the ONE ordered walk that discharges six
  rounds' worth of scattered "after the push" lines below.** Every item further down
  this list that begins "after the push" is covered by this walk; do this instead of
  reading them separately. See "Where I left off" for the ordered version.
- **OPERATOR (2026-09-15, Batch T): after the push, RE-RUN `installAutomationTriggers`.** `sendCallNotesUrgentDigest` moved into the new `runDailyChecks` dispatcher, so until the installer runs, `runDailyChecks` does not exist and the open-punch scan never fires. The reported count should be UNCHANGED. Then walk S109 and S97 after the first 8am scan. `.cycle/blocks/19-T-open-punch-prevention-broad-implement.md`; net 1 − 0 = 1; registrations 320 → **322**.
- **OPERATOR (2026-09-15, Batch R): push the accrual reconciliation and walk S108 + S97.** `.cycle/blocks/19-R-accrual-resilience-broad-implement.md`; net 1 − 0 = 1. Registrations 319 → **320**. After the first 18:00 credit run, August should TOP UP on its own for Anne (15.82 h) and Margie — no column-R rewind needed. Julienne stays at zero until she has August punches, which is correct.
- **OPERATOR (2026-09-15): run `previewPtoAccruals('2026-08')` after the push.** The 2026-09-01 run credited ZERO to all three PH reps (PH0001/2/3) — two with incomplete days (2 and 4), one with none — while the Timesheet now shows complete days assembled from `ADJ-` rows. Working hypothesis: the missing-punch adjustments were approved AFTER the 6pm Sep 1 credit, so the days were genuinely open at the time and the stamp then closed the month. The inspection confirms or refutes it; the AuditLog rows for those approvals (action = the punch type, column H `TRUE`, notes `approved adjustment request…`) carry the timestamps that settle it.
- **OPERATOR (new, 2026-09-14): deploy the `previewPtoAccruals` batch.** `clasp push -f` + a New version. Two things move with it: the editor suite is now **318** registrations (Part A 209 + Part B **109**), and the PTO accrual audit rows gain a reason clause. Then run `previewPtoAccruals` from the editor (regression scenario S107) against the real roster — that is the first real answer to "does the accrual tally correctly", and the rep whose 2026-08 row read `hoursWorked=0` is the one to look at.
- **OPERATOR (new): the 2026-08 zero row is still un-recovered.** The preview will now say WHICH of the three causes it was. If the rep did work that month, fix the cause, then set their column R back to `2026-07` and let the daily job re-credit; column I is the balance of record and the credit is a delta, so it composes.
- OPERATOR: set `INSTANCE_IS_PROD=true` on prod (the 2026-09-14 run proved it unset — the full suite ran against live payroll with the guard inert). Setting it makes every full-suite entry point refuse on prod, so stand up the dev instance in the same pass.
- OPERATOR: confirm the New version was cut, and that the editor lists fourteen server files with no `Code.js`.
- (DONE 2026-09-14) BATCH D1 of the next-steps plan — `.cycle/blocks/19-batchD1-broad-implement.md`;
  net 0 − 0 = 0 (structural; ships no deployable code). Estimate M (6 h) vs Actual ~3.5 h.
  On branch `claude/adoring-einstein-b3vs6c` (0e5b688, 9edcdef, 5236f5f, eca9455 + the inventory
  line), NOT yet merged. D1c's entry compression is DEFERRED TO D2 on purpose — see
  "Where I left off". NEXT in the plan: D2, then F1 (whose scope must grow `counts.mjs`
  per INV-202), then F2.
- (DONE 2026-09-11) BATCH Q of the next-steps plan — `.cycle/blocks/19-batchQ-broad-implement.md`;
  net 0 − 0 = 0, PREVENTIVE by construction (the plan classified it as the one latent DEFECT, and a
  latent defect has by definition not fired). Estimate M (5 h) vs Actual ~2.5 h. On branch
  `claude/adoring-einstein-b3vs6c` (3ab7018 + 3afeea6), NOT yet merged.
  Batches P, S, Q and C are ALL MERGED to main as of 2026-09-14 (#240, #242/#243, #244).
  NEXT in the plan: D1 (CLAUDE.md structural moves) — but read INV-202 in
  `19-b-reflect.md` first: F1's scope must grow `scripts/counts.mjs` before F2 runs.
- (DONE 2026-09-11) BATCH S of the next-steps plan — `.cycle/blocks/19-batchS-broad-implement.md`;
  net 1 − 0 = 1 (the shadowed gate test); Estimate M (4 h) vs Actual ~1.3 h. On branch
  `claude/adoring-einstein-b3vs6c` (84379ee), NOT yet merged. The "full on dev nightly" half of
  its runbook sentence becomes TRUE only once the operator's Batch 0f (the DEV instance) exists.
- (DONE 2026-09-11) BATCH P of the next-steps plan — `.cycle/blocks/19-batchP-broad-implement.md`;
  net 0 − 0 = 0 (both items defensive/structural by design); Estimate S (2 h) vs Actual ~0.6 h.
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

### Operator testing round 2026-09-16 — SP + SP2 + PTO DONE, THREE remain
**Batch PTO (PTO1 live-status card · PTO2 calendar off-chip) is IMPLEMENTED** —
`.cycle/blocks/20pre-PTO-broad-implement.md`, net 2 − 0 = 2, 4 mutations / 4 bites,
pure 830 unchanged · DOM 115 → 116. NOT PUSHED TO APPS SCRIPT.
Carry forward: (a) **g33 is already held tighter than planned** — `getTeammateStatus`
has a strict four-key allow-list pin (`activeNotIn|isSelf|name|status`), so a balance
leaked there turns the harness red with no new pin. (b) Three defects the pins caught
and reading did not: a banned `var(--muted-2, …)` fallback on a DEFINED token (g57);
the shared helper first declared INSIDE `renderManagerView` where the calendar renderer
could not see it; and the DOM pin asserting against three SKELETON `.emp-card`s because
`enterTool('timeClock','manager')` never reaches the manager landing — it is the MANAGE
tool's `manage` tab. (c) `sickLeave` now rides the projection UNUSED (g04 shape) —
deliberate while sick leave is dormant, but it is a declared-and-unread field.
**OOP-A, OOP-B and ELIG remain.**

**Batch SP2 (SP4 voicemail duration gate · SP5 transcript snippet) is IMPLEMENTED** —
`.cycle/blocks/20pre-SP2-broad-implement.md`, net 2 − 0 = 2, 7 mutations / 7 bites,
pure 827 → 830 · DOM 114 → 115. NOT PUSHED TO APPS SCRIPT.
Three things to carry forward: (a) **auto-assign inherits the gate** — INV-31 and S105
both say voicemails are deliberately included, and auto-assign distributes whatever
`getSpanishInboxPending` returns, so a suppressed hang-up is no longer assignable
(right, but a behaviour change, and S105's setup now needs a voicemail at or above the
threshold). (b) The pin caught a REAL regex defect before it shipped: a colon-only
trailing lookahead let `00:00:00:01` match `00:00:0` → 0 seconds → SUPPRESSED, the one
direction the feature must never fail in. (c) **`SPANISH_VM_MIN_SECONDS` is a new
operator Script Property documented NOWHERE** — `/sync-docs` owes the operator-state
entry plus its CLAUDE.md inventory line (the OPERATOR-INDEX pin needs both halves),
an INV-31 amendment, and the S105 setup fix.

**Batch SP (SP1 · SP2 · SP3) is IMPLEMENTED** — `.cycle/blocks/20pre-SP-broad-implement.md`,
net 2 − 0 = 2, 5 mutations / 5 bites, pure 827 · DOM 113 → 114. NOT PUSHED TO APPS SCRIPT:
it is client-only and inert until `clasp push -f` + a New version deployment.
Two things worth carrying forward from it: `.sp-task.is-busy` had been DEAD CSS since
2026-08-24 (written for this action, applied only to the auto-assign BUTTON), and
`scripts/bite.sh` drives the PURE harness only — DOM pins must be bitten by hand.
**PTO, OOP-A, OOP-B and ELIG remain.** The two operator decisions of 2026-09-16 are
answered and folded into the plan: a quoted OOP price is a COMMITMENT, and the sheet is
its own spreadsheet — which together moved OOP1 from a CSV upload to a NINTH STORE read
LIVE (`OOP_SS_ID`, no fallback), because a price collected on cannot be served from a
copy that lags its source.

A `/broad-implement`-shaped plan for all five is in
`.cycle/blocks/20pre-operator-2026-09-16-plan.md`. Findings are SP1–SP3, PTO1–PTO2,
OOP1–OOP3, EL1–EL2 in five batches (SP · PTO · OOP-A · OOP-B · ELIG). Facts
established by reading the code this session, so the next session need not re-derive:

- **SP1 — the Spanish unclaimed count stalls after "Mark resolved". A REAL BUG, root-caused.**
  `spanishResolve_` (`web-app/metrics/script_metrics.html:2593`) ends in `card.remove()`,
  a raw DOM removal. The count comes from `spanishUnclaimedCount_()` (`:2040`), which
  reads `SPANISH_STATE.pendingRes.pending` — resolve never touches it, and never calls
  `spanishRefreshAutoAssign_()` (which only runs at the tail of `spanishRenderList_()`,
  `:2342`). The sibling `spanishClaimRpc_` (`:2520`) does it correctly via
  `spanishSetClaimLocal_`. SECOND symptom: `cacheHalf` stores the SAME object reference,
  so the SWR cache still holds the resolved item — leave the tab and the card returns.
  This is g67. Fix shape: `spanishRemovePendingLocal_(tid)` mirroring
  `spanishSetClaimLocal_`, then re-render; the count follows for free.
- **SP2 — card fade on resolve.** Falls out of SP1 (animate the outgoing node, re-render
  on `animationend`). Must honour `prefers-reduced-motion`, and must not become the only
  signal — the toast already carries the outcome.
- **SP3 — Expand/Collapse → chevron.** `chevronDown`/`chevronUp` already exist in
  `script_icons.html`. TRAP: the words are currently the button's ACCESSIBLE NAME, so an
  icon-only button needs an `aria-label`; `aria-expanded`/`aria-controls` (INV-174) stay in
  step. The button was made a real toggle on 2026-09-10 after a version that removed
  itself. `.sp-more` is shared with the Mark-resolved button — g70, so scope any styling.
- **PTO1/PTO2 — a manager CAN'T see a rep's PTO balance except on a pending request.**
  Confirmed, not a UI oversight: `getManagerDashboard` builds `annualLeave`/`sickLeave`
  per rep (`web-app/20_timeclock.js:1580`), but the ONLY manager render is the
  `12 → 11 d` projection chip on a pending time-off card
  (`web-app/tc/script_manager.html:791`) plus the negative-balance approve warning
  (`:1022`). The `liveStatus` projection (`20_timeclock.js:1620`) deliberately does NOT
  carry the balance, so PTO1 adds `annualLeave`/`sickLeave`/`ptoEnabled` to it.
  TWO CONSTRAINTS: gate the display on `EMP.PTO_ENABLED` (the cycle-8 bug showed a
  contractor a projection), and never add it to `getTeammateStatus` (g33 — low-privilege).
- **OOP1–OOP3 — REVISED 2026-09-16: a NINTH store, read LIVE.** The operator
  confirmed a quoted price is a COMMITMENT (payment is processed on the call) and
  that the sheet is its own spreadsheet in the same Workspace. Those two answers
  rule out the CSV-upload pattern below: a price that is collected on cannot be
  served from a copy that lags its source. So OOP1 is `OOP_SS_ID` + `getOopSS_`
  with NO fallback (the `getQaSS_` posture), a `_withTestOop_` fixture that
  actually assigns its override (g119 — the new `fixtures:` pin will catch a
  read-only branch), a storage-map row, and a SHORT cache. The send writes an
  audit row naming the item and exact price quoted, recipient DOMAIN only (g36).
  Kept for reference, because the reader and its failure posture still apply:
  `KB_DATA_TABLES`
  (`web-app/00_config.js:1648`) is the allowlist-gated CSV → named KB tab pattern built
  for the insurance lookup; its own comment says adding an entry is "a deliberate code
  change beside the reader that consumes it". `kbImportDataTable` (`70_kb.js:765`) is
  admin-gated, DRY-RUN BY DEFAULT and sets plain-text format before the write;
  `kbDataTableSummary_` (`:726`) is the per-spec validation hook. Mirror
  `searchInsurancePayors` (`:658`) for the reader and the DUAL surface — the insurance
  lookup renders in both the Reference tab and the Ctrl/⌘+K drawer (the `-d` id suffix,
  `web-app/kb/script_kb.html:2430`). The email half is the open design question:
  `CN_EMAIL_TEMPLATES` bodies carry only a `{name}` token (`00_config.js:266`).
- **EL1/EL2 — the Reference MAP ALREADY EXISTS.** The ` ```map ` block shipped
  2026-08-13 (Tier A, no billing): `wh| Name: Address` lines, a "Find nearest" ZIP box,
  straight-line distances via `kbMapDistances` (`70_kb.js:1947` — geocode + haversine +
  a hash-keyed coordinate cache), a per-row Google Maps link and a lazy KEYLESS
  `?output=embed` iframe (`kb/script_kb.html:1204`). If it looks missing, no article
  uses the block. The NEW work is item eligibility, and the operator has agreed to add
  an **"Area Eligibility" column to the OOP sheet**, which supplies the dataset that was
  the blocker. g41 governs it: an operator-maintained column a DECISION ENGINE reads
  needs a shape check and a CHOSEN fail direction — unparseable/blank must read UNKNOWN,
  never "eligible".

- Drive access finding may be a FALSE POSITIVE (operator report 2026-09-11, mid Batch Q) —
  `driveAccessStatus_` introspects the RUNNING EXECUTION's OAuth token. If the runtime mints
  it with only the scopes that execution exercises, a Storage Health run that never touches
  DriveApp reports "not granted" while Drive works. Fits this deployment (`KB_IMAGES_FOLDER_ID`
  unset → the probe's own getFolderById is skipped; the embed scan touches Drive only when the
  KB store is reachable AND has embeds). The 5-minute cache is NOT the cause (a not-granted
  round is never cached). Decisive test + the suggested fix (attempt a read-only DriveApp call
  and classify through `driveScopeError_`, still side-effect free so DRV-3 holds) are in
  `.cycle/blocks/19-batchQ-broad-implement.md`. Also fits: Google's granular consent screen lets
  a user untick Drive, leaving a grant that exists but is short — no NEW prompt appears; revoking
  at myaccount.google.com → Third-party apps forces a fresh screen.
- `getDeptRequests` still reads the whole DeptRequests tab (it must — it lists). Noted so Q5 is
  not read as "the DeptRequests store is fully bounded".
- (CLOSED 2026-09-11, BP) `reportBreakPairingChanges()` exists; the doctor REPORTS the protected multi-break days whose greedy pairing drops a stamp. RESIDUAL: the one-leave / two-return shape (outs [12:00], ins [11:00, 12:30]) is a classic DUPLICATE LunchIn group, and the collapse keeps the LAST APPENDED row (INV-155's rule) — which is the stray 11:00 if it was appended later. The doctor cannot tell which return is real; Day Edit is the fix, and the `unpaired` report deliberately does not double-report count-disagreeing days.
- (FOLDED INTO BATCH Q5 of the next-steps plan) web-app/Code.js (resolveDeptRequest, markDeptRequestResolved_) — still whole-tab reads by RequestId; DR bounded only the detail read (the per-click one). The same `drFindRowByReqId_` fits both; not done here (scope).
- web-app/Code.js (resolveDeptRequest) — F4 residual: another member of the same receiving desk keeps a resolved request in their incoming list for ≤120s. Closing it needs a generation salt (too blunt — it would evict every rep's entry on every resolve).
- web-app/Code.js (submitCallNote) — deliberately NOT hooked into F4: the notes row derives from getMyMetrics' own 5-minute cache, so busting the pending-tasks key alone cannot change the answer.
- (CLOSED 2026-09-11, TW then Batch P2) both Stage-3 tripwire promotions are written (TW-A, TW-B); P2 retired TW-B's ratchet half and moved the clock ribbon's rgba fallback pairs onto `--accent-glow` / `--warn-glow` (pinned, byte-identical render). RESIDUAL, now unguarded by any ratchet and deliberately so: `styles.html`'s one `rgba(15,23,42,.04)` box-shadow tint — not a token-equal literal; a `--shadow-tint` token if it ever earns a second consumer.
- web-app/Code.js (autoAssignSpanishThreadsScheduled) — the business-hours gate covers hours, weekdays and US holidays; it does NOT consult a member's approved PTO, so with the flag ON a member on leave can be handed claims (the button has the same limit). A PTO-aware picker is an operator decision (the same class as the presence chip's schedule/PTO gating).
- web-app/Code.js (mailMergeBcc_) — `mailBccStatus_` REPORTS an off-domain BCC; it does not block one. Making it enforce is a deliberate policy change and an operator decision, not a defect.
- The audit's Deferred set is untouched EXCEPT the diagnostics retention tier (now RT); the rest remain operator/feature decisions: agent-visible QA reviews, the blocked external form route, a per-rep working-days source, a manager pay-statement export. Also deliberately NOT implemented in the follow-ons round, as operator decisions: presence-chip schedule/PTO gating, BLOCKING an off-domain `MAIL_BCC_ALL`, the `getTeammateStatus` full-Timesheet read, the `dept_req_v1` cache-key bump, the quiz editor's "+ Question" per-block append.

## Decisions made (so the next session doesn't re-litigate)
- **RESTART `claude/adoring-einstein-b3vs6c` FROM `origin/main` before the next batch.**
  PR #254 is MERGED and the branch carries nothing beyond it (`git log
  origin/main..claude/adoring-einstein-b3vs6c` is empty). A merged PR cannot track new
  work, so follow-up is a FRESH change on the same branch name:
  `git fetch origin main && git checkout -B claude/adoring-einstein-b3vs6c origin/main`.
  Never stack new commits on the already-merged history — the same thing happened at
  the #240 merge, and that branch had to be restarted too.
- **The OOP/ELIG tables live in the KB store, and the test for a future reference table
  is the reason list, not the property count** (2026-09-16) — PHI-free by policy, the
  app never writes to the tab, operator-maintained, read through a NAMED tab, beside
  `InsurancePayors`. The Intake store was rejected because it is PHI and the app writes
  to it. Full reasoning in `docs/design-decisions.md`; do not re-derive it from "one
  fewer Script Property", which was never the argument.
- **`LocationAcceptance` city rows are INFORMATION ONLY and never change a verdict**
  (operator decision, 2026-09-16). The operator also declined a county import from a
  Google My Maps KML the same day: the map was one person's visualisation choice, not a
  source of truth, and **the sheet is the truth.** If that comes back, the answer is
  still not polygons — the geocoder returns the county in
  `administrative_area_level_2`, so a county list is an exact lookup with no geometry.
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
**Nothing is in flight.** Tree clean, branch fully merged into `main` (PR #254,
`866ffdc`), all three harnesses green, `lint-server` clean, `counts --check` green.

**The next session's first move depends on what the operator says:**

### If the deploy has NOT happened yet
Nothing to build. The deploy is the gate, and it is the operator's step.

### The post-deploy walk — ORDERED, and it discharges six rounds at once
The Pending list carries an "after the push" line from each of six rounds, written
on six different days. Do them in THIS order instead; the ordering matters twice,
noted inline.

1. `clasp push -f`, then **Deploy → Manage deployments → Edit → New version**. The
   Web App URL serves the OLD code until that second step.
2. **Confirm the editor lists FOURTEEN server files and no `Code.js`** — the Batch F2
   split. If `Code.js` is still there, the push did not take and everything below is
   measuring the wrong deployment.
3. **Re-run `installAutomationTriggers()`** (Batch T). `sendCallNotesUrgentDigest`
   moved into the `runDailyChecks` dispatcher, so **until the installer runs,
   `runDailyChecks` does not exist and the 8am open-punch scan never fires.** The
   reported trigger count should be UNCHANGED — a changed count is the finding.
4. **`runSmokeTests`** on prod. Read the `Expected: N registrations` line OFF THE RUN,
   never off a doc (the registration count moved three times this round). A run that
   records fewer than expected prints `⚠ Recorded X of N`.
5. **Manage → Admin → the OOP pricing diagnostics** (the operator's deferred item 4).
   This is the highest-value single read of the whole walk: it lists every
   `Area Eligibility` value the parser could not read, BY ITEM, plus the warehouse
   registry and any addressless or unreadable `LocationAcceptance` row. An unreadable
   value renders "cannot tell" to a rep, which looks like caution rather than a typo —
   this panel is the only place the difference is visible. **Check the warehouse
   addresses geocoded to real sites, not city centres** (g122).
6. **`previewPtoAccruals('2026-08')`** (S107). Still un-recovered: the 2026-09-01 run
   credited ZERO to all three PH reps. The preview now NAMES which of the three causes
   it was. If the rep did work that month, fix the cause, set column R back to
   `2026-07`, and let the daily job re-credit — column I is the balance of record and
   the credit is a delta, so it composes.
7. **Walk S110** (OOP pricing end to end — the lookup, the four send outcomes, both
   eligibility verdicts, both distance bands, both tabs renamed aside). Then **S108**
   (accrual reconciliation), **S109** (open-punch scan) and **S97** — but S109 and S97
   only tell you anything **after the first 8am scan has run**, so they are a
   next-morning check, not a same-session one.
8. **Set `INSTANCE_IS_PROD=true`** and stand up the dev instance in the same pass. The
   2026-09-14 run proved it unset — the full integration suite ran against live
   payroll with the blue-green guard inert. Setting it makes every full-suite entry
   point refuse on prod, which is why the dev instance has to exist first.

### Once the deploy is confirmed
Cycle 19 is closed in substance and this block moves to `.cycle/HISTORY.md` when the
next `/broad-scan` opens cycle 20 (the close-out procedure). **`/reflect` is owed
before that** and has a real backlog: the estimates.csv rows for D1, D2, F1, F2 and
every 2026-09-15/16 batch (R, T, SP, SP2, PTO, OOP-A, OOP-B, ELIG) — the
`Estimates:` line above carries estimate AND actual for each, which is exactly the
input `/reflect` has skipped for six consecutive reflections.

**Two follow-ons that are real work, not bookkeeping** (both in
`.cycle/blocks/20pre-OOP-broad-implement.md`): the geocode QUOTA is shared between the
eligibility box and the ` ```map ` block's "Find nearest" with no cap and no honest
exhausted-message — a rep leaning on one degrades the other to "could not find that
location"; and the `Area Eligibility` RULE is not shown in the price lookup itself,
only in the dedicated check, so an item's raw eligibility string renders unparsed
where rendering the rule ("Texas only through insurance; anywhere out of pocket")
would answer the common case with no geocode at all.
