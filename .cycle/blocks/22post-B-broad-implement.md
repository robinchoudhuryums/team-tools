---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Batch B of the 22post plan (operator testing notes, agreed 2026-09-27)
- B-2b — the Scratchpad is a FLOATING, NON-MODAL panel: no backdrop or blur, usable while filling in a note (or with the composer open), draggable by its header, resizable from its corner, and it remembers its position and size; Escape closes it only from inside
- B-2c — a formatting toolbar (bold, italic, underline, three sizes, five theme colours + default, bulleted and numbered lists, clear formatting), stored as allowlisted html with a character counter; a pre-B plain-text pad converts on open
Files modified: web-app/script_core.html, web-app/cn/script_callnotes.html, web-app/30_callnotes.js, web-app/Tests.js, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md (running totals), .cycle/STATE.md
Estimate: M–L (~7 h) — 2b M 3h · 2c M–L 4h
Actual: ~2.5 h

CHANGES:
B-2b | script_core.html, cn/script_callnotes.html | ONE shared drag helper: dragClamp_ (pure — the whole panel stays on screen; a panel larger than the window pins to 0,0) and dragStart_ (pointer events incl. touch and pointercancel, never starts from a control in the handle, onEnd callback). The two email composers' duplicated mouse-only drag functions now call it (onpointerdown, touch-action:none). The Scratchpad is `#cn-scratch-panel.cn-float-panel` (role=dialog, aria-modal=false, aria-labelledby) appended to <body> at z-index 56 (above the overlay layer, like the KB drawer); CSS resize: both with a 300×260 minimum; cnScratchGeomFor_ (pure) clamps the remembered {x,y,w,h} to the current window, saved on drag end, on a resize (ResizeObserver, debounced) and on close under the new localStorage key `umsScratchGeom` (try/catch — g112). Escape is handled on the panel and stops there (so it never closes a modal underneath); the shell's focus trap and a ui-dialog's Enter handler both exempt `.cn-float-panel`. Reopening while open focuses it instead of rebuilding; closing hands focus back to where it came from. The header has a × (the existing .modal-x) beside the footer's Close / Save now.
B-2c | cn/script_callnotes.html, 30_callnotes.js, Tests.js, mock.js | The editor is a contenteditable div (NOT `.ce` — the Call Notes field handlers stay off it). Toolbar commands use execCommand; colours and sizes use a SENTINEL (foreColor #010203 / fontSize 7) that cnScratchConvertMarks_ turns into palette CLASSES (`cn-sp-c-red|amber|green|blue|purple`, `cn-sp-s-small|large`, theme tokens that flip in dark mode — never inline colours); default colour / normal size / clear unwrap them (cnScratchUnwrap_). cnScratchSanitize_ (client, DOM walk) and scratchpadSanitizeHtml_ (server, tokenizer — the stored copy) keep b/strong/i/em/u/br/div/p/ul/ol/li and a span with palette classes only; every attribute, comment and unknown tag goes (text kept), script/style-class elements go whole, bare < > & are escaped. A paste is sanitized before insertion. saveMyScratchpad(content, 'html') sanitizes server-side before the cap check and records C1 = 'html'|'text'; getMyScratchpad returns `format`; a 'text' pad converts on open (cnScratchTextToHtml_). The counter shows the stored length against the server's maxChars (warn at 90%, danger over).

TEST RESULTS: passed — pure harness 1043/1043 (was 1040; +3), DOM 159/159 (was 158; +1), lint:server clean, counts --check agrees (localStorage keys 18 → 19, visual 119 → 120), split manifest regenerated. The two sanitizers are held to ONE case table (SCRATCH_SANITIZE_CASES in run.js, the same rows in the DOM pin). Pins updated for the deliberate change (Category A — the Scratchpad is no longer an overlay): R3 #5's named-dialog assertion, F-02 DOM's scratchpad half (Close + Escape-from-inside on the panel), C6 (innerHTML, the panel's close) and 22post A-2a DOM (contenteditable, no backdrop assertion — there is no backdrop). Editor suite: html round-trip assertions added to scratchpad_saveReadRoundTrip (no new registration). 11 bite-checks, all BITE: server keeps unknown tags · server keeps any class · server trusts client html · client keeps unknown tags · raw html sent · legacy text read as html · clamp gone · focus trapped again · Escape leaks to the modal · geometry unclamped · A-2a refresh clobbers typing (re-bite). Visual +1 (cn-scratchpad-light-compact) + cn-scratchpad-dark-wide re-shot: 0 px overflow, only the proxy CERT line; the form stays visible and undimmed around the panel; the purple swatch first rendered ORANGE (--intake-pmd) and amber brown (--warning-deep) — fixed to --intake-pap / --warn before commit.
Regression scenarios (Test Command manual): S114/S115-adjacent Scratchpad steps and S34-adjacent composer drag — NOT APPLICABLE here: each needs the deployed app; the driven pins cover the functions they walk.

REGRESSION RISKS:
- A tab still running the pre-deploy client opens a formatted (html) pad in its old textarea and shows the markup; if it edits and saves, the pad is stored as plain text containing tags, which the new client then shows as text. The deploy beacon prompts those tabs to reload.
- The panel sits above the overlay layer (z 56), so a centred confirm dialog can open beneath it on a small screen until the panel is moved.
- execCommand is deprecated but supported by every current browser; if a browser drops foreColor/fontSize, colour and size stop applying (bold/lists/typing unaffected).
- The composers' drag now keeps them fully on screen (before, they could be dragged partly off it).

INVARIANTS AT RISK: None broken. Touched: g100/INV-145 (the Scratchpad LEAVES the overlay lifecycle — deliberate: it is non-modal; the derived overlay net covers static overlay ids only and is unaffected), g111 (the editor is not `.ce`), g112 (the new key is `ums…`-prefixed and every access is in a try/catch), g120 (the two sanitizers share one case table), g57/T6 (every new class has a rule; no var() fallbacks), INV-148 (the flush-on-close holds), A12/INV-175 (a cold failed load still renders the warn card).

NET SCORE: 0 − 2 = −2
- Production fixes: none — both items are requested capabilities, not defects.
- New capabilities: 2 (B-2b, B-2c).
- New failure modes: 2, both Low — the pre-deploy-tab format mismatch, and a dialog able to open beneath the panel.

OPERATOR ACTIONS / DEPLOY:
- None. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → New version (with Batch A — neither is deployed)

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The toolbar buttons carry no pressed state (bold/italic/underline do not show when the caret is inside bold text).
- No visual scenario shows formatted content (colours, lists) in the panel; the mock pad is plain text.
- A ui-dialog opening beneath the panel (above) — raising .ui-dialog over z 56 would fix it.
- Paste of rich content was not driven (jsdom has no execCommand('insertHTML')); the sanitizer it uses is.

DOCUMENTATION UPDATES NEEDED:
- docs/modules.md (Call Notes: the floating, formatted Scratchpad), docs/design-decisions.md (a floating non-modal panel, not an overlay; colours as theme classes; the server as sanitizer authority), docs/gotchas.md (amend g100: the Scratchpad is deliberately non-modal and exempt from the focus trap), docs/operator-state.md (the Call Notes store row: the Scratchpad tab's C1 format cell), docs/operator-log.md, docs/test-harness-log.md, .cycle/config.md (invariants: the allowlist on both sides, the non-modal panel's Escape/focus rules, the geometry clamp; walk steps on the Scratchpad scenarios).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
