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
  invalidateRosterCache_();
  Logger.log(`setupTestEnvironment: ${added} test employee row(s) added (existing left unchanged).`);
}

function cleanupTestData() {
  const ss = getAdpSS_();

  // Timesheet (headers in rows 1-2, data from row 3)
  _cleanupRowsByPrefix(ss.getSheetByName(CONFIG.ADP_TAB), 'TEST_', ADP.EMP_ID, 3);
  // TimeOffRequests (header row 1, data from row 2)
  _cleanupRowsByPrefix(ss.getSheetByName(CONFIG.TIMEOFF_TAB), 'TEST_', TO.EMP_ID, 2);
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

  _smokeTest('holidays_2026_dates',                test_holidays_2026_dates);
  _smokeTest('holidays_independenceDay_weekendShift', test_holidays_independenceDay_weekendShift);

  // ── Integration (sheet-touching) ────────────────────────────────────────
  _integrationTest('findExistingPunch_match',           test_findExistingPunch_match);
  _integrationTest('findExistingPunch_noMatch',         test_findExistingPunch_noMatch);
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

// ── cancelTimeOffRequest ──

function test_cancelTimeOff_pendingDeletes() {
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
  _appendTestPunch(_TEST_INDIA_ID, 'Test India User', _TEST_DATE_RECENT, '09:00:00', 'IN', 'ClockIn');
  _assertEq(_countTimesheetRows(_TEST_INDIA_ID, _TEST_DATE_RECENT, 'ClockIn'), 1);
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertSuccess(deletePunch(_TEST_INDIA_ID, _TEST_DATE_RECENT, '09:00:00', 'ClockIn'));
  });
  _assertEq(_countTimesheetRows(_TEST_INDIA_ID, _TEST_DATE_RECENT, 'ClockIn'), 0);
}

function test_deletePunch_beyondWindowRejected() {
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
  _asUser(_TEST_MGR_EMAIL, () => {
    _assertFailure(
      deletePunch(_TEST_INDIA_ID, _TEST_DATE_RECENT, '09:00:00', 'ClockIn'),
      'not found'
    );
  });
}

function test_deletePunch_nonManagerRejected() {
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