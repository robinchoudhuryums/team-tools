---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- DR-4 — resolving a request from its main card repainted its "Replies to check" card as a second, full request card: `drCardNodes_` matched every `.sp-task[data-req]`, look cards included, and the success path never repainted `#dr-looks`
New capabilities (G/ST):
- DR-3 — Show reply (the round-9 FOLLOW-ON proposal, approved by the operator 2026-10-27): a request the reply scan has read, and each "Replies to check" card, can show the department's reply in the app — the same reply the scan judged, drawn as the Spanish conversation
Files modified: web-app/50_deptrequests.js, web-app/metrics/script_deptrequests.html, test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, CLAUDE.md (running totals), docs/modules.md, docs/operator-log.md, .cycle/STATE.md
Estimate: M (~3 h) — written to STATE before the first edit
Actual: ~2.5 h

CHANGES:
DR-3 | web-app/50_deptrequests.js | drRequestReplyPick_ extracted from drReplyScanCore_ (thread read, excluded senders, department addresses/domains, cut-off max(created, reopened), the request id as shared-thread token) so the scan and the view read ONE way; drSharedRequestIds_ finds the other requests on the same thread; new public getDeptRequestReply(requestId) — employee + drFindRowByReqId_ + drCanAct_, else "Request not found."; no thread / no reply / a read failure each return a stated reason; the reply is returned (sender name from the directory, time, verdict, plain body capped at 8000) and never stored, cached server-side, logged or audited
DR-3 | web-app/metrics/script_deptrequests.html | drHasReply_ / drReplyBtnHtml_ / drReplyPanelHtml_ / drReplyInnerHtml_ / drReplyToggle_: a "Show reply" button (aria-expanded, aria-controls) on request cards with a reply on record and on every look card; one RPC per request per page, cached in DR_STATE.replies, nav-guarded, a detached button repaints its host; the body goes through spanishBodyHtml_ (escaped), the head through esc(); .dr-reply CSS
DR-4 | web-app/metrics/script_deptrequests.html | drCardNodes_ selects `.sp-task[data-req]:not(.dr-look)`; drResolveClick_'s success path repaints #dr-looks from DR_LAST_DATA before drRepaintRequest_
Tests | test/client/run.js | driven DR-3 endpoint pin (refused caller, no thread, no reply, the scan's pick returned, nothing written); scan pins updated to read through drRequestReplyPick_ (Gmail before the lock kept); drCardNodes_ selector pin
Tests | test/client/dom/runDom.js | DR-3/DR-4 DOM drive: Show reply → one RPC, panel painted with sender/time/body, Hide/Show reuses the cache, a hostile reply stays inert, a no-reply reason is stated; resolving from the main card leaves the look card a look card
Fixture | test/visual/mock.js, shoot.mjs | getDeptRequestReply fixture (a reply with an earlier quoted message); scenarios deptreq-reply-light-wide and deptreq-reply-dark-mobile

TEST RESULTS: passed — Test Command is `manual`, so the Node harnesses were run directly: pure 1411/1411, DOM 290/290, lint:server clean, counts --check clean, split manifest regenerated, visual CI gate PASS (24); the two new scenarios 0 overflow, no narrow text, no errors. Regression scenarios for Dept Requests: the reply-scan four rules + shared-thread token (D-2 grid, driven) PASS — the scan now reads through the extracted reader; Expand ⇄ Collapse / look Resolved ⇄ Still open PASS (driven).
REGRESSION RISKS: drReplyScanCore_ was refactored to call the extracted reader — the D-2 rule grid and the "Gmail before the lock" pin both drive it, and `scanned` is counted before the no-pick return exactly as before. The view reads Gmail live as the deployer, so a desk member sees a reply sent to the sender's request thread — scoped by drCanAct_, the same people who may resolve it.
INVARIANTS AT RISK: the public-gate rule (g143) — getDeptRequestReply gates itself and is pinned by a refused-caller drive; never store reply text (22post D) — preserved, nothing written; g146 (no typed input on the error beacon) — the reasons quote no input.
NET SCORE: 1 production fix − 0 new failure modes = 1

OPERATOR ACTIONS / DEPLOY:
- Deploy a New version (one new read-only endpoint + client) | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured (manual clasp push + New version)

FOLLOW-ON ITEMS:
- reference-manual-diagram-light-mobile reports SQUEEZED TEXT on `span.kb-man-ix-t` (37px) at 390px — pre-existing, outside the CI subset and untouched here.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (modules.md, operator-log.md, STATE)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
