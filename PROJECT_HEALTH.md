# Project Health — team-tools

## Current Standing
Cycle 7 (broad) closed 2026-07-09 — scanned, FULLY implemented, reflected,
deployed, and editor-verified in one day. The audit (6-agent fan-out + personal
verification of every Medium+ finding) broke the three-cycle no-High streak:
~40 findings — 0 Critical / **2 High** / ~15 Medium / ~20 Low — and the ENTIRE
backlog shipped same-cycle across 12 turns (fix Turns 1–8 + verification Turn A
+ Seams audit Turn B + detector-liveness Turn C + per-rep schedules Turn D;
PRs #118, #120–#123, all merged on green).

- Scan-time scores (the audit measurement, per the Cycle-2 convention):
  Overall 8 · Correctness 7.5 · Security & Access Control 8.5 · Data Integrity 8.5 ·
  Timezone Correctness 8 · Concurrency Safety 8.5 · Test Coverage 8 ·
  Code Clarity & Docs 8.5 · Apps Script Best Practices 9 · Manager UX 8 ·
  Employee UX 7.5 · Automation Reliability 7.5
- **The cycle's defining failure class was Silent Degradation** — both Highs
  were detectors that could never fire: H-1 coaching-overdue (space-form stamp
  vs a T-only parser — the accountability digest NEVER nagged since Coaching
  shipped) and, same class, M-11 unmatchedAgents (structurally-empty diagnostic).
  Nothing — CI, health panels, the field — surfaced either. H-2: the ADP payroll
  export wrote raw coerced Date cells into an unpinned-tz spreadsheet.
- **Net +14 (14 production fixes − 0 new failure modes; 24 defensive; 1 new
  monitoring capability).** Fired-in-prod fixes incl. the manager Recent-Activity
  feed (constant "12:00 AM" + never-rendered ADJ reasons — the project's own
  gotcha classes unapplied to AuditLog cols 7/8), silent punch-failure toasts,
  intake + CN draft-destroying teardown debounces, whitespace-dropped search,
  double-wired bulk Approve/Deny, the Team Notes sub-tab race, and 'Other'-dept
  SLA noise.
- **Structural headlines:** `createPinnedSpreadsheet_` factory (tz+locale) with
  a no-bare-create CI tripwire; the `cnTimestampString_` locale-coercion
  boundary; subformData whitelist (INV-49/50 back to server-enforced);
  admins⊆managers ENFORCED; KB draft-visibility closed across AI-cache/convert/
  training; **detector-liveness monitoring** (`automationDetectorChecks_` —
  panel + failure digest + smoke test, so the H-1/M-11 class can't ship
  silently again); per-rep shift overrides (roster column O, INV-149).
- **Seams audit (Turn B, counter reset to 0):** found the flagship INV-72
  LEAVE_DEDUCTION mirror had NO tripwire since cycle 1 (now a behavioral-mirror
  test) and pinned the cross-partial intake flush hook; Turn A's persistence
  audit surfaced a LIVE bug (the CN sticky-draft persister deleted drafts on a
  post-teardown fire) that had survived all seven prior cycles.
- Invariant library 140 → **149**; harnesses pure 230 → **248**, DOM 48 → **55**
  (multiple bite-checked); editor suite 259 tests — operator-verified 258/259,
  the one failure being a wrong assertion idiom in a NEW test (the gate it
  tested was proven working by the failure output; fixed in #123).
- **Deployed + verified**: operator ran the deploy and `runAllTests()` same-day.
  Remaining operator step: one `clasp push -f` for the #123 Tests.js fix, then
  a re-run should read 259/0. Optional: fill Employees column O for
  nonstandard-shift reps.
- Estimate calibration: turns ran ~25–40% of their human-dev sizing.
- Last updated: 2026-07-09 (Cycle 7 close, /sync-docs).

## Prior standing (Cycle 5 close, 2026-06-17)
Cycle 5 (broad) closed 2026-06-17. Audit-opened broad-scan of the mature codebase
again found NO Critical/High — one Medium (M-1) + Lows — and the full backlog plus
three manager features shipped and merged (PR #53). Numbered 5 because a parallel
session had claimed Cycle 4 for a non-audit operator-feedback batch (kept distinct).

- Overall 8.5 · Correctness 8.5 · Security & Access Control 9 · Data Integrity 9 ·
  Timezone Correctness 8.5 · Concurrency Safety 9 · Test Coverage 8.5 ·
  Code Clarity & Docs 9 · Apps Script Best Practices 9 · Manager UX 8.5 ·
  Employee UX 7.5 · Automation Reliability 8

- **Movement this cycle:** Correctness 8→8.5 (M-1 — the one real correctness bug,
  a doc/impl drift where adjustLeaveBalance_ gated only on the global PTO flag and
  silently drove `PtoEnabled=FALSE` contractor balances negative, contradicting
  S15/INV-27 — fixed + regression-tested), Manager UX 8→8.5 (three new manager
  tools: Coverage planner, Tag-trend analytics, KB Review-due). All other
  dimensions held: the cycle was mostly feature + hardening on a solid base.
- **One Medium, zero High/Critical** — third consecutive audit with no Critical/High
  (mature-codebase signal). M-1's realistic this-month trigger was narrow
  (manager filing PTO on behalf of a contractor / direct RPC), but it's a real
  contract violation that the existing tests missed (they checked display-hiding,
  not the no-deduct).
- **3 new features** (all manager-gated, read-only, PHI-free, pure Node-pinned
  cores): #5 tag-trend analytics (INV-125), #4 KB review-due (INV-126), #3 coverage
  planner (INV-127). **13 defensive hardenings** — headline ones: getMyMetrics
  endpoint cache (the only rep-facing CDR read, was uncached), KB-AI race-safe spend
  cap, three bounded CN reads, a definitive `verifyDocSignature` tamper flag.
- **Net +1 (1 prod fix − 0 new failure modes; 13 defensive).** Pure harness
  128→133 green; node --check clean; DOM harness unchanged (CI runs it).
- **Still trailing:** Employee UX (7.5) — the new features are manager-facing; the
  highest rep-value roadmap items (#2 follow-up-date on the action flag, #1
  patient/TRX timeline) and the admin-blocked external-form route remain.
- INV-128/129/130 proposed for the next verification pass.
- **Operator deploy of the merged batch is still pending** (`clasp push -f` + New
  version + `runAllTests()`).
- Last updated: 2026-06-17 (Cycle 5 close).

> **Non-audit thread (2026-06-18, branch `claude/practical-gauss-yycwkz`):** a
> parallel UI-redesign batch landed — redesign commits #1–#7 (Time Clock sky
> card + ribbon control surface, Metrics presets/sortable table, Call Notes
> Search cards + Admin sub-tabs, Intake Option-A controls, Training rings/matrix,
> Reference collapsible depts, Coverage heatmap), deferred follow-ons #1–#4
> (range-aggregated My Stats via `getMyMetricsRange`, Sick-leave UI removal /
> backend-dormant, shared `mtRenderTable_` table component, Admin system-status
> cards), and niceties #8–#10. New endpoints `getMyMetricsRange` /
> `getMyNoteHourBuckets`; new tests (`test_cn_search_phoneTrxFieldScopes` + a
> design-token hygiene tripwire). INV-128/129/130 are now DOCUMENTED in CLAUDE.md
> (no longer just proposed). Docs synced via `/sync-docs` (this note). No PR yet;
> operator deploy still pending. This was feature/redesign work, not an audit —
> no health-dimension rescore.

## Prior baseline (Cycle 2 scan-time)
First numeric per-dimension baseline, scored at SCAN time (before the cycle-2
backlog was implemented):

- Overall 7.5 · Correctness 7.5 · Security & Access Control 9 · Data Integrity 8 ·
  Timezone Correctness 8 · Concurrency Safety 8.5 · Test Coverage 7 ·
  Code Clarity & Docs 8.5 · Apps Script Best Practices 8.5 · Manager UX 7.5 ·
  Employee UX 7 · Automation Reliability 7.5
- **The cycle's bug axis shifted**: Cycle 1's Sheets-coercion/tz class produced one
  more fired bug (M1 pending-trend — third bite; a Node tripwire now bans raw
  SUBMITTED_AT reads), but the dominant new axis was **client overlay/lifecycle**:
  every High/Medium client finding (Esc-killed composers, paste-listener leak,
  Enter-on-Cancel, optimistic-revert clobber, stranded spinners, late-callback
  clobbers) lived in the DOM layer no automated test sees. Root cause centralized
  (ensureOverlay/closeOverlay + Esc hooks); a DOM-lifecycle test harness remains
  the highest-leverage coverage investment.
- **Security & Access Control** — strongest dimension: full-codebase XSS sweep found
  zero exploitable sinks from user-typed data; every manager gate verified and now
  test-pinned (all 8 previously-untested gates + the public token endpoints).
- **Whole audit backlog closed same-cycle**: 1 High, 10 Medium, 11-item Low batch.
  Net +8 production fixes, 0 shipped new failure modes, ~13 defensive hardenings,
  3 new CI tripwires (SUBMITTED_AT reads, view-key registry, M1 test parity).
  Editor suite green post-deploy; Node harness 89 → 92.
- **Known gaps carried forward** — L19 composer tab-switch typed input; KB-6
  Esc-discards-editor-edits confirm; DOM-lifecycle harness; P#17 out of repo
  scope. (Shipped post-close: KB Phase 2b/3 + KB AI Phase A on 2026-06-12, then
  the full Training & Employee Docs module T1–T3, the onboarding tour, the
  Google Forms quiz import, and four operator-feedback ergonomics rounds + two
  bugfixes through 2026-06-15 — Node harness 99→123. KB AI Phase B + Training
  T4 stay gated on observed demand.)
- **Per-dimension scores below are FROZEN at the 2026-06-11 audit close** — the
  post-close work above was feature/feedback work, not an audit, so the scored
  standing intentionally hasn't moved. A fresh `/broad-scan` (Cycle 3) would
  re-score; the new Training/Docs + tour surface has not yet had a fresh-eyes
  audit pass.
- Last updated: 2026-06-15 (gaps line refreshed post-feature-work; scores unchanged from the 2026-06-11 close)

## Score History
| Date | Cycle | Overall | Notes |
|------|-------|---------|-------|
| 2026-06-11 | 1 | net +4 (4 prod fixes − 0 new failure modes; 9 defensive) | Broad scan A1–A10 → full backlog implemented (A1–A9, P#1–P#16; P#17 out of scope). Headline: AuditLog ts coercion had blanked the compliance panel in production. KB feature run (tables/images, drawer, section search, usage loop) shipped and operator-verified S62–S64. Editor suite 233/233; Node 89/89. |
| 2026-06-11 | 2 | net +8 (8 prod fixes − 0 new failure modes; ~13 defensive; overall 7.5/10 at scan) | Fresh broad scan (full Code.js read + 4 sub-audits) → entire backlog closed same-cycle: overlay-lifecycle centralization (Esc killed composers / intake paste-listener PHI leak), uiConfirm Enter-on-Cancel, optimistic-revert clobber, SUBMITTED_AT coercion (pending-trend flat zero since ship), stranded spinners, 8 untested manager gates + first public-endpoint tests, digest heartbeats, 11-item Low hygiene batch. Node 89→92 with 3 new tripwires. |
| 2026-06-16 | 3 | net 0 (0 fired-bug fixes − 0 new failure modes; ~9 defensive; overall 8.5/10) | Fresh broad scan of a now-mature codebase found NO Critical/High — all Low (F1 public-form null-res, F2 CDR-field escaping, F3 intake client-PHI drop, F5 err.message guards, F6 bounded break map, F7 ambient-poll handler; F4 retracted) + targeted audit of the two never-scanned subsystems (appsscript.json clean; script_tour T-1/T-2/T-4). HEADLINE structural: built the **jsdom DOM-lifecycle test harness** (the cycle-1+2 top gap) — 36 DOM tests pinning innerHTML escape (proven to bite), overlay/Esc lifecycle, optimistic submit+revert (INV-48), _flagInFlight (INV-56), late-callback guards, focus trap. Test Coverage 7→8.5, Overall →8.5. jsdom = first dev dependency; CI runs pure (zero-dep floor) then npm ci + DOM. 122 pure + 36 DOM green. Deploy of the client batch pending (operator). |
| 2026-06-17 | 5 | net +1 (1 prod fix − 0 new failure modes; 3 features; 13 defensive; overall 8.5/10) | Audit-opened broad-scan of the mature base — again NO Critical/High; one Medium (**M-1**: adjustLeaveBalance_ gated only on the global PTO flag not the per-employee PtoEnabled column → silently deducted `FALSE` contractors, contradicting S15/INV-27; the ptoEnabled tests only checked display-hiding → undetected; fixed + test). Shipped 3 manager features (**#5** tag-trend analytics INV-125, **#4** KB review-due INV-126, **#3** coverage planner INV-127) + 13 hardenings (getMyMetrics endpoint cache, KB-AI race-safe spend, bounded CN reads L-7/L-8/L-10, verifyDocSignature `tampered` flag, tz boundary, comments). Correctness 8→8.5, Manager UX 8→8.5. Numbered 5 (parallel session held Cycle 4). Pure 128→133 green; node --check clean. Merged PR #53; operator deploy pending. INV-128/129/130 proposed. |
| 2026-06-18..07-01 | 6 | — (implement-only; no reflect row) | Non-audit threads between audits: the UI-redesign batch + follow-ons, KB self-improving loop (#107–#112), PPD structured-controls redesign Phases 0–4 (#113–#117), DeptRequests v2, Dashboard/Manage-module/admin-tier work, cycle-6 broad-implement F1–F11. No /reflect ran (sessions closed mid-implement), so no net-score row — see .cycle/STATE.md history. |
| 2026-07-09 | 7 | net +14 (14 prod fixes − 0 new failure modes; 24 defensive; 1 capability; overall 8/10 at scan) | Broad scan broke the no-High streak with TWO silent-dead detectors (H-1 coaching overdue never fired since ship; H-2 payroll export tz) → entire ~35-finding backlog shipped same-cycle (Turns 1–8) + verification/residuals (A), Seams & Invariants audit (B — INV-72 mirror finally tripwired; CN draft-persister live bug found+fixed), detector-liveness monitoring (C), per-rep schedules col O (D). Factory+boundary class fixes tripwired. INV library →149. Pure 230→248, DOM 48→55. Deployed + editor-verified (258/259 → assertion-idiom fix #123). |
