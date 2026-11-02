---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (operator-planned work, not audit findings — the handbook refresh's Batch 1, `docs/design_handoff_handbook_refresh/README.md`)
New capabilities (G/ST): HBR1 — the handbook app's frame and home (operator plan 2026-11-02, after four mockup rounds):
  - the frame: Team Tools' light rail (brand, the pages with counts — quizzes not passed, what is due — a mono Chapters label, each chapter's read share, the user card), a slim bar (search, Display, Profile initials with the badge), no outer cards; My department moved to Profile; the phone's one-row bar and bottom tab bar; no ring on a heading that took focus from script
  - home as hero C: the greeting, "What's the caller asking about?", a large search that hands over to the bar's (words and caret), the call router's openings, and the shelf — On calls by default (the team's handbook lookups during calls per chapter, 30 days, filled against the busiest, the busiest marked, each spine named up its spine, a hover/focus card with the count, the change and the top section), My reading the alternate (sign-offs at their current version), too few lookups opening on My reading and saying why; Continue reading; Due for you; Recently changed only when non-empty; B's ombre tiles, the reader's department first and wide
  - the server: `hbGetShelf` — KbViews drawer opens of handbook sections per chapter for this and the previous 30 days with each chapter's top section, read back by date a chunk at a time until past 60 days, Dates in the sheet's tz, team totals, cached an hour, a failure said and never cached
Files modified: handbook-app/Handbook.js, handbook-app/index.html, handbook-app/script_handbook.html, handbook-app/styles_handbook.html, test/client/run.js, test/client/dom/runDom.js, test/visual/shoot.mjs, test/visual/mock.js, docs/design_handoff_handbook_refresh/ (README, mockup.html, shots/), docs/handbook-app.md, docs/design-decisions.md, docs/operator-log.md, docs/test-harness-log.md, CLAUDE.md (one index link; the counts), .cycle/STATE.md
Estimate: L (~10 h) — written to STATE.md before the first edit
Actual: L (~7 h) — the frame and home as planned; axe's label-in-name rule and one NO BITE added a round each

CHANGES:
HBR1-server | handbook-app/Handbook.js | `hbGetShelf`, `hbShelfRead_` (KbViews back from the newest row in 5,000-row chunks, stopping at the first past 60 days; a 100,000-row stop said as `truncated`), the pure `hbShelfCount_` (drawer contexts and `man-` ids only; this window = the 30 days to today, the previous = the 30 before; a tie for top to the lower id) and `hbShelfDayAdd_`; the cache key `hb_shelf_v1`, an hour
HBR1-frame | handbook-app/index.html, styles_handbook.html, script_handbook.html | the rail (`HB_NAV`, `hbPaintToc_`, `hbPaintCounts_`, `hbReadShare_`, `hbQuizzesOpen_`), `hbMarkNav_` replacing `hbMarkHomeBtn_` (aria-current on the rail and the tabs, home's paper, the bar's search hidden on home), `hbPaintChrome_`, the Profile initials and user card (`hbInitials_`, drawn from data-ini — axe's label in name), `hbOpenSearch_` / `hbSearchBlur_`, the picker on Profile (`#hb-pp-read`), the phone layout; `.kb-main` keeps Reference's 18/22px padding (the shared reader's sticky bar sits at -18px — g162); headings focused by script draw neither outline nor styles.html's :focus-visible box-shadow
HBR1-home | handbook-app/script_handbook.html, styles_handbook.html | `hbHomeHtml_` rewritten; `hbPatchHome_` (every late answer — the shelf, Due, the meta, the reader's name, sign-offs — repaints only its own box; the meta callback patches instead of redrawing — g141); the shelf (`hbShelfHtml_`, `hbShelfBooks_`, `hbBooksHtml_`, `hbShelfView_`, `hbLoadShelf_`/`hbTakeShelf_`, `hbSpineName_`, `hbShelfDelta_`; the spine words drawn from data-t); `hbContinue_`; `hbDueList_`/`hbDueHtml_`/`hbLoadDue_` (re-reads, then unfinished plans, overdue first; a failure never replaces a list that loaded — g129); `hbNewsHtml_` (only when something changed); `hbTilesHtml_`; `hbSearch_` hands home's typing to the bar
HBR1-harness | test/visual/shoot.mjs | the squeezed-text measure reads a vertical label along its height; two scenarios (the shelf's My reading; home dark on a phone)

TEST RESULTS: Test Command is `manual` — no Regression Scenario names the Handbook app subsystem: NOT APPLICABLE (the handbook app has no editor-suite scenarios; its checks are the harnesses below).
  Pure 1490/1490 (HBR1-a…d new; HB1.2-e's public list, F69's structural pin and the sandbox's spreadsheet updated). DOM: every HB/HBR1 test 52/52, and `counts.mjs --check` (which reruns both harnesses) agrees: 1490 pure, 353 DOM, 222 scenarios. Visual: all 36 handbook scenarios — no overflow, runaway, squeezed text, missing fixture or page error; axe over all 36 PASS (it had failed on label-in-name for the initials, the user card's aria-label and the busiest spine's words, and on two colours — all fixed). lint-server clean; handbook-sync --check in step; cycle-closeout --check in step.
  Bite-checks (14, in a scratch worktree): all BITE — the drawer filter, the window's first day, the stop past 60 days (a NO BITE first: the fixture had nothing beyond the stop; 6,000 older rows added), caching a failure, a re-read counted as read, overdue not first, a removed section resumed, not against the busiest, the caret left behind, the shelf redrawing home, too few staying on On calls, an opening the reader cannot open, no aria-current, an invented count.
REGRESSION RISKS: The frame's markup moved: `hb-dept-sel` now lives on Profile (four older DOM tests moved, their intent kept). `hbMarkHomeBtn_` is gone (`hbMarkNav_`; every caller moved). The search box on home is a second input (`#hb-hero-q`) handing over to `#hb-q`. Two late loads at boot (`hbGetShelf`, `hbMyTraining`) — both fail quietly into their own boxes. The heading-ring rule is CSS only and not pinned (jsdom has no :focus-visible); it was checked in the shots (Profile's heading).
INVARIANTS AT RISK: None. g141 (late answers patch, never redraw), g129 (never cache a failure), g152 (read by date), g143 (one new public endpoint, listed in HB1.2-e), g61/g170 (text on accent takes --accent-ink / --paper-card), g162 (the reader's padding kept).
NET SCORE: 0 production fixes − 0 new failure modes = 0 (new capability)

OPERATOR ACTIONS / DEPLOY:
- `npm run handbook:push` + New version of the handbook app | BLOCKS DEPLOY: Y
- None for Team Tools (unchanged) and no new operator state — the shelf reads `KbViews`, which Team Tools already writes, through the existing `HANDBOOK_KB_SS_ID` | BLOCKS DEPLOY: N
Deploy: handbook app — `npm run handbook:push`, then New version; Team Tools — N/A

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- Batches 2–4 of the refresh (the handoff README): the section page and search results, quizzes, Training / Profile / Saved / Forms / Display.
- The shelf counts Team Tools' drawer opens only; the handbook app records no opens of its own yet (agreed to leave for now).
- On a phone the shelf is hidden (agreed); a compact strip could follow.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made: docs/handbook-app.md, docs/design-decisions.md (+ its CLAUDE.md index link), docs/operator-log.md, docs/test-harness-log.md, the counts, STATE.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
