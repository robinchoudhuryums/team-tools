---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Manual-update Phase 6, the review packets (`.cycle/manual-update-plan.md` Part E Phase 6 and Part F; the operator list's "add to X's packet" items 116, 136, 165, 179, 186, 189, 197, 204, 242, 247, 269, 271, 341, 367; decisions 10–12, 15–17, 19–22, 25, 27, 29, 34, 36, 39, 88, 89, 94b). The command said "Batch 6"; the plan has no Batch 6, so it was read as Phase 6.
- 6a. Each packet gains an "Added in the October 2026 update — please confirm" group, before its open questions, holding:
  - the Part F questions and the list's packet items for that department;
  - the reviewer's own B.1 directory rows (the Phase 5 consolidation) for every department packet except Oxygen, which has no rows of its own;
  - the three 2026-10-07 questions (APAP, and the PMD-within-5-years question in Sales and Power), moved in from the open questions.
- 6b. The new Denials packet (key `denials`, decision 12):
  - for Monil Shah, with Bhoj Bhatt as the Denials backup;
  - covers 10.17.3's two direct-to-member calls, the directory row, the Claim Prep tab with RR/NU, write-off types, 10.17 and 10.8.
- 6c. Readers (Part E's "new reviewer notes"):
  - Power names Rajdeep Thakar (Power Manager), for the whole packet and the product guide (item 186);
  - Parth Shah reads the ◆ questions beside Ozaire (MD) Hawa (item 165);
  - Service names Parth Shah as the Service Supervisor's backup.
- 6d. Stale packet text fixed:
  - **The renumber:** Phase 4 mapped only the `sec` fields. The heads' example numbers, eight in-text section numbers and every "Part N" now read the new chapters.
  - **Nine summary lines the October text had overtaken now match the manual:** walkers out of state; delivery radius; wheelchair size changes; the Repeat Resupply subject; category-owner and PAR-specialist backups; PMD delivery to a nursing home (Power and Field Ops); the $75 diagnostic charge; and the removed "no trip charge during a repair" rule (Service and Billing).

Files modified:
- manual/packets/spec.json
- manual/make_review_packets.py (directory rows, the Denials packet, NAMES at module level, plain text in open-question headings)
- manual/packet_model.py (directory rows in the Word packet)
- manual/make_packets.sh (packets come from the spec's keys; Word files named like the Markdown ones)
- .cycle/manual-update-plan.md (Part F: note that Phase 6 carries it), .cycle/STATE.md
Estimate: M (~4 h) — written before the first edit, 2026-10-07
Actual: ~2 h

CHANGES:
6a | spec.json | New rows by packet:
- Manual Mobility: 3 (directory, coinsurance, bariatric below the threshold).
- Respiratory & Resupply: 7 (directory, coinsurance, oximetry, RT phone-first, vent patients outside DFW, POC out of pocket, the trial-fails wording by payer), plus APAP moved in.
- Sales: 1 (directory), plus 4.5.1 moved in.
- Power: 8 (directory and the missing Power Manager backup, coinsurance, dual submission, product guide, PT/ATP per insurance, the PT/OT referral point, virtual ATP owner ◆, standard vs complex), plus 4.5.1 moved in.
- Field Ops: 10 (directory ◆, POC out of pocket, ramps, the backorder policy, facility stock oxygen, San Antonio oxygen tickets, swap-out billing, mask fitting, 6.4.5 Texas Medicaid timing, oximetry).
- Service: 3 (directory, the FedEx lost-package claim, swap-out billing). Row 23 now asks whether other referral guidance should replace the competitor list.
- After Hours: 3 (directory, 30 minutes between each step, phone first).
- Billing: 13 (5.8.1 rent-to-own refund, Texas Medicaid CPAP, the bariatric ABN, waiver documentation, swap-out billing, the complex-rehab purchase exception, E0470 vs E0471, the oxygen servicing payment, E0431 cylinders as capped rental, the dual-eligible billing order, upgrade fees vs the sheet, PMD within 5 years as Same or Similar, the recalculated oxygen restart example). The Oxygen packet's row 10 also asks for the restart example's dates to be checked.
Rows are renumbered through each packet.
— commit 113195b
6b | spec.json | The `denials` packet, three groups, 8 questions — commit 113195b
6c | spec.json | Power and Service heads — commit 113195b
6d | spec.json | Changes:
- The head examples: 9.2.1→4.2.1, 4.7.2→5.6.2, 5.9.2→6.9.2, 6.3.2→7.3.2, 7.2.1→8.2.1, 8.4→9.4, 10.13.6→10.12.6. The Power head's "Power was Part 3 in earlier drafts" now reads "Part 4 before the October 2026 renumber".
- In-text numbers mapped by the crosswalk (9.4→4.5, 9.4.1→4.5.1, 4.1→5.1, 5.9.2→6.9.2, 8.5→9.5, 7.6→8.6, 10.5.2→10.4.2).
- "Part N" → "Chapter M" by the old→new chapter map, including "Parts 5 and 6".
- The nine summary lines above.
— commit 113195b
generator | make_review_packets.py, packet_model.py, make_packets.sh | Changes:
- `directory_rows(which)`: cuts the header and the reviewer's rows from the BUILT §B-1 table, so the packet prints exactly what the manual prints. A role it cannot find is reported as MISSING.
- `NAMES` is shared by the Markdown and Word steps. The Word loop reads the spec's keys, so the Denials packet builds too.
- An open question's heading strips inner bold, as the Word packet already did.
— commit 113195b

TEST RESULTS: passed. Test Command is `manual`. Programmatic checks on 113195b:
- Pure 1250/1250, DOM 222/222; `lint:server` clean; `counts.mjs --check` agrees.
- `make_packets.sh`: all ten packets build, Markdown and Word, with nothing MISSING. Every new row's excerpt was read against its question.
- The Word Denials packet opens and carries the new text.
- The manual source did not change, so the manual build and `manual.json` are unchanged from Phase 5 (ERRORS 0, WARNINGS 25, 12 print pages).

Regression scenarios (Subsystem: Manual source):
- S124–S128: NOT APPLICABLE. They walk the export, import, reader, recently-changed, previews and search. Phase 6 changed only the review packets, which are outside `manual.json` and the app. The manual source and the export are untouched.

REGRESSION RISKS:
- **Word packet filenames changed** from `Review-Packet-P2-…` to `Review-Packet-C2-…`, matching the Markdown names. No packet has been sent, and nothing in the repo reads the old names.
- **Directory rows are matched by exact role name** in the built table. A role renamed in `roster.json` but not in the packet's list would drop out. The chapter-key form reads `roster.json`, so it follows renames; only the Denials packet names a role by hand, and a missing role is reported as MISSING.
- **Row numbers moved.** Inserting the October group renumbers the open questions. The plan's Part F quoted "Part 9 row 21" and "Part 4 row 29"; the note added there says its numbers are the old ones.

INVARIANTS AT RISK: None. The packets are build-only and outside every app invariant. INV-327 (the export fails closed) is unaffected because the source and export are unchanged.

NET SCORE: 0 − 0 = 0
- Production fixes: 0. No packet has been sent, so the stale lines and old numbers had not reached a reviewer.
- New failure modes: 0. The filename change and the renumbered rows are covered under REGRESSION RISKS. Neither reaches anyone before the packets are sent.
- Correction to the Phase 4 block: it reported the packets renumbered ("rows' sec values are mapped … heads say Chapter N"). The question text kept the old numbers and "Part N", and the heads kept old example numbers. That was an unreported Phase 4 failure mode, fixed here. Nine summary lines had been overtaken by Phase 2–3 text, and those phases' blocks did not report it either.

OPERATOR ACTIONS / DEPLOY:
- Build the packets: `manual/make_all.sh`, then `manual/make_packets.sh`. Output: `$MANUAL_OUT/review-packets/` (Markdown) and `…/word/` (Word). Send each department its packet:
  - Manual Mobility: Parth Dave
  - Respiratory & Resupply: Nikunj Solanki
  - Sales: Mary Carson, with April Arredondo
  - Power: Rajdeep Thakar, Erica Thongvan and Ahmed Ramadan, with Ozaire Hawa and Parth Shah
  - Field Operations: Parth Shah and Mahesh Patel, with Ozaire Hawa
  - Service: Arnav Pan and Parth Shah
  - Oxygen: Nikunj Solanki, with Arnav Pan
  - After Hours: you, Parth Shah and Shagun Shastri
  - Billing: Bhoj Bhatt and the Billing supervisors
  - Denials: Monil Shah, with Bhoj Bhatt
  | BLOCKS DEPLOY: N
- When answers come back, they go into the manual source (each confirmed or corrected fact). Then re-export and import. | BLOCKS DEPLOY: N
- Still owed from earlier phases:
  - deploy, then import with "Remove sections no longer in the manual" ticked, then publish by chapter;
  - a Power Manager backup;
  - the Billing quiz;
  - E0191 in OopPricing;
  - photos and URLs.
  | BLOCKS DEPLOY: N
Deploy: N/A for this phase — no `web-app/` change. The app deploy owed from Phases 1–4 is unchanged: `cd web-app && clasp push -f`, then a New version.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- **Virtual ATP:** Power row 7 and row 32 overlap. Row 32 asks who owns virtual ATP scheduling (item 165) directly, so both were kept.
- **Oxygen packet:** it gained no October group. Its Part F items are Billing or Field Ops questions; it does get the restart-dates question on row 10.
- **The plan's Part F** keeps its old numbers as a dated working record.
- **Phase 7 (sweeps) can start:** MA wording, "traditional (Original) Medicare", footnote candidates, the cross-reference audit, the Billing cross-check, the PDF spacing pass. Also the department guides' "Related sections from other parts" heading (`build.py`), which should say "chapters".

DOCUMENTATION UPDATES NEEDED:
- `manual/README.md`:
  - the `packets/spec.json` row could say a row may carry `roster` (the reviewer's B.1 rows) as well as `sec`;
  - the packets include the Denials packet;
  - the Word files are named `Review-Packet-C<N>-<Name>.docx`.
- None for CLAUDE.md (no counts changed; `counts.mjs --check` agrees).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
