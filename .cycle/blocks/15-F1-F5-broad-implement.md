---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: F1 (dead CONFIG declarations), F2 (CDR col-4 positional read), F3 (roster-inclusion predicate), F4 (visual fixture reimplemented server logic), F5 (INV-169 cites removed fields)
Files modified: web-app/Code.js, test/client/run.js, test/visual/mock.js, CLAUDE.md

CHANGES:
F3 | web-app/Code.js | NEW `empRosterEmail_(row)` — the ONE roster-inclusion predicate (trimmed email or ''). ALL FOURTEEN roster walks now route through it. The audit named nine; five more (getEnrolledCallNotesReps, getCallNotesEnrollment, trainOverdueForRoster_, getIntakeAgents, getTrainingDashboard) surfaced during implementation and had to be included — a predicate only 9 of 14 sites use is not shared, and the tripwire would be unenforceable. getTeamMetrics and getPunctualityReport gained the check they never had.
F1 | web-app/Code.js | REMOVED four declared-but-unread CONFIG keys: CDR_DEPARTMENT, CALL_NOTES.SUBFORM_COL_JSON, CALL_NOTES.TRAINING_DIGEST_WEEKDAY, CALL_NOTES.REVIEW_DIGEST_WEEKDAY. EOD_WARNING_WINDOW_MINUTES retained but its comment now says DEAD (it described the value as if live). The hardcoded FRIDAY in installAutomationTriggers gained a comment explaining that the weekday is deliberately not configurable.
F2 | web-app/Code.js | cdrQueueInventory_'s read offsets are DERIVED from the CDR enum (qFirst/qWidth/oDate/oAgent/oQueue) instead of bare 0/1/2 with a literal width of 3. The header-validation half was attempted and REVERTED — see REGRESSION RISKS.
F4 | test/visual/mock.js | The fixture's hand-rolled queue→department fold (which had ALREADY drifted — it omitted the per-group queues.sort()) replaced by VERBATIM copies of groupQueueRows_, CDR_QUEUE_UNGROUPED and the CDR_QUEUE_GROUPS seed under a DO-NOT-EDIT banner; the fixture now calls the real function.
F5 | CLAUDE.md | INV-169 no longer cites getSpanishInboxStats.pendingList/pendingListCap, which cycle-13 FO-5 removed. Its other two claims were verified live and correct.
— | test/client/run.js | +2 derived tripwires (F1 dead-CONFIG scan with a self-declaring allowlist; F4 fixture mirror). The cycle-12 F4 pin was GENERALIZED into the F3 rule: it now bans the raw guard shape anywhere in Code.js rather than asserting a literal in two named functions. The Phase 0 bounded-read pin was updated to assert enum-derived offsets and that DATE..QUEUE_EXT still spans 3 columns. MIRROR_INDEX gained the fixture entry.
— | CLAUDE.md | Two new Common Gotchas (roster predicate; dead declarations) + the visual-harness rule gained "a fixture must never REIMPLEMENT server logic".

TEST RESULTS: passed — 396 pure (was 394), 69 DOM, 0 failed. Eight revert scenarios bite-checked (F3 ×3, F2 ×1, F1 ×2, F4 ×2); all bite. Two pre-existing pins encoded the OLD literal shapes and were updated as part of the fix, not reactively. Visual matrix re-shot: report.json `missing: []`; the fixture's fold verified behaviourally in Node (groups resolve, queues sort within a group, reps is the max lower bound).

REGRESSION SCENARIOS (Test Command is `manual`; Subsystems touched = Server, Test Suite):
S1 / S2 (smoke + full editor suite) | NOT RUN HERE — editor-only; operator must run runAllTests(). Expect 286, 0 failed; no test was added or changed on that side.
S9 (missed-punch alerts, computeMissedClockOuts_) | PASS by construction — raw-truthiness guard replaced by the trimmed predicate; identical for every row with a real email.
S10 (cross-tz live status, getManagerDashboard) | PASS by construction — same substitution.
S14 (teammate status) | PASS by construction — same substitution.
S26 (manager per-rep CN view, getEnrolledCallNotesReps) | PASS by construction — same substitution.
S41 / S42 (Metrics My Stats / Team Metrics) | S42 is the FIX — an offboarded name-only row no longer appears as a rep row nor contributes to teamTotals. S41 unchanged (already guarded, cycle-12 F4).
S58 (CN auto-provision enrollment) | PASS by construction — same substitution.
S59 / S60 (Intake sends, getIntakeAgents recipient picker) | PASS by construction — same substitution.
S67 / S68 (training assign/complete, quizzes) | PASS by construction — getTrainingDashboard + trainOverdueForRoster_ same substitution.
S72 (coverage planner) | PASS by construction — getCoveragePlan already trimmed; now via the predicate.
S24 (weekly manager digests) | PASS — F1 removed only unread constants; the trigger still fires Friday 8am (ScriptApp.WeekDay.FRIDAY, untouched).
S62–S66, S69–S71, S3–S8, S11–S13, S15–S23, S27–S40, S43–S57 | NOT APPLICABLE — no code path they exercise was modified.
NOTE: none of these were EXECUTED — they require the deployed Apps Script and live sheets. "PASS by construction" means the substitution is behaviour-preserving for every row with a non-blank email; it is not an observation.

REGRESSION RISKS:
- The predicate TRIMS where nine call sites previously tested raw truthiness. A whitespace-only email cell that used to be INCLUDED is now excluded. That is the intended direction (INV-167's resolution) and makes fourteen walks agree, but it is a real behaviour change on that one cell shape.
- getTeamMetrics now excludes name-only rows. If any such row is a CURRENT employee whose email was merely never filled in, they disappear from the team table. Mitigation: they were already invisible to seven sibling surfaces, so the roster row is wrong either way — but an operator seeing a rep vanish should fill in the email, not revert this.
- F2: adding col 4 to CDR_EXPECTED_HEADERS was implemented and then REVERTED. validateCdrColumns_ substring-matches, and the real col-4 header text in the `call-data-reporting`-owned sheet has never been recorded here. A guessed entry would raise a false "Column drift in DQE Historical Data" warning and flip the Automation Health CDR card amber — the identical always-wrong-signal defect fixed earlier this session. Shipped the safe half (enum-derived offsets) and left the validation as a documented one-line operator close.
- F4 is test-only; it cannot affect production. It CHANGES existing screenshots for the By-department view (the fold now sorts queues within a group, as the server always did).

INVARIANTS AT RISK: None violated. Touched/strengthened: INV-124 (the cohort walks keep their skip, now via the predicate — the F3 pin still asserts skip-before-collect), INV-167 (the same predicate discipline extended to a second column), INV-179 (both new tripwires are derived, not hand-listed), INV-169 (corrected to match the code). No gated endpoint, lock, audit row, PHI boundary, or coercion path was modified.

NET SCORE: 1 − 0 = 1
(F3 is the one finding that produced wrong data a manager acts on. F1/F2/F4/F5 are structural/defensive: no runtime behaviour changed for F1 or F5, F2 shipped only the safe half, and F4 corrects the audit instrument rather than the product. The pre-existing fixture drift F4 fixed was real but affected screenshots only.)

OPERATOR ACTIONS / DEPLOY:
- Read the col-4 header text off the DQE tab and add `4: '<that text>',` to CDR_EXPECTED_HEADERS — the one-line close for F2's remaining gap | BLOCKS DEPLOY: N
- Re-run runAllTests() in the editor after deploying (expect 286, 0 failed) | BLOCKS DEPLOY: N
- CARRIED, DEV PROJECT ONLY: set Script Property INSTANCE_IS_PROD=false (cycle-13 A5) | BLOCKS DEPLOY: N
Deploy: Server + Test Suite — `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed. None block.)

FOLLOW-ON ITEMS:
- The audit's nine-walk sample undercounted by five. A roster walk is easy to add without noticing the convention; the F3 tripwire now catches the raw shape, but a walk that simply omits the check entirely is still only caught by review.
- Write-only column enum members (DR.TO_EMAIL, FS.CONSENT_AT/OPENED_AT, EDS.CERTIFICATE, TQA.PER_QUESTION_JSON, KB.REVIEWED_BY, ADP.LOCATION/REASON/STATUS) are declared and never read. Most are write-only BY DESIGN and documented as such; they were deliberately NOT touched, but there is no marker distinguishing "write-only on purpose" from "forgotten" the way EOD_WARNING_WINDOW_MINUTES now has one.
- FO-6 (remaining TimesheetArchive readers) — still carried from cycle 13, unchanged.

DOCUMENTATION UPDATES NEEDED:
- Done in this batch: two new Common Gotchas (roster predicate; dead declarations, incl. the F2 operator close), the visual-harness "never reimplement server logic" rule, and the INV-169 correction.
- Not done: INV-181/182 from cycle 14's reflection are still unadopted proposals, and cycle 15 adds two more candidates (roster inclusion predicate; declared-but-unread is a defect). /reflect should adopt or reject all four rather than let them accumulate.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
