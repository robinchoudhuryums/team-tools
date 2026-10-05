---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented (the deferred items the operator decided on 2026-10-05):
- TRN-1 — a failed quiz attempt now shows WHICH questions were wrong, never the right option. Unlimited retries would make that an answer key by elimination, so retries are capped: 3 failed attempts, then a 24-hour wait. The limit is enforced inside the lock and stated to the rep before answering, after a fail and on a refused submit. Managers can reset a rep from Team Training.
- INT-3 — an intake email (full PHI) to an address outside the org's two domains is sent only after the rep confirms THAT domain. The check is the server's, and nothing is sent until it passes. Outside copies drop the feedback link, which needs a staff sign-in.
- Intake weight plausibility (Batch 10 follow-up, operator 2026-10-05) — a reading under 20 lbs or over 1000 lbs is UNREADABLE and named ("reads as 12 lbs, outside 20–1000 lbs"). It is never fed to the capacity filter.
- MET-5 follow-up — before the daily CDR import, the Dashboard's month-to-date window and its comparison window both end on the newest DATA day. Last month's window is shortened to the same day of the month. The card says "calls through Mon Oct 5 — the latest day is not imported yet".
- KB2-6 — no grammar change. "and" in an Area Eligibility cell means either area; the operator confirmed every reading in the grid. Recorded as a design decision, and the grid is pinned.

Files modified:
- web-app/00_config.js
- web-app/40_metrics.js
- web-app/60_intake.js
- web-app/80_training.js
- web-app/Tests.js (resetQuizAttempts joins the manager-gate omnibus)
- web-app/intake/script_intake.html
- web-app/tc/script_clock.html
- web-app/train/script_training.html
- docs/design-decisions.md (KB2-6: the decision record IS the deliverable)
- CLAUDE.md (the KB2-6 decision index line; the generated running-totals rows)
- test/client/run.js
- test/client/dom/runDom.js
- test/client/server-split-manifest.json
- .cycle/STATE.md
Estimate: M (~10.5 h) — Batch 11, written before the first edit
Actual: ~4 h

CHANGES:
TRN-1 | 00_config.js, 80_training.js, train/script_training.html |
  - Constants `TRAIN_QUIZ_MAX_ATTEMPTS` (3) and `TRAIN_QUIZ_LOCK_HOURS` (24). A new `QuizResets` tab (`TRAIN_QUIZ_RESET_TAB`: ResetAt, QuizId, EmpId, ResetBy, AtMs as a NUMBER cell) is auto-created in the KB store and holds ids only.
  - New pure `trainQuizLockout_(list, nowMs, max, waitMs)`: a fail uses one attempt, a pass starts the count over, and after `max` the rep waits `waitMs` from the last attempt before a fresh set opens.
  - New pure `trainQuizAttemptList_`: counts this quiz only, inside the current assignment round, after the latest reset. Stamps are parsed by `coachParseTs_` (g149).
  - `trainReadQuizResets_` reads the resets; a failed read THROWS, so the attempt is refused rather than treated as "no reset". `trainQuizLockState_` adds the retry label in the viewer's timezone.
  - `submitQuizAttempt`:
    - checks the limit INSIDE the lock, over the same read the attempt count uses (two quick submits cannot both slip under it);
    - a locked submit is refused and NOT recorded;
    - the row it just wrote joins that read in memory (the second read is gone);
    - `perQuestion` rides every attempt;
    - it returns `attemptsLeft`, `maxAttempts`, `locked`, `retryAtMs` and `retryLabel`.
  - `getQuiz` attaches `lockout`. `getTrainingDashboard` ships `locked[]` (reps in a wait on a quiz they have not completed), `maxAttempts` and `lockHours`.
  - New manager-gated, locked `resetQuizAttempts(empId, quizId)`: it refuses an unknown quiz or rep, appends the reset row, and writes a `QuizAttemptsReset` audit row.
  - Client:
    - a locked quiz opens on the wait (no form);
    - the form says "N attempts left before a wait";
    - a failed result marks each question Correct/Incorrect, never naming the right option, and shows the attempts left plus Retake, or the wait with no Retake;
    - a refused submit shows the wait;
    - the manager page gains a "Waiting to retry a quiz" card with Reset (`trainResetQuizAttempts_`; data-* values go only to the RPC and the escaped confirm — g49).
INT-3 | 60_intake.js, intake/script_intake.html |
  - New pure `intakeExternalRecipientCheck_(recipient, spec)`: null for an org address (`isOrgEmail_`, CONFIG.ORG_EMAIL_DOMAINS); otherwise `{success:false, needsExternalConfirm:<domain>, error}` unless `spec.confirmedExternal` equals that domain (case-insensitive; a confirmation covers one domain).
  - Both send paths run resolve → check → send. The feedback CTA is added only when `isOrgEmail_(recipient)`.
  - Client: `intakeExternalConfirm_` asks "Send patient information outside the company?", naming the domain. Yes resends the same send carrying `confirmedExternal`; Go back sends nothing and re-enables Send.
  - `intakePpdSend_` / `intakeAcctSend_` take the confirmation as an optional string (an onclick event is never mistaken for one). The domain list never leaves the server.
Weight | 00_config.js, 60_intake.js, intake/script_intake.html |
  - `INTAKE_WEIGHT_MIN_LBS` (20) and `INTAKE_WEIGHT_MAX_LBS` (1000), checked AFTER the kg conversion.
  - `intakeParseWeight_` returns `implausible: <lbs>` and `unreadable: true` with `lbs: 0` outside the bounds.
  - The explain row and the client warning name the reading and the bounds. The preview ships `weightImplausible` and `weightRange`; an older payload keeps the old words.
MET-5-FU | 40_metrics.js, tc/script_clock.html |
  - New pure `dashboardAlignToData_(range, latestDate, prevWorkday, todayIso)` returns `{importPending, dataThrough, prevAnchor}`. While the import is pending, dataThrough is the newest data day and prevAnchor is the day after it; with no data day in the window, both are null.
  - `getDashboardMetrics` anchors `dashboardPrevRange_` on prevAnchor, ships `dataThrough` and `importPending`, and keeps MET-5's cache gate. The cache key is bumped v6 → v7.
  - Client: `clkDashDataNote_` adds the note to both cards' foot.
KB2-6 | docs/design-decisions.md, CLAUDE.md | Decision "and in an Area Eligibility cell means EITHER area; a phrase that could mean both is unreadable" (anchor `and-in-an-eligibility-cell-means-either-area`) plus its index line.
(tests) | test/client/run.js, test/client/dom/runDom.js, web-app/Tests.js | Moved pins:
  - the engine sandboxes read the two weight bounds from the REAL declarations (`intakeWeightBoundsSrc_`);
  - I3's thousands-comma case is 1,000 (now the ceiling);
  - FU-B8b reads the `wp` derivation;
  - M2/M8 and MET-5 read `align`;
  - the dashboard cache-key pin is v7;
  - H-1 guards `trainQuizAttemptList_` (it uses `coachParseTs_`);
  - the getQuiz tripwire allows `const out = trainStripQuizForRep_(…)` plus `lockout`;
  - S10 is rewritten as "S10 → TRN-1" (marks on a fail, never an option);
  - X1 lists `resetQuizAttempts` (a write no scenario performs);
  - the F9 gate omnibus covers `resetQuizAttempts`.

TEST RESULTS: passed.
- Pure: 1209/1209 (was 1202): seven new pins, all but the wiring checks DRIVEN. DOM: 216/216 (was 214): two new drives. lint:server clean; counts --check agrees; split manifest current.
- Pure — weight: the 20/1000 bounds, the kg conversion before the bound, the explain row, the preview payload and the client warning.
- Pure — MET-5-FU: the Oct 7 regression (Sep 1–6 against five days of October becomes Sep 1–5), the no-data and import-landed cases, the card note on both cards, and the endpoint wiring.
- Pure — INT-3: org / outside / confirmed / wrong-domain / look-alike cases; resolve → check → send order on both paths; the CTA gate; the client confirm (yes resends with the domain, Go back restores Send).
- Pure — TRN-1, the lockout grid: 2 fails, 3 fails lock, out-of-order rows, the wait opening a fresh set, a pass resetting, the reset filter.
- Pure — TRN-1, the `submitQuizAttempt` and `resetQuizAttempts` drive: marks on a fail and no correct option; the third fail locks with a label; a fourth attempt is refused and NOT appended; a rep cannot reset; unknown rep or quiz is refused; the reset row and audit; a retry after the reset passes.
- Pure — TRN-1, the `getTrainingDashboard` drive: only the rep in the wait is listed. Also the getQuiz/lock-order wiring and the client reset RPC.
- Pure — KB2-6: the "and" grid.
- DOM, TRN-1: a locked quiz opens on the wait; the form states the limit; a fail marks the wrong question with attempts left and Retake; the third fail shows the wait with no Retake; a refused submit shows the wait.
- DOM, INT-3: the confirm names the domain; the resend carries it; Go back sends nothing.
- 29 bite-checks, all BITE: weight ×5, MET-5-FU ×3, INT-3 ×6, TRN-1 ×14, KB2-6 ×1.
  - Three NO BITE first, each fixed by strengthening its pin.
  - The prior-window anchor: no pin asserted that `dashboardPrevRange_` takes `align.prevAnchor`. The MET-5-FU pin now does.
  - The dashboard's waiting list: the pin was source-only. It now DRIVES `getTrainingDashboard`.
  - A refused submit: the DOM test never sent one. It now does.
  - Noted: `stripJsComments_` mis-reads whole HTML partials (it drops `intakeAcctSend_` on the pre-change file too). It is a per-function tool, so the INT-3 pin reads the raw source.
- Visual: clock-light-wide, clock-light-wide-pht, training-light-wide and intake-light-wide show 0px overflow, nothing missing and no console error (font-CDN certificate aside). The Dashboard with the import in shows no note, as intended. The quiz modal and the manager waiting card have no visual scenario (no fixture for either).
Regression Scenarios (Test Command `manual`), walked against the changed paths; none run on a deployment:
- S68 quiz take, fail/pass, attempt tracking: PASS on the new rule. A fail now marks questions and states the attempts left; the third fail waits 24 h; a manager reset reopens. S68's Expected still says marks appear only once passed — a doc update, not a defect.
- S59 / S60 intake send: PASS. An outside custom recipient asks first; the org recipients send as before; a weight of 12 is named unreadable.
- S41 / S116 Dashboard: PASS. Before the import the windows align and the card says so; after it, unchanged.
- S112 OOP eligibility: PASS. No code change; the grid is pinned.
- Manager gates (S30's omnibus `test_managerGates_rejectNonManager`): PASS. `resetQuizAttempts` refuses a rep.
REGRESSION RISKS:
- TRN-1 reverses S10 (cycle 22) on the operator's decision: marks now show on a fail. The retry limit is what keeps that from becoming an answer key.
- A rep with three failed attempts in the last 24 h before the deploy is locked from the first load after it. A manager can reset them.
- The quiz now depends on the `QuizResets` tab. A failed read refuses the attempt rather than ignoring resets (auto-created on first use).
- `getQuiz` reads attempts and resets as well, one tail read more when a quiz opens.
- Dashboard cache key v6 → v7: one cold load per rep per period after the deploy.
- A weight of 1000–1250 lbs ("1,250 lbs") now reads as unreadable. Nothing in the catalog is rated past 1000.
- INT-3: on the DEV instance, intake recipients set to a personal (non-org) inbox will ask before each send. On prod every configured recipient is an org address.
INVARIANTS AT RISK: None broken. Checked and holding:
- INV-01 / g17: both new writers lock (the limit check is inside the submit's lock).
- INV-02 / g25: `resetQuizAttempts` is manager-gated; F9 and the omnibus cover it.
- §9.4 / the getQuiz tripwire: no correct option leaves the server; the rep shape is still `trainStripQuizForRep_`.
- g149: stamps parsed by `coachParseTs_`; H-1 now guards the new caller.
- g53 / g122: an unreadable resets tab refuses, never reads as "no resets".
- g36: the intake audit still logs only `recipientDomain`.
- g143: the new public function is gated.
- g148 / g129: a pre-import round is still never cached.
- g156: the weight is still read by token and unit.
- g41: no eligibility grammar change.
- g112: no new localStorage key.
- g49: reset ids come from data-* into the RPC and an escaped confirm only.
- X1: the new write is named.
NET SCORE: 0 − 0 = 0. All five are defensive or decided-behaviour changes, real on their paths, with no recorded incident this month.
- TRN-1 needs a rep working the key by retries.
- INT-3 needs an outside address typed by mistake.
- Weight needs a typo.
- MET-5-FU needs a pre-import load. It may happen most mornings, but no wrong number has been reported.
- KB2-6 changed no behaviour.
New failure modes: none identified; the trades are listed above.

OPERATOR ACTIONS / DEPLOY:
- Tell the team: a failed quiz now shows which questions were wrong. After 3 failed attempts there is a 24-hour wait; managers can reset it from Training → Team Training → "Waiting to retry a quiz". | BLOCKS DEPLOY: N
- Expect the intake send to ask before emailing an address outside universalmedsupply.com / umsupply.com. On DEV with personal-inbox recipients it asks every time; that is by design. | BLOCKS DEPLOY: N
Deploy: Server + Client (Training, Intake, Dashboard): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- No visual scenario or mock fixture for the quiz modal (result, wait) or the manager "Waiting to retry a quiz" card. `getTrainingDashboard` has no fixture.
- `stripJsComments_` mis-parses whole HTML partials (it drops `intakeAcctSend_` from script_intake.html). Any pin that strips a WHOLE partial before a regex can pass vacuously or fail falsely (the g116 class); worth an audit.
- The S68 scenario text, the S10 decision in docs, and the training spec's "unlimited retries" (docs/training-employee-docs-spec.md §9.4) need updating.
- Editor-suite (Tests.js) cases for the retry limit and reset, the external-recipient refusal and the weight bounds are owed. They belong to Batch 15.

DOCUMENTATION UPDATES NEEDED:
- docs/modules.md: Training (retry limit, wrong marks, manager reset), Intake (outside-recipient confirm, weight bounds), Dashboard (pre-import note).
- docs/gotchas.md: amend g156 (the plausibility bounds) and g148 (the aligned pre-import window); consider g143-family wording for "a client-only guard is no guard" (INT-3 is its second instance after INT-2).
- docs/design-decisions.md: amend the S10-era quiz decision (Training rides ON the Reference/KB layer / T2) with the TRN-1 limit; the Intake Sent / external email decisions with INT-3.
- docs/operator-state.md: the `QuizResets` tab (auto-created, KB store, ids only); `CONFIG.ORG_EMAIL_DOMAINS` now also gates intake recipients.
- .cycle/config.md: INVs for the retry limit, the outside-recipient confirm, the weight bounds and the aligned pre-import window; update S68's Expected, S59, S116 and S41; amend INV-66-adjacent dashboard text if it names the comparison window.
- docs/test-harness-log.md: the Batch 11 entry.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
