# Team Tools — CLAUDE.md

Internal tooling for the UMS CSR team. Each project ships as a Google
Apps Script project under its own directory, synced via `clasp`.

## Doc map — which file holds what

Batch D1 (2026-09-14) split this file. It had grown to 12,661 lines, which is
long enough that a reader stops reading and a `/sync-docs` pass starts guessing
where an update belongs. Nothing was rewritten — the entries moved VERBATIM and
this file keeps an index into each.

<!-- DOCMAP:BEGIN -->
| File | Holds | Read it when |
|---|---|---|
| `CLAUDE.md` (this file) | Projects, Development, Common Gotchas, the running-totals block, the Key Design Decisions INDEX, the Operator State Checklist (storage map + per-property entries), Cycle State & Memory | You are about to change code and need to know what has bitten before |
| [`docs/design-decisions.md`](docs/design-decisions.md) | The 137 Key Design Decisions in full — WHY the code is shaped as it is | You are about to change a decision, or want the reasoning behind one |
| [`docs/operator-log.md`](docs/operator-log.md) | The dated deploy-round entries — what each round changed for the operator | You are reconstructing when a setting or behaviour appeared |
| [`.cycle/config.md`](.cycle/config.md) | Cycle Workflow Config: Test Command, Health Dimensions, Axis B, Subsystems, the Invariant Library, the Visual Audit Stage, Policy, Seams cadence, Regression Scenarios, Frozen Subsystems, Deploy Command | A workflow command says "read CLAUDE.md's Cycle Workflow Config" |
| [`.cycle/STATE.md`](.cycle/STATE.md) | The CURRENT cycle only | Resuming work; `/cycle-status` |
| [`.cycle/HISTORY.md`](.cycle/HISTORY.md) | Closed-cycle STATE blocks, newest first | Reconstructing a past cycle |
| [`PROJECT_HEALTH.md`](PROJECT_HEALTH.md) | Current Standing + Score History | `/health-pulse`, portfolio reporting |
| [`test/client/README.md`](test/client/README.md) | How the Node + DOM harnesses work | Writing or debugging a pin |
| [`test/visual/README.md`](test/visual/README.md) | How the visual matrix works | Before a `/broad-scan`'s Visual Audit Stage |
| [`docs/deployment.md`](docs/deployment.md) | Blue-green: the dev instance alongside prod | Standing up or using the DEV project |
<!-- DOCMAP:END -->

**Append-only archives** — `.cycle/STATE.md`, `.cycle/HISTORY.md`,
`PROJECT_HEALTH.md`. A count written in one of these is a FACT OF ITS DATE
("the post-push run read 315/315"), not a live claim, so the running-totals ban
skips them; every other file above is live guidance and must cite the block.
Adding an archive means naming it on this line — the pin derives the exclusion
from here, so an undeclared file is scanned.

**Where a `/sync-docs` update belongs:** a new gotcha or a change to how the code
behaves → this file. A decision and its reasoning → `docs/design-decisions.md`
(add a line to the index here). A dated round note → `docs/operator-log.md`,
newest-first at the top. A new invariant, scenario or subsystem →
`.cycle/config.md`. **Every number any of them quotes → nowhere: cite the
generated running-totals block below, which CI checks.**

## Projects

- **web-app/** — Multi-module browser web app deployed at one Web App
  URL. Hosts **eight** tools today, registered side-by-side in the
  `TOOLS` registry in `script_core.html` — the seven feature modules below
  plus the consolidated manager/admin **Manage** module (see the
  multi-tool-registry Key Design Decision for its four tabs). The count
  said "six" until cycle 12 even though the Manage module shipped in the
  registry reorg; keep it in step with `Object.keys(TOOLS).length`:
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
     Backs a shared Google Sheet (`CONFIG.ADP_SS_ID` in `web-app/Code.js`).
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
     counts) — (server-aggregated via
     `getMyMetricsRange(from, to)` — caller-scoped self-aggregate, no team
     line/series), rail-row sparklines, and a sortable + sticky-header team
     table with tri-tone % cells (the table renders via the shared
     `mtRenderTable_` component, see Key Design Decisions).
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
     Backs the CDR Report spreadsheet (`CONFIG.CDR_SS_ID`).
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
  Adding a new tool: append an entry to `TOOLS`, drop a partial in
  `web-app/<tool>/script_*.html`, `include()` it from `index.html`,
  add server endpoints to `Code.js` alongside existing ones.
The Workspace Add-on path (the old `call-notes/` scaffold — **deleted from the
tree in cycle 13**, see Frozen Subsystems) is abandoned
because admin policy on the org domain prevents install of Marketplace
Add-ons without ticket-driven allowlisting; the web-app pattern works
today with zero admin involvement. **`web-app/` is now the only project
directory** — see Frozen Subsystems for what was removed and why.

## Development

`web-app/` is the only clasp project.

```bash
cd <project-name>
clasp pull         # sync the deployed Apps Script down to disk
clasp push -f      # push local changes back up
clasp open         # open the project in the Apps Script editor
```

After `clasp push`, the Web App URL still serves the previous version
until you cut a new deployment: Apps Script editor → Deploy → Manage
deployments → Edit → Version: **New version** → Deploy. Web app users
see the change on next page load.

**Blue-green (a personal dev instance alongside the team's prod):** run a
SEPARATE dev Apps Script project from this same source with `npm run push:dev`
(prod stays `npm run push:prod` / a bare `clasp push -f`). The dev instance has
its own copy Sheets + your-inbox email config so you can fully use it — send
emails, create notes — without touching the team's live data or inbox. Full
setup + operating procedure (incl. the `INSTANCE_LABEL` / `INSTANCE_IS_PROD`
Script Properties and the `DevTools.js` roster scrubber) is in
`docs/deployment.md`.

For Apps Script tests (`Tests.js` in each project), run them from the
editor: pick a `runSmokeTests` / `runAllTests` function and click ▶.
**The runbook is smoke on prod, full on dev nightly (Batch S, 2026-09-11):**
`runNightlySelfTest` runs the full suite on the DEV instance every night, and
`runAllTests` on prod is the exception, not the routine (with
`INSTANCE_IS_PROD=true` it refuses outright). When a full run must be split —
a mid-shift manual run contends for the one project ScriptLock — run
`runAllTestsPartA` and `runAllTestsPartB` as two executions; together they are
exactly `runAllTests`. The summary's `Expected: N registrations` line is
DERIVED from the registration list — read the expected count off the run,
never off a doc — and the `── Suite environment ──` block at the top of the
log names every deployment setting the outcome depends on (instance markers,
`ADMIN_EMAILS`, `MANAGER_EMAILS`, the fixture properties, the TEST rows).

**Only `web-app/` is clasp-synced / deployed.** Everything else in the repo is
local-only and never reaches the live Apps Script project: `test/` (the Node
harnesses) and `docs/` — including **`docs/design_handoff_team_tools_redesign/`**
(the redesign mockups: `*.dc.html` static mockups, `support.js`, screenshots,
`icons_snippet.md`). Those design-handoff files are **non-deployed reference
artifacts**: `support.js` is mockup-support JS for the standalone `.dc.html`
files, NOT app code — do not `include()` it from `index.html` or wire it into
the shell. A redesign lands in the real partials under `web-app/<tool>/` +
`styles*.html` + `script_*.html`; the handoff folder is the spec to implement
*against*, not code to ship.

## Common Gotchas

These accumulate as audits surface real production hazards. Treat
each entry as something that has bitten the project before — read
this section before touching the relevant area.

- **CDR duration columns MUST use `getDisplayValues()`.** The CDR
  Report spreadsheet has a timezone mismatch (spreadsheet TZ
  `America/Mexico_City` vs script TZ `America/Chicago`). Duration
  columns (TTT col I, ATT col J) get a phantom offset if read via
  `getValue()`. (`AvgAbdWait` col AG / `CsrAvgAbdWait` col AH are also
  duration columns but were removed from the `CDR` enum as unused — if
  you ever wire them in, they MUST use `getDisplayValues()` too.) `getCdrAgentMetrics_()` and `getCdrDailyBreakdown_()`
  both read the full range with `getDisplayValues()` and parse the
  H:MM:SS strings via `cdrParseHms_()`. Never use `getValue()` for
  these columns. Same gotcha exists in `call-data-reporting`'s
  `Data.gs` — see that repo's CLAUDE.md for the full explanation.
- **DQE has ONE row per (agent, date) — per-queue rep metrics do not exist
  (cycle-14 Phase 0).** Measured against the operator's live sheet, not
  assumed. Two consequences worth knowing before anyone re-opens this:
  (a) `answered`/`missed`/`% answered`/talk-time can never be broken down by
  queue, because the row carrying them is not queue-scoped; (b) **`CDR.QUEUE_EXT`
  (col 4) is NOT a queue key** — it holds comma-separated MEMBERSHIP lists
  (`103,108`, and `108,103` / `103,138,108` — the same sets in different
  orders), i.e. which extensions an agent covered that day. It is a dimension
  of the AGENT, not of the call, and anything reading it must treat it as an
  unordered set. Per-queue attribution exists only for TRANSFERS — see the
  Phase 1 Key Design Decision. The `A_Q_*` queue-aggregate rows
  `isCdrQueueSentinel_` skips are real but far too sparse to build a series on
  (8 queues / ~12 rows in a week).
- **A diagnostic that can never be clean is worse than none — the CDR
  name-match card (cycle 15).** Both roster↔CDR mismatch directions are
  PERMANENTLY non-empty on this deployment, so neither can drive a status
  card: `unmatchedAgents` lists every CDR agent not on our roster, but the CDR
  Report covers the WHOLE phone system (it is owned by `call-data-reporting`)
  while our roster is one team — **there is no department filter;
  `CONFIG.CDR_DEPARTMENT` is declared and read NOWHERE** (its only other
  mention was a `getCdrAgentMetrics_` doc comment claiming it filtered, now
  corrected). Reported 78 strangers in practice. The reverse list
  `rosterWithNoCdr` fails identically: the roster set is every NAMED employee
  row, so managers, admin staff, and anyone on PTO across the whole window are
  in it forever — swapping the tone to it just moves the always-amber problem.
  The **intersection** is the signal: a roster rep with no call data whose name
  resembles an unmatched CDR agent is one person spelled two ways, which means
  their calls are silently missing from every metric. `cdrLikelyNameMismatches_`
  (pure, Node-pinned) pairs them on **normalized-equal OR ≥2 shared name
  tokens** — two, not one, because a shared surname is a coincidence on any
  real roster; a nickname sharing only a surname ("Robert Smith" vs "Bob
  Smith") is a deliberate false NEGATIVE, since under-reporting is the safe
  direction for something that raises a warning. That set is normally EMPTY,
  so the card reaches green, and it names the exact `Agent Alias Overrides`
  row to add. **The general rule: before toning a health indicator off a
  count, ask what that count reads on a healthy production system — if the
  answer is not zero, it is reference detail, not a signal.**
- **Roster INCLUSION goes through `empRosterEmail_(row)` — the one predicate
  (cycle-15 F3).** Offboarding here means clearing the email while KEEPING the
  name, so a name-only row is not a person to count. FOURTEEN walks each decided
  that for themselves and did not agree: NINE tested raw truthiness
  (`if (!rows[i][EMP.EMAIL]) continue;`), THREE trimmed, and TWO tested nothing.
  A WHITESPACE-ONLY email cell therefore made the first two groups DISAGREE —
  the identical shape column L had before `cnEnrolledSheetId_` (INV-167), on a
  second column. The un-guarded pair mattered unequally: `getTeamMetrics` ACTS
  on it (its gate is `if (cdr || noteCount > 0 || …)`, and an offboarded name
  still matching DQE history satisfies it, so a departed employee got a full row
  in the manager's team table AND their volume flowed into `teamTotals`), while
  `getPunctualityReport` was harmless only by coincidence downstream
  (`if (!dates.length) return` drops a rep with no punches). The predicate
  returns the TRIMMED email or `''`, so it can only NARROW the nine raw call
  sites — the correct direction, matching INV-167's resolution. It is NOT an
  authorization check; `getEmployeeInfo_` still identifies the caller. Pinned by
  the F3 tripwire, which bans the raw guard shape ANYWHERE in `Code.js` (derived,
  not a hand list — INV-179) rather than enumerating today's fourteen walks.
- **A declared-but-unread CONFIG key / enum member is a defect, not clutter
  (cycle-15 F1/F2).** The next reader assumes it is wired. Removed:
  `CDR_DEPARTMENT` (whose `getCdrAgentMetrics_` doc comment CLAIMED it filtered
  the read — it never did; there is no department filter, which is why the CDR
  name-match diagnostic is permanently non-empty), `TRAINING_DIGEST_WEEKDAY` /
  `REVIEW_DIGEST_WEEKDAY` (the weekly-digest trigger hardcodes
  `ScriptApp.WeekDay.FRIDAY`, so editing these was a SILENT no-op for an
  operator trying to move the digest), and `CALL_NOTES.SUBFORM_COL_JSON` (a
  toggle that never existed). `EOD_WARNING_WINDOW_MINUTES` is deliberately
  retained and is now marked `DEAD` at its declaration — the allowlist entry in
  the F1 tripwire REQUIRES that marker, so "retained on purpose" and "forgotten"
  stay distinguishable. Same class in the enums: `CDR.QUEUE_EXT` was read by
  cycle-14 Phase 0 yet stayed dead because the read used bare positional
  offsets — now DERIVED from the enum, so the read follows a column move
  instead of silently reading its neighbour. **Col 4 remains the one CDR column
  absent from `CDR_EXPECTED_HEADERS`, deliberately and temporarily:** that
  validator substring-matches, so an entry whose text is not in the real header
  raises a FALSE "Column drift" warning and flips the CDR health card amber —
  the same always-wrong-signal class this cycle removed. The real col-4 header
  text in the `call-data-reporting`-owned sheet has never been recorded, and
  guessing it is worse than the gap. **Operator: read the col-4 header off the
  DQE tab and add `4: '<that text>',`** — a one-line close. Exposure meanwhile
  is small (an INSERT at col 4 shifts 5..10 and IS caught; only an in-place
  repurpose slips through, into a manual diagnostic rather than a metric).
  Pinned by the F1 tripwire (every CONFIG key has a reader, allowlist must
  self-declare).
- **CDR enrichment in `managerGetShiftStats` is best-effort.**
  The CDR overlay that adds `cdr` and `noteCoverage` fields to each
  rep's shift-stats card is wrapped in a try/catch. If the CDR
  spreadsheet is unreachable (missing `CDR_SS_ID` Script Property,
  deployer account lost access, etc.) the existing call-notes stats
  still return normally — the `cdr` field is simply absent. Client
  rendering checks `r.cdr` before showing CDR rows.
- **Secrets via Script Properties, not CONFIG.** `getAdpSS_()`,
  `getCdrSS_()`, `getManagerEmails_()`, `getDepartmentEmails_()`, and
  `getStateTaxRates_()` read `ADP_SS_ID`, `CDR_SS_ID`,
  `MANAGER_EMAILS`, `CN_DEPARTMENT_EMAILS`, and
  `CN_STATE_TAX_RATES` from Script
  Properties first, falling back to the CONFIG placeholders.
  Set the real values once in Apps Script editor → Project Settings
  → Script Properties (or use the Admin tab for dept/rate config);
  clasp pull/push leaves Script Properties untouched, so the
  committed `Code.js` never has to be scrubbed.
  Projects that haven't migrated can still set CONFIG values directly,
  but then every clasp pull will pull real values and require a scrub
  before commit.
- **Script Properties are CAPPED — ~9KB per value, 500KB per store — and the
  advertised entry caps were never the binding constraint (Batch Q, 2026-09-11).**
  `saveEmailTemplates` admits 50 templates × 4000 chars, i.e. ~200KB into a slot
  that holds ~9KB; `saveQaScorecardCriteria`, `saveBreakSchedules`,
  `saveUpdateSuggestions` and ten more are the same shape. A `setProperty` past the
  cap throws, and every one of those endpoints writes its `AdminConfigChange` audit
  row BEFORE the save returns — so the operator saw an opaque platform error with an
  audit row claiming the change landed. **`propSetBounded_(key, value, opts)` is the
  ONE writer for every JSON-blob property**, and the split is deliberate: the 14
  OPERATOR-edited blobs **REFUSE by name with nothing written** (the error names the
  key, the byte size, the cap and what to shorten — there is a person to tell, so
  telling them beats guessing what to drop), while the 6 AUTO-MANAGED blobs
  **DEGRADE** through a caller-supplied shrinker (`propShrinkDropOldest_` for the
  stamp maps, `propShrinkStripFields_` for the self-test result, two custom ones) —
  nobody is watching a heartbeat write, so refusing would just lose it. **Size is
  measured in BYTES via `utf8Len_`, never `.length`:** a JS string length counts
  UTF-16 units, so it under-counts every non-ASCII character (an emoji in a template
  is 4 bytes, not 2). Three rules for anything new: (a) a blob write goes through the
  helper — the Q-1 pin is DERIVED, so a bare `setProperty` of a known blob key fails
  CI; (b) a SCALAR write (a day count, a dollar cap, a model key, a folder id, a
  generation counter) may stay on `setProperty` but must be allowlisted BY NAME with
  a reason; (c) a degrade that cannot shrink **deletes the property and logs why**
  rather than leaving a stale value — every degrade target is a cache or heartbeat
  that regenerates, and "no heartbeat recorded yet" is honest where a frozen old
  stamp is not. `propShrinkDropOldest_` drops oldest-first UNTIL IT FITS rather than
  one entry per call, because a caller's retry loop is a safety net and a large map
  would exhaust it and clear the property. See INV-201.
- **A test function defined TWICE silently wins, and the registration count stays
  right (Batch S, 2026-09-11).** `Tests.js` is one file of top-level `function
  test_X()` declarations; a second declaration of the same name HOISTS OVER the
  first, so both registrations run the later body, the earlier test's assertions
  never execute, and the summary still reports the full count — the failure is
  invisible in every direction a reader looks. It fired: #239 added
  `test_triggerGate_weeklyDigests_nonManagerThrows` for the `runWeeklyDigests`
  DISPATCHER beside the existing one for `sendCallNotesWeeklyDigests`, so that
  digest's own gate went unverified while the suite read a clean 315. The dispatcher
  test is `test_triggerGate_runWeeklyDigests_nonManagerThrows` now, and the S1/S4
  pin fails CI on ANY test function defined twice — the net, not the rename.
- **Sheets coerces `'TRUE'`/`'FALSE'` strings to native booleans.** On
  write, `setValue('FALSE')` stores boolean `false`; on read,
  `getValues()` returns the boolean. Naive `String(value || '').trim()`
  then short-circuits `false` to `''` and downstream `=== 'false'`
  checks miss — `ptoEnabled` defaulted to TRUE for contractors marked
  FALSE until this was fixed. Always handle null/undefined/`''`
  explicitly before stringifying any TRUE/FALSE column.
- **Sheets auto-coerces `HH:mm:ss` strings to Date objects.** On
  read, `row[ADP.TIME]` may come back as a JavaScript Date —
  `String(date)` produces `"Sat Dec 30 1899 ..."` and breaks all
  downstream display logic. Always read times through
  `normalizeTime_()`, which detects Dates and re-formats them via
  the spreadsheet's timezone.
- **AuditLog timestamp cells coerce to Dates too — read via
  `normalizeAuditTs_()`.** `writeAuditLog_` appends a
  `yyyy-MM-dd HH:mm:ss` string (CONFIG.TIMEZONE wall time) that Sheets
  coerces to a datetime; `String(cell)` yields `"Tue Jun 10 2026 ..."`,
  which silently fails every `substring(0,10)` date filter and
  `convertAuditTs_` parse. The compliance audit panel returned ZERO rows
  in this state until the first full `runAllTests` exposed it.
  `getManagerDashboard` (recent audits), `cnReadCallNoteAuditRows_`, and
  `getAutomationHealth` all route through `normalizeAuditTs_` now —
  any new AuditLog timestamp read must too. **The AuditLog's OTHER coerced
  columns bit the same way (cycle 7 M-3/M-4):** the `PunchTime` cell (col 7,
  written `HH:mm:ss`) coerces to a time-of-day Date — read it via
  `normalizeTime_` (a raw `String()` rendered a constant "12:00 AM" in the
  manager Recent Activity feed) — and `IsAdjustment` (col 8, written
  `'TRUE'`/`'FALSE'`) coerces to a native boolean, so `String(x) === 'TRUE'`
  is always false (compare case-insensitively; the ADJ badge + adjustment
  reason never rendered until fixed). **The `PunchDate` cell (col 5, written
  `yyyy-MM-dd`) coerces to a Date the SAME way (F cycle-8):**
  `cnReadCallNoteAuditRows_` read it raw into `dateLocal`, so the compliance-panel
  "View note" deep-link handed a `"Wed Jul 15 2026 …"` string to
  `managerGetCallNotes` (whose `^\d{4}-\d{2}-\d{2}$` guard rejects it) → the
  drill-through silently died while the panel looked fine (the visible timestamp
  uses the correctly-normalized `timestampMgr`). Now read via `normalizeDate_`,
  matching `getManagerDashboard`'s col-5 read; pinned by a `dateLocal`-shape
  assertion in `test_auditPanel_searchAndHistory`. **Batch 3 (cycle-8) gave the
  AuditLog the named `AUDIT` column enum it lacked plus a single typed reader
  `auditRowObj_(row)` — the ONE coercion-recovery point (TS / PunchDate /
  PunchTime / IsAdjustment recovered once via the normalize helpers). All four
  AuditLog readers now route through `AUDIT.*` (the two coerced-column readers,
  `getManagerDashboard` + `cnReadCallNoteAuditRows_`, via `auditRowObj_`; the two
  non-coerced ones, `computeAutomationHealth_` + `adminSheetView`, via `AUDIT.*`
  for TS/action/name/notes). A GLOBAL Node tripwire (the INV-142 pattern) now
  fails CI on ANY raw read of a coerced `AUDIT` column outside `auditRowObj_` —
  the F1-catching net the old per-function M-3/M-4 tripwire (replaced) couldn't
  provide. NEW AuditLog reads must go through `auditRowObj_`, never a bare index
  (`auditData[i][5]`) — the bare-index style was the root cause F1 exposed.** The
  SAME class applies to
  every other `yyyy-MM-dd HH:mm:ss` column in the ADP spreadsheet:
  `TO.SUBMITTED_AT` (a raw `String()` read flattened the manager
  pending-trend sparkline to zero since it shipped, and it doubles as
  the row-match key for `updateTimeOffStatus` / `cancelTimeOffRequest` —
  BOTH the key-producing reads and the matchers normalize identically)
  and `PAR.SUBMITTED_AT` (sort/display). A Node tripwire fails CI on any
  raw `String(rows[i][TO|PAR.SUBMITTED_AT])` read in `Code.js`/`Tests.js`.
- **CN coercion recovery formats in the HOST sheet's own tz — a drifted
  per-rep sheet tz no longer breaks note reads (Part A, operator
  2026-08-27).** A coercing sheet interprets stored digits in ITS OWN tz, so
  recovery must format in that SAME tz or the digits shift by the tz delta.
  This bit LIVE twice at once: the operator's per-rep sheet (tz
  America/Chicago) coerced a `…T14:16` timestamp to 14:16 Chicago, and the
  old recovery in the ADP tz (Asia/Kolkata) displayed it as **1:46 AM the
  next day**; a PH rep's `DateLocal` (midnight Asia/Manila) recovered in IST
  as **21:30 the previous day**, so their just-logged note vanished from the
  rolling stack and surfaced under yesterday in History. (The first diagnosis
  — a blank roster Timezone cell — was FALSIFIED by the operator checking
  column H; the write side was always correct, the stored strings were never
  wrong, only the read-side recovery tz was.) Now: `getCallNotesSheet_` (the
  single per-rep opener, INV-167 boundary) memos the host sheet's tz per
  execution (`cnHostTz_`, degrading to the ADP tz on a failed read — the
  pre-fix behavior, never worse); `cnTimestampString_` and the new
  `cnDateLocalString_` (the CN twin of `normalizeDate_`, swapped in at all
  26 CN-region `CN.DATE_LOCAL` sites) format in it. Round-trip holds BY
  CONSTRUCTION for any sheet tz — a no-op on pinned sheets, and it
  retroactively corrects the DISPLAY of every historical note on a drifted
  one. "Last-opened wins" is safe: every cross-rep walk converts rows INLINE
  within its own rep's iteration (verified). `provisionCallNotesSheet` /
  `setupTestEnvironment` still pin new sheets to the ADP tz (defense in
  depth — non-CN consumers like `parseRetentionDateMs_`'s purge windows
  still assume it, an accepted off-by-hours on day-granularity windows).
  Pinned by PTA-1/2/3 (both symptoms driven against a real Intl oracle +
  a derived ban on `normalizeDate_` over `CN.DATE_LOCAL`).
- **Sheet LOCALE (not just timezone) can coerce stored ISO-T strings to
  Dates — and `SpreadsheetApp.create()` inherits the SCRIPT tz + deployer
  locale.** Two sides of one class (cycle 7 H-2/M-14): (a) some locales
  coerce the `yyyy-MM-dd'T'HH:mm:ss` form on read (the reason
  `formTokenCellMs_` exists) — the CN `Timestamp` column now routes through
  `cnTimestampString_` (recovers a coerced Date back to the as-written
  T-form digits **in the HOST sheet's own tz** — Part A 2026-08-27, see the
  host-tz gotcha above; raw `String()` silently broke sorting/shift-span/EOD
  displays and FAIL-OPENED the 5-min delete window); Storage Health surfaces
  each store's locale with a warn pill when it differs from the ADP sheet's.
  (b) `createPinnedSpreadsheet_(name)` is the ONLY sanctioned way to create
  a spreadsheet — it pins BOTH tz and locale to the ADP sheet's (a bare
  `SpreadsheetApp.create()` inherits the script tz `America/Chicago`, which
  shifted raw coerced Date/time cells copied into the ADP payroll export).
  A Node tripwire fails CI on any bare `SpreadsheetApp.create(` outside the
  factory and pins the factory's tz+locale calls + the three call sites
  (export, CN export, provisioning).
- **Timesheet rows are in APPEND order, not time order.** A same-day
  back-fill (approved adjustment request, manager Day Edit add,
  employee immediate-adjust) appends its row AFTER later punches, so
  raw sheet order scrambles any "last punch wins" / state-machine
  consumer — live status read "On Lunch" after a rep had clocked out
  until this was fixed. `getTodayPunches_` and `getManagerDashboard`'s
  per-emp collector now sort chronologically at the source (normalized
  `HH:mm:ss` strings, lexicographic = chronological); `getTeammateStatus`
  max-time-selects. Any NEW consumer of same-day punch rows must sort
  by time (or reuse `getTodayPunches_`) — never derive order from raw
  row position. Pinned by `test_getTodayPunches_sortsOutOfOrderBackfill`.
- **The live punch path enforces the client's own state machine; Day Edit
  reconciles duplicates (cycle-10 M-1).** `recordPunchCore_`'s live (non-adjust)
  path (the guarded body behind the public `recordPunch` wrapper since
  2026-08-17 — the wrapper attaches a fresh `state` AFTER the lock releases so
  a punch confirms in ONE round trip) validates the punch type against `getNextActions_(todayPunches)` —
  the SAME function the client renders its buttons from — so a STALE window
  (second browser / pinned pop-out that missed a punch made elsewhere, or a
  direct RPC) can no longer append a duplicate ClockIn/ClockOut or an
  out-of-sequence lunch punch. A fresh client is never rejected; multi-lunch
  stays legal (LunchOut is re-offered after LunchIn); adjustments bypass (their
  own window/format guards apply); the guard runs AFTER the min-interval check
  so rapid-fire keeps its friendlier error. For rows that predate the guard:
  `findExistingPunch_` returns the LAST matching row (agreeing with
  `managerSaveDay`'s snapshot — first-match updates used to land on a
  different row than the one displayed), and `managerSaveDay` snapshots ALL
  rows per type — a blank slot deletes EVERY row of that type, a kept slot
  collapses extras to the displayed (last) row with `duplicate collapsed`
  audit rows (the S7 full-day-reconcile contract; note this also collapses a
  legitimate multi-lunch day to the 4 displayed slots — the modal can only
  express one pair). RELATED DECISION (C3, retracted finding): `calcHours_`'s
  overnight wrap (`out <= in` → +24h) is DELIBERATE, pinned by
  `test_calcHours_overnight` — it trades mis-keyed AM/PM pairs rendering as
  long days for same-date overnight pairs computing correctly; don't "fix"
  one direction without an operator decision. Pinned by
  `test_recordPunch_liveSequenceGuard` +
  `test_managerSaveDay_collapsesDuplicateRows` + the M-1 Node pins.
- **`CN.DATE_LOCAL` is a Sheets-coerced Date on read.** The
  `DateLocal` column is written as a `yyyy-MM-dd` string but Sheets
  coerces it to a Date object on read, so `String(row[CN.DATE_LOCAL])`
  produces a JS Date `toString` that never matches a `yyyy-MM-dd`
  comparison. Always read it via `cnDateLocalString_` (the host-tz CN twin
  of `normalizeDate_` since Part A 2026-08-27 — `normalizeDate_` formats in
  the ADP tz, which shifted a Manila-coerced midnight a day back). The
  Metrics module (`getMyMetrics` / `getTeamMetrics`) regressed on the raw
  read — note coverage silently reported 0 — fixed in cc58d53. Every
  CN-region `CN.DATE_LOCAL` read routes through `cnDateLocalString_`
  (a PTA-3 derived scan bans `normalizeDate_` over that column); ADP/TO/
  PAR/AUDIT date reads keep `normalizeDate_` — the ADP sheet is its own
  host.
- **ScriptLock around every mutating op.** Every server function
  that writes to a sheet (`recordPunch`, `submitTimeOffRequest`,
  `updateTimeOffStatus`, `deletePunch`, `managerSaveDay`,
  `cancelTimeOffRequest`, `managerSubmitTimeOff`, `selfDeletePunch`)
  wraps its body in `LockService.getScriptLock().waitLock(15000)`
  and releases in `finally`. Skipping the lock causes interleaved
  approvals to double-deduct PTO balances.
- **`normalizeType_` strips the `ADJ-` prefix.** Adjustments are
  stored in the COMMENTS column as `ADJ-ClockIn` / `ADJ-LunchOut` /
  etc. Reading `row[ADP.COMMENTS]` directly and comparing to
  `'ClockIn'` will silently miss adjustments. Always go through
  `normalizeType_()`.
- **Roster cache invalidation + key bump.** Employee data is cached
  for 300s under `ROSTER_CACHE_KEY` (currently `employee_roster_v11`).
  After editing any Employees-sheet column (`adjustLeaveBalance_`,
  manual edits for test setup, etc.) call `invalidateRosterCache_()`
  or subsequent reads will return stale balances for up to 5
  minutes. Whenever the `EMP` enum changes shape (new column),
  bump the cache key — old cached entries would have wrong column
  indices.
- **`PtoEnabled` defaults to TRUE.** Column K (`EMP.PTO_ENABLED`)
  defaults to enabled when blank — for back-compat with rows
  added before the column existed. Someone who earns no paid leave at all
  needs an explicit `FALSE` / `no` / `n` / `0` in this
  column — note this is NOT the same as "does not get a fixed annual
  allotment": an ACCRUING rep (roster column Q, INV-194) must stay `TRUE`,
  or the accrual credit skips them entirely. The PTO UI then hides for them entirely (employee Calendar
  ring, decision email balance line, etc.). **The per-row gate also
  guards the DEDUCTION, not just display** — `adjustLeaveBalance_`
  returns `null` (no change) for a `FALSE` employee even when the
  global `enablePtoTracking` flag is on, so approving / manager-filing
  a request for a contractor can't drive their balance negative. (Until
  the M-1 fix the deduction gated only on the global flag, silently
  contradicting S15; the read-side `getEmployeeInfo_`/`lookupEmployeeById_`
  parse the same coercion-safe `FALSE`/`no`/`n`/`0` values.)
- **Sick leave is UI-removed but backend-dormant (deferred #2 / C1).**
  `'Sick Leave'` was dropped from `TIME_OFF_TYPES` (and the `day-type`
  `<select>` options), so no NEW sick request can be created — via the UI
  picker OR a direct `submitTimeOffRequest`/`managerSubmitTimeOff` RPC
  (`isValidTimeOffType_` rejects it, INV-95). But the SICK BACKEND IS KEPT
  ON PURPOSE: `getLeaveDeduction_`'s `sick` mapping (+ its mirror
  `LEAVE_DEDUCTION_CLIENT`), `adjustLeaveBalance_`'s sick column (J), the
  PTO-reconciliation sick handling, and roster column J all stay so
  historical Approved-sick rows still revert/reconcile to the SICK bucket.
  Removing them would silently restore legacy sick reverts into the ANNUAL
  bucket (a balance-corruption regression). Treat the sick path as
  read/revert-only legacy — don't re-add `Sick Leave` to `TIME_OFF_TYPES`
  without re-deriving this.
- **A test fixture that writes DIRECTLY to a store behind a RESULT CACHE owes
  the production writer's invalidation (operator run, 2026-08-19).** The
  2026-08-18 load-time round gave `getDeptRequests` a per-caller CacheService
  result cache keyed by a generation salt that its two PRODUCTION writers bump
  (`emailFromCallNote`'s auto-log append and `markDeptRequestResolved_`).
  `test_deptReq_incomingAndMemberResolve` builds its fixture by appending a row
  to the `DeptRequests` tab directly — a path production never takes — so no
  bump happened, and the read-back was served from the entry the omnibus gate
  test had warmed for that same employee minutes earlier. Red suite, correct
  code: the FIXTURE was stale, not the endpoint. It sat undetected because the
  editor suite had not been run since the cache shipped. The fix is one line
  (`drBumpCacheGen_()` between the append and the read, and again after the
  cleanup delete), and the general rule is the one this entry's title states —
  when you add a result cache, check whether any test writes to that store
  outside the endpoints you just taught to invalidate it. Pinned by an
  ordering assert (bump strictly between the append and the read — a bump only
  in `finally` is too late, which is how the first version of the pin failed to
  bite).
- **`_TEST_OVERRIDE_EMAIL` only intercepts `getActiveUserEmail_()`.**
  Any code path that calls `Session.getActiveUser()` directly will
  bypass the test impersonation and use the real running user.
- **`TEST_` prefix is the cleanup key.** `cleanupTestData()` deletes
  every row in Timesheet / TimeOffRequests / AuditLog whose
  employee ID starts with `TEST_`. Production employee IDs must
  never start with `TEST_`. **The test ACCOUNTS live offboarded between
  runs (operator 2026-08-17):** with real agents on the app, an enrolled
  TEST_ account renders beside them on every team surface, so the operator
  offboarded them in the app — which clears ONLY the email (INV-183), and
  `setupTestEnvironment`'s old ID-keyed dedupe then never repaired them:
  every email-keyed impersonation resolved to null and 119 integration
  tests cascaded to "Employee not found." Now SYMMETRIC and self-healing:
  setup RE-ONBOARDS its rows (restores the canonical email when the cell
  disagrees) and cleanup RE-OFFBOARDS them at the end of every run, so the
  test accounts exist for the ~6 minutes of a run and are invisible
  everywhere `empRosterEmail_` guards otherwise. Offboarding them by hand
  is therefore always safe — the next run repairs itself. Pinned by the
  re-onboard/re-offboard Node pin. **The admin tier has the same shape since
  2026-09-11:** a narrowed `ADMIN_EMAILS` gets the test manager APPENDED for
  the run and stripped after (INV-21; the operator's real list is never
  touched).
- **Manager-only operations check `callerEmp.isManager`.** Any new
  manager-gated endpoint MUST start with the same check used by
  `getManagerDashboard`, `updateTimeOffStatus`, `deletePunch`,
  `managerSaveDay`, `exportAdpRange`,
  `managerSubmitTimeOff`, `getEmployeesList`,
  `getEmployeeTimesheetForManager`, `managerGetCallNotes`,
  `managerSearchCallNotes`, `managerGetTrainingQueue`,
  `managerGetReviewCandidates`, `getEnrolledCallNotesReps`,
  `exportCallNotesRange`, `setCallNoteTrainingReply`,
  `managerGetShiftStats`, `managerGetUnresolvedActionCount`,
  `managerDeleteCallNote`,
  `getAutomationHealthBadge` (the shell health dot — batch K),
  `getTimesheetDoctor`, `fixTimesheetDuplicates` (the sheet doctor — INV-159),
  `getTeamMetrics` (since 2026-08-18 reps get the stripped team AGGREGATE —
  INV-66; the per-rep rows + diagnostics remain manager-only), `getMetricsAmbient`, `getIntakeVolumeStats`
  (the batch-6 intake-volume table, 2026-08-25), `getCoveragePlan`,
  `getTeamCalendar` (the Manage Time team-punches calendar, 2026-08-31),
  `getAdminConfig`, `saveDepartmentEmails`, `saveStateTaxRates`,
  `saveUpdateSuggestions`, `removeAutomationTriggers`,
  `getCallNotesTagTaxonomy`, `getCallNotesTagTrends`, `renameCallNoteTag`,
  `mergeCallNoteTags`, `archiveCallNoteTag`,
  `saveEmailTemplates`, `getCallNotesAuditLog`,
  `getCallNoteAuditHistory`, `getPtoReconciliation`,
  `fixPtoReconciliation`, `getFeatureFlags`, `saveFeatureFlags`,
  `managerGetPendingAdjustments`, `updatePunchAdjustStatus`,
  `updatePunchAdjustStatusBulk` (the multi-select approve, operator 2026-09-03 —
  both delegate to the private `punchAdjustDecideAll_`),
  `managerSaveDayRange`, `setCallNoteManagerComment`, `reconcileCallNotes`,
  `getCallNotesEnrollment`, `provisionCallNotesSheet`, `getAutomationHealth`,
  `getStorageHealth`, `getDeployReadiness`, `getAdminSheetView`,
  `getRetentionConfig`, `saveRetentionConfig`,
  `kbConvertDriveDoc`, `kbGetUsageStats`, `kbGetReviewDue`,
  `kbMarkReviewed`, `saveKbAiSettings`,
  `getTrainingDashboard`, `saveTrainingAssignment`,
  `revokeTrainingAssignment`, `getQuizzes`, `saveQuiz`, `deleteQuiz`,
  `getQuizAnalytics`, `importQuizFromForm`,
  `getPunctualityReport` (the four Spanish-inbox endpoints +
  `resolveSpanishThread` are NOT in this list — they gate on
  `canSeeSpanishInbox_` = manager OR `SPANISH_INBOX_MEMBERS`, the INV-31
  amendment; cycle-10 F1 removed them here after the stale double-listing
  nearly invited a gate regression; likewise `installAutomationTriggers` /
  `removeAutomationTriggers` are NOT in this list — both gate on the
  MANAGER_EMAILS Script Property (INV-15/44/61), not the roster `isManager`
  column, and the cycle-17 scan found the stale listing here inviting the
  same class of confusion),
  `issueDoc`, `getDocsDashboard`, `voidDoc`, `verifyDocSignature`,
  `releaseDoc`
  (these five are ALSO team-scoped per INV-122 — the gate alone is
  not the boundary),
  `getEmpDocTemplates`, `saveEmpDocTemplate`, `deleteEmpDocTemplate`
  (org-wide PHI-free form shells — gated but NOT team-scoped, INV-135),
  `createCoaching`, `getCoachingDashboard`, `voidCoaching`,
  `setCoachingFollowUp`, `nudgeCoaching` (design handoff PR 4),
  `qaSetExemption` (design handoff PR 5 — the ONE QA endpoint on the MANAGER
  tier rather than `canSeeQa_`: a QA member reviews, a manager decides who may
  skip a period),
  `autoAssignSpanishThreads` (operator testing note 4, 2026-09-10 — the ONE
  Spanish endpoint on the MANAGER tier rather than `canSeeSpanishInbox_`: a
  member claims for themselves, a manager DISTRIBUTES; writer shape)
  (also team-scoped via `coachCanManagerSee_` per INV-134 — the EmpDocs
  fail-closed model; the gate alone is not the boundary).
  Returning a dashboard or accepting writes without this check is a
  privilege escalation. **EXCEPTION — the admin tier (INV-136):** the **50**
  Admin-exclusive endpoints (33 Manage-module Admin-tab config/system/roster
  endpoints — incl. the 2026-08-07 team-member onboarding trio
  `addEmployee`/`offboardEmployee`/`getOnboardingPanel` — + the Reference
  content-authoring set
  `kbSaveItem`/`kbDeleteItem`/`kbUploadImage`/`kbConvertDriveDoc` + the five
  authoring-adjacent KB endpoints `kbGetRevisions`/`kbPublishItem`/
  `kbRevertItem`/`kbGetSearchConfig`/`kbSaveSearchConfig` — the
  authoritative list is in INV-136. **This count has now drifted five times
  (24→28→30→35); do NOT hand-maintain it again** — derive it, or add the
  machine check described in INV-136's note. All 35 are covered by a
  non-manager gate assertion today, but that coverage is also hand-listed)
  gate on `emp.isAdmin` (not `isManager`) and return `'Admin access required.'`.
  `isAdmin` == `isManager` until Script Property `ADMIN_EMAILS` is set, so the
  endpoints in the lists above that moved to the admin tier still reject
  non-managers; see INV-136 for the full admin-gated list.
- **Trigger-handler endpoints are reachable via `google.script.run`.**
  The time-based trigger handlers — `sendDailyMissedPunchAlerts`,
  `runDailyExportCheck`, `sendCallNotesEodDigest`,
  `sendCallNotesWeeklyDigests`, `sendCallNotesUrgentDigest`,
  `sendTrainingOverdueDigest` (the T4 overdue-training/-docs nudge),
  `archiveOldCallNotes` (the non-destructive cold-archive tier),
  `purgeExpiredFormData` (the
  destructive PHI-retention purge), `reconcileCallNotes` (the
  non-destructive nightly Sheets back-fill), `sendAutomationHealthDigest`
  (the daily automation-FAILURE push), `sendDeptRequestReminderDigest`
  (the daily dept-request SLA reminder), `sendManagerDailyBrief`
  (the flag-gated consolidated morning brief, INV-151),
  `archiveOldTimesheetRows` (the Timesheet cold-archive, INV-153),
  `runNightlySelfTest` (the daily in-project self-test — smoke on prod,
  full suite on the dev instance; INV-162), `creditMonthlyPtoAccruals`
  (the monthly PTO accrual credit, INV-194) and `purgeOldQaReviews` (the QA
  review-record retention purge — QaComments + QaScorecards only, default
  OFF; INV-196), `sendCoachingRecapDigest` (the Friday agent coaching
  recap — design handoff PR 4), `purgeOldDiagnostics` (the ViewUsage /
  ClientErrors diagnostics-retention purge, both windows default OFF —
  2026-09-11) and `autoAssignSpanishThreadsScheduled` (the hourly Spanish
  Inbox auto-assign behind the `spanishAutoAssign` toggle, default OFF —
  2026-09-11) — plus the three same-slot DISPATCHERS `runHourlyJobs`,
  `runWeeklyDigests` and `runNightlyPurges` (operator 2026-09-11: Apps
  Script caps installable triggers at **20 per user per script**, the
  installer had reached 21 and threw on the LAST create after deleting every
  existing trigger; a trigger now belongs to a SLOT, and eight of the
  handlers above run inside a dispatcher instead of owning a trigger — see
  the trigger list in the Operator State Checklist) — are top-level
  (required: Apps Script
  time-based triggers won't bind to underscore-suffix functions), which
  also means a logged-in rep can fire them from the browser console.
  Each calls `assertManagerCaller_(label)` at the top — throws if
  `getActiveUserEmail_()` ∉ `getManagerEmails_()`. In a trigger context
  the active user is the installer (always a manager via
  `installAutomationTriggers`'s own check), so the gate is a no-op for
  triggers. Any new public function that walks the roster, hits Mail,
  or otherwise has side effects you wouldn't want a rep firing should
  apply the same gate. **That gate MUST be the MANAGER_EMAILS
  `assertManagerCaller_`, NEVER `emp.isAdmin` or the roster `isManager`** —
  the installer passes `installAutomationTriggers`'s own MANAGER_EMAILS
  check, so an admin/roster gate silently no-ops the nightly run under a
  narrowed `ADMIN_EMAILS` or a non-roster installer (the `reconcileCallNotes`
  F1/F2 cycle-6 regression — INV-109/INV-136). `removeAutomationTriggers` also uses this
  gate — without it, a non-manager rep could silently disable all
  automation triggers.
- **PTO balance transitions.** `updateTimeOffStatus` only changes
  balances on Pending→Approved (deduct) or Approved→non-Approved
  (restore). `managerSubmitTimeOff` with `autoApprove=true` skips
  the Pending stage and deducts immediately. Skipping the
  transition guard double-deducts on re-approval or fails to
  restore on revert.
- **Time-off submit has a duplicate-date guard + leave-type
  whitelist — and the multi-day `submitTimeOffRange` shares BOTH,
  atomically** (operator 2026-08-18: one Pending row per weekday in the
  range, weekends skipped, a conflict on any day rejects the whole batch
  naming the dates — see INV-94). `submitTimeOffRequest` and `managerSubmitTimeOff`
  reject a request when the employee already has a Pending or
  Approved row for that date (`hasActiveTimeOffOnDate_`) — without it
  two sibling rows for one day each pass the per-row transition guard
  above and double-deduct on dual approval (INV-03 is per-row only).
  Both also validate `type` against `TIME_OFF_TYPES`
  (`isValidTimeOffType_`, case/space-insensitive) before writing, so a
  garbage/typo'd type can't silently fall through `getLeaveDeduction_`'s
  annual/1.0 default. Denied/cancelled rows never deducted, so they
  don't block a re-request (INV-94 / INV-95). Two cycle-11 extensions:
  (a) the dup-date guard ALSO runs on `updateTimeOffStatus`'s →Approved
  transition (own row excluded) — flipping an old Denied row to Approved
  beside an existing Approved row was the last double-deduct creator;
  (b) both submit paths bound the date to a sanity horizon
  (`TIMEOFF_MAX_DAYS_AHEAD`=370 / `_BACK`=90, in the rep's/target's tz) —
  a typo'd year used to create an approvable, balance-deducting row no
  month view ever showed.
- **Bi-weekly anchor read.** `getCurrentBiweeklyRange_` reads the
  FIRST row whose PayCycle is `'biweekly'` AND whose `PAY_ANCHOR` cell is
  non-empty (cycle-11 doc fix — a blank-anchor biweekly row is silently
  skipped, so accidentally blanking the intended anchor makes a LATER
  rep's anchor the pay-period boundary with no warning). Multiple biweekly
  anchors in the Employees sheet are not supported — the second
  one is silently ignored.
- **Future punches are rejected by `recordPunch`.** Both
  `date > todayStr` and same-day `time > nowTime` checks must
  remain in place; the manager edit-day flow has its own future-
  date guard (`daysBack < 0`).
- **Min-interval debounce on live punches only.** `recordPunch`
  rejects a non-adjustment punch within `MIN_PUNCH_INTERVAL_SECONDS`
  (30s) of the previous one. Adjustment punches (`custom` set)
  bypass this check intentionally — back-fills need to land
  arbitrarily close to other times.
- **Self-undo is narrow on purpose.** `selfDeletePunch` only
  removes (a) punches dated today or yesterday in the rep's tz —
  yesterday exists solely for the midnight wrap (punch 23:58, undo
  00:02; cycle-8 made the server honor what the client always
  offered), (b) within `SELF_UNDO_WINDOW_SECONDS` (5 min) of REAL
  elapsed time, (c) that are NOT adjustments. Older or remote
  mistakes must go through Adjust so they leave a clear `ADJ-*` row
  in the audit log. Self-undo writes a `PunchSelfUndo` audit row
  before deletion.
- **`getTeammateStatus` is the low-privilege view.** Returns name +
  status + isSelf only. Adding email, employee ID, last-punch
  time, or tz to the response would leak data to non-managers who
  can call this. Add fields only after auditing what the Clock
  page actually needs.
- **Fire-and-forget email.** Decision emails
  (`notifyEmployeeOfDecision_`), missed-punch alerts, and
  automated exports are wrapped in try/catch — the API call
  returns success even when the email fails. Failures are logged
  to `Logger.log` / `console.warn` only. `emailFromCallNote`
  is more careful: it sends first (failure returns
  `success: false`), then stamps EmailedAt / EmailDepartments /
  Subform metadata in a separate try/catch. A stamp failure AFTER
  a successful send is logged to console but the call still returns
  `success: true` so the rep doesn't re-send a duplicate.
  **Rep-initiated sends go through `sendRepEmail_(emp, opts)` (pilot
  round 1 + follow-ons):** all SIX routes — `emailFromCallNote` ×3,
  `sendExternalEmail`, `intakeSendPPD`, `intakeSendAcct_` — merge
  `repSenderOpts_(emp)` (From display name = **the agent's name ALONE** +
  Reply-To the agent; `{}` for a missing emp so the send proceeds with
  system identity — operator correction 2026-08-27: the former
  "· Universal Medical Supply" suffix was the WRONG company name and
  fired live on a pilot send — **the company is "UniversalMed Supply"**
  (operator-supplied 2026-08-27), and the same wrong form shipped in 14
  more user-facing strings (external email bodies, the public form page)
  before the sweep; the derived BRAND tripwire now bans the wrong literal
  across every shipped web-app file. Do not re-add an org suffix here —
  internal mail doesn't need one), then send via MailApp — or via
  GmailApp with `from` when the optional `REP_SENDER_FROM` alias is
  configured and validates against `GmailApp.getAliases()` (fail-safe:
  any problem falls back to MailApp). **The wrapper also self-BCCs the
  sending AGENT (operator 2026-08-27)** so they get their own copy in
  their inbox — a true Sent-folder entry in the agent's mailbox is
  impossible (the app sends as USER_DEPLOYING; only the DEPLOYER's Sent
  folder records the send, which the GmailApp path does when the alias
  is active). The self-BCC APPENDS to any caller bcc (the intake
  `INTAKE_BCC_EMAIL` shape), never clobbers it, and dedupes
  case-insensitively. Automated digests/alerts/exports
  deliberately keep the plain system identity. A NEW rep-initiated
  send should use the wrapper, never a bare MailApp call (pinned).
  **The SPLIT-SEND partial contract (cycle-17 C17-11):** a mixed
  dept+'Other' selection fires TWO sends; when the internal copy
  succeeded and the external/Other copy then failed, the call no longer
  returns a bare failure (which invited a duplicating full re-send) — it
  stamps EmailedAt for the DELIVERED internal depts only, writes the
  CallNoteEmail audit row with an `externalCopyFailed` marker, keeps the
  DR row/token live, and returns `success: true` + a `warning` telling the
  rep to send to the external recipient separately; the client surfaces
  the warning as a warn toast in place of the success toast.
  **NO mail inside the global ScriptLock (cycle-9 M-7).** A MailApp send
  is ~0.3–0.5s and every mutating write shares ONE lock with a 15s
  `waitLock` ceiling — an `'*'` training assignment looped the WHOLE
  roster's emails inside it. Nine locked mutators now defer their
  best-effort notification via a `notifyAfter` closure the `finally`
  invokes AFTER `lock.releaseLock()` (updateTimeOffStatus,
  managerSubmitTimeOff, submitCallNote, saveTrainingAssignment,
  acknowledgeDoc, issueDoc, releaseDoc, createCoaching,
  acknowledgeCoaching). A Node tripwire inventories every function
  touching `MailApp.` and fails CI on any locked try-region that
  reaches one outside a `notifyAfter` closure; the ONE allowlisted
  exception is `emailFromCallNote` (INV-42 — send-then-stamp is
  deliberately a single locked unit). New in-lock mail = move it to a
  post-lock closure or allowlist it WITH a reason.
- **CallNoteEmail audit row is deliberately PHI-free.**
  `emailFromCallNote` writes its audit row as
  `noteId=<uuid>; depts=<label>; recipients=<count>` — NOT the email
  subject (which embeds the patient name / TRX) or the raw recipient
  addresses. The shared AuditLog tab must not carry PHI; the `noteId`
  lets an investigator open the rep's own Sheet for full detail
  (INV-32 still holds — the row keeps `noteId`). Don't "helpfully"
  re-add the subject / recipients to this audit row.
- **ExternalEmailSent audit row logs only the recipient domain.**
  `sendExternalEmail` writes `recipientDomain=<domain>; type=...;
  pdfForms=...; interactiveForms=...; noteId=...` — NOT the raw
  recipient address (a customer's personal email is PII; for a patient
  it can be PHI-adjacent). The full recipient lives on the linked note's
  `subformData.externalEmails[]`, surfaced to the sending rep on their own
  card AND to a manager in the Team Notes Per-Rep view via the shared
  `cnExtEmailPillHtml_` pill (the manager-only recipient lookup — F20).
  Logging only the domain in the shared AuditLog is therefore intentional
  PII/PHI minimization, not a forensic gap.
  Same discipline as the PHI-free `CallNoteEmail` row above. The
  `FormTokenCreated` / `FormSubmissionReceived` audit rows follow the
  same rule (`toDomain=` / `fromDomain=` — the full recipient lives on
  the FormTokens row, reachable via the token), and the submission row's
  synthetic actor identity is likewise de-identified ("External
  recipient" + domain, never the recipient's name or raw address).
- **`buildCallNoteEmailHtml_` must `esc_` every user-supplied field.**
  The email-preview modal injects the server-rendered body raw via
  `innerHTML` (`cn/script_callnotes.html` `cnRenderComposerPreviewStep_`,
  the `${p.htmlBody}` slot). That's safe ONLY because every note field
  is HTML-escaped in the builder. Adding a new field to the email
  builder without `esc_` is stored XSS in the preview (and the sent
  email). Pinned by `test_cn_buildEmailHtml_escapesUserFields`.
- **Note marker formatting runs POST-escape, and its regexes are a
  client↔server MIRROR (operator 2026-08-25).** `cnFmtHtml_` (client) and
  `cnFmtEmailHtml_` (server) turn `**x**`/`__x__`/`==x==` in ESCAPED text
  into `<strong>`/`<u>`/`<mark>`(/inline-hex `<span>` for email — the
  CN_EMAIL_PALETTE rule), so the formatter can only WRAP inert text, never
  revive markup — the input contract is escaped text, always
  `cnFmtHtml_(esc(...))` / `cnFmtEmailHtml_(esc_(...))`, never raw. The
  three marker regexes are pinned BYTE-EQUAL across the two files (a
  MIRROR_INDEX entry — the INV-72 family), markers never span lines, an
  unpaired marker is content, and the CRM copy strips them via
  `cnStripFmt_` (the paste is plain text). The server applies it on the
  FREE-TEXT Resolution branch + the three digest issue lines only — the
  server-generated OOP resolution is never marker-processed. Adding a
  marker = one `CN_FMT_RULES` entry + its server twin + the mirror pin.
  **LINE BREAKS are a SERVER-SIDE step and the ORDER is load-bearing
  (operator 2026-09-02).** The `.ce` fields are `white-space: pre-wrap`, so
  Enter stores a real `\n` that `textContent` carries to the sheet — but HTML
  collapses a bare newline, so a Resolution written as paragraphs reached the
  email (and its preview, which injects the SAME server body) as one run-on
  block while the CRM paste stayed correct. `cnNlBr_` converts them and
  `cnFmtEmailHtml_` calls it **LAST**: every marker regex is written
  `[^…\n]+` precisely so a pair cannot span lines, so converting first would
  delete the `\n` those classes exclude on and `**a\nb**` would silently start
  matching. The rule already existed inline on the OOP branch; both callers
  share the helper now. **It is deliberately NOT in the client `cnFmtHtml_`** —
  that formatter also feeds the note CARDS, which are `white-space: nowrap` +
  ellipsis one-line previews by design, and a `<br>` breaks out of that
  regardless of nowrap. The three OTHER sites that wrote the same replace
  inline (external customer/provider message body ×2, the form-submission
  table cell) were routed through `cnNlBr_` on 2026-09-04 as their own
  follow-on (NLBR-2 pins ZERO inline `\n`→`<br>` replaces in Code.js; the
  helper also folds CRLF, a small widening for those three).
- **Metrics client must `esc()` every server string before `innerHTML`.**
  `metrics/script_metrics.html` renders `repName`, CDR agent names
  (`unmatchedAgents` / `rosterWithNoCdr`), and `data.error` /
  `err.message` into the DOM via `innerHTML`. Each MUST route through
  `esc()` (defined in `script_core.html`) — same discipline as
  `buildCallNoteEmailHtml_`'s `esc_`. CDR agent names originate from the
  shared CDR Report's `Agent Alias Overrides` sheet (written by the
  `call-data-reporting` repo), so they cross a repo trust boundary — an
  unescaped name like `<img src=x onerror=…>` is stored XSS in the
  manager's session. These were unescaped until the F5 fix; keep any new
  Metrics field consistent. The Metrics client also derives "today" from the
  employee roster timezone via `empTz()` / `isoDateTz()` (`script_core.html`)
  — never `new Date()` browser-local time — as do the Coverage planner +
  Punctuality date defaults since cycle 7 (L-5) — so offshore reps (IST/PHT) and
  near-midnight users see the correct day's CDR data, matching how Clock /
  Time Off / Manager / Export derive dates (F6).
- **Intake Offerings catalog is read `A2:F` in a FIXED column order.**
  `getIntakeOfferings_()` returns the raw 2D array `[features, HCPCS,
  weightCapacity, seatType, pdfLink, imageUrl]` and `intakeFilterRecommendations_`
  indexes those positions directly (e.g. `row[1]` = HCPCS for substitution
  lookups, `row[4]/row[5]` = pdf/image of the substitution target). Reordering
  or inserting an Offerings column silently corrupts recommendations — keep the
  A–F contract, or update the engine + the fixture catalog in the tests
  together. The catalog is cached in-memory per execution (`_intakeOfferingsCache`).
  **THERE IS NO "DISABLED ROW" — the ONLY inert state is an EMPTY column B
  (HCPCS)**, because `intakeFilterRecommendations_` drops a row solely on
  `hcpcsNum === 0`. Surfaced by the cycle-16 F9 operator check: the live catalog
  held one scratch/exception row (`E1161`, capacity blank) that the operator did
  not consider a product, but the engine did — pre-F9 its unreadable capacity
  passed the weight gate for every patient, and post-F9 it is STILL eligible
  whenever **Q38 weight is blank**, since the fix guards with
  `if (patient.weight > 0)`. To retire a row: delete it, or clear its HCPCS
  cell. Do NOT just blank the capacity — that is the fail-closed path, which
  only suppresses the row for patients who HAVE a recorded weight.
  **RELATED, and unfixed: the engine's HCPCS ladder is K-code-only.**
  `hcpcsNum = parseInt(hcpcs.replace(/\D/g, ''), 10)` maps `K0821`–`K0864` to
  821–864, and `isGroup3 = hcpcsNum >= 848` encodes exactly that range — so an
  **E-code clears the Group-3 cutoff by arithmetic accident** (`E1161` → 1161).
  Nothing in the code states the assumption. Adding any non-K HCPCS to this
  catalog needs a deliberate decision (reject non-K rows? a real category
  column?) — it is an operator/clinical call, not a code one.
- **An operator-maintained data source that a DECISION ENGINE reads needs a
  shape check, and the fail direction on unreadable data must be CHOSEN (F9,
  cycle-16 — FIXED).** The PPD weight filter did
  `maxCap = parseInt(product.weightCapacityStr, 10); if (weight > maxCap) return false;`.
  `parseInt('')` is `NaN` and **every** comparison against `NaN` is false, so a
  blank / `'n/a'` / `'300-'` / `'-450'` capacity cell passed the filter for ANY
  patient weight — the engine read an unreadable capacity as **unlimited** and
  could recommend a chair that cannot carry the patient. Both branches now
  `isFinite`-guard and EXCLUDE the product.
  **The deeper defect was an inconsistency nobody had noticed: the same engine
  already had the opposite behaviour for the same class of missing data.** Forty
  lines above, a catalog with no `K0821` row returns `{standard:[], complex:[]}`
  rather than silently dropping the mobile-home constraint — fail closed. The
  weight filter failed open. When one function handles "catalog data I cannot
  read" two opposite ways, at least one of them is wrong; pick the direction
  deliberately and say so at both sites.
  **Fail-closed is silent, so it ships WITH a detector.** Excluding the row
  turns a data-entry slip into a chair that quietly stops being recommended, so
  `intakeCatalogIssues_` (pure, Node-pinned) names the offending SHEET rows in
  an "Intake Offerings catalog" card in Admin → Automation Health. It checks
  only what the engine actually reads and only what is objectively wrong —
  never taste: unreadable/inverted capacity and a seat type containing neither
  `s` nor `c` are ERRORS; a non-ASCII dash (`300–450` reads as a flat 300 cap,
  since the range branch splits on ASCII `-` only), a blank seat type and blank
  pdfLink/imageUrl are WARNINGS. A well-formed catalog produces ZERO issues, so
  the card genuinely reaches green — the cycle-15 rule for any health
  indicator. `getIntakeCatalogHealth_` carries `ok:false` on a failed read so an
  unreachable Intake store cannot render as a clean catalog (INV-129). The scan
  rides the SAME opt-in gate as the cycle-14 queue inventory (`scanCatalog`,
  default OFF) because it opens the Intake spreadsheet and
  `getAutomationHealthBadge` polls every 10 minutes PER MANAGER; it is
  deliberately NOT in `automationProblems_` (no daily nag, and the field is null
  on that path anyway). **Known limit: the detector requires a manager to OPEN
  the panel — it is not pushed.**
- **Intake PPD controls are engine-safe via CANONICAL-ENGLISH VALUES, not
  free-text (redesign Phase 2).** PPD questions render through TWO configs in
  `script_intake.html`: the legacy `INTAKE_PPD_TYPE` (`'yn'`/`'sev'`/`'num'`/
  `'text'`) AND the richer `INTAKE_PPD_CONTROL` (checked FIRST by
  `intakePpdRowHtml_`) for the new string-valued kinds — `choice` (single-select
  multi-button), `multi` (multi-select + optional exclusive option, comma-joined
  in OPTION order), `numunit` (number+unit), `reveal` (option → free-text box),
  `condition` (Phase-3 curated multi-select picker — a filter box over
  `INTAKE_CONDITION_LISTS[ctrl.list]` + option buttons + a selected-chip row + an
  "Add <typed>" escape for off-list values; value = comma-joined selected strings
  in `data-val`, round-trips exactly like `multi`), `ynreveal` (Phase-4 — a Yes/No
  whose `revealOn` reveals a sub-multi-select; value `''`/`No`/`Yes`/`Yes: SubA, SubB`
  — Q45 arthritis type), `ynnum` (operator feedback 2026-07-09 — a Yes/No whose
  Yes reveals a number-only field + unit text; value `''`/`No`/`Yes`/`Yes: 12 hours`,
  pure `intakeYnNumSerialize_`/`Parse_` Node-pinned — Q40 attendant hours, NOT
  engine-read). The same feedback round made `choice` groups render as separated
  pill buttons (the `multi` look — the joined segmented box wrapped awkwardly on
  Q2–Q6's long labels; CSS-only), added DISPLAY-ONLY `tone` per multi option
  (`warn`/`danger`/`no` selected-state colors on Q25/Q31a/Q34 — never part of the
  stored value, so the engine contract is untouched; Node-pinned tone map), and
  replaced the help glyph's native `title` with a tokened CSS tooltip
  (`data-tip` + `.intk-help::after`, hover + keyboard focus). EVERY
  kind serializes to/from a STRING via `intakePpdGetVal_`/`SetVal_`, so drafts,
  `intakeCollectPpd_`, the engine, and the email builder are unchanged. **The
  engine-critical questions Q25 (numbness), Q31a (stroke), Q34 (amputation) are
  now `multi` controls whose option VALUES are exactly the substrings
  `intakeDeriveClinicalFactors_` parses** (`Feet`/`Legs`; `Paralysis Left Arm`…
  comma-joined; `Left (Above Knee)`… with no stray `no`), Q38 (weight) is
  `numunit` (the engine parseFloat-parses it keeping the DECIMAL — cycle-8:
  the old `\D` strip turned "250.5" into 2505 lbs, failing every weight cap
  and reading as ≥285 for the Q39a mobile-home rule; units/commas still
  drop), and **Q39a (dwelling — operator rule
  2026-07-09) is an ENGINE-READ `choice`** (`House`/`Apartment`/`Mobile Home`;
  the engine substring-matches `mobile` → `livesInMobileHome`, and Mobile Home
  + weight under 285 lbs short-circuits the whole filter to **K0821 only** —
  the HOME constraint wins over the clinical gates by operator decision;
  ≥285 lbs / blank weight / no answer → standard logic; a catalog with no
  K0821 row → empty result). Never renumber around Q39a — the `39a` key rides
  stored answers + the engine, like 31a/33a. UNLIKE 31a/33a, Q39a COUNTS in
  the PPD progress ring/stepper (cycle-8: the bare-digit `mainQNums` filter
  excluded it, so a rep could see "45/45 complete" with the engine-critical
  dwelling answer blank — it's a full-weight primary question that's lettered
  only to avoid renumbering; the ring denominator is now 46). All of this is MORE reliable than the old free-text (no
  typos) and pinned by the Phase-0 engine-contract tests + the Phase-2 config
  drift-guard (`test/client/run.js` feeds the live config values back through the
  engine). **CANONICAL-ENGLISH VALUE RULE (load-bearing):** the stored value is
  always the option's English `v`; only the displayed `l` label is/ can be
  localized — the engine matches ENGLISH substrings, so a Spanish PPD emits the
  same engine-safe values (this also FIXED a latent bug where Spanish free-text
  never matched). **Phase 3 (shipped):** **Q29** (peripheral vascular disease),
  **Q41** (qualifying diagnoses), **Q42** (heart/lung), and **Q43** (neuro Dx) are
  now `condition` curated pickers backed by `INTAKE_CONDITION_LISTS`
  (`vascular`/`qualifying`/`cardiopulmonary`/`neuro`). Q29/Q41/Q42 are NOT read by
  the engine (display-only); **Q43 is engine-critical but read ONLY as
  truthy-vs-the-exclude-list** (`['no','n/a','none','','no.']`), so ANY non-empty
  curated (or custom-typed) value = valid neuro Dx and an empty selection = no Dx —
  pinned by the Phase-3 drift guard (feeds every `neuro` list value through the
  engine + asserts none collide with the exclude list). The condition lists are a
  **pure content constant SEEDED FOR CLINICAL REVIEW** — editable with zero engine
  risk; keep entries **comma-free** (the value is comma-joined). STILL free-text:
  **Q13** (falls — `isPositive` reads `'yes'`, result unused by the recommendation
  logic). NEVER change a Q25/Q31a/Q34 option value without re-running the
  drift-guard; NEVER reintroduce a bare `Yes`/`No` for those (it would feed the
  engine no location/side); NEVER add a Q43 `condition` option that lowercases into
  the exclude list. The server email builder already expects the comma-joined multi
  values (`INTAKE_PPD_YESNO_QS` coloring + the Q25/Q31a/Q34 chip split) — a
  server-only list, no client mirror; Q29/Q41/Q42/Q43 render as plain escaped
  comma-joined text (the `else` branch), so no server edit is needed. **Phase 4
  (shipped) — display-only polish, engine untouched, no server edit:** a hover-help
  glyph on select labels (`INTAKE_PPD_HELP`, e.g. Q32 spasticity), conditional-hide
  of secondary rows (`INTAKE_PPD_REVEAL` → `intakePpdApplyReveals_`, e.g. Q33a shows
  only when Q33=Yes — hidden rows are cleared), the Q45 `ynreveal` control (arthritis
  type sub-multi), and a Q37 numunit `parse:'height'` that normalizes a feet-inches
  entry (`5'1"` → `61`) to total inches on blur (`intakeParseHeightInches_`, pure).
  None of Q32/Q33a/Q37/Q45 are engine-read, so no drift-guard is needed; the pure
  serialize/parse helpers are Node-pinned. Optional Q31a body diagram DEFERRED.
- **The intake payload's LABELS are always the English bank — the email is
  English whatever language the form was completed in (operator 2026-09-04,
  FIRED LIVE: a testing agent sent a PPD to the Power dept with Spanish
  labels).** The server renders `payload.rows` verbatim (that is how the
  notes section and the amend banner got in with zero server edits), so the
  ROWS decide the email's language, and both collectors
  (`intakeCollectPpd_` / `intakeCollectAcct_`) used to read the bank by the
  DISPLAY language. They now read `INTAKE_PPD_Q.EN` / `intakeAcctBank_(form).EN`
  (+ `INTAKE_PPD_NOTES.EN`), pairing each English label with the answer
  collected by qNum / index from the rendered form — safe ONLY because the EN
  and ES banks are positionally equivalent, which INTK-EN pins (same qNums at
  the same positions; same PMD/PAP lengths). Answer VALUES were never the
  problem (the CANONICAL-ENGLISH VALUE RULE); free text stays as typed.
  `language` still records the COMPLETION language — the Sent tab re-renders
  against it and the amend replay is language-matched — and the in-app
  confirm list (`intakeRecwarnLabel_`) stays localized: only what LEAVES the
  app is forced English. Pinned by INTK-EN + INTK-EN-DOM (both collectors
  driven under `lang = 'ES'` in jsdom).
- **Intake email builders must `esc_` every patient field; the justification
  is the ONE raw exception.** `intakeBuildPpdBodyHtml_` / `intakeBuildAcctBodyHtml_`
  inject the body into the preview modal via `innerHTML` and into the sent
  email, so every answer/label is `esc_`'d (INV-89; pinned by
  `test_intake_buildPpdBody_escapesAnswers`). The recommendation
  `justification` is server-generated (a fixed vocabulary + `Left`/`Right`
  hemiplegia side) and intentionally carries inline markup (`<strong>`,
  underline span), so it is injected raw — never put a user-supplied value into
  a justification string. HCPCS / pdfLink / imageUrl (from the Robin-owned
  Offerings sheet) are still `esc_`'d in attributes defensively.
- **Intake PMD/PAP layout is duplicated client↔server — keep them equal.**
  The server `INTAKE_PMD_LAYOUT` / `INTAKE_PAP_LAYOUT` (email rendering,
  authoritative) and the client `INTAKE_PMD_CLIENT` / `INTAKE_PAP_CLIENT`
  (input rendering) carry the same HEADER/CHECKBOX/SECONDARY row sets (the
  client headers are 0-based; the server's are 1-based — they differ by +1).
  A Node tripwire (`intake — client render layout mirrors the server`) fails CI
  if they drift. Adding/removing a PMD/PAP question means updating BOTH the
  question banks (client `INTAKE_*_Q`) AND both layouts. Same discipline as
  `LEAVE_DEDUCTION_CLIENT` ↔ `getLeaveDeduction_`.
- **Intake account Yes/No toggles read/write through `.intk-yn` groups
  (deferred #10).** PMD/PAP account answers are gathered by
  `intakeAcctGetVal_` and re-applied by `intakeApplyAcctAnswers_`, both of
  which handle ANY `.intk-yn` group: a checkbox-style toggle stores
  `TRUE`/`FALSE`, while a select-style toggle marked `data-ynsel` (the
  `['', 'Yes', 'No']` shape, e.g. PAP's CPAP-history conditional) stores
  `Yes`/`No`. The server `INTAKE_PMD_LAYOUT` / `INTAKE_PAP_LAYOUT` select
  keys are UNCHANGED — only the client input control changed shape, so the
  layout-mirror tripwire still passes. New account Yes/No fields should
  reuse the `.intk-yn` (+ `data-ynsel` where a Yes/No string is needed)
  pattern rather than a raw checkbox/select.
- **Call Notes Sheet enrollment — one-click auto-provision (or manual).**
  A rep has no Call Notes panel until column L (`CallNotesSheetId`) of the
  Employees roster has their per-rep spreadsheet ID. `getCallNotesSheet_(emp)`
  throws "Your call-notes Sheet is not configured" if missing; the
  client renders the enrollment-missing splash. A manager can now
  one-click enroll a rep from **Call Notes → Admin → Call Notes
  Enrollment**: `provisionCallNotesSheet(repEmpId)` (manager-gated,
  locked, INV-110) creates a fresh Spreadsheet owned by the deploying
  account, provisions the `Notes` tab with `CN_HEADERS`, writes the new
  ID into column L, invalidates the roster cache, and audits
  `CallNotesProvision`. It is **idempotent** — a rep who already has a
  sheetId is returned unchanged; it NEVER clobbers an existing Sheet
  (that would orphan their note history). The manual path (Robin copies
  the template Sheet and pastes the ID) still works for anyone who
  prefers it; auto-provision just removes the per-rep busywork.
  **The "is this rep enrolled?" predicate is `cnEnrolledSheetId_(row)` — the ONE
  reader of column L (cycle-9 L-11 → cycle-12 F14, now enforced).** It returns
  the trimmed id or `''`, so a WHITESPACE-ONLY cell reads as NOT enrolled
  everywhere. History worth keeping: the test was hand-written 21 times and 11
  copies tested RAW truthiness (`if (!sheetId) continue;`) while 10 trimmed, so
  such a cell made the two groups DISAGREE — the trimmed group correctly showed
  the rep the enrollment splash and offered the Admin provision button, while
  every untrimmed cross-rep walk called `openById(' ')`, threw into its per-rep
  try/catch, and **silently omitted the rep from the aggregate** (tag taxonomy,
  tag trends, the tag-transform walk, cross-rep search, shift stats, the
  unresolved-action badge, the CN export, team metrics, the EOD digest) — or, in
  Storage Health, reported a false "unreachable per-rep Sheet" for a rep who
  simply is not enrolled. A manager reading any of those numbers had no way to
  know a rep was missing. A Node tripwire now bans EVERY raw
  `EMP.CALL_NOTES_SHEET_ID` read outside the predicate (the only exemptions are
  the predicate body and `provisionCallNotesSheet`'s `setValue` WRITE) — the
  INV-142 / INV-154 boundary pattern. The employee-object builders
  (`getEmployeeInfo_`/`lookupEmployeeById_`/`submitFormByToken`) route through it
  as `cnEnrolledSheetId_(row) || null`, preserving their `null`-when-absent
  contract exactly.
- **A failed note-count read must be SURFACED, never rendered as 0 (cycle-12
  F5).** `countCallNotesInRange_` swallowed every error as `return 0`, which is
  indistinguishable from "the rep logged zero notes" — so `cnNoteCoverage_`
  produced 0% and the Clock shift-strip rendered "0% logged" in CRIT tone plus
  a **"File N missing"** CTA where N was every answered call, telling a rep to
  redo work they had already filed. Use the outcome-carrying
  **`cnCountNotesResult_(emp, from, to)` → `{count, unavailable, unenrolled}`**
  for anything user-facing. **`countCallNotesInRange_` NO LONGER EXISTS (A4,
  cycle 13).** F5 kept it as "a thin numeric wrapper for the callers that only
  want the number", but there were none — the sole remaining references were its
  own two tests, which ASSERTED it returns 0 on an unreadable Sheet. That left
  the silently-degrading variant alive under the most obvious name, pinned by
  tests enshrining the exact behaviour F5 existed to remove, waiting for the
  next author to reach for it. There is now ONE count path by construction; take
  `.count` off the result and decide what to do with `.unavailable`, which is
  the whole point. `unenrolled` (no
  Sheet configured, INV-35) is deliberately DISTINCT from `unavailable` (the
  Sheet exists but could not be read) — only the latter is an error. Every
  coverage surface nulls `noteCoverage` and sets `noteCountUnavailable` /
  `noteCountPartial` on an unavailable read, all THREE result caches skip their
  `put` on a degraded round (the L-3 / INV-129 rule), and the clients render
  "notes unavailable" / an em dash instead of a confident zero. This is the
  cycle-10 "error reads as empty" class (D1/D2a) in the one server helper it
  had never been applied to.
  **TWO SURFACES ESCAPED THAT SWEEP UNTIL CYCLE 16 — and the reason is worth
  knowing, because it is how the next one will escape too.** The sentence above
  ("every coverage surface") was written against the set of functions that CALL
  `cnCountNotesResult_`, and both misses were outside it:
  (a) **`managerGetShiftStats` counts INLINE** — it needs flags, emails and the
  completion median off the same read, so a count-only helper cannot serve it,
  and it therefore appeared in no search for the helper. Its per-rep catch
  swallowed the failure and pushed the rep with `totalNotes:0`, every
  `flagCount` 0 and `emailsSent:0`, then computed `noteCoverage` from that zero
  against the rep's REAL CDR answered count — so the manager's END-OF-SHIFT
  PERFORMANCE table showed a rep whose Sheet could not be opened identically to
  one who logged nothing all shift, CRIT-toned 0% badge included. It now carries
  `notesUnavailable` on the stats object, nulls the coverage, and the client
  renders an em dash across all six note-derived columns (Notes / Action /
  Training / Review / Emails / Median — they all come from that one read) with
  the sort comparator returning −1 so they group with the other unknowns.
  (b) **`getTeamMetrics` nulled the PER-REP coverage but computed the TEAM total
  unconditionally**, so the rail row said "partial — at least one rep Sheet was
  unreadable" while the hint four lines below it rendered a confident
  "Team-wide coverage below 80%" from the same contaminated numerator.
  **The generalizable rule: an aggregate is a coverage surface even when it
  never touches the helper.** Ask what a function DERIVES from a best-effort
  read, not which helper it calls.
- **A value written to a `data-*` attribute comes back DECODED — never re-render it
  raw (cycle-18 F1).** `setAttribute`/an HTML attribute stores TEXT, so the parser
  entity-decodes it on the way in and `getAttribute` hands back the decoded string.
  Write `data-x="&lt;img&gt;"` and you read back a literal `<img>`. That is fine for a
  comparison, a URL (`encodeURIComponent` re-encodes) or a `textContent` sink, and it is
  **stored XSS the moment the value re-enters `innerHTML`** — which is exactly what the
  roster and decision KB blocks did on every mode switch, Expand and decision answer
  (INV-193). Three rules: (a) a stored SOURCE gets re-escaped on read through one named
  boundary (`kbFenceSrc_`), never at each call site; (b) if you re-escape the source you
  must also re-escape every SIBLING channel the render MATCHES against (`data-opt`,
  `data-path`, `data-name`) or the comparison silently stops matching — the failure looks
  like a dead button, not like an escaping bug; (c) the INVERSE case exists too — a CSS
  attribute selector matches the DECODED value, so a selector built from escaped parsed
  data must be decoded first (`kbFenceDecode_`). **Attribute escapers are also easy to
  under-build:** `kbRosterAttr_` escapes quotes but NOT `&`, which is correct here only
  because every consumer compensates — an attribute that is compared against parsed data
  needs the `&` too. The glossary block is the SAFE shape to copy: it uses `setAttribute`
  + `textContent` throughout, so decoding is harmless by construction. A pin for this class
  cannot live in the pure harness — it has no HTML parser, so it cannot decode; use the DOM
  harness.
- **`:root[data-compact]` is the POP-OUT, not a viewport breakpoint (A2,
  cycle-13; FOUR MORE instances found and fixed in cycle-16 F3).**
  `data-compact="1"` is set from `?compact=1` by the pop-out button (INV-38); it
  says nothing about how wide the window is. Cycle 13 found three components
  that declared a fixed multi-column grid plus a `:root[data-compact]` override
  and NO media query, so they never stacked on a phone: `.m-layout`
  (`1.4fr 1fr` with a 42px hero numeral — and `metrics/script_metrics.html`
  carried **zero** media queries, on a REP-facing tab), plus the shared
  `.telemetry` strip and `.coach-kpis`, both `repeat(4, 1fr)`. The shell's own
  breakpoints (`styles.html` 1023px / 540px) adapt `.metric-grid` and
  `.emp-grid` but never reached these. Fixed with real media queries —
  `.m-layout` stacks at ≤720px (before either column gets narrower than the
  hero numeral), `.telemetry` + `.coach-kpis` go 2×2 at ≤540px.
  **Cycle 16 found FOUR more, all MEASURED at 390px rather than reasoned about:**
  `.kb-wrap` 280px tree / **70px reader** (a fixed `280px` track does not
  yield, so the `1fr` column absorbs the entire shortfall — and
  `kb/script_kb.html` had **zero** media queries, the same shape as metrics in
  cycle 13, on the rep-facing mid-call lookup tool); `.cnv-trio` 114 / 104 /
  94px on the app's most-used form; `.intk-row` 157 / 157px on a 46-question
  clinical intake; `.cnv-row` holding a 130px fixed label column. All now carry
  breakpoints (kb ≤720px; trio 2-up ≤720px then stacked ≤480px; intk-row
  ≤560px — the existing 760px query stacks the PPD *layout*, which still leaves
  ~350px per half, so 2-up only fails further down).
  **Pop-out geometry is unchanged because `:root[data-compact] .cnv-row` is
  specificity `(0,3,0)`** — `:root` pseudo-class + `[data-compact]` attribute +
  class — not `(0,2,0)` as this entry claimed until cycle 16. It out-specifies a
  `.cnv-row.full` media rule at `(0,2,0)`; VERIFIED BY MEASUREMENT (compact at
  480px and 700px both still render `84px 1fr`), which is the only way to be
  sure of a specificity claim you are relying on.
  **A grid that stacks in compact almost always needs a viewport breakpoint too
  — the two triggers are independent.**
  **Pinned by the A2 tripwire, which since cycle-16 F3 SCANS THE RULE rather
  than asserting three known fixes** (it previously hard-checked `.m-layout` /
  `.telemetry` / `.coach-kpis`, which is exactly why four more accumulated with
  CI green — the INV-179 lesson, and the same promotion A1/A11 got in cycle-13
  batch 5). It derives its file set from `A11Y_SCAN_PARTIALS` + `styles.html`
  and brace-matches every `@media` block.
  **Cycle-17 C17-1 (High, test integrity): the scan's regex was BLIND to
  `styles.html` in effect** — it matched only the bare `:root[data-compact]`
  the partials write, while every one of styles.html's ~67 compact overrides
  writes `:root[data-compact="1"]`, so the shared stylesheet contributed ZERO
  selectors and the file-set claim above was untrue (the `checked >= 8` floor
  was satisfied by the partials alone; INV-179's "a derived scan is only as
  wide as what it derives from", in regex form). The regex now matches both
  attribute forms, and the 9 obligations styles.html then surfaced were
  resolved per-selector: `.actions` (the LIVE punch grid — four fixed tracks
  at every real viewport) and `.field-row` (modal field pairs) gained REAL
  540px breakpoints; DEAD compact overrides for `.actions-grid`, `.ledger`
  (×3), `.ts-summary`, `.leave-balance-row` were REMOVED (INV-184 — zero
  markup emits them); `.preset-grid`'s compact `grid-template-columns` was
  dropped (it re-stated the base's identical tracks — a gap-only change that
  read as a re-columning). Carve-outs, all deliberate:
  `A2_INVERSE_OK` now holds THREE entries — `.rail-flags` (widens 2-up → 4-up
  in the pop-out — the INVERSE of stacking, so no breakpoint is owed),
  `.ts-recent-row` (base `auto 1fr auto` — content-sized tracks, one flexible
  middle; the compact override only drops the leading icon column), and
  `.hero` (the only live consumer, `.dash-hero`, sets `display:block`, so the
  base 2-col grid never applies — verified by the 390px clock scenario) —
  and `A2_INTRINSIC` (a base using `auto-fill`/`auto-fit`/`min()`/`clamp()`
  already reflows — `.m-kpi-grid` is `repeat(auto-fill, minmax(140px,1fr))` and
  its compact override exists only to PIN 3 columns). The last is a property
  of the RULE, so it lives in the rule, not the allowlist.
  **A side effect worth remembering: stacking a row can EXPOSE a latent
  overflow elsewhere in it.** Stacking `.intk-row` moved the help glyph to the
  end of a full-width question, and its `left:-10px` / 58vw tooltip then ran
  past the row — measured as document `scrollWidth` 468 against a 390 viewport,
  i.e. the whole page scrolled sideways. Right-anchoring the bubble inside the
  same breakpoint restores 390/390. Re-measure `scrollWidth` vs `clientWidth`
  after any stacking change; a squeezed layout and an overflowing one look
  identical in a screenshot.
- **A "same day" compare between a CONFIG.TIMEZONE stamp and a MANAGER-tz
  "today" must CONVERT the stamp first (post-deploy `runAllTests`, 2026-09-02).**
  `nudgeCoaching` wrote `NudgedAt` via `fmtDate_`/`fmtTime_` (Asia/Kolkata) and
  guarded "once per day" with `nudgedAt.substring(0, 10) === todayIso` where
  `todayIso` is the Chicago day. Kolkata is 10.5 hours ahead, so from 13:30 CDT
  every afternoon the stamp reads TOMORROW's date and a second nudge is
  allowed; the next Chicago morning the stale stamp matches and a fresh nudge
  is refused. `coachStampDayMgr_(ts)` parses the stamp in `CONFIG.TIMEZONE` and
  formats it in `CONFIG.MANAGER_TIMEZONE`; both the guard and the dashboard's
  `nudgedToday` flag use it. The suite caught it only because the run happened
  after 13:30 CDT (the same frame class as the editor-test hazards). Any new
  "did this happen today" check over a `fmtDate_` stamp owes the same
  conversion. Pinned in PR4-1.
- **The TEST roster rows keep their FIXTURE timezones, and setup restores them
  (operator 2026-09-02).** The ALL-CST runbook says "every agent row →
  America/Chicago", and the operator applied it to `TEST_IN_001` /
  `TEST_PH_001` too — but the suite hardcodes `Asia/Kolkata` / `Asia/Manila`
  for them (the IST/PHT fixtures ARE the multi-timezone coverage, kept by
  design). Four tests failed on the frame mismatch (a fixture ClockOut written
  on the Kolkata date while `recordPunch` read today in Chicago; the note-hour
  bucket expected in Kolkata). `setupTestEnvironment` now restores column H on
  re-onboard exactly as it restores the email, so a flipped test row heals on
  the next run. Do not flip the TEST rows by hand; if you do, nothing breaks
  beyond one red run.
- **A best-effort overlay whose ABSENCE is reassuring must announce itself
  (F4, cycle-16 — FIXED).** `getCoveragePlan`'s PTO read was wrapped in
  `catch (e) { /* best-effort — coverage still renders */ }`. Best-effort was
  the right call (a coverage grid with no PTO overlay still beats no grid), but
  SILENT was not: with `ptoMap` empty **every rep counts as working**, so the
  hourly strip renders green/adequate on a day half the team is off, and the
  "All business hours meet the N-rep minimum" all-clear becomes *guaranteed
  rather than earned*. A planner whose entire purpose is understaffing
  detection had, as its failure mode, the single most reassuring answer it can
  give — with no signal anywhere in the response for the client to render.
  It now returns `ptoUnavailable` (additive; an older client ignores it), the
  manager view shows a `role="alert"` banner stating PTO is not reflected and
  the bands are an UPPER BOUND, and the green all-clear is downgraded to a
  neutral "No understaffed hours found — but time-off data is missing, so this
  is not an all-clear." **The test to apply to any `catch` around an overlay:
  if the empty overlay makes the output MORE reassuring rather than less, the
  degradation must be visible.** Same family as the note-count entry above and
  INV-129; the difference is that here the swallowed read feeds a *judgement*
  (a staffing band, an all-clear) rather than a number, so suppressing the
  judgement matters as much as flagging the data.
- **An UNKNOWN duration is not the same as an elapsed one — never substitute
  "now − start" for a missing END timestamp (F8, cycle-16 — FIXED).**
  `getDeptRequests` computed a request's elapsed minutes as
  `(resolvedMs && createdMs) ? resolved − created : (createdMs ? now − created : null)`.
  Read the fallthrough carefully: it fires not only for an OPEN request (where
  "how long has this been waiting" is exactly right) but also for a request
  marked **resolved** whose `ResolvedAt` cell is blank or unparseable — where the
  honest answer is "unknown". That row then reported its **full age** as its
  resolution time, and because the age grows every day, it inflated the
  department's `avgMinutes` and `medianMinutes` a little more on each read,
  forever. Those are the numbers the per-dept SLA targets (`DR_SLA_TARGETS`) are
  chosen against, so the corruption feeds back into the thresholds. It is
  reachable two ways: a manual sheet edit, or a failure between
  `markDeptRequestResolved_`'s two `setValue` calls. The fix is one line —
  branch on the status FIRST, and yield `null` when a resolved row has no usable
  end stamp. **The general rule: when a duration needs two timestamps and one is
  missing, the result is `null`. A plausible substitute is worse than a gap,
  because a gap is visibly a gap and a substitute silently becomes data** —
  the same instinct as the note-count and PTO-overlay entries above, applied to
  arithmetic rather than to a read outcome.
- **`timeToMins_` returns `null`, never `NaN` — and an ARITHMETIC caller must
  guard EXPLICITLY (A3, cycle-13 — FIXED).** It used to return `NaN` on an
  unparseable Timesheet TIME cell, which is the worst possible sentinel here
  because every `NaN` comparison is FALSE and `NaN` arithmetic is contagious:
  `getPunctualityReport` did `if (lateMin > grace) late++; else onTime++;`, so a
  bad row fell through to the else and was scored **ON TIME** — and its
  earliest-punch pick (`mins < r.days[d].in`) was also false against `NaN`, so
  ONE bad row pinned the whole day even when a valid ClockIn existed on it;
  `calcHours_` returned `NaN` and `totalHours += NaN` turned an entire
  timesheet's total into `NaN`. Now `null`, so the callers' explicit
  "not computed" branches fire: punctuality `continue`s, the timesheet counts
  the day INCOMPLETE (**not** 0 hours — that would understate payroll
  silently), the dashboard sparkline and the calendar omit it. `calcHours_`
  propagates `null` for a corrupt CLOCK pair but a corrupt LUNCH pair only
  drops the deduction (the "no lunch recorded" shape) rather than voiding an
  otherwise-valid day. **THE TRAP:** `getCoveragePlan` does
  `dayDelta * 1440 + timeToMins_(...)`, and `x + null` **coerces to `x`** —
  placing the rep's shift at midnight, strictly WORSE than the `NaN` it
  replaced (which merely dropped them from the buckets). Any new caller that
  does arithmetic on the result needs an explicit `=== null` check, not a
  truthiness test (`0` is a valid midnight). Pinned by the A3 behavioural +
  caller-shape tripwires and the `timeToMins_nullOnUnparseable` smoke test.
- **`color-mix` for a SEMANTIC colour must interpolate `in oklab`, never
  `in oklch` (V-1, cycle-12 visual audit — FIXED).** The four `-deep` aliases
  declare correct fallback hexes (`--warning-deep: #8a4500` amber,
  `--danger-deep: #8a1f1f`, `--success-deep: #0b6e40`) and then an `@supports`
  block replaces them with a `color-mix`. With `in oklch` the hue interpolates
  **on the polar arc**, and light-mode `--ink` (`#0f1623`) sits at hue ≈264, so
  amber (h 70) travelled 70→0→264 — *through red*. Measured in Chromium before
  the fix: `--warning-deep` resolved to **hue 354.8 (RED)**, `--danger-deep` to
  330 (magenta), `--success-deep` to 204 (cyan); `--info-deep` was fine only
  because blue already matches `--ink`'s hue. Dark mode mixes 25% against
  `--paper-card` and was correct, so **the same token was a different hue family
  per theme** across 254 consumers — concretely `.actions .sec.act-lunchout`
  painted Lunch Out destructive-red in the default theme. All four now use
  **`in oklab`** (rectangular, no hue arc): worst remaining drift 10°.
  `--selection-bg` / `--border-strong` / `--ring-focus` deliberately stay on
  `in oklch` (hue-safe — they mix with `transparent` or a low-chroma neutral
  pair). Two things made this invisible: reading the token file suggests the
  fallbacks are what ship, and the `--muted-2` tripwire measures LUMINANCE,
  which a pure hue rotation leaves untouched. Now pinned by the V-1 tripwire
  (source-level `in oklab` + a computed ≤20° hue-drift bound, both modes) —
  don't add a `-deep` alias, or "correct" a fallback hex, without re-running it.
- **A `var(--x, fallback)` on a token the tokens partial DEFINES is banned (design
  handoff C4, PR 1 — 2026-09-02).** A redundant fallback is a second source of truth
  for the value: `var(--success-deep, var(--accent))` meant "green" in one file and
  the deep alias everywhere else, and `var(--warning-deep, #b86e00)` froze a hex the
  palette round had already moved. Thirty-odd were swept (train ×3, tc, styles, tour,
  qa ×17, kb ×5, cn ×9). The ONLY exempt names are the inline animation parameters
  (`--d`, `--len`, `--circ`, `--target`) — set per element via `style="--d:…"`, defined
  in no tokens file, and their defaults ARE the value (the INV-128 note). Pinned by
  PR1-1, a DERIVED comment-stripped scan over every shared partial (INV-179/188):
  add a fallback to a defined token and CI names the file. NOTE the index's own
  examples were wrong (`--accent-deep` on `.tr-complete-btn`, a `--danger-soft`
  literal) — neither existed; the sweep list came from the tree, not the doc.
  **The CANVAS twin (TW-B, 2026-09-11):** a `<canvas>` cannot read `var(--x)`,
  so the QA waveform and the EmpDocs signature pad read the token through
  `getComputedStyle(...).getPropertyValue('--t') || '#hex'` — and the hex is
  the same second source of truth. Writing the scan found all THREE stale: the
  waveform fell back to `#0b6e40` for `--accent` (that is `--accent-2`'s
  value), the pad to `#101418` for `--ink`, the muted to `#9aa3b2` — values
  no token declares. The rule: a canvas fallback must EQUAL its token's
  Console-light value (`#0f8a52` / `#0f1623` / `#a5acb8` now), so a palette
  change fails CI here until the fallback moves. TW-B also bans any hex
  literal that EQUALS a declared token value anywhere in a scanned partial
  outside two named categories (those canvas fallbacks and INV-166 freezes
  listed with their reason — `.instance-banner` `#8a4500`, exactly once,
  inside its selector). `form_public.html` is excluded (the INV-128
  standalone-palette exemption). **Its third half — a two-sided per-file
  RATCHET counting every OTHER chromatic literal (hex / rgb / hsl) against a
  hand-reasoned baseline — was RETIRED in Batch P (2026-09-11):** cycle 19's
  reflection named it should-have-been-deferred, a maintenance obligation on
  every colour edit in exchange for guarding literals that fire on no real
  page. The one token candidate it had recorded — the clock ribbon's rgba
  fallback twins of `--accent`/`--warn` under their `color-mix` declarations,
  CONSOLE-ONLY, so a Sage/Plum browser without `color-mix` drew the wrong hue —
  rides `--accent-glow` and its new warn-family sibling `--warn-glow` now
  (declared in the two BASE blocks only: a palette never redefines a semantic
  colour), with the `color-mix` line still setting the real strength, so the
  render is byte-identical (re-shot and pixel-compared against the pre-edit
  baseline). Pinned by the P2 ribbon-token pin; the token-equality ban still
  catches a literal that duplicates a token, which is the case the ratchet was
  actually for. See INV-200.
- **Text on a FIXED-palette surface must use a fixed colour, not a theme token
  (V-2, cycle-12 visual audit — FIXED).** The clock card's sky gradient does not
  flip with the theme, but `styles.html`'s
  `.hero .clk-time .ampm { color: var(--muted) }` (specificity 0,3,0) beat
  `tc/script_clock.html`'s (0,2,0) `.clk-sky .clk-time { color: #fff }`, so the
  AM/PM span alone tracked the theme while its background didn't — measured
  **1.20–2.00:1 across the whole card in dark mode**, i.e. illegible AM/PM on
  the live clock of a time-tracking app. Fixed by one rule,
  `.clk-sky .clk-time .ampm { color: rgba(255,255,255,.88) }` (theme-identical
  now: 3.89 / 2.45 / 1.52 against the gradient's blue end / midpoint / amber
  end). NOTE the amber-end ratio is a CARD-level question — `.clk-time` itself
  is white-on-amber at the same ~1.5:1 — so it needs an operator design call
  (scrim, or a darker gradient end), not a per-span patch.
- **The Coverage planner counted a rep on lunch as PRESENT until 2026-09-03 —
  a schedule consumer that reads `breaks` must SUBTRACT them, and a DRAFT
  preview must go through the ONE resolver.** `getCoveragePlan` pushed each
  shift as one `[absStart, absStart+lengthMin)` interval; `r.sched.breaks`
  rode along unread, so an hour where the whole desk was at lunch drew green.
  `coverageSplitAtBreaks_` (pure) now splits the interval at shift-RELATIVE
  offsets (`b.startMin − sched.startMin` — an offset is tz-free, so no second
  conversion), and the 15-minute strip on the Admin card is the granularity at
  which a quarter-hour break is visible at all (an hourly band still shows a
  rep present for an hour they left for 15 minutes — stated in the code).
  **The strip previews UNSAVED editor state through the SAME resolver** —
  `withBreakSchedulesProp_(prop, fn)` swaps the per-execution memo the tz
  layer (`getShiftSchedule_`) and the per-agent layer (`empShiftSchedule_`)
  both read, then restores it in `finally`; a second "merge the draft" code
  path would be the parallel-source class INV-149 exists to prevent, and the
  draft is run through `breakSchedSanitize_` first, so what the admin sees is
  exactly what a Save would store. **The demand layer's PST→CST shift is a
  HAND-MIRRORED constant** (`CDR_INBOUND_PST_TO_CST_HOURS` ↔ the CDR repo's
  `INBOUND_HEATMAP_CST_SHIFT_HOURS`; both zones observe DST, so a fixed 2h
  holds) and its columns are found BY HEADER NAME (the Phase-1 rule) with a
  missing column NAMED — a pre-extension export renders no bars, never a
  strip of zeros. Pinned by BCV-1..4 (11 mutations bite-checked).
- **A `max-height` on a GRID CONTAINER does not constrain its row (V-9,
  cycle-12 visual audit).** The Reference two-column shell (`.kb-wrap`) needs
  two things at once: a SHORT landing must hug its content (a fixed height left
  ~535px of empty card, reading as a half-failed load) while a LONG article must
  scroll INSIDE its panel rather than growing the page. Moving the fixed height
  to `max-height` on the WRAP looks like the fix and is not: measured in
  Chromium, the grid ROW grew to 13.7k px, the panel overflowed the capped
  container, and the reader's internal scroll was GONE. The cap belongs on the
  grid ITEMS (`.kb-wrap > * { min-height: 0; max-height: … }`) plus
  `align-items: start` so the shorter column doesn't stretch. Verified both
  directions after the fix (landing panel 260px hugging 241px of content; a
  400-paragraph article capped at the viewport and scrolling internally). Any
  new capped-but-content-sized grid here must be MEASURED, not reasoned.
- **The app has ONE primary-button vocabulary: `--accent` green (V-8,
  cycle-12).** `.btn-modal-ok` — the SHARED modal primary behind ~25 call sites
  — was `--ink` on `--ink`, the only inverted button in the app: a near-black
  full-width bar in light mode (on "Generate ADP Export", the money-facing
  action, where near-black reads as disabled/error) and near-WHITE in dark,
  where it visually out-competed the real green primary above it. It now matches
  `.actions .prime` / `.cn-action-prime` exactly. `.ui-dialog-ok.is-danger`
  still overrides at (0,2,0), so destructive confirms stay red. A new primary
  action belongs on this class, not a bespoke one — and never inverted.
- **A state that can be ZERO must not be painted in a SURFACE colour (V-10,
  cycle-12).** The live-status sparkline drew a zero-hour day in `--paper-2` at
  1px — 1.10:1 against the card in light mode and ≈ the card in dark — so a rep
  with 3 days off rendered as a 4-bar sparkline instead of 7 bars with 3 empty,
  making "didn't work" indistinguishable from "no data for that day". Now
  `--muted-3` at 3px (2.28:1 light / 2.20:1 dark). `--muted-3` is the
  DECORATION-ONLY tone per the token contract, which is exactly what a
  visible-but-quiet baseline is — don't reach for a text tone here, and don't
  reach for a surface tone either.
- **Two chip rows with the same shape must not do different things (V-12,
  cycle-12).** The CN Log view rendered a FILTER row (toggle pills with real
  `aria-pressed` state, filtering today's stack in place) and, ~400px below, a
  JUMP row (navigating to History for the week) — same 999px pills, same
  colours, same count-badge vocabulary, DIFFERENT numbers and DIFFERENT
  behaviour, distinguished only by an 11px mono kicker. The navigating row is
  now a link affordance (no pill outline, `--info-deep`, a per-chip chevron,
  underline on hover, and a label naming the destination); the filter row keeps
  the pill because it genuinely carries toggle state. Rule: reserve the pill for
  stateful toggles, use link treatment for navigation.
- **The app prints through ONE `@media print` block, and its two
  non-obvious rules are load-bearing (cycle-18 batch 8).** There were no print
  rules at all until then, and the defect that mattered was silent: every modal
  is `max-height: 86vh; overflow-y: auto`, so printing produced exactly one
  screenful — MEASURED, a 2359px pay statement printed 772px, dropping 1587px
  of payroll data with no indication anything was missing. (a) **The neutral
  tokens are forced with `!important`.** Browsers default to
  `print-color-adjust: economy` and drop background fills, so a dark-mode page
  prints a white sheet with `--ink` still near-white — invisible ink, not merely
  ugly. `!important` rather than specificity because the palette blocks are
  `:root[data-palette="x"][data-mode="dark"]` at (0,3,0) and would out-specify a
  plain `:root`; that set grows every time a palette is added. (b) **Chrome is
  hidden BY NAME, never by blanket-hiding `<button>`** — several surfaces use
  buttons to carry DATA (the transfer-count disclosure, KB roster person chips),
  and hiding them all would delete content from the printout. `.no-print` is the
  escape hatch for controls INSIDE printed content, and `body:has(.overlay.open)`
  makes an open modal the print subject so the page behind it does not print
  with it. Verify with `test/visual/print-check.mjs` — a print block cannot be
  checked by reading it, since `print-color-adjust` and `:has()` only exist in a
  real engine.
- **A bite-check ends in `git checkout`, so never run one against a file with
  uncommitted edits (cycle-18 batch 5B).** The helper mutates a file, runs the
  suite, then restores it with `git checkout -- <file>` — which reverts the file
  to HEAD, discarding any uncommitted work in it. This is the same class as the
  cycle-17 incident that cost an uncommitted `Code.js` block, and it fired THREE
  more times during the 5B sweep. The rule is: **commit before bite-checking**,
  which also makes an imprecise reverse-edit a safe `git checkout` recovery
  instead of lost work. The A14 ratchet caught the last occurrence; nothing
  catches it in general, so `bite.sh` should refuse to run against a dirty file.
- **An `outerHTML` patch replaces ONE element, so that element must contain
  everything its renderer emits (operator 2026-08-31).** `drRepaintKpi_` does
  `host.outerHTML = drKpiStripHtml_(DR_LAST_DATA)` — the in-place resolve path
  that exists so marking a request resolved doesn't blank the list. When the
  business-hours round made that renderer emit an explanatory note AFTER the
  `.telemetry` div carrying `id="dr-kpi"`, the first render was correct and
  every SUBSEQUENT resolve appended another copy of the note beside the old
  one: the patch replaced the grid it was pointed at and left the sibling
  behind. The fix is structural, not a cleanup call — the id moved onto a
  WRAPPER around strip + note, so the element being replaced IS the whole
  rendered unit. The general rule: **when a renderer grows a new sibling,
  check whether anything patches it by id.** The failure is invisible on
  first paint and compounds once per interaction, which is exactly the shape
  that survives a screenshot review. Same family as the class-vs-identity
  entry below, one level up: there the SELECTOR was too broad, here the
  REPLACEMENT was too narrow. Pinned by the BIZ-3 wrapper-shape assertion.
- **A per-rep result cache on a surface that lists TASKS owes an invalidation
  from every flow that COMPLETES one (F4, cycle 19).** The user's next act
  after finishing a task is to go and look, so a TTL that is fine for a
  read-only aggregate is a visible lie on a to-do list: `getMyPendingTasks`
  backs the Needs-you block, the first thing on the Dashboard, and a rep who
  had just marked training read, passed a quiz, acknowledged a coaching note,
  signed a doc, closed a call-back or resolved a dept request went back to a
  list still naming it for up to `PENDING_TASKS_CACHE_TTL` (120s). Seven call
  sites drop that rep's entry via `pendingTasksBust_(empId)`:
  `markTrainingComplete`, `submitQuizAttempt` (on a PASS — hooking only the
  read path would be a half-fix that looks whole), `acknowledgeCoaching`,
  `acknowledgeDoc`, `setScheduledCallStatus`, and BOTH dept-request resolve
  paths — the shared writer `markDeptRequestResolved_` clears the SENDER (both
  paths route through it) and the in-app `resolveDeptRequest` also clears the
  RESOLVER, the one case where the acting rep is not the owner. Keyed per rep,
  so a targeted `remove` is enough and no generation salt is needed (a salt
  would evict every rep's entry on every resolve — too blunt for a 2-minute
  cache on the busiest surface). Best-effort by construction: a cache miss is
  the correct fallback, so it can never throw into a write that already
  succeeded. TWO deliberate residuals: another member of the same receiving
  desk keeps a resolved request in their incoming list for the TTL (closing it
  needs the salt), and `submitCallNote` is NOT hooked — the notes row derives
  from `getMyMetrics`'s own 5-minute cache, so busting this key alone could not
  change the answer, which would be a claimed fix that does not fix.
- **An ASYNC prefill must fill only the fields the user has not typed into,
  and a FAILED prefill must not leave a saveable blank form (operator
  2026-09-03).** Day Edit opens blank and `getEmployeeTimesheetForManager`
  fills it about a second later; a manager who typed a corrected Clock In
  before that response landed had it OVERWRITTEN by the stored value, so the
  save sent the old time as a no-op while the lunch and clock-out typed
  afterwards landed — "it kept the old clock-in". Two guards now: a per-open
  sequence (`_deLoadSeq` — a superseded response never applies, even when its
  date matches) and a per-field TOUCHED flag (`_deTouched` — the prefill fills
  only untouched fields). The empty failure handler was the second half of the
  hazard: a blank slot DELETES that punch on save (S7), so a prefill that
  failed silently left a form whose Save would wipe the day; it now disables
  Save and says "reopen to retry". Apply the same two guards to any modal that
  prefills asynchronously. Pinned by the Day Edit DOM test.
- **`location.reload()` reloads the IFRAME, not the app — and that URL is
  session-bound (operator 2026-09-01).** The shell renders inside
  HtmlService's cross-origin iframe, so `window.location` is the
  `script.googleusercontent.com/userCodeAppPanel` URL. Refetching it paints a
  BLANK inner frame while the real `/exec` page above it never moves — which
  is what the deploy-beacon's Reload button did until an operator reported
  having to press the browser's own reload afterwards. This is the THIRD
  instance of one class: the iframe sandbox already poisoned
  `window.location.search` (INV-78, which silently no-op'd every deep link)
  and `origin + pathname` (which shipped the pop-out broken), and both were
  fixed by using the server-injected `SERVER_WEB_APP_URL` instead. **Any code
  that navigates or reloads the app must go through `reloadApp_()` /
  `SERVER_WEB_APP_URL`, never `window.location`.** `reloadApp_` moves the TOP
  window via `Location.replace` — one of only two members a cross-origin
  Location exposes, and a click supplies the user activation a sandboxed
  top-navigation needs — then falls back to a `'_top'` open and only last to
  the in-frame reload. Note the ordering is the contract, not decoration: an
  "obvious" simplification that reloads first short-circuits straight back to
  the blank frame, which is why the pin COUNTS the reloads rather than
  checking that one appears last (the first version of it did, and a
  reload-first mutation passed). Pinned by BCN-3.
- **A class-wide attribute write assumes every member of the class is yours
  (operator 2026-08-11).** `index.html`'s theme reflector did
  `querySelectorAll('.sb-theme-btn')` and wrote `aria-pressed` on every hit —
  correct while that class had exactly two members, wrong the moment the
  reminder-alert toggles reused it for its look. The toggles rendered
  `aria-pressed="true"` in markup and read `false` in the live DOM on every
  load, so the sound toggle silently reset itself each session. The reflector
  now selects `.sb-theme-btn[data-theme-target]` — the attribute that actually
  means "this is a theme button". **Reusing a class for its APPEARANCE is
  normal; what is not safe is a writer keyed on that class rather than on the
  thing it identifies.** The bug is invisible to source review (the markup is
  right) and was found only by reading the attribute back in a real browser.
- **A pill tab strip must scroll inside itself, or it pushes the whole page
  sideways (operator 2026-08-11).** `.toolbar-tabs` is an `inline-flex` pill
  with no wrap and no scroll; the Admin sub-tabs are five of them, which
  measured 415px against a 390px viewport — the entire page scrolled
  horizontally. It now carries `max-width: 100%; overflow-x: auto` with
  `flex: 0 0 auto` tabs, so the strip scrolls internally and wide layouts are
  byte-identical (max-width only binds when the row would overflow). The
  Admin tab had never been shot at a mobile width, which is how a shared
  component used on several surfaces kept a phone-width defect — see the
  Visual Audit Stage's list of still-uncovered scenarios.
- **Two layout lessons that only MEASUREMENT found, both from one chip
  (operator testing note 10, 2026-09-10).** (a) **An inline
  `white-space: nowrap` pill inside a `1fr` grid track propagates its
  min-content width through the track.** The first presence chip on the Team
  Right Now card was a nowrap inline span; `report.json` flagged +34px page
  overflow on `clock-light-mobile`, and an element walk (skipping every element
  with an `overflow-x` ancestor — the misdiagnosis rule from the Manage Time
  gap) found both `.dash-foot` cards at 412px on the 390px phone: the shell's
  ≤540px `.emp-grid` could not shrink the track below the pill. The chip became
  a wrapping BLOCK (`display:block; width:fit-content; max-width:100%;
  white-space:normal`) and the page went 390/390. A squeezed card and an
  overflowing one look IDENTICAL in a screenshot — read `overflowPx`. (b) **A
  shared descendant rule beats a plain class rule at lower specificity, and the
  loss is invisible in source.** `.card-label > span:first-child { flex: 1;
  min-width: 0 }` is (0,2,1), so the (0,2,0) class rule written to keep the
  "Team Right Now" title on one line LOST to it — measured: title 10px wide,
  "Team / Right / Now" on three lines with the longer summary drawn over it.
  The head rules are (0,3,1) now (the title `flex: 0 0 auto; nowrap`, the
  summary the flexible, right-aligned, wrapping half — title 108px on one
  line, summary two lines beside it). Before fixing a layout under a shared
  rule, compute the specificity you are competing with; the reasoned fix was
  wrong here and the measured one right. Pinned in D-N10 (chip never nowrap,
  both head rules present).
- **The `hidden` attribute LOSES to any class rule that sets `display`
  (operator #2 batch, 2026-08-06 — MEASURED).** The UA stylesheet's
  `[hidden] { display: none }` is ordinary specificity, so
  `.m-controls { display: flex }` beats it and the element renders visible
  with `hidden` set — the Metrics Custom… date rows shipped visible on the
  first shoot exactly this way. Any element that BOTH carries a
  display-setting class AND is toggled via the `hidden` attribute needs an
  explicit `.the-class[hidden] { display: none; }` companion rule
  (`.m-custom-row[hidden]` is the in-tree example, pinned by the #2 pin).
  The alternative idiom — toggling a `.collapsed`/`.open` class — avoids the
  trap but then owes the A11 tripwire its aria-expanded bookkeeping; either
  is fine, half-and-half is not.
- **`Notes` tab provisions on first touch.** `getCallNotesSheet_`
  creates the tab + header row if it doesn't exist, so a freshly
  enrolled rep's first `submitCallNote` "just works." The header row
  comes from `CN_HEADERS` — any change there must be paired with a
  schema migration plan because existing reps' tabs won't auto-rewrite.
- **`CN_EMAIL_PALETTE` is hand-resolved from design tokens.** Email
  clients strip `<style>` blocks and don't honor CSS variables, so the
  call-note email bodies inline literal hex from a CN_EMAIL_PALETTE
  constant in `Code.js`. If `styles_design_tokens.html` palette values
  change in a meaningful way (e.g., the Console → next palette swap),
  re-resolve the hex equivalents in CN_EMAIL_PALETTE or the email
  aesthetic drifts from the in-app aesthetic. Plus three UMS-brand
  entries (`brand` =
  navy `#223b5d`, `brandSoft` = pale blue `#e6f2ff`, `logoUrl` = the
  UMS Presentation Logo) — these are NOT design-token-derived; they're
  the legacy `closeOrderEmail.js` / `updateOrderEmail.js` identity
  carried forward into the new web-app emails (Call Details table
  header, alternating row tint, top-of-email logo bar). Subform
  detail borders (shipping, resupply, OOP) also use resolved hex —
  `#b1d1c4` for good-transparent and `#e7bda3` for warn-transparent.
  The 2nd-pass email restyle EXTENDED this palette with semantic email
  tokens (`accentBorder`/`dangerBorder`/`warnBorder`, `info` link, `star`,
  `muted2`/`muted3`, `navyTint`) and **routed the Intake/PPD builders onto
  it** (`intakePpdAnswerStyles_`, `intakeBuildPpdBodyHtml_`,
  `intakeBuildAcctBodyHtml_`, the PAP `CONDITIONAL_FORMATTING_ROWS` constants)
  — they previously hardcoded Material/Google hexes. Keep ALL email color on
  this palette; new email color belongs here, not inline. **Email-safe rule
  (re-affirmed by the PPD fix): NO `display:flex` / `gap` / `filter`** —
  Outlook drops them; `intakeRecListHtml_` was rebuilt from a flex `<li>` +
  `filter:grayscale` into 2-cell table rows with explicit grey for rejected.
  **A second email-safe rule (2026-08-11): never place `logoUrl` on a coloured
  fill** — it is a JPEG with no transparency, so a navy band frames it as a
  white rectangle. Every email puts the mark on the light card over a navy
  rule; and because most clients block remote images by default, the `alt`
  text carries the cell's own type styling so a blocked logo still reads as
  the brand.
- **Clipboard API often fails in HtmlService iframes.** The auto-copy
  feature tries `navigator.clipboard.writeText` first and falls back
  to a `<textarea>` + `document.execCommand('copy')` shim
  (`cnFallbackCopy_`). Both fire from the Ctrl/⌘+Enter user gesture so
  permissions are usually granted, but never assume one path alone
  works.
- **`showToast(msg, type)` normalizes the variant — pass either form.**
  Most callers pass the full class (`'toast-success'` / `'toast-error'` /
  `'toast-warn'` / `'toast-info'`), but the Training / EmpDocs partials pass
  bare names (`'success'` / `'error'` / `'warn'` / `'info'`). `showToast`
  (`script_core.html`) now normalizes via
  `cls = /^toast-/.test(cls) ? cls : (cls ? 'toast-' + cls : '')` so both
  render the colored rail + correct glyph. Before the 2nd-pass fix, bare
  names rendered with NO accent rail and fell through to the info glyph
  (18 Training/EmpDocs callsites). `.toast-info` was added at the same time
  (only success/error/warn existed). Either calling form is fine now —
  don't "fix" callers to one style.
- **Call-notes flag enum vs. blank.** `FlagType` is `''` / `'action'`
  / `'training'` / `'review'`. `sanitizeFlagType_()` lowercases + range-
  checks; bad values fall back to `''` rather than throwing, so
  experimental UI tweaks can't write garbage into the column.
  `Resolved` is only meaningful when `FlagType=action`; the resolve
  endpoint rejects calls on other flag types. Switching flag types
  (e.g. action → training) clears `Resolved` as a side-effect, so
  stale `resolved=TRUE` from a prior action cycle doesn't resurface
  if the rep flips back to action.
- **EOD digest runs hourly and matches each rep's local EOD hour.**
  `sendCallNotesEodDigest` is triggered `everyHours(1)`; on each run it
  walks the roster and emails a rep only when their local hour equals
  `CONFIG.CALL_NOTES.EOD_WARNING_HOUR` (hour-equality, not a ±minute
  window). This reliably reaches reps in every timezone — the prior
  once-at-manager-5pm window silently skipped offshore reps (IST/PHT)
  whose local 5pm never coincided with the manager's. Most hourly runs
  send nothing (no reps at their EOD hour with unresolved flags), so the
  cost is just a cached roster walk. `EOD_WARNING_WINDOW_MINUTES` is
  retained in CONFIG but is no longer used by the gate. A rare
  trigger-jitter could double-match a rep within the same local hour — a
  benign duplicate reminder, not a miss.
- **`SubformData` (column P) is a generic per-note metadata JSON blob.**
  Every client-writable input into it is size-bounded: the submit-path keys
  via `sanitizeCallNotePayload_`'s caps (INV-143), and — since cycle 11
  (L-1) — the four email-composer subform detail objects via
  `CN_EMAIL_DETAILS_MAX_CHARS` (16k combined serialized, enforced in
  `validateEmailSelections_` so BOTH Preview and Send reject identically;
  `sanitizeEmailSelections_` also coerces non-object details to null). They
  were the one unbounded input: a huge pasted specialNote rode into the
  ~50k-cap cell, the post-send stamp failure was swallowed (INV-42), and a
  near-cap blob made every later pin/flag/feedback write on that note throw.
  **Cycle-12 F11 closed the same class in the LENGTH dimension:** the two
  APPEND-ONLY arrays (`feedback[]` — one entry per manager reply / comment /
  rep ack / clarification — and `externalEmails[]` — one per external send)
  had no bound at all, so a long coaching thread on one note, or a note
  emailed repeatedly, walks the cell toward the same limit. All FOUR appends
  now go through `cnAppendBounded_`, which enforces an entry-count cap
  (`CN_FEEDBACK_MAX_ENTRIES` 200 / `CN_EXTERNAL_EMAILS_MAX_ENTRIES` 100) AND a
  serialized-size check (`CN_SUBFORM_MAX_CHARS` 45k, under the cell limit),
  REFUSING with an actionable error and popping the entry back off rather than
  silently dropping the oldest (these arrays are the coaching/send RECORD — the
  INV-96 posture). **The non-growing writes (flag / resolve / pin) are
  deliberately NOT size-gated** — they set scalar fields and are the recovery
  path for an already-oversized note; gating them would make such a note
  unfixable. The `externalEmails[]` stamp runs after a successful send, so a
  refusal there only logs (INV-42) and skips the cell write.
  Originally introduced to persist email-composer subform selections
  (so a "re-send same departments" flow can re-open the composer
  pre-populated), the blob now also stores: `trainingQuestion`
  (set on submit when training flag is selected),
  `trainingReply` / `trainingReplyBy` / `trainingReplyAt`
  (set by `setCallNoteTrainingReply` when a manager answers),
  `pinned` / `pinnedAt` (set by `setCallNotePinned`),
  `completionSeconds` (form-start-to-submit duration captured on
  submit, used by `managerGetShiftStats`'s median calc), and — the
  pilot round-1 pair (2026-08-21), both client-writable and
  INV-143-whitelisted/bounded — `reviewComment` (optional free text on
  a review flag, trimmed + 2000-char cap, set at submit or via
  `setCallNoteFlag`'s 4th arg) and `callDirection` (stored ONLY as
  `'outbound'`; absent = inbound, a bounded enum like `intakeType` so
  no migration and no garbage values). Future
  per-note metadata should also live here rather than spawning new
  columns. `callNoteRowToObject_` tries `JSON.parse` and returns
  `null` on failure rather than throwing — corrupted blobs should
  never break a read.
- **Late `google.script.run` successHandlers in Call Notes loaders
  guard on `currentView`.** Every Call Notes loader (`cnLoadToday_`,
  `cnLoadDateRange_`, `cnFireSearch_`, `cnMgrLoadQueue_`,
  `cnMgrLoadRepNotes_`) captures `const requestedView = currentView;`
  and skips the render branch on success/failure when
  `currentView !== requestedView`. (The dead `cnLoadDate_` wrapper was
  REMOVED in cycle-17 batch ⑥ together with this list's mention of it —
  the A4 precedent.) Without this guard, a slow-network
  nav-away clobbers the new view's innerHTML because every view writes
  into the same `#view-area` node. State updates (CN_STATE.*) still
  happen unconditionally so the cache stays warm for when the rep
  returns. Apply the same pattern to any new Call Notes loader.
  **A structured `{error}` response is NOT a wipe (cycle-17 C17-5):** only
  the not-configured (enrollment) branch may clear
  `rollingNotes`/`historyNotes`; any other `{error}` — and every transport
  failure — PRESERVES last-good, sets
  `rollingLoadFailed`/`historyLoadFailed`, and NULLS the SWR stamp
  (`rollingEntry`/`historyEntry`) so a failed round is never served as
  fresh (the INV-129 cache-only-on-success rule applied client-side). A
  failed load with NO last-good renders `errorStateHtml_` in the stack,
  never the empty-day state (the skip-render/INV-187 variant the A12
  tripwire cannot see). Pinned by the C17-5 pin.
- **`cnRenderSubforms_` is shape-keyed via `host.dataset.shapeKey`.**
  Re-rendering the same shape is a no-op so typing into the Update
  Type field doesn't wipe in-progress subform values on every
  keystroke. When the shape changes (e.g. user switches from
  "Verified Shipping" to "Close Order"), the function first calls
  `cnGatherComposerSelections_()` in a try/catch to snapshot the
  prior DOM into state — so flipping back to the original shape
  restores their values.
- **`cnToggleComposerDept_` updates the modal in place, no full re-render.**
  Earlier versions re-rendered the entire modal innerHTML on every
  chip click, which flashed visibly. The current implementation calls
  `cnUpdateComposerDeptUI_` which mutates only the parts that depend
  on dept selection: chip `aria-pressed` states, the conditional
  "Other" email row, and the update-type datalist's option set. The
  `cnGatherComposerSelections_()` call up front is still defensive —
  it snapshots any in-progress subform values into state so a future
  re-render (e.g., subform shape-key change) doesn't lose typing. Any
  new dept-dependent UI must be added inside `cnUpdateComposerDeptUI_`,
  not in `cnRenderComposerFormStep_` alone, or it won't track toggles.
- **Optimistic UI for submit / flag / resolve on Call Notes.**
  Submitting, flagging, and resolving notes are optimistic — the
  client mutates `CN_STATE.rollingNotes` and calls render BEFORE the
  server RPC fires. Pending notes carry `_pending: true` and render
  with reduced opacity + a "Saving" badge in place of action buttons.
  Server failure triggers `cnRevertPendingSubmit_` (for submit) or
  restores the prior flag/resolved state (for toggles), and surfaces
  a clear toast. Flag/resolve/pin attempts on a pending note show
  "Just a moment — still saving" since the server has no record of
  it yet. A per-note `_flagInFlight` guard drops rapid double-clicks
  on flag / resolve / pin toggles — the second click is silently
  ignored while the first RPC is in flight. Edits and emails remain
  pessimistic — they require a server-issued noteId.
- **Form-completion timer is persisted to localStorage.**
  `cnFormTimerStartIfNeeded_` writes the start ms to
  `localStorage['umsCallNotesFormStartedAt']` on the first form
  input event; survives reloads (refresh mid-note shouldn't reset
  the clock). On submit, `cnFormTimerEndAndGet_` returns the elapsed
  seconds — capped at 30 min as null (rep walked away mid-note,
  shouldn't pollute the median). The value rides into the server
  payload as `subformData.completionSeconds`; the manager Stats tab
  medians over notes that captured one. Any new form-clearing path
  must call `cnFormTimerReset_` or the next note will inherit the
  prior session's elapsed time.
- **Sticky form draft is auto-saved on every input.**
  `cnPersistActiveFormDraft_` writes the active form contents to
  `localStorage['umsCallNotesActiveFormDraft']` debounced 400ms.
  `cnRestoreActiveFormDraft_` runs on Log view enter and surfaces a
  "Draft restored" toast when a draft was present. Both the
  successful-submit path and the explicit Clear Note button call
  `cnClearStickyFormDraft_`. **If you add a new form-clearing code
  path, call it there too** or the draft will resurrect on next load
  even though the rep meant to start fresh.
- **Voice dictation routes audio outside the BAA boundary.**
  `CONFIG.CALL_NOTES.VOICE_INPUT_ENABLED` is off by default. When on,
  the mic button uses `webkitSpeechRecognition`, which in Chrome
  routes the audio to Google's speech-to-text service — and the Web
  Speech API is NOT covered by a typical Google Workspace BAA. The
  operator must confirm the org's HIPAA stance before flipping the
  flag; patient names, device types, and addresses dictated into the
  mic leave the browser. The flag is surfaced via
  `getCallNotesDepartments` → `CN_STATE.deptConfig.voiceInputEnabled`,
  so the UI never renders the mic when the flag is false.
- **`safeTimezone_` validates roster timezone strings.**
  `safeTimezone_(tz)` shape-checks the id first (IANA `Area/Location`
  or a `UTC`/`GMT±h[:mm]` token) and only then probes
  `Utilities.formatDate(new Date(), tz, 'z')`, falling back to
  `CONFIG.TIMEZONE` with a `Logger.log` warning. The shape gate is
  load-bearing: the V8 runtime's `formatDate` no longer throws on an
  unknown tz id (it silently resolves it to GMT), so the try/catch
  probe alone stopped catching roster typos. Residual gap: a
  well-shaped-but-unknown id like `Not/ATimezone` still passes (it
  formats as GMT). Used by `sendCallNotesEodDigest` and
  `sendDailyMissedPunchAlerts`. New code reading timezone values from
  the roster for trigger/automation contexts should route through this
  helper rather than raw `|| CONFIG.TIMEZONE` fallback.
- **Personal-sheet sync failures log to the audit trail.**
  `writeToEmployeeSheet_` and `clearFromEmployeeSheet_` write a
  `PersonalSheetSyncFail` audit row on failure — it means a rep's
  personal Sheet is inaccessible and drifting from the ADP source of
  truth. These are surfaced (count + recent entries, 30-day window) in
  **Call Notes → Admin → Automation Health** (`getAutomationHealth`),
  so a manager sees the drift without reading the raw AuditLog.
- **Tag admin operations hold the global ScriptLock across all
  enrolled rep Sheets.** `renameCallNoteTag` / `mergeCallNoteTags`
  iterate the roster via `applyTagTransformAcrossReps_`, open each
  rep's Sheet, parse + rewrite `subformData.tags[]` — all inside one
  project-level `ScriptLock` held for the full iteration. Concurrent
  submits / flag toggles / pins across other reps wait until the
  tag mutation completes. Acceptable today (admin ops are rare and
  the working set is small), but if you add reps in volume re-
  evaluate. Per-rep Sheet failures are swallowed via try/catch so one
  broken Sheet doesn't fail the whole rename, but the audit row's
  `repsTouched` / `notesUpdated` counts reflect only successfully
  rewritten reps. `archiveCallNoteTag` is cheap — only the Script
  Property changes — but it still acquires the same lock so it can't
  race with a rename/merge that depends on the current archive set.
- **CN card buttons use `data-cn-action` delegation, not inline onclick.**
  `cnInstallCardDelegation_(area)` installs a single click listener on
  the view container that dispatches to `cnToggleFlag_`,
  `cnToggleResolved_`, `cnTogglePinned_`, `cnCopyNoteAgain_`,
  `cnOpenEmailComposer_`, `cnBeginEdit_`, `cnSaveEdit_`,
  `cnCancelEdit_`, `cnDeleteNote_`, `cnFindPriorCallsForTrx_`, and
  `cnToggleMoreMenu_` via the button's `data-cn-action` attribute.
  The note's ID is read from the closest `[data-note-id]` ancestor.
  A `_cnDelegationInstalled` flag on the area element prevents
  duplicate listeners when the user navigates between CN views
  (Log / History / Search share the same `#view-area` DOM node).
  Action handlers call `cnReRenderActiveView_()` instead of
  `cnRenderStack_()` directly — the dispatcher routes to
  `cnRenderStack_` in Log and `cnRenderHistoryStack_` in History so
  flag/pin/edit/delete updates render correctly in both views.
  `cnInstallCardDelegation_` also installs a delegated `keydown` on the
  same container: Cmd/Ctrl+Enter inside any `[id^="cnE-"]` inline-edit
  field saves that note (`cnSaveEdit_`). It's delegated (not a
  per-element listener) so it survives a mid-edit re-render — an
  optimistic flag toggle or ambient refresh recreates the edit field,
  which would otherwise drop a per-element listener; `cnBeginEdit_` only
  focuses the field.
- **Training questions email managers immediately.**
  `submitCallNote` calls `notifyManagerTrainingQuestion_()` (best-
  effort, try/catch) when `flagType=training` and
  `subformData.trainingQuestion` is non-empty. Previously, managers
  only saw training questions in the weekly digest.
- **`setCallNoteFlag` accepts an optional `trainingQuestion`.**
  When flagging an existing note as `training` from a card button,
  the client prompts for a question and passes it as the third arg.
  The server merges it into `subformData.trainingQuestion` inside
  the same lock. This parallels the active-form path where the
  question is set during `submitCallNote`.
- **`getMyCallNotesRange` caps at 90 days.** The date-range History
  endpoint validates both dates and rejects spans > 90 days. The
  client presets (Last 7, Last 30) stay within this cap; custom
  ranges could hit it. Returns notes sorted newest-first with the
  same response shape as `getMyCallNotes`.
- **Call-note delete window.** `deleteCallNote` enforces
  `CONFIG.CALL_NOTES.DELETE_WINDOW_SECONDS` (5 min). Reps can only
  delete notes within 5 minutes of creation — older notes must be
  edited in place. The window matches the time-clock `selfDeletePunch`
  pattern. The client's delete button (via `cnDeleteNote_`) shows the
  server's error if the window has passed.
- **`getCallNotesDepartments` requires an enrolled employee.** Added
  an auth check so unregistered domain users can't read internal
  department email addresses. The CN client calls this after employee
  state loads, so the auth is always present.
- **Call Notes ambient polling stops on tool switch.** `showView()`
  calls `cnStopAmbientPolling_()` when navigating to a non-Call Notes
  tool. Without this, the 60-second `getCallNotesAmbient` interval
  fired continuously even in Time Clock views.
  `cnStartAmbientPolling_()` restarts it on return to any CN tab —
  `showView` calls it symmetrically for `callNotes`-tool views (cycle-8
  fix; previously only the Log enter started it, so a deep-link/
  refresh-restore into History/Search left the badge + flag propagation
  dead). The start is IDEMPOTENT (a live timer is left alone) so
  CN-internal tab hops don't fire an extra RPC per nav.
- **The Log rolling stack live-refreshes (#3).** The Log view is a
  today-only, fetch-on-enter view (`getMyCallNotes` returns one day);
  `cnRefreshRollingStack_` re-fetches today's notes + re-renders so a note
  logged in ANOTHER context (the pop-out / a second window — they share the
  server Sheet but NOT in-memory `CN_STATE`) surfaces without a manual nav.
  Triggered from the 60s ambient poll (Log only) + window `focus`/
  `visibilitychange` (`cnEnsureLiveRefreshBound_`, 2s throttle, idempotent
  bind). It preserves optimistic `_pending` notes (filters them back on top of
  the server set) and is SKIPPED while an inline edit is open
  (`CN_STATE.editingNoteId`) so it can't wipe an editor. It re-renders only
  `#cn-stack` + the filter bar, not the form/modals. (NOTE: nav-back already
  re-fetched; this closes the cross-window staleness gap. The whole-stack
  re-render could diff-before-render to avoid a scroll jump — accepted as-is
  since the stack is small.)
- **Sidebar badge selectors use `data-tool`, not `data-view`.**
  The sidebar renders `data-tool="callNotes"` / `data-tool="metrics"`
  on its buttons. Badge pollers that query the sidebar must use
  `.sb-link[data-tool="..."]`, not `data-view`. A prior mismatch
  caused the CN stale-flag badge to silently never render. The
  Metrics alert badge follows the same `data-tool` pattern.
- **Modals close on Escape THROUGH their close hook — dynamic overlays
  must be created via `ensureOverlay`.** The shared keydown handler in
  `script_core.html` closes the **topmost** `.overlay.open` (last in
  DOM order, matching the focus trap) via `closeOverlay(el)`, which
  runs the close function registered in `OVERLAY_CLOSE_HOOKS` and only
  falls back to a plain `open`-class strip for static modals with no
  module state (Adjust, Day Detail, Day Edit, Export, Manager
  Time-Off, Call Notes Export). Dynamically-created overlays (CN
  dept/external composers, CN form-sub viewer, Intake preview, KB
  editor) are created via `ensureOverlay(id, { onClose })`, which
  ALWAYS re-asserts `overlay open` on reuse and registers the module's
  close function. This closed a real bug class: Esc used to strip only
  the class, leaving the node hidden-but-stateful — the CN composers
  then rendered into the hidden node forever (email flow dead until
  reload) and the Intake modal's document-level paste listener leaked
  app-wide, silently swallowing image pastes. Any NEW dynamic overlay
  must use `ensureOverlay` (never hand-roll `createElement` +
  `className = 'overlay open'`), and its `onClose` must be idempotent
  (safe to call when already closed). The `focusin` handler still
  returns focus to the topmost open overlay's first focusable element
  (the KB drawer is exempt). **Focus lifecycle (a11y batch H):** on a
  closed→open transition `ensureOverlay` stashes the trigger element and
  defer-focuses the first focusable inside the dialog (skipped for
  hover-mode popovers and when the module already placed focus inside);
  `closeOverlay` restores the trigger ONLY when the overlay actually
  closed — a hook may legitimately refuse (the INV-145 mid-send guard),
  and yanking focus then would fight the module (DOM-pinned).
  `uiConfirm`/`uiPrompt` also restore the trigger on cleanup.
- **Public form endpoints have no employee auth — token is the
  credential.** `getFormByToken` and `submitFormByToken` are the
  only server functions accessible without `getEmployeeInfo_()`
  auth. They validate via UUID token (checked against the
  `FormTokens` sheet tab). Never add PHI-returning logic to these
  endpoints beyond what the token already authorizes. The token
  contains the form type and prefill data — it does NOT grant
  access to the rep's call notes, employee roster, or any other
  internal data. `serveExternalForm_` serves `form_public.html`
  which is a standalone page with no `include()` of internal
  partials. `submitFormByToken` also bounds the recipient-supplied
  payload before writing — field-count (≤200) and per-cell char caps
  (~45k, under the 50k Sheets cell limit) on the data JSON and the
  signature — returning a specific, actionable error and leaving the
  token `pending` for retry instead of throwing mid-append on an
  oversized signature (INV-96).
- **Form submissions are PHI and segregated, hashed, and consent-stamped.**
  (Forms-hardening pass.) `getFormsSS_()` resolves `FormTokens`/`FormSubmissions`
  to Script Property `FORMS_SS_ID` (point it at `INTAKE_SS_ID` to move PHI off
  the ADP/payroll sheet) and falls back to the ADP SS only for back-compat — a
  fresh deploy that wants segregation MUST set `FORMS_SS_ID` and migrate the two
  tabs. `submitFormByToken` pulls `signature` AND `_meta` out before storing
  responses, **server-enforces consent** (the payload must carry
  `_meta.consentAgreed === true` — an absent `_meta` is now rejected too,
  closing the prior back-compat hole where a hand-crafted payload could omit
  it), stamps the **server-authoritative** `CONFIG.FORM_CONSENT_VERSION`
  (never trusts a client-sent version), and writes a **tamper-evident
  `SubmissionHash`** + a `Certificate` JSON into trailing `FS` columns. The hash
  (`computeFormSubmissionHash_`) covers responses+signature+token+consentVersion
  — **NOT `submittedAt`** (Sheets coerces an ISO datetime to a Date on read,
  which would break recompute); the timestamp's independent witness is the
  append-only `FormSubmissionReceived` audit row (which now carries `hash=` +
  `submittedAt=`). `verifyFormSubmissionIntegrity_(token)` (manager-gated,
  read-only) recomputes and compares — a mismatch means the stored row was
  altered. `FS_HEADERS` grew by trailing columns (back-compat like `CN_HEADERS`:
  old 6-col rows read back with the new fields undefined; `verify`/the viewer
  treat a missing hash as "legacy, can't verify", not a failure). **The invite
  email stays PHI-minimal** — prefill lives in the token, never the email body
  (pinned by the `forms — invite email builders` Node guard); the rep's freeform
  `subject`/`message` must not carry clinical PHI. **Suitability:** this pipeline
  is appropriate for patient-self-submission (EAA, self-serve PPD, demographics);
  it is NOT a signature-of-record for provider-signed clinical documents
  (PT/OT Rx, seating evals) submitted to payers — those need a certified e-sign
  vendor or a DMEPOS platform (CMS signature-validity + the supplier-can't-author
  rule + corroborating-record requirements are out of this tool's reach).
- **`LEAVE_DEDUCTION_CLIENT` mirrors the server's `getLeaveDeduction_`
  exactly.** Powers the live balance-after preview in the PTO day
  modal (`tc/script_timeoff.html`). Adding a new leave type means
  updating BOTH maps — plus `TIME_OFF_TYPES`, the server-side submit
  whitelist (INV-95), and the `day-type` `<select>` options in
  `modals.html` (a Node-harness tripwire pins that the options stay a
  subset of `TIME_OFF_TYPES`); the server still does the actual balance
  deduction on submit, so a drift causes the UI to mis-preview
  without corrupting state, but the rep sees a wrong projected
  number on hover/select. Same maintenance discipline as the
  `CN_EMAIL_PALETTE` constant.
- **Clock view coverage strip is SWR-cached per day (cycle-9 M-6).** The
  Clock view's `loadCoverageStrip_` paints `CLK_COVERAGE_CACHE` (date-keyed)
  instantly, then ALWAYS background-refetches `getMyMetrics(today)` and
  re-renders — the `CLK_NOTEVOL_CACHE` pattern. (The pre-cycle-9 cache-hit
  early-return froze "N% logged · File N missing" for the WHOLE day: the
  formerly documented nav-away-and-back refresh path re-entered the loader
  and hit the cache, so a rep who filed the missing notes kept seeing the
  stale CTA until reload/midnight — worst in the pinned all-shift pop-out.)
  Freshness is now bounded by `getMyMetrics`'s 5-min server result cache
  (L-1), and an error/failed refetch keeps the last-good render (blank only
  on a cold miss). Don't reintroduce a cache-hit early-return here.
- **`getMyMetrics` is ALSO server-result-cached (L-1).** Independent
  of the client cache above, the endpoint caches its assembled result
  in `CacheService` for `CONFIG.CDR_CACHE_TTL` (5 min) keyed by
  `metrics_my_v2:<emp.id>:<date>`. It's the only rep-facing CDR read
  and per INV-124 it scans the WHOLE roster's per-rep matrix +
  the Transfer sheet UNCACHED on every open — the result cache keeps a
  Metrics-tab re-enter / date toggle from re-scanning. The cache is at
  the ENDPOINT layer, so INV-67 ("`getCdrDailyBreakdown_` is uncached")
  stays literally true — the helper just isn't re-called on a hit. Keyed
  by `emp.id` so no rep reads another rep's cached self-view; error
  results are never cached; same ≤5-min staleness tradeoff as
  `getMetricsAmbient` and the Clock strip. The cache is BYPASSED (read +
  write) whenever a test CDR override (`_TEST_OVERRIDE_CDR_SS_ID`) is active —
  the same special-casing `getCdrSS_`/`getIntakeSS_`/`getKbSS_` apply — so a
  fixture test's cached success can't mask a later test's CDR state (it was
  masking the `metrics_getMyMetrics_cdrUnavailableErrors` error-path test,
  since `_resetCdrCaches_` only clears the in-memory CDR caches, not this
  CacheService entry). Production is unaffected (the override is undefined).
- **Metrics enters call `stopClock` to avoid an interval leak.**
  `enterMetricsMyStatsView` and `enterMetricsTeamView` call
  `stopClock()` at the top (guarded by `typeof`) so the Clock view's
  1Hz live-time + 60s ribbon-now-cursor intervals don't keep firing
  in the background after navigating from Clock to Metrics — matching
  the Time Off / Manager / Call Notes enters. (Before this they didn't,
  a bounded leak: both tick functions early-return when their target
  elements aren't in the DOM, so it was wasted timer fires, no
  functional bug.)
- **Apps Script's HtmlService iframe sandboxes `window.location.search`.**
  The user-facing deploy URL's query string (`?compact=1`, `?tool=X`,
  `?prefill=...`) is invisible to client JS via `window.location.search`
  inside the iframe (`script.googleusercontent.com`). Read URL params
  from `window.SERVER_QUERY_PARAMS` instead — `doGet` evaluates
  `index.html` as a template with `serverQueryParams = e.parameter`,
  and the `<head>` script injects it into the window global. The XSS
  escape replaces `<` with `<` to prevent attacker-controlled query
  values containing `</script>` from breaking out. `__URL_PARAMS` in
  `script_core.html` consumes it with a `window.location.search`
  fallback for local dev. Pre-Round-2 deep-link contracts (compact
  pop-out, `?tool` deep-link) silently no-op'd in production because
  of this; the fix unblocked them all simultaneously. The SAME sandbox
  also poisons `window.location.origin + pathname`: it's the
  session-bound `googleusercontent.com` iframe URL, which renders a
  BLANK page when opened as a top-level window — the pop-out button
  shipped broken on exactly this until operator testing caught it.
  `doGet` now also injects `window.SERVER_WEB_APP_URL` (the normalized
  `/exec` base via `getWebAppExecUrl_`, shared with `buildFormUrl_`) and
  `popOutCurrentView` opens THAT. Any future client code that needs the
  app's own URL must use `SERVER_WEB_APP_URL`, never `window.location`.
  Pinned by a Node tripwire.
- **`form_public.html` must inject `FORM_TOKEN` via the unescaped
  `<?!=` scriptlet.** The standalone public form page receives its
  token through `serveExternalForm_`'s `tpl.formToken`. It must print
  via `<?!= JSON.stringify(formToken||'').replace(/</g,'<') ?>` —
  the escaping `<?=` variant HTML-encodes `JSON.stringify`'s
  double-quotes into `&quot;`, yielding invalid JS
  (`var FORM_TOKEN = &quot;…&quot;;`) and a mangled/empty token, so
  `getFormByToken` finds no row and the page shows "Form not found."
  Same `<`→`<` XSS guard and rationale as the
  `SERVER_QUERY_PARAMS` injection (INV-78). Pinned by
  `test_tpl_formToken_usesUnescapedScriptlet` +
  `test_tpl_noEscapedJsonInjection` (the latter forbids any escaping
  `<?=` JSON injection across HTML templates).
  ALSO: never write the literal scriptlet delimiters (`<?` / `?>`) or a
  literal closing `</script>` tag inside a JS *comment* in any
  HtmlService template (`form_public.html`, `index.html`). The template
  engine scans the raw file for scriptlet delimiters regardless of JS
  comments, so a comment containing one opens a spurious scriptlet whose
  body begins with stray text → a server-side "Unexpected token" error
  at `tpl.evaluate()` (Code.js `serveExternalForm_`). This regressed the
  fillable-form link until fixed — the page failed to load with
  `SyntaxError: Unexpected token ')'`. Now also pinned by
  `test_tpl_formPublic_evaluatesWithoutError`, which `.evaluate()`s the
  template (not just string-matches the raw file) so this class of bug
  is caught.
- **`form_public.html`'s signature canvas must be resized when its
  section becomes visible.** The signature `<canvas>` lives in
  `#sig-section`, which is `display:none` until the HIPAA-consent checkbox
  is checked. `initSignaturePad`'s `resizeCanvas()` reads
  `parentElement.getBoundingClientRect()` — while hidden that's a 0-width
  box, so the canvas gets a 0-width drawing bitmap and the first strokes
  land nowhere. Symptom: "I couldn't draw until I hit Clear" (Clear was the
  only other path that re-ran the resize). Fix: the consent `change`
  handler calls `SIG_PAD.resize()` when it reveals the section (guarded on
  `SIG_PAD.isEmpty()` so an uncheck→recheck can't wipe a drawn signature,
  since setting `canvas.width` clears the bitmap). A `.sig-placeholder`
  overlay ("Tap or click and drag here to sign") hides on first stroke /
  shows on Clear. Any new code path that toggles the section's visibility
  must re-resize the canvas the same way. **Typed-signature alternative
  (a11y):** both pads (this one and the EmpDocs twin) expose
  `setTypedName(name)` behind a "Can't use the pad? Type your signature
  instead" disclosure — the typed name renders ONTO the canvas in a script
  face, so the exported artifact stays the same PNG data-URL class as a
  drawn signature and the whole downstream pipeline (600px export cap,
  size caps, hashes, certificates, C13 dual-verify) is untouched. Node
  parity pin `both pads carry setTypedName` keeps the twins in lockstep.
- **`form_public.html`'s local `esc()` escapes quotes (F cycle-8) — don't
  "simplify" it back to `textContent`→`innerHTML`.** Unlike the shell's `esc()`,
  the standalone public page had its own copy that escaped only `&`/`<`/`>` (the
  `textContent`→`innerHTML` round-trip doesn't encode `"`/`'`), yet it's used in
  ATTRIBUTE contexts (`value="' + esc(x) + '"`). Every value there is a hard-coded
  literal today, so it was latent — but a future server/recipient string rendered
  into an attribute would break out. `esc()` now escapes `& < > " '` explicitly;
  keep it that way (matches the shell `esc()`).
- **Call Notes form fields are contenteditable `.ce` divs, not
  input/textarea.** Read via `cnGetFieldValue_(id)` and write via
  `cnSetFieldValue_(id, value)` — both dispatch on `el.isContentEditable`
  so the helpers work transparently for the `.ce` divs AND legacy
  input/textarea (`cn-tag-input`, `cn-fld-training-q`, email modal
  fields). The setter also toggles the `.empty` class (for the
  `data-placeholder` pseudo-element) and dispatches an `input` event
  so persistence + completion-timer + phone-formatter listeners react
  the same way as user typing. Paste is sanitized to plain text via
  `execCommand('insertText')` on each `.ce`. A bound `copy` event on
  `#cn-frame` writes the full formatted CRM template via
  `cnFormatNoteForCopy_` — since 2026-08-13 ONLY when the selection is
  collapsed; a real selection copies what is selected (see the
  manual-copy-failover Key Design Decision for why the blanket
  intercept inverted into a bug once the fields became contenteditable).
  COROLLARY: any document-level keyboard handler that exempts form
  fields must check `document.activeElement.isContentEditable` in
  addition to the `INPUT`/`TEXTAREA`/`SELECT` tagName check — the `.ce`
  divs are DIVs, so a tagName-only guard misses them. The shell's
  bare-`?` shortcuts-overlay handler (`script_core.html`) regressed on
  exactly this (a literal `?` typed into Issue/Resolution opened the
  overlay and swallowed the keystroke) until the isContentEditable
  check was added.
- **Eighteen client-side localStorage keys total.** All per-browser, all
  wrapped in try/catch so a privacy-mode browser doesn't break:
  - `umsTimeClockMode` — dark/light preference (read by the boot
    script in `index.html`).
  - `umsCallNotesActiveFormDraft` — the in-progress Call Notes form
    auto-saved on every input (debounced 400ms); restored on next
    Log view enter with a "Draft restored" toast. Cleared on
    successful submit or explicit Clear Note. Round 2 · 8e extended
    the persisted shape to include `flags[]` (multi-select) + `tags[]`;
    pilot round 1 (2026-08-21) added `reviewC` (the review-flag
    comment) + `direction` (the outbound toggle) — the full
    persist/restore/clear/snapshot/park round-trip carries both.
    Drafts carry an `at` ms stamp and expire after 24h
    (`CN_FORM_STICKY_MAX_AGE_MS`) — a stale draft from a prior shift
    is silently discarded (and the completion timer reset) instead of
    resurrecting day-old patient details into a fresh session.
  - `umsCallNotesFormStartedAt` — start-ms of the active form's
    completion timer; persists across refresh so a mid-form reload
    doesn't reset the clock. Captured into `subformData.completionSeconds`
    on submit.
  - `umsSidebarW` — sidebar width in px (Round 2 · 8a); range-checked
    on restore (56–280px). Default 168px when absent or out of range.
  - `umsKbPanel` — KB drawer preferences as ONE JSON blob:
    `recents[]` ({id, title}, capped 5, deduped) + `suggest` (bool,
    default true — the context-suggestions toggle) + `aiSeen`
    ({hash, date} — the Phase A guidance card's collapse-after-seen
    marker; same facet combo renders collapsed for the rest of the
    day) + `deptCollapsed` ({deptName: bool} — the Reference tab's
    collapsible-department open/closed state, written by `kbToggleDept_`)
    + `bookmarks[]` ({id, title}, capped 12, deduped — #5 per-rep favorites,
    toggled via the reader/drawer star `kbToggleBookmark_`/`kbBookmarksToggle_`,
    surfaced in a Bookmarks block atop the Reference landing + the drawer home).
    Sanitized on read (corrupt blob → `{}`); deliberately a
    single key so drawer prefs don't multiply the key count.
  - `umsLastView` — the active tab key, written by `showView` on every
    navigation EXCEPT in the compact pop-out (cycle-10 D8 — a pinned
    pop-out must not steer the main window's boot tab). On boot (when no
    `?tool=` deep-link is present) the shell
    re-enters this tab instead of defaulting to Time Clock, so an
    accidental refresh mid-note lands back on the Log view where the
    sticky form draft restores the typed fields. `enterTool`'s
    managerOnly bump makes a stale manager-tab value safe for reps.
  - `umsTour` — onboarding-tour state: `{seenVersion}`. The coach-marks
    tour auto-starts once per `TOUR_VERSION` (bump to re-offer after a
    material UI change); stamped on finish/skip. Replayable anytime from
    the Call Notes ? menu regardless of this flag.
  - `umsPopoutGeom_<tool>` — compact pop-out window geometry `{w,h,x,y}`,
    **keyed per tool** (#4 + per-tool windows). Written by
    `popoutPersistGeometryInit_` (compact window only, debounced on resize +
    on `beforeunload`) under the tool the window was opened for; read by
    `popOutCurrentView` (in either window — same-origin localStorage is shared)
    via the pure, range-guarded `popoutParseGeom_` (corrupt/out-of-range → null
    → default 480×800). A legacy single-window `umsPopoutGeom` blob seeds the
    SIZE only (not position) so a fresh per-tool window doesn't stack on an
    existing one. So each tool's pop-out remembers its own size/position across
    launches. Position is best-effort (browsers restrict programmatic move of an
    existing window).
  - `umsIntakeDrafts` — in-progress Intake form answers (PPD / PMD / PAP)
    as ONE JSON blob keyed by form type (`INTAKE_DRAFT_KEY`), auto-saved on
    input, restored on the form's view enter, cleared on send + Clear. Like
    the Call Notes draft it carries an `at` ms stamp and expires after 24h.
    NOTE this is **PHI at rest in the browser** (patient answers) — the same
    posture as the Call Notes active-form draft; it lives only in the rep's
    own browser and is wiped on send/clear/expiry.
  - `umsCoachingMode` — the merged Coaching tab's Mine/Team mode (managers
    only; `'mine'` | `'team'`, default `'team'`). Reps never write it (they're
    always pinned to `'mine'` and never see the toggle). Read by
    `coachReadMode_`, written by `coachSwitchMode_`.
  - `umsCoachingFilter` — the manager Team Coaching feed's filter strip choice
    (`'all'` | `'ack'` | `'overdue'` | `'praise'` | `'voided'`, default `'all'`;
    design handoff PR 4). Validated against `COACH_FILTERS` on read — a corrupt
    value falls back to All. Written by the strip's click handler.
  - `umsWhatsNew` — the "What's new" seen-stamp (`{seenStamp}` — the designated
    KB article's edit timestamp at last panel dismissal, INV-152). Since the
    operator-feedback round (2026-07-09) the panel NO LONGER auto-opens:
    updates surface as rotating slides in the Dashboard greeting bar
    (`clkGreetRot*` + the pure `whatsNewItems_`), and the stamp gates the NEW
    accent on those slides. Clicking a slide / the sidebar star opens the full
    panel; ANY dismissal path (Got it, Esc, backdrop — the modal renders no
    separate X button) stamps it via
    `whatsNewClose_`. Corrupt blob = never seen (NEW accent shows — fail-open).
  - `umsNotify` — reminder-alert channels as ONE blob (`{sound, desktop}`,
    operator 2026-08-11). `sound` DEFAULTS ON (a corrupt/absent blob reads as
    sound-on, desktop-off); `desktop` is only ever set true after the browser
    actually GRANTS permission, so it can't promise a channel that will never
    fire. Read by `notifyPrefs_`, written by the sidebar/mobile-header bell +
    pop-out toggles. Being localStorage, it is shared origin-wide, so setting
    it in the main window also governs the compact pop-out (whose sidebar is
    hidden).
  - `umsTheme` — the colour PALETTE (operator 2026-08-12): `'sand'` / `'plum'`
    / `'teal'`, or ABSENT for the default Console. Console deliberately stores
    NOTHING rather than the string `'console'`, so an untouched browser and a
    deliberately-reset one look identical in localStorage — and the boot script
    validates against `PALETTE_KEYS`, so a corrupt value degrades to Console
    rather than being reflected onto `<html>`. Read + applied SYNCHRONOUSLY in
    the `<head>` (the `data-mode` discipline — a palette flash on every load
    would be worse than no palette), written by `setTimeClockPalette`.
  - `umsTzWarnedDay` — the roster-vs-browser timezone-mismatch warning's
    once-per-day stamp (operator 2026-08-13; the 9:30 PM note diagnosis).
    Written by `tzMismatchCheck_` when the browser's UTC offset disagrees
    with the roster timezone's; the sticky warn toast then fires at most
    once per browser-local day. Absent/corrupt = the check may warn today.
  - `umsDashMetrics` — the Dashboard metric cards' same-day SWR blob
    (`{day, data}` — the last COMPLETE, fully-successful
    getDashboardMetrics round for all three periods). Seeded on a same-day
    cold boot so a reload paints instantly; the refetch still runs
    (freshness is never inherited — INV-156), and partial/failed rounds
    are never persisted (INV-129). Aggregate call metrics only — no PHI.
  - `umsRemindFired` — the reminder ticker's CROSS-WINDOW fired-set
    (`{day, keys}`, operator 2026-08-17: the main window and a pinned
    pop-out each run `remindersTick_`, so every break/clock-out reminder
    toasted + chimed TWICE). `remindOnce_` checks + writes it, so a
    reminder fired in ANY window is marked for all; a different `day`
    resets it (the in-memory set's own rollover rule), and a
    localStorage-throwing privacy-mode browser degrades to per-window
    dedupe — the pre-fix behavior, never worse.
  - `umsQaPeriod` — the QA Recordings tab's audit-period pick (design
    handoff PR 5, 2026-09-02): a `yyyy-MM` or `yyyy-Qn` key VALIDATED against
    the options the server shipped before it is stored; the server's echoed
    `period` always wins on load (an unknown key lands on the current
    month), so a stale pref can never pin a period the server would not
    compute. Absent = the current month.
  Clearing browser data wipes all eighteen. (`umsMergeMode` — the Time/PTO
  Time Off ⇄ Timesheet mode — was RETIRED with the 2026-08-18 consolidation:
  the two modes were one page with a swapped 240px rail, so the rail now
  stacks both; a stale stored value is simply ignored.) (`umsCallNotesLastDept` — the
  composer's last-dept default — was REMOVED by operator decision 2026-08-13:
  pre-selecting the previous note's departments on an unrelated note invites a
  mis-send, and the failure mode is an email leaving the building rather than
  retyping. A re-send still restores the note's OWN stored departments. The KB
  AI facet-gather's department facet, which piggybacked on this key, is simply
  absent now.) (A prior key,
  `umsDashboardCompact` — an in-page Dashboard compact toggle — was REMOVED in
  the dashboard-feedback batch: the toggle button lived inside the column it
  hid, so once collapsed there was no way back, and the `?compact=1` pop-out
  already covers compact.)

## Key Design Decisions

**The decisions themselves live in [`docs/design-decisions.md`](docs/design-decisions.md)**
— 137 entries, moved out of this file by Batch D1. This is the index: one line
each, linking to the entry. Read the index to find the decision; read the entry
for the reasoning, which is usually the part that matters.

- [Multi-tool registry with tab sub-navigation](docs/design-decisions.md#multi-tool-registry-with-tab-sub-navigation)
- [Tool view partials live in their own subfolder](docs/design-decisions.md#tool-view-partials-live-in-their-own-subfolder)
- [One `CONFIG` object](docs/design-decisions.md#one-config-object)
- [Audit log is append-only](docs/design-decisions.md#audit-log-is-append-only)
- [Best-effort email notifications](docs/design-decisions.md#best-effort-email-notifications)
- [The editor suite is SHARDED into three registrars, and its expected count is DERIVED (Batch S, 2026-09-11)](docs/design-decisions.md#the-editor-suite-is-sharded-into-three-registrars-and-its-ex)
- [Smoke vs. integration tests](docs/design-decisions.md#smoke-vs-integration-tests)
- [PTO bucket state lives in the Employees sheet](docs/design-decisions.md#pto-bucket-state-lives-in-the-employees-sheet)
- [Per-employee PTO opt-out via `EMP.PTO_ENABLED` column](docs/design-decisions.md#per-employee-pto-opt-out-via-emp-pto-enabled-column)
- [Self-undo vs. Adjust split](docs/design-decisions.md#self-undo-vs-adjust-split)
- [Resuming a closed day CONVERTS the clock-out into a break — it never deletes it (B3, operator 2026-09-01)](docs/design-decisions.md#resuming-a-closed-day-converts-the-clock-out-into-a-break-it)
- [Punch-adjustment requests are a TimeOffRequests-style queue (#4a)](docs/design-decisions.md#punch-adjustment-requests-are-a-timeoffrequests-style-queue)
- [`normalizeTime_` as the universal read shim](docs/design-decisions.md#normalizetime-as-the-universal-read-shim)
- [Timezone display split](docs/design-decisions.md#timezone-display-split)
- [Secrets via Script Properties](docs/design-decisions.md#secrets-via-script-properties)
- [Web app runs as the deployer, open to ANYONE_ANONYMOUS](docs/design-decisions.md#web-app-runs-as-the-deployer-open-to-anyone-anonymous)
- [Design tokens are the single source of truth for color, typography, radii, shadows, and motion](docs/design-decisions.md#design-tokens-are-the-single-source-of-truth-for-color-typog)
- [Colour palettes are a SECOND attribute overlay, orthogonal to light/dark (operator 2026-08-12)](docs/design-decisions.md#colour-palettes-are-a-second-attribute-overlay-orthogonal-to)
- [Dark mode is an attribute overlay, not a separate stylesheet](docs/design-decisions.md#dark-mode-is-an-attribute-overlay-not-a-separate-stylesheet)
- [Chrome icons are SVG via `icon(name, size)` from `script_icons.html`, never emoji](docs/design-decisions.md#chrome-icons-are-svg-via-icon-name-size-from-script-icons-ht)
- [The two Stage-0 partials are the shared foundation for future tools in this repo](docs/design-decisions.md#the-two-stage-0-partials-are-the-shared-foundation-for-futur)
- [Compact mode is a shell-level attribute, not per-tool CSS](docs/design-decisions.md#compact-mode-is-a-shell-level-attribute-not-per-tool-css)
- [Pop-out uses a PER-TOOL named window target](docs/design-decisions.md#pop-out-uses-a-per-tool-named-window-target)
- [Per-rep call-notes Sheets are the storage substrate](docs/design-decisions.md#per-rep-call-notes-sheets-are-the-storage-substrate)
- [Team-member onboarding is an Admin flow (operator request 2026-08-07, pre-pilot)](docs/design-decisions.md#team-member-onboarding-is-an-admin-flow-operator-request-202)
- [Settings live behind ONE gear, in a flyout panel (operator 2026-08-13)](docs/design-decisions.md#settings-live-behind-one-gear-in-a-flyout-panel-operator-202)
- [View-as is an ADMIN-ONLY, SESSION-ONLY, CLIENT-ONLY preview (operator 2026-08-13)](docs/design-decisions.md#view-as-is-an-admin-only-session-only-client-only-preview-op)
- [The slow tabs paint last-good INSTANTLY and refresh behind the pill (operator 2026-08-13 — "My Stats / Team Metrics / Spanish Inbox take a while")](docs/design-decisions.md#the-slow-tabs-paint-last-good-instantly-and-refresh-behind-t)
- [Pre-pilot observability round (operator 2026-08-13 — "I want to know what is working, if any issues arise, and what parts of the web app are priorities")](docs/design-decisions.md#pre-pilot-observability-round-operator-2026-08-13-i-want-to)
- [Deploy-version beacon — open clients PROMPT to reload after a New-version deploy (operator 2026-08-27)](docs/design-decisions.md#deploy-version-beacon-open-clients-prompt-to-reload-after-a)
- [Reminders are a SHELL capability, not a Clock-view one (operator 2026-08-11)](docs/design-decisions.md#reminders-are-a-shell-capability-not-a-clock-view-one-operat)
- [Two-way Sheet entry via the reconcile pass (#8)](docs/design-decisions.md#two-way-sheet-entry-via-the-reconcile-pass-8)
- [Two-stage email is the safety mechanism](docs/design-decisions.md#two-stage-email-is-the-safety-mechanism)
- [Auto-copy format is a CONFIG template](docs/design-decisions.md#auto-copy-format-is-a-config-template)
- [Client-side persistence is localStorage-based](docs/design-decisions.md#client-side-persistence-is-localstorage-based)
- [Optimistic UI is the perceived-speed mechanism for the Call Notes hot path](docs/design-decisions.md#optimistic-ui-is-the-perceived-speed-mechanism-for-the-call)
- [Pay statement — own-data payroll self-check (operator 2026-08-17)](docs/design-decisions.md#pay-statement-own-data-payroll-self-check-operator-2026-08-1)
- [Time / PTO merge (Round 2 · 8b) → ONE page (operator 2026-08-18)](docs/design-decisions.md#time-pto-merge-round-2-8b-one-page-operator-2026-08-18)
- [Day Edit modal on Live Status cards](docs/design-decisions.md#day-edit-modal-on-live-status-cards)
- [Team punches calendar (Manage → Manage Time, operator 2026-08-31)](docs/design-decisions.md#team-punches-calendar-manage-manage-time-operator-2026-08-31)
- [Manage Time is a GROUPED scroll — Needs you, then Periodic collapsed (design handoff PR 3, 2026-09-02)](docs/design-decisions.md#manage-time-is-a-grouped-scroll-needs-you-then-periodic-coll)
- [Personal pin is per-rep, capped at 3, stored in `subformData`](docs/design-decisions.md#personal-pin-is-per-rep-capped-at-3-stored-in-subformdata)
- [Auto-tag rules (operator 2026-08-13)](docs/design-decisions.md#auto-tag-rules-operator-2026-08-13)
- [Intake recommendation feedback (operator 2026-08-13)](docs/design-decisions.md#intake-recommendation-feedback-operator-2026-08-13)
- [Manager Q&A reply on training-flagged notes](docs/design-decisions.md#manager-q-a-reply-on-training-flagged-notes)
- [Manager comments on ANY note, not just training (item 9)](docs/design-decisions.md#manager-comments-on-any-note-not-just-training-item-9)
- [Automated notification emails are branded (item 2)](docs/design-decisions.md#automated-notification-emails-are-branded-item-2)
- [Email body restored to the UMS legacy aesthetic](docs/design-decisions.md#email-body-restored-to-the-ums-legacy-aesthetic)
- [Intake emails share the app's email chrome (operator 2026-08-11)](docs/design-decisions.md#intake-emails-share-the-app-s-email-chrome-operator-2026-08)
- [Department emails and state tax rates are editable via the Admin tab](docs/design-decisions.md#department-emails-and-state-tax-rates-are-editable-via-the-a)
- [Runtime feature toggles via a registry + the Admin tab](docs/design-decisions.md#runtime-feature-toggles-via-a-registry-the-admin-tab)
- [Stale-flag badge on the manager CN landing](docs/design-decisions.md#stale-flag-badge-on-the-manager-cn-landing)
- [Client-side undo window handles midnight wrap](docs/design-decisions.md#client-side-undo-window-handles-midnight-wrap)
- [Bulk approve/deny fires parallel RPCs](docs/design-decisions.md#bulk-approve-deny-fires-parallel-rpcs)
- [Dashboard analytics are computed from existing data](docs/design-decisions.md#dashboard-analytics-are-computed-from-existing-data)
- [PTO balance reconciliation (drift detection)](docs/design-decisions.md#pto-balance-reconciliation-drift-detection)
- [CN card actions use a primary/secondary split](docs/design-decisions.md#cn-card-actions-use-a-primary-secondary-split)
- [Card-level urgent toggle lives in the More menu](docs/design-decisions.md#card-level-urgent-toggle-lives-in-the-more-menu)
- [Email subforms are color-coded by type](docs/design-decisions.md#email-subforms-are-color-coded-by-type)
- [Email composer modal is draggable + resizable](docs/design-decisions.md#email-composer-modal-is-draggable-resizable)
- [Keyboard shortcuts accelerate the Call Notes hot path](docs/design-decisions.md#keyboard-shortcuts-accelerate-the-call-notes-hot-path)
- [Training Q&A tray surfaces manager answers on the Log view](docs/design-decisions.md#training-q-a-tray-surfaces-manager-answers-on-the-log-view)
- [History view supports date ranges](docs/design-decisions.md#history-view-supports-date-ranges)
- [Manager cross-rep search in Team Notes](docs/design-decisions.md#manager-cross-rep-search-in-team-notes)
- [Stats drill-down links to Per-Rep View](docs/design-decisions.md#stats-drill-down-links-to-per-rep-view)
- [Email department display on note cards](docs/design-decisions.md#email-department-display-on-note-cards)
- [External email for customers and providers](docs/design-decisions.md#external-email-for-customers-and-providers)
- [Interactive fillable web forms via token-gated public route](docs/design-decisions.md#interactive-fillable-web-forms-via-token-gated-public-route)
- [In-app form-submission viewer](docs/design-decisions.md#in-app-form-submission-viewer)
- [Sent Forms tab (rep-facing, read-only)](docs/design-decisions.md#sent-forms-tab-rep-facing-read-only)
- [Intake Sent tab (rep-facing, read-only) — same model for intake submissions](docs/design-decisions.md#intake-sent-tab-rep-facing-read-only-same-model-for-intake-s)
- [Form-submission notification renders the completed form](docs/design-decisions.md#form-submission-notification-renders-the-completed-form)
- [Cross-rep manager aggregates are cached](docs/design-decisions.md#cross-rep-manager-aggregates-are-cached)
- [Paired-timezone chip + signal chip vocabulary](docs/design-decisions.md#paired-timezone-chip-signal-chip-vocabulary)
- [Time Clock → Dashboard (the Clock tab is a two-column Dashboard)](docs/design-decisions.md#time-clock-dashboard-the-clock-tab-is-a-two-column-dashboard)
- [Clock view: hero + shift-strip + ledger architecture](docs/design-decisions.md#clock-view-hero-shift-strip-ledger-architecture)
- [The DONE state NAMES the punch it was derived from (operator 2026-09-01)](docs/design-decisions.md#the-done-state-names-the-punch-it-was-derived-from-operator)
- [Day ribbon (Clock view)](docs/design-decisions.md#day-ribbon-clock-view)
- [Manager telemetry strip with sparklines](docs/design-decisions.md#manager-telemetry-strip-with-sparklines)
- [Live-status sparkline](docs/design-decisions.md#live-status-sparkline)
- [Metrics hero + rail layout](docs/design-decisions.md#metrics-hero-rail-layout)
- [Per-queue attribution exists ONLY for TRANSFERS (cycle-14 Phase 1)](docs/design-decisions.md#per-queue-attribution-exists-only-for-transfers-cycle-14-pha)
- [Note coverage + count have a single source of truth](docs/design-decisions.md#note-coverage-count-have-a-single-source-of-truth)
- [Cross-rep call-note reads are bounded too](docs/design-decisions.md#cross-rep-call-note-reads-are-bounded-too)
- [Manager day-edit date picker is bounded `[today-N, today]`](docs/design-decisions.md#manager-day-edit-date-picker-is-bounded-today-n-today)
- [The Call Notes pop-out's type is FLUID below its launch width (operator 2026-08-18)](docs/design-decisions.md#the-call-notes-pop-out-s-type-is-fluid-below-its-launch-widt)
- [Compact pop-out defaults to 480×800, then remembers (#4) — PER TOOL](docs/design-decisions.md#compact-pop-out-defaults-to-480-800-then-remembers-4-per-too)
- [Resizable sidebar with snap (Round 2 · 8a)](docs/design-decisions.md#resizable-sidebar-with-snap-round-2-8a)
- [Hover-triggered day modal (Round 2 · 8c)](docs/design-decisions.md#hover-triggered-day-modal-round-2-8c)
- [Rectangular PTO tile (Round 2 · 8d)](docs/design-decisions.md#rectangular-pto-tile-round-2-8d)
- [Coverage-strip nav hint (Round 2 · 8z)](docs/design-decisions.md#coverage-strip-nav-hint-round-2-8z)
- [Call Notes vertical layout + contenteditable (Round 2 · 8e)](docs/design-decisions.md#call-notes-vertical-layout-contenteditable-round-2-8e)
- [Manual-copy failover on `#cn-frame` (Round 2 deferred 8e; RESCOPED operator 2026-08-13)](docs/design-decisions.md#manual-copy-failover-on-cn-frame-round-2-deferred-8e-rescope)
- [Multi-select flag toolbar + free-text tags (Round 2 · 8e)](docs/design-decisions.md#multi-select-flag-toolbar-free-text-tags-round-2-8e)
- [Multi-turn Q&A thread on training notes (Round 2 · 8g)](docs/design-decisions.md#multi-turn-q-a-thread-on-training-notes-round-2-8g)
- [Admin tab augmented with KPIs + tag taxonomy (Round 2 · 8h; 2nd-pass consolidation; design handoff PR 2, 2026-09-02)](docs/design-decisions.md#admin-tab-augmented-with-kpis-tag-taxonomy-round-2-8h-2nd-pa)
- [External-email message template library (Admin tab)](docs/design-decisions.md#external-email-message-template-library-admin-tab)
- [Quick Links picker (Admin tab + external composer)](docs/design-decisions.md#quick-links-picker-admin-tab-external-composer)
- [Reference tool: native markdown articles + Drive embeds, one store](docs/design-decisions.md#reference-tool-native-markdown-articles-drive-embeds-one-sto)
- [KB Phase 2: per-item Doc→article converter, review-before-save](docs/design-decisions.md#kb-phase-2-per-item-doc-article-converter-review-before-save)
- [Interactive roster block (` ```roster `, operator 2026-08-11)](docs/design-decisions.md#interactive-roster-block-roster-operator-2026-08-11)
- [A fenced block is ATOMIC in search-chunk truncation (operator 2026-08-11)](docs/design-decisions.md#a-fenced-block-is-atomic-in-search-chunk-truncation-operator)
- [Decision / task-guide block (` ```decision `, operator 2026-08-11)](docs/design-decisions.md#decision-task-guide-block-decision-operator-2026-08-11)
- [Glossary block (` ```glossary `, operator 2026-08-11)](docs/design-decisions.md#glossary-block-glossary-operator-2026-08-11)
- [Warehouse map block (` ```map `, operator 2026-08-13 — Tier A, NO billing)](docs/design-decisions.md#warehouse-map-block-map-operator-2026-08-13-tier-a-no-billin)
- [Article images fall back to server-served data when Drive blocks the thumbnail (operator 2026-08-13)](docs/design-decisions.md#article-images-fall-back-to-server-served-data-when-drive-bl)
- [Apps Script's missing-SCOPE refusal is NOT an admin block, and a green `runAllTests()` does not vouch for Drive (operator 2026-09-09)](docs/design-decisions.md#apps-script-s-missing-scope-refusal-is-not-an-admin-block-an)
- [Sheet→article conversion (operator 2026-08-11)](docs/design-decisions.md#sheet-article-conversion-operator-2026-08-11)
- [KB Phase 2b — converter images export to Drive at SAVE time](docs/design-decisions.md#kb-phase-2b-converter-images-export-to-drive-at-save-time)
- [KB Phase 3 — paste-a-screenshot upload in the article editor](docs/design-decisions.md#kb-phase-3-paste-a-screenshot-upload-in-the-article-editor)
- [KB AI Phase A — facet-based guidance card in the Reference drawer](docs/design-decisions.md#kb-ai-phase-a-facet-based-guidance-card-in-the-reference-dra)
- [KB reference drawer — mid-call lookup as a shell capability](docs/design-decisions.md#kb-reference-drawer-mid-call-lookup-as-a-shell-capability)
- [KB usage feedback loop ("most referenced during calls")](docs/design-decisions.md#kb-usage-feedback-loop-most-referenced-during-calls)
- [Self-improving-KB loop — rep freshness signal + content-gap requests (INV-139)](docs/design-decisions.md#self-improving-kb-loop-rep-freshness-signal-content-gap-requ)
- [Win-back nudge on a "changing suppliers" close](docs/design-decisions.md#win-back-nudge-on-a-changing-suppliers-close)
- [Compliance audit panel (Admin tab)](docs/design-decisions.md#compliance-audit-panel-admin-tab)
- [Deploy-readiness checklist (Admin Overview headline)](docs/design-decisions.md#deploy-readiness-checklist-admin-overview-headline)
- [Patient/TRX timeline (rep-facing, read-only)](docs/design-decisions.md#patient-trx-timeline-rep-facing-read-only)
- [Storage Health leads with DRIVE, which no store row can see (operator 2026-09-09)](docs/design-decisions.md#storage-health-leads-with-drive-which-no-store-row-can-see-o)
- [Storage Health panel (Admin tab, #1)](docs/design-decisions.md#storage-health-panel-admin-tab-1)
- [Automation Health panel (Admin tab)](docs/design-decisions.md#automation-health-panel-admin-tab)
- ["Open Email" button (Round 2 · 8f)](docs/design-decisions.md#open-email-button-round-2-8f)
- [Email composer Internal/External tab merge](docs/design-decisions.md#email-composer-internal-external-tab-merge)
- [Tag taxonomy rename/merge/archive batch-edits across reps](docs/design-decisions.md#tag-taxonomy-rename-merge-archive-batch-edits-across-reps)
- [`uiConfirm` / `uiPrompt` replace native `window.confirm` / `window.prompt`](docs/design-decisions.md#uiconfirm-uiprompt-replace-native-window-confirm-window-prom)
- [Training rides ON the Reference/KB layer (T1)](docs/design-decisions.md#training-rides-on-the-reference-kb-layer-t1)
- [Operator feedback round (2026-06-12) — note-template ergonomics for the pinned pop-out workflow](docs/design-decisions.md#operator-feedback-round-2026-06-12-note-template-ergonomics)
- [Onboarding tour — hand-rolled coach-marks (`script_tour.html`)](docs/design-decisions.md#onboarding-tour-hand-rolled-coach-marks-script-tour-html)
- [The Script-Property budget badge has ONE home (`propBudgetHtml_` + `.prop-budget`, Batch Q)](docs/design-decisions.md#the-script-property-budget-badge-has-one-home-propbudgethtml)
- [Shared `mtRenderTable_` table component (`script_core.html`)](docs/design-decisions.md#shared-mtrendertable-table-component-script-core-html)
- [Shared date-range control `mtDateRange_` + percent band `mtPctTone_` (`script_core.html`, design handoff PR 1 — 2026-09-02)](docs/design-decisions.md#shared-date-range-control-mtdaterange-percent-band-mtpcttone)
- [Admin sheet viewer (Tier 2 — `getAdminSheetView`)](docs/design-decisions.md#admin-sheet-viewer-tier-2-getadminsheetview)
- [Icon library additions (`script_icons.html`)](docs/design-decisions.md#icon-library-additions-script-icons-html)
- [Punch-button motion (dashboard-feedback batch)](docs/design-decisions.md#punch-button-motion-dashboard-feedback-batch)
- [Unified loader + motion system (2nd-pass; `styles.html` + `script_core.html`)](docs/design-decisions.md#unified-loader-motion-system-2nd-pass-styles-html-script-cor)
- [Cross-view hints are PARKED on `window`, consumed-and-nulled on the target's enter, never persisted (design handoff C8 — named 2026-09-02)](docs/design-decisions.md#cross-view-hints-are-parked-on-window-consumed-and-nulled-on)
- [Tag-suggestion autocomplete on the Log view](docs/design-decisions.md#tag-suggestion-autocomplete-on-the-log-view)

## Operator State Checklist

### Spreadsheet / storage map (one-screen reference)

Eight distinct spreadsheets, split deliberately along PHI / payroll / HR /
PHI-free / external lines and by retention policy — **consolidation is NOT
advised** (the boundaries are the point); manage them as a set instead. The
manager **Call Notes → Admin → Storage Health** panel (`getStorageHealth`)
shows each store's configured / reachable / **tz-vs-CONFIG** status live — the
one-pane-of-glass for this table. Keep all eight in one Drive folder for sanity.

| Store | Script Property (fallback) | Tabs | Class | Retention | Resolver |
|-------|----------------------------|------|-------|-----------|----------|
| Time Clock / ADP | `ADP_SS_ID` (CONFIG placeholder) | Employees (roster), Timesheet, TimesheetArchive (cold tier, INV-153 — **read back by the ADP export**, F1), TimeOffRequests, AuditLog, PunchAdjustRequests, ClientErrors (INV-150), ViewUsage (feature-usage telemetry, 2026-08-13), SpanishManualResolved, SpanishClaims (advisory claim/assign, append-only PHI-free — pilot round 2) | Payroll + shared audit | kept (archive moves, never deletes) | `getAdpSS_` |
| CDR Report | `CDR_SS_ID` (CONFIG placeholder) | DQE Historical Data, CSR Transfer Historical Data, Agent Alias Overrides | External (read-only) | owned by `call-data-reporting` | `getCdrSS_` |
| Intake | `INTAKE_SS_ID` (CONFIG placeholder) | Offerings, PPD/PMD/PAPSubmissions | **PHI** | optional purge | `getIntakeSS_` |
| Forms | `FORMS_SS_ID` (**falls back to the ADP sheet**) | FormTokens, FormSubmissions, ScheduledCalls (scheduled-call reminders — labels may name a patient, so PHI-class; epoch-ms NUMBER cells; pilot round 2) | **PHI** | 90-day purge (if enabled; ScheduledCalls is NOT purged) | `getFormsSS_` |
| Knowledge Base + Training | `KB_SS_ID` (CONFIG placeholder) | KB, KbViews, KbFeedback, KbContentRequests, KbComments (per-article discussion — append-only + soft-delete moderation, pilot round 3), KbRevisions, TrainingAssignments, TrainingCompletions, Quizzes, QuizAttempts, InsurancePayors (OPERATOR-IMPORTED payor-acceptance table — read-only, the insurance lookup, 2026-08-25) | PHI-free by policy | kept | `getKbSS_` |
| Employee Docs (HR) | `HR_DOCS_SS_ID` (**no fallback**) | EmpDocs, DocSignatures, EmpDocTemplates, Coaching | HR — keep-forever | **never purged** (INV-122/INV-134) | `getHrDocsSS_` |
| QA (recordings) | `QA_SS_ID` (**no fallback**) | QaRecordings (Drive-folder index: status/assignee/agent/shared — Phase 2 added the trailing Agent column; Phase 3 the SharedMs release stamp, 0 = unshared; design handoff PR 5 added DurationSec + SkipReason, header self-heals), QaExemptions (PR 5 — the audit-period exemption ledger: EmpName/Period/GrantedBy/GrantedMs/Active, append-only, latest row per (name, period) wins; written only by the manager-gated `qaSetExemption`), QaComments (timestamped review comments — soft-delete, append-only), QaScorecards (structured review scores — append-only, latest per (recording, reviewer) wins) | QA/HR-adjacent (comments may name patients; reviews reference agents) | optional review-record purge (`QA_REVIEW_RETENTION_DAYS`, default 0 — QaComments + QaScorecards ONLY; the recordings index + Drive files are never touched) | `getQaSS_` |
| Call Notes (per-rep) | `Employees` col L (`CallNotesSheetId`) | Notes, NotesArchive (cold tier), Scratchpad (one plain-text-pinned cell — the server-backed personal scratchpad, pilot round 3; PHI-plausible free text, so it rides the per-rep PHI store; NOT touched by the archive/purge tiers) — one Sheet **per rep** | **PHI** | optional archive + optional purge (live + cold) | `getCallNotesSheet_` |

**Every store's timezone MUST equal `CONFIG.TIMEZONE`** (coerced date/time reads
drift otherwise — the S1.1 tripwire `config_adpSheetTzMatchesConfig` enforces it
for the ADP sheet; Storage Health surfaces it for all). **Recommended
consolidation (the only one):** set `FORMS_SS_ID` to the Intake spreadsheet so
form PHI isn't co-located with the ADP/payroll sheet (the back-compat fallback) —
since pilot round 2 this recommendation also covers the `ScheduledCalls` tab
(reminder labels plausibly name patients, so they belong on the PHI store too).
Test-only twins: `TEST_CDR_SS_ID`, `TEST_INTAKE_SS_ID`, `TEST_HRDOCS_SS_ID`,
`TEST_KB_SS_ID` (cycle-10 M-9 — the KB fixture `_withTestKb_` provisions).
Auto-managed diagnostics: `WITNESS_AUDIT_FAILS` (cycle-10 C4 — the
`{count, lastAt, lastAction}` lost-tamper-witness counter stamped by
`writeWitnessAuditLog_` after a failed retry; surfaced in Automation Health +
the failure digest's 48h window; delete the property to reset the counter)
`AUTOMATION_LAST_ERRORS` (cycle-18 F4 — `{job: {at, error}}` stamped by a trigger handler's own catch and cleared on its next clean run, because a handler that RETURNS an error object reaches nobody; read by `automationProblems_` onto the health dot + failure digest. Auto-managed — delete the property to clear a stale failure flag) and `SELF_TEST_LAST_RESULT` (INV-162 — the nightly self-test outcome
`{date, mode, pass, fail, skip[, error]}`; delete to clear a stale failure
flag after fixing).

State that exists outside the codebase and must be set up
manually for a fresh deploy or environment:


### Inventory — what exists, and where it is documented

One line per standing item. The detail is the entry of the same name below;
the dated round entries that used to sit here moved to
[`docs/operator-log.md`](docs/operator-log.md) (Batch D1).

- [Blue-green (a personal dev instance alongside the team's prod) — see `docs/deployment.md`](#operator-blue-green-a-personal-dev-instance-alongside-the-team-s-prod)
- [The Timesheet timezone REPAIR (operator 2026-09-02 — the PH roster flip done mid-shift)](#operator-the-timesheet-timezone-repair-operator-2026-09-02-the-ph-ros)
- [The QA module Phase 1 (operator 2026-08-27) needs THREE Script Properties and one Drive folder before it does anything](#operator-the-qa-module-phase-1-operator-2026-08-27-needs-three-script)
- [Set Script Property `ADP_SS_ID`](#operator-set-script-property-adp-ss-id)
- [Set Script Property `CDR_SS_ID`](#operator-set-script-property-cdr-ss-id)
- [Script Property `TEST_CDR_SS_ID`](#operator-script-property-test-cdr-ss-id)
- [Set Script Property `INTAKE_SS_ID`](#operator-set-script-property-intake-ss-id)
- [Intake recipient addresses are Script-Property-backed](#operator-intake-recipient-addresses-are-script-property-backed)
- [Script Property `TEST_INTAKE_SS_ID`](#operator-script-property-test-intake-ss-id)
- [Set Script Property `KB_SS_ID`](#operator-set-script-property-kb-ss-id)
- [Script Property `KB_IMAGES_FOLDER_ID`](#operator-script-property-kb-images-folder-id)
- [Script Property `KB_SEARCH_SYNONYMS`](#operator-script-property-kb-search-synonyms)
- [Quiz import from Google Forms requires the Google Forms OAuth scope](#operator-quiz-import-from-google-forms-requires-the-google-forms-oaut)
- [KB Phase 2 converter requires the Google Docs OAuth scope](#operator-kb-phase-2-converter-requires-the-google-docs-oauth-scope)
- [Set Script Property `KB_AI_API_KEY` to enable the KB AI guidance card (Phase A)](#operator-set-script-property-kb-ai-api-key-to-enable-the-kb-ai-guidan)
- [Script Properties `KB_AI_DAILY_CAP` / `KB_AI_MODEL`](#operator-script-properties-kb-ai-daily-cap-kb-ai-model)
- [Script Properties `KB_AI_GENERATION` / `KB_AI_SPEND`](#operator-script-properties-kb-ai-generation-kb-ai-spend)
- [Script Property `KB_MAP_GEOCODE_CACHE`](#operator-script-property-kb-map-geocode-cache)
- [`CDR_ALERT_THRESHOLD`](#operator-cdr-alert-threshold)
- [Set Script Property `MANAGER_EMAILS`](#operator-set-script-property-manager-emails)
- [Script Property `ADMIN_EMAILS`](#operator-script-property-admin-emails)
- [Punctuality tracking (Manage module tab)](#operator-punctuality-tracking-manage-module-tab)
- [Coverage planner is business-hours/weekday scoped](#operator-coverage-planner-is-business-hours-weekday-scoped)
- [Spanish-inbox tracking (Gmail) needs 3 things](#operator-spanish-inbox-tracking-gmail-needs-3-things)
- [Elapsed time is BUSINESS hours, and ONE pure core computes it (operator 2026-08-31)](#operator-elapsed-time-is-business-hours-and-one-pure-core-computes-it)
- [Inter-department request tracking (`DeptRequests` / Part B)](#operator-inter-department-request-tracking-deptrequests-part-b)
- [External fillable-form links must be the canonical anonymous `/exec` URL](#operator-external-fillable-form-links-must-be-the-canonical-anonymous)
- [External anonymous web-app access is BLOCKED by Workspace admin policy on this domain — the `?form=<token>` fillable-form route is non-functional for external recipients](#operator-external-anonymous-web-app-access-is-blocked-by-workspace-ad)
- [`Employees` sheet column K = `PtoEnabled`](#operator-employees-sheet-column-k-ptoenabled)
- [Onboarding a NEW team member no longer needs a hand-edit of the Employees sheet (2026-08-07)](#operator-onboarding-a-new-team-member-no-longer-needs-a-hand-edit-of)
- [Daily automation triggers](#operator-daily-automation-triggers)
- [Call-notes retention is OFF by default](#operator-call-notes-retention-is-off-by-default)
- [Call-notes cold-archive is the SAFE retention tier (also OFF by default)](#operator-call-notes-cold-archive-is-the-safe-retention-tier-also-off)
- [Call-notes 3rd-tier cold-store purge (also OFF by default)](#operator-call-notes-3rd-tier-cold-store-purge-also-off-by-default)
- [Include-archive search](#operator-include-archive-search)
- [Admin "Retention" panel (Config sub-tab)](#operator-admin-retention-panel-config-sub-tab)
- [Form-data retention is OFF by default](#operator-form-data-retention-is-off-by-default)
- [Forms PHI store — set `FORMS_SS_ID` to segregate (forms-hardening)](#operator-forms-phi-store-set-forms-ss-id-to-segregate-forms-hardening)
- [`FORM_CONSENT_VERSION` in CONFIG](#operator-form-consent-version-in-config)
- [`MANAGER_TIMEZONE`](#operator-manager-timezone)
- [Timezone model — three distinct concepts, don't conflate them](#operator-timezone-model-three-distinct-concepts-don-t-conflate-them)
- [`CONFIG.COVERAGE_MIN_STAFF`](#operator-config-coverage-min-staff)
- [`CONFIG.KB.REVIEW_DUE_DAYS`](#operator-config-kb-review-due-days)
- [`CONFIG.SHIFT_SCHEDULE`](#operator-config-shift-schedule)
- [`Employees` sheet column L = `CallNotesSheetId`](#operator-employees-sheet-column-l-callnotessheetid)
- [`Employees` sheet column M = `ManagerEmail`](#operator-employees-sheet-column-m-manageremail)
- [`Employees` sheet column N = `Departments`](#operator-employees-sheet-column-n-departments)
- [`Employees` sheet column O = `Schedule`](#operator-employees-sheet-column-o-schedule)
- [Script Property `CDR_QUEUE_GROUPS`](#operator-script-property-cdr-queue-groups)
- [Script Property `DR_SLA_TARGETS`](#operator-script-property-dr-sla-targets)
- [Set Script Property `HR_DOCS_SS_ID`](#operator-set-script-property-hr-docs-ss-id)
- [`Employees` sheet column P = `PayRate`](#operator-employees-sheet-column-p-payrate)
- [`Employees` sheet column Q = `PtoAccrual`](#operator-employees-sheet-column-q-ptoaccrual)
- [`CONFIG.PTO_ACCRUAL_BASIS_HOURS` (80) + `CONFIG.PTO_HOURS_PER_DAY` (8)](#operator-config-pto-accrual-basis-hours-80-config-pto-hours-per-day-8)
- [`Employees` sheet column R = `AccruedThrough`](#operator-employees-sheet-column-r-accruedthrough)
- [`ROSTER_CACHE_KEY` = `'employee_roster_v11'`](#operator-roster-cache-key-employee-roster-v11)
- [Call-notes department list + state tax rates](#operator-call-notes-department-list-state-tax-rates)
- [Script Property `CN_ARCHIVED_TAGS`](#operator-script-property-cn-archived-tags)
- [Script Property `CN_EMAIL_TEMPLATES`](#operator-script-property-cn-email-templates)
- [Script Property `CN_EXTERNAL_LINKS`](#operator-script-property-cn-external-links)
- [Script Property `CN_FEATURE_FLAGS`](#operator-script-property-cn-feature-flags)
- [Script Property `AUTOMATION_DIGEST_LAST_RUNS`](#operator-script-property-automation-digest-last-runs)
- [Consolidated manager daily brief is OFF by default (INV-151)](#operator-consolidated-manager-daily-brief-is-off-by-default-inv-151)
- [`ClientErrors` sheet tab](#operator-clienterrors-sheet-tab)
- [`ViewUsage` sheet tab](#operator-viewusage-sheet-tab)
- [Script Property `WHATSNEW_KB_ID`](#operator-script-property-whatsnew-kb-id)
- [Script Property `MAIL_BCC_ALL`](#operator-script-property-mail-bcc-all)
- [Script Property `REP_SENDER_FROM`](#operator-script-property-rep-sender-from)
- [Timesheet cold-archive is OFF by default (INV-153)](#operator-timesheet-cold-archive-is-off-by-default-inv-153)
- [Call-notes EOD + weekly digest knobs](#operator-call-notes-eod-weekly-digest-knobs)
- [`CONFIG.CALL_NOTES.VOICE_INPUT_ENABLED`](#operator-config-call-notes-voice-input-enabled)
- [`FormTokens` and `FormSubmissions` sheet tabs](#operator-formtokens-and-formsubmissions-sheet-tabs)
- [`PunchAdjustRequests` sheet tab (#4a)](#operator-punchadjustrequests-sheet-tab-4a)
- [Form catalog](#operator-form-catalog)

Documented ONLY in the operator log, because the round that introduced them is
the only place they are explained — all three are operator-settable, so they are
named here so the checklist is complete:

- `QA_AUDIT_TARGET_PER_PERIOD` — sampled calls per employee per QA audit period
  (CONFIG seed 3; Script Property overrides 1..50; unset is fine) —
  [design handoff PR 5](docs/operator-log.md)
- `QA_SCORECARD_CRITERIA` — the QA rubric; seeded in CONFIG, overridable by the
  same-named property, and edited in-app at Manage → Admin → Config → QA
  scorecard criteria — [the 2026-08-27 and 2026-09-04 rounds](docs/operator-log.md)
- `CN_AUTO_TAG_RULES` — auto-managed; written by Manage → Admin → Config →
  Auto-tag rules, seeded from `CONFIG.AUTO_TAG_RULES` —
  [the 2026-08-13 operator round](docs/operator-log.md)

<a id="operator-blue-green-a-personal-dev-instance-alongside-the-team-s-prod"></a>
- **Blue-green (a personal dev instance alongside the team's prod) — see
  `docs/deployment.md`.** Run TWO Apps Script projects from the SAME repo source:
  PROD (the committed `web-app/.clasp.json` scriptId, `ANYONE_ANONYMOUS`, real
  sheets) and a personal DEV project (`web-app/.clasp.dev.json`, gitignored;
  access "Only myself"; the `/dev` HEAD URL so every push is instantly live;
  Script Properties → COPY sheets + your-inbox recipients; PHI stores start
  EMPTY). `npm run push:dev` / `push:prod` (via `scripts/push-env.sh`) target
  each; `push:dev` restores the committed prod `.clasp.json` so a bare
  `clasp push` still hits prod. **Two Script Properties tag an instance —
  both UNSET on prod = zero behavior change:** `INSTANCE_LABEL`
  (e.g. `DEV`) renders a top banner (`getEmployeeState.instanceLabel` →
  `.instance-banner`) so the two tabs can't be confused; `INSTANCE_IS_PROD`
  (`true` on prod) makes the destructive `TEST_`-row writers (`runAllTests` /
  `setupTestEnvironment`) REFUSE via `assertNotProdInstance_`.
  **A5 (cycle 13) — DEV NOW REQUIRES BOTH, and `INSTANCE_IS_PROD` must be
  EXPLICITLY `false` on the dev project.** `isDevInstance_()` is the single
  predicate (`assertDevInstance_` and `runNightlySelfTest` both route through
  it), and an UNSET `INSTANCE_IS_PROD` now resolves to NOT-dev. The old test was
  "label set AND not `isProdInstance_()`", and `isProdInstance_()` is false
  whenever the property is unset — which is prod's DEFAULT state. So dev-ness
  was inferred from the mere PRESENCE of a banner label, and labelling prod (a
  thing this very paragraph recommends) silently flipped prod into dev:
  `runNightlySelfTest` would run the FULL destructive `runAllTests` against live
  payroll/audit/PHI every night at 1am (`assertNotProdInstance_` does NOT catch
  it — that only fires on `INSTANCE_IS_PROD === 'true'`), and `devScrubRoster_`
  would anonymize the LIVE roster. Failure direction is now "a dev tool refuses
  until dev is fully configured" instead of "prod quietly behaves like dev".
  **Operator action on an EXISTING dev project: add `INSTANCE_IS_PROD=false`**,
  or `devScrubRoster_`/`devShowConfig_` will refuse and the nightly run will
  drop to smoke — which it now SAYS, via a note on the Admin → Automation
  Health self-test line rather than silently. Dev-only tooling
  (`web-app/DevTools.js`: `devScrubRoster_(keeperEmail)` anonymizes a copied
  roster so dev's per-employee emails can't reach real staff; `devShowConfig_()`)
  is `assertDevInstance_`-guarded so it can never mutate the live roster even
  though it deploys to both. Pinned by the instance-guard Node tests (incl. the
  A5 "a LABEL alone is NOT dev" case) + the DEV-banner DOM test. Deploy: the
  same `clasp push -f` + New version; prod is unaffected until you set them.
<a id="operator-the-timesheet-timezone-repair-operator-2026-09-02-the-ph-ros"></a>
- **The Timesheet timezone REPAIR (operator 2026-09-02 — the PH roster flip
  done mid-shift).** Flipping a roster `Timezone` cell changes how EXISTING
  Timesheet rows are READ, not what they hold: every punch was stamped as the
  rep's local date + wall time at the moment it was recorded, so a CST shift
  worked under `Asia/Manila` sits in the sheet as ClockIn on date D at 21:30
  and ClockOut on D+1 at 06:00 — read as Chicago digits, BOTH halves are
  incomplete days (excluded from totals, pay statements, the team calendar and
  the accrual). `repairTimesheetTimezone(opts)` (editor-run, MANAGER_EMAILS
  gate, DRY-RUN BY DEFAULT) re-formats each stored instant in the new zone so
  a split shift collapses onto one date; `flippedAt` (the new-zone wall time
  the cell was changed) is REQUIRED so post-flip punches are never shifted
  twice; it reads through `TimesheetArchive`, writes only the DATE + TIME
  cells in place (COMMENTS' `ADJ-` marker survives), is bounded
  (`TZ_REPAIR_MAX_ROWS`), locked on apply, re-points the personal-sheet
  mirror best-effort, and writes one counts-only `TimesheetTzRepair` audit row
  per employee. **The dry run's collision lines are the review step:** a row
  landing on a (date, type) another row holds is a hand edit made after the
  flip or a double punch across the old midnight — the tool REPORTS it and the
  manager decides which punch is real. **APPLIED 2026-09-03** (Anne Garcia + Margie Ingay, Manila → Chicago,
  flippedAt 2026-09-02 15:00): 14 rows moved, one post-flip row correctly
  skipped, and the eight collision warnings were four SELF-colliding pairs —
  a real morning clock-in plus a spurious ~noon-CST clock-in on 08-28,
  08-31 (both agents) and 09-02, the midnight-PHT bug's fingerprint (the
  agent pressed the only button the split day offered, at what was Lunch Out
  time); those days also lack lunch pairs, and 08-27/08-28 lack clock-outs
  entirely. Fix path is Day Edit with the MORNING time (the sheet doctor
  would collapse to the LAST row, i.e. the noon one). The one-time constant
  + wrappers were deleted afterwards; the tool itself stays, called with an
  opts object.** RUN ORDER: dry run BEFORE hand-editing today's rows (a
  hand-corrected 08:30 would be read as Manila digits and moved to the wrong
  day); then apply; then fix any reported duplicates in Day Edit. Two knock-ons
  the repair does NOT do: the August accrual already ran against the split
  days (top up by hand from the pay statement's corrected hours vs the
  `PtoAccrualCredit` row's `hoursWorked=` — never backdate column R, credits
  are deltas), and any ADP export cut while the rows were split is short those
  shifts (re-export). Call-note `DateLocal` stamps are left alone (cosmetic).
  Pinned by TZR-1 (planner behavioural) + TZR-2 (gate / dry-run default /
  bounded / locked / in-place / audited / collisions reported). **The
  operator's first dry run (2026-09-03) died on a NULL sheet — the roster read
  said `CONFIG.EMPLOYEES_TAB` where the declared key is `EMPLOYEE_TAB`, and a
  misspelled CONFIG key reads as `undefined` rather than throwing, so
  `getSheetByName(undefined)` handed back null.** The F1 tripwire checks
  declared → read; nothing checked read → declared. `F1-inverse` now does
  (every `CONFIG.<KEY>` read across the web-app tree names a declared
  top-level key); its first run found exactly this one. **The Day Edit
  follow-ups are now an editor-run tool too (operator 2026-09-03 — "can those
  changes not be done via Apps Script function?"): `repairSplitDayPunches(opts)`.**
  The duplicate clock-ins are DETERMINISTIC — the later ClockIn on a date is
  always the midnight-PHT re-clock — so the tool keeps the EARLIEST, deletes
  the rest bottom-up, re-points the personal-sheet mirror at the kept time
  (the tz repair's last mirror write was the noon row), and writes ONE
  `PunchDelete` audit row per removed row naming the kept time. ClockIn ONLY:
  any other duplicate pair (or an unparseable time) is NAMED in the result and
  left alone (INV-187). The `adds` list is the second half — the lunch and
  clock-out punches the agents confirm for 08-27/08-28 and the four dates —
  each validated BEFORE the dry-run return (date inside the window, HH:mm, a
  real punch type, one roster target, not a duplicate group in the same run)
  and written through `writeAdjustPunchForEmployee_`, the manager-approval
  writer (ADJ- row + mirror + audit, caller as actor). Adds run BEFORE deletes
  inside the lock so the row indices from the ONE Timesheet read stay valid.
  Dry-run by default; MANAGER_EMAILS gate; live tab only. Editor use:
  `repairSplitDayPunches({ employees: ['Anne Garcia','Margie Ingay'], from: '2026-08-27', to: '2026-09-02' })`,
  read the log, then the same with `dryRun: false` and
  `adds: [{ employee: 'Anne Garcia', date: '2026-08-27', type: 'ClockOut', time: '17:00' }, …]`.
  **The editor's ▶ button passes NO arguments, so a bare call refuses (the
  operator hit exactly this on 2026-09-03)** — a one-time
  `SPLIT_REPAIR_2026_09_03` constant + `_dryRun/_apply` wrappers carried the
  opts for that run; the repair was applied, the missing punches were entered
  by hand in Day Edit, and all three were DELETED on 2026-09-04 (the tz-repair
  precedent). The tool itself stays, called with an opts object.
  Target resolution moved into the shared `tzRepairResolveTargets_` so the two
  tools cannot resolve a name differently. Pinned by TZR-3 (planner) + TZR-4
  (contract; the add guards asserted LIVE, not just worded — a `if (false)`
  beside the message passed the first draft).
<a id="operator-the-qa-module-phase-1-operator-2026-08-27-needs-three-script"></a>
- **The QA module Phase 1 (operator 2026-08-27) needs THREE Script Properties
  and one Drive folder before it does anything.** Setup: (1) create a FRESH
  dedicated spreadsheet and set **`QA_SS_ID`** to its id (never point it at an
  existing store — recordings and review comments plausibly reference agents
  AND patients, and there is deliberately NO fallback: unset = a friendly
  not-configured screen, nothing breaks); (2) create (or pick) the Drive
  folder recordings get dropped into, share it with the DEPLOYING account
  (edit not required — read is enough), and set **`QA_RECORDINGS_FOLDER_ID`**
  to its id; (3) set **`QA_MEMBERS`** to a comma-separated list of the QA
  rep(s)' emails — managers see the tool without a listing; an EMPTY list =
  managers only; since operator testing note 8 (2026-09-10) the list is edited
  IN-APP at Manage → Admin → Config → **QA reviewers** and the property is only
  the store. Agents saw nothing in v1; Phase 3 briefly gave every rep a
  read-only My Reviews tab, and the operator hid it again the next day —
  the QA tool is currently invisible to non-QA reps (the registry comment
  says how to re-open it). Workflow: drop
  audio files in the folder → QA → Recordings → **Sync from Drive** (manual,
  idempotent — re-running never duplicates; non-audio files are skipped and
  counted; a >500-file scan says it was capped and a second Sync continues).
  Playback streams through the app in chunks; a recording over ~40 MB is
  refused with an "Open in Drive" link instead (Drive streams it natively).
  Timestamped comments anchor to the playback position — click a timestamp or
  a timeline marker to jump there; authors (and managers) can remove them.
  The two QA tabs auto-provision on first touch; no triggers, no migrations,
  no new OAuth scopes (DriveApp is already authorized). **Post-deploy: run
  `runAllTests()`** — it adds the new `qa_gates_rejectNonMember`
  case — then drop one recording in the folder, Sync, play it, and leave a
  comment at a timestamp.
<a id="operator-set-script-property-adp-ss-id"></a>
- **Set Script Property `ADP_SS_ID`** to the real spreadsheet ID in
  Apps Script editor → Project Settings → Script Properties. Without
  it, `getAdpSS_()` falls back to the inert `'YOUR_ADP_SPREADSHEET_ID'`
  placeholder in CONFIG and fails on first sheet open.
<a id="operator-set-script-property-cdr-ss-id"></a>
- **Set Script Property `CDR_SS_ID`** to the CDR Report spreadsheet
  ID (the same spreadsheet backing the `call-data-reporting`
  Department Dashboard). `getCdrSS_()` reads this before CONFIG.
  Without it, the Metrics tool and the shift-stats CDR enrichment
  will show "No call data found" or gracefully degrade (the CDR
  overlay in `managerGetShiftStats` is best-effort). The deployer
  account must have at least Viewer access to this spreadsheet.
  The CDR spreadsheet's `Agent Alias Overrides` sheet (if present)
  is read by `getCdrNameMap_()` to resolve name mismatches between
  the team-tools Employees roster and CDR canonical names.
  The My Stats **Transfer %** trend additionally reads a
  **`CSR Transfer Historical Data`** tab in this same spreadsheet
  (headers A1:S1: Month-Year, Week, Date `M/D/YYYY`, CSR Rep Name,
  Transfer %, Total Calls, Total Calls Transferred, per-queue `A_Q_*`,
  Comments — read via `getCsrTransferPerRepDaily_`). Missing tab → the
  Transfer trend is simply absent (other KPIs unaffected). Since cycle 11
  (L-2) the tab's header layout is VALIDATED like the DQE tab's
  (`validateCsrTransferColumns_` against `CSR_TRANSFER_EXPECTED_HEADERS`,
  once per session, advisory): a column insert/reorder in the
  `call-data-reporting` repo now surfaces as "Column drift in CSR Transfer
  Historical Data" in Admin → Automation Health (`cdr.transferColumnWarning`)
  instead of silently feeding wrong cells into the Transfer KPI.
<a id="operator-script-property-test-cdr-ss-id"></a>
- **Script Property `TEST_CDR_SS_ID`** (test-only, auto-managed). The
  CDR fixture spreadsheet `setupTestEnvironment` / `_setupTestCdrFixture_`
  creates (or reuses) for the Metrics integration tests. Created on
  first `runAllTests`; not used in production. Documented here so it's
  recognizable when inspecting Script Properties.
<a id="operator-set-script-property-intake-ss-id"></a>
- **Set Script Property `INTAKE_SS_ID`** to the Intake spreadsheet ID
  (the one Robin already used for the bound form-generator). `getIntakeSS_()`
  reads it before CONFIG; without it the Intake tool fails on first form
  preview/send. The deployer account must have **edit** access (it provisions
  submission tabs and reads Offerings). That spreadsheet must contain:
  (a) an **`Offerings` tab** with columns **A–F = features, HCPCS,
  weight-capacity (`"300"` or `"300-450"`), seatType (text containing `s`
  for solid / `c` for captain), pdfLink, imageUrl** — the PPD engine reads
  `A2:F` via `getIntakeOfferings_()`; a column-order change silently breaks
  recommendations. **Columns E (pdfLink) + F (imageUrl) must be populated with
  real URLs** (e.g. the brochure-PDF + device-image URLs from the marketing/image
  repo) — the PPD result cards make the device IMAGE clickable/openable (agent
  copies/saves it to text the patient, via `intakeCopyImage_` / `intakeCopyLink_`)
  and the HCPCS **code a link to the brochure** (pdfLink); blank E/F → no
  image/brochure shows. "Real URLs" means **`http(s)://`-schemed** — every sink
  (rec cards, sent email, Catalog tab) scheme-whitelists these columns via
  `intakeHttpOnly_`, so a schemeless `www.x.com` (or a `javascript:` value)
  silently renders no link anywhere; since the round-1 follow-ons (2026-08-24)
  `intakeCatalogIssues_` WARNS on such a non-blank cell in the Automation
  Health "Intake Offerings catalog" card, naming the row + the `https://` fix
  (a healthy catalog still reads zero issues, INV-186).
  **Column C (weight capacity) is now LOAD-BEARING in a
  way it was not before cycle-16 F9: a blank or non-numeric cell EXCLUDES that
  row for every patient with a recorded weight.** It previously read as
  UNLIMITED capacity (the `parseInt('') → NaN` fail-open), so a half-filled row
  was recommended to everyone; it now fails closed. Accepted forms are a flat
  cap (`"300"`) or an ASCII range (`"300-450"`) — note **ASCII hyphen only**, an
  EN dash makes `"300–450"` read as a flat 300 cap. **Admin → Automation Health
  → "Intake Offerings catalog" lists every offending sheet row**, so after a
  catalog edit that panel is the check; a well-formed catalog reports "all
  well-formed". **To RETIRE a row, delete it or clear its column-B HCPCS — an
  empty B is the only state the engine treats as inert.** A row you think of as
  scratch or "an exception" is a live catalog member as long as it carries an
  HCPCS, and blanking only its capacity is NOT a retirement: that is the
  fail-closed path, which suppresses the row for patients with a recorded weight
  while leaving it eligible whenever Q38 is blank. (The cycle-16 F9 check found
  exactly this: one `E1161` row, capacity blank, that the operator did not
  consider a product.) The `PPDSubmissions` / `PMDSubmissions` / `PAPSubmissions`
  PHI tabs auto-provision on first send (`getIntakeSubmissionSheet_`).
<a id="operator-intake-recipient-addresses-are-script-property-backed"></a>
- **Intake recipient addresses are Script-Property-backed.**
  `INTAKE_SALES_EMAIL` (PMD default), `INTAKE_SLEEP_EMAIL` (PAP default),
  `INTAKE_BCC_EMAIL` (BCC on every intake email), and
  `INTAKE_ALL_AGENTS_EMAIL` (PPD "All Agents") read Script Properties first,
  falling back to the placeholders in `CONFIG.INTAKE`. Agent recipients are
  resolved from the Employees roster (name→email at send via
  `intakeResolveRecipient_`), so agent addresses never reach the client and
  no domain is hardcoded. Set the four addresses once; no redeploy.
<a id="operator-script-property-test-intake-ss-id"></a>
- **Script Property `TEST_INTAKE_SS_ID`** (test-only, auto-managed). The
  Intake fixture spreadsheet `setupTestEnvironment` / `_setupTestIntakeFixture_`
  creates (or reuses) for the Intake endpoint integration tests — an
  `Offerings` tab with two catalog rows (K0823 captain + K0861 Group-3
  solid). `getIntakeSS_()` honors the `_TEST_OVERRIDE_INTAKE_SS_ID` global
  (set via `_withTestIntake_`, which also resets the per-execution
  `_intakeOfferingsCache`); the pure engine tests need no spreadsheet.
  Created on first `runAllTests`; not used in production. Documented here
  so it's recognizable when inspecting Script Properties.
<a id="operator-set-script-property-kb-ss-id"></a>
- **Set Script Property `KB_SS_ID`** to a dedicated Knowledge-Base spreadsheet
  for the Reference tool (`getKbSS_()` reads it before `CONFIG.KB.SS_ID`). The
  `KB` tab auto-provisions on first use (`getOrCreateKbSheet_`, headers
  `KB_HEADERS`). The deploying account needs **edit** access; reps never open it
  (they read via `getReferenceTree`/`getReferenceItem`/`searchReference`). Keep
  it a **separate** spreadsheet from the PHI intake/forms sheets — the KB is
  broadly rep-readable and PHI-free by policy. (`_TEST_OVERRIDE_KB_SS_ID` is the
  test override.) A **`KbViews` tab** also auto-provisions in this spreadsheet
  on the first article open (`getOrCreateKbViewsSheet_`) — the append-only,
  PHI-free usage log behind the manager "Most referenced · 30d" block
  (INV-117). It grows one tiny row per open with no purge yet; the stats scan
  is bounded (last 4000 rows) so growth never slows reads — trim it manually
  if it ever bothers you.
<a id="operator-script-property-kb-images-folder-id"></a>
- **Script Property `KB_IMAGES_FOLDER_ID`** (auto-managed, Phase 2b). The
  deployer-owned "KB Images" Drive folder that converted-article images
  export into on save. Auto-provisioned on the first image-bearing save:
  created in the deployer's Drive, set domain-link-viewable (so `<img>`
  tags render for any signed-in rep), id stored here. If Workspace policy
  blocks link sharing, the create still succeeds with a console warning —
  and since the 2026-08-13 image fallback the readers recover on their own:
  a blocked thumbnail is refetched through the server (`kbGetImageData`,
  scoped to THIS folder only) and rendered as a data URL, so sharing the
  folder manually is now an optimization (direct thumbnail loads), not a
  requirement. Exported files are named
  `kbdoc-<fileId>-<n>` and are REUSED on re-save; delete a file to force a
  re-export after the source Doc's image changed. Phase 3 paste-uploads
  land in the same folder as `kbpaste-<stamp>-<rand>` files (orphans from
  never-saved pastes accumulate — trim manually). The first export also
  adds the Drive OAuth scope alongside the Docs scope — the deploying
  account may be prompted to re-authorize once. **THAT PROMPT IS NOT
  OPTIONAL, and on this deployment it has never been accepted: as of
  2026-09-09 the property is UNSET** — the folder has never been created, so
  every article image has been a placeholder and the 2026-08-13
  `kbGetImageData` fallback has been inert (it returns 'Not available.' with
  no folder id to scope against). The fix is not a code change: open the
  Apps Script editor as the DEPLOYING account, run any function, and accept
  the Drive permission — Apps Script prompts against the whole project's
  scope set, so any function will do, and a `clasp push` + New version never
  prompts. Three outcomes tell you which problem you have: the screen
  appears and you accept (it was only a missing re-consent); it appears with
  per-permission CHECKBOXES and Drive unticked (Google's granular consent —
  tick it); or Google refuses ("Access blocked", "your admin has
  restricted"), which is the one case that is genuinely a Workspace policy
  block, and you then have the exact scope name to give IT. Admin → System →
  Storage inventory reports which of these you are in (INV-197).
<a id="operator-script-property-kb-search-synonyms"></a>
- **Script Property `KB_SEARCH_SYNONYMS`** (auto-managed, #8). JSON array of
  ≥2-term lowercase synonym groups (e.g. `[["cpap","pap"],["pmd","power chair"]]`)
  that expand Reference search recall (`kbExpandSynonymTokens_`). Edited via the
  admin-only "Synonyms" modal in the Reference tree header (`kbSaveSearchConfig`,
  admin-gated, `AdminConfigChange` audit); created on first save, read by
  `getKbSearchSynonyms_` (sanitize-on-read → corrupt blob degrades to `[]`). No
  manual setup — unset = no expansion (today's behavior). Documented so it's
  recognizable when inspecting Script Properties.
<a id="operator-quiz-import-from-google-forms-requires-the-google-forms-oaut"></a>
- **Quiz import from Google Forms requires the Google Forms OAuth scope.**
  `importQuizFromForm` (Team Training → New quiz → "Import from Google
  Forms") is the project's first `FormApp` call, so the deploy that ships it
  adds the `forms` scope to the auto-detected set. The DEPLOYING account must
  re-authorize once (the editor prompts on the next run / deploy — accept the
  new scope) AND must have at least view access to any form it imports
  (FormApp opens it with the deployer's access, same trust boundary as the
  Doc converter). It reads MULTIPLE_CHOICE + single-answer CHECKBOX items and
  their marked correct answers; other item types are skipped with a warning.
  READ-ONLY + review-before-save — the form is never modified and nothing
  persists until the manager clicks Save quiz. Paste the form's EDIT url
  (`/forms/d/<id>/edit`); the published `/forms/d/e/<id>/viewform` link is
  rejected with a hint (its id is the response endpoint, not openable).
<a id="operator-kb-phase-2-converter-requires-the-google-docs-oauth-scope"></a>
- **KB Phase 2 converter requires the Google Docs OAuth scope.**
  `kbConvertDriveDoc` is the project's first `DocumentApp` call, so the deploy
  that ships it adds the `documents` scope to the auto-detected scope set. The
  DEPLOYING account must re-authorize once (the editor prompts on the next run
  / deploy — accept the new scope) or every conversion fails with an auth
  error. The converter reads Docs with the deployer's access, the same trust
  boundary as embedding them.
<a id="operator-set-script-property-kb-ai-api-key-to-enable-the-kb-ai-guidan"></a>
- **Set Script Property `KB_AI_API_KEY` to enable the KB AI guidance card
  (Phase A).** An Anthropic API key (console.anthropic.com); without it,
  `kbGetFacetGuidance` silently returns `{none}` even with the `kbAiGuidance`
  feature flag on. The key is deliberately NOT settable or readable through
  any endpoint — editor-only, same posture as `ADP_SS_ID`. Also set a **hard
  spend cap in the Anthropic console** as the backstop behind the app's soft
  daily cap. Then flip the `kbAiGuidance` feature toggle (Admin tab; default
  OFF, danger confirm names the external vendor) — INV-119 documents the
  privacy boundary (whitelisted enum facets + own KB excerpts only).
<a id="operator-script-properties-kb-ai-daily-cap-kb-ai-model"></a>
- **Script Properties `KB_AI_DAILY_CAP` / `KB_AI_MODEL`** (Admin-managed).
  Written by the Call Notes → Admin → "AI Guidance (Reference)" section
  (`saveKbAiSettings`, manager-gated). Defaults when unset: $3/day org-wide,
  `claude-haiku-4-5`. The model must be a `KB_AI_MODEL_PRICES` key (Code.js)
  so spend accounting always has real rates — adding a new model option means
  adding its $/MTok rates there and redeploying.
<a id="operator-script-properties-kb-ai-generation-kb-ai-spend"></a>
- **Script Properties `KB_AI_GENERATION` / `KB_AI_SPEND`** (auto-managed).
  The guidance-cache generation salt (bumped by every KB save/delete via
  `invalidateKbCache_`) and the `{date, usd, calls}` daily spend counter.
  No manual setup — documented so they're recognizable when inspecting
  Script Properties. Delete `KB_AI_SPEND` to reset today's budget; bump
  `KB_AI_GENERATION` to force-invalidate all cached guidance.
<a id="operator-script-property-kb-map-geocode-cache"></a>
- **Script Property `KB_MAP_GEOCODE_CACHE`** (auto-managed — the ` ```map `
  warehouse block, operator 2026-08-13). JSON map of warehouse coordinates
  keyed by an ADDRESS HASH, written best-effort by `kbMapDistances` so the
  free built-in geocoder is called ~once per warehouse ever (steady-state
  quota: one geocode per rep lookup, for the query itself). Contains ONLY
  the operator-authored warehouse addresses' lat/lng — never a rep's lookup
  query (a looked-up address may be a patient's; the query is deliberately
  never persisted anywhere). Delete the property to force re-geocoding after
  a warehouse address changes meaning (e.g. the geocoder had it wrong);
  over `KB_MAP_GEOCODE_CACHE_MAX` (200) entries it self-resets to the
  current article's warehouses. No manual setup.
<a id="operator-cdr-alert-threshold"></a>
- **`CDR_ALERT_THRESHOLD`** in CONFIG (default 85) sets the
  % Answered cutoff for the Metrics sidebar alert badge. Below
  this value, `getMetricsAmbient()` returns a warn badge showing
  yesterday's team answer rate. **Since the 2026-08-06 operator #4 batch it
  is ALSO shipped to the Metrics clients** (`alertThreshold` on
  `getMyMetrics`/`getMyMetricsRange`/`getTeamMetrics`): it draws the dashed
  target line on both hero sparklines and starts the team table's GREEN
  band — so changing it moves the in-page target AND the banding, not just
  the badge. CONFIG-only (no Script Property equivalent yet); changing it
  requires a redeploy.
<a id="operator-set-script-property-manager-emails"></a>
- **Set Script Property `MANAGER_EMAILS`** to a comma-separated list
  (e.g. `alice@umsupply.com,bob@umsupply.com`). `getManagerEmails_()`
  reads this before CONFIG; without it, no one passes the
  `isManager` check and manager features stay locked out.
<a id="operator-script-property-admin-emails"></a>
- **Script Property `ADMIN_EMAILS`** (optional) — comma-separated list of the
  above-manager **admin tier** (the Manage module's Admin tab). `getAdminEmails_()`
  reads it; **UNSET/empty falls back to `MANAGER_EMAILS`** so a fresh deploy never
  hides Admin from the deployer, and **SET narrows** Admin to exactly that list
  (admins are a SUBSET of managers — an admin always passes `isManager`). Drives
  `empState.isAdmin` → the `adminOnly` tab gate. **To restrict the Admin tab to
  just yourself, set `ADMIN_EMAILS=you@umsupply.com`** (otherwise every manager
  keeps Admin access). No redeploy needed to change it. This gates the Admin tab
  CLIENT-side AND the Admin-exclusive endpoints SERVER-side (`emp.isAdmin`,
  `'Admin access required.'` — INV-136 holds the machine-checked list). Because
  unset ⇒ admin == manager, a fresh deploy behaves exactly as before; setting it
  narrows both surfaces at once. Make sure YOUR email is in the list before
  setting it. **The test suite accommodates a SET list (operator 2026-09-11):**
  `setupTestEnvironment` appends its own manager fixture
  (`do-not-send-mgr@example.invalid`) to a real list for the run's duration and
  `cleanupTestData` strips every `@example.invalid` entry back out — the
  re-onboard/re-offboard symmetry the roster rows already have (INV-21), both
  sides reading the ONE predicate `_testAdminEmailsSplit_`. Before that, a
  narrowed list made every admin-tier call from the TEST manager read
  `Admin access required.` — ten failures, 302/312 on the 2026-09-11 post-push
  run, with no commit on any failing path — because the suite silently ASSUMED
  the property unset while this very entry invited setting it. A real address
  is never removed by the suite; you do NOT unset the property to run it.
<a id="operator-punctuality-tracking-manage-module-tab"></a>
- **Punctuality tracking (Manage module tab).** `getPunctualityReport(from,
  to)` (manager-gated, read-only, PHI-free) backs the managerOnly **Manage →
  Punctuality** tab (moved from Time Clock into the Manage module; tab key
  `punctuality` unchanged). Per rep over the range it compares the first `ClockIn`
  against the rep's scheduled start (`getShiftSchedule_(tz).startMin`, resolved in
  the rep's own tz) and flags a late start when it exceeds
  `CONFIG.PUNCTUALITY_GRACE_MIN` (default 5), plus a lunch-adherence pass;
  least-punctual reps sort first. CONFIG-only (`PUNCTUALITY_GRACE_MIN`; no Script
  Property) — redeploy to change. Reuses the per-tz shift (no per-rep schedule,
  the INV-127 limitation). **Design handoff PR 3 (2026-09-02) made it a
  DIAGNOSTIC surface rather than a ranked list, all ADDITIVE on the payload:**
  the range is capped at `CONFIG.PUNCT_MAX_RANGE_DAYS` (92 — the QTR preset
  fits; the endpoint was the one manager range read with no cap), the SAME
  Timesheet scan also buckets the PRIOR range of equal length (`prevFrom`/
  `prevTo`; per rep `prevDays`/`prevOnTime`/`prevOnTimePct`) so the summary
  strip shows a delta the manager did not have to compute, and each rep carries
  `worstDate`, four `weekly` buckets (oldest-first, clipped to the range —
  `punctWeeklyBuckets_`, pure) and a per-day `dayDetail` whose `state` comes
  from the pure `punctDayState_`: `ontime` / `late` / `off` (approved PTO from
  a best-effort TimeOffRequests read — `ptoUnavailable` when it fails, so a day
  off can only degrade to `nopunch`, never to `late`) / `holiday` /
  **`nopunch`** — the FIFTH state, which the handoff's four-state list lacked:
  a weekday with no ClockIn is DRAWN as an absence rather than left as a gap
  (INV-187 — a gap reads as "nothing to see"). Weekends are `null` and omitted.
  `days` stays the graded COUNT it always was, beside the new array. Client
  (`punctRender_`): a summary strip (team on-time % with the prior-range delta,
  late starts, worst rep + date), an **Outliers** panel that renders ONLY when
  `punctOutliers_` finds a rep under 75% on-time OR averaging more than 15
  minutes late (an empty panel would read as "no outliers" for the wrong reason
  — nothing renders instead), the shared `mtRenderTable_` with a real sort and
  an expandable per-rep detail row (the day strip with a summarising
  `aria-label`, the weekly trend chip from `punctTrend_` — Worsening / Flat /
  Improving at ±5 points across the first and last bucket — and a **Coach on
  this** button that parks `window.COACH_PREFILL` with a `what` narrative and
  `enterTool('develop', 'coaching')`, the C8 hint pattern; the composer's
  textarea prefills from it). The tri-tone band is `mtPctTone_(p, 90, 75)`.
  The handoff's Export button in the app-bar was NOT built (not in the plan's
  M1–M8) — a logged follow-on.
<a id="operator-coverage-planner-is-business-hours-weekday-scoped"></a>
- **Coverage planner is business-hours/weekday scoped.** `getCoveragePlan` now
  returns a per-day `closed` flag plus `businessStartHour` / `businessEndHour` /
  `weekdaysOnly`, driven by CONFIG `COVERAGE_BUSINESS_START_HOUR` (8) /
  `COVERAGE_BUSINESS_END_HOUR` (17) / `COVERAGE_WEEKDAYS_ONLY` (true). Understaffed
  flags fire only inside the business-hours window; weekends (when
  `weekdaysOnly`) render as closed rather than as understaffed. CONFIG-only —
  redeploy to change. Refines INV-127's flagging (the `< COVERAGE_MIN_STAFF`
  rule still applies, now only within business hours). **Since design handoff
  PR 3 (2026-09-02) the range control is the shared `mtDateRange_`** with
  FORWARD presets (This week / Next week / Next 2 weeks — a planner looks
  ahead, where Punctuality's presets look back), `COV_STATE` holding
  `from`/`to`/`customOpen`, the D5 midnight re-anchor of the DEFAULT range only,
  and the `Manage › Coverage` app-bar; the hand-rolled `cov-controls` row and
  `toneCol` are retired (INV-184).
<a id="operator-spanish-inbox-tracking-gmail-needs-3-things"></a>
- **Spanish-inbox tracking (Gmail) needs 3 things.** The Metrics → **Spanish
  Inbox** tab (`getSpanishInboxStats`, manager-gated, read-only, 5-min cached)
  scans the **deploying account's** Gmail for threads addressed to the group
  inbox and times first-inbound → first-reply-from-a-member — **in BUSINESS
  hours since 2026-08-31** (weekends, US holidays and after-hours excluded; the
  wall-clock figure rides alongside as the KPI sub-line and the per-card
  tooltip — see the business-hours Key Design Decision). To work:
  (1) the **deploying account must be a member** of the group
  `spanishcalls@universalmedsupply.com` (so its mailbox receives the threads);
  (2) set the bilingual member list — **since 2026-08-18 via Manage → Admin →
  Config → "Spanish bilingual members"** (`saveSpanishInboxMembers`,
  admin-gated INV-136, `AdminConfigChange` audit; validates email shape,
  lowercases + dedupes, caps 30; saving an EMPTY list danger-confirms), which
  writes Script Property **`SPANISH_INBOX_MEMBERS`** (a comma-separated list —
  still directly editable) — "resolved" = first reply from one of
  them (with no list it falls back to "first reply from anyone but the
  requester"). No cache flush is needed on a save: the stats cache key hashes
  the member set (`spanishCacheHash_`). **As of the Dashboard work this property ALSO GATES FEATURE
  ACCESS:** `canSeeSpanishInbox_(emp)` = `isManager OR email ∈
  SPANISH_INBOX_MEMBERS`, and the four Spanish endpoints now gate on THAT
  (not pure-manager — INV-31 amendment), so the bilingual reps get the full
  Spanish Inbox tab + dashboard card. **It must be populated** for Spanish reps
  to gain access (an empty property = managers only). The web app runs as the
  deployer, so a Spanish rep reads the deployer's Gmail through the server
  (they need no Gmail access of their own); (3) the deploy that ships `GmailApp` **adds the Gmail OAuth
  scope** (auto-detected — `appsscript.json` has no explicit `oauthScopes`), so
  the deployer **re-authorizes once** on the next deploy/run. The address
  defaults to `CONFIG.SPANISH_INBOX_ADDRESS` (Script Property
  `SPANISH_INBOX_ADDRESS` overrides). PHI-free: the tab returns counts +
  durations + requester email + age only — never subject/body. A scoping note +
  the "what else is possible" generalization live in
  `docs/spanish-inbox-tracking-scope.md`. **Manual mark-resolved (operator
  feedback 2026-07-09):** a member/manager can mark a pending request resolved
  from its task card (`resolveSpanishThread` — uiConfirm-guarded, no in-app
  un-resolve) for requests handled OUTSIDE the thread (phone/CRM); the record
  is the PHI-free append-only `SpanishManualResolved` tab (auto-provisioned on
  the ADP sheet — threadId/resolver/ms only), the Resolved list labels those
  "marked manually", and the 5-min-cached stats pick it up on their next
  refresh. **Part A — pending-as-tasks:**
  `getSpanishInboxPending(days)` (manager-gated, live-read, never stored beyond
  the request) returns the open/unresponded threads with `{threadId, requester,
  ageHours, subject, snippet, permalink}`; `getSpanishInboxThreadBody(threadId)`
  (scope-guarded — verifies the thread's first message is addressed to the inbox
  before returning a body slice) backs the per-card "Show full request" expand —
  since operator testing note 5 (2026-09-10) a real Expand ⇄ Collapse TOGGLE:
  the body is fetched ONCE and cached in `SPANISH_STATE.bodies[threadId]`,
  Collapse restores the snippet from the PAYLOAD with no RPC, and the open set
  (`SPANISH_STATE.expanded`) survives a list re-render, so a claim or a filter
  chip never closes a card someone is reading (scenario
  `spanish-expanded-light-wide`; DOM test A5).
  The body surfaces request content in-app (it may reference a patient/call), so
  it is deliberately manager-gated + live-read-only + "Open in Gmail" as the
  primary action — bodies are never written to a sheet or cache. **Combined
  view (operator feedback 2026-08-06):** the Spanish tab's separate
  Pending/Resolved sub-tabs were replaced by ONE color-coded list — All /
  Pending / Resolved filter chips over `.sp-task` status cards (pending
  oldest-first, then resolved), toned `st-pending` (amber) /
  `st-overdue` (red, pending > `SPANISH_OVERDUE_HOURS`=24 — a client
  constant) / `st-resolved` (green). The two RPCs fan in with seq-guarded
  state writes (INV-156); a failed half renders `errorStateHtml_` for that
  half only. The `.sp-task` card CSS is SHARED in `styles.html` (the Dept
  Requests page consumes the same vocabulary — INV-185-adjacent: one
  component, two views, no drift). Endpoints/gates unchanged.
  **Resolution-share chart (operator 2026-08-17):** between the KPI strip and
  the list, one accent bar per resolver over the already-fetched resolved
  list (count + % direct-labeled; manual mark-resolves attributed to the
  clicker; an `(unattributed)` bucket stays visible). `getSpanishInboxResolved`
  now ships `members` (the configured SPANISH_INBOX_MEMBERS, same gate) so a
  member who resolved NOTHING renders as a ZERO bar — the "completed equally"
  check is exactly about them. FACTS ONLY per the Coverage rule: no verdict
  tone (a member may be part-time; the judgement is the operator's); a dashed
  neutral marker shows the even-split share, and a capped scan is named. The
  pure `spanishResolverShares_` is Node-pinned.
  **Full-width + display cap (operator 2026-08-17, third round):** both
  request-tracking views widen to 1480px via the Dashboard `:has()` precedent
  (`.view-area:has(#spanish-body)` in the metrics partial;
  `.view-area:has(#dr-body)` in the DR partial — `drRender_` wraps BOTH
  branches in the `#dr-body` anchor so an error render keeps the width);
  `.sp-tasks` lost its 920px cap (the auto-fill grid reflows to up to 4-up),
  and Spanish's summary head + share chart sit side by side in the shared
  `.sp-top` 2-col grid (stacks <1024px — that breakpoint also covers the
  480px pop-out, so no `data-compact` override is owed; the SWR head-swap
  still targets only `#spanish-head`, which keeps its own slot in the grid).
  Every `.sp-tasks` card section on both pages renders through
  **`spCappedTasksHtml_`** (`script_core.html`): at most `SP_TASKS_CAP` (12)
  cards + a real Show-more `<button>` (INV-173) revealing `SP_TASKS_PAGE`
  (24) per click and stating the hidden count — the cap changes what is
  RENDERED, never what is REPORTED (INV-169: section headers keep the full
  counts). Per-section shown-state (`SPANISH_STATE.shown` / `DR_SHOWN`)
  resets on every full render / view enter so a stale expansion never pins a
  huge DOM in a long-lived window.
  **Claim / manager-assign on pending requests (pilot round 2, 2026-08-24):**
  a pending card carries a claim pill ("you" for the caller's own claim; the
  claimant's name + tooltip otherwise) and Claim / Release / manager-only
  Assign controls. Claims are ADVISORY — no locking of the underlying thread:
  an append-only PHI-free `SpanishClaims` tab on the ADP sheet (threadId +
  internal emails + ms NUMBER cells — the SpanishManualResolved posture;
  never subject/body), folded latest-wins by the pure `spanishClaimsFold_`
  (a `release` row clears; `assignedBy` recorded when actor ≠ claimant).
  Rules: any member self-claims; assigning someone ELSE is manager-only and
  the assignee must be a configured member; a non-manager cannot claim over
  another's live claim (the steal guard); release is claimant-or-manager and
  idempotent. Both endpoints gate on `canSeeSpanishInbox_` (the INV-31
  seven-endpoint set), are Gmail-scope-guarded like resolve, locked, and
  audit `SpanishInboxClaim` (threadId + claimant only).
  `getSpanishInboxPending` attaches `claim` per item + ships `members`/`self`
  (additive — the Dashboard Spanish card ignores them). Two agents claiming
  in the same second both succeed in sequence (latest wins; the earlier
  claimant sees the pill change on the next refresh) — accepted by design.
  **Auto-assign (operator testing note 4, 2026-09-10):** a MANAGER-only
  "Auto-assign N unclaimed" button beside the filter strip hands every
  unclaimed pending request (voicemails included) to the least-loaded configured
  member through `autoAssignSpanishThreads` — see INV-31 (iii) for the gate
  (MANAGER, not `canSeeSpanishInbox_`), the pure picker and the in-lock
  re-derivation. The button is disabled WITH ITS REASON while the list loads,
  when no members are configured, or when everything is already claimed; a
  confirm names the count and the members before ONE RPC and ONE re-render
  (the cards' claim pills and the button's count move together). The scheduled
  trigger the operator said "might follow" SHIPPED 2026-09-11 —
  `autoAssignSpanishThreadsScheduled` (trigger #21, hourly, business-hours
  gated, behind the `spanishAutoAssign` toggle, default OFF) calls the same
  `spanishAutoAssignCore_` unchanged; see the trigger list.
  **A_Q_Spanish VOICEMAILS in the pending list (operator 2026-08-25):** 8x8
  notifies individual MEMBER inboxes (never spanishcalls@) with subject
  "New voicemail from <caller> via A_Q_Spanish" from `no-reply@8x8.com`, so
  the deploying account's copy of those notifications is the proxy — the
  in-app scan beats Gmail forwarding (threading + the real From survive).
  `getSpanishInboxPending` runs a SECOND Gmail search (`spanishVmQuery_` —
  the quoted subject filter, embedded quotes stripped) and folds matching
  threads in as `kind: 'voicemail'` cards (info-toned VM pill via
  `spanishVmPillHtml_`; caller parsed by `spanishVmCaller_`; deduped
  against already-seen ids + the manual-resolved map; each thread's FIRST
  message is re-checked through `spanishVmMatch_` — exact-address sender +
  ci subject substring, BOTH required). VMs are **manual-resolve-only**:
  the resolved fold lists them from the manual map ONLY with
  `resolveMinutes: null` — a reply to a notification email is not a
  response time, so no fake duration ever enters the stats (INV-187).
  Gated entirely on the pair `SPANISH_VM_SENDER` (CONFIG default
  `no-reply@8x8.com`) + `SPANISH_VM_SUBJECT_FILTER` (default
  `via A_Q_Spanish`) — Script Properties override without a redeploy, and
  blanking EITHER property disables the whole VM path (both halves
  required). `spanishThreadInScope_` (inbox-addressed OR VM shape) now
  guards ThreadBody/resolve/claim so a member can expand/resolve/claim a
  VM card like any request; `vmTruncated` folds into the existing
  `truncated` note.
<a id="operator-elapsed-time-is-business-hours-and-one-pure-core-computes-it"></a>
- **Elapsed time is BUSINESS hours, and ONE pure core computes it (operator
  2026-08-31).** The operator asked whether the Spanish-inbox median counted
  weekends; it did. A Friday-afternoon request answered at Monday's open read
  as a **3-day reply**, which made the headline number describe the CALENDAR
  rather than the team — and the same arithmetic drove the Dept-Request SLA
  bands, so a request could go "overdue" purely by sitting through a weekend.
  `businessMinutesBetween_(startMs, endMs, tz?)` subtracts nights, weekends and
  US holidays, defaulting to **`CONFIG.MANAGER_TIMEZONE`** — the app's
  operating anchor, NOT `CONFIG.TIMEZONE` (the storage frame). It reuses the
  window the Coverage planner already owns (`COVERAGE_BUSINESS_START_HOUR` /
  `_END_HOUR` / `COVERAGE_WEEKDAYS_ONLY`, via `businessHours_()`) and
  `getUsHolidays_`, so "what counts as a working hour" has ONE definition
  across coverage bands and response times. **This is tractable only because of
  the ALL-CST policy** — every agent shares one business calendar, so there is
  a single frame to subtract against rather than a per-rep timezone question.
  Four properties are load-bearing:
   - **The core is PURE and takes pre-converted points.** `bizMinutesLocal_`
     takes `{date:'yyyy-MM-dd', min}` pairs already expressed in the business
     tz plus a holiday set, and walks days UTC-anchored — no `Utilities`
     dependency, which is what makes it Node-testable off-platform. The thin
     `bizPointInTz_` wrapper is the only part that touches Apps Script.
   - **Per-day overlap handles every clamp uniformly.** A start before the
     window opens counts from the open; a start after it closes contributes
     nothing that day; a weekend or holiday contributes nothing at all. A span
     lying wholly outside business hours legitimately yields **0** — that is a
     real answer ("nothing was owed during it"), distinct from `null`.
   - **`null` means UNKNOWN and is never substituted (the F8 rule).** A
     reversed pair, a corrupt stamp, an absurd span (bounded by
     `BIZ_MAX_SPAN_DAYS`=400, so a decade-old open request cannot spin the
     per-day loop through the execution budget), or an inverted window all
     yield `null`; the Spanish sample DROPS such a pair rather than pushing a
     0, and the SLA digest skips the row rather than nagging.
   - **Every surface that reports an elapsed time routes through the ONE
     wrapper.** `deptRequestsOverdueOpen_` (the daily SLA digest) previously
     aged requests with raw wall clock while the tracker displayed business
     minutes — two readers of one store, disagreeing about whether a request
     is overdue. Both call the helper now, and a pin bans a raw age from
     returning to the digest.
  **Where it shows:** the Spanish KPI strip leads with the business figure and
  keeps the wall-clock number as its sub-line (`avgBusinessMinutes` /
  `medianBusinessMinutes` / `businessCount` / `businessHours` are ADDITIVE, so
  an older client renders exactly as before, and an older SERVER makes the
  client fall back to wall clock as the headline); the per-thread resolved card
  shows business minutes with the calendar gap in its `title`
  (`resolveWallMinutes`); Dept Requests' `elapsedMin` IS the business figure
  (so `deptStats` avg/median follow with no extra wiring) with `elapsedWallMin`
  beside it and `slaBusiness: true` telling the client to say so. Both surfaces
  render a one-line note naming what is excluded — **an unexplained drop from
  "3d" to "2h" reads as a bug**, which is why the note is not optional.
  **Since operator testing notes 2/3 (2026-09-10) a MANUAL Spanish resolve and an
  IN-APP Dept Requests resolve are EXCLUDED from the sample on both surfaces and
  NAMED beside the timed count** — the Spanish strip reads "· N timed · M marked
  manually, not timed" and the Dept Requests median sub-line names the excluded
  in-app resolves (only the receiver's EMAIL-LINK resolve measures the
  department). A resolve stamp records when someone pressed a button, not when
  the requester was answered, so a duration built from it would be a
  substitute (INV-187). See INV-31 (ii) and INV-138.
  A MEASURED detail worth keeping: the Dept-Requests note had to live INSIDE
  the `#dr-kpi` wrapper, because `drRepaintKpi_` replaces that element's
  `outerHTML` on an in-place resolve and a note rendered as a SIBLING would
  stack another copy per patch — so the id moved off the `.telemetry` grid onto
  a wrapper around both.
<a id="operator-inter-department-request-tracking-deptrequests-part-b"></a>
- **Inter-department request tracking (`DeptRequests` / Part B).** Tracking is
  **AUTOMATIC**: every department email an agent sends from Call Notes
  (`emailFromCallNote`) auto-logs a `DeptRequests` row (PHI-free until operator
  testing note 6, 2026-09-10 — see the Store note below) AND appends a
  **"✓ Mark this request resolved"** link (`drResolveCtaHtml_`) to the SENT email
  body — added AFTER the INV-41 preview-hash check, so the hash contract is
  untouched. The row carries the dept label + the update CATEGORY only
  (`selections.updateInfo`) + the source `noteId` (col `NOTE_ID`, a back-compat
  trailing add); note CONTENT never enters it — since operator note 6 (2026-09-10)
  the capped patient & TRX (`PatientTrx`, col 13) DOES, by operator decision (see
  the Store note below). The
  auto-log is best-effort (try/catch, like the other post-send stamps — never
  fails the send). **Re-send dedup (A5):** before sending, `drFindOpenRequest_`
  (bounded tail, the `DR_MAX_SCAN` philosophy) looks up an OPEN row for this
  `(noteId, deptLabel)`; if found it REUSES that row's token in the SENT email's
  resolve CTA and SKIPS the append (the audit row is annotated `resend`), so
  re-sending the same note to the same dept re-notifies without opening a second
  request. Legacy rows (no `noteId`) never dedupe; the lookup failing-open mints a
  fresh token. **Two resolve paths:** (1) the receiver
  (internal `@umsupply.com`) clicks the email link → `doGet`'s `?resolve=`
  branch → `serveResolvePage_` → `markDeptRequestResolved_` (locked,
  **idempotent**; requires a signed-in `getActiveUserEmail_` so it's attributed);
  (2) the **sender or a manager** clicks "Mark resolved" in-app →
  `resolveDeptRequest(requestId)` (rep-callable, owner-or-manager-checked) — for
  when the recipient replied "done" without clicking. The surface is the
  rep-visible **Metrics → Dept Requests** tab (`metricsDeptReq` →
  `enterDeptRequestsView`, read-only list + resolve buttons): `getDeptRequests`
  (rep-callable) returns the caller's own requests (open/resolved + elapsed);
  managers ALSO get a per-department resolution-time aggregate (`deptStats`
  open/resolved/avg/median) + oldest-open team list. **Redesigned onto the
  Spanish Inbox vocabulary (operator feedback rounds 2–3, 2026-08-06):** a
  `.telemetry` KPI strip (Open / Overdue / Resolved / Median), All/Open/
  Resolved status chips + a MULTI-SELECT department chip bar (renders only
  when >1 dept in the data; empty selection = ALL departments — the default
  view; matching is per `drDeptsOf_` component so a multi-dept send matches
  ANY of its departments, the INV-138 `drSplitDepts_` shape; chips re-render
  from the cached payload — never a refetch), and combined color-coded
  `.sp-task` status cards (shared component in `styles.html`) toned by the
  existing per-dept SLA machinery: `st-resolved` green / `st-pending` amber /
  `st-atrisk` amber-deep / `st-overdue` red. Section counts read "N of M"
  when a dept filter is active; the INV-169 cap notes stay keyed to the
  UNFILTERED lengths (a filtered-out item is not a server-capped one). (The legacy standalone
  `sendDeptRequest` composer endpoint was REMOVED — it had no caller; auto-tracking
  replaced the manual compose tab.) **Store:**
  optional Script Property **`DEPT_REQUESTS_SS_ID`** (a dedicated sheet); falls
  back to the ADP sheet. **The store was PHI-free until 2026-09-10 (operator
  testing note 6):** the email BODY still never enters it and the row keeps its
  short `label`, but a trailing **`PatientTrx`** column (`DR.PATIENT_TRX:13`,
  `DR_HEADERS` 14 wide, header self-heals; capped `DR_PATIENT_TRX_MAX`=120)
  now carries the constructed subject's second half, so a Dept Requests card
  reads `<label> · <patient & TRX>` (the label alone on a legacy row) and a real
  Expand ⇄ Collapse button (`.sp-more.dr-expand`, `aria-expanded` +
  `aria-controls`; the `.dr-detail` panel is rendered FROM STATE —
  `DR_STATE.bodies` / `expanded`, the Spanish A5 shape — so an in-place resolve
  repaint keeps an open card open and a second Expand costs no RPC) opens the
  scoped `getDeptRequestDetail` read of the SENDER's own note (whitelist-built;
  `note: null` + a NAMED reason when it cannot be read — INV-138). The daily
  SLA digest (`deptRequestsOverdueOpen_`) and every `DeptRequest*` audit row
  stay LABEL-ONLY (pinned). A trailing **`ResolvedVia`** column (col 12,
  `email`/`app`, read only through `drResolvedVia_`) records HOW a request was
  resolved — only an email-link resolve is TIMED (INV-138, operator notes 2/3;
  scenario `deptreq-expanded-light-wide`). The
  **`ToEmail` column stores recipient DOMAIN(s) only** (`drRecipientDomains_`),
  never the raw address: the `'Other'` department lets a rep enter a free-text
  external/customer email and the store can fall back to the payroll sheet, so
  this mirrors the `ExternalEmailSent` domain-only minimization above; the column
  is **write-only** (never read back by any endpoint), so domain-only loses no
  function. **A
  dedicated sheet's tz MUST equal `CONFIG.TIMEZONE`** (not surfaced by Storage
  Health yet) — `CreatedAt`/`ResolvedAt` are written in the ISO `'T'` form
  (`drNowTs_`) so Sheets keeps them as strings and `parseTimestampMs_` matches;
  a drifted sheet tz would skew the elapsed/resolution-time math. No new
  OAuth scope (MailApp already used). Audit rows `DeptRequestSent` /
  `DeptRequestResolved` (reqId + dept only). **Resolution offers the email-link
  path, the sender/manager in-app button, AND (v2) a receiving-dept MEMBER
  button** (`resolveDeptRequest` widened to sender OR manager OR a member of the
  request's `toDept`). **v2 (shipped, INV-138):** roster **column N
  `Departments`** unblocks a true per-department **Incoming inbox**
  (`getDeptRequests` → `myDepts`+`incoming`, scoped by `empDepartments_`),
  **per-dept SLA targets** (Script Property `DR_SLA_TARGETS` + the 48h
  `DR_SLA_DEFAULT_HOURS` → `slaStatus` ontime/at-risk/overdue on the tracker + an
  Admin **Dept-Request SLA targets** editor), and a daily manager
  **SLA-reminder digest** (`sendDeptRequestReminderDigest` — PHI-free summary of
  overdue-open requests, the operator chose a manager summary over per-dept member
  nudges). See `docs/email-request-tracking-plan.md`.
<a id="operator-external-fillable-form-links-must-be-the-canonical-anonymous"></a>
- **External fillable-form links must be the canonical anonymous `/exec` URL.**
  Inside a Google Workspace, `ScriptApp.getService().getUrl()` returns the
  **domain-scoped** form `https://script.google.com/a/<domain>/macros/s/<id>/exec`
  — the `/a/<domain>/` prefix routes through org login, so an external recipient
  (personal Gmail / customer) is blocked with a Drive "Sorry, unable to open the
  file at this time" error (works only for `@<domain>` accounts). `buildFormUrl_`
  runs the base through `normalizeWebAppExecUrl_`, which **strips `/a/<domain>/`**
  and rewrites a trailing `/dev`→`/exec` (pinned by the `normalizeWebAppExecUrl_`
  Node tests). Optionally set Script Property **`WEB_APP_URL`** to the published
  `/exec` URL to override the resolved base entirely. Also confirm the
  deployment's **"Who has access" = "Anyone"** (matches `appsscript.json`'s
  `ANYONE_ANONYMOUS`) — a domain-restricted deployment blocks externals even on
  the stripped URL. Always test an external form link from an incognito window or
  a non-Google email, never from the editor's dev URL.
<a id="operator-external-anonymous-web-app-access-is-blocked-by-workspace-ad"></a>
- **External anonymous web-app access is BLOCKED by Workspace admin policy on
  this domain — the `?form=<token>` fillable-form route is non-functional for
  external recipients.** Confirmed on `universalmedsupply.com`: the deployment's
  "Who has access" dropdown offers only "Only myself" and "Anyone within
  Universal Medical Supply" — **not "Anyone"** — so `appsscript.json`'s
  `ANYONE_ANONYMOUS` silently downgrades to domain-only and Google issues the
  `/a/<domain>/` URL. A customer / personal-Gmail recipient therefore CANNOT open
  a form link (Drive "unable to open the file" error), and **no code change can
  fix this** — it needs the Workspace admin to allow anonymous web-app access (or
  allowlist this app), the same ticket-driven path that blocks Marketplace
  add-ons. **Scope:** this affects ONLY the external `?form` route; every
  internal tool (Time Clock, Call Notes, Metrics, the rep-filled Intake forms)
  works fine because reps are authenticated `@umsupply.com` users, and the
  forms-hardening (hash/consent/segregation) still stands — it just can't be
  exercised externally until the block is lifted. **Workaround for surveys /
  feedback / review requests** (low/no-PHI): host them on an external SaaS
  (Typeform / Jotform / Google Forms if its separate external-response policy
  allows) or send a direct Google-review link, and surface them via the
  manager-curated **Quick Links** picker in the external-email composer
  (`CN_EXTERNAL_LINKS`, below). Do NOT re-file the external-form block as a code
  bug — it's an environmental/admin constraint.
<a id="operator-employees-sheet-column-k-ptoenabled"></a>
- **`Employees` sheet column K = `PtoEnabled`** — added in the
  current schema; existing sheets must have this column added
  (header row 1, leave blank for back-compat = enabled, write
  `FALSE` for contractors). `setupTestEnvironment()` auto-writes
  the header on test runs if missing, but production rows still
  need it set manually.
<a id="operator-onboarding-a-new-team-member-no-longer-needs-a-hand-edit-of"></a>
- **Onboarding a NEW team member no longer needs a hand-edit of the
  Employees sheet (2026-08-07):** Manage → Admin → Config → **Team Members**
  → Add team member (validated form; optionally provisions the Call Notes
  Sheet in the same action), then check the same panel's per-rep readiness
  chips (notes / manager / tz / CDR — the CDR chip names the exact Agent
  Alias Overrides row to add when the phone system spells the name
  differently). Offboarding is the panel's Offboard button (clears the login
  email, keeps the name + history — the documented roster convention). The
  manual sheet-edit path still works; the panel is the recommended one.
<a id="operator-daily-automation-triggers"></a>
- **Daily automation triggers** must be installed by a manager
  account via `installAutomationTriggers()` from the editor. **The
  installer wires SIXTEEN triggers for twenty-four handlers — a trigger per
  SLOT, never per job (operator 2026-09-11).** Apps Script allows at most
  `AUTOMATION_TRIGGER_QUOTA` = **20 installable triggers per user per
  script**; the follow-ons round had taken the installer to 21, and the
  operator's install threw `This script has too many triggers` on the LAST
  create — AFTER the dedupe loop had deleted every existing trigger — so
  the deployment sat with 20 of 21 and NO `creditMonthlyPtoAccruals` until
  the re-install. Same-slot jobs now run inside one of three DISPATCHERS
  driven by `TRIGGER_GROUPS` (the ONE source for the dispatcher bodies, the
  derived `RETIRED_TRIGGER_HANDLERS` dedupe list, the install email and the
  TQ pins): `runHourlyJobs` (hourly → `sendCallNotesEodDigest`,
  `autoAssignSpanishThreadsScheduled`), `runWeeklyDigests` (Friday
  manager-tz 8am → `sendCallNotesWeeklyDigests`, `sendCoachingRecapDigest`)
  and `runNightlyPurges` (daily manager-tz 2am → `purgeOldDiagnostics`,
  `purgeOldQaReviews`, `purgeExpiredFormData`, `purgeArchivedCallNotes` — the
  four DELETE-ONLY retention purges, bounded first, cross-rep walk last).
  `runTriggerGroup_` runs each job in its own try/catch (a throw is stamped
  under the JOB name into `AUTOMATION_LAST_ERRORS`, a clean run clears it,
  a typo'd name is stamped by name), and every grouped handler keeps its
  own `assertManagerCaller_` gate, audit rows and heartbeat, so Automation
  Health's per-job liveness is UNCHANGED. **Known limit: a group shares one
  six-minute execution** — all eight grouped jobs are cheap by default (the
  purges no-op while their windows are 0), but a purge enabled against a
  large backlog that runs long is killed WITH the jobs after it; their own
  liveness rows then read stale, which is the signal to re-order or split.
  The installer is FAIL-CLOSED now: it counts its own set plus any other
  trigger this account owns BEFORE the delete loop and refuses with
  nothing touched when the total would exceed the quota; a throw mid-
  creation rethrows naming the handlers NOT installed. **The TQ-1 pin holds
  the created count at ≤ 19 (quota minus one) — adding a trigger fails CI
  until the job is folded into a same-slot dispatcher.** Three handlers
  deliberately keep their OWN trigger for stated reasons: `sendManagerDailyBrief`
  (`managerBriefSuppressionActive_({checkTrigger:true})` looks for a live
  trigger on THAT name — folding it in would silently un-suppress the
  digests it replaces), and the 18:00 pair `archiveOldTimesheetRows` +
  `creditMonthlyPtoAccruals` (both hold the ONE project lock and either can
  run long on the night that matters; a shared execution would raise the
  duplicate-append hazard cycle-12 F3 exists to prevent); the two
  row-MOVING retention jobs (`archiveOldCallNotes` 3am, `purgeOldCallNotes`
  4am) keep theirs because their ORDER after the 2am purges is load-bearing
  (archive-first). The handlers, by trigger:
    - `sendDailyMissedPunchAlerts` (time-clock, daily IST 6am)
    - `runDailyExportCheck` (time-clock, daily IST 12pm — since cycle-8 M-1 the
      automated exports fire the morning AFTER the period completes: biweekly
      when `range.end === yesterday`, monthly on the 1st exporting the prior
      month. The old on-period-end gate ran mid-shift for both offshore teams
      and silently omitted the final day's afternoon punches; the export email
      now arrives ~a day later but complete. `isLastBusinessDayOfMonth_` was
      removed with the old gate)
    - `runHourlyJobs` (hourly — the dispatcher for the two hourly jobs below)
    - `sendCallNotesEodDigest` (call-notes, hourly INSIDE `runHourlyJobs` since 2026-09-11 — emails each rep at their local EOD hour)
    - `runWeeklyDigests` (Friday manager-tz 8am — the dispatcher for the two weekly digests)
    - `sendCallNotesWeeklyDigests` (call-notes, Friday manager-tz 8am INSIDE `runWeeklyDigests` since 2026-09-11)
    - `sendCallNotesUrgentDigest` (call-notes, daily manager-tz 8am — recent urgent-flagged notes; sends nothing when none)
    - `runNightlyPurges` (daily manager-tz 2am — the dispatcher for the four delete-only retention purges, in this order: `purgeOldDiagnostics`, `purgeOldQaReviews`, `purgeExpiredFormData`, `purgeArchivedCallNotes`; every window defaults to 0, so installing it changes nothing)
    - `purgeArchivedCallNotes` (call-notes, daily manager-tz 2am INSIDE `runNightlyPurges` — 3rd tier: irreversibly deletes `NotesArchive` rows older than `CN_ARCHIVE_RETENTION_DAYS`; the ONLY deleter of archived notes; read-only re tab existence; no-ops while archive retention is disabled)
    - `purgeExpiredFormData` (forms, daily manager-tz **2am INSIDE `runNightlyPurges`** since 2026-09-11 — was its own 3am trigger; the hour was never load-bearing — no-ops while retention is disabled)
    - `archiveOldCallNotes` (call-notes, daily manager-tz 3am — SAFE cold-archive tier: moves notes older than `CN_NOTE_ARCHIVE_DAYS` to a `NotesArchive` tab in the same per-rep Sheet, data preserved; runs BEFORE the 4am purge so archive-first ordering holds; no-ops while archival is disabled)
    - `purgeOldCallNotes` (call-notes, daily manager-tz 4am — no-ops while note retention is disabled)
    - `reconcileCallNotes` (call-notes, daily manager-tz 5am — two-way Sheets back-fill of NoteId/Timestamp/DateLocal on rows added directly in a rep's Sheet; non-destructive + idempotent, so it's harmless to run daily)
    - `sendTrainingOverdueDigest` (training, daily manager-tz 7am — per-manager nudge of overdue training (org-wide) + overdue unsigned employee docs (team-scoped per INV-122); sends nothing to a manager with nothing overdue in their scope)
    - `sendAutomationHealthDigest` (automation, daily manager-tz 9am — org-wide automation-FAILURE push to `MANAGER_EMAILS`: reuses `computeAutomationHealth_()` and emails ONLY when a check is failing (stale digest heartbeat / stale nightly reconcile = the F1 class / personal-sheet sync-fails); silent when healthy. The watcher itself writes no audit row + has no heartbeat, so verify it from the trigger list. INV-137)
    - `sendDeptRequestReminderDigest` (DeptRequests v2, daily manager-tz 10am — PHI-free summary push to `MANAGER_EMAILS` of OPEN department requests past their SLA, grouped by dept; silent when none. Heartbeat-stamped `deptReqReminder`. INV-138)
    - `sendManagerDailyBrief` (daily manager-tz 8am — the consolidated manager morning brief behind the `managerDailyBrief` feature flag, default OFF. While off it only stamps its `managerBrief` heartbeat (installing it is harmless); while on it sends ONE per-manager branded email consolidating urgent notes / missed clock-outs / overdue training-docs-coaching / dept-SLA overdue, and those four handlers suppress their separate MANAGER emails (employee-facing reminders + weekly digests + the failure watchdog are untouched). Silent on an all-clear morning. INV-151)
    - `archiveOldTimesheetRows` (Timesheet cold-archive, daily manager-tz **6pm** — moved off 1am in cycle 8: 1am CT is mid-shift for IST/PHT and the move holds the global ScriptLock, so a large first run could starve offshore punches; 6pm CT is the all-team quiet window. MOVES Timesheet rows older than `TIMESHEET_ARCHIVE_DAYS` to a `TimesheetArchive` tab in the same ADP spreadsheet; NEVER deletes (payroll is keep-forever — no purge tier exists for it); sub-floor windows clamp UP to `TIMESHEET_ARCHIVE_MIN_DAYS` (120); no-ops while the window is 0 (the default). INV-153)
    - `runNightlySelfTest` (self-test, daily manager-tz 1am — the K-A alternative to editor-suite CI: runs `runSmokeTests` on any instance (pure logic, zero writes) and the FULL `runAllTests` suite ONLY on a confirmed dev instance (`isDevInstance_()` — BOTH `INSTANCE_LABEL` set and `INSTANCE_IS_PROD` explicitly not 'true'; unset = prod, A5). Heartbeat `selfTest`; outcome persists to Script Property `SELF_TEST_LAST_RESULT`, surfaces in Automation Health + the shell health dot + the failure digest, and a failing run also emails MANAGER_EMAILS the failed test names. INV-162)
    - `creditMonthlyPtoAccruals` (PTO accrual, daily manager-tz **18:00**, alongside the Timesheet cold-archive — NOT 6am (cycle-18 F10): 6am CT is ~4:30pm IST / 7pm PHT, the tail of the offshore shift, and on the 1st of the month this run holds the ONE project ScriptLock through a full Timesheet read, the exact starvation reasoning that moved `archiveOldTimesheetRows` off 1am (INV-153). The daily-with-idempotence cadence is unchanged, so a missed run still catches up via the col-R stamp — credits each accruing rep the PTO they EARNED from hours actually worked in each completed month (column-Q rate per `CONFIG.PTO_ACCRUAL_BASIS_HOURS` worked, converted to days by `CONFIG.PTO_HOURS_PER_DAY`) into the column-I balance IN ARREARS, idempotent via the column-R stamp; daily-with-idempotence rather than a monthly trigger so a missed 1st catches up instead of silently losing the month. Hours come from ONE range-wide, archive-aware Timesheet index — never a per-rep read inside the lock. No-ops for reps with no rate, so installing it is harmless. Audit row `PtoAccrualCredit` per credited rep (incl. zero-hour months). INV-194)
    - `purgeOldQaReviews` (QA review-record retention, daily manager-tz 2am INSIDE `runNightlyPurges` since 2026-09-11 — irreversibly deletes `QaComments` + `QaScorecards` rows older than `QA_REVIEW_RETENTION_DAYS` (Script Property → `CONFIG.QA_REVIEW_RETENTION_DAYS`, default **0 = disabled**); the `QaRecordings` INDEX and the Drive audio files are NEVER touched — the operator manages recordings in Drive. A 0/garbage `CreatedMs` stamp is never deleted (fail-safe), the disabled/unconfigured early-returns precede the lock, and every enabled run writes a counts-only `QaReviewPurge` audit row (the job-liveness heartbeat; its `AUTOMATION_JOB_CHECKS` row is gated on window>0 AND `QA_SS_ID` set, INV-186). No-ops entirely while the window is 0 or the QA store is unset, so installing it is harmless. INV-196)
    - `sendCoachingRecapDigest` (coaching, **Friday** manager-tz 8am INSIDE `runWeeklyDigests` since 2026-09-11 — design handoff PR 4, operator decision 1: ONE branded recap per AGENT listing the non-critical coaching (minor / moderate / praise) logged for them in the trailing `CONFIG.COACHING_RECAP_DAYS` (7) — severity label, date, who logged it, acknowledged-or-not, any revisit date — with NO narrative and NO patient/TRX (the detail lives behind the login). Critical items are emailed immediately at create instead and never appear here. Heartbeat `coachingRecap` (stale > 192h, the `weekly` window) stamped on BOTH exits; the digest is agent-facing so it NEVER consults the `managerDailyBrief` flag (INV-151). Silent for an agent with nothing logged in the window. The cadence is one line away from a change — the `onWeekDay(FRIDAY)` call on `runWeeklyDigests`' trigger in `installAutomationTriggers`, which moves BOTH weekly digests)
    - `purgeOldDiagnostics` (diagnostics retention, daily manager-tz 2am — FIRST inside `runNightlyPurges` since 2026-09-11, being the bounded one — cycle-18 F11's follow-on, 2026-09-11: irreversibly deletes `ViewUsage` and `ClientErrors` rows whose column-A timestamp is older than `VIEW_USAGE_RETENTION_DAYS` / `CLIENT_ERR_RETENTION_DAYS` (Script Property → CONFIG, BOTH default **0 = disabled**; edited in Manage → Admin → Config → Retention under "Diagnostics tabs (PHI-free)"). A timestamp that cannot be parsed is NEVER deleted (fail-safe); rows go as CONTIGUOUS bottom-up `deleteRows` runs under a 2000-row per-run budget (the ONE project lock — INV-153/INV-159's starvation reasoning) with the spare-row guard against Sheets' "cannot delete all non-frozen rows" refusal; the counts-only `DiagnosticsPurge` audit row is the job-liveness heartbeat, and its `AUTOMATION_JOB_CHECKS` row is gated on a window being set (INV-186). A failed run stamps `AUTOMATION_LAST_ERRORS` and a clean one clears it. Both early-returns precede the lock, so installing it changes nothing)
    - `autoAssignSpanishThreadsScheduled` (Spanish Inbox, **hourly** INSIDE `runHourlyJobs` since 2026-09-11 — operator note 4's "a scheduled trigger might follow", shipped 2026-09-11 behind the `spanishAutoAssign` feature toggle, server scope, default **OFF**. It heartbeats `spanishAutoAssign` BEFORE the flag check (INV-151 — liveness observable while off), acts ONLY inside business hours through `businessMinutesBetween_` (a null window reads as NOT inside), runs the SAME `spanishAutoAssignCore_` as the manager button — one scope rule, one voicemail fold, one picker, one claim-row shape — with the installer's roster row as the actor and the SYSTEM placeholder as the fallback (the reconcile precedent), and stamps a refused run (no members configured, a Gmail read that threw) into `AUTOMATION_LAST_ERRORS`. PTO-blind like the button: a member on approved leave can be handed claims — a logged follow-on)
  The install + remove TARGETS arrays both list all sixteen (pinned equal to
  the `newTrigger` set), and BOTH delete loops also consult the derived
  `RETIRED_TRIGGER_HANDLERS`, so re-running install dedupes cleanly AND
  removes the eight standalone triggers an older install created (a missing
  entry would silently duplicate that trigger on the next install). Triggers do not survive an Apps Script project re-clone. After
  install, `installAutomationTriggers` emails `MANAGER_EMAILS` a
  reminder about the cross-account trigger-ownership pitfall: Apps
  Script's `ScriptApp.getProjectTriggers()` only returns triggers
  owned by the current user, so duplicates from a previous installer
  are invisible to a fresh run. If a different account ever
  installed these triggers before, have that account run
  `removeAutomationTriggers()` first.
<a id="operator-call-notes-retention-is-off-by-default"></a>
- **Call-notes retention is OFF by default.** `purgeOldCallNotes`
  (daily manager-tz 4am trigger) deletes per-rep `Notes` rows whose
  `DateLocal` is older than `CN_NOTE_RETENTION_DAYS` — Script Property
  first, then `CONFIG.CALL_NOTES.NOTE_RETENTION_DAYS` (default **0 =
  disabled**, nothing is ever deleted). The delete is **irreversible**
  and the notes are PHI — confirm the canonical record lives elsewhere
  before enabling. Cross-rep (walks every enrolled rep's Sheet); a broken
  Sheet is skipped, not fatal. Writes a PHI-free `CallNotesPurge` audit
  row with counts. No redeploy needed to change the window, but installing
  the trigger requires `installAutomationTriggers()`.
<a id="operator-call-notes-cold-archive-is-the-safe-retention-tier-also-off"></a>
- **Call-notes cold-archive is the SAFE retention tier (also OFF by
  default).** `archiveOldCallNotes` (daily manager-tz 3am trigger) **moves**
  per-rep `Notes` rows older than `CN_NOTE_ARCHIVE_DAYS` — Script Property
  first, then `CONFIG.CALL_NOTES.NOTE_ARCHIVE_DAYS` (default **0 =
  disabled**) — into a `NotesArchive` tab (`CONFIG.CALL_NOTES.ARCHIVE_TAB`)
  in the SAME per-rep spreadsheet, then deletes them from the live `Notes`
  tab. **Data is preserved** (the canonical record stays in `NotesArchive`),
  the live tab is bounded (faster open-ended scans), and **no new operator
  store** is needed. Append-then-delete with a `flush()` between, so a
  mid-run failure can only DUPLICATE into the cold archive (never lose).
  Cross-rep; a broken Sheet is skipped; PHI-free `CallNotesArchive` audit
  row. **Archived notes are intentionally NOT in-app-searchable** (all
  readers go through `getCallNotesSheet_`→`NOTES_TAB`); `purgeOldCallNotes`
  never touches `NotesArchive` (a true cold store). **RECOMMENDED SAFE
  SETUP:** enable archive (`CN_NOTE_ARCHIVE_DAYS > 0`) and leave
  `CN_NOTE_RETENTION_DAYS` at 0 — bounded live tab, full history retained.
  If you enable BOTH, keep `CN_NOTE_ARCHIVE_DAYS ≤ CN_NOTE_RETENTION_DAYS`
  (the 3am archive runs before the 4am purge — the safe path is
  archive-first; the reverse can irreversibly delete rows the archive hasn't
  reached yet). No redeploy to change the window, but installing the trigger
  requires `installAutomationTriggers()`.
<a id="operator-call-notes-3rd-tier-cold-store-purge-also-off-by-default"></a>
- **Call-notes 3rd-tier cold-store purge (also OFF by default).**
  `purgeArchivedCallNotes` (daily manager-tz 2am trigger — BEFORE the 3am
  archive) irreversibly deletes `NotesArchive` rows older than
  `CN_ARCHIVE_RETENTION_DAYS` (Script Property → `CONFIG.CALL_NOTES.ARCHIVE_RETENTION_DAYS`,
  default **0 = disabled**) — the ONLY mechanism that deletes archived notes
  (`archiveOldCallNotes` MOVES into the archive; `purgeOldCallNotes` never
  touches it). READ-ONLY w.r.t. tab existence (a rep with no `NotesArchive` is
  skipped — never created here). The archived row keeps its original
  `DateLocal`, so the window is measured from the note's original date. Keep
  `CN_ARCHIVE_RETENTION_DAYS ≥ CN_NOTE_ARCHIVE_DAYS` (the cold-store lifetime is
  longer than the move window). PHI-free `CallNotesArchivePurge` audit row; in
  `AUTOMATION_AUDIT_ACTIONS` so Automation Health surfaces last-run. This
  completes the 3-tier retention model: **archive** (move, safe) → **purge live**
  (delete from `Notes`) → **purge cold** (delete from `NotesArchive`).
<a id="operator-include-archive-search"></a>
- **Include-archive search.** `searchMyCallNotes` and `managerSearchCallNotes`
  take an `includeArchive` flag (default off — back-compat: existing 4-arg
  callers like `getPatientTimeline` are unaffected); when true they ALSO scan the
  cold `NotesArchive` tab (read-only `getSheetByName`, never creates it) and tag
  hits `_archived`. The client renders a read-only **"Include archived"** checkbox
  on both the rep and manager Search bars (`CN_STATE.searchIncludeArchive` /
  `mgrSearchIncludeArchive`) and an "archived" pill on archived hits. The
  field-scope match logic (INV-45 phone/trx/caller/issue/all) is byte-identical —
  factored into a per-source closure and applied to the extra source.
<a id="operator-admin-retention-panel-config-sub-tab"></a>
- **Admin "Retention" panel (Config sub-tab).** Manager-gated editor for the
  three call-note windows (+ the two diagnostics windows since 2026-09-11 —
  `VIEW_USAGE_RETENTION_DAYS` / `CLIENT_ERR_RETENTION_DAYS`, rendered under
  "Diagnostics tabs (PHI-free)"; the client sends each key ONLY when its row
  rendered, so an older client can never reset a window to 0, and the server
  writes each only when present): `getRetentionConfig` (read-only — each window's resolved value +
  source (`Script Property` / `CONFIG` / `default`) + safety-ordering warnings via
  the pure, Node-pinned `retentionWarnings_(archive, purge, archivePurge)`) and
  `saveRetentionConfig` (writes the three Script Properties, whole-days
  validation, `AdminConfigChange` audit — INV-57 family). The client
  (`cnLoadRetentionPanel_`) surfaces current values + the recommended SAFE setup +
  inline warnings, and **danger-confirms** (uiConfirm) only when a manager
  ENABLES or RAISES one of the two irreversible purge windows. Takes effect on the
  next nightly run (re-run `installAutomationTriggers()` once if not yet done).
<a id="operator-form-data-retention-is-off-by-default"></a>
- **Form-data retention is OFF by default.** `purgeExpiredFormData`
  (daily manager-tz 2am, inside the `runNightlyPurges` dispatcher since
  2026-09-11) deletes `FormSubmissions` (responses + signatures) and
  `FormTokens` (recipient + prefill data) rows older than
  `FORM_DATA_RETENTION_DAYS` — Script Property first, then
  `CONFIG.FORM_DATA_RETENTION_DAYS` (default **0 = disabled**, nothing is
  ever deleted). To enable PHI minimization, set Script Property
  `FORM_DATA_RETENTION_DAYS` to a positive day count that matches your
  record-retention obligations (the purge is **irreversible**; an
  unparseable/blank date is never deleted — fail-safe). No redeploy needed
  to change the value, but installing the trigger requires
  `installAutomationTriggers()`. Each purge writes a PHI-free
  `FormDataPurge` audit row with the counts removed. The canonical record
  of an order typically lives in the downstream order system, not these
  collection sheets — confirm before choosing a window. **This deployment runs
  a 90-day window** — set Script Property `FORM_DATA_RETENTION_DAYS=90` (the
  committed CONFIG stays `0` so a fork/fresh deploy never auto-deletes) and
  ensure the `purgeExpiredFormData` trigger is installed.
<a id="operator-forms-phi-store-set-forms-ss-id-to-segregate-forms-hardening"></a>
- **Forms PHI store — set `FORMS_SS_ID` to segregate (forms-hardening).** By
  default `getFormsSS_()` falls back to the ADP/payroll spreadsheet (back-compat),
  co-locating form PHI with timesheet data. To segregate (recommended), set
  Script Property **`FORMS_SS_ID` to the `INTAKE_SS_ID` spreadsheet** and **one-
  time migrate** the existing `FormTokens` + `FormSubmissions` tabs into it (move
  the tabs, or copy rows — in-flight `pending` tokens live in `FormTokens`, so
  migrate while no forms are mid-flight, or accept that older pending links break).
  Fresh `FormSubmissions` tabs in the new location get the full 11-column
  `FS_HEADERS`; existing rows migrated from the ADP sheet keep their 6 columns
  (no hash/consent/certificate — `verify` reports them as legacy). The deployer
  account needs edit access to whatever `FORMS_SS_ID` points at (it already does
  for `INTAKE_SS_ID`).
<a id="operator-form-consent-version-in-config"></a>
- **`FORM_CONSENT_VERSION` in CONFIG** stamps every form submission with the
  Privacy-Notice version the signer saw (server-authoritative — the client's
  reported version is ignored). **Bump it whenever the consent copy in
  `form_public.html` changes** so stored submissions prove which language was
  shown. Change requires a redeploy (CONFIG, no Script Property override).
<a id="operator-manager-timezone"></a>
- **`MANAGER_TIMEZONE`** in CONFIG drives manager-dashboard
  display tz; change requires a redeploy.
<a id="operator-timezone-model-three-distinct-concepts-don-t-conflate-them"></a>
- **Timezone model — three distinct concepts, don't conflate them.**
  (1) **`CONFIG.TIMEZONE`** (currently `Asia/Kolkata`) is the **storage /
  coercion** tz, NOT a business anchor: shared bookkeeping (AuditLog
  timestamps, `TO.SUBMITTED_AT`, `DateLocal`) is written in it, and **every
  spreadsheet's own tz MUST equal it** because the coercion-recovery helpers
  (`normalizeDate_`/`normalizeAuditTs_`/`trainCellDate_`) format coerced Date
  cells in the *sheet's* tz while the writers use `CONFIG.TIMEZONE` — the
  round-trip only holds when they match (the `config_adpSheetTzMatchesConfig`
  S1.1 tripwire pins this for the ADP sheet; Storage Health surfaces it for all
  seven). **Both the tripwire and Storage Health compare via `tzEquivalent_`
  (alias-aware): Google Sheets stores GMT+5:30 as the legacy `Asia/Calcutta`,
  which is functionally identical to CONFIG's `Asia/Kolkata` (same offset, no
  DST) — `Utilities.formatDate` treats them the same, so an alias passes; only a
  genuinely different zone (e.g. `America/Los_Angeles`) fails.** It can be ANY tz
  as long as the sheets match it. (2)
  **`MANAGER_TIMEZONE`** (`America/Chicago`) is the **manager display/automation
  anchor** — dashboard punch display, digest trigger hours, Coverage planner,
  exports, audit-panel default dates all use it. So CST is already the operating
  anchor for everything a manager sees, regardless of `CONFIG.TIMEZONE`. (3) The
  per-employee **`Timezone`** roster column is the rep's **SCHEDULE FRAME** —
  it drives their display / EOD-digest hour / shift + break interpretation /
  day-off gate, and **punches + `DateLocal` are stamped in it** (`recordPunch`
  → `empTz_`), all independent of the sheet tz. **ALL-CST POLICY (operator
  2026-08-28): every agent, regardless of physical location, operates on the
  CST work schedule** — PH agents work 8:30 AM–5 PM **CST**, India agents
  8:00 AM–5 PM **CST** — so this column should read `America/Chicago` on
  EVERY row. A physical-location value (`Asia/Manila`, `Asia/Kolkata`) makes
  the app interpret the schedule, breaks, "today", and the punch state
  machine in the wrong frame: an offshore CST shift straddles the rep-local
  midnight, so both halves of a day's punches read INCOMPLETE (excluded from
  timesheet totals, pay statements, and the hours-driven PTO accrual), the
  rolling note stack rolls over MID-SHIFT (the recurring "my note is
  missing from today"), and post-local-midnight punches see "no ClockIn
  today". Any pre-policy mention in this document of Manila-local shifts /
  rep-local frames describes the OLD configuration. The multi-tz MACHINERY
  (`empTz_`, `safeTimezone_`, per-tz conversion, the IST/PHT test fixtures)
  is deliberately KEPT — the policy is a data convention, not a code
  removal. **Operator consequence:** to fix a
  sheet-tz drift, set the spreadsheet(s) to `CONFIG.TIMEZONE` (`Asia/Kolkata`) —
  do NOT need to change `CONFIG.TIMEZONE` to CST (that's a coordinated migration
  of all seven sheets + a one-time reinterpretation of the bookkeeping columns,
  with no manager-display benefit since `MANAGER_TIMEZONE` already covers it);
  **the roster-column flip is INDEPENDENT of the sheet-tz axis** — verified
  2026-08-28: the sheet-tz machinery (`tzEquivalent_`/`adpSheetTz_`/
  `getSpreadsheetTimeZone`) never reads `EMP.TIMEZONE`, so setting every row
  to `America/Chicago` touches none of the coercion round-trips, the S1.1
  tripwire, or Storage Health. With every row on `America/Chicago` the whole
  roster shares one DST rule, so there is no cross-row DST skew.
  **Audited 2026-08-17 (pre-pilot sweep):** the mass-punch-adjustment path is
  clean end to end (every guard in the target's own tz); two DOCUMENTED
  latents remain — `sendTrainingOverdueDigest`'s manager-tz "today" reaches
  the rep-facing overdue-docs nudge (dashboards can disagree between
  rep-midnight and CST midnight; emails fire when the zones agree), and
  `getMonthRange_` reads script-tz (Chicago) calendar fields inside a
  Kolkata-anchored caller — correct ONLY because Chicago is always behind
  Kolkata; revisit if `AUTO_EXPORT_HOUR_IST` or the script tz ever changes.
  **A FOURTH consequence bit in pilot (operator 2026-08-13): a BLANK roster
  Timezone cell falls back to `CONFIG.TIMEZONE` (Asia/Kolkata), so everything
  that rep writes — punches, note timestamps, `DateLocal` — is silently
  stamped in IST.** The reported symptom was a CST rep's note showing 9:30 PM
  and yesterday's note sitting in today's Log: +5:30 is the only offset that
  puts a :30 on a whole-hour zone, which is how it was diagnosed. The fix is
  the roster cell (`America/Chicago` in the rep's row — the Team Members
  panel's tz chip flags blank/malformed cells); existing rows keep their
  as-written stamps. The code half is `tzMismatchCheck_` (`script_core.html`)
  — **REDESIGNED for the ALL-CST policy (2026-08-28):** at boot the client
  compares the rep's PROFILE timezone (`empState.timezone`) against the
  server-shipped WORK ANCHOR (`empState.workAnchorTz` =
  `CONFIG.MANAGER_TIMEZONE`, additive on `getEmployeeState`) — by UTC
  OFFSET, never id, so `America/Chicago` vs `US/Central` must not warn — and
  shows a STICKY warn toast at most once per browser-local day
  (`umsTzWarnedDay`) naming both zones and where a manager fixes it. The
  original browser-vs-roster comparison is RETIRED: under the policy an
  offshore agent's browser offset legitimately differs from their (correct)
  CST profile every day, so the browser compare would nag exactly the people
  configured right; profile-vs-anchor instead catches the dangerous states
  for everyone — a blank cell falling back to Asia/Kolkata (this
  paragraph's original bug), and a pre-policy Manila/Kolkata row. Guards: an
  Intl sanity-probe of UTC gates the check so a broken browser can't nag, an
  unresolvable anchor or absent `workAnchorTz` (older server) disables it
  silently, and an unresolvable PROFILE id still warns (it will be stamped
  in the fallback tz — the dangerous state). Pinned by the rewritten
  `tzOffsetMinAt_` pin in run.js (anchor comparison + a ban on
  `getTimezoneOffset` returning to the function).
<a id="operator-config-coverage-min-staff"></a>
- **`CONFIG.COVERAGE_MIN_STAFF`** (this deploy: **6**) + **`CONFIG.COVERAGE_STAFF_GOOD`**
  (this deploy: **7**) set the manager Coverage planner's three bands (#3): a
  manager-tz business hour with **≥ GOOD** confirmed reps renders green ("good"),
  **≥ MIN_STAFF** but below GOOD renders amber ("acceptable"), and **< MIN_STAFF**
  renders red ("concerning") + is listed in the Understaffed callout. Both are
  CONFIG-only (no Script Property / Admin UI yet — deliberate, per the operator
  decision); change requires a redeploy. `getCoveragePlan` ships both as
  `minStaff` / `goodStaff`; the client (`tc/script_manager.html`) bands on the
  CONFIRMED count (every shown hour is a business hour, so 0 is concerning, not
  neutral). The planner resolves each rep's shift via `empShiftSchedule_` — the roster
  column-O override wins, else the per-tz `CONFIG.SHIFT_SCHEDULE` (Turn D
  removed INV-127's per-tz-only limitation).
<a id="operator-config-kb-review-due-days"></a>
- **`CONFIG.KB.REVIEW_DUE_DAYS`** (default 90) sets the KB review-due
  staleness window (#4). CONFIG-only; change requires a redeploy. The KB
  sheet gained trailing `ReviewedAt`/`ReviewedBy` columns — the header
  **self-heals on the first post-deploy KB read/save** (no manual
  migration); legacy rows fall back to `UpdatedAt` until first reviewed.
<a id="operator-config-shift-schedule"></a>
- **`CONFIG.SHIFT_SCHEDULE`** sets the Clock-view ribbon/countdown
  shift: `DEFAULT` 8:00–17:00 CST; **`BY_TIMEZONE` ships EMPTY under the
  ALL-CST policy (2026-08-28)** — the old PH `Asia/Manila: 8:30–17:00`
  entry was removed because it was wrong twice over: it keyed on a roster
  value the policy retires, and its times were written as Manila-LOCAL
  when PH agents actually work 8:30–17:00 **CST**. PH agents' 8:30 start
  now rides Employees **column O** (`8:30-17:00`, interpreted in the rep's
  roster tz = `America/Chicago` under the policy); India agents are the
  8:00–17:00 `DEFAULT` and need no column O. The `BY_TIMEZONE` MECHANISM is
  kept (resolved per the rep's roster timezone by `getShiftSchedule_`) for
  a future genuine per-timezone exception. Change requires a redeploy
  (CONFIG, no Script
  Property override). **PER-REP exceptions need no redeploy (Turn D):** put
  `H:mm-H:mm` in Employees column O — `empShiftSchedule_` resolves
  override-over-tz for every consumer. **Breaks (item 1):** each shift entry may carry a
  `breaks: [{label, start:'HH:mm', len:<min>}]` array (a tz entry without
  its own `breaks` inherits `DEFAULT.breaks`), and `BREAK_REMINDER_MINUTES`
  sets the reminder lead time. **Since 2026-08-27 the CONFIG breaks are only
  the SEED: Manage → Admin → Config → "Break schedules"** (`saveBreakSchedules`,
  admin-gated INV-136; Script Property `SHIFT_BREAK_SCHEDULES`, auto-managed —
  reads ride `getAdminConfig.breakSchedules`) **edits breaks + the reminder
  lead with NO redeploy.** The property wins when it has an applicable entry
  (tz key, else its DEFAULT key; an EXPLICITLY EMPTY list = "no breaks for
  this key", deliberately distinct from absent = inherit), else the CONFIG
  chain applies unchanged; shift START/END stay CONFIG + column O — the
  editor deliberately edits breaks only. `getBreakSchedules_` sanitizes on
  read (L-12) + memoizes per execution (the coverage walks call
  `getShiftSchedule_` per-rep-per-day); saving zero custom schedules at the
  CONFIG reminder DELETES the property (the umsTheme posture). **PER-AGENT
  breaks (operator 2026-09-02):** the property also carries an optional
  `employees: { <rosterId>: [...] }` map — each agent has their OWN staggered
  slots so the desk is never empty, which a per-timezone list structurally
  cannot express. The ONE resolver `empShiftSchedule_(empLike, tz)` (INV-149)
  layers it ABOVE the tz/DEFAULT entry (`prop.employees[id] !== undefined` —
  an explicitly EMPTY list means "this agent has no breaks", exactly the
  explicit-empty rule the tz layer uses, and `[]` is truthy so the hazardous
  mutation is a `.length` guard, not bare truthiness — bite-checked); every
  caller passes the rep's `id` (`getEmployeeState`, `getCoveragePlan`,
  `getPunctualityReport`, the admin view — a caller that drops the id
  silently loses the layer, pinned). Column O still governs start/length
  only. The save refuses an id that is malformed or not on the roster BY
  NAME (a typo'd id would otherwise be a silent no-op forever); an
  OFFBOARDED id (email cleared, row kept — INV-183) still resolves, since the
  id is reserved. The blob carries `employees` only when non-empty, in the
  sanitizer's key order (read ≡ write byte-for-byte), and an employees-only
  save is NOT a reset. The Admin card's "Per-agent breaks" section (roster
  picker seeded from the DEFAULT section; "Remove (use default)" falls
  back) names the timezone each agent's times are READ in and warn-pills a
  profile that disagrees with the CST work anchor — the timezone class this
  app keeps meeting, surfaced where the times are typed. Pinned by
  BRK-1..5 (BRK-5 = the resolver behavioural). **The BREAK COVERAGE PLANNER
  (operator 2026-09-03) sits at the top of the same card:** `getBreakCoverage`
  (admin READ) resolves EVERY roster rep under the editor's unsaved draft
  (`withBreakSchedulesProp_` + `empShiftSchedule_` with the rep id, converted
  to the CST anchor on today's date via `convertDateTime_`), buckets them with
  the pure `breakCoverageSlots_` (15-min slots across the Coverage business
  window; a partial overlap counts as AWAY — over-reporting absence is the safe
  direction; `away[]` names who and which break), and — once per card open —
  attaches `getCdrInboundVolume_`: average inbound calls per weekday per slot
  from the CDR Report's `Inbound Calls` export (pure `inboundVolumeBuckets_`;
  display values; widening tail scan bounded + truncation reported; clean-round
  1h cache; every failure named as `unavailable`). The client (`cnBreakCovStripHtml_`)
  tones cells by the planner's `minStaff`/`goodStaff`, draws the volume as a
  background bar scaled to the window's max, opens a who-is-away line on click
  (real buttons, `aria-pressed`), and refreshes debounced + seq-guarded on every
  edit through `cnBreakCollectDraft_(true)` — the SAME collector Save uses
  strictly — keeping last-good with a warn line on a failed refresh (C17-5). It
  is a SCHEDULE view (every rep on shift, breaks subtracted); approved PTO stays
  on the Coverage planner, which now subtracts breaks too. Pinned by BCV-1..4;
  on camera in `admin-config-*` + `admin-config-covfail-light-wide`. `getShiftSchedule_` resolves the tz layer to
  `{breaks:[{label,startMin,lenMin}], breakReminderMin}` on `CLK_SCHEDULE`.
  The Clock view shows a "Next break" chip (`#clk-next-break`) and fires a
  one-time reminder toast `breakReminderMin` before each break — but ONLY
  while the Clock tab is open (Apps Script web apps have no background
  push); the reminded-set dedupes per break per day (and is cleared on day
  rollover so it can't grow unbounded in a long-lived pinned pop-out — F6).
<a id="operator-employees-sheet-column-l-callnotessheetid"></a>
- **`Employees` sheet column L = `CallNotesSheetId`** — per-rep
  call-notes Spreadsheet ID. Easiest path: **Call Notes → Admin →
  Call Notes Enrollment → Provision Sheet** (one click — creates the
  Sheet in the deployer's Drive and fills column L; INV-110). The
  manual path still works (copy the template Sheet, rename it for the
  rep, share with the script-owner account, paste the ID here). Blank
  means the rep has no Call Notes enrollment yet; their panel renders
  the enrollment-missing splash. Pre-existing rows are blank until
  provisioned/filled (the schema bump in
  `EMP.CALL_NOTES_SHEET_ID = 11` doesn't auto-fill).
<a id="operator-employees-sheet-column-m-manageremail"></a>
- **`Employees` sheet column M = `ManagerEmail`** — each employee's
  manager (an email from `MANAGER_EMAILS`). Drives the FAIL-CLOSED
  Employee Docs team scoping (INV-122): a manager sees a doc only if
  they issued it OR they are this column's value for that employee.
  Blank = only the issuer (and the employee) can see the doc — fill
  the column for every employee who will receive docs. Header row 1;
  no other module reads it yet.
<a id="operator-employees-sheet-column-n-departments"></a>
- **`Employees` sheet column N = `Departments`** (DeptRequests v2, INV-138) —
  a `;`/`,`-separated list of department names (matching the `DEPARTMENT_EMAILS`
  keys, case-insensitive) the rep STAFFS. Drives the Metrics → Dept Requests
  **Incoming inbox** (open requests addressed to a dept the rep staffs) + lets a
  dept member resolve in-app. Blank for most reps; fill it only for dept-desk
  staff. Unknown names are dropped (`drParseDepartments_`). `ROSTER_CACHE_KEY`
  was bumped to `employee_roster_v7` for this column — stale v6 cache entries
  expire within 5 min (or run `clearCaches_()`).
<a id="operator-employees-sheet-column-o-schedule"></a>
- **`Employees` sheet column O = `Schedule`** (Turn D, cycle 7) — an OPTIONAL
  per-rep shift override, `H:mm-H:mm` in the REP's own timezone (e.g.
  `9:15-17:45`; the PARSER also accepts bare hours like `9-17`, BUT Google
  Sheets date-coerces a bare `9-17` typed into the cell — it becomes Sep 17,
  which fails the parse and the override silently no-ops. Type the `H:mm-H:mm`
  form, or prefix the cell with a leading apostrophe — cycle-8 scan finding).
  Blank = the per-timezone
  `CONFIG.SHIFT_SCHEDULE` (today's behavior). Drives the Clock ribbon/countdown
  (via `getEmployeeState.schedule`), the Coverage planner, and Punctuality —
  the INV-127 per-tz-only limitation is removed. Parsed by the pure, Node-pinned
  `parseShiftOverride_`; a typo'd/overnight/out-of-range cell silently falls
  back to the per-tz schedule (fail-safe — a bad cell can never break the
  ribbon). Breaks + the break reminder still come from the per-tz schedule
  (the override changes start/length only). Overnight shifts are unsupported.
  `ROSTER_CACHE_KEY` bumped to `employee_roster_v8` for this column.
<a id="operator-script-property-cdr-queue-groups"></a>
- **Script Property `CDR_QUEUE_GROUPS`** (optional — cycle-14 Phase 4). JSON
  `{"Department": ["A_Q_Queue", ...]}` mapping transfer queues to departments
  for the Metrics → Team Metrics **"By department"** mode. **Unset is fine:**
  `CONFIG.CDR_QUEUE_GROUPS` already ships the four operator-supplied groups
  (Sales / Customer Success / Field Operations / Power), so the mode works on
  deploy with no action. Set the property only to change the mapping without a
  redeploy — e.g. when a new queue appears in the CSR Transfer tab's H:R block.
  Sanitize-on-read: a corrupt blob degrades to the CONFIG seed, a non-array
  member list is dropped, and **a queue listed under two departments is kept
  only in the FIRST** (the grouping is a partition — double-counting is the
  INV-180 class). Any queue not listed shows up under a trailing **"Ungrouped"**
  row in the UI, so an unmapped queue is visible rather than silently absorbed —
  that row is the cue to update this map. There is no Admin editor yet; edit the
  property in Apps Script editor → Project Settings, or the CONFIG seed.
<a id="operator-script-property-dr-sla-targets"></a>
- **Script Property `DR_SLA_TARGETS`** (optional, auto-managed) — JSON
  `{deptName: hours}` per-dept resolution-SLA overrides for DeptRequests, written
  by the Admin → Config **Dept-Request SLA targets** editor (`saveDeptRequestSla`,
  admin-gated, 1–720h, entries equal to the default are dropped). Unset/blank for
  a dept → the `CONFIG.CALL_NOTES.DR_SLA_DEFAULT_HOURS` default (**48h**). A
  request past its SLA shows "Overdue" on the tracker + rides the daily
  `sendDeptRequestReminderDigest` manager summary. No manual setup needed.
<a id="operator-set-script-property-hr-docs-ss-id"></a>
- **Set Script Property `HR_DOCS_SS_ID`** to a DEDICATED spreadsheet for
  Employee Docs (create an empty one; tabs `EmpDocs` + `DocSignatures`
  + `EmpDocTemplates` (v2 reusable templates) + `Coaching` auto-provision;
  the `EmpDocs` header self-heals to add the v2 `FieldsJson`/`ResponsesJson`
  columns on first post-deploy use — INV-135). There is deliberately NO fallback — without the
  property every Employee Docs endpoint returns a friendly
  "not configured" error. Keep it separate from the KB (broadly
  rep-readable), the ADP sheet (payroll), and the PHI sheets; the
  deployer needs edit access. NEVER point a retention purge at it —
  HR records are keep-forever (INV-122). `TEST_HRDOCS_SS_ID` is the
  auto-managed test fixture twin (created on first `runAllTests`).
<a id="operator-employees-sheet-column-p-payrate"></a>
- **`Employees` sheet column P = `PayRate`** (operator 2026-08-17) — an
  OPTIONAL hourly pay rate per rep (plain number; `$18.50`-style entries
  parse too). Drives the **estimated gross** line on the rep-facing pay
  statement (Time / PTO → "View pay statement" in the pay-period rail
  block); BLANK =
  the statement shows hours only and says the rate is not on file. Read in
  exactly ONE place (`empPayRate_` behind `getMyPayStatement` — the
  INV-167/F14 boundary, Node-pinned) and never spread onto emp objects, so
  no other endpoint can leak a rate to a teammate surface. Fill it by hand
  in the sheet (the onboarding form deliberately doesn't ask — a rate is a
  payroll decision, not an onboarding field); `ROSTER_CACHE_KEY` was bumped
  to v9 for this column, so stale cache entries expire within 5 min.
<a id="operator-employees-sheet-column-q-ptoaccrual"></a>
- **`Employees` sheet column Q = `PtoAccrual`** (operator 2026-08-18) — an
  OPTIONAL PTO accrual rate in **PTO HOURS PER `CONFIG.PTO_ACCRUAL_BASIS_HOURS`
  HOURS WORKED** — the operator's real rule (2026-08-19). For the PH team
  that is **`3.08`** (3.08 PTO hours per 80 hours worked); unit-annotated
  cells like `3.08 h/80h` parse too (the first numeric token is read — do
  NOT strip non-digits, `3.08 h/80h` would become 3.088). Setting it does
  TWO things: (a) that rep's Time/PTO annual-leave tile flips to the
  ACCRUING framing (`ACCRUING 3.08H / 80H` + a month-to-date earned line,
  with the planned/projected line still shown beneath it — F7);
  (b) **the SYSTEM credits the earned amount into the column-I balance
  automatically** — the daily `creditMonthlyPtoAccruals` trigger reads the
  rep's ACTUAL worked hours for each owed month (one range-wide Timesheet
  index, archive-aware) and credits `hours × rate / basis ÷
  CONFIG.PTO_HOURS_PER_DAY` days, IN ARREARS (month M's accrual lands
  on/after the 1st of M+1), idempotent via the auto-managed column-R stamp
  (see below and INV-194). **A month with no worked hours credits nothing**
  — correct under an hours rule, and it still writes an audit row so the
  silence is visible.
  Shipped display-only for ~an hour, then operator-upgraded to
  system-computed the same day. Column I REMAINS the balance of record:
  the credit is a DELTA through `adjustLeaveBalance_`, so manual
  corrections still compose — but **STOP the routine manual monthly
  top-ups the day you fill column Q**, or each month double-credits.
  **Enable convention: the balance is presumed current through the END of
  last month at enable time** (a blank stamp SEEDS without back-crediting,
  so enabling never dumps a surprise catch-up). BLANK/garbage/zero = no
  accrual — the fixed-allotment tile and zero credits, exactly as before
  (`empPtoAccrual_` fail-safes to null, the `parseShiftOverride_`
  posture). Fill it by hand in the sheet for accruing agents only; the
  onboarding form deliberately doesn't ask. **A rate carried over from the
  2026-08-18 days-per-month round means something different now** — re-enter
  it in hours-per-80-worked.
  **STANDING PRE-FLIGHT before any month's credit (operator 2026-08-31):
  open an accruing rep's PAY STATEMENT for that month and look at the day
  rows.** The accrual reads each day through the SAME `calcHours_` as the
  statement (`workedHoursByEmpForRange_` — a date with a ClockIn but no
  ClockOut contributes ZERO hours, never a partial, INV-176), so whatever
  the statement calls INCOMPLETE contributes nothing to the credit. That
  makes the statement an EXACT preview of what the credit will see, and it
  is a better check than reasoning about timezones because it needs no
  inference — it renders the same numbers the trigger will read. The class
  it catches: an offshore rep whose roster tz is not the CST work anchor
  splits every shift across two rep-local dates, so BOTH halves read
  incomplete and the month credits ≈0 (see the timezone-model entry). Check
  BEFORE the 1st; afterwards the credit is a delta you top up by hand from
  the audit row's `hoursWorked=`.
<a id="operator-config-pto-accrual-basis-hours-80-config-pto-hours-per-day-8"></a>
- **`CONFIG.PTO_ACCRUAL_BASIS_HOURS` (80) + `CONFIG.PTO_HOURS_PER_DAY` (8)**
  (operator 2026-08-19) — the two halves of the accrual unit conversion:
  column Q's rate is *per basis hours worked*, and the earned PTO hours are
  divided by hours-per-day to reach the DAYS column I stores. Both are
  CONFIG-only (no Script Property), so changing either is a redeploy — and
  changing the basis silently re-scales every column-Q rate, so change the
  cells in the same pass. `PTO_ACCRUAL_CATCHUP_MAX_MONTHS` (12) bounds a
  cold-start catch-up.
<a id="operator-employees-sheet-column-r-accruedthrough"></a>
- **`Employees` sheet column R = `AccruedThrough`** (operator 2026-08-18) —
  AUTO-MANAGED `yyyy-MM` stamp: the last month whose accrual has been
  credited. Written only by `creditMonthlyPtoAccruals`; leave it alone.
  Blank = seeds on the next run (stamps last month, credits nothing).
  Hand-edit ONLY to deliberately re-credit or skip months. **A FORWARD stamp
  (ahead of last month) is honored as a deliberate skip and left alone
  — fixed 2026-08-31; before that fix `accrualMonthsToCredit_` returned
  `newStamp: <last month>` on that branch and the caller's write rewound the
  cell, so a same-day run undid the skip and the next month credited exactly
  what the operator had said to skip.** Write it zero-padded (`2026-09`, not
  `2026-9`) — `accrualStampYm_` matches `^\d{4}-\d{2}` and anything else
  reads as blank, which SEEDS (fail-safe: credits nothing) rather than
  skipping. Backdating it
  credits the intervening months on the next run, each from the hours that
  month's Timesheet rows actually record (the index reads through
  `TimesheetArchive`, so an old month is not silently worth zero; capped at
  `PTO_ACCRUAL_CATCHUP_MAX_MONTHS`=12, with any capped overflow NAMED in
  the audit row rather than silently absorbed). Sheets may coerce the cell
  to a Date — every read routes through `accrualStampYm_` (the
  `normalizeDate_` class). `ROSTER_CACHE_KEY` bumped to v11.
<a id="operator-roster-cache-key-employee-roster-v11"></a>
- **`ROSTER_CACHE_KEY` = `'employee_roster_v11'`** — bumped for the
  `AccruedThrough` column (R, automated accrual credits, 2026-08-18);
  previously v10 for `PtoAccrual` (Q, same day), v9 for
  `PayRate` (P, pay statement, 2026-08-17), v8 for the `Schedule`
  column (O, Turn D per-rep shift override), v7 for Departments/DeptRequests
  v2, v6 for `ManagerEmail`/T3, v5 for CallNotesSheetId. After deploying,
  stale v10 cache entries expire naturally within 5 min (or run
  `clearCaches_()` from the editor).
<a id="operator-call-notes-department-list-state-tax-rates"></a>
- **Call-notes department list + state tax rates** are read by
  `getDepartmentEmails_()` and `getStateTaxRates_()`, which check
  Script Properties (`CN_DEPARTMENT_EMAILS`, `CN_STATE_TAX_RATES`)
  first, then fall back to `CONFIG.CALL_NOTES.DEPARTMENT_EMAILS` /
  `STATE_TAX_RATES`. Adding or changing a department or rate: use the
  **Admin tab** in Call Notes (manager-only), which writes to Script
  Properties and takes effect immediately. Alternatively, set the
  Script Properties directly or edit CONFIG and redeploy.
  `STATE_ABBR_TO_NAME` remains CONFIG-only (no admin UI — rarely
  changes). Similarly, `CN_UPDATE_SUGGESTIONS` stores the
  per-department update-type datalist suggestions as JSON; editable
  via the Admin tab or Script Properties directly.
<a id="operator-script-property-cn-archived-tags"></a>
- **Script Property `CN_ARCHIVED_TAGS`** (auto-managed). JSON array
  of lowercase tag strings marked as archived via the Call Notes →
  Admin tab's tag actions. Created on first archive, deleted when
  the last tag is unarchived. No manual setup needed — documented
  here so it's visible when inspecting Script Properties. Read by
  `getArchivedTagsSet_()`; written by `setArchivedTagsSet_()` from
  `archiveCallNoteTag`. Archive does NOT modify any notes; tags
  remain on every existing note's `subformData.tags[]`.
<a id="operator-script-property-cn-email-templates"></a>
- **Script Property `CN_EMAIL_TEMPLATES`** (auto-managed). JSON array
  of `{name, recipientType, body}` external-email message templates,
  written by `saveEmailTemplates` from the Call Notes → Admin tab's
  "Email Templates" section. Created on first save; read by
  `getEmailTemplates_()` (falls back to `CONFIG.CALL_NOTES.EMAIL_TEMPLATES`,
  default `[]`). No manual setup needed — documented here so it's
  recognizable when inspecting Script Properties. Reps see the
  templates in the external-email composer's template picker (delivered
  via `getCallNotesDepartments`); a corrupt blob degrades to the CONFIG
  fallback rather than breaking the composer.
<a id="operator-script-property-cn-external-links"></a>
- **Script Property `CN_EXTERNAL_LINKS`** (auto-managed). JSON array of
  `{label, url, category}` manager-curated quick links (survey / feedback /
  Google-review URLs hosted OUTSIDE this app; `category` ∈
  `survey`/`review`/`feedback`/`other`, default `other` — back-compat, no
  migration), written by `saveExternalLinks` from the Call
  Notes → Admin tab's "Quick Links" section. Created on first save; read by
  `getExternalLinks_()` (sanitize-on-read — keeps only entries with a label +
  an http(s) url; falls back to `CONFIG.CALL_NOTES.EXTERNAL_LINKS`, default
  `[]`). Delivered to reps via `getCallNotesDepartments` (and managers via
  `getAdminConfig`); the external-email composer's quick-link picker appends the
  chosen `label: url` to the message. This is the workaround for the
  admin-blocked external fillable-form route — reps email a link to an external
  survey/review host instead. No manual setup needed.
<a id="operator-script-property-cn-feature-flags"></a>
- **Script Property `CN_FEATURE_FLAGS`** (auto-managed). JSON object
  `{ flagKey: bool }` of manager-set feature-toggle overrides, written by
  `saveFeatureFlags` from the Call Notes → Admin tab's "Feature Toggles"
  section. Created on first save; read by `getFlag_()` /
  `getFeatureFlagsResolved_()`, which fall back to the `FEATURE_FLAGS`
  registry defaults (each mirroring its legacy CONFIG constant) when a key
  is absent. A corrupt/non-object blob degrades to defaults (sanitize-on-
  read). No manual setup needed — documented here so it's recognizable
  when inspecting Script Properties. Only registry keys are honored; flips
  take effect server-side on the next request and client-side on the next
  config fetch.
<a id="operator-script-property-automation-digest-last-runs"></a>
- **Script Property `AUTOMATION_DIGEST_LAST_RUNS`** (auto-managed). JSON
  object `{ eod|urgent|weekly|trainingOverdue|deptReqReminder|managerBrief|selfTest|coachingRecap|spanishAutoAssign:
  "yyyy-MM-dd HH:mm:ss" }` (CONFIG.TIMEZONE
  wall time) stamped by each digest run (`stampDigestLastRun_`) — the
  heartbeat behind the Automation Health panel's "Digest heartbeats"
  block. Created on the first post-deploy digest run; no manual setup.
  Until each digest has run once, the panel shows "no heartbeat recorded
  yet" — not an error. (`managerBrief` stamps on every 8am run even while
  the `managerDailyBrief` flag is off — the trigger's liveness is
  observable independent of the feature toggle, INV-151. `spanishAutoAssign`
  does the same on every hourly run while the `spanishAutoAssign` toggle is
  off — stale past 2h; the reported heartbeat set is DERIVED from
  `DIGEST_STALE_HOURS`, so a new key with a window is read the day it lands.)
<a id="operator-consolidated-manager-daily-brief-is-off-by-default-inv-151"></a>
- **Consolidated manager daily brief is OFF by default (INV-151).** Flip the
  `managerDailyBrief` feature toggle (Manage → Admin → Feature Toggles; it
  lives in `CN_FEATURE_FLAGS`, no dedicated Script Property) and **re-run
  `installAutomationTriggers()` once** so the daily manager-tz 8am
  `sendManagerDailyBrief` trigger exists. While on: ONE branded morning email
  per manager consolidates urgent notes / missed clock-outs / overdue
  training-docs-coaching / dept-SLA overdue, and those four streams suppress
  their separate MANAGER emails (employee reminders, the weekly digests, and
  the automation-failure watchdog still send). Silent on an all-clear morning.
  Flip it off to restore the individual digests instantly (next trigger runs).
<a id="operator-clienterrors-sheet-tab"></a>
- **`ClientErrors` sheet tab** (auto-provisioned in the ADP spreadsheet on the
  first client-error beacon, INV-150). PHI-free diagnostics — exception
  message/stack + view key per row, never form-field values. Read by the
  Admin → Automation Health "Client errors" section (bounded tail scan,
  7-day window). Grows slowly (client dedupes + caps 5/session; server caps
  20/hour/rep). **Retention since 2026-09-11:** `CLIENT_ERR_RETENTION_DAYS`
  (Script Property → CONFIG, default 0 = disabled) — set from Manage → Admin →
  Config → Retention; `purgeOldDiagnostics` (trigger #20) deletes older rows
  nightly, and Storage Health's ADP row names the live window. Unset = kept
  forever, trim by hand. The `runAllTests` beacon test deletes its own
  `TEST_` rows.
<a id="operator-viewusage-sheet-tab"></a>
- **`ViewUsage` sheet tab** (auto-provisioned in the ADP spreadsheet on the
  first view-enter after the 2026-08-13 observability deploy). PHI-free
  feature-usage telemetry — Timestamp / EmployeeId / View / Mode per row,
  plus a trailing `BootTiming` JSON cell on the landing-view row since
  2026-09-04 (`{shell,state,view}` ms — see the boot-timing note in the
  observability KDD), never content. Written by `recordViewEnter` (rep-gated, USER lock,
  rate-capped 120/hr/rep; the client throttles to one send per view per
  5 min and skips View-as previews); read by the admin-gated
  `getViewUsageStats` behind the Admin → Overview "Feature usage" panel
  (bounded 8000-row tail, 7d/30d windows). Grows slowly. **Retention since
  2026-09-11:** `VIEW_USAGE_RETENTION_DAYS` (Script Property → CONFIG, default
  0 = disabled), edited beside `CLIENT_ERR_RETENTION_DAYS` in Manage → Admin →
  Config → Retention → "Diagnostics tabs (PHI-free)" (danger-confirmed like the
  call-note purges), purged nightly by `purgeOldDiagnostics` (trigger #20 —
  2000 rows per run, contiguous bottom-up deletes, an unparseable timestamp
  never deleted, the `DiagnosticsPurge` audit row as the heartbeat checked
  only while a window is set), and reported on Storage Health's ADP row.
  This CLOSES cycle-18 F11 — until then these were the only two stores with
  NO retention tier at all, "trim manually" was an obligation nobody was
  reminded of, and neither tab was surfaced by Storage Health. Both windows
  default 0, so a fresh deploy still keeps everything; set them only when
  the tabs bother you.
<a id="operator-script-property-whatsnew-kb-id"></a>
- **Script Property `WHATSNEW_KB_ID`** (optional — the "What's new" panel,
  INV-152). Set it to the ID of a PUBLISHED Reference **article** (create a
  "What's new" article in the Reference tool, copy its id from the KB sheet
  or the reader URL-free id in the editor) and every rep gets a one-time
  dismissible panel rendering it on next load — re-surfaced automatically
  whenever the article is EDITED (the edit timestamp is the seen-stamp).
  Unset = feature fully dormant. Drafts/embeds never show; maintain the
  changelog like any other KB article.
<a id="operator-script-property-mail-bcc-all"></a>
- **Script Property `MAIL_BCC_ALL`** (optional — operator 2026-09-03: "any
  email the app sends, BCC me"). A comma-separated address list appended as
  BCC to EVERY email the app sends — the 26 automated senders through the one
  `appSendMail_` seam, and the rep-identity `sendRepEmail_` on both its
  branches. Unset = no change. It never clobbers a caller's own bcc (the
  intake `INTAKE_BCC_EMAIL`, the agent self-BCC), and an address already in
  to/cc/bcc is not added twice; a malformed entry is dropped; read once per
  execution. Set it to your address while testing; clear it when you no longer
  want the copies. No redeploy to change. **Since 2026-09-09 it is VISIBLE:**
  Manage → Admin → System carries a mail-routing capability line above the
  Storage inventory and a matching finding, so a copy left on is discoverable
  in one look instead of only from Script Properties. Set-and-internal reads
  as a standing warning naming the address and what those copies carry; an
  address OUTSIDE the deploying account's own domain reads as BLOCKING; unset
  reads as a fact under "checks passing", never a warning. The report never
  changes what is sent — an address you typed is always honoured, because a
  silent drop would leave you believing in copies you are not getting.
<a id="operator-script-property-rep-sender-from"></a>
- **Script Property `REP_SENDER_FROM`** (optional — the NEUTRAL shared sender
  for rep-initiated emails; pilot round-1 follow-ons, 2026-08-24; DORMANT
  until configured — the `WHATSNEW_KB_ID` posture). Rep-initiated sends
  (dept / external / intake — all six routes go through `sendRepEmail_`)
  always carry the agent's display name (the agent's name alone since the
  2026-08-27 operator correction) + Reply-To + an agent self-BCC; the true
  From ADDRESS is
  the deployer's, because the app runs `executeAs: USER_DEPLOYING` and no
  code change can alter that. To send from a neutral shared address instead:
  (1) in the DEPLOYING account's Gmail → Settings → Accounts → "Send mail
  as", add the shared alias — **on this deployment the operator's choice is
  `customersuccess@universalmedsupply.com`, already registered as a send-as
  option on the deploying account** — (2) set this property to
  that address. No redeploy — the next send picks it up. The value is
  validated against `GmailApp.getAliases()` per execution: set-but-
  unregistered, or any Gmail failure, falls back to the normal MailApp path
  with a console warning, so a typo'd property can never break sending.
  Side effect worth knowing: when active, sends go via GmailApp, which ALSO
  writes each email to the deployer's Gmail **Sent** folder (MailApp does
  not) — an audit trail, not a leak; the send quota pool is unchanged.
  Automated digests/alerts/exports never use it (system identity).
<a id="operator-timesheet-cold-archive-is-off-by-default-inv-153"></a>
- **Timesheet cold-archive is OFF by default (INV-153).** `archiveOldTimesheetRows`
  (daily manager-tz 6pm trigger — moved off 1am in cycle 8, the offshore
  mid-shift lock-contention window; re-run `installAutomationTriggers()` once
  to pick up the new hour) MOVES Timesheet rows whose date is older than
  `TIMESHEET_ARCHIVE_DAYS` — Script Property first, then
  `CONFIG.TIMESHEET_ARCHIVE_DAYS` (default **0 = disabled**) — into a
  `TimesheetArchive` tab in the SAME ADP spreadsheet. **Nothing is ever
  deleted** (payroll is keep-forever; there is deliberately NO purge tier),
  so enabling it is safe: it bounds the LIVE tab that `getManagerDashboard`,
  the exports, and the calendars read whole — the read volume that otherwise
  grows unboundedly. **Recommended: set Script Property
  `TIMESHEET_ARCHIVE_DAYS=365`** (a payroll year). Values below the
  `TIMESHEET_ARCHIVE_MIN_DAYS` (120) safety floor clamp UP so a typo can never
  strip active-window rows (adjust window 30d, current export period,
  dashboard trends). NOTE archived rows leave the in-app month navigation
  (the employee calendar / manager timesheet views read the live tab only) —
  they remain in `TimesheetArchive` for payroll audit. No redeploy to change
  the window; installing the trigger requires `installAutomationTriggers()`.
  **Two cycle-12 fixes make enabling this genuinely safe — do NOT enable it on
  a build older than that batch:** (a) F1 — the **ADP export now reads through**
  the archive when a requested range predates the live tab, so a retroactive
  payroll export is complete; before F1 the archive had no reader at all and
  such an export silently produced a PARTIAL `.xlsx` behind a success response.
  (b) F3 — the nightly move is **bounded to
  `TIMESHEET_ARCHIVE_MAX_ROWS_PER_RUN` (2000) rows**, so a large first enable
  drains over successive nights instead of timing out mid-run and re-appending
  (duplicating) payroll rows into the archive every night. Expect several
  nights of `rowsArchived=2000; hitPerRunCap=2000` audit rows on the first
  enable — that is the backlog draining, not an error. Still live-tab-only
  (accepted): the employee calendar, `getPunctualityReport`, and the sheet
  doctor's 92-day scan.
<a id="operator-call-notes-eod-weekly-digest-knobs"></a>
- **Call-notes EOD + weekly digest knobs** are
  `CONFIG.CALL_NOTES.EOD_WARNING_HOUR` (default 17 — the local hour at
  which each rep gets the EOD digest) and the
  `installAutomationTriggers()` schedule (Friday 8am for the weekly
  digest; the EOD digest is an hourly trigger). `EOD_WARNING_WINDOW_MINUTES`
  is legacy — no longer consulted by the EOD gate (which is now
  local-hour-equality). The EOD trigger is hourly, so deploying the
  hourly change OR changing `EOD_WARNING_HOUR` requires re-running
  `installAutomationTriggers()` for the new schedule/value to take effect.
<a id="operator-config-call-notes-voice-input-enabled"></a>
- **`CONFIG.CALL_NOTES.VOICE_INPUT_ENABLED`** controls the
  voice-to-text mic on Issue / Resolution fields. Default `false`.
  Flip to `true` only after confirming the org's stance on audio
  routed to the browser vendor's speech-to-text service (Chrome →
  Google, NOT covered by typical Google Workspace BAA — PHI in the
  rep's spoken note leaves the browser). Requires a redeploy to
  propagate to clients. When false, the UI never renders the mic
  button (no surface area for accidents).
<a id="operator-formtokens-and-formsubmissions-sheet-tabs"></a>
- **`FormTokens` and `FormSubmissions` sheet tabs** are auto-created
  in the **forms (PHI) spreadsheet resolved by `getFormsSS_()`** (Script
  Property `FORMS_SS_ID`, else the ADP SS for back-compat — see the
  segregation operator note above) on first use of the external forms feature.
  `FormTokens` tracks pending/submitted/expired form links (token,
  formType, recipientEmail, expiresAt, status, prefillData, noteId).
  `FormSubmissions` stores completed form data + signature base64 **plus the
  forms-hardening trailing columns** (`SubmissionHash`, `ConsentVersion`,
  `ConsentAt`, `OpenedAt`, `Certificate`). Both are append-only. ALL timestamp
  cells in both tabs (`CreatedAt`, `ExpiresAt`, `SubmittedAt`) are written in
  `CONFIG.TIMEZONE` — every parse site (`getFormByToken`, `submitFormByToken`,
  `getMySentForms`, `parseRetentionDateMs_`) assumes that tz, and writing
  `ExpiresAt` in the creating rep's tz skewed token expiry by the tz offset
  (±~12h for CST reps) until fixed. Keep new timestamp columns consistent.
  **`ExpiresAt` reads MUST go through `formTokenCellMs_` (coercion-safe).**
  Some spreadsheet locales — notably the Intake sheet `FORMS_SS_ID` is
  segregated onto — COERCE the stored `yyyy-MM-dd'T'HH:mm:ss` string into a
  datetime, so `getValues()` returns a `Date`. The old `String()` +
  strict-`parseDate` threw on that Date and fail-closed EVERY fresh token to
  "expired" (the exact reason `computeFormSubmissionHash_` already excludes
  `submittedAt`). `formTokenCellMs_(cell)` returns `{present, ms}` — a `Date`
  → `getTime()`, a parseable string → ms, a non-empty unparseable string →
  `ms:null` (caller fail-closes as tamper, S2.1), empty → `present:false`. All
  three expiry sites route through it **and fail CLOSED on `!present` too**
  (F cycle-8): a blank/absent `ExpiresAt` is treated as expired. Such a cell
  only arises from corruption or a lossy `FORMS_SS_ID` migration —
  `createFormToken` writes the cell atomically in the appendRow — so the old
  `expX.present &&` guard (which read a blank cell as NOT-expired, a fail-OPEN
  asymmetry with the unparseable-`ms:null` case) let a blank-expiry token stay
  perpetually valid for anonymous PHI submission. Pinned by
  `test_publicForm_blankExpiryFailsClosed`. The client-returned `expiresAt` /
  `createdAt` go through the sibling `formTokenIsoString_` so a coerced Date
  never leaks back as a `"Sat Jun 27 …"` blob. Pinned by the `formTokenCellMs_`
  Node test. (This was latent on the ADP-fallback sheet, which didn't coerce; it
  surfaced when `FORMS_SS_ID` moved to the Intake sheet — a CODE bug, NOT
  fixable by the sheet tz alone.) **The submission-side `FS.SUBMITTED_AT`
  display reads route through `formTokenIsoString_` too (cycle-9 L-5):** the
  in-app submission viewer (`buildFormSubmissionResult_`) and
  `verifyFormSubmissionIntegrity_` were the last raw `String(row[FS.SUBMITTED_AT])`
  reads — on a coercing `FORMS_SS_ID` they rendered a Date blob in the
  "Completed by …" sub-line (harmless to the hash, which excludes submittedAt,
  but visibly wrong). The `markDeptRequestResolved_` `already`-branch
  `RESOLVED_AT` cell (surfaced in `serveResolvePage_`) got the same guard.
  No manual setup needed — the `getOrCreateFormTokensSheet_()` /
  `getOrCreateFormSubmissionsSheet_()` helpers provision them with headers on
  first call.
<a id="operator-punchadjustrequests-sheet-tab-4a"></a>
- **`PunchAdjustRequests` sheet tab (#4a)** is auto-created in the ADP
  spreadsheet on first adjustment request (`getOrCreatePunchAdjustSheet_`).
  Tracks employee-requested punch corrections (ReqId, EmpId, EmpName, Date,
  PunchType, RequestedTime, Reason, Status, SubmittedAt) pending manager
  approval. No manual setup needed.
<a id="operator-form-catalog"></a>
- **Form catalog** is configured in
  `CONFIG.CALL_NOTES.FORM_CATALOG` — each entry maps an ID to a
  filename in the repo's `/forms/` folder. Adding a form: upload
  the PDF to `/forms/`, add an entry to FORM_CATALOG with
  `{id, name, fileName, category}`, and redeploy. PDFs are fetched
  via `UrlFetchApp` from the raw GitHub URL
  (`CONFIG.CALL_NOTES.FORM_BASE_URL`). Interactive (fillable) forms
  must also have a rendering function in `form_public.html`.

## Cycle State & Memory

Claude Code has no memory between sessions; this project runs on Claude Code
on the web (ephemeral containers, repo re-cloned each session), so the
cross-session state lives in **committed** files — `.cycle/` + `PROJECT_HEALTH.md`.
Two memory channels — keep the boundary:
- **Substrate (carry forward):** the systems map, the Invariant Library, Common
  Gotchas, and the score history. Always load these into a new session.
- **Judgment (re-derive fresh):** audit findings + severity calls. A new audit
  uses fresh eyes; never inherit the prior scan's conclusions as authoritative.

`/cycle-resume` continues an *in-progress implementation thread* (substrate +
objective facts: what changed, what's pending, decisions made) — never prior
judgments. Starting a new audit is always fresh.

**Cycle numbering (single source of truth):** the `Cycle:` field in
`.cycle/STATE.md` is authoritative; it increments by 1 when a NEW audit cycle
begins (a fresh `/broad-scan` or `/audit` after the prior cycle's `/reflect`).
Every phase within a cycle (audit → plan → implement → regression → reflect)
carries the same number. `/cycle-status` surfaces it.

### `.cycle/` state directory (committed — survives the ephemeral container)
- `.cycle/config.md` — **the Cycle Workflow Config** (Batch D1, 2026-09-14):
  Test Command, Health Dimensions, Axis B, Subsystems, the Invariant Library,
  the Visual Audit Stage, Policy, the Seams cadence, the Regression Scenarios,
  Frozen Subsystems, Deploy Command. It is the one file here that is NOT a
  rolling record — it is stable configuration, and it lives in `.cycle/` because
  that is what every workflow command already reads for cycle machinery.
  CLAUDE.md keeps a stub under the same heading so the commands (which are
  synced byte-identical and cannot be edited locally) still land somewhere that
  redirects. `scripts/counts.mjs` and `scripts/cycle-context.mjs` both PREFER
  this file and fall back to CLAUDE.md, so the move is safe in both directions.
- `.cycle/STATE.md` — the CURRENT cycle ONLY (template below); written by the
  implement commands' CHECKPOINT step, read by `/cycle-resume` + `/cycle-status`
  and the SessionStart hook. **Split (2026-07-24):** STATE.md no longer rolls —
  closed-cycle blocks live in `.cycle/HISTORY.md`. **Close-out procedure:** when
  a new audit cycle opens (or the prior cycle's deploy is confirmed), move the
  finished cycle's whole block into HISTORY.md (newest first, directly below its
  header) and reset STATE.md from the template. **Editing rule (a truncation
  bit this file once):** template headings repeat across cycles, so never locate
  a section by first-occurrence heading SEARCH in a multi-cycle file — the split
  makes STATE.md's headings unique, but the rule still applies to any edit of
  HISTORY.md, which is append-only and must never be edited in place.
- `.cycle/HISTORY.md` — append-only archive of closed-cycle STATE blocks
  (newest first). Never edited after a block lands; heading names repeat freely.
- `.cycle/metrics.csv` — per-cycle metrics appended by `/reflect` / synthesis.
  Header: `date,cycle,subsystem,phase,net_score,prod_fixes,new_failure_modes,category_d_ratio,axis_b_lowest,notes,defensive_count`
  **Local convention:** the canonical `/reflect` leaves `category_d_ratio` +
  `axis_b_lowest` blank (a separate `/synthesis` step fills them), but this
  project has no `/synthesis` command, so fill both at reflect time (cycles 1–3
  did) — `category_d_ratio` = the Category-D/Low share of the cycle's findings,
  `axis_b_lowest` = the weakest Axis-B horizontal category that cycle.
- `.cycle/estimates.csv` — estimate-vs-actual calibration, appended by `/reflect`.
  Header: `date,cycle,action,estimate,estimated_hours,actual_hours,calibration_note`
  **Its inputs are the implement blocks' `Estimate:` / `Actual:` lines and
  STATE.md's `Estimates:` line (Batch P, 2026-09-11)** — written BEFORE the
  first edit, so the row is a measurement rather than a memory. Five consecutive
  reflections (13, 16, 18, 19pre, 19) skipped the calibration row for want of
  exactly that line; the SessionStart hook now says so on every session.
- `.cycle/blocks/` — **the verbatim handoff blocks** (template R19, adopted
  2026-07-27). The three implement commands and `/reflect` write their summary
  block here at CHECKPOINT: `<cycle>-<version-or-scope>-broad-implement.md`,
  `…-targeted-implement.md`, `…-implement.md`, `<cycle>-<letter>-reflect.md`.
  **Every implement block carries `Estimate: S/M/L (h)` and `Actual:` lines
  directly under `Files modified` (Batch P)** — the estimate as it stood in the
  plan message, never reconstructed afterwards; the command template's block
  shape is untouched (it is synced byte-identical), so this is a project
  convention the hook reminds you of, not a template field.
  It exists because the blocks previously lived ONLY in chat scrollback while
  STATE.md carried prose *about* them — a Verification Pass or Health Synthesis
  runs in a FRESH session with none of that context, so a block that never
  reached disk could not reach them. `/audit` deliberately does NOT write here
  (its first instruction is "do not make any changes to any files", so its
  Session Handoff Block still travels by paste). **Cycle 12 predates the
  adoption**, so its six implementation blocks + one cycle-summary block are not
  on disk. Cycle 13 is the first that writes them, and is the reference example
  of a complete set: four `*-broad-implement.md` blocks plus `13-a-reflect.md`.
  **Read the REFLECT block for a closed cycle's tally, not the implementation
  blocks** — cycle 13's reflection corrected its own batch reports in two
  directions (promoting eight interface fixes wrongly scored defensive, and
  counting one new failure mode the batches had reported as zero), so the two
  sources disagree by construction and the reflect block is the later, honest
  one.
- `PROJECT_HEALTH.md` (repo root) — Current Standing + Score History.

**Command templates: synced to `claude-workflow-tools` v1.33.0 (2026-09-09).**
`.claude/commands/` carries 19 of the template's 20 commands, verified
byte-identical at sync time; `/pr-review` is the one not installed (it sits
under the template's separate "Per-Change Review" heading). Record the version
here on every `/sync-commands` — before this line existed the previous version
had to be INFERRED from which features were missing (it was ≤1.18.0, five
releases of command semantics behind: R18's interface lens and R19's block
persistence were both absent). The 1.23.0 → 1.33.0 sync updated four commands,
all additively: **`/broad-scan`** gained a closing **IMPLEMENTATION BATCH PLAN**
(1.26.0) that groups every finding from Stages 1–3 into sequential
`/broad-implement`-sized batches ordered by impact then dependency — a guard
that would turn CI red goes AFTER the batch closing the gap it guards, and
every finding appears exactly once or under `Deferred`; **`/cycle-init`**
inlines the PROJECT_HEALTH.md skeleton instead of cross-referencing a §7 the
command file cannot see, and warns that `portfolio.mjs` / the console Dashboard
parse the labels `Overall (weighted avg):` and the two `Top … priority:` lines
verbatim; **`/reflect`** requires double-quoting ANY metrics field containing a
comma (the `subsystem` column especially — an unquoted comma shifts every later
column); **`/setup-cycle`** rewrites the `Policy threshold` recommendation for
1.33.0's RELATIVE policy trigger. That trigger is the substantive change: §6a
now fires on (a) a decline over `Consecutive cycles`, (b) a sharp drop of ≥1.5
in one cycle, (c) lowest-scoring for `Consecutive cycles` AND not improving, or
(d) the old absolute floor at `Policy threshold` — kept only as a backstop,
because a fixed floor never fired once in six cycles of the template repo,
including one where a category fell 9.0 → 7.0. Note a deliberate scoring discontinuity that
came with R18: cycles ≤11 scored user-visible interface defects as
defensive/structural and excluded them from `net_score`, while 12 onward counts
them as production fixes — nothing was rewritten retroactively, so cumulative
`net_score` spans two rules at that boundary.

Fully optional + additive: with no `.cycle/`, every command behaves as before
(emit the handoff/summary block in chat). `scripts/cycle-context.mjs` IS
installed here and wired as a **SessionStart hook** via `.claude/settings.json`
— it auto-loads the substrate (STATE Current / Where-I-left-off / Pending +
PROJECT_HEALTH Current Standing + invariant count) into each new session, and
since Batch P prints the estimate reminder (record S/M/L + hours per batch
BEFORE the first edit) beneath it
(fail-safe: prints nothing without `.cycle/`, never throws). The
`scripts/render-metrics.mjs` trend-report helper from workflow-tools is NOT
copied — add it if you want the metrics sparkline report.

`.cycle/STATE.md` template:

```
# Cycle State

## Current
Cycle: [N — single source of truth; increments only when a new audit cycle begins]
Phase: [audit | plan | implement | regression | verify | reflect | idle]
Scope: [subsystem(s) or "broad"]
Test Command: [from Cycle Workflow Config]
Estimates: [per batch — "P: S (~2 h) · S: M (~4 h)" — written BEFORE the first edit; /reflect copies estimate vs actual into estimates.csv]
Subsystem cycles since last Seams audit: [K — /reflect increments, a Seams audit resets to 0]
Updated: [date]

## In progress (facts to carry forward — NOT judgments)
- [what is partially done]
- [the next concrete step]

## Completed this cycle
- [action ID] | [file(s)] | [one line]

## Pending / not yet done
- [action ID or description]

## Open follow-on items
- [File: area] — [what to check and why]

## Decisions made (so the next session doesn't re-litigate)
- [decision] — [rationale]

## Where I left off
[1–3 sentences: exactly what to do first on resume]
```

## Running totals (generated — do not hand-edit)

Every number below is DERIVED from the thing that defines it by
`scripts/counts.mjs`, and CI fails on drift (`node scripts/counts.mjs --check`).
**Do not restate one of these in prose.** Each has drifted at least once while
it was hand-carried — the visual-scenario count two high for weeks, INV-136's
admin-endpoint count four times, the harness totals through ~40 batch
paragraphs — and a `/sync-docs` pass that checks file paths and Script
Properties mechanically will still READ a sentence rather than check it. Cite
this block, or the command that prints the number.

<!-- COUNTS:BEGIN -->
<!-- GENERATED by scripts/counts.mjs — do not hand-edit; run `node scripts/counts.mjs --check`. -->

| Count | Value | Derived from |
|---|---|---|
| Pure harness tests | 810 | `node test/client/run.js` |
| DOM harness tests | 113 | `node test/client/dom/runDom.js` |
| Visual matrix scenarios | 102 | `shoot.mjs`'s `SCENARIOS` |
| Editor suite registrations | 316 | `Tests.js`; a run prints its own `Expected:` line |
| Admin-tier endpoints (INV-136) | 50 | `'Admin access required.'` in `Code.js` |
| Manager-gated endpoints | 61 | `'Manager access required.'` in `Code.js` |
| Installable triggers created | 16 | `installAutomationTriggers` |
| Jobs riding a dispatcher | 8 | `TRIGGER_GROUPS` |
| localStorage keys | 18 | `ums…` literals in `web-app/` |
| Invariant library entries | 203 | `.cycle/config.md` |
| Regression scenarios (S*) | 101 | `.cycle/config.md` |

Every figure above is DERIVED. Do not restate one in prose — a second
copy is a second source of truth, and each of these has drifted at least
once while it was hand-carried. Cite the block or the command instead.
<!-- COUNTS:END -->

## Cycle Workflow Config

**Moved to [`.cycle/config.md`](.cycle/config.md).** Commands that say "read
CLAUDE.md's Cycle Workflow Config" should read that file: it carries the Test
Command, Health Dimensions, the Horizontal (Axis B) Categories, Subsystems, the
Invariant Library, the Visual Audit Stage, Policy Configuration, the Seams Audit
Cadence, the Regression Scenarios, Frozen Subsystems and the Deploy Command.

**Test Command: `manual`** — restated here because every implement command reads
it first. The editor suite runs from the Apps Script editor; the Node harnesses
run in CI; the visual matrix is manual. `.cycle/config.md` has the full narrative.

The running-totals block above stays in CLAUDE.md deliberately: it is a
project-wide fact sheet rather than cycle machinery, and `counts.mjs --check`
compares it here.
