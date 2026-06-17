# Implementation Plan — Team Tools Design Redesign

> Companion to the `*.dc.html` design references + `README.md` in this folder.
> This is the **authoritative implementation plan**: it reconciles the design
> handoff against the actual codebase, records every conflict + its resolution
> (codebase always wins), and sequences the work into per-module commits.
>
> **Status:** planned (not yet implemented). Authored 2026-06-17.
> **Operator decisions captured:** C1 remove Sick (confirmed real), C2 note-volume
> histogram, C3 add Phone/TRX (server change), C4–C7 per recommendation, all
> improvement suggestions accepted, execute as separate per-module commits.

---

## Guiding rule
When the design handoff and the codebase conflict, **the codebase wins.** Every
conflict found during planning is logged below with its resolution. The handoff
is high-quality and mostly accurate; the items here are the exceptions.

## Implementation conventions (every module)
- Re-implement in the Apps Script HTML partials using `area.innerHTML = …`
  string templates — the existing module pattern. **No new framework.**
- Add **view-scoped CSS classes** consuming `styles_design_tokens.html` tokens.
  Do not port the mock's inline styles. Prefer `var(--token)` over literal hex.
- Use `icon(name, size)` from `script_icons.html` for all glyphs.
- `esc()` every server-derived string before `innerHTML` (pinned invariant).
- Preserve all server round-trips, late-success `currentView` guards, optimistic
  UI, and the Intake **PHI-drop-on-send** behavior.
- Honor compact mode (`COMPACT_MODE` / `:root[data-compact]`).
- Apply the **token-hygiene fix** (below) in every file touched.

---

# Conflict register (resolved)

### C1 — Remove Sick leave — **CONFIRMED by operator (employees have no sick days).**
The design's "remove Sick entirely" was flagged because the codebase wires Sick
as a live feature (roster col J `SickLeaveBalance`; `Sick Leave` in
`TIME_OFF_TYPES` / `LEAVE_DEDUCTION_CLIENT` / the `modals.html` PTO `<select>`;
deduction in `adjustLeaveBalance_`; PTO reconciliation). Operator confirms sick
days are not granted, so the feature should go.

**Scoped resolution (two layers — keep them honest):**
1. **This redesign (UI surfaces):** remove Sick from the Clock ledger; the new
   one-row layout's compact PTO card shows **Annual only**. Remove any sick
   balance line from the Time/PTO side rail + PTO decision surfaces shown to the
   rep.
2. **Consistency follow-up (do alongside, low risk):** remove the
   `<option value="Sick Leave">` from the PTO `<select>` in `modals.html`. This
   keeps the UI from offering a leave type that doesn't exist. **INV-95 stays
   satisfied** — it requires `TIME_OFF_TYPES` to be a *superset* of the select
   options, so dropping a select option is safe; `Sick Leave` may remain in
   `TIME_OFF_TYPES`.
3. **Deliberately NOT in scope (separate cleanup if ever wanted):** ripping out
   the backend `bucket:'sick'` deduction + reconciliation + roster column J. That
   is a data-model change touching pinned reconciliation invariants and existing
   historical rows; leaving it dormant is harmless once no UI can create a sick
   request. **Recommend leaving the backend dormant** rather than risking the
   reconciliation invariants in a design pass. Note it in CLAUDE.md as
   intentionally-dormant.

> Net: after this work, no rep-facing surface mentions Sick, and no new sick
> requests can be filed; legacy sick balances/rows remain readable but inert.

### C2 — Clock "call-volume histogram" → **re-source from logged note volume (live), not CDR.**
The histogram-behind-the-ribbon cannot use CDR (per-(agent,date) only, and stale
to the previous workday — confirmed: no hourly CDR exists anywhere). **Operator
decision: base it on the count of notes logged in the web app instead.**

**Resolution / approach:**
- Source = the rep's **own notes for today**, bucketed by **hour** onto the
  6a–10p ribbon axis. `getMyCallNotes` (caller-scoped) returns today's notes and
  each note carries a `timestamp` (`callNoteRowToObject_`), so hourly bucketing
  is straightforward and **live** (notes are logged in real time).
- Bucket by the **rep's roster tz hour** (the `empTz`/`isoDateTz` discipline used
  elsewhere), not browser-local.
- Relabel the legend "Note volume" (not "Call volume").
- The Clock view already fetches `getMyMetrics(today)` (cached in
  `CLK_COVERAGE_CACHE`) for the coverage strip; add a light parallel fetch of
  today's notes for the buckets (or reuse if Call Notes state is already warm).
  Keep it best-effort: histogram absent on fetch failure, ribbon still renders.
- If the rep had zero notes today, render no histogram (same empty posture as the
  coverage strip).

### C3 — Call Notes Search: add Phone + TRX field tabs — **server change, bundled.**
`searchMyCallNotes` / `managerSearchCallNotes` only support `field ∈
{all, caller, issue}` (INV-45); `caller` folds in callback+patientAndTrx.
**Operator decision: implement the small server change with the Search restyle.**

**Resolution:**
- Extend both endpoints: `field==='phone'` → match `callback` only;
  `field==='trx'` → match `patientAndTrx` only. Keep `caller`/`issue`/`all` intact.
- Update **INV-45** wording and add/adjust a test in the Apps Script suite
  (`Tests.js`) so the new scopes are pinned.
- Bring rep Search and manager Search to parity (both get the new tabs).

### C4 — Metrics rail-row sparklines — **build where data exists.**
`data.trend` carries per-day `{pctAnswered, answered, missed}`; `attSeconds` is in
`data.series.attSeconds.own`; Notes-filed + Total-Talk have no per-day series.
**Resolution (agreed):** sparkline on **Answered** (`trend.answered`), **Missed**
(`trend.missed`, stroke `--warn`), and **Avg Talk** (`series.attSeconds.own`).
Leave **Notes filed** and **Total Talk** as plain values (no fabricated series).

### C5 — Metrics tri-tone token convention — **unify on the deep tones.**
Thresholds from `mCoverageBadge_` (≥80 / ≥50) are correct. The existing
`.m-coverage` badge uses flat `--good`/`--warn`/`--danger`; the handoff's new %
cells want `--success-deep`/`--warning-deep`/`--danger-deep`.
**Resolution (agreed):** adopt the **deep** tones for the new `% Answered` cells
**and** update `.m-coverage` to match, so the redesign leaves one coverage color
system, not two.

### C6 — `icons_snippet.md` "old key" column is slightly wrong (cosmetic).
Actual current keys: **PPD `list`, PMD `user`, PAP `user`, Sent `send`** (the doc
says PPD `send` / Sent `list`). The new target keys are unaffected — just update
all four references in the `script_core.html` TOOLS registry to the new keys.

### C7 — Call Notes exact-TRX search badge tone mismatch — **fix.**
`script_callnotes.html:5437` pairs `--accent-soft` (green) bg with `--info-deep`
(blue) text. **Resolution (agreed):** pick one tone — use
`--accent-soft`/`--success-deep` (green family) to match the action/flag vocab.

---

# Verified-accurate (clean to build to spec)
- **Token hygiene:** `--accent-deep` is undefined (falls back to flat `--accent`);
  `--success-deep` is the real token. 7 usages to fix:
  `train/script_training.html` (`.tr-chip.done`, `.tr-complete-btn`,
  `.tr-cell-done`, `.tr-q.right .tr-q-verdict`, `.tr-score.pass .big`),
  `train/script_empdocs.html` (`.ed-verify .ok`), `kb/script_kb.html`
  (`.kb-item.on`). Also drop hardcoded `--danger-soft,#fce5e5` /
  `--warning-soft,…` fallbacks in favor of `--destructive-soft` / `--warn-soft`.
- **Intake:** fully bespoke (`.intk-*`, `.intk-head` `var(--brand,#223b5d)`,
  `.intk-btn`, `.intk-lang`); PPD = 45 identical text inputs keyed by
  `data-intk-qnum` (collected by `intakeCollectPpd_`); `INTAKE_PMD_CLIENT.headers`
  / `INTAKE_PAP_CLIENT.headers` exist for panel grouping; dropzone + 12-cap exist;
  Sent has no filter; no draft autosave exists.
- **Icons:** the 5 new glyphs don't exist yet; `kbItemIcon_` returns `'list'` for
  articles.
- **Training:** `TRAIN_STATE` + done/pending/overdue chips exist; **no** ring;
  `tr-table` is the wide scrolling matrix.
- **KB:** departments static (no chevron/count); empty state "Select an item…";
  `kbLoadReviewDueBlock_`, `kbRecordView`, `kbLoadUsageBlock_` all exist.
- **Clock:** `live-time`, `clkBuildRegionFmts_`, 1Hz `startClock` exist; **no**
  sky gradient / tz selector; ribbon has band/segments/punches/now-cursor but
  **no** break bands; actions render **above** the ribbon; breaks exist as a chip;
  teammate card is full-width at bottom.
- **Coverage:** stacked per-day cards, 24-col `cov-strip`, thresholds
  `ok`/`risk`/`low`/`none`, `minStaff` default 2, `ptoType` available in
  `day.reps`.
- **Metrics:** My Stats = date input only; Team has range + `.m-preset-chip`;
  `mRailRow_` no sparkline; `.m-table th` `cursor:default`, no sticky header.
- **Call Notes:** Search uses inline `.cn-search-result-card` (not
  `cnRenderCardCore_`); `cnMgrRenderStats_` = stacked per-rep cards;
  Admin = one scroll of ~5 loaders (`cnLoadAdminAugment_`, `cnLoadTagTrends_`,
  `cnLoadAuditPanel_`, `cnLoadHealthPanel_`, `cnLoadStoragePanel_`) + config body,
  no sub-tabs.

---

# Accepted improvements (fold into the relevant commits)
1. **Shared table component** for the Metrics team table + Call Notes manager
   Stats table — define once (shared partial / `script_core`), consume in both, to
   avoid parallel-source drift. (Lands with the Call Notes Stats commit.)
2. **Node tripwire for undefined-token usage** — grep `var(--…-deep`/`--accent-deep`
   etc. against the defined token set in `styles_design_tokens.html`; fail CI on an
   undefined token. (Lands with the token-hygiene foundation commit.)
3. **Intake a11y as real radio groups** — the new Yes/No + severity-scale chips
   get `role="radiogroup"`/`role="radio"`, arrow-key nav, and `name` grouping, not
   just clickable divs + `for`/`id`. (Lands with the Intake commit.)
4. **Gradient/tz-selector cost discipline** — precompute the sky gradient per hour
   (recompute only on hour change), reuse the existing `startClock` tick (no second
   interval, INV-73), validate selectable zones. (Lands with the Clock commit.)
5. **Coverage-color unification** — done via C5 (one coverage color system).

---

# Commit sequencing
Land as **separate commits** (icons+tokens first as the safe foundation, then one
module at a time). Each module commit needs an operator `clasp push -f` + New
deployment version + an editor `runSmokeTests`/`runAllTests` pass to verify.

| # | Commit | Files | Notes |
|---|--------|-------|-------|
| 1 | **Foundation: icons + token hygiene + token tripwire** | `script_icons.html`, `script_core.html` (tab icons), `kb/script_kb.html` (article icon), `train/script_training.html`, `train/script_empdocs.html`, `styles_design_tokens.html` (verify), `test/client/*` (tripwire) | Lowest risk; unblocks all modules. Improvement #2. |
| 2 | **Intake redesign** | `intake/script_intake.html` | Shell→shared `.app-bar`/`.tt-btn`/`.toolbar-tabs`; PPD Option A controls + progress header + draft autosave; PMD/PAP panels; Sent filter/search. Improvement #3. Preserve payload shape + PHI-drop. |
| 3 | **Training redesign** | `train/script_training.html` (+ chip reuse in `script_empdocs.html`) | Completion ring + checklist rows; manager matrix → CSS grid + coverage %. |
| 4 | **Reference/KB redesign** | `kb/script_kb.html` | Collapsible depts (persisted), item icons, `.kb-btn`→tokens, landing panel (recent/most-used/review-due). Leave reader/search/drawer. |
| 5 | **Time Clock redesign** | `tc/script_clock.html`, `tc/script_manager.html`, `modals.html` (drop Sick option), `Code.js` (if note-bucket helper added) | Sky gradient + tz selector; ribbon absorbs hours/state/break-bands/lunch-color + punch buttons under it; **note-volume histogram (C2)**; one-row Punches·Team·PTO **Annual-only (C1)**; Coverage heatmap + risk callout. Improvement #4. |
| 6 | **Metrics refinements** | `metrics/script_metrics.html`, `styles.html` | My Stats presets; rail sparklines (C4); sortable+sticky team table; tri-tone % cells + unified coverage tone (C5). |
| 7 | **Call Notes: Search + Stats + Admin** | `cn/script_callnotes.html`, `Code.js` (Phone/TRX field scopes C3), `Tests.js` (INV-45), `script_core.html`/shared partial (shared table, improvement #1) | Search real cards + count + highlight + date filter + Phone/TRX tabs; Stats table (shared component); Admin sub-tabs Overview/Tags/Compliance/Config; exact-badge tone (C7). |

---

# CLAUDE.md / invariant touch-ups to make as work lands
- **INV-45 / INV-27 / S15:** update for Phase/TRX search scopes (C3) and Sick
  removal (C1) — note Sick backend is intentionally dormant, no rep-facing surface.
- New **token-undefined tripwire** noted under Test Coverage.
- Clock §5a CLAUDE.md decisions: note the **note-volume** (not CDR) histogram
  source and that reminders/histogram are in-tab only (no background push).
- New shared Metrics/Stats table component noted under Key Design Decisions
  (single-source-of-truth, anti-drift).
