---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- DR-1 — the Dept Request Expand panel printed the call note's formatting markers (`**bold**`, `__underline__`, `==highlight==`) as raw characters; Issue and Resolution now render them as the note card does
- DR-2 — the panel drew every blank field as a "—" row and repeated the card's Patient & TRX; blank fields and a subject-repeating Patient & TRX are left out, a caller with no name no longer reads " (Daughter)", and a note with nothing to show says so
New capabilities (G/ST): None (an in-app view of the department's reply was considered and left as a proposal — see FOLLOW-ON ITEMS)
Files modified: web-app/metrics/script_deptrequests.html, test/client/run.js, test/client/dom/runDom.js, test/visual/mock.js, CLAUDE.md (running totals), docs/modules.md, docs/operator-log.md, .cycle/STATE.md
Estimate: S (~1 h) — written to STATE before the first edit
Actual: ~0.8 h

Scope check (operator 2026-10-27: "the Dept Requests page could likely use the same treatment [as the Spanish Inbox]; check and if confirmed…"):
NOT confirmed as stated — the Spanish problem was Gmail's raw plain text (quoted thread, signatures, disclaimer, group footer) dumped into the card. The Dept Request Expand panel never shows an email: it reads the LINKED CALL NOTE (getDeptRequestDetail) and draws it as labelled fields. The parts of the treatment that did apply were legibility ones: raw markers (DR-1) and noise rows (DR-2).

CHANGES:
DR-1 | web-app/metrics/script_deptrequests.html | drDetailHtml_: Issue and Resolution go through cnFmtHtml_(esc(...)) — the note card's own renderer and its rule (Issue/Resolution only, escaped first, g38); other fields stay esc() text
DR-2 | web-app/metrics/script_deptrequests.html | drDetailHtml_: a blank field returns no row; Patient & TRX is omitted when equal to the payload's patientTrx (the card subject); caller/relationship joined without a dangling " (…)"; an all-blank note renders "The linked note has nothing filled in." (INV-187); the now-unused .dr-detail-blank rule removed
Tests | test/client/run.js | new driven DR-1/DR-2 pin (markers rendered with the surrounding text inert, blank/repeated rows out, a differing Patient & TRX kept, relationship-only caller, empty note stated, markers only on Issue/Resolution); the C-N6 structural escape assertion updated to the new shape
Tests | test/client/dom/runDom.js | C-N6 DOM drive: a **marker** in the Resolution renders bold; Transferred to (blank) and Patient & TRX (repeats the subject) are absent
Fixture | test/visual/mock.js | the detail fixture's Resolution carries a **marker** so deptreq-expanded-* photographs it

TEST RESULTS: passed — Test Command is `manual`, so the Node harnesses were run directly: pure 1410/1410, DOM 289/289, lint:server clean, counts --check clean, visual CI gate PASS (24), deptreq-expanded-light-wide / deptreq-dark-wide / deptreq-light-compact 0 overflow, no narrow text, no errors. Regression scenarios for Metrics/Dept Requests: the C-N6 Expand ⇄ Collapse / cache / repaint / note:null-reason path PASS (driven).
REGRESSION RISKS: a field the desk relied on seeing as "—" (e.g. to confirm Transferred to was blank) is now absent rather than shown blank — judged noise per the operator's ask. cnFmtHtml_ is a Call Notes partial function used cross-module; index.html includes cn/script_callnotes before metrics/script_deptrequests, and both share one page scope.
INVARIANTS AT RISK: INV-187 (a "nothing to show" panel must say why) — preserved, extended to the all-blank note; g38 (markers only over escaped text) — preserved and pinned.
NET SCORE: 2 production fixes − 0 new failure modes = 2

OPERATOR ACTIONS / DEPLOY:
- Deploy a New version (client-only change) | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured (manual clasp push + New version)

FOLLOW-ON ITEMS:
- PROPOSAL (not built — a new Gmail read, so the operator's call): "Replies to check" and "Responded — needs a look" say "check the thread", but the reply sits in the sender's Gmail and the app's mailbox only — a receiving-desk member or a manager answering the look has no way to read it. A scoped live read (drCanAct_, never stored, like the Spanish Expand) drawn with spanishBodyParse_ would put the reply on the card.
DOCUMENTATION UPDATES NEEDED:
- None beyond those made (modules.md, operator-log.md)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
