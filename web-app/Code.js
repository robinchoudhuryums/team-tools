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
  FORM_TOKENS_TAB:      'FormTokens',
  FORM_SUBMISSIONS_TAB: 'FormSubmissions',

  // ── Interactive form tokens ──────────────────────────────────────
  FORM_TOKEN_EXPIRY_HOURS: 72, // tokens expire after 72 hours
  // PHI data-minimization: purge FormSubmissions + FormTokens rows older than
  // this many days (by SubmittedAt / CreatedAt). 0 = DISABLED (nothing is ever
  // deleted) — the safe default. Set a positive value (Script Property
  // FORM_DATA_RETENTION_DAYS overrides this CONFIG fallback) ONLY after
  // aligning it with your record-retention obligations; the purge is
  // irreversible. Enforced by the daily purgeExpiredFormData trigger.
  FORM_DATA_RETENTION_DAYS: 0,

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

  // ── Clock-view shift schedule ─────────────────────────────────────────
  // Drives the day-ribbon scheduled band + the "until end of shift"
  // countdown BEFORE a rep clocks in (once they clock in, both re-anchor to
  // their actual ClockIn + the scheduled length — see INV-71). DEFAULT is the
  // 8:00 AM–5:00 PM CST shift most agents work (C3); BY_TIMEZONE holds the
  // handful of exceptions (PH agents start 8:30). Resolved by
  // getShiftSchedule_ and shipped to the client via getEmployeeState.
  SHIFT_SCHEDULE: {
    DEFAULT:     { start: '08:00', end: '17:00',
      // Scheduled breaks (item 1) — drive the Clock-view "next break" chip +
      // the X-min reminder toast. Operator-tunable here (redeploy). A tz entry
      // without its own `breaks` inherits DEFAULT.breaks.
      breaks: [
        { label: 'Morning break',   start: '10:30', len: 15 },
        { label: 'Lunch',           start: '12:30', len: 60 },
        { label: 'Afternoon break', start: '15:00', len: 15 },
      ],
    },
    BY_TIMEZONE: { 'Asia/Manila': { start: '08:30', end: '17:00' } },
    BREAK_REMINDER_MINUTES: 10,         // lead time for the upcoming-break reminder toast
  },

  // ── Metrics module (CDR integration) ──────────────────────────────────
  // Reads the CDR Report spreadsheet (same one backing the Department
  // Dashboard in call-data-reporting) to surface call-volume metrics
  // inside team-tools. The deployer account must have view access to
  // the CDR Report spreadsheet.
  CDR_SS_ID:         'YOUR_CDR_SPREADSHEET_ID',
  CDR_DEPARTMENT:    'CSR',
  CDR_CACHE_TTL:     300,  // 5 min — matches the Department Dashboard's cache
  CDR_CACHE_KEY:     'cdr_metrics_v2',
  CDR_ALERT_THRESHOLD: 85,  // % Answered below this → warn badge on Metrics sidebar

  // ── Call Notes module ────────────────────────────────────────────────
  // The rolling-note panel; per-rep notes write to the rep's own Sheet
  // (EMP.CALL_NOTES_SHEET_ID, column L), email composer/preview gate is a
  // separate action from log-on-submit. See helper getCallNotesSheet_().
  CALL_NOTES: {
    NOTES_TAB:           'Notes',
    SUBFORM_COL_JSON:    true,           // store SubformData as JSON blob in column P
    DELETE_WINDOW_SECONDS: 300,          // 5 min — self-undo on a just-created note
    NOTE_RETENTION_DAYS: 0,              // rolling auto-delete of old notes; 0 = disabled (irreversible PHI delete; CN_NOTE_RETENTION_DAYS Script Property overrides)
    CC_EMAIL:            'robin.choudhury@universalmedsupply.com',
    AUTO_COPY_FORMAT:
      'Callback Number: {callback}\n' +
      'Caller Name: {caller}\n' +
      'Relationship: {relationship}\n' +
      'Patient & TRX: {patientAndTrx}\n' +
      'Issue: {issue}\n' +
      'Transferred To: {transferredTo}\n' +
      'Resolution: {resolution}',
    STALE_FLAG_HOURS:    1,              // an `action` flag is "stale" if unresolved beyond this
    // Voice-to-text dictation on Issue / Resolution textareas. OFF by default
    // because browser speech recognition (Chrome/Edge) routes audio to the
    // vendor's speech-to-text service, which is not BAA-covered for PHI.
    // Turn on only after confirming the org's HIPAA stance.
    VOICE_INPUT_ENABLED: false,
    // ── External email (customer / provider) ──────────────────────────
    // Form catalog for PDF attachments fetched from a public GitHub repo.
    // Adding a new form: append an entry here + upload the PDF to /forms/.
    FORM_CATALOG: [
      { id: 'eaa',          name: 'Economic Assistance Application', fileName: 'EAA (Economic Assistance Application) Form.pdf', category: 'customer' },
      { id: 'pt-ot-rx',     name: 'PT/OT Prescription',              fileName: 'Sample PT OT Rx.pdf',                            category: 'provider' },
      { id: 'seating-eval', name: 'Seating Evaluation Form',         fileName: 'Seating_Evaluation_Form (blank sample).pdf',      category: 'provider' },
    ],
    FORM_BASE_URL: 'https://raw.githubusercontent.com/robinchoudhuryums/team-tools/main/forms/',
    // Manager-curated canned message bodies for the external (customer/provider)
    // email composer. Empty by default — populated via the Admin tab, which
    // writes Script Property CN_EMAIL_TEMPLATES (read first by
    // getEmailTemplates_, this serving as the fallback). Each entry:
    // { name, recipientType: 'customer'|'provider'|'any', body }. The body
    // supports a {name} token substituted with the recipient name at insert.
    EMAIL_TEMPLATES: [],
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
// Round 2 · 8e — extended flag set for the multi-select toolbar. 'urgent'
// is new; pin lives separately in subformData.pinned (subject to its own
// 3-cap, INV-50). Order matters — it drives deriveFlagType_'s priority.
const CN_FLAG_TYPES_EXTENDED = ['action','training','review','urgent'];
const CN_FLAG_PRIORITY = ['action','training','review','urgent'];

// ── Compliance audit panel (Admin tab) ──────────────────────────────────
// The call-note-related AuditLog action labels the compliance search covers.
// The audit log is the only cross-rep trail of call-note activity (INV-32),
// so this is the manager's window into it. Includes the external-email + form
// actions since they're part of the call-note compliance surface.
const CN_AUDIT_ACTIONS = [
  'CallNoteCreate', 'CallNoteEdit', 'CallNoteFlag', 'CallNoteResolve',
  'CallNoteDelete', 'CallNoteEmail', 'CallNoteTrainingReply', 'CallNotePin',
  'CallNoteFeedback', 'CallNoteTagAdmin', 'CallNotesExport', 'ExternalEmailSent',
  'FormTokenCreated', 'FormSubmissionReceived',
];
// Bounded read: the audit search scans at most this many of the most-recent
// AuditLog rows (append-only/chronological), then filters in memory. Keeps the
// read within the Apps Script cell/time budget (INV-13 spirit) while serving a
// compliance need broader than the 20-row dashboard read.
const CN_AUDIT_MAX_SCAN = 4000;
const CN_AUDIT_MAX_RESULTS = 500;
const CN_AUDIT_DEFAULT_DAYS = 30;
const CN_EMAIL_TEMPLATE_LIMIT = 50;
const CN_EMAIL_TEMPLATE_BODY_MAX = 4000;
const CN_TEMPLATE_RECIPIENT_TYPES = ['customer', 'provider', 'any'];

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

// COUPLING ALERT: These positions MUST match HISTORICAL_COLS in
// call-data-reporting/apps-script/department-dashboard/Config.gs.
// validateCdrColumns_() checks at runtime. On mismatch, update
// here AND bump CDR_CACHE_KEY. Last verified: 2026-05-28.
// Duration columns (TTT, ATT) MUST be read via getDisplayValues() — see
// the "Spreadsheet TZ ≠ script TZ" gotcha in call-data-reporting/CLAUDE.md.
// AvgAbdWait (col AG / index 33) and CsrAvgAbdWait (col AH / index 34) are
// also duration columns, but are intentionally NOT read by any metric today,
// so they are omitted from this enum to avoid a dead-but-tempting entry. If
// you ever wire them in: re-add them here AND to CDR_EXPECTED_HEADERS, and
// read them through getDisplayValues() (never getValue()) or the phantom
// timezone offset (INV-64) will silently corrupt the parsed seconds.
const CDR = {
  DATE: 2, AGENT: 3, QUEUE_EXT: 4,
  TOTAL_UNIQUE: 5, TOTAL_RUNG: 6, TOTAL_MISSED: 7, TOTAL_ANSWERED: 8,
  TTT: 9, ATT: 10,
};
const CDR_EXPECTED_HEADERS = {
  2: 'Date', 3: 'Agent', 5: 'Unique', 6: 'Rung', 7: 'Missed',
  8: 'Answered', 9: 'TTT', 10: 'ATT',
};

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

// S2 cached-summary layer: whole-result caches for the two parameterless
// cross-rep manager aggregates that otherwise re-scan every enrolled rep's
// Sheet on each call. (Open-ended substring search is NOT cached — it needs
// the full text, i.e. a real index, which is out of scope.) The taxonomy
// cache is eagerly invalidated by the tag-admin endpoints so the Admin table
// reflects a rename/merge/archive immediately; both otherwise rely on the TTL
// as the freshness ceiling (same philosophy as the ambient cache, INV-43).
const CN_TAXONOMY_CACHE_KEY = 'cn_tag_taxonomy_v1';
const CN_TAXONOMY_CACHE_TTL = 300;   // 5 min — Admin tab is opened infrequently
const CN_UNRESOLVED_CACHE_KEY = 'cn_unresolved_action_v1';
const CN_UNRESOLVED_CACHE_TTL = 120; // 2 min — backs the Team Notes stale-flag badge

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
// Security model: appsscript.json sets access: "ANYONE_ANONYMOUS" so external
// form recipients can reach the ?form=<token> route. The internal app route
// gates on @umsupply.com domain check via Session.getActiveUser().getEmail() —
// with executeAs: "USER_DEPLOYING", this returns the visitor's email when
// they're in the same Workspace domain as the deployer, or empty string for
// external users. All google.script.run endpoints independently require
// getEmployeeInfo_() which returns null for non-employees, so even if an
// external user somehow loads the internal HTML, no server calls will work.
// The only public-facing endpoints are getFormByToken and submitFormByToken,
// which validate via token (no employee auth).
function doGet(e) {
  // ── Public form route ──────────────────────────────────────────────
  // External recipients reach ?form=<token> to fill out interactive forms.
  // No auth needed — the token validates the request.
  if (e && e.parameter && e.parameter.form) {
    return serveExternalForm_(e.parameter.form);
  }
  // ── Internal app — access gate ─────────────────────────────────────
  // Defense in depth on top of the per-endpoint getEmployeeInfo_() check.
  // We render an "Access Restricted" page only for a visitor we can
  // POSITIVELY identify as outside the org: a non-empty Google email that
  // is neither @umsupply.com NOR a registered employee. Two deliberate
  // carve-outs:
  //   • Empty email — anonymous / the executeAs:USER_DEPLOYING +
  //     ANYONE_ANONYMOUS "unreliable" case — is fail-open: the shell loads
  //     but every google.script.run endpoint returns null, so no data leaks.
  //   • Registered employees on a non-@umsupply.com login (contractors,
  //     e.g. PH/India reps) are never blocked — gating on domain alone
  //     would lock them out, which is why the prior code skipped the gate.
  const viewerEmail = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  if (viewerEmail && !/@umsupply\.com$/.test(viewerEmail) && !getEmployeeInfo_()) {
    return HtmlService.createHtmlOutput(
      '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>UMS Team Tools — Access Restricted</title>' +
      '<style>body{margin:0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;' +
      'background:#f6f7f9;color:#0f1623;display:flex;align-items:center;justify-content:center;' +
      'min-height:100vh}.card{max-width:420px;background:#fff;border:1px solid #dce0e7;' +
      'border-radius:12px;padding:32px 34px;text-align:center}h1{font-size:20px;margin:0 0 10px}' +
      'p{color:#3e4756;font-size:14px;line-height:1.6;margin:0}</style></head><body>' +
      '<div class="card"><h1>Access Restricted</h1>' +
      '<p>This tool is available only to Universal Medical Supply team members. ' +
      'If you believe you should have access, contact your manager.</p></div></body></html>')
      .setTitle('UMS Team Tools — Access Restricted')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  // The HTML shell otherwise loads; every google.script.run endpoint still
  // independently requires getEmployeeInfo_() (returns null for non-employees).
  //
  // Round 2 · 8x — pass the URL query params through the template eval.
  // Apps Script's HtmlService iframe (script.googleusercontent.com) doesn't
  // expose the parent deploy URL's query string via window.location.search,
  // so reading ?compact=1 / ?tool=X / ?prefill=… directly from the iframe
  // silently returns empty. The template injects serverQueryParams into
  // window.SERVER_QUERY_PARAMS so client code can read them reliably.
  const tpl = HtmlService.createTemplateFromFile('index');
  tpl.serverQueryParams = (e && e.parameter) || {};
  return tpl
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
      schedule: getShiftSchedule_(empTz),
      ptoEnabled: !!(getFlag_('enablePtoTracking') && emp.ptoEnabled),
      annualLeave: emp.annualLeave,
      sickLeave: emp.sickLeave,
      annualLeaveMax: CONFIG.ANNUAL_LEAVE_MAX || 15,
      sickLeaveMax:   CONFIG.SICK_LEAVE_MAX   || 10,
      flags: getClientFeatureFlags_(),
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
    if (!isValidTimeOffType_(type))
      return { success: false, error: 'Invalid leave type.' };
    const toSheet = getOrCreateTimeOffSheet_();
    if (hasActiveTimeOffOnDate_(toSheet, emp.id, date))
      return { success: false, error: 'You already have a pending or approved time-off request for that date.' };
    const submittedAt = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
    toSheet.appendRow([emp.id, emp.name, date, type, notes || '', 'Pending', submittedAt]);
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
        // Neutralize the field separators (· and ") inside the user notes so
        // the · -joined row stays unambiguously parseable (L12).
        const safeNotes = reqNotes.replace(/[·"\r\n]+/g, ' ').trim();
        const auditParts = [type, 'self-cancelled', 'status=' + status];
        if (safeNotes)  auditParts.push('notes="' + safeNotes + '"');
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

    // ── Per-employee 7-day sparkline (V4·E3) ─────────────────────────
    // Builds a 7-element recentHours[] (oldest→newest, excludes today
    // since reps still mid-shift would always register as 0 hours)
    // for each liveStatus entry. Reuses already-loaded adpRows; one
    // extra in-memory pass — no Sheet reads, INV-13 honored.
    const sparkDays = 7;
    const sparkStart = (() => {
      const d = new Date(now); d.setDate(d.getDate() - sparkDays);
      return fmtDateTz_(d, mgrTz);
    })();
    const sparkEnd = (() => {
      const d = new Date(now); d.setDate(d.getDate() - 1);
      return fmtDateTz_(d, mgrTz);
    })();
    const sparkPunchMap = {}; // {empId}|{date} → { ClockIn, LunchOut, LunchIn, ClockOut }
    for (let i = 2; i < adpRows.length; i++) {
      const id = String(adpRows[i][ADP.EMP_ID]).trim();
      if (!empById[id]) continue;
      const rowDate = normalizeDate_(adpRows[i][ADP.DATE]);
      if (rowDate < sparkStart || rowDate > sparkEnd) continue;
      const key = `${id}|${rowDate}`;
      if (!sparkPunchMap[key]) sparkPunchMap[key] = {};
      const ptype = normalizeType_(String(adpRows[i][ADP.COMMENTS]));
      sparkPunchMap[key][ptype] = normalizeTime_(adpRows[i][ADP.TIME]);
    }
    const sparkHoursMap = {};
    Object.keys(sparkPunchMap).forEach(key => {
      const p = sparkPunchMap[key];
      if (p.ClockIn && p.ClockOut) {
        sparkHoursMap[key] = calcHours_(p.ClockIn, p.ClockOut, p.LunchOut || null, p.LunchIn || null);
      }
    });
    liveStatus.forEach(ls => {
      const arr = [];
      for (let off = sparkDays; off >= 1; off--) {
        const dd = new Date(now); dd.setDate(dd.getDate() - off);
        const ds = fmtDateTz_(dd, mgrTz);
        arr.push({ date: ds, hours: sparkHoursMap[`${ls.id}|${ds}`] || 0 });
      }
      ls.recentHours = arr;
    });

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
      if (getFlag_('enablePtoTracking') && reqEmp && dedu.bucket) {
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
      // Delete window is measured against the EMPLOYEE's local "today"
      // (e.todayStr, same tz deletePunch uses), not the manager's — otherwise
      // an IST/PHT rep near the window edge gets a Delete button the server
      // then rejects (or vice-versa) (L13).
      const dBack = Math.abs(daysBetween_(rowDate, e.todayStr));
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

    // Analytics: daily punch counts (last 7 days) + time-off status summary
    const analyticsDays = 7;
    const punchCountsByDate = {};
    const analyticsLookback = new Date(now);
    analyticsLookback.setDate(analyticsLookback.getDate() - analyticsDays);
    const analyticsStart = fmtDateTz_(analyticsLookback, mgrTz);
    for (let i = 2; i < adpRows.length; i++) {
      const d = normalizeDate_(adpRows[i][ADP.DATE]);
      if (d >= analyticsStart && d <= todayStr) {
        punchCountsByDate[d] = (punchCountsByDate[d] || 0) + 1;
      }
    }
    const punchTrend = [];
    for (let off = analyticsDays; off >= 0; off--) {
      const dd = new Date(now); dd.setDate(dd.getDate() - off);
      const ds = fmtDateTz_(dd, mgrTz);
      punchTrend.push({ date: ds, count: punchCountsByDate[ds] || 0 });
    }
    const toSummary = { approved: 0, pending: 0, denied: 0 };
    const monthStr = todayStr.substring(0, 7);
    for (let i = 1; i < toRows.length; i++) {
      const d = normalizeDate_(toRows[i][TO.DATE]);
      if (d.substring(0, 7) !== monthStr) continue;
      const st = String(toRows[i][TO.STATUS]).toLowerCase().trim();
      if (toSummary[st] !== undefined) toSummary[st]++;
    }

    // ── 14-day trends for the V4·E2 manager telemetry strip ─────────
    // pendingTrend = new pending submissions per day (includes today).
    // missedTrend  = missed-clock-out instances per day (excludes today,
    //                since reps still mid-shift would always count as "missed").
    // Both reuse already-loaded sheet data (toRows, adpRows) — in-memory
    // iteration only, no extra Sheet reads.
    const trendDays = 14;
    const pendingTrendStart = (() => {
      const d = new Date(now); d.setDate(d.getDate() - (trendDays - 1));
      return fmtDateTz_(d, mgrTz);
    })();
    const missedTrendStart = (() => {
      const d = new Date(now); d.setDate(d.getDate() - trendDays);
      return fmtDateTz_(d, mgrTz);
    })();
    const missedTrendEnd = (() => {
      const d = new Date(now); d.setDate(d.getDate() - 1);
      return fmtDateTz_(d, mgrTz);
    })();

    const pendingByDate = {};
    for (let i = 1; i < toRows.length; i++) {
      if (String(toRows[i][TO.STATUS]).toLowerCase().trim() !== 'pending') continue;
      const submitted = String(toRows[i][TO.SUBMITTED_AT]).trim();
      // SUBMITTED_AT is written in CONFIG.TIMEZONE ("yyyy-MM-dd HH:mm:ss").
      // The trend day-keys below are in mgrTz, so convert the submission
      // instant to the manager-tz calendar day before bucketing — otherwise
      // submissions near local midnight land in the adjacent day's bar.
      let subDate = '';
      if (submitted) {
        try {
          const subInstant = Utilities.parseDate(submitted, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
          subDate = fmtDateTz_(subInstant, mgrTz);
        } catch (e) { subDate = submitted.substring(0, 10); }
      }
      if (subDate && subDate >= pendingTrendStart && subDate <= todayStr) {
        pendingByDate[subDate] = (pendingByDate[subDate] || 0) + 1;
      }
    }

    const trendPunchKey = {};
    for (let i = 2; i < adpRows.length; i++) {
      const id = String(adpRows[i][ADP.EMP_ID]).trim();
      const e = empById[id];
      if (!e) continue;
      const rowDate = normalizeDate_(adpRows[i][ADP.DATE]);
      if (rowDate < missedTrendStart || rowDate > missedTrendEnd) continue;
      const key = `${id}|${rowDate}`;
      if (!trendPunchKey[key]) trendPunchKey[key] = new Set();
      trendPunchKey[key].add(normalizeType_(String(adpRows[i][ADP.COMMENTS])));
    }
    const missedByDate = {};
    for (const key in trendPunchKey) {
      const types = trendPunchKey[key];
      if (types.has('ClockIn') && !types.has('ClockOut')) {
        const d = key.split('|')[1];
        missedByDate[d] = (missedByDate[d] || 0) + 1;
      }
    }

    const pendingTrend = [];
    for (let off = trendDays - 1; off >= 0; off--) {
      const dd = new Date(now); dd.setDate(dd.getDate() - off);
      const ds = fmtDateTz_(dd, mgrTz);
      pendingTrend.push({ date: ds, count: pendingByDate[ds] || 0 });
    }
    const missedTrend = [];
    for (let off = trendDays; off >= 1; off--) {
      const dd = new Date(now); dd.setDate(dd.getDate() - off);
      const ds = fmtDateTz_(dd, mgrTz);
      missedTrend.push({ date: ds, count: missedByDate[ds] || 0 });
    }

    return {
      today: todayStr,
      liveStatus, pending, missedPunches, recentPunches, recentAudits,
      missedLookbackDays:  CONFIG.MISSED_PUNCH_LOOKBACK_DAYS,
      mgrDeleteWindowDays: CONFIG.MGR_DELETE_WINDOW_DAYS,
      adjustWindowDays:    CONFIG.ADJUST_WINDOW_DAYS,
      ptoEnabled:          !!getFlag_('enablePtoTracking'),
      mgrTzAbbr,
      punchTrend, toSummary,
      pendingTrend, missedTrend,
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
        if (getFlag_('enablePtoTracking')) {
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
    if (!isValidTimeOffType_(type)) return { success: false, error: 'Invalid leave type.' };

    const targetEmp = lookupEmployeeById_(empId);
    if (!targetEmp) return { success: false, error: 'Employee not found.' };

    const toSheet = getOrCreateTimeOffSheet_();
    if (hasActiveTimeOffOnDate_(toSheet, targetEmp.id, date))
      return { success: false, error: 'That employee already has a pending or approved request for that date.' };

    const status = autoApprove ? 'Approved' : 'Pending';
    const submittedAt = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
    toSheet
      .appendRow([targetEmp.id, targetEmp.name, date, type, notes || '', status, submittedAt]);

    // Apply leave deduction immediately if auto-approving
    let newBalance = null;
    if (autoApprove && getFlag_('enablePtoTracking')) {
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

/** Manager-gated, read-only. Detects PTO balance drift from the H1 bug class:
 *  reps with MORE than one Approved time-off row on the same date were
 *  double-deducted. For each (rep, date) the legitimate charge is the single
 *  largest deduction; any additional approved rows are over-charge. Returns
 *  per-rep over-charge per bucket + the duplicate dates + current stored
 *  balances (for context). Pure read — correction is left to the manager via
 *  Adjust / timesheet so this can never itself mutate a balance. */
function getPtoReconciliation() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };

    const empRows = getEmployeeRosterRows_();
    const empById = {};
    for (let i = 1; i < empRows.length; i++) {
      const id = String(empRows[i][EMP.ID]).trim();
      if (!id) continue;
      empById[id] = {
        name:   String(empRows[i][EMP.NAME]).trim(),
        annual: parseFloat(empRows[i][EMP.ANNUAL_LEAVE]) || 0,
        sick:   parseFloat(empRows[i][EMP.SICK_LEAVE]) || 0,
      };
    }

    // Approved rows → byEmp[id][date] = [{bucket, days}, ...]
    const toRows = getOrCreateTimeOffSheet_().getDataRange().getValues();
    const byEmp = {};
    for (let i = 1; i < toRows.length; i++) {
      if (String(toRows[i][TO.STATUS]).toLowerCase().trim() !== 'approved') continue;
      const id = String(toRows[i][TO.EMP_ID]).trim();
      if (!id) continue;
      const dedu = getLeaveDeduction_(String(toRows[i][TO.TYPE]));
      if (!dedu.bucket || !(dedu.days > 0)) continue;   // unpaid / non-deducting
      const date = normalizeDate_(toRows[i][TO.DATE]);
      if (!byEmp[id]) byEmp[id] = {};
      if (!byEmp[id][date]) byEmp[id][date] = [];
      byEmp[id][date].push(dedu);
    }

    const reps = [];
    Object.keys(byEmp).forEach(function (id) {
      const dates = byEmp[id];
      let actAnnual = 0, actSick = 0, expAnnual = 0, expSick = 0;
      const dupDates = [];
      Object.keys(dates).forEach(function (d) {
        const list = dates[d].slice().sort(function (a, b) { return b.days - a.days; });
        list.forEach(function (x) {
          if (x.bucket === 'annual') actAnnual += x.days;
          else if (x.bucket === 'sick') actSick += x.days;
        });
        const c = list[0];   // canonical = single largest deduction for the day
        if (c.bucket === 'annual') expAnnual += c.days;
        else if (c.bucket === 'sick') expSick += c.days;
        if (list.length >= 2) dupDates.push({ date: d, approvedCount: list.length });
      });
      const overAnnual = Math.round((actAnnual - expAnnual) * 100) / 100;
      const overSick   = Math.round((actSick - expSick) * 100) / 100;
      if (overAnnual > 0 || overSick > 0) {
        const meta = empById[id] || { name: id, annual: 0, sick: 0 };
        reps.push({
          empId: id, name: meta.name,
          overAnnual: overAnnual, overSick: overSick,
          storedAnnual: meta.annual, storedSick: meta.sick,
          dates: dupDates.sort(function (a, b) { return a.date < b.date ? -1 : 1; }),
        });
      }
    });

    reps.sort(function (a, b) {
      return (b.overAnnual + b.overSick) - (a.overAnnual + a.overSick);
    });
    return { reps: reps, repsScanned: Object.keys(empById).length };
  } catch (err) { return { error: err.message }; }
}

/** Manager-gated, locked corrector for the H1 double-deduct (the mutating
 *  companion to the read-only getPtoReconciliation). For the target rep: per
 *  date with >1 Approved row, keep the single largest deduction (the canonical
 *  leave) and NEUTRALIZE the extras — set their status to 'Reconciled' so they
 *  no longer count as Approved — then CREDIT the over-charge back to the
 *  balances. Recomputes the over-charge server-side (never trusts a client
 *  amount). Idempotent by construction: after the run the extras aren't
 *  'Approved', so a re-run finds no duplicates and credits nothing. Writes a
 *  `PtoReconciliationFix` audit row. */
function fixPtoReconciliation(empId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const target = lookupEmployeeById_(empId);
    if (!target) return { success: false, error: 'Employee not found.' };

    const sheet = getOrCreateTimeOffSheet_();
    const rows = sheet.getDataRange().getValues();
    const byDate = {};   // date → [{rowIndex (1-based), days, bucket}]
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][TO.EMP_ID]).trim() !== empId) continue;
      if (String(rows[i][TO.STATUS]).toLowerCase().trim() !== 'approved') continue;
      const dedu = getLeaveDeduction_(String(rows[i][TO.TYPE]));
      if (!dedu.bucket || !(dedu.days > 0)) continue;
      const date = normalizeDate_(rows[i][TO.DATE]);
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push({ rowIndex: i + 1, days: dedu.days, bucket: dedu.bucket });
    }

    let creditAnnual = 0, creditSick = 0;
    const toReconcile = [];   // 1-based row indices of the over-charge rows
    Object.keys(byDate).forEach(function (d) {
      const list = byDate[d];
      if (list.length < 2) return;
      list.sort(function (a, b) { return b.days - a.days; });   // canonical = list[0]
      for (let k = 1; k < list.length; k++) {
        if (list[k].bucket === 'annual') creditAnnual += list[k].days;
        else if (list[k].bucket === 'sick') creditSick += list[k].days;
        toReconcile.push(list[k].rowIndex);
      }
    });
    creditAnnual = Math.round(creditAnnual * 100) / 100;
    creditSick   = Math.round(creditSick * 100) / 100;

    if (toReconcile.length === 0) {
      return { success: true, fixed: false, message: 'No duplicate approved rows to reconcile.' };
    }

    // Neutralize the extras FIRST (idempotency), then credit the balances.
    toReconcile.forEach(function (ri) {
      sheet.getRange(ri, TO.STATUS + 1).setValue('Reconciled');
    });
    let newAnnual = null, newSick = null;
    if (creditAnnual > 0) newAnnual = adjustLeaveBalance_(empId, 'annual', creditAnnual);
    if (creditSick > 0)   newSick   = adjustLeaveBalance_(empId, 'sick', creditSick);

    writeAuditLog_(target, 'PtoReconciliationFix', '', '', false, 0,
      `creditedAnnual=${creditAnnual}; creditedSick=${creditSick}; rowsReconciled=${toReconcile.length}`,
      callerEmp.email);

    return {
      success: true, fixed: true,
      creditedAnnual: creditAnnual, creditedSick: creditSick,
      rowsReconciled: toReconcile.length,
      newAnnual: newAnnual, newSick: newSick,
    };
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

    if (!PUNCH_LABELS_.includes(punchType))
      return { success: false, error: 'Invalid punch type.' };

    const targetEmp = lookupEmployeeById_(empId);
    const targetTz = targetEmp ? empTz_(targetEmp) : CONFIG.TIMEZONE;
    const today = fmtDateTz_(new Date(), targetTz);
    const daysBack = Math.abs(daysBetween_(date, today));
    if (daysBack > CONFIG.MGR_DELETE_WINDOW_DAYS) {
      return { success: false, error:
        `Cannot delete punches older than ${CONFIG.MGR_DELETE_WINDOW_DAYS} days.` };
    }

    const sheet = getAdpSS_().getSheetByName(CONFIG.ADP_TAB);
    const rows = sheet.getDataRange().getValues();
    for (let i = 2; i < rows.length; i++) {
      if (String(rows[i][ADP.EMP_ID]).trim() !== empId) continue;
      if (normalizeDate_(rows[i][ADP.DATE]) !== date) continue;
      if (normalizeTime_(rows[i][ADP.TIME]).trim() !== time) continue;
      if (normalizeType_(String(rows[i][ADP.COMMENTS])) !== punchType) continue;

      sheet.deleteRow(i + 1);
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
    if (!getFlag_('showTeammateStatus')) return { enabled: false, teammates: [] };
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

/** Sets (or clears) the flag type on a note. Pass '' to clear.
 *  Optional trainingQuestion: when flagging as 'training', merges
 *  the question into subformData so it appears in digests/Q&A. */
function setCallNoteFlag(noteId, flagType, trainingQuestion) {
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
      const dateLocal = normalizeDate_(located.row[CN.DATE_LOCAL]);
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
      subformData.trainingQuestion = String(trainingQuestion).trim();
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

    const dateLocal = normalizeDate_(located.row[CN.DATE_LOCAL]);
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

    const dateLocal = normalizeDate_(located.row[CN.DATE_LOCAL]);
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
    const noteMs = parseTimestampMs_(String(located.row[CN.TIMESTAMP] || ''), empTz);
    if (noteMs) {
      const elapsed = (Date.now() - noteMs) / 1000;
      if (elapsed > CONFIG.CALL_NOTES.DELETE_WINDOW_SECONDS) {
        const mins = Math.round(CONFIG.CALL_NOTES.DELETE_WINDOW_SECONDS / 60);
        return { success: false, error:
          `Notes can only be deleted within ${mins} minutes of creation. Edit the note instead, or ask your manager.` };
      }
    }

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

/** Returns the calling rep's most recent training-flagged notes that have a
 *  manager reply (non-empty subformData.trainingReply). Spans ALL dates
 *  (not just today) so the rep can see historical Q&A. Limited to 5,
 *  newest first. Read-only, caller-scoped. */
function getMyTrainingQA() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    if (!emp.callNotesSheetId) return { notes: [] };
    const sheet = getCallNotesSheet_(emp);
    const rows = sheet.getDataRange().getValues();
    const notes = [];
    for (let i = 1; i < rows.length; i++) {
      const note = callNoteRowToObject_({ row: rows[i], rowIndex: i + 1 });
      if (note.flagType === 'training'
          && note.subformData
          && note.subformData.trainingReply) {
        notes.push(note);
      }
    }
    notes.sort(function (a, b) { return b.timestamp.localeCompare(a.timestamp); });
    if (notes.length > 5) notes.length = 5;
    return { notes: notes };
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
    const rows = sheet.getDataRange().getValues();
    const notes = [];
    for (let i = 1; i < rows.length; i++) {
      const rowDate = normalizeDate_(rows[i][CN.DATE_LOCAL]);
      if (rowDate < startDate || rowDate > endDate) continue;
      const note = callNoteRowToObject_({ row: rows[i], rowIndex: i + 1 });
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
    const weekStartDate = new Date();
    weekStartDate.setDate(weekStartDate.getDate() - 6);
    const weekStart = Utilities.formatDate(weekStartDate, empTz, 'yyyy-MM-dd');

    const sheet = getCallNotesSheet_(emp);
    const rows = sheet.getDataRange().getValues();
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
    for (let i = 1; i < rows.length; i++) {
      const note = callNoteRowToObject_({ row: rows[i], rowIndex: i + 1 });
      if (note.dateLocal === today) todayTotal++;
      if (note.dateLocal && note.dateLocal >= weekStart && note.dateLocal <= today) weekTotal++;
      flagCounts.all++;
      if (note.flagType === 'action')   flagCounts.action++;
      if (note.flagType === 'training') flagCounts.training++;
      if (note.flagType === 'review')   flagCounts.review++;
      if (note.flagType === 'action' && !note.resolved) {
        unresolvedActionCount++;
        flagCounts.unresolved++;
        const noteMs = parseTimestampMs_(note.timestamp, empTz);
        if (noteMs && (nowMs - noteMs) >= staleMs) staleActionCount++;
      }
      if (note.flagType === 'training' && note.subformData && note.subformData.trainingReply) {
        flagCounts.qa++;
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
      flags: getClientFeatureFlags_(),
    };
  } catch (err) { return { error: err.message }; }
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
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
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
    for (let i = 1; i < roster.length; i++) {
      const sheetId = roster[i][EMP.CALL_NOTES_SHEET_ID];
      if (!sheetId) continue;
      try {
        const repEmp = {
          id: String(roster[i][EMP.ID]).trim(),
          callNotesSheetId: String(sheetId).trim(),
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
            const dateLocal = normalizeDate_(dateCol[j][0]);
            sub.tags.forEach(function (t) {
            const tag = String(t || '').trim().toLowerCase();
            if (!tag) return;
            if (!counts[tag]) counts[tag] = { tag: tag, count: 0, lastSeen: '', archived: !!archivedSet[tag] };
            counts[tag].count++;
            if (dateLocal > counts[tag].lastSeen) counts[tag].lastSeen = dateLocal;
            });
          }
        }
      } catch (e) { /* skip unreachable rep sheet */ }
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
    const taxResult = { tags: tags, archivedOnlyTags: archivedOnlyTags, totalNotes: totalNotes, repsScanned: repsScanned };
    try {
      const payload = JSON.stringify(taxResult);
      if (payload.length <= 90000) taxCache.put(CN_TAXONOMY_CACHE_KEY, payload, CN_TAXONOMY_CACHE_TTL);
      else console.warn('Tag taxonomy too large to cache (' + payload.length + ' bytes)');
    } catch (e) { /* cache put failed — return uncached, no behavioral impact */ }
    return taxResult;
  } catch (err) { return { error: err.message }; }
}

/** Drops the tag-taxonomy whole-result cache so the next Admin-tab load
 *  recomputes. Called by the tag-admin endpoints (rename/merge/archive) so a
 *  manager sees their change reflected immediately rather than after the TTL. */
function invalidateCnTaxonomyCache_() {
  try { CacheService.getScriptCache().remove(CN_TAXONOMY_CACHE_KEY); }
  catch (e) { /* best-effort */ }
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

const CN_ARCHIVED_TAGS_PROP = 'CN_ARCHIVED_TAGS';

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
    props.setProperty(CN_ARCHIVED_TAGS_PROP, JSON.stringify(arr));
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
    const sheetId = roster[i][EMP.CALL_NOTES_SHEET_ID];
    if (!sheetId) continue;
    try {
      const repEmp = {
        id: String(roster[i][EMP.ID]).trim(),
        callNotesSheetId: String(sheetId).trim(),
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

function arraysEqual_(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
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
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
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
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
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
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
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
    const dl = normalizeDate_(dateCol[d][0]);
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
        // Bounded read when a full date range is supplied; full scan for
        // open-ended search. Per-note date re-checks below stay as defensive
        // guards (and handle the partial-range case).
        const dr = (dateRange && dateRange.start && dateRange.end) ? dateRange : {};
        const located = readCallNoteRowsInRange_(sheet, dr.start, dr.end);
        for (let i = 0; i < located.length; i++) {
          const note = callNoteRowToObject_(located[i]);
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
        const lastRow = sheet.getLastRow();
        if (lastRow >= 2) {
          // S2: notes are appended in DateLocal order, so a single date maps to
          // a contiguous row slice. Scan only the date column (1 col) to find
          // the slice bounds, then read just that block of full rows — instead
          // of pulling every rep's entire history. Same pattern as
          // exportCallNotesRange. The per-note date re-check below stays as a
          // defensive guard against any out-of-order row.
          const dateCol = sheet.getRange(2, CN.DATE_LOCAL + 1, lastRow - 1, 1).getValues();
          let firstMatch = -1, lastMatch = -1;
          for (let d = 0; d < dateCol.length; d++) {
            if (normalizeDate_(dateCol[d][0]) === date) {
              if (firstMatch < 0) firstMatch = d;
              lastMatch = d;
            }
          }
          if (firstMatch >= 0) {
            const block = sheet.getRange(firstMatch + 2, 1, lastMatch - firstMatch + 1, CN_HEADERS.length).getValues();
            for (let i = 0; i < block.length; i++) {
              const note = callNoteRowToObject_({ row: block[i], rowIndex: firstMatch + i + 2 });
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
          }
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

    // ── CDR enrichment (best-effort) ──────────────────────────────────
    // Overlay call-volume metrics from DQE Historical Data onto each rep.
    // Failure here must not break the core shift-stats response.
    try {
      const repNames = reps.map(function (r) { return r.repName; });
      const cdrResult = getCdrAgentMetrics_(date, date, repNames);
      for (let ri = 0; ri < reps.length; ri++) {
        const cdr = cdrResult.agents[reps[ri].repName] || null;
        reps[ri].cdr = cdr ? {
          totalRung:     cdr.totalRung,
          totalAnswered: cdr.totalAnswered,
          totalMissed:   cdr.totalMissed,
          pctAnswered:   cdr.pctAnswered,
          tttFormatted:  cdr.tttFormatted,
          attFormatted:  cdr.attFormatted,
        } : null;
        reps[ri].noteCoverage = cnNoteCoverage_(reps[ri].totalNotes, cdr ? cdr.totalAnswered : 0);
      }
    } catch (cdrErr) {
      console.warn('managerGetShiftStats CDR enrichment failed: ' + cdrErr.message);
    }

    reps.sort(function (a, b) { return a.repName.localeCompare(b.repName); });
    return { date: date, reps: reps };
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
    const uResult = { count: total };
    try { uCache.put(CN_UNRESOLVED_CACHE_KEY, JSON.stringify(uResult), CN_UNRESOLVED_CACHE_TTL); }
    catch (e) { /* best-effort */ }
    return uResult;
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
      emailTemplates: getEmailTemplates_(),
      featureFlags: { registry: FEATURE_FLAGS, values: getFeatureFlagsResolved_() },
    };
  } catch (err) { return { error: err.message }; }
}

/** Manager-gated read of the feature-toggle registry + resolved values
 *  (also embedded in getAdminConfig; kept standalone for testability). */
function getFeatureFlags() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    return { registry: FEATURE_FLAGS, values: getFeatureFlagsResolved_() };
  } catch (err) { return { error: err.message }; }
}

/** Manager-gated write of the feature toggles to Script Property
 *  CN_FEATURE_FLAGS. Only registry keys with strict-boolean values are
 *  accepted (unknown key / non-boolean → rejected, never persisted). Writes an
 *  AdminConfigChange audit row (INV-57 family). Takes effect immediately:
 *  server reads getFlag_ fresh per request; clients pick it up on their next
 *  config fetch (page load / view enter) — see the runtime-flag design note. */
function saveFeatureFlags(flagMap) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    if (!flagMap || typeof flagMap !== 'object' || Array.isArray(flagMap)) {
      return { success: false, error: 'Invalid flags payload.' };
    }
    const clean = {};
    const keys = Object.keys(flagMap);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!featureFlagDef_(k)) return { success: false, error: 'Unknown flag: ' + k };
      const v = flagMap[k];
      if (v !== true && v !== false) return { success: false, error: 'Flag "' + k + '" must be true or false.' };
      clean[k] = v;
    }
    PropertiesService.getScriptProperties().setProperty('CN_FEATURE_FLAGS', JSON.stringify(clean));
    writeAuditLog_(callerEmp, 'AdminConfigChange', '', '', false, 0,
      'Updated feature toggles: ' + keys.map(function (k) { return k + '=' + (clean[k] ? 'on' : 'off'); }).join(', '),
      callerEmp.email);
    return { success: true, values: getFeatureFlagsResolved_() };
  } catch (err) { return { success: false, error: err.message }; }
}

function saveUpdateSuggestions(suggestionsJson) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    if (!suggestionsJson || typeof suggestionsJson !== 'object') return { success: false, error: 'Invalid suggestions map.' };
    var keys = Object.keys(suggestionsJson);
    for (var i = 0; i < keys.length; i++) {
      if (!Array.isArray(suggestionsJson[keys[i]])) return { success: false, error: 'Each department must map to an array of suggestions.' };
    }
    PropertiesService.getScriptProperties().setProperty('CN_UPDATE_SUGGESTIONS', JSON.stringify(suggestionsJson));
    writeAuditLog_(callerEmp, 'AdminConfigChange', '', '', false, 0,
      'Updated update-type suggestions', callerEmp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
}

/** Manager-gated. Persists the external-email template library to Script
 *  Property CN_EMAIL_TEMPLATES (JSON array). Validates each entry's name,
 *  recipientType, and body; caps count + body length. Writes an
 *  AdminConfigChange audit row (INV-57). Matches the sibling admin-save
 *  pattern (no ScriptLock — single Script Property write, same as
 *  saveDepartmentEmails / saveStateTaxRates / saveUpdateSuggestions). */
function saveEmailTemplates(templates) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    if (!Array.isArray(templates)) return { success: false, error: 'Invalid templates list.' };
    if (templates.length > CN_EMAIL_TEMPLATE_LIMIT) {
      return { success: false, error: 'Too many templates (max ' + CN_EMAIL_TEMPLATE_LIMIT + ').' };
    }
    const clean = [];
    for (var i = 0; i < templates.length; i++) {
      const t = templates[i] || {};
      const name = String(t.name || '').trim();
      const body = String(t.body || '');
      var rt = String(t.recipientType || 'any').trim().toLowerCase();
      if (CN_TEMPLATE_RECIPIENT_TYPES.indexOf(rt) < 0) rt = 'any';
      if (!name) return { success: false, error: 'Each template needs a name.' };
      if (!body.trim()) return { success: false, error: 'Template "' + name + '" needs a message body.' };
      if (body.length > CN_EMAIL_TEMPLATE_BODY_MAX) {
        return { success: false, error: 'Template "' + name + '" body exceeds ' + CN_EMAIL_TEMPLATE_BODY_MAX + ' chars.' };
      }
      clean.push({ name: name, recipientType: rt, body: body });
    }
    PropertiesService.getScriptProperties().setProperty('CN_EMAIL_TEMPLATES', JSON.stringify(clean));
    writeAuditLog_(callerEmp, 'AdminConfigChange', '', '', false, 0,
      'Updated email templates (' + clean.length + ')', callerEmp.email);
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

// ── Compliance audit panel (manager-gated) ──────────────────────────────

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
  if (lastRow <= 1) return { rows: [], scannedAll: true };
  const startRow = Math.max(2, lastRow - CN_AUDIT_MAX_SCAN + 1);
  const scannedAll = startRow === 2;
  const numRows = lastRow - startRow + 1;
  const data = sheet.getRange(startRow, 1, numRows, 10).getValues();
  const mgrTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
  const out = [];
  for (let i = data.length - 1; i >= 0; i--) {  // newest-first
    const action = String(data[i][4]);
    if (CN_AUDIT_ACTIONS.indexOf(action) < 0) continue;
    const tsRaw = String(data[i][0]);
    const notes = String(data[i][9]);
    out.push({
      timestamp:    tsRaw,
      timestampMgr: convertAuditTs_(tsRaw, CONFIG.TIMEZONE, mgrTz),
      repId:        String(data[i][1]),
      repName:      String(data[i][2]),
      actorEmail:   String(data[i][3]),
      action:       action,
      dateLocal:    String(data[i][5]),
      noteId:       cnExtractAuditNoteId_(notes),
      notes:        notes,
    });
  }
  return { rows: out, scannedAll: scannedAll };
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
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    filters = filters || {};
    const mgrTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
    const reDate = /^\d{4}-\d{2}-\d{2}$/;
    let end = (filters.endDate && reDate.test(filters.endDate))
      ? filters.endDate : fmtDateTz_(new Date(), mgrTz);
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
    let oldestScannedDate = null;
    for (let i = 0; i < read.rows.length; i++) {
      const r = read.rows[i];
      const dayStr = r.timestamp.substring(0, 10);  // ts is yyyy-MM-dd HH:mm:ss in CONFIG.TIMEZONE
      if (dayStr) oldestScannedDate = dayStr;        // rows are newest-first, so this ends on the oldest
      if (repId && r.repId !== repId) continue;
      if (action && r.action !== action) continue;
      if (dayStr < start || dayStr > end) continue;
      rows.push(r);
      if (rows.length >= CN_AUDIT_MAX_RESULTS) break;
    }
    // Truncated if we hit the result cap, OR the scan cap kept us from reaching
    // back to the requested start date (older matching rows may exist).
    const truncated = (rows.length >= CN_AUDIT_MAX_RESULTS) ||
      (!read.scannedAll && oldestScannedDate && oldestScannedDate > start);
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
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
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
    const nowIso = Utilities.formatDate(new Date(), empTz, "yyyy-MM-dd'T'HH:mm:ss");
    if (trimmed) {
      subformData.trainingReply = trimmed;
      subformData.trainingReplyBy = callerEmp.email;
      subformData.trainingReplyAt = nowIso;
      // Round 2 · 8g — also append to feedback[] so multi-turn threads can
      // build on top. Legacy clients still see trainingReply; new clients
      // walk the feedback array. trainingQuestion stays as the seed entry.
      subformData.feedback = Array.isArray(subformData.feedback) ? subformData.feedback : [];
      subformData.feedback.push({
        role: 'manager',
        message: trimmed,
        at: nowIso,
        by: callerEmp.email,
        kind: 'reply',
      });
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
    const msg = String(message || '').trim();
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
    subformData.feedback.push({
      role: 'manager', kind: 'comment', message: msg,
      at: Utilities.formatDate(new Date(), empTz, "yyyy-MM-dd'T'HH:mm:ss"),
      by: callerEmp.email,
    });
    sheet.getRange(located.rowIndex, CN.SUBFORM_DATA + 1).setValue(JSON.stringify(subformData));

    const dateLocal = normalizeDate_(located.row[CN.DATE_LOCAL]);
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
    const trimmed = String(message || '').trim();
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
    subformData.feedback.push({
      role: 'agent',
      message: kindV === 'ack' ? '' : trimmed,
      at: nowIso,
      by: emp.email,
      kind: kindV,
    });
    sheet.getRange(located.rowIndex, CN.SUBFORM_DATA + 1).setValue(JSON.stringify(subformData));

    const dateLocal = normalizeDate_(located.row[CN.DATE_LOCAL]);
    writeAuditLog_(emp, 'CallNoteFeedback', dateLocal, '', false, 0,
      `noteId=${noteId}; kind=${kindV}`);

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
      }
    }
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return { flagType, results };
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
  for (let r = 1; r < roster.length; r++) {
    const sheetId = roster[r][EMP.CALL_NOTES_SHEET_ID];
    if (!sheetId) continue;
    const repId = String(roster[r][EMP.ID]).trim();
    const repName = String(roster[r][EMP.NAME]).trim();
    try {
      const sheet = getCallNotesSheet_({ id: repId, name: repName, callNotesSheetId: String(sheetId).trim() });
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
    }
  }
  results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return { results };
}


// ── Call Notes helpers (private) ────────────────────────────────────────

function sanitizeCallNotePayload_(p) {
  const s = (v) => (v === null || v === undefined) ? '' : String(v).trim();
  // Round 2 · 8e — accept multi-flag array (p.flags) + tags (p.tags) in
  // addition to the legacy single-select p.flagType. When p.flags is
  // present, derive FlagType from it (priority order); fall back to
  // p.flagType otherwise so old clients still work.
  const flagsArr = sanitizeFlagsArray_(p.flags);
  const derivedFromArr = flagsArr.length > 0 ? deriveFlagType_(flagsArr) : '';
  const flagType = derivedFromArr || s(p.flagType).toLowerCase();
  const tagsArr = sanitizeTagsArray_(p.tags);
  // Merge tags/flags into subformData so the schema stays in one column
  // (per X5 — no new sheet column). Pin stays in subformData.pinned with
  // its 3-cap, separate from this array.
  let subformData = p.subformData || null;
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
      const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
      return { rowIndex: rowIndex, row: row };
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
  paper2:       '#f0f2f6',
  ink:          '#0f1623',
  muted:        '#3e4756',
  line:         '#dce0e7',
  accent:       '#0f8a52',      // console-redesign primary green
  accentSoft:   '#e4f5ec',
  accentDeep:   '#0b6e40',
  good:         '#0f8a52',      // aliased to accent (one editorial green)
  goodSoft:     '#e4f5ec',
  goodDeep:     '#0b6e40',
  warn:         '#b7791f',
  warnSoft:     '#fbf1d9',
  warnDeep:     '#8a4500',
  danger:       '#c13030',
  dangerSoft:   '#fce5e5',
  dangerDeep:   '#8a1f1f',
  // UMS brand navy + pale-blue alternating-row tint. These match the legacy
  // dept-email aesthetic (closeOrderEmail.js, updateOrderEmail.js) so emails
  // sent from the new web app look continuous with the prior tooling.
  brand:        '#223b5d',
  brandSoft:    '#e6f2ff',
  logoUrl:      'https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/UMS%20Presentation%20Logo.jpg',
};

/** Shared branded wrapper for automated notification emails (item 2) — logo
 *  bar + colored header + white card + footer, matching the CN_EMAIL_PALETTE
 *  identity (inline hex; email clients strip <style>). `heading` is esc_'d
 *  here; `bodyHtml` is caller-built and MUST already esc_ any user data.
 *  `opts.accent` overrides the header color (default brand navy). */
function buildBrandedEmailHtml_(heading, bodyHtml, opts) {
  opts = opts || {};
  const P = CN_EMAIL_PALETTE;
  const accent = opts.accent || P.brand;
  return (
    '<div style="margin:0;padding:0;background:' + P.paper + ';">' +
    '<div style="max-width:600px;margin:0 auto;padding:20px 12px;font-family:\'Inter\',\'Helvetica Neue\',Arial,sans-serif;color:' + P.ink + ';">' +
      '<div style="text-align:center;padding:0 0 14px;">' +
        '<img src="' + P.logoUrl + '" alt="UMS" style="max-height:46px;max-width:200px;">' +
      '</div>' +
      '<div style="background:' + P.paperCard + ';border:1px solid ' + P.line + ';border-radius:10px;overflow:hidden;">' +
        '<div style="background:' + accent + ';color:#ffffff;padding:13px 20px;font-size:16px;font-weight:600;">' + esc_(heading) + '</div>' +
        '<div style="padding:18px 20px;font-size:14px;line-height:1.55;color:' + P.ink + ';">' + bodyHtml + '</div>' +
      '</div>' +
      '<div style="text-align:center;color:' + P.muted + ';font-size:11px;padding:14px 0 0;">UMS Team Tools · automated message</div>' +
    '</div></div>'
  );
}

/** Renders an array of [label, value] pairs as a styled two-column block for
 *  branded emails. Both label and value are esc_'d. */
function brandedKvRows_(pairs) {
  const P = CN_EMAIL_PALETTE;
  return '<table style="width:100%;border-collapse:collapse;font-size:14px;margin:4px 0;">' +
    pairs.map(function (p) {
      return '<tr><td style="padding:4px 12px 4px 0;color:' + P.muted + ';font-weight:600;white-space:nowrap;vertical-align:top;">' +
               esc_(p[0]) + '</td><td style="padding:4px 0;color:' + P.ink + ';">' + esc_(p[1]) + '</td></tr>';
    }).join('') +
  '</table>';
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
      `noteId=${noteId}; depts=${deptLabel || '(none)'}; recipients=${recipientList.to.split(',').length}`);

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
    resolutionText = esc_(generateOOPResolutionText_(selections)).replace(/\n/g, '<br>');
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

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}


// ════════════════════════════════════════════════════════════════════════════
//  CALL NOTES — EXTERNAL EMAIL (CUSTOMER / PROVIDER)
//  ────────────────────────────────────────────────────────────────────────
//  Separate flow from the internal department email. Sends directly to a
//  customer or provider address with optional PDF form attachments from the
//  GitHub-hosted form catalog. No preview gate — the modal shows a summary
//  before send. If a noteId is linked, stamps subformData.externalEmails[]
//  on the note for tracking.
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
    MailApp.sendEmail(emailOpts);
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
        subformData.externalEmails.push(stampEntry);
        sheet.getRange(located.rowIndex, CN.SUBFORM_DATA + 1).setValue(JSON.stringify(subformData));
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
  writeAuditLog_(emp, 'ExternalEmailSent', '', '', false, 0,
    'recipientDomain=' + recipientDomain + '; type=' + recipientType +
    '; pdfForms=' + formsList +
    '; interactiveForms=' + interactiveList +
    (noteId ? '; noteId=' + noteId : ''));

  return {
    success: true,
    sentAt: sentAt,
    recipientEmail: recipientEmail,
    formsAttached: formNames,
    formLinks: formLinks.map(function(fl) { return { name: fl.name, url: fl.url, formType: fl.formType }; }),
  };
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

/** Customer-facing HTML email — friendly, warm tone. */
function buildCustomerEmailHtml_(recipientName, message, formNames, formLinks) {
  const P = CN_EMAIL_PALETTE;
  const greeting = recipientName
    ? 'Dear ' + esc_(recipientName) + ','
    : 'Hello,';
  const messageBlock = message
    ? '<p style="margin:14px 0;font-size:14px;line-height:1.6;color:' + P.ink + ';">' + esc_(message).replace(/\n/g, '<br>') + '</p>'
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
        '<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:' + P.muted + ';">Thank you for reaching out to Universal Medical Supply. We appreciate the opportunity to assist you.</p>' +
        messageBlock +
        interactiveBlock +
        formsBlock +
        '<p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:' + P.muted + ';">If you have any questions regarding the attached documents or need further assistance, please do not hesitate to contact us.</p>' +
        '<p style="margin:14px 0 0;font-size:14px;color:' + P.ink + ';">Warm regards,<br><strong>Universal Medical Supply</strong></p>' +
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
    ? '<p style="margin:14px 0;font-size:14px;line-height:1.6;color:' + P.ink + ';">' + esc_(message).replace(/\n/g, '<br>') + '</p>'
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
        '<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:' + P.muted + ';">Please find the requested documentation attached to this correspondence. We are writing on behalf of our patient as part of their ongoing care coordination with Universal Medical Supply.</p>' +
        messageBlock +
        interactiveBlock +
        formsBlock +
        '<p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:' + P.muted + ';">Should you require any additional information or have questions regarding the enclosed materials, please contact our office at your earliest convenience.</p>' +
        '<p style="margin:14px 0 0;font-size:14px;color:' + P.ink + ';">Respectfully,<br><strong>Universal Medical Supply</strong></p>' +
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
  lines.push('Thank you for reaching out to Universal Medical Supply. We appreciate the opportunity to assist you.');
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
  lines.push('Universal Medical Supply');
  return lines.join('\n');
}

/** Provider-facing plain-text fallback. */
function buildProviderEmailText_(recipientName, message, formNames, formLinks) {
  const lines = [];
  lines.push(recipientName ? 'Dear ' + recipientName + ',' : 'To Whom It May Concern,');
  lines.push('');
  lines.push('Please find the requested documentation attached to this correspondence. We are writing on behalf of our patient as part of their ongoing care coordination with Universal Medical Supply.');
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
  lines.push('Universal Medical Supply');
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

// FormTokens tab schema
const FT = {
  TOKEN:0, FORM_TYPE:1, RECIPIENT_EMAIL:2, RECIPIENT_NAME:3,
  CREATED_AT:4, EXPIRES_AT:5, STATUS:6, PREFILL_DATA:7,
  CREATED_BY:8, NOTE_ID:9,
};
const FT_HEADERS = [
  'Token','FormType','RecipientEmail','RecipientName',
  'CreatedAt','ExpiresAt','Status','PrefillData',
  'CreatedBy','NoteId',
];

// FormSubmissions tab schema
const FS = {
  TOKEN:0, FORM_TYPE:1, RECIPIENT_EMAIL:2, SUBMITTED_AT:3,
  FORM_DATA:4, SIGNATURE_DATA:5,
};
const FS_HEADERS = [
  'Token','FormType','RecipientEmail','SubmittedAt',
  'FormData','SignatureData',
];

// ── Valid interactive form type IDs (subset of FORM_CATALOG) ─────────
const INTERACTIVE_FORM_TYPES = ['eaa', 'pt-ot-rx', 'seating-eval'];

/** Returns or creates the FormTokens tab in the ADP spreadsheet. */
function getOrCreateFormTokensSheet_() {
  const ss = getAdpSS_();
  let sheet = ss.getSheetByName(CONFIG.FORM_TOKENS_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.FORM_TOKENS_TAB);
    sheet.appendRow(FT_HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, FT_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

/** Returns or creates the FormSubmissions tab in the ADP spreadsheet. */
function getOrCreateFormSubmissionsSheet_() {
  const ss = getAdpSS_();
  let sheet = ss.getSheetByName(CONFIG.FORM_SUBMISSIONS_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.FORM_SUBMISSIONS_TAB);
    sheet.appendRow(FS_HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, FS_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

/** Generates a UUID v4 token. */
function generateFormToken_() {
  return Utilities.getUuid();
}

/** Build the public form URL for a token. Uses ScriptApp.getService().getUrl()
 *  which returns the deployed web app URL. */
function buildFormUrl_(token) {
  return ScriptApp.getService().getUrl() + '?form=' + encodeURIComponent(token);
}

/** Creates a form token. Called by the external email flow when "fillable"
 *  is selected for a form. Requires a registered employee. */
function createFormToken(payload) {
  const emp = getEmployeeInfo_();
  if (!emp) return { success: false, error: 'Employee not found.' };

  const p = payload || {};
  const formType      = String(p.formType || '').trim();
  const recipientEmail = String(p.recipientEmail || '').trim();
  const recipientName = String(p.recipientName || '').trim();
  const prefillData   = p.prefillData || {};
  const noteId        = p.noteId || null;

  // Validate form type
  if (INTERACTIVE_FORM_TYPES.indexOf(formType) < 0) {
    return { success: false, error: 'Unknown interactive form type: ' + formType };
  }
  // Validate recipient email
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return { success: false, error: 'Valid recipient email required for interactive form.' };
  }

  const token = generateFormToken_();
  const now = new Date();
  const empTz = empTz_(emp);
  const createdAt = Utilities.formatDate(now, empTz, "yyyy-MM-dd'T'HH:mm:ss");
  const expiresDate = new Date(now.getTime() + (CONFIG.FORM_TOKEN_EXPIRY_HOURS || 72) * 3600000);
  const expiresAt = Utilities.formatDate(expiresDate, empTz, "yyyy-MM-dd'T'HH:mm:ss");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getOrCreateFormTokensSheet_();
    sheet.appendRow([
      token, formType, recipientEmail, recipientName,
      createdAt, expiresAt, 'pending',
      JSON.stringify(prefillData),
      emp.email, noteId || '',
    ]);
  } finally {
    lock.releaseLock();
  }

  const formUrl = buildFormUrl_(token);

  writeAuditLog_(emp, 'FormTokenCreated', '', '', false, 0,
    'token=' + token + '; formType=' + formType + '; to=' + recipientEmail +
    (noteId ? '; noteId=' + noteId : ''));

  return { success: true, token: token, formUrl: formUrl };
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

    // Check expiration — compare stored expiresAt with current time.
    // ExpiresAt is in the creating rep's tz, but for comparison we parse
    // it generously — if it's in the past by any reading, it's expired.
    const expiresAtStr = String(row[FT.EXPIRES_AT] || '');
    if (expiresAtStr) {
      try {
        const expMs = Utilities.parseDate(expiresAtStr, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss").getTime();
        if (Date.now() > expMs) {
          // Mark as expired in the sheet (best-effort)
          try {
            sheet.getRange(located.rowIndex, FT.STATUS + 1).setValue('expired');
          } catch(_) {}
          return { error: 'This form link has expired. Please contact UMS to request a new one.' };
        }
      } catch(_) { /* unparseable — allow access rather than lock out */ }
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
      expiresAt: expiresAtStr,
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

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
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

    // Check expiration
    const expiresAtStr = String(row[FT.EXPIRES_AT] || '');
    if (expiresAtStr) {
      try {
        const expMs = Utilities.parseDate(expiresAtStr, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss").getTime();
        if (Date.now() > expMs) {
          tokenSheet.getRange(located.rowIndex, FT.STATUS + 1).setValue('expired');
          return { success: false, error: 'This form link has expired.' };
        }
      } catch(_) {}
    }

    const formType = String(row[FT.FORM_TYPE]).trim();
    const recipientEmail = String(row[FT.RECIPIENT_EMAIL]).trim();
    const recipientName = String(row[FT.RECIPIENT_NAME] || '').trim();
    const createdBy = String(row[FT.CREATED_BY] || '').trim();
    const noteId = String(row[FT.NOTE_ID] || '').trim();

    // Validate form data (basic shape check)
    const data = formData || {};
    const sanitizedData = {};
    Object.keys(data).forEach(function(k) {
      if (k === 'signature') return; // signature handled separately
      sanitizedData[k] = data[k];
    });
    const signatureData = String(data.signature || '');

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
      notifyRepOfFailedSubmission_(createdBy, recipientEmail, formType, 'too many fields');
      return { success: false, error: 'This submission has too many fields to save.' };
    }
    const dataJson = JSON.stringify(sanitizedData);
    if (dataJson.length > FORM_CELL_CHAR_LIMIT) {
      notifyRepOfFailedSubmission_(createdBy, recipientEmail, formType, 'the response data exceeds the per-cell size limit');
      return { success: false, error: 'This submission is too large to save. Please shorten your responses and resubmit.' };
    }
    if (signatureData.length > FORM_CELL_CHAR_LIMIT) {
      notifyRepOfFailedSubmission_(createdBy, recipientEmail, formType, 'the signature image exceeds the per-cell size limit');
      return { success: false, error: 'Your signature image is too large to save. Please redraw a simpler signature and resubmit.' };
    }

    // Save submission
    const now = new Date();
    const submittedAt = Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
    const submissionsSheet = getOrCreateFormSubmissionsSheet_();
    submissionsSheet.appendRow([
      token, formType, recipientEmail, submittedAt,
      dataJson,
      signatureData,
    ]);

    // Mark token as submitted
    tokenSheet.getRange(located.rowIndex, FT.STATUS + 1).setValue('submitted');

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
              callNotesSheetId: empRows[i][EMP.CALL_NOTES_SHEET_ID]
                ? String(empRows[i][EMP.CALL_NOTES_SHEET_ID]).trim() : null,
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
            cnSheet.getRange(noteLocated.rowIndex, CN.SUBFORM_DATA + 1).setValue(JSON.stringify(subformData));
          }
        }
      } catch (stampErr) {
        console.warn('submitFormByToken: note stamp failed: ' + stampErr.message);
      }
    }

    // Notify the rep who created the token with the completed, stylized form
    // (HTML body rendering all responses + the signature as a PNG attachment +
    // a best-effort PDF of the whole form). Best-effort — a failure here never
    // blocks the recipient's already-successful submission.
    try {
      if (createdBy) {
        notifyRepOfFormSubmission_(createdBy, formType, recipientName, recipientEmail,
          submittedAt, sanitizedData, signatureData);
      }
    } catch (emailErr) {
      console.warn('submitFormByToken: notification email failed: ' + emailErr.message);
    }

    // Audit log (use a synthetic emp object since this is a public endpoint)
    try {
      const auditEmp = { id: 'EXTERNAL', name: recipientName || recipientEmail, email: recipientEmail };
      writeAuditLog_(auditEmp, 'FormSubmissionReceived', '', '', false, 0,
        'token=' + token + '; formType=' + formType + '; from=' + recipientEmail +
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
    const rows = sheet.getRange(2, 1, lastRow - 1, FT_HEADERS.length).getValues();
    const catalog = CONFIG.CALL_NOTES.FORM_CATALOG || [];
    const nameById = {};
    catalog.forEach(function (f) { nameById[f.id] = f.name; });
    const nowMs = Date.now();
    const forms = [];
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][FT.CREATED_BY] || '').toLowerCase().trim() !== myEmail) continue;
      const formType = String(rows[i][FT.FORM_TYPE] || '').trim();
      let status = String(rows[i][FT.STATUS] || '').trim().toLowerCase();
      const expiresAtStr = String(rows[i][FT.EXPIRES_AT] || '');
      if (status === 'pending' && expiresAtStr) {
        try {
          const expMs = Utilities.parseDate(expiresAtStr, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss").getTime();
          if (nowMs > expMs) status = 'expired';
        } catch (_) {}
      }
      forms.push({
        token: String(rows[i][FT.TOKEN] || '').trim(),
        formType: formType,
        formName: nameById[formType] || formType,
        recipientName: String(rows[i][FT.RECIPIENT_NAME] || ''),
        recipientEmail: String(rows[i][FT.RECIPIENT_EMAIL] || ''),
        status: status,
        createdAt: String(rows[i][FT.CREATED_AT] || ''),
        expiresAt: expiresAtStr,
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

  const subSheet = getOrCreateFormSubmissionsSheet_();
  const rows = subSheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][FS.TOKEN]).trim() !== token) continue;
    let formData = {};
    try { formData = JSON.parse(rows[i][FS.FORM_DATA]) || {}; } catch (_) {}
    const fields = Object.keys(formData).map(function (k) {
      return { key: k, label: humanizeFormFieldKey_(k), value: formData[k] };
    });
    const signature = String(rows[i][FS.SIGNATURE_DATA] || '');
    return {
      submitted: true,
      formType, formName, recipientName,
      recipientEmail: String(rows[i][FS.RECIPIENT_EMAIL] || recipientEmail),
      submittedAt: String(rows[i][FS.SUBMITTED_AT] || ''),
      fields,
      hasSignature: !!signature,
      signature,
      // Pre-rendered branded card (responses table + signature) so the in-app
      // viewer matches the submission email. Safe to innerHTML — esc_-escaped.
      submissionHtml: buildFormSubmissionCardHtml_(formData, signature),
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
        esc_(formatFormFieldValue_(sanitizedData[k])).replace(/\n/g, '<br>') + '</td>' +
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
    MailApp.sendEmail({
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
  MailApp.sendEmail(opts);
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

/** Deletes data rows whose date column (0-based `dateColIdx`) is strictly older
 *  than `cutoffMs`. Deletes descending so row-index shifts don't skip rows.
 *  Returns the count removed. Caller holds the lock. */
function purgeSheetRowsOlderThan_(sheet, dateColIdx, cutoffMs) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const rows = sheet.getDataRange().getValues();
  const toDelete = [];
  for (let i = 1; i < rows.length; i++) {
    const ms = parseRetentionDateMs_(rows[i][dateColIdx]);
    if (ms !== null && ms < cutoffMs) toDelete.push(i + 1);  // 1-based sheet row
  }
  for (let j = toDelete.length - 1; j >= 0; j--) {
    sheet.deleteRow(toDelete[j]);
  }
  return toDelete.length;
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
        const sheetIdRaw = roster[r][EMP.CALL_NOTES_SHEET_ID];
        if (!sheetIdRaw || !String(sheetIdRaw).trim()) continue;
        const emp = {
          id:   String(roster[r][EMP.ID]).trim(),
          name: String(roster[r][EMP.NAME]).trim(),
          callNotesSheetId: String(sheetIdRaw).trim(),
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
    'sendCallNotesUrgentDigest',
    'purgeExpiredFormData',
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
  // Call Notes EOD warning — G4: runs HOURLY. The handler walks the roster
  // and emails each enrolled rep only during the run that lands in their
  // LOCAL EOD hour (CONFIG.CALL_NOTES.EOD_WARNING_HOUR). An hourly cadence +
  // per-rep local-hour match means a single trigger reliably reaches reps in
  // every timezone — the prior once-at-manager-5pm trigger silently skipped
  // offshore reps (IST/PHT) whose local 5pm never coincided with the
  // manager's. Most hourly runs send nothing (no reps at their EOD hour with
  // unresolved flags), so the cost is just a cached roster walk.
  ScriptApp.newTrigger('sendCallNotesEodDigest')
    .timeBased().everyHours(1).create();
  // Weekly manager digests for training queue + review candidates
  ScriptApp.newTrigger('sendCallNotesWeeklyDigests')
    .timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(8)
    .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
  // Daily urgent-flag digest (manager-tz 8am) — recent urgent-flagged notes.
  ScriptApp.newTrigger('sendCallNotesUrgentDigest')
    .timeBased().atHour(8).everyDays(1)
    .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
  // Daily PHI-retention purge of FormSubmissions + FormTokens. No-ops while
  // FORM_DATA_RETENTION_DAYS = 0 (the default), so installing it is harmless;
  // it only deletes once the operator sets a positive retention window.
  ScriptApp.newTrigger('purgeExpiredFormData')
    .timeBased().atHour(3).everyDays(1)
    .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
  // Rolling note retention (item 7) — also no-ops while CN_NOTE_RETENTION_DAYS=0
  // (the default), so installing it is harmless. Staggered to 4am so the two
  // destructive purges don't overlap.
  ScriptApp.newTrigger('purgeOldCallNotes')
    .timeBased().atHour(4).everyDays(1)
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
  assertManagerCaller_('removeAutomationTriggers');
  const TARGETS = [
    'sendDailyMissedPunchAlerts',
    'runDailyExportCheck',
    'sendCallNotesEodDigest',
    'sendCallNotesWeeklyDigests',
    'sendCallNotesUrgentDigest',
    'purgeExpiredFormData',
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
          htmlBody: buildBrandedEmailHtml_('Missing clock-out',
            '<p style="margin:0 0 10px;">Hi ' + esc_(emp.name) + ',</p>' +
            '<p style="margin:0 0 12px;">Our records show you clocked in on <b>' + esc_(emp.yesterdayStr) + '</b> (' + esc_(tzAbbr_(emp.timezone)) + ') but didn\'t clock out. Please open the UMS Time Clock app and use the <b>Adjust</b> feature to record your clock-out time.</p>' +
            '<p style="margin:14px 0 0;color:' + CN_EMAIL_PALETTE.muted + ';">If you have any questions, please contact your manager.</p>',
            { accent: CN_EMAIL_PALETTE.warn }),
        });
      } catch (e) { Logger.log('Failed to email employee ' + emp.email + ': ' + e.message); }
    });

    const recipients = getManagerEmails_();
    if (recipients.length > 0) {
      const list = missed.map(e =>
        `• ${e.name} (${e.id}) — ${e.email} — missed ${e.yesterdayStr} ${tzAbbr_(e.timezone)}`).join('\n');
      try {
        const listHtml = '<ul style="margin:0 0 12px;padding-left:18px;">' + missed.map(function (e) {
          return '<li style="margin:4px 0;">' + esc_(e.name) + ' (' + esc_(e.id) + ') — ' + esc_(e.email) +
                 ' — missed ' + esc_(e.yesterdayStr) + ' ' + esc_(tzAbbr_(e.timezone)) + '</li>';
        }).join('') + '</ul>';
        MailApp.sendEmail({
          to: recipients.join(','),
          subject: `⏰ Missed Clock-Outs — ${missed.length} employee(s)`,
          body:
            `The following employees clocked in but did not clock out:\n\n${list}\n\n` +
            `Each has been emailed a reminder to fix it via the Adjust feature.\n\n` +
            `Audit log:\nhttps://docs.google.com/spreadsheets/d/${getAdpSS_().getId()}/edit`,
          htmlBody: buildBrandedEmailHtml_(missed.length + ' missed clock-out(s)',
            '<p style="margin:0 0 10px;">The following employees clocked in but did not clock out:</p>' +
            listHtml +
            '<p style="margin:0 0 12px;color:' + CN_EMAIL_PALETTE.muted + ';">Each has been emailed a reminder to fix it via the Adjust feature.</p>' +
            '<p style="margin:0;"><a href="https://docs.google.com/spreadsheets/d/' + getAdpSS_().getId() + '/edit" style="color:' + CN_EMAIL_PALETTE.brand + ';font-weight:600;">Open the audit log →</a></p>',
            { accent: CN_EMAIL_PALETTE.warn }),
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
    if (urgent.results && urgent.results.length > 0) {
      sendManagerFlagDigest_(mgrEmails, 'Urgent', urgent.results, dateRange);
    }
    Logger.log(`sendCallNotesUrgentDigest: urgent=${(urgent.results || []).length}`);
  } catch (err) {
    Logger.log('sendCallNotesUrgentDigest failed: ' + err.message);
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
  const showTeammateType = getFlag_('showTeammateType');  // hoisted — avoid a Script-Property read per teammate
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
        type: showTeammateType ? String(toRows[i][TO.TYPE]) : 'Off', status });
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
    ptoEnabled: !!(getFlag_('enablePtoTracking') && emp.ptoEnabled),
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
// Canonical set of leave types the app accepts. Mirrors the Type <select>
// options in modals.html plus 'Unpaid Leave' (recognized by
// getLeaveDeduction_ but not offered in the picker). Validated server-side
// so a client bug / direct RPC can't write a garbage type that
// getLeaveDeduction_ then silently defaults to annual/1.0 (M1).
const TIME_OFF_TYPES = [
  'Full Day', 'Half Day - Morning', 'Half Day - Afternoon',
  'Sick Leave', 'Personal Day', 'Unpaid Leave', 'Other',
];

/** Case-insensitive, trimmed validity check for a time-off Type — mirrors
 *  getLeaveDeduction_'s matching semantics so the two never disagree. */
function isValidTimeOffType_(type) {
  const t = String(type || '').toLowerCase().trim();
  if (!t) return false;
  return TIME_OFF_TYPES.some(function (k) { return k.toLowerCase() === t; });
}

/** True when the employee already has a Pending or Approved time-off
 *  request for `date` (yyyy-MM-dd). Used to block duplicate same-date
 *  requests: INV-03's transition guard is per-row, so two sibling rows for
 *  one day would each deduct on approval and double-charge the balance (H1).
 *  Denied/cancelled rows never deducted, so they don't block a re-request. */
function hasActiveTimeOffOnDate_(sheet, empId, date) {
  const rows = sheet.getDataRange().getValues();
  const id = String(empId).trim();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][TO.EMP_ID]).trim() !== id) continue;
    if (normalizeDate_(rows[i][TO.DATE]) !== date) continue;
    const st = String(rows[i][TO.STATUS]).toLowerCase().trim();
    if (st === 'pending' || st === 'approved') return true;
  }
  return false;
}

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
  if (!getFlag_('enablePtoTracking')) return null;
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

// ── Runtime feature toggles (Admin) ───────────────────────────────────────
// Manager-flippable booleans, live without a redeploy (same Script-Property
// pattern as the config getters above). The registry is the single source of
// truth — only these keys are honored, and each `default` mirrors the legacy
// CONFIG constant so migrating a read to getFlag_() is a behavioral no-op
// until a flag is actually set. `scope` decides enforcement: 'client' flags
// only gate UI (delivered to the client); 'server'/'both' flags are ALSO
// checked server-side in their endpoint — hiding a button never disables an
// endpoint (INV-02 / S30). `danger` carries a confirm/warning for the Admin UI.
const FEATURE_FLAGS = [
  { key: 'showTeammateStatus', label: 'Teammate status card',
    description: 'Show the teammate status card on the Clock page.',
    default: !!CONFIG.SHOW_TEAMMATE_STATUS, scope: 'both' },
  { key: 'showTeammateType', label: 'Teammate punch type',
    description: 'Include each teammate’s current punch type in the status card.',
    default: !!CONFIG.SHOW_TEAMMATE_TYPE, scope: 'both' },
  { key: 'enablePtoTracking', label: 'PTO tracking',
    description: 'Master switch for PTO balances, accrual UI, and deductions.',
    default: !!CONFIG.ENABLE_PTO_TRACKING, scope: 'both',
    danger: 'Stateful — disabling mid-cycle hides PTO and stops new deductions but does NOT reverse approvals already applied. Flip only between cycles.' },
  { key: 'voiceInput', label: 'Voice dictation (Call Notes)',
    description: 'Mic-to-text on the Issue / Resolution fields.',
    default: !!CONFIG.CALL_NOTES.VOICE_INPUT_ENABLED, scope: 'client',
    danger: 'HIPAA — routes dictated audio to the browser vendor’s speech-to-text service, which is NOT covered by a typical Google Workspace BAA. Confirm the org’s stance first.' },
  { key: 'oopSalesTax', label: 'OOP sales-tax calculator',
    description: 'Show the state sales-tax field + tax line in the OOP Order subform.',
    default: true, scope: 'client' },
];

function featureFlagDef_(key) {
  for (let i = 0; i < FEATURE_FLAGS.length; i++) {
    if (FEATURE_FLAGS[i].key === key) return FEATURE_FLAGS[i];
  }
  return null;
}

/** Reads the CN_FEATURE_FLAGS Script Property as a { key: bool } override map.
 *  Sanitizes on read — a corrupt/non-object blob degrades to {} (never throws),
 *  so a bad property can't break every flag read. */
function getFlagOverrides_() {
  const prop = PropertiesService.getScriptProperties().getProperty('CN_FEATURE_FLAGS');
  if (!prop) return {};
  try {
    const obj = JSON.parse(prop);
    return (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
  } catch (_) { return {}; }
}

/** Resolve a single flag: Script-Property override first, else the registry
 *  default. An unknown key fails safe to false. */
function getFlag_(key) {
  const overrides = getFlagOverrides_();
  if (Object.prototype.hasOwnProperty.call(overrides, key)) {
    return overrides[key] === true || overrides[key] === 'true';
  }
  const def = featureFlagDef_(key);
  return def ? !!def.default : false;
}

/** Every registry flag → resolved boolean. */
function getFeatureFlagsResolved_() {
  const overrides = getFlagOverrides_();
  const out = {};
  FEATURE_FLAGS.forEach(function (f) {
    out[f.key] = Object.prototype.hasOwnProperty.call(overrides, f.key)
      ? (overrides[f.key] === true || overrides[f.key] === 'true')
      : !!f.default;
  });
  return out;
}

/** Client-deliverable flags — the resolved values for non-server-only flags.
 *  (Pure 'server' kill-switches aren't shipped to the client; none exist yet.)
 *  Rides getEmployeeState (empState.flags) + getCallNotesDepartments
 *  (deptConfig.flags); the client reads them via flagOn_(). */
function getClientFeatureFlags_() {
  const resolved = getFeatureFlagsResolved_();
  const out = {};
  FEATURE_FLAGS.forEach(function (f) {
    if (f.scope !== 'server') out[f.key] = resolved[f.key];
  });
  return out;
}

/** Compact, deterministic version string of the client-deliverable flags.
 *  Rides the 60s ambient poll (`getCallNotesAmbient`) so the client can detect
 *  a manager toggle flip and refetch its config within the polling window
 *  (≤60s) instead of waiting for a page reload / view enter. */
function cnFlagsVersion_() {
  const f = getClientFeatureFlags_();
  return Object.keys(f).sort().map(function (k) { return k + (f[k] ? '1' : '0'); }).join(',');
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

/** Manager-curated external-email message templates. Reads Script Property
 *  CN_EMAIL_TEMPLATES (JSON array) first, falling back to the CONFIG default.
 *  Always returns a sanitized array of { name, recipientType, body } — a
 *  corrupt/non-array property degrades to the CONFIG fallback rather than
 *  throwing, so a bad blob can't break the rep-facing composer. */
function getEmailTemplates_() {
  const prop = PropertiesService.getScriptProperties().getProperty('CN_EMAIL_TEMPLATES');
  let raw = CONFIG.CALL_NOTES.EMAIL_TEMPLATES || [];
  if (prop) {
    try {
      const parsed = JSON.parse(prop);
      if (Array.isArray(parsed)) raw = parsed;
    } catch (_) {}
  }
  return raw.map(function (t) {
    const rt = String((t && t.recipientType) || 'any').trim().toLowerCase();
    return {
      name: String((t && t.name) || '').trim(),
      recipientType: CN_TEMPLATE_RECIPIENT_TYPES.indexOf(rt) >= 0 ? rt : 'any',
      body: String((t && t.body) || ''),
    };
  }).filter(function (t) { return t.name && t.body; });
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

/** Resolves the Clock-view shift schedule for a rep's timezone from
 *  CONFIG.SHIFT_SCHEDULE (per-tz override, else default). Returns
 *  { startMin, lengthMin } in minutes-from-midnight for the client ribbon +
 *  countdown. Falls back to 08:00 + 9h if config is missing/malformed. */
function getShiftSchedule_(timezone) {
  const cfg = CONFIG.SHIFT_SCHEDULE || {};
  const def = cfg.DEFAULT || { start: '08:00', end: '17:00' };
  const sched = (cfg.BY_TIMEZONE && cfg.BY_TIMEZONE[timezone]) || def;
  const toMin = function (hm) {
    const p = String(hm || '').split(':');
    return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
  };
  const startMin = toMin(sched.start);
  let endMin = toMin(sched.end);
  if (!(endMin > startMin)) endMin = startMin + 540; // guard → 9h
  // Breaks (item 1): the shift entry's own, else inherit DEFAULT's. Resolved to
  // minutes-from-midnight + length so the client can compute the next break.
  const rawBreaks = Array.isArray(sched.breaks) ? sched.breaks
                  : (Array.isArray(def.breaks) ? def.breaks : []);
  const breaks = rawBreaks.map(function (b) {
    return { label: String(b.label || 'Break'), startMin: toMin(b.start), lenMin: parseInt(b.len, 10) || 0 };
  }).filter(function (b) { return b.lenMin > 0; });
  return {
    startMin: startMin, lengthMin: endMin - startMin,
    breaks: breaks,
    breakReminderMin: parseInt(cfg.BREAK_REMINDER_MINUTES, 10) || 10,
  };
}
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
      `Audit log:\nhttps://docs.google.com/spreadsheets/d/${getAdpSS_().getId()}/edit\n`;
    const html = buildBrandedEmailHtml_('Timesheet adjustment alert',
      '<p style="margin:0 0 12px;">An older punch adjustment was submitted and may warrant review.</p>' +
      brandedKvRows_([
        ['Employee', emp.name + ' (' + emp.id + ')'],
        ['User email', emp.email],
        ['Punch type', punchType],
        ['Punch date', date + ' (' + tzAbbr_(empTz) + ')'],
        ['Punch time', time + ' ' + tzAbbr_(empTz) + (empTz !== mgrTz ? '  ·  ' + conv.displayTime + ' ' + tzAbbr_(mgrTz) : '')],
        ['Days back', String(daysBack) + ' (alert threshold > ' + CONFIG.OLD_ADJUST_ALERT_DAYS + ', window ' + CONFIG.ADJUST_WINDOW_DAYS + ')'],
        ['Reason', reason || '(none provided)'],
      ]) +
      '<p style="margin:14px 0 0;"><a href="https://docs.google.com/spreadsheets/d/' + getAdpSS_().getId() + '/edit" style="color:' + CN_EMAIL_PALETTE.brand + ';font-weight:600;">Open the audit log →</a></p>',
      { accent: CN_EMAIL_PALETTE.warn });
    MailApp.sendEmail({ to: recipients.join(','), subject: subj, body: body, htmlBody: html });
  } catch (e) { console.warn('Manager alert email failed: ' + e.message); }
}

function notifyManagerTrainingQuestion_(emp, question, dateLocal) {
  const recipients = getManagerEmails_();
  if (recipients.length === 0) return;
  try {
    const subj = `Training Q from ${emp.name}: ${String(question).substring(0, 60)}`;
    const body =
      `${emp.name} (${emp.id}) submitted a training-flagged call note with a question:\n\n` +
      `Q: ${question}\n\n` +
      `Date: ${dateLocal}\n\n` +
      `Reply in the web app → Call Notes → Team Notes → Per-Rep View.\n`;
    const html = buildBrandedEmailHtml_('Training question from ' + emp.name,
      '<p style="margin:0 0 12px;"><b>' + esc_(emp.name) + '</b> (' + esc_(emp.id) + ') submitted a training-flagged call note with a question:</p>' +
      '<div style="background:' + CN_EMAIL_PALETTE.brandSoft + ';border-radius:8px;padding:12px 14px;margin:0 0 12px;font-size:15px;color:' + CN_EMAIL_PALETTE.ink + ';">' + esc_(question) + '</div>' +
      brandedKvRows_([['Date', dateLocal]]) +
      '<p style="margin:14px 0 0;color:' + CN_EMAIL_PALETTE.muted + ';">Reply in the web app → Call Notes → Team Notes → Per-Rep View.</p>',
      {});
    MailApp.sendEmail({ to: recipients.join(','), subject: subj, body: body, htmlBody: html });
  } catch (e) { console.warn('Training question notification failed: ' + e.message); }
}

function notifyEmployeeOfDecision_(emp, date, type, notes, newStatus) {
  if (!emp || !emp.email) return;
  try {
    const verb = newStatus === 'Approved' ? 'approved' :
                 newStatus === 'Denied'   ? 'denied'   : 'updated';
    const subj = `Your time off request for ${date} was ${verb}`;
    const hasNotes = notes && notes !== 'undefined';
    let balanceDays = null;
    if (getFlag_('enablePtoTracking')) {
      // Re-fetch fresh balances (cache was invalidated by adjustLeaveBalance_)
      const fresh = lookupEmployeeById_(emp.id);
      if (fresh && fresh.ptoEnabled !== false) balanceDays = fresh.annualLeave;
    }
    // Plain-text fallback
    let body = `Hi ${emp.name},\n\n` +
               `Your time off request has been ${verb}:\n\n` +
               `Date:    ${date}\n` +
               `Type:    ${type}\n`;
    if (hasNotes) body += `Notes:   ${notes}\n`;
    body += `Status:  ${newStatus}\n\n`;
    if (balanceDays !== null) body += `Your current annual leave balance: ${balanceDays} day(s)\n\n`;
    body += `Please contact your manager with any questions.\n\n— UMS Time Clock (automated)\n`;
    // Branded HTML (item 2) — green/red/navy header by decision
    const accent = newStatus === 'Approved' ? CN_EMAIL_PALETTE.accent
                 : newStatus === 'Denied'   ? CN_EMAIL_PALETTE.danger
                 : CN_EMAIL_PALETTE.brand;
    const kv = [['Date', date], ['Type', type]];
    if (hasNotes) kv.push(['Notes', notes]);
    kv.push(['Status', newStatus]);
    const balLine = (balanceDays !== null)
      ? '<p style="margin:12px 0 0;">Current annual leave balance: <b>' + esc_(balanceDays) + '</b> day(s)</p>' : '';
    const html = buildBrandedEmailHtml_('Time off ' + verb,
      '<p style="margin:0 0 10px;">Hi ' + esc_(emp.name) + ',</p>' +
      '<p style="margin:0 0 12px;">Your time off request has been <b>' + esc_(verb) + '</b>:</p>' +
      brandedKvRows_(kv) + balLine +
      '<p style="margin:14px 0 0;color:' + CN_EMAIL_PALETTE.muted + ';">Please contact your manager with any questions.</p>',
      { accent: accent });
    MailApp.sendEmail({ to: emp.email, subject: subj, body: body, htmlBody: html });
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

// ════════════════════════════════════════════════════════════════════════════
//  METRICS MODULE — CDR Integration
//  ────────────────────────────────────────────────────────────────────────
//  Reads the CDR Report spreadsheet's DQE Historical Data sheet to surface
//  call-volume metrics for the CSR team inside team-tools. Option A (direct
//  spreadsheet read); designed for a future swap to Neon Postgres (Option C).
// ════════════════════════════════════════════════════════════════════════════

function getCdrSS_() {
  // Tests may point the CDR reader at a fixture spreadsheet via the in-memory
  // _TEST_OVERRIDE_CDR_SS_ID global (mirrors _TEST_OVERRIDE_EMAIL). Per-
  // invocation only, so real users are unaffected.
  if (typeof _TEST_OVERRIDE_CDR_SS_ID !== 'undefined' && _TEST_OVERRIDE_CDR_SS_ID) {
    return SpreadsheetApp.openById(_TEST_OVERRIDE_CDR_SS_ID);
  }
  const id = PropertiesService.getScriptProperties().getProperty('CDR_SS_ID')
          || CONFIG.CDR_SS_ID;
  return SpreadsheetApp.openById(id);
}

function cdrParseHms_(s) {
  if (s == null || s === '') return 0;
  var str = String(s).trim();
  if (!str) return 0;
  if (str.indexOf(':') === -1) return Number(str) || 0;
  var parts = str.split(':');
  var nums = [];
  for (var i = 0; i < parts.length; i++) nums.push(Number(parts[i]) || 0);
  if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  return 0;
}

function cdrFmtHms_(totalSec) {
  if (!totalSec || totalSec <= 0) return '0:00:00';
  var h = Math.floor(totalSec / 3600);
  var m = Math.floor((totalSec % 3600) / 60);
  var s = totalSec % 60;
  return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function cdrRowDateIso_(val, tz) {
  if (val instanceof Date) return Utilities.formatDate(val, tz, 'yyyy-MM-dd');
  var s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    var yr = m[3].length === 2 ? (parseInt(m[3], 10) < 70 ? '20' + m[3] : '19' + m[3]) : m[3];
    return yr + '-' + String(m[1]).padStart(2, '0') + '-' + String(m[2]).padStart(2, '0');
  }
  return '';
}

function isCdrQueueSentinel_(agent) {
  return /^A_Q_/.test(agent) || agent === 'Backup CSR';
}

var _cdrColumnsValidated = false;
var _cdrColumnWarning = null;
function validateCdrColumns_(sheet) {
  if (_cdrColumnsValidated) return _cdrColumnWarning;
  _cdrColumnsValidated = true;
  try {
    var headers = sheet.getRange(1, 1, 1, 34).getValues()[0];
    var mismatches = [];
    Object.keys(CDR_EXPECTED_HEADERS).forEach(function (colStr) {
      var col = Number(colStr);
      var expected = CDR_EXPECTED_HEADERS[col].toLowerCase();
      var actual = String(headers[col - 1] || '').toLowerCase().trim();
      if (actual.indexOf(expected) === -1) {
        mismatches.push('col ' + col + ': expected "' + CDR_EXPECTED_HEADERS[col] + '", got "' + headers[col - 1] + '"');
      }
    });
    if (mismatches.length > 0) {
      _cdrColumnWarning = mismatches.join('; ');
      Logger.log('CDR column validation WARNING: ' + _cdrColumnWarning);
    }
  } catch (e) {
    Logger.log('CDR column validation skipped: ' + e.message);
  }
  return _cdrColumnWarning;
}

var _cdrNameMapCache = null;
var _cdrNameMapExpiry = 0;
function getCdrNameMap_() {
  var now = Date.now();
  if (_cdrNameMapCache && now < _cdrNameMapExpiry) return _cdrNameMapCache;
  var map = {};
  try {
    var ss = getCdrSS_();
    var sheet = ss.getSheetByName('Agent Alias Overrides');
    if (!sheet) return map;
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var oldName = String(rows[i][0] || '').trim();
      var canonical = String(rows[i][1] || '').trim();
      var active = rows[i][2];
      if (!oldName || !canonical) continue;
      if (active === false || String(active).toLowerCase() === 'false') continue;
      map[oldName] = canonical;
    }
  } catch (e) {
    Logger.log('getCdrNameMap_ skipped: ' + e.message);
  }
  _cdrNameMapCache = map;
  _cdrNameMapExpiry = now + (CONFIG.CDR_CACHE_TTL * 1000);
  return map;
}

function cdrRosterHash_(rosterNames) {
  if (!rosterNames || rosterNames.length === 0) return 'all';
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5,
    rosterNames.slice().sort().join('|'));
  return digest.map(function (b) {
    return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0');
  }).join('');
}

/**
 * Core CDR data reader. Fetches per-agent DQE metrics for a date range,
 * filtered to CONFIG.CDR_DEPARTMENT's roster. Returns raw per-agent stats.
 * Isolated so a future Neon swap replaces only this function.
 */
function getCdrAgentMetrics_(from, to, rosterNames) {
  var rHash = cdrRosterHash_(rosterNames);
  var cacheKey = CONFIG.CDR_CACHE_KEY + ':' + rHash + ':' + from + ':' + to;
  var cache = CacheService.getScriptCache();
  var cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (_) {}
  }

  var ss = getCdrSS_();
  var sheet = ss.getSheetByName('DQE Historical Data');
  if (!sheet) return { agents: {}, meta: { error: 'DQE Historical Data sheet not found' } };

  var colWarning = validateCdrColumns_(sheet);

  var tz = ss.getSpreadsheetTimeZone();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { agents: {}, meta: { rowsScanned: 0, columnWarning: colWarning } };

  var range = sheet.getRange(2, 1, lastRow - 1, 34);
  var values = range.getValues();
  var displays = range.getDisplayValues();

  var aliasMap = getCdrNameMap_();
  var nameSet = {};
  if (rosterNames) {
    for (var n = 0; n < rosterNames.length; n++) nameSet[rosterNames[n]] = true;
  }
  var useRoster = rosterNames && rosterNames.length > 0;

  var agents = {};
  var rowsMatched = 0;

  for (var i = 0; i < values.length; i++) {
    var rawAgent = String(values[i][CDR.AGENT - 1] || '').trim();
    if (!rawAgent) continue;
    if (isCdrQueueSentinel_(rawAgent)) continue;
    var agent = (aliasMap[rawAgent] && useRoster && nameSet[aliasMap[rawAgent]])
      ? aliasMap[rawAgent] : rawAgent;
    if (useRoster && !nameSet[agent]) continue;

    var dateIso = cdrRowDateIso_(values[i][CDR.DATE - 1], tz);
    if (!dateIso || dateIso < from || dateIso > to) continue;

    rowsMatched++;
    if (!agents[agent]) {
      agents[agent] = {
        agent: agent, totalUnique: 0, totalRung: 0, totalMissed: 0,
        totalAnswered: 0, tttSeconds: 0, attSum: 0, attCount: 0,
        daysActive: 0, _dates: {},
      };
    }
    var a = agents[agent];
    a.totalUnique  += Number(values[i][CDR.TOTAL_UNIQUE - 1]) || 0;
    a.totalRung    += Number(values[i][CDR.TOTAL_RUNG - 1]) || 0;
    a.totalMissed  += Number(values[i][CDR.TOTAL_MISSED - 1]) || 0;
    a.totalAnswered += Number(values[i][CDR.TOTAL_ANSWERED - 1]) || 0;
    a.tttSeconds   += cdrParseHms_(displays[i][CDR.TTT - 1]);
    var att = cdrParseHms_(displays[i][CDR.ATT - 1]);
    if (att > 0) { a.attSum += att; a.attCount++; }
    if (!a._dates[dateIso]) { a._dates[dateIso] = true; a.daysActive++; }
  }

  Object.keys(agents).forEach(function (k) {
    var a = agents[k];
    a.attSeconds = a.attCount > 0 ? Math.round(a.attSum / a.attCount) : 0;
    a.pctAnswered = a.totalRung > 0
      ? Math.round((a.totalAnswered / a.totalRung) * 1000) / 10 : 0;
    a.tttFormatted = cdrFmtHms_(a.tttSeconds);
    a.attFormatted = cdrFmtHms_(a.attSeconds);
    delete a._dates; delete a.attSum; delete a.attCount;
  });

  var result = { agents: agents, meta: { rowsScanned: values.length, rowsMatched: rowsMatched, columnWarning: colWarning } };
  try {
    var payload = JSON.stringify(result);
    if (payload.length > 90000) {
      console.warn('CDR cache payload near 100KB limit: ' + payload.length + ' bytes for ' + cacheKey);
    }
    cache.put(cacheKey, payload, CONFIG.CDR_CACHE_TTL);
  } catch (e) {
    console.warn('CDR cache put failed: ' + (e.message || e));
  }
  return result;
}

/**
 * Returns per-day CDR data for a date range and optional agent filter.
 * Used by the 30-day trend sparkline and date-range team view.
 * Returns { daily: { 'YYYY-MM-DD': { rung, answered, missed, pctAnswered } }, agents: {...} }
 */
function getCdrDailyBreakdown_(from, to, rosterNames) {
  var ss = getCdrSS_();
  var sheet = ss.getSheetByName('DQE Historical Data');
  if (!sheet) return { daily: {}, agents: {} };

  validateCdrColumns_(sheet);

  var tz = ss.getSpreadsheetTimeZone();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { daily: {}, agents: {} };

  var range = sheet.getRange(2, 1, lastRow - 1, 34);
  var values = range.getValues();
  var displays = range.getDisplayValues();

  var aliasMap = getCdrNameMap_();
  var nameSet = {};
  if (rosterNames) {
    for (var n = 0; n < rosterNames.length; n++) nameSet[rosterNames[n]] = true;
  }
  var useRoster = rosterNames && rosterNames.length > 0;

  var daily = {};
  var agents = {};

  for (var i = 0; i < values.length; i++) {
    var rawAgent = String(values[i][CDR.AGENT - 1] || '').trim();
    if (!rawAgent) continue;
    if (isCdrQueueSentinel_(rawAgent)) continue;
    var agent = (aliasMap[rawAgent] && useRoster && nameSet[aliasMap[rawAgent]])
      ? aliasMap[rawAgent] : rawAgent;
    if (useRoster && !nameSet[agent]) continue;

    var dateIso = cdrRowDateIso_(values[i][CDR.DATE - 1], tz);
    if (!dateIso || dateIso < from || dateIso > to) continue;

    var rung    = Number(values[i][CDR.TOTAL_RUNG - 1]) || 0;
    var ans     = Number(values[i][CDR.TOTAL_ANSWERED - 1]) || 0;
    var missed  = Number(values[i][CDR.TOTAL_MISSED - 1]) || 0;
    var attSec  = cdrParseHms_(displays[i][CDR.ATT - 1]);

    if (!daily[dateIso]) daily[dateIso] = { rung: 0, answered: 0, missed: 0 };
    daily[dateIso].rung += rung;
    daily[dateIso].answered += ans;
    daily[dateIso].missed += missed;

    if (!agents[agent]) {
      agents[agent] = {
        agent: agent, totalRung: 0, totalAnswered: 0, totalMissed: 0,
        tttSeconds: 0, attSum: 0, attCount: 0, daysActive: 0, _dates: {},
      };
    }
    var a = agents[agent];
    a.totalRung += rung; a.totalAnswered += ans; a.totalMissed += missed;
    a.tttSeconds += cdrParseHms_(displays[i][CDR.TTT - 1]);
    if (attSec > 0) { a.attSum += attSec; a.attCount++; }
    if (!a._dates[dateIso]) { a._dates[dateIso] = true; a.daysActive++; }
  }

  Object.keys(daily).forEach(function (d) {
    daily[d].pctAnswered = daily[d].rung > 0
      ? Math.round((daily[d].answered / daily[d].rung) * 1000) / 10 : 0;
  });
  Object.keys(agents).forEach(function (k) {
    var a = agents[k];
    a.attSeconds = a.attCount > 0 ? Math.round(a.attSum / a.attCount) : 0;
    a.pctAnswered = a.totalRung > 0
      ? Math.round((a.totalAnswered / a.totalRung) * 1000) / 10 : 0;
    a.tttFormatted = cdrFmtHms_(a.tttSeconds);
    a.attFormatted = cdrFmtHms_(a.attSeconds);
    delete a._dates; delete a.attSum; delete a.attCount;
  });

  return { daily: daily, agents: agents };
}

// ── Metrics public endpoints ──────────────────────────────────────────

/** Single source of truth for the note-to-call coverage ratio shown in
 *  My Stats, Team Metrics, and the shift-stats overlay. Returns a
 *  whole-number percent, or null when there's no answered-call
 *  denominator. Extracted so the three callsites can't drift apart. */
function cnNoteCoverage_(noteCount, answeredCalls) {
  return (answeredCalls && answeredCalls > 0)
    ? Math.round((noteCount / answeredCalls) * 100) : null;
}

/** Counts a rep's call notes whose DateLocal falls in [from, to] inclusive.
 *  Centralizes the normalizeDate_ read so the Metrics note-count can never
 *  diverge again (see the CN.DATE_LOCAL gotcha — a raw String() read silently
 *  misses every row because Sheets coerces the column to a Date). Returns 0
 *  when the rep has no Sheet configured or it's unreachable. The `emp` arg
 *  only needs { id, name, callNotesSheetId } for getCallNotesSheet_. */
function countCallNotesInRange_(emp, from, to) {
  if (!emp || !emp.callNotesSheetId) return 0;
  try {
    const sheet = getCallNotesSheet_(emp);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return 0;
    // S2: counting only needs the DateLocal column — read 1 column instead
    // of the full 16-column row range (~16x fewer cells off the wire). Still
    // normalize each value (CN.DATE_LOCAL coercion gotcha).
    const dateCol = sheet.getRange(2, CN.DATE_LOCAL + 1, lastRow - 1, 1).getValues();
    let n = 0;
    for (let i = 0; i < dateCol.length; i++) {
      const d = normalizeDate_(dateCol[i][0]);
      if (d >= from && d <= to) n++;
    }
    return n;
  } catch (e) { return 0; }
}


/**
 * Self-view: the calling rep's own call metrics for a date, plus their
 * call-notes count for the same day (notes-vs-calls correlation).
 * Also returns a 30-day % Answered trend ending on the given date.
 */
function getMyMetrics(date) {
  try {
    var emp = getEmployeeInfo_();
    if (!emp) return { error: 'Account not registered.' };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return { error: 'Invalid date (expected yyyy-MM-dd).' };

    // Compute 30-day window ending on `date`
    var endD = new Date(date + 'T12:00:00Z');
    var startD = new Date(endD.getTime() - 29 * 86400000);
    var trendFrom = isoFromUtc_(startD);
    var trendTo = date;

    var breakdown = getCdrDailyBreakdown_(trendFrom, trendTo, [emp.name]);
    var cdr = breakdown.agents[emp.name] || null;
    var todayCdr = null;
    var todayResult = getCdrAgentMetrics_(date, date, [emp.name]);
    todayCdr = todayResult.agents[emp.name] || null;

    // Build 30-day trend array (one entry per day, null if no data)
    var trend = [];
    for (var d = new Date(startD); d <= endD; d.setUTCDate(d.getUTCDate() + 1)) {
      var iso = isoFromUtc_(d);
      var day = breakdown.daily[iso];
      var agentDay = null;
      // For per-agent trend, we need per-agent-per-day data — use the daily
      // breakdown filtered to this agent. Since getCdrDailyBreakdown_ already
      // filtered by rosterNames=[emp.name], daily totals ARE the agent's data.
      trend.push({
        date: iso,
        pctAnswered: day ? day.pctAnswered : null,
        rung: day ? day.rung : 0,
        answered: day ? day.answered : 0,
        missed: day ? day.missed : 0,
      });
    }

    var noteCount = countCallNotesInRange_(emp, date, date);

    return {
      date: date,
      repName: emp.name,
      cdr: todayCdr ? {
        totalRung:    todayCdr.totalRung,
        totalAnswered: todayCdr.totalAnswered,
        totalMissed:  todayCdr.totalMissed,
        pctAnswered:  todayCdr.pctAnswered,
        tttFormatted: todayCdr.tttFormatted,
        attFormatted: todayCdr.attFormatted,
        tttSeconds:   todayCdr.tttSeconds,
        attSeconds:   todayCdr.attSeconds,
      } : null,
      noteCount: noteCount,
      noteCoverage: cnNoteCoverage_(noteCount, todayCdr ? todayCdr.totalAnswered : 0),
      trend: trend,
    };
  } catch (err) { return { error: err.message }; }
}

/**
 * Manager view: per-rep CDR metrics + note counts for a date range.
 * Accepts either a single date or from/to. Also returns a 30-day team
 * % Answered trend when viewing a single date.
 */
function getTeamMetrics(dateOrFrom, to) {
  try {
    var t0 = Date.now();
    var callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };

    var dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    var from, toDate;
    if (to && dateRegex.test(to)) {
      from = dateOrFrom;
      toDate = to;
    } else {
      from = dateOrFrom;
      toDate = dateOrFrom;
    }
    if (!from || !dateRegex.test(from))
      return { error: 'Invalid date (expected yyyy-MM-dd).' };
    if (!toDate || !dateRegex.test(toDate))
      return { error: 'Invalid end date (expected yyyy-MM-dd).' };
    if (from > toDate) return { error: 'Start date must be on or before end date.' };

    var isSingleDay = (from === toDate);

    var roster = getEmployeeRosterRows_();
    var rosterNames = [];
    var repMap = {};
    for (var r = 1; r < roster.length; r++) {
      var name = String(roster[r][EMP.NAME]).trim();
      var cnSheetId = roster[r][EMP.CALL_NOTES_SHEET_ID];
      if (name) {
        rosterNames.push(name);
        repMap[name] = {
          repId: String(roster[r][EMP.ID]).trim(),
          repName: name,
          cnSheetId: cnSheetId ? String(cnSheetId).trim() : null,
        };
      }
    }

    // For single-day, also compute 30-day trend
    var trendData = null;
    if (isSingleDay) {
      var endD = new Date(from + 'T12:00:00Z');
      var startD = new Date(endD.getTime() - 29 * 86400000);
      var trendFrom = isoFromUtc_(startD);
      var trendBreakdown = getCdrDailyBreakdown_(trendFrom, from, rosterNames);
      trendData = [];
      for (var d = new Date(startD); d <= endD; d.setUTCDate(d.getUTCDate() + 1)) {
        var iso = isoFromUtc_(d);
        var day = trendBreakdown.daily[iso];
        trendData.push({
          date: iso,
          pctAnswered: day ? day.pctAnswered : null,
          rung: day ? day.rung : 0,
          answered: day ? day.answered : 0,
          missed: day ? day.missed : 0,
        });
      }
    }

    var cdrResult = getCdrAgentMetrics_(from, toDate, rosterNames);
    var reps = [];
    var teamTotals = { rung: 0, answered: 0, missed: 0, tttSeconds: 0, noteCount: 0 };
    var unmatchedAgents = [];

    Object.keys(repMap).forEach(function (name) {
      var rm = repMap[name];
      var cdr = cdrResult.agents[name] || null;
      var noteCount = countCallNotesInRange_(
        { id: rm.repId, name: rm.repName, callNotesSheetId: rm.cnSheetId }, from, toDate);

      var rep = {
        repId: rm.repId, repName: rm.repName,
        totalRung:    cdr ? cdr.totalRung    : 0,
        totalAnswered: cdr ? cdr.totalAnswered : 0,
        totalMissed:  cdr ? cdr.totalMissed  : 0,
        pctAnswered:  cdr ? cdr.pctAnswered  : 0,
        tttFormatted: cdr ? cdr.tttFormatted : '0:00:00',
        attFormatted: cdr ? cdr.attFormatted : '0:00:00',
        tttSeconds:   cdr ? cdr.tttSeconds   : 0,
        attSeconds:   cdr ? cdr.attSeconds   : 0,
        noteCount: noteCount,
        noteCoverage: cnNoteCoverage_(noteCount, cdr ? cdr.totalAnswered : 0),
        hasCdrData: !!cdr,
      };
      if (cdr || noteCount > 0) {
        reps.push(rep);
        teamTotals.rung += rep.totalRung;
        teamTotals.answered += rep.totalAnswered;
        teamTotals.missed += rep.totalMissed;
        teamTotals.tttSeconds += rep.tttSeconds;
        teamTotals.noteCount += noteCount;
      }
    });

    // Direction 1: CDR agents NOT on the team-tools roster
    Object.keys(cdrResult.agents).forEach(function (name) {
      if (!repMap[name]) unmatchedAgents.push(name);
    });
    // Direction 2: team-tools reps with zero CDR match
    var rosterWithNoCdr = [];
    Object.keys(repMap).forEach(function (name) {
      if (!cdrResult.agents[name]) rosterWithNoCdr.push(name);
    });

    teamTotals.pctAnswered = teamTotals.rung > 0
      ? Math.round((teamTotals.answered / teamTotals.rung) * 1000) / 10 : 0;
    teamTotals.tttFormatted = cdrFmtHms_(teamTotals.tttSeconds);
    teamTotals.noteCoverage = cnNoteCoverage_(teamTotals.noteCount, teamTotals.answered);

    reps.sort(function (a, b) { return a.repName.localeCompare(b.repName); });

    return {
      from: from,
      to: toDate,
      date: from,
      reps: reps,
      teamTotals: teamTotals,
      unmatchedAgents: unmatchedAgents,
      rosterWithNoCdr: rosterWithNoCdr,
      trend: trendData,
      meta: { rowsScanned: cdrResult.meta.rowsScanned, rowsMatched: cdrResult.meta.rowsMatched,
              columnWarning: cdrResult.meta.columnWarning, computeMs: Date.now() - t0 },
    };
  } catch (err) { return { error: err.message }; }
}

/**
 * Lightweight ambient check: yesterday's team answer rate for the sidebar
 * badge. Manager-only. Returns { badge: { type, label, date } | null }.
 */
function getMetricsAmbient() {
  try {
    var emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { badge: null };

    var cache = CacheService.getScriptCache();
    var ck = 'metrics_ambient_v1';
    var cached = cache.get(ck);
    if (cached) { try { return JSON.parse(cached); } catch (_) {} }

    // Compute "yesterday" in the manager's timezone (not the script's), so the
    // badge date + weekend check don't drift near midnight / DST when the
    // script tz differs from the manager tz. Derive the manager-tz calendar
    // date string, step back one day via UTC math, and read the weekday off
    // that tz-neutral date.
    var now = new Date();
    var mgrTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
    var todayMgr = Utilities.formatDate(now, mgrTz, 'yyyy-MM-dd');
    var yDate = new Date(todayMgr + 'T00:00:00Z');
    yDate.setUTCDate(yDate.getUTCDate() - 1);
    var yIso = isoFromUtc_(yDate);
    var dow = yDate.getUTCDay();
    if (dow === 0 || dow === 6) return { badge: null };

    var roster = getEmployeeRosterRows_();
    var names = [];
    for (var r = 1; r < roster.length; r++) {
      var n = String(roster[r][EMP.NAME]).trim();
      if (n) names.push(n);
    }

    var result = getCdrAgentMetrics_(yIso, yIso, names);
    var totalRung = 0, totalAns = 0;
    Object.keys(result.agents).forEach(function (k) {
      totalRung += result.agents[k].totalRung;
      totalAns += result.agents[k].totalAnswered;
    });
    var pct = totalRung > 0 ? Math.round((totalAns / totalRung) * 1000) / 10 : null;
    var threshold = CONFIG.CDR_ALERT_THRESHOLD || 85;
    var badge = (pct !== null && pct < threshold)
      ? { type: 'warn', label: pct + '%', date: yIso } : null;
    var out = { badge: badge, pctAnswered: pct, date: yIso };
    try { cache.put(ck, JSON.stringify(out), CONFIG.CDR_CACHE_TTL); } catch (_) {}
    return out;
  } catch (_) { return { badge: null }; }
}