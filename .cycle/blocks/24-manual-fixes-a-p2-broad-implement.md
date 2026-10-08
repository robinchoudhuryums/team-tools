---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: change list 2026-10-08 A1 (build date stuck at 09/15/2026) · A2 (oxygen accessory notes contradict 8.4.1/10.12.2) · A3 (0.2.1 lost the manual wheelchair path) · A4 ("rota" → "rotation") · P2 = B3/B4 (the approved candidate questions, the Denials packet, every packet rebuilt)
Files modified: manual/built_date.py (new), manual/build.py, manual/make_html.py, manual/export_reference.py, test/client/run.js, manual/data/equipment.json, manual/data/roster.json, manual/data/changelog.json, manual/src/p0.md, manual/src/p9.md, manual/packets/spec.json, .cycle/STATE.md
Estimate: M (~4 h)
Actual: ~2 h

CHANGES:
A1 | built_date.py, build.py, make_html.py, export_reference.py, test/client/run.js | one helper: the date of the last commit touching src/, data/ or diagrams/ (uncommitted content or no git → today; MANUAL_BUILT overrides). build.py's BUILT, the HTML sidebar (was a separate literal) and card footers (a third literal), and manual.json's "built" all read it; the export imports the helper instead of regex-reading a literal. Unchanged source → same date → byte-identical manual.json (a date change only ever touched ManualMeta, never an article). M2-E1 re-pinned to the helper, plus "no hand-typed build date" in the three scripts
A2 | data/equipment.json, data/changelog.json | 8 records: "Included in the oxygen rental — no separate charge to the patient at any point in the 5-year useful lifetime." + changelog §8-4
A3 | src/p0.md, data/changelog.json | 0.2.1 lead callers: "…power mobility device, PAP or a manual wheelchair … the Sales MWC Q for manual wheelchairs" + changelog §0-2.1
A4 | src/p9.md, data/roster.json | 9.1.2 heading, the (stripped) What-changed row, the oxygen-only technician's note
P2 | packets/spec.json | plan 2.3 Add + Opt, each rewritten so its ask is in its own text (the format has no "why"), inserted before each packet's Resources / Anything-else; C6 backorder asks folded into approved Q9; C10 #7/#8/#9 worded to the CMS check (E0471 capped since 2006; one MS visit per 6 months post-cap for concentrators/transfill; E0431 in the oxygen class); the Denials packet (7 items; write-offs asked in Billing only); C9's directory-rows candidate dropped as a duplicate of approved Q4 (9.5 on-call contacts). 145 questions: C2 12 · C3 17 · C4 13 · C5 20 · C6 18 · C7 18 · C8 6 · C9 7 · C10 27 · Denials 7

TEST RESULTS: Test Command `manual`; no Regression Scenario covers the build date, the equipment notes or the packets. Ran: manual make_all.sh ERRORS 0 / WARNINGS 25 (unchanged), diagram partial unchanged; export writes "built": "10/08/2026"; HTML sidebar "built 10/08/2026"; make_packets.sh 10 packets, no MISSING, every ~filter matches ≥1 row (one bad filter, 7.2~"delivered but", caught and fixed to "never arrived"). Pure 1252/0 (M2-E1 re-pinned), DOM 223/0, lint:server ok, counts --check ok.
REGRESSION RISKS: built_date() shells out to git — in a tree with uncommitted content edits the date is today (intended); a shallow clone deeper than the last content change returns the shallow boundary's date (acceptable). make_html.py replaces "__BUILT__" across the whole page (no manual text contains it).
INVARIANTS AT RISK: None (web-app/ untouched; the app's importer reads "built" into ManualMeta only)
NET SCORE: 5 − 0 = 5 (A1 the stale date in every artifact; A2 a wrong patient-cost statement in 8.4; A3 a missing route for real callers; A4 wording — counted as defensive, so 4 production; P2 the packets the operator approved going out) → 4 production + P2 = 5

OPERATOR ACTIONS / DEPLOY:
- Review the 10 Word packets; send them to departments only after F1 lands | BLOCKS DEPLOY: N
Deploy: N/A — manual source + tooling; re-export manual.json and import after the F1 batch

FOLLOW-ON ITEMS:
- F1 (plan 2.5/2.6): the CMS corrections (E0471 ×8, E0431, the post-cap MS visit in 10.12.2 + 7.3.1, the timeline diagram wording), Card 1's abusive-caller rule, and the plain errors — then rebuild the packets
- Plan 2.4 decisions (A5, A6, C8, D7, D9, D10) are the operator's

DOCUMENTATION UPDATES NEEDED:
- None (manual/README.md's packets rows already describe the format)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
