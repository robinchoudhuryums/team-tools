---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- Q1 | propSetBounded_ — ONE writer for every JSON-blob Script Property (refuse for operator blobs, degrade for auto-managed ones)
- Q2 | validators + editors show the serialized budget (the advertised entry caps admit far more than the platform holds)
- Q3 | a Storage Health "Script Properties" line
- Q4 | derived every-writer-routes-through-the-helper pin + worst-case arithmetic pins; behavioural helper drive; a Tests.js saveEmailTemplates over-size case
- Q5 | the logged DR whole-tab-read follow-on (drFindRowByReqId_ in both resolve paths)

Files modified: web-app/Code.js, web-app/Tests.js, web-app/script_core.html,
web-app/styles.html, web-app/cn/script_callnotes.html, web-app/kb/script_kb.html,
test/client/run.js, test/visual/mock.js

Estimate: M (~5 h) — recorded in STATE.md BEFORE the first edit
Actual: ~2.5 h

CHANGES:
Q1 | web-app/Code.js | `propSetBounded_(key, value, opts)` is the one writer for every
   JSON-blob property, with `utf8Len_` counting the BYTES the platform actually caps
   (a `.length` in UTF-16 units under-counts anything non-ASCII, and a surrogate pair
   is 4 bytes, not 6). 14 operator-edited blobs REFUSE by name with nothing written —
   the error names the key, the size, the cap and what the operator can do, and every
   save endpoint's existing catch turns it into the {success:false, error} its editor
   already shows. 6 auto-managed blobs DEGRADE through a caller-supplied shrinker:
   `propShrinkDropOldest_` (the stamp maps — it drops oldest-first UNTIL IT FITS rather
   than one per call, because a caller's retry loop is a safety net and a large map
   would exhaust it and clear the property), `propShrinkStripFields_` (the self-test
   result loses its free text before its figures), and two custom ones (the geocode
   cache resets on BYTES; the AI spend counter is three fields, so a reset is the only
   degrade). The 9 scalar writers — a day count, a dollar cap, a model key, a folder
   id, a generation counter — stay on setProperty and are allowlisted BY NAME with a
   reason each. An unshrinkable degrade deletes the property and LOGS why rather than
   leaving a stale value.
Q2 | Code.js, script_core.html, styles.html, cn/script_callnotes.html, kb/script_kb.html |
   `getAdminConfig` ships `propBudget` for the 13 operator keys plus `propValueMax`;
   `kbGetSearchConfig` ships its own. The badge is built ONCE by `propBudgetHtml_`
   (shared shell) over `.prop-budget` (shared stylesheet): 11 Admin editors render it
   through a key-lookup shim, the Reference synonyms modal calls it directly. It
   renders NOTHING without a server budget, so an older client/server pair degrades to
   no badge rather than a fabricated 0%, and it tones past 80% / 90% of the cap.
   The synonyms modal reads the SOLE budget value rather than naming the server's
   property constant — no name to keep in step.
Q3 | Code.js, cn/script_callnotes.html, test/visual/mock.js | `scriptPropertiesStatus_`
   reports bytes used of the 500KB store and the largest value against the 9KB
   per-value cap. Read-only; values are COUNTED, never returned; a failed read is
   `bytes: null` — unknown, never OK (INV-187). It rides `getStorageHealth` beside the
   Drive and mail-routing lines (the third app-wide fact no store row can see) and
   `cnHealthFindings_` as an ok FACT while the store is comfortable, a warn past 80%
   or on an unreadable read — so the System tab still reaches "Nothing needs
   attention" on a healthy deployment (INV-186).
Q4 | test/client/run.js, web-app/Tests.js | Five pins: Q-1 (DERIVED — every setProperty
   outside the helper writes an allowlisted scalar, every blob key IS bounded, and the
   refuse/degrade mode is asserted per key), Q-1b (the helper and both shrinkers driven
   in a vm — refuse writes NOTHING and names key/size/cap; degrade keeps the NEWEST
   entry; an unshrinkable value deletes rather than leaving a stale one; utf8Len_
   counts bytes), Q-2 (every save endpoint, the one-home badge rule, the derived
   no-second-tone-rule scan, and the worst-case arithmetic so a raised entry cap reads
   as the over-budget it is), Q-3, Q-5. Editor suite: an over-size `saveEmailTemplates`
   case driving the refusal against the live store and restoring it, and
   `_suiteEnvCheck_` now names the property that test saves and restores.
Q5 | web-app/Code.js | Both DeptRequests resolve paths — the emailed link
   (`markDeptRequestResolved_`) and the in-app button (`resolveDeptRequest`) — use the
   bounded `drFindRowByReqId_` the detail read already used, instead of reading the
   whole tab (every PatientTrx cell) on each click. Writes target the located row
   index; idempotence, attribution, ResolvedVia and the cache busts are unchanged.

TEST RESULTS: passed.
- Pure harness (`node test/client/run.js`): 804 passed, 0 failed (was 799 — +5 Q pins).
- DOM harness (`node test/client/dom/runDom.js`): 113 passed, 0 failed (unchanged).
- `node --check` on Code.js / Tests.js / DevTools.js / mock.js: clean.
- Editor suite (`runAllTests`): NOT EXECUTABLE outside the Apps Script editor — the
  standing constraint. Registration count 315 → 316; the summary now PRINTS the
  derived expectation (Batch S), so no hand-carried number needs updating.
- Bite-checks: 9 mutations against a COMMITTED tree; 8 bit. The 9th (widening the
  scalar allowlist alone) is an EQUIVALENT MUTANT — the entry is inert unless something
  also bypasses the guard — so it was re-run as bypass + allowlist together, which bit
  on both halves of Q-1 and on Q-2.
- Visual matrix (manual, on-demand): the affected scenarios re-shot after both commits —
  admin-config light/mobile, admin-system light/mobile, admin-system-nodrive, plus
  clock / cn-log / spanish / deptreq / deptreq-expanded / qa-queue / reference-reader for
  the shared shell + stylesheet change. All `missing: []`, all `overflowPx: 0`. The
  badge tones were MEASURED in Chromium rather than eyeballed (11 badges, the 85% one
  genuinely amber, zero of the retired class left).

REGRESSION SCENARIOS (Test Command is `manual`):
- S51 Admin tab augment | PASS — the editors render unchanged plus a budget badge; on
  camera at 1440 and 390 with 0 overflow.
- S53 tag taxonomy rename/merge/archive | PASS — `setArchivedTagsSet_` is bounded; the
  archive path is byte-identical below the cap (a tag list would need hundreds of
  entries to refuse) and the delete-when-empty branch is untouched.
- S56 external-email template library | PASS — `saveEmailTemplates` is the headline
  case; the new editor-suite test drives the refusal and the under-cap save.
- S57 compliance audit panel | NOT APPLICABLE — no changed line on its path.
- S62 Reference browse / search / edit | PASS — only the admin synonyms modal changed
  (a budget line through the shared builder); the tree, reader and search are untouched.
- S66 KB AI guidance | PASS — the spend counter is degrade-bounded (three fields, so
  unreachable); the cap and model remain scalar writers.
- S71 KB review-due | NOT APPLICABLE — unchanged path.
- S74 Dept-request tracking end to end | PASS by inspection — this is Q5's scenario.
  Idempotence (`already` with dept/resolvedAt/resolvedBy), attribution, `ResolvedVia`,
  the cache-generation bump and both `pendingTasksBust_` calls are preserved; the
  in-place resolve renders from the same payload. One deliberate WIDENING: the bounded
  lookup trims both sides, so a whitespace-padded stored RequestId now matches where
  the old exact compare 404'd — the same normalize-at-the-one-read discipline the
  detail read has had since operator note 6.
- S76 break reminders + break-schedule editor | PASS — `saveBreakSchedules` is bounded;
  the blob shape, key order and delete-on-reset are untouched.
- S80 Spanish resolution-share / S105 auto-assign | NOT APPLICABLE — unchanged paths
  (only `saveSpanishInboxMembers` is bounded, which is the Admin card).
- S90 / S100 / S103 QA | PASS — `saveQaMembers` and `saveQaScorecardCriteria` are
  bounded; the strict-save / lenient-read round-trip and delete-on-reset are unchanged.
- S97 Admin → System findings-first | PASS — on camera: the Script Properties line sits
  beneath Drive and mail routing as a green ok FACT, and the badge count did NOT rise
  on a comfortable store.
- S102 break coverage planner / S104 Drive capability | PASS — same partial and the same
  Storage Health render; both re-shot clean.
- S30 / S55 trigger handlers | PASS — the heartbeat, automation-error and self-test
  stamps are degrade-bounded; every gate, audit row and early return is unchanged.
- S1 / S2 editor suite | NOT EXECUTABLE HERE (editor-only, the standing constraint).
  The derived S1/S4 and S2 pins cover the registration list and the printed expectation.

REGRESSION RISKS:
- The degrade path can DELETE an auto-managed property it cannot shrink. Deliberate and
  logged: every degrade target is a cache or a heartbeat that regenerates, and a cleared
  heartbeat reads as "no heartbeat recorded yet" rather than a wrong value. The one
  target genuinely within reach of the cap is AUTOMATION_LAST_ERRORS (~24 jobs x a
  300-char message), which is exactly why it drops oldest-first instead of refusing.
- The Q5 trim is a widening, not a narrowing (above). A padded id previously failed to
  resolve; it now resolves. No path is narrowed.
- `propSetBounded_` THROWS on refusal, so any future caller that is not already inside a
  try/catch would surface the throw. All 14 current refuse-mode call sites are inside
  the endpoint try whose catch returns {success:false, error} — pinned.

INVARIANTS AT RISK: None.
- INV-96 (bound client-writable inputs; refuse by name) — extended, not weakened.
- INV-129 (cache only clean rounds) — `driveAccessStatus_`-style gating untouched;
  the new store status is not cached.
- INV-186 (an indicator that can never be clean) — the Script Properties finding is an
  ok FACT while comfortable, so the System tab still reaches all-clear.
- INV-187 (a degraded read is reported, never a confident zero) — an unreadable store
  reports `bytes: null`, rendered as unknown.
- INV-188 (strip comments before matching) — hit once more, in my own ban scan; fixed.
- INV-184 (a retired selector must not return) — `.cn-prop-budget` is retired and pinned.

NET SCORE: 0 production fixes − 0 new failure modes = 0
This batch is PREVENTIVE by construction — the plan classified it as the one latent
DEFECT, and a latent defect has by definition not fired. Nothing on this deployment is
near the cap today (the measured largest value is CN_EMAIL_TEMPLATES). Scoring it 0 is
the honest read, not a disappointing one; the value is that a save which would have
failed opaquely AFTER its audit row now fails by name BEFORE anything is written.

OPERATOR ACTIONS / DEPLOY:
- None. No new Script Property, trigger, migration or CONFIG value to choose. | BLOCKS DEPLOY: N
Deploy: Server + every client partial ship together — `cd web-app && clasp push -f`,
then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version.
Post-deploy: `runAllTests()` — expect 316 (the summary prints the derived expectation).
Then read Manage → Admin → System: the new Script Properties line states the real
store usage on this deployment, which is the number this batch was reasoning about
without being able to see.

FOLLOW-ON ITEMS:
- The DRIVE-ACCESS FINDING MAY BE A FALSE POSITIVE (operator report, mid-session).
  The operator redeployed, saw "Drive access not granted", ran a function in the editor
  as instructed, and got NO re-authorization prompt. No prompt is itself informative:
  Apps Script computes the project's scope set statically and prompts only when it
  exceeds the existing grant, so no prompt usually means the grant already covers
  /auth/drive. `driveAccessStatus_` introspects `ScriptApp.getOAuthToken()`, which
  returns the token for the RUNNING EXECUTION — if the runtime mints it with only the
  scopes that execution exercises, a Storage Health run that never touches DriveApp
  yields a token without Drive and the probe reports "not granted" while Drive works.
  That fits this deployment: KB_IMAGES_FOLDER_ID is unset (so the probe's own
  getFolderById is skipped) and the embed scan touches Drive only when the KB store is
  reachable AND has embeds. The 5-minute cache is NOT the cause — a not-granted round
  is never cached. The decisive test is one paste in the editor (below); if DriveApp
  succeeds while the probe says false, the probe should test by ATTEMPTING a read-only
  DriveApp call and classifying the error through the existing `driveScopeError_`
  (still side-effect free, so DRV-3 holds) rather than by token introspection. Out of
  Batch Q's scope; logged, not fixed.
      function driveDiag_() {
        try { Logger.log('DriveApp OK — root: ' + DriveApp.getRootFolder().getName()); }
        catch (e) { Logger.log('DriveApp FAILED: ' + e.message); }
        Logger.log('probe: ' + JSON.stringify(driveAccessStatus_()));
      }
  The other reading that fits "no prompt": Google's granular consent screen lets a user
  untick individual permissions, so an earlier accept with Drive unticked leaves a grant
  that exists but is short, and no NEW prompt appears. Revoking the script at
  myaccount.google.com → Data & privacy → Third-party apps, then running a function
  again, forces a fresh consent screen.
- `resolveDeptRequest` and `markDeptRequestResolved_` now both do a bounded lookup, but
  `getDeptRequests` still reads the whole tab (it must — it lists). Not a defect; noted
  so the Q5 entry is not read as "the DeptRequests store is fully bounded".
- The Admin → System findings read `e.error` where `stampAutomationError_` writes
  `message` (carried from Batch S; still open).

DOCUMENTATION UPDATES NEEDED:
- CLAUDE.md Common Gotchas: a "Script Properties are capped — 9KB per value, 500KB per
  store" entry, naming `propSetBounded_` as the one writer and the refuse/degrade split,
  and stating that the advertised entry caps (50 templates x 4000 chars) were never the
  binding constraint.
- CLAUDE.md Key Design Decisions: the one-home budget badge (`propBudgetHtml_` +
  `.prop-budget` in the shared stylesheet) alongside the other shared-component entries.
- CLAUDE.md Invariant Library: a new INV for the size guard (one writer; operator blobs
  refuse by name and write nothing; auto-managed blobs degrade through a named shrinker
  and clear rather than leave a stale value; the scalar allowlist is by name with a
  reason each; the budget badge has one home).
- CLAUDE.md Operator State Checklist: the post-deploy expected count moves 315 → 316,
  and the Storage inventory now carries a Script Properties line.
- Regression Scenarios: extend S51/S56 with the budget badge and the over-size refusal,
  and S97 with the Script Properties line.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
