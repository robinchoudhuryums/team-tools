---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Manual-update Phase 4, the one renumber (`.cycle/manual-update-plan.md` Part E; decisions A0 "Chapter" + the Sales move, A0b items 1–2, and A0f items 95–96, recorded 2026-10-07).
- 4a. Renumbered the manual source to the approved map (`.cycle/manual-renumber-map.md`; `manual/data/renumber-2026-10.json` holds new → old for 217 sections):
  - "Part" becomes "Chapter".
  - Sales becomes Chapter 4 and takes Power's 4.2 Insurance eligibility as 4.4.
  - Parts 4–8 become Chapters 5–9.
  - The gaps close: 1.6, 5.6.2, 5.9.3, 6.14, 7.9 and 10.1. 10.B becomes 10.A.
  - Billing is renamed "Billing & Denials", and the cards follow the chapters.
  - Part keys become chapter keys (p4 = Sales); each department keeps its colour and icon.
  - The HTML search finds a section by its old number ("formerly 9.4").
- 4b. The app reads the new labels:
  - `kbDeptRank_` (server and client) and `kbManualChapterKey_` accept "Chapter NN —" as well as "Part NN —".
  - `kbManualNumberTarget_` accepts "chapter N".
  - `KB_MANUAL_CHAPTER_ICONS` and the `--man-pN` tokens are re-keyed from `chapter_style.json`.
  - The UI copy says "chapter".
- Out of scope by operator decision (A0f item 95): the app history migration. Little or no use is attached to manual sections yet, so the renumbered manual re-imports fresh.

Files modified:
- manual/src/: all eleven chapters, with files moved to their new keys (p9→p4, p4→p5, p5→p6, p6→p7, p7→p8, p8→p9), plus appendix_a and appendix_c
- manual/data/: changelog, roster, glossary, equipment, chapter_style (re-keyed), renumber-2026-10.json (new)
- manual/packets/spec.json (keys, sec values incl. comma lists, heads)
- manual/training/billing-knowledge-check.md
- manual/ code: build.py, export_reference.py, md2model.py, make_html.py, render.py, make_review_packets.py, make_diagrams.py, mocks_b1/b2/power.py; README.md
- manual/diagrams/*.svg (11 regenerated)
- web-app/: 70_kb.js, kb/script_kb.html, styles_design_tokens.html, kb/script_manual_diagrams.html (generated)
- test/: client/run.js (M2-R2, M3-S1, MP1-4, MP2-4), client/dom/runDom.js (M1, M2 DOM copy), client/server-split-manifest.json (revision recorded), visual/mock.js (fixture labels)
- .cycle/: manual-renumber-map.md (new), manual-update-plan.md (A0f), STATE.md
Estimate: L (~6 h) — written before the first edit, 2026-10-07 (after the operator dropped the history migration)
Actual: ~3 h

CHANGES:
4a | src, data, packets, training, build scripts | Steps:
- The map was generated from the source before anything moved, then frozen. Files moved by git mv. The 4.2 block was cut into Sales after 4.3.
- One regex pass mapped every `§` token through the frozen map, in src, data, packets, mocks, make_diagrams, make_review_packets, build.py and the training file. It applies simultaneously (the map chains, e.g. 4-1 → 5-1 while 5-1 → 6-1). It is strict on src: an unmapped numeric token fails the run.
- "Part N" became "Chapter M" in live text by old→new number. Historical "What changed"/"Open items" tables are untouched. Manual-sense "part" became "chapter" by hand; spare parts and Medicare Part A–D are untouched.
- The JSON data was re-keyed with formatting preserved (diffs are only the changed values).
- Packets: rows' `sec` values are mapped, including comma lists (five fixed in a second pass after the first missed them). Heads say "Chapter N" and the new guide filenames. Sales and After Hours have no FAQ, so they take no FAQ excerpt; After Hours' map had pointed at §8-9 since Phase 2 created "For on-call technicians".
- The diagrams' `--pK` colour tokens follow the key map. The lifecycle labels read "Sales — Chapter 4" and "Power intake — Chapter 5", and build.py's label check reads "Chapter".
— commit 3b06218
4b | web-app, test | Changes:
- Both rank regexes read `^(?:Chapter|Part) \d+ — `.
- The chapter key reads either word.
- "part N" and "chapter N" both resolve, matched against "Chapter NN " or "Part NN " departments, and the result reads "Chapter N".
- The icon map and both token blocks were generated from chapter_style.json (the diff is a pure permutation).
- Six UI strings say "chapter". The server's 'Missing part.' is now 'Missing chapter.'.
- Pins test the new behaviour: Chapter labels sort with legacy Part labels; Power = p5/bolt, Sales = p4/clipboardList; legacy "Part 10" still reads by number; hostile names are still escaped.
— commit 3b06218

TEST RESULTS: passed. Test Command is `manual`. Programmatic checks on 3b06218:
- Pure 1250/1250, DOM 222/222; `lint:server` clean; `counts.mjs --check` agrees.
- F2c needed a manifest revision for `kbDeptRank_` and `getManualPart`; recorded with `split-manifest.mjs --why`.
- Manual build: ERRORS 0, WARNINGS 30 (the same warnings, now under the new keys). 12 print pages. xref WARNING 42 (unchanged).
- Packets: all nine build, nothing MISSING.
- `manual.json`: eleven "Chapter NN —" departments plus the three appendices. Sales is `man-4-1`…`man-4-9`, Billing ends `man-10-a`, and router targets use the new ids.
- Visual matrix, `reference-manual` filter: 19 scenarios, 0 overflow, 0 missing, no page errors (only web-font certificate failures through the container proxy).
- Screenshotted Chapter 4's opening (Sales colour and clipboard icon; 4.4 link inside the chapter) and the reader tree.

Regression scenarios:
- S124: PASS for the export side. The import must follow the deploy — NOT WALKED.
- S125: PASS:
  - the tree groups the manual by chapter (visual shot);
  - typed numbers are pinned (M2-R2, incl. "chapter N");
  - kb: links carry the new ids.
- S126: PASS by trace. The changelog ids map, so "recently changed" lands on the right sections.
- S127: PASS by trace (xref report unchanged at 42).
- S128: PASS by trace (synonyms line printed). The app's number search uses the new numbers; there is no "formerly" alias in the app (see FOLLOW-ON).

REGRESSION RISKS:
- **Reused ids carry their row across:** the import matches by id, so an id that exists today but now names a different section is UPDATED in place. Its published status and any comments, views, flags or training attached to it move to the new section. Example: `man-5-1` (Field Ops scope) becomes Power scope. The operator judged attached use negligible (A0f item 95). Brand-new ids import as DRAFTS.
- **Window between deploy and import:** existing "Part NN —" rows read by the new keys, so a "Part 04 — Power Mobility" row shows Sales' icon and colour until the import replaces it. This is cosmetic and lasts only until the import.
- **Bookmarks and recents in reps' browsers:** these store id + title. A reused id opens the new section under the old stored title until reopened.
- **Old numbers typed in the app:** "9.4" now opens the new 9.4 (After Hours). Only the HTML manual has "formerly" aliases.

INVARIANTS AT RISK: None broken.
- INV-325/329: the rank and number search are extended; "Part" still reads; pinned by M3-S1 and M2-R2.
- INV-330/331: the partial is regenerated, and every `data-kb-id` still matches `KB_MANUAL_ID_RE` (M3-D1 green).
- INV-318/321: per-id matching and orphan removal are unchanged, and they are how the fresh re-import works.
- INV-345: xref count unchanged.

NET SCORE: 0 − 2 = −2
- Production fixes: 0. The renumber is an operator-requested restructuring (capability, not a defect fix). The packet FAQ map fix touches packets not yet sent.
- New failure modes, both Low and accepted by the operator's no-migration decision:
  1. Reused ids carry status and history to a different section on import.
  2. Legacy "Part" rows show the new key's icon until the import.

OPERATOR ACTIONS / DEPLOY:
- 1. Deploy the app FIRST: `cd web-app && clasp push -f`, then Deploy → Manage deployments → New version. The import's "Chapter NN —" labels need the new rank, icons and number search. This deploy also carries every earlier phase's app change (colours and icons, table styles, all diagram changes). | BLOCKS DEPLOY: N (it IS the deploy) — but it BLOCKS the import
- 2. Then re-export and import: `manual/make_all.sh` → Reference → Manual → Choose File `manual.json` → Check → Import, **with "Remove sections no longer in the manual" ticked**. This one import supersedes the Phase 1–3 imports still owed, so they can be skipped. Check should list the old ids being removed (every renumbered or deleted section). | BLOCKS DEPLOY: N
- 3. Publish by chapter (Reference → Manual → Publish → Every chapter, or one at a time after vetting). New ids arrive as drafts, while reused ids keep their status. | BLOCKS DEPLOY: N
- 4. Tell the team that sections are renumbered. The HTML/Word manual finds old numbers ("formerly 9.4"); the app uses the new ones. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then a New version (CLAUDE.md Development).

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- **App "formerly" alias:** the export could carry the crosswalk so the app's number search answers "9.4 (formerly)". Not built. The HTML/Word manual has it.
- **The plan's working notes** (`.cycle/manual-update-plan.md` Part F and Appendix 1) still use the old numbers. They are a dated working record; the packets come from `packets/spec.json`, which is renumbered.
- **G4600 code link:** the app still shows "G4600" in the CPAP table as a code link (noted earlier). Not changed here.
- **`data/images.json` notes** mention "Part 0/Part 4". They are internal, unbuilt notes, so they were left.
- **Phase 5 can start:** directory, glossary additions, index curation, cards redesign.

DOCUMENTATION UPDATES NEEDED:
- `docs/modules.md` (Reference / manual):
  - "Chapter NN —" departments and chapter keys;
  - the renumber crosswalk file;
  - the number search accepting "chapter N";
  - the department rank accepting both words.
- `CLAUDE.md`'s Projects or Reference narrative, if it says "Part" for manual units (check during /sync-docs).
- `manual/README.md` is updated for the chapter files; it should also mention `data/renumber-2026-10.json` and `training/`.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
