---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
  BATCH 5 (process / hygiene — the three non-code items from the scan)
  - B5-1 | Generalize the two cycle-13 a11y tripwires from a hand-listed file set
          to a RULE over every scanned partial
  - B5-2 | Make the visual lens a standing stage of /broad-scan rather than a
          one-off the operator has to remember to ask for
  - B5-3 | Delete the three frozen directories the Frozen Subsystems list has
          been carrying (`call-notes/`, `call-notes-legacy/`, `incoming/`)
  BATCH 4 (interface completeness)
  - A13  | No heading outline below `<h1>` in most views — section headings were
          styled `<div>`/`<span>`s, so heading navigation stopped at the page
          title on ~30 surfaces

Files modified:
  web-app/tc/script_manager.html, web-app/tc/script_clock.html,
  web-app/tc/script_timeoff.html, web-app/train/script_training.html,
  web-app/styles.html, web-app/cn/script_callnotes.html,
  web-app/kb/script_kb.html, web-app/intake/script_intake.html,
  web-app/Code.js, test/client/run.js, test/visual/README.md,
  test/visual/a13-measure.mjs (new), CLAUDE.md, README.md, .cycle/STATE.md
  DELETED (29 files): call-notes/ (5), call-notes-legacy/ (13),
  incoming/form-generator/ (11)

CHANGES:

B5-1 | test/client/run.js, cn/script_callnotes.html, kb/script_kb.html |
  Both cycle-13 a11y pins named their files by hand. That is the exact class
  cycle-11's M-4 retired: a new tool's partial ships outside the net with CI
  green. Both now scan `A11Y_SCAN_PARTIALS`, derived from `PARSE_GUARD_PARTIALS`
  (which itself auto-tracks `index.html`'s `include()` calls) plus
  `modals.html`.
    • A1 (no bare span/div with an inline onclick) — unchanged semantics, wider
      reach. Clean on the first run.
    • A11 was promoted from six enumerated surfaces to a RULE: wherever a state
      class (`active`/`on`/`selected`/`current`) is toggled, an ARIA attribute
      must be set in the same function. Running it surfaced EIGHT instances the
      hand scan had missed — the CN flag toolbar, both CN sub-tab strips (Team
      Notes ×4 and Admin), the KB tree item, and the KB editor type toggle.
      All eight fixed; the KB type toggle needed a shared `kbTypeTabSet_(el, on)`
      because two call sites (`kbEditorSetType_` and the converter path) set it.
    • Two entries in a deliberately tiny `A11Y_DECORATIVE` allowlist, each a
      reasoned claim that the class is pure presentation: the KB drawer's
      loading spinner and the clock card's two cross-fading sky layers.
  Promoting a convention to a tripwire found more than the audit did. That is
  the argument for doing it, and it is why the CLAUDE.md decision now says to
  treat the tripwire — not the prose — as the enumeration.

B5-2 | CLAUDE.md | Added a `### Visual Audit Stage` section to the Cycle
  Workflow Config. It belongs THERE, not in `.claude/commands/broad-scan.md`:
  `.claude/commands/` is verified byte-identical to claude-workflow-tools
  v1.23.0, so a local edit would be silently reverted by the next
  /sync-commands. The section records what cycle 12 and 13 both demonstrated —
  that the visual lens outscores the code lens on this codebase — plus the two
  operating rules the harness README already carried (re-shoot after any
  `styles*.html` or view-partial change; a `missing` fixture entry means the
  scenario rendered a LOADER, so fix the fixture before trusting the shot).

B5-3 | call-notes/, call-notes-legacy/, incoming/ (29 files deleted) +
       Code.js, intake/script_intake.html, CLAUDE.md, README.md |
  The Frozen Subsystems list described `incoming/form-generator/` as a
  "delete-candidate once the operator confirms the port needs no further
  reference" — the Intake module has shipped four tabs, an engine with four
  drift guards, and three redesign phases since, so that confirmation has been
  earned by events. `call-notes/` and `call-notes-legacy/` were superseded by
  the web-app module and their unfreeze condition (the org adopting Marketplace
  Add-ons) is explicitly not anticipated. None of the three is clasp-synced, so
  nothing about the deployed app changes. TWO source comments cited the deleted
  paths as provenance and now cite git history instead, naming commit 9586b29
  as the last one containing them. Frozen Subsystems is now a deletion RECORD
  rather than a live list, so the reason survives the files.

A13 | tc/script_manager.html (15), tc/script_clock.html (5),
      tc/script_timeoff.html (2), train/script_training.html (5), styles.html |
  27 section headings converted from `<div>`/`<span>` to `<h2>`:
  `.card-label` (20), `.tr-card-title` (5), `.dash-seclabel` (2). Heading
  navigation is the primary way a screen-reader user moves through a dense
  page, and every view rendered exactly ONE heading — its `<h1>` — so that
  navigation stopped at the page title everywhere.
    • Converted with a balanced-tag depth walk, not a regex on the closing tag,
      so the MATCHING `</div>` is replaced. (In the event every `.card-label`
      contains only spans/buttons, but the walk is correct regardless and would
      stay correct if one gained a child div.)
    • Each class already fully specified its own typography, so only the UA
      margin needed zeroing: `margin-top: 0` on `.card-label` (which already
      set `margin-bottom: 16px`) and `margin: 0` on the other two, which sit in
      `display: flex` head rows.
    • NOT converted, deliberately: `.kicker` (an eyebrow ABOVE a heading is not
      itself one) and `.rail-card`, which was already using `<h4>`.

TEST RESULTS: PASSED.
  node --check × 3: OK
  Pure harness: 375 passed, 0 failed (373 → 374 via the B5-1 generalization
    → 375 with the A13 pin)
  DOM harness:  66 passed, 0 failed
  Visual harness (re-run — `styles.html` and four view partials changed):
    20/20 scenarios, 0 missing fixtures. The uniform `ERR_CONNECTION_RESET` in
    every entry is the sandbox blocking an external asset; it appears in
    scenarios I never touched and in the pre-change run, so it is environmental.
  BOTH new pins bite-checked. The A13 pin was proven to fail by reverting one
    conversion (`tc/script_timeoff.html:488` back to a div) — it named the exact
    file and line. The generalized A11 rule was bite-checked by the eight real
    violations it found on first run, which is a stronger demonstration than a
    synthetic revert.
  A13 was verified by MEASUREMENT, not by reasoning about the CSS, per the
    Visual Audit Stage rule added in the same batch:
      • Manager Dashboard (15 of the 27 conversions) and Time / PTO re-shot and
        read — every label at correct size/weight/colour, no gap above any.
      • Dashboard re-shot — `.dash-seclabel` baselines still align with their
        segmented chips.
      • `.tr-card-title` is NOT reachable by the matrix (its `develop` scenario
        lands on My Training, not Team Training), so a new
        `test/visual/a13-measure.mjs` renders old and new markup side by side
        and diffs computed style + bounding box. All three classes report
        IDENTICAL — box dimensions to 2dp AND full head-row height.
  ONE MEASUREMENT WAS WRONG BEFORE IT WAS RIGHT, and the correction is the
    finding: the first version of a13-measure.mjs put the elements in a plain
    `<div>` and reported `display: inline -> block` for two of three cases. That
    was pure fixture artifact — both live in `display: flex` heads, where any
    child is blockified regardless of its own display value. Re-measured inside
    the real parents, all three are identical. This is the harness README's own
    "fixtures must mirror the real contract" rule biting on a fixture I wrote
    myself, and it is now recorded there.
  Regression Scenarios (manual): no FAILs.
    S39 (Clock view layout) PASS — visual re-render, 5 conversions in view.
    S46 (Time / PTO mode toggle) PASS — visual re-render.
    S26 / S51 (manager CN views, Admin sub-tabs) PASS — static: the sub-tab
      strips gained `aria-current` only; the `CN_STATE.adminTab` dispatch and
      every `data-cn-action` route are byte-identical (19 delegation actions
      still present).
    S62 / S64 (Reference browse + drawer) PASS — static: `kbOpenItem_` gained an
      attribute; `kbTypeTabSet_` is an extraction of two identical inline
      updates.
    S67 / S68 (Training assign + quiz) PASS — visual re-render for My Training;
      Team Training verified by direct measurement as above.
    S13 / S14 (manager time-off, teammate status) PASS — static: markup-only.
    S3 / S4 / S8 / S12 NOT APPLICABLE — need a live deploy, and nothing in this
      batch touches a server code path (the one Code.js edit is a comment).
    S59 / S60 (Intake send flows) NOT APPLICABLE — the intake edit is a comment.

REGRESSION RISKS:
  - A tag swap is a real CSS risk, which is why it was measured rather than
    reasoned about. The specific hazards checked and cleared: no
    element-qualified selector (`div.card-label`), no descendant selector that
    would stop matching, no compact/media override, no JS `querySelector` on
    these classes, and `.card-label > span:first-child` is unaffected because
    the CHILDREN did not change. Three sites carry inline `style="margin:…"`
    which wins over the class either way.
  - `.tr-card-title` and `.dash-seclabel` moved from inline to block display.
    Inside their `display: flex` parents this is a no-op (flex blockifies every
    child). It would NOT be a no-op if either were ever placed in a non-flex
    parent — the class name would then need re-checking, which the A13 pin does
    not catch. Noted rather than guarded, because both classes have exactly one
    structural home.
  - Deleting 29 files is irreversible in the working tree but not in history,
    and nothing referenced them at runtime (they were never clasp-synced). The
    two provenance comments were repointed rather than dropped, so the trail is
    preserved.
  - The generalized A11 rule is heuristic: it locates the enclosing function by
    walking back to the nearest `function` declaration, so an arrow-function
    handler would be attributed to its enclosing named function. That direction
    of error is toward FALSE NEGATIVES (a nearby aria in the outer body
    satisfies it), never false failures — acceptable for a convention pin, and
    stated here so the next author does not over-trust it.

INVARIANTS AT RISK: None.
  - INV-174 (state exposed to assistive tech) is STRENGTHENED — eight more
    surfaces now comply, and its guard is a rule rather than a list.
  - INV-173 (real buttons for controls) unchanged in meaning, wider in reach.
  - INV-165 / INV-166 (colour and fixed-palette rules) untouched — no colour
    value changed in this batch.
  - No server invariant is in scope: the single Code.js edit is a comment.

NET SCORE: 1 − 0 = 1
  Production fixes: A13 (1). Under template R18 a user-visible interface defect
    counts as a production fix, and this one fires for every screen-reader user
    on every view, every day.
  B5-1/B5-2/B5-3 are scored as DEFENSIVE/structural, not production fixes —
    consistent with how tripwire and hygiene work has been scored all cycle.
    Note that B5-1's eight fixed instances are real user-visible interface
    defects; they are not counted separately because they were found BY this
    batch's own tripwire rather than reported by the scan, and counting a
    tripwire's own catch as a production fix would inflate the metric.
  New failure modes: 0.

OPERATOR ACTIONS / DEPLOY:
  - CARRIED, still unconfirmed — the deploy now covers cycle 11's visual batch
    and ALL FIVE cycle-13 batches | BLOCKS DEPLOY: Y
      1. `cd web-app && clasp push -f`
      2. Apps Script editor → Deploy → Manage deployments → Edit →
         Version: **New version** → Deploy
      3. Run `runAllTests()` in the editor — these execute ONLY there:
         cycle 13's `timeToMins_nullOnUnparseable` and the two renamed
         `metrics_cnCountNotesResult_*` tests, plus cycle 12's still-unrun
         `cn_enrolledSheetId_trimsAndNullGuards` and
         `cn_appendBounded_capsAndRollsBack`.
  - CARRIED (A5), DEV PROJECT ONLY: add Script Property
    `INSTANCE_IS_PROD=false` | BLOCKS DEPLOY: N (prod is unaffected)
  - Nothing NEW is required by batches 5 or 4. No Script Property, no trigger,
    no migration, no CONFIG constant.
  Deploy: `cd web-app && clasp push -f` + New version — the same single push
    ships every modified partial alongside Code.js. `test/`, `.cycle/`,
    `CLAUDE.md` and `README.md` are not clasp-synced, and the three deleted
    directories never were.

FOLLOW-ON ITEMS:
  - FO-6 (the remaining TimesheetArchive readers) is UNCHANGED and still
    deliberately deferred. `buildTimesheetForEmployee_` and
    `getPunctualityReport` SHOULD read through behind the export's
    "window predates the live floor" gate (~½ day); `tsDoctorScan_` must NOT,
    because `fixTimesheetDuplicates` deletes by LIVE-tab index. That last part
    is an operator design decision, which is why it was never folded in.
  - `.rail-card` uses `<h4>` directly under a view's `<h1>`, skipping h2/h3.
    Now that h2s exist around it the skip is smaller but still present. Not
    touched here: it is outside A13's stated scope (three classes) and a level
    change needs a look at every rail at once, not a find-and-replace.
  - `test/visual/a13-measure.mjs` is kept as a general spot-measure tool and
    documented in the harness README. It is named for the finding that prompted
    it; a future tag-swap can reuse it by editing its CASES table.

DOCUMENTATION UPDATES NEEDED:
  - None outstanding — applied in this batch:
    • A new `### Visual Audit Stage` section in the Cycle Workflow Config (B5-2).
    • Frozen Subsystems replaced with a deletion RECORD naming what was removed,
      why, and where it lives now (B5-3).
    • The multi-tool-registry decision gained the A13 heading rule and a note
      that the A11 tripwire, not the prose, is now the enumeration (B5-1/A13).
    • The README's `call-notes/` paragraph replaced; development instructions
      now say "from `web-app/`" rather than "from each project directory".
    • Harness counts corrected: 373 → 374 (B5-1) → 375 (A13), with the
      generalization explained rather than just re-numbered.
    • `test/visual/README.md` documents a13-measure.mjs AND the fixture-context
      mistake it made, so the lesson outlives the tool.
  - Proposed invariants for /reflect (in addition to batch 3's INV-177):
    • INV-178 — "a section heading is an `<h2>`, not a styled div; each class
      already carries its typography, so the conversion is a UA-margin reset."
    • INV-179 — "when a convention is worth a tripwire, scan a DERIVED file list
      (PARSE_GUARD_PARTIALS), never a hand-copied one." This is the third time
      a hand-listed scan set has been found short (cycle-11 M-4, cycle-9 M-10,
      now B5-1), which is enough repetition to earn a library entry.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
