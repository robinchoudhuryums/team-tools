---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Manual-update Phase 3, consolidations and deletions (`.cycle/manual-update-plan.md` Part E). Item IDs are line numbers of `.cycle/manual-update-list.md`.
- 3a. Deletes:
  - B.2 Roles with no backup.
  - 10.C, the empty v1 change list (item 357).
  - 10.3.4, items the generated tables already classify (item 311).
  - 10.A Knowledge check (item 355). It moved to `manual/training/billing-knowledge-check.md` for a logged Training quiz (decision 56).
- 3a. Folds:
  - 1.6 Requests for a supervisor → §1-4.4 under Difficult calls (default 85).
  - 5.6.2 Delivery ticket → 5.6.1 (item 214).
- 3b. Moves into Billing:
  - 7.9 Restart rules → §10-13.8, with pushback B-22's worked example recalculated on a rental month (item 270).
  - Oxygen billing in one home, §10-13.2 (item 330): the 36-month table, the "never owned" script, and the accessories rule moved from 7.4.1.
  - EAA 5.9.3 → §10-20.6 (item 17).
- 3c. One home each:
  - Waiver rules in 10.16. 2.10.1's restated copy became a summary and a pointer (item 339).
  - Compliance as one table: 3.12.2 gains 10.14's "If not met" column. 10.14 and 7.8.2 point there (item 336).
- 3d. Trims and the Billing cross-check:
  - The 36-month script and the QMB protection each have one full statement.
  - Item 408's two named errors are fixed: Part 10 never mentioned the PRF, and 6.3.1's frequent-servicing link pointed at capped rental.
  - The cross-check also found two more: the complex-rehab PWC purchase exception was missing from 10.13's short version, 10.B and Card 10, and 7.5.3's conserver link was stale.
- Already done in Phase 2 (items 246/249), not redone: 6.9 → 5.10 and 6.6.3 → 5.9.2.

Files modified:
- manual/src/: p0, p1, p2, p3, p5, p6, p7, p10, appendix_b, appendix_c
- manual/data/changelog.json (+2 entries)
- manual/packets/spec.json (rows re-pointed or removed; see CHANGES)
- manual/mocks_b1.py, manual/diagrams/pmd-pickup.svg, web-app/kb/script_manual_diagrams.html (generated)
- manual/training/billing-knowledge-check.md (new; not part of the build)
- .cycle/manual-update-plan.md (the 9.4.1 Power packet row is now row 29)
Estimate: L (~8 h) — written before the first edit, 2026-10-07
Actual: ~3.5 h

CHANGES:
3a | p10, appendix_b, p5, p1, p0, training/ | B.2, 10.C, 10.3.4 and 10.A removed. 10.A saved for the Training module. §1-4.4 holds the supervisor steps and the leads table, with all five references re-pointed. The delivery ticket is named as the POD in 5.6.1 — commit 4fd2fc3
3b | p7, p10, p5, p0, p1, mocks_b1.py, packets/spec.json | §10-13.8 is assembled from 7.9's text (subsection headings became bold lead-ins). New example: delivered on the 15th, oxygen stops 10 March, threshold 60 + 4 = 64 days, resume by 13 May. §10-20.6 is the EAA, placed after 10.20.5. The PMD pick-up diagram now cites §10-20.6. Seven packet rows were re-pointed (5.9.3→10.20.6, 7.4.1→10.13.2, 7.9.x→10.13.8, 10.3.4→7.5.3) and the 10.A row was dropped. Also three packet rows that quoted sections Phase 2 deleted: 2.6.1→10.11, 6.14→6.15 (re-worded), and the 4.5.2 PT practice row dropped. Rows after a dropped one were renumbered — commit 9aa0b63
3c | p2, p10, p3, p7 | 2.10.1 is now one summary line plus a pointer to §10-16.1, and 2.10 keeps its fee table. 10.16's traps gained "Rule B requires enrollment" and the no-discretion line. 3.12.2 is five columns (Item, Type, Requirement, If not met, Detail) and says it is the one compliance table. 10.14 and 7.8.2 point to it — commit 06e337c
3d | p1, p10, p6, p7, appendix_c, changelog.json | 10.20.1's QMB bullet is now a pointer. The 1.2 oxygen row links to 10.13.2. 10.13.1 names the PRF. 6.3.1 links → 10.3.2 and 10.13.2. 7.5.3's link → 10.13.2. The complex-rehab exception was added to 10.13's short version, the 10.B row and Card 10 — commit f0ac5e6

TEST RESULTS: passed. Test Command is `manual`. Programmatic checks on f0ac5e6:
- Pure 1250/1250, DOM 222/222; `lint:server` clean; `counts.mjs --check` agrees.
- Manual build: ERRORS 0, WARNINGS 30 (31 at the start of Phase 3; B.2's adjacent watch-outs went). 12 print pages.
- xref report: WARNING 42 (45 at the start).
- `make_packets.sh`: nothing MISSING (three were missing at the start, from Phase 2 deletions).
- Screenshotted: §10-13.8 and the five-column 3.12.2, light and dark.

Regression scenarios (Subsystem: Manual source):
- S124: PASS for the export side (manual.json writes; the pick-up diagram change regenerated the partial, committed). The orphan step ("Remove a section from the source … Import without ticking, then with it ticked") applies directly to this phase; it needs the operator's import — NOT WALKED.
- S125: PASS by trace. Every re-pointed reference resolves, and the build's missing-anchor check caught the one stale diagram reference before commit.
- S126: PASS by trace (2 new changelog entries with valid sections).
- S127: PASS by trace (the xref report ran; the count fell).
- S128: PASS by trace (the export ran end to end).

REGRESSION RISKS:
- **Orphaned sections in the app:** the KB still holds man-1-6, man-5-6-2, man-5-9-3, man-7-9, man-10-3-4, man-10-a, man-10-c and man-b-2. The import lists them but removes them only when "Remove sections no longer in the manual" is ticked (INV-321). Left unticked, the old copies stay published and searchable, including 7.9's wrong worked example.
- **History on those ids:** comments, views and bookmarks on those ids go with them. The Phase 4 id migration is where history is carried across; these sections were removed rather than renumbered, so nothing maps them.
- **Packet numbering:** dropping rows renumbered the later rows in the Part 4 and Part 10 packets. The packets haven't been sent, so nothing external quotes the old numbers. The plan's one reference (Part 4 row 30 → 29) is updated.

INVARIANTS AT RISK: None broken.
- INV-321 is the mechanism behind the orphan risk above. It is working as designed; the operator must tick the box.
- INV-330/331: the diagram partial is regenerated and committed.
- INV-327: the exporter failed closed on nothing.
- INV-345: the xref report count fell.

NET SCORE: 3 − 1 = 2
- Production fixes (guidance a CSR would act on wrongly this month):
  1. B-22's example gave a wrong restart date (calendar month, and a day skipped).
  2. 6.3.1 sent frequent-servicing items to the capped-rental rules.
  3. 10.13's short version, 10.B and Card 10 said "no purchase option" against the complex-rehab exception.
- New failure modes: 1, Low–Medium. The orphaned sections stay live unless the import's removal box is ticked (an operator action below).
- Defensive/structural, not counted: the deletes, folds, moves and pointer trims (they remove duplication), the PRF line, the packet re-points.
- Correction to the Phase 2 block: Phase 2 deleted 2.6.1, 4.5.2 and 6.14 without re-pointing the review-packet rows that quote them, so `make_packets.sh` reported them MISSING. That was a Phase 2 failure mode the Phase 2 block did not report. Fixed here.

OPERATOR ACTIONS / DEPLOY:
- Deploy the app (`cd web-app && clasp push -f` + New version) for the regenerated diagram partial (the pick-up diagram's EAA reference). This is the same deploy Phase 1/2 already owe. | BLOCKS DEPLOY: N
- Re-export `manual.json` (`manual/make_all.sh`) and import: Reference → Manual → Choose File → Check → Import, **with "Remove sections no longer in the manual" ticked**. Check should list the eight orphaned ids above, plus the Phase 2 removals (2.6.1, 4.5.2, 5.8.3, 6.14, 10.1) if they were imported before. | BLOCKS DEPLOY: N
- Build the Billing knowledge-check quiz in Training → Team Training from `manual/training/billing-knowledge-check.md` (decision 56). | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then a New version (CLAUDE.md Development). The manual's own deploy is the import above.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- **0.6 duplicate:** it repeats the "OOP orders don't qualify for the EAA or a payment plan" policy that now lives in 10.20.6. It is a core-chapter statement and was left; Phase 7's cross-reference audit (item 425) can decide.
- **Short lines left by design:** the remaining QMB and 36-month mentions (cards, FAQ, 10.B, 10.21 tables, 10.20.4) are one-line rules in context, not restated scripts.
- **Section-number gaps:** 1.6, 5.6.2, 5.9.3, 7.9 and 10.3.4 leave gaps; Phase 4 closes them. 10.A/10.C/B.2 leave lettered gaps.
- **Still open from the Billing cross-check:**
  - Part C's 6.3.1 oxygen "maintenance-and-servicing payment every 6 months" claim (Billing packet question).
  - Oxygen cylinders typed as capped rental in `equipment.json` (they still show in 10.3.1).
  - E0471's class.
- **Billing packet:** should confirm the recalculated 10.13.8 example (B-22). Add it in Phase 6.
- **Training file:** `manual/training/` is new and outside the build. Its "See" column uses today's numbers and needs the Phase 4 crosswalk applied.

DOCUMENTATION UPDATES NEEDED:
- `docs/modules.md` (Reference / manual), if it describes the manual's structure: Billing now holds the oxygen restart rules (10.13.8) and the EAA (10.20.6), and 3.12.2 is the single compliance table.
- `manual/README.md`: mention `manual/training/` (material taken out of the manual for the Training module, not built).
- None for CLAUDE.md (counts unchanged; `counts.mjs --check` agrees).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
