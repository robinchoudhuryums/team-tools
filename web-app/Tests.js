// ════════════════════════════════════════════════════════════════════════════
//  UMS TIME CLOCK  —  Tests.gs
//   Automated test suite. Paste this file into the GAS project alongside
//   Code.gs. Requires Code.gs v11+ (for the getActiveUserEmail_ hook).
//
//   Entry points:
//     runAllTests()   — full suite on a TEST copy of the spreadsheet
//     runSmokeTests() — pure-logic subset, safe to run on production
//     runSingleTest(name)  — debug one test by name
//
//   Helpers (call manually if needed):
//     setupTestEnvironment() — ensures test employee rows exist
//     cleanupTestData()      — removes all TEST_* rows
// ════════════════════════════════════════════════════════════════════════════


// ── Test identities (rows added to Employees sheet by setupTestEnvironment) ──
const _TEST_INDIA_ID    = 'TEST_IN_001';
const _TEST_INDIA_EMAIL = 'do-not-send-india@example.invalid';
const _TEST_PH_ID       = 'TEST_PH_001';
const _TEST_PH_EMAIL    = 'do-not-send-ph@example.invalid';
const _TEST_MGR_ID      = 'TEST_US_001';
const _TEST_MGR_EMAIL   = 'do-not-send-mgr@example.invalid';

const _TEST_INITIAL_ANNUAL = 15;
const _TEST_INITIAL_SICK   = 10;

// Roster NAME of the India test employee — must match the name written in
// setupTestEnvironment (CDR rows match agents by name, not id).
const _TEST_INDIA_NAME = 'Test India User';
const _TEST_PH_NAME    = 'Test PH User';

var _TEST_CN_SS_ID = null;  // populated by setupTestEnvironment; the per-rep CN Sheet for _TEST_INDIA

// CDR fixture (Metrics integration tests). _TEST_CDR_SS_ID points at a test
// "DQE Historical Data" spreadsheet provisioned by setupTestEnvironment;
// _TEST_OVERRIDE_CDR_SS_ID redirects getCdrSS_ at it (consumed in Code.js).
// _TEST_CDR_DATE is a fixed past weekday so the fixture rows never collide
// with "today" (note counts) or the real dashboard.
var _TEST_CDR_SS_ID = null;
var _TEST_OVERRIDE_CDR_SS_ID = null;
const _TEST_CDR_DATE = '2026-05-15';  // a Friday, in the past relative to test runs

// Intake fixture spreadsheet (Offerings tab) for the intake endpoint
// integration tests; _TEST_OVERRIDE_INTAKE_SS_ID redirects getIntakeSS_ at it
// (consumed in Code.js). Reused across runs via Script Property TEST_INTAKE_SS_ID.
var _TEST_INTAKE_SS_ID = null;
var _TEST_OVERRIDE_INTAKE_SS_ID = null;
var _TEST_OVERRIDE_HRDOCS_SS_ID = null;   // consumed by Code.js:getHrDocsSS_ (T3)

// Sentinel dates used by integration tests. Cleanup keys off these.
const _TEST_DATE_RECENT = (() => {
  const d = new Date(); d.setDate(d.getDate() - 3);
  return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
})();
const _TEST_DATE_FUTURE = (() => {
  const d = new Date(); d.setDate(d.getDate() + 30);
  return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
})();
const _TEST_DATE_OLD = (() => {
  const d = new Date(); d.setDate(d.getDate() - 14);
  return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
})();
const _TEST_DATE_VERY_OLD = (() => {
  const d = new Date(); d.setDate(d.getDate() - 20);
  return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
})();


// ════════════════════════════════════════════════════════════════════════════
//  TEST FRAMEWORK
// ════════════════════════════════════════════════════════════════════════════

var _TEST_OVERRIDE_EMAIL = null;   // consumed by Code.gs:getActiveUserEmail_
var _TEST_STATE = null;
var _SMOKE_ONLY = false;

function _resetState() {
  _TEST_STATE = { results: [], pass: 0, fail: 0, skip: 0, start: new Date() };
}

function _test(name, fn) {
  const start = new Date();
  try {
    fn();
    const ms = new Date() - start;
    _TEST_STATE.results.push({ name, status: 'PASS', ms });
    _TEST_STATE.pass++;
    Logger.log(`✓ ${name} (${ms}ms)`);
  } catch (e) {
    const ms = new Date() - start;
    if (e && e._isSkip) {
      // F(cycle-8 M-14): a mid-body skip (fixture/config unavailable) records
      // SKIP, never PASS — 13 sites used to `_assertTrue(true, '…skipped')`,
      // inflating the pass count and hiding fixture rot (worst case: the S1.1
      // ADP-tz tripwire read GREEN exactly when the ADP sheet was unreachable).
      _TEST_STATE.results.push({ name, status: 'SKIP', ms, error: e.message });
      _TEST_STATE.skip++;
      Logger.log(`⊘ ${name} (skipped — ${e.message})`);
      return;
    }
    _TEST_STATE.results.push({ name, status: 'FAIL', ms, error: e.message, stack: e.stack });
    _TEST_STATE.fail++;
    Logger.log(`✗ ${name} (${ms}ms)\n   ${e.message}`);
  }
}

/** F(cycle-8 M-14): abort the current test as SKIPPED (not passed). Use when a
 *  fixture / optional config the test needs is unavailable — a skip is honest
 *  ("didn't verify"), a green PASS is a lie the summary can't distinguish. */
function _skipTest(reason) {
  const e = new Error(reason || 'precondition unavailable');
  e._isSkip = true;
  throw e;
}

function _smokeTest(name, fn) { _test(name, fn); }

function _integrationTest(name, fn) {
  if (_SMOKE_ONLY) {
    _TEST_STATE.results.push({ name, status: 'SKIP', ms: 0 });
    _TEST_STATE.skip++;
    Logger.log(`⊘ ${name} (skipped — integration)`);
    return;
  }
  _test(name, fn);
}

function _asUser(email, fn) {
  _TEST_OVERRIDE_EMAIL = email;
  invalidateRosterCache_();  // force re-read so EMP.* lookups see fresh data
  try { return fn(); }
  finally {
    _TEST_OVERRIDE_EMAIL = null;
    invalidateRosterCache_();
  }
}

/** Runs `fn` with getCdrSS_ redirected at the test CDR fixture, with the CDR
 *  in-memory caches reset and the CacheService entries for _TEST_CDR_DATE
 *  cleared so a warm cache (from a prior run or the real dashboard) can't leak
 *  stale data into the assertions. */
function _withTestCdr_(fn) {
  _TEST_OVERRIDE_CDR_SS_ID = _TEST_CDR_SS_ID;
  _resetCdrCaches_();
  _clearCdrCacheForDate_(_TEST_CDR_DATE);
  try { return fn(); }
  finally {
    _TEST_OVERRIDE_CDR_SS_ID = null;
    _resetCdrCaches_();
  }
}

/** Runs `fn` with getIntakeSS_ redirected at the test Intake fixture. Resets
 *  the per-execution Offerings cache on entry AND exit so a warm cache can't
 *  leak fixture rows into real reads (or vice versa). */
function _withTestIntake_(fn) {
  _TEST_OVERRIDE_INTAKE_SS_ID = _TEST_INTAKE_SS_ID;
  _intakeOfferingsCache = null;
  try { return fn(); }
  finally {
    _TEST_OVERRIDE_INTAKE_SS_ID = null;
    _intakeOfferingsCache = null;
  }
}

/** Runs `fn` with the CN_FEATURE_FLAGS Script Property overridden (the given
 *  keys merged over whatever is currently stored), restoring the prior
 *  property afterwards. Needed because the FEATURE_FLAGS registry defaults
 *  snapshot CONFIG.* at load time — mutating CONFIG at runtime no longer
 *  affects getFlag_ reads (the pre-flag-migration test idiom). */
function _withFeatureFlags_(overrides, fn) {
  const props = PropertiesService.getScriptProperties();
  const saved = props.getProperty('CN_FEATURE_FLAGS');
  let base = {};
  if (saved) { try { base = JSON.parse(saved) || {}; } catch (e) { base = {}; } }
  props.setProperty('CN_FEATURE_FLAGS', JSON.stringify(Object.assign({}, base, overrides)));
  try { return fn(); }
  finally {
    if (saved == null) props.deleteProperty('CN_FEATURE_FLAGS');
    else props.setProperty('CN_FEATURE_FLAGS', saved);
  }
}

/** Resets the session-level CDR in-memory caches (name-map + column-validation
 *  flags) so they re-read whichever sheet getCdrSS_ currently points at. */
function _resetCdrCaches_() {
  try {
    _cdrNameMapCache = null;
    _cdrNameMapExpiry = 0;
    _cdrColumnsValidated = false;
    _cdrColumnWarning = null;
  } catch (e) {}
}

/** Removes the CacheService CDR-metrics entries for a date (both the
 *  single-agent India key and the full-roster team key), since
 *  getCdrAgentMetrics_ caches whole results keyed by roster-hash + date. */
function _clearCdrCacheForDate_(date) {
  try {
    const cache = CacheService.getScriptCache();
    const keys = [
      CONFIG.CDR_CACHE_KEY + ':' + cdrRosterHash_([_TEST_INDIA_NAME]) + ':' + date + ':' + date,
    ];
    const roster = getEmployeeRosterRows_();
    const names = [];
    for (let r = 1; r < roster.length; r++) {
      const n = String(roster[r][EMP.NAME]).trim();
      if (n) names.push(n);
    }
    keys.push(CONFIG.CDR_CACHE_KEY + ':' + cdrRosterHash_(names) + ':' + date + ':' + date);
    cache.removeAll(keys);
  } catch (e) {}
}

// ── Assertions ────────────────────────────────────────────────────────────

function _assertEq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error((msg || 'Assertion failed') +
      `\n  expected: ${e}` +
      `\n  actual:   ${a}`);
  }
}

function _assertEqClose(actual, expected, tolerance, msg) {
  tolerance = (tolerance === undefined) ? 0.001 : tolerance;
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error((msg || 'Numbers not close enough') +
      `\n  expected: ${expected} (±${tolerance})` +
      `\n  actual:   ${actual}`);
  }
}

function _assertTrue(cond, msg) {
  if (!cond) throw new Error(msg || 'Expected truthy, got: ' + cond);
}

function _assertFalse(cond, msg) {
  if (cond) throw new Error(msg || 'Expected falsy, got: ' + cond);
}

function _assertNull(v, msg) {
  if (v !== null && v !== undefined) {
    throw new Error((msg || 'Expected null/undefined') + ', got: ' + JSON.stringify(v));
  }
}

function _assertNotNull(v, msg) {
  if (v === null || v === undefined) {
    throw new Error(msg || 'Expected non-null value');
  }
}

function _assertContains(haystack, needle, msg) {
  if (Array.isArray(haystack) ? !haystack.includes(needle) : !String(haystack).includes(needle)) {
    throw new Error((msg || 'Expected to contain') + `: ${needle}\n  in: ${JSON.stringify(haystack)}`);
  }
}

function _assertSuccess(result, msg) {
  if (!result || result.success !== true) {
    throw new Error((msg || 'Expected success=true') + `\n  result: ${JSON.stringify(result)}`);
  }
}

function _assertFailure(result, errSubstring, msg) {
  if (!result || result.success !== false) {
    throw new Error((msg || 'Expected success=false') + `\n  result: ${JSON.stringify(result)}`);
  }
  if (errSubstring && !String(result.error || '').includes(errSubstring)) {
    throw new Error((msg || 'Expected error to contain') +
      `: "${errSubstring}"\n  actual error: "${result.error}"`);
  }
}

function _assertThrows(fn, errSubstring, msg) {
  try { fn(); }
  catch (e) {
    if (errSubstring && !String(e.message || '').includes(errSubstring)) {
      throw new Error((msg || 'Threw wrong error') +
        `\n  expected substring: "${errSubstring}"` +
        `\n  actual: "${e.message}"`);
    }
    return;
  }
  throw new Error(msg || 'Expected function to throw');
}


// ════════════════════════════════════════════════════════════════════════════
//  SETUP / TEARDOWN
// ════════════════════════════════════════════════════════════════════════════

function setupTestEnvironment() {
  assertNotProdInstance_('setupTestEnvironment');   // blue-green guard (see runAllTests)
  const sheet = getAdpSS_().getSheetByName(CONFIG.EMPLOYEE_TAB);

  // Ensure column K has a PtoEnabled header so getDataRange() reliably
  // includes column 11 on subsequent reads. Without this, tests that toggle
  // PtoEnabled per row see stale undefined-style reads. Non-destructive:
  // only writes the header if the cell is blank.
  const headerCell = sheet.getRange(1, EMP.PTO_ENABLED + 1);
  if (!String(headerCell.getValue()).trim()) {
    headerCell.setValue('PtoEnabled');
  }

  const rows = sheet.getDataRange().getValues();
  const existingIds = new Set();
  for (let i = 1; i < rows.length; i++) {
    existingIds.add(String(rows[i][EMP.ID]).trim());
  }
  // Email | EmployeeId | EmployeeName | IndividualSheetId | PayCycle | PayCycleAnchor | IsManager | Timezone | AnnualLeaveBalance | SickLeaveBalance
  const testEmps = [
    [_TEST_INDIA_EMAIL, _TEST_INDIA_ID, 'Test India User',    '', 'Monthly',  '',            'FALSE', 'Asia/Kolkata',    _TEST_INITIAL_ANNUAL, _TEST_INITIAL_SICK],
    [_TEST_PH_EMAIL,    _TEST_PH_ID,    'Test PH User',       '', 'Biweekly', '2026-01-02',  'FALSE', 'Asia/Manila',     _TEST_INITIAL_ANNUAL, _TEST_INITIAL_SICK],
    [_TEST_MGR_EMAIL,   _TEST_MGR_ID,   'Test US Manager',    '', 'Biweekly', '2026-01-02',  'TRUE',  'America/Chicago', _TEST_INITIAL_ANNUAL, _TEST_INITIAL_SICK],
  ];
  let added = 0;
  testEmps.forEach(row => {
    if (!existingIds.has(row[EMP.ID])) { sheet.appendRow(row); added++; }
  });

  // Provision a test call-notes Sheet for the India test employee. Creates
  // a new spreadsheet on first run; reuses the existing one on subsequent
  // runs by reading the ID already stored in column L.
  const empRows = sheet.getDataRange().getValues();
  for (let i = 1; i < empRows.length; i++) {
    if (String(empRows[i][EMP.ID]).trim() === _TEST_INDIA_ID) {
      const existingCnId = empRows[i][EMP.CALL_NOTES_SHEET_ID]
        ? String(empRows[i][EMP.CALL_NOTES_SHEET_ID]).trim() : '';
      if (existingCnId) {
        _TEST_CN_SS_ID = existingCnId;
      } else {
        const cnSs = SpreadsheetApp.create('TEST_CallNotes_' + _TEST_INDIA_ID);
        _TEST_CN_SS_ID = cnSs.getId();
        sheet.getRange(i + 1, EMP.CALL_NOTES_SHEET_ID + 1).setValue(_TEST_CN_SS_ID);
      }
      break;
    }
  }
  // Pin the test Sheet's timezone to the ADP sheet's (both create and reuse
  // paths). DateLocal strings are coerced to Dates in the CN sheet's tz but
  // recovered by normalizeDate_ in the ADP tz — a mismatched fixture tz shifts
  // every date-filtered read by a day (count/coverage/getMyCallNotes/digests
  // all silently return nothing). Mirrors provisionCallNotesSheet's tz pin.
  if (_TEST_CN_SS_ID) {
    try {
      const adpTz = getAdpSS_().getSpreadsheetTimeZone();
      const cnSsHandle = SpreadsheetApp.openById(_TEST_CN_SS_ID);
      if (cnSsHandle.getSpreadsheetTimeZone() !== adpTz) {
        cnSsHandle.setSpreadsheetTimeZone(adpTz);
        Logger.log('  CN fixture tz aligned to ADP tz: ' + adpTz);
      }
    } catch (e) { Logger.log('  CN fixture tz align skipped: ' + e.message); }
  }

  // Provision the CDR fixture (best-effort — a hiccup here shouldn't block the
  // rest of the suite; the CDR tests guard on _TEST_CDR_SS_ID).
  try { _setupTestCdrFixture_(); }
  catch (e) { Logger.log('  CDR fixture setup skipped: ' + e.message); }

  // Provision the Intake fixture (same best-effort posture; the intake
  // endpoint tests guard on _TEST_INTAKE_SS_ID).
  try { _setupTestIntakeFixture_(); }
  catch (e) { Logger.log('  Intake fixture setup skipped: ' + e.message); }

  invalidateRosterCache_();
  Logger.log(`setupTestEnvironment: ${added} test employee row(s) added (existing left unchanged).`);
  if (_TEST_CN_SS_ID) Logger.log('  Call-notes test Sheet ID: ' + _TEST_CN_SS_ID);
  if (_TEST_CDR_SS_ID) Logger.log('  CDR fixture Sheet ID: ' + _TEST_CDR_SS_ID);
}

/** Creates (or reuses, via Script Property TEST_CDR_SS_ID) a fixture
 *  spreadsheet with a deterministic "DQE Historical Data" sheet for the
 *  Metrics integration tests. Rows are rebuilt on every setup so the data is
 *  idempotent (cache hits return identical values). All cells are written as
 *  plain text to avoid Sheets' date/duration coercion. */
function _setupTestCdrFixture_() {
  const props = PropertiesService.getScriptProperties();
  const existing = props.getProperty('TEST_CDR_SS_ID');
  let ss = null;
  if (existing) { try { ss = SpreadsheetApp.openById(existing); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('TEST_CDR_Fixture');
    props.setProperty('TEST_CDR_SS_ID', ss.getId());
  }
  _TEST_CDR_SS_ID = ss.getId();

  let sheet = ss.getSheetByName('DQE Historical Data');
  if (!sheet) sheet = ss.insertSheet('DQE Historical Data');
  sheet.clear();
  if (sheet.getMaxColumns() < 34) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), 34 - sheet.getMaxColumns());
  }

  const mkRow = function (agent, uniq, rung, missed, ans, ttt, att) {
    const r = new Array(34).fill('');
    r[CDR.DATE - 1]           = _TEST_CDR_DATE;
    r[CDR.AGENT - 1]          = agent;
    r[CDR.TOTAL_UNIQUE - 1]   = uniq;
    r[CDR.TOTAL_RUNG - 1]     = rung;
    r[CDR.TOTAL_MISSED - 1]   = missed;
    r[CDR.TOTAL_ANSWERED - 1] = ans;
    // F9 / INV-64: store the raw seconds here; the override loop below rewrites
    // these two columns as TIME VALUES so getValues() returns a Date (the
    // phantom-offset path INV-64 guards) while getDisplayValues() returns
    // H:MM:SS.
    r[CDR.TTT - 1]            = ttt;
    r[CDR.ATT - 1]            = att;
    return r;
  };
  const header = new Array(34).fill('');
  header[CDR.DATE - 1] = 'Date'; header[CDR.AGENT - 1] = 'Agent';
  header[CDR.TOTAL_UNIQUE - 1] = 'Unique'; header[CDR.TOTAL_RUNG - 1] = 'Rung';
  header[CDR.TOTAL_MISSED - 1] = 'Missed'; header[CDR.TOTAL_ANSWERED - 1] = 'Answered';
  header[CDR.TTT - 1] = 'TTT'; header[CDR.ATT - 1] = 'ATT';
  const rows = [
    header,
    mkRow(_TEST_INDIA_NAME, 10, 10, 2, 8, 300, 150),
    mkRow(_TEST_PH_NAME,     5,  5, 0, 5, 100,  50),
    mkRow('A_Q_Sales',      99, 99, 0, 99,  0,   0),  // queue sentinel — must be excluded
  ];
  const range = sheet.getRange(1, 1, rows.length, 34);
  range.setNumberFormat('@');   // plain text — keeps date / agent / counts literal
  range.setValues(rows);
  // F9 / INV-64: re-write the duration columns (TTT col I, ATT col J) as real
  // TIME VALUES — a numeric fraction-of-a-day written under a time-of-day
  // number format makes getValues() return a Date (the phantom-offset path
  // INV-64 guards against) while getDisplayValues() returns the H:MM:SS string.
  // A numeric value (not a string) GUARANTEES the coercion across locales/
  // editors. With the prior plain-text fixture, getValues()==getDisplayValues()
  // and a getValues() regression on these columns went uncaught. Skip the header.
  for (let rr = 2; rr <= rows.length; rr++) {
    const tttSec = Number(rows[rr - 1][CDR.TTT - 1]) || 0;
    const attSec = Number(rows[rr - 1][CDR.ATT - 1]) || 0;
    sheet.getRange(rr, CDR.TTT).setNumberFormat('h:mm:ss').setValue(tttSec / 86400);
    sheet.getRange(rr, CDR.ATT).setNumberFormat('h:mm:ss').setValue(attSec / 86400);
  }

  // T4 #6 — CSR Transfer Historical Data fixture (the separate transfers tab).
  // Date is written M/D/YYYY and Transfer % as a "%" string — exactly the real
  // sheet's shapes — to exercise cdrRowDateIso_ + metricsParsePercent_ in the
  // getCsrTransferPerRepDaily_ integration test. Plain text avoids coercion.
  let tsheet = ss.getSheetByName(CSR_TRANSFER_TAB);
  if (!tsheet) tsheet = ss.insertSheet(CSR_TRANSFER_TAB);
  tsheet.clear();
  if (tsheet.getMaxColumns() < CSR_TRANSFER_NUM_COLS) {
    tsheet.insertColumnsAfter(tsheet.getMaxColumns(), CSR_TRANSFER_NUM_COLS - tsheet.getMaxColumns());
  }
  const mdyyyy = _TEST_CDR_DATE.replace(/^(\d{4})-(\d{2})-(\d{2})$/, function (m, y, mo, d) {
    return parseInt(mo, 10) + '/' + parseInt(d, 10) + '/' + y;   // 2026-05-15 -> 5/15/2026
  });
  const mkTRow = function (name, pctStr, totalCalls, transferred) {
    const r = new Array(CSR_TRANSFER_NUM_COLS).fill('');
    r[CSRT.DATE] = mdyyyy; r[CSRT.NAME] = name; r[CSRT.TRANSFER_PCT] = pctStr;
    r[CSRT.TOTAL_CALLS] = totalCalls; r[CSRT.TRANSFERRED] = transferred;
    return r;
  };
  const theader = new Array(CSR_TRANSFER_NUM_COLS).fill('');
  theader[CSRT.DATE] = 'Date'; theader[CSRT.NAME] = 'CSR Rep Name';
  theader[CSRT.TRANSFER_PCT] = 'Transfer %'; theader[CSRT.TOTAL_CALLS] = 'Total Calls';
  theader[CSRT.TRANSFERRED] = 'Total Calls Transferred';
  const trows = [
    theader,
    mkTRow(_TEST_INDIA_NAME, '29.79%', 47, 14),
    mkTRow(_TEST_PH_NAME,    '10.00%', 20, 2),
  ];
  const trange = tsheet.getRange(1, 1, trows.length, CSR_TRANSFER_NUM_COLS);
  trange.setNumberFormat('@');
  trange.setValues(trows);

  SpreadsheetApp.flush();
}

/** Creates (or reuses, via Script Property TEST_INTAKE_SS_ID) a fixture
 *  spreadsheet with a deterministic Offerings tab (the A2:F column contract,
 *  INV-112) for the intake endpoint integration tests. Rows are rebuilt on
 *  every setup so the data is idempotent. Submission tabs auto-provision in
 *  the fixture on first use via getIntakeSubmissionSheet_. */
function _setupTestIntakeFixture_() {
  const props = PropertiesService.getScriptProperties();
  const existing = props.getProperty('TEST_INTAKE_SS_ID');
  let ss = null;
  if (existing) { try { ss = SpreadsheetApp.openById(existing); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('TEST_Intake_Fixture');
    props.setProperty('TEST_INTAKE_SS_ID', ss.getId());
  }
  _TEST_INTAKE_SS_ID = ss.getId();
  let sheet = ss.getSheetByName(CONFIG.INTAKE.OFFERINGS_TAB);
  if (!sheet) sheet = ss.insertSheet(CONFIG.INTAKE.OFFERINGS_TAB);
  sheet.clear();
  sheet.getRange(1, 1, 3, 6).setValues([
    ['Features', 'HCPCS', 'WeightCap', 'SeatType', 'PdfLink', 'ImageUrl'],
    ['Standard captain chair', 'K0823', '300', 'c', 'https://example.invalid/k0823.pdf', 'https://example.invalid/k0823.jpg'],
    ['Group 3 solid seat',     'K0861', '300', 's', 'https://example.invalid/k0861.pdf', 'https://example.invalid/k0861.jpg'],
  ]);
  SpreadsheetApp.flush();
}

function cleanupTestData() {
  const ss = getAdpSS_();

  // Timesheet (headers in rows 1-2, data from row 3)
  _cleanupRowsByPrefix(ss.getSheetByName(CONFIG.ADP_TAB), 'TEST_', ADP.EMP_ID, 3);
  // TimeOffRequests (header row 1, data from row 2)
  _cleanupRowsByPrefix(ss.getSheetByName(CONFIG.TIMEOFF_TAB), 'TEST_', TO.EMP_ID, 2);
  // PunchAdjustRequests (#4a — EmpId in column index 1)
  _cleanupRowsByPrefix(ss.getSheetByName(CONFIG.PUNCH_ADJUST_TAB), 'TEST_', PAR.EMP_ID, 2);
  // AuditLog (header row 1, data from row 2). EmployeeId in column index 1.
  _cleanupRowsByPrefix(ss.getSheetByName(CONFIG.AUDIT_TAB), 'TEST_', 1, 2);

  // Reset test employee balances back to defaults
  const empSheet = ss.getSheetByName(CONFIG.EMPLOYEE_TAB);
  const empRows = empSheet.getDataRange().getValues();
  for (let i = 1; i < empRows.length; i++) {
    const id = String(empRows[i][EMP.ID]).trim();
    if (id.startsWith('TEST_')) {
      empSheet.getRange(i + 1, EMP.ANNUAL_LEAVE + 1).setValue(_TEST_INITIAL_ANNUAL);
      empSheet.getRange(i + 1, EMP.SICK_LEAVE + 1).setValue(_TEST_INITIAL_SICK);
    }
  }
  // Clear the test call-notes Sheet's Notes tab (if provisioned).
  if (_TEST_CN_SS_ID) {
    try {
      const cnSs = SpreadsheetApp.openById(_TEST_CN_SS_ID);
      const notesTab = cnSs.getSheetByName(CONFIG.CALL_NOTES.NOTES_TAB);
      if (notesTab && notesTab.getLastRow() > 1) {
        notesTab.deleteRows(2, notesTab.getLastRow() - 1);
      }
    } catch (e) { Logger.log('cleanupTestData: CN sheet cleanup skipped: ' + e.message); }
  }

  // Training tabs (KB spreadsheet) — drop TEST_-employee rows left by an
  // aborted test_training_assignCompleteFlow run (its finally normally cleans
  // by itemId; this is the belt-and-suspenders sweep). Best-effort: the KB
  // spreadsheet may not be configured in a bare test environment.
  try {
    const kbSs = getKbSS_();
    _cleanupRowsByPrefix(kbSs.getSheetByName(TRAIN_ASSIGN_TAB), 'TEST_', TA.EMP_ID, 2);
    _cleanupRowsByPrefix(kbSs.getSheetByName(TRAIN_COMPLETE_TAB), 'TEST_', TCMP.EMP_ID, 2);
    _cleanupRowsByPrefix(kbSs.getSheetByName(TRAIN_ATTEMPT_TAB), 'TEST_', TQA.EMP_ID, 2);
  } catch (e) { Logger.log('cleanupTestData: training tabs cleanup skipped: ' + e.message); }
  // Employee Docs fixture (T3) — sweep TEST_-employee rows if the fixture exists.
  try {
    const hrId = PropertiesService.getScriptProperties().getProperty('TEST_HRDOCS_SS_ID');
    if (hrId) {
      const hrSs = SpreadsheetApp.openById(hrId);
      _cleanupRowsByPrefix(hrSs.getSheetByName(EMPDOC_TAB), 'TEST_', ED.EMP_ID, 2);
      _cleanupRowsByPrefix(hrSs.getSheetByName(EMPDOC_SIG_TAB), 'TEST_', EDS.EMP_ID, 2);
    }
  } catch (e) { Logger.log('cleanupTestData: empdocs cleanup skipped: ' + e.message); }

  invalidateRosterCache_();
  Logger.log('cleanupTestData: TEST_* rows removed, balances reset.');
}

function _cleanupRowsByPrefix(sheet, prefix, colIdx, firstDataRow) {
  if (!sheet) return;
  const rows = sheet.getDataRange().getValues();
  // Walk bottom-up so deleteRow indices stay valid
  for (let i = rows.length - 1; i >= firstDataRow - 1; i--) {
    const v = String(rows[i][colIdx] || '');
    if (v.indexOf(prefix) === 0) sheet.deleteRow(i + 1);
  }
}

/**
 * Per-employee state reset. Wipes every TEST-related row that belongs to
 * `empId` (Timesheet punches, TimeOffRequests, AuditLog), then resets the
 * employee's PTO balances to the test defaults. Used at the top of any
 * integration test that depends on a known baseline — needed because tests
 * within a single runAllTests share spreadsheet state and `cleanupTestData`
 * only runs at the end of the suite.
 */
function _clearTestState(empId) {
  const ss = getAdpSS_();
  _clearRowsByEmp(ss.getSheetByName(CONFIG.ADP_TAB),     empId, ADP.EMP_ID, 3);
  _clearRowsByEmp(ss.getSheetByName(CONFIG.TIMEOFF_TAB), empId, TO.EMP_ID,  2);
  _clearRowsByEmp(ss.getSheetByName(CONFIG.PUNCH_ADJUST_TAB), empId, PAR.EMP_ID, 2);
  _clearRowsByEmp(ss.getSheetByName(CONFIG.AUDIT_TAB),   empId, 1,          2);

  const empSheet = ss.getSheetByName(CONFIG.EMPLOYEE_TAB);
  const rows = empSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][EMP.ID]).trim() === empId) {
      empSheet.getRange(i + 1, EMP.ANNUAL_LEAVE + 1).setValue(_TEST_INITIAL_ANNUAL);
      empSheet.getRange(i + 1, EMP.SICK_LEAVE   + 1).setValue(_TEST_INITIAL_SICK);
      break;
    }
  }
  invalidateRosterCache_();
}

function _clearRowsByEmp(sheet, empId, colIdx, firstDataRow) {
  if (!sheet) return;
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= firstDataRow - 1; i--) {
    if (String(rows[i][colIdx] || '').trim() === empId) sheet.deleteRow(i + 1);
  }
}


// ════════════════════════════════════════════════════════════════════════════
//  ENTRY POINTS
// ════════════════════════════════════════════════════════════════════════════

function runAllTests() {
  // Blue-green guard: refuse on the PROD instance (INSTANCE_IS_PROD='true') so
  // TEST_ rows never land in the team's live payroll/PHI. No-op until set — run
  // the full suite on the DEV project. runSmokeTests (pure logic) stays unguarded.
  assertNotProdInstance_('runAllTests');
  _resetState();
  _SMOKE_ONLY = false;
  Logger.log('═══ UMS TIME CLOCK TEST SUITE ═══');
  Logger.log('Mode: FULL (integration tests will write to the spreadsheet)');
  try {
    setupTestEnvironment();
    _runAllTests();
  } finally {
    try { cleanupTestData(); } catch (e) { Logger.log('Cleanup error: ' + e.message); }
    _TEST_OVERRIDE_EMAIL = null;
  }
  _printSummary();
}

function runSmokeTests() {
  _resetState();
  _SMOKE_ONLY = true;
  Logger.log('═══ UMS TIME CLOCK SMOKE TESTS ═══');
  Logger.log('Mode: SMOKE (pure logic only — no spreadsheet writes)');
  _runAllTests();
  _printSummary();
}

function runSingleTest(name) {
  _resetState();
  _SMOKE_ONLY = false;
  setupTestEnvironment();
  try {
    const fn = globalThis[name] || this[name];
    if (typeof fn !== 'function') throw new Error('Test not found: ' + name);
    _test(name, fn);
  } finally {
    cleanupTestData();
    _TEST_OVERRIDE_EMAIL = null;
  }
  _printSummary();
}

function _printSummary() {
  const totalMs = new Date() - _TEST_STATE.start;
  Logger.log('');
  Logger.log('═══ SUMMARY ═══');
  Logger.log(`Passed:  ${_TEST_STATE.pass}`);
  Logger.log(`Failed:  ${_TEST_STATE.fail}`);
  Logger.log(`Skipped: ${_TEST_STATE.skip}`);
  Logger.log(`Total:   ${_TEST_STATE.pass + _TEST_STATE.fail + _TEST_STATE.skip} tests in ${totalMs}ms`);
  if (_TEST_STATE.fail > 0) {
    Logger.log('');
    Logger.log('--- FAILURES ---');
    _TEST_STATE.results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        Logger.log(`✗ ${r.name}`);
        Logger.log(`   ${r.error}`);
      });
  }
}

function _runAllTests() {
  // ── Pure logic (smoke-safe) ─────────────────────────────────────────────
  _smokeTest('leaveDeduction_sick',                test_leaveDeduction_sick);
  _smokeTest('leaveDeduction_halfDayMorning',      test_leaveDeduction_halfDayMorning);
  _smokeTest('leaveDeduction_halfDayAfternoon',    test_leaveDeduction_halfDayAfternoon);
  _smokeTest('leaveDeduction_fullDay',             test_leaveDeduction_fullDay);
  _smokeTest('leaveDeduction_personalDay',         test_leaveDeduction_personalDay);
  _smokeTest('leaveDeduction_other',               test_leaveDeduction_other);
  _smokeTest('leaveDeduction_unpaid_noDeduction',  test_leaveDeduction_unpaid_noDeduction);
  _smokeTest('leaveDeduction_caseInsensitive',     test_leaveDeduction_caseInsensitive);
  _smokeTest('leaveDeduction_unknownDefaultsAnnual', test_leaveDeduction_unknownDefaultsAnnual);

  _smokeTest('convertDateTime_PHT_to_CDT',         test_convertDateTime_PHT_to_CDT);
  _smokeTest('convertDateTime_IST_to_CDT',         test_convertDateTime_IST_to_CDT);
  _smokeTest('convertDateTime_sameTz_identity',    test_convertDateTime_sameTz_identity);
  _smokeTest('convertDateTime_roundTrip',          test_convertDateTime_roundTrip);
  _smokeTest('convertDateTime_dateRolls',          test_convertDateTime_dateRolls);
  _smokeTest('convertAuditTs_format',              test_convertAuditTs_format);
  _smokeTest('tzAbbr',                             test_tzAbbr);
  _smokeTest('fmtDateTz',                          test_fmtDateTz);

  _smokeTest('getNextActions_noPunches',           test_getNextActions_noPunches);
  _smokeTest('getNextActions_afterClockIn',        test_getNextActions_afterClockIn);
  _smokeTest('getNextActions_afterLunchOut',       test_getNextActions_afterLunchOut);
  _smokeTest('getNextActions_afterLunchIn',        test_getNextActions_afterLunchIn);
  _smokeTest('getNextActions_afterClockOut',       test_getNextActions_afterClockOut);

  _smokeTest('calcHours_basic',                    test_calcHours_basic);
  _smokeTest('calcHours_withLunch',                test_calcHours_withLunch);
  _smokeTest('calcHours_overnight',                test_calcHours_overnight);
  _smokeTest('calcHours_overnightWithLunch',       test_calcHours_overnightWithLunch);

  _smokeTest('daysBetween_basic',                  test_daysBetween_basic);
  _smokeTest('daysBetween_negative',               test_daysBetween_negative);
  _smokeTest('daysBetween_acrossMonth',            test_daysBetween_acrossMonth);

  _smokeTest('normalizeType_stripsAdj',            test_normalizeType_stripsAdj);
  _smokeTest('biweeklyPeriodMath',                 test_biweeklyPeriodMath);

  _smokeTest('timeDiffSeconds_positive',           test_timeDiffSeconds_positive);
  _smokeTest('timeDiffSeconds_negative',           test_timeDiffSeconds_negative);
  _smokeTest('timeDiffSeconds_HHmmFormat',         test_timeDiffSeconds_HHmmFormat);
  _smokeTest('timeDiffSeconds_invalidInput',       test_timeDiffSeconds_invalidInput);
  _smokeTest('normalizeTime_passthroughString',    test_normalizeTime_passthroughString);
  _smokeTest('normalizeTime_DateObject',           test_normalizeTime_DateObject);
  _smokeTest('normalizeTime_1899DateCoercion',     test_normalizeTime_1899DateCoercion);
  _smokeTest('safeTimezone_validPassthrough',      test_safeTimezone_validPassthrough);
  _smokeTest('safeTimezone_invalidFallback',       test_safeTimezone_invalidFallback);

  _smokeTest('holidays_2026_dates',                test_holidays_2026_dates);
  _smokeTest('holidays_independenceDay_weekendShift', test_holidays_independenceDay_weekendShift);

  // ── Integration (sheet-touching) ────────────────────────────────────────
  _integrationTest('findExistingPunch_match',           test_findExistingPunch_match);
  _integrationTest('findExistingPunch_noMatch',         test_findExistingPunch_noMatch);
  _integrationTest('getTodayPunches_sortsOutOfOrderBackfill', test_getTodayPunches_sortsOutOfOrderBackfill);
  _integrationTest('adjustLeaveBalance_deduct',         test_adjustLeaveBalance_deduct);
  _integrationTest('adjustLeaveBalance_restore',        test_adjustLeaveBalance_restore);
  _integrationTest('adjustLeaveBalance_invalidatesCache', test_adjustLeaveBalance_invalidatesCache);
  _integrationTest('adjustLeaveBalance_disabledNoOp',   test_adjustLeaveBalance_disabledNoOp);
  _integrationTest('adjustLeaveBalance_perEmpDisabledNoOp', test_adjustLeaveBalance_perEmpDisabledNoOp);

  _integrationTest('recordPunch_basic',                 test_recordPunch_basic);
  _integrationTest('recordPunch_adjustDedup',           test_recordPunch_adjustDedup);
  _integrationTest('recordPunch_rejectsBadTimeFormat',  test_recordPunch_rejectsBadTimeFormat);
  _integrationTest('recordPunch_rejectsBadDateFormat',  test_recordPunch_rejectsBadDateFormat);
  _integrationTest('recordPunch_rejectsFutureDate',     test_recordPunch_rejectsFutureDate);
  _integrationTest('recordPunch_rejectsBeyondWindow',   test_recordPunch_rejectsBeyondWindow);
  _integrationTest('recordPunch_rejectsUnknownType',    test_recordPunch_rejectsUnknownType);
  _integrationTest('recordPunch_reasonRequiredOldAdj',  test_recordPunch_reasonRequiredOldAdj);
  _integrationTest('recordPunch_reasonAcceptedOldAdj',  test_recordPunch_reasonAcceptedOldAdj);

  _integrationTest('submitTimeOff_createsRow',          test_submitTimeOff_createsRow);
  _integrationTest('submitTimeOff_rejectsBadDate',      test_submitTimeOff_rejectsBadDate);

  _integrationTest('cancelTimeOff_pendingDeletes',      test_cancelTimeOff_pendingDeletes);
  _integrationTest('cancelTimeOff_approvedRejected',    test_cancelTimeOff_approvedRejected);

  _integrationTest('updateTimeOff_approveDeductsAnnual', test_updateTimeOff_approveDeductsAnnual);
  _integrationTest('updateTimeOff_approveDeductsSick',  test_updateTimeOff_approveDeductsSick);
  _integrationTest('updateTimeOff_revertRestores',      test_updateTimeOff_revertRestores);
  _integrationTest('updateTimeOff_pendingToDenied_noChange', test_updateTimeOff_pendingToDenied_noChange);
  _integrationTest('updateTimeOff_halfDay_deductsHalf', test_updateTimeOff_halfDay_deductsHalf);
  _integrationTest('updateTimeOff_nonManagerRejected',  test_updateTimeOff_nonManagerRejected);

  _integrationTest('deletePunch_withinWindow',          test_deletePunch_withinWindow);
  _integrationTest('deletePunch_beyondWindowRejected',  test_deletePunch_beyondWindowRejected);
  _integrationTest('deletePunch_notFound',              test_deletePunch_notFound);
  _integrationTest('deletePunch_nonManagerRejected',    test_deletePunch_nonManagerRejected);

  _integrationTest('managerDashboard_returnsExpectedShape', test_managerDashboard_returnsExpectedShape);
  _integrationTest('boundedAuditRead',                  test_boundedAuditRead);

  _integrationTest('emptyTimezone_fallsBackToConfig',   test_emptyTimezone_fallsBackToConfig);
  _integrationTest('emptyLeaveBalance_treatedAsZero',   test_emptyLeaveBalance_treatedAsZero);
  _integrationTest('installAutomationTriggers_nonManagerThrows', test_installAutomationTriggers_nonManagerThrows);

  // ── New endpoints (post-sync coverage backfill) ─────────────────────────
  _integrationTest('recordPunch_minIntervalRejectsRapidLive',  test_recordPunch_minIntervalRejectsRapidLive);

  // #4a — punch-adjustment requests (employee batch → manager approval)
  _integrationTest('punchAdjust_submitApproveWritesPunch',     test_punchAdjust_submitApproveWritesPunch);
  _integrationTest('punchAdjust_batchInvalidRejected',         test_punchAdjust_batchInvalidRejected);
  _integrationTest('punchAdjust_nonManagerRejected',           test_punchAdjust_nonManagerRejected);
  _integrationTest('punchAdjust_duplicatePendingRejected',     test_punchAdjust_duplicatePendingRejected);
  _integrationTest('punchAdjust_approveAgedPastWindowRejected', test_punchAdjust_approveAgedPastWindowRejected);
  _integrationTest('recordPunch_immediateAdjustGatedByFlag',   test_recordPunch_immediateAdjustGatedByFlag);
  _integrationTest('managerSaveDayRange_appliesAcrossDays',    test_managerSaveDayRange_appliesAcrossDays);
  _integrationTest('managerSaveDayRange_nonManagerRejected',   test_managerSaveDayRange_nonManagerRejected);
  _integrationTest('reconcileCallNotes_nonManagerRejected',    test_reconcileCallNotes_nonManagerRejected);
  _integrationTest('reconcileCallNotes_backfillsHandEntered',  test_reconcileCallNotes_backfillsHandEntered);
  _integrationTest('provisionCallNotesSheet_nonManagerRejected', test_provisionCallNotesSheet_nonManagerRejected);
  _integrationTest('provisionCallNotesSheet_idempotentNoClobber', test_provisionCallNotesSheet_idempotentNoClobber);
  _integrationTest('recordPunch_minIntervalAllowsAdjustment',  test_recordPunch_minIntervalAllowsAdjustment);

  _integrationTest('selfDeletePunch_withinWindow',             test_selfDeletePunch_withinWindow);
  _integrationTest('selfDeletePunch_beyondWindow',             test_selfDeletePunch_beyondWindow);
  _integrationTest('selfDeletePunch_rejectsAdjustment',        test_selfDeletePunch_rejectsAdjustment);
  _integrationTest('selfDeletePunch_rejectsOtherDay',          test_selfDeletePunch_rejectsOtherDay);
  _integrationTest('selfDeletePunch_unknownType',              test_selfDeletePunch_unknownType);

  _integrationTest('managerSubmitTimeOff_pendingFlow',         test_managerSubmitTimeOff_pendingFlow);
  _integrationTest('managerSubmitTimeOff_autoApproveDeducts',  test_managerSubmitTimeOff_autoApproveDeducts);
  _integrationTest('managerSubmitTimeOff_autoApproveHalfDay',  test_managerSubmitTimeOff_autoApproveHalfDay);
  _integrationTest('managerSubmitTimeOff_nonManagerRejected',  test_managerSubmitTimeOff_nonManagerRejected);
  _integrationTest('managerSubmitTimeOff_badDateRejected',     test_managerSubmitTimeOff_badDateRejected);
  _integrationTest('managerSubmitTimeOff_employeeNotFound',    test_managerSubmitTimeOff_employeeNotFound);
  _integrationTest('managerSubmitTimeOff_writesAudit',         test_managerSubmitTimeOff_writesAudit);

  // H1 / M1 — duplicate-date guard + leave-type validation on time-off submit
  _integrationTest('submitTimeOff_duplicateDateRejected',      test_submitTimeOff_duplicateDateRejected);
  _integrationTest('submitTimeOff_invalidTypeRejected',        test_submitTimeOff_invalidTypeRejected);
  _integrationTest('managerSubmitTimeOff_duplicateDateRejected', test_managerSubmitTimeOff_duplicateDateRejected);

  // B1 — PTO balance reconciliation (double-deduct detection)
  _integrationTest('getPtoReconciliation_detectsDoubleDeduct', test_getPtoReconciliation_detectsDoubleDeduct);
  _integrationTest('getPtoReconciliation_nonManagerRejected',  test_getPtoReconciliation_nonManagerRejected);
  _integrationTest('fixPtoReconciliation_creditsAndIdempotent', test_fixPtoReconciliation_creditsAndIdempotent);
  _integrationTest('fixPtoReconciliation_nonManagerRejected',   test_fixPtoReconciliation_nonManagerRejected);
  _integrationTest('setCallNoteManagerComment_nonManagerRejected', test_setCallNoteManagerComment_nonManagerRejected);

  _integrationTest('getTeammateStatus_shapeRestricted',        test_getTeammateStatus_shapeRestricted);
  _integrationTest('getTeammateStatus_disabledFlag',           test_getTeammateStatus_disabledFlag);

  _integrationTest('ptoEnabled_falseHidesFromState',           test_ptoEnabled_falseHidesFromState);
  _integrationTest('ptoEnabled_blankDefaultsTrue',             test_ptoEnabled_blankDefaultsTrue);

  // ── managerSaveDay (the most complex single function — backfill, F8) ────
  _integrationTest('managerSaveDay_addOnly',                   test_managerSaveDay_addOnly);
  _integrationTest('managerSaveDay_updateOnly',                test_managerSaveDay_updateOnly);
  _integrationTest('managerSaveDay_deleteOnly',                test_managerSaveDay_deleteOnly);
  _integrationTest('managerSaveDay_mixedChanges',              test_managerSaveDay_mixedChanges);
  _integrationTest('managerSaveDay_noChangesIsNoOp',           test_managerSaveDay_noChangesIsNoOp);
  _integrationTest('managerSaveDay_nonManagerRejected',        test_managerSaveDay_nonManagerRejected);
  _integrationTest('managerSaveDay_reasonRequiredBeyondWindow',test_managerSaveDay_reasonRequiredBeyondWindow);
  _integrationTest('managerSaveDay_invalidTimeFormatRejected', test_managerSaveDay_invalidTimeFormatRejected);

  // ── Call Notes — pure logic helpers (smoke-safe; no Sheet I/O) ──────────
  _smokeTest('cn_sanitizeFlagType_valid',          test_cn_sanitizeFlagType_valid);
  _smokeTest('cn_sanitizeFlagType_invalidCoerces', test_cn_sanitizeFlagType_invalidCoerces);
  _smokeTest('cn_sanitizeFlagType_caseInsensitive',test_cn_sanitizeFlagType_caseInsensitive);
  _smokeTest('cn_sanitizeFlagType_nullish',        test_cn_sanitizeFlagType_nullish);
  _smokeTest('cn_sanitizePayload_trims',           test_cn_sanitizePayload_trims);
  _smokeTest('cn_sanitizePayload_nullishToEmpty',  test_cn_sanitizePayload_nullishToEmpty);
  _smokeTest('cn_sanitizePayload_acceptsCamelAlias', test_cn_sanitizePayload_acceptsCamelAlias);
  _smokeTest('cn_validatePayload_rejectsEmpty',    test_cn_validatePayload_rejectsEmpty);
  _smokeTest('cn_validatePayload_acceptsAnyField', test_cn_validatePayload_acceptsAnyField);
  _smokeTest('cn_validatePayload_rejectsBadFlag',  test_cn_validatePayload_rejectsBadFlag);
  _smokeTest('cn_matchesFilter_all',               test_cn_matchesFilter_all);
  _smokeTest('cn_matchesFilter_actionTrainingReview', test_cn_matchesFilter_actionTrainingReview);
  _smokeTest('cn_matchesFilter_unresolved',        test_cn_matchesFilter_unresolved);
  _smokeTest('cn_matchesFilter_unsent',            test_cn_matchesFilter_unsent);
  _smokeTest('cn_updateInfoToSubformKey',          test_cn_updateInfoToSubformKey);
  _smokeTest('cn_formatPhoneNumber_basic',         test_cn_formatPhoneNumber_basic);
  _smokeTest('cn_formatPhoneNumber_extension',     test_cn_formatPhoneNumber_extension);
  _smokeTest('cn_formatPhoneNumber_passthroughShort', test_cn_formatPhoneNumber_passthroughShort);
  _smokeTest('cn_formatPhoneNumber_empty',         test_cn_formatPhoneNumber_empty);
  _smokeTest('cn_formatProviderPhone_basic',       test_cn_formatProviderPhone_basic);
  _smokeTest('cn_formatProviderPhone_countryCode', test_cn_formatProviderPhone_countryCode);
  _smokeTest('cn_buildEmailSubject_basicUpdate',   test_cn_buildEmailSubject_basicUpdate);
  _smokeTest('cn_buildEmailSubject_titlecasesCanon', test_cn_buildEmailSubject_titlecasesCanon);
  _smokeTest('cn_buildEmailSubject_repeatResupplyEnriched', test_cn_buildEmailSubject_repeatResupplyEnriched);
  _smokeTest('cn_buildEmailSubject_repeatResupplyOtherCategory', test_cn_buildEmailSubject_repeatResupplyOtherCategory);
  _smokeTest('cn_generateOOPResolutionText_collected', test_cn_generateOOPResolutionText_collected);
  _smokeTest('cn_generateOOPResolutionText_needCollect', test_cn_generateOOPResolutionText_needCollect);
  _smokeTest('cn_resolveRecipients_simpleDept',    test_cn_resolveRecipients_simpleDept);
  _smokeTest('cn_resolveRecipients_otherUsesIndividual', test_cn_resolveRecipients_otherUsesIndividual);
  _smokeTest('cn_resolveRecipients_unknownDeptErrors', test_cn_resolveRecipients_unknownDeptErrors);
  _smokeTest('cn_validateEmailSelections_requiresDept', test_cn_validateEmailSelections_requiresDept);
  _smokeTest('cn_validateEmailSelections_otherRequiresEmail', test_cn_validateEmailSelections_otherRequiresEmail);
  _smokeTest('cn_validateEmailSelections_requiresUpdateInfo', test_cn_validateEmailSelections_requiresUpdateInfo);
  _smokeTest('cn_callDataFromNote_selfNumberPrepended', test_cn_callDataFromNote_selfNumberPrepended);
  _smokeTest('cn_callDataFromNote_selfNamedNoPrepend',  test_cn_callDataFromNote_selfNamedNoPrepend);
  _smokeTest('cn_callDataFromNote_nonSelfPassthrough',  test_cn_callDataFromNote_nonSelfPassthrough);
  _smokeTest('cn_buildEmailHtml_escapesUserFields', test_cn_buildEmailHtml_escapesUserFields);
  _smokeTest('cn_formSubmissionCard_escapes', test_cn_formSubmissionCard_escapes);
  _smokeTest('config_adpSheetTzMatchesConfig', test_config_adpSheetTzMatchesConfig);
  _smokeTest('automationDetectorLiveness',      test_automationDetectorLiveness);
  _integrationTest('perRepSchedule_overrideAndFallback', test_perRepSchedule_overrideAndFallback);
  _smokeTest('cn_extractAuditNoteId_parses',       test_cn_extractAuditNoteId_parses);
  _smokeTest('cn_extractAuditNoteId_noMatch',      test_cn_extractAuditNoteId_noMatch);
  _smokeTest('tpl_formToken_usesUnescapedScriptlet', test_tpl_formToken_usesUnescapedScriptlet);
  _smokeTest('tpl_noEscapedJsonInjection',         test_tpl_noEscapedJsonInjection);
  _smokeTest('tpl_formPublic_evaluatesWithoutError', test_tpl_formPublic_evaluatesWithoutError);
  _smokeTest('cn_esc_basic',                       test_cn_esc_basic);

  // ── Intake — PPD recommendation engine (smoke-safe; pure) ──────────────
  _smokeTest('intake_engine_standardOnly',         test_intake_engine_standardOnly);
  _smokeTest('intake_engine_mobileHomeRestriction', test_intake_engine_mobileHomeRestriction);
  _smokeTest('intake_engine_neuroUpgradeAndSubs',  test_intake_engine_neuroUpgradeAndSubs);
  _smokeTest('intake_engine_weightCap',            test_intake_engine_weightCap);
  _smokeTest('intake_engine_oxygenExcludesK0837',  test_intake_engine_oxygenExcludesK0837);
  _smokeTest('intake_engine_emptySafe',            test_intake_engine_emptySafe);
  _smokeTest('intake_buildPpdBody_escapesAnswers', test_intake_buildPpdBody_escapesAnswers);
  _smokeTest('intake_emailDomain_extracted',       test_intake_emailDomain_extracted);
  _smokeTest('intake_resolveRecipient_customValidation', test_intake_resolveRecipient_customValidation);

  // ── Forms hardening — submission integrity hash (smoke-safe; pure) ──────
  _smokeTest('form_submissionHash_deterministicAndTamperEvident', test_form_submissionHash_deterministicAndTamperEvident);

  // ── Call Notes — integration (sheet-touching) ──────────────────────────
  _integrationTest('cn_submitCallNote_basic',                test_cn_submitCallNote_basic);
  _integrationTest('cn_submitCallNote_withFlag',             test_cn_submitCallNote_withFlag);
  _integrationTest('cn_submitCallNote_unenrolledRepFails',   test_cn_submitCallNote_unenrolledRepFails);
  _integrationTest('cn_setCallNoteFlag_toggleAction',        test_cn_setCallNoteFlag_toggleAction);
  _integrationTest('cn_setCallNoteFlag_transitionClearsResolved', test_cn_setCallNoteFlag_transitionClearsResolved);
  _integrationTest('cn_setCallNoteResolved_actionOnly',      test_cn_setCallNoteResolved_actionOnly);
  _integrationTest('cn_setCallNoteResolved_rejectsNonAction',test_cn_setCallNoteResolved_rejectsNonAction);
  _integrationTest('cn_deleteCallNote_basic',                test_cn_deleteCallNote_basic);
  _integrationTest('cn_setCallNotePinned_capAt3',            test_cn_setCallNotePinned_capAt3);
  _integrationTest('cn_updateCallNote_basic',                test_cn_updateCallNote_basic);
  _integrationTest('cn_search_phoneTrxFieldScopes',          test_cn_search_phoneTrxFieldScopes);
  _integrationTest('cn_managerGetCallNotes_nonManagerRejected', test_cn_managerGetCallNotes_nonManagerRejected);
  _integrationTest('cn_getFormSubmission_callerScoped',      test_cn_getFormSubmission_callerScoped);
  _integrationTest('cn_managerGetFormSubmission_gatedAndScoped', test_cn_managerGetFormSubmission_gatedAndScoped);
  _integrationTest('publicForm_tokenLifecycle',               test_publicForm_tokenLifecycle);
  _integrationTest('publicForm_blankExpiryFailsClosed',       test_publicForm_blankExpiryFailsClosed);

  // ── Call Notes — email two-stage send + bodyHash guard (F3 / INV-41/33) ──
  _integrationTest('cn_previewCallNoteEmail_returnsHashAndSubject', test_cn_previewCallNoteEmail_returnsHashAndSubject);
  _integrationTest('cn_previewCallNoteEmail_requiresDepartment',    test_cn_previewCallNoteEmail_requiresDepartment);
  _integrationTest('cn_emailFromCallNote_rejectsMissingHash',       test_cn_emailFromCallNote_rejectsMissingHash);
  _integrationTest('cn_emailFromCallNote_rejectsStaleHash',         test_cn_emailFromCallNote_rejectsStaleHash);
  _integrationTest('cn_submitCallNote_doesNotStampEmailedAt',       test_cn_submitCallNote_doesNotStampEmailedAt);

  // ── Call Notes — tag taxonomy admin (F4 / INV-82) ────────────────────────
  _smokeTest('cn_normalizeTagForAdmin_rules',                test_cn_normalizeTagForAdmin_rules);
  _integrationTest('cn_tagAdmin_nonManagerRejected',          test_cn_tagAdmin_nonManagerRejected);
  _integrationTest('cn_renameCallNoteTag_managerRewritesTag', test_cn_renameCallNoteTag_managerRewritesTag);
  _integrationTest('cn_archiveCallNoteTag_roundTrip',         test_cn_archiveCallNoteTag_roundTrip);

  // ── F8: manager-gate coverage across INV-31 / time-clock manager endpoints ─
  _integrationTest('managerGates_rejectNonManager',           test_managerGates_rejectNonManager);
  // ── A5: DeptRequests re-send dedup lookup ───────────────────────────────────
  _integrationTest('deptReq_resendDedupLookup',               test_deptReq_resendDedupLookup);
  _integrationTest('deptReq_incomingAndMemberResolve',        test_deptReq_incomingAndMemberResolve);

  // ── Metrics / CDR endpoint integration (uses the CDR fixture) ───────────
  _integrationTest('metrics_getMyMetrics_cdrIntegration',       test_metrics_getMyMetrics_cdrIntegration);
  _integrationTest('metrics_getTeamMetrics_cdrIntegration',     test_metrics_getTeamMetrics_cdrIntegration);
  _integrationTest('metrics_cdrFixture_durationsUseDisplayValues', test_metrics_cdrFixture_durationsUseDisplayValues);
  _integrationTest('metrics_csrTransferFixture_parsesDateAndPercent', test_metrics_csrTransferFixture_parsesDateAndPercent);
  _integrationTest('metrics_getTeamMetrics_nonManagerRejected', test_metrics_getTeamMetrics_nonManagerRejected);
  _integrationTest('metrics_getMyMetrics_cdrUnavailableErrors', test_metrics_getMyMetrics_cdrUnavailableErrors);

  // ── Compliance audit panel (INV-92 endpoints, P7) ───────────────────────
  _integrationTest('auditPanel_searchAndHistory',               test_auditPanel_searchAndHistory);

  // ── KB usage feedback loop ──────────────────────────────────────────────
  _integrationTest('kb_recordView_requiresEmployee',            test_kb_recordView_requiresEmployee);
  _integrationTest('kb_feedbackAndRequests_requireEmployee',    test_kb_feedbackAndRequests_requireEmployee);
  _integrationTest('kb_uploadImage_rejectsInvalidPayloads',      test_kb_uploadImage_rejectsInvalidPayloads);
  _integrationTest('kbAi_gatesAndSettingsValidation',            test_kbAi_gatesAndSettingsValidation);
  _integrationTest('kb_draftLifecycleAndRevisions',              test_kb_draftLifecycleAndRevisions);
  _integrationTest('adminEmails_subsetOfManagersEnforced',       test_adminEmails_subsetOfManagersEnforced);

  // ── Training & Employee Docs — T1 (spec: docs/training-employee-docs-spec.md) ──
  _integrationTest('training_assignCompleteFlow',               test_training_assignCompleteFlow);
  _integrationTest('training_quizFlow',                         test_training_quizFlow);
  _integrationTest('empdocs_issueSignVerifyFlow',               test_empdocs_issueSignVerifyFlow);

  // ── Intake endpoint integration (uses the Intake fixture, P9 + P15) ─────
  _integrationTest('intake_previewPPD_returnsHashAndRecs',      test_intake_previewPPD_returnsHashAndRecs);
  _integrationTest('intake_sendPPD_staleHashRejected',          test_intake_sendPPD_staleHashRejected);
  _integrationTest('intake_send_unauthorizedRejected',          test_intake_send_unauthorizedRejected);
  _integrationTest('intake_sentViewer_callerScopedAndManager',  test_intake_sentViewer_callerScopedAndManager);

  // ── Metrics / CDR module (G1 backfill) ─────────────────────────────────
  _smokeTest('metrics_cnNoteCoverage_basic',            test_metrics_cnNoteCoverage_basic);
  _smokeTest('metrics_cnNoteCoverage_zeroNotes',        test_metrics_cnNoteCoverage_zeroNotes);
  _smokeTest('metrics_cnNoteCoverage_noDenominator',    test_metrics_cnNoteCoverage_noDenominator);
  _smokeTest('metrics_cdrParseHms_hms',                 test_metrics_cdrParseHms_hms);
  _smokeTest('metrics_cdrParseHms_mmAndBare',           test_metrics_cdrParseHms_mmAndBare);
  _smokeTest('metrics_cdrParseHms_emptyAndNull',        test_metrics_cdrParseHms_emptyAndNull);
  _smokeTest('metrics_cdrFmtHms_roundTrip',             test_metrics_cdrFmtHms_roundTrip);
  _smokeTest('metrics_cdrRowDateIso_isoString',         test_metrics_cdrRowDateIso_isoString);
  _smokeTest('metrics_cdrRowDateIso_usFormat',          test_metrics_cdrRowDateIso_usFormat);
  _smokeTest('metrics_isCdrQueueSentinel',              test_metrics_isCdrQueueSentinel);
  _smokeTest('metrics_cdrRosterHash_orderInsensitive',  test_metrics_cdrRosterHash_orderInsensitive);
  _smokeTest('metrics_cdrRosterHash_distinctSetsDiffer', test_metrics_cdrRosterHash_distinctSetsDiffer);
  _smokeTest('metrics_cdrRosterHash_emptyIsAll',        test_metrics_cdrRosterHash_emptyIsAll);
  _smokeTest('metrics_countCallNotesInRange_noSheetReturnsZero', test_metrics_countCallNotesInRange_noSheetReturnsZero);
  _integrationTest('metrics_countCallNotesInRange_countsToday',  test_metrics_countCallNotesInRange_countsToday);

  // ── Automation trigger gates (INV-44) ──────────────────────────────────
  _integrationTest('triggerGate_eodDigest_nonManagerThrows',    test_triggerGate_eodDigest_nonManagerThrows);
  _integrationTest('triggerGate_weeklyDigests_nonManagerThrows',test_triggerGate_weeklyDigests_nonManagerThrows);
  _integrationTest('triggerGate_missedPunch_nonManagerThrows',  test_triggerGate_missedPunch_nonManagerThrows);
  _integrationTest('triggerGate_dailyExport_nonManagerThrows',  test_triggerGate_dailyExport_nonManagerThrows);
  _integrationTest('triggerGate_urgentDigest_nonManagerThrows', test_triggerGate_urgentDigest_nonManagerThrows);
  _integrationTest('triggerGate_purgeOldCallNotes_nonManagerThrows', test_triggerGate_purgeOldCallNotes_nonManagerThrows);
  _integrationTest('triggerGate_archiveOldCallNotes_nonManagerThrows', test_triggerGate_archiveOldCallNotes_nonManagerThrows);
  _integrationTest('triggerGate_purgeArchivedCallNotes_nonManagerThrows', test_triggerGate_purgeArchivedCallNotes_nonManagerThrows);
  _integrationTest('triggerGate_purgeExpiredFormData_nonManagerThrows', test_triggerGate_purgeExpiredFormData_nonManagerThrows);
  _integrationTest('triggerGate_removeAutomationTriggers_nonManagerThrows', test_triggerGate_removeAutomationTriggers_nonManagerThrows);
  _integrationTest('triggerGate_trainingOverdue_nonManagerThrows', test_triggerGate_trainingOverdue_nonManagerThrows);
  _integrationTest('triggerGate_automationHealthDigest_nonManagerThrows', test_triggerGate_automationHealthDigest_nonManagerThrows);
  _integrationTest('triggerGate_deptReqReminder_nonManagerThrows', test_triggerGate_deptReqReminder_nonManagerThrows);
  _integrationTest('triggerGate_managerDailyBrief_nonManagerThrows', test_triggerGate_managerDailyBrief_nonManagerThrows);
  _integrationTest('triggerGate_timesheetArchive_nonManagerThrows', test_triggerGate_timesheetArchive_nonManagerThrows);
  _integrationTest('timesheetArchive_windowFloorAndDefault', test_timesheetArchive_windowFloorAndDefault);
  _integrationTest('archiveSheetRowsOlderThan_behavioral',   test_archiveSheetRowsOlderThan_behavioral);
  _integrationTest('cn_managerAggregateUrgent_findsUrgentNotOthers', test_cn_managerAggregateUrgent_findsUrgentNotOthers);

  // ── Client error beacon (#1, INV-150) + What's new panel (#4, INV-152) ─
  _integrationTest('recordClientError_authBoundsAndAppend', test_recordClientError_authBoundsAndAppend);
  _integrationTest('whatsNew_propertyGateAndDraftHidden', test_whatsNew_propertyGateAndDraftHidden);

  // ── Audit row assertions ───────────────────────────────────────────────
  _integrationTest('auditRow_recordPunchAdjustment',            test_auditRow_recordPunchAdjustment);
  _integrationTest('auditRow_deletePunch_hasActorEmail',        test_auditRow_deletePunch_hasActorEmail);
}


// ════════════════════════════════════════════════════════════════════════════
//  PURE LOGIC TESTS
// ════════════════════════════════════════════════════════════════════════════

// ── PTO mapping ──

function test_leaveDeduction_sick() {
  _assertEq(getLeaveDeduction_('Sick Leave'), { bucket: 'sick', days: 1.0 });
}
function test_leaveDeduction_halfDayMorning() {
  _assertEq(getLeaveDeduction_('Half Day - Morning'), { bucket: 'annual', days: 0.5 });
}
function test_leaveDeduction_halfDayAfternoon() {
  _assertEq(getLeaveDeduction_('Half Day - Afternoon'), { bucket: 'annual', days: 0.5 });
}
function test_leaveDeduction_fullDay() {
  _assertEq(getLeaveDeduction_('Full Day'), { bucket: 'annual', days: 1.0 });
}
function test_leaveDeduction_personalDay() {
  _assertEq(getLeaveDeduction_('Personal Day'), { bucket: 'annual', days: 1.0 });
}
function test_leaveDeduction_other() {
  _assertEq(getLeaveDeduction_('Other'), { bucket: 'annual', days: 1.0 });
}
function test_leaveDeduction_unpaid_noDeduction() {
  _assertEq(getLeaveDeduction_('Unpaid Leave'), { bucket: null, days: 0 });
}
function test_leaveDeduction_caseInsensitive() {
  _assertEq(getLeaveDeduction_('SICK LEAVE'),         { bucket: 'sick',   days: 1.0 });
  _assertEq(getLeaveDeduction_('half day - morning'), { bucket: 'annual', days: 0.5 });
  _assertEq(getLeaveDeduction_('  Sick Leave  '),     { bucket: 'sick',   days: 1.0 });
}
function test_leaveDeduction_unknownDefaultsAnnual() {
  _assertEq(getLeaveDeduction_('Custom Holiday'), { bucket: 'annual', days: 1.0 });
  _assertEq(getLeaveDeduction_(''),               { bucket: 'annual', days: 1.0 });
}

// ── Timezone conversion ──

function test_convertDateTime_PHT_to_CDT() {
  // May 17 2026 is in CDT (US daylight). Manila 09:00 → UTC 01:00 → Chicago 20:00 prev day.
  const conv = convertDateTime_('2026-05-17', '09:00:00', 'Asia/Manila', 'America/Chicago');
  _assertEq(conv.date, '2026-05-16', 'PHT 09:00 May 17 → CDT May 16');
  _assertEq(conv.time, '20:00:00',    'PHT 09:00 May 17 → 20:00 CDT');
}

function test_convertDateTime_IST_to_CDT() {
  // IST is UTC+5:30. Kolkata 14:30 → UTC 09:00 → Chicago 04:00 CDT.
  const conv = convertDateTime_('2026-05-17', '14:30:00', 'Asia/Kolkata', 'America/Chicago');
  _assertEq(conv.date, '2026-05-17');
  _assertEq(conv.time, '04:00:00');
}

function test_convertDateTime_sameTz_identity() {
  const conv = convertDateTime_('2026-05-17', '10:00:00', 'Asia/Kolkata', 'Asia/Kolkata');
  _assertEq(conv.date, '2026-05-17');
  _assertEq(conv.time, '10:00:00');
}

function test_convertDateTime_roundTrip() {
  const orig = '15:30:00';
  const c1 = convertDateTime_('2026-05-17', orig, 'Asia/Manila', 'America/Chicago');
  const c2 = convertDateTime_(c1.date, c1.time, 'America/Chicago', 'Asia/Manila');
  _assertEq(c2.date, '2026-05-17', 'Round-trip preserves date');
  _assertEq(c2.time, orig,         'Round-trip preserves time');
}

function test_convertDateTime_dateRolls() {
  // Late-night PHT → previous-day CDT
  const conv = convertDateTime_('2026-05-17', '02:00:00', 'Asia/Manila', 'America/Chicago');
  _assertEq(conv.date, '2026-05-16', 'PHT 02:00 → CDT previous day');
}

function test_convertAuditTs_format() {
  const result = convertAuditTs_('2026-05-17 14:30:00', 'Asia/Kolkata', 'America/Chicago');
  // 14:30 IST May 17 = 04:00 CDT May 17 → "May 17, 4:00 AM"
  _assertEq(result, 'May 17, 4:00 AM');
}

function test_tzAbbr() {
  _assertEq(tzAbbr_('Asia/Kolkata'),    'IST');
  _assertEq(tzAbbr_('Asia/Manila'),     'PHT');
  _assertEq(tzAbbr_('America/Chicago'), 'CST');
  _assertEq(tzAbbr_('America/New_York'),'EST');
  _assertEq(tzAbbr_('Unknown/Zone'),    'Unknown/Zone');  // passthrough
}

function test_fmtDateTz() {
  const d = new Date(Date.UTC(2026, 4, 17, 1, 0, 0));  // May 17 2026 01:00 UTC
  _assertEq(fmtDateTz_(d, 'Asia/Manila'),     '2026-05-17');  // 09:00 PHT
  _assertEq(fmtDateTz_(d, 'America/Chicago'), '2026-05-16');  // 20:00 CDT prev day
}

// ── State machine ──

function test_getNextActions_noPunches() {
  _assertEq(getNextActions_([]), ['ClockIn', 'Adjust']);
}
function test_getNextActions_afterClockIn() {
  _assertEq(getNextActions_([{type:'ClockIn'}]), ['LunchOut','ClockOut','Adjust']);
}
function test_getNextActions_afterLunchOut() {
  _assertEq(getNextActions_([{type:'ClockIn'},{type:'LunchOut'}]),
    ['LunchIn','ClockOut','Adjust']);
}
function test_getNextActions_afterLunchIn() {
  _assertEq(getNextActions_([{type:'ClockIn'},{type:'LunchOut'},{type:'LunchIn'}]),
    ['LunchOut','ClockOut','Adjust']);  // same as after ClockIn
}
function test_getNextActions_afterClockOut() {
  _assertEq(getNextActions_([{type:'ClockIn'},{type:'ClockOut'}]), ['Adjust']);
}

// ── Hours calculation ──

function test_calcHours_basic() {
  _assertEqClose(calcHours_('09:00:00','17:00:00',null,null), 8.0);
}
function test_calcHours_withLunch() {
  _assertEqClose(calcHours_('09:00:00','17:00:00','12:00:00','13:00:00'), 7.0);
}
function test_calcHours_overnight() {
  // 22:00 → 06:00 next day = 8 hours
  _assertEqClose(calcHours_('22:00:00','06:00:00',null,null), 8.0);
}
function test_calcHours_overnightWithLunch() {
  // 22:00 → 06:00 with 02:00-03:00 lunch = 7 hours
  _assertEqClose(calcHours_('22:00:00','06:00:00','02:00:00','03:00:00'), 7.0);
}

// ── Date math ──

function test_daysBetween_basic() {
  _assertEq(daysBetween_('2026-05-10','2026-05-17'), 7);
  _assertEq(daysBetween_('2026-05-17','2026-05-17'), 0);
  _assertEq(daysBetween_('2026-05-17','2026-05-18'), 1);
}
function test_daysBetween_negative() {
  _assertEq(daysBetween_('2026-05-17','2026-05-10'), -7);
}
function test_daysBetween_acrossMonth() {
  _assertEq(daysBetween_('2026-04-25','2026-05-05'), 10);
}

function test_normalizeType_stripsAdj() {
  _assertEq(normalizeType_('ClockIn'),       'ClockIn');
  _assertEq(normalizeType_('ADJ-ClockIn'),   'ClockIn');
  _assertEq(normalizeType_('ADJ-LunchOut'),  'LunchOut');
  _assertEq(normalizeType_(''),              '');
}

// (test_isLastBusinessDayOfMonth was removed in cycle 8 M-1 along with the
// helper: the export gate now fires the morning AFTER the period completes —
// 1st of the month / biweeklyRange.end === yesterday — so the final day's
// afternoon punches exist when the Timesheet is read.)

function test_biweeklyPeriodMath() {
  // Replicate the math in getCurrentBiweeklyRange_ to test it deterministically.
  function compute(anchor, todayStr) {
    const anchorMs = new Date(anchor + 'T00:00:00Z').getTime();
    const todayMs  = new Date(todayStr + 'T00:00:00Z').getTime();
    const daysDiff = Math.round((todayMs - anchorMs) / 86400000);
    const idx = Math.floor((daysDiff + 13) / 14);
    const endMs = anchorMs + idx * 14 * 86400000;
    const startMs = endMs - 13 * 86400000;
    return { start: isoFromUtc_(new Date(startMs)), end: isoFromUtc_(new Date(endMs)) };
  }
  _assertEq(compute('2026-01-02','2026-01-02'), { start:'2025-12-20', end:'2026-01-02' });
  _assertEq(compute('2026-01-02','2026-01-15'), { start:'2026-01-03', end:'2026-01-16' });
  _assertEq(compute('2026-01-02','2026-01-16'), { start:'2026-01-03', end:'2026-01-16' });
  _assertEq(compute('2026-01-02','2026-01-17'), { start:'2026-01-17', end:'2026-01-30' });
}

function test_holidays_2026_dates() {
  const hols = getUsHolidays_(2026);
  const byName = {};
  hols.forEach(h => { byName[h.name] = h.date; });
  _assertEq(byName["New Year's Day"],            '2026-01-01');  // Thu
  _assertEq(byName['Martin Luther King Jr. Day'],'2026-01-19');  // 3rd Mon
  _assertEq(byName["Presidents' Day"],           '2026-02-16');  // 3rd Mon
  _assertEq(byName['Memorial Day'],              '2026-05-25');  // last Mon
  _assertEq(byName['Juneteenth'],                '2026-06-19');  // Fri
  _assertEq(byName['Labor Day'],                 '2026-09-07');  // 1st Mon
  _assertEq(byName['Columbus Day'],              '2026-10-12');  // 2nd Mon
  _assertEq(byName['Veterans Day'],              '2026-11-11');  // Wed
  _assertEq(byName['Thanksgiving Day'],          '2026-11-26');  // 4th Thu
  _assertEq(byName['Christmas Day'],             '2026-12-25');  // Fri
}

function test_holidays_independenceDay_weekendShift() {
  // Jul 4 2026 is Saturday → observed Friday Jul 3
  const hols = getUsHolidays_(2026);
  const ind = hols.find(h => h.name === 'Independence Day');
  _assertEq(ind.date, '2026-07-03', 'Jul 4 Sat → observed Jul 3 Fri');
}


// ════════════════════════════════════════════════════════════════════════════
//  INTEGRATION TESTS
// ════════════════════════════════════════════════════════════════════════════

// ── Helpers used by integration tests ──

function _appendTestPunch(empId, empName, date, time, dir, type) {
  getAdpSS_().getSheetByName(CONFIG.ADP_TAB)
    .appendRow([empId, empName, date, time, dir, 'None', 'Missing punch', 'SUBMIT', type]);
}

function _findTimeOffRow(empId, date) {
  const rows = getOrCreateTimeOffSheet_().getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][TO.EMP_ID]).trim() === empId
        && normalizeDate_(rows[i][TO.DATE]) === date) {
      return {
        rowIndex: i + 1,
        empName: String(rows[i][TO.EMP_NAME]).trim(),
        type:    String(rows[i][TO.TYPE]),
        notes:   String(rows[i][TO.NOTES]),
        status:  String(rows[i][TO.STATUS]),
        submittedAt: normalizeAuditTs_(rows[i][TO.SUBMITTED_AT]),
      };
    }
  }
  return null;
}

function _countTimesheetRows(empId, date, type) {
  const rows = getAdpSS_().getSheetByName(CONFIG.ADP_TAB).getDataRange().getValues();
  let count = 0;
  for (let i = 2; i < rows.length; i++) {
    if (String(rows[i][ADP.EMP_ID]).trim() !== empId) continue;
    if (normalizeDate_(rows[i][ADP.DATE]) !== date) continue;
    if (type && normalizeType_(String(rows[i][ADP.COMMENTS])) !== type) continue;
    count++;
  }
  return count;
}

function _getBalance(empId, bucket) {
  const rows = getAdpSS_().getSheetByName(CONFIG.EMPLOYEE_TAB).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][EMP.ID]).trim() === empId) {
      const col = bucket === 'sick' ? EMP.SICK_LEAVE : EMP.ANNUAL_LEAVE;
      return parseFloat(rows[i][col]) || 0;
    }
  }
  return null;
}

// ── findExistingPunch_ ──

function test_findExistingPunch_match() {
  _appendTestPunch(_TEST_INDIA_ID, 'Test India User', _TEST_DATE_RECENT, '09:00:00', 'IN', 'ClockIn');
  const result = findExistingPunch_(_TEST_INDIA_ID, _TEST_DATE_RECENT, 'ClockIn');
  _assertNotNull(result);
  _assertTrue(result.rowIndex > 0);
}

function test_findExistingPunch_noMatch() {
  _assertNull(findExistingPunch_(_TEST_INDIA_ID, '2099-12-31', 'ClockIn'));
  _appendTestPunch(_TEST_INDIA_ID, 'Test India User', _TEST_DATE_RECENT, '09:00:00', 'IN', 'ClockIn');
  _assertNull(findExistingPunch_(_TEST_INDIA_ID, _TEST_DATE_RECENT, 'ClockOut'));
  _assertNull(findExistingPunch_('DOES_NOT_EXIST',  _TEST_DATE_RECENT, 'ClockIn'));
}

// ── getTodayPunches_ — same-day back-fill ordering ──

function test_getTodayPunches_sortsOutOfOrderBackfill() {
  _clearTestState(_TEST_INDIA_ID);
  const today = fmtDateTz_(new Date(), 'Asia/Kolkata');
  // Simulate live punches followed by a same-day back-fill: the lunch
  // adjustments are APPENDED after the ClockOut, so sheet order ≠ time order.
  // Without the chronological sort, the "last punch" would read as LunchIn and
  // live status / getNextActions_ would claim the rep is still working.
  _appendTestPunch(_TEST_INDIA_ID, 'Test India User', today, '09:00:00', 'IN',  'ClockIn');
  _appendTestPunch(_TEST_INDIA_ID, 'Test India User', today, '17:00:00', 'OUT', 'ClockOut');
  _appendTestPunch(_TEST_INDIA_ID, 'Test India User', today, '12:30:00', 'OUT', 'ADJ-LunchOut');
  _appendTestPunch(_TEST_INDIA_ID, 'Test India User', today, '13:00:00', 'IN',  'ADJ-LunchIn');
  const { punches } = getTodayPunches_(_TEST_INDIA_ID, 'Asia/Kolkata');
  _assertEq(punches.length, 4, 'All four punches found for today');
  _assertEq(punches.map(p => p.time).join(','),
    '09:00:00,12:30:00,13:00:00,17:00:00', 'Punches sorted chronologically');
  _assertEq(punches[punches.length - 1].type, 'ClockOut',
    'Last punch is ClockOut — back-filled lunch must not flip live status');
}

// ── adjustLeaveBalance_ ──

function test_adjustLeaveBalance_deduct() {
  const before = _getBalance(_TEST_INDIA_ID, 'sick');
  const after = adjustLeaveBalance_(_TEST_INDIA_ID, 'sick', -1);
  _assertEqClose(after, before - 1);
  _assertEqClose(_getBalance(_TEST_INDIA_ID, 'sick'), before - 1);
}

function test_adjustLeaveBalance_restore() {
  const before = _getBalance(_TEST_INDIA_ID, 'annual');
  adjustLeaveBalance_(_TEST_INDIA_ID, 'annual', -0.5);
  const restored = adjustLeaveBalance_(_TEST_INDIA_ID, 'annual', 0.5);
  _assertEqClose(restored, before);
}

function test_adjustLeaveBalance_invalidatesCache() {
  _clearTestState(_TEST_INDIA_ID);
  // Read once to populate cache
  _asUser(_TEST_INDIA_EMAIL, () => {
    const info = getEmployeeInfo_();
    _assertEqClose(info.sickLeave, _TEST_INITIAL_SICK);
  });
  // Mutate
  adjustLeaveBalance_(_TEST_INDIA_ID, 'sick', -2);
  // Read again — should reflect new balance
  _asUser(_TEST_INDIA_EMAIL, () => {
    const info = getEmployeeInfo_();
    _assertEqClose(info.sickLeave, _TEST_INITIAL_SICK - 2);
  });
}

function test_adjustLeaveBalance_disabledNoOp() {
  // enablePtoTracking is read via getFlag_ since the feature-flag migration —
  // mutating CONFIG.ENABLE_PTO_TRACKING at runtime no longer disables it
  // (the registry default snapshots CONFIG at load). Override via the
  // Script-Property flag store instead.
  _withFeatureFlags_({ enablePtoTracking: false }, () => {
    const before = _getBalance(_TEST_INDIA_ID, 'sick');
    const result = adjustLeaveBalance_(_TEST_INDIA_ID, 'sick', -1);
    _assertNull(result);
    _assertEqClose(_getBalance(_TEST_INDIA_ID, 'sick'), before, 'No change when PTO disabled');
  });
}

// M-1 — a contractor marked PtoEnabled=FALSE (column K) must NOT have their
// balance mutated even when PTO tracking is globally ON. Before the fix,
// adjustLeaveBalance_ gated only on the global flag, so approving a request
// (or a manager filing on their behalf) silently drove the balance negative —
// contradicting S15 / the per-employee opt-out (INV-27). The prior
// ptoEnabled tests only checked that the UI flag is hidden, never the
// deduction, which is how this lived undetected (audit finding N-1).
function test_adjustLeaveBalance_perEmpDisabledNoOp() {
  const original = _setEmpPtoEnabled(_TEST_INDIA_ID, 'FALSE');
  try {
    const before = _getBalance(_TEST_INDIA_ID, 'annual');
    const result = adjustLeaveBalance_(_TEST_INDIA_ID, 'annual', -1);
    _assertNull(result, 'Per-employee PTO disable returns null (no balance change)');
    _assertEqClose(_getBalance(_TEST_INDIA_ID, 'annual'), before,
      'Contractor (PtoEnabled=FALSE) balance is never deducted');
  } finally {
    _setEmpPtoEnabled(_TEST_INDIA_ID, original);
  }
}

// ── recordPunch ──

function test_recordPunch_basic() {
  _asUser(_TEST_INDIA_EMAIL, () => {
    const r = recordPunch('ClockIn', null);
    _assertSuccess(r);
    _assertEq(r.isAdjustment, false);
    _assertTrue(!!r.displayTime);
  });
}

function test_recordPunch_adjustDedup() {
  _clearTestState(_TEST_INDIA_ID);
  // Pre-existing ClockIn for the test user
  _appendTestPunch(_TEST_INDIA_ID, 'Test India User', _TEST_DATE_RECENT, '09:00:00', 'IN', 'ClockIn');
  _assertEq(_countTimesheetRows(_TEST_INDIA_ID, _TEST_DATE_RECENT, 'ClockIn'), 1);
  // Adjust it (employee immediate-adjust is flag-gated since #4a — enable for
  // the duration so the legacy update-in-place path is exercised)
  _withFeatureFlags_({ employeeImmediateAdjust: true }, () => {
    _asUser(_TEST_INDIA_EMAIL, () => {
      const r = recordPunch('ClockIn', { date: _TEST_DATE_RECENT, time: '08:55', reason: 'corrected' });
      _assertSuccess(r);
    });
  });
  // Should still be exactly ONE row (updated in place, not appended)
  _assertEq(_countTimesheetRows(_TEST_INDIA_ID, _TEST_DATE_RECENT, 'ClockIn'), 1,
    'Adjust should update in place, not duplicate');
}

function test_recordPunch_rejectsBadTimeFormat() {
  _asUser(_TEST_INDIA_EMAIL, () => {
    _assertFailure(
      recordPunch('ClockIn', { date: _TEST_DATE_RECENT, time: '9:00', reason: '' }),
      'Invalid time format'
    );
    _assertFailure(
      recordPunch('ClockIn', { date: _TEST_DATE_RECENT, time: '25:00', reason: '' }),
      'Invalid time format'
    );
    _assertFailure(
      recordPunch('ClockIn', { date: _TEST_DATE_RECENT, time: 'abc', reason: '' }),
      'Invalid time format'
    );
  });
}

function test_recordPunch_rejectsBadDateFormat() {
  _asUser(_TEST_INDIA_EMAIL, () => {
    _assertFailure(
      recordPunch('ClockIn', { date: '05/17/2026', time: '09:00', reason: '' }),
      'Invalid date format'
    );
    _assertFailure(
      recordPunch('ClockIn', { date: '2026-5-17', time: '09:00', reason: '' }),
      'Invalid date format'
    );
  });
}

function test_recordPunch_rejectsFutureDate() {
  _asUser(_TEST_INDIA_EMAIL, () => {
    _assertFailure(
      recordPunch('ClockIn', { date: _TEST_DATE_FUTURE, time: '09:00', reason: 'future' }),
      'future'
    );
  });
}

function test_recordPunch_rejectsBeyondWindow() {
  // Date 60 days back, beyond the 30-day window. Flag enabled so the window
  // check (not the #4a immediate-adjust gate) is what rejects.
  const d = new Date(); d.setDate(d.getDate() - 60);
  const oldDate = Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
  _withFeatureFlags_({ employeeImmediateAdjust: true }, () => {
    _asUser(_TEST_INDIA_EMAIL, () => {
      _assertFailure(
        recordPunch('ClockIn', { date: oldDate, time: '09:00', reason: 'long ago' }),
        'within the last'
      );
    });
  });
}

function test_recordPunch_rejectsUnknownType() {
  _asUser(_TEST_INDIA_EMAIL, () => {
    _assertFailure(recordPunch('Nope', null), 'Unknown punch type');
  });
}

function test_recordPunch_reasonRequiredOldAdj() {
  _withFeatureFlags_({ employeeImmediateAdjust: true }, () => {
    _asUser(_TEST_INDIA_EMAIL, () => {
      // 14 days back, no reason → rejected
      _assertFailure(
        recordPunch('ClockIn', { date: _TEST_DATE_OLD, time: '09:00', reason: '' }),
        'reason is required'
      );
    });
  });
}

// #4a — submit a request (no punch written), manager approves → ADJ punch
// appears, and a re-approve is rejected (transition guard).
function test_punchAdjust_submitApproveWritesPunch() {
  _clearTestState(_TEST_PH_ID);
  let sub;
  _asUser(_TEST_PH_EMAIL, () => {
    sub = submitPunchAdjustRequests([{ date: _TEST_DATE_RECENT, time: '17:30', punchType: 'ClockOut', reason: 'forgot' }]);
  });
  _assertSuccess(sub);
  _assertEq(sub.count, 1, 'one request submitted');
  _assertNull(findExistingPunch_(_TEST_PH_ID, _TEST_DATE_RECENT, 'ClockOut'), 'no punch before approval');

  let pend;
  _asUser(_TEST_MGR_EMAIL, () => { pend = managerGetPendingAdjustments(); });
  const req = (pend.requests || []).filter(function (r) { return r.empId === _TEST_PH_ID && r.punchType === 'ClockOut'; })[0];
  _assertNotNull(req, 'request appears in the manager queue');

  let appr;
  _asUser(_TEST_MGR_EMAIL, () => { appr = updatePunchAdjustStatus(req.reqId, 'Approved'); });
  _assertSuccess(appr);
  _assertNotNull(findExistingPunch_(_TEST_PH_ID, _TEST_DATE_RECENT, 'ClockOut'), 'ADJ punch written on approval');

  let appr2;
  _asUser(_TEST_MGR_EMAIL, () => { appr2 = updatePunchAdjustStatus(req.reqId, 'Approved'); });
  _assertEq(appr2.success, false, 're-approve rejected (no longer pending)');
}

function test_punchAdjust_batchInvalidRejected() {
  _clearTestState(_TEST_PH_ID);
  _asUser(_TEST_PH_EMAIL, () => {
    const r = submitPunchAdjustRequests([
      { date: _TEST_DATE_RECENT, time: '09:00', punchType: 'ClockIn', reason: '' },
      { date: _TEST_DATE_RECENT, time: '25:99', punchType: 'ClockOut', reason: '' },
    ]);
    _assertEq(r.success, false, 'batch rejected when any entry is invalid');
  });
  let mine;
  _asUser(_TEST_PH_EMAIL, () => { mine = getMyPunchAdjustRequests(); });
  _assertEq((mine.requests || []).length, 0, 'no rows written when the batch is rejected');
}

function test_punchAdjust_nonManagerRejected() {
  _asUser(_TEST_PH_EMAIL, () => {
    const r = updatePunchAdjustStatus('nonexistent', 'Approved');
    _assertEq(r.success, false, 'non-manager cannot approve');
    _assertContains(r.error, 'Manager access required');
    const q = managerGetPendingAdjustments();
    _assertNotNull(q.error, 'non-manager cannot read the queue');
  });
}

// P11 — duplicate guards (INV-94 family) on the adjustment queue.
function test_punchAdjust_duplicatePendingRejected() {
  _clearTestState(_TEST_INDIA_ID);
  _asUser(_TEST_INDIA_EMAIL, () => {
    // (a) duplicate (date, punchType) within ONE batch
    _assertFailure(submitPunchAdjustRequests([
      { date: _TEST_DATE_RECENT, time: '09:00', punchType: 'ClockIn', reason: '' },
      { date: _TEST_DATE_RECENT, time: '09:05', punchType: 'ClockIn', reason: '' },
    ]), 'Duplicate adjustment in this batch');
    // (b) duplicate of an EXISTING Pending request
    _assertSuccess(submitPunchAdjustRequests([
      { date: _TEST_DATE_RECENT, time: '09:00', punchType: 'ClockIn', reason: '' },
    ]), 'first request lands');
    _assertFailure(submitPunchAdjustRequests([
      { date: _TEST_DATE_RECENT, time: '09:10', punchType: 'ClockIn', reason: '' },
    ]), 'already have a pending');
    // (c) a DIFFERENT punch type on the same date is still allowed
    _assertSuccess(submitPunchAdjustRequests([
      { date: _TEST_DATE_RECENT, time: '17:00', punchType: 'ClockOut', reason: '' },
    ]), 'different punch type is not a duplicate');
  });
  _clearTestState(_TEST_INDIA_ID);
}

// P11 — approval-time re-validation of the adjust window (a request that aged
// past the window in the queue must not write a punch the submit-time check
// would have rejected).
function test_punchAdjust_approveAgedPastWindowRejected() {
  _clearTestState(_TEST_INDIA_ID);
  const sheet = getOrCreatePunchAdjustSheet_();
  const d = new Date();
  d.setDate(d.getDate() - (CONFIG.ADJUST_WINDOW_DAYS + 10));
  const oldDate = Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
  const reqId = Utilities.getUuid();
  // Fabricate the aged Pending row directly — submitPunchAdjustRequests would
  // (correctly) refuse to create it.
  sheet.appendRow([reqId, _TEST_INDIA_ID, 'Test India User', oldDate, 'ClockIn', '09:00', 'aged in queue', 'Pending', '2026-01-01 00:00:00']);
  try {
    const r = _asUser(_TEST_MGR_EMAIL, () => updatePunchAdjustStatus(reqId, 'Approved'));
    _assertFailure(r, 'older than the', 'aged request cannot be approved');
    _assertEq(_countTimesheetRows(_TEST_INDIA_ID, oldDate, 'ClockIn'), 0, 'no punch was written');
    const r2 = _asUser(_TEST_MGR_EMAIL, () => updatePunchAdjustStatus(reqId, 'Denied'));
    _assertSuccess(r2, 'deny path still works for an aged request');
  } finally {
    _clearTestState(_TEST_INDIA_ID);
  }
}

// Toggle — employee immediate adjust is server-gated by employeeImmediateAdjust.
function test_recordPunch_immediateAdjustGatedByFlag() {
  _clearTestState(_TEST_PH_ID);
  const props = PropertiesService.getScriptProperties();
  const saved = props.getProperty('CN_FEATURE_FLAGS');
  try {
    props.deleteProperty('CN_FEATURE_FLAGS');   // flag off (default)
    let r1;
    _asUser(_TEST_PH_EMAIL, () => { r1 = recordPunch('ClockIn', { date: _TEST_DATE_RECENT, time: '09:00', reason: '' }); });
    _assertEq(r1.success, false, 'immediate adjust blocked when flag off');
    _assertContains(r1.error, 'turned off');
    props.setProperty('CN_FEATURE_FLAGS', JSON.stringify({ employeeImmediateAdjust: true }));
    let r2;
    _asUser(_TEST_PH_EMAIL, () => { r2 = recordPunch('ClockOut', { date: _TEST_DATE_RECENT, time: '17:00', reason: '' }); });
    _assertSuccess(r2);
  } finally {
    if (saved == null) props.deleteProperty('CN_FEATURE_FLAGS');
    else props.setProperty('CN_FEATURE_FLAGS', saved);
  }
}

// #4b — manager multi-day adjust applies the slot times additively across the
// whole range (one punch per day here).
function test_managerSaveDayRange_appliesAcrossDays() {
  _clearTestState(_TEST_PH_ID);
  const isoCt = function (offsetDays) {
    return Utilities.formatDate(new Date(Date.now() + offsetDays * 86400000), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  };
  const from = isoCt(-2), to = isoCt(0);
  let res;
  _asUser(_TEST_MGR_EMAIL, () => {
    res = managerSaveDayRange(_TEST_PH_ID, from, to, { ClockIn: '09:00', LunchOut: '', LunchIn: '', ClockOut: '' }, 'range test');
  });
  _assertSuccess(res);
  _assertEq(res.daysTouched, 3, 'three days in the inclusive range');
  _assertEq(res.punchesWritten, 3, 'one punch written per day');
  _assertNotNull(findExistingPunch_(_TEST_PH_ID, from, 'ClockIn'), 'ClockIn written on the from-date');
  _assertNotNull(findExistingPunch_(_TEST_PH_ID, to, 'ClockIn'), 'ClockIn written on the to-date');
}

function test_managerSaveDayRange_nonManagerRejected() {
  _asUser(_TEST_PH_EMAIL, () => {
    const r = managerSaveDayRange(_TEST_PH_ID, '2099-01-01', '2099-01-02', { ClockIn: '09:00' }, '');
    _assertEq(r.success, false, 'non-manager rejected');
    _assertContains(r.error, 'Manager access required');
  });
}

// #8 — reconcile pass: manager-gated; backfills a hand-entered row (content
// but no noteId) with a UUID + dates, idempotent, content untouched.
function test_reconcileCallNotes_nonManagerRejected() {
  // F1/F2 — reconcile is a trigger handler, so its gate is the MANAGER_EMAILS
  // assertManagerCaller_ (throws), matching the other trigger-gate tests, NOT
  // the emp.isAdmin return-{error} gate it briefly carried under #102/INV-136.
  _assertThrows(function () {
    _asUser(_TEST_INDIA_EMAIL, function () { reconcileCallNotes(); });
  }, 'manager access required', 'Non-manager should not be able to reconcile');
}

function test_reconcileCallNotes_backfillsHandEntered() {
  const emp = lookupEmployeeById_(_TEST_INDIA_ID);
  if (!emp || !emp.callNotesSheetId) { _skipTest('India call-notes Sheet not provisioned'); }
  const sheet = getCallNotesSheet_(emp);
  const row = new Array(CN_HEADERS.length).fill('');
  row[CN.CALLER] = 'Hand Entered Caller';
  row[CN.ISSUE]  = 'typed directly into the sheet';
  sheet.appendRow(row);
  const appended = sheet.getLastRow();
  // reconcileCallNotes is a TRIGGER handler gated on MANAGER_EMAILS
  // (assertManagerCaller_, INV-44/INV-109) — NOT the roster isManager column. In
  // production the nightly trigger runs as the installer, who IS in MANAGER_EMAILS;
  // mirror that by adding the (roster-only) test manager to the property for the
  // run, restored after. (The roster gate that the test manager satisfies is no
  // longer the reconcile gate — cycle-6 F1/F2 fix.)
  const props = PropertiesService.getScriptProperties();
  const prevMgr = props.getProperty('MANAGER_EMAILS');
  props.setProperty('MANAGER_EMAILS', (prevMgr ? prevMgr + ',' : '') + _TEST_MGR_EMAIL);
  try {
    let res;
    _asUser(_TEST_MGR_EMAIL, function () { res = reconcileCallNotes(); });
    _assertSuccess(res);
    _assertTrue(res.rowsBackfilled >= 1, 'at least one hand-entered row backfilled');
    const after = sheet.getRange(appended, 1, 1, CN_HEADERS.length).getValues()[0];
    _assertTrue(String(after[CN.NOTE_ID]).trim().length > 0, 'noteId assigned');
    _assertEq(String(after[CN.CALLER]).trim(), 'Hand Entered Caller', 'content untouched');
    // Idempotent: re-run keeps the same noteId (row now has one → skipped).
    let res2;
    _asUser(_TEST_MGR_EMAIL, function () { res2 = reconcileCallNotes(); });
    const after2 = sheet.getRange(appended, 1, 1, CN_HEADERS.length).getValues()[0];
    _assertEq(String(after2[CN.NOTE_ID]).trim(), String(after[CN.NOTE_ID]).trim(), 'noteId stable on re-run (idempotent)');
  } finally {
    if (prevMgr === null) props.deleteProperty('MANAGER_EMAILS'); else props.setProperty('MANAGER_EMAILS', prevMgr);
    sheet.deleteRow(appended);   // tidy within the run (cleanupTestData also wipes the test Notes tab)
  }
}

// Auto-provision (INV-110): non-manager is rejected before any Drive write.
function test_provisionCallNotesSheet_nonManagerRejected() {
  _asUser(_TEST_INDIA_EMAIL, function () {
    const r = provisionCallNotesSheet(_TEST_INDIA_ID);
    _assertNotNull(r.error, 'non-manager rejected');
    _assertContains(r.error, 'Admin access required');
  });
}

// Auto-provision is idempotent: a rep who already has a Sheet is returned
// unchanged and NO new Spreadsheet is created (never clobbers existing history).
// The India test employee is enrolled by setupTestEnvironment, so this exercises
// the no-clobber branch without littering Drive with a fresh Sheet.
function test_provisionCallNotesSheet_idempotentNoClobber() {
  const emp = lookupEmployeeById_(_TEST_INDIA_ID);
  if (!emp || !emp.callNotesSheetId) { _skipTest('India call-notes Sheet not provisioned'); }
  const before = emp.callNotesSheetId;
  let res;
  _asUser(_TEST_MGR_EMAIL, function () { res = provisionCallNotesSheet(_TEST_INDIA_ID); });
  _assertSuccess(res);
  _assertTrue(res.alreadyEnrolled === true, 'already-enrolled rep returns alreadyEnrolled');
  _assertEq(res.sheetId, before, 'existing sheetId is NOT clobbered');
  invalidateRosterCache_();
  const after = lookupEmployeeById_(_TEST_INDIA_ID);
  _assertEq(after.callNotesSheetId, before, 'column L unchanged after a no-clobber provision');
}

function test_recordPunch_reasonAcceptedOldAdj() {
  _withFeatureFlags_({ employeeImmediateAdjust: true }, () => {
    _asUser(_TEST_INDIA_EMAIL, () => {
      // 14 days back, WITH reason → accepted
      const r = recordPunch('ClockIn', {
        date: _TEST_DATE_OLD, time: '09:00', reason: 'forgot to punch in'
      });
      _assertSuccess(r);
    });
  });
}

// ── submitTimeOffRequest ──

function test_submitTimeOff_createsRow() {
  _clearTestState(_TEST_INDIA_ID);   // hermetic: dup-date guard now rejects a 2nd same-date submit (H1)
  _asUser(_TEST_INDIA_EMAIL, () => {
    const r = submitTimeOffRequest(_TEST_DATE_FUTURE, 'Full Day', 'doctor visit');
    _assertSuccess(r);
  });
  const row = _findTimeOffRow(_TEST_INDIA_ID, _TEST_DATE_FUTURE);
  _assertNotNull(row, 'Time-off row should exist');
  _assertEq(row.type, 'Full Day');
  _assertEq(row.status, 'Pending');
}

function test_submitTimeOff_rejectsBadDate() {
  _asUser(_TEST_INDIA_EMAIL, () => {
    _assertFailure(submitTimeOffRequest('05/17/2026', 'Full Day', ''), 'Invalid date');
  });
}

// H1 — a second request for a date that already has a Pending (or Approved)
// row is rejected, so dual approval can't double-deduct the balance.
function test_submitTimeOff_duplicateDateRejected() {
  _clearTestState(_TEST_INDIA_ID);
  _asUser(_TEST_INDIA_EMAIL, () => {
    _assertSuccess(submitTimeOffRequest(_TEST_DATE_FUTURE, 'Full Day', 'first'));
    _assertFailure(submitTimeOffRequest(_TEST_DATE_FUTURE, 'Full Day', 'dupe'),
      'already have a pending or approved');
  });
  // Exactly one row should exist for that emp+date.
  const ss = getAdpSS_();
  const rows = ss.getSheetByName(CONFIG.TIMEOFF_TAB).getDataRange().getValues();
  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][TO.EMP_ID]).trim() === _TEST_INDIA_ID
        && normalizeDate_(rows[i][TO.DATE]) === _TEST_DATE_FUTURE) count++;
  }
  _assertEq(count, 1, 'Duplicate same-date request must not create a 2nd row');
}

// M1 — an unrecognized leave type is rejected rather than silently defaulting
// to annual/1.0 in getLeaveDeduction_.
function test_submitTimeOff_invalidTypeRejected() {
  _clearTestState(_TEST_INDIA_ID);
  _asUser(_TEST_INDIA_EMAIL, () => {
    _assertFailure(submitTimeOffRequest(_TEST_DATE_FUTURE, 'Half Day', ''), 'Invalid leave type');
    _assertFailure(submitTimeOffRequest(_TEST_DATE_FUTURE, '', ''), 'Invalid leave type');
  });
}

// ── cancelTimeOffRequest ──

function test_cancelTimeOff_pendingDeletes() {
  _clearTestState(_TEST_PH_ID);   // hermetic: dup-date guard now rejects a 2nd same-date submit (H1)
  // Submit
  _asUser(_TEST_PH_EMAIL, () => {
    _assertSuccess(submitTimeOffRequest(_TEST_DATE_FUTURE, 'Full Day', 'vacation'));
  });
  const row = _findTimeOffRow(_TEST_PH_ID, _TEST_DATE_FUTURE);
  _assertNotNull(row);
  // Cancel (as same employee)
  _asUser(_TEST_PH_EMAIL, () => {
    _assertSuccess(cancelTimeOffRequest(_TEST_DATE_FUTURE, row.submittedAt));
  });
  // Row should be gone
  _assertNull(_findTimeOffRow(_TEST_PH_ID, _TEST_DATE_FUTURE), 'Row should be deleted');
}

function test_cancelTimeOff_approvedRejected() {
  _clearTestState(_TEST_PH_ID);   // hermetic: dup-date guard now rejects a 2nd same-date submit (H1)
  _asUser(_TEST_PH_EMAIL, () => {
    _assertSuccess(submitTimeOffRequest(_TEST_DATE_FUTURE, 'Full Day', ''));
  });
  const row = _findTimeOffRow(_TEST_PH_ID, _TEST_DATE_FUTURE);
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertSuccess(updateTimeOffStatus(_TEST_PH_ID, _TEST_DATE_FUTURE, row.submittedAt, 'Approved'));
  });
  _asUser(_TEST_PH_EMAIL, () => {
    _assertFailure(cancelTimeOffRequest(_TEST_DATE_FUTURE, row.submittedAt), 'Only pending');
  });
}

// ── updateTimeOffStatus (PTO math heart) ──

function test_updateTimeOff_approveDeductsAnnual() {
  _clearTestState(_TEST_PH_ID);
  _asUser(_TEST_PH_EMAIL, () => {
    _assertSuccess(submitTimeOffRequest(_TEST_DATE_FUTURE, 'Full Day', ''));
  });
  const row = _findTimeOffRow(_TEST_PH_ID, _TEST_DATE_FUTURE);
  const before = _getBalance(_TEST_PH_ID, 'annual');
  _asUser(_TEST_MGR_EMAIL, () => {
    const r = updateTimeOffStatus(_TEST_PH_ID, _TEST_DATE_FUTURE, row.submittedAt, 'Approved');
    _assertSuccess(r);
    _assertEqClose(r.newBalance, before - 1);
  });
  _assertEqClose(_getBalance(_TEST_PH_ID, 'annual'), before - 1, 'Annual deducted by 1');
}

function test_updateTimeOff_approveDeductsSick() {
  _clearTestState(_TEST_PH_ID);
  // Sick Leave is no longer creatable via the submit whitelist (INV-95), but the
  // sick BUCKET machinery is intentionally kept for legacy rows (INV-17). Write a
  // Pending sick row DIRECTLY (bypassing the whitelist) to prove the
  // Pending->Approved transition still deducts from the sick bucket.
  const submittedAt = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
  getOrCreateTimeOffSheet_().appendRow(
    [_TEST_PH_ID, _TEST_PH_NAME, _TEST_DATE_FUTURE, 'Sick Leave', 'legacy', 'Pending', submittedAt]);
  const row = _findTimeOffRow(_TEST_PH_ID, _TEST_DATE_FUTURE);
  const before = _getBalance(_TEST_PH_ID, 'sick');
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertSuccess(updateTimeOffStatus(_TEST_PH_ID, _TEST_DATE_FUTURE, row.submittedAt, 'Approved'));
  });
  _assertEqClose(_getBalance(_TEST_PH_ID, 'sick'), before - 1, 'Sick deducted by 1');
  _assertEqClose(_getBalance(_TEST_PH_ID, 'annual'), _TEST_INITIAL_ANNUAL, 'Annual untouched');
}

function test_updateTimeOff_revertRestores() {
  _clearTestState(_TEST_PH_ID);
  _asUser(_TEST_PH_EMAIL, () => {
    _assertSuccess(submitTimeOffRequest(_TEST_DATE_FUTURE, 'Full Day', ''));
  });
  const row = _findTimeOffRow(_TEST_PH_ID, _TEST_DATE_FUTURE);
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertSuccess(updateTimeOffStatus(_TEST_PH_ID, _TEST_DATE_FUTURE, row.submittedAt, 'Approved'));
  });
  _assertEqClose(_getBalance(_TEST_PH_ID, 'annual'), _TEST_INITIAL_ANNUAL - 1);
  // Revert
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertSuccess(updateTimeOffStatus(_TEST_PH_ID, _TEST_DATE_FUTURE, row.submittedAt, 'Denied'));
  });
  _assertEqClose(_getBalance(_TEST_PH_ID, 'annual'), _TEST_INITIAL_ANNUAL, 'Balance restored');
}

function test_updateTimeOff_pendingToDenied_noChange() {
  _clearTestState(_TEST_PH_ID);
  _asUser(_TEST_PH_EMAIL, () => {
    _assertSuccess(submitTimeOffRequest(_TEST_DATE_FUTURE, 'Full Day', ''));
  });
  const row = _findTimeOffRow(_TEST_PH_ID, _TEST_DATE_FUTURE);
  const before = _getBalance(_TEST_PH_ID, 'annual');
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertSuccess(updateTimeOffStatus(_TEST_PH_ID, _TEST_DATE_FUTURE, row.submittedAt, 'Denied'));
  });
  _assertEqClose(_getBalance(_TEST_PH_ID, 'annual'), before,
    'Pending→Denied should not change balance');
}

function test_updateTimeOff_halfDay_deductsHalf() {
  _clearTestState(_TEST_PH_ID);
  _asUser(_TEST_PH_EMAIL, () => {
    _assertSuccess(submitTimeOffRequest(_TEST_DATE_FUTURE, 'Half Day - Morning', ''));
  });
  const row = _findTimeOffRow(_TEST_PH_ID, _TEST_DATE_FUTURE);
  const before = _getBalance(_TEST_PH_ID, 'annual');
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertSuccess(updateTimeOffStatus(_TEST_PH_ID, _TEST_DATE_FUTURE, row.submittedAt, 'Approved'));
  });
  _assertEqClose(_getBalance(_TEST_PH_ID, 'annual'), before - 0.5);
}

function test_updateTimeOff_nonManagerRejected() {
  _clearTestState(_TEST_PH_ID);
  _asUser(_TEST_PH_EMAIL, () => {
    _assertSuccess(submitTimeOffRequest(_TEST_DATE_FUTURE, 'Full Day', ''));
  });
  const row = _findTimeOffRow(_TEST_PH_ID, _TEST_DATE_FUTURE);
  // Try to approve as a non-manager
  _asUser(_TEST_INDIA_EMAIL, () => {
    _assertFailure(
      updateTimeOffStatus(_TEST_PH_ID, _TEST_DATE_FUTURE, row.submittedAt, 'Approved'),
      'Manager access required'
    );
  });
  // Status should still be Pending
  const stillPending = _findTimeOffRow(_TEST_PH_ID, _TEST_DATE_FUTURE);
  _assertEq(stillPending.status, 'Pending');
}

// ── deletePunch ──

function test_deletePunch_withinWindow() {
  _clearTestState(_TEST_INDIA_ID);
  _appendTestPunch(_TEST_INDIA_ID, 'Test India User', _TEST_DATE_RECENT, '09:00:00', 'IN', 'ClockIn');
  _assertEq(_countTimesheetRows(_TEST_INDIA_ID, _TEST_DATE_RECENT, 'ClockIn'), 1);
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertSuccess(deletePunch(_TEST_INDIA_ID, _TEST_DATE_RECENT, '09:00:00', 'ClockIn'));
  });
  _assertEq(_countTimesheetRows(_TEST_INDIA_ID, _TEST_DATE_RECENT, 'ClockIn'), 0);
}

function test_deletePunch_beyondWindowRejected() {
  _clearTestState(_TEST_INDIA_ID);
  const d = new Date(); d.setDate(d.getDate() - 20);
  const oldDate = Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
  _appendTestPunch(_TEST_INDIA_ID, 'Test India User', oldDate, '09:00:00', 'IN', 'ClockIn');
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertFailure(
      deletePunch(_TEST_INDIA_ID, oldDate, '09:00:00', 'ClockIn'),
      'older than'
    );
  });
  // Row should still exist
  _assertEq(_countTimesheetRows(_TEST_INDIA_ID, oldDate, 'ClockIn'), 1);
}

function test_deletePunch_notFound() {
  _clearTestState(_TEST_INDIA_ID);
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertFailure(
      deletePunch(_TEST_INDIA_ID, _TEST_DATE_RECENT, '09:00:00', 'ClockIn'),
      'not found'
    );
  });
}

function test_deletePunch_nonManagerRejected() {
  _clearTestState(_TEST_INDIA_ID);
  _appendTestPunch(_TEST_INDIA_ID, 'Test India User', _TEST_DATE_RECENT, '09:00:00', 'IN', 'ClockIn');
  _asUser(_TEST_INDIA_EMAIL, () => {
    _assertFailure(
      deletePunch(_TEST_INDIA_ID, _TEST_DATE_RECENT, '09:00:00', 'ClockIn'),
      'Manager access required'
    );
  });
  _assertEq(_countTimesheetRows(_TEST_INDIA_ID, _TEST_DATE_RECENT, 'ClockIn'), 1, 'Row preserved');
}

// ── getManagerDashboard shape ──

function test_managerDashboard_returnsExpectedShape() {
  _asUser(_TEST_MGR_EMAIL, () => {
    const r = getManagerDashboard();
    _assertTrue(!r.error, 'No error: ' + r.error);
    _assertNotNull(r.liveStatus,     'liveStatus present');
    _assertNotNull(r.pending,        'pending present');
    _assertNotNull(r.missedPunches,  'missedPunches present');
    _assertNotNull(r.recentPunches,  'recentPunches present');
    _assertNotNull(r.recentAudits,   'recentAudits present');
    _assertNotNull(r.mgrTzAbbr,      'mgrTzAbbr present');
    _assertEq(typeof r.mgrDeleteWindowDays, 'number', 'mgrDeleteWindowDays is number');
    _assertEq(typeof r.ptoEnabled, 'boolean', 'ptoEnabled is boolean');
    _assertTrue(Array.isArray(r.liveStatus));
    _assertTrue(Array.isArray(r.recentPunches));
  });
}

// ── Bounded audit read (Bug 3 regression) ──

function test_boundedAuditRead() {
  // Generate 25 test audit entries
  const testEmp = { id: _TEST_INDIA_ID, name: 'Test India User', email: _TEST_INDIA_EMAIL };
  for (let i = 0; i < 25; i++) {
    writeAuditLog_(testEmp, 'BoundedReadTest', _TEST_DATE_RECENT, '12:00:00', false, 0, 'audit-' + i);
  }
  _asUser(_TEST_MGR_EMAIL, () => {
    const r = getManagerDashboard();
    _assertEq(r.recentAudits.length, 20,
      `Bounded read should return exactly 20 entries, got ${r.recentAudits.length}`);
  });
}

// ── Timezone fallback ──

function test_emptyTimezone_fallsBackToConfig() {
  // Temporarily blank out the timezone column for TEST_IN_001
  const sheet = getAdpSS_().getSheetByName(CONFIG.EMPLOYEE_TAB);
  const rows = sheet.getDataRange().getValues();
  let targetRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][EMP.ID]).trim() === _TEST_INDIA_ID) { targetRow = i + 1; break; }
  }
  _assertTrue(targetRow > 0);
  const original = sheet.getRange(targetRow, EMP.TIMEZONE + 1).getValue();
  sheet.getRange(targetRow, EMP.TIMEZONE + 1).setValue('');
  invalidateRosterCache_();
  try {
    _asUser(_TEST_INDIA_EMAIL, () => {
      const info = getEmployeeInfo_();
      _assertEq(info.timezone, CONFIG.TIMEZONE, 'Blank tz falls back to CONFIG.TIMEZONE');
    });
  } finally {
    sheet.getRange(targetRow, EMP.TIMEZONE + 1).setValue(original);
    invalidateRosterCache_();
  }
}

function test_emptyLeaveBalance_treatedAsZero() {
  const sheet = getAdpSS_().getSheetByName(CONFIG.EMPLOYEE_TAB);
  const rows = sheet.getDataRange().getValues();
  let targetRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][EMP.ID]).trim() === _TEST_INDIA_ID) { targetRow = i + 1; break; }
  }
  const origA = sheet.getRange(targetRow, EMP.ANNUAL_LEAVE + 1).getValue();
  const origS = sheet.getRange(targetRow, EMP.SICK_LEAVE + 1).getValue();
  sheet.getRange(targetRow, EMP.ANNUAL_LEAVE + 1).setValue('');
  sheet.getRange(targetRow, EMP.SICK_LEAVE + 1).setValue('');
  invalidateRosterCache_();
  try {
    _asUser(_TEST_INDIA_EMAIL, () => {
      const info = getEmployeeInfo_();
      _assertEq(info.annualLeave, 0);
      _assertEq(info.sickLeave, 0);
    });
  } finally {
    sheet.getRange(targetRow, EMP.ANNUAL_LEAVE + 1).setValue(origA);
    sheet.getRange(targetRow, EMP.SICK_LEAVE + 1).setValue(origS);
    invalidateRosterCache_();
  }
}

// ── installAutomationTriggers auth gate (Bug 6) ──

function test_installAutomationTriggers_nonManagerThrows() {
  _asUser(_TEST_INDIA_EMAIL, () => {
    _assertThrows(() => installAutomationTriggers(), 'managers');
  });
}


// ════════════════════════════════════════════════════════════════════════════
//  NEW-ENDPOINT TESTS (post-sync coverage backfill)
// ════════════════════════════════════════════════════════════════════════════

// ── Pure-logic helpers: timeDiffSeconds_ + normalizeTime_ (smoke) ──

function test_timeDiffSeconds_positive() {
  _assertEq(timeDiffSeconds_('09:00:00', '09:00:30'), 30);
  _assertEq(timeDiffSeconds_('09:00:00', '09:01:00'), 60);
  _assertEq(timeDiffSeconds_('09:00:00', '10:00:00'), 3600);
}

function test_timeDiffSeconds_negative() {
  // Earlier > later signals "skip the window check" (treated as different day).
  _assertTrue(timeDiffSeconds_('09:00:30', '09:00:00') < 0,
    'later before earlier yields negative');
}

function test_timeDiffSeconds_HHmmFormat() {
  // Accepts strings without seconds.
  _assertEq(timeDiffSeconds_('09:00', '09:01'), 60);
  _assertEq(timeDiffSeconds_('09:00:00', '09:01'), 60);
}

function test_timeDiffSeconds_invalidInput() {
  // Returns -1 (caller treats as "skip the window check") for non-time inputs.
  _assertEq(timeDiffSeconds_('abc', '09:00:00'), -1);
  _assertEq(timeDiffSeconds_('', ''), -1);
}

function test_normalizeTime_passthroughString() {
  _assertEq(normalizeTime_('09:00:00'), '09:00:00');
  _assertEq(normalizeTime_('14:30:00'), '14:30:00');
  _assertEq(normalizeTime_('  09:00:00  '), '09:00:00', 'Whitespace trimmed');
  _assertEq(normalizeTime_(''), '', 'Empty string passes through');
}

function test_normalizeTime_DateObject() {
  // Construct a Date and verify it formats to HH:mm:ss. Exact value depends on
  // the spreadsheet's timezone, so we assert format and idempotence only.
  const d = new Date(2026, 4, 17, 9, 30, 0);
  const result = normalizeTime_(d);
  _assertTrue(/^\d{2}:\d{2}:\d{2}$/.test(result),
    `Should match HH:mm:ss, got "${result}"`);
  _assertEq(normalizeTime_(d), result, 'Idempotent across calls');
}


// ── Helpers shared by new integration tests ──

function _empTzToday(empTz) {
  return Utilities.formatDate(new Date(), empTz, 'yyyy-MM-dd');
}
function _empTzNow(empTz) {
  return Utilities.formatDate(new Date(), empTz, 'HH:mm:ss');
}

function _findLatestAuditNote(empId, action) {
  // Walks audit log bottom-up; returns the notes column for the most-recent
  // matching (empId, action) row, or null if none. Audit columns are:
  // 0=timestamp, 1=empId, 2=empName, 3=empEmail, 4=action,
  // 5=punchDate, 6=punchTime, 7=isAdj, 8=daysBack, 9=notes, 10=callerEmail
  const rows = getOrCreateAuditSheet_().getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]).trim() === empId
        && String(rows[i][4]).trim() === action) {
      return String(rows[i][9] || '');
    }
  }
  return null;
}

function _setEmpPtoEnabled(empId, value) {
  // Sets column K (EMP.PTO_ENABLED) and returns the original value so callers
  // can restore in finally. Invalidates the roster cache on each write.
  const sheet = getAdpSS_().getSheetByName(CONFIG.EMPLOYEE_TAB);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][EMP.ID]).trim() === empId) {
      const cell = sheet.getRange(i + 1, EMP.PTO_ENABLED + 1);
      const original = cell.getValue();
      cell.setValue(value);
      invalidateRosterCache_();
      return original;
    }
  }
  throw new Error('Employee not found in Employees sheet: ' + empId);
}


function _setEmpSchedule(empId, value) {
  // Sets column O (EMP.SCHEDULE — Turn D per-rep shift override) and returns
  // the original so callers restore in finally. Mirrors _setEmpPtoEnabled.
  const sheet = getAdpSS_().getSheetByName(CONFIG.EMPLOYEE_TAB);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][EMP.ID]).trim() === empId) {
      const cell = sheet.getRange(i + 1, EMP.SCHEDULE + 1);
      const original = cell.getValue();
      cell.setValue(value);
      invalidateRosterCache_();
      return original;
    }
  }
  throw new Error('Employee not found in Employees sheet: ' + empId);
}

// Turn D — per-rep shift override (roster column O): a valid override drives
// the schedule shipped to the client (ribbon/countdown) and used by coverage/
// punctuality; a garbage cell falls back to the per-tz CONFIG.SHIFT_SCHEDULE
// (fail-safe); breaks always come from the per-tz schedule.
function test_perRepSchedule_overrideAndFallback() {
  const original = _setEmpSchedule(_TEST_INDIA_ID, '9:15-17:45');
  try {
    let emp = lookupEmployeeById_(_TEST_INDIA_ID);
    _assertEq(emp.scheduleRaw, '9:15-17:45', 'roster carries the raw override cell');
    const tz = safeTimezone_(emp.timezone);
    let sched = empShiftSchedule_(emp, tz);
    _assertEq(sched.startMin, 555, 'override start 9:15');
    _assertEq(sched.lengthMin, 510, 'override length 8.5h');
    _assertTrue(sched.override === true, 'override flagged');
    const base = getShiftSchedule_(tz);
    _assertEq(JSON.stringify(sched.breaks), JSON.stringify(base.breaks), 'breaks still come from the per-tz schedule');
    // The client-shipped schedule reflects it too.
    const state = _asUser(_TEST_INDIA_EMAIL, function () { return getEmployeeState(); });
    _assertEq(state.schedule.startMin, 555, 'getEmployeeState ships the override');

    // Garbage cell -> per-tz fallback, never a broken schedule.
    _setEmpSchedule(_TEST_INDIA_ID, '17:00-9:00');   // overnight = invalid
    emp = lookupEmployeeById_(_TEST_INDIA_ID);
    sched = empShiftSchedule_(emp, tz);
    _assertEq(sched.startMin, base.startMin, 'invalid override falls back to the per-tz start');
    _assertEq(sched.lengthMin, base.lengthMin, 'invalid override falls back to the per-tz length');
    _assertTrue(!sched.override, 'fallback not flagged as override');
  } finally {
    _setEmpSchedule(_TEST_INDIA_ID, original);
  }
}

// ── recordPunch min-interval debounce (INV-22) ──

function test_recordPunch_minIntervalRejectsRapidLive() {
  // Two back-to-back live punches: the second should be rejected. Uses _TEST_PH
  // because prior tests don't punch them live, so we know the only "previous
  // punch today" is the one this test just wrote.
  _asUser(_TEST_PH_EMAIL, () => {
    const r1 = recordPunch('ClockIn', null);
    _assertSuccess(r1, 'First live punch should succeed');
    _assertFailure(recordPunch('LunchOut', null), 'just',
      'Second live punch within 30s should be rejected with a "just Xs ago" message');
  });
}

function test_recordPunch_minIntervalAllowsAdjustment() {
  // Adjustments bypass the debounce check (isAdj branch is excluded). Even with
  // a fresh live punch in the recent history, an adjustment for a past date
  // should succeed. (Flag-gated since #4a — enabled for the duration.)
  _withFeatureFlags_({ employeeImmediateAdjust: true }, () => {
    _asUser(_TEST_PH_EMAIL, () => {
      const r = recordPunch('ClockOut', {
        date: _TEST_DATE_RECENT, time: '17:00', reason: '',
      });
      _assertSuccess(r, 'Adjustment should bypass min-interval');
      _assertEq(r.isAdjustment, true);
    });
  });
}


// ── selfDeletePunch (INV-23) ──

function test_selfDeletePunch_withinWindow() {
  // Pre-position a punch at "now" for the manager test user (clean state — no
  // prior recordPunch tests target _TEST_MGR). Then self-undo it.
  const empTz = 'America/Chicago';
  const today = _empTzToday(empTz);
  const time  = _empTzNow(empTz);
  _appendTestPunch(_TEST_MGR_ID, 'Test US Manager', today, time, 'IN', 'ClockIn');
  _assertEq(_countTimesheetRows(_TEST_MGR_ID, today, 'ClockIn'), 1, 'Punch was inserted');

  _asUser(_TEST_MGR_EMAIL, () => {
    _assertSuccess(selfDeletePunch(today, time, 'ClockIn'));
  });

  _assertEq(_countTimesheetRows(_TEST_MGR_ID, today, 'ClockIn'), 0, 'Row removed');
  _assertNotNull(_findLatestAuditNote(_TEST_MGR_ID, 'PunchSelfUndo'),
    'PunchSelfUndo audit row should exist');
}

function test_selfDeletePunch_beyondWindow() {
  // The time-window check fires before any row scan — no need to pre-position.
  const empTz = 'America/Chicago';
  const today = _empTzToday(empTz);
  const past = new Date(Date.now() - 6 * 60 * 1000);  // 6 min ago, beyond 5-min window
  const oldTime = Utilities.formatDate(past, empTz, 'HH:mm:ss');

  _asUser(_TEST_MGR_EMAIL, () => {
    _assertFailure(selfDeletePunch(today, oldTime, 'ClockIn'), 'within',
      'Should reject with "Self-undo only works within X minutes" message');
  });
}

function test_selfDeletePunch_rejectsAdjustment() {
  // Insert an adjustment punch (ADJ-ClockIn in COMMENTS). Self-undo must reject
  // even though date+time+type match — leaving adjustments to go through Adjust
  // preserves the audit trail.
  const empTz = 'America/Chicago';
  const today = _empTzToday(empTz);
  const time  = _empTzNow(empTz);
  _appendTestPunch(_TEST_MGR_ID, 'Test US Manager', today, time, 'IN', 'ADJ-ClockIn');

  _asUser(_TEST_MGR_EMAIL, () => {
    _assertFailure(selfDeletePunch(today, time, 'ClockIn'), 'adjustment');
  });

  // Row should still exist
  _assertEq(_countTimesheetRows(_TEST_MGR_ID, today, 'ClockIn'), 1,
    'Adjustment row not removed by self-undo attempt');
}

function test_selfDeletePunch_rejectsOtherDay() {
  // Date check fires before any row scan — no need to pre-position a row.
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertFailure(
      selfDeletePunch(_TEST_DATE_RECENT, '09:00:00', 'ClockIn'),
      'today'
    );
  });
}

function test_selfDeletePunch_unknownType() {
  // Punch-type validation fires before date/time/scan logic.
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertFailure(selfDeletePunch('2026-05-19', '09:00:00', 'Nope'),
      'Invalid punch type');
  });
}


// ── managerSubmitTimeOff (INV-25) ──

function test_managerSubmitTimeOff_pendingFlow() {
  // Submit without auto-approve. Verify return + balance untouched.
  _clearTestState(_TEST_INDIA_ID);   // hermetic: dup-date guard now rejects a 2nd same-date submit (H1)
  const before = _getBalance(_TEST_INDIA_ID, 'annual');
  _asUser(_TEST_MGR_EMAIL, () => {
    const r = managerSubmitTimeOff(
      _TEST_INDIA_ID, _TEST_DATE_FUTURE, 'Full Day', 'mgr-filed', false
    );
    _assertSuccess(r);
    _assertEq(r.status, 'Pending');
    _assertNull(r.newBalance, 'No balance change when not auto-approving');
  });
  _assertEqClose(_getBalance(_TEST_INDIA_ID, 'annual'), before,
    'Balance unchanged on pending');
}

function test_managerSubmitTimeOff_autoApproveDeducts() {
  _clearTestState(_TEST_PH_ID);   // hermetic: dup-date guard now rejects a 2nd same-date submit (H1)
  const before = _getBalance(_TEST_PH_ID, 'annual');
  _asUser(_TEST_MGR_EMAIL, () => {
    const r = managerSubmitTimeOff(
      _TEST_PH_ID, _TEST_DATE_FUTURE, 'Full Day', '', true
    );
    _assertSuccess(r);
    _assertEq(r.status, 'Approved');
    _assertEqClose(r.newBalance, before - 1);
  });
  _assertEqClose(_getBalance(_TEST_PH_ID, 'annual'), before - 1,
    'Annual deducted by 1 on auto-approve');
}

function test_managerSubmitTimeOff_autoApproveHalfDay() {
  _clearTestState(_TEST_PH_ID);   // hermetic: dup-date guard now rejects a 2nd same-date submit (H1)
  const before = _getBalance(_TEST_PH_ID, 'annual');
  _asUser(_TEST_MGR_EMAIL, () => {
    const r = managerSubmitTimeOff(
      _TEST_PH_ID, _TEST_DATE_FUTURE, 'Half Day - Morning', '', true
    );
    _assertSuccess(r);
    _assertEqClose(r.newBalance, before - 0.5);
  });
  _assertEqClose(_getBalance(_TEST_PH_ID, 'annual'), before - 0.5);
}

function test_managerSubmitTimeOff_nonManagerRejected() {
  // Even though _TEST_INDIA is the target, calling as them must be rejected.
  _asUser(_TEST_INDIA_EMAIL, () => {
    _assertFailure(
      managerSubmitTimeOff(_TEST_PH_ID, _TEST_DATE_FUTURE, 'Full Day', '', false),
      'Manager access required'
    );
  });
}

function test_managerSubmitTimeOff_badDateRejected() {
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertFailure(
      managerSubmitTimeOff(_TEST_PH_ID, '05/17/2026', 'Full Day', '', false),
      'Invalid date format'
    );
  });
}

function test_managerSubmitTimeOff_employeeNotFound() {
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertFailure(
      managerSubmitTimeOff('TEST_NOPE_999', _TEST_DATE_FUTURE, 'Full Day', '', false),
      'Employee not found'
    );
  });
}

// H1 — the manager-filed path is guarded too: it can't stack a second
// active request on a date the employee already has Pending/Approved.
function test_managerSubmitTimeOff_duplicateDateRejected() {
  _clearTestState(_TEST_PH_ID);
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertSuccess(managerSubmitTimeOff(_TEST_PH_ID, _TEST_DATE_FUTURE, 'Full Day', '', false));
    _assertFailure(
      managerSubmitTimeOff(_TEST_PH_ID, _TEST_DATE_FUTURE, 'Full Day', '', true),
      'already has a pending or approved'
    );
  });
}

// B1 — getPtoReconciliation flags a rep with two Approved rows on one date
// (the H1 double-deduct signature) and quantifies the over-charge. The submit
// endpoints now block duplicates (INV-94), so the rows are appended directly.
function test_getPtoReconciliation_detectsDoubleDeduct() {
  _clearTestState(_TEST_PH_ID);
  const sheet = getOrCreateTimeOffSheet_();
  const sa = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
  sheet.appendRow([_TEST_PH_ID, 'Test PH User', _TEST_DATE_FUTURE, 'Full Day', '', 'Approved', sa]);
  sheet.appendRow([_TEST_PH_ID, 'Test PH User', _TEST_DATE_FUTURE, 'Full Day', '', 'Approved', sa + ' b']);
  let res;
  _asUser(_TEST_MGR_EMAIL, () => { res = getPtoReconciliation(); });
  _assertNotNull(res && res.reps, 'reconciliation returns reps');
  const row = (res.reps || []).filter(function (r) { return r.empId === _TEST_PH_ID; })[0];
  _assertNotNull(row, 'PH flagged for drift');
  _assertEqClose(row.overAnnual, 1.0, 0.001, 'over-charged exactly 1 annual day');
  _assertEq(row.dates.length, 1, 'one duplicate date');
}

function test_getPtoReconciliation_nonManagerRejected() {
  _asUser(_TEST_PH_EMAIL, () => {
    const r = getPtoReconciliation();
    _assertNotNull(r.error, 'non-manager gets an error');
    _assertContains(r.error, 'Manager access required');
  });
}

// B1 corrector — credits the over-charge, neutralizes the duplicate row, and a
// re-run is a no-op (idempotent). Reproduce the H1 damage realistically: two
// Pending rows (appended directly since submit blocks dups now), both Approved
// via updateTimeOffStatus → double-deduct, then reconcile.
function test_fixPtoReconciliation_creditsAndIdempotent() {
  _clearTestState(_TEST_PH_ID);
  const sheet = getOrCreateTimeOffSheet_();
  sheet.appendRow([_TEST_PH_ID, 'Test PH User', _TEST_DATE_FUTURE, 'Full Day', '', 'Pending', '2099-01-01 09:00:00']);
  sheet.appendRow([_TEST_PH_ID, 'Test PH User', _TEST_DATE_FUTURE, 'Full Day', '', 'Pending', '2099-01-01 09:00:01']);
  SpreadsheetApp.flush();
  // Sheets coerces the appended SubmittedAt strings to Dates; updateTimeOffStatus
  // now matches normalizeAuditTs_(cell) (M1), so read the keys BACK the same
  // way the production flow does (the dashboard sends the normalized string to
  // the client, which echoes it on approve).
  const lastRowIdx = sheet.getLastRow();
  const stored = sheet.getRange(lastRowIdx - 1, TO.SUBMITTED_AT + 1, 2, 1).getValues();
  const sa1 = normalizeAuditTs_(stored[0][0]), sa2 = normalizeAuditTs_(stored[1][0]);
  const before = _getBalance(_TEST_PH_ID, 'annual');
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertSuccess(updateTimeOffStatus(_TEST_PH_ID, _TEST_DATE_FUTURE, sa1, 'Approved'));
    _assertSuccess(updateTimeOffStatus(_TEST_PH_ID, _TEST_DATE_FUTURE, sa2, 'Approved'));
  });
  _assertEqClose(_getBalance(_TEST_PH_ID, 'annual'), before - 2.0, 0.001, 'double-deducted by 2');

  let res;
  _asUser(_TEST_MGR_EMAIL, () => { res = fixPtoReconciliation(_TEST_PH_ID); });
  _assertSuccess(res);
  _assertEq(res.fixed, true, 'reported a fix');
  _assertEqClose(res.creditedAnnual, 1.0, 0.001, 'credited 1 annual day');
  _assertEqClose(_getBalance(_TEST_PH_ID, 'annual'), before - 1.0, 0.001, 'balance corrected to a single deduction');

  // Idempotent: reconciliation now clean, and a second fix credits nothing.
  let recon;
  _asUser(_TEST_MGR_EMAIL, () => { recon = getPtoReconciliation(); });
  const stillFlagged = (recon.reps || []).filter(function (r) { return r.empId === _TEST_PH_ID; })[0];
  _assertNull(stillFlagged, 'no longer flagged after the fix');
  let res2;
  _asUser(_TEST_MGR_EMAIL, () => { res2 = fixPtoReconciliation(_TEST_PH_ID); });
  _assertSuccess(res2);
  _assertEq(res2.fixed, false, 'second fix is a no-op (idempotent)');
  _assertEqClose(_getBalance(_TEST_PH_ID, 'annual'), before - 1.0, 0.001, 'balance unchanged by the no-op');
}

function test_fixPtoReconciliation_nonManagerRejected() {
  _asUser(_TEST_PH_EMAIL, () => {
    const r = fixPtoReconciliation(_TEST_PH_ID);
    _assertEq(r.success, false, 'non-manager rejected');
    _assertContains(r.error, 'Manager access required');
  });
}

function test_managerSubmitTimeOff_writesAudit() {
  // Auto-approve marks "filed by manager, auto-approved" in the notes column.
  _clearTestState(_TEST_INDIA_ID);   // hermetic: dup-date guard now rejects a 2nd same-date submit (H1)
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertSuccess(managerSubmitTimeOff(
      _TEST_INDIA_ID, _TEST_DATE_FUTURE, 'Personal Day', 'family event', true
    ));
  });
  const notes = _findLatestAuditNote(_TEST_INDIA_ID, 'TimeOffRequest');
  _assertNotNull(notes, 'TimeOffRequest audit row should exist for target');
  _assertContains(notes, 'filed by manager');
  _assertContains(notes, 'auto-approved');
}


// ── getTeammateStatus (INV-24) ──

function test_getTeammateStatus_shapeRestricted() {
  // Critical privacy check: response must NOT carry email, ID, last-punch time,
  // or timezone for non-managers. Only { name, status, isSelf } per row.
  _asUser(_TEST_INDIA_EMAIL, () => {
    const r = getTeammateStatus();
    if (r.error) throw new Error('Unexpected error: ' + r.error);
    _assertEq(r.enabled, true);
    _assertTrue(Array.isArray(r.teammates), 'teammates is an array');
    _assertTrue(r.teammates.length > 0, 'teammates non-empty');

    const ALLOWED_KEYS = ['name', 'status', 'isSelf'];
    const ALLOWED_STATUS = ['clocked_in', 'on_lunch', 'not_in', 'clocked_out'];
    r.teammates.forEach(t => {
      Object.keys(t).forEach(k => {
        _assertTrue(ALLOWED_KEYS.indexOf(k) >= 0,
          `Unexpected key "${k}" in teammate row — leak risk`);
      });
      _assertTrue(ALLOWED_STATUS.indexOf(t.status) >= 0,
        `Invalid status "${t.status}"`);
      _assertEq(typeof t.name, 'string');
      _assertEq(typeof t.isSelf, 'boolean');
    });

    const selfCount = r.teammates.filter(t => t.isSelf).length;
    _assertEq(selfCount, 1, 'Exactly one teammate has isSelf=true');
  });
}

function test_getTeammateStatus_disabledFlag() {
  // showTeammateStatus is read via getFlag_ since the feature-flag migration —
  // a runtime CONFIG.SHOW_TEAMMATE_STATUS mutation no longer disables it.
  _withFeatureFlags_({ showTeammateStatus: false }, () => {
    _asUser(_TEST_INDIA_EMAIL, () => {
      const r = getTeammateStatus();
      _assertEq(r.enabled, false);
      _assertEq(r.teammates.length, 0);
    });
  });
}


// ── Per-employee PTO toggle (INV-27) ──

function test_ptoEnabled_falseHidesFromState() {
  const original = _setEmpPtoEnabled(_TEST_PH_ID, 'FALSE');
  try {
    _asUser(_TEST_PH_EMAIL, () => {
      const info = getEmployeeInfo_();
      _assertEq(info.ptoEnabled, false,
        'PTO disabled column-K value should propagate to employee info');
      const state = getEmployeeState();
      _assertEq(state.ptoEnabled, false,
        'getEmployeeState should reflect per-row PTO disable');
    });
  } finally {
    _setEmpPtoEnabled(_TEST_PH_ID, original);
  }
}

function test_ptoEnabled_blankDefaultsTrue() {
  // setupTestEnvironment writes only 10 columns, so column K starts blank
  // for test employees. Verify back-compat: blank → enabled.
  const original = _setEmpPtoEnabled(_TEST_PH_ID, '');
  try {
    _asUser(_TEST_PH_EMAIL, () => {
      const info = getEmployeeInfo_();
      _assertEq(info.ptoEnabled, true, 'Blank PtoEnabled defaults to true');
    });
  } finally {
    _setEmpPtoEnabled(_TEST_PH_ID, original);
  }
}


// ════════════════════════════════════════════════════════════════════════════
//  managerSaveDay TESTS (F8 backfill — three-pass diff at the heart of edit-day)
// ════════════════════════════════════════════════════════════════════════════

// Helper: wipe every Timesheet row matching (empId, date). Tests use this for
// a clean slate before each managerSaveDay test, since the function's behavior
// depends on the snapshot of "current state for this employee/date".
function _clearPunchesForDay(empId, date) {
  const sheet = getAdpSS_().getSheetByName(CONFIG.ADP_TAB);
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 2; i--) {
    if (String(rows[i][ADP.EMP_ID]).trim() === empId &&
        normalizeDate_(rows[i][ADP.DATE]) === date) {
      sheet.deleteRow(i + 1);
    }
  }
}

// Helper: count audit rows matching (empId, action) — used by managerSaveDay
// tests to verify that the F4 vocabulary (PunchEdit / PunchAdd / PunchDelete)
// was emitted the expected number of times.
function _countAuditRows(empId, action) {
  const rows = getOrCreateAuditSheet_().getDataRange().getValues();
  let n = 0;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).trim() === empId
        && String(rows[i][4]).trim() === action) n++;
  }
  return n;
}

function test_managerSaveDay_addOnly() {
  _clearPunchesForDay(_TEST_PH_ID, _TEST_DATE_OLD);
  const slots = { ClockIn:'09:00', LunchOut:'12:00', LunchIn:'13:00', ClockOut:'17:00' };
  const before = _countAuditRows(_TEST_PH_ID, 'PunchAdd');
  _asUser(_TEST_MGR_EMAIL, () => {
    const r = managerSaveDay(_TEST_PH_ID, _TEST_DATE_OLD, slots, 'backfill from paper log');
    _assertSuccess(r);
    _assertEq(r.changes, 4, 'Four adds expected');
  });
  // All four rows present in Timesheet
  _assertEq(_countTimesheetRows(_TEST_PH_ID, _TEST_DATE_OLD, 'ClockIn'),  1);
  _assertEq(_countTimesheetRows(_TEST_PH_ID, _TEST_DATE_OLD, 'LunchOut'), 1);
  _assertEq(_countTimesheetRows(_TEST_PH_ID, _TEST_DATE_OLD, 'LunchIn'),  1);
  _assertEq(_countTimesheetRows(_TEST_PH_ID, _TEST_DATE_OLD, 'ClockOut'), 1);
  // Four PunchAdd audit rows emitted (F4 vocabulary)
  _assertEq(_countAuditRows(_TEST_PH_ID, 'PunchAdd'), before + 4,
    'Four PunchAdd audit rows expected');
}

function test_managerSaveDay_updateOnly() {
  _clearPunchesForDay(_TEST_PH_ID, _TEST_DATE_OLD);
  // Pre-position a full day's punches as adjustments (ADJ-* in COMMENTS)
  _appendTestPunch(_TEST_PH_ID, 'Test PH User', _TEST_DATE_OLD, '09:00:00', 'IN',  'ADJ-ClockIn');
  _appendTestPunch(_TEST_PH_ID, 'Test PH User', _TEST_DATE_OLD, '12:00:00', 'OUT', 'ADJ-LunchOut');
  _appendTestPunch(_TEST_PH_ID, 'Test PH User', _TEST_DATE_OLD, '13:00:00', 'IN',  'ADJ-LunchIn');
  _appendTestPunch(_TEST_PH_ID, 'Test PH User', _TEST_DATE_OLD, '17:00:00', 'OUT', 'ADJ-ClockOut');

  const slots = { ClockIn:'09:15', LunchOut:'12:00', LunchIn:'13:00', ClockOut:'17:00' };
  const before = _countAuditRows(_TEST_PH_ID, 'PunchEdit');
  _asUser(_TEST_MGR_EMAIL, () => {
    const r = managerSaveDay(_TEST_PH_ID, _TEST_DATE_OLD, slots, 'corrected start');
    _assertSuccess(r);
    _assertEq(r.changes, 1, 'Only ClockIn changed');
  });
  // Row count unchanged (4 rows), and exactly one PunchEdit audit row added
  _assertEq(_countTimesheetRows(_TEST_PH_ID, _TEST_DATE_OLD, null), 4);
  _assertEq(_countAuditRows(_TEST_PH_ID, 'PunchEdit'), before + 1,
    'Exactly one PunchEdit audit row expected');
}

function test_managerSaveDay_deleteOnly() {
  _clearPunchesForDay(_TEST_PH_ID, _TEST_DATE_OLD);
  _appendTestPunch(_TEST_PH_ID, 'Test PH User', _TEST_DATE_OLD, '09:00:00', 'IN',  'ADJ-ClockIn');
  _appendTestPunch(_TEST_PH_ID, 'Test PH User', _TEST_DATE_OLD, '12:00:00', 'OUT', 'ADJ-LunchOut');

  // Clear LunchOut by passing empty string for that slot
  const slots = { ClockIn:'09:00', LunchOut:'', LunchIn:'', ClockOut:'' };
  const beforeDel = _countAuditRows(_TEST_PH_ID, 'PunchDelete');
  _asUser(_TEST_MGR_EMAIL, () => {
    const r = managerSaveDay(_TEST_PH_ID, _TEST_DATE_OLD, slots, 'removing erroneous lunch out');
    _assertSuccess(r);
    _assertEq(r.changes, 1, 'One delete expected (LunchOut)');
  });
  _assertEq(_countTimesheetRows(_TEST_PH_ID, _TEST_DATE_OLD, 'LunchOut'), 0, 'LunchOut row gone');
  _assertEq(_countTimesheetRows(_TEST_PH_ID, _TEST_DATE_OLD, 'ClockIn'),  1, 'ClockIn untouched');
  _assertEq(_countAuditRows(_TEST_PH_ID, 'PunchDelete'), beforeDel + 1,
    'One PunchDelete audit row expected');
}

function test_managerSaveDay_mixedChanges() {
  _clearPunchesForDay(_TEST_PH_ID, _TEST_DATE_OLD);
  // Start with all four punches
  _appendTestPunch(_TEST_PH_ID, 'Test PH User', _TEST_DATE_OLD, '09:00:00', 'IN',  'ADJ-ClockIn');
  _appendTestPunch(_TEST_PH_ID, 'Test PH User', _TEST_DATE_OLD, '12:00:00', 'OUT', 'ADJ-LunchOut');
  _appendTestPunch(_TEST_PH_ID, 'Test PH User', _TEST_DATE_OLD, '13:00:00', 'IN',  'ADJ-LunchIn');
  _appendTestPunch(_TEST_PH_ID, 'Test PH User', _TEST_DATE_OLD, '17:00:00', 'OUT', 'ADJ-ClockOut');

  // Edit two times, clear LunchIn, leave LunchOut alone
  const slots = { ClockIn:'08:55', LunchOut:'12:00', LunchIn:'', ClockOut:'17:30' };
  const beforeEdit = _countAuditRows(_TEST_PH_ID, 'PunchEdit');
  const beforeDel = _countAuditRows(_TEST_PH_ID, 'PunchDelete');
  _asUser(_TEST_MGR_EMAIL, () => {
    const r = managerSaveDay(_TEST_PH_ID, _TEST_DATE_OLD, slots, 'comprehensive cleanup');
    _assertSuccess(r);
    _assertEq(r.changes, 3, '2 edits + 1 delete = 3 changes');
  });
  _assertEq(_countAuditRows(_TEST_PH_ID, 'PunchEdit'),  beforeEdit + 2, 'Two edits');
  _assertEq(_countAuditRows(_TEST_PH_ID, 'PunchDelete'),beforeDel + 1,  'One delete');
  _assertEq(_countTimesheetRows(_TEST_PH_ID, _TEST_DATE_OLD, 'LunchIn'), 0, 'LunchIn cleared');
}

function test_managerSaveDay_noChangesIsNoOp() {
  _clearPunchesForDay(_TEST_PH_ID, _TEST_DATE_OLD);
  // Cycle-9 M-1 regression pin: the ClockIn is a LIVE punch with REAL seconds
  // (recordPunch writes fmtTimeTz_ 'HH:mm:ss') — the Day Edit client prefills
  // HH:mm, so the no-op guard must compare on HH:mm. The old full-string
  // compare read '09:00:27' vs '09:00:00' as a change: seconds truncated,
  // COMMENTS overwritten to ADJ-ClockIn, spurious PunchEdit audit row.
  _appendTestPunch(_TEST_PH_ID, 'Test PH User', _TEST_DATE_OLD, '09:00:27', 'IN',  'ClockIn');
  _appendTestPunch(_TEST_PH_ID, 'Test PH User', _TEST_DATE_OLD, '17:00:00', 'OUT', 'ADJ-ClockOut');

  // Submit the same times — no diff. Note: reason still required at the input
  // gate (date > 7d back), even though no changes will actually be made.
  const slots = { ClockIn:'09:00', LunchOut:'', LunchIn:'', ClockOut:'17:00' };
  const beforeEdit = _countAuditRows(_TEST_PH_ID, 'PunchEdit');
  const beforeAdd  = _countAuditRows(_TEST_PH_ID, 'PunchAdd');
  const beforeDel  = _countAuditRows(_TEST_PH_ID, 'PunchDelete');
  _asUser(_TEST_MGR_EMAIL, () => {
    const r = managerSaveDay(_TEST_PH_ID, _TEST_DATE_OLD, slots, 'verification re-save');
    _assertSuccess(r);
    _assertEq(r.changes, 0, 'No changes — same times submitted');
  });
  _assertEq(_countAuditRows(_TEST_PH_ID, 'PunchEdit'),  beforeEdit, 'No edits');
  _assertEq(_countAuditRows(_TEST_PH_ID, 'PunchAdd'),   beforeAdd,  'No adds');
  _assertEq(_countAuditRows(_TEST_PH_ID, 'PunchDelete'),beforeDel,  'No deletes');
}

function test_managerSaveDay_nonManagerRejected() {
  _clearPunchesForDay(_TEST_PH_ID, _TEST_DATE_OLD);
  _asUser(_TEST_INDIA_EMAIL, () => {
    _assertFailure(
      managerSaveDay(_TEST_PH_ID, _TEST_DATE_OLD,
        { ClockIn:'09:00', LunchOut:'', LunchIn:'', ClockOut:'17:00' }, ''),
      'Manager access required'
    );
  });
  _assertEq(_countTimesheetRows(_TEST_PH_ID, _TEST_DATE_OLD, null), 0,
    'No rows written on auth failure');
}

function test_managerSaveDay_reasonRequiredBeyondWindow() {
  _clearPunchesForDay(_TEST_PH_ID, _TEST_DATE_VERY_OLD);
  _asUser(_TEST_MGR_EMAIL, () => {
    // 20 days back, no reason → rejected
    _assertFailure(
      managerSaveDay(_TEST_PH_ID, _TEST_DATE_VERY_OLD,
        { ClockIn:'09:00', LunchOut:'', LunchIn:'', ClockOut:'17:00' }, ''),
      'reason is required'
    );
    // Same call with a reason succeeds
    const r = managerSaveDay(_TEST_PH_ID, _TEST_DATE_VERY_OLD,
      { ClockIn:'09:00', LunchOut:'', LunchIn:'', ClockOut:'17:00' },
      'forgot to punch — recovered from paper log');
    _assertSuccess(r);
    _assertEq(r.changes, 2);
  });
}

function test_managerSaveDay_invalidTimeFormatRejected() {
  _clearPunchesForDay(_TEST_PH_ID, _TEST_DATE_OLD);
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertFailure(
      managerSaveDay(_TEST_PH_ID, _TEST_DATE_OLD,
        { ClockIn:'25:00', LunchOut:'', LunchIn:'', ClockOut:'' }, 'whatever'),
      'Invalid time'
    );
    _assertFailure(
      managerSaveDay(_TEST_PH_ID, _TEST_DATE_OLD,
        { ClockIn:'9:00', LunchOut:'', LunchIn:'', ClockOut:'' }, 'whatever'),
      'Invalid time'
    );
  });
  _assertEq(_countTimesheetRows(_TEST_PH_ID, _TEST_DATE_OLD, null), 0,
    'No rows written on validation failure');
}


// ════════════════════════════════════════════════════════════════════════════
//  CALL NOTES — PURE LOGIC TESTS
//  ────────────────────────────────────────────────────────────────────────
//  Smoke-safe: no Sheet reads, no LockService, no MailApp. Covers the
//  helper functions called inside submitCallNote / updateCallNote /
//  emailFromCallNote / previewCallNoteEmail / setCallNoteFlag /
//  setCallNoteResolved / sanitizeCallNotePayload_ / etc. Integration
//  coverage for the endpoints themselves (which write to per-rep
//  Sheets) is a follow-on — would need setupTestEnvironment to
//  provision a TEST call-notes Sheet and write its ID into the
//  test employee row.
// ════════════════════════════════════════════════════════════════════════════

// ── sanitizeFlagType_ ──

function test_cn_sanitizeFlagType_valid() {
  _assertEq(sanitizeFlagType_('action'),   'action');
  _assertEq(sanitizeFlagType_('training'), 'training');
  _assertEq(sanitizeFlagType_('review'),   'review');
}
function test_cn_sanitizeFlagType_invalidCoerces() {
  _assertEq(sanitizeFlagType_('escalation'), '', 'unknown coerces to empty');
  _assertEq(sanitizeFlagType_('foo'),        '');
  _assertEq(sanitizeFlagType_('action!'),    '', 'punctuation breaks match');
}
function test_cn_sanitizeFlagType_caseInsensitive() {
  _assertEq(sanitizeFlagType_('ACTION'),    'action');
  _assertEq(sanitizeFlagType_(' Training '),'training');
  _assertEq(sanitizeFlagType_('ReVieW'),    'review');
}
function test_cn_sanitizeFlagType_nullish() {
  _assertEq(sanitizeFlagType_(''),         '');
  _assertEq(sanitizeFlagType_(null),       '');
  _assertEq(sanitizeFlagType_(undefined),  '');
}

// ── sanitizeCallNotePayload_ ──

function test_cn_sanitizePayload_trims() {
  const out = sanitizeCallNotePayload_({
    callback: '  (555) 123-4567  ',
    caller:   '  Jane Smith  ',
    issue:    '  outage  ',
    flagType: '  ACTION  ',
  });
  _assertEq(out.callback, '(555) 123-4567');
  _assertEq(out.caller,   'Jane Smith');
  _assertEq(out.issue,    'outage');
  _assertEq(out.flagType, 'action', 'flagType lowercased + trimmed');
}
function test_cn_sanitizePayload_nullishToEmpty() {
  const out = sanitizeCallNotePayload_({});
  _assertEq(out.callback,       '');
  _assertEq(out.caller,         '');
  _assertEq(out.relationship,   '');
  _assertEq(out.patientAndTrx,  '');
  _assertEq(out.issue,          '');
  _assertEq(out.transferredTo,  '');
  _assertEq(out.resolution,     '');
  _assertEq(out.flagType,       '');
  _assertEq(out.subform,        '');
  _assertNull(out.subformData);
}
function test_cn_sanitizePayload_acceptsCamelAlias() {
  // The client-side helper sends `patientAndTRX` (uppercase TRX) too; the
  // server should accept either spelling so a client refactor doesn't
  // silently drop the field.
  const out = sanitizeCallNotePayload_({ patientAndTRX: 'John 99999' });
  _assertEq(out.patientAndTrx, 'John 99999');
}

// ── validateCallNotePayload_ ──

function test_cn_validatePayload_rejectsEmpty() {
  const result = validateCallNotePayload_(sanitizeCallNotePayload_({}));
  _assertNotNull(result.error);
  _assertContains(result.error, 'empty', 'Error message mentions empty');
}
function test_cn_validatePayload_acceptsAnyField() {
  ['callback','caller','patientAndTrx','issue','resolution'].forEach(field => {
    const payload = {}; payload[field] = 'something';
    const result = validateCallNotePayload_(sanitizeCallNotePayload_(payload));
    _assertTrue(result.ok, `Single field "${field}" should pass validation`);
  });
}
function test_cn_validatePayload_rejectsBadFlag() {
  // Bypass sanitize so we can inject a deliberately bad flag into a
  // payload that otherwise looks valid.
  const cleaned = sanitizeCallNotePayload_({ caller: 'Jane' });
  cleaned.flagType = 'escalation';
  const result = validateCallNotePayload_(cleaned);
  _assertNotNull(result.error);
  _assertContains(result.error, 'Invalid flag type');
}

// ── callNoteMatchesFilter_ ──

function test_cn_matchesFilter_all() {
  _assertTrue(callNoteMatchesFilter_({ flagType: 'action', resolved: false }, 'all'));
  _assertTrue(callNoteMatchesFilter_({ flagType: '',       resolved: true  }, 'all'));
  _assertTrue(callNoteMatchesFilter_({ flagType: 'review', resolved: false }, 'all'));
}
function test_cn_matchesFilter_actionTrainingReview() {
  _assertTrue (callNoteMatchesFilter_({ flagType: 'action'   }, 'action'));
  _assertFalse(callNoteMatchesFilter_({ flagType: 'training' }, 'action'));
  _assertTrue (callNoteMatchesFilter_({ flagType: 'training' }, 'training'));
  _assertFalse(callNoteMatchesFilter_({ flagType: 'action'   }, 'training'));
  _assertTrue (callNoteMatchesFilter_({ flagType: 'review'   }, 'review'));
  _assertFalse(callNoteMatchesFilter_({ flagType: 'action'   }, 'review'));
}
function test_cn_matchesFilter_unresolved() {
  _assertTrue (callNoteMatchesFilter_({ flagType: 'action',   resolved: false }, 'unresolved'));
  _assertFalse(callNoteMatchesFilter_({ flagType: 'action',   resolved: true  }, 'unresolved'),
    'resolved action notes do not match unresolved filter');
  _assertFalse(callNoteMatchesFilter_({ flagType: 'training', resolved: false }, 'unresolved'),
    'training notes do not match unresolved filter');
  _assertFalse(callNoteMatchesFilter_({ flagType: '',         resolved: false }, 'unresolved'));
}
function test_cn_matchesFilter_unsent() {
  _assertTrue (callNoteMatchesFilter_({ emailedAt: '' },                          'unsent'));
  _assertFalse(callNoteMatchesFilter_({ emailedAt: '2026-05-17T09:30:00' },       'unsent'));
}

// ── updateInfoToSubformKey_ ──

function test_cn_updateInfoToSubformKey() {
  _assertEq(updateInfoToSubformKey_('Close Order'),       'close');
  _assertEq(updateInfoToSubformKey_('CLOSE ORDER'),       'close');
  _assertEq(updateInfoToSubformKey_('Verified Shipping'), 'shipping');
  _assertEq(updateInfoToSubformKey_('Repeat Resupply'),   'resupply');
  _assertEq(updateInfoToSubformKey_('OOP Order'),         'oop');
  _assertEq(updateInfoToSubformKey_('Other Update'),      '', 'unknown update returns empty');
  _assertEq(updateInfoToSubformKey_(''),                  '');
  _assertEq(updateInfoToSubformKey_(null),                '');
}

// ── formatPhoneNumber_ / formatProviderPhone_ ──

function test_cn_formatPhoneNumber_basic() {
  _assertEq(formatPhoneNumber_('5551234567'),  '(555) 123-4567');
  _assertEq(formatPhoneNumber_('555-123-4567'),'(555) 123-4567');
  _assertEq(formatPhoneNumber_('(555) 123 4567'), '(555) 123-4567');
}
function test_cn_formatPhoneNumber_extension() {
  _assertEq(formatPhoneNumber_('5551234567 x123'), '(555) 123-4567 x123');
  _assertEq(formatPhoneNumber_('5551234567x12345'),'(555) 123-4567 x12345');
}
function test_cn_formatPhoneNumber_passthroughShort() {
  // Sub-10-digit strings are left alone (no good formatting heuristic).
  _assertEq(formatPhoneNumber_('555-1234'), '555-1234');
}
function test_cn_formatPhoneNumber_empty() {
  _assertEq(formatPhoneNumber_(''),        '');
  _assertEq(formatPhoneNumber_(null),      '');
  _assertEq(formatPhoneNumber_(undefined), '');
}
function test_cn_formatProviderPhone_basic() {
  _assertEq(formatProviderPhone_('5551234567'),   '555-123-4567');
  _assertEq(formatProviderPhone_('555-123-4567'), '555-123-4567');
  _assertEq(formatProviderPhone_('5551234567 x12'), '555-123-4567 x12');
}
function test_cn_formatProviderPhone_countryCode() {
  // 11-digit numbers starting with 1 get a leading "1 " prefix
  _assertEq(formatProviderPhone_('15551234567'),  '1 555-123-4567');
  _assertEq(formatProviderPhone_('1-555-123-4567'),'1 555-123-4567');
}

// ── buildEmailSubject_ ──

function test_cn_buildEmailSubject_basicUpdate() {
  _assertEq(
    buildEmailSubject_({ updateInfo: 'Status Check' }, 'Jane Smith TRX123'),
    'Status Check: Jane Smith TRX123'
  );
}
function test_cn_buildEmailSubject_titlecasesCanon() {
  _assertEq(
    buildEmailSubject_({ updateInfo: 'close order' },       'Patient X'),
    'Close Order: Patient X'
  );
  _assertEq(
    buildEmailSubject_({ updateInfo: 'verified shipping' }, 'Patient X'),
    'Verified Shipping: Patient X'
  );
  _assertEq(
    buildEmailSubject_({ updateInfo: 'oop order' },         'Patient X'),
    'OOP Order: Patient X'
  );
}
function test_cn_buildEmailSubject_repeatResupplyEnriched() {
  const selections = {
    updateInfo: 'Repeat Resupply',
    resupplyDetails: { itemCategory: 'CPAP', resupplyMonth: 'July', dob: '01/15/1970' },
  };
  _assertEq(
    buildEmailSubject_(selections, 'Patient Y'),
    'CPAP July Resupply: Patient Y, DOB: 01/15/1970'
  );
}
function test_cn_buildEmailSubject_repeatResupplyOtherCategory() {
  // When itemCategory is 'Other', the category prefix is dropped.
  const selections = {
    updateInfo: 'Repeat Resupply',
    resupplyDetails: { itemCategory: 'Other', resupplyMonth: '', dob: '' },
  };
  _assertEq(
    buildEmailSubject_(selections, 'Patient Z'),
    'Resupply: Patient Z'
  );
}

// ── generateOOPResolutionText_ ──

function test_cn_generateOOPResolutionText_collected() {
  const sel = {
    oopDetails:      { baseCost: '100.00', taxAmt: '6.25', shippingCost: '14.99', totalCost: '121.24' },
    shippingDetails: { patResp: 'Collected', verifiedAddr: true, verifiedAddrText: '1 Main St',
                       patientLoc: 'Home', docsTo: 'Email', deliveryEmail: 'x@y.com', specialNote: '' },
  };
  const text = generateOOPResolutionText_(sel);
  _assertContains(text, 'Collected Total: $121.24');
  _assertContains(text, 'Base: $100.00');
  _assertContains(text, 'Verified Addr: Yes');
  _assertContains(text, 'Loc: Home');
  _assertContains(text, 'Docs: Email (x@y.com)');
}
function test_cn_generateOOPResolutionText_needCollect() {
  const sel = {
    oopDetails:      { baseCost: '50.00', taxAmt: '$2.50', shippingCost: '0.00', totalCost: '52.50' },
    shippingDetails: { patResp: 'Need to Collect', verifiedAddr: false, verifiedAddrText: '',
                       patientLoc: 'Facility', docsTo: 'Patient', deliveryEmail: '', specialNote: 'Call before delivery' },
  };
  const text = generateOOPResolutionText_(sel);
  _assertContains(text, 'Need to Collect Total: $52.50');
  _assertContains(text, 'Verified Addr: No');
  _assertContains(text, 'Note: Call before delivery');
}

// ── resolveEmailRecipients_ ──

function test_cn_resolveRecipients_simpleDept() {
  // 'Sales' resolves via CONFIG.CALL_NOTES.DEPARTMENT_EMAILS. We just
  // assert it produces a `to:` string containing an @-address — the
  // exact email is config-driven so testing the value would couple
  // the test to ops state. Type-of check is too broad on its own;
  // the contained-@ check tightens it.
  const res = resolveEmailRecipients_({ departments: ['Sales'] });
  _assertNull(res.error);
  _assertContains(res.to, '@');
}
function test_cn_resolveRecipients_otherUsesIndividual() {
  const res = resolveEmailRecipients_({ departments: ['Other'], individualEmail: 'manual@example.com' });
  _assertEq(res.to, 'manual@example.com');
}
function test_cn_resolveRecipients_unknownDeptErrors() {
  const res = resolveEmailRecipients_({ departments: ['NotARealDept'] });
  _assertNotNull(res.error);
  _assertContains(res.error, 'Unknown department');
}

// ── validateEmailSelections_ ──

function test_cn_validateEmailSelections_requiresDept() {
  const r = validateEmailSelections_({ departments: [], individualEmail: '', updateInfo: 'Status Check' });
  _assertNotNull(r.error);
  _assertContains(r.error, 'recipient');
}
function test_cn_validateEmailSelections_otherRequiresEmail() {
  let r = validateEmailSelections_({ departments: ['Other'], individualEmail: '', updateInfo: 'Status Check' });
  _assertNotNull(r.error);
  r = validateEmailSelections_({ departments: ['Other'], individualEmail: 'not-an-email', updateInfo: 'X' });
  _assertNotNull(r.error);
  _assertContains(r.error, 'Invalid email');
  r = validateEmailSelections_({ departments: ['Other'], individualEmail: 'ok@example.com', updateInfo: 'X' });
  _assertTrue(r.ok);
}
function test_cn_validateEmailSelections_requiresUpdateInfo() {
  const r = validateEmailSelections_({ departments: ['Sales'], individualEmail: '', updateInfo: '' });
  _assertNotNull(r.error);
  _assertContains(r.error, 'Update');
}

// ── callDataFromNote_ — smart "self relationship + only-TRX" prepend ──

function test_cn_callDataFromNote_selfNumberPrepended() {
  const out = callDataFromNote_({
    callback: '5551234567', caller: 'Jane Doe', relationship: 'self',
    patientAndTrx: '99999', issue: 'X', transferredTo: '', resolution: '',
  });
  _assertEq(out.patientAndTrx, 'Jane Doe 99999');
}
function test_cn_callDataFromNote_selfNamedNoPrepend() {
  // patientAndTrx already includes a non-numeric word — no prepend
  const out = callDataFromNote_({
    callback: '5551234567', caller: 'Jane Doe', relationship: 'self',
    patientAndTrx: 'Jane Doe 99999', issue: '', transferredTo: '', resolution: '',
  });
  _assertEq(out.patientAndTrx, 'Jane Doe 99999');
}
function test_cn_callDataFromNote_nonSelfPassthrough() {
  // Different relationship — no prepend regardless of whether TRX is number-only
  const out = callDataFromNote_({
    callback: '5551234567', caller: 'Mom', relationship: 'parent',
    patientAndTrx: '99999', issue: '', transferredTo: '', resolution: '',
  });
  _assertEq(out.patientAndTrx, '99999');
}

// ── buildCallNoteEmailHtml_ — XSS escape invariant (F8) ──
// The email-preview modal injects this HTML raw via innerHTML; it is safe
// ONLY because every user-supplied note field is escaped here. This test
// pins that invariant — if a future field is added without esc_, it fails.

function test_cn_buildEmailHtml_escapesUserFields() {
  const callData = {
    callBackNumber: '(555) 123-4567',
    callerName:     '<script>alert(1)</script>',
    relationship:   'self',
    patientAndTrx:  '<img src=x onerror=alert(2)>',
    issue:          'a & b < c',
    transferredTo:  'N/A',
    resolution:     'plain resolution',
  };
  const html = buildCallNoteEmailHtml_(callData, { updateInfo: 'Status Check', departments: ['CSR'] });
  _assertFalse(html.indexOf('<script>alert(1)</script>') >= 0, 'raw caller script tag must NOT appear');
  _assertFalse(html.indexOf('<img src=x onerror=alert(2)>') >= 0, 'raw patient img payload must NOT appear');
  _assertContains(html, '&lt;script&gt;alert(1)&lt;/script&gt;', 'caller rendered escaped');
  _assertContains(html, 'a &amp; b &lt; c', 'issue ampersand/angle-bracket escaped');
}

function test_cn_formSubmissionCard_escapes() {
  // C4 — the in-app submission viewer injects buildFormSubmissionCardHtml_ via
  // innerHTML (INV-89 class). Pin that recipient-supplied values are esc_'d.
  const data = {
    'patient_name': '<script>alert(1)</script>',
    'free_notes':   'a & b < c',
  };
  const html = buildFormSubmissionCardHtml_(data, '');
  _assertFalse(html.indexOf('<script>alert(1)</script>') >= 0, 'raw script tag must NOT appear in the card');
  _assertContains(html, '&lt;script&gt;', 'value rendered escaped');
  _assertContains(html, 'a &amp; b &lt; c', 'ampersand/angle-bracket escaped');
}

// Turn C — detector liveness: every writer↔parser round-trip the Automation
// Health panel/digest reports on must be ok. A failure here means a monitoring
// loop is silently dead even though its trigger runs (the H-1/M-11 class —
// coaching overdue + unmatched-agent detection both shipped dead and nothing
// surfaced it). Read-only (cnTimestampString_ opens the ADP sheet for its tz,
// same class as the tz tripwire below).
function test_automationDetectorLiveness() {
  const checks = automationDetectorChecks_();
  _assertTrue(checks.length >= 5, 'all five pure detector checks ran (' + checks.length + ')');
  checks.forEach(function (c) {
    _assertTrue(c.ok, 'detector "' + c.key + '" alive — ' + (c.detail || c.label));
  });
}

function test_config_adpSheetTzMatchesConfig() {
  // S1.1 — the AuditLog / TO.SUBMITTED_AT coercion round-trip relies on the ADP
  // spreadsheet's tz matching CONFIG.TIMEZONE: writes use CONFIG.TIMEZONE
  // (fmtDate_/fmtTime_) while normalizeAuditTs_/normalizeDate_ recover coerced
  // Date cells in the SHEET's tz. The wall-clock string round-trips only when
  // the two are equal; a drift silently shifts every date-filtered audit/PTO
  // read by the offset. Pin the assumption so an operator tz change surfaces.
  let ssTz;
  try { ssTz = getAdpSS_().getSpreadsheetTimeZone(); }
  catch (e) {
    // F(cycle-8 M-14): an unreachable ADP spreadsheet is a BROKEN deployment,
    // not a skippable precondition — this tripwire used to read GREEN in
    // exactly the operator state it exists to surface.
    throw new Error('ADP spreadsheet unreachable — the tz tripwire cannot verify S1.1 (' + e.message + ')');
  }
  // Alias-aware: Google stores the legacy "Asia/Calcutta" for GMT+5:30, which is
  // functionally identical to CONFIG's "Asia/Kolkata" (tzEquivalent_), so an
  // alias passes; only a genuinely different zone (e.g. America/Los_Angeles) fails.
  _assertTrue(tzEquivalent_(ssTz, CONFIG.TIMEZONE),
    'ADP sheet tz (' + ssTz + ') must equal CONFIG.TIMEZONE (' + CONFIG.TIMEZONE +
    ') — or a known alias — or coerced-date audit/PTO reads drift — see S1.1');
}

// ── Template scriptlet hygiene (regression guard) ──
// form_public.html once injected the form token via the HTML-escaping `<?= ?>`
// print scriptlet, which turns JSON.stringify's double-quotes into &quot; and
// mangles the token ("Form not found" bug). Pin the fix: the token line must
// use the unescaped `<?!= ?>` form, and no HTML template may inject a JSON
// value via the escaping `<?= ?>` scriptlet. createHtmlOutputFromFile(...)
// .getContent() returns the raw template source (scriptlets unprocessed) —
// the same call `include()` uses — so this is pure-logic, safe on prod.

function test_tpl_formToken_usesUnescapedScriptlet() {
  const src = HtmlService.createHtmlOutputFromFile('form_public').getContent();
  _assertContains(src, 'var FORM_TOKEN =', 'form_public.html still declares FORM_TOKEN');
  // The token line must use the unescaped print scriptlet, not the escaping one.
  _assertTrue(/var FORM_TOKEN =\s*<\?!=/.test(src),
    'FORM_TOKEN must be injected via the unescaped <?!= scriptlet (escaping <?= mangles the JSON quotes)');
  _assertFalse(/var FORM_TOKEN =\s*<\?=[^!]/.test(src),
    'FORM_TOKEN must NOT use the HTML-escaping <?= scriptlet');
}

function test_tpl_noEscapedJsonInjection() {
  // Across every HTML template, a `<?= ... JSON ... ?>` (escaping) print is the
  // token-mangling foot-gun. JSON values must go through `<?!=` instead.
  const files = ['form_public', 'index'];
  for (let i = 0; i < files.length; i++) {
    const src = HtmlService.createHtmlOutputFromFile(files[i]).getContent();
    // Match an escaping scriptlet (`<?=` but not `<?!=`) that prints a
    // JSON.stringify(...) — the exact dangerous shape.
    const bad = /<\?=(?!!)[^?]*JSON\.stringify/.test(src);
    _assertFalse(bad, files[i] + '.html must not inject JSON via the escaping <?= scriptlet (use <?!=)');
  }
}

function test_tpl_formPublic_evaluatesWithoutError() {
  // The two tests above only string-match the RAW template file — they cannot
  // catch a scriptlet delimiter (or a closing script tag) accidentally written
  // inside a JS comment, which fails only at .evaluate() time. That was the
  // exact production bug: a comment containing the force-print delimiter opened
  // a spurious scriptlet beginning with ')', throwing "Unexpected token ')'" in
  // serveExternalForm_. Evaluate the template the way serveExternalForm_ does
  // and assert it both compiles AND injects the token. Pure template eval (just
  // the JSON.stringify scriptlet) — no Sheet access, safe on prod.
  const tpl = HtmlService.createTemplateFromFile('form_public');
  tpl.formToken = 'test-token-123';
  let html;
  try {
    html = tpl.evaluate().getContent();
  } catch (e) {
    throw new Error('form_public template failed to evaluate (stray scriptlet/' +
      'closing-script-tag inside a comment?): ' + e.message);
  }
  _assertContains(html, 'var FORM_TOKEN = "test-token-123"',
    'evaluated page must inject the token via the force-print scriptlet');
}

// ── esc_ — HTML entity escape ──

function test_cn_esc_basic() {
  _assertEq(esc_('A & B'),             'A &amp; B');
  _assertEq(esc_('<script>'),          '&lt;script&gt;');
  _assertEq(esc_(`"quoted" 'single'`), '&quot;quoted&quot; &#39;single&#39;');
  _assertEq(esc_(null),                '');
  _assertEq(esc_(undefined),           '');
}

// cnExtractAuditNoteId_ — the noteId parser both compliance-audit endpoints
// (getCallNotesAuditLog / getCallNoteAuditHistory) depend on. A regression
// here silently empties the per-note history drill-down (#3).
function test_cn_extractAuditNoteId_parses() {
  _assertEq(cnExtractAuditNoteId_('noteId=3f2504e0-4f89-41d3-9a0c-0305e82c3301; urgent=on'),
            '3f2504e0-4f89-41d3-9a0c-0305e82c3301');
  _assertEq(cnExtractAuditNoteId_('noteId=abc12345; depts=Shipping'), 'abc12345');
}
function test_cn_extractAuditNoteId_noMatch() {
  _assertEq(cnExtractAuditNoteId_('Updated department emails (3 depts)'), '');
  _assertEq(cnExtractAuditNoteId_(''),        '');
  _assertEq(cnExtractAuditNoteId_(null),      '');
  _assertEq(cnExtractAuditNoteId_(undefined), '');
}


// ════════════════════════════════════════════════════════════════════════════
//  CALL NOTES — INTEGRATION TESTS
//  ────────────────────────────────────────────────────────────────────────
//  These tests write to the test call-notes Sheet provisioned by
//  setupTestEnvironment (the India test employee's per-rep Sheet).
//  Cleanup happens in cleanupTestData (deletes all Notes-tab rows).
// ════════════════════════════════════════════════════════════════════════════

function _clearTestCallNotes() {
  if (!_TEST_CN_SS_ID) return;
  try {
    const cnSs = SpreadsheetApp.openById(_TEST_CN_SS_ID);
    const notesTab = cnSs.getSheetByName(CONFIG.CALL_NOTES.NOTES_TAB);
    if (notesTab && notesTab.getLastRow() > 1) {
      notesTab.deleteRows(2, notesTab.getLastRow() - 1);
    }
  } catch (e) {}
}

function _cnTestPayload(overrides) {
  return Object.assign({
    callback: '5551234567', caller: 'Test Caller', relationship: 'self',
    patientAndTrx: 'Patient 99999', issue: 'Test issue',
    transferredTo: '', resolution: 'Test resolution', flagType: '',
  }, overrides || {});
}

// ── submitCallNote ──

// §7a / INV-45 — the distinct `phone` (callback-only) and `trx`
// (patientAndTrx-only) search scopes. Two notes, each matching ONE scope on a
// unique token, must not cross-surface in the other scope.
function test_cn_search_phoneTrxFieldScopes() {
  _clearTestCallNotes();
  _asUser(_TEST_INDIA_EMAIL, function () {
    submitCallNote(_cnTestPayload({ callback: '5550009999', caller: 'Alpha Caller', patientAndTrx: 'Patient AAA' }));
    submitCallNote(_cnTestPayload({ callback: '5551112222', caller: 'Beta Caller',  patientAndTrx: 'TRX-ZZZ-77' }));
  });
  const byPhone = _asUser(_TEST_INDIA_EMAIL, function () { return searchMyCallNotes('5550009999', 'phone', null, false); });
  _assertEq((byPhone.results || []).length, 1, 'phone scope matches the one note by callback');
  _assertEq(byPhone.results[0].caller, 'Alpha Caller', 'phone scope returned the right note');
  const byTrx = _asUser(_TEST_INDIA_EMAIL, function () { return searchMyCallNotes('TRX-ZZZ-77', 'trx', null, false); });
  _assertEq((byTrx.results || []).length, 1, 'trx scope matches the one note by patientAndTrx');
  _assertEq(byTrx.results[0].caller, 'Beta Caller', 'trx scope returned the right note');
  // phone scope must NOT match a patientAndTrx token (scope isolation)
  const cross = _asUser(_TEST_INDIA_EMAIL, function () { return searchMyCallNotes('TRX-ZZZ-77', 'phone', null, false); });
  _assertEq((cross.results || []).length, 0, 'phone scope does not match a patientAndTrx token');
}

function test_cn_submitCallNote_basic() {
  _clearTestCallNotes();
  const r = _asUser(_TEST_INDIA_EMAIL, function () {
    return submitCallNote(_cnTestPayload());
  });
  _assertSuccess(r, 'submitCallNote should succeed');
  _assertNotNull(r.note, 'Should return the created note');
  _assertNotNull(r.note.noteId, 'Note should have a noteId');
  _assertEq(r.note.caller, 'Test Caller', 'Caller round-trips');
  _assertEq(r.note.resolved, false, 'New note is unresolved');
  _assertEq(r.note.flagType, '', 'No flag by default');
}

function test_cn_submitCallNote_withFlag() {
  _clearTestCallNotes();
  const r = _asUser(_TEST_INDIA_EMAIL, function () {
    return submitCallNote(_cnTestPayload({ flagType: 'training' }));
  });
  _assertSuccess(r);
  _assertEq(r.note.flagType, 'training', 'Flag type round-trips');
}

function test_cn_submitCallNote_unenrolledRepFails() {
  const r = _asUser(_TEST_PH_EMAIL, function () {
    return submitCallNote(_cnTestPayload());
  });
  _assertFailure(r, 'not configured', 'Unenrolled rep should fail');
}

// ── setCallNoteFlag ──

function test_cn_setCallNoteFlag_toggleAction() {
  _clearTestCallNotes();
  var noteId;
  _asUser(_TEST_INDIA_EMAIL, function () {
    noteId = submitCallNote(_cnTestPayload()).note.noteId;
  });
  var r = _asUser(_TEST_INDIA_EMAIL, function () {
    return setCallNoteFlag(noteId, 'action');
  });
  _assertSuccess(r, 'Flag to action');
  _assertEq(r.note.flagType, 'action');

  r = _asUser(_TEST_INDIA_EMAIL, function () {
    return setCallNoteFlag(noteId, '');
  });
  _assertSuccess(r, 'Clear flag');
  _assertEq(r.note.flagType, '');
}

function test_cn_setCallNoteFlag_transitionClearsResolved() {
  _clearTestCallNotes();
  var noteId;
  _asUser(_TEST_INDIA_EMAIL, function () {
    noteId = submitCallNote(_cnTestPayload()).note.noteId;
    setCallNoteFlag(noteId, 'action');
    setCallNoteResolved(noteId, true);
  });
  var r = _asUser(_TEST_INDIA_EMAIL, function () {
    return setCallNoteFlag(noteId, 'training');
  });
  _assertSuccess(r);
  _assertEq(r.note.flagType, 'training', 'Transitioned to training');
  _assertEq(r.note.resolved, false, 'Resolved cleared on flag transition (INV-40)');
}

// ── setCallNoteResolved ──

function test_cn_setCallNoteResolved_actionOnly() {
  _clearTestCallNotes();
  var noteId;
  _asUser(_TEST_INDIA_EMAIL, function () {
    noteId = submitCallNote(_cnTestPayload({ flagType: 'action' })).note.noteId;
  });
  var r = _asUser(_TEST_INDIA_EMAIL, function () {
    return setCallNoteResolved(noteId, true);
  });
  _assertSuccess(r, 'Resolve action flag');
  _assertEq(r.note.resolved, true, 'Note is resolved');

  r = _asUser(_TEST_INDIA_EMAIL, function () {
    return setCallNoteResolved(noteId, false);
  });
  _assertSuccess(r, 'Un-resolve');
  _assertEq(r.note.resolved, false);
}

function test_cn_setCallNoteResolved_rejectsNonAction() {
  _clearTestCallNotes();
  var noteId;
  _asUser(_TEST_INDIA_EMAIL, function () {
    noteId = submitCallNote(_cnTestPayload({ flagType: 'training' })).note.noteId;
  });
  var r = _asUser(_TEST_INDIA_EMAIL, function () {
    return setCallNoteResolved(noteId, true);
  });
  _assertFailure(r, 'action-flagged', 'Resolve rejects non-action (INV-34)');
}

// ── deleteCallNote ──

function test_cn_deleteCallNote_basic() {
  _clearTestCallNotes();
  var noteId;
  _asUser(_TEST_INDIA_EMAIL, function () {
    noteId = submitCallNote(_cnTestPayload()).note.noteId;
  });
  var r = _asUser(_TEST_INDIA_EMAIL, function () {
    return deleteCallNote(noteId);
  });
  _assertSuccess(r, 'Delete should succeed');

  r = _asUser(_TEST_INDIA_EMAIL, function () {
    return deleteCallNote(noteId);
  });
  _assertFailure(r, 'not found', 'Double-delete should fail');
}

// ── setCallNotePinned (cap enforcement) ──

function test_cn_setCallNotePinned_capAt3() {
  _clearTestCallNotes();
  var ids = [];
  _asUser(_TEST_INDIA_EMAIL, function () {
    for (var j = 0; j < 4; j++) {
      ids.push(submitCallNote(_cnTestPayload({ caller: 'Caller ' + j })).note.noteId);
    }
  });
  _asUser(_TEST_INDIA_EMAIL, function () {
    _assertSuccess(setCallNotePinned(ids[0], true), 'Pin 1');
    _assertSuccess(setCallNotePinned(ids[1], true), 'Pin 2');
    _assertSuccess(setCallNotePinned(ids[2], true), 'Pin 3');
  });
  var r = _asUser(_TEST_INDIA_EMAIL, function () {
    return setCallNotePinned(ids[3], true);
  });
  _assertFailure(r, 'max', '4th pin should be rejected (INV-50)');

  r = _asUser(_TEST_INDIA_EMAIL, function () {
    _assertSuccess(setCallNotePinned(ids[0], false), 'Unpin 1');
    return setCallNotePinned(ids[3], true);
  });
  _assertSuccess(r, 'After unpin, 4th pin should succeed');
}

// ── updateCallNote ──

function test_cn_updateCallNote_basic() {
  _clearTestCallNotes();
  var noteId;
  _asUser(_TEST_INDIA_EMAIL, function () {
    noteId = submitCallNote(_cnTestPayload()).note.noteId;
  });
  var r = _asUser(_TEST_INDIA_EMAIL, function () {
    return updateCallNote(noteId, _cnTestPayload({ issue: 'Updated issue' }));
  });
  _assertSuccess(r, 'Update should succeed');
  _assertEq(r.note.issue, 'Updated issue', 'Issue round-trips after edit');
  _assertEq(r.note.caller, 'Test Caller', 'Unchanged field preserved');
}

// ── manager gate on managerGetCallNotes ──

function test_cn_managerGetCallNotes_nonManagerRejected() {
  var r = _asUser(_TEST_INDIA_EMAIL, function () {
    return managerGetCallNotes(_TEST_INDIA_ID, fmtDate_(new Date()));
  });
  _assertNotNull(r.error, 'Non-manager should be rejected');
  _assertContains(r.error, 'Manager access');
}


// ════════════════════════════════════════════════════════════════════════════
//  NORMALTIME 1899 COERCION + SAFE TIMEZONE (smoke-safe)
// ════════════════════════════════════════════════════════════════════════════

function test_normalizeTime_1899DateCoercion() {
  // Sheets coerces "09:30:00" into a Date with base date 1899-12-30T09:30:00.
  // normalizeTime_ must detect the Date and re-format to HH:mm:ss.
  const d = new Date(1899, 11, 30, 9, 30, 0);
  const result = normalizeTime_(d);
  _assertTrue(/^\d{2}:\d{2}:\d{2}$/.test(result),
    'Should return HH:mm:ss for 1899 coerced Date, got "' + result + '"');
  _assertTrue(result.indexOf('1899') < 0, 'Must not contain year string');
}

function test_safeTimezone_validPassthrough() {
  _assertEq(safeTimezone_('Asia/Kolkata'), 'Asia/Kolkata');
  _assertEq(safeTimezone_('America/Chicago'), 'America/Chicago');
}

function test_safeTimezone_invalidFallback() {
  _assertEq(safeTimezone_('NotATimezone'), CONFIG.TIMEZONE, 'Invalid tz falls back to CONFIG');
  _assertEq(safeTimezone_(''), CONFIG.TIMEZONE, 'Empty string falls back');
  _assertEq(safeTimezone_(null), CONFIG.TIMEZONE, 'Null falls back');
}


// ════════════════════════════════════════════════════════════════════════════
//  AUTOMATION TRIGGER GATES (INV-44)
// ════════════════════════════════════════════════════════════════════════════

function test_triggerGate_eodDigest_nonManagerThrows() {
  _assertThrows(function () {
    _asUser(_TEST_INDIA_EMAIL, function () { sendCallNotesEodDigest(); });
  }, 'manager access required', 'Non-manager should be rejected');
}

// Item 7 — the note-retention purge is destructive + reachable via
// google.script.run, so it must reject non-managers like the other purges.
function test_triggerGate_purgeOldCallNotes_nonManagerThrows() {
  _assertThrows(function () {
    _asUser(_TEST_INDIA_EMAIL, function () { purgeOldCallNotes(); });
  }, 'manager access required', 'Non-manager should not be able to purge notes');
}

// Cold-archive tier — a top-level trigger handler reachable via google.script.run
// that moves (deletes-from-live) per-rep Notes rows, so it carries the same
// assertManagerCaller_ gate as the purge (INV-44 family).
function test_triggerGate_archiveOldCallNotes_nonManagerThrows() {
  _assertThrows(function () {
    _asUser(_TEST_INDIA_EMAIL, function () { archiveOldCallNotes(); });
  }, 'manager access required', 'Non-manager should not be able to archive notes');
}

// 3rd-tier cold-store purge — the ONLY mechanism that irreversibly deletes
// archived (NotesArchive) rows; same INV-44 gate as the other destructive
// trigger handlers.
function test_triggerGate_purgeArchivedCallNotes_nonManagerThrows() {
  _assertThrows(function () {
    _asUser(_TEST_INDIA_EMAIL, function () { purgeArchivedCallNotes(); });
  }, 'manager access required', 'Non-manager should not be able to purge the cold archive');
}

// M10 — the FormSubmissions/FormTokens PHI purge is the most destructive
// trigger handler of all; its gate was the only one of the seven untested.
function test_triggerGate_purgeExpiredFormData_nonManagerThrows() {
  _assertThrows(function () {
    _asUser(_TEST_INDIA_EMAIL, function () { purgeExpiredFormData(); });
  }, 'manager access required', 'Non-manager should not be able to fire the PHI purge');
}

// M10 — without this gate a non-manager rep could silently disable every
// automation trigger (INV-61). The gate throws BEFORE any trigger is touched,
// so this is safe to run against production.
function test_triggerGate_removeAutomationTriggers_nonManagerThrows() {
  _assertThrows(function () {
    _asUser(_TEST_INDIA_EMAIL, function () { removeAutomationTriggers(); });
  }, 'manager access required', 'Non-manager must not be able to disable automation');
}

// Item 9 — manager comments on any note are manager-gated.
function test_setCallNoteManagerComment_nonManagerRejected() {
  _asUser(_TEST_INDIA_EMAIL, function () {
    const r = setCallNoteManagerComment(_TEST_PH_ID, 'nonexistent-note', 'nice work');
    _assertEq(r.success, false, 'non-manager rejected');
    _assertContains(r.error, 'Manager access required');
  });
}

function test_triggerGate_weeklyDigests_nonManagerThrows() {
  _assertThrows(function () {
    _asUser(_TEST_INDIA_EMAIL, function () { sendCallNotesWeeklyDigests(); });
  }, 'manager access required');
}

function test_triggerGate_missedPunch_nonManagerThrows() {
  _assertThrows(function () {
    _asUser(_TEST_INDIA_EMAIL, function () { sendDailyMissedPunchAlerts(); });
  }, 'manager access required');
}

function test_triggerGate_urgentDigest_nonManagerThrows() {
  _assertThrows(function () {
    _asUser(_TEST_INDIA_EMAIL, function () { sendCallNotesUrgentDigest(); });
  }, 'manager access required');
}

function test_triggerGate_trainingOverdue_nonManagerThrows() {
  _assertThrows(function () {
    _asUser(_TEST_INDIA_EMAIL, function () { sendTrainingOverdueDigest(); });
  }, 'manager access required');
}

// Automation-failure push — a top-level trigger handler reachable via
// google.script.run, so it carries the MANAGER_EMAILS assertManagerCaller_ gate
// (INV-44 family), NOT emp.isAdmin (it runs as the installer in a trigger).
function test_triggerGate_automationHealthDigest_nonManagerThrows() {
  _assertThrows(function () {
    _asUser(_TEST_INDIA_EMAIL, function () { sendAutomationHealthDigest(); });
  }, 'manager access required');
}

// DeptRequests v2 — the SLA reminder digest is a trigger handler, so it carries
// the MANAGER_EMAILS assertManagerCaller_ gate (INV-44 family).
function test_triggerGate_deptReqReminder_nonManagerThrows() {
  _assertThrows(function () {
    _asUser(_TEST_INDIA_EMAIL, function () { sendDeptRequestReminderDigest(); });
  }, 'manager access required');
}

// The consolidated daily brief (#2, INV-151) is a trigger handler, so it
// carries the MANAGER_EMAILS assertManagerCaller_ gate (INV-44 family).
function test_triggerGate_managerDailyBrief_nonManagerThrows() {
  _assertThrows(function () {
    _asUser(_TEST_INDIA_EMAIL, function () { sendManagerDailyBrief(); });
  }, 'manager access required');
}

// The Timesheet cold-archive (#7, INV-153) is a trigger handler mutating the
// payroll tab, so it carries the MANAGER_EMAILS assertManagerCaller_ gate
// (INV-44 family). Disabled by default, so the manager-context trigger run is
// a no-op — this test only exercises the gate.
function test_triggerGate_timesheetArchive_nonManagerThrows() {
  _assertThrows(function () {
    _asUser(_TEST_INDIA_EMAIL, function () { archiveOldTimesheetRows(); });
  }, 'manager access required');
}

// INV-153 — the archive window resolver: disabled by default; sub-floor values
// clamp UP to TIMESHEET_ARCHIVE_MIN_DAYS (an operator typo like 30 must never
// strip active-payroll-window rows out of the live tab); garbage disables.
// Writes only the Script Property (restored in finally) — no sheet touch.
function test_timesheetArchive_windowFloorAndDefault() {
  const props = PropertiesService.getScriptProperties();
  const prev = props.getProperty('TIMESHEET_ARCHIVE_DAYS');
  try {
    props.deleteProperty('TIMESHEET_ARCHIVE_DAYS');
    _assertEq(getTimesheetArchiveDays_(), 0, 'unset property + CONFIG 0 → disabled');
    props.setProperty('TIMESHEET_ARCHIVE_DAYS', '30');
    _assertEq(getTimesheetArchiveDays_(), TIMESHEET_ARCHIVE_MIN_DAYS, 'sub-floor value clamps UP to the floor');
    props.setProperty('TIMESHEET_ARCHIVE_DAYS', '400');
    _assertEq(getTimesheetArchiveDays_(), 400, 'at/above the floor passes through');
    props.setProperty('TIMESHEET_ARCHIVE_DAYS', 'garbage');
    _assertEq(getTimesheetArchiveDays_(), 0, 'unparseable → disabled (fail-safe)');
    props.setProperty('TIMESHEET_ARCHIVE_DAYS', '-5');
    _assertEq(getTimesheetArchiveDays_(), 0, 'negative → disabled');
  } finally {
    if (prev == null) props.deleteProperty('TIMESHEET_ARCHIVE_DAYS');
    else props.setProperty('TIMESHEET_ARCHIVE_DAYS', prev);
  }
}

// F(cycle-8 M-13): BEHAVIORAL coverage for the shared mover behind all three
// archive tiers (CN archive, CN cold purge feeder, Timesheet archive) — it
// mutates the payroll tab nightly and was pinned only by source tripwires.
// Uses two throwaway TEST_ tabs in the ADP spreadsheet, removed in finally.
function test_archiveSheetRowsOlderThan_behavioral() {
  const ss = getAdpSS_();
  const SRC = 'TEST_ArchSrc', DST = 'TEST_ArchDst';
  let src = null, dst = null;
  try {
    try { const s0 = ss.getSheetByName(SRC); if (s0) ss.deleteSheet(s0); } catch (e) {}
    try { const d0 = ss.getSheetByName(DST); if (d0) ss.deleteSheet(d0); } catch (e) {}
    src = ss.insertSheet(SRC); dst = ss.insertSheet(DST);
    // Two-row header (the ADP Timesheet shape) — row 2 deliberately carries a
    // date-LIKE string so headerRows:2 (not just the null-guard) is what saves it.
    src.getRange(1, 1, 2, 3).setValues([
      ['Company Code', 'Date', 'Note'],
      ['2000-01-01', '2000-01-01', 'header row 2 — must never move'],
    ]);
    // Data rows in APPEND order (not date order — the INV-153 rationale): a
    // late BACK-FILL old row lands AFTER newer rows. Cutoff = 2026-01-01.
    src.getRange(3, 1, 4, 3).setValues([
      ['r1', '2025-06-10', 'old — moves'],
      ['r2', '2026-05-01', 'new — stays'],
      ['r3', '2025-12-31', 'old back-fill AFTER a newer row — moves'],
      ['r4', '2026-01-01', 'exactly at cutoff — stays (strict <)'],
    ]);
    // A short row (2 cells) — must pad to the requested width on the move.
    src.getRange(7, 1, 1, 2).setValues([['r5', '2025-01-15']]);
    SpreadsheetApp.flush();
    // Cutoff derived through the SAME parser the mover uses (CONFIG.TIMEZONE) —
    // Sheets coerces the fixture date strings to Date cells in the sheet's tz
    // (== CONFIG.TIMEZONE per S1.1), so a UTC-anchored cutoff would put the
    // at-cutoff row on the wrong side of the strict <.
    const cutoffMs = parseRetentionDateMs_('2026-01-01T00:00:00');
    const moved = archiveSheetRowsOlderThan_(src, dst, 1, cutoffMs, { headerRows: 2, width: 3 });
    _assertEq(moved, 3, 'moves exactly the 3 pre-cutoff data rows (incl. the append-order back-fill)');
    const dstVals = dst.getDataRange().getValues();
    _assertEq(dstVals.length, 3, 'archive holds exactly the moved rows');
    _assertEq(String(dstVals[0][0]), 'r1', 'sheet order preserved: r1 first');
    _assertEq(String(dstVals[1][0]), 'r3', 'the late back-fill moved too');
    _assertEq(String(dstVals[2][0]), 'r5', 'short row moved');
    _assertEq(String(dstVals[2][2]), '', 'short row padded to width 3');
    const srcVals = src.getDataRange().getValues();
    _assertEq(srcVals.length, 4, 'source keeps 2 header rows + r2 + r4');
    _assertEq(String(srcVals[1][2]), 'header row 2 — must never move', 'headerRows:2 protected the second header row');
    _assertEq(String(srcVals[2][0]), 'r2', 'post-cutoff row stayed');
    _assertEq(String(srcVals[3][0]), 'r4', 'at-cutoff row stayed (strict <)');
    // Idempotence: a second run finds nothing left to move.
    _assertEq(archiveSheetRowsOlderThan_(src, dst, 1, cutoffMs, { headerRows: 2, width: 3 }), 0, 're-run is a no-op');
    // Duplicate-never-lose ordering: append → flush → delete (source-level pin;
    // a mid-run death after the flush can only leave a duplicate in the archive).
    const fnSrc = String(archiveSheetRowsOlderThan_);
    _assertTrue(fnSrc.indexOf('setValues') < fnSrc.indexOf('SpreadsheetApp.flush') &&
                fnSrc.indexOf('SpreadsheetApp.flush') < fnSrc.indexOf('deleteRow'),
      'append-then-flush-then-delete ordering (a mid-run failure duplicates, never loses)');
  } finally {
    try { if (src) ss.deleteSheet(src); } catch (e) {}
    try { if (dst) ss.deleteSheet(dst); } catch (e) {}
  }
}

// ── Client error beacon (#1, INV-150) ──────────────────────────────────────
// Rep-callable + locked + server-bounded append. Verifies: an unregistered
// caller is rejected; an oversized payload is truncated to the server caps;
// the row lands in the ClientErrors tab. Cleans up its own rows (they carry
// the TEST_ empId but ClientErrors isn't in cleanupTestData's sweep).
function test_recordClientError_authBoundsAndAppend() {
  // Reset the per-rep hourly rate cap so repeated suite runs can't starve it.
  try { CacheService.getScriptCache().remove('client_err_rate:' + _TEST_INDIA_ID); } catch (e) {}
  const nobody = _asUser('do-not-send-nobody@example.invalid', function () {
    return recordClientError({ message: 'x', stack: 'y', view: 'clock', source: 'onerror' });
  });
  _assertTrue(nobody && nobody.success === false, 'unregistered caller rejected');
  const empty = _asUser(_TEST_INDIA_EMAIL, function () {
    return recordClientError({ message: '   ', stack: 'y' });
  });
  _assertTrue(empty && empty.success === false, 'empty message rejected (nothing to record)');

  const bigMsg = new Array(1002).join('m');    // 1001 chars
  const bigStack = new Array(5002).join('s');  // 5001 chars
  const ok = _asUser(_TEST_INDIA_EMAIL, function () {
    return recordClientError({ message: bigMsg, stack: bigStack, view: 'callNotes', source: 'unhandledrejection' });
  });
  _assertTrue(ok && ok.success === true, 'valid beacon accepted');
  const sheet = getOrCreateClientErrorsSheet_();
  const lastRow = sheet.getLastRow();
  try {
    const row = sheet.getRange(lastRow, 1, 1, 6).getValues()[0];
    _assertEq(String(row[1]), _TEST_INDIA_ID, 'row carries the caller empId');
    _assertEq(String(row[2]), 'callNotes', 'row carries the active view');
    _assertEq(String(row[3]), 'unhandledrejection', 'source whitelisted');
    _assertEq(String(row[4]).length, CLIENT_ERR_MSG_MAX, 'message truncated to the server cap');
    _assertEq(String(row[5]).length, CLIENT_ERR_STACK_MAX, 'stack truncated to the server cap');
  } finally {
    // Delete every TEST_ row this (or a prior aborted) run appended.
    for (let r = sheet.getLastRow(); r >= 2; r--) {
      if (String(sheet.getRange(r, 2).getValue()).indexOf('TEST_') === 0) sheet.deleteRow(r);
    }
  }
}

// ── What's new panel (#4, INV-152) ─────────────────────────────────────────
// WHATSNEW_KB_ID gates the feature (unset = dormant); a DRAFT article stays
// invisible to everyone (broadcast surface — INV-140/147); publishing it
// makes the body + edit stamp flow to reps.
function test_whatsNew_propertyGateAndDraftHidden() {
  const props = PropertiesService.getScriptProperties();
  const prev = props.getProperty('WHATSNEW_KB_ID');
  let kbId = null;
  try {
    props.deleteProperty('WHATSNEW_KB_ID');
    const unset = _asUser(_TEST_INDIA_EMAIL, function () { return getWhatsNew(); });
    _assertTrue(unset && unset.none === true, 'unset property → dormant {none:true}');

    const saved = _asUser(_TEST_MGR_EMAIL, function () {
      return kbSaveItem({ title: 'TEST_WHATSNEW', type: 'article',
        body: 'changelog TESTWHATSNEWTOKEN', department: 'TEST', status: 'draft' });
    });
    _assertTrue(saved && saved.success, 'draft changelog article created');
    kbId = saved.id;
    props.setProperty('WHATSNEW_KB_ID', kbId);

    const draft = _asUser(_TEST_INDIA_EMAIL, function () { return getWhatsNew(); });
    _assertTrue(draft && draft.none === true, 'draft article stays invisible (broadcast rule)');

    const pub = _asUser(_TEST_MGR_EMAIL, function () { return kbPublishItem(kbId); });
    _assertTrue(pub && pub.success, 'published');
    const live = _asUser(_TEST_INDIA_EMAIL, function () { return getWhatsNew(); });
    _assertTrue(live && !live.none, 'published article flows to reps');
    _assertContains(String(live.bodyMd || ''), 'TESTWHATSNEWTOKEN', 'body delivered');
    _assertTrue(!!String(live.stamp || ''), 'edit stamp present (drives the client seen-flag)');
  } finally {
    if (prev == null) props.deleteProperty('WHATSNEW_KB_ID');
    else props.setProperty('WHATSNEW_KB_ID', prev);
    if (kbId) {
      _asUser(_TEST_MGR_EMAIL, function () { try { kbDeleteItem(kbId); } catch (e) {} });
    }
  }
}

// Aggregation behind the urgent digest — finds urgent-flagged notes (urgent
// lives in subformData.flags[], NOT the FlagType column). Read-only, no email.
function test_cn_managerAggregateUrgent_findsUrgentNotOthers() {
  _clearTestCallNotes();
  var urgentNote, plainNote;
  _asUser(_TEST_INDIA_EMAIL, function () {
    urgentNote = submitCallNote(_cnTestPayload({ flags: ['urgent'], caller: 'Urgent Caller' })).note;
    plainNote  = submitCallNote(_cnTestPayload({ caller: 'Plain Caller' })).note;
  });
  // urgent flag rides in subformData.flags, FlagType column stays '' (INV-75/77)
  _assertTrue(urgentNote.subformData && urgentNote.subformData.flags.indexOf('urgent') >= 0,
    'submitted note carries urgent in subformData.flags');
  _assertEq(urgentNote.flagType, '', 'urgent never enters the FlagType column (INV-37)');

  var res = managerAggregateUrgent_({ start: urgentNote.dateLocal, end: urgentNote.dateLocal });
  var ids = (res.results || []).map(function (n) { return n.noteId; });
  _assertTrue(ids.indexOf(urgentNote.noteId) >= 0, 'urgent note is aggregated');
  _assertFalse(ids.indexOf(plainNote.noteId) >= 0, 'a non-urgent note is NOT aggregated');
  // results carry repId/repName for the digest's per-rep rendering
  var hit = (res.results || []).filter(function (n) { return n.noteId === urgentNote.noteId; })[0];
  _assertEq(hit.repId, _TEST_INDIA_ID, 'aggregated note carries repId');
}

function test_triggerGate_dailyExport_nonManagerThrows() {
  _assertThrows(function () {
    _asUser(_TEST_INDIA_EMAIL, function () { runDailyExportCheck(); });
  }, 'manager access required');
}


// ════════════════════════════════════════════════════════════════════════════
//  AUDIT ROW ASSERTIONS (INV-08)
// ════════════════════════════════════════════════════════════════════════════

function _findAuditRow(empId, actionType) {
  const sheet = getAdpSS_().getSheetByName(CONFIG.AUDIT_TAB);
  if (!sheet) return null;
  const rows = sheet.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1] || '').trim() === empId &&
        String(rows[i][4] || '').trim() === actionType) {
      return rows[i];
    }
  }
  return null;
}

function test_auditRow_recordPunchAdjustment() {
  _clearTestState(_TEST_INDIA_ID);
  _withFeatureFlags_({ employeeImmediateAdjust: true }, function () {
    _asUser(_TEST_INDIA_EMAIL, function () {
      recordPunch('ClockIn', { date: _TEST_DATE_RECENT, time: '08:00', reason: 'test audit' });
    });
  });
  var row = _findAuditRow(_TEST_INDIA_ID, 'ClockIn');
  _assertNotNull(row, 'Audit row should exist for recordPunch');
}

function test_auditRow_deletePunch_hasActorEmail() {
  _clearTestState(_TEST_INDIA_ID);
  _withFeatureFlags_({ employeeImmediateAdjust: true }, function () {
    _asUser(_TEST_INDIA_EMAIL, function () {
      recordPunch('ClockIn', { date: _TEST_DATE_RECENT, time: '09:00', reason: 'setup' });
    });
  });
  _asUser(_TEST_MGR_EMAIL, function () {
    deletePunch(_TEST_INDIA_ID, _TEST_DATE_RECENT, '09:00:00', 'ClockIn');
  });
  var row = _findAuditRow(_TEST_INDIA_ID, 'PunchDelete');
  _assertNotNull(row, 'Audit row should exist for PunchDelete');
  var notes = String(row[9] || '');
  _assertContains(notes, 'removed by manager', 'Audit notes should mention manager delete');
  // F10: the test name promises an actor-email check — assert the UserEmail
  // column (index 3) records the MANAGER who deleted, not the target employee
  // (INV-08: manager actions record the actor's email).
  _assertEq(String(row[3] || '').toLowerCase(), _TEST_MGR_EMAIL.toLowerCase(),
    'UserEmail (actor) column records the manager who deleted the punch');
}


// ════════════════════════════════════════════════════════════════════════════
//  METRICS / CDR MODULE (G1 — backfill; the only major subsystem with no tests)
//  ────────────────────────────────────────────────────────────────────────
//  Pure-logic coverage for the CDR data-layer helpers + the shared note-
//  coverage helper (S1). One integration test guards the F1 regression class:
//  countCallNotesInRange_ must read CN.DATE_LOCAL through normalizeDate_ so a
//  Sheets-coerced Date doesn't silently zero the count. CDR endpoints
//  (getMyMetrics / getTeamMetrics) aren't integration-tested here because they
//  require the external CDR Report spreadsheet (CDR_SS_ID), which isn't part
//  of the test fixture — the data-layer parsers below are the testable seam.
// ════════════════════════════════════════════════════════════════════════════

// ── cnNoteCoverage_ (S1 shared helper) ──

function test_metrics_cnNoteCoverage_basic() {
  _assertEq(cnNoteCoverage_(5, 10), 50, '5/10 → 50%');
  _assertEq(cnNoteCoverage_(3, 4),  75, '3/4 → 75%');
  _assertEq(cnNoteCoverage_(7, 7),  100, '7/7 → 100%');
  _assertEq(cnNoteCoverage_(1, 3),  33, '1/3 rounds to 33%');
}
function test_metrics_cnNoteCoverage_zeroNotes() {
  _assertEq(cnNoteCoverage_(0, 10), 0, '0 notes over answered calls → 0%, not null');
}
function test_metrics_cnNoteCoverage_noDenominator() {
  _assertNull(cnNoteCoverage_(5, 0),    'No answered calls → null');
  _assertNull(cnNoteCoverage_(5, null), 'Null denominator → null');
  _assertNull(cnNoteCoverage_(0, 0),    'Zero over zero → null');
}

// ── cdrParseHms_ / cdrFmtHms_ (duration parsing — INV-64) ──

function test_metrics_cdrParseHms_hms() {
  _assertEq(cdrParseHms_('1:30:00'), 5400, 'H:MM:SS → seconds');
  _assertEq(cdrParseHms_('0:01:05'), 65,   'small H:MM:SS');
}
function test_metrics_cdrParseHms_mmAndBare() {
  _assertEq(cdrParseHms_('2:00'), 120, 'MM:SS → seconds');
  _assertEq(cdrParseHms_('45'),   45,  'bare number passes through');
}
function test_metrics_cdrParseHms_emptyAndNull() {
  _assertEq(cdrParseHms_(''),    0, 'empty → 0');
  _assertEq(cdrParseHms_(null),  0, 'null → 0');
}
function test_metrics_cdrFmtHms_roundTrip() {
  _assertEq(cdrFmtHms_(5400), '1:30:00', 'seconds → H:MM:SS');
  _assertEq(cdrFmtHms_(65),   '0:01:05', 'pads minutes + seconds');
  _assertEq(cdrFmtHms_(0),    '0:00:00', 'zero → 0:00:00');
}

// ── cdrRowDateIso_ (date normalization for CDR rows) ──

function test_metrics_cdrRowDateIso_isoString() {
  _assertEq(cdrRowDateIso_('2026-05-28', CONFIG.TIMEZONE), '2026-05-28', 'ISO passthrough');
  _assertEq(cdrRowDateIso_('2026-05-28T10:00:00', CONFIG.TIMEZONE), '2026-05-28', 'ISO datetime → date');
}
function test_metrics_cdrRowDateIso_usFormat() {
  _assertEq(cdrRowDateIso_('5/28/26', CONFIG.TIMEZONE),   '2026-05-28', 'M/D/YY → ISO');
  _assertEq(cdrRowDateIso_('12/3/2026', CONFIG.TIMEZONE), '2026-12-03', 'M/D/YYYY → ISO, zero-padded');
}

// ── isCdrQueueSentinel_ (queue rows excluded from agent stats) ──

function test_metrics_isCdrQueueSentinel() {
  _assertTrue(isCdrQueueSentinel_('A_Q_Sales'),  'A_Q_ prefix is a queue sentinel');
  _assertTrue(isCdrQueueSentinel_('Backup CSR'), 'Backup CSR is a sentinel');
  _assertFalse(isCdrQueueSentinel_('Jane Doe'),  'A real agent name is not a sentinel');
}

// ── cdrRosterHash_ (cache-key roster fingerprint — INV-85) ──

function test_metrics_cdrRosterHash_orderInsensitive() {
  var a = cdrRosterHash_(['Alice', 'Bob', 'Carol']);
  var b = cdrRosterHash_(['Carol', 'Alice', 'Bob']);
  _assertEq(a, b, 'Hash is order-insensitive (sorts before hashing)');
}
function test_metrics_cdrRosterHash_distinctSetsDiffer() {
  var a = cdrRosterHash_(['Alice', 'Bob']);
  var c = cdrRosterHash_(['Alice', 'Carol']);
  _assertTrue(a !== c, 'Different roster sets produce different hashes');
}
function test_metrics_cdrRosterHash_emptyIsAll() {
  _assertEq(cdrRosterHash_([]),   'all', 'empty roster → "all"');
  _assertEq(cdrRosterHash_(null), 'all', 'null roster → "all"');
}

// ── countCallNotesInRange_ (S1 shared count helper) — pure guards ──

function test_metrics_countCallNotesInRange_noSheetReturnsZero() {
  _assertEq(countCallNotesInRange_({ id: 'X', name: 'Y', callNotesSheetId: null }, '2026-01-01', '2026-12-31'), 0,
    'Rep with no call-notes Sheet → 0');
  _assertEq(countCallNotesInRange_(null, '2026-01-01', '2026-12-31'), 0, 'Null emp → 0');
}

// ── countCallNotesInRange_ (integration) — guards the F1 regression class ──

function test_metrics_countCallNotesInRange_countsToday() {
  _clearTestCallNotes();
  const ctx = _asUser(_TEST_INDIA_EMAIL, function () {
    const emp = getEmployeeInfo_();
    const t = Utilities.formatDate(new Date(), empTz_(emp), 'yyyy-MM-dd');
    submitCallNote(_cnTestPayload());
    submitCallNote(_cnTestPayload({ caller: 'Second Caller' }));
    return { emp: emp, today: t };
  });
  // The note date is stored as a 'yyyy-MM-dd' string that Sheets coerces to a
  // Date on read. If the helper ever drops normalizeDate_, this count goes to 0.
  _assertEq(countCallNotesInRange_(ctx.emp, ctx.today, ctx.today), 2,
    'Counts both of today\'s notes (regression guard for the CN.DATE_LOCAL coercion bug)');
  _assertEq(countCallNotesInRange_(ctx.emp, '2000-01-01', '2000-01-02'), 0,
    'Out-of-range window counts 0');
  _clearTestCallNotes();
}


// ════════════════════════════════════════════════════════════════════════════
//  FILLABLE FORMS — IN-APP SUBMISSION VIEWER (G3)
// ════════════════════════════════════════════════════════════════════════════

// getFormSubmission is caller-scoped (INV-90): only the rep who created the
// token may read the submission. This guards against a rep reading another
// rep's form data via google.script.run.
function test_cn_getFormSubmission_callerScoped() {
  // India (enrolled) creates a fillable-form token.
  const token = _asUser(_TEST_INDIA_EMAIL, function () {
    const r = createFormToken({
      formType: 'eaa',
      recipientEmail: 'do-not-send-recipient@example.invalid',
      recipientName: 'Test Recipient',
      prefillData: {},
    });
    _assertTrue(r.success, 'createFormToken should succeed for an enrolled rep');
    return r.token;
  });
  _assertNotNull(token, 'A token should have been created');

  try {
    // Creator can read it — pending (no submission yet), NOT an auth error.
    const asCreator = _asUser(_TEST_INDIA_EMAIL, function () { return getFormSubmission(token); });
    _assertNull(asCreator.error, 'Creator should not get an auth error');
    _assertEq(asCreator.submitted, false, 'No submission yet → submitted=false');

    // A different registered rep is rejected by the ownership check.
    const asOther = _asUser(_TEST_PH_EMAIL, function () { return getFormSubmission(token); });
    _assertNotNull(asOther.error, 'Non-creator should be rejected');
    _assertContains(asOther.error, 'forms you sent', 'Rejection mentions ownership');
  } finally {
    // Remove the test token row (FormTokens isn't covered by the TEST_-prefix
    // cleanup; the FormTokenCreated audit row is, via the India empId).
    try {
      const ts = getOrCreateFormTokensSheet_();
      const loc = findFormTokenRow_(ts, token);
      if (loc) ts.deleteRow(loc.rowIndex);
    } catch (e) {}
  }
}

// M10 — first integration coverage of the two PUBLIC token endpoints
// (getFormByToken / submitFormByToken take no employee identity, so they are
// deliberately called WITHOUT _asUser): consent enforcement (A9/INV-113),
// recipient-payload size caps (INV-96), server-authoritative hash + consent
// stamping, and the one-time-use token transition.
function test_publicForm_tokenLifecycle() {
  const token = _asUser(_TEST_INDIA_EMAIL, function () {
    const r = createFormToken({
      formType: 'eaa',
      recipientEmail: 'do-not-send-recipient@example.invalid',
      recipientName: 'Test Recipient',
      prefillData: { patientName: 'TEST Patient' },
    });
    _assertTrue(r.success, 'createFormToken should succeed for an enrolled rep');
    return r.token;
  });
  _assertNotNull(token, 'A token should have been created');
  try {
    // Public read resolves the pending token to the form definition + prefill.
    const def = getFormByToken(token);
    _assertNull(def.error, 'pending token should resolve');
    _assertEq(def.formType, 'eaa', 'form type round-trips');
    _assertEq((def.prefillData || {}).patientName, 'TEST Patient', 'prefill rides the token');

    // Consent is server-enforced: an absent _meta envelope is rejected and the
    // token stays pending (the closed back-compat hole, A9).
    const noConsent = submitFormByToken(token, { q1: 'answer', signature: 'data:image/png;base64,AAaa' });
    _assertEq(noConsent.success, false, 'submit without _meta must be rejected');
    _assertContains(noConsent.error, 'privacy notice', 'rejection names the consent gate');
    _assertNull(getFormByToken(token).error, 'token still pending after consent rejection');

    // Size cap: an oversized signature gets a specific, actionable error and
    // the token stays pending for retry (INV-96).
    const bigSig = new Array(45002).join('x');   // > FORM_CELL_CHAR_LIMIT
    const tooBig = submitFormByToken(token, {
      q1: 'answer', signature: bigSig,
      _meta: { consentAgreed: true, openedAt: '2026-01-01T00:00:00' },
    });
    _assertEq(tooBig.success, false, 'oversized signature rejected');
    _assertContains(tooBig.error, 'too large', 'size-cap error is specific');
    _assertNull(getFormByToken(token).error, 'token still pending after size rejection');

    // Valid consented submit: hash + server-authoritative consent version +
    // certificate stamped; token flips to submitted (one-time use).
    const ok = submitFormByToken(token, {
      q1: 'answer one', q2: true,
      signature: 'data:image/png;base64,AAaa',
      _meta: { consentAgreed: true, openedAt: '2026-01-01T00:00:00' },
    });
    _assertTrue(ok.success, 'valid consented submit succeeds');
    const sLoc = findFormSubmissionRow_(getOrCreateFormSubmissionsSheet_(), token);
    _assertNotNull(sLoc, 'submission row written');
    _assertTrue(/^[0-9a-f]{64}$/.test(String(sLoc.row[FS.SUBMISSION_HASH])), 'SubmissionHash is 64-hex');
    _assertEq(String(sLoc.row[FS.CONSENT_VERSION]), String(CONFIG.FORM_CONSENT_VERSION),
      'server-authoritative consent version stamped (never the client-sent one)');
    const cert = JSON.parse(String(sLoc.row[FS.CERTIFICATE]));
    _assertEq(cert.token, token, 'certificate carries the token');
    const ver = _asUser(_TEST_MGR_EMAIL, function () { return verifyFormSubmissionIntegrity_(token); });
    _assertEq(ver.match, true, 'integrity hash verifies (INV-113)');
    _assertContains(String(getFormByToken(token).error || ''), 'already been submitted', 'read after submit refused');
    _assertEq(submitFormByToken(token, { _meta: { consentAgreed: true } }).success, false, 'double-submit refused');
  } finally {
    // FormTokens / FormSubmissions aren't covered by the TEST_-prefix cleanup —
    // remove both rows directly (same pattern as the caller-scoped form test).
    try {
      const ts = getOrCreateFormTokensSheet_();
      const tLoc = findFormTokenRow_(ts, token);
      if (tLoc) ts.deleteRow(tLoc.rowIndex);
      const ss = getOrCreateFormSubmissionsSheet_();
      const sLoc2 = findFormSubmissionRow_(ss, token);
      if (sLoc2) ss.deleteRow(sLoc2.rowIndex);
    } catch (e) {}
  }
}

// F3 (cycle-8): a form token whose ExpiresAt cell is BLANK must fail CLOSED —
// the expiry gates key off formTokenCellMs_(...).present, which is false for an
// empty cell. Before the fix that read as "not expired" (fail-open), leaving a
// blank-expiry token perpetually valid for anonymous PHI submission. A blank
// cell only arises from corruption / a lossy FORMS_SS_ID migration (createFormToken
// always writes ExpiresAt atomically), so rejecting it is strictly safe.
function test_publicForm_blankExpiryFailsClosed() {
  const token = _asUser(_TEST_INDIA_EMAIL, function () {
    return createFormToken({
      formType: 'eaa',
      recipientEmail: 'do-not-send-recipient@example.invalid',
      recipientName: 'Test Recipient',
      prefillData: {},
    }).token;
  });
  _assertNotNull(token, 'A token should have been created');
  try {
    // Blank out ExpiresAt directly (simulates a corrupted / migration-truncated cell).
    const ts = getOrCreateFormTokensSheet_();
    const tLoc = findFormTokenRow_(ts, token);
    _assertNotNull(tLoc, 'token row located');
    ts.getRange(tLoc.rowIndex, FT.EXPIRES_AT + 1).setValue('');
    SpreadsheetApp.flush();

    // Public read fails closed.
    const def = getFormByToken(token);
    _assertContains(String(def.error || ''), 'expired', 'blank-expiry token is rejected on read (fail-closed)');
    // Public submit fails closed too (even with valid consent).
    const sub = submitFormByToken(token, {
      q1: 'answer', signature: 'data:image/png;base64,AAaa',
      _meta: { consentAgreed: true, openedAt: '2026-01-01T00:00:00' },
    });
    _assertEq(sub.success, false, 'blank-expiry token cannot be submitted against');
    _assertContains(String(sub.error || ''), 'expired', 'submit rejection names the expiry gate');
    // No submission row was written.
    _assertNull(findFormSubmissionRow_(getOrCreateFormSubmissionsSheet_(), token),
      'no PHI submission persisted against a blank-expiry token');
  } finally {
    try {
      const ts2 = getOrCreateFormTokensSheet_();
      const tLoc2 = findFormTokenRow_(ts2, token);
      if (tLoc2) ts2.deleteRow(tLoc2.rowIndex);
    } catch (e) {}
  }
}

// managerGetFormSubmission is manager-gated and scoped to the rep being viewed:
// the token must have been created by that rep.
function test_cn_managerGetFormSubmission_gatedAndScoped() {
  const token = _asUser(_TEST_INDIA_EMAIL, function () {
    return createFormToken({
      formType: 'eaa',
      recipientEmail: 'do-not-send-recipient@example.invalid',
      recipientName: 'Test Recipient',
      prefillData: {},
    }).token;
  });
  _assertNotNull(token, 'A token should have been created');

  try {
    // Non-manager is rejected.
    const asRep = _asUser(_TEST_PH_EMAIL, function () {
      return managerGetFormSubmission(_TEST_INDIA_ID, token);
    });
    _assertNotNull(asRep.error, 'Non-manager should be rejected');
    _assertContains(asRep.error, 'Manager access required', 'Manager gate message');

    // Manager viewing the creating rep: allowed (pending, no submission yet).
    const asMgrRightRep = _asUser(_TEST_MGR_EMAIL, function () {
      return managerGetFormSubmission(_TEST_INDIA_ID, token);
    });
    _assertNull(asMgrRightRep.error, 'Manager + correct rep should not error');
    _assertEq(asMgrRightRep.submitted, false, 'No submission yet → submitted=false');

    // Manager viewing the WRONG rep: scoped out (token not created by PH rep).
    const asMgrWrongRep = _asUser(_TEST_MGR_EMAIL, function () {
      return managerGetFormSubmission(_TEST_PH_ID, token);
    });
    _assertNotNull(asMgrWrongRep.error, 'Token not created by the selected rep should be rejected');
    _assertContains(asMgrWrongRep.error, 'selected rep', 'Rejection mentions rep scoping');
  } finally {
    try {
      const ts = getOrCreateFormTokensSheet_();
      const loc = findFormTokenRow_(ts, token);
      if (loc) ts.deleteRow(loc.rowIndex);
    } catch (e) {}
  }
}

// ── F3: Call Notes email two-stage send + bodyHash guard (INV-41/33) ────────
// NOTE: these tests deliberately exercise only the preview + the send-side
// guard paths. They never drive emailFromCallNote through to a successful
// MailApp.sendEmail — a real send would CC CONFIG.CALL_NOTES.CC_EMAIL (a live
// inbox) and consume mail quota. The hash-mismatch / missing-hash branches
// return BEFORE any send, so they're safe to run on prod. The successful-send
// path stays a manual scenario (S19).

const _CN_EMAIL_SELECTIONS = {
  departments: ['Other'],
  individualEmail: 'do-not-send@example.invalid',
  updateInfo: 'Verified Shipping',
};

function test_cn_previewCallNoteEmail_returnsHashAndSubject() {
  _clearTestCallNotes();
  let noteId;
  _asUser(_TEST_INDIA_EMAIL, function () {
    noteId = submitCallNote(_cnTestPayload()).note.noteId;
  });
  const p = _asUser(_TEST_INDIA_EMAIL, function () {
    return previewCallNoteEmail(noteId, _CN_EMAIL_SELECTIONS);
  });
  _assertNull(p.error, 'preview should not error');
  _assertNotNull(p.bodyHash, 'preview returns a bodyHash');
  _assertEq(String(p.bodyHash).length, 64, 'bodyHash is a 64-char hex SHA-256');
  _assertContains(p.subject, 'Verified Shipping', 'subject reflects the updateInfo');
  _assertContains(p.htmlBody, 'Call Details', 'rendered body has the Call Details table');
}

function test_cn_previewCallNoteEmail_requiresDepartment() {
  _clearTestCallNotes();
  let noteId;
  _asUser(_TEST_INDIA_EMAIL, function () {
    noteId = submitCallNote(_cnTestPayload()).note.noteId;
  });
  const p = _asUser(_TEST_INDIA_EMAIL, function () {
    return previewCallNoteEmail(noteId, { departments: [], updateInfo: 'Verified Shipping' });
  });
  _assertNotNull(p.error, 'no department selected should error');
  _assertContains(p.error, 'department', 'error mentions the missing department');
}

function test_cn_emailFromCallNote_rejectsMissingHash() {
  _clearTestCallNotes();
  let noteId;
  _asUser(_TEST_INDIA_EMAIL, function () {
    noteId = submitCallNote(_cnTestPayload()).note.noteId;
  });
  // Empty expectedBodyHash → server refuses BEFORE sending (no MailApp call).
  const r = _asUser(_TEST_INDIA_EMAIL, function () {
    return emailFromCallNote(noteId, _CN_EMAIL_SELECTIONS, '');
  });
  _assertFailure(r, 'preview', 'send without a preview hash must be rejected before sending');
}

function test_cn_emailFromCallNote_rejectsStaleHash() {
  _clearTestCallNotes();
  let noteId;
  _asUser(_TEST_INDIA_EMAIL, function () {
    noteId = submitCallNote(_cnTestPayload()).note.noteId;
  });
  // A wrong hash → server re-renders, detects the mismatch, refuses BEFORE send.
  const r = _asUser(_TEST_INDIA_EMAIL, function () {
    return emailFromCallNote(noteId, _CN_EMAIL_SELECTIONS, 'deadbeef_not_a_real_hash');
  });
  _assertFailure(r, 'changed', 'stale/mismatched hash must be rejected (INV-41)');
}

function test_cn_submitCallNote_doesNotStampEmailedAt() {
  _clearTestCallNotes();
  const r = _asUser(_TEST_INDIA_EMAIL, function () {
    return submitCallNote(_cnTestPayload());
  });
  _assertSuccess(r, 'submit should succeed');
  _assertEq(r.note.emailedAt, '', 'submit logs only — never sends/stamps an email (INV-33)');
}

// ── F4: Tag-taxonomy admin endpoints (rename / merge / archive, INV-82) ─────

function test_cn_normalizeTagForAdmin_rules() {
  _assertEq(normalizeTagForAdmin_('Foo Bar'),       'foo-bar',   'spaces→hyphen + lowercase');
  _assertEq(normalizeTagForAdmin_('  Good-Tag  '),  'good-tag',  'trim + lowercase');
  _assertEq(normalizeTagForAdmin_('--lead-trail--'),'lead-trail','strip leading/trailing hyphens');
  _assertEq(normalizeTagForAdmin_('a'),             '',          'too short → empty');
  _assertEq(normalizeTagForAdmin_(new Array(27).join('x')), '',  'too long (>24) → empty');
  _assertEq(normalizeTagForAdmin_(''),              '',          'empty → empty');
}

function test_cn_tagAdmin_nonManagerRejected() {
  const rn = _asUser(_TEST_INDIA_EMAIL, function () { return renameCallNoteTag('src-tag', 'dst-tag'); });
  _assertFailure(rn, 'Admin access', 'renameCallNoteTag is admin-gated');
  const mg = _asUser(_TEST_INDIA_EMAIL, function () { return mergeCallNoteTags('src-tag', 'dst-tag'); });
  _assertFailure(mg, 'Admin access', 'mergeCallNoteTags is admin-gated');
  const ar = _asUser(_TEST_INDIA_EMAIL, function () { return archiveCallNoteTag('src-tag', true); });
  _assertFailure(ar, 'Admin access', 'archiveCallNoteTag is admin-gated');
}

function test_cn_renameCallNoteTag_managerRewritesTag() {
  _clearTestCallNotes();
  // Globally-unique test tags so the cross-rep scan can't collide with any
  // real production note (rename only mutates notes that contain the source).
  const srcTag = 'testtag-rn-src-zzz';
  const dstTag = 'testtag-rn-dst-zzz';
  let created;
  _asUser(_TEST_INDIA_EMAIL, function () {
    created = submitCallNote(_cnTestPayload({ tags: [srcTag] })).note;
  });
  _assertTrue(created.subformData && created.subformData.tags.indexOf(srcTag) >= 0,
    'submitted note carries the source tag');

  const r = _asUser(_TEST_MGR_EMAIL, function () {
    return renameCallNoteTag(srcTag, dstTag);
  });
  _assertSuccess(r, 'manager rename should succeed');
  _assertTrue(r.notesUpdated >= 1, 'at least the test note should be rewritten');

  // Re-read the note and confirm the tag actually changed on the rep's Sheet.
  const after = _asUser(_TEST_INDIA_EMAIL, function () {
    const notes = getMyCallNotes({ date: created.dateLocal }).notes;
    return notes.filter(function (n) { return n.noteId === created.noteId; })[0];
  });
  _assertNotNull(after, 'note should still exist after rename');
  _assertTrue(after.subformData.tags.indexOf(dstTag) >= 0, 'new tag present after rename');
  _assertTrue(after.subformData.tags.indexOf(srcTag) < 0, 'old tag removed after rename');
}

function test_cn_archiveCallNoteTag_roundTrip() {
  const tag = 'testtag-archive-zzz';
  // try/finally (T4): a mid-test assertion failure used to leave the test tag
  // archived in the production CN_ARCHIVED_TAGS property (cosmetic — it showed
  // in the Admin archivedOnlyTags list — but production state nonetheless).
  try {
    const r1 = _asUser(_TEST_MGR_EMAIL, function () { return archiveCallNoteTag(tag, true); });
    _assertSuccess(r1, 'archive should succeed');
    _assertTrue(!!getArchivedTagsSet_()[tag], 'tag flagged archived in Script Property');
    // Archive must NOT touch any note rows — only the property.
    const r2 = _asUser(_TEST_MGR_EMAIL, function () { return archiveCallNoteTag(tag, false); });
    _assertSuccess(r2, 'unarchive should succeed');
    _assertFalse(!!getArchivedTagsSet_()[tag], 'tag no longer archived after unarchive (cleanup)');
  } finally {
    try {
      const set = getArchivedTagsSet_();
      if (set[tag]) { delete set[tag]; setArchivedTagsSet_(set); }
    } catch (e) {}
  }
}

// ── F8: manager-gate coverage for the INV-31 / time-clock manager endpoints ──
// Every manager-gated endpoint must reject a non-manager caller BEFORE any side
// effect (INV-02). Each gate is the first statement, so calling these as a
// non-manager does no Sheet work / sends no mail / creates no export — safe to
// run on prod. Parameterized so a newly-added manager endpoint is cheap to pin.
function test_managerGates_rejectNonManager() {
  const D = _TEST_CDR_DATE; // a valid yyyy-MM-dd for the date-validating endpoints
  const cases = [
    ['managerSearchCallNotes',         function () { return managerSearchCallNotes('x', 'all', null, null); }],
    ['managerGetTrainingQueue',        function () { return managerGetTrainingQueue(null); }],
    ['managerGetReviewCandidates',     function () { return managerGetReviewCandidates(null); }],
    ['managerGetShiftStats',           function () { return managerGetShiftStats(D); }],
    ['managerGetUnresolvedActionCount',function () { return managerGetUnresolvedActionCount(); }],
    ['getEnrolledCallNotesReps',       function () { return getEnrolledCallNotesReps(); }],
    ['exportCallNotesRange',           function () { return exportCallNotesRange(D, D); }],
    ['setCallNoteTrainingReply',       function () { return setCallNoteTrainingReply(_TEST_INDIA_ID, 'no-such-note', 'r'); }],
    ['managerDeleteCallNote',          function () { return managerDeleteCallNote(_TEST_INDIA_ID, 'no-such-note'); }],
    ['getCallNotesTagTaxonomy',        function () { return getCallNotesTagTaxonomy(); }],
    ['getCallNotesTagTrends',          function () { return getCallNotesTagTrends(); }],
    ['kbGetReviewDue',                 function () { return kbGetReviewDue(); }],
    ['kbMarkReviewed',                 function () { return kbMarkReviewed('no-such-id'); }],
    ['kbGetContentRequests',           function () { return kbGetContentRequests(); }],
    ['kbResolveContentRequest',        function () { return kbResolveContentRequest('no-such-req', 'resolved'); }],
    ['kbGetRevisions',                 function () { return kbGetRevisions('no-such-id'); }],
    ['kbRevertItem',                   function () { return kbRevertItem('no-such-id', 'no-rev'); }],
    ['kbPublishItem',                  function () { return kbPublishItem('no-such-id'); }],
    ['kbGetSearchConfig',              function () { return kbGetSearchConfig(); }],
    ['kbSaveSearchConfig',             function () { return kbSaveSearchConfig([]); }],
    ['getCoveragePlan',                function () { return getCoveragePlan(D, D); }],
    ['getAdminConfig',                 function () { return getAdminConfig(); }],
    ['getRetentionConfig',             function () { return getRetentionConfig(); }],
    ['saveRetentionConfig',            function () { return saveRetentionConfig({ archiveDays: 30 }); }],
    ['getDeptRequestSla',              function () { return getDeptRequestSla(); }],
    ['saveDeptRequestSla',             function () { return saveDeptRequestSla({}); }],
    ['saveDepartmentEmails',           function () { return saveDepartmentEmails({ Sales: 'x@y.com' }); }],
    ['saveStateTaxRates',              function () { return saveStateTaxRates({ Texas: 0.05 }); }],
    ['saveUpdateSuggestions',          function () { return saveUpdateSuggestions({ Sales: ['x'] }); }],
    ['getTeamMetrics',                 function () { return getTeamMetrics(D); }],
    ['exportAdpRange',                 function () { return exportAdpRange(D, D); }],
    ['getManagerDashboard',            function () { return getManagerDashboard(); }],
    ['getEmployeesList',               function () { return getEmployeesList(); }],
    ['getEmployeeTimesheetForManager', function () { return getEmployeeTimesheetForManager(_TEST_INDIA_ID, D, D); }],
    ['getAutomationHealth',            function () { return getAutomationHealth(); }],
    ['getStorageHealth',               function () { return getStorageHealth(); }],
    ['getDeployReadiness',             function () { return getDeployReadiness(); }],
    ['getAdminSheetView',              function () { return getAdminSheetView('auditLog'); }],
    ['kbConvertDriveDoc',              function () { return kbConvertDriveDoc({ driveUrl: 'https://docs.google.com/document/d/x/edit' }); }],
    ['kbGetUsageStats',                function () { return kbGetUsageStats(); }],
    ['getCallNotesAuditLog',           function () { return getCallNotesAuditLog({}); }],
    ['getCallNoteAuditHistory',        function () { return getCallNoteAuditHistory('no-such-note'); }],
    // M10 — previously untested gates:
    ['saveEmailTemplates',             function () { return saveEmailTemplates([]); }],
    ['saveExternalLinks',              function () { return saveExternalLinks([]); }],
    ['getFeatureFlags',                function () { return getFeatureFlags(); }],
    ['saveFeatureFlags',               function () { return saveFeatureFlags({}); }],
    ['getCallNotesEnrollment',         function () { return getCallNotesEnrollment(); }],
    ['kbSaveItem',                     function () { return kbSaveItem({ title: 'gate-test', type: 'article', body: 'x' }); }],
    ['kbDeleteItem',                   function () { return kbDeleteItem('no-such-id'); }],
    ['kbUploadImage',                  function () { return kbUploadImage('data:image/png;base64,AAAA'); }],
    ['saveKbAiSettings',               function () { return saveKbAiSettings({ dailyCap: 3, model: 'claude-haiku-4-5' }); }],
    // Training & Employee Docs — T1 manager gates (spec §5).
    ['getTrainingDashboard',           function () { return getTrainingDashboard(); }],
    ['saveTrainingAssignment',         function () { return saveTrainingAssignment({ itemId: 'no-such-item', empIds: ['x'] }); }],
    ['revokeTrainingAssignment',       function () { return revokeTrainingAssignment('no-such-assign'); }],
    // T2 quiz gates.
    ['getQuizzes',                     function () { return getQuizzes(); }],
    ['saveQuiz',                       function () { return saveQuiz({ title: 'gate', passPct: 80, questions: [{ q: 'q', options: ['a', 'b'], correct: 0 }] }); }],
    ['deleteQuiz',                     function () { return deleteQuiz('no-such-quiz'); }],
    // T4 quiz analytics gate + main's Google-Forms quiz import gate.
    ['getQuizAnalytics',               function () { return getQuizAnalytics(); }],
    ['importQuizFromForm',             function () { return importQuizFromForm('https://docs.google.com/forms/d/x/edit'); }],
    // T3 Employee Docs gates (the gate fires BEFORE any HR_DOCS_SS_ID access,
    // so these run safely even where the property is unset).
    ['issueDoc',                       function () { return issueDoc({ empId: _TEST_INDIA_ID, docType: 'policy', title: 'gate', bodyMd: 'x' }); }],
    ['getDocsDashboard',               function () { return getDocsDashboard(); }],
    ['voidDoc',                        function () { return voidDoc('no-such-doc', ''); }],
    ['verifyDocSignature',             function () { return verifyDocSignature('no-such-doc'); }],
    // T3 v2 — release + templates (gate precedes any HR_DOCS_SS_ID access).
    ['releaseDoc',                     function () { return releaseDoc('no-such-doc'); }],
    ['getEmpDocTemplates',             function () { return getEmpDocTemplates(); }],
    ['saveEmpDocTemplate',             function () { return saveEmpDocTemplate({ name: 'gate', bodyMd: 'x' }); }],
    ['deleteEmpDocTemplate',           function () { return deleteEmpDocTemplate('no-such-tpl'); }],
    // Underscore-suffixed (not google.script.run-reachable) but editor-runnable;
    // pin the gate anyway.
    ['verifyFormSubmissionIntegrity_', function () { return verifyFormSubmissionIntegrity_('no-such-token'); }],
    // (Spanish Inbox endpoints are gated by canSeeSpanishInbox_ now — manager OR
    // SPANISH_INBOX_MEMBERS rep — not pure manager-only; asserted separately below.)
    // Punctuality report (manager Time Clock tab) — gate precedes any sheet read.
    ['getPunctualityReport',           function () { return getPunctualityReport(D, D); }],
    // Coaching (Training module) — the gate fires BEFORE any HR_DOCS_SS_ID
    // access, so these run safely even where the property is unset.
    ['createCoaching',                 function () { return createCoaching({ empId: _TEST_INDIA_ID, severity: 'minor', whatHappened: 'gate' }); }],
    ['getCoachingDashboard',           function () { return getCoachingDashboard(); }],
    ['voidCoaching',                   function () { return voidCoaching('no-such-coach', ''); }],
  ];
  // The Manage-module Admin tab's config/system endpoints are ADMIN-gated (a
  // non-admin caller — incl. this non-manager — gets 'Admin access required.').
  // Same identity source when ADMIN_EMAILS is unset (the test env): admin ==
  // manager, so the call still rejects, just with the admin message.
  const ADMIN_GATED = {
    getCallNotesTagTaxonomy: 1, getCallNotesTagTrends: 1, getAdminConfig: 1,
    getRetentionConfig: 1, saveRetentionConfig: 1, saveDepartmentEmails: 1,
    getDeptRequestSla: 1, saveDeptRequestSla: 1,
    saveStateTaxRates: 1, saveUpdateSuggestions: 1, getAutomationHealth: 1,
    getStorageHealth: 1, getDeployReadiness: 1, getAdminSheetView: 1,
    getCallNotesAuditLog: 1, getCallNoteAuditHistory: 1, saveEmailTemplates: 1,
    saveExternalLinks: 1, getFeatureFlags: 1, saveFeatureFlags: 1,
    getCallNotesEnrollment: 1, saveKbAiSettings: 1,
    // KB content authoring (Reference tool) — admin-gated uploads/edits.
    kbSaveItem: 1, kbDeleteItem: 1, kbUploadImage: 1, kbConvertDriveDoc: 1,
    // #4 — revision history + draft→publish (authoring-adjacent).
    kbGetRevisions: 1, kbRevertItem: 1, kbPublishItem: 1,
    // #8 — search-synonym config (authoring-adjacent).
    kbGetSearchConfig: 1, kbSaveSearchConfig: 1,
  };
  cases.forEach(function (c) {
    const r = _asUser(_TEST_INDIA_EMAIL, c[1]);
    _assertNotNull(r && r.error, c[0] + ' must return an error for a non-manager caller');
    const expect = ADMIN_GATED[c[0]] ? 'Admin access' : 'Manager access';
    _assertContains(r.error, expect, c[0] + (ADMIN_GATED[c[0]] ? ' must be admin-gated' : ' must be manager-gated (INV-02)'));
  });
  // getMetricsAmbient gates by silently returning no badge (not an {error}) —
  // assert it never leaks a badge / data to a non-manager.
  const amb = _asUser(_TEST_INDIA_EMAIL, function () { return getMetricsAmbient(); });
  _assertTrue(!amb || amb.badge == null, 'getMetricsAmbient must not leak a badge to a non-manager');
  // getDeptRequests is rep-callable (returns the caller's OWN requests) and only
  // ADDS the cross-rep manager aggregate for managers — assert a non-manager
  // never receives the manager-only fields (deptStats / allOpen).
  const dr = _asUser(_TEST_INDIA_EMAIL, function () { return getDeptRequests(); });
  _assertTrue(dr && dr.deptStats == null && dr.allOpen == null,
    'getDeptRequests must not leak deptStats/allOpen to a non-manager');
  // Spanish Inbox endpoints are gated by canSeeSpanishInbox_ (manager OR a
  // SPANISH_INBOX_MEMBERS rep). The test employee is NOT a member, so all five
  // must reject with the Spanish-access error (BEFORE any GmailApp access —
  // resolveSpanishThread additionally must not touch the store or AuditLog).
  [['getSpanishInboxStats', function () { return getSpanishInboxStats(30); }],
   ['getSpanishInboxPending', function () { return getSpanishInboxPending(30); }],
   ['getSpanishInboxResolved', function () { return getSpanishInboxResolved(30); }],
   ['getSpanishInboxThreadBody', function () { return getSpanishInboxThreadBody('x'); }],
   ['resolveSpanishThread', function () { return resolveSpanishThread('x'); }]]
    .forEach(function (c) {
      const r = _asUser(_TEST_INDIA_EMAIL, c[1]);
      _assertNotNull(r && r.error, c[0] + ' must error for a non-member rep');
      _assertContains(r.error, 'Spanish Inbox access', c[0] + ' must be Spanish-gated (INV-31 amendment)');
    });
}

// A5 — drFindOpenRequest_ is the re-send dedup lookup: a re-send of the same note
// to the same dept reuses the OPEN row's token instead of opening a second
// request. Self-cleaning: appends two probe rows to the DeptRequests tab and
// deletes exactly those rows in `finally` (DeptRequests is not swept by
// cleanupTestData). The probe noteId is TEST_-prefixed for identifiability.
function test_deptReq_resendDedupLookup() {
  const sh = getOrCreateDeptRequestsSheet_();
  const before = sh.getLastRow();
  const nid = 'TEST_DR_NOTE_A5';
  try {
    // An OPEN (nid, 'Sales') row and a RESOLVED (nid, 'Shipping') row.
    sh.appendRow(['TEST_DR_OPEN', _TEST_INDIA_ID, 'T', 't@x.com', 'Sales', 'x.com',
      drNowTs_(), 'open', '', '', 'lbl', nid]);
    sh.appendRow(['TEST_DR_RES', _TEST_INDIA_ID, 'T', 't@x.com', 'Shipping', 'x.com',
      drNowTs_(), 'resolved', drNowTs_(), 'r@x.com', 'lbl', nid]);
    SpreadsheetApp.flush();
    _assertEq(drFindOpenRequest_(nid, 'Sales'), 'TEST_DR_OPEN',
      'reuses the OPEN (note, dept) row');
    _assertEq(drFindOpenRequest_(nid, 'Marketing'), null,
      'a different dept opens a NEW request (no reuse)');
    _assertEq(drFindOpenRequest_(nid, 'Shipping'), null,
      'a RESOLVED row is never reused');
    _assertEq(drFindOpenRequest_('', 'Sales'), null,
      'no noteId → null (legacy rows never dedupe)');
  } finally {
    const after = sh.getLastRow();
    if (after > before) sh.deleteRows(before + 1, after - before);
  }
}

// DeptRequests v2 — the Incoming inbox + a receiving-dept MEMBER can resolve an
// open request in-app (not just the sender/manager). Temporarily makes the India
// test emp a member of a real department (roster column N), then restores it.
function test_deptReq_incomingAndMemberResolve() {
  const deptKeys = Object.keys(getDepartmentEmails_() || {});
  if (!deptKeys.length) { _skipTest('no departments configured'); }
  const dept = deptKeys[0];
  const ss = getAdpSS_().getSheetByName(CONFIG.EMPLOYEE_TAB);
  const roster = ss.getDataRange().getValues();
  let empRow = -1;
  for (let i = 1; i < roster.length; i++) {
    if (String(roster[i][EMP.ID]).trim() === _TEST_INDIA_ID) { empRow = i + 1; break; }
  }
  if (empRow < 0) { _skipTest('India test emp not on roster'); }
  const prevDept = ss.getRange(empRow, EMP.DEPARTMENTS + 1).getValue();
  const sh = getOrCreateDeptRequestsSheet_();
  const before = sh.getLastRow();
  try {
    ss.getRange(empRow, EMP.DEPARTMENTS + 1).setValue(dept);
    invalidateRosterCache_();
    sh.appendRow(['TEST_DR_INC', 'TEST_OTHER_SENDER', 'Other', 'o@x.com', dept, 'x.com',
      drNowTs_(), 'open', '', '', 'incoming-test', 'TEST_DR_NOTE_INC']);
    SpreadsheetApp.flush();
    let res; _asUser(_TEST_INDIA_EMAIL, function () { res = getDeptRequests(); });
    _assertTrue(res && Array.isArray(res.incoming), 'incoming array present');
    _assertTrue(res.incoming.some(function (it) { return it.requestId === 'TEST_DR_INC'; }),
      'the open request to my dept appears in Incoming');
    let rr; _asUser(_TEST_INDIA_EMAIL, function () { rr = resolveDeptRequest('TEST_DR_INC'); });
    _assertEq(rr.success, true, 'a receiving-dept member can resolve an incoming request');
  } finally {
    ss.getRange(empRow, EMP.DEPARTMENTS + 1).setValue(prevDept);
    invalidateRosterCache_();
    const after = sh.getLastRow();
    if (after > before) sh.deleteRows(before + 1, after - before);
  }
}

// Phase 3 — kbUploadImage validation: malformed / non-image payloads are
// rejected BEFORE any Drive write (no folder is provisioned, no file created),
// so this is safe to run against production as the test manager.
function test_kb_uploadImage_rejectsInvalidPayloads() {
  _asUser(_TEST_MGR_EMAIL, function () {
    const r1 = kbUploadImage('not a data url');
    _assertEq(r1.success, false, 'non-data-URL rejected');
    _assertContains(r1.error, 'PNG/JPEG', 'names the accepted types');
    const r2 = kbUploadImage('data:text/html;base64,PHNjcmlwdD4=');
    _assertEq(r2.success, false, 'non-image content type rejected');
    const r3 = kbUploadImage('data:image/svg+xml;base64,AAAA');
    _assertEq(r3.success, false, 'SVG rejected (script-capable format, not on the whitelist)');
    const big = 'data:image/png;base64,' + new Array(4 * 1024 * 1024 + 2).join('A');
    const r4 = kbUploadImage(big);
    _assertEq(r4.success, false, 'over-cap payload rejected');
    _assertContains(r4.error, 'too large');
  });
}

// ── Turn A (INV-147 / INV-140): KB draft lifecycle + revisions ─────────────
// A draft is invisible to reps across tree/item/search; publishedOnly hides
// drafts even from admins (the org-wide-cached AI retrieval path, M-12);
// drafts are unassignable as training and unlinkable from quizzes; an edit
// snapshots a revision and a revert restores content (and is itself
// snapshotted, so reverts are reversible).
function test_kb_draftLifecycleAndRevisions() {
  let kbId = null;
  try {
    // 1) Create as DRAFT (admin == manager while ADMIN_EMAILS is unset).
    const saved = _asUser(_TEST_MGR_EMAIL, function () {
      return kbSaveItem({ title: 'TEST_DRAFT_ITEM', type: 'article',
        body: 'draft body TESTDRAFTTOKEN v1', department: 'TEST', status: 'draft' });
    });
    _assertTrue(saved && saved.success, 'draft created');
    _assertEq(saved.status, 'draft', 'save reports draft status');
    kbId = saved.id;

    // 2) Rep-invisible across every read path (INV-140).
    const tree = _asUser(_TEST_INDIA_EMAIL, function () { return getReferenceTree(); });
    _assertFalse(JSON.stringify(tree).indexOf(kbId) >= 0, 'draft absent from the rep tree');
    const item = _asUser(_TEST_INDIA_EMAIL, function () { return getReferenceItem(kbId); });
    _assertTrue(!!(item && item.error), 'draft 404s for a rep (existence does not leak)');
    const repSearch = _asUser(_TEST_INDIA_EMAIL, function () { return searchReference('TESTDRAFTTOKEN'); });
    _assertFalse((repSearch.results || []).some(function (r) { return r.id === kbId; }),
      'draft absent from rep search');

    // 3) publishedOnly narrows even an ADMIN caller (the AI retrieval path).
    const adminPub = _asUser(_TEST_MGR_EMAIL, function () {
      return searchReference('TESTDRAFTTOKEN', { publishedOnly: true });
    });
    _assertFalse((adminPub.results || []).some(function (r) { return r.id === kbId; }),
      'publishedOnly hides drafts even for admins');
    const adminAll = _asUser(_TEST_MGR_EMAIL, function () { return searchReference('TESTDRAFTTOKEN'); });
    _assertTrue((adminAll.results || []).some(function (r) { return r.id === kbId; }),
      'plain admin search still sees the draft');

    // 4) Draft is unassignable as training + unlinkable from a quiz.
    const asg = _asUser(_TEST_MGR_EMAIL, function () {
      return saveTrainingAssignment({ itemId: kbId, empIds: [_TEST_INDIA_ID] });
    });
    _assertFailure(asg, 'draft', 'draft KB item rejected by saveTrainingAssignment');
    const qz = _asUser(_TEST_MGR_EMAIL, function () {
      return saveQuiz({ title: 'TEST_DRAFT_QUIZ', passPct: 80, kbItemId: kbId,
        questions: [{ q: 'q', options: ['a', 'b'], correct: 0 }] });
    });
    _assertFailure(qz, 'draft', 'draft KB item rejected as a quiz link');

    // 5) A plain re-save (no explicit status) PRESERVES draft — an edit must
    // not silently publish (the M-13 class).
    const edit1 = _asUser(_TEST_MGR_EMAIL, function () {
      return kbSaveItem({ id: kbId, title: 'TEST_DRAFT_ITEM', type: 'article',
        body: 'draft body TESTDRAFTTOKEN v2', department: 'TEST' });
    });
    _assertTrue(edit1 && edit1.success, 'edited');
    _assertEq(edit1.status, 'draft', 'plain re-save preserves draft status');

    // 6) Publish -> rep-visible.
    const pub = _asUser(_TEST_MGR_EMAIL, function () { return kbPublishItem(kbId); });
    _assertTrue(pub && pub.success, 'published');
    const item2 = _asUser(_TEST_INDIA_EMAIL, function () { return getReferenceItem(kbId); });
    _assertTrue(item2 && !item2.error, 'published item readable by a rep');
    _assertTrue(String(item2.bodyMd || '').indexOf('v2') >= 0, 'rep reads the edited body');

    // 7) Revisions: the edit snapshotted v1; revert restores v1 content and is
    // itself reversible (the revert snapshots v2 first).
    const revs = _asUser(_TEST_MGR_EMAIL, function () { return kbGetRevisions(kbId); });
    _assertTrue(revs && (revs.items || []).length >= 1, 'edit snapshotted at least one revision');
    const v1rev = (revs.items || []).filter(function (r) { return r.preview.indexOf('v1') >= 0; })[0];
    _assertNotNull(v1rev, 'v1 snapshot findable');
    const rvt = _asUser(_TEST_MGR_EMAIL, function () { return kbRevertItem(kbId, v1rev.revId); });
    _assertTrue(rvt && rvt.success, 'reverted to v1');
    const after = _asUser(_TEST_MGR_EMAIL, function () { return getReferenceItem(kbId); });
    _assertTrue(String(after.bodyMd || '').indexOf('v1') >= 0, 'revert restored v1 content');
    const revs2 = _asUser(_TEST_MGR_EMAIL, function () { return kbGetRevisions(kbId); });
    const hasV2Snap = (revs2.items || []).some(function (r) { return r.preview.indexOf('v2') >= 0; });
    _assertTrue(hasV2Snap, 'revert snapshotted the replaced v2 content (reverts are reversible)');
    _assertEq(String(after.status || 'published'), 'published', 'revert never changes status');
  } finally {
    if (kbId) {
      _asUser(_TEST_MGR_EMAIL, function () { try { kbDeleteItem(kbId); } catch (e) {} });
    }
  }
}

// ── Turn A (INV-144 / M-10): admins are a SUBSET of managers — ENFORCED ────
// A non-manager listed in ADMIN_EMAILS must NOT gain admin access, and a
// manager NOT in a set ADMIN_EMAILS loses it (the property NARROWS).
function test_adminEmails_subsetOfManagersEnforced() {
  const props = PropertiesService.getScriptProperties();
  const prev = props.getProperty('ADMIN_EMAILS');
  try {
    // List ONLY the non-manager India rep.
    props.setProperty('ADMIN_EMAILS', _TEST_INDIA_EMAIL);
    invalidateRosterCache_();
    _assertFalse(empIsAdmin_(_TEST_INDIA_EMAIL, false),
      'non-manager in ADMIN_EMAILS is NOT an admin (subset enforced)');
    _assertFalse(empIsAdmin_(_TEST_MGR_EMAIL, true),
      'manager NOT in a set ADMIN_EMAILS loses admin (property narrows)');
    // getAdminConfig rejects with the {error} shape (no success:false field) —
    // assert the omnibus gate test's way, not _assertFailure (which demands
    // success === false and failed on the CORRECTLY-rejecting response).
    const asRep = _asUser(_TEST_INDIA_EMAIL, function () { return getAdminConfig(); });
    _assertNotNull(asRep && asRep.error, 'admin endpoint returns an error for the listed non-manager');
    _assertContains(asRep.error, 'Admin access', 'admin endpoint rejects the listed non-manager');
    // Manager listed -> admin again.
    props.setProperty('ADMIN_EMAILS', _TEST_MGR_EMAIL);
    _assertTrue(empIsAdmin_(_TEST_MGR_EMAIL, true), 'listed manager is an admin');
  } finally {
    if (prev === null) props.deleteProperty('ADMIN_EMAILS');
    else props.setProperty('ADMIN_EMAILS', prev);
    invalidateRosterCache_();
  }
}


// kbRecordView is rep-callable (append-only KbViews row) but must reject an
// unregistered caller BEFORE touching the KB spreadsheet.
function test_kb_recordView_requiresEmployee() {
  const r = _asUser('not-a-registered-user@example.invalid', function () {
    return kbRecordView('some-item', 'drawer:callNotes');
  });
  _assertFailure(r, 'Not authorized', 'unregistered caller rejected before any KbViews write');
}

// Self-improving-KB loop (#1 content requests, #2 rep freshness): the rep-facing
// writers require an enrolled employee (before any sheet touch), and kbFlagItem
// validates the feedback kind before appending. The manager-gates are covered in
// test_managerGates_rejectNonManager; the full backfill flow is exercised manually
// (no KB fixture in the automated suite).
function test_kb_feedbackAndRequests_requireEmployee() {
  const r1 = _asUser('not-a-registered-user@example.invalid', function () {
    return kbFlagItem('some-item', 'stale', 'note');
  });
  _assertFailure(r1, 'Not authorized', 'kbFlagItem rejects unregistered caller before any write');
  const r2 = _asUser('not-a-registered-user@example.invalid', function () {
    return kbRequestArticle('a topic', '', '');
  });
  _assertFailure(r2, 'Not authorized', 'kbRequestArticle rejects unregistered caller before any write');
  // Unknown feedback kind rejected (as an enrolled rep) before any append.
  const r3 = _asUser(_TEST_INDIA_EMAIL, function () { return kbFlagItem('some-item', 'banana', ''); });
  _assertEq(r3.success, false, 'unknown feedback kind rejected before any KbFeedback write');
  // Empty topic rejected before any KbContentRequests write.
  const r4 = _asUser(_TEST_INDIA_EMAIL, function () { return kbRequestArticle('   ', '', ''); });
  _assertEq(r4.success, false, 'empty topic rejected before any write');
  // #7 — kbGetRelated is rep-callable but requires a registered employee.
  const r5 = _asUser('not-a-registered-user@example.invalid', function () { return kbGetRelated('some-item'); });
  _assertContains((r5 && r5.error) || '', 'Not authorized', 'kbGetRelated requires an employee');
}

// KB AI Phase A — kbGetFacetGuidance auth + flag gate + saveKbAiSettings
// validation. No vendor key is configured in tests, and the flag is forced
// OFF for the gate case, so no UrlFetchApp call can ever fire from here.
function test_kbAi_gatesAndSettingsValidation() {
  // Unregistered caller → hard auth error (before any flag/vocab work).
  const rAuth = _asUser('not-a-registered-user@example.invalid', function () {
    return kbGetFacetGuidance({ flagType: 'action' });
  });
  _assertNotNull(rAuth && rAuth.error, 'unregistered caller rejected');
  _assertContains(rAuth.error, 'Not authorized', 'auth precedes the flag gate');

  // Flag off (the shipped default) → { none, reason: disabled } — and never
  // an exception, matching the drawer's best-effort posture.
  _withFeatureFlags_({ kbAiGuidance: false }, function () {
    const r = _asUser(_TEST_INDIA_EMAIL, function () {
      return kbGetFacetGuidance({ flagType: 'action', tags: ['anything'] });
    });
    _assertEq(r.none, true, 'flag-off returns none, not an error');
    _assertEq(r.reason, 'disabled');
  });

  // Flag on but no meaningful facets → none/no-facets (dept alone is too
  // thin); novel facet values are dropped by the whitelist, so a payload of
  // pure free text degrades to the same no-facets none — nothing proceeds
  // toward retrieval or the vendor.
  _withFeatureFlags_({ kbAiGuidance: true }, function () {
    const r = _asUser(_TEST_INDIA_EMAIL, function () {
      return kbGetFacetGuidance({ department: 'NotARealDept', updateType: 'PATIENT JOHN DOE TRX-9', flagType: 'banana', tags: ['brand-new-tag'] });
    });
    _assertEq(r.none, true, 'whitelist drops every novel value → no-facets none');
    _assertEq(r.reason, 'no-facets');
  });

  // saveKbAiSettings validation (as manager): cap range + model whitelist.
  _asUser(_TEST_MGR_EMAIL, function () {
    const bad1 = saveKbAiSettings({ dailyCap: 'lots', model: 'claude-haiku-4-5' });
    _assertEq(bad1.success, false, 'non-numeric cap rejected');
    const bad2 = saveKbAiSettings({ dailyCap: 500, model: 'claude-haiku-4-5' });
    _assertEq(bad2.success, false, 'cap above 100 rejected');
    const bad3 = saveKbAiSettings({ dailyCap: 3, model: 'gpt-totally-unknown' });
    _assertEq(bad3.success, false, 'unknown model rejected');
    _assertContains(bad3.error, 'Unknown model');
  });
  // NOTE: the success path writes Script Properties KB_AI_DAILY_CAP /
  // KB_AI_MODEL — exercised manually (S66) to avoid mutating operator
  // settings from a test run.
}

// ── Training & Employee Docs — T1 lifecycle (spec: docs/training-employee-docs-spec.md) ──
// Assign → rep sees pending → complete → done; RE-ASSIGN resets to pending
// (the §3a re-certification rule); revoke removes it from the checklist.
// Fixture: a throwaway KB article (created/deleted via the manager-gated KB
// endpoints); training rows referencing it are deleted in the finally.
function _cleanupTrainingRowsForItem_(itemId) {
  [TRAIN_ASSIGN_TAB, TRAIN_COMPLETE_TAB, TRAIN_ATTEMPT_TAB].forEach(function (tabName) {
    try {
      const sheet = getKbSS_().getSheetByName(tabName);
      if (!sheet) return;
      const last = sheet.getLastRow();
      if (last < 2) return;
      const idCol = tabName === TRAIN_ASSIGN_TAB ? TA.ITEM_ID
        : tabName === TRAIN_ATTEMPT_TAB ? TQA.QUIZ_ID : TCMP.ITEM_ID;
      const data = sheet.getRange(2, 1, last - 1, idCol + 1).getValues();
      for (let i = data.length - 1; i >= 0; i--) {
        if (String(data[i][idCol]).trim() === itemId) sheet.deleteRow(i + 2);
      }
    } catch (e) { Logger.log('training cleanup (' + tabName + ') failed: ' + e.message); }
  });
}

function test_training_assignCompleteFlow() {
  let kbId = null;
  try {
    // Fixture KB article (manager-gated create — also exercises the content link).
    const saved = _asUser(_TEST_MGR_EMAIL, function () {
      return kbSaveItem({ title: 'TEST_TRAINING_ITEM', type: 'article', body: 'training fixture body', department: 'TEST' });
    });
    _assertTrue(saved && saved.success, 'fixture KB article created');
    kbId = saved.id;

    // Assign to the India test rep with a future due date.
    const due = fmtDate_(new Date(Date.now() + 7 * 86400000));
    const asg = _asUser(_TEST_MGR_EMAIL, function () {
      return saveTrainingAssignment({ itemId: kbId, empIds: [_TEST_INDIA_ID], dueDate: due });
    });
    _assertTrue(asg && asg.success, 'assignment saved');
    _assertEq(asg.assigned, 1, 'one employee assigned');

    // Unknown item / empty targets are rejected.
    const badItem = _asUser(_TEST_MGR_EMAIL, function () {
      return saveTrainingAssignment({ itemId: 'no-such-item', empIds: [_TEST_INDIA_ID] });
    });
    _assertFailure(badItem, 'no longer exists', 'unknown KB item rejected');
    const badEmps = _asUser(_TEST_MGR_EMAIL, function () {
      return saveTrainingAssignment({ itemId: kbId, empIds: ['NOT_A_ROSTER_ID'] });
    });
    _assertFailure(badEmps, 'at least one employee', 'invalid roster ids rejected');

    // Rep checklist: pending, with the due date.
    let mine = _asUser(_TEST_INDIA_EMAIL, function () { return getMyTraining(); });
    let item = (mine.items || []).filter(function (i) { return i.itemId === kbId; })[0];
    _assertNotNull(item, 'rep sees the assigned item');
    _assertEq(item.status, 'pending', 'starts pending');
    _assertEq(item.dueDate, due, 'due date round-trips');

    // A rep can't complete an item that isn't assigned to them.
    const notMine = _asUser(_TEST_PH_EMAIL, function () { return markTrainingComplete(kbId); });
    _assertFailure(notMine, 'not assigned', 'completion requires a live assignment (caller-scoped)');

    // Complete it (1.1s later — completedAt must be strictly after assignedAt
    // at the tabs' second resolution).
    Utilities.sleep(1100);
    const done = _asUser(_TEST_INDIA_EMAIL, function () { return markTrainingComplete(kbId); });
    _assertTrue(done && done.success, 'marked complete');
    const again = _asUser(_TEST_INDIA_EMAIL, function () { return markTrainingComplete(kbId); });
    _assertTrue(again && again.success && again.alreadyComplete, 'second complete is idempotent');

    mine = _asUser(_TEST_INDIA_EMAIL, function () { return getMyTraining(); });
    item = (mine.items || []).filter(function (i) { return i.itemId === kbId; })[0];
    _assertEq(item && item.status, 'done', 'checklist shows done');

    // Manager dashboard reflects it.
    const dash = _asUser(_TEST_MGR_EMAIL, function () { return getTrainingDashboard(); });
    const dItem = (dash.items || []).filter(function (i) { return i.itemId === kbId; })[0];
    _assertNotNull(dItem, 'dashboard lists the item');
    _assertTrue(dItem.done >= 1, 'dashboard counts the completion');

    // RE-ASSIGN resets: a newer assignedAt requires a fresh completion (§3a).
    Utilities.sleep(1100);
    const re = _asUser(_TEST_MGR_EMAIL, function () {
      return saveTrainingAssignment({ itemId: kbId, empIds: [_TEST_INDIA_ID], dueDate: '' });
    });
    _assertTrue(re && re.success, 're-assigned');
    mine = _asUser(_TEST_INDIA_EMAIL, function () { return getMyTraining(); });
    item = (mine.items || []).filter(function (i) { return i.itemId === kbId; })[0];
    _assertEq(item && item.status, 'pending', 're-assignment resets completion');

    // Revoke every active row for the item → gone from the checklist.
    const dash2 = _asUser(_TEST_MGR_EMAIL, function () { return getTrainingDashboard(); });
    (dash2.assignments || []).filter(function (a) { return a.itemId === kbId; }).forEach(function (a) {
      const rv = _asUser(_TEST_MGR_EMAIL, function () { return revokeTrainingAssignment(a.assignId); });
      _assertTrue(rv && rv.success, 'revoked ' + a.assignId);
    });
    mine = _asUser(_TEST_INDIA_EMAIL, function () { return getMyTraining(); });
    item = (mine.items || []).filter(function (i) { return i.itemId === kbId; })[0];
    _assertTrue(!item, 'revoked item leaves the checklist');
  } finally {
    if (kbId) {
      _cleanupTrainingRowsForItem_(kbId);
      _asUser(_TEST_MGR_EMAIL, function () { return kbDeleteItem(kbId); });
    }
  }
}

// T2 — quiz lifecycle: author → assign → stripped fetch → fail → pass →
// completion + attempt counts; the answer key never reaches a rep response.
function test_training_quizFlow() {
  let quizId = null;
  try {
    // Author (manager). passPct 100 → both questions must be right to pass.
    const def = { title: 'TEST_TRAINING_QUIZ', passPct: 100, questions: [
      { q: 'Pick B', options: ['A', 'B'], correct: 1 },
      { q: 'Pick X', options: ['X', 'Y', 'Z'], correct: 0 },
    ] };
    const saved = _asUser(_TEST_MGR_EMAIL, function () { return saveQuiz(def); });
    _assertTrue(saved && saved.success, 'quiz saved');
    quizId = saved.quizId;

    // Invalid defs rejected by the pure validator.
    const bad = _asUser(_TEST_MGR_EMAIL, function () {
      return saveQuiz({ title: 'x', passPct: 80, questions: [{ q: 'q', options: ['only-one'], correct: 0 }] });
    });
    _assertFailure(bad, 'options', 'one-option question rejected');

    // Assign the quiz to the India rep.
    const asg = _asUser(_TEST_MGR_EMAIL, function () {
      return saveTrainingAssignment({ itemType: 'quiz', itemId: quizId, empIds: [_TEST_INDIA_ID], dueDate: '' });
    });
    _assertTrue(asg && asg.success, 'quiz assigned');

    // Unassigned rep can't fetch or submit.
    const phGet = _asUser(_TEST_PH_EMAIL, function () { return getQuiz(quizId); });
    _assertNotNull(phGet && phGet.error, 'unassigned rep cannot fetch the quiz');
    const phSub = _asUser(_TEST_PH_EMAIL, function () { return submitQuizAttempt(quizId, [1, 0]); });
    _assertFailure(phSub, 'not assigned', 'unassigned rep cannot submit an attempt');

    // Assigned rep fetch: stripped — the serialized response NEVER carries
    // the answer key (INV: keys never leave the server).
    const got = _asUser(_TEST_INDIA_EMAIL, function () { return getQuiz(quizId); });
    _assertTrue(!got.error, 'assigned rep can fetch the quiz');
    _assertEq(got.questions.length, 2, 'questions present');
    _assertTrue(JSON.stringify(got).indexOf('correct') < 0, 'no correct key anywhere in the rep payload');

    // markTrainingComplete must NOT work on a quiz item.
    const mc = _asUser(_TEST_INDIA_EMAIL, function () { return markTrainingComplete(quizId); });
    _assertFailure(mc, 'quiz', 'quiz items complete only via a passing attempt');

    // Fail (one wrong), strictly after assignedAt at second resolution.
    Utilities.sleep(1100);
    const fail = _asUser(_TEST_INDIA_EMAIL, function () { return submitQuizAttempt(quizId, [1, 2]); });
    _assertTrue(fail && fail.success, 'failing attempt accepted');
    _assertEq(fail.passed, false, '50% < 100% does not pass');
    _assertEq(fail.scorePct, 50, 'score graded server-side');
    _assertEq(fail.attempt, 1, 'attempt counter = 1');
    _assertTrue(JSON.stringify(fail).indexOf('correct') < 0, 'graded response carries no answer key');

    let mine = _asUser(_TEST_INDIA_EMAIL, function () { return getMyTraining(); });
    let item = (mine.items || []).filter(function (i) { return i.itemId === quizId; })[0];
    _assertNotNull(item, 'quiz item on the checklist');
    _assertEq(item.status, 'pending', 'still pending after a fail');
    _assertEq(item.quiz.attempts, 1, 'checklist shows the attempt count');

    // Pass.
    const pass = _asUser(_TEST_INDIA_EMAIL, function () { return submitQuizAttempt(quizId, [1, 0]); });
    _assertTrue(pass && pass.success && pass.passed, 'passing attempt');
    _assertEq(pass.attempt, 2, 'attempt counter = 2');
    mine = _asUser(_TEST_INDIA_EMAIL, function () { return getMyTraining(); });
    item = (mine.items || []).filter(function (i) { return i.itemId === quizId; })[0];
    _assertEq(item && item.status, 'done', 'pass completes the item');

    // A second pass appends an attempt but NOT a second completion row.
    const pass2 = _asUser(_TEST_INDIA_EMAIL, function () { return submitQuizAttempt(quizId, [1, 0]); });
    _assertTrue(pass2 && pass2.success && pass2.passed, 'retake after pass allowed');
    const compSheet = getKbSS_().getSheetByName(TRAIN_COMPLETE_TAB);
    let compCount = 0;
    if (compSheet && compSheet.getLastRow() >= 2) {
      compSheet.getRange(2, 1, compSheet.getLastRow() - 1, TRAIN_COMPLETE_HEADERS.length).getValues()
        .forEach(function (r) { if (String(r[TCMP.ITEM_ID]).trim() === quizId) compCount++; });
    }
    _assertEq(compCount, 1, 'exactly one completion row per assignment round');

    // Dashboard: quiz item present with done + attempts surfaced.
    const dash = _asUser(_TEST_MGR_EMAIL, function () { return getTrainingDashboard(); });
    const dItem = (dash.items || []).filter(function (i) { return i.itemId === quizId; })[0];
    _assertNotNull(dItem, 'dashboard lists the quiz');
    _assertTrue(dItem.done >= 1, 'dashboard counts the pass');
    const dRep = (dash.reps || []).filter(function (r) { return r.id === _TEST_INDIA_ID; })[0];
    _assertNotNull(dRep, 'rep row present');
    _assertEq(dRep.attempts['quiz:' + quizId], 3, 'dashboard shows the attempt count');
  } finally {
    if (quizId) {
      _cleanupTrainingRowsForItem_(quizId);
      _asUser(_TEST_MGR_EMAIL, function () { return deleteQuiz(quizId); });
    }
  }
}

// T3 — Employee Docs fixture + lifecycle.
function _withTestHrDocs_(fn) {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('TEST_HRDOCS_SS_ID');
  let ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('TEST_HRDOCS_Fixture');
    props.setProperty('TEST_HRDOCS_SS_ID', ss.getId());
  }
  _TEST_OVERRIDE_HRDOCS_SS_ID = ss.getId();
  try { return fn(); }
  finally { _TEST_OVERRIDE_HRDOCS_SS_ID = null; }
}

function _cleanupEmpDocRows_(docId) {
  [[EMPDOC_TAB, ED.DOC_ID], [EMPDOC_SIG_TAB, EDS.DOC_ID]].forEach(function (pair) {
    try {
      const sheet = getHrDocsSS_().getSheetByName(pair[0]);
      if (!sheet || sheet.getLastRow() < 2) return;
      const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, pair[1] + 1).getValues();
      for (let i = data.length - 1; i >= 0; i--) {
        if (String(data[i][pair[1]]).trim() === docId) sheet.deleteRow(i + 2);
      }
    } catch (e) { Logger.log('empdocs cleanup (' + pair[0] + ') failed: ' + e.message); }
  });
}

// Issue → scoped reads → sign (owner-only, integrity-gated) → verify →
// tamper-detect → void. The §9.3 fail-closed team-scoping rule is asserted
// directly against empDocCanManagerSee_ (the test roster has no second
// manager to impersonate).
function test_empdocs_issueSignVerifyFlow() {
  _withTestHrDocs_(function () {
    let docId = null;
    try {
      // Invalid type rejected before any write.
      const badType = _asUser(_TEST_MGR_EMAIL, function () {
        return issueDoc({ empId: _TEST_INDIA_ID, docType: 'memo', title: 'T', bodyMd: 'b' });
      });
      _assertFailure(badType, 'Invalid document type', 'docType whitelist enforced');

      const due = fmtDate_(new Date(Date.now() + 7 * 86400000));
      const issued = _asUser(_TEST_MGR_EMAIL, function () {
        return issueDoc({ empId: _TEST_INDIA_ID, docType: 'policy', title: 'TEST_EMPDOC Policy', bodyMd: '# Policy\n\nRead this.', dueAt: due, requiresSignature: true });
      });
      _assertTrue(issued && issued.success, 'doc issued');
      docId = issued.docId;

      // Owner metadata list — no body in the payload.
      const mine = _asUser(_TEST_INDIA_EMAIL, function () { return getMyDocs(); });
      const meta = (mine.docs || []).filter(function (d) { return d.docId === docId; })[0];
      _assertNotNull(meta, 'owner sees the doc');
      _assertTrue(JSON.stringify(mine).indexOf('bodyMd') < 0, 'list payload is metadata-only');

      // Cross-rep read rejected; cross-rep sign rejected.
      const phRead = _asUser(_TEST_PH_EMAIL, function () { return getMyDoc(docId); });
      _assertNotNull(phRead && phRead.error, 'another rep cannot read the doc');
      const phSign = _asUser(_TEST_PH_EMAIL, function () { return acknowledgeDoc(docId, 'data:image/png;base64,AAAA'); });
      _assertNotNull(phSign && phSign.error, 'another rep cannot sign the doc');

      // §9.3 fail-closed: a manager who is neither issuer nor the roster
      // ManagerEmail sees NOTHING (column M is blank for the test rep).
      const stranger = { isManager: true, email: 'some-other-manager@example.invalid' };
      const doc = findEmpDocRow_(docId).doc;
      _assertEq(empDocCanManagerSee_(stranger, doc), false, 'non-issuer/non-listed manager is denied (fail-closed)');
      _assertEq(empDocCanManagerSee_({ isManager: true, email: doc.issuedBy }, doc), true, 'issuer is allowed');

      // Owner full read carries the body + ack text.
      const full = _asUser(_TEST_INDIA_EMAIL, function () { return getMyDoc(docId); });
      _assertTrue(!full.error && full.bodyMd.indexOf('Policy') >= 0, 'owner reads the frozen body');
      _assertNotNull(full.ackText, 'ack text present while unsigned');

      // Bad signature payload rejected; valid 1x1 PNG accepted.
      const badSig = _asUser(_TEST_INDIA_EMAIL, function () { return acknowledgeDoc(docId, 'not-a-data-url'); });
      _assertFailure(badSig, 'signature', 'non-PNG payload rejected');
      const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const signed = _asUser(_TEST_INDIA_EMAIL, function () { return acknowledgeDoc(docId, png); });
      _assertTrue(signed && signed.success, 'owner signs');
      const again = _asUser(_TEST_INDIA_EMAIL, function () { return acknowledgeDoc(docId, png); });
      // EmpDocs v2 (INV-135) generalized the double-submit guard message to
      // "Already completed." (a doc can now complete via fields without a
      // signature; the guard fires for status 'signed' OR 'completed').
      _assertFailure(again, 'Already completed', 'double-sign rejected');

      // Verify: both hashes match.
      let v = _asUser(_TEST_MGR_EMAIL, function () { return verifyDocSignature(docId); });
      _assertTrue(v.signed === true && v.match === true && v.contentMatch === true, 'integrity verified after sign');

      // Tamper with the frozen content → contentMatch flips false.
      const found = findEmpDocRow_(docId);
      getHrDocsSS_().getSheetByName(EMPDOC_TAB).getRange(found.rowIdx, ED.TITLE + 1).setValue('TAMPERED');
      v = _asUser(_TEST_MGR_EMAIL, function () { return verifyDocSignature(docId); });
      _assertEq(v.contentMatch, false, 'content tamper detected');

      // Void: kept on record, never deleted; signature row remains.
      const voided = _asUser(_TEST_MGR_EMAIL, function () { return voidDoc(docId, 'test void'); });
      _assertTrue(voided && voided.success, 'voided');
      const mine2 = _asUser(_TEST_INDIA_EMAIL, function () { return getMyDocs(); });
      const meta2 = (mine2.docs || []).filter(function (d) { return d.docId === docId; })[0];
      _assertEq(meta2 && meta2.status, 'void', 'owner sees void status');
      const v2 = _asUser(_TEST_MGR_EMAIL, function () { return verifyDocSignature(docId); });
      _assertTrue(v2.signed === true, 'signature record survives the void');

      // Dashboard (issuer-scoped) lists it.
      const dash = _asUser(_TEST_MGR_EMAIL, function () { return getDocsDashboard(); });
      _assertNotNull((dash.docs || []).filter(function (d) { return d.docId === docId; })[0], 'dashboard lists the doc for the issuer');
    } finally {
      if (docId) _cleanupEmpDocRows_(docId);
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  COMPLIANCE AUDIT PANEL — getCallNotesAuditLog / getCallNoteAuditHistory
//  (P7 — server-side integration for the S57 panel: filters, PHI-free rows,
//  lifecycle ordering. The non-manager gate lives in managerGates above.)
// ════════════════════════════════════════════════════════════════════════════

function test_auditPanel_searchAndHistory() {
  _clearTestCallNotes();
  var noteId = null;
  _asUser(_TEST_INDIA_EMAIL, function () {
    noteId = submitCallNote(_cnTestPayload({
      caller: 'Audit Panel Test',
      issue: 'compliance panel integration test',
    })).note.noteId;
  });
  _assertNotNull(noteId, 'test note created');
  try {
    // A second lifecycle event so history has ≥2 rows.
    _asUser(_TEST_INDIA_EMAIL, function () { return setCallNoteFlag(noteId, 'action'); });

    // ── Search: rep + action filters, default-start 30-day range ──────────
    // Explicit endDate two days out: audit rows are stamped in CONFIG.TIMEZONE
    // (IST) wall time, which can read as "tomorrow" relative to the manager's
    // tz during the US afternoon — an implicit today-end would flake then.
    const endFuzz = fmtDate_(new Date(Date.now() + 2 * 86400000));
    const res = _asUser(_TEST_MGR_EMAIL, function () {
      return getCallNotesAuditLog({ repId: _TEST_INDIA_ID, action: 'CallNoteCreate', endDate: endFuzz });
    });
    _assertNull(res.error, 'audit search should not error for a manager');
    _assertNotNull(res.range && res.range.start, 'default date range is reported back');
    var hit = null;
    res.rows.forEach(function (r) {
      _assertEq(r.action, 'CallNoteCreate', 'action filter applied to every returned row');
      _assertEq(r.repId, _TEST_INDIA_ID, 'rep filter applied to every returned row');
      if (r.noteId === noteId) hit = r;
    });
    _assertNotNull(hit, 'the created note surfaces in the audit search');
    // PHI-free contract (INV-92 / INV-32): the audit row carries the noteId,
    // never the note content.
    _assertFalse(String(hit.notes).indexOf('compliance panel integration test') >= 0,
      'audit row must be PHI-free — note content never enters the AuditLog');
    _assertFalse(String(hit.notes).indexOf('Audit Panel Test') >= 0,
      'audit row must not carry the caller name');
    // F(cycle-8): the compliance panel's "View note" deep-link hands
    // hit.dateLocal to managerGetCallNotes, whose ^\d{4}-\d{2}-\d{2}$ guard
    // rejects a raw Sheets-coerced PunchDate ("Wed Jul 15 2026 …"). Assert the
    // yyyy-MM-dd shape so a coercion regression at cnReadCallNoteAuditRows_
    // fails HERE instead of silently killing the drill-through (this row's
    // PunchDate is the rep-local dateLocal written at CallNoteCreate).
    _assertTrue(/^\d{4}-\d{2}-\d{2}$/.test(String(hit.dateLocal)),
      'audit row dateLocal is a yyyy-MM-dd string (drill-through deep-link contract)');

    // ── History: full lifecycle, oldest-first, independent of date filter ──
    const hist = _asUser(_TEST_MGR_EMAIL, function () {
      return getCallNoteAuditHistory(noteId);
    });
    _assertNull(hist.error, 'audit history should not error for a manager');
    _assertTrue(hist.rows.length >= 2, 'create + flag lifecycle rows present');
    _assertEq(hist.rows[0].action, 'CallNoteCreate', 'history is oldest-first (lifecycle order)');
    _assertEq(hist.truncated, false, 'create row captured → history is not truncated (L11)');
  } finally {
    if (noteId) _asUser(_TEST_INDIA_EMAIL, function () { try { return deleteCallNote(noteId); } catch (e) {} });
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  METRICS / CDR ENDPOINT INTEGRATION (uses the _setupTestCdrFixture_ sheet)
// ════════════════════════════════════════════════════════════════════════════

function test_metrics_getMyMetrics_cdrIntegration() {
  if (!_TEST_CDR_SS_ID) { _skipTest('CDR fixture unavailable'); }
  const r = _withTestCdr_(function () {
    return _asUser(_TEST_INDIA_EMAIL, function () { return getMyMetrics(_TEST_CDR_DATE); });
  });
  _assertNull(r.error, "getMyMetrics should not error with the CDR fixture present");
  _assertNotNull(r.cdr, "India agent has a CDR row for the fixture date");
  _assertEq(r.cdr.totalRung, 10, "totalRung from fixture");
  _assertEq(r.cdr.totalAnswered, 8, "totalAnswered from fixture");
  _assertEq(r.cdr.totalMissed, 2, "totalMissed from fixture");
  _assertEq(r.cdr.pctAnswered, 80, "pctAnswered = 8/10 = 80%");
  _assertEq(r.cdr.tttSeconds, 300, "tttSeconds parsed via getDisplayValues from the time-value fixture cell (INV-64)");
  // ATT = 0:02:30 (150s) — seconds matter, so a getValues() regression (which
  // would read a coerced Date and mis-parse it to 120s) flips this assertion.
  _assertEq(r.cdr.attSeconds, 150, "attSeconds parsed via getDisplayValues — guards the INV-64 getDisplayValues discipline");
  // No notes were filed on the sentinel date, but answered>0, so coverage is 0 (not null).
  _assertEq(r.noteCoverage, 0, "0 notes / 8 answered → 0% coverage");
}

function test_metrics_cdrFixture_durationsUseDisplayValues() {
  // F9: prove the fixture stores TTT/ATT as coerced TIME VALUES so the INV-64
  // getDisplayValues() discipline is load-bearing. If the cells were plain text
  // (as before), getValues()==getDisplayValues() and a getValues() regression
  // would silently pass the integration tests.
  if (!_TEST_CDR_SS_ID) { _skipTest('CDR fixture unavailable'); }
  const sheet = SpreadsheetApp.openById(_TEST_CDR_SS_ID).getSheetByName('DQE Historical Data');
  // Row 2 = India fixture row; ATT = "0:02:30" (150s) — seconds matter so the
  // raw-Date misparse (120s) is unambiguously wrong.
  const rawAtt  = sheet.getRange(2, CDR.ATT, 1, 1).getValues()[0][0];
  const dispAtt = sheet.getRange(2, CDR.ATT, 1, 1).getDisplayValues()[0][0];
  _assertTrue(rawAtt instanceof Date,
    "ATT fixture cell must coerce to a time value (Date via getValues) — else INV-64 is untested");
  _assertEq(cdrParseHms_(dispAtt), 150,
    "getDisplayValues() parses ATT to the correct seconds (the INV-64 path)");
  _assertTrue(cdrParseHms_(rawAtt) !== 150,
    "cdrParseHms_ on the raw getValues() Date does NOT yield 150 — proving getValues is the wrong path");
}

function test_metrics_csrTransferFixture_parsesDateAndPercent() {
  // T4 #6: the Transfer reader parses the M/D/YYYY Date + "%"-string columns
  // (the real sheet shapes) and honors the roster filter.
  if (!_TEST_CDR_SS_ID) { _skipTest('CDR fixture unavailable'); }
  _withTestCdr_(function () {
    const res = getCsrTransferPerRepDaily_(_TEST_CDR_DATE, _TEST_CDR_DATE, [_TEST_INDIA_NAME, _TEST_PH_NAME]);
    const day = res.perRepDaily[_TEST_CDR_DATE];
    _assertTrue(!!day, "transfer row's M/D/YYYY date parsed back to the ISO key");
    _assertEq(day[_TEST_INDIA_NAME].transferred, 14, "transferred count read");
    _assertEq(day[_TEST_INDIA_NAME].totalCalls, 47, "total calls read");
    _assertEq(day[_TEST_INDIA_NAME].transferPct, 29.79, "Transfer % string parsed to a number");
    const filtered = getCsrTransferPerRepDaily_(_TEST_CDR_DATE, _TEST_CDR_DATE, ['Nobody Here']);
    _assertTrue(!filtered.perRepDaily[_TEST_CDR_DATE], "roster filter drops non-matching reps");
  });
}

function test_metrics_getTeamMetrics_cdrIntegration() {
  if (!_TEST_CDR_SS_ID) { _skipTest('CDR fixture unavailable'); }
  const r = _withTestCdr_(function () {
    return _asUser(_TEST_MGR_EMAIL, function () { return getTeamMetrics(_TEST_CDR_DATE); });
  });
  _assertNull(r.error, "getTeamMetrics should not error with the CDR fixture present");
  // Only the two test agents have CDR rows in the fixture (queue sentinel excluded).
  _assertEq(r.teamTotals.rung, 15, "team rung = 10 + 5");
  _assertEq(r.teamTotals.answered, 13, "team answered = 8 + 5");
  let india = null;
  for (let i = 0; i < r.reps.length; i++) { if (r.reps[i].repName === _TEST_INDIA_NAME) india = r.reps[i]; }
  _assertNotNull(india, "India rep present in team metrics");
  _assertEq(india.totalRung, 10, "India totalRung");
  _assertEq(india.pctAnswered, 80, "India pctAnswered");
  // The A_Q_ queue sentinel must never surface as an unmatched agent.
  _assertFalse((r.unmatchedAgents || []).indexOf("A_Q_Sales") >= 0, "queue sentinel excluded from unmatchedAgents");
}

function test_metrics_getTeamMetrics_nonManagerRejected() {
  const r = _withTestCdr_(function () {
    return _asUser(_TEST_INDIA_EMAIL, function () { return getTeamMetrics(_TEST_CDR_DATE); });
  });
  _assertNotNull(r.error, "non-manager should be rejected");
  _assertContains(r.error, "Manager access required", "manager gate message");
}

function test_metrics_getMyMetrics_cdrUnavailableErrors() {
  // Point the reader at a bogus spreadsheet id → getCdrSS_ openById throws →
  // getMyMetrics returns an {error} the client renders as "No call data".
  const prev = _TEST_OVERRIDE_CDR_SS_ID;
  _TEST_OVERRIDE_CDR_SS_ID = "this-is-not-a-real-spreadsheet-id";
  _resetCdrCaches_();
  try {
    const r = _asUser(_TEST_INDIA_EMAIL, function () { return getMyMetrics(_TEST_CDR_DATE); });
    _assertNotNull(r.error, "unreachable CDR sheet should surface an error, not crash");
  } finally {
    _TEST_OVERRIDE_CDR_SS_ID = prev;
    _resetCdrCaches_();
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  INTAKE — PPD recommendation engine (pure; mirrors the Node harness branches)
// ════════════════════════════════════════════════════════════════════════════
// fixture Offerings rows: [features, hcpcs, weightCap, seatType, pdfLink, imageUrl]
var _INTAKE_TEST_CAT = [
  ['Std Captain', 'K0823', '350', 'C', 'pdf-823', 'img-823'],
  ['SPO solid',   'K0856', '350', 'S', 'pdf-856', 'img-856'],
  ['G3 solid',    'K0861', '350', 'S', 'pdf-861', 'img-861'],
  ['MPO solid',   'K0843', '450', 'S', 'pdf-843', 'img-843'],
  ['G3 wide',     'K0862', '600', 'S', 'pdf-862', 'img-862'],
];

function test_intake_engine_standardOnly() {
  var r = intakeFilterRecommendations_({ '38': '250 lbs' }, _INTAKE_TEST_CAT);
  _assertEq(r.standard.map(function (p) { return p.hcpcs; }).join(','), 'K0823');
  _assertEq(r.complex.length, 0, 'group-3/SPO/MPO require eligibility');
}
// Q39a dwelling restriction (operator rule 2026-07-09): Mobile Home + weight
// under 285 → K0821 only, and the HOME constraint wins over the clinical gates
// (a neuro patient still gets only K0821). ≥285 / House / no answer → standard
// logic. Mirrors the Node engine-contract tests.
function test_intake_engine_mobileHomeRestriction() {
  var cat = [['Std Captain 300', 'K0821', '300', 'C', 'pdf-821', 'img-821']].concat(_INTAKE_TEST_CAT);
  var r = intakeFilterRecommendations_({ '38': '250', '39a': 'Mobile Home' }, cat);
  _assertEq(r.standard.map(function (p) { return p.hcpcs; }).join(','), 'K0821', 'K0821 is the sole recommendation');
  _assertEq(r.complex.length, 0, 'no complex offerings under the home constraint');
  var rNeuro = intakeFilterRecommendations_({ '38': '250', '39a': 'Mobile Home', '43': 'multiple sclerosis' }, cat);
  _assertEq(rNeuro.standard.map(function (p) { return p.hcpcs; }).join(','), 'K0821', 'home constraint wins over the neuro upgrade');
  var heavy = intakeFilterRecommendations_({ '38': '290', '39a': 'Mobile Home' }, cat);
  _assertEq(heavy.standard.length, 2, '290 lbs (>=285) runs the standard logic');
  var house = intakeFilterRecommendations_({ '38': '250', '39a': 'House' }, cat);
  _assertEq(house.standard.length, 2, 'House runs the standard logic');
  var legacy = intakeFilterRecommendations_({ '38': '250' }, cat);
  _assertEq(legacy.standard.length, 2, 'no 39a answer (legacy submission) → unrestricted');
}
function test_intake_engine_neuroUpgradeAndSubs() {
  var r = intakeFilterRecommendations_({ '38': '250', '43': 'multiple sclerosis' }, _INTAKE_TEST_CAT);
  _assertEq(r.standard.length, 0, 'captain chair fails solid-seat requirement under neuro');
  _assertEq(r.complex.map(function (p) { return p.hcpcs; }).join(','), 'K0862,K0861', 'K0856→K0861, K0843→K0862, sorted desc');
}
function test_intake_engine_weightCap() {
  var r = intakeFilterRecommendations_({ '38': '500 lbs', '43': 'ALS' }, _INTAKE_TEST_CAT);
  var all = r.complex.concat(r.standard).map(function (p) { return p.hcpcs; });
  _assertTrue(all.indexOf('K0862') >= 0, '600-cap chair survives at 500 lbs');
  _assertTrue(all.indexOf('K0861') < 0, '350-cap chair excluded at 500 lbs');
}
function test_intake_engine_oxygenExcludesK0837() {
  var cat = [['SPO', 'K0837', '350', 'S', 'p', 'i']];
  var onOxy = intakeFilterRecommendations_({ '38': '250', '32': 'yes', '44': 'yes' }, cat);
  _assertEq(onOxy.complex.concat(onOxy.standard).length, 0, 'K0837 dropped when on oxygen');
}
function test_intake_engine_emptySafe() {
  var e = intakeFilterRecommendations_({}, []);
  _assertEq(e.standard.length + e.complex.length, 0);
}
function test_intake_buildPpdBody_escapesAnswers() {
  var rows = [{ qNum: '41', label: 'Diagnoses', value: '<img src=x onerror=alert(1)>' }];
  var html = intakeBuildPpdBodyHtml_('Jane <b>Doe</b>', rows, { standard: [], complex: [] }, null);
  _assertFalse(html.indexOf('<img src=x onerror') >= 0, 'raw answer markup must be escaped');
  _assertTrue(html.indexOf('&lt;img src=x') >= 0, 'answer is HTML-escaped');
}
function test_intake_emailDomain_extracted() {
  _assertEq(intakeEmailDomain_('agent@umsupply.com'), 'umsupply.com');
  _assertEq(intakeEmailDomain_('garbage'), '(none)');
}

function test_intake_resolveRecipient_customValidation() {
  // Pure branches — no roster read on the custom / missing paths.
  _assertThrows(function () { intakeResolveRecipient_('PMD', { kind: 'custom', email: 'not-an-email' }); },
    'Invalid recipient email', 'custom recipient must be a valid email');
  _assertThrows(function () { intakeResolveRecipient_('PMD', {}); },
    'No recipient selected', 'missing spec kind is rejected');
}

// ════════════════════════════════════════════════════════════════════════════
//  INTAKE — endpoint integration (uses the _setupTestIntakeFixture_ Offerings
//  sheet via _withTestIntake_; P9 + the P15 sent-submissions viewer)
// ════════════════════════════════════════════════════════════════════════════

function test_intake_previewPPD_returnsHashAndRecs() {
  if (!_TEST_INTAKE_SS_ID) { _skipTest('Intake fixture unavailable'); }
  const r = _withTestIntake_(function () {
    return _asUser(_TEST_INDIA_EMAIL, function () {
      return intakePreviewPPD({
        patientInfo: 'TEST Patient 12345',
        answers: { '38': '200 lbs' },
        rows: [{ qNum: '38', label: 'Weight', value: '200 lbs' }],
      });
    });
  });
  _assertSuccess(r, 'intakePreviewPPD should succeed for an enrolled rep');
  _assertTrue(/^[0-9a-f]{64}$/.test(String(r.bodyHash || '')), 'bodyHash is a 64-hex SHA-256 (INV-111)');
  _assertNotNull(r.recommendations, 'recommendations ride the preview');
  const std = (r.recommendations.standard || []).map(function (p) { return p.hcpcs; });
  _assertContains(std, 'K0823', 'fixture captain chair recommended at 200 lbs, no eligibility');
  _assertContains(r.subject, 'TEST Patient 12345', 'subject carries the patient label');
}

function test_intake_sendPPD_staleHashRejected() {
  if (!_TEST_INTAKE_SS_ID) { _skipTest('Intake fixture unavailable'); }
  // The hash check fires BEFORE recipient resolution / MailApp, so a stale
  // hash sends nothing and stores nothing (INV-111 / INV-41 pattern).
  const r = _withTestIntake_(function () {
    return _asUser(_TEST_INDIA_EMAIL, function () {
      return intakeSendPPD(
        { patientInfo: 'TEST Patient 12345', answers: { '38': '200 lbs' }, rows: [] },
        { kind: 'custom', email: 'do-not-send@example.invalid' },
        '0'.repeat(64)
      );
    });
  });
  _assertFailure(r, 'changed since you previewed', 'stale bodyHash must reject the send');
}

function test_intake_send_unauthorizedRejected() {
  // Auth check precedes the Offerings read, so no fixture is needed.
  const r = _asUser('not-a-registered-user@example.invalid', function () {
    return intakeSendPPD({ patientInfo: 'X' }, { kind: 'custom', email: 'x@example.invalid' }, '');
  });
  _assertFailure(r, 'Not authorized', 'unregistered caller is rejected before any work');
}

function test_intake_sentViewer_callerScopedAndManager() {
  if (!_TEST_INTAKE_SS_ID) { _skipTest('Intake fixture unavailable'); }
  _withTestIntake_(function () {
    // PPD submission row layout: [id, ts, repId, repName, patientInfo,
    // language, answersJSON, recommendations, selections, recipient]
    const sheet = getIntakeSubmissionSheet_('PPD');
    sheet.appendRow(['TESTSUB-1', '2026-01-01 10:00:00', _TEST_INDIA_ID, 'Test India User',
      'TEST Patient X', 'EN', '{"38":"200"}', '{}', '{}', 'recipient@example.invalid']);
    SpreadsheetApp.flush();
    try {
      const mine = _asUser(_TEST_INDIA_EMAIL, function () { return intakeListMySubmissions(); });
      _assertNull(mine.error, 'owner list should not error');
      _assertTrue(mine.submissions.some(function (s) { return s.submissionId === 'TESTSUB-1'; }),
        'owner sees their own submission in the list');

      const others = _asUser(_TEST_PH_EMAIL, function () { return intakeListMySubmissions(); });
      _assertNull(others.error, 'other rep list should not error');
      _assertFalse((others.submissions || []).some(function (s) { return s.submissionId === 'TESTSUB-1'; }),
        'another rep must NOT see the owner\'s submission (caller-scoped)');

      const det = _asUser(_TEST_INDIA_EMAIL, function () { return intakeGetSubmission('PPD', 'TESTSUB-1'); });
      _assertNull(det.error, 'owner detail should not error');
      _assertEq(det.answers['38'], '200', 'answers JSON round-trips in the detail');
      _assertEq(det.patientInfo, 'TEST Patient X', 'patientInfo round-trips');

      const denied = _asUser(_TEST_PH_EMAIL, function () { return intakeGetSubmission('PPD', 'TESTSUB-1'); });
      _assertNotNull(denied.error, 'another rep\'s detail request is rejected');
      _assertContains(denied.error, 'your own intake submissions', 'scoping error message');

      const mgr = _asUser(_TEST_MGR_EMAIL, function () { return intakeGetSubmission('PPD', 'TESTSUB-1'); });
      _assertNull(mgr.error, 'manager detail should not error');
      _assertEq(mgr.patientInfo, 'TEST Patient X', 'manager sees any rep\'s submission');
    } finally {
      const last = sheet.getLastRow();
      if (last >= 2) {
        const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
        for (let i = ids.length - 1; i >= 0; i--) {
          if (String(ids[i][0]).trim() === 'TESTSUB-1') sheet.deleteRow(i + 2);
        }
      }
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  FORMS HARDENING — submission integrity hash (uses real Utilities digest, so
//  it lives here rather than the Node harness)
// ════════════════════════════════════════════════════════════════════════════
function test_form_submissionHash_deterministicAndTamperEvident() {
  var dataJson = JSON.stringify({ firstName: 'Jane', householdSize: '3' });
  var sig = 'data:image/png;base64,AAAA';
  var h1 = computeFormSubmissionHash_(dataJson, sig, 'tok-1', 'forms-consent-2026-06');
  var h2 = computeFormSubmissionHash_(dataJson, sig, 'tok-1', 'forms-consent-2026-06');
  _assertEq(h1, h2, 'same input → identical hash (deterministic)');
  _assertEq(h1.length, 64, 'SHA-256 hex is 64 chars');
  // Any altered component changes the hash → tamper-evident.
  _assertTrue(h1 !== computeFormSubmissionHash_(JSON.stringify({ firstName: 'John' }), sig, 'tok-1', 'forms-consent-2026-06'), 'altered responses → different hash');
  _assertTrue(h1 !== computeFormSubmissionHash_(dataJson, 'data:image/png;base64,BBBB', 'tok-1', 'forms-consent-2026-06'), 'altered signature → different hash');
  _assertTrue(h1 !== computeFormSubmissionHash_(dataJson, sig, 'tok-2', 'forms-consent-2026-06'), 'different token → different hash');
  _assertTrue(h1 !== computeFormSubmissionHash_(dataJson, sig, 'tok-1', 'forms-consent-2027-01'), 'different consent version → different hash');
}
