---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (an operator round, not a scan batch)
New capabilities (G/ST): T1 (operator 2026-11-11) — the onboarding tour rewritten: steps for every tool (Dashboard, Stats, Spanish Inbox, Time / PTO, Call Notes, Dept Requests, Reference, Intake, Training, Team Training, QA, Manage, Admin), each shown only where its tab is visible to the user; TOUR_VERSION 2 with a per-step `since`, so people who took the first tour get a short "what's new" run instead of the whole tour; replay from Settings; a browser check (in CI) that every step's target appears, per role, with a screenshot per step
Files modified: web-app/script_tour.html, web-app/script_core.html, test/visual/tour-check.mjs (new), test/visual/shoot.mjs, test/visual/print-check.mjs, test/visual/a11y-names.mjs, test/visual/README.md, test/visual/.gitignore, .github/workflows/client-tests.yml, test/client/run.js, test/client/dom/runDom.js, docs/design-decisions.md, docs/modules.md, .cycle/config.md, .cycle/STATE.md, CLAUDE.md
Estimate: M (~4 h) — written to STATE.md's Estimates line before the first edit
Actual: ~3.5 h

CHANGES:
T1 steps | web-app/script_tour.html | TOUR_STEPS rewritten: 28 steps, each with an `id` and (new ones) `since: 2`; the `welcome` card opens the full tour, the `whatsnew` card the what's-new run; no role flag on any step. Tall targets swapped for a part of the view (the Stats hero, the Spanish counts, the Time / PTO request card, the Dept Requests title row, the first Dashboard widget). The v1 Tags step now lights the tag input — it pointed at the suggestion strip, which is empty until you type, so it had been skipped on every run since it shipped.
T1 engine | web-app/script_tour.html | `tourStepVisible_` = `tabVisibleForUser_(TOOLS[tool].tabs[view])` (the tab bar's own gate, so View-as follows); `tourVisibleSteps_(mode, seen)`; `tourSeenVersion_` / `tourAutoMode_` (never seen → full; some visible step newer than the stored version → new; else nothing — one rule, the redundant version compare removed after it proved an equivalent mutant); `tourStart(mode)` with `TOUR_MODE` and an empty run starting nothing; the kicker "What's new · N of M"; `tourPlacePop_` puts the card beside a target when neither below nor above fits; the end toast points at Settings.
T1 Settings | web-app/script_core.html | Settings → Tour → Replay the tour (`settingsReplayTour_`: closes the panel, focuses the visible gear, then `tourStart('full')`, so the tour's focus hand-back lands on the gear); not in the compact pop-out. The Call Notes ? link stays.
T1 check | test/visual/tour-check.mjs, .github/workflows/client-tests.yml | Walks the full tour as the fixture admin, View-as Manager / Spanish CSR / CSR, and on a phone, and loads the page at stored version 1: fails on a target that never appears, a card off screen, a step the role's tabs do not allow, a missing what's-new auto-start, or an end that does not stamp; photographs every step (shots/tour-<run>-<nn>-<id>.png); writes tour-report.json; a CI step after the layout gate. The matrix, print and a11y scripts seed `umsTour` at 9999 so no scenario starts the tour.
T1 tests/docs | test/*, docs/*, .cycle/config.md, CLAUDE.md | Four pure pins (the registry: ids, tabs, every selector's ids and classes in the markup, one opening card per run, every tool visited; the role gate driven for CSR / Spanish / QA / manager / admin over the real TOOLS + tabVisibleForUser_; the what's-new filter and the auto mode driven; the Settings row, focus order, kicker, stamp and placement in source), two DOM drives (Settings replay → full tour, Escape → focus on the gear + stamp; a v1 browser auto-starts the what's-new run, skip stamps, View-as CSR drops the manager steps, a fresh browser gets the full tour); INV-416, S175, the decision `#t1-tour-by-role-and-whats-new` (and a pointer from the original tour entry), the module note, the visual README.

TEST RESULTS: pure 1628/1628, DOM 411/411, `lint:server` clean, `handbook-sync --check` clean, `counts.mjs --check` clean. tour-check: PASS — admin 27 steps, manager 26, Spanish 22, CSR 21, phone 26 (the sidebar step skipped by design below 1024px), what's-new run 14 steps (opening card + 13). Visual spot run (clock, cn-log) — 0 overflow, no errors, no tour on screen. Bite-checks: 15 of 15 mutations bite (10 pure, 5 DOM) after two changes — "a newer stored version re-offers" was an equivalent mutant (the filter already returned nothing), so the redundant compare was removed and the deciding line bitten instead; "the end stamps nothing" survived because the replay drive had seeded the current version, so the drive now starts from version 1 and the mutant bites. Regression: the shell/tour scenarios (T-1/T-2 tour DOM tests, the D12 Escape pin, the colour pin, the shortcuts-overlay pin, every DOM test that seeds the tour seen, the Settings flyout) — PASS; S175 new — operator walk owed.
REGRESSION RISKS: Everyone who took the first tour sees a what's-new run once on their next full-window load after the deploy (Skip ends it for good). The tour now visits more tools, so a first-time tour fires more RPCs (each view's normal load). A browser that stored a non-numeric `seenVersion` is treated as never having seen the tour.
INVARIANTS AT RISK: None — INV-416 added; SH-04 (the tour's dialog contract and focus return) kept and still pinned; the deep-link and pop-out suppression unchanged.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (T1 is a new capability; the Tags step fix rides it)

OPERATOR ACTIONS / DEPLOY:
- Team Tools `clasp push -f` + New version (rides with AC1/M1) | BLOCKS DEPLOY: N
- Walk S175 on DEV | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` (then New version)

FOLLOW-ON ITEMS:
- Coaching and My Docs have no step of their own (the Training step names them); add if people miss them.
- The visual mock's Team Training fixture renders an error state (the tour still finds its container) — a mock gap.

DOCUMENTATION UPDATES NEEDED:
- None (done in this batch)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
