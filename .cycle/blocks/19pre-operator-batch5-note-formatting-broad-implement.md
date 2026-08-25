# Operator batch 5 (2026-08-25) — marker note formatting — block

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- B5-1 | **bold** / __underline__ / ==highlight== markers: plain-text storage,
        rendered post-esc on 7 card/panel sites + the dept email (Issue +
        free-text Resolution) + the 3 digest issue lines; CRM copy strips
        paired markers; Cmd/Ctrl+B / U / Shift+H wrap the selection and
        REPLACE the native contenteditable bold (which wrote <b> tags that
        did not survive the plain-text save); ? overlay lists the shortcuts.
        Server twin cnFmtEmailHtml_ regexes pinned byte-equal (MIRROR_INDEX).
        Boundary held: no rich-text toolbar / no HTML in cells.
Files modified: web-app/cn/script_callnotes.html, web-app/Code.js,
test/client/run.js
TEST RESULTS: pure 638/638, DOM 79/79; 5/5 bites (incl. an unescape-revival
mutation, a regex-drift mutation, and the OOP-branch-processed mutation).
Browser-measured: strong 2 / u 1 / mark 1 on a real card, mark bg =
rgb(251,241,217) = warn-soft, hostile payload inert.
REGRESSION RISKS: existing notes with literal **/__/== in content now render
formatted in cards/emails (paired occurrences only; unpaired stay verbatim) —
cosmetic, reversible by editing the note.
INVARIANTS AT RISK: INV-89 (formatter takes ESCAPED input — pinned), INV-41
(email builder change applies at preview AND send identically — hash
consistent), INV-72 family (new mirror pinned).
NET SCORE: 0 − 0 = 0 (one capability + one latent-confusion removal: native
Ctrl+B previously LOOKED bold and silently saved plain)
OPERATOR ACTIONS / DEPLOY: none; ships on the standing combined deploy.
FOLLOW-ON ITEMS: a marker in a REVIEW comment / training question renders
raw (those fields are out of scope by design — extendable on request).
DOCUMENTATION UPDATES NEEDED: consolidated sync-docs (shortcuts, the
formatting contract, MIRROR_INDEX entry).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
