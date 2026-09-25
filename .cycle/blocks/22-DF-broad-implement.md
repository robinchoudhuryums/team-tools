---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: the five findings the cycle-22 scan DEFERRED, per the operator's decisions of 2026-09-25
- S6 — a QA reviewer cannot score, finish (change status), share or re-attribute their OWN call; an admin can
- S8 — nothing embeds the app, so no page it serves may be framed by another site (ALLOWALL → DEFAULT on the shell, the restricted page and the public form)
- S10 — a failed quiz attempt reports the score alone; per-question right/wrong only once the attempt passes
- M6 — Dept Request SLA targets are WORKING DAYS (default 2), converted to business hours through the one business window; every label says working days
- C12 — archive-aware reads stay deferred; History, the per-rep view and the export now SAY when a range reaches the archive window (archiving is off by default, so nothing shows today)
Files modified: web-app/90_qa.js, web-app/10_core.js, web-app/61_forms.js, web-app/80_training.js, web-app/train/script_training.html, web-app/Tests.js, web-app/00_config.js, web-app/50_deptrequests.js, web-app/20_timeclock.js, web-app/metrics/script_deptrequests.html, web-app/cn/script_callnotes.html, web-app/30_callnotes.js, test/client/run.js, test/client/server-split-manifest.json, test/visual/mock.js, CLAUDE.md (running totals), .cycle/STATE.md
Estimate: M (~6 h) — S6 S 1.5h · S8 S 0.5h · S10 S 1h · M6 M 2h · C12 S 1h
Actual: ~2.5 h

CHANGES:
S6 | 90_qa.js | qaIsOwnRecording_ (pure: the stored roster AgentId decides when present, else the attributed name vs the caller's roster name, trimmed and case-insensitive — the My Reviews match) and qaSelfReviewRefusal_ ('' for an admin or a recording that is not theirs, else "This is your own call — another reviewer (or an admin) has to review it."). qaSetRecordingStatus, qaSaveScorecard and qaSetRecordingShared check the recording's attribution before writing; qaSetRecordingAgent checks the CURRENT and the NEW attribution (moving your call away, or claiming another's, is the same act by another route).
S8 | 10_core.js, 61_forms.js | setXFrameOptionsMode(DEFAULT) — X-Frame-Options SAMEORIGIN — on doGet's shell, its restricted-access page and serveExternalForm_ (a framed consent + signature form is a clickjacking surface too). Comment: revisit deliberately if the app is ever embedded.
S10 | 80_training.js, train/script_training.html, Tests.js | submitQuizAttempt returns `perQuestion: passed ? graded.perQuestion : null` (the QuizAttempts row still records them for managers). trainRenderQuizResult_ renders a failed attempt with the rep's answers and no marks, under "Which questions you missed is shown once you pass". The editor suite's quiz test asserts null on the fail and an array on the pass.
M6 | 00_config.js, 50_deptrequests.js, 10_core.js, 20_timeclock.js, metrics/script_deptrequests.html, cn/script_callnotes.html, mock.js | CONFIG `DR_SLA_DEFAULT_DAYS: 2` replaces `DR_SLA_DEFAULT_HOURS: 48`. drBusinessDayHours_ (the businessHours_ window), drSlaBizHours_ (days × day hours), drSlaDaysLabel_, drAgeWorkingDaysLabel_. `DR_SLA_TARGETS` keeps its name; the stored value now carries `_unit: 'days'` and drSlaParseTargets_ reads a blob without it as the pre-M6 HOURS map, converting each to its calendar intent (hours ÷ 24, to the half day, min 0.5) and flagging `legacy`. getDeptRequestSla_/drSlaForToDept_ return days; the tracker and the overdue digest band on drSlaBizHours_(days, dayHours); items and deptStats ship `slaDays` (was `slaHours`); the digest, the daily brief and the pending-task detail read "N working days open" / "past its 2 working days SLA". saveDeptRequestSla takes 0.5–30 in half days and stores `{_unit:'days', …}`. getAdminConfig and getDeptRequestSla share drSlaAdminView_ ({defaultDays, targets, legacy, businessDayHours, departments}); the editor inputs are working days (step 0.5) with a "set in hours — shown converted, review and save" note while legacy.
C12 | 30_callnotes.js, cn/script_callnotes.html | cnArchivedBefore_ (pure) / cnArchivedBeforeNow_: '' while CN_NOTE_ARCHIVE_DAYS is 0 or the range is newer, else the cutoff date. getMyCallNotes, getMyCallNotesRange, managerGetCallNotes and exportCallNotesRange ship `archivedBefore` (the export's "No notes found" error and its success result too). cnArchiveNoteHtml_ renders "Notes dated before <date> may have moved to the cold archive, which this view does not read — use Search with 'Include archive'" in History's and the per-rep view's empty state and under the export link; `.cn-archive-note` rule.

TEST RESULTS: passed — pure harness 1036/1036 (was 1031; +5 pins), DOM 156/156, lint:server clean, counts --check agrees, split manifest regenerated. Pins updated for the deliberate unit change (Category A): the drSlaForToDept_ strictest-SLA pin and N2's drDeptStats_ fold (hours → working days). Editor suite: two assertions added to the existing quiz test (no new registration). 11 bite-checks, all BITE: S6 admin-for-everyone · S6 id ignored · S6 status unguarded · S8 form ALLOWALL back · S10 marks back (server) · S10 marks back (client) · M6 legacy read raw · M6 wall-clock hours · M6 unit not stored · C12 never reported · C12 client silent. Visual (admin-config, deptreq, deptreq-expanded, training, qa-detail — light wide): 0px overflow, no missing fixture, only the proxy CERT line; the tracker reads "Overdue · 1 working day SLA" / "2 working days SLA" and the Billing tag "1 working day SLA". No scenario shows a failed quiz result, the legacy SLA note or an archive note (archiving is off in every fixture).
Regression scenarios (Test Command manual): S90 (QA), S74 (Dept Requests), S69-adjacent training quiz steps, S75/S97 (Admin config), S7/S9-adjacent History — NOT APPLICABLE here: each needs the deployed app; the pins drive the functions they walk.

REGRESSION RISKS:
- M6 moves every Dept Request deadline: a 48-hour target was ~5.3 working days as business time and is now 2 working days, so requests turn at-risk and overdue sooner — the intended correction, and a visible jump on the tracker and in the digest the day it deploys.
- M6 legacy conversion reads every stored hours value as CALENDAR intent (÷ 24). A target set after 2026-08-31 by someone who meant business hours (e.g. 9 = one business day) now reads as half a day. The Admin editor flags the map until an admin saves; the operator should review each value.
- S6 refuses a QA member on recordings attributed to them; a reviewer whose roster name collides with an unattributed-by-id agent name is refused too (the name match is the My Reviews rule). Admins are exempt.
- S8: if anything embeds the app after all, it stops rendering inside that frame (the operator confirmed nothing does).
- S10: reps lose per-question feedback on a failed attempt — deliberate; the score still changes one question at a time, so probing is slower, not impossible.
- C12: nothing changes while archiving is off.

INVARIANTS AT RISK: None broken. Touched: INV-138/INV-131 family (DR SLA bands — the unit changed, the band rule did not), INV-136 (admin gates unchanged), spec §9.4 (the correct answer is still never revealed; per-question marks now only after a pass — the spec text must change), INV-185 (fixtures carry slaDays / defaultDays), the T6 ratchet (.cn-archive-note has a rule; .cn-admin-sla-days is a hook), g57 (no var() fallback on a defined token).

NET SCORE: 1 − 1 = 0
- Production fix (fired this month): M6 — every Dept Request deadline has been ~2.5x loose since 2026-08-31, on the tracker and in the daily digest.
- New failure mode: M6's legacy conversion can misread a post-August hours target that meant business hours (flagged in the editor; operator review).
- S6, S8, S10 and C12 close gaps nothing shows was exploited or reachable this month (S6/S10 policy gaps, S8 an attack surface, C12 behind archiving that is off).

OPERATOR ACTIONS / DEPLOY:
- After deploy, open Manage → Admin → Config → Dept-Request SLA targets: if the legacy note shows, check each department's converted working-day value and Save (which stores the new unit) | BLOCKS DEPLOY: N
- Tell managers Dept Request deadlines are now 2 working days by default (they were effectively ~5) | BLOCKS DEPLOY: N
- Tell QA reviewers they can no longer review their own calls; an admin can | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → New version (with everything else in cycle 22 — none is deployed yet)

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- S6 is enforced on the server only: the QA detail still offers the Score / Share / Status / Agent controls on one's own recording and refuses on use. Hiding or disabling them needs an `own` flag on the queue payload.
- S6 does not stop a member SELF-ASSIGNING their own recording (qaAssignRecording) or commenting on it — outside the four actions decided.
- C12's full fix (Export, History and the per-rep view reading NotesArchive) stays deferred until archiving is turned on.
- No visual scenario shows a failed quiz result, the SLA legacy note, or an archive note.

DOCUMENTATION UPDATES NEEDED:
- docs/training-employee-docs-spec.md §9.4 / the submitQuizAttempt contract: per-question booleans only on a passing attempt.
- docs/operator-state.md: `DR_SLA_TARGETS` now in working days with `_unit`; the legacy conversion and the review step; the Inter-department request tracking entry's "48h" wording; QA self-review rule under the QA module entry; framing (S8) under the web-app/ANYONE_ANONYMOUS decision.
- docs/design-decisions.md: the web app framing decision (S8), and a decision entry for SLA targets in working days (M6).
- docs/gotchas.md + CLAUDE.md: consider a gotcha for M6 — "a unit that silently changes meaning when what it is compared against changes" (hours vs business hours).
- docs/modules.md, docs/operator-log.md, docs/test-harness-log.md; .cycle/config.md invariants (self-review refusal, no framing, marks-after-pass, SLA working days, archive note) and walk steps on S90, S74, S97, and a quiz step.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
