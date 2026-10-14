---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: the operator's 2026-10-12 manual and review-packet corrections (verbatim list in the chat) with the three operator choices — feedback into the reader bar, "(MA)" plus the glossary note, 6.14 folded into 6.3 and renumbered.
Files modified: manual/src/{p2,p3,p5,p6}.md, manual/data/{equipment,thumbs,changelog,glossary,renumber-2026-10}.json, manual/make_review_packets.py, manual/packets/spec.json, web-app/kb/script_kb.html, web-app/styles.html, test/client/run.js, test/client/dom/runDom.js, test/visual/print-check.mjs, docs/{operator-log,modules,design-decisions,test-harness-log}.md, CLAUDE.md (counts block + decision index), .cycle/STATE.md
Estimate: M (~4 h) — written in STATE.md before the first edit
Actual: ~3 h

CHANGES:
2.8 consolidation | p2.md, equipment.json | 2.8.4 BPM + 2.8.5 Heel protector → one 2.8.4 Other medical devices table (the BPM moved to the other-medical-device category; both items render).
3.7 photos | equipment.json, thumbs.json | the APAP and heated PAP tubing rows show a generated "Photo to come" placeholder (pending/photo-to-come.jpg).
Resupply | p3.md | 3.1 note: a patient with several respiratory machines can confuse them — ask the caller to describe it; 3.13 FAQ row: more supplies than insurance allows → out of pocket (links 0.6).
5.2.2 / 5.9.2 | p5.md, glossary.json | "Medical Assistant (MA) Education"; the glossary's MA entry names that one exception; "Full dimensions are in the Item Master" cut (the pricing line that also names the Item Master stays).
6.1.2 / 6.14 | p6.md, renumber-2026-10.json, changelog.json, make_review_packets.py, spec.json | "Intake, Field Ops or Service?" with an unauthorized-order row → Intake; 6.14 Freight deliveries was duplicated by 6.3 and 5.8 — its one unique fact (Irving's freight hours) moved into 6.3's row, the section deleted, 6.15–6.17 → 6.14–6.16 with every xref, the crosswalk, the changelog entry, the FAQ map and the packet refs following.
Feedback in the bar | script_kb.html, styles.html | no section ends in a feedback row; Helpful / Not helpful / Suggest an edit sit in the reader bar for the section in view, painted in place (kbManualBarFbPaint_), votes remembered per section this session (KB_STATE.manualFb), a late answer repaints only its own section (g147), F-45's contract kept; under 560px the buttons take a second row (found by shot: the title had kept one letter); the dead `.kb-man-fb` rules and its print selector removed.
Packet | spec.json | Manual Mobility Q3 reads 10.15 + 10.15.1 + 10.15.2 with the diagram (rules, diagram, matrix, traps, uncommon payers); Q11–Q14 added (cushions, upright walkers, knee walkers / VGM Homelink, Hoyer lift radius); Resources → Q15, Anything else → Q16.
Tests | run.js, runDom.js, print-check.mjs | MRD-10 DOM (new); the M2 drive, print-block pin, one-home pin, MP2-4 stub and print-check updated off the old per-section row. 6 bite-checks, all BIT.

TEST RESULTS: pure 1265/0, DOM 232/0, lint:server clean, counts --check agrees. Manual build: ERRORS 0, warnings unchanged at 25, 11 cards, 0 clipped, print 15 pages for 15 sheets, 0 overflow, export complete (every cross-reference verified; man-6-17 absent). Packets: complete, no missing excerpt; Q3 and Q11–Q14 read correctly. Visual: all 45 reference scenarios — 0 overflow, 0 missing fixtures (the only console line is the pre-existing font CERT error); the narrow bar checked at 390px light and dark. print-check: feedback not printed, body ink #111, rule (4)/(5)/(6) intact. Regression scenarios: none names the Reference reader (manual Test Command) — NOT APPLICABLE beyond the above.
REGRESSION RISKS: (1) a rep who voted earlier in a session and reloads can vote again (as before — the old row reset on every render); (2) the narrow bar is ~34px taller, which the open-scroll already measures (kbManualScrollTo_ reads the band's height).
INVARIANTS AT RISK: None — g64 (one print block), g112 (no new localStorage key), g133 (onclick passes `this`), g147 (late answers checked against the bar's section), T6 (kb-man-bar-fb has a rule), F-45.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (content corrections and a layout change; the one-letter title was caught before it shipped).

OPERATOR ACTIONS / DEPLOY:
- clasp push -f + New version | BLOCKS DEPLOY: N
- Manual release: ./make_all.sh → Import → Publish; tick "remove sections no longer in the manual" (old man-6-17) | BLOCKS DEPLOY: N
- ./make_packets.sh and re-share the Manual Mobility packet | BLOCKS DEPLOY: N
- Replace the "Photo to come" placeholder for the APAP and heated tubing when photos exist | BLOCKS DEPLOY: N
Deploy: cd web-app && clasp push -f, then a New version

FOLLOW-ON ITEMS:
- The 5.9 POV line still says "Check the Item Master for the current figure" (pricing, not dimensions) — left; confirm with the operator whether that is accurate.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (operator log, modules, design decision + index, harness log, STATE).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
