---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: F4 (High, structural) — opening a cycle the way the audit command says (STATE.md and nothing else) left the first CI step red and every later step skipped, and the close-out script's own "Fix:" could not turn it green. F74 (Low, structural) — the visual scripts each carried their own Chromium resolver; every copy looked for `chrome-linux/` while the web container installs `chrome-linux64/`, and `a11y-names.mjs` / `print-check.mjs` ignored `CHROMIUM_PATH`, so the project-mandated Visual Audit Stage could not run there as written.
New capabilities (G/ST): None (ST5 was added to STATE's Pending as a roadmap item, not started — operator 2026-11-13)
Files modified: scripts/cycle-closeout.mjs, PROJECT_HEALTH.md, .github/workflows/client-tests.yml, test/client/run.js, test/visual/chromium-path.cjs (new), test/visual/shoot.mjs, test/visual/a11y-names.mjs, test/visual/print-check.mjs, test/visual/a13-measure.mjs, test/visual/fold-measure.mjs, test/visual/map-check.mjs, test/visual/settings-check.mjs, test/visual/tour-check.mjs, test/visual/README.md, CLAUDE.md (the generated counts row), .cycle/config.md, docs/design-decisions.md, docs/test-harness-log.md, .cycle/STATE.md
Estimate: S (~2 h) — written to STATE.md's Estimates line before the first edit
Actual: ~2 h

CHANGES:
F4 | scripts/cycle-closeout.mjs | `region(last)` is built from the last REFLECTION alone (metrics.csv). It no longer writes "Now: cycle N is open/closed" from STATE's `Cycle:` line; a fixed line says the cycle in progress is STATE.md's `Cycle:` line. `planHealth(health, refl)` loses its STATE argument; the "behind" message names metrics.csv only. STATE's cycle is still read for the HISTORY rule and for "metrics ahead of STATE".
F4 | PROJECT_HEALTH.md | The generated region regenerated in its new shape (`--write`); the sentence above it now says the region follows the last reflection only.
F4 | test/client/run.js | The standing pin (F25 + F26 + F27 + F64) reads the GENERATED region for the last reflected cycle — the old assertion looked for the cycle STATE is on anywhere in Current Standing, which only a hand-written sentence satisfied. The E5 `--write` drive asserts the new region. New drive: close a fixture cycle, open the next in STATE.md alone, require `--check` green and `--write` idle, and still red once a reflect row lands.
F4 | .github/workflows/client-tests.yml | Every check after the syntax step runs under `if: ${{ !cancelled() }}`; `npm ci` has `id: deps`, and the five steps that need the dev dependencies (lint, the REQUIRE_DEPS re-run, handbook-sync, the DOM harness, counts) also wait on `steps.deps.outcome == 'success'`; the handbook build waits on the Python setup only. A failed step still fails the job. New pin parses the job's steps (no default-chained run step, no `continue-on-error`, no `always()`).
F74 | test/visual/chromium-path.cjs (new) + the eight launching scripts | One resolver: `CHROMIUM_PATH` → the newest `chromium-<build>` (by NUMBER) under `PLAYWRIGHT_BROWSERS_PATH` or `/opt/pw-browsers`, in `chrome-linux64/` or `chrome-linux/` → undefined (Playwright's managed download, what CI uses). Each script imports it and keeps no copy. CommonJS, so the pure harness drives it over fake trees; a derived net over `test/visual/*.mjs` requires every launching script to import it.
Docs | .cycle/config.md, docs/design-decisions.md, docs/test-harness-log.md, test/visual/README.md, CLAUDE.md | INV-381 amended (F4); the E5 close-out decision gains its amendment; the harness log's Batch 1 entry; `chromium-path.cjs` in the Test Suite file list and the visual README; the counts block's pure-harness row 1635 → 1639.

TEST RESULTS: pure 1635/1635 without the dev dependencies and 1639/1639 with them (`REQUIRE_DEPS=1`); DOM 418/418; `lint-server` clean (23 server files, 2 projects); `handbook-sync --check` clean; `counts.mjs --check` clean; `cycle-closeout.mjs --check` in step (cycle 26; last reflected 25post). Bite-checks: 11 of 11 bit (the region naming STATE's cycle again; the generated standing naming another cycle; the close-out step back on the default chain; lint not waiting for npm ci; the floor waiting for npm ci; `continue-on-error` on a step; only the old browser layout tried; builds sorted as strings; the override ignored; a script keeping its own resolver; a script launching without it). Visual, in the web container with NO override: `a11y-names.mjs` passes (all twelve views named), `print-check.mjs` passes, `shoot.mjs --ci` — CI GATE (33 scenarios): PASS. Regression scenarios whose Subsystem overlaps a modified file: S1 (smoke suite) NOT APPLICABLE and S2 (full suite) NOT APPLICABLE — both run in the Apps Script editor, and no `web-app/` or `handbook-app/` file changed (Tests.js untouched).
REGRESSION RISKS: PROJECT_HEALTH's generated region no longer says which cycle is open — read STATE.md for that (the SessionStart hook already prints both). Nothing else parsed the removed line (grep: pins only; the portfolio labels `Overall (weighted avg):` and the two `Top … priority:` lines are untouched). CI: a red step no longer stops the later checks, so a broken commit shows every failing check at once and a job takes its full time even when the floor is red; a failed `npm ci` still skips the five dependent steps. The resolver now prefers the numerically newest build where several are installed (the old copies sorted as strings).
INVARIANTS AT RISK: INV-381 — its clause (1) described the old region; AMENDED in this batch. None other.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (2 defensive: both fixes are to the safety net, not to code that ships; F4 was live on this branch — CI red and unchecked on the commit that opened cycle 26)

OPERATOR ACTIONS / DEPLOY:
- None | BLOCKS DEPLOY: N
Deploy: N/A — no `web-app/` or `handbook-app/` file changed; nothing to push with clasp.

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- scripts/cycle-closeout.mjs — the close-out writes `Cycle: 25post — closed …` while the audit command treats a non-numeric Cycle as 0 (the next audit would be "Cycle 1", which the script refuses as behind metrics.csv). The scan opened 26 by judgement; nothing enforces it. Belongs with ST1 (a cycle-open script).
- PROJECT_HEALTH.md — Current Standing's prose still says "No audit has run since cycle 25's" and carries the 2026-10-14 scores; the cycle 26 scan re-scored (Overall 7.3). No longer pinned to name the open cycle; update at /health-pulse or the reflect.
- scripts/counts.mjs — `--block` prints the block but nothing writes it; the row is hand-edited after every batch that adds a pin.
- test/visual — the axe gate and the layout waiver (scan F69) are untouched; Batch 14.

DOCUMENTATION UPDATES NEEDED:
- None (done in this batch). `.cycle/config.md`'s Test Command and Deploy Command sections are still stale (scan F70, Batch 14) — not this batch's scope.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
