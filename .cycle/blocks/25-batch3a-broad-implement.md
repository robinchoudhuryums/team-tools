---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- F4 (Medium) — the weekly and urgent Call Notes digests stamped a healthy heartbeat and cleared their error key after a MailApp/quota failure that sent nothing; the failed send now reaches the health dot and the heartbeat is withheld
- F5 (Medium) — the call-note retention purge, cold archive, archived-note purge, nightly reconcile and form-data purge swallowed a run that died and any rep Sheet they could not open (the dispatcher then cleared two of their keys), so the only trace was a stale line blaming the trigger; each now stamps the failure (skipped reps by name), clears on a clean run and owns its key
- F7 (Medium) — the cold-archive mover deleted the moved rows one `deleteRow` at a time, so the 2000-row cap could pass the 6-minute ceiling and re-append rows the next night; it now deletes contiguous runs
New capabilities (G/ST): None
Files modified: web-app/30_callnotes.js, web-app/61_forms.js, web-app/00_config.js, test/client/run.js, test/client/server-split-manifest.json, CLAUDE.md, docs/gotchas.md, .cycle/config.md, .cycle/STATE.md
Estimate: M (~5.5 h) — written before the first edit (STATE.md Estimates line, 2026-10-14)
Actual: ~1.5 h

CHANGES:
F4 | web-app/30_callnotes.js | `sendManagerFlagDigest_` returns `{ sent: true }`, or `{ error }` when `appSendMail_` throws (still logged; the other queue still sends); `sendCallNotesWeeklyDigests` collects send failures with the queue read failures and, on any, stamps `CallNotesWeeklyDigests` and returns without a heartbeat; `sendCallNotesUrgentDigest` stamps `CallNotesUrgentDigest` and returns without clearing or heartbeating
F5 | web-app/30_callnotes.js | `purgeOldCallNotes`, `archiveOldCallNotes`, `purgeArchivedCallNotes`, `reconcileCallNotes`: a `skipped` list of the rep Sheets that would not open; the audit row gains `repsSkipped=N` (counts only — no names in the shared log); a run with skips stamps its job-table action (`CallNotesPurge` / `CallNotesArchive` / `CallNotesArchivePurge` / `CallNotesReconcile`) naming the reps, a clean run clears it, a disabled run clears it, and the whole-run catch stamps; `reconcileCallNotes` also returns `skippedReps`
F5 | web-app/61_forms.js | `purgeExpiredFormData` clears `FormDataPurge` on a clean or disabled run and stamps it in the catch
F5 | web-app/00_config.js | `TRIGGER_HANDLER_JOB_KEYS`: `purgeExpiredFormData` and `purgeArchivedCallNotes` are `owns: true` (the dispatcher no longer clears their keys after a swallowed failure)
F7 | web-app/30_callnotes.js | `archiveSheetRowsOlderThan_` deletes through `contiguousRowRunsDesc_` + `deleteRows` (the purge tiers' shared deleter); the spare-row guard is unchanged and still precedes the deletes
Tests | test/client/run.js | new driven pins "F4 (cycle 25)" (the sender's return, the weekly partial-send, the urgent send failure), "F5 (cycle 25)" (a net over all five bodies + their job-table actions; `purgeOldCallNotes` driven for skip / clean / dead lock / disabled; `purgeExpiredFormData` driven for a throw; the `owns` flags), "F7 (cycle 25)" (a 25-row prefix + one back-filled row → two `deleteRows` calls bottom-up; a `deleteRow` call throws). Test doubles that encoded the old per-row delete updated: the F-52 behavioural mover pin and the F6 pin gain the real `contiguousRowRunsDesc_` and a `deleteRows` fake; ARCH-GUARD now orders the guard before `srcSheet.deleteRows(`. Bite-checked: F4 ×2 (sender returns undefined; urgent ignores the error), F5 ×2 (skip not recorded; forms catch not stamped), F7 ×1 (per-row loop restored) — each red, file restored
Docs | CLAUDE.md, docs/gotchas.md, .cycle/config.md | the g53 index line + narrative, the `AUTOMATION_LAST_ERRORS` operator-state paragraph, INV-161 and INV-132 amended; S117 gains a cycle-25 step; manifest revision; running totals regenerated

TEST RESULTS: passed — pure harness 1278/1278, DOM harness 234/234, `npm run lint:server` clean, `counts.mjs --check` clean, `split-manifest.mjs --check` current. Test Command is `manual`: S117 (automation health) carries the new step and needs the DEV instance — NOT RUN here, owed to the operator after deploy; S24 (weekly digests) and the retention scenarios are unchanged in behaviour on a healthy run. The editor suite calls these jobs only through gate-refusal tests (they throw before any stamp) and the reconcile integration test, which is a real full run — clearing on its success is true evidence, as for the nightly job.
REGRESSION RISKS: (1) A rep whose Sheet is permanently unopenable (a deleted or unshared file left in roster col L) now keeps the health dot red every night until the roster is fixed — deliberate: that rep's notes are not being retained, archived or reconciled. (2) A manual "Reconcile Sheets" press that skips a rep stamps `CallNotesReconcile` too, which is the same truth. (3) No interface change beyond the additive `skippedReps` on the reconcile result and the sender's new return value (its callers before this batch ignored it).
INVARIANTS AT RISK: None violated — INV-161 (amended; single-sourced problem list unchanged), INV-132 (amended; still bounded, flushed before delete, spare-row guard intact), INV-44 (gates unchanged), Seams F3's `owns` net (passes with the two flags flipped), g17 (stamps use the user lock, never the job's ScriptLock).
NET SCORE: 0 − 0 = 0 (F4 NO — needs a mail quota failure, none evidenced this month; F5 NO — the retention tiers are off by default and no unopenable rep Sheet or lock timeout is evidenced; F7 NO — the archive is off by default; no new failure mode — the red dot for an unopenable rep Sheet is the intended signal)

OPERATOR ACTIONS / DEPLOY:
- Walk S117's cycle-25 step on the DEV instance after deploy | BLOCKS DEPLOY: N
Deploy: Server: `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy

(Not complete in production until blocking operator actions are done AND the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- F8 / F57 / F60 / F54 (Batch 3b) — the daily brief's suppression window, a manual reconcile refreshing the nightly liveness record, a digest with no heartbeat on record, the silent reply-scan truncation
- The Timesheet tier of the shared mover benefits from F7 as well (same function); its own job already stamped
(see also the cycle-25 /broad-scan report and the Batch 1–2 blocks)

DOCUMENTATION UPDATES NEEDED:
- None beyond what this batch made (g53, the AUTOMATION_LAST_ERRORS paragraph, INV-161/132, S117, running totals)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
