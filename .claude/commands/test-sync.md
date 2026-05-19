Read CLAUDE.md (Cycle Workflow Config) before starting.

You are running a post-implementation test quality assessment. The
primary goal is not just fixing failing tests — it is detecting
coverage gaps and test-quality issues that let regressions slip
through. Run every step even if all tests pass.

Optional input: paste a recent IMPLEMENTATION SUMMARY (broad,
targeted, or full-cycle). If provided, Steps 3-4 cross-reference each
change against the test suite. If not provided, run the analysis
against recent commits since the last `/test-sync` run.

═══════════════════════════════════════════
STEP 1 — RUN TESTS AND CLASSIFY FAILURES
═══════════════════════════════════════════

Read the Test Command from CLAUDE.md's Cycle Workflow Config.

- If Test Command is `manual`: walk every Regression Scenario in the
  config. Record per-scenario outcome (PASS / FAIL / NOT APPLICABLE).
  Treat each FAIL as a test failure for the purposes of classification
  below.
- Otherwise: run the test suite using the Test Command.

For every failure (or scenario FAIL), classify into one category:

- Category A — Outdated assertion. The test was written for old
  behavior that has since changed intentionally. Fix: update the
  assertion to match current correct behavior.

- Category B — Local redefinition drift. The test re-implements
  production logic locally (constants, helper functions, sample
  data shapes) and that local copy has diverged. Fix: rewrite the
  test to import the production value/function directly.

- Category C — Pre-existing failure unrelated to recent changes.
  Fix only if in scope and low effort; otherwise flag for follow-on.

- Category D — Real production bug exposed by a correct test (or a
  correct manual scenario). DO NOT fix the bug in this session;
  flag it as a follow-on item and leave the test failing as a marker.

- Category E — Infrastructure issue (missing dep, expired credential,
  flaky test environment, broken trigger, etc.). Fix if the fix is
  contained to test infra; flag if it requires production changes.

═══════════════════════════════════════════
STEP 2 — FIX CATEGORIES A, B, C, E
═══════════════════════════════════════════

In priority order: E → A → B → C. After each fix:
- Re-run the affected test(s) (or re-walk the affected scenario)
- Note what changed and why
- Stop and describe if a "small" fix grows beyond ~30 minutes

═══════════════════════════════════════════
STEP 3 — COVERAGE GAP ANALYSIS
═══════════════════════════════════════════

Primary value — runs even if all tests pass.

For each change listed in the IMPLEMENTATION SUMMARY (or each
behavior-changing commit since the last `/test-sync` if no summary
was provided):

1. Does a test exist that would fail if this change regressed?
   - YES: note the test name; move on.
   - NO: this is a Category D candidate. Describe what's untested.

2. For each gap, classify the missing test:
   - Simple (<30 min): write the test now, alongside this session
   - Complex (>30 min or requires fixtures/infra): flag as follow-on,
     describe what the test would assert

3. Compute Category D ratio:
     (fixes without regression tests) / (total fixes in scope)
   Report as a percentage.

═══════════════════════════════════════════
STEP 4 — TEST QUALITY CHECK
═══════════════════════════════════════════

Audit the suite (or the manual scenarios) for tests that don't
actually guard against regressions:

- Pass-both-ways tests: a test that passes both before AND after a
  buggy change. Probe by re-reading the assertion: would it catch
  the inverse behavior? Flag any that wouldn't.
- Mock-only assertions: tests that assert on mock/stub behavior
  rather than the actual production code path.
- Tautological assertions: assertions so broad they'd pass
  regardless of the code under test (e.g., asserting only that a
  result is non-null, asserting `typeof x === 'object'`, etc.).
- Scenario equivalents (when Test Command is `manual`): scenarios
  whose expected outcome is so vague the operator can't tell if it
  passed or failed.

For each issue: is the test salvageable (tighten the assertion or
scenario) or should it be rewritten / replaced? Choose the lighter
fix when both work.

═══════════════════════════════════════════
STEP 5 — CI / STATIC CHECK CONFIGURATION
═══════════════════════════════════════════

Verify the project's static checks are wired and current:
- TypeScript / type-checker: runs in CI, no `// @ts-ignore` clusters
  added recently
- Linter (ESLint, Ruff, etc.): runs in CI, no broad disables added
- Build step: still completes from a clean checkout
- For Apps Script / clasp projects: `clasp push` runs without
  manifest errors; appsscript.json references resolve

If a check is missing or skipping production code paths, flag it as
a CI gap. Do not introduce new CI tooling in this session — that's a
follow-on.

═══════════════════════════════════════════
OUTPUT — TEST SYNC SUMMARY
═══════════════════════════════════════════

---TEST SYNC SUMMARY---
Test command: [from CLAUDE.md]
Results: [pass/fail counts; scenario PASS/FAIL counts if manual]

CATEGORY BREAKDOWN:
- Category A (outdated assertions): [count] — fixed: [count]
- Category B (local redefinition): [count] — fixed: [count]
- Category C (pre-existing): [count] — fixed: [count]
- Category D (real bug, deferred): [count] — listed below
- Category E (infrastructure): [count] — fixed: [count]

CATEGORY D — REAL BUGS EXPOSED (follow-on, do NOT fix here):
- [test/scenario name] | [what the bug is] | [severity]

COVERAGE GAPS:
- Fixes with regression tests: [N] of [M]
- Category D ratio (fixes without regression tests): [X%]
- Gaps closed this session (simple, <30 min): [list]
- Gaps flagged as follow-on (complex): [list with what to assert]

TEST QUALITY ISSUES:
- [test name] | [issue: pass-both-ways / mock-only / tautological] | [fix or rewrite?]
(or "None")

CI / STATIC CHECK STATUS:
- [check] | [pass/fail/missing] | [notes]

FOLLOW-ON ITEMS:
- [item]
(or "None")
---END TEST SYNC SUMMARY---
