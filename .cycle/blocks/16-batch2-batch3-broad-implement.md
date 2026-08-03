---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Batch 2 (F10 load-failure/empty-state sweep + A12
generalization; F11 vacuous queue-grouping assertion; visual-fixture mirror of
`cnNoteCoverage_`) and Batch 3 (F6 `uiPrompt` accessible name + announced
validator error; F7 client `Ungrouped` sentinel named and mirrored; F8
`getDeptRequests` status normalization + resolved-row elapsed-time fallthrough).

Files modified:
- web-app/Code.js
- web-app/Tests.js
- web-app/script_core.html
- web-app/metrics/script_metrics.html
- web-app/metrics/script_deptrequests.html
- web-app/cn/script_callnotes.html
- web-app/kb/script_kb.html
- web-app/intake/script_intake.html
- web-app/tc/script_manager.html
- web-app/tc/script_clock.html
- web-app/train/script_coaching.html
- test/client/run.js
- test/visual/mock.js

CHANGES:

F10 | kb(10) cn(4) tc/manager(4) tc/clock(3) train/coaching(4) intake(2)
metrics/deptrequests(1) = 28 sites | Every one rendered a LOAD FAILURE into the
tool's designed EMPTY-state container, so a transient RPC failure was visually
indistinguishable from "there is nothing here". All now call `errorStateHtml_`
(warn card + glyph + `role="alert"`), and every converted site DROPS the outer
`esc()` — the helper escapes internally, so keeping it renders `&amp;lt;`.
Sharpest instances: the Reference tree and the Ctrl/⌘+K drawer (the mid-call
lookup surface — a failed load read as an empty knowledge base during a call),
and `train/script_coaching.html`, which uses `.tr-empty`, a class the OLD A12
tripwire already knew, in a file it did not scan.

F10 (tripwire) | test/client/run.js | A12 GENERALIZED from three hand-listed
files + a hand-copied class list to the RULE — the same promotion A1/A11 got in
cycle-13 batch 5 and A2 got earlier this cycle. The FILE set derives from
`A11Y_SCAN_PARTIALS` (itself derived from `PARSE_GUARD_PARTIALS`, so a new
tool's partial cannot ship outside the net — INV-179) and the CLASS set derives
from the markup by this codebase's own naming convention (any class ending
`-empty`, plus `no-data`), so a new tool inventing `foo-empty` is covered the
day it ships. `A11Y_SCAN_PARTIALS` was moved ABOVE the A12 test — A12 is now its
first consumer and a `const` used before declaration is a TDZ error, not a
hoist. Added a companion pin, `A12: no call site double-escapes
errorStateHtml_`, because converting FROM the escaped empty-state form is
exactly where that mistake is cheap to make, 28 times over.

F11 | web-app/Tests.js | `test_metrics_getTeamMetrics_queueGrouping` asserted
Ungrouped-sorts-last with a literal `_assertTrue(true, …)` — a placeholder that
can never fail — while the department-mapping assertion sat behind
`if (salesGroup)`, so it was skipped entirely in precisely the case where the
fold had dropped the group. Replaced with a real index assertion
(`indexOf('Ungrouped') === groupRows.length - 1`, INV-181) and an unguarded
`_assertEq(salesGroup, 'Sales', …)`.

(mirror) | test/visual/mock.js | The Team Metrics fixture computed
`totals.noteCoverage` with a hand-written formula that had already diverged from
the server's `cnNoteCoverage_` in the case that matters — it produced a number
for `answered === 0` where the server returns `null` (the INV-129 contract F5
just hardened). Replaced with a VERBATIM copy inside the existing DO-NOT-EDIT
region (INV-185), and the F4 mirror pin was generalized to DERIVE the copied
functions from that region rather than naming `groupQueueRows_` by hand — so
the next verbatim copy is pinned automatically.

F6 | web-app/script_core.html | `uiPrompt`'s input had NO accessible name (a
screen-reader user tabbing in heard "edit, blank" — the title and message
carried the meaning but were not associated, and a `placeholder` is not a name)
and its validator error had no live region, so a rejected value was announced as
nothing at all and the dialog read as one that simply refuses to close. Added
`aria-labelledby` (the dialog title) and `aria-describedby` (message + error
slot) on the input, and `role="alert"` on `.ui-dialog-err`. The error id is
ALWAYS in `aria-describedby`; only the message half is conditional. `uiConfirm`
needs neither — no field, no validation — which is why this is `uiPrompt`-only.

F7 | web-app/metrics/script_metrics.html | The client found the unmapped-queue
bucket by comparing a group name against a bare `'Ungrouped'` literal. That hint
is the ONLY signal an operator gets that a queue is unmapped (INV-181), so a
server-side rename of `CDR_QUEUE_UNGROUPED` would silently stop it rendering
while the row itself still appeared — the gap would look closed. Named
`M_QUEUE_UNGROUPED`, used in both the lookup and the hint text, pinned against
the server constant, and added to `MIRROR_INDEX`. Note the shape of the miss:
cycle-15 F4 pinned this very sentinel in the visual FIXTURE and left the
SHIPPING client on the literal.

F8 | web-app/Code.js `getDeptRequests` | Two defects in adjacent lines. (a) The
resolved-check read `r[DR.STATUS]` RAW while every other line in the function
went through `String(r[DR.STATUS] || 'open')` — so a whitespace-padded or
mixed-case cell made them DISAGREE: the item's `status` excluded the row from
`incoming` and `allOpen`, but this test was false so `deptStats` counted it as
OPEN. That is the INV-167 / INV-183 whitespace class on a third column, and the
fix is the same shape: normalize ONCE into a local, feed every consumer the
normalized value. (b) A row marked resolved whose `ResolvedAt` is blank or
unparseable has an UNKNOWN resolution time; the old expression fell through to
"now − created", pushing an ever-growing age into `deptStats.durations` — so one
such row inflated a department's average and median resolution time a little
more every day, and those are the numbers the per-dept SLA targets are set
against. Now `null` for that case.

TEST RESULTS: passed.
- Pure harness (`node test/client/run.js`): **403 → 407**, 0 failed. Four new
  pins (F6, F7, F8, plus the generalized A12 pair and the generalized F4 mirror
  already counted). All three Batch-3 pins were BITE-CHECKED — reverting each
  fix individually fails exactly its own pin (`404 passed, 3 failed`), and the
  originals were restored and re-verified green.
- DOM harness (`npm run test:dom`): 69 passed, 0 failed. The `uiPrompt`
  validator lifecycle test is unaffected by F6 (attributes are additive; the
  `.ui-dialog-err` display toggle it asserts is untouched).
- `node --check` on Code.js / Tests.js / DevTools.js: clean.
- Visual harness: 29/29 scenarios, **0 missing fixtures, 0 horizontal
  overflow** — every view still rendered its real content, which is the
  evidence that no F10 render path was broken.
- TWO pins failed on first write and were fixed — both were the PIN being wrong
  about the code, not the code. F8's tripped on its OWN explanatory comment
  (which quotes the raw read it removed) and now strips comments first, the
  exact trap the CDR health-card pin already documents; F6's sliced from the
  wrong `ui-dialog-err` occurrence (the id constant, not the div).

REGRESSION SCENARIOS (Test Command is `manual`; the Apps Script suite cannot run
off-editor, so S1/S2 are recorded as NOT EXECUTABLE, not as passes):
- S1 / S2 (smoke / full suite) | NOT EXECUTABLE IN CONTAINER — must be run from
  the Apps Script editor after deploy. F11 edits an S2 test; its logic was
  verified by reading, and `node --check web-app/Tests.js` is clean.
- S39 (Clock view layout), S51 (Admin tab), S57 (Compliance audit panel), S59 /
  S60 (Intake PPD / account), S62 / S64 (Reference browse / drawer), S72
  (Coverage planner) | PASS on the evidence available — each names a HAPPY path
  in a file F10 touched, F10 changed only the failure branch, and all 29 visual
  scenarios rendered their real content with zero missing fixtures. The failure
  branches themselves need a deployed app to exercise (see OPERATOR ACTIONS).
- S42 (Team Metrics presets + range) | PASS — F7 is a constant extraction; the
  render comparison and hint text are byte-equivalent for the shipped value, and
  the mirror pin now enforces that.
- S43 (Metrics CDR-unavailable fallback) | NOT APPLICABLE — `script_metrics.html`
  had no F10 sites (the OLD A12 tripwire already scanned metrics, which is
  precisely why its violations were elsewhere).
- S54 (uiConfirm / uiPrompt dialogs) | PASS — F6 adds attributes only; Esc,
  click-outside, the `resolved` sentinel and the validator-keeps-open behaviour
  are untouched and green in the DOM harness.
- Dept Requests (F8) | NO SCENARIO EXISTS. The tracker has no Regression
  Scenario at any subsystem, so there was nothing to walk — logged as a
  follow-on.

REGRESSION RISKS:
- `errorStateHtml_` renders a larger, warn-toned card than the compact empty
  states it replaces. In the 400px Ctrl/⌘+K drawer and the narrow KB tree column
  this is UNSHOT by the visual harness (error paths have no fixture), so its fit
  is unverified. It is a layout question, not a correctness one — the helper is
  already the shipped error component elsewhere.
- F8 narrows what `deptStats` counts as open and what it feeds into
  `durations`. Both directions are strictly more correct, but a department whose
  sheet contains a malformed row WILL see its average/median resolution time
  change after deploy. That is the fix reporting a corruption that was
  previously invisible, not a regression — worth saying out loud because it
  looks like a metrics shift.
- No interface, return type, or default value changed for any caller.
  `getDeptRequests`'s `status` field is now normalized rather than raw; the
  client compares against `'open'` / `'resolved'`, which a normalized value can
  only match more reliably.

INVARIANTS AT RISK: None violated; three strengthened, one PARTIALLY satisfied.
- INV-175 (a load failure renders `errorStateHtml_`, never an empty state) —
  brought 28 sites into compliance and promoted its tripwire from a hand list to
  a derived rule. Strengthened.
- INV-181 (Ungrouped is a partition member, sorts last, and is the operator's
  only signal) — F7 protects the hint that surfaces it; F11 makes the editor
  suite actually assert the ordering it claimed to.
- INV-185 (a fixture copies server logic verbatim, never paraphrases) — extended
  to `cnNoteCoverage_`, and the pin now derives the copied set.
- INV-183 / INV-167 (normalize once; a padded cell must not split two readers) —
  **PARTIALLY satisfied.** F8 fixes `getDeptRequests` only. Three raw
  `DR.STATUS` comparisons remain in the same module (see FOLLOW-ON ITEMS), so
  the invariant does NOT hold module-wide and should not be recorded as if it
  does.
- INV-83 (dialog lifecycle) and INV-129 (a failed read is surfaced) — both
  consistent with, and reinforced by, F6 and F10 respectively.

NET SCORE: 2 − 0 = 2
- F10: production fix. Apps Script RPCs fail routinely (300–800ms round trips,
  quota blips, a momentarily unreachable KB/CDR sheet); rendering that as
  emptiness on the mid-call lookup tool is a this-month event.
- F6: production fix, counted per the cycle-13 precedent that user-visible
  interface defects are production fixes — stated with its uncertainty: this
  team has no known assistive-technology user, so whether it FIRED this month is
  unknowable, unlike whether it is a defect.
- F8: real correctness fix, but both halves need a malformed row (written by
  code, so only a manual edit or a partial write produces one). Scored 0 —
  latent this month, with a compounding blast radius if it ever fires.
- F7, F11, the mock mirror: 0 each — drift guards and test integrity, not
  production behaviour.
- New failure modes: 0.

OPERATOR ACTIONS / DEPLOY:
- Run `runAllTests()` from the Apps Script editor after deploying | BLOCKS
  DEPLOY: N (post-deploy verification). This is where F11's corrected assertion
  and the whole S1/S2 pair actually execute — they cannot run in the container.
- Spot-check one error state on the deployed app — the quickest is Reference
  with `KB_SS_ID` temporarily pointed at an unreadable id | BLOCKS DEPLOY: N.
  Confirms the warn card fits the narrow KB tree column and the 400px drawer,
  which the visual harness cannot shoot.
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy →
Manage deployments → Edit → Version: **New version** → Deploy. One push covers
every modified subsystem (Server + all client partials). `test/` is never
pushed.

(Not complete in production until the deploy step is confirmed. No blocking
operator actions.)

FOLLOW-ON ITEMS:
- **Three raw `DR.STATUS` comparisons remain**, deliberately out of scope (F8
  was scoped to `getDeptRequests`): `Code.js:12099` `drFindOpenRequest_`
  (`String(r[DR.STATUS]) === 'open'`), `Code.js:12135` `markDeptRequestResolved_`,
  and `Code.js:12413` `deptRequestsOverdueOpen_` (`… === 'resolved'`).
  Consequences if a padded cell exists: a re-send fails to dedupe and opens a
  DUPLICATE request (INV-131), and a resolved request nags in the daily SLA
  digest forever. The right fix is probably a `drStatus_(row)` predicate plus a
  tripwire banning the raw read — the INV-167 shape — not three more inline
  trims.
- **Dept Requests has no Regression Scenario at all.** F8 changed it and there
  was nothing to walk. Worth adding one (auto-log on a department email →
  resolve by link → resolve in-app by sender/manager/dept member → `deptStats`
  aggregate → SLA banding).
- **Training heading clip at 390px**, surfaced by Batch 4's new mobile scenarios
  and left unfixed as out of scope: `.tr-head-title` reports `scrollWidth 94px`
  inside `clientWidth 18px`. It is A2-FAMILY but the A2 tripwire can never flag
  it — that file has no `data-compact` override for the rule to derive from.
- **Error states are unshot by the visual harness.** Every scenario fixtures the
  success path, so the 28 newly-converted surfaces have no screenshot. A
  `*-error` variant driving `run.reject` would close this; it is the natural
  next extension of the Batch-4 work.

DOCUMENTATION UPDATES NEEDED:
- CLAUDE.md **INV-175**: rewrite the "honored in 2 of 11 tool partials" history —
  it is now enforced by a DERIVED rule, and the 16-site cycle-13 figure is
  superseded by 28 more across six further partials. Record that the tripwire
  scans by convention (`-empty` / `no-data`), so the rule covers unwritten tools.
- CLAUDE.md **Test Command** section: running total **403 → 407**; note the new
  `A12: no call site double-escapes errorStateHtml_` companion and the three
  Batch-3 fix pins.
- CLAUDE.md **INV-181**: add that the client's `M_QUEUE_UNGROUPED` mirrors the
  server sentinel and is in `MIRROR_INDEX` (F7), and that the editor suite now
  asserts the Ungrouped INDEX rather than a placeholder (F11).
- CLAUDE.md **INV-185**: extend to `cnNoteCoverage_` and record that the pin now
  DERIVES the copied set from the DO-NOT-EDIT region.
- CLAUDE.md **INV-183 / INV-167**: note that `DR.STATUS` is the third column in
  this class, that F8 fixed only `getDeptRequests`, and that three raw reads
  remain — so the next reader does not assume the module is clean.
- CLAUDE.md **Common Gotchas**: a short entry for the F8 elapsed-time class — a
  "resolved" row with no usable resolution timestamp has an UNKNOWN duration,
  and substituting its age silently compounds into every aggregate that reads
  it.
- CLAUDE.md **Regression Scenarios**: add a Dept Requests scenario (see
  FOLLOW-ON), and extend **S54** to cover the `uiPrompt` accessible name and the
  announced validator rejection.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
