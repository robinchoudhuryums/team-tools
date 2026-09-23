// ════════════════════════════════════════════════════════════════════════════
//  UMS TEAM TOOLS — 82_coaching.js
//  Coaching: the log, the signal board and the weekly recap.
//
//  ONE Apps Script project, ONE global scope: these files are the SERVER, in
//  the load order `web-app/.clasp.json` filePushOrder declares. Batch F2 split
//  them out of Code.js as a MOVE — every declaration below is byte-identical to
//  the one it replaced, and the SPLIT-MANIFEST pin proves it.
// ════════════════════════════════════════════════════════════════════════════

/** Pure (Node-pinned) — createCoaching payload validation. Whitelist-built;
 *  references COACH_SEVERITIES / COACH_TEXT_MAX (injected in the Node harness,
 *  the isValidTimeOffType_ pattern). 'whatShould' is optional (praise rarely
 *  needs it); 'whatHappened' is always required. PR 4: the optional
 *  followUpAt / noteDate (yyyy-MM-dd or blank — anything else is dropped, not
 *  rejected, so a stale client cannot be blocked by a field it never sends)
 *  and qaFileId (trimmed, capped) ride the same whitelist. */
function coachValidate_(payload) {
  payload = payload || {};
  var empId = String(payload.empId || '').trim();
  if (!empId) return { ok: false, error: 'Pick an employee.' };
  var severity = String(payload.severity || '').trim().toLowerCase();
  if (COACH_SEVERITIES.indexOf(severity) < 0) {
    // Operator 2026-09-10: the enum leaked here as 'major' while every card
    // and mail says Moderate — derive the words from the ONE label map.
    return { ok: false, error: 'Pick a severity (' + COACH_SEVERITIES.map(function (s) { return COACH_SEV_LABELS[s] || s; }).join(' / ') + ').' };
  }
  var whatHappened = String(payload.whatHappened || '').trim();
  if (!whatHappened) return { ok: false, error: 'Describe what happened.' };
  if (whatHappened.length > COACH_TEXT_MAX) return { ok: false, error: 'What happened is too long (max ' + COACH_TEXT_MAX + ' chars).' };
  var whatShould = String(payload.whatShould || '').trim();
  if (whatShould.length > COACH_TEXT_MAX) return { ok: false, error: 'What should have happened is too long (max ' + COACH_TEXT_MAX + ' chars).' };
  var patientTRX = String(payload.patientTRX || '').trim();
  if (patientTRX.length > COACH_TRX_MAX) return { ok: false, error: 'Patient/TRX reference is too long.' };
  var noteId = String(payload.noteId || '').trim();
  var followUpAt = coachIsoDateOrBlank_(payload.followUpAt);
  var noteDate = coachIsoDateOrBlank_(payload.noteDate);
  var qaFileId = String(payload.qaFileId || '').trim().slice(0, 200);
  return { ok: true, item: { empId: empId, severity: severity, whatHappened: whatHappened, whatShould: whatShould, patientTRX: patientTRX, noteId: noteId,
    followUpAt: followUpAt, noteDate: noteDate, qaFileId: qaFileId } };
}
/** Pure — a yyyy-MM-dd string or ''. Anything else reads as blank. */
function coachIsoDateOrBlank_(v) {
  var s = String(v || '').trim().substring(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}
/** Pure (Node-pinned) — business-day age of an item, or NULL when unknown.
 *  `opts.bizMinutes(startMs, endMs)` is the injected business-hours helper
 *  (production: businessMinutesBetween_ — Apps-Script-bound, so it is passed
 *  in rather than called); `opts.dayMinutes` is the length of one business
 *  day. With no injection the age is wall-clock days (the Node pins' default,
 *  and byte-identical to the pre-PR-4 arithmetic). A null from the helper
 *  means UNKNOWN and is never coerced to 0 (INV-187). */
function coachAgeDays_(createdAtMs, nowMs, opts) {
  if (!(createdAtMs > 0) || !(nowMs > 0)) return null;
  if (opts && typeof opts.bizMinutes === 'function') {
    var min = opts.bizMinutes(createdAtMs, nowMs);
    if (min == null || !isFinite(min)) return null;
    var dm = Number(opts.dayMinutes) || 540;
    return Math.round((min / dm) * 10) / 10;
  }
  return Math.round(((nowMs - createdAtMs) / 86400000) * 10) / 10;
}
/** Pure (Node-pinned) — the open, non-praise coaching items that should nudge
 *  the manager: older than `days` (BUSINESS days when `opts.bizMinutes` is
 *  injected — K9, operator decision 7; wall-clock without it), OR — when
 *  `opts.todayIso` is given — an open item whose FollowUpAt has passed (K10:
 *  the 1-on-1 the manager scheduled is now due). Items carry a precomputed
 *  `createdAtMs`. An item whose age is UNKNOWN (a null from the helper) is
 *  never reported overdue — unknown is not late (INV-187). */
function coachUnackedOverdue_(items, nowMs, days, opts) {
  opts = opts || {};
  var out = [];
  (items || []).forEach(function (it) {
    if (!it || it.status !== 'open') return;
    if (it.severity === 'praise') return;            // praise never nags (K3)
    var age = coachAgeDays_(it.createdAtMs, nowMs, opts);
    var overdue = age != null && age >= (days || 0);
    var followDue = !!(opts.todayIso && it.followUpAt && it.followUpAt < opts.todayIso);
    if (overdue || followDue) { it.followUpDue = followDue; out.push(it); }
  });
  return out;
}
/** Pure (Node-pinned) — parse a 'yyyy-MM-dd HH:mm:ss' (or 'T'-form) stamp to
 *  ms as UTC. Only used for DIFFERENCES (ack − created), so the fixed-UTC
 *  interpretation cancels out and tz never skews a day-count. NaN on garbage. */
function coachParseTs_(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(String(s || ''));
  if (!m) return NaN;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}
/** Pure — median of a numeric array (0 when empty), 1-decimal rounded. */
function coachMedian_(arr) {
  const a = (arr || []).filter(function (x) { return typeof x === 'number' && !isNaN(x); }).sort(function (x, y) { return x - y; });
  if (!a.length) return 0;
  const mid = Math.floor(a.length / 2);
  const v = a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  return Math.round(v * 10) / 10;
}
/** Pure (Node-pinned) — manager coaching analytics over the team-scoped items.
 *  Aggregates: totals, by-severity, acknowledged + ack-rate, overdue-unacked,
 *  median days-to-acknowledge, and a per-rep breakdown (most-overdue first).
 *  No PHI — counts + the empName already in the items.
 *  PR 4: (K3, operator decision 8) the ack-rate denominator EXCLUDES praise —
 *  it is a rate over items that require an answer; (K9) overdue + the median
 *  are BUSINESS days when `opts.bizMinutes` is injected. */
function coachAnalytics_(items, nowMs, reminderDays, opts) {
  items = items || [];
  opts = opts || {};
  const sev = { praise: 0, minor: 0, major: 0, critical: 0 };
  const ackDays = [];
  const perRep = {};
  let acknowledged = 0, overdue = 0, needsAck = 0;
  items.forEach(function (it) {
    if (sev[it.severity] != null) sev[it.severity]++;
    const isPraise = it.severity === 'praise';
    const isAck = it.status === 'acknowledged';
    if (!isPraise) needsAck++;
    if (isAck && !isPraise) acknowledged++;
    const c = coachParseTs_(it.createdAt);
    const age = coachAgeDays_(isNaN(c) ? 0 : c, nowMs, opts);
    const isOverdue = it.status === 'open' && !isPraise && age != null && age >= (reminderDays || 0);
    if (isOverdue) overdue++;
    let d = NaN;
    if (isAck && !isPraise && it.acknowledgedAt) {
      const a = coachParseTs_(it.acknowledgedAt);
      if (!isNaN(c) && !isNaN(a) && a >= c) {
        const dd = coachAgeDays_(c, a, opts);
        if (dd != null) { d = dd; ackDays.push(d); }
      }
    }
    const r = perRep[it.empId] || (perRep[it.empId] = { empId: it.empId, empName: it.empName, total: 0, needsAck: 0, acknowledged: 0, overdue: 0, _ackDays: [] });
    r.total++;
    if (!isPraise) r.needsAck++;
    if (isAck && !isPraise) r.acknowledged++;
    if (isOverdue) r.overdue++;
    if (!isNaN(d)) r._ackDays.push(d);
  });
  const reps = Object.keys(perRep).map(function (id) {
    const r = perRep[id];
    return {
      empId: r.empId, empName: r.empName, total: r.total, acknowledged: r.acknowledged,
      overdue: r.overdue,
      ackRatePct: r.needsAck ? Math.round((r.acknowledged / r.needsAck) * 100) : 0,
      medianDaysToAck: coachMedian_(r._ackDays),
    };
  }).sort(function (a, b) {
    if (b.overdue !== a.overdue) return b.overdue - a.overdue;
    return b.total - a.total;
  });
  return {
    total: items.length, bySeverity: sev,
    acknowledged: acknowledged, overdueUnacked: overdue,
    ackRatePct: needsAck ? Math.round((acknowledged / needsAck) * 100) : 0,
    medianDaysToAck: coachMedian_(ackDays),
    perRep: reps,
  };
}
/** The injected business-hours contract every coaching consumer passes to the
 *  pure helpers (K9): ONE definition of a business day, shared with the
 *  Coverage planner and every other elapsed-time figure in the app. */
function coachBizOpts_() {
  const win = businessHours_();
  return {
    bizMinutes: businessMinutesBetween_,
    dayMinutes: Math.max(60, win.endMin - win.startMin),
    todayIso: Utilities.formatDate(new Date(), CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE, 'yyyy-MM-dd'),
  };
}
function coachRowToObj_(row, ssTz) {
  return {
    coachId: String(row[CO.COACH_ID] || '').trim(),
    empId: String(row[CO.EMP_ID] || '').trim(),
    empName: String(row[CO.EMP_NAME] || ''),
    patientTRX: String(row[CO.PATIENT_TRX] || ''),
    severity: String(row[CO.SEVERITY] || '').trim().toLowerCase(),
    whatHappened: String(row[CO.WHAT_HAPPENED] || ''),
    whatShould: String(row[CO.WHAT_SHOULD] || ''),
    noteId: String(row[CO.NOTE_ID] || '').trim(),
    status: String(row[CO.STATUS] || 'open').trim(),
    createdBy: String(row[CO.CREATED_BY] || '').toLowerCase().trim(),
    createdAt: trainCellTs_(row[CO.CREATED_AT], ssTz),
    acknowledgedAt: trainCellTs_(row[CO.ACK_AT], ssTz),
    ackBy: String(row[CO.ACK_BY] || '').toLowerCase().trim(),
    voidReason: String(row[CO.VOID_REASON] || ''),
    repResponse: String(row[CO.REP_RESPONSE] || ''),
    followUpAt: trainCellDate_(row[CO.FOLLOW_UP_AT], ssTz),
    nudgedAt: trainCellTs_(row[CO.NUDGED_AT], ssTz),
    noteDate: trainCellDate_(row[CO.NOTE_DATE], ssTz),
    qaFileId: String(row[CO.QA_FILE_ID] || '').trim(),
  };
}
/** Bounded id-column lookup → { rowIdx, item } or null (the findEmpDocRow_ pattern). */
function findCoachingRow_(coachId) {
  coachId = String(coachId || '').trim();
  if (!coachId) return null;
  const sheet = getOrCreateEmpDocSheet_(COACH_TAB, COACH_HEADERS);
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const ids = sheet.getRange(2, CO.COACH_ID + 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() !== coachId) continue;
    const row = sheet.getRange(i + 2, 1, 1, COACH_HEADERS.length).getValues()[0];
    return { rowIdx: i + 2, item: coachRowToObj_(row, getHrDocsSS_().getSpreadsheetTimeZone()) };
  }
  return null;
}
/** FAIL-CLOSED team scoping (the empDocCanManagerSee_ rule): a manager sees a
 *  coaching item only when they CREATED it or they are the employee's roster
 *  ManagerEmail (column M). MANAGER_EMAILS membership alone grants nothing. */
function coachCanManagerSee_(callerEmp, item) {
  if (!callerEmp || !callerEmp.isManager) return false;
  const caller = String(callerEmp.email || '').toLowerCase().trim();
  if (caller && caller === String(item.createdBy || '').toLowerCase().trim()) return true;
  const target = lookupEmployeeById_(item.empId);
  return !!(target && target.managerEmail && target.managerEmail === caller);
}
/** Manager-gated (INV-02), locked (INV-01). Creates a coaching item for an
 *  employee. Any manager may issue (issuing reveals nothing); READING stays
 *  team-scoped. The patient/TRX + free text are HR-class PHI-adjacent and live
 *  ONLY in the HR store; the audit row is content-free (coachId/empId/severity
 *  — never the patient/TRX or the narrative).
 *  K8 (operator decision 1): ONLY a CRITICAL item mails the rep immediately —
 *  minor / moderate / praise arrive in the weekly recap instead. The send is
 *  post-lock (M-7) and best-effort; `mailed` on the response is TRUE only when
 *  the send actually went (false when it threw, absent when none was owed). */
function createCoaching(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let notifyAfter = null;
  let result = null;
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const v = coachValidate_(payload);
    if (!v.ok) return { success: false, error: v.error };
    const target = lookupEmployeeById_(v.item.empId);
    if (!target) return { success: false, error: 'Unknown employee.' };
    const coachId = Utilities.getUuid();
    const now = new Date();
    const ts = fmtDate_(now) + ' ' + fmtTime_(now);
    getOrCreateEmpDocSheet_(COACH_TAB, COACH_HEADERS).appendRow(sheetSafeRow_([
      coachId, target.id, target.name, v.item.patientTRX, v.item.severity,
      v.item.whatHappened, v.item.whatShould, v.item.noteId, 'open',
      callerEmp.email, ts, '', '', '', '', v.item.followUpAt, '', v.item.noteDate, v.item.qaFileId,
    ]));
    writeAuditLog_(callerEmp, 'CoachingCreate', fmtDate_(now), '', false, 0,
      'coachId=' + coachId + '; empId=' + target.id + '; severity=' + v.item.severity, callerEmp.email);
    result = { success: true, coachId: coachId };
    if (v.item.severity === 'critical') {
      result.mailed = false;
      notifyAfter = function () { result.mailed = notifyRepOfCoaching_(target, v.item, callerEmp, ts); };   // M-7: post-lock
    }
    return result;
  } catch (err) { return { success: false, error: err.message }; }
  finally {
    lock.releaseLock();
    // M-7: best-effort mail fires only after the global lock is released. The
    // result object is already the caller's return value; mutating `mailed`
    // here is visible to them because JS returns the REFERENCE.
    if (notifyAfter) { try { notifyAfter(); } catch (e) { console.warn('post-lock notify failed: ' + e.message); } }
  }
}
/** Rep-callable, caller-scoped, read-only — the caller's OWN coaching items
 *  (full content; it's their own record). Newest first; excludes voided.
 *  PR 4: each item carries `ageDays` (BUSINESS days since logged — null when
 *  unknown) so the rep view can name the age of the oldest open item. */
function getMyCoaching() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const sheet = getOrCreateEmpDocSheet_(COACH_TAB, COACH_HEADERS);
    const last = sheet.getLastRow();
    if (last < 2) return { items: [] };
    const ssTz = getHrDocsSS_().getSpreadsheetTimeZone();
    const rows = sheet.getRange(2, 1, last - 1, COACH_HEADERS.length).getValues();
    const biz = coachBizOpts_();
    const nowMs = Date.now();
    const items = [];
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][CO.EMP_ID]).trim() !== emp.id) continue;
      const c = coachRowToObj_(rows[i], ssTz);
      if (c.status === 'void') continue;
      const createdMs = coachParseTs_(c.createdAt);
      c.ageDays = coachAgeDays_(isNaN(createdMs) ? 0 : createdMs, nowMs, biz);
      c.createdByName = coachActorName_(c.createdBy);
      items.push(c);
    }
    items.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
    return { items: items, businessDayMinutes: biz.dayMinutes };
  } catch (err) { return { error: err.message }; }
}
/** The display name for a coaching actor email (roster lookup, best-effort;
 *  falls back to the email's local part). Reps could not see WHO logged an
 *  item before PR 4. */
function coachActorName_(email) {
  email = String(email || '').toLowerCase().trim();
  if (!email) return '';
  try {
    const rows = getEmployeeRosterRows_();
    for (let i = 1; i < rows.length; i++) {
      if (empRosterEmail_(rows[i]).toLowerCase() === email) return String(rows[i][EMP.NAME] || '').trim() || email;
    }
  } catch (e) { /* best-effort */ }
  return email.split('@')[0];
}
/** Rep-callable, locked (INV-01), OWNER-only — the employee acknowledges they
 *  have read the coaching. Idempotent (already-acked → friendly no-op). Audit
 *  CoachingAck (content-free). K2: the optional `response` (≤ 2000 chars) is
 *  written to RepResponse ONLY on the open→acknowledged transition — a second
 *  ack never overwrites the reply; the reply itself stays in the HR store. */
function acknowledgeCoaching(coachId, response) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let notifyAfter = null;
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Not authorized.' };
    const found = findCoachingRow_(coachId);
    if (!found || found.item.empId !== emp.id) return { success: false, error: 'Coaching item not found.' };
    if (found.item.status === 'void') return { success: false, error: 'This item is no longer active.' };
    if (found.item.status === 'acknowledged') return { success: true, alreadyAcknowledged: true, acknowledgedAt: found.item.acknowledgedAt };
    const reply = String(response || '').trim();
    if (reply.length > COACH_RESPONSE_MAX) return { success: false, error: 'Reply is too long (max ' + COACH_RESPONSE_MAX + ' chars).' };
    const now = new Date();
    const ts = fmtDate_(now) + ' ' + fmtTime_(now);
    const sheet = getOrCreateEmpDocSheet_(COACH_TAB, COACH_HEADERS);
    sheet.getRange(found.rowIdx, CO.STATUS + 1).setValue(sheetSafe_('acknowledged'));
    sheet.getRange(found.rowIdx, CO.ACK_AT + 1).setValue(sheetSafe_(ts));
    sheet.getRange(found.rowIdx, CO.ACK_BY + 1).setValue(sheetSafe_(emp.email));
    if (reply) sheet.getRange(found.rowIdx, CO.REP_RESPONSE + 1).setValue(sheetSafe_(reply));
    writeAuditLog_(emp, 'CoachingAck', fmtDate_(now), '', false, 0,
      'coachId=' + found.item.coachId + '; ackAt=' + ts);
    notifyAfter = function () { notifyManagerOfCoachingAck_(found.item, emp, !!reply); };   // M-7: post-lock
    pendingTasksBust_(emp.id);                                   // F4
    return { success: true, acknowledgedAt: ts };
  } catch (err) { return { success: false, error: err.message }; }
  finally {
    lock.releaseLock();
    // M-7: best-effort mail fires only after the global lock is released.
    if (notifyAfter) { try { notifyAfter(); } catch (e) { console.warn('post-lock notify failed: ' + e.message); } }
  }
}
/** Manager-gated (INV-02), read-only, TEAM-SCOPED (coachCanManagerSee_).
 *  Returns the coaching items the manager may see + summary counts (open /
 *  acknowledged / overdue-unacked / praise). PR 4: praise is EXCLUDED from
 *  `counts.open` and from overdue (K3 — it needs no acknowledgement); ages
 *  are BUSINESS days (K9); `voided[]` (team-scoped, newest first, capped) so
 *  the void reason is finally visible somewhere other than the sheet (K6). */
function getCoachingDashboard() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const sheet = getOrCreateEmpDocSheet_(COACH_TAB, COACH_HEADERS);
    const last = sheet.getLastRow();
    const reminderDays = CONFIG.COACHING_UNACK_REMINDER_DAYS || 7;
    const biz = coachBizOpts_();
    if (last < 2) {
      // The empty shape carries every field the populated one does (INV-185 —
      // the visual fixture's empty twin mirrors THIS, not a narrower payload).
      return { items: [], voided: [], voidedTotal: 0, counts: { open: 0, acknowledged: 0, overdueUnacked: 0, praise: 0 },
        reminderDays: reminderDays, businessDayMinutes: biz.dayMinutes, todayIso: biz.todayIso,
        analytics: coachAnalytics_([], Date.now(), reminderDays, biz) };
    }
    const ssTz = getHrDocsSS_().getSpreadsheetTimeZone();
    const rows = sheet.getRange(2, 1, last - 1, COACH_HEADERS.length).getValues();
    const nowMs = Date.now();
    const items = [];
    const voided = [];
    const counts = { open: 0, acknowledged: 0, overdueUnacked: 0, praise: 0 };
    for (let i = 0; i < rows.length; i++) {
      const c = coachRowToObj_(rows[i], ssTz);
      if (!c.coachId) continue;
      if (!coachCanManagerSee_(callerEmp, c)) continue;
      if (c.status === 'void') { voided.push(c); continue; }
      // F(H-1): CreatedAt is stamped in SPACE form ('yyyy-MM-dd HH:mm:ss');
      // parseTimestampMs_ expects the 'T' form and returned null for every row,
      // so overdueUnacked was permanently false. coachParseTs_ accepts both.
      const createdMs = coachParseTs_(c.createdAt);
      c.ageDays = coachAgeDays_(isNaN(createdMs) ? 0 : createdMs, nowMs, biz);
      c.overdueUnacked = (c.status === 'open' && c.severity !== 'praise' && c.ageDays != null && c.ageDays >= reminderDays);
      c.followUpDue = !!(c.status === 'open' && c.followUpAt && c.followUpAt < biz.todayIso);
      c.nudgedToday = !!(c.nudgedAt && coachStampDayMgr_(c.nudgedAt) === biz.todayIso);
      if (c.status === 'open' && c.severity !== 'praise') counts.open++;
      if (c.status === 'acknowledged') counts.acknowledged++;
      if (c.severity === 'praise') counts.praise++;
      if (c.overdueUnacked) counts.overdueUnacked++;
      items.push(c);
    }
    items.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
    voided.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
    return { items: items, voided: voided.slice(0, COACH_VOIDED_CAP), voidedTotal: voided.length,
      counts: counts, reminderDays: reminderDays, businessDayMinutes: biz.dayMinutes, todayIso: biz.todayIso,
      analytics: coachAnalytics_(items, nowMs, reminderDays, biz) };
  } catch (err) { return { error: err.message }; }
}
/** Manager-gated (INV-02), locked (INV-01). Soft-voids a coaching item (a
 *  mistaken/duplicate entry) — never deletes. Audit CoachingVoid. K8: voiding
 *  a CRITICAL item sends a short retraction to the same recipient (post-lock)
 *  — an unretracted "critical" notice in a rep's inbox is worse than none. */
function voidCoaching(coachId, reason) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let notifyAfter = null;
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const found = findCoachingRow_(coachId);
    if (!found) return { success: false, error: 'Coaching item not found.' };
    if (!coachCanManagerSee_(callerEmp, found.item)) return { success: false, error: 'Coaching item not found.' };
    const sheet = getOrCreateEmpDocSheet_(COACH_TAB, COACH_HEADERS);
    sheet.getRange(found.rowIdx, CO.STATUS + 1).setValue(sheetSafe_('void'));
    // F(cycle-8 M-6): the reason (free text plausibly naming a patient/TRX —
    // "logged against wrong patient, TRX 4482…") persists in the team-scoped
    // HR store's VoidReason column, NEVER in the shared PHI-free AuditLog
    // (INV-134/INV-32 — the row previously carried `reason=` and surfaced in
    // the compliance panel + admin sheet viewer). Mirrors voidDoc.
    if (reason) sheet.getRange(found.rowIdx, CO.VOID_REASON + 1).setValue(sheetSafe_(String(reason).slice(0, 500)));
    writeAuditLog_(callerEmp, 'CoachingVoid', '', '', false, 0,
      'coachId=' + found.item.coachId, callerEmp.email);
    if (found.item.severity === 'critical' && found.item.status !== 'void') {
      const item = found.item;
      notifyAfter = function () { notifyRepOfCoachingRetraction_(item, callerEmp); };   // M-7: post-lock
    }
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally {
    lock.releaseLock();
    if (notifyAfter) { try { notifyAfter(); } catch (e) { console.warn('post-lock notify failed: ' + e.message); } }
  }
}
/** K10 — manager-gated (INV-02), TEAM-SCOPED, locked (INV-01). Sets or clears
 *  the item's FollowUpAt (a calendar DATE — "Revisit on"). Audit
 *  CoachingFollowUp, id-only (the date is HR-record detail). */
function setCoachingFollowUp(coachId, dateOrNull) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const iso = coachIsoDateOrBlank_(dateOrNull);
    if (dateOrNull && !iso) return { success: false, error: 'Pick a date (yyyy-MM-dd) or clear it.' };
    const found = findCoachingRow_(coachId);
    if (!found || !coachCanManagerSee_(callerEmp, found.item)) return { success: false, error: 'Coaching item not found.' };
    if (found.item.status === 'void') return { success: false, error: 'This item is no longer active.' };
    const sheet = getOrCreateEmpDocSheet_(COACH_TAB, COACH_HEADERS);
    sheet.getRange(found.rowIdx, CO.FOLLOW_UP_AT + 1).setValue(sheetSafe_(iso));
    writeAuditLog_(callerEmp, 'CoachingFollowUp', '', '', false, 0,
      'coachId=' + found.item.coachId + '; set=' + (iso ? 'yes' : 'cleared'), callerEmp.email);
    return { success: true, followUpAt: iso };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** K11 — manager-gated (INV-02), TEAM-SCOPED, locked (INV-01). Re-sends the
 *  reminder for an UNACKNOWLEDGED item, at most once per item per manager-tz
 *  day (the NudgedAt stamp is the rate limit). Mail post-lock (M-7), audit
 *  CoachingNudge id-only. */
/** The MANAGER-tz calendar day of a coaching stamp. Stamps are written by
 *  fmtDate_/fmtTime_ in CONFIG.TIMEZONE (Asia/Kolkata) while "today" for the
 *  once-per-day nudge rule is the manager's day (America/Chicago) — the two
 *  frames disagree from 13:30 CDT onward, so a raw `substring(0, 10)` compare
 *  let a manager nudge twice every afternoon and then blocked the next
 *  morning against yesterday's stamp (caught by the post-deploy runAllTests,
 *  2026-09-02). Returns '' for an unparseable stamp — never a day that
 *  happens to match. */
function coachStampDayMgr_(ts) {
  try {
    const d = Utilities.parseDate(String(ts || '').trim(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    return Utilities.formatDate(d, CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE, 'yyyy-MM-dd');
  } catch (_) { return ''; }
}
function nudgeCoaching(coachId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let notifyAfter = null;
  let result = null;
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const found = findCoachingRow_(coachId);
    if (!found || !coachCanManagerSee_(callerEmp, found.item)) return { success: false, error: 'Coaching item not found.' };
    if (found.item.status !== 'open') return { success: false, error: 'Only an open (unacknowledged) item can be nudged.' };
    if (found.item.severity === 'praise') return { success: false, error: 'Praise needs no acknowledgement.' };
    const todayIso = Utilities.formatDate(new Date(), CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE, 'yyyy-MM-dd');
    if (found.item.nudgedAt && coachStampDayMgr_(found.item.nudgedAt) === todayIso) {
      return { success: false, error: 'Already nudged today — once per day per item.' };
    }
    const target = lookupEmployeeById_(found.item.empId);
    if (!target || !target.email) return { success: false, error: 'The employee has no login email on the roster.' };
    const now = new Date();
    const ts = fmtDate_(now) + ' ' + fmtTime_(now);
    const sheet = getOrCreateEmpDocSheet_(COACH_TAB, COACH_HEADERS);
    sheet.getRange(found.rowIdx, CO.NUDGED_AT + 1).setValue(sheetSafe_(ts));
    writeAuditLog_(callerEmp, 'CoachingNudge', fmtDate_(now), '', false, 0,
      'coachId=' + found.item.coachId, callerEmp.email);
    result = { success: true, nudgedAt: ts, mailed: false };
    const item = found.item;
    notifyAfter = function () { result.mailed = notifyRepOfCoachingNudge_(target, item, callerEmp); };   // M-7: post-lock
    return result;
  } catch (err) { return { success: false, error: err.message }; }
  finally {
    lock.releaseLock();
    if (notifyAfter) { try { notifyAfter(); } catch (e) { console.warn('post-lock notify failed: ' + e.message); } }
  }
}
/** All open, non-praise coaching items past the reminder window (BUSINESS
 *  days, K9) or past their FollowUpAt (K10), as [{ item, empName }] for
 *  per-manager scoping in the digest. Returns [] (never throws) when the HR
 *  store is unavailable. */
function coachUnackedAll_(nowMs) {
  try {
    const sheet = getOrCreateEmpDocSheet_(COACH_TAB, COACH_HEADERS);
    const last = sheet.getLastRow();
    if (last < 2) return [];
    const ssTz = getHrDocsSS_().getSpreadsheetTimeZone();
    const rows = sheet.getRange(2, 1, last - 1, COACH_HEADERS.length).getValues();
    const items = [];
    for (let i = 0; i < rows.length; i++) {
      const c = coachRowToObj_(rows[i], ssTz);
      if (!c.coachId) continue;
      // F(H-1): coachParseTs_ (both stamp forms), NOT parseTimestampMs_ ('T'-only
      // — it nulled every space-form stamp and the digest nudge never fired).
      c.createdAtMs = coachParseTs_(c.createdAt);
      items.push(c);
    }
    return coachUnackedOverdue_(items, nowMs, CONFIG.COACHING_UNACK_REMINDER_DAYS || 7, coachBizOpts_())
      .map(function (c) { return { item: c, empName: c.empName }; });
  } catch (e) {
    Logger.log('coachUnackedAll_ skipped (HR docs store unavailable): ' + e.message);
    return [];
  }
}

// ── K8 — the coaching mail family. EVERY builder here is NARRATIVE-FREE BY
// CONSTRUCTION: none of them receives whatHappened / whatShould / patientTRX /
// noteId as a parameter, so a future edit cannot leak them without changing a
// signature (the pure Node pin feeds the builders and asserts the output holds
// none of the four). An inbox is not behind authentication (INV-134).
/** One send path for every coaching mail — the test seam lives here. Returns
 *  true when the send went, false when it threw (best-effort, INV-14). */
function coachSendMail_(msg) {
  try {
    if (typeof _TEST_OVERRIDE_COACH_MAIL === 'function') { _TEST_OVERRIDE_COACH_MAIL(msg); return true; }
    appSendMail_(msg);
    return true;
  } catch (e) { console.warn('coaching mail failed: ' + e.message); return false; }
}
/** Pure (Node-pinned) — the CRITICAL notice body (doc §5). Takes only what
 *  the email may carry: who logged it, when, the follow-up date (row omitted
 *  when unset), and the CTA. */
function coachCriticalMailHtml_(mgrName, loggedAt, followUpAt, ctaUrl) {
  const P = CN_EMAIL_PALETTE;
  const rows = [
    ['Logged by', mgrName],
    ['Logged', loggedAt],
    ['Severity', COACH_SEV_LABELS.critical],
    ['Acknowledgement', 'Required — overdue after ' + (CONFIG.COACHING_UNACK_REMINDER_DAYS || 7) + ' business days'],
  ];
  if (followUpAt) rows.push(['1-on-1', 'Scheduled for ' + followUpAt]);
  const body =
    '<p style="margin:0 0 10px;">' + esc_(mgrName) + ' logged a <strong>critical</strong> coaching item for you. Please open Team Tools to read it and acknowledge it — you can reply in the same place.</p>' +
    brandedKvRows_(rows) +
    '<div style="margin:14px 0 0;padding:10px 12px;background:' + P.paper + ';border:1px solid ' + P.line + ';border-radius:8px;font-size:12px;color:' + P.muted + ';">' +
      'This notice contains no patient information and no narrative — the detail is only visible inside the app, behind your login.</div>' +
    '<p style="margin:12px 0 0;font-size:12px;color:' + P.muted + ';">Minor and moderate items are not emailed individually; they arrive in your weekly coaching recap.</p>';
  return buildBrandedEmailHtml_(mgrName + ' logged a critical coaching item for you', body,
    { tone: 'danger', subLabel: 'Training · Coaching', statusLabel: 'Needs your acknowledgement',
      ctaUrl: ctaUrl, ctaLabel: 'Open Coaching' });
}
/** Pure (Node-pinned) — the retraction sent when a critical item is voided. */
function coachRetractionMailHtml_(mgrName, loggedAt, ctaUrl) {
  return buildBrandedEmailHtml_('A critical coaching item was withdrawn',
    '<p style="margin:0 0 10px;">The critical coaching item ' + esc_(mgrName) + ' logged for you on ' + esc_(loggedAt) + ' has been voided. No action is needed on it.</p>' +
    brandedKvRows_([['Logged by', mgrName], ['Logged', loggedAt], ['Status', 'Withdrawn']]),
    { tone: 'info', subLabel: 'Training · Coaching', statusLabel: 'Withdrawn', ctaUrl: ctaUrl, ctaLabel: 'Open Coaching' });
}
/** Pure (Node-pinned) — the Nudge reminder (K11). */
function coachNudgeMailHtml_(mgrName, loggedAt, severity, ctaUrl) {
  return buildBrandedEmailHtml_('Reminder: coaching awaiting your acknowledgement',
    '<p style="margin:0 0 10px;">' + esc_(mgrName) + ' is asking you to read and acknowledge a coaching item logged on ' + esc_(loggedAt) + '.</p>' +
    brandedKvRows_([['Logged by', mgrName], ['Logged', loggedAt], ['Severity', COACH_SEV_LABELS[severity] || severity]]),
    { tone: 'warn', subLabel: 'Training · Coaching', statusLabel: 'Reminder', ctaUrl: ctaUrl, ctaLabel: 'Open Coaching' });
}
/** Best-effort (INV-14) — the CRITICAL notice to the rep, cc the logging
 *  manager (their record that it went). Returns true/false (mailed). Called
 *  ONLY for severity === 'critical' (K8). */
function notifyRepOfCoaching_(target, item, manager, loggedAt) {
  if (!target.email) return false;
  if (item.severity !== 'critical') return false;
  const htmlBody = coachCriticalMailHtml_(manager.name, loggedAt, item.followUpAt || '', safeWebAppUrl_('coaching'));
  const body = manager.name + ' logged a critical coaching item for you on ' + loggedAt + '. Please open Team Tools → Training & Employee Docs → Coaching to read and acknowledge it.' +
    (item.followUpAt ? ' A 1-on-1 is scheduled for ' + item.followUpAt + '.' : '') +
    '\n\nThis notice contains no patient information and no narrative. Minor and moderate items arrive in your weekly coaching recap.';
  return coachSendMail_({ to: target.email, cc: manager.email || '', subject: 'Action needed: coaching logged for you — please acknowledge', body: body, htmlBody: htmlBody });
}
/** Best-effort — the retraction when a critical item is voided (K8). */
function notifyRepOfCoachingRetraction_(item, manager) {
  const target = lookupEmployeeById_(item.empId);
  if (!target || !target.email) return false;
  const loggedAt = String(item.createdAt || '').substring(0, 16);
  return coachSendMail_({ to: target.email, cc: manager.email || '', subject: 'Withdrawn: the critical coaching item logged for you',
    body: 'The critical coaching item ' + manager.name + ' logged for you on ' + loggedAt + ' has been voided. No action is needed.',
    htmlBody: coachRetractionMailHtml_(manager.name, loggedAt, safeWebAppUrl_('coaching')) });
}
/** Best-effort — the Nudge reminder (K11). */
function notifyRepOfCoachingNudge_(target, item, manager) {
  const loggedAt = String(item.createdAt || '').substring(0, 16);
  return coachSendMail_({ to: target.email, subject: 'Reminder: coaching awaiting your acknowledgement',
    body: manager.name + ' is asking you to read and acknowledge the coaching item logged on ' + loggedAt + '. Open Team Tools → Training & Employee Docs → Coaching.',
    htmlBody: coachNudgeMailHtml_(manager.name, loggedAt, item.severity, safeWebAppUrl_('coaching')) });
}
/** Best-effort — tell the issuing manager their coaching was acknowledged
 *  (and whether the rep replied — the reply itself stays in the app). */
function notifyManagerOfCoachingAck_(item, rep, replied) {
  try {
    if (!item.createdBy) return;
    const sevLabel = COACH_SEV_LABELS[item.severity] || item.severity;
    const body = rep.name + ' acknowledged your coaching (' + sevLabel + ').' + (replied ? ' They left a reply — open Coaching to read it.' : '');
    coachSendMail_({ to: item.createdBy, subject: 'Acknowledged: coaching for ' + rep.name,
      body: body, htmlBody: buildBrandedEmailHtml_('Coaching acknowledged',
        brandedKvRows_([['Employee', rep.name], ['Type', sevLabel], ['Reply', replied ? 'Yes — in the app' : 'None']]),
        { tone: 'success', subLabel: 'Training · Coaching', ctaUrl: safeWebAppUrl_('coaching'), ctaLabel: 'Open Coaching' }) });
  } catch (e) { console.warn('notifyManagerOfCoachingAck_ failed: ' + e.message); }
}
/** Pure (Node-pinned) — bucket the trailing-window NON-critical items by rep.
 *  Returns { empId: [items] }; critical items are excluded (they mailed at
 *  create), voided rows are excluded, older rows are excluded. */
function coachRecapBuckets_(items, nowMs, windowDays) {
  const cutoff = nowMs - (windowDays || 7) * 86400000;
  const by = {};
  (items || []).forEach(function (c) {
    if (!c || !c.coachId || c.status === 'void' || c.severity === 'critical') return;
    const ms = coachParseTs_(c.createdAt);
    if (isNaN(ms) || ms < cutoff) return;
    (by[c.empId] = by[c.empId] || []).push(c);
  });
  return by;
}
/** K8 (operator decision 1) — WEEKLY per-agent recap of the NON-critical
 *  coaching (minor / moderate / praise) logged for them in the trailing
 *  CONFIG.COACHING_RECAP_DAYS. Top-level trigger handler (Friday 8am
 *  manager-tz, beside the weekly CN digests), so it carries the MANAGER_EMAILS
 *  assertManagerCaller_ gate (INV-44). AGENT-facing, so it NEVER consults the
 *  manager-brief flag (INV-151: employee-facing mail always sends) and the
 *  manager receives nothing from it. One branded email per agent with ≥1
 *  item; an agent with nothing new gets nothing. NO narrative / TRX / noteId
 *  (INV-134). Heartbeat `coachingRecap`. */
function sendCoachingRecapDigest() {
  assertManagerCaller_('sendCoachingRecapDigest');  // see sendDailyMissedPunchAlerts note
  try {
    const windowDays = CONFIG.COACHING_RECAP_DAYS || 7;
    const nowMs = Date.now();
    let items = [];
    try {
      const sheet = getOrCreateEmpDocSheet_(COACH_TAB, COACH_HEADERS);
      const last = sheet.getLastRow();
      if (last >= 2) {
        const ssTz = getHrDocsSS_().getSpreadsheetTimeZone();
        const rows = sheet.getRange(2, 1, last - 1, COACH_HEADERS.length).getValues();
        for (let i = 0; i < rows.length; i++) items.push(coachRowToObj_(rows[i], ssTz));
      }
    } catch (e) {
      Logger.log('sendCoachingRecapDigest: HR store unavailable — ' + e.message);
      stampDigestLastRun_('coachingRecap');
      return;
    }
    const buckets = coachRecapBuckets_(items, nowMs, windowDays);
    const roster = getEmployeeRosterRows_();
    const byId = {}, nameByEmail = {};
    for (let r = 1; r < roster.length; r++) {
      const email = empRosterEmail_(roster[r]);
      if (!email) continue;
      byId[String(roster[r][EMP.ID]).trim()] = { email: email, name: String(roster[r][EMP.NAME] || '').trim() };
      nameByEmail[email.toLowerCase()] = String(roster[r][EMP.NAME] || '').trim();
    }
    let sent = 0, skipped = 0;
    Object.keys(buckets).forEach(function (empId) {
      const who = byId[empId];
      if (!who || !who.email) { skipped++; return; }
      const list = buckets[empId].slice().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
      const rowsHtml = list.map(function (c) {
        return [COACH_SEV_LABELS[c.severity] || c.severity,
          String(c.createdAt || '').substring(0, 10) + ' · by ' + (nameByEmail[c.createdBy] || c.createdBy) +
          (c.severity === 'praise' ? '' : (c.status === 'acknowledged' ? ' · acknowledged' : ' · not yet acknowledged')) +
          (c.followUpAt ? ' · revisit ' + c.followUpAt : '')];
      });
      const html = '<p style="margin:0 0 6px;">Hi ' + esc_(who.name || 'there') + ', here is the coaching logged for you in the last ' + windowDays + ' days. Open the app to read each item' +
        (list.some(function (c) { return c.severity !== 'praise' && c.status !== 'acknowledged'; }) ? ' and acknowledge the ones still waiting on you' : '') + '.</p>' +
        brandedKvRows_(rowsHtml);
      const text = 'Coaching logged for you in the last ' + windowDays + ' days:\n' +
        rowsHtml.map(function (r) { return '  ' + r[0] + ' — ' + r[1]; }).join('\n') +
        '\n\nOpen Team Tools → Training & Employee Docs → Coaching to read them.';
      try {
        coachSendMail_({ to: who.email, subject: 'Your weekly coaching recap', body: text,
          htmlBody: buildBrandedEmailHtml_('Your weekly coaching recap', html,
            { tone: 'info', subLabel: 'Training · Coaching', statusLabel: 'Weekly recap', ctaUrl: safeWebAppUrl_('coaching'), ctaLabel: 'Open Coaching' }) });
        sent++;
      } catch (e) { console.warn('coaching recap to ' + who.email + ' failed: ' + e.message); }
    });
    stampDigestLastRun_('coachingRecap');
    Logger.log('sendCoachingRecapDigest: agents=' + Object.keys(buckets).length + ' sent=' + sent + ' noEmail=' + skipped);
  } catch (err) {
    Logger.log('sendCoachingRecapDigest failed: ' + err.message);
  }
}

// ── T2 extension: import a quiz from a Google Forms quiz ──────────────────
// Operator feedback (2026-06-15): managers have existing quizzes in Google
// Forms. READ-ONLY, review-before-save (the kbConvertDriveDoc pattern): this
// returns a quiz def for the editor; the manager reviews and the normal
// saveQuiz persists it. FormApp is the project's first Forms call — the
// deploy adds the Forms OAuth scope (one-time re-auth, like the Docs scope).
