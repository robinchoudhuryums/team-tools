---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Tier 1 roster-block capabilities (operator-requested,
2026-08-11 follow-on to the ```roster block):
 T1-a | Group by capability instead of team (cross-team "who can do X")
 T1-b | Click a person -> detail panel (every team they are on)
 T1-c | Click a tag to filter to it
 T1-d | Stable, unique deep-link ids for people and teams
 T1-e | Coverage summary (facts only, no staffing verdict)
 T1-f | Org/tree view — ASSESSED AND NOT BUILT (see FOLLOW-ON)

Files modified: web-app/kb/script_kb.html, test/client/run.js, CLAUDE.md

CHANGES:
T1-a | kb/script_kb.html | kbRosterBodyHtml_(data, mode) dispatches three views
       (teams / capabilities / coverage) over ONE parsed source; the source
       rides on the root as data-src so a mode switch re-renders the body
       without re-running kbMd_ over the whole article. Segmented control is a
       real role="tablist" with aria-selected kept in step (INV-174).
       kbRosterCapabilitiesHtml_ regroups by tag ACROSS teams — the question
       the team-shaped sheet structurally cannot answer.
T1-b | kb/script_kb.html | kbRosterPeopleIndex_ folds a person appearing on
       several teams into ONE entry with all their places/tags/badges.
       Clicking a name opens kbRosterOpenPerson_ (a panel listing every team);
       Copy moved into the panel so both actions stay one click from the name.
T1-c | kb/script_kb.html | Tag chips become real <button>s when clickable
       (INV-173) and drive the same filter box a rep would type into.
T1-d | kb/script_kb.html | id="kb-p-<slug>" / "kb-t-<slug>"; repeats take the
       -2/-3 dedup walk kbMd_ uses for duplicate headings, first occurrence
       canonical.
T1-e | kb/script_kb.html | kbRosterCoverageHtml_: counts, a per-capability
       table (people / teams / who), single-point-of-contact rows, and the
       teams with no lead marked. NO staffing verdict — the block has no idea
       what the target headcount is (INV-187). Never filtered: filtering an
       aggregate would report totals describing a subset.
 --- | test/client/run.js | +5 pins (people index, three views + no-verdict
       scan, exact tag matching, unique-and-canonical ids, tablist ARIA +
       distinct-people count). 7 mutations bite-checked.
 --- | CLAUDE.md | Roster KDD extended with the Tier 1 contract, the three
       measured defects, and the org-chart decision; operator note + test
       narrative 467 -> 472.

THREE DEFECTS FOUND AND FIXED WITHIN THIS BATCH (all by measuring, not reading):
 1. The people count MIXED UNITS — distinct people on first paint, visible ROWS
    after a filter or mode switch — so a 46-person roster read "49 people" in
    the capability view, where a person appears once per tag. Now counts
    distinct data-names in every mode.
 2. A tag click filtered by SUBSTRING. The single-letter tags this data uses
    ("C", "P") also matched "Medical Review" and "Insurance Change": clicking
    "C" returned 42 of 46 people. Tags now ride pipe-delimited in data-tags and
    a `tag:` query matches exactly (clicking "C" now returns 7, matching the
    Coverage table).
 3. A person on two teams produced DUPLICATE DOM ids — invalid, and it breaks
    the very anchors the ids exist for.

TEST RESULTS: passed. Pure harness 472/472, DOM 69/69, node --check clean.
Visual matrix re-run in full: 39 scenarios, 0 missing fixtures, 0 overflow;
all five Reference scenarios unchanged. Dedicated roster shots taken at 900px
and 400px for all three views + the person panel + the tag filter (0 overflow
in every one).

REGRESSION SCENARIOS (Test Command is `manual`):
 S62 Reference browse/search/article/embed | PARTIAL-PASS — the markdown and
   fence paths are covered by the Node pins (a ```roster fence renders the
   block; an ordinary fence still renders <pre><code>; surrounding markdown
   unaffected) and by the five clean Reference visual scenarios. The
   add/edit/delete and Drive-embed halves need a deployment to walk.
 S63 Doc->article converter | NOT APPLICABLE — Code.js untouched this session.
 S64 KB drawer | PARTIAL-PASS — the block was measured at 400px in all three
   views (0 overflow). The drawer's own lifecycle is unchanged.
 S65/S66/S71 | NOT APPLICABLE — upload, AI guidance and review-due paths
   untouched.
 S1/S2 Apps Script suites | NOT APPLICABLE — no server file modified.

REGRESSION RISKS:
 - kbRosterCopy_ now reads data-name (was data-copy) and is reached from the
   panel rather than the person row. Its only callers are in this block; the
   pin was updated with the change, not after it.
 - kbRosterPersonHtml_ gained two params (ctx, seen). Both optional; omitting
   `seen` restores the pre-batch id behaviour, so no caller outside this file
   can be affected — there are none.
 - The Teams view is byte-comparable to before except for the added
   data-name/data-tags/id attributes; verified by re-shooting it.

INVARIANTS AT RISK: None.
 INV-193 upheld — the escape boundary is untouched (the inert/attribute pins
   still bite); all new interactive markup is drawn by app code around already
   escaped text.
 INV-173 upheld and extended — clickable tags and mode tabs are real buttons.
 INV-174 upheld and extended — the new switcher is a tablist with aria-selected
   maintained on every transition.
 INV-187 explicitly honoured — Coverage reports facts and refuses to state a
   staffing verdict it cannot support.
 A2 — the two new grids are intrinsic (auto-fit/auto-fill) and no compact
   override was added, so no breakpoint obligation is created; measured 0
   overflow at 400px regardless.

NET SCORE: 0 production fixes − 0 new failure modes = 0
 (Feature work, not defect repair: nothing here fixes a bug in the deployed
 app. The three defects above were introduced and closed inside this batch, so
 they are honestly neither production fixes nor shipped failure modes.)

OPERATOR ACTIONS / DEPLOY:
- None. No Script Properties, triggers, migrations or endpoints. | BLOCKS DEPLOY: N
Deploy: Client (Reference views) — cd web-app && clasp push -f, then Apps
Script editor -> Deploy -> Manage deployments -> Edit -> Version: New version
-> Deploy.

FOLLOW-ON ITEMS:
- Org/tree view: ASSESSED AND DELIBERATELY NOT BUILT. A node-link chart of
  dept -> team -> person needs ~90px per leaf to stay readable; at 46 leaves
  that is ~4100px of width, so it is unreadable at every viewport the app
  supports and strictly worse than the Teams grid, where the hierarchy is
  already legible. Reported rather than silently skipped — say the word and it
  can be built.
- The roster block is not covered by the visual matrix (the KB fixtures carry
  no roster article), so its evidence is the dedicated shots in this batch. A
  fixture article containing a ```roster fence would fold it into the standing
  39-scenario run.
- Search returns the whole block as one chunk rather than jumping to a
  sub-team, because the block's structure is not markdown headings. Acceptable
  (the rep lands on the filter box), but a per-team anchor in search results is
  possible if wanted.

DOCUMENTATION UPDATES NEEDED: None outstanding — CLAUDE.md updated in this
session (roster KDD Tier 1 contract, the three measured defects, the org-chart
decision, operator-state note, test narrative 467 -> 472).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
