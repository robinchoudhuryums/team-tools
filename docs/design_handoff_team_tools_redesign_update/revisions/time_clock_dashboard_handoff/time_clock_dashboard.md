# Handoff — Time Clock → Dashboard

A standalone spec for converting the Time Clock module's **Clock** tab into a combined
start-of-day **Dashboard**. This is a *new direction* layered on top of the earlier Time
Clock redesign (sky clock, timezone picker, live-shift-strip, lunch color-coding, Sick
removed, PTO collapsible) — it does not replace those; it reorganizes the Clock tab around them.

**Reference mock:** `Clock Dashboard.dc.html` (interactive — Agent/Manager toggle, Compact
toggle, four working carousels with sliding segmented chips, mobile/stacked frame at the bottom).
Companion pieces this dashboard pulls from live in the same folder: `My Stats Daily Report.dc.html`,
`My Stats Trends.dc.html`, `Spanish Inbox Redesign.dc.html`.

---

## 0. The decision: rename Clock → Dashboard, keep one tab

Recommendation (from review): **merge, don't add a tab.** The clock and the briefing share the
same "what do I do at the start of my shift" moment; two tabs would split it. Rename the tab
**Dashboard**, keep the clock as the left rail, and add the briefing as the main column. Compact
mode collapses back to just the clock for users who only want to punch.
- `script_core.html` tab registry: rename `clock` entry `label: 'Dashboard'`, keep `enter: 'enterClockView'` (or rename to `enterDashboardView` and update the dispatch).
- Keep the punch actions exactly where they are (left rail) — muscle memory.

---

## 1. Layout

Two-column grid inside the existing tool panel: **`grid-template-columns: 360px minmax(0,1fr)`**.
> ⚠️ The `minmax(0,1fr)` is load-bearing — a bare `1fr` has an implicit `min-width:auto` floor, and the carousel viewports (`min-width:100%` slides) will blow the column past the panel edge. Use `minmax(0,1fr)` on every grid that contains a carousel (the outer split AND the inner `1fr 1fr` card pairs).

- **Left rail (360px):** sky clock card → **live-shift-strip** → punch actions → (agent) today's punches / (manager) team-on-clock mini-list.
- **Main column:** greeting + on-the-clock pill, then the carousel cards.

### Live-shift-strip replaces the "hours today" card
Per the revision: the strip that shows **call concentration across the shift + punch state** takes
the place of the old "hours today" number card. Keep the worked-hours readout *inside* the strip
(it already lives there in the Time Clock redesign), so nothing is lost.

### Annual PTO moves out
The "Annual PTO" counter card is **not** on the dashboard — move it to the **Time / PTO** tab
(it's reference data, not a start-of-shift action). The Time Clock redesign already made PTO a
collapsible; this just relocates it.

---

## 2. Carousels + sliding segmented chip

Each metric group is a horizontal carousel: a clipped viewport (`.vp{overflow:hidden}`) with a flex
track (`.trk`) of full-width slides (`.sld{min-width:100%}`), translated by
`transform: translateX(-i*100%)` with a `.4s cubic-bezier(.4,0,.2,1)` transition. Arrows step i;
the **segmented chip** both *shows every option* and *sets i directly*.

**Segmented chip** (the sliding-highlight control): a `position:relative` flex track with a tinted
background, an absolutely-positioned white highlight pill that slides via
`transform: translateX(i*100%)` (same easing), and one clickable label per option above it
(`position:relative; z-index:1`). Active label = ink, inactive = muted. Helper from the mock:
```js
seg(key, labels) => ({
  w: 'calc((100% - 6px) / ' + labels.length + ')',   // highlight width
  hi: 'translateX(' + (state[key] * 100) + '%)',       // highlight position
  opts: labels.map((label,i) => ({ label, on: ()=>setState({[key]:i}), fg: state[key]===i?'#0f1623':'#737c8c' })),
})
```

**The four carousels and their options:**
| Carousel | State key | Options | Notes |
|---|---|---|---|
| My metrics (agent) | `mine` | Yesterday · MTD · YTD | personal CDR snapshot/trend |
| Team metrics (agent + mgr) | `team` | Yesterday · MTD · YTD | switches **independently** of `mine` |
| Dept rollup (manager) | `dept` | Yesterday · MTD · YTD | header chip, flanked by arrows |
| Inbox switch (manager) | `sw` | Spanish · Requests | Spanish Inbox ↔ Dept Requests card |

- Agent: `mine` and `team` are separate chips so an agent can compare "my MTD" vs "team yesterday."
- Manager: `dept` (rollup period) + `sw` (which inbox) are both header chips.
- **Data source:** Yesterday = the daily CDR rollup (same as `My Stats Daily Report`); MTD/YTD = the aggregated trend series with projection (same as `My Stats Trends`). No new fetch beyond what those views already do.

---

## 3. Agent vs Manager render

One view function, branch on role (mirror how `trainRenderMgr_`/manager coverage already gate on `isManager`).
- **Agent:** greeting · clock rail · My-metrics carousel · Team-metrics carousel · (if in the Spanish inbox) a Spanish Inbox summary card.
- **Manager:** greeting · clock rail · Team-on-clock list · Dept-rollup carousel · Spanish↔Requests switcher carousel · understaffing/coverage callout.
- Gate the Spanish Inbox card on inbox membership (agent) / always (manager). Gate Dept Requests + rollup on `isManager`.

## 4. Compact mode
A toggle that collapses the main column and leaves just the clock rail (punch + live-shift-strip).
Persist the choice in the user prefs blob you already use (same place as theme / timezone). Default = full.

## 5. Mobile / stacked
At narrow widths the two columns stack (clock rail on top, carousels below) and the carousels go
full-width. The mock's bottom frame shows the target. Carousels remain swipeable; the segmented
chip is the primary control on touch (arrows are small). Keep the 44px min hit target on punch buttons.

---

## 6. Build notes
- All motion is `transform`-only (track + highlight) — cheap on the Apps Script webview; respects the `prefers-reduced-motion` kill-switch from `loaders_and_motion.md`.
- The projection on MTD/YTD (dashed run-rate + cone to projected EOM/EOY) is a client-side calc on the daily series — see `My Stats Trends.dc.html` and the note in `new_tabs_and_controls_addendum.md`. Gate it to ≥ a few days elapsed.
- Don't introduce new tokens; the sky-gradient hexes are intentionally decorative (already noted in the Time Clock redesign).
- Run `Tests.js` after — the punch path is untouched logically, but the view dispatch rename (if you do it) touches the tab registry.
