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
/** HR-3 (cycle 23) — is the HR store CONFIGURED here? An unset HR_DOCS_SS_ID
 *  is a deployment without the feature (nothing is overdue because nothing
 *  exists); a set one that throws is a store that could not be read, and the
 *  sweeps that read it must say so rather than report "nothing overdue" (the
 *  g122/A3 unset-vs-unreachable rule). Can't tell → configured, so a real
 *  read failure still reports itself. */
function hrDocsConfigured_() {
  if (typeof _TEST_OVERRIDE_HRDOCS_SS_ID !== 'undefined' && _TEST_OVERRIDE_HRDOCS_SS_ID) return true;
  try { return !!PropertiesService.getScriptProperties().getProperty('HR_DOCS_SS_ID'); }
  catch (e) { return true; }
}
/** HR-3: the one rule for a failed HR sweep — [] only when the store is UNSET,
 *  otherwise a named error the caller reports. */
function hrSweepFailed_(what, e) {
  if (!hrDocsConfigured_()) return [];
  throw new Error('the Employee Docs store (HR_DOCS_SS_ID) could not be read for ' + what + ': ' + ((e && e.message) || e));
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
        fieldCount: (d.fields || []).length, needsAction: empDocNeedsAction_(d), hasPdf: !!d.pdfKey,
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
      // Batch H: a PDF document names its file; the bytes come from
      // getEmpDocPdf, which re-hashes them on every read.
      pdf: d.pdfKey ? empDocPdfFromBody_(d.bodyMd) : null,
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
  const emp = getEmployeeInfo_();
  if (!emp) return { success: false, error: 'Not authorized.' };
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let notifyAfter = null;
  try {
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
    // Batch H: a PDF document is signed over its BYTES — the stored file is
    // re-hashed against the SHA-256 its frozen body names, and a file that is
    // missing, unreadable or changed is never signed.
    if (d.pdfKey) {
      const pc = empDocPdfCheck_(d);
      if (!pc.ok) return { success: false, error: pc.error + ' It cannot be signed — ask your manager to re-issue it.' };
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
  const callerEmp = getEmployeeInfo_();
  if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let notifyAfter = null;
  try {
    // Batch H: a PDF is checked and hashed first; its SHA-256 goes into the
    // frozen body (empDocValidateIssue_), and the bytes are stored BEFORE the
    // row that names them — a PDF that cannot be stored issues nothing.
    let pdf = null;
    if (payload && payload.pdf) {
      pdf = empDocPdfItem_(payload.pdf, payload.pdfName);
      if (pdf.error) return { success: false, error: pdf.error };
    }
    const v = empDocValidateIssue_(payload, pdf ? { sha: pdf.sha, name: pdf.name } : null);
    if (!v.ok) return { success: false, error: v.error };
    const target = lookupEmployeeById_(v.doc.empId);
    if (!target) return { success: false, error: 'Unknown employee.' };
    if (pdf) empDocPdfStoreCallerLocked_(pdf);
    const docId = Utilities.getUuid();
    const now = new Date();
    const ts = fmtDate_(now) + ' ' + fmtTime_(now);
    const fieldsRaw = v.doc.fields.length ? JSON.stringify(v.doc.fields) : '';
    const contentHash = empDocContentHash_(v.doc.bodyMd, v.doc.title, v.doc.docType, v.doc.empId, fieldsRaw);
    // HR-1 (cycle 23): the title and body land in '@' cells (EMPDOC_TEXT_IDX)
    // — the hash above is over the TEXT, so the cell must keep the text.
    appendRowsTextSafe_(getOrCreateEmpDocSheet_(EMPDOC_TAB, EMPDOC_HEADERS), [[
      docId, v.doc.empId, v.doc.docType, v.doc.title, v.doc.bodyMd, contentHash,
      v.doc.requiresSignature ? 'TRUE' : 'FALSE', v.doc.status,
      String(callerEmp.email).toLowerCase().trim(), ts, v.doc.dueAt, '', '', fieldsRaw, '', pdf ? pdf.key : '',
    ]], EMPDOC_TEXT_IDX);
    writeAuditLog_(callerEmp, 'EmpDocIssue', fmtDate_(now), '', false, 0,
      'docId=' + docId + '; empId=' + v.doc.empId + '; type=' + v.doc.docType + '; status=' + v.doc.status + (pdf ? '; pdf=yes' : ''), callerEmp.email);
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
  const callerEmp = getEmployeeInfo_();
  if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let notifyAfter = null;
  try {
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
        fieldCount: (d.fields || []).length, hasPdf: !!d.pdfKey,
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
  const callerEmp = getEmployeeInfo_();
  if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const found = findEmpDocRow_(docId);
    if (!found || !empDocCanManagerSee_(callerEmp, found.doc)) return { success: false, error: 'Document not found.' };
    if (found.doc.status === 'void') return { success: true, alreadyVoid: true };
    const sheet = getOrCreateEmpDocSheet_(EMPDOC_TAB, EMPDOC_HEADERS);
    sheet.getRange(found.rowIdx, ED.STATUS + 1).setValue(sheetSafe_('void'));
    sheet.getRange(found.rowIdx, ED.VOID_REASON + 1).setNumberFormat('@').setValue(sheetText_(String(reason || '').substring(0, 500)));   // HR-1: a '@' column
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
    // Batch H: a PDF document's file is re-hashed too. A file that no longer
    // matches is tampering; one that cannot be READ is unknown (null), never
    // a verdict either way (g128).
    let pdfMatch = null, pdfNote = '';
    if (d.pdfKey) {
      const pc = empDocPdfCheck_(d);
      pdfMatch = pc.ok ? true : (pc.why === 'altered' || pc.why === 'missing' ? false : null);
      if (!pc.ok) pdfNote = pc.error;
    }
    if (!sigRow) return { signed: false, contentMatch: contentMatch, pdfMatch: pdfMatch, pdfNote: pdfNote, tampered: (contentMatch === false || pdfMatch === false), warning: hashWarning };
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
      pdfMatch: pdfMatch, pdfNote: pdfNote,   // Batch H
      tampered: (contentMatch === false || match === false || pdfMatch === false),
      warning: hashWarning,   // F-24
      signedAt: trainCellTs_(sigRow[EDS.SIGNED_AT], getHrDocsSS_().getSpreadsheetTimeZone()),
      ackVersion: String(sigRow[EDS.ACK_VERSION] || ''),
    };
  } catch (err) { return { error: err.message }; }
}
// ── Batch H (operator 2026-11-02): a document issued AS A PDF ───────────────
/** A chosen PDF as an EmpDocFiles item — {key, sha, contentType, kind, base64,
 *  bytes, name} — or { error }. The SHA-256 is over the file's BYTES, so anyone
 *  can check it against the file with a standard tool. */
function empDocPdfItem_(dataUrl, name) {
  const m = /^data:application\/pdf;base64,([A-Za-z0-9+\/=\s]+)$/i.exec(String(dataUrl || ''));
  if (!m) return { error: 'The document must be a PDF file.' };
  const b64 = m[1].replace(/\s+/g, '');
  if (b64.indexOf('JVBERi0') !== 0) return { error: 'That file is not a PDF (it does not start like one).' };
  const bytes = Math.floor(b64.length * 3 / 4);
  if (bytes > EMPDOC_PDF_MAX_BYTES) return { error: 'The PDF is ' + (Math.round(bytes / 104857.6) / 10) + ' MB — over the ' + (EMPDOC_PDF_MAX_BYTES / 1048576) + ' MB limit.' };
  const sha = empDocSha256Hex_(Utilities.base64Decode(b64));
  return { key: 'empdocpdf-' + sha.substring(0, 24), sha: sha, contentType: 'application/pdf', kind: 'empdoc',
    base64: b64, bytes: bytes, name: String(name || '') };
}
/** Under the CALLER's lock (issueDoc): store one PDF, append-only and keyed by
 *  content (the same file twice is one row set). A tab whose header someone
 *  changed is refused by name (g142) — and so is the document, which is never
 *  issued pointing at bytes nobody can find. */
function empDocPdfStoreCallerLocked_(item) {
  const ss = getHrDocsSS_();
  let sheet = ss.getSheetByName(EMPDOC_FILES_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(EMPDOC_FILES_TAB);
    sheet.appendRow(sheetSafeRow_(KB_MANUAL_IMAGES_HEADERS));
    sheet.setFrozenRows(1);
  }
  if (!kbImageTabHeaderOk_(sheet, KB_MANUAL_IMAGES_HEADERS)) {
    throw new Error('the ' + EMPDOC_FILES_TAB + ' tab’s header row was changed — restore it to ' + KB_MANUAL_IMAGES_HEADERS.join(', ') + ' (nothing was issued)');
  }
  if (kbImageTabLedger_(sheet, KB_MANUAL_IMAGES_HEADERS, EMPDOC_PDF_KEY_RE)[item.key]) return { reused: true };
  appendRowsSafe_(sheet, kbManualImagesRows_([item], fmtDate_(new Date()) + ' ' + fmtTime_(new Date())));
  return { reused: false };
}
/** A document's PDF, read and RE-HASHED: {ok:true, base64, sha} when the bytes
 *  on file are the ones its frozen body names; otherwise {ok:false, error,
 *  why: 'missing' | 'unreadable' | 'altered'} — never a guess (g128). Never
 *  cached (HR content). */
function empDocPdfCheck_(d) {
  const named = empDocPdfFromBody_(d && d.bodyMd);
  if (!d || !d.pdfKey || !named) return { ok: false, why: 'missing', error: 'This document has no PDF on record.' };
  const r = kbImageTabServe_(getHrDocsSS_().getSheetByName(EMPDOC_FILES_TAB), [d.pdfKey], {
    headers: KB_MANUAL_IMAGES_HEADERS, keyRe: EMPDOC_PDF_KEY_RE, batch: 1, types: ['application/pdf'],
    maxBytes: EMPDOC_PDF_MAX_BYTES, cachePrefix: '', headerChangedFails: true, noCache: true });
  const url = r.images[d.pdfKey];
  if (!url) {
    return r.failed.length
      ? { ok: false, why: 'unreadable', error: 'The PDF could not be read' + (r.headerChanged ? ' — the ' + EMPDOC_FILES_TAB + ' tab’s header row was changed' : '') + '.' }
      : { ok: false, why: 'missing', error: 'The PDF is not stored.' };
  }
  const b64 = url.slice(url.indexOf(',') + 1);
  const sha = empDocSha256Hex_(Utilities.base64Decode(b64));
  if (sha !== named.sha) return { ok: false, why: 'altered', error: 'The PDF on file is not the one that was issued (its SHA-256 differs).' };
  return { ok: true, base64: b64, sha: sha, name: named.name };
}
/** Employee-callable, read-only — a document's PDF for exactly who may read
 *  the document (getMyDoc's rule: the owner once released, or a manager
 *  empDocCanManagerSee_ admits). The bytes are re-hashed on every read, so a
 *  file that no longer matches what was issued is said, never shown as it. */
function getEmpDocPdf(docId) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const found = findEmpDocRow_(docId);
    if (!found) return { error: 'Document not found.' };
    const d = found.doc;
    const isOwner = d.empId === emp.id;
    if (!isOwner && !empDocCanManagerSee_(emp, d)) return { error: 'Document not found.' };
    if (isOwner && d.status === 'draft') return { error: 'Document not found.' };
    const pc = empDocPdfCheck_(d);
    if (!pc.ok) return { error: pc.error, why: pc.why };
    return { success: true, dataUri: 'data:application/pdf;base64,' + pc.base64, sha: pc.sha, name: pc.name };
  } catch (err) { return { error: err.message }; }
}
/** PURE (Node-pinned) — the signed certificate's HTML (the forms module's
 *  HTML→PDF route makes it a PDF). Every stored string is escaped; the
 *  signature is the stored PNG data URL, and only that shape is drawn. */
function empDocCertificateHtml_(c) {
  const row = function (k, v) { return '<tr><th style="text-align:left;padding:4px 10px 4px 0;color:#555;font-weight:600;vertical-align:top;white-space:nowrap">' + esc_(k) + '</th><td style="padding:4px 0;vertical-align:top;word-break:break-all">' + esc_(v) + '</td></tr>'; };
  const fields = (c.fields || []).map(function (f) {
    const v = (c.responses || {})[f.id];
    return row(f.label + (f.box ? ' (page ' + f.box.page + ')' : ''), v == null || v === '' ? '—' : String(v));
  }).join('');
  const sig = /^data:image\/png;base64,[A-Za-z0-9+\/=]+$/.test(String(c.signature || ''))
    ? '<p style="margin:14px 0 4px;color:#555;font-weight:600">Signature</p><img alt="Signature" style="max-width:320px;max-height:120px;border:1px solid #ccc" src="' + c.signature + '">'
    : '';
  return '<html><body style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;margin:28px">' +
    '<h1 style="font-size:18px;margin:0 0 4px">Certificate of ' + (c.signed ? 'signature' : 'completion') + '</h1>' +
    '<p style="margin:0 0 14px;color:#555">UMS Team Tools · Employee documents</p>' +
    '<table style="border-collapse:collapse">' +
      row('Document', c.title) + row('Type', c.docType) + row('Employee', c.empName + ' (' + c.empId + ')') +
      row('Issued', c.issuedAt + (c.issuedBy ? ' by ' + c.issuedBy : '')) +
      row(c.signed ? 'Signed' : 'Completed', c.signedAt) +
      (c.pdf ? row('PDF file', c.pdf.name) + row('PDF SHA-256', c.pdf.sha) : '') +
      row('Content hash', c.contentHash) + row('Signature hash', c.sigHash) +
      row('Acknowledgement', c.ackText) +
    '</table>' +
    (fields ? '<p style="margin:14px 0 4px;color:#555;font-weight:600">Responses</p><table style="border-collapse:collapse">' + fields + '</table>' : '') +
    sig +
    '<p style="margin:18px 0 0;color:#777;font-size:10px">The SHA-256 of the PDF is computed over the file’s bytes. The signature hash covers the content hash, the employee, the document, the signature and the responses; recompute both from the HR record to verify.</p>' +
    '</body></html>';
}
/** Employee-callable, read-only — the signed (or completed) document's
 *  certificate as a PDF, for the owner or a manager who can see the document.
 *  Built from HTML by Apps Script's own conversion (the forms module's route,
 *  no Drive); a conversion that fails is named, never a blank file. */
function getEmpDocCertificate(docId) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const found = findEmpDocRow_(docId);
    if (!found) return { error: 'Document not found.' };
    const d = found.doc;
    const isOwner = d.empId === emp.id;
    if (!isOwner && !empDocCanManagerSee_(emp, d)) return { error: 'Document not found.' };
    if (d.status !== 'signed' && d.status !== 'completed') return { error: 'A certificate exists once the document is signed or completed.' };
    const sigSheet = getHrDocsSS_().getSheetByName(EMPDOC_SIG_TAB);
    const last = sigSheet ? sigSheet.getLastRow() : 0;
    let sigRow = null;
    if (last >= 2) {
      const ids = sigSheet.getRange(2, EDS.DOC_ID + 1, last - 1, 1).getValues();
      for (let i = ids.length - 1; i >= 0; i--) {
        if (String(ids[i][0]).trim() === d.docId) { sigRow = sigSheet.getRange(i + 2, 1, 1, EMPDOC_SIG_HEADERS.length).getValues()[0]; break; }
      }
    }
    if (!sigRow) return { error: 'No signature record was found for this document.' };
    const target = lookupEmployeeById_(d.empId);
    const html = empDocCertificateHtml_({
      title: d.title, docType: d.docType, empId: d.empId, empName: target ? target.name : 'former employee',
      issuedAt: d.issuedAt, issuedBy: d.issuedBy, signed: d.status === 'signed',
      signedAt: trainCellTs_(sigRow[EDS.SIGNED_AT], getHrDocsSS_().getSpreadsheetTimeZone()) || d.signedAt,
      pdf: d.pdfKey ? empDocPdfFromBody_(d.bodyMd) : null, contentHash: d.contentHash,
      sigHash: String(sigRow[EDS.SIG_HASH] || ''), ackText: EMPDOC_ACK_TEXT,
      fields: d.fields || [], responses: d.responses || {}, signature: String(sigRow[EDS.SIGNATURE] || '') });
    let pdf;
    try { pdf = Utilities.newBlob(html, 'text/html', 'certificate.html').getAs('application/pdf'); }
    catch (e) { return { error: 'The certificate could not be made into a PDF here: ' + ((e && e.message) || e) }; }
    const name = (String(d.title || 'document').replace(/[\\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'document') + ' - certificate.pdf';
    return { success: true, dataUri: 'data:application/pdf;base64,' + Utilities.base64Encode(pdf.getBytes()), fileName: name };
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
  const callerEmp = getEmployeeInfo_();
  if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
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
  const callerEmp = getEmployeeInfo_();
  if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
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
/** PURE (Node-pinned; F41, cycle 25 — the FORM-5 rule for HR notices). Who a
 *  notice addressed to a stored issuer or creator actually goes to. That
 *  address outlives the role: a manager who was demoted or offboarded kept
 *  receiving "signed" and "acknowledged" notices about the team. Only a
 *  current roster MANAGER is mailed; otherwise the rep's own manager (column M)
 *  when they are one, else every address in MANAGER_EMAILS — and `rerouted`
 *  says the notice must open by saying why. rosterManagers: lowercased emails
 *  of roster rows that are managers. */
function hrNoticeRoute_(stored, repManagerEmail, rosterManagers, gateManagers) {
  const s = String(stored || '').trim().toLowerCase();
  if (!s) return { to: [], rerouted: false };
  const mgrs = (rosterManagers || []).map(function (e) { return String(e).toLowerCase(); });
  if (mgrs.indexOf(s) >= 0) return { to: [String(stored).trim()], rerouted: false };
  const rm = String(repManagerEmail || '').trim().toLowerCase();
  if (rm && rm !== s && mgrs.indexOf(rm) >= 0) return { to: [rm], rerouted: true };
  return { to: (gateManagers || []).filter(function (e) { return String(e).trim().toLowerCase() !== s; }), rerouted: true };
}
/** F41 — hrNoticeRoute_ over the live roster's managers and MANAGER_EMAILS. */
function hrNoticeTargets_(stored, repManagerEmail) {
  let rows;
  // An unreadable roster cannot say who left — the notice goes where it was
  // always sent rather than nowhere (a best-effort mail never blocks the sign).
  try { rows = getEmployeeRosterRows_(); } catch (e) { return { to: stored ? [String(stored).trim()] : [], rerouted: false }; }
  const mgrs = [];
  for (let i = 1; i < rows.length; i++) {
    const e = empRosterEmail_(rows[i]).toLowerCase();
    if (e && /^(true|yes|y|1)$/i.test(String(rows[i][EMP.IS_MANAGER] || '').trim())) mgrs.push(e);
  }
  return hrNoticeRoute_(stored, repManagerEmail, mgrs, getManagerEmails_());
}
/** F41 — the line a rerouted HR notice opens with. */
function hrDepartedIssuerLine_(who, what) {
  return 'This ' + what + ' was set up by ' + who + ', who is no longer a manager on the team roster, so this notice comes to you instead.';
}
function notifyEmpDocSigned_(doc, signer, completedOnly) {
  try {
    if (!doc.issuedBy) return;
    const route = hrNoticeTargets_(doc.issuedBy, signer && signer.managerEmail);   // F41
    if (!route.to.length) return;
    const lead = route.rerouted ? hrDepartedIssuerLine_(doc.issuedBy, 'document') : '';
    // Cycle-11 L-6: a fields-only COMPLETION (no signature) must not tell the
    // issuer the doc was "signed" — an HR paper-trail mislabel. The stored
    // artifacts (EmpDocCompleted witness row, completion cert) were always
    // correct; only this notification's wording was wrong.
    const verb = completedOnly ? 'completed' : 'signed';
    const body = (lead ? lead + '\n\n' : '') + signer.name + ' ' + verb + ' "' + doc.title + '".';
    const htmlBody = buildBrandedEmailHtml_(completedOnly ? 'Document completed' : 'Document signed',
      (lead ? '<p style="margin:0 0 12px;">' + esc_(lead) + '</p>' : '') +
      brandedKvRows_([['Document', doc.title], [completedOnly ? 'Completed by' : 'Signed by', signer.name]]),
      { tone: 'success', subLabel: 'Employee Docs' });
    appSendMail_({ to: route.to.join(','), subject: (completedOnly ? 'Completed: ' : 'Signed: ') + doc.title,
      body: body, htmlBody: htmlBody });
  } catch (e) { console.warn('notifyEmpDocSigned_ failed: ' + e.message); }
}
