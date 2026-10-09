# Handoff: Manual reader — design update

**Type:** design update for the Reference module's procedures-manual reader (`web-app/kb/script_kb.html`, plus print rules in `web-app/styles.html` and one manual-source edit).
**Written:** 2026-10-08, from the repo's `main` as read that day.
**Source of the design:** `Manual Reader Redesign.dc.html` in this folder (open it in a browser).

---

## Precedence — read this first

**The repository takes priority over this document.** This is a design proposal, not a spec that overrides the codebase. Where this handoff and the repo disagree — clearly, or even just possibly — follow the repo.

That includes, at minimum: `CLAUDE.md`, `docs/gotchas.md`, `docs/design-decisions.md`, `docs/modules.md`, the invariants and tripwires in `test/client/run.js` and the Node harness, the comments beside the code being changed (many record operator decisions and measured bugs), and anything in `.cycle/`.

When there is a conflict or a doubt:
1. Follow the repo. Do not change the repo to make it match this design.
2. Adapt the item if its intent can be met within the repo's rules; otherwise skip it.
3. Record what was adapted or skipped and why — in the PR / commit message and wherever the repo logs operator-facing decisions (e.g. `docs/operator-log.md`) — so the operator can decide.

Also:
- **Names and line positions are as read on 2026-10-08.** Verify every selector, function and data shape before editing. If something has moved, been renamed or behaves differently, the repo's version is correct; adapt the change to it.
- **The HTML mockup is a visual reference, not code to copy.** Its inline styles and its React/DC runtime exist only so it opens in a browser. Implement with the class-based CSS and plain-JS changes below, inside the existing partials. No build step, no frameworks, no new external resources.
- **Platform rules the design already assumes:** Google Apps Script HtmlService iframe; Google Fonts are the only external resource; every server call is async via `google.script.run`; no URL routing, no `location.reload`, limited clipboard, popups may be blocked. Colours, type and spacing only from `styles_design_tokens.html`; icons only via `icon()` with existing names; dialogs only via `ensureOverlay` / `closeOverlay`. Everything must work in light and dark, all five palettes (Console, Sand, Sage, Plum, Teal), and the compact pop-out.
- **Responsive rule (A2):** `:root[data-compact]` is the pop-out, not a breakpoint. Anything that changes for narrow widths needs both the pop-out trigger and a viewport (or container) trigger.
- **Colour mixing (V-1):** a chromatic colour mixed toward a neutral uses `in oklab`.
- **Manual text is read-only in the app.** Nothing here edits chapter text in the app; the one content change (card diagrams) is made in `manual/src/` and shipped through the manual's own build and import.
- **Ship small.** Each app deploy is a clasp push plus a new deployment version. The ship order below keeps each one small and independently reversible. Stop after any deploy if the operator wants to review.

## Fidelity

High-fidelity for look: colours, type, sizes and spacing in the mockup are final, and all of them map to existing tokens. Behaviour is specified in this document; where the mockup and this text differ, this text wins (and the repo wins over both).

## Files in this bundle

| File | What it is | Commit it? |
|---|---|---|
| `README.md` | This handoff | Optional — the repo's precedent is `docs/<AREA>_HANDOFF.md` |
| `Manual Reader Redesign.dc.html` | The mockup. Artboards 1a–1e (round 1) and 2a–2e (round 2); Tweaks switch light/dark, palette and prose width | Optional — precedent: `docs/*.dc.html` |
| `support.js` | Runtime the mockup needs to open. **Not app code** — never include it from `web-app/` | Only beside the mockup (`docs/` already has one) |
| `manual_diagrams_subset.js` | Three diagrams copied verbatim from `web-app/kb/script_manual_diagrams.html`, so the mockup can draw them. **Not app code** | Only beside the mockup |

Keep the three mockup files in the same folder or the mockup will not open.

## Item index

| Id | Item | Artboard |
|---|---|---|
| M1 | Prose at reading width | 1a |
| M2 | Callouts: kicker, title, body | 1a, 1e |
| M3 | Situation → action tables (stack when narrow) | 1a, 1b, 1e |
| M4b | Step tables: numbered circles **plus** the existing ↓ arrows (chosen over M4) | 1e |
| M5 | Distinct looks for cross-references, HCPCS codes, glossary terms | 1e |
| M6 | One colour cue per heading level | 1a, 1e |
| M7 | Quieter per-section feedback line | 1a |
| M8 | Sticky reader bar with scroll-spy | 1a, 1b |
| M9 | Chapter masthead, "In this chapter", paint-from-tree loading | 1a, 1c |
| M10 | Tree rows with a number column and Updated dots | 1a |
| M11 | Previous / next chapter at the end of a chapter | 1a |
| M12 | Manual home on the Reference landing | 1d |
| M13 | Compact pop-out: reader full height, Contents overlay | 1b |
| M14 | The chapter's quick card in its masthead (with its diagram) | 2a |
| M15 | Reading trail (chips with chapter-colour icon badges) | 2b |
| M16 | Resume where you left off | 2b |
| M17 | Footnotes and glossary terms in the cross-reference popover | 2c |
| M18 | Manual search hits styled as manual | 2d |
| M19 | Quick reference cards on paper (diagram on the reverse) | 2e |

M4 (the plain rail) is superseded by M4b; implement M4b only.

## Ship order

| Deploy | Items | Touches | Risk |
|---|---|---|---|
| 1 | M1–M7 | `<style>` in `kb/script_kb.html` + 3 lines in `kbManualDecorate_` (optional) | CSS only; reversible |
| 2 | M8, M10 | `kbManualPartHtml_`, `kbRenderTree_`, new `kbManualSpy_` | Small JS |
| 3 | M9, M11 | `kbManualPartHtml_`, `kbOpenManualSection_`, `kbManualPaintMeta_` | Small JS |
| 4 | M12 | `kbRenderLanding_` / `kbLandingManualHtml_` | Larger |
| 5 | M13 | compact CSS + a Contents overlay via `ensureOverlay` | Larger |
| 6 | M17, M18 | `kbManualDecorate_`, `kbGlossaryAnnotate_`, xref popover, search renderers | Small JS |
| 7 | M15, M16 | reader bar (needs M8) | Small JS |
| 8 | M14, M19 | masthead (needs M9), print CSS in `styles.html` | Small JS + CSS |
| — | Card diagrams | `manual/src/appendix_c.md` → build → re-import | Manual release, not an app deploy |

---

## Deploy 1 — CSS only

Append after the existing "Operator testing 2026-10-08" block. While there, delete the superseded duplicates above it (`.kb-man-part { max-width: 760px }`, the first `.kb-man-sec`, `.kb-man-sec-head`, `.kb-man-sec-h` rules) so each property has one home.

### M1 · Prose at reading width
The 900px column at .97rem runs prose to ~110 characters a line. Cap running text; let tables, diagrams and snippets use the full column.
```css
.kb-man-part .kb-article > p,
.kb-man-part .kb-article > ul,
.kb-man-part .kb-article > ol,
.kb-man-part .kb-article > blockquote { max-width: 68ch; }
```

### M2 · Callouts: kicker, title, body
CSS alone puts the bold opener on its own line and replaces the left stripe with a hairline box. Critical alone keeps a full-strength border.
```css
.kb-man-part .kb-article blockquote.kb-callout { border-left: none; border: 1px solid var(--line); border-radius: var(--radius); padding: 12px 16px 13px; }
.kb-man-part .kb-article blockquote.kb-callout-critical { border: 1.5px solid var(--destructive); }
.kb-man-part .kb-article blockquote.kb-callout-policy   { border-color: color-mix(in oklab, var(--info) 35%, transparent); }
.kb-man-part .kb-article blockquote.kb-callout-watch-out{ border-color: color-mix(in oklab, var(--warn) 35%, transparent); }
.kb-man-part .kb-article blockquote.kb-callout > p:first-child > strong:first-child { display: block; }
/* with the optional decorate step below */
.kb-co-kick { display: flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 10.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.kb-callout-critical  .kb-co-kick { color: var(--danger-deep); }
.kb-callout-policy    .kb-co-kick { color: var(--info-deep); }
.kb-callout-watch-out .kb-co-kick { color: var(--warning-deep); }
.kb-callout-note      .kb-co-kick { color: var(--muted); }
.kb-co-sep { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }   /* kept in the DOM so textContent is unchanged */
.kb-co-title { display: block; margin-top: 4px; font-weight: 600; }
.kb-co-title::first-letter { text-transform: uppercase; }
```
Optional decorate step (in `kbManualDecorate_`; text is wrapped, never changed, so landing and search read the same words):
```js
var KB_CO_ICON = { critical: 'warning', 'watch-out': 'warning', policy: 'fileText', note: 'info' };
root.querySelectorAll('.kb-man-sec blockquote.kb-callout').forEach(function (q) {
  var s = q.querySelector(':scope > p:first-child > strong:first-child');
  if (!s || s.querySelector('.kb-co-kick') || s.children.length) return;   // plain-text labels only
  var m = /^\s*(Critical|Policy|Watch-out|Note)\b(\s*—\s*)?([\s\S]*)$/.exec(s.textContent);
  if (!m) return;
  var k = m[1].toLowerCase();
  s.innerHTML = '<span class="kb-co-kick">' + icon(KB_CO_ICON[k], 13) + esc(m[1]) + '</span>' +
    (m[3] ? '<span class="kb-co-sep">' + esc(m[2] || ' ') + '</span><span class="kb-co-title">' + esc(m[3]) + '</span>' : '');
});
```
Script callouts already render as `.kb-snippet`; only its label gets the same kicker type (`.kb-snippet-label { font-family: var(--mono); letter-spacing: .1em; }`).

### M3 · Situation → action tables
The manual's most common table is two columns (Situation | Action, The caller says… | Go to). Make the first column the row label, and stack rows when the reader is narrow.
```css
.kb-man-part .kb-article table.kb-man-compact tr > :first-child { width: 34%; }
.kb-man-part .kb-article table.kb-man-compact td:first-child { font-weight: 600; }
.kb-man-tw { container-type: inline-size; }
@container (max-width: 480px) {
  .kb-man-part .kb-article table.kb-man-2col thead { display: none; }
  .kb-man-part .kb-article table.kb-man-2col,
  .kb-man-part .kb-article table.kb-man-2col tbody,
  .kb-man-part .kb-article table.kb-man-2col tr,
  .kb-man-part .kb-article table.kb-man-2col td { display: block; width: auto; }
  .kb-man-part .kb-article table.kb-man-2col tr { padding: 9px 0; border-bottom: 1px solid var(--line); }
  .kb-man-part .kb-article table.kb-man-2col td { padding: 0; border: none; }
}
```
One line in the table loop of `kbManualDecorate_`: `if (!own && !matrix && cols === 2) t.classList.add('kb-man-2col');`. A container query (not `data-compact` or `@media`) is the one trigger that is right in the pop-out, on a phone and in the 340px drawer alike — the A2 lesson the file already records.

### M4 · Step tables as a numbered rail
Still a `<table>` (the manual's convention); only the first cell changes.
```css
.kb-man-part .kb-article table.kb-steps td { border-bottom: none; }
.kb-man-part .kb-article table.kb-steps td:first-child { z-index: 0; width: 44px; vertical-align: top; padding-top: 12px;
  font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--ink); }
.kb-man-part .kb-article table.kb-steps td:first-child::before { content: ""; position: absolute; z-index: -1; left: 50%; top: 9px;
  width: 26px; height: 26px; margin-left: -13px; box-sizing: border-box; border-radius: 50%;
  border: 1.5px solid var(--man-c); background: color-mix(in oklab, var(--man-c) 12%, var(--paper-card)); }
.kb-man-part .kb-article table.kb-steps tbody tr:not(:last-child) td:first-child::after { content: ""; left: 50%; top: 37px; bottom: -9px;
  width: 1.5px; margin-left: -.75px; padding: 0; transform: none; background: var(--line-2); }
```
Appendix pages fall back to `--man-c: var(--muted)` (already declared on `.kb-man-part`).

**M4b · hybrid (preferred by the operator, 2026-10-08)** — keep today's `↓` between rows and add the circle. Use this instead of the rail above:
```css
.kb-man-part .kb-article table.kb-steps td:first-child { z-index: 0; width: 44px; vertical-align: top; padding-top: 12px;
  font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--ink); border-bottom-color: transparent; }
.kb-man-part .kb-article table.kb-steps td:first-child::before { content: ""; position: absolute; z-index: -1; left: 50%; top: 9px;
  width: 24px; height: 24px; margin-left: -12px; box-sizing: border-box; border-radius: 50%;
  border: 1.5px solid var(--man-c); background: color-mix(in oklab, var(--man-c) 12%, var(--paper-card)); }
.kb-man-part .kb-article table.kb-steps tbody tr:not(:last-child) td:first-child::after { color: var(--man-c); }   /* today's arrow rule supplies the rest */
```

### M5 · Three inline behaviours, three looks
Today a cross-reference, an HCPCS lookup and a glossary term are all dotted underlines.
```css
.kb-man-part .kb-article a.kb-xref { text-decoration-style: solid; text-decoration-thickness: 1px; text-decoration-color: color-mix(in oklab, var(--accent) 50%, transparent); }
.kb-man-part .kb-article a.kb-xref.kb-xref-num { font-family: var(--mono); font-size: .88em; font-weight: 600; }
a.kb-hcpcs { font-family: var(--mono); font-size: .86em; padding: 1px 5px; border-radius: 4px; background: var(--info-soft); color: var(--info-deep); text-decoration: none; }
a.kb-hcpcs:hover, a.kb-hcpcs:focus-visible { background: color-mix(in oklab, var(--info) 22%, var(--paper-card)); }
```
`.kb-gloss-mark` stays the only dotted mark. The number class is one line in `kbManualDecorate_` (skip links inside `svg`):
`root.querySelectorAll('.kb-man-sec .kb-article a.kb-xref').forEach(function (a) { if (!a.closest('svg') && /^(?:\d+|[A-C])\.[0-9A-Z]+(?:\.\d+)*$|^CARD \d+$/.test(a.textContent.trim())) a.classList.add('kb-xref-num'); });`

### M6 · One colour cue per level
```css
.kb-man-chap { border-left: none; padding-left: 0; }
.kb-man-sec-head { border-left: none; padding: 0 0 12px; border-bottom: 1px solid var(--line); margin: 4px 0 6px; }
.kb-man-sec-h { font-weight: 600; }
.kb-man-sn { vertical-align: .25em; }
```
Until M8 ships, quiet the per-section buttons: `.kb-man-sec-acts .kb-btn { border-color: transparent; color: var(--muted); } .kb-man-sec-acts .kb-btn:hover { border-color: var(--line); color: var(--ink); }`.

### M7 · Quieter feedback line
```css
.kb-man-fb { margin-top: 20px; padding-top: 0; border-top: none; gap: 4px; }
.kb-man-fb .kb-fb-q { font-size: .8rem; color: var(--muted-2); margin-right: 4px; }
.kb-man-fb .kb-fb-btns { flex: 1; gap: 2px; }
.kb-man-fb .kb-btn { border-color: transparent; background: none; color: var(--muted); padding: 4px 8px; }
.kb-man-fb .kb-btn:hover { background: var(--paper-2); color: var(--ink); }
.kb-man-fb .kb-fb-btns .kb-btn:last-child { margin-left: auto; }
```

---

## Deploy 2 — reader bar and tree

### M8 · Reader bar with scroll-spy
One sticky bar replaces `.kb-man-ver` and absorbs `.kb-man-back` (which keeps its own row above the bar when shown, so neither truncates the other). It carries the chapter badge and short name, the section in view (chip + title), Bookmark and Print for that section, and previous / next section.
- Markup: in `kbManualPartHtml_`, emit `<div class="kb-man-bar" data-kb-man-bar>` before `.kb-man-part`. Reuse `kbBookmarkBtnHtml_` and repaint it when the spied section changes. Print calls a new `kbPrintSectionById_(id)` (the body of `kbPrintSection_` from `sec` onward).
- Spy: one `IntersectionObserver` with `root: #kb-main`, `rootMargin: '-56px 0px -70% 0px'`, observing every `.kb-man-sec-h`. On change: update the bar and call `kbMarkTreeCurrent_(id)`. Do **not** call `kbPanelRecordOpen_` or move `#kb-comments` — those stay on explicit opens. Keep the observer on `KB_STATE.manualSpy` and `disconnect()` it at the top of `kbManualPaintPart_`.
- Keep the marked tree row visible by setting `#kb-tree.scrollTop`, not `scrollIntoView` (that can scroll the outer page inside the HtmlService iframe).
```css
.kb-man-bar { position: sticky; top: -18px; z-index: 3; margin: -18px -22px 0; padding: 9px 14px 9px 22px; display: flex; align-items: center; gap: 9px;
  background: var(--paper-card); border-bottom: 1px solid var(--line); }   /* -18/-22 = .kb-main padding, as .kb-man-back already does */
.kb-man-bar-sn { flex: none; font-family: var(--mono); font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: var(--man-c); color: var(--paper-card); }
.kb-man-bar-t { font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kb-man-bar-acts { margin-left: auto; display: flex; align-items: center; gap: 4px; flex: none; }
```
The bar reads `--man-c`, so put the chapter class (`kb-man-pN`) on the bar too.

### M10 · Tree rows
In `kbRenderTree_`, for manual items only: drop the per-row `fileText` icon and split the title with the regex already in `kbManualTitleHtml_` into `<span class="kb-item-num">5.2</span><span>PAK…</span>`. Chapter toggles show `05` + "Power Mobility" (keep the full name in `data-dept`). `kbManualPaintMeta_` adds `.kb-item-upd` to rows whose section has a changelog entry in the 12-month window.
```css
.kb-dept-toggle[data-manual] .kb-dept-name { text-transform: none; letter-spacing: 0; font-size: .82rem; font-weight: 500; color: var(--ink); }
.kb-item-num { flex: none; width: 34px; font-family: var(--mono); font-size: 11px; font-weight: 600; color: var(--muted-2); font-variant-numeric: tabular-nums; }
.kb-item.on .kb-item-num { color: var(--man-c, var(--success-deep)); }
.kb-item-upd .kb-item-line::after { content: ""; flex: none; width: 6px; height: 6px; margin: 6px 0 0 auto; border-radius: 50%; background: var(--info); }
```

---

## Deploy 3 — masthead, loading, chapter ends

### M9 · Chapter masthead and "In this chapter"
Replace `.kb-man-head` with a masthead: kicker ("Procedures manual · Chapter 05"), the badge at 44px, the short chapter name, a meta line (section count · updated count · version and build date — the text `kbManualPaintMeta_` writes today), and a two-column index of the chapter's sections (number in `--man-c`, title, Updated pill). Index rows call `kbManualFocus_(id)`.

Loading: the tree payload already holds each section's id, title and department. In `kbOpenManualSection_`, when the chapter is not cached, paint the masthead, index and the target section's heading from `KB_STATE.tree` immediately, with `--paper-2` skeleton blocks for bodies, instead of a full-panel `loSweep()`. `kbManualPaintPart_` then replaces it. A failure keeps the masthead and puts `errorStateHtml_` where the bodies were. No focus, open-recording or comments run on the skeleton.

### M11 · Previous / next chapter
After the last section, two cards (chapter badge, "Previous · Chapter 04 / Sales"). Neighbours come from the sorted manual departments (`kbDeptCompare_`); the click opens the first section by `sortOrder` via `kbOpenItem_`.

---

## Deploy 4 — M12 · Manual home
At the top of the Reference landing, when the tree holds manual items: title and version line; two cards — the call router (opens `kbOpenRouterFromTab_()`; shows the Ctrl/⌘ K hint and three example openers) and "Go to a section" (an input wired to `kbManualNumberTarget_`, Enter opens); a four-column chapter grid (badge, number, name, section count, updated count); appendices A–C; then the existing recent-changes list (`manualRecentListHtml_`). All data is client-side (tree + `manualMeta`); call `kbEnsureManualMeta_` on landing. The jump input must live outside the blocks `kbRenderLanding_` re-renders, for the focus/caret reason its own comment gives.

## Deploy 5 — M13 · Compact pop-out
Today `data-compact` stacks the tree above the reader at up to 45vh, so the reader starts mid-screen. Proposed (both `:root[data-compact]` and `@media (max-width: 720px)`, per A2):
- `.kb-side` becomes one row: the search input + a **Contents** button (44px tall). `#kb-tree` is hidden **except while a search has a query** (search results render into it) — toggle a class on `.kb-side` from `kbDoSearch_`.
- Contents opens through `ensureOverlay('kb-man-toc-overlay', { label: 'Contents' })`: a chapter switcher row and the current chapter's sections, with the current one marked. Selecting closes via `closeOverlay`.
- The reader bar's previous / next become 44px icon buttons; the Back-to chip keeps its own row.

---

## Round 2 (artboards 2a–2e)

### M14 · The chapter's quick card in its masthead (2a)
Each Appendix C card is an article (`man-c-N`) and its source carries `<!--card:pN-->`; card N belongs to chapter N. With `KB_STATE.manualParts` loaded, the masthead (M9) renders the card body through `kbMd_` inside a disclosure: header row (chevron, `CARD 5` chip in `--man-c`, "Quick reference", Print card), body in two CSS columns with `break-inside: avoid` per heading group, the **Never** line boxed in `--destructive-soft`. Open state persists in `umsKbPanel` (`prefs.cardOpen[dept]`, default open). If the manual hasn't prefetched yet, omit the disclosure rather than wait.
```css
.kb-man-card { margin-top: 18px; border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; }
.kb-man-card-h { display: flex; align-items: center; background: color-mix(in oklab, var(--man-c) 8%, var(--paper-card)); }
.kb-man-card-h > button:first-child { flex: 1; display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 8px 14px; border: none; background: none; font: inherit; color: var(--ink); cursor: pointer; text-align: left; }
.kb-man-card-b { padding: 14px 18px 16px; border-top: 1px solid var(--line); }
.kb-man-card-b .kb-article { columns: 2; column-gap: 28px; font-size: .9rem; }
.kb-man-card-b .kb-article h3, .kb-man-card-b .kb-article h4 { font-family: var(--mono); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--man-c); margin: 0 0 4px; }
.kb-man-card-b .kb-article ul { break-inside: avoid; margin: 0 0 12px; }
:root[data-compact] .kb-man-card-b .kb-article { columns: 1; }
@container (max-width: 560px) { .kb-man-card-b .kb-article { columns: 1; } }
```

**Card diagrams (operator 2026-10-08 — decided: in the source).** Cards 5, 4 and 8 lead with their chapter's key diagram: `power-process` (5.1.1), `eligibility-status` (4.3), `o2-troubleshoot` (8.6), rendered in a `.kb-diagram` figure above the columns with the existing Full size button. The exact edit is under **Manual source change** at the end of this file. Ship it as a manual change, not an app deploy: `./make_all.sh` → re-import `manual.json` → publish. `script_manual_diagrams.html` does not change (no diagram changed), so no clasp push is needed for this part. After the build, check the Word extracts' card pages by eye — the card layout there has not carried a diagram before. Options considered:
- **Chosen — in the source:** add `{{diagram:power-process}}` (etc.) at the top of §C-5, §C-4, §C-8 in `manual/src/appendix_c.md`. The export already expands diagram placeholders, so the card article carries it in Reference, the HTML manual and the Word extracts alike; the masthead disclosure needs no special case.
- **App-only:** `KB_MANUAL_CARD_DIAGRAMS = { p5: 'power-process', p4: 'eligibility-status', p8: 'o2-troubleshoot' }` read by the masthead renderer. Smaller deploy, but the printed and Word cards won't have it.

### M15 · Reading trail (2b)
`KB_STATE.trail`: the last five sections explicitly opened this session (tree, xref, search, index row — not scroll-spy), newest last, de-duplicated, each `{id, title, land}` where `land` is what `kbXrefLandOf_` already records for Back-to. Rendered as a row above the reader bar once it holds two entries: "Read" label, chips (18px chapter-colour circle with the chapter's icon — `kbManualChapterIcon_(dept, 10, 'kb-trail-badge')` — mono number, title truncated at 220px), the current entry as plain text. A chip calls `kbOpenItem_(id, '', { land })`. It replaces the Back-to chip (the trail's previous entry is the same thing). Compact: the row scrolls sideways, newest first, chips 32px tall.

### M16 · Resume (2b)
When `kbOpenManualSection_` is reached without a target (a chapter row, a home tile, previous/next chapter) and `localStorage['umsKbResume']` holds an entry for that department under 7 days old, focus that section and its last spied sub-heading, then show one line under the bar: "Back where you left off — 5.6.2 …" with **Start of chapter** and dismiss. The spy (M8) writes `{id, heading, at}` per department, throttled to once per few seconds. Store section ids and numbers only. An explicit target (xref, search hit, number jump, trail chip) always wins.

### M17 · Footnotes and glossary in the shared popover (2c)
- Footnotes: in `kbManualDecorate_`, walk text nodes of each section body (skip the Notes block: the paragraphs after the `<p><strong>Notes</strong></p>` that `footnotes.py` emits), wrap each run of `[¹²³⁴⁵⁶⁷⁸⁹⁰]+` in `<button type="button" class="kb-fn-ref" data-fn="¹">` (text unchanged). Hover / focus / click shows `#kb-xrefcard` with "Note ¹ · <section title>" and the matching note paragraph's text; "Go to note" scrolls to it and flashes it.
- Glossary: `kbGlossaryAnnotate_` keeps the mark but drops `data-tip` / the `::after` tooltip; the mark gets `tabindex="0"` and opens the same card (term, "Glossary" kicker, definition, "Open in glossary" → `kbOpenItem_('man-a', …)`).
- Both reuse the xref binding's 350ms delay, focusin/focusout, Escape-first capture and `kbTetherPopover_`. Nested marks inside the card stay inert.
```css
.kb-fn-ref { font: inherit; font-size: .8em; font-weight: 700; line-height: 1; vertical-align: .45em; margin-left: 1px; padding: 2px 4px; border: none; border-radius: 4px; background: var(--accent-soft); color: var(--accent-2); cursor: pointer; }
.kb-fn-ref:hover, .kb-fn-ref:focus-visible { box-shadow: 0 0 0 2px var(--accent); outline: none; }
```
```css
/* M15 trail chip badge */
.kb-trail-badge { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; background: var(--man-c); color: var(--paper-card); }
```

### M18 · Manual hits look like the manual (2d)
For `kbIsManualId_` hits only:
- `kbRenderSearchResults_` tree rows: chapter dot (`var(--man-pN)` via `kbManualChapterKey_(department)`) + number column + title (split as in M10); sub-rows show the anchor number + heading.
- `kbChunkGroupsHtml_` group header: `kbManualChapterIcon_(dept, 12, 'kb-man-badge')` + number chip + title + "Manual · <short chapter name>". Chunk heading (`.kb-chunk-h`): coloured number + title, sentence case — add a `kb-chunk-h-man` modifier that drops the uppercase.
- Extend the round-1 callout / table / steps selectors to `.kb-chunk-body[data-kb-man]`, so a callout looks the same in a result as in the chapter. The drawer shares `kbChunkGroupsHtml_`, so it picks this up.

### M19 · Quick reference cards on paper (2e)
In `styles.html`'s `@media print`, when the subject is a card (`kbPrintSection_` adds `data-print-card` to the root when `kbIsManualCard_`):
```css
:root[data-print-card] .print-one { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
:root[data-print-card] .print-one .kb-man-sec-head { background: var(--man-c); color: #fff; border-radius: 8px; padding: 12px 16px; border: none; }
:root[data-print-card] .print-one .kb-man-sn { background: none; color: #fff; border: 1.5px solid #fff; }
:root[data-print-card] .print-one .kb-article { columns: 2; column-gap: 26px; font-size: 11.5px; line-height: 1.5; }
:root[data-print-card] .print-one .kb-article ul { break-inside: avoid; }
:root[data-print-card] .print-one .kb-article h3 { font-family: var(--mono); font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--man-c); border-bottom: 1.5px solid var(--man-c); }
:root[data-print-card] .print-one { break-after: page; }
```
- **Diagram on the reverse:** a card's diagram would push its text to two pages, so print it on page 2 at full width: `:root[data-print-card] .print-one .kb-diagram { break-before: page; } :root[data-print-card] .print-one .kb-diagram-bar { display: none; } :root[data-print-card] .print-one svg.kbdg { min-width: 0; }` — with the diagram placed first in the card source, move it after the columns for print with `display: flex; flex-direction: column` on the article and `order: 99` on the figure.
- **Print all cards** (a button on the Appendix C page header) marks every card section `.print-one` at once; the existing hide-everything-else rule already copes with several subjects.
- **Dark-mode print fix (all manual prints):** the print block resets paper and ink but not `--man-pN`, `--destructive`, `--info` etc., so printing in dark mode uses the light-on-dark values on white paper. Inside `@media print`, re-declare the light `--man-p0…10` and the light semantic colours on `:root`. (The `#fff` above is the print block's own convention.)

## Found while reading (not presentation, worth fixing)
- **Contrast bug in dark mode and light-accent palettes.** `.kb-man-go:not(:disabled) { color: #fff }` and the synonyms Save button's inline `color:#fff` sit on `--accent`, which is `#7af2a1` in dark Console and `#e5d2fe` in dark Plum — white on those is far below AA. Use `color: var(--paper-card)` (dark text on the light dark-mode accents, white on the light-mode ones).
- Duplicate rule pairs for `.kb-man-part`, `.kb-man-sec`, `.kb-man-sec-head`, `.kb-man-sec-h` (see Deploy 1).
- Figure placeholders (`[FIGURE: …]`) could render as one dashed line ("Figure pending — …", as in 1a) rather than a full block, until the redacted screenshots land.


---

## Manual source change (card diagrams, for M14 / M19)

Decided with the operator: put each card's key diagram in the manual source, so the card carries it in Reference, the HTML manual and the Word extracts alike.

In `manual/src/appendix_c.md`, add one diagram line directly under each of these three card headings, as its own paragraph (blank line before and after). Change nothing else.

| Card heading | Add this line |
|---|---|
| `## §C-4 Sales` | `{{diagram:eligibility-status}}` |
| `## §C-5 Power Mobility` | `{{diagram:power-process}}` |
| `## §C-8 Oxygen` | `{{diagram:o2-troubleshoot}}` |

Result for Card 5, for example:

```markdown
<!--card:p5-->
## §C-5 Power Mobility

{{diagram:power-process}}

### Process
- Power **does not** follow the standard order process — …
```

Before editing, confirm against the repo that: the three diagram names still exist in `manual/diagrams/`; `{{diagram:…}}` is allowed inside Appendix C cards by `build.py` and `export_reference.py` (if either refuses or warns, stop and report rather than working around it); and the card headings are unchanged.

Ship it as a manual release: `./make_all.sh` (all structural and render checks must pass) → Reference → Manual → Choose File → `manual.json` → Check → Import → publish. No diagram changes, so `web-app/kb/script_manual_diagrams.html` is not regenerated and this needs no clasp push. Then check by eye that the Word extracts' card pages still lay out acceptably with a diagram (cards there have not carried one before).

## Verification for each deploy

- The Node harness and `test/client/run.js` pass, including the AA, palette and hue-drift tripwires. A new colour combination that a tripwire measures must pass it, not be exempted.
- Check light and dark × Console, Sand, Sage, Plum, Teal.
- Check the compact pop-out, a ≤720px viewport, and the Ctrl/⌘+K drawer (about 340px wide on a wide screen).
- Keyboard: Tab reaches every new control; cross-references, footnote markers and glossary terms show their popover on focus; Escape closes a popover before anything underneath.
- Print one section and one card, in light **and** dark mode.
- Loading and failure: first open of a chapter on a cold session; a failed `getManualPart` keeps the masthead and shows `errorStateHtml_`.
- Nothing here adds a server call except where an item says so (none do).
