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

The HTML manual is one self-contained file: search, the "What did the caller say?" router, hover previews
of cross-references, pinned sections and the printable quick reference cards all work offline.
