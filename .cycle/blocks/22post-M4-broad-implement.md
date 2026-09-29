---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Batch M4 of the CSR Procedures Manual in Reference (operator-confirmed scope 2026-09-29)
- M4-1 HCPCS codes in a manual section are links that open the Ctrl/⌘+K drawer's lookups with the code in the item box
- M4-2 the manual's recent changes on the Reference landing and in the What's new panel (retraining marked, each row opens its section at the changed heading)
- M4-3 a cross-reference previews on keyboard focus, not only on hover
- M4-4 a Print button on every manual section ("Print card" on an Appendix C card) prints only that section, through the one print block
Files modified: web-app/00_config.js, web-app/10_core.js, web-app/70_kb.js, web-app/script_core.html, web-app/script_icons.html, web-app/styles.html, web-app/kb/script_kb.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md (running totals), .cycle/STATE.md
Estimate: M–L (~9 h) — (1) M 3h · (2) M 2.5h · (3) S 1h · (4) S–M 2h · tests/visual S 0.5h — written BEFORE the first edit
Actual: ~3.5 h

CHANGES:
M4-3 | kb/script_kb.html | kbBindXrefs_ gains focusin (preview after the hover delay, only if focus is still on the link), focusout (hides unless focus moved into the card) and a CAPTURE-phase Escape that hides the preview and consumes the key, so one Escape does not also close the drawer or modal beneath (the shell's Escape listens in the bubble phase). The shown link carries aria-describedby="kb-xrefcard" while the card is up. This makes the M2 docs' "hovering or focusing" claim true.
M4-2 | 70_kb.js, 10_core.js, 00_config.js, script_core.html, kb/script_kb.html | kbManualRecent_ (pure): changelog entries within KB_MANUAL_RECENT_DAYS (90), published sections only, newest first (one date keeps changelog order), capped at KB_MANUAL_RECENT_MAX (8) with the uncapped total; a malformed date/id is dropped. kbManualRecentPayload_ adds it to getWhatsNew (no KB read when nothing is in the window; a failed read → {error:true} → manualError, never a quiet "nothing changed"). A manual change joins the seen-stamp (lights NEW). kbManualMetaCached_ factored out of getManualMeta. Client: whatsNewEnsure_ shares ONE getWhatsNew between the shell and the landing (a failure is not cached); whatsNewHasContent_ lets a manual change alone show the What's new star; manualRecentListHtml_ is the ONE renderer for the panel and the landing; kbOpenInReference_ factored out of kbReadInContext_ and used by the rows.
M4-1 | kb/script_kb.html | kbHcpcsSplit_ (pure) + kbLinkHcpcs_ wrap whole codes (the CMS letters + 4 digits, word-bounded) in a.kb-hcpcs, text nodes only (never inside a link, button, code, pre, heading, diagram), on the part page and on a manual section in the drawer — not on hand-written articles. kbHcpcsOpen_ re-checks the shape, opens the drawer on home (a search in flight is voided), puts the code in the ITEM box and looks it up, keeps a typed payor, and focuses the payor box when it is empty.
  Deviation from the scope wording ("insurance + price lookups pre-filled with that code"): the payor lookup searches by plan NAME, so a code cannot be typed into it. The code fills the price/item box; focus waits in the payor box, and once the caller's plan is typed the item row shows that payor's rule for the code (the existing T3 join).
M4-4 | kb/script_kb.html, styles.html, script_icons.html | kbPrintSection_ marks the section .print-one and the root [data-print-one], calls print(), and clears the marks on afterprint (a 1.5 s timer behind it). A new rule (4) inside the ONE @media print block hides, by display, every element that neither holds nor sits inside the subject, collapses ancestors to plain blocks, and drops the subject's buttons, feedback bar and comments. A `printer` icon was added. Checked in Chromium with print media emulated: the section alone, full width, no controls.

TEST RESULTS: passed — pure harness 1091/1091, DOM harness 172/172, lint:server clean, counts --check agrees. Pins: M4-S1, M4-S2, M4-C1, M4-C2, M4-P1 (Node); five M4 DOM tests. 33 bite-checks: 32 bit. One equivalent mutant (`kbDrawerRenderHome_({fresh:true})` inside kbHcpcsOpen_'s condition: the lookups exist only on the home view, so fresh and non-fresh render the same there). One NO BITE exposed a vacuous check. The tab-through case asserted the final card state, which the missing activeElement guard also reaches (shown, then hidden by the pending blur). It now asserts that no preview was fetched, and bites.
Visual: five new scenarios (reference-landing-manual-light-wide, reference-landing-manual-dark-mobile, whatsnew-manual-light-wide, reference-manual-hcpcs-light-wide, reference-manual-xref-focus-dark-wide) plus reference-manual-part re-shot. All were read: 0 px overflow, no missing fixtures, and only the sandbox's CERT error in the console. Reading them caught three layout problems, all fixed before commit: the 3-column row squeezed the summary to one word per line at 390 px (now flex-wrap, the date wraps under it); the panel had a stray top rule; and the sub line had a leading separator when it wrapped.
Regression scenarios (Test Command manual; walked against the harness, live walk after deploy): S88 PASS (the print block's existing rules untouched — B8 pin green; rule (4) inert without data-print-one) · S125 PASS (focus now previews, per its Expected) · S62/S64 PASS (drawer home/search unchanged; the code click goes through the existing lookups) · S112 PASS (the item box prefill runs the existing oopLookupInput_) · S124 NOT APPLICABLE (import path untouched).

REGRESSION RISKS:
- getWhatsNew's payload grew (manualRecent*, manualError) and can now return an article-less payload (bodyMd ''). The greeting-carousel slides key on bodyMd, so there are no slides for a manual-only payload; the star and the panel still show.
- getWhatsNew now reads the manual meta (script-cached) on every page load, plus the KB id and status columns ONLY when a changelog entry falls in the 90-day window.
- The seen-stamp gains a manual suffix, so every rep sees the NEW accent once after the first import that has recent changes.
INVARIANTS AT RISK: None found. INV-140/147 (drafts invisible on broadcast surfaces) is held by the published-only filter, pinned in M4-S2. The escape boundary is held by text-node wrapping (M4-C1). g64 (one print block) is pinned by M4-P1.
NET SCORE: 0 production fixes (feature work) − 0 new failure modes = 0. M4-3 corrects a documented claim ("hovering or focusing") that was untrue; it is scored as a feature, not a fix.

OPERATOR ACTIONS / DEPLOY:
- Deploy (clasp push -f + New version) | BLOCKS DEPLOY: N (it IS the deploy)
- After the next manual.json import, open Reference and What's new and confirm the recent changes list (needs a changelog entry dated within 90 days) | BLOCKS DEPLOY: N
Deploy: Server + Client (shell), Client (Reference views): `cd web-app && clasp push -f`, then Deploy → Manage deployments → Edit → New version → Deploy.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- HCPCS links are not applied in the cross-reference preview card or in search-result chunks (scope was the manual section; both read the manual too).
- Clicking a code inside the DRAWER's manual reader leaves that reader for the drawer home. The Recent list takes the rep back, but a Back-to-section affordance would be kinder.
- M2's other follow-ons remain: manual search stemming, router aliases, a cached search index.

DOCUMENTATION UPDATES NEEDED:
- docs/modules.md (Reference): the recently-changed list, HCPCS links, keyboard previews, Print / Print card.
- docs/design-decisions.md + CLAUDE.md index: "The manual's recent changes ride getWhatsNew — one payload, one renderer, for the panel and the landing".
- .cycle/config.md: INV-336.. (the one payload; published-only; failure named; print-one inside the one block; HCPCS text-node only). A scenario S126 (landing + What's new + a code click + keyboard preview + Print card), and a step on S125.
- docs/gotchas.md g116: a thirteenth direction — an assertion on the FINAL state cannot see a transient the code must never produce (show-then-hide ends where never-show ends); observe the side effect instead.
- docs/operator-log.md / docs/test-harness-log.md entries; README if it lists Reference features.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
