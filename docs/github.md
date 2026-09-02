repo: robinchoudhuryums/team-tools
branch: main
path: web-app

## Last sync
date: 2026-09-01T22:45:00Z
tree: df931a9f6137

### Updated in this project
- Re-checked all five handoffs against the repo's current state (cycle 18 closed; the 19pre rounds shipped QA Phase 3, ALL-CST, business hours, Workstreams A/A4/B, Admin sub-tab coverage).
- Added `HANDOFF.md` Part 6 — what the repo's movement invalidates: 4 recommendations already built, 1 contradicting a deliberate security posture, 1 that would fail CI as written, 2 live design questions handed back to the operator.
- Appended dated addenda to `QA_HANDOFF.md`, `TIME_CLOCK_HANDOFF.md`, `ADMIN_HANDOFF.md`, `COACHING_HANDOFF.md`.
- Intake email work remains parked at operator request.

## Sync history
- 2026-08-31T19:20:00Z — wrote `HANDOFF.md` consolidating Coaching, Manage, QA, Admin and Time Clock.
- 2026-08-31T19:12:00Z — intake emails (PMD/PAP/PPD) redesigned for CRM transcription; later parked.
- 2026-08-31T18:26:00Z — Time Clock reframed as a dashboard; "Needs you" block.
- 2026-08-28T20:32:00Z — Admin: System promoted to its own sub-tab, findings ranked over all-clears.
- 2026-08-27 — QA module reviewed; audit-coverage board, two-pane detail, pause-and-pin comments.
- 2026-08-26 — Manage module surveyed; Punctuality redesign, Manage Time reorder, shared date range.
- 2026-08-26 — Coaching redesigned; critical-severity notification email; email unity inventory.

## Screen map
| Screen | Built from |
|--------|-----------|
| Manager · Team Coaching | `web-app/train/script_coaching.html` (`coachRenderMgr_`, `coachAnalyticsHtml_`, `coachCardMgr_`) |
| Rep · My Coaching | `web-app/train/script_coaching.html` (`coachRenderMy_`, `coachCardMy_`, `coachAck_`) |
| Composer drawer | `web-app/train/script_coaching.html` (`coachRenderMgr_` composer block, `coachCreate_`) |
| Critical notification email | `.cycle/HISTORY.md` (2026-08-13 email-alignment audit; 2026-08-11 branded restyle), `docs/design_handoff_team_tools_redesign_update/email_styling.md` |
| Email unity inventory | `.cycle/HISTORY.md` — `buildBrandedEmailHtml_`, `brandedKvRows_`, `intakeEmailShell_`, `CN_EMAIL_PALETTE`, `safeWebAppUrl_` (`Code.js` exceeds the readable size cap) |
| Manage · Punctuality | `web-app/tc/script_manager.html` (`enterPunctualityView`, `punctRender_`, `punctPreset_`) |
| Manage · Manage Time | `web-app/tc/script_manager.html` (`enterManagerView`) — **rebuilt since: Workstreams A/A4/B + SWR paint-last-good** |
| Manage · Coverage | `web-app/tc/script_manager.html` (`enterCoverageView`, `covRender_`, `covDayRisks_`) |
| Manage · Admin (System details) | `web-app/cn/script_callnotes.html` (`enterCallNotesAdminView`, `cnToggleSysDetails_`, `cnSysCardShell_`/`cnSetSysFromHealth_`, `cnRenderHealthPanel_`, `cnRenderStoragePanel_`, `cnRenderDeployReadinessHtml_`, `cnQueueInventoryHtml_`); VIS-ADMIN pin in `test/client/run.js` |
| Intake emails (PMD / PAP / PPD) | `web-app/intake/script_intake.html`; builders are server-side `Code.js` (`intakeEmailShell_`), not in this repo |
| Manage · tab registry | `web-app/script_core.html` (`TOOLS.manage`) |
| Time Clock · Dashboard | `web-app/tc/script_clock.html` (`renderClockView`, `renderActions`, `renderPunchHistory`, `buildStatusSentence_`, `clkBreakScheduleHtml_`, `clkGreetRotStart_`, `clkSkyFor_`, `clkLoadDashboard_`) |
| QA · Recordings queue + detail | `web-app/qa/script_qa.html` (`enterQaQueueView`, `qaRenderQueue_`, `qaCardHtml_`, `qaRenderDetail_`, `qaSubmitComment_`) |
| QA · Stats + Calibration | `web-app/qa/script_qa.html` (`enterQaStatsView`, `qaRenderStats_`); `qaCalibration_` server-side |
| QA · My Reviews | `web-app/qa/script_qa.html` (`enterQaMyReviewsView`, `qaRenderMyReviews_`, `qaMyRevPlay_`, `qaMyRevWave_`, `qaScorecardListHtml_`) |
| Signal board table chrome | `web-app/metrics/script_metrics.html` (`.m-table`), `web-app/script_core.html` (`mtRenderTable_`) |
| Token / component vocabulary | `web-app/styles_design_tokens.html`, `web-app/script_icons.html` |
| Handoff format precedent | `docs/design_handoff_team_tools_redesign_update/README.md` |

## Cycle blocks read this sync
`19pre-admin-subtabs`, `19pre-allcst-policy`, `19pre-qa-phase3`, `19pre-qa-followons2-perf`,
`19pre-business-hours`, `.cycle/STATE.md`, `.cycle/HISTORY.md` (truncated).
