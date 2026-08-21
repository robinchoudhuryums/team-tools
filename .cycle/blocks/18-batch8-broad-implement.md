---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: Batch 8 (completeness gaps)
- Gap A | Offerings browse view — the PMD catalog the PPD engine recommends from was
  readable only by opening the Intake SPREADSHEET, which also holds the PHI submission tabs.
- Gap B | Manager pay-statement UI — getMyPayStatement's manager-gated repEmpId branch has
  been omnibus-pinned since 2026-08-17 with no caller.
- Gap C | Print stylesheet — the app had no @media print rules at all; every modal is
  max-height:86vh, so printing dropped everything past the first screenful.

Files modified:
- web-app/Code.js                        (new rep-callable intakeListOfferings)
- web-app/script_core.html               (intakeCatalog tab in the TOOLS registry)
- web-app/intake/script_intake.html      (Catalog view, CSS, hoisted intakeHttpOnly_)
- web-app/styles.html                    (@media print block; .emp-card-actions row)
- web-app/tc/script_timeoff.html         (manager arg, Print button, .no-print, .pay-stmt-row)
- web-app/tc/script_manager.html         (pay-statement button + delegation; actions row)
- test/client/run.js                     (6 new pins)
- test/visual/mock.js                    (offerings + pay-statement fixtures; liveStatus id fix)
- test/visual/shoot.mjs                  (intake-catalog scenario; matrix 43 -> 44)
- test/visual/print-check.mjs            (new: the print measurement harness)
- test/visual/README.md                  (scenario count)

CHANGES:
Gap A | Code.js, intake/script_intake.html, script_core.html | intakeListOfferings is
  rep-callable, read-only (no lock, no write), and reads Offerings!A2:F ONLY — the same
  product data the engine reads, so no submission tab is touched. Rows with no HCPCS are
  dropped (the engine already treats them as inert, hcpcsNum === 0). Payload-capped at 200
  with the pre-slice total reported (INV-169). New Intake -> Catalog tab: intrinsic
  auto-fill grid (A2_INTRINSIC, no breakpoint owed), seat-type chips + a NAMED search input
  (A14), errorStateHtml_ on both failure paths (A12/INV-175), and an unrecorded weight
  capacity STATED as such rather than rendered as a value — that row is the F9 fail-closed
  state the engine excludes, so a confident blank would mislead.
Gap A | intake/script_intake.html | Hoisted the http(s) scheme whitelist out of the
  recommendation renderer to module scope (intakeHttpOnly_). The catalog needs the same
  guard for the operator-owned pdfLink/imageUrl columns, and a duplicated security
  predicate is the parallel-source class this codebase bans.
Gap B | tc/script_timeoff.html, tc/script_manager.html | openPayStatement_(offset, repEmpId,
  repName) passes the id through; a second button on each manager live-status card opens it.
  repId is assigned on EVERY open, so a manager's own statement cannot inherit the rep they
  last viewed. The live-status delegation now binds Day Edit via .de-open-btn:not(.ps-open-btn)
  — .ps-open-btn borrows the class for its LOOK, and a class-keyed writer treating appearance
  as identity is INV-191. The dialog name says whose statement is open (A14/INV-83).
Gap C | styles.html | @media print: neutral tokens forced with !important (palette blocks are
  (0,3,0) and would out-specify a plain :root — the V-2/V-3 trap); chrome hidden BY NAME
  rather than blanket-hiding <button>, several of which carry data; an open overlay becomes
  the print subject via body:has(.overlay.open); the modal is un-clipped so long content
  paginates. .no-print is the escape hatch for controls inside printed content.

MEASURED (Chromium, not reasoned):
- Print, before: a 2359px pay statement printed 772px — 1587px of payroll data silently
  dropped. After: max-height none, scrollHeight === clientHeight, 0 clipped.
- Print, dark mode: --ink #e8e6e0 on screen -> #111 in print (the white-on-white case).
- Catalog: Captain filter -> K0821,K0823; "k086" -> K0861,K0864 with "2 products of 5";
  no match -> the empty state, not an error card.
- Manager statement: repId passed, "Viewing: Priya Raman", 0 Request-edit buttons (correctly
  suppressed on another rep's statement); own statement afterwards -> repId "", 2 fix buttons.
- Live-status card name column: 33px for a 75px name with both buttons in the top row ->
  105px with the actions on their own row.

TEST RESULTS: passed. Pure harness 576 -> 582 (6 new pins, 20 mutations bite-checked);
DOM 75; visual matrix 44 scenarios, 0 missing, 0 overflow. node --check clean on Code.js,
Tests.js, DevTools.js.
Regression scenarios walked (Test Command is `manual`):
- S7  Manager edit-day — PASS (Day Edit still opens from the card; verified in Chromium
      after the delegation change).
- S59 Intake PPD recommendation cards — PASS (after the httpOnly hoist: https rows render
      image + brochure link + 3 action buttons; a javascript: row renders the no-image
      placeholder and a PLAIN code with no href).
- S79 Pay statement — PASS (own + manager paths, both measured above).
- S46 Time / PTO page — PASS (rail button opens the own statement).
- S25 Compact pop-out — PASS (intake-light-compact 0 overflow with the 5th tab).
- S13/S45/S60 — NOT APPLICABLE (no code path touched).
- S1/S2 Apps Script suites — NOT APPLICABLE off-editor; must run post-deploy.

REGRESSION RISKS:
- The live-status card is ~30px taller (the actions row). Verified at 1440 and 1024; the
  grid is auto-fill so card width is unchanged.
- The Intake tool now has 5 tabs. intake-light-mobile and -compact both report 0 overflow.
- intakeHttpOnly_ is a hoist, not a rewrite — the recommendation renderer aliases it, so its
  body is otherwise byte-identical.
- getMyPayStatement's server contract is unchanged; the client simply stopped omitting an
  argument the server has always accepted.

INVARIANTS AT RISK: None violated. Touched deliberately:
- INV-169 (both new lists report their pre-slice total), INV-175/A12 (both catalog failure
  paths), INV-185 (two fixtures added; one drift FIXED — see below), INV-187 (an unrecorded
  capacity is stated, never rendered as a value), INV-191 (the .ps-open-btn/.de-open-btn
  class-vs-identity split), INV-83/A14 (the statement dialog is named), INV-184 (no dead
  selector: the print block's hooks are derived and checked against the markup), INV-188
  (the hook corpus is comment-stripped).

NET SCORE: 4 production fixes − 0 new failure modes = 4
  (Gap A, Gap B, Gap C, plus the liveStatus fixture drift — see below. The card-name
  truncation was introduced AND fixed inside this batch, so it is not counted either way.)

OPERATOR ACTIONS / DEPLOY:
- None new. | BLOCKS DEPLOY: N
- Carried from Batches 3+4, still outstanding: re-run installAutomationTriggers() (the PTO
  accrual credit moved to 18:00); run runAllTests() in the editor; confirm whether any rep
  genuinely works Saturdays or Sundays (weekends are INFERRED). | BLOCKS DEPLOY: N
Deploy: Server + all client subsystems ship together —
  `cd web-app && clasp push -f`, then Apps Script editor -> Deploy -> Manage deployments ->
  Edit -> Version: New version -> Deploy.

FOLLOW-ON ITEMS:
- FOUND AND FIXED, out of the stated scope but inside its blast radius: the visual
  liveStatus fixture shipped `empId` where the server ships `id`, so every Day-Edit button
  in every manager screenshot ever taken rendered data-emp-id="undefined". Surfaced only by
  CLICKING the new button in a real browser. INV-185 field-name drift, now pinned against
  getManagerDashboard's own return block.
- The A14 ratchet is unchanged at 75/61/116 — the new search input is named, so it does not
  add to the debt. Batch 5B (the 252-control sweep) is still open.
- The pay statement is still only reachable per-rep from the live-status card; there is no
  "all reps for this period" manager export. Not asked for.
- Three pin repairs worth knowing about: the print-hook check failed to bite twice (a hand
  list that passed regardless of the block; then a corpus that included the block itself, so
  a renamed selector was its own evidence) and the .no-print usage assert failed a third time
  because the class was named in the comment explaining it. Each is a weaker-than-the-property
  assertion, and each was caught only by mutating.

DOCUMENTATION UPDATES NEEDED:
- Intake tool description: FIVE tabs now (PPD / PMD Account / PAP Account / Sent / Catalog);
  the "Four tabs" sentence and the TOOLS-count discipline note.
- New invariant or an INV-112 amendment: the Offerings catalog now has a rep-facing
  read-only browse surface, and its PHI boundary (Offerings!A2:F only, never a submission
  tab) is the load-bearing property.
- A new Common Gotcha (or an INV-83/A14 amendment): the app now has a print stylesheet, and
  the two rules that make it work are non-obvious — tokens need !important because palette
  blocks out-specify :root, and chrome must be hidden by name because several <button>s
  carry data.
- INV-185: the liveStatus empId/id drift as a fresh instance, with its lesson — a fixture
  field the CLIENT reads through a data-* attribute is invisible in a screenshot; only
  clicking it surfaces the drift.
- Operator State Checklist: no new state, but the Offerings columns E/F now feed a
  rep-facing browse view as well as the recommendation cards.
- Visual Audit Stage: matrix 43 -> 44 (intake-catalog-light-wide); test narrative 576 -> 582;
  note test/visual/print-check.mjs as the print measurement harness.
- Regression Scenarios: a new S81 for the Catalog browse tab, and S79 extended with the
  manager path + the Print button.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
