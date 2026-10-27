---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (operator-requested change)
New capabilities (G/ST):
- E1 — the Dashboard's Needs you drops its per-request Dept Request items for everyone; a manager gets ONE "Department replies running late" item while a department has at least 25% of its open requests past SLA and more than three of them (operator 2026-10-27: "25% or more over 48 hours/SLA period, per department, and only if that 25% is more than 3"; "Spanish Inbox assignments … should still appear")
Files modified: web-app/50_deptrequests.js, web-app/20_timeclock.js, test/client/run.js, test/client/server-split-manifest.json, test/visual/mock.js, CLAUDE.md (running totals), docs/modules.md, docs/operator-log.md, .cycle/STATE.md
Estimate: S (~1 h) — written to STATE before the first edit
Actual: ~0.8 h

CHANGES:
E1 | web-app/50_deptrequests.js | new pure drLateDepartments_(deptStats) + DR_LATE_SHARE (0.25) / DR_LATE_MIN (4): a department with open > 0, overdueOpen ≥ 4 and overdueOpen/open ≥ 0.25, as {dept, late, open}, worst share first; malformed rows skipped. "Past SLA" is drDeptStats_'s existing overdueOpen — the working-day SLA (M6), default 2 days
E1 | web-app/20_timeclock.js | getMyPendingTasks' `requests` source: the two per-request loops removed; only a manager reads getDeptRequests, and one item names every department over the bar ("Billing 5 of 12 past SLA · …"), overdue, routed to metricsDeptReq. A failed read still lands in `unavailable` (its own catch, PR6-1); a rep reads nothing and so can never be "couldn't check" for it
Tests | test/client/run.js | E1 pin: the rule's grid (42%, exactly 25% with 4, under 25%, 3 of 3, malformed, worst-first) and getMyPendingTasks DRIVEN for a rep (no tracker read, no item, not unavailable) and a manager (one item, only the department over the bar, overdue, routed; none when no department is over)
Fixture | test/visual/mock.js | the Needs-you fixture's requests row is the manager item; overdue 4

TEST RESULTS: passed — Test Command is `manual`, so the Node harnesses were run directly: pure 1414/1414, DOM 292/292, lint:server clean, split manifest regenerated, counts --check clean, visual CI gate PASS (24); clock-light-wide re-shot and read (the item is the sixth Needs-you row, Overdue). Bite-checked (bite.sh --fn): the more-than-three bar and the manager-only read both BITE. Regression scenarios for the Dashboard: PR6-1 (one classification per declared kind, each in its own catch) PASS unchanged — `requests` stays a declared kind.
REGRESSION RISKS: a rep loses the Needs-you reminder for requests their desk owes — accepted by the operator ("fine for now"); the Dept Requests tab and the Dashboard's Requests widget are unchanged. A manager's list is cached per person (PENDING_TASKS_CACHE_TTL), so the late item follows a resolve by up to that TTL; the resolve path already invalidates the resolver's own list.
INVARIANTS AT RISK: INV-187 / PR6-1 (a source that could not be read says so) — preserved for the manager read.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (one capability change)

OPERATOR ACTIONS / DEPLOY:
- Deploy a New version | BLOCKS DEPLOY: N
Deploy: N/A — no Deploy Command configured (manual clasp push + New version)

FOLLOW-ON ITEMS:
- None

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (modules.md, operator-log.md, STATE)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
