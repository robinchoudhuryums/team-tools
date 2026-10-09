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
  (`.m-scope-btn.on`) and `qa/script_qa.html` (`.qa-btn.prime`) do the same —
  follow-on, outside this plan.

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

