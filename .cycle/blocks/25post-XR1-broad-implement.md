---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (operator request 2026-11-12, not audit findings) — the export's xref-preview warning ("27 links preview the opening of a section with numbered sub-sections")
New capabilities (G/ST): None — XR1 is a content correction: four manual cross-references narrowed to the sub-section they mean
Files modified: manual/src/p3.md, manual/src/p10.md, .cycle/STATE.md
Estimate: S (~0.5 h) — written to STATE.md's Estimates line before the first edit
Actual: ~0.5 h

CHANGES:
XR1 review | (none) | All 27 warned links read against their target's opening and sub-sections. 23 point at the right place AS WRITTEN — the section's opening is the answer: the call router's rows (1.1 → 0.2, 6.9, 8.2, 10.15, 10.19, 1.6), "never promise a pick-up" (1.5 → 6.9, whose opening says exactly that), the Power phase table (5.1 → 2.4, 4.4, 5.2, 5.3, 5.6), the upgrade-fee amounts at 10.15's top (6.13, 10.4), "who pays for a repair" (5.8, 7.1, 7.14 → 7.3, whose opening is the table), 0.10 → 6.6 (both delivery documents), 2.4 → 7.7 (both swap cases), 3.1 → 3.3, 4.1 → 4.4, 5.8 → 10.12 (purchase AND rental), B.1 → 1.1. The report's own suggestions for these were wrong (e.g. 5.3 "Qualifications" → 5.3.1 Status update calls) — it says itself it is right about six in ten. The operator chose to leave the 23 rather than add a "whole section on purpose" marker (a code change outside the manual source).
XR1 3.7 | manual/src/p3.md | The capped-rental footnote ("E0471 are capped rentals — 13 paid months") → §10-12.1 Capped rental (13-month rule), not 10.12's opening.
XR1 10.5 | manual/src/p10.md | "QMB … does not waive upgrade fees other than the standard rollator fee" → §10-15.2 Matrix (its first trap: "QMB-only is not full Medicaid. Standard rollator fee only").
XR1 10.9 | manual/src/p10.md | "Policy — enrollment governs beds, not rollators" → §10-15.2 Matrix (its second trap says the same).
XR1 10.21 | manual/src/p10.md | "Why does my rollator have an extra fee? … Any active Medicaid plan waives it" → §10-15.1 The three rules.

TEST RESULTS: Test Command is manual. The re-export reads "previews focus on the linked part: 292" (was 288) and the warning 23 (was 27) — the four now focus. The CI handbook build run locally: roles, footnotes, both diagram generators, build.py (its warnings are pre-existing: adjacent callouts in p9/p10, E2201 not in equipment.json), make_html + validate_html (475 ids, 407 internal links), feedback_report / quizzes / forms self-tests — all pass; no committed diagram or partial changed. Pure harness 1635/1635. Regression scenarios: none walks a manual cross-reference's target — NOT APPLICABLE; S148/S149 (the handbook reader) cover rendering, unchanged.
REGRESSION RISKS: The four sections' text changed (one link each), so the next import counts 3.7, 10.5, 10.9 and 10.21 as updated: their review stamp becomes the import (kbManualReviewOnUpdate_) and readers who signed them see "updated since you read it" — never a retraining ask, since no changelog entry flags it. Each link's text now names the sub-section ("10.15.2 Matrix").
INVARIANTS AT RISK: None — INV-379's review-on-update is the expected effect above.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (a content correction; a preview opening at the section top was not wrong, only less focused)

OPERATOR ACTIONS / DEPLOY:
- Import the re-exported `manual.json` (Reference → Manual → Check → Import → Publish) — Check should list the four sections as updated | BLOCKS DEPLOY: N
Deploy: N/A — no app code changed; the manual reaches both apps by the import

FOLLOW-ON ITEMS:
- The warning will keep saying 23 for links that are correct. If that becomes noise, a "whole section on purpose" marker (e.g. `[[§6-9#top]]`) the export and report treat as by-design would silence it — offered, not chosen.
- Pre-existing build.py notes: adjacent Watch-out callouts in p9, adjacent Policy callouts in p10, HCPCS E2201 cited in prose but not in equipment.json.

DOCUMENTATION UPDATES NEEDED:
- None
---END BROAD SCAN IMPLEMENTATION SUMMARY---
