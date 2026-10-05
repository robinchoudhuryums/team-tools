---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- SP-2 follow-up (operator decision 2026-10-05, on Batch 13's reported trade): a requester's COURTESY reply ("Gracias!", "Thank you 🙏") no longer reopens a Spanish Inbox request. The operator also accepted the other reported trade (the first close wins: a member reply after a manual resolve closes nothing) — no change.

Files modified:
- web-app/51_spanish.js
- test/client/run.js
- test/client/server-split-manifest.json
- CLAUDE.md (generated running-totals row only)
Estimate: S (~1.5 h) — written before the first edit
Actual: ~1 h

CHANGES:
SP-2-FU | 51_spanish.js |
  - New `SPANISH_COURTESY_WORDS_`: English and Spanish courtesy words, accents folded.
  - New pure `spanishIsCourtesyOnly_(body)`:
    - It reads the NEW text through the Dept Request scan's `drReplyNewText_`, which cuts quoted history and the signature. It also drops a "Sent from / Enviado desde / Get Outlook" line.
    - True only when every word is a courtesy word, or there is no word but a courtesy emoji.
    - A "?"/"¿", a digit, any other word (a name, a TRX, a new ask), an empty new text or more than 200 characters is a request. It fails toward a look (g159).
  - `spanishThreadRoles_`: a requester's courtesy message is 'other' (neutral). It neither reopens nor joins the open request.
  - `spanishThreadBodyMessage_`: Expand shows the newest NON-courtesy requester message.

TEST RESULTS: passed.
- Node: 1223/1223 (was 1222). One new DRIVEN pin:
  - an 11-case courtesy grid and a 12-case request grid;
  - the pending list over a fake Gmail (a thank-you does not reopen; a thank-you with a question does);
  - Expand skips a trailing thank-you.
  - The Batch 13 pins now load the courtesy rule (`b13Ctx_`).
- DOM: 219/219, unchanged. lint:server clean; counts --check agrees; manifest current.
- 8 bite-checks, all BITE: roles, the question rule, every-word, new-text-only, the length cap, empty-is-a-request, the signature line, Expand.
  - The question rule first reported NO BITE: every question case also held a non-courtesy word. An all-courtesy question ("¿Todo bien?", "Ok, thank you?") was added and it now bites (g116: a case that fails two guards proves neither).
Regression Scenarios: S80, S105 and S121 as Batch 13 — PASS on paper. A thank-you after an answer leaves the request answered; nothing else changes.
REGRESSION RISKS:
- **A thank-you that names someone still reopens.** "Gracias Ana", or a thank-you followed by a name sign-off, carries a word outside the list. One Mark resolved clears it, and it errs toward a look.
- **The vocabulary is a list.** An all-courtesy-words message that still asks something without a "?" reads as a thank-you. Example: "ya está todo bien" when the requester meant it as a question. This is the one direction in which the filter hides work, kept narrow by the word list and the no-"?" rule.
- **Two readers now depend on `drReplyNewText_`.** Spanish shares the Dept Request reply parser, so a change to its cut rules changes both (pinned by both suites).
INVARIANTS AT RISK: None. g159 holds by construction (every doubt is a request); the Batch 13 invariants are unchanged.
NET SCORE: 1 − 0 = 1. The new failure mode Batch 13 reported (a thank-you reopens) is closed; no new one introduced.

OPERATOR ACTIONS / DEPLOY:
- None beyond Batch 13's. Tell the members a plain thank-you no longer reopens a request, and a thank-you with a question or a name does. | BLOCKS DEPLOY: N
Deploy: with Batch 13 — `cd web-app && clasp push -f`, then a New version.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- If name-suffixed thank-yous prove common, the members' first names (or the requester's own display name) could join the vocabulary per thread. That needs an operator call.

DOCUMENTATION UPDATES NEEDED:
- With Batch 13's sync: the SP-2 decision and g159/g155 gain the courtesy rule; an INV for it; S136 includes a thank-you step.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
