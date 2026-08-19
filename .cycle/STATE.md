# Cycle State

## Current
Cycle: 17 — CLOSED (reflected, `.cycle/blocks/17-a-reflect.md`; metrics row
appended). Between-cycles OPERATOR WORK continues on the branch (see below);
cycle 18 has not opened. When it does, it should be the DUE Seams &
Invariants audit (counter 4/4); move this cycle's block to HISTORY.md at that
point. NOTE the library is at INV-191 — the 2026-08-11 pilot-feedback round
wrote 189/190/191.
Phase: idle (post-reflect) + operator-requested feature work:
- Operator feedback rounds 1–3 (2026-08-06): pop-out fit-to-template;
  combined color-coded Spanish Inbox; Dept Requests rebuilt on the Spanish
  vocabulary + dept filter (commits 3215f45, ebd1cab, 395c554). Pure 436.
- Metrics improvements #1–#10 (operator-approved, ALL TEN implemented —
  `.cycle/blocks/18pre-metrics-improvements-broad-implement.md`): range-mode
  trend fill, unified preset+Custom controls, diagnostics disclosure, target
  line + threshold-aligned banding, transfer rail rows, coverage CTA,
  best/worst chips, multi-day team trend (INV-66 amendment), rep
  drill-through, copy-table TSV. Pure 446, DOM 69, 8 bite-checks, full
  39-scenario matrix 0/0, banding + [hidden] fix verified by MEASUREMENT.
  /sync-docs for BOTH the feedback rounds and this batch is **DONE**
  (INV-66/129/180 amendments, Phase-1 opt-out caller note, metrics KDD +
  pop-out KDD + DR KDD + Spanish Part-A additions, S25/S41/S42/S74 updates,
  Visual Audit Stage 37→39, test narrative →446, the new [hidden]-vs-display
  gotcha, the no-new-operator-state entry, visual README count). Merged as
  **PR #155** (be53a61); branch restarted from main.
- Operator round-2 follow-ups (2026-08-06, post-#155): (a) the Dashboard
  Team/Department card shows the team aggregate at ANY cohort — operator
  decision; `getDashboardMetrics` MIN_COHORT 3→1, cache `dash_metrics_v2`,
  client null-team message now reads "no data"; INV-124's My Stats per-day
  series guard UNCHANGED and pinned to stay 3 (scope amendment written into
  INV-124 + the Dashboard KDD). (b) List-swap motion: `animateListSwap_`
  (script_core) + `.swap-in`/`listSwapIn` (styles.html, opacity/transform
  only, reduced-motion-neutralized) wired at the DR status + dept chips,
  Spanish tabs, and the Team Metrics scope switcher; keyframes property
  whitelist pinned. Pure 448 (2 new pins, 3 bite-checks), DOM 69, full
  39-matrix 0/0; animation + hidden-message verified by MEASUREMENT
  (computed animationName + stagger). Docs synced in the same commit.
  Merged as **PR #156** (f7bf58f, CI green); branch restarted from main.
- Team-member onboarding (operator request 2026-08-07, PRE-PILOT — the
  operator distributes the app to pilot reps next week): Manage → Admin →
  Config → **Team Members**. Three NEW admin-gated endpoints (INV-136 35→38,
  doc-count net updated in the same commit): `addEmployee` (locked;
  validate-under-lock via the pure `empValidateNewEmployee_` — unique
  email/ID/NAME, no TEST_ ids, tz shape, dept whitelist, H:mm-H:mm-only
  schedule, managerEmail ∈ MANAGER_EMAILS, second-biweekly-anchor reject
  INV-18; appends the 15-col row, invalidates roster cache, audits
  `EmployeeAdd`, optional Call Notes provisioning AFTER lock release),
  `offboardEmployee` (clears ONLY the email — INV-183 convention; self-guard;
  audits `EmployeeOffboard`), `getOnboardingPanel` (readiness: notes/manager/
  tz/CDR-seen + alias suggestion via cdrLikelyNameMismatches_; CDR
  best-effort). Client panel (form + readiness chips + offboard) in the cn
  Admin partial; getOnboardingPanel fixture added (INV-185); omnibus gate
  cases + ADMIN_GATED entries added to Tests.js (F9). Pure 450 (2 new pins,
  4 bite-checks incl. the F7 doc-count net), DOM 69; panel render verified by
  measurement + element screenshot. Docs: new KDD + operator-checklist entry
  + S75 scenario + INV-136 count updates. Merged as **PR #157** (a7b1186).
- Onboarding follow-ups from PILOT TESTING (operator reports 2026-08-08), both
  merged: **PR #158** (c10d767) — `addEmployee` reported FAILURE after a
  successful append (every post-append step sat under the one outer catch;
  `provisionCallNotesSheet`'s waitLock is outside its own try and throws on
  timeout), so a retry hit a phantom duplicate. Now: `appended` flag →
  success-with-warning, post-append bookkeeping individually best-effort,
  provisioning try/caught at the call site, conflict labels name the owning
  row, client double-submit guard. **PR #159** (e3bf86c) — the report's ACTUAL
  cause: a HAND-STUBBED row (ID + name typed into the sheet, no email) reserves
  the ID while `empRosterEmail_` hides it from every in-app list. Conflict
  labels now say the owner has no login email + both resolutions; the panel
  splits email-less rows into offboarded (kept roster data) vs incomplete.
  **PROCESS NOTE: the first diagnosis (#158) was WRONG about this report** —
  the row's SHAPE disproved it (no code path writes an ID with a blank column
  A). #158's fix stands on its own merits; the correction is recorded in the
  KDD so the wrong causal story is not re-derived.
- Pilot-feedback round (operator 2026-08-11, from testing the deployed app —
  three notes, all three implemented): (1) **Reminders are now a SHELL
  capability** — break reminders fired only on the Clock tab, so the pinned
  Call Notes pop-out never showed one; `remindersTick_` (60s, boot-started)
  owns them, plus a synthesized Web Audio chime (on by default), a best-effort
  desktop notification (expected to be REFUSED — cross-origin iframe; the
  toggle says so), a sidebar/mobile-header Alerts row, the `umsNotify` key
  (15th), and a new still-clocked-in nudge (refreshes getEmployeeState at most
  1×/10min, ONLY in the shift-end+5..+120min window; an unknown punch state
  never nags). (2) **Onboarding panel split** — `getOnboardingPanel` no longer
  reads the CDR Report (that 7-day foreign-spreadsheet read was the whole
  panel's latency); `getOnboardingCdrReadiness` is a second-stage admin-gated
  endpoint (INV-136 38→39, doc-count net + gate case updated in the same
  commit) and the client patches `data-cdr-name` chips; `cdr:{deferred:true}`
  ≠ `ok:false` ≠ "no calls" (INV-187). The readiness list became a `.cn-ob-grid`
  column grid (900px stacking breakpoint; the alias column is the wide one; the
  action track is minmax'd because the caller's own row shows a "you" chip).
  (3) **`.compact-header` RETIRED** — the tool-name strip repeated the pop-out
  window title and the tab bar below it, costing ~44px at the top of the app's
  smallest window; helper + 12 render sites + CSS removed (INV-184), the
  manager `#mgr-refresh` control preserved. TWO defects found by MEASUREMENT
  while verifying: the boot theme reflector wrote aria-pressed across the whole
  `.sb-theme-btn` CLASS and silently reset the sound toggle every load (now
  `[data-theme-target]`-scoped — INV-191), and `.toolbar-tabs` overflowed the
  page 25px at 390px (now scrolls internally). Pure 455 (5 new pins, 10
  bite-checks), DOM 69, full 39-matrix 0/0.
- Branded-email restyle (operator 2026-08-11, second request of the day): the
  shared `buildBrandedEmailHtml_` + `brandedKvRows_` were restyled onto the
  dept-email identity — UMS mark over a navy rule ON THE CARD (never on a navy
  fill: `logoUrl` is a transparency-free JPEG), a real 22px heading with a
  tone rule replacing the 11px mono chip + 9px dot, the navy-tinted detail
  table replacing two columns of plain text, and `subLabel` (module name,
  default EMPTY) replacing the generic "Notification" eyebrow. New
  `statusLabel` option; the long-unused `ctaUrl`/`ctaLabel` are now wired
  through the new `safeWebAppUrl_(tabKey)` (returns '' → the wrapper drops the
  button rather than shipping a dead one). Every branded caller now passes a
  module eyebrow. Verified by RENDERING each email and looking (no matrix
  scenario covers server-built mail). Pure 457 (2 pins, 6 bite-checks), DOM 69.
- Sheet→article converter (operator 2026-08-11, third request of the day —
  "a better version" than embedding a roster spreadsheet in Reference):
  `kbConvertDriveSheet` + the pure `kbSheetGridToMarkdown_`. The motivating
  facts are structural, verified in source: an embed is a TITLE-ONLY search hit
  and the Ctrl/⌘+K drawer cannot host an iframe, so an embedded roster is
  invisible mid-call; the /preview iframe also needs each REP's own Drive
  access. Shape-detecting conversion (table vs banded grid). THE bug worth
  remembering: banded rosters partition by COLUMN, so the first implementation
  merged two sub-teams into one line (PPD's people shown as covering MDO) —
  fixed by making headers claim column ranges; and the band test had to become
  "spans the used width" after a 3-col sub-team merge cleared a 60%-of-6 ratio
  bar. Both found by RUNNING the converter on a reconstruction of the
  operator's sheet, not by reading it. Manual/review-before-save by design so
  the eventual "app becomes the source" migration is not fought by a re-sync.
  Pure 462 (5 pins, 6 bite-checks), DOM 69. INV-192 written; INV-136 39→40.
- Interactive roster block (operator 2026-08-11, follow-on to the Sheet
  converter — "could it be executed in a better way with more features"):
  ` ```roster ` fence → filter-as-you-type directory with tag tooltips,
  click-to-copy, lead/new/badge chips. Follows the ```snippet precedent, so
  the kbMd_ escape boundary is untouched (article bodies still cannot carry
  HTML). kbConvertDriveSheet emits the block for a banded sheet by default.
  THREE bugs worth remembering, all found by RUNNING it: the fence content is
  pre-escaped so `&` arrives as `&amp;` and the tag split mangled "C & ATP";
  the global :focus-visible ring is a box-shadow token, so a per-element
  `outline: var(--ring-focus)` was both wrong and redundant; and
  `assert.deepStrictEqual` compares prototypes, so a vm-realm array fails
  against a plain [] even when equal (compare by value). Pure 467 (5 pins, 8
  bite-checks), DOM 69. INV-193 written.
- Roster block Tier 1 (operator: "what else is possible from here?" →
  /broad-implement Tier 1) — `.cycle/blocks/18pre-roster-tier1-broad-implement.md`.
  Three views over one parsed source (Teams / Capabilities / Coverage) via a
  real tablist; person detail panel; exact `tag:` filtering; unique
  deep-link ids. Coverage states FACTS ONLY — no staffing verdict (INV-187).
  THREE defects found and closed inside the batch, all by measuring: the
  people count mixed distinct-vs-rows (read "49 people" for 46), a tag click
  filtered by substring so "C" matched 42 of 46, and a person on two teams
  produced duplicate DOM ids. Pure 472 (5 pins, 7 bite-checks), DOM 69,
  full 39-scenario matrix 0 missing / 0 overflow. Org/tree view assessed and
  NOT built (~4100px needed for 46 leaves — worse than the grid at every
  viewport); reported as a follow-on, not silently skipped.
- Roster CHART view (operator follow-up: "does progressive disclosure help
  with the visual concentration issue?" — it does, and the earlier NOT-viable
  assessment was reasoning about a STATIC chart). Node-link tree, collapsed by
  default, people stacked vertically inside a team so expanding costs height
  not width; own scroll container; shows structure NOT reporting lines (the
  data has no person-to-person edges) and says so. Four defects found by
  measuring — count read "0 people", connector rail left the flex gap unlined,
  the notes scrolled away INSIDE the scroller, and two dept boxes overflowed
  400px collapsed. Pure 476 (4 pins, 10 bite-checks incl. two re-written for
  biting too weakly), DOM 69.
- FIRST DEPLOYED-SCREENSHOT round (operator, 2026-08-11, post-#163). Three
  things: (1) **a SHIPPED defect** — `kbChunkTruncate_` cut inside the roster
  fence and "repaired" it into a valid-but-half block, so the live search
  result showed 10 of 14 teams and "40 people" for a 46-person roster; fences
  are now atomic. (2) **A SECOND shipped defect the pins could not see** —
  `>` arrives from kbMd_ as `&gt;`, so `team| A > B` parsed as one team named
  `A &gt; B` with an empty sub; it LOOKED right because the entity displays as
  `>`, and the pins fed RAW text instead of the production contract. All roster
  pins now escape input via `rosEsc()`; separators match both forms; lookups
  normalise via `kbRosterKey_`. (3) Operator asks: Expand (ensureOverlay,
  near-full-viewport — the Reference reader is height-capped) and a **Flow**
  view for the order process, which appears ONLY when a `flow|` line exists and
  is NEVER inferred from the sheet layout. Pure 480, DOM 69, 11 bite-checks.
  **OPEN QUESTION FOR THE OPERATOR: the actual order sequence.** The sample
  article ships a clearly-labelled DRAFT flow; the real one is theirs to state.
  RESOLVED: the operator supplied their training diagram, and the block now
  takes `phase|`/`step|` (branches, decisions, loop-backs, phases, external
  feeds). Edges are MEASURED from the laid-out boxes rather than laid out by an
  engine. Classify by LEFT edges — source-right-vs-target-left called 8 of 14
  same-column steps loop-backs. Pure 482.
  Operator corrected the data (Sales → PPD, plus a Sales → Qualifications
  BYPASS of phase 1) and caught a rendering lie: stacking PAR/Appeals/Approval
  drew plain verticals that read as a required chain through Appeals. Fixed by
  making adjacency decide step-vs-skip (skips arc, phase-bypasses arc above)
  and anchoring every edge at its source so upward arrows point at the target.
  Pure 483.
  Final operator round: MA Education ⇄ Appointment Needed is a LOOP (reciprocal
  edges now get one lane each way), and the Qualifications evals are OPTIONAL +
  PARALLEL with an AND-join at PWC Verification (`*join` states "waits for
  every applicable path"). The edge classification was extracted into the PURE
  `kbRosterEdgeKind_` — every drawing bug lived in that decision and none of it
  was testable inside a function needing real layout. Pure 484, 6 geometry
  decisions bite-checked. Operator approved PR + merge. MERGED as PR #164.
- GLOSSARY block (operator pick from the post-merge enhancement list): a
  ```glossary fence renders a filterable definition list and annotates the
  FIRST mention of each term elsewhere in the same article (dotted underline +
  hover/focus definition). ALL-CAPS terms match case-sensitively so "par" is
  not PAR; longest term first; duplicate definitions refused; TEXT-NODE walk
  (the kbHighlightTerms_ pattern) so it cannot damage kbMd_'s output. Wired
  into both the Reference reader and the drawer. Pure 487, 8 bite-checks.
  Scope limit: annotation is within the defining article — app-wide linking
  would need a designated article + Script Property, deliberately deferred.
- DECISION / task-guide block (operator: "guide me through a task, with actions
  at the leaves"). ```decision fence: ask|/opt|/do|/todo|/note|, first ask is
  the root. One question at a time, crumb trail (each a button back to that
  question), tickable steps at the action. Reports the three unwalkable-guide
  errors — dangling option target, branch unreachable from the root, question
  with no answers — rather than dead-ending a rep mid-call. Ticks never carry
  across a re-render. Pure 492, 9 bite-checks. Verified in a browser: full walk
  + crumb-back + tick.
- INTAKE EMAIL RESTYLE (operator: "the PPD intake form email is still the same
  email style as it was before the web app… maybe in the vein of the call
  notes / branded restyle"). `intakeEmailShell_` now mirrors
  `buildBrandedEmailHtml_`'s chrome (mark on the card over a navy rule, mono
  module label `Intake · PPD|PMD|PAP`, 22px heading + short brand rule, mono
  footer); the shared `intakeSectionRowHtml_` replaces both bodies' solid-navy
  centred-white bars with the app's kicker vocabulary (mono-uppercase on
  navyTint, left-aligned); Q/A rows moved from bordered grid + strong blue
  zebra to hairline separators + quiet zebra. Recommendation cards, answer
  tones and the raw-`justification` exception untouched. Verified by RENDERING
  before/after (no matrix scenario covers server-built mail) — same method as
  the branded restyle. Pure 494 (2 pins, 10 bite-checks), DOM 69.
  **Operator-visible caveat recorded in the KDD + checklist:** the PPD body
  feeds `intakeBodyHash_`, so a preview taken pre-deploy and sent post-deploy
  is rejected with "The form changed since you previewed it" (INV-111 working
  as designed; one page load wide).
- The glossary block, the decision block and the intake email restyle are
  MERGED as **PR #165** (35eb721, CI green); branch restarted from main.
  Deploy remains ONE operator action for all three.
- OPERATOR ROUND 2026-08-12 (three notes from the deployed app): (1) **clock-card
  photo + moon RETIRED** — the whole `umsClockBg` upload path, `.clk-bg-*` /
  `.has-bg` / `.clk-hero-bg` / `.clk-moon` selectors, `clkMoonPhase_` and the
  shade-disc render are gone (INV-184); the star field + shooting star SURVIVE;
  localStorage keys 15 → 14. (2) **Dashboard KPI banding + MTD deltas** — both
  cards open on MTD (derived index, applied to BOTH because two adjacent cards
  on different periods reads as a bug); `dashPctTone_` tri-tones ONLY the two
  rate metrics, thresholds SHIPPED not mirrored, a null target = no tone (a
  colour is a verdict and Transfer % had no threshold in the app before —
  `CONFIG.CDR_TRANSFER_TARGET_PCT` default 20 is the ONE number the operator
  should confirm); MTD deltas compare the prior month's SAME ELAPSED DAYS
  (`dashboardPrevRange_`, clamped DOWN) because 12 days against 31 is an
  artifact, volumes get the arrow but no verdict, the foot NAMES the window,
  and a failed comparison says so + is never cached (INV-129/187). Cache
  `dash_metrics_v2`→`v3`. (3) **Reminder toasts are STICKY** (INV-190
  amendment) — the chime calls the rep back after the 3.5s window has passed;
  real ×, cap evicts routine toasts first, every 2-arg caller untouched.
  Pure 494→500, DOM 69→71, 27 bite-checks. MEASURED, not reasoned: the
  banding/deltas were rendered and read back (tones, delta text, foot label,
  overflowPx 0, dark parity), which is how the flex-end mixed-row misalignment
  (a delta-less KPI's label sitting 14px low) was found and fixed; full
  39-scenario matrix re-shot 0 missing / 0 overflow. ONE pin was rewritten for
  biting too weakly (it asserted the star class existed SOMEWHERE rather than
  that the decor still emits it).
- COLOUR PALETTES (operator 2026-08-12, "so users can choose a different color
  scheme"): `data-palette` — a SECOND attribute overlay orthogonal to
  light/dark, four options (Console default / Sand / Plum / Teal), picked from
  a swatch row in the sidebar + mobile header, `umsTheme` (key count back to
  15), no server state. TWO rules make it safe and both are pinned: a palette
  may redefine ONLY neutrals + accent (never a semantic colour — green still
  means resolved in all four), and every colour is a hue rotation at CONSTANT
  WCAG luminance, so every measured contrast ratio is preserved BY
  CONSTRUCTION. Specificity is load-bearing (a bare :root[data-palette] ties
  with the base dark block at (0,2,0) — the V-2/V-3 trap); the :not()/paired
  forms are (0,3,0), verified in Chromium. THREE defects found by MEASURING,
  none visible in review: the generator reused LIGHT-mode chroma so every
  palette's dark card collapsed to the same neutral grey; the accent-ring
  swatch made Console and Sand indistinguishable at 14px (now a split disc);
  and inserting the Palette row between the two .sb-theme rows broke their
  adjacency rule, so flex pushed Alerts to the sidebar bottom with a ~200px
  hole — the exact defect that rule's comment describes. The AA tripwire was
  REWRITTEN from "two hex declarations, light then dark" to a derived block
  scan, and the V-1 hue-drift pin now runs per palette. Pure 500→507, DOM 71,
  13 bite-checks, full 39-matrix 0/0. A new harness coupling was pinned: the
  jsdom boot stubs every window.* index.html defines (adding
  setTimeClockPalette silently broke 19 DOM tests).
  FOLLOW-UP (same day): operator asked whether each palette has its own dark
  mode (it does — every palette is a light block PLUS a dark block) and for a
  sage/light-green option. **Sage** added: green-tinted paper (nScale 3.4) +
  a DESATURATED green accent (chroma 0.070 vs Console's 0.132) at the same
  luminance — a literally lighter accent is impossible under the
  constant-luminance construction and would fail contrast as a button fill
  under white text, so the character comes from the paper + desaturation.
  Adding it needed NO test edit: all seven palette pins are derived, and two
  Sage-specific mutations were bite-checked to confirm the scan reaches it.
  NOTE: the container rolled back TWICE mid-session and lost the palette
  commits locally; the remote had them both times, and
  `git reset --hard origin/<branch>` recovered cleanly. Push early — the
  remote was the only surviving copy.
  MERGED as **PR #166** (ba358ee, CI green) together with the 2026-08-12
  round (clock cleanup / dashboard banding + deltas / sticky reminders);
  branch restarted from main. Deploy remains ONE operator action.
- OPERATOR LIST 2026-08-13 (seven items, phased). PHASE 1+2 IMPLEMENTED:
  (1) copy-scope fix — the #cn-frame blanket ⌘C intercept inverted into a bug
  once fields became contenteditable (selections carry text now); a real
  selection copies natively, collapsed-⌘C keeps the full-template gesture.
  (2) umsCallNotesLastDept REMOVED (reader+writer+KB-AI facet piggyback;
  keys 15→14) — pre-selecting the previous note's departments invites a
  mis-send. (3) Dashboard load: shapeWindow derives own from the team map
  (halves cold CDR reads); client paints on FIRST period arrival, pending
  slides are skeletons (never "No call data" — INV-187), later arrivals
  patch their slides (a full re-render would duplicate the extras RPCs).
  Verified with a staggered mock (~300ms paint, YTD skeleton→swap).
  (4) activity-without-clock-in reminder: shift window + 15min grace + real
  input in 5min + CONFIRMED-out snapshot (stale 'out' refreshes first;
  confirm stamp only in the SUCCESS handler); once per rep-local day.
  (5) auto-tag: admin-editable keyword→tag rules (CN_AUTO_TAG_RULES, seeded
  from update types — OPERATOR SHOULD REVIEW THE LIST), matched client-side
  on the suggestion debounce; removal dismisses the rule per note; INV-136
  40→41 (saveAutoTagRules; F7/F9 nets + Tests.js omnibus updated).
  (6) intake feedback loop: "Send feedback" button on all three intake
  emails → ?intakefb= doGet page (signed-in; submitIntakeFeedback
  re-auths) → append-only IntakeFeedback tab in the Intake PHI store →
  "Recipient feedback" block in the Sent detail. CTA minted pre-send,
  final-body-only (INV-41 untouched), no-URL→no-button.
  Pure 514, DOM 71, 32 bite-checks (4 pins strengthened for not biting).
  ANSWERED, NOT BUILT: (7) Google-Maps warehouse distances — needs the
  warehouse ADDRESSES + a decision (haversine vs Distance Matrix API w/
  billing); (8) article images — should already work (kbMd_ ![](…),
  Phase 2b/3); likely the KB Images folder sharing policy — operator to
  report what they see; Offerings catalog view offered as the follow-on.
- OPERATOR FOLLOW-UP 2026-08-13 (items 7+8 resolved + BUILT): operator chose
  Tier A ("don't want any cost/billing") and confirmed the image symptom is
  the Workspace link-sharing block ("blocking message with open-in-drive
  link"). (a) **Article-image fallback**: kbGetImageData (rep-callable,
  read-only, NO lock; the file's PARENTS must include KB_IMAGES_FOLDER_ID
  BEFORE bytes leave — without that check any employee could read any
  deployer-visible Drive file by id; every refusal is the same generic
  'Not available.'); client = ONE document-level CAPTURE-phase error
  listener over .kb-article imgs, drive-thumbnail-src-only, retry-guarded,
  session-cached with pending fan-out + 'failed' marker. Covers every kbMd_
  render site (both readers, chunks, training/empdocs, What's new) with
  zero per-site wiring. (b) **` ```map ` warehouse block (Tier A)**:
  wh| Name: Address fence → directory + keyless output=embed toggle
  (aria-expanded) + nearest lookup via the FREE built-in Maps.newGeocoder()
  (no key, no billing, zero UrlFetchApp); kbHaversineMiles_ pure +
  Node-pinned; straight-line stated as such with a Directions link for the
  drive figure (INV-187). Privacy split: warehouse geocodes persist
  (KB_MAP_GEOCODE_CACHE, hashed keys, self-resets >200); the QUERY is never
  persisted/audited/logged (may be a patient address; UI asks for ZIP).
  Escaped-contract parse (rosEsc-fed pins), %26-not-&amp; URLs, esc-on-
  read-back. Pure 520 (+6, 8 bite-checks), DOM 71, measured in Chromium
  (map-check.mjs: structure/lookup/embed-aria/400px-no-overflow/fallback
  swap incl. fan-out + external-img untouched). Docs synced (2 KDDs, the
  Script Property entry, operator-checklist round entry, test narrative).
- OPERATOR TESTING ROUND 2026-08-13 (post-redeploy, five notes — ALL FIVE
  RESOLVED): (1) Settings gear + flyout — the three sidebar rows (Theme/
  Palette/Alerts) consolidated behind one gear (sidebar + mobile header,
  data-settings-toggle attribute-keyed, INV-191); panel at SHELL ROOT
  (mobile reachability), [hidden] display companion, capture-Esc +
  stopPropagation; dead adjacency CSS removed (INV-184); gear padding
  MEASURED 10→8px to un-ellipsis "Settings" at 168px (INV-170).
  (2) The 9:30 PM note DIAGNOSED, not a display bug: a blank roster
  Timezone cell falls back to CONFIG.TIMEZONE (Asia/Kolkata) and every
  write (punch/note timestamp/DateLocal) stamps IST — the :30-minute
  offset is the IST signature. OPERATOR ACTION: set their own Employees-row
  Timezone to America/Chicago. Code half: tzMismatchCheck_ compares the
  browser's UTC OFFSET to the roster tz's (offsets never ids; UTC
  sanity-probe gates it) and shows a sticky warn toast once per
  browser-local day (umsTzWarnedDay). (3) Slow tabs: My Stats/Team Metrics
  paint ANY same-key cached payload (the 45s fresh-gate re-showed loaders
  on almost every re-enter) + refresh behind the pill; Spanish seeds its
  whole last round (stats+both lists), head-only refresh swap, background
  halves keep last-good; getTeamMetrics gained the sibling endpoint cache
  (team_metrics_v1:<from>:<to>, org-wide, put gated on
  !noteCountPartial && !transferMeta.error — INV-129). (4) Dashboard:
  first-frame skeleton now holds BOTH pairs (extras no longer pop in),
  extras RPCs start in PARALLEL with the metrics RPCs (extraBusy guard
  makes the second loader call render-only), and umsDashMetrics
  localStorage SWR seeds same-day reloads instantly (complete successful
  rounds only; freshness never inherited — INV-156/129). (5) View-as
  (admin-only, in the flyout): overrides the three empState role flags,
  session-only (nothing persisted), UI-only (server answers with REAL
  access — a preview, not impersonation), fixed-blue banner + exit,
  viewAsReapply_ on all four empState-refresh sites. localStorage keys
  14 → 16 (umsTzWarnedDay, umsDashMetrics; the stale "Fourteen" heading
  audit-counted and corrected). Pure 527 (+7 pins, 12 bite-checks; 2 pins
  updated for deliberate layout changes and re-bitten), DOM 71, FULL
  39-matrix re-shot 0 missing/0 overflow, settings-check.mjs measured the
  flyout/view-as/mobile flows in Chromium. Docs synced (2 KDDs + slow-tabs
  KDD, tz-model amendment, aggregates-cache amendment, checklist entry,
  key-list 16, test narrative).
  /sync-docs pass DONE (stale alt-text-degradation claims corrected in the
  KB_IMAGES_FOLDER_ID entry + S63 + the folder helper's comment; subsystem
  list + visual README gained map-check.mjs). MERGED to main as **PR #167**
  (merge commit eb9651c, CI green both runs); branch restarted from main.
- EMAIL-ALIGNMENT AUDIT (operator question 2026-08-13: "are email templates
  aligned with the web app design?"): all 30 MailApp.sendEmail sites
  enumerated and mapped to their body builders. Result: 19 sites on
  buildBrandedEmailHtml_, the intake trio on intakeEmailShell_, the dept +
  customer/provider/form-submission family on the legacy UMS identity —
  and exactly THREE stragglers: the Call Notes digests (EOD / weekly
  Training+Review queues / Urgent), which share a hand-rolled table builder
  predating the restyle. Two plain-text utility mails (failed-submission
  notice, trigger-install reminder) deliberately left. Operator approved the
  digest move → sendOneRepEodDigest_ + sendManagerFlagDigest_ now wrap their
  items tables in buildBrandedEmailHtml_ (tones warn/danger/info, subLabel
  'Call Notes', real safeWebAppUrl_ CTAs to callNotes/callNotesManage);
  plain-text fallbacks kept. Committed f477e7e. The 2026-08-11 restyle
  claim ("EVERY automated email") corrected in CLAUDE.md.
- PRE-PILOT OBSERVABILITY ROUND (operator 2026-08-13: "error logging,
  immediate notification of problems, detailed user activity … what parts
  of the web app are priorities" before pilot reps start). Three parts:
  (a) errorStateHtml_ now fires the INV-150 beacon (source 'errorState',
  three-value enum both sides) — HANDLED failures reach the operator, not
  only uncaught exceptions. (b) Thresholded push: clientErrSpikeAlert_
  (post-releaseLock — M-7; ≥5 errors/rolling hour → ONE branded danger
  email, 6h CacheService cooldown) + automationProblems_ entry (g)
  (clientErrorsSummary_'s additive last24h ≥10 → health dot + failure
  digest). INV-150's "single benign quirk must not nag" preserved BY the
  thresholds — amendment written into the invariant. (c) Usage telemetry:
  recordViewEnter (rep-gated, USER lock, shape-regexed view key, rate cap
  120/hr/rep) → auto-provisioned ViewUsage tab on the ADP sheet (PHI-free
  Timestamp/EmployeeId/View/Mode); client recordViewUsage_ in showView
  (5-min per-view throttle, VIEW_AS.active previews SKIPPED);
  getViewUsageStats (admin-gated — INV-136 41→42, F7/F9 nets + omnibus
  updated) aggregates via the pure viewUsageAggregate_ (7d/30d, distinct
  reps, top view) behind a Feature-usage panel on Admin → Overview
  (cnUsagePanelHtml_, esc()'d, truncated surfaced, ≤700px breakpoint).
  Pure 527→532 (5 pins, 9 bite-checks — one bite-check-harness lesson: match
  the TEST NAME in ✗ lines, not a section header, or a biting mutation reads
  as NO-BITE), DOM 71, admin scenarios re-shot 0/0, panel measured +
  screenshotted. Docs synced (INV-150 amendment, restyle-claim correction,
  observability KDD, checklist round entry, ViewUsage storage-map + tab
  entries, test narrative →532). CONTAINER ROLLED BACK TWICE this session
  (recovered via fetch+reset; the digest edits survived as a patch re-applied
  onto origin) — commit+push per unit, never batch.
- POST-DEPLOY OPERATOR ROUND 2026-08-17 (seven notes; five implemented +
  committed per-unit, one audited, one proposed): (1) My Stats single-day
  preset renamed Today→Yesterday and repointed at the PREVIOUS WORKDAY
  (mPrevWorkdayIso_, Monday→Friday; default landing + range-trend fill
  follow; Team Metrics keeps Today by operator decision) — 74d558f.
  (2) Cross-window reminder dedupe via the shared umsRemindFired
  localStorage fired-set (main + pop-out each ran the ticker → double
  toast+chime; INV-190 amended; keys 16→17) — 11e1c9f. (3) PPD send footer
  gained Custom email… (the shared resolver validated kind:'custom' all
  along; PMD/PAP parity) — 3cdb6f2. (4) Punch confirms in ONE round trip:
  recordPunch is a thin wrapper attaching state=getEmployeeState() AFTER
  recordPunchCore_'s lock released (M-1 contract intact in the core; client
  applies the riding state, fallback refetch kept for deploy skew) —
  a0fa90c. (5) kbSearchScore_ rebalanced (density +1/extra occurrence cap 2,
  coverage (matched−1)×3, title bonus capped +4/section — the flooding
  mechanism behind "my result was further down"; phrase +3; doc-level
  title-only hits stay uncapped) — a37d8e2. (6) TZ AUDIT (Explore agent,
  full sweep): the mass-punch-adjustment path is CLEAN end to end; one fix
  shipped (S2 — getCallNotesAmbient's week window start was script-tz math
  formatted in empTz; now rep-local UTC-noon anchored) — 0c4d4f7; S1
  (training digest's manager-tz today reaching the rep-facing nudge —
  defensible, fires when zones agree) and S3 (getMonthRange_ correct by
  coincidence, Chicago always behind Kolkata) documented below as latent.
  (7) Payroll self-view: PROPOSED to the operator, not built (hours-only
  statement mirroring the ADP export derivation vs storing pay rates is the
  operator's call). Pure 532→539 (7 new pins + 2 updated for deliberate
  contract changes), DOM 71, 10 bite-checks. No stylesheet changes — no
  re-shoot owed. Docs synced same-commit per unit.
- SECOND ROUND 2026-08-17 (operator follow-up — both built): (1) **Pay
  statement** (operator approved storing pay rates): roster column P
  `PayRate` (EMP.PAY_RATE, ROSTER_CACHE_KEY v8→v9/INV-28; read in exactly
  ONE place — empPayRate_/empPayRateById_, the INV-167/F14 boundary,
  pinned — never on emp objects); getMyPayStatement(offset, repEmpId?)
  caller-scoped with a manager-gated other-rep branch (omnibus case
  targets the PH id — the omnibus runs AS the India rep); pure
  payPeriodRange_ (biweekly = INV-18 org-anchor −14d/period, monthly
  calendar math, clamp 0..6); reuses buildTimesheetForEmployee_;
  estimated gross ONLY with a rate, labeled estimate; archiveNote for
  INV-153-archived periods (INV-187). Client modal off the Time/PTO
  Timesheet rail (seq-guarded nav, A12 error cards, missing weekdays
  SHOWN). (2) **Spanish resolution-share chart**: spanishResolverShares_
  (pure, pinned) over the already-fetched resolved list; server ships
  `members` so idle members render ZERO bars; facts-only (no verdict
  tone, dashed even-split marker); scenario SHOT + eyeballed. Pure
  539→542 (3 pins, 5 bite-checks), fixture updated, spanish-light-wide
  re-shot 0/0. PROCESS: a `git checkout` bite-revert wiped the
  uncommitted pay-statement server block (the batch-⑥ accident class
  AGAIN) — re-applied from context; python inverse edits only, and
  commit the unit before its bite-checks. OPERATOR ACTION: fill
  Employees column P with hourly rates.
  Both 2026-08-17 rounds + the /sync-docs pass (README four-tab Metrics
  currency, S79/S80 scenarios, tz-latents note) are MERGED to main as
  **PR #169** (cac2c0d, CI green both runs); branch restarted from main.
  Deploy remains ONE operator action.
- POST-#169 OPERATOR TEST RUN (2026-08-17): runAllTests reported 119
  failures — ROOT CAUSE was operator data, not code: they had OFFBOARDED
  the TEST accounts in the app (real agents starting; test rows rendered
  beside them on team surfaces), which clears ONLY the email (INV-183),
  and setupTestEnvironment's ID-keyed dedupe never repaired the rows →
  every email-keyed impersonation nulled and cascaded. FIX (5e4e6af +
  pin): setup re-onboards its rows (canonical email restored), cleanup
  re-offboards at the end of every run — self-healing + invisible to
  agents between runs. Pure 543 (1 pin, 2 bite-checks). Docs: gotcha,
  INV-21 amendment, S2. Operator to REDEPLOY + re-run runAllTests.
- NEXT (unbuilt, from the same enhancement list): Offerings reference view (the
  Intake catalog is currently unreachable without running a 46-question intake),
  print stylesheet, per-article owner, inline knowledge check. Operator was
  advised to let pilot usage data pick.
- SEAMS-AUDIT CANDIDATE (for cycle 18, alongside INV-189/190/191): "a
  uniqueness namespace that spans EXCLUDED rows must name the owning row and
  say it is excluded" — recorded as an INV-183 corollary for now.
(Cycle-17 history below is retained until the close-out move.)
Phase (cycle-17 record): implement — the broad scan is COMPLETE. Implemented + doc-synced:
  TOP 5 (`17-top5-broad-implement.md`), BATCH ② (`17-batch2-broad-implement.md`,
  net 8), BATCH ③+④ (`17-batch3-batch4-broad-implement.md`, net 8) — the
  consolidated ②③④ /sync-docs is DONE (commit 9098206). BATCH ⑤
  (server-hardening stragglers) is IMPLEMENTED
  (`.cycle/blocks/17-batch5-broad-implement.md`, net 10−1=9; pure 425, DOM 69,
  bite-checks pass, no stylesheet changes so no re-shoot owed) and its
  /sync-docs is DONE (commit 922a360). BATCHES ⑥+⑦ (structural/growth +
  visual-lens expansion) are IMPLEMENTED
  (`.cycle/blocks/17-batch6-batch7-broad-implement.md`, net 4−0=4 + 1
  structural + 3 harness-capability; pure 433, DOM 69, 7 bite-checks pass,
  FULL 37-scenario matrix re-shot: 0 missing / 0 overflow). Batches ⑥+⑦'s
  /sync-docs is DONE (commit 64007ca). ALL SEVEN cycle-17 batches are
  implemented + doc-synced, and the whole cycle is MERGED to main as
  **PR #154** (merge commit 13eeed2, CI green). Remaining: /reflect to
  close the cycle, and the ONE operator deploy action.
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 4 (cycle 15 was the seams audit;
  16 and 17 have completed since, and cycle 17's reflection closes the fourth
  subsystem cycle. Cadence is every 4 — the NEXT audit should be a Seams &
  Invariants audit, which also owes the library its 3 pending candidates:
  INV-189/190/191 were the cycle-17 reflection's candidates, but the
  2026-08-11 pilot-feedback round WROTE those three numbers for its own
  findings — the audit owes fresh candidates, not those)
Updated: 2026-08-11

## In progress (facts to carry forward — NOT judgments)
- Cycle 16 is CLOSED and archived to `.cycle/HISTORY.md` (this cycle's open).
- The cycle-17 broad scan ran with SIX parallel deep-read subagents + the
  mandatory visual stage (29/29 scenarios, 0 missing fixtures, 0 overflow) +
  an independent re-verification pass of every Medium+ claim (all held, zero
  retractions). Findings: **0 Critical / 1 High / ~10 Medium-band / ~25 Low.**
- The TOP 5 are implemented and bite-check-pinned (pure 407→411, DOM 69,
  `node --check` clean):
  C17-2 (TO.STATUS normalize-once on the balance path),
  C17-7 (three manager lazy cards render error states on both failure shapes),
  C17-5 (CN loaders preserve last-good on structured {error} + failed-round
  freshness invalidation + cold-failure error state),
  C17-1 (A2 tripwire regex now matches `[data-compact="1"]`; styles.html
  contributes real obligations — two new 540px breakpoints for .actions /
  .field-row, five DEAD compact overrides removed, two reasoned allowlist
  entries), and
  C17-6 (exportCallNotesRange carries skippedReps on response + audit row +
  client toast; all-skipped returns a read-failure error).
- The post-fix visual re-shoot was running at checkpoint time — verify
  report.json shows 29/29, 0 overflow, and eyeball clock-light-mobile
  (.actions is now 2-col at ≤540px with the prime spanning).

## Completed this cycle
- BATCH ⑥+⑦ | Code.js, styles.html, metrics/train/cn partials, CLAUDE.md
  (paired loader-gotcha edit), test/visual/{mock,shoot,README}, run.js |
  ⑥: C17-9 one-read-indexed range edit + memoized personal-sheet handle
  (was ~124 full reads + ~124 openById inside the global lock);
  getNextActions_ skips unrecognized punch types (the hand-edit lockout);
  Spanish readers report the 200-thread scan cap (INV-169) + client warning;
  trainLoadMgr_/edLoadMgr_/coachLoadMgr_ INV-156 seq tokens guarding every
  state write; ~240 lines of INV-184 dead CSS deleted (incl. four compact
  halves C17-1's grid-only scan couldn't see) + cnLoadDate_ removed with its
  doc mention. ⑦: mock ?failrpc= forced-failure hook; first Admin scenarios
  (light+dark, full INV-185 fixture set incl. the derived getAutomationHealth
  key pin); dark parity for Reference/Training/Coaching; first three
  error-state shots (A12/INV-175 on camera). Matrix 29→37. 8 new pins, 7
  bite-checks. Pure 433. NOTE: a `git checkout` bite-reversal wiped
  uncommitted Code.js once (the batch-3/4 accident repeated) — re-applied;
  bites now revert via python only, and batches commit before the next starts.
- BATCH ⑤ (10 items) | Code.js, form_public.html, intake/kb/cn partials,
  run.js | C17-12 (form_public conditional sections CLEAR on re-hide — stale
  hidden values no longer enter the hashed immutable record), C17-11
  (mixed dept+'Other' split-send: internal-half bookkeeping preserved on
  external failure — EmailedAt for internal depts, audit row +
  `externalCopyFailed`, DR row live; success-with-warning return + client
  warn toast), C17-13 (Q43 custom-add blocks LEADING negation tokens —
  none/nothing/denies/denied/negative/neg), createFormToken prefill caps
  (recipientName ≤200, prefillData object-only ≤50 keys ≤20k JSON),
  submitFormByToken signature must be `data:image/` (blocks the
  reviewer-browser/PDF-conversion URL-fetch leak), getDepartmentEmails_
  whitelist-rebuild on read + saveDepartmentEmails comma/semicolon-free +
  1–60 char dept names (protects drSplitDepts_/INV-131), time-off notes
  capped 1000 chars on both submit paths, intakeListMySubmissions returns
  total+cap (INV-169) + client cap note, searchReference hits carry status
  (admin sees the Draft pill on draft chunks), intakeRecListHtml_
  cache-buster respects an existing query string. 6 new comment-stripped
  pins, bite-checked. Pure 425.
- BATCH ③+④ | tour/styles/training/empdocs/coaching/kb/cn partials, Code.js,
  mock.js, run.js | ④: tour-primary + instance-banner color rule, .tr-head
  real viewport wrap (C17-10), review-due row wrap, .tr-section-h defined +
  <h2>, PDF⇄Fillable switch → role=switch button, more-menu + audit-history
  aria-expanded, kbMd_ block-only fence extraction (inline pairs preserved).
  ③: A13 derived class set + first-attr regex + CSS-definition check, A12
  statement-scope, A11 + 'collapsed'/'expanded' (open/show reasoned OUT),
  V-1 derived -deep set, three mock.js payload-shape fixes + shape pin,
  cdrQueueInventory_ on the CSRT constants. 4 new pin tests + 3 extended;
  bite-checked. Pure 419.
- BATCH ② (9 items) | Code.js, cn/metrics/tc-clock/tc-timeoff/kb partials,
  run.js | C17-3 (ambient walk guard + logged catch + saveTrainingAssignment
  predicate + F3 widened with the bare-truthiness ban), C17-4 (per-rep-daily
  attSeconds null-for-absence), C17-14 (no-CDR noteCountUnavailable branch),
  C17-15 (extras SWR stamps only a fully-successful round), side-rail error
  state, kbDrawer failure guards, admin-config containment, five cross-rep
  walks outcome-carrying (skippedReps/partial + partial-rounds-uncached +
  digest warning line + client notes/badge), search error-states with dual
  query guards. 4 new pins + F3 widening, all bite-checked; one pin rewritten
  after being wrong about the code on first write (documented in the block).
- C17-2 | web-app/Code.js | updateTimeOffStatus normalizes TO.STATUS once
  (lowercase comparisons; raw kept for the compensating revert + audit note;
  notify no-op check compares both sides normalized).
- C17-5 | web-app/cn/script_callnotes.html | cnLoadToday_/cnLoadDateRange_
  preserve last-good notes on a non-enrollment {error}, set
  rollingLoadFailed/historyLoadFailed in BOTH handlers, null the SWR stamps
  (never serve a failed round as fresh); both stack renders show
  errorStateHtml_ when a failed load has no last-good.
- C17-6 | web-app/Code.js + cn/script_callnotes.html | exportCallNotesRange
  collects skippedReps, returns it (additive field), stamps
  `skippedReps=N (ids) — INCOMPLETE` on the audit row, returns a read-failure
  error when all reps were skipped; client shows a warn toast naming the reps.
- C17-7 | web-app/tc/script_manager.html | loadPendingAdjustments_ /
  loadPtoReconciliation_ / loadSheetDoctor_ split res.error from
  genuinely-empty and render errorStateHtml_ on both the {error} and
  transport paths (the adjust queue is operational — a failed read must never
  read as "queue clear").
- C17-1 | test/client/run.js + web-app/styles.html | A2 regex
  `\[data-compact[^\]]*\]`; .actions + .field-row gained real 540px
  breakpoints; dead compact overrides for .actions-grid / .ledger (×3) /
  .ts-summary / .leave-balance-row removed (INV-184 class); .preset-grid's
  redundant identical-tracks declaration dropped; ts-recent-row + hero
  allowlisted WITH reasons in A2_INVERSE_OK.
- Tests | 4 new pins (C17-2/5/6/7), ALL bite-checked individually (mutate →
  exactly that pin fails → restore). Pure 411, DOM 69.

## Pending / not yet done
- ~~DEPLOY of the top-5 batch~~ — **DONE** (cycle 17 merged as PR #154 and
  deployed; `runAllTests()` returned clean at that point). The OPEN deploy
  item is #173's, with its three operator actions — see "Where I left off".
- ~~`/sync-docs` for this batch~~ — **DONE** (commit d81bb01): A2 gotcha
  (C17-1 blind spot + resolutions + three-entry allowlist), INV-183 fourth
  column CLOSED (TO.STATUS), INV-46 outcome-carrying export clause, loader
  gotcha (cnLoadDate_ dropped + C17-5 posture), ledger KDD retired,
  trigger-installer gate list corrected, stale Code.js ambient comment fixed,
  test count 407→411.
- The rest of the cycle-17 findings (1 High none — done; the other Mediums:
  C17-3 ambient walk, C17-4 ATT-zero, C17-8 tour contrast, C17-9
  SaveDayRange lock amplification, C17-10 training clip, C17-11 split-send,
  C17-12 form_public hidden fields, C17-13 Q43 negation phrases, C17-14…17 +
  ~25 Lows) — see the scan report. Natural next batches were proposed in chat:
  ② silent-degradation stragglers, ③ tripwire-integrity sweep, ④ interface set.
- Operator one-liner (cycle-15 F2, still open): DQE col-4 header →
  `CDR_EXPECTED_HEADERS`.
- Operator (cycle-16): delete Offerings row 23 or clear B23.
- CARRIED (cycle-13 A5), DEV PROJECT ONLY: set `INSTANCE_IS_PROD=false`.

## Open follow-on items
- TZ-audit 2026-08-17 latents (documented, deliberately unfixed): S1 —
  sendTrainingOverdueDigest's manager-tz todayIso reaches the rep-facing
  overdue-docs nudge + trainDeriveStatus_, so between rep-midnight and CST
  midnight a rep's tab and the manager dashboard can disagree on "overdue"
  (emails fire at 7am CST when the zones agree — cosmetic); S3 —
  getMonthRange_ reads script-tz (Chicago) calendar fields inside a
  CONFIG.TIMEZONE (Kolkata) caller — correct only because Chicago is always
  behind Kolkata; revisit if AUTO_EXPORT_HOUR_IST or the script tz changes.
- TZ-audit non-tz note: updatePunchAdjustStatus re-checks ADJUST_WINDOW_DAYS
  at approval (INV-107) but NOT the OLD_ADJUST_ALERT_DAYS reason
  requirement — a no-reason request filed at daysBack ≤ 7 that AGES in the
  queue past 7 approves without a reason. Policy call (deny-and-ask vs
  approve; rejecting punishes the rep for manager latency) — operator's.
- NEW (batch ⑦ error scenario surfaced it): when getReferenceTree fails, the
  Reference LANDING pane renders an indefinite loSweep loader below the
  tree's error card (no failure branch of its own) — Low, photographed in
  reference-error-light-mobile.png.
- Scan Lows still open after batch ⑤: Spanish 200-thread cap, manager fan-in
  seq tokens (train/empdocs/coaching), C17-9 SaveDayRange lock amplification,
  unknown-punch-type lockout — the batch-⑥ set.
- acknowledgeDoc's EmpDocs signature is size-bounded but not
  data:image-validated (authenticated signers — lower stakes; same one-line
  shape as the public-form fix if wanted).
- The three raw DR.STATUS readers (INV-183) — the drStatus_ predicate batch.
- form_public accordions toggle 'open' with no aria; outside
  A11Y_SCAN_PARTIALS (standalone page) — genuine gap, out of batch scope.
- Visual matrix (updated post-⑦): Admin, dark Reference/Training/Coaching,
  and error states are now COVERED; still unshot — Coverage/Punctuality tabs,
  Sent Forms, EmpDocs My Docs, and modal/overlay states.
- INV-187 candidates the top-5 batch did NOT close: managerAggregateFlagged_,
  managerSearchCallNotes, taxonomy/trends, managerGetUnresolvedActionCount
  (cached undercount), getMetricsAmbient blanket catch, My Stats no-CDR
  branch, extras SWR partial-fresh, timesheet side-rail skeleton,
  kbDrawerOpenItem_ failure guards, getAdminConfig pane wipe.

## Decisions made (so the next session doesn't re-litigate)
- C17-1 obligations were resolved per-selector, not blanket-allowlisted:
  .actions/.field-row got REAL breakpoints; .actions-grid/.ledger/.ts-summary/
  .leave-balance-row compact overrides were REMOVED as dead (INV-184 — grep
  confirmed zero markup emits them); .preset-grid's compact tracks were
  identical to base (gap-only change) so the redundant declaration was
  dropped rather than allowlisted; .ts-recent-row (auto 1fr auto — content
  tracks) and .hero (only live consumer sets display:block) are allowlisted
  WITH those reasons.
- C17-2 keeps oldStatusRaw for the compensating revert and the audit note so
  the cell is restored/recorded exactly as found; only comparisons normalize.
- C17-7 renders error states for the two DIAGNOSTIC cards too (not just the
  operational queue): a failed check is not a clean check (INV-187), and
  cycle-16's operator note already frames "warn cards where blanks used to
  be" as the fix working.
- C17-5's cold-failure error renders are written multi-line so the
  line-scoped A12 scan can't false-trip on empty-class + failure-marker
  co-occurrence.
- No Tests.js editor case was added for C17-2 (it cannot execute in the
  container and an unexecuted editor test is the cycle-16 "pin wrong about
  the code" hazard); the comment-stripped source pin covers the shape, and a
  `test_updateTimeOff_mixedCaseStatusCell` editor case is noted as a
  follow-on to write AND run at next deploy.

## Operator round — 2026-08-17 THIRD (post-285/286 re-run)
- The one remaining editor failure (`publicForm_tokenLifecycle`) was a
  FIXTURE artifact: its oversized signature lacked the `data:image/` prefix
  the C17-⑤ shape guard (correctly) rejects before the size cap. Fixture
  fixed (729e99d); next `runAllTests()` should be 286/286. Guard order
  verified correct — do NOT reorder the guards to satisfy a fixture.
- Full-width Spanish Inbox + Dept Requests (fcab21e): `.sp-tasks` 920px cap
  dropped; both views widen to 1480px via `:has(#spanish-body)` /
  `:has(#dr-body)` in their OWN partials (drRender_ wraps BOTH branches);
  Spanish head + share chart side-by-side in `.sp-top` (stacks <1024px, no
  compact override owed — the breakpoint covers the 480px pop-out); inline
  660px telemetry/share caps dropped. Pin + 3 bites.
- Display cap (8b3fbee): `spCappedTasksHtml_` in script_core — 12 cards per
  section + "Show 24 more · N not shown" real button; all five card sections
  (Spanish pending/resolved, DR mine/incoming/team) capped with per-section
  shown-state reset on full render/enter. INV-169 counts stay in headers.
  Pin + 4 bites. Pure 545, DOM 71.
- Operator note to relay: screenshot showed "no member list set — counting
  any reply as resolved" → set SPANISH_INBOX_MEMBERS for member-accurate
  share attribution + zero bars.

## Operator round — 2026-08-18 (six items)
- Width: Punctuality + Admin inner caps dropped (780/820/760 + all 900/1000px
  card caps) — both fill 1280; punctuality-light-wide scenario + fixture added
  (matrix 41). Width-sweep findings for the operator (agent-verified, ranked):
  Intake → Sent (920px .intk-wrap on a data list), Team Training (860px strip/
  assign beside a full-width matrix), My Training / My Docs (.tr-list 860px),
  Reference landing (760px row list). Deliberately narrow: article reader,
  intake forms, Time/PTO calendar (documented cap).
- Admin Auto-tag rules → compact 2-up internally-scrolling list (bounded card).
- Spanish members: in-app Admin editor (saveSpanishInboxMembers, INV-136 →43,
  gate case + F7/F9 nets updated). Empty-list save danger-confirms.
- Load-time sweep round 1 (agent inventory + fixes): getDeptRequests 90s
  per-caller cache + gen salt (resolve write + auto-track append bump); DR tab
  SWR enter (resolve busts the stamp); enterTimeoffView rides calNavTo_;
  getDashboardMetrics dash_metrics_v4 day-keyed + TTL 1800. Spanish pending
  STAYS uncached (documented privacy decision — pinned). NOT done (identified,
  reported): manage-tab parallelize (slots don't exist until dashboard paints —
  needs buffering), trainingManage 5-RPC round (cache getEmployeesList/
  getQuizzes), trainingHome/coaching/myDocs/callNotesForms 6-line SWR blocks,
  reference-tab manager blocks, callNotes cold-path config∥notes parallelize.
- Dashboard trendline MOCK published (artifact 'Dashboard Trendlines') — %
  Answered daily line + dashed 85 target per card, alternate volume columns;
  build cost = per-day series in getDashboardMetrics payload. Awaiting the
  operator's yes/no.
- Follow-up (same day, operator round 2): dashboard cache TTL → 21600s (the
  CacheService max, operator-approved); Team Metrics opened to reps as the
  whitelist-built AGGREGATE (teamMetricsRepView_, repView marker, both return
  paths strip — INV-66 amended; the per-rep table + diagnostics stay
  manager-only per INV-124's posture, offered the un-gated version and the
  operator can still ask); dashboard cards click through to My Stats / Team
  Metrics; test_metrics_getTeamMetrics_nonManagerRejected REWRITTEN as a
  shape pin (kept name); omnibus getTeamMetrics case retired with a note.
- MERGED by the operator as **PR #171** (d3f8a6b); branch restarted from main.
- Follow-up (operator round 3, same day): CN pop-out FLUID TYPE — two clamp()
  groups scoped :root[data-compact] (values 13→11px, labels/rail/buttons/tag
  12→10.5px over 480→~340px; ceilings = base px so ≥480 byte-identical;
  measured 480/400/360, overflow 0; the compact grids out-specify the ≤480
  stacking breakpoints so the framing HOLDS while type shrinks). Pin (exact
  formulas + no-bare-vw scan, 3 bites) + cn-log-light-compact-sm scenario
  (matrix 42). Pure 551, DOM 71.
- Follow-up (operator round 4, 2026-08-18, tall-and-skinny screenshot): a
  `@media (max-width: 400px)` compact-yield block in the CN partial — trio
  stacks (Caller under Callback), all `.cnv-row` labels move above values,
  save quadrant one column, note-card timestamp column hidden (operator-
  sanctioned; time still rides the CRM copy), card action row wraps; every
  rule :root[data-compact]-scoped so phones are untouched; source order
  confines it to the window (measured: stacked + overflow 0 at 300/360,
  byte-identical at 480). Pin + 4 bites; cn-log-light-compact-sm comment
  updated (it now shows the stacked side). Timestamp-in-IST report: NOT a
  code change — the 9c5df81 tz-mismatch detector already ships; the fix is
  the operator's Employees-sheet Timezone cell (blank/Asia-Kolkata →
  America/Chicago). A duplicate boot-time tzMismatchCheck_ was nearly added
  and removed; a declared-once guard now pins it. shoot.mjs seeds
  umsTzWarnedDay so the sticky toast stops covering every screenshot.
- Follow-up (operator round 5, 2026-08-18, /broad-implement): Time/PTO
  CONSOLIDATION — the Time Off ⇄ Timesheet mode toggle retired (the two
  modes were one page with a swapped 240px rail; umsMergeMode retired,
  17→16 keys; .mp-mode CSS deleted per INV-184; INV-80 amended); the rail
  stacks a NEW quick-actions card (date→the same pinned day modal via
  openRequestForDate_/TO_PENDING_DAY_OPEN handoff; punch-edit→
  openAdjustModal) + annual-leave tile + the always-on pay-period block;
  the pay statement's incomplete/empty in-window days gained a
  "Request edit" click-through (closes the statement FIRST — ensureOverlay
  DOM-order paint — then opens Adjust prefilled; bounds-guarded prefill;
  suppressed on a manager's view of another rep). Mock: getTimesheetData
  fixture added + the calendar fixture's hoursByDate→workedHoursByDate
  INV-185 shape fix (corner hour badges had never rendered on camera).
  Dark-mode Request button corrected to the canonical primary recipe
  (color: var(--paper-card), measured illegible as #fff first). Pin + 5
  bites; timeoff-light/dark-wide re-shot (0 overflow). S39/S46/S79
  updated; block at .cycle/blocks/18pre-timeoff-consolidation-*.
- Follow-up (operator round 6, 2026-08-18, post-#172 redeploy): RANGE
  time-off requests + ACCRUAL PTO tile. Server: submitTimeOffRange
  (rep-callable, locked, ATOMIC — INV-94 dup-guard per weekday with the
  whole batch rejected naming conflict dates, INV-95 whitelist, L-11
  horizon both ends, C17-⑤ notes bound, 31-day span cap, weekend skip;
  one Pending row per weekday so every downstream reader is unchanged);
  EMP.PTO_ACCRUAL col Q (display-only d/mo rate, empPtoAccrual_
  fail-safe) + ROSTER_CACHE_KEY v10 (INV-28). Client: day modal
  "Through (optional)" field (per-open reset, preview × weekday count,
  dual submit routing), quick-actions card second date threading through
  the {date, through} pending handoff, and the accrual tile variant
  (ACCRUING X.XXd/mo, balance → ≈Dec-31 projection, filling bar; blank
  Q = legacy tile byte-identical — chosen over server-side auto-credit,
  which would double-count against hand edits). Pin +1 (554) with 5
  bites incl. atomicity order + behavioural counter; editor +1
  (test_submitTimeOffRange_weekendSkipAtomicCaps ≈303); mock fixture
  accrual-on; INV-28/94 amended, column-Q checklist entry, S46 extended.
  OPERATOR ACTION: fill column Q for accruing agents (optional).
- Follow-up (operator round 7, 2026-08-18): ACCRUAL CREDITS system-computed
  — supersedes round 6's display-only model per the operator ("I would
  rather the system compute the accrued balance... carefully"). Design:
  credits flow INTO the existing col-I balance (never derived at read
  time), through adjustLeaveBalance_ (INV-27 gate + cache invalidation
  ride along), in ARREARS (month M lands on/after the 1st of M+1 — which
  is why the tile's 12−month projection needed no change), idempotent via
  the auto-managed col-R AccruedThrough stamp (coercion-safe reader
  accrualStampYm_), seeded-without-back-credit on enable, catch-up capped
  at 12 with overflow NAMED in the audit row, credit-before-stamp so a
  mid-run failure fails toward VISIBLE re-credit; pto-disabled reps skip
  with the stamp FROZEN. New trigger creditMonthlyPtoAccruals (daily
  manager-tz 6am, the seventeenth — both TARGETS arrays; the derived
  trigger nets auto-generated its gate coverage, INV-179), audit action
  PtoAccrualCredit (+ client CN_HEALTH_RUN_LABELS entry), ROSTER_CACHE_KEY
  v11. INV-194 WRITTEN. Pins → 556 (5 bites incl. in-arrears + cap +
  order + through-the-mutator + action-registered); editor +2 ≈305.
  OPERATOR ACTIONS: re-run installAutomationTriggers() (blocks the
  feature), fill col Q, STOP manual monthly top-ups for rated agents.
- Pure 556, DOM 71, matrix 42 (0 missing / 0 overflow on everything shot).

## Where I left off
Cycle 17 is CLOSED (reflected) and PROJECT_HEALTH now carries it. **Cycle 18
has NOT opened and is DUE as the Seams & Invariants audit** (cadence counter
4/4) — when it opens, move the cycle-17 block into HISTORY.md and reset this
file from the template. The library is at **INV-194**; 189/190/191 came from
the 2026-08-11 pilot round and 192/193/194 since, so cycle 18 owes NEW
candidates, not those.

**Since cycle 17 closed, EIGHT operator-request rounds shipped** — seven in
three merged PRs (#171, #172, #173), plus the PTO accrual **REBUILD** now
sitting UNMERGED on this branch:

- **#171** — Spanish-members editor, compact auto-tag list, full-width sweep,
  load-time/caching sweep, 6h dashboard TTL, Team Metrics opened to reps as a
  whitelist-built aggregate (INV-66/124 posture kept), dashboard→Metrics
  click-throughs.
- **#172** — Time/PTO CONSOLIDATED to one page (mode toggle + `umsMergeMode`
  retired), quick-actions Requests card, pay-statement "Request edit"
  click-through, CN pop-out fluid type + ≤400px narrow stacking.
- **#173** — multi-day time-off requests (`submitTimeOffRange`, atomic,
  weekday rows) + system-computed PTO accrual credits.
- **UNMERGED, on this branch — the accrual REBUILD (2026-08-19).** The
  operator's real rule is **3.08 PTO hours per 80 hours WORKED, 8 hours per
  day**; #173 had shipped a flat days-per-calendar-month model (the one new
  failure mode cycle 17's between-rounds reflection recorded). The machinery
  is unchanged — same trigger, stamp, in-arrears idempotence, audit action,
  gate, cache key — only the AMOUNT calculation was replaced. See
  `.cycle/blocks/18pre-pto-hours-rebuild-broad-implement.md`.

**Deploy state (the thing a fresh session must not get wrong):** the operator
deployed after #172 and was mid-testing when #173 was merged; the rebuild
above has NOT been deployed. Its deploy carries **FOUR** operator actions:
(1) `clasp push -f` + New version + `runAllTests()`, (2) **re-run
`installAutomationTriggers()` once** (the accrual trigger does not exist until
then), (3) fill roster column Q for accruing agents AND stop the manual
monthly top-ups for exactly those agents, and (4) — NEW and easy to miss —
**re-enter every column-Q value in the new units**: a cell left at `1.25` from
the 2026-08-18 round now reads as 1.25 PTO hours per 80 worked, roughly a
third of the intended rate.

**The one real verification gap, now larger:** the editor suite has NOT been
run against #172/#173 or this rebuild. Three editor tests are new or rewritten
and have never executed (`submitTimeOffRange_weekendSkipAtomicCaps`,
`creditPtoAccrual_seedCreditIdempotent` — REWRITTEN for the hours model, it
now writes two 8-hour test days and asserts the credit they imply,
`triggerGate_ptoAccrual_nonManagerThrows`). `runAllTests()` is the ONLY thing
that exercises the accrual credit against a real sheet, and the editor-test-rot
gotcha (cycle-14 found two rotted tests after four unrun cycles) is exactly
this shape. Node baselines are green: **pure 556, DOM 71, visual matrix 42**.
