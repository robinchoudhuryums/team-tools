---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: FO-ADMIN | The Admin sub-tabs were the matrix's last wide-only surface (a Visual Audit Stage gap carried since 2026-08-11)
Files modified: test/visual/shoot.mjs, test/visual/mock.js, test/client/run.js, web-app/cn/script_callnotes.html, CLAUDE.md, .cycle/STATE.md, .cycle/blocks/19pre-admin-subtabs-broad-implement.md

CHANGES:
FO-ADMIN (coverage) | test/visual/shoot.mjs | Five mobile scenarios, one per Admin pane (overview / tags / compliance / config / sheets) — 62 → 67. Overview is the landing pane; the other four switch via the `post` hook (the sched-modal precedent).

FO-ADMIN (fixture) | test/visual/mock.js | New `getAdminSheetView` fixture. The Sheets pane had NONE at any viewport, so its scenario rendered a loader and its "0 overflow" meant nothing. It is a FUNCTION of `viewKey` (INV-185's F14 rule — the key decides label, columns, rows and legend, so a frozen object would show AuditLog rows under whichever label the picker last selected). Field names mirror `adminSheetView_auditLog_` / `adminSheetViewBuild_`'s return sites; the rows cover all four row tones plus the neutral default.

FO-ADMIN (pin) | test/client/run.js | VIS-ADMIN — DERIVES the Admin pane set from the client's own `tab('key','Label')` call sites (INV-179) and requires a mobile scenario per pane, so a sixth pane owes one the day it lands. It also pins the stacked form: header hidden, row still stacking, head-and-row NOT sharing the rule, both numeric labels present, and the delta label as the literal character. Comment-stripped per INV-188 — the rule's own comment quotes the shape it replaced.

FO-ADMIN (the defect the coverage found) | web-app/cn/script_callnotes.html | At ≤720px the breakpoint applied one rule to `.cn-tax-head` and `.cn-tax-row` together, so BOTH collapsed to one column. Stacking the ROW is right — it becomes a card. Stacking the HEADER is not: six column labels ended up in a column above the first row, aligned with nothing, with the first row's usage bar rendering over the word "Usage". The header now hides when the row stacks; the two bare numeric cells carry their own label; the sparkline is capped at 140px (`preserveAspectRatio="none"` + `width:100%` stretched a 120×22 glance cell across the whole row). The delta label is the LITERAL `Δ`, not a hex escape — CSS consumes the space after a hex escape as its terminator, so `'\0394 wk'` renders as the joined-up "Δwk".

TEST RESULTS: passed. Pure 712/0 (was 711 — VIS-ADMIN added), DOM 101/0, `node --check` clean. Visual matrix 67/67 — 0 overflow, 0 missing fixtures. 7 mutations bite-checked, 7 bites.

Regression Scenarios walked (Test Command is `manual`; the CSS change is scoped to `.cn-tax-*` classes that only the Admin Tags table emits, and only below 720px — verified: 44 `cn-tax-` occurrences, all in one file):
- S51 (Admin tab augment — KPIs + tag taxonomy) — PASS. Wide render byte-identical (re-shot `admin-light-wide`); mobile now renders one self-describing card per tag.
- S53 (tag taxonomy admin actions — rename / merge / archive) — PASS. The `.cn-tax-act` buttons and their `data-tag` delegation are untouched; the stacked form left-aligns the action row, which it already did.
- S57 (compliance audit panel) — PASS at mobile, newly on camera; the filter stack and Search button render correctly.
- Every other Client (Call Notes views) scenario — NOT APPLICABLE: no markup, no JS and no shared CSS changed; the only rules touched are inside an existing `@media (max-width: 720px)` block and scoped to classes one table emits.

REGRESSION RISKS: None identified. The CSS additions live inside the existing 720px media block, so no wide layout can move; confirmed by re-shooting. The fixture is additive (a previously-absent RPC). VIS-ADMIN reads source only.

INVARIANTS AT RISK: None. The fix is INV-184's spirit applied to layout (a header describing columns that no longer exist is a false lead); the pin is INV-179 (derive the scan set) and INV-185 (a fixture whose shape depends on its arguments is a function of them); the ban scan is comment-stripped per INV-188.

NET SCORE: 1 − 0 = 1
(The stacked header fired for any manager opening Admin → Tags at a phone or narrow-window width — a real, visible defect, though on a low-traffic surface. The coverage and the pin are Test Coverage Quality work, not production fixes, and are not counted.)

OPERATOR ACTIONS / DEPLOY:
- None. No properties, triggers, migrations or CONFIG values. | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` + Deploy → Manage deployments → New version. Ships with the existing backlog; nothing here changes the post-deploy expectations (`runAllTests()` still 305).

FOLLOW-ON ITEMS:
- Most modal/overlay states remain uncovered by the matrix (the sched modal, the Reference reader and the Day Edit modal have `post` scenarios; the rest do not). The same "hidden behind a covered parent" reasoning applies — a modal is not tab-shaped, so neither VIS-COVER nor VIS-ADMIN can see it.
- The Admin sub-tab strip scrolls internally at 390px with no visual affordance that it does (the 2026-08-11 `.toolbar-tabs` fix, working as designed). Reaching "Sheets" on a phone requires discovering the horizontal scroll. Not fixed here — it is an operator design call, not a structural defect.

DOCUMENTATION UPDATES NEEDED:
- Done in this PR: the Visual Audit Stage's gap prose (the Admin mobile gap marked CLOSED, with the structural lesson about tab-granularity coverage), the VIS-ADMIN entry in the test-count history, and the STATE.md counts (pure 712, matrix 67).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
