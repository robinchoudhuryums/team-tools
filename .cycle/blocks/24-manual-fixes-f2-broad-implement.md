---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Manual fixes F2 — plan 2.5's remaining rows (F2 K3 Guardian 20" coding, F3 the diagnostic visit's no-charge line + 1.1/Card 7 wording, F8 Card 0 / 0.10 Pat. Resp. and Card 10's Denials routing, F9 the complaint-record lead-in, F10 the pick-ups line in 10.14, F11 the Spanish Queue row and B.1's "names in full" line, F12 the nursing-home FAQ) plus the HTML search-preview fix (a diagram's CSS in 16 sections' previews). D9 resolved by the operator: the Messages button IS bottom-right — no change. F15 stays with Billing in its packet (unchanged, as planned).
Files modified: manual/src/{p0,p1,p6,p7,p10,appendix_b,appendix_c}.md, manual/data/{equipment,roster,changelog}.json, manual/packets/spec.json, manual/make_html.py, test/client/run.js (MD-1 +2 assertions), .cycle/STATE.md
Estimate: M (~3 h) — written before the first edit, 2026-10-08
Actual: ~1.5 h

CHANGES:
F2 | data/equipment.json (wc-heavy-duty-20) | "K0006 — or K0003 with E2201 — for a patient over 250 lbs" → K0006 for over 250 lbs; the code note says K0003 tops out at 250 lbs and E2201 covers a seat 20" up to, but not including, 24". C2 Q1 still asks Manual Mobility when the chair is billed which way.
F3 | src/p7.md 7.3.2, src/p1.md 1.1 router row, src/appendix_c.md Card 7, packets/spec.json (C7 #2 summary) | 7.3.2 states there is no diagnostic charge when a fault is found and repaired; 1.1 and Card 7 name the two $75 conditions as 7.3.2 does (refuses photos/video; recently found working and still is). The packet's summary now quotes the restored line and asks Service to confirm it. Card 7 had to be cut to fit (the first wording printed 2px past the page — the pagination check caught it).
F8 | src/appendix_c.md Card 0, src/p0.md 0.10 watch-out | Pat. Resp. = what's owed before delivery; billed balances are under Edit Patient → Invoices (10.19.1/10.19.2).
F8 | src/appendix_c.md Card 10 | New "Denials" line: a denial is under review — the Denials team member in the notes, else the Denials Q (ext 101) — 10.17.3.
F9 | src/p1.md 1.6.1 | Heading "What a complaint record captures"; lead-in "Our complaint record captures these five fields (the Medicare number is already on the account)".
F10 | src/p10.md 10.14 policy | "Pick-ups are created by CSRs or the Denials team; there is no separate discontinuation form or queue."
F11 | data/roster.json (spanish-queue direct_transfer → false), src/appendix_b.md | The Spanish Queue row no longer says Direct (1.7 and Card 1 forbid a direct transfer). No full names were supplied for the three resupply category owners, so B.1 now says names are in full except theirs, as planned.
F12 | src/p6.md 6.16 | The nursing-home FAQ separates a short-term SNF or rehab stay (deliver up to two days before a confirmed discharge; facility responsible during a covered stay — 6.4.1, 6.4.2) from a nursing home that is the patient's permanent residence (even a power chair can go there — 6.4.4).
Search preview | manual/make_html.py | An inline diagram reads as its aria-label in the search text (as an image reads as its alt); any other svg/style/script is dropped before tags are stripped. 16 sections' previews had shown "dg-lane{fill:var(--panel)} …"; now 0. Trade-off: words that appear ONLY inside a diagram's labels no longer match a search (they were matchable before, as jumbled text).
Changelog | data/changelog.json | 6 entries (7.3.2, 0.10, 10.14, 6.16, B.1, 2.4).

TEST RESULTS: Test Command is manual. Build ERRORS 0 / WARNINGS 25 (unchanged), print pagination 12/12 (after the Card 7 trim), diagram partial unchanged; packets: 10 built, no errors. Pure 1255/0 (MD-1 extended, bite-checked: dropping the svg/style strip fails it); DOM 223/0; lint:server ok; counts ok. Regression Scenarios touching Manual source — S124, S127, S128: NOT APPLICABLE to code (export, import and the reader are untouched); manual.json changes in content only (the edited sections and the 1.1 router answer), which the operator's routine re-import carries.
REGRESSION RISKS: Search no longer matches words found only in a diagram's labels (each diagram's aria-label still matches). The Spanish Queue row's How to reach now reads "Spanish Q · spanishcalls@…" without "Direct".
INVARIANTS AT RISK: None (manual/ is build-only).
NET SCORE: 7 production fixes (F2 coding, F3 restored no-charge rule, F8 Pat. Resp., F8 Card 10 routing, F10, F11 Spanish row, F12 FAQ) + search-preview defect (user-visible, 8) − 0 new failure modes = 8; F9 and the B.1 line counted as defensive wording.

OPERATOR ACTIONS / DEPLOY:
- Re-export manual.json and import (Check → Import → Publish) — content changed in seven sections and the call router | BLOCKS DEPLOY: N
- Re-send the rebuilt packets if any have not gone out yet (C7 #2's summary changed) | BLOCKS DEPLOY: N
- Optional: give the full names of the three resupply category owners (Sonia S., Michelle B., Monica J.) and B.1 can go back to "every name in full" | BLOCKS DEPLOY: N
Deploy: N/A for this batch's code — make_html.py builds the HTML manual only; no web-app/ file changed (the earlier clasp push + New version from F1/C is still owed).

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- Card 3's "Overrides to Chapter 0" header still uses 3.2's old name (3.2 is now "Department specific amendments") — in the change list's F8 but never carried into the plan's 2.5 table, so not done here.
- Card 7's Ventilators line still says "notify an RT" (F6 re-pointed the chapter links to the On-Call Respiratory Therapist; the card has no role link).
- F15 (Medicaid primary on bed upgrades, the E0621 sling, the 64-day boundary) waits on Billing's packet answers.

DOCUMENTATION UPDATES NEEDED:
- None
---END BROAD SCAN IMPLEMENTATION SUMMARY---
