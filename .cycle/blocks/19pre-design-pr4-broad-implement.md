# 19pre — design handoff PR 4 (Coaching surface) — broad-implement block

Scope: docs/design_handoff_five_surfaces/IMPLEMENTATION_PLAN.md §4 PR 4 (K1–K13).
Written 2026-09-02 on branch claude/ums-team-tools-design-r8ar3o.

---BROAD SCAN IMPLEMENTATION SUMMARY---
Findings implemented:
- K1 | Composer DRAWER (shared `.overlay.drawer-host` + `.modal.drawer` in styles.html; `ensureOverlay` named by its heading) — Coaching ⇄ Praise kind, three severity chips (role=radio + aria-checked), revisit date, TRX, narrative + coaching point; prefilled from `COACH_PREFILL` (C8)
- K2 | Manager signal board "Who needs a 1-on-1" — pure `coachRepSignal_` (priority / watch / steady / clear + a FIFTH `nosignal` tier, INFO-toned) on `mtRenderTable_` with a 30-day severity mix bar, tier rowClass, legend; two columns drop at ≤720px
- K3 | Praise semantics — excluded from `counts.open` and the ack-rate denominator (operator decision 8); never overdue; rep view routes praise to a Recognition feed with no Acknowledge
- K4 | `COACH_SEV_LABELS` — `major` DISPLAYS as Moderate on both sides (byte-equal mirror, MIRROR_INDEX); stored enum unchanged
- K5 | Note drill — `NoteDate` column + the Coach-on-this button carrying `note.dateLocal`; manager → `cnAuditDrillToNote_`, rep → own History at that date
- K6 | Filter strip with live counts (All / Needs ack / Overdue / Praise / Voided) + search + employee select over the cached payload; voided EXCLUDED from All (decision 9); `umsCoachingFilter` persisted + validated
- K7 | Rep view — KPI strip, action callout naming the OLDEST open item with Jump, Recognition feed, month-grouped cards with an optional reply box beside Acknowledge (`RepResponse`, written only on the open→acked transition)
- K8 | Mail — CRITICAL-ONLY immediate email at create (cc manager; no narrative/TRX/note id), retraction on a critical void, `sendCoachingRecapDigest` (trigger #19, Friday 8am manager-tz, heartbeat `coachingRecap`, never consults the brief flag — decision 1)
- K9 | Business-day overdue — `coachAgeDays_(createdMs, nowMs, opts)` with `coachBizOpts_()` = `businessMinutesBetween_` + the Coverage window; unknown never overdue; `coachUnackedOverdue_`/`coachAnalytics_` carry no raw day arithmetic (decision 7)
- K10 | `setCoachingFollowUp` (`FollowUpAt`; a past date flags `followUpDue`) + Revisit button
- K11 | `nudgeCoaching` (`NudgedAt`; once per manager-tz day per item; mail post-lock, `mailed` returned) + Nudge button
- K12 | Fixtures (populated + EMPTY twins mirroring `coachRowToObj_` + the dashboard's additive fields) + 9 scenarios + a `?role=rep` mock hook
- K13 | QA chip → `window.QA_OPEN_HINT` consumed-then-nulled by the QA queue after render (decision 13: agents do not see their own reviews — the chip is manager-side only)
- (follow-up) | `getCoachingDashboard`'s EMPTY early return now carries `voidedTotal` + `analytics` like the populated shape (INV-185 — the empty fixture mirrors a real payload)

Files modified: web-app/Code.js, web-app/train/script_coaching.html, web-app/styles.html, web-app/cn/script_callnotes.html, web-app/qa/script_qa.html, web-app/Tests.js, test/visual/mock.js, test/visual/shoot.mjs, test/client/run.js, test/client/dom/runDom.js, CLAUDE.md, .cycle/STATE.md, .cycle/blocks/19pre-design-pr4-broad-implement.md

CHANGES:
K1/K2/K3/K6/K7 | web-app/train/script_coaching.html | rewritten: app-bar + toolbar-tabs mode strip, `coachRepSignal_` + `COACH_TIER_META`, `coachBoardHtml_`, filter strip + `COACH_FILTERS`/`umsCoachingFilter`, recognition feed, callout, `coachCardMy_`/`coachCardMgr_`/`coachCardVoided_`, the drawer (`coachOpenDrawer_`/`coachCloseDrawer_`), Nudge/Revisit/Void handlers, `coachOpenNote_`/`coachOpenQa_`; CSS incl. ≤720px board columns, 2×2 KPIs ≤540px, `[hidden]` companions; `.coach-modes`/`.coach-row-overdue`/`coachNarrativeHtml_` retired
K1 | web-app/styles.html | `.overlay.drawer-host` + `.modal.drawer` + `drawerin`
K3/K8/K9/K10/K11 | web-app/Code.js | `COACH_HEADERS` 14→19 + `CO`; `COACH_SEV_LABELS`, `COACH_RESPONSE_MAX`, `COACH_VOIDED_CAP`, `CONFIG.COACHING_RECAP_DAYS`; `coachValidate_` (+followUpAt/noteDate/qaFileId), `coachIsoDateOrBlank_`, `coachAgeDays_`, `coachBizOpts_`, `coachUnackedOverdue_`/`coachAnalytics_` (opts), `coachRowToObj_`, `createCoaching` (19-col row, critical-only mail, `mailed`), `getMyCoaching` (ageDays/createdByName, void hidden), `acknowledgeCoaching(coachId, response)`, `getCoachingDashboard` (praise out of open, voided cap + total, ageDays/followUpDue/nudgedToday, full-shape empty return), `voidCoaching` (retraction), `setCoachingFollowUp`, `nudgeCoaching`, `coachSendMail_` (+ `_TEST_OVERRIDE_COACH_MAIL`), the four mail builders/notifiers, `coachRecapBuckets_`, `sendCoachingRecapDigest`; TARGETS ×2 + the Friday trigger; `DIGEST_STALE_HOURS`/digestHealth `coachingRecap`
K5 | web-app/cn/script_callnotes.html | Coach button `data-note-date`; `cnMgrCoachOnNote_` passes `noteDate`; `coachingRecap` digest labels
K13 | web-app/qa/script_qa.html | `qaLoadQueue_` consumes `QA_OPEN_HINT` after `qaRenderQueue_()`
tests | web-app/Tests.js | omnibus `setCoachingFollowUp`/`nudgeCoaching`; `test_triggerGate_coachingRecap_nonManagerThrows`; flow test extended (reply / follow-up / nudge / voided[]); `test_coaching_criticalMailOnlyAndMailedFalse`
K12 | test/visual/mock.js, test/visual/shoot.mjs | populated + empty coaching fixtures; `coachingRecap` heartbeat rows; `?role=rep`; 7 new scenarios (drawer / empty / mine light+dark / mobile ×2 / error)
pins | test/client/run.js, test/client/dom/runDom.js | PR4-1..PR4-6 (+ F17 / V-11 / PR1-5 / H-1 / OWED / MIRROR_INDEX updated in place); DOM drawer lifecycle test (seeds `umsTour` — the tour's capture-phase Escape otherwise swallows the key)

TEST RESULTS: pure 734/0 (was 727; +6 pins, +1 in-place split), DOM 102/0 (was 101), `node --check` on Code.js + Tests.js OK, every JS partial parse-guarded. 10 mutations / 10 bites (minor mails immediately; praise counted open; praise nags; unknown age → 0; client label drift; critical no longer forces priority; voided in All; QA hint act-before-null; recap heartbeat dropped on the failure exit; every severity mails). PR4-5's first write was WRONG ABOUT THE CODE (banned the surviving `coachSwitchMode_`) and was corrected to assert the shared-tab strip instead. Visual: 9 coaching scenarios — all `missing: []`, `overflowPx: 0`, eyeballed light/dark/mobile/drawer/empty/error/rep. Editor suite: NOT run (no runtime off-editor) — `runAllTests()` now expects 307. Scenario S99 (new) walked against the matrix: PASS on the rendered halves; the server/mail halves rest on PR4-1/2/4 + the two new editor tests.

REGRESSION RISKS:
- `acknowledgeCoaching` gained an optional 2nd arg; a one-arg caller acks with no reply (unchanged).
- `getCoachingDashboard`/`getMyCoaching` fields are ADDITIVE; `counts.open` now EXCLUDES praise (a deliberate number change — decision 8). The empty early return is wider (additive).
- `coachAnalytics_`/`coachUnackedOverdue_` take an optional 4th `opts` — the H-1 digest fold now passes business-day opts, so the overdue digest's overdue set SHRINKS (weekend/holiday time no longer ages an item); an unparseable stamp is now "unknown" (never overdue) where it previously read as infinitely old.
- The Coaching tab markup changed wholesale; the `coaching` tab key, `enterCoachingView`, `COACH_PREFILL`, `umsCoachingMode` and every endpoint/gate are unchanged.
- The 19th trigger is dormant until `installAutomationTriggers()` is re-run.

INVARIANTS AT RISK: INV-134 (amended — scope/gates/audit content unchanged; five trailing columns; business-day overdue; critical-only mail), INV-44 (new trigger handler — gate-type net auto-covers), INV-151 (agent-facing recap never consults the brief flag — pinned), INV-173/174 (chips/tabs/drawer are real controls with aria state — pinned + A11 scan), INV-175/187 (unknown age never overdue; error state on camera), INV-184 (retired selectors banned), INV-185 (fixtures derived from `coachRowToObj_`; empty return made honest), INV-169 (voided cap + total), M-7 (every mail post-lock — the transitive scan + PR4-1/4), A14 (search/select aria-labels; drawer labelledBy). None violated.
NET SCORE: 3 − 0 = 3 (production fixes: business-day overdue — the wall-clock window made Friday items overdue on Monday and the digest nagged managers over weekends; praise counted as open/awaiting-ack in every count; every severity emailed the rep immediately with the narrative reachable. The rest is capability/interface work per R18.)

OPERATOR ACTIONS / DEPLOY:
- Re-run `installAutomationTriggers()` once (19th trigger `sendCoachingRecapDigest`) | BLOCKS DEPLOY: N (recap dormant until then; critical mail works regardless)
Deploy: Server + Client (Training views) + Client (shell) + Client (Call Notes views) + Client (QA views): `cd web-app && clasp push -f`, then Apps Script editor → Deploy → Manage deployments → Edit → Version: New version → Deploy. Test Suite: same push; `runAllTests()` expects 307.

FOLLOW-ON ITEMS:
- The rep-facing "Coaching" tab label + crumb `Training › Coaching` (two-level) follows decision 10; the handoff's three-level crumb was not built.
- The recap cadence is Friday-only by decision; a per-manager cadence would need a property (not built).
- `coachRepSignal_`'s score weights (4/2/1/−1, overdue ×2) are code constants — no operator knob yet.
- The `_TEST_OVERRIDE_COACH_MAIL` seam is Tests.js-only; the other notifiers (PTO decision, missed punch) have no such seam — a shared mail seam is a test-infra follow-on.

DOCUMENTATION UPDATES NEEDED:
- Done in this session: CLAUDE.md Projects Coaching bullet, INV-134 amendment, manager-gated list, trigger list (19) + INV-44 + the trigger-handler gotcha, `AUTOMATION_DIGEST_LAST_RUNS` key set, localStorage 16→17 (`umsCoachingFilter`), count chain (734 / DOM 102 / matrix 87 / editor 307), operator-state entry for PR 4, S99.
---END BROAD SCAN IMPLEMENTATION SUMMARY---
