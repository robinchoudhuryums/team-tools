---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: operator /broad-implement 2026-08-27 — (1) UI Break
schedule editor (the follow-on to "where does the break schedule
information go?" — breaks were CONFIG-only, i.e. a redeploy); (2) QA
Module Phase 2 per the scoped plan: waveform, scorecards, per-agent
stats. Plus one Phase-1 QA defect found in review and fixed in scope.
Files modified: web-app/Code.js, web-app/cn/script_callnotes.html,
web-app/qa/script_qa.html, web-app/script_core.html, web-app/Tests.js,
test/client/run.js, test/visual/mock.js, test/visual/shoot.mjs,
CLAUDE.md, .cycle/STATE.md

CHANGES:
BRK | web-app/Code.js + cn/script_callnotes.html + Tests.js | Script
  Property SHIFT_BREAK_SCHEDULES: breakSchedSanitize_ (pure, lenient —
  L-12 sanitize-on-read; explicit-EMPTY kept, distinct from absent) +
  getBreakSchedules_ (memoized per execution — getShiftSchedule_ runs
  per-rep-per-day in the coverage walks) merged into getShiftSchedule_
  AHEAD of the CONFIG chain (property tz key → property DEFAULT → CONFIG
  tz breaks → CONFIG DEFAULT breaks; `!== undefined` consults so an
  explicitly-empty list means "no breaks", never "inherit").
  saveBreakSchedules: ADMIN-gated (INV-136 count 46→47 — the F7 doc-count
  net, the F9 gate-coverage net, and the GATE-TIER omnibus map all
  updated in the same commit), STRICT named-error validation (everything
  it accepts round-trips through the sanitizer unchanged — pinned), an
  all-default save DELETES the property (the umsTheme posture),
  AdminConfigChange audit, memo reset. breakSchedulesAdminView_ resolves
  every key through empShiftSchedule_(null, …) — the INV-149 resolver
  caught the first direct getShiftSchedule_ call — and ships on
  getAdminConfig.breakSchedules + the save's return, so the editor never
  renders a client paraphrase (INV-185 server-side). Client: an Admin →
  Config "Break schedules" card — per-key sections, INHERITED sections
  read-only until Customize (only data-custom="1" sections enter the
  payload, so an untouched Save never freezes inheritance), Revert
  renders a labeled pending state, add-timezone seeds from Default with
  a roster-tz datalist, one reminder-lead field, A14 names throughout.
QA2-server | web-app/Code.js + Tests.js | Trailing Agent column on
  QaRecordings (extended IN PLACE — Phase 1 is merged but NOT deployed
  and QA_SS_ID is unset everywhere, so no tab exists to migrate) +
  qaSetRecordingAgent (QA-gated, locked, ≤80 chars free text with roster
  names offered client-side; the audit row NEVER carries the name —
  INV-32/196). QaScorecards tab (append-only; latest per (recording,
  reviewer) wins via pure qaLatestScorecards_ — a tie keeps the later
  appended row): qaSaveScorecard validates against the LIVE criteria
  (QA_SCORECARD_CRITERIA seed + same-named Script Property override,
  qaCriteriaSanitize_ sanitize-on-read) and REJECTS an unknown ratings
  key by name — refuse-not-drop, a review record must not silently lose
  ratings; qaListScorecards (latest per reviewer + criteria + self).
  getQaStats: bounded reads, truncation reported (INV-169), pure
  qaStatsAggregate_ — the (unassigned) bucket stays VISIBLE, a card for
  an un-indexed recording never invents an agent, per-criterion averages
  are null-not-0 (INV-187), avgScore = mean of card means. Tests.js QA
  gate case grew to 12 endpoints IN PLACE.
QA2-client | web-app/qa/script_qa.html + script_core.html + fixtures |
  Waveform: 8 kHz mono OfflineAudioContext decode (a naive full-rate
  decode of a 40-min call is hundreds of MB) → pure qaPeaks_ → canvas
  bars with played-portion tint + click-to-seek; strictly DECORATION —
  the seq guard sits BEFORE the peaks write (INV-156), a 25 MB gate
  bounds decode cost, and every failure leaves the Phase-1 flat
  timeline; decoded PCM freed once peaks exist; .qa-wave[hidden]
  companion rule (the [hidden] specificity gotcha). Scorecard card:
  1–5 rating buttons (aria-pressed; clicking the selected value
  UNSELECTS — the intake pattern), notes, save; list of latest cards per
  reviewer; the form seeds from MY latest card so a re-score adjusts.
  Agent field with datalist. New qaStats registry tab (managerOnly +
  also:'canSeeQa') → summary strip + mtRenderTable_ with dynamic
  criterion columns (null → em dash). Fixtures: getQaQueue gains
  agent/agentOptions/criteria, getQaStats added (INV-185 shapes);
  scenario qa-stats-light-wide (matrix 51→52).
FIX (Phase-1 defect, in scope) | web-app/qa/script_qa.html | the
  detail's Start review / Mark done / Reopen onclicks called qaStatus_ —
  a SERVER helper name; the client fn is qaChangeStatus_, so all three
  buttons threw ReferenceError. Invisible to jsdom (outside-only never
  compiles inline onclick) and the detail has no visual scenario. Fixed
  + held by QA-7's derived onclick-resolves scan (every onclick handler
  name in the qa partial must be a defined function).

TEST RESULTS: pure 668→676 (BRK-1..4 + QA-7..10), DOM 82, all green.
10 mutations / 10 bites (empty-array-falls-through, memo removed, gate
deleted, start-validation dropped, dead onclick restored, confident-0
per-criterion, silent-drop unknown key, agent name in audit, waveform
seq guard removed, tie-keeps-earlier fold). One pin corrected on first
write (its regex missed the source's escaped onclick quotes) — the
code was right, the pin was wrong. Editor suite ≈ 311 unchanged (the
omnibus gained the saveBreakSchedules case; the QA gate case widened) —
post-deploy runAllTests still expects 295. Visual matrix 51→52; full
re-shoot run this session (52 scenarios — see report.json summary).
BUILD HAZARD worth keeping: an Edit landed a LITERAL NUL byte in
Code.js (grep reported the file binary — the exact kbMd_ sentinel
hazard); replaced with a space sentinel via a python bytes-edit.

REGRESSION RISKS: getShiftSchedule_ now consults one memoized Script
Property read per execution (behavior byte-identical while the property
is unset — pinned); QA_RECORDINGS_HEADERS grew a trailing column
(unreleased feature, no tab exists anywhere); everything else additive.
INVARIANTS AT RISK: none violated. INV-136 amended (47 +
saveBreakSchedules), INV-196 amended (Phase 2 contracts + the 12-endpoint
gate list + the onclick-resolves rule), the CONFIG.SHIFT_SCHEDULE
operator entry amended (CONFIG is now the SEED; the editor is the
no-redeploy path).
NET SCORE: 1 production fix (the dead Phase-1 status buttons — they
would have fired on first real use post-deploy) − 0 new failure modes
= +1 (capabilities: 2)

OPERATOR ACTIONS / DEPLOY:
- None to set up. SHIFT_BREAK_SCHEDULES is auto-managed (written by the
  new Admin card); QA_SCORECARD_CRITERIA is optional | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` + New version (ships with the
pending PR set). Post-deploy: runAllTests() expect 295; then the S76
break-editor walk (edit a break, watch the Clock chip follow) and the
S90 Phase-2 walk (agent + scorecard + stats + working status buttons).

FOLLOW-ON ITEMS:
- QA Phase 3 (sampling, calibration, agent-facing reviews) — blocked on
  revisiting the v1 "agents don't see reviews" gate decision.
- No Admin editor for QA_SCORECARD_CRITERIA (property-edited; the
  break-schedule card is the template if the operator wants one).
- The QA recording DETAIL (player + waveform + scorecard) remains an
  uncovered visual scenario (needs chunked audio the mock cannot serve).
- QaScorecards has no retention tier (the ViewUsage class — acceptable).

DOCUMENTATION UPDATES NEEDED: none — applied in-session (INV-136 count
47 + name, Common-Gotchas admin-tier count 47/32, CONFIG.SHIFT_SCHEDULE
operator entry, new round operator-state entry, QA Projects paragraph
Phase-2 rewrite, storage-map QA row, INV-196 amendments, S76 + S90
extensions, test-narrative counts, STATE.md).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
