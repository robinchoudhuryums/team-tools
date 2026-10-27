---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- KB-HL — search highlighting marked a query word wherever its letters occurred, so a short word lit up inside longer ones ("in" in "billing", "or" in "order", "pap" in "paper") and the real hits were hard to see in the drawer (operator 2026-10-27)
New capabilities (G/ST): None
Files modified: web-app/kb/script_kb.html, test/client/run.js, test/client/dom/runDom.js, CLAUDE.md (running totals), docs/modules.md, docs/operator-log.md, .cycle/STATE.md
Estimate: S (~1.5 h) — written to STATE before the first edit
Actual: ~1 h

Scope note: the search itself matches inside words on purpose (M5b — "pap" finds "cpap"; Call Notes search is a plain substring match), so strict word-start marking would have left such a result with no mark at all. The rule shipped is word-start, with the mid-word mark kept only for a word that has NO word-start match in that result.

CHANGES:
KB-HL | web-app/kb/script_kb.html | kbHlRegex_ split into kbHlTokens_ (the words: query + server terms, longest first) + kbHlEsc_; new pure kbHlSplit_(tokens, text) decides per token word-start vs anywhere (a token not beginning with a letter/digit is anywhere; a token with no word-start occurrence but a mid-word one is anywhere); new pure kbHlWordStartRegex_ marks both in one pass (group 1 the boundary, left unmarked; group 2 a word-start hit; group 3 a mid-word one); kbHighlightTerms_ groups text nodes by result (KB_HL_UNIT: .kb-chunk, .kb-chunk-doc, .cn-card — else the root) and splits per result; letters include Latin-1/Extended accents (KB_HL_WORD) for Spanish text; the text-node walk, skip list and <mark class="kb-hl"> output are unchanged
Tests | test/client/run.js | KB-HL pure pin: "in"/"or" only at word starts, stems still mark their forms, "pap" marks inside "CPAP" only when the result has no word-start "pap", start-of-text / punctuation / accented-letter boundaries, a punctuation-led token, codes, adjacent hits; the kbHlRegex_ pin loads its new helpers
Tests | test/client/dom/runDom.js | KB-HL DOM drive: the drawer's two results — word starts only in one (heading included), the mid-word mark in the other; Call Notes search keeps a TRX-fragment hit marked

TEST RESULTS: passed — Test Command is `manual`, so the Node harnesses were run directly: pure 1412/1412, DOM 291/291, counts --check clean, visual CI gate PASS (24); reference-search-drawer-dark-wide re-shot and read — "on" no longer marked inside "documentation"/"Transaction", "Fax History" and the stem "Wait" still marked. Regression scenario (Reference search → compiled view) — the render path is unchanged; marks verified by the DOM drives. INV-344 (codes linked before the marks) — the existing M5a DOM drive (E1399 mark inside its link) PASS.
REGRESSION RISKS: a word split across inline elements ("c<strong>pap</strong>") reads as a word start inside the inner node — rare in rendered markdown; a result's word-start choice is shared across its whole section, so a mid-word occurrence in a section that also has a word-start one is no longer marked (intended). The highlighter is shared with Call Notes search and the cross-reference preview; both keep their hits (pinned for Call Notes).
INVARIANTS AT RISK: INV-344 — preserved (marks still run after linking; no change to call order). The escape boundary (text-node walk only, never string surgery) — preserved.
NET SCORE: 1 production fix − 0 new failure modes = 1

OPERATOR ACTIONS / DEPLOY:
- Deploy a New version (client-only change) | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured (manual clasp push + New version)

FOLLOW-ON ITEMS:
- None

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (modules.md, operator-log.md, STATE)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
