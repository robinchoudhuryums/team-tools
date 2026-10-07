---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Manual-update Phase 2 — the operator's text edits, chapter by chapter at today's numbering, in six batches (0–1 · 2–3 · 4+9 · 5–6 · 7–8 · 10+appendices). Item IDs are the line numbers of `.cycle/manual-update-list.md`; the decision behind each is in `.cycle/manual-update-plan.md` (Part A0–A0d decisions, Part B pushback, defaults 61–87, Appendix 1).
- Batch 0–1 (list 16–66): 0.6–0.14 incl. the 0.8 step table, the 0.11.1 note template and new 0.14 Outbound calls; the router, the new 1.1.10, the 1.2 ✓/✗ table, 1.3–1.8 (HICN deleted, B-1).
- Batch 2–3 (list 67–133): Manual Mobility scope, walker/OOP rule (B-10), HCPCS add-on wording (B-11), size changes without a cutoff (decision 42), new 2.8.5 Other medical devices (E0191); Respiratory routing incl. the ventilator fallback (decision 40), the Repeat Resupply form (decision 41), allowances (B-12/B-13), compliance grace period and validity (decisions 13–14).
- Batch 4+9 (list 134–193, 293–306): PAR team roles and timing (B-4, decisions 33–34), MA education, PAK/T3Q roles, returns and Claim Prep, new 4.10.3 standard vs complex rehab (decision 29); Sales Eligibility naming, 9.4/9.5.1 the brand-new lead (decision 35).
- Batch 5–6 (list 194–259): Field Ops queues, 5.1.2/5.3 rows, 5.4.x (B-2/B-3, default 68), POD, SOS informed-decision note (B-21), 5.9 merged watch-outs (default 69), 5.10 supervisor approval (default 70), ETA, Central Time (B-23); Service 6.1 as Situation | Owner | Go to, package-stolen routing (decision 18), Service Supervisor (decision 28), 6.3.2 conditions ($75 kept, decision 17), 6.6.3 → 5.9.2, 6.9 → 5.10, 6.10.2 (default 71), 6.12, 6.13, 6.14 removed (decision 21, B-20).
- Batch 7–8 (list 260–292): the non-billable supplies tag (decision 45), conserver banners (default 72), the facility-stock rule (decision 27), the El Paso / 50-mile coverage FAQ (decision 23); 8.1.1 table, role links, checklist, local non-emergency, verbal + text relay, the troubleshoot-first watch-out (default 73), the escalation chain at 30 minutes per step (decision 88), acknowledgement note, target note (default 75), the on-call-only contacts table (289), "After Hours" Service Type (decision 26), new 8.9 For on-call technicians and RTs (default 74, decision 25).
- Batch 10+appendices (list 307–358): 10.1 removed; 10.2–10.13 edits (B-5/B-6/B-7/B-8, defaults 81–84); the 10.6.3/10.10 billing-order contradiction with Rule B (Part C); new 10.15.1 Pick-up write-offs (decisions 9, 89), new 10.20.5 The Claim Prep tab with RR/NU (decisions 7–8, default 87), the 10.18.3 Denials calls (decision 12, new Denials Team role), 10.17 and 10.B as tables; FAQ; A.3 Upgrade Fee Sheet and Virtru definitions (decision 48).

Files modified:
- manual/src/: p0, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, appendix_b, appendix_c (Cards 0–10)
- manual/data/: changelog.json (+32 entries), roster.json (PAR team, PAK Appointment Scheduling, T3Q, Denials Team; pw-local-pt removed), equipment.json, fees.json, glossary.json
- manual/: render.py (roster:oncall, billing-table category names, "Common Upgrades"), make_html.py (✓/✗ matrix header tint, ☐ checklist), make_diagrams.py (lifecycle), mocks_b1.py (escalation chain, new cost-share), mocks_b2.py (eligibility bar), mocks_power.py, make_flow_diagrams.py (cost-share registered), diagrams/*.svg (incl. new cost-share.svg)
- web-app/kb/script_manual_diagrams.html (generated)
Estimate: L (~12 h, ~2 h a batch) — written before the first edit, 2026-10-07
Actual: ~9 h across the six batches (two sessions)

CHANGES:
0–1 | p0, p1, Cards 0/1/6, glossary, p10, make_diagrams.py, make_html.py | per the item list above; lifecycle diagram (OV beside PAR, PAR→FOP, light text on filled boxes, darker dashed connector); ✓/✗ matrix header tint — commit 9058dda
2–3 | p2, p3, p5, p6, p7, p10, Cards 2/3/6, appendix_b, equipment.json, fees.json, render.py | as listed; E0191 added (verified 2026-10-06, billing type null); knee walker $199 — commit debddec
4+9 | p4, p5, p9, p10, Card 4/9, roster.json, glossary (T3Q), mocks_power.py, mocks_b2.py | as listed; three Power roles added, Local PT/OT removed — commit 36949f0
5–6 | p0, p1, p5, p6, Cards 5/6 | as listed; Card 6 tightened to stay one print page — commit a8bdda3
7–8 | p7, p8, Card 8, render.py, make_html.py, mocks_b1.py | as listed; `roster:oncall` renders one row per person grouped by location, phones unbreakable, the shared email domain named once in the header — commit 79d8566
10+appx | p4, p5, p10, roster.json, glossary.json, render.py, mocks_b1.py, make_flow_diagrams.py | as listed; three new links pointed at sub-sections so the xref report does not grow — commit f64a4d7

TEST RESULTS: passed. Test Command is `manual`; programmatic checks on the final head: pure 1250/1250, DOM 222/222, `npm run lint:server` clean, `node scripts/counts.mjs --check` agrees. Manual build: ERRORS 0, WARNINGS 31 (baseline 32 at Phase 2 start; none added), print checks 12 pages for 12 sheets, manual.json written, xref-report WARNING 45 (44 at start; the one added links to the fee table at the top of 10.16, the right target). Every changed section screenshotted light + dark. Regression scenarios (Subsystem: Manual source), walked by trace:
- S124 export → import: PASS for the export side (make_all writes manual.json with no error; the changed diagrams rewrote `script_manual_diagrams.html`, committed). The import, publish and ledger steps need the operator's import — NOT WALKED.
- S125 reader: PASS by trace for the source side (the build validates every new changelog section ref, so Updated badges resolve; new cross-references resolve; the new `cost-share` diagram name passes the charset). App rendering of the new diagram needs the deploy — NOT WALKED.
- S126 recently changed: PASS by trace (32 new changelog entries, all dated 2026-10-07 with valid sections, so they land in the window). App side NOT WALKED.
- S127 focused previews: PASS by trace (the export prints the xref counts; batch 10's new links checked with `--list`).
- S128 search: PASS by trace (search-synonyms line printed: 98 abbreviations). App side NOT WALKED.

REGRESSION RISKS:
- `roster:oncall` splits a roster row's holder, phone and email lists on " / " and pairs them by position. A roster edit that reorders one list and not the others would show a phone against the wrong person. Today's data pairs correctly (checked in the 8.5 screenshot).
- 8.5 no longer renders the After-Hours Coverage row or the shared daytime rows (by design, item 289). Both are still in B.1.
- Sections removed at today's numbering (2.6.1, 4.5.2, 5.8.3, 6.14, 10.1) leave gaps until the Phase 4 renumber. The build checks every reference, so no link points into a gap.
- 6.9 → 5.10 and 6.6.3 → 5.9.2 were folded here rather than in Phase 3, because items 246 and 249 were plain text edits. Phase 3 should not do them again.

INVARIANTS AT RISK: None broken. Checked: INV-327 (the exporter fails closed — it passed), INV-330/331 (the diagram partial is regenerated and committed; the new key `cost-share` matches the charset), INV-336 (recently changed reads the new changelog entries), INV-345 (xref report — the new links checked, and the one remaining warning is by design).

NET SCORE: 10 − 1 = 9
- Production fixes (wrong or missing guidance a CSR would act on this month): (1) a stolen package was sent down the police-report path; (2) the insurance-rep complaint went to the wrong role; (3) 10.6.3/10.10 "always bill Medicare first" contradicted Rule B; (4) post-delivery balances were sent to the Patient Responsibility tab; (5) the after-hours escalation chain had the old call-then-text order and no acknowledgement rule; (6) oxygen coverage outside 50 miles was undocumented (El Paso FAQ); (7) 5.11 quoted 2–3 weeks for every item type; (8) the PAR timing and dual submission were wrong or missing; (9) the HICN complaint field (B-1); (10) the Medigap / QMB secondary wording (B-5).
- New failure modes: 1, Low — the positional name/phone/email pairing in `roster:oncall` (see REGRESSION RISKS).
- Most of Phase 2 is operator-directed content and layout, and is counted as capability rather than as fixes.

OPERATOR ACTIONS / DEPLOY:
- Deploy the app: `cd web-app && clasp push -f` + Deploy → Manage deployments → New version. This carries the diagram partial (the lifecycle, escalation chain, eligibility and power-process changes, and the new cost-share diagram) and Phase 1's colours, icons and table styles. | BLOCKS DEPLOY: N (the manual import works without it; the diagrams stay old until it lands)
- Re-export and import the manual: `manual/make_all.sh`, then Reference → Manual → Choose File `manual.json` → Check → Import → Publish by part. | BLOCKS DEPLOY: N
- Add E0191 (heel protector, OOP $9.76 for 2 units) to the OopPricing sheet so the Reference lookup matches the manual. | BLOCKS DEPLOY: N
- Supply the photos, screenshots and URLs in the plan's Appendix 2. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then a New version (Development section of CLAUDE.md); the manual's own deploy is the import above.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- Deferred for images or URLs: list 25, 27, 77, 81 (image), 83, 92, 107, 114, 118, 119, 124, 133, 185, 193, 261 (the O2 ticket screenshots go under their steps once steps 2 and 6 exist), 263, 274, 306, 346, 421.
- Deferred to later phases:
  - Phase 3: 214, 270 (7.9 → Billing, fixing B-22's example), 311 (10.3.4), 336 (10.14), 339 (10.16), 355 (10.A), 357 (10.C), the EAA move (17).
  - Phase 4: 10, 384, 418.
  - Phase 5: 359–383 (B.1), 385–407 (index), the glossary additions (343 overutilization, 411 EGHP/COBRA/MSP/remittance), card redesign.
  - Phase 6: all packet items, incl. 116, 136, 165, 186, 189, 271, 341.
- Design items deferred: 74 spec cards, 78 carousel, 87 "Waived" tint, 298 combined Sales diagram.
- 6.1 table: list item 234 asked to colour-code the table. Phase 2 bolds the Service owner only; a colour treatment belongs with the Part D design work.
- Part C items not tied to a list line are still open: oxygen cylinders typed as capped rental (they still show in the 10.3.1 table); E0471's class; the 6.3.1 oxygen servicing-payment claim; 7.3.3 vs Part 8; 8.4.1's Immediate list omitting cough assist, IPPB and BiPAP ST; 6's changelog pointing at 6.8; 7's header saying "Part 4"; the duplicate "My insurance changed" router rows; MRX/MRx duplicates; Card 2's 350 lb bed claim.
- The `svc-escalation` roster row ("Arnav Pan or Parth Shah") is no longer linked; decision 49 folds it into the Service Supervisor in Phase 5.
- The diagrams scroll inside their frame at the 1300-px reader width (pre-existing; not changed here).
- Item 250: kept "three" SOS exceptions rather than "few", for consistency.
- The $75 diagnostic-visit fee stays until the Service packet answers decision 17.

DOCUMENTATION UPDATES NEEDED:
- `docs/modules.md` (Reference / manual): `roster:oncall`, the ☐ checklist convention and the cost-share diagram, if the module narrative lists the placeholders and conventions.
- `manual/README.md` lists the placeholder kinds; add `{{roster:oncall}}` and the ☐ checklist line.
- None for CLAUDE.md: no counts changed, and `counts.mjs --check` agrees.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
