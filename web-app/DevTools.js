/**
 * DevTools.js — dev-instance-only helpers for the blue-green setup.
 *
 * These run in the Apps Script editor of the SEPARATE dev project ONLY. Every
 * function is hard-guarded by assertDevInstance_() (requires INSTANCE_LABEL set
 * AND INSTANCE_IS_PROD not 'true'), so a misfire can never mutate the team's
 * live sheets. This file deploys to prod along with everything else, but every
 * function refuses to run there. See docs/deployment.md.
 *
 * Workflow reminder: you SEED dev data by manually copying the prod ADP
 * spreadsheet in Google Drive (File → Make a copy) and pointing the dev
 * project's ADP_SS_ID at the copy. Then run devScrubRoster_() ONCE to make that
 * copied roster dev-safe. PHI stores (Intake / Forms / per-rep Notes / HR) are
 * NOT copied — they start EMPTY and you generate test data by using dev.
 */

/**
 * Make a copied-from-prod roster safe for the dev instance:
 *   • every employee email EXCEPT `keeperEmail` is replaced with a
 *     `…@example.invalid` alias, so dev's per-employee emails (PTO decisions,
 *     missed-punch alerts, etc.) can NEVER reach a real colleague;
 *   • column L (CallNotesSheetId) is BLANKED for everyone except the keeper, so
 *     no dev enrollment points at a real per-rep PHI Sheet;
 *   • the keeper row is forced isManager = TRUE so you can drive the whole app.
 *
 * `keeperEmail` = the Google account you log into dev with (usually you).
 * Run it from the editor through `devScrubRosterForMe` (below) — the editor's
 * Run button passes no arguments and hides functions ending in `_`, so this
 * one cannot be run directly (CORE-06, cycle 23).
 * Idempotent — re-running only re-anonymizes and is safe.
 */
function devScrubRoster_(keeperEmail) {
  assertDevInstance_('devScrubRoster_');
  const keep = String(keeperEmail || '').toLowerCase().trim();
  if (!keep || keep.indexOf('@') < 1) {
    throw new Error('Pass the email you log into dev with, e.g. devScrubRoster_("you@yourdomain.com").');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getAdpSS_().getSheetByName(CONFIG.EMPLOYEE_TAB);
    if (!sheet) throw new Error('No Employees tab on the dev ADP sheet — copy the prod ADP spreadsheet first.');
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) { Logger.log('devScrubRoster_: no employee rows.'); return; }
    const n = lastRow - 1;
    const emailCol = sheet.getRange(2, EMP.EMAIL + 1, n, 1).getValues();       // col A
    const mgrCol   = sheet.getRange(2, EMP.IS_MANAGER + 1, n, 1).getValues();  // col G
    const cnCol    = sheet.getRange(2, EMP.CALL_NOTES_SHEET_ID + 1, n, 1).getValues(); // col L
    let anonymized = 0, keeperRows = 0;
    for (let i = 0; i < n; i++) {
      const email = String(emailCol[i][0] || '').toLowerCase().trim();
      if (!email) continue;
      if (email === keep) {
        keeperRows++;
        mgrCol[i][0] = 'TRUE';   // ensure you can drive manager/admin features
        continue;                // keep your email + your per-rep Sheet id
      }
      emailCol[i][0] = 'dev-disabled+row' + (i + 2) + '@example.invalid';
      cnCol[i][0] = '';          // never point a dev rep at a real per-rep PHI Sheet
      anonymized++;
    }
    sheet.getRange(2, EMP.EMAIL + 1, n, 1).setValues(sheetSafeRows_(emailCol));
    sheet.getRange(2, EMP.IS_MANAGER + 1, n, 1).setValues(sheetSafeRows_(mgrCol));
    sheet.getRange(2, EMP.CALL_NOTES_SHEET_ID + 1, n, 1).setValues(sheetSafeRows_(cnCol));
    invalidateRosterCache_();
    Logger.log('devScrubRoster_: anonymized ' + anonymized + ' email(s), kept ' + keeperRows +
      ' keeper row(s) for ' + keep + '. PHI stores untouched (they start empty on dev).');
  } finally {
    lock.releaseLock();
  }
}

/**
 * Print the dev instance's configured stores + recipient addresses so you can
 * eyeball that NOTHING points at prod before you start creating notes/emails.
 * Read-only; still dev-guarded so it's never a prod info-dump surface.
 */
function devShowConfig_() {
  assertDevInstance_('devShowConfig_');
  const p = PropertiesService.getScriptProperties();
  const keys = ['INSTANCE_LABEL', 'INSTANCE_IS_PROD', 'ADP_SS_ID', 'CDR_SS_ID', 'INTAKE_SS_ID',
    'KB_SS_ID', 'HR_DOCS_SS_ID', 'FORMS_SS_ID', 'DEPT_REQUESTS_SS_ID', 'QA_SS_ID', 'KB_IMAGES_FOLDER_ID',
    'MANAGER_EMAILS', 'ADMIN_EMAILS', 'CN_DEPARTMENT_EMAILS',
    'INTAKE_SALES_EMAIL', 'INTAKE_SLEEP_EMAIL', 'INTAKE_BCC_EMAIL', 'INTAKE_ALL_AGENTS_EMAIL',
    'SPANISH_INBOX_MEMBERS', 'SPANISH_INBOX_ADDRESS', 'MAIL_BCC_ALL', 'REP_SENDER_FROM'];
  Logger.log('── DEV instance config (verify none point at prod) ──');
  keys.forEach(function (k) { Logger.log(k + ' = ' + devConfigValueLine_(k, p.getProperty(k))); });
}
/** CORE-06 (cycle 23) — PURE: what "(unset)" MEANS for a key. A recipient key
 *  that is unset does not mean "no mail": it falls back to CONFIG's REAL
 *  production addresses, so a dev user reading "(unset)" could still email
 *  real departments. Say so on the line itself. */
function devConfigValueLine_(key, value) {
  if (value) return value;
  const FALLS_BACK = {
    CN_DEPARTMENT_EMAILS: 'CONFIG\'s REAL department addresses',
    INTAKE_SALES_EMAIL: 'CONFIG\'s REAL sales address', INTAKE_SLEEP_EMAIL: 'CONFIG\'s REAL sleep address',
    INTAKE_BCC_EMAIL: 'CONFIG\'s REAL intake BCC', INTAKE_ALL_AGENTS_EMAIL: 'CONFIG\'s REAL all-agents address',
    SPANISH_INBOX_ADDRESS: 'CONFIG\'s REAL Spanish inbox',
  };
  return FALLS_BACK[key] ? '(unset — FALLS BACK to ' + FALLS_BACK[key] + '; set it to your inbox on dev)' : '(unset)';
}

// ── Editor entry points (CORE-06, cycle 23) ────────────────────────────────
// The editor's Run button calls a function with NO arguments and does not
// list functions ending in `_`, so the two helpers above could not be run as
// the docs said. These two can. They are reachable through google.script.run
// like any public function (g143), so the FIRST statement is the owner check
// (the Tests.js rule) and the dev-instance guard follows inside the helper.

/** Run from the dev editor: scrub the roster, keeping YOUR account (the one
 *  running the editor) as the keeper. */
function devScrubRosterForMe() {
  _assertSuiteCaller_('devScrubRosterForMe');
  let me = '';
  try { me = Session.getEffectiveUser().getEmail(); } catch (e) { me = ''; }
  devScrubRoster_(me);
}
/** Run from the dev editor: print the dev config (see devShowConfig_). */
function devShowConfig() {
  _assertSuiteCaller_('devShowConfig');
  devShowConfig_();
}
