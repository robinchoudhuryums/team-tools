---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Manual-update Phase 1 (Foundations), per `.cycle/manual-update-plan.md` Part E — P1-a role links land on the person (one exact-first resolver; per-row B.1 anchors; the HTML preview shows that row; Word bookmarks it) · P1-b the directory shows Transfer again (Phone last) · P1-c every table stays a table in the HTML · P1-d Step tables and ✓/✗ (Do's & Don'ts) columns in HTML, Word and the Reference renderer · P1-e footnotes ([^n], per section, every output) · P1-f index fixes (links, explanation column, one entry per term, no sentence-titles, 0–9 bucket, letter bar, working filter) · P1-g Word: page breaks on headings, diagrams/screenshots/photos/icons embedded, working links; PDF blank-page check · P1-h Start-here front page (operator wording; real banner examples; no "Unified" block; owner + classification) · P1-i department-guide manifest `data/extracts.json` · P1-j colour families — swatch for approval, plus the existing palette gaps (HTML headings/nav for Parts 5–10; Word's Part 3/4 swap)
Files modified: manual/build.py, manual/make_html.py, manual/md2model.py, manual/render.py, manual/render_docx.js, manual/export_reference.py, manual/make_all.sh, manual/make_review_packets.py, manual/src/p1.md, manual/src/p7.md, manual/src/p10.md; new manual/roles.py, manual/footnotes.py, manual/rasterize_diagrams.py, manual/check_pdf.py, manual/data/extracts.json; web-app/kb/script_kb.html; test/client/run.js; CLAUDE.md (running-totals row); .cycle/STATE.md; new .cycle/manual-update-plan.md, .cycle/manual-update-list.md
Estimate: L (~8 h)
Actual: ~5 h

CHANGES:
P1-a | roles.py, build.py, export_reference.py, make_html.py, md2model.py | `roles.find`: exact name → name words → name+note (the old single pass matched notes first-in-file, so 6.2's "Service Escalation — Insurance Complaints" linked the Used Equipment Sales Contact — the only one of 26 markers that changes). Build links `#role-<id>`; make_html gives each B.1 row that id and `sectionOpening` previews a row as header + row; Word bookmarks the row.
P1-b | render.py | `| Role | Holder | Backup | Transfer | Email |` + Phone last when any row has one (Phone used to REPLACE Transfer, so "Direct" and every queue name had vanished).
P1-c | make_html.py | `classify_tables` keeps every table (the ≤9-row two-column → `<dl class="kv">` conversion is gone: index G/J/Q/V, 2.3.1 specs, 5.2, 7.6, 8.1.1, 8.1.3).
P1-d | make_html.py, render_docx.js, script_kb.html (kbMd_ + CSS), src p1/p7/p10 | first header "Step" → step table with ↓ connectors; a header opening ✓/✗ tints its column. Four existing tables' headers took the glyphs (1.4.2, 7.7, 10.21.1, 10.21.2); 1.2 waits for Phase 2's drafted "Do" side.
P1-e | footnotes.py, build.py, export_reference.py, make_html.py, md2model.py | markers → ¹²³ per level-2 section; definitions gathered under a Notes list after a `<!--notes-->` marker (styled small in HTML and Word; stripped as a comment by the export). Unpaired marker/definition is an error. No source uses it yet.
P1-f | build.py, make_html.py | index rebuilt: linked section numbers (hover previews), Explanation (abbreviation spelled out / items a code covers), folded duplicates (Knee Walker once), INDEX_SKIP_FIRST drops sentence-titles, "Inbound — …" → "Inbound", 0–9 bucket labelled, letter ids + sticky A–Z bar, filter fixed (looked for #F-1; the index is E-1); scoped to an extract's sections.
P1-g | md2model.py, render_docx.js, rasterize_diagrams.py, check_pdf.py, make_all.sh, render.py | headings carry pageBreakBefore (no PageBreak paragraphs; no spacer before a page-starting heading, past rules); diagrams rendered to PNG with the HTML's light palette and embedded; figures, thumbs, icon tables embedded; external links and internal bookmarks work; footer carries the owner. PDF: LibreOffice conversion + blank-page check when available (it cannot load files in this sandbox, so the step was not run here; the checker was proven on Playwright PDFs).
P1-h | build.py, make_html.py | HOWTO rewritten to the operator's wording; five real banners (Critical redefined per decision 6); no control block; "Where to start"; "You need to find a policy or term"; panel styling; nav shows "Confidential — Internal Use Only · Owner: Robin Choudhury".
P1-i | data/extracts.json, build.py | guides = default chapters (0, 1, 10) + own part + optional chapters/sections; cards per guide; glossary/directory filtered; links outside the guide → "(in the full manual)"; manifest validated.
P1-j | make_html.py, render_docx.js; swatch | palette gaps fixed (h1/nav rules for p5–p10; nav p10 used navy; Word p3/p4 swapped). Proposed families (after the renumber): Core 0 #1C3A5E · 1 #4A6585; Intake 2 #6A4C93 · 3 #7B57AE; Sales/Power 4 #2F6FA8 · 5 #1F4E86; Field 6 #2E7D5B · 7 #3F7A2C · 9 #2F6B57; Oxygen 8 #2E7D8C; Billing 10 #9A5E22 — all ≥4.5:1; NOT applied (awaiting approval).

TEST RESULTS: passed. Pure 1240 → 1246 (MP1-1..6), DOM 222, `lint:server` clean, `counts --check` agrees (row updated). Full `make_all.sh` + `make_packets.sh` green in-repo: 0 build errors, html checks (482 ids, 408 internal links, all resolve), render checks 0 clipped, print checks 12/12, 0 overflow; export 160 articles, diagram partial unchanged. Word XML: 0 page-break runs, 28 pageBreakBefore, 0 empty paragraphs before a page-starting heading, 212 drawings, 0 dangling internal links. Screenshots checked: front panel, step table, ✓/✗ table, role-row preview, index letters/filter, directory. **13 bite-checks, all BITE**: kbMd_ tone · resolver order · role row link · Transfer column · index filter id · localise links · Word page break · spacer past rule · extracts errors · index skip words · export footnotes; plus the roles.py and footnotes.py self-tests under mutation (roles' first version did NOT bite — its exact case was also caught by the word pass; a case only the exact pass decides was added).
Regression Scenarios (Test Command `manual`, traced): S124 PASS (make_all writes manual.json; the import walk is owed after deploy — man-howto, 1-4, 7-7, 10-21, 6-2 update) · S125 PASS (cross-references and previews unchanged; tables gain classes) · S126 NOT APPLICABLE (print and codes untouched; HTML print still the cards, 12/12) · S127 PASS (app row focus unchanged; the HTML now matches it) · S128 PASS (router 76 phrases, synonyms 97, unchanged).

REGRESSION RISKS:
- The HTML key/value lists are gone everywhere — short two-column tables now render as compact tables (intended; operator's request).
- Word files are larger (images): unified 3.5 MB (was ~0.6 MB).
- Index content changed (junk removed, entries merged) — intended.
- A department guide now includes Billing and references outside it read "(in the full manual)".

INVARIANTS AT RISK: None. INV-341 (preview opening rule) untouched; the app's row focus (M5a-FU1) is the HTML's model now. g160 (escape-first): the kbMd_ classes are constants keyed on already-escaped header text (MP1-1 hostile case). g57/g58: app CSS uses defined tokens only.

NET SCORE: 2 − 0 = 2
(Production fixes: 2 — P1-a (6.2's role link named the wrong person in every output; every HTML role link opened the top of the directory) and P1-b (the directory hid its Transfer column). Capabilities: footnotes, step/✓✗ tables, the extracts manifest, Word images/links, PDF check, index rebuild, front page. Defensive: palette gaps. New failure modes: 0.)

OPERATOR ACTIONS / DEPLOY:
- Approve (or adjust) the colour-family swatch before it is applied. | BLOCKS DEPLOY: N
- Deploy the app part (Reference table styles), then re-export manual.json and import. | BLOCKS DEPLOY: N
Deploy: Client (Reference views): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → New version. Manual: `cd manual && ./make_all.sh` → upload `dist/reference/manual.json` (Check → Import → Publish).

FOLLOW-ON ITEMS:
- HCPCS thumbnail on hover in the index (approved D8) — Phase 5 with the curated index.json.
- LibreOffice cannot load files in this sandbox, so the PDF step was not exercised end to end; first real run will be on a machine with working LibreOffice (or the operator's Word/Docs export).
- `INDEX_SKIP_FIRST` and the 10-section "too common" cut are heuristics; Phase 5's curated index.json replaces guesswork.
- The 1.2 table keeps its "Don't | Because | Where" header until Phase 2 drafts its "Do" side.

DOCUMENTATION UPDATES NEEDED:
- manual/README.md: the new modules (roles.py, footnotes.py, rasterize_diagrams.py, check_pdf.py), the footnote syntax, the two table conventions, data/extracts.json, the import steps (the README still describes the Drive upload).
- docs/modules.md / design-decisions.md: the manual's table conventions and department-guide manifest.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
