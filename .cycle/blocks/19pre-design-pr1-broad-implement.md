---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: design handoff PR 1 — the cross-cutting sweep (plan §4 PR 1):
  C1 token fallback sweep (no `var(--token, fallback)` on tokens the partial defines);
  C2 tab strip wraps to two rows ≤480px (`.toolbar-tabs`);
  C3 ONE shared date-range control (`mtDateRange_` family in script_core) replacing the
     three per-tab builders (My Stats / Team Metrics / Punctuality);
  C4 `mtPctTone_(p, hi, lo)` as the one % band rule (`mPctClass_` delegates byte-identically);
  C5 three CSS fixes (`.tr-complete-btn` hover/focus, `.qa-kbd-hint` on `--muted-2`,
     `.coach-banner` border ≠ background);
  C7 `?fixture=empty` mock hook + `EMPTY_FIXTURES` (additive — never a missing fixture).
Files modified: web-app/script_core.html, web-app/styles_design_tokens.html,
  web-app/metrics/script_metrics.html, web-app/train/script_training.html,
  web-app/train/script_empdocs.html, web-app/train/script_coaching.html,
  web-app/tc/script_clock.html, web-app/styles.html, web-app/script_tour.html,
  web-app/qa/script_qa.html, web-app/kb/script_kb.html, web-app/cn/script_callnotes.html,
  test/visual/mock.js, test/client/run.js, CLAUDE.md, .cycle/STATE.md

CHANGES:
C1 | 10 partials + styles | redundant `var(--x, fallback)` removed where `--x` is defined; derived scan PR1-1
C2 | styles_design_tokens.html | `.toolbar-tabs` wraps to a second row ≤480px (measured on Admin mobile: 2 rows, 0 overflow)
C3 | script_core.html, metrics/script_metrics.html | `mtDateRange_/Row_/Sync_/Toggle_` shared control; both Metrics tabs consume it; retired builders banned
C4 | script_core.html, metrics/script_metrics.html | `mtPctTone_`; `mPctClass_` → `mtPctTone_(p, thr ?? 80, 50)`
C5 | train/script_training.html, qa/script_qa.html, train/script_coaching.html | the three CSS fixes
C7 | test/visual/mock.js | `FIXTURE_MODE` + `EMPTY_FIXTURES` consulted before `FIXTURES`

TEST RESULTS: pure 718/0 (5 new pins PR1-1..PR1-5, 3 rewritten in place; 8/8 mutations bite),
  DOM 101/0, visual matrix 67/67 clean (0 missing, 0 overflow; Metrics wide light/team shots
  byte-identical to pre-sweep; Admin mobile shows the two-row tab wrap). Editor suite: not run
  (no server change).
REGRESSION RISKS: the shared range control changes the DOM ids/classes the two Metrics tabs
  render — any external CSS keyed on the retired builders' classes would lose styling (none
  found in-tree; the retired class names are banned by pin).
INVARIANTS AT RISK: INV-128 (token hygiene — the sweep REMOVED fallbacks; the tripwire stays
  green); INV-173/174 (the shared control renders real buttons with pressed/expanded state —
  pinned). None violated.
NET SCORE: 1 − 0 = +1 (C2: the Admin/CN-search tab strip overflowed a 390px page; the rest is
  structural — shared controls, harness hooks, fallback hygiene)

OPERATOR ACTIONS / DEPLOY:
- None | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` + New version (ships with PRs 2–6 on one deploy).

FOLLOW-ON ITEMS:
- `EMPTY_FIXTURES` OWED list in PR1-4 grows with PRs 3–4 (getCoachingDashboard, getMyCoaching, getMyPendingTasks).

DOCUMENTATION UPDATES NEEDED:
- Done in-PR: CLAUDE.md fallback gotcha, shared-control KDD, park-and-consume KDD, `?fixture=empty` rule, counts.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
