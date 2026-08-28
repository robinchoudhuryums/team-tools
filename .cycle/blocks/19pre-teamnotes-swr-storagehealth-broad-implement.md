# 2026-08-28 #3 — Team Notes load-time check + Storage Health QA retention line (operator follow-up)

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- TN-SWR | Team Notes optimization check (operator: "check Team Notes next") — investigated first: the shell painted synchronously and mgrEnrolledReps was session-cached, but the two QUEUE fetches (managerGetTrainingQueue / managerGetReviewCandidates — cross-rep Sheet walks, the heaviest CN manager reads) and the STATS fetch (managerGetShiftStats, another cross-rep walk) re-ran with a skeleton on EVERY enter and sub-tab switch. Fixed with the session-state SWR pattern.
- SH-QA | Storage Health QA store row + live retention window (operator: "can be enabled") — getStorageHealth had never gained the QA store at all.

Files modified: web-app/Code.js, web-app/cn/script_callnotes.html, test/visual/mock.js, test/client/run.js, CLAUDE.md, .cycle/STATE.md, .cycle/blocks/

CHANGES:
TN-SWR | cn/script_callnotes.html | cnMgrLoadQueue_ paints CN_STATE.mgrQueueCache[kind] instantly + the refreshing pill on a warm kind (skeleton only cold); cnMgrLoadStats_ paints the per-DATE CN_STATE.mgrStatsCache entry (a warm date flip paints instantly). Cache writes are KEY-EXACT and land BEFORE the mgrSubSeq/view check (INV-156 — a stale response warms its own key; only the render drops) and CLEAN-ROUND-ONLY (an {error} round, a queue round with skippedReps, or a stats round with any notesUnavailable rep renders but never becomes the instant paint — INV-129/187). C17-5 failure split on BOTH response shapes: painted → warn toast keeps the last-good queue/stats; cold → errorStateHtml_. Per-Rep + Search stay COLD by design — a bounded single-rep date-slice read and an on-demand query are not the reported slowness — and the pin asserts them outside the caches. First-load-of-session is unchanged (the cross-rep walks are real work); every re-enter and tab switch becomes instant.
SH-QA | Code.js, cn/script_callnotes.html, test/visual/mock.js | getStorageHealth gains the 'QA (recordings)' store row (prop QA_SS_ID, cls QA/HR-adjacent): its retention field is BUILT from the live qaReviewRetentionDays_() — "Review-record purge ENABLED — N days (QaComments + QaScorecards only; recordings index + Drive files never touched)" once the operator sets the window, the disabled default otherwise — so an enabled purge is visible where every other store's policy already is (INV-196). The client's not-set pill reads QA as a muted FACT (the External/HR no-fallback-by-design tone), not a warning; deployReadinessItems_ picks the row up generically (unset → the optional warn, like HR). Fixture row added per INV-185 so the admin scenario renders the line on camera.
PINS | test/client/run.js 686→688 | TN-SWR (warm paint + pill; skeleton cold; clean-only cache write BEFORE the seq check; per-date key-exact stats write to requestedDate; the painted/cold failure split counted on both shapes ×2 loaders; Per-Rep + Search outside the caches) and SH-QA (retention built from the live getter with both branches + the never-purged clause; the muted pill set includes ^QA; the fixture row exists).

TEST RESULTS: pure 688 passed / 0 failed; DOM 82 passed / 0 failed. 5 mutations / 5 bites, commit-before-bite: (A) clean-round gate dropped from the queue cache write → TN-SWR; (B) painted warn-toast branch removed from the queue {error} path → TN-SWR; (C) stats cache written to the CURRENT picker date instead of requestedDate → TN-SWR; (D) retention hardcoded (live-getter consult dropped) → SH-QA; (E) fixture QA row removed → SH-QA. Regression Scenarios walked: S24/S26/S37/S57 (Team Notes queues/per-rep/stats/drill — loaders changed only in WHEN they render; the drill path, INV-146 seq guards, skippedReps notes and error cards are all asserted intact) PASS; S90 + the Storage Health half of the Admin scenarios (the new row renders generically through cnRenderStoragePanel_) PASS; full 54-scenario shoot clean (admin scenario renders the QA row in place).

REGRESSION RISKS: (1) A manager can read a one-refresh-stale queue for the seconds the pill shows — the accepted SWR trade, and a mutation-heavy path (training reply) lives on Per-Rep, which stays cold. (2) The Stats per-date cache grows one entry per browsed date per session — bounded by a session's realistic browsing, never persisted. (3) Deploy readiness now shows an "Optional — unset" warn for deployments without QA_SS_ID — consistent with HR's existing shape.

INVARIANTS AT RISK: None violated — INV-146 seq guards untouched and still asserted; INV-129/156/187 followed for the caches; INV-196 amended (Storage Health surfacing); C17-5/INV-175 posture followed for the failure split.

NET SCORE: 1 production fix (the Team Notes load-time class of the operator's original report, now closed across all three named-slow manager surfaces) − 0 new failure modes = +1. SH-QA is a capability (additive observability).

OPERATOR ACTIONS / DEPLOY:
- None new — this round adds no properties, triggers, or migrations | BLOCKS DEPLOY: N
- Post-deploy `runAllTests()` — still expects **296** | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy (ships with the whole undeployed PR set).

FOLLOW-ON ITEMS:
- The DEPT_REQUESTS_SS_ID dedicated sheet remains the one store Storage Health does not surface (the storage map's own standing note) — same generic-row shape would close it.
- Re-opening agent visibility of My Reviews stays one registry line + a deliberate QA-14 rewrite, waiting on the operator.

DOCUMENTATION UPDATES NEEDED: None — applied in this session (CLAUDE.md: Storage Health KDD seven→eight stores + the QA-line sentence, storage-map "keep all eight", INV-196 Storage Health clause, new 2026-08-28 #3 operator entry, narrative counts → 688; STATE.md NEWEST #8 + Test Command counts).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
