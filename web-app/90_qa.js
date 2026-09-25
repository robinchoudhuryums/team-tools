// ════════════════════════════════════════════════════════════════════════════
//  UMS TEAM TOOLS — 90_qa.js
//  QA: the recordings index, playback, scorecards, coverage and the audit log.
//
//  ONE Apps Script project, ONE global scope: these files are the SERVER, in
//  the load order `web-app/.clasp.json` filePushOrder declares. Batch F2 split
//  them out of Code.js as a MOVE — every declaration below is byte-identical to
//  the one it replaced, and the SPLIT-MANIFEST pin proves it.
// ════════════════════════════════════════════════════════════════════════════

/** The in-app QA reviewers editor (operator testing note 8, 2026-09-10 —
 *  "where are QA agents added?": until now ONLY in Script Properties, which
 *  the Admin tab never surfaced). The saveSpanishInboxMembers shape exactly:
 *  admin-gated (INV-136), validates email shape, lowercases + dedupes, caps
 *  30, writes Script Property QA_MEMBERS, AdminConfigChange audit. Managers
 *  never need a listing (canSeeQa_ admits every manager); this list is for
 *  NON-manager reviewers. An EMPTY list is valid = managers only. */
function saveQaMembers(emails) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { success: false, error: 'Admin access required.' };
    if (!Array.isArray(emails)) return { success: false, error: 'Expected a list of reviewer emails.' };
    if (emails.length > 30) return { success: false, error: 'Too many reviewers (max 30).' };
    const seen = {};
    const clean = [];
    for (let i = 0; i < emails.length; i++) {
      const e = String(emails[i] || '').trim().toLowerCase();
      if (!e) continue;
      if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(e)) {
        return { success: false, error: 'Not a valid email: "' + e + '"' };
      }
      if (!seen[e]) { seen[e] = true; clean.push(e); }
    }
    propSetBounded_('QA_MEMBERS', clean.join(','), { hint: 'remove a reviewer' });
    writeAuditLog_(emp, 'AdminConfigChange', '', '', false, 0,
      'Updated QA reviewers (' + clean.length + ')', emp.email);
    return { success: true, members: clean };
  } catch (err) { return { success: false, error: err.message }; }
}

/** The Admin "Break schedules" editor's view of the LIVE schedules — every
 *  key's breaks are resolved through the SAME path the Clock chip and the
 *  reminders ticker use (getShiftSchedule_), so the editor can never show a
 *  paraphrase of what actually ships (the INV-185 posture, server-side). Keys
 *  shown: DEFAULT + every CONFIG BY_TIMEZONE tz + every property tz;
 *  rosterTimezones feeds the add-a-timezone picker (best-effort — a failed
 *  roster read still renders the config/property keys). */
// ── Break coverage planner (operator 2026-09-03) ────────────────────────────
// The Admin "Break schedules" card carries a 15-minute strip of who is on the
// desk across the business window, computed from the EFFECTIVE breaks (tz +
// per-agent layers, through the one resolver) of a DRAFT the admin has not
// saved yet, over a background layer of average inbound call volume by time
// of day. It is a SCHEDULE view — every rep on shift, breaks subtracted — not
// a dated one: approved PTO lives on the Coverage planner, which now subtracts
// breaks too (coverageSplitAtBreaks_).
/** QA access predicate — managers OR a rep listed in QA_MEMBERS (the
 *  canSeeSpanishInbox_ pattern). Agents are deliberately OUTSIDE the gate in
 *  v1 (operator decision: they do not see their reviews yet). */
function canSeeQa_(emp) {
  if (!emp) return false;
  if (emp.isManager) return true;
  return !!getQaMembers_()[String(emp.email || '').trim().toLowerCase()];
}
function getQaMembers_() {
  let raw = '';
  try { raw = PropertiesService.getScriptProperties().getProperty('QA_MEMBERS') || ''; } catch (e) {}
  const set = {};
  raw.split(',').forEach(function (s) { const e = s.trim().toLowerCase(); if (e) set[e] = true; });
  return set;
}
/** May this EMAIL review — i.e. would canSeeQa_ admit them? A QA_MEMBERS
 *  entry, OR a roster row marked manager (found via the one inclusion
 *  predicate, empRosterEmail_). Operator testing note 8 (2026-09-10): the
 *  manager, who reviews without a listing, could not be ASSIGNED a recording
 *  by another manager — the assign check consulted QA_MEMBERS alone and
 *  refused the very people canSeeQa_ admits. Best-effort on the roster read
 *  (a failed read falls back to the members list, the pre-fix behaviour). */
function qaCanReviewEmail_(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return false;
  if (getQaMembers_()[e]) return true;
  try {
    const rows = getEmployeeRosterRows_();
    for (let i = 1; i < rows.length; i++) {
      if (empRosterEmail_(rows[i]).toLowerCase() !== e) continue;
      return /^(true|yes|y|1)$/i.test(String(rows[i][EMP.IS_MANAGER] || '').trim());
    }
  } catch (err) {}
  return false;
}
function qaFolderId_() {
  try { return String(PropertiesService.getScriptProperties().getProperty('QA_RECORDINGS_FOLDER_ID') || '').trim(); }
  catch (e) { return ''; }
}
/** The dedicated QA store — NO fallback (the getHrDocsSS_ posture): an unset
 *  property is a friendly not-configured error, never a silent write into the
 *  ADP/KB sheets. */
function getQaSS_() {
  if (typeof _TEST_OVERRIDE_QA_SS_ID !== 'undefined' && _TEST_OVERRIDE_QA_SS_ID) {
    return SpreadsheetApp.openById(_TEST_OVERRIDE_QA_SS_ID);
  }
  const id = PropertiesService.getScriptProperties().getProperty('QA_SS_ID');
  if (!id) throw new Error('QA is not configured — set Script Property QA_SS_ID to a dedicated spreadsheet.');
  return SpreadsheetApp.openById(id);
}
function getOrCreateQaSheet_(tabName, headers, textIdx) {
  const textCols = (textIdx || []).map(sheetColLetter_);
  const ss = getQaSS_();
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    sheet.appendRow(sheetSafeRow_(headers));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    // Pin the free-text columns to PLAIN TEXT for all future rows — a file
    // named "5-12 Maria.mp3"-less "5-12" or a comment starting "5/12" would
    // otherwise coerce to a Date on read (the kbImportDataTable lesson:
    // format FIRST, then write).
    (textCols || []).forEach(function (col) { sheet.getRange(col + '2:' + col).setNumberFormat('@'); });
  } else if (sheet.getLastColumn() < headers.length) {
    // Header self-heal (the KB/EmpDocs pattern): a tab provisioned before a
    // trailing column shipped gets the missing headers appended in place.
    const have = sheet.getLastColumn();
    sheet.getRange(1, have + 1, 1, headers.length - have).setValues(sheetSafeRows_([headers.slice(have)])).setFontWeight('bold');
    (textCols || []).forEach(function (col) {
      if (col.charCodeAt(0) - 64 > have) sheet.getRange(col + '2:' + col).setNumberFormat('@');
    });
  }
  return sheet;
}
function getOrCreateQaRecordingsSheet_() { return getOrCreateQaSheet_(QA_RECORDINGS_TAB, QA_RECORDINGS_HEADERS, QA_RECORDINGS_TEXT_IDX); }
function getOrCreateQaExemptionsSheet_() { return getOrCreateQaSheet_(QA_EXEMPTIONS_TAB, QA_EXEMPTIONS_HEADERS, QA_EXEMPTIONS_TEXT_IDX); }
function getOrCreateQaCommentsSheet_()   { return getOrCreateQaSheet_(QA_COMMENTS_TAB, QA_COMMENTS_HEADERS, QA_COMMENTS_TEXT_IDX); }
function getOrCreateQaScorecardsSheet_() { return getOrCreateQaSheet_(QA_SCORECARDS_TAB, QA_SCORECARDS_HEADERS, QA_SCORECARDS_TEXT_IDX); }
/** PURE: byte range of chunk `idx` of a `size`-byte file cut into
 *  `chunkBytes` slices. null when the file is empty or idx is out of range —
 *  the caller answers "Invalid chunk", never serves bytes it did not mean to. */
function qaChunkRange_(size, idx, chunkBytes) {
  size = Number(size); idx = Number(idx); chunkBytes = Number(chunkBytes);
  if (!isFinite(size) || size <= 0 || !isFinite(chunkBytes) || chunkBytes <= 0) return null;
  if (!isFinite(idx) || idx < 0 || idx !== Math.floor(idx)) return null;
  const chunks = Math.ceil(size / chunkBytes);
  if (idx >= chunks) return null;
  const start = idx * chunkBytes;
  return { start: start, end: Math.min(size, start + chunkBytes), chunks: chunks };
}
/** The review queue. Read-only; QA-gated. An unset QA_SS_ID returns a
 *  notConfigured shape (setup instructions beat an error card on a fresh
 *  deploy); a configured-but-unreachable store is a real error. */
function getQaQueue(period) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !canSeeQa_(emp)) return { error: 'QA access required.' };
    let storeSet = true;
    try { storeSet = !!(PropertiesService.getScriptProperties().getProperty('QA_SS_ID')); } catch (e) {}
    if (typeof _TEST_OVERRIDE_QA_SS_ID !== 'undefined' && _TEST_OVERRIDE_QA_SS_ID) storeSet = true;
    const members = Object.keys(getQaMembers_()).sort();
    // Phase 2: roster NAMES feed the detail's agent datalist (names only —
    // the same disclosure getTeammateStatus already makes; free text stays
    // allowed so an ex-agent's recording is still attributable).
    const agentOptions = [];
    const rosterIdByName = {};   // Q7 — the coaching hand-off needs the rep's id, not their name
    try {
      const rrows = getEmployeeRosterRows_();
      for (let i = 1; i < rrows.length; i++) {
        if (!empRosterEmail_(rrows[i])) continue;   // INV-183: one inclusion predicate
        const nm = String(rrows[i][EMP.NAME] || '').trim();
        if (nm && agentOptions.indexOf(nm) < 0) agentOptions.push(nm);
        if (nm && !rosterIdByName[nm.toLowerCase()]) rosterIdByName[nm.toLowerCase()] = String(rrows[i][EMP.ID] || '').trim();
      }
      agentOptions.sort();
    } catch (e) { /* best-effort — the queue still renders */ }
    // Q4 — the audit period (operator decision 6: derived from DriveCreatedMs).
    // The client sends the key it wants; an absent/invalid one lands on the
    // current month. Options + target ride the payload so the client never
    // mirrors the period arithmetic or the CONFIG target.
    const todayYmd = Utilities.formatDate(new Date(), CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE, 'yyyy-MM-dd');
    const periodOptions = qaPeriodOptions_(todayYmd);
    const periodKey = qaPeriodValid_(period) ? String(period).trim() : periodOptions[0].key;
    const target = qaAuditTarget_();
    const base = {
      members: members, self: String(emp.email || '').trim().toLowerCase(),
      isManager: !!emp.isManager, folderConfigured: !!qaFolderId_(),
      agentOptions: agentOptions, criteria: getQaScorecardCriteria_(),
      period: periodKey, periodOptions: periodOptions, target: target, todayYmd: todayYmd,
      periodEnd: (qaPeriodBounds_(periodKey) || {}).end || '',
    };
    if (!storeSet) { base.notConfigured = true; base.recordings = []; base.total = 0; base.cap = QA_LIST_CAP; base.coverage = []; return base; }
    const sheet = getOrCreateQaRecordingsSheet_();
    const last = sheet.getLastRow();
    const items = [];
    if (last >= 2) {
      const start = Math.max(2, last - QA_LIST_SCAN + 1);
      const rows = sheet.getRange(start, 1, last - start + 1, QA_RECORDINGS_HEADERS.length).getValues();
      for (let i = 0; i < rows.length; i++) {
        const fid = String(rows[i][QAR.FILE_ID] || '').trim();
        if (!fid) continue;
        items.push({
          fileId: fid,
          name: String(rows[i][QAR.NAME] || ''),
          sizeBytes: Number(rows[i][QAR.SIZE]) || 0,
          mime: String(rows[i][QAR.MIME] || ''),
          createdMs: Number(rows[i][QAR.CREATED_MS]) || 0,
          createdYmd: qaMsToYmd_(Number(rows[i][QAR.CREATED_MS]) || 0),
          status: qaStatus_(rows[i][QAR.STATUS]),
          statusMs: Number(rows[i][QAR.STATUS_MS]) || 0,
          assignee: String(rows[i][QAR.ASSIGNEE] || '').trim().toLowerCase(),
          url: String(rows[i][QAR.URL] || ''),
          agent: String(rows[i][QAR.AGENT] || '').trim(),
          agentEmpId: String(rows[i][QAR.AGENT] || '').trim() ? (rosterIdByName[String(rows[i][QAR.AGENT] || '').trim().toLowerCase()] || '') : '',
          sharedMs: Number(rows[i][QAR.SHARED_MS]) || 0,
          durationSec: Number(rows[i][QAR.DURATION_SEC]) || 0,
          skipReason: String(rows[i][QAR.SKIP_REASON] || ''),
          comments: 0,
          manual: qaIsManualId_(fid),   // a recording-less audit — no audio to load
        });
      }
    }
    // One bounded pass over QaComments for the per-recording ACTIVE counts.
    try {
      const cs = getQaSS_().getSheetByName(QA_COMMENTS_TAB);
      if (cs && cs.getLastRow() >= 2) {
        const cLast = cs.getLastRow();
        const cStart = Math.max(2, cLast - QA_COMMENTS_SCAN + 1);
        const cRows = cs.getRange(cStart, 1, cLast - cStart + 1, QA_COMMENTS_HEADERS.length).getValues();
        const counts = {};
        for (let i = 0; i < cRows.length; i++) {
          if (String(cRows[i][QAC.STATUS] || '').trim().toLowerCase() !== 'active') continue;
          const fid = String(cRows[i][QAC.FILE_ID] || '');
          counts[fid] = (counts[fid] || 0) + 1;
        }
        items.forEach(function (it) { it.comments = counts[it.fileId] || 0; });
      }
    } catch (e) { /* counts are decoration — the queue still renders */ }
    items.sort(function (a, b) { return b.createdMs - a.createdMs; });
    // Q4 — the coverage join (one roster row per rep, this period vs the
    // previous). Best-effort with the OUTCOME carried: a failed scorecard or
    // exemption read must not read as "nobody sampled" (INV-187).
    try {
      const latest = qaLatestScorecards_(qaReadScorecards_(null).cards);
      base.coverage = qaCoverageRows_(items, latest, agentOptions, periodKey, target, qaReadExemptions_(), qaPrevPeriod_(periodKey));
    } catch (e) { base.coverage = []; base.coverageUnavailable = true; }
    base.recordings = items.slice(0, QA_LIST_CAP);
    base.total = items.length;
    base.cap = QA_LIST_CAP;
    return base;
  } catch (err) { return { error: err.message }; }
}
function qaStatus_(cell) {
  const s = String(cell || '').trim().toLowerCase();
  return QA_STATUSES.indexOf(s) >= 0 ? s : 'new';
}
/** Index NEW audio files from the QA recordings Drive folder. QA-gated,
 *  IDEMPOTENT (known FileIds are skipped), bounded per run with the
 *  truncation REPORTED (INV-169). Non-audio files are counted, never indexed.
 *  The audit row carries COUNTS ONLY — file names stay in the QA store.
 *
 *  D3 (cycle 22) — RESUMABLE, and the Drive walk runs OUTSIDE the lock.
 *  The budget used to count already-indexed files, and every run restarted
 *  the folder from the top, so a folder past QA_SYNC_MAX_FILES files could
 *  never be fully indexed and "sync again for the rest" was false. A capped
 *  run now saves the iterator's continuation token (QA_SYNC_TOKEN_PROP, keyed
 *  to the folder id) and the next run resumes there; a completed walk clears
 *  it, so the run after that starts fresh and sees files added meanwhile.
 *  The walk also held the ONE ScriptLock for its whole Drive traversal,
 *  queueing every punch and note behind it; only the append is locked now,
 *  and the known set is RE-READ under the lock so two overlapping syncs can
 *  never index a file twice. */
function qaSyncRecordings() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !canSeeQa_(emp)) return { success: false, error: 'QA access required.' };
    const folderId = qaFolderId_();
    if (!folderId) return { success: false, error: 'The QA recordings folder is not configured — set Script Property QA_RECORDINGS_FOLDER_ID to the Drive folder recordings are dropped into.' };
    let folder;
    try { folder = DriveApp.getFolderById(folderId); }
    catch (e) { return { success: false, error: 'The QA recordings folder could not be opened — check QA_RECORDINGS_FOLDER_ID and the deploying account\'s access to it.' }; }
    const sheet = getOrCreateQaRecordingsSheet_();
    let known = qaKnownFileIds_(sheet);
    // Resume where the last capped run stopped — only for THIS folder.
    let files = null, resumed = false;
    const saved = qaSyncTokenRead_();
    if (saved && saved.folderId === folderId && saved.token) {
      try { files = DriveApp.continueFileIterator(saved.token); resumed = true; }
      catch (e) { files = null; }   // an expired token restarts the walk
    }
    if (!files) files = folder.getFiles();
    let scanned = 0, nonAudio = 0, truncated = false, nextToken = '';
    const candidates = [];
    while (files.hasNext()) {
      if (scanned >= QA_SYNC_MAX_FILES) {
        truncated = true;
        try { nextToken = files.getContinuationToken(); } catch (e) { nextToken = ''; }
        break;
      }
      const f = files.next(); scanned++;
      const id = f.getId();
      if (known[id]) continue;
      const mime = String(f.getMimeType() || '').toLowerCase();
      if (mime.indexOf('audio/') !== 0) { nonAudio++; continue; }
      candidates.push([
        id, String(f.getName() || ''), f.getSize(), mime,
        f.getDateCreated().getTime(), Date.now(),   // NUMBER cells — coercion-immune
        'new', '', 0, String(f.getUrl() || ''), '', 0, '', '', '',   // Agent + SharedMs + DurationSec + SkipReason + AgentId set later in the detail
      ]);
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    let added = 0;
    try {
      known = qaKnownFileIds_(sheet);   // a sync that finished while we walked
      const rows = candidates.filter(function (r) { if (known[r[0]]) return false; known[r[0]] = true; return true; });
      added = rows.length;
      if (rows.length) {
        appendRowsTextSafe_(sheet, rows, QA_RECORDINGS_TEXT_IDX);   // S2: raw into the '@' columns, sheet-safe elsewhere
      }
      qaSyncTokenWrite_(truncated && nextToken ? { folderId: folderId, token: nextToken } : null);
      writeAuditLog_(emp, 'QaSync', '', '', false, 0,
        'scanned=' + scanned + '; added=' + added + '; nonAudio=' + nonAudio + '; truncated=' + truncated + '; resumed=' + resumed, emp.email);
    } finally { lock.releaseLock(); }
    // `resumable` says whether "sync again for the rest" is TRUE: a capped run
    // with no token (the iterator could not give one) restarts from the top.
    return { success: true, scanned: scanned, added: added, nonAudio: nonAudio, truncated: truncated,
             resumed: resumed, resumable: !!(truncated && nextToken) };
  } catch (err) { return { success: false, error: err.message }; }
}
/** {fileId: true} for every indexed recording (the FileId column only). */
function qaKnownFileIds_(sheet) {
  const known = {};
  const last = sheet.getLastRow();
  if (last >= 2) {
    sheet.getRange(2, QAR.FILE_ID + 1, last - 1, 1).getValues()
      .forEach(function (r) { const id = String(r[0] || '').trim(); if (id) known[id] = true; });
  }
  return known;
}
function qaSyncTokenRead_() {
  try {
    const v = JSON.parse(PropertiesService.getScriptProperties().getProperty(QA_SYNC_TOKEN_PROP) || 'null');
    return (v && typeof v === 'object') ? v : null;
  } catch (e) { return null; }
}
/** Save (or, with null, clear) the resume point. Best-effort: a lost token
 *  only means the next run restarts from the top — slower, never wrong. */
function qaSyncTokenWrite_(val) {
  try {
    if (!val) { PropertiesService.getScriptProperties().deleteProperty(QA_SYNC_TOKEN_PROP); return; }
    propSetBounded_(QA_SYNC_TOKEN_PROP, JSON.stringify(val), { mode: 'degrade', shrink: function () { return null; } });
  } catch (e) { /* best-effort */ }
}
/** Locate a recording's sheet row by FileId (bounded tail; LAST match wins —
 *  the findExistingPunch_ agreement, though sync idempotence means duplicates
 *  should not exist). Returns {rowIdx, row} or null. */
function qaFindRecordingRow_(sheet, fileId) {
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const start = Math.max(2, last - QA_LIST_SCAN + 1);
  const ids = sheet.getRange(start, QAR.FILE_ID + 1, last - start + 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0] || '').trim() !== fileId) continue;
    const rowIdx = start + i;
    return { rowIdx: rowIdx, row: sheet.getRange(rowIdx, 1, 1, QA_RECORDINGS_HEADERS.length).getValues()[0] };
  }
  return null;
}
/** Set a recording's review status. QA-gated, locked; status is enum-bounded
 *  so a crafted call can never write garbage into the column (INV-37 spirit).
 *  Audit row is id + status only (the status is an enum, never free text). */
function qaSetRecordingStatus(fileId, status, reason) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !canSeeQa_(emp)) return { success: false, error: 'QA access required.' };
    const fid = String(fileId || '').trim();
    const st = String(status || '').trim().toLowerCase();
    if (QA_STATUSES.indexOf(st) < 0) return { success: false, error: 'Unknown status.' };
    const sheet = getOrCreateQaRecordingsSheet_();
    const found = qaFindRecordingRow_(sheet, fid);
    if (!found) return { success: false, error: 'Recording not found.' };
    // Q2 — a skip carries its reason (free text, bounded, QA-store only —
    // it may name the caller). Any other status CLEARS a stale reason.
    const why = st === 'skipped' ? String(reason || '').trim().substring(0, QA_SKIP_REASON_MAX) : '';
    sheet.getRange(found.rowIdx, QAR.STATUS + 1).setValue(sheetSafe_(st));
    sheet.getRange(found.rowIdx, QAR.STATUS_MS + 1).setValue(sheetSafe_(Date.now()));
    sheet.getRange(found.rowIdx, QAR.SKIP_REASON + 1).setNumberFormat('@').setValue(sheetText_(why));   // S2: a '@' column
    writeAuditLog_(emp, 'QaStatusChange', '', '', false, 0, 'fileId=' + fid + '; status=' + st, emp.email);
    return { success: true, status: st, skipReason: why };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Assign / release a recording. The Spanish-claim rules (INV-31 round 2):
 *  any QA member self-assigns; assigning someone ELSE is manager-only and the
 *  target must be a configured member; a non-manager cannot take over another
 *  member's live assignment; release is assignee-or-manager, idempotent. */
function qaAssignRecording(fileId, assigneeEmail) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !canSeeQa_(emp)) return { success: false, error: 'QA access required.' };
    const fid = String(fileId || '').trim();
    const self = String(emp.email || '').trim().toLowerCase();
    const target = String(assigneeEmail || '').trim().toLowerCase();
    const sheet = getOrCreateQaRecordingsSheet_();
    const found = qaFindRecordingRow_(sheet, fid);
    if (!found) return { success: false, error: 'Recording not found.' };
    const current = String(found.row[QAR.ASSIGNEE] || '').trim().toLowerCase();
    if (!target) {                              // release
      if (current && current !== self && !emp.isManager) {
        return { success: false, error: 'Only the assignee or a manager can release this recording.' };
      }
      if (current) sheet.getRange(found.rowIdx, QAR.ASSIGNEE + 1).setValue(sheetSafe_(''));
      writeAuditLog_(emp, 'QaAssign', '', '', false, 0, 'fileId=' + fid + '; released', emp.email);
      return { success: true, assignee: '' };
    }
    if (target !== self && !emp.isManager) {
      return { success: false, error: 'Only a manager can assign someone else.' };
    }
    if (!(emp.isManager && target === self)) {
      // The target must be someone who can actually SEE the queue — a
      // QA_MEMBERS listing OR a roster manager (qaCanReviewEmail_ mirrors
      // canSeeQa_; operator testing note 8 — the old QA_MEMBERS-only check
      // refused assigning to a manager).
      if (!qaCanReviewEmail_(target)) {
        return { success: false, error: 'That email is not a QA reviewer — a manager, or a rep listed under Manage → Admin → Config → QA reviewers.' };
      }
    }
    if (current && current !== self && !emp.isManager) {
      return { success: false, error: 'This recording is already assigned — a manager can reassign it.' };
    }
    sheet.getRange(found.rowIdx, QAR.ASSIGNEE + 1).setValue(sheetSafe_(target));
    writeAuditLog_(emp, 'QaAssign', '', '', false, 0, 'fileId=' + fid + '; assigned', emp.email);
    return { success: true, assignee: target };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** One base64 chunk of a recording's bytes — the playback path. THE Drive
 *  BOUNDARY (the kbGetImageData rule): the file's parents must include the
 *  QA recordings folder BEFORE any bytes leave, because the app runs as the
 *  deployer — without it, any QA member could read ANY Drive file the
 *  deployer can open, by id. The size cap is checked from metadata BEFORE the
 *  blob is read; an over-cap file names the Drive fallback instead. */
function qaGetAudioChunk(fileId, chunkIndex) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !canSeeQa_(emp)) return { error: 'QA access required.' };
    const fid = String(fileId || '').trim();
    if (!/^[a-zA-Z0-9_-]{10,}$/.test(fid)) return { error: 'Recording not found.' };
    return qaAudioChunkFor_(fid, chunkIndex);
  } catch (err) { return { error: err.message }; }
}
/** The SHARED Drive byte boundary behind both playback paths (reviewer
 *  qaGetAudioChunk + the agent's getMyQaReviewAudioChunk) — folder parentage
 *  checked BEFORE any bytes leave, size cap from METADATA before the blob,
 *  audio-only, pure qaChunkRange_ slicing. Callers own their GATE and (for
 *  the agent path) the share/name scope; this helper owns the bytes. */
function qaAudioChunkFor_(fid, chunkIndex) {
  try {
    const folderId = qaFolderId_();
    if (!folderId) return { error: 'The QA recordings folder is not configured (Script Property QA_RECORDINGS_FOLDER_ID).' };
    let file;
    try { file = DriveApp.getFileById(fid); }
    catch (e) { return { error: 'Recording not found.' }; }
    let inFolder = false;
    const parents = file.getParents();
    while (parents.hasNext()) {
      if (parents.next().getId() === folderId) { inFolder = true; break; }
    }
    if (!inFolder) return { error: 'Recording not found.' };
    const size = file.getSize();
    if (size > QA_AUDIO_MAX_BYTES) {
      return {
        error: 'This recording is ' + Math.round(size / 1048576) + ' MB — over the ' +
          Math.round(QA_AUDIO_MAX_BYTES / 1048576) + ' MB in-app playback cap. Open it in Drive instead.',
        oversize: true,
      };
    }
    const mime = String(file.getMimeType() || '').toLowerCase();
    if (mime.indexOf('audio/') !== 0) return { error: 'Not an audio file.' };
    const range = qaChunkRange_(size, chunkIndex, QA_AUDIO_CHUNK_BYTES);
    if (!range) return { error: 'Invalid chunk.' };
    const bytes = qaReadChunkBytes_(file, fid, size, range);
    return {
      success: true,
      b64: Utilities.base64Encode(bytes),
      chunkIndex: Math.floor(Number(chunkIndex)), chunks: range.chunks,
      size: size, mime: mime,
    };
  } catch (err) { return { error: err.message }; }
}
/** PURE (D5, cycle 22) — the HTTP Range header for one chunk (end-inclusive). */
function qaRangeHeader_(range) {
  return 'bytes=' + range.start + '-' + (range.end - 1);
}
/** D5 (cycle 22) — the bytes of ONE chunk. Every chunk request used to read
 *  the WHOLE recording (`getBlob().getBytes()`) and slice it, so a 40 MB file
 *  played in 3 MB chunks downloaded ~560 MB. It asks Drive for the range
 *  (alt=media + a Range header, the same bearer-token pattern the KB image
 *  upload uses) and accepts only an answer of exactly the right length — a
 *  206 of the range, or a 200 of the whole file, which it slices. Anything
 *  else falls back to the old whole-blob read: slower, never wrong, and the
 *  folder-parentage boundary above has already run either way. */
function qaReadChunkBytes_(file, fid, size, range) {
  try {
    const resp = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fid) + '?alt=media&supportsAllDrives=true', {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), Range: qaRangeHeader_(range) },
      muteHttpExceptions: true,
    });
    const code = resp.getResponseCode();
    const got = resp.getContent();
    if (code === 206 && got.length === range.end - range.start) return got;
    if (code === 200 && got.length === size) return got.slice(range.start, range.end);
  } catch (e) { /* fall through to the whole-blob read */ }
  return file.getBlob().getBytes().slice(range.start, range.end);
}
/** Agent playback of a SHARED review (Phase-3 follow-on, 2026-08-28) — the
 *  audio path getMyQaReviews deliberately omitted, now with the SAME double
 *  scope: EMPLOYEE-gated (bare read {error} — the GATE-SHAPE rule,
 *  deliberately NOT canSeeQa_), and the recording row is resolved READ-ONLY
 *  from the QA store FIRST — SharedMs set AND Agent = the caller's roster
 *  name — BEFORE any Drive access. Every scope refusal is the generic
 *  'Recording not found.' so existence never leaks. The Drive byte boundary
 *  itself is the SHARED qaAudioChunkFor_, so the two playback paths cannot
 *  drift. Unsharing (SharedMs → 0) revokes playback on the next chunk. */
function getMyQaReviewAudioChunk(fileId, chunkIndex) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const fid = String(fileId || '').trim();
    if (!/^[a-zA-Z0-9_-]{10,}$/.test(fid)) return { error: 'Recording not found.' };
    let storeSet = false;
    try { storeSet = !!(PropertiesService.getScriptProperties().getProperty('QA_SS_ID')); } catch (e) {}
    if (typeof _TEST_OVERRIDE_QA_SS_ID !== 'undefined' && _TEST_OVERRIDE_QA_SS_ID) storeSet = true;
    const myName = String(emp.name || '').trim().toLowerCase();
    if (!storeSet || !myName) return { error: 'Recording not found.' };
    const sheet = getQaSS_().getSheetByName(QA_RECORDINGS_TAB);   // read-only — never provisions
    if (!sheet) return { error: 'Recording not found.' };
    const found = qaFindRecordingRow_(sheet, fid);
    if (!found) return { error: 'Recording not found.' };
    if (!(Number(found.row[QAR.SHARED_MS]) > 0)) return { error: 'Recording not found.' };   // shared-gated
    if (!qaRowIsMine_(found.row, emp, qaMyNameUnique_(emp))) return { error: 'Recording not found.' };   // id-scoped (F-16)
    return qaAudioChunkFor_(fid, chunkIndex);
  } catch (err) { return { error: err.message }; }
}
/** A recording's ACTIVE timestamped comments, by timeline position. */
function qaListComments(fileId) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !canSeeQa_(emp)) return { error: 'QA access required.' };
    const fid = String(fileId || '').trim();
    const ss = getQaSS_();
    const sheet = ss.getSheetByName(QA_COMMENTS_TAB);
    if (!fid || !sheet || sheet.getLastRow() < 2) return { comments: [], canModerate: !!emp.isManager };
    const last = sheet.getLastRow();
    const start = Math.max(2, last - QA_COMMENTS_SCAN + 1);
    const rows = sheet.getRange(start, 1, last - start + 1, QA_COMMENTS_HEADERS.length).getValues();
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][QAC.FILE_ID] || '') !== fid) continue;
      if (String(rows[i][QAC.STATUS] || '').trim().toLowerCase() !== 'active') continue;
      out.push({
        commentId: String(rows[i][QAC.ID] || ''),
        empId: String(rows[i][QAC.EMP_ID] || ''),
        name: String(rows[i][QAC.EMP_NAME] || ''),
        atSec: Number(rows[i][QAC.AT_SEC]) || 0,
        text: String(rows[i][QAC.TEXT] || ''),
        createdMs: Number(rows[i][QAC.CREATED_MS]) || 0,
        mine: String(rows[i][QAC.EMP_ID] || '') === String(emp.id),
      });
    }
    out.sort(function (a, b) { return a.atSec - b.atSec; });
    return { comments: out, canModerate: !!emp.isManager };
  } catch (err) { return { error: err.message }; }
}
/** Add a timestamped comment. QA-gated (NOT merely employee — review notes
 *  are QA/HR-adjacent), locked, target-must-exist (a junk fileId cannot seed
 *  rows — the IntakeFeedback posture), over-cap REFUSES. The audit row is
 *  id-only: comment text may name a patient, so it stays in the QA store. */
function qaAddComment(fileId, atSec, text) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !canSeeQa_(emp)) return { success: false, error: 'QA access required.' };
    const fid = String(fileId || '').trim();
    if (!fid) return { success: false, error: 'Missing recording id.' };
    const at = Math.round(Number(atSec) * 10) / 10;
    if (!isFinite(at) || at < 0 || at > QA_COMMENT_MAX_AT_SEC) return { success: false, error: 'Bad timestamp.' };
    const t = String(text || '').trim();
    if (!t) return { success: false, error: 'Write a comment first.' };
    if (t.length > QA_COMMENT_MAX_CHARS) {
      return { success: false, error: 'Comments are capped at ' + QA_COMMENT_MAX_CHARS + ' characters (' + t.length + ') — trim it and post again.' };
    }
    const recSheet = getOrCreateQaRecordingsSheet_();
    if (!qaFindRecordingRow_(recSheet, fid)) return { success: false, error: 'Recording not found.' };
    const commentId = Utilities.getUuid();
    appendRowsTextSafe_(getOrCreateQaCommentsSheet_(), [[
      commentId, fid, emp.id, emp.name, at, t, Date.now(), 'active',   // AtSec/CreatedMs: NUMBER cells
    ]], QA_COMMENTS_TEXT_IDX);   // S2: Text is a '@' column — raw there, sheet-safe elsewhere
    writeAuditLog_(emp, 'QaCommentAdd', '', '', false, 0, 'fileId=' + fid + '; commentId=' + commentId, emp.email);
    return { success: true, commentId: commentId, atSec: at };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Soft-delete a comment — its AUTHOR or a manager (the kbDeleteComment
 *  shape: rows are never removed, Status flips to 'deleted'). */
function qaDeleteComment(commentId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !canSeeQa_(emp)) return { success: false, error: 'QA access required.' };
    const wanted = String(commentId || '').trim();
    if (!wanted) return { success: false, error: 'Missing comment id.' };
    const sheet = getQaSS_().getSheetByName(QA_COMMENTS_TAB);
    if (!sheet || sheet.getLastRow() < 2) return { success: false, error: 'Comment not found.' };
    const last = sheet.getLastRow();
    const start = Math.max(2, last - QA_COMMENTS_SCAN + 1);
    const ids = sheet.getRange(start, QAC.ID + 1, last - start + 1, 1).getValues();
    for (let i = ids.length - 1; i >= 0; i--) {
      if (String(ids[i][0] || '') !== wanted) continue;
      const rowIdx = start + i;
      const row = sheet.getRange(rowIdx, 1, 1, QA_COMMENTS_HEADERS.length).getValues()[0];
      if (String(row[QAC.STATUS] || '').trim().toLowerCase() !== 'active') return { success: true, already: true };
      if (String(row[QAC.EMP_ID] || '') !== String(emp.id) && !emp.isManager) {
        return { success: false, error: 'Only the comment\'s author or a manager can remove it.' };
      }
      sheet.getRange(rowIdx, QAC.STATUS + 1).setValue(sheetSafe_('deleted'));
      writeAuditLog_(emp, 'QaCommentDelete', '', '', false, 0, 'commentId=' + wanted, emp.email);
      return { success: true };
    }
    return { success: false, error: 'Comment not found.' };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

// ── QA Phase 2 — agent attribution, scorecards, per-agent stats ─────────────
/** PURE (Node-pinned) — lenient sanitize of the QA_SCORECARD_CRITERIA Script
 *  Property blob (the L-12 rule). [{key,label}]: key kebab 2-24 chars, label
 *  trimmed ≤60, deduped, cap 12; null (→ CONFIG seed) when nothing survives. */
function qaCriteriaSanitize_(arr) {
  if (!Array.isArray(arr)) return null;
  const out = [];
  const seen = {};
  for (let i = 0; i < arr.length && out.length < 12; i++) {
    const c = arr[i] || {};
    const key = String(c.key || '').trim().toLowerCase();
    if (!/^[a-z][a-z0-9-]{1,23}$/.test(key) || seen[key]) continue;
    const label = String(c.label || '').trim().substring(0, 60);
    if (!label) continue;
    const type = qaCritType_(c);
    const entry = { key: key, label: label };
    if (type === 'choice') {
      // A dropdown with fewer than two usable options cannot be answered —
      // the criterion is DROPPED (lenient read), never demoted to a scale
      // that would re-type its stored answers.
      const opts = qaChoiceOptionsSanitize_(c.options);
      if (opts.length < QA_CHOICE_OPTIONS_MIN) continue;
      entry.type = 'choice';
      entry.options = opts;
    } else if (type === 'check') {
      entry.type = 'check';
    }
    seen[key] = true;
    out.push(entry);
  }
  return out.length ? out : null;
}
/** The criterion's type — absent/unknown reads as `scale` (every pre-existing
 *  criterion), so a stored blob written before types existed is unchanged. */
function qaCritType_(c) {
  const t = String((c && c.type) || '').trim().toLowerCase();
  return QA_CRITERION_TYPES.indexOf(t) >= 0 ? t : 'scale';
}
/** PURE (Node-pinned) — a choice criterion's options: trimmed, ≤40 chars,
 *  deduped case-insensitively, capped, and NEVER a bare number (a numeric
 *  option text would parse as a 1–5 score inside the type-blind folds). */
function qaChoiceOptionsSanitize_(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = {};
  for (let i = 0; i < arr.length && out.length < QA_CHOICE_OPTIONS_MAX; i++) {
    const o = String(arr[i] == null ? '' : arr[i]).trim().substring(0, QA_CHOICE_OPTION_MAX_CHARS);
    if (!o || qaOptionIsNumeric_(o) || seen[o.toLowerCase()]) continue;
    seen[o.toLowerCase()] = true;
    out.push(o);
  }
  return out;
}
/** Would this dropdown option READ AS A SCORE downstream? (F5, 2026-09-09.)
 *  The guard must be as wide as the parse it protects, and it was not: the
 *  consumers (qaCardStats_, qaStatsAggregate_, qaCalibration_, the coverage
 *  join) all decide "is this a 1–5 score" with Number(v), which accepts three
 *  forms the old decimal regex refused — "4." → 4, "0x5" → 5, "1e0" → 1. An
 *  option so named would fold its answers into the QA scale averages that
 *  drive coverage avg, calibration means and the exemption thresholds
 *  (avg ≥ 4.5, minCriterion ≥ 4). isFinite(Number()) IS the consumers' own
 *  test, so the accept-set can no longer be narrower than the parse. NOTE the
 *  empty string is deliberately NOT numeric here — Number('') is 0, but a
 *  blank option is already dropped by the caller as falsy. */
function qaOptionIsNumeric_(o) {
  const t = String(o == null ? '' : o).trim();
  return t !== '' && isFinite(Number(t));
}
/** PURE (Node-pinned) — normalize ONE client-supplied rating against its
 *  criterion. Returns {value} (the canonical stored form) or {error}. scale →
 *  an integer 1–5; check → 'yes'/'no' (true/false/1/0/'y'/'n' accepted);
 *  choice → the option text, matched case-insensitively and stored in the
 *  criterion's own spelling. An answer the type cannot take is REFUSED by
 *  name, never coerced (the INV-96 refuse-not-drop posture). */
function qaRatingNormalize_(criterion, raw) {
  const type = qaCritType_(criterion);
  const label = String((criterion && criterion.label) || (criterion && criterion.key) || 'criterion');
  if (type === 'scale') {
    const v = parseInt(raw, 10);
    if (!(v >= 1 && v <= 5) || String(raw).trim() !== String(v)) return { error: 'Ratings must be 1–5 (' + label + ').' };
    return { value: v };
  }
  if (type === 'check') {
    const t = String(raw === true ? 'yes' : raw === false ? 'no' : raw == null ? '' : raw).trim().toLowerCase();
    if (t === 'yes' || t === 'true' || t === 'y' || t === '1') return { value: QA_CHECK_YES };
    if (t === 'no' || t === 'false' || t === 'n' || t === '0') return { value: QA_CHECK_NO };
    return { error: label + ' takes Yes or No.' };
  }
  const want = String(raw == null ? '' : raw).trim().toLowerCase();
  const opts = (criterion && criterion.options) || [];
  for (let i = 0; i < opts.length; i++) {
    if (String(opts[i]).trim().toLowerCase() === want) return { value: String(opts[i]) };
  }
  return { error: label + ' must be one of: ' + opts.join(', ') + '.' };
}
function getQaScorecardCriteria_() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('QA_SCORECARD_CRITERIA');
    if (raw) {
      const clean = qaCriteriaSanitize_(JSON.parse(raw));
      if (clean) return clean;
    }
  } catch (e) { /* corrupt property degrades to the seed */ }
  return QA_SCORECARD_CRITERIA;
}
/** Admin editor for the scorecard criteria (Script Property
 *  QA_SCORECARD_CRITERIA; the CONFIG QA_SCORECARD_CRITERIA list stays the
 *  seed). STRICT named-error save over the lenient sanitize-on-read (the
 *  saveBreakSchedules pattern) — a save this validator accepts always
 *  round-trips through qaCriteriaSanitize_ unchanged. Saving the exact seed
 *  DELETES the property (the umsTheme posture — back to CONFIG entirely).
 *  RENAMING a key orphans old ratings from that column (the stats fold and
 *  scorecards read by key), so the client warns and add/remove is the
 *  recommended edit. Admin tier (INV-136). */
function saveQaScorecardCriteria(list) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { success: false, error: 'Admin access required.' };
    if (!Array.isArray(list)) return { success: false, error: 'Expected a criteria list.' };
    if (!(list.length >= 1 && list.length <= 12)) {
      return { success: false, error: 'Between 1 and 12 criteria.' };
    }
    const clean = [];
    const seen = {};
    for (let i = 0; i < list.length; i++) {
      const c = list[i] || {};
      const key = String(c.key || '').trim().toLowerCase();
      if (!/^[a-z][a-z0-9-]{1,23}$/.test(key)) {
        return { success: false, error: 'Not a valid criterion key: "' + String(c.key || '') +
          '" — lowercase letters/digits/hyphens, 2–24 chars, starting with a letter.' };
      }
      if (seen[key]) return { success: false, error: 'Duplicate criterion key: "' + key + '".' };
      const label = String(c.label || '').trim();
      if (!label) return { success: false, error: 'Criterion "' + key + '" needs a label.' };
      if (label.length > 60) return { success: false, error: 'Label for "' + key + '" is over 60 characters.' };
      const typeRaw = String(c.type || 'scale').trim().toLowerCase();
      if (QA_CRITERION_TYPES.indexOf(typeRaw) < 0) {
        return { success: false, error: 'Unknown type "' + String(c.type) + '" for "' + key + '" — scale, check or choice.' };
      }
      const entry = { key: key, label: label };
      if (typeRaw === 'choice') {
        const rawOpts = Array.isArray(c.options) ? c.options : String(c.options || '').split(',');
        const trimmed = rawOpts.map(function (o) { return String(o == null ? '' : o).trim(); }).filter(Boolean);
        for (let j = 0; j < trimmed.length; j++) {
          if (trimmed[j].length > QA_CHOICE_OPTION_MAX_CHARS) return { success: false, error: 'Option "' + trimmed[j].substring(0, 20) + '…" for "' + key + '" is over ' + QA_CHOICE_OPTION_MAX_CHARS + ' characters.' };
          if (qaOptionIsNumeric_(trimmed[j])) return { success: false, error: 'Option "' + trimmed[j] + '" for "' + key + '" is a bare number — dropdown options must be words, so an answer never reads as a 1–5 score.' };
        }
        const opts = qaChoiceOptionsSanitize_(trimmed);
        if (opts.length !== trimmed.length) return { success: false, error: 'Duplicate option in "' + key + '".' };
        if (opts.length < QA_CHOICE_OPTIONS_MIN || opts.length > QA_CHOICE_OPTIONS_MAX) {
          return { success: false, error: 'Dropdown "' + key + '" needs ' + QA_CHOICE_OPTIONS_MIN + '–' + QA_CHOICE_OPTIONS_MAX + ' options (comma-separated).' };
        }
        entry.type = 'choice';
        entry.options = opts;
      } else if (typeRaw === 'check') {
        entry.type = 'check';
      }
      seen[key] = true;
      clean.push(entry);
    }
    const props = PropertiesService.getScriptProperties();
    if (JSON.stringify(clean) === JSON.stringify(QA_SCORECARD_CRITERIA)) {
      props.deleteProperty('QA_SCORECARD_CRITERIA');   // back to the CONFIG seed entirely
    } else {
      propSetBounded_('QA_SCORECARD_CRITERIA', JSON.stringify(clean), { hint: 'remove a criterion or shorten its options' });
    }
    writeAuditLog_(emp, 'AdminConfigChange', '', '', false, 0,
      'qaScorecardCriteria; count=' + clean.length, emp.email);
    return { success: true, qaCriteria: { live: getQaScorecardCriteria_(), seed: QA_SCORECARD_CRITERIA } };
  } catch (err) { return { success: false, error: err.message }; }
}
/** Is the QA store configured? (Script Property QA_SS_ID, or the test
 *  override.) Consulted by the retention purge + its liveness check so an
 *  enabled window with NO store never runs — or nags (INV-186). */
function qaStoreConfigured_() {
  if (typeof _TEST_OVERRIDE_QA_SS_ID !== 'undefined' && _TEST_OVERRIDE_QA_SS_ID) return true;
  try { return !!(PropertiesService.getScriptProperties().getProperty('QA_SS_ID')); }
  catch (e) { return false; }
}
/** QA review-record retention window: Script Property QA_REVIEW_RETENTION_DAYS
 *  first, else CONFIG.QA_REVIEW_RETENTION_DAYS. 0/neg/unparseable → 0
 *  (disabled — the getNoteRetentionDays_ shape). */
function qaReviewRetentionDays_() {
  const prop = PropertiesService.getScriptProperties().getProperty('QA_REVIEW_RETENTION_DAYS');
  const raw = (prop != null && prop !== '') ? prop : (CONFIG.QA_REVIEW_RETENTION_DAYS || 0);
  const v = parseInt(raw, 10);
  return (isNaN(v) || v < 0) ? 0 : v;
}
/** QA review-record retention purge (Phase-3 follow-on, 2026-08-28 —
 *  default OFF). Irreversibly deletes QaComments + QaScorecards rows older
 *  than the window; the QaRecordings INDEX and the Drive audio files are
 *  NEVER touched (the operator manages recordings in Drive). ms NUMBER
 *  cells, so no date coercion; a 0/garbage CreatedMs is never deleted
 *  (fail-safe — the unparseable-date rule). Top-level trigger target →
 *  reachable via google.script.run, so INV-44-gated; locked (INV-01);
 *  counts-only audit EVERY enabled run (the job-liveness heartbeat,
 *  INV-161). Read-only w.r.t. tab existence — never provisions. */
function purgeOldQaReviews() {
  assertManagerCaller_('purgeOldQaReviews');
  try {
    const days = qaReviewRetentionDays_();
    if (!days) {
      Logger.log('purgeOldQaReviews: retention disabled (QA_REVIEW_RETENTION_DAYS=0) — nothing purged.');
      return;
    }
    if (!qaStoreConfigured_()) {
      Logger.log('purgeOldQaReviews: QA_SS_ID not set — nothing to purge.');
      return;
    }
    const cutoffMs = Date.now() - days * 86400000;
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    let comments = 0, scorecards = 0;
    try {
      const ss = getQaSS_();
      [[QA_COMMENTS_TAB, QAC.CREATED_MS, function (n) { comments = n; }],
       [QA_SCORECARDS_TAB, QSC.CREATED_MS, function (n) { scorecards = n; }]].forEach(function (t) {
        const sheet = ss.getSheetByName(t[0]);
        if (!sheet || sheet.getLastRow() < 2) return;
        const col = sheet.getRange(2, t[1] + 1, sheet.getLastRow() - 1, 1).getValues();
        let removed = 0;
        for (let i = col.length - 1; i >= 0; i--) {   // bottom-up so indices hold
          const ms = Number(col[i][0]) || 0;
          if (ms > 0 && ms < cutoffMs) { sheet.deleteRow(i + 2); removed++; }
        }
        t[2](removed);
      });
    } finally {
      lock.releaseLock();
    }
    writeAuditLog_(_SYSTEM_AUDIT_EMP_, 'QaReviewPurge', '', '', false, 0,
      `retentionDays=${days}; commentsRemoved=${comments}; scorecardsRemoved=${scorecards}`);
    Logger.log(`purgeOldQaReviews: removed ${comments} comment(s) + ${scorecards} scorecard(s) older than ${days} day(s).`);
  } catch (err) {
    Logger.log('purgeOldQaReviews failed: ' + err.message);
  }
}
/** Set which AGENT a recording belongs to (feeds the per-agent stats). Free
 *  text bounded ≤80 chars — roster names ride the queue payload as a datalist,
 *  but an EX-agent's recording must stay attributable, so this is not
 *  roster-validated. An empty name CLEARS the attribution. QA-gated, locked.
 *  The audit row is id-only: the agent NAME stays in the QA store, the same
 *  INV-32/196 rule as recording file names. */
function qaSetRecordingAgent(fileId, agentName) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !canSeeQa_(emp)) return { success: false, error: 'QA access required.' };
    const fid = String(fileId || '').trim();
    const name = String(agentName || '').trim().substring(0, 80);
    const sheet = getOrCreateQaRecordingsSheet_();
    const found = qaFindRecordingRow_(sheet, fid);
    if (!found) return { success: false, error: 'Recording not found.' };
    // F-16 (2026-09-18): the roster id is resolved AT WRITE and stored beside
    // the name, so the agent-facing reads scope by id ('' when the name is
    // blank, off-roster, or shared by two roster rows — an ambiguous name
    // releases to nobody rather than to both).
    const agentId = qaRosterIdByName_(name);
    // S5 (cycle 22): a share is a release TO an agent. Re-attributing a shared
    // review used to hand it to the NEW agent, and clearing the agent left it
    // "shared with nobody" — a state qaSetRecordingShared itself refuses to
    // create. A changed agent withdraws the share; re-sharing is deliberate.
    const prevAgent = String(found.row[QAR.AGENT] || '').trim();
    const unshare = qaAgentChangeUnshares_(prevAgent, name, found.row[QAR.SHARED_MS]);
    sheet.getRange(found.rowIdx, QAR.AGENT + 1, 1, 1).setNumberFormat('@').setValue(sheetText_(name));   // S2: a '@' column
    sheet.getRange(found.rowIdx, QAR.AGENT_ID + 1, 1, 1).setNumberFormat('@').setValue(sheetText_(agentId));
    if (unshare) sheet.getRange(found.rowIdx, QAR.SHARED_MS + 1).setValue(sheetSafe_(0));
    writeAuditLog_(emp, 'QaAgentSet', '', '', false, 0, 'fileId=' + fid + (name ? '' : '; cleared') + (unshare ? '; unshared' : ''), emp.email);
    // Q7 — the roster id the coaching hand-off keys off (the name itself
    // never leaves the QA store's return; the id is what the composer needs).
    return { success: true, agent: name, agentEmpId: agentId, unshared: unshare };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** PURE (S5, cycle 22) — does setting the agent from `prev` to `next`
 *  withdraw a live share? Only when the recording IS shared and the agent
 *  actually changes (case-insensitive) — re-saving the same name keeps it. */
function qaAgentChangeUnshares_(prev, next, sharedMs) {
  if (!(Number(sharedMs) > 0)) return false;
  return String(prev || '').trim().toLowerCase() !== String(next || '').trim().toLowerCase();
}
/** Save a structured scorecard for a recording. QA-gated, locked,
 *  target-must-exist (the qaAddComment posture). Ratings are validated
 *  against the CURRENT criteria and an UNKNOWN key is REJECTED by name, not
 *  whitelist-dropped — a review record with silently missing ratings would
 *  misrepresent the review (the INV-96 refuse-not-drop posture); the client
 *  reloads and re-scores. Append-only: latest per (recording, reviewer) wins
 *  everywhere it is read (qaLatestScorecards_). Audit row is id-only. */
function qaSaveScorecard(fileId, ratings, notes) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !canSeeQa_(emp)) return { success: false, error: 'QA access required.' };
    const fid = String(fileId || '').trim();
    if (!fid) return { success: false, error: 'Missing recording id.' };
    if (!ratings || typeof ratings !== 'object' || Array.isArray(ratings)) {
      return { success: false, error: 'Expected a ratings map.' };
    }
    const criteria = getQaScorecardCriteria_();
    const known = {};
    criteria.forEach(function (c) { known[c.key] = c; });
    const clean = {};
    let count = 0;
    const keys = Object.keys(ratings);
    for (let i = 0; i < keys.length; i++) {
      const k = String(keys[i]).trim().toLowerCase();
      if (!known[k]) return { success: false, error: 'Scorecard criteria changed since this page loaded — reload and score again.' };
      // Per TYPE (scale 1–5 / check yes-no / choice option) — a non-scale
      // answer is stored NON-NUMERIC so every numeric fold stays type-blind.
      const norm = qaRatingNormalize_(known[k], ratings[keys[i]]);
      if (norm.error) return { success: false, error: norm.error };
      clean[k] = norm.value; count++;
    }
    if (!count) return { success: false, error: 'Rate at least one criterion.' };
    const t = String(notes || '').trim();
    if (t.length > QA_SCORECARD_NOTES_MAX) {
      return { success: false, error: 'Notes are capped at ' + QA_SCORECARD_NOTES_MAX + ' characters (' + t.length + ') — trim them and save again.' };
    }
    const recSheet = getOrCreateQaRecordingsSheet_();
    if (!qaFindRecordingRow_(recSheet, fid)) return { success: false, error: 'Recording not found.' };
    const scorecardId = Utilities.getUuid();
    appendRowsTextSafe_(getOrCreateQaScorecardsSheet_(), [[
      scorecardId, fid, emp.id, emp.name, JSON.stringify(clean), t, Date.now(),
    ]], QA_SCORECARDS_TEXT_IDX);   // S2: Notes is a '@' column
    writeAuditLog_(emp, 'QaScorecardSave', '', '', false, 0, 'fileId=' + fid + '; scorecardId=' + scorecardId, emp.email);
    return { success: true, scorecardId: scorecardId };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Bounded tail read of QaScorecards (all, or one recording's), parsed
 *  defensively — a corrupt RatingsJson row is skipped, never a broken read. */
function qaReadScorecards_(fid) {
  const sheet = getQaSS_().getSheetByName(QA_SCORECARDS_TAB);
  if (!sheet || sheet.getLastRow() < 2) return { cards: [], truncated: false };
  const last = sheet.getLastRow();
  const start = Math.max(2, last - QA_SCORECARDS_SCAN + 1);
  const rows = sheet.getRange(start, 1, last - start + 1, QA_SCORECARDS_HEADERS.length).getValues();
  const cards = [];
  for (let i = 0; i < rows.length; i++) {
    if (fid && String(rows[i][QSC.FILE_ID] || '') !== fid) continue;
    let ratings = null;
    try { ratings = JSON.parse(String(rows[i][QSC.RATINGS] || '')); } catch (e) { ratings = null; }
    if (!ratings || typeof ratings !== 'object' || Array.isArray(ratings)) continue;
    cards.push({
      scorecardId: String(rows[i][QSC.ID] || ''),
      fileId: String(rows[i][QSC.FILE_ID] || ''),
      empId: String(rows[i][QSC.EMP_ID] || ''),
      name: String(rows[i][QSC.EMP_NAME] || ''),
      ratings: ratings,
      notes: String(rows[i][QSC.NOTES] || ''),
      createdMs: Number(rows[i][QSC.CREATED_MS]) || 0,
    });
  }
  return { cards: cards, truncated: start > 2 };
}
/** PURE (Node-pinned) — latest scorecard per (recording, reviewer). Iterate
 *  in sheet (append) order: a createdMs tie keeps the LATER row. */
function qaLatestScorecards_(cards) {
  const latest = {};
  for (let i = 0; i < (cards || []).length; i++) {
    const c = cards[i] || {};
    const k = String(c.fileId || '') + '|' + String(c.empId || '');
    if (!latest[k] || Number(c.createdMs || 0) >= Number(latest[k].createdMs || 0)) latest[k] = c;
  }
  return Object.keys(latest).map(function (k) { return latest[k]; });
}
/** A recording's scorecards (latest per reviewer, newest first) + the live
 *  criteria, for the detail's scorecard card. QA-gated, read-only. */
function qaListScorecards(fileId) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !canSeeQa_(emp)) return { error: 'QA access required.' };
    const fid = String(fileId || '').trim();
    if (!fid) return { error: 'Missing recording id.' };
    const read = qaReadScorecards_(fid);
    const cards = qaLatestScorecards_(read.cards);
    cards.sort(function (a, b) { return b.createdMs - a.createdMs; });
    return { scorecards: cards, criteria: getQaScorecardCriteria_(), selfEmpId: String(emp.id) };
  } catch (err) { return { error: err.message }; }
}
/** PURE (Node-pinned) — the per-agent stats fold. recs: [{fileId, agent,
 *  status}]; cards: LATEST-folded [{fileId, ratings}]; criteria: the live
 *  set. A blank agent buckets under '(unassigned)' — visible, never dropped
 *  (INV-169 spirit); a card whose recording is not in the indexed set is
 *  SKIPPED (an agent is never invented); a criterion with no ratings reads
 *  null, never a confident 0 (INV-187). avgScore = mean of each card's own
 *  mean, so a card scored on 3 criteria weighs the same as one scored on 5.
 *  Ratings under keys the criteria no longer carry still count toward the
 *  card's own mean (the review happened) but land in no column. */
function qaStatsAggregate_(recs, cards, criteria) {
  const byAgent = {};
  const agentOf = {};
  const mk = function (a) {
    if (!byAgent[a]) {
      const pc = {};
      (criteria || []).forEach(function (c) { pc[c.key] = { sum: 0, n: 0 }; });
      byAgent[a] = { agent: a, recordings: 0, reviewed: 0, scorecards: 0, _scoreSum: 0, _pc: pc };
    }
    return byAgent[a];
  };
  (recs || []).forEach(function (r) {
    const a = String((r && r.agent) || '').trim() || '(unassigned)';
    agentOf[String((r && r.fileId) || '')] = a;
    const b = mk(a);
    b.recordings++;
    if (String((r && r.status) || '') === 'done') b.reviewed++;
  });
  (cards || []).forEach(function (c) {
    const a = agentOf[String((c && c.fileId) || '')];
    if (!a) return;
    const b = mk(a);
    let sum = 0, n = 0;
    Object.keys((c && c.ratings) || {}).forEach(function (k) {
      const v = Number(c.ratings[k]);
      if (!(v >= 1 && v <= 5)) return;
      if (b._pc[k]) { b._pc[k].sum += v; b._pc[k].n++; }
      sum += v; n++;
    });
    if (!n) return;
    b.scorecards++;
    b._scoreSum += sum / n;
  });
  return Object.keys(byAgent).map(function (a) {
    const b = byAgent[a];
    const perCriterion = {};
    Object.keys(b._pc).forEach(function (k) {
      perCriterion[k] = b._pc[k].n ? Math.round((b._pc[k].sum / b._pc[k].n) * 10) / 10 : null;
    });
    return {
      agent: b.agent, recordings: b.recordings, reviewed: b.reviewed,
      scorecards: b.scorecards,
      avgScore: b.scorecards ? Math.round((b._scoreSum / b.scorecards) * 10) / 10 : null,
      perCriterion: perCriterion,
    };
  }).sort(function (x, y) { return y.recordings - x.recordings || (x.agent > y.agent ? 1 : -1); });
}
/** Per-agent QA stats (the qaStats tab). QA-gated, read-only, bounded both
 *  reads with truncation REPORTED (INV-169). */
function getQaStats() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !canSeeQa_(emp)) return { error: 'QA access required.' };
    let storeSet = true;
    try { storeSet = !!(PropertiesService.getScriptProperties().getProperty('QA_SS_ID')); } catch (e) {}
    if (typeof _TEST_OVERRIDE_QA_SS_ID !== 'undefined' && _TEST_OVERRIDE_QA_SS_ID) storeSet = true;
    const criteria = getQaScorecardCriteria_();
    if (!storeSet) return { notConfigured: true, agents: [], criteria: criteria };
    const recSheet = getOrCreateQaRecordingsSheet_();
    const recs = [];
    let recTruncated = false;
    const last = recSheet.getLastRow();
    if (last >= 2) {
      const start = Math.max(2, last - QA_LIST_SCAN + 1);
      recTruncated = start > 2;
      const rows = recSheet.getRange(start, 1, last - start + 1, QA_RECORDINGS_HEADERS.length).getValues();
      for (let i = 0; i < rows.length; i++) {
        const fid = String(rows[i][QAR.FILE_ID] || '').trim();
        if (!fid) continue;
        recs.push({ fileId: fid, name: String(rows[i][QAR.NAME] || ''),
                    agent: String(rows[i][QAR.AGENT] || '').trim(), status: qaStatus_(rows[i][QAR.STATUS]) });
      }
    }
    const read = qaReadScorecards_(null);
    const latest = qaLatestScorecards_(read.cards);
    // Phase 3 — calibration: recordings scored by 2+ reviewers, widest
    // overall spread first (facts only; the reader judges). Names joined
    // here so the pure fold stays name-free.
    const nameOf = {};
    recs.forEach(function (r) { nameOf[r.fileId] = r.name; });
    const calibration = qaCalibration_(latest, criteria).map(function (row) {
      row.name = nameOf[row.fileId] || '';
      return row;
    });
    return {
      agents: qaStatsAggregate_(recs, latest, criteria),
      criteria: criteria,
      calibration: calibration,
      totalRecordings: recs.length,
      totalScorecards: latest.length,
      truncated: recTruncated || read.truncated,
    };
  } catch (err) { return { error: err.message }; }
}

// ── QA Log (operator 2026-09-04) ─────────────────────────────────────────────
// "One entry per call recording audited" — which is exactly what a scorecard
// row already IS. The Log is therefore a reviewer-centred READ over the same
// QaScorecards store (latest card per recording+reviewer, newest first), never
// a second table; the one addition is the recording-less audit below.
/** Is this FileId a recording-less (manual) audit's synthetic id? Such ids are
 *  minted here, never by Drive, so the audio boundary refuses them by
 *  construction (folder parentage fails) and the client skips the player. */
function qaIsManualId_(fid) { return String(fid || '').indexOf(QA_MANUAL_ID_PREFIX) === 0; }
/** The recording-less FALLBACK (operator: audits happen with a recording
 *  attached, for posterity, but the fallback must exist). Appends a
 *  QaRecordings row with a synthetic `manual-<uuid>` FileId, mime `manual`,
 *  status in_review assigned to the CALLER, so every downstream read — the
 *  scorecard, the coverage join, the stats fold, the Log — treats it as a
 *  reviewed recording. QA-gated, locked, audit row id-only (the label may
 *  name the caller/agent; it stays in the QA store — INV-32/196). */
function qaCreateManualRecording(agentName, label) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !canSeeQa_(emp)) return { success: false, error: 'QA access required.' };
    const name = String(label || '').trim();
    if (!name) return { success: false, error: 'Give the audit a label (e.g. the call date and caller).' };
    if (name.length > QA_MANUAL_LABEL_MAX) return { success: false, error: 'Label is capped at ' + QA_MANUAL_LABEL_MAX + ' characters.' };
    const agent = String(agentName || '').trim().substring(0, 80);
    const fid = QA_MANUAL_ID_PREFIX + Utilities.getUuid();
    const now = Date.now();
    appendRowsTextSafe_(getOrCreateQaRecordingsSheet_(), [[
      fid, name, 0, 'manual', now, now, 'in_review', String(emp.email || '').trim().toLowerCase(), now, '', agent, 0, 0, '',
    ]], QA_RECORDINGS_TEXT_IDX);   // S2: FileId/Name/Agent are '@' columns
    writeAuditLog_(emp, 'QaManualRecording', '', '', false, 0, 'fileId=' + fid, emp.email);
    return { success: true, fileId: fid };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** PURE (Node-pinned) — the Log fold. latestCards: LATEST-per-(recording,
 *  reviewer) cards; recs: {fileId → recording meta}; commentCounts: {fileId|
 *  empId → active comment count}; reviewerEmpId: '' = every reviewer; from/to
 *  = yyyy-MM-dd bounds (inclusive) compared against the card's day (a
 *  manager-tz yyyy-MM-dd the caller supplies per card via dayOf). Returns
 *  entries newest-first. A card whose recording is NOT indexed still lists
 *  (the audit happened — INV-187), with the recording fields blank. */
function qaLogEntries_(latestCards, recs, commentCounts, reviewerEmpId, from, to, dayOf) {
  const out = [];
  (latestCards || []).forEach(function (c) {
    if (!c) return;
    if (reviewerEmpId && String(c.empId) !== String(reviewerEmpId)) return;
    const day = dayOf(Number(c.createdMs) || 0);
    if (!day || day < from || day > to) return;
    const r = (recs && recs[c.fileId]) || null;
    const st = qaCardStats_(c);
    out.push({
      scorecardId: String(c.scorecardId || ''),
      fileId: String(c.fileId || ''),
      recordingName: r ? String(r.name || '') : '',
      agent: r ? String(r.agent || '') : '',
      agentEmpId: r ? String(r.agentEmpId || '') : '',
      recordingStatus: r ? String(r.status || '') : '',
      recordingCreatedMs: r ? Number(r.createdMs) || 0 : 0,
      manual: qaIsManualId_(c.fileId),
      indexed: !!r,
      reviewerEmpId: String(c.empId || ''),
      reviewerName: String(c.name || ''),
      createdMs: Number(c.createdMs) || 0,
      day: day,
      ratings: c.ratings || {},
      notes: String(c.notes || ''),
      avg: st ? Math.round(st.avg * 10) / 10 : null,
      comments: (commentCounts && commentCounts[String(c.fileId) + '|' + String(c.empId)]) || 0,
    });
  });
  out.sort(function (a, b) { return b.createdMs - a.createdMs; });
  return out;
}
/** The QA Log read. QA-gated; a NON-manager is scoped to their OWN entries
 *  whatever `reviewer` says (managers see every reviewer's log — operator
 *  decision); dates yyyy-MM-dd, span capped, default the trailing 30 days in
 *  the manager tz. One bounded read each of recordings / scorecards /
 *  comments; payload capped with the pre-slice total (INV-169). Also ships
 *  the caller's OPEN assignments (the "Log an audit" picker) and the roster
 *  names (the manual entry's agent datalist). */
function getQaLog(opts) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !canSeeQa_(emp)) return { error: 'QA access required.' };
    opts = (opts && typeof opts === 'object') ? opts : {};
    const tz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
    const todayYmd = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    const dayRe = /^\d{4}-\d{2}-\d{2}$/;
    let to = dayRe.test(String(opts.to || '')) ? String(opts.to) : todayYmd;
    let from = dayRe.test(String(opts.from || '')) ? String(opts.from) : qaMsToYmd_(qaYmdMs_(to, tz) - (QA_LOG_DEFAULT_DAYS - 1) * 86400000);
    if (from > to) { const t = from; from = to; to = t; }
    const spanDays = Math.round((qaYmdMs_(to, tz) - qaYmdMs_(from, tz)) / 86400000) + 1;
    if (!(spanDays >= 1) || spanDays > QA_LOG_MAX_SPAN_DAYS) {
      return { error: 'The log range is at most ' + QA_LOG_MAX_SPAN_DAYS + ' days.' };
    }
    // Scope: a non-manager sees ONLY their own log, whatever they asked for.
    const wantAll = String(opts.reviewer || '') === '*';
    let reviewerEmpId = String(emp.id);
    if (emp.isManager) reviewerEmpId = wantAll ? '' : (String(opts.reviewer || '').trim() || String(emp.id));
    let storeSet = true;
    try { storeSet = !!(PropertiesService.getScriptProperties().getProperty('QA_SS_ID')); } catch (e) {}
    if (typeof _TEST_OVERRIDE_QA_SS_ID !== 'undefined' && _TEST_OVERRIDE_QA_SS_ID) storeSet = true;
    const base = {
      self: String(emp.id), selfName: String(emp.name || ''), isManager: !!emp.isManager,
      reviewer: reviewerEmpId, from: from, to: to, todayYmd: todayYmd,
      criteria: getQaScorecardCriteria_(), agentOptions: [],
      entries: [], total: 0, cap: QA_LOG_CAP, reviewers: [], pending: [], truncated: false,
    };
    try {
      const rrows = getEmployeeRosterRows_();
      for (let i = 1; i < rrows.length; i++) {
        if (!empRosterEmail_(rrows[i])) continue;   // INV-183
        const nm = String(rrows[i][EMP.NAME] || '').trim();
        if (nm && base.agentOptions.indexOf(nm) < 0) base.agentOptions.push(nm);
      }
      base.agentOptions.sort();
    } catch (e) { /* best-effort — the log still renders */ }
    if (!storeSet) { base.notConfigured = true; return base; }
    // Recordings (bounded tail) → meta by FileId + the caller's open assignments.
    const recs = {};
    const recSheet = getOrCreateQaRecordingsSheet_();
    const last = recSheet.getLastRow();
    const selfEmail = String(emp.email || '').trim().toLowerCase();
    let rosterIdByName = {};
    try {
      const rrows2 = getEmployeeRosterRows_();
      for (let i = 1; i < rrows2.length; i++) {
        if (!empRosterEmail_(rrows2[i])) continue;
        const nm = String(rrows2[i][EMP.NAME] || '').trim().toLowerCase();
        if (nm && !rosterIdByName[nm]) rosterIdByName[nm] = String(rrows2[i][EMP.ID] || '').trim();
      }
    } catch (e) { rosterIdByName = {}; }
    if (last >= 2) {
      const start = Math.max(2, last - QA_LIST_SCAN + 1);
      base.truncated = start > 2;
      const rows = recSheet.getRange(start, 1, last - start + 1, QA_RECORDINGS_HEADERS.length).getValues();
      for (let i = 0; i < rows.length; i++) {
        const fid = String(rows[i][QAR.FILE_ID] || '').trim();
        if (!fid) continue;
        const agent = String(rows[i][QAR.AGENT] || '').trim();
        const status = qaStatus_(rows[i][QAR.STATUS]);
        recs[fid] = { name: String(rows[i][QAR.NAME] || ''), agent: agent,
                      agentEmpId: agent ? (rosterIdByName[agent.toLowerCase()] || '') : '',
                      status: status, createdMs: Number(rows[i][QAR.CREATED_MS]) || 0 };
        if ((status === 'new' || status === 'in_review') &&
            String(rows[i][QAR.ASSIGNEE] || '').trim().toLowerCase() === selfEmail && base.pending.length < QA_LOG_PENDING_CAP) {
          base.pending.push({ fileId: fid, name: recs[fid].name, agent: agent, status: status, manual: qaIsManualId_(fid) });
        }
      }
    }
    const read = qaReadScorecards_(null);
    base.truncated = base.truncated || read.truncated;
    const latest = qaLatestScorecards_(read.cards);
    // Reviewer picker (managers): every reviewer with a card, plus the caller.
    const seenRev = {};
    latest.forEach(function (c) {
      const id = String(c.empId || '');
      if (!id || seenRev[id]) return;
      seenRev[id] = true;
      base.reviewers.push({ empId: id, name: String(c.name || '') });
    });
    if (!seenRev[String(emp.id)]) base.reviewers.push({ empId: String(emp.id), name: String(emp.name || '') });
    base.reviewers.sort(function (a, b) { return a.name.localeCompare(b.name); });
    // Active comment counts per (recording, reviewer) — decoration; a failed
    // read leaves them at 0 rather than failing the log.
    const commentCounts = {};
    try {
      const cs = getQaSS_().getSheetByName(QA_COMMENTS_TAB);
      if (cs && cs.getLastRow() >= 2) {
        const cLast = cs.getLastRow();
        const cStart = Math.max(2, cLast - QA_COMMENTS_SCAN + 1);
        const cRows = cs.getRange(cStart, 1, cLast - cStart + 1, QA_COMMENTS_HEADERS.length).getValues();
        for (let i = 0; i < cRows.length; i++) {
          if (String(cRows[i][QAC.STATUS] || '').trim().toLowerCase() !== 'active') continue;
          const k = String(cRows[i][QAC.FILE_ID] || '') + '|' + String(cRows[i][QAC.EMP_ID] || '');
          commentCounts[k] = (commentCounts[k] || 0) + 1;
        }
      }
    } catch (e) { /* counts are decoration */ }
    const entries = qaLogEntries_(latest, recs, commentCounts, reviewerEmpId, from, to, function (ms) { return qaMsToYmd_(ms); });
    base.entries = entries.slice(0, QA_LOG_CAP);
    base.total = entries.length;
    return base;
  } catch (err) { return { error: err.message }; }
}
/** Midnight (manager tz) of a yyyy-MM-dd as epoch ms — the day arithmetic
 *  the log's range uses; parsed in the tz the days are labelled in. */
function qaYmdMs_(ymd, tz) {
  return Utilities.parseDate(ymd + ' 00:00:00', tz, 'yyyy-MM-dd HH:mm:ss').getTime();
}

// ── QA Phase 3 — sampling, calibration, agent-facing reviews ────────────────
// The v1 "agents do not see their reviews" gate is REVISED here by operator
// order (the Phase-3 scope): agents get a READ-ONLY "My Reviews" tab showing
// ONLY recordings that are (a) attributed to THEIR name AND (b) EXPLICITLY
// shared by a reviewer — sharing is a deliberate per-recording release action
// (the EmpDocs draft→release posture: a status flip never silently publishes
// coaching content). Reviewers/managers keep the full canSeeQa_ tier; the
// agent-facing read is employee-gated + name-scoped + shared-gated.
/** Share (or unshare) a recording's review with its attributed agent — THE
 *  release action. QA-gated, locked. Sharing requires a non-blank Agent
 *  attribution first (the agent-facing read matches by name; sharing an
 *  unattributed recording would release it to nobody while READING as
 *  shared). Audit row is id-only (INV-32/196). */
function qaSetRecordingShared(fileId, shared) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !canSeeQa_(emp)) return { success: false, error: 'QA access required.' };
    const fid = String(fileId || '').trim();
    const sheet = getOrCreateQaRecordingsSheet_();
    const found = qaFindRecordingRow_(sheet, fid);
    if (!found) return { success: false, error: 'Recording not found.' };
    const on = !!shared;
    if (on && !String(found.row[QAR.AGENT] || '').trim()) {
      return { success: false, error: 'Attribute this recording to its agent first — sharing releases the review to that agent\'s My Reviews tab.' };
    }
    const ms = on ? Date.now() : 0;
    sheet.getRange(found.rowIdx, QAR.SHARED_MS + 1).setValue(sheetSafe_(ms));
    writeAuditLog_(emp, 'QaShare', '', '', false, 0, 'fileId=' + fid + '; shared=' + on, emp.email);
    return { success: true, sharedMs: ms };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** The agent-facing read — EMPLOYEE-gated (deliberately NOT canSeeQa_: this
 *  is the Phase-3 gate change), READ-ONLY, and doubly scoped: a row is
 *  returned ONLY when SharedMs is set AND the Agent attribution matches the
 *  CALLER's roster name (trimmed, case-insensitive) — an agent can never see
 *  another agent's reviews, and an unshared review is invisible even to its
 *  own agent. Attaches the latest scorecard per reviewer + ACTIVE comments
 *  (reviewer names shown deliberately — the coaching-module posture). An
 *  unset QA_SS_ID reads as an EMPTY list (agents get no setup instructions).
 *  No audio path — playback stays behind the canSeeQa_ Drive boundary. */
function getMyQaReviews() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    let storeSet = false;
    try { storeSet = !!(PropertiesService.getScriptProperties().getProperty('QA_SS_ID')); } catch (e) {}
    if (typeof _TEST_OVERRIDE_QA_SS_ID !== 'undefined' && _TEST_OVERRIDE_QA_SS_ID) storeSet = true;
    const myName = String(emp.name || '').trim().toLowerCase();
    if (!storeSet || !myName) return { recordings: [], criteria: getQaScorecardCriteria_() };
    const sheet = getQaSS_().getSheetByName(QA_RECORDINGS_TAB);   // read-only — never provisions
    const mine = [];
    const nameUnique = qaMyNameUnique_(emp);   // F-16: the legacy name match needs a unique name
    if (sheet && sheet.getLastRow() >= 2) {
      const last = sheet.getLastRow();
      const start = Math.max(2, last - QA_LIST_SCAN + 1);
      const rows = sheet.getRange(start, 1, last - start + 1, QA_RECORDINGS_HEADERS.length).getValues();
      for (let i = 0; i < rows.length; i++) {
        const fid = String(rows[i][QAR.FILE_ID] || '').trim();
        if (!fid) continue;
        if (!(Number(rows[i][QAR.SHARED_MS]) > 0)) continue;                                   // shared-gated
        if (!qaRowIsMine_(rows[i], emp, nameUnique)) continue;                                  // id-scoped (F-16)
        mine.push({
          fileId: fid,
          name: String(rows[i][QAR.NAME] || ''),
          createdMs: Number(rows[i][QAR.CREATED_MS]) || 0,
          sharedMs: Number(rows[i][QAR.SHARED_MS]) || 0,
          manual: qaIsManualId_(fid),
          scorecards: [], comments: [],
        });
      }
    }
    mine.sort(function (a, b) { return b.sharedMs - a.sharedMs; });
    if (mine.length > QA_MY_REVIEWS_CAP) mine.length = QA_MY_REVIEWS_CAP;
    if (mine.length) {
      const wanted = {};
      mine.forEach(function (r) { wanted[r.fileId] = r; });
      // ONE bounded pass each over scorecards + comments for all my rows.
      const latest = qaLatestScorecards_(qaReadScorecards_(null).cards);
      latest.sort(function (a, b) { return b.createdMs - a.createdMs; });
      latest.forEach(function (c) {
        const r = wanted[c.fileId];
        if (r) r.scorecards.push({ name: c.name, ratings: c.ratings, notes: c.notes, createdMs: c.createdMs });
      });
      try {
        const cs = getQaSS_().getSheetByName(QA_COMMENTS_TAB);
        if (cs && cs.getLastRow() >= 2) {
          const cLast = cs.getLastRow();
          const cStart = Math.max(2, cLast - QA_COMMENTS_SCAN + 1);
          const cRows = cs.getRange(cStart, 1, cLast - cStart + 1, QA_COMMENTS_HEADERS.length).getValues();
          for (let i = 0; i < cRows.length; i++) {
            if (String(cRows[i][QAC.STATUS] || '').trim().toLowerCase() !== 'active') continue;
            const r = wanted[String(cRows[i][QAC.FILE_ID] || '')];
            if (!r) continue;
            r.comments.push({
              atSec: Number(cRows[i][QAC.AT_SEC]) || 0,
              text: String(cRows[i][QAC.TEXT] || ''),
              name: String(cRows[i][QAC.EMP_NAME] || ''),
            });
          }
          mine.forEach(function (r) { r.comments.sort(function (a, b) { return a.atSec - b.atSec; }); });
        }
      } catch (e) { /* comments are best-effort — the scorecards still render */ }
    }
    return { recordings: mine, criteria: getQaScorecardCriteria_() };
  } catch (err) { return { error: err.message }; }
}
/** PURE (Node-pinned) — coverage-fair sample pick: repeatedly take a
 *  candidate whose AGENT has the lowest (already-reviewed + picked-this-
 *  round) load, random tie-break. `rand` is injectable for deterministic
 *  tests; blank agents bucket under '(unassigned)' so unattributed
 *  recordings still get sampled. */
function qaSamplePick_(candidates, count, reviewedByAgent, rand, targets) {
  const pool = (candidates || []).slice();
  const r = typeof rand === 'function' ? rand : Math.random;
  const key = function (c) { return String((c && c.agent) || '').trim() || '(unassigned)'; };
  const n = Math.max(0, Math.min(Math.floor(Number(count) || 0), pool.length));
  const picked = [];
  const load = {};
  // Q4 — target-aware: an agent whose (done + picked) load has reached the
  // period target is SKIPPED, so a sample never pulls a covered agent ahead
  // of one still short. Only agents PRESENT in `targets` are capped — an
  // absent map (the legacy 4-arg call) keeps the pure coverage-fair pick.
  const capped = function (k, l) {
    return !!(targets && Object.prototype.hasOwnProperty.call(targets, k)) && l >= (Number(targets[k]) || 0);
  };
  while (picked.length < n) {
    let bestLoad = Infinity, ties = [];
    for (let i = 0; i < pool.length; i++) {
      const l = (Number((reviewedByAgent || {})[key(pool[i])]) || 0) + (load[key(pool[i])] || 0);
      if (capped(key(pool[i]), l)) continue;
      if (l < bestLoad) { bestLoad = l; ties = [i]; }
      else if (l === bestLoad) ties.push(i);
    }
    if (!ties.length) break;   // everyone left is at target
    const idx = ties[Math.floor(r() * ties.length) % ties.length];
    const c = pool.splice(idx, 1)[0];
    load[key(c)] = (load[key(c)] || 0) + 1;
    picked.push(c);
  }
  return picked;
}
/** Sample up to `count` un-reviewed, un-assigned recordings and assign them
 *  to the CALLER (never a third party — a manager who wants to route work
 *  uses Assign on the queue). QA-gated, locked; coverage-fair via
 *  qaSamplePick_ (agents with the fewest DONE reviews first). Counts-only
 *  audit (INV-32/196). */
function qaSampleRecordings(count, period) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !canSeeQa_(emp)) return { success: false, error: 'QA access required.' };
    const n = Math.floor(Number(count) || 0);
    if (!(n >= 1 && n <= 10)) return { success: false, error: 'Sample 1–10 recordings.' };
    const self = String(emp.email || '').trim().toLowerCase();
    const sheet = getOrCreateQaRecordingsSheet_();
    const last = sheet.getLastRow();
    if (last < 2) return { success: false, error: 'No recordings indexed yet — Sync first.' };
    const start = Math.max(2, last - QA_LIST_SCAN + 1);
    const rows = sheet.getRange(start, 1, last - start + 1, QA_RECORDINGS_HEADERS.length).getValues();
    // Q4 — period-scoped, target-aware: only DONE reviews whose recording
    // falls in the period count as load, and a roster agent at the period
    // target (or exempt this period — target 0) is skipped. Roster names
    // are matched case-insensitively (the coverage join's rule); an
    // off-roster agent string is uncapped (no target to reach).
    const periodKey = qaPeriodValid_(period) ? String(period).trim()
      : qaPeriodOptions_(Utilities.formatDate(new Date(), CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE, 'yyyy-MM-dd'))[0].key;
    const target = qaAuditTarget_();
    let exemptions = {};
    try { exemptions = qaReadExemptions_(); } catch (e) { exemptions = {}; }
    const canon = {};    // lowercase roster name → roster spelling
    const targets = {};  // roster spelling → target for this period
    try {
      const rrows = getEmployeeRosterRows_();
      for (let i = 1; i < rrows.length; i++) {
        if (!empRosterEmail_(rrows[i])) continue;   // INV-183
        const nm = String(rrows[i][EMP.NAME] || '').trim();
        if (!nm) continue;
        canon[nm.toLowerCase()] = nm;
        targets[nm] = exemptions[nm.toLowerCase() + '|' + periodKey] ? 0 : target;
      }
    } catch (e) { /* best-effort — an unreadable roster degrades to the uncapped pick */ }
    const candidates = [];
    const reviewedByAgent = {};
    for (let i = 0; i < rows.length; i++) {
      const fid = String(rows[i][QAR.FILE_ID] || '').trim();
      if (!fid) continue;
      const rawAgent = String(rows[i][QAR.AGENT] || '').trim();
      const agent = (rawAgent && canon[rawAgent.toLowerCase()]) || rawAgent || '(unassigned)';
      const createdYmd = qaMsToYmd_(Number(rows[i][QAR.CREATED_MS]) || 0);
      if (qaStatus_(rows[i][QAR.STATUS]) === 'done' && qaPeriodMatches_(createdYmd, periodKey)) {
        reviewedByAgent[agent] = (reviewedByAgent[agent] || 0) + 1;
      }
      if (qaStatus_(rows[i][QAR.STATUS]) !== 'new') continue;
      if (String(rows[i][QAR.ASSIGNEE] || '').trim()) continue;
      candidates.push({ fileId: fid, agent: agent, rowIdx: start + i });
    }
    if (!candidates.length) return { success: false, error: 'Nothing to sample — every new recording is already assigned.' };
    const picked = qaSamplePick_(candidates, n, reviewedByAgent, null, targets);
    if (!picked.length) return { success: false, error: 'Nothing to sample — every unassigned recording belongs to an agent already at target this period.' };
    picked.forEach(function (c) { sheet.getRange(c.rowIdx, QAR.ASSIGNEE + 1).setValue(sheetSafe_(self)); });
    writeAuditLog_(emp, 'QaSample', '', '', false, 0,
      'requested=' + n + '; assigned=' + picked.length, emp.email);
    return { success: true, assigned: picked.length,
             fileIds: picked.map(function (c) { return c.fileId; }) };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
// ── Q4 (design handoff PR 5) — audit periods, coverage, exemptions ────────
/** The per-period sample target: Script Property QA_AUDIT_TARGET_PER_PERIOD
 *  (1..50) overrides the CONFIG seed; garbage degrades to the seed. */
function qaAuditTarget_() {
  const seed = Math.max(1, Math.floor(Number(CONFIG.QA_AUDIT_TARGET_PER_PERIOD) || 3));
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('QA_AUDIT_TARGET_PER_PERIOD');
    if (raw == null || String(raw).trim() === '') return seed;
    const n = Math.floor(Number(raw));
    return (n >= 1 && n <= 50) ? n : seed;
  } catch (e) { return seed; }
}
/** The roster id for an agent NAME (case-insensitive, INV-183 inclusion);
 *  '' when the name is not on the roster or the roster is unreadable. */
function qaRosterIdByName_(name) {
  const key = String(name || '').trim().toLowerCase();
  if (!key) return '';
  try {
    // F-16: an AMBIGUOUS name (two roster rows) resolves to '' — never to
    // whichever row happens to come first.
    const ids = qaRosterIdsForName_(getEmployeeRosterRows_(), key);
    return ids.length === 1 ? ids[0] : '';
  } catch (e) { /* best-effort */ }
  return '';
}
/** PURE (Node-pinned): every INCLUDED roster row's id whose name matches
 *  `key` (already trimmed + lowercased). Two ids = an ambiguous name. */
function qaRosterIdsForName_(rrows, key) {
  const out = [];
  for (let i = 1; i < (rrows || []).length; i++) {
    if (!empRosterEmail_(rrows[i])) continue;
    if (String(rrows[i][EMP.NAME] || '').trim().toLowerCase() === key) out.push(String(rrows[i][EMP.ID] || '').trim());
  }
  return out;
}
/** PURE (Node-pinned): does this QaRecordings row belong to the calling
 *  agent? (F-16, 2026-09-18.) An AgentId cell wins outright — it was resolved
 *  from the roster when the reviewer attributed the recording. A legacy row
 *  (blank AgentId) falls back to the name, but ONLY when `nameUnique` says the
 *  caller's name has exactly one roster row: a name two agents share must
 *  never release one agent's review to the other. */
function qaRowIsMine_(row, emp, nameUnique) {
  const id = String((row && row[QAR.AGENT_ID]) || '').trim();
  const myId = String((emp && emp.id) || '').trim();
  if (id) return !!myId && id === myId;
  if (!nameUnique) return false;
  const n = String((row && row[QAR.AGENT]) || '').trim().toLowerCase();
  const myName = String((emp && emp.name) || '').trim().toLowerCase();
  return !!n && !!myName && n === myName;
}
/** Is the caller's roster name unique (exactly one included row)? */
function qaMyNameUnique_(emp) {
  const key = String((emp && emp.name) || '').trim().toLowerCase();
  if (!key) return false;
  try { return qaRosterIdsForName_(getEmployeeRosterRows_(), key).length === 1; } catch (e) { return false; }
}
/** PURE — a period key is `yyyy-MM` (a month) or `yyyy-Qn` (a quarter). */
function qaPeriodValid_(key) {
  const k = String(key || '').trim();
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(k) || /^\d{4}-Q[1-4]$/.test(k);
}
/** PURE — epoch ms → yyyy-MM-dd in the MANAGER tz (the app's operating
 *  anchor; DriveCreatedMs is the recording's own stamp). 0/garbage → ''. */
function qaMsToYmd_(ms) {
  const n = Number(ms);
  if (!(n > 0)) return '';
  try { return Utilities.formatDate(new Date(n), CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE, 'yyyy-MM-dd'); }
  catch (e) { return ''; }
}
/** PURE — the month + quarter keys a yyyy-MM-dd date falls in. */
function qaPeriodKeysForYmd_(ymd) {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(String(ymd || ''));
  if (!m) return null;
  const mo = Number(m[2]);
  if (!(mo >= 1 && mo <= 12)) return null;
  return { month: m[1] + '-' + m[2], quarter: m[1] + '-Q' + Math.ceil(mo / 3) };
}
/** PURE — does a yyyy-MM-dd date fall in the period? Unknown date → false. */
function qaPeriodMatches_(ymd, key) {
  const ks = qaPeriodKeysForYmd_(ymd);
  if (!ks) return false;
  return ks.month === key || ks.quarter === key;
}
/** PURE — the period immediately before `key` (same shape). */
function qaPrevPeriod_(key) {
  const k = String(key || '').trim();
  let m = /^(\d{4})-(\d{2})$/.exec(k);
  if (m) {
    let y = Number(m[1]), mo = Number(m[2]) - 1;
    if (mo < 1) { mo = 12; y--; }
    return y + '-' + (mo < 10 ? '0' : '') + mo;
  }
  m = /^(\d{4})-Q([1-4])$/.exec(k);
  if (m) {
    let y = Number(m[1]), q = Number(m[2]) - 1;
    if (q < 1) { q = 4; y--; }
    return y + '-Q' + q;
  }
  return '';
}
/** PURE — a human label: `2026-08` → 'Aug 2026', `2026-Q3` → 'Q3 2026'. */
function qaPeriodLabel_(key) {
  const k = String(key || '').trim();
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let m = /^(\d{4})-(\d{2})$/.exec(k);
  if (m) return MON[Number(m[2]) - 1] + ' ' + m[1];
  m = /^(\d{4})-Q([1-4])$/.exec(k);
  if (m) return 'Q' + m[2] + ' ' + m[1];
  return k;
}
/** PURE — inclusive yyyy-MM-dd bounds of a period (null on a bad key). */
function qaPeriodBounds_(key) {
  const k = String(key || '').trim();
  let m = /^(\d{4})-(\d{2})$/.exec(k);
  if (m) {
    const y = Number(m[1]), mo = Number(m[2]);
    const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    return { start: k + '-01', end: k + '-' + (lastDay < 10 ? '0' : '') + lastDay };
  }
  m = /^(\d{4})-Q([1-4])$/.exec(k);
  if (m) {
    const y = Number(m[1]), q = Number(m[2]);
    const mo1 = (q - 1) * 3 + 1, mo3 = mo1 + 2;
    const lastDay = new Date(Date.UTC(y, mo3, 0)).getUTCDate();
    const pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return { start: y + '-' + pad(mo1) + '-01', end: y + '-' + pad(mo3) + '-' + pad(lastDay) };
  }
  return null;
}
/** PURE — the period options the client offers: this month, this quarter,
 *  the previous quarter (each {key, label}). */
function qaPeriodOptions_(todayYmd) {
  const ks = qaPeriodKeysForYmd_(todayYmd) || { month: '', quarter: '' };
  const out = [];
  if (ks.month) out.push({ key: ks.month, label: qaPeriodLabel_(ks.month) });
  if (ks.quarter) {
    out.push({ key: ks.quarter, label: qaPeriodLabel_(ks.quarter) });
    const prev = qaPrevPeriod_(ks.quarter);
    if (prev) out.push({ key: prev, label: qaPeriodLabel_(prev) });
  }
  return out;
}
/** PURE — the mean of a scorecard's 1..5 ratings and its lowest rating;
 *  null when the card carries no valid rating. */
function qaCardStats_(card) {
  let sum = 0, n = 0, min = Infinity;
  Object.keys((card && card.ratings) || {}).forEach(function (k) {
    const v = Number(card.ratings[k]);
    if (v >= 1 && v <= 5) { sum += v; n++; if (v < min) min = v; }
  });
  return n ? { avg: sum / n, min: min, n: n } : null;
}
/** PURE (Node-pinned) — exemption eligibility (operator decision 6): two
 *  consecutive COVERED periods (sampled ≥ target in both) at avg ≥ 4.5 with
 *  no criterion under 4. A row short in EITHER period is never eligible —
 *  silence is not merit. */
function qaExemptEligible_(row) {
  if (!row) return false;
  const target = Number(row.target) || 0;
  if (!(target > 0)) return false;   // an exempt (target 0) or targetless row is never re-eligible
  if (!(row.sampled >= target && row.prevSampled >= target)) return false;
  if (!(row.avg != null && row.prevAvg != null)) return false;
  if (!(row.avg >= QA_EXEMPT_AVG_MIN && row.prevAvg >= QA_EXEMPT_AVG_MIN)) return false;
  if (!(row.minCriterion != null && row.prevMinCriterion != null)) return false;
  return row.minCriterion >= QA_EXEMPT_CRIT_MIN && row.prevMinCriterion >= QA_EXEMPT_CRIT_MIN;
}
/** PURE (Node-pinned) — the coverage join: ONE row per roster name.
 *  `sampled` = DONE recordings attributed to the rep (case-insensitive) whose
 *  DriveCreatedMs falls in the period; `avg` = the mean of the LATEST
 *  scorecards' own means over those recordings (null when none — never 0);
 *  `minCriterion` = the lowest single rating across them. The previous
 *  period rides alongside so the client can show a delta and the
 *  eligibility rule can read two periods. An exempt rep's target is 0. */
function qaCoverageRows_(recs, latestCards, rosterNames, period, target, exemptions, prevPeriod) {
  const cardsByFile = {};
  (latestCards || []).forEach(function (c) {
    const f = String((c && c.fileId) || '');
    if (f) (cardsByFile[f] = cardsByFile[f] || []).push(c);
  });
  const byName = {};
  (rosterNames || []).forEach(function (nm) {
    const n = String(nm || '').trim();
    if (!n) return;
    byName[n.toLowerCase()] = { name: n, cur: { sampled: 0, sum: 0, cards: 0, min: Infinity }, prev: { sampled: 0, sum: 0, cards: 0, min: Infinity }, lastReviewedMs: 0 };
  });
  (recs || []).forEach(function (r) {
    if (!r || r.status !== 'done') return;
    const row = byName[String(r.agent || '').trim().toLowerCase()];
    if (!row) return;
    if (Number(r.statusMs) > row.lastReviewedMs) row.lastReviewedMs = Number(r.statusMs);
    const bucket = qaPeriodMatches_(r.createdYmd, period) ? row.cur
      : (prevPeriod && qaPeriodMatches_(r.createdYmd, prevPeriod)) ? row.prev : null;
    if (!bucket) return;
    bucket.sampled++;
    (cardsByFile[r.fileId] || []).forEach(function (c) {
      const st = qaCardStats_(c);
      if (!st) return;
      bucket.sum += st.avg; bucket.cards++;
      if (st.min < bucket.min) bucket.min = st.min;
    });
  });
  const fin = function (b) {
    return { avg: b.cards ? Math.round((b.sum / b.cards) * 100) / 100 : null,
             min: b.cards ? b.min : null };
  };
  return Object.keys(byName).sort().map(function (k) {
    const row = byName[k];
    const cur = fin(row.cur), prev = fin(row.prev);
    const exempt = !!(exemptions || {})[k + '|' + period];
    const out = {
      name: row.name, sampled: row.cur.sampled, target: exempt ? 0 : (Number(target) || 0),
      cardCount: row.cur.cards, avg: cur.avg, minCriterion: cur.min,
      prevSampled: row.prev.sampled, prevAvg: prev.avg, prevMinCriterion: prev.min,
      lastReviewedMs: row.lastReviewedMs, exempt: exempt, exemptUntil: exempt ? period : '',
    };
    out.eligible = !exempt && qaExemptEligible_(out);
    return out;
  });
}
/** Read the exemption ledger into { 'lowercase name|period': true } — latest
 *  row per key wins; Sheets' TRUE coercion handled. READ-ONLY (never
 *  provisions the tab); an absent tab reads as no exemptions. */
function qaReadExemptions_() {
  const sheet = getQaSS_().getSheetByName(QA_EXEMPTIONS_TAB);
  const out = {};
  if (!sheet || sheet.getLastRow() < 2) return out;
  const last = sheet.getLastRow();
  const start = Math.max(2, last - QA_EXEMPTIONS_SCAN + 1);
  const rows = sheet.getRange(start, 1, last - start + 1, QA_EXEMPTIONS_HEADERS.length).getValues();
  for (let i = 0; i < rows.length; i++) {
    const nm = String(rows[i][QAE.EMP_NAME] || '').trim().toLowerCase();
    const per = String(rows[i][QAE.PERIOD] || '').trim();
    if (!nm || !per) continue;
    const a = rows[i][QAE.ACTIVE];
    const active = a === true || String(a || '').trim().toUpperCase() === 'TRUE';
    if (active) out[nm + '|' + per] = true; else delete out[nm + '|' + per];
  }
  return out;
}
/** Grant / revoke an audit-period exemption. MANAGER-gated (INV-02 — a QA
 *  member reviews, a manager decides who may skip a period), locked,
 *  append-only ledger; the audit row carries period + flag only (the name
 *  stays in the QA store — INV-196's name rule). */
function qaSetExemption(empName, period, on) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { success: false, error: 'Manager access required.' };
    const name = String(empName || '').trim().substring(0, 80);
    const per = String(period || '').trim();
    if (!name) return { success: false, error: 'Employee name required.' };
    if (!qaPeriodValid_(per)) return { success: false, error: 'Unknown audit period.' };
    const sheet = getOrCreateQaExemptionsSheet_();
    const active = !!on;
    appendRowsTextSafe_(sheet, [[name, per, String(emp.email || ''), Date.now(), active ? 'TRUE' : 'FALSE']], QA_EXEMPTIONS_TEXT_IDX);
    writeAuditLog_(emp, 'QaExemption', '', '', false, 0, 'period=' + per + '; active=' + active, emp.email);
    return { success: true, active: active, period: per };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Write a recording's duration ONCE (the client learns it on
 *  loadedmetadata; the queue's Length column reads it). QA-gated, locked,
 *  bounded; a non-blank cell is never overwritten, no audit row (it is
 *  metadata the file already carries, not a review action). */
function qaSetRecordingDuration(fileId, sec) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !canSeeQa_(emp)) return { success: false, error: 'QA access required.' };
    const fid = String(fileId || '').trim();
    const n = Math.round(Number(sec));
    if (!(n >= 1 && n <= QA_DURATION_MAX_SEC)) return { success: false, error: 'Invalid duration.' };
    const sheet = getOrCreateQaRecordingsSheet_();
    const found = qaFindRecordingRow_(sheet, fid);
    if (!found) return { success: false, error: 'Recording not found.' };
    const have = Number(found.row[QAR.DURATION_SEC]) || 0;
    if (have > 0) return { success: true, durationSec: have, written: false };
    sheet.getRange(found.rowIdx, QAR.DURATION_SEC + 1).setValue(sheetSafe_(n));
    return { success: true, durationSec: n, written: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** PURE (Node-pinned) — calibration rows: recordings whose LATEST-folded
 *  scorecards span 2+ reviewers, each reviewer's own card mean, the overall
 *  spread (max−min of those means) and the widest per-criterion spread where
 *  2+ reviewers rated the SAME criterion. FACTS ONLY — no verdict tone
 *  (the Coverage rule): the reader judges what a 2-point spread means.
 *  Single-reviewer recordings are EXCLUDED — calibration compares reviewers,
 *  and a lone card has nothing to compare against. */
function qaCalibration_(latestCards, criteria) {
  const byFile = {};
  (latestCards || []).forEach(function (c) {
    const f = String((c && c.fileId) || '');
    if (!f) return;
    (byFile[f] = byFile[f] || []).push(c);
  });
  const rows = [];
  Object.keys(byFile).forEach(function (f) {
    const cards = byFile[f];
    if (cards.length < 2) return;
    const reviewers = [];
    cards.forEach(function (c) {
      let sum = 0, n = 0;
      Object.keys(c.ratings || {}).forEach(function (k) {
        const v = Number(c.ratings[k]);
        if (v >= 1 && v <= 5) { sum += v; n++; }
      });
      if (n) reviewers.push({ name: String(c.name || ''), avg: Math.round((sum / n) * 10) / 10 });
    });
    if (reviewers.length < 2) return;
    const avgs = reviewers.map(function (rv) { return rv.avg; });
    const spread = Math.round((Math.max.apply(null, avgs) - Math.min.apply(null, avgs)) * 10) / 10;
    let maxCritSpread = 0, maxCritKey = '';
    (criteria || []).forEach(function (cr) {
      const vals = [];
      cards.forEach(function (c) {
        const v = Number((c.ratings || {})[cr.key]);
        if (v >= 1 && v <= 5) vals.push(v);
      });
      if (vals.length < 2) return;
      const s = Math.max.apply(null, vals) - Math.min.apply(null, vals);
      if (s > maxCritSpread) { maxCritSpread = s; maxCritKey = cr.key; }
    });
    rows.push({ fileId: f, reviewers: reviewers, spread: spread,
                maxCritSpread: maxCritSpread, maxCritKey: maxCritKey });
  });
  rows.sort(function (a, b) { return b.spread - a.spread; });
  return rows;
}
