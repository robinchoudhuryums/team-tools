// ════════════════════════════════════════════════════════════════════════════
//  UMS TEAM TOOLS — 60_intake.js
//  Intake: the PPD recommendation engine, the account forms and their emails.
//
//  ONE Apps Script project, ONE global scope: these files are the SERVER, in
//  the load order `web-app/.clasp.json` filePushOrder declares. Batch F2 split
//  them out of Code.js as a MOVE — every declaration below is byte-identical to
//  the one it replaced, and the SPLIT-MANIFEST pin proves it.
// ════════════════════════════════════════════════════════════════════════════

/** The intake-feedback collection page (?intakefb=<submissionId>&ft=<type>).
 *  A tiny signed-in page: textarea + one button wired to submitIntakeFeedback
 *  via google.script.run (the same bridge every doGet-served page gets). The
 *  ids are injected with the <?!= JSON …?> XSS discipline of INV-78 — here as
 *  plain string building, so both values are JSON-encoded + <-escaped. */
function serveIntakeFeedbackPage_(submissionId, formType) {
  const P = CN_EMAIL_PALETTE;
  const idJs = JSON.stringify(String(submissionId || '').slice(0, 64)).replace(/</g, '\\u003c');
  const ftJs = JSON.stringify(String(formType || '').slice(0, 8)).replace(/</g, '\\u003c');
  const html =
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Intake feedback</title></head><body style="margin:0;background:' + P.paper + ';">' +
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:48px auto;padding:28px;background:#ffffff;border:1px solid ' + P.line + ';border-radius:12px;color:' + P.ink + ';">' +
      '<h2 style="font-size:19px;margin:0 0 6px;color:' + P.brand + ';">Feedback on this recommendation</h2>' +
      '<p style="font-size:13px;color:' + P.muted + ';margin:0 0 16px;">Goes to the team that tunes the intake recommendation logic, attached to this exact submission. Please don\u2019t paste patient details beyond what\u2019s needed.</p>' +
      '<textarea id="fb" rows="6" maxlength="4000" style="width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:10px 12px;border:1px solid ' + P.line + ';border-radius:8px;" placeholder="What looked wrong, and what you expected\u2026"></textarea>' +
      '<div style="margin-top:14px;display:flex;align-items:center;gap:12px;">' +
        '<button id="send" style="background:' + P.accent + ';color:#fff;border:0;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;">Send feedback</button>' +
        '<span id="msg" style="font-size:12px;color:' + P.muted + ';"></span>' +
      '</div>' +
      '<p style="font-size:11px;color:' + P.muted + ';margin-top:20px;">UMS Team Tools \u00b7 Intake</p>' +
    '</div>' +
    '<script>' +
      'var SUB_ID = ' + idJs + ', FORM_TYPE = ' + ftJs + ';' +
      'document.getElementById("send").onclick = function () {' +
        'var btn = this, msg = document.getElementById("msg");' +
        'var text = document.getElementById("fb").value;' +
        'if (!text.trim()) { msg.textContent = "Type the feedback first."; return; }' +
        'btn.disabled = true; msg.textContent = "Sending\u2026";' +
        'google.script.run.withSuccessHandler(function (res) {' +
          'if (res && res.success) { msg.textContent = "Sent \u2014 thank you. You can close this tab."; }' +
          'else { btn.disabled = false; msg.textContent = (res && res.error) || "Could not send \u2014 try again."; }' +
        '}).withFailureHandler(function (err) {' +
          'btn.disabled = false; msg.textContent = (err && err.message) || "Could not send \u2014 try again.";' +
        '}).submitIntakeFeedback(SUB_ID, FORM_TYPE, text);' +
      '};' +
    '</scr' + 'ipt></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('Intake feedback')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
/** Operator 2026-08-25 (batch 6) — count the rep's INTAKE-flagged notes in a
 *  range: rows whose SubformData carries `intakeType` (set by the intake
 *  auto-log, INV-143's bounded enum — ppd/pmd/pap). The DATA already existed;
 *  this makes it countable so long intake calls are EXPLAINABLE next to ATT
 *  instead of silently inflating it. Per-call CDR attribution does NOT exist
 *  (DQE is one row per agent+date — the settled cycle-14 Phase 0 fact), so
 *  this is deliberately a COUNT beside the KPI, never a modeled "adjusted
 *  ATT" — an invented subtraction would be presented as data (INV-187).
 *  Same outcome contract as cnCountNotesResult_: {count, unavailable,
 *  unenrolled} — a failed read is never a confident 0. 2-column bounded read
 *  (the taxonomy pattern) + a substring pre-filter before any JSON.parse. */
function cnCountIntakeNotesResult_(emp, from, to) {
  if (!emp || !emp.callNotesSheetId) return { count: 0, unavailable: false, unenrolled: true };
  try {
    const sheet = getCallNotesSheet_(emp);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { count: 0, unavailable: false, unenrolled: false };
    const dateCol = sheet.getRange(2, CN.DATE_LOCAL + 1, lastRow - 1, 1).getValues();
    const subCol = sheet.getRange(2, CN.SUBFORM_DATA + 1, lastRow - 1, 1).getValues();
    let n = 0;
    for (let i = 0; i < dateCol.length; i++) {
      const d = cnDateLocalString_(dateCol[i][0]);
      if (d < from || d > to) continue;
      const raw = String(subCol[i][0] || '');
      if (raw.indexOf('"intakeType"') < 0) continue;
      try {
        const sd = JSON.parse(raw);
        if (sd && sd.intakeType) n++;
      } catch (e) { /* corrupt blob never breaks a count (callNoteRowToObject_ posture) */ }
    }
    return { count: n, unavailable: false, unenrolled: false };
  } catch (e) {
    console.warn('cnCountIntakeNotesResult_ failed for ' + ((emp && emp.id) || '?') + ': ' + e.message);
    return { count: 0, unavailable: true, unenrolled: false };
  }
}
/** Pure (Node-pinned) — bucket submission timestamps into trailing calendar
 *  months. tsByType = {PPD: [ts...], PMD: [...], PAP: [...]}; months = how
 *  many trailing months incl. the current (todayIso anchors the newest).
 *  Returns newest-first rows {month:'yyyy-MM', ppd, pmd, pap, total}. */
function intakeVolumeBuckets_(tsByType, months, todayIso) {
  const out = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(todayIso || ''))) return out;
  let y = parseInt(todayIso.slice(0, 4), 10), m = parseInt(todayIso.slice(5, 7), 10);
  const keys = [];
  for (let i = 0; i < months; i++) {
    keys.push(y + '-' + String(m).padStart(2, '0'));
    m--; if (m < 1) { m = 12; y--; }
  }
  keys.forEach(function (mk) {
    const row = { month: mk, ppd: 0, pmd: 0, pap: 0, total: 0 };
    ['PPD', 'PMD', 'PAP'].forEach(function (ft) {
      ((tsByType || {})[ft] || []).forEach(function (ts) {
        if (String(ts || '').slice(0, 7) === mk) { row[ft.toLowerCase()]++; row.total++; }
      });
    });
    out.push(row);
  });
  return out;
}
function getIntakeVolumeStats() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { error: 'Manager access required.' };
    const tsByType = {};
    const failed = [];
    INTAKE_FORM_TYPES_.forEach(function (ft) {
      try {
        const sheet = getIntakeSubmissionSheet_(ft);
        const last = sheet.getLastRow();
        if (last < 2) { tsByType[ft] = []; return; }
        const start = Math.max(2, last - INTAKE_VOLUME_SCAN_MAX + 1);
        tsByType[ft] = sheet.getRange(start, 2, last - start + 1, 1).getValues()
          .map(function (r) { return intakeTsString_(r[0]); });
      } catch (e) { failed.push(ft); }
    });
    const today = Utilities.formatDate(new Date(), CONFIG.MANAGER_TIMEZONE, 'yyyy-MM-dd');
    return {
      months: intakeVolumeBuckets_(tsByType, INTAKE_VOLUME_MONTHS, today),
      failedTypes: failed,   // INV-187: an unreadable tab is named, never a silent 0 column
    };
  } catch (err) { return { error: err.message }; }
}
function getIntakeSS_() {
  if (typeof _TEST_OVERRIDE_INTAKE_SS_ID !== 'undefined' && _TEST_OVERRIDE_INTAKE_SS_ID) {
    // Test override is never memoized (fixture identity can change mid-run).
    return SpreadsheetApp.openById(_TEST_OVERRIDE_INTAKE_SS_ID);
  }
  // Cycle-11 L-12: memoized per execution — the cycle-9 L-3 getAdpSS_ pattern.
  // intakeTsString_ calls this PER COERCED CELL, so intakeListMySubmissions
  // was up to ~100 un-memoized openById round-trips per Sent-tab open.
  if (_intakeSsMemo) return _intakeSsMemo;
  const id = PropertiesService.getScriptProperties().getProperty('INTAKE_SS_ID') || CONFIG.INTAKE.SS_ID;
  _intakeSsMemo = SpreadsheetApp.openById(id);
  return _intakeSsMemo;
}
function getIntakeSalesEmail_()     { return PropertiesService.getScriptProperties().getProperty('INTAKE_SALES_EMAIL')      || CONFIG.INTAKE.SALES_EMAIL; }
function getIntakeSleepEmail_()     { return PropertiesService.getScriptProperties().getProperty('INTAKE_SLEEP_EMAIL')      || CONFIG.INTAKE.SLEEP_EMAIL; }
function getIntakeBccEmail_()       { return PropertiesService.getScriptProperties().getProperty('INTAKE_BCC_EMAIL')        || CONFIG.INTAKE.BCC_EMAIL; }
function getIntakeAllAgentsEmail_() { return PropertiesService.getScriptProperties().getProperty('INTAKE_ALL_AGENTS_EMAIL') || CONFIG.INTAKE.ALL_AGENTS_EMAIL; }
// Returns the raw 2D Offerings rows [features, hcpcs, weightCap, seatType,
// pdfLink, imageUrl] (A2:F) — the exact shape the ported engine expects.
function getIntakeOfferings_() {
  if (_intakeOfferingsCache) return _intakeOfferingsCache;
  const sheet = getIntakeSS_().getSheetByName(CONFIG.INTAKE.OFFERINGS_TAB);
  if (!sheet) throw new Error('Offerings tab "' + CONFIG.INTAKE.OFFERINGS_TAB + '" not found in the Intake spreadsheet.');
  const last = sheet.getLastRow();
  _intakeOfferingsCache = last < 2 ? [] : sheet.getRange(2, 1, last - 1, 6).getValues();
  return _intakeOfferingsCache;
}
/** F9 (cycle 16) — PURE catalog validator over the raw Offerings rows.
 *
 *  WHY THIS EXISTS: the PPD engine's correctness depends on an
 *  operator-maintained spreadsheet, and nothing anywhere checked its shape. The
 *  F9 fix makes a product with an unreadable weight capacity fail CLOSED (it is
 *  excluded rather than treated as unlimited), which is the safe direction —
 *  but on its own it turns a data-entry slip into a chair that silently stops
 *  being recommended, with no way for the operator to find out. This names the
 *  offending rows.
 *
 *  Checks only what the ENGINE actually reads, and only what is objectively
 *  wrong — never taste. `severity: 'error'` means the row cannot be recommended
 *  at all; 'warn' means it still works but is probably not what was intended.
 *  Row numbers are 1-based SHEET rows (the A2:F read starts at row 2) so the
 *  operator can jump straight to the cell. PHI-free by construction — the
 *  Offerings catalog is product data. */
function intakeCatalogIssues_(rows) {
  const out = [];
  (rows || []).forEach(function (r, i) {
    const sheetRow = i + 2;                       // A2:F — index 0 is sheet row 2
    const cell = function (n) { return String(r && r[n] == null ? '' : r[n]).trim(); };
    const hcpcs = cell(1);
    // A row with no HCPCS is already dropped by the engine (hcpcsNum === 0) and
    // is almost always a trailing blank row — not worth reporting as an error.
    if (!hcpcs) return;
    const cap = cell(2);
    const seat = cell(3).toLowerCase();
    if (!cap) {
      out.push({ row: sheetRow, hcpcs: hcpcs, severity: 'error', field: 'weight capacity',
        detail: 'blank — the product is excluded for every patient with a recorded weight' });
    } else if (cap.indexOf('-') >= 0) {
      const parts = cap.split('-');
      const lo = parseInt(parts[0], 10), hi = parseInt(parts[1], 10);
      if (!isFinite(lo) || !isFinite(hi)) {
        out.push({ row: sheetRow, hcpcs: hcpcs, severity: 'error', field: 'weight capacity',
          detail: 'unreadable range "' + cap + '" — expected e.g. "300-450"' });
      } else if (lo > hi) {
        out.push({ row: sheetRow, hcpcs: hcpcs, severity: 'error', field: 'weight capacity',
          detail: 'range "' + cap + '" is inverted (min above max) — it can never match' });
      }
    } else if (!isFinite(parseInt(cap, 10))) {
      out.push({ row: sheetRow, hcpcs: hcpcs, severity: 'error', field: 'weight capacity',
        detail: 'non-numeric "' + cap + '" — the product is excluded for every patient with a recorded weight' });
    } else if (/[‐-―]/.test(cap)) {
      // An EN/EM dash is not the ASCII '-' the range branch splits on, so
      // "300–450" silently reads as a flat 300 cap. Stricter than intended
      // rather than dangerous, hence warn — but it is never deliberate.
      out.push({ row: sheetRow, hcpcs: hcpcs, severity: 'warn', field: 'weight capacity',
        detail: 'contains a non-ASCII dash — "' + cap + '" reads as a flat cap, not a range' });
    }
    // Seat type drives the solid-vs-captain gate. A blank cell is not fatal for
    // an inherently-solid HCPCS (the engine has its own code list) but for
    // anything else it means the row can never satisfy either branch.
    if (!seat) {
      out.push({ row: sheetRow, hcpcs: hcpcs, severity: 'warn', field: 'seat type',
        detail: 'blank — only recognised as solid-seat if ' + hcpcs + ' is on the engine\'s inherently-solid list' });
    } else if (seat.indexOf('s') < 0 && seat.indexOf('c') < 0) {
      out.push({ row: sheetRow, hcpcs: hcpcs, severity: 'error', field: 'seat type',
        detail: '"' + cell(3) + '" contains neither "s" (solid) nor "c" (captain) — the row matches no seat branch' });
    }
    // E/F drive the result card's brochure link + device image. Documented as
    // operator-required in the Operator State Checklist; blank means the agent
    // gets no image to send the patient.
    if (!cell(4)) {
      out.push({ row: sheetRow, hcpcs: hcpcs, severity: 'warn', field: 'pdfLink',
        detail: 'blank — the HCPCS code renders with no brochure link' });
    } else if (!intakeHttpOnly_(cell(4))) {
      // seams-18 F1 follow-on (INV-187): every sink (rec cards, sent email,
      // Catalog tab) scheme-whitelists this column, so a non-http value —
      // usually a schemeless "www.x.com" — SILENTLY renders no link anywhere.
      // Name it here so the silence is visible to the operator.
      out.push({ row: sheetRow, hcpcs: hcpcs, severity: 'warn', field: 'pdfLink',
        detail: 'not an http(s) URL — "' + cell(4) + '" renders no brochure link anywhere (add the https:// prefix)' });
    }
    if (!cell(5)) {
      out.push({ row: sheetRow, hcpcs: hcpcs, severity: 'warn', field: 'imageUrl',
        detail: 'blank — the result card renders no device image for the agent to send' });
    } else if (!intakeHttpOnly_(cell(5))) {
      out.push({ row: sheetRow, hcpcs: hcpcs, severity: 'warn', field: 'imageUrl',
        detail: 'not an http(s) URL — "' + cell(5) + '" renders no device image anywhere (add the https:// prefix)' });
    }
  });
  return out;
}
/** Reads the catalog and validates it. Best-effort and SHAPED so an unreachable
 *  Intake store is distinguishable from a clean catalog (the INV-129 rule — a
 *  failed read must never render as "all good"). Cheap: the catalog is a few
 *  dozen rows and already memoized per execution by getIntakeOfferings_. */
function getIntakeCatalogHealth_() {
  try {
    const rows = getIntakeOfferings_();
    const issues = intakeCatalogIssues_(rows);
    return {
      ok: true,
      totalRows: rows.length,
      errors: issues.filter(function (x) { return x.severity === 'error'; }),
      warnings: issues.filter(function (x) { return x.severity === 'warn'; }),
    };
  } catch (e) {
    return { ok: false, error: e.message, totalRows: null, errors: [], warnings: [] };
  }
}
function getIntakeSubmissionSheet_(formType) {
  const ss = getIntakeSS_();
  let tab, headers;
  if (formType === 'PPD')      { tab = CONFIG.INTAKE.PPD_SUBMISSIONS_TAB; headers = INTAKE_PPD_SUB_HEADERS; }
  else if (formType === 'PMD') { tab = CONFIG.INTAKE.PMD_SUBMISSIONS_TAB; headers = INTAKE_ACCT_SUB_HEADERS; }
  else                         { tab = CONFIG.INTAKE.PAP_SUBMISSIONS_TAB; headers = INTAKE_ACCT_SUB_HEADERS; }
  let sheet = ss.getSheetByName(tab);
  if (!sheet) {
    sheet = ss.insertSheet(tab);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  } else if (sheet.getLastColumn() < headers.length) {
    // Amend-&-re-send (operator 2026-08-25) added the trailing AmendsId
    // column — self-heal the header once (the INV-126/135 pattern; legacy
    // rows read the cell as blank = not an amendment).
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  }
  return sheet;
}
function getIntakeFeedbackSheet_() {
  const ss = getIntakeSS_();
  let sheet = ss.getSheetByName(CONFIG.INTAKE.FEEDBACK_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.INTAKE.FEEDBACK_TAB);
    sheet.appendRow(INTAKE_FEEDBACK_HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, INTAKE_FEEDBACK_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}
/** The email button. Appended to the FINAL body (post-hash-check, the
 *  drResolveCtaHtml_ pattern — INV-41's preview contract covers the BASE
 *  body, so the CTA never enters the hash). Callers skip it entirely when
 *  the exec URL cannot be resolved — a dead button is worse than none. */
function intakeFeedbackCtaHtml_(url) {
  const P = CN_EMAIL_PALETTE;
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td style="padding:18px 0 2px;text-align:center;">' +
      '<a href="' + esc_(url) + '" style="display:inline-block;background:' + P.paper + ';color:' + P.brand + ';' +
      'border:1px solid ' + P.line + ';text-decoration:none;font-weight:600;padding:9px 18px;border-radius:8px;font-size:12px;">' +
      'Send feedback on this recommendation</a>' +
      '<p style="margin:7px 0 0;font-size:11px;color:' + P.muted + ';">Spot something off? A sentence here reaches the team that tunes the recommendation logic.</p>' +
    '</td></tr></table>';
}
/** URL + button for one submission, or '' when the exec URL cannot be
 *  resolved (a dead button is worse than none — the safeWebAppUrl_ posture). */
function intakeFeedbackCta_(submissionId, formType) {
  try {
    const base = getWebAppExecUrl_();
    if (!base) return '';
    return intakeFeedbackCtaHtml_(base + '?intakefb=' + encodeURIComponent(submissionId) +
      '&ft=' + encodeURIComponent(formType));
  } catch (e) { return ''; }
}
/** Feedback rows for one submission — bounded tail scan, newest-first. */
function intakeFeedbackFor_(formType, submissionId) {
  try {
    const sheet = getIntakeFeedbackSheet_();
    const last = sheet.getLastRow();
    if (last < 2) return [];
    const first = Math.max(2, last - INTAKE_FEEDBACK_SCAN_MAX + 1);
    const rows = sheet.getRange(first, 1, last - first + 1, INTAKE_FEEDBACK_HEADERS.length).getValues();
    const out = [];
    for (let i = rows.length - 1; i >= 0; i--) {
      if (String(rows[i][1]).trim() !== submissionId) continue;
      if (String(rows[i][2]).trim().toUpperCase() !== formType) continue;
      out.push({
        at: intakeTsString_(rows[i][0]),
        fromEmail: String(rows[i][3] || ''),
        fromName: String(rows[i][4] || ''),
        text: String(rows[i][5] || ''),
      });
    }
    return out;
  } catch (e) {
    // F8 (2026-09-09): best-effort is right — a feedback read must never take
    // the submission detail down with it — but SILENT was not. `[]` is exactly
    // what a clean submission with no feedback returns, so a swallowed failure
    // rendered as "nobody has said anything", which is the one reading the
    // data cannot support (INV-187). The outcome now rides back and the
    // client says "couldn't load" instead.
    return { unavailable: true, error: String((e && e.message) || e) };
  }
}
/** The read outcome, normalized for a caller that just wants the list (F8).
 *  Returns {items, unavailable} — `unavailable` is the INV-35 distinction:
 *  an empty list is a FACT, an unreadable one is not. */
function intakeFeedbackResult_(formType, submissionId) {
  const r = intakeFeedbackFor_(formType, submissionId);
  return Array.isArray(r)
    ? { items: r, unavailable: false }
    : { items: [], unavailable: true, error: String((r && r.error) || '') };
}
/** Rep-callable (the recipient IS an employee — intake recipients resolve from
 *  the roster). Locked (INV-01); the row is appended only when the submission
 *  actually EXISTS, so a mistyped/forged id can't seed junk rows. The audit
 *  row is PHI-free (id + type only — the feedback TEXT may reference the
 *  patient and stays in the Intake store). */
function submitIntakeFeedback(submissionId, formType, text) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Not authorized.' };
    const ft = String(formType || '').trim().toUpperCase();
    if (INTAKE_FORM_TYPES_.indexOf(ft) < 0) return { success: false, error: 'Unknown form type.' };
    const id = String(submissionId || '').trim();
    if (!id || id.length > 64) return { success: false, error: 'Missing submission id.' };
    const body = String(text || '').trim();
    if (!body) return { success: false, error: 'Type the feedback first.' };
    if (body.length > INTAKE_FEEDBACK_MAX_CHARS) {
      return { success: false, error: 'Feedback is too long (max ' + INTAKE_FEEDBACK_MAX_CHARS + ' characters).' };
    }
    // Existence check — a bounded id-column scan of the right submissions tab.
    const sub = getIntakeSubmissionSheet_(ft);
    const lastRow = sub.getLastRow();
    let found = false;
    if (lastRow >= 2) {
      const ids = sub.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) {
        if (String(ids[i][0]).trim() === id) { found = true; break; }
      }
    }
    if (!found) return { success: false, error: 'Submission not found — the link may be stale.' };
    getIntakeFeedbackSheet_().appendRow([
      fmtDate_(new Date()) + ' ' + fmtTime_(new Date()), id, ft, emp.email, emp.name, body,
    ]);
    writeAuditLog_(emp, 'IntakeFeedback', fmtDate_(new Date()), '', false, 0,
      'type=' + ft + '; submissionId=' + id, emp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
function intakeValidateEmail_(email) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}
// spec: { kind:'agent'|'default'|'all'|'custom', id?, email? }
function intakeResolveRecipient_(formType, spec) {
  spec = spec || {};
  if (spec.kind === 'default') return formType === 'PAP' ? getIntakeSleepEmail_() : getIntakeSalesEmail_();
  if (spec.kind === 'all')     return getIntakeAllAgentsEmail_();
  if (spec.kind === 'agent') {
    const rows = getEmployeeRosterRows_();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][EMP.ID]).trim() === String(spec.id).trim()) {
        const em = String(rows[i][EMP.EMAIL]).trim();
        if (em) return em;
      }
    }
    throw new Error('Could not resolve an email for the selected agent.');
  }
  if (spec.kind === 'custom') {
    const em = String(spec.email || '').trim();
    if (!intakeValidateEmail_(em)) throw new Error('Invalid recipient email: ' + em);
    return em;
  }
  throw new Error('No recipient selected.');
}
// Agent picker for the PPD send footer. Any registered employee may call it;
// returns names + ids only (never emails — the server resolves id→email at
// send so agent addresses never reach the client).
function getIntakeAgents() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const rows = getEmployeeRosterRows_();
    const agents = [];
    for (let i = 1; i < rows.length; i++) {
      if (!empRosterEmail_(rows[i])) continue;   // F3: one predicate
      agents.push({ id: String(rows[i][EMP.ID]).trim(), name: String(rows[i][EMP.NAME]).trim() });
    }
    agents.sort((a, b) => a.name.localeCompare(b.name));
    return { agents };
  } catch (err) { return { error: err.message }; }
}
// ── Recommendation engine ─────────────────────────────────────────────────
// Ported verbatim from filterRecommendations.js::getFilteredRecommendations,
// with two changes: (1) answers come from the `answers` object (keyed by bare
// question number, e.g. '38','31a','33') instead of the active sheet, and
// (2) the diagnostic toast is removed. `allProducts` is the raw 2D Offerings
// array [features, hcpcs, weightCap, seatType, pdfLink, imageUrl]. Pure +
// self-contained so the Node harness can unit-test the eligibility branches.
/** Pure — derive the PPD engine's clinical decision FACTORS from the raw answer
 *  map (bare question numbers). Extracted from intakeFilterRecommendations_ so the
 *  engine AND the read-only explainability surface (intakeExplainFactors_) share
 *  ONE derivation — no parallel-source drift (INV-112). Returns the patient flag
 *  bag + the eligibility booleans; the engine destructures these back into the
 *  same local names so the rest of the engine is byte-for-byte unchanged. */
function intakeDeriveClinicalFactors_(answers) {
  answers = answers || {};
  const getAnswerText = (q) => String(answers[q] == null ? '' : answers[q]).toLowerCase().trim();
  const isPositive = (q) => { const a = getAnswerText(q); return a.includes('yes') || a.includes('true'); };

  const patient = {
    // F(cycle-8): keep the decimal point — the old \D strip turned "250.5"
    // into 2505 lbs, failing every weight-cap filter AND reading as ≥285 for
    // the Q39a mobile-home rule. Units/commas still drop.
    weight: parseFloat(getAnswerText('38').replace(/[^\d.]/g, '')) || 0,
    neuroCondition: getAnswerText('43'),
    numbnessAnswer: getAnswerText('25'),
    amputationStatus: getAnswerText('34'),
    strokeDetails: getAnswerText('31a'),
    dwelling: getAnswerText('39a'),
    hasSpineCurvature: isPositive('35'),
    isOnOxygen: isPositive('44'),
    hasPressureUlcers: isPositive('33'),
    hasSpasticity: isPositive('32'),
    hasSwelling: isPositive('36'),
    hasFallHistory: isPositive('13'),
    usesCatheters: isPositive('30'),
  };

  patient.hasLowerExtremityNumbness = patient.numbnessAnswer.includes('feet') || patient.numbnessAnswer.includes('legs');
  // Q39a dwelling (operator rule 2026-07-09): a Mobile Home constrains what we
  // can physically deliver — consumed by the K0821-only restriction in
  // intakeFilterRecommendations_. Old submissions without a 39a answer read ''
  // → false (no restriction), so historical recomputes are unchanged.
  patient.livesInMobileHome = patient.dwelling.includes('mobile');
  patient.hasAmputation = (patient.amputationStatus.includes('knee') ||
                           patient.amputationStatus.includes('left') ||
                           patient.amputationStatus.includes('right')) &&
                          !patient.amputationStatus.includes('no');

  // --- STROKE ANALYSIS ---
  let qualifiesForHemiplegia = false;
  let hasStrokeWeakness = false;
  let hemiplegiaSide = '';
  if (patient.strokeDetails && !patient.strokeDetails.includes('no')) {
    const parts = patient.strokeDetails.split(/[,;\n\r]+/);
    let rightParaCount = 0, leftParaCount = 0;
    parts.forEach(part => {
      const p = part.trim();
      if (p.includes('weakness') || p.includes('paralysis')) hasStrokeWeakness = true;
      if (p.includes('paralysis')) {
        if (p.includes('right arm'))  rightParaCount++;
        if (p.includes('right leg'))  rightParaCount++;
        if (p.includes('right side')) rightParaCount += 2;
        if (p.includes('left arm'))   leftParaCount++;
        if (p.includes('left leg'))   leftParaCount++;
        if (p.includes('left side'))  leftParaCount += 2;
      }
    });
    if (rightParaCount >= 2)      { qualifiesForHemiplegia = true; hemiplegiaSide = 'Right'; }
    else if (leftParaCount >= 2)  { qualifiesForHemiplegia = true; hemiplegiaSide = 'Left'; }
  }

  const hasValidNeuroDiagnosis = patient.neuroCondition && !['no', 'n/a', 'none', '', 'no.'].includes(patient.neuroCondition);

  const isNeuroEligible = hasValidNeuroDiagnosis || patient.hasSpasticity || qualifiesForHemiplegia;
  const isSPOEligible = patient.hasSwelling || patient.hasPressureUlcers || isNeuroEligible ||
                        patient.usesCatheters || patient.hasSpineCurvature || patient.hasAmputation;
  const isMPOEligible = patient.usesCatheters || isNeuroEligible;

  return {
    patient: patient,
    qualifiesForHemiplegia: qualifiesForHemiplegia,
    hasStrokeWeakness: hasStrokeWeakness,
    hemiplegiaSide: hemiplegiaSide,
    hasValidNeuroDiagnosis: !!hasValidNeuroDiagnosis,
    isNeuroEligible: isNeuroEligible,
    isSPOEligible: isSPOEligible,
    isMPOEligible: isMPOEligible,
  };
}
/** Pure — a read-only, human-readable EXPLANATION of the engine's decision
 *  factors for a PPD answer set (manager-auditable; INV-112 explainability).
 *  Reuses intakeDeriveClinicalFactors_ (so it can never drift from what the
 *  engine actually evaluated) and returns a flat list of `{label, value}` rows
 *  — the clinical inputs that drive solid-seat / Group-3 / SPO / MPO eligibility
 *  + the substitutions. PHI: derived from the patient's own answers (already in
 *  the submission); adds no new data. */
function intakeExplainFactors_(answers) {
  const F = intakeDeriveClinicalFactors_(answers);
  const p = F.patient;
  const yn = (b) => b ? 'Yes' : 'No';
  const rows = [];
  rows.push({ label: 'Weight', value: p.weight ? (p.weight + ' lbs') : 'not provided' });
  rows.push({ label: 'Dwelling (Q39a)', value: p.dwelling || 'not provided' });
  if (p.livesInMobileHome) {
    rows.push({ label: 'Mobile-home restriction', value: (p.weight > 0 && p.weight < 285)
      ? 'Yes — K0821 only (weight under 285 lbs)'
      : ('No — ' + (p.weight ? 'weight is 285 lbs or more' : 'weight not provided')) });
  }
  rows.push({ label: 'Valid neuro diagnosis (Q43)', value: F.hasValidNeuroDiagnosis ? ('Yes — "' + p.neuroCondition + '"') : 'No' });
  rows.push({ label: 'Spasticity (Q32)', value: yn(p.hasSpasticity) });
  rows.push({ label: 'Hemiplegia from stroke (Q31a)', value: F.qualifiesForHemiplegia ? ('Yes — ' + F.hemiplegiaSide + ' side') : (F.hasStrokeWeakness ? 'Weakness only (no hemiplegia)' : 'No') });
  rows.push({ label: 'Amputation (Q34)', value: yn(p.hasAmputation) });
  rows.push({ label: 'Pressure ulcers (Q33)', value: yn(p.hasPressureUlcers) });
  rows.push({ label: 'Spinal curvature (Q35)', value: yn(p.hasSpineCurvature) });
  rows.push({ label: 'Lower-extremity numbness (Q25)', value: yn(p.hasLowerExtremityNumbness) });
  rows.push({ label: 'Uses catheters (Q30)', value: yn(p.usesCatheters) });
  rows.push({ label: 'Swelling/edema (Q36)', value: yn(p.hasSwelling) });
  rows.push({ label: 'On oxygen (Q44)', value: yn(p.isOnOxygen) + (p.isOnOxygen ? ' — excludes K0837/K0838' : '') });
  // Derived eligibility — the gates the engine applies to the catalog.
  rows.push({ label: 'Solid-seat required', value: yn(p.hasSpineCurvature || p.hasPressureUlcers || p.hasSpasticity || F.hasValidNeuroDiagnosis || F.qualifiesForHemiplegia || F.hasStrokeWeakness || p.hasLowerExtremityNumbness || p.usesCatheters || p.hasAmputation) });
  rows.push({ label: 'Group-3 / neuro eligible', value: yn(F.isNeuroEligible) });
  rows.push({ label: 'Power-tilt (SPO) eligible', value: yn(F.isSPOEligible) });
  rows.push({ label: 'Power-options (MPO) eligible', value: yn(F.isMPOEligible) });
  return rows;
}
function intakeFilterRecommendations_(answers, allProducts) {
  answers = answers || {};
  allProducts = allProducts || [];

  // Decision factors derived ONCE via the shared helper, destructured back into
  // the original local names so the filter / substitution / justify logic below
  // is unchanged (the explainability surface reuses the same derivation).
  const F = intakeDeriveClinicalFactors_(answers);
  const patient = F.patient;
  const qualifiesForHemiplegia = F.qualifiesForHemiplegia;
  const hasStrokeWeakness = F.hasStrokeWeakness;
  const hemiplegiaSide = F.hemiplegiaSide;
  const hasValidNeuroDiagnosis = F.hasValidNeuroDiagnosis;
  const isNeuroEligible = F.isNeuroEligible;
  const isSPOEligible = F.isSPOEligible;
  const isMPOEligible = F.isMPOEligible;

  // ── Q39a mobile-home restriction (operator rule, 2026-07-09) ─────────────
  // Mobile Home + weight under 285 lbs → K0821 is the ONLY chair we can
  // provide. Operator decisions: (a) the HOME constraint WINS over the
  // clinical gates — K0821 returns even when solid-seat / Group-3 eligibility
  // would normally exclude it, and the justification tells the agent why no
  // upgrade is offered; (b) at/above 285 lbs the standard logic runs
  // unchanged; (c) a BLANK weight also runs standard logic (the rule is
  // "under 285" — fill Q38 for it to apply). K0821 missing from the
  // operator-owned Offerings catalog → empty result (the panel shows no
  // recommendations rather than silently ignoring the home constraint).
  const mobileHomeRestricted = patient.livesInMobileHome && patient.weight > 0 && patient.weight < 285;
  if (mobileHomeRestricted) {
    const k0821Row = allProducts.find(r => String(r[1] == null ? '' : r[1]).trim() === 'K0821');
    if (!k0821Row) return { standard: [], complex: [] };
    return {
      standard: [{
        hcpcs: 'K0821',
        pdfLink: String(k0821Row[4] == null ? '' : k0821Row[4]),
        imageUrl: String(k0821Row[5] == null ? '' : k0821Row[5]),
        category: 'Standard',
        sortOrder: 821,
        // Fixed server vocabulary only (the justification is the ONE raw-HTML
        // exception — never put a user-supplied value in it).
        justification: 'Mobile-home residence with weight under 285 lbs — <strong>K0821</strong> is the only option we can provide.',
      }],
      complex: [],
    };
  }

  const inherentlySolidCodes = [
    'K0822', 'K0824', 'K0826', 'K0828',
    'K0835', 'K0837', 'K0839',
    'K0840', 'K0841', 'K0843',
    'K0848', 'K0849', 'K0850', 'K0851',
    'K0856', 'K0857', 'K0858', 'K0859',
    'K0861', 'K0862', 'K0863', 'K0864',
  ];

  const eligibleProducts = allProducts
    .map(productRow => {
      const [features, hcpcs, weightCapacityStr, seatType, pdfLink, imageUrl] = productRow.map(p => String(p == null ? '' : p));
      return { features, hcpcs, weightCapacityStr, seatType, pdfLink, imageUrl };
    })
    .filter(product => {
      const hcpcs = product.hcpcs.trim();
      const hcpcsNum = parseInt(hcpcs.replace(/\D/g, ''), 10) || 0;
      if (hcpcsNum === 0) return false;

      const seatCode = product.seatType.toLowerCase().trim();
      const isKnownSolid = inherentlySolidCodes.includes(hcpcs);
      const sheetSaysSolid = seatCode.includes('s');
      const offersSolid = isKnownSolid || sheetSaysSolid;
      const offersCaptain = seatCode.includes('c') && !isKnownSolid && !sheetSaysSolid;

      // ── Weight capacity (F9, cycle 16 — FAIL CLOSED) ────────────────────
      // `parseInt('')` is NaN and EVERY comparison against NaN is false, so a
      // blank / non-numeric / half-written capacity cell used to pass this
      // filter for ANY patient weight — the engine read it as unlimited
      // capacity. Measured against the exact branch: '', '   ', 'n/a', '300-'
      // and '-450' all admitted a 400 lb patient. The Offerings catalog is an
      // operator-maintained sheet (a new product row with the capacity not yet
      // filled in is ordinary), so the failure direction mattered: recommending
      // a chair that cannot carry the patient.
      //
      // A capacity we cannot READ is not a capacity we can honour. Excluding
      // the product matches the engine's own posture 40 lines above, where a
      // catalog missing K0821 returns NO recommendations rather than silently
      // dropping the mobile-home constraint. The complaint an agent gets is
      // "this chair stopped appearing", which points at the catalog; the
      // alternative complaint is a patient receiving unsuitable equipment.
      // `getIntakeCatalogIssues_` surfaces the offending rows so the operator
      // is not left guessing.
      if (patient.weight > 0) {
        const capRaw = product.weightCapacityStr.trim();
        if (capRaw.indexOf('-') >= 0) {
          const parts = capRaw.split('-');
          const minCap = parseInt(parts[0], 10);
          const maxCap = parseInt(parts[1], 10);
          if (!isFinite(minCap) || !isFinite(maxCap)) return false;   // unreadable range
          if (patient.weight < minCap) return false;
          if (patient.weight > maxCap) return false;
        } else {
          const maxCap = parseInt(capRaw, 10);
          if (!isFinite(maxCap)) return false;                        // unreadable cap
          if (patient.weight > maxCap) return false;
        }
      }

      const isGroup3 = hcpcsNum >= 848;
      const isMPO = (hcpcsNum >= 840 && hcpcsNum <= 843) || (hcpcsNum >= 861 && hcpcsNum <= 864);
      const isSPO = (hcpcsNum >= 835 && hcpcsNum <= 839) || (hcpcsNum >= 856 && hcpcsNum <= 859);

      const needsSolidSeat = patient.hasSpineCurvature || patient.hasPressureUlcers || patient.hasSpasticity ||
                             hasValidNeuroDiagnosis || qualifiesForHemiplegia || hasStrokeWeakness ||
                             patient.hasLowerExtremityNumbness || patient.usesCatheters || patient.hasAmputation;

      if (needsSolidSeat) { if (!offersSolid) return false; }
      else { if (!isGroup3 && !offersCaptain) return false; }

      if (patient.isOnOxygen && (hcpcs === 'K0837' || hcpcs === 'K0838')) return false;

      if (isGroup3 && !isNeuroEligible) return false;
      if (isMPO && !isMPOEligible) return false;
      if (isSPO && !isSPOEligible) return false;

      return true;
    });

  // --- SUBSTITUTION ---
  const substitutions = { 'K0856': 'K0861', 'K0838': 'K0837' };
  const processedMap = new Map();

  eligibleProducts.forEach(product => {
    let finalHcpcs = product.hcpcs.trim();
    let finalProduct = Object.assign({}, product);

    if (['K0841', 'K0842', 'K0843'].includes(finalHcpcs)) {
      if (isNeuroEligible) {
        if (finalHcpcs === 'K0843') finalHcpcs = 'K0862';
        else finalHcpcs = 'K0861';
        const targetDetails = allProducts.find(r => String(r[1]).trim() === finalHcpcs);
        if (targetDetails) {
          finalProduct.hcpcs = finalHcpcs;
          finalProduct.pdfLink = String(targetDetails[4] == null ? '' : targetDetails[4]);
          finalProduct.imageUrl = String(targetDetails[5] == null ? '' : targetDetails[5]);
        }
      }
    } else if (substitutions[finalHcpcs]) {
      const targetHcpcs = substitutions[finalHcpcs];
      const targetIsGroup3 = parseInt(targetHcpcs.replace(/\D/g, ''), 10) >= 848;
      const originalIsGroup2 = parseInt(finalHcpcs.replace(/\D/g, ''), 10) < 848;
      if (originalIsGroup2 && targetIsGroup3 && !isNeuroEligible) {
        finalHcpcs = product.hcpcs.trim();
      } else {
        finalHcpcs = targetHcpcs;
        const targetDetails = allProducts.find(r => String(r[1]).trim() === targetHcpcs);
        if (targetDetails) {
          finalProduct.hcpcs = finalHcpcs;
          finalProduct.pdfLink = String(targetDetails[4] == null ? '' : targetDetails[4]);
          finalProduct.imageUrl = String(targetDetails[5] == null ? '' : targetDetails[5]);
        }
      }
    }

    if (!processedMap.has(finalHcpcs)) processedMap.set(finalHcpcs, finalProduct);
  });

  // --- SORT & JUSTIFY ---
  const finalResults = Array.from(processedMap.values()).map(p => {
    const hcpcsNum = parseInt(p.hcpcs.replace(/\D/g, ''), 10) || 0;
    const isGroup3 = hcpcsNum >= 848;
    const isComplex = hcpcsNum >= 835;
    const isSPO = (hcpcsNum >= 835 && hcpcsNum <= 839) || (hcpcsNum >= 856 && hcpcsNum <= 859);

    const isKnownSolid = inherentlySolidCodes.includes(p.hcpcs);
    const seatCode = p.seatType.toLowerCase();
    const sheetSaysSolid = seatCode.includes('s');
    const offersSolid = isKnownSolid || sheetSaysSolid;
    const isCaptainOnly = seatCode.includes('c') && !offersSolid;

    let displayHcpcs = p.hcpcs;
    let justification = 'Eligible option';

    if (isGroup3) {
      const reasons = [];
      if (hasValidNeuroDiagnosis) reasons.push('Neuro Dx');
      if (patient.hasSpasticity) reasons.push('Spasticity');
      if (qualifiesForHemiplegia) reasons.push('Hemiplegia (' + hemiplegiaSide + ' Side)');
      if (patient.hasAmputation) reasons.push('Amputation');
      justification = 'Medically Necessary Upgrade due to: ' + reasons.join(', ');
    } else {
      const solidReasons = [];
      if (patient.hasPressureUlcers) solidReasons.push('Pressure Ulcers');
      if (patient.hasSpineCurvature) solidReasons.push('Spinal Curvature');
      if (patient.hasLowerExtremityNumbness) solidReasons.push('Impaired Sensation');
      if (patient.hasSpasticity) solidReasons.push('Spasticity');
      if (hasValidNeuroDiagnosis) solidReasons.push('Neuro Dx');
      if (hasStrokeWeakness && !qualifiesForHemiplegia) solidReasons.push('CVA/Stroke Weakness');
      if (patient.hasAmputation) solidReasons.push('Amputation (Center of Gravity/Pressure Relief)');
      if (patient.usesCatheters) solidReasons.push('Intermittent Catheterization');

      if (isSPO) {
        const spoReasons = [];
        if (patient.hasSwelling) spoReasons.push('Power Legs (Edema)');
        if (patient.hasPressureUlcers) spoReasons.push('Power Tilt (Pressure Relief)');
        if (patient.hasSpineCurvature || patient.hasAmputation || isNeuroEligible) spoReasons.push('Power Tilt (Positioning/Stability)');
        if (patient.usesCatheters) spoReasons.push('Power Tilt (Catheterization)');
        const spoText = spoReasons.length > 0 ? spoReasons.join(', ') : 'Power Accessory';
        justification = 'Indicated for: ' + spoText;
      }

      if (solidReasons.length > 0 && offersSolid) {
        if (justification === 'Eligible option') justification = '';
        else justification += ' | ';
        justification += 'Solid Seat indicated for: ' + solidReasons.join(', ');
      } else if (!isSPO && offersSolid) {
        if (justification === 'Eligible option') justification = 'Solid Seat';
        else justification += ' (Solid Seat)';
      } else if (isCaptainOnly && !isSPO) {
        justification = "Captain's Seat";
      }

      if (['K0841', 'K0842', 'K0843'].includes(p.hcpcs)) {
        const subTarget = (p.hcpcs === 'K0843') ? 'K0862' : 'K0861';
        displayHcpcs = p.hcpcs + ' (substitute ' + subTarget + ')';
        let reason = 'MPO';
        if (patient.usesCatheters) reason += ' (for Intermittent Cath)';
        justification = reason + ' - <span style="text-decoration: underline;">Provide <strong>' + subTarget + '</strong> as free upgrade</span>';
      }
      if (['K0800', 'K0801'].includes(p.hcpcs)) justification += ' | (if POV eligible)';
    }

    return {
      hcpcs: displayHcpcs,
      pdfLink: p.pdfLink,
      imageUrl: p.imageUrl,
      category: isComplex ? 'Complex' : 'Standard',
      sortOrder: hcpcsNum,
      justification: justification,
    };
  });

  finalResults.sort((a, b) => b.sortOrder - a.sortOrder);
  return {
    standard: finalResults.filter(p => p.category === 'Standard'),
    complex: finalResults.filter(p => p.category === 'Complex'),
  };
}
// ── Email body builders (all user fields esc_'d — INV-89 discipline) ──────
function intakeEmailShell_(title, innerHtml, subLabel) {
  // Chrome matched to buildBrandedEmailHtml_ (the 2026-08-11 restyle) so the
  // intake mail reads as the same product as the rest of the app's email: the
  // UMS mark ON THE CARD over a navy rule (logoUrl is a JPEG with no
  // transparency, so a navy band would frame a white rectangle), a right-
  // aligned mono module label, then the subject as a REAL heading rather than
  // an 18px line beside the logo.
  const P = CN_EMAIL_PALETTE;
  return (
    '<div style="margin:0;padding:0;background:' + P.paper + ';">' +
    '<div style="max-width:680px;margin:0 auto;padding:22px 12px;font-family:Arial,Helvetica,sans-serif;color:' + P.ink + ';">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + P.paperCard +
        ';border:1px solid ' + P.line + ';border-radius:12px;overflow:hidden;">' +
        '<tr><td style="padding:20px 26px 0;">' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
            // The alt text carries the identity when a client blocks remote
            // images, which most do by default.
            '<td style="padding-bottom:14px;border-bottom:2px solid ' + P.brand + ';vertical-align:bottom;' +
              'font-size:15px;font-weight:700;letter-spacing:.4px;color:' + P.brand + ';">' +
              '<img src="' + P.logoUrl + '" alt="UMS Team Tools" style="display:block;border:0;height:40px;width:auto;">' +
            '</td>' +
            '<td align="right" style="padding-bottom:14px;border-bottom:2px solid ' + P.brand + ';vertical-align:bottom;' +
              'font-family:\'Courier New\',monospace;font-size:9px;font-weight:700;letter-spacing:1.6px;' +
              'text-transform:uppercase;color:' + P.muted3 + ';">' + esc_(subLabel || 'Intake') + '</td>' +
          '</tr></table></td></tr>' +
        '<tr><td style="padding:18px 26px 0;font-size:22px;line-height:1.25;font-weight:700;' +
          'letter-spacing:-.01em;color:' + P.ink + ';">' + esc_(title) + '</td></tr>' +
        '<tr><td style="padding:12px 26px 0;"><div style="width:46px;height:3px;border-radius:2px;background:' + P.brand + ';"></div></td></tr>' +
        '<tr><td style="padding:16px 26px 6px;">' + innerHtml + '</td></tr>' +
        '<tr><td style="padding:0 26px 20px;"><div style="border-top:1px solid ' + P.line +
          ';padding-top:14px;font-family:\'Courier New\',monospace;font-size:10px;letter-spacing:1px;' +
          'text-transform:uppercase;color:' + P.muted3 + ';">UMS Team Tools &middot; Intake</div></td></tr>' +
      '</table>' +
    '</div></div>'
  );
}
/** The section band shared by the PPD and account bodies. The app's table
 *  vocabulary is a mono uppercase header on a tint with a rule under it — not
 *  a solid navy bar with centred white text, which is the one piece of the
 *  pre-web-app look that most made these mails read as a different product. */
function intakeSectionRowHtml_(label) {
  const P = CN_EMAIL_PALETTE;
  return '<tr><td colspan="2" style="height:18px;"></td></tr>' +
    '<tr><td colspan="2" style="padding:7px 10px;background:' + P.navyTint +
      ';border-bottom:2px solid ' + P.brand + ';font-family:\'Courier New\',monospace;font-size:10px;' +
      'font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:' + P.brand + ';">' + label + '</td></tr>';
}
function intakePpdAnswerStyles_() {
  // 2nd-pass email_styling.md: map the questionnaire answer chips onto the
  // shared palette (Yes=green, No=red, severity=amber, None=muted).
  const P = CN_EMAIL_PALETTE;
  return {
    green:  'background-color:' + P.accentSoft + ';color:' + P.accentDeep + ';border:1px solid ' + P.accentBorder + ';font-weight:bold;border-radius:4px;padding:4px 8px;display:inline-block;',
    red:    'background-color:' + P.dangerSoft + ';color:' + P.dangerDeep + ';border:1px solid ' + P.dangerBorder + ';font-weight:bold;border-radius:4px;padding:4px 8px;display:inline-block;',
    gray:   'background-color:' + P.paper + ';color:' + P.muted2 + ';border:1px solid ' + P.line + ';border-radius:4px;padding:4px 8px;display:inline-block;',
    yellow: 'background-color:' + P.warnSoft + ';color:' + P.warnDeep + ';border:1px solid ' + P.warnBorder + ';font-weight:bold;border-radius:4px;padding:4px 8px;display:inline-block;',
  };
}
/** F-27 (2026-09-18): the PPD email rows, built SERVER-SIDE from the English
 *  bank and the client's ANSWERS map — the same walk as the client's
 *  `intakeCollectPpd_`, so the row order, headers, secondary flags and the
 *  notes pseudo-question are the bank's; the client's `rows[].label` is never
 *  read. `answers` keys are question numbers ('1', '31a', 'notes'). PURE. */
function intakePpdRowsEn_(answers) {
  const a = answers || {};
  const rows = [];
  for (let i = 1; i < INTAKE_PPD_Q_EN.length; i++) {
    const raw = INTAKE_PPD_Q_EN[i];
    if (!raw || !String(raw).trim()) continue;
    const isSecondary = /^\s+/.test(raw);
    const text = String(raw).trim();
    const m = text.match(/^(\d+[a-z]?)\./);
    if (!m) { rows.push({ isHeader: true, label: text }); continue; }
    const qNum = m[1];
    const v = a[qNum];
    rows.push({ qNum: qNum, label: text, value: (v == null ? '' : String(v)), isSecondary: isSecondary });
  }
  rows.push({ isHeader: true, label: INTAKE_PPD_NOTES_EN.title });
  const nv = a.notes;
  rows.push({ qNum: 'notes', label: INTAKE_PPD_NOTES_EN.label, value: (nv == null ? '' : String(nv)), isSecondary: false });
  return rows;
}
/** F-27: the PPD label for one question number, from the bank (amend banners). */
function intakePpdLabelEn_(qNum) {
  const rows = intakePpdRowsEn_({});
  for (let i = 0; i < rows.length; i++) if (rows[i].qNum === String(qNum)) return rows[i].label;
  return '';
}
/** F-27: the account-form rows (PMD / PAP), built from the English bank and the
 *  client's ANSWERS map keyed by form index — the client's `intakeCollectAcct_`
 *  walk. Headers come from the server layout (1-based HEADER_ROWS). PURE. */
function intakeAcctRowsEn_(formType, answers) {
  const qs = formType === 'PAP' ? INTAKE_PAP_Q_EN : INTAKE_PMD_Q_EN;
  const layout = formType === 'PAP' ? INTAKE_PAP_LAYOUT : INTAKE_PMD_LAYOUT;
  const a = answers || {};
  const rows = [];
  for (let i = 0; i < qs.length; i++) {
    const label = String(qs[i] || '');
    if (layout.HEADER_ROWS.indexOf(i + 1) >= 0) { rows.push({ qIndex: i, label: label, isHeader: true }); continue; }
    const v = a[i] != null ? a[i] : a[String(i)];
    rows.push({ qIndex: i, label: label, value: (v == null ? '' : String(v)),
                isSecondary: layout.SECONDARY_QUESTION_ROWS.indexOf(i + 1) >= 0 });
  }
  return rows;
}
// rows: [{ qNum, label, value, isHeader, isSecondary }] — from intakePpdRowsEn_ (F-27)
function intakeBuildPpdBodyHtml_(patientInfo, rows, recData, selections) {
  const P = CN_EMAIL_PALETTE;
  const s = intakePpdAnswerStyles_();
  let html = '<table style="border-collapse:collapse;width:100%;font-size:14px;">';
  let fieldIdx = 0;
  (rows || []).forEach(function (r) {
    const label = esc_(r.label || '');
    if (r.isHeader) { html += intakeSectionRowHtml_(label); return; }
    const answerRaw = String(r.value == null ? '' : r.value);
    const qNum = String(r.qNum || '');
    let displayAnswer;
    if (!answerRaw) {
      displayAnswer = '<span style="color:' + P.muted3 + ';font-style:italic;font-weight:normal;">N/A</span>';
    } else {
      const escAns = esc_(answerRaw);
      const lower = answerRaw.toLowerCase();
      if (qNum && INTAKE_PPD_YESNO_QS.indexOf(qNum) >= 0) {
        displayAnswer = '<div style="' + (lower.indexOf('no') >= 0 ? s.red : s.green) + '">' + escAns + '</div>';
      } else if (qNum === '34') {
        displayAnswer = '<div style="' + (lower.indexOf('no') >= 0 ? s.gray : s.yellow) + '">' + escAns + '</div>';
      } else if (qNum === '25' || qNum === '31a') {
        if (lower.indexOf('no') >= 0 && lower.indexOf('weakness') < 0 && lower.indexOf('paralysis') < 0 && lower.indexOf('feet') < 0 && lower.indexOf('hands') < 0) {
          displayAnswer = '<div style="' + s.gray + '">' + escAns + '</div>';
        } else {
          displayAnswer = answerRaw.split(',').map(function (part) { return '<span style="' + s.yellow + ' margin:2px;">' + esc_(part.trim()) + '</span>'; }).join(' ');
        }
      } else {
        displayAnswer = escAns;
      }
    }
    const qStyle = r.isSecondary
      ? 'font-weight:normal;font-style:italic;color:' + P.muted2 + ';padding-left:24px;'
      : 'font-weight:600;color:' + P.ink + ';';
    // Hairline row separators and a very quiet zebra — the app's ledger table
    // vocabulary. The old bordered grid with a strong blue zebra was the other
    // half of the pre-web-app look.
    const bg = (fieldIdx % 2 === 0) ? P.paperCard : P.paper;
    fieldIdx++;
    html += '<tr style="background:' + bg + ';">' +
      '<td style="padding:9px 10px;border-bottom:1px solid ' + P.line + ';width:56%;vertical-align:top;' + qStyle + '">' + label + '</td>' +
      '<td style="padding:9px 10px;border-bottom:1px solid ' + P.line + ';vertical-align:top;font-weight:700;">' + displayAnswer + '</td></tr>';
  });

  // --- Recommendations ---
  html += intakeSectionRowHtml_('Recommended HCPCS') +
    '<tr><td colspan="2" style="padding:12px 0 0;">';
  const hasComplex = recData && recData.complex && recData.complex.length > 0;
  const hasStandard = recData && recData.standard && recData.standard.length > 0;
  if (!hasComplex && !hasStandard) {
    html += '<p style="color:' + P.muted2 + ';font-style:italic;">No products matched all criteria based on the provided answers.</p>';
  } else {
    if (hasComplex) {
      html += '<h4 style="margin-bottom:5px;color:' + P.brand + ';">Complex Rehab</h4>' + intakeRecListHtml_(recData.complex, selections);
    }
    if (hasStandard) {
      if (hasComplex) html += '<div style="height:20px;"></div>';
      html += '<h4 style="margin-bottom:5px;color:' + P.brand + ';">Standard Powerchair</h4>' + intakeRecListHtml_(recData.standard, selections);
    }
  }
  html += '</td></tr></table>';
  return html;
}
// selections: { itemId: { status:'accepted'|'rejected'|'undecided'|'none', preferred:bool } }
// justification is server-generated (trusted) and intentionally carries inline
// markup, so it is injected raw; hcpcs / links / images are esc_'d.
/** Offerings URL scheme whitelist — the SERVER twin of the client
 *  intakeHttpOnly_ (intake/script_intake.html). esc_ prevents attribute
 *  breakout, but a `javascript:` URL typed into the operator-owned Offerings
 *  sheet (cols E/F) would still ship as a LIVE href/src — and this builder's
 *  output is injected into the preview modal via innerHTML
 *  (script_intake.html .intk-prev), where clicking it executes in the rep's
 *  session. The client rec cards (cycle-9 L-19) and the Catalog tab (batch 8)
 *  have carried this exact guard for the same two columns; the server sink was
 *  the one left open (seams-18 F1). Returns the raw trimmed URL or '' — the
 *  sinks keep their esc_. The regex is pinned byte-identical to the client
 *  twin, so the two boundaries cannot drift apart again. */
function intakeHttpOnly_(u) {
  u = String(u == null ? '' : u).trim();
  return /^https?:\/\//i.test(u) ? u : '';
}
function intakeRecListHtml_(items, selections) {
  selections = selections || {};
  const P = CN_EMAIL_PALETTE;
  // 2nd-pass email_styling.md: each product is a 2-cell TABLE row (image cell +
  // content cell) — NOT a flex <li> with filter:grayscale, both of which Outlook
  // drops. Rejected rows grey explicitly (bg + muted text), no filter.
  let out = '<table style="width:100%;border-collapse:collapse;font-size:14px;">';
  (items || []).forEach(function (product) {
    const itemId = String(product.hcpcs).replace(/\s+/g, '-');
    const pdfUrl = intakeHttpOnly_(product.pdfLink);   // seams-18 F1 — scheme-whitelist BEFORE the href/src
    const imgUrl = intakeHttpOnly_(product.imageUrl);
    const sel = selections[itemId] || {};
    const status = sel.status || 'none';
    const isPreferred = !!sel.preferred;
    const rejected = status === 'rejected';
    const rowBg = rejected ? P.paper : P.paperCard;
    const textColor = rejected ? P.muted3 : P.ink;

    let badge;
    if (status === 'accepted')       badge = '<span style="background:' + P.accentSoft + ';color:' + P.accentDeep + ';border:1px solid ' + P.accentBorder + ';padding:2px 6px;border-radius:4px;font-size:12px;">&#10004; Accepted</span>';
    else if (status === 'rejected')  badge = '<span style="background:' + P.dangerSoft + ';color:' + P.dangerDeep + ';border:1px solid ' + P.dangerBorder + ';padding:2px 6px;border-radius:4px;font-size:12px;">&#10008; Rejected</span>';
    else if (status === 'undecided') badge = '<span style="background:' + P.warnSoft + ';color:' + P.warnDeep + ';border:1px solid ' + P.warnBorder + ';padding:2px 6px;border-radius:4px;font-size:12px;">&#129300; Undecided/Maybe</span>';
    else                             badge = '<span style="background:' + P.paper + ';color:' + P.muted2 + ';border:1px solid ' + P.line + ';padding:2px 6px;border-radius:4px;font-size:12px;">Unconfirmed</span>';

    const star = isPreferred
      ? '<span style="font-size:20px;color:' + P.star + ';line-height:1;vertical-align:middle;">&#9733;</span> '
      : '';
    const title = pdfUrl
      ? '<a href="' + esc_(pdfUrl) + '" target="_blank" style="text-decoration:none;color:' + P.info + ';">' + esc_(product.hcpcs) + '</a>'
      : esc_(product.hcpcs);

    const imgCell = imgUrl
      ? '<td style="width:110px;padding:10px;border-bottom:1px solid ' + P.line + ';vertical-align:top;background:' + rowBg + ';"><img src="' + esc_(imgUrl) + (imgUrl.indexOf('?') >= 0 ? '&v=' : '?v=') + esc_(product.hcpcs) + '" alt="' + esc_(product.hcpcs) + '" style="width:100px;height:auto;border:1px solid ' + P.line + ';display:block;"></td>'
      : '<td style="width:1px;padding:0;border-bottom:1px solid ' + P.line + ';background:' + rowBg + ';"></td>';

    // justification is server-generated (trusted) + carries inline markup, so
    // it is injected RAW (INV-89 exception); hcpcs / links / images are esc_'d.
    out += '<tr>' + imgCell +
      '<td style="padding:10px;border-bottom:1px solid ' + P.line + ';vertical-align:top;background:' + rowBg + ';color:' + textColor + ';">' +
        '<table style="width:100%;border-collapse:collapse;"><tr>' +
          '<td style="font-weight:bold;font-size:16px;vertical-align:middle;">' + star + '<span>' + title + '</span></td>' +
          '<td style="text-align:right;vertical-align:middle;white-space:nowrap;">' + badge + '</td>' +
        '</tr></table>' +
        '<div style="color:' + (rejected ? P.muted3 : P.muted2) + ';margin-top:6px;">' + (product.justification || 'Eligible match.') + '</div>' +
      '</td>' +
    '</tr>';
  });
  out += '</table>';
  return out;
}
// rows: [{ qIndex, label, value, isHeader, isSecondary }] — account-creation forms.
// layout: INTAKE_PMD_LAYOUT | INTAKE_PAP_LAYOUT (server-held structural rules).
function intakeBuildAcctBodyHtml_(rows, layout) {
  const P = CN_EMAIL_PALETTE;
  let html = '<table style="border-collapse:collapse;width:100%;font-size:14px;">';
  let fieldIdx = 0;
  (rows || []).forEach(function (r) {
    const i = Number(r.qIndex);
    const label = esc_(r.label || '');
    const answerRaw = String(r.value == null ? '' : r.value);
    const isHeader = layout.HEADER_ROWS.indexOf(i + 1) >= 0;

    if (isHeader) {
      html += intakeSectionRowHtml_(label);
      return;
    }

    let displayAnswer;
    const cond = layout.CONDITIONAL_FORMATTING_ROWS[i];
    if (cond && cond[answerRaw]) {
      const rule = cond[answerRaw];
      displayAnswer = '<div style="background-color:' + rule.bg + ';color:' + rule.fg + ';border:1px solid ' + rule.bg + ';border-radius:4px;padding:5px 8px;font-weight:bold;display:inline-block;">' + esc_(answerRaw) + '</div>';
    } else if (layout.CHECKBOX_ROWS.indexOf(i) >= 0) {
      const checkColor = layout.CHECKBOX_WARN_ROWS.indexOf(i) >= 0 ? P.warn : P.accent;
      displayAnswer = (answerRaw === 'TRUE')
        ? '<div style="width:16px;height:16px;border:1px solid ' + P.muted2 + ';background-color:' + P.paperCard + ';text-align:center;line-height:16px;font-weight:bold;color:' + checkColor + ';display:inline-block;">&#10003;</div>'
        : '<div style="width:16px;height:16px;border:1px solid ' + P.line + ';background-color:' + P.paper + ';display:inline-block;"></div>';
    } else {
      displayAnswer = !answerRaw ? '<span style="color:' + P.muted3 + ';font-style:italic;">N/A</span>' : esc_(answerRaw);
    }

    const qStyle = layout.SECONDARY_QUESTION_ROWS.indexOf(i) >= 0
      ? 'font-weight:normal;font-style:italic;color:' + P.muted2 + ';padding-left:24px;'
      : 'font-weight:600;color:' + P.ink + ';';
    // Same ledger vocabulary as the PPD body — hairline separators and a quiet
    // zebra — so the three intake mails do not diverge halfway.
    const bg = (fieldIdx % 2 === 0) ? P.paperCard : P.paper;
    fieldIdx++;
    html += '<tr style="background:' + bg + ';">' +
      '<td style="padding:9px 10px;border-bottom:1px solid ' + P.line + ';width:56%;vertical-align:top;' + qStyle + '">' + label + '</td>' +
      '<td style="padding:9px 10px;border-bottom:1px solid ' + P.line + ';vertical-align:top;">' + displayAnswer + '</td></tr>';
  });
  html += '</table>';
  return html;
}
// SHA-256 over the body+subject — guards the patient answers between Preview
// and Send (the rep may edit the form in between). Mirrors INV-41.
function intakeBodyHash_(html, subject) { return computeCnEmailHash_(html, subject, ''); }
function intakeDecodeImages_(images) {
  const inlineImagesObj = {};
  let sectionHtml = '';
  if (!images || !images.length) return { inlineImagesObj: inlineImagesObj, sectionHtml: '' };
  const capped = images.slice(0, CONFIG.INTAKE.MAX_IMAGES);
  sectionHtml = '<div style="margin-top:20px;border-top:2px dashed ' + CN_EMAIL_PALETTE.line + ';padding-top:20px;text-align:center;"><h3 style="color:' + CN_EMAIL_PALETTE.brand + ';">Attached Images</h3>';
  capped.forEach(function (b64, index) {
    const str = String(b64 || '');
    if (str.length > CONFIG.INTAKE.MAX_IMAGE_CHARS) throw new Error('An attached image is too large (max ~5MB each).');
    if (str.indexOf('data:') !== 0 || str.indexOf(',') < 0) return;
    const cid = 'attachedImage' + index;
    // Parse the data URL robustly: data:[<mediatype>][;base64],<payload>.
    // The mediatype runs from after 'data:' to the first ','; a naive
    // substring(5, indexOf(';')) yields a garbage type (or "data:") when the
    // URL has no ';' marker — and Utilities.base64Decode then throws on a
    // non-base64 payload. We only inline base64 data URLs (what the client
    // sends); anything else is skipped rather than crashing the whole send.
    const comma = str.indexOf(',');
    const meta = str.substring(5, comma);            // between 'data:' and ','
    if (!/;base64$/i.test(meta)) return;             // not a base64 data URL — skip
    const contentType = meta.replace(/;base64$/i, '') || 'application/octet-stream';
    const data = str.substring(comma + 1);
    const blob = Utilities.newBlob(Utilities.base64Decode(data), contentType, cid);
    inlineImagesObj[cid] = blob;
    sectionHtml += '<img src="cid:' + cid + '" style="max-width:100%;border:1px solid ' + CN_EMAIL_PALETTE.line + ';border-radius:4px;margin-bottom:20px;display:block;margin-left:auto;margin-right:auto;" />';
  });
  sectionHtml += '</div>';
  return { inlineImagesObj: inlineImagesObj, sectionHtml: sectionHtml };
}

// ════════════════════════════════════════════════════════════════════════════
//  INTAKE ENDPOINTS  (two-stage: preview → send; all require an enrolled rep)
// ════════════════════════════════════════════════════════════════════════════

// ── PPD ──
// ── Amend & re-send (operator 2026-08-25 — batch 4) ─────────────────────────
// The submission tabs are APPEND-ONLY (the §164.312(c) discipline shared with
// FormSubmissions) — an amendment is a NEW submission row linked to the
// original via the trailing AmendsId column; the original row is never
// touched. Both the USER and the RECIPIENT always see it is an amendment:
// the subject gains an "AMENDED: " prefix and the email opens with a banner
// naming the original send date + the changed fields (both applied AFTER the
// INV-41 hash check, the feedbackCta/drResolveCta placement, so the
// preview-hash contract over the BASE body/subject is untouched).
/** Pure (Node-pinned): the answer keys whose trimmed values differ. Union of
 *  keys, insertion-ordered old→new. An EMPTY diff means a re-send — the
 *  banner says so instead of implying content changed. */
function intakeAmendDiff_(oldAnswers, newAnswers) {
  const a = oldAnswers || {}, b = newAnswers || {};
  const keys = Object.keys(a);
  Object.keys(b).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
  return keys.filter(function (k) {
    return String(a[k] == null ? '' : a[k]).trim() !== String(b[k] == null ? '' : b[k]).trim();
  });
}
/** The amendment banner (email-safe: table/inline styles only — no flex). */
function intakeAmendBannerHtml_(sentTs, changedLabels) {
  const P = CN_EMAIL_PALETTE;
  const what = (changedLabels && changedLabels.length)
    ? 'Changed: ' + changedLabels.slice(0, 8).map(function (l) { return esc_(l); }).join('; ') +
      (changedLabels.length > 8 ? '; and ' + (changedLabels.length - 8) + ' more' : '')
    : 'Content unchanged — this is a re-send of the original.';
  return '<table style="border-collapse:collapse;width:100%;margin-bottom:14px;"><tr>' +
    '<td style="background:' + P.warnSoft + ';border:1px solid ' + P.warnBorder + ';border-radius:6px;padding:10px 14px;">' +
      '<div style="font-weight:700;color:' + P.brand + ';">AMENDED SUBMISSION</div>' +
      '<div style="font-size:13px;color:' + P.muted2 + ';margin-top:2px;">Supersedes the version sent ' + esc_(sentTs) + '. ' + what + '</div>' +
    '</td></tr></table>';
}
/** Locate + validate the amendment source: must exist for this form type and
 *  belong to the CALLER (owner-only — an amendment sends under the sender's
 *  name; the IntakeFeedback forged-id rule applied to a write). Bounded
 *  id-column scan. Returns { ts, answers } or null. */
function intakeAmendSource_(ft, amendsId, emp) {
  const id = String(amendsId || '').trim();
  if (!id) return null;
  const sheet = getIntakeSubmissionSheet_(ft);
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const isPpd = ft === 'PPD';
  const width = isPpd ? INTAKE_PPD_SUB_HEADERS.length : INTAKE_ACCT_SUB_HEADERS.length;
  const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() !== id) continue;
    const row = sheet.getRange(i + 2, 1, 1, width).getValues()[0];
    if (String(row[2] || '').trim() !== emp.id) return null;   // owner-only
    let answers = {};
    try { answers = JSON.parse(isPpd ? row[6] : row[7]) || {}; } catch (e) {}
    return { ts: intakeTsString_(row[1]), answers: answers };
  }
  return null;
}
function intakePreviewPPD(payload) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    payload = payload || {};
    const patientInfo = String(payload.patientInfo || '').trim();
    if (!patientInfo) return { error: 'Enter the Patient Name & Trx# before previewing.' };
    const recData = intakeFilterRecommendations_(payload.answers || {}, getIntakeOfferings_());
    const subject = 'PPD for ' + patientInfo;
    const body = intakeBuildPpdBodyHtml_(patientInfo, intakePpdRowsEn_(payload.answers), recData, null);   // F-27: labels from the bank, never the client
    const html = intakeEmailShell_(subject, body, 'Intake · PPD');
    return { success: true, html: html, subject: subject, recommendations: recData, bodyHash: intakeBodyHash_(body, subject) };
  } catch (err) { return { error: err.message }; }
}
function intakeStoreOversizeError_(cellStrings) {
  for (let i = 0; i < cellStrings.length; i++) {
    if (String(cellStrings[i] || '').length > INTAKE_STORE_CELL_MAX) {
      return 'This submission is too large to store (a field exceeds the ' +
        'spreadsheet cell limit). Trim any very long pasted text and try again.';
    }
  }
  return null;
}
function intakeStoreFailWarn_(emp, formType, submissionId, err) {
  const msg = String((err && err.message) || err || 'unknown').substring(0, 300);
  console.warn('intake ' + formType + ' submission store failed: ' + msg);
  try {
    writeAuditLog_(emp, 'IntakeStoreFail', fmtDate_(new Date()), '', false, 0,
      'type=' + formType + '; submissionId=' + submissionId + '; err=' + msg, emp.email);
  } catch (e) { console.warn('IntakeStoreFail audit write failed: ' + e.message); }
  return 'Email sent, but the submission record could NOT be saved (' + msg + '). ' +
    'The Sent tab will not show this submission — tell your manager.';
}
function intakeSendPPD(payload, recipientSpec, expectedBodyHash) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Not authorized.' };
    payload = payload || {};
    const patientInfo = String(payload.patientInfo || '').trim();
    if (!patientInfo) return { success: false, error: 'Patient Name & Trx# is required.' };

    const recData = intakeFilterRecommendations_(payload.answers || {}, getIntakeOfferings_());
    const subject = 'PPD for ' + patientInfo;
    // Re-build WITHOUT selections to verify the patient answers haven't drifted.
    const ppdRows = intakePpdRowsEn_(payload.answers);   // F-27
    const baseBody = intakeBuildPpdBodyHtml_(patientInfo, ppdRows, recData, null);
    // The hash is REQUIRED (L2 — parity with emailFromCallNote/INV-41): a
    // direct RPC without it must not bypass the preview gate.
    if (!expectedBodyHash) {
      return { success: false, error: 'Missing preview hash — open Preview and send from there.' };
    }
    if (intakeBodyHash_(baseBody, subject) !== expectedBodyHash) {
      return { success: false, error: 'The form changed since you previewed it. Please preview again before sending.' };
    }
    const recipient = intakeResolveRecipient_('PPD', recipientSpec);
    // Amend & re-send (operator 2026-08-25): validate the source BEFORE the
    // send — a bad/foreign id fails the whole send rather than silently
    // sending an unmarked amendment.
    const amendId = String(payload.amendsSubmissionId || '').trim();
    let amendSrc = null;
    if (amendId) {
      amendSrc = intakeAmendSource_('PPD', amendId, emp);
      if (!amendSrc) return { success: false, error: 'The submission being amended was not found (or is not yours).' };
    }
    // The submission id is minted BEFORE the send so the feedback button can
    // reference it; the CTA + the amendment banner/prefix ride the FINAL body
    // only (post-hash-check — the drResolveCtaHtml_ pattern), so the INV-41
    // preview contract, which covers the BASE body + subject, is untouched.
    const submissionId = Utilities.getUuid();
    let amendBanner = '', sendSubject = subject;
    if (amendSrc) {
      const changedKeys = intakeAmendDiff_(amendSrc.answers, payload.answers || {});
      const amendLabels = changedKeys.map(function (k) { const lbl = intakePpdLabelEn_(k); return lbl || ('Q' + k); });   // F-27: the bank's labels
      amendBanner = intakeAmendBannerHtml_(amendSrc.ts, amendLabels);
      sendSubject = 'AMENDED: ' + subject;
    }
    const finalBody = amendBanner + intakeBuildPpdBodyHtml_(patientInfo, ppdRows, recData, payload.selections || {})
      + intakeFeedbackCta_(submissionId, 'PPD');
    const html = intakeEmailShell_(sendSubject, finalBody, 'Intake · PPD');

    // M-5 (cycle 10): size-bound the PHI store cells BEFORE the send (INV-96
    // spirit — the public form path has had these caps since the hardening
    // pass; this authenticated path had none). Rejecting pre-send means we
    // never email a submission we can't record.
    const answersJson = JSON.stringify(payload.answers || {});
    const recJson = JSON.stringify(recData);
    const selJson = JSON.stringify(payload.selections || {});
    const oversize = intakeStoreOversizeError_([answersJson, recJson, selJson]);
    if (oversize) return { success: false, error: oversize };

    sendRepEmail_(emp, { to: recipient, bcc: getIntakeBccEmail_(), subject: sendSubject, htmlBody: html });   // Round-1 #8

    let storeWarning = null;
    try {
      getIntakeSubmissionSheet_('PPD').appendRow([
        submissionId, fmtDate_(new Date()) + ' ' + fmtTime_(new Date()), emp.id, emp.name,
        patientInfo, String(payload.language || 'EN'),
        answersJson, recJson, selJson, recipient, amendId,
      ]);
    } catch (e) { storeWarning = intakeStoreFailWarn_(emp, 'PPD', submissionId, e); }

    writeAuditLog_(emp, 'IntakeSent', fmtDate_(new Date()), '', false, 0,
      'type=PPD; submissionId=' + submissionId + '; recipientDomain=' + intakeEmailDomain_(recipient) +
      (amendId ? '; amends=' + amendId : ''), emp.email);

    return { success: true, recipient: recipient, submissionId: submissionId, storeWarning: storeWarning };
  } catch (err) { return { success: false, error: err.message }; }
}
// ── PMD / PAP account creation (shared shape) ──
function intakePreviewAcct_(formType, payload) {
  const emp = getEmployeeInfo_();
  if (!emp) return { error: 'Not authorized.' };
  payload = payload || {};
  const patientInfo = String(payload.patientInfo || '').trim();
  if (!patientInfo) return { error: 'Enter the Patient Name before previewing.' };
  const dob = String(payload.dob || '').trim();
  const layout = formType === 'PAP' ? INTAKE_PAP_LAYOUT : INTAKE_PMD_LAYOUT;
  const subject = (formType === 'PAP' ? 'PAP' : 'PMD') + ' Account Creation for ' + patientInfo + (dob ? ' ' + dob : '');
  const body = intakeBuildAcctBodyHtml_(intakeAcctRowsEn_(formType, payload.answers), layout);   // F-27
  const html = intakeEmailShell_(subject, body, 'Intake · ' + (formType === 'PAP' ? 'PAP' : 'PMD'));
  return { success: true, html: html, subject: subject, bodyHash: intakeBodyHash_(body, subject) };
}
function intakeSendAcct_(formType, payload, recipientSpec, images, expectedBodyHash) {
  const emp = getEmployeeInfo_();
  if (!emp) return { success: false, error: 'Not authorized.' };
  payload = payload || {};
  const patientInfo = String(payload.patientInfo || '').trim();
  if (!patientInfo) return { success: false, error: 'Patient Name is required.' };
  const dob = String(payload.dob || '').trim();
  const layout = formType === 'PAP' ? INTAKE_PAP_LAYOUT : INTAKE_PMD_LAYOUT;
  const subject = (formType === 'PAP' ? 'PAP' : 'PMD') + ' Account Creation for ' + patientInfo + (dob ? ' ' + dob : '');

  const acctRows = intakeAcctRowsEn_(formType, payload.answers);   // F-27
  const body = intakeBuildAcctBodyHtml_(acctRows, layout);
  // Hash REQUIRED (L2) — same preview-gate parity as intakeSendPPD.
  if (!expectedBodyHash) {
    return { success: false, error: 'Missing preview hash — open Preview and send from there.' };
  }
  if (intakeBodyHash_(body, subject) !== expectedBodyHash) {
    return { success: false, error: 'The form changed since you previewed it. Please preview again before sending.' };
  }
  const recipient = intakeResolveRecipient_(formType, recipientSpec);

  // Amend & re-send (operator 2026-08-25) — see intakeSendPPD; validated
  // before the send, applied post-hash.
  const amendId = String(payload.amendsSubmissionId || '').trim();
  let amendSrc = null;
  if (amendId) {
    amendSrc = intakeAmendSource_(formType, amendId, emp);
    if (!amendSrc) return { success: false, error: 'The submission being amended was not found (or is not yours).' };
  }
  let sendSubject = subject, amendBanner = '';
  if (amendSrc) {
    const changedKeys = intakeAmendDiff_(amendSrc.answers, payload.answers || {});
    const labelByKey = {};
    acctRows.forEach(function (r) { if (r.qIndex != null && !r.isHeader) labelByKey[r.qIndex] = r.label || String(r.qIndex); });   // F-27: the bank's labels
    amendBanner = intakeAmendBannerHtml_(amendSrc.ts, changedKeys.map(function (k) { return labelByKey[k] || ('#' + k); }));
    sendSubject = 'AMENDED: ' + subject;
  }

  // Images ride at send only (not part of the preview hash). Append the image
  // section to the inner body, then wrap — no brittle string surgery.
  let innerBody = amendBanner + body;
  let inlineImagesObj = {};
  const imgCount = (images && images.length) ? Math.min(images.length, CONFIG.INTAKE.MAX_IMAGES) : 0;
  if (imgCount > 0) {
    const decoded = intakeDecodeImages_(images);
    inlineImagesObj = decoded.inlineImagesObj;
    innerBody += decoded.sectionHtml;
  }
  // Feedback CTA: id minted pre-send (see intakeSendPPD); the acct forms have
  // no preview-hash over the inner body sections the CTA joins, but the same
  // final-body-only placement keeps the two send paths uniform.
  const submissionId = Utilities.getUuid();
  const htmlBody = intakeEmailShell_(sendSubject, innerBody + intakeFeedbackCta_(submissionId, formType),
    'Intake · ' + (formType === 'PAP' ? 'PAP' : 'PMD'));

  // M-5 (cycle 10): size-bound the PHI store cell BEFORE the send (INV-96
  // spirit) — never email a submission we can't record.
  const answersJson = JSON.stringify(payload.answers || {});
  const oversize = intakeStoreOversizeError_([answersJson]);
  if (oversize) return { success: false, error: oversize };

  sendRepEmail_(emp, { to: recipient, bcc: getIntakeBccEmail_(), subject: sendSubject, htmlBody: htmlBody, inlineImages: inlineImagesObj });   // Round-1 #8

  let storeWarning = null;
  try {
    getIntakeSubmissionSheet_(formType).appendRow([
      submissionId, fmtDate_(new Date()) + ' ' + fmtTime_(new Date()), emp.id, emp.name,
      patientInfo, dob, String(payload.language || 'EN'),
      answersJson, recipient, imgCount, amendId,
    ]);
  } catch (e) { storeWarning = intakeStoreFailWarn_(emp, formType, submissionId, e); }

  writeAuditLog_(emp, 'IntakeSent', fmtDate_(new Date()), '', false, 0,
    'type=' + formType + '; submissionId=' + submissionId + '; recipientDomain=' + intakeEmailDomain_(recipient) + '; images=' + imgCount +
    (amendId ? '; amends=' + amendId : ''), emp.email);

  return { success: true, recipient: recipient, submissionId: submissionId, storeWarning: storeWarning };
}
function intakePreviewPMD(payload) { try { return intakePreviewAcct_('PMD', payload); } catch (e) { return { error: e.message }; } }
function intakeSendPMD(payload, recipientSpec, images, expectedBodyHash) { try { return intakeSendAcct_('PMD', payload, recipientSpec, images, expectedBodyHash); } catch (e) { return { success: false, error: e.message }; } }
function intakePreviewPAP(payload) { try { return intakePreviewAcct_('PAP', payload); } catch (e) { return { error: e.message }; } }
function intakeSendPAP(payload, recipientSpec, images, expectedBodyHash) { try { return intakeSendAcct_('PAP', payload, recipientSpec, images, expectedBodyHash); } catch (e) { return { success: false, error: e.message }; } }
function intakeEmailDomain_(email) {
  const at = String(email || '').indexOf('@');
  return at >= 0 ? String(email).substring(at + 1).toLowerCase() : '(none)';
}

// ── Intake submissions viewer (P15) ─────────────────────────────────────────
// In-app review of sent PPD / PMD / PAP submissions, replacing "open the PHI
// spreadsheet". Caller-scoped: a rep sees only rows they authored; a manager
// sees everyone's (parallels the Sent Forms / managerGetFormSubmission model).
// Read-only — the submission tabs stay append-only.
/** Timestamp cells ("yyyy-MM-dd HH:mm:ss") are Sheets-coerced to Dates on
 *  read — recover them in the INTAKE spreadsheet's OWN tz (the tz that did
 *  the coercing), like every sibling helper (kbCellTs_/trainCellTs_/
 *  cnTimestampString_). F(cycle-8): this used CONFIG.TIMEZONE, which is only
 *  equivalent while the Intake sheet's tz matches CONFIG — the exact drift
 *  Storage Health warns about; under drift the Sent-tab timestamps + the
 *  ACCT dob shifted by the offset. Falls back to CONFIG.TIMEZONE if the
 *  spreadsheet is unreachable (the caller is already reading from it, so
 *  that path is theoretical). */
function intakeTsString_(v) {
  if (!(v instanceof Date)) return String(v == null ? '' : v);
  let tz = CONFIG.TIMEZONE;
  try { tz = getIntakeSS_().getSpreadsheetTimeZone() || tz; } catch (e) {}
  return Utilities.formatDate(v, tz, 'yyyy-MM-dd HH:mm:ss');
}
/** Metadata-only list across all three submission tabs, newest-first, capped
 *  at INTAKE_LIST_CAP_. Answers never ride the list — details come one at a
 *  time via intakeGetSubmission. An unreachable Intake spreadsheet / tab skips
 *  that form type rather than failing the whole list (best-effort posture). */
function intakeListMySubmissions() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const out = [];
    INTAKE_FORM_TYPES_.forEach(function (ft) {
      let sheet;
      try { sheet = getIntakeSubmissionSheet_(ft); } catch (e) { return; }
      const last = sheet.getLastRow();
      if (last < 2) return;
      const isPpd = ft === 'PPD';
      // Cycle-9 L-16: METADATA-ONLY projection — the old full-width read
      // pulled every patient's AnswersJSON (+ the PPD Recommendations/
      // Selections blobs) on every Sent-tab open, for a list that surfaces
      // only id/timestamp/rep/patient/language/recipient. Two column-bounded
      // reads per tab skip the heavy JSON columns entirely; the detail
      // endpoint keeps its own bounded one-row lookup (INV-116).
      const metaWidth = isPpd ? 6 : 7;   // …Language (PPD) / …Language incl. DOB (ACCT)
      const recipCol = isPpd ? 9 : 8;    // Recipient (0-based; past the JSON blobs)
      const n = last - 1;
      const rows = sheet.getRange(2, 1, n, metaWidth).getValues();
      const recips = sheet.getRange(2, recipCol + 1, n, 1).getValues();
      // Amend & re-send (operator 2026-08-25): the trailing AmendsId column —
      // a legacy tab narrower than the healed header reads as blank.
      const amendCol = (isPpd ? INTAKE_PPD_SUB_HEADERS : INTAKE_ACCT_SUB_HEADERS).length;   // 1-based
      const amends = sheet.getLastColumn() >= amendCol ? sheet.getRange(2, amendCol, n, 1).getValues() : null;
      // id → the amending submission's {id, ts}: an item someone amended
      // renders "superseded". Built over the FULL tab (pre-visibility) so a
      // manager view and the owner view agree.
      const superseded = {};
      if (amends) for (let i = 0; i < n; i++) {
        const src = String(amends[i][0] || '').trim();
        if (src) superseded[src] = { submissionId: String(rows[i][0] || ''), timestamp: intakeTsString_(rows[i][1]) };
      }
      for (let i = 0; i < rows.length; i++) {
        const repId = String(rows[i][2] || '').trim();
        if (!emp.isManager && repId !== emp.id) continue;
        const sid = String(rows[i][0] || '');
        out.push({
          formType: ft,
          submissionId: sid,
          timestamp: intakeTsString_(rows[i][1]),
          repId: repId,
          repName: String(rows[i][3] || ''),
          patientInfo: String(rows[i][4] || ''),
          language: isPpd ? String(rows[i][5] || 'EN') : String(rows[i][6] || 'EN'),
          recipient: String(recips[i][0] || ''),
          amendsId: amends ? String(amends[i][0] || '').trim() : '',
          supersededBy: superseded[sid] || null,
        });
      }
    });
    out.sort(function (a, b) { return b.timestamp.localeCompare(a.timestamp); });
    // C17 batch-5 (INV-169): a payload-capped reader returns its PRE-SLICE
    // total — for a manager this list spans ALL reps × 3 form types, so a
    // silent 100-cap read as "exactly 100 submissions exist".
    const total = out.length;
    if (out.length > INTAKE_LIST_CAP_) out.length = INTAKE_LIST_CAP_;
    return { submissions: out, isManager: !!emp.isManager, total: total, cap: INTAKE_LIST_CAP_ };
  } catch (err) { return { error: err.message }; }
}
/** Full detail for one submission — same scoping as the list (owner or
 *  manager). Bounded lookup: id-column scan, then a single full-row fetch
 *  (the L9 pattern), so viewing one submission never reads every patient's
 *  answers. */
function intakeGetSubmission(formType, submissionId) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const ft = String(formType || '').trim().toUpperCase();
    if (INTAKE_FORM_TYPES_.indexOf(ft) < 0) return { error: 'Unknown form type.' };
    const id = String(submissionId || '').trim();
    if (!id) return { error: 'Missing submission id.' };
    const sheet = getIntakeSubmissionSheet_(ft);
    const last = sheet.getLastRow();
    if (last < 2) return { error: 'Submission not found.' };
    const isPpd = ft === 'PPD';
    const width = isPpd ? INTAKE_PPD_SUB_HEADERS.length : INTAKE_ACCT_SUB_HEADERS.length;
    const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    let row = null;
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === id) {
        row = sheet.getRange(i + 2, 1, 1, width).getValues()[0];
        break;
      }
    }
    if (!row) return { error: 'Submission not found.' };
    const repId = String(row[2] || '').trim();
    if (!emp.isManager && repId !== emp.id) {
      return { error: 'You can only view your own intake submissions.' };
    }
    const parse = function (raw) { try { return JSON.parse(raw) || {}; } catch (e) { return {}; } };
    // Amend & re-send (operator 2026-08-25): AmendsId is the LAST header
    // column (index width-1 in the fetched row — a legacy row reads blank);
    // supersededBy needs one bounded pass over that column to find a LATER
    // amendment pointing at this id (last match wins = the newest).
    let supersededBy = null;
    const amendColD = width;   // 1-based — AmendsId is the trailing header col
    if (sheet.getLastColumn() >= amendColD) {
      const amendsAll = sheet.getRange(2, amendColD, last - 1, 1).getValues();
      for (let i = 0; i < amendsAll.length; i++) {
        if (String(amendsAll[i][0] || '').trim() === id) {
          const meta = sheet.getRange(i + 2, 1, 1, 2).getValues()[0];
          supersededBy = { submissionId: String(meta[0] || ''), timestamp: intakeTsString_(meta[1]) };
        }
      }
    }
    const fbRes = intakeFeedbackResult_(ft, id);
    const result = {
      formType: ft,
      submissionId: id,
      isOwn: repId === emp.id,
      amendsId: String(row[width - 1] == null ? '' : row[width - 1]).trim(),
      supersededBy: supersededBy,
      // Recipient feedback, all three forms (2026-08-13). F8: `feedback` keeps
      // its array shape for an older client; `feedbackUnavailable` is additive
      // and says the list is empty because the read FAILED, not because there
      // is none.
      feedback: fbRes.items,
      feedbackUnavailable: fbRes.unavailable,
      timestamp: intakeTsString_(row[1]),
      repId: repId,
      repName: String(row[3] || ''),
      patientInfo: String(row[4] || ''),
      language: isPpd ? String(row[5] || 'EN') : String(row[6] || 'EN'),
      answers: parse(isPpd ? row[6] : row[7]),
      recipient: isPpd ? String(row[9] || '') : String(row[8] || ''),
    };
    if (isPpd) {
      result.recommendations = parse(row[7]);
      result.selections = parse(row[8]);
      // Read-only engine explainability (manager-auditable) — recomputed from the
      // STORED answers via the same derivation the engine used (intakeExplainFactors_
      // → intakeDeriveClinicalFactors_), so there's no schema change and it can
      // never drift from what actually fired. PHI-free beyond the answers already here.
      result.factors = intakeExplainFactors_(result.answers);
    } else {
      // DOB is user-typed text but Sheets may coerce a date-like value.
      // F(cycle-8): recover in the INTAKE sheet's own tz (the coercer), not
      // CONFIG.TIMEZONE — same rationale as intakeTsString_.
      result.dob = (row[5] instanceof Date)
        ? Utilities.formatDate(row[5], (function () { try { return getIntakeSS_().getSpreadsheetTimeZone() || CONFIG.TIMEZONE; } catch (e) { return CONFIG.TIMEZONE; } })(), 'yyyy-MM-dd')
        : String(row[5] || '');
      result.imageCount = Number(row[9]) || 0;
    }
    return result;
  } catch (err) { return { error: err.message }; }
}
function intakeListOfferings() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const rows = getIntakeOfferings_();
    const out = [];
    (rows || []).forEach(function (r) {
      const cell = function (n) { return String(r && r[n] == null ? '' : r[n]).trim(); };
      const hcpcs = cell(1);
      if (!hcpcs) return;                       // inert to the engine — see above
      out.push({
        hcpcs: hcpcs,
        features: cell(0),
        weightCapacity: cell(2),
        seatType: cell(3),
        pdfLink: cell(4),
        imageUrl: cell(5),
      });
    });
    out.sort(function (a, b) { return a.hcpcs.localeCompare(b.hcpcs); });
    const total = out.length;
    if (out.length > INTAKE_OFFERINGS_LIST_CAP_) out.length = INTAKE_OFFERINGS_LIST_CAP_;
    return { offerings: out, total: total, cap: INTAKE_OFFERINGS_LIST_CAP_ };
  } catch (err) { return { error: err.message }; }
}
