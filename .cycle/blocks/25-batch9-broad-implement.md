---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- F25 (Medium) — the `docs/operator-state.md` entries for `MANAGER_EMAILS` and `ADMIN_EMAILS` described gates that do not exist (a `getAdminEmails_()`, a fallback to `MANAGER_EMAILS`, "no one passes isManager without it")
- F26 (Medium) — `PROJECT_HEALTH.md` Current Standing said Cycle 21, Score History lacked 21post–24, and the labels `/cycle-init` says portfolio tooling parses were absent
- F27 (Medium) — README: Reference images "to Drive" (now the KbImages tab), "managers edit inline" (KB authoring is admin-only), quizzes allow "unlimited retries" (now three tries, then a wait or a reset)
- F64 (Low) — `.cycle/config.md` S2 said "(316 today)" against 351 in the block; the C4 doc ban could not match the shape
- F28 (Medium) — a bare `./make_all.sh` aborted: `validate_render.py` and `check_svg_fit.py` built `file://dist/…`, which Chromium rejects
- F29 (Medium) — the handbook's Python build never ran in CI, so a broken `[[§…]]` reference passed CI
- F65 (Low) — the M3-D1 diagram staleness pin hashed only the generated SVGs, not their sources or the export transform
- F66 (Low) — `check_pdf.py` and `validate_render.py`'s print check "skipped" with exit 0 when a tool was missing; `export_reference.py`'s docstring still said the Drive images folder
- F69 (Low) — the visual harness measured only sideways overflow, so F67's vertical runaway (and F68's squeezed text column) could not be seen
New capabilities (G/ST): None
Files modified: docs/operator-state.md, PROJECT_HEALTH.md, README.md, .cycle/config.md, manual/validate_render.py, manual/check_svg_fit.py, manual/check_pdf.py, manual/make_all.sh, manual/export_reference.py, .github/workflows/client-tests.yml, test/visual/shoot.mjs, test/visual/README.md, test/client/run.js, CLAUDE.md, docs/gotchas.md, .cycle/STATE.md
Estimate: L (~9 h, the plan's figure) — written before the first edit (STATE.md Estimates line, 2026-10-15)
Actual: ~3 h

CHANGES:
F25 | docs/operator-state.md | `MANAGER_EMAILS`: says it is NOT the in-app manager gate (that is roster column G via `getEmployeeInfo_`), and what it does do — gates the trigger handlers and `installAutomationTriggers` (`assertManagerCaller_`), receives every manager email, and feeds the managerSource drift detector. `ADMIN_EMAILS`: read by `empIsAdmin_` (no `getAdminEmails_`); unset makes every ROSTER manager an admin; set narrows to listed addresses that are also roster managers. Both carry a "corrected cycle 25 F25" note
F26 | PROJECT_HEALTH.md | a new Current Standing: Cycle 25 OPEN with the scan's own scores — `Overall (weighted avg): 7.5`, `Top vertical priority:` Code Clarity & Docs (6.5, tied with Automation Reliability), `Top horizontal priority:` Operator-Only State Gaps — the per-dimension table, the batch status, and the last closed cycle (24, net 0). The cycle-21 standing moved under "Prior standing (Cycle 21 close)". Score History gained 21post, 22, 22post, 23 and 24 rows from `metrics.csv` and the reflect blocks
F27 | README.md | Reference: article images in the KbImages tab, not Drive; admins author, managers re-confirm from Review due, reps read. Training: three failed attempts, then a 24-hour wait or a manager's reset
F64 | .cycle/config.md | S2's "(316 today)" now points at the running-totals block
F64 | test/client/run.js | the C4 doc ban gains (e): "(N today)" anywhere in a live doc
F28 | manual/validate_render.py, manual/check_svg_fit.py | the argument is `pathlib.Path(…).resolve()` and the page opens `.as_uri()` — a relative `./dist` path now works (the old code failed with `net::ERR_INVALID_URL`, reproduced)
F66 | manual/check_pdf.py | a missing pdftotext prints NOT RUN and exits 3, never 0
F66 | manual/validate_render.py | the print check is skipped only when `pdfinfo` is missing (exit 3 if nothing else failed); any other exception in it is now an ERROR, not "skipped"
F66 | manual/make_all.sh | `check()` runs both: 0 passes, 3 is collected, anything else fails; the run ends with "NOT CHECKED (a tool is missing): …", and `MANUAL_STRICT=1` fails on it
F66 | manual/export_reference.py | the docstring says images go to the ManualImages tab (M4-FU3)
F29 + F65 | .github/workflows/client-tests.yml | a Python 3.12 step installs `markdown==3.7` and runs the browser-free half of make_all.sh — roles/footnotes self-tests, both diagram generators, build.py (exit 1 on an UNRESOLVABLE REF), make_html.py, validate_html.py, export_reference.py — then `git diff --exit-code -- manual/diagrams web-app/kb/script_manual_diagrams.html`, so a stale diagram or partial from an edited generator or export transform fails CI
F65 | test/client/run.js | M3-D1's comment points at the CI step for what its hash cannot see
F69 | test/visual/shoot.mjs | every scenario reports `verticalRunawayPx` (document scroll height past the bottom of everything visibly laid out — boxes under 2px or clipped excluded, fixed chrome excluded) and `narrowText` (16+ characters of an element's own text under 48px, SVG labels excluded); the run prints VERTICAL RUNAWAY (over 200px) and SQUEEZED TEXT sections
F69 | test/visual/README.md, .cycle/config.md | both measurements documented (the Visual Audit Stage now names four machine checks)
Tests | test/client/run.js | new pins "F29 + F65 (cycle 25)" (the workflow's Python step, its commands, order, `set -e`, the pinned dependency, the diff, nothing browser-bound), "F28 + F66 (cycle 25)" (resolved URIs, no raw `"file://" +`, the exit-3 paths, `check()` and NOT CHECKED, the docstring), "F25 + F26 + F27 + F64 (cycle 25)" (the two gate entries against the real code, the three PROJECT_HEALTH labels, the standing naming STATE's cycle, every `metrics.csv` cycle in Score History, the README lines, no "(N today)"), "F69 (cycle 25)" (structural over shoot.mjs and its README); C4 extended
Bites | — | 13 Node mutations, all red: the workflow's diff line / build.py removed; check_pdf exit 0; validate_render's raw `"file://" +`; make_all without `check`; the Drive docstring back; README "unlimited retries"; a Score History row renamed; the `Overall (weighted avg):` label removed; ADMIN_EMAILS's MANAGER_EMAILS fallback back; "(351 today)" in the config (C4); shoot's SVG exclusion and clip exclusion removed. Outside Node: the CI step run end to end in a full copy of the tree (exit 0), then with one generator line edited (exit 1, 16 SVGs + the partial named); `build.py` with a `[[§99-99]]` (exit 1, "UNRESOLVABLE REF"); the old check_svg_fit.py on a relative path (`ERR_INVALID_URL`) vs the new (0 overflows); validate_render with no pdfinfo (exit 3); `make_all.sh`'s `check()` over exits 0, 3 and 1; and the F67 fix reverted for a matrix run — `reference-manual-light-wide` +1,189px and `reference-manual-part-light-wide` +5,437px VERTICAL RUNAWAY, restored after (no diff)
Docs | CLAUDE.md, docs/gotchas.md | g171 and g72 (F69) and g116 (F66 + F29) amended in both files; running totals updated

TEST RESULTS: passed — pure harness 1317/1317, DOM harness 252/252, `npm run lint:server` clean, `counts.mjs --check` clean, `split-manifest.mjs --check` current (1664 declarations, no server change). Full visual matrix (every scenario): 0 console errors (beyond the sandbox's fonts line), 0 horizontal overflow, 0 vertical runaway, and ONE squeezed-text finding — real, recorded as a follow-on below. The new CI step was run locally in a full copy (Python 3.13 here; CI pins 3.12) and passed. Test Command is `manual`: no web-app file changed, so no regression scenario is touched; S2's text changed only.
REGRESSION RISKS: (1) F29 — the new CI step needs Python and PyPI; a pip outage fails the job (it runs after the dependency-free floor and the jsdom steps, so those still report). A deliberate generator edit now needs its regenerated SVGs and partial committed in the same push, which is the intent. The handbook's `[PENDING]/[VERIFY]` markers are warnings in build.py, not errors, so CI does not fail on them. (2) F66 — `make_all.sh` still exits 0 on a missing tool unless `MANUAL_STRICT=1`; the operator's local build is unchanged except for the closing NOT CHECKED line. A real error inside the print check, which used to be swallowed as "skipped", now fails validate_render (correct, but a previously-green local build could go red). (3) F69 — the 48px / 16-character / 200px thresholds are judgment; the first full run had one true positive and two SVG false positives (now excluded).
INVARIANTS AT RISK: None — no web-app file changed. INV-185 (fixtures) untouched; the C4 ban (generated counts) widened, not narrowed; INV-188 (comment-stripped scans) not involved.
NET SCORE: 0 production fixes − 0 new failure modes = 0. Every item is docs, tooling or a test net; none changes what the deployed app does. F28 broke the operator's bare build command (a real, reproduced failure), but on a local tool, not production — scored defensive, as cycle 24 scored its tooling items.

OPERATOR ACTIONS / DEPLOY:
- None for the app — no `web-app/` file changed, so no clasp push or new version is needed | BLOCKS DEPLOY: N
- The first CI run of this push exercises the new handbook step; if it fails on a pip install, re-run once (a registry blip), otherwise read the named file | BLOCKS DEPLOY: N
- Optional: run `MANUAL_STRICT=1 ./make_all.sh` before a handbook release so a missing pdftotext/pdfinfo fails instead of passing quietly | BLOCKS DEPLOY: N
Deploy: N/A — no deployed file changed

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- NEW (found by F69's first run): the chapter masthead's "In this chapter" index stays two columns in a 320px container — its `@container (max-width: 620px)` rule does not take effect — so each title column is 37px at 390px (`reference-manual-diagram-light-mobile`, `span.kb-man-ix-t`). Likely a missing `container-type` on the ancestor the query is meant for. Not fixed (out of scope).
- `PROJECT_HEALTH.md` will need its Current Standing rewritten again at cycle 25's reflection (the scan's scores stand until then).
- The CI step does not render Word or PDF (no LibreOffice / Node docx in CI); a Word-only defect is still caught only by a local make_all.sh.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
