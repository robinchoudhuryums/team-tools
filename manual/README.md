# CSR Procedures Manual v3.0 — source and build

The single source for the UMS CSR Procedures Manual. Everything a CSR reads — the HTML manual, the
per-department Word extracts, the review packets, and (next) the Reference module's articles — is
generated from this directory. **Edit here, never in the outputs.**

## Layout

| Path | What it holds |
|---|---|
| `src/p0.md` … `src/p10.md` | The eleven chapters (the file key is the chapter number since the October 2026 renumber; p4 = Sales). Chapters 0 (CSR Core), 1 (Call Handling) and 10 (Billing & Denials) go into every department guide |
| `src/appendix_a.md`, `_b`, `_c` | Glossary, escalation directory, quick reference cards. Appendices D (changelog) and E (index) are generated |
| `data/*.json` | Structured facts rendered into the text: equipment (`equipment.json`), roster, glossary, fees, changelog, icons, figures. **Curated by hand — these are the source, not generated** |
| `data/chapter_style.json` | Each chapter's department name, colour (light and dark) and icon — the ONE source for the HTML, the Word files, the diagrams and the Reference reader's icons and `--man-pN` tokens |
| `data/extracts.json` | What each department guide (Word) carries: the default chapters, the guide's own chapter, and any extra chapters, sections or cards. Edit this, never the text, to change a guide |
| `data/index.json` | Curated index topics (`extra`): terms the index would not otherwise list — the email update types and note statuses — indexed wherever the text uses them |
| `data/renumber-2026-10.json` | The October 2026 renumber's crosswalk, new section → old. The HTML search uses it to find a section by its old number ("formerly 9.4") |
| `roles.py`, `footnotes.py`, `numbering.py` | Shared by the build and the export: the role resolver, footnotes, section-number display |
| `rasterize_diagrams.py`, `check_pdf.py` | Diagrams and chapter badges as PNGs for Word; the blank-page check on a PDF of the manual |
| `training/` | Material taken out of the manual for the app's Training module (the Billing knowledge check). Not built |
| `data/thumbs.json`, `data/figures_b64.json` | Embedded product photos and screenshots (base64) |
| `mocks_b1.py`, `mocks_b2.py`, `mocks_power.py`, `make_diagrams.py` | Diagram sources. `make_flow_diagrams.py` writes them to `diagrams/` |
| `packets/spec.json` | The departmental review questions |

## Conventions the build enforces

- **Section numbers change only in a deliberate renumber.** Sources use `§5-9.2`; readers see `5.9.2` (`numbering.py`). Cards `§C-5` display as **CARD 5**. The one renumber so far (October 2026) is recorded in `data/renumber-2026-10.json`.
- **Cross-references** are `[[§5-9.2]]`. An unresolvable reference **fails the build** — there are no exemptions.
- **Placeholders** expand from data at build time: `{{eq:…}}` equipment tables, `{{roster:…}}` (`roster:all` is the Appendix B.1 directory, and `roster:pN` one chapter's rows in the same shape — Role, Holder, Backup, How to reach, A–Z by role; `roster:oncall` is the after-hours on-call table, one row per person; `roster:leads` the department leads), `{{glossary:…}}`, `{{fees}}`, `{{waiver-matrix}}`, `{{diagram:name}}`, `{{figure:id}}`.
- **Roles** are written `` `[ROLE: Name]` `` and must exist in `data/roster.json`. Each links to that person's B.1 row. The match tries the exact role name first (`roles.py`), so name the role exactly.
- **Tables** stay tables in every output. A table whose first header is `Step` is drawn as numbered steps; a header that opens with ✓ or ✗ tints its column green or red (the Do's & Don'ts tables). A list item that opens with `☐` is a checklist line.
- **Footnotes** are `text.[^1]` with `[^1]: note` on its own line in the same level-2 section; they are numbered per section and gathered under "Notes" at its end. A marker without a definition, or the reverse, fails the build.
- **Callouts** are `> **Critical — …**`, `**Policy**`, `**Watch-out**`, `**Script**` or `**Note**`. Critical is reserved for patient safety or federal law.
- **`[PENDING: …]`** markers are allowed in drafts; `RELEASE=1 python3 build.py` fails while any remain.

## Building

Requires Python 3 with Playwright (Chromium) and Pillow, and Node with the `docx` package.

```bash
./make_all.sh        # manual HTML + Word extracts, with all structural and render checks
./make_packets.sh    # review packets (Markdown + Word); run after make_all.sh
```

Output goes to `$MANUAL_OUT` (default `./dist`). `out/` holds intermediate Markdown. Both are git-ignored.

## Reference articles (team-tools)

`python3 export_reference.py` (run last by `make_all.sh`, or on its own — it needs only Python 3.12)
writes `$MANUAL_OUT/reference/manual.json` — **the one file to upload**. It carries the version and build
date, the Chapter 1 call router, the dated changelog, the images every section cites (icons, figures,
equipment photos — the import stores them in the KB spreadsheet's `ManualImages` tab), and the articles: one per level-2 section, one per quick reference card, one per
Appendix B section, one glossary article, and the front page — ids `man-5-9`, `man-c-5`, `man-b-1`, `man-a`,
`man-howto`. Bodies are the Markdown the Reference renderer draws: callouts stay `>` blocks, Script callouts
become copyable snippets, cross-references become `kb:man-5-9#5.9.2` links. **The export fails and writes
nothing** on a reference or role that does not resolve (in a body, the router or the changelog), a body over
the Reference limit (49,000 characters), HTML the renderer would print literally, or a placeholder left
unexpanded. It is deterministic, so exporting unchanged source gives identical files and a re-import changes
nothing.

To load it: Reference → **Manual** → **Choose File** → `manual.json` from your computer → **Check** →
**Import** (no Drive: the domain disables Apps Script's Drive). Articles arrive as **drafts**; sections are **read-only in the app** (this directory is the one
source — reps send corrections with "Suggest an edit"). A section the manual no longer has is listed on the
check and removed only if you tick the box. In Reference the manual reads as one continuous page per chapter,
with working cross-references, previews, the call router in the Ctrl/⌘+K drawer, and section-number search
(`5.9`, `5-9`, `§5-9`, `card 5`, `chapter 5`). Departments are labelled "Chapter NN — Name"; the app still reads
older "Part NN —" labels.

**Diagrams are different: they ship with the app's code.** When the export runs inside the team-tools repo
it also rewrites `web-app/kb/script_manual_diagrams.html` from `diagrams/*.svg` — allowlisted, themed for
the app (light and dark) and cross-linked — but only when a diagram changed. A changed diagram therefore
reaches Reference by **commit + deploy**, not by the import; the Node harness fails if a diagram changed and
the partial was not regenerated.
