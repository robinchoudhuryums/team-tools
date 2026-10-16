---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: 25post-4 — every punch and every note save across the team queued on the ONE project ScriptLock, held through a Sheet open, a row write and an audit row, though each rep's notes are a Sheet of their own (operator 2026-10-16, team rollout at ~10 concurrent reps: "the per-rep lock for note saves")
New capabilities (G/ST): 25post-5 — an admin-only readout of the day's email allowance (MailApp.getRemainingDailyQuota) on Admin → System → Storage inventory, plus a System finding (operator 2026-10-16)
Files modified: web-app/00_config.js, web-app/10_core.js, web-app/30_callnotes.js, web-app/61_forms.js, web-app/80_training.js, web-app/cn/script_callnotes.html, test/client/run.js, test/visual/mock.js, test/client/server-split-manifest.json, CLAUDE.md, .cycle/config.md, .cycle/STATE.md, docs/gotchas.md, docs/design-decisions.md, docs/operator-state.md, docs/operator-log.md
Estimate: M (~4 h) — written before the first edit, 2026-10-16
Actual: ~2.5 h

CHANGES:
25post-4 | 00_config.js, 30_callnotes.js | `cnAcquireRepLease_` / `cnReleaseRepLease_` / `cnRepLeaseFree_`: a `CN_REP_LEASE_<sheetId>` Script Property {token, until} (60 s), check-and-set under the ScriptLock for milliseconds (written through `propSetBounded_`), a 15 s wait that throws "Lock timeout: …" where `waitLock` used to, released in finally by token with no ScriptLock. submitCallNote, updateCallNote, setCallNoteFlag, setCallNoteResolved, deleteCallNote and setCallNotePinned hold the lease instead of the ScriptLock. A user lock (the app runs as one user) and a document lock (bound to no document) cannot do this; CacheService was rejected because an evicted entry would let two writers into one Sheet.
25post-4 | 30_callnotes.js, 61_forms.js, 80_training.js | `getCallNotesSheetForWrite_` waits out a Sheet's lease (bounded by the holder, or 61 s for a killed one) before opening it; every ScriptLock holder that opens a rep Sheet uses it — managerDeleteCallNote, setCallNoteManagerComment, appendCallNoteFeedback, emailFromCallNote, sendExternalEmail, applyTagTransformAcrossReps_, purgeOldCallNotes, archiveOldCallNotes, purgeArchivedCallNotes, reconcileCallNotesCore_, setCallNoteTrainingReply, submitFormByToken.
25post-5 | 10_core.js, cn/script_callnotes.html | `mailQuotaStatus_` (remaining, warnAt, the MAIL_BCC_ALL cost per send, error) rides the admin-gated getStorageHealth; `cnMailQuotaVerdict_` is the one verdict for the inventory line (`cnMailQuotaHtml_`) and the System finding — ok normally, warn at ≤ 300 left, fail at 0, warn when unreadable, nothing on an older server.
tests | run.js, mock.js, manifest | 6 new pins; the S2 net accepts a leased appender (as a condition — a `return` there would have ended its loop early); 16 System-tab sandboxes load the verdict; 7 job sandboxes stub the write opener; the F31 pin's lock stubs moved to the lease; the DRV-4 position window widened; both storage fixtures carry mailQuota (one warn, one ok).

TEST RESULTS: Node 1384/1384; DOM 264/264 (one run hit an unrelated midnight flake — see follow-ons; two reruns and the pushed HEAD pass); lint:server clean; split-manifest current; counts --check agrees (pure harness 1384, invariants 373); cycle-closeout --check in step; visual `shoot.mjs admin-system` — 11 scenarios clean, and the line rendered and read back in Chromium at 1440 and 390. Twelve mutations, all bitten by a 25post pin (F2c excluded): an expired lease still held, the ScriptLock held through the save, no timeout, release deleting another holder's lease, writers not waiting, one key for every rep, the form submit and the purge skipping the wait (the purge mutation first went UNBITTEN — its write is in a helper — so the net now flags every ScriptLock holder that opens a rep Sheet), an unreadable quota read as a number, the threshold off by one, zero not a failure, the finding dropped.
Regression scenarios (Test Command manual): at deploy — two reps save notes at the same moment (both save, neither waits ~15 s); a manager deletes a rep's note while that rep saves (both land); Admin → System shows the allowance line.
REGRESSION RISKS: a leased save now waits up to 15 s only for ITS OWN Sheet, but it still takes the ScriptLock for the check-and-set, so a long ScriptLock holder (a tag rename, the 2–4am jobs) can still delay its start. A killed save blocks that rep's next save for up to 60 s. A save that runs past 60 s could let a second writer in — no note action comes near that. Each save costs two Script Property writes (Workspace allows 500,000 a day).
INVARIANTS AT RISK: INV-01 (ScriptLock around every mutating op) — AMENDED by INV-386 for the six note actions; INV-201 (bounded property writes) — kept, the lease goes through propSetBounded_.
NET SCORE: 0 − 0 = 0 (capacity work ahead of the rollout; nothing fired)

OPERATOR ACTIONS / DEPLOY:
- None new; deploy outside shift hours (the reload prompt is a burst of its own) | BLOCKS DEPLOY: N
Deploy: `cd web-app && clasp push -f`, then Deploy → Manage deployments → New version

FOLLOW-ON ITEMS:
- test/client/dom/runDom.js "the resume request states the unpaid gap before it is filed" fails for one minute a day: its 00:01 clock-out is not yet past when the suite runs at 00:01 in the fixture rep's timezone (Asia/Kolkata = 18:31 UTC). Freeze the sandbox clock for that test instead of relying on the time of day.

DOCUMENTATION UPDATES NEEDED:
- None (g17 amended in index and narrative; the design decision and its index line; operator-state MAIL_BCC_ALL entry; operator-log; the auto-managed list; INV-386, INV-387)
---END BROAD SCAN IMPLEMENTATION SUMMARY---
