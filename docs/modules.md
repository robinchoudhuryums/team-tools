# Module narratives

Moved VERBATIM out of CLAUDE.md's `## Projects` section by Batch D2
(2026-09-14). Nothing was rewritten — CLAUDE.md keeps a MAP table (what each
tool is, its tabs, its store, its gate) and links here for the detail: what
each module actually does, which redesign changed what, and why a given
behaviour is shaped as it is.

The client partials for each module are listed in `.cycle/config.md`'s
Subsystems section, which is the one place that mapping lives — this file does
not restate it. Server endpoints live in the fourteen server files
`web-app/.clasp.json`'s `filePushOrder` names (Batch F2 split them out of
`Code.js`).

---


<a id="time-clock"></a>
## Time Clock

   - **Time Clock** — cross-timezone time tracking, PTO requests,
     manager dashboard, ADP-format export, and a manager-only
     **Coverage** planner (forward staffing across timezones with PTO
     overlaid + understaffed-hour flagging — `getCoveragePlan`, INV-127;
     redesigned as a days×hours heatmap + understaffed callout). The Clock
     view was redesigned into a sky-gradient clock card + tz selector with
     the day ribbon as the primary control surface (hours/state header,
     break bands, a note-volume histogram via `getMyNoteHourBuckets(date)` —
     sourced from the rep's LOGGED NOTES per rep-local hour, NOT CDR — and
     the punch buttons mounted directly beneath it, lunch color-coded), plus
     a one-row Punches · Team · Annual-PTO layout. **Sick leave was removed
     from the UI** (backend kept for legacy reverts — see Common Gotchas).
     **Manager-visible leave balances (operator 2026-09-16):** a rep's remaining
     annual PTO shows on the manager's live-status card and on the team-calendar
     off-chip, where the approve decision is made. Until then a manager could see
     a balance ONLY on a rep who happened to have a pending request. Both surfaces
     go through one predicate and render NOTHING — not a zero — for a rep the
     balance does not apply to, because `adjustLeaveBalance_` no-ops for a
     pto-disabled rep (INV-27).
     Backs a shared Google Sheet (`CONFIG.ADP_SS_ID` in `web-app/00_config.js`).


<a id="call-notes"></a>
     **2026-09-17 (the /broad-scan's Batches 1 + 2):** an EQUAL Clock In /
     Clock Out is zero hours, not the 24-hour day the `<=` overnight wrap paid
     (INV-215 — the manager writers refuse it by name and the sheet doctor
     reports it at minute granularity); Day Edit's Save is disabled until the
     prefill lands (a Save in that window sent blank slots, which delete
     punches); the Dashboard's two metric carousels render a failed read as the
     warn card, never "No call data for this period"; the shift-strip coverage
     chip says "coverage unavailable" on a failed read instead of the blank that
     means "no call activity"; and the Needs-you "calls without a note" row
     treats a failed DQE read as "couldn't check", never "0 missing"
     (`getMyMetrics.cdrUnavailable`).
     **Batch 4 (2026-09-18):** the monthly PTO accrual credit writes ONE
     `PtoAccrualCredit` ledger row per MONTH (a catch-up is per-month keys, and
     the total is the per-month sum — the accrual decision, F-19); the accrual
     job rewrites its reconcile stamp on every path (F-46); the team calendar
     reads the time-off tab through its provisioner, so a fresh deployment
     renders it (F-49); the missed-punch alerts and the export check heartbeat
     (F-20, the Automation Health decision).

     **Batch 6 (2026-09-18):** the five static modals (Adjust, Day Detail, Day
     Edit, Export, Manager Time-Off) open through `ensureOverlay` and close
     through `closeOverlay`, so focus moves into the dialog and returns to the
     control that opened it (F-40); the day popover keeps its `hover-mode`
     across that rewrite (g134). The ADP export renders the generated sheet's
     LINK into the dialog and keeps it open, so a pop-up blocker can no longer
     take the URL with it (F-36, g135).

## Call Notes

   - **Call Notes** — rolling-note panel for CSR call logging. Each
     rep writes to their own per-rep Google Sheet (`Notes` tab in the
     spreadsheet whose ID is in `EMP.CALL_NOTES_SHEET_ID`, column L
     of the Employees roster). Ctrl/⌘+Shift+C saves + auto-copies a
     CRM-friendly serialization; email composer is a separate
     two-stage flow with preview gate. Three flag types
     (action / training / review) with EOD reminders for unresolved
     action flags and weekly manager digests for training + review.
     Redesign: Search renders real read-only cards with a result count,
     search-term highlight, a date filter, and **Phone / TRX** field scopes
     (alongside All / Caller / Issue — INV-45); the manager Stats view is a
     scannable table (shared `mtRenderTable_` component); and the Admin tab is
     split into **Overview / Tags / Compliance / Config** sub-tabs with
     system-status cards. **Marker text formatting (operator 2026-08-25):**
     Issue/Resolution support `**bold**` / `__underline__` / `==highlight==`
     — typed literally or via Ctrl/⌘+B / Ctrl/⌘+U / Ctrl/⌘+Shift+H
     (preventDefault always fires in a `.ce` so native contenteditable
     `<b>` tags — which would not survive the plain-text save — never
     appear; the wrap inserts TEXT via `execCommand('insertText')`, undo
     stack intact). Cards/search/mgr-card/prior-calls/composer-reference
     render through `cnFmtHtml_(esc(...))`; the CRM copy STRIPS markers
     (`cnStripFmt_`); the email applies the server twin `cnFmtEmailHtml_`
     post-`esc_` (free-text Resolution branch only — the server-generated
     OOP resolution is never marker-processed) — see the formatting gotcha.


<a id="metrics"></a>
     **Batch 6 (2026-09-18):** the Admin Overview KPI strip reports TEAM
     numbers — notes across every enrolled rep (all-time) and the cross-rep
     unresolved-action walk — with each cell stating its own scope, and a
     partial walk rendered as `≥ N` rather than a confident total (F-12). The
     keyboard-shortcuts overlay joined the overlay lifecycle: a name, focus
     stash and restore, and the shared Escape handler (F-30). The quick-chip
     row's label reads "all time", matching counts that always spanned the
     whole Sheet (F-28), and the Q&A thread says "Rep" rather than "You" when
     a manager is the one reading it (F-29).

## Metrics

   - **Metrics** — CDR integration module that reads DQE Historical
     Data from the CDR Report spreadsheet (the same sheet backing the
     `call-data-reporting` repo's Department Dashboard). Two tabs:
     "My Stats" (self-view for all reps — today's KPIs, note-to-call
     coverage ratio, and **own-vs-team-avg 30-day trend charts** for 5
     KPIs — % Answered / Answered / Missed / Avg Talk / Transfer % —
     where the team line is **anonymized**: hidden on any day with fewer
     than 3 reporting reps, so peers can benchmark without singling
     anyone out, INV-124) and "Team Metrics" (visible to EVERYONE since
     2026-08-18: reps get the whitelist-built team AGGREGATE — totals, trend,
     queue/department transfer folds — while the per-rep table + name
     diagnostics stay manager-only, INV-66; date-range support and preset
     chips; the Dashboard metric cards click through here). The CDR data layer
     (`getCdrSS_()`, `getCdrAgentMetrics_()`, `getCdrDailyBreakdown_()`,
     plus `getCsrTransferPerRepDaily_()` reading the separate
     `CSR Transfer Historical Data` tab for the Transfer KPI) is isolated
     behind helpers so a future swap to Neon Postgres (Option C)
     replaces only those functions. CDR metrics also enrich the
     Call Notes Stats tab (`managerGetShiftStats`) via a best-effort
     try/catch overlay — CDR failure never breaks existing stats.
     My Stats has Yesterday / 7D / 30D range presets — Yesterday = the previous
     WORKDAY (Monday shows Friday; operator 2026-08-17: CDR data is never
     populated same-day, so a Today preset always showed an empty day; the
     manager Team Metrics tab deliberately keeps Today for same-day note
     counts; since H1 (2026-09-17) the walk ALSO steps over company holidays,
     read from the CDR Report's `Company Holidays` tab — the same calendar the
     Department Dashboard uses, so the morning after a holiday "Yesterday" is
     the last real workday, not an empty day; g123). Since H2 (2026-09-17) Answer % is the dashboard's formula
     (`answered / (answered + missed)`) and the target line, table band,
     Clock tone and sidebar badge judge against the dashboard's PUBLISHED
     per-dept standard (the CDR Report's `Dashboard Standards` tab; no tab =
     no verdict), with the team benchmark subtracting its Team Avg Excludes
     (g124) — (server-aggregated via
     `getMyMetricsRange(from, to)` — caller-scoped self-aggregate, no team
     line/series), rail-row sparklines, and a sortable + sticky-header team
     table with tri-tone % cells (the table renders via the shared
     `mtRenderTable_` component, see Key Design Decisions). Since H3
     (2026-09-17) both DQE readers are SPAN-bounded — `cdrDqeWindowSpan_`
     scans the date column and each reader reads only the window's row span
     at full width, keeping its per-row filter — and a bare Sheets serial in
     the Date column is a date rather than a silently dropped row (g125).
     **Batch 3 of the cycle-20 scan (2026-09-17)** closed H2's leftovers: both
     heroes name the standard's SOURCE beside the target (and say "no target,
     tone or badge" when there is none — muted for a missing row, warn for an
     unreadable tab); a standard with no Amber Band has no amber tier on the
     team table AND the Clock card (`mtAnswerBand_`, the one rule); a window
     with nothing answered or missed shows a dash, not 0%; the manager sidebar
     badge judges the previous WORKDAY (Monday reads Friday, the morning after
     a holiday steps over it) and its tooltip names the Dashboard Standards
     target instead of a literal 85 (g131). Admin → System's CDR Report row
     states which calendar and which standard are live, with a finding for
     every fallback state (F-08/F-09).
     **Intake-call analytics (operator 2026-08-25):** long PPD /
     account-creation calls are EXPLAINABLE beside the KPIs as honest
     COUNTS — per-call CDR attribution does not exist (DQE is one row per
     agent+date, the settled cycle-14 Phase 0 fact), so there is
     deliberately NO modeled "adjusted ATT" (an invented subtraction would
     be presented as data, INV-187). `cnCountIntakeNotesResult_` counts a
     rep's intake-flagged notes (`subformData.intakeType`, the INV-143
     bounded enum) with the `cnCountNotesResult_` outcome contract (a
     failed read is `unavailable`, never a confident 0); `getMyMetrics` /
     `getMyMetricsRange` / `getTeamMetrics` per-rep rows all attach
     `intakeNotes` (null on unavailable — additive + client-guarded, so no
     cache-key bump), teamTotals accumulates only readable reps
     (`intakeNotesPartial` otherwise). Client: an "Intake calls" rail row
     on My Stats (null-gated), an Intake column in the Team table (null →
     em dash; TSV exports blank), and a manager-only lazy
     "Intake volume · by month sent" block fed by `getIntakeVolumeStats`
     (manager-gated; real monthly counts from the submission tabs'
     Timestamp column, bounded tail; an unreadable tab is NAMED in
     `failedTypes`, never a silent 0 column).
     **Spanish Inbox voicemail gate + transcript snippet (operator 2026-09-16):**
     8x8 A_Q_Spanish voicemail notifications fold into the pending list, and one
     shorter than `SPANISH_VM_MIN_SECONDS` (CONFIG seed 5) is treated as a
     hang-up and never becomes a task. The gate FAILS OPEN — an unreadable
     `Duration:` shows the card — and reports what it hid in two separate counts,
     because a suppressed card is invisible and one number could not tell
     hang-ups from a dead parser. Auto-assign inherits the gate. The card's
     snippet is now the voicemail TRANSCRIPT rather than the first 240 chars of
     the body, which were almost entirely 8x8 boilerplate.
     Backs the CDR Report spreadsheet (`CONFIG.CDR_SS_ID`).


<a id="intake"></a>
     **Batch 5 (2026-09-18):** `QaRecordings` carries a trailing `AgentId`
     written from the roster when a reviewer attributes a recording, and the
     agent-facing My Reviews list + playback scope by that id rather than by
     the free-text name — a legacy row matches by name only when the name is
     unique on the roster, and a name two agents share releases to neither
     (F-16). The coverage table's exemption buttons fire through a delegated
     `data-qa-exempt` handler, so an apostrophe in an agent's name no longer
     breaks the click (F-17, g133).

## Intake

   - **Intake** — patient-intake forms ported from the bound
     `form-generator` Apps Script (that reference copy was DELETED in
     cycle 13 — see the Frozen Subsystems note; it is in git history).
     **Five** tabs: **PPD** (Patient Profile &
     recommendation — a 46-item intake (Q1–Q45 plus the lettered but
     full-weight Q39a; the progress ring's denominator is 46, see the
     PPD-controls gotcha) that drives the clinical
     HCPCS recommendation engine `intakeFilterRecommendations_`,
     reading the **PMD Offerings** catalog), **PMD Account** and **PAP
     Account** (demographics/insurance/clinical account-creation forms
     with image attachments), and **Sent** (read-only sent-submissions
     viewer — `intakeListMySubmissions` / `intakeGetSubmission`,
     caller-scoped to the sending rep, managers see all; replaces
     opening the PHI spreadsheet), and **Catalog** (read-only browse of the
     PMD Offerings catalog — `intakeListOfferings`, cycle-18 batch 8; until it
     shipped, looking up what a HCPCS code covers or a chair's weight capacity
     meant opening the Intake SPREADSHEET, which also holds the PHI submission
     tabs. It reads `Offerings!A2:F` and nothing else). Each form renders a
     branded email and persists a PHI backup row. The unbound rewrite: the bound tool
     used the active sheet's cells as the form; here each form is a web
     form whose answers POST to two-stage, bodyHash-guarded
     `intakePreview*`/`intakeSend*` endpoints (mirrors the Call Notes
     email flow), every field `esc_`'d. PHI (patient answers) persists
     to append-only `PPDSubmissions`/`PMDSubmissions`/`PAPSubmissions`
     tabs in ONE Intake spreadsheet (`INTAKE_SS_ID`, which also holds
     the read-only `Offerings` tab); the shared AuditLog row stays
     PHI-free (`IntakeSent: submissionId + recipientDomain`). The
     Offerings catalog is isolated behind `getIntakeOfferings_()` (the
     `getCdrSS_()` pattern). Redesigned onto the shared `.app-bar` shell with
     PPD "Option A" structured controls (Yes/No toggles + severity chips,
     engine-safe — see Common Gotchas), a filterable/searchable Sent tab, and
     per-form draft autosave (`umsIntakeDrafts`). **All three forms (PPD / PMD
     Account / PAP Account) share a sticky side progress rail** (ring + count +
     Preview/Clear) via `intakeRingHtml_(form)`/`intakeRingSet_(form,…)` +
     `intakeAcctUpdateProgress_`, with a **per-form ring color** (PPD blue / PMD
     orange / PAP purple) from the `--intake-ppd`/`--intake-pmd`/`--intake-pap`
     design tokens. **Those tokens are the ONLY home for those colours
     (F7, cycle 19):** the PAP purple used to bypass `--intake-pap` in four
     separate literal values across two partials plus a hand-written dark
     override, so the PAP category tint and the Call Notes intake pill were a
     DIFFERENT purple from the ring the tokens partial defines and changing it
     took five edits in three files. `.intk-cat-pap .sec-title` and
     `.cn-intake-pill.pap` ride the token now, over one `--intake-pap-soft`
     tint declared beside its source (the `--warn-soft` shape); the dark
     override is GONE because the token already flips per mode — that override
     was the parallel-source half. MEASURED across every palette × mode rather
     than reasoned: 4.61:1 light and ~6.9:1 dark, AA in all ten combinations,
     and the pill's alpha moved .16 → .14 because .16 measured 4.47, a hair
     under AA for 11px text. A `--intake-pap-deep` alias was evaluated and
     REJECTED by measurement (the dark card-mix regressed 7.69 → 4.04). **The 2026-08-25 operator round added four form
     behaviours:** (a) clicking a SELECTED response button UNSELECTS it —
     every button-control kind (`intakePick_`, the ynreveal + ynnum Yes/No
     halves) clears back to blank, hiding + clearing any revealed sub-field
     (accidental-click recovery); (b) the PPD form ends with an optional
     **Additional Notes** panel — the textarea rides the `[data-intk-qnum]`
     accessor as key `notes`, so drafts/collect/restore got it for free, the
     email renders it as a normal section (payload.rows — zero server edit),
     the stored answers carry `answers.notes`, and the progress ring stays
     /46 (notes never count); (c) submit warns on skipped
     **strongly-recommended** fields — `INTAKE_RECOMMENDED` (BANK indices —
     headers occupy slots; the operator's per-form lists) + the pure
     `intakeRecommendedBlanks_` (incl. the Q40-Yes-without-hours half-answer)
     drive `intakeWarnRecommended_`: warn-highlighted rows + a
     Continue-anyway/Go-back confirm, self-clearing per row on input, NEVER
     a hard block and NEVER for arbitrary blank fields (hidden/revealed-away
     rows are skipped via inline display); (d) a sent submission can be
     **amended & re-sent** (owner-only — `intakeAmendSource_` resolves the
     source row caller-scoped, a forged/foreign id reads as not-found): the
     Sent detail's Amend button replays the stored answers into the form
     (`INTAKE_AMEND_PREFILL`, language-matched first), the re-send goes out
     as `AMENDED: <subject>` with a warn-toned banner naming the CHANGED
     fields (`intakeAmendDiff_`/`intakeAmendBannerHtml_` — added POST-hash,
     the INV-41 feedback-CTA pattern, so the preview gate is untouched), the
     new row stores the source id in the trailing **`AmendsId`** column
     (submission-tab headers self-heal), and the Sent list marks the pair
     ("amended copy" info chip / "superseded" warn chip + banners; the Amend
     button hides on superseded rows). **The previewed + emailed form is
     ALWAYS English whatever language it was completed in (operator
     2026-09-04, fired live — see the Common Gotcha).** Backs the Intake spreadsheet
     (`CONFIG.INTAKE.SS_ID` / Script Property `INTAKE_SS_ID`).


<a id="reference"></a>
     **Batch 5 (2026-09-18):** the email's question LABELS come from
     SERVER-held English banks (`INTAKE_PPD_Q_EN` / `INTAKE_PMD_Q_EN` /
     `INTAKE_PAP_Q_EN`) and the client's ANSWERS map — `payload.rows` is read
     nowhere, so the g43 English rule no longer depends on the client keeping
     it (F-27). The banks mirror the client's byte-for-byte and are pinned
     equal.

## Reference

   - **Reference** — in-app knowledge base (Phase 1). A per-department
     tree + full-text search + reader for training/policy docs, so the
     team stops fighting Drive's folder UI. Two item types: **`article`**
     (markdown source stored in the KB sheet, rendered client-side by
     `kbMd_` which escapes HTML first) and **`embed`** (a Google Doc/
     Sheet/file shown via its Drive `/preview` iframe + open-in-new-tab —
     the "Drive-linked fallback"). Managers add/edit/delete inline
     (`kbSaveItem`/`kbDeleteItem`, gated + locked + audited); reps get
     read-only browse + search (`getReferenceTree`/`getReferenceItem`/
     `searchReference`). **PHI-free by policy** (training/reference only —
     scrub patient data from screenshots). Backs a dedicated KB
     spreadsheet (`CONFIG.KB.SS_ID` / Script Property `KB_SS_ID`); reps
     read via the server and never open it. Phase 2 (shipped): a
     per-item Google-Doc→article converter (`kbConvertDriveDoc`) —
     review-before-save in the editor, for migrating embeds to fast
     native articles. Also shipped since: converter images export to
     Drive at save time (Phase 2b) + paste-a-screenshot upload in the
     editor (Phase 3), a Ctrl/⌘+K slide-over **drawer** for mid-call
     lookup (mounted on `document.body`, with content-aware
     suggestions + a usage log behind the manager "Most referenced"
     block + a manager **"Review due"** queue — items older than
     `CONFIG.KB.REVIEW_DUE_DAYS` (90), usage-sorted, with a one-click
     "Mark reviewed"; editing an item also counts as reviewing it —
     `kbGetReviewDue`/`kbMarkReviewed`, INV-126), and an optional
     **AI guidance card** (Phase A —
     `kbGetFacetGuidance`, Anthropic API, whitelisted enum facets
     only, feature-flagged OFF by default; INV-119). The Reference tab was
     redesigned with collapsible departments (state in `umsKbPanel.deptCollapsed`)
     and a landing panel (recent / most-used / review-due).
     **Insurance payor lookup (operator 2026-08-25):** a debounced
     search-as-you-type card on the Reference landing AND the Ctrl/⌘+K
     drawer home over the operator-imported **`InsurancePayors`** tab in
     the KB spreadsheet (>1000 payor/plan rows; import the acceptance CSV
     and name the tab exactly that — see the operator-state entry).
     `searchInsurancePayors` (rep-gated `'Not authorized.'`, read-only,
     name-column scan capped `INS_PAYOR_MAX_ROWS`, top-`INS_PAYOR_TOP`
     full-row fetch, `getDisplayValues` throughout — a foreign-authored
     sheet is never reinterpreted, INV-64) with header-NAME column
     discovery (`insPayorRowObj_` — /network/, /waystar/, /qualif/ (the
     source header is misspelled "Qualifaction" — the stem is deliberate),
     /reimbur/; every other non-empty header lands verbatim in a details
     disclosure). Chosen DETERMINISTIC over the operator's RAG idea —
     billing-error stakes want a visible failure mode: an unknown token
     renders verbatim + neutral, a blank Network Status reads "status not
     recorded", and a no-match renders the operator's own plan-not-listed
     → TRY guidance. `insToneCls_` maps the acceptance legend to tones
     (accepted/in-network good; TRY info; location/SI/PR/plan-specific
     warn; not-accepted/OON bad) and a legend disclosure spells out the
     operator's definitions. The rep's QUERY is never persisted (the
     kbMapDistances posture).
     **OOP price lookup + area eligibility (operator 2026-09-16):** two more
     cards on the SAME two surfaces, over two more operator-maintained tabs in
     the KB spreadsheet — `OopPricing` and `LocationAcceptance`.
     `searchOopPricing` reuses `insPayorScore_` rather than copying it (two
     scorers for two lookups is two things to keep in step and nobody would
     notice them diverging) and shares the payor lookup's whole posture:
     `getDisplayValues` throughout, header-NAME column discovery
     (`oopHeaderRole_` — /price/, /area|eligib/, /effective/, with `effective`
     tested BEFORE `price` so "Effective Price Date" cannot put a date in front
     of a customer as money), a bounded scan, and a no-match that says NOT to
     quote a similar item. A row with a BLANK price says "no price on file" in
     warning tone rather than rendering an empty cell that reads as free. Read
     LIVE, no cache — the payor table is ADVISORY, but a rep QUOTES an OOP price
     and takes payment on that call, so a copy that lags the sheet is a rep
     collecting a superseded price. The same number is re-verified against the
     live sheet when the Call Notes external composer SENDS it (INV-208).
     `checkOopEligibility` takes an address or ZIP and answers TWICE per item —
     once through insurance, once paying out of pocket — because the
     `Area Eligibility` column states the INSURANCE rule, and paying OOP lifts a
     STATE limit but not a delivery RADIUS (INV-209; the rule that generalises
     it is a Key Design Decision). Warehouse distances come from
     `kbGeocodeCached_`, the coordinate cache extracted from the ` ```map `
     block's `kbMapDistances` so both share ONE cache with one set of hygiene
     rules; the customer's own address is geocoded UNCACHED, which is that
     block's privacy rule unchanged. `LocationAcceptance` also carries CITY rows
     — the POV/scooter delivery list — shown beside the verdicts and never
     changing one. `getOopPricingDiagnostics` (admin) is the visibility half of
     both: it names the tabs read, every header and the role assigned, the
     warehouse registry, any addressless or unreadable location row BY NAME, and
     how every eligibility value in the sheet parses — because an unreadable
     value renders "cannot tell", which reads like caution rather than a typo.
     **2026-09-17 (the /broad-scan's Batches 1 + 2):** both search surfaces
     score through ONE helper (`oopMatchScore_`, name OR code) on the
     header-resolved row (INV-213 — the eligibility filter and the send-time
     verifier had each kept a column-A read OOP-C removed from the lookup); a
     geocoder SERVICE failure is named as such, never as a bad address (g128);
     the manager landing's "Most used" / "Review due" blocks say which count
     reads FAILED instead of "No opens recorded" or an empty queue; and "Was
     this helpful?" thanks the rep only once the server has recorded it.
     **File ingest (operator 2026-08-25) — two paths, because they answer
     different questions.** (a) **Editor file-drop** (`kbIngestFile`, admin-gated,
     READ-ONLY w.r.t. the KB sheet, review-before-save like the converters):
     drop or pick a LOCAL file and the editor fills itself. `.md`/`.txt` become
     the body directly; `.csv` is parsed by `kbParseCsv_` and handed to the
     PRODUCTION `kbSheetGridToMarkdown_`, so it becomes the same GFM table an
     imported Sheet would (no second markdown generator to drift);
     `.docx`/`.xlsx`/`.rtf`/`.odt` are converted in Drive and run through the
     EXISTING `kbConvertDriveDoc`/`Sheet`, so the drop path and the
     paste-a-URL path produce identical articles; anything else uploads and
     comes back as an **embed** with the consequence NAMED ("only its TITLE is
     searchable"). The routing lives in the pure `kbIngestPlan_`. **The
     conversion deliberately avoids the ADVANCED Drive service** — declaring it
     in `appsscript.json` would put the whole project's authorization at the
     mercy of a domain API restriction; instead it calls the Drive REST upload
     endpoint with `ScriptApp.getOAuthToken()` (DriveApp's scope, already
     granted), and a refusal degrades to the embed path naming itself. Nothing
     new is declared and nothing new must be granted. (b) **Data-table import**
     (`getKbDataTables`/`kbImportDataTable`, Admin → Config → Reference data
     tables): a CSV that REPLACES an allowlisted KB sheet tab — the insurance
     lookup queries a TAB, not an article, so refreshing it was a manual
     File → Import → rename. **`KB_DATA_TABLES` is the security boundary**, not
     the admin gate: an endpoint that can overwrite ANY tab of the KB store is
     categorically worse than one that refreshes a known dataset, so an
     unlisted tab is refused by name and adding one is a deliberate code change
     beside the reader that consumes it. `dryRun` defaults TRUE (a bare call
     can never write) and the SAME server parse drives the preview and the
     write — no client-side CSV parser to drift. The write pins the range to
     plain-text format FIRST (a payor named "Aetna 5-2024" would otherwise
     coerce to a date and `getDisplayValues` would hand reps something the
     operator's file does not say). `kbDataTableSummary_` REPORTS duplicate
     names with their row numbers, blank-name rows, unheaded columns and a
     first column that does not look like the searched one — facts, never a
     silent merge — and a well-formed file warns about nothing (INV-186).
     Sheets' own File → Version history is the undo, which the danger confirm
     says out loud.


<a id="training-employee-docs"></a>
     **Batch 6 (2026-09-18):** the drawer is `role="dialog"` named by its own
     heading and hands focus back to whatever opened it — open it with
     Ctrl/⌘+K from inside a note field and Escape returns you there. It is
     deliberately NOT `aria-modal`: it does not trap focus, and the shell's
     trap exempts it (F-43).

## Training & Employee Docs

   - **Training & Employee Docs** — phased module
     (`docs/training-employee-docs-spec.md`). **T1 (shipped):**
     manager-assigned training built ON the Reference/KB content layer —
     a KB article/embed is assigned to employees (or `'*'` = everyone)
     with an optional due date; reps get a **My Training** checklist
     (status chips, reader modal reusing `kbMd_`/the Drive preview,
     "Mark complete"); managers get a **Team Training** completion
     matrix + assign/revoke. Tracking lives in two auto-provisioned
     tabs in the KB spreadsheet (`TrainingAssignments` append-+-revoke,
     `TrainingCompletions` append-only); re-assigning an item RESETS
     its completion (latest `assignedAt` wins — the re-certification
     mechanism). **T2 (shipped):** interactive quizzes — manager-authored
     in a Team Training editor (`Quizzes` tab, answer keys in
     `QuestionsJson` are SERVER-ONLY), assignable like KB items
     (`itemType='quiz'`), graded server-side (`submitQuizAttempt` →
     append-only `QuizAttempts`; a pass auto-writes the completion,
     `via='quiz'`). Per §9.4: unlimited retries, correct answers are
     NEVER revealed (only per-question right/wrong), attempt counts
     surface on the checklist + matrix. In the quiz editor, adding or
     removing an OPTION re-renders only that question's block
     (`trainQedQuestionHtml_` / `trainQedRerenderQuestion_` — an `outerHTML`
     swap of the whole unit the renderer emits, the drRepaintKpi_ rule, with
     focus landing in the new option; operator testing note 7, 2026-09-10 —
     the whole modal used to re-render on every click), while adding or
     removing a QUESTION keeps the full render by design (it renumbers every
     block). **T3 (shipped):** per-employee
     signable docs (reviews, PIPs, policy acks) in a DEDICATED
     `HR_DOCS_SS_ID` spreadsheet (never co-located with KB/ADP/PHI; NO
     fallback store): **My Docs** (rep — read, acknowledge+sign on a
     canvas pad) and **Issue Docs** (manager — issue with markdown
     frozen-at-issue + contentHash, optional Doc→markdown convert via
     `kbConvertDriveDoc`, dashboard, verify, void). Manager visibility
     is PER-TEAM and FAIL-CLOSED via roster column M `ManagerEmail`
     (owner + issuer + listed manager only; blank narrows, never
     widens). Signatures are append-only + tamper-evident
     (`DocSignatures`, hash excludes the timestamp — the audit row is
     the witness); the store is EXCLUDED from every retention purge.
     See INV-120/INV-121/INV-122. **T3 v2 (shipped):** reusable
     **templates** (an `EmpDocTemplates` tab — pick "Annual Performance
     Review" to prefill body + fields), **employee-completable fields**
     (text/textarea/date in addition to the signature — validated +
     stored as responses, attested in the signature hash), a
     **draft→Release** split (a draft is invisible until the manager
     Releases it), a per-employee grouped manager dashboard, and an
     **employee-side overdue reminder** (the digest now nudges both
     sides). Back-compat via trailing columns + conditional-append
     hashing. See INV-135. **T4 (partial — shipped):** an
     **overdue digest** (`sendTrainingOverdueDigest`, daily manager-tz
     7am trigger — org-wide overdue training + team-scoped overdue
     unsigned docs, heartbeat-stamped) and a **quiz-analytics** panel
     (`getQuizAnalytics`, manager-gated aggregate — pass rate / avg
     score / attempts, no answer keys) in Team Training. The remaining
     T4 item (Drive snapshot-to-PDF signing for signable embeds) stays
     on-demand. See INV-123. The rep My Training checklist was redesigned
     with completion rings; Team Training's matrix is now a reps×items CSS-grid
     status matrix. **Coaching (redesigned — design handoff PR 4, 2026-09-02):**
     ONE merged **Coaching** tab (`enterCoachingView`) for everyone, on the shared
     `.app-bar` (`Training › Coaching`). Reps see **My Coaching**: KPI strip
     (received this quarter / waiting on you / recognition), an action callout
     naming the OLDEST open item with a Jump button, a **Recognition** feed for
     praise (no acknowledgement), and month-grouped coaching cards each with an
     OPTIONAL reply box beside Acknowledge (`acknowledgeCoaching(coachId,
     response)` — the reply is written only on the open→acked transition and
     mailed to the manager as "replied: yes/no", never its text). Managers get a
     **Mine ⇄ Team** strip (real `role="tab"` buttons on `.toolbar-tabs`;
     `coachSwitchMode_`, persisted to `umsCoachingMode`) where Team is a
     **signal board** ("Who needs a 1-on-1" — per-rep 30-day severity mix bar,
     total, last, overdue, and a tier from the pure `coachRepSignal_`: priority
     (any critical, or score ≥6) / watch (≥3) / **no signal** (nothing in 21
     days — INFO-toned, an absence is not a verdict) / steady / clear), a
     filter strip with live counts (All / Needs ack / Overdue / Praise /
     Voided — voided items are EXCLUDED from All, operator decision 9; the
     choice persists to `umsCoachingFilter`), a search box + employee select
     over the cached payload, and the feed (recognition block, then cards with
     Nudge / Revisit / Void). Logging happens in a side **DRAWER**
     (`ensureOverlay` + the shared `.modal.drawer`): Coaching ⇄ Praise kind,
     three severity CHIPS (`COACH_SEV_LABELS` — `major` DISPLAYS as
     **Moderate**, the stored enum is unchanged; a client↔server mirror), an
     optional revisit date, patient/TRX, narrative + coaching point. **Server
     (INV-134 amended):** five TRAILING `Coaching` columns (`RepResponse`,
     `FollowUpAt`, `NudgedAt`, `NoteDate`, `QaFileId`; header self-heals);
     ages/overdue/median count **business days** through the shared
     `businessMinutesBetween_` core (`coachAgeDays_` — an UNKNOWN age is never
     overdue; operator decision 7); praise is excluded from open counts AND the
     ack-rate denominator (decision 8); `setCoachingFollowUp` + `nudgeCoaching`
     (once per manager-tz day per item; both manager + team-scoped + locked +
     content-free audit); **only a CRITICAL item emails the rep immediately**
     (cc the manager, no narrative/TRX/note id in the mail; a critical VOID
     sends a retraction), while minor/moderate/praise ride the Friday
     **`sendCoachingRecapDigest`** (trigger #19, heartbeat `coachingRecap`,
     never consults the manager brief flag — decision 1). The **"Coach on
     this"** button on the Team Notes Per-Rep card (styled `.cn-mgr-coach-btn`, info-toned
     beside its destructive Delete sibling since operator note 9, 2026-09-10 — it
     had shipped emitted with NO stylesheet rule; pin A9 DERIVES every
     `cn-mgr-*-btn` the card emits and requires a rule, and the Per-Rep view is
     on camera as `cn-teamnotes-rep-light-wide`) carries the NOTE DATE into
     `window.COACH_PREFILL`, so the card's note chip drills back (manager → the
     Per-Rep drill; rep → their own History at that date) and a QA chip parks
     `window.QA_OPEN_HINT` for the QA queue (the C8 pattern). Voided items stay
     hidden from reps (decision 9) and agents do NOT see their own QA reviews
     (decision 13). See INV-134.


<a id="qa"></a>
## QA

   - **QA** — call-recording review (Phase 1, operator 2026-08-27).
     GATED to managers + `QA_MEMBERS` reps (`canSeeQa_`, the
     `canSeeSpanishInbox_` pattern — a THIRD gate tier returning
     `'QA access required.'`); **agents did not see their reviews in v1**
     (operator decision) — Phase 3 revisited that gate: agents now get a
     read-only **My Reviews** tab (see below) while every reviewer
     surface stays behind `canSeeQa_`. Ingestion (operator decision): the operator DROPS
     recordings into ONE Drive folder (`QA_RECORDINGS_FOLDER_ID`) and a
     manual **Sync from Drive** button indexes new audio files
     (idempotent by FileId, audio-mime-only, bounded per run with
     truncation reported) into a DEDICATED `QA_SS_ID` spreadsheet — NO
     fallback store, the `HR_DOCS_SS_ID` posture, because recordings and
     review comments plausibly reference agents AND patients. One tab
     (`qaQueue` → `enterQaQueueView`, partial `web-app/qa/script_qa.html`):
     a queue (status new/in_review/done/skipped + filter chips + Mine;
     claim/release/manager-assign per the Spanish-claim rules) and an
     in-tab detail — playback via `qaGetAudioChunk` (base64 chunks →
     client Blob URL, seq-guarded per INV-156; **the Drive boundary is
     the `kbGetImageData` rule: folder parentage is checked BEFORE any
     bytes leave**, and an over-cap file (>40MB) names the Drive link as
     the fallback), speed chips, space/←/→ shortcuts
     (contenteditable-safe), and **timestamped comments** (a `QaComments`
     tab — soft-delete author-or-manager, refuse-over-cap, NUMBER ms
     cells) rendered as click-to-seek markers on a timeline. Shared
     AuditLog rows are id/count-only — a recording FILE NAME can carry a
     patient/agent name, so names stay in the QA store (INV-32).
     **Phase 2 (shipped, same day):** a **waveform** over the player
     (low-rate 8 kHz mono `OfflineAudioContext` decode → pure `qaPeaks_`
     → canvas bars with played-portion tint + click-to-seek — strictly
     DECORATION: every failure, incl. the 25 MB decode gate, leaves the
     flat timeline; the decoded PCM is freed once the peaks exist);
     **structured scorecards** (a `QaScorecards` tab — append-only,
     latest per (recording, reviewer) wins via `qaLatestScorecards_`;
     criteria = the `QA_SCORECARD_CRITERIA` CONFIG seed overridable by
     the same-named Script Property, sanitize-on-read; an unknown
     ratings key REJECTS by name, never whitelist-drops — a review
     record must not silently lose ratings); an **Agent field** on the
     detail (trailing `Agent` column — free text with a roster-name
     datalist, so an ex-agent's recording stays attributable; the agent
     NAME never enters the shared AuditLog); and a second tab
     **`qaStats`** (per-agent table via `mtRenderTable_` — recordings /
     reviewed / scorecards / avg + per-criterion columns from the pure
     `qaStatsAggregate_`: the `(unassigned)` bucket stays visible, a
     missing average reads as an em dash, never 0). **Phase 3 (shipped,
     same day):** the v1 agents-don't-see gate REVISITED — sharing is an
     explicit per-recording **release** (`qaSetRecordingShared`, the
     EmpDocs draft→release precedent: refused until the recording is
     attributed to its agent; a trailing `SharedMs` column, 0 =
     unshared) feeding a read-only **My Reviews** tab
     (`qaMyReviews` → `getMyQaReviews`, EMPLOYEE-gated; doubly scoped:
     SharedMs set AND Agent = the caller's roster name; latest scorecards
     + ACTIVE comments). Phase 3 shipped the tab UNGATED — the tab that
     made the QA tool visible to every rep — but **operator 2026-08-28:
     the tool is HIDDEN from non-admin/non-QA reps FOR NOW** (all three
     tabs carry `managerOnly + also:'canSeeQa'`; re-opening agent
     visibility is dropping those two flags from the one `qaMyReviews`
     registry line — the server reads stay employee-gated +
     share-scoped either way). **The same day's follow-on round added
     the audio path Phase 3 deferred:** `getMyQaReviewAudioChunk`
     (employee-gated, the SAME double scope resolved from the store
     BEFORE any Drive access, generic not-found on every scope refusal)
     plays a SHARED recording per-card in My Reviews; the Drive byte
     boundary is the SHARED `qaAudioChunkFor_` (reviewer
     `qaGetAudioChunk` = gate + shape + delegate), so the two playback
     paths cannot drift. Plus an Admin → Config **QA scorecard
     criteria** editor (`saveQaScorecardCriteria`, joining the INV-136 admin tier —
     `QA_SCORECARD_CRITERIA` was property-only) with the
     rename-orphans-ratings warning;
     **coverage-fair sampling** ("Sample 3 for me" — `qaSampleRecordings`
     assigns un-reviewed, un-assigned recordings to the CALLER only, the
     pure `qaSamplePick_` favoring agents with the fewest done reviews);
     and a **calibration table** on the Stats tab (`qaCalibration_` —
     recordings scored by 2+ reviewers, per-reviewer means + spread +
     widest per-criterion gap, FACTS ONLY per the Coverage rule). **The
     2026-08-28 #2/#3 rounds:** My Reviews' Play now renders the
     WAVEFORM + click-to-seek through the ONE shared `qaDrawWaveOn_`
     painter (decoration — its own try/catch after the audio mounts);
     review RECORDS gained an optional retention tier
     (`purgeOldQaReviews`, trigger #18, `QA_REVIEW_RETENTION_DAYS`
     default 0 = disabled — QaComments + QaScorecards only, the
     recordings index + Drive files never touched); and Storage Health
     carries the QA store row with the LIVE retention window in its
     retention field. See INV-196.
     **Design handoff PR 5 (2026-09-02) — the QA surface is COVERAGE-FIRST.**
     The Recordings tab opens with an audit-period control (`.toolbar-tabs`
     over the SERVER-shipped `periodOptions` — this month / this quarter /
     the previous quarter; the pick persists per browser as `umsQaPeriod` and
     the server's echoed `period` is the truth), a summary strip DERIVED from
     the coverage table (coverage Σmin(sampled,target)/Σtarget, a CALL-weighted
     team average with a delta vs the previous period, a Below-3.5 list, days
     left), a per-employee coverage table (`getQaQueue.coverage[]` from the
     pure `qaCoverageRows_` — one row per roster name, case-insensitive
     attribution, `avg` null-never-0; ONE tier rule `qaCoverageTier_` feeds
     both the row tint and the status pill: covered / short / short·low /
     not started / exempt), "Sample the gaps for me (N)" (N = Σ(target −
     sampled) over non-exempt reps → `qaSampleRecordings(n, period)`, whose
     `qaSamplePick_` is TARGET-aware and period-scoped), manager-only
     Grant/Revoke exemption on eligible rows (`qaSetExemption` — MANAGER-
     gated, a `QaExemptions` ledger; eligibility = two COVERED periods at
     4.5+ with no criterion under 4), and the recordings as a sortable
     `mtRenderTable_` (Recording · Agent (warn-toned Unattributed) · Length
     (`DurationSec`, written back ONCE by the client on loadedmetadata via
     `qaSetRecordingDuration`) · Dropped · Status (+ the SKIP REASON — Skip
     now asks why, `qaSetRecordingStatus(id,'skipped',reason)`; free text,
     QA-store only) · Reviewer · actions). The detail is TWO PANES from
     1000px (call left: agent block + roster-match line + player, sticky;
     review right: scorecard with 1/3/5 anchors + running average, comments,
     the coaching hand-off) with the status actions (Skip… / Start review /
     Mark done / Reopen) in the header. **Comments PAUSE-AND-PIN (Q1):** the
     first keystroke pauses playback and pins the moment; the pin is an
     editable `m:ss` field (`qaParseClock_` — a typo is refused, never posted
     at 0:00); the post uses the PIN, and the reviewer chooses Post & resume /
     Post & stay paused / Discard. The old composer read `audio.currentTime`
     at SUBMIT, so a comment landed wherever the player had drifted to while
     the reviewer typed. **Q3:** every 1–5 figure is toned by the ONE
     `qaScoreTone_` (≤2 destructive, 3 neutral, ≥4 accent) and ONE transport
     renderer (`qaRenderTransportFor_`, listener-bound to the audio element it
     controls) serves the detail AND My Reviews, whose page now leads with a
     read-only info callout and a prominent per-card average. **Q7:** a
     manager's "Coach on this call" parks `COACH_PREFILL {empId, qaFileId,
     what}` (the comments as the narrative) and enters `develop/coaching`;
     it needs the call attributed to a ROSTER agent (`agentEmpId`, joined
     server-side). Operator decision 13 holds: agents still do not see the
     tool (QA-14 stays gated). See the INV-196 amendment.
     **QA Log + typed rubric + the recording-less fallback (operator
     2026-09-04).** A FOURTH tab, **Log** (`qaLog` → `enterQaLogView`, the
     same `managerOnly + also:'canSeeQa'` gate), is the QA agent's "Notes"
     equivalent for daily progress tracking — and it is a READ over the SAME
     `QaScorecards` store, never a second table: **one entry per recording
     audited = the latest scorecard per (recording, reviewer)** (operator
     decision 1). `getQaLog({reviewer, from, to})` (canSeeQa_, bare `{error}`
     read gate) folds via the pure `qaLogEntries_` (day window inclusive in the
     manager tz, an audit whose recording is no longer indexed still LISTS with
     blank recording fields — INV-187, `avg` null-never-0, per-(recording,
     reviewer) active comment counts as decoration), payload-capped with the
     pre-slice `total` (INV-169), span capped 92 days, default the trailing 30.
     **Managers see every reviewer's log** (decision 2 — a reviewer picker over
     `reviewers[]`, `'*'` = all); a NON-manager is scoped to self whatever they
     ask for. Client: the shared `mtDateRange_` (7d / 30d / QTR), a refetch-free
     search, a summary strip DERIVED from the loaded entries, day groups, cards
     with the typed rating chips, and opening an entry parks `QA_OPEN_HINT` and
     enters the queue (the C8 pattern) — the scorecard is still written on the
     detail, the ONE write path. **Rubric criteria have TYPES** (decision 3 —
     defined later in Manage → Admin → Config → QA scorecard criteria): `scale`
     (1–5, the default), `check` (a Yes/No pair) and `choice` (a dropdown with
     2–12 options). The canonical shape carries `type` only when not scale and
     `options` only for choice, so the CONFIG seed, every stored blob and the
     save-the-seed-deletes-the-property rule are byte-identical. **The storage
     rule is load-bearing:** a non-scale answer is stored as a NON-NUMERIC
     string (`'yes'`/`'no'`, the option's own spelling — the editor REFUSES a
     bare-number option by name), so `qaCardStats_`, `qaStatsAggregate_`,
     `qaCalibration_`, the coverage join and every verbatim mock.js copy stay
     type-blind and UNCHANGED; `qaRatingNormalize_` (pure) refuses by name
     rather than coercing. **The recording-less fallback** ("audits don't
     happen without a recording attached, for posterity, but it should at least
     be a fallback"): `qaCreateManualRecording(agent, label)` appends a
     synthetic `manual-<uuid>` QaRecordings row (mime `manual`, in_review,
     assigned to the caller) so coverage/stats/log treat it uniformly, the Drive
     boundary refuses it BY CONSTRUCTION (folder parentage fails — no special
     case), the client skips the player and pills it "no recording", and its
     audit row (`QaManualRecording`) is id-only. The Log's "Log an audit" dialog
     offers the caller's open assignments first and the manual entry LAST.
