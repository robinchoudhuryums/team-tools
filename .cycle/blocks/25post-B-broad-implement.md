---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (operator round 2026-11-02, not audit findings — Batch B of the plan agreed in chat)
New capabilities (G/ST): Batch B — email-tool tags:
  - A department email's SEND tags its note on the server, in the same subformData write as the email's selections: Close Order per REASON (operator) through CONFIG.CALL_NOTES.CLOSE_REASON_TAGS — `close-change-supplier`, `close-dissatisfied`, `close-cost`, `close-deceased`, `close-insurance`, `close-not-needed`, `close-pt-request`, and `close-other` for a typed or legacy reason (the reasons as words break the 2–24-character tag rule); OOP Order `oop-order`, Verified Shipping `ver-ship`, Repeat Resupply `resupply` (EMAIL_TOOL_TAGS)
  - The 8-tag cap holds (a ninth is never added) and an archived tag is never added; the send returns the tags and the card mirrors them at once
  - The archived-tag gap: a rep's browser is no longer sent an ARCHIVED tag's keyword auto-tag rule (the admin editor still shows every rule)
Files modified: web-app/00_config.js, web-app/30_callnotes.js, web-app/cn/script_callnotes.html, test/client/run.js, test/client/server-split-manifest.json, docs/design-decisions.md, docs/modules.md, docs/operator-log.md, docs/test-harness-log.md, CLAUDE.md (counts), .cycle/STATE.md
Estimate: S (~2 h) — written to STATE.md before the first edit
Actual: S (~1 h)

CHANGES:
B1 | web-app/00_config.js | CONFIG.CALL_NOTES.CLOSE_REASON_TAGS (one per CLOSE_ORDER_REASONS entry + Other) and EMAIL_TOOL_TAGS
B2 | web-app/30_callnotes.js | the pure cnEmailToolTag_, cnTagsWithSendTag_, cnRulesWithoutArchived_; emailFromCallNote writes mergedSub.tags and returns `tags` on both success paths; getCallNotesDepartments sends the rules less archived tags
B3 | web-app/cn/script_callnotes.html | the send success handler mirrors res.tags onto the cached note

TEST RESULTS: Test Command is `manual`. Regression Scenarios touching the department-email send were walked by reading against the change: the send, the stamp and the subformData merge are unchanged but for the added `tags` key (written in the same setValues) — NOT RUN in the deployed app.
  Pure 1496/1496 (one new driven pin; the auto-tag delivery pin updated); DOM 360/360; lint-server clean; counts in step.
  Bite-checks (5): all BITE — one tag for every reason; an archived tag added; archived rules sent to reps; the send adding no tag; the card never showing the tag.
REGRESSION RISKS: (a) The stamp write after a SUCCESSFUL send is best-effort (a failure is logged, never returned) — a failed stamp also loses the tag; unchanged posture. (b) An older note is not re-tagged; only sends from the deploy on. (c) The new tags are not in the admin auto-tag vocabulary, so they do not reach the KB AI guidance or the search signal (deliberate — g167's vocabulary is the admin's).
INVARIANTS AT RISK: None. The X5 rule (tags live in subformData, no new column), g167 (no user text enters a vocabulary), g17 (inside the send's existing lock).
NET SCORE: 1 production fix (an archived tag was still auto-added by its keyword rule) − 0 new failure modes = 1

OPERATOR ACTIONS / DEPLOY:
- Team Tools: `clasp push -f` from `web-app/` + New version | BLOCKS DEPLOY: N
Deploy: Team Tools — `clasp push -f` + New version

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The rest of the plan: C, E, D, G, F, H (STATE.md Pending).

DOCUMENTATION UPDATES NEEDED:
- None beyond those made.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
