# Project Health — team-tools

## Current Standing
Cycle 2 (broad) closed 2026-06-11. First numeric per-dimension baseline, scored at
SCAN time (before the backlog was implemented — post-fix reality is better on the
client-lifecycle axes):

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
