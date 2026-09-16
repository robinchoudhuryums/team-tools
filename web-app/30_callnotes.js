// ════════════════════════════════════════════════════════════════════════════
//  UMS TEAM TOOLS — 30_callnotes.js
//  Call Notes: the per-rep note store, flags and tags, the email composer and
//  its external sends, scheduled calls, the scratchpad and the retention tiers.
//
//  ONE Apps Script project, ONE global scope: these files are the SERVER, in
//  the load order `web-app/.clasp.json` filePushOrder declares. Batch F2 split
//  them out of Code.js as a MOVE — every declaration below is byte-identical to
//  the one it replaced, and the SPLIT-MANIFEST pin proves it.
// ════════════════════════════════════════════════════════════════════════════

/** Round 2 · 8e — derives the single FlagType column value from a
 *  multi-select flags array. Maintains backward compat with existing
 *  manager digests (managerGetReviewCandidates, weekly digest, EOD
 *  digest, INV-37 sanitizeFlagType_) by picking the highest-priority
 *  flag that the legacy infrastructure understands. 'urgent' (new in
 *  Round 2) only becomes FlagType when no higher-priority flag is set;
 *  otherwise it lives in subformData.flags only. */
function deriveFlagType_(flagsArray) {
  if (!Array.isArray(flagsArray) || flagsArray.length === 0) return '';
  const set = {};
  flagsArray.forEach(function (f) { set[String(f || '').toLowerCase()] = true; });
  for (var i = 0; i < CN_FLAG_PRIORITY.length; i++) {
    if (set[CN_FLAG_PRIORITY[i]]) {
      // For the legacy FlagType column, only return values that existing
      // infrastructure understands (CN_FLAG_TYPES). 'urgent' falls through
      // since none of the existing digests/queues look for it.
      if (CN_FLAG_TYPES.indexOf(CN_FLAG_PRIORITY[i]) >= 0) return CN_FLAG_PRIORITY[i];
    }
  }
  return '';
}
/** Round 2 · 8e — normalize the multi-flag array. Lowercases, dedupes,
 *  rejects unknowns, drops empty strings. */
function sanitizeFlagsArray_(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = {};
  const out = [];
  for (var i = 0; i < arr.length; i++) {
    const f = String(arr[i] || '').trim().toLowerCase();
    if (!f) continue;
    if (CN_FLAG_TYPES_EXTENDED.indexOf(f) < 0) continue;
    if (seen[f]) continue;
    seen[f] = true;
    out.push(f);
  }
  return out;
}
/** Round 2 · 8e — normalize the free-text tag array. Each tag is forced
 *  to lowercase kebab-case (a–z, 0–9, hyphen), length 2–24, max 8 tags.
 *  Matches the client-side validation in cnNormalizeTag_. */
function sanitizeTagsArray_(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = {};
  const out = [];
  for (var i = 0; i < arr.length && out.length < 8; i++) {
    const raw = String(arr[i] || '').trim().toLowerCase();
    const tag = raw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (tag.length < 2 || tag.length > 24) continue;
    if (seen[tag]) continue;
    seen[tag] = true;
    out.push(tag);
  }
  return out;
}
/** Submits a new call note. Logs only — does NOT send any email. Email
 *  composition is a separate two-stage action (preview → confirm) via
 *  previewCallNoteEmail / emailFromCallNote. */
function submitCallNote(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let notifyAfter = null;
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Employee not found.' };

    const cleaned = sanitizeCallNotePayload_(payload || {});
    const v = validateCallNotePayload_(cleaned);
    if (v.error) return { success: false, error: v.error };

    const sheet = getCallNotesSheet_(emp);
    const empTz = empTz_(emp);
    const now = new Date();
    const noteId = Utilities.getUuid();
    const timestamp = Utilities.formatDate(now, empTz, "yyyy-MM-dd'T'HH:mm:ss");
    const dateLocal = Utilities.formatDate(now, empTz, 'yyyy-MM-dd');

    const flagType = sanitizeFlagType_(cleaned.flagType);
    const subform = String(cleaned.subform || '').trim();
    const subformDataJson = cleaned.subformData
      ? JSON.stringify(cleaned.subformData) : '';

    const row = new Array(CN_HEADERS.length).fill('');
    row[CN.NOTE_ID]         = noteId;
    row[CN.TIMESTAMP]       = timestamp;
    row[CN.DATE_LOCAL]      = dateLocal;
    row[CN.CALLBACK]        = cleaned.callback;
    row[CN.CALLER]          = cleaned.caller;
    row[CN.RELATIONSHIP]    = cleaned.relationship;
    row[CN.PATIENT_TRX]     = cleaned.patientAndTrx;
    row[CN.ISSUE]           = cleaned.issue;
    row[CN.TRANSFERRED_TO]  = cleaned.transferredTo;
    row[CN.RESOLUTION]      = cleaned.resolution;
    row[CN.FLAG_TYPE]       = flagType;
    row[CN.RESOLVED]        = 'FALSE';
    row[CN.EMAILED_AT]      = '';
    row[CN.EMAIL_DEPARTMENTS] = '';
    row[CN.SUBFORM]         = subform;
    row[CN.SUBFORM_DATA]    = subformDataJson;
    sheet.appendRow(row);

    writeAuditLog_(emp, 'CallNoteCreate', dateLocal, '', false, 0,
      `noteId=${noteId}${flagType ? ', flag=' + flagType : ''}`);

    const createdNote = callNoteRowToObject_({ row, rowIndex: sheet.getLastRow() });

    if (flagType === 'training' && cleaned.subformData && cleaned.subformData.trainingQuestion) {
      // Cycle-9 M-7: fires post-lock in the finally.
      notifyAfter = function () { notifyManagerTrainingQuestion_(emp, cleaned.subformData.trainingQuestion, dateLocal); };
    }

    return { success: true, note: createdNote };
  } catch (err) { return { success: false, error: err.message }; }
  finally {
    lock.releaseLock();
    // M-7: best-effort mail fires only after the global lock is released.
    if (notifyAfter) { try { notifyAfter(); } catch (e) { console.warn('post-lock notify failed: ' + e.message); } }
  }
}
/** Updates an existing call note's content. Inline-edit support for the
 *  rolling stack. The audit log records the diff for accountability. */
function updateCallNote(noteId, payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Employee not found.' };

    const cleaned = sanitizeCallNotePayload_(payload || {});
    const v = validateCallNotePayload_(cleaned);
    if (v.error) return { success: false, error: v.error };

    const sheet = getCallNotesSheet_(emp);
    const located = findCallNoteRow_(sheet, noteId);
    if (!located) return { success: false, error: 'Note not found.' };

    const oldRow = located.row;
    // L-9 — updateCallNote is TEXT-ONLY by design: it writes the 7 content
    // columns only. `sanitizeCallNotePayload_` also derives flags/tags into a
    // subformData blob, but that is intentionally NOT written here — flag/tag
    // changes go through `setCallNoteFlag` (card toggles) and the submit path's
    // multi-flag toolbar, never the inline text editor. If a future caller
    // passes flags/tags to updateCallNote expecting them to persist, surface a
    // dedicated endpoint instead of silently widening this write.
    sheet.getRange(located.rowIndex, CN.CALLBACK + 1).setValue(cleaned.callback);
    sheet.getRange(located.rowIndex, CN.CALLER + 1).setValue(cleaned.caller);
    sheet.getRange(located.rowIndex, CN.RELATIONSHIP + 1).setValue(cleaned.relationship);
    sheet.getRange(located.rowIndex, CN.PATIENT_TRX + 1).setValue(cleaned.patientAndTrx);
    sheet.getRange(located.rowIndex, CN.ISSUE + 1).setValue(cleaned.issue);
    sheet.getRange(located.rowIndex, CN.TRANSFERRED_TO + 1).setValue(cleaned.transferredTo);
    sheet.getRange(located.rowIndex, CN.RESOLUTION + 1).setValue(cleaned.resolution);

    const diffs = [];
    [['callback', CN.CALLBACK], ['caller', CN.CALLER], ['relationship', CN.RELATIONSHIP],
     ['patientAndTRX', CN.PATIENT_TRX], ['issue', CN.ISSUE],
     ['transferredTo', CN.TRANSFERRED_TO], ['resolution', CN.RESOLUTION]].forEach(([name, idx]) => {
      const before = String(oldRow[idx] || '').trim();
      const after  = String(cleaned[name === 'patientAndTRX' ? 'patientAndTrx' : name] || '').trim();
      if (before !== after) diffs.push(name);
    });

    const dateLocal = cnDateLocalString_(oldRow[CN.DATE_LOCAL]);
    writeAuditLog_(emp, 'CallNoteEdit', dateLocal, '', false, 0,
      `noteId=${noteId}; changed: ${diffs.join(', ') || '(no changes)'}`);

    const updatedRow = sheet.getRange(located.rowIndex, 1, 1, CN_HEADERS.length).getValues()[0];
    return { success: true, note: callNoteRowToObject_({ row: updatedRow, rowIndex: located.rowIndex }) };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Sets (or clears) the flag type on a note. Pass '' to clear.
 *  Optional trainingQuestion: when flagging as 'training', merges
 *  the question into subformData so it appears in digests/Q&A. */
function setCallNoteFlag(noteId, flagType, trainingQuestion, reviewComment) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Employee not found.' };
    // Round 2 deferred 8e — accept 'urgent' as a card-level toggle. Urgent
    // never enters the FlagType column (sanitizeFlagType_ still rejects it,
    // INV-37 preserved), but it does flip in subformData.flags so the form
    // toolbar + admin queries see consistent state. action/training/review
    // continue to flow through FlagType as before.
    const raw = String(flagType || '').trim().toLowerCase();
    const isUrgent = (raw === 'urgent');
    const t = isUrgent ? '' : sanitizeFlagType_(flagType);
    const sheet = getCallNotesSheet_(emp);
    const located = findCallNoteRow_(sheet, noteId);
    if (!located) return { success: false, error: 'Note not found.' };

    let subformData = null;
    if (located.row[CN.SUBFORM_DATA]) {
      try { subformData = JSON.parse(located.row[CN.SUBFORM_DATA]); } catch (e) {}
    }
    if (!subformData || typeof subformData !== 'object') subformData = {};

    if (isUrgent) {
      // Toggle urgent in subformData.flags without touching FlagType column.
      const cur = Array.isArray(subformData.flags) ? subformData.flags.slice() : [];
      const idx = cur.indexOf('urgent');
      if (idx >= 0) cur.splice(idx, 1);
      else cur.push('urgent');
      subformData.flags = cur;
      sheet.getRange(located.rowIndex, CN.SUBFORM_DATA + 1).setValue(JSON.stringify(subformData));
      const dateLocal = cnDateLocalString_(located.row[CN.DATE_LOCAL]);
      writeAuditLog_(emp, 'CallNoteFlag', dateLocal, '', false, 0,
        `noteId=${noteId}; urgent=${idx >= 0 ? 'off' : 'on'}`);
      const updatedRow = sheet.getRange(located.rowIndex, 1, 1, CN_HEADERS.length).getValues()[0];
      return { success: true, note: callNoteRowToObject_({ row: updatedRow, rowIndex: located.rowIndex }) };
    }

    // Standard FlagType (action/training/review/'') path
    const oldFlag = String(located.row[CN.FLAG_TYPE] || '').trim().toLowerCase();
    sheet.getRange(located.rowIndex, CN.FLAG_TYPE + 1).setValue(t);
    if (oldFlag !== t) sheet.getRange(located.rowIndex, CN.RESOLVED + 1).setValue('FALSE');

    if (t === 'training' && trainingQuestion) {
      // F(cycle-8): same 2000-char cap as the submit path (sanitizeCallNotePayload_,
      // M-15) — an uncapped write can push the SubformData cell toward the ~50k
      // Sheets limit, after which EVERY later metadata write to the note throws.
      subformData.trainingQuestion = String(trainingQuestion).trim().slice(0, 2000);
      sheet.getRange(located.rowIndex, CN.SUBFORM_DATA + 1).setValue(JSON.stringify(subformData));
    }
    if (t === 'review' && reviewComment) {
      // Round-1 pilot #1 — optional review comment from the card toggle; the
      // trainingQuestion write above, mirrored (same trim + cell-size cap).
      subformData.reviewComment = String(reviewComment).trim().slice(0, 2000);
      sheet.getRange(located.rowIndex, CN.SUBFORM_DATA + 1).setValue(JSON.stringify(subformData));
    }
    // Mirror the primary flag into subformData.flags so the form toolbar
    // + tag taxonomy stay in sync with the FlagType column.
    if (t) {
      const cur = Array.isArray(subformData.flags) ? subformData.flags.slice() : [];
      // Drop any conflicting prior primary flag (CN_FLAG_TYPES only — urgent stays)
      const pruned = cur.filter(function (f) {
        return CN_FLAG_TYPES.indexOf(f) < 0 || f === t;
      });
      if (pruned.indexOf(t) < 0) pruned.push(t);
      subformData.flags = pruned;
      sheet.getRange(located.rowIndex, CN.SUBFORM_DATA + 1).setValue(JSON.stringify(subformData));
    } else if (Array.isArray(subformData.flags) && subformData.flags.length > 0) {
      // Cleared primary — drop CN_FLAG_TYPES entries (keep urgent)
      subformData.flags = subformData.flags.filter(function (f) { return CN_FLAG_TYPES.indexOf(f) < 0; });
      sheet.getRange(located.rowIndex, CN.SUBFORM_DATA + 1).setValue(JSON.stringify(subformData));
    }

    const dateLocal = cnDateLocalString_(located.row[CN.DATE_LOCAL]);
    writeAuditLog_(emp, 'CallNoteFlag', dateLocal, '', false, 0,
      `noteId=${noteId}; ${t || '<cleared>'}`);

    const updatedRow = sheet.getRange(located.rowIndex, 1, 1, CN_HEADERS.length).getValues()[0];
    return { success: true, note: callNoteRowToObject_({ row: updatedRow, rowIndex: located.rowIndex }) };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Marks an action-flagged note as resolved (or un-resolves it). Only
 *  meaningful when FlagType=action. */
function setCallNoteResolved(noteId, resolved) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Employee not found.' };
    const sheet = getCallNotesSheet_(emp);
    const located = findCallNoteRow_(sheet, noteId);
    if (!located) return { success: false, error: 'Note not found.' };
    const flagType = String(located.row[CN.FLAG_TYPE] || '').trim().toLowerCase();
    if (flagType !== 'action') {
      return { success: false, error: 'Only action-flagged notes can be resolved.' };
    }
    const val = resolved ? 'TRUE' : 'FALSE';
    sheet.getRange(located.rowIndex, CN.RESOLVED + 1).setValue(val);

    const dateLocal = cnDateLocalString_(located.row[CN.DATE_LOCAL]);
    writeAuditLog_(emp, 'CallNoteResolve', dateLocal, '', false, 0,
      `noteId=${noteId}; ${resolved ? 'resolved' : 'unresolved'}`);
    // (Ambient cache is purely TTL-driven now — see INV-43.)

    const updatedRow = sheet.getRange(located.rowIndex, 1, 1, CN_HEADERS.length).getValues()[0];
    return { success: true, note: callNoteRowToObject_({ row: updatedRow, rowIndex: located.rowIndex }) };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Deletes a call note within the delete window. Hard-delete (Sheet row
 *  removed); audit row keeps the trail. Notes older than
 *  CONFIG.CALL_NOTES.DELETE_WINDOW_SECONDS cannot be self-deleted — they
 *  must be addressed through the manager or left in place. */
function deleteCallNote(noteId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Employee not found.' };
    const sheet = getCallNotesSheet_(emp);
    const located = findCallNoteRow_(sheet, noteId);
    if (!located) return { success: false, error: 'Note not found.' };

    const empTz = empTz_(emp);
    // F(M-14): coercion-safe read — a locale-coerced Date cell stringified
    // raw made parseTimestampMs_ return null, silently DISABLING the 5-min
    // delete window (fail-open) on a coercing per-rep sheet.
    const noteMs = parseTimestampMs_(cnTimestampString_(located.row[CN.TIMESTAMP]), empTz);
    if (noteMs) {
      const elapsed = (Date.now() - noteMs) / 1000;
      if (elapsed > CONFIG.CALL_NOTES.DELETE_WINDOW_SECONDS) {
        const mins = Math.round(CONFIG.CALL_NOTES.DELETE_WINDOW_SECONDS / 60);
        return { success: false, error:
          `Notes can only be deleted within ${mins} minutes of creation. Edit the note instead, or ask your manager.` };
      }
    }

    const dateLocal = cnDateLocalString_(located.row[CN.DATE_LOCAL]);
    sheet.deleteRow(located.rowIndex);
    writeAuditLog_(emp, 'CallNoteDelete', dateLocal, '', false, 0,
      `noteId=${noteId}`);
    // (Ambient cache is purely TTL-driven now — see INV-43.)
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Manager delete from a rep's history (operator feedback 2026-06-12) —
 *  the path deleteCallNote's own error message always pointed at ("ask
 *  your manager"). Manager-gated (INV-02), locked (INV-01); NO time window
 *  (that's the point — the rep window is 5 min, INV-60). Audit row carries
 *  the manager as actor + a deletedBy marker; PHI-free (noteId only). */
function managerDeleteCallNote(repEmpId, noteId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const emp = lookupEmployeeById_(String(repEmpId || '').trim());
    if (!emp || !emp.callNotesSheetId) return { success: false, error: 'Rep not found or not enrolled.' };
    const sheet = getCallNotesSheet_(emp);
    const located = findCallNoteRow_(sheet, noteId);
    if (!located) return { success: false, error: 'Note not found.' };
    const dateLocal = cnDateLocalString_(located.row[CN.DATE_LOCAL]);
    sheet.deleteRow(located.rowIndex);
    writeAuditLog_(emp, 'CallNoteDelete', dateLocal, '', false, 0,
      'noteId=' + noteId + '; deletedBy=manager', callerEmp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Toggle the "pinned" state on one of the calling rep's notes. Pinned
 *  notes render in a dedicated tray above the Log view's rolling stack
 *  so a complex case stays visible across calls without scrolling.
 *
 *  Storage: subformData.pinned (boolean) + subformData.pinnedAt (timestamp).
 *  No schema migration — pinned state lives alongside other subformData
 *  keys (trainingQuestion, completionSeconds, etc.).
 *
 *  Enforces CN_PIN_LIMIT (3): pinning a 4th note returns an error so the
 *  rep is forced to unpin something first. */
function setCallNotePinned(noteId, pinned) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Employee not found.' };
    const sheet = getCallNotesSheet_(emp);
    const located = findCallNoteRow_(sheet, noteId);
    if (!located) return { success: false, error: 'Note not found.' };

    const willPin = !!pinned;

    // If pinning, count existing pins and reject if at limit. Scan happens
    // inside the lock so two parallel pin requests can't both squeak past the
    // limit. Bounded read (L-7): scan only the NoteId + SubformData columns
    // with a cheap `"pinned"` substring pre-filter before JSON.parse — matches
    // getMyPinnedCallNotes' discipline instead of pulling the rep's full
    // history at full width.
    if (willPin) {
      const lastRow = sheet.getLastRow();
      let pinnedCount = 0;
      if (lastRow >= 2) {
        const rowN = lastRow - 1;
        const idCol  = sheet.getRange(2, CN.NOTE_ID + 1, rowN, 1).getValues();
        const subCol = sheet.getRange(2, CN.SUBFORM_DATA + 1, rowN, 1).getValues();
        for (let i = 0; i < rowN; i++) {
          if (String(idCol[i][0]).trim() === noteId) continue;
          const sfd = subCol[i][0];
          if (!sfd || String(sfd).indexOf('"pinned"') < 0) continue;
          try {
            const parsed = JSON.parse(sfd);
            if (parsed && parsed.pinned) pinnedCount++;
          } catch (e) { /* corrupt blob — skip */ }
        }
      }
      if (pinnedCount >= CN_PIN_LIMIT) {
        return { success: false, error:
          `You already have ${CN_PIN_LIMIT} pinned notes (the max). Unpin one before pinning another.` };
      }
    }

    // Merge into existing subformData
    let subformData = null;
    if (located.row[CN.SUBFORM_DATA]) {
      try { subformData = JSON.parse(located.row[CN.SUBFORM_DATA]); }
      catch (e) { subformData = null; }
    }
    if (!subformData || typeof subformData !== 'object') subformData = {};

    if (willPin) {
      const empTz = empTz_(emp);
      subformData.pinned = true;
      subformData.pinnedAt = Utilities.formatDate(new Date(), empTz, "yyyy-MM-dd'T'HH:mm:ss");
    } else {
      delete subformData.pinned;
      delete subformData.pinnedAt;
    }
    sheet.getRange(located.rowIndex, CN.SUBFORM_DATA + 1).setValue(JSON.stringify(subformData));

    const dateLocal = cnDateLocalString_(located.row[CN.DATE_LOCAL]);
    writeAuditLog_(emp, 'CallNotePin', dateLocal, '', false, 0,
      `noteId=${noteId}; ${willPin ? 'pinned' : 'unpinned'}`);

    const updatedRow = sheet.getRange(located.rowIndex, 1, 1, CN_HEADERS.length).getValues()[0];
    return { success: true, note: callNoteRowToObject_({ row: updatedRow, rowIndex: located.rowIndex }) };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Returns the calling rep's pinned notes across all dates (not just today).
 *  Read-only, no lock. Used by the Log view's pinned tray.
 *  Bounded read (A6): scans only the SubformData column to find pinned rows
 *  (~16× fewer cells than a full-history read), with a cheap substring
 *  pre-filter before JSON.parse, then fetches just the few pinned rows
 *  (≤ CN_PIN_LIMIT under the cap) at full width. */
function getMyPinnedCallNotes() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    if (!emp.callNotesSheetId) return { notes: [] };
    const sheet = getCallNotesSheet_(emp);
    const lastRow = sheet.getLastRow();
    const notes = [];
    if (lastRow >= 2) {
      const n = lastRow - 1;
      const subCol = sheet.getRange(2, CN.SUBFORM_DATA + 1, n, 1).getValues();
      for (let i = 0; i < n; i++) {
        const raw = subCol[i][0];
        if (!raw) continue;
        // Pre-filter: an unpinned note's blob never contains the key (the pin
        // toggle DELETES `pinned`/`pinnedAt` rather than writing false). The
        // JSON.parse below stays authoritative for any substring false-positive.
        if (String(raw).indexOf('"pinned"') < 0) continue;
        let sub = null;
        try { sub = JSON.parse(raw); } catch (e) { continue; }
        if (!sub || !sub.pinned) continue;
        const rowIndex = i + 2;
        const row = sheet.getRange(rowIndex, 1, 1, CN_HEADERS.length).getValues()[0];
        notes.push(callNoteRowToObject_({ row: row, rowIndex: rowIndex }));
      }
    }
    // Newest-pinned first
    notes.sort(function (a, b) {
      const ap = (a.subformData && a.subformData.pinnedAt) || '';
      const bp = (b.subformData && b.subformData.pinnedAt) || '';
      return bp.localeCompare(ap);
    });
    return { notes: notes, limit: CN_PIN_LIMIT };
  } catch (err) { return { error: err.message }; }
}
/** Returns the calling rep's notes for a given date, optionally filtered.
 *  Defaults to today in the rep's tz. Filter options:
 *    'all' (default) | 'action' | 'training' | 'review' | 'unresolved' | 'unsent' */
function getMyCallNotes(options) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    const opts = options || {};
    const empTz = empTz_(emp);
    const date = opts.date || Utilities.formatDate(new Date(), empTz, 'yyyy-MM-dd');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return { error: 'Invalid date format (expected yyyy-MM-dd).' };
    const filter = String(opts.filter || 'all').toLowerCase();

    const sheet = getCallNotesSheet_(emp);
    // Bounded read (L-8): single-day contiguous slice via the shared reader
    // (INV-46 append-order assumption) instead of the rep's full history at
    // full width. The per-row date re-check stays as a defensive guard.
    const located = readCallNoteRowsInRange_(sheet, date, date);
    const notes = [];
    for (let i = 0; i < located.length; i++) {
      const rowDate = cnDateLocalString_(located[i].row[CN.DATE_LOCAL]);
      if (rowDate !== date) continue;
      const note = callNoteRowToObject_(located[i]);
      if (!callNoteMatchesFilter_(note, filter)) continue;
      notes.push(note);
    }
    notes.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return {
      date,
      filter,
      notes,
      autoCopyFormat: CONFIG.CALL_NOTES.AUTO_COPY_FORMAT,
      timezone: empTz,
    };
  } catch (err) { return { error: err.message }; }
}
/** Clock-view note-volume histogram (#5a / C2). Returns the calling rep's own
 *  note counts for `date` bucketed by REP-LOCAL hour (0–23). Caller-scoped,
 *  read-only, bounded (single-day contiguous slice via readCallNoteRowsInRange_,
 *  reading only the Timestamp + DateLocal columns). The Timestamp is stored in
 *  the rep's own tz (empTz_, "yyyy-MM-dd'T'HH:mm:ss"), so its hour aligns with
 *  the Clock ribbon's local axis. A Date-coerced cell is re-formatted in empTz.
 *  Not enrolled / no sheet → all-zero buckets (never throws to the client). */
function getMyNoteHourBuckets(date) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    const empTz = empTz_(emp);
    const d = date || Utilities.formatDate(new Date(), empTz, 'yyyy-MM-dd');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { error: 'Invalid date format (expected yyyy-MM-dd).' };
    const buckets = new Array(24).fill(0);
    if (!emp.callNotesSheetId) return { buckets: buckets, date: d };
    const sheet = getCallNotesSheet_(emp);
    const located = readCallNoteRowsInRange_(sheet, d, d);
    for (let i = 0; i < located.length; i++) {
      const row = located[i].row;
      if (cnDateLocalString_(row[CN.DATE_LOCAL]) !== d) continue;
      // F(cycle-8): route the coerced-Date recovery through cnTimestampString_
      // (INV-142) — the old inline branch formatted in the REP's tz, but a
      // coercing-locale sheet coerces in the SHEET's tz (pinned to the ADP
      // tz, INV-110/141), so every CST rep's histogram landed ~11.5h off.
      // The recovered string's hour digits ARE the as-written rep-local hour.
      const m = cnTimestampString_(row[CN.TIMESTAMP]).match(/[T ](\d{2}):/);
      const hour = m ? parseInt(m[1], 10) : -1;
      if (hour >= 0 && hour < 24) buckets[hour]++;
    }
    return { buckets: buckets, date: d };
  } catch (err) { return { error: err.message }; }
}
/** Returns the calling rep's notes across a date range (startDate to endDate,
 *  inclusive). Caller-scoped via getEmployeeInfo_. Range capped at 90 days to
 *  prevent abuse. Returns notes sorted newest-first, with the same shape as
 *  getMyCallNotes so the client can render them identically. */
function getMyCallNotesRange(startDate, endDate) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate))
      return { error: 'Invalid start date (expected yyyy-MM-dd).' };
    if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
      return { error: 'Invalid end date (expected yyyy-MM-dd).' };
    if (startDate > endDate) return { error: 'Start date must be on or before end date.' };
    const daySpan = Math.round(
      (new Date(endDate + 'T00:00:00Z') - new Date(startDate + 'T00:00:00Z')) / 86400000
    );
    if (daySpan > 90) return { error: 'Date range cannot exceed 90 days.' };

    const empTz = empTz_(emp);
    const sheet = getCallNotesSheet_(emp);
    // Bounded read (L-8): contiguous date-range slice via the shared reader
    // (INV-46) instead of the full history. Per-row date re-checks stay
    // defensive.
    const located = readCallNoteRowsInRange_(sheet, startDate, endDate);
    const notes = [];
    for (let i = 0; i < located.length; i++) {
      const rowDate = cnDateLocalString_(located[i].row[CN.DATE_LOCAL]);
      if (rowDate < startDate || rowDate > endDate) continue;
      const note = callNoteRowToObject_(located[i]);
      notes.push(note);
    }
    notes.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return {
      startDate,
      endDate,
      notes,
      autoCopyFormat: CONFIG.CALL_NOTES.AUTO_COPY_FORMAT,
      timezone: empTz,
    };
  } catch (err) { return { error: err.message }; }
}
/** No-op pre-warm endpoint. Apps Script's first RPC on a cold web app pays
 *  ~500ms of script-context startup; firing this on Call Notes view enter
 *  warms the iframe so the rep's first real action (submit / flag / email)
 *  feels snappier. Cheap to call — the function does no work. */
function cnPing() {
  return { ok: true, t: Date.now() };
}
/** Ambient signal for the sidebar badge + stale-flag indicators.
 *  Returns {enrolled, unresolvedActionCount, staleActionCount, todayTotal,
 *  staleFlagHours} for the calling rep. Cached for CN_AMBIENT_CACHE_TTL
 *  seconds per rep. Mutating endpoints no longer eagerly invalidate the
 *  cache (the TTL doubles as the freshness ceiling, matching the 60s
 *  sidebar polling interval) — see INV-43. */
function getCallNotesAmbient() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    if (!emp.callNotesSheetId) return { enrolled: false };

    const cache = CacheService.getScriptCache();
    const cacheKey = CN_AMBIENT_CACHE_PREFIX + emp.id;
    const cached = cache.get(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { /* fall through to recompute */ }
    }

    const empTz = empTz_(emp);
    const today = Utilities.formatDate(new Date(), empTz, 'yyyy-MM-dd');
    // 7-day inclusive window for weekTotal (today and the 6 prior days).
    // Tz-audit 2026-08-17 (S2): derive the window's start FROM the rep-local
    // `today` with a UTC-noon anchor (the client mDaysAgo_ idiom) — the old
    // `new Date().setDate(-6)` subtracted in the SCRIPT tz (America/Chicago,
    // DST-observing) and then formatted in empTz, so on the two US
    // DST-transition days the window start landed a day off for reps whose
    // local time sat in the 00:00–00:59 hour. Cosmetic, but the two ends of
    // one window must not be derived in different zones.
    const weekStartDate = new Date(today + 'T12:00:00Z');
    weekStartDate.setUTCDate(weekStartDate.getUTCDate() - 6);
    const weekStart = weekStartDate.toISOString().substring(0, 10);

    const sheet = getCallNotesSheet_(emp);
    let unresolvedActionCount = 0;
    let staleActionCount = 0;
    let todayTotal = 0;
    let weekTotal = 0;
    // V4 Phase 4 — per-flag counts for the bottom quick-chip strip on the
    // Log view. `qa` counts training-flagged notes that received a manager
    // reply (non-empty subformData.trainingReply). Counts span the rep's
    // entire Sheet so the strip shows historical totals, not just today.
    const flagCounts = { all: 0, action: 0, training: 0, review: 0, unresolved: 0, qa: 0 };
    const staleMs = CONFIG.CALL_NOTES.STALE_FLAG_HOURS * 3600 * 1000;
    const nowMs = Date.now();
    // Bounded read (A6): this runs on the 60s sidebar poll, so read only the
    // 5 columns the counts need (Timestamp+DateLocal, FlagType+Resolved,
    // SubformData — ~3× fewer cells than the full 16-column history) and
    // JSON-parse SubformData only for training-flagged rows with a reply key.
    // Counts still span the entire Sheet (INV-39 — historical totals).
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const n = lastRow - 1;
      const tsDate  = sheet.getRange(2, CN.TIMESTAMP + 1, n, 2).getValues();  // Timestamp, DateLocal
      const flagRes = sheet.getRange(2, CN.FLAG_TYPE + 1, n, 2).getValues();  // FlagType, Resolved
      const subCol  = sheet.getRange(2, CN.SUBFORM_DATA + 1, n, 1).getValues();
      for (let i = 0; i < n; i++) {
        const dateLocal = cnDateLocalString_(tsDate[i][1]);
        if (dateLocal === today) todayTotal++;
        if (dateLocal && dateLocal >= weekStart && dateLocal <= today) weekTotal++;
        flagCounts.all++;
        const flagType = String(flagRes[i][0] || '').trim().toLowerCase();
        if (flagType === 'action')   flagCounts.action++;
        if (flagType === 'training') flagCounts.training++;
        if (flagType === 'review')   flagCounts.review++;
        if (flagType === 'action') {
          const resRaw = flagRes[i][1];
          const resStr = (resRaw === null || resRaw === undefined) ? ''
            : String(resRaw).trim().toLowerCase();
          const resolved = (resStr === 'true' || resStr === 'yes' || resStr === '1');
          if (!resolved) {
            unresolvedActionCount++;
            flagCounts.unresolved++;
            // F(M-14): coercion-safe — a locale-coerced Date cell zeroed the
            // stale counter (raw String → parseTimestampMs_ → null).
            const noteMs = parseTimestampMs_(cnTimestampString_(tsDate[i][0]), empTz);
            if (noteMs && (nowMs - noteMs) >= staleMs) staleActionCount++;
          }
        }
        if (flagType === 'training' && subCol[i][0]
            && String(subCol[i][0]).indexOf('"trainingReply"') >= 0) {
          try {
            const sub = JSON.parse(subCol[i][0]);
            if (sub && sub.trainingReply) flagCounts.qa++;
          } catch (e) { /* corrupt blob — skip, same as callNoteRowToObject_ */ }
        }
      }
    }
    const result = {
      enrolled: true,
      unresolvedActionCount,
      staleActionCount,
      todayTotal,
      weekTotal,
      flagCounts,
      staleFlagHours: CONFIG.CALL_NOTES.STALE_FLAG_HOURS,
      flagsVersion: cnFlagsVersion_(),
    };
    try { cache.put(cacheKey, JSON.stringify(result), CN_AMBIENT_CACHE_TTL); }
    catch (e) { /* cache put failed — return uncached, no behavioral impact */ }
    return result;
  } catch (err) { return { error: err.message }; }
}
/** Drop the per-rep ambient cache. No longer called from the mutation hot
 *  path (TTL handles freshness within the polling interval). Kept for ops
 *  to invalidate manually from the editor when needed (e.g., after a manual
 *  Sheet edit that should reflect in the badge immediately). */
function invalidateCnAmbientCache_(empId) {
  if (!empId) return;
  try { CacheService.getScriptCache().remove(CN_AMBIENT_CACHE_PREFIX + empId); }
  catch (e) { /* best-effort */ }
}
/** Returns the department options for the email composer + the dept→type
 *  suggestion map (for the dynamic update-type datalist). */
function getCallNotesDepartments() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    return {
      departments: Object.keys(getDepartmentEmails_()).concat(['Other']),
      suggestionsByDept: getUpdateSuggestions_(),
      defaultSuggestions: CONFIG.CALL_NOTES.UPDATE_SUGGESTIONS_DEFAULT,
      stateTaxRates: getStateTaxRates_(),
      stateAbbrToName: CONFIG.CALL_NOTES.STATE_ABBR_TO_NAME,
      ccEmail: CONFIG.CALL_NOTES.CC_EMAIL,
      voiceInputEnabled: !!getFlag_('voiceInput'),
      emailTemplates: getEmailTemplates_(),
      externalLinks: getExternalLinks_(),
      autoTagRules: getAutoTagRules_(),
      flags: getClientFeatureFlags_(),
    };
  } catch (err) { return { error: err.message }; }
}
/** Substring search across the rep's notes. field ∈ all | caller | issue |
 *  phone | trx (INV-45). `caller`/`all` fold in callback+patientAndTrx and
 *  `issue`/`all` fold in resolution; `phone` matches the callback column only
 *  and `trx` the patientAndTrx column only (the distinct scope tabs). If
 *  exact=true, matches patientAndTrx exactly (case-insensitive, trimmed) and
 *  ignores the field parameter — used by the "Find prior calls for this TRX"
 *  button on note cards to surface repeat-caller history without substring noise. */
function searchMyCallNotes(query, field, dateRange, exact, includeArchive) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    const q = String(query || '').trim();
    if (!q) return { results: [] };
    const empTz = empTz_(emp);
    const f = String(field || 'all').toLowerCase();
    const sheet = getCallNotesSheet_(emp);
    // Bounded read (L-8): a supplied full date range slices to the contiguous
    // block via the shared reader (INV-46); open-ended search still scans the
    // whole history but column-bounded to CN_HEADERS.length (no stray columns).
    const rangeStart = (dateRange && dateRange.start) || null;
    const rangeEnd   = (dateRange && dateRange.end)   || null;

    const qLower = q.toLowerCase();
    const isExact = exact === true;
    const results = [];
    const matchInto = function (located, isArchived) {
      for (let i = 0; i < located.length; i++) {
        const note = callNoteRowToObject_(located[i]);
        if (dateRange && dateRange.start && note.dateLocal < dateRange.start) continue;
        if (dateRange && dateRange.end   && note.dateLocal > dateRange.end)   continue;
        let hit = false;
        if (isExact) {
          if (String(note.patientAndTrx || '').toLowerCase().trim() === qLower) hit = true;
        } else if (f === 'phone') {
          if (String(note.callback || '').toLowerCase().indexOf(qLower) >= 0) hit = true;
        } else if (f === 'trx') {
          if (String(note.patientAndTrx || '').toLowerCase().indexOf(qLower) >= 0) hit = true;
        } else {
          if (f === 'caller' || f === 'all') {
            if ((note.caller + ' ' + note.callback + ' ' + note.patientAndTrx)
                  .toLowerCase().indexOf(qLower) >= 0) hit = true;
          }
          if (!hit && (f === 'issue' || f === 'all')) {
            if ((note.issue + ' ' + note.resolution).toLowerCase().indexOf(qLower) >= 0) hit = true;
          }
        }
        if (hit) { if (isArchived) note._archived = true; results.push(note); }
      }
    };

    matchInto(readCallNoteRowsInRange_(sheet, rangeStart, rangeEnd), false);
    // Include-archive: ALSO scan the cold NotesArchive tab when it exists.
    // Read-only — never creates the tab (getSheetByName, not getOrCreate).
    if (includeArchive === true) {
      const archive = sheet.getParent().getSheetByName(CONFIG.CALL_NOTES.ARCHIVE_TAB);
      if (archive) matchInto(readCallNoteRowsInRange_(archive, rangeStart, rangeEnd), true);
    }

    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (results.length > 200) results.length = 200;
    return { results, timezone: empTz, exact: isExact };
  } catch (err) { return { error: err.message }; }
}
/** Pure (Node-pinned) — stitches a single patient/order's events from the
 *  rep's own call notes + intake submissions + sent fillable forms into one
 *  newest-first timeline. `trx` is matched as a case-insensitive substring of
 *  each source's patient/TRX field; sent forms are linked by their source
 *  noteId being one of the matched notes (a fillable form is sent in a note's
 *  context). Sort key normalizes the heterogeneous source timestamps
 *  ("yyyy-MM-ddTHH:mm:ss" notes/forms vs "yyyy-MM-dd HH:mm:ss" intake) to a
 *  comparable "yyyy-MM-dd HH:mm:ss" prefix — good enough for display ordering
 *  of one rep's own data (the cross-tz caveat doesn't reorder same-source
 *  events). No braces inside string literals (extractRawFunction caveat). */
function buildPatientTimeline_(notes, submissions, forms, trx) {
  var t = String(trx || '').trim().toLowerCase();
  var keyOf = function (ts) { return String(ts || '').replace('T', ' ').slice(0, 19); };
  var events = [];
  var matchedNoteIds = {};
  (notes || []).forEach(function (n) {
    if (t && String(n.patientAndTrx || '').toLowerCase().indexOf(t) < 0) return;
    if (n.noteId) matchedNoteIds[String(n.noteId)] = true;
    events.push({
      kind: 'note', at: keyOf(n.timestamp), ts: String(n.timestamp || ''),
      noteId: String(n.noteId || ''), caller: String(n.caller || ''),
      patientAndTrx: String(n.patientAndTrx || ''), issue: String(n.issue || ''),
      resolution: String(n.resolution || ''), flagType: String(n.flagType || ''),
      emailedAt: String(n.emailedAt || ''),
    });
  });
  (submissions || []).forEach(function (s) {
    if (t && String(s.patientInfo || '').toLowerCase().indexOf(t) < 0) return;
    events.push({
      kind: 'intake', at: keyOf(s.timestamp), ts: String(s.timestamp || ''),
      formType: String(s.formType || ''), submissionId: String(s.submissionId || ''),
      patientInfo: String(s.patientInfo || ''), recipient: String(s.recipient || ''),
    });
  });
  (forms || []).forEach(function (f) {
    if (!f.noteId || !matchedNoteIds[String(f.noteId)]) return;
    events.push({
      kind: 'form', at: keyOf(f.createdAt), ts: String(f.createdAt || ''),
      token: String(f.token || ''), formName: String(f.formName || ''),
      status: String(f.status || ''), recipientName: String(f.recipientName || ''),
      noteId: String(f.noteId || ''),
    });
  });
  events.sort(function (a, b) { return a.at < b.at ? 1 : (a.at > b.at ? -1 : 0); });
  return events;
}
/** Patient/TRX timeline (#3) — caller-scoped, read-only. Stitches the rep's
 *  OWN call notes (TRX substring), intake submissions (patientInfo substring),
 *  and sent fillable forms (linked by source noteId) for one patient/order
 *  into a single newest-first timeline. Reuses the existing caller-scoped
 *  endpoints (each re-checks getEmployeeInfo_), so no new read surface and no
 *  cross-rep leak: submissions are filtered to the caller's own id even when a
 *  manager (who otherwise sees all) calls it. PHI is the caller's own. */
function getPatientTimeline(trx) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const t = String(trx || '').trim();
    if (!t) return { error: 'Enter a patient name or TRX number.' };

    // Cycle-9 L-8: track which sources actually failed — the bare catches
    // made a failed-to-load stream indistinguishable from "no data", so the
    // modal rendered an authoritative-looking timeline missing (e.g.) the
    // entire notes stream. Each delegate can also RETURN {error} without
    // throwing; both shapes count as a failed source.
    const failedSources = [];
    let notes = [];
    try {
      const nr = searchMyCallNotes(t, 'trx', null, false);
      if (nr && nr.error) failedSources.push('call notes');
      notes = (nr && nr.results) || [];
    } catch (e) { failedSources.push('call notes'); }

    let submissions = [];
    try {
      const sr = intakeListMySubmissions();
      if (sr && sr.error) failedSources.push('intake submissions');
      submissions = ((sr && sr.submissions) || []).filter(function (s) {
        return String(s.repId || '') === emp.id;   // caller-scoped even for managers
      });
    } catch (e) { failedSources.push('intake submissions'); }

    let forms = [];
    try {
      const fr = getMySentForms();
      if (fr && fr.error) failedSources.push('sent forms');
      forms = (fr && fr.forms) || [];
    } catch (e) { failedSources.push('sent forms'); }

    const events = buildPatientTimeline_(notes, submissions, forms, t);
    return { trx: t, events: events, timezone: empTz_(emp), count: events.length,
             partial: failedSources.length > 0, failedSources: failedSources };
  } catch (err) { return { error: err.message }; }
}

// ── Manager-gated call-notes views ──────────────────────────────────────
/** Lists reps enrolled in Call Notes (have a non-empty CallNotesSheetId in
 *  column L). Used by the manager Team Notes view's per-rep picker. Returns
 *  { reps: [{ id, name }] } sorted by name. */
function getEnrolledCallNotesReps() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const rows = getEmployeeRosterRows_();
    const reps = [];
    for (let i = 1; i < rows.length; i++) {
      if (!empRosterEmail_(rows[i])) continue;   // F3: one predicate
      // Cycle-9 L-11: TRIMMED check, matching getCallNotesEnrollment +
      // provisionCallNotesSheet's no-clobber test — a whitespace-only column-L
      // cell showed the rep as enrolled in the Per-Rep picker (whose reads
      // then fail) while the Admin panel offered to provision them.
      if (!cnEnrolledSheetId_(rows[i])) continue;
      reps.push({
        id: String(rows[i][EMP.ID]).trim(),
        name: String(rows[i][EMP.NAME]).trim(),
      });
    }
    reps.sort((a, b) => a.name.localeCompare(b.name));
    return { reps };
  } catch (err) { return { error: err.message }; }
}
/** Manager-gated enrollment roster for the Admin tab's auto-provision panel.
 *  Returns every roster member with an email, split into enrolled (has a
 *  CallNotesSheetId) and unenrolled. Read-only. */
function getCallNotesEnrollment() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    const rows = getEmployeeRosterRows_();
    const enrolled = [], unenrolled = [];
    for (let i = 1; i < rows.length; i++) {
      if (!empRosterEmail_(rows[i])) continue;   // F3: one predicate
      const rec = {
        id: String(rows[i][EMP.ID]).trim(),
        name: String(rows[i][EMP.NAME]).trim(),
      };
      if (cnEnrolledSheetId_(rows[i])) {
        enrolled.push(rec);
      } else {
        unenrolled.push(rec);
      }
    }
    enrolled.sort((a, b) => a.name.localeCompare(b.name));
    unenrolled.sort((a, b) => a.name.localeCompare(b.name));
    return { enrolled, unenrolled };
  } catch (err) { return { error: err.message }; }
}
/** Auto-provision a per-rep call-notes Sheet — the one-click replacement for the
 *  manual "copy the template Sheet, share it, paste the ID into column L"
 *  workflow. Manager-gated (INV-02) + locked (INV-01, mutates the Employees
 *  sheet). Creates a fresh Spreadsheet owned by the deployer (the script runs as
 *  USER_DEPLOYING, so the new Sheet lands in the deployer's Drive — exactly the
 *  ownership the per-rep model wants), provisions the `Notes` tab with the
 *  canonical CN_HEADERS, writes the new ID into EMP.CALL_NOTES_SHEET_ID (column
 *  L) of the rep's Employees row, invalidates the roster cache (INV-10), and
 *  writes a CallNotesProvision audit row. Idempotent: a rep who already has a
 *  sheetId is returned unchanged — it NEVER clobbers an existing Sheet (that
 *  would orphan the rep's note history). */
function provisionCallNotesSheet(repEmpId) {
  const callerEmp = getEmployeeInfo_();
  if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
  if (!repEmpId || !String(repEmpId).trim()) return { error: 'No employee specified.' };
  repEmpId = String(repEmpId).trim();
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getAdpSS_().getSheetByName(CONFIG.EMPLOYEE_TAB);
    const rows = sheet.getDataRange().getValues();
    let targetRow = -1, repName = '', existing = '';
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][EMP.ID]).trim() !== repEmpId) continue;
      targetRow = i;
      repName = String(rows[i][EMP.NAME]).trim();
      existing = cnEnrolledSheetId_(rows[i]);
      break;
    }
    if (targetRow < 0) return { error: 'Employee not found: ' + repEmpId };
    if (existing) {
      // Already enrolled — never clobber an existing Sheet (would orphan history).
      let url = '';
      try { url = SpreadsheetApp.openById(existing).getUrl(); } catch (e) {}
      return { success: true, alreadyEnrolled: true, sheetId: existing, url: url, repName: repName };
    }
    // Create the new per-rep Spreadsheet (owned by the deployer / script-as-Me).
    const title = 'Call Notes — ' + (repName || repEmpId) + ' (' + repEmpId + ')';
    // createPinnedSpreadsheet_ pins the new Sheet's TIMEZONE + LOCALE to the
    // ADP sheet's. DateLocal strings are coerced to Dates in THIS sheet's tz
    // but recovered by normalizeDate_ in the ADP sheet's tz — the round-trip
    // only holds when the two match (and a coercing locale would turn the
    // ISO-T Timestamp column into Dates on read — the M-14 class).
    const ss = createPinnedSpreadsheet_(title);
    // Provision the Notes tab with the canonical header (rename the default sheet
    // rather than insert a second one, so there's no stray "Sheet1").
    const notes = ss.getSheets()[0];
    notes.setName(CONFIG.CALL_NOTES.NOTES_TAB);
    notes.appendRow(CN_HEADERS);
    notes.setFrozenRows(1);
    notes.getRange(1, 1, 1, CN_HEADERS.length).setFontWeight('bold');
    const sheetId = ss.getId();
    // Write the ID into column L of the rep's Employees row + invalidate cache.
    sheet.getRange(targetRow + 1, EMP.CALL_NOTES_SHEET_ID + 1).setValue(sheetId);
    invalidateRosterCache_();
    writeAuditLog_(callerEmp, 'CallNotesProvision', repEmpId, '', false, 0,
      'sheetId=' + sheetId, callerEmp.email);
    return { success: true, sheetId: sheetId, url: ss.getUrl(), repName: repName };
  } catch (err) {
    return { error: err.message };
  } finally {
    lock.releaseLock();
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  Team-member onboarding (operator request 2026-08-07, pre-pilot).
//  The roster row was the ONE remaining manual onboarding step (a hand edit of
//  the payroll-adjacent Employees sheet); these three endpoints make it an
//  Admin-tab flow: add (validated append + optional one-click Call Notes
//  provisioning), a readiness panel, and offboard (clear the EMAIL, keep the
//  name — the documented roster convention, INV-183). All three are
//  ADMIN-gated (INV-136 — roster management sits in the config tier).
// ════════════════════════════════════════════════════════════════════════════
/** Round 2 · 8h — Tag taxonomy aggregate for the Admin tab. Scans every
 *  enrolled rep's call-notes Sheet for subformData.tags[] entries and
 *  returns unique tags with usage counts. Manager-gated; read-only.
 *  Returns: { tags: [{ tag, count, lastSeen, archived }], archivedOnlyTags,
 *  totalNotes, repsScanned }. Archived tags (from CN_ARCHIVED_TAGS Script
 *  Property) are marked but kept in the response so the admin UI can show
 *  them with a "Restore" action. archivedOnlyTags carries tags that are
 *  archived but no longer in use (count=0). */
function getCallNotesTagTaxonomy() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    // S2: serve the whole aggregate from cache when warm — avoids re-scanning
    // every rep's Sheet on each Admin-tab load. Invalidated by tag-admin ops.
    const taxCache = CacheService.getScriptCache();
    const taxCached = taxCache.get(CN_TAXONOMY_CACHE_KEY);
    if (taxCached) { try { return JSON.parse(taxCached); } catch (e) { /* recompute */ } }
    const archivedSet = getArchivedTagsSet_();
    const roster = getEmployeeRosterRows_();
    const counts = {};       // tag → { tag, count, lastSeen, archived }
    let totalNotes = 0;
    let repsScanned = 0;
    const skippedReps = [];
    for (let i = 1; i < roster.length; i++) {
      const sheetId = cnEnrolledSheetId_(roster[i]);   // F14: trimmed predicate
      if (!sheetId) continue;
      try {
        const repEmp = {
          id: String(roster[i][EMP.ID]).trim(),
          callNotesSheetId: sheetId,
        };
        const sheet = getCallNotesSheet_(repEmp);
        repsScanned++;
        // S2: the taxonomy only needs the SubformData (tags) + DateLocal
        // (lastSeen) columns — read those 2 columns instead of every note's
        // full 16-column row (~8x fewer cells across all reps' history).
        const lastRow = sheet.getLastRow();
        if (lastRow >= 2) {
          const rowN = lastRow - 1;
          const subCol  = sheet.getRange(2, CN.SUBFORM_DATA + 1, rowN, 1).getValues();
          const dateCol = sheet.getRange(2, CN.DATE_LOCAL + 1, rowN, 1).getValues();
          for (let j = 0; j < rowN; j++) {
            totalNotes++;
            const subRaw = subCol[j][0];
            if (!subRaw) continue;
            let sub = null;
            try { sub = JSON.parse(subRaw); } catch (e) { continue; }
            if (!sub || !Array.isArray(sub.tags)) continue;
            const dateLocal = cnDateLocalString_(dateCol[j][0]);
            sub.tags.forEach(function (t) {
            const tag = String(t || '').trim().toLowerCase();
            if (!tag) return;
            if (!counts[tag]) counts[tag] = { tag: tag, count: 0, lastSeen: '', archived: !!archivedSet[tag] };
            counts[tag].count++;
            if (dateLocal > counts[tag].lastSeen) counts[tag].lastSeen = dateLocal;
            });
          }
        }
      } catch (e) {
        // C17 batch-2 (INV-187): the skipped rep rides the result.
        skippedReps.push(String(roster[i][EMP.NAME]).trim() || String(roster[i][EMP.ID]).trim());
      }
    }
    // Archived-but-unused tags — admins may want to keep them visible to
    // restore later, so emit them as a separate list.
    const archivedOnlyTags = [];
    Object.keys(archivedSet).forEach(function (tag) {
      if (!counts[tag]) archivedOnlyTags.push({ tag: tag, count: 0, lastSeen: '', archived: true });
    });
    archivedOnlyTags.sort(function (a, b) { return a.tag.localeCompare(b.tag); });
    const tags = Object.keys(counts).map(function (k) { return counts[k]; });
    tags.sort(function (a, b) { return b.count - a.count || a.tag.localeCompare(b.tag); });
    const taxResult = { tags: tags, archivedOnlyTags: archivedOnlyTags, totalNotes: totalNotes, repsScanned: repsScanned, skippedReps: skippedReps };
    try {
      // C17 batch-2 — cache only fully-successful rounds (the INV-129 rule):
      // a partial aggregate must not be pinned as fresh for the full TTL.
      const payload = JSON.stringify(taxResult);
      if (skippedReps.length > 0) { /* partial — do not cache */ }
      else if (payload.length <= 90000) taxCache.put(CN_TAXONOMY_CACHE_KEY, payload, CN_TAXONOMY_CACHE_TTL);
      else console.warn('Tag taxonomy too large to cache (' + payload.length + ' bytes)');
    } catch (e) { /* cache put failed — return uncached, no behavioral impact */ }
    return taxResult;
  } catch (err) { return { error: err.message }; }
}
/** Drops the tag-taxonomy whole-result cache so the next Admin-tab load
 *  recomputes. Called by the tag-admin endpoints (rename/merge/archive) so a
 *  manager sees their change reflected immediately rather than after the TTL.
 *  Also drops the tag-TRENDS cache (#5) since a rename/merge/archive
 *  re-attributes counts there too. */
function invalidateCnTaxonomyCache_() {
  try {
    const c = CacheService.getScriptCache();
    c.remove(CN_TAXONOMY_CACHE_KEY);
    c.remove(CN_TAG_TRENDS_CACHE_KEY);
  } catch (e) { /* best-effort */ }
}
/** yyyy-MM-dd → integer days since the Unix epoch (UTC, tz-safe — never a
 *  local-time Date), or null on a malformed date. The inverse is
 *  cnDayNumToIso_. Pure. */
function cnIsoToDayNum_(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : null;
}
function cnDayNumToIso_(n) {
  const d = new Date(n * 86400000);
  return d.getUTCFullYear() + '-' +
    ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' +
    ('0' + d.getUTCDate()).slice(-2);
}
/** Returns `weeks` Monday-anchored week-start day-numbers (oldest→newest), the
 *  last being the Monday of refIso's week. Pure. */
function cnTrendWeekStarts_(refIso, weeks) {
  const ref = cnIsoToDayNum_(refIso);
  if (ref == null) return [];
  const wd = (((ref + 4) % 7) + 7) % 7;       // 0=Sun … 6=Sat (epoch day 0 = Thu)
  const monday = ref - ((wd + 6) % 7);        // Monday of ref's week
  const out = [];
  for (let i = (weeks | 0) - 1; i >= 0; i--) out.push(monday - i * 7);
  return out;
}
/** Buckets {tag,date} events into `weeks` Monday weeks ending at refIso's week.
 *  Returns { weekStarts:[iso…], series:[{tag, counts:[…], total, delta}] }
 *  sorted by total desc, truncated to topK. Events outside the window are
 *  dropped. Pure (no Sheets / Date-local). */
function cnTagTrendsFromEvents_(events, refIso, weeks, topK) {
  weeks = Math.max(1, weeks | 0);
  const starts = cnTrendWeekStarts_(refIso, weeks);
  if (!starts.length) return { weekStarts: [], series: [] };
  const first = starts[0];
  const counts = {};   // tag → int[weeks]
  (events || []).forEach(function (ev) {
    const d = cnIsoToDayNum_(ev && ev.date);
    if (d == null) return;
    const idx = Math.floor((d - first) / 7);
    if (idx < 0 || idx >= weeks) return;
    const tag = String((ev && ev.tag) || '').trim().toLowerCase();
    if (!tag) return;
    if (!counts[tag]) { counts[tag] = []; for (let k = 0; k < weeks; k++) counts[tag].push(0); }
    counts[tag][idx]++;
  });
  let series = Object.keys(counts).map(function (tag) {
    const c = counts[tag];
    let total = 0;
    for (let i = 0; i < c.length; i++) total += c[i];
    const delta = c[weeks - 1] - (weeks >= 2 ? c[weeks - 2] : 0);
    return { tag: tag, counts: c, total: total, delta: delta };
  });
  series.sort(function (a, b) { return b.total - a.total || a.tag.localeCompare(b.tag); });
  if (topK > 0) series = series.slice(0, topK);
  return { weekStarts: starts.map(cnDayNumToIso_), series: series };
}
/** Manager Admin "Tag Trends" — weekly per-tag counts over the trailing
 *  CN_TAG_TRENDS_WEEKS. Manager-gated (INV-02/31), read-only, cached, PHI-free.
 *  Reuses the taxonomy's 2-column scan (SubformData tags + DateLocal) but
 *  buckets by week instead of total+lastSeen; archived tags are excluded; the
 *  scan is window-pre-filtered so the events array stays bounded. */
function getCallNotesTagTrends() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    const cache = CacheService.getScriptCache();
    const cached = cache.get(CN_TAG_TRENDS_CACHE_KEY);
    if (cached) { try { return JSON.parse(cached); } catch (e) { /* recompute */ } }

    const weeks = CN_TAG_TRENDS_WEEKS;
    const refIso = fmtDate_(new Date());   // CONFIG.TIMEZONE "today" — manager-facing aggregate
    const starts = cnTrendWeekStarts_(refIso, weeks);
    const windowStartIso = starts.length ? cnDayNumToIso_(starts[0]) : refIso;
    const archivedSet = getArchivedTagsSet_();
    const roster = getEmployeeRosterRows_();
    const events = [];
    const skippedReps = [];
    let repsScanned = 0;
    for (let i = 1; i < roster.length; i++) {
      const sheetId = cnEnrolledSheetId_(roster[i]);   // F14: trimmed predicate
      if (!sheetId) continue;
      try {
        const repEmp = { id: String(roster[i][EMP.ID]).trim(), callNotesSheetId: sheetId };
        const sheet = getCallNotesSheet_(repEmp);
        repsScanned++;
        const lastRow = sheet.getLastRow();
        if (lastRow >= 2) {
          const rowN = lastRow - 1;
          const subCol  = sheet.getRange(2, CN.SUBFORM_DATA + 1, rowN, 1).getValues();
          const dateCol = sheet.getRange(2, CN.DATE_LOCAL + 1, rowN, 1).getValues();
          for (let j = 0; j < rowN; j++) {
            const subRaw = subCol[j][0];
            if (!subRaw) continue;
            let sub = null;
            try { sub = JSON.parse(subRaw); } catch (e) { continue; }
            if (!sub || !Array.isArray(sub.tags) || !sub.tags.length) continue;
            const dateLocal = cnDateLocalString_(dateCol[j][0]);
            // Window pre-filter (yyyy-MM-dd lexicographic = chronological) keeps
            // the events array bounded to the trailing window.
            if (!dateLocal || dateLocal < windowStartIso) continue;
            sub.tags.forEach(function (t) {
              const tag = String(t || '').trim().toLowerCase();
              if (!tag || archivedSet[tag]) return;   // archived tags excluded from trends
              events.push({ tag: tag, date: dateLocal });
            });
          }
        }
      } catch (e) {
        // C17 batch-2 (INV-187): the skipped rep rides the result.
        skippedReps.push(String(roster[i][EMP.NAME]).trim() || String(roster[i][EMP.ID]).trim());
      }
    }
    const out = cnTagTrendsFromEvents_(events, refIso, weeks, CN_TAG_TRENDS_TOPK);
    out.weeks = weeks;
    out.repsScanned = repsScanned;
    out.skippedReps = skippedReps;
    try {
      // C17 batch-2 — cache only fully-successful rounds (INV-129).
      const payload = JSON.stringify(out);
      if (skippedReps.length === 0 && payload.length <= 90000) cache.put(CN_TAG_TRENDS_CACHE_KEY, payload, CN_TAG_TRENDS_CACHE_TTL);
    } catch (e) { /* return uncached */ }
    return out;
  } catch (err) { return { error: err.message }; }
}
/** Rep-callable (caller-scoped, read-only) tag-suggestion source for the Log
 *  view's autocomplete datalist (B3). Returns the UNIQUE, non-archived tags the
 *  CALLER has used in their own per-rep Sheet — a column-bounded read of just
 *  the SubformData column (~16× fewer cells than a full read). Cross-rep
 *  suggestions are intentionally out of scope (the manager taxonomy aggregate
 *  is the expensive, manager-gated path); own-history keeps this cheap and
 *  leak-free. Not enrolled → `{ tags: [] }`, never throws. */
function getCallNoteTagSuggestions() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    if (!emp.callNotesSheetId) return { tags: [] };
    const sheet = getCallNotesSheet_(emp);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { tags: [] };
    const subVals = sheet.getRange(2, CN.SUBFORM_DATA + 1, lastRow - 1, 1).getValues();
    const archived = getArchivedTagsSet_();
    const seen = {};
    for (let i = 0; i < subVals.length; i++) {
      let sub = null;
      try { sub = JSON.parse(subVals[i][0]); } catch (_) {}
      if (!sub || !Array.isArray(sub.tags)) continue;
      sub.tags.forEach(function (t) {
        const tag = String(t || '').trim().toLowerCase();
        if (tag && !archived[tag]) seen[tag] = true;
      });
    }
    return { tags: Object.keys(seen).sort() };
  } catch (err) { return { error: err.message }; }
}

// ── Round 2 follow-on (Tag taxonomy actions) — Admin tag mutations ────────
// rename / merge / archive operate across every enrolled rep's per-rep Sheet.
// Manager-gated, locked at the project level (LockService.getScriptLock).
// Each writes a CallNoteTagAdmin audit row on the calling manager's home
// audit sheet recording the action + the affected tag(s) + counts touched.
/** Returns { tag: true } for each archived tag stored in Script Properties.
 *  The property is a JSON-encoded array of lowercase tag strings; missing
 *  or malformed values return an empty set (defensive). */
function getArchivedTagsSet_() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty(CN_ARCHIVED_TAGS_PROP);
    if (!raw) return {};
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return {};
    const out = {};
    arr.forEach(function (t) {
      const tag = String(t || '').trim().toLowerCase();
      if (tag) out[tag] = true;
    });
    return out;
  } catch (e) { return {}; }
}
/** Writes the archived-tags set back to Script Properties as a JSON array
 *  of lowercase tag strings. Empty set removes the property. */
function setArchivedTagsSet_(setObj) {
  const props = PropertiesService.getScriptProperties();
  const arr = Object.keys(setObj || {}).filter(function (k) { return !!setObj[k]; }).sort();
  if (arr.length === 0) {
    props.deleteProperty(CN_ARCHIVED_TAGS_PROP);
  } else {
    propSetBounded_(CN_ARCHIVED_TAGS_PROP, JSON.stringify(arr), { hint: 'unarchive a tag' });
  }
}
/** Validates + normalizes a tag string. Mirrors sanitizeTagsArray_'s
 *  per-tag rule: lowercase kebab-case, 2–24 chars. Returns '' on invalid. */
function normalizeTagForAdmin_(raw) {
  const lower = String(raw || '').trim().toLowerCase();
  const tag = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (tag.length < 2 || tag.length > 24) return '';
  return tag;
}
/** Walks every enrolled rep's Sheet; for each note whose subformData.tags
 *  contains `oldTag`, applies `transform(tags)` to the array and writes
 *  the new subformData JSON back. Returns aggregate { repsTouched,
 *  notesUpdated }. Wrapped in caller's lock — DO NOT call without the
 *  caller holding LockService.getScriptLock. */
function applyTagTransformAcrossReps_(oldTag, transform) {
  const roster = getEmployeeRosterRows_();
  let repsTouched = 0, notesUpdated = 0;
  for (let i = 1; i < roster.length; i++) {
    const sheetId = cnEnrolledSheetId_(roster[i]);   // F14: trimmed predicate
    if (!sheetId) continue;
    try {
      const repEmp = {
        id: String(roster[i][EMP.ID]).trim(),
        callNotesSheetId: sheetId,
      };
      const sheet = getCallNotesSheet_(repEmp);
      const rows = sheet.getDataRange().getValues();
      let repHadUpdate = false;
      for (let j = 1; j < rows.length; j++) {
        const subRaw = rows[j][CN.SUBFORM_DATA];
        if (!subRaw) continue;
        let sub = null;
        try { sub = JSON.parse(subRaw); } catch (e) { continue; }
        if (!sub || !Array.isArray(sub.tags)) continue;
        if (sub.tags.indexOf(oldTag) < 0) continue;
        const next = transform(sub.tags.slice());
        if (!arraysEqual_(next, sub.tags)) {
          sub.tags = next;
          sheet.getRange(j + 1, CN.SUBFORM_DATA + 1).setValue(JSON.stringify(sub));
          notesUpdated++;
          repHadUpdate = true;
        }
      }
      if (repHadUpdate) repsTouched++;
    } catch (e) { /* skip unreachable rep sheet */ }
  }
  return { repsTouched: repsTouched, notesUpdated: notesUpdated };
}
/** Round 2 follow-on (8h Admin tag actions) — Renames a tag across every
 *  enrolled rep's notes. Manager-gated, locked at the project level so
 *  concurrent submits / other tag mutations can't interleave. If the new
 *  tag already exists on a note, the rename collapses (dedupes) by
 *  dropping the old tag from those rows. Audit row records old+new+counts. */
function renameCallNoteTag(oldTag, newTag) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { success: false, error: 'Admin access required.' };
    const oldT = normalizeTagForAdmin_(oldTag);
    const newT = normalizeTagForAdmin_(newTag);
    if (!oldT) return { success: false, error: 'Invalid source tag.' };
    if (!newT) return { success: false, error: 'Invalid target tag (lowercase kebab-case, 2–24 chars).' };
    if (oldT === newT) return { success: false, error: 'Source and target are the same tag.' };
    const result = applyTagTransformAcrossReps_(oldT, function (tags) {
      // Replace oldT with newT; dedupe so the same tag never appears twice.
      const seen = {};
      const out = [];
      tags.forEach(function (t) {
        const next = (t === oldT) ? newT : t;
        if (!seen[next]) { seen[next] = true; out.push(next); }
      });
      return out;
    });
    writeAuditLog_(callerEmp, 'CallNoteTagAdmin', '', '', false, 0,
      `rename ${oldT} → ${newT}; reps=${result.repsTouched}, notes=${result.notesUpdated}`,
      callerEmp.email);
    invalidateCnTaxonomyCache_();
    return { success: true, action: 'rename', oldTag: oldT, newTag: newT,
             repsTouched: result.repsTouched, notesUpdated: result.notesUpdated };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Round 2 follow-on (8h Admin tag actions) — Merges sourceTag into
 *  targetTag across every enrolled rep's notes. Identical to rename for
 *  the row-level operation (the dedupe in the transform handles the case
 *  where the note already has the target). The distinction from rename is
 *  primarily UX: the manager confirmed they expect targetTag to already
 *  exist on some notes. Audit row labels it 'merge' for trail clarity. */
function mergeCallNoteTags(sourceTag, targetTag) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { success: false, error: 'Admin access required.' };
    const srcT = normalizeTagForAdmin_(sourceTag);
    const tgtT = normalizeTagForAdmin_(targetTag);
    if (!srcT) return { success: false, error: 'Invalid source tag.' };
    if (!tgtT) return { success: false, error: 'Invalid target tag (lowercase kebab-case, 2–24 chars).' };
    if (srcT === tgtT) return { success: false, error: 'Source and target are the same tag.' };
    const result = applyTagTransformAcrossReps_(srcT, function (tags) {
      const seen = {};
      const out = [];
      tags.forEach(function (t) {
        const next = (t === srcT) ? tgtT : t;
        if (!seen[next]) { seen[next] = true; out.push(next); }
      });
      return out;
    });
    writeAuditLog_(callerEmp, 'CallNoteTagAdmin', '', '', false, 0,
      `merge ${srcT} → ${tgtT}; reps=${result.repsTouched}, notes=${result.notesUpdated}`,
      callerEmp.email);
    invalidateCnTaxonomyCache_();
    return { success: true, action: 'merge', sourceTag: srcT, targetTag: tgtT,
             repsTouched: result.repsTouched, notesUpdated: result.notesUpdated };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Round 2 follow-on (8h Admin tag actions) — Archives or unarchives a
 *  tag. Archive does NOT remove the tag from existing notes — they
 *  continue to render their tag chips. Archive only hides the tag from
 *  future tag-suggestion surfaces (when those land — none exist today)
 *  and visually flags it in the Admin taxonomy table so managers see it
 *  as a deprecated category. Stored in Script Property CN_ARCHIVED_TAGS
 *  (JSON array of lowercase tag strings). */
function archiveCallNoteTag(tag, archived) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { success: false, error: 'Admin access required.' };
    const t = normalizeTagForAdmin_(tag);
    if (!t) return { success: false, error: 'Invalid tag.' };
    const set = getArchivedTagsSet_();
    const wasArchived = !!set[t];
    const wantArchived = !!archived;
    if (wasArchived === wantArchived) {
      return { success: true, action: wantArchived ? 'archive' : 'unarchive',
               tag: t, alreadyInState: true };
    }
    if (wantArchived) set[t] = true;
    else delete set[t];
    setArchivedTagsSet_(set);
    writeAuditLog_(callerEmp, 'CallNoteTagAdmin', '', '', false, 0,
      `${wantArchived ? 'archive' : 'unarchive'} ${t}`,
      callerEmp.email);
    invalidateCnTaxonomyCache_();
    return { success: true, action: wantArchived ? 'archive' : 'unarchive', tag: t };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Manager view of any single rep's notes. */
function managerGetCallNotes(repEmpId, date, filter) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const target = lookupEmployeeById_(repEmpId);
    if (!target) return { error: 'Employee not found.' };
    if (!target.callNotesSheetId) return { error: 'This rep has no call-notes Sheet configured.' };

    const empTz = target.timezone || CONFIG.TIMEZONE;
    const dateStr = date || Utilities.formatDate(new Date(), empTz, 'yyyy-MM-dd');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr))
      return { error: 'Invalid date format (expected yyyy-MM-dd).' };
    const flt = String(filter || 'all').toLowerCase();

    const sheet = getCallNotesSheet_(target);
    // F(cycle-8): the last unbounded per-rep read — every sibling single-day
    // reader already routes through the bounded date-slice (L-8/S2, INV-46
    // contiguity). The per-row date re-check below stays as the defensive
    // guard, same as the rep-facing readers.
    const located = readCallNoteRowsInRange_(sheet, dateStr, dateStr);
    const notes = [];
    for (let i = 0; i < located.length; i++) {
      const rowDate = cnDateLocalString_(located[i].row[CN.DATE_LOCAL]);
      if (rowDate !== dateStr) continue;
      const note = callNoteRowToObject_(located[i]);
      if (!callNoteMatchesFilter_(note, flt)) continue;
      notes.push(note);
    }
    notes.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return { date: dateStr, filter: flt, notes, repName: target.name, repId: target.id, timezone: empTz };
  } catch (err) { return { error: err.message }; }
}
/** Manager search across all enrolled reps' call-notes Sheets. */
/** S2: reads a per-rep call-notes sheet's data rows (full CN_HEADERS width)
 *  as located {row, rowIndex} objects, bounded to [start, end] inclusive when
 *  BOTH bounds are provided. Notes are appended in DateLocal order, so a date
 *  range maps to a contiguous row slice (same assumption as
 *  exportCallNotesRange / INV-46) — the bounded path scans only the 1-column
 *  date range to find the slice, then reads just that block instead of every
 *  rep's full history. When either bound is missing, returns ALL data rows
 *  (callers that need the whole history — open-ended search — pass no range).
 *  Callers still re-check each row's date defensively. */
function readCallNoteRowsInRange_(sheet, start, end) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const n = lastRow - 1;
  const out = [];
  if (!start || !end) {
    const vals = sheet.getRange(2, 1, n, CN_HEADERS.length).getValues();
    for (let i = 0; i < vals.length; i++) out.push({ row: vals[i], rowIndex: i + 2 });
    return out;
  }
  const dateCol = sheet.getRange(2, CN.DATE_LOCAL + 1, n, 1).getValues();
  let firstMatch = -1, lastMatch = -1;
  for (let d = 0; d < dateCol.length; d++) {
    const dl = cnDateLocalString_(dateCol[d][0]);
    if (dl >= start && dl <= end) {
      if (firstMatch < 0) firstMatch = d;
      lastMatch = d;
    }
  }
  if (firstMatch < 0) return [];
  const block = sheet.getRange(firstMatch + 2, 1, lastMatch - firstMatch + 1, CN_HEADERS.length).getValues();
  for (let i = 0; i < block.length; i++) out.push({ row: block[i], rowIndex: firstMatch + i + 2 });
  return out;
}
function managerSearchCallNotes(query, field, repFilter, dateRange, includeArchive) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const q = String(query || '').trim();
    if (!q) return { results: [] };
    const qLower = q.toLowerCase();
    const f = String(field || 'all').toLowerCase();

    const roster = getEmployeeRosterRows_();
    const results = [];
    const skippedReps = [];
    const dr = (dateRange && dateRange.start && dateRange.end) ? dateRange : {};
    for (let r = 1; r < roster.length; r++) {
      const repId = String(roster[r][EMP.ID]).trim();
      if (repFilter && repFilter.length && repFilter.indexOf(repId) < 0) continue;
      const sheetId = cnEnrolledSheetId_(roster[r]);   // F14: trimmed predicate
      if (!sheetId) continue;
      const repName = String(roster[r][EMP.NAME]).trim();
      let target;
      try {
        target = { id: repId, name: repName, callNotesSheetId: sheetId };
        const sheet = getCallNotesSheet_(target);
        // Bounded read when a full date range is supplied; full scan for
        // open-ended search. Per-note date re-checks below stay as defensive
        // guards (and handle the partial-range case).
        const matchInto = function (located, isArchived) {
          for (let i = 0; i < located.length; i++) {
            const note = callNoteRowToObject_(located[i]);
            if (dateRange && dateRange.start && note.dateLocal < dateRange.start) continue;
            if (dateRange && dateRange.end   && note.dateLocal > dateRange.end)   continue;
            let hit = false;
            if (f === 'phone') {
              if (String(note.callback || '').toLowerCase().indexOf(qLower) >= 0) hit = true;
            } else if (f === 'trx') {
              if (String(note.patientAndTrx || '').toLowerCase().indexOf(qLower) >= 0) hit = true;
            } else {
              if (f === 'caller' || f === 'all') {
                if ((note.caller + ' ' + note.callback + ' ' + note.patientAndTrx)
                      .toLowerCase().indexOf(qLower) >= 0) hit = true;
              }
              if (!hit && (f === 'issue' || f === 'all')) {
                if ((note.issue + ' ' + note.resolution).toLowerCase().indexOf(qLower) >= 0) hit = true;
              }
            }
            if (hit) {
              note.repId = repId; note.repName = repName;
              if (isArchived) note._archived = true;
              results.push(note);
            }
          }
        };
        matchInto(readCallNoteRowsInRange_(sheet, dr.start, dr.end), false);
        // Include-archive: read-only scan of the cold NotesArchive tab when present.
        if (includeArchive === true) {
          const archive = sheet.getParent().getSheetByName(CONFIG.CALL_NOTES.ARCHIVE_TAB);
          if (archive) matchInto(readCallNoteRowsInRange_(archive, dr.start, dr.end), true);
        }
      } catch (e) {
        // A broken per-rep Sheet shouldn't break the cross-rep search — but
        // it must RIDE the result (C17 batch-2, INV-187): a silently-missing
        // rep made the search read as complete.
        console.warn('managerSearchCallNotes skipped rep ' + repId + ': ' + e.message);
        skippedReps.push(String(roster[r][EMP.NAME]).trim() || repId);
      }
    }
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (results.length > 500) results.length = 500;
    return { results, skippedReps };
  } catch (err) { return { error: err.message }; }
}
function managerGetUnresolvedActionCount() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    // S2: serve the badge count from cache when warm (TTL-only freshness, like
    // the ambient cache — at most CN_UNRESOLVED_CACHE_TTL stale). Avoids a
    // full 2-column scan of every rep's Sheet on each Team Notes landing.
    const uCache = CacheService.getScriptCache();
    const uCached = uCache.get(CN_UNRESOLVED_CACHE_KEY);
    if (uCached) { try { return JSON.parse(uCached); } catch (e) { /* recompute */ } }
    const roster = getEmployeeRosterRows_();
    let total = 0;
    let skippedCount = 0;
    for (let r = 1; r < roster.length; r++) {
      const sheetId = cnEnrolledSheetId_(roster[r]);   // F14: trimmed predicate
      if (!sheetId) continue;
      try {
        const sheet = getCallNotesSheet_({
          id: String(roster[r][EMP.ID]).trim(),
          name: String(roster[r][EMP.NAME]).trim(),
          callNotesSheetId: sheetId,
        });
        const flagCol = sheet.getRange(2, CN.FLAG_TYPE + 1, Math.max(sheet.getLastRow() - 1, 1), 2).getValues();
        for (let i = 0; i < flagCol.length; i++) {
          const ft = String(flagCol[i][0] || '').trim().toLowerCase();
          const res = String(flagCol[i][1] || '').trim().toLowerCase();
          if (ft === 'action' && res !== 'true' && res !== 'yes' && res !== '1') total++;
        }
      } catch (_) { skippedCount++; }
    }
    // C17 batch-2 (INV-187): an unreadable rep Sheet makes this a LOWER
    // BOUND — the flag rides the result, and a partial round is never
    // cached (INV-129; the old shape CACHED the undercount for the full
    // 2-minute TTL).
    const uResult = { count: total, partial: skippedCount > 0 };
    if (skippedCount === 0) {
      try { uCache.put(CN_UNRESOLVED_CACHE_KEY, JSON.stringify(uResult), CN_UNRESOLVED_CACHE_TTL); }
      catch (e) { /* best-effort */ }
    }
    return uResult;
  } catch (err) { return { error: err.message }; }
}
/** Parses the noteId out of an AuditLog Notes field (e.g.
 *  "noteId=<uuid>; urgent=on"). Returns '' when none is present. */
function cnExtractAuditNoteId_(notes) {
  const m = String(notes || '').match(/noteId=([0-9a-fA-F][0-9a-fA-F-]{7,})/);
  return m ? m[1] : '';
}
/** Reads the most-recent CN_AUDIT_MAX_SCAN AuditLog rows (bounded), keeping
 *  only the call-note action set, and maps each into a normalized object.
 *  Returns { rows: [...newest-first...], scannedAll: bool } where scannedAll
 *  is true when the whole sheet fit within the scan cap (so callers can flag
 *  potential truncation). The AuditLog is append-only/chronological, so the
 *  tail is the most recent activity. */
function cnReadCallNoteAuditRows_() {
  const sheet = getOrCreateAuditSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { rows: [], scannedAll: true, oldestScannedDay: null };
  const startRow = Math.max(2, lastRow - CN_AUDIT_MAX_SCAN + 1);
  const scannedAll = startRow === 2;
  const numRows = lastRow - startRow + 1;
  const data = sheet.getRange(startRow, 1, numRows, 10).getValues();
  const mgrTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
  // Cycle-11 L-4: the WINDOW's true oldest day (data[0] — append-order), not
  // the oldest MATCHING row. The truncated flag keyed off matching rows only,
  // so a 4000-row stretch with zero CN-action rows showed an empty result
  // with no "narrow the range" hint while older matches existed past the cap.
  const oldestScannedDay =
    String(normalizeAuditTs_(data[0][AUDIT.TS]) || '').substring(0, 10) || null;
  const out = [];
  for (let i = data.length - 1; i >= 0; i--) {  // newest-first
    if (CN_AUDIT_ACTIONS.indexOf(String(data[i][AUDIT.ACTION])) < 0) continue;
    // Batch 3: the typed reader recovers coerced cols once. `dateLocal` maps from
    // the recovered PunchDate — the compliance panel's "View note" deep-link hands
    // it to managerGetCallNotes (^\d{4}-\d{2}-\d{2}$ guard); a raw String() read
    // yielded "Wed Jul 15 2026 …" and silently killed the drill-through (F1).
    const a = auditRowObj_(data[i]);
    out.push({
      timestamp:    a.ts,
      timestampMgr: convertAuditTs_(a.ts, CONFIG.TIMEZONE, mgrTz),
      repId:        a.empId,
      repName:      a.empName,
      actorEmail:   a.actor,
      action:       a.action,
      dateLocal:    a.punchDate,
      noteId:       cnExtractAuditNoteId_(a.notes),
      notes:        a.notes,
    });
  }
  return { rows: out, scannedAll: scannedAll, oldestScannedDay: oldestScannedDay };
}
/** Manager-gated compliance audit search over the shared AuditLog. Filters by
 *  rep (EmployeeId), action, and date range (defaults to the last
 *  CN_AUDIT_DEFAULT_DAYS in the manager's tz). Returns PHI-free rows only —
 *  the AuditLog never carries note content (INV-32); the client deep-links a
 *  row's noteId to the Team Notes Per-Rep view for the actual note.
 *  filters: { repId?, action?, startDate?, endDate? } (dates yyyy-MM-dd). */
function getCallNotesAuditLog(filters) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    filters = filters || {};
    const mgrTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
    const reDate = /^\d{4}-\d{2}-\d{2}$/;
    // Default end = "today" in CONFIG.TIMEZONE — the tz audit rows are stamped
    // in. Rows are written in IST wall time, which can be a calendar day ahead
    // of the manager's tz during the US afternoon; an mgr-tz default end
    // silently hid rows written "tomorrow" (IST) until the next day.
    let end = (filters.endDate && reDate.test(filters.endDate))
      ? filters.endDate : fmtDateTz_(new Date(), CONFIG.TIMEZONE);
    let start = (filters.startDate && reDate.test(filters.startDate))
      ? filters.startDate : null;
    if (!start) {
      const d = new Date();
      d.setDate(d.getDate() - CN_AUDIT_DEFAULT_DAYS);
      start = fmtDateTz_(d, mgrTz);
    }
    if (start > end) { const t = start; start = end; end = t; }
    const repId = String(filters.repId || '').trim();
    const action = String(filters.action || '').trim();

    const read = cnReadCallNoteAuditRows_();
    const rows = [];
    for (let i = 0; i < read.rows.length; i++) {
      const r = read.rows[i];
      const dayStr = r.timestamp.substring(0, 10);  // ts is yyyy-MM-dd HH:mm:ss in CONFIG.TIMEZONE
      if (repId && r.repId !== repId) continue;
      if (action && r.action !== action) continue;
      if (dayStr < start || dayStr > end) continue;
      rows.push(r);
      if (rows.length >= CN_AUDIT_MAX_RESULTS) break;
    }
    // Truncated if we hit the result cap, OR the scan cap kept us from reaching
    // back to the requested start date (older matching rows may exist).
    // L-4 (cycle 11): keyed off the WINDOW's oldest scanned day (from the
    // reader), not the oldest matching row — an all-punch scan window used to
    // read as complete while older CN rows sat beyond the cap.
    const truncated = (rows.length >= CN_AUDIT_MAX_RESULTS) ||
      (!read.scannedAll && read.oldestScannedDay && read.oldestScannedDay > start);
    return {
      rows: rows,
      truncated: !!truncated,
      range: { start: start, end: end },
      actions: CN_AUDIT_ACTIONS,
      managerTzAbbr: tzAbbr_(mgrTz),
    };
  } catch (err) { return { error: err.message }; }
}
/** Manager-gated. Returns the full chronological audit history for a single
 *  noteId — every AuditLog row whose Notes embed that noteId — oldest-first,
 *  so the lifecycle (create → flag → email → … → delete) reads top to bottom.
 *  Scans the same bounded window as the search; deliberately independent of
 *  the search's date filter so a note's earlier events still surface. */
function getCallNoteAuditHistory(noteId) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    const id = String(noteId || '').trim();
    if (!id) return { error: 'Missing noteId.' };
    const read = cnReadCallNoteAuditRows_();
    const rows = read.rows.filter(function (r) { return r.noteId === id; });
    rows.reverse();  // newest-first → oldest-first (lifecycle order)
    // Capturing the note's CallNoteCreate row means we have the start of its
    // lifecycle and nothing older exists — so it's NOT truncated even when the
    // bounded scan hit its cap. Only flag truncated when the create row is
    // absent AND the scan didn't reach all the way back (L11).
    const sawCreate = rows.some(function (r) { return r.action === 'CallNoteCreate'; });
    return { rows: rows, truncated: !read.scannedAll && !sawCreate };
  } catch (err) { return { error: err.message }; }
}
/** Bulk-export every enrolled rep's call notes in a date range to a new
 *  Google Sheet. Returns { success, url, fileName, noteCount }. Pair with
 *  the Team Notes "Export Range" modal. Writes a CallNotesExport audit row.
 *
 *  Read-only: never touches the per-rep Sheets, only reads. Cross-rep, so
 *  manager-gated (parallels managerSearchCallNotes / managerAggregateFlagged_). */
function exportCallNotesRange(startDate, endDate) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate))
      return { error: 'Invalid start date (expected yyyy-MM-dd).' };
    if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
      return { error: 'Invalid end date (expected yyyy-MM-dd).' };
    if (startDate > endDate) return { error: 'Start date must be on or before end date.' };

    const roster = getEmployeeRosterRows_();
    const allNotes = [];
    // Cycle-17 C17-6 — a PHI export presented as complete while silently
    // missing a rep is the INV-187 shape cycle-16 F1 fixed in
    // managerGetShiftStats (INV-52's old "skips that rep" clause described
    // the defect). Unreadable rep Sheets are now COLLECTED and carried on
    // the response + the audit row, so the export can never read as
    // complete when it isn't.
    const skippedReps = [];
    for (let r = 1; r < roster.length; r++) {
      const sheetId = cnEnrolledSheetId_(roster[r]);   // F14: trimmed predicate
      if (!sheetId) continue;
      const repId = String(roster[r][EMP.ID]).trim();
      const repName = String(roster[r][EMP.NAME]).trim();
      try {
        const sheet = getCallNotesSheet_({
          id: repId, name: repName, callNotesSheetId: sheetId
        });
        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) continue;
        const dateCol = sheet.getRange(2, CN.DATE_LOCAL + 1, lastRow - 1, 1).getValues();
        let firstMatch = -1, lastMatch = -1;
        for (let d = 0; d < dateCol.length; d++) {
          const dl = cnDateLocalString_(dateCol[d][0]);
          if (dl >= startDate && dl <= endDate) {
            if (firstMatch < 0) firstMatch = d;
            lastMatch = d;
          }
        }
        if (firstMatch < 0) continue;
        const matchCount = lastMatch - firstMatch + 1;
        const rows = sheet.getRange(firstMatch + 2, 1, matchCount, CN_HEADERS.length).getValues();
        for (let i = 0; i < rows.length; i++) {
          const note = callNoteRowToObject_({ row: rows[i], rowIndex: firstMatch + i + 2 });
          if (note.dateLocal < startDate || note.dateLocal > endDate) continue;
          allNotes.push({
            repId, repName, note,
          });
        }
      } catch (e) {
        console.warn('exportCallNotesRange skipped rep ' + repId + ': ' + e.message);
        skippedReps.push({ repId: repId, repName: repName });
      }
    }

    if (allNotes.length === 0) {
      // C17-6 — "no notes" and "no readable notes" are different answers:
      // if reps were skipped, say the export FAILED to read them rather
      // than implying the range was genuinely empty.
      if (skippedReps.length > 0) {
        return { error: 'Export could not read ' + skippedReps.length + ' rep Sheet(s) (' +
          skippedReps.map(function (s) { return s.repName; }).join(', ') +
          ') and found no other notes between ' + startDate + ' and ' + endDate + '.' };
      }
      return { error: `No notes found between ${startDate} and ${endDate}.` };
    }
    allNotes.sort((a, b) => {
      if (a.note.dateLocal !== b.note.dateLocal) return a.note.dateLocal.localeCompare(b.note.dateLocal);
      if (a.repName !== b.repName) return a.repName.localeCompare(b.repName);
      return String(a.note.timestamp).localeCompare(String(b.note.timestamp));
    });

    const stamp = fmtDate_(new Date()).replace(/-/g, '') + '_' + fmtTime_(new Date()).replace(/:/g, '');
    const name = `Call Notes ${startDate} to ${endDate} (${stamp})`;
    const newSs = createPinnedSpreadsheet_(name);   // pins tz+locale (H-2/M-14 class)
    const sh = newSs.getActiveSheet();
    sh.setName('CallNotes');
    const headers = [
      'RepId', 'RepName', 'DateLocal', 'Timestamp', 'Callback', 'Caller',
      'Relationship', 'PatientAndTRX', 'Issue', 'TransferredTo', 'Resolution',
      'FlagType', 'Resolved', 'EmailedAt', 'EmailDepartments',
    ];
    const data = allNotes.map(function (a) {
      const n = a.note;
      return [
        a.repId, a.repName, n.dateLocal, n.timestamp,
        n.callback, n.caller, n.relationship, n.patientAndTrx,
        n.issue, n.transferredTo, n.resolution,
        n.flagType, n.resolved ? 'TRUE' : 'FALSE',
        n.emailedAt, n.emailDepartments,
      ];
    });
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.getRange(2, 1, data.length, headers.length).setValues(data);
    sh.setFrozenRows(1);
    SpreadsheetApp.flush();

    // Share with the calling manager — same L3 rationale as generateExportSheet_.
    try {
      const owner = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
      if (callerEmp.email && String(callerEmp.email).toLowerCase() !== owner) newSs.addEditor(callerEmp.email);
    } catch (shareErr) { console.warn('Export share failed: ' + shareErr.message); }

    // C17-6 — the audit row is the durable record of this PHI export: a
    // count with silently-missing reps read as complete. Rep names/ids are
    // roster data (PHI-free — the row already carries the manager + range).
    const skipNote = skippedReps.length > 0
      ? '; skippedReps=' + skippedReps.length + ' (' +
        skippedReps.map(function (s) { return s.repId; }).join(',') + ') — INCOMPLETE'
      : '';
    writeAuditLog_(callerEmp, 'CallNotesExport', startDate + '..' + endDate, '', false, 0,
      `${allNotes.length} notes → ${newSs.getId()}` + skipNote);

    return {
      success: true,
      url: newSs.getUrl(),
      fileName: name,
      noteCount: allNotes.length,
      skippedReps: skippedReps.map(function (s) { return s.repName; }),
    };
  } catch (err) { return { error: err.message }; }
}
/** Round 2 · 8g — Agent responds to a manager's training feedback. Appends
 *  to subformData.feedback[] with the agent's role + kind ('ack' for the
 *  thumbs-up acknowledgment, 'clarification' for a follow-up question).
 *  Rep-callable (operates on the caller's own per-rep Sheet); locked.
 *  Writes a CallNoteFeedback audit row. */
/** Manager-gated, locked. Appends a free-text manager comment (feedback /
 *  praise) to ANY of a rep's notes — not just training-flagged ones (item 9).
 *  Lands as a `{role:'manager', kind:'comment'}` entry in subformData.feedback[]
 *  (the same thread the rep's card renders), so it reuses the existing Q&A
 *  rendering + the rep can ack/clarify (appendCallNoteFeedback now allows a
 *  reply on any note that has a thread). Writes a CallNoteManagerComment audit
 *  row (PHI-free: noteId only). */
function setCallNoteManagerComment(repEmpId, noteId, message) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const msg = String(message || '').trim().slice(0, 2000);   // F(cycle-8): cell-size guard
    if (!msg) return { success: false, error: 'Comment is empty.' };
    const target = lookupEmployeeById_(repEmpId);
    if (!target) return { success: false, error: 'Employee not found.' };
    if (!target.callNotesSheetId) return { success: false, error: 'This rep has no call-notes Sheet configured.' };

    const sheet = getCallNotesSheet_(target);
    const located = findCallNoteRow_(sheet, noteId);
    if (!located) return { success: false, error: 'Note not found.' };

    let subformData = null;
    if (located.row[CN.SUBFORM_DATA]) {
      try { subformData = JSON.parse(located.row[CN.SUBFORM_DATA]); } catch (e) { subformData = null; }
    }
    if (!subformData || typeof subformData !== 'object') subformData = {};
    if (!Array.isArray(subformData.feedback)) subformData.feedback = [];

    const empTz = target.timezone || CONFIG.TIMEZONE;
    const fbErr = cnAppendBounded_(subformData, subformData.feedback, {
      role: 'manager', kind: 'comment', message: msg,
      at: Utilities.formatDate(new Date(), empTz, "yyyy-MM-dd'T'HH:mm:ss"),
      by: callerEmp.email,
    }, CN_FEEDBACK_MAX_ENTRIES, 'feedback');   // F11
    if (fbErr) return { success: false, error: fbErr };
    sheet.getRange(located.rowIndex, CN.SUBFORM_DATA + 1).setValue(JSON.stringify(subformData));

    const dateLocal = cnDateLocalString_(located.row[CN.DATE_LOCAL]);
    writeAuditLog_(target, 'CallNoteManagerComment', dateLocal, '', false, 0,
      `noteId=${noteId}`, callerEmp.email);

    const updatedRow = sheet.getRange(located.rowIndex, 1, 1, CN_HEADERS.length).getValues()[0];
    return { success: true, note: callNoteRowToObject_({ row: updatedRow, rowIndex: located.rowIndex }) };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
function appendCallNoteFeedback(noteId, message, kind) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Employee not found.' };
    if (!emp.callNotesSheetId) return { success: false, error: 'Your call-notes Sheet is not configured.' };

    const kindV = (kind === 'ack' || kind === 'clarification') ? kind : 'clarification';
    const trimmed = String(message || '').trim().slice(0, 2000);   // F(cycle-8): cell-size guard
    if (kindV === 'clarification' && !trimmed) {
      return { success: false, error: 'Please type a question before sending.' };
    }

    const sheet = getCallNotesSheet_(emp);
    const located = findCallNoteRow_(sheet, noteId);
    if (!located) return { success: false, error: 'Note not found.' };

    let subformData = null;
    if (located.row[CN.SUBFORM_DATA]) {
      try { subformData = JSON.parse(located.row[CN.SUBFORM_DATA]); }
      catch (e) { subformData = null; }
    }
    if (!subformData || typeof subformData !== 'object') subformData = {};
    if (!Array.isArray(subformData.feedback)) subformData.feedback = [];

    const flagType = String(located.row[CN.FLAG_TYPE] || '').trim().toLowerCase();
    // Agent can respond to a thread that exists: a training-flagged note OR any
    // note a manager has commented on (item 9 — general manager comments).
    if (flagType !== 'training' && subformData.feedback.length === 0) {
      return { success: false, error: 'No manager feedback to respond to on this note.' };
    }

    const empTz = empTz_(emp);
    const nowIso = Utilities.formatDate(new Date(), empTz, "yyyy-MM-dd'T'HH:mm:ss");
    const fbErr = cnAppendBounded_(subformData, subformData.feedback, {
      role: 'agent',
      message: kindV === 'ack' ? '' : trimmed,
      at: nowIso,
      by: emp.email,
      kind: kindV,
    }, CN_FEEDBACK_MAX_ENTRIES, 'feedback');   // F11
    if (fbErr) return { success: false, error: fbErr };
    sheet.getRange(located.rowIndex, CN.SUBFORM_DATA + 1).setValue(JSON.stringify(subformData));

    const dateLocal = cnDateLocalString_(located.row[CN.DATE_LOCAL]);
    writeAuditLog_(emp, 'CallNoteFeedback', dateLocal, '', false, 0,
      `noteId=${noteId}; kind=${kindV}`);

    const updatedRow = sheet.getRange(located.rowIndex, 1, 1, CN_HEADERS.length).getValues()[0];
    return { success: true, note: callNoteRowToObject_({ row: updatedRow, rowIndex: located.rowIndex }) };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Manager aggregated review-candidate queue across all enrolled reps. */
function managerGetReviewCandidates(dateRange) {
  return managerAggregateFlagged_('review', dateRange);
}
function managerAggregateFlagged_(flagType, dateRange) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const roster = getEmployeeRosterRows_();
    const results = [];
    const skippedReps = [];
    for (let r = 1; r < roster.length; r++) {
      const sheetId = cnEnrolledSheetId_(roster[r]);   // F14: trimmed predicate
      if (!sheetId) continue;
      const repId = String(roster[r][EMP.ID]).trim();
      const repName = String(roster[r][EMP.NAME]).trim();
      try {
        const sheet = getCallNotesSheet_({ id: repId, name: repName, callNotesSheetId: sheetId });
        // Bounded read when a full date range is supplied (the weekly digest
        // passes a 7-day range — big win vs. scanning each rep's full
        // history); full scan otherwise. Per-note re-checks stay defensive.
        const dr = (dateRange && dateRange.start && dateRange.end) ? dateRange : {};
        const located = readCallNoteRowsInRange_(sheet, dr.start, dr.end);
        for (let i = 0; i < located.length; i++) {
          const note = callNoteRowToObject_(located[i]);
          if (note.flagType !== flagType) continue;
          if (dateRange && dateRange.start && note.dateLocal < dateRange.start) continue;
          if (dateRange && dateRange.end   && note.dateLocal > dateRange.end)   continue;
          note.repId = repId; note.repName = repName;
          results.push(note);
        }
      } catch (e) {
        console.warn('managerAggregateFlagged_ skipped rep ' + repId + ': ' + e.message);
        skippedReps.push(repName || repId);
      }
    }
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    // C17 batch-2 (INV-187) — an unreadable rep Sheet must ride the result:
    // the training/review queues and the weekly digests read this, and a
    // silently-missing rep made both read as complete. Additive field.
    return { flagType, results, skippedReps };
  } catch (err) { return { error: err.message }; }
}
/** Aggregates urgent-flagged notes across all enrolled reps in a date range.
 *  'urgent' lives in `subformData.flags[]` (NOT the FlagType column — INV-75/77),
 *  so this can't reuse managerAggregateFlagged_ (which filters on FlagType).
 *  Private — called by the manager-gated `sendCallNotesUrgentDigest` (the auth
 *  boundary). Mirrors managerAggregateFlagged_'s bounded scan + repId/repName
 *  attach so the digest reuses `sendManagerFlagDigest_`. */
function managerAggregateUrgent_(dateRange) {
  const roster = getEmployeeRosterRows_();
  const results = [];
  const skippedReps = [];
  for (let r = 1; r < roster.length; r++) {
    const sheetId = cnEnrolledSheetId_(roster[r]);   // F14: trimmed predicate
    if (!sheetId) continue;
    const repId = String(roster[r][EMP.ID]).trim();
    const repName = String(roster[r][EMP.NAME]).trim();
    try {
      const sheet = getCallNotesSheet_({ id: repId, name: repName, callNotesSheetId: sheetId });
      const dr = (dateRange && dateRange.start && dateRange.end) ? dateRange : {};
      const located = readCallNoteRowsInRange_(sheet, dr.start, dr.end);
      for (let i = 0; i < located.length; i++) {
        const note = callNoteRowToObject_(located[i]);
        const flags = (note.subformData && Array.isArray(note.subformData.flags)) ? note.subformData.flags : [];
        if (flags.indexOf('urgent') < 0) continue;
        if (dateRange && dateRange.start && note.dateLocal < dateRange.start) continue;
        if (dateRange && dateRange.end   && note.dateLocal > dateRange.end)   continue;
        note.repId = repId; note.repName = repName;
        results.push(note);
      }
    } catch (e) {
      console.warn('managerAggregateUrgent_ skipped rep ' + repId + ': ' + e.message);
      skippedReps.push(repName || repId);
    }
  }
  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  // C17 batch-2 (INV-187) — same outcome contract as managerAggregateFlagged_.
  return { results, skippedReps };
}


// ── Call Notes helpers (private) ────────────────────────────────────────
function sanitizeCallNotePayload_(p) {
  const s = (v) => (v === null || v === undefined) ? '' : String(v).trim();
  // Round 2 · 8e — accept multi-flag array (p.flags) + tags (p.tags) in
  // addition to the legacy single-select p.flagType. When p.flags is
  // present, derive FlagType from it (priority order); fall back to
  // p.flagType otherwise so old clients still work.
  let flagsArr = sanitizeFlagsArray_(p.flags);
  // F(L-13): a legacy/direct-RPC payload with flagType='urgent' and NO flags[]
  // was accepted by validation (F21) and then silently DISCARDED — urgent never
  // enters the FlagType column (INV-37) and nothing folded it into
  // subformData.flags. Fold the lone urgent in so it renders + digests.
  if (flagsArr.length === 0 && s(p.flagType).toLowerCase() === 'urgent') flagsArr = ['urgent'];
  const derivedFromArr = flagsArr.length > 0 ? deriveFlagType_(flagsArr) : '';
  const flagType = derivedFromArr || s(p.flagType).toLowerCase();
  const tagsArr = sanitizeTagsArray_(p.tags);
  // F(M-15): WHITELIST the client-supplied subformData keys. The blob was
  // previously persisted verbatim, so a crafted submit could pre-load a forged
  // manager trainingReply / feedback[] thread (rendered as a real answer in
  // the weekly digest + Q&A and cleared from every "unanswered" queue), or
  // pinned:true bypassing the 3-pin cap setCallNotePinned enforces inside its
  // lock — INV-49/50 were client-honor-system. Only the keys the shipped
  // client actually sends at submit survive; everything else (trainingReply*,
  // feedback[], pinned, formSubmission, externalEmails, …) is written by its
  // own gated server endpoint after submit.
  const rawSub = (p.subformData && typeof p.subformData === 'object') ? p.subformData : null;
  let subformData = null;
  if (rawSub) {
    subformData = {};
    const tq = s(rawSub.trainingQuestion);
    if (tq) subformData.trainingQuestion = tq.slice(0, 2000);
    const cs = Number(rawSub.completionSeconds);
    if (isFinite(cs) && cs > 0) subformData.completionSeconds = Math.round(cs);
    // Cycle-9 M-3: the intake auto-log note's category chip
    // (cnIntakePillHtml_ keys off subformData.intakeType) — the M-15
    // whitelist silently stripped it, so every intake-logged note persisted
    // un-chipped. Bounded enum only; anything else drops.
    const it = s(rawSub.intakeType).toLowerCase();
    if (it === 'ppd' || it === 'pmd' || it === 'pap') subformData.intakeType = it;
    // Round-1 pilot #1 (2026-08-21): optional comment on a review-flagged note —
    // the trainingQuestion mechanism mirrored (same trim + 2000-char cell guard).
    const rc = s(rawSub.reviewComment);
    if (rc) subformData.reviewComment = rc.slice(0, 2000);
    // Round-1 pilot #2: call direction. Stored ONLY as 'outbound' — absent =
    // inbound (the overwhelming default), so tens of thousands of existing
    // notes need no migration and anything else drops (bounded enum, the
    // intakeType posture).
    const cd = s(rawSub.callDirection).toLowerCase();
    if (cd === 'outbound') subformData.callDirection = 'outbound';
    if (Object.keys(subformData).length === 0) subformData = null;
  }
  // Merge tags/flags into subformData so the schema stays in one column
  // (per X5 — no new sheet column). Pin stays in subformData.pinned with
  // its 3-cap, separate from this array.
  if (flagsArr.length > 0 || tagsArr.length > 0) {
    subformData = subformData || {};
    if (flagsArr.length > 0) subformData.flags = flagsArr;
    if (tagsArr.length > 0) subformData.tags = tagsArr;
  }
  return {
    callback:       s(p.callback),
    caller:         s(p.caller),
    relationship:   s(p.relationship),
    patientAndTrx:  s(p.patientAndTrx || p.patientAndTRX),
    issue:          s(p.issue),
    transferredTo:  s(p.transferredTo),
    resolution:     s(p.resolution),
    flagType:       flagType,
    subform:        s(p.subform).toLowerCase(),
    subformData:    subformData,
  };
}
function validateCallNotePayload_(cleaned) {
  // Logging is generous — only require the rep typed *something* meaningful.
  // Empty notes are useless; everything else is the rep's call.
  const anyContent = cleaned.callback || cleaned.caller || cleaned.patientAndTrx
                  || cleaned.issue || cleaned.resolution;
  if (!anyContent) return { error: 'Note is empty. Fill at least one field before submitting.' };
  // Accept the extended flag set (incl. 'urgent') so a legacy single-field
  // payload.flagType='urgent' isn't rejected outright (F21). 'urgent' still
  // never reaches the FlagType column — sanitizeFlagType_ strips it downstream
  // (INV-37) — it only lives in subformData.flags.
  if (cleaned.flagType && CN_FLAG_TYPES_EXTENDED.indexOf(cleaned.flagType) < 0) {
    return { error: 'Invalid flag type. Expected: ' + CN_FLAG_TYPES_EXTENDED.join(', ') };
  }
  return { ok: true };
}
function sanitizeFlagType_(t) {
  const v = String(t || '').trim().toLowerCase();
  return CN_FLAG_TYPES.indexOf(v) >= 0 ? v : '';
}
function findCallNoteRow_(sheet, noteId) {
  if (!noteId) return null;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  // Scan only the NoteId column to locate the row, then fetch that single full
  // row — avoids pulling every column of the rep's entire history on every
  // single-note mutation (flag/resolve/pin/edit/email/delete). Return shape is
  // unchanged: { rowIndex, row } with `row` the full row array (L9).
  const ids = sheet.getRange(2, CN.NOTE_ID + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === noteId) {
      const rowIndex = i + 2;
      // Fetch just the known schema width (L-10) — not getLastColumn(), which
      // would pull any stray/human-added trailing columns in the rep's Sheet.
      // All consumers index by CN.* (< CN_HEADERS.length).
      const row = sheet.getRange(rowIndex, 1, 1, CN_HEADERS.length).getValues()[0];
      return { rowIndex: rowIndex, row: row };
    }
  }
  return null;
}
/** F(M-14): CN Timestamp cells are written "yyyy-MM-dd'T'HH:mm:ss", but a
 *  per-rep sheet whose LOCALE coerces the ISO-T form (the exact class
 *  formTokenCellMs_ exists for — it bit when FORMS_SS_ID moved to the Intake
 *  sheet) returns a Date from getValues(). A raw String() then yields
 *  "Wed Jul 09 2026 …", which silently breaks newest-first sorting, the
 *  /T(\d{2}:\d{2})/ shift-span + EOD time displays, the ambient stale-flag
 *  counter, and FAIL-OPENS the 5-minute delete window (parseTimestampMs_ →
 *  null). Recover a coerced Date back to the as-written T-form digits in the
 *  tz that coerced it — the HOST sheet's own tz (cnHostTz_, Part A operator
 *  2026-08-27): provisioned sheets are pinned to the ADP tz (INV-110) so the
 *  host tz equals the old adpSheetTz_() there, but a hand-created/drifted
 *  sheet coerces in ITS OWN tz, and recovering in the ADP tz shifted every
 *  displayed time by the tz delta (a 2:16 PM Chicago note read 1:46 AM).
 *  Strings pass through untouched. Same family as normalizeAuditTs_ /
 *  getMyNoteHourBuckets' inline guard. */
function cnTimestampString_(val) {
  if (val instanceof Date) {
    try { return Utilities.formatDate(val, cnHostTz_(), "yyyy-MM-dd'T'HH:mm:ss"); }
    catch (e) { return String(val); }
  }
  return String(val || '');
}
function callNoteRowToObject_(located) {
  const row = located.row;
  const resolvedRaw = row[CN.RESOLVED];
  const resolvedStr = (resolvedRaw === null || resolvedRaw === undefined) ? ''
    : String(resolvedRaw).trim().toLowerCase();
  const resolved = (resolvedStr === 'true' || resolvedStr === 'yes' || resolvedStr === '1');
  let subformData = null;
  if (row[CN.SUBFORM_DATA]) {
    try { subformData = JSON.parse(row[CN.SUBFORM_DATA]); }
    catch (e) { subformData = null; }
  }
  return {
    noteId:           String(row[CN.NOTE_ID] || ''),
    timestamp:        cnTimestampString_(row[CN.TIMESTAMP]),   // F(M-14)
    dateLocal:        cnDateLocalString_(row[CN.DATE_LOCAL]),
    callback:         String(row[CN.CALLBACK] || ''),
    caller:           String(row[CN.CALLER] || ''),
    relationship:     String(row[CN.RELATIONSHIP] || ''),
    patientAndTrx:    String(row[CN.PATIENT_TRX] || ''),
    issue:            String(row[CN.ISSUE] || ''),
    transferredTo:    String(row[CN.TRANSFERRED_TO] || ''),
    resolution:       String(row[CN.RESOLUTION] || ''),
    flagType:         String(row[CN.FLAG_TYPE] || '').toLowerCase(),
    resolved,
    // Cycle-11 L-5: EMAILED_AT is written in the same locale-coercible ISO-T
    // form as CN.TIMESTAMP (INV-142's class) — recover a coerced Date the same
    // way, or the sent-pill title / export column renders "Wed Jul 09 2026 …".
    emailedAt:        cnTimestampString_(row[CN.EMAILED_AT]),
    emailDepartments: String(row[CN.EMAIL_DEPARTMENTS] || ''),
    subform:          String(row[CN.SUBFORM] || ''),
    subformData,
    rowIndex: located.rowIndex,
  };
}
function callNoteMatchesFilter_(note, filter) {
  switch (filter) {
    case 'action':     return note.flagType === 'action';
    case 'training':   return note.flagType === 'training';
    case 'review':     return note.flagType === 'review';
    case 'unresolved': return note.flagType === 'action' && !note.resolved;
    case 'unsent':     return !note.emailedAt;
    // Round-1 pilot #2 — mirrors the client cnNoteMatchesFilter_ case:
    // callDirection is stored ONLY as 'outbound' (absent = inbound).
    case 'outbound':   return !!(note.subformData && note.subformData.callDirection === 'outbound');
    case 'all':
    default:           return true;
  }
}
/** Renders the email HTML body + computed subject/recipients for a note +
 *  composer selections, without sending. The client shows this in a
 *  confirm modal; user clicks Send → emailFromCallNote actually sends.
 *  Also returns a bodyHash so emailFromCallNote can refuse to send if the
 *  note body changed between Preview and Send (avoids "I previewed X, you
 *  sent Y" trust violation when the rep edits mid-flow). */
function previewCallNoteEmail(noteId, emailPayload) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    const sheet = getCallNotesSheet_(emp);
    const located = findCallNoteRow_(sheet, noteId);
    if (!located) return { error: 'Note not found.' };
    const note = callNoteRowToObject_(located);

    const selections = sanitizeEmailSelections_(emailPayload || {});
    const v = validateEmailSelections_(selections);
    if (v.error) return { error: v.error };

    const callData = callDataFromNote_(note);
    const subject = buildEmailSubject_(selections, callData.patientAndTrx);
    const recipientList = resolveEmailRecipients_(selections);
    if (recipientList.error) return { error: recipientList.error };

    const htmlBody = buildCallNoteEmailHtml_(callData, selections);
    const textBody = buildCallNoteEmailText_(callData, selections, subject);

    return {
      noteId,
      subject,
      to: recipientList.to,
      cc: CONFIG.CALL_NOTES.CC_EMAIL,
      from: emp.email,
      htmlBody,
      textBody,
      bodyHash: computeCnEmailHash_(htmlBody, subject, recipientList.to),
    };
  } catch (err) { return { error: err.message }; }
}
/** Hex SHA-256 over (htmlBody + subject + recipients). The send path
 *  re-renders and compares; mismatch means the note was edited or the
 *  composer selections drifted between Preview and Send. */
function computeCnEmailHash_(htmlBody, subject, to) {
  const buf = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(htmlBody || '') + '' + String(subject || '') + '' + String(to || '')
  );
  let out = '';
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i] < 0 ? buf[i] + 256 : buf[i];
    out += (b < 16 ? '0' : '') + b.toString(16);
  }
  return out;
}
/** Actually sends the email composed for a note. Stamps EmailedAt +
 *  EmailDepartments on the note row, writes a CallNoteEmail audit row.
 *
 *  `expectedBodyHash` MUST be the bodyHash returned by the most recent
 *  previewCallNoteEmail call for this note + selections. Server re-renders
 *  and refuses to send if the hash differs — guards against the rep editing
 *  the note body between Preview and Send (would otherwise send different
 *  content than what was confirmed in the preview modal).
 *
 *  Ordering: hash check → send → stamp metadata (best-effort, separate
 *  try/catch). If MailApp succeeds but the metadata write throws, we return
 *  success rather than failure — failing here would prompt the rep to re-send
 *  a duplicate. The stamp failure is logged to console for ops to notice. */
function emailFromCallNote(noteId, emailPayload, expectedBodyHash) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Employee not found.' };
    const sheet = getCallNotesSheet_(emp);
    const located = findCallNoteRow_(sheet, noteId);
    if (!located) return { success: false, error: 'Note not found.' };
    const note = callNoteRowToObject_(located);

    const selections = sanitizeEmailSelections_(emailPayload || {});
    const v = validateEmailSelections_(selections);
    if (v.error) return { success: false, error: v.error };

    const callData = callDataFromNote_(note);
    const subject = buildEmailSubject_(selections, callData.patientAndTrx);
    const recipientList = resolveEmailRecipients_(selections);
    if (recipientList.error) return { success: false, error: recipientList.error };

    const htmlBody = buildCallNoteEmailHtml_(callData, selections);
    const textBody = buildCallNoteEmailText_(callData, selections, subject);

    // Preview-snapshot guard — refuse to send if the rep edited the note (or
    // the composer drifted) between Preview and Send.
    if (!expectedBodyHash) {
      return { success: false, error:
        'Internal: missing preview hash. Open the preview and click Send from there.' };
    }
    const actualHash = computeCnEmailHash_(htmlBody, subject, recipientList.to);
    if (expectedBodyHash !== actualHash) {
      return { success: false, error:
        'Note content changed since you previewed. Re-open Preview to confirm the new body before sending.' };
    }

    // Auto-track this dept email as an inter-department request. A5: if this same
    // note was already sent to this same dept and that request is still OPEN,
    // REUSE its token (a re-send re-notifies the dept; it must not open a second
    // request) — else mint a new token. The lookup is best-effort (a throw falls
    // back to a fresh token, never failing the send). The "Mark resolved" CTA is
    // appended to the SENT body ONLY, AFTER the INV-41 hash check, so the
    // preview/hash contract is untouched. The PHI-free DeptRequests row is logged
    // below, after the send succeeds (only when this is a NEW request).
    // F(M-16): request-track ONLY sends that include a REAL internal
    // department. 'Other' is the free-text (possibly customer/external)
    // recipient path — tracking those (a) mailed an external recipient an
    // internal "Mark this request resolved" button that dead-ends at a Google
    // login wall on this domain-restricted deployment, and (b) opened an
    // 'Other' row no department desk would ever resolve, riding the daily SLA
    // digest as perpetual overdue noise.
    const drTrackable = selections.departments.some(function (d) { return d !== 'Other'; });
    const drDeptKey = selections.departments.join(', ');
    let drExistingId = null;
    if (drTrackable) {
      try { drExistingId = drFindOpenRequest_(noteId, drDeptKey); } catch (e) { drExistingId = null; }
    }
    const drId = drExistingId || Utilities.getUuid();
    const drResolveUrl = getWebAppExecUrl_() + '?resolve=' + encodeURIComponent(drId);
    const sentHtml = htmlBody + (drTrackable ? drResolveCtaHtml_(drResolveUrl) : '');

    // Send first. If MailApp throws, nothing is stamped and the rep sees a clean failure.
    // F(cycle-8): on a MIXED send (real department + 'Other') the resolve
    // token — a credential (serveResolvePage_) — must not leave the org: the
    // internal copy carries the CTA, the 'Other' (possibly customer/external)
    // recipient gets the identical body WITHOUT it. The F(M-16) fix only
    // suppressed tracking for 'Other'-ONLY sends, so mixed sends mailed the
    // token to the external address. Internal goes first: if the external
    // copy then fails, a rep re-send duplicates a dept email (annoying),
    // never the customer's.
    const splitCta = drTrackable && recipientList.externalTo;
    let internalSent = false;        // C17-11
    let externalSendFailed = null;   // C17-11
    try {
      if (splitCta) {
        sendRepEmail_(emp, {
          to: recipientList.internalTo,
          cc: CONFIG.CALL_NOTES.CC_EMAIL,
          subject,
          body: textBody + '\n\nMark this request resolved: ' + drResolveUrl,
          htmlBody: sentHtml,
        });
        internalSent = true;
        sendRepEmail_(emp, {
          to: recipientList.externalTo,
          cc: CONFIG.CALL_NOTES.CC_EMAIL,
          subject,
          body: textBody,
          htmlBody: htmlBody,   // no CTA
        });
      } else {
        sendRepEmail_(emp, {
          to: recipientList.to,
          cc: CONFIG.CALL_NOTES.CC_EMAIL,
          subject,
          body: textBody + (drTrackable ? ('\n\nMark this request resolved: ' + drResolveUrl) : ''),
          htmlBody: sentHtml,
        });
      }
    } catch (sendErr) {
      // C17-11 (cycle 17): if the INTERNAL dept copy already went out, it is
      // carrying a live resolve CTA — returning failure here skipped ALL the
      // bookkeeping below, so a DELIVERED cross-rep department email left no
      // CallNoteEmail audit row (INV-32 calls the AuditLog "the only
      // cross-rep trail"), no EmailedAt stamp, and a resolve token that
      // dead-ended at "Request not found"; the rep then re-sent, and the
      // dedup lookup (which finds only OPEN rows) minted a SECOND token.
      // Fall through to the bookkeeping for the delivered half and report
      // the partial outcome instead.
      if (!internalSent) {
        return { success: false, error: 'Email send failed: ' + sendErr.message };
      }
      externalSendFailed = sendErr.message;
    }

    // Email is OUT. Past this point we never return failure — a partial stamp
    // would otherwise cause the rep to re-send a duplicate. Batch the two
    // adjacent column writes via setValues to shrink the partial-write window.
    const empTz = empTz_(emp);
    const emailedAt = Utilities.formatDate(new Date(), empTz, "yyyy-MM-dd'T'HH:mm:ss");
    // C17-11: on a partial send the stamp/audit label reflects what was
    // DELIVERED — the internal departments only ('Other' carried the failed
    // external copy).
    const deptLabel = externalSendFailed
      ? selections.departments.filter(function (d) { return d !== 'Other'; }).join(', ')
      : selections.departments.join(', ');
    try {
      sheet.getRange(located.rowIndex, CN.EMAILED_AT + 1, 1, 2)
        .setValues([[emailedAt, deptLabel]]);
      // Persist subform selection back to the row so the rolling card can
      // re-open the composer with prior settings if the rep needs to re-send.
      // MERGE into the existing subformData blob — a straight overwrite would
      // destroy co-resident per-note metadata (tags, pinned/pinnedAt, feedback,
      // trainingQuestion/Reply, completionSeconds, externalEmails,
      // formSubmission). Email-selection keys (departments, updateInfo,
      // *Details, etc.) don't collide with those metadata keys, so a shallow
      // merge is safe and keeps the composer re-populate flow working.
      if (selections.updateInfo) {
        const existingSub = (note.subformData && typeof note.subformData === 'object')
          ? note.subformData : {};
        const mergedSub = Object.assign({}, existingSub, selections);
        sheet.getRange(located.rowIndex, CN.SUBFORM + 1, 1, 2).setValues([[
          updateInfoToSubformKey_(selections.updateInfo),
          JSON.stringify(mergedSub),
        ]]);
      }
    } catch (stampErr) {
      console.warn('emailFromCallNote: stamp failed after successful send (noteId=' +
        noteId + '): ' + stampErr.message);
    }

    // Audit note is intentionally PHI-free: the email subject embeds the
    // patient name / TRX and the recipient list can include external
    // addresses, neither of which belongs in the shared AuditLog. Record
    // the noteId (an investigator can open the note for full detail), the
    // department label, and the recipient count instead.
    writeAuditLog_(emp, 'CallNoteEmail', note.dateLocal, '', false, 0,
      `noteId=${noteId}; depts=${deptLabel || '(none)'}; recipients=${recipientList.to.split(',').length}` +
      (externalSendFailed ? '; externalCopyFailed' : ''));

    // Auto-log the inter-department request (best-effort — never fails the send).
    // The row carries the dept label + the update CATEGORY + the source noteId
    // + (operator testing note 6, 2026-09-10) the note's patient name & TRX —
    // the SECOND half of the constructed subject, so the tracker card is
    // identifiable without opening the note. Note CONTENT (issue/resolution)
    // still never enters the store; the SLA digest + AuditLog stay label-only.
    // A5: append a NEW open row ONLY when this isn't a re-send of an already-open
    // (note, dept) request — a re-send reuses the prior token (drExistingId), so
    // we skip the append and just audit the re-notification. Surfaced in
    // Metrics → Dept Requests with elapsed/resolution-time tracking.
    try {
      if (drTrackable && !drExistingId) {   // F(M-16): 'Other'-only sends are never tracked
        getOrCreateDeptRequestsSheet_().appendRow([
          drId, emp.id, emp.name, emp.email || getActiveUserEmail_() || '',
          deptLabel, drRecipientDomains_(recipientList.to), drNowTs_(), 'open', '', '',
          // F(L-11): the label is free-typed (datalist-SUGGESTED) — cap it so
          // a long paste (which could carry patient identifiers) can't ride
          // into the PHI-free store / the dept inbox / the SLA digest whole.
          String(selections.updateInfo || 'Call note email').slice(0, 80), noteId,
          '',   // ResolvedVia — written by the resolver
          String(note.patientAndTrx || '').slice(0, DR_PATIENT_TRX_MAX),
        ]);
        drBumpCacheGen_();   // a new open request must reach the next list read
      }
      if (drTrackable) writeAuditLog_(emp, 'DeptRequestSent', note.dateLocal, '', false, 0,
        'reqId=' + drId + '; dept=' + (deptLabel || '(none)') + (drExistingId ? '; resend' : ''));
    } catch (drErr) {
      console.warn('emailFromCallNote: dept-request auto-log failed (noteId=' +
        noteId + '): ' + drErr.message);
    }

    // C17-11: a partial send reports success (the dept copy is out — a retry
    // would DUPLICATE it) with an explicit warning naming what failed. The
    // client surfaces `warning` as a warn toast.
    if (externalSendFailed) {
      return { success: true, emailedAt, recipients: recipientList.internalTo, subject,
        warning: 'The department copy was sent, but the external/Other copy failed (' +
          externalSendFailed + '). Send to the external recipient separately — do NOT re-send the whole email (the department already has it).' };
    }
    return { success: true, emailedAt, recipients: recipientList.to, subject };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
function sanitizeEmailSelections_(payload) {
  const s = (v) => (v === null || v === undefined) ? '' : String(v).trim();
  const arr = (v) => Array.isArray(v) ? v.map(s).filter(x => x.length > 0) : [];
  // L-1: details must be plain objects (the client always sends objects; a
  // string/array here is a crafted payload) — size is bounded in
  // validateEmailSelections_ so both Preview and Send reject identically.
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;
  return {
    departments:     arr(payload.departments),
    individualEmail: s(payload.individualEmail),
    updateInfo:      s(payload.updateInfo),
    callbackNeeded:  !!payload.callbackNeeded,
    overwriteResolution: !!payload.overwriteResolution,
    shippingDetails: obj(payload.shippingDetails),
    closeDetails:    obj(payload.closeDetails),
    resupplyDetails: obj(payload.resupplyDetails),
    oopDetails:      obj(payload.oopDetails),
  };
}
function validateEmailSelections_(selections) {
  if (!selections.departments || selections.departments.length === 0) {
    return { error: 'Select at least one recipient department.' };
  }
  if (selections.departments.indexOf('Other') >= 0) {
    const email = selections.individualEmail;
    if (!email) return { error: 'Selected "Other" but no email was provided.' };
    // Multi-email support — split on commas, validate each
    const parts = email.split(',').map(p => p.trim()).filter(p => p.length > 0);
    for (let i = 0; i < parts.length; i++) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parts[i])) {
        return { error: 'Invalid email format: ' + parts[i] };
      }
    }
  }
  if (!selections.updateInfo) {
    return { error: 'Specify an Update type before sending.' };
  }
  // L-1 — bound the four subform detail objects (combined serialized size)
  // BEFORE anything is sent or stamped. Runs in previewCallNoteEmail too, so
  // the rep sees the rejection at Preview, not after a sent-but-unstampable
  // email. Unserializable details (circular refs — impossible from JSON-over-
  // RPC, defensive only) are rejected rather than passed through.
  let detailChars = 0;
  const detailKeys = ['shippingDetails', 'closeDetails', 'resupplyDetails', 'oopDetails'];
  for (let i = 0; i < detailKeys.length; i++) {
    const d = selections[detailKeys[i]];
    if (!d) continue;
    try { detailChars += JSON.stringify(d).length; }
    catch (e) { return { error: 'The email details could not be read — clear the subform fields and re-enter them.' }; }
  }
  if (detailChars > CN_EMAIL_DETAILS_MAX_CHARS) {
    return { error: 'The email details are too large (over ' + CN_EMAIL_DETAILS_MAX_CHARS +
      ' characters combined) — shorten the free-text fields (e.g. special notes) and try again.' };
  }
  return { ok: true };
}
function resolveEmailRecipients_(selections) {
  const map = getDepartmentEmails_();
  const out = [], internal = [], external = [];
  for (let i = 0; i < selections.departments.length; i++) {
    const dept = selections.departments[i];
    if (dept === 'Other') {
      out.push(selections.individualEmail);
      external.push(selections.individualEmail);
    } else {
      const addr = map[dept];
      if (!addr) return { error: 'Unknown department: ' + dept };
      out.push(addr);
      internal.push(addr);
    }
  }
  // F(cycle-8): `to` is unchanged (the INV-41 hash is computed over it);
  // internalTo/externalTo are ADDITIVE splits so emailFromCallNote can keep
  // the resolve-token CTA off the 'Other' (possibly customer/external) copy.
  return { to: out.join(', '), internalTo: internal.join(', '), externalTo: external.join(', ') };
}
function callDataFromNote_(note) {
  // Smart "self"-relationship logic: when relationship is "self" and the
  // patient/TRX cell is just a number, prepend the caller's name so
  // downstream subject lines have a usable identifier.
  let patientAndTrx = String(note.patientAndTrx || '').trim();
  const relationship = String(note.relationship || '').trim().toLowerCase();
  const isOnlyNumber = /^[\d\s#]+$/.test(patientAndTrx);
  if (relationship === 'self' && isOnlyNumber && note.caller) {
    patientAndTrx = `${note.caller} ${patientAndTrx}`;
  }
  return {
    callBackNumber: formatPhoneNumber_(note.callback),
    callerName:     note.caller,
    relationship:   note.relationship,
    patientAndTrx,
    issue:          note.issue,
    // Transferred To is optional — most calls aren't escalated. Default to
    // "N/A" so the call-details table doesn't have an awkward empty cell and
    // the pasted note has a clear "no transfer" signal.
    transferredTo:  (note.transferredTo && note.transferredTo.trim()) || 'N/A',
    resolution:     note.resolution,
  };
}
function buildEmailSubject_(selections, patientName) {
  let subjectUpdate = selections.updateInfo;
  if (!subjectUpdate || !subjectUpdate.trim()) subjectUpdate = 'Update';

  const canon = subjectUpdate.toLowerCase();
  if (canon === 'close order')       subjectUpdate = 'Close Order';
  if (canon === 'verified shipping') subjectUpdate = 'Verified Shipping';
  if (canon === 'oop order')         subjectUpdate = 'OOP Order';

  if (canon === 'repeat resupply' && selections.resupplyDetails) {
    const details = selections.resupplyDetails;
    const cat = details.itemCategory;
    const month = details.resupplyMonth;
    const dob = details.dob;
    const prefix = (cat === 'Other') ? '' : `${cat} `;
    const middle = month ? `${month} ` : '';
    subjectUpdate = `${prefix}${middle}Resupply`.trim();
    subjectUpdate = subjectUpdate.charAt(0).toUpperCase() + subjectUpdate.slice(1);
    let fullSubject = `${subjectUpdate}: ${patientName}`;
    if (dob) fullSubject += `, DOB: ${dob}`;
    return fullSubject;
  }
  return `${subjectUpdate}: ${patientName}`;
}
function generateOOPResolutionText_(selections) {
  const oop = selections.oopDetails;
  const ship = selections.shippingDetails;
  if (!oop || !ship) return '';
  let paymentStatus = 'Need to Collect Total';
  if (ship.patResp === 'Collected') paymentStatus = 'Collected Total';
  else if (ship.patResp === 'N/A')   paymentStatus = 'Total (N/A)';
  let text = `OOP Order Processed`;
  const taxFmt = (String(oop.taxAmt || '').charAt(0) === '$')
    ? oop.taxAmt : '$' + oop.taxAmt;
  // Sales-tax leg gated by the oopSalesTax feature toggle (Admin).
  const taxBit = getFlag_('oopSalesTax') ? ` + Est. Sales Tax: ${taxFmt}` : '';
  text += `\n${paymentStatus}: $${oop.totalCost} (Base: $${oop.baseCost}${taxBit} + Ship: $${oop.shippingCost})`;
  text += `\nVerified Addr: ${ship.verifiedAddr ? 'Yes' : 'No'}`;
  if (ship.verifiedAddrText) text += ` (${ship.verifiedAddrText})`;
  text += ` | Loc: ${ship.patientLoc}`;
  text += ` | Docs: ${ship.docsTo}`;
  if (ship.deliveryEmail) text += ` (${ship.deliveryEmail})`;
  if (ship.specialNote) text += `\nNote: ${ship.specialNote}`;
  return text;
}
/** Marker text formatting — the SERVER twin of the client cnFmtHtml_
 *  (cn/script_callnotes.html); the three marker regexes are pinned
 *  byte-equal (the INV-72 parallel-source family). Input MUST already be
 *  esc_'d; output is email-safe (strong/u/inline-styled span — no <mark>,
 *  whose default rendering varies across mail clients; hex from
 *  CN_EMAIL_PALETTE per the email-color rule). */
/** Escaped text → HTML with the rep's LINE BREAKS preserved (operator
 *  2026-09-02). The note fields are contenteditable divs styled
 *  `white-space: pre-wrap`, so pressing Enter stores a real \n and
 *  `textContent` carries it through to the sheet — but HTML collapses a bare
 *  newline to a space, so a Resolution the rep wrote as paragraphs arrived in
 *  the email (and its preview) as one run-on block. The CRM paste was always
 *  right, which is why the two disagreed.
 *
 *  The rule already existed for the SERVER-GENERATED OOP resolution, inline
 *  and in one branch only; both callers share it now rather than keeping two
 *  copies of the same replace. `<br>` is safe in every mail client (unlike
 *  flex/gap — see the CN_EMAIL_PALETTE email-safe rule). */
function cnNlBr_(escaped) {
  return String(escaped == null ? '' : escaped).replace(/\r\n?|\n/g, '<br>');
}
function cnFmtEmailHtml_(escaped) {
  var out = String(escaped == null ? '' : escaped);
  out = out.replace(/==([^=\n]+)==/g, '<span style="background:' + CN_EMAIL_PALETTE.warnSoft + ';border-radius:2px;">$1</span>');
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_\n]+)__/g, '<u>$1</u>');
  // LINE BREAKS LAST, and the order is load-bearing: every marker regex is
  // written [^…\n]+ so a pair deliberately cannot span lines. Converting the
  // newlines first would delete the \n those classes exclude on, and
  // `**a\nb**` would silently start matching — quietly changing the documented
  // marker contract rather than just adding breaks.
  return cnNlBr_(out);
}
function buildCallNoteEmailHtml_(callData, selections) {
  const P = CN_EMAIL_PALETTE;
  let updateInfo = selections.updateInfo;
  const canon = updateInfo.toLowerCase();
  if (canon === 'close order')       updateInfo = 'Close Order';
  if (canon === 'verified shipping') updateInfo = 'Verified Shipping';
  if (canon === 'repeat resupply')   updateInfo = 'Repeat Resupply';
  if (canon === 'oop order')         updateInfo = 'OOP Order';

  const callbackNeeded  = selections.callbackNeeded;
  const shippingDetails = selections.shippingDetails;
  const closeDetails    = selections.closeDetails;
  const resupplyDetails = selections.resupplyDetails;
  const oopDetails      = selections.oopDetails;

  // ── Per-template color theme ────────────────────────────────────────
  // Each special template gets its own banner color so the recipient
  // immediately sees what kind of update this is. Default is the brand
  // navy (matches the Call Details header).
  let tplColor = P.brand;
  let tplSoft  = P.navyTint;   // 2nd-pass: default banner soft = navy-tint #eef2f7
  let tplDeep  = P.brand;
  if (updateInfo === 'Close Order') {
    tplColor = P.danger; tplSoft = P.dangerSoft; tplDeep = P.dangerDeep;
  } else if (updateInfo === 'OOP Order') {
    tplColor = P.warn; tplSoft = P.warnSoft; tplDeep = P.warnDeep;
  } else if (updateInfo === 'Verified Shipping' || updateInfo === 'Repeat Resupply') {
    tplColor = P.good; tplSoft = P.goodSoft; tplDeep = P.goodDeep;
  }

  // ── Update banner (replaces the old subtle update line) ─────────────
  let updateBannerInner = '';
  if (updateInfo === 'Close Order' && closeDetails) {
    updateBannerInner =
      `<div style="font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${tplDeep};opacity:.75;">Update</div>` +
      `<div style="font-size:17px;font-weight:600;color:${tplDeep};margin-top:2px;">Close Order</div>` +
      `<div style="font-size:14px;color:${tplDeep};margin-top:4px;">Reason: <span style="font-weight:600;">${esc_(closeDetails.reason)}</span></div>`;
  } else if (updateInfo === 'OOP Order' && oopDetails) {
    updateBannerInner =
      `<div style="font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${tplDeep};opacity:.75;">Update</div>` +
      `<div style="font-size:17px;font-weight:600;color:${tplDeep};margin-top:2px;">OOP Order</div>` +
      `<div style="font-size:14px;color:${tplDeep};margin-top:4px;">Total: <span style="font-weight:600;">$${esc_(oopDetails.totalCost)}</span></div>`;
  } else {
    updateBannerInner =
      `<div style="font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${tplDeep};opacity:.75;">Update</div>` +
      `<div style="font-size:17px;font-weight:600;color:${tplDeep};margin-top:2px;">${esc_(updateInfo)}</div>`;
  }
  const updateBanner =
    `<div style="background:${tplSoft};border-left:4px solid ${tplColor};border-radius:6px;padding:14px 16px;margin:14px 0;">${updateBannerInner}</div>`;

  // ── Callback banner ─────────────────────────────────────────────────
  const callbackHtml = callbackNeeded
    ? `<div style="background:${P.warnSoft};color:${P.warnDeep};padding:10px 14px;border-radius:6px;` +
      `margin:14px 0;font-weight:600;border-left:3px solid ${P.warn};">` +
      `&#9742; Callback Requested</div>`
    : '';

  // ── Subform blocks ──────────────────────────────────────────────────
  let shippingHtml = '', resupplyHtml = '', oopHtml = '';
  if (shippingDetails) shippingHtml = renderShippingDetailsHtml_(shippingDetails, P);
  if (resupplyDetails) resupplyHtml = renderResupplyDetailsHtml_(resupplyDetails, P);
  if (oopDetails)      oopHtml      = renderOopDetailsHtml_(oopDetails, P);

  // ── Resolution overrides ────────────────────────────────────────────
  let resolutionText = callData.resolution || '';
  if (updateInfo === 'OOP Order' && oopDetails && shippingDetails) {
    resolutionText = cnNlBr_(esc_(generateOOPResolutionText_(selections)));
  } else {
    resolutionText = cnFmtEmailHtml_(esc_(resolutionText));
  }

  // ── Call Details table — UMS navy header + pale-blue alternating rows
  //    (legacy aesthetic from closeOrderEmail.js / updateOrderEmail.js) ─
  const detailsRows = [
    ['Callback Number', esc_(callData.callBackNumber), false],
    ['Caller Name',     esc_(callData.callerName), false],
    ['Relationship',    esc_(callData.relationship), false],
    ['Patient & TRX',   esc_(callData.patientAndTrx), true],
    ['Issue',           cnFmtEmailHtml_(esc_(callData.issue)), false],
    ['Transferred To',  esc_(callData.transferredTo), false],
    ['Resolution',      resolutionText, false],
  ];
  const detailsBodyHtml = detailsRows.map(function (r, i) {
    // 2nd-pass email_styling.md: the Resolution row is highlighted IN PLACE
    // (navy-tint bg + a navy left-rail on the label cell) rather than split out.
    const isResolution = r[0] === 'Resolution';
    const bg = isResolution ? P.navyTint : ((i % 2 === 0) ? P.paperCard : P.brandSoft);
    const weight = r[2] ? 'font-weight:600;' : '';
    const labelExtra = isResolution ? `border-left:3px solid ${P.brand};` : '';
    return `<tr style="background:${bg};">` +
      `<td style="padding:9px 12px;border-top:1px solid ${P.line};font-weight:600;width:34%;color:${P.brand};${labelExtra}">${r[0]}</td>` +
      `<td style="padding:9px 12px;border-top:1px solid ${P.line};color:${P.ink};${weight}">${r[1]}</td>` +
    `</tr>`;
  }).join('');
  const callDetailsTable =
    `<table style="width:100%;border-collapse:collapse;font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif;` +
    `font-size:14px;border:1px solid ${P.line};border-radius:6px;overflow:hidden;margin-top:14px;">` +
      `<tr style="background:${P.brand};color:${P.paperCard};">` +
        `<td colspan="2" style="padding:10px 14px;text-align:center;font-weight:600;letter-spacing:.04em;text-transform:uppercase;font-size:12px;">Call Details</td>` +
      `</tr>` +
      detailsBodyHtml +
    `</table>`;

  // ── Logo header strip ───────────────────────────────────────────────
  const logoBar =
    `<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:18px;">` +
      `<tr>` +
        `<td style="padding-bottom:14px;border-bottom:2px solid ${P.brand};">` +
          `<img src="${P.logoUrl}" alt="UMS" style="height:46px;display:block;border:0;outline:none;">` +
        `</td>` +
      `</tr>` +
    `</table>`;

  return (
    `<div style="background:${P.paper};padding:24px;font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif;color:${P.ink};">` +
      `<div style="max-width:680px;margin:0 auto;background:${P.paperCard};border:1px solid ${P.line};border-radius:10px;padding:24px 26px;">` +
        logoBar +
        `<h2 style="margin:0 0 6px;font-family:'Inter Tight','Inter',sans-serif;font-size:20px;font-weight:600;letter-spacing:-.01em;color:${P.brand};">Update for ${esc_(callData.patientAndTrx)}</h2>` +
        `<p style="margin:0 0 14px;color:${P.muted};font-size:13px;">Hello team — please see the following update for this order.</p>` +
        callbackHtml +
        updateBanner +
        oopHtml +
        shippingHtml +
        resupplyHtml +
        callDetailsTable +
      `</div>` +
      `<div style="text-align:center;margin-top:14px;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;color:${P.muted};letter-spacing:.12em;text-transform:uppercase;">UMS Team Tools · Call Notes</div>` +
    `</div>`
  );
}
function renderShippingDetailsHtml_(d, P) {
  const verifiedDisplay = d.verifiedAddr
    ? `<span style="color:${P.goodDeep};font-weight:600;">&#10003; Yes</span>` +
      (d.verifiedAddrText ? ` <span style="color:${P.ink};">(${esc_(d.verifiedAddrText)})</span>` : '')
    : `<span style="color:${P.dangerDeep};font-weight:600;">&#10005; No</span>`;
  const mapLink = d.verifiedAddrText
    ? ` <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.verifiedAddrText)}" target="_blank" style="color:${P.accent};text-decoration:none;font-size:.9em;">View Map</a>`
    : '';
  const docsToDisplay = (d.docsTo === 'Email' && d.deliveryEmail)
    ? `Email: <span style="color:${P.ink};">${esc_(d.deliveryEmail)}</span>`
    : esc_(d.docsTo || '');
  const noteRow = d.specialNote
    ? `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};">Note</td><td style="padding:5px 8px;font-style:italic;color:${P.ink};">${esc_(d.specialNote)}</td></tr>`
    : '';
  return (
    `<div style="background:${P.goodSoft};border:1px solid #b1d1c4;` +
    `padding:14px;border-radius:8px;margin:14px 0;border-left:3px solid ${P.good};">` +
      `<h3 style="margin:0 0 8px;font-family:'Inter Tight','Inter',sans-serif;font-size:15px;color:${P.goodDeep};font-weight:600;">Verified Shipping</h3>` +
      `<table style="width:100%;border-collapse:collapse;font-size:13px;color:${P.ink};">` +
        `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};width:38%;">Verified Address</td><td style="padding:5px 8px;">${verifiedDisplay}${mapLink}</td></tr>` +
        `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};">Patient Location</td><td style="padding:5px 8px;">${esc_(d.patientLoc || '')}</td></tr>` +
        `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};">Docs To</td><td style="padding:5px 8px;">${docsToDisplay}</td></tr>` +
        `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};">Pat. Responsibility</td><td style="padding:5px 8px;">${esc_(d.patResp || '')}</td></tr>` +
        noteRow +
      `</table>` +
    `</div>`
  );
}
function renderResupplyDetailsHtml_(d, P) {
  const categoryDisplay = (d.itemCategory === 'Other') ? 'Resupply' : (d.itemCategory || '');
  const itemsQtyDisplay = d.sameItems
    ? `<span style="color:${P.goodDeep};">&#10003; Yes</span>`
    : `<span style="color:${P.dangerDeep};">&#10005; No</span>`;
  const addrDisplay = (d.addrStatus === 'Different')
    ? `<span style="color:${P.danger};font-weight:600;">New:</span> ${esc_(d.newAddr || '')}`
    : `<span style="color:${P.goodDeep};">&#10003; Same as previous</span>`;
  const insDisplay = (d.insStatus === 'Changed')
    ? `<span style="color:${P.danger};font-weight:600;">New:</span> ${esc_(d.newIns || '')} (ID: ${esc_(d.newMemId || '')})`
    : `<span style="color:${P.goodDeep};">&#10003; Same as previous</span>`;
  const provDisplay = (d.provStatus === 'Changed')
    ? `<span style="color:${P.danger};font-weight:600;">New:</span> ${esc_(d.newProv || '')} (Ph: ${esc_(formatProviderPhone_(d.newMdoPh || ''))})`
    : `<span style="color:${P.goodDeep};">&#10003; Same as previous</span>`;
  const noteRow = d.specialNote
    ? `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};">Note</td><td style="padding:5px 8px;font-style:italic;color:${P.ink};">${esc_(d.specialNote)}</td></tr>`
    : '';
  const dobRow = d.dob
    ? `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};">D.O.B.</td><td style="padding:5px 8px;color:${P.ink};">${esc_(d.dob)}</td></tr>`
    : '';
  const monthRow = d.resupplyMonth
    ? `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};">Requesting Month</td><td style="padding:5px 8px;color:${P.ink};">${esc_(d.resupplyMonth)}</td></tr>`
    : '';
  return (
    `<div style="background:${P.goodSoft};border:1px solid #b1d1c4;` +
    `padding:14px;border-radius:8px;margin:14px 0;border-left:3px solid ${P.good};">` +
      `<h3 style="margin:0 0 8px;font-family:'Inter Tight','Inter',sans-serif;font-size:15px;color:${P.goodDeep};font-weight:600;">Repeat Resupply</h3>` +
      `<table style="width:100%;border-collapse:collapse;font-size:13px;color:${P.ink};">` +
        `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};width:38%;">Item Category</td><td style="padding:5px 8px;">${esc_(categoryDisplay)}</td></tr>` +
        dobRow + monthRow +
        `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};">Last Date Scheduled</td><td style="padding:5px 8px;">${esc_(d.lastDate || '')}</td></tr>` +
        `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};">Items/Qty Same?</td><td style="padding:5px 8px;">${itemsQtyDisplay}</td></tr>` +
        `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};">Verified Address</td><td style="padding:5px 8px;">${addrDisplay}</td></tr>` +
        `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};">Verified Insurance</td><td style="padding:5px 8px;">${insDisplay}</td></tr>` +
        `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};">Verified Provider</td><td style="padding:5px 8px;">${provDisplay}</td></tr>` +
        noteRow +
      `</table>` +
    `</div>`
  );
}
function renderOopDetailsHtml_(d, P) {
  let taxDisplay = String(d.taxAmt || '');
  if (taxDisplay && taxDisplay.charAt(0) !== '$' && !isNaN(parseFloat(taxDisplay))) {
    taxDisplay = '$' + taxDisplay;
  }
  // Sales-tax row gated by the oopSalesTax feature toggle (Admin).
  const taxRow = getFlag_('oopSalesTax')
    ? `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};">Est. Sales Tax</td><td style="padding:5px 8px;">${esc_(taxDisplay)}</td></tr>`
    : '';
  return (
    `<div style="background:${P.warnSoft};border:1px solid #e7bda3;` +
    `padding:14px;border-radius:8px;margin:14px 0;border-left:3px solid ${P.warn};">` +
      `<h3 style="margin:0 0 8px;font-family:'Inter Tight','Inter',sans-serif;font-size:15px;color:${P.warnDeep};font-weight:600;">OOP Order Breakdown</h3>` +
      `<table style="width:100%;border-collapse:collapse;font-size:13px;color:${P.ink};">` +
        `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};width:38%;">Base Cost</td><td style="padding:5px 8px;">$${esc_(d.baseCost || '')}</td></tr>` +
        taxRow +
        `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};">Shipping</td><td style="padding:5px 8px;">$${esc_(d.shippingCost || '')} <span style="color:${P.muted};font-size:.85em;">(${esc_(d.shippingLabel || '')})</span></td></tr>` +
        `<tr><td style="padding:7px 8px 5px;font-weight:600;color:${P.muted};border-top:1px solid #e7bda3;">Total Customer Cost</td><td style="padding:7px 8px 5px;font-weight:700;color:${P.warnDeep};border-top:1px solid #e7bda3;">$${esc_(d.totalCost || '')}</td></tr>` +
      `</table>` +
    `</div>`
  );
}
function buildCallNoteEmailText_(callData, selections, subject) {
  // Plain-text fallback. Email clients that can't render HTML (or readers
  // who view source) get a clean version of the same information.
  const lines = [];
  lines.push(subject);
  lines.push('');
  lines.push(`Hello team — please see the following update for this order.`);
  lines.push('');
  if (selections.callbackNeeded) {
    lines.push('** Callback Requested **');
    lines.push('');
  }
  lines.push(`Update: ${selections.updateInfo}`);
  if (selections.closeDetails && selections.closeDetails.reason) {
    lines.push(`  Reason: ${selections.closeDetails.reason}`);
  }
  if (selections.oopDetails) {
    const d = selections.oopDetails;
    lines.push('');
    lines.push('OOP Order Breakdown:');
    lines.push(`  Base Cost:   $${d.baseCost}`);
    lines.push(`  Sales Tax:   ${String(d.taxAmt).charAt(0) === '$' ? d.taxAmt : '$' + d.taxAmt}`);
    lines.push(`  Shipping:    $${d.shippingCost} (${d.shippingLabel})`);
    lines.push(`  Total:       $${d.totalCost}`);
  }
  if (selections.shippingDetails) {
    const d = selections.shippingDetails;
    lines.push('');
    lines.push('Verified Shipping:');
    lines.push(`  Verified Address: ${d.verifiedAddr ? 'Yes' : 'No'}${d.verifiedAddrText ? ' (' + d.verifiedAddrText + ')' : ''}`);
    lines.push(`  Patient Location: ${d.patientLoc || ''}`);
    lines.push(`  Docs To:          ${d.docsTo || ''}${d.deliveryEmail ? ' (' + d.deliveryEmail + ')' : ''}`);
    lines.push(`  Pat. Resp:        ${d.patResp || ''}`);
    if (d.specialNote) lines.push(`  Note:             ${d.specialNote}`);
  }
  if (selections.resupplyDetails) {
    const d = selections.resupplyDetails;
    lines.push('');
    lines.push('Repeat Resupply:');
    lines.push(`  Item Category:    ${d.itemCategory || ''}`);
    if (d.dob)            lines.push(`  D.O.B.:           ${d.dob}`);
    if (d.resupplyMonth)  lines.push(`  Requesting Month: ${d.resupplyMonth}`);
    lines.push(`  Last Date:        ${d.lastDate || ''}`);
    lines.push(`  Same Items/Qty:   ${d.sameItems ? 'Yes' : 'No'}`);
    lines.push(`  Verified Addr:    ${d.addrStatus === 'Different' ? 'New: ' + (d.newAddr || '') : 'Same'}`);
    lines.push(`  Verified Ins:     ${d.insStatus === 'Changed' ? 'New: ' + (d.newIns || '') + ' (ID: ' + (d.newMemId || '') + ')' : 'Same'}`);
    lines.push(`  Verified Provider:${d.provStatus === 'Changed' ? 'New: ' + (d.newProv || '') + ' (Ph: ' + formatProviderPhone_(d.newMdoPh || '') + ')' : 'Same'}`);
    if (d.specialNote) lines.push(`  Note:             ${d.specialNote}`);
  }
  lines.push('');
  lines.push('—— Call Details ——');
  lines.push(`Callback:      ${callData.callBackNumber}`);
  lines.push(`Caller:        ${callData.callerName}`);
  lines.push(`Relationship:  ${callData.relationship}`);
  lines.push(`Patient & TRX: ${callData.patientAndTrx}`);
  lines.push(`Issue:         ${callData.issue}`);
  lines.push(`Transferred:   ${callData.transferredTo}`);
  if (selections.updateInfo && selections.updateInfo.toLowerCase() === 'oop order' && selections.oopDetails && selections.shippingDetails) {
    lines.push(`Resolution:`);
    lines.push(generateOOPResolutionText_(selections).split('\n').map(l => '  ' + l).join('\n'));
  } else {
    lines.push(`Resolution:    ${callData.resolution}`);
  }
  lines.push('');
  lines.push('— UMS Team Tools · Call Notes');
  return lines.join('\n');
}
function updateInfoToSubformKey_(updateInfo) {
  const t = String(updateInfo || '').toLowerCase();
  if (t === 'close order')       return 'close';
  if (t === 'verified shipping') return 'shipping';
  if (t === 'repeat resupply')   return 'resupply';
  if (t === 'oop order')         return 'oop';
  return '';
}
function formatPhoneNumber_(input) {
  if (!input) return '';
  const digits = String(input).replace(/\D/g, '');
  if (digits.length >= 10) {
    const main = digits.substring(0, 10);
    const ext = digits.substring(10);
    const formattedMain = `(${main.slice(0,3)}) ${main.slice(3,6)}-${main.slice(6)}`;
    if (ext.length > 0) return `${formattedMain} x${ext}`;
    return formattedMain;
  }
  return String(input);
}
function formatProviderPhone_(input) {
  if (!input) return '';
  let digits = String(input).replace(/\D/g, '');
  let prefix = '';
  if (digits.length >= 11 && digits.charAt(0) === '1') {
    prefix = '1 ';
    digits = digits.substring(1);
  }
  if (digits.length >= 10) {
    const main = digits.substring(0, 10);
    const ext = digits.substring(10);
    const formattedMain = `${main.slice(0,3)}-${main.slice(3,6)}-${main.slice(6)}`;
    if (ext.length > 0) return `${prefix}${formattedMain} x${ext}`;
    return `${prefix}${formattedMain}`;
  }
  return String(input);
}
/** Sends an external email to a customer or provider, optionally attaching
 *  PDF forms and/or including interactive fillable form links. If noteId is
 *  provided, appends a tracking entry to subformData.externalEmails[] on
 *  the linked note.
 *
 *  Phase 2: `interactiveForms` (array of form-type IDs) creates tokens and
 *  embeds "Complete this form" buttons in the email body. `prefillData`
 *  (object keyed by form-type ID) carries pre-fill values for each
 *  interactive form. */
function sendExternalEmail(payload) {
  const emp = getEmployeeInfo_();
  if (!emp) return { success: false, error: 'Employee not found.' };

  const p = payload || {};
  const recipientEmail = String(p.recipientEmail || '').trim();
  const recipientName  = String(p.recipientName || '').trim();
  const recipientType  = String(p.recipientType || '').trim().toLowerCase();
  const subject        = String(p.subject || '').trim();
  const message        = String(p.message || '').trim();
  const formIds        = Array.isArray(p.formIds) ? p.formIds : [];
  const interactiveForms = Array.isArray(p.interactiveForms) ? p.interactiveForms : [];
  const prefillData    = (p.prefillData && typeof p.prefillData === 'object') ? p.prefillData : {};
  const noteId         = p.noteId || null;
  // OOP-B — the price lines the composer picker says it inserted into `message`.
  // Advisory ONLY as a claim; oopVerifyQuotes_ re-derives each line from the
  // live sheet below and refuses the send if the message does not still carry
  // it. Never trusted as the source of the number.
  const quotedOop      = Array.isArray(p.quotedOop) ? p.quotedOop : [];

  // ── Validate ──────────────────────────────────────────────────────
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (recipientType !== 'customer' && recipientType !== 'provider') {
    return { success: false, error: 'Recipient type must be "customer" or "provider".' };
  }
  if (!subject) {
    return { success: false, error: 'Subject line is required.' };
  }

  // ── Verify quoted OOP prices BEFORE anything irreversible ─────────
  // Ordering is load-bearing: this runs ahead of token creation, the PDF
  // fetches and the send, so a refused quote costs nothing. A quote verified
  // after a token exists would leave the rep a live form link for an email
  // that never went out.
  const oopCheck = oopVerifyQuotes_(quotedOop, message);
  if (oopCheck.error) return { success: false, error: oopCheck.error };
  const oopQuoted = oopCheck.quoted;

  // ── Resolve form catalog entries (PDF attachments) ────────────────
  const catalog = CONFIG.CALL_NOTES.FORM_CATALOG || [];
  const catalogById = {};
  catalog.forEach(function (f) { catalogById[f.id] = f; });
  const selectedForms = [];
  for (let i = 0; i < formIds.length; i++) {
    const id = String(formIds[i]).trim();
    if (!catalogById[id]) {
      return { success: false, error: 'Unknown form ID: ' + id };
    }
    selectedForms.push(catalogById[id]);
  }

  // ── Validate interactive form IDs ─────────────────────────────────
  for (let i = 0; i < interactiveForms.length; i++) {
    const id = String(interactiveForms[i]).trim();
    if (!catalogById[id]) {
      return { success: false, error: 'Unknown interactive form ID: ' + id };
    }
    if (INTERACTIVE_FORM_TYPES.indexOf(id) < 0) {
      return { success: false, error: 'Form "' + id + '" does not support interactive mode.' };
    }
  }

  // ── Create tokens for interactive forms ───────────────────────────
  const formLinks = []; // { name, url, formType }
  for (let i = 0; i < interactiveForms.length; i++) {
    const fid = String(interactiveForms[i]).trim();
    const pfData = prefillData[fid] || {};
    const tokenResult = createFormToken({
      formType: fid,
      recipientEmail: recipientEmail,
      recipientName: recipientName,
      prefillData: pfData,
      noteId: noteId,
    });
    if (!tokenResult.success) {
      return { success: false, error: 'Failed to create form link for "' + catalogById[fid].name + '": ' + tokenResult.error };
    }
    formLinks.push({
      name: catalogById[fid].name,
      url: tokenResult.formUrl,
      formType: fid,
      token: tokenResult.token,
    });
  }

  // ── Fetch PDF blobs from GitHub raw URLs ──────────────────────────
  const attachments = [];
  const baseUrl = CONFIG.CALL_NOTES.FORM_BASE_URL || '';
  for (let i = 0; i < selectedForms.length; i++) {
    const form = selectedForms[i];
    const url = baseUrl + encodeURIComponent(form.fileName);
    try {
      const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (resp.getResponseCode() !== 200) {
        return { success: false, error: 'Failed to fetch form "' + form.name + '" (HTTP ' + resp.getResponseCode() + ').' };
      }
      attachments.push(resp.getBlob().setName(form.fileName));
    } catch (fetchErr) {
      return { success: false, error: 'Failed to download form "' + form.name + '": ' + fetchErr.message };
    }
  }

  // ── Build email body ──────────────────────────────────────────────
  const formNames = selectedForms.map(function (f) { return f.name; });
  const htmlBody = recipientType === 'customer'
    ? buildCustomerEmailHtml_(recipientName, message, formNames, formLinks)
    : buildProviderEmailHtml_(recipientName, message, formNames, formLinks);
  const textBody = recipientType === 'customer'
    ? buildCustomerEmailText_(recipientName, message, formNames, formLinks)
    : buildProviderEmailText_(recipientName, message, formNames, formLinks);

  // ── Send ──────────────────────────────────────────────────────────
  try {
    const emailOpts = {
      to: recipientEmail,
      subject: subject,
      body: textBody,
      htmlBody: htmlBody,
    };
    if (attachments.length > 0) emailOpts.attachments = attachments;
    sendRepEmail_(emp, emailOpts);   // Round-1 #8 — agent identity (+ neutral alias when configured)
  } catch (sendErr) {
    return { success: false, error: 'Email send failed: ' + sendErr.message };
  }

  // ── Stamp linked note (best-effort, under lock) ───────────────────
  // NOTE: unlike emailFromCallNote, sendExternalEmail is NOT wrapped in a
  // single ScriptLock (so it is intentionally absent from INV-30's set). The
  // send + PDF fetch run lock-free; the only mutating shared-state write — the
  // externalEmails[] stamp below — takes its own lock here, and token creation
  // locks independently inside createFormToken. Two concurrent external sends
  // on the same note therefore serialize on this stamp lock, so no corruption.
  const empTz = empTz_(emp);
  const sentAt = Utilities.formatDate(new Date(), empTz, "yyyy-MM-dd'T'HH:mm:ss");
  if (noteId) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(15000);
      const sheet = getCallNotesSheet_(emp);
      const located = findCallNoteRow_(sheet, noteId);
      if (located) {
        let subformData = null;
        try { subformData = JSON.parse(located.row[CN.SUBFORM_DATA]); } catch (_) {}
        if (!subformData || typeof subformData !== 'object') subformData = {};
        if (!Array.isArray(subformData.externalEmails)) subformData.externalEmails = [];
        const stampEntry = {
          to: recipientEmail,
          type: recipientType,
          forms: formIds,
          sentAt: sentAt,
        };
        if (formLinks.length > 0) {
          stampEntry.interactiveForms = formLinks.map(function(fl) {
            return { formType: fl.formType, token: fl.token };
          });
        }
        // F11: bounded like the feedback thread. This stamp runs AFTER a
        // successful send (INV-42), so a rejection cannot be surfaced as a send
        // failure — log it the same way the surrounding catch does and leave
        // the note's metadata untouched rather than writing a cell that would
        // brick every later write on it.
        const stampErrMsg = cnAppendBounded_(subformData, subformData.externalEmails,
          stampEntry, CN_EXTERNAL_EMAILS_MAX_ENTRIES, 'external email');
        if (stampErrMsg) {
          console.warn('sendExternalEmail: stamp skipped (noteId=' + noteId + '): ' + stampErrMsg);
        } else {
          sheet.getRange(located.rowIndex, CN.SUBFORM_DATA + 1).setValue(JSON.stringify(subformData));
        }
      }
    } catch (stampErr) {
      console.warn('sendExternalEmail: note stamp failed (noteId=' + noteId + '): ' + stampErr.message);
    } finally {
      lock.releaseLock();
    }
  }

  // ── Audit ─────────────────────────────────────────────────────────
  // Keep the shared AuditLog free of the raw recipient address (a customer's
  // personal email is PII; for a patient it can be PHI-adjacent). Log only the
  // recipient domain — enough to tell where it went without storing the
  // address. The full recipient is on the linked note's
  // subformData.externalEmails[] for the sending rep's own reference.
  const formsList = formIds.length > 0 ? formIds.join(',') : 'none';
  const interactiveList = interactiveForms.length > 0 ? interactiveForms.join(',') : 'none';
  const recipientDomain = recipientEmail.indexOf('@') >= 0
    ? recipientEmail.slice(recipientEmail.indexOf('@') + 1) : '(none)';
  // OOP-B: the quoted prices ride the SAME row rather than a new action, for
  // two reasons — the compliance panel already covers ExternalEmailSent
  // (CN_AUDIT_ACTIONS), and a quote only means anything attached to the send it
  // travelled on. Item + exact price + effective date, and still the recipient
  // DOMAIN only: g36's minimization is not relaxed by the quote being
  // commercially significant.
  const oopList = oopQuoted.map(function (q) {
    // The LABEL is part of the record: "$920" and "$1,070" are both correct
    // prices for the same item, and a dispute is about which one the customer
    // was told.
    return q.name + (q.label ? ' [' + q.label + ']' : '') + '@' + q.price +
      (q.effective ? ' eff ' + q.effective : '');
  }).join(' | ');
  writeAuditLog_(emp, 'ExternalEmailSent', '', '', false, 0,
    'recipientDomain=' + recipientDomain + '; type=' + recipientType +
    '; pdfForms=' + formsList +
    '; interactiveForms=' + interactiveList +
    (oopList ? '; oopQuoted=' + oopList : '') +
    (noteId ? '; noteId=' + noteId : ''));

  return {
    success: true,
    sentAt: sentAt,
    recipientEmail: recipientEmail,
    oopQuoted: oopQuoted.map(function (q) { return { name: q.name, price: q.price, effective: q.effective, label: q.label }; }),
    formsAttached: formNames,
    formLinks: formLinks.map(function(fl) { return { name: fl.name, url: fl.url, formType: fl.formType }; }),
  };
}
/** Customer-facing HTML email — friendly, warm tone. */
function buildCustomerEmailHtml_(recipientName, message, formNames, formLinks) {
  const P = CN_EMAIL_PALETTE;
  const greeting = recipientName
    ? 'Dear ' + esc_(recipientName) + ','
    : 'Hello,';
  const messageBlock = message
    ? '<p style="margin:14px 0;font-size:14px;line-height:1.6;color:' + P.ink + ';">' + cnNlBr_(esc_(message)) + '</p>'
    : '';
  let formsBlock = '';
  if (formNames.length > 0) {
    const items = formNames.map(function (n) {
      return '<li style="padding:4px 0;">' + esc_(n) + '</li>';
    }).join('');
    formsBlock =
      '<div style="background:' + P.accentSoft + ';border-left:3px solid ' + P.accent + ';border-radius:6px;padding:14px 16px;margin:14px 0;">' +
        '<div style="font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:' + P.accentDeep + ';opacity:.75;margin-bottom:6px;">Attached Documents</div>' +
        '<ul style="margin:0;padding-left:18px;color:' + P.ink + ';font-size:14px;">' + items + '</ul>' +
      '</div>';
  }
  const interactiveBlock = buildFormLinksBlock_(formLinks, P);
  const logoBar =
    '<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:18px;">' +
      '<tr>' +
        '<td style="padding-bottom:14px;border-bottom:2px solid ' + P.brand + ';">' +
          '<img src="' + P.logoUrl + '" alt="UMS" style="height:46px;display:block;border:0;outline:none;">' +
        '</td>' +
      '</tr>' +
    '</table>';
  return (
    '<div style="background:' + P.paper + ';padding:24px;font-family:\'Inter\',-apple-system,Helvetica,Arial,sans-serif;color:' + P.ink + ';">' +
      '<div style="max-width:680px;margin:0 auto;background:' + P.paperCard + ';border:1px solid ' + P.line + ';border-radius:10px;padding:24px 26px;">' +
        logoBar +
        '<p style="margin:0 0 6px;font-size:16px;color:' + P.ink + ';">' + greeting + '</p>' +
        '<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:' + P.muted + ';">Thank you for reaching out to UniversalMed Supply. We appreciate the opportunity to assist you.</p>' +
        messageBlock +
        interactiveBlock +
        formsBlock +
        '<p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:' + P.muted + ';">If you have any questions regarding the attached documents or need further assistance, please do not hesitate to contact us.</p>' +
        '<p style="margin:14px 0 0;font-size:14px;color:' + P.ink + ';">Warm regards,<br><strong>UniversalMed Supply</strong></p>' +
      '</div>' +
      '<div style="text-align:center;margin-top:14px;font-family:\'IBM Plex Mono\',ui-monospace,monospace;font-size:10px;color:' + P.muted + ';letter-spacing:.12em;text-transform:uppercase;">UMS Team Tools</div>' +
    '</div>'
  );
}
/** Provider-facing HTML email — clinical, professional tone. */
function buildProviderEmailHtml_(recipientName, message, formNames, formLinks) {
  const P = CN_EMAIL_PALETTE;
  const greeting = recipientName
    ? 'Dear ' + esc_(recipientName) + ','
    : 'To Whom It May Concern,';
  const messageBlock = message
    ? '<p style="margin:14px 0;font-size:14px;line-height:1.6;color:' + P.ink + ';">' + cnNlBr_(esc_(message)) + '</p>'
    : '';
  let formsBlock = '';
  if (formNames.length > 0) {
    const items = formNames.map(function (n) {
      return '<li style="padding:4px 0;">' + esc_(n) + '</li>';
    }).join('');
    formsBlock =
      '<div style="background:' + P.goodSoft + ';border-left:3px solid ' + P.good + ';border-radius:6px;padding:14px 16px;margin:14px 0;">' +
        '<div style="font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:' + P.goodDeep + ';opacity:.75;margin-bottom:6px;">Attached Documents</div>' +
        '<ul style="margin:0;padding-left:18px;color:' + P.ink + ';font-size:14px;">' + items + '</ul>' +
      '</div>';
  }
  const interactiveBlock = buildFormLinksBlock_(formLinks, P);
  const logoBar =
    '<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:18px;">' +
      '<tr>' +
        '<td style="padding-bottom:14px;border-bottom:2px solid ' + P.brand + ';">' +
          '<img src="' + P.logoUrl + '" alt="UMS" style="height:46px;display:block;border:0;outline:none;">' +
        '</td>' +
      '</tr>' +
    '</table>';
  return (
    '<div style="background:' + P.paper + ';padding:24px;font-family:\'Inter\',-apple-system,Helvetica,Arial,sans-serif;color:' + P.ink + ';">' +
      '<div style="max-width:680px;margin:0 auto;background:' + P.paperCard + ';border:1px solid ' + P.line + ';border-radius:10px;padding:24px 26px;">' +
        logoBar +
        '<p style="margin:0 0 6px;font-size:16px;color:' + P.ink + ';">' + greeting + '</p>' +
        '<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:' + P.muted + ';">Please find the requested documentation attached to this correspondence. We are writing on behalf of our patient as part of their ongoing care coordination with UniversalMed Supply.</p>' +
        messageBlock +
        interactiveBlock +
        formsBlock +
        '<p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:' + P.muted + ';">Should you require any additional information or have questions regarding the enclosed materials, please contact our office at your earliest convenience.</p>' +
        '<p style="margin:14px 0 0;font-size:14px;color:' + P.ink + ';">Respectfully,<br><strong>UniversalMed Supply</strong></p>' +
      '</div>' +
      '<div style="text-align:center;margin-top:14px;font-family:\'IBM Plex Mono\',ui-monospace,monospace;font-size:10px;color:' + P.muted + ';letter-spacing:.12em;text-transform:uppercase;">UMS Team Tools</div>' +
    '</div>'
  );
}
/** Customer-facing plain-text fallback. */
function buildCustomerEmailText_(recipientName, message, formNames, formLinks) {
  const lines = [];
  lines.push(recipientName ? 'Dear ' + recipientName + ',' : 'Hello,');
  lines.push('');
  lines.push('Thank you for reaching out to UniversalMed Supply. We appreciate the opportunity to assist you.');
  if (message) { lines.push(''); lines.push(message); }
  if (formLinks && formLinks.length > 0) {
    lines.push('');
    lines.push('Please complete the following form(s) online:');
    formLinks.forEach(function (fl) { lines.push('  - ' + fl.name + ': ' + fl.url); });
    lines.push('(These links expire in 72 hours. No account or login required.)');
  }
  if (formNames.length > 0) {
    lines.push('');
    lines.push('Attached Documents:');
    formNames.forEach(function (n) { lines.push('  - ' + n); });
  }
  lines.push('');
  lines.push('If you have any questions regarding the attached documents or need further assistance, please do not hesitate to contact us.');
  lines.push('');
  lines.push('Warm regards,');
  lines.push('UniversalMed Supply');
  return lines.join('\n');
}
/** Provider-facing plain-text fallback. */
function buildProviderEmailText_(recipientName, message, formNames, formLinks) {
  const lines = [];
  lines.push(recipientName ? 'Dear ' + recipientName + ',' : 'To Whom It May Concern,');
  lines.push('');
  lines.push('Please find the requested documentation attached to this correspondence. We are writing on behalf of our patient as part of their ongoing care coordination with UniversalMed Supply.');
  if (message) { lines.push(''); lines.push(message); }
  if (formLinks && formLinks.length > 0) {
    lines.push('');
    lines.push('Please complete the following form(s) online:');
    formLinks.forEach(function (fl) { lines.push('  - ' + fl.name + ': ' + fl.url); });
    lines.push('(These links expire in 72 hours. No account or login required.)');
  }
  if (formNames.length > 0) {
    lines.push('');
    lines.push('Attached Documents:');
    formNames.forEach(function (n) { lines.push('  - ' + n); });
  }
  lines.push('');
  lines.push('Should you require any additional information or have questions regarding the enclosed materials, please contact our office at your earliest convenience.');
  lines.push('');
  lines.push('Respectfully,');
  lines.push('UniversalMed Supply');
  return lines.join('\n');
}


// ════════════════════════════════════════════════════════════════════════════
//  INTERACTIVE FORM TOKENS — PUBLIC FILLABLE FORMS
//  ────────────────────────────────────────────────────────────────────────
//  Phase 2 of the customer/provider form feature. Reps can send fillable
//  form links (instead of / alongside PDF attachments) via the external
//  email modal. Each link carries a UUID token that maps to a FormTokens
//  row in the ADP spreadsheet. External recipients open the link without
//  Google auth — the token IS the auth. Submissions land in FormSubmissions.
//
//  Token lifecycle: pending → submitted (one-time) or pending → expired
//  (after CONFIG.FORM_TOKEN_EXPIRY_HOURS). Expired/submitted tokens show
//  an error page when the recipient tries to open them.
//
//  Security: getFormByToken and submitFormByToken are the ONLY public-
//  facing endpoints — they do NOT call getEmployeeInfo_() and do NOT
//  require a logged-in user. All other server functions still require
//  employee auth via getEmployeeInfo_().
// ════════════════════════════════════════════════════════════════════════════
/** Rolling note retention (item 7): days from CN_NOTE_RETENTION_DAYS Script
 *  Property first, else CONFIG.CALL_NOTES.NOTE_RETENTION_DAYS. 0/neg/unparseable
 *  → 0 (disabled). */
function getNoteRetentionDays_() {
  const prop = PropertiesService.getScriptProperties().getProperty('CN_NOTE_RETENTION_DAYS');
  const raw = (prop != null && prop !== '') ? prop : (CONFIG.CALL_NOTES.NOTE_RETENTION_DAYS || 0);
  const v = parseInt(raw, 10);
  return (isNaN(v) || v < 0) ? 0 : v;
}
/** Rolling auto-delete of call notes older than the retention window, across
 *  every enrolled rep's per-rep Sheet (item 7). Top-level (time-trigger
 *  target) → reachable via google.script.run, so gated like the other
 *  destructive trigger handlers (assertManagerCaller_). DISABLED by default
 *  (CN_NOTE_RETENTION_DAYS / CONFIG = 0); the delete is irreversible and the
 *  notes are PHI — confirm the canonical record lives elsewhere before
 *  enabling. A broken per-rep Sheet is skipped, not fatal. Dates are read from
 *  CN.DATE_LOCAL (Sheets-coerced to a Date; parseRetentionDateMs_ handles it).
 *  Writes a PHI-free CallNotesPurge audit row with counts. */
function purgeOldCallNotes() {
  assertManagerCaller_('purgeOldCallNotes');
  try {
    const days = getNoteRetentionDays_();
    if (!days) {
      Logger.log('purgeOldCallNotes: retention disabled (CN_NOTE_RETENTION_DAYS=0) — nothing purged.');
      return;
    }
    const cutoffMs = Date.now() - days * 86400000;
    const roster = getEmployeeRosterRows_();
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    let repsTouched = 0, notesRemoved = 0;
    try {
      for (let r = 1; r < roster.length; r++) {
        const sheetId = cnEnrolledSheetId_(roster[r]);
        if (!sheetId) continue;
        const emp = {
          id:   String(roster[r][EMP.ID]).trim(),
          name: String(roster[r][EMP.NAME]).trim(),
          callNotesSheetId: sheetId,
        };
        try {
          const removed = purgeSheetRowsOlderThan_(getCallNotesSheet_(emp), CN.DATE_LOCAL, cutoffMs);
          if (removed > 0) { notesRemoved += removed; repsTouched++; }
        } catch (e) {
          Logger.log('purgeOldCallNotes: skipped rep ' + emp.id + ': ' + e.message);
        }
      }
    } finally {
      lock.releaseLock();
    }
    writeAuditLog_(_SYSTEM_AUDIT_EMP_, 'CallNotesPurge', '', '', false, 0,
      `retentionDays=${days}; repsTouched=${repsTouched}; notesRemoved=${notesRemoved}`);
    Logger.log(`purgeOldCallNotes: removed ${notesRemoved} note(s) across ${repsTouched} rep(s) older than ${days} day(s).`);
  } catch (err) {
    Logger.log('purgeOldCallNotes failed: ' + err.message);
  }
}
/** Cold-archive window: days from CN_NOTE_ARCHIVE_DAYS Script Property first,
 *  else CONFIG.CALL_NOTES.NOTE_ARCHIVE_DAYS. 0/neg/unparseable → 0 (disabled).
 *  Mirrors getNoteRetentionDays_. */
function getNoteArchiveDays_() {
  const prop = PropertiesService.getScriptProperties().getProperty('CN_NOTE_ARCHIVE_DAYS');
  const raw = (prop != null && prop !== '') ? prop : (CONFIG.CALL_NOTES.NOTE_ARCHIVE_DAYS || 0);
  const v = parseInt(raw, 10);
  return (isNaN(v) || v < 0) ? 0 : v;
}
/** Returns the cold-archive tab (CONFIG.CALL_NOTES.ARCHIVE_TAB) in the given
 *  per-rep spreadsheet, creating it with the canonical CN_HEADERS on first use.
 *  Same schema as the live Notes tab so an archived row round-trips identically
 *  (and stays readable by callNoteRowToObject_ if ever needed). */
function getOrCreateNotesArchiveTab_(ss) {
  const name = CONFIG.CALL_NOTES.ARCHIVE_TAB;
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(CN_HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, CN_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}
/** Move rows older than cutoffMs from srcSheet to archiveSheet (preserving the
 *  full row), then delete them from srcSheet. APPEND-then-delete so a mid-run
 *  failure can only DUPLICATE into the cold archive (never lose) — the source
 *  still has the row, so the next run re-archives + deletes it. Batched append
 *  (one setValues block) + bottom-up delete. Returns the count moved. Mirrors
 *  purgeSheetRowsOlderThan_ but is NON-destructive (data preserved).
 *  opts (#7, INV-153 — optional, defaults preserve the CN call sites exactly):
 *    headerRows — data starts after this many header rows (default 1; the ADP
 *                 Timesheet has TWO). A non-date header cell is also skipped by
 *                 the parseRetentionDateMs_ null-guard, so this is belt+braces.
 *    width      — normalize moved rows to this column width (default
 *                 CN_HEADERS.length, the original hardcoded behavior). */
function archiveSheetRowsOlderThan_(srcSheet, archiveSheet, dateColIdx, cutoffMs, opts) {
  opts = opts || {};
  const headerRows = opts.headerRows || 1;
  const lastRow = srcSheet.getLastRow();
  if (lastRow < headerRows + 1) return 0;
  const rows = srcSheet.getDataRange().getValues();
  const toMoveRows = [];   // full row values, in sheet order
  const toDelete = [];     // 1-based sheet row indices
  // Cycle-12 F3 — optional per-run bound (opts.maxRows). Without it a large
  // FIRST enable can never finish: the append lands + flushes, then the deletes
  // run ONE row at a time (~0.05–0.2s each), so a year of Timesheet rows
  // (~20k for this team) blows the 6-minute execution ceiling — and because the
  // append is already committed, every killed run RE-APPENDS the rows it did
  // not manage to delete, duplicating payroll into the cold store while the
  // live tab barely shrinks. Capping makes each run finite and monotonic (rows
  // deleted this run are gone for good), so the backlog drains over successive
  // nights. Callers that pass no maxRows are byte-identical to before.
  const maxRows = (opts.maxRows > 0) ? opts.maxRows : 0;
  for (let i = headerRows; i < rows.length; i++) {
    const ms = parseRetentionDateMs_(rows[i][dateColIdx]);
    if (ms !== null && ms < cutoffMs) { toMoveRows.push(rows[i]); toDelete.push(i + 1); }
    if (maxRows && toMoveRows.length >= maxRows) break;
  }
  if (!toMoveRows.length) return 0;
  // Normalize every moved row to a uniform rectangle (setValues requires it).
  // Cycle-11 L-16: the rectangle is max(canonical width, widest source row) —
  // the old truncate-to-canonical silently DESTROYED human-added trailing
  // columns on the move, contradicting INV-132's "can only duplicate, never
  // lose" (two-way Sheet entry makes hand annotations plausible). Shorter
  // rows still pad with ''.
  let width = opts.width || CN_HEADERS.length;
  for (let w = 0; w < toMoveRows.length; w++) {
    if (toMoveRows[w].length > width) width = toMoveRows[w].length;
  }
  const block = toMoveRows.map(function (r) {
    const out = new Array(width);
    for (let c = 0; c < width; c++) out[c] = (c < r.length) ? r[c] : '';
    return out;
  });
  // L-16: a wider-than-grid write would throw (getRange beyond maxColumns) —
  // grow the archive grid first so the preserved trailing cells actually land.
  if (archiveSheet.getMaxColumns() < width) {
    archiveSheet.insertColumnsAfter(archiveSheet.getMaxColumns(), width - archiveSheet.getMaxColumns());
  }
  archiveSheet.getRange(archiveSheet.getLastRow() + 1, 1, block.length, width).setValues(block);
  SpreadsheetApp.flush();   // ensure the archive write lands before we delete the source
  // Sheets REFUSES to delete every non-frozen row of a grid ("not possible to
  // delete all non-frozen rows" — the _clearTestCallNotes lesson). A run whose
  // cutoff covers the whole tab on a grid with no spare rows would throw on
  // the LAST delete, after the archive append had landed, and the per-rep
  // catch would then skip that rep's archive forever. Keep one spare row so
  // the final delete is never "all non-frozen rows" (2026-09-04 follow-on).
  if (toDelete.length && toDelete.length >= srcSheet.getMaxRows() - headerRows) {
    srcSheet.insertRowAfter(srcSheet.getMaxRows());
  }
  for (let j = toDelete.length - 1; j >= 0; j--) srcSheet.deleteRow(toDelete[j]);
  return toMoveRows.length;
}
/** Cold-archive tier for call-note retention (the SAFE alternative to the
 *  irreversible purgeOldCallNotes). Across every enrolled rep's per-rep Sheet,
 *  MOVES Notes rows older than the archive window into a NotesArchive tab in the
 *  SAME spreadsheet — data is preserved (the canonical record stays), the LIVE
 *  Notes tab is bounded (faster open-ended scans), and no new operator store is
 *  needed. DISABLED by default (CN_NOTE_ARCHIVE_DAYS / CONFIG = 0). Top-level
 *  (time-trigger target) → reachable via google.script.run, so gated like the
 *  other trigger handlers (assertManagerCaller_); locked (INV-01). A broken
 *  per-rep Sheet is skipped, not fatal. Dates read from CN.DATE_LOCAL
 *  (Sheets-coerced; parseRetentionDateMs_ handles it). Writes a PHI-free
 *  CallNotesArchive audit row with counts.
 *
 *  OPERATOR ORDERING: if BOTH archive and purge are enabled, keep
 *  CN_NOTE_ARCHIVE_DAYS ≤ CN_NOTE_RETENTION_DAYS — the 3am archive runs before
 *  the 4am purge, so the safe path is archive-first. The recommended setup is
 *  archive-only (leave retention/purge at 0): bounded live tab, full history
 *  retained in NotesArchive. */
function archiveOldCallNotes() {
  assertManagerCaller_('archiveOldCallNotes');
  try {
    const days = getNoteArchiveDays_();
    if (!days) {
      Logger.log('archiveOldCallNotes: archival disabled (CN_NOTE_ARCHIVE_DAYS=0) — nothing archived.');
      return;
    }
    const cutoffMs = Date.now() - days * 86400000;
    const roster = getEmployeeRosterRows_();
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    let repsTouched = 0, notesArchived = 0;
    // Cycle-12 F3-sibling: a WHOLE-RUN row budget, shared across reps. The
    // Timesheet twin needed a bound because one tab can hold ~20k rows; here
    // the compounding is worse — the mover is called once PER REP inside one
    // execution AND one global ScriptLock, so N reps with backlogs multiply.
    // A per-rep cap alone would not bound the run, so the budget is shared and
    // the rep loop STOPS when it is spent. Consequence (deliberate): reps are
    // drained in roster order, so an early rep with years of notes delays
    // later reps by a night or two. That is fine because the op is idempotent
    // and nightly — each run is finite and monotonic (rows deleted this run
    // are gone for good), which is exactly what the unbounded version was not:
    // the append is flushed BEFORE the deletes, so a run killed by the
    // 6-minute ceiling re-appended everything it had not deleted, duplicating
    // PHI into the cold archive night after night.
    let budget = CN_NOTE_ARCHIVE_MAX_ROWS_PER_RUN;
    // A9 (cycle 13): report the cap as hit only when it actually TRUNCATED the
    // run — i.e. the budget ran out while reps still had work. `budget <= 0`
    // alone also fires when the last rep's move consumed exactly the remaining
    // rows and nothing was left to do, so a CLEAN final run stamped
    // `hitPerRunCap=2000` and an operator watching a first-enable backlog drain
    // (INV-153's documented "expect several nights of capped runs") had no way
    // to tell that it had finished.
    // Residual (accepted): a remaining enrolled rep might itself have had no
    // archivable notes, so this can still over-report by one run at the very
    // end of a drain. It can no longer over-report on a run that visited every
    // rep, which is the case an operator actually watches.
    let truncated = false;
    try {
      for (let r = 1; r < roster.length; r++) {
        if (budget <= 0) {
          for (let k = r; k < roster.length; k++) {
            if (cnEnrolledSheetId_(roster[k])) { truncated = true; break; }
          }
          break;
        }
        const sheetId = cnEnrolledSheetId_(roster[r]);
        if (!sheetId) continue;
        const emp = {
          id:   String(roster[r][EMP.ID]).trim(),
          name: String(roster[r][EMP.NAME]).trim(),
          callNotesSheetId: sheetId,
        };
        try {
          const live = getCallNotesSheet_(emp);
          const archive = getOrCreateNotesArchiveTab_(live.getParent());
          const moved = archiveSheetRowsOlderThan_(live, archive, CN.DATE_LOCAL, cutoffMs,
            { maxRows: budget });
          if (moved > 0) { notesArchived += moved; repsTouched++; budget -= moved; }
        } catch (e) {
          Logger.log('archiveOldCallNotes: skipped rep ' + emp.id + ': ' + e.message);
        }
      }
    } finally {
      lock.releaseLock();
    }
    // A9: `truncated`, not `budget <= 0` — see the loop above. Wording matches
    // the Timesheet twin so both audit trails read the same way.
    const capped = truncated
      ? `; hitPerRunCap=${CN_NOTE_ARCHIVE_MAX_ROWS_PER_RUN} (more remain — continues tomorrow)` : '';
    writeAuditLog_(_SYSTEM_AUDIT_EMP_, 'CallNotesArchive', '', '', false, 0,
      `archiveDays=${days}; repsTouched=${repsTouched}; notesArchived=${notesArchived}${capped}`);
    Logger.log(`archiveOldCallNotes: moved ${notesArchived} note(s) across ${repsTouched} rep(s) older than ${days} day(s) to ${CONFIG.CALL_NOTES.ARCHIVE_TAB}.`);
  } catch (err) {
    Logger.log('archiveOldCallNotes failed: ' + err.message);
  }
}
/** 3rd-tier cold-store retention window: days from CN_ARCHIVE_RETENTION_DAYS
 *  Script Property first, else CONFIG.CALL_NOTES.ARCHIVE_RETENTION_DAYS.
 *  0/neg/unparseable → 0 (disabled). Mirrors getNoteRetentionDays_. */
function getArchiveRetentionDays_() {
  const prop = PropertiesService.getScriptProperties().getProperty('CN_ARCHIVE_RETENTION_DAYS');
  const raw = (prop != null && prop !== '') ? prop : (CONFIG.CALL_NOTES.ARCHIVE_RETENTION_DAYS || 0);
  const v = parseInt(raw, 10);
  return (isNaN(v) || v < 0) ? 0 : v;
}
/** 3rd-tier retention: irreversibly delete rows from each rep's NotesArchive
 *  (cold store) older than CN_ARCHIVE_RETENTION_DAYS, so the cold archive
 *  doesn't grow forever. This is the ONLY mechanism that deletes archived
 *  notes (archiveOldCallNotes MOVES into the archive; purgeOldCallNotes never
 *  touches it). Top-level (time-trigger target) → reachable via
 *  google.script.run, so gated like the other destructive trigger handlers
 *  (assertManagerCaller_); locked (INV-01). DISABLED by default
 *  (CN_ARCHIVE_RETENTION_DAYS / CONFIG = 0); the delete is irreversible and the
 *  notes are PHI. READ-ONLY w.r.t. the tab's existence — it never creates a
 *  NotesArchive tab (a rep with no archive is simply skipped). Dates read from
 *  CN.DATE_LOCAL (the archived row keeps its original date). Cross-rep; a broken
 *  Sheet is skipped. Writes a PHI-free CallNotesArchivePurge audit row.
 *
 *  OPERATOR: keep CN_ARCHIVE_RETENTION_DAYS ≥ CN_NOTE_ARCHIVE_DAYS — it's the
 *  cold-store lifetime, longer than the move window. Scheduled at manager-tz 2am
 *  (before the 3am archive) so it operates on yesterday's settled archive. */
function purgeArchivedCallNotes() {
  assertManagerCaller_('purgeArchivedCallNotes');
  try {
    const days = getArchiveRetentionDays_();
    if (!days) {
      Logger.log('purgeArchivedCallNotes: archive retention disabled (CN_ARCHIVE_RETENTION_DAYS=0) — nothing purged.');
      return;
    }
    const cutoffMs = Date.now() - days * 86400000;
    const roster = getEmployeeRosterRows_();
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    let repsTouched = 0, notesRemoved = 0;
    try {
      for (let r = 1; r < roster.length; r++) {
        const sheetId = cnEnrolledSheetId_(roster[r]);
        if (!sheetId) continue;
        const emp = {
          id:   String(roster[r][EMP.ID]).trim(),
          name: String(roster[r][EMP.NAME]).trim(),
          callNotesSheetId: sheetId,
        };
        try {
          // Read-only existence check — never create the archive tab here.
          const archive = getCallNotesSheet_(emp).getParent().getSheetByName(CONFIG.CALL_NOTES.ARCHIVE_TAB);
          if (!archive) continue;
          const removed = purgeSheetRowsOlderThan_(archive, CN.DATE_LOCAL, cutoffMs);
          if (removed > 0) { notesRemoved += removed; repsTouched++; }
        } catch (e) {
          Logger.log('purgeArchivedCallNotes: skipped rep ' + emp.id + ': ' + e.message);
        }
      }
    } finally {
      lock.releaseLock();
    }
    writeAuditLog_(_SYSTEM_AUDIT_EMP_, 'CallNotesArchivePurge', '', '', false, 0,
      `archiveRetentionDays=${days}; repsTouched=${repsTouched}; notesRemoved=${notesRemoved}`);
    Logger.log(`purgeArchivedCallNotes: removed ${notesRemoved} archived note(s) across ${repsTouched} rep(s) older than ${days} day(s).`);
  } catch (err) {
    Logger.log('purgeArchivedCallNotes failed: ' + err.message);
  }
}
/** #8 — manager-triggered reconcile pass. Scans every enrolled rep's Notes tab
 *  for HAND-ENTERED rows (content present but no noteId — typed directly into
 *  the Sheet, not via the app) and backfills the fields the app needs to treat
 *  them as first-class: a UUID noteId, a Timestamp, and a yyyy-MM-dd DateLocal
 *  (derived from whatever the human supplied, else the rep-tz now/today).
 *  Idempotent — a row with a noteId is skipped, so re-running is a no-op.
 *  Manager-gated + locked; per-rep Sheet failures are skipped. Content fields
 *  are NEVER modified. Writes a CallNotesReconcile audit row. */
function reconcileCallNotes() {
  // F1/F2 — this is a DAILY TRIGGER handler (runs as the installer) AS WELL AS a
  // manual Admin-tab button, so it MUST use the MANAGER_EMAILS trigger-handler
  // gate (assertManagerCaller_, the INV-44 idiom), NOT emp.isAdmin: under a
  // narrowed ADMIN_EMAILS, or a MANAGER_EMAILS installer who isn't a roster
  // employee, an admin/roster gate silently no-ops the nightly reconcile (INV-109).
  assertManagerCaller_('reconcileCallNotes');
  const callerEmp = getEmployeeInfo_() || _SYSTEM_AUDIT_EMP_;
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const roster = getEmployeeRosterRows_();
    const CONTENT_COLS = [CN.CALLBACK, CN.CALLER, CN.RELATIONSHIP, CN.PATIENT_TRX, CN.ISSUE, CN.TRANSFERRED_TO, CN.RESOLUTION];
    let repsTouched = 0, rowsBackfilled = 0;
    for (let r = 1; r < roster.length; r++) {
      const sheetId = cnEnrolledSheetId_(roster[r]);
      if (!sheetId) continue;
      const emp = {
        id: String(roster[r][EMP.ID]).trim(),
        name: String(roster[r][EMP.NAME]).trim(),
        callNotesSheetId: sheetId,
        timezone: String(roster[r][EMP.TIMEZONE] || '').trim() || CONFIG.TIMEZONE,
      };
      try {
        const sheet = getCallNotesSheet_(emp);
        const lastRow = sheet.getLastRow();
        if (lastRow < 2) continue;
        const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
        const tz = safeTimezone_(emp.timezone);
        let repBackfilled = 0;
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          if (String(row[CN.NOTE_ID] || '').trim()) continue;   // app-created → skip
          const hasContent = CONTENT_COLS.some(function (c) { return String(row[c] || '').trim(); });
          if (!hasContent) continue;                             // blank row → skip
          const rowIndex = i + 2;
          const tsHadValue = !!cnTimestampString_(row[CN.TIMESTAMP]).trim();
          let dateLocal = cnDateLocalString_(row[CN.DATE_LOCAL]);    // '' if blank; handles Date coercion
          // C1 (cycle 10): recover a coerced Timestamp via cnTimestampString_
          // (INV-142) — the old inline branch formatted in the REP's tz, but
          // the cell was coerced in the SHEET's tz (pinned to the ADP tz,
          // INV-110/141). For a CST rep, any hand-entered time between
          // 00:00–11:29 IST recovered ~-11.5h and backfilled dateLocal onto
          // the PREVIOUS day (the exact getMyNoteHourBuckets cycle-8 class).
          let timestamp = cnTimestampString_(row[CN.TIMESTAMP]).trim();
          if (!dateLocal && timestamp) dateLocal = timestamp.substring(0, 10);
          if (!dateLocal) dateLocal = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
          if (!timestamp) timestamp = dateLocal + 'T12:00:00';
          sheet.getRange(rowIndex, CN.NOTE_ID + 1).setValue(Utilities.getUuid());
          if (!tsHadValue) sheet.getRange(rowIndex, CN.TIMESTAMP + 1).setValue(timestamp);
          if (!cnDateLocalString_(row[CN.DATE_LOCAL])) sheet.getRange(rowIndex, CN.DATE_LOCAL + 1).setValue(dateLocal);
          repBackfilled++;
        }
        if (repBackfilled > 0) { rowsBackfilled += repBackfilled; repsTouched++; }
      } catch (e) {
        Logger.log('reconcileCallNotes: skipped rep ' + emp.id + ': ' + e.message);
      }
    }
    writeAuditLog_(callerEmp, 'CallNotesReconcile', '', '', false, 0,
      `repsTouched=${repsTouched}; rowsBackfilled=${rowsBackfilled}`, callerEmp.email);
    return { success: true, repsTouched: repsTouched, rowsBackfilled: rowsBackfilled };
  } catch (err) { return { error: err.message }; }
  finally { lock.releaseLock(); }
}


// ════════════════════════════════════════════════════════════════════════════
//  AUTOMATION
// ════════════════════════════════════════════════════════════════════════════
function sendCallNotesEodDigest() {
  assertManagerCaller_('sendCallNotesEodDigest');  // see sendDailyMissedPunchAlerts note
  try {
    const targetHour = CONFIG.CALL_NOTES.EOD_WARNING_HOUR;
    const now = new Date();
    const roster = getEmployeeRosterRows_();
    let sentCount = 0;
    for (let r = 1; r < roster.length; r++) {
      const emailAddr = String(roster[r][EMP.EMAIL] || '').trim();
      const sheetId = cnEnrolledSheetId_(roster[r]);   // F14: trimmed predicate
      if (!emailAddr || !sheetId) continue;
      const tzRaw = String(roster[r][EMP.TIMEZONE] || '').trim();
      const tz = safeTimezone_(tzRaw);
      // G4: this handler runs HOURLY (see installAutomationTriggers). Email a
      // rep only during the single run that coincides with their LOCAL EOD
      // hour — hour-equality (not a ±minute window) guarantees exactly one
      // match per rep per day regardless of timezone. The prior once-at-
      // manager-5pm window silently skipped offshore reps (IST/PHT) whose
      // local 5pm never lined up with the manager's. A rep far enough off the
      // hour could in rare trigger-jitter cases match two consecutive hourly
      // runs — a benign duplicate reminder, not a miss.
      const hh = parseInt(Utilities.formatDate(now, tz, 'H'), 10);
      if (hh !== targetHour) continue;

      const empObj = {
        id: String(roster[r][EMP.ID]).trim(),
        name: String(roster[r][EMP.NAME]).trim(),
        email: emailAddr,
        callNotesSheetId: sheetId,
        timezone: tz,
      };
      const today = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
      let unresolved;
      try {
        const sheet = getCallNotesSheet_(empObj);
        // Bounded read (A6): today's notes are a contiguous row slice
        // (append-order assumption, INV-46) — scan the 1-column date range to
        // find it instead of reading the rep's whole history every hour.
        const located = readCallNoteRowsInRange_(sheet, today, today);
        unresolved = [];
        for (let i = 0; i < located.length; i++) {
          const row = located[i].row;
          if (cnDateLocalString_(row[CN.DATE_LOCAL]) !== today) continue;
          if (String(row[CN.FLAG_TYPE] || '').toLowerCase() !== 'action') continue;
          const resStr = String(row[CN.RESOLVED] || '').toLowerCase();
          if (resStr === 'true' || resStr === 'yes' || resStr === '1') continue;
          unresolved.push(callNoteRowToObject_(located[i]));
        }
      } catch (e) {
        Logger.log(`sendCallNotesEodDigest: skipped ${empObj.id} (${e.message})`);
        continue;
      }
      if (unresolved.length === 0) continue;
      try {
        sendOneRepEodDigest_(empObj, unresolved);
        sentCount++;
      } catch (e) {
        Logger.log(`Failed to email rep ${empObj.email} EOD digest: ${e.message}`);
      }
    }
    stampDigestLastRun_('eod');
    Logger.log(`sendCallNotesEodDigest: sent ${sentCount} reminder(s).`);
  } catch (err) {
    Logger.log('sendCallNotesEodDigest failed: ' + err.message);
  }
}
function sendOneRepEodDigest_(emp, unresolvedNotes) {
  const P = CN_EMAIL_PALETTE;
  const itemsHtml = unresolvedNotes.map(function (n) {
    const time = n.timestamp.replace(/.*T/, '').substring(0, 5);
    return `<tr>` +
      `<td style="padding:7px 10px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:${P.muted};vertical-align:top;">${esc_(time)}</td>` +
      `<td style="padding:7px 10px;color:${P.ink};font-size:13px;">` +
        `<strong>${esc_(n.caller || n.patientAndTrx || '—')}</strong>` +
        (n.patientAndTrx ? ` <span style="color:${P.muted};font-family:'IBM Plex Mono',monospace;font-size:11px;">${esc_(n.patientAndTrx)}</span>` : '') +
        `<br><span style="color:${P.muted};font-size:12px;">${cnFmtEmailHtml_(esc_(n.issue || ''))}</span>` +
      `</td>` +
      `</tr>`;
  }).join('');
  const itemsText = unresolvedNotes.map(function (n) {
    const time = n.timestamp.replace(/.*T/, '').substring(0, 5);
    return `  ${time}  ${n.caller || n.patientAndTrx || '—'} — ${n.issue || ''}`;
  }).join('\n');

  // Operator 2026-08-13 (email-alignment audit): the three CN digests were the
  // mails the 2026-08-11 branded restyle missed — this one also told the rep
  // to "hop into the web app" with NO LINK, the exact dead-end the restyle
  // fixed on the missed-clock-out email. Now the shared chrome + a real CTA.
  const inner =
    `<p style="color:${P.muted};font-size:13px;margin:0 0 12px;">Hey ${esc_(emp.name.split(' ')[0])} — ` +
      `you flagged the following notes today for follow-up but haven't marked them resolved yet:</p>` +
    `<table style="width:100%;border-collapse:collapse;border:1px solid ${P.line};border-radius:6px;overflow:hidden;">` +
      `<tr style="background:${P.warnSoft};"><td colspan="2" style="padding:8px 12px;color:${P.warnDeep};font-weight:600;font-size:13px;">${unresolvedNotes.length} unresolved</td></tr>` +
      itemsHtml +
    `</table>` +
    `<p style="color:${P.muted};font-size:12px;margin:12px 0 0;">Toggle each one resolved when it&rsquo;s handled.</p>`;
  const htmlBody = buildBrandedEmailHtml_(
    `${unresolvedNotes.length} note${unresolvedNotes.length === 1 ? '' : 's'} still flagged for follow-up`,
    inner,
    { tone: 'warn', subLabel: 'Call Notes',
      ctaUrl: safeWebAppUrl_('callNotes'), ctaLabel: 'Open Call Notes' });
  const textBody = `Hi ${emp.name.split(' ')[0]},\n\n` +
    `You have ${unresolvedNotes.length} unresolved action-flagged note(s) from today:\n\n` +
    itemsText + '\n\nMark them resolved in the web app when done.\n\n— UMS Team Tools';
  appSendMail_({
    to: emp.email,
    subject: `End of day · ${unresolvedNotes.length} note${unresolvedNotes.length === 1 ? '' : 's'} still flagged`,
    body: textBody,
    htmlBody,
  });
}
function sendCallNotesWeeklyDigests() {
  assertManagerCaller_('sendCallNotesWeeklyDigests');  // see sendDailyMissedPunchAlerts note
  try {
    const mgrEmails = getManagerEmails_();
    if (mgrEmails.length === 0) { Logger.log('No manager emails — skipping weekly digests.'); return; }
    const now = new Date();
    const mgrTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
    // Look back 7 days
    const back = new Date(now); back.setDate(back.getDate() - 7);
    const start = Utilities.formatDate(back, mgrTz, 'yyyy-MM-dd');
    const end = Utilities.formatDate(now, mgrTz, 'yyyy-MM-dd');
    const dateRange = { start, end };

    const training = managerAggregateFlagged_('training', dateRange);
    const review = managerAggregateFlagged_('review', dateRange);
    // C17 batch-2: a queue with unreadable rep Sheets is not a silently-
    // skippable empty queue — send (with the warning) whenever there are
    // results OR skipped reps; genuinely-empty-and-clean stays silent (S24).
    if ((training.results && training.results.length > 0) || (training.skippedReps || []).length > 0) {
      sendManagerFlagDigest_(mgrEmails, 'Training Queue', training.results || [], dateRange, training.skippedReps);
    }
    if ((review.results && review.results.length > 0) || (review.skippedReps || []).length > 0) {
      sendManagerFlagDigest_(mgrEmails, 'Review Candidates', review.results || [], dateRange, review.skippedReps);
    }
    stampDigestLastRun_('weekly');
    Logger.log(`sendCallNotesWeeklyDigests: training=${(training.results || []).length}, review=${(review.results || []).length}`);
  } catch (err) {
    Logger.log('sendCallNotesWeeklyDigests failed: ' + err.message);
  }
}
/** Daily safety-net digest of urgent-flagged notes to MANAGER_EMAILS. 'urgent'
 *  is a secondary flag (subformData.flags[], INV-75/77) with no resolved state,
 *  so unlike the action/training/review digests this is a rolling "recent
 *  urgent items" view. Reuses sendManagerFlagDigest_ with an 'Urgent' label.
 *  Best-effort (INV-36) and manager-gated (top-level trigger target reachable
 *  via google.script.run, INV-44). The live cards remain the real-time path;
 *  this is the catch-it-by-morning backstop. */
function sendCallNotesUrgentDigest() {
  assertManagerCaller_('sendCallNotesUrgentDigest');  // see sendDailyMissedPunchAlerts note
  try {
    // #2 (INV-151): while the consolidated daily brief is on, urgent notes
    // ride the 8am brief instead. Still stamp the heartbeat — the trigger ran
    // and made its (suppressed) decision; a dead trigger stays detectable.
    // F(cycle-8 M-11): suppression requires a LIVE brief heartbeat, not just the flag.
    if (managerBriefSuppressionActive_({ checkTrigger: true })) {
      stampDigestLastRun_('urgent');
      Logger.log('Urgent digest: consolidated into the daily brief.');
      return;
    }
    const mgrEmails = getManagerEmails_();
    if (mgrEmails.length === 0) { Logger.log('No manager emails — skipping urgent digest.'); return; }
    const now = new Date();
    const mgrTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
    // Cover the previous calendar day through today (manager tz) so nothing
    // filed since roughly the last daily run is missed without persistent
    // last-run state. A note may surface in two consecutive digests — benign
    // (urgent has no resolved state, so this doubles as a reminder until it
    // ages out of the window).
    const back = new Date(now); back.setDate(back.getDate() - 1);
    const start = Utilities.formatDate(back, mgrTz, 'yyyy-MM-dd');
    const end = Utilities.formatDate(now, mgrTz, 'yyyy-MM-dd');
    const dateRange = { start, end };

    const urgent = managerAggregateUrgent_(dateRange);
    if ((urgent.results && urgent.results.length > 0) || (urgent.skippedReps || []).length > 0) {
      sendManagerFlagDigest_(mgrEmails, 'Urgent', urgent.results || [], dateRange, urgent.skippedReps);
    }
    stampDigestLastRun_('urgent');
    Logger.log(`sendCallNotesUrgentDigest: urgent=${(urgent.results || []).length}`);
  } catch (err) {
    Logger.log('sendCallNotesUrgentDigest failed: ' + err.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  TRAINING & EMPLOYEE DOCS — OVERDUE DIGEST (T4)
//  ────────────────────────────────────────────────────────────────────────
//  docs/training-employee-docs-spec.md §5: "Overdue nudges are Phase 4 (a
//  digest-style trigger, heartbeat-stamped like the existing digests)."
//
//  Daily manager-tz trigger. Two overdue signals, with DIFFERENT visibility:
//    • Overdue TRAINING — org-wide (training dashboards are NOT team-scoped,
//      INV-120; every manager sees every rep's training), so the same training
//      list goes to all managers.
//    • Overdue unsigned DOCS — TEAM-SCOPED (INV-122 fail-closed): each manager
//      sees only docs they issued or are the employee's roster ManagerEmail
//      for. So the digest is built PER MANAGER, never one broadcast.
//  Sends nothing to a manager with no overdue training AND no overdue docs in
//  their scope. Best-effort throughout (INV-14); never throws.
// ════════════════════════════════════════════════════════════════════════════
function sendManagerFlagDigest_(toEmails, label, notes, dateRange, skippedReps) {
  const P = CN_EMAIL_PALETTE;
  // C17 batch-2 (INV-187) — reps whose Sheets could not be read ride the
  // digest as an explicit warning; an empty-but-unreadable queue sends a
  // warning-only digest instead of silence (a failed read is not an empty
  // queue). Additive optional arg — 4-arg callers behave exactly as before.
  const skipped = Array.isArray(skippedReps) ? skippedReps : [];
  const skipHtml = skipped.length
    ? `<p style="color:${P.warnDeep || P.muted};font-size:12px;margin:10px 0 0;">&#9888; ${skipped.length} rep Sheet(s) could not be read (${esc_(skipped.join(', '))}) — this digest may be incomplete.</p>`
    : '';
  const skipText = skipped.length
    ? `\n\n! ${skipped.length} rep Sheet(s) could not be read (${skipped.join(', ')}) — this digest may be incomplete.`
    : '';
  // Training-flagged notes may carry a free-text question in subformData.trainingQuestion
  // (set client-side when the rep picks the training flag). Surface it inline so the
  // manager sees the actual question instead of having to open each note.
  const tq = function (n) {
    return (n.flagType === 'training' && n.subformData && n.subformData.trainingQuestion)
      ? String(n.subformData.trainingQuestion).trim() : '';
  };
  // Manager replies (set via setCallNoteTrainingReply) — surface in the
  // weekly digest so already-answered training notes don't keep nagging
  // the manager's attention.
  const tr = function (n) {
    return (n.flagType === 'training' && n.subformData && n.subformData.trainingReply)
      ? String(n.subformData.trainingReply).trim() : '';
  };
  // Round-1 pilot #1 (2026-08-21): review-flagged notes may carry an optional
  // rep comment in subformData.reviewComment (the trainingQuestion mirror) —
  // surface it in the Review Candidates digest the same way.
  const rc = function (n) {
    return (n.flagType === 'review' && n.subformData && n.subformData.reviewComment)
      ? String(n.subformData.reviewComment).trim() : '';
  };
  const itemsHtml = notes.map(function (n) {
    const q = tq(n);
    const reply = tr(n);
    const comment = rc(n);
    const qLine = q ? `<br><span style="color:${P.accentDeep};font-size:12px;font-style:italic;">Q: ${esc_(q)}</span>` : '';
    const rLine = reply ? `<br><span style="color:${P.goodDeep};font-size:12px;">A: ${esc_(reply)}</span>` : '';
    const cLine = comment ? `<br><span style="color:${P.goodDeep};font-size:12px;font-style:italic;">Comment: ${esc_(comment)}</span>` : '';
    return `<tr>` +
      `<td style="padding:7px 10px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:${P.muted};vertical-align:top;white-space:nowrap;">${esc_(n.dateLocal)}</td>` +
      `<td style="padding:7px 10px;color:${P.ink};font-size:13px;">` +
        `<strong>${esc_(n.repName)}</strong> · ${esc_(n.caller || n.patientAndTrx || '—')}` +
        `<br><span style="color:${P.muted};font-size:12px;">${cnFmtEmailHtml_(esc_(n.issue || ''))}</span>` +
        (n.resolution ? `<br><span style="color:${P.muted};font-size:12px;">→ ${esc_(n.resolution)}</span>` : '') +
        qLine + rLine + cLine +
      `</td>` +
      `</tr>`;
  }).join('');
  const itemsText = notes.map(function (n) {
    const q = tq(n);
    const reply = tr(n);
    const comment = rc(n);
    return `  ${n.dateLocal}  ${n.repName} · ${n.caller || n.patientAndTrx || '—'}\n` +
           `    ${n.issue || ''}` +
           (n.resolution ? `\n    → ${n.resolution}` : '') +
           (q ? `\n    Q: ${q}` : '') +
           (reply ? `\n    A: ${reply}` : '') +
           (comment ? `\n    Comment: ${comment}` : '');
  }).join('\n\n');

  // Operator 2026-08-13 (email-alignment audit): shares the branded chrome
  // with every other notification mail — see sendOneRepEodDigest_'s note. The
  // Urgent digest reads as action-needed (danger); the weekly queues as info.
  const inner =
    `<p style="color:${P.muted};font-size:13px;margin:0 0 12px;">${esc_(dateRange.start)} → ${esc_(dateRange.end)} · ${notes.length} note${notes.length === 1 ? '' : 's'}</p>` +
    `<table style="width:100%;border-collapse:collapse;border:1px solid ${P.line};border-radius:6px;overflow:hidden;">${itemsHtml}</table>` +
    skipHtml;
  const htmlBody = buildBrandedEmailHtml_(label, inner,
    { tone: label === 'Urgent' ? 'danger' : 'info', subLabel: 'Call Notes',
      ctaUrl: safeWebAppUrl_('callNotesManage'), ctaLabel: 'Open Team Notes' });
  const textBody = `${label}\n${dateRange.start} → ${dateRange.end} · ${notes.length} note(s)\n\n${itemsText}${skipText}\n\n— UMS Team Tools`;
  try {
    appSendMail_({
      to: toEmails.join(','),
      subject: `Call Notes · ${label} (${notes.length})`,
      body: textBody,
      htmlBody,
    });
  } catch (e) { Logger.log(`sendManagerFlagDigest_(${label}) email failed: ${e.message}`); }
}


// ════════════════════════════════════════════════════════════════════════════
//  EXPORT GENERATOR
// ════════════════════════════════════════════════════════════════════════════
/** Compact, deterministic version string of the client-deliverable flags.
 *  Rides the 60s ambient poll (`getCallNotesAmbient`) so the client can detect
 *  a manager toggle flip and refetch its config within the polling window
 *  (≤60s) instead of waiting for a page reload / view enter. */
function cnFlagsVersion_() {
  const f = getClientFeatureFlags_();
  return Object.keys(f).sort().map(function (k) { return k + (f[k] ? '1' : '0'); }).join(',');
}
function getOrCreateScheduledCallsSheet_() {
  const ss = getFormsSS_();
  let sh = ss.getSheetByName(SCHED_CALLS_TAB);
  if (!sh) {
    sh = ss.insertSheet(SCHED_CALLS_TAB);
    sh.appendRow(['Id', 'EmpId', 'WhenMs', 'LeadMin', 'Label', 'Status', 'CreatedAtMs']);
    sh.setFrozenRows(1);
  }
  return sh;
}
/** PURE (Node-pinned) — shape validation for a create. Date/time reuse the
 *  INV-04 regexes; the label is trimmed + cell-capped (a blank one gets a
 *  neutral default); leadMin clamps to 0..120 with a 5-min default. Returns
 *  {error} or the canonicalized {label, leadMin}. */
function schedValidateShape_(dateStr, timeStr, label, leadMin) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''))) return { error: 'Invalid date format (expected yyyy-MM-dd).' };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(timeStr || ''))) return { error: 'Invalid time format (expected HH:mm).' };
  const lab = String(label == null ? '' : label).trim().slice(0, SCHED_LABEL_MAX) || 'Scheduled call';
  let lead = parseInt(leadMin, 10);
  if (!isFinite(lead) || lead < 0) lead = 5;
  if (lead > 120) lead = 120;
  return { label: lab, leadMin: lead };
}
/** Bounded-tail read of ONE rep's ACTIVE reminders (+ their live rowIndex for
 *  the status write). The status compare is trimmed + lowercased in this ONE
 *  reader (the DR.STATUS/INV-183 lesson applied from birth). */
function schedReadMine_(sh, empId) {
  const out = [];
  const last = sh.getLastRow();
  if (last < 2) return out;
  const start = Math.max(2, last - SCHED_CALLS_SCAN + 1);
  const rows = sh.getRange(start, 1, last - start + 1, 7).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][SC.EMP_ID] || '').trim() !== String(empId || '').trim()) continue;
    if (String(rows[i][SC.STATUS] || '').trim().toLowerCase() !== 'active') continue;
    out.push({
      id: String(rows[i][SC.ID] || ''),
      whenMs: Number(rows[i][SC.WHEN_MS]) || 0,
      leadMin: Number(rows[i][SC.LEAD_MIN]) || 0,
      label: String(rows[i][SC.LABEL] || ''),
      status: 'active',
      rowIndex: start + i,
    });
  }
  return out;
}
/** Create a reminder. Caller-scoped; locked (INV-01); the wall time is parsed
 *  in the REP's OWN timezone server-side (Utilities.parseDate — no client tz
 *  arithmetic to get wrong). The shared-AuditLog row is PHI-FREE: the label
 *  may name a patient, so it persists ONLY in the PHI store and the audit row
 *  carries the id alone (the INV-32 discipline). */
function createScheduledCall(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const p = payload || {};
    const v = schedValidateShape_(p.date, p.time, p.label, p.leadMin);
    if (v.error) return v;
    const whenMs = Utilities.parseDate(String(p.date) + ' ' + String(p.time), empTz_(emp), 'yyyy-MM-dd HH:mm').getTime();
    const now = Date.now();
    if (!isFinite(whenMs)) return { error: 'Could not parse that date/time.' };
    if (whenMs < now - 60000) return { error: 'That time is in the past (times are in YOUR profile timezone).' };
    if (whenMs > now + SCHED_MAX_DAYS_AHEAD * 86400000) {
      return { error: 'Reminders can be scheduled at most ' + SCHED_MAX_DAYS_AHEAD + ' days ahead.' };
    }
    const sh = getOrCreateScheduledCallsSheet_();
    if (schedReadMine_(sh, emp.id).length >= SCHED_ACTIVE_CAP) {
      return { error: 'You already have ' + SCHED_ACTIVE_CAP + ' active reminders — mark some done or cancel them first.' };
    }
    const id = Utilities.getUuid();
    sh.appendRow([id, emp.id, whenMs, v.leadMin, v.label, 'active', now]);
    writeAuditLog_(emp, 'ScheduledCallCreate', '', '', false, 0, 'id=' + id);
    return { success: true, call: { id: id, whenMs: whenMs, leadMin: v.leadMin, label: v.label, status: 'active' } };
  } catch (err) { return { error: err.message }; }
  finally { lock.releaseLock(); }
}
/** The caller's own active reminders, soonest first (cap 50 returned).
 *  Read-only; no tab yet = no reminders, never an error. */
function getMyScheduledCalls() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const sh = getFormsSS_().getSheetByName(SCHED_CALLS_TAB);
    if (!sh) return { calls: [] };
    const mine = schedReadMine_(sh, emp.id);
    mine.sort(function (a, b) { return a.whenMs - b.whenMs; });
    return { calls: mine.slice(0, 50).map(function (c) {
      return { id: c.id, whenMs: c.whenMs, leadMin: c.leadMin, label: c.label, status: c.status };
    }) };
  } catch (err) { return { error: err.message }; }
}
/** Mark done / cancel — the rep's OWN rows only (another rep's id reads as
 *  not-found, so existence never leaks). Locked; PHI-free audit row. */
function setScheduledCallStatus(id, status) {
  const st = String(status || '').trim().toLowerCase();
  if (st !== 'done' && st !== 'cancelled') return { error: 'Status must be done or cancelled.' };
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const sh = getFormsSS_().getSheetByName(SCHED_CALLS_TAB);
    if (!sh) return { error: 'Reminder not found.' };
    const wanted = String(id || '').trim();
    const hit = schedReadMine_(sh, emp.id).filter(function (c) { return c.id === wanted; })[0];
    if (!hit) return { error: 'Reminder not found.' };
    sh.getRange(hit.rowIndex, SC.STATUS + 1).setValue(st);
    writeAuditLog_(emp, 'ScheduledCallStatus', '', '', false, 0, 'id=' + hit.id + '; ' + st);
    pendingTasksBust_(emp.id);                                   // F4
    return { success: true };
  } catch (err) { return { error: err.message }; }
  finally { lock.releaseLock(); }
}
/** The caller's Scratchpad tab. createIfMissing provisions it with cell A1
 *  PRE-FORMATTED as PLAIN TEXT ('@') — a scratchpad beginning "5/12" or
 *  "0123" would otherwise be COERCED to a Date/number on read (the
 *  normalizeDate_ class, dodged at write time instead of recovered). */
function scratchpadSheet_(emp, createIfMissing) {
  if (!emp || !emp.callNotesSheetId) {
    throw new Error('Your call-notes Sheet is not configured. Ask your manager to enroll you.');
  }
  const ss = SpreadsheetApp.openById(emp.callNotesSheetId);
  let sh = ss.getSheetByName(SCRATCHPAD_TAB);
  if (!sh && createIfMissing) {
    sh = ss.insertSheet(SCRATCHPAD_TAB);
    sh.getRange('A1').setNumberFormat('@');
  }
  return sh;
}
/** Read-only. No tab yet = an empty scratchpad, never an error. */
function getMyScratchpad() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const sh = scratchpadSheet_(emp, false);
    if (!sh) return { content: '', updatedAtMs: null };
    const v = sh.getRange('A1').getValue();
    // Belt-and-braces for a hand-made tab without the '@' format: a coerced
    // cell String()s rather than throwing (content fidelity is only
    // guaranteed for app-written cells, which are format-pinned).
    const content = v == null ? '' : (typeof v === 'string' ? v : String(v));
    const ms = Number(sh.getRange('B1').getValue());
    return { content: content, updatedAtMs: isFinite(ms) && ms > 0 ? ms : null, maxChars: SCRATCHPAD_MAX_CHARS };
  } catch (err) { return { error: err.message }; }
}
/** Save (whole-document replace; last write wins across windows — stated in
 *  the modal copy). USER lock, not the script lock (the kbRecordView /
 *  INV-01-documented-exception posture): a debounced autosave to the rep's
 *  OWN sheet must never queue punch/note writes behind it, and the user lock
 *  still serializes one rep's double-fires. Over-cap REFUSES with an
 *  actionable error (the INV-96 posture — never a silent truncate: this is
 *  the rep's document). NO audit row per save (high-frequency, own-store,
 *  non-privileged — the kbRecordView precedent; INV-32 governs call-NOTE
 *  actions, which this is not). */
function saveMyScratchpad(content) {
  const lock = LockService.getUserLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const text = String(content == null ? '' : content);
    if (text.length > SCRATCHPAD_MAX_CHARS) {
      return { error: 'Scratchpad is over the ' + SCRATCHPAD_MAX_CHARS + '-character limit (' + text.length + ') — trim it and save again.' };
    }
    const sh = scratchpadSheet_(emp, true);
    const now = Date.now();
    sh.getRange('A1').setValue(text);
    sh.getRange('B1').setValue(now);   // epoch-ms NUMBER cell — coercion-immune
    return { success: true, updatedAtMs: now };
  } catch (err) { return { error: err.message }; }
  finally { lock.releaseLock(); }
}
/**
 * F11 (cycle 12) — bounded append into one of SubformData's append-only arrays.
 * Pushes `entry` onto `arr`, then rejects if the resulting blob would be
 * unwritable: too many entries, or a serialized cell over CN_SUBFORM_MAX_CHARS.
 * Returns `''` on success or an actionable error string; on rejection the entry
 * is REMOVED again, so `subformData` is left exactly as it was and the caller
 * can return the error without having half-mutated the record.
 *
 * Refuse-rather-than-drop is deliberate: these arrays are the coaching/Q&A and
 * external-send record for a note, so silently discarding the oldest entries
 * would quietly lose a record the manager believes is complete (and the UI
 * renders the whole thread). INV-96 takes the same line on oversized form
 * submissions.
 */
function cnAppendBounded_(subformData, arr, entry, maxEntries, label) {
  if (arr.length >= maxEntries) {
    return 'This note already has the maximum of ' + maxEntries + ' ' + label +
      ' entries. Start a new note to continue.';
  }
  arr.push(entry);
  const size = JSON.stringify(subformData).length;
  if (size > CN_SUBFORM_MAX_CHARS) {
    arr.pop();
    return 'This ' + label + ' entry was not saved: it would grow the note\'s stored ' +
      'metadata to ' + size + ' characters, over the ' + CN_SUBFORM_MAX_CHARS +
      ' limit. Shorten the message, or continue on a new note.';
  }
  return '';
}
/**
 * THE call-notes enrollment predicate (cycle-12 F14). Given an Employees roster
 * ROW, returns the rep's trimmed per-rep Sheet id, or `''` when they are not
 * enrolled. Every read of column L must go through this — a Node tripwire bans
 * raw `EMP.CALL_NOTES_SHEET_ID` truthiness outside it (the INV-142 / INV-154
 * boundary pattern).
 *
 * WHY a predicate for a one-line read: the enrollment test was written 21 times
 * and 11 of those copies tested RAW truthiness (`if (!sheetId) continue;`)
 * while the other 10 trimmed. With a WHITESPACE-ONLY column L the two groups
 * DISAGREED — the trimmed group correctly read "not enrolled" (the rep's own
 * panel showed the enrollment splash and the Admin panel offered to provision
 * them), while every untrimmed cross-rep walk called `openById(' ')`, threw
 * into its per-rep try/catch, and SILENTLY OMITTED the rep from the aggregate:
 * tag taxonomy, tag trends, the tag-transform walk, cross-rep search, shift
 * stats, the unresolved-action badge, the CN export, team metrics, the EOD
 * digest — and, worse, Storage Health reported a false "unreachable per-rep
 * Sheet" for a rep who simply is not enrolled. A manager reading any of those
 * numbers had no way to know a rep was missing. Trimming here makes the whole
 * module agree on one answer.
 */
function cnEnrolledSheetId_(row) {
  return String(row[EMP.CALL_NOTES_SHEET_ID] || '').trim();
}
/**
 * Opens (or creates) the `Notes` tab in a rep's per-rep call-notes Sheet
 * and returns it. Throws if the rep has no callNotesSheetId mapped (enrollment
 * is a manual step — manager sets EMP.CALL_NOTES_SHEET_ID in the Employees
 * sheet). First-touch on any new rep's Sheet provisions the `Notes` tab with
 * the canonical header row (CN_HEADERS).
 */
function getCallNotesSheet_(emp) {
  if (!emp || !emp.callNotesSheetId) {
    throw new Error('Your call-notes Sheet is not configured. Ask your manager to enroll you.');
  }
  const ss = SpreadsheetApp.openById(emp.callNotesSheetId);
  // Host-tz memo for coercion recovery (cnHostTz_ / Part A, operator
  // 2026-08-27). One tz read per sheet per execution (the L-3 memo rule);
  // a failed read leaves the memo null so cnHostTz_ degrades to the ADP tz
  // (the pre-Part-A behavior, never worse).
  try {
    const hid = emp.callNotesSheetId;
    if (!(hid in _cnHostTzById)) _cnHostTzById[hid] = ss.getSpreadsheetTimeZone() || null;
    _cnHostTz = _cnHostTzById[hid];
  } catch (e) { _cnHostTz = null; }
  let sheet = ss.getSheetByName(CONFIG.CALL_NOTES.NOTES_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.CALL_NOTES.NOTES_TAB);
    sheet.appendRow(CN_HEADERS);
    sheet.setFrozenRows(1);
    // Make timestamp + date columns left-aligned for legibility
    sheet.getRange(1, 1, 1, CN_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}
function cnHostTz_() { return _cnHostTz || adpSheetTz_(); }
/** CN.DATE_LOCAL recovery — the CN-sheet twin of normalizeDate_ (Part A).
 *  Written "yyyy-MM-dd"; a coercing per-rep sheet returns a Date representing
 *  MIDNIGHT in the sheet's own tz, so formatting in any tz east of it shifts
 *  the date a whole day BACK (Manila midnight formatted in IST is 21:30 the
 *  previous day — the "my note is missing from today" symptom). Format in the
 *  host sheet's tz; strings pass through. ADP/TO/PAR/AUDIT reads keep
 *  normalizeDate_ — the ADP sheet is its own host. */
function cnDateLocalString_(val) {
  if (val instanceof Date) {
    try { return Utilities.formatDate(val, cnHostTz_(), 'yyyy-MM-dd'); }
    catch (e) { return normalizeDate_(val); }
  }
  return String(val).trim().substring(0, 10);
}
/** Single source of truth for the note-to-call coverage ratio shown in
 *  My Stats, Team Metrics, and the shift-stats overlay. Returns a
 *  whole-number percent, or null when there's no answered-call
 *  denominator. Extracted so the three callsites can't drift apart. */
function cnNoteCoverage_(noteCount, answeredCalls) {
  return (answeredCalls && answeredCalls > 0)
    ? Math.round((noteCount / answeredCalls) * 100) : null;
}

// A4 (cycle 13) — `countCallNotesInRange_` was REMOVED. Cycle 12's F5 replaced
// it with the outcome-carrying `cnCountNotesResult_` below and kept it as "a
// thin numeric wrapper for the callers that only want the number" — but a
// repo-wide search found NO such callers; the only references left were its own
// two tests, which asserted it returns 0 on an unreadable Sheet. That left the
// silently-degrading variant alive under the most obvious name, pinned by tests
// that enshrined the very behaviour F5 existed to remove, waiting for the next
// author to reach for it. Anything that needs the number takes
// `cnCountNotesResult_(emp, from, to).count` and decides what to do with
// `.unavailable` — which is the whole point.
/** Counts a rep's call notes whose DateLocal falls in [from, to] inclusive,
 *  WITH the read outcome attached: { count, unavailable, unenrolled }.
 *  Centralizes the normalizeDate_ read so the Metrics note-count can never
 *  diverge again (see the CN.DATE_LOCAL gotcha — a raw String() read silently
 *  misses every row because Sheets coerces the column to a Date). The `emp` arg
 *  only needs { id, name, callNotesSheetId } for getCallNotesSheet_.
 *
 *  Cycle-12 F5 — the read OUTCOME is the reason this shape exists:
 *  { count, unavailable }. `unavailable:true` means the rep's Sheet could not
 *  be read (missing / unshared / transient Sheets failure), which is NOT the
 *  same fact as "they logged zero notes" — the bare `return 0` catch made the
 *  two indistinguishable, and every coverage surface then reported 0%: the
 *  Clock strip rendered "0% logged" in CRIT tone plus "File N missing" for
 *  EVERY answered call, telling a rep to redo notes they had already filed.
 *  This is the cycle-10 "error reads as empty" class (D1/D2a) in the one
 *  server helper it was never applied to. `unenrolled` is reported separately
 *  because a rep with no Sheet configured legitimately has no coverage to
 *  measure (INV-35), rather than a failed read. */
function cnCountNotesResult_(emp, from, to) {
  if (!emp || !emp.callNotesSheetId) return { count: 0, unavailable: false, unenrolled: true };
  try {
    const sheet = getCallNotesSheet_(emp);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { count: 0, unavailable: false, unenrolled: false };
    // S2: counting only needs the DateLocal column — read 1 column instead
    // of the full 16-column row range (~16x fewer cells off the wire). Still
    // normalize each value (CN.DATE_LOCAL coercion gotcha).
    const dateCol = sheet.getRange(2, CN.DATE_LOCAL + 1, lastRow - 1, 1).getValues();
    let n = 0;
    for (let i = 0; i < dateCol.length; i++) {
      const d = cnDateLocalString_(dateCol[i][0]);
      if (d >= from && d <= to) n++;
    }
    return { count: n, unavailable: false, unenrolled: false };
  } catch (e) {
    console.warn('cnCountNotesResult_ failed for ' + ((emp && emp.id) || '?') + ': ' + e.message);
    return { count: 0, unavailable: true, unenrolled: false };
  }
}
