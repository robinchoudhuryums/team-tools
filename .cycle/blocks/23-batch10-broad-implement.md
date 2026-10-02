---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- KBUI-2 — a partial geocode's error quotes "the closest place found" for the typed address, and the eligibility panel beaconed that text verbatim into the shared ClientErrors tab on the ADP sheet. A patient's street or city could land there. The rep still sees the message; the log now gets a fixed line.
- KB-2 — the AI guidance "enum-only" boundary took its tag vocabulary from the rep's own saved tags, which are free text from the PHI store. A tag that was once a patient's surname went to the vendor prompt and into the AuditLog row the code called PHI-free. Tags now come from the admin's auto-tag taxonomy only, and the audit row carries facet counts, never values.
- INT2-3 — intake PHI drafts expired only when that form was reopened (never while an amend was pending), and the key was shared by everyone on the browser profile. The next rep on a shared profile got the previous rep's patient ("Draft restored"). Drafts now carry their owner, a boot sweep drops expired and other users' drafts, and a restore refuses a mismatch.
- INT-1 — the server counted any non-empty Q43 text as a valid neuro diagnosis. A custom chip "Not sure", "Unknown" or "Pt unsure" (or a direct call) switched on the solid-seat requirement and Group-3, justified as "Neuro Dx". Q43 is now read entry by entry, by token: a leading negation or any uncertainty is not a diagnosis. The client's chip guard applies the same rule.
- INT2-1 — "Not solid" and "Sling (no solid)" read as SOLID seats, so a spinal-curvature patient was recommended a sling seat as "Solid Seat indicated". The validator meanwhile said the row matched no seat branch. A negation now cancels the seat word after it, on the server and in the client twin.
- INT2-2 — the weight was the first number in the answer, ignoring units: "120 kg" read as 120 lbs, and "5'6", 250" read as 5 lbs, both with `unreadable` false. Weight is now read by unit: kg converts, heights are not weights, one bare number or a range is lbs, and several bare numbers are UNREADABLE.
- INT-2 — the server let a rep amend a submission that had already been amended (the guard was client-only). A stale view or a second window dropped the first amendment's changes. It is now refused, naming the newer submission.
- INT2-4 — a catalog edit between preview and send was reported as "The form changed since you previewed it". The send now tells a catalog change from a form change.
- CN-3 — the CallNoteEmail audit row for an "Other" recipient recorded only "Other" and a count, so nothing recorded where the PHI went. It now records the recipient's domain, as ExternalEmailSent does (g36).
- ADM-12 — a cross-rep tag rename/merge could be cut off partway, leaving rewritten notes and no audit row, behind a bare "Server error" toast. It also never touched NotesArchive. It now writes a "started" row before the walk, walks the archive tab, and a transport failure says it may have partly applied and is safe to re-run.
- ADM-13 — the two diagnostics purge windows (ViewUsage, ClientErrors) are labelled irreversible but saved with no confirm. Turning one on or shortening it now asks first.
- CORE-03 — a manager could call `runNightlySelfTest` from the browser. It stamped the heartbeat, failed the owner check, stored a false red self-test and emailed every manager, masking a dead 1am trigger for 26 hours. Two more gaps:
  - `installAutomationTriggers` recorded the visiting manager as the trigger owner.
  - `removeAutomationTriggers` left no audit trail.
  Now the self-test refuses non-owners before stamping, the stamp names the account the triggers run as, and removal writes an audit row.
- CORE-04 — saving an empty department map brought back CONFIG's eleven real department addresses. A cleared map now stays empty (the C5 rule).
- CORE-05 — doGet's outsider check tested `@umsupply.com` alone, while the org's Workspace domain is `universalmedsupply.com`. It now reads both domains exactly, and the resolve page no longer names a single domain.
- CORE-06 — the dev-tool instructions could not be followed: the Run button passes no arguments and hides `_` functions. `devShowConfig_` also showed fallback-to-real-address keys as plain "(unset)" and omitted four keys. Now:
  - two owner-only editor entry points;
  - a config line that says when "(unset)" means a real address;
  - the missing keys listed;
  - the docs corrected.
- TRN-2 — a correct answer cut off by the option cap got the false warning "had no correct answer marked". It is now named as cut off.
- MET-5 — a Dashboard load before the daily CDR import cached a lag-misaligned MTD comparison for six hours. A period-to-date window is no longer cached while its newest data day is earlier than the previous workday.
- MET2-1 — the range hero compared the period with itself under two weightings ("vs period daily average"), measuring volume skew. Rates are now call-weighted, and a delta is drawn only against a different window (the single-day 30-day team rate).

Files modified:
- web-app/kb/script_kb.html
- web-app/70_kb.js
- web-app/intake/script_intake.html
- web-app/60_intake.js
- web-app/script_core.html
- web-app/30_callnotes.js
- web-app/cn/script_callnotes.html
- web-app/10_core.js
- web-app/00_config.js
- web-app/61_forms.js
- web-app/DevTools.js
- web-app/80_training.js
- web-app/40_metrics.js
- web-app/metrics/script_metrics.html
- docs/deployment.md (CORE-06's own fix: the dev-tool steps)
- test/client/run.js
- test/client/dom/runDom.js
- test/client/server-split-manifest.json
- CLAUDE.md (generated running-totals rows only)
- .cycle/STATE.md
Estimate: L (~11 h) — Batch 10, written before the first edit
Actual: ~4.5 h

CHANGES:
KBUI-2 | kb/script_kb.html | `OOP_ELIG_BEACON`, a fixed line. `errorStateHtml_(msg, OOP_ELIG_BEACON)` on the three eligibility render paths: an eligibility `res.error` in `oopRenderResults_` (ctx.elig), the eligibility RPC's failure handler, and `oopDegraded_`'s fallback failure. A price-only error still beacons its own text. The map distances never beaconed (they use `textContent`).
KB-2 | 70_kb.js | `kbGetFacetGuidance`'s tag vocabulary is `getAutoTagRules_()`'s tags (Admin → Config → Auto-tag rules), not `getCallNoteTagSuggestions()`. New pure `kbAiFacetCounts_`. The audit row is `facets=dept:N,update:N,flag:N,tags:N`. The cache key and the client's facet hash are unchanged.
INT2-3 | intake/script_intake.html, script_core.html |
  - `intakeDraftOwner_` (the signed-in email); a draft is written only with an owner.
  - New pure `intakeDraftsKept_(all, owner, now)` keeps only the owner's unexpired drafts; an ownerless one is dropped.
  - `intakeSweepDrafts_` runs in the shell's load handler once `empState` is set.
  - `intakeRestoreDraft_` clears instead of restoring a draft with another owner, or none.
  - The one localStorage key is unchanged (the count is pinned).
INT-1 | 60_intake.js, intake/script_intake.html | New pure `intakeNeuroEntryIsDx_` and `intakeNeuroDxEntries_`:
  - Not a diagnosis: a leading negation token (no, n/a, na, none, nothing, denies, denied, negative, neg, not, nil).
  - Not a diagnosis: an uncertainty token anywhere (unsure, unknown, unk, uncertain, tbd, dunno), or "not sure", "don't know", "?".
  - "normal …" and "non-…" still count.
  - `hasValidNeuroDiagnosis` = any entry counts. The client chip guard calls the twin `intakeNeuroEntryIsDxClient_`, pinned equal on a grid.
INT2-1 | 60_intake.js, intake/script_intake.html | `intakeSeatKinds_` and `intakeSeatKindsClient_`: not / no / non / without cancels the next seat word, and is not itself an unknown word.
INT2-2 | 60_intake.js, intake/script_intake.html | `intakeParseWeight_`:
  - Strips heights (5'6", 5 ft 6 in, 66 in, 168 cm).
  - The first number WITH a unit wins; kg × 2.20462, to 0.1 lb.
  - Else one bare number, or a range ("250-260", "300 to 320") — its first number.
  - Else UNREADABLE.
  - It returns `unit` and `value`. The explain row shows "264.6 lbs (from 120 kg)". The unreadable text (explain row and client warning) now says "could not be read as one weight".
INT-2 | 60_intake.js | `intakeAmendSource_` reads the AmendsId column and returns `{superseded}` when a later row amends this id. Both send paths refuse through `intakeSupersededMsg_` before the send: "already amended on … — open the newest version … Nothing was sent."
INT2-4 | 60_intake.js, intake/script_intake.html | New `intakePpdAnswersHash_` (the body with no recommendations). The preview ships `answersHash`; the client puts it on the payload as `previewAnswersHash`. On a body-hash mismatch, matching answers read "The recommended products changed since you previewed (the product catalog was updated)…". An older client without the hash keeps the old message.
CN-3 | 30_callnotes.js | `otherDomain` = `intakeEmailDomain_(selections.individualEmail)` when 'Other' is a recipient. The audit row adds `; otherDomain=<domain>`, never the address.
ADM-12 | 30_callnotes.js, cn/script_callnotes.html |
  - `applyTagTransformAcrossReps_` walks Notes then NotesArchive (when present) and returns `archivedUpdated`.
  - New `cnTagAdminStartAudit_` writes "<verb> X → Y; started — no completion row after this one means the run stopped partway; run it again to finish" before the walk. The completion row reads "done; … (archived=N)".
  - Client: both failure handlers toast `cnTagTransformFailMsg_` ("did not finish … may have PARTLY applied … safe to repeat"), sticky.
ADM-13 | cn/script_callnotes.html | New pure `cnRetentionDiagChanges_(prev, payload)` lists each diagnostics window turned on or shortened. `cnSaveRetention_` asks "Delete older diagnostics rows?" before the RPC, or folds them into the call-note purge confirm.
CORE-03 | 10_core.js |
  - New pure `scriptOwnerMatch_` and `callerIsScriptOwner_` (the suite's rule, held in production code).
  - `runNightlySelfTest` returns `{error}` for a non-owner BEFORE `stampDigestLastRun_`.
  - `installAutomationTriggers` stamps `{ email: <effective user>, by: <caller>, at }`.
  - `removeAutomationTriggers` counts what it deleted, writes an `AutomationTriggersRemoved` audit row, and returns `{removed}`.
CORE-04 | 10_core.js | `getDepartmentEmails_` returns `{}` for a deliberately-cleared map. An all-junk object still degrades to CONFIG.
CORE-05 | 00_config.js, 10_core.js, 61_forms.js | `CONFIG.ORG_EMAIL_DOMAINS` = universalmedsupply.com, umsupply.com. New pure `isOrgEmail_` (exact domain, case-insensitive). doGet's outsider check uses it. The resolve page reads "your UniversalMed Supply work account".
CORE-06 | DevTools.js, docs/deployment.md, test/client/run.js |
  - `devScrubRosterForMe` and `devShowConfig`, editor entry points whose first statement is `_assertSuiteCaller_`.
  - New pure `devConfigValueLine_` marks a recipient key that falls back to a real address; `devShowConfig_` also lists QA_SS_ID, KB_IMAGES_FOLDER_ID, MAIL_BCC_ALL and REP_SENDER_FROM.
  - The PUBLIC-GATE pin holds DevTools.js to the Tests.js rule (owner check first).
  - deployment.md steps 5, the guard note and the before-first-send line are corrected.
TRN-2 | 80_training.js | `importQuizFromForm` keeps the 1-based index of a correct answer the cap removed (`cutOffCorrect`) and warns that it "was past the first 6 options kept … option 1 is a placeholder".
MET-5 | 40_metrics.js |
  - `getCdrAgentMetrics_` meta carries `latestDate`.
  - The Dashboard's shaped window carries it.
  - New pure `dashboardImportPending_(range, latestDate, prevWorkday)`.
  - The cache put also requires `!importPending`. The previous workday is the bar, so a Monday and a post-holiday morning still cache.
MET2-1 | metrics/script_metrics.html | New `mTrendWeightedPct_` (Σanswered / Σ(answered+missed)) is the hero baseline on both surfaces.
  - My Stats' trend IS the hero's range, so it draws no delta; the baseline stays.
  - Team draws a delta only single-day: "vs 30-day team rate".
  - The unweighted `mTrendAvg_` is removed.
(tests) | test/client/run.js, test/client/dom/runDom.js | Moved pins that encoded the old shapes:
  - C17-13 drives the shared Q43 rule.
  - The engine sandbox loads the two new Q43 helpers.
  - F-10's fake rep Sheet gained `getParent` and the archive name.
  - FU-B6e asserts the runs-as stamp.
  - #8's wording pin now reads "vs 30-day team rate" and no "period daily average".
  - F-32's average check is now on `mTrendWeightedPct_`.
  - The M2/M8 and M7 dashboard pins carry the import gate and the kept `dqRes`.
  - The M-2 intake flush test sets the signed-in user.

TEST RESULTS: passed.
- Pure: 1202/1202 (was 1191). Eleven new pins, all driving the real functions in a sandbox except CN-3 (structural, with the domain helper driven):
  - KB-2 drives `kbGetFacetGuidance` end to end: the rep's surname tag never reaches the vendor prompt, and the audit row counts facets.
  - INT-1 / INT2-1 / INT2-2: Q43, seat and weight grids; server and client twins agree entry by entry; the engine and the explain row.
  - INT-2 drives `intakeAmendSource_` over a fake sheet, and checks the refusal is placed before the send.
  - INT2-4 drives `intakeSendPPD` with the catalog changed vs the answers changed.
  - CN-3.
  - ADM-12 drives `renameCallNoteTag` over a live and an archive tab, then a run killed mid-walk.
  - ADM-13.
  - CORE-04 / 05 / 06: grids, plus the doGet line.
  - CORE-03 drives `runNightlySelfTest` as a non-owner manager (nothing stamped), and `removeAutomationTriggers` (audit row).
  - TRN-2 drives `importQuizFromForm` over a fake FormApp.
  - MET-5 / MET2-1: the import-pending grid (a Monday's bar is the Friday), and the weighted-rate grid.
- DOM: 214/214 (was 210). Four new drives:
  - KBUI-2: an eligibility error is shown but the beacon gets the fixed line; a price-only error still beacons its own text.
  - INT2-3: the boot sweep keeps only your own draft; another user's draft is never restored.
  - ADM-13: the confirm comes before the RPC.
  - ADM-12: the real merge flow fails in transit, and the sticky "PARTLY applied" warning shows.
- lint:server clean; counts --check agrees; split manifest current.
- 33 bite-checks, all BITE: KBUI-2, KB-2 ×2, INT2-3 ×3, INT-1 ×2, INT2-1 ×2, INT2-2 ×2, INT-2, INT2-4, CN-3, ADM-12 ×3, ADM-13 ×2, CORE-04, CORE-05 ×2, CORE-06 ×2, CORE-03 ×3, TRN-2, MET-5 ×2, MET2-1 ×2.
  - One NO BITE first: MET-5's cache gate was asserted only in the M2/M8 pin, not the MET-5 pin the bite named. The MET-5 pin now asserts the gated put too; it bit against both.
  - The TRN-2 pin's first draft had a source-shape fallback for when the drive could not run, and it took that fallback (a stub name was wrong). The fallback is deleted, so the pin can only pass by driving (g138).
- Visual: metrics-light-wide, metrics-team-light-wide, metrics-team-today-light-wide and metrics-light-mobile — 0px overflow, nothing missing, no console error (the font-CDN certificate aside). Read:
  - The Team range hero has no self-comparison and keeps its dashed baseline.
  - Today shows a dash with no delta.
Regression Scenarios (Test Command `manual`), walked against the changed paths; none run on a deployment:
- S59 Intake PPD send: PASS — the weight is read by unit (the warning names an unreadable answer); "Not sure" on Q43 is refused as a chip and not counted by the engine; a catalog change after preview is named.
- S60 PMD/PAP: PASS — the amend refusal applies to both send paths.
- S87 Catalog browse: PASS — a "Not solid" row reads as neither seat, in the browse and the validator.
- S112 OOP eligibility: PASS — messages are unchanged on screen; the beacon line is fixed.
- S66 AI guidance: PASS — guidance fires on an admin-taxonomy tag; the audit row counts.
- S19 composer / S56: PASS — an Other recipient's domain is on the CallNoteEmail row.
- S53 tag rename/merge: PASS — the archive is included, the started row comes first, and a transport failure warns.
- S106 diagnostics retention: PASS — shortening asks first.
- S51 Admin config: PASS — saving a cleared department map keeps it empty (direct RPC; the client still blocks an empty save).
- S30 / S117 trigger handlers and automation health: PASS — a manager's browser call to the self-test is refused before any stamp; the trigger-owner detector reads the runs-as account.
- S68 quiz import: PASS — a cut-off correct answer is named.
- S41 My Stats / S42 Team Metrics: PASS — no self-comparison on a range; the single-day Team delta is "vs 30-day team rate". S42's Steps still say "vs period daily average" — a doc update, not a defect.
- S116 Dashboard MTD: PASS — a pre-import load is not cached.
- Blue-green (docs/deployment.md step 5): the editor entry points replace the unrunnable call.
REGRESSION RISKS:
- KB-2: guidance now fires only for tags on the admin's auto-tag list. A rep's other tags no longer drive it, until the admin adds them to the taxonomy.
- INT2-3: a draft saved before this deploy has no owner and is dropped at the next boot. That is at most 24 hours of in-progress intake; announce it.
- INT-1: "Not …"-leading entries no longer count, and real conditions phrased that way would be missed. The canonical list has none (the Q43 list pin still passes).
- INT2-2: two bare numbers that are not a range now read as UNREADABLE: no capacity filter, with the warning shown. Before, they read as the first number.
- CORE-05: a non-employee signed in on `universalmedsupply.com` now passes the shell's outsider page. That is the carve-out's documented intent; every endpoint still returns null for a non-employee.
- CORE-03: anyone pressing "run self-test" from a browser now gets a refusal; only the trigger and the editor run it.
- MET-5: before the daily import the Dashboard re-reads on every load instead of serving a cached answer — slower mornings until the import lands.
- MET2-1: My Stats no longer shows a "vs average" line on a range.
INVARIANTS AT RISK: None broken. Checked and holding:
- g146 / S3: a typed address no longer rides the error beacon.
- INV-119 (enum-only vendor payload) is now true by construction.
- g35 / g36: the CallNoteEmail row stays PHI-free; a domain is not an address.
- g112: no new localStorage key.
- g156: Q43, seat and weight are read by token.
- g41: a decision engine reading operator data fails toward "unreadable", never a guess.
- g143 / PUBLIC-GATE: the two new DevTools functions are gated owner-first, and the pin holds DevTools.js to it.
- g26: trigger handlers.
- g122: a cleared map is not replaced by a plausible default.
- g129: a degraded MTD round is not cached.
- g131: the comparison rule is one helper.
- INV-145: no close hook changed.
- The F4 mirror pin: no verbatim fixture function changed.
NET SCORE: 0 − 0 = 0. All eighteen are defensive, real on their paths, with no recorded incident this month.
- KBUI-2 needs a partial geocode with no item typed.
- KB-2 needs AI guidance on (a key and the flag) and a PHI-shaped tag.
- INT2-3 needs a shared browser profile.
- INT-1 / INT2-1 / INT2-2 need those answers or catalog cells.
- MET-5 needs a Dashboard load before the import, which may well happen daily but has not been reported as wrong numbers.
New failure modes: none identified; the trades are listed above.

OPERATOR ACTIONS / DEPLOY:
- Tell the team that an intake draft started before this deploy will not be restored after it (drafts now belong to the person who typed them). | BLOCKS DEPLOY: N
- If AI guidance (`kbAiGuidance`) is on, the tags it uses are now the Admin → Config → Auto-tag rules list; add any tag you want it to guide on there. | BLOCKS DEPLOY: N
- On the DEV instance, run `devScrubRosterForMe` / `devShowConfig` from the editor (they replace the documented `devScrubRoster_('…')` call, which could not run). | BLOCKS DEPLOY: N
Deploy: Server + Client (KB, Intake, Call Notes, Admin, Metrics, Training, shell): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- MET-5 stops PINNING the misaligned pre-import numbers, but the pre-import load itself still shows them, for one load. A window that knows its data stops a day early (dataThrough = latestDate, and the prior window shortened to match) would remove the transient; that is a larger change.
- INT2-2 knows kg and lb only. A weight in stone ("18 st") reads as 18 lbs and passes the capacity filter; a unit it does not know should arguably be UNREADABLE.
- The intake "custom" recipient (INT-3, deferred by the operator) still accepts any address.
- `mTrendAvg_`'s removal leaves the 40_metrics comment updated, but the cached visual bundle (test/visual/page.html) still carries the old function until the next build.
- No editor-suite (Tests.js) case covers: the self-test owner refusal, the trigger-removal audit row, the Q43/seat/weight parsers, the superseded-amend refusal, or the archive walk.

DOCUMENTATION UPDATES NEEDED:
- docs/gotchas.md + CLAUDE.md index:
  - g146: KBUI-2, a server message that QUOTES the input is the same leak.
  - g156: INT-1 / INT2-1 / INT2-2.
  - g41: the seat validator's misleading verdict (INT2-1).
  - g122: CORE-04.
  - g26 / g143: CORE-03, and the DevTools owner rule.
  - g36: CN-3.
  - g129 / g148: MET-5, a lagged window read before its data lands.
  - The M3 decision / g131: MET2-1, weighted everywhere.
  - Possibly a new gotcha: "a vocabulary built from user text is user text" (KB-2).
- docs/design-decisions.md:
  - KB AI Phase A: the vocabulary is the admin taxonomy; the audit carries counts.
  - Intake Sent / amend: the server refuses a superseded amend.
  - Department emails: a cleared map stays empty.
  - "Web app runs as the deployer": the org-domain list.
  - The Metrics hero: no self-comparison.
- docs/modules.md: Intake (drafts per user, Q43/seat/weight, amend, catalog-change message); Reference (eligibility beacon, AI guidance); Call Notes / Admin (tag rename archive + partial warning, diagnostics confirm, Other-domain audit); Metrics (hero, Dashboard cache); Training (quiz import warning).
- docs/operator-state.md: `CONFIG.ORG_EMAIL_DOMAINS`; the DevTools editor entry points (blue-green entry); `AUTOMATION_TRIGGER_OWNER` now records the runs-as account with `by`; the AutomationTriggersRemoved audit row; the intake-draft deploy note.
- .cycle/config.md:
  - S59 (unit-aware weight, Q43 uncertainty, amend refusal, catalog-change message).
  - S53 (archive walk, the started row, the partial warning).
  - S106 (the diagnostics confirm).
  - S41 / S42 (the hero baseline, no self-comparison).
  - S116 (no cache before the import).
  - S66 (admin taxonomy, counts-only audit).
  - S112 (an eligibility error is not beaconed).
  - S30 / S117 (self-test owner-only; triggers' runs-as owner; removal audited).
  - S68 (the cut-off warning).
  - INV-66's wording ("vs period daily average" is gone).
  - INV candidates: an engine reads Q43/seat/weight by token (one rule, twins pinned equal); a vocabulary sent to a vendor is admin-authored.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
