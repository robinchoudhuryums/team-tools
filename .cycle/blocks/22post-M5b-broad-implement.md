---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- M5b-1 — a light stemmer beside the substring match: "delivered" finds "delivery", "denied" finds "denial"; a stem counts only at a word start and only when the word itself is absent ("pap" still finds "cpap"; "rental" never finds "current"); the matched terms ride back and the client marks them
- M5b-2 — the glossary's abbreviations as PHRASE synonyms: built by the export (97 on the current manual), validated into ManualMeta by the import, expanded by search ("ABN" → "advance beneficiary notice" as one phrase; the phrase → "ABN" as a whole word; two-letter terms only in capitals)
- M5b-3 — the call router joins search: a query that is mostly a caller's phrase returns "The caller said …" first, on the router's visible targets, landing on its anchor
- M5b-4 — a cached section index (CacheService, in pieces) keyed by the KB generation (bumped by invalidateKbCache_, which every KB-tab writer calls — a derived net pins it) and a hash of the index builder's source (g157), with a short TTL for by-hand sheet edits
Files modified: web-app/70_kb.js, web-app/00_config.js, web-app/kb/script_kb.html, manual/export_reference.py, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md, docs/modules.md, docs/design-decisions.md, docs/operator-log.md, docs/operator-state.md, docs/test-harness-log.md, .cycle/config.md, .cycle/STATE.md
Estimate: L (~8.5 h) — (1) M 2h · (2) M 2h · (3) S–M 1.5h · (4) M 2h · tests/visual S 1h (written in STATE before the first edit, 2026-09-30)
Actual: ~3 h

CHANGES:
M5b-1 | 70_kb.js, kb/script_kb.html | KB_STEM_SUFFIXES + kbStem_ (no '-ly' — it read "supply" as "supp"); kbTermCount_ (substring first, else the stem at a word start; '=' terms whole-word); kbSearchScore_ and the title score count through it; kbSearchTerms_ → the response's `terms`; kbHlRegex_/kbHighlightTerms_ take those terms (longest first), tab + drawer.
M5b-2 | export_reference.py, 70_kb.js, 00_config.js | build_synonyms (leading initials spell the term — end position from the word match, so F2F → "Face-to-Face" — or a short name ≤ 3 words; never an explanation); the bundle carries `synonyms`; kbManualBundle_ passes them; kbManualMetaValidate_ validates (KB_MANUAL_SYNONYMS_MAX, charset, ≤ 80) and stores them; kbExpandGlossaryTokens_ in searchReference via kbManualMetaObj_.
M5b-3 | 70_kb.js, 00_config.js, kb/script_kb.html | kbRouterSearchHits_ (≥ KB_ROUTER_MATCH_SHARE of the typed words in phrase or answer, ≥ 1 in the phrase; visible targets only; + KB_ROUTER_BONUS); searchReference records `visible` and the base tokens; the chunk header marks a router hit (phone icon, .kb-chunk-router); .kb-chunk-go no longer shrinks.
M5b-4 | 70_kb.js, 00_config.js | kbGeneration_, kbBuildSearchIndex_, kbHashStr_ (FNV-1a), kbSearchIndexKey_ (source hash + generation), kbSearchIndex_ (getAll/putAll pieces of KB_INDEX_CHUNK, all-or-rebuild, not cached past KB_INDEX_MAX_CHUNKS, TTL KB_INDEX_TTL); searchReference reads the index instead of the tab.

TEST RESULTS: passed — pure 1103/1103, DOM 180/180, lint:server clean, manifest regenerated and current, counts --check agrees; visual: the 44 reference/whatsnew/manual-copy/training scenarios at 0 px overflow, no missing fixtures, no console errors beyond the known CDN cert line (searchReference gained a fixture and left X1's owed list). Real manual: six queries through the real server code, 6–40 ms, index ~350K chars in 12 pieces. 24 bite-checks: 21 BITE on first run (3 re-run after a quoting refusal, all BITE); 1 NO BITE acted on (the digit guard — "1990s" added); 1 EQUIVALENT mutant recorded (the every-piece check: a missing piece makes the JSON invalid and the catch rebuilds).
Regression scenarios (Test Command: manual — via the harness, the visual matrix and a real-manual run, NOT the live app): S128 PASS (its search steps run on the real manual; the import and by-hand-edit steps are owed live); S124–S127 PASS (their pins green); S62/S64 PASS (hand-written search still matches by substring, drafts still hidden — M5b-S3).
REGRESSION RISKS: search now reads a cached index — a KB-tab writer added later without invalidateKbCache_() would serve a stale index for up to KB_INDEX_TTL, which the derived net M5b-I2 fails on. The stem widens matching, so a query may return more (weaker) hits than before; stems score like the word and only when the word is absent. The router bonus places curated answers first — by design.
INVARIANTS AT RISK: INV-139 / the draft rule (drafts never to reps) — router targets are filtered by the same visibility (pinned); g157 (ScriptCache shared by deployments) — the key hashes the code; g120 (client↔server mirror) — avoided: the client marks the server's terms. New: INV-346..349.
NET SCORE: 3 production fixes (inflected words found nothing; "ABN"-style abbreviations missed their spelled-out sections and vice versa; a caller's own words did not reach the router's answer) − 0 new failure modes = +3 (the index is a performance change, not scored as a fix)

OPERATOR ACTIONS / DEPLOY:
- Re-export manual.json and import it once (Reference → Manual → Choose File → Check → Import) so the glossary synonyms reach ManualMeta | BLOCKS DEPLOY: N
Deploy: Server + Client (Reference views): `cd web-app && clasp push -f`, then Deploy → Manage deployments → Edit → New version.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- kbHighlightTerms_ marks a two-letter query word inside longer words ("on" in "continues") and marks the results heading — pre-existing, seen in the new shots.
- kbMarkReviewed is a named exemption from the generation bump; revisit if search or guidance ever reads ReviewedAt.

DOCUMENTATION UPDATES NEEDED:
- None outstanding — written with the batch (modules, a design decision + index line, operator-state KB_AI_GENERATION + the manual import, operator log, harness log, INV-346..349, S128, running totals).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
