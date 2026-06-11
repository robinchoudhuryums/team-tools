# Cycle State

## Current
Cycle: 1
Phase: implement
Scope: broad
Test Command: manual
Subsystem cycles since last Seams audit: 0
Updated: 2026-06-10

## In progress (facts to carry forward — NOT judgments)
- Cycle 1 broad-scan completed 2026-06-10 (findings A1–A10; A11 retracted). ALL selected backlog items are now implemented across this branch: A1–A4, A7 (4f0e170), P#1–P#4 (ac56aa1), P#5/P#6/P#14 (fa78c5e), KB Phase 2 / P#16 (cafad8f), and A8/A9 + P#7–P#13 + P#15 (c956a7d). P#17 (per-call CDR / Neon Option C) is NOT implementable in this repo — external datastore + call-data-reporting pipeline changes; CDR layer already isolated (INV-68).
- Next concrete step: operator deploy + editor `runAllTests()` (first run creates the new `TEST_INTAKE_SS_ID` fixture; ~9 new integration tests haven't executed against a real spreadsheet yet), then `/reflect` to close Cycle 1.

## Completed this cycle
- A1 | web-app/Code.js | FormTokens CreatedAt/ExpiresAt written in CONFIG.TIMEZONE (fixes ±~12h expiry skew)
- A2 | web-app/Code.js, web-app/Tests.js | getTodayPunches_ + dashboard collector sort punches chronologically at the source
- A3 | web-app/script_core.html | "?" shortcut handler skips contenteditable
- A4 | web-app/kb/script_kb.html, test/client/run.js | kbMd_ percent-encodes quotes in link URLs
- A7 | web-app/cn/script_callnotes.html | Sent Forms chips use defined design tokens
- P#1–P#4 | web-app/Code.js | CallNoteManagerComment audit action; domain-only form audit rows; bucket-aware decision email; submitFormByToken notify deferred past lock release
- P#5/P#6 (A6/A5) | web-app/Code.js | bounded per-rep CN reads (ambient/pins/QA/EOD); findFormSubmissionRow_ token-column lookup
- P#14 | Code.js, cn partial, Tests.js | Automation Health admin panel (getAutomationHealth)
- P#16 (KB Phase 2) | Code.js, kb partial, Tests.js, run.js | kbConvertDriveDoc Doc→markdown converter (INV-115, S63)
- A8 (=#13) | web-app/Code.js | getMetricsAmbient cache key threshold-suffixed (`metrics_ambient_v1:<threshold>`)
- A9 (=#10) | web-app/Code.js | submitFormByToken requires `_meta.consentAgreed === true` (absent `_meta` now rejected)
- P#7 | web-app/Tests.js | test_auditPanel_searchAndHistory + getCallNotesAuditLog/getCallNoteAuditHistory gate cases in test_managerGates_rejectNonManager
- P#8 | test/client/run.js | Node tripwire: CN_INTERACTIVE_FORM_IDS (client) === INTERACTIVE_FORM_TYPES (Code.js)
- P#9 | web-app/Tests.js | intake endpoint tests (preview hash+recs, stale-hash send rejected, unauthorized rejected, intakeResolveRecipient_ smoke) + TEST_INTAKE_SS_ID fixture (_setupTestIntakeFixture_, _withTestIntake_)
- P#11 | web-app/Code.js, web-app/Tests.js | punch-adjust dup guards (in-batch + existing-Pending per (date,punchType)) + approval-time adjust-window re-check; 2 integration tests
- P#12 | web-app/cn/script_callnotes.html | sticky form draft 24h TTL (CN_FORM_STICKY_MAX_AGE_MS); stale-PHI drafts discarded, timer reset
- P#15 | Code.js, intake partial, script_core.html, Tests.js | Intake "Sent" tab — intakeListMySubmissions / intakeGetSubmission (caller-scoped, manager-all, bounded detail lookup, read-only); INV-116 + test
- docs | CLAUDE.md | INV-88/106/107/113 amendments; INV-116; S57/S61 expected text; sticky-draft TTL; Intake four-tabs + Sent design decision; TEST_INTAKE_SS_ID fixture note

## Completed post-run (operator's first full runAllTests: 218/233 → fixes pushed as b45d5a6)
- PROD | web-app/Code.js | normalizeAuditTs_ — AuditLog ts cells are Sheets-coerced Dates; String(cell) broke every audit date filter (compliance panel showed ZERO rows). Applied in getManagerDashboard recent-audits, cnReadCallNoteAuditRows_, getAutomationHealth.
- PROD | web-app/Code.js | getCallNotesAuditLog default endDate now CONFIG.TIMEZONE-today (IST-stamped rows no longer hidden from a US-afternoon manager's default view).
- PROD | web-app/Code.js | safeTimezone_ IANA shape gate (V8 formatDate no longer throws on unknown tz ids — the probe alone stopped validating).
- PROD | web-app/Code.js | provisionCallNotesSheet pins new per-rep Sheet tz to the ADP sheet's (normalizeDate_ DateLocal round-trip requires matching tzs).
- TEST | web-app/Tests.js | _withFeatureFlags_ helper; applied to 9 tests broken by the flag migration (CONFIG-mutation idiom dead) + employeeImmediateAdjust default-off (#4a).
- TEST | web-app/Tests.js | setupTestEnvironment aligns test CN sheet tz to ADP tz; fixPto test reads back coerced SubmittedAt; auditPanel test explicit endDate (tz-fuzz hermetic).
- DOCS | CLAUDE.md | two new gotchas (audit-ts coercion; per-rep/fixture sheet tz must match ADP tz), safeTimezone_ gotcha rewrite, INV-16/92/110 amendments.

## Completed (KB feature run: tables/images cc4ad3c, restyle 7a98e42, drawer a03a841, section search 72bbaf1)
- KB-P1 | web-app/kb/script_kb.html | kbMd_ renders GFM tables (alignment, \| escape, header-clamped rows) + inline images (http(s)-only, src quotes percent-encoded, alt quotes entity-escaped, lazy, open-full-size anchor); table/img CSS in .kb-article (shared by the editor live preview); paragraph continuation stops at table lines. NOTE: the partial contains raw NUL-byte code-block sentinels — edit via script, not the Edit tool.
- KB-P2a | web-app/Code.js | kbDocBodyToMarkdown_ TABLE branch emits GFM (row 0 = header, runs pipeline in cells, \| escape, ragged-row pad); warnings now nested-tables + multi-line-cells only (flatten warning gone).
- KB tests | test/client/run.js | 82/82 — table/image render + injection cases, converter GFM cases, mkTable stub upgraded (editAsText/getNumChildren), round-trip tripwire (converter GFM → kbMd_ → <table>).
- KB docs | CLAUDE.md | Reference + KB Phase 2 decisions, INV-115, S62/S63 updated.
- KB drawer | kb partial, script_core.html, Code.js, Tests.js, run.js | Slide-over mid-call Reference panel: Ctrl/Cmd+K toggle + edge tab (CN/Intake views only), mounted on document.body (survives #view-area re-renders), closes on showView nav / Esc-without-overlay; search-first, articles inline via kbMd_, embeds open-in-new-tab; Suggested (client-side title match vs Issue text, kbSuggestMatches_, per-rep toggle) + Recent (kbRecentsPush_, cap 5) in ONE umsKbPanel localStorage blob (key count now 7). Usage loop: kbRecordView (rep-callable, locked, append-only PHI-free KbViews tab) + kbGetUsageStats (manager-gated, bounded, 30d) -> "Most referenced" block on manager Reference tree. INV-117, S64. Node 84/84.
- KB restyle | kb partial | .kb-article matched to the Console register: display-font headings, ledger-vocabulary tables (mono uppercase kicker header + hairline rows), accent-soft blockquote callouts, radius/shadow images.
- KB section search | Code.js, kb partial, run.js | searchReference returns heading-delimited chunks (kbSplitSections_ fence-masked + kbSearchScore_ weighted tokens + kbChunkTruncate_ paragraph cap/fence repair; <=3/doc, 20 total; title-only match = one doc-level hit; embeds title-only). Compiled chunk view (kbChunkGroupsHtml_) in BOTH Reference tab main panel + drawer; "Open ¶" jumps via kbMd_ heading ids (id="kb-h-<slug>"). NEW PARITY PAIR: client kbSlug_ (kb partial) must equal server kbSlug_ (Code.js) — Node parity test pins it (incl. dup-heading -2/-3 walk). Node 89/89.

## Pending / not yet done
- KB AI PLAN (user-approved, sequenced AFTER Cycle 1 close + KB Phase 2b/3): **Phase A = Tier 3 facet guidance** (~2 days). Server: kbGetFacetGuidance(facets) — rep-callable; WHITELIST-ONLY payload (dept ∈ getDepartmentEmails_, updateType ∈ getUpdateSuggestions_ for dept, tags ∈ established taxonomy/suggestion vocabulary only — novel tags DROPPED, flagType/subform-shape/state enums); server re-validates every facet (client mirror is convenience only); canonical order-insensitive facet-hash → CacheService cache (TTL ~6h, generation-salt key bumped by kbSaveItem/kbDeleteItem for invalidation); on miss derive query terms from facets → existing section-search internals → top ~4 chunks → score floor (no API call on thin matches) → UrlFetchApp to vendor (default: Anthropic API, Haiku-class model; key in Script Property KB_AI_API_KEY, model in KB_AI_MODEL) → returns {guidance, sources[]} rendered in drawer as a Guidance card with Open-¶ chunk links; ANY failure/cap → {none} and drawer falls back to existing title-match suggestions (best-effort posture, never blocks). Server daily org cap (KB_AI_DAILY_CAP) + vendor-console hard spend cap. Feature flag kbAiGuidance (default OFF, scope both, danger note: external AI vendor). Collapse-after-seen per facet-hash/day in umsKbPanel. Node tests: whitelist validator, facet-hash canonicalization, prompt-builder escaping; editor: auth + cap tests. NEW INV-118: no free text ever enters the vendor payload (the load-bearing privacy invariant). Zero-result search logging rides along as the Tier-2 demand instrument. **Phase B = Tier 2 ask box** (~1 day on top, gated on observed demand from the zero-result/question log): reuses vendor key/wrapper/retrieval/citation-render/budget counters; adds ask input BELOW search results (search-first funnel), PHI guardrail module (regex pack: phone/DOB/email/SSN/TRX-format both client+server; current-note cross-check client-side — query checked against the in-progress note's caller/patient/callback values; amber capitalized-name-pair heuristic warns), per-rep daily cap — over cap degrades to plain section-search chunks (NOT an error); identical-question short-TTL cache; separate flag kbAiAsk (default OFF). Cost funnel: free search → cached Tier 3 → capped Tier 2 → chunks. Operator decisions still open: vendor confirm (default Anthropic), cap values, model choice.
- KB Phase 2b (converter inline-image export): planned design = converter stays read-only and emits kbdoc:<fileId>:<n> placeholder tokens; kbSaveItem resolves them at save (re-walk Doc in same element order, export blobs to a deployer-owned "KB Images" Drive folder — folder ID in a Script Property, domain-viewable, thumbnail-URL form for <img>), caps ~20 images/doc. Operator must verify a domain-shared Drive image renders inside the HtmlService iframe BEFORE building it out. Then Phase 3: paste-a-screenshot upload in the article editor (reuses the same folder plumbing).
- P#17 — per-call CDR data (Neon Option C): NOT implementable in this repo (external Postgres + call-data-reporting pipeline). Revisit only if/when that infrastructure project is undertaken.
- Operator deploy: `cd web-app && clasp push -f` + Apps Script editor → Deploy → New version (covers everything since the last deploy, incl. the NEW Docs OAuth scope from P#16 — first editor run prompts re-auth).
- Operator: run `runAllTests()` once from the editor (creates the TEST_INTAKE_SS_ID fixture on first run; exercises the ~11 new integration tests).
- (Carried) Operator Script Properties for the Intake/forms/KB feature run: INTAKE_SS_ID, INTAKE_*_EMAIL, FORMS_SS_ID, FORM_DATA_RETENTION_DAYS=90, WEB_APP_URL, KB_SS_ID.

## Open follow-on items
- `intakeSend*` treats `expectedBodyHash` as optional (empty hash skips the guard) — `emailFromCallNote` REQUIRES it; consider tightening for parity (client always sends it).
- `notifyRepOfFailedSubmission_` still sends inside the ScriptLock (P#4 deferred-send parity).
- Existing duplicate Pending punch-adjust rows created BEFORE the P#11 guard aren't cleaned up — managers should deny stale dupes in the queue once.
- Optional: KB batch-convert helper once per-item conversion proves out; digest last-run audit rows for the Automation Health panel.

## Decisions made (so the next session doesn't re-litigate)
- FormTokens timestamps stored in CONFIG.TIMEZONE — parse correctness over display fidelity.
- Punch ordering fixed at the data source, not per-consumer.
- External anonymous web-app access is admin-blocked — external fillable-form route non-functional; not a code bug.
- Absent `_meta` on submitFormByToken is now REJECTED (A9) — the back-compat tolerance window is deliberately closed; the shipped client always sends it, and the external route is admin-blocked anyway.
- Punch-adjust approval re-checks ADJUST_WINDOW_DAYS at approve time — aged-in-queue requests must be denied, not approved (window enforced at both ends).
- Sticky CN drafts expire after 24h — PHI-minimization trade-off accepted (a >24h-old draft is discarded silently); pre-TTL drafts without the `at` stamp still restore.
- P#17 (Neon per-call CDR) is out of this repo's scope by design — the CDR data layer isolation (INV-68) is the only in-repo preparation possible.

## Where I left off
Latest commit 72bbaf1 on `claude/gifted-hypatia-aee7wa` (Node 89/89): KB feature run complete through section-aware search. Operator: redeploy + runAllTests() re-run still pending; then walk S62/S63/S64. Queued: KB Phase 2b (image export) + Phase 3 (paste-upload); user is evaluating semantic/AI search (#5) — options assessment delivered in chat, no commitment yet. Then /reflect to close Cycle 1.
