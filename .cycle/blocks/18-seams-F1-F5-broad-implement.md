---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: F1 (server Offerings-URL scheme whitelist), F2 (dead
INTAKE_TAB_ICON map), F3 (pay-statement fixture paraphrase → verbatim mirror
+ derived shape pins), F4 (AUTOMATION_JOB_CHECKS ⊆ AUTOMATION_AUDIT_ACTIONS
coupling entry), F5 (stale scenario count in CLAUDE.md's Visual Audit Stage)
Files modified: web-app/Code.js, web-app/intake/script_intake.html,
test/visual/mock.js, test/client/run.js, CLAUDE.md

CHANGES:
F1 | web-app/Code.js | New server `intakeHttpOnly_` (a byte-identical twin of
the client's — the regex literal `/^https?:\/\//i` is pinned equal in both
files); `intakeRecListHtml_` now routes `product.pdfLink`/`product.imageUrl`
through it BEFORE they enter the recommendation cards' href/src. Those cards
are injected into the PPD preview modal via innerHTML and into the sent
email; the operator-owned Offerings sheet crosses a trust boundary, and
`esc_` alone neutralizes markup but not a `javascript:` scheme in an
attribute the browser will follow. Well-formed https URLs are byte-identical
in output (the cache-buster `?v=`/`&v=` logic is untouched).
F2 | web-app/intake/script_intake.html | Deleted the `INTAKE_TAB_ICON` map +
its `compactIcon` read in `intakeAppBar_` — both dead since the
compact-header retirement (INV-184: a declared-but-unread member is the next
reader's false lead). Intake scenarios re-shot: missing 0, overflowPx 0,
render pixel-equivalent.
F3 | test/visual/mock.js, test/client/run.js | The pay-statement fixture's
hand-rolled month arithmetic (an INV-185 paraphrase) is replaced by a
VERBATIM `payPeriodRange_` copy in the DO-NOT-EDIT region (byte-identity
enforced by the existing derived region pin), which the fixture now CALLS.
A new pin derives the pay-statement + offerings fixture field names from the
server's own return blocks (the liveStatus `empId`/`id` class). Three
MIRROR_INDEX entries added (client↔server `intakeHttpOnly_`, the mock
`payPeriodRange_` copy, fixture shapes ↔ server return blocks).
F4 | test/client/run.js | COUPLING_REGISTRY entry asserting every
`AUTOMATION_JOB_CHECKS` `action:` is in `AUTOMATION_AUDIT_ACTIONS` — the one
direction the labels ⊇ actions coupling cannot see (a job checked for
liveness against an action string the audit writer never emits would read
DEAD forever, the INV-186 always-amber class).
F5 | CLAUDE.md | The Visual Audit Stage's step 3 no longer restates the
scenario count ("the 42 PNGs" — stale twice, at 41 and at 44); it now defers
to the matrix run's own summary as the single source.

TEST RESULTS: passed — pure harness 585/0 (was 584; +2 new pins, −1 …
net +1 after the F3 pin absorbed a planned second assertion), DOM 75/0,
`node --check` clean on Code.js, mock.js parses, visual page rebuilt and the
three intake scenarios re-shot clean (missing 0, overflow 0).
Bite-checks (post-commit, per the thrice-burned rule): 6 mutations, ALL bite
— F1 un-route one URL ✓, F1 diverge the client regex literal ✓, F3 restore
the paraphrase ✓, F3 rename an offerings fixture key ✓, F3 rename a pay
fixture key ✓ (after widening the extractor — see below), F4 typo an action
string ✓ (trips the new coupling AND the existing Gap4 table pin).
THREE first-write pin corrections, each a documented class: (a) the ban
regex tripped on mock.js's own fix comment (INV-188 — now scans a
comment-stripped view); (b) the naive //-stripper ate `https://` fixture
URLs and with them the rows' closing braces (shape extraction stays on RAW
source; noted in the pin); (c) the line-anchored key extractor captured only
each line's FIRST key, so a renamed `totalHours` passed — the bite exposed
it; widened to colon-space over the whole block, floor 8→12, re-bitten
(commit c105f04).
Regression Scenarios (Test Command: manual): S59 NOT APPLICABLE off-editor
(MailApp/preview flow needs the deployed app) — the F1-relevant slice
verified statically: both routes pinned, regex parity pinned, https URLs
pass through unchanged; S87 NOT APPLICABLE off-editor for the endpoint —
the catalog scenario re-shot clean; S1/S2 NOT APPLICABLE (editor-only; the
Node harnesses are the standing proxy and are green).

REGRESSION RISKS: F1 changes output for a NON-http col E/F value: previously
it rendered as an (escaped) live href/src; now the link/image is dropped,
joining the existing blank-cell path. A schemeless-but-legit operator URL
(`www.example.com`) now silently renders no link — this matches the client
twin's already-shipped Catalog behavior, but it is a silent degradation for
the email/preview surface (follow-on noted). Everything else: F2 is dead
code, F3/F4 are test-only, F5 is doc-only.

INVARIANTS AT RISK: None violated. INV-89/INV-112 (esc_ discipline) —
strengthened, not weakened (esc_ still applied on top of the whitelist);
INV-185 — strengthened (paraphrase removed, shapes derived); INV-136/128 —
untouched. INV-112's text should gain the server-whitelist mention at the
next /sync-docs.

NET SCORE: 0 − 0 = 0 (a seams cycle: F1 is security hardening against an
operator-authored sheet — would not have fired this month; F2–F5 are
structural/test-integrity. The seams audit's value is the verified-held
results + the three closed drift channels, not production fires.)

OPERATOR ACTIONS / DEPLOY:
- None new for this batch | BLOCKS DEPLOY: N
- Standing (pre-existing): deploy PR #176 + this batch together —
  `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage
  deployments → Edit → Version: New version → Deploy; then run
  `runAllTests()` in the editor | BLOCKS DEPLOY: Y (it IS the deploy)
Deploy: Server + Client (Intake views): `cd web-app && clasp push -f` + New
version (one push ships both). Test Suite / CLAUDE.md: no deploy (repo-only).

FOLLOW-ON ITEMS:
- A catalog-issues WARNING for non-http col E/F values (INV-187 spirit —
  the F1 drop is currently silent; `intakeCatalogIssues_` is the natural
  home and already renders in Automation Health)
- CDR col-4 header one-liner (cycle 15, operator)
- FORMS_SS_ID segregation (standing operator recommendation)

DOCUMENTATION UPDATES NEEDED:
- INV-112: add the server `intakeHttpOnly_` whitelist to the browse-surface
  paragraph (it currently names only the client twin)
- Common Gotchas: the two harness lessons if judged durable — (a) a naive
  //-stripper corrupts string-bearing fixture sources (URLs), so INV-188
  stripping is for BANS, not shape extraction; (b) a line-anchored key
  extractor undercounts packed return blocks
---END BROAD SCAN IMPLEMENTATION SUMMARY---
