---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- 1 | The overnight-open warm start is the real pre-warm — verified the day-rollover + focus reconcile path and said so on the pop-out tooltip (no code path changed).
- 2 | Boot-timing beacon: shell / state / view durations ride the landing view's ViewUsage row; Admin → Overview shows a "Startup time · 7d" line.
- QA-icon | The QA sidebar + Recordings tab (and the QA loaders' glyph) use a new `waveform` icon.
- QA-access | Verified, no change: `canSeeQa_` admits every manager and admins ⊆ managers, so the operator already has QA access; `QA_MEMBERS` is for non-manager reviewers only.
- QA Log tab | NOT built — planned separately per the operator's instruction (see FOLLOW-ON).
Files modified: web-app/Code.js, web-app/script_core.html, web-app/tc/script_clock.html, web-app/cn/script_callnotes.html, web-app/script_icons.html, web-app/qa/script_qa.html, test/visual/mock.js, test/client/run.js, test/client/dom/runDom.js, CLAUDE.md, .cycle/STATE.md

CHANGES:
2 | Code.js | `recordViewEnter(viewKey, mode, timing)` stores `viewUsageTimingCell_(timing)` (pure: null/blank/negative/over-cap phases dropped — `Number(null)` is 0, caught by BOOT-1) in a trailing `BootTiming` column (`VIEW_USAGE_WIDTH`=5, header self-heals); `getViewUsageStats` reads it via `viewUsageTimingParse_`; `viewUsageAggregate_` adds `boot.{n7, shell, state, view}` (7-day window, median + p90, null when unreported).
2 | script_core.html | `BOOT_T` + `bootNow_`/`bootTimingArm_`/`bootFirstPaint_`/`bootTimingSend_`; `recordViewUsage_` defers the landing view's row while arming and accepts a timing arg; the load handler stamps `stateStart` BEFORE the RPC and `stateMs` first thing in the success handler; 20s fallback send.
2 | tc/script_clock.html, cn/script_callnotes.html | `bootFirstPaint_()` at the Dashboard card render and the Call Notes form render; `cnUsageBootHtml_` startup line (em dash per unreported phase, absent field renders nothing) + `.cn-usage-boot` CSS.
1 | script_core.html | Pop-out tooltip: "leave it open overnight and it is already warm at shift start".
QA-icon | script_icons.html, script_core.html, qa/script_qa.html | `waveform` glyph; `sidebarIcon` + `qaQueue.icon` + three `renderLoading` glyphs repointed.
tests | run.js (BOOT-1, BOOT-2; QA-5 repointed), runDom.js (BOOT-DOM), mock.js (`boot` fixture shape).

TEST RESULTS: pure 758/0, DOM 106/0. Visual: admin-light-wide / admin-dark-wide / admin-light-mobile re-shot, 0 overflow, startup line eyeballed. Manual scenarios: S48 (shell boot) PASS by DOM test; S51 (Admin panel) PASS by shoot; S90 (QA tool visible to a manager) PASS by registry pin; all others NOT APPLICABLE (no overlapping behaviour changed).
REGRESSION RISKS: `recordViewEnter` gained an optional 3rd arg (older client sends 2 → blank cell, unchanged rows). The landing view's usage row is now sent at first paint / +20s instead of at enter — a rep who closes the tab within 20s of boot before the Dashboard paints loses that one usage row (telemetry only). `getViewUsageStats` reads 5 columns; a tab provisioned pre-deploy self-heals its header on the next append.
INVARIANTS AT RISK: None (INV-150/187 posture kept: null never 0; INV-185: fixture carries the boot shape; INV-136: no new gated endpoint; A2: the new line is a single flowing div).
NET SCORE: 0 − 0 = 0 (a capability, not a bug fix; two defects were caught by the new pins before they shipped).

OPERATOR ACTIONS / DEPLOY:
- None (the `BootTiming` column self-heals) | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` → Apps Script editor → Deploy → Manage deployments → Edit → New version → Deploy. Post-deploy `runAllTests()` still expects 308.

FOLLOW-ON ITEMS:
- QA Log tab (operator): a QA agent's daily-progress "Notes" equivalent — to be PLANNED next (store on the QA sheet, per-reviewer rows, date-keyed, plain-text-pinned cells, `canSeeQa_` gate, shared AuditLog id-only).
- Pre-shift warm trigger for the 6-hour dashboard cache — only if the startup line shows the CDR-backed cards dominate; needs `getDashboardMetrics` to take an employee rather than the caller.
- Metrics My Stats / Team Metrics 30-day trends still walk calendar days (from the previous round).
- Delete `SPLIT_REPAIR_2026_09_03` + its wrappers once the operator confirms the manual punches are entered.

DOCUMENTATION UPDATES NEEDED:
- Done in this round: CLAUDE.md (observability KDD boot-timing note, ViewUsage store entry, operator entry, count chain 758/106), .cycle/STATE.md.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
