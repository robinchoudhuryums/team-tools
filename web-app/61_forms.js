// ════════════════════════════════════════════════════════════════════════════
//  UMS TEAM TOOLS — 61_forms.js
//  Public fillable forms: tokens, the anonymous submit route, hashes and consent.
//
//  ONE Apps Script project, ONE global scope: these files are the SERVER, in
//  the load order `web-app/.clasp.json` filePushOrder declares. Batch F2 split
//  them out of Code.js as a MOVE — every declaration below is byte-identical to
//  the one it replaced, and the SPLIT-MANIFEST pin proves it.
// ════════════════════════════════════════════════════════════════════════════

/** Coercion-safe read of a FormTokens timestamp cell (ExpiresAt / CreatedAt).
 *  createFormToken writes these as a "yyyy-MM-dd'T'HH:mm:ss" string in
 *  CONFIG.TIMEZONE, but some spreadsheet locales — notably the Intake sheet
 *  FORMS_SS_ID is segregated onto — COERCE that ISO-T value into a datetime, so
 *  getValues() returns a Date. The previous String()+strict-parse then threw on
 *  the coerced Date and fail-closed EVERY fresh token to "expired" (the same
 *  coercion the FormSubmissions SubmissionHash already excludes submittedAt for).
 *  Returns { present, ms }: present=false for an empty cell; ms=null for a
 *  NON-empty but unparseable string — the caller fail-closes THAT as tamper
 *  (INV-96 / S2.1). A coerced Date is valid (ms via getTime()). */
function formTokenCellMs_(cell) {
  if (cell instanceof Date) return { present: true, ms: cell.getTime() };
  const s = String(cell == null ? '' : cell).trim();
  if (!s) return { present: false, ms: null };
  return { present: true, ms: parseTimestampMs_(s, CONFIG.TIMEZONE) };
}
/** Display string for a FormTokens timestamp cell — a clean CONFIG.TIMEZONE
 *  "yyyy-MM-dd'T'HH:mm:ss" whether the cell is a coerced Date or the stored
 *  string (the coercion-safe sibling of formTokenCellMs_; used in the values
 *  returned to clients so a coerced Date never leaks as a "Sat Jun 27 …" blob). */
function formTokenIsoString_(cell) {
  const r = formTokenCellMs_(cell);
  if (r.ms != null) return Utilities.formatDate(new Date(r.ms), CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
  return String(cell == null ? '' : cell).trim();
}


// ════════════════════════════════════════════════════════════════════════════
//  CALL NOTES — EMAIL COMPOSER
//  ────────────────────────────────────────────────────────────────────────
//  Two-stage send: previewCallNoteEmail returns the rendered HTML for a
//  confirm-before-send modal in the client; emailFromCallNote actually
//  sends via MailApp and stamps the note row's EmailedAt / EmailDepartments.
//  Subject/body builders port the legacy logic (Verified Shipping /
//  Repeat Resupply / Close Order / OOP subforms) but the inline-CSS uses
//  resolved hex equivalents of the design tokens (--accent, --good,
//  --warn, etc.) since email clients strip <style> blocks and don't honor
//  CSS variables. The PALETTE constant below is the translation layer;
//  re-sync if styles_design_tokens.html palette changes.
// ════════════════════════════════════════════════════════════════════════════
/** Returns the form catalog for the external-email modal. No secrets — just
 *  {id, name, category} tuples. Requires a registered employee. */
function getFormCatalog() {
  const emp = getEmployeeInfo_();
  if (!emp) return { error: 'Employee not found.' };
  const catalog = (CONFIG.CALL_NOTES.FORM_CATALOG || []).map(function (f) {
    return {
      id: f.id, name: f.name, category: f.category,
      interactive: INTERACTIVE_FORM_TYPES.indexOf(f.id) >= 0,
    };
  });
  return { forms: catalog };
}
/** Builds an HTML block for interactive form link buttons in email bodies. */
function buildFormLinksBlock_(formLinks, palette) {
  if (!formLinks || formLinks.length === 0) return '';
  const P = palette;
  const buttons = formLinks.map(function (fl) {
    return '<a href="' + esc_(fl.url) + '" ' +
      'style="display:inline-block;background:' + P.brand + ';color:#ffffff;' +
      'padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;' +
      'font-weight:600;margin:6px 8px 6px 0;" target="_blank">' +
      'Complete: ' + esc_(fl.name) + '</a>';
  }).join('');
  return (
    '<div style="background:' + P.goodSoft + ';border-left:3px solid ' + P.good + ';' +
      'border-radius:6px;padding:14px 16px;margin:14px 0;">' +
      '<div style="font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;' +
        'color:' + P.goodDeep + ';opacity:.75;margin-bottom:10px;">Interactive Forms</div>' +
      '<p style="margin:0 0 10px;font-size:13px;color:' + P.muted + ';">' +
        'Please click the button(s) below to complete the required form(s) online:</p>' +
      '<div>' + buttons + '</div>' +
      '<p style="margin:8px 0 0;font-size:11px;color:' + P.muted + ';">' +
        'These links expire in 72 hours. No account or login is required.</p>' +
    '</div>'
  );
}
/** PHI segregation (forms hardening). FormTokens + FormSubmissions hold PHI
 *  (recipient + prefill identifiers, responses, signatures), so they resolve
 *  here rather than to the ADP/payroll sheet directly: Script Property
 *  FORMS_SS_ID first (point it at the Intake spreadsheet, INTAKE_SS_ID, to move
 *  PHI off the payroll sheet — the recommended posture), else the ADP SS
 *  (back-compat — existing deployments keep working until the operator sets
 *  FORMS_SS_ID and migrates the two tabs). The deployer account must have edit
 *  access to whichever spreadsheet this resolves to. */
function getFormsSS_() {
  if (typeof _TEST_OVERRIDE_FORMS_SS_ID !== 'undefined' && _TEST_OVERRIDE_FORMS_SS_ID) {
    return SpreadsheetApp.openById(_TEST_OVERRIDE_FORMS_SS_ID);
  }
  const id = PropertiesService.getScriptProperties().getProperty('FORMS_SS_ID');
  return id ? SpreadsheetApp.openById(id) : getAdpSS_();
}
/** Returns or creates the FormTokens tab in the forms (PHI) spreadsheet. */
function getOrCreateFormTokensSheet_() {
  const ss = getFormsSS_();
  let sheet = ss.getSheetByName(CONFIG.FORM_TOKENS_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.FORM_TOKENS_TAB);
    sheet.appendRow(sheetSafeRow_(FT_HEADERS));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, FT_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}
/** Returns or creates the FormSubmissions tab in the forms (PHI) spreadsheet. */
function getOrCreateFormSubmissionsSheet_() {
  const ss = getFormsSS_();
  let sheet = ss.getSheetByName(CONFIG.FORM_SUBMISSIONS_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.FORM_SUBMISSIONS_TAB);
    sheet.appendRow(sheetSafeRow_(FS_HEADERS));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, FS_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}
/** Generates a UUID v4 token. */
function generateFormToken_() {
  return Utilities.getUuid();
}
/** Build the PUBLIC form URL for a token. `ScriptApp.getService().getUrl()`
 *  inside a Google Workspace returns the DOMAIN-scoped form
 *  `https://script.google.com/a/<domain>/macros/s/<id>/exec` — that `/a/<domain>/`
 *  prefix routes through the org's login, so an external recipient (personal
 *  Gmail / customer) is blocked with a Drive "Sorry, unable to open the file at
 *  this time" error. `normalizeWebAppExecUrl_` strips that prefix (and prefers
 *  /exec over a /dev head URL) so the emailed link is the canonical anonymous
 *  form. Script Property WEB_APP_URL (set to the published /exec URL) overrides
 *  the resolved base. */
/** The canonical public /exec base URL (WEB_APP_URL property override,
 *  else the service URL), normalized. Shared by the form links AND the
 *  client pop-out (shipped via doGet as SERVER_WEB_APP_URL — the iframe's
 *  own window.location is a session-bound googleusercontent.com URL that
 *  renders BLANK when opened as a top-level window). */
function getWebAppExecUrl_() {
  const base = PropertiesService.getScriptProperties().getProperty('WEB_APP_URL')
            || ScriptApp.getService().getUrl();
  return normalizeWebAppExecUrl_(base);
}
function buildFormUrl_(token) {
  return getWebAppExecUrl_() + '?form=' + encodeURIComponent(token);
}
/** A deep link into a tool tab for an email CTA, or '' when the web-app URL
 *  cannot be resolved. Returning '' is deliberate: buildBrandedEmailHtml_ only
 *  renders the CTA when BOTH url and label are present, so a resolution failure
 *  drops the button rather than shipping a dead one. `tabKey` is a TOOLS
 *  registry tab key (INV-78's ?tool= deep-link contract). */
function safeWebAppUrl_(tabKey) {
  try {
    const base = getWebAppExecUrl_();
    if (!base) return '';
    return tabKey ? base + '?tool=' + encodeURIComponent(tabKey) : base;
  } catch (e) { return ''; }
}
/** Normalizes an Apps Script web-app URL to its canonical public /exec form:
 *  drops the `/a/<domain>/` Workspace routing prefix (which is domain-locked)
 *  and rewrites a trailing /dev to /exec. */
function normalizeWebAppExecUrl_(url) {
  return String(url || '')
    .replace(/\/a\/[^/]+\/macros\//, '/macros/')
    .replace(/\/dev$/, '/exec');
}
/** Creates a form token. Called by the external email flow when "fillable"
 *  is selected for a form. Requires a registered employee. */
function createFormToken(payload) {
  const emp = getEmployeeInfo_();
  if (!emp) return { success: false, error: 'Employee not found.' };

  const p = payload || {};
  const formType      = String(p.formType || '').trim();
  const recipientEmail = String(p.recipientEmail || '').trim();
  // C17 batch-5 — the LAST uncapped client-writable cell family (every
  // sibling was bounded across cycles: subformData M-15, email details L-1,
  // form payloads INV-96, feedback appends F11): an oversized prefill threw
  // mid-appendRow inside the flow, and PrefillData is PHI stored on a tab
  // whose purge is opt-in-off. Same 45k cell posture as INV-96; the name
  // gets a display-plausible cap.
  const recipientName = String(p.recipientName || '').trim().slice(0, 200);
  const prefillData   = (p.prefillData && typeof p.prefillData === 'object' && !Array.isArray(p.prefillData))
    ? p.prefillData : {};
  const noteId        = p.noteId || null;

  // Validate form type
  if (INTERACTIVE_FORM_TYPES.indexOf(formType) < 0) {
    return { success: false, error: 'Unknown interactive form type: ' + formType };
  }
  // C17 batch-5: bound the prefill BEFORE the append (INV-96 spirit —
  // reject with a clean error, never throw mid-write).
  {
    const prefillJson = JSON.stringify(prefillData);
    if (Object.keys(prefillData).length > 50 || prefillJson.length > 20000) {
      return { success: false, error: 'Prefill data is too large for a form link — trim the prefilled fields and try again.' };
    }
  }
  // Validate recipient email
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return { success: false, error: 'Valid recipient email required for interactive form.' };
  }

  const token = generateFormToken_();
  const now = new Date();
  // CreatedAt / ExpiresAt are stored in CONFIG.TIMEZONE — every reader
  // (getFormByToken, submitFormByToken, getMySentForms, parseRetentionDateMs_)
  // parses these cells with CONFIG.TIMEZONE, and FormSubmissions.SubmittedAt is
  // already written in it. Writing them in the creating rep's tz skewed the
  // expiry check by the rep↔CONFIG tz offset (±~12h for CST reps).
  const createdAt = Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
  const expiresDate = new Date(now.getTime() + (CONFIG.FORM_TOKEN_EXPIRY_HOURS || 72) * 3600000);
  const expiresAt = Utilities.formatDate(expiresDate, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getOrCreateFormTokensSheet_();
    sheet.appendRow(sheetSafeRow_([
      token, formType, recipientEmail, recipientName,
      createdAt, expiresAt, 'pending',
      JSON.stringify(prefillData),
      emp.email, noteId || '',
    ]));
  } finally {
    lock.releaseLock();
  }

  const formUrl = buildFormUrl_(token);

  // Audit row logs only the recipient DOMAIN — same PII/PHI minimization as
  // the ExternalEmailSent row (a customer's personal address is PII; for a
  // patient it can be PHI-adjacent). The full recipient lives on the
  // FormTokens row itself, which an investigator finds by the token REFERENCE.
  //
  // A reference, never the token (cycle 22 S4). The token is the ONLY
  // credential the public route checks, and for its whole 72-hour life it
  // returns the patient prefill to whoever holds it — so writing it into the
  // shared AuditLog on the payroll sheet handed a live bearer credential to
  // every reader of that log, and a form opened with it left no trace.
  writeAuditLog_(emp, 'FormTokenCreated', '', '', false, 0,
    'tokenRef=' + formTokenRef_(token) + '; formType=' + formType +
    '; toDomain=' + intakeEmailDomain_(recipientEmail) +
    (noteId ? '; noteId=' + noteId : ''));

  return { success: true, token: token, formUrl: formUrl };
}
/** Pure (Node-pinned) — is this string SHAPED like a form token? Tokens are
 *  minted by Utilities.getUuid() (a v4 UUID), so anything else can be refused
 *  without a sheet read or the lock (cycle 22 S9). */
function formTokenShapeOk_(token) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(token == null ? '' : token).trim());
}
/** Look up a FormTokens row by token string. Returns { rowIndex, row } or null. */
function findFormTokenRow_(sheet, token) {
  if (!token) return null;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  // Scan only the Token column to locate the row, then fetch that single full
  // row — avoids reading every column of the whole FormTokens sheet on each
  // token validation / submission. Return shape unchanged (L9).
  const tokens = sheet.getRange(2, FT.TOKEN + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < tokens.length; i++) {
    if (String(tokens[i][0]).trim() === token) {
      const rowIndex = i + 2;
      const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
      return { rowIndex: rowIndex, row: row };
    }
  }
  return null;
}
/** Public endpoint — NO auth required. Validates the token and returns the
 *  form definition + prefill data. Called by google.script.run from the
 *  public form page. */
function getFormByToken(token) {
  token = String(token || '').trim();
  if (!token) return { error: 'No form token provided.' };

  try {
    const sheet = getOrCreateFormTokensSheet_();
    const located = findFormTokenRow_(sheet, token);
    if (!located) return { error: 'Form not found. This link may be invalid.' };

    const row = located.row;
    const status = String(row[FT.STATUS]).trim().toLowerCase();

    if (status === 'submitted') {
      return { error: 'This form has already been submitted. Thank you!' };
    }

    // Check expiration — ExpiresAt is written in CONFIG.TIMEZONE (L-13: the
    // creating-rep's-tz form skewed expiry), but the sheet may COERCE the ISO-T
    // value to a Date on read (formTokenCellMs_ handles both; a non-empty
    // unparseable string fail-closes as tamper, S2.1).
    const expFB = formTokenCellMs_(row[FT.EXPIRES_AT]);
    // Fail CLOSED on an ABSENT expiry too (F cycle-8): createFormToken always
    // writes ExpiresAt atomically in the appendRow, so a blank cell is only
    // corruption / a lossy FORMS_SS_ID migration — an anonymous PHI form must
    // never be served against a token with no expiry. (Unparseable already
    // fail-closed via ms==null, S2.1; absent was the fail-OPEN asymmetry.)
    if (!expFB.present || expFB.ms == null || Date.now() > expFB.ms) {
      // Cycle-9 L-6: mark-expired under a brief lock, RE-LOCATING the row by
      // token first — this was the one unlocked mutating write in the token
      // lifecycle, and the pre-lock rowIndex can go stale if the 3am
      // purgeExpiredFormData's descending deleteRows land between locate and
      // write (marking an UNRELATED pending token expired, or clobbering a
      // submitted status). tryLock, never waitLock: this is a best-effort
      // status flip on a public endpoint — don't block the visitor on lock
      // contention (the row simply stays 'pending'-but-expired, which every
      // reader already treats as expired via the ExpiresAt check).
      try {
        const xlock = LockService.getScriptLock();
        if (xlock.tryLock(2000)) {
          try {
            const fresh = findFormTokenRow_(sheet, token);
            if (fresh) sheet.getRange(fresh.rowIndex, FT.STATUS + 1).setValue(sheetSafe_('expired'));
          } finally { try { xlock.releaseLock(); } catch (_) {} }
        }
      } catch (_) {}
      return { error: 'This form link has expired. Please contact UMS to request a new one.' };
    }

    if (status === 'expired') {
      return { error: 'This form link has expired. Please contact UMS to request a new one.' };
    }

    // Parse prefill data
    let prefillData = {};
    try { prefillData = JSON.parse(row[FT.PREFILL_DATA]) || {}; } catch(_) {}

    // Resolve form catalog entry for display name
    const catalog = CONFIG.CALL_NOTES.FORM_CATALOG || [];
    const formType = String(row[FT.FORM_TYPE]).trim();
    let formName = formType;
    for (let i = 0; i < catalog.length; i++) {
      if (catalog[i].id === formType) { formName = catalog[i].name; break; }
    }

    return {
      formType: formType,
      formName: formName,
      recipientName: String(row[FT.RECIPIENT_NAME] || ''),
      recipientEmail: String(row[FT.RECIPIENT_EMAIL] || ''),
      prefillData: prefillData,
      expiresAt: formTokenIsoString_(row[FT.EXPIRES_AT]),
    };
  } catch (err) {
    return { error: 'An error occurred loading this form. Please try again.' };
  }
}
/** Public endpoint — NO auth required. Submits a completed form.
 *  Validates token, saves data, marks token submitted, notifies rep. */
function submitFormByToken(token, formData) {
  token = String(token || '').trim();
  if (!token) return { success: false, error: 'No form token provided.' };

  // Rep-notification payload, captured inside the lock and sent AFTER release
  // (the email's PDF render is slow — see the deferred send in finally).
  let notifyPayload = null;
  // F(L-12): failure-notification (size-cap rejects) — ALSO deferred past the
  // lock. The three cap paths previously called MailApp inside the lock,
  // stalling every mutating endpoint app-wide for the mail call's duration.
  let failNotify = null;
  // Cycle 22 S9 — validate BEFORE the lock. This endpoint has no identity gate
  // (the token is the credential, g101), so anything that can load a page can
  // call it; it used to take the ONE project-wide ScriptLock first and read
  // the whole token column while holding it, for any garbage string. Every
  // punch and note write queued behind that. A token is a v4 UUID
  // (Utilities.getUuid), so a malformed one is refused on shape, and a
  // well-formed one that matches no row is refused on a lock-free read (the
  // same read getFormByToken does). The row is found AGAIN inside the lock —
  // rows can move between the two reads, and status is only trusted there.
  if (!formTokenShapeOk_(token)) return { success: false, error: 'Form not found.' };
  try {
    if (!findFormTokenRow_(getOrCreateFormTokensSheet_(), token)) return { success: false, error: 'Form not found.' };
  } catch (preErr) {
    console.warn('submitFormByToken pre-check failed: ' + preErr.message);
    return { success: false, error: 'We could not submit your form. Please try again, or contact UMS if the problem persists.' };
  }
  const lock = LockService.getScriptLock();
  // A lock timeout is an ordinary busy moment, not an exception to show an
  // external recipient raw ("Lock timeout…") — the token stays pending.
  try { lock.waitLock(15000); } catch (lockErr) {
    return { success: false, error: 'The form service is busy right now. Please wait a moment and submit again.' };
  }
  try {
    const tokenSheet = getOrCreateFormTokensSheet_();
    const located = findFormTokenRow_(tokenSheet, token);
    if (!located) return { success: false, error: 'Form not found.' };

    const row = located.row;
    const status = String(row[FT.STATUS]).trim().toLowerCase();

    if (status !== 'pending') {
      return { success: false, error: status === 'submitted'
        ? 'This form has already been submitted.'
        : 'This form link has expired.' };
    }

    // Check expiration (coercion-safe; see formTokenCellMs_ — fail CLOSED on a
    // non-empty unparseable expiry, S2.1, so a PHI submission is never accepted
    // against a tampered token).
    const expSF = formTokenCellMs_(row[FT.EXPIRES_AT]);
    // Fail CLOSED on an ABSENT expiry too (F cycle-8) — never accept an
    // anonymous PHI submission against a token with no expiry (blank = only
    // corruption / migration; ExpiresAt is written atomically at creation).
    if (!expSF.present || expSF.ms == null || Date.now() > expSF.ms) {
      tokenSheet.getRange(located.rowIndex, FT.STATUS + 1).setValue(sheetSafe_('expired'));
      return { success: false, error: 'This form link has expired.' };
    }

    const formType = String(row[FT.FORM_TYPE]).trim();
    const recipientEmail = String(row[FT.RECIPIENT_EMAIL]).trim();
    const recipientName = String(row[FT.RECIPIENT_NAME] || '').trim();
    const createdBy = String(row[FT.CREATED_BY] || '').trim();
    const noteId = String(row[FT.NOTE_ID] || '').trim();

    // Validate form data (basic shape check). `signature` and `_meta` (consent
    // + openedAt envelope) are pulled out separately so they never land in the
    // responses blob.
    const data = formData || {};
    const meta = (data._meta && typeof data._meta === 'object') ? data._meta : {};
    const sanitizedData = {};
    Object.keys(data).forEach(function(k) {
      if (k === 'signature' || k === '_meta') return; // handled separately
      sanitizedData[k] = data[k];
    });
    const signatureData = String(data.signature || '');
    // C17 batch-5 — the signature must BE a signature: it is later embedded
    // as an <img src> in the in-app submission viewer (rep AND manager
    // innerHTML it) and fetched server-side by the HTML→PDF conversion, so
    // an anonymous submitter could plant an https:// URL that fires a
    // tracking-pixel fetch (IP/UA leak) from whoever reviews the PHI
    // submission. esc_ already prevents attribute breakout; this closes the
    // remote-fetch channel. Empty stays allowed (fields-only forms).
    if (signatureData && !/^data:image\//.test(signatureData)) {
      return { success: false, error: 'The signature could not be read — please clear the signature pad and sign again.' };
    }

    // Consent is server-enforced, not just client-gated: the payload MUST
    // affirmatively report consentAgreed === true. The original deploy
    // tolerated an absent _meta (pages cached pre-hardening), but the shipped
    // form_public.html has sent _meta on every submit since — so a missing
    // envelope now means a hand-crafted POST bypassing the consent checkbox,
    // and the tolerance window is closed (A9).
    if (!meta || meta.consentAgreed !== true) {
      return { success: false, error: 'You must acknowledge the privacy notice before submitting.' };
    }

    // Bound the payload BEFORE the write. This is a public, token-only
    // endpoint, so formData/signature are recipient-supplied: each value
    // lands in a single Sheets cell (~50k-char hard limit) and an oversized
    // signature otherwise throws mid-append, leaving the token 'pending'
    // with only a generic error. Reject early with a specific, actionable
    // message (the token stays pending so the recipient can retry), and cap
    // the number of arbitrary keys an unauthenticated caller can persist (M3).
    const FORM_FIELD_LIMIT = 200;
    const FORM_CELL_CHAR_LIMIT = 45000;
    if (Object.keys(sanitizedData).length > FORM_FIELD_LIMIT) {
      failNotify = { createdBy: createdBy, recipientEmail: recipientEmail, formType: formType, reason: 'too many fields' };   // F(L-12): sent after lock release
      return { success: false, error: 'This submission has too many fields to save.' };
    }
    const dataJson = JSON.stringify(sanitizedData);
    if (dataJson.length > FORM_CELL_CHAR_LIMIT) {
      failNotify = { createdBy: createdBy, recipientEmail: recipientEmail, formType: formType, reason: 'the response data exceeds the per-cell size limit' };   // F(L-12): sent after lock release
      return { success: false, error: 'This submission is too large to save. Please shorten your responses and resubmit.' };
    }
    if (signatureData.length > FORM_CELL_CHAR_LIMIT) {
      failNotify = { createdBy: createdBy, recipientEmail: recipientEmail, formType: formType, reason: 'the signature image exceeds the per-cell size limit' };   // F(L-12): sent after lock release
      return { success: false, error: 'Your signature image is too large to save. Please redraw a simpler signature and resubmit.' };
    }

    // Save submission. Forms-hardening: stamp the server-authoritative consent
    // version, the consent/open timestamps, a tamper-evident content hash, and
    // a Certificate of Completion alongside the responses.
    const now = new Date();
    const submittedAt = Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
    const consentVersion = CONFIG.FORM_CONSENT_VERSION || '';
    // L-12 — consentAt is the submit time, not the moment the box was ticked:
    // the consent checkbox gates submission (you can't submit without it), and
    // the client sends `_meta.openedAt` but no separate consent-tick timestamp,
    // so ConsentAt is effectively SubmittedAt. The server-authoritative
    // `consentVersion` (which language was shown) is the load-bearing record.
    const consentAt = submittedAt; // consent precedes the submit (checkbox-gated)
    // Cycle-9 L-7: length-cap the one recipient-supplied field the INV-96
    // size caps missed — an oversized openedAt threw mid-appendRow into the
    // generic catch (skipping the specific error + the failNotify rep notice).
    // A legitimate value is a short ISO timestamp; 64 chars is generous.
    const openedAt = String(meta.openedAt || '').slice(0, 64);
    // Hash over coercion-stable content only (dataJson / signature / token /
    // consentVersion never round-trip as a Date) — submittedAt's independent
    // witness is the FormSubmissionReceived audit row. See verifyFormSubmissionIntegrity_.
    const submissionHash = computeFormSubmissionHash_(dataJson, signatureData, token, consentVersion);
    const certificate = JSON.stringify({
      token: token, formType: formType,
      recipientEmail: recipientEmail, recipientName: recipientName, createdBy: createdBy,
      openedAt: openedAt, submittedAt: submittedAt,
      consentVersion: consentVersion, consentAt: consentAt,
      submissionHash: submissionHash,
    });
    const submissionsSheet = getOrCreateFormSubmissionsSheet_();
    submissionsSheet.appendRow(sheetSafeRow_([
      token, formType, recipientEmail, submittedAt,
      dataJson,
      signatureData,
      submissionHash, consentVersion, consentAt, openedAt, certificate,
    ]));

    // Mark token as submitted
    tokenSheet.getRange(located.rowIndex, FT.STATUS + 1).setValue(sheetSafe_('submitted'));

    // Stamp linked note (best-effort)
    if (noteId) {
      try {
        // Look up the creating rep to access their call-notes sheet
        const empRows = getEmployeeRosterRows_();
        let creatorEmp = null;
        for (let i = 1; i < empRows.length; i++) {
          if (String(empRows[i][EMP.EMAIL]).toLowerCase().trim() === createdBy.toLowerCase()) {
            creatorEmp = {
              email: createdBy,
              id: String(empRows[i][EMP.ID]).trim(),
              name: String(empRows[i][EMP.NAME]).trim(),
              callNotesSheetId: cnEnrolledSheetId_(empRows[i]) || null,
            };
            break;
          }
        }
        if (creatorEmp && creatorEmp.callNotesSheetId) {
          const cnSheet = getCallNotesSheet_(creatorEmp);
          const noteLocated = findCallNoteRow_(cnSheet, noteId);
          if (noteLocated) {
            let subformData = null;
            try { subformData = JSON.parse(noteLocated.row[CN.SUBFORM_DATA]); } catch(_) {}
            if (!subformData || typeof subformData !== 'object') subformData = {};
            subformData.formSubmission = {
              token: token, formType: formType, submittedAt: submittedAt,
              recipientEmail: recipientEmail,
            };
            cnSheet.getRange(noteLocated.rowIndex, CN.SUBFORM_DATA + 1).setValue(sheetSafe_(JSON.stringify(subformData)));
          }
        }
      } catch (stampErr) {
        console.warn('submitFormByToken: note stamp failed: ' + stampErr.message);
      }
    }

    // Notify the rep who created the token with the completed, stylized form
    // (HTML body rendering all responses + the signature as a PNG attachment +
    // a best-effort PDF of the whole form). Best-effort — a failure here never
    // blocks the recipient's already-successful submission. The send is
    // DEFERRED past lock release (see finally) — it renders an HTML→PDF
    // conversion that can take seconds, and holding the global ScriptLock
    // through it would stall every punch / call-note write in the app
    // (same post-release pattern as recordPunch's old-adjustment alert).
    if (createdBy) {
      notifyPayload = { createdBy: createdBy, formType: formType,
        recipientName: recipientName, recipientEmail: recipientEmail,
        submittedAt: submittedAt, sanitizedData: sanitizedData,
        signatureData: signatureData };
    }

    // Audit log (use a synthetic emp object since this is a public endpoint)
    try {
      // The audit row carries the content hash + submittedAt — an independent,
      // append-only witness so a later edit to the stored row is detectable even
      // against the AuditLog. PII/PHI-minimized like the ExternalEmailSent row:
      // only the recipient DOMAIN is recorded (the full address — for a patient,
      // PHI-adjacent — lives on the FormTokens row, reachable via the token).
      const fromDomain = intakeEmailDomain_(recipientEmail);
      const auditEmp = { id: 'EXTERNAL', name: 'External recipient', email: fromDomain };
      writeWitnessAuditLog_(auditEmp, 'FormSubmissionReceived', '', '', false, 0,
        'token=' + token + '; formType=' + formType + '; fromDomain=' + fromDomain +
        '; hash=' + submissionHash + '; submittedAt=' + submittedAt +
        (noteId ? '; noteId=' + noteId : ''));
    } catch(_) {}

    return { success: true, message: 'Your form has been submitted successfully. Thank you!' };
  } catch (err) {
    // Public endpoint — never surface a raw exception to an external
    // recipient. The token is only marked 'submitted' after a successful
    // write, so a failure here leaves it 'pending' and the recipient can
    // retry. Log for ops to investigate (e.g. oversized signature payload).
    console.warn('submitFormByToken failed (token=' + token + '): ' + err.message);
    return { success: false, error: 'We could not submit your form. Please try again, or contact UMS if the problem persists.' };
  } finally {
    lock.releaseLock();
    if (failNotify) {
      try { notifyRepOfFailedSubmission_(failNotify.createdBy, failNotify.recipientEmail, failNotify.formType, failNotify.reason); }
      catch (e2) { console.warn('submitFormByToken: failure notice failed: ' + e2.message); }
    }
    if (notifyPayload) {
      try {
        notifyRepOfFormSubmission_(notifyPayload.createdBy, notifyPayload.formType,
          notifyPayload.recipientName, notifyPayload.recipientEmail,
          notifyPayload.submittedAt, notifyPayload.sanitizedData, notifyPayload.signatureData);
      } catch (emailErr) {
        console.warn('submitFormByToken: notification email failed: ' + emailErr.message);
      }
    }
  }
}
/** Serves the public form HTML page for a given token. Called by doGet when
 *  ?form=<token> is present. Returns a self-contained HTML page. */
function serveExternalForm_(token) {
  const tpl = HtmlService.createTemplateFromFile('form_public');
  tpl.formToken = String(token || '');
  return tpl.evaluate()
    .setTitle('UMS — Complete Your Form')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}
/** G3: returns a completed fillable-form submission for in-app display, so the
 *  rep who sent the form can review what the recipient entered without opening
 *  the FormSubmissions sheet. Caller-scoped: the calling employee must be the
 *  rep who created the token (FormTokens.CreatedBy) — a rep can't read another
 *  rep's submissions. Read-only, no lock. Returns `{ submitted: false, status }`
 *  when the linked token hasn't been completed yet. */
function getFormSubmission(token) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    token = String(token || '').trim();
    if (!token) return { error: 'No form token provided.' };

    const tokenSheet = getOrCreateFormTokensSheet_();
    const tLocated = findFormTokenRow_(tokenSheet, token);
    if (!tLocated) return { error: 'Form not found.' };

    const createdBy = String(tLocated.row[FT.CREATED_BY] || '').trim().toLowerCase();
    if (createdBy !== String(emp.email || '').toLowerCase()) {
      return { error: 'You can only view submissions for forms you sent.' };
    }
    return buildFormSubmissionResult_(tLocated, token);
  } catch (err) { return { error: err.message }; }
}
/** Caller-scoped, read-only list of every fillable-form token the calling rep
 *  created (`FormTokens.CreatedBy` == caller email), newest-first. Powers the
 *  "Sent Forms" tab so a rep can find a completed form even when it was sent
 *  with no linked note (no `.cn-form-pill` surface). Derives an effective
 *  status (a pending token past its expiry reads as `expired` even if the
 *  status cell wasn't flipped by a visit). Never returns form responses — only
 *  the token metadata; the per-form "View submission" action calls the
 *  separately-scoped read-only `getFormSubmission(token)`. */
function getMySentForms() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    const myEmail = String(emp.email || '').toLowerCase();
    if (!myEmail) return { forms: [] };
    const sheet = getOrCreateFormTokensSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { forms: [] };
    // Cycle-9 L-9: tail-bound the read (the DR_MAX_SCAN philosophy) — this
    // full-width read (incl. every token's PHI PrefillData blob) previously
    // scanned EVERY token ever created, per Sent-Forms view-enter, on a tab
    // whose retention purge is opt-in-off. The list is newest-first and
    // output-capped at 200 anyway; a rep's tokens older than the newest
    // FT_SENT_MAX_SCAN rows age off their in-app list (the raw sheet remains
    // the archive).
    const FT_SENT_MAX_SCAN = 2000;
    const scanCount = Math.min(lastRow - 1, FT_SENT_MAX_SCAN);
    const rows = sheet.getRange(lastRow - scanCount + 1, 1, scanCount, FT_HEADERS.length).getValues();
    const catalog = CONFIG.CALL_NOTES.FORM_CATALOG || [];
    const nameById = {};
    catalog.forEach(function (f) { nameById[f.id] = f.name; });
    const nowMs = Date.now();
    const forms = [];
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][FT.CREATED_BY] || '').toLowerCase().trim() !== myEmail) continue;
      const formType = String(rows[i][FT.FORM_TYPE] || '').trim();
      let status = String(rows[i][FT.STATUS] || '').trim().toLowerCase();
      // Coercion-safe (formTokenCellMs_): a pending token reads as expired only
      // when its expiry is genuinely past OR unparseable (tamper).
      if (status === 'pending') {
        const expMS = formTokenCellMs_(rows[i][FT.EXPIRES_AT]);
        // Fail CLOSED on an ABSENT expiry too (F cycle-8) — a blank-expiry
        // pending token reads as expired (blank = only corruption / migration),
        // matching the getFormByToken / submitFormByToken gates.
        if (!expMS.present || expMS.ms == null || nowMs > expMS.ms) status = 'expired';
      }
      forms.push({
        token: String(rows[i][FT.TOKEN] || '').trim(),
        formType: formType,
        formName: nameById[formType] || formType,
        recipientName: String(rows[i][FT.RECIPIENT_NAME] || ''),
        recipientEmail: String(rows[i][FT.RECIPIENT_EMAIL] || ''),
        status: status,
        createdAt: formTokenIsoString_(rows[i][FT.CREATED_AT]),
        expiresAt: formTokenIsoString_(rows[i][FT.EXPIRES_AT]),
        noteId: String(rows[i][FT.NOTE_ID] || '').trim(),
        submitted: status === 'submitted',
      });
    }
    forms.sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    if (forms.length > 200) forms.length = 200;
    return { forms: forms };
  } catch (err) { return { error: err.message }; }
}
/** Manager-side companion to getFormSubmission: lets a manager review a
 *  submitted form from the Team Notes Per-Rep view. Manager-gated (INV-02),
 *  read-only. Scoped to the rep being viewed — the token must have been
 *  created by `repEmpId` (the manager can only pull submissions for forms the
 *  selected rep sent), mirroring the per-rep view's read-only contract. */
function managerGetFormSubmission(repEmpId, token) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    token = String(token || '').trim();
    if (!token) return { error: 'No form token provided.' };
    const target = lookupEmployeeById_(repEmpId);
    if (!target) return { error: 'Employee not found.' };

    const tokenSheet = getOrCreateFormTokensSheet_();
    const tLocated = findFormTokenRow_(tokenSheet, token);
    if (!tLocated) return { error: 'Form not found.' };
    const createdBy = String(tLocated.row[FT.CREATED_BY] || '').trim().toLowerCase();
    if (createdBy !== String(target.email || '').toLowerCase()) {
      return { error: 'This form was not created by the selected rep.' };
    }
    return buildFormSubmissionResult_(tLocated, token);
  } catch (err) { return { error: err.message }; }
}
/** Shared submission-result builder for getFormSubmission /
 *  managerGetFormSubmission. Assumes the caller has already authorized access
 *  to `tLocated` (the FormTokens row). Returns `{ submitted: false, status }`
 *  until the form is completed, else the humanized fields + signature. */
/** Tamper-evident content hash for a form submission: SHA-256 hex over the
 *  responses JSON + signature + token + consent version. All coercion-stable
 *  strings (none round-trips as a Date), so verify recomputes identically from
 *  the stored cells. submittedAt is deliberately excluded (Sheets may coerce an
 *  ISO datetime to a Date on read) — its integrity is witnessed by the
 *  append-only FormSubmissionReceived audit row instead. */
/** Pure (Node-pinned) — an audit-safe REFERENCE to a form token: its first
 *  eight characters, enough to find the FormTokens row by eye or filter, and
 *  useless as a credential (the public route matches the whole token; a v4
 *  UUID keeps ~90 random bits past this prefix). Cycle 22 S4. */
function formTokenRef_(token) {
  const t = String(token == null ? '' : token).trim();
  return t ? t.substring(0, 8) + '\u2026' : '(none)';
}
function computeFormSubmissionHash_(dataJson, signatureData, token, consentVersion) {
  const payload = String(dataJson || '') + '\u0000' + String(signatureData || '') +
                  '\u0000' + String(token || '') + '\u0000' + String(consentVersion || '');
  const buf = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, payload);
  let out = '';
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i] < 0 ? buf[i] + 256 : buf[i];
    out += (b < 16 ? '0' : '') + b.toString(16);
  }
  return out;
}
/** Look up the FormSubmissions row for a token. Scans only the Token column —
 *  bottom-up, so the newest row wins, matching the prior full-scan semantics —
 *  then fetches just that one full row, instead of reading every submission's
 *  responses + signature on each lookup (same bounded pattern as
 *  findFormTokenRow_ / findCallNoteRow_, L9). Returns { rowIndex, row } or null.
 *  The row is read at FS_HEADERS width so legacy 6-column rows come back with
 *  the hardening columns as '' (treated as "legacy, no hash" by callers). */
function findFormSubmissionRow_(sheet, token) {
  if (!token) return null;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const tokens = sheet.getRange(2, FS.TOKEN + 1, lastRow - 1, 1).getValues();
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (String(tokens[i][0]).trim() === token) {
      const rowIndex = i + 2;
      const row = sheet.getRange(rowIndex, 1, 1, FS_HEADERS.length).getValues()[0];
      return { rowIndex: rowIndex, row: row };
    }
  }
  return null;
}
/** Manager-gated, read-only integrity check (forms hardening). Recomputes the
 *  stored submission's content hash from its cells and compares to the stamped
 *  SubmissionHash — the audit-response / spot-check tool. `match:false` means
 *  the stored responses / signature were altered after submission. */
function verifyFormSubmissionIntegrity_(token) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { error: 'Manager access required.' };
    token = String(token || '').trim();
    if (!token) return { error: 'No token provided.' };
    const located = findFormSubmissionRow_(getOrCreateFormSubmissionsSheet_(), token);
    if (!located) return { found: false, error: 'No submission found for that token.' };
    const row = located.row;
    const stored = String(row[FS.SUBMISSION_HASH] || '');
    if (!stored) return { found: true, legacy: true, match: null,
      message: 'This submission predates integrity hashing — no stored hash to verify.' };
    const recomputed = computeFormSubmissionHash_(
      String(row[FS.FORM_DATA] || ''), String(row[FS.SIGNATURE_DATA] || ''),
      String(row[FS.TOKEN] || ''), String(row[FS.CONSENT_VERSION] || ''));
    return { found: true, match: recomputed === stored, storedHash: stored,
      recomputedHash: recomputed, submittedAt: formTokenIsoString_(row[FS.SUBMITTED_AT]) };
  } catch (err) { return { error: err.message }; }
}
/** "Verified record" block appended to the in-app submission card: the
 *  Certificate of Completion summary + a live integrity indicator. Every value
 *  esc_'d (INV-89). */
function buildFormCertHtml_(cert, hashMatch) {
  if (!cert) return '';
  const P = CN_EMAIL_PALETTE;
  const rows = [
    ['Submitted', cert.submittedAt || '—'],
    ['Opened', cert.openedAt || '—'],
    ['Consent version', cert.consentVersion || '—'],
    ['Recipient', (cert.recipientName ? cert.recipientName + ' · ' : '') + (cert.recipientEmail || '—')],
    ['Content hash', cert.submissionHash ? (String(cert.submissionHash).substring(0, 16) + '…') : '—'],
  ];
  const integrity = hashMatch === true
    ? '<span style="color:' + P.good + ';font-weight:600;">&#10003; Integrity verified (hash matches)</span>'
    : hashMatch === false
      ? '<span style="color:' + P.danger + ';font-weight:600;">&#9888; Hash MISMATCH — record may have been altered</span>'
      : '<span style="color:' + P.muted + ';">Integrity hash not available for this record</span>';
  return '<div style="margin-top:16px;border-top:1px solid ' + P.line + ';padding-top:12px;">' +
    '<div style="font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:' + P.muted + ';margin-bottom:6px;">Record (Certificate of Completion)</div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:12px;color:' + P.ink + ';">' +
    rows.map(function (r) { return '<tr><td style="padding:2px 10px 2px 0;color:' + P.muted + ';white-space:nowrap;vertical-align:top;">' + esc_(r[0]) + '</td><td style="padding:2px 0;">' + esc_(r[1]) + '</td></tr>'; }).join('') +
    '</table><div style="margin-top:8px;font-size:12px;">' + integrity + '</div></div>';
}
function buildFormSubmissionResult_(tLocated, token) {
  const formType = String(tLocated.row[FT.FORM_TYPE] || '').trim();
  let formName = formType;
  const catalog = CONFIG.CALL_NOTES.FORM_CATALOG || [];
  for (let i = 0; i < catalog.length; i++) {
    if (catalog[i].id === formType) { formName = catalog[i].name; break; }
  }
  const recipientName  = String(tLocated.row[FT.RECIPIENT_NAME] || '');
  const recipientEmail = String(tLocated.row[FT.RECIPIENT_EMAIL] || '');
  const status = String(tLocated.row[FT.STATUS] || '').trim().toLowerCase();

  if (status !== 'submitted') {
    return { submitted: false, status, formType, formName, recipientName, recipientEmail };
  }

  // Bounded lookup (L9 pattern) — token-column scan + one-row fetch instead of
  // reading every submission's responses + signature.
  const sLocated = findFormSubmissionRow_(getOrCreateFormSubmissionsSheet_(), token);
  if (sLocated) {
    const sRow = sLocated.row;
    let formData = {};
    try { formData = JSON.parse(sRow[FS.FORM_DATA]) || {}; } catch (_) {}
    const fields = Object.keys(formData).map(function (k) {
      return { key: k, label: humanizeFormFieldKey_(k), value: formData[k] };
    });
    const signature = String(sRow[FS.SIGNATURE_DATA] || '');
    // Forms-hardening: parse the stored Certificate of Completion + verify the
    // tamper hash live, then append a "verified record" block to the card.
    let cert = null;
    try { cert = JSON.parse(sRow[FS.CERTIFICATE]); } catch (_) {}
    const storedHash = String(sRow[FS.SUBMISSION_HASH] || '');
    let hashMatch = null;
    if (storedHash) {
      const recomputed = computeFormSubmissionHash_(
        String(sRow[FS.FORM_DATA] || ''), signature,
        String(sRow[FS.TOKEN] || ''), String(sRow[FS.CONSENT_VERSION] || ''));
      hashMatch = (recomputed === storedHash);
    }
    return {
      submitted: true,
      formType, formName, recipientName,
      recipientEmail: String(sRow[FS.RECIPIENT_EMAIL] || recipientEmail),
      submittedAt: formTokenIsoString_(sRow[FS.SUBMITTED_AT]),   // L-5 — coercion-safe (a coercing FORMS_SS_ID returned a Date blob)
      fields,
      hasSignature: !!signature,
      signature,
      consentVersion: String(sRow[FS.CONSENT_VERSION] || ''),
      integrityVerified: hashMatch,
      // Pre-rendered branded card (responses table + signature + record block)
      // so the in-app viewer matches the submission email. Safe to innerHTML —
      // esc_-escaped.
      submissionHtml: buildFormSubmissionCardHtml_(formData, signature) + buildFormCertHtml_(cert, hashMatch),
    };
  }
  // Token says submitted but no row found — treat as not-yet-available.
  return { submitted: false, status, formType, formName, recipientName, recipientEmail };
}
/** Humanizes a form-field key (id) into a display label: splits snake/kebab/
 *  camelCase and title-cases. Used by the in-app form-submission viewers. */
function humanizeFormFieldKey_(k) {
  return String(k || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}
/** Renders a form-submission value (string / number / boolean / array / nested
 *  object) into a human-readable plain string for the email + PDF render. */
function formatFormFieldValue_(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) {
    return v.map(function (x) { return formatFormFieldValue_(x); }).join(', ');
  }
  if (typeof v === 'object') {
    return Object.keys(v).map(function (k) {
      return humanizeFormFieldKey_(k) + ': ' + formatFormFieldValue_(v[k]);
    }).join('; ');
  }
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  return String(v);
}
/** Builds a branded, stylized HTML representation of a completed fillable form
 *  — used as the rep-notification email body and as the source for the
 *  best-effort PDF attachment. Mirrors the CN_EMAIL_PALETTE aesthetic so the
 *  completed form looks continuous with the rest of the tooling. Every field is
 *  `esc_`-escaped (these values come from an external, unauthenticated form
 *  submission). `embedSignatureImg`: true for the PDF (embeds the signature
 *  data URI); false for the email body (Gmail strips data: <img>, so the email
 *  carries the signature as a separate PNG attachment instead). */
/** Shared responses-table renderer (navy header + one row per field) used by
 *  both the submission email body and the in-app submission card. Every value
 *  is `esc_`-escaped — these come from an external, unauthenticated form
 *  submission. */
function buildFormSubmissionTableHtml_(sanitizedData) {
  const P = CN_EMAIL_PALETTE;
  const rows = Object.keys(sanitizedData || {}).map(function (k) {
    return '<tr>' +
      '<td style="padding:8px 12px;border-top:1px solid ' + P.line + ';font-weight:600;width:38%;color:' + P.brand + ';vertical-align:top;">' +
        esc_(humanizeFormFieldKey_(k)) + '</td>' +
      '<td style="padding:8px 12px;border-top:1px solid ' + P.line + ';color:' + P.ink + ';">' +
        cnNlBr_(esc_(formatFormFieldValue_(sanitizedData[k]))) + '</td>' +
    '</tr>';
  }).join('');
  return '<table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid ' + P.line + ';border-radius:6px;overflow:hidden;">' +
    '<tr style="background:' + P.brand + ';color:' + P.paperCard + ';"><td colspan="2" style="padding:10px 14px;text-align:center;font-weight:600;letter-spacing:.04em;text-transform:uppercase;font-size:12px;">Submitted Responses</td></tr>' +
    rows +
  '</table>';
}
/** Signature block for the submission render. `embed=true` inlines the PNG via
 *  its data URI (fine in the web-app iframe + the PDF converter); `embed=false`
 *  shows an "attached as signature.png" note (Gmail strips data: <img>). */
function buildFormSubmissionSigHtml_(signatureDataUrl, embed) {
  if (!signatureDataUrl) return '';
  const P = CN_EMAIL_PALETTE;
  return '<div style="margin-top:16px;">' +
    '<div style="font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:' + P.muted + ';margin-bottom:6px;">Signature</div>' +
    (embed
      ? '<img src="' + esc_(signatureDataUrl) + '" alt="Signature" style="max-width:320px;width:100%;border:1px solid ' + P.line + ';border-radius:6px;background:#fff;">'
      : '<div style="font-size:13px;color:' + P.ink + ';">Captured — attached to this email as <strong>signature.png</strong>.</div>') +
  '</div>';
}
/** In-app submission card (no email shell / logo / footer — the read-only modal
 *  supplies its own title + "from … · when" sub-line). Signature is embedded
 *  since the web-app iframe renders data URIs. Returned to the client as
 *  result.submissionHtml and injected via innerHTML — safe because every field
 *  is `esc_`-escaped, the same discipline as the email-preview path (INV-89). */
function buildFormSubmissionCardHtml_(sanitizedData, signatureDataUrl) {
  const P = CN_EMAIL_PALETTE;
  return '<div style="font-family:\'Inter\',-apple-system,Helvetica,Arial,sans-serif;color:' + P.ink + ';">' +
    buildFormSubmissionTableHtml_(sanitizedData) +
    buildFormSubmissionSigHtml_(signatureDataUrl, true) +
  '</div>';
}
function buildFormSubmissionHtml_(formName, recipientName, recipientEmail, submittedAt, sanitizedData, signatureDataUrl, embedSignatureImg) {
  const P = CN_EMAIL_PALETTE;
  const fromLine = recipientName
    ? esc_(recipientName) + ' (' + esc_(recipientEmail) + ')'
    : esc_(recipientEmail);
  return (
    '<div style="background:' + P.paper + ';padding:24px;font-family:\'Inter\',-apple-system,Helvetica,Arial,sans-serif;color:' + P.ink + ';">' +
      '<div style="max-width:680px;margin:0 auto;background:' + P.paperCard + ';border:1px solid ' + P.line + ';border-radius:10px;padding:24px 26px;">' +
        '<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:18px;"><tr>' +
          '<td style="padding-bottom:14px;border-bottom:2px solid ' + P.brand + ';">' +
            '<img src="' + P.logoUrl + '" alt="UMS" style="height:46px;display:block;border:0;outline:none;"></td>' +
        '</tr></table>' +
        '<h2 style="margin:0 0 4px;font-family:\'Inter Tight\',\'Inter\',sans-serif;font-size:20px;font-weight:600;color:' + P.brand + ';">' + esc_(formName) + '</h2>' +
        '<p style="margin:0 0 14px;color:' + P.muted + ';font-size:13px;">Completed by ' + fromLine + ' &middot; ' + esc_(submittedAt) + '</p>' +
        buildFormSubmissionTableHtml_(sanitizedData) +
        buildFormSubmissionSigHtml_(signatureDataUrl, embedSignatureImg) +
      '</div>' +
      '<div style="text-align:center;margin-top:14px;font-family:\'IBM Plex Mono\',ui-monospace,monospace;font-size:10px;color:' + P.muted + ';letter-spacing:.12em;text-transform:uppercase;">UMS Team Tools · Fillable Forms</div>' +
    '</div>'
  );
}
/** Decodes a `data:image/png;base64,...` signature data URL into a PNG Blob,
 *  or null if absent/malformed. */
function signatureDataUrlToBlob_(signatureDataUrl, name) {
  try {
    const s = String(signatureDataUrl || '');
    const comma = s.indexOf(',');
    const b64 = comma >= 0 ? s.substring(comma + 1) : s;
    if (!b64) return null;
    const bytes = Utilities.base64Decode(b64);
    return Utilities.newBlob(bytes, 'image/png', name || 'signature.png');
  } catch (e) {
    console.warn('signatureDataUrlToBlob_ failed: ' + e.message);
    return null;
  }
}
/** B2 — best-effort notice to the creating rep that a recipient tried to
 *  submit a form but it could not be saved (size caps, M3). Closes the loop so
 *  a silently-rejected submission isn't invisible to the rep. PHI-free beyond
 *  the recipient address the rep already has (they sent the form); never throws
 *  (INV-14) — the recipient response is unaffected. No-op without a createdBy. */
function notifyRepOfFailedSubmission_(createdBy, recipientEmail, formType, reason) {
  if (!createdBy) return;
  try {
    appSendMail_({
      to: createdBy,
      subject: 'Form submission could not be saved',
      body:
        'A recipient tried to submit a form you sent, but it could not be saved.\n\n' +
        'Form: ' + formType + '\n' +
        'Recipient: ' + recipientEmail + '\n' +
        'Reason: ' + reason + '.\n\n' +
        'The form link is still active — the recipient was asked to retry ' +
        '(e.g. with a simpler signature or shorter responses). No action is ' +
        'needed unless they report continued trouble.',
    });
  } catch (e) { console.warn('notifyRepOfFailedSubmission_ failed: ' + e.message); }
}
/** Sends the rep-notification email for a completed fillable form: a stylized
 *  HTML body rendering all responses, the signature as a PNG attachment, and a
 *  best-effort PDF of the whole completed form. Each sub-step degrades
 *  gracefully — the recipient's submission already succeeded, so this is a
 *  convenience notice that must never throw the caller. */
function notifyRepOfFormSubmission_(createdBy, formType, recipientName, recipientEmail, submittedAt, sanitizedData, signatureData) {
  const formCat = CONFIG.CALL_NOTES.FORM_CATALOG || [];
  let formName = formType;
  for (let i = 0; i < formCat.length; i++) {
    if (formCat[i].id === formType) { formName = formCat[i].name; break; }
  }

  const htmlBody = buildFormSubmissionHtml_(formName, recipientName, recipientEmail,
    submittedAt, sanitizedData, signatureData, false);

  // Plain-text fallback — same content, no styling.
  const textLines = ['A form submission was received.', '',
    'Form:      ' + formName,
    'From:      ' + (recipientName ? recipientName + ' (' + recipientEmail + ')' : recipientEmail),
    'Submitted: ' + submittedAt, '', 'Responses:'];
  Object.keys(sanitizedData || {}).forEach(function (k) {
    textLines.push('  ' + humanizeFormFieldKey_(k) + ': ' + formatFormFieldValue_(sanitizedData[k]));
  });
  textLines.push('',
    'The completed form is attached as a PDF; the signature is attached as a PNG.',
    'You can also open it from the form pill on the linked call note in the web app.', '',
    '— UMS Team Tools (automated)');
  const textBody = textLines.join('\n');

  const attachments = [];
  // Signature as a standalone PNG (renders reliably; Gmail blocks data: <img>
  // in the email body).
  const sigBlob = signatureDataUrlToBlob_(signatureData, 'signature.png');
  if (sigBlob) attachments.push(sigBlob);
  // Best-effort PDF of the whole completed form (signature embedded).
  try {
    const htmlForPdf = buildFormSubmissionHtml_(formName, recipientName, recipientEmail,
      submittedAt, sanitizedData, signatureData, true);
    const stamp = String(submittedAt).replace(/[^\d]/g, '').substring(0, 8);
    const pdfName = (formName.replace(/[^\w]+/g, '_') || 'Form') + '_' + stamp + '.pdf';
    const pdf = Utilities.newBlob(htmlForPdf, 'text/html', 'form.html')
      .getAs('application/pdf').setName(pdfName);
    attachments.push(pdf);
  } catch (pdfErr) {
    console.warn('notifyRepOfFormSubmission_: PDF render failed (sending without it): ' + pdfErr.message);
  }

  const opts = {
    to: createdBy,
    subject: 'Form Submission Received: ' + formName + ' from ' + (recipientName || recipientEmail),
    body: textBody,
    htmlBody: htmlBody,
  };
  if (attachments.length > 0) opts.attachments = attachments;
  appSendMail_(opts);
}


// ── Form-data retention (PHI minimization) ──────────────────────────────────
// purgeExpiredFormData deletes FormSubmissions (responses + signatures) and
// FormTokens (recipient + prefill data) rows older than the configured
// retention window. DISABLED by default (FORM_DATA_RETENTION_DAYS = 0). The
// purge is irreversible — an unparseable/blank date is NEVER deleted
// (fail-safe). Reachable via google.script.run (top-level for the trigger), so
// it asserts a manager caller (INV-44). Writes a PHI-free FormDataPurge audit
// row with the counts removed.
/** Resolves the retention window in days: Script Property
 *  FORM_DATA_RETENTION_DAYS first, then CONFIG. 0 / negative / unparseable → 0
 *  (disabled). */
function getFormRetentionDays_() {
  const prop = PropertiesService.getScriptProperties().getProperty('FORM_DATA_RETENTION_DAYS');
  const raw = (prop != null && prop !== '') ? prop : (CONFIG.FORM_DATA_RETENTION_DAYS || 0);
  const v = parseInt(raw, 10);
  return (isNaN(v) || v < 0) ? 0 : v;
}
/** Parses a retention date cell ("yyyy-MM-dd'T'HH:mm:ss" in CONFIG.TIMEZONE, or
 *  a coerced Date) to epoch ms. Returns null on blank/unparseable input so such
 *  a row is never considered "old" and is never deleted. */
function parseRetentionDateMs_(val) {
  if (val instanceof Date) return val.getTime();
  const s = String(val || '').trim();
  if (!s) return null;
  try {
    return Utilities.parseDate(s, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss").getTime();
  } catch (_) {
    const t = Date.parse(s);
    return isNaN(t) ? null : t;
  }
}
function purgeExpiredFormData() {
  // Top-level (time-trigger target) → reachable via google.script.run, so gate
  // it: a purge is destructive and must not be firable by a non-manager rep.
  assertManagerCaller_('purgeExpiredFormData');
  try {
    const days = getFormRetentionDays_();
    if (!days) {
      Logger.log('purgeExpiredFormData: retention disabled (FORM_DATA_RETENTION_DAYS=0) — nothing purged.');
      return;
    }
    const cutoffMs = Date.now() - days * 86400000;
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    let subsRemoved = 0, tokensRemoved = 0;
    try {
      subsRemoved = purgeSheetRowsOlderThan_(getOrCreateFormSubmissionsSheet_(), FS.SUBMITTED_AT, cutoffMs);
      tokensRemoved = purgeSheetRowsOlderThan_(getOrCreateFormTokensSheet_(), FT.CREATED_AT, cutoffMs);
    } finally {
      lock.releaseLock();
    }
    writeAuditLog_(_SYSTEM_AUDIT_EMP_, 'FormDataPurge', '', '', false, 0,
      `retentionDays=${days}; submissionsRemoved=${subsRemoved}; tokensRemoved=${tokensRemoved}`);
    Logger.log(`purgeExpiredFormData: removed ${subsRemoved} submission(s) + ${tokensRemoved} token(s) older than ${days} day(s).`);
  } catch (err) {
    Logger.log('purgeExpiredFormData failed: ' + err.message);
  }
}
/** Public-ish resolve page served by doGet?resolve=<token>. The token is the
 *  credential (in the email to the dept); we record the clicker if Google can
 *  identify them. A simple branded confirmation page (no internal partials). */
function serveResolvePage_(token) {
  const P = CN_EMAIL_PALETTE;
  let heading, msg;
  try {
    const by = getActiveUserEmail_();
    if (!by) {
      // Anonymous / unidentifiable visitor (the ANYONE_ANONYMOUS executeAs case):
      // don't resolve unattributed — ask them to open it from their work account.
      heading = 'Sign in to confirm';
      msg = 'Open this link while signed in to your @umsupply.com account so we can record who resolved the request.';
    } else {
      const res = markDeptRequestResolved_(token, by, 'email');
      if (!res.found) { heading = 'Request not found'; msg = 'This link is invalid or the request was removed.'; }
      else if (res.already) { heading = 'Already resolved'; msg = 'This was already marked resolved' + (res.resolvedBy ? ' by ' + res.resolvedBy : '') + (res.resolvedAt ? ' on ' + res.resolvedAt : '') + '.'; }
      else { heading = 'Marked resolved — thank you!'; msg = 'The ' + (res.dept || 'department') + ' request is now recorded as resolved (' + by + ').'; }
    }
  } catch (e) { heading = 'Something went wrong'; msg = 'Could not record the resolution. Please try again.'; }
  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:48px auto;padding:28px;border:1px solid ' + P.line + ';border-radius:12px;text-align:center;color:' + P.ink + ';">' +
      '<div style="font-size:40px;color:' + P.accent + ';line-height:1;">&#10003;</div>' +
      '<h2 style="font-size:20px;margin:12px 0 8px;color:' + P.brand + ';">' + esc_(heading) + '</h2>' +
      '<p style="font-size:14px;color:' + P.muted + ';margin:0;">' + esc_(msg) + '</p>' +
      '<p style="font-size:11px;color:' + P.muted + ';margin-top:20px;">UMS Team Tools</p>' +
    '</div>';
  return HtmlService.createHtmlOutput(html).setTitle('Mark resolved');
}
