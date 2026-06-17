# Handoff: UMS Team Tools — Intake, Training, Reference, Time Clock & Icons

## Overview
A visual + interaction redesign of four areas of the **UMS Team Tools** Apps Script web app, plus a set of new tab icons:

1. **Intake** module — module shell, the PPD questionnaire, PMD/PAP account forms, and the Sent history tab.
2. **Tab icons** — distinct, representative glyphs for the four Intake tabs (and one new Reference glyph).
3. **Training** — the rep checklist and the manager coverage matrix.
4. **Reference (KB)** — the navigation tree and the landing panel.
5. **Time Clock** — the Clock tab and the Coverage planner tab.

All of it is built on the app's **existing Console design-token system** (`web-app/styles_design_tokens.html`) and **existing icon registry** (`web-app/script_icons.html`). Nothing here introduces a new framework, color system, or font.

## About the design files
The `*.dc.html` files in this bundle are **design references created in HTML** — prototypes showing the intended look, layout, and behavior. They are **not** production code to copy directly. They are authored as self-contained "Design Components" (they load a `support.js` runtime and use inline styles for streaming reasons that are irrelevant to your task).

**The task is to recreate these designs in the existing codebase**: the Apps Script HtmlService web app, where each tool is an HTML partial (`<style>` + `<script>`) included from `web-app/index.html`. Re-implement using the app's established patterns:
- Server-rendered string templates assembled in JS (`area.innerHTML = ...`), exactly as the current modules do.
- The shared CSS classes/tokens in `styles_design_tokens.html` and `styles.html` (`.panel`, `.app-bar`, `.toolbar-tabs`, `.kicker-pill`, `.card`, `.tt-btn`, etc.) — **add view-scoped classes per tool rather than the inline styles used in the mock.**
- The `icon(name, size)` helper for all icons.
- `esc()` on every server-derived string (existing invariant).

## Fidelity
**High-fidelity.** Colors, typography, spacing, and component structure are final and pulled from the existing token system. Recreate pixel-accurately using the codebase's tokens and patterns. Exact hex values appear in the mocks and in **Design Tokens** below; prefer the **token variable** (e.g. `var(--accent)`) over the literal hex wherever one exists — the literals in the mocks are only because Design Components can't reference the stylesheet.

## Target files in the codebase
| Area | File |
|------|------|
| Intake module | `web-app/intake/script_intake.html` |
| Icons | `web-app/script_icons.html` |
| Training | `web-app/train/script_training.html` |
| Employee Docs (shares Training chips) | `web-app/train/script_empdocs.html` |
| Reference / KB | `web-app/kb/script_kb.html` |
| Clock | `web-app/tc/script_clock.html` |
| Coverage planner | `web-app/tc/script_manager.html` |
| Metrics | `web-app/metrics/script_metrics.html` |
| Call Notes | `web-app/cn/script_callnotes.html` |
| Tokens (reference only) | `web-app/styles_design_tokens.html` |
| Shared CSS (reference only) | `web-app/styles.html` |

---

# 1 · Intake module

### Reference file: `Intake Redesign.dc.html` (light + dark), `Intake Redesign — Option Studies.dc.html` (the 3 PPD options that were compared — **Option A was chosen**).

### 1a. Module shell
- Replace the bespoke navy header (`var(--brand, #223b5d)`) and the custom `.intk-btn` system. Use the shared `.app-bar` (breadcrumb `Tools / Intake` + `.display-title` "Intake") and render the four sub-tabs with the shared `.tt-btn` tool-tab-bar.
- The green accent (`var(--accent)`) is the only primary color. Remove every `--brand` reference in the module.
- Replace `.intk-btn` / `.intk-btn.primary` with the shared button pattern used elsewhere (primary = `var(--accent)` bg, `#fff` text; secondary = `var(--paper-card)` bg, `var(--line)` border).
- Language toggle: replace the custom `.intk-lang` with the shared segmented `.toolbar-tabs` (EN / ES).

### 1b. PPD form — **Option A: inline structured** (the key change)
Today every one of the 45 questions is an identical `<input type="text">`. Replace the control per question type:
- **Yes/No questions** (Q1, Q7–12, and the additional-info yes/no items): a 2-segment toggle. Selected "Yes" → `var(--accent)` bg `#fff` text; selected "No" → `var(--destructive)` bg `#fff` text; unselected → `var(--paper-2)` bg `var(--muted)` text. Container: `1px solid var(--line)`, radius `var(--radius)`.
- **Consistent Pain section (Q14–23, the 10 body regions)**: each region is one row — region label, then a 4-chip severity scale **None / Mild / Mod / Severe** (equal-width chips, `gap` row). Unselected chip = `var(--paper-2)`/`var(--muted)`. Selected: None → `var(--ink)`/`#fff`; Mild → `var(--warn)`/`#fff`; Mod → `var(--warn)` (or a mid amber); Severe → `var(--destructive)`/`#fff`. Store the chosen level as the answer string.
- **Numeric questions** (height/weight) and free-form (diagnoses, etc.) stay text inputs but restyled to the token system. Numerics can use `inputmode="numeric"`.
- **Progress header** pinned at the top of the form: title + a `answered / 45` count (mono, `var(--success-deep)`) + a thin progress bar (track `var(--paper-3)`, fill `var(--accent)`).
- Keep the existing data model: answers keyed by question number (`data-intk-qnum`), collected by `intakeCollectPpd_`. Only the **input control** changes, not the payload shape. The Preview & Recommend → accept/reject/star → send flow is unchanged.
- **Associate labels with inputs** (`for`/`id`) and give controls a `name` — current grid has neither (a11y gap).
- **Draft autosave** (recommended, parity with Call Notes): persist in-progress answers to `localStorage` keyed per form; restore on enter; clear on send (the module already drops PHI from memory on send — keep that, and also clear the draft key).

### 1c. PMD / PAP account forms
- Group fields into titled **panels** (Demographics / Insurance / Clinical / etc.) using `.panel` with the section title as a mono-uppercase kicker. The server layout already declares header indices (`INTAKE_PMD_CLIENT.headers`) — render a panel per header group.
- Yes/No items use the same color-coded toggle as PPD.
- Restyle the image dropzone with the token system (dashed `var(--line-2)`, `upload` icon, "Drag, click, or paste — up to 12"). Behavior (paste/drag, 12-image cap, `INTAKE_STATE[form].images`) unchanged.

### 1d. Sent tab
- Add a filter bar: a `.toolbar-tabs` segmented control **ALL / PPD / PMD / PAP** + a search field (search patient or rep). Client-side filter over the already-cached `INTAKE_STATE.sent`.
- Each row: a mono form-type pill (PPD → `--accent-soft`/`--success-deep`; PMD → `--info-soft`/`--info-deep`; PAP → `--warn-soft`/`--warning-deep`), patient label + Trx, a meta line (timestamp · rep (manager only) · recipient), and a `View` button. Manager still sees all reps; rep sees own (server-scoped, unchanged).
- Restyle the recommendation card in the PPD detail/preview to the token system (star = `var(--accent)`, code link = `var(--accent)`, action chips on `.panel`/`.kicker-pill` vocabulary).

---

# 2 · Tab icons
See **`icons_snippet.md`** for paste-ready registry entries and the tab→icon mapping. Summary: PPD `clipboardList`, PMD `accessibility`, PAP `airflow`, Sent `outbox` (frees the paper-plane), and a new `fileText` for Reference articles. PMD and PAP currently share the `user` glyph — this is the main fix.

---

# 3 · Training
### Reference file: `Training & Reference Redesign.dc.html` (sections 01–02, light + dark).

### 3a. My checklist
- Header: a **completion ring** (SVG circle, track `var(--paper-3)`, fill `var(--accent)`, % in the middle) + "N of M complete · K overdue" (overdue count in `var(--danger-deep)`) + two compact stat cells (Done / Left).
- Each item is a row: a status chip + title + meta + action. Chips: Done → `--accent-soft`/`--success-deep`; To do → `--paper-2`/`--muted`; Overdue → `--destructive-soft`/`--danger-deep`. The overdue row gets `box-shadow: inset 3px 0 0 var(--destructive)` (the `.panel[data-tone]` pattern).
- Action button: quizzes → "Take quiz" (`list` icon, primary); articles → "Mark complete" (`check` icon, accent-soft). Done rows show no action and dim to ~0.75 opacity.
- Reuse the existing `TRAIN_STATE` data and handlers; this is a restyle + the progress header.

### 3b. Manager coverage matrix
- Replace the wide horizontally-scrolling `tr-table` with a **reps × items status grid**. CSS grid: first column = rep name, then one column per training item, then a coverage % column.
- Each cell is a status marker: Done → `var(--accent)` rounded square with a white `check`; Overdue → `var(--destructive)` square; Pending → `var(--paper-2)` square with `var(--line)` border. Legend above.
- Coverage column = % complete per rep, tinted (`--success-deep` at 100%, `--danger-deep` when low). Sort behind reps so the least-covered surface.

---

# 4 · Reference (KB)
### Reference file: `Training & Reference Redesign.dc.html` (section 03, light + dark).

- **Two-column layout** unchanged (tree + main), but:
  - **Collapsible departments**: each `kb-dept-h` becomes a button with a chevron (`chevronRight` collapsed / `chevronDown` expanded) and an item count. Persist expanded/collapsed in memory or `localStorage`.
  - **Distinct item icons** via `kbItemIcon_`: articles → `fileText` (new), sheets → `grid`, files → `paperclip` (see icons_snippet).
  - Replace the bespoke `.kb-btn` with the shared button tokens (same drift the Intake module had).
- **Landing panel** (the right side when nothing is selected): replace the bare "Select an item…" with three blocks — **Recently viewed** (hairline rows w/ icon + dept + relative time), **Most used**, and **Review due** (manager-only, count pill, amber dot per item). Data: "recently viewed" can come from the existing `kbRecordView` usage loop; "review due" from the manager review-due block the module already loads (`kbLoadReviewDueBlock_`).
- The article reader, markdown rendering, search (compiled chunk view + term highlight), and drawer are **already good — leave them**.

---

# 5 · Time Clock
### Reference file: `Time Clock Redesign.dc.html` (Clock tab + Coverage tab, light + dark).

### 5a. Clock tab — the live shift strip becomes the control surface
- **Big clock card** gets a **time-of-day "sky" gradient** that maps to the local time (sunrise → midday → dusk → night) and a **timezone selector** (a pill on the card; default = the rep's roster tz, but let them pick any of the world-clock zones). The mock shows mid-afternoon (blue→gold) light / dusk (indigo→plum) dark with a sun/moon dot. Keep the world-clock region strip (`clkBuildRegionFmts_`). White text with a subtle shadow over the gradient. The gradient should recompute from the displayed tz's current hour (drive it off the same per-second tick that updates `live-time`).
- **Live shift strip** (the existing day ribbon, `renderDayRibbon_`) absorbs:
  - **Hours-worked readout** + state pill (Working / Lunch) in the strip header.
  - **Call-volume histogram** behind the ribbon track — faint vertical bars (`color-mix`/rgba of `var(--accent)` at ~16%) by time bucket, sourced from the same per-day CDR the coverage strip already fetches (`getMyMetrics`). Aligns to the 6a–10p axis.
  - **Scheduled break bands** drawn on the ribbon (amber ticks) from `CLK_SCHEDULE.breaks` (already resolved server-side).
  - **The punch buttons** mounted directly under the ribbon — so the strip is the action surface, not a separate `.actions` block above.
- **Color-code Lunch**: Lunch Out button = `var(--warn)` bg `#fff` text; Lunch In = `var(--accent)` bg `#fff` text; Clock In = primary accent; Clock Out = neutral; Adjust = secondary. Mirror the same colors on the punch-history icons and ribbon lunch segments (lunch = `var(--warn)`).
- **Break schedule + reminder**: the data + reminder toast already exist (`clkBreaks_`, `clkNextBreak_`, `clkUpdateBreak_`, `clkBreakReminderMin_`, fires once per break per day while the tab is open). Surface them visibly: the next-break chip on the clock card (exists) **plus** the break bands on the ribbon, **plus** a small "Break schedule" line/popover listing the day's breaks. (Reminders are in-tab only — Apps Script web apps have no background push; note this.)
- **Consolidate the card row & cut Sick**: replace the 3-cell Annual/Sick/Hours ledger. Put **Today's Punches**, **Team Right Now** (the active-team grid, moved up beside it instead of a full-width card at the bottom), and a compact **PTO** card (Annual only — **remove Sick entirely**; employees have no sick days) on **one row**. PTO is a small ring (used/total annual days) and can be collapsible. Hours-worked now lives in the strip header, so it isn't duplicated here.

### 5b. Coverage tab — week heatmap
### Reference: same file, section 02. Target: `enterCoverageView` / `covRender_` in `web-app/tc/script_manager.html`.
- Replace the stacked per-day cards (each a 24-col `cov-strip` + rep list) with **one days × hours matrix** for the range (rows = days, columns = working hours, e.g. 6a–9p). Each cell colored by staffing vs `minStaff`: OK → `var(--accent)`; At risk (confirmed below min but confirmed+tentative ≥ min) → `var(--warn)`/a soft gold; Low → a soft red (`var(--destructive)` tint); None → `var(--paper-2)`. Keep the existing `ok/risk/low/none` thresholds from `covRender_`.
- One compact legend; manager-tz note stays.
- Add an **"Understaffed" risk callout** below the grid: a `.panel[data-tone="destructive"]` listing each understaffed slot (e.g. "Fri 11a–1p · 1 working, need 2 — A. Cole on PTO"). Derive from the same per-hour staffing data; include the PTO reason already available in `day.reps`.
- Per-day rep detail (name/tz/status) moves into an expand-on-click row or a side panel, so the default view is the scannable heatmap.

---

# 6 · Metrics
### Reference file: `Metrics Redesign.dc.html` (My Stats + Team, light + dark).
Metrics is already the strongest module (hero + rail, tabular numerics, dual sparklines) — these are targeted upgrades, not a rebuild. Target: `enterMetricsMyStatsView` / `mRailRow_` / the team table render in `web-app/metrics/script_metrics.html`.
- **Date presets**: add a `.toolbar-tabs` segmented control **Today / 7D / 30D** beside the date input on the My Stats view (Team already has range inputs). The `.m-preset-chip` styles exist but My Stats doesn't use them — wire these to set `M_STATE.myDate` / the range and reload.
- **Sparkline on every rail row**: each `mRailRow_` gets a tiny inline trend sparkline (same `data.trend` already fetched for the hero). Stroke `var(--accent)`; for “Missed” use `var(--warn)`. Keeps the rail values glanceable as trends, not just point-in-time.
- **Sortable team table**: make the `.m-table th` cells clickable to sort (they’re `cursor:default` today); show a sort chevron on the active column (default % Answered desc) and a sticky header for long rosters (`position:sticky; top:0`).
- **Tri-tone % cells + coverage badges**: color the `% Answered` cell by threshold (≥ 80 `--success-deep`, ≥ 50 `--warning-deep`, else `--danger-deep`) — reuse the exact thresholds from `mCoverageBadge_`. Keep the existing `.m-coverage` badge in a Coverage column (high/mid/low).
- Everything else (hero value, vs-avg delta, dual sparkline, KPI compute) stays.

---

# 7 · Call Notes
### Reference files: `Call Notes Redesign.dc.html` (Search + Stats), `Call Notes Admin Redesign.dc.html` (tabbed Admin). Target: `web-app/cn/script_callnotes.html`.
Call Notes is the **most mature module** — leave the Log composer (contenteditable note doc + copy-anywhere ⌘C, flag rail, tags, shortcuts, sticky drafts, voice), History (range+presets+grouped), reference drawer, email composer, and forms **as-is**. Only three surfaces lag:

### 7a. Search (`cnRenderSearchView` / `cnRenderSearchResults_`, and the manager twin `cnMgrLoadSearchView_` / `cnMgrRenderSearchResults_`)
- Replace the plain inline-styled `.cn-search-result-card` with the **real note-card vocabulary** (`cnRenderCardCore_`, read-only variant) so results match the rest of the module.
- Add a **result count** line (“N results for ‘query’”), **search-term highlighting** (reuse the KB approach: walk text nodes, wrap matches in `<mark>` with `var(--selection-bg)` — never string-level HTML surgery), and a **date-range filter** beside the field tabs.
- Add **Phone** and **TRX** to the field-scope tabs (today only All / Caller / Issue). Bring the rep Search and the manager Search to parity.

### 7b. Manager Stats (`cnMgrRenderStats_`)
- Replace the per-rep cards (~10 stacked key/value rows each) with a **scannable table**: rows = reps, columns = Notes / Action / Training / Review / Median / % Answered / Coverage. Tri-tone the % Answered + Coverage cells (reuse `mCoverageBadge_` thresholds); rep name stays a drill-link to Per-Rep View (`cnStatsDrillDown_`). This visually aligns Stats with the Metrics team table — ideally they share one table component.
- Keep the median-note-time footnote.

### 7c. Admin (`enterCallNotesAdminView` + its panel loaders)
Today Admin is one long scroll of ~7 independently-loaded panels. Restructure into **sub-tabs** (`.toolbar-tabs`, same pattern as Manage): **Overview / Tags / Compliance / Config**.
- **Overview** = a **System status** row folding the three health panels (Automation Health, CDR drift, Storage Health) into one set of status cards with clear OK / warn / error tone (`.panel[data-tone]`), plus the KPI strip (Week notes / Unresolved / Tags / Reps).
- **Tags** = **merge** the Tag Taxonomy table and the Tag Trends panel (they list the same tags twice) into one table: Tag · usage bar · note count · inline trend sparkline · Δ wk · Rename/Merge/Archive actions · with an Archived section below. All existing endpoints (`renameCallNoteTag`, `mergeCallNoteTags`, archive/unarchive) wire unchanged.
- **Compliance** = the existing audit panel. **Config** = the dept-mapping / state-tax / suggestions blocks (the actual settings, currently buried at the very bottom).
- Keep the contained-failure load pattern (each panel/pane fails independently).
- Minor: the Search “Exact: TRX” badge pairs `--accent-soft` (green) bg with `--info-deep` (blue) text — pick one tone.

---

# Cross-cutting: token-hygiene fix (do this everywhere you touch)
Several modules reference **`var(--accent-deep, …)`**, which **is not a defined token** — it always falls back to flat `var(--accent)`. The real token is **`--success-deep`**. Found in `train/script_training.html`, `train/script_empdocs.html`, and `kb/script_kb.html` (e.g. `.tr-chip.done`, `.tr-complete-btn`, `.ed-verify .ok`, `.kb-item.on`). Also several `var(--danger-soft, #fce5e5)` / `var(--warning-soft, …)` hardcode fallbacks that already exist as tokens (`--destructive-soft`, `--warn-soft`). Replace `--accent-deep` → `--success-deep`, and drop the redundant hex fallbacks, so the intended deeper shades actually render (and dark mode inverts them correctly).

---

# Design Tokens (from `styles_design_tokens.html`)
Use the **variables**, not the literals. Literals shown for reference / where the mock had to inline them.

**Light:** paper `#f6f7f9` · paper-2 `#f0f2f6` · paper-3 `#e5e8ee` · paper-card `#ffffff` · ink `#0f1623` · muted `#3e4756` · muted-2 `#737c8c` · muted-3 `#a5acb8` · line `#dce0e7` · line-2 `#c3c9d3` · accent `#0f8a52` · accent-2 `#0b6e40` · accent-soft `#e4f5ec` · success-deep `#0b6e40` · warn `#b7791f` · warn-soft `#fbf1d9` · warning-deep `#8a4500` · destructive `#c13030` · destructive-soft `#fce5e5` · danger-deep `#8a1f1f` · info `#1e63b8` · info-soft `#e1ecfa` · info-deep `#154980`.

**Dark** (`:root[data-mode="dark"]`): paper `#0a0d14` · paper-2 `#161b26` · paper-3 `#1e2532` · paper-card `#10141d` · ink `#e8e6e0` · muted `#a6adbc` · muted-2 `#6c7587` · line `#262d3b` · line-2 `#3f4a60` · accent `#7af2a1` · accent-2 `#4fd683` · accent-soft `rgba(122,242,161,.12)` · success-deep `#b8fbc8` · warn `#ffb547` · warning-deep `#ffcb80` · destructive `#ff6679` · danger-deep `#ffa0a8` · info `#74c7ff` · info-deep `#b0ddff`. **Note:** on dark, filled accent/warn/destructive buttons use **dark text** (`#0a0d14`), not white.

**Type:** Inter Tight (UI + display), JetBrains Mono (numerics, kickers, labels). **Radii:** sm 6 · base 8 · md 10 · lg 14. **Shadows:** `--shadow-sm` `0 1px 2px rgba(15,23,42,.04)`. **Motion:** `--t` 180ms, `--ease` cubic-bezier(.4,0,.2,1).

# Interactions & behavior (unchanged from current modules unless noted)
- All server round-trips, late-success view guards (`currentView` checks), and PHI-drop-on-send behavior in Intake **must be preserved**.
- New: PPD draft autosave (localStorage); Sent client-side filter; KB department collapse state; Clock tz selector + gradient recompute on tick; Coverage risk-callout derivation.
- Reminders (breaks) are in-tab only — no background push in Apps Script.

# Assets
No new image assets. Icons are SVG registry entries (see `icons_snippet.md`). Fonts already loaded in `index.html`.

# Files in this bundle
- `README.md` — this document.
- `icons_snippet.md` — paste-ready icon registry entries + mapping.
- `Intake Redesign.dc.html` — Intake shell + PPD (Option A) + account + Sent, light & dark.
- `Intake Redesign — Option Studies.dc.html` — the 3 PPD input options compared (A chosen).
- `Intake Tab Icons.dc.html` — icon infrastructure, current vs proposed, new glyphs.
- `Training & Reference Redesign.dc.html` — Training checklist + coverage matrix; Reference tree + landing.
- `Time Clock Redesign.dc.html` — Clock tab + Coverage heatmap.
- `Metrics Redesign.dc.html` — My Stats (presets + rail sparklines) + sortable team table.
- `Call Notes Redesign.dc.html` — Search (real cards + count + highlight + filters) + manager Stats table.
- `Call Notes Admin Redesign.dc.html` — tabbed Admin: Overview (system status + KPIs) + merged Tags table.
- `screenshots/` — preview PNGs of each mock (light-column crops; open the `.dc.html` for the full light+dark board).
- `support.js` — runtime so the `.dc.html` references open in a browser (not part of the codebase).

> To view a reference file: open any `*.dc.html` in a browser (it loads `support.js` from the same folder). These are **design references** — implement the equivalent in the Apps Script partials per the sections above.
