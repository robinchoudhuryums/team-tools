---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: operator-asked, not scan-derived — three rounds run
back-to-back after the batch-1..6 deploy:
  CMP  | composer Preview loader + editable Note Reference
  KBI  | Reference file ingest (editor file-drop + Admin data-table import)
  GATE | two post-deploy test-contract fixes (shape, then tier)
Files modified: web-app/Code.js, web-app/Tests.js,
  web-app/cn/script_callnotes.html, web-app/kb/script_kb.html,
  test/client/run.js, test/client/dom/runDom.js, test/visual/mock.js,
  test/visual/shoot.mjs, CLAUDE.md

CHANGES:
CMP-a | cn/script_callnotes.html | Preview → carries an in-button loader
  ("Saving note…" then "Building preview…"), restored on BOTH failure paths;
  success needs no restore (the modal re-renders into the preview step).
CMP-b | cn/script_callnotes.html + Code.js | the composer's Note Reference is
  EDITABLE — seven `.ce` rows (a blank field renders too, so a missing
  Transferred To can be filled) writing back through the SAME caller-scoped +
  locked + audited `updateCallNote` the card editor uses. No new endpoint, no
  second write path, so the email and the stored note cannot disagree.
  Load-bearing details: save-then-preview ORDER (previewing first would build
  the body — and the INV-41 hash — from the STALE note and email the
  un-corrected text); raw markers in the fields (editing rendered HTML would
  destroy them on the way back); in-place repaints (a modal re-render drops the
  caret mid-word); state replaced BEFORE the composer instance guard; a note
  still saving renders read-only.
KBI-a | Code.js + kb/script_kb.html | editor file-drop (`kbIngestFile`,
  admin-gated, READ-ONLY w.r.t. the KB sheet): .md/.txt inline, .csv through
  the PRODUCTION `kbSheetGridToMarkdown_`, .docx/.xlsx/.rtf/.odt through the
  EXISTING converters, anything else → embed with the consequence NAMED.
  Deliberately avoids the ADVANCED Drive service — it calls the Drive REST
  upload endpoint with `ScriptApp.getOAuthToken()`, so a domain API
  restriction costs the CONVERSION, never the project's authorization.
KBI-b | Code.js + cn/script_callnotes.html | Admin → Config → Reference data
  tables: a CSV that REPLACES an allowlisted KB tab. `KB_DATA_TABLES` — not
  the admin gate — is the security boundary; `dryRun` defaults TRUE; ONE
  server parse drives preview and write; the range is pinned to plain text
  BEFORE the write (a payor named "Aetna 5-2024" would coerce to a date).
GATE-1 | Tests.js + run.js | `insurance_search_requiresEmployee` used
  `_assertFailure` (writer shape) on a READ endpoint, failing against a
  CORRECT rejection. Fixed + the derived GATE-SHAPE tripwire.
GATE-2 | Tests.js + run.js | the three Reference-ingest endpoints are
  ADMIN-gated but were missing from the omnibus's `ADMIN_GATED` map, so the
  case asserted the manager message. Fixed + the derived GATE-TIER tripwire,
  which fails in BOTH directions.

TEST RESULTS: pure 622 → 653, DOM 79 → 81, visual matrix 48 → 49 (0 missing,
0 overflow). Every pin bite-checked; three pins were corrected rather than the
code (a `//` stripper ate `https://`; a phrase shared by both embed messages;
a first GATE-SHAPE form that nagged on a correct sibling read).
REGRESSION RISKS: the composer now WRITES on Preview. Mitigated by reusing the
existing endpoint + the ordering pins; a failed save aborts the chain rather
than previewing unsaved text.
INVARIANTS AT RISK: INV-41 (amended — the hash is now taken AFTER pending
edits commit, which strengthens it), INV-115 (held — ingest is read-only
w.r.t. the KB sheet), INV-136 (count 43 → 46), INV-171 (the GATE-TIER pin is
its one-level-down sibling).
NET SCORE: not scored here — cycle 19's reflection owns it.

OPERATOR ACTIONS / DEPLOY:
- `cd web-app && clasp push -f` + Deploy → New version | BLOCKS DEPLOY: Y
- `runAllTests()` in the editor (expect 293/293 once PR #188 is in) | N
- Import the payor CSV via Admin → Config → Reference data tables | N
- Email spot-check: one dept + one intake email (From "<Agent> · Universal
  Medical Supply", Reply-To the agent) | N
Deploy: `cd web-app && clasp push -f`, then Deploy → Manage deployments →
Edit → Version: New version → Deploy.

FOLLOW-ON ITEMS:
- Batch 7 (structured intake feedback) — BLOCKED on the operator; free-text
  recipient feedback already shipped 2026-08-13, so only build field-level
  corrections if they confirm they want them on top.
- The `19pre-*` block backlog (13 blocks) is un-reflected: pilot rounds 1–3
  + follow-ons, operator batches 1–6, and this one. Cycle 19's reflection
  must cover all of them, and the last three cycles all found batch
  self-reports over-counted — re-derive strictly.

DOCUMENTATION UPDATES NEEDED: None — /sync-docs was applied in-session for
every round.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
