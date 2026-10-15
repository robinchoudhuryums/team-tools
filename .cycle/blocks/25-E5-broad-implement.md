---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (an expansion batch)
New capabilities (G/ST):
- ST4 — the visual matrix's layout measurements gate CI: `node shoot.mjs --ci` shoots a fixed 24-scenario subset (every tool at phone / pop-out width, plus the wide reader F67 was found on) in headless Chromium and exits non-zero on sideways overflow, a page taller than its content (past 200px), squeezed text, a missing fixture or an uncaught page error; a new `visual-layout` CI job installs Playwright's Chromium and keeps the shots as an artifact on failure. The page-height and column-width measurements themselves shipped with Batch 9 F69, so this batch is the CI half.
- ST5 — the cycle close-out is scripted: `scripts/cycle-closeout.mjs` derives PROJECT_HEALTH's standing region and missing Score History rows from `.cycle/metrics.csv` and STATE's Cycle line, checks that every reflected cycle (from 20) below STATE's has a HISTORY block, and `--close --write` moves STATE into HISTORY and resets it from the template carrying the open Pending / follow-on / decision bullets; CI runs `--check`. Plus the owed cycle-24 move, done by hand (cycle 24's lines were interleaved with cycle 25's).
Files modified: scripts/cycle-closeout.mjs (new), test/visual/ci-gate.cjs (new), test/visual/shoot.mjs, test/visual/README.md, .github/workflows/client-tests.yml, test/client/run.js, PROJECT_HEALTH.md, .cycle/HISTORY.md, .cycle/STATE.md, .cycle/config.md, CLAUDE.md, docs/design-decisions.md, docs/operator-log.md, docs/test-harness-log.md
Estimate: L (~1.5 days ≈ 12 h, the plan's figure: ST4 M ~1 day + ST5 S ~2 h) — written before the first edit
Actual: ~3 h

CHANGES:
ST4 | test/visual/ci-gate.cjs | CI_SCENARIOS (exact names), KNOWN (shrink-only, each with a reason — one entry: the chapter masthead index at 37px on reference-manual-diagram-light-mobile, the open Batch 9 follow-on), RUNAWAY_PX = 200, findingsOf, ciVerdict → {ok, failures, stale, unshot}; a plain console.error is reported, not gated
ST4 | test/visual/shoot.mjs | `--ci` selects the subset by exact name (an unknown name is refused before the browser starts), uses the gate's RUNAWAY_PX (one constant), prints the verdict and exits 1 on a failure
ST4 | .github/workflows/client-tests.yml | a `visual-layout` job: npm ci + `npx playwright install --with-deps chromium`, `node build.mjs && node shoot.mjs --ci`, report + shots uploaded on failure
ST5 | scripts/cycle-closeout.mjs | dry run / --write / --check / --close [--write]; RFC-4180 CSV; last reflect row per cycle; 19pre < 19 < 19post ranks; Score History rows appended (unicode minus, `|` escaped, hand rows never rewritten); a generated region between closeout markers; HISTORY-owed check from cycle 20; metrics ahead of STATE is an error; --close refuses a non-reflect/idle phase, an unreflected cycle, an already-closed cycle; --root / --today for fixtures
ST5 | PROJECT_HEALTH.md | the hand "Last closed cycle" paragraph replaced by the generated region; the standing's stale "E-batches await a go" prose updated
ST5 | .cycle/HISTORY.md, .cycle/STATE.md | the owed cycle-24 move, BY HAND: cycle 24's in-progress, completed, done/superseded pending and left-off lines moved verbatim under "# Cycle 24 (closed 2026-10-06 …)"; its still-open pending items and decisions kept in STATE and copied into the block
ST4/ST5 | .github/workflows/client-tests.yml | `node scripts/cycle-closeout.mjs --check` after the counts check
CI fix (mine, Batch 9) | .github/workflows/client-tests.yml, run.js | the handbook build step installed only `markdown`, but make_html.py imports bs4 — so `Client tests` FAILED on every push from Batch 9 (5e1ffb3) to E4, unnoticed because nothing here read CI. The step now installs `beautifulsoup4==4.15.0` (reproduced and verified in a clean Python 3.12 venv with only the two packages: the whole step passes, no diagram drift). The F29 pin asserted "the ONE Python dependency"; it now DERIVES the third-party imports of the step's scripts (following local imports through manual/) and requires each pinned in the step — bitten twice (bs4 removed; bs4 unpinned)
Docs | .cycle/config.md (INV-381, the Visual Audit Stage note), CLAUDE.md (the close-out procedure names the script; the design-decision index line; counts), test/visual/README.md, docs/design-decisions.md, docs/operator-log.md, docs/test-harness-log.md
Tests | test/client/run.js | 7 E5 pins (ciVerdict driven ×2, the subset/shoot/workflow structure, the close-out CLI driven over temp fixture trees ×3, the real tree --check'ed); the F69 pin reads the shared RUNAWAY_PX

TEST RESULTS: passed (locally; CI's last 8 runs were red on the handbook step's missing bs4 — fixed here, see CHANGES) — pure 1360/0, DOM 260/0, lint:server clean, split-manifest current, counts --check clean, cycle-closeout --check in step. Visual: the full matrix (171 scenarios) found nothing but the known masthead narrowText; `node shoot.mjs --ci` PASS locally (24 scenarios). Bite-checks: 24/24 Node mutations bite (gate thresholds and kinds, KNOWN scoping and staleness, unshot names, exact selection, the exit code, the shared constant; the close-out's hand-row guard, minus sign, pipe escape, last-row-wins, HISTORY check, heading boundary, metrics-ahead, struck/sub-line carry, phase refusal, preview, newest-first, re-close refusal); the Chromium bite — removing F67's `blockquote.kb-callout { position: relative }` — turns `shoot.mjs --ci` red (reference-manual-light-wide, +1189px runaway, exit 1). Regression Scenarios: no Subsystem covers the tooling touched (Test Suite / CI / cycle machinery); NOT APPLICABLE — no web-app/ file changed.
REGRESSION RISKS: (1) CI's Chromium (Playwright 1.61.1's download, Ubuntu fonts) is not the local /opt/pw-browsers build — a measurement that differs on the runner makes the first CI run red; the fix is a KNOWN entry with the reason, never a looser threshold. (2) Any session that changes STATE's Cycle (an audit opening) leaves --check red until `--write` regenerates the standing — intended, but a new step for the first implement session of a cycle. (3) The cycle-24 split was by judgment; nothing was deleted — every moved line is verbatim in HISTORY.
INVARIANTS AT RISK: INV-230 (ids unique — INV-381 is new and checked); INV-185 (fixtures — the gate fails on a missing fixture in the subset, strengthening it). None weakened.
NET SCORE: 0 production fixes − 0 new failure modes = 0 (2 new capabilities: ST4, ST5)

OPERATOR ACTIONS / DEPLOY:
- None — no web-app/ change, nothing to deploy | BLOCKS DEPLOY: N
- Watch the first `visual-layout` CI run on the branch; if the runner's Chromium measures differently, record the finding in ci-gate.cjs KNOWN with its reason | BLOCKS DEPLOY: N
Deploy: N/A — no web-app/ file changed

FOLLOW-ON ITEMS:
- Batch 9 follow-on (1), the chapter masthead index at 37px, is now the gate's only KNOWN entry — fixing it requires removing the entry (the gate fails while a stale one remains).
- The close-out runs `--close --write` as /reflect's last step by convention; the synced /reflect command cannot carry the step (byte-identical to claude-workflow-tools) — upstream it there if wanted.
- No `actions/cache` for Playwright's browser download (~1 min a run); add it if the job's time matters.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made (CLAUDE.md procedure + index + counts, INV-381, README, design decision, operator log, harness log).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
