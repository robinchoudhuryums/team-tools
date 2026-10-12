# Manual reader design — plan and operator decisions (2026-10-09)

Source: the Claude Design handoff `docs/design_handoff_manual_reader/README.md`
(+ the mockup beside it). **The repo takes precedence over the handoff** — where
they disagree, the repo's rule is followed and the difference is recorded here.

## Review (2026-10-09)

Every function, class, token, icon and data shape the handoff names was checked
against the repo; all exist as described. Repo-side corrections to the handoff:
- Callout tokens are `--danger` / `--danger-soft` (aliases of `--destructive`) in
  `kb/script_kb.html`; Phase 1 uses the file's own names.
- The contrast bug is FIVE filled-accent buttons, not two: `.kb-man-go`,
  `.kb-typetog button.on`, and three inline Save / Publish buttons. The repo's own
  idiom (styles.html) is `background: var(--accent); color: var(--paper-card)`.
- One real callout opens "**Critical.**" (a full stop, no dash): the kicker step
  leaves no lone "." as a title, and a label run straight into words is left as written.
- A stacked two-column table kept its 34% label column (specificity) — fixed in
  the container query.
- `styles.html` line ~2408 also put `#fff` on `--accent` (the toast's Reload) —
  fixed with Phase 2 (operator 2026-10-09). `metrics/script_metrics.html`
  (`.m-scope-btn.on`) and `qa/script_qa.html` (`.qa-btn.prime`) did the same —
  fixed with Phase 3, with four more the app-wide sweep found (MRD-3 pins every file).

## Operator decisions

1. **M6 — option (b):** the section-heading and chapter-title stripes go in the
   reader AND the HTML manual (`manual/make_html.py`); a hairline under each
   section heading instead. The Word copy keeps its heading stripe (not asked).
2. **Card diagrams — option (a), in the source:** Cards 4, 5, 8 lead with
   `eligibility-status`, `power-process`, `o2-troubleshoot`. The HTML manual prints
   each such diagram on its own page after its card (print check 12 → 15 pages),
   and the Word copy puts the diagram's landscape page after the card text.
3. **M15 trail:** in the Reference tab only; the Ctrl+K drawer keeps its Back
   chip; a trail chip drops the chips after it (Back still pops).
4. **Dark-mode print:** the dark chapter colours apply to the screen only (no
   second copy of the hex values — the chapter-style tripwire); the same for the
   app's dark semantic colours, checked across the app's one print block.
5. **M14:** resolved by decision 2 — the masthead card carries its diagram with
   no special case.

## Phases (one commit + one deploy each; each waits for the operator)

| Phase | Items |
|---|---|
| 1 | Contrast fix ×5, duplicate CSS, M1–M5, M6 (reader + HTML manual), M7 |
| 2 | M8 reader bar + scroll-spy, M10 tree rows |
| 3 | M9 masthead + skeleton loading, M11 previous / next chapter |
| 4 | M17 footnotes + glossary in the popover, M18 manual search hits |
| 5 | M15 trail, M16 resume (inside `umsKbPanel` — no new storage key) |
| 6 | M12 manual home on the Reference landing (router examples from the real router) |
| 7 | M13 compact pop-out (pop-out AND ≤720px triggers) |
| 8 | M14 masthead card, M19 card print, the dark-mode print fix, card diagrams in the source |

## Phase 2 adaptations (2026-10-09)

- **Spy:** one scroll listener bound once to `#kb-main` (rAF-throttled), not an
  IntersectionObserver: an observer fires only on a band crossing, so a short last
  section could never be named, and a listener bound once has nothing to disconnect.
  At the foot of the page the section the rep opened wins while its heading shows.
- **Version line** kept under the chapter title until M9's masthead absorbs it.
- **‹ › at a chapter edge** open the neighbouring chapter's first section (M11's rule).
- **Reader-only scrolling (found by measurement):** `scrollIntoView` scrolled the
  app's page too (136px before Phase 2, 196px with the band), which hid the bar
  under the shell's tab strip; `kbReaderScroll_` scrolls `#kb-main` only.
- The bar and the Back row share one sticky band (`.kb-man-top`), with
  `scroll-padding-top` so a target heading lands below it.

## Phase 3 adaptations (2026-10-09)

- **Skeleton** uses the app's `.skel` shimmer (styles.html's loader vocabulary),
  not new `--paper-2` blocks; the skeleton is not a `.kb-man-sec`, so the spy,
  Print, the decorators and focus all ignore it.
- **Index rows** open by `kbOpenItem_` (a fresh start clears the Back chip), not
  `kbManualFocus_`; a one-section chapter has no index.
- **One masthead renderer** (`kbManualMastheadHtml_`) for the skeleton and the
  chapter, so nothing moves when the chapter lands; the version line lives in it.
- **The "N updated" window** is derived from `KB_MANUAL_UPDATED_DAYS`, never a literal.

## Phase 4 adaptations (2026-10-09)

- **Footnote pairing:** the build restarts note numbers per sub-section, so a
  reference pairs with the first note of its number AFTER it (never the first on
  the page); a number with no such note is left as written.
- **Glossary:** "Go to glossary" flashes the definition row on the same page
  (`kbGlossRowFor_`) rather than opening `man-a`; manual chapters still mark terms
  only on the Glossary page (the annotator reads definitions from the page).
- **One card, one binding:** `KB_POP_SEL` (links, footnotes, glossary marks) rides
  the existing hover / focus / Escape-first binding; marks inside the card are inert.
- **Results:** one callout decorator (`kbDecorateCallouts_`) serves the chapter and
  the search results (tab and drawer); the callout and step CSS extends to
  `.kb-chunk-body[data-kb-man]`.

## Phase 5 adaptations (2026-10-09)

- **Trail:** replaces `KB_STATE.backTo` (the single "Back to" chip) in the tab; the
  section a link sits in joins the trail WITH its landing block, so any jump — not
  only a cross-chapter one — is undoable; the drawer keeps its own Back (decision 3).
  The handoff's "newest first" in compact is met by scrolling the row to its newest
  end, not by reversing it.
- **Resume:** "untargeted" means a chapter-level control (the M11 cards, ‹ › across
  a chapter edge) — `nav.chapter`; the M12 home tiles will pass the same. Stored in
  `umsKbPanel.resume` per chapter as {id, h, at}, entries over 7 days dropped on save.
- **`--on-warn`** (tokens partial, both base blocks): the readable text on the amber
  fill flips between modes, so no single existing token served.

## Phase 6 adaptations (2026-10-09)

- **Order:** the home leads a wide landing (the handoff); a landing ≤680px wide
  (the pop-out, a phone) puts the lookups first by CSS `order` — measured, the
  lookups sat ~1,100px down at 480px. **Operator 2026-10-09: keep the narrow-only
  order.**
- **The jump box** lives in a home that is inserted ONCE (`kbHomeEnsure_`); only
  its read-only parts repaint (`kbHomePaint_`) — the T1 rule.
- **Router openers** are the first three router rows whose targets the reader can
  see; the "recently changed" list stays where it was in the landing blocks.
- **The drawer's decoration:** the callout and step CSS now keys on
  `.kb-article[data-kb-man]` (search chunks and the drawer's section alike).

## Phase 7 adaptations (2026-10-09)

- **Both triggers (A2):** `:root[data-compact]` AND `@media (max-width: 720px)` carry
  the same rules (one row, Contents shown, the tree folded unless `.kb-side-q`, 44px
  ‹ ›).
- **Contents lists the whole library**, not only the current chapter: the tree is
  folded on a narrow screen, so the dialog is the only way to a hand-written article
  there. The handoff's chapter switcher + current chapter come first.
- The overlay follows the shell lifecycle: `ensureOverlay` (named by its heading),
  an `onClose` hook that removes it, the × through `closeOverlay`; a row closes then
  opens.


## Phase 8 adaptations (2026-10-09)

- **Per-copy diagram ids (found while building M14):** a diagram's arrowheads are
  markers found by `url(#id)`, and Chromium resolves that to the FIRST element with
  the id — drawing nothing when it sits in a hidden subtree (measured). With the
  Power card in the masthead and 5.1.1 below it, a collapsed card (or 5.1.1 printed
  alone) took the arrowheads off the section's diagram. `kbDiagramHtml_` and Full
  size now draw every copy through `kbDiagramScopeIds_` (each `id` and `url(#…)`
  suffixed per copy), so the card body is simply hidden when closed.
- **The diagram follows the text in the document:** the handoff's "flex + order"
  and "columns" cannot share one element, so `kbManualCardShape_` moves the card's
  text into one columns wrapper and the diagram after it; the screen lifts the
  diagram first with a flex order, and print (a plain block) puts it on the next
  sheet. The same shape serves the masthead card and the Appendix C card pages,
  which now wear their chapter's colour (`kb-man-pN`), as in the HTML manual.
- **Print card** reuses `kbPrintSectionById_`: an id that is a card and has no
  section on the page finds the masthead card. `kbPrintEls_` marks one subject or
  several (Print all cards) and sets `data-print-card` for a card.
- **The masthead card renders only from the prefetched manual** (the handoff's "omit
  rather than wait"); no repaint is triggered when the prefetch lands.
- **Dark-mode print — two causes, both fixed:** (1) the dark semantic and chapter
  colours now sit in `@media screen` blocks in the tokens partial (no second copy of
  any hex); (2) found by printing: `index.html` sets `data-mode` on `<body>` too, and
  `body[data-mode="dark"]` re-declared the neutrals one level below the print
  block's `:root` override, so every dark-mode printout in the app kept its
  near-white ink. The print block now forces the neutrals on `:root, body`. The
  accent family is not covered (each palette's dark block redefines it, and a print
  rule cannot darken a property from its own value) — follow-on.
- **The HTML manual and Word:** the card diagram is the card's reverse in both —
  `make_html.py` moves it after the footer with its own head and folio (the contents
  sheet's page numbers count it), `validate_render.py` expects one sheet more per
  diagram card (15), and `md2model.py` holds it until the card's text has run, so
  the landscape page follows the card instead of splitting its heading from it.
- `test/visual/print-check.mjs` had called the Phase 2-renamed `kbPrintSection_`
  since Phase 2; repaired, it now reads `--ink` on `<body>` too and measures a card.
