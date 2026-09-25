// ════════════════════════════════════════════════════════════════════════════
//  UMS TEAM TOOLS — 80_training.js
//  Training: assignments, completions and quizzes.
//
//  ONE Apps Script project, ONE global scope: these files are the SERVER, in
//  the load order `web-app/.clasp.json` filePushOrder declares. Batch F2 split
//  them out of Code.js as a MOVE — every declaration below is byte-identical to
//  the one it replaced, and the SPLIT-MANIFEST pin proves it.
// ════════════════════════════════════════════════════════════════════════════

/** Returns the calling rep's most recent training-flagged notes that have a
 *  manager reply (non-empty subformData.trainingReply). Spans ALL dates
 *  (not just today) so the rep can see historical Q&A. Limited to 5,
 *  newest first. Read-only, caller-scoped.
 *  Bounded read (A6): scans the Timestamp / FlagType / SubformData columns to
 *  pick the 5 newest answered training notes, then fetches only those 5 rows
 *  at full width — instead of reading + JSON-parsing the entire history. */
function getMyTrainingQA() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    if (!emp.callNotesSheetId) return { notes: [] };
    const sheet = getCallNotesSheet_(emp);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { notes: [] };
    const n = lastRow - 1;
    const tsCol   = sheet.getRange(2, CN.TIMESTAMP + 1, n, 1).getValues();
    const flagCol = sheet.getRange(2, CN.FLAG_TYPE + 1, n, 1).getValues();
    const subCol  = sheet.getRange(2, CN.SUBFORM_DATA + 1, n, 1).getValues();
    const candidates = [];   // { rowIndex, ts }
    for (let i = 0; i < n; i++) {
      if (String(flagCol[i][0] || '').trim().toLowerCase() !== 'training') continue;
      const raw = subCol[i][0];
      if (!raw || String(raw).indexOf('"trainingReply"') < 0) continue;
      let sub = null;
      try { sub = JSON.parse(raw); } catch (e) { continue; }
      if (!sub || !sub.trainingReply) continue;
      candidates.push({ rowIndex: i + 2, ts: cnTimestampString_(tsCol[i][0]) });   // F(M-14): sort key
    }
    candidates.sort(function (a, b) { return b.ts.localeCompare(a.ts); });
    if (candidates.length > 5) candidates.length = 5;
    const notes = candidates.map(function (c) {
      const row = sheet.getRange(c.rowIndex, 1, 1, CN_HEADERS.length).getValues()[0];
      return callNoteRowToObject_({ row: row, rowIndex: c.rowIndex });
    });
    return { notes: notes };
  } catch (err) { return { error: err.message }; }
}
/** Manager replies to a rep's training-flagged note. The reply is merged
 *  into the note's subformData JSON blob (alongside trainingQuestion), so
 *  no schema migration is needed. Stamps the manager's email + timestamp
 *  for accountability. Pass `reply=''` to clear an existing reply.
 *
 *  Manager-gated. Writes a CallNoteTrainingReply audit row.
 *  Rejects when the target note isn't training-flagged (reply has no
 *  meaning on action/review/unflagged notes). */
function setCallNoteTrainingReply(repEmpId, noteId, reply) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const target = lookupEmployeeById_(repEmpId);
    if (!target) return { success: false, error: 'Employee not found.' };
    if (!target.callNotesSheetId) return { success: false, error: 'This rep has no call-notes Sheet configured.' };

    const sheet = getCallNotesSheet_(target);
    const located = findCallNoteRow_(sheet, noteId);
    if (!located) return { success: false, error: 'Note not found.' };

    const flagType = String(located.row[CN.FLAG_TYPE] || '').trim().toLowerCase();
    if (flagType !== 'training') {
      return { success: false, error: 'Only training-flagged notes can carry a reply.' };
    }

    // Merge into existing subformData (preserves trainingQuestion + anything
    // else that may live there). On clear, drop the reply keys entirely.
    let subformData = null;
    if (located.row[CN.SUBFORM_DATA]) {
      try { subformData = JSON.parse(located.row[CN.SUBFORM_DATA]); }
      catch (e) { subformData = null; }
    }
    if (!subformData || typeof subformData !== 'object') subformData = {};

    // F(cycle-8): cap like the submit path's trainingQuestion (cell-size guard).
    const trimmed = String(reply || '').trim().slice(0, 2000);
    const empTz = target.timezone || CONFIG.TIMEZONE;
    const nowIso = Utilities.formatDate(new Date(), empTz, "yyyy-MM-dd'T'HH:mm:ss");
    if (trimmed) {
      subformData.trainingReply = trimmed;
      subformData.trainingReplyBy = callerEmp.email;
      subformData.trainingReplyAt = nowIso;
      // Round 2 · 8g — also append to feedback[] so multi-turn threads can
      // build on top. Legacy clients still see trainingReply; new clients
      // walk the feedback array. trainingQuestion stays as the seed entry.
      subformData.feedback = Array.isArray(subformData.feedback) ? subformData.feedback : [];
      const fbErr = cnAppendBounded_(subformData, subformData.feedback, {
        role: 'manager',
        message: trimmed,
        at: nowIso,
        by: callerEmp.email,
        kind: 'reply',
      }, CN_FEEDBACK_MAX_ENTRIES, 'feedback');   // F11
      if (fbErr) return { success: false, error: fbErr };
    } else {
      trainingReplyClear_(subformData);   // C8: clear what the THREAD shows, not only the legacy keys
    }
    sheet.getRange(located.rowIndex, CN.SUBFORM_DATA + 1).setValue(sheetSafe_(JSON.stringify(subformData)));

    const dateLocal = cnDateLocalString_(located.row[CN.DATE_LOCAL]);
    writeAuditLog_(target, 'CallNoteTrainingReply', dateLocal, '', false, 0,
      `noteId=${noteId}; ${trimmed ? 'reply set' : 'reply cleared'}`,
      callerEmp.email);

    const updatedRow = sheet.getRange(located.rowIndex, 1, 1, CN_HEADERS.length).getValues()[0];
    return { success: true, note: callNoteRowToObject_({ row: updatedRow, rowIndex: located.rowIndex }) };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** PURE (C8, cycle 22) — "Clear reply", with the semantics of the thread the
 *  rep and the manager both read. The thread renders `feedback[]`, but clear
 *  only deleted the legacy trainingReply* keys, so the reply stayed on screen
 *  and "Clear reply" visibly did nothing. It now removes the LATEST manager
 *  reply from `feedback[]` and re-points the legacy keys at the manager reply
 *  before it (older clients read those), or drops them when none is left. */
function trainingReplyClear_(sfd) {
  const fb = Array.isArray(sfd.feedback) ? sfd.feedback : [];
  for (let i = fb.length - 1; i >= 0; i--) {
    if (fb[i] && fb[i].role === 'manager' && fb[i].kind === 'reply') { fb.splice(i, 1); break; }
  }
  let prev = null;
  for (let j = fb.length - 1; j >= 0; j--) {
    if (fb[j] && fb[j].role === 'manager' && fb[j].kind === 'reply') { prev = fb[j]; break; }
  }
  if (prev) {
    sfd.trainingReply = String(prev.message || '');
    sfd.trainingReplyBy = String(prev.by || '');
    sfd.trainingReplyAt = String(prev.at || '');
  } else {
    delete sfd.trainingReply;
    delete sfd.trainingReplyBy;
    delete sfd.trainingReplyAt;
  }
  if (Array.isArray(sfd.feedback)) sfd.feedback = fb;
  return sfd;
}
/** Manager aggregated training-queue across all enrolled reps. */
function managerGetTrainingQueue(dateRange) {
  return managerAggregateFlagged_('training', dateRange);
}
/** Overdue training items across the whole roster (org-wide; not team-scoped).
 *  Mirrors getTrainingDashboard's per-(emp,item) loop but collects the overdue
 *  rows. Returns [{ empId, empName, title, dueDate }]. */
function trainOverdueForRoster_(todayIso) {
  const assignments = trainReadAssignments_();
  const completions = trainReadCompletions_(null);
  const titles = trainKbTitles_();
  const quizzes = trainReadQuizzes_();
  function itemTitle_(a) {
    // F(L-9): a draft KB item is hidden from the rep checklist, so it must
    // not nag as "overdue" either — null drops it, same as deleted.
    if (a.itemType === 'kb') {
      const kb = titles[a.itemId];
      return (kb && kb.status !== KB_STATUS_DRAFT) ? kb.title : null;
    }
    if (a.itemType === 'quiz') return quizzes[a.itemId] ? quizzes[a.itemId].title : null;
    return null;
  }
  const rows = getEmployeeRosterRows_();
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    if (!empRosterEmail_(rows[r])) continue;   // F3: one predicate
    const empId = String(rows[r][EMP.ID]).trim();
    const empName = String(rows[r][EMP.NAME]).trim();
    const eff = trainEffectiveForEmp_(assignments, empId);
    Object.keys(eff).forEach(function (key) {
      const a = eff[key];
      const title = itemTitle_(a);
      if (!title) return;
      let completedAt = '';
      for (let i = 0; i < completions.length; i++) {
        const c = completions[i];
        if (c.empId === empId && c.itemType === a.itemType && c.itemId === a.itemId && c.completedAt > a.assignedAt) {
          if (c.completedAt > completedAt) completedAt = c.completedAt;
        }
      }
      if (trainDeriveStatus_(!!completedAt, a.dueDate, todayIso) === 'overdue') {
        out.push({ empId: empId, empName: empName, title: title, dueDate: a.dueDate });
      }
    });
  }
  out.sort(function (x, y) {
    if (x.dueDate !== y.dueDate) return x.dueDate < y.dueDate ? -1 : 1;
    return x.empName.localeCompare(y.empName);
  });
  return out;
}
/** Top-level trigger handler (reachable via google.script.run) → gated with
 *  assertManagerCaller_ (INV-44). Daily manager-tz nudge of overdue training
 *  (org-wide) + overdue unsigned docs (team-scoped per manager). */
function sendTrainingOverdueDigest() {
  assertManagerCaller_('sendTrainingOverdueDigest');  // see sendDailyMissedPunchAlerts note
  try {
    const mgrEmails = getManagerEmails_();
    if (mgrEmails.length === 0) { Logger.log('No manager emails — skipping training overdue digest.'); return; }
    const todayIso = trainTodayIso_();
    const overdueTraining = trainOverdueForRoster_(todayIso);   // org-wide
    const overdueDocs = empDocsOverdueAll_(todayIso);           // scope per manager below
    const overdueCoaching = coachUnackedAll_(Date.now());       // scope per manager below
    let sent = 0;
    // #2 (INV-151): while the consolidated daily brief is on, the MANAGER
    // nudge rides the 8am brief instead — but the employee-side reminders
    // below always send (the deadline reminds both sides, INV-135).
    // F(cycle-8 M-11): suppression requires a LIVE brief heartbeat, not just the flag.
    if (managerBriefSuppressionActive_({ checkTrigger: true })) {
      Logger.log('Training-overdue manager nudge: consolidated into the daily brief.');
    } else {
      mgrEmails.forEach(function (email) {
        const mgr = { email: email, isManager: true };
        const scopedDocs = overdueDocs.filter(function (od) {
          return empDocCanManagerSee_(mgr, od.doc);
        });
        const scopedCoaching = overdueCoaching.filter(function (oc) {
          return coachCanManagerSee_(mgr, oc.item);
        });
        if (!overdueTraining.length && !scopedDocs.length && !scopedCoaching.length) return;   // nothing for this manager
        try {
          sendTrainingOverdueEmail_(email, overdueTraining, scopedDocs, scopedCoaching, todayIso);
          sent++;
        } catch (e) { console.warn('sendTrainingOverdueDigest to ' + email + ' failed: ' + e.message); }
      });
    }
    // v2 — also nudge the EMPLOYEE about their own overdue documents (one
    // email per employee). Best-effort per recipient.
    let empNudged = 0;
    const byEmp = {};
    overdueDocs.forEach(function (od) {
      const key = (od.empEmail || '').toLowerCase();
      if (!key) return;
      (byEmp[key] = byEmp[key] || { name: od.empName, docs: [] }).docs.push(od.doc);
    });
    Object.keys(byEmp).forEach(function (email) {
      try { sendEmployeeOverdueDocsEmail_(email, byEmp[email].name, byEmp[email].docs, todayIso); empNudged++; }
      catch (e) { console.warn('employee overdue-docs nudge to ' + email + ' failed: ' + e.message); }
    });
    stampDigestLastRun_('trainingOverdue');
    Logger.log('sendTrainingOverdueDigest: training=' + overdueTraining.length +
      ' docs=' + overdueDocs.length + ' coaching=' + overdueCoaching.length +
      ' managersEmailed=' + sent + ' employeesNudged=' + empNudged);
  } catch (err) {
    Logger.log('sendTrainingOverdueDigest failed: ' + err.message);
  }
}
/** Branded overdue-digest email to one manager (INV-105 — heading esc_'d in
 *  the wrapper, every user field esc_'d here; plain-text body fallback). */
function sendTrainingOverdueEmail_(toEmail, training, docs, coaching, todayIso) {
  const P = CN_EMAIL_PALETTE;
  function section_(label, rowsHtml) {
    return '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;color:' + P.muted +
        ';letter-spacing:.12em;text-transform:uppercase;margin:14px 0 6px;">' + esc_(label) + '</div>' +
      '<table style="width:100%;border-collapse:collapse;">' + rowsHtml + '</table>';
  }
  let html = '<p style="margin:0 0 4px;">These items are past their due date and still incomplete.</p>';
  let text = 'Overdue training & documents (as of ' + todayIso + ')\n';
  if (training.length) {
    const rows = training.map(function (t) {
      return '<tr>' +
        '<td style="padding:6px 10px;color:' + P.ink + ';font-size:13px;"><strong>' + esc_(t.empName) + '</strong> · ' + esc_(t.title) + '</td>' +
        '<td style="padding:6px 10px;font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:' + P.warnDeep + ';white-space:nowrap;text-align:right;">due ' + esc_(t.dueDate) + '</td>' +
        '</tr>';
    }).join('');
    html += section_('Overdue training (' + training.length + ')', rows);
    text += '\nOverdue training:\n' + training.map(function (t) { return '  ' + t.empName + ' · ' + t.title + ' (due ' + t.dueDate + ')'; }).join('\n');
  }
  if (docs.length) {
    const rows = docs.map(function (od) {
      return '<tr>' +
        '<td style="padding:6px 10px;color:' + P.ink + ';font-size:13px;"><strong>' + esc_(od.empName) + '</strong> · ' + esc_(od.doc.title) + '</td>' +
        '<td style="padding:6px 10px;font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:' + P.warnDeep + ';white-space:nowrap;text-align:right;">due ' + esc_(od.doc.dueAt) + '</td>' +
        '</tr>';
    }).join('');
    html += section_('Unsigned documents (' + docs.length + ')', rows);
    text += '\n\nUnsigned documents:\n' + docs.map(function (od) { return '  ' + od.empName + ' · ' + od.doc.title + ' (due ' + od.doc.dueAt + ')'; }).join('\n');
  }
  if (coaching && coaching.length) {
    const rows = coaching.map(function (oc) {
      return '<tr>' +
        // F(L-10): NO patientTRX here — INV-134: coaching notifications are
        // PHI-minimal (severity only, never the patient/TRX or narrative).
        // The manager opens the team-scoped Coaching tab for the detail.
        '<td style="padding:6px 10px;color:' + P.ink + ';font-size:13px;"><strong>' + esc_(oc.empName) + '</strong> · ' + esc_(COACH_SEV_LABELS[oc.item.severity] || oc.item.severity) + '</td>' +
        '<td style="padding:6px 10px;font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:' + P.warnDeep + ';white-space:nowrap;text-align:right;">since ' + esc_(String(oc.item.createdAt).substring(0, 10)) + '</td>' +
        '</tr>';
    }).join('');
    html += section_('Un-acknowledged coaching (' + coaching.length + ')', rows);
    text += '\n\nUn-acknowledged coaching:\n' + coaching.map(function (oc) { return '  ' + oc.empName + ' · ' + (COACH_SEV_LABELS[oc.item.severity] || oc.item.severity) + ' (since ' + String(oc.item.createdAt).substring(0, 10) + ')'; }).join('\n');
  }
  html += '<p style="margin:14px 0 0;">Open the web app → <strong>Training &amp; Employee Docs → Team Training / Issue Docs / Coaching</strong> to follow up.</p>';
  text += '\n\nOpen the web app → Training & Employee Docs to follow up.';
  const htmlBody = buildBrandedEmailHtml_('Overdue training, documents & coaching', html,
    { accent: P.warnDeep, subLabel: 'Training', ctaUrl: safeWebAppUrl_('trainingHome'), ctaLabel: 'Open My Training' });
  appSendMail_({ to: toEmail, subject: '⏰ Overdue training, documents & coaching', body: text, htmlBody: htmlBody });
}
function notifyManagerTrainingQuestion_(emp, question, dateLocal) {
  const recipients = getManagerEmails_();
  if (recipients.length === 0) return;
  try {
    const subj = `Training Q from ${emp.name}: ${String(question).substring(0, 60)}`;
    const body =
      `${emp.name} (${emp.id}) submitted a training-flagged call note with a question:\n\n` +
      `Q: ${question}\n\n` +
      `Date: ${dateLocal}\n\n` +
      `Reply in the web app → Call Notes → Team Notes → Per-Rep View.\n`;
    const html = buildBrandedEmailHtml_('Training question from ' + emp.name,
      '<p style="margin:0 0 12px;"><b>' + esc_(emp.name) + '</b> (' + esc_(emp.id) + ') submitted a training-flagged call note with a question:</p>' +
      '<div style="background:' + CN_EMAIL_PALETTE.brandSoft + ';border-radius:8px;padding:12px 14px;margin:0 0 12px;font-size:15px;color:' + CN_EMAIL_PALETTE.ink + ';">' + esc_(question) + '</div>' +
      brandedKvRows_([['Date', dateLocal]]) +
      '',
      { subLabel: 'Call Notes', statusLabel: 'Question',
        ctaUrl: safeWebAppUrl_('callNotesManage'), ctaLabel: 'Reply in Team Notes' });
    appSendMail_({ to: recipients.join(','), subject: subj, body: body, htmlBody: html });
  } catch (e) { console.warn('Training question notification failed: ' + e.message); }
}
function getOrCreateTrainSheet_(tabName, headers) {
  const ss = getKbSS_();
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    sheet.appendRow(sheetSafeRow_(headers));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}
// ── Sheets-coercion read guards ───────────────────────────────────────────
// AssignedAt / CompletedAt are written as 'yyyy-MM-dd HH:mm:ss' strings
// (CONFIG.TIMEZONE wall time, the writeAuditLog_ convention) and DueDate as
// 'yyyy-MM-dd' — Sheets coerces both to Dates on read. Recover them in the
// KB spreadsheet's OWN tz (the tz that coerced them — the normalizeAuditTs_
// / kbGetUsageStats discipline). String compares on the recovered values
// are chronological (lexicographic == chronological for these formats).
function trainCellTs_(v, ssTz) {
  if (v instanceof Date) return Utilities.formatDate(v, ssTz, 'yyyy-MM-dd HH:mm:ss');
  return String(v || '').trim();
}
function trainCellDate_(v, ssTz) {
  if (v instanceof Date) return Utilities.formatDate(v, ssTz, 'yyyy-MM-dd');
  return String(v || '').trim().substring(0, 10);
}
/** Pure status derivation — shared by getMyTraining + getTrainingDashboard
 *  and pinned by a Node test. */
/** T11 (cycle 22) — the ONE "today" a training due date is judged against:
 *  the manager-tz work day (the ALL-CST work anchor, `workAnchorTz`). The rep's
 *  checklist used the REP's timezone while the team matrix and the overdue
 *  digest used the manager's, so for a PH rep the same item read "due" on one
 *  surface and "overdue" on the other for most of a day. */
function trainTodayIso_() {
  return Utilities.formatDate(new Date(), CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE, 'yyyy-MM-dd');
}
function trainDeriveStatus_(completed, dueDate, todayIso) {
  if (completed) return 'done';
  if (dueDate && todayIso > dueDate) return 'overdue';
  return 'pending';
}
/** Reads every assignment row into plain objects (small tab — assignments
 *  are rare; full read like the KB tree). */
function trainReadAssignments_() {
  const sheet = getOrCreateTrainSheet_(TRAIN_ASSIGN_TAB, TRAIN_ASSIGN_HEADERS);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const ssTz = getKbSS_().getSpreadsheetTimeZone();
  const rows = sheet.getRange(2, 1, last - 1, TRAIN_ASSIGN_HEADERS.length).getValues();
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i][TA.ASSIGN_ID]) continue;
    out.push({
      assignId: String(rows[i][TA.ASSIGN_ID]).trim(),
      itemType: String(rows[i][TA.ITEM_TYPE] || 'kb').trim(),
      itemId: String(rows[i][TA.ITEM_ID] || '').trim(),
      empId: String(rows[i][TA.EMP_ID] || '').trim(),
      assignedBy: String(rows[i][TA.ASSIGNED_BY] || '').trim(),
      assignedAt: trainCellTs_(rows[i][TA.ASSIGNED_AT], ssTz),
      dueDate: trainCellDate_(rows[i][TA.DUE_DATE], ssTz),
      revoked: !!trainCellTs_(rows[i][TA.REVOKED_AT], ssTz),
    });
  }
  return out;
}
function trainReadCompletions_(empIdFilter) {
  const sheet = getOrCreateTrainSheet_(TRAIN_COMPLETE_TAB, TRAIN_COMPLETE_HEADERS);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const ssTz = getKbSS_().getSpreadsheetTimeZone();
  const count = Math.min(last - 1, TRAIN_COMPLETE_MAX_SCAN);
  const rows = sheet.getRange(last - count + 1, 1, count, TRAIN_COMPLETE_HEADERS.length).getValues();
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const empId = String(rows[i][TCMP.EMP_ID] || '').trim();
    if (!empId) continue;
    if (empIdFilter && empId !== empIdFilter) continue;
    out.push({
      empId: empId,
      itemType: String(rows[i][TCMP.ITEM_TYPE] || 'kb').trim(),
      itemId: String(rows[i][TCMP.ITEM_ID] || '').trim(),
      completedAt: trainCellTs_(rows[i][TCMP.COMPLETED_AT], ssTz),
      via: String(rows[i][TCMP.VIA] || '').trim(),
    });
  }
  return out;
}
/** Effective assignment per item for one employee: rows matching the empId
 *  or '*', non-revoked; the LATEST assignedAt wins (re-assign = reset, the
 *  re-certification mechanism — spec §3a). Returns { itemKey: {itemType,
 *  itemId, assignedAt, dueDate} }. */
function trainEffectiveForEmp_(assignments, empId) {
  const eff = {};
  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i];
    if (a.revoked || !a.itemId) continue;
    if (a.empId !== empId && a.empId !== '*') continue;
    const key = a.itemType + ':' + a.itemId;
    if (!eff[key] || a.assignedAt > eff[key].assignedAt) {
      eff[key] = { itemType: a.itemType, itemId: a.itemId, assignedAt: a.assignedAt, dueDate: a.dueDate };
    }
  }
  return eff;
}
/** Rep-callable, caller-scoped, read-only — the rep's training checklist. */
function getMyTraining() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const assignments = trainReadAssignments_();
    const eff = trainEffectiveForEmp_(assignments, emp.id);
    const keys = Object.keys(eff);
    if (!keys.length) return { items: [] };
    const completions = trainReadCompletions_(emp.id);
    const titles = trainKbTitles_();
    const quizzes = trainReadQuizzes_();
    let attempts = null;   // lazy — only read when a quiz item is assigned
    const todayIso = trainTodayIso_();   // T11: the frame every "overdue" reader shares
    const items = [];
    keys.forEach(function (key) {
      const a = eff[key];
      let title, kbType = '', quizMeta = null;
      if (a.itemType === 'kb') {
        const kb = titles[a.itemId];
        if (!kb) return;                          // KB item deleted — unactionable, drop
        // F(L-9): a DRAFT is invisible to reps across every read path
        // (INV-140) — getReferenceItem would 404 the reader anyway, so an
        // assigned-then-drafted item drops off the checklist until published.
        if (kb.status === KB_STATUS_DRAFT) return;
        title = kb.title; kbType = kb.kbType;
      } else if (a.itemType === 'quiz') {
        const q = quizzes[a.itemId];
        if (!q) return;                           // quiz deleted — drop (same rule)
        title = q.title;
        if (attempts === null) attempts = trainReadAttempts_(emp.id);
        const stats = trainAttemptStats_(attempts, a.itemId, a.assignedAt);
        // F(cycle-8): the L-9 draft rule applied to the LINKED material too —
        // saveQuiz rejects a draft kbItemId at save time, but flipping the
        // article to draft LATER left the checklist's "Review the material
        // first" link 404ing (getReferenceItem → 'Not found.'). Null the link
        // when the item is gone or drafted; the quiz itself stays assigned.
        const linkedKb = q.kbItemId ? titles[q.kbItemId] : null;
        const linkedKbId = (linkedKb && linkedKb.status !== KB_STATUS_DRAFT) ? q.kbItemId : '';
        quizMeta = { questionCount: q.questionCount, passPct: q.passPct, kbItemId: linkedKbId, attempts: stats.count, lastScorePct: stats.lastScorePct };
      } else return;
      let completedAt = '';
      for (let i = 0; i < completions.length; i++) {
        const c = completions[i];
        if (c.itemType === a.itemType && c.itemId === a.itemId && c.completedAt > a.assignedAt) {
          if (c.completedAt > completedAt) completedAt = c.completedAt;
        }
      }
      items.push({
        itemType: a.itemType, itemId: a.itemId,
        title: title, kbType: kbType, quiz: quizMeta,
        assignedAt: a.assignedAt, dueDate: a.dueDate,
        completed: !!completedAt, completedAt: completedAt,
        status: trainDeriveStatus_(!!completedAt, a.dueDate, todayIso),
      });
    });
    const rank = { overdue: 0, pending: 1, done: 2 };
    items.sort(function (x, y) {
      if (rank[x.status] !== rank[y.status]) return rank[x.status] - rank[y.status];
      const dx = x.dueDate || '9999', dy = y.dueDate || '9999';
      return dx < dy ? -1 : dx > dy ? 1 : x.title.localeCompare(y.title);
    });
    return { items: items };
  } catch (err) { return { error: err.message }; }
}
/** Rep-callable, locked (INV-01). Marks a kb-type training item complete for
 *  the CALLER (via='read' — honor system; kbRecordView rows corroborate).
 *  Requires a live effective assignment; idempotent on an already-complete
 *  item. Audit: TrainingComplete (itemId only — never content). */
function markTrainingComplete(itemId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Not authorized.' };
    itemId = String(itemId || '').trim();
    if (!itemId) return { success: false, error: 'Missing item id.' };
    const eff = trainEffectiveForEmp_(trainReadAssignments_(), emp.id);
    if (eff['quiz:' + itemId]) return { success: false, error: 'This item is completed by passing its quiz.' };
    const a = eff['kb:' + itemId];
    if (!a) return { success: false, error: 'That item is not assigned to you.' };
    const completions = trainReadCompletions_(emp.id);
    for (let i = 0; i < completions.length; i++) {
      const c = completions[i];
      if (c.itemType === 'kb' && c.itemId === itemId && c.completedAt > a.assignedAt) {
        return { success: true, alreadyComplete: true, completedAt: c.completedAt };
      }
    }
    const now = new Date();
    const ts = fmtDate_(now) + ' ' + fmtTime_(now);
    getOrCreateTrainSheet_(TRAIN_COMPLETE_TAB, TRAIN_COMPLETE_HEADERS)
      .appendRow(sheetSafeRow_([emp.id, 'kb', itemId, ts, 'read', '']));
    writeAuditLog_(emp, 'TrainingComplete', fmtDate_(now), '', false, 0,
      'itemId=' + itemId + '; via=read');
    pendingTasksBust_(emp.id);                                   // F4
    return { success: true, completedAt: ts };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Manager-gated (INV-02), read-only. Completion matrix (reps × items) +
 *  the active assignment list for the revoke UI. Deliberately NOT
 *  team-scoped — training visibility matches every other manager surface
 *  (managerGetShiftStats, getTeamMetrics); only Employee Docs (T3) carry
 *  the elevated per-team confidentiality (spec §3b). */
function getTrainingDashboard() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const assignments = trainReadAssignments_();
    const completions = trainReadCompletions_(null);
    const titles = trainKbTitles_();
    const quizzes = trainReadQuizzes_();
    const allAttempts = trainReadAttempts_(null);
    function itemTitle_(a) {
      // Cycle-9 L-17: drop DRAFT KB items — getMyTraining and the overdue
      // digest already do (L-9), so the dashboard was counting/overdue-
      // flagging items reps cannot see on their checklist or open at all
      // (managers nagged reps about literally uncompletable items).
      if (a.itemType === 'kb') {
        const t = titles[a.itemId];
        return (t && t.status !== KB_STATUS_DRAFT) ? t.title : null;
      }
      if (a.itemType === 'quiz') return quizzes[a.itemId] ? quizzes[a.itemId].title : null;
      return null;
    }
    const rows = getEmployeeRosterRows_();
    const emps = [];
    for (let i = 1; i < rows.length; i++) {
      if (!empRosterEmail_(rows[i])) continue;   // F3: one predicate
      emps.push({ id: String(rows[i][EMP.ID]).trim(), name: String(rows[i][EMP.NAME]).trim() });
    }
    emps.sort(function (a, b) { return a.name.localeCompare(b.name); });
    const todayIso = trainTodayIso_();
    // Items = distinct itemKeys across live assignments that still exist in the KB.
    const itemMap = {};
    const reps = [];
    emps.forEach(function (e) {
      const eff = trainEffectiveForEmp_(assignments, e.id);
      const cell = {};
      const attemptsByKey = {};
      Object.keys(eff).forEach(function (key) {
        const a = eff[key];
        const title = itemTitle_(a);
        if (!title) return;   // kb item / quiz deleted — drop (same rule as the checklist)
        if (!itemMap[key]) itemMap[key] = { key: key, itemType: a.itemType, itemId: a.itemId, title: title, assigned: 0, done: 0, overdue: 0 };
        let completedAt = '';
        for (let i = 0; i < completions.length; i++) {
          const c = completions[i];
          if (c.empId === e.id && c.itemType === a.itemType && c.itemId === a.itemId && c.completedAt > a.assignedAt) {
            if (c.completedAt > completedAt) completedAt = c.completedAt;
          }
        }
        const status = trainDeriveStatus_(!!completedAt, a.dueDate, todayIso);
        cell[key] = status;
        if (a.itemType === 'quiz') {
          const stats = trainAttemptStats_(allAttempts.filter(function (at) { return at.empId === e.id; }), a.itemId, a.assignedAt);
          if (stats.count) attemptsByKey[key] = stats.count;
        }
        itemMap[key].assigned++;
        if (status === 'done') itemMap[key].done++;
        if (status === 'overdue') itemMap[key].overdue++;
      });
      if (Object.keys(cell).length) reps.push({ id: e.id, name: e.name, items: cell, attempts: attemptsByKey });
    });
    const items = Object.keys(itemMap).map(function (k) { return itemMap[k]; })
      .sort(function (a, b) { return a.title.localeCompare(b.title); });
    // Active (non-revoked) assignment rows for the revoke UI.
    const empName = {};
    emps.forEach(function (e) { empName[e.id] = e.name; });
    const active = assignments.filter(function (a) { return !a.revoked && itemTitle_(a); })
      .map(function (a) {
        return {
          assignId: a.assignId, itemType: a.itemType, itemId: a.itemId, title: itemTitle_(a),
          empId: a.empId, empLabel: a.empId === '*' ? 'All employees' : (empName[a.empId] || a.empId),
          assignedBy: a.assignedBy, assignedAt: a.assignedAt, dueDate: a.dueDate,
        };
      })
      .sort(function (x, y) { return x.assignedAt < y.assignedAt ? 1 : -1; });
    return { items: items, reps: reps, assignments: active };
  } catch (err) { return { error: err.message }; }
}
/** Manager-gated (INV-02), locked (INV-01). Assigns one KB item to one or
 *  more employees (or '*' = everyone). Always APPENDS — a duplicate
 *  assignment for the same (item, emp) is the deliberate "reset" path (the
 *  newer assignedAt requires a fresh completion, spec §3a). Best-effort
 *  branded notification per employee (INV-14). Audit: TrainingAssign. */
function saveTrainingAssignment(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let notifyAfter = null;
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    payload = payload || {};
    const itemType = payload.itemType === 'quiz' ? 'quiz' : 'kb';
    const itemId = String(payload.itemId || '').trim();
    if (!itemId) return { success: false, error: 'Pick an item to assign.' };
    let itemTitle;
    if (itemType === 'quiz') {
      const q = trainReadQuizzes_()[itemId];
      if (!q) return { success: false, error: 'That quiz no longer exists.' };
      itemTitle = q.title;
    } else {
      const kb = trainKbTitles_()[itemId];
      if (!kb) return { success: false, error: 'That Reference item no longer exists.' };
      // F(L-9): a draft is rep-invisible (INV-140) — assigning it would leak
      // its title into every target's checklist and the reader would 404.
      if (kb.status === KB_STATUS_DRAFT) {
        return { success: false, error: 'That Reference item is a draft — publish it before assigning it as training.' };
      }
      itemTitle = kb.title;
    }
    const dueDate = String(payload.dueDate || '').trim();
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { success: false, error: 'Invalid due date.' };
    // Resolve targets: '*' or a validated, deduped list of roster ids.
    let targets = [];
    let allMode = false;
    if (payload.empIds === '*' || (Array.isArray(payload.empIds) && payload.empIds.indexOf('*') >= 0)) {
      allMode = true;
    } else if (Array.isArray(payload.empIds)) {
      const rows = getEmployeeRosterRows_();
      const valid = {};
      for (let i = 1; i < rows.length; i++) {
        // C17-3 sibling (cycle 17) — raw positive truthiness was the third
        // divergent predicate on this column (INV-183): a whitespace-only
        // email made an employee a VALID assignment target here while the
        // dashboard/digest walks (empRosterEmail_) excluded them — an
        // assignment that exists but is invisible in the matrix and never
        // nags. The predicate can only narrow, the correct direction.
        if (empRosterEmail_(rows[i])) valid[String(rows[i][EMP.ID]).trim()] = true;
      }
      const seen = {};
      payload.empIds.forEach(function (id) {
        id = String(id || '').trim();
        if (id && valid[id] && !seen[id]) { seen[id] = true; targets.push(id); }
      });
    }
    if (!allMode && !targets.length) return { success: false, error: 'Pick at least one employee.' };
    if (targets.length > TRAIN_ASSIGN_MAX_EMPS) return { success: false, error: 'Too many employees in one assignment (max ' + TRAIN_ASSIGN_MAX_EMPS + ').' };
    const sheet = getOrCreateTrainSheet_(TRAIN_ASSIGN_TAB, TRAIN_ASSIGN_HEADERS);
    const now = new Date();
    const ts = fmtDate_(now) + ' ' + fmtTime_(now);
    const writeIds = allMode ? ['*'] : targets;
    writeIds.forEach(function (empId) {
      sheet.appendRow(sheetSafeRow_([Utilities.getUuid(), itemType, itemId, empId, callerEmp.email, ts, dueDate, '']));
    });
    writeAuditLog_(callerEmp, 'TrainingAssign', fmtDate_(now), '', false, 0,
      'itemType=' + itemType + '; itemId=' + itemId + '; targets=' + (allMode ? 'all' : targets.length) + (dueDate ? '; due=' + dueDate : ''),
      callerEmp.email);
    // Follow-up to T10 (cycle 22): a NEW assignment is a new task on each
    // target's Needs-you list — it used to wait out the cache's TTL.
    if (allMode) pendingTasksBustAll_(); else targets.forEach(function (id) { pendingTasksBust_(id); });
    // Cycle-9 M-7: the notification loop fires AFTER the lock releases (in
    // the finally) — an '*' assignment walks the WHOLE roster sending one
    // MailApp email per employee (~0.3–0.5s each), and holding the global
    // ScriptLock through that starves every punch/note write toward the 15s
    // waitLock ceiling (the exact class the kbUploadImage /
    // kbResolveDocImages_ / 6pm-archive decisions forbid). Same pattern
    // applied to every single-send notify site; pinned by the
    // no-mail-inside-the-lock tripwire.
    notifyAfter = function () { notifyTrainingAssigned_(allMode ? null : targets, itemTitle, dueDate); };
    return { success: true, assigned: allMode ? 'all' : targets.length };
  } catch (err) { return { success: false, error: err.message }; }
  finally {
    lock.releaseLock();
    // M-7: best-effort mail fires only after the global lock is released.
    if (notifyAfter) { try { notifyAfter(); } catch (e) { console.warn('post-lock notify failed: ' + e.message); } }
  }
}
/** Manager-gated (INV-02), locked (INV-01). Revokes one assignment row
 *  (sets RevokedAt — never deletes; the history stays legible). Idempotent.
 *  Audit: TrainingRevoke. */
function revokeTrainingAssignment(assignId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    assignId = String(assignId || '').trim();
    if (!assignId) return { success: false, error: 'Missing assignment id.' };
    const sheet = getOrCreateTrainSheet_(TRAIN_ASSIGN_TAB, TRAIN_ASSIGN_HEADERS);
    const last = sheet.getLastRow();
    if (last < 2) return { success: false, error: 'Assignment not found.' };
    const ids = sheet.getRange(2, TA.ASSIGN_ID + 1, last - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() !== assignId) continue;
      const rowIdx = i + 2;
      const revokedCell = sheet.getRange(rowIdx, TA.REVOKED_AT + 1);
      const ssTz = getKbSS_().getSpreadsheetTimeZone();
      if (trainCellTs_(revokedCell.getValue(), ssTz)) return { success: true, alreadyRevoked: true };
      const now = new Date();
      revokedCell.setValue(sheetSafe_(fmtDate_(now) + ' ' + fmtTime_(now)));
      writeAuditLog_(callerEmp, 'TrainingRevoke', fmtDate_(now), '', false, 0,
        'assignId=' + assignId, callerEmp.email);
      // T10 (cycle 22): the revoked item leaves the rep's Needs-you list now,
      // not when the 2-minute cache runs out — every rep's, for an everyone ('*') assignment.
      const target = String(sheet.getRange(rowIdx, TA.EMP_ID + 1).getValue() || '').trim();
      if (target === '*') pendingTasksBustAll_(); else pendingTasksBust_(target);
      return { success: true };
    }
    return { success: false, error: 'Assignment not found.' };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Best-effort (INV-14): branded "training assigned" email to each target
 *  employee (null targets = everyone on the roster with an email). Failures
 *  log and never block the assignment. */
function notifyTrainingAssigned_(targetIds, itemTitle, dueDate) {
  try {
    const rows = getEmployeeRosterRows_();
    const wanted = targetIds ? {} : null;
    if (targetIds) targetIds.forEach(function (id) { wanted[id] = true; });
    for (let i = 1; i < rows.length; i++) {
      const email = String(rows[i][EMP.EMAIL] || '').trim();
      const id = String(rows[i][EMP.ID] || '').trim();
      if (!email) continue;
      if (wanted && !wanted[id]) continue;
      try {
        const name = String(rows[i][EMP.NAME] || '').trim();
        const body = 'Hi ' + name + ',\n\nNew training has been assigned to you: ' + itemTitle +
          (dueDate ? '\nDue: ' + dueDate : '') +
          '\n\nOpen the web app → Training & Employee Docs → My Training to review and mark it complete.';
        const htmlBody = buildBrandedEmailHtml_('New training assigned',
          '<p style="margin:0 0 12px;">Hi ' + esc_(name) + ',</p>' +
          brandedKvRows_([['Training item', itemTitle]].concat(dueDate ? [['Due', dueDate]] : [])) +
          '', { subLabel: 'Training', ctaUrl: safeWebAppUrl_('trainingHome'), ctaLabel: 'Open My Training' });
        appSendMail_({ to: email, subject: '📚 New training assigned: ' + itemTitle, body: body, htmlBody: htmlBody });
      } catch (e) { console.warn('notifyTrainingAssigned_ to one recipient failed: ' + e.message); }
    }
  } catch (e) { console.warn('notifyTrainingAssigned_ failed: ' + e.message); }
}
/** Pure — validates + normalizes a quiz definition. Returns { ok, quiz } or
 *  { ok:false, error }. Whitelist-built: only known fields survive. */
function trainValidateQuizDef_(def) {
  def = def || {};
  const title = String(def.title || '').trim();
  if (!title || title.length > 120) return { ok: false, error: 'Quiz title is required (max 120 chars).' };
  const passPct = Math.round(Number(def.passPct));
  if (!(passPct >= 0 && passPct <= 100)) return { ok: false, error: 'Pass threshold must be 0–100.' };
  const kbItemId = String(def.kbItemId || '').trim();
  if (!Array.isArray(def.questions) || def.questions.length < 1 || def.questions.length > TRAIN_QUIZ_MAX_QUESTIONS) {
    return { ok: false, error: 'A quiz needs 1–' + TRAIN_QUIZ_MAX_QUESTIONS + ' questions.' };
  }
  const questions = [];
  for (let i = 0; i < def.questions.length; i++) {
    const q = def.questions[i] || {};
    const text = String(q.q || '').trim();
    if (!text || text.length > 500) return { ok: false, error: 'Question ' + (i + 1) + ': text is required (max 500 chars).' };
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > TRAIN_QUIZ_MAX_OPTIONS) {
      return { ok: false, error: 'Question ' + (i + 1) + ': needs 2–' + TRAIN_QUIZ_MAX_OPTIONS + ' options.' };
    }
    const options = [];
    for (let j = 0; j < q.options.length; j++) {
      const opt = String(q.options[j] || '').trim();
      if (!opt || opt.length > 200) return { ok: false, error: 'Question ' + (i + 1) + ', option ' + (j + 1) + ': text is required (max 200 chars).' };
      options.push(opt);
    }
    const correct = Math.round(Number(q.correct));
    if (!(correct >= 0 && correct < options.length)) return { ok: false, error: 'Question ' + (i + 1) + ': pick the correct option.' };
    questions.push({ q: text, options: options, correct: correct });
  }
  return { ok: true, quiz: { title: title, kbItemId: kbItemId, passPct: passPct, questions: questions } };
}
/** Pure — grades answers (option indices; missing/invalid = wrong) against
 *  the full question defs. Returns { scorePct, passed-less data }: right,
 *  total, perQuestion booleans. NEVER returns the correct indices. */
function trainGradeQuiz_(questions, answers) {
  const perQuestion = [];
  let right = 0;
  for (let i = 0; i < questions.length; i++) {
    const a = (answers && answers.length > i) ? Math.round(Number(answers[i])) : -1;
    const ok = a === questions[i].correct;
    perQuestion.push(ok);
    if (ok) right++;
  }
  const total = questions.length || 1;
  return { right: right, total: questions.length, perQuestion: perQuestion, scorePct: Math.round(100 * right / total) };
}
/** Pure — the rep-facing shape. WHITELIST-constructed (never a delete-key
 *  copy), so `correct` cannot leak through a missed field (the privacy
 *  boundary — pinned by a Node test + a getQuiz source tripwire). */
function trainStripQuizForRep_(quizId, quiz) {
  return {
    quizId: quizId, title: quiz.title, passPct: quiz.passPct,
    kbItemId: quiz.kbItemId || '',
    questions: (quiz.questions || []).map(function (q) { return { q: q.q, options: q.options.slice() }; }),
  };
}
/** All quiz rows as { quizId: {title, kbItemId, passPct, questions[], questionCount} }.
 *  Corrupt QuestionsJson → quiz skipped (callNoteRowToObject_ discipline). */
function trainReadQuizzes_() {
  const sheet = getOrCreateTrainSheet_(TRAIN_QUIZ_TAB, TRAIN_QUIZ_HEADERS);
  const last = sheet.getLastRow();
  const map = {};
  if (last < 2) return map;
  const rows = sheet.getRange(2, 1, last - 1, TRAIN_QUIZ_HEADERS.length).getValues();
  for (let i = 0; i < rows.length; i++) {
    const id = String(rows[i][TQ.QUIZ_ID] || '').trim();
    if (!id) continue;
    let questions = null;
    try { questions = JSON.parse(String(rows[i][TQ.QUESTIONS_JSON] || '')); } catch (_) {}
    if (!Array.isArray(questions) || !questions.length) continue;
    map[id] = {
      title: String(rows[i][TQ.TITLE] || '(untitled quiz)'),
      kbItemId: String(rows[i][TQ.KB_ITEM_ID] || '').trim(),
      passPct: Math.round(Number(rows[i][TQ.PASS_PCT])) || 0,
      questions: questions,
      questionCount: questions.length,
      rowIdx: i + 2,
    };
  }
  return map;
}
/** Attempts for one rep (or all when empIdFilter is null), coercion-guarded. */
function trainReadAttempts_(empIdFilter) {
  const sheet = getOrCreateTrainSheet_(TRAIN_ATTEMPT_TAB, TRAIN_ATTEMPT_HEADERS);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const ssTz = getKbSS_().getSpreadsheetTimeZone();
  const count = Math.min(last - 1, TRAIN_ATTEMPT_MAX_SCAN);   // L-21 — unlimited retries grow this tab fastest
  const rows = sheet.getRange(last - count + 1, 1, count, TRAIN_ATTEMPT_HEADERS.length).getValues();
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const empId = String(rows[i][TQA.EMP_ID] || '').trim();
    if (!empId) continue;
    if (empIdFilter && empId !== empIdFilter) continue;
    out.push({
      quizId: String(rows[i][TQA.QUIZ_ID] || '').trim(),
      empId: empId,
      submittedAt: trainCellTs_(rows[i][TQA.SUBMITTED_AT], ssTz),
      scorePct: Math.round(Number(rows[i][TQA.SCORE_PCT])) || 0,
      passed: String(rows[i][TQA.PASSED]).toLowerCase() === 'true',
    });
  }
  return out;
}
/** Attempts since the current assignment round (the §3a reset semantics —
 *  a re-assign starts the attempt count over too). */
function trainAttemptStats_(attempts, quizId, assignedAt) {
  let count = 0, lastScore = null;
  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i];
    if (a.quizId !== quizId || a.submittedAt <= assignedAt) continue;
    count++;
    if (lastScore === null || a.submittedAt >= lastScore.at) lastScore = { at: a.submittedAt, scorePct: a.scorePct };
  }
  return { count: count, lastScorePct: lastScore ? lastScore.scorePct : null };
}
/** Rep-callable — the quiz WITHOUT its answer key (trainStripQuizForRep_ is
 *  the only shape that leaves the server; the caller must hold a live
 *  assignment, same scoping rule as markTrainingComplete). */
function getQuiz(quizId) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    quizId = String(quizId || '').trim();
    const quiz = trainReadQuizzes_()[quizId];
    if (!quiz) return { error: 'Quiz not found.' };
    const eff = trainEffectiveForEmp_(trainReadAssignments_(), emp.id);
    if (!eff['quiz:' + quizId] && !emp.isManager) return { error: 'That quiz is not assigned to you.' };
    return trainStripQuizForRep_(quizId, quiz);
  } catch (err) { return { error: err.message }; }
}
/** Rep-callable, locked (INV-01). Grades server-side, appends the attempt,
 *  and on a pass appends the TrainingCompletions row (via='quiz'). Returns
 *  score + per-question right/wrong ONLY — never the correct options
 *  (spec §9.4). Unlimited retries; attempt # rides back for display. */
function submitQuizAttempt(quizId, answers) {
  // ── A10 (cycle 13): auth, assignment check and GRADING run BEFORE the lock ──
  // This is the F12 shape the project already ruled against: every one of these
  // reads sat inside the ONE project-wide ScriptLock that every punch write
  // contends for, on a 15s waitLock ceiling. None of them is transactional —
  // they only decide whether to accept the submission and what score it gets.
  // Hoisting them means an unauthorized / unknown-quiz / unassigned request
  // never takes the lock at all, and two of the four store reads leave it.
  // What DELIBERATELY stays inside (below): the attempt append, the completions
  // dedup (a read-check-write that guards against a double completion row), and
  // the post-append attempt count, which must observe the row just written.
  const emp = getEmployeeInfo_();
  if (!emp) return { success: false, error: 'Not authorized.' };
  quizId = String(quizId || '').trim();
  let quiz, a;
  try {
    quiz = trainReadQuizzes_()[quizId];
    if (!quiz) return { success: false, error: 'Quiz not found.' };
    a = trainEffectiveForEmp_(trainReadAssignments_(), emp.id)['quiz:' + quizId];
    if (!a) return { success: false, error: 'That quiz is not assigned to you.' };
  } catch (err) { return { success: false, error: err.message }; }
  if (!Array.isArray(answers)) answers = [];
  const graded = trainGradeQuiz_(quiz.questions, answers);   // pure
  const passed = graded.scorePct >= quiz.passPct;

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const now = new Date();
    const ts = fmtDate_(now) + ' ' + fmtTime_(now);
    const attemptId = Utilities.getUuid();
    getOrCreateTrainSheet_(TRAIN_ATTEMPT_TAB, TRAIN_ATTEMPT_HEADERS).appendRow(sheetSafeRow_([
      attemptId, quizId, emp.id, ts, graded.scorePct, passed ? 'TRUE' : 'FALSE',
      JSON.stringify(graded.perQuestion),
    ]));
    const stats = trainAttemptStats_(trainReadAttempts_(emp.id), quizId, a.assignedAt);
    // Completion: only on a pass, and only once per assignment round.
    let alreadyComplete = false;
    if (passed) {
      const completions = trainReadCompletions_(emp.id);
      for (let i = 0; i < completions.length; i++) {
        const c = completions[i];
        if (c.itemType === 'quiz' && c.itemId === quizId && c.completedAt > a.assignedAt) { alreadyComplete = true; break; }
      }
      if (!alreadyComplete) {
        getOrCreateTrainSheet_(TRAIN_COMPLETE_TAB, TRAIN_COMPLETE_HEADERS)
          .appendRow(sheetSafeRow_([emp.id, 'quiz', quizId, ts, 'quiz', attemptId]));
      }
    }
    writeAuditLog_(emp, 'QuizAttempt', fmtDate_(now), '', false, 0,
      'quizId=' + quizId + '; score=' + graded.scorePct + '; passed=' + passed + '; attempt=' + stats.count);
    if (passed) pendingTasksBust_(emp.id);                       // F4
    return {
      success: true, scorePct: graded.scorePct, passed: passed,
      right: graded.right, total: graded.total,
      // S10 (cycle 22; operator 2026-09-25): per-question marks only once the
      // attempt PASSES. With unlimited retries, right/wrong on a failed attempt
      // was an answer key — change one answer, read its mark, repeat. A failed
      // attempt now reports the score alone. (The attempt row still records
      // perQuestion for managers; the score delta can still be probed one
      // question per attempt — slower, not impossible; the attempt count on
      // the manager matrix is what shows it.)
      perQuestion: passed ? graded.perQuestion : null, attempt: stats.count, passPct: quiz.passPct,
    };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Manager-gated — full quiz defs INCLUDING answer keys (managers author
 *  them); feeds the editor + the assignment form's quiz picker. */
function getQuizzes() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const map = trainReadQuizzes_();
    const quizzes = Object.keys(map).map(function (id) {
      const q = map[id];
      return { quizId: id, title: q.title, kbItemId: q.kbItemId, passPct: q.passPct, questionCount: q.questionCount, questions: q.questions };
    }).sort(function (a, b) { return a.title.localeCompare(b.title); });
    return { quizzes: quizzes };
  } catch (err) { return { error: err.message }; }
}
/** Manager-gated (INV-02), locked (INV-01). Create-or-update by quizId.
 *  Validates via the pure trainValidateQuizDef_; bounds the stored JSON
 *  (INV-96 spirit). Audit: QuizSave (id + question count — never text). */
function saveQuiz(def) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const v = trainValidateQuizDef_(def);
    if (!v.ok) return { success: false, error: v.error };
    if (v.quiz.kbItemId) {
      const linkedKb = trainKbTitles_()[v.quiz.kbItemId];
      if (!linkedKb) return { success: false, error: 'The linked Reference item no longer exists.' };
      // Turn A (L-9 sibling): a DRAFT is rep-invisible (INV-140) — the quiz's
      // "Review the material first" link would 404 for every rep.
      if (linkedKb.status === KB_STATUS_DRAFT) {
        return { success: false, error: 'The linked Reference item is a draft — publish it before linking it to a quiz.' };
      }
    }
    const qJson = JSON.stringify(v.quiz.questions);
    if (qJson.length > TRAIN_QUIZ_JSON_MAX) return { success: false, error: 'Quiz is too large — split it into two quizzes.' };
    const sheet = getOrCreateTrainSheet_(TRAIN_QUIZ_TAB, TRAIN_QUIZ_HEADERS);
    const quizId = String((def && def.quizId) || '').trim() || Utilities.getUuid();
    const now = new Date();
    const ts = fmtDate_(now) + ' ' + fmtTime_(now);
    const rowVals = [quizId, v.quiz.title, v.quiz.kbItemId, v.quiz.passPct, qJson, callerEmp.email, ts];
    const existing = trainReadQuizzes_()[quizId];
    if (existing) sheet.getRange(existing.rowIdx, 1, 1, TRAIN_QUIZ_HEADERS.length).setValues(sheetSafeRows_([rowVals]));
    else sheet.appendRow(sheetSafeRow_(rowVals));
    writeAuditLog_(callerEmp, 'QuizSave', fmtDate_(now), '', false, 0,
      'quizId=' + quizId + '; questions=' + v.quiz.questions.length + '; passPct=' + v.quiz.passPct, callerEmp.email);
    return { success: true, quizId: quizId };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Manager-gated (INV-02), locked (INV-01). Deletes the quiz ROW (attempts
 *  + completions stay — append-only history); live assignments referencing
 *  it drop off checklists/dashboards via the title join, same as a deleted
 *  KB item. Audit: QuizDelete. */
function deleteQuiz(quizId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    quizId = String(quizId || '').trim();
    const existing = trainReadQuizzes_()[quizId];
    if (!existing) return { success: false, error: 'Quiz not found.' };
    getOrCreateTrainSheet_(TRAIN_QUIZ_TAB, TRAIN_QUIZ_HEADERS).deleteRow(existing.rowIdx);
    const now = new Date();
    writeAuditLog_(callerEmp, 'QuizDelete', fmtDate_(now), '', false, 0, 'quizId=' + quizId, callerEmp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

// ── T4: Quiz analytics (manager-gated, read-only aggregate) ────────────────
// docs/training-employee-docs-spec.md §5 ("quiz score summaries"). A bounded
// full read of the small Quizzes + QuizAttempts tabs, aggregated per quiz.
// Returns ONLY counts/averages — no answer keys, no per-question booleans, no
// rep-identifying detail beyond distinct counts (INV-121 stays intact: the
// answer key never leaves the server, and this surface adds nothing per-rep).
/** Pure — per-quiz aggregate over all attempt rows. Pinned by a Node test.
 *  `quizzesMap` is trainReadQuizzes_()'s shape ({id:{title,passPct,...}});
 *  `attempts` is trainReadAttempts_(null)'s shape ([{quizId,empId,scorePct,
 *  passed}]). Quizzes with zero attempts still appear (passRate/avgScore
 *  null) so the manager sees an assigned-but-untaken quiz. */
function trainQuizAnalytics_(quizzesMap, attempts) {
  const acc = {};
  Object.keys(quizzesMap || {}).forEach(function (id) {
    acc[id] = {
      quizId: id, title: quizzesMap[id].title, passPct: quizzesMap[id].passPct,
      attemptCount: 0, scoreSum: 0,
      attemptedReps: {}, passedReps: {},
    };
  });
  (attempts || []).forEach(function (a) {
    const e = acc[a.quizId];
    if (!e) return;                       // attempt for a since-deleted quiz — drop
    e.attemptCount++;
    e.scoreSum += (Number(a.scorePct) || 0);
    if (a.empId) {
      e.attemptedReps[a.empId] = true;
      if (a.passed) e.passedReps[a.empId] = true;
    }
  });
  return Object.keys(acc).map(function (id) {
    const e = acc[id];
    const repsAttempted = Object.keys(e.attemptedReps).length;
    const repsPassed = Object.keys(e.passedReps).length;
    return {
      quizId: e.quizId, title: e.title, passPct: e.passPct,
      attemptCount: e.attemptCount,
      repsAttempted: repsAttempted,
      repsPassed: repsPassed,
      passRate: repsAttempted ? Math.round(100 * repsPassed / repsAttempted) : null,
      avgScore: e.attemptCount ? Math.round(e.scoreSum / e.attemptCount) : null,
      avgAttemptsPerRep: repsAttempted ? Math.round(10 * e.attemptCount / repsAttempted) / 10 : null,
    };
  }).sort(function (a, b) { return a.title.localeCompare(b.title); });
}
/** Manager-gated (INV-02), read-only. Quiz score summaries for the Team
 *  Training analytics panel. Aggregate-only — no answer keys, no per-rep
 *  rows (INV-121). */
function getQuizAnalytics() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    return { quizzes: trainQuizAnalytics_(trainReadQuizzes_(), trainReadAttempts_(null)) };
  } catch (err) { return { error: err.message }; }
}
/** Pure (Node-pinned) — resolve a Google Forms reference to its file id.
 *  Returns { id } on success, { error:'published-link' } for a /forms/d/e/
 *  published URL (that id is the response endpoint, NOT openable by
 *  FormApp.openById), or { id:'' } when nothing parses. */
function trainParseFormId_(ref) {
  const s = String(ref || '').trim();
  if (!s) return { id: '' };
  if (/\/forms\/d\/e\//.test(s)) return { error: 'published-link' };
  let m = s.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return { id: m[1] };
  // A bare id pasted on its own (no slashes, Drive-id shaped).
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return { id: s };
  return { id: '' };
}
function importQuizFromForm(formRef) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const parsed = trainParseFormId_(formRef);
    if (parsed.error === 'published-link') {
      return { error: 'That is a published form link. Open the form in EDIT mode and copy the URL from the address bar — it contains /forms/d/<id>/edit.' };
    }
    if (!parsed.id) return { error: 'Could not read a Google Form ID from that — paste the form’s edit URL.' };
    let form;
    try { form = FormApp.openById(parsed.id); }
    catch (e) {
      return { error: 'Could not open that form — the deploying account needs at least view access to it. (' + e.message + ')' };
    }
    const warnings = [];
    const questions = [];
    const items = form.getItems();
    for (let i = 0; i < items.length; i++) {
      if (questions.length >= TRAIN_QUIZ_MAX_QUESTIONS) {
        warnings.push('Only the first ' + TRAIN_QUIZ_MAX_QUESTIONS + ' questions were imported.');
        break;
      }
      const type = String(items[i].getType());
      let mc = null;
      if (type === 'MULTIPLE_CHOICE') mc = items[i].asMultipleChoiceItem();
      else if (type === 'CHECKBOX') mc = items[i].asCheckboxItem();
      else continue;   // TEXT / PARAGRAPH / SCALE / GRID / layout items — skip silently
      let title = String(mc.getTitle() || '').trim();
      if (title.length > 500) { title = title.substring(0, 500); }
      const choices = mc.getChoices();
      const options = [];
      let correctIdx = -1, correctCount = 0;
      for (let j = 0; j < choices.length; j++) {
        let v = String(choices[j].getValue() || '').trim();
        if (v.length > 200) v = v.substring(0, 200);
        options.push(v);
        let isC = false;
        try { isC = choices[j].isCorrectAnswer(); } catch (_) {}
        if (isC) { correctCount++; if (correctIdx < 0) correctIdx = j; }
      }
      if (options.length < 2) { warnings.push('Skipped "' + title + '" — fewer than 2 options.'); continue; }
      if (options.length > TRAIN_QUIZ_MAX_OPTIONS) {
        warnings.push('"' + title + '" had ' + options.length + ' options; kept the first ' + TRAIN_QUIZ_MAX_OPTIONS + '.');
        options.length = TRAIN_QUIZ_MAX_OPTIONS;
        if (correctIdx >= TRAIN_QUIZ_MAX_OPTIONS) correctIdx = -1;
      }
      if (type === 'CHECKBOX' && correctCount > 1) {
        warnings.push('"' + title + '" allows multiple correct answers; this tool grades ONE answer — set the right one after import.');
      }
      if (correctIdx < 0) {
        warnings.push('"' + title + '" had no correct answer marked — defaulted to the first option; set it after import.');
        correctIdx = 0;
      }
      questions.push({ q: title || ('Question ' + (questions.length + 1)), options: options, correct: correctIdx });
    }
    if (!questions.length) {
      return { error: 'No multiple-choice questions found. Only multiple-choice and single-answer checkbox questions can be imported (text, scale, and grid items are skipped).' };
    }
    let title = String(form.getTitle() || '').trim();
    if (title.length > 120) title = title.substring(0, 120);
    return { success: true, title: title, passPct: 80, questions: questions, warnings: warnings };
  } catch (err) { return { error: err.message }; }
}

// ═══════════════════════════════════════════════════════════════════════════
// QA MODULE — Phase 1 (operator 2026-08-27): call-recording review queue.
// Ingestion model (operator decision): the operator DROPS recordings into ONE
// Drive folder (Script Property QA_RECORDINGS_FOLDER_ID); a manual Sync
// indexes new audio files into a DEDICATED QA spreadsheet (QA_SS_ID — NO
// fallback store, the HR_DOCS_SS_ID posture: recordings + review comments
// plausibly reference agents AND patients, so they never co-locate with the
// ADP/KB stores). Access (operator decision): QA reps + managers ONLY —
// agents do NOT see their reviews in v1. The gate is canSeeQa_ (isManager OR
// QA_MEMBERS — the canSeeSpanishInbox_ pattern, INV-31 family) and every
// endpoint checks it BEFORE any store/Drive access.
// Playback: audio bytes are served in base64 chunks through qaGetAudioChunk
// (the kbGetImageData Drive boundary — the file must live IN the QA folder
// before any bytes leave, because the app runs as the deployer) and the
// client assembles them into a Blob URL. Timestamped comments live in a
// QaComments tab (the KbComments shape + an AtSec anchor).
// Shared-AuditLog rows are id/count-only — recording FILE NAMES can carry a
// patient or agent name, so they stay in the QA store (the INV-32 rule).
// ═══════════════════════════════════════════════════════════════════════════
