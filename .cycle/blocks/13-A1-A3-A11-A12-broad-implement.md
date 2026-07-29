---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- A1 | Six click-only controls (span/div + inline onclick) converted to <button type="button">
- A2 | `:root[data-compact]` used as if it were a viewport breakpoint — real media queries added for .m-layout / .telemetry / .coach-kpis
- A3 | timeToMins_ returned NaN on an unparseable time cell — now returns null, with all four callers guarded
- A11 | Active/selected state on both nav levels + segmented toggles was a CSS class only — aria-current / aria-pressed / aria-selected / aria-expanded added
- A12 | Load failures rendered into the empty-state vocabulary in Metrics / Training / EmpDocs — routed through errorStateHtml_

Files modified:
- web-app/Code.js
- web-app/Tests.js
- web-app/script_core.html
- web-app/styles.html
- web-app/metrics/script_metrics.html
- web-app/tc/script_clock.html
- web-app/tc/script_manager.html
- web-app/cn/script_callnotes.html
- web-app/intake/script_intake.html
- web-app/train/script_coaching.html
- web-app/train/script_training.html
- web-app/train/script_empdocs.html
- test/client/run.js

CHANGES:

A1 | metrics/script_metrics.html, tc/script_clock.html, tc/script_manager.html, intake/script_intake.html, cn/script_callnotes.html |
  All six click-only controls are now <button type="button"> with a CSS reset
  (appearance/background/border/padding/font) that keeps each pixel-identical to
  the span/div it replaced. Converted: the 4 Metrics preset chips
  (.m-preset-chip), the Dashboard period switcher (.dash-seg-opt), the Coverage
  day disclosure (.cov-day-lbl), the Intake PPD preferred-device star
  (.intk-rec .star), the Intake image-remove × (.intk-thumb .rm), and the CN
  Training-Answers disclosure (.cn-qa-label). The Intake star was the worst of
  the six — it marks the device starred in the clinical email actually sent, and
  had no alternative path. `font: inherit` is placed BEFORE `font-size` where
  both are set, since the shorthand resets it.

A2 | metrics/script_metrics.html, styles.html, train/script_coaching.html |
  Added real viewport media queries: `.m-layout` stacks at ≤720px (Metrics had
  ZERO media queries; its 1.4fr/1fr grid with a 42px hero numeral never stacked
  on a phone, and My Stats is rep-facing); the shared `.telemetry` strip goes
  2×2 at ≤540px with the matching border fixes; `.coach-kpis` goes 2×2 at
  ≤540px. Each already had a `:root[data-compact]` override, which is the
  POP-OUT trigger, not a viewport one. Compact rules are (0,2,0) and still
  out-specify the media rules, so pop-out layout is unchanged.

A3 | Code.js |
  `timeToMins_` returns null instead of NaN for an unparseable time, guarding
  BOTH rejection paths (no colon, and a colon with non-numeric parts).
  `calcHours_` returns null when the CLOCK pair is corrupt, but a corrupt LUNCH
  pair only drops the deduction (matching the "no lunch recorded" shape) rather
  than voiding an otherwise-valid day. All four callers updated:
    • getPunctualityReport — `continue`s on null. Previously NaN never lost the
      earliest-punch race (so one bad row pinned the whole day) AND fell through
      `lateMin > grace` into the else, scoring the day ON TIME.
    • buildTimesheetForEmployee_ — a null day is INCOMPLETE, not `totalHours +=
      NaN` (which turned a whole timesheet total into NaN off one cell).
    • getManagerDashboard sparkline + buildCalendarForEmployee_ — omit the day.
    • getCoveragePlan — EXPLICIT null guard. `dayDelta * 1440 + null` coerces to
      0 and would have placed the shift at midnight — strictly worse than the
      old NaN, which merely dropped the rep from the buckets. Found while
      enumerating callers; pinned.

A11 | script_core.html, tc/script_clock.html, tc/script_manager.html, train/script_coaching.html, cn/script_callnotes.html |
  Active state is now exposed, not just painted. `aria-current="page"` on the
  sidebar/mobile-nav tool buttons and on the tab-bar sub-tab buttons (both were
  class-only, so a screen reader was never told which tool or tab was active);
  `aria-pressed` on the Dashboard period switcher, kept in step by clkDashSet_;
  `role="tab"` + `aria-selected` + `aria-controls` on the Coaching Mine/Team
  toggle (whose wrapper already declared role="tablist" but whose tabs carried
  no role at all) with a matching role="tabpanel"; `aria-expanded`/`aria-controls`
  on the Coverage day and CN Training-Answers disclosures, both kept in step by
  their handlers. The CN Training-Answers inline
  `this.parentElement.classList.toggle('collapsed')` was extracted to
  `cnToggleQaTray_` so the attribute cannot go stale.
  CORRECTION to the scan: the CN composer tabs (`cn-composer-tab`) were listed
  in A11 but ALREADY had role="tab" + aria-selected. Only the missing
  `aria-disabled` on the disabled Department tab was added.

A12 | metrics/script_metrics.html, train/script_training.html, train/script_empdocs.html |
  Every load-failure path now renders `errorStateHtml_` (warn-toned card + glyph
  + role="alert") instead of the tool-local EMPTY-STATE container. 16 sites
  across three partials: `.m-empty` and `.no-data` in Metrics (RPC failures AND
  server-returned `data.error`), `.tr-empty` in Training and EmpDocs. This is
  batch J's documented decision ("a LOAD FAILURE must render errorStateHtml_ so
  'the fetch failed' never reads as 'there's nothing here'"), previously applied
  only in Call Notes and Clock — errorStateHtml_ was used in 2 of 11 tool
  partials. The redundant outer `esc()` was removed at each site because
  errorStateHtml_ escapes internally (keeping it would double-escape).

Tests | test/client/run.js, Tests.js |
  6 new pure-harness pins (356 → 362), ALL bite-checked, plus one editor smoke
  test (`timeToMins_nullOnUnparseable`). Two pins did not bite on the first
  attempt and were tightened: the A1 scan was per-line and my own multi-line
  markup escaped it (now scans whole source, `[^>]` matches newlines); the A3
  input list had only no-colon cases, all caught by the length guard, so it
  passed with the isNaN guard deleted (added 'ab:cd', ':', 'x:30', '09:mm').

TEST RESULTS: PASSED.
  node --check × 3 (Code.js / Tests.js / DevTools.js): OK
  Pure harness: 362 passed, 0 failed (was 356)
  DOM harness:  66 passed, 0 failed
  Visual harness (manual, run because CSS changed): 20/20 scenarios, 0 missing
    fixtures. The 20 console errors are net::ERR_CONNECTION_RESET on external
    resource fetches (sandbox network) — environmental, pre-existing, unrelated.
  Regression Scenarios (Test Command = manual): no FAILs. S16 / S25 / S35 / S39 /
    S50 / S72 verified statically or via the visual harness; S3 / S8 / S59 / S60 /
    S67 / S68 / S69 NOT APPLICABLE (need a live deploy; the changed code paths in
    them are markup/failure-state only). S43 (CDR unavailable) is the one scenario
    whose EXPECTED OUTPUT changed, deliberately — that is A12.

REGRESSION RISKS:
  - getCoveragePlan null-coercion (`x + null` → x): identified during the caller
    sweep, guarded explicitly, and pinned. Without the guard A3 would have been a
    net regression on INV-127.
  - buildTimesheetForEmployee_ now counts an unparseable day as INCOMPLETE rather
    than adding NaN. Deliberate: the alternative (treating it as 0 hours) would
    understate payroll silently.
  - `_assertEq` in Tests.js compares via JSON.stringify, and JSON.stringify(NaN)
    is "null" — so an `_assertEq(x, null)` test is blind to a NaN regression. My
    editor test uses strict `=== null` via _assertTrue. NOTE this hole exists for
    any future null-vs-NaN assertion in the editor suite.
  - None found for: errorStateHtml_ availability (global, loaded in both
    harnesses and the shell), double-escaping, compact-vs-media specificity, or
    HtmlService scriptlet delimiters in added comments (grepped).

INVARIANTS AT RISK:
  - INV-127 (Coverage planner) — at risk from A3's null coercion; guarded + pinned.
  - INV-89 / the Metrics-esc() gotcha — upheld; errorStateHtml_ escapes internally.
  - INV-128 (design-token hygiene) — upheld; no new var(--token) references.
  - No lock, gate, endpoint signature, or PHI-boundary invariant was touched.

NET SCORE: 4 production fixes − 0 new failure modes = 4
  (A1, A2, A11, A12 would have fired in production this month. A3 is counted
  honestly as NOT a this-month production fix — it needs a hand-edited or
  corrupt Timesheet TIME cell.)

OPERATOR ACTIONS / DEPLOY:
- None new. This batch adds NO Script Properties, triggers, or migrations. | BLOCKS DEPLOY: N
- CARRIED FROM CYCLE 12 — the cycle-12 deploy is still UNCONFIRMED and now also
  carries this batch. | BLOCKS DEPLOY: N (but it is the gate on all of it reaching users)
Deploy:
  Server + all Client subsystems + Test Suite (one command ships them all):
    cd web-app && clasp push -f
  then Apps Script editor → Deploy → Manage deployments → Edit → Version:
  **New version** → Deploy.
  Post-deploy: run `runAllTests()` in the editor — the new
  `timeToMins_nullOnUnparseable` smoke test runs only there, alongside cycle 12's
  still-unrun `cn_enrolledSheetId_trimsAndNullGuards` and
  `cn_appendBounded_capsAndRollsBack`.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- A11 correction: the CN composer tabs already carried role="tab" + aria-selected;
  the scan over-claimed. Only aria-disabled was missing. Recorded here so the
  finding record stays accurate.
- Noticed while rendering the visual matrix, NOT fixed (out of scope):
  • "Generate ADP Export" on the Manager Dashboard is still a near-black full-width
    bar. V-8 (cycle 12) fixed the shared modal primary `.btn-modal-ok` for exactly
    this reason ("near-black on the money-facing export"); this on-page button is a
    different class and was not covered.
  • In the Clock shift-strip, "5h 54m worked · 32m lunch" appears to overflow /
    overlap the "File 6 missing" chip at wide width. Pre-existing; not touched by
    this batch.
- Still open from the scan and NOT implemented here: A4 (dead
  countCallNotesInRange_ + doc drift), A5 (nightly self-test dev-detection fails
  open), A6 (kbReloadTree_ swallows both failure paths), A7 (export bails before
  the archive read-through), A8 (getUpcomingAnnualPlanned_ returns 0 on error),
  A9 (false hitPerRunCap), A10 (four store reads inside the global lock), A13 (no
  heading outline below h1).

DOCUMENTATION UPDATES NEEDED:
- CLAUDE.md Common Gotchas — ADD: `:root[data-compact]` is the POP-OUT, not a
  viewport breakpoint; a grid that stacks in compact needs a real media query too.
- CLAUDE.md Common Gotchas — ADD: `timeToMins_` returns null (never NaN); any new
  caller must guard, and arithmetic callers must guard EXPLICITLY because
  `x + null` coerces to x.
- CLAUDE.md Key Design Decisions (loader/motion + empty-vs-ERROR states) — UPDATE:
  errorStateHtml_ is now used across Metrics / Training / EmpDocs, not only
  CN + Clock, and is pinned by a tripwire banning failure renders into
  .m-empty / .no-data / .tr-empty.
- CLAUDE.md Test Suite section — UPDATE counts: pure 356 → 362, editor ≈301 → ≈302.
- CLAUDE.md — CORRECT the A4 drift found in the scan but NOT fixed here: the F5
  gotcha claims countCallNotesInRange_ is "kept for the callers that only want the
  number"; it has no production callers.
- Proposed invariants (for the next /reflect): INV-173 (every interactive control
  is a real button/link — no span/div + inline onclick), INV-174 (active state is
  exposed via aria-current/-pressed/-selected, never a class alone), INV-175
  (load failures render errorStateHtml_, never an empty-state container),
  INV-176 (timeToMins_/calcHours_ return null, never NaN).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
