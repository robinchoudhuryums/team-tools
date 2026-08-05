---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: (cycle-17 batch ⑤ — server-hardening stragglers: consistency of established patterns)
- C17-12 — form_public conditional sections (signer / govAssist / guardian) now CLEAR on re-hide; stale hidden values no longer enter the hashed, consent-stamped, immutable FormSubmissions record while the signer's screen shows them hidden
- C17-11 — a mixed dept+'Other' split-send that fails AFTER the internal copy no longer skips all bookkeeping: the delivered half gets its EmailedAt stamp (internal depts only), a CallNoteEmail audit row (+ `externalCopyFailed` marker), and its DR row/token stays live; the return is success-with-warning ("do NOT re-send the whole email") and the client surfaces it as a warn toast
- C17-13 — the Q43/condition custom-add now blocks LEADING negation tokens ("None diagnosed", "Nothing neurological", denies/denied/negative/neg) — the exact-match list let negation PHRASES read as a valid neuro Dx and fire Group-3 upgrades; vocabulary deliberately conservative (normal…/non-… are real conditions)
- (prefill caps) — createFormToken bounds the last uncapped client-writable PHI cells: recipientName ≤200, prefillData object-only + ≤50 keys + ≤20k JSON, rejected BEFORE the append (INV-96 spirit)
- (signature) — submitFormByToken requires a `data:image/` signature: an anonymous submitter could plant an https:// URL fetched by the PHI reviewer's browser (in-app viewer) and the server-side HTML→PDF conversion (tracking-pixel/IP leak); empty stays allowed (fields-only forms)
- (dept config) — getDepartmentEmails_ whitelist-rebuilds on read (the one getter the cycle-9 L-12 hardening skipped; a malformed hand-edited property degrades entry-wise instead of feeding Object.keys surfaces + MailApp raw); saveDepartmentEmails rejects comma/semicolon dept names (a "Billing, West" round-tripped as two phantom departments through every drSplitDepts_ consumer) + 1–60 char bound
- (time-off notes) — the module's only unbounded client free text capped at 1000 chars on BOTH submit paths (it previously rode whole into the dashboard, calendar, decision email, and — on cancel — the shared AuditLog every bounded tail scan reads)
- (intake Sent cap, INV-169) — intakeListMySubmissions returns `total` + `cap` (a manager's list spans all reps × 3 form types, so the silent 100-cap read as "exactly 100 exist"); the client renders "N shown · server holds M total (list capped)" keyed off the UNFILTERED list length (additive — older servers render nothing)
- (search status) — searchReference hits carry the item `status` (an admin's search showed a draft chunk identically to a published one); the chunk-group header renders the existing Draft pill (reps only ever receive 'published')
- (cache-buster) — intakeRecListHtml_'s image `?v=` respects an existing query string (a Drive thumbnail URL `…?id=X&sz=w1200` — the documented realistic col-F value — had its last param corrupted to `sz=w1200?v=K0821`)

Files modified: web-app/Code.js, web-app/form_public.html, web-app/intake/script_intake.html, web-app/kb/script_kb.html, web-app/cn/script_callnotes.html, test/client/run.js (+ .cycle checkpoint files)

CHANGES: detailed above. Pins: 6 new comment-stripped (INV-188) tests — C17-12 (helper + ≥4 call sites), C17-11 (internalSent tracking, fall-through, audit marker, warning + client toast), C17-13 (leading-token split + vocabulary), the bounded-cells group (prefill/signature/notes caps), the dept-config group (whitelist-rebuild + comma guard), and the list-contract group (intake total on both sides, 3× `status: status,` in searchReference, the Draft pill, the conditional cache-buster). Pure 419→425, DOM 69.

TEST RESULTS: pure 425/0; DOM 69/69; `node --check` clean. Bite-checks: signature validation removed → trips (2 tests), internalSent removed → trips, one clearHiddenSection call dropped → trips, comma guard removed → trips. No stylesheet changes — no visual re-shoot owed (the Draft pill reuses an existing class; the intake head is a text branch). Scenario walk (Test Command = manual): S19/S59/S60/S61/S62/S74 NOT APPLICABLE in-container (live mail/sheets/editor) — each covered by the new source pins + unchanged success paths verified by re-read; S4/S13 behavior unchanged for ≤1000-char notes.

REGRESSION RISKS:
- C17-11 changes the partial-failure contract from success:false (which invited a duplicating retry) to success:true+warning — a client older than this batch shows the plain "Email sent" toast on a partial send (no worse than before, when it showed a failure that invited a re-send).
- getDepartmentEmails_ entry-wise drop: a hand-edited entry with a malformed email now silently disappears from the composer list until re-saved (fail-closed; the Admin editor round-trip restores it). Counted as this batch's one new failure mode (Low — hand-edit-gated, self-healing via the Admin editor).
- C17-13's vocabulary could theoretically block a condition whose FIRST token is a negation word — none known ("Noonan" ≠ 'no'; normal/non- deliberately excluded).
- Time-off notes silently truncate at 1000 chars (no error) — deliberate (a note, not a document).
- searchReference's status field is additive; reps only ever receive 'published' (draft hits are filtered before push), so nothing leaks.

INVARIANTS AT RISK: none violated — INV-41 (CTA after hash) untouched; INV-42's send-then-stamp posture preserved on the partial path (stamp only after the internal send); INV-96/143 extended to the last two uncapped families; INV-113 gains the signature-shape check ahead of the consent gate; INV-131's dedup is protected by the comma guard; INV-140/147 draft invisibility unchanged. Doc updates owed below.

NET SCORE: 10 − 1 = 9
(All ten are production-class fixes. Fired-this-month YES: the intake Sent cap (a multi-month deployment across all reps × 3 tabs plausibly exceeds 100 rows NOW) and the cache-buster (fires on every PPD render whenever col F holds the documented Drive-thumbnail URLs). The rest are edge/attacker/hand-edit-gated: NO. New failure modes: 1 — the entry-wise config drop described above.)

OPERATOR ACTIONS / DEPLOY:
- Post-deploy `runAllTests()` from the editor | BLOCKS DEPLOY: N
- If the intake Sent tab shows "server holds M total (list capped)" after deploy, that is the fix reporting a cap that was previously silent | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy.

FOLLOW-ON ITEMS:
- acknowledgeDoc's EmpDocs signature is size-bounded but not data:image-validated (authenticated signers — lower stakes than the anonymous public form; same one-line shape if wanted).
- The three raw DR.STATUS readers (INV-183) remain open — the drStatus_ predicate batch.
- Remaining cycle-17 batches ⑥ (structural/growth: C17-9 SaveDayRange lock amplification, unknown-punch-type lockout, Spanish 200-cap, manager fan-in seq tokens, dead-CSS cluster + cnLoadDate_ removal) and ⑦ (visual-lens expansion).

DOCUMENTATION UPDATES NEEDED:
- S61: signature data:image validation + conditional-section clear-on-hide; S59: the cache-buster note; INV-96 (prefill caps join the bounded-cell census); INV-113 (signature shape check); INV-116 (total/cap fields); INV-140 (search hits carry status for admins); the dept-email Admin gotcha (comma-free rule now ENFORCED + sanitize-on-read); C17-11's partial-send contract in the fire-and-forget email gotcha; test count 419 → 425.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
