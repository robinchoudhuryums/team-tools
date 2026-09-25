// ════════════════════════════════════════════════════════════════════════════
//  UMS TEAM TOOLS — 81_empdocs.js
//  Employee Docs: issuing, releasing, signing and verifying HR documents.
//
//  ONE Apps Script project, ONE global scope: these files are the SERVER, in
//  the load order `web-app/.clasp.json` filePushOrder declares. Batch F2 split
//  them out of Code.js as a MOVE — every declaration below is byte-identical to
//  the one it replaced, and the SPLIT-MANIFEST pin proves it.
// ════════════════════════════════════════════════════════════════════════════

function getHrDocsSS_() {
  if (typeof _TEST_OVERRIDE_HRDOCS_SS_ID !== 'undefined' && _TEST_OVERRIDE_HRDOCS_SS_ID) {
    return SpreadsheetApp.openById(_TEST_OVERRIDE_HRDOCS_SS_ID);
  }
  const id = PropertiesService.getScriptProperties().getProperty('HR_DOCS_SS_ID');
  if (!id) throw new Error('Employee Docs is not configured — set Script Property HR_DOCS_SS_ID to a dedicated spreadsheet.');
  return SpreadsheetApp.openById(id);
}
function getOrCreateEmpDocSheet_(tabName, headers) {
  const ss = getHrDocsSS_();
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    sheet.appendRow(sheetSafeRow_(headers));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    return sheet;
  }
  // Self-heal a short header (back-compat: the EmpDocs tab grew trailing v2
  // FieldsJson/ResponsesJson columns — legacy rows read those as ''). Widen +
  // (re)write the header row once so range reads at headers.length don't throw.
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  const hdr = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  let missing = false;
  for (let i = 0; i < headers.length; i++) { if (String(hdr[i] || '').trim() !== headers[i]) { missing = true; break; } }
  if (missing) {
    sheet.getRange(1, 1, 1, headers.length).setValues(sheetSafeRows_([headers])).setFontWeight('bold');
  }
  return sheet;
}
/** Signature hash — covers the frozen content hash + identity + the ack
 *  version. Deliberately NOT the timestamp (Sheets coerces datetime cells to
 *  Dates on read, which would break recompute — INV-113); the EmpDocSigned
 *  audit row is the independent timestamp witness. */
function empDocSignatureHash_(contentHash, empId, docId, signatureDataUrl, ackVersion, responsesJson, delim) {
  const d = (delim === undefined) ? '\u0000' : delim;
  let base = String(contentHash || '') + d + String(empId || '') + d + String(docId || '') + d + String(signatureDataUrl || '') + d + String(ackVersion || '');
  if (responsesJson) base += d + String(responsesJson);   // v2 — the signed responses are attested too (back-compat: appended only when present)
  return empDocSha256Hex_(base);
}
/** Bounded id-column lookup → { rowIdx, doc } or null. */
function findEmpDocRow_(docId) {
  docId = String(docId || '').trim();
  if (!docId) return null;
  const sheet = getOrCreateEmpDocSheet_(EMPDOC_TAB, EMPDOC_HEADERS);
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const ids = sheet.getRange(2, ED.DOC_ID + 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() !== docId) continue;
    const row = sheet.getRange(i + 2, 1, 1, EMPDOC_HEADERS.length).getValues()[0];
    return { rowIdx: i + 2, doc: empDocRowToObj_(row, getHrDocsSS_().getSpreadsheetTimeZone()) };
  }
  return null;
}
/** Rep-callable, caller-scoped, read-only — METADATA only (no body). */
function getMyDocs() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const sheet = getOrCreateEmpDocSheet_(EMPDOC_TAB, EMPDOC_HEADERS);
    const last = sheet.getLastRow();
    if (last < 2) return { docs: [] };
    const ssTz = getHrDocsSS_().getSpreadsheetTimeZone();
    const rows = sheet.getRange(2, 1, last - 1, EMPDOC_HEADERS.length).getValues();
    const docs = [];
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][ED.EMP_ID]).trim() !== emp.id) continue;
      const d = empDocRowToObj_(rows[i], ssTz);
      if (d.status === 'draft') continue;   // drafts are invisible until released
      docs.push({
        docId: d.docId, docType: d.docType, title: d.title, status: d.status,
        requiresSignature: d.requiresSignature, issuedAt: d.issuedAt,
        dueAt: d.dueAt, signedAt: d.signedAt,
        fieldCount: (d.fields || []).length, needsAction: empDocNeedsAction_(d),
      });
    }
    docs.sort(function (a, b) { return a.issuedAt < b.issuedAt ? 1 : -1; });
    return { docs: docs };
  } catch (err) { return { error: err.message }; }
}
/** PURE-ish (the dual-verify matcher is the one acknowledgeDoc and
 *  verifyDocSignature use) — the read-time content check for getMyDoc. */
function empDocReadIntegrity_(d) {
  if (!d || !d.contentHash) return 'unverifiable';
  return empDocContentHashMatches_(d.contentHash, d.bodyMd, d.title, d.docType, d.empId, d.fieldsRaw) ? 'ok' : 'altered';
}
/** Owner-or-AUTHORIZED-manager scoped (§3b) — the full doc incl. the frozen
 *  body. Includes the ack text/version when a signature is still needed. */
function getMyDoc(docId) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const found = findEmpDocRow_(docId);
    if (!found) return { error: 'Document not found.' };
    const d = found.doc;
    const isOwner = d.empId === emp.id;
    if (!isOwner && !empDocCanManagerSee_(emp, d)) return { error: 'Document not found.' };
    // The owner can't see a doc that hasn't been released yet (draft).
    if (isOwner && d.status === 'draft') return { error: 'Document not found.' };
    const out = {
      docId: d.docId, empId: d.empId, docType: d.docType, title: d.title,
      bodyMd: d.bodyMd, status: d.status, requiresSignature: d.requiresSignature,
      issuedAt: d.issuedAt, dueAt: d.dueAt, signedAt: d.signedAt,
      voidReason: d.voidReason, isOwner: isOwner,
      fields: d.fields || [], responses: d.responses || {},
      // Follow-up to D4 (cycle 22): the content hash is checked on EVERY read,
      // not only when a manager thinks to press Verify — an out-of-band edit
      // to the frozen body is visible to the person reading it. 'ok' |
      // 'altered' | 'unverifiable' (no hash on record: legacy or hand-entered —
      // never reported as altered, the F-24 rule). The signature half stays
      // behind Verify (it reads a second tab).
      integrity: empDocReadIntegrity_(d),
    };
    // The owner gets the completion affordance while the doc is still issued
    // (signature ack text when it requires a signature, regardless for fields).
    if (isOwner && d.status === 'issued') {
      out.canComplete = true;
      if (d.requiresSignature) { out.ackText = EMPDOC_ACK_TEXT; out.ackVersion = EMPDOC_ACK_VERSION; }
    }
    return out;
  } catch (err) { return { error: err.message }; }
}
/** Rep-callable, locked (INV-01), OWNER-only — managers cannot sign on an
 *  employee's behalf (the signature's value is that the employee made it).
 *  Verifies the stored contentHash BEFORE accepting (a tampered row refuses
 *  to sign), bounds the signature payload (INV-96), writes the append-only
 *  DocSignatures row + flips the EmpDocs status in the same lock. Audit:
 *  EmpDocSigned (docId + hash + signedAt — the independent witness). */
function acknowledgeDoc(docId, signatureDataUrl, responses) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let notifyAfter = null;
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Not authorized.' };
    const found = findEmpDocRow_(docId);
    if (!found || found.doc.empId !== emp.id) return { success: false, error: 'Document not found.' };
    const d = found.doc;
    const hasFields = (d.fields || []).length > 0;
    if (!d.requiresSignature && !hasFields) return { success: false, error: 'This document does not require any action.' };
    if (d.status === 'signed' || d.status === 'completed') return { success: false, error: 'Already completed.' };
    if (d.status !== 'issued') return { success: false, error: 'This document is no longer active.' };
    // Validate the employee's field responses against the frozen schema.
    const rv = empDocValidateResponses_(d.fields, responses);
    if (!rv.ok) return { success: false, error: rv.error };
    const responsesRaw = hasFields ? JSON.stringify(rv.responses) : '';
    // A signature is required only when the doc asks for one.
    let sig = '';
    if (d.requiresSignature) {
      sig = String(signatureDataUrl || '');
      if (sig.indexOf('data:image/png;base64,') !== 0) return { success: false, error: 'Draw your signature before submitting.' };
      if (sig.length > EMPDOC_SIG_MAX_CHARS) return { success: false, error: 'Signature image is too large — clear the pad and sign again.' };
    }
    // Integrity gate: the row must still hash to what was issued (incl.
    // fields). C13 dual-verify — a doc issued before the NUL-delimiter change
    // carries a legacy space-form hash and must still sign.
    const expect = empDocContentHash_(d.bodyMd, d.title, d.docType, d.empId, d.fieldsRaw);
    // F-24 (2026-09-18): a row with NO ContentHash used to skip the gate
    // entirely — an attestation over content nothing had fixed at issue.
    // Every app-issued doc carries a hash (issueEmpDoc); a blank one is a
    // hand-entered or legacy row, and it is REFUSED rather than signed blind.
    if (!d.contentHash) {
      return { success: false, error: 'This document has no integrity hash on record (it was not issued by the app). Ask your manager to re-issue it before signing.' };
    }
    if (!empDocContentHashMatches_(d.contentHash, d.bodyMd, d.title, d.docType, d.empId, d.fieldsRaw)) {
      return { success: false, error: 'Integrity check failed — this document was altered after issue. Ask your manager to re-issue it.' };
    }
    const now = new Date();
    const ts = fmtDate_(now) + ' ' + fmtTime_(now);
    const sheet = getOrCreateEmpDocSheet_(EMPDOC_TAB, EMPDOC_HEADERS);
    // Persist responses first (so a signed doc's responses are what was attested).
    if (hasFields) sheet.getRange(found.rowIdx, ED.RESPONSES + 1).setValue(sheetSafe_(responsesRaw));
    if (d.requiresSignature) {
      const sigHash = empDocSignatureHash_(d.contentHash || expect, d.empId, d.docId, sig, EMPDOC_ACK_VERSION, responsesRaw);
      const cert = JSON.stringify({
        docId: d.docId, empId: d.empId, ackVersion: EMPDOC_ACK_VERSION,
        alg: 'SHA-256', covers: 'contentHash|empId|docId|signature|ackVersion' + (responsesRaw ? '|responses' : ''),
      });
      getOrCreateEmpDocSheet_(EMPDOC_SIG_TAB, EMPDOC_SIG_HEADERS)
        .appendRow(sheetSafeRow_([d.docId, d.empId, ts, sig, EMPDOC_ACK_VERSION, sigHash, cert]));
      sheet.getRange(found.rowIdx, ED.STATUS + 1).setValue(sheetSafe_('signed'));
      sheet.getRange(found.rowIdx, ED.SIGNED_AT + 1).setValue(sheetSafe_(ts));
      writeWitnessAuditLog_(emp, 'EmpDocSigned', fmtDate_(now), '', false, 0,
        'docId=' + d.docId + '; hash=' + sigHash + '; signedAt=' + ts);
    } else {
      // Fields-only doc (no signature): completing the fields is the action.
      // Cycle-9 M-8 — the completion now writes the SAME tamper-evidence
      // artifact class as a signature: an append-only DocSignatures row
      // (empty signature cell) whose hash covers
      // contentHash|empId|docId|(empty sig)|ackVersion(+responses), so an
      // out-of-band rewrite of the stored ResponsesJson is detectable by
      // verifyDocSignature. Before this, a completed fields-only doc had
      // ZERO integrity artifact in a store whose premise is tamper evidence
      // (INV-135's "responses are attested" held only for signature docs).
      // Back-compat: docs completed before this ship have no row — verify
      // reports them as unsigned/legacy (null match), never as tampered.
      const compHash = empDocSignatureHash_(d.contentHash || expect, d.empId, d.docId, '', EMPDOC_ACK_VERSION, responsesRaw);
      const compCert = JSON.stringify({
        docId: d.docId, empId: d.empId, ackVersion: EMPDOC_ACK_VERSION, kind: 'completion',
        alg: 'SHA-256', covers: 'contentHash|empId|docId|(no signature)|ackVersion' + (responsesRaw ? '|responses' : ''),
      });
      getOrCreateEmpDocSheet_(EMPDOC_SIG_TAB, EMPDOC_SIG_HEADERS)
        .appendRow(sheetSafeRow_([d.docId, d.empId, ts, '', EMPDOC_ACK_VERSION, compHash, compCert]));
      sheet.getRange(found.rowIdx, ED.STATUS + 1).setValue(sheetSafe_('completed'));
      sheet.getRange(found.rowIdx, ED.SIGNED_AT + 1).setValue(sheetSafe_(ts));
      writeWitnessAuditLog_(emp, 'EmpDocCompleted', fmtDate_(now), '', false, 0,
        'docId=' + d.docId + '; hash=' + compHash + '; completedAt=' + ts);
    }
    // L-6: a fields-only completion emails "completed", not "signed".
    const completedOnly = !d.requiresSignature;
    notifyAfter = function () { notifyEmpDocSigned_(d, emp, completedOnly); };   // M-7: post-lock
    pendingTasksBust_(emp.id);                                   // F4
    return { success: true, signedAt: ts };
  } catch (err) { return { success: false, error: err.message }; }
  finally {
    lock.releaseLock();
    // M-7: best-effort mail fires only after the global lock is released.
    if (notifyAfter) { try { notifyAfter(); } catch (e) { console.warn('post-lock notify failed: ' + e.message); } }
  }
}
/** Manager-gated (INV-02), locked (INV-01). Issues a doc with FROZEN
 *  markdown content + contentHash. Any manager may issue to any employee
 *  (issuing reveals nothing); READING stays team-scoped. Audit: EmpDocIssue
 *  (docId/empId/type — never the title or body). */
function issueDoc(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let notifyAfter = null;
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const v = empDocValidateIssue_(payload);
    if (!v.ok) return { success: false, error: v.error };
    const target = lookupEmployeeById_(v.doc.empId);
    if (!target) return { success: false, error: 'Unknown employee.' };
    const docId = Utilities.getUuid();
    const now = new Date();
    const ts = fmtDate_(now) + ' ' + fmtTime_(now);
    const fieldsRaw = v.doc.fields.length ? JSON.stringify(v.doc.fields) : '';
    const contentHash = empDocContentHash_(v.doc.bodyMd, v.doc.title, v.doc.docType, v.doc.empId, fieldsRaw);
    getOrCreateEmpDocSheet_(EMPDOC_TAB, EMPDOC_HEADERS).appendRow(sheetSafeRow_([
      docId, v.doc.empId, v.doc.docType, v.doc.title, v.doc.bodyMd, contentHash,
      v.doc.requiresSignature ? 'TRUE' : 'FALSE', v.doc.status,
      String(callerEmp.email).toLowerCase().trim(), ts, v.doc.dueAt, '', '', fieldsRaw, '',
    ]));
    writeAuditLog_(callerEmp, 'EmpDocIssue', fmtDate_(now), '', false, 0,
      'docId=' + docId + '; empId=' + v.doc.empId + '; type=' + v.doc.docType + '; status=' + v.doc.status, callerEmp.email);
    // Only a RELEASED (issued) doc is visible to the employee — drafts stay silent.
    if (v.doc.status === 'issued') notifyAfter = function () { notifyEmpDocIssued_(target, v.doc); };   // M-7: post-lock
    // Follow-up to T10 (cycle 22): an issued (non-draft) document is a task the
    // rep must sign — a draft reaches their list only at release, which busts.
    if (v.doc.status !== 'draft') pendingTasksBust_(v.doc.empId);
    return { success: true, docId: docId, status: v.doc.status };
  } catch (err) { return { success: false, error: err.message }; }
  finally {
    lock.releaseLock();
    // M-7: best-effort mail fires only after the global lock is released.
    if (notifyAfter) { try { notifyAfter(); } catch (e) { console.warn('post-lock notify failed: ' + e.message); } }
  }
}
/** Manager-gated + team-scoped, locked. Releases a DRAFT to the employee
 *  (draft → issued) and notifies them. The frozen content/hash is untouched —
 *  release only flips the gate. Audit: EmpDocRelease. */
function releaseDoc(docId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let notifyAfter = null;
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const found = findEmpDocRow_(docId);
    if (!found || !empDocCanManagerSee_(callerEmp, found.doc)) return { success: false, error: 'Document not found.' };
    if (found.doc.status !== 'draft') return { success: false, error: 'Only a draft can be released.' };
    const sheet = getOrCreateEmpDocSheet_(EMPDOC_TAB, EMPDOC_HEADERS);
    sheet.getRange(found.rowIdx, ED.STATUS + 1).setValue(sheetSafe_('issued'));
    const now = new Date();
    writeAuditLog_(callerEmp, 'EmpDocRelease', fmtDate_(now), '', false, 0,
      'docId=' + found.doc.docId + '; empId=' + found.doc.empId, callerEmp.email);
    pendingTasksBust_(found.doc.empId);   // T10 (cycle 22): the rep now has a document to sign
    const target = lookupEmployeeById_(found.doc.empId);
    if (target) notifyAfter = function () { notifyEmpDocIssued_(target, found.doc); };   // M-7: post-lock
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally {
    lock.releaseLock();
    // M-7: best-effort mail fires only after the global lock is released.
    if (notifyAfter) { try { notifyAfter(); } catch (e) { console.warn('post-lock notify failed: ' + e.message); } }
  }
}
/** Manager-gated, TEAM-scoped (§3b): only docs the caller issued or where
 *  the caller is the employee's roster ManagerEmail. Read-only. */
function getDocsDashboard() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const sheet = getOrCreateEmpDocSheet_(EMPDOC_TAB, EMPDOC_HEADERS);
    const last = sheet.getLastRow();
    if (last < 2) return { docs: [] };
    const ssTz = getHrDocsSS_().getSpreadsheetTimeZone();
    const todayIso = Utilities.formatDate(new Date(), CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE, 'yyyy-MM-dd');
    const rows = sheet.getRange(2, 1, last - 1, EMPDOC_HEADERS.length).getValues();
    const docs = [];
    for (let i = 0; i < rows.length; i++) {
      const d = empDocRowToObj_(rows[i], ssTz);
      if (!d.docId) continue;
      if (!empDocCanManagerSee_(callerEmp, d)) continue;
      const target = lookupEmployeeById_(d.empId);
      docs.push({
        docId: d.docId, empId: d.empId,
        empName: target ? target.name : 'former employee',
        docType: d.docType, title: d.title, status: d.status,
        requiresSignature: d.requiresSignature, issuedBy: d.issuedBy,
        issuedAt: d.issuedAt, dueAt: d.dueAt, signedAt: d.signedAt,
        fieldCount: (d.fields || []).length,
        overdue: empDocNeedsAction_(d) && !!d.dueAt && todayIso > d.dueAt,
      });
    }
    docs.sort(function (a, b) { return a.issuedAt < b.issuedAt ? 1 : -1; });
    return { docs: docs, ackVersion: EMPDOC_ACK_VERSION };
  } catch (err) { return { error: err.message }; }
}
/** Manager-gated + team-scoped, locked. Sets status='void' — NEVER deletes
 *  and never edits the frozen body; a correction is a NEW issued doc. A
 *  signed doc keeps its DocSignatures row ("signed, later voided"). Audit:
 *  EmpDocVoid (docId only — the reason lives in the scoped HR sheet). */
function voidDoc(docId, reason) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const found = findEmpDocRow_(docId);
    if (!found || !empDocCanManagerSee_(callerEmp, found.doc)) return { success: false, error: 'Document not found.' };
    if (found.doc.status === 'void') return { success: true, alreadyVoid: true };
    const sheet = getOrCreateEmpDocSheet_(EMPDOC_TAB, EMPDOC_HEADERS);
    sheet.getRange(found.rowIdx, ED.STATUS + 1).setValue(sheetSafe_('void'));
    sheet.getRange(found.rowIdx, ED.VOID_REASON + 1).setValue(sheetSafe_(String(reason || '').substring(0, 500)));
    const now = new Date();
    writeAuditLog_(callerEmp, 'EmpDocVoid', fmtDate_(now), '', false, 0,
      'docId=' + found.doc.docId, callerEmp.email);
    pendingTasksBust_(found.doc.empId);   // T10 (cycle 22): a voided doc is no longer the rep's task
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Manager-gated + team-scoped, read-only — the verifyFormSubmissionIntegrity_
 *  twin. Recomputes the content hash from the stored row AND the signature
 *  hash from the stored DocSignatures row; a mismatch means out-of-band
 *  alteration. Legacy/unsigned rows report explicitly, never as failures. */
function verifyDocSignature(docId) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const found = findEmpDocRow_(docId);
    if (!found || !empDocCanManagerSee_(callerEmp, found.doc)) return { error: 'Document not found.' };
    const d = found.doc;
    const expectContent = empDocContentHash_(d.bodyMd, d.title, d.docType, d.empId, d.fieldsRaw);
    // C13 dual-verify — legacy space-form hashes stay valid (never tampered).
    const contentMatch = !d.contentHash ? null
      : empDocContentHashMatches_(d.contentHash, d.bodyMd, d.title, d.docType, d.empId, d.fieldsRaw);
    // Newest signature row for the doc (bottom-up id-column scan).
    const sigSheet = getOrCreateEmpDocSheet_(EMPDOC_SIG_TAB, EMPDOC_SIG_HEADERS);
    const sigLast = sigSheet.getLastRow();
    let sigRow = null;
    if (sigLast >= 2) {
      const ids = sigSheet.getRange(2, EDS.DOC_ID + 1, sigLast - 1, 1).getValues();
      for (let i = ids.length - 1; i >= 0; i--) {
        if (String(ids[i][0]).trim() === d.docId) {
          sigRow = sigSheet.getRange(i + 2, 1, 1, EMPDOC_SIG_HEADERS.length).getValues()[0];
          break;
        }
      }
    }
    // F-24: a null contentMatch is "cannot verify", not "verified" — say so.
    const hashWarning = (contentMatch === null) ? 'No content hash on record — integrity cannot be verified (legacy or hand-entered row).' : '';
    if (!sigRow) return { signed: false, contentMatch: contentMatch, tampered: (contentMatch === false), warning: hashWarning };
    const rowSig = String(sigRow[EDS.SIGNATURE] || '');
    // Cycle-9 M-8: an EMPTY signature cell marks a fields-only COMPLETION row
    // (acknowledgeDoc's else-branch) — same hash machinery, no signature
    // segment. Report it as completed (not signed) so consumers don't render
    // a signature that doesn't exist; match/tampered semantics identical.
    const isCompletion = !rowSig.trim();
    const storedHash = String(sigRow[EDS.SIG_HASH] || '').trim();
    // F(cycle-8): mirror acknowledgeDoc's blank-stored-hash fallback — the
    // sign path hashes with `d.contentHash || <freshly computed>`, so a
    // legitimately-signed hand-entered/legacy row (blank ContentHash cell)
    // used to recompute against '' here and report a FALSE tampered:true.
    // C13 dual-verify — try the NUL form, then the legacy space form. For the
    // blank-stored-ContentHash fallback each attempt uses ITS OWN era's
    // content-hash recompute (a pre-change sign hashed a space-form expect;
    // a post-change sign hashes the NUL form).
    const ackVer = String(sigRow[EDS.ACK_VERSION] || '');
    const recomputed = empDocSignatureHash_(
      d.contentHash || expectContent, d.empId, d.docId, rowSig, ackVer, d.responsesRaw);
    const expectContentLegacy = empDocContentHash_(
      d.bodyMd, d.title, d.docType, d.empId, d.fieldsRaw, EMPDOC_HASH_DELIM_LEGACY);
    const recomputedLegacy = empDocSignatureHash_(
      d.contentHash || expectContentLegacy, d.empId, d.docId, rowSig, ackVer,
      d.responsesRaw, EMPDOC_HASH_DELIM_LEGACY);
    const match = storedHash ? (storedHash === recomputed || storedHash === recomputedLegacy) : null;
    // L-4 — a body-only rewrite trips `contentMatch` (body↔stored hash); a
    // consistent body+contentHash rewrite trips `match` (the signature hash
    // bound the sign-time contentHash). EITHER being false means tamper, so
    // expose a single definitive flag — a consumer checking `match` alone
    // would miss the body-only case. The append-only `EmpDocSigned` audit row
    // remains the deeper independent witness. (legacy/unsigned → null, not
    // tampered.)
    return {
      signed: !isCompletion,
      completed: isCompletion,
      contentMatch: contentMatch,
      match: match,
      tampered: (contentMatch === false || match === false),
      warning: hashWarning,   // F-24
      signedAt: trainCellTs_(sigRow[EDS.SIGNED_AT], getHrDocsSS_().getSpreadsheetTimeZone()),
      ackVersion: String(sigRow[EDS.ACK_VERSION] || ''),
    };
  } catch (err) { return { error: err.message }; }
}
function findEmpDocTemplateRow_(templateId) {
  templateId = String(templateId || '').trim();
  if (!templateId) return null;
  const sheet = getOrCreateEmpDocSheet_(EMPDOC_TPL_TAB, EMPDOC_TPL_HEADERS);
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const ids = sheet.getRange(2, EDT.TPL_ID + 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() !== templateId) continue;
    return { rowIdx: i + 2, tpl: empDocTemplateRowToObj_(sheet.getRange(i + 2, 1, 1, EMPDOC_TPL_HEADERS.length).getValues()[0]) };
  }
  return null;
}
/** Manager-gated, read-only. Templates are org-wide + PHI-free (form shells),
 *  so NOT team-scoped — any manager may use any template. */
function getEmpDocTemplates() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const sheet = getOrCreateEmpDocSheet_(EMPDOC_TPL_TAB, EMPDOC_TPL_HEADERS);
    const last = sheet.getLastRow();
    if (last < 2) return { templates: [] };
    const rows = sheet.getRange(2, 1, last - 1, EMPDOC_TPL_HEADERS.length).getValues();
    const templates = [];
    for (let i = 0; i < rows.length; i++) {
      const t = empDocTemplateRowToObj_(rows[i]);
      if (t.templateId) templates.push(t);
    }
    templates.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return { templates: templates };
  } catch (err) { return { error: err.message }; }
}
/** Manager-gated (INV-02), locked (INV-01). Upsert a template by templateId
 *  (new id minted when absent). Validates via empDocTemplateValidate_. Audit:
 *  EmpDocTemplateSave (id + name only — PHI-free). */
function saveEmpDocTemplate(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const v = empDocTemplateValidate_(payload);
    if (!v.ok) return { success: false, error: v.error };
    const fieldsRaw = v.tpl.fields.length ? JSON.stringify(v.tpl.fields) : '';
    const sheet = getOrCreateEmpDocSheet_(EMPDOC_TPL_TAB, EMPDOC_TPL_HEADERS);
    const existing = (payload && payload.templateId) ? findEmpDocTemplateRow_(payload.templateId) : null;
    let templateId;
    if (existing) {
      templateId = existing.tpl.templateId;
      const r = existing.rowIdx;
      sheet.getRange(r, EDT.NAME + 1).setValue(sheetSafe_(v.tpl.name));
      sheet.getRange(r, EDT.DOC_TYPE + 1).setValue(sheetSafe_(v.tpl.docType));
      sheet.getRange(r, EDT.BODY_MD + 1).setValue(sheetSafe_(v.tpl.bodyMd));
      sheet.getRange(r, EDT.FIELDS + 1).setValue(sheetSafe_(fieldsRaw));
      sheet.getRange(r, EDT.REQUIRES_SIG + 1).setValue(sheetSafe_(v.tpl.requiresSignature ? 'TRUE' : 'FALSE'));
    } else {
      templateId = Utilities.getUuid();
      const now = new Date();
      sheet.appendRow(sheetSafeRow_([templateId, v.tpl.name, v.tpl.docType, v.tpl.bodyMd, fieldsRaw,
        v.tpl.requiresSignature ? 'TRUE' : 'FALSE', callerEmp.email, fmtDate_(now) + ' ' + fmtTime_(now)]));
    }
    writeAuditLog_(callerEmp, 'EmpDocTemplateSave', '', '', false, 0,
      'templateId=' + templateId + '; name=' + v.tpl.name, callerEmp.email);
    return { success: true, templateId: templateId };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Manager-gated (INV-02), locked (INV-01). Removes a template row only —
 *  already-issued docs are independent (the body was frozen at issue). */
function deleteEmpDocTemplate(templateId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const found = findEmpDocTemplateRow_(templateId);
    if (!found) return { success: false, error: 'Template not found.' };
    getOrCreateEmpDocSheet_(EMPDOC_TPL_TAB, EMPDOC_TPL_HEADERS).deleteRow(found.rowIdx);
    writeAuditLog_(callerEmp, 'EmpDocTemplateDelete', '', '', false, 0,
      'templateId=' + found.tpl.templateId, callerEmp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Best-effort (INV-14) — employee notification on issue. Title only; the
 *  recipient is the doc's subject, so the title is theirs to see. */
function notifyEmpDocIssued_(target, doc) {
  try {
    if (!target.email) return;
    const action = doc.requiresSignature ? 'review and sign' : 'review';
    const body = 'Hi ' + target.name + ',\n\nA document has been issued to you: ' + doc.title +
      (doc.dueAt ? '\nDue: ' + doc.dueAt : '') +
      '\n\nOpen the web app -> Training & Employee Docs -> My Docs to ' + action + ' it.';
    const htmlBody = buildBrandedEmailHtml_('Document for your ' + (doc.requiresSignature ? 'signature' : 'review'),
      '<p style="margin:0 0 12px;">Hi ' + esc_(target.name) + ',</p>' +
      brandedKvRows_([['Document', doc.title]].concat(doc.dueAt ? [['Due', doc.dueAt]] : [])) +
      '<p style="margin:12px 0 0;">Please ' + esc_(action) + ' it.</p>',
      { subLabel: 'Employee Docs', statusLabel: doc.requiresSignature ? 'Signature needed' : 'Review needed',
        ctaUrl: safeWebAppUrl_('myDocs'), ctaLabel: 'Open My Docs' });
    appSendMail_({ to: target.email, subject: 'Document for your ' + (doc.requiresSignature ? 'signature' : 'review') + ': ' + doc.title, body: body, htmlBody: htmlBody });
  } catch (e) { console.warn('notifyEmpDocIssued_ failed: ' + e.message); }
}
/** Best-effort (INV-14) — issuer notification on signature. */
function notifyEmpDocSigned_(doc, signer, completedOnly) {
  try {
    if (!doc.issuedBy) return;
    // Cycle-11 L-6: a fields-only COMPLETION (no signature) must not tell the
    // issuer the doc was "signed" — an HR paper-trail mislabel. The stored
    // artifacts (EmpDocCompleted witness row, completion cert) were always
    // correct; only this notification's wording was wrong.
    const verb = completedOnly ? 'completed' : 'signed';
    const body = signer.name + ' ' + verb + ' "' + doc.title + '".';
    const htmlBody = buildBrandedEmailHtml_(completedOnly ? 'Document completed' : 'Document signed',
      brandedKvRows_([['Document', doc.title], [completedOnly ? 'Completed by' : 'Signed by', signer.name]]),
      { tone: 'success', subLabel: 'Employee Docs' });
    appSendMail_({ to: doc.issuedBy, subject: (completedOnly ? 'Completed: ' : 'Signed: ') + doc.title,
      body: body, htmlBody: htmlBody });
  } catch (e) { console.warn('notifyEmpDocSigned_ failed: ' + e.message); }
}
