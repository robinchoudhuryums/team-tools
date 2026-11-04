---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (operator round 2026-11-02, not audit findings — Batch D of the plan agreed in chat: "Consolidate multiple open requests for the same trx #, marking it in some way as having follow-up(s) w/o response")
New capabilities (G/ST): Batch D — Dept Request folds:
  - D1 in My requests, Incoming and the team-wide list, two or more OPEN requests to one department for one TRX # are drawn as ONE fold: the newest card on top, "N open requests for this TRX · M follow-ups with no response", the earlier cards behind "Show N earlier requests" (remembered in state across a filter or refresh re-render); display only — every request keeps its own card, reply scan, Expand, Show reply and Mark resolved, and the in-place resolve still finds a folded card; Recently resolved never folds
  - D2 the key is a TRX NUMBER (`drTrxKey_`: what follows "TRX", else the cell's one 5+ digit run; '' for a name alone or two bare numbers), plus the department; a follow-up is "with no response" only when no earlier request on the fold had a department reply before it was sent
Files modified: web-app/metrics/script_deptrequests.html, test/client/run.js, test/client/dom/runDom.js, test/visual/shoot.mjs, docs/design-decisions.md, docs/modules.md, docs/operator-log.md, docs/test-harness-log.md, .cycle/config.md (INV-394, S153), CLAUDE.md (counts only), .cycle/STATE.md
Estimate: M (~3 h) — written to STATE.md before the first edit
Actual: S–M (~1.5 h)

CHANGES:
D1 | web-app/metrics/script_deptrequests.html | `DR_STATE.foldOpen`; `drFoldList_`, `drFoldedCardsHtml_`, `drFoldHtml_`, `drFoldId_`, `drFoldToggle_` (g133 — the key read off the wrapper); the three open lists render through `drFoldedCardsHtml_`; `.dr-fold*` styles and `.sp-tasks:has(> .dr-fold) { align-items: start }`
D2 | web-app/metrics/script_deptrequests.html | the pure `drTrxKey_` and `drFoldKey_`

TEST RESULTS: Test Command is `manual`. The Dept Requests Regression Scenarios (the resolve, reopen, reply and sort scenarios) were walked by reading against the change: a list with no shared TRX renders exactly as before (every entry is a lone card), and a folded card keeps the same data-req, buttons and handlers; S153 is new and NOT RUN in the deployed app.
  Pure 1503/1503 (one new driven pin). DOM 365/365 (one new drive). Visual: the nine deptreq scenarios measure clean (two new); the first shot of the opened fold stretched its row's other cards to its height — fixed (`align-items: start` on a list holding a fold) and re-read. lint-server clean; counts in step.
  Bite-checks (9, scratch worktree): all BITE — a case-sensitive key; two bare numbers guessed; folding across departments; a resolved request folding; an answered follow-up counted as no response; the oldest on top (pure and DOM); a name alone folding; the toggle's open state not remembered across a re-render.
REGRESSION RISKS: (a) Two different patients whose fields share a TRX number (a typo) fold together — visible, and each card still names its patient. (b) A folded request's SLA tone is on its own card, so an overdue earlier request is behind the toggle until opened — the head line counts the follow-ups, and the newest card is the one on top by design.
INVARIANTS AT RISK: None. INV-394 (new); INV-174 (the toggle is a real button with aria-expanded / aria-controls); g133 (no key in the handler); g141 (the open state lives in DR_STATE, so a re-render keeps it).
NET SCORE: 0 production fixes − 0 new failure modes = 0 (new capability)

OPERATOR ACTIONS / DEPLOY:
- Team Tools: `clasp push -f` from `web-app/` + New version | BLOCKS DEPLOY: N
Deploy: Team Tools — `clasp push -f` + New version; handbook app — N/A (unchanged)

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The rest of the plan: G, F, H (STATE.md Pending).

DOCUMENTATION UPDATES NEEDED:
- None beyond those made.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
