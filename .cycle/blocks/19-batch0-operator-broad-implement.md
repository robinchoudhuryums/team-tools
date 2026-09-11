# Cycle 19 — `/broad-implement Batch 0` (2026-09-11)

Batch 0 of the next-steps plan (`.cycle/blocks/19-next-steps-plan.md`) is the
OPERATOR batch: six human-only actions, "no code" by its own heading. None of
them is executable from the remote container (no `clasp`, no `~/.clasprc.json`,
no Apps Script runtime, no Drive consent, no Google account). This block records
that the invocation found NOTHING to implement, and what WAS verified so the
operator's run rests on checked facts rather than on the plan's prose.

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: NONE — Batch 0 contains no code findings. It is the six
operator actions 0a–0f (clasp push + editor `runAllTests`, Drive re-auth,
`installAutomationTriggers()`, `reportBreakPairingChanges()`, the Admin → System
mail-routing line, the DEV instance + `INSTANCE_IS_PROD=true` on prod).
Files modified: none in web-app/ or test/ (this block + a STATE.md note only)

CHANGES:
(none)

VERIFIED (each precondition the operator relies on, checked on branch HEAD 7f78b12):
- 0a | PR #238 is MERGED (by the operator, 2026-09-11 17:59Z); `_testAdminEmailsSplit_`
      + `_TEST_MGR_EMAIL` are in web-app/Tests.js (setup appends, cleanup strips);
      branch is fully pushed (0 ahead / 0 behind origin).
- 0b | `mailBccStatus_`/Drive probe machinery present (INV-197 surfaces the outcome).
- 0c | `ScriptApp.newTrigger('purgeOldDiagnostics')` (#20) and
      `ScriptApp.newTrigger('autoAssignSpanishThreadsScheduled')` (#21) are in
      `installAutomationTriggers` (Code.js 12470 / 12499); the derived TARGETS
      tripwire covers both.
- 0d | `reportBreakPairingChanges()` is a top-level function (Code.js 3069) beside
      `reportMultiBreakDays()` (3113).
- 0e | `mailBccStatus_()` exists (Code.js 9614) and rides Storage Health.
- 0f | docs/deployment.md § "One-time dev setup" (line 119) documents both
      instance markers incl. `INSTANCE_IS_PROD=true` on prod.

TEST RESULTS: pure harness 797 passed / 0 failed; DOM harness 113 passed / 0
failed (both on HEAD, nothing changed). Editor suite: NOT runnable here — that
is action 0a itself; expect 312/312.
REGRESSION RISKS: None (no code changed).
INVARIANTS AT RISK: None.
NET SCORE: 0 − 0 = 0

OPERATOR ACTIONS / DEPLOY (this IS the batch — in this order):
- 0a `cd web-app && clasp push -f`; run `runAllTests()` ALONE in the ~6pm CT quiet
  window; expect 312/312; keep `ADMIN_EMAILS` as it is. | BLOCKS DEPLOY: Y
- 0b Re-authorize Drive as the DEPLOYING account (editor → run any function →
  accept the Drive permission); read Admin → System afterwards. | BLOCKS DEPLOY: N
- 0c Re-run `installAutomationTriggers()` once (triggers #20/#21). | BLOCKS DEPLOY: N
- 0d Run `reportBreakPairingChanges()` once from the editor, BEFORE the next
  accrual credit. | BLOCKS DEPLOY: N
- 0e Read the mail-routing line on Admin → System (is `MAIL_BCC_ALL` set?). | BLOCKS DEPLOY: N
- 0f Stand up the DEV instance per docs/deployment.md § "One-time dev setup";
  then set `INSTANCE_IS_PROD=true` on PROD (after 0a) and run
  `installAutomationTriggers()` on dev. Prerequisite for Batch S. | BLOCKS DEPLOY: N
Deploy: Server + every client subsystem: `cd web-app && clasp push -f`, then
Apps Script editor → Deploy → Manage deployments → Edit → Version: New version
→ Deploy (the one New version carrying #236 + #237; #238's Tests.js needs only
the push). Test Suite: same push.

FOLLOW-ON ITEMS:
- The next-steps plan block and the 7f78b12 checkpoint live only on
  `claude/broad-scan-fw462g` — `main` stops at #238's merge (4ec08bd). They reach
  main with the next PR (Batch P is the next `/broad-implement`).
- CLAUDE.md's pure-harness running total still reads 796; #238 made it 797.
  Deliberately NOT hand-edited: Batch C (derived counts) exists to end exactly
  this class of hand-carried number.

DOCUMENTATION UPDATES NEEDED:
- None (STATE.md "Where I left off" updated in this checkpoint).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
