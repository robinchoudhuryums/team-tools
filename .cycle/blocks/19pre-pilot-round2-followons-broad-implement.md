# Pilot-feedback Round 2 FOLLOW-ONS — broad-implement block (2026-08-24)

Scope: the three actionable follow-ons named by the round-2 block — the
Spanish pending fixture's claim-state + a sched-modal visual scenario, the
editor integration test for the scheduled-calls flow, and claim info on the
Dashboard Spanish card. Commits d748f2f + 39cb0c5 on
`claude/team-tools-roadmap-6e2l97` (stack on rounds 1/follow-ons/2).

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- R2-FU-A | Visual matrix: Spanish pending fixture claim-state + members/self;
  first modal-state scenario (sched modal) via a shoot.mjs `post` hook
- R2-FU-B | Editor integration test for the scheduled-calls flow +
  cleanupTestData ScheduledCalls sweep
- R2-FU-C | Claim info on the Dashboard Spanish card previews

Files modified: web-app/tc/script_clock.html, web-app/Tests.js,
test/visual/mock.js, test/visual/shoot.mjs, test/client/run.js

CHANGES:
R2-FU-C | tc/script_clock.html | `clkDashSpanishCard_`'s pending preview now
  renders the SHARED `spanishClaimPillHtml_` (typeof-guarded cross-partial —
  a paraphrase would be the INV-185 drift class in production code) with
  `self` from the pending payload; the pill lands inline on the
  `.dash-sp-from` line with a scoped 6px-margin rule. Info-only (no
  claim/release controls on the dashboard — the card is a preview; the
  Spanish tab is the action surface). Additive: an old server without
  `claim`/`self` renders exactly as before. The card was already
  `canSeeSpanish`-gated (INV-31), so the claimant identity (internal email)
  reaches only the same audience as the metrics tab.
R2-FU-A | test/visual/mock.js | `getSpanishInboxPending` fixture gains
  `claim` per item + `members` + `self` — the round-2 block's named INV-185
  gap. ALL THREE claim states are on camera: claimed-by-other (SAM pill +
  manager Release/Assign), unclaimed (Claim button), claimed-by-you ("you"
  pill). The CLAIMED item leads (oldest-first, matching the tab's sort) so
  the Dashboard preview's slide 1 carries the pill in every clock shot;
  `getSpanishInboxStats.pending` aligned 2→3 (a fixture that disagrees with
  itself reads as a bug in the screenshot). New `getMyScheduledCalls`
  fixture: one upcoming + one 2h-OVERDUE item — the overdue offset is pinned
  BEYOND `SCHED_FIRE_LATE_MS`, so the modal shows the overdue tone without a
  sticky reminder toast covering the shot (INV-190's fire window respected
  by construction).
R2-FU-A | test/visual/shoot.mjs | Optional 6th scenario element `post` — a
  JS expression evaluated after nav settles; the matrix's FIRST mechanism
  for shooting a MODAL state (the Visual Audit Stage's named gap: it shoots
  tab landings only). New scenario `cn-sched-modal-light-wide` opens the
  sched modal via `cnOpenSchedModal_()`. Verified live: modal renders the
  create form + Upcoming·2 with overdue tone, no missing fixtures,
  overflowPx 0; spanish-light-wide + clock-light-wide re-shot clean and
  EYEBALLED (claim pills confirmed on both).
R2-FU-B | web-app/Tests.js | `test_scheduledCalls_flow` (registered as an
  integration test): create (tomorrow 10:30 derived in the TARGET rep's OWN
  tz — the mixed-frame editor-test hazard, future at every run time) →
  INV-32 audit assertion (the ScheduledCallCreate row carries the id and
  NOT the label) → owner list → cross-rep isolation (another rep neither
  sees it nor can status it — 'not found') → status whitelist + done
  transition → three validation rejects (shape / past / horizon), with a
  finally sweep of TEST_-EmpId rows. `cleanupTestData` gains the
  ScheduledCalls TEST_-prefix backstop sweep (INV-21; getSheetByName only —
  cleanup never provisions the tab). Runs at the post-deploy
  `runAllTests()` (editor-only, like every integration test).
tests | run.js | +5 pins (607 → 612), 7 mutations / 7 bites — TWO pins were
  STRENGTHENED when their first bite exposed them as weaker than their
  property: (a) the claim-key check used a joined-string `indexOf`, which
  substring-matched a drifted `at` inside `atMs` — now exact set
  membership (match the SET, never the concatenation); (b) the sched
  fixture-shape check read only the FIRST item, so a key drift in item 2
  passed — now every item. The pins: dashboard pill wiring
  (typeof-guard + self + placement + CSS), fixture claim/members/self with
  keys DERIVED from `spanishClaimsFold_`'s own literal (the seams-18 F3
  pattern) + all three states present, sched fixture keys derived from
  `getMyScheduledCalls`' return map + the overdue-beyond-fire-window
  arithmetic (both sides evaluated, not pattern-matched), the shoot.mjs
  post hook + scenario, and the Tests.js registration + sweep +
  PHI-free-audit assertion.

TEST RESULTS: pure 612/612, DOM 75/75, node --check clean (Code.js +
Tests.js). Visual harness: the three affected scenarios shot clean (no
missing fixtures, overflowPx 0) and the PNGs were opened — sched modal,
three claim states, dashboard pill all confirmed on camera. Scenario walk
(Client Time Clock views + Test Suite): S39 PASS (dashboard renders — the
change is inside the Spanish extras card, verified on camera); S3/S25 PASS
by analysis (no punch/pop-out logic touched); S1/S2 NOT APPLICABLE
off-editor — `scheduledCalls_flow` first executes at the post-deploy
`runAllTests()`.

REGRESSION RISKS:
- The dashboard pill renders only when the previewed slide's item carries a
  claim — on the real deployment most slides will be unclaimed and the card
  is byte-identical to before.
- `test_scheduledCalls_flow` provisions the ScheduledCalls tab on the LIVE
  forms store on its first run (production does the same on first use;
  cleanup never provisions).
- The shoot.mjs `post` hook evaluates a fixed string from the scenario
  table — test harness only, never shipped.

INVARIANTS AT RISK: None — INV-31 (no gate change; the card was already
canSeeSpanish-gated), INV-32 (the editor test now PINS the label-free audit
row), INV-21 (the sweep extends the TEST_ convention), INV-185
(strengthened: both new fixtures carry derived shape pins), INV-190 (the
fixture's overdue item is provably outside the fire window), INV-188 (the
fixture extraction documents its raw-vs-stripped choice inline).

NET SCORE: 0 − 0 = 0 (three capabilities — coverage and feature completion;
no production bug claimed).

OPERATOR ACTIONS / DEPLOY:
- None new. The editor test runs at the already-owed post-deploy
  `runAllTests()`. | BLOCKS DEPLOY: N
- Standard deploy (stacks with PR #176 + #177 + rounds 1/follow-ons/2 — ONE
  `clasp push -f` + New version ships everything; of this round only
  tc/script_clock.html + Tests.js deploy — the test/ files never ship).
  | BLOCKS DEPLOY: Y (the deploy itself)
Deploy: Server + Client (Time Clock views): `cd web-app && clasp push -f` +
New version. Test Suite: nothing to deploy (Node harnesses, CI-run;
visual matrix manual).

FOLLOW-ON ITEMS:
- A full-matrix re-shoot (all 43 scenarios) before the next deploy touching
  styles — this round shot only the three affected scenarios.
- The sched-modal scenario is light/wide only; a dark or compact variant is
  cheap via the same post hook if a theme defect is ever suspected there.
- Roadmap round 3 (intake arrow-key nav, server-backed scratchpad,
  Reference comments Phase A) remains next.

DOCUMENTATION UPDATES NEEDED:
- CLAUDE.md Test Command narrative: running total 607 → 612 (the follow-on
  pin batch, incl. the two strengthened-on-bite pins — the lesson is
  already in the narrative's vocabulary).
- Visual Audit Stage: modal/overlay states are no longer FULLY uncovered —
  the `post` hook exists and the sched modal is the first covered modal;
  the "still uncovered" list should say "modal/overlay states (except the
  sched modal via the post hook)".
- INV-190 Verify clause may name the editor flow test once it has run
  post-deploy (optional).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
