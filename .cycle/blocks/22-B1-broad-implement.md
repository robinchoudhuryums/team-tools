---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- S1 — the editor test suite is owner-only: every function in Tests.js reachable through google.script.run (runners, setup/cleanup, all 337 test_* functions, and 18 leading-underscore helpers such as _clearPunchesForDay / _appendTestPunch / _setEmpPtoEnabled / _getBalance / _runAllTests — a LEADING underscore is not private) now opens with _assertSuiteCaller_(); runSingleTest accepts test_ names only
- X2 — PUBLIC-GATE pin: derives the reachable surface from the web-app/ DIRECTORY (not serverSource()/filePushOrder) and requires a gate in every public function's own body, a reasoned allow-list entry, or a named delegate whose callee gates; harness comment corrected
- S3 — errorStateHtml_(msg, beaconMsg): the four Call Notes search-failure sites show the typed query but beacon "Search failed - <error>"; the query is no longer double-escaped; derived pin over every errorStateHtml_ call site
- S4 — FormTokenCreated audit row records tokenRef=<first 8 chars>… (formTokenRef_), never the live 72-hour bearer token
- S9 — submitFormByToken refuses a non-UUID token (formTokenShapeOk_) and an unknown one on a lock-free read BEFORE the global ScriptLock; re-finds the row inside it; a waitLock timeout returns a retry message instead of a raw "Lock timeout"
- S2 — NOT IMPLEMENTED: DEFERRED by operator decision (2026-09-23) after the scope proved larger than estimated (no neutralising helper exists; ~45 client-text writer functions / ~70 write sites across 12 files). To be scheduled as its own batch.

Files modified:
- web-app/Tests.js
- web-app/10_core.js (doGet security comment only)
- web-app/61_forms.js
- web-app/script_core.html
- web-app/cn/script_callnotes.html
- test/client/run.js
- test/client/harness.js (comment only)
- test/client/server-split-manifest.json (regenerated: formTokenRef_, formTokenShapeOk_; createFormToken, submitFormByToken changed)
- CLAUDE.md (running-totals block: pure 931 → 937)
- .cycle/STATE.md, .cycle/blocks/22-B1-broad-implement.md
Estimate: M (~11.5 h) — S1 M 3h · S2 M 4h · S3 S 1.5h · S4 S 0.5h · S9 S 1h · X2 S 1.5h
Actual: ~4 h for the five delivered items (S1 grew — 18 leading-underscore helpers were also reachable — but the guard is mechanical); S2's 4 h not spent (deferred)

CHANGES:
S1 | web-app/Tests.js, web-app/10_core.js | `_suiteCallerAllowed_(active, effective)` (pure) + `_assertSuiteCaller_(label)` (reads Session.getActiveUser/getEffectiveUser DIRECTLY — never getActiveUserEmail_, so _TEST_OVERRIDE_EMAIL cannot satisfy it; per-execution memo). Admits only active === effective, both non-empty: the editor and owner-installed triggers pass; every web visitor on the execute-as-deployer app (active = visitor, effective = deployer) and every anonymous caller is refused. Inserted as the FIRST statement of the 7 entry points, all 337 test_* functions and 18 state-touching helpers; 17 pure assertion/registrar helpers are exempt (they touch no store; a function argument cannot cross google.script.run). runSingleTest refuses a non-`test_` name before `globalThis[name]`. doGet's security comment rewritten (it claimed every endpoint was gated and only the two form endpoints were public). assertNotProdInstance_ semantics UNCHANGED (unset still permits — see follow-ons).
X2 | test/client/run.js, test/client/harness.js | Two PUBLIC-GATE pins: (1) directory-derived scan of 649 public functions — app files need getEmployeeInfo_ / assertManagerCaller_ / getManagerEmails_ / a gate message in their own body, or an ALLOW entry (doGet, include, cnPing, getFormByToken, submitFormByToken — each with a reason), or a DELEGATE whose callee is checked for a gate (recordPunch, updatePunchAdjustStatus[Bulk], managerGetReviewCandidates, managerGetTrainingQueue, intakePreview/Send PMD/PAP); Tests.js functions need _assertSuiteCaller_ as the FIRST statement unless listed pure (and a "pure" one that touches a store fails); refuses to trust itself if a .claspignore appears. (2) behavioural _suiteCallerAllowed_ cases + the guard reads real Session identities + runSingleTest's name check precedes the lookup. Harness serverSource() comment no longer claims it is the deployed surface.
S3 | web-app/script_core.html, web-app/cn/script_callnotes.html, test/client/run.js | errorStateHtml_ gains an optional `beaconMsg`; the four search-failure sites (rep + manager, {error} + transport) display the raw query (escaped once by errorStateHtml_) and beacon 'Search failed - ' + error. Pins: behavioural (override beaconed, display escaped once, no-override unchanged) + a derived scan of every errorStateHtml_ call in every partial requiring a beacon override wherever the message interpolates rep input (requestedQuery / searchQuery / mgrSearchQuery / `.value`) and banning a pre-escaped query. The existing beacon-shape pin updated to the new shape.
S4 | web-app/61_forms.js, test/client/run.js | `formTokenRef_(token)` (first 8 chars + …, '(none)' when absent); createFormToken's audit notes use it. FormSubmissionReceived (a dead token, post-submit) and the console.warn (owner-only logs) unchanged. Pin: behavioural ref + the writer builds the row from the reference only.
S9 | web-app/61_forms.js, test/client/run.js | `formTokenShapeOk_` (v4-UUID shape); submitFormByToken returns 'Form not found.' for a malformed token and for an unknown one (lock-free findFormTokenRow_, the read getFormByToken already does) BEFORE getScriptLock; waitLock is wrapped so a timeout returns 'The form service is busy…'; the row is re-found and status trusted only inside the lock. Pin: shape cases + ordering + the in-lock re-find.

TEST RESULTS: pure 937/937 (was 931; +6 new pins, 1 existing pin updated to the new errorStateHtml_ shape), DOM 145/145, `npm run lint:server` clean, `counts --check` clean (block regenerated). 15 bite-checks, ALL BITE: S1/X2 ×8 (test_ fn loses guard; helper loses guard; guard not first; app endpoint loses gate; delegate callee loses gate; empty-matches-empty; guard via override hook; runSingleTest name check removed), S3 ×3 (beacon sends msg; a site drops its override; a site pre-escapes), S4 ×2, S9 ×3 (shape admits anything; waitLock outside try; pre-read removed). Editor suite NOT run (no Apps Script runtime here).
Regression scenarios (Test Command `manual`): S1, S2 (Test Suite), S23, S24 (Call Notes search / digests), S61 (fillable form) — all NOT APPLICABLE here: each needs the Apps Script editor or the live deployment; recorded as owed walk steps below.

REGRESSION RISKS:
- The owner check assumes Session.getActiveUser().getEmail() is populated in the editor and in owner-installed triggers — true on this Workspace domain (runNightlySelfTest's own assertManagerCaller_ already depends on it). If it ever came back blank, runSmokeTests/runAllTests would refuse; the nightly self-test would then stamp an error in SELF_TEST_LAST_RESULT rather than fail silently.
- A trigger installed by a non-deployer manager runs as that manager with active === effective, so the nightly self-test still passes the guard (by design — the guard is "whoever the execution runs as", not "the deployer").
- The deployer, visiting the web app, can still call the runners via google.script.run (active === effective for them). Accepted: they can run the suite from the editor anyway.
- submitFormByToken's lock-free pre-read calls getOrCreateFormTokensSheet_, which can CREATE the tab outside the lock on a store's first-ever use — the same exposure getFormByToken has always had.
- ~340 guard statements add one memoised boolean check per test call — negligible.

INVARIANTS AT RISK: None broken. Touched: INV-02/31/136 (gate coverage — strengthened: the net now reaches Tests.js/DevTools.js), INV-113 (public endpoints: token-only — unchanged, pinned), INV-150 (ClientErrors PHI-free — strengthened by S3), g23 (the owner check deliberately bypasses the override hook), g17 (submit still writes only inside the lock).
NET SCORE: 0 production fixes − 0 new failure modes = 0 (5 defensive: S1, X2, S3, S4, S9). S1/S4/S3 close real exposures but none is confirmed to have FIRED this month — S3 and S4 wrote their data every time their path ran, which is unverified without reading the live ClientErrors/AuditLog tabs; the reflection should check those tabs before re-scoring.

OPERATOR ACTIONS / DEPLOY:
- Deploy: the S1 guard is only live once pushed — until then every runner is still callable by any signed-in user | BLOCKS DEPLOY: N (it IS the deploy)
- Set Script Property `INSTANCE_IS_PROD=true` on PROD (owed since cycle 19 step 8) — belt-and-braces with S1; after it, runAllTests refuses on prod entirely | BLOCKS DEPLOY: N
- Optional audit: search the ClientErrors tab for `Search failed for "` rows and the AuditLog for `FormTokenCreated … token=` rows written before this deploy — they contain a typed query / a live token. Tokens older than 72 h are dead; delete or redact rows per the PHI policy | BLOCKS DEPLOY: N
- Walk after deploy: (1) editor → runSmokeTests → `Failed: 0` (S1 — the owner guard passes); (2) as a NON-owner rep, browser devtools on the app → `google.script.run.withFailureHandler(e=>console.log(e.message)).runSmokeTests()` → "can only be run by the script owner"; (3) Call Notes → force a search failure (or read the next organic one) → the ClientErrors row reads `Search failed - …` with no query (S3); (4) send a fillable form → its FormTokenCreated row shows `tokenRef=xxxxxxxx…` (S4); (5) submit the public form normally → success (S9 regression) | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- S2 (formula injection) — DEFERRED by operator decision; schedule as its own batch. Highest-value slice: the ADP/payroll free-text writers (time-off notes ×3 paths, punch-adjust reason, DeptRequests label/PatientTrx, ClientErrors, AuditLog notes).
- assertNotProdInstance_ still PERMITS when INSTANCE_IS_PROD is unset (the audit suggested treating unset as refuse). Not changed: with no DEV instance yet it would block the full suite everywhere — an operator decision tied to standing up DEV.
- cleanupTestData still takes no lock across its snapshot-then-positional deletes (the g132 class). Now owner-only, so exposure is the owner's own concurrent live traffic; adding a lock needs an editor check of ScriptLock re-entrancy with the endpoints it calls.
- `include(filename)` is reachable by any caller (allow-listed: it returns bundled HTML partials, which pages already serve).
- The derived S3 scan recognises typed input by identifier (requestedQuery/searchQuery/mgrSearchQuery/`.value`); a future site interpolating a differently named variable holding typed text would not be seen.

DOCUMENTATION UPDATES NEEDED:
- docs/gotchas.md + CLAUDE.md index: a new gotcha — "a LEADING underscore is not private: google.script.run reaches every function whose name does not END in `_`, in every pushed file (Tests.js included)"; amend g26 (trigger handlers) to name the test runners; a PHI-boundary line for errorStateHtml_'s beacon (typed input needs the beaconMsg override).
- .cycle/config.md: an invariant for PUBLIC-GATE (next free INV-243); walk steps above appended to S1, S23 and S61; a new scenario for the non-owner refusal.
- docs/operator-state.md / docs/deployment.md: the suite is owner-only now — a manager who is not the script owner can no longer run runSmokeTests from the web app (they never could legitimately; the editor is unaffected).
- test/client/README.md: PUBLIC-GATE reads the directory, not serverSource().
---END BROAD SCAN IMPLEMENTATION SUMMARY---
