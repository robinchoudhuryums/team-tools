// ════════════════════════════════════════════════════════════════════════════
//  UMS TEAM TOOLS  —  Code.gs
//   Web app entry point + Time Clock module server logic. Additional tool
//   modules register more server endpoints in this same project; client-
//   side, each tool is a view registered with the router in
//   script_core.html. Shared helpers (auth, audit, sheet access, tz/date
//   normalization) live alongside the tool-specific endpoints here.
// ════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  ADP_SS_ID:    'YOUR_ADP_SPREADSHEET_ID',
  EMPLOYEE_TAB: 'Employees',
  ADP_TAB:      'Timesheet',
  TIMEOFF_TAB:  'TimeOffRequests',
  AUDIT_TAB:    'AuditLog',

  TIMEZONE:         'Asia/Kolkata',
  MANAGER_TIMEZONE: 'America/Chicago',

  MANAGER_EMAILS: ['YOUR_EMAIL@umsupply.com'],

  ADJUST_WINDOW_DAYS:        30,
  OLD_ADJUST_ALERT_DAYS:     7,   // also: reason becomes required beyond this
  MGR_DELETE_WINDOW_DAYS:    7,   // how far back a manager can delete a punch
  MIN_PUNCH_INTERVAL_SECONDS: 30, // minimum seconds between live punches (prevents fat-finger)
  SELF_UNDO_WINDOW_SECONDS:  300, // 5 min — employees can undo their own live punches within this
  SHOW_TEAMMATE_STATUS:      true, // show teammate status card on Clock page

  ENABLE_PTO_TRACKING:       true,
  ANNUAL_LEAVE_MAX:          15,  // for PTO ring display only (e.g. "12/15")
  SICK_LEAVE_MAX:            10,

  SHOW_TEAMMATE_TYPE:        true,
  MISSED_PUNCH_LOOKBACK_DAYS:7,

  AUTO_MISSED_ALERT_HOUR_IST: 6,
  AUTO_EXPORT_HOUR_IST:       12,

  // ── Call Notes module ────────────────────────────────────────────────
  // The rolling-note panel; per-rep notes write to the rep's own Sheet
  // (EMP.CALL_NOTES_SHEET_ID, column L), email composer/preview gate is a
  // separate action from log-on-submit. See helper getCallNotesSheet_().
  CALL_NOTES: {
    NOTES_TAB:           'Notes',
    SUBFORM_COL_JSON:    true,           // store SubformData as JSON blob in column P
    DELETE_WINDOW_SECONDS: 300,          // 5 min — self-undo on a just-created note
    CC_EMAIL:            'robin.choudhury@universalmedsupply.com',
    AUTO_COPY_FORMAT:
      'Callback Number: {callback}\n' +
      'Caller Name: {caller}\n' +
      'Relationship: {relationship}\n' +
      'Issue: {issue}\n' +
      'Transferred To: {transferredTo}\n' +
      'Resolution: {resolution}',
    STALE_FLAG_HOURS:    1,              // an `action` flag is "stale" if unresolved beyond this
    // Voice-to-text dictation on Issue / Resolution textareas. OFF by default
    // because browser speech recognition (Chrome/Edge) routes audio to the
    // vendor's speech-to-text service, which is not BAA-covered for PHI.
    // Turn on only after confirming the org's HIPAA stance.
    VOICE_INPUT_ENABLED: false,
    EOD_WARNING_HOUR:    17,             // 5pm; trigger walks roster, sends per-rep tz match
    EOD_WARNING_WINDOW_MINUTES: 30,      // ± window around the rep's local 5pm
    TRAINING_DIGEST_WEEKDAY: 5,          // Friday — sent to MANAGER_EMAILS
    REVIEW_DIGEST_WEEKDAY:   5,
    DEPARTMENT_EMAILS: {
      'Sales':            'sales@universalmedsupply.com',
      'Eligibility MM&R': 'eligibility@universalmedsupply.com',
      'Manual Mobility':  'patientintake@universalmedsupply.com',
      'Resupply':         'resupply@universalmedsupply.com',
      'Power':            'power@universalmedsupply.com',
      'Field Ops':        'routing@universalmedsupply.com',
      'Service':          'service@universalmedsupply.com',
      'Billing':          'billing@universalmedsupply.com',
      'Denials':          'denials@universalmedsupply.com',
      'CSR':              'robin.choudhury@universalmedsupply.com',
      'Spanish':           'spanishcalls@universalmedsupply.com',
    },
    // Dept-specific update-type suggestions for the email composer datalist.
    UPDATE_SUGGESTIONS_BY_DEPT: {
      'Sales':            ['Appointment Re-scheduled', 'Insurance Details', 'Duplicate'],
      'Service':          ['Pictures/Video', 'Additional Issue', 'Pending Validation'],
      'Eligibility MM&R': ['Close Order', 'OOP Accepted', 'UPG Fee Accepted', 'New Insurance Details', 'Duplicate'],
      'Manual Mobility':  ['Insurance Change', 'Pending Auth'],
      'Power':            ['New Appt Needed', 'New Appt Details', 'Insurance Change', 'Appeal Status', 'PAR Response', 'PT Eval', 'PV-PPD'],
      'Resupply':         ['Repeat Resupply', 'Wrong Item Received', 'Vent Inquiry'],
      'Field Ops':        ['Verified Shipping', 'Re-schedule', 'Delivery Details'],
      'Billing':          ['Receipt Request', 'Refund'],
      'Denials':          ['Appeal Needed', 'Redetermination'],
      'CSR':              ['General Inquiry', 'Status Check'],
      'Spanish':          ['Translator Needed'],
    },
    // Always offered alongside dept-specific suggestions
    UPDATE_SUGGESTIONS_DEFAULT: [
      'Verified Shipping', 'Repeat Resupply', 'Close Order', 'OOP Order', 'Supervisor/Complaint',
    ],
    // Hardcoded state tax rates (intentionally conservative); used for OOP tax calc.
    STATE_TAX_RATES: {
      'Alabama': 0.03, 'Alaska': 0, 'Arizona': 0.045, 'Arkansas': 0.055,
      'California': 0.06, 'Colorado': 0.02, 'Connecticut': 0.05, 'Delaware': 0,
      'District of Columbia': 0.05, 'Florida': 0.05, 'Georgia': 0.03, 'Hawaii': 0.03,
      'Idaho': 0.05, 'Illinois': 0.05, 'Indiana': 0.06, 'Iowa': 0.05,
      'Kansas': 0.055, 'Kentucky': 0.05, 'Louisiana': 0.035, 'Maine': 0.045,
      'Maryland': 0.05, 'Massachusetts': 0.05, 'Michigan': 0.05, 'Minnesota': 0.055,
      'Mississippi': 0.06, 'Missouri': 0.03, 'Montana': 0, 'Nebraska': 0.045,
      'Nevada': 0.055, 'New Hampshire': 0, 'New Jersey': 0.055, 'New Mexico': 0.04,
      'New York': 0.03, 'North Carolina': 0.035, 'North Dakota': 0.04, 'Ohio': 0.045,
      'Oklahoma': 0.045, 'Oregon': 0, 'Pennsylvania': 0.045, 'Rhode Island': 0.05,
      'South Carolina': 0.04, 'South Dakota': 0.04, 'Tennessee': 0.05, 'Texas': 0.0625,
      'Utah': 0.045, 'Vermont': 0.04, 'Virginia': 0.04, 'Washington': 0.055,
      'West Virginia': 0.04, 'Wisconsin': 0.04, 'Wyoming': 0.03,
    },
    STATE_ABBR_TO_NAME: {
      'AL':'Alabama','AK':'Alaska','AZ':'Arizona','AR':'Arkansas','CA':'California',
      'CO':'Colorado','CT':'Connecticut','DE':'Delaware','DC':'District of Columbia','FL':'Florida',
      'GA':'Georgia','HI':'Hawaii','ID':'Idaho','IL':'Illinois','IN':'Indiana',
      'IA':'Iowa','KS':'Kansas','KY':'Kentucky','LA':'Louisiana','ME':'Maine',
      'MD':'Maryland','MA':'Massachusetts','MI':'Michigan','MN':'Minnesota','MS':'Mississippi',
      'MO':'Missouri','MT':'Montana','NE':'Nebraska','NV':'Nevada','NH':'New Hampshire',
      'NJ':'New Jersey','NM':'New Mexico','NY':'New York','NC':'North Carolina','ND':'North Dakota',
      'OH':'Ohio','OK':'Oklahoma','OR':'Oregon','PA':'Pennsylvania','RI':'Rhode Island',
      'SC':'South Carolina','SD':'South Dakota','TN':'Tennessee','TX':'Texas','UT':'Utah',
      'VT':'Vermont','VA':'Virginia','WA':'Washington','WV':'West Virginia','WI':'Wisconsin',
      'WY':'Wyoming',
    },
  },
};

const ADP = { EMP_ID:0, EMP_NAME:1, DATE:2, TIME:3, DIR:4, LOCATION:5, REASON:6, STATUS:7, COMMENTS:8 };
// Phase 7: columns I (ANNUAL_LEAVE) and J (SICK_LEAVE)
// Phase 8 (Call Notes): column L (CALL_NOTES_SHEET_ID) — per-rep Sheet ID
const EMP = {
  EMAIL:0, ID:1, NAME:2, SHEET_ID:3, PAY_CYCLE:4, PAY_ANCHOR:5, IS_MANAGER:6,
  TIMEZONE:7, ANNUAL_LEAVE:8, SICK_LEAVE:9, PTO_ENABLED:10, CALL_NOTES_SHEET_ID:11,
};
const TO  = { EMP_ID:0, EMP_NAME:1, DATE:2, TYPE:3, NOTES:4, STATUS:5, SUBMITTED_AT:6 };

// Notes tab schema in each rep's per-rep Sheet — see CONFIG.CALL_NOTES.NOTES_TAB.
const CN = {
  NOTE_ID:0, TIMESTAMP:1, DATE_LOCAL:2,
  CALLBACK:3, CALLER:4, RELATIONSHIP:5, PATIENT_TRX:6,
  ISSUE:7, TRANSFERRED_TO:8, RESOLUTION:9,
  FLAG_TYPE:10, RESOLVED:11,
  EMAILED_AT:12, EMAIL_DEPARTMENTS:13,
  SUBFORM:14, SUBFORM_DATA:15,
};
const CN_HEADERS = [
  'NoteId','Timestamp','DateLocal',
  'Callback','Caller','Relationship','PatientAndTRX',
  'Issue','TransferredTo','Resolution',
  'FlagType','Resolved',
  'EmailedAt','EmailDepartments',
  'Subform','SubformData',
];
const CN_FLAG_TYPES = ['action','training','review'];

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DAY_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const ROSTER_CACHE_KEY = 'employee_roster_v5';   // bumped: CallNotesSheetId column
const ROSTER_CACHE_TTL = 300;

// Per-rep call-notes ambient cache: caches the {unresolvedActionCount,
// staleActionCount, todayTotal} aggregate so the 60s sidebar polling doesn't
// re-scan the full per-rep sheet on every tick. TTL matches the polling
// interval; mutating endpoints (submit/setFlag/setResolved/delete) invalidate
// to keep the badge fresh after user action.
const CN_AMBIENT_CACHE_PREFIX = 'cn_ambient_v1_';
const CN_AMBIENT_CACHE_TTL = 60;

const TZ_ABBR = {
  'Asia/Kolkata':        'IST',
  'Asia/Manila':         'PHT',
  'America/Chicago':     'CST',
  'America/New_York':    'EST',
  'America/Los_Angeles': 'PST',
  'America/Denver':      'MST',
  'Europe/London':       'GMT',
  'UTC':                 'UTC',
};

const PUNCH_LABELS_ = ['ClockIn','LunchOut','LunchIn','ClockOut'];


// ── WEB APP ENTRY ───────────────────────────────────────────────────────────
function doGet(e) {
  return HtmlService
    .createTemplateFromFile('index')
    .evaluate()
    .setTitle('UMS Team Tools')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


// ════════════════════════════════════════════════════════════════════════════
//  EMPLOYEE API
// ════════════════════════════════════════════════════════════════════════════

function getEmployeeState() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Your account is not registered. Contact your manager.' };
    const empTz = empTz_(emp);
    const { today, punches } = getTodayPunches_(emp.id, empTz);
    return {
      name: emp.name, id: emp.id, today, punches,
      nextActions: getNextActions_(punches),
      adjustWindowDays: CONFIG.ADJUST_WINDOW_DAYS,
      adjustReasonThresholdDays: CONFIG.OLD_ADJUST_ALERT_DAYS,
      selfUndoWindowSeconds: CONFIG.SELF_UNDO_WINDOW_SECONDS,
      payCycle: emp.payCycle, payAnchor: emp.payAnchor,
      isManager: emp.isManager,
      timezone: empTz,
      timezoneAbbr: tzAbbr_(empTz),
      ptoEnabled: !!(CONFIG.ENABLE_PTO_TRACKING && emp.ptoEnabled),
      annualLeave: emp.annualLeave,
      sickLeave: emp.sickLeave,
      annualLeaveMax: CONFIG.ANNUAL_LEAVE_MAX || 15,
      sickLeaveMax:   CONFIG.SICK_LEAVE_MAX   || 10,
    };
  } catch (err) { return { error: err.message }; }
}

function recordPunch(punchType, custom) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let alertPayload = null;
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Employee not found.' };

    const empTz    = empTz_(emp);
    const now      = new Date();
    const todayStr = fmtDateTz_(now, empTz);
    const nowTime  = fmtTimeTz_(now, empTz);
    const isAdj    = !!custom;

    if (isAdj) {
      if (!custom.date || !/^\d{4}-\d{2}-\d{2}$/.test(custom.date))
        return { success: false, error: 'Invalid date format (expected yyyy-MM-dd).' };
      if (!custom.time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(custom.time))
        return { success: false, error: 'Invalid time format (expected HH:mm, 24-hour).' };
    }
    if (!PUNCH_LABELS_.includes(punchType))
      return { success: false, error: 'Unknown punch type: ' + punchType };

    const date = isAdj ? custom.date : todayStr;
    const time = isAdj ? (custom.time + ':00') : nowTime;
    const dir  = ['ClockIn','LunchIn'].includes(punchType) ? 'IN' : 'OUT';

    if (date > todayStr) return { success: false, error: 'Cannot record punches for future dates.' };
    if (date === todayStr && time > nowTime)
      return { success: false, error: 'Cannot record punches in the future.' };

    // Min-interval safeguard: prevent accidental rapid-fire punches.
    // Only applies to live (non-adjustment) punches AND only considers prior
    // live punches as the "last punch" — an adjustment a moment ago should not
    // block the next live punch, since adjustments aren't fat-finger risk.
    if (!isAdj) {
      const { punches: todayPunches } = getTodayPunches_(emp.id, empTz);
      const livePunches = todayPunches.filter(p => !p.isAdjustment);
      if (livePunches.length > 0) {
        const last = livePunches[livePunches.length - 1];
        const secondsSince = timeDiffSeconds_(last.time, nowTime);
        if (secondsSince >= 0 && secondsSince < CONFIG.MIN_PUNCH_INTERVAL_SECONDS) {
          const wait = CONFIG.MIN_PUNCH_INTERVAL_SECONDS - secondsSince;
          return { success: false, error:
            `Your last punch was just ${secondsSince}s ago. Please wait ${wait}s before punching again ` +
            `(if you made a mistake, use Adjust instead).` };
        }
      }
    }

    let daysBack = 0;
    let reason   = '';
    if (isAdj) {
      daysBack = daysBetween_(date, todayStr);
      if (daysBack > CONFIG.ADJUST_WINDOW_DAYS) {
        return { success: false,
          error: `Adjustments are only allowed within the last ${CONFIG.ADJUST_WINDOW_DAYS} days. ` +
                 `Please contact your manager for older corrections.` };
      }
      reason = String(custom.reason || '').trim();
      if (daysBack > CONFIG.OLD_ADJUST_ALERT_DAYS && !reason) {
        return { success: false, error:
          `A reason is required for adjustments more than ${CONFIG.OLD_ADJUST_ALERT_DAYS} days back.` };
      }
    }

    const commentLabel = isAdj ? `ADJ-${punchType}` : punchType;

    if (isAdj) {
      const existing = findExistingPunch_(emp.id, date, punchType);
      if (existing) {
        existing.sheet.getRange(existing.rowIndex, ADP.TIME + 1).setValue(time);
        existing.sheet.getRange(existing.rowIndex, ADP.COMMENTS + 1).setValue(commentLabel);
      } else {
        appendToAdpSheet_(emp, date, time, dir, commentLabel);
      }
    } else {
      appendToAdpSheet_(emp, date, time, dir, commentLabel);
    }

    if (emp.sheetId) writeToEmployeeSheet_(emp, date, time, dir, punchType);
    writeAuditLog_(emp, punchType, date, time, isAdj, daysBack, reason);
    if (isAdj && daysBack > CONFIG.OLD_ADJUST_ALERT_DAYS) {
      alertPayload = { emp, punchType, date, time, daysBack, reason };
    }
    return { success: true, displayTime: toDisplayTime_(time), punchType, isAdjustment: isAdj };
  } catch (err) { return { success: false, error: err.message }; }
  finally {
    lock.releaseLock();
    if (alertPayload) {
      try {
        notifyManagerOldAdjustment_(
          alertPayload.emp, alertPayload.punchType,
          alertPayload.date, alertPayload.time, alertPayload.daysBack, alertPayload.reason
        );
      } catch (e) { console.warn('Post-release alert send failed: ' + e.message); }
    }
  }
}

function getTimesheetData(startDate, endDate) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    return buildTimesheetForEmployee_(emp, startDate, endDate);
  } catch (err) { return { error: err.message }; }
}

function getCalendarData(year, month) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    return buildCalendarForEmployee_(emp, year, month);
  } catch (err) { return { error: err.message }; }
}

function submitTimeOffRequest(date, type, notes) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Employee not found.' };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return { success: false, error: 'Invalid date format.' };
    const submittedAt = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
    getOrCreateTimeOffSheet_().appendRow([emp.id, emp.name, date, type, notes || '', 'Pending', submittedAt]);
    writeAuditLog_(emp, 'TimeOffRequest', date, '', false, 0, type + (notes ? ' — ' + notes : ''));
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Employee cancels their own pending time-off request. */
function cancelTimeOffRequest(date, submittedAt) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Employee not found.' };
    const sheet = getOrCreateTimeOffSheet_();
    const rows  = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][TO.EMP_ID]).trim() === emp.id
          && normalizeDate_(rows[i][TO.DATE]) === date
          && String(rows[i][TO.SUBMITTED_AT]).trim() === submittedAt) {
        const status = String(rows[i][TO.STATUS]).toLowerCase().trim();
        if (status !== 'pending') {
          return { success: false, error: 'Only pending requests can be cancelled.' };
        }
        const type = String(rows[i][TO.TYPE]);
        const reqNotes = String(rows[i][TO.NOTES] || '');
        sheet.deleteRow(i + 1);
        // Audit row carries enough context to reconstruct the cancelled request
        // from the log alone — the row itself is gone after deleteRow.
        const auditParts = [type, 'self-cancelled', 'status=' + status];
        if (reqNotes)   auditParts.push('notes="' + reqNotes + '"');
        if (submittedAt) auditParts.push('submittedAt=' + submittedAt);
        writeAuditLog_(emp, 'TimeOffCancel', date, '', false, 0, auditParts.join(' · '));
        return { success: true };
      }
    }
    return { success: false, error: 'Request not found.' };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}


// ════════════════════════════════════════════════════════════════════════════
//  MANAGER API
// ════════════════════════════════════════════════════════════════════════════

function getManagerDashboard() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };

    const mgrTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
    const mgrTzAbbr = tzAbbr_(mgrTz);
    const now = new Date();
    const todayStr = fmtDateTz_(now, mgrTz);

    const empRows = getEmployeeRosterRows_();
    const employees = [];
    const empById = {};
    for (let i = 1; i < empRows.length; i++) {
      if (!empRows[i][EMP.EMAIL]) continue;
      let tzRaw = empRows[i][EMP.TIMEZONE];
      if (tzRaw === null || tzRaw === undefined) tzRaw = '';
      const tz = String(tzRaw).trim() || CONFIG.TIMEZONE;
      const e = {
        id: String(empRows[i][EMP.ID]).trim(),
        name: String(empRows[i][EMP.NAME]).trim(),
        timezone: tz,
        tzAbbr: tzAbbr_(tz),
        todayStr: fmtDateTz_(now, tz),
        annualLeave: parseFloat(empRows[i][EMP.ANNUAL_LEAVE]) || 0,
        sickLeave:   parseFloat(empRows[i][EMP.SICK_LEAVE])   || 0,
      };
      const lb = new Date(now); lb.setDate(lb.getDate() - CONFIG.MISSED_PUNCH_LOOKBACK_DAYS);
      e.lookbackStr = fmtDateTz_(lb, tz);
      employees.push(e);
      empById[e.id] = e;
    }

    const adpRows = getAdpSS_().getSheetByName(CONFIG.ADP_TAB).getDataRange().getValues();

    // Per-employee today's punches
    const todayPunchesByEmp = {};
    for (let i = 2; i < adpRows.length; i++) {
      const id = String(adpRows[i][ADP.EMP_ID]).trim();
      const e = empById[id];
      if (!e) continue;
      const rowDate = normalizeDate_(adpRows[i][ADP.DATE]);
      if (rowDate !== e.todayStr) continue;
      if (!todayPunchesByEmp[id]) todayPunchesByEmp[id] = [];
      todayPunchesByEmp[id].push({
        time: normalizeTime_(adpRows[i][ADP.TIME]),
        type: normalizeType_(String(adpRows[i][ADP.COMMENTS])),
      });
    }

    // Live status with manager-tz conversion
    const liveStatus = employees.map(e => {
      const punches = todayPunchesByEmp[e.id] || [];
      const last = punches.length ? punches[punches.length - 1] : null;
      let status = 'not_in';
      if (last) {
        if (last.type === 'ClockIn' || last.type === 'LunchIn') status = 'clocked_in';
        else if (last.type === 'LunchOut') status = 'on_lunch';
        else if (last.type === 'ClockOut') status = 'clocked_out';
      }
      let lastPunchTimeMgr = null;
      if (last) {
        const conv = convertDateTime_(e.todayStr, last.time, e.timezone, mgrTz);
        lastPunchTimeMgr = conv.time;
      }
      return {
        id: e.id, name: e.name, status,
        lastPunchType: last ? last.type : null,
        lastPunchTime: last ? last.time : null,
        lastPunchTimeMgr, empTzAbbr: e.tzAbbr, mgrTzAbbr,
      };
    });
    const statusRank = { clocked_in: 0, on_lunch: 1, not_in: 2, clocked_out: 3 };
    liveStatus.sort((a, b) =>
      statusRank[a.status] - statusRank[b.status] || a.name.localeCompare(b.name));

    // Pending time-off (with leave balance context).
    // Also build a date→[approved/pending requests] index up-front so each
    // pending entry can carry conflict context (other reps off the same day,
    // US holiday name) without a per-pending nested scan.
    const toRows = getOrCreateTimeOffSheet_().getDataRange().getValues();
    const requestsByDate = {};
    for (let i = 1; i < toRows.length; i++) {
      const st = String(toRows[i][TO.STATUS]).toLowerCase().trim();
      if (st !== 'pending' && st !== 'approved') continue;
      const d = normalizeDate_(toRows[i][TO.DATE]);
      if (!requestsByDate[d]) requestsByDate[d] = [];
      requestsByDate[d].push({
        empId: String(toRows[i][TO.EMP_ID]).trim(),
        empName: String(toRows[i][TO.EMP_NAME]).trim(),
        type: String(toRows[i][TO.TYPE]),
        status: st,
      });
    }

    const pending = [];
    for (let i = 1; i < toRows.length; i++) {
      if (String(toRows[i][TO.STATUS]).toLowerCase().trim() !== 'pending') continue;
      const reqEmpId = String(toRows[i][TO.EMP_ID]).trim();
      const reqType = String(toRows[i][TO.TYPE]);
      const dedu = getLeaveDeduction_(reqType);
      const reqEmp = empById[reqEmpId];
      let currentBal = null, projBal = null;
      if (CONFIG.ENABLE_PTO_TRACKING && reqEmp && dedu.bucket) {
        currentBal = dedu.bucket === 'sick' ? reqEmp.sickLeave : reqEmp.annualLeave;
        projBal = +(currentBal - dedu.days).toFixed(2);
      }
      pending.push({
        empId: reqEmpId,
        empName: String(toRows[i][TO.EMP_NAME]).trim(),
        date: normalizeDate_(toRows[i][TO.DATE]),
        type: reqType,
        notes: String(toRows[i][TO.NOTES]),
        submittedAt: String(toRows[i][TO.SUBMITTED_AT]).trim(),
        leaveBucket: dedu.bucket,
        leaveDays: dedu.days,
        currentBalance: currentBal,
        projectedBalance: projBal,
      });
    }
    pending.sort((a, b) => a.date.localeCompare(b.date));

    // Per-pending conflict context: other reps off the same day + US holiday.
    // Used by the dashboard to surface "1 other PH rep off this day · US
    // Independence Day" inline on each pending card, preventing approval
    // mistakes (double-booking team, approving over holidays).
    const pendingYears = {};
    pending.forEach(p => { pendingYears[p.date.substring(0, 4)] = true; });
    const holidayMap = {};
    Object.keys(pendingYears).forEach(y => {
      getUsHolidays_(parseInt(y, 10)).forEach(h => { holidayMap[h.date] = h.name; });
    });
    pending.forEach(p => {
      const sameDate = requestsByDate[p.date] || [];
      // Exclude every request from this same employee (their own pending
      // request is in the list, plus any prior approved/pending for that
      // date which aren't really a "conflict" from the manager's POV).
      p.conflictsOff = sameDate
        .filter(r => r.empId !== p.empId)
        .map(r => ({ name: r.empName, status: r.status, type: r.type }));
      p.holidayName = holidayMap[p.date] || null;
    });

    // Missed clock-outs (per-emp tz)
    const punchKeyMap = {};
    for (let i = 2; i < adpRows.length; i++) {
      const id = String(adpRows[i][ADP.EMP_ID]).trim();
      const e = empById[id];
      if (!e) continue;
      const rowDate = normalizeDate_(adpRows[i][ADP.DATE]);
      if (rowDate < e.lookbackStr || rowDate >= e.todayStr) continue;
      const key = `${id}|${rowDate}`;
      if (!punchKeyMap[key]) punchKeyMap[key] = new Set();
      punchKeyMap[key].add(normalizeType_(String(adpRows[i][ADP.COMMENTS])));
    }
    const missedPunches = [];
    for (const key in punchKeyMap) {
      const types = punchKeyMap[key];
      if (types.has('ClockIn') && !types.has('ClockOut')) {
        const [id, date] = key.split('|');
        const e = empById[id];
        missedPunches.push({ empId: id, empName: e ? e.name : id, date });
      }
    }
    missedPunches.sort((a, b) =>
      b.date.localeCompare(a.date) || a.empName.localeCompare(b.empName));

    // Recent punches (for manager delete)
    const recentWindow = (() => {
      const d = new Date(); d.setDate(d.getDate() - 10);  // wider than 7 for tz slop
      return fmtDateTz_(d, mgrTz);
    })();
    const recentPunches = [];
    for (let i = 2; i < adpRows.length; i++) {
      const rowDate = normalizeDate_(adpRows[i][ADP.DATE]);
      if (rowDate < recentWindow) continue;
      const id = String(adpRows[i][ADP.EMP_ID]).trim();
      const e = empById[id];
      if (!e) continue;
      const rawComment = String(adpRows[i][ADP.COMMENTS]);
      const dBack = Math.abs(daysBetween_(rowDate, todayStr));
      recentPunches.push({
        empId: id, empName: e.name,
        date: rowDate,
        time: normalizeTime_(adpRows[i][ADP.TIME]),
        type: normalizeType_(rawComment),
        isAdjustment: rawComment.indexOf('ADJ-') === 0,
        empTzAbbr: e.tzAbbr,
        canDelete: dBack <= CONFIG.MGR_DELETE_WINDOW_DAYS,
      });
    }
    recentPunches.sort((a, b) =>
      b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
    if (recentPunches.length > 30) recentPunches.length = 30;

    // Recent audits — bounded read, tz-converted timestamps
    const auditSheet = getOrCreateAuditSheet_();
    const lastRow = auditSheet.getLastRow();
    const recentAudits = [];
    if (lastRow > 1) {
      const startRow = Math.max(2, lastRow - 19);
      const numRows = lastRow - startRow + 1;
      const auditData = auditSheet.getRange(startRow, 1, numRows, 10).getValues();
      for (let i = auditData.length - 1; i >= 0; i--) {
        const tsRaw = String(auditData[i][0]);
        recentAudits.push({
          timestamp:    tsRaw,
          timestampMgr: convertAuditTs_(tsRaw, CONFIG.TIMEZONE, mgrTz),
          empName:      String(auditData[i][2]),
          action:       String(auditData[i][4]),
          punchDate:    String(auditData[i][5]),
          punchTime:    String(auditData[i][6]),
          isAdjustment: String(auditData[i][7]) === 'TRUE',
          daysBack:     parseInt(auditData[i][8], 10) || 0,
          notes:        String(auditData[i][9]),
        });
      }
    }

    return {
      today: todayStr,
      liveStatus, pending, missedPunches, recentPunches, recentAudits,
      missedLookbackDays:  CONFIG.MISSED_PUNCH_LOOKBACK_DAYS,
      mgrDeleteWindowDays: CONFIG.MGR_DELETE_WINDOW_DAYS,
      ptoEnabled:          !!CONFIG.ENABLE_PTO_TRACKING,
      mgrTzAbbr,
    };
  } catch (err) { return { error: err.message }; }
}

function updateTimeOffStatus(empId, date, submittedAt, newStatus) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    if (!['Approved','Denied','Pending'].includes(newStatus)) {
      return { success: false, error: 'Invalid status.' };
    }
    const sheet = getOrCreateTimeOffSheet_();
    const rows  = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][TO.EMP_ID]).trim() === empId
          && normalizeDate_(rows[i][TO.DATE]) === date
          && String(rows[i][TO.SUBMITTED_AT]).trim() === submittedAt) {
        const oldStatus = String(rows[i][TO.STATUS]).trim();
        const type    = String(rows[i][TO.TYPE]);
        const notes   = String(rows[i][TO.NOTES]);
        const empName = String(rows[i][TO.EMP_NAME]);

        sheet.getRange(i + 1, TO.STATUS + 1).setValue(newStatus);

        // Apply leave-balance change if state transition crosses the Approved boundary
        let newBalance = null;
        if (CONFIG.ENABLE_PTO_TRACKING) {
          const dedu = getLeaveDeduction_(type);
          if (dedu.bucket) {
            if (oldStatus !== 'Approved' && newStatus === 'Approved') {
              newBalance = adjustLeaveBalance_(empId, dedu.bucket, -dedu.days);
            } else if (oldStatus === 'Approved' && newStatus !== 'Approved') {
              newBalance = adjustLeaveBalance_(empId, dedu.bucket, dedu.days);
            }
          }
        }

        // Look up target now (we'll need it for both audit and notification)
        const targetEmp = lookupEmployeeById_(empId);
        const targetForAudit = targetEmp || { id: empId, name: empName, email: '' };

        writeAuditLog_(targetForAudit, 'TimeOffStatusChange', date, '', false, 0,
          `${oldStatus}→${newStatus} (${type})`, callerEmp.email);

        // Email the employee (best-effort, fire-and-forget)
        if (oldStatus !== newStatus) {
          try {
            if (targetEmp && targetEmp.email) {
              notifyEmployeeOfDecision_(targetEmp, date, type, notes, newStatus);
            }
          } catch (e) { console.warn('Employee notify failed: ' + e.message); }
        }

        return { success: true, newBalance };
      }
    }
    return { success: false, error: 'Request not found (may have been modified).' };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Manager files a time-off request on behalf of an employee.
 *  Optionally auto-approves it in the same call (skipping the Pending stage). */
function managerSubmitTimeOff(empId, date, type, notes, autoApprove) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager)
      return { success: false, error: 'Manager access required.' };

    if (!empId) return { success: false, error: 'No employee selected.' };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return { success: false, error: 'Invalid date format (expected yyyy-MM-dd).' };
    if (!type) return { success: false, error: 'Leave type required.' };

    const targetEmp = lookupEmployeeById_(empId);
    if (!targetEmp) return { success: false, error: 'Employee not found.' };

    const status = autoApprove ? 'Approved' : 'Pending';
    const submittedAt = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
    getOrCreateTimeOffSheet_()
      .appendRow([targetEmp.id, targetEmp.name, date, type, notes || '', status, submittedAt]);

    // Apply leave deduction immediately if auto-approving
    let newBalance = null;
    if (autoApprove && CONFIG.ENABLE_PTO_TRACKING) {
      const dedu = getLeaveDeduction_(type);
      if (dedu.bucket) newBalance = adjustLeaveBalance_(empId, dedu.bucket, -dedu.days);
    }

    writeAuditLog_(targetEmp, 'TimeOffRequest', date, '', false, 0,
      `${type}${notes ? ' — ' + notes : ''} (filed by manager${autoApprove ? ', auto-approved' : ''})`,
      callerEmp.email);

    // Only notify employee when auto-approving (Pending is just a queued item, no need to email yet)
    if (autoApprove) {
      try {
        if (targetEmp.email) {
          notifyEmployeeOfDecision_(targetEmp, date, type, notes || '', status);
        }
      } catch (e) { console.warn('Employee notify failed: ' + e.message); }
    }

    return { success: true, newBalance, status };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Manager deletes a single punch within the delete window. */
function deletePunch(empId, date, time, punchType) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };

    const today = fmtDate_(new Date());
    const daysBack = Math.abs(daysBetween_(date, today));
    if (daysBack > CONFIG.MGR_DELETE_WINDOW_DAYS) {
      return { success: false, error:
        `Cannot delete punches older than ${CONFIG.MGR_DELETE_WINDOW_DAYS} days.` };
    }
    if (!PUNCH_LABELS_.includes(punchType))
      return { success: false, error: 'Invalid punch type.' };

    const sheet = getAdpSS_().getSheetByName(CONFIG.ADP_TAB);
    const rows = sheet.getDataRange().getValues();
    for (let i = 2; i < rows.length; i++) {
      if (String(rows[i][ADP.EMP_ID]).trim() !== empId) continue;
      if (normalizeDate_(rows[i][ADP.DATE]) !== date) continue;
      if (normalizeTime_(rows[i][ADP.TIME]).trim() !== time) continue;
      if (normalizeType_(String(rows[i][ADP.COMMENTS])) !== punchType) continue;

      sheet.deleteRow(i + 1);
      // Mirror clear to personal sheet if any
      const targetEmp = lookupEmployeeById_(empId);
      if (targetEmp && targetEmp.sheetId) {
        try { clearFromEmployeeSheet_(targetEmp, date, punchType); }
        catch (e) { console.warn('clearFromEmployeeSheet_ failed: ' + e.message); }
      }
      const targetForAudit = targetEmp || { id: empId, name: empId, email: '' };
      writeAuditLog_(targetForAudit, 'PunchDelete', date, time, false, 0,
        `${punchType} removed by manager`, callerEmp.email);
      return { success: true };
    }
    return { success: false, error: 'Punch not found (may have already been removed).' };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Employee self-undo of a recent live punch (today, within SELF_UNDO_WINDOW_SECONDS).
 *  Adjustments are NOT eligible — use Adjust to fix those. */
function selfDeletePunch(date, time, punchType) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Employee not found.' };
    if (!PUNCH_LABELS_.includes(punchType))
      return { success: false, error: 'Invalid punch type.' };

    const empTz = empTz_(emp);
    const todayStr = fmtDateTz_(new Date(), empTz);
    if (date !== todayStr) {
      return { success: false, error: 'You can only undo today\'s punches. For older corrections, use Adjust.' };
    }

    const nowTime = fmtTimeTz_(new Date(), empTz);
    const secondsSince = timeDiffSeconds_(time, nowTime);
    if (secondsSince < 0 || secondsSince > CONFIG.SELF_UNDO_WINDOW_SECONDS) {
      const mins = Math.round(CONFIG.SELF_UNDO_WINDOW_SECONDS / 60);
      return { success: false, error:
        `Self-undo only works within ${mins} minutes of the punch. Use Adjust to fix older entries.` };
    }

    const sheet = getAdpSS_().getSheetByName(CONFIG.ADP_TAB);
    const rows = sheet.getDataRange().getValues();
    for (let i = 2; i < rows.length; i++) {
      if (String(rows[i][ADP.EMP_ID]).trim() !== emp.id) continue;
      if (normalizeDate_(rows[i][ADP.DATE]) !== date) continue;
      if (normalizeTime_(rows[i][ADP.TIME]).trim() !== time) continue;
      const rawComment = String(rows[i][ADP.COMMENTS]);
      if (normalizeType_(rawComment) !== punchType) continue;
      // Block self-undo of adjustments — those are deliberate edits, must use Adjust again
      if (rawComment.indexOf('ADJ-') === 0) {
        return { success: false, error:
          'Cannot self-undo an adjustment. Use Adjust again to fix it.' };
      }
      sheet.deleteRow(i + 1);
      if (emp.sheetId) {
        try { clearFromEmployeeSheet_(emp, date, punchType); }
        catch (e) { console.warn('clearFromEmployeeSheet_ failed: ' + e.message); }
      }
      writeAuditLog_(emp, 'PunchSelfUndo', date, time, false, 0, `${punchType} self-undone`);
      return { success: true };
    }
    return { success: false, error: 'Punch not found (may have already been removed).' };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Lightweight teammate-status view for the Clock page.
 *  Returns name + status only — no email, no internal IDs, no last-punch detail. */
function getTeammateStatus() {
  try {
    if (!CONFIG.SHOW_TEAMMATE_STATUS) return { enabled: false, teammates: [] };
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };

    const rows = getEmployeeRosterRows_();
    const employees = [];
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][EMP.EMAIL]) continue;
      const id = String(rows[i][EMP.ID]).trim();
      let tzRaw = rows[i][EMP.TIMEZONE];
      if (tzRaw === null || tzRaw === undefined) tzRaw = '';
      const tz = String(tzRaw).trim() || CONFIG.TIMEZONE;
      employees.push({ id, name: String(rows[i][EMP.NAME]).trim(), tz });
    }

    // Gather today's last punch per employee in their own tz
    const adpRows = getAdpSS_().getSheetByName(CONFIG.ADP_TAB).getDataRange().getValues();
    const todayByEmp = {};
    employees.forEach(e => { todayByEmp[e.id] = { today: fmtDateTz_(new Date(), e.tz), last: null }; });
    for (let i = 2; i < adpRows.length; i++) {
      const id = String(adpRows[i][ADP.EMP_ID]).trim();
      const slot = todayByEmp[id];
      if (!slot) continue;
      if (normalizeDate_(adpRows[i][ADP.DATE]) !== slot.today) continue;
      const time = normalizeTime_(adpRows[i][ADP.TIME]);
      const type = normalizeType_(String(adpRows[i][ADP.COMMENTS]));
      if (!slot.last || time > slot.last.time) slot.last = { time, type };
    }

    const teammates = employees.map(e => {
      const slot = todayByEmp[e.id];
      const last = slot ? slot.last : null;
      let status = 'not_in';
      if (last) {
        if (last.type === 'ClockIn' || last.type === 'LunchIn') status = 'clocked_in';
        else if (last.type === 'LunchOut') status = 'on_lunch';
        else if (last.type === 'ClockOut') status = 'clocked_out';
      }
      return {
        name: e.name,
        status,
        isSelf: e.id === emp.id,
      };
    });
    // Sort: active first, then on lunch, then idle, then done
    const rank = { clocked_in: 0, on_lunch: 1, not_in: 2, clocked_out: 3 };
    teammates.sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name));
    return { enabled: true, teammates };
  } catch (err) { return { error: err.message }; }
}

/** Returns the list of registered employees (for the manager edit picker). */
function getEmployeesList() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const rows = getEmployeeRosterRows_();
    const employees = [];
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][EMP.EMAIL]) continue;
      let tzRaw = rows[i][EMP.TIMEZONE];
      if (tzRaw === null || tzRaw === undefined) tzRaw = '';
      const tz = String(tzRaw).trim() || CONFIG.TIMEZONE;
      employees.push({
        id: String(rows[i][EMP.ID]).trim(),
        name: String(rows[i][EMP.NAME]).trim(),
        timezone: tz,
        tzAbbr: tzAbbr_(tz),
      });
    }
    employees.sort((a, b) => a.name.localeCompare(b.name));
    return { employees };
  } catch (err) { return { error: err.message }; }
}

/** Manager-gated wrapper around buildTimesheetForEmployee_ for any employee. */
function getEmployeeTimesheetForManager(targetEmpId, startDate, endDate) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const target = lookupEmployeeById_(targetEmpId);
    if (!target) return { error: 'Employee not found.' };
    return buildTimesheetForEmployee_(target, startDate, endDate);
  } catch (err) { return { error: err.message }; }
}

/**
 * Manager commits a "desired state" for one employee's day. The slots object
 * has at most four keys (ClockIn / LunchOut / LunchIn / ClockOut) each with
 * an HH:mm string or empty string. The server diffs against current state
 * and applies add/edit/delete per slot, writing one audit row per change.
 */
function managerSaveDay(targetEmpId, date, slots, reason) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    if (!targetEmpId) return { success: false, error: 'No employee specified.' };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return { success: false, error: 'Invalid date format.' };

    const targetEmp = lookupEmployeeById_(targetEmpId);
    if (!targetEmp) return { success: false, error: 'Employee not found.' };

    const empTz = empTz_(targetEmp);
    const todayStr = fmtDateTz_(new Date(), empTz);
    const daysBack = daysBetween_(date, todayStr);
    if (daysBack < 0) return { success: false, error: 'Cannot edit future dates.' };
    if (daysBack > CONFIG.ADJUST_WINDOW_DAYS) {
      return { success: false, error:
        `Cannot edit dates more than ${CONFIG.ADJUST_WINDOW_DAYS} days back.` };
    }

    // Validate slot time formats
    const cleanSlots = {};
    for (let k = 0; k < PUNCH_LABELS_.length; k++) {
      const type = PUNCH_LABELS_[k];
      const raw = String((slots && slots[type]) || '').trim();
      if (raw && !/^([01]\d|2[0-3]):[0-5]\d$/.test(raw))
        return { success: false, error: `Invalid time for ${type}: "${raw}" (expected HH:mm, 24-hour)` };
      cleanSlots[type] = raw;
    }

    // Reason requirement
    const trimmedReason = String(reason || '').trim();
    if (daysBack > CONFIG.OLD_ADJUST_ALERT_DAYS && !trimmedReason) {
      return { success: false, error:
        `A reason is required for edits more than ${CONFIG.OLD_ADJUST_ALERT_DAYS} days back.` };
    }
    const noteSuffix = trimmedReason ? ` — ${trimmedReason}` : '';

    // Snapshot current state for this employee/date
    const sheet = getAdpSS_().getSheetByName(CONFIG.ADP_TAB);
    const allRows = sheet.getDataRange().getValues();
    const currentByType = {};
    for (let i = 2; i < allRows.length; i++) {
      if (String(allRows[i][ADP.EMP_ID]).trim() !== targetEmp.id) continue;
      if (normalizeDate_(allRows[i][ADP.DATE]) !== date) continue;
      const type = normalizeType_(String(allRows[i][ADP.COMMENTS]));
      if (PUNCH_LABELS_.indexOf(type) < 0) continue;
      currentByType[type] = {
        rowIndex: i + 1,
        time: normalizeTime_(allRows[i][ADP.TIME]).trim(),
      };
    }

    const changes = [];

    // Pass 1: deletions (sort descending so row shifts don't break later indices)
    const deletions = [];
    PUNCH_LABELS_.forEach(type => {
      const newTime = cleanSlots[type];
      const cur = currentByType[type];
      if (cur && !newTime) deletions.push({ rowIndex: cur.rowIndex, type, oldTime: cur.time });
    });
    deletions.sort((a, b) => b.rowIndex - a.rowIndex);
    deletions.forEach(d => {
      sheet.deleteRow(d.rowIndex);
      try { clearFromEmployeeSheet_(targetEmp, date, d.type); } catch (e) {}
      writeAuditLog_(targetEmp, 'PunchDelete', date, d.oldTime, false, 0,
        `${d.type} removed by manager${noteSuffix}`, callerEmp.email);
      changes.push({ type: d.type, action: 'delete' });
    });

    // Pass 2: updates (use findExistingPunch_ since indices may have shifted)
    PUNCH_LABELS_.forEach(type => {
      const newTime = cleanSlots[type];
      const cur = currentByType[type];
      if (!cur || !newTime) return;
      const newTimeFull = newTime + ':00';
      if (cur.time === newTimeFull) return;  // no-op
      const existing = findExistingPunch_(targetEmp.id, date, type);
      if (!existing) return;
      const oldTime = cur.time;
      existing.sheet.getRange(existing.rowIndex, ADP.TIME + 1).setValue(newTimeFull);
      existing.sheet.getRange(existing.rowIndex, ADP.COMMENTS + 1).setValue(`ADJ-${type}`);
      if (targetEmp.sheetId) {
        try {
          const dir = ['ClockIn','LunchIn'].indexOf(type) >= 0 ? 'IN' : 'OUT';
          writeToEmployeeSheet_(targetEmp, date, newTimeFull, dir, type);
        } catch (e) {}
      }
      writeAuditLog_(targetEmp, 'PunchEdit', date, newTimeFull, true, daysBack,
        `${type}: ${oldTime} → ${newTimeFull} (manager edit)${noteSuffix}`, callerEmp.email);
      changes.push({ type, action: 'update' });
    });

    // Pass 3: additions
    PUNCH_LABELS_.forEach(type => {
      const newTime = cleanSlots[type];
      const cur = currentByType[type];
      if (cur || !newTime) return;
      const newTimeFull = newTime + ':00';
      const dir = ['ClockIn','LunchIn'].indexOf(type) >= 0 ? 'IN' : 'OUT';
      appendToAdpSheet_(targetEmp, date, newTimeFull, dir, `ADJ-${type}`);
      if (targetEmp.sheetId) {
        try { writeToEmployeeSheet_(targetEmp, date, newTimeFull, dir, type); } catch (e) {}
      }
      writeAuditLog_(targetEmp, 'PunchAdd', date, newTimeFull, true, daysBack,
        `${type} at ${newTimeFull} (manager add)${noteSuffix}`, callerEmp.email);
      changes.push({ type, action: 'add' });
    });

    return {
      success: true,
      changes: changes.length,
      summary: changes.map(c => `${c.action} ${c.type}`).join(', '),
    };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

function exportAdpRange(startDate, endDate) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { error: 'Manager access required.' };
    const result = generateExportSheet_(startDate, endDate, null);
    if (result.error) return result;
    writeAuditLog_(emp, 'AdpExport', startDate + '..' + endDate, '', false, 0,
      `${result.rowCount} rows → ${result.fileId}`);
    return { success: true, url: result.url, fileName: result.fileName, rowCount: result.rowCount };
  } catch (err) { return { error: err.message }; }
}


// ════════════════════════════════════════════════════════════════════════════
//  CALL NOTES MODULE  —  server endpoints
//  ────────────────────────────────────────────────────────────────────────
//  Rolling-note interface for CSR call logging. Each rep's notes live in
//  their own per-rep Sheet (EMP.CALL_NOTES_SHEET_ID, column L), `Notes`
//  tab. The web app's panel logs notes on submit, then offers a separate
//  email-composer action (with preview gate) for the ~10% of notes that
//  also need to fire a department email. Flags come in three flavors:
//  `action` (needs follow-up; pairs with the Resolved column), `training`
//  (rep wants clarification — aggregated for the manager), `review`
//  (5-star review candidate — aggregated for future review-request flow).
// ════════════════════════════════════════════════════════════════════════════

/** Submits a new call note. Logs only — does NOT send any email. Email
 *  composition is a separate two-stage action (preview → confirm) via
 *  previewCallNoteEmail / emailFromCallNote. */
function submitCallNote(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
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
      try { notifyManagerTrainingQuestion_(emp, cleaned.subformData.trainingQuestion, dateLocal); }
      catch (_) {}
    }

    return { success: true, note: createdNote };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
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

    const dateLocal = normalizeDate_(oldRow[CN.DATE_LOCAL]);
    writeAuditLog_(emp, 'CallNoteEdit', dateLocal, '', false, 0,
      `noteId=${noteId}; changed: ${diffs.join(', ') || '(no changes)'}`);

    const updatedRow = sheet.getRange(located.rowIndex, 1, 1, CN_HEADERS.length).getValues()[0];
    return { success: true, note: callNoteRowToObject_({ row: updatedRow, rowIndex: located.rowIndex }) };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Sets (or clears) the flag type on a note. Pass '' to clear. */
function setCallNoteFlag(noteId, flagType) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Employee not found.' };
    const t = sanitizeFlagType_(flagType);
    const sheet = getCallNotesSheet_(emp);
    const located = findCallNoteRow_(sheet, noteId);
    if (!located) return { success: false, error: 'Note not found.' };

    // Any flag transition resets Resolved — stale resolved=TRUE from a prior
    // action-flag cycle would mislead the rep when re-flagging (and would be
    // hidden from them since the resolve UI only shows for flagType=='action').
    const oldFlag = String(located.row[CN.FLAG_TYPE] || '').trim().toLowerCase();
    sheet.getRange(located.rowIndex, CN.FLAG_TYPE + 1).setValue(t);
    if (oldFlag !== t) sheet.getRange(located.rowIndex, CN.RESOLVED + 1).setValue('FALSE');

    const dateLocal = normalizeDate_(located.row[CN.DATE_LOCAL]);
    writeAuditLog_(emp, 'CallNoteFlag', dateLocal, '', false, 0,
      `noteId=${noteId}; ${t || '<cleared>'}`);
    // (Ambient cache is purely TTL-driven now — see INV-43.)

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

    const dateLocal = normalizeDate_(located.row[CN.DATE_LOCAL]);
    writeAuditLog_(emp, 'CallNoteResolve', dateLocal, '', false, 0,
      `noteId=${noteId}; ${resolved ? 'resolved' : 'unresolved'}`);
    // (Ambient cache is purely TTL-driven now — see INV-43.)

    const updatedRow = sheet.getRange(located.rowIndex, 1, 1, CN_HEADERS.length).getValues()[0];
    return { success: true, note: callNoteRowToObject_({ row: updatedRow, rowIndex: located.rowIndex }) };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Deletes a call note. Hard-delete (Sheet row removed); audit row keeps the trail. */
function deleteCallNote(noteId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Employee not found.' };
    const sheet = getCallNotesSheet_(emp);
    const located = findCallNoteRow_(sheet, noteId);
    if (!located) return { success: false, error: 'Note not found.' };

    const dateLocal = normalizeDate_(located.row[CN.DATE_LOCAL]);
    sheet.deleteRow(located.rowIndex);
    writeAuditLog_(emp, 'CallNoteDelete', dateLocal, '', false, 0,
      `noteId=${noteId}`);
    // (Ambient cache is purely TTL-driven now — see INV-43.)
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

const CN_PIN_LIMIT = 3;  // max personal pins per rep — keeps the pinned tray a focus tool, not a second inbox

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

    // If pinning, scan all rows for existing pin count and reject if at
    // limit. Scan happens inside the lock so two parallel pin requests
    // can't both squeak past the limit.
    if (willPin) {
      const allRows = sheet.getDataRange().getValues();
      let pinnedCount = 0;
      for (let i = 1; i < allRows.length; i++) {
        if (String(allRows[i][CN.NOTE_ID]).trim() === noteId) continue;
        const sfd = allRows[i][CN.SUBFORM_DATA];
        if (!sfd) continue;
        try {
          const parsed = JSON.parse(sfd);
          if (parsed && parsed.pinned) pinnedCount++;
        } catch (e) { /* corrupt blob — skip */ }
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

    const dateLocal = normalizeDate_(located.row[CN.DATE_LOCAL]);
    writeAuditLog_(emp, 'CallNotePin', dateLocal, '', false, 0,
      `noteId=${noteId}; ${willPin ? 'pinned' : 'unpinned'}`);

    const updatedRow = sheet.getRange(located.rowIndex, 1, 1, CN_HEADERS.length).getValues()[0];
    return { success: true, note: callNoteRowToObject_({ row: updatedRow, rowIndex: located.rowIndex }) };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Returns the calling rep's pinned notes across all dates (not just today).
 *  Read-only, no lock. Used by the Log view's pinned tray. */
function getMyPinnedCallNotes() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    if (!emp.callNotesSheetId) return { notes: [] };
    const sheet = getCallNotesSheet_(emp);
    const rows = sheet.getDataRange().getValues();
    const notes = [];
    for (let i = 1; i < rows.length; i++) {
      const note = callNoteRowToObject_({ row: rows[i], rowIndex: i + 1 });
      if (note.subformData && note.subformData.pinned) notes.push(note);
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
    const rows = sheet.getDataRange().getValues();
    const notes = [];
    for (let i = 1; i < rows.length; i++) {
      const rowDate = normalizeDate_(rows[i][CN.DATE_LOCAL]);
      if (rowDate !== date) continue;
      const note = callNoteRowToObject_({ row: rows[i], rowIndex: i + 1 });
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

    const sheet = getCallNotesSheet_(emp);
    const rows = sheet.getDataRange().getValues();
    let unresolvedActionCount = 0;
    let staleActionCount = 0;
    let todayTotal = 0;
    const staleMs = CONFIG.CALL_NOTES.STALE_FLAG_HOURS * 3600 * 1000;
    const nowMs = Date.now();
    for (let i = 1; i < rows.length; i++) {
      const note = callNoteRowToObject_({ row: rows[i], rowIndex: i + 1 });
      if (note.dateLocal === today) todayTotal++;
      if (note.flagType === 'action' && !note.resolved) {
        unresolvedActionCount++;
        const noteMs = parseTimestampMs_(note.timestamp, empTz);
        if (noteMs && (nowMs - noteMs) >= staleMs) staleActionCount++;
      }
    }
    const result = {
      enrolled: true,
      unresolvedActionCount,
      staleActionCount,
      todayTotal,
      staleFlagHours: CONFIG.CALL_NOTES.STALE_FLAG_HOURS,
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
  return {
    departments: Object.keys(getDepartmentEmails_()).concat(['Other']),
    suggestionsByDept: getUpdateSuggestions_(),
    defaultSuggestions: CONFIG.CALL_NOTES.UPDATE_SUGGESTIONS_DEFAULT,
    stateTaxRates: getStateTaxRates_(),
    stateAbbrToName: CONFIG.CALL_NOTES.STATE_ABBR_TO_NAME,
    ccEmail: CONFIG.CALL_NOTES.CC_EMAIL,
    voiceInputEnabled: !!CONFIG.CALL_NOTES.VOICE_INPUT_ENABLED,
  };
}

/** TextFinder-backed search across the rep's notes. field ∈ caller | issue | all.
 *  If exact=true, matches patientAndTrx exactly (case-insensitive, trimmed) and
 *  ignores the field parameter — used by the "Find prior calls for this TRX"
 *  button on note cards to surface repeat-caller history without substring noise. */
function searchMyCallNotes(query, field, dateRange, exact) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    const q = String(query || '').trim();
    if (!q) return { results: [] };
    const empTz = empTz_(emp);
    const f = String(field || 'all').toLowerCase();
    const sheet = getCallNotesSheet_(emp);
    const rows = sheet.getDataRange().getValues();

    const qLower = q.toLowerCase();
    const isExact = exact === true;
    const results = [];
    for (let i = 1; i < rows.length; i++) {
      const note = callNoteRowToObject_({ row: rows[i], rowIndex: i + 1 });
      if (dateRange && dateRange.start && note.dateLocal < dateRange.start) continue;
      if (dateRange && dateRange.end   && note.dateLocal > dateRange.end)   continue;
      let hit = false;
      if (isExact) {
        if (String(note.patientAndTrx || '').toLowerCase().trim() === qLower) hit = true;
      } else {
        if (f === 'caller' || f === 'all') {
          if ((note.caller + ' ' + note.callback + ' ' + note.patientAndTrx)
                .toLowerCase().indexOf(qLower) >= 0) hit = true;
        }
        if (!hit && (f === 'issue' || f === 'all')) {
          if ((note.issue + ' ' + note.resolution).toLowerCase().indexOf(qLower) >= 0) hit = true;
        }
      }
      if (hit) results.push(note);
    }
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (results.length > 200) results.length = 200;
    return { results, timezone: empTz, exact: isExact };
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
      if (!rows[i][EMP.EMAIL]) continue;
      if (!rows[i][EMP.CALL_NOTES_SHEET_ID]) continue;
      reps.push({
        id: String(rows[i][EMP.ID]).trim(),
        name: String(rows[i][EMP.NAME]).trim(),
      });
    }
    reps.sort((a, b) => a.name.localeCompare(b.name));
    return { reps };
  } catch (err) { return { error: err.message }; }
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
    const rows = sheet.getDataRange().getValues();
    const notes = [];
    for (let i = 1; i < rows.length; i++) {
      const rowDate = normalizeDate_(rows[i][CN.DATE_LOCAL]);
      if (rowDate !== dateStr) continue;
      const note = callNoteRowToObject_({ row: rows[i], rowIndex: i + 1 });
      if (!callNoteMatchesFilter_(note, flt)) continue;
      notes.push(note);
    }
    notes.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return { date: dateStr, filter: flt, notes, repName: target.name, repId: target.id, timezone: empTz };
  } catch (err) { return { error: err.message }; }
}

/** Manager search across all enrolled reps' call-notes Sheets. */
function managerSearchCallNotes(query, field, repFilter, dateRange) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const q = String(query || '').trim();
    if (!q) return { results: [] };
    const qLower = q.toLowerCase();
    const f = String(field || 'all').toLowerCase();

    const roster = getEmployeeRosterRows_();
    const results = [];
    for (let r = 1; r < roster.length; r++) {
      const repId = String(roster[r][EMP.ID]).trim();
      if (repFilter && repFilter.length && repFilter.indexOf(repId) < 0) continue;
      const sheetId = roster[r][EMP.CALL_NOTES_SHEET_ID];
      if (!sheetId) continue;
      const repName = String(roster[r][EMP.NAME]).trim();
      let target;
      try {
        target = { id: repId, name: repName, callNotesSheetId: String(sheetId).trim() };
        const sheet = getCallNotesSheet_(target);
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          const note = callNoteRowToObject_({ row: rows[i], rowIndex: i + 1 });
          if (dateRange && dateRange.start && note.dateLocal < dateRange.start) continue;
          if (dateRange && dateRange.end   && note.dateLocal > dateRange.end)   continue;
          let hit = false;
          if (f === 'caller' || f === 'all') {
            if ((note.caller + ' ' + note.callback + ' ' + note.patientAndTrx)
                  .toLowerCase().indexOf(qLower) >= 0) hit = true;
          }
          if (!hit && (f === 'issue' || f === 'all')) {
            if ((note.issue + ' ' + note.resolution).toLowerCase().indexOf(qLower) >= 0) hit = true;
          }
          if (hit) {
            note.repId = repId; note.repName = repName;
            results.push(note);
          }
        }
      } catch (e) {
        // A broken per-rep Sheet shouldn't break the cross-rep search
        console.warn('managerSearchCallNotes skipped rep ' + repId + ': ' + e.message);
      }
    }
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (results.length > 500) results.length = 500;
    return { results };
  } catch (err) { return { error: err.message }; }
}

/** Per-rep stats for a given date — used by the manager Team Notes "Stats"
 *  tab to surface end-of-shift summaries. Walks every enrolled rep's Sheet
 *  once, filters to the requested date, and aggregates:
 *
 *    - totalNotes         total notes filed that day
 *    - flagCounts         { action, training, review } breakdown
 *    - resolvedCount      action-flagged notes that the rep marked resolved
 *    - emailsSent         notes with a non-empty EmailedAt for that date
 *    - medianCompletionS  median of subformData.completionSeconds across
 *                         today's notes that captured one. Median (not mean)
 *                         is resistant to outliers (e.g., a rep walked away
 *                         mid-note for 20 min then submitted).
 *    - shiftSpan          { first, last } HH:mm of first/last note times
 *
 *  Manager-gated. Read-only across all enrolled reps. */
function managerGetShiftStats(date) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return { error: 'Invalid date (expected yyyy-MM-dd).' };

    const roster = getEmployeeRosterRows_();
    const reps = [];
    for (let r = 1; r < roster.length; r++) {
      const sheetId = roster[r][EMP.CALL_NOTES_SHEET_ID];
      if (!sheetId) continue;
      const repId = String(roster[r][EMP.ID]).trim();
      const repName = String(roster[r][EMP.NAME]).trim();
      const stats = {
        repId: repId, repName: repName,
        totalNotes: 0,
        flagCounts: { action: 0, training: 0, review: 0 },
        resolvedCount: 0,
        emailsSent: 0,
        medianCompletionSeconds: null,
        shiftSpan: null,
      };
      const completionTimes = [];
      const noteTimes = [];
      try {
        const sheet = getCallNotesSheet_({ id: repId, name: repName, callNotesSheetId: String(sheetId).trim() });
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          const note = callNoteRowToObject_({ row: rows[i], rowIndex: i + 1 });
          if (note.dateLocal !== date) continue;
          stats.totalNotes++;
          if (note.flagType && stats.flagCounts[note.flagType] !== undefined) {
            stats.flagCounts[note.flagType]++;
          }
          if (note.flagType === 'action' && note.resolved) stats.resolvedCount++;
          if (note.emailedAt) stats.emailsSent++;
          if (note.subformData && typeof note.subformData.completionSeconds === 'number') {
            completionTimes.push(note.subformData.completionSeconds);
          }
          // Timestamp tail (HH:mm) for the shift-span calc
          const m = String(note.timestamp || '').match(/T(\d{2}:\d{2})/);
          if (m) noteTimes.push(m[1]);
        }
      } catch (e) {
        console.warn('managerGetShiftStats skipped rep ' + repId + ': ' + e.message);
      }
      if (completionTimes.length > 0) {
        completionTimes.sort(function (a, b) { return a - b; });
        const mid = Math.floor(completionTimes.length / 2);
        stats.medianCompletionSeconds = (completionTimes.length % 2 === 1)
          ? completionTimes[mid]
          : Math.round((completionTimes[mid - 1] + completionTimes[mid]) / 2);
      }
      if (noteTimes.length > 0) {
        noteTimes.sort();
        stats.shiftSpan = { first: noteTimes[0], last: noteTimes[noteTimes.length - 1] };
      }
      reps.push(stats);
    }
    reps.sort(function (a, b) { return a.repName.localeCompare(b.repName); });
    return { date: date, reps: reps };
  } catch (err) { return { error: err.message }; }
}

function managerGetUnresolvedActionCount() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const roster = getEmployeeRosterRows_();
    let total = 0;
    for (let r = 1; r < roster.length; r++) {
      const sheetId = roster[r][EMP.CALL_NOTES_SHEET_ID];
      if (!sheetId) continue;
      try {
        const sheet = getCallNotesSheet_({
          id: String(roster[r][EMP.ID]).trim(),
          name: String(roster[r][EMP.NAME]).trim(),
          callNotesSheetId: String(sheetId).trim(),
        });
        const flagCol = sheet.getRange(2, CN.FLAG_TYPE + 1, Math.max(sheet.getLastRow() - 1, 1), 2).getValues();
        for (let i = 0; i < flagCol.length; i++) {
          const ft = String(flagCol[i][0] || '').trim().toLowerCase();
          const res = String(flagCol[i][1] || '').trim().toLowerCase();
          if (ft === 'action' && res !== 'true' && res !== 'yes' && res !== '1') total++;
        }
      } catch (_) {}
    }
    return { count: total };
  } catch (err) { return { error: err.message }; }
}

function getAdminConfig() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    return {
      departmentEmails: getDepartmentEmails_(),
      stateTaxRates: getStateTaxRates_(),
      updateSuggestions: getUpdateSuggestions_(),
      defaultSuggestions: CONFIG.CALL_NOTES.UPDATE_SUGGESTIONS_DEFAULT,
    };
  } catch (err) { return { error: err.message }; }
}

function saveUpdateSuggestions(suggestionsJson) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    if (!suggestionsJson || typeof suggestionsJson !== 'object') return { success: false, error: 'Invalid suggestions map.' };
    PropertiesService.getScriptProperties().setProperty('CN_UPDATE_SUGGESTIONS', JSON.stringify(suggestionsJson));
    writeAuditLog_(callerEmp, 'AdminConfigChange', '', '', false, 0,
      'Updated update-type suggestions', callerEmp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
}

function saveDepartmentEmails(deptJson) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    if (!deptJson || typeof deptJson !== 'object') return { success: false, error: 'Invalid department map.' };
    var keys = Object.keys(deptJson);
    for (var i = 0; i < keys.length; i++) {
      var email = String(deptJson[keys[i]] || '').trim();
      if (!email || email.indexOf('@') < 1) return { success: false, error: 'Invalid email for ' + keys[i] + ': ' + email };
    }
    PropertiesService.getScriptProperties().setProperty('CN_DEPARTMENT_EMAILS', JSON.stringify(deptJson));
    writeAuditLog_(callerEmp, 'AdminConfigChange', '', '', false, 0,
      'Updated department emails (' + keys.length + ' depts)', callerEmp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
}

function saveStateTaxRates(ratesJson) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    if (!ratesJson || typeof ratesJson !== 'object') return { success: false, error: 'Invalid rates map.' };
    var keys = Object.keys(ratesJson);
    for (var i = 0; i < keys.length; i++) {
      var rate = parseFloat(ratesJson[keys[i]]);
      if (isNaN(rate) || rate < 0 || rate > 1) return { success: false, error: 'Invalid rate for ' + keys[i] + ': must be 0–1.' };
    }
    PropertiesService.getScriptProperties().setProperty('CN_STATE_TAX_RATES', JSON.stringify(ratesJson));
    writeAuditLog_(callerEmp, 'AdminConfigChange', '', '', false, 0,
      'Updated state tax rates (' + keys.length + ' states)', callerEmp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
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
    for (let r = 1; r < roster.length; r++) {
      const sheetId = roster[r][EMP.CALL_NOTES_SHEET_ID];
      if (!sheetId) continue;
      const repId = String(roster[r][EMP.ID]).trim();
      const repName = String(roster[r][EMP.NAME]).trim();
      try {
        const sheet = getCallNotesSheet_({
          id: repId, name: repName, callNotesSheetId: String(sheetId).trim()
        });
        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) continue;
        const dateCol = sheet.getRange(2, CN.DATE_LOCAL + 1, lastRow - 1, 1).getValues();
        let firstMatch = -1, lastMatch = -1;
        for (let d = 0; d < dateCol.length; d++) {
          const dl = normalizeDate_(dateCol[d][0]);
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
      }
    }

    if (allNotes.length === 0) {
      return { error: `No notes found between ${startDate} and ${endDate}.` };
    }
    allNotes.sort((a, b) => {
      if (a.note.dateLocal !== b.note.dateLocal) return a.note.dateLocal.localeCompare(b.note.dateLocal);
      if (a.repName !== b.repName) return a.repName.localeCompare(b.repName);
      return String(a.note.timestamp).localeCompare(String(b.note.timestamp));
    });

    const stamp = fmtDate_(new Date()).replace(/-/g, '') + '_' + fmtTime_(new Date()).replace(/:/g, '');
    const name = `Call Notes ${startDate} to ${endDate} (${stamp})`;
    const newSs = SpreadsheetApp.create(name);
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

    writeAuditLog_(callerEmp, 'CallNotesExport', startDate + '..' + endDate, '', false, 0,
      `${allNotes.length} notes → ${newSs.getId()}`);

    return {
      success: true,
      url: newSs.getUrl(),
      fileName: name,
      noteCount: allNotes.length,
    };
  } catch (err) { return { error: err.message }; }
}

/** Manager replies to a rep's training-flagged note. The reply is merged
 *  into the note's subformData JSON blob (alongside trainingQuestion), so
 *  no schema migration is needed. Stamps the manager's email + timestamp
 *  for accountability. Pass `reply=''` to clear an existing reply.
 *
 *  Manager-gated. Writes a CallNoteTrainingReply audit row.
 *  Rejects when the target note isn't training-flagged (reply has no
 *  meaning on action/review/unflagged notes). */
function setCallNoteTrainingReply(repEmpId, noteId, reply) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const target = lookupEmployeeById_(repEmpId);
    if (!target) return { success: false, error: 'Employee not found.' };
    if (!target.callNotesSheetId) return { success: false, error: 'This rep has no call-notes Sheet configured.' };

    const sheet = getCallNotesSheet_(target);
    const located = findCallNoteRow_(sheet, noteId);
    if (!located) return { success: false, error: 'Note not found.' };

    const flagType = String(located.row[CN.FLAG_TYPE] || '').trim().toLowerCase();
    if (flagType !== 'training') {
      return { success: false, error: 'Only training-flagged notes can carry a reply.' };
    }

    // Merge into existing subformData (preserves trainingQuestion + anything
    // else that may live there). On clear, drop the reply keys entirely.
    let subformData = null;
    if (located.row[CN.SUBFORM_DATA]) {
      try { subformData = JSON.parse(located.row[CN.SUBFORM_DATA]); }
      catch (e) { subformData = null; }
    }
    if (!subformData || typeof subformData !== 'object') subformData = {};

    const trimmed = String(reply || '').trim();
    const empTz = target.timezone || CONFIG.TIMEZONE;
    if (trimmed) {
      subformData.trainingReply = trimmed;
      subformData.trainingReplyBy = callerEmp.email;
      subformData.trainingReplyAt = Utilities.formatDate(new Date(), empTz, "yyyy-MM-dd'T'HH:mm:ss");
    } else {
      delete subformData.trainingReply;
      delete subformData.trainingReplyBy;
      delete subformData.trainingReplyAt;
    }
    sheet.getRange(located.rowIndex, CN.SUBFORM_DATA + 1).setValue(JSON.stringify(subformData));

    const dateLocal = normalizeDate_(located.row[CN.DATE_LOCAL]);
    writeAuditLog_(target, 'CallNoteTrainingReply', dateLocal, '', false, 0,
      `noteId=${noteId}; ${trimmed ? 'reply set' : 'reply cleared'}`,
      callerEmp.email);

    const updatedRow = sheet.getRange(located.rowIndex, 1, 1, CN_HEADERS.length).getValues()[0];
    return { success: true, note: callNoteRowToObject_({ row: updatedRow, rowIndex: located.rowIndex }) };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Manager aggregated training-queue across all enrolled reps. */
function managerGetTrainingQueue(dateRange) {
  return managerAggregateFlagged_('training', dateRange);
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
    for (let r = 1; r < roster.length; r++) {
      const sheetId = roster[r][EMP.CALL_NOTES_SHEET_ID];
      if (!sheetId) continue;
      const repId = String(roster[r][EMP.ID]).trim();
      const repName = String(roster[r][EMP.NAME]).trim();
      try {
        const sheet = getCallNotesSheet_({ id: repId, name: repName, callNotesSheetId: String(sheetId).trim() });
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          const note = callNoteRowToObject_({ row: rows[i], rowIndex: i + 1 });
          if (note.flagType !== flagType) continue;
          if (dateRange && dateRange.start && note.dateLocal < dateRange.start) continue;
          if (dateRange && dateRange.end   && note.dateLocal > dateRange.end)   continue;
          note.repId = repId; note.repName = repName;
          results.push(note);
        }
      } catch (e) {
        console.warn('managerAggregateFlagged_ skipped rep ' + repId + ': ' + e.message);
      }
    }
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return { flagType, results };
  } catch (err) { return { error: err.message }; }
}


// ── Call Notes helpers (private) ────────────────────────────────────────

function sanitizeCallNotePayload_(p) {
  const s = (v) => (v === null || v === undefined) ? '' : String(v).trim();
  return {
    callback:       s(p.callback),
    caller:         s(p.caller),
    relationship:   s(p.relationship),
    patientAndTrx:  s(p.patientAndTrx || p.patientAndTRX),
    issue:          s(p.issue),
    transferredTo:  s(p.transferredTo),
    resolution:     s(p.resolution),
    flagType:       s(p.flagType).toLowerCase(),
    subform:        s(p.subform).toLowerCase(),
    subformData:    p.subformData || null,
  };
}

function validateCallNotePayload_(cleaned) {
  // Logging is generous — only require the rep typed *something* meaningful.
  // Empty notes are useless; everything else is the rep's call.
  const anyContent = cleaned.callback || cleaned.caller || cleaned.patientAndTrx
                  || cleaned.issue || cleaned.resolution;
  if (!anyContent) return { error: 'Note is empty. Fill at least one field before submitting.' };
  if (cleaned.flagType && CN_FLAG_TYPES.indexOf(cleaned.flagType) < 0) {
    return { error: 'Invalid flag type. Expected: ' + CN_FLAG_TYPES.join(', ') };
  }
  return { ok: true };
}

function sanitizeFlagType_(t) {
  const v = String(t || '').trim().toLowerCase();
  return CN_FLAG_TYPES.indexOf(v) >= 0 ? v : '';
}

function findCallNoteRow_(sheet, noteId) {
  if (!noteId) return null;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][CN.NOTE_ID]).trim() === noteId) {
      return { rowIndex: i + 1, row: rows[i] };
    }
  }
  return null;
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
    timestamp:        String(row[CN.TIMESTAMP] || ''),
    dateLocal:        normalizeDate_(row[CN.DATE_LOCAL]),
    callback:         String(row[CN.CALLBACK] || ''),
    caller:           String(row[CN.CALLER] || ''),
    relationship:     String(row[CN.RELATIONSHIP] || ''),
    patientAndTrx:    String(row[CN.PATIENT_TRX] || ''),
    issue:            String(row[CN.ISSUE] || ''),
    transferredTo:    String(row[CN.TRANSFERRED_TO] || ''),
    resolution:       String(row[CN.RESOLUTION] || ''),
    flagType:         String(row[CN.FLAG_TYPE] || '').toLowerCase(),
    resolved,
    emailedAt:        String(row[CN.EMAILED_AT] || ''),
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
    case 'all':
    default:           return true;
  }
}

/** Parse a "yyyy-MM-dd'T'HH:mm:ss" timestamp string back to epoch ms in the rep's tz. */
function parseTimestampMs_(tsStr, tz) {
  if (!tsStr) return null;
  try {
    const d = Utilities.parseDate(tsStr, tz, "yyyy-MM-dd'T'HH:mm:ss");
    return d.getTime();
  } catch (e) { return null; }
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

const CN_EMAIL_PALETTE = {
  paperCard:    '#ffffff',
  paper:        '#f6f7f9',
  paper2:       '#eceef2',
  ink:          '#101418',
  muted:        '#606872',
  line:         '#dadde3',
  accent:       '#3565b8',      // resolved oklch(55% 0.12 240)
  accentSoft:   '#e6ecf6',      // resolved oklch(93% 0.04 240)
  accentDeep:   '#1e3a6e',
  good:         '#3d8c6b',
  goodSoft:     '#e6f1ec',
  goodDeep:     '#1f4d3a',
  warn:         '#c25b1a',
  warnSoft:     '#fbeede',
  warnDeep:     '#693012',
  danger:       '#c0392b',
  dangerSoft:   '#fae8e6',
  dangerDeep:   '#6e1f17',
  // UMS brand navy + pale-blue alternating-row tint. These match the legacy
  // dept-email aesthetic (closeOrderEmail.js, updateOrderEmail.js) so emails
  // sent from the new web app look continuous with the prior tooling.
  brand:        '#223b5d',
  brandSoft:    '#e6f2ff',
  logoUrl:      'https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/UMS%20Presentation%20Logo.jpg',
};

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

    // Send first. If MailApp throws, nothing is stamped and the rep sees a clean failure.
    try {
      MailApp.sendEmail({
        to: recipientList.to,
        cc: CONFIG.CALL_NOTES.CC_EMAIL,
        subject,
        body: textBody,
        htmlBody,
      });
    } catch (sendErr) {
      return { success: false, error: 'Email send failed: ' + sendErr.message };
    }

    // Email is OUT. Past this point we never return failure — a partial stamp
    // would otherwise cause the rep to re-send a duplicate. Batch the two
    // adjacent column writes via setValues to shrink the partial-write window.
    const empTz = empTz_(emp);
    const emailedAt = Utilities.formatDate(new Date(), empTz, "yyyy-MM-dd'T'HH:mm:ss");
    const deptLabel = selections.departments.join(', ');
    try {
      sheet.getRange(located.rowIndex, CN.EMAILED_AT + 1, 1, 2)
        .setValues([[emailedAt, deptLabel]]);
      // Persist subform selection back to the row so the rolling card can
      // re-open the composer with prior settings if the rep needs to re-send.
      if (selections.updateInfo) {
        sheet.getRange(located.rowIndex, CN.SUBFORM + 1, 1, 2).setValues([[
          updateInfoToSubformKey_(selections.updateInfo),
          JSON.stringify(selections),
        ]]);
      }
    } catch (stampErr) {
      console.warn('emailFromCallNote: stamp failed after successful send (noteId=' +
        noteId + '): ' + stampErr.message);
    }

    writeAuditLog_(emp, 'CallNoteEmail', note.dateLocal, '', false, 0,
      `noteId=${noteId}; to=${recipientList.to}; subj="${subject}"`);

    return { success: true, emailedAt, recipients: recipientList.to, subject };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

function sanitizeEmailSelections_(payload) {
  const s = (v) => (v === null || v === undefined) ? '' : String(v).trim();
  const arr = (v) => Array.isArray(v) ? v.map(s).filter(x => x.length > 0) : [];
  return {
    departments:     arr(payload.departments),
    individualEmail: s(payload.individualEmail),
    updateInfo:      s(payload.updateInfo),
    callbackNeeded:  !!payload.callbackNeeded,
    overwriteResolution: !!payload.overwriteResolution,
    shippingDetails: payload.shippingDetails || null,
    closeDetails:    payload.closeDetails || null,
    resupplyDetails: payload.resupplyDetails || null,
    oopDetails:      payload.oopDetails || null,
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
  return { ok: true };
}

function resolveEmailRecipients_(selections) {
  const map = getDepartmentEmails_();
  const out = [];
  for (let i = 0; i < selections.departments.length; i++) {
    const dept = selections.departments[i];
    if (dept === 'Other') {
      out.push(selections.individualEmail);
    } else {
      const addr = map[dept];
      if (!addr) return { error: 'Unknown department: ' + dept };
      out.push(addr);
    }
  }
  return { to: out.join(', ') };
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
  text += `\n${paymentStatus}: $${oop.totalCost} (Base: $${oop.baseCost} + Est. Sales Tax: ${taxFmt} + Ship: $${oop.shippingCost})`;
  text += `\nVerified Addr: ${ship.verifiedAddr ? 'Yes' : 'No'}`;
  if (ship.verifiedAddrText) text += ` (${ship.verifiedAddrText})`;
  text += ` | Loc: ${ship.patientLoc}`;
  text += ` | Docs: ${ship.docsTo}`;
  if (ship.deliveryEmail) text += ` (${ship.deliveryEmail})`;
  if (ship.specialNote) text += `\nNote: ${ship.specialNote}`;
  return text;
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
  let tplSoft  = P.brandSoft;
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
    resolutionText = generateOOPResolutionText_(selections).replace(/\n/g, '<br>');
  } else {
    resolutionText = esc_(resolutionText);
  }

  // ── Call Details table — UMS navy header + pale-blue alternating rows
  //    (legacy aesthetic from closeOrderEmail.js / updateOrderEmail.js) ─
  const detailsRows = [
    ['Callback Number', esc_(callData.callBackNumber), false],
    ['Caller Name',     esc_(callData.callerName), false],
    ['Relationship',    esc_(callData.relationship), false],
    ['Patient & TRX',   esc_(callData.patientAndTrx), true],
    ['Issue',           esc_(callData.issue), false],
    ['Transferred To',  esc_(callData.transferredTo), false],
    ['Resolution',      resolutionText, false],
  ];
  const detailsBodyHtml = detailsRows.map(function (r, i) {
    const bg = (i % 2 === 0) ? P.paperCard : P.brandSoft;
    const weight = r[2] ? 'font-weight:600;' : '';
    return `<tr style="background:${bg};">` +
      `<td style="padding:9px 12px;border-top:1px solid ${P.line};font-weight:600;width:34%;color:${P.brand};">${r[0]}</td>` +
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
    `<div style="background:${P.goodSoft};border:1px solid color-mix(in srgb,${P.good},transparent 60%);` +
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
    `<div style="background:${P.goodSoft};border:1px solid color-mix(in srgb,${P.good},transparent 60%);` +
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
  return (
    `<div style="background:${P.warnSoft};border:1px solid color-mix(in srgb,${P.warn},transparent 60%);` +
    `padding:14px;border-radius:8px;margin:14px 0;border-left:3px solid ${P.warn};">` +
      `<h3 style="margin:0 0 8px;font-family:'Inter Tight','Inter',sans-serif;font-size:15px;color:${P.warnDeep};font-weight:600;">OOP Order Breakdown</h3>` +
      `<table style="width:100%;border-collapse:collapse;font-size:13px;color:${P.ink};">` +
        `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};width:38%;">Base Cost</td><td style="padding:5px 8px;">$${esc_(d.baseCost || '')}</td></tr>` +
        `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};">Est. Sales Tax</td><td style="padding:5px 8px;">${esc_(taxDisplay)}</td></tr>` +
        `<tr><td style="padding:5px 8px;font-weight:600;color:${P.muted};">Shipping</td><td style="padding:5px 8px;">$${esc_(d.shippingCost || '')} <span style="color:${P.muted};font-size:.85em;">(${esc_(d.shippingLabel || '')})</span></td></tr>` +
        `<tr><td style="padding:7px 8px 5px;font-weight:600;color:${P.muted};border-top:1px solid color-mix(in srgb,${P.warn},transparent 60%);">Total Customer Cost</td><td style="padding:7px 8px 5px;font-weight:700;color:${P.warnDeep};border-top:1px solid color-mix(in srgb,${P.warn},transparent 60%);">$${esc_(d.totalCost || '')}</td></tr>` +
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

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}


// ════════════════════════════════════════════════════════════════════════════
//  AUTOMATION
// ════════════════════════════════════════════════════════════════════════════

function installAutomationTriggers() {
  // Use getActiveUserEmail_() so test impersonation via _TEST_OVERRIDE_EMAIL
  // is respected, and getManagerEmails_() so the Script-Properties override
  // is respected — matches the auth path of every other manager-gated
  // function.
  const userEmail = String(getActiveUserEmail_() || '').toLowerCase();
  const allowed = getManagerEmails_().map(e => String(e).toLowerCase());
  if (!userEmail || allowed.indexOf(userEmail) < 0) {
    throw new Error('Only managers (per MANAGER_EMAILS) can install triggers. ' +
                    `Current user: ${userEmail || '<unknown>'}`);
  }
  const TARGETS = [
    'sendDailyMissedPunchAlerts',
    'runDailyExportCheck',
    'sendCallNotesEodDigest',
    'sendCallNotesWeeklyDigests',
  ];
  ScriptApp.getProjectTriggers().forEach(t => {
    if (TARGETS.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendDailyMissedPunchAlerts')
    .timeBased().atHour(CONFIG.AUTO_MISSED_ALERT_HOUR_IST).everyDays(1)
    .inTimezone(CONFIG.TIMEZONE).create();
  ScriptApp.newTrigger('runDailyExportCheck')
    .timeBased().atHour(CONFIG.AUTO_EXPORT_HOUR_IST).everyDays(1)
    .inTimezone(CONFIG.TIMEZONE).create();
  // Call Notes EOD warning — runs once at the manager-tz EOD hour; the
  // handler walks the roster, computes per-rep local time, and only emails
  // reps whose local time is currently within the EOD window. One trigger
  // serves all timezones; reps in different zones get their digest as
  // their local 5pm rolls around (within the wider window).
  ScriptApp.newTrigger('sendCallNotesEodDigest')
    .timeBased().atHour(CONFIG.CALL_NOTES.EOD_WARNING_HOUR).everyDays(1)
    .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
  // Weekly manager digests for training queue + review candidates
  ScriptApp.newTrigger('sendCallNotesWeeklyDigests')
    .timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(8)
    .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
  Logger.log('Automation triggers installed by ' + userEmail + '.');

  // Trigger-ownership warning: Apps Script time-triggers are owned by the
  // installing user, and ScriptApp.getProjectTriggers() only returns triggers
  // owned by the *current* user. If a different account previously installed
  // these triggers, they are still firing under that account but invisible
  // here — leading to duplicate emails / exports. We can't detect that
  // programmatically, so surface the risk via email instead.
  try {
    const recipients = getManagerEmails_();
    if (recipients.length > 0) {
      MailApp.sendEmail({
        to: recipients.join(','),
        subject: `UMS Team Tools — automation triggers installed by ${userEmail}`,
        body:
          `installAutomationTriggers() ran as ${userEmail}.\n\n` +
          `Triggers installed:\n` +
          TARGETS.map(function (t) { return '  • ' + t; }).join('\n') + '\n\n' +
          `Reminder: time-based triggers are owned by the installing user, and ` +
          `Apps Script's getProjectTriggers() only returns triggers owned by ` +
          `the current user. If a different account previously installed these ` +
          `triggers, they are still firing under that account but are invisible ` +
          `to this script run — leading to duplicate emails / exports. If this ` +
          `is the first install on this project, no action is needed; otherwise ` +
          `have the prior installer run removeAutomationTriggers() to dedupe.\n\n` +
          `— UMS Team Tools (automated)`,
      });
    }
  } catch (e) { Logger.log('Trigger-install warning email failed: ' + e.message); }
}

function removeAutomationTriggers() {
  const TARGETS = [
    'sendDailyMissedPunchAlerts',
    'runDailyExportCheck',
    'sendCallNotesEodDigest',
    'sendCallNotesWeeklyDigests',
  ];
  ScriptApp.getProjectTriggers().forEach(t => {
    if (TARGETS.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  Logger.log('Automation triggers removed.');
}

function clearCaches_() {
  // Private (underscore-suffixed) so it is NOT reachable via google.script.run.
  // Run from the Apps Script editor when bumping ROSTER_CACHE_KEY or clearing
  // a stuck cache after a manual Employees-sheet edit.
  CacheService.getScriptCache().removeAll([ROSTER_CACHE_KEY]);
  Logger.log('Caches cleared.');
}

function sendDailyMissedPunchAlerts() {
  // Trigger handlers are top-level (required for time-based triggers) and
  // therefore reachable via google.script.run. Gate on caller-is-manager so a
  // logged-in rep can't fire this from the client. In a trigger context,
  // Session.getActiveUser() returns the installer (always a manager via
  // installAutomationTriggers' own check), so the gate is a no-op for triggers.
  assertManagerCaller_('sendDailyMissedPunchAlerts');
  try {
    const empRows = getEmployeeRosterRows_();
    const now = new Date();
    const employees = {};
    for (let i = 1; i < empRows.length; i++) {
      if (!empRows[i][EMP.EMAIL]) continue;
      let tzRaw = empRows[i][EMP.TIMEZONE];
      if (tzRaw === null || tzRaw === undefined) tzRaw = '';
      const tz = safeTimezone_(String(tzRaw).trim());
      const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
      const id = String(empRows[i][EMP.ID]).trim();
      employees[id] = {
        id, name: String(empRows[i][EMP.NAME]).trim(),
        email: String(empRows[i][EMP.EMAIL]).trim(),
        timezone: tz, yesterdayStr: fmtDateTz_(yesterday, tz),
      };
    }

    const adpRows = getAdpSS_().getSheetByName(CONFIG.ADP_TAB).getDataRange().getValues();
    const punchesByEmp = {};
    for (let i = 2; i < adpRows.length; i++) {
      const id = String(adpRows[i][ADP.EMP_ID]).trim();
      const e = employees[id];
      if (!e) continue;
      if (normalizeDate_(adpRows[i][ADP.DATE]) !== e.yesterdayStr) continue;
      if (!punchesByEmp[id]) punchesByEmp[id] = new Set();
      punchesByEmp[id].add(normalizeType_(String(adpRows[i][ADP.COMMENTS])));
    }

    const missed = [];
    for (const id in punchesByEmp) {
      const types = punchesByEmp[id];
      if (types.has('ClockIn') && !types.has('ClockOut')) {
        const e = employees[id];
        if (e) missed.push(e);
      }
    }
    if (missed.length === 0) { Logger.log('No missed clock-outs.'); return; }

    missed.forEach(emp => {
      try {
        MailApp.sendEmail({
          to: emp.email,
          subject: `⏰ Missing Clock-Out for ${emp.yesterdayStr}`,
          body:
            `Hi ${emp.name},\n\n` +
            `Our records show you clocked in on ${emp.yesterdayStr} (${tzAbbr_(emp.timezone)}) ` +
            `but didn't clock out. Please open the UMS Time Clock app and use the "Adjust" ` +
            `feature to record your clock-out time.\n\n` +
            `If you have any questions, please contact your manager.\n\n` +
            `— UMS Time Clock (automated)\n`,
        });
      } catch (e) { Logger.log('Failed to email employee ' + emp.email + ': ' + e.message); }
    });

    const recipients = getManagerEmails_();
    if (recipients.length > 0) {
      const list = missed.map(e =>
        `• ${e.name} (${e.id}) — ${e.email} — missed ${e.yesterdayStr} ${tzAbbr_(e.timezone)}`).join('\n');
      try {
        MailApp.sendEmail({
          to: recipients.join(','),
          subject: `⏰ Missed Clock-Outs — ${missed.length} employee(s)`,
          body:
            `The following employees clocked in but did not clock out:\n\n${list}\n\n` +
            `Each has been emailed a reminder to fix it via the Adjust feature.\n\n` +
            `Audit log:\nhttps://docs.google.com/spreadsheets/d/${CONFIG.ADP_SS_ID}/edit`,
        });
      } catch (e) { Logger.log('Manager missed-punch digest email failed: ' + e.message); }
    }
  } catch (err) {
    Logger.log('sendDailyMissedPunchAlerts failed: ' + err.message);
  }
}

function runDailyExportCheck() {
  assertManagerCaller_('runDailyExportCheck');  // see sendDailyMissedPunchAlerts note
  try {
    const today = new Date();
    const todayStr = fmtDate_(today);
    if (isLastBusinessDayOfMonth_(today)) {
      sendAutomatedExport_('Monthly', getMonthRange_(today), '📊 Monthly ADP Upload — India Team');
    }
    const biweeklyRange = getCurrentBiweeklyRange_(todayStr);
    if (biweeklyRange && biweeklyRange.end === todayStr) {
      sendAutomatedExport_('Biweekly', biweeklyRange, '📊 Biweekly Payroll Export — Philippines Team');
    }
  } catch (err) {
    Logger.log('runDailyExportCheck failed: ' + err.message);
  }
}

function isLastBusinessDayOfMonth_(date) {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  while (lastDay.getDay() === 0 || lastDay.getDay() === 6) lastDay.setDate(lastDay.getDate() - 1);
  return fmtDate_(date) === fmtDate_(lastDay);
}

function getMonthRange_(date) {
  const y = date.getFullYear(), m = date.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return {
    start: `${y}-${String(m+1).padStart(2,'0')}-01`,
    end:   `${y}-${String(m+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`,
  };
}

function getCurrentBiweeklyRange_(todayStr) {
  const empRows = getEmployeeRosterRows_();
  let anchor = null;
  for (let i = 1; i < empRows.length; i++) {
    const cycle = String(empRows[i][EMP.PAY_CYCLE] || '').toLowerCase();
    if (cycle === 'biweekly' && empRows[i][EMP.PAY_ANCHOR]) {
      anchor = normalizeDate_(empRows[i][EMP.PAY_ANCHOR]);
      break;
    }
  }
  if (!anchor) return null;
  const anchorMs = new Date(anchor + 'T00:00:00Z').getTime();
  const todayMs  = new Date(todayStr + 'T00:00:00Z').getTime();
  const daysDiff = Math.round((todayMs - anchorMs) / 86400000);
  const idx = Math.floor((daysDiff + 13) / 14);
  const endMs = anchorMs + idx * 14 * 86400000;
  const startMs = endMs - 13 * 86400000;
  return { start: isoFromUtc_(new Date(startMs)), end: isoFromUtc_(new Date(endMs)) };
}

function sendAutomatedExport_(payCycleFilter, range, subjectPrefix) {
  const recipients = getManagerEmails_();
  const rangeLabel = `${range.start}..${range.end}`;
  if (recipients.length === 0) {
    Logger.log('No manager emails configured — skipping ' + payCycleFilter + ' export.');
    writeAuditLog_(_SYSTEM_AUDIT_EMP_, 'AdpExportAuto', rangeLabel, '', false, 0,
      `${payCycleFilter} skipped — no managers configured`);
    return;
  }
  try {
    const result = generateExportSheet_(range.start, range.end, payCycleFilter);
    if (result.error) {
      MailApp.sendEmail({
        to: recipients.join(','),
        subject: `${subjectPrefix}: ${result.error}`,
        body: `No export generated for ${range.start} to ${range.end}.\nReason: ${result.error}`,
      });
      writeAuditLog_(_SYSTEM_AUDIT_EMP_, 'AdpExportAuto', rangeLabel, '', false, 0,
        `${payCycleFilter} skipped — ${result.error}`);
      return;
    }
    const xlsxUrl = `https://docs.google.com/spreadsheets/d/${result.fileId}/export?format=xlsx`;
    const blob = UrlFetchApp.fetch(xlsxUrl, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    }).getBlob().setName(result.fileName + '.xlsx');

    MailApp.sendEmail({
      to: recipients.join(','),
      subject: `${subjectPrefix}: ${range.start} to ${range.end}`,
      body:
        `Attached: ADP-format export covering ${range.start} to ${range.end}.\n\n` +
        `Employees:  ${result.employeeCount} (${payCycleFilter})\n` +
        `Rows:       ${result.rowCount}\n\n` +
        `Also accessible as a Google Sheet:\n${result.url}\n\n` +
        `— UMS Time Clock (automated)`,
      attachments: [blob],
    });
    Logger.log(`Automated ${payCycleFilter} export sent: ${result.rowCount} rows.`);
    writeAuditLog_(_SYSTEM_AUDIT_EMP_, 'AdpExportAuto', rangeLabel, '', false, 0,
      `${payCycleFilter} sent: ${result.rowCount} rows → ${result.fileId}`);
  } catch (err) {
    Logger.log(`sendAutomatedExport_(${payCycleFilter}) failed: ` + err.message);
    writeAuditLog_(_SYSTEM_AUDIT_EMP_, 'AdpExportAuto', rangeLabel, '', false, 0,
      `${payCycleFilter} EXCEPTION: ${err.message}`);
    try {
      MailApp.sendEmail({
        to: recipients.join(','),
        subject: `❌ ${subjectPrefix} FAILED`,
        body: `Automated export failed: ${err.message}\n\nRange: ${range.start} to ${range.end}\n\n` +
              `Please run the export manually from the Manage tab in the UMS Time Clock app.`,
      });
    } catch (e) {}
  }
}

// Synthetic "employee" identity for system-initiated audit rows (no real actor).
const _SYSTEM_AUDIT_EMP_ = { id: 'SYSTEM', name: 'Automation', email: 'automation@system' };


// ════════════════════════════════════════════════════════════════════════════
//  CALL NOTES — AUTOMATED EMAIL DIGESTS
//  ────────────────────────────────────────────────────────────────────────
//  Two scheduled jobs:
//
//    sendCallNotesEodDigest()         — runs daily at the manager-tz EOD
//      hour. Walks the roster, computes each enrolled rep's *current*
//      local hour, and emails any rep whose local time is currently
//      within ± EOD_WARNING_WINDOW_MINUTES of CONFIG.CALL_NOTES.EOD_WARNING_HOUR
//      AND has unresolved action-flagged notes from today. The same
//      trigger covers reps across timezones — one shot per day at the
//      manager's EOD captures everyone whose own EOD lines up roughly.
//
//    sendCallNotesWeeklyDigests()    — runs Friday morning. Sends two
//      separate manager-targeted emails: training queue (rep-flagged
//      notes wanting clarification) and review candidates (5-star
//      flagged notes). Both digests cover the current week.
//
//  Both are wrapped in try/catch and never throw (INV-14 — automated
//  emails are best-effort).
// ════════════════════════════════════════════════════════════════════════════

function sendCallNotesEodDigest() {
  assertManagerCaller_('sendCallNotesEodDigest');  // see sendDailyMissedPunchAlerts note
  try {
    const mgrTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
    const windowMin = CONFIG.CALL_NOTES.EOD_WARNING_WINDOW_MINUTES || 30;
    const targetHour = CONFIG.CALL_NOTES.EOD_WARNING_HOUR;
    const now = new Date();
    const roster = getEmployeeRosterRows_();
    let sentCount = 0;
    for (let r = 1; r < roster.length; r++) {
      const emailAddr = String(roster[r][EMP.EMAIL] || '').trim();
      const sheetId = roster[r][EMP.CALL_NOTES_SHEET_ID];
      if (!emailAddr || !sheetId) continue;
      const tzRaw = String(roster[r][EMP.TIMEZONE] || '').trim();
      const tz = safeTimezone_(tzRaw);
      // Rep's local time-of-day in minutes
      const hh = parseInt(Utilities.formatDate(now, tz, 'H'), 10);
      const mm = parseInt(Utilities.formatDate(now, tz, 'm'), 10);
      const localMins = hh * 60 + mm;
      const targetMins = targetHour * 60;
      // Circular distance so a target near midnight (e.g. EOD_WARNING_HOUR=0)
      // doesn't reject reps at 23:45 with a 1425-minute "diff". Currently
      // dormant for the default 17:00 hour, but cheap to be correct.
      const diff = Math.abs(localMins - targetMins);
      const circDist = Math.min(diff, 1440 - diff);
      if (circDist > windowMin) continue;

      const empObj = {
        id: String(roster[r][EMP.ID]).trim(),
        name: String(roster[r][EMP.NAME]).trim(),
        email: emailAddr,
        callNotesSheetId: String(sheetId).trim(),
        timezone: tz,
      };
      const today = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
      let unresolved;
      try {
        const sheet = getCallNotesSheet_(empObj);
        const rows = sheet.getDataRange().getValues();
        unresolved = [];
        for (let i = 1; i < rows.length; i++) {
          if (normalizeDate_(rows[i][CN.DATE_LOCAL]) !== today) continue;
          if (String(rows[i][CN.FLAG_TYPE] || '').toLowerCase() !== 'action') continue;
          const resStr = String(rows[i][CN.RESOLVED] || '').toLowerCase();
          if (resStr === 'true' || resStr === 'yes' || resStr === '1') continue;
          unresolved.push(callNoteRowToObject_({ row: rows[i], rowIndex: i + 1 }));
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
        `<br><span style="color:${P.muted};font-size:12px;">${esc_(n.issue || '')}</span>` +
      `</td>` +
      `</tr>`;
  }).join('');
  const itemsText = unresolvedNotes.map(function (n) {
    const time = n.timestamp.replace(/.*T/, '').substring(0, 5);
    return `  ${time}  ${n.caller || n.patientAndTrx || '—'} — ${n.issue || ''}`;
  }).join('\n');

  const htmlBody = (
    `<div style="background:${P.paper};padding:24px;font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif;color:${P.ink};">` +
      `<div style="max-width:560px;margin:0 auto;background:${P.paperCard};border:1px solid ${P.line};border-radius:10px;padding:22px 24px;">` +
        `<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:${P.muted};letter-spacing:.14em;text-transform:uppercase;">End of day · UMS Call Notes</div>` +
        `<h2 style="margin:6px 0 4px;font-family:'Inter Tight','Inter',sans-serif;font-size:20px;font-weight:500;letter-spacing:-.01em;">Hey ${esc_(emp.name.split(' ')[0])} — quick check</h2>` +
        `<p style="color:${P.muted};font-size:13px;margin:0 0 14px;">You flagged the following notes today for follow-up but haven't marked them resolved yet:</p>` +
        `<table style="width:100%;border-collapse:collapse;border:1px solid ${P.line};border-radius:6px;overflow:hidden;">` +
          `<tr style="background:${P.warnSoft};"><td colspan="2" style="padding:8px 12px;color:${P.warnDeep};font-weight:600;font-size:13px;">${unresolvedNotes.length} unresolved</td></tr>` +
          itemsHtml +
        `</table>` +
        `<p style="color:${P.muted};font-size:12px;margin:14px 0 0;">Hop into the web app, knock these out, and toggle them resolved when done.</p>` +
      `</div>` +
      `<div style="text-align:center;margin-top:14px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:${P.muted};letter-spacing:.12em;text-transform:uppercase;">UMS Team Tools</div>` +
    `</div>`
  );
  const textBody = `Hi ${emp.name.split(' ')[0]},\n\n` +
    `You have ${unresolvedNotes.length} unresolved action-flagged note(s) from today:\n\n` +
    itemsText + '\n\nMark them resolved in the web app when done.\n\n— UMS Team Tools';
  MailApp.sendEmail({
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
    if (training.results && training.results.length > 0) {
      sendManagerFlagDigest_(mgrEmails, 'Training Queue', training.results, dateRange);
    }
    if (review.results && review.results.length > 0) {
      sendManagerFlagDigest_(mgrEmails, 'Review Candidates', review.results, dateRange);
    }
    Logger.log(`sendCallNotesWeeklyDigests: training=${(training.results || []).length}, review=${(review.results || []).length}`);
  } catch (err) {
    Logger.log('sendCallNotesWeeklyDigests failed: ' + err.message);
  }
}

function sendManagerFlagDigest_(toEmails, label, notes, dateRange) {
  const P = CN_EMAIL_PALETTE;
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
  const itemsHtml = notes.map(function (n) {
    const q = tq(n);
    const reply = tr(n);
    const qLine = q ? `<br><span style="color:${P.accentDeep};font-size:12px;font-style:italic;">Q: ${esc_(q)}</span>` : '';
    const rLine = reply ? `<br><span style="color:${P.goodDeep};font-size:12px;">A: ${esc_(reply)}</span>` : '';
    return `<tr>` +
      `<td style="padding:7px 10px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:${P.muted};vertical-align:top;white-space:nowrap;">${esc_(n.dateLocal)}</td>` +
      `<td style="padding:7px 10px;color:${P.ink};font-size:13px;">` +
        `<strong>${esc_(n.repName)}</strong> · ${esc_(n.caller || n.patientAndTrx || '—')}` +
        `<br><span style="color:${P.muted};font-size:12px;">${esc_(n.issue || '')}</span>` +
        (n.resolution ? `<br><span style="color:${P.muted};font-size:12px;">→ ${esc_(n.resolution)}</span>` : '') +
        qLine + rLine +
      `</td>` +
      `</tr>`;
  }).join('');
  const itemsText = notes.map(function (n) {
    const q = tq(n);
    const reply = tr(n);
    return `  ${n.dateLocal}  ${n.repName} · ${n.caller || n.patientAndTrx || '—'}\n` +
           `    ${n.issue || ''}` +
           (n.resolution ? `\n    → ${n.resolution}` : '') +
           (q ? `\n    Q: ${q}` : '') +
           (reply ? `\n    A: ${reply}` : '');
  }).join('\n\n');

  const htmlBody = (
    `<div style="background:${P.paper};padding:24px;font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif;color:${P.ink};">` +
      `<div style="max-width:640px;margin:0 auto;background:${P.paperCard};border:1px solid ${P.line};border-radius:10px;padding:22px 24px;">` +
        `<div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:${P.muted};letter-spacing:.14em;text-transform:uppercase;">Weekly digest · UMS Call Notes</div>` +
        `<h2 style="margin:6px 0 4px;font-family:'Inter Tight','Inter',sans-serif;font-size:20px;font-weight:500;letter-spacing:-.01em;">${esc_(label)}</h2>` +
        `<p style="color:${P.muted};font-size:13px;margin:0 0 14px;">${esc_(dateRange.start)} → ${esc_(dateRange.end)} · ${notes.length} note${notes.length === 1 ? '' : 's'}</p>` +
        `<table style="width:100%;border-collapse:collapse;border:1px solid ${P.line};border-radius:6px;overflow:hidden;">${itemsHtml}</table>` +
      `</div>` +
      `<div style="text-align:center;margin-top:14px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:${P.muted};letter-spacing:.12em;text-transform:uppercase;">UMS Team Tools</div>` +
    `</div>`
  );
  const textBody = `${label}\n${dateRange.start} → ${dateRange.end} · ${notes.length} note(s)\n\n${itemsText}\n\n— UMS Team Tools`;
  try {
    MailApp.sendEmail({
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

function generateExportSheet_(startDate, endDate, cycleFilter) {
  const sourceSheet = getAdpSS_().getSheetByName(CONFIG.ADP_TAB);
  const rows = sourceSheet.getDataRange().getValues();
  if (rows.length < 3) return { error: 'No timesheet data found.' };

  let allowedIds = null;
  let employeeCount = 0;
  if (cycleFilter) {
    const empRows = getEmployeeRosterRows_();
    allowedIds = new Set();
    for (let i = 1; i < empRows.length; i++) {
      const cycle = String(empRows[i][EMP.PAY_CYCLE] || '').trim();
      const normCycle = cycle.toLowerCase() === 'biweekly' ? 'Biweekly' : 'Monthly';
      if (normCycle === cycleFilter) {
        allowedIds.add(String(empRows[i][EMP.ID]).trim());
      }
    }
    employeeCount = allowedIds.size;
    if (employeeCount === 0) return { error: `No ${cycleFilter} employees configured.` };
  }

  const matched = [];
  const seenIds = new Set();
  for (let i = 2; i < rows.length; i++) {
    const rowDate = normalizeDate_(rows[i][ADP.DATE]);
    if (rowDate < startDate || rowDate > endDate) continue;
    const rowId = String(rows[i][ADP.EMP_ID]).trim();
    if (allowedIds && !allowedIds.has(rowId)) continue;
    seenIds.add(rowId);
    const cleaned = rows[i].slice(0, 9);
    cleaned[ADP.COMMENTS] = '';
    matched.push(cleaned);
  }
  if (matched.length === 0) {
    return { error: `No punches found between ${startDate} and ${endDate}` +
                    (cycleFilter ? ` for ${cycleFilter} employees.` : '.') };
  }
  if (!cycleFilter) employeeCount = seenIds.size;

  matched.sort((a, b) => {
    const da = normalizeDate_(a[ADP.DATE]), db = normalizeDate_(b[ADP.DATE]);
    if (da !== db) return da.localeCompare(db);
    const ia = String(a[ADP.EMP_ID]), ib = String(b[ADP.EMP_ID]);
    if (ia !== ib) return ia.localeCompare(ib);
    return normalizeTime_(a[ADP.TIME]).localeCompare(normalizeTime_(b[ADP.TIME]));
  });

  const stamp = fmtDate_(new Date()).replace(/-/g,'') + '_' + fmtTime_(new Date()).replace(/:/g,'');
  const prefix = cycleFilter ? `${cycleFilter} ` : 'ADP ';
  const name = `${prefix}Upload ${startDate} to ${endDate} (${stamp})`;
  const newSs = SpreadsheetApp.create(name);
  const sh = newSs.getActiveSheet();
  sh.setName('Timesheet');
  sh.getRange(1, 1, 2, 9).setValues([rows[0].slice(0, 9), rows[1].slice(0, 9)]);
  sh.getRange(3, 1, matched.length, 9).setValues(matched);
  sh.getRange(1, 1, 1, 9).setFontWeight('bold');
  sh.setFrozenRows(2);
  SpreadsheetApp.flush();

  return { fileId: newSs.getId(), url: newSs.getUrl(), fileName: name,
    rowCount: matched.length, employeeCount };
}


// ════════════════════════════════════════════════════════════════════════════
//  TIMESHEET / CALENDAR BUILDERS
// ════════════════════════════════════════════════════════════════════════════

function buildTimesheetForEmployee_(emp, startDate, endDate) {
  const empTz = empTz_(emp);
  const todayStr = fmtDateTz_(new Date(), empTz);
  const rows = getAdpSS_().getSheetByName(CONFIG.ADP_TAB).getDataRange().getValues();
  const byDate = {};
  for (let i = 2; i < rows.length; i++) {
    const rowId   = String(rows[i][ADP.EMP_ID]).trim();
    const rowDate = normalizeDate_(rows[i][ADP.DATE]);
    if (rowId !== emp.id || rowDate < startDate || rowDate > endDate) continue;
    const rawType = String(rows[i][ADP.COMMENTS]);
    const type    = normalizeType_(rawType);
    if (!byDate[rowDate]) byDate[rowDate] = [];
    byDate[rowDate].push({ time: normalizeTime_(rows[i][ADP.TIME]), type,
      isAdjustment: rawType.indexOf('ADJ-') === 0 });
  }

  let totalHours = 0, daysWorked = 0, incompleteCount = 0;
  const days = [];
  const cur = new Date(startDate + 'T12:00:00Z');
  const end = new Date(endDate + 'T12:00:00Z');
  while (cur <= end) {
    const dateStr = isoFromUtc_(cur);
    const local   = new Date(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate());
    const dow     = local.getDay();
    const punches = byDate[dateStr] || [];
    const pm = {}, adjMap = {};
    punches.forEach(p => { pm[p.type] = p.time; adjMap[p.type] = adjMap[p.type] || p.isAdjustment; });

    let hoursWorked = null, isIncomplete = false, inProgress = false;
    if (pm.ClockIn) {
      if (pm.ClockOut) {
        hoursWorked = calcHours_(pm.ClockIn, pm.ClockOut, pm.LunchOut || null, pm.LunchIn || null);
        totalHours += hoursWorked; daysWorked++;
      } else if (dateStr === todayStr) inProgress = true;
        else if (dateStr < todayStr) { isIncomplete = true; incompleteCount++; }
    }

    days.push({
      date: dateStr,
      dayLabel: `${DAY_ABBR[dow]}, ${MONTH_NAMES[local.getMonth()].slice(0,3)} ${local.getDate()}`,
      isWeekend: dow === 0 || dow === 6,
      isToday: dateStr === todayStr, isFuture: dateStr > todayStr,
      hasData: punches.length > 0,
      clockIn: pm.ClockIn || null,    adjClockIn: !!adjMap.ClockIn,
      lunchOut: pm.LunchOut || null,  adjLunchOut: !!adjMap.LunchOut,
      lunchIn: pm.LunchIn || null,    adjLunchIn: !!adjMap.LunchIn,
      clockOut: pm.ClockOut || null,  adjClockOut: !!adjMap.ClockOut,
      hoursWorked, isIncomplete, inProgress,
    });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return { startDate, endDate, days, totalHours, daysWorked, incompleteCount,
    payCycle: emp.payCycle, payAnchor: emp.payAnchor, timezone: empTz };
}

function buildCalendarForEmployee_(emp, year, month) {
  const empTz = empTz_(emp);
  const todayStr = fmtDateTz_(new Date(), empTz);
  const monthStr  = String(month).padStart(2,'0');
  const lastDay   = new Date(year, month, 0).getDate();
  const startDate = `${year}-${monthStr}-01`;
  const endDate   = `${year}-${monthStr}-${String(lastDay).padStart(2,'0')}`;
  const rows = getAdpSS_().getSheetByName(CONFIG.ADP_TAB).getDataRange().getValues();
  const workedDates = new Set();
  // Group punches per date so we can compute hours per day
  const punchesByDate = {};
  for (let i = 2; i < rows.length; i++) {
    const rowId   = String(rows[i][ADP.EMP_ID]).trim();
    const rowDate = normalizeDate_(rows[i][ADP.DATE]);
    if (rowId !== emp.id || rowDate < startDate || rowDate > endDate) continue;
    const type = normalizeType_(String(rows[i][ADP.COMMENTS]));
    const time = normalizeTime_(rows[i][ADP.TIME]);
    if (!punchesByDate[rowDate]) punchesByDate[rowDate] = {};
    punchesByDate[rowDate][type] = time;
    if (type === 'ClockIn') workedDates.add(rowDate);
  }
  // Compute hours per worked date (when both ClockIn and ClockOut are present)
  const hoursByDate = {};
  Object.keys(punchesByDate).forEach(dateStr => {
    const p = punchesByDate[dateStr];
    if (p.ClockIn && p.ClockOut) {
      hoursByDate[dateStr] = calcHours_(p.ClockIn, p.ClockOut, p.LunchOut || null, p.LunchIn || null);
    } else if (p.ClockIn && dateStr === todayStr) {
      hoursByDate[dateStr] = 'inProgress';
    }
  });
  const toRows = getOrCreateTimeOffSheet_().getDataRange().getValues();
  const timeOffRequests = [], teammates = [];
  for (let i = 1; i < toRows.length; i++) {
    const rowId   = String(toRows[i][TO.EMP_ID]).trim();
    const rowDate = normalizeDate_(toRows[i][TO.DATE]);
    const status  = String(toRows[i][TO.STATUS]);
    if (rowDate < startDate || rowDate > endDate) continue;
    const statusL = status.toLowerCase();
    if (rowId === emp.id) {
      timeOffRequests.push({ date: rowDate, type: String(toRows[i][TO.TYPE]),
        notes: String(toRows[i][TO.NOTES]), status,
        submittedAt: String(toRows[i][TO.SUBMITTED_AT]) });
    } else {
      if (statusL !== 'pending' && statusL !== 'approved') continue;
      teammates.push({ date: rowDate, name: String(toRows[i][TO.EMP_NAME]),
        type: CONFIG.SHOW_TEAMMATE_TYPE ? String(toRows[i][TO.TYPE]) : 'Off', status });
    }
  }
  const cutoff = (() => {
    let y = year, m = month - 3; while (m < 1) { m += 12; y--; }
    return `${y}-${String(m).padStart(2,'0')}-01`;
  })();
  const allRequests = [];
  for (let i = 1; i < toRows.length; i++) {
    const rowId = String(toRows[i][TO.EMP_ID]).trim();
    const rowDate = normalizeDate_(toRows[i][TO.DATE]);
    if (rowId !== emp.id || rowDate < cutoff) continue;
    allRequests.push({
      date: rowDate, type: String(toRows[i][TO.TYPE]),
      notes: String(toRows[i][TO.NOTES]),
      status: String(toRows[i][TO.STATUS]),
      submittedAt: String(toRows[i][TO.SUBMITTED_AT]),
    });
  }
  allRequests.sort((a, b) => b.date.localeCompare(a.date));
  const holidays = getUsHolidays_(year).filter(h => h.date >= startDate && h.date <= endDate);
  return {
    year, month, monthName: `${MONTH_NAMES[month-1]} ${year}`,
    lastDay, firstDayOfWeek: new Date(year, month - 1, 1).getDay(),
    workedDates: [...workedDates], workedHoursByDate: hoursByDate,
    timeOffRequests, teammates, holidays, allRequests,
    today: todayStr, timezone: empTz,
    ptoEnabled: !!(CONFIG.ENABLE_PTO_TRACKING && emp.ptoEnabled),
    annualLeave: emp.annualLeave,
    sickLeave:   emp.sickLeave,
    annualLeaveMax: CONFIG.ANNUAL_LEAVE_MAX || 15,
    sickLeaveMax:   CONFIG.SICK_LEAVE_MAX   || 10,
  };
}


// ════════════════════════════════════════════════════════════════════════════
//  US HOLIDAYS
// ════════════════════════════════════════════════════════════════════════════

function getUsHolidays_(year) {
  return [
    fixedHoliday_(year, 0,  1,  "New Year's Day"),
    nthWeekday_  (year, 0,  1, 3,  "Martin Luther King Jr. Day"),
    nthWeekday_  (year, 1,  1, 3,  "Presidents' Day"),
    lastWeekday_ (year, 4,  1,     "Memorial Day"),
    fixedHoliday_(year, 5, 19,     "Juneteenth"),
    fixedHoliday_(year, 6,  4,     "Independence Day"),
    nthWeekday_  (year, 8,  1, 1,  "Labor Day"),
    nthWeekday_  (year, 9,  1, 2,  "Columbus Day"),
    fixedHoliday_(year, 10, 11,    "Veterans Day"),
    nthWeekday_  (year, 10, 4, 4,  "Thanksgiving Day"),
    fixedHoliday_(year, 11, 25,    "Christmas Day"),
  ];
}
function fixedHoliday_(year, month, day, name) {
  const d = new Date(year, month, day);
  const dow = d.getDay();
  if (dow === 6) d.setDate(day - 1);
  if (dow === 0) d.setDate(day + 1);
  return { date: isoLocalDate_(d), name };
}
function nthWeekday_(year, month, weekday, n, name) {
  const d = new Date(year, month, 1);
  const offset = (weekday - d.getDay() + 7) % 7;
  d.setDate(1 + offset + (n - 1) * 7);
  return { date: isoLocalDate_(d), name };
}
function lastWeekday_(year, month, weekday, name) {
  const d = new Date(year, month + 1, 0);
  while (d.getDay() !== weekday) d.setDate(d.getDate() - 1);
  return { date: isoLocalDate_(d), name };
}
function isoLocalDate_(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}


// ════════════════════════════════════════════════════════════════════════════
//  PTO HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Returns { bucket: 'sick'|'annual'|null, days: <number> } for the given type.
 * null bucket means no deduction (e.g., unpaid leave — if added in future).
 */
function getLeaveDeduction_(type) {
  const t = String(type).toLowerCase().trim();
  if (t === 'sick leave') return { bucket: 'sick', days: 1.0 };
  if (t === 'half day - morning' || t === 'half day - afternoon')
    return { bucket: 'annual', days: 0.5 };
  if (t === 'unpaid leave') return { bucket: null, days: 0 };
  // Full Day, Personal Day, Other → annual full day
  return { bucket: 'annual', days: 1.0 };
}

/**
 * Adds delta to the employee's leave bucket. Pass negative delta to deduct.
 * Returns the new balance, or null if PTO disabled / employee not found / bucket null.
 */
function adjustLeaveBalance_(empId, bucket, delta) {
  if (!CONFIG.ENABLE_PTO_TRACKING) return null;
  if (!bucket || !delta) return null;
  const sheet = getAdpSS_().getSheetByName(CONFIG.EMPLOYEE_TAB);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][EMP.ID]).trim() !== empId) continue;
    const col = bucket === 'sick' ? EMP.SICK_LEAVE : EMP.ANNUAL_LEAVE;
    const current = parseFloat(rows[i][col]) || 0;
    const next = +(current + delta).toFixed(2);
    sheet.getRange(i + 1, col + 1).setValue(next);
    invalidateRosterCache_();
    return next;
  }
  return null;
}


// ════════════════════════════════════════════════════════════════════════════
//  PRIVATE HELPERS
// ════════════════════════════════════════════════════════════════════════════

function getEmployeeRosterRows_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(ROSTER_CACHE_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }
  const rows = getAdpSS_().getSheetByName(CONFIG.EMPLOYEE_TAB).getDataRange().getValues();
  const safeRows = rows.map(row => row.map(cell => {
    if (cell instanceof Date) return fmtDate_(cell);
    if (cell === null || cell === undefined) return '';
    return cell;
  }));
  try {
    cache.put(ROSTER_CACHE_KEY, JSON.stringify(safeRows), ROSTER_CACHE_TTL);
  } catch (e) {
    console.warn('Roster cache put failed (continuing uncached): ' + e.message);
  }
  return safeRows;
}

function invalidateRosterCache_() {
  CacheService.getScriptCache().remove(ROSTER_CACHE_KEY);
}

function getDepartmentEmails_() {
  const prop = PropertiesService.getScriptProperties().getProperty('CN_DEPARTMENT_EMAILS');
  if (prop) {
    try { return JSON.parse(prop); } catch (_) {}
  }
  return CONFIG.CALL_NOTES.DEPARTMENT_EMAILS;
}

function getStateTaxRates_() {
  const prop = PropertiesService.getScriptProperties().getProperty('CN_STATE_TAX_RATES');
  if (prop) {
    try { return JSON.parse(prop); } catch (_) {}
  }
  return CONFIG.CALL_NOTES.STATE_TAX_RATES;
}

function getUpdateSuggestions_() {
  const prop = PropertiesService.getScriptProperties().getProperty('CN_UPDATE_SUGGESTIONS');
  if (prop) {
    try { return JSON.parse(prop); } catch (_) {}
  }
  return CONFIG.CALL_NOTES.UPDATE_SUGGESTIONS_BY_DEPT;
}

function getManagerEmails_() {
  // Script Properties takes precedence: set MANAGER_EMAILS = a comma-separated
  // list in Apps Script editor → Project Settings → Script Properties. Same
  // rationale as ADP_SS_ID — the placeholder in CONFIG never has to be
  // swapped on clasp pull/push cycles.
  const propEmails = PropertiesService.getScriptProperties().getProperty('MANAGER_EMAILS');
  const arr = propEmails
    ? propEmails.split(',').map(s => s.trim()).filter(s => s.length > 0)
    : (CONFIG.MANAGER_EMAILS || []);
  return arr.filter(e =>
    e && typeof e === 'string' &&
    e.indexOf('YOUR_EMAIL') !== 0 &&
    e.indexOf('@') > 0
  );
}

/** Throws if the active user is not in MANAGER_EMAILS. Used by trigger-handler
 *  endpoints (sendDailyMissedPunchAlerts, runDailyExportCheck,
 *  sendCallNotesEodDigest, sendCallNotesWeeklyDigests) that must be public
 *  for time-based triggers and are therefore also reachable via
 *  google.script.run — without this gate, any logged-in rep could fire them. */
function assertManagerCaller_(label) {
  const userEmail = String(getActiveUserEmail_() || '').toLowerCase();
  const allowed = getManagerEmails_().map(e => String(e).toLowerCase());
  if (!userEmail || allowed.indexOf(userEmail) < 0) {
    throw new Error(`${label}: manager access required. Current user: ${userEmail || '<unknown>'}`);
  }
}

function tzAbbr_(tz) { return TZ_ABBR[tz] || tz; }
function empTz_(emp) { return (emp && emp.timezone) ? emp.timezone : CONFIG.TIMEZONE; }
function fmtDateTz_(d, tz) { return Utilities.formatDate(d, tz, 'yyyy-MM-dd'); }
function fmtTimeTz_(d, tz) { return Utilities.formatDate(d, tz, 'HH:mm:ss'); }
function safeTimezone_(tz) {
  if (!tz) return CONFIG.TIMEZONE;
  try { Utilities.formatDate(new Date(), tz, 'z'); return tz; }
  catch (_) { Logger.log('Invalid timezone "' + tz + '" — falling back to ' + CONFIG.TIMEZONE); return CONFIG.TIMEZONE; }
}

function convertDateTime_(dateStr, timeStr, fromTz, toTz) {
  if (!dateStr || !timeStr) return { date: '', time: '', displayTime: '' };
  try {
    const d = Utilities.parseDate(dateStr + 'T' + timeStr, fromTz, "yyyy-MM-dd'T'HH:mm:ss");
    return {
      date: Utilities.formatDate(d, toTz, 'yyyy-MM-dd'),
      time: Utilities.formatDate(d, toTz, 'HH:mm:ss'),
      displayTime: Utilities.formatDate(d, toTz, 'h:mm a'),
    };
  } catch (e) { return { date: dateStr, time: timeStr, displayTime: timeStr }; }
}

function convertAuditTs_(tsStr, fromTz, toTz) {
  if (!tsStr) return '';
  try {
    const d = Utilities.parseDate(tsStr, fromTz, 'yyyy-MM-dd HH:mm:ss');
    return Utilities.formatDate(d, toTz, "MMM d, h:mm a");
  } catch (e) { return tsStr; }
}

function findExistingPunch_(empId, date, punchType) {
  const sheet = getAdpSS_().getSheetByName(CONFIG.ADP_TAB);
  const rows = sheet.getDataRange().getValues();
  for (let i = 2; i < rows.length; i++) {
    if (String(rows[i][ADP.EMP_ID]).trim() !== empId) continue;
    if (normalizeDate_(rows[i][ADP.DATE]) !== date) continue;
    if (normalizeType_(String(rows[i][ADP.COMMENTS])) !== punchType) continue;
    return { sheet, rowIndex: i + 1 };
  }
  return null;
}

/**
 * Returns the active user's email. Tests may set the global
 * `_TEST_OVERRIDE_EMAIL` to impersonate any employee for a single call.
 * The override is in-memory only (per-invocation), so concurrent real
 * users hitting the deployed app are not affected.
 */
function getActiveUserEmail_() {
  if (typeof _TEST_OVERRIDE_EMAIL !== 'undefined' && _TEST_OVERRIDE_EMAIL) {
    return String(_TEST_OVERRIDE_EMAIL).toLowerCase();
  }
  return Session.getActiveUser().getEmail().toLowerCase();
}

function getEmployeeInfo_() {
  const email = getActiveUserEmail_();
  if (!email) return null;
  const rows = getEmployeeRosterRows_();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][EMP.EMAIL]).toLowerCase().trim() === email) {
      const cycleRaw = String(rows[i][EMP.PAY_CYCLE] || '').trim();
      const cycle = cycleRaw.toLowerCase() === 'biweekly' ? 'Biweekly' : 'Monthly';
      const anchorRaw = rows[i][EMP.PAY_ANCHOR];
      const anchor = anchorRaw ? normalizeDate_(anchorRaw) : null;
      const mgrRaw = String(rows[i][EMP.IS_MANAGER] || '').trim().toLowerCase();
      const isManager = (mgrRaw === 'true' || mgrRaw === 'yes' || mgrRaw === 'y' || mgrRaw === '1');
      let tzRaw = rows[i][EMP.TIMEZONE];
      if (tzRaw === null || tzRaw === undefined) tzRaw = '';
      const timezone = String(tzRaw).trim() || CONFIG.TIMEZONE;
      // PtoEnabled defaults to TRUE — blank/missing column means PTO enabled (back-compat)
      // Mark FALSE for contractors (e.g. PH team) who don't get paid leave.
      // Sheets coerces the strings 'TRUE'/'FALSE' to native booleans on write, so a
      // naive `value || ''` would short-circuit boolean `false` to '' and read as enabled.
      const ptoVal = rows[i][EMP.PTO_ENABLED];
      const ptoRaw = (ptoVal === null || ptoVal === undefined || ptoVal === '')
        ? '' : String(ptoVal).trim().toLowerCase();
      const ptoEnabled = !(ptoRaw === 'false' || ptoRaw === 'no' || ptoRaw === 'n' || ptoRaw === '0');
      return {
        email,
        id: String(rows[i][EMP.ID]).trim(),
        name: String(rows[i][EMP.NAME]).trim(),
        sheetId: rows[i][EMP.SHEET_ID] ? String(rows[i][EMP.SHEET_ID]).trim() : null,
        callNotesSheetId: rows[i][EMP.CALL_NOTES_SHEET_ID]
          ? String(rows[i][EMP.CALL_NOTES_SHEET_ID]).trim() : null,
        payCycle: cycle, payAnchor: anchor, isManager, timezone, ptoEnabled,
        annualLeave: parseFloat(rows[i][EMP.ANNUAL_LEAVE]) || 0,
        sickLeave:   parseFloat(rows[i][EMP.SICK_LEAVE])   || 0,
      };
    }
  }
  return null;
}

function lookupEmployeeById_(empId) {
  const rows = getEmployeeRosterRows_();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][EMP.ID]).trim() !== empId) continue;
    let tzRaw = rows[i][EMP.TIMEZONE];
    if (tzRaw === null || tzRaw === undefined) tzRaw = '';
    // Sheets coerces 'TRUE'/'FALSE' strings to native booleans — see getEmployeeInfo_ for full note
    const ptoVal = rows[i][EMP.PTO_ENABLED];
    const ptoRaw = (ptoVal === null || ptoVal === undefined || ptoVal === '')
      ? '' : String(ptoVal).trim().toLowerCase();
    const ptoEnabled = !(ptoRaw === 'false' || ptoRaw === 'no' || ptoRaw === 'n' || ptoRaw === '0');
    return {
      id: empId,
      name: String(rows[i][EMP.NAME]).trim(),
      email: String(rows[i][EMP.EMAIL]).trim(),
      timezone: String(tzRaw).trim() || CONFIG.TIMEZONE,
      sheetId: rows[i][EMP.SHEET_ID] ? String(rows[i][EMP.SHEET_ID]).trim() : null,
      callNotesSheetId: rows[i][EMP.CALL_NOTES_SHEET_ID]
        ? String(rows[i][EMP.CALL_NOTES_SHEET_ID]).trim() : null,
      annualLeave: parseFloat(rows[i][EMP.ANNUAL_LEAVE]) || 0,
      sickLeave:   parseFloat(rows[i][EMP.SICK_LEAVE])   || 0,
      ptoEnabled,
    };
  }
  return null;
}

function getTodayPunches_(empId, empTz) {
  const today = fmtDateTz_(new Date(), empTz || CONFIG.TIMEZONE);
  const rows  = getAdpSS_().getSheetByName(CONFIG.ADP_TAB).getDataRange().getValues();
  const punches = [];
  for (let i = 2; i < rows.length; i++) {
    if (String(rows[i][ADP.EMP_ID]).trim() !== empId) continue;
    if (normalizeDate_(rows[i][ADP.DATE]) !== today) continue;
    const raw = String(rows[i][ADP.COMMENTS]);
    punches.push({
      time: normalizeTime_(rows[i][ADP.TIME]), direction: String(rows[i][ADP.DIR]),
      type: normalizeType_(raw), isAdjustment: raw.indexOf('ADJ-') === 0,
    });
  }
  return { today, punches };
}

function getNextActions_(punches) {
  const last = punches.length ? punches[punches.length - 1].type : null;
  if (!last) return ['ClockIn','Adjust'];
  if (last === 'ClockOut') return ['Adjust'];
  if (last === 'ClockIn' || last === 'LunchIn') return ['LunchOut','ClockOut','Adjust'];
  if (last === 'LunchOut') return ['LunchIn','ClockOut','Adjust'];
  return ['Adjust'];
}

function appendToAdpSheet_(emp, date, time, dir, commentValue) {
  getAdpSS_().getSheetByName(CONFIG.ADP_TAB)
    .appendRow([emp.id, emp.name, date, time, dir, 'None', 'Missing punch', 'SUBMIT', commentValue]);
}

function writeToEmployeeSheet_(emp, date, time, dir, punchType) {
  const ROW_LABEL_MAP = { ClockIn:'Clock In', LunchOut:'Lunch Out', LunchIn:'Lunch Return', ClockOut:'Clock Out' };
  try {
    const ss        = SpreadsheetApp.openById(emp.sheetId);
    const empTz     = empTz_(emp);
    const dateObj   = Utilities.parseDate(date + 'T12:00:00', empTz, "yyyy-MM-dd'T'HH:mm:ss");
    const monthName = Utilities.formatDate(dateObj, empTz, 'MMMM yyyy');
    const sheet     = ss.getSheetByName(monthName);
    if (!sheet) return;
    const dayNum = parseInt(Utilities.formatDate(dateObj, empTz, 'd'), 10);
    const data   = sheet.getDataRange().getValues();
    const rowIdx = data.findIndex(r => String(r[0]).trim() === ROW_LABEL_MAP[punchType]);
    const colIdx = data[0].findIndex(h => Number(h) === dayNum);
    if (rowIdx !== -1 && colIdx !== -1) sheet.getRange(rowIdx + 1, colIdx + 1).setValue(time);
  } catch (e) {
    console.warn('writeToEmployeeSheet_ skipped: ' + e.message);
    try { writeAuditLog_(emp, 'PersonalSheetSyncFail', date, time, false, 0,
      `writeToEmployeeSheet_ failed for ${punchType}: ${e.message}`); } catch (_) {}
  }
}

function clearFromEmployeeSheet_(emp, date, punchType) {
  if (!emp || !emp.sheetId) return;
  const ROW_LABEL_MAP = { ClockIn:'Clock In', LunchOut:'Lunch Out', LunchIn:'Lunch Return', ClockOut:'Clock Out' };
  try {
    const ss        = SpreadsheetApp.openById(emp.sheetId);
    const empTz     = empTz_(emp);
    const dateObj   = Utilities.parseDate(date + 'T12:00:00', empTz, "yyyy-MM-dd'T'HH:mm:ss");
    const monthName = Utilities.formatDate(dateObj, empTz, 'MMMM yyyy');
    const sheet     = ss.getSheetByName(monthName);
    if (!sheet) return;
    const dayNum = parseInt(Utilities.formatDate(dateObj, empTz, 'd'), 10);
    const data   = sheet.getDataRange().getValues();
    const rowIdx = data.findIndex(r => String(r[0]).trim() === ROW_LABEL_MAP[punchType]);
    const colIdx = data[0].findIndex(h => Number(h) === dayNum);
    if (rowIdx !== -1 && colIdx !== -1) sheet.getRange(rowIdx + 1, colIdx + 1).setValue('');
  } catch (e) {
    console.warn('clearFromEmployeeSheet_ skipped: ' + e.message);
    try { writeAuditLog_(emp, 'PersonalSheetSyncFail', date, '', false, 0,
      `clearFromEmployeeSheet_ failed for ${punchType}: ${e.message}`); } catch (_) {}
  }
}

function getOrCreateTimeOffSheet_() {
  const ss = getAdpSS_();
  let sheet = ss.getSheetByName(CONFIG.TIMEOFF_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.TIMEOFF_TAB);
    sheet.appendRow(['EmployeeId','EmployeeName','Date','Type','Notes','Status','SubmittedAt']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getOrCreateAuditSheet_() {
  const ss = getAdpSS_();
  let sheet = ss.getSheetByName(CONFIG.AUDIT_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.AUDIT_TAB);
    sheet.appendRow([
      `Timestamp (${tzAbbr_(CONFIG.TIMEZONE)})`,
      'EmployeeId','EmployeeName','UserEmail',
      'Action','PunchDate','PunchTime','IsAdjustment','DaysBack','Notes',
    ]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Append a row to the audit log. The first argument is the TARGET employee
 * (the one whose record was changed). If actorEmail is provided and differs
 * from targetEmp.email, the UserEmail column reflects the actor (e.g. a
 * manager editing on behalf of an employee).
 */
function writeAuditLog_(targetEmp, action, punchDate, punchTime, isAdjustment, daysBack, notes, actorEmail) {
  try {
    const now = new Date();
    const ts  = fmtDate_(now) + ' ' + fmtTime_(now);
    getOrCreateAuditSheet_().appendRow([
      ts, targetEmp.id, targetEmp.name, actorEmail || targetEmp.email, action,
      punchDate, punchTime || '',
      isAdjustment ? 'TRUE' : 'FALSE', daysBack || 0, notes || '',
    ]);
  } catch (e) { console.warn('writeAuditLog_ failed: ' + e.message); }
}

function notifyManagerOldAdjustment_(emp, punchType, date, time, daysBack, reason) {
  const recipients = getManagerEmails_();
  if (recipients.length === 0) return;
  try {
    const empTz = empTz_(emp);
    const mgrTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
    const conv = convertDateTime_(date, time, empTz, mgrTz);
    const subj = `⏰ Timesheet Adjustment Alert: ${emp.name} (${daysBack} days back)`;
    const body =
      `An older punch adjustment was submitted and may warrant review.\n\n` +
      `Employee:    ${emp.name} (${emp.id})\n` +
      `User email:  ${emp.email}\n` +
      `Punch type:  ${punchType}\n` +
      `Punch date:  ${date} (${tzAbbr_(empTz)})\n` +
      `Punch time:  ${time} ${tzAbbr_(empTz)}` +
        (empTz !== mgrTz ? `  ·  ${conv.displayTime} ${tzAbbr_(mgrTz)}` : '') + `\n` +
      `Days back:   ${daysBack}\n` +
      `Reason:      ${reason || '<none provided>'}\n` +
      `Submitted:   ${fmtDate_(new Date())} ${fmtTime_(new Date())} ${tzAbbr_(CONFIG.TIMEZONE)}\n\n` +
      `Threshold:   > ${CONFIG.OLD_ADJUST_ALERT_DAYS} days\n` +
      `Window:      ${CONFIG.ADJUST_WINDOW_DAYS} days\n\n` +
      `Audit log:\nhttps://docs.google.com/spreadsheets/d/${CONFIG.ADP_SS_ID}/edit\n`;
    MailApp.sendEmail({ to: recipients.join(','), subject: subj, body: body });
  } catch (e) { console.warn('Manager alert email failed: ' + e.message); }
}

function notifyManagerTrainingQuestion_(emp, question, dateLocal) {
  const recipients = getManagerEmails_();
  if (recipients.length === 0) return;
  try {
    MailApp.sendEmail({
      to: recipients.join(','),
      subject: `Training Q from ${emp.name}: ${String(question).substring(0, 60)}`,
      body:
        `${emp.name} (${emp.id}) submitted a training-flagged call note with a question:\n\n` +
        `Q: ${question}\n\n` +
        `Date: ${dateLocal}\n\n` +
        `Reply in the web app → Call Notes → Team Notes → Per-Rep View.\n`,
    });
  } catch (e) { console.warn('Training question notification failed: ' + e.message); }
}

function notifyEmployeeOfDecision_(emp, date, type, notes, newStatus) {
  if (!emp || !emp.email) return;
  try {
    const verb = newStatus === 'Approved' ? 'approved' :
                 newStatus === 'Denied'   ? 'denied'   : 'updated';
    const subj = `Your time off request for ${date} was ${verb}`;
    let body = `Hi ${emp.name},\n\n` +
               `Your time off request has been ${verb}:\n\n` +
               `Date:    ${date}\n` +
               `Type:    ${type}\n`;
    if (notes && notes !== 'undefined') body += `Notes:   ${notes}\n`;
    body += `Status:  ${newStatus}\n\n`;

    if (CONFIG.ENABLE_PTO_TRACKING) {
      // Re-fetch fresh balances (cache was invalidated by adjustLeaveBalance_)
      const fresh = lookupEmployeeById_(emp.id);
      if (fresh && fresh.ptoEnabled !== false) {
        body += `Your current annual leave balance: ${fresh.annualLeave} day(s)\n\n`;
      }
    }
    body += `Please contact your manager with any questions.\n\n` +
            `— UMS Time Clock (automated)\n`;
    MailApp.sendEmail({ to: emp.email, subject: subj, body: body });
  } catch (e) { console.warn('Employee notification email failed: ' + e.message); }
}

function calcHours_(clockIn, clockOut, lunchOut, lunchIn) {
  let inMins = timeToMins_(clockIn), outMins = timeToMins_(clockOut);
  if (outMins <= inMins) outMins += 1440;
  let lunchMins = 0;
  if (lunchOut && lunchIn) {
    let lo = timeToMins_(lunchOut), li = timeToMins_(lunchIn);
    if (li <= lo) li += 1440;
    lunchMins = li - lo;
  }
  return (outMins - inMins - lunchMins) / 60;
}

function timeToMins_(t) { const p = String(t).split(':'); return parseInt(p[0],10)*60 + parseInt(p[1],10); }
function daysBetween_(earlierIso, laterIso) {
  return Math.round((new Date(laterIso+'T00:00:00Z') - new Date(earlierIso+'T00:00:00Z')) / 86400000);
}
function normalizeType_(rawComment) { return String(rawComment).replace(/^ADJ-/, ''); }

function getAdpSS_() {
  // Script Properties takes precedence over CONFIG.ADP_SS_ID so the deployed
  // Apps Script project can hold the real spreadsheet ID without committing it
  // to the repo. Set it once in Apps Script editor → Project Settings →
  // Script Properties → add ADP_SS_ID = <real ID>. clasp pull/push leaves
  // Script Properties untouched, so the placeholder in CONFIG stays inert.
  const id = PropertiesService.getScriptProperties().getProperty('ADP_SS_ID')
          || CONFIG.ADP_SS_ID;
  return SpreadsheetApp.openById(id);
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
function fmtDate_(d)    { return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd'); }
function fmtTime_(d)    { return Utilities.formatDate(d, CONFIG.TIMEZONE, 'HH:mm:ss'); }
function normalizeDate_(val) {
  if (val instanceof Date) {
    const ssTz = getAdpSS_().getSpreadsheetTimeZone();
    return Utilities.formatDate(val, ssTz, 'yyyy-MM-dd');
  }
  return String(val).trim().substring(0, 10);
}
/** Sheets auto-coerces "HH:mm:ss" strings to Date objects when written via appendRow.
 *  On read, getValues returns that Date — String(date) produces "Sat Dec 30 1899 ..." which
 *  breaks all downstream display logic. This helper reads the time back safely regardless of
 *  whether the cell stored a string or an auto-coerced Date. */
function normalizeTime_(val) {
  if (val instanceof Date) {
    const ssTz = getAdpSS_().getSpreadsheetTimeZone();
    return Utilities.formatDate(val, ssTz, 'HH:mm:ss');
  }
  return String(val).trim();
}
/** Difference in seconds between two "HH:mm:ss" or "HH:mm" strings (later - earlier).
 *  Returns negative if earlier > later (treat as "different day", skip the check). */
function timeDiffSeconds_(earlier, later) {
  const toSec = (t) => {
    const p = String(t).split(':');
    if (p.length < 2) return NaN;
    return (parseInt(p[0],10)||0) * 3600 + (parseInt(p[1],10)||0) * 60 + (parseInt(p[2],10)||0);
  };
  const a = toSec(earlier), b = toSec(later);
  if (isNaN(a) || isNaN(b)) return -1;
  return b - a;
}
function isoFromUtc_(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
function toDisplayTime_(t) {
  const p = String(t).split(':'), h = parseInt(p[0],10);
  return `${h%12||12}:${p[1]} ${h>=12?'PM':'AM'}`;
}