---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Manual-update Phase 7, sweeps and finish (`.cycle/manual-update-plan.md` Part E; list lines 412–414, 416, 422–425; B-18; D4, D5, D10; the Part C contradictions still open).
- 7a (412) **MA:**
  - "MA Education" is written **Medical Assistant Education**, in 5.1, 5.2.1 and 5.2.2, the Power diagram and the glossary.
  - MA now means only Medicare Advantage. The glossary's MA entry expands to Medicare Advantage, so search gains that synonym.
- 7b (413, B-18) **Traditional Medicare:**
  - Each chapter's first mention reads "traditional (Original) Medicare" (Chapters 1, 5, 10), and later mentions read "traditional Medicare".
  - The same change was made in the glossary, the cost-share diagram's title and the Billing packet's ABN row.
  - A new glossary entry, "Original Medicare", keeps the term searchable.
- 7c (423, D10) **Footnotes:** the 39 Note banners were reviewed. 1.3's HIPAA rationale is now a footnote on the verification rule. The rest tell the CSR what to do, or sit under a generated table with nothing to hang a marker on, so they stay banners.
- 7d (425) **Cross-reference audit:**
  - Ranked all 517 links by how well each link's words match its target's text, then read the weakest 150 and the 42 unfocused links from the report by hand.
  - 17 links were re-pointed to the part that answers them.
  - The scooter ROHO watch-out no longer promises cushion options that 2.4.3 doesn't hold.
  - Part C contradictions fixed:
    - 8.3.3 said after-hours oxygen calls dispatch immediately, against Chapter 9's troubleshoot-first and DFW-only rules;
    - 9.4.1's Immediate list omitted cough assist, IPPB and BiPAP ST;
    - Card 2's "bed over 350 lb" is now stated in 2.3.2, from Medicare's bed policy;
    - the duplicate MRX glossary entry was removed.
- 7e **Billing cross-check:** QMB, the 13- and 36-month rules, timely filing, the ABN, the billing order and sales tax agree across chapters. Two errors were fixed:
  - 7.3.1 said oxygen servicing runs on a payment every 6 months, which contradicted 10.12.2's "no separate payment". It now matches 10.12.2, and the Billing packet row asks for confirmation.
  - The glossary's OOR entry still said every out-of-state walker is out of range. It now says this applies to insurance orders only.
- 7f (422, 414, 416):
  - **PDF:** LibreOffice can't load any file in this container, so no PDF could be made or checked here. Instead the Word file was checked structurally: no forced page-break runs, 28 chapter-level page starts, and none back to back. The build's blank-page check still runs wherever LibreOffice works.
  - **D5 hierarchy, now in the HTML:**
    - the section number is a chip in the chapter colour;
    - section headings carry a 4 px left rule, thinner than the chapter's 6 px;
    - sub-section numbers take the colour as text;
    - the cards keep their own headings.
  - **D4 colours** were already done in the colours batch.
- Also: the department guides' heading now says "Related sections from other chapters" (the Phase 6 follow-on).

Files modified:
- manual/src/: p0, p1, p2, p5, p6, p7, p8, p9, p10
- manual/data/: glossary.json, changelog.json (+5)
- manual/: make_html.py (D5 CSS), build.py (guide heading), mocks_power.py (two-line node titles; Medical Assistant Education), mocks_b2.py, mocks_b1.py (cost-share title)
- manual/diagrams/power-process.svg, cost-share.svg; web-app/kb/script_manual_diagrams.html (generated)
- manual/packets/spec.json (Billing ABN wording and oxygen servicing row; a new Manual Mobility bed-threshold question)
- .cycle/STATE.md
Estimate: L (~8 h) — written before the first edit, 2026-10-07
Actual: ~3.5 h

CHANGES:
7a | p5, mocks_power.py, mocks_b2.py, glossary.json | Changes:
- The node title can take two lines, so the Power diagram reads "Medical Assistant / Education". The unexported variants say "Medical Assistant Ed.".
- 5.2.2 says the team contacts the MDO's office: the doctor, medical assistant or nurse.
— commit 8f91b1d
7b | p1, p5, p10, glossary.json, mocks_b1.py, spec.json | Sentence-start capitalization is kept ("Traditional Medicare:" and table cells). Four glossary definitions were updated, and "Original Medicare" was added — commit 8f91b1d
7c | p1 | `[^hipaa]` on 1.3's verification rule. The definition sits in 1.3.1 where the banner was — commit 8f91b1d
7d | p0, p2, p5, p6, p8, p9, p10, p2 (2.3.2), glossary.json | Re-points:
- 9.5 distress → 1.4.1
- 10.17 → 10.17.2 (EOB/MSN) and → 10.17.1, twice (ABN)
- 10.20 → 10.20.2, twice (estimate language)
- 10.19 → 10.19.3 (Pre-Pay)
- 2.8 → 2.8.3 (bathroom items)
- 6.4 → 6.4.1, twice (D/C date)
- 6.6 → 6.6.1 (POD)
- 5.1 → 5.1.1, twice
- 5.1 → 5.7 (changing a PMD item)
- 0.3 → 0.3.1
- 3.12 → 3.12.2 (LALM)
- 10.6 → 10.6.2 (MSP)
Unfocused links fell from 42 to 28; every one left is a call-router row or a deliberate whole-section link.
— commit 8f91b1d
7e | p7, glossary.json, spec.json | 7.3.1's oxygen row and the OOR definition — commit 8f91b1d
7f | make_html.py, build.py | D5 CSS keyed off each heading's id prefix (3-7 is Chapter 3), with no source markup — commit 8f91b1d
changelog | changelog.json | §8-3.3 (retraining), §9-4.1 (retraining), §7-3.1, §2-3.2, §5-2.2 — commit 8f91b1d

TEST RESULTS: passed. Test Command is `manual`. Programmatic checks on 8f91b1d:
- Pure 1250/1250, DOM 222/222; `lint:server` clean; `counts.mjs --check` agrees.
- Manual build: ERRORS 0, WARNINGS 25 (unchanged). 12 print pages; 0 clipped text blocks; 0 text elements overflowing, diagrams included (`check_svg_fit.py`). Search synonyms 98 (+MA, −MRX).
- xref report: 514 links, 294 focused (up from 288), WARNING 28 (down from 42).
- Packets: all ten build, nothing MISSING.
- Visual matrix, `reference-manual` filter (the diagram partial changed): 19 scenarios, 0 overflow, 0 missing, no page errors beyond the proxy's web-font certificate.
- D5 screenshotted in light and dark (5.2).
- The PDF could not be produced here (LibreOffice cannot load files in this container).

Regression scenarios (Subsystem: Manual source):
- S124: PASS for the export side (manual.json writes, and the diagram partial is regenerated and committed). The import must follow the deploy — NOT WALKED.
- S125: PASS by trace:
  - every re-pointed link resolves, because the build fails on a missing anchor;
  - the visual scenarios show the reader with the new partial.
- S126: PASS by trace (5 new changelog entries with valid sections; two marked retraining).
- S127: PASS (xref report ran; unfocused links fell from 42 to 28).
- S128: PASS by trace. The synonyms line printed; MA now expands to Medicare Advantage as a phrase, and the app counts a two-letter term only in capitals.

REGRESSION RISKS:
- **Search for "MA":** the app now matches the phrase "Medicare Advantage" for MA, which is intended. A rep searching "MA Education" finds the section through the word "Education", not "MA".
- **Section number chips** are keyed off heading ids. A heading id in an unexpected shape would take the navy default, which is harmless.
- **The 7.3.1 oxygen line** now states the 10.12.2 rule, pending Billing. If Billing says a 6-monthly payment still exists, both sections need the correction.
- **Medicare's bed threshold** (over 350 lbs, up to 600) is stated from Medicare's hospital-bed policy. The Manual Mobility packet asks for confirmation.

INVARIANTS AT RISK: None broken.
- INV-327: the exporter fails closed; it passed.
- INV-330/331: the partial is regenerated, allowlisted and committed.
- INV-345: the xref report count fell.
- INV-336: recently changed reads the five new entries.

NET SCORE: 4 − 0 = 4
- Production fixes (wrong guidance a CSR would act on this month):
  1. After-hours oxygen calls: 8.3.3 told the coverer to dispatch immediately, so a technician could be sent without troubleshooting, or outside the dispatch area.
  2. 9.4.1 gave no response target for cough assist, IPPB and BiPAP ST, which 9.3 dispatches immediately.
  3. 9.5's "patient in distress" link led to the hours of service, not the emergency instruction.
  4. The glossary's OOR entry told CSRs every out-of-state walker is out of range, contradicting the insurance-only rule.
- New failure modes: none.
- Defensive or capability, not counted: the MA and Medicare wording, the footnote, 13 link re-points that focus an already-right target, the 7.3.1 alignment (pending Billing), the bed threshold, the MRX duplicate, D5, and the guide heading.

OPERATOR ACTIONS / DEPLOY:
- 1. Deploy the app: `cd web-app && clasp push -f`, then a New version. Phase 7 changed the diagram partial (Power diagram, cost-share title), and Phases 1–4 are still owed. | BLOCKS DEPLOY: N (it IS the deploy) — but it BLOCKS the import
- 2. Re-export and import `manual.json` with "Remove sections no longer in the manual" ticked, then publish by chapter. This carries Phases 1–7. | BLOCKS DEPLOY: N
- 3. Make a PDF of the Word manual (Word or Google Docs), since this container could not, and check it for blank pages and spacing (item 422). | BLOCKS DEPLOY: N
- 4. Send the review packets (`make_packets.sh`). They now also ask Manual Mobility about the bed threshold and Billing about oxygen servicing. | BLOCKS DEPLOY: N
- Still owed: a Power Manager backup, the Billing quiz, E0191 in OopPricing, photos and URLs. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then a New version (CLAUDE.md Development). The manual's own deploy is the import.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- **0.6 duplicate** (from Phase 3): 0.6 restates "OOP orders don't qualify for the EAA or a payment plan", which lives in 10.19.6. It is consistent, so it was left.
- **Packet answers:** when the packets come back, each answer goes into the source. Several Phase 7 lines are pending confirmation (7.3.1, 2.3.2, 9.4.1).
- **Hidden working tables:** the "What changed"/"Open items" tables are not exported, but some lines are stale ("Section numbers are preserved", "two people named Parth"). They are a dated record.
- **Images and URLs (rolling):** none supplied yet. The 7 `[PENDING]` markers still block a release build.
- **App reader hierarchy:** D5 is HTML only. The Reference reader's headings are unchanged; bringing them in line would need an app change and a deploy.

DOCUMENTATION UPDATES NEEDED:
- `manual/README.md`:
  - the headings convention could mention the section-number chips (HTML);
  - glossary entries that are full names ("Original Medicare") are aliases for search, not abbreviations.
- None for CLAUDE.md (counts unchanged; `counts.mjs --check` agrees).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
