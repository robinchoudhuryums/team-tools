# CSR Procedures Manual v3.0 — source and build

The single source for the UMS CSR Procedures Manual. Everything a CSR reads — the HTML manual, the
per-department Word extracts, the review packets, and (next) the Reference module's articles — is
generated from this directory. **Edit here, never in the outputs.**

## Layout

| Path | What it holds |
|---|---|
| `src/p0.md` … `src/p10.md` | The eleven parts. Part 0 (CSR Core) and Part 1 (Call Handling) go into every extract |
| `src/appendix_a.md`, `_b`, `_c` | Glossary, escalation directory, quick reference cards. Appendices D (changelog) and E (index) are generated |
| `data/*.json` | Structured facts rendered into the text: equipment (`equipment.json`), roster, glossary, fees, changelog, icons, figures. **Curated by hand — these are the source, not generated** |
| `data/thumbs.json`, `data/figures_b64.json` | Embedded product photos and screenshots (base64) |
| `mocks_b1.py`, `mocks_b2.py`, `mocks_power.py`, `make_diagrams.py` | Diagram sources. `make_flow_diagrams.py` writes them to `diagrams/` |
| `packets/spec.json` | The departmental review questions |

## Conventions the build enforces

- **Section numbers are permanent.** Sources use `§5-9.2`; readers see `5.9.2` (`numbering.py`). Cards `§C-5` display as **CARD 5**.
- **Cross-references** are `[[§5-9.2]]`. An unresolvable reference **fails the build** — there are no exemptions.
- **Placeholders** expand from data at build time: `{{eq:…}}` equipment tables, `{{roster:…}}`, `{{glossary:…}}`, `{{fees}}`, `{{waiver-matrix}}`, `{{diagram:name}}`, `{{figure:id}}`.
- **Roles** are written `` `[ROLE: Name]` `` and must exist in `data/roster.json`.
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
writes `$MANUAL_OUT/reference/articles.json` and `images.json`: one article per level-2 section, one per
quick reference card, one per Appendix B section, one glossary article, and the front page — ids
`man-5-9`, `man-c-5`, `man-b-1`, `man-a`, `man-howto`. Bodies are the Markdown the Reference renderer
draws: callouts stay `>` blocks, Script callouts become copyable snippets, cross-references become
`kb:man-5-9#5.9.2` links. **The export fails and writes nothing** on a reference or role that does not
resolve, a body over the Reference limit (49,000 characters), HTML the renderer would print literally,
or a placeholder left unexpanded. It is deterministic, so exporting unchanged source gives identical
files and a re-import changes nothing.

To load it: upload `articles.json` to Drive, then Reference → Admin → **Import manual** with the file's
link. Articles arrive as **drafts**; an article someone has edited in the app is skipped and reported,
never overwritten.

The HTML manual is one self-contained file: search, the "What did the caller say?" router, hover previews
of cross-references, pinned sections and the printable quick reference cards all work offline.
