---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: plan F1 = change list F1 (CMS billing classes, checked against CMS) · Card 1 abusive-caller rule (operator decision) · F4 · F5 · F6 · F7 · F11 (leads + stale notes) · F12 (leftovers, except the nursing-home FAQ — F2) · F13 · F14 · D4 · packets rebuilt, the items Claude wrote tightened for brevity (operator 2026-10-08)
Files modified: manual/src/{p1,p3,p5,p6,p7,p8,p9,p10,appendix_c}.md, manual/data/{equipment,roster,glossary,changelog,renumber-2026-10}.json, manual/{mocks_b1,mocks_b2,mocks_power,render,build,make_html}.py, manual/diagrams/{rental-timeline,power-process,resupply-windows,pmd-pickup}.svg, web-app/kb/script_manual_diagrams.html (generated), manual/packets/spec.json, .cycle/STATE.md
Estimate: L (~5 h)
Actual: ~2.5 h

CHANGES:
F1-CMS | p3 3.7.2 footnote, p7 7.3.1, p10 10.2 table + 10.A row, Card 10, glossary FSS, mocks_b1 timeline, equipment (2 BiPAP ST → capped-rental) | E0471 is a capped rental (CMS-1167-F, Apr 2006; 42 CFR 414.222)
F1-CMS | equipment (o2-cylinder-m6/-e → oxygen-36-month), p10 10.2 table | E0431 cylinders in the 36-month oxygen class, not capped rental
F1-CMS | p10 10.12.2 + accessories para, p7 7.3.1, mocks_b1 timeline | after month 36: one MS visit per 6 months for a concentrator/transfill (not tanks/liquid), real visit, 20% coinsurance; repairs never paid (42 CFR 414.210(e)(5)) — the reviewer's "fee every 6 months contradicts 10.12.2" was itself wrong; 10.12.2 was
Card 1 | appendix_c | "Abusive caller: warn once; if it goes on, say you're ending the call, then disconnect — 1.4.3"; the one-line Language section folded into "Escalation, complaints and language" so the card prints on one page (the print-pagination check caught the overflow twice)
F4 | p3 3.3.2 note | Texas Medicaid ships one month at a time, eligibility checked each shipment (3.8.1 points here)
F5 | p9 | the after-hours tank line pointing at 8.3.3 removed
F6 | p3 3.10, p7 7.5.1/7.5.2 | "notify an RT" → On-Call Respiratory Therapist (3.1's daytime settings row keeps Respiratory Therapists)
F7 | mocks_power ATP box, roster pw-atp-scheduling (queue → none), pw-par-standard/complex (subject → PAR Additional Info Requested), Card 5 | Field Ops-Power schedules ATP; virtual ATP → Virtual ATP Scheduling
F11 | roster | Denials lead_of → the 1.4.4 leads table; stale notes: lift chair "no backup", Parth Shah "three roles"/"two daytime roles", Menzise contact
F12 | p5 (five points; T3Q once), p6 (two documents; SNF → 6.4.2; garbled Open items gone), p7/p8 stale Open-items rows, mocks_b2 (§3-3.2, any supply), mocks_b1 (may have difficulty), p1 (router → 6.9.2; 1.3 no longer circles to 10.22), p10 (a traditional), p3 (one every 3 months; one thing worth knowing)
F13 | glossary, render.py, build.py | Sales tags on 9 Power terms; "Parts" → "Chapters" (writer + guide filter); "All" = a CSR Core (p0) term, matching the guide filter — SOS/RUL no longer All; MA replaces Parts A and B; CST = Central Time
F14 | changelog, renumber-2026-10.json (+ moved_before_renumber), make_html.py | the 10.12.8 / 10.19.6 rows name the old chapter; the superseded 7.3.2 entry removed; "formerly 7.9" / "formerly 5.9.3" search aliases
D4 | p5 5.1.1 | swatches p5/p4/p8/p6 = the diagram's phase colours
Changelog | data/changelog.json | 4 entries (E0471, MS visit, E0431, TX Medicaid)
Packets | packets/spec.json | the 59 items Claude wrote cut to the question (directory rows → "check each name, backup and contact"); C10 19–21 now confirm the corrected text

TEST RESULTS: Test Command `manual`; no Regression Scenario covers manual content. Ran: make_all.sh ERRORS 0 / WARNINGS 25, 0 SVG text overflows, print pagination 12/12 (after two Card 1 trims), diagram partial regenerated; packets: 10 built, no MISSING, all filters match; packet diagrams eyeballed. Pure 1252/0; DOM 223/0 on three consecutive runs — ONE earlier run reported 222/1 and was not captured, so the failing test is unidentified (this batch touched only the generated diagram partial under web-app/); lint:server ok; counts ok.
REGRESSION RISKS: glossary "All" now keys on p0 — a term tagged p0 with few chapters shows All (it was already shown in every guide by the filter, so the label now matches the behaviour). The Virtual ATP row now has no queue — "How to reach" shows only the holder until Power answers C5 Q16.
INVARIANTS AT RISK: None (web-app change is the generated diagram partial only)
NET SCORE: 9 − 0 = 9 (production: E0471, E0431, MS visit, Card 1 rule, F4, F6, F7, F11 leads/notes, F13; F5/F12/F14/D4 counted as defensive wording/consistency)

OPERATOR ACTIONS / DEPLOY:
- Send the 10 packets to the departments | BLOCKS DEPLOY: N
- `clasp push -f` + New version (the diagram partial changed) | BLOCKS DEPLOY: Y
- Re-export manual.json and import (Check → Import → Publish) | BLOCKS DEPLOY: N
Deploy: clasp push -f, then Deploy → Manage deployments → New version

FOLLOW-ON ITEMS:
- An unidentified one-off DOM harness failure (1 run in 4) — capture output on the next occurrence
- pw-par-standard/complex still carry the `no-backup-confirmed` flag although each has a backup (not in the change list)
- The HTML side rail can overlap a diagram screenshot (seen on the rental timeline, which no packet uses)
- C, D, F2 (plan 2.5 rows not yet decided), E; plan 2.4

DOCUMENTATION UPDATES NEEDED:
- None
---END BROAD SCAN IMPLEMENTATION SUMMARY---
