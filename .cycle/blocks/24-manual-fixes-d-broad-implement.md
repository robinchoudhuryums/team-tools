---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Manual fixes Batch D (change list 2026-10-08 Part D, the HTML manual) — D1 phone layout + the contents panel, D2 headings land below the sticky bar, D3 old-number search + "part N", D5 landing state, D6 dark-mode printing, D7 "Print section" / "Print cards", D8 the call-router dialog, D10 polish (table scroll hint, index "no matches", router answer links + stray space, dark do/don't matrix headers). D4 was done in F1; D9 waits on the operator (is the Messages button bottom left?); D10's "Chapter 10" relabel is optional and skipped.
Files modified: manual/make_html.py, test/client/run.js (MD-1), CLAUDE.md (counts block), .cycle/STATE.md
Estimate: M (~5 h) — written before the first edit, 2026-10-08
Actual: ~2 h

CHANGES:
D1 | manual/make_html.py | The 280px tablet column is bounded to 901–1240px (it came after the phone's one-column rule and won, so phones got a 280px text column); ≤900px is one minmax(0,1fr) column. The open contents is position:fixed under the Contents bar (its height measured into --ntH) with its own scroll, aria-expanded on the toggle. Found while measuring: the nav's own align-self:start made the fixed panel content-tall and Chrome's abspos alignment slid it up OVER the toggle, so it could not be closed — nav.show now sets align-self:stretch.
D2 | manual/make_html.py | :target, h1–h4[id] and tr[id] get scroll-margin-top 64px (110px at ≤900px). Chrome ignores a table ROW's scroll-margin, so clearBar() nudges a target that came to rest above its margin (directory rows landed 36px down, under a 50px bar; now 64px).
D3 | manual/make_html.py | A search record carries its current numbers ("a"), its old ones ("o", from the renumber AND the pre-renumber moves) and how to say them ("f"). "9.4", "§9-4" and "formerly 9.4" now rank the current 9.4 first, then 4.5 with a "formerly 9.4" chip (the "formerly 9.4" query found nothing, and plain 9.4 put the old section first unlabelled). "chapter N" opens the chapter; "part N" opens what that part became, with "Part 5 is now Chapter 6" (or "Parts are now called chapters").
D5 | manual/make_html.py | landOn() on hashchange (and the initial hash) moves the breadcrumb, card chip, rail and sidebar to the nearest heading at or above the target, after the observers' own pass.
D6 | manual/make_html.py | All three dark rules are `@media screen and (prefers-color-scheme:dark)` and the forced dark theme is inside `@media screen{}` — a dark-mode computer prints black on white (measured: body #fff / #000 under print emulation with color-scheme dark).
D7 | manual/make_html.py | "Print section" and "Print cards" in the breadcrumb bar (hidden ≤600px, and "Print section" hidden where there is no section). Print section marks the current H2 and its siblings up to the next H1/H2 (a card prints alone), drops the trailing rule/eyebrow, and the print CSS shows only the marked run; the number badge prints as coloured text (browsers drop backgrounds) and animations are off. Ctrl+P still prints the cards (12/12 print check unchanged).
D8 | manual/make_html.py | aria-modal="true"; open stores the opener and focuses the filter; Tab and Shift+Tab cycle inside (120 Tabs measured inside); Escape, ×, the backdrop return focus to the opener; following a link out does not.
D10 | manual/make_html.py | Router answers keep their section links (escaped, a.xr only) and lose the space get_text left before a comma; a router link closes the router and gets no hover preview. The index filter shows "No index entries match." A .tw wider than its box fades at the right edge while there is more to scroll. In dark mode the do/don't matrix's Because/Where headers are tint, not a bright navy band.
MD-1 | test/client/run.js | Drives the shipped search code in a vm (current before old, the chip, "part 5" → Chapter 6, "part 2", "chapter 5") plus structural checks for D1/D2/D5/D6/D7/D8/D10. Bite-checked three ways (old ranked above current; part→chapter map removed; one dark rule without screen) — each fails MD-1.

TEST RESULTS: Test Command is manual. Pure harness 1255 passed / 0 failed (+1, MD-1); DOM 223/0; lint:server ok; counts --check ok. Build: ERRORS 0, print checks 12 pages for 12 sheets. Playwright measurements: phone 390px → one 390px column, 0 horizontal overflow, open contents fixed at top 39 / height 805 while scrolled to 30,000px; jumps land at 64px desktop (bar 50px) and 110px phone (bar 91px); a directory row lands at 64px with the breadcrumb on B.1; dark print white/black; router focus trapped and returned; no page errors. Regression Scenarios touching Manual source — S124, S127, S128: NOT APPLICABLE (they exercise the app reader through manual.json, which is byte-identical to the previous build; make_html.py does not feed it).
REGRESSION RISKS: The search record's "a" field changed from a space-joined string to a list — the only reader is the HTML page's own script (manual.json is built separately and unchanged). The print CSS's card rule is now `body:not(.print-sec) main > *` — identical when Print section is not in use (12/12 sheets). clearBar() scrolls only when a target rests between 0 and its margin.
INVARIANTS AT RISK: None (manual/ is build-only; the app and its invariants are untouched).
NET SCORE: 8 production fixes (D1, D2, D3, D5, D6, D8, D10, plus the fixed-panel-covers-its-own-toggle defect found while measuring) + 1 new capability (D7) − 0 new failure modes = 8

OPERATOR ACTIONS / DEPLOY:
- Answer D9: is the Messages button bottom LEFT (the reviewer, from your Transaction Work Flow screenshot) or bottom right (the manual today)? If left, four places change (0.10, 0.10.5, 0.11.1, the icon guide). | BLOCKS DEPLOY: N
- Re-share the HTML manual (CSR-Procedures-Manual-v3.0.html) from a fresh build. | BLOCKS DEPLOY: N
Deploy: N/A — the HTML manual is a built file, not deployed by clasp; manual.json is unchanged by this batch, so no re-import is needed for D.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The search snippet for 9.4 (and any section with an inline SVG diagram) shows the diagram's CSS ("dg-lane{fill:var(--panel)}…") — make_html.py's search text extraction strips tags but not <style> contents. Pre-existing; one line to fix. Out of D's scope.
- The index's own scroll-margin (150px) is unchanged; at ≤900px the sticky index bar sits at 86px, so a letter jump may land partly under it — not measured.
- The flaky DOM failure noted after C8 did not recur in this batch's run.

DOCUMENTATION UPDATES NEEDED:
- None (manual/README.md describes the build, not the page's controls).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
