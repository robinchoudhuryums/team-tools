---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Manual reader design Phase 4 (operator 2026-10-09: "found but not fixed in last turn, Phase 4") — M17 footnotes + glossary terms in the shared card, M18 manual search hits styled as manual; Phase 3's two found items: the callout kicker's stray dash, and white text on the other semantic fills
Files modified: web-app/kb/script_kb.html, web-app/cn/script_callnotes.html, web-app/intake/script_intake.html, web-app/metrics/script_metrics.html, web-app/train/script_coaching.html, test/client/run.js, test/client/dom/runDom.js, docs/operator-log.md, .cycle/manual-reader-design-plan.md, .cycle/STATE.md, CLAUDE.md (counts block)
Estimate: M (~5 h) — written in STATE.md before the first edit
Actual: ~3.5 h

CHANGES:
Found 1 | web-app/kb/script_kb.html | the callout decorator folds a leading em/en dash AFTER a bare label ("**Note** — text", 42 callouts in the source) into the hidden .kb-co-sep, so the body no longer opens with "—"; the paragraph's text is unchanged; MRD-1 DOM now asserts the visible text (the fixture had this exact shape and never checked it)
Found 2 | cn (×3), intake, metrics, coaching (×3) | eight rules put white on --warn/--good/--info/--danger/--destructive — measured in a browser across all 5 palettes: in dark mode white reads 1.40–2.83 (WCAG 4.5), --paper-card 6.5–13.2, and --paper-card IS white in light mode — now var(--paper-card); left on measurement: .cn-form-clear-btn:hover (white on --danger-deep is 4.62 in dark — passes) and form_public.html (fixed palette, no dark mode)
M17 footnotes | web-app/kb/script_kb.html | kbManualFootnotes_ (from kbManualDecorate_): the "Notes" paragraph and its notes are found per article; each superscript run becomes a button.kb-fn-ref paired with the first note of its number AFTER it (numbers restart per sub-section; a number with no note is left as written; notes, code, links, headings, diagrams skipped); text unchanged; aria-label "Note N" (kbFnNum_); kbFnShow_ paints "Note ¹ · <section>", the note without its number (links kept) and Go to note (kbFlashBlock_ → reader-only scroll)
M17 glossary | web-app/kb/script_kb.html | kbGlossaryAnnotate_ drops data-tip (and the ::after CSS tooltip), adds role=button + data-term/data-def; kbGlossShow_ paints "Glossary", term, definition and Go to glossary — the definition row on the same page (kbGlossRowFor_), not man-a (adapted)
M17 binding | web-app/kb/script_kb.html | KB_POP_SEL (links, footnotes, glossary marks) rides the existing mouseover/focusin/focusout delays and the Escape-first capture through kbPopShow_; a click on a footnote or term shows its card at once; marks inside the card are inert; kbPopTake_ moves aria-describedby
M18 | web-app/kb/script_kb.html | kbRenderSearchResults_: a manual hit's side-list row is the chapter dot + number + title, its sub-rows number + heading (kbManualSplitHeading_); kbChunkGroupsHtml_: badge + number chip + title, "Manual · <short name>", chunk headings in sentence case with the number in the chapter colour (router chunks unchanged), the group carries the chapter class; kbDecorateCallouts_ (shared with the chapter) runs on results in the tab and the drawer; the callout and step CSS extends to .kb-chunk-body[data-kb-man]
Tests | run.js, runDom.js | MRD-4 (pure: the semantic-fill sweep, non-vacuous, with its measured exclusions stated; kbFnNum_, kbManualSplitHeading_ driven; one card + one binding + inert; glossary mark shape; results decorated at both sites) + MRD-4 DOM (footnote pairing across two Notes blocks, the card, Go to note, focus + Escape; the glossary card + Go to glossary; manual vs hand-written search hits); MRD-1 DOM asserts visible callout text; two pins updated for the intended changes (the glossary card replaces the CSS tooltip; step selectors now also reach results). Bite-checked 7 mutations — all BITE

TEST RESULTS: pure 1259/0, DOM 227/0, lint:server clean, counts --check agrees. Visual: shots of real 3.7 (three footnotes, all paired; the card on-screen at 1440 light/dark and 390 dark), the real 5.2.4 callout (no dash), and search results (manual header, dot, numbered chunk heading) — 0px page overflow, no page errors; the reference matrix re-run — see STATE. Regression scenarios: none names the Reference reader (manual Test Command) — NOT APPLICABLE beyond the harnesses above.
REGRESSION RISKS: (1) the glossary definition no longer shows as a pure-CSS bubble — it needs the script's card (always present in the app); (2) a footnote number in a note-less section stays plain text (as before); (3) the drawer's single-item reader does not run kbManualDecorate_, so footnotes there stay plain numbers (as before).
INVARIANTS AT RISK: None — g141 (no input touched), g146 (no rep input in any message), T6 (every new class has a rule), g100/INV-145 (the card is the existing tooltip, not an overlay; Escape-first unchanged), the escape boundary (the note body is cloned DOM kbMd_ already escaped; terms/definitions go through esc).
NET SCORE: 2 production fixes (white text under 3:1 on status fills in dark mode across Call Notes, Intake, Metrics, Coaching; a stray "—" opening 42 callouts in the reader) − 0 new failure modes = 2; M17 / M18 are capabilities.

OPERATOR ACTIONS / DEPLOY:
- clasp push -f + Deploy → Manage deployments → New version (with Phases 1–3 if not yet deployed) | BLOCKS DEPLOY: N
Deploy: cd web-app && clasp push -f, then a New version

FOLLOW-ON ITEMS:
- Light mode: white (and --paper-card, which is white there) on --warn reads 3.64 — below 4.5 in light mode on the amber chips/badges; a darker amber fill or ink text would fix it. Pre-existing, not worsened.
- Footnotes in the Ctrl+K drawer's single-section reader stay plain (it does not run the chapter decorator) — Phase 7 (compact) or later.
- Phase 5 next: M15 reading trail, M16 resume.

DOCUMENTATION UPDATES NEEDED:
- docs/modules.md (Reference) and docs/design-decisions.md should name the reader bar, masthead, chapter cards, the footnote/glossary card and manual search hits — /sync-docs at the end of the design thread.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
