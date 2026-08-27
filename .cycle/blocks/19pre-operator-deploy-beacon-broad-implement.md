---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: the version-beacon reload prompt (operator-green-lit
2026-08-27 — the mid-shift-deploy question: open tabs run the old client
until reload, and nothing told agents a new version existed)
Files modified: web-app/Code.js, web-app/index.html,
  web-app/script_core.html, web-app/styles.html, web-app/Tests.js,
  test/client/run.js, test/client/dom/runDom.js, test/visual/build.mjs,
  CLAUDE.md

CHANGES:
BCN | Code.js | `clientBuildHash_()` — MD5 fingerprint of the served client:
  index.html's RAW template content + every include('...') target DERIVED
  from it (INV-179 — no version constant to bump; a new partial is covered
  the day it ships). Memoized per execution + CacheService
  `client_build_hash_v1` (5-min TTL — the cache survives a deploy, so a
  stale entry only DELAYS detection, never falsifies it). `getDeployStamp()`
  is the rep-gated bare-{error} READ the shell polls. `doGet` stamps the
  page with catch → '' (a hash failure can never break boot).
BCN | index.html | `window.SERVER_BUILD_STAMP` injected via the INV-78
  unescaped-`<?!=` + `<`-guard pattern.
BCN | script_core.html | `buildStampTick_` rides the 60s reminders ticker
  (INV-190 cost rule — no new interval), ABOVE its empState/schedule
  early-returns and OUTSIDE the day-off gate (per-branch rule). Polls every
  ~15 min; first window starts at boot (the served stamp IS current — no
  immediate RPC); empty stamp disables; failure silent; mismatch → ONE
  sticky toast per session with a real Reload button. `showToast` gained
  the additive `actionLabel`/`onAction` option (real named <button>,
  INV-173; existing callers byte-identical). `.toast-act` CSS in styles.html.
BCN | test/visual/build.mjs | replaces the new scriptlet BEFORE the
  straggler strip — the strip alone leaves `window.SERVER_BUILD_STAMP = ;`,
  a head SyntaxError in the harness page. Harness stamp is '' → beacon
  dormant in screenshots (no fixture needed).
Correctness property: google.script.run executes the DEPLOYED version's
code, so a bare `clasp push` with no New version changes neither the served
files nor the hash — no false prompt; the hash moves exactly when a New
version is cut. The dev instance is a separate project (separate cache).

TEST RESULTS: pure 655 → 657 (BCN-1 server contract, BCN-2 client
contract), DOM 81 → 82 (toast action fires once + dismisses; plain toasts
unchanged), editor +1 (`test_deployStamp_requiresEmployeeAndHashes` —
runs at the next runAllTests; expect 294). 7 mutations bite-checked, all
bit: hand-listed partials, eternal cache, un-guarded doGet stamp, check
below the ticker early-returns, forced reload, immediate first-tick RPC,
action-without-dismiss. page.html rebuilds with a valid stamp line.
Regression scenarios walked: S48 (injection pattern — structural PASS via
BCN-1 + a valid harness build), S76 (ticker unchanged otherwise —
structural PASS), toast lifecycle (DOM suite green). S1/S2 editor suites
NOT APPLICABLE off-editor — the operator's next runAllTests covers them.
REGRESSION RISKS: doGet pays the hash on a cache-cold boot (~100-300ms
once per 5 min across all users); ~4 tiny polls/hour per open window.
showToast/remindersTick_ changes are additive + own-try/catch.
INVARIANTS AT RISK: INV-78 (followed + pinned), INV-190 (followed —
per-branch, no new interval), INV-173 (real named button), INV-179
(derived file set), INV-129 (only a successfully computed hash is cached).
None violated.
NET SCORE: 0 − 0 = 0 (a CAPABILITY, not a bug fix — honest scoring; the
staleness it removes is latency, not breakage, because deploy skew was
already engineered safe).

OPERATOR ACTIONS / DEPLOY:
- None to set up (one auto-managed CacheService key). | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Deploy → Manage deployments →
Edit → Version: New version → Deploy (ships with the pending
#189/#190/#191 deploy). NOTE the beacon only announces deploys AFTER the
one that ships it — this deploy itself still reaches open tabs the old way.

FOLLOW-ON ITEMS:
- Batch 7 (structured intake feedback) — still BLOCKED on the operator.
DOCUMENTATION UPDATES NEEDED: None — applied in-session (beacon KDD,
Deploy-section note, operator-entry addendum, narrative → 657/82,
STATE.md).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
