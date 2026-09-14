// ════════════════════════════════════════════════════════════════════════════
//  UMS TEAM TOOLS — 50_deptrequests.js
//  Department requests: the auto-logged tracker and its SLA reminders.
//
//  ONE Apps Script project, ONE global scope: these files are the SERVER, in
//  the load order `web-app/.clasp.json` filePushOrder declares. Batch F2 split
//  them out of Code.js as a MOVE — every declaration below is byte-identical to
//  the one it replaced, and the SPLIT-MANIFEST pin proves it.
// ════════════════════════════════════════════════════════════════════════════

/**
 * THE one reader of the DeptRequests Status cell — trimmed + lowercased, with
 * the same 'open' default `getDeptRequests` already applied (a legacy row with
 * a blank Status is an OPEN request, not an unknown one).
 *
 * WHY A PREDICATE (cycle-18 F5 — the INV-183 shape, on a fifth column): four
 * readers each decided the comparison for themselves and did not agree. ONE
 * normalized (the cycle-16 F8 fix) while THREE compared the RAW cell against a
 * bare literal:
 *   • drFindOpenRequest_        — the re-send dedupe misses, so re-sending a
 *     note to the same dept opens a DUPLICATE request (INV-131 silently void)
 *   • markDeptRequestResolved_  — the already-resolved idempotence check
 *     misses, so a second click OVERWRITES ResolvedAt / ResolvedBy and re-audits
 *   • deptRequestsOverdueOpen_  — a resolved request nags in the daily SLA
 *     digest forever
 * A padded or mixed-case cell therefore made the four DISAGREE — the identical
 * shape column L had before `cnEnrolledSheetId_` (INV-167) and column A before
 * `empRosterEmail_` (INV-183), now on a fifth column. Only a hand edit produces
 * one (every writer stores a canonical literal), which is why this is a
 * correctness fix and not an incident.
 */
function drStatus_(row) {
  return String(row[DR.STATUS] || 'open').trim().toLowerCase();
}
// ── Inter-department request tracking (Part B) ──────────────────────────────
function getDeptRequestsSS_() {
  try {
    const id = PropertiesService.getScriptProperties().getProperty('DEPT_REQUESTS_SS_ID');
    if (id && id.trim()) return SpreadsheetApp.openById(id.trim());
  } catch (e) {}
  return getAdpSS_();   // back-compat: PHI-free, so co-locating on the ADP sheet is fine
}
function getOrCreateDeptRequestsSheet_() {
  const ss = getDeptRequestsSS_();
  let sh = ss.getSheetByName('DeptRequests');
  if (!sh) { sh = ss.insertSheet('DeptRequests'); sh.appendRow(DR_HEADERS); }
  else if (sh.getLastColumn() < DR_HEADERS.length) {
    // The trailing ResolvedVia + PatientTrx columns (operator 2026-09-10) —
    // self-heal the header once (the INV-126/135 pattern); legacy rows read
    // the cells blank.
    sh.getRange(1, 1, 1, DR_HEADERS.length).setValues([DR_HEADERS]);
  }
  return sh;
}
/** THE one reader of the DeptRequests ResolvedVia cell (the drStatus_
 *  discipline — INV-183): trimmed + lowercased, and ONLY a known value comes
 *  back. A blank or unknown cell reads '' = "source not recorded". */
function drResolvedVia_(row) {
  const v = String(row[DR.RESOLVED_VIA] == null ? '' : row[DR.RESOLVED_VIA]).trim().toLowerCase();
  return DR_RESOLVED_VIA_VALUES.indexOf(v) >= 0 ? v : '';
}
function drNowTs_() { return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss"); }
/** Pure (Node-pinned) — parse a roster Departments cell (col N) into canonical
 *  dept names. Splits on `;`/`,`, matches each token case-insensitively against
 *  the known department keys (`validKeys`) and returns the CANONICAL key casing,
 *  deduped; UNKNOWN names are dropped (a typo can't route an inbox to nowhere).
 *  DeptRequests v2 membership (INV-138). */
function drParseDepartments_(raw, validKeys) {
  const lc = {};
  (validKeys || []).forEach(function (k) { lc[String(k).toLowerCase().trim()] = k; });
  const out = [], seen = {};
  String(raw || '').split(/[;,]/).forEach(function (tok) {
    const t = String(tok).toLowerCase().trim();
    if (!t || !lc[t] || seen[lc[t]]) return;
    seen[lc[t]] = true; out.push(lc[t]);
  });
  return out;
}
/** Pure (Node-pinned) — SLA status from elapsed minutes vs an SLA in hours
 *  (wall-clock): `ontime` / `atrisk` (≥75% of SLA) / `overdue` (≥100%). A null
 *  age or non-positive SLA → null (no badge). DeptRequests v2 (INV-138). */
function drSlaStatus_(ageMin, slaHours) {
  if (ageMin == null || !(slaHours > 0)) return null;
  const frac = ageMin / (slaHours * 60);
  if (frac >= 1) return 'overdue';
  if (frac >= 0.75) return 'atrisk';
  return 'ontime';
}
/** Per-department SLA target map ({dept: hours}) from Script Property
 *  DR_SLA_TARGETS, sanitized on read (bad blob → {}). */
function getDeptRequestSlaConfig_() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('DR_SLA_TARGETS');
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
  } catch (_) { return {}; }
}
/** SLA (hours) for a department — per-dept override (case-insensitive) from the
 *  config map, else CONFIG.CALL_NOTES.DR_SLA_DEFAULT_HOURS. Pass an already-read
 *  `map` to avoid a Script-Property read per row in a loop. */
function getDeptRequestSla_(dept, map) {
  const def = CONFIG.CALL_NOTES.DR_SLA_DEFAULT_HOURS || 48;
  const cfg = map || getDeptRequestSlaConfig_();
  const want = String(dept || '').toLowerCase().trim();
  for (const k in cfg) {
    if (String(k).toLowerCase().trim() === want) { const h = parseInt(cfg[k], 10); return (h > 0) ? h : def; }
  }
  return def;
}
/** F(cycle-8 M-5): a multi-department send stores the JOINED label
 *  ("Billing, Shipping" — emailFromCallNote's drDeptKey) in ToDept. Every
 *  per-dept consumer did an exact whole-string match, so such a request
 *  appeared in NO department's Incoming inbox, a receiving-dept member could
 *  not resolve it in-app, and the SLA lookup fell through to the default.
 *  Split the stored value into its component department names ('Other' is
 *  dropped — the untracked free-text pseudo-department); callers fall back to
 *  the raw string when nothing remains (legacy 'Other'-only rows). Pure —
 *  Node-pinned in test/client/run.js. */
function drSplitDepts_(toDept) {
  return String(toDept || '').split(',')
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s && s.toLowerCase() !== 'other'; });
}
/** Strictest (minimum-hours) SLA across a request's component departments —
 *  every listed department is expected to respond, so the tightest target
 *  governs a multi-dept request. Single-dept values behave exactly as before
 *  (the split is the identity); empty splits fall back to the raw lookup. */
function drSlaForToDept_(toDept, map) {
  const parts = drSplitDepts_(toDept);
  if (!parts.length) return getDeptRequestSla_(toDept, map);
  let min = null;
  parts.forEach(function (d) {
    const h = getDeptRequestSla_(d, map);
    if (min === null || h < min) min = h;
  });
  return min;
}
/** Minimize a recipient list to its unique domain(s) for the PHI-free
 *  DeptRequests ToEmail column. The "Other" department lets a rep enter a
 *  free-text (possibly external/customer) address, and the store can fall back
 *  to the ADP/payroll sheet, so we persist only the domain(s) — the same PII
 *  minimization as the ExternalEmailSent audit row. The column is write-only
 *  (never read back by any endpoint), so domain-only loses no functionality. */
function drRecipientDomains_(toList) {
  const seen = {}, out = [];
  String(toList || '').split(',').forEach(function (a) {
    const dom = intakeEmailDomain_(a.trim());
    if (dom && dom !== '(none)' && !seen[dom]) { seen[dom] = 1; out.push(dom); }
  });
  return out.join(', ') || '(none)';
}
/** Dedup lookup (A5): the ReqId of an existing OPEN DeptRequests row for this
 *  (noteId, deptLabel), else null — so a note re-send to the same dept REUSES
 *  the prior token instead of opening a second request. Bounded tail (the
 *  DR_MAX_SCAN philosophy): a request older than the window is treated as absent
 *  and a re-send legitimately reopens it. Newest-first so the most recent open
 *  row wins. Legacy rows (no NoteId) never match. Best-effort — the caller falls
 *  back to a fresh token on any throw. */
function drFindOpenRequest_(noteId, deptLabel) {
  if (!noteId) return null;
  const sh = getOrCreateDeptRequestsSheet_();
  const lastRow = sh.getLastRow();
  const firstData = Math.max(2, lastRow - DR_MAX_SCAN + 1);
  const numRows = lastRow - firstData + 1;
  if (numRows <= 0) return null;
  const rows = sh.getRange(firstData, 1, numRows, DR_HEADERS.length).getValues();
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (drStatus_(r) === 'open' &&
        String(r[DR.NOTE_ID] || '') === String(noteId) &&
        String(r[DR.TO_DEPT] || '') === String(deptLabel)) {
      return String(r[DR.REQ_ID]);
    }
  }
  return null;
}
/** "Mark resolved" CTA appended to a tracked department email's SENT body
 *  (added AFTER the INV-41 hash check so the preview/hash contract is unchanged).
 *  esc_'s the URL — same email-escape discipline as the call-note builder. */
function drResolveCtaHtml_(resolveUrl) {
  const P = CN_EMAIL_PALETTE;
  return '<div style="margin:18px 0 4px;text-align:center;">' +
      '<a href="' + esc_(resolveUrl) + '" style="display:inline-block;background:' + P.accent + ';color:#ffffff;' +
      'text-decoration:none;font-weight:600;padding:10px 20px;border-radius:8px;font-size:13px;">&#10003; Mark this request resolved</a>' +
    '</div>' +
    '<p style="margin:6px 0 0;font-size:11px;color:' + P.muted + ';text-align:center;">Click once you’ve actioned this request (or reply to let the sender know).</p>';
}

// sendDeptRequest (the legacy standalone dept-request composer endpoint) was
// retired (audit A6/F6): it had no caller anywhere — inter-department request
// tracking is now AUTOMATIC via emailFromCallNote (auto-logs the DeptRequests
// row + appends the resolve CTA). drResolveCtaHtml_ above is still used by that
// auto-log path.
/** Mark a request resolved (the receiver clicked the email link). Idempotent. */
function markDeptRequestResolved_(token, byEmail, via) {
  // `via` (operator 2026-09-10): 'email' from the department email's resolve
  // link, 'app' from the tracker's Mark-resolved button. The two paths share
  // this writer, and until the column existed the store could not tell them
  // apart — so every manual clear counted as a response time.
  const viaClean = DR_RESOLVED_VIA_VALUES.indexOf(String(via || '').trim().toLowerCase()) >= 0
    ? String(via).trim().toLowerCase() : '';
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = getOrCreateDeptRequestsSheet_();
    // Q5 (Batch Q, 2026-09-11) — the bounded RequestId-column lookup the
    // detail read already used; this path read the WHOLE tab (every
    // PatientTrx cell included) on every resolve click and every email link.
    const hit = drFindRowByReqId_(sh, token);
    if (!hit) return { found: false };
    const row = hit.row, rowIndex = hit.rowIndex;
    if (drStatus_(row) === 'resolved') {
      return { found: true, already: true, dept: row[DR.TO_DEPT],
               resolvedAt: formTokenIsoString_(row[DR.RESOLVED_AT]),   // L-5 — coercion-safe for the resolve page
               resolvedBy: String(row[DR.RESOLVED_BY] || '') };
    }
    sh.getRange(rowIndex, DR.STATUS + 1).setValue('resolved');
    sh.getRange(rowIndex, DR.RESOLVED_AT + 1).setValue(drNowTs_());
    sh.getRange(rowIndex, DR.RESOLVED_BY + 1).setValue(byEmail || 'unknown');
    sh.getRange(rowIndex, DR.RESOLVED_VIA + 1).setValue(viaClean);
    drBumpCacheGen_();   // both resolve paths route here — the cached lists must not show it open
    pendingTasksBust_(row[DR.BY_ID]);   // F4 — and neither must the SENDER's Needs-you list
    try { writeAuditLog_({ id: row[DR.BY_ID], name: row[DR.BY_NAME] }, 'DeptRequestResolved',
      '', '', false, 0, 'reqId=' + token + '; by=' + (byEmail || 'unknown') + (viaClean ? '; via=' + viaClean : ''), byEmail || ''); } catch (e) {}
    return { found: true, already: false, dept: row[DR.TO_DEPT] };
  } finally { lock.releaseLock(); }
}
/** In-app resolve (the manual path that complements the email link): the
 *  request's CREATOR or any manager can mark it resolved from the Metrics tab —
 *  e.g. when the recipient replied "done" without clicking the email link.
 *  Rep-callable; ownership/manager-checked before the resolve. */
/** THE one ownership rule for a DeptRequests row (operator testing note 6,
 *  2026-09-10 — extracted from resolveDeptRequest so the scoped detail read
 *  and the resolve write cannot disagree about who may act): the SENDER, any
 *  MANAGER, or a member of the RECEIVING department. F(cycle-8 M-5): a
 *  multi-dept send ("Billing, Shipping") matches on EACH component department,
 *  not just the whole stored string. */
function drCanAct_(emp, row) {
  if (!emp || !row) return false;
  if (emp.isManager) return true;
  if (String(row[DR.BY_ID]).trim() === emp.id) return true;
  const toDept = String(row[DR.TO_DEPT] || '').toLowerCase().trim();
  const partsLc = {};
  drSplitDepts_(toDept).forEach(function (d) { partsLc[d.toLowerCase()] = true; });
  return empDepartments_(emp).some(function (d) {
    const k = String(d).toLowerCase();
    return k === toDept || partsLc[k];
  });
}
/** Bounded single-request lookup (cycle-19 follow-on — the findFormTokenRow_ /
 *  findCallNoteRow_ shape): scan ONLY the RequestId column to locate the row,
 *  then fetch that ONE row at DR_HEADERS width (the header self-heals to it,
 *  so a legacy narrow row reads its trailing cells as ''). RequestIds are
 *  UUIDs, so the first match is the row. Returns { rowIndex, row } or null;
 *  a blank id costs no read at all. */
function drFindRowByReqId_(sheet, reqId) {
  const id = String(reqId || '').trim();
  if (!id) return null;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const ids = sheet.getRange(2, DR.REQ_ID + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === id) {
      const rowIndex = i + 2;
      return { rowIndex: rowIndex, row: sheet.getRange(rowIndex, 1, 1, DR_HEADERS.length).getValues()[0] };
    }
  }
  return null;
}
/** The tracker card's EXPAND — the source note's fields for a request the
 *  caller may act on (drCanAct_: sender / manager / receiving-dept member —
 *  the SAME rule as resolveDeptRequest, so anyone who may close a request may
 *  read what it was about). Read-only; no lock; no audit row (a read of the
 *  caller's own work item). PHI posture: the note fields are PHI and are
 *  returned ONLY to that scoped set, and a scope refusal reads as the SAME
 *  'Request not found.' a bad id does, so existence never leaks (INV-24's
 *  spirit). The note is fetched from the SENDER's own Sheet
 *  (lookupEmployeeById_ → getCallNotesSheet_ → findCallNoteRow_), whitelist-
 *  built — never the raw row. `note: null` + a named `reason` when the row
 *  predates NoteId tracking, the sender is no longer enrolled, or the note
 *  was deleted (INV-187 — "nothing to show" is stated, never rendered as
 *  an empty note). Bare `{error}` read shape (the GATE-SHAPE rule). */
function getDeptRequestDetail(requestId) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const reqId = String(requestId || '').trim();
    if (!reqId) return { error: 'Request not found.' };
    // Bounded (cycle-19 follow-on): the RequestId column, then ONE row — this
    // fires per Expand click on a rep-facing list and used to read the whole
    // tab, every request's PatientTrx cell included, to find one row.
    const hit = drFindRowByReqId_(getOrCreateDeptRequestsSheet_(), reqId);
    const row = hit ? hit.row : null;
    if (!row || !drCanAct_(emp, row)) return { error: 'Request not found.' };
    const base = {
      requestId: reqId,
      label: String(row[DR.LABEL] || ''),
      patientTrx: String(row[DR.PATIENT_TRX] || '').slice(0, DR_PATIENT_TRX_MAX),
      byName: String(row[DR.BY_NAME] || ''),
      toDept: String(row[DR.TO_DEPT] || ''),
      note: null,
      reason: '',
    };
    const noteId = String(row[DR.NOTE_ID] || '').trim();
    if (!noteId) { base.reason = 'This request predates note linking — open the sender\'s notes for the date instead.'; return base; }
    const sender = lookupEmployeeById_(String(row[DR.BY_ID] || '').trim());
    if (!sender || !sender.callNotesSheetId) { base.reason = 'The sender\'s Call Notes Sheet is not available.'; return base; }
    let located = null;
    try { located = findCallNoteRow_(getCallNotesSheet_(sender), noteId); }
    catch (e) { base.reason = 'The sender\'s Call Notes Sheet could not be read.'; return base; }
    if (!located) { base.reason = 'The linked note is no longer in the sender\'s Sheet (deleted or archived).'; return base; }
    const n = callNoteRowToObject_(located);
    base.note = {
      callback: n.callback, caller: n.caller, relationship: n.relationship,
      patientAndTrx: n.patientAndTrx, issue: n.issue, transferredTo: n.transferredTo,
      resolution: n.resolution, dateLocal: n.dateLocal,
    };
    return base;
  } catch (err) { return { error: err.message }; }
}
function resolveDeptRequest(requestId) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Your account is not registered.' };
    // Q5 — bounded lookup (the detail read's shape), not a whole-tab read.
    const hit = drFindRowByReqId_(getOrCreateDeptRequestsSheet_(), requestId);
    const row = hit ? hit.row : null;
    if (!row) return { success: false, error: 'Request not found.' };
    // v2: a member of the RECEIVING department can also resolve in-app (the
    // "receiving agent marks resolved" path), alongside the sender + any
    // manager — the ONE rule in drCanAct_, shared with getDeptRequestDetail.
    if (!drCanAct_(emp, row))
      return { success: false, error: 'Only the sender, a member of the receiving department, or a manager can resolve this request.' };
    const res = markDeptRequestResolved_(requestId, emp.email || getActiveUserEmail_() || '', 'app');
    if (!res.found) return { success: false, error: 'Request not found.' };
    // F4 — the writer already cleared the SENDER's cached list; a dept member
    // resolving someone else's request is the one case where the acting rep is
    // not the owner, so clear theirs too (a no-op when they are the same rep).
    // Residual, deliberately: another member of the same desk keeps the
    // incoming row for up to PENDING_TASKS_CACHE_TTL. A generation salt would
    // close that by evicting EVERY rep's entry on every resolve — too blunt a
    // trade for a 2-minute cache on the app's busiest surface, and the stale
    // window here is bounded rather than permanent.
    pendingTasksBust_(emp.id);
    return { success: true, already: !!res.already };
  } catch (err) { return { success: false, error: err.message }; }
}
function drCacheGen_() {
  try { return CacheService.getScriptCache().get('dr_gen_v1') || '0'; } catch (_) { return '0'; }
}
function drBumpCacheGen_() {
  try { CacheService.getScriptCache().put('dr_gen_v1', String(Date.now()), 21600); } catch (_) {}
}
/** PURE (Node-pinned) — the per-department aggregate over the request items
 *  `getDeptRequests` built. Counts a multi-dept request under EACH component
 *  department (F cycle-8 M-5). Response-time figures (avg / median) come ONLY
 *  from rows resolved through the department email's link (`resolvedVia ===
 *  'email'`): a tracker "Mark resolved" is a manual clear (`manualResolved`),
 *  and a row resolved before the source was recorded (`untrackedResolved`) is
 *  excluded by operator decision (2026-09-10) — both are REPORTED as counts,
 *  never silently dropped (INV-187). `timed` is the sample size behind the
 *  two figures, so a department whose every resolve was manual reads "—" with
 *  the reason beside it. Open rows: `open` + `overdueOpen` (slaStatus). */
function drDeptStats_(items, slaCfg) {
  const byDept = {};
  (items || []).forEach(function (it) {
    const parts = drSplitDepts_(it.toDept);
    (parts.length ? parts : [it.toDept || '—']).forEach(function (k) {
      if (!byDept[k]) byDept[k] = { dept: k, open: 0, resolved: 0, overdueOpen: 0, manualResolved: 0, untrackedResolved: 0, durations: [] };
      const b = byDept[k];
      if (it.status === 'resolved') {
        b.resolved++;
        if (it.resolvedVia === 'app') b.manualResolved++;
        else if (it.resolvedVia !== 'email') b.untrackedResolved++;
        else if (it.elapsedMin != null) b.durations.push(it.elapsedMin);
      } else { b.open++; if (it.slaStatus === 'overdue') b.overdueOpen++; }
    });
  });
  return Object.keys(byDept).map(function (k) {
    const b = byDept[k];
    b.durations.sort(function (x, y) { return x - y; });
    const avg = b.durations.length ? Math.round(b.durations.reduce(function (s, x) { return s + x; }, 0) / b.durations.length) : null;
    const med = b.durations.length ? b.durations[Math.floor(b.durations.length / 2)] : null;
    return { dept: b.dept, open: b.open, resolved: b.resolved, overdueOpen: b.overdueOpen,
             manualResolved: b.manualResolved, untrackedResolved: b.untrackedResolved, timed: b.durations.length,
             slaHours: getDeptRequestSla_(b.dept, slaCfg), avgMinutes: avg, medianMinutes: med };
  }).sort(function (a, b) { return b.open - a.open; });
}
function getDeptRequests() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Your account is not registered.' };
    const drCache = CacheService.getScriptCache();
    const drCacheKey = 'dept_req_v1:' + emp.id + ':' + drCacheGen_();
    try { const hit = drCache.get(drCacheKey); if (hit) return JSON.parse(hit); } catch (_) {}
    // Bounded tail read — never the whole sheet. Rows append chronologically, so
    // the most-recent DR_MAX_SCAN rows are the relevant ones for the list/aggregate.
    // (resolveDeptRequest / markDeptRequestResolved_ keep their FULL scans so an
    // old token still resolves — only this LIST read is bounded; F1/A4.)
    const sh = getOrCreateDeptRequestsSheet_();
    const lastRow = sh.getLastRow();
    const firstData = Math.max(2, lastRow - DR_MAX_SCAN + 1);
    const numRows = lastRow - firstData + 1;
    const rows = numRows > 0 ? sh.getRange(firstData, 1, numRows, DR_HEADERS.length).getValues() : [];
    const truncated = (lastRow - 1) > DR_MAX_SCAN;   // data rows exceed the cap
    const mine = [], all = [];
    // CreatedAt/ResolvedAt are written in the ISO 'T' form (drNowTs_) so Sheets
    // keeps them as strings — but tolerate a legacy space-form row that Sheets
    // coerced to a Date (the AuditLog/TO.SUBMITTED_AT coercion gotcha).
    const parseMs = function (v) {
      if (v instanceof Date) return v.getTime();
      const ms = parseTimestampMs_(String(v || ''), CONFIG.TIMEZONE);
      return ms || null;
    };
    const fmtTs = function (ms) {
      return ms ? Utilities.formatDate(new Date(ms), CONFIG.TIMEZONE, 'MMM d, yyyy h:mm a') : '';
    };
    // SLA config read ONCE (not per row); each item carries slaHours + slaStatus
    // (ontime/atrisk/overdue) — for open rows it's current age, for resolved rows
    // whether resolution beat the SLA (v2 phase 3).
    const slaCfg = getDeptRequestSlaConfig_();
    for (let i = 0; i < rows.length; i++) {   // i=0: tail slice has no header row
      const r = rows[i];
      if (!r[DR.REQ_ID]) continue;
      const createdMs = parseMs(r[DR.CREATED_AT]);
      // F8 (cycle 16): NORMALIZE the status once. This line used to compare the
      // RAW cell (`r[DR.STATUS] === 'resolved'`) while every other line in this
      // function went through `String(r[DR.STATUS] || 'open')`, so a
      // whitespace-padded cell made the two disagree: the item's `status` read
      // 'resolved ' (so it was excluded from `incoming` and from `allOpen`) but
      // this test was false, so `deptStats` counted it as OPEN. The INV-167 /
      // INV-183 whitespace class on a third column.
      const status = drStatus_(r);
      const isResolved = (status === 'resolved');
      const resolvedMs = isResolved ? parseMs(r[DR.RESOLVED_AT]) : null;
      // F8: a row marked resolved whose ResolvedAt is blank or unparseable has
      // an UNKNOWN resolution time, not "however long it has been since it was
      // created". The old fallthrough pushed that ever-growing age into
      // deptStats.durations, so one such row inflated a department's average
      // and median resolution time a little more every day. Reachable if a
      // write fails between markDeptRequestResolved_'s two setValue calls, or
      // via a manual sheet edit.
      const elapsedMin =
        isResolved
          ? ((resolvedMs && createdMs) ? Math.round((resolvedMs - createdMs) / 60000) : null)
          : (createdMs ? Math.round((Date.now() - createdMs) / 60000) : null);
      // Operator 2026-08-31 — BUSINESS elapsed (weekends + US holidays and
      // out-of-hours excluded) is what the SLA now bands on. The wall-clock
      // figure rides along as `elapsedWallMin` so nothing that used to be
      // readable disappears, but a request that sat over a weekend must not
      // read as breached when nobody was on shift to answer it. Null (a corrupt
      // stamp pair, or a resolved row with no ResolvedAt — the F8 case) stays
      // null: drSlaStatus_ already renders an unknown elapsed as no verdict.
      const elapsedBizMin = isResolved
        ? ((resolvedMs && createdMs) ? businessMinutesBetween_(createdMs, resolvedMs) : null)
        : (createdMs ? businessMinutesBetween_(createdMs, Date.now()) : null);
      const slaHours = drSlaForToDept_(String(r[DR.TO_DEPT] || ''), slaCfg);   // F(cycle-8 M-5): strictest across a multi-dept send
      // Operator 2026-09-10: only an EMAIL-link resolution is a RESPONSE time.
      // A tracker "Mark resolved" ('app') is a manual clear, and a row resolved
      // before the source was recorded ('') cannot be told apart from one —
      // both read as UNTIMED (null, INV-187), so every consumer (the per-dept
      // fold, the client median, the card) excludes them by the same null
      // guard. `resolvedVia` rides beside it so the exclusion is visible.
      const resolvedVia = isResolved ? drResolvedVia_(r) : '';
      const timed = !isResolved || resolvedVia === 'email';
      const item = {
        requestId: String(r[DR.REQ_ID]), byName: String(r[DR.BY_NAME] || ''),
        toDept: String(r[DR.TO_DEPT] || ''), createdAt: fmtTs(createdMs),
        // F8: the NORMALIZED status, so every downstream consumer (the
        // `incoming` filter, `deptStats`, `allOpen`, the client's chips) reads
        // the same value a padded/mixed-case cell would otherwise split.
        status: status, resolvedAt: fmtTs(resolvedMs),
        resolvedBy: String(r[DR.RESOLVED_BY] || ''), label: String(r[DR.LABEL] || ''),
        // Operator testing note 6: the collapsed card's subject is
        // "<label> · <patient & trx>" — a legacy row reads '' and renders
        // the label alone (the client guards on it).
        patientTrx: String(r[DR.PATIENT_TRX] || '').slice(0, DR_PATIENT_TRX_MAX),
        // `elapsedMin` is the BUSINESS figure (what the tracker and the SLA
        // read); the raw wall-clock span is kept beside it, both for the
        // "N wall-clock" secondary line and so the change is auditable.
        resolvedVia: resolvedVia,
        elapsedMin: (timed && elapsedBizMin != null) ? elapsedBizMin : null,
        elapsedWallMin: timed ? elapsedMin : null,
        slaHours: slaHours, slaStatus: drSlaStatus_(elapsedBizMin, slaHours),
        slaBusiness: true,
      };
      all.push(item);
      if (String(r[DR.BY_ID]).trim() === emp.id) mine.push(item);
    }
    mine.sort(function (a, b) { return (a.status === b.status) ? 0 : (a.status === 'open' ? -1 : 1); });
    // Departments the composer can target — only those with a resolvable email.
    const deptMap = getDepartmentEmails_() || {};
    const departments = Object.keys(deptMap).filter(function (d) { return !!deptMap[d]; });
    // DeptRequests v2 — the "Incoming" inbox: OPEN requests addressed to a
    // department the caller staffs (roster column N). PHI-free (requester name +
    // label + age). A rep on no dept desk gets []. Managers also get allOpen below.
    const myDepts = empDepartments_(emp);
    const myDeptsLc = {};
    myDepts.forEach(function (d) { myDeptsLc[String(d).toLowerCase()] = true; });
    // F(cycle-8 M-5): a multi-dept send matches the inbox of EACH component
    // department (whole-string kept for back-compat with single-dept rows).
    const incoming = myDepts.length
      ? all.filter(function (it) {
              if (it.status !== 'open') return false;
              if (myDeptsLc[String(it.toDept).toLowerCase().trim()]) return true;
              return drSplitDepts_(it.toDept).some(function (d) { return myDeptsLc[d.toLowerCase()]; });
            })
            .sort(function (a, b) { return (b.elapsedMin || 0) - (a.elapsedMin || 0); })
      : [];
    // F18 (cycle 12): the three lists were silently `.slice(0, 100)`'d with no
    // signal, so a 240-request backlog rendered as exactly 100 and read as the
    // complete picture — the F2 class (a bounded reader must say it is bounded).
    // `truncated` above covers the SCAN cap; these cover the LIST caps.
    const result = { mine: mine.slice(0, DR_LIST_CAP), isManager: !!emp.isManager,
                     departments: departments, myDepts: myDepts,
                     incoming: incoming.slice(0, DR_LIST_CAP), truncated: truncated,
                     listCap: DR_LIST_CAP, mineTotal: mine.length,
                     incomingTotal: incoming.length };
    if (emp.isManager) {
      result.deptStats = drDeptStats_(all, slaCfg);
      const allOpenSorted = all.filter(function (it) { return it.status === 'open'; })
        .sort(function (a, b) { return (b.elapsedMin || 0) - (a.elapsedMin || 0); });
      result.allOpen = allOpenSorted.slice(0, DR_LIST_CAP);
      result.allOpenTotal = allOpenSorted.length;
    }
    try {
      const payload = JSON.stringify(result);
      if (payload.length <= 90000) drCache.put(drCacheKey, payload, DR_RESULT_CACHE_TTL);
    } catch (_) {}
    return result;
  } catch (err) { return { error: err.message }; }
}
/** Admin-gated (INV-136): read the DeptRequests SLA config for the editor —
 *  the per-dept overrides + the default + the known departments. */
// Uncalled by the current Admin UI (reads via getAdminConfig().deptSla) —
// kept by decision as the symmetric read API; see the getFeatureFlags note.
function getDeptRequestSla() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { error: 'Admin access required.' };
    return {
      defaultHours: CONFIG.CALL_NOTES.DR_SLA_DEFAULT_HOURS || 48,
      targets: getDeptRequestSlaConfig_(),
      departments: Object.keys(getDepartmentEmails_() || {}),
    };
  } catch (err) { return { error: err.message }; }
}
/** Admin-gated (INV-136 / INV-57 family): persist the per-dept SLA target map to
 *  Script Property DR_SLA_TARGETS. Each value is whole hours 1–720; unknown depts
 *  and entries equal to the default are dropped (keeps the map lean). Writes an
 *  AdminConfigChange audit row. */
function saveDeptRequestSla(map) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { success: false, error: 'Admin access required.' };
    if (map == null || typeof map !== 'object' || Array.isArray(map)) return { success: false, error: 'Invalid SLA map.' };
    const validDepts = {};
    Object.keys(getDepartmentEmails_() || {}).forEach(function (d) { validDepts[String(d).toLowerCase().trim()] = d; });
    const def = CONFIG.CALL_NOTES.DR_SLA_DEFAULT_HOURS || 48;
    const clean = {};
    for (const k in map) {
      const canon = validDepts[String(k).toLowerCase().trim()];
      if (!canon) continue;                          // drop unknown departments
      const h = parseInt(map[k], 10);
      if (!(h > 0)) continue;                         // blank/0 → fall back to default (omit)
      if (h > 720) return { success: false, error: 'SLA for "' + canon + '" must be 1–720 hours.' };
      if (h === def) continue;                        // equals default → omit (lean map)
      clean[canon] = h;
    }
    propSetBounded_('DR_SLA_TARGETS', JSON.stringify(clean), { hint: 'remove an override' });
    writeAuditLog_(emp, 'AdminConfigChange', '', '', false, 0,
      'Updated Dept-Request SLA targets (' + Object.keys(clean).length + ' override(s))', emp.email);
    return { success: true, targets: clean };
  } catch (err) { return { success: false, error: err.message }; }
}
/** Daily manager-tz reminder of OPEN department requests past their SLA — a
 *  PHI-free summary push to MANAGER_EMAILS (the operator chose a manager summary
 *  over per-dept member nudges). Silent when nothing is overdue (the urgent-digest
 *  posture). Top-level trigger handler (assertManagerCaller_ INV-44, best-effort
 *  INV-14, never throws past the catch). Heartbeat-stamped. DeptRequests v2 phase 4. */
/** OPEN dept requests past their resolution SLA (bounded DR tail scan),
 *  factored from sendDeptRequestReminderDigest so the consolidated daily brief
 *  (#2, INV-151) shares ONE computation. Read-only.
 *  Returns [{ dept, byName, label, ageHours }]. */
function deptRequestsOverdueOpen_() {
  const sh = getOrCreateDeptRequestsSheet_();
  const lastRow = sh.getLastRow();
  const firstData = Math.max(2, lastRow - DR_MAX_SCAN + 1);
  const numRows = lastRow - firstData + 1;
  const rows = numRows > 0 ? sh.getRange(firstData, 1, numRows, DR_HEADERS.length).getValues() : [];
  const slaCfg = getDeptRequestSlaConfig_();
  const overdue = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r[DR.REQ_ID] || drStatus_(r) === 'resolved') continue;
    const cv = r[DR.CREATED_AT];
    const createdMs = (cv instanceof Date) ? cv.getTime() : parseTimestampMs_(String(cv || ''), CONFIG.TIMEZONE);
    if (!createdMs) continue;
    // Operator 2026-08-31 — band on BUSINESS minutes, the same figure the
    // tracker shows. Computing wall-clock here while getDeptRequests computed
    // business elapsed would make the daily digest and the on-screen card
    // disagree about which requests are overdue — the parallel-source class.
    // A null (unusable stamp) is NOT overdue: drSlaStatus_ gives no verdict on
    // an unknown elapsed, and the digest must not invent one.
    const ageMin = businessMinutesBetween_(createdMs, Date.now());
    if (ageMin == null) continue;
    const dept = String(r[DR.TO_DEPT] || '');
    if (drSlaStatus_(ageMin, drSlaForToDept_(dept, slaCfg)) !== 'overdue') continue;   // F(cycle-8 M-5)
    overdue.push({ dept: dept || '—', byName: String(r[DR.BY_NAME] || ''),
                   label: String(r[DR.LABEL] || ''), ageHours: Math.round(ageMin / 60) });
  }
  return overdue;
}
function sendDeptRequestReminderDigest() {
  assertManagerCaller_('sendDeptRequestReminderDigest');
  try {
    // #2 (INV-151): while the consolidated daily brief is on, the SLA overdue
    // list rides the 8am brief instead. Stamp the heartbeat first — the
    // trigger ran; a dead trigger stays detectable.
    // F(cycle-8 M-11): suppression requires a LIVE brief heartbeat, not just the flag.
    if (managerBriefSuppressionActive_({ checkTrigger: true })) {
      stampDigestLastRun_('deptReqReminder');
      Logger.log('Dept-request reminder: consolidated into the daily brief.');
      return;
    }
    const mgrEmails = getManagerEmails_();
    if (!mgrEmails.length) { Logger.log('No manager emails — skipping dept-request reminder.'); return; }
    const overdue = deptRequestsOverdueOpen_();
    stampDigestLastRun_('deptReqReminder');
    if (!overdue.length) { Logger.log('dept-request reminder: nothing overdue.'); return; }

    const byDept = {};
    overdue.forEach(function (o) { (byDept[o.dept] = byDept[o.dept] || []).push(o); });
    const depts = Object.keys(byDept).sort();
    let bodyHtml = '<p style="margin:0 0 10px;">' + overdue.length +
      ' open department request(s) are past their resolution SLA. Open Metrics → Dept Requests for the full list + to mark them resolved.</p>';
    depts.forEach(function (dept) {
      bodyHtml += '<div style="margin:10px 0 4px;font-weight:700;">' + esc_(dept) + ' (' + byDept[dept].length + ')</div><ul style="margin:0;padding-left:18px;">';
      byDept[dept].slice(0, 25).forEach(function (o) {
        bodyHtml += '<li style="margin:3px 0;">' + esc_(o.label || 'request') + ' — ' + esc_(o.byName || 'unknown') + ' · ' + o.ageHours + 'h open</li>';
      });
      bodyHtml += '</ul>';
    });
    const textBody = overdue.length + ' overdue department request(s):\n\n' + depts.map(function (dept) {
      return dept + ' (' + byDept[dept].length + '):\n' + byDept[dept].slice(0, 25).map(function (o) {
        return '  • ' + (o.label || 'request') + ' — ' + (o.byName || 'unknown') + ' · ' + o.ageHours + 'h open';
      }).join('\n');
    }).join('\n\n') + '\n\nOpen Metrics → Dept Requests for the full list.';
    try {
      appSendMail_({
        to: mgrEmails.join(','),
        subject: 'Team Tools — ' + overdue.length + ' department request(s) past SLA',
        body: textBody,
        htmlBody: buildBrandedEmailHtml_('Department requests past SLA', bodyHtml, { tone: 'warn', subLabel: 'Dept Requests' }),
      });
    } catch (mailErr) { Logger.log('dept-request reminder send failed: ' + mailErr.message); }
    Logger.log('sendDeptRequestReminderDigest: ' + overdue.length + ' overdue emailed to ' + mgrEmails.length + ' manager(s).');
  } catch (err) {
    Logger.log('sendDeptRequestReminderDigest failed: ' + err.message);
  }
}
