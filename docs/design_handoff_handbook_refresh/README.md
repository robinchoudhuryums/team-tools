# Handbook app refresh — design handoff and plan

The operator's visual refresh of the handbook app (`handbook-app/`), agreed over
four mockup rounds on 2026-10-30 → 2026-11-02. This folder is a **non-deployed
reference**, like `docs/design_handoff_team_tools_redesign/`: `mockup.html` and
`shots/` are the spec to build against, never code to ship or `include()`.

Open `mockup.html` in a browser. `?view=` picks a screen (`home`, `section`,
`search`, `quizzes`, `quiz`, `result`, `training`, `forms`, `formview`, `saved`,
`profile`, `display`), `&mode=dark` the dark palette, `&shelf=me` the shelf's
second view, `&tip=1` a spine's hover card. Narrow the window for the phone layout.
The people, scores, dates and the search hits for §8.6/§9.2 are made up.

## What was decided

| # | Decision | Why |
|---|---|---|
| 1 | **Direction "B, in Team Tools' styling"** — B's layout and colour (a hero, tinted chapter tiles, chapter-coloured headers, score rings, a floating section toolbar) inside Team Tools' chrome: Inter Tight, the spaced mono labels, `#0f8a52`, its greys, radii and light shadows | Pure B read as a different product; the middle ground keeps its energy and sits beside Team Tools |
| 2 | **Light sidebar**, Team Tools' active-item style, brand at the top, the user card at the foot. Dark mode: a slightly different dark, never inverted | Matching Team Tools is the point; a dark rail in one app is the biggest tell. A light rail in dark mode glares |
| 3 | **Hero C, "the shelf"** — a plain card: greeting, "What's the caller asking about?", a large search box, the call-router chips; on the right the chapters as book spines | Replaces the dark-gradient hero (the operator: "too striking… cheap looking"). One design for both modes: the card follows the palette, the spines keep their chapter colours |
| 4 | **Every header card is light**: the section banner, quiz card heads, the quiz result, "Continue reading" and the profile cover each take a wash of their chapter colour on the card, never a dark gradient | The same note, applied everywhere it would have recurred |
| 5 | **B's ombre chapter tiles** on home (tint fading down the card, coloured square icon, the large faint number) | Operator preference over the middle ground's flat tile |
| 6 | **The shelf has two views; "On calls" is the default**, "My reading" the alternate (a segmented toggle) | Once an agent has read everything, a progress shelf stops saying anything |
| 7 | **"On calls" = handbook sections opened from Team Tools' reference drawer, whole team, last 30 days, by chapter** — labelled "most looked up on calls", never "most calls" | The app has no record of call TYPES (DQE is one row per agent per day; transfers cover four queues; call notes are PHI in per-rep sheets). `KbViews` already records every open with its context (`drawer:<view>`), PHI-free, in the KB spreadsheet the handbook app reads, and a `man-<chapter>-…` id names its chapter |
| 8 | Shelf rules: team totals only (never a person); drawer opens only (the Reference tab and handbook-app opens excluded for now); fewer than 50 lookups in 30 days → say so and open on My reading; the 30 days read **by date**, not a row tail (g152); cached an hour | Operator agreed 2026-11-02 |
| 9 | **The chapter's short name runs up each spine** on a small label plate (CSR Core, Call Handling, Mobility & DME, Respiratory, Sales, Power, Field Ops, Service, Oxygen, After Hours, Billing) | Operator request 2026-11-02 |
| 10 | Spine hover/focus card: the chapter, its lookups and share, the change on the 30 days before, its most-opened section | |
| 11 | **No notification bell** — the count stays a badge on the profile button | The bell was never confirmed; a badge is what exists |
| 13 | **No gradients (operator 2026-11-11 — supersedes the "wash" of 4 and the ombre of 5).** A chapter's colour is a flat light tint (a header band) or a rule (a 3–4px line along a card's top); the tiles are white cards with that rule; no radial glow, no fade. The score ring and the shelf spines keep their fills — a ring and a level, not a fade | The gradients read as cheap rather than polished. A pin (`Handbook flat`) fails if a gradient look returns |
| 12 | Phones: a one-row header (menu, brand, search, profile) and a bottom tab bar (Home, Search, Quizzes, Training, Saved); the shelf is hidden on narrow screens for now | |

## The batches

Each batch updates the visual matrix (and its `--axe` pass), the DOM harness and
the pure harness as it goes, and is bite-checked like every other batch.

**Batch 1 — the frame and home.**
- *Frame* (`index.html`, `styles_handbook.html`, `script_handbook.html`): the header becomes a slim top bar (search; Display and Profile as round buttons, the Profile badge kept); the brand moves to the sidebar's top; the sidebar loses its card and becomes Team Tools' light rail — nav rows with counts, a mono "Chapters" label, each chapter with its icon, name and read share, and the user card at the foot. "My department" moves off the header into Profile. Phones: one-row header + the bottom tab bar. The page itself loses its outer cards (the reader keeps its own).
- *Focus*: no visible outline on a heading that only took focus from code (HB2.4's programmatic focus), keyboard focus unchanged.
- *Home*: hero C with the two-view shelf, the spine labels and the hover/focus card; "Continue reading" (the reader's trail) and "Due for you" (what Training, Quizzes and the sign-offs already know); "Recently changed" only when something changed; the people-waiting notice as one slim line; the ombre chapter tiles, the reader's department first and wide.
- *Server* (`Handbook.js`): one read-only endpoint for the shelf's "On calls" — `KbViews` over the last 60 days by date, drawer contexts and manual ids only, counted per chapter for this and the previous 30 days, with each chapter's most-opened section; cached an hour; the 50-lookup floor. A pure aggregation helper the Node harness drives.

**Batch 2 — reading and search.** The section page: the light chapter banner with the large faint section number, the floating toolbar (I've read this · Listen · Note · Save · ⋯) replacing the blue quiz bar, the right column (this chapter's quiz, related forms and sections), previous/next. Search results as a page: a best match, highlighted hits, chapter filters, "Suggest a topic".

**Batch 3 — quizzes.** The quiz list as cards (chapter-wash head, score ring, status, one action, filter); taking a quiz one question per screen with a progress strip; the result page with every answer and a link from each miss to its section.

**Batch 4 — everything else.** Training (summary tiles, the team table, plan cards), Profile & team (cover, department and manager, the join request, the team grid), Saved (bookmarks and sticky-note notes), Forms (cards with a page thumbnail; the viewer's frame), the Display panel.

## Screens

`shots/01-home.png` … `16-display.png` — the mockup at 1440×900 (phones at 390×844, 2×).
