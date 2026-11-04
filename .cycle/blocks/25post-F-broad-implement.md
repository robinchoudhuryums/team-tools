---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented: None (operator round 2026-11-02, not audit findings — Batch F of the plan agreed in chat: "Coaching: add 'Last 1-on-1' date field, reminders for managers, adjustable cadence; allow optional image/screenshot upload for logged issues")
New capabilities (G/ST): Batch F — Coaching 1-on-1s and screenshots:
  - F1 a 1-on-1 log in the HR store's new `OneOnOnes` tab (date held, rep, who logged it, an optional note in a plain-text cell), logged only by the rep's roster manager (column M) from a Log button on the "Who needs a 1-on-1" board; a mistaken row is VOIDED (by its logger or the rep's manager), never deleted; "Last 1-on-1" is derived — the newest row that is not void and not after today
  - F2 each manager's cadence in a new `CoachingSettings` tab (default `CONFIG.COACHING_ONE_ON_ONE_DAYS` = 14, 0 = off), set from the board's head — a tab, not a Script Property (g07)
  - F3 ONE due rule (`coachOneOnOneStanding_`) for the board's new Last / Next 1-on-1 columns, ONE Needs-you item per manager (`oneOnOne` kind), the daily brief and the standalone overdue digest the brief suppresses; a rep with none on record is DUE; no reminder carries a note
  - F4 an optional screenshot on a coaching item: fitted in the browser (the article-paste fitter), stored in the HR store's `CoachingImages` tab (KbImages row shape) BEFORE the row that names it (a new trailing `ImageKey` column), read only through `getCoachingImage` under the item's own gate (the rep while not void, or a manager `coachCanManagerSee_` admits), never cached (`kbImageTabServe_` gains `spec.noCache`)
Files modified: web-app/00_config.js, web-app/82_coaching.js, web-app/20_timeclock.js, web-app/10_core.js, web-app/80_training.js, web-app/70_kb.js, web-app/Tests.js, web-app/train/script_coaching.html, web-app/tc/script_clock.html, handbook-app/kb_shared.js (the generated copy), test/client/run.js, test/client/dom/runDom.js, test/client/server-split-manifest.json, test/visual/mock.js, test/visual/shoot.mjs, docs/design-decisions.md, docs/modules.md, docs/operator-log.md, docs/operator-state.md, docs/test-harness-log.md, .cycle/config.md (INV-396, S155), CLAUDE.md (the storage map's HR row, two index lines extended in place, counts), .cycle/STATE.md
Estimate: M–L (~6 h) — written to STATE.md before the first edit
Actual: M (~3.5 h)

CHANGES:
F1 | web-app/00_config.js, 82_coaching.js | `COACH_MEET_*`, `CMT`; the pure `coachIsoAddDays_`, `coachIsoDaysBetween_`, `coachOneOnOneValidate_`, `coachTeamReps_`; `coachOneOnOneLogs_`; `logOneOnOne`, `voidOneOnOne` (manager-gated, locked, id-only audit rows CoachingOneOnOne / CoachingOneOnOneVoid; void re-reads the id under the lock, g164)
F2 | web-app/00_config.js, 82_coaching.js | `CONFIG.COACHING_ONE_ON_ONE_DAYS`, `COACH_CADENCE_MAX`, `COACH_SETTINGS_*`; the pure `coachNormCadence_`; `coachSettingsRead_`, `coachCadenceOf_`, `setOneOnOneCadence` (audit CoachingCadence)
F3 | web-app/82_coaching.js, 20_timeclock.js, 10_core.js, 80_training.js, 00_config.js, tc/script_clock.html, train/script_coaching.html | the pure `coachOneOnOneStanding_`, `coachOneOnOneDueSort_`, `coachOneOnOneTask_`, `coachOneOnOneDueText_`; `coachOneOnOneFor_` (the board, on `getCoachingDashboard` as `oneOnOne`, a failed read named), `coachOneOnOnesDueFor_` (Needs-you, manager only; `PENDING_TASKS_KINDS` + `oneOnOne`), `coachOneOnOnesDueByManager_` (the brief's `1-on-1s due` section and the training digest's — names and dates only); the board's two columns, its head line, the log dialog and the cadence prompt
F4 | web-app/00_config.js, 82_coaching.js, 70_kb.js, train/script_coaching.html | `COACH_HEADERS` + `ImageKey`, `COACH_IMAGES_TAB`, `COACH_IMAGE_KEY_RE`; `coachImageItem_`, `coachImageStoreCallerLocked_`, `getCoachingImage`; `createCoaching` stores first; `kbImageTabServe_`'s `spec.noCache`; the drawer's slot (choose, paste, Remove, Log waits while fitting) and the card's Screenshot chip + viewer
Tests | web-app/Tests.js | three rows in `test_managerGates_rejectNonManager`; cleanup sweeps TEST_ rows from OneOnOnes

TEST RESULTS: Test Command is `manual`. The coaching Regression Scenarios (the drawer, the board, acknowledge / void / revisit / nudge) were walked by reading against the change: a coaching item with no screenshot is written exactly as before plus a blank trailing cell; the board renders as before when the 1-on-1 log cannot be read (named, no columns). S155 is new and NOT RUN (it needs the deploy and a manager with a roster team).
  Pure 1511/1511 (five new pins; PR4-1, PR4-6, PR6-1, C-8, S2, F9, X1 and the CORE-01 / HR-3 / G3 sandboxes moved). DOM 368/368 (three new drives). Visual: the twelve coaching scenarios measure clean (three new — the 1-on-1 dialog wide and phone, the screenshot viewer); read: a phone keeps Employee, Signal and Next 1-on-1. lint-server clean; counts in step; the manifest revision recorded; handbook-sync in step (kb_shared.js). CI green on 4c7c584 and fd9b6e2.
  Bite-checks (21, scratch worktree): all BITE — a void row counted; a future row counted; never-logged not due; an offboarded rep on the team; the item always overdue; a future date accepted; any manager logs; the note in the audit row; void not idempotent; the image never stored; a rep reading a voided item's image; the image cached; noCache ignored on the read; a note in the digest; a rep given the Needs-you item; a never-logged rep untoned; a failed read still drawing columns; Log not waiting for the fitter; a failed screenshot read left blank; the date picker allowing tomorrow; an old note unescaped.
REGRESSION RISKS: (a) On the first day every rep with no 1-on-1 on record is due, so each manager with a roster team gets a Needs-you item and the brief (or the overdue digest) lists the team until 1-on-1s are logged — by design, said in the operator docs; a manager can set 0 to stop it. (b) The brief and the overdue digest now also send for a manager whose only item is a 1-on-1 due — a morning that was silent is not. (c) The team is roster column M only: a rep with a blank ManagerEmail is on nobody's board and in nobody's reminder. (d) `getCoachingDashboard` reads the roster and two more HR tabs per load. (e) A screenshot adds up to ~2 MB to one `createCoaching` call (the KB paste size).
INVARIANTS AT RISK: None. INV-396 (new); INV-122/134 (HR store only, team-scoped, no note or screenshot reaches an email or the AuditLog); g144 (the name, date, note and stamps are '@' cells via appendRowsTextSafe_ with their `_TEXT_IDX`); g17 (every write under the ScriptLock, the caller checked first); g53/g128 (a failed log read is named; "not stored" vs "could not read"); g151 (the brief and the digest it suppresses carry the same line); g133 (ids ride data attributes); g166 (the log dialog asks before discarding typed work, and a save closes it with discard).
NET SCORE: 0 production fixes − 0 new failure modes = 0 (new capability)

OPERATOR ACTIONS / DEPLOY:
- Team Tools: `clasp push -f` from `web-app/` + New version | BLOCKS DEPLOY: N
- Handbook app: `npm run handbook:push` + New version when convenient (its kb_shared.js copy changed; the handbook does not read coaching) | BLOCKS DEPLOY: N
Deploy: Team Tools — `clasp push -f` + New version; handbook app — `npm run handbook:push` + New version (copy only)

(Not complete in production until blocking operator actions are done AND
the deploy step is confirmed.)

FOLLOW-ON ITEMS:
- The rest of the plan: H (Employee Docs from an uploaded PDF, signing, highlighted field boxes).
- Adding a screenshot to an item after it is logged is not built (not asked for).
- A rep does not see their own 1-on-1 history (the log is the manager's HR record); a later ask if wanted.

DOCUMENTATION UPDATES NEEDED:
- None beyond those made.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
