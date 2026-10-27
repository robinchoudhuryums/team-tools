---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (operator-requested capability round)
New capabilities (G/ST):
- A1 — a Sent PPD lists each recommendation with the reason it was sent with (it showed only the code and ★/status), grouped Complex then Standard, one reason per line
- A2 — a heavy-duty model the patient's weight put on the list says so: "Weight N lbs — within this model's A–B lbs range" (operator 2026-10-27: "only for heavy duty models, when part of the reason that model is recommended is because of weight")
Files modified: web-app/60_intake.js, web-app/intake/script_intake.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, .cycle/config.md (VISUAL-GAP-TABS), CLAUDE.md (running totals), docs/modules.md, docs/operator-log.md, .cycle/STATE.md
Estimate: S (~1.5 h) — written to STATE before the first edit
Actual: ~1.3 h

CHANGES:
A2 | web-app/60_intake.js | new pure intakeWeightReason_(weight, capStr): a capacity RANGE whose lower bound is above zero and contains the weight → the reason; a plain cap, a range from zero, a blank or unreadable weight/cell → ''. Read through intakeCapLbs_ (the one capacity reader, F46). intakeFilterRecommendations_ appends it after every branch (replacing a bare "Eligible option", else " | " after the clinical reason). Fixed vocabulary + numbers only, since the justification is the one raw-HTML field (g44)
A1 | web-app/intake/script_intake.html | intakeRenderSentDetail_'s recommendation rows moved into intakeSentRecsHtml_(recommendations, selections): Complex then Standard sub-labels, the code with ★/status under it, the reason beside it — intakeStripTags_ then esc(), exactly as the preview draws it, split on " | " into lines; nothing sent → no section; CSS .intk-sent-grp/-rec/-sel/-why
Tests | test/client/run.js | A2 pin: the helper's grid (bound, spaces/unit, comma capacity, rounding, plain cap, from-zero, blank, out of range, unreadable) and through the engine (heavy-duty captain gets the reason beside "Captain's Seat", a 250 lb patient none, appended after a solid-seat reason); intakeWeightReason_ added to the engine sandbox; X1 shrink-only list loses intakeGetSubmission + intakeListMySubmissions (they gained fixtures)
Tests | test/client/dom/runDom.js | A1 DOM drive: grouping order, the stored HTML read as text, the selection line, the weight reason one per line, a hostile justification inert, no section when nothing was sent
Fixture | test/visual/mock.js, shoot.mjs, .cycle/config.md | intakeListMySubmissions + intakeGetSubmission fixtures; scenario intake-sent-detail-light-wide (opens the row, scrolls to the recommendations); intakeSent left VISUAL-GAP-TABS (VIS-COVER derives it)

TEST RESULTS: passed — Test Command is `manual`, so the Node harnesses were run directly: pure 1413/1413, DOM 292/292, lint:server clean, split manifest regenerated, counts --check clean, visual CI gate PASS (24); intake-sent-detail-light-wide 0 overflow, no narrow text, no errors, read by eye. Regression scenarios for Intake: the engine pins (Q39a mobile home, weight caps, substitutions, oxygen, F46 comma capacity) all PASS unchanged — A2 only appends to a justification.
REGRESSION RISKS: the preview → send "recommended products changed" check compares the server's recommendation data on both calls; the weight reason is deterministic from the same answers and catalog, so it cannot trip it. A substituted model (K0856→K0861) carries the SOURCE row's capacity, which is the row the weight filter admitted — the reason names that range.
INVARIANTS AT RISK: g44 (justification is the one raw-HTML field) — preserved: fixed text and numbers only, pinned. INV on the explainability factors — unchanged.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (two new capabilities)

OPERATOR ACTIONS / DEPLOY:
- Deploy a New version | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured (manual clasp push + New version)

FOLLOW-ON ITEMS:
- The mock's Sent detail answers render N/A (the fixture's answer keys are not the bank's question numbers in that shape) — cosmetic, fixture-only.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (modules.md, operator-log.md, STATE, config.md gap list)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
