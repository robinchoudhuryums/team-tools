# Cycle State

## Current
Cycle: 19 — OPEN (the /broad-scan of 2026-09-09 opened it; cycle 18's block
moved to HISTORY.md at that point, per the close-out procedure). The
between-cycles operator work that preceded it is closed and reflected as
`19pre` (net +12; `.cycle/blocks/19pre-a-reflect.md`).
Phase: implement — Batches 1 and 2 of the audit's IMPLEMENTATION BATCH PLAN
  are DONE and committed; Batches 3 and 4 are not started.
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 1 (cycle 18's F1–F5 round WAS the
  seams audit; cycle 19 is the first subsystem cycle after it)
Updated: 2026-09-09

## In progress (facts to carry forward — NOT judgments)
- Nothing in flight. Both harnesses are green (774 pure / 108 DOM) and the
  tree is committed on `claude/broad-scan-fw462g`.
- The next concrete step is the operator's call: either `/broad-implement`
  Batch 3 (F3) and Batch 4 (F8/F7/F5/D1), or `/sync-docs` for the seven
  documentation updates the Batch 1+2 block lists.

## Completed this cycle
- (template sync) | .claude/commands/{broad-scan,cycle-init,reflect,setup-cycle}.md, CLAUDE.md | synced to claude-workflow-tools v1.33.0; `Client (QA views)` added to the Deploy Command map. Commit 53b1f44.
- F1 | web-app/Code.js, test/client/run.js | breakPairs_ pairs with independent cursors — a stray early LunchIn no longer un-pairs the whole day (the rep was being PAID for every real break). A1 pin gained its IN-direction cases.
- F6 | web-app/Code.js, test/client/run.js | punchAdjustDecideAll_ discards the cached punch index after a `resume` writes outside it; buildAdjustPunchIndex_ states the precondition a caller owes instead of a universal that is not true.
- F2 | web-app/Code.js, test/client/run.js, test/client/dom/runDom.js, test/visual/mock.js | getMyPendingTasks tells a deliberately-unset store from a failed read (`notConfigured[]`), so the warn line can clear, the block can reach its clean-empty silence, and the 2-minute cache can actually be written.
- F4 | web-app/Code.js, test/client/run.js | every completing flow drops the rep's cached Needs-you list (training read, quiz pass, coaching ack, doc sign, call-back closed, both dept-request resolve paths).

## Pending / not yet done
- Batch 3: F3.
- Batch 4: F8, F7, F5, D1.
- The audit's own IMPLEMENTATION BATCH PLAN was produced in chat and is NOT
  on disk — it exists only in this session's transcript.

## Open follow-on items
- web-app/Code.js — a `reportBreakPairingChanges()` twin of `reportMultiBreakDays()` would enumerate the historical days whose hours move under F1. Not written (out of scope); F1's shape is rarer than the multi-break one, and no existing report finds it.
- web-app/Code.js (tsDoctorScan_) — the sheet doctor's inverted-lunch test (`last LunchIn <= first LunchOut`) does not detect F1's shape, so the damaged data F1 now survives is still invisible to the doctor.
- web-app/Code.js (resolveDeptRequest) — F4 residual: another member of the same receiving desk keeps a resolved request in their incoming list for ≤120s. Closing it needs a generation salt (too blunt — it would evict every rep's entry on every resolve).
- web-app/Code.js (submitCallNote) — deliberately NOT hooked into F4: the notes row derives from getMyMetrics' own 5-minute cache, so busting the pending-tasks key alone cannot change the answer.
- CLAUDE.md — the visual-matrix count reads 101 while shoot.mjs runs 99; STATE.md's scenario list stopped at S103 while CLAUDE.md defines S104. Both noticed during the audit, unrelated to the fixes.
- Documentation: seven updates listed in `.cycle/blocks/19-batch1-2-broad-implement.md` (INV-176's "positional" wording, INV-129's amendment, the PR 6 Needs-you KDD, the C17-9 precondition, a new Common Gotchas entry for F4's class, the test counts, S95's in-direction case). `/sync-docs` is the vehicle.

## Decisions made (so the next session doesn't re-litigate)
- F1's pairing is GREEDY, not positional: each `out` takes the earliest `in` that can close it, so an unpairable `in` is dropped ALONE. Greedy is also the conservative reading (the shortest break that can be attributed).
- F6 DISCARDS the employee's cached index after a resume rather than patching the three stale keys — patching would require reasoning about which key a later request in the batch might read, and the read is rare enough that one extra Timesheet read is the cheaper correctness.
- F2 adds `notConfigured[]` rather than widening `unavailable`'s meaning, so the CLIENT needs no change and deploy skew is safe in both directions. The UI stays SILENT about an unset store because Storage Health already reports it (INV-186).
- F2's gates ASK the store (storeConfigured_) rather than string-matching an error message; an active test override counts as configured, so a fixture run never classifies as unset.
- F4 uses a targeted per-rep delete, NOT a generation salt: the key is the rep's own id, and a salt would evict every rep's entry on every dept-request resolve.
- The `pendingTasksBust_` in a quiz submission is gated on `passed` — a failed attempt leaves the item standing, which is correct.
- REFLECT was scored strictly (1 − 0 = +1): three of the four fixes are structural/latent and score 0 under "would it have fired in production this month", per the cycle-17/18 correction pattern.

## Where I left off
Batches 1 and 2 are implemented, bite-checked (11 mutations / 11 bites),
committed, and pushed to `claude/broad-scan-fw462g`; the summary block is at
`.cycle/blocks/19-batch1-2-broad-implement.md`. Nothing is half-done. Pick up
either by running `/broad-implement` for Batch 3 (F3) or Batch 4
(F8/F7/F5/D1), or `/sync-docs` for the seven documentation updates that block
lists — INV-176's "Pairing is then positional" wording is the one that is now
factually wrong and should go first.
