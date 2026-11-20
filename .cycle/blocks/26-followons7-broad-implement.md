---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented (the follow-on items Batch 12 and the pass before it left that need no operator decision):
  FU1 — a note or Scratchpad save that runs past its 60-second lease no longer had the Sheet to itself, and went on to write (the scan's "re-check the token before the positional write", left out of Batch 12's line)
  FU2 — Batch 12 made every Scratchpad save wait on the PROJECT lock for its lease's check-and-set, so pad autosaves failed for as long as a long job held that lock (Batch 12's own new failure mode)
  FU3 — unsaved Scratchpad text was removed without a word when its 24-hour browser copy expired (FT1's own new failure mode)
New capabilities (G/ST): None
Files modified: web-app/30_callnotes.js, web-app/00_config.js, web-app/10_core.js and web-app/70_kb.js (comments only), web-app/cn/script_callnotes.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, CLAUDE.md, .cycle/config.md, docs/gotchas.md, docs/design-decisions.md, docs/operator-log.md, docs/test-harness-log.md
Estimate: M (~5 h), written to STATE.md's Estimates line before the first edit
Actual: ~3.5 h

CHANGES:
FU1 | web-app/30_callnotes.js, web-app/00_config.js | `cnAcquireRepLease_` returns `until`, the end of the lease it wrote. Every function that takes a lease — the six note actions, `saveMyScratchpad`, `scratchpadPageOp` — calls `cnAssertLeaseLive_(lease)` before its first write to the Sheet: with no more than `CN_REP_LEASE_GUARD_MS` (10 s) of the lease left it throws "Lock timeout: this save took too long to finish safely — nothing was written. Try again." The check reads no property and takes no lock.
FU2 | web-app/30_callnotes.js, web-app/00_config.js | The lease's check-and-set is under the project lock only for the NOTE lease (writers that hold the project lock rely on no new note lease starting). For the Scratchpad's lease it is under the USER lock — one lock for everyone, apart from the project lock — so a pad save or page change never takes, waits on or fails with the project lock.
FU2 — comments | web-app/10_core.js, web-app/70_kb.js | The comments on `recordClientError` and `kbRecordView` said the user lock "serializes a rep's own double-fires"; they now say what it is (one lock for every rep, held for one append). No code changed in either.
FU3 | web-app/cn/script_callnotes.html | `cnScratchMirrorRead_` marks an expired blob `mine` when it is this account's, really aged and holds text; `cnScratchDropStale_` (start-up and opening the pad) removes any expired blob and shows a notice that stays until dismissed — "Scratchpad text that was never saved has expired and was removed" — only to its owner.
Pins | test/client/run.js, test/client/dom/runDom.js | One pure pin (driven through the real lease taker on a moved clock, with a derived half over the eight lease holders), one DOM drive. Five older pins followed (the lease test context's user lock and guard; the F42 pin's two lock logs; the mirror's read shape; two sandboxes that run a leased function).

TEST RESULTS: passed. Pure 1791/1791, DOM 502/502; `lint-server`, `split-manifest --check`, `handbook-sync --check`, `counts.mjs --check` clean; `cycle-closeout --check` in step. No layout changed (one new toast); no visual scenario added.
  Bite-checks: BITES_PLACEHOLDER
  CI: CI_PLACEHOLDER
  NOT verified here: nothing ran in a deployed Apps Script project, and the editor suite was not run. That the user lock behaves as one lock across web-app executions rests on the deployment setting (`executeAs: USER_DEPLOYING`) and the repo's own account of it — it was driven against a stand-in LockService, not observed. A save that really runs fifty seconds was simulated by moving the clock.
  Regression scenarios whose Subsystem overlaps the modified files (Server; Client (Call Notes views)): every scenario of those subsystems, and the new S206 — NOT WALKED: each is a browser or editor walk on a deployed instance (Test Command is `manual`). What stands in: the driven pins and the DOM drive.
REGRESSION RISKS: (1) FU1 — a save that has run about fifty seconds now FAILS where it used to finish; the note stays in the form and the rep tries again. If the Sheet is that slow for a while, saves fail visibly rather than risk each other. (2) FU2 — the Scratchpad lease's check-and-set now shares the user lock with the error and view-usage beacons, the KB view log and the automation error stamps, each held for one short write; a pad save waits behind them for milliseconds. If something ran as a DIFFERENT account (the editor suite run by a collaborator who is not the deployer), its user lock is its own — it only ever touches the TEST rep's pad. (3) FU3 — one more notice at start-up, once, for the account whose unsaved text expired. (4) Lease objects gained a field (`until`); `cnReleaseRepLease_` reads only `key` and `token`, as before.
INVARIANTS AT RISK: None broken. INV-449 (Batch 12) is reworded in one clause — the call-notes file now holds ONE `getUserLock`, the Scratchpad lease's guard, where it held none. The 25post lease invariants hold: the note lease is still taken and checked under the project lock, released without a lock, and its three pins pass with the context's new user lock in place. F58 / F26 (the caller before the lock, one hop down) holds — the lease taker still takes the project lock for the note lease and stays in the one-hop net. INV-442 (the mirror is this account's only; a blob past its time is removed) holds, with the removal now said. g112 followed (no new key; reads and writes in try/catch). INV-185 n/a. New: INV-451.
NET SCORE: 0 production fixes − 0 new failure modes = 0. (a) FU1 NO — it needs a save that outlives sixty seconds. FU2 NO — the dependency it removes was Batch 12's and has not been deployed. FU3 NO — the mirror is Batch 11's and has not been deployed. (b) FU1 NO (a refusal in place of an unsafe write — risk 1), FU2 NO, FU3 NO. Two of the three remove failure modes earlier batches of this cycle recorded against themselves (Batch 12's and FT1's), before either reached production.

OPERATOR ACTIONS / DEPLOY:
- No Script Property, tab or column to set | BLOCKS DEPLOY: N
- Still wanted from Batch 12: the decision on text that begins with an apostrophe | BLOCKS DEPLOY: N
Deploy: Team Tools — `cd web-app && clasp push -f`, then Deploy → Manage deployments → Edit → Version: New version (rides the owed Team Tools deploys). The handbook app is unchanged by this pass.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- NOT taken, each a design choice or waiting on a decision: the leading apostrophe (Batch 12); the reply scan treating a department's whole DOMAIN as the department; a "resolve all" for a TRX fold; the kept Spanish resolve answer across a reload (it would put a PHI-plausible note at rest in the browser); parked call-note drafts between two live windows; the "Handled / day" divisor on an outbound-only day; the Scratchpad's one-page session copy.
- FU2 — `recordClientError`, `recordViewEnter` and `kbRecordView` still wait up to 15 s on the user lock around an append that is atomic by itself; the lock could go (it now only guards a first-touch tab creation). Left: they are best-effort and short.
- FU1 — the check is at one point per function, before its first write; a function with several writes (the flag toggle) is not re-checked between them.
- FT1's remaining notes stand: the held row is tall in the pop-out and does not say why the text has no page.
- The scan's F36 items and Batches 13–14 stand as planned.

DOCUMENTATION UPDATES NEEDED:
- None outstanding — done in this pass: CLAUDE.md (clauses on g17 and g112; the decisions index; the counts block), docs/gotchas.md (two amendments), docs/design-decisions.md, docs/operator-log.md, docs/test-harness-log.md, .cycle/config.md (INV-451; S206; INV-449 reworded).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
