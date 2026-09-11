# Cycle 19 — `/broad-implement` trigger quota (operator 2026-09-11, Batch 0 step 0c blocker)

The operator's `installAutomationTriggers()` threw `This script has too many
triggers` at Code.gs:12580 — the `.create()` of the 21st trigger in creation
order, `creditMonthlyPtoAccruals` — AFTER the dedupe loop had deleted every
existing trigger. Apps Script caps installable triggers at 20 per user per
script; the follow-ons round had taken the installer from 19 to 21 and nothing
in the code or the pins knew. The deployment was left with 20 triggers and NO
PTO accrual trigger. The user asked for the proposed fix plus any other clean,
no-risk consolidations.

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- TQ | the trigger installer exceeded the Apps Script quota and, because it
  deletes-then-creates, failed HALF-INSTALLED: a trigger per SLOT via three
  dispatchers (16 triggers for 24 handlers), a fail-closed quota pre-flight
  BEFORE the delete loop, a partial-install rethrow naming what is missing,
  and a headroom pin so the next trigger fails CI instead of the editor.
Files modified: web-app/Code.js, web-app/Tests.js, test/client/run.js, CLAUDE.md

CHANGES:
TQ | web-app/Code.js | `AUTOMATION_TRIGGER_QUOTA` (20). `TRIGGER_GROUPS` — the
  ONE source: `runHourlyJobs` → [sendCallNotesEodDigest,
  autoAssignSpanishThreadsScheduled]; `runWeeklyDigests` →
  [sendCallNotesWeeklyDigests, sendCoachingRecapDigest] (Friday 8am);
  `runNightlyPurges` → [purgeOldDiagnostics, purgeOldQaReviews,
  purgeExpiredFormData, purgeArchivedCallNotes] (2am; bounded first, cross-rep
  walk last; the forms purge moves 3am → 2am, its hour was never load-bearing).
  `RETIRED_TRIGGER_HANDLERS` is DERIVED from the groups and consulted by BOTH
  delete loops, so the re-install removes the eight standalone triggers the
  live deployment holds. `runTriggerGroup_(label)` resolves each job by name
  off `globalThis`, runs it in its own try/catch, stamps a throw under the JOB
  name (`stampAutomationError_`), clears on a clean run, stamps a typo'd name
  by name. Each dispatcher gates `assertManagerCaller_` by name BEFORE
  delegating (INV-44). Installer: TARGETS = 16; counts foreign + planned
  BEFORE deleting and throws "Refusing to install … NOTHING was deleted" when
  it would exceed the quota; the creations sit in a try whose catch re-reads
  the live set and rethrows "FAILED part-way: N of 16 installed; NOT
  installed: …"; the confirmation email lists each dispatcher's jobs from
  TRIGGER_GROUPS. `removeAutomationTriggers` mirrors TARGETS + the retired
  list. Deliberately KEPT standalone, reasons inline: `sendManagerDailyBrief`
  (`managerBriefSuppressionActive_({checkTrigger:true})` keys on its name),
  the 18:00 pair `archiveOldTimesheetRows` + `creditMonthlyPtoAccruals` (both
  lock-holding, either can run long on the night that matters — a shared
  execution raises the F3 duplicate-append hazard), and the two row-MOVING
  retention jobs `archiveOldCallNotes` 3am / `purgeOldCallNotes` 4am (their
  order after the purges is load-bearing).
TQ | web-app/Tests.js | three gate tests: `test_triggerGate_hourlyJobs_` /
  `_weeklyDigests_` / `_nightlyPurges_nonManagerThrows`, registered (312 → 315).
TQ | test/client/run.js | TQ-1 (quota constant = 20; created count ≤ 19 with a
  message naming the dispatcher pattern; TRIGGER_GROUPS parsed → exactly three
  dispatchers, eight jobs, none in two groups; RETIRED derived not literal;
  every grouped job absent from TARGETS, a defined top-level function with
  its own gate; every dispatcher owns a trigger and gates by name BEFORE
  `runTriggerGroup_` of its own key; nightly order bounded-first / walk-last;
  the five reasoned stand-alones stay stand-alone; pre-flight BEFORE any
  `deleteTrigger`; "NOTHING was deleted"; both delete loops consult RETIRED;
  the naming rethrow; the email derives from TRIGGER_GROUPS; hours 2 < 3 < 4;
  hourly + Friday-8am dispatcher shapes). TQ-2 (behavioural: a throw in job B
  still runs C, stamped under B's name, A + C cleared, an undefined name
  stamped by name, a clean group stamps nothing, an unknown group runs
  nothing). TQ-3 (the installer driven against a stubbed ScriptApp: 16 + 5
  foreign → refused, ZERO deletes, ZERO creates, the foreign named; 16 + 4 →
  proceeds, ours + retired deleted, the foreign untouched, exactly TARGETS
  created, the email lists the group; the LIVE 2026-09-11 shape — the old
  21-set minus the accrual — repaired to exactly 16 incl. the accrual with no
  retired name surviving; a throw on the 13th create → "12 of 16 installed;
  NOT installed: sendManagerDailyBrief, archiveOldTimesheetRows,
  runNightlySelfTest, creditMonthlyPtoAccruals."). PR4-4 and SA-1 repointed
  at the dispatchers (the Friday slice anchors on `runWeeklyDigests`; the
  auto-assign is asserted INSIDE `runHourlyJobs` and in NEITHER TARGETS).
TQ | CLAUDE.md | the trigger-handler gotcha, the Operator State trigger list
  (intro rewritten: 16 triggers / 24 handlers, the quota, the dispatchers,
  the known six-minute-execution limit, the stand-alone reasons; per-entry
  "INSIDE `runX`" annotations; the TARGETS sentence), the form-data retention
  entry (2am inside the dispatcher), INV-44, and a dated operator entry.

TEST RESULTS: pure harness 795 passed / 0 failed (797 before: −5 derived
per-handler gate tests as the trigger set shrank 21 → 16, +3 TQ); DOM 113 / 0;
`node --check` clean on Code.js / Tests.js / run.js. 7 mutations / 7 bites,
every one against a COMMITTED tree (114a16e): pre-flight moved after the
delete loop (TQ-1 + TQ-3); install delete loop ignoring RETIRED (TQ-1 + TQ-3);
cross-rep walk first (TQ-1); dispatcher without isolation (TQ-2); four extra
triggers → 20 (TQ-1 + TQ-3 — the FIRST write of this mutation inserted only
one trigger because its replace target stopped matching after the first
insert, and read as NO-BITE; the mutation was wrong, not the pin); the
mid-creation catch removed (TQ-1 + TQ-3); RETIRED as a hand-typed list
(TQ-1). Editor suite: NOT runnable here — the operator's next
`runAllTests()`; expect 315.
Regression Scenarios walked (Subsystem: Server): S30 — NOT APPLICABLE here
(editor-only; the three dispatcher gate tests + the derived gate-type net
cover the property); S22 / S24 / S55 / S105 / S106 — NOT APPLICABLE here
(each handler's body is byte-unchanged; only which trigger fires it moved,
pinned by TQ-1's group parse and the repointed PR4-4 / SA-1); S46's accrual
step — NOT APPLICABLE here (the accrual handler and its 18:00 standalone
trigger are unchanged; the re-install restores it, TQ-3 case c).
REGRESSION RISKS:
- A dispatcher's group shares ONE six-minute execution. All eight grouped
  jobs are cheap by default (every purge no-ops while its window is 0; the
  EOD digest sends only at EOD hours; the auto-assign is flag-OFF). A purge
  enabled against a large backlog that runs long is killed by the execution
  limit WITH the jobs after it; each job's own liveness row then reads stale
  on Automation Health (the existing signal). Documented as a known limit.
- Apps Script's `everyHours(1)` anchors the minute at creation; both hourly
  jobs now fire at the SAME minute (the EOD digest matches by local HOUR, the
  auto-assign by business-hours window — neither depends on the minute).
- `purgeExpiredFormData` runs at 2am instead of 3am — no consumer depends on
  the hour; it stays default-OFF.
- `globalThis[name]` resolution: V8-runtime only (the project is V8; TQ-2
  proves the shape in a vm context). A typo in TRIGGER_GROUPS is stamped by
  name, never silent.
INVARIANTS AT RISK: INV-44 (amended — the dispatchers are gated handlers and
every grouped handler keeps its gate; pinned both ways), INV-151 (the brief
deliberately stays standalone because its trigger-existence check keys on
its name — pinned in TQ-1's stand-alone list), INV-153 / F3 (the 18:00
lock-holding pair deliberately NOT merged — pinned), INV-161 (a dispatcher
throw is stamped under the job name into AUTOMATION_LAST_ERRORS — the
health dot + failure digest read it). None violated.
NET SCORE: 1 − 0 = 1 (the accrual trigger is missing on the live deployment
today and every future trigger addition would have failed the same way; no
new failure mode — the shared-execution limit is bounded by default-OFF
windows and reported by the existing liveness rows).

OPERATOR ACTIONS / DEPLOY:
- `cd web-app && clasp push -f` (no New version needed for the trigger fix —
  `installAutomationTriggers` runs from the editor; the pending New version
  for #236/#237 still applies to the app) | BLOCKS DEPLOY: N
- Re-run `installAutomationTriggers()` ONCE from the editor as the installing
  manager: expect the log line "16 of the 20 Apps Script allows", the Triggers
  panel shows 16 rows (the eight grouped handlers no longer appear by name),
  and the confirmation email lists each dispatcher's jobs. This RESTORES
  `creditMonthlyPtoAccruals` (missing since the failed run; the next credit is
  due on/after Oct 1 and catches up in arrears either way). | BLOCKS DEPLOY: N
- Re-run `runAllTests()` — expect 315/315. | BLOCKS DEPLOY: N
Deploy: Server: `cd web-app && clasp push -f` (the editor runs the installer;
the app's New version step is unchanged). Test Suite: same push.

FOLLOW-ON ITEMS:
- web-app/cn/script_callnotes.html (~line 10254): the Automation Health
  findings read `e.error` off `health.automationErrors[job]`, but
  `stampAutomationError_` writes `{at, message}` — so every stamped failure
  (cycle-18 F4's own class, and now a dispatcher-caught throw) renders as
  "unknown error" with the real message dropped. One-token fix
  (`e.message || e.error`), deliberately not widened into this batch; owes a
  fixture + a pin (INV-185 — the mock's `automationErrors` shape should carry
  `message`).
- The two hourly jobs fire at one minute now; if the EOD digest ever grows
  slow enough to matter, `runHourlyJobs` should run the auto-assign FIRST
  (it is bounded by the flag + business hours).
- CLAUDE.md still carries per-feature sentences saying "trigger #18/#19/#20/
  #21" and "the twenty-one" in narrative entries outside the trigger list
  (historical, dated — left for /sync-docs to decide whether to annotate).

DOCUMENTATION UPDATES NEEDED:
- /sync-docs: README (if it states a trigger count), the Test Suite narrative's
  "312" mentions (→ 315), the historical "trigger #N" sentences noted above, and
  the CLAUDE.md running total for the pure harness (797 → 795 — the derived
  per-handler gate tests shrank with the trigger set; Batch C would derive it).
---END BROAD SCAN IMPLEMENTATION SUMMARY---
