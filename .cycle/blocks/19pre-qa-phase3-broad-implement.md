# /broad-implement "QA Phase 3" — 2026-08-27 (between-cycles operator work)

Scope note: Phase 3 (sampling, calibration, agent-facing reviews) was recorded
as blocked on revisiting the v1 "agents do not see their reviews" gate
decision. The operator's `/broad-implement QA Phase 3` command IS that revisit
— implemented with conservative postures (explicit per-recording release;
read-only, doubly-scoped agent view; no agent audio path).

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: QA Phase 3 — (1) explicit share-to-agent release,
(2) agent-facing read-only My Reviews tab, (3) coverage-fair sampling,
(4) reviewer calibration table
Files modified: web-app/Code.js, web-app/qa/script_qa.html,
web-app/script_core.html, web-app/Tests.js, test/client/run.js,
test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md, .cycle/STATE.md

CHANGES:
P3-share | Code.js, qa/script_qa.html | Trailing `SharedMs` column on
  QaRecordings (0 = unshared; extended in place — QA merged but undeployed,
  QA_SS_ID unset everywhere, no live tab to migrate). `qaSetRecordingShared`
  (QA-gated, locked): REFUSES until the recording carries an Agent
  attribution (a share with no attribution would release to nobody while the
  pill claims otherwise); a status flip never auto-shares; unshare withdraws;
  audit `QaShare` is fileId+flag only. Client: "shared with agent" pill +
  Share/Unshare button on the detail's agent row.
P3-myreviews | Code.js, qa/script_qa.html, script_core.html, Tests.js |
  `getMyQaReviews`: EMPLOYEE-gated (bare read `{error:'Not authorized.'}` —
  the GATE-SHAPE rule; deliberately NOT canSeeQa_), DOUBLY scoped (SharedMs
  set AND Agent = caller's roster name, trimmed ci), strictly read-only
  (getSheetByName — never provisions; unset store → empty list), latest
  scorecards + ACTIVE comments only, capped 50, NO audio path (playback stays
  behind the canSeeQa_ Drive boundary — follow-on). Registry: UNGATED
  `qaMyReviews` tab — the deliberate Phase-3 gate change that makes the QA
  tool visible to every rep (queue/stats stay `also:'canSeeQa'`). Client:
  `enterQaMyReviewsView`/`qaRenderMyReviews_` — read-only cards (no controls,
  no audio, no scorecard form) rendering through the SHARED
  `qaScorecardListHtml_` builder (refactored out of the reviewer detail so
  the two surfaces cannot drift), seq-guarded, errorStateHtml_ ×2. Tests.js:
  the QA gate case grew to 14 endpoints + a `getMyQaReviews` read-shape
  rejection (asserted via `.error`, never `_assertFailure` — the GATE-SHAPE
  lesson), IN PLACE.
P3-sample | Code.js, qa/script_qa.html | `qaSampleRecordings(count)`
  (QA-gated, locked, 1–10): candidates = status-new + unassigned only;
  assigns to the CALLER exclusively (the signature takes only a count —
  routing work to others stays the queue's manager Assign); pure
  `qaSamplePick_` is coverage-fair (lowest done-reviews + picked-this-round
  load per agent key, random tie-break, injectable rand; blank agent buckets
  under '(unassigned)'); counts-only `QaSample` audit. Client: "Sample 3 for
  me" toolbar button.
P3-calibration | Code.js, qa/script_qa.html | Pure `qaCalibration_`:
  recordings whose latest-folded cards span 2+ reviewers with computable
  means — per-reviewer card means (1dp), spread (max−min), widest
  per-criterion gap where 2+ reviewers rated the SAME criterion (a lone
  rating is not a disagreement); spread-desc sort; FACTS ONLY (the Coverage
  rule — no verdict tone). `getQaStats` attaches `calibration` (+ recording
  names for the join); client renders the table via mtRenderTable_ with an
  em dash for an unset gap key, section suppressed when empty.
Pins | test/client/run.js (676→680) | QA-11 (qaSamplePick_ behavioural with
  injected rand + endpoint contract), QA-12 (share-requires-attribution
  before the write; getMyQaReviews gate shape + both scope filter lines
  verbatim + read-only/active-only/capped + the Tests.js read-shape case),
  QA-13 (qaCalibration_ behavioural), QA-14 (ungated tab + read-only render
  + one shared builder + seq/error discipline + fixture keys DERIVED from
  the server's own `mine.push({...})` literal — INV-185/188).
Fixtures | test/visual/mock.js, shoot.mjs | getQaQueue items carry sharedMs;
  getQaStats carries a calibration block; new getMyQaReviews fixture;
  matrix 52→53 (`qa-myreviews-light-wide`).

TEST RESULTS: pure 680/680, DOM 82/82, all green. 6 mutations / 6 bites:
(A) SharedMs filter dropped → QA-12; (B) name-scope dropped → QA-12;
(C) share-without-agent allowed → QA-12; (D2) reviewers.length guard
weakened → QA-13; (E) sample assigns a non-caller value → QA-11;
(F) within-round picked-load fairness dropped → QA-11. Bite D (first
attempt) exposed an EQUIVALENT MUTANT: `cards.length < 2` in qaCalibration_
is an optimization fully shadowed by the load-bearing `reviewers.length < 2`
guard — the bite was re-aimed at the real guard and the pin documents which
guard it mutates. Editor suite (manual, post-deploy): ≈311 test functions,
runAllTests still expects 295 — the QA gate case grew IN PLACE.
Regression Scenarios walked: S90 (Phase-3 steps added — share/scope/sample/
calibration paths verified in source + pins; player/live halves remain
manual post-deploy), S25/S48 registry checks N/A (tab keys unchanged;
qaMyReviews added, tabVisibleForUser_ unmodified).

REGRESSION RISKS: The QA tool now appears in EVERY rep's sidebar (one
read-only tab) — a deliberate, operator-commanded gate change, documented as
behaviour change (e) in the operator entry, not an accident. QAR header/enum
extension is safe only because no QaRecordings tab exists anywhere yet
(QA_SS_ID unset; Phase 1 never deployed) — pinned in QA-10's rewritten
header assert. getQaQueue/getQaStats payloads gained additive fields only.

INVARIANTS AT RISK: INV-196 AMENDED (14-endpoint gate list, the
getMyQaReviews employee-gate exception + its double scope, Phase-3 contracts
section (e), verify line QA-1..14). INV-32 held (QaShare/QaSample audits are
id/count-only). INV-156 held (myRevSeq guards). INV-169 held (My Reviews cap
is a display cap on the agent's own list — total not owed, nothing hidden
that the agent is told exists). INV-187 held (em-dash gap key; empty
calibration suppressed). GATE-SHAPE rule held (bare {error} read). INV-136
untouched (no admin-tier change).

NET SCORE: 0 − 0 = 0 (capability round — Phase 3 features; no production
defect existed to fix, none introduced. The Phase-1/2 code paths are
unchanged except additive fields.)

OPERATOR ACTIONS / DEPLOY:
- None beyond the standing QA setup (QA_SS_ID / QA_RECORDINGS_FOLDER_ID /
  QA_MEMBERS — Phase 1's entry) | BLOCKS DEPLOY: N
- Post-deploy: runAllTests() expects 295; walk S90 incl. the new Phase-3
  steps | BLOCKS DEPLOY: N
Deploy: Server + all client subsystems: `cd web-app && clasp push -f`, then
Apps Script editor → Deploy → Manage deployments → Edit → Version: New
version → Deploy. (Ships together with the still-owed PR #176/#177 +
Part A + QA 1–2 + break-editor deploys — ONE New version covers all.)

FOLLOW-ON ITEMS:
- Agent audio playback for SHARED reviews (would need a scoped chunk
  endpoint outside canSeeQa_ — kept behind the Drive boundary for now, v3).
- Admin editor for QA_SCORECARD_CRITERIA (property-only today).
- QA recording DETAIL visual scenario (needs chunked audio the mock cannot
  serve — the standing matrix gap).
- QaScorecards/QaComments retention tier (the ViewUsage/ClientErrors class —
  none exists, documented).

DOCUMENTATION UPDATES NEEDED: None outstanding — applied in this session:
CLAUDE.md (QA Projects paragraph Phase-3 rewrite; INV-196 amendments;
storage-map SharedMs; Phase-1 setup entry's "agents never see it" line
amended; operator entry extended with Phase-3 behaviour changes (e)–(h);
S90 Phase-3 steps; narrative counts 676→680, matrix 52→53), .cycle/STATE.md
(NEWEST #5 block + Test Command counts).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
