---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: ED1 (operator round 2026-11-05) — Employee Docs fill & sign fixes: the read-only view cut an over-long box answer off unseen (fixed); box text was sized by the WINDOW, so a box held different amounts of text on different screens (fixed); the PDF file picker and the Issue Docs table's title buttons were unstyled (fixed).
New capabilities (G/ST): ED1-sig — Signature and Initials box types filled by the sign panel; ED1-col — boxes coloured by type with a legend; ED1-size — boxes made in points with a size and capacity readout, a capped fill box with a counter.
Files modified: web-app/00_config.js, web-app/20_timeclock.js, web-app/81_empdocs.js, web-app/train/script_empdocs.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md, .cycle/config.md, .cycle/STATE.md, docs/design-decisions.md, docs/modules.md, docs/operator-state.md
Estimate: M–L (~6 h)
Actual: ~6 h (one session; the visual pass found two things the tests could not — the initials placeholder squeezed to a sliver, and a typed signature sitting small in its box until the export was trimmed to the ink)

CHANGES:
ED1-sig | 00_config.js, 20_timeclock.js, 81_empdocs.js | EMPDOC_FIELD_TYPES gains signature/initials (EMPDOC_SIGN_FIELD_TYPES): box-only, refused on a document that does not require a signature, never a stored response. acknowledgeDoc takes the drawn initials (empDocInitialsCheck_, before any write), stores them in DocSignatures' trailing InitialsDataUrl and hashes them behind a tag only when present; verifyDocSignature recomputes with the row's initials; getMyDoc returns a signed document's drawings after its read gate via empDocLatestSigRow_ (re-checks its key, g164; the certificate now uses it too); the certificate names signature/initials boxes and draws the initials.
ED1-sig | train/script_empdocs.html | Signature/initials boxes in the reader paint live from the pads (edSignBoxesPaint_); a second small initials pad (typed alternative too) when the document has an initials box; Sign waits for it; Clear empties both; pad exports are trimmed to the ink.
ED1-col | train/script_empdocs.html | Fixed per-type colours (g58) with a legend in the issue form and above the reader's pages; optional dashed, required solid.
ED1-size (fix) | train/script_empdocs.html | Box text is calc(100cqw × size ÷ page width in points) on a size-contained page; shrinks to a 7pt floor (edFitBoxes_); a fill box is capped at its floor capacity with a counter near the limit; a read-only answer past capacity or still overflowing is marked and listed in full under the pages.
ED1-size | train/script_empdocs.html | edBoxFromDrag_ takes the page size in points: a tap makes the type's standard size in points, a thin drag is raised to one line; the field list shows each box's page, size in inches and characters it holds.
ED1-style (fix) | train/script_empdocs.html | A styled Choose PDF… button over a hidden file control, naming the file; .tr-table .tr-title styled.

TEST RESULTS: pure 1522/1522 (6 new pins), DOM 375/375 (4 new drives). Visual: the empdocs scenarios (7, 3 new) measure 0 overflow, 0 runaway, no squeezed text, no errors; the shots were read. Bite-checks: 27/27 bite (19 pure + 8 DOM, scoped with --fn, run in a scratch worktree at befb278). Test Command is manual: S156 and S157 overlap these files — NOT walked here (operator, after deploy).
REGRESSION RISKS: (1) On a phone, box text is now the page's own size — about 6px at 390px wide — where it was at least 10px; it matches the printed page but is small to type into until ED2's zoom. (2) A browser open across the deploy calls acknowledgeDoc without initials — harmless, since no document has an initials box until one is issued after the deploy. (3) Trimmed pad exports change the stored signature PNG's shape (not its kind); the hash covers whatever is exported, so nothing earlier is affected.
INVARIANTS AT RISK: INV-397 (the PDF signed over its bytes) — untouched paths, re-run green; INV-96 (signature export cap) — the cap stays 600px and the initials pad asks for 300; INV-135 (responses attested) — signature/initials store no response, and the initials are attested through the signature hash instead. New: INV-398.
NET SCORE: 3 production fixes (the clipped answer, window-sized box text, the unstyled controls) − 1 new failure mode (small box text on a phone until ED2) = 2

OPERATOR ACTIONS / DEPLOY:
- Team Tools `cd web-app && clasp push -f`, then Deploy → Manage deployments → New version | BLOCKS DEPLOY: N (it is the deploy)
- Walk S157 (and S156, still owed) | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured

FOLLOW-ON ITEMS:
- ED2 (planned): move/resize handles, snap, zoom — the remedy for regression risk (1); detecting a PDF's own form fields.
- ED3 (planned): a filled PDF with the answers and drawings stamped in.
- The written-document field list still offers no signature boxes (by design — the sign panel is the written document's signature).

DOCUMENTATION UPDATES NEEDED:
- None beyond those made: design-decisions (new entry + CLAUDE.md index link), modules.md, operator-state.md (the InitialsDataUrl column), .cycle/config.md (INV-398, S157), the counts block.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
