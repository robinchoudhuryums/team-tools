---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Manual-update Phase 5, directory, glossary, index and cards (`.cycle/manual-update-plan.md` Part E; list lines 359–407 and 411, decisions 38 and 49, Part D card items). All numbers are at the NEW numbering (Phase 4).
- 5a. Directory (B.1):
  - Roster consolidated from 52 rows to 37. Queue and team rows fold into their manager or supervisor; each manager row carries its queue (decision 49).
  - Dropped: Service Escalation, the Sales rep and queue rows, Order Verification, Qualified Leads, the PAK Supervisor (its lead_of moved to "Power — PAK Team").
  - New "Power Manager" row (Rajdeep Thakar), which also backs up Qualifications, PAK and the PAR specialists.
  - Holders and backups updated from the list.
  - B.1 is four columns, Role | Holder | Backup | How to reach, in A–Z order with full names. "How to reach" joins Direct, the queue, the email and the phone.
- 5b. Glossary: COBRA, NU, RR, Overutilization, Remittance and UMS App added, each linked to its section.
- 5c. Index: `data/index.json` (new) adds topic entries for the email update types and note statuses (Re-open Request, Authorization Decision, Complaint, Escalation, OOP Purchase, Repeat Resupply, Spanish Callback, Trying to Obtain After Visit Documents).
- 5d. Cards:
  - Card 1 leads with "The most common calls" table.
  - Every card ends with a "Never" box. Each line is a rule already stated in its chapter.
  - All twelve sheets still print one per page.
- 5e. Also in this phase:
  - The Virtru policy is stated in §0-11.3 (list line 411's definitions were done in Phase 2).
  - The changelog row label for an appendix reads "Appendix B", not "Chapter ppx_b" (a Phase 4 defect, found here).

Files modified:
- manual/data/: roster.json, glossary.json, changelog.json (+2), index.json (new)
- manual/: render.py (roster:all), build.py (index extras, changelog label)
- manual/src/: appendix_b.md, appendix_c.md, p0.md, p2.md, p5.md
- test/client/run.js (MP1-3)
- .cycle/STATE.md
Estimate: M (~5 h) — written before the first edit, 2026-10-07
Actual: ~3 h

CHANGES:
5a | roster.json, render.py, appendix_b.md, p0, p2, p5, run.js | Steps:
- Fifteen rows were folded or dropped, as listed above. Every `[ROLE: …]` link to a removed row was re-pointed and resolves:
  - Manual Mobility → "Manual Mobility Manager";
  - Qualified Leads → "T3Q (Qualifications sub-team)".
- B.1 overflowed at print width, so the email and then the phone were folded into "How to reach". Each phone number stays whole: a nbsp and a non-breaking hyphen inside the number only, so " / " between numbers can still wrap. The table went from 842 px to 700 px.
- The legend now explains "-", "Team", "Direct" and the queue. The two-Parths watch-out was removed, because full names make it unnecessary.
- The p2 lift-chair watch-out names the new backup.
- MP1-3 asserts the new header, the join, and the in-number-only phone rule.
— commit e38fa80
5b | glossary.json | Six terms added in place (formatting preserved), each with a section link — commit e38fa80
5c | index.json, build.py | `build_index` adds the extras as "topic" entries after the glossary loop. The index now holds NU, RR, COBRA, Remittance, Overutilization, the eight update types, APAP and G4600 — commit e38fa80
5d | appendix_c.md | Card 1:
- "Emergencies and verification";
- a most-common-calls table (where is my equipment, broken, pick-up, more supplies, patient died);
- trimmed escalation;
- Language keeps only the Spanish queue line.
Never boxes were added to C-3, C-4, C-5, C-8, C-9 and C-10. Card 2's lift-chair line was corrected. Card 1 measures 886 px in print, under the one-page limit.
— commit e38fa80
5e | p0.md, changelog.json, build.py | §0-11.3: "Policy — Virtru outside the company". Changelog entries for §B-1 and §0-11.3. Appendix rows are now labelled "Appendix X" — commit e38fa80

TEST RESULTS: passed. Test Command is `manual`. Programmatic checks on e38fa80:
- Pure 1250/1250, DOM 222/222; `lint:server` clean; `counts.mjs --check` agrees.
- Manual build: ERRORS 0, WARNINGS 25 (30 at the start). Folding the queue rows removed the "no backup" warnings for them. One new warning is accurate: the Power Manager has no backup recorded.
- 12 print pages for 12 sheets. xref WARNING 42 (unchanged). 463 ids, 408 internal links, all valid.
- Packets: nothing MISSING.
- No `web-app/` file changed, so the visual matrix was not re-run. B.1 and the cards were measured and screenshotted in the manual's own HTML (B.1 700 px; Card 1 886 px in print).

Regression scenarios (Subsystem: Manual source):
- S124: PASS for the export side (manual.json writes). The import must follow the operator's deploy — NOT WALKED.
- S125: PASS by trace:
  - every role link resolves to a B.1 row (the build fails on a missing one);
  - the renamed rows give the new anchors, and the build checks every link that targets them.
- S126: PASS by trace. Two new changelog entries have valid sections, and the appendix label is fixed.
- S127: PASS by trace (xref unchanged at 42).
- S128: PASS by trace (the synonyms line printed; the new glossary terms are searchable in the HTML index).

REGRESSION RISKS:
- **B.1 anchors changed with the role names.** In the app, a bookmark or link to a dropped role's anchor lands at the top of B.1. Inside the manual every link is validated. B.1 is one KB section (`man-b-1`), so its id is unchanged.
- **`roster:all` now shows "-" for a missing holder or backup** where it once showed "—" text, and "Team" for a team row. A roster row with an unusual holder string (one starting "—" that is not "— team") renders "-". That is intended.
- **Card 1 lost two lines:** the abusive-caller line (it is still in §1-4) and the billing row (Card 10 covers billing). A rep who only reads Card 1 no longer sees them.

INVARIANTS AT RISK: None broken.
- INV-327: the exporter fails closed; it passed.
- INV-345: the xref count is unchanged.
- The Phase 1 role-link resolver (exact match first) resolves every re-pointed link; MP1-3 pins the B.1 shape.

NET SCORE: 2 − 0 = 2
- Production fixes (wrong routing a CSR would act on this month):
  1. B.1 sent reps to rows that no longer exist as separate contacts: Service Escalation ("Arnav Pan or Parth Shah"), the Sales rep and queue rows, Qualified Leads, Order Verification. It also had stale holders and backups (Spanish Queue, PAR specialists, Respiratory Therapists, After Hours coverage).
  2. Card 2's lift-chair backup line was wrong.
- New failure modes: none. The B.1 anchor change is covered under REGRESSION RISKS. It is Low, and the in-manual links are validated.
- Capability, not counted: the glossary and index additions, the Never boxes, the Card 1 redesign, the Virtru policy statement.
- Defensive, not counted: the "Appendix B" changelog label. Phase 4 introduced it; it showed in the HTML's "What changed" table only, and is fixed before any import.

OPERATOR ACTIONS / DEPLOY:
- 1. Deploy the app FIRST if not yet done: `cd web-app && clasp push -f`, then a New version. Phase 5 changed no app code, but the Phase 1–4 app changes are still owed, and the import needs Phase 4's "Chapter" reading. | BLOCKS DEPLOY: N (it IS the deploy) — but it BLOCKS the import
- 2. Re-export and import: `manual/make_all.sh` → Reference → Manual → Choose File `manual.json` → Check → Import, **with "Remove sections no longer in the manual" ticked**. This one import carries Phases 1–5. | BLOCKS DEPLOY: N
- 3. Publish by chapter. | BLOCKS DEPLOY: N
- 4. Record a backup for the Power Manager in `manual/data/roster.json` (or tell Claude who it is). | BLOCKS DEPLOY: N
- Still owed from earlier phases:
  - build the Billing quiz from `manual/training/billing-knowledge-check.md`;
  - add E0191 to OopPricing;
  - the photos and URLs in the plan's Appendix 2.
  | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then a New version (CLAUDE.md Development). The manual's own deploy is the import above.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- **Power Manager backup:** none was given, so the build warns.
- **"Trying to Obtain Additional Documents":** the list's example index term is not in the manual's text, so it was not indexed. The text uses "Trying to Obtain After Visit Documents", which is indexed.
- **Oxygen-ownership "Never say":** moved from Card 1 to Card 8's Never box, which is the oxygen card.
- **PT Evaluation Team row:** kept, per decision 38.
- **The synonyms line still reads 98:** the new terms are full words, not abbreviations, except NU and RR. Check in Phase 7 whether NU and RR should be marked as abbreviations for the app search.
- **Phase 6 (packets) can start:** add the Phase 5 roster changes for confirmation (each department's B.1 rows), plus the earlier packet items (under-5-years PMD, G4600, B-22's example).

DOCUMENTATION UPDATES NEEDED:
- `manual/README.md`: mention `data/index.json` (curated index topics), and that `roster:all` renders the four-column "How to reach" table.
- `docs/modules.md` (Reference / manual), if it lists the manual's data files: add `data/index.json`.
- None for CLAUDE.md (counts unchanged; `counts.mjs --check` agrees).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
