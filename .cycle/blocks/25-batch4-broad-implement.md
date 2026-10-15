---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- F67 (Medium) — opening any handbook chapter with a callout made the whole app page scroll through thousands of blank pixels: the callout's screen-reader-only separator (`position: absolute`) had no positioned ancestor inside the reader's scroller; the callout now carries `position: relative`
- F10 (Medium) — a handbook search hit's "Open ¶" landed on the section top, not the matched sub-heading: search ships a slug anchor and the reader's focus matched only numbered headings; one resolver now reads both forms on every open path
- F11 (Medium) — `kbEnsureManualMeta_` cached an `{error}` as "no meta" for the session and dropped its waiters on a transport failure, so the call router read "No phrase matches" or stayed blank; an import also left the old metadata in place
- F50 (Low) — a late handbook "Check" result could unlock Import for a different, unchecked file
- F51 (Low) — the reader bar's bookmark button was replaced on every scroll-spy repaint, dropping keyboard focus
- F52 (Low) — the footnote, glossary and cross-reference card's buttons could not be reached by keyboard
New capabilities (G/ST): None
Files modified: web-app/kb/script_kb.html, test/client/run.js, test/client/dom/runDom.js, CLAUDE.md, docs/gotchas.md, .cycle/config.md, .cycle/STATE.md
Estimate: L (~7.5 h, the plan's figure) — written before the first edit (STATE.md Estimates line, 2026-10-14)
Actual: ~2.5 h

CHANGES:
F67 | web-app/kb/script_kb.html | new rule `blockquote.kb-callout { position: relative; }` beside `.kb-co-sep`, so the hidden separator is laid out inside its callout. Measured in Chromium against the built page: the document fell from 8,245px to 918px at 1440×900 (0.10, eight separators) and from 3,132px to 1,029px at 390×844 (3.8, two separators)
F10 | web-app/kb/script_kb.html | new `kbFindAnchorHeading_(host, anchor)`: the numbered heading ("0.10.2", "A.1") first, else the `kb-h-<slug>` id when the anchor is slug-shaped (`^[a-z0-9-]+$`, so nothing else reaches a selector). `kbManualFocus_`, `kbXrefLandEl_` and `kbScrollToAnchor_` all use it; the drawer's own two-form test is gone
F11 | web-app/kb/script_kb.html | `kbEnsureManualMeta_` answers `cb(meta, failed)`. An `{error}` or a transport failure answers every waiter `failed` and caches nothing; `{none}` caches null. A read is kept only if no `kbManualInvalidate_` ran meanwhile (its own `manualMetaGen` — the chapter prefetch bumps `manualPartsGen`). `kbManualInvalidate_` (import, publish, KB save of a manual id) forgets the meta. The drawer's router entry and router list say "could not be loaded" on a failure, and a typed filter does not turn that into "No phrase matches"
F50 | web-app/kb/script_kb.html | `kbManualRun_`: a Check's success or failure that arrives after `KB_MANUAL_FILE` changed is dropped (no paint, no unlock); Import unlocks only when the checked file is still the chosen one. An import's own result is still shown (that import did happen)
F51 | web-app/kb/script_kb.html | new `kbBookmarkBtnPatch_(btn, item)` (class `on`, `data-kb-id`, `data-kb-title`, `aria-pressed`, title — the state `kbBookmarkBtnHtml_` draws); `kbManualBarPaint_` patches the star in place instead of `outerHTML`
F52 | web-app/kb/script_kb.html | `kbBindXrefs_`: a capture-phase Tab handler steps from the mark into the open card (`kbPopFocusables_`, which skips the inert marks inside it); Tab past the last stop, Shift+Tab before the first, or Escape inside the card hides it and returns focus to the mark, which does not reopen it (`KB_XREF.backTo`); focus that leaves the card for anywhere else closes it. The focusout handler keeps `var a = …KB_POP_SEL` first, so the MRD-4 one-binding net still reads it
Tests | test/client/run.js, test/client/dom/runDom.js | new pins: "F67 (cycle 25)" (pure — the containing rule, the separator made only inside `kbDecorateCallouts_`, every call scoped to `blockquote.kb-callout`; jsdom has no layout, so the height itself was measured in Chromium and recorded here), and DOM drives "F10", "F11", "F50", "F51", "F52 (cycle 25)". Bite-checked by hand (bite.sh refuses a dirty file), eight mutations, each restored from a copy: F67 rule emptied; F10 focus numbered-only; F11 waiters dropped / `{error}` cached / invalidate keeps the meta; F50 stale verdict painted; F51 back to `outerHTML`; F52 Tab handler off — every one red
Docs | CLAUDE.md, docs/gotchas.md, .cycle/config.md | new gotcha g171 (a visually hidden absolute element escapes its scroller) — index line + narrative; g129 (F11) and g141 (F51) amended; INV-319 (F50), INV-324 (F10), INV-325 (F11) and INV-339 (F52) amended; S124, S125, S127 and S128 gain cycle-25 steps; running totals updated

TEST RESULTS: passed — pure harness 1283/1283, DOM harness 239/239, `npm run lint:server` clean, `counts.mjs --check` clean, `split-manifest.mjs --check` current (no server change). Visual matrix, the handbook's scenarios (`shoot.mjs reference-manual manual-copy`, 28 scenarios): 0 console errors, 0 horizontal overflow, 0 missing fixtures. Test Command is `manual`: S124 (import), S125 (reader), S127 (previews) and S128 (search + router) carry the new steps and need the deployed app — NOT RUN here, owed to the operator after deploy.
REGRESSION RISKS: (1) F67 — the new rule applies to every `blockquote.kb-callout`, hand-written articles included; nothing inside a callout was absolutely positioned against an outer box before (the separator is the only absolute child), so only the separator moves. (2) F52 — Tab from a mark whose card is open no longer goes to the next link on the page; it enters the card first (one extra Tab per open card). The card opens only after the 350ms focus delay, so tabbing straight through the text is unchanged. (3) F11 — while the meta store is unreachable, every drawer and landing open asks again (one `getManualMeta` each) instead of once a session; the call is a single small property read. (4) F50 — none: an import's result still paints.
INVARIANTS AT RISK: None violated — INV-339 (amended; Escape still hides the preview first, in the capture phase), INV-325 (amended; the router still only leads to visible sections), INV-324 (amended; the slug charset restriction is kept — a non-slug anchor never reaches `querySelector`), INV-319 (amended client half), g129 (now honoured by the meta cache), g141 (now honoured by the bar repaint), INV-235 (no new bare class).
NET SCORE: 1 − 0 = +1 (F10 YES — the manual search and its "Open ¶" have been live since the cycle-24 deploy, and every hit on a sub-heading landed on the section top; F67 NO — the separator shipped with reader-design Phase 4 (2026-10-09), which the state file does not record as deployed; F11 NO — needs a failed meta read; F50 NO — needs a file switched mid-check; F51 and F52 NO — reader-design code not recorded as deployed; no new failure mode)

OPERATOR ACTIONS / DEPLOY:
- Walk the cycle-25 steps of S124, S125, S127 and S128 on the deployed app | BLOCKS DEPLOY: N
Deploy: Client (Reference views): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- With F67 fixed, the document is still 18px taller than the window at 1440×900 and 185px at 390×844 — the app shell itself, the same with and without the fix; Batch 9's F69 vertical-overflow check should judge it
- The shared card is `role="tooltip"` but now holds focusable buttons; a non-modal `dialog` role would describe it better to a screen reader
- A glossary mark is a `tabindex="0"` span, so Enter on it does nothing (its card opens on focus after the delay)
(see also the cycle-25 /broad-scan report and the Batch 1–3b blocks)

DOCUMENTATION UPDATES NEEDED:
- None beyond what this batch made (g171, g129, g141, INV-319/324/325/339, S124/S125/S127/S128, running totals)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
