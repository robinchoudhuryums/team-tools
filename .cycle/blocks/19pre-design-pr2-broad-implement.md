---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: design handoff PR 2 — the Admin surface (plan §4 PR 2: A1–A6 + X7):
  A1 app-bar chrome (Manage › Admin breadcrumb, display title, subtitle);
  A2 a SYSTEM sub-tab (six tabs: Overview / System / Tags / Compliance / Config / Sheets) — the
     "System details" disclosure on Overview retired; the three Overview status cards are real
     <button>s linking into the System tab's matching section;
  A3 findings-first System tab — ONE pure derivation `cnHealthFindings_(health, storage)` feeds the
     "Needs attention" list, the three cards AND the tab badge (INV-186 severity rule in code:
     non-ok only on counts that are zero when healthy; raw CDR lists / no-fallback unset stores
     ride ok-with-detail; a failed load is a `fail` finding + `degraded` marker);
  A4 the Storage inventory as a real table (`mtRenderTable_`, V-11) with an INV-182 detail row
     per store (note / per-rep problems / the tz fix) behind a real disclosure button;
  A5 Automation Health demoted to "Automation detail" — reference behind the findings;
  A6 every card/badge carries a text equivalent (aria-label); severity in words (Blocking/Warning);
  X7 the four Admin loaders (deploy readiness, sheets, storage, health) render `errorStateHtml_`
     on failure and the storage/health failures become findings, never "All OK".
Files modified: web-app/cn/script_callnotes.html, test/client/run.js, test/visual/mock.js,
  test/visual/shoot.mjs, CLAUDE.md, .cycle/STATE.md, .cycle/blocks/ (this file + the PR 1 block)

CHANGES:
A1/A2 | cn/script_callnotes.html | `enterCallNotesAdminView` chrome + six `tab()` calls; System pane (`#cn-sys-findings` → `#cn-admin-storage` → `#cn-admin-health`); `cnAdminTab_(key, anchorId?)`; `cnSysCardShell_`/`cnSetSysCard_` as buttons; `cnSetSysBadge_`
A3 | cn/script_callnotes.html | `cnHealthFindings_`, `cnFindingsWorst_`, `cnRenderSystemFindings_`; `cnSetSysFromHealth_` + `cnToggleSysDetails_` retired (banned)
A4 | cn/script_callnotes.html | `cnRenderStoragePanel_` on `mtRenderTable_` + `cnToggleDetailRow_`; `.cn-storage-row/-main/-role/-meta` retired (banned); `.cn-store-ret` wraps the retention sentence (measured: the QA row pushed the Link column off-canvas at 1440px)
A5 | cn/script_callnotes.html | `cnRenderHealthPanel_` heading "Automation detail", `secLabel(txt, id)` anchors `cn-sys-sec-cdr`
X7 | cn/script_callnotes.html | both loaders record `{error}` in `CN_STATE.adminHealth/adminStorage`, render `errorStateHtml_`, re-derive; deploy-readiness + sheet-view loaders too
tests | test/client/run.js | INV-186 card pin rewritten onto `cnHealthFindings_` (behavioural: 78 off-roster agents raise nothing); PR2-1..PR2-4 added → 722
fixtures | test/visual/mock.js, shoot.mjs | `EMPTY_FIXTURES.getAutomationHealth/getStorageHealth` all-clear shapes; 5 scenarios (`admin-system-{light-wide,dark-wide,light-mobile,allclear-light-wide,error-light-wide}`) → 72

TEST RESULTS: pure 722/0, DOM 101/0; 11/11 mutations bite (9 + the 2 measured-CSS pins).
  Visual: 8 Admin scenarios shot — 0 missing, 0 overflow at 390/1440; eyeballed light/dark/mobile/
  all-clear/error. Two defects found by MEASURING the first shot and fixed: the count pill
  stretched to a bar (`.card-label > span:first-child { flex:1 }` — the pill was that span) and
  the Link column left the canvas (nowrap td + a sentence-long retention cell). Editor suite: not
  run (NO server change — the payloads are read as before; fixture-key derivation pin unchanged).
REGRESSION RISKS: `cnAdminTab_` gained an optional 2nd arg — every existing 1-arg caller is
  unchanged. `CN_STATE.adminTab` may hold 'system' from a prior session? No — it is not
  persisted to localStorage (in-memory), so no stale key. Detail rows depend on `.m-qtoggle`
  CSS living in the metrics partial (global CSS on the one page — same dependency the Team
  Metrics disclosure already has).
INVARIANTS AT RISK: INV-186 (amended — the client half is now the findings severity rule, pinned);
  INV-187 (failed loads are findings — pinned); INV-184 (retired selectors/derivations banned);
  INV-173/174/182 (buttons, aria-expanded, detailRow contract — pinned). None violated.
NET SCORE: 2 − 0 = +2 (X7: a failed health read rendered as a muted line + a stale/absent card
  tone on the live Admin tab; A3: the Storage card toned "warn" on the by-design-unset QA/HR/
  External stores through `!s.configured` in the old card derivation — a permanently-amber
  indicator, the INV-186 class. The rest is structural.)

OPERATOR ACTIONS / DEPLOY:
- None | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f` + New version (ships with PRs 1, 3–6 on one deploy).

FOLLOW-ON ITEMS:
- Dark mode: the Automation-detail "Open AuditLog ↗" float-right link renders in the default
  link blue at low contrast against the dark card (pre-existing inline style; seen on the
  admin-system-dark-wide shot). Token it (`--info-deep`) in a later polish pass.
- `.day-section-label` headings (Automation detail) are `<div>`s — outside A13's derived class
  set by name; consider promoting the class to the heading set.
- Automation detail still repeats per-section warn boxes the findings list already states —
  acceptable as reference; a later pass could strip them to facts.

DOCUMENTATION UPDATES NEEDED:
- Done in-PR: Admin KDD rewritten (six tabs, System findings-first, one derivation), Storage /
  Automation panel entries, INV-186 amendment, count chain (722 / 72), operator-state entry, S97.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
