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
    _TEST_STATE.results.push({ name, status: 'FAIL', ms, error: e.message, stack: e.stack });
    _TEST_STATE.fail++;
    Logger.log(`✗ ${name} (${ms}ms)\n   ${e.message}`);
  }
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

  // Provision the CDR fixture (best-effort — a hiccup here shouldn't block the
  // rest of the suite; the CDR tests guard on _TEST_CDR_SS_ID).
  try { _setupTestCdrFixture_(); }
  catch (e) { Logger.log('  CDR fixture setup skipped: ' + e.message); }

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
  _smokeTest('isLastBusinessDayOfMonth',           test_isLastBusinessDayOfMonth);
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
  _smokeTest('cn_extractAuditNoteId_parses',       test_cn_extractAuditNoteId_parses);
  _smokeTest('cn_extractAuditNoteId_noMatch',      test_cn_extractAuditNoteId_noMatch);
  _smokeTest('tpl_formToken_usesUnescapedScriptlet', test_tpl_formToken_usesUnescapedScriptlet);
  _smokeTest('tpl_noEscapedJsonInjection',         test_tpl_noEscapedJsonInjection);
  _smokeTest('tpl_formPublic_evaluatesWithoutError', test_tpl_formPublic_evaluatesWithoutError);
  _smokeTest('cn_esc_basic',                       test_cn_esc_basic);

  // ── Intake — PPD recommendation engine (smoke-safe; pure) ──────────────
  _smokeTest('intake_engine_standardOnly',         test_intake_engine_standardOnly);
  _smokeTest('intake_engine_neuroUpgradeAndSubs',  test_intake_engine_neuroUpgradeAndSubs);
  _smokeTest('intake_engine_weightCap',            test_intake_engine_weightCap);
  _smokeTest('intake_engine_oxygenExcludesK0837',  test_intake_engine_oxygenExcludesK0837);
  _smokeTest('intake_engine_emptySafe',            test_intake_engine_emptySafe);
  _smokeTest('intake_buildPpdBody_escapesAnswers', test_intake_buildPpdBody_escapesAnswers);
  _smokeTest('intake_emailDomain_extracted',       test_intake_emailDomain_extracted);

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
  _integrationTest('cn_managerGetCallNotes_nonManagerRejected', test_cn_managerGetCallNotes_nonManagerRejected);
  _integrationTest('cn_getFormSubmission_callerScoped',      test_cn_getFormSubmission_callerScoped);
  _integrationTest('cn_managerGetFormSubmission_gatedAndScoped', test_cn_managerGetFormSubmission_gatedAndScoped);

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

  // ── Metrics / CDR endpoint integration (uses the CDR fixture) ───────────
  _integrationTest('metrics_getMyMetrics_cdrIntegration',       test_metrics_getMyMetrics_cdrIntegration);
  _integrationTest('metrics_getTeamMetrics_cdrIntegration',     test_metrics_getTeamMetrics_cdrIntegration);
  _integrationTest('metrics_cdrFixture_durationsUseDisplayValues', test_metrics_cdrFixture_durationsUseDisplayValues);
  _integrationTest('metrics_getTeamMetrics_nonManagerRejected', test_metrics_getTeamMetrics_nonManagerRejected);
  _integrationTest('metrics_getMyMetrics_cdrUnavailableErrors', test_metrics_getMyMetrics_cdrUnavailableErrors);

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
  _integrationTest('cn_managerAggregateUrgent_findsUrgentNotOthers', test_cn_managerAggregateUrgent_findsUrgentNotOthers);

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

function test_isLastBusinessDayOfMonth() {
  // 2026-01-30 is Friday; Jan 31 is Saturday → last business day is Jan 30
  _assertTrue(isLastBusinessDayOfMonth_(new Date(2026, 0, 30)),  '2026-01-30 is last biz day');
  _assertFalse(isLastBusinessDayOfMonth_(new Date(2026, 0, 31)), '2026-01-31 (Sat) is not');
  _assertFalse(isLastBusinessDayOfMonth_(new Date(2026, 0, 29)), '2026-01-29 (Thu) is not');
  // 2026-05-29 is Friday; May 31 is Sunday → last biz day is May 29
  _assertTrue(isLastBusinessDayOfMonth_(new Date(2026, 4, 29)),  '2026-05-29 is last biz day');
  _assertFalse(isLastBusinessDayOfMonth_(new Date(2026, 4, 30)), '2026-05-30 (Sat) is not');
}

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
        submittedAt: String(rows[i][TO.SUBMITTED_AT]).trim(),
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
  const orig = CONFIG.ENABLE_PTO_TRACKING;
  CONFIG.ENABLE_PTO_TRACKING = false;
  try {
    const before = _getBalance(_TEST_INDIA_ID, 'sick');
    const result = adjustLeaveBalance_(_TEST_INDIA_ID, 'sick', -1);
    _assertNull(result);
    _assertEqClose(_getBalance(_TEST_INDIA_ID, 'sick'), before, 'No change when PTO disabled');
  } finally {
    CONFIG.ENABLE_PTO_TRACKING = orig;
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
  // Adjust it
  _asUser(_TEST_INDIA_EMAIL, () => {
    const r = recordPunch('ClockIn', { date: _TEST_DATE_RECENT, time: '08:55', reason: 'corrected' });
    _assertSuccess(r);
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
  // Date 60 days back, beyond the 30-day window
  const d = new Date(); d.setDate(d.getDate() - 60);
  const oldDate = Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
  _asUser(_TEST_INDIA_EMAIL, () => {
    _assertFailure(
      recordPunch('ClockIn', { date: oldDate, time: '09:00', reason: 'long ago' }),
      'within the last'
    );
  });
}

function test_recordPunch_rejectsUnknownType() {
  _asUser(_TEST_INDIA_EMAIL, () => {
    _assertFailure(recordPunch('Nope', null), 'Unknown punch type');
  });
}

function test_recordPunch_reasonRequiredOldAdj() {
  _asUser(_TEST_INDIA_EMAIL, () => {
    // 14 days back, no reason → rejected
    _assertFailure(
      recordPunch('ClockIn', { date: _TEST_DATE_OLD, time: '09:00', reason: '' }),
      'reason is required'
    );
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
  _asUser(_TEST_INDIA_EMAIL, function () {
    const r = reconcileCallNotes();
    _assertNotNull(r.error, 'non-manager rejected');
    _assertContains(r.error, 'Manager access required');
  });
}

function test_reconcileCallNotes_backfillsHandEntered() {
  const emp = lookupEmployeeById_(_TEST_INDIA_ID);
  if (!emp || !emp.callNotesSheetId) { _assertTrue(true, 'India call-notes Sheet not provisioned — skipped'); return; }
  const sheet = getCallNotesSheet_(emp);
  const row = new Array(CN_HEADERS.length).fill('');
  row[CN.CALLER] = 'Hand Entered Caller';
  row[CN.ISSUE]  = 'typed directly into the sheet';
  sheet.appendRow(row);
  const appended = sheet.getLastRow();
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
  sheet.deleteRow(appended);   // tidy within the run (cleanupTestData also wipes the test Notes tab)
}

// Auto-provision (INV-110): non-manager is rejected before any Drive write.
function test_provisionCallNotesSheet_nonManagerRejected() {
  _asUser(_TEST_INDIA_EMAIL, function () {
    const r = provisionCallNotesSheet(_TEST_INDIA_ID);
    _assertNotNull(r.error, 'non-manager rejected');
    _assertContains(r.error, 'Manager access required');
  });
}

// Auto-provision is idempotent: a rep who already has a Sheet is returned
// unchanged and NO new Spreadsheet is created (never clobbers existing history).
// The India test employee is enrolled by setupTestEnvironment, so this exercises
// the no-clobber branch without littering Drive with a fresh Sheet.
function test_provisionCallNotesSheet_idempotentNoClobber() {
  const emp = lookupEmployeeById_(_TEST_INDIA_ID);
  if (!emp || !emp.callNotesSheetId) { _assertTrue(true, 'India call-notes Sheet not provisioned — skipped'); return; }
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
  _asUser(_TEST_INDIA_EMAIL, () => {
    // 14 days back, WITH reason → accepted
    const r = recordPunch('ClockIn', {
      date: _TEST_DATE_OLD, time: '09:00', reason: 'forgot to punch in'
    });
    _assertSuccess(r);
  });
}

// ── submitTimeOffRequest ──

function test_submitTimeOff_createsRow() {
  _clearTestState(_TEST_INDIA_ID);   // hermetic: dup-date guard now rejects a 2nd same-date submit (H1)
  _asUser(_TEST_INDIA_EMAIL, () => {
    const r = submitTimeOffRequest(_TEST_DATE_FUTURE, 'Sick Leave', 'doctor visit');
    _assertSuccess(r);
  });
  const row = _findTimeOffRow(_TEST_INDIA_ID, _TEST_DATE_FUTURE);
  _assertNotNull(row, 'Time-off row should exist');
  _assertEq(row.type, 'Sick Leave');
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
  _asUser(_TEST_PH_EMAIL, () => {
    _assertSuccess(submitTimeOffRequest(_TEST_DATE_FUTURE, 'Sick Leave', ''));
  });
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
  // should succeed.
  _asUser(_TEST_PH_EMAIL, () => {
    const r = recordPunch('ClockOut', {
      date: _TEST_DATE_RECENT, time: '17:00', reason: '',
    });
    _assertSuccess(r, 'Adjustment should bypass min-interval');
    _assertEq(r.isAdjustment, true);
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
  const sa1 = '2099-01-01 09:00:00', sa2 = '2099-01-01 09:00:01';
  sheet.appendRow([_TEST_PH_ID, 'Test PH User', _TEST_DATE_FUTURE, 'Full Day', '', 'Pending', sa1]);
  sheet.appendRow([_TEST_PH_ID, 'Test PH User', _TEST_DATE_FUTURE, 'Full Day', '', 'Pending', sa2]);
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
  const orig = CONFIG.SHOW_TEAMMATE_STATUS;
  CONFIG.SHOW_TEAMMATE_STATUS = false;
  try {
    _asUser(_TEST_INDIA_EMAIL, () => {
      const r = getTeammateStatus();
      _assertEq(r.enabled, false);
      _assertEq(r.teammates.length, 0);
    });
  } finally {
    CONFIG.SHOW_TEAMMATE_STATUS = orig;
  }
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
  _appendTestPunch(_TEST_PH_ID, 'Test PH User', _TEST_DATE_OLD, '09:00:00', 'IN',  'ADJ-ClockIn');
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
  _asUser(_TEST_INDIA_EMAIL, function () {
    recordPunch('ClockIn', { date: _TEST_DATE_RECENT, time: '08:00', reason: 'test audit' });
  });
  var row = _findAuditRow(_TEST_INDIA_ID, 'ClockIn');
  _assertNotNull(row, 'Audit row should exist for recordPunch');
}

function test_auditRow_deletePunch_hasActorEmail() {
  _clearTestState(_TEST_INDIA_ID);
  _asUser(_TEST_INDIA_EMAIL, function () {
    recordPunch('ClockIn', { date: _TEST_DATE_RECENT, time: '09:00', reason: 'setup' });
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
  _assertFailure(rn, 'Manager access', 'renameCallNoteTag is manager-gated');
  const mg = _asUser(_TEST_INDIA_EMAIL, function () { return mergeCallNoteTags('src-tag', 'dst-tag'); });
  _assertFailure(mg, 'Manager access', 'mergeCallNoteTags is manager-gated');
  const ar = _asUser(_TEST_INDIA_EMAIL, function () { return archiveCallNoteTag('src-tag', true); });
  _assertFailure(ar, 'Manager access', 'archiveCallNoteTag is manager-gated');
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
  const r1 = _asUser(_TEST_MGR_EMAIL, function () { return archiveCallNoteTag(tag, true); });
  _assertSuccess(r1, 'archive should succeed');
  _assertTrue(!!getArchivedTagsSet_()[tag], 'tag flagged archived in Script Property');
  // Archive must NOT touch any note rows — only the property.
  const r2 = _asUser(_TEST_MGR_EMAIL, function () { return archiveCallNoteTag(tag, false); });
  _assertSuccess(r2, 'unarchive should succeed');
  _assertFalse(!!getArchivedTagsSet_()[tag], 'tag no longer archived after unarchive (cleanup)');
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
    ['getCallNotesTagTaxonomy',        function () { return getCallNotesTagTaxonomy(); }],
    ['getAdminConfig',                 function () { return getAdminConfig(); }],
    ['saveDepartmentEmails',           function () { return saveDepartmentEmails({ Sales: 'x@y.com' }); }],
    ['saveStateTaxRates',              function () { return saveStateTaxRates({ Texas: 0.05 }); }],
    ['saveUpdateSuggestions',          function () { return saveUpdateSuggestions({ Sales: ['x'] }); }],
    ['getTeamMetrics',                 function () { return getTeamMetrics(D); }],
    ['exportAdpRange',                 function () { return exportAdpRange(D, D); }],
    ['getManagerDashboard',            function () { return getManagerDashboard(); }],
    ['getEmployeesList',               function () { return getEmployeesList(); }],
    ['getEmployeeTimesheetForManager', function () { return getEmployeeTimesheetForManager(_TEST_INDIA_ID, D, D); }],
    ['getAutomationHealth',            function () { return getAutomationHealth(); }],
  ];
  cases.forEach(function (c) {
    const r = _asUser(_TEST_INDIA_EMAIL, c[1]);
    _assertNotNull(r && r.error, c[0] + ' must return an error for a non-manager caller');
    _assertContains(r.error, 'Manager access', c[0] + ' must be manager-gated (INV-02)');
  });
  // getMetricsAmbient gates by silently returning no badge (not an {error}) —
  // assert it never leaks a badge / data to a non-manager.
  const amb = _asUser(_TEST_INDIA_EMAIL, function () { return getMetricsAmbient(); });
  _assertTrue(!amb || amb.badge == null, 'getMetricsAmbient must not leak a badge to a non-manager');
}

// ════════════════════════════════════════════════════════════════════════════
//  METRICS / CDR ENDPOINT INTEGRATION (uses the _setupTestCdrFixture_ sheet)
// ════════════════════════════════════════════════════════════════════════════

function test_metrics_getMyMetrics_cdrIntegration() {
  if (!_TEST_CDR_SS_ID) { _assertTrue(true, "CDR fixture unavailable — skipped"); return; }
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
  if (!_TEST_CDR_SS_ID) { _assertTrue(true, "CDR fixture unavailable — skipped"); return; }
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

function test_metrics_getTeamMetrics_cdrIntegration() {
  if (!_TEST_CDR_SS_ID) { _assertTrue(true, "CDR fixture unavailable — skipped"); return; }
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
