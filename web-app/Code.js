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
  PUNCH_ADJUST_TAB: 'PunchAdjustRequests',  // #4a — employee adjustment requests pending manager approval
  AUDIT_TAB:    'AuditLog',
  FORM_TOKENS_TAB:      'FormTokens',
  FORM_SUBMISSIONS_TAB: 'FormSubmissions',

  // ── Interactive form tokens ──────────────────────────────────────
  FORM_TOKEN_EXPIRY_HOURS: 72, // tokens expire after 72 hours
  // Version stamp for the form_public.html Privacy Notice / consent text. The
  // server records this with every submission (it does NOT trust a client-sent
  // version) so a stored submission proves WHICH consent language the signer
  // saw. BUMP this whenever the consent copy in form_public.html changes.
  FORM_CONSENT_VERSION: 'forms-consent-2026-06',
  // PHI data-minimization: purge FormSubmissions + FormTokens rows older than
  // this many days (by SubmittedAt / CreatedAt). 0 = DISABLED (nothing is ever
  // deleted) — the safe default kept in committed code so a fresh deploy / fork
  // never auto-deletes PHI. THIS deployment runs a 90-day window via Script
  // Property FORM_DATA_RETENTION_DAYS=90 (overrides this fallback) — an operator
  // step, not a code default, because the purge is irreversible. Enforced by the
  // daily purgeExpiredFormData trigger (must be installed).
  FORM_DATA_RETENTION_DAYS: 0,

  // #7 (INV-153) — Timesheet cold-archive window: rows whose DATE is older than
  // this many days MOVE to a TimesheetArchive tab in the same ADP spreadsheet
  // (never deleted — payroll is keep-forever; this bounds the LIVE tab that
  // getManagerDashboard / exports / calendars read whole). 0 = DISABLED (the
  // safe committed default). Set Script Property TIMESHEET_ARCHIVE_DAYS to
  // enable (recommended 365+); values below TIMESHEET_ARCHIVE_MIN_DAYS clamp
  // UP so an operator typo can never rip current-period payroll rows out of
  // the live tab. Enforced by the daily archiveOldTimesheetRows trigger.
  TIMESHEET_ARCHIVE_DAYS: 0,

  TIMEZONE:         'Asia/Kolkata',
  MANAGER_TIMEZONE: 'America/Chicago',
  COVERAGE_MIN_STAFF: 6,   // #3 — Coverage planner: minimum ADEQUATE reps per
                           // manager-tz business hour (after the PTO overlay).
                           // At/above this but below COVERAGE_STAFF_GOOD =
                           // "acceptable" (amber); below this = "concerning" (red).
  COVERAGE_STAFF_GOOD: 7,  // at/above this many working reps = "good" (green).
  // Understaffed is only flagged within these manager-tz business hours
  // [start, end) on weekdays — outside this window / on weekends we're closed,
  // so off-hours and weekend cells are shown but never flagged.
  COVERAGE_BUSINESS_START_HOUR: 8,
  COVERAGE_BUSINESS_END_HOUR:   17,
  COVERAGE_WEEKDAYS_ONLY:       true,
  // Punctuality: a ClockIn within this many minutes of the scheduled shift
  // start counts as on-time (grace). Lunch-out within this of scheduled lunch
  // counts as on-time too.
  PUNCTUALITY_GRACE_MIN:        5,
  // Coaching (Training module): un-acknowledged coaching items older than this
  // many days are nudged to the issuing/team manager in the daily overdue
  // digest (the "now a meeting is warranted" reminder). 'praise' never nags.
  COACHING_UNACK_REMINDER_DAYS: 7,
  // Spanish-inbox efficiency tracking (Gmail). All bilingual-assistance requests
  // are sent to this group address; "resolved" = first reply from a configured
  // bilingual group MEMBER (SPANISH_INBOX_MEMBERS, comma-separated emails, via
  // Script Property). The deploying account must be a member of the group so its
  // mailbox receives the threads to scan. Script Properties override these.
  SPANISH_INBOX_ADDRESS:        'spanishcalls@universalmedsupply.com',
  SPANISH_INBOX_MEMBERS:        '',

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
  CDR_CACHE_KEY:     'cdr_metrics_v3',   // v3 — meta gained offRosterAgents (INV-85: bump on shape change)
  CDR_ALERT_THRESHOLD: 85,  // % Answered below this → warn badge on Metrics sidebar

  // ── Call Notes module ────────────────────────────────────────────────
  // The rolling-note panel; per-rep notes write to the rep's own Sheet
  // (EMP.CALL_NOTES_SHEET_ID, column L), email composer/preview gate is a
  // separate action from log-on-submit. See helper getCallNotesSheet_().
  CALL_NOTES: {
    NOTES_TAB:           'Notes',
    ARCHIVE_TAB:         'NotesArchive', // cold-archive tab in each per-rep Sheet (archiveOldCallNotes moves old rows here)
    SUBFORM_COL_JSON:    true,           // store SubformData as JSON blob in column P
    DELETE_WINDOW_SECONDS: 300,          // 5 min — self-undo on a just-created note
    NOTE_RETENTION_DAYS: 0,              // rolling auto-delete of old notes; 0 = disabled (irreversible PHI delete; CN_NOTE_RETENTION_DAYS Script Property overrides)
    NOTE_ARCHIVE_DAYS: 0,               // SAFE tier — move notes older than this to a NotesArchive tab (data preserved, live tab bounded); 0 = disabled (CN_NOTE_ARCHIVE_DAYS Script Property overrides)
    ARCHIVE_RETENTION_DAYS: 0,          // 3rd tier — irreversibly delete NotesArchive rows older than this (cold-store purge); 0 = disabled (CN_ARCHIVE_RETENTION_DAYS Script Property overrides; keep ≥ NOTE_ARCHIVE_DAYS)
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
    // Manager-curated quick links the rep can drop into an external email —
    // survey / feedback / Google-review-request URLs hosted OUTSIDE this app
    // (Apps Script web apps can't be served anonymously on this domain — see
    // the admin-block gotcha). Empty by default; populated via the Admin tab,
    // which writes Script Property CN_EXTERNAL_LINKS (read first by
    // getExternalLinks_, this serving as the fallback). Each entry:
    // { label, url } where url is an http(s) link.
    EXTERNAL_LINKS: [],
    EOD_WARNING_HOUR:    17,             // 5pm; trigger walks roster, sends per-rep tz match
    EOD_WARNING_WINDOW_MINUTES: 30,      // ± window around the rep's local 5pm
    DR_SLA_DEFAULT_HOURS: 48,            // DeptRequests v2 — default resolution SLA (per-dept overrides via DR_SLA_TARGETS)
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

  // ── Intake module (PPD + PMD/PAP account creation) ───────────────────
  // Ported from the bound "form-generator" Apps Script. Patient intake forms
  // that render a branded email + persist a PHI backup row. The Offerings
  // catalog (PMD product data the PPD recommendation engine reads) and the
  // per-form submission tabs all live in ONE spreadsheet — set Script Property
  // INTAKE_SS_ID to it (this CONFIG value is the inert fallback). Recipient
  // addresses are Script-Property-backed (INTAKE_SALES_EMAIL / INTAKE_SLEEP_EMAIL
  // / INTAKE_BCC_EMAIL / INTAKE_ALL_AGENTS_EMAIL) so the repo stays clean of
  // real addresses. See getIntakeSS_(), getIntakeOfferings_(), getIntake*Email_().
  INTAKE: {
    SS_ID:               'YOUR_INTAKE_SPREADSHEET_ID',
    OFFERINGS_TAB:       'Offerings',
    PPD_SUBMISSIONS_TAB: 'PPDSubmissions',
    PMD_SUBMISSIONS_TAB: 'PMDSubmissions',
    PAP_SUBMISSIONS_TAB: 'PAPSubmissions',
    SALES_EMAIL:         'sales@universalmedsupply.com',
    SLEEP_EMAIL:         'sleep@universalmedsupply.com',
    BCC_EMAIL:           'robin.choudhury@universalmedsupply.com',
    ALL_AGENTS_EMAIL:    'robin.choudhury@universalmedsupply.com',
    MAX_IMAGES:          12,           // PMD/PAP inline-attachment count cap
    MAX_IMAGE_CHARS:     7000000,      // ~5MB binary per image (base64) — bounded
  },

  // ── Reference / Knowledge Base module (Phase 1) ──────────────────────
  // Native per-department reference articles (markdown source) + embedded
  // Drive items (Doc/Sheet/file preview). PHI-free by policy (training/
  // reference content). Backed by a dedicated KB spreadsheet — set Script
  // Property KB_SS_ID (this CONFIG value is the inert fallback). The deploying
  // account needs edit access; reps read via the server, never open the sheet.
  KB: {
    SS_ID: 'YOUR_KB_SPREADSHEET_ID',
    TAB:   'KB',
    REVIEW_DUE_DAYS: 90,   // #4 — an article/embed is "review due" when its last
                           // review (or, for legacy rows, its last edit) is older
                           // than this. Editing an item counts as reviewing it.
  },
};

const ADP = { EMP_ID:0, EMP_NAME:1, DATE:2, TIME:3, DIR:4, LOCATION:5, REASON:6, STATUS:7, COMMENTS:8 };
// Phase 7: columns I (ANNUAL_LEAVE) and J (SICK_LEAVE)
// Phase 8 (Call Notes): column L (CALL_NOTES_SHEET_ID) — per-rep Sheet ID
const EMP = {
  EMAIL:0, ID:1, NAME:2, SHEET_ID:3, PAY_CYCLE:4, PAY_ANCHOR:5, IS_MANAGER:6,
  TIMEZONE:7, ANNUAL_LEAVE:8, SICK_LEAVE:9, PTO_ENABLED:10, CALL_NOTES_SHEET_ID:11,
  MANAGER_EMAIL:12,   // column M — the rep's manager (Employee Docs team scoping, T3)
  DEPARTMENTS:13,     // column N — dept names the rep staffs (DeptRequests v2 inbox routing)
  SCHEDULE:14,        // column O — optional per-rep shift override 'H:mm-H:mm' in the REP's tz (Turn D; blank = per-tz CONFIG.SHIFT_SCHEDULE)
};
const TO  = { EMP_ID:0, EMP_NAME:1, DATE:2, TYPE:3, NOTES:4, STATUS:5, SUBMITTED_AT:6 };
// Shared AuditLog columns (the ADP-spreadsheet AuditLog tab — writeAuditLog_ /
// getOrCreateAuditSheet_ header order). Batch 3 (cycle-8): the AuditLog was the
// ONE core sheet with NO named column enum, so its cells were read as bare
// numeric indices (`auditData[i][5]`) — untrippable by a source scan, which is
// exactly why the F1 coerced-PunchDate read slipped every tripwire (they were
// per-function). Every AuditLog READ of a coerced column (TS / PUNCH_DATE /
// PUNCH_TIME / IS_ADJUSTMENT) now routes through the typed `auditRowObj_` reader,
// pinned by a global source tripwire (INV-142 pattern) so the next raw read fails
// CI. TS(0) yyyy-MM-dd HH:mm:ss, PUNCH_DATE(5) yyyy-MM-dd, PUNCH_TIME(6) HH:mm:ss,
// IS_ADJUSTMENT(7) TRUE/FALSE — all Sheets-coerced on read (the M-3/M-4/F1 class).
const AUDIT = { TS:0, EMP_ID:1, EMP_NAME:2, ACTOR:3, ACTION:4, PUNCH_DATE:5, PUNCH_TIME:6, IS_ADJUSTMENT:7, DAYS_BACK:8, NOTES:9 };

// Inter-department request tracking (DeptRequests tab). PHI-free: no email body.
// NOTE_ID (col 11) is a back-compat trailing add (A5): legacy rows read '' for it
// and never dedupe; new auto-logged rows carry the source noteId so a re-send of
// the same note to the same dept reuses the open row's token instead of opening a
// second request. Same back-compat posture as CN_HEADERS / FS_HEADERS.
const DR = { REQ_ID:0, BY_ID:1, BY_NAME:2, BY_EMAIL:3, TO_DEPT:4, TO_EMAIL:5, CREATED_AT:6, STATUS:7, RESOLVED_AT:8, RESOLVED_BY:9, LABEL:10, NOTE_ID:11 };
const DR_HEADERS = ['RequestId','CreatedById','CreatedByName','CreatedByEmail','ToDept','ToEmail','CreatedAt','Status','ResolvedAt','ResolvedBy','Label','NoteId'];
// Bounded tail scan for the getDeptRequests LIST read only (rows append
// chronologically; the sheet grows one row per dept email with no retention).
// The resolve-by-token scans (resolveDeptRequest / markDeptRequestResolved_)
// stay FULL so an old token still resolves. INV-13 spirit, mirrors CN_AUDIT_MAX_SCAN.
const DR_MAX_SCAN = 4000;

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
  'CallNoteFeedback', 'CallNoteManagerComment', 'CallNoteTagAdmin',
  'CallNotesExport', 'ExternalEmailSent',
  'FormTokenCreated', 'FormSubmissionReceived',
];
// Bounded read: the audit search scans at most this many of the most-recent
// AuditLog rows (append-only/chronological), then filters in memory. Keeps the
// read within the Apps Script cell/time budget (INV-13 spirit) while serving a
// compliance need broader than the 20-row dashboard read.
const CN_AUDIT_MAX_SCAN = 4000;
const CN_AUDIT_MAX_RESULTS = 500;
const CN_AUDIT_DEFAULT_DAYS = 30;
const ADMIN_VIEW_MAX_ROWS = 300;  // Tier-2 admin sheet-viewer row cap (browse table)
const CN_EMAIL_TEMPLATE_LIMIT = 50;
const CN_EMAIL_TEMPLATE_BODY_MAX = 4000;
const CN_TEMPLATE_RECIPIENT_TYPES = ['customer', 'provider', 'any'];
const CN_EXTERNAL_LINK_LIMIT = 50;
// Quick-link categories (the official external-collection path — #2). Order is
// the composer-picker optgroup order; 'other' is the back-compat default.
const CN_EXTERNAL_LINK_CATEGORIES = ['survey', 'review', 'feedback', 'other'];

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

// CSR Transfer Historical Data — a SEPARATE tab in the CDR Report spreadsheet
// (T4 #6 transfers trend). Headers A1:S1: Month-Year, Week, Date, CSR Rep Name,
// Transfer %, Total Calls, Total Calls Transferred, then per-queue A_Q_* counts
// (H:R), Comments. Date is M/D/YYYY (handled by cdrRowDateIso_) and Transfer %
// is a "29.79%" string — both read via getDisplayValues() per the CDR
// spreadsheet-tz gotcha (INV-64). Only the first columns feed the trend; the
// per-queue breakdown is read-but-ignored for now.
const CSR_TRANSFER_TAB = 'CSR Transfer Historical Data';
const CSRT = { DATE: 2, NAME: 3, TRANSFER_PCT: 4, TOTAL_CALLS: 5, TRANSFERRED: 6 };
const CSR_TRANSFER_NUM_COLS = 19;   // A:S

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DAY_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const ROSTER_CACHE_KEY = 'employee_roster_v8';   // bumped: Schedule column O (per-rep shift override, Turn D)
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
  // ── Inter-department request resolve route ─────────────────────────
  // The "✓ Mark this resolved" link in a tracked dept-request email lands
  // here. The recipient is internal (@umsupply.com) so normal auth applies;
  // serveResolvePage_ identifies them via getActiveUserEmail_().
  if (e && e.parameter && e.parameter.resolve) {
    return serveResolvePage_(e.parameter.resolve);
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
  try { tpl.webAppUrl = getWebAppExecUrl_(); } catch (_) { tpl.webAppUrl = ''; }
  return tpl
    .evaluate()
    .setTitle('UMS Team Tools')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ── Dev / prod instance environment (blue-green deploy support) ──────────────
// A separate DEV Apps Script project (its own scriptId + its own Script
// Properties → COPY sheets + your-inbox email config) runs this SAME source as
// prod. Two OPTIONAL Script Properties tag an instance so the two can't be
// confused and so destructive test-data writes can't land on prod. Both UNSET
// (the prod default) = zero behavior change. See docs/deployment.md.
//   INSTANCE_LABEL   — a short banner label shown in the shell (e.g. "DEV").
//   INSTANCE_IS_PROD — set to 'true' on the PROD project only, to REFUSE the
//                      destructive TEST_-row writers (runAllTests /
//                      setupTestEnvironment) so they can run on dev only.
function instanceLabel_() {
  try { return String(PropertiesService.getScriptProperties().getProperty('INSTANCE_LABEL') || '').trim(); }
  catch (e) { return ''; }
}
function isProdInstance_() {
  try { return String(PropertiesService.getScriptProperties().getProperty('INSTANCE_IS_PROD') || '').trim().toLowerCase() === 'true'; }
  catch (e) { return false; }
}
/** Throws on the PROD instance (INSTANCE_IS_PROD='true') — guards the destructive
 *  TEST_-row writers so they can only run against a dev project's copy sheets.
 *  No-op until an operator sets the property on prod (back-compat: prod today
 *  runs runAllTests fine, and continues to until the property is set). */
function assertNotProdInstance_(label) {
  if (isProdInstance_()) {
    throw new Error((label || 'This operation') + ' is blocked on the PRODUCTION instance ' +
      '(INSTANCE_IS_PROD is set). Run it on the DEV Apps Script project — see docs/deployment.md.');
  }
}
/** Throws UNLESS this is a clearly-labeled DEV instance (INSTANCE_LABEL set AND
 *  INSTANCE_IS_PROD not 'true'). The bulletproof guard for dev-only tooling that
 *  MUTATES sheets (the roster scrubber). Prod has no INSTANCE_LABEL → refuses, so
 *  a misfire can never touch the team's live roster. */
function assertDevInstance_(label) {
  if (!instanceLabel_() || isProdInstance_()) {
    throw new Error((label || 'This dev tool') + ' refuses to run: this is not a labeled DEV instance ' +
      '(set Script Property INSTANCE_LABEL on the dev project — never on prod). See docs/deployment.md.');
  }
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
      // Admin tier (Manage module's Admin tab) — a subset of managers. Gates the
      // adminOnly tab client-side AND the config/system endpoints server-side
      // (they check emp.isAdmin; admin == manager until ADMIN_EMAILS is set).
      isAdmin: emp.isAdmin,
      // Spanish Inbox access — managers OR a SPANISH_INBOX_MEMBERS rep (INV-31
      // amendment); gates the dashboard Spanish card + the metricsSpanish tab.
      canSeeSpanish: canSeeSpanishInbox_(emp),
      // DeptRequests v2 — the rep's department memberships (canonical names);
      // gates the Dept Requests "Incoming" inbox section client-side.
      departments: empDepartments_(emp),
      timezone: empTz,
      timezoneAbbr: tzAbbr_(empTz),
      schedule: empShiftSchedule_(emp, empTz),   // Turn D: column-O override wins
      ptoEnabled: !!(getFlag_('enablePtoTracking') && emp.ptoEnabled),
      annualLeave: emp.annualLeave,
      sickLeave: emp.sickLeave,
      annualLeaveMax: CONFIG.ANNUAL_LEAVE_MAX || 15,
      sickLeaveMax:   CONFIG.SICK_LEAVE_MAX   || 10,
      // Future-dated PENDING annual days (not yet deducted) — the Clock PTO pips
      // mark these amber: still in the green balance but tentatively committed.
      annualPlannedUpcoming: getUpcomingAnnualPlanned_(emp.id, today),
      flags: getClientFeatureFlags_(),
      // Blue-green: a short label ('DEV') shown as a banner so an isolated dev
      // instance can't be mistaken for the team's live one. '' on prod → no banner.
      instanceLabel: instanceLabel_(),
    };
  } catch (err) { return { error: err.message }; }
}

/** Sum of future-dated PENDING annual-bucket leave days for an employee.
 *  Approved future PTO is already deducted from the balance on approval, so
 *  only pending requests are "planned but not yet reflected" (the amber pips). */
function getUpcomingAnnualPlanned_(empId, todayIso) {
  try {
    const rows = getOrCreateTimeOffSheet_().getDataRange().getValues();
    let days = 0;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][TO.EMP_ID]).trim() !== empId) continue;
      const d = normalizeDate_(rows[i][TO.DATE]);
      if (!d || d <= todayIso) continue;   // future-dated only
      const st = String(rows[i][TO.STATUS] || '').toLowerCase().trim();
      if (st !== 'pending') continue;
      const ded = getLeaveDeduction_(String(rows[i][TO.TYPE]));
      if (ded && ded.bucket === 'annual') days += ded.days;
    }
    return days;
  } catch (e) { return 0; }
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
      // Employee immediate-fix is gated by the employeeImmediateAdjust flag
      // (#4a/#4b toggle). When off, non-managers must route adjustments through
      // the approval queue (submitPunchAdjustRequests). Managers self-adjusting
      // via this path are always allowed (they're trusted; they also have Day
      // Edit). Server-enforced so hiding the "Apply now" button can't be bypassed.
      if (!emp.isManager && !getFlag_('employeeImmediateAdjust')) {
        return { success: false, error:
          'Immediate punch adjustments are turned off — submit an adjustment request for manager approval instead.' };
      }
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
          && normalizeAuditTs_(rows[i][TO.SUBMITTED_AT]) === submittedAt) {
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
      // F(cycle-8): per-row PTO gate for the pending-card balance projection —
      // coercion-safe parse (Sheets turns 'FALSE' into a native boolean; the
      // standard idiom from adjustLeaveBalance_ / getEmployeeInfo_, INV-27).
      const ptoVal = empRows[i][EMP.PTO_ENABLED];
      const ptoRaw = (ptoVal === null || ptoVal === undefined || ptoVal === '')
        ? '' : String(ptoVal).trim().toLowerCase();
      e.ptoEnabled = !(ptoRaw === 'false' || ptoRaw === 'no' || ptoRaw === 'n' || ptoRaw === '0');
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
    // Rows arrive in APPEND order; a same-day back-fill (approved adjustment,
    // Day Edit) lands last and would mis-derive "last punch" → wrong live
    // status. Sort each rep's punches chronologically ("HH:mm:ss" strings).
    Object.keys(todayPunchesByEmp).forEach(id => {
      todayPunchesByEmp[id].sort((a, b) => a.time.localeCompare(b.time));
    });

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
      // F(cycle-8): ALSO gate on the per-row ptoEnabled (INV-27's conjunction) —
      // a contractor's pending card used to show a "12 → 11 d" projection (and
      // the Approve confirm could warn "balance goes negative") even though
      // adjustLeaveBalance_ correctly no-ops for them on approval.
      if (getFlag_('enablePtoTracking') && reqEmp && reqEmp.ptoEnabled && dedu.bucket) {
        currentBal = dedu.bucket === 'sick' ? reqEmp.sickLeave : reqEmp.annualLeave;
        projBal = +(currentBal - dedu.days).toFixed(2);
      }
      pending.push({
        empId: reqEmpId,
        empName: String(toRows[i][TO.EMP_NAME]).trim(),
        date: normalizeDate_(toRows[i][TO.DATE]),
        type: reqType,
        notes: String(toRows[i][TO.NOTES]),
        // SubmittedAt cells are Sheets-coerced Dates (written
        // "yyyy-MM-dd HH:mm:ss") — normalizeAuditTs_ recovers the as-written
        // digits. This value doubles as the row-match key for
        // updateTimeOffStatus / cancelTimeOffRequest, whose matchers
        // normalize identically (M1).
        submittedAt: normalizeAuditTs_(toRows[i][TO.SUBMITTED_AT]),
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
        // Batch 3: the typed reader recovers ALL coerced cols once (TS, PunchDate,
        // PunchTime, IsAdjustment — the M-3/M-4/F1 class). This block used to read
        // each raw by index; now it maps the canonical object to the display shape.
        const a = auditRowObj_(auditData[i]);
        recentAudits.push({
          timestamp:    a.ts,
          timestampMgr: convertAuditTs_(a.ts, CONFIG.TIMEZONE, mgrTz),
          empName:      a.empName,
          action:       a.action,
          punchDate:    a.punchDate,
          punchTime:    a.punchTime,
          isAdjustment: a.isAdjustment,
          daysBack:     a.daysBack,
          notes:        a.notes,
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
      // SUBMITTED_AT cells are Sheets-coerced Dates; the raw String() read
      // produced "Thu Jun 11 2026 ...", which failed the parseDate below and
      // fell into a substring that never matched the window — the pending
      // sparkline rendered all zeros since it shipped (M1). normalizeAuditTs_
      // recovers the as-written digits.
      const submitted = normalizeAuditTs_(toRows[i][TO.SUBMITTED_AT]);
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
          && normalizeAuditTs_(rows[i][TO.SUBMITTED_AT]) === submittedAt) {
        const oldStatus = String(rows[i][TO.STATUS]).trim();
        const type    = String(rows[i][TO.TYPE]);
        const notes   = String(rows[i][TO.NOTES]);
        const empName = String(rows[i][TO.EMP_NAME]);

        // S1.3 — 'Reconciled' rows are neutralized duplicates (fixPtoReconciliation
        // already credited their over-charge back). Re-approving one would
        // RE-DEDUCT via the transition below (oldStatus !== 'Approved' &&
        // newStatus === 'Approved'), undoing the credit. Treat Reconciled as
        // terminal — refuse any status change on it.
        if (oldStatus === 'Reconciled') {
          return { success: false, error: 'This request was reconciled (a duplicate already credited back) and can no longer change status.' };
        }

        sheet.getRange(i + 1, TO.STATUS + 1).setValue(newStatus);

        // Apply leave-balance change if state transition crosses the Approved boundary.
        // F(cycle-8): if the balance write THROWS, revert the just-written Status
        // cell before rethrowing — otherwise the row is already 'Approved', so a
        // manager RETRY sees oldStatus==='Approved', the Pending→Approved
        // transition never re-fires, and the deduction is silently skipped
        // forever. (Reordering balance-first was rejected: a status-write
        // failure after a successful deduction would make the retry
        // DOUBLE-deduct — the INV-03/94 class. The compensating revert keeps
        // retry self-healing in both directions; all inside the ScriptLock.)
        let newBalance = null;
        if (getFlag_('enablePtoTracking')) {
          const dedu = getLeaveDeduction_(type);
          if (dedu.bucket) {
            try {
              if (oldStatus !== 'Approved' && newStatus === 'Approved') {
                newBalance = adjustLeaveBalance_(empId, dedu.bucket, -dedu.days);
              } else if (oldStatus === 'Approved' && newStatus !== 'Approved') {
                newBalance = adjustLeaveBalance_(empId, dedu.bucket, dedu.days);
              }
            } catch (balErr) {
              try { sheet.getRange(i + 1, TO.STATUS + 1).setValue(oldStatus); } catch (revertErr) {
                Logger.log('updateTimeOffStatus: status revert after balance failure ALSO failed (' +
                  revertErr.message + ') — row ' + (i + 1) + ' may need a manual status fix.');
              }
              throw balErr;
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
      byEmp[id][date].push({ bucket: dedu.bucket, days: dedu.days, type: String(toRows[i][TO.TYPE]) });
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
        // F(L-4): a legitimate Morning+Afternoon pair expects the SUM (a full
        // day), not the single largest deduction — it is not drift.
        if (ptoLegitHalfDayPair_(list)) {
          list.forEach(function (x) {
            if (x.bucket === 'annual') expAnnual += x.days;
            else if (x.bucket === 'sick') expSick += x.days;
          });
          return;
        }
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

/** F(L-4): a Morning+Afternoon half-day pair on one date is a legitimate
 *  0.5 + 0.5 full day (creatable before the INV-94 dup-guard landed), NOT the
 *  H1 double-deduct signature. Flagging it made the one-click "Credit &
 *  reconcile" wrongly credit 0.5d and neutralize a legitimate row (making a
 *  later revert impossible). Exactly-two rows, one morning + one afternoon. */
function ptoLegitHalfDayPair_(list) {
  if (!list || list.length !== 2) return false;
  const t0 = String(list[0].type || '').toLowerCase();
  const t1 = String(list[1].type || '').toLowerCase();
  return ((t0.indexOf('morning') >= 0 && t1.indexOf('afternoon') >= 0) ||
          (t0.indexOf('afternoon') >= 0 && t1.indexOf('morning') >= 0));
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
      byDate[date].push({ rowIndex: i + 1, days: dedu.days, bucket: dedu.bucket, type: String(rows[i][TO.TYPE]) });
    }

    let creditAnnual = 0, creditSick = 0;
    const toReconcile = [];   // 1-based row indices of the over-charge rows
    Object.keys(byDate).forEach(function (d) {
      const list = byDate[d];
      if (list.length < 2) return;
      if (ptoLegitHalfDayPair_(list)) return;   // F(L-4): legitimate pair — never neutralize
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
    // Note (M-1 interaction): adjustLeaveBalance_ now no-ops for a PtoEnabled=FALSE
    // contractor, so the rows are still neutralized (status→Reconciled) but the
    // credit returns null. That's the right call going forward (contractors no
    // longer accrue drift). Any pre-M-1 contractor over-charge that needs an
    // actual balance credit must be corrected by a manual sheet edit — surface
    // it via the balance line in the dashboard rather than re-enabling PTO.
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

    // F(cycle-8): honor the documented midnight wrap. The client deliberately
    // renders the undo button across a rep-local midnight ("punch at 23:58,
    // undo at 00:02" — the timeDiffSecondsClient design decision), but the
    // server rejected that exact case twice over (date !== today, then the
    // negative same-day diff) — the 5-minute window silently didn't exist
    // across midnight. Compute the REAL elapsed time from the punch's
    // rep-local datetime; the date restriction relaxes to today-or-yesterday,
    // which the 5-minute elapsed window then bounds correctly either way.
    const empTz = empTz_(emp);
    const nowMs = Date.now();
    const todayStr = fmtDateTz_(new Date(), empTz);
    const yestStr = fmtDateTz_(new Date(nowMs - 86400000), empTz);
    if (date !== todayStr && date !== yestStr) {
      return { success: false, error: 'You can only undo today\'s punches. For older corrections, use Adjust.' };
    }
    let punchMs = null;
    try {
      const hms = /^\d{2}:\d{2}$/.test(String(time)) ? time + ':00' : String(time);   // matcher below uses HH:mm:ss
      punchMs = Utilities.parseDate(date + ' ' + hms, safeTimezone_(empTz), 'yyyy-MM-dd HH:mm:ss').getTime();
    } catch (e) { punchMs = null; }
    const secondsSince = punchMs === null ? -1 : Math.round((nowMs - punchMs) / 1000);
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
      // No-op compare on HH:mm, NOT the full HH:mm:ss (cycle-9 M-1): live
      // punches store REAL seconds (recordPunch → fmtTimeTz_ 'HH:mm:ss') while
      // the Day Edit client prefills <input type=time> with HH:mm and submits
      // every slot. A full-string compare made every untouched live punch
      // read as "changed" — truncating its seconds to :00, overwriting
      // COMMENTS to ADJ-{type}, and writing a spurious PunchEdit audit row on
      // EVERY Day Edit save (S7 violation). The UI can only express HH:mm, so
      // an equal HH:mm IS unchanged.
      if (cur.time.substring(0, 5) === newTime) return;  // no-op
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
    // L-9 — updateCallNote is TEXT-ONLY by design: it writes the 7 content
    // columns only. `sanitizeCallNotePayload_` also derives flags/tags into a
    // subformData blob, but that is intentionally NOT written here — flag/tag
    // changes go through `setCallNoteFlag` (card toggles) and the submit path's
    // multi-flag toolbar, never the inline text editor. If a future caller
    // passes flags/tags to updateCallNote expecting them to persist, surface a
    // dedicated endpoint instead of silently widening this write.
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
      // F(cycle-8): same 2000-char cap as the submit path (sanitizeCallNotePayload_,
      // M-15) — an uncapped write can push the SubformData cell toward the ~50k
      // Sheets limit, after which EVERY later metadata write to the note throws.
      subformData.trainingQuestion = String(trainingQuestion).trim().slice(0, 2000);
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
    // F(M-14): coercion-safe read — a locale-coerced Date cell stringified
    // raw made parseTimestampMs_ return null, silently DISABLING the 5-min
    // delete window (fail-open) on a coercing per-rep sheet.
    const noteMs = parseTimestampMs_(cnTimestampString_(located.row[CN.TIMESTAMP]), empTz);
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

/** Manager delete from a rep's history (operator feedback 2026-06-12) —
 *  the path deleteCallNote's own error message always pointed at ("ask
 *  your manager"). Manager-gated (INV-02), locked (INV-01); NO time window
 *  (that's the point — the rep window is 5 min, INV-60). Audit row carries
 *  the manager as actor + a deletedBy marker; PHI-free (noteId only). */
function managerDeleteCallNote(repEmpId, noteId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const emp = lookupEmployeeById_(String(repEmpId || '').trim());
    if (!emp || !emp.callNotesSheetId) return { success: false, error: 'Rep not found or not enrolled.' };
    const sheet = getCallNotesSheet_(emp);
    const located = findCallNoteRow_(sheet, noteId);
    if (!located) return { success: false, error: 'Note not found.' };
    const dateLocal = normalizeDate_(located.row[CN.DATE_LOCAL]);
    sheet.deleteRow(located.rowIndex);
    writeAuditLog_(emp, 'CallNoteDelete', dateLocal, '', false, 0,
      'noteId=' + noteId + '; deletedBy=manager', callerEmp.email);
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

    // If pinning, count existing pins and reject if at limit. Scan happens
    // inside the lock so two parallel pin requests can't both squeak past the
    // limit. Bounded read (L-7): scan only the NoteId + SubformData columns
    // with a cheap `"pinned"` substring pre-filter before JSON.parse — matches
    // getMyPinnedCallNotes' discipline instead of pulling the rep's full
    // history at full width.
    if (willPin) {
      const lastRow = sheet.getLastRow();
      let pinnedCount = 0;
      if (lastRow >= 2) {
        const rowN = lastRow - 1;
        const idCol  = sheet.getRange(2, CN.NOTE_ID + 1, rowN, 1).getValues();
        const subCol = sheet.getRange(2, CN.SUBFORM_DATA + 1, rowN, 1).getValues();
        for (let i = 0; i < rowN; i++) {
          if (String(idCol[i][0]).trim() === noteId) continue;
          const sfd = subCol[i][0];
          if (!sfd || String(sfd).indexOf('"pinned"') < 0) continue;
          try {
            const parsed = JSON.parse(sfd);
            if (parsed && parsed.pinned) pinnedCount++;
          } catch (e) { /* corrupt blob — skip */ }
        }
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
 *  Read-only, no lock. Used by the Log view's pinned tray.
 *  Bounded read (A6): scans only the SubformData column to find pinned rows
 *  (~16× fewer cells than a full-history read), with a cheap substring
 *  pre-filter before JSON.parse, then fetches just the few pinned rows
 *  (≤ CN_PIN_LIMIT under the cap) at full width. */
function getMyPinnedCallNotes() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    if (!emp.callNotesSheetId) return { notes: [] };
    const sheet = getCallNotesSheet_(emp);
    const lastRow = sheet.getLastRow();
    const notes = [];
    if (lastRow >= 2) {
      const n = lastRow - 1;
      const subCol = sheet.getRange(2, CN.SUBFORM_DATA + 1, n, 1).getValues();
      for (let i = 0; i < n; i++) {
        const raw = subCol[i][0];
        if (!raw) continue;
        // Pre-filter: an unpinned note's blob never contains the key (the pin
        // toggle DELETES `pinned`/`pinnedAt` rather than writing false). The
        // JSON.parse below stays authoritative for any substring false-positive.
        if (String(raw).indexOf('"pinned"') < 0) continue;
        let sub = null;
        try { sub = JSON.parse(raw); } catch (e) { continue; }
        if (!sub || !sub.pinned) continue;
        const rowIndex = i + 2;
        const row = sheet.getRange(rowIndex, 1, 1, CN_HEADERS.length).getValues()[0];
        notes.push(callNoteRowToObject_({ row: row, rowIndex: rowIndex }));
      }
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
 *  newest first. Read-only, caller-scoped.
 *  Bounded read (A6): scans the Timestamp / FlagType / SubformData columns to
 *  pick the 5 newest answered training notes, then fetches only those 5 rows
 *  at full width — instead of reading + JSON-parsing the entire history. */
function getMyTrainingQA() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    if (!emp.callNotesSheetId) return { notes: [] };
    const sheet = getCallNotesSheet_(emp);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { notes: [] };
    const n = lastRow - 1;
    const tsCol   = sheet.getRange(2, CN.TIMESTAMP + 1, n, 1).getValues();
    const flagCol = sheet.getRange(2, CN.FLAG_TYPE + 1, n, 1).getValues();
    const subCol  = sheet.getRange(2, CN.SUBFORM_DATA + 1, n, 1).getValues();
    const candidates = [];   // { rowIndex, ts }
    for (let i = 0; i < n; i++) {
      if (String(flagCol[i][0] || '').trim().toLowerCase() !== 'training') continue;
      const raw = subCol[i][0];
      if (!raw || String(raw).indexOf('"trainingReply"') < 0) continue;
      let sub = null;
      try { sub = JSON.parse(raw); } catch (e) { continue; }
      if (!sub || !sub.trainingReply) continue;
      candidates.push({ rowIndex: i + 2, ts: cnTimestampString_(tsCol[i][0]) });   // F(M-14): sort key
    }
    candidates.sort(function (a, b) { return b.ts.localeCompare(a.ts); });
    if (candidates.length > 5) candidates.length = 5;
    const notes = candidates.map(function (c) {
      const row = sheet.getRange(c.rowIndex, 1, 1, CN_HEADERS.length).getValues()[0];
      return callNoteRowToObject_({ row: row, rowIndex: c.rowIndex });
    });
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
    // Bounded read (L-8): single-day contiguous slice via the shared reader
    // (INV-46 append-order assumption) instead of the rep's full history at
    // full width. The per-row date re-check stays as a defensive guard.
    const located = readCallNoteRowsInRange_(sheet, date, date);
    const notes = [];
    for (let i = 0; i < located.length; i++) {
      const rowDate = normalizeDate_(located[i].row[CN.DATE_LOCAL]);
      if (rowDate !== date) continue;
      const note = callNoteRowToObject_(located[i]);
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

/** Clock-view note-volume histogram (#5a / C2). Returns the calling rep's own
 *  note counts for `date` bucketed by REP-LOCAL hour (0–23). Caller-scoped,
 *  read-only, bounded (single-day contiguous slice via readCallNoteRowsInRange_,
 *  reading only the Timestamp + DateLocal columns). The Timestamp is stored in
 *  the rep's own tz (empTz_, "yyyy-MM-dd'T'HH:mm:ss"), so its hour aligns with
 *  the Clock ribbon's local axis. A Date-coerced cell is re-formatted in empTz.
 *  Not enrolled / no sheet → all-zero buckets (never throws to the client). */
function getMyNoteHourBuckets(date) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    const empTz = empTz_(emp);
    const d = date || Utilities.formatDate(new Date(), empTz, 'yyyy-MM-dd');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { error: 'Invalid date format (expected yyyy-MM-dd).' };
    const buckets = new Array(24).fill(0);
    if (!emp.callNotesSheetId) return { buckets: buckets, date: d };
    const sheet = getCallNotesSheet_(emp);
    const located = readCallNoteRowsInRange_(sheet, d, d);
    for (let i = 0; i < located.length; i++) {
      const row = located[i].row;
      if (normalizeDate_(row[CN.DATE_LOCAL]) !== d) continue;
      // F(cycle-8): route the coerced-Date recovery through cnTimestampString_
      // (INV-142) — the old inline branch formatted in the REP's tz, but a
      // coercing-locale sheet coerces in the SHEET's tz (pinned to the ADP
      // tz, INV-110/141), so every CST rep's histogram landed ~11.5h off.
      // The recovered string's hour digits ARE the as-written rep-local hour.
      const m = cnTimestampString_(row[CN.TIMESTAMP]).match(/[T ](\d{2}):/);
      const hour = m ? parseInt(m[1], 10) : -1;
      if (hour >= 0 && hour < 24) buckets[hour]++;
    }
    return { buckets: buckets, date: d };
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
    // Bounded read (L-8): contiguous date-range slice via the shared reader
    // (INV-46) instead of the full history. Per-row date re-checks stay
    // defensive.
    const located = readCallNoteRowsInRange_(sheet, startDate, endDate);
    const notes = [];
    for (let i = 0; i < located.length; i++) {
      const rowDate = normalizeDate_(located[i].row[CN.DATE_LOCAL]);
      if (rowDate < startDate || rowDate > endDate) continue;
      const note = callNoteRowToObject_(located[i]);
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
    // Bounded read (A6): this runs on the 60s sidebar poll, so read only the
    // 5 columns the counts need (Timestamp+DateLocal, FlagType+Resolved,
    // SubformData — ~3× fewer cells than the full 16-column history) and
    // JSON-parse SubformData only for training-flagged rows with a reply key.
    // Counts still span the entire Sheet (INV-39 — historical totals).
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      const n = lastRow - 1;
      const tsDate  = sheet.getRange(2, CN.TIMESTAMP + 1, n, 2).getValues();  // Timestamp, DateLocal
      const flagRes = sheet.getRange(2, CN.FLAG_TYPE + 1, n, 2).getValues();  // FlagType, Resolved
      const subCol  = sheet.getRange(2, CN.SUBFORM_DATA + 1, n, 1).getValues();
      for (let i = 0; i < n; i++) {
        const dateLocal = normalizeDate_(tsDate[i][1]);
        if (dateLocal === today) todayTotal++;
        if (dateLocal && dateLocal >= weekStart && dateLocal <= today) weekTotal++;
        flagCounts.all++;
        const flagType = String(flagRes[i][0] || '').trim().toLowerCase();
        if (flagType === 'action')   flagCounts.action++;
        if (flagType === 'training') flagCounts.training++;
        if (flagType === 'review')   flagCounts.review++;
        if (flagType === 'action') {
          const resRaw = flagRes[i][1];
          const resStr = (resRaw === null || resRaw === undefined) ? ''
            : String(resRaw).trim().toLowerCase();
          const resolved = (resStr === 'true' || resStr === 'yes' || resStr === '1');
          if (!resolved) {
            unresolvedActionCount++;
            flagCounts.unresolved++;
            // F(M-14): coercion-safe — a locale-coerced Date cell zeroed the
            // stale counter (raw String → parseTimestampMs_ → null).
            const noteMs = parseTimestampMs_(cnTimestampString_(tsDate[i][0]), empTz);
            if (noteMs && (nowMs - noteMs) >= staleMs) staleActionCount++;
          }
        }
        if (flagType === 'training' && subCol[i][0]
            && String(subCol[i][0]).indexOf('"trainingReply"') >= 0) {
          try {
            const sub = JSON.parse(subCol[i][0]);
            if (sub && sub.trainingReply) flagCounts.qa++;
          } catch (e) { /* corrupt blob — skip, same as callNoteRowToObject_ */ }
        }
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
      externalLinks: getExternalLinks_(),
      flags: getClientFeatureFlags_(),
    };
  } catch (err) { return { error: err.message }; }
}

/** Substring search across the rep's notes. field ∈ all | caller | issue |
 *  phone | trx (INV-45). `caller`/`all` fold in callback+patientAndTrx and
 *  `issue`/`all` fold in resolution; `phone` matches the callback column only
 *  and `trx` the patientAndTrx column only (the distinct scope tabs). If
 *  exact=true, matches patientAndTrx exactly (case-insensitive, trimmed) and
 *  ignores the field parameter — used by the "Find prior calls for this TRX"
 *  button on note cards to surface repeat-caller history without substring noise. */
function searchMyCallNotes(query, field, dateRange, exact, includeArchive) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    const q = String(query || '').trim();
    if (!q) return { results: [] };
    const empTz = empTz_(emp);
    const f = String(field || 'all').toLowerCase();
    const sheet = getCallNotesSheet_(emp);
    // Bounded read (L-8): a supplied full date range slices to the contiguous
    // block via the shared reader (INV-46); open-ended search still scans the
    // whole history but column-bounded to CN_HEADERS.length (no stray columns).
    const rangeStart = (dateRange && dateRange.start) || null;
    const rangeEnd   = (dateRange && dateRange.end)   || null;

    const qLower = q.toLowerCase();
    const isExact = exact === true;
    const results = [];
    const matchInto = function (located, isArchived) {
      for (let i = 0; i < located.length; i++) {
        const note = callNoteRowToObject_(located[i]);
        if (dateRange && dateRange.start && note.dateLocal < dateRange.start) continue;
        if (dateRange && dateRange.end   && note.dateLocal > dateRange.end)   continue;
        let hit = false;
        if (isExact) {
          if (String(note.patientAndTrx || '').toLowerCase().trim() === qLower) hit = true;
        } else if (f === 'phone') {
          if (String(note.callback || '').toLowerCase().indexOf(qLower) >= 0) hit = true;
        } else if (f === 'trx') {
          if (String(note.patientAndTrx || '').toLowerCase().indexOf(qLower) >= 0) hit = true;
        } else {
          if (f === 'caller' || f === 'all') {
            if ((note.caller + ' ' + note.callback + ' ' + note.patientAndTrx)
                  .toLowerCase().indexOf(qLower) >= 0) hit = true;
          }
          if (!hit && (f === 'issue' || f === 'all')) {
            if ((note.issue + ' ' + note.resolution).toLowerCase().indexOf(qLower) >= 0) hit = true;
          }
        }
        if (hit) { if (isArchived) note._archived = true; results.push(note); }
      }
    };

    matchInto(readCallNoteRowsInRange_(sheet, rangeStart, rangeEnd), false);
    // Include-archive: ALSO scan the cold NotesArchive tab when it exists.
    // Read-only — never creates the tab (getSheetByName, not getOrCreate).
    if (includeArchive === true) {
      const archive = sheet.getParent().getSheetByName(CONFIG.CALL_NOTES.ARCHIVE_TAB);
      if (archive) matchInto(readCallNoteRowsInRange_(archive, rangeStart, rangeEnd), true);
    }

    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (results.length > 200) results.length = 200;
    return { results, timezone: empTz, exact: isExact };
  } catch (err) { return { error: err.message }; }
}

/** Pure (Node-pinned) — stitches a single patient/order's events from the
 *  rep's own call notes + intake submissions + sent fillable forms into one
 *  newest-first timeline. `trx` is matched as a case-insensitive substring of
 *  each source's patient/TRX field; sent forms are linked by their source
 *  noteId being one of the matched notes (a fillable form is sent in a note's
 *  context). Sort key normalizes the heterogeneous source timestamps
 *  ("yyyy-MM-ddTHH:mm:ss" notes/forms vs "yyyy-MM-dd HH:mm:ss" intake) to a
 *  comparable "yyyy-MM-dd HH:mm:ss" prefix — good enough for display ordering
 *  of one rep's own data (the cross-tz caveat doesn't reorder same-source
 *  events). No braces inside string literals (extractRawFunction caveat). */
function buildPatientTimeline_(notes, submissions, forms, trx) {
  var t = String(trx || '').trim().toLowerCase();
  var keyOf = function (ts) { return String(ts || '').replace('T', ' ').slice(0, 19); };
  var events = [];
  var matchedNoteIds = {};
  (notes || []).forEach(function (n) {
    if (t && String(n.patientAndTrx || '').toLowerCase().indexOf(t) < 0) return;
    if (n.noteId) matchedNoteIds[String(n.noteId)] = true;
    events.push({
      kind: 'note', at: keyOf(n.timestamp), ts: String(n.timestamp || ''),
      noteId: String(n.noteId || ''), caller: String(n.caller || ''),
      patientAndTrx: String(n.patientAndTrx || ''), issue: String(n.issue || ''),
      resolution: String(n.resolution || ''), flagType: String(n.flagType || ''),
      emailedAt: String(n.emailedAt || ''),
    });
  });
  (submissions || []).forEach(function (s) {
    if (t && String(s.patientInfo || '').toLowerCase().indexOf(t) < 0) return;
    events.push({
      kind: 'intake', at: keyOf(s.timestamp), ts: String(s.timestamp || ''),
      formType: String(s.formType || ''), submissionId: String(s.submissionId || ''),
      patientInfo: String(s.patientInfo || ''), recipient: String(s.recipient || ''),
    });
  });
  (forms || []).forEach(function (f) {
    if (!f.noteId || !matchedNoteIds[String(f.noteId)]) return;
    events.push({
      kind: 'form', at: keyOf(f.createdAt), ts: String(f.createdAt || ''),
      token: String(f.token || ''), formName: String(f.formName || ''),
      status: String(f.status || ''), recipientName: String(f.recipientName || ''),
      noteId: String(f.noteId || ''),
    });
  });
  events.sort(function (a, b) { return a.at < b.at ? 1 : (a.at > b.at ? -1 : 0); });
  return events;
}

/** Patient/TRX timeline (#3) — caller-scoped, read-only. Stitches the rep's
 *  OWN call notes (TRX substring), intake submissions (patientInfo substring),
 *  and sent fillable forms (linked by source noteId) for one patient/order
 *  into a single newest-first timeline. Reuses the existing caller-scoped
 *  endpoints (each re-checks getEmployeeInfo_), so no new read surface and no
 *  cross-rep leak: submissions are filtered to the caller's own id even when a
 *  manager (who otherwise sees all) calls it. PHI is the caller's own. */
function getPatientTimeline(trx) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const t = String(trx || '').trim();
    if (!t) return { error: 'Enter a patient name or TRX number.' };

    let notes = [];
    try {
      const nr = searchMyCallNotes(t, 'trx', null, false);
      notes = (nr && nr.results) || [];
    } catch (e) {}

    let submissions = [];
    try {
      const sr = intakeListMySubmissions();
      submissions = ((sr && sr.submissions) || []).filter(function (s) {
        return String(s.repId || '') === emp.id;   // caller-scoped even for managers
      });
    } catch (e) {}

    let forms = [];
    try {
      const fr = getMySentForms();
      forms = (fr && fr.forms) || [];
    } catch (e) {}

    const events = buildPatientTimeline_(notes, submissions, forms, t);
    return { trx: t, events: events, timezone: empTz_(emp), count: events.length };
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

/** Manager-gated enrollment roster for the Admin tab's auto-provision panel.
 *  Returns every roster member with an email, split into enrolled (has a
 *  CallNotesSheetId) and unenrolled. Read-only. */
function getCallNotesEnrollment() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    const rows = getEmployeeRosterRows_();
    const enrolled = [], unenrolled = [];
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][EMP.EMAIL]) continue;
      const rec = {
        id: String(rows[i][EMP.ID]).trim(),
        name: String(rows[i][EMP.NAME]).trim(),
      };
      if (rows[i][EMP.CALL_NOTES_SHEET_ID] && String(rows[i][EMP.CALL_NOTES_SHEET_ID]).trim()) {
        enrolled.push(rec);
      } else {
        unenrolled.push(rec);
      }
    }
    enrolled.sort((a, b) => a.name.localeCompare(b.name));
    unenrolled.sort((a, b) => a.name.localeCompare(b.name));
    return { enrolled, unenrolled };
  } catch (err) { return { error: err.message }; }
}

/** Auto-provision a per-rep call-notes Sheet — the one-click replacement for the
 *  manual "copy the template Sheet, share it, paste the ID into column L"
 *  workflow. Manager-gated (INV-02) + locked (INV-01, mutates the Employees
 *  sheet). Creates a fresh Spreadsheet owned by the deployer (the script runs as
 *  USER_DEPLOYING, so the new Sheet lands in the deployer's Drive — exactly the
 *  ownership the per-rep model wants), provisions the `Notes` tab with the
 *  canonical CN_HEADERS, writes the new ID into EMP.CALL_NOTES_SHEET_ID (column
 *  L) of the rep's Employees row, invalidates the roster cache (INV-10), and
 *  writes a CallNotesProvision audit row. Idempotent: a rep who already has a
 *  sheetId is returned unchanged — it NEVER clobbers an existing Sheet (that
 *  would orphan the rep's note history). */
function provisionCallNotesSheet(repEmpId) {
  const callerEmp = getEmployeeInfo_();
  if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
  if (!repEmpId || !String(repEmpId).trim()) return { error: 'No employee specified.' };
  repEmpId = String(repEmpId).trim();
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getAdpSS_().getSheetByName(CONFIG.EMPLOYEE_TAB);
    const rows = sheet.getDataRange().getValues();
    let targetRow = -1, repName = '', existing = '';
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][EMP.ID]).trim() !== repEmpId) continue;
      targetRow = i;
      repName = String(rows[i][EMP.NAME]).trim();
      existing = rows[i][EMP.CALL_NOTES_SHEET_ID] ? String(rows[i][EMP.CALL_NOTES_SHEET_ID]).trim() : '';
      break;
    }
    if (targetRow < 0) return { error: 'Employee not found: ' + repEmpId };
    if (existing) {
      // Already enrolled — never clobber an existing Sheet (would orphan history).
      let url = '';
      try { url = SpreadsheetApp.openById(existing).getUrl(); } catch (e) {}
      return { success: true, alreadyEnrolled: true, sheetId: existing, url: url, repName: repName };
    }
    // Create the new per-rep Spreadsheet (owned by the deployer / script-as-Me).
    const title = 'Call Notes — ' + (repName || repEmpId) + ' (' + repEmpId + ')';
    // createPinnedSpreadsheet_ pins the new Sheet's TIMEZONE + LOCALE to the
    // ADP sheet's. DateLocal strings are coerced to Dates in THIS sheet's tz
    // but recovered by normalizeDate_ in the ADP sheet's tz — the round-trip
    // only holds when the two match (and a coercing locale would turn the
    // ISO-T Timestamp column into Dates on read — the M-14 class).
    const ss = createPinnedSpreadsheet_(title);
    // Provision the Notes tab with the canonical header (rename the default sheet
    // rather than insert a second one, so there's no stray "Sheet1").
    const notes = ss.getSheets()[0];
    notes.setName(CONFIG.CALL_NOTES.NOTES_TAB);
    notes.appendRow(CN_HEADERS);
    notes.setFrozenRows(1);
    notes.getRange(1, 1, 1, CN_HEADERS.length).setFontWeight('bold');
    const sheetId = ss.getId();
    // Write the ID into column L of the rep's Employees row + invalidate cache.
    sheet.getRange(targetRow + 1, EMP.CALL_NOTES_SHEET_ID + 1).setValue(sheetId);
    invalidateRosterCache_();
    writeAuditLog_(callerEmp, 'CallNotesProvision', repEmpId, '', false, 0,
      'sheetId=' + sheetId, callerEmp.email);
    return { success: true, sheetId: sheetId, url: ss.getUrl(), repName: repName };
  } catch (err) {
    return { error: err.message };
  } finally {
    lock.releaseLock();
  }
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
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
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
 *  manager sees their change reflected immediately rather than after the TTL.
 *  Also drops the tag-TRENDS cache (#5) since a rename/merge/archive
 *  re-attributes counts there too. */
function invalidateCnTaxonomyCache_() {
  try {
    const c = CacheService.getScriptCache();
    c.remove(CN_TAXONOMY_CACHE_KEY);
    c.remove(CN_TAG_TRENDS_CACHE_KEY);
  } catch (e) { /* best-effort */ }
}

// ── Tag-trend analytics (#5 — manager Admin "Tag Trends" panel) ─────────────
// Turns the same per-rep tag scan the taxonomy uses into a weekly time series
// so a manager can see which issue types are spiking. Manager-gated, read-only,
// cached, PHI-free (tags + dates only). The week-bucketing math is factored
// into the pure cnTrendWeekStarts_ / cnTagTrendsFromEvents_ (Node-pinned).
const CN_TAG_TRENDS_CACHE_KEY = 'cn_tag_trends_v1';
const CN_TAG_TRENDS_CACHE_TTL = 300;   // 5 min — same cadence as the taxonomy
const CN_TAG_TRENDS_WEEKS = 12;        // trailing window
const CN_TAG_TRENDS_TOPK = 12;         // top tags by total (bounds payload + chart)

/** yyyy-MM-dd → integer days since the Unix epoch (UTC, tz-safe — never a
 *  local-time Date), or null on a malformed date. The inverse is
 *  cnDayNumToIso_. Pure. */
function cnIsoToDayNum_(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000) : null;
}
function cnDayNumToIso_(n) {
  const d = new Date(n * 86400000);
  return d.getUTCFullYear() + '-' +
    ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' +
    ('0' + d.getUTCDate()).slice(-2);
}

/** Returns `weeks` Monday-anchored week-start day-numbers (oldest→newest), the
 *  last being the Monday of refIso's week. Pure. */
function cnTrendWeekStarts_(refIso, weeks) {
  const ref = cnIsoToDayNum_(refIso);
  if (ref == null) return [];
  const wd = (((ref + 4) % 7) + 7) % 7;       // 0=Sun … 6=Sat (epoch day 0 = Thu)
  const monday = ref - ((wd + 6) % 7);        // Monday of ref's week
  const out = [];
  for (let i = (weeks | 0) - 1; i >= 0; i--) out.push(monday - i * 7);
  return out;
}

/** Buckets {tag,date} events into `weeks` Monday weeks ending at refIso's week.
 *  Returns { weekStarts:[iso…], series:[{tag, counts:[…], total, delta}] }
 *  sorted by total desc, truncated to topK. Events outside the window are
 *  dropped. Pure (no Sheets / Date-local). */
function cnTagTrendsFromEvents_(events, refIso, weeks, topK) {
  weeks = Math.max(1, weeks | 0);
  const starts = cnTrendWeekStarts_(refIso, weeks);
  if (!starts.length) return { weekStarts: [], series: [] };
  const first = starts[0];
  const counts = {};   // tag → int[weeks]
  (events || []).forEach(function (ev) {
    const d = cnIsoToDayNum_(ev && ev.date);
    if (d == null) return;
    const idx = Math.floor((d - first) / 7);
    if (idx < 0 || idx >= weeks) return;
    const tag = String((ev && ev.tag) || '').trim().toLowerCase();
    if (!tag) return;
    if (!counts[tag]) { counts[tag] = []; for (let k = 0; k < weeks; k++) counts[tag].push(0); }
    counts[tag][idx]++;
  });
  let series = Object.keys(counts).map(function (tag) {
    const c = counts[tag];
    let total = 0;
    for (let i = 0; i < c.length; i++) total += c[i];
    const delta = c[weeks - 1] - (weeks >= 2 ? c[weeks - 2] : 0);
    return { tag: tag, counts: c, total: total, delta: delta };
  });
  series.sort(function (a, b) { return b.total - a.total || a.tag.localeCompare(b.tag); });
  if (topK > 0) series = series.slice(0, topK);
  return { weekStarts: starts.map(cnDayNumToIso_), series: series };
}

/** Manager Admin "Tag Trends" — weekly per-tag counts over the trailing
 *  CN_TAG_TRENDS_WEEKS. Manager-gated (INV-02/31), read-only, cached, PHI-free.
 *  Reuses the taxonomy's 2-column scan (SubformData tags + DateLocal) but
 *  buckets by week instead of total+lastSeen; archived tags are excluded; the
 *  scan is window-pre-filtered so the events array stays bounded. */
function getCallNotesTagTrends() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    const cache = CacheService.getScriptCache();
    const cached = cache.get(CN_TAG_TRENDS_CACHE_KEY);
    if (cached) { try { return JSON.parse(cached); } catch (e) { /* recompute */ } }

    const weeks = CN_TAG_TRENDS_WEEKS;
    const refIso = fmtDate_(new Date());   // CONFIG.TIMEZONE "today" — manager-facing aggregate
    const starts = cnTrendWeekStarts_(refIso, weeks);
    const windowStartIso = starts.length ? cnDayNumToIso_(starts[0]) : refIso;
    const archivedSet = getArchivedTagsSet_();
    const roster = getEmployeeRosterRows_();
    const events = [];
    let repsScanned = 0;
    for (let i = 1; i < roster.length; i++) {
      const sheetId = roster[i][EMP.CALL_NOTES_SHEET_ID];
      if (!sheetId) continue;
      try {
        const repEmp = { id: String(roster[i][EMP.ID]).trim(), callNotesSheetId: String(sheetId).trim() };
        const sheet = getCallNotesSheet_(repEmp);
        repsScanned++;
        const lastRow = sheet.getLastRow();
        if (lastRow >= 2) {
          const rowN = lastRow - 1;
          const subCol  = sheet.getRange(2, CN.SUBFORM_DATA + 1, rowN, 1).getValues();
          const dateCol = sheet.getRange(2, CN.DATE_LOCAL + 1, rowN, 1).getValues();
          for (let j = 0; j < rowN; j++) {
            const subRaw = subCol[j][0];
            if (!subRaw) continue;
            let sub = null;
            try { sub = JSON.parse(subRaw); } catch (e) { continue; }
            if (!sub || !Array.isArray(sub.tags) || !sub.tags.length) continue;
            const dateLocal = normalizeDate_(dateCol[j][0]);
            // Window pre-filter (yyyy-MM-dd lexicographic = chronological) keeps
            // the events array bounded to the trailing window.
            if (!dateLocal || dateLocal < windowStartIso) continue;
            sub.tags.forEach(function (t) {
              const tag = String(t || '').trim().toLowerCase();
              if (!tag || archivedSet[tag]) return;   // archived tags excluded from trends
              events.push({ tag: tag, date: dateLocal });
            });
          }
        }
      } catch (e) { /* skip unreachable rep sheet */ }
    }
    const out = cnTagTrendsFromEvents_(events, refIso, weeks, CN_TAG_TRENDS_TOPK);
    out.weeks = weeks;
    out.repsScanned = repsScanned;
    try {
      const payload = JSON.stringify(out);
      if (payload.length <= 90000) cache.put(CN_TAG_TRENDS_CACHE_KEY, payload, CN_TAG_TRENDS_CACHE_TTL);
    } catch (e) { /* return uncached */ }
    return out;
  } catch (err) { return { error: err.message }; }
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
    if (!callerEmp || !callerEmp.isAdmin) return { success: false, error: 'Admin access required.' };
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
    if (!callerEmp || !callerEmp.isAdmin) return { success: false, error: 'Admin access required.' };
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
    if (!callerEmp || !callerEmp.isAdmin) return { success: false, error: 'Admin access required.' };
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
    // F(cycle-8): the last unbounded per-rep read — every sibling single-day
    // reader already routes through the bounded date-slice (L-8/S2, INV-46
    // contiguity). The per-row date re-check below stays as the defensive
    // guard, same as the rep-facing readers.
    const located = readCallNoteRowsInRange_(sheet, dateStr, dateStr);
    const notes = [];
    for (let i = 0; i < located.length; i++) {
      const rowDate = normalizeDate_(located[i].row[CN.DATE_LOCAL]);
      if (rowDate !== dateStr) continue;
      const note = callNoteRowToObject_(located[i]);
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

function managerSearchCallNotes(query, field, repFilter, dateRange, includeArchive) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const q = String(query || '').trim();
    if (!q) return { results: [] };
    const qLower = q.toLowerCase();
    const f = String(field || 'all').toLowerCase();

    const roster = getEmployeeRosterRows_();
    const results = [];
    const dr = (dateRange && dateRange.start && dateRange.end) ? dateRange : {};
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
        const matchInto = function (located, isArchived) {
          for (let i = 0; i < located.length; i++) {
            const note = callNoteRowToObject_(located[i]);
            if (dateRange && dateRange.start && note.dateLocal < dateRange.start) continue;
            if (dateRange && dateRange.end   && note.dateLocal > dateRange.end)   continue;
            let hit = false;
            if (f === 'phone') {
              if (String(note.callback || '').toLowerCase().indexOf(qLower) >= 0) hit = true;
            } else if (f === 'trx') {
              if (String(note.patientAndTrx || '').toLowerCase().indexOf(qLower) >= 0) hit = true;
            } else {
              if (f === 'caller' || f === 'all') {
                if ((note.caller + ' ' + note.callback + ' ' + note.patientAndTrx)
                      .toLowerCase().indexOf(qLower) >= 0) hit = true;
              }
              if (!hit && (f === 'issue' || f === 'all')) {
                if ((note.issue + ' ' + note.resolution).toLowerCase().indexOf(qLower) >= 0) hit = true;
              }
            }
            if (hit) {
              note.repId = repId; note.repName = repName;
              if (isArchived) note._archived = true;
              results.push(note);
            }
          }
        };
        matchInto(readCallNoteRowsInRange_(sheet, dr.start, dr.end), false);
        // Include-archive: read-only scan of the cold NotesArchive tab when present.
        if (includeArchive === true) {
          const archive = sheet.getParent().getSheetByName(CONFIG.CALL_NOTES.ARCHIVE_TAB);
          if (archive) matchInto(readCallNoteRowsInRange_(archive, dr.start, dr.end), true);
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
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    return {
      departmentEmails: getDepartmentEmails_(),
      stateTaxRates: getStateTaxRates_(),
      updateSuggestions: getUpdateSuggestions_(),
      defaultSuggestions: CONFIG.CALL_NOTES.UPDATE_SUGGESTIONS_DEFAULT,
      emailTemplates: getEmailTemplates_(),
      externalLinks: getExternalLinks_(),
      deptSla: { defaultHours: CONFIG.CALL_NOTES.DR_SLA_DEFAULT_HOURS || 48,
                 targets: getDeptRequestSlaConfig_(),
                 departments: Object.keys(getDepartmentEmails_() || {}) },
      featureFlags: { registry: FEATURE_FLAGS, values: getFeatureFlagsResolved_() },
      kbAi: (function () {
        const c = getKbAiConfig_();
        // Never the key itself — only whether one is set.
        return { dailyCap: c.dailyCap, model: c.model, models: Object.keys(KB_AI_MODEL_PRICES),
                 hasKey: !!c.apiKey, spend: kbAiReadSpend_() };
      })(),
    };
  } catch (err) { return { error: err.message }; }
}

/** Pure (Node-pinned) — safety-ordering warnings for the three call-note
 *  retention windows. archiveDays moves Notes→NotesArchive; retentionDays
 *  irreversibly deletes from live; archiveRetentionDays irreversibly deletes
 *  from the cold store. The triggers run 2am (archive-purge) < 3am (archive) <
 *  4am (live purge). No braces inside string literals (extractRawFunction). */
function retentionWarnings_(archiveDays, retentionDays, archiveRetentionDays) {
  var w = [];
  var a = archiveDays || 0, r = retentionDays || 0, ar = archiveRetentionDays || 0;
  if (r > 0 && a === 0) {
    w.push('Live purge is ON but archival is OFF — old notes are irreversibly deleted with NO cold copy. Enable archival (recommended) for a safer setup.');
  }
  if (r > 0 && a > 0 && a > r) {
    w.push('Archive window (' + a + 'd) is LARGER than the live-purge window (' + r + 'd) — the 4am purge can irreversibly delete live rows before the 3am archive reaches them. Set archive ≤ purge, or disable purge.');
  }
  if (ar > 0 && a > 0 && ar < a) {
    w.push('Cold-store purge (' + ar + 'd) is shorter than the archive window (' + a + 'd) — notes get archived, then almost immediately purged from the cold store.');
  }
  return w;
}

/** Retention config (Admin Config panel) — manager-gated, read-only summary of
 *  the three call-note retention windows + their resolved values, source, and
 *  safety-ordering warnings. PHI-free. */
function getRetentionConfig() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    const props = PropertiesService.getScriptProperties();
    const srcOf = function (propName, cfgVal) {
      const p = props.getProperty(propName);
      if (p != null && p !== '') return 'Script Property';
      return (cfgVal && cfgVal > 0) ? 'CONFIG' : 'default';
    };
    const a = getNoteArchiveDays_(), r = getNoteRetentionDays_(), ar = getArchiveRetentionDays_();
    return {
      archiveDays:          { value: a,  source: srcOf('CN_NOTE_ARCHIVE_DAYS', CONFIG.CALL_NOTES.NOTE_ARCHIVE_DAYS) },
      retentionDays:        { value: r,  source: srcOf('CN_NOTE_RETENTION_DAYS', CONFIG.CALL_NOTES.NOTE_RETENTION_DAYS) },
      archiveRetentionDays: { value: ar, source: srcOf('CN_ARCHIVE_RETENTION_DAYS', CONFIG.CALL_NOTES.ARCHIVE_RETENTION_DAYS) },
      warnings: retentionWarnings_(a, r, ar),
      archiveTab: CONFIG.CALL_NOTES.ARCHIVE_TAB,
    };
  } catch (err) { return { error: err.message }; }
}

/** Manager-gated write of the three retention windows to Script Properties
 *  (CN_NOTE_ARCHIVE_DAYS / CN_NOTE_RETENTION_DAYS / CN_ARCHIVE_RETENTION_DAYS).
 *  Each must be a whole number of days ≥ 0 (0 = disabled). Writes an
 *  AdminConfigChange audit row (INV-57 family). Takes effect immediately — the
 *  trigger handlers read the windows fresh per run. The two PURGE windows are
 *  irreversible PHI deletes; the client gates raising them behind a danger
 *  confirm. Returns the post-save safety warnings so the UI can surface them. */
function saveRetentionConfig(settings) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { success: false, error: 'Admin access required.' };
    settings = settings || {};
    const parse = function (v) {
      if (v === '' || v == null) return 0;
      if (String(v).indexOf('.') >= 0) return null;   // whole days only
      const n = parseInt(v, 10);
      return (isNaN(n) || n < 0) ? null : n;
    };
    const a = parse(settings.archiveDays), r = parse(settings.retentionDays), ar = parse(settings.archiveRetentionDays);
    if (a === null || r === null || ar === null) {
      return { success: false, error: 'Each window must be a whole number of days ≥ 0 (0 = disabled).' };
    }
    const props = PropertiesService.getScriptProperties();
    props.setProperty('CN_NOTE_ARCHIVE_DAYS', String(a));
    props.setProperty('CN_NOTE_RETENTION_DAYS', String(r));
    props.setProperty('CN_ARCHIVE_RETENTION_DAYS', String(ar));
    writeAuditLog_(callerEmp, 'AdminConfigChange', '', '', false, 0,
      'Updated call-note retention windows (archive=' + a + 'd, purge=' + r + 'd, archivePurge=' + ar + 'd)', callerEmp.email);
    return { success: true, warnings: retentionWarnings_(a, r, ar) };
  } catch (err) { return { success: false, error: err.message }; }
}

/** Manager-gated read of the feature-toggle registry + resolved values
 *  (also embedded in getAdminConfig; kept standalone for testability). */
function getFeatureFlags() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
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
    if (!callerEmp || !callerEmp.isAdmin) return { success: false, error: 'Admin access required.' };
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
    if (!callerEmp || !callerEmp.isAdmin) return { success: false, error: 'Admin access required.' };
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
    if (!callerEmp || !callerEmp.isAdmin) return { success: false, error: 'Admin access required.' };
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

/** Manager-gated. Persists the external-email quick-link library to Script
 *  Property CN_EXTERNAL_LINKS (JSON array of {label, url}). Validates each
 *  entry's label + http(s) url; caps count. Writes an AdminConfigChange audit
 *  row (INV-57 family). Same single-property-write pattern as saveEmailTemplates. */
function saveExternalLinks(links) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { success: false, error: 'Admin access required.' };
    if (!Array.isArray(links)) return { success: false, error: 'Invalid links list.' };
    if (links.length > CN_EXTERNAL_LINK_LIMIT) {
      return { success: false, error: 'Too many links (max ' + CN_EXTERNAL_LINK_LIMIT + ').' };
    }
    const clean = [];
    for (var i = 0; i < links.length; i++) {
      const l = links[i] || {};
      const label = String(l.label || '').trim();
      const url = String(l.url || '').trim();
      const cat = String(l.category || '').trim().toLowerCase();
      if (!label) return { success: false, error: 'Each link needs a label.' };
      if (!/^https?:\/\//i.test(url)) return { success: false, error: 'Link "' + label + '" needs an http(s) URL.' };
      clean.push({
        label: label, url: url,
        category: CN_EXTERNAL_LINK_CATEGORIES.indexOf(cat) >= 0 ? cat : 'other',
      });
    }
    PropertiesService.getScriptProperties().setProperty('CN_EXTERNAL_LINKS', JSON.stringify(clean));
    writeAuditLog_(callerEmp, 'AdminConfigChange', '', '', false, 0,
      'Updated external quick links (' + clean.length + ')', callerEmp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
}

/** Manager-gated (Phase A). Admin-adjustable KB AI settings: the daily
 *  org-wide spend cap (USD) + the vendor model. Persists Script Properties
 *  KB_AI_DAILY_CAP / KB_AI_MODEL; AdminConfigChange audit row (INV-57
 *  family; same single-property-write pattern as the sibling saves). The
 *  model must be a KB_AI_MODEL_PRICES key so the cap accounting always has
 *  real rates. The API key itself is NEVER set or returned through any
 *  endpoint — set Script Property KB_AI_API_KEY in the Apps Script editor. */
function saveKbAiSettings(settings) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { success: false, error: 'Admin access required.' };
    settings = settings || {};
    const cap = parseFloat(settings.dailyCap);
    if (!isFinite(cap) || cap < 0 || cap > 100) {
      return { success: false, error: 'Daily cap must be a number between 0 and 100 (USD).' };
    }
    const model = String(settings.model || '').trim();
    if (!KB_AI_MODEL_PRICES[model]) {
      return { success: false, error: 'Unknown model: ' + (model || '(blank)') + '. Pick one of: ' + Object.keys(KB_AI_MODEL_PRICES).join(', ') };
    }
    const props = PropertiesService.getScriptProperties();
    props.setProperty('KB_AI_DAILY_CAP', String(cap));
    props.setProperty('KB_AI_MODEL', model);
    writeAuditLog_(callerEmp, 'AdminConfigChange', '', '', false, 0,
      'Updated KB AI settings: dailyCap=$' + cap + '; model=' + model, callerEmp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
}

function saveDepartmentEmails(deptJson) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { success: false, error: 'Admin access required.' };
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
    if (!callerEmp || !callerEmp.isAdmin) return { success: false, error: 'Admin access required.' };
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
    if (CN_AUDIT_ACTIONS.indexOf(String(data[i][AUDIT.ACTION])) < 0) continue;
    // Batch 3: the typed reader recovers coerced cols once. `dateLocal` maps from
    // the recovered PunchDate — the compliance panel's "View note" deep-link hands
    // it to managerGetCallNotes (^\d{4}-\d{2}-\d{2}$ guard); a raw String() read
    // yielded "Wed Jul 15 2026 …" and silently killed the drill-through (F1).
    const a = auditRowObj_(data[i]);
    out.push({
      timestamp:    a.ts,
      timestampMgr: convertAuditTs_(a.ts, CONFIG.TIMEZONE, mgrTz),
      repId:        a.empId,
      repName:      a.empName,
      actorEmail:   a.actor,
      action:       a.action,
      dateLocal:    a.punchDate,
      noteId:       cnExtractAuditNoteId_(a.notes),
      notes:        a.notes,
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
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    filters = filters || {};
    const mgrTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
    const reDate = /^\d{4}-\d{2}-\d{2}$/;
    // Default end = "today" in CONFIG.TIMEZONE — the tz audit rows are stamped
    // in. Rows are written in IST wall time, which can be a calendar day ahead
    // of the manager's tz during the US afternoon; an mgr-tz default end
    // silently hid rows written "tomorrow" (IST) until the next day.
    let end = (filters.endDate && reDate.test(filters.endDate))
      ? filters.endDate : fmtDateTz_(new Date(), CONFIG.TIMEZONE);
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
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
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

// ── Client-side error beacon (#1, INV-150) ──────────────────────────────────
// The field-blindness gap: a throwing client render or a rejected promise
// chain used to surface NOWHERE — the rep sees a dead button, the operator
// sees nothing (the M-1 class shipped exactly this way for two cycles). The
// shell's window.onerror / unhandledrejection hook (script_core.html) posts
// exception METADATA here; the rows surface in the Automation Health panel.
// PHI-SAFE BY CONSTRUCTION: a row carries the exception message/stack + the
// active view key ONLY — never form-field values, note content, or DOM text
// (the client hook reads only the error event, and both sides truncate).
const CLIENT_ERRORS_TAB = 'ClientErrors';
const CLIENT_ERR_MSG_MAX = 400;
const CLIENT_ERR_STACK_MAX = 1500;
const CLIENT_ERR_RATE_MAX_PER_HOUR = 20;  // per rep — a render loop can't flood the tab
const CLIENT_ERR_SCAN_MAX = 2000;         // health-panel tail-scan bound (INV-13 spirit)
const CLIENT_ERR_WINDOW_DAYS = 7;

function getOrCreateClientErrorsSheet_() {
  const ss = getAdpSS_();
  let sheet = ss.getSheetByName(CLIENT_ERRORS_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(CLIENT_ERRORS_TAB);
    sheet.appendRow([
      `Timestamp (${tzAbbr_(CONFIG.TIMEZONE)})`,
      'EmployeeId', 'View', 'Source', 'Message', 'Stack',
    ]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Rep-callable (requires getEmployeeInfo_), locked (INV-01 — it appends),
 *  append-only. Bounds every field server-side (the client truncates too, but
 *  a crafted RPC must not bloat cells) and rate-caps per rep via CacheService
 *  so an error loop can't flood the tab. Every rejection returns quietly —
 *  the beacon is fire-and-forget and must never surface its own failures. */
function recordClientError(payload) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false };
    const p = payload || {};
    const message = String(p.message || '').trim().substring(0, CLIENT_ERR_MSG_MAX);
    if (!message) return { success: false };
    const stack = String(p.stack || '').substring(0, CLIENT_ERR_STACK_MAX);
    const view = String(p.view || '').substring(0, 40);
    const source = p.source === 'unhandledrejection' ? 'unhandledrejection' : 'onerror';
    // Approximate per-rep hourly rate cap. CacheService isn't atomic — close
    // enough for flood protection on a diagnostics (not audit) channel.
    const cache = CacheService.getScriptCache();
    const rateKey = 'client_err_rate:' + emp.id;
    const n = parseInt(cache.get(rateKey), 10) || 0;
    if (n >= CLIENT_ERR_RATE_MAX_PER_HOUR) return { success: false };
    cache.put(rateKey, String(n + 1), 3600);
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      getOrCreateClientErrorsSheet_().appendRow([
        fmtDate_(new Date()) + ' ' + fmtTime_(new Date()),
        emp.id, view, source, message, stack,
      ]);
    } finally { lock.releaseLock(); }
    return { success: true };
  } catch (e) {
    Logger.log('recordClientError failed: ' + e.message);
    return { success: false };
  }
}

/** Bounded ClientErrors tail summary for the Automation Health panel.
 *  Read-only + best-effort — no tab yet (no error ever reported) reads as
 *  zero; timestamps recover via normalizeAuditTs_ (the writer uses the same
 *  'yyyy-MM-dd HH:mm:ss' CONFIG.TIMEZONE form as writeAuditLog_). */
function clientErrorsSummary_(mgrTz) {
  const out = { count: 0, recent: [], windowDays: CLIENT_ERR_WINDOW_DAYS, url: '' };
  try {
    const ss = getAdpSS_();
    const sheet = ss.getSheetByName(CLIENT_ERRORS_TAB);
    if (!sheet) return out;
    try { out.url = ss.getUrl() + '#gid=' + sheet.getSheetId(); } catch (e) {}
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return out;
    const startRow = Math.max(2, lastRow - CLIENT_ERR_SCAN_MAX + 1);
    const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, 5).getValues();
    const cutD = new Date();
    cutD.setDate(cutD.getDate() - out.windowDays);
    const cutoff = fmtDateTz_(cutD, mgrTz);
    for (let i = data.length - 1; i >= 0; i--) {   // newest-first; append-only tab
      const tsRaw = normalizeAuditTs_(data[i][0]);
      if (tsRaw.substring(0, 10) < cutoff) break;  // chronological — older rows follow
      out.count++;
      if (out.recent.length < 5) {
        out.recent.push({
          timestampMgr: convertAuditTs_(tsRaw, CONFIG.TIMEZONE, mgrTz),
          empId: String(data[i][1]),
          view: String(data[i][2]),
          message: String(data[i][4]),
        });
      }
    }
  } catch (e) { Logger.log('clientErrorsSummary_ skipped: ' + e.message); }
  return out;
}

// ── Automation Health (Admin tab) ────────────────────────────────────────
// Operationalizes the "monitor AuditLog for PersonalSheetSyncFail" gotcha and
// the silent-degradation posture: one manager-gated, read-only aggregate that
// surfaces (a) personal-sheet sync failures, (b) CDR reachability / column
// drift / roster↔agent name mismatches, and (c) the last-seen audit row per
// automation job — so a missing trigger or a drifting external sheet shows up
// in the Admin tab instead of only in Logger / the raw AuditLog.

// Audit actions written by the automation jobs. Purges write a row only when
// retention is enabled (a disabled purge returns before the audit write), and
// AdpExportAuto only fires at period end — the client captions each
// accordingly so "never seen" isn't misread as "broken".
const AUTOMATION_AUDIT_ACTIONS = [
  'CallNotesReconcile', 'AdpExportAuto', 'FormDataPurge', 'CallNotesPurge',
  'CallNotesArchive', 'CallNotesArchivePurge', 'TimesheetArchive',
];
const AUTOMATION_SYNCFAIL_WINDOW_DAYS = 30;

/** Manager-gated, read-only. One bounded AuditLog tail scan (CN_AUDIT_MAX_SCAN
 *  rows, INV-13 spirit) + the 5-min-cached CDR aggregate. Never throws — CDR
 *  unreachability degrades to { cdr: { ok:false, error } } so the rest of the
 *  panel still renders (same best-effort posture as the shift-stats overlay). */
function getAutomationHealth() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    return computeAutomationHealth_();
  } catch (err) { return { error: err.message }; }
}

/** Internal, UN-GATED automation-health report — the body of getAutomationHealth,
 *  factored out so the manager-gated Admin panel AND the automation-failure push
 *  (sendAutomationHealthDigest) share ONE computation (no parallel-source drift).
 *  May throw; every caller wraps it in try/catch. */
/** Cycle 7 Turn C — detector-liveness checks ("can the detector detect?").
 *  Twice in cycle 7 a shipped detector could never fire — H-1: the coaching
 *  overdue consumers parsed the writer's space-form stamp with a T-only
 *  parser (null for every row, the digest never nagged); M-11: the
 *  unmatched-agent diagnostic iterated a pre-filtered set (always empty) —
 *  and NOTHING surfaced it: CI, the health panels, and the field were all
 *  blind, because "the job ran" says nothing about "the job's detector
 *  works". Each check feeds a WRITER's own output through the exact
 *  PARSER/CHANNEL its consumer uses, so a format/shape drift between the two
 *  sides fails loudly in the Automation Health panel, the daily failure
 *  digest, and the test suites. Pure round-trips — NO sheet reads (the CDR
 *  channel check is appended by computeAutomationHealth_'s existing CDR
 *  read). Smoke-test-pinned: every check must be ok. */
/** Pure (Node-pinned) — F9 manager-source drift. The trigger handlers gate on the
 *  MANAGER_EMAILS Script Property (`assertManagerCaller_` — a trigger runs as the
 *  installer, so it can't do a roster "who's calling" lookup), while every in-app
 *  endpoint gates on the roster `isManager` column. The split is intentional, but
 *  the two lists can DRIFT: an off-boarded/demoted manager removed from the roster
 *  (isManager→false) yet still listed in MANAGER_EMAILS retains trigger + purge
 *  power via `google.script.run` even though every in-app manager surface now
 *  rejects them.
 *
 *  Given the MANAGER_EMAILS list (`propEmails`) and the roster projected to
 *  {email, isManager} pairs, returns the lowercased emails that are in
 *  MANAGER_EMAILS AND have a roster row explicitly marked NOT a manager. Emails
 *  with NO roster row are DELIBERATELY not flagged — a legitimate non-roster
 *  deployer / service account in MANAGER_EMAILS is normal — so the check is
 *  false-positive-free (it never nags the daily failure digest or the smoke
 *  suite on a well-maintained deployment). */
function managerSourceDrift_(propEmails, rosterPairs) {
  const props = {};
  (propEmails || []).forEach(function (e) {
    const k = String(e || '').toLowerCase().trim();
    if (k) props[k] = true;
  });
  const out = [], seen = {};
  (rosterPairs || []).forEach(function (r) {
    const email = String((r && r.email) || '').toLowerCase().trim();
    if (!email || !props[email] || (r && r.isManager) || seen[email]) return;
    seen[email] = true;
    out.push(email);
  });
  return out;
}

function automationDetectorChecks_() {
  const checks = [];
  const add = function (key, label, fn) {
    try { fn(); checks.push({ key: key, label: label, ok: true, detail: '' }); }
    catch (e) { checks.push({ key: key, label: label, ok: false, detail: e.message }); }
  };
  const now = new Date();
  add('coachOverdue', 'Coaching overdue parser reads the coaching writer stamp', function () {
    const stamp = fmtDate_(now) + ' ' + fmtTime_(now);   // createCoaching's writer format
    if (!isFinite(coachParseTs_(stamp))) {               // the overdue consumers' parser
      throw new Error('coachParseTs_ cannot parse "' + stamp + '" — overdue detection is dead (the H-1 class)');
    }
  });
  add('auditStaleness', 'Automation last-run staleness math reads the audit writer stamp', function () {
    const stamp = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');  // writeAuditLog_'s format
    const ms = Utilities.parseDate(stamp, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss').getTime();
    if (!isFinite(ms)) throw new Error('audit writer stamp "' + stamp + '" not parseable — stale-run detection (the F1 class) is dead');
  });
  add('deptReqSla', 'DeptRequests SLA/elapsed math reads the DR writer stamp', function () {
    const stamp = drNowTs_();
    if (!parseTimestampMs_(stamp, CONFIG.TIMEZONE)) {
      throw new Error('parseTimestampMs_ cannot parse drNowTs_() "' + stamp + '" — SLA banding + elapsed math are dead');
    }
  });
  add('cnTimestamp', 'CN delete-window/stale math reads the CN timestamp boundary', function () {
    const recovered = cnTimestampString_(now);           // a locale-coerced Date cell, recovered
    if (!parseTimestampMs_(recovered, CONFIG.TIMEZONE)) {
      throw new Error('parseTimestampMs_ cannot parse cnTimestampString_(Date) "' + recovered + '" — the 5-min delete window fails open (the M-14 class)');
    }
  });
  add('formTokenExpiry', 'Form-token expiry reads both token cell shapes', function () {
    const stamp = Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");  // the token writer format
    const asString = formTokenCellMs_(stamp);
    if (!asString.present || !asString.ms) throw new Error('formTokenCellMs_ cannot read the writer string "' + stamp + '" — fresh tokens would read expired (the #89 class)');
    const asDate = formTokenCellMs_(now);                // the locale-coerced Date shape
    if (!asDate.present || !asDate.ms) throw new Error('formTokenCellMs_ cannot read a coerced Date cell — segregated-store tokens would read expired');
  });
  // F(cycle-8 M-11): config-coherence, not a parser round-trip — the flag's
  // second operator step (installAutomationTriggers) is easy to miss. The
  // fail-safe in managerBriefSuppressionActive_ keeps the separate digests
  // sending meanwhile, so this surfaces the misconfiguration instead of an
  // outage: the panel shows DEAD and the failure digest emails it.
  add('briefConfig', 'managerDailyBrief flag has a live brief trigger behind it', function () {
    if (getFlag_('managerDailyBrief') && !managerBriefSuppressionActive_()) {
      throw new Error('managerDailyBrief is ON but sendManagerDailyBrief has no fresh heartbeat — run installAutomationTriggers(). The separate manager digests keep sending until then (fail-safe).');
    }
  });
  // F9: config-coherence, not a parser round-trip — surfaces MANAGER_EMAILS ↔
  // roster drift (the intentional dual-source split, `assertManagerCaller_` vs
  // `emp.isManager`, can leave a demoted manager still trigger-privileged). Only
  // flags a roster row explicitly marked NOT a manager whose email is still in
  // MANAGER_EMAILS (false-positive-free — a non-roster deployer email is fine).
  add('managerSource', 'MANAGER_EMAILS grants no trigger power to a demoted roster manager', function () {
    const roster = getEmployeeRosterRows_();
    const pairs = [];
    for (let i = 1; i < roster.length; i++) {
      const mgrRaw = String(roster[i][EMP.IS_MANAGER] || '').trim().toLowerCase();
      pairs.push({
        email: String(roster[i][EMP.EMAIL] || ''),
        isManager: (mgrRaw === 'true' || mgrRaw === 'yes' || mgrRaw === 'y' || mgrRaw === '1'),
      });
    }
    const drift = managerSourceDrift_(getManagerEmails_(), pairs);
    if (drift.length) {
      throw new Error('MANAGER_EMAILS still grants trigger/purge power to roster row(s) marked NOT a manager: ' +
        drift.join(', ') + ' — remove them from the MANAGER_EMAILS Script Property. They were likely ' +
        'off-boarded/demoted: in-app manager access is already revoked, but assertManagerCaller_-gated ' +
        'trigger endpoints (installs, purges, digests) still accept them (F9).');
    }
  });
  return checks;
}

function computeAutomationHealth_() {
    const mgrTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;

    // ── (e) detector liveness (Turn C) — pure writer↔parser round-trips ──
    const detectors = automationDetectorChecks_();

    // ── (a) + (c): one bounded tail scan of the AuditLog ─────────────────
    const syncFails = { count: 0, recent: [], windowDays: AUTOMATION_SYNCFAIL_WINDOW_DAYS };
    const lastRunByAction = {};
    let scannedAll = true;
    const auditSheet = getOrCreateAuditSheet_();
    // Deep-link to the AuditLog tab (the source of the sync-fail + job-last-run
    // evidence below) so a manager can jump straight to the raw rows.
    let auditLogUrl = '';
    try { auditLogUrl = auditSheet.getParent().getUrl() + '#gid=' + auditSheet.getSheetId(); } catch (e) {}
    const lastRow = auditSheet.getLastRow();
    if (lastRow > 1) {
      const startRow = Math.max(2, lastRow - CN_AUDIT_MAX_SCAN + 1);
      scannedAll = startRow === 2;
      const data = auditSheet.getRange(startRow, 1, lastRow - startRow + 1, 10).getValues();
      // Day-string comparison against IST-written timestamps — same accepted
      // boundary fuzz as getCallNotesAuditLog's date filter.
      const cutD = new Date();
      cutD.setDate(cutD.getDate() - AUTOMATION_SYNCFAIL_WINDOW_DAYS);
      const cutoff = fmtDateTz_(cutD, mgrTz);
      for (let i = data.length - 1; i >= 0; i--) {   // newest-first
        // Batch 3: named AUDIT cols (this reader touches no coerced date/time
        // cells — only TS via normalizeAuditTs_ + string cols).
        const action = String(data[i][AUDIT.ACTION]);
        const tsRaw = normalizeAuditTs_(data[i][AUDIT.TS]);
        if (action === 'PersonalSheetSyncFail') {
          if (tsRaw.substring(0, 10) >= cutoff) {
            syncFails.count++;
            if (syncFails.recent.length < 5) {
              syncFails.recent.push({
                timestampMgr: convertAuditTs_(tsRaw, CONFIG.TIMEZONE, mgrTz),
                empName: String(data[i][AUDIT.EMP_NAME]),
                notes: String(data[i][AUDIT.NOTES]),
              });
            }
          }
        } else if (AUTOMATION_AUDIT_ACTIONS.indexOf(action) >= 0 && !lastRunByAction[action]) {
          // `ms` (raw run time) is additive — the Admin panel renders timestampMgr/
          // notes; sendAutomationHealthDigest uses ms to detect a STALE last run
          // (the F1 class — a daily job that silently stopped).
          let _runMs = null;
          try { _runMs = Utilities.parseDate(tsRaw, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss').getTime(); } catch (_) {}
          lastRunByAction[action] = {
            timestampMgr: convertAuditTs_(tsRaw, CONFIG.TIMEZONE, mgrTz),
            ms: _runMs,
            notes: String(data[i][AUDIT.NOTES]),
          };
        }
      }
    }
    const automationLastRuns = AUTOMATION_AUDIT_ACTIONS.map(function (a) {
      return { action: a, last: lastRunByAction[a] || null };
    });

    // ── (b): CDR reachability + name-match health (last 7 days) ──────────
    let cdr;
    try {
      const now = new Date();
      const to = fmtDateTz_(now, mgrTz);
      const fromD = new Date(now);
      fromD.setDate(fromD.getDate() - 7);
      const from = fmtDateTz_(fromD, mgrTz);
      const result = getCdrAgentMetrics_(from, to, null);   // unfiltered — all agents
      if (result.meta && result.meta.error) {
        cdr = { ok: false, error: result.meta.error };
      } else {
        // Canonicalize agent names through the alias map before comparing to
        // the roster (the unfiltered read doesn't apply aliases itself), so an
        // aliased agent isn't reported as unmatched.
        const aliasMap = getCdrNameMap_();
        const roster = getEmployeeRosterRows_();
        const rosterSet = {};
        for (let r = 1; r < roster.length; r++) {
          const nm = String(roster[r][EMP.NAME]).trim();
          if (nm) rosterSet[nm] = true;
        }
        const canonicalAgents = {};
        Object.keys(result.agents || {}).forEach(function (a) {
          canonicalAgents[aliasMap[a] || a] = true;
        });
        cdr = {
          ok: true, from: from, to: to,
          rowsMatched: (result.meta && result.meta.rowsMatched) || 0,
          columnWarning: (result.meta && result.meta.columnWarning) || null,
          unmatchedAgents: Object.keys(canonicalAgents).filter(function (a) { return !rosterSet[a]; }).sort(),
          rosterWithNoCdr: Object.keys(rosterSet).filter(function (n) { return !canonicalAgents[n]; }).sort(),
        };
        // Turn C (the M-11 class): the off-roster diagnostic CHANNEL must
        // exist on the reader's meta — Team Metrics' unmatchedAgents sources
        // from it, and it was structurally absent (always-empty) until M-11.
        // Only checkable when CDR is reachable, so it rides this block.
        const chanOk = Array.isArray(result.meta && result.meta.offRosterAgents);
        detectors.push({ key: 'cdrOffRoster', label: 'CDR off-roster diagnostic channel present', ok: chanOk,
          detail: chanOk ? '' : 'getCdrAgentMetrics_ meta lacks offRosterAgents[] — unmatched-agent detection is dead (the M-11 class)' });
      }
    } catch (cdrErr) {
      cdr = { ok: false, error: cdrErr.message };
    }

    // ── (d) digest heartbeats (Script Property — no audit rows by design) ──
    // Staleness windows: EOD trigger is hourly (stale > 2h), urgent is daily
    // (> 26h), weekly is Friday-only (> 8 days). last:null = no heartbeat
    // recorded yet (pre-heartbeat deploy or trigger never installed).
    const DIGEST_STALE_HOURS = { eod: 2, urgent: 26, weekly: 192, trainingOverdue: 26, deptReqReminder: 26, managerBrief: 26 };
    let digestMap = {};
    try {
      digestMap = JSON.parse(PropertiesService.getScriptProperties()
        .getProperty(DIGEST_LAST_RUN_PROP)) || {};
    } catch (_) {}
    if (!digestMap || typeof digestMap !== 'object' || Array.isArray(digestMap)) digestMap = {};
    const digestHealth = ['eod', 'urgent', 'weekly', 'trainingOverdue', 'deptReqReminder', 'managerBrief'].map(function (k) {
      const raw = String(digestMap[k] || '');
      let stale = false;
      if (raw) {
        try {
          const ms = Utilities.parseDate(raw, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss').getTime();
          stale = (Date.now() - ms) > DIGEST_STALE_HOURS[k] * 3600000;
        } catch (_) { stale = true; }
      }
      return {
        key: k,
        last: raw ? convertAuditTs_(raw, CONFIG.TIMEZONE, mgrTz) : null,
        stale: stale,
      };
    });

    return {
      syncFails: syncFails,
      automationLastRuns: automationLastRuns,
      digests: digestHealth,
      cdr: cdr,
      detectors: detectors,   // Turn C — detector-liveness checks
      clientErrors: clientErrorsSummary_(mgrTz),   // #1 — client error beacon (INV-150)
      auditScanComplete: scannedAll,
      managerTzAbbr: tzAbbr_(mgrTz),
      auditLogUrl: auditLogUrl,
    };
}

/** Daily org-wide automation-FAILURE push (manager-tz 9am). Reuses
 *  computeAutomationHealth_() and emails MANAGER_EMAILS ONLY when something is
 *  actually wrong — a stale digest heartbeat, a stale nightly reconcile (the F1
 *  class: a daily trigger that silently stopped), personal-sheet sync failures,
 *  or CDR unreachable. A HEALTHY system is silent (no daily nag), mirroring the
 *  urgent digest's "sends nothing when none". Top-level trigger handler, so it
 *  carries the MANAGER_EMAILS assertManagerCaller_ gate (INV-44); best-effort
 *  (INV-14, never throws past the catch); PHI-free. */
function sendAutomationHealthDigest() {
  assertManagerCaller_('sendAutomationHealthDigest');
  try {
    const mgrEmails = getManagerEmails_();
    if (!mgrEmails.length) { Logger.log('No manager emails — skipping automation-health digest.'); return; }
    let report = null;
    try { report = computeAutomationHealth_(); } catch (e) { Logger.log('automation-health digest: report failed: ' + e.message); }
    if (!report) return;

    const problems = [];
    // (a) Stale digest heartbeats — a digest whose last run aged past its window
    // (a previously-alive trigger that stopped). last:null (never run) is NOT a
    // problem (fresh deploy / not-yet-installed), matching the panel's posture.
    (report.digests || []).forEach(function (d) {
      if (d && d.stale) problems.push('The "' + d.key + '" digest last ran ' + (d.last || 'too long ago') + ' — the trigger may be disabled.');
    });
    // (b) Reconcile liveness — the ONE unconditional daily job (it writes an audit
    // row every run), so a stale last-run is the F1 signal (a narrowed
    // ADMIN_EMAILS / dead trigger). Only flag when a prior run EXISTS but is old
    // (no row at all = fresh deploy / not installed — same posture as (a)).
    const RECON_STALE_HOURS = 30;   // daily 5am + margin
    const recon = (report.automationLastRuns || []).filter(function (a) { return a.action === 'CallNotesReconcile'; })[0];
    if (recon && recon.last && recon.last.ms && (Date.now() - recon.last.ms) > RECON_STALE_HOURS * 3600000) {
      problems.push('The nightly Sheets reconcile last ran ' + recon.last.timestampMgr + ' (over ' + RECON_STALE_HOURS + 'h ago) — the trigger may be disabled.');
    }
    // (c) Personal-sheet sync failures (a rep's Sheet drifting from the source).
    if (report.syncFails && report.syncFails.count > 0) {
      problems.push(report.syncFails.count + ' personal-sheet sync failure(s) in the last ' + report.syncFails.windowDays + ' day(s).');
    }
    // (d) Turn C — detector liveness: a DEAD DETECTOR is the failure class the
    // rest of this digest can't see ("the job ran" ≠ "the job's detector
    // works" — the H-1/M-11 lesson). Any failing writer↔parser round-trip or
    // missing diagnostic channel is pushed.
    (report.detectors || []).forEach(function (c) {
      if (c && c.ok === false) problems.push('Detector dead: ' + c.label + ' — ' + c.detail);
    });
    // CDR reachability is deliberately NOT pushed here: it isn't a trigger, an
    // unset CDR_SS_ID legitimately reads as "unreachable" (would false-nag a
    // non-CDR deployment daily), and the Admin Storage/Automation Health panels
    // already surface it. The digest stays scoped to automation-TRIGGER failures.

    if (!problems.length) { Logger.log('automation-health digest: all clear, nothing to send.'); return; }

    const itemsHtml = '<ul style="margin:0;padding-left:18px;">' +
      problems.map(function (p) { return '<li style="margin:4px 0;">' + esc_(p) + '</li>'; }).join('') + '</ul>';
    const bodyHtml = '<p style="margin:0 0 10px;">Automated checks found ' + problems.length +
      ' issue(s) with the Team Tools automation. Open Call Notes → Admin → Automation Health for detail.</p>' + itemsHtml;
    const textBody = 'Automation health — ' + problems.length + ' issue(s):\n\n' +
      problems.map(function (p) { return '• ' + p; }).join('\n') +
      '\n\nOpen Call Notes → Admin → Automation Health for detail.';
    try {
      MailApp.sendEmail({
        to: mgrEmails.join(','),
        subject: 'Team Tools — automation health: ' + problems.length + ' issue(s) need attention',
        body: textBody,
        htmlBody: buildBrandedEmailHtml_('Automation health needs attention', bodyHtml, { tone: 'warn', subLabel: 'Automation Health' }),
      });
    } catch (mailErr) { Logger.log('automation-health digest send failed: ' + mailErr.message); }
    Logger.log('sendAutomationHealthDigest: ' + problems.length + ' issue(s) emailed to ' + mgrEmails.length + ' manager(s).');
  } catch (err) {
    Logger.log('sendAutomationHealthDigest failed: ' + err.message);
  }
}

/** Storage Health (#1) — manager-gated, read-only one-pane-of-glass over every
 *  spreadsheet the app uses: which Script Property resolves it, whether it's
 *  configured + reachable, and — the headline — whether its timezone matches
 *  CONFIG.TIMEZONE (a mismatch silently drifts every coerced date/time read;
 *  the runAllTests S1.1 tripwire only covers the ADP sheet, this covers all of
 *  them). PHI-free: returns store metadata + names/urls + tz only, never any
 *  row content. Rendered in the Call Notes Admin tab beside Automation Health. */
function getStorageHealth(opts) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    // #3 — the KB-embed Drive scan runs for the Storage Health panel (default)
    // but is skipped by getDeployReadiness, which only bands store config.
    const scanEmbeds = !opts || opts.scanEmbeds !== false;
    const props = PropertiesService.getScriptProperties();
    const cfgTz = CONFIG.TIMEZONE;
    const isPlaceholder = function (v) { return !v || /^YOUR_/.test(String(v)); };

    // Open a resolved id and report reachability / name / tz / tz-match.
    const probe = function (spec) {
      const out = {
        label: spec.label, role: spec.role, cls: spec.cls, retention: spec.retention,
        prop: spec.prop, source: spec.source, note: spec.note || '',
        configured: !!spec.id, reachable: false, name: '', tz: '', tzMatch: null, url: '',
      };
      if (!spec.id) return out;
      try {
        const ss = SpreadsheetApp.openById(spec.id);
        out.reachable = true;
        out.name = ss.getName();
        out.tz = ss.getSpreadsheetTimeZone();
        out.tzMatch = tzEquivalent_(out.tz, cfgTz);   // alias-aware (Calcutta ≡ Kolkata)
        // Cycle 7 (M-14 class): surface the LOCALE too — a coercing locale
        // turns stored ISO-T strings into Dates on read (the formTokenCellMs_
        // bug class); tz checks alone never showed this drift axis.
        try { out.locale = ss.getSpreadsheetLocale(); } catch (e2) { out.locale = ''; }
        out.url = ss.getUrl();
      } catch (e) { out.error = e.message; }
      return out;
    };

    const stores = [];
    const adpProp = props.getProperty('ADP_SS_ID');
    const adpId = adpProp || (isPlaceholder(CONFIG.ADP_SS_ID) ? '' : CONFIG.ADP_SS_ID);
    stores.push(probe({ label: 'Time Clock / ADP', role: 'Roster, Timesheet, TimeOffRequests, shared AuditLog, punch-adjust',
      cls: 'Payroll', retention: 'Kept', prop: 'ADP_SS_ID', id: adpId,
      source: adpProp ? 'Script Property' : (adpId ? 'CONFIG' : 'unset'),
      note: adpId ? '' : 'Set ADP_SS_ID — the app fails on first sheet open without it.' }));

    const cdrProp = props.getProperty('CDR_SS_ID');
    const cdrId = cdrProp || (isPlaceholder(CONFIG.CDR_SS_ID) ? '' : CONFIG.CDR_SS_ID);
    stores.push(probe({ label: 'CDR Report', role: 'DQE + CSR Transfer + Agent Alias Overrides (read-only)',
      cls: 'External', retention: 'n/a — owned by call-data-reporting', prop: 'CDR_SS_ID', id: cdrId,
      source: cdrProp ? 'Script Property' : (cdrId ? 'CONFIG' : 'unset'),
      note: cdrId ? '' : 'Optional — Metrics + the shift-stats CDR overlay degrade gracefully when unset.' }));

    const intakeProp = props.getProperty('INTAKE_SS_ID');
    const intakeId = intakeProp || (isPlaceholder(CONFIG.INTAKE.SS_ID) ? '' : CONFIG.INTAKE.SS_ID);
    stores.push(probe({ label: 'Intake (PHI)', role: 'Offerings + PPD/PMD/PAP submissions',
      cls: 'PHI', retention: 'Optional purge', prop: 'INTAKE_SS_ID', id: intakeId,
      source: intakeProp ? 'Script Property' : (intakeId ? 'CONFIG' : 'unset'),
      note: intakeId ? '' : 'Set INTAKE_SS_ID — Intake fails on first preview/send without it.' }));

    const formsProp = props.getProperty('FORMS_SS_ID');
    const formsId = formsProp || adpId;
    stores.push(probe({ label: 'Forms (PHI)', role: 'FormTokens + FormSubmissions',
      cls: 'PHI', retention: '90-day purge (if enabled)', prop: 'FORMS_SS_ID', id: formsId,
      source: formsProp ? 'Script Property' : (formsId ? 'ADP fallback' : 'unset'),
      note: formsProp ? '' : 'Unset → form PHI is co-located with the ADP/payroll sheet. Recommend setting FORMS_SS_ID to the Intake spreadsheet.' }));

    const kbProp = props.getProperty('KB_SS_ID');
    const kbId = kbProp || (isPlaceholder(CONFIG.KB.SS_ID) ? '' : CONFIG.KB.SS_ID);
    const kbStore = probe({ label: 'Knowledge Base + Training', role: 'KB, KbViews, Training/Quiz tabs',
      cls: 'PHI-free', retention: 'Kept', prop: 'KB_SS_ID', id: kbId,
      source: kbProp ? 'Script Property' : (kbId ? 'CONFIG' : 'unset'),
      note: kbId ? '' : 'Set KB_SS_ID — Reference + Training fail without it.' });
    stores.push(kbStore);

    const hrProp = props.getProperty('HR_DOCS_SS_ID');
    stores.push(probe({ label: 'Employee Docs (HR)', role: 'EmpDocs + DocSignatures',
      cls: 'HR — keep-forever', retention: 'Never purged', prop: 'HR_DOCS_SS_ID', id: hrProp || '',
      source: hrProp ? 'Script Property' : 'unset',
      note: hrProp ? '' : 'Unset → Employee Docs is disabled (no fallback store, by design — INV-122).' }));

    // Per-rep Call Notes Sheets — probe each enrolled rep (the established
    // cross-rep walk cost, e.g. managerGetUnresolvedActionCount). Summarize
    // reachability + tz drift; list up to 20 problem Sheets.
    const roster = getEmployeeRosterRows_();
    let enrolled = 0, reachable = 0, tzMismatch = 0;
    const problems = [];
    for (let i = 1; i < roster.length; i++) {
      const sid = roster[i][EMP.CALL_NOTES_SHEET_ID];
      if (!sid) continue;
      enrolled++;
      const nm = String(roster[i][EMP.NAME] || '').trim();
      try {
        const rss = SpreadsheetApp.openById(String(sid).trim());
        reachable++;
        const rtz = rss.getSpreadsheetTimeZone();
        if (!tzEquivalent_(rtz, cfgTz)) {
          tzMismatch++;
          if (problems.length < 20) {
            let rurl = '';
            try { rurl = rss.getUrl(); } catch (e2) {}
            problems.push({ name: nm, issue: 'tz ' + rtz, url: rurl });
          }
        }
      } catch (e) { if (problems.length < 20) problems.push({ name: nm, issue: 'unreachable' }); }
    }
    stores.push({
      label: 'Call Notes (per-rep)', role: enrolled + ' enrolled rep Sheet(s)',
      cls: 'PHI', retention: 'Optional purge', prop: 'Employees col L (CallNotesSheetId)',
      source: 'roster', configured: enrolled > 0,
      reachable: enrolled === 0 ? null : (reachable === enrolled),
      tzMatch: enrolled === 0 ? null : (tzMismatch === 0),
      perRep: { enrolled: enrolled, reachable: reachable, tzMismatch: tzMismatch, problems: problems },
      note: enrolled === 0 ? 'No reps enrolled yet.'
        : (reachable + '/' + enrolled + ' reachable' + (tzMismatch ? ('; ' + tzMismatch + ' tz-mismatched') : '')),
    });

    // #3 — probe KB embeds for a dead/moved Drive file or lost deployer access
    // (a silently-broken embed reads as neither "stale" nor "unreachable store").
    // Only when the KB store itself is reachable; bounded + best-effort; PHI-free.
    let kbEmbeds = null;
    if (scanEmbeds && kbStore.reachable) kbEmbeds = kbScanBrokenEmbeds_(KB_EMBED_SCAN_CAP);

    // Cycle 7 (M-14 class): locale-consistency pass — every store's locale
    // should match the ADP sheet's (the baseline the coercion-recovery helpers
    // assume). A drifted locale is warn-level: it changes WHICH string shapes
    // Sheets coerces to Dates on read.
    const adpLocale = (stores[0] && stores[0].locale) || '';
    if (adpLocale) {
      stores.forEach(function (s) {
        if (s.locale === undefined) return;             // per-rep summary row
        s.localeMatch = s.locale ? (s.locale === adpLocale) : null;
      });
    }

    return { configTimezone: cfgTz, adpLocale: adpLocale, stores: stores, kbEmbeds: kbEmbeds };
  } catch (err) { return { error: err.message }; }
}

// ════════════════════════════════════════════════════════════════════════════
//  ADMIN SHEET VIEWER (Tier 2) — read-only, highlighted, in-app table view of
//  a SAFE, allowlisted tab. The view KEY is the security boundary: a caller can
//  only request a pre-vetted, PHI-free, column-projected view. PHI/payroll/HR
//  tabs are deliberately ABSENT from the registry (Intake/Forms/per-rep Notes/
//  Timesheet/Employees/EmpDocs, and the Quizzes answer key) — see INV-32 (the
//  AuditLog is PHI-free) / INV-121 / INV-122. Read-only: there is NO write path.
// ════════════════════════════════════════════════════════════════════════════

/** The allowlist of admin sheet-view keys (the security boundary). Every key is
 *  a pre-vetted, column-projected, PHI-free view — PHI/payroll/HR tabs are
 *  deliberately absent (INV-32/121/122). */
function adminSheetViewKeys_() { return ['auditLog', 'kb', 'trainingAssign', 'trainingComplete']; }

/** Pure (Node-pinned) — row tone for the AuditLog view, by action name only.
 *  danger = destructive (purge/delete/void); warn = degradation/correction
 *  (sync-fail, PTO reconciliation fix); info = automation/admin (reconcile,
 *  export, archive, provision, install/remove, digest); else neutral. */
function adminAuditRowTone_(action) {
  var a = String(action || '');
  if (/Purge|Delete|Void/i.test(a)) return 'danger';
  if (/SyncFail|PtoReconciliationFix/i.test(a)) return 'warn';
  if (/Reconcile|Export|Archive|Provision|Install|Remove|Digest/i.test(a)) return 'info';
  return '';
}

/** Manager-gated (INV-02), read-only, PHI-free in-app viewer of an allowlisted
 *  tab. Returns { ok, viewKey, label, storeUrl, mgrTzAbbr, columns, rows, truncated }
 *  where each row is { cells:{...}, tone, rowUrl }. rowUrl deep-links to that
 *  exact row in Sheets (the Tier-1 pattern, per-row). */
function getAdminSheetView(viewKey, opts) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    viewKey = String(viewKey || '');
    if (adminSheetViewKeys_().indexOf(viewKey) < 0) return { error: 'Unknown view.' };
    if (viewKey === 'auditLog') return adminSheetView_auditLog_();
    if (viewKey === 'kb') return adminSheetView_kb_();
    if (viewKey === 'trainingAssign') return adminSheetView_trainingAssign_();
    if (viewKey === 'trainingComplete') return adminSheetView_trainingComplete_();
    return { error: 'Unknown view.' };
  } catch (err) { return { error: err.message }; }
}

/** AuditLog view — newest-first bounded tail scan (the cnReadCallNoteAuditRows_
 *  pattern), ALL actions (not just call-note ones), tone-flagged + row-deep-linked.
 *  PHI-free (INV-32 — the AuditLog never carries note content). */
function adminSheetView_auditLog_() {
  const sheet = getOrCreateAuditSheet_();
  let baseUrl = '';
  try { baseUrl = sheet.getParent().getUrl() + '#gid=' + sheet.getSheetId(); } catch (e) {}
  const columns = [
    { key: 'ts', label: 'Time' },
    { key: 'action', label: 'Action' },
    { key: 'rep', label: 'Employee' },
    { key: 'actor', label: 'Actor' },
    { key: 'notes', label: 'Detail' },
  ];
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { ok: true, viewKey: 'auditLog', label: 'AuditLog · ADP', storeUrl: baseUrl, columns: columns, rows: [], truncated: false };
  }
  const cap = ADMIN_VIEW_MAX_ROWS;
  const startRow = Math.max(2, lastRow - CN_AUDIT_MAX_SCAN + 1);
  const scannedAll = startRow === 2;
  const numRows = lastRow - startRow + 1;
  const data = sheet.getRange(startRow, 1, numRows, 10).getValues();
  const mgrTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
  const rows = [];
  for (let i = data.length - 1; i >= 0 && rows.length < cap; i--) {  // newest-first
    // Batch 3: named AUDIT cols (PHI-free projection — TS via normalizeAuditTs_ +
    // string cols; this view reads no coerced date/time cells).
    const action = String(data[i][AUDIT.ACTION] || '');
    const tsRaw = normalizeAuditTs_(data[i][AUDIT.TS]);
    const sheetRow = startRow + i;
    rows.push({
      tone: adminAuditRowTone_(action),
      rowUrl: baseUrl ? (baseUrl + '&range=A' + sheetRow) : '',
      cells: {
        ts:     convertAuditTs_(tsRaw, CONFIG.TIMEZONE, mgrTz),
        action: action,
        rep:    String(data[i][AUDIT.EMP_NAME] || data[i][AUDIT.EMP_ID] || ''),
        actor:  String(data[i][AUDIT.ACTOR] || ''),
        notes:  String(data[i][AUDIT.NOTES] || ''),
      },
    });
  }
  // Truncated when the scan window didn't reach row 2, or the cap clipped the result.
  const truncated = !scannedAll || (data.length > cap);
  return {
    ok: true, viewKey: 'auditLog', label: 'AuditLog · ADP', storeUrl: baseUrl,
    mgrTzAbbr: tzAbbr_(mgrTz), columns: columns, rows: rows, truncated: truncated,
    legend: [
      { tone: 'danger', label: 'destructive' },
      { tone: 'warn', label: 'degradation' },
      { tone: 'info', label: 'automation' },
    ],
  };
}

/** Pure (Node-pinned) — KB row tone: warn when the item is review-due (last
 *  review/edit age ≥ dueDays, or never reviewed/edited), else neutral. Mirrors
 *  the kbGetReviewDue staleness rule (INV-126). */
function adminKbReviewTone_(ageDays, dueDays) {
  if (ageDays == null) return 'warn';
  return ageDays >= dueDays ? 'warn' : '';
}

/** Shared 2b builder — bounded newest-first tail read of `sheet`, each data row
 *  mapped via rowMapper(rowArray) → { cells, tone } (or null to skip), with a
 *  per-row #gid&range deep-link. PHI-free by the caller's column projection. */
function adminSheetViewBuild_(sheet, viewKey, label, columns, legend, rowMapper) {
  let baseUrl = '';
  try { baseUrl = sheet.getParent().getUrl() + '#gid=' + sheet.getSheetId(); } catch (e) {}
  const out = {
    ok: true, viewKey: viewKey, label: label, storeUrl: baseUrl,
    columns: columns, rows: [], truncated: false, legend: legend || [],
  };
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return out;
  const lastCol = Math.max(1, sheet.getLastColumn());
  const cap = ADMIN_VIEW_MAX_ROWS;
  const startRow = Math.max(2, lastRow - CN_AUDIT_MAX_SCAN + 1);
  const numRows = lastRow - startRow + 1;
  const data = sheet.getRange(startRow, 1, numRows, lastCol).getValues();
  const rows = [];
  for (let i = data.length - 1; i >= 0 && rows.length < cap; i--) {  // newest-first
    const mapped = rowMapper(data[i]);
    if (!mapped) continue;
    const sheetRow = startRow + i;
    rows.push({ cells: mapped.cells, tone: mapped.tone || '', rowUrl: baseUrl ? (baseUrl + '&range=A' + sheetRow) : '' });
  }
  out.rows = rows;
  out.truncated = (startRow > 2) || (data.length > cap);
  return out;
}

/** KB view — the PHI-free-by-policy content tab, projected to metadata only
 *  (NO BodyMd), review-due rows warn-tinted (INV-126). */
function adminSheetView_kb_() {
  const ss = getKbSS_();
  const ssTz = ss.getSpreadsheetTimeZone();
  const sheet = getOrCreateKbSheet_();
  const dueDays = (CONFIG.KB && CONFIG.KB.REVIEW_DUE_DAYS) || 90;
  const todayNum = cnIsoToDayNum_(fmtDate_(new Date()));
  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'dept', label: 'Department' },
    { key: 'type', label: 'Type' },
    { key: 'updated', label: 'Updated' },
    { key: 'reviewed', label: 'Reviewed' },
  ];
  return adminSheetViewBuild_(sheet, 'kb', 'Knowledge Base · KB', columns,
    [{ tone: 'warn', label: 'review due (' + dueDays + 'd+)' }],
    function (r) {
      const id = String(r[KB.ID] || '').trim();
      if (!id) return null;
      const reviewedIso = kbCellDateIso_(r[KB.REVIEWED_AT], ssTz);
      const updatedIso = kbCellDateIso_(r[KB.UPDATED_AT], ssTz);
      const baseIso = reviewedIso || updatedIso;
      let ageDays = null;
      if (baseIso) { const n = cnIsoToDayNum_(baseIso); if (n != null && todayNum != null) ageDays = todayNum - n; }
      return {
        tone: adminKbReviewTone_(ageDays, dueDays),
        cells: {
          title: String(r[KB.TITLE] || '(untitled)'),
          dept: String(r[KB.DEPARTMENT] || ''),
          type: String(r[KB.TYPE] || 'article'),
          updated: updatedIso || '',
          reviewed: reviewedIso || '(never)',
        },
      };
    });
}

/** Training assignments — PHI-free (roster ids only); revoked rows muted. */
function adminSheetView_trainingAssign_() {
  const ssTz = getKbSS_().getSpreadsheetTimeZone();
  const sheet = getOrCreateTrainSheet_(TRAIN_ASSIGN_TAB, TRAIN_ASSIGN_HEADERS);
  const columns = [
    { key: 'item', label: 'Item' },
    { key: 'emp', label: 'Employee' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'due', label: 'Due' },
    { key: 'revoked', label: 'Revoked' },
  ];
  return adminSheetViewBuild_(sheet, 'trainingAssign', 'Training assignments', columns,
    [{ tone: 'info', label: 'revoked' }],
    function (r) {
      const assignId = String(r[TA.ASSIGN_ID] || '').trim();
      if (!assignId) return null;
      const revoked = trainCellDate_(r[TA.REVOKED_AT], ssTz);
      return {
        tone: revoked ? 'info' : '',
        cells: {
          item: String(r[TA.ITEM_TYPE] || '') + ':' + String(r[TA.ITEM_ID] || ''),
          emp: String(r[TA.EMP_ID] || ''),
          assigned: trainCellDate_(r[TA.ASSIGNED_AT], ssTz) || '',
          due: trainCellDate_(r[TA.DUE_DATE], ssTz) || '',
          revoked: revoked || '',
        },
      };
    });
}

/** Training completions — PHI-free (roster ids only); browse + deep-link. */
function adminSheetView_trainingComplete_() {
  const ssTz = getKbSS_().getSpreadsheetTimeZone();
  const sheet = getOrCreateTrainSheet_(TRAIN_COMPLETE_TAB, TRAIN_COMPLETE_HEADERS);
  const columns = [
    { key: 'emp', label: 'Employee' },
    { key: 'item', label: 'Item' },
    { key: 'completed', label: 'Completed' },
    { key: 'via', label: 'Via' },
  ];
  return adminSheetViewBuild_(sheet, 'trainingComplete', 'Training completions', columns, [],
    function (r) {
      const emp = String(r[TCMP.EMP_ID] || '').trim();
      if (!emp) return null;
      return {
        tone: '',
        cells: {
          emp: emp,
          item: String(r[TCMP.ITEM_TYPE] || '') + ':' + String(r[TCMP.ITEM_ID] || ''),
          completed: trainCellDate_(r[TCMP.COMPLETED_AT], ssTz) || '',
          via: String(r[TCMP.VIA] || ''),
        },
      };
    });
}

/** Pure (Node-pinned) — derives the deploy-readiness checklist from the
 *  Storage + Automation health payloads + the manager-email count. Each item
 *  is {key,label,status:'ok'|'warn'|'fail',detail}; a `summary` tallies the
 *  three statuses. Required stores (ADP/KB/Intake) FAIL when unset; optional
 *  stores (CDR/Forms/HR/per-rep) only WARN; a tz mismatch on any store WARNs
 *  (the silent coerced-read drift). No braces inside string literals
 *  (extractRawFunction caveat). */
function deployReadinessItems_(storage, automation, managerCount) {
  var REQUIRED = { ADP_SS_ID: 1, KB_SS_ID: 1, INTAKE_SS_ID: 1 };
  var items = [];
  var push = function (key, label, status, detail) {
    items.push({ key: key, label: label, status: status, detail: detail || '' });
  };

  push('managers', 'Manager emails configured',
    (managerCount > 0) ? 'ok' : 'fail',
    (managerCount > 0) ? (managerCount + ' configured')
      : 'Set MANAGER_EMAILS — no one passes the manager gate without it.');

  var cfgTz = (storage && storage.configTimezone) || '';
  var stores = (storage && storage.stores) || [];
  stores.forEach(function (s) {
    var prop = s.prop || '';
    var required = !!REQUIRED[prop];
    var status, detail;
    if (s.configured === false) {
      status = required ? 'fail' : 'warn';
      detail = s.note || (required ? ('Required — set ' + prop) : 'Optional — unset');
    } else if (s.reachable === false) {
      status = 'fail';
      detail = 'Configured but unreachable' + (s.error ? (': ' + s.error) : '.');
    } else if (s.tzMatch === false) {
      status = 'warn';
      detail = 'Timezone ' + (s.tz || s.note || '?') + ' differs from CONFIG ' + cfgTz + ' — coerced date/time reads drift.';
    } else if (s.localeMatch === false) {
      // Turn A: locale drift bands warn like tz drift — a differing locale
      // changes WHICH string shapes Sheets coerces to Dates on read (the
      // formTokenCellMs_/M-14 class).
      status = 'warn';
      detail = 'Locale ' + (s.locale || '?') + ' differs from the ADP sheet — string→Date coercion behavior drifts.';
    } else {
      status = 'ok';
      detail = s.note || s.name || 'OK';
    }
    push('store_' + (prop || s.label), s.label, status, detail);
  });

  var digests = (automation && automation.digests) || [];
  var anyHeartbeat = digests.some(function (d) { return !!d.last; });
  var anyStale = digests.some(function (d) { return !!d.stale; });
  push('triggers', 'Automation triggers (digest heartbeats)',
    !anyHeartbeat ? 'warn' : (anyStale ? 'warn' : 'ok'),
    !anyHeartbeat ? 'No digest has run yet — run installAutomationTriggers() (expected on a fresh deploy).'
      : (anyStale ? 'A digest looks stale — check the cross-account trigger-ownership trap.' : 'Heartbeats fresh.'));

  var cdrOk = !!(automation && automation.cdr && automation.cdr.ok);
  push('cdr', 'CDR reachability (Metrics)',
    cdrOk ? 'ok' : 'warn',
    cdrOk ? 'Reachable.' : 'CDR unreachable/unset — Metrics + the shift-stats overlay degrade gracefully (optional).');

  var summary = { ok: 0, warn: 0, fail: 0 };
  items.forEach(function (it) { summary[it.status] = (summary[it.status] || 0) + 1; });
  return { items: items, summary: summary };
}

/** Deploy-readiness checklist (#1) — manager-gated, read-only. One-click
 *  pre-deploy report: composes the existing Storage Health (all 7 stores'
 *  configured/reachable/tz-vs-CONFIG) + Automation Health (digest heartbeats,
 *  CDR) + the MANAGER_EMAILS count into a pass/warn/fail checklist. PHI-free
 *  (store metadata only). Surfaced atop the Call Notes Admin Overview. */
function getDeployReadiness() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    const storage = getStorageHealth({ scanEmbeds: false });   // #3 — deploy-readiness bands store config only, skip the Drive scan
    if (storage && storage.error) return { error: storage.error };
    let automation = {};
    try { automation = getAutomationHealth() || {}; } catch (e) { automation = {}; }
    const managerCount = getManagerEmails_().length;
    const res = deployReadinessItems_(storage, automation, managerCount);
    return {
      items: res.items, summary: res.summary,
      configTimezone: (storage && storage.configTimezone) || CONFIG.TIMEZONE,
    };
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
    const newSs = createPinnedSpreadsheet_(name);   // pins tz+locale (H-2/M-14 class)
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

    // Share with the calling manager — same L3 rationale as generateExportSheet_.
    try {
      const owner = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
      if (callerEmp.email && String(callerEmp.email).toLowerCase() !== owner) newSs.addEditor(callerEmp.email);
    } catch (shareErr) { console.warn('Export share failed: ' + shareErr.message); }

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

    // F(cycle-8): cap like the submit path's trainingQuestion (cell-size guard).
    const trimmed = String(reply || '').trim().slice(0, 2000);
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
    const msg = String(message || '').trim().slice(0, 2000);   // F(cycle-8): cell-size guard
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
    const trimmed = String(message || '').trim().slice(0, 2000);   // F(cycle-8): cell-size guard
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
  let flagsArr = sanitizeFlagsArray_(p.flags);
  // F(L-13): a legacy/direct-RPC payload with flagType='urgent' and NO flags[]
  // was accepted by validation (F21) and then silently DISCARDED — urgent never
  // enters the FlagType column (INV-37) and nothing folded it into
  // subformData.flags. Fold the lone urgent in so it renders + digests.
  if (flagsArr.length === 0 && s(p.flagType).toLowerCase() === 'urgent') flagsArr = ['urgent'];
  const derivedFromArr = flagsArr.length > 0 ? deriveFlagType_(flagsArr) : '';
  const flagType = derivedFromArr || s(p.flagType).toLowerCase();
  const tagsArr = sanitizeTagsArray_(p.tags);
  // F(M-15): WHITELIST the client-supplied subformData keys. The blob was
  // previously persisted verbatim, so a crafted submit could pre-load a forged
  // manager trainingReply / feedback[] thread (rendered as a real answer in
  // the weekly digest + Q&A and cleared from every "unanswered" queue), or
  // pinned:true bypassing the 3-pin cap setCallNotePinned enforces inside its
  // lock — INV-49/50 were client-honor-system. Only the keys the shipped
  // client actually sends at submit survive; everything else (trainingReply*,
  // feedback[], pinned, formSubmission, externalEmails, …) is written by its
  // own gated server endpoint after submit.
  const rawSub = (p.subformData && typeof p.subformData === 'object') ? p.subformData : null;
  let subformData = null;
  if (rawSub) {
    subformData = {};
    const tq = s(rawSub.trainingQuestion);
    if (tq) subformData.trainingQuestion = tq.slice(0, 2000);
    const cs = Number(rawSub.completionSeconds);
    if (isFinite(cs) && cs > 0) subformData.completionSeconds = Math.round(cs);
    // Cycle-9 M-3: the intake auto-log note's category chip
    // (cnIntakePillHtml_ keys off subformData.intakeType) — the M-15
    // whitelist silently stripped it, so every intake-logged note persisted
    // un-chipped. Bounded enum only; anything else drops.
    const it = s(rawSub.intakeType).toLowerCase();
    if (it === 'ppd' || it === 'pmd' || it === 'pap') subformData.intakeType = it;
    if (Object.keys(subformData).length === 0) subformData = null;
  }
  // Merge tags/flags into subformData so the schema stays in one column
  // (per X5 — no new sheet column). Pin stays in subformData.pinned with
  // its 3-cap, separate from this array.
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
      // Fetch just the known schema width (L-10) — not getLastColumn(), which
      // would pull any stray/human-added trailing columns in the rep's Sheet.
      // All consumers index by CN.* (< CN_HEADERS.length).
      const row = sheet.getRange(rowIndex, 1, 1, CN_HEADERS.length).getValues()[0];
      return { rowIndex: rowIndex, row: row };
    }
  }
  return null;
}

/** Cycle 7 (H-2/M-14 class fix): the ONLY sanctioned way to create a new
 *  spreadsheet. SpreadsheetApp.create() inherits the SCRIPT timezone
 *  (appsscript.json = America/Chicago) and the deployer's default LOCALE —
 *  BOTH have bitten: a tz mismatch shifts every raw coerced Date/time cell
 *  copied into the new sheet (the ADP payroll export, H-2), and a coercing
 *  locale turns stored ISO-T strings into Dates on read (the formTokenCellMs_
 *  / M-14 class). Pin both to the ADP sheet's values so every sheet this app
 *  creates behaves like the stores it mirrors. A Node tripwire forbids bare
 *  SpreadsheetApp.create() calls outside this factory. */
function createPinnedSpreadsheet_(name) {
  const ss = SpreadsheetApp.create(name);
  try {
    const adp = getAdpSS_();
    try { ss.setSpreadsheetTimeZone(adp.getSpreadsheetTimeZone()); } catch (e) {}
    try { ss.setSpreadsheetLocale(adp.getSpreadsheetLocale()); } catch (e) {}
  } catch (e) { /* ADP store unreachable — keep the created sheet usable */ }
  return ss;
}

/** F(M-14): CN Timestamp cells are written "yyyy-MM-dd'T'HH:mm:ss", but a
 *  per-rep sheet whose LOCALE coerces the ISO-T form (the exact class
 *  formTokenCellMs_ exists for — it bit when FORMS_SS_ID moved to the Intake
 *  sheet) returns a Date from getValues(). A raw String() then yields
 *  "Wed Jul 09 2026 …", which silently breaks newest-first sorting, the
 *  /T(\d{2}:\d{2})/ shift-span + EOD time displays, the ambient stale-flag
 *  counter, and FAIL-OPENS the 5-minute delete window (parseTimestampMs_ →
 *  null). Recover a coerced Date back to the as-written T-form digits in the
 *  tz that coerced it (per-rep sheets are pinned to the ADP sheet's tz at
 *  provisioning — INV-110); strings pass through untouched. Same family as
 *  normalizeAuditTs_ / getMyNoteHourBuckets' inline guard. */
function cnTimestampString_(val) {
  if (val instanceof Date) {
    try { return Utilities.formatDate(val, getAdpSS_().getSpreadsheetTimeZone(), "yyyy-MM-dd'T'HH:mm:ss"); }
    catch (e) { return String(val); }
  }
  return String(val || '');
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
    timestamp:        cnTimestampString_(row[CN.TIMESTAMP]),   // F(M-14)
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
  // Email-only semantic borders + accents (2nd-pass email_styling.md). Keep
  // ALL email color on this palette rather than scattering inline literals —
  // that drift is exactly what these replace. Email-safe literal hex (no var()).
  accentBorder: '#abdfc4',
  dangerBorder: '#f3d4d4',
  warnBorder:   '#f0d9a8',
  info:         '#1e63b8',   // link (matches in-app --info)
  star:         '#b7791f',   // preferred-recommendation star (= warn)
  muted2:       '#737c8c',
  muted3:       '#a5acb8',   // N/A / faint
  navyTint:     '#eef2f7',   // navy-soft highlight (Resolution row, default banner)
  // UMS brand navy + pale-blue alternating-row tint. These match the legacy
  // dept-email aesthetic (closeOrderEmail.js, updateOrderEmail.js) so emails
  // sent from the new web app look continuous with the prior tooling.
  brand:        '#223b5d',
  brandSoft:    '#e6f2ff',
  logoUrl:      'https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/UMS%20Presentation%20Logo.jpg',
};

/** Shared branded wrapper for automated notification emails — HYBRID style
 *  (design rev §5): navy wordmark + navy underline rule + a top-right status
 *  dot for the company cue; a soft semantic CHIP (the heading as a mono label),
 *  a warm-paper card, and a mono footer for the Console cue. Email-safe (tables,
 *  inline hex; clients strip <style>/vars). `heading` is esc_'d here; `bodyHtml`
 *  is caller-built and MUST already esc_ any user data (INV-105).
 *  Semantic state is tone-driven: `opts.tone` ∈ success|danger|warn|info, else
 *  reverse-mapped from the legacy `opts.accent` hex, else 'info' (navy). So the
 *  13 existing callers keep their colors with no change. Optional `opts.subLabel`
 *  (header sub-line, default 'Notification') + `opts.ctaUrl`/`opts.ctaLabel`
 *  (green primary action button). */
function buildBrandedEmailHtml_(heading, bodyHtml, opts) {
  opts = opts || {};
  const P = CN_EMAIL_PALETTE;
  const TONES = {
    success: { dot: P.goodDeep,   bg: P.goodSoft,   text: P.goodDeep,   border: P.accentBorder },
    danger:  { dot: P.dangerDeep, bg: P.dangerSoft, text: P.dangerDeep, border: P.dangerBorder },
    warn:    { dot: P.warnDeep,   bg: P.warnSoft,   text: P.warnDeep,   border: P.warnBorder },
    info:    { dot: P.brand,      bg: P.navyTint,   text: P.brand,      border: P.line },
  };
  const ACCENT_TONE = {};
  ACCENT_TONE[P.accent] = 'success'; ACCENT_TONE[P.good] = 'success';
  ACCENT_TONE[P.goodDeep] = 'success'; ACCENT_TONE[P.accentDeep] = 'success';
  ACCENT_TONE[P.danger] = 'danger'; ACCENT_TONE[P.dangerDeep] = 'danger';
  ACCENT_TONE[P.warn] = 'warn'; ACCENT_TONE[P.warnDeep] = 'warn';
  ACCENT_TONE[P.brand] = 'info';
  const tone = TONES[opts.tone] ? opts.tone : ((opts.accent && ACCENT_TONE[opts.accent]) || 'info');
  const T = TONES[tone];
  const subLabel = opts.subLabel || 'Notification';
  const cta = (opts.ctaUrl && opts.ctaLabel)
    ? '<tr><td style="padding:4px 22px 18px;"><a href="' + esc_(opts.ctaUrl) + '" style="display:inline-block;' +
        'font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;background:' + P.accent +
        ';text-decoration:none;border-radius:8px;padding:10px 18px;">' + esc_(opts.ctaLabel) + ' &#8594;</a></td></tr>'
    : '';
  return (
    '<div style="margin:0;padding:0;background:' + P.paper + ';">' +
    '<div style="max-width:600px;margin:0 auto;padding:20px 12px;font-family:Arial,Helvetica,sans-serif;color:' + P.ink + ';">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + P.paperCard +
        ';border:1px solid ' + P.line + ';border-radius:10px;overflow:hidden;">' +
        // navy wordmark + navy underline rule + semantic status dot (company cue)
        '<tr><td style="padding:18px 22px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
          '<td style="border-bottom:2px solid ' + P.brand + ';padding-bottom:12px;">' +
            '<span style="font-size:14px;font-weight:700;letter-spacing:.5px;color:' + P.brand + ';">UMS</span>' +
            '<span style="font-size:14px;color:' + P.muted2 + ';">&nbsp;Team Tools</span>' +
            '<div style="font-family:\'Courier New\',monospace;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:' + P.muted3 + ';margin-top:4px;">' + esc_(subLabel) + '</div>' +
          '</td>' +
          '<td align="right" style="border-bottom:2px solid ' + P.brand + ';padding-bottom:12px;vertical-align:bottom;">' +
            '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + T.dot + ';"></span></td>' +
        '</tr></table></td></tr>' +
        // soft semantic chip — heading as a mono micro-label (app cue)
        '<tr><td style="padding:16px 22px 2px;">' +
          '<table role="presentation" cellpadding="0" cellspacing="0" style="background:' + T.bg +
            ';border-left:4px solid ' + T.dot + ';border-radius:6px;"><tr><td style="padding:10px 14px;">' +
            '<span style="font-family:\'Courier New\',monospace;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:' + T.text + ';">' + esc_(heading) + '</span>' +
          '</td></tr></table></td></tr>' +
        // body card
        '<tr><td style="padding:12px 22px 6px;font-size:14px;line-height:1.55;color:' + P.ink + ';">' + bodyHtml + '</td></tr>' +
        cta +
        // mono footer
        '<tr><td style="padding:6px 22px 18px;"><div style="border-top:1px solid ' + P.line +
          ';padding-top:12px;font-family:\'Courier New\',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:' + P.muted3 + ';">Automated · do not reply</div></td></tr>' +
      '</table>' +
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

    // Auto-track this dept email as an inter-department request. A5: if this same
    // note was already sent to this same dept and that request is still OPEN,
    // REUSE its token (a re-send re-notifies the dept; it must not open a second
    // request) — else mint a new token. The lookup is best-effort (a throw falls
    // back to a fresh token, never failing the send). The "Mark resolved" CTA is
    // appended to the SENT body ONLY, AFTER the INV-41 hash check, so the
    // preview/hash contract is untouched. The PHI-free DeptRequests row is logged
    // below, after the send succeeds (only when this is a NEW request).
    // F(M-16): request-track ONLY sends that include a REAL internal
    // department. 'Other' is the free-text (possibly customer/external)
    // recipient path — tracking those (a) mailed an external recipient an
    // internal "Mark this request resolved" button that dead-ends at a Google
    // login wall on this domain-restricted deployment, and (b) opened an
    // 'Other' row no department desk would ever resolve, riding the daily SLA
    // digest as perpetual overdue noise.
    const drTrackable = selections.departments.some(function (d) { return d !== 'Other'; });
    const drDeptKey = selections.departments.join(', ');
    let drExistingId = null;
    if (drTrackable) {
      try { drExistingId = drFindOpenRequest_(noteId, drDeptKey); } catch (e) { drExistingId = null; }
    }
    const drId = drExistingId || Utilities.getUuid();
    const drResolveUrl = getWebAppExecUrl_() + '?resolve=' + encodeURIComponent(drId);
    const sentHtml = htmlBody + (drTrackable ? drResolveCtaHtml_(drResolveUrl) : '');

    // Send first. If MailApp throws, nothing is stamped and the rep sees a clean failure.
    // F(cycle-8): on a MIXED send (real department + 'Other') the resolve
    // token — a credential (serveResolvePage_) — must not leave the org: the
    // internal copy carries the CTA, the 'Other' (possibly customer/external)
    // recipient gets the identical body WITHOUT it. The F(M-16) fix only
    // suppressed tracking for 'Other'-ONLY sends, so mixed sends mailed the
    // token to the external address. Internal goes first: if the external
    // copy then fails, a rep re-send duplicates a dept email (annoying),
    // never the customer's.
    const splitCta = drTrackable && recipientList.externalTo;
    try {
      if (splitCta) {
        MailApp.sendEmail({
          to: recipientList.internalTo,
          cc: CONFIG.CALL_NOTES.CC_EMAIL,
          subject,
          body: textBody + '\n\nMark this request resolved: ' + drResolveUrl,
          htmlBody: sentHtml,
        });
        MailApp.sendEmail({
          to: recipientList.externalTo,
          cc: CONFIG.CALL_NOTES.CC_EMAIL,
          subject,
          body: textBody,
          htmlBody: htmlBody,   // no CTA
        });
      } else {
        MailApp.sendEmail({
          to: recipientList.to,
          cc: CONFIG.CALL_NOTES.CC_EMAIL,
          subject,
          body: textBody + (drTrackable ? ('\n\nMark this request resolved: ' + drResolveUrl) : ''),
          htmlBody: sentHtml,
        });
      }
    } catch (sendErr) {
      return { success: false, error: 'Email send failed' + (splitCta ? ' (one of the two copies may have gone out — check before re-sending)' : '') + ': ' + sendErr.message };
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

    // Auto-log the inter-department request (best-effort — never fails the send).
    // PHI-free: the row carries the dept label + the update CATEGORY + the source
    // noteId only; the subject (patient/TRX) and note content never enter it.
    // A5: append a NEW open row ONLY when this isn't a re-send of an already-open
    // (note, dept) request — a re-send reuses the prior token (drExistingId), so
    // we skip the append and just audit the re-notification. Surfaced in
    // Metrics → Dept Requests with elapsed/resolution-time tracking.
    try {
      if (drTrackable && !drExistingId) {   // F(M-16): 'Other'-only sends are never tracked
        getOrCreateDeptRequestsSheet_().appendRow([
          drId, emp.id, emp.name, emp.email || getActiveUserEmail_() || '',
          deptLabel, drRecipientDomains_(recipientList.to), drNowTs_(), 'open', '', '',
          // F(L-11): the label is free-typed (datalist-SUGGESTED) — cap it so
          // a long paste (which could carry patient identifiers) can't ride
          // into the PHI-free store / the dept inbox / the SLA digest whole.
          String(selections.updateInfo || 'Call note email').slice(0, 80), noteId,
        ]);
      }
      if (drTrackable) writeAuditLog_(emp, 'DeptRequestSent', note.dateLocal, '', false, 0,
        'reqId=' + drId + '; dept=' + (deptLabel || '(none)') + (drExistingId ? '; resend' : ''));
    } catch (drErr) {
      console.warn('emailFromCallNote: dept-request auto-log failed (noteId=' +
        noteId + '): ' + drErr.message);
    }

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
  const out = [], internal = [], external = [];
  for (let i = 0; i < selections.departments.length; i++) {
    const dept = selections.departments[i];
    if (dept === 'Other') {
      out.push(selections.individualEmail);
      external.push(selections.individualEmail);
    } else {
      const addr = map[dept];
      if (!addr) return { error: 'Unknown department: ' + dept };
      out.push(addr);
      internal.push(addr);
    }
  }
  // F(cycle-8): `to` is unchanged (the INV-41 hash is computed over it);
  // internalTo/externalTo are ADDITIVE splits so emailFromCallNote can keep
  // the resolve-token CTA off the 'Other' (possibly customer/external) copy.
  return { to: out.join(', '), internalTo: internal.join(', '), externalTo: external.join(', ') };
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
  let tplSoft  = P.navyTint;   // 2nd-pass: default banner soft = navy-tint #eef2f7
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
    // 2nd-pass email_styling.md: the Resolution row is highlighted IN PLACE
    // (navy-tint bg + a navy left-rail on the label cell) rather than split out.
    const isResolution = r[0] === 'Resolution';
    const bg = isResolution ? P.navyTint : ((i % 2 === 0) ? P.paperCard : P.brandSoft);
    const weight = r[2] ? 'font-weight:600;' : '';
    const labelExtra = isResolution ? `border-left:3px solid ${P.brand};` : '';
    return `<tr style="background:${bg};">` +
      `<td style="padding:9px 12px;border-top:1px solid ${P.line};font-weight:600;width:34%;color:${P.brand};${labelExtra}">${r[0]}</td>` +
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

// FormSubmissions tab schema. Cols 6–10 added by the forms-hardening pass
// (tamper hash + stored consent + Certificate of Completion). TRAILING columns
// — existing 6-col rows read back with the new fields undefined, handled
// gracefully; freshly-provisioned sheets (e.g. the segregated FORMS_SS_ID)
// carry the full header. Same back-compat discipline as CN_HEADERS.
const FS = {
  TOKEN:0, FORM_TYPE:1, RECIPIENT_EMAIL:2, SUBMITTED_AT:3,
  FORM_DATA:4, SIGNATURE_DATA:5,
  SUBMISSION_HASH:6, CONSENT_VERSION:7, CONSENT_AT:8, OPENED_AT:9, CERTIFICATE:10,
};
const FS_HEADERS = [
  'Token','FormType','RecipientEmail','SubmittedAt',
  'FormData','SignatureData',
  'SubmissionHash','ConsentVersion','ConsentAt','OpenedAt','Certificate',
];

// ── Valid interactive form type IDs (subset of FORM_CATALOG) ─────────
const INTERACTIVE_FORM_TYPES = ['eaa', 'pt-ot-rx', 'seating-eval'];

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
    sheet.appendRow(FT_HEADERS);
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

  // Audit row logs only the recipient DOMAIN — same PII/PHI minimization as
  // the ExternalEmailSent row (a customer's personal address is PII; for a
  // patient it can be PHI-adjacent). The full recipient lives on the
  // FormTokens row itself, reachable via the token for an investigator.
  writeAuditLog_(emp, 'FormTokenCreated', '', '', false, 0,
    'token=' + token + '; formType=' + formType +
    '; toDomain=' + intakeEmailDomain_(recipientEmail) +
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
      try { sheet.getRange(located.rowIndex, FT.STATUS + 1).setValue('expired'); } catch (_) {}
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

    // Check expiration (coercion-safe; see formTokenCellMs_ — fail CLOSED on a
    // non-empty unparseable expiry, S2.1, so a PHI submission is never accepted
    // against a tampered token).
    const expSF = formTokenCellMs_(row[FT.EXPIRES_AT]);
    // Fail CLOSED on an ABSENT expiry too (F cycle-8) — never accept an
    // anonymous PHI submission against a token with no expiry (blank = only
    // corruption / migration; ExpiresAt is written atomically at creation).
    if (!expSF.present || expSF.ms == null || Date.now() > expSF.ms) {
      tokenSheet.getRange(located.rowIndex, FT.STATUS + 1).setValue('expired');
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
    const openedAt = String(meta.openedAt || '');
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
    submissionsSheet.appendRow([
      token, formType, recipientEmail, submittedAt,
      dataJson,
      signatureData,
      submissionHash, consentVersion, consentAt, openedAt, certificate,
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
      writeAuditLog_(auditEmp, 'FormSubmissionReceived', '', '', false, 0,
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
      recomputedHash: recomputed, submittedAt: String(row[FS.SUBMITTED_AT] || '') };
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
      submittedAt: String(sRow[FS.SUBMITTED_AT] || ''),
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

/** Cold-archive window: days from CN_NOTE_ARCHIVE_DAYS Script Property first,
 *  else CONFIG.CALL_NOTES.NOTE_ARCHIVE_DAYS. 0/neg/unparseable → 0 (disabled).
 *  Mirrors getNoteRetentionDays_. */
function getNoteArchiveDays_() {
  const prop = PropertiesService.getScriptProperties().getProperty('CN_NOTE_ARCHIVE_DAYS');
  const raw = (prop != null && prop !== '') ? prop : (CONFIG.CALL_NOTES.NOTE_ARCHIVE_DAYS || 0);
  const v = parseInt(raw, 10);
  return (isNaN(v) || v < 0) ? 0 : v;
}

/** Returns the cold-archive tab (CONFIG.CALL_NOTES.ARCHIVE_TAB) in the given
 *  per-rep spreadsheet, creating it with the canonical CN_HEADERS on first use.
 *  Same schema as the live Notes tab so an archived row round-trips identically
 *  (and stays readable by callNoteRowToObject_ if ever needed). */
function getOrCreateNotesArchiveTab_(ss) {
  const name = CONFIG.CALL_NOTES.ARCHIVE_TAB;
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(CN_HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, CN_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

/** Move rows older than cutoffMs from srcSheet to archiveSheet (preserving the
 *  full row), then delete them from srcSheet. APPEND-then-delete so a mid-run
 *  failure can only DUPLICATE into the cold archive (never lose) — the source
 *  still has the row, so the next run re-archives + deletes it. Batched append
 *  (one setValues block) + bottom-up delete. Returns the count moved. Mirrors
 *  purgeSheetRowsOlderThan_ but is NON-destructive (data preserved).
 *  opts (#7, INV-153 — optional, defaults preserve the CN call sites exactly):
 *    headerRows — data starts after this many header rows (default 1; the ADP
 *                 Timesheet has TWO). A non-date header cell is also skipped by
 *                 the parseRetentionDateMs_ null-guard, so this is belt+braces.
 *    width      — normalize moved rows to this column width (default
 *                 CN_HEADERS.length, the original hardcoded behavior). */
function archiveSheetRowsOlderThan_(srcSheet, archiveSheet, dateColIdx, cutoffMs, opts) {
  opts = opts || {};
  const headerRows = opts.headerRows || 1;
  const lastRow = srcSheet.getLastRow();
  if (lastRow < headerRows + 1) return 0;
  const rows = srcSheet.getDataRange().getValues();
  const toMoveRows = [];   // full row values, in sheet order
  const toDelete = [];     // 1-based sheet row indices
  for (let i = headerRows; i < rows.length; i++) {
    const ms = parseRetentionDateMs_(rows[i][dateColIdx]);
    if (ms !== null && ms < cutoffMs) { toMoveRows.push(rows[i]); toDelete.push(i + 1); }
  }
  if (!toMoveRows.length) return 0;
  // Normalize every moved row to the archive's column width (live rows may be
  // narrower/wider than the canonical header for legacy reasons; setValues
  // needs a uniform rectangle).
  const width = opts.width || CN_HEADERS.length;
  const block = toMoveRows.map(function (r) {
    const out = new Array(width);
    for (let c = 0; c < width; c++) out[c] = (c < r.length) ? r[c] : '';
    return out;
  });
  archiveSheet.getRange(archiveSheet.getLastRow() + 1, 1, block.length, width).setValues(block);
  SpreadsheetApp.flush();   // ensure the archive write lands before we delete the source
  for (let j = toDelete.length - 1; j >= 0; j--) srcSheet.deleteRow(toDelete[j]);
  return toMoveRows.length;
}

/** Cold-archive tier for call-note retention (the SAFE alternative to the
 *  irreversible purgeOldCallNotes). Across every enrolled rep's per-rep Sheet,
 *  MOVES Notes rows older than the archive window into a NotesArchive tab in the
 *  SAME spreadsheet — data is preserved (the canonical record stays), the LIVE
 *  Notes tab is bounded (faster open-ended scans), and no new operator store is
 *  needed. DISABLED by default (CN_NOTE_ARCHIVE_DAYS / CONFIG = 0). Top-level
 *  (time-trigger target) → reachable via google.script.run, so gated like the
 *  other trigger handlers (assertManagerCaller_); locked (INV-01). A broken
 *  per-rep Sheet is skipped, not fatal. Dates read from CN.DATE_LOCAL
 *  (Sheets-coerced; parseRetentionDateMs_ handles it). Writes a PHI-free
 *  CallNotesArchive audit row with counts.
 *
 *  OPERATOR ORDERING: if BOTH archive and purge are enabled, keep
 *  CN_NOTE_ARCHIVE_DAYS ≤ CN_NOTE_RETENTION_DAYS — the 3am archive runs before
 *  the 4am purge, so the safe path is archive-first. The recommended setup is
 *  archive-only (leave retention/purge at 0): bounded live tab, full history
 *  retained in NotesArchive. */
function archiveOldCallNotes() {
  assertManagerCaller_('archiveOldCallNotes');
  try {
    const days = getNoteArchiveDays_();
    if (!days) {
      Logger.log('archiveOldCallNotes: archival disabled (CN_NOTE_ARCHIVE_DAYS=0) — nothing archived.');
      return;
    }
    const cutoffMs = Date.now() - days * 86400000;
    const roster = getEmployeeRosterRows_();
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    let repsTouched = 0, notesArchived = 0;
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
          const live = getCallNotesSheet_(emp);
          const archive = getOrCreateNotesArchiveTab_(live.getParent());
          const moved = archiveSheetRowsOlderThan_(live, archive, CN.DATE_LOCAL, cutoffMs);
          if (moved > 0) { notesArchived += moved; repsTouched++; }
        } catch (e) {
          Logger.log('archiveOldCallNotes: skipped rep ' + emp.id + ': ' + e.message);
        }
      }
    } finally {
      lock.releaseLock();
    }
    writeAuditLog_(_SYSTEM_AUDIT_EMP_, 'CallNotesArchive', '', '', false, 0,
      `archiveDays=${days}; repsTouched=${repsTouched}; notesArchived=${notesArchived}`);
    Logger.log(`archiveOldCallNotes: moved ${notesArchived} note(s) across ${repsTouched} rep(s) older than ${days} day(s) to ${CONFIG.CALL_NOTES.ARCHIVE_TAB}.`);
  } catch (err) {
    Logger.log('archiveOldCallNotes failed: ' + err.message);
  }
}

// ── Timesheet cold-archive tier (#7, INV-153) ───────────────────────────────
// Every store had a retention/archive story EXCEPT the Timesheet itself — it
// grew unboundedly while getManagerDashboard / the exports / the calendars
// read it whole (getDataRange), so dashboard opens slow down year over year.
// This is the CN cold-tier model applied to the payroll tab: rows older than
// the window MOVE (never delete — payroll is keep-forever) to a
// TimesheetArchive tab in the SAME ADP spreadsheet via the shared
// archiveSheetRowsOlderThan_ (append-then-delete + flush: a mid-run failure
// can only duplicate into the archive, never lose a payroll row).
const TIMESHEET_ARCHIVE_TAB = 'TimesheetArchive';
// Floor: the live tab must always retain every ACTIVE window — adjustments
// (ADJUST_WINDOW_DAYS 30), manager day-edit/delete, the current export period
// (≤ ~31d), dashboard trends (14d) — with generous margin. A configured window
// below this clamps UP (never down to "archive more"), so an operator typo
// like 7 can never rip current-period payroll rows out of the live tab.
const TIMESHEET_ARCHIVE_MIN_DAYS = 120;

/** Archive window in days: Script Property TIMESHEET_ARCHIVE_DAYS first, else
 *  CONFIG.TIMESHEET_ARCHIVE_DAYS. 0/neg/unparseable → 0 (disabled). A value in
 *  (0, TIMESHEET_ARCHIVE_MIN_DAYS) clamps UP to the floor (logged). */
function getTimesheetArchiveDays_() {
  const prop = PropertiesService.getScriptProperties().getProperty('TIMESHEET_ARCHIVE_DAYS');
  const raw = (prop != null && prop !== '') ? prop : (CONFIG.TIMESHEET_ARCHIVE_DAYS || 0);
  const v = parseInt(raw, 10);
  if (isNaN(v) || v <= 0) return 0;
  if (v < TIMESHEET_ARCHIVE_MIN_DAYS) {
    Logger.log('TIMESHEET_ARCHIVE_DAYS=' + v + ' is below the ' + TIMESHEET_ARCHIVE_MIN_DAYS +
      '-day safety floor — clamped up (active payroll windows must stay live).');
    return TIMESHEET_ARCHIVE_MIN_DAYS;
  }
  return v;
}

/** The TimesheetArchive tab in the ADP spreadsheet, created on first use by
 *  COPYING the live Timesheet's two-row header (the ADP-format shape the
 *  export also copies) so archived rows read identically for payroll audit. */
function getOrCreateTimesheetArchiveTab_(ss, liveSheet) {
  let sheet = ss.getSheetByName(TIMESHEET_ARCHIVE_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(TIMESHEET_ARCHIVE_TAB);
    const width = Math.max(liveSheet.getLastColumn(), 9);
    sheet.getRange(1, 1, 2, width).setValues(liveSheet.getRange(1, 1, 2, width).getValues());
    sheet.getRange(1, 1, 1, width).setFontWeight('bold');
    sheet.setFrozenRows(2);
  }
  return sheet;
}

/** Timesheet cold-archive (#7, INV-153). MOVES Timesheet rows older than the
 *  window into TimesheetArchive (same spreadsheet — same payroll/PHI boundary,
 *  no new operator store); NOTHING is ever deleted from the archive (payroll
 *  is keep-forever — there is deliberately NO purge tier here, unlike the CN
 *  3-tier model). DISABLED by default (TIMESHEET_ARCHIVE_DAYS / CONFIG = 0),
 *  so installing the trigger is harmless. Top-level (time-trigger target) →
 *  reachable via google.script.run, so gated like the other trigger handlers
 *  (assertManagerCaller_, INV-44); locked (INV-01 — it mutates the payroll
 *  tab, and holding the lock makes concurrent punch writes wait out the move).
 *  Dates read from ADP.DATE (Sheets-coerced; parseRetentionDateMs_ handles
 *  Date cells + 'yyyy-MM-dd' strings; the Timesheet's APPEND order — NOT date
 *  order, back-fills land late — is fine because the helper scans every row).
 *  Archived rows leave the in-app surfaces (old-month calendar/timesheet views
 *  read the live tab only) but stay in the archive tab for payroll audit; the
 *  ≥120-day floor keeps every ACTIVE window (adjust/export/dashboard) live.
 *  Writes a PHI-free TimesheetArchive audit row with counts. */
function archiveOldTimesheetRows() {
  assertManagerCaller_('archiveOldTimesheetRows');
  try {
    const days = getTimesheetArchiveDays_();
    if (!days) {
      Logger.log('archiveOldTimesheetRows: archival disabled (TIMESHEET_ARCHIVE_DAYS=0) — nothing archived.');
      return;
    }
    const cutoffMs = Date.now() - days * 86400000;
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    let moved = 0;
    try {
      const ss = getAdpSS_();
      const live = ss.getSheetByName(CONFIG.ADP_TAB);
      if (!live) { Logger.log('archiveOldTimesheetRows: no Timesheet tab.'); return; }
      const archive = getOrCreateTimesheetArchiveTab_(ss, live);
      moved = archiveSheetRowsOlderThan_(live, archive, ADP.DATE, cutoffMs,
        { headerRows: 2, width: Math.max(live.getLastColumn(), 9) });
    } finally {
      lock.releaseLock();
    }
    // Written on every ENABLED run (the CN archive convention) — a zero-moved
    // row is the Automation Health "last seen" heartbeat proving the job ran.
    writeAuditLog_(_SYSTEM_AUDIT_EMP_, 'TimesheetArchive', '', '', false, 0,
      `archiveDays=${days}; rowsArchived=${moved}`);
    Logger.log(`archiveOldTimesheetRows: moved ${moved} row(s) older than ${days} day(s) to ${TIMESHEET_ARCHIVE_TAB}.`);
  } catch (err) {
    Logger.log('archiveOldTimesheetRows failed: ' + err.message);
  }
}

/** 3rd-tier cold-store retention window: days from CN_ARCHIVE_RETENTION_DAYS
 *  Script Property first, else CONFIG.CALL_NOTES.ARCHIVE_RETENTION_DAYS.
 *  0/neg/unparseable → 0 (disabled). Mirrors getNoteRetentionDays_. */
function getArchiveRetentionDays_() {
  const prop = PropertiesService.getScriptProperties().getProperty('CN_ARCHIVE_RETENTION_DAYS');
  const raw = (prop != null && prop !== '') ? prop : (CONFIG.CALL_NOTES.ARCHIVE_RETENTION_DAYS || 0);
  const v = parseInt(raw, 10);
  return (isNaN(v) || v < 0) ? 0 : v;
}

/** 3rd-tier retention: irreversibly delete rows from each rep's NotesArchive
 *  (cold store) older than CN_ARCHIVE_RETENTION_DAYS, so the cold archive
 *  doesn't grow forever. This is the ONLY mechanism that deletes archived
 *  notes (archiveOldCallNotes MOVES into the archive; purgeOldCallNotes never
 *  touches it). Top-level (time-trigger target) → reachable via
 *  google.script.run, so gated like the other destructive trigger handlers
 *  (assertManagerCaller_); locked (INV-01). DISABLED by default
 *  (CN_ARCHIVE_RETENTION_DAYS / CONFIG = 0); the delete is irreversible and the
 *  notes are PHI. READ-ONLY w.r.t. the tab's existence — it never creates a
 *  NotesArchive tab (a rep with no archive is simply skipped). Dates read from
 *  CN.DATE_LOCAL (the archived row keeps its original date). Cross-rep; a broken
 *  Sheet is skipped. Writes a PHI-free CallNotesArchivePurge audit row.
 *
 *  OPERATOR: keep CN_ARCHIVE_RETENTION_DAYS ≥ CN_NOTE_ARCHIVE_DAYS — it's the
 *  cold-store lifetime, longer than the move window. Scheduled at manager-tz 2am
 *  (before the 3am archive) so it operates on yesterday's settled archive. */
function purgeArchivedCallNotes() {
  assertManagerCaller_('purgeArchivedCallNotes');
  try {
    const days = getArchiveRetentionDays_();
    if (!days) {
      Logger.log('purgeArchivedCallNotes: archive retention disabled (CN_ARCHIVE_RETENTION_DAYS=0) — nothing purged.');
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
          // Read-only existence check — never create the archive tab here.
          const archive = getCallNotesSheet_(emp).getParent().getSheetByName(CONFIG.CALL_NOTES.ARCHIVE_TAB);
          if (!archive) continue;
          const removed = purgeSheetRowsOlderThan_(archive, CN.DATE_LOCAL, cutoffMs);
          if (removed > 0) { notesRemoved += removed; repsTouched++; }
        } catch (e) {
          Logger.log('purgeArchivedCallNotes: skipped rep ' + emp.id + ': ' + e.message);
        }
      }
    } finally {
      lock.releaseLock();
    }
    writeAuditLog_(_SYSTEM_AUDIT_EMP_, 'CallNotesArchivePurge', '', '', false, 0,
      `archiveRetentionDays=${days}; repsTouched=${repsTouched}; notesRemoved=${notesRemoved}`);
    Logger.log(`purgeArchivedCallNotes: removed ${notesRemoved} archived note(s) across ${repsTouched} rep(s) older than ${days} day(s).`);
  } catch (err) {
    Logger.log('purgeArchivedCallNotes failed: ' + err.message);
  }
}

/** #8 — manager-triggered reconcile pass. Scans every enrolled rep's Notes tab
 *  for HAND-ENTERED rows (content present but no noteId — typed directly into
 *  the Sheet, not via the app) and backfills the fields the app needs to treat
 *  them as first-class: a UUID noteId, a Timestamp, and a yyyy-MM-dd DateLocal
 *  (derived from whatever the human supplied, else the rep-tz now/today).
 *  Idempotent — a row with a noteId is skipped, so re-running is a no-op.
 *  Manager-gated + locked; per-rep Sheet failures are skipped. Content fields
 *  are NEVER modified. Writes a CallNotesReconcile audit row. */
function reconcileCallNotes() {
  // F1/F2 — this is a DAILY TRIGGER handler (runs as the installer) AS WELL AS a
  // manual Admin-tab button, so it MUST use the MANAGER_EMAILS trigger-handler
  // gate (assertManagerCaller_, the INV-44 idiom), NOT emp.isAdmin: under a
  // narrowed ADMIN_EMAILS, or a MANAGER_EMAILS installer who isn't a roster
  // employee, an admin/roster gate silently no-ops the nightly reconcile (INV-109).
  assertManagerCaller_('reconcileCallNotes');
  const callerEmp = getEmployeeInfo_() || _SYSTEM_AUDIT_EMP_;
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const roster = getEmployeeRosterRows_();
    const CONTENT_COLS = [CN.CALLBACK, CN.CALLER, CN.RELATIONSHIP, CN.PATIENT_TRX, CN.ISSUE, CN.TRANSFERRED_TO, CN.RESOLUTION];
    let repsTouched = 0, rowsBackfilled = 0;
    for (let r = 1; r < roster.length; r++) {
      const sheetIdRaw = roster[r][EMP.CALL_NOTES_SHEET_ID];
      if (!sheetIdRaw || !String(sheetIdRaw).trim()) continue;
      const emp = {
        id: String(roster[r][EMP.ID]).trim(),
        name: String(roster[r][EMP.NAME]).trim(),
        callNotesSheetId: String(sheetIdRaw).trim(),
        timezone: String(roster[r][EMP.TIMEZONE] || '').trim() || CONFIG.TIMEZONE,
      };
      try {
        const sheet = getCallNotesSheet_(emp);
        const lastRow = sheet.getLastRow();
        if (lastRow < 2) continue;
        const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
        const tz = safeTimezone_(emp.timezone);
        let repBackfilled = 0;
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          if (String(row[CN.NOTE_ID] || '').trim()) continue;   // app-created → skip
          const hasContent = CONTENT_COLS.some(function (c) { return String(row[c] || '').trim(); });
          if (!hasContent) continue;                             // blank row → skip
          const rowIndex = i + 2;
          const tsHadValue = !!(String(row[CN.TIMESTAMP] || '').trim() || (row[CN.TIMESTAMP] instanceof Date));
          let dateLocal = normalizeDate_(row[CN.DATE_LOCAL]);    // '' if blank; handles Date coercion
          let timestamp = (row[CN.TIMESTAMP] instanceof Date)
            ? Utilities.formatDate(row[CN.TIMESTAMP], tz, "yyyy-MM-dd'T'HH:mm:ss")
            : String(row[CN.TIMESTAMP] || '').trim();
          if (!dateLocal && timestamp) dateLocal = timestamp.substring(0, 10);
          if (!dateLocal) dateLocal = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
          if (!timestamp) timestamp = dateLocal + 'T12:00:00';
          sheet.getRange(rowIndex, CN.NOTE_ID + 1).setValue(Utilities.getUuid());
          if (!tsHadValue) sheet.getRange(rowIndex, CN.TIMESTAMP + 1).setValue(timestamp);
          if (!normalizeDate_(row[CN.DATE_LOCAL])) sheet.getRange(rowIndex, CN.DATE_LOCAL + 1).setValue(dateLocal);
          repBackfilled++;
        }
        if (repBackfilled > 0) { rowsBackfilled += repBackfilled; repsTouched++; }
      } catch (e) {
        Logger.log('reconcileCallNotes: skipped rep ' + emp.id + ': ' + e.message);
      }
    }
    writeAuditLog_(callerEmp, 'CallNotesReconcile', '', '', false, 0,
      `repsTouched=${repsTouched}; rowsBackfilled=${rowsBackfilled}`, callerEmp.email);
    return { success: true, repsTouched: repsTouched, rowsBackfilled: rowsBackfilled };
  } catch (err) { return { error: err.message }; }
  finally { lock.releaseLock(); }
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
    'purgeArchivedCallNotes',
    'archiveOldCallNotes',
    'purgeOldCallNotes',
    'reconcileCallNotes',
    'sendTrainingOverdueDigest',
    'sendAutomationHealthDigest',
    'sendDeptRequestReminderDigest',
    'sendManagerDailyBrief',
    'archiveOldTimesheetRows',
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
  // 3rd-tier cold-store purge — irreversibly deletes NotesArchive rows past the
  // archive-retention window. No-ops while CN_ARCHIVE_RETENTION_DAYS=0 (the
  // default). Staggered to 2am, BEFORE the 3am archive, so it operates on the
  // settled cold store from prior runs.
  ScriptApp.newTrigger('purgeArchivedCallNotes')
    .timeBased().atHour(2).everyDays(1)
    .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
  // Cold-archive tier (SAFE retention) — moves old notes to a NotesArchive tab
  // (data preserved, live tab bounded). No-ops while CN_NOTE_ARCHIVE_DAYS=0 (the
  // default), so installing it is harmless. Staggered to 3am, BEFORE the 4am
  // purge, so if both are enabled the safe archive-first ordering holds.
  ScriptApp.newTrigger('archiveOldCallNotes')
    .timeBased().atHour(3).everyDays(1)
    .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
  // Rolling note retention (item 7) — also no-ops while CN_NOTE_RETENTION_DAYS=0
  // (the default), so installing it is harmless. Staggered to 4am so the two
  // destructive purges don't overlap.
  ScriptApp.newTrigger('purgeOldCallNotes')
    .timeBased().atHour(4).everyDays(1)
    .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
  // Two-way Sheets reconcile (item 8) — back-fills NoteId/Timestamp/DateLocal on
  // rows added directly in a rep's Sheet outside the app. Non-destructive (never
  // touches content cells) + idempotent (skips rows already stamped), so the
  // daily run is harmless. Staggered to 5am, after the purges.
  ScriptApp.newTrigger('reconcileCallNotes')
    .timeBased().atHour(5).everyDays(1)
    .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
  // Training & Employee Docs overdue digest (T4) — daily manager-tz 7am.
  // Org-wide overdue training + per-manager team-scoped overdue unsigned docs.
  // Sends nothing to a manager with nothing overdue in their scope.
  ScriptApp.newTrigger('sendTrainingOverdueDigest')
    .timeBased().atHour(7).everyDays(1)
    .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
  // Automation-FAILURE push (manager-tz 9am, AFTER the nightly jobs + digests so
  // the report reflects their latest runs). Emails MANAGER_EMAILS ONLY when a
  // check is failing (stale heartbeat / stale reconcile / sync-fails / CDR down);
  // silent when healthy. Turns a silently-dead nightly trigger (the F1 class)
  // into a push instead of relying on a manager opening the Health panel.
  ScriptApp.newTrigger('sendAutomationHealthDigest')
    .timeBased().atHour(9).everyDays(1)
    .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
  // DeptRequests v2 — daily manager-tz 10am reminder of OPEN dept requests past
  // their SLA (manager summary; silent when none).
  ScriptApp.newTrigger('sendDeptRequestReminderDigest')
    .timeBased().atHour(10).everyDays(1)
    .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
  // Consolidated manager daily brief (#2, INV-151) — daily manager-tz 8am.
  // No-ops (heartbeat only) while the managerDailyBrief flag is off, so
  // installing it is harmless; when the flag is on it replaces the separate
  // daily manager emails those handlers suppress.
  ScriptApp.newTrigger('sendManagerDailyBrief')
    .timeBased().atHour(8).everyDays(1)
    .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
  // Timesheet cold-archive (#7, INV-153) — daily manager-tz 6pm. F(cycle-8):
  // moved OFF the 1am slot — 1am CT is ~11:30am IST / ~2pm PHT, the middle of
  // both offshore shifts, and the move holds the global ScriptLock while it
  // deletes rows one at a time (a large first enabled run could starve
  // concurrent recordPunch calls past their 15s waitLock). 6pm CT sits in the
  // all-team quiet window (CST shift ended; offshore shifts not yet started).
  // MOVES (never deletes) Timesheet rows older than TIMESHEET_ARCHIVE_DAYS to
  // the TimesheetArchive tab; no-ops while the window is 0 (the default), so
  // installing it is harmless.
  ScriptApp.newTrigger('archiveOldTimesheetRows')
    .timeBased().atHour(18).everyDays(1)
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
    'purgeArchivedCallNotes',
    'archiveOldCallNotes',
    'purgeOldCallNotes',
    'reconcileCallNotes',
    'sendTrainingOverdueDigest',
    'sendAutomationHealthDigest',
    'sendDeptRequestReminderDigest',
    'sendManagerDailyBrief',
    'archiveOldTimesheetRows',
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

/** Missed-clock-out detection ("yesterday" in each rep's OWN tz at call time),
 *  factored from sendDailyMissedPunchAlerts so the consolidated daily brief
 *  (#2, INV-151) shares ONE computation with the standalone alert run.
 *  Read-only. Returns [{ id, name, email, timezone, yesterdayStr }]. */
function computeMissedClockOuts_() {
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
  return missed;
}

function sendDailyMissedPunchAlerts() {
  // Trigger handlers are top-level (required for time-based triggers) and
  // therefore reachable via google.script.run. Gate on caller-is-manager so a
  // logged-in rep can't fire this from the client. In a trigger context,
  // Session.getActiveUser() returns the installer (always a manager via
  // installAutomationTriggers' own check), so the gate is a no-op for triggers.
  assertManagerCaller_('sendDailyMissedPunchAlerts');
  try {
    const missed = computeMissedClockOuts_();
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

    // #2 (INV-151): while the consolidated daily brief is on, the manager
    // summary rides the 8am brief instead — the EMPLOYEE reminders above are
    // never suppressed (the rep still needs the nudge to fix their punch).
    // F(cycle-8 M-11): suppression requires a LIVE brief heartbeat, not just the flag.
    if (managerBriefSuppressionActive_()) {
      Logger.log('Missed-punch manager summary: consolidated into the daily brief.');
      return;
    }
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
    // F(cycle-8 M-1): export the morning AFTER the period completes, never on
    // its final day. The trigger fires at 12pm IST — mid-shift for both
    // offshore teams — so a period-end-day export silently omitted every punch
    // recorded later that day (the PH team's final-day ClockOut, an IST rep's
    // whole afternoon), and there was no catch-up run. Gating on YESTERDAY
    // being the period end guarantees the range is fully in the past when the
    // Timesheet is read. (The old gate fired on the last BUSINESS day of the
    // month / on biweeklyRange.end === today.)
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86400000);   // no DST in CONFIG.TIMEZONE (Asia/Kolkata)
    const yestStr = fmtDate_(yesterday);
    if (fmtDate_(today).slice(8) === '01') {   // 1st of the month → prior month is complete
      sendAutomatedExport_('Monthly', getMonthRange_(yesterday), '📊 Monthly ADP Upload — India Team');
    }
    const biweeklyRange = getCurrentBiweeklyRange_(yestStr);
    if (biweeklyRange && biweeklyRange.end === yestStr) {
      sendAutomatedExport_('Biweekly', biweeklyRange, '📊 Biweekly Payroll Export — Philippines Team');
    }
  } catch (err) {
    Logger.log('runDailyExportCheck failed: ' + err.message);
  }
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
        htmlBody: buildBrandedEmailHtml_('No export generated',
          '<p style="margin:0 0 12px;">No export was generated for <b>' + esc_(range.start) + '</b> to <b>' + esc_(range.end) + '</b>.</p>' +
          brandedKvRows_([['Reason', result.error]]),
          { accent: CN_EMAIL_PALETTE.warn }),
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
      htmlBody: buildBrandedEmailHtml_('ADP export ready',
        '<p style="margin:0 0 12px;">Attached: ADP-format export covering <b>' + esc_(range.start) + '</b> to <b>' + esc_(range.end) + '</b> (.xlsx).</p>' +
        brandedKvRows_([
          ['Employees', result.employeeCount + ' (' + payCycleFilter + ')'],
          ['Rows', String(result.rowCount)],
        ]) +
        '<p style="margin:14px 0 0;"><a href="' + esc_(result.url) + '" style="color:' + CN_EMAIL_PALETTE.brand + ';font-weight:600;">Open as a Google Sheet →</a></p>',
        { accent: CN_EMAIL_PALETTE.brand }),
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
        htmlBody: buildBrandedEmailHtml_('Automated export failed',
          '<p style="margin:0 0 12px;">The automated export did not complete.</p>' +
          brandedKvRows_([
            ['Error', err.message],
            ['Range', range.start + ' to ' + range.end],
          ]) +
          '<p style="margin:14px 0 0;color:' + CN_EMAIL_PALETTE.muted + ';">Please run the export manually from the Manage tab in the UMS Time Clock app.</p>',
          { accent: CN_EMAIL_PALETTE.danger }),
      });
    } catch (e) {}
  }
}

// Synthetic "employee" identity for system-initiated audit rows (no real actor).
const _SYSTEM_AUDIT_EMP_ = { id: 'SYSTEM', name: 'Automation', email: 'automation@system' };

// ── Digest last-run heartbeats (Automation Health) ──────────────────────────
// The three digest jobs deliberately write NO audit rows: the EOD digest runs
// hourly, and 24 rows/day would crowd the bounded AuditLog tail scans that
// back the compliance + health panels. Each run instead stamps a Script
// Property heartbeat; getAutomationHealth surfaces it with a staleness flag —
// closing the "silently dead digest trigger" blind spot.
const DIGEST_LAST_RUN_PROP = 'AUTOMATION_DIGEST_LAST_RUNS';

/** Best-effort heartbeat stamp ({ key: "yyyy-MM-dd HH:mm:ss" in
 *  CONFIG.TIMEZONE }) — never blocks or fails the digest itself. */
function stampDigestLastRun_(key) {
  try {
    const props = PropertiesService.getScriptProperties();
    let map = {};
    try { map = JSON.parse(props.getProperty(DIGEST_LAST_RUN_PROP)) || {}; } catch (_) {}
    if (!map || typeof map !== 'object' || Array.isArray(map)) map = {};
    map[key] = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
    props.setProperty(DIGEST_LAST_RUN_PROP, JSON.stringify(map));
  } catch (e) { /* heartbeat is best-effort */ }
}

/** F(cycle-8 M-11): the four digest-suppression branches gate on THIS, never
 *  on the flag alone. Flipping `managerDailyBrief` ON without ALSO re-running
 *  installAutomationTriggers() (the documented-but-easy-to-miss second step)
 *  used to suppress every separate manager email while the brief itself never
 *  fired — and the failure watchdog deliberately doesn't flag a never-stamped
 *  heartbeat ("fresh deploy" posture), so EVERY daily manager notification
 *  silently stopped with nothing to surface it. Suppress only while the brief
 *  trigger is demonstrably ALIVE: its `managerBrief` heartbeat (stamped on
 *  every 8am run, even while the flag is off — INV-151) is younger than 26h.
 *  Missing/stale/unparseable heartbeat → FAIL SAFE: the individual digests
 *  keep sending (a doubled email beats a silent outage). */
function managerBriefSuppressionActive_() {
  if (!getFlag_('managerDailyBrief')) return false;
  try {
    let map = {};
    try { map = JSON.parse(PropertiesService.getScriptProperties().getProperty(DIGEST_LAST_RUN_PROP)) || {}; } catch (_) {}
    const raw = String((map && map.managerBrief) || '');
    if (!raw) return false;
    const ms = Utilities.parseDate(raw, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss').getTime();
    return (Date.now() - ms) < 26 * 3600000;
  } catch (e) { return false; }
}


// ════════════════════════════════════════════════════════════════════════════
//  CALL NOTES — AUTOMATED EMAIL DIGESTS
//  ────────────────────────────────────────────────────────────────────────
//  Two scheduled jobs:
//
//    sendCallNotesEodDigest()         — runs HOURLY. On each run it walks
//      the roster and emails a rep only when their *current local hour*
//      equals CONFIG.CALL_NOTES.EOD_WARNING_HOUR AND they have unresolved
//      action-flagged notes from today. Hour-equality (not a ±minute
//      window — EOD_WARNING_WINDOW_MINUTES is legacy, no longer consulted)
//      reliably reaches every timezone; the prior once-at-manager-5pm
//      design silently skipped offshore reps. (F L-14: this banner
//      described the retired design and was restore-bait.)
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
        // Bounded read (A6): today's notes are a contiguous row slice
        // (append-order assumption, INV-46) — scan the 1-column date range to
        // find it instead of reading the rep's whole history every hour.
        const located = readCallNoteRowsInRange_(sheet, today, today);
        unresolved = [];
        for (let i = 0; i < located.length; i++) {
          const row = located[i].row;
          if (normalizeDate_(row[CN.DATE_LOCAL]) !== today) continue;
          if (String(row[CN.FLAG_TYPE] || '').toLowerCase() !== 'action') continue;
          const resStr = String(row[CN.RESOLVED] || '').toLowerCase();
          if (resStr === 'true' || resStr === 'yes' || resStr === '1') continue;
          unresolved.push(callNoteRowToObject_(located[i]));
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
    stampDigestLastRun_('eod');
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
    stampDigestLastRun_('weekly');
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
    // #2 (INV-151): while the consolidated daily brief is on, urgent notes
    // ride the 8am brief instead. Still stamp the heartbeat — the trigger ran
    // and made its (suppressed) decision; a dead trigger stays detectable.
    // F(cycle-8 M-11): suppression requires a LIVE brief heartbeat, not just the flag.
    if (managerBriefSuppressionActive_()) {
      stampDigestLastRun_('urgent');
      Logger.log('Urgent digest: consolidated into the daily brief.');
      return;
    }
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
    stampDigestLastRun_('urgent');
    Logger.log(`sendCallNotesUrgentDigest: urgent=${(urgent.results || []).length}`);
  } catch (err) {
    Logger.log('sendCallNotesUrgentDigest failed: ' + err.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  TRAINING & EMPLOYEE DOCS — OVERDUE DIGEST (T4)
//  ────────────────────────────────────────────────────────────────────────
//  docs/training-employee-docs-spec.md §5: "Overdue nudges are Phase 4 (a
//  digest-style trigger, heartbeat-stamped like the existing digests)."
//
//  Daily manager-tz trigger. Two overdue signals, with DIFFERENT visibility:
//    • Overdue TRAINING — org-wide (training dashboards are NOT team-scoped,
//      INV-120; every manager sees every rep's training), so the same training
//      list goes to all managers.
//    • Overdue unsigned DOCS — TEAM-SCOPED (INV-122 fail-closed): each manager
//      sees only docs they issued or are the employee's roster ManagerEmail
//      for. So the digest is built PER MANAGER, never one broadcast.
//  Sends nothing to a manager with no overdue training AND no overdue docs in
//  their scope. Best-effort throughout (INV-14); never throws.
// ════════════════════════════════════════════════════════════════════════════

/** Overdue training items across the whole roster (org-wide; not team-scoped).
 *  Mirrors getTrainingDashboard's per-(emp,item) loop but collects the overdue
 *  rows. Returns [{ empId, empName, title, dueDate }]. */
function trainOverdueForRoster_(todayIso) {
  const assignments = trainReadAssignments_();
  const completions = trainReadCompletions_(null);
  const titles = trainKbTitles_();
  const quizzes = trainReadQuizzes_();
  function itemTitle_(a) {
    // F(L-9): a draft KB item is hidden from the rep checklist, so it must
    // not nag as "overdue" either — null drops it, same as deleted.
    if (a.itemType === 'kb') {
      const kb = titles[a.itemId];
      return (kb && kb.status !== KB_STATUS_DRAFT) ? kb.title : null;
    }
    if (a.itemType === 'quiz') return quizzes[a.itemId] ? quizzes[a.itemId].title : null;
    return null;
  }
  const rows = getEmployeeRosterRows_();
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    if (!rows[r][EMP.EMAIL]) continue;
    const empId = String(rows[r][EMP.ID]).trim();
    const empName = String(rows[r][EMP.NAME]).trim();
    const eff = trainEffectiveForEmp_(assignments, empId);
    Object.keys(eff).forEach(function (key) {
      const a = eff[key];
      const title = itemTitle_(a);
      if (!title) return;
      let completedAt = '';
      for (let i = 0; i < completions.length; i++) {
        const c = completions[i];
        if (c.empId === empId && c.itemType === a.itemType && c.itemId === a.itemId && c.completedAt > a.assignedAt) {
          if (c.completedAt > completedAt) completedAt = c.completedAt;
        }
      }
      if (trainDeriveStatus_(!!completedAt, a.dueDate, todayIso) === 'overdue') {
        out.push({ empId: empId, empName: empName, title: title, dueDate: a.dueDate });
      }
    });
  }
  out.sort(function (x, y) {
    if (x.dueDate !== y.dueDate) return x.dueDate < y.dueDate ? -1 : 1;
    return x.empName.localeCompare(y.empName);
  });
  return out;
}

/** All overdue unsigned employee docs (status='issued' + requiresSignature +
 *  past dueAt). Returns [{ doc, empName }] with the FULL doc object so the
 *  caller can apply per-manager team scoping (empDocCanManagerSee_). Returns
 *  [] (never throws) when HR_DOCS_SS_ID is unset — the training portion of the
 *  digest must still send. */
function empDocsOverdueAll_(todayIso) {
  try {
    const sheet = getOrCreateEmpDocSheet_(EMPDOC_TAB, EMPDOC_HEADERS);
    const last = sheet.getLastRow();
    if (last < 2) return [];
    const ssTz = getHrDocsSS_().getSpreadsheetTimeZone();
    const rows = sheet.getRange(2, 1, last - 1, EMPDOC_HEADERS.length).getValues();
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const d = empDocRowToObj_(rows[i], ssTz);
      if (!d.docId) continue;
      if (!(empDocNeedsAction_(d) && d.dueAt && todayIso > d.dueAt)) continue;
      const target = lookupEmployeeById_(d.empId);
      out.push({ doc: d, empName: target ? target.name : 'former employee', empEmail: target ? target.email : '' });
    }
    out.sort(function (x, y) {
      if (x.doc.dueAt !== y.doc.dueAt) return x.doc.dueAt < y.doc.dueAt ? -1 : 1;
      return x.empName.localeCompare(y.empName);
    });
    return out;
  } catch (e) {
    Logger.log('empDocsOverdueAll_ skipped (HR docs store unavailable): ' + e.message);
    return [];
  }
}

/** Top-level trigger handler (reachable via google.script.run) → gated with
 *  assertManagerCaller_ (INV-44). Daily manager-tz nudge of overdue training
 *  (org-wide) + overdue unsigned docs (team-scoped per manager). */
function sendTrainingOverdueDigest() {
  assertManagerCaller_('sendTrainingOverdueDigest');  // see sendDailyMissedPunchAlerts note
  try {
    const mgrEmails = getManagerEmails_();
    if (mgrEmails.length === 0) { Logger.log('No manager emails — skipping training overdue digest.'); return; }
    const mgrTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
    const todayIso = Utilities.formatDate(new Date(), mgrTz, 'yyyy-MM-dd');
    const overdueTraining = trainOverdueForRoster_(todayIso);   // org-wide
    const overdueDocs = empDocsOverdueAll_(todayIso);           // scope per manager below
    const overdueCoaching = coachUnackedAll_(Date.now());       // scope per manager below
    let sent = 0;
    // #2 (INV-151): while the consolidated daily brief is on, the MANAGER
    // nudge rides the 8am brief instead — but the employee-side reminders
    // below always send (the deadline reminds both sides, INV-135).
    // F(cycle-8 M-11): suppression requires a LIVE brief heartbeat, not just the flag.
    if (managerBriefSuppressionActive_()) {
      Logger.log('Training-overdue manager nudge: consolidated into the daily brief.');
    } else {
      mgrEmails.forEach(function (email) {
        const mgr = { email: email, isManager: true };
        const scopedDocs = overdueDocs.filter(function (od) {
          return empDocCanManagerSee_(mgr, od.doc);
        });
        const scopedCoaching = overdueCoaching.filter(function (oc) {
          return coachCanManagerSee_(mgr, oc.item);
        });
        if (!overdueTraining.length && !scopedDocs.length && !scopedCoaching.length) return;   // nothing for this manager
        try {
          sendTrainingOverdueEmail_(email, overdueTraining, scopedDocs, scopedCoaching, todayIso);
          sent++;
        } catch (e) { console.warn('sendTrainingOverdueDigest to ' + email + ' failed: ' + e.message); }
      });
    }
    // v2 — also nudge the EMPLOYEE about their own overdue documents (one
    // email per employee). Best-effort per recipient.
    let empNudged = 0;
    const byEmp = {};
    overdueDocs.forEach(function (od) {
      const key = (od.empEmail || '').toLowerCase();
      if (!key) return;
      (byEmp[key] = byEmp[key] || { name: od.empName, docs: [] }).docs.push(od.doc);
    });
    Object.keys(byEmp).forEach(function (email) {
      try { sendEmployeeOverdueDocsEmail_(email, byEmp[email].name, byEmp[email].docs, todayIso); empNudged++; }
      catch (e) { console.warn('employee overdue-docs nudge to ' + email + ' failed: ' + e.message); }
    });
    stampDigestLastRun_('trainingOverdue');
    Logger.log('sendTrainingOverdueDigest: training=' + overdueTraining.length +
      ' docs=' + overdueDocs.length + ' coaching=' + overdueCoaching.length +
      ' managersEmailed=' + sent + ' employeesNudged=' + empNudged);
  } catch (err) {
    Logger.log('sendTrainingOverdueDigest failed: ' + err.message);
  }
}

/** Branded overdue-digest email to one manager (INV-105 — heading esc_'d in
 *  the wrapper, every user field esc_'d here; plain-text body fallback). */
function sendTrainingOverdueEmail_(toEmail, training, docs, coaching, todayIso) {
  const P = CN_EMAIL_PALETTE;
  function section_(label, rowsHtml) {
    return '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;color:' + P.muted +
        ';letter-spacing:.12em;text-transform:uppercase;margin:14px 0 6px;">' + esc_(label) + '</div>' +
      '<table style="width:100%;border-collapse:collapse;">' + rowsHtml + '</table>';
  }
  let html = '<p style="margin:0 0 4px;">These items are past their due date and still incomplete.</p>';
  let text = 'Overdue training & documents (as of ' + todayIso + ')\n';
  if (training.length) {
    const rows = training.map(function (t) {
      return '<tr>' +
        '<td style="padding:6px 10px;color:' + P.ink + ';font-size:13px;"><strong>' + esc_(t.empName) + '</strong> · ' + esc_(t.title) + '</td>' +
        '<td style="padding:6px 10px;font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:' + P.warnDeep + ';white-space:nowrap;text-align:right;">due ' + esc_(t.dueDate) + '</td>' +
        '</tr>';
    }).join('');
    html += section_('Overdue training (' + training.length + ')', rows);
    text += '\nOverdue training:\n' + training.map(function (t) { return '  ' + t.empName + ' · ' + t.title + ' (due ' + t.dueDate + ')'; }).join('\n');
  }
  if (docs.length) {
    const rows = docs.map(function (od) {
      return '<tr>' +
        '<td style="padding:6px 10px;color:' + P.ink + ';font-size:13px;"><strong>' + esc_(od.empName) + '</strong> · ' + esc_(od.doc.title) + '</td>' +
        '<td style="padding:6px 10px;font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:' + P.warnDeep + ';white-space:nowrap;text-align:right;">due ' + esc_(od.doc.dueAt) + '</td>' +
        '</tr>';
    }).join('');
    html += section_('Unsigned documents (' + docs.length + ')', rows);
    text += '\n\nUnsigned documents:\n' + docs.map(function (od) { return '  ' + od.empName + ' · ' + od.doc.title + ' (due ' + od.doc.dueAt + ')'; }).join('\n');
  }
  if (coaching && coaching.length) {
    const rows = coaching.map(function (oc) {
      return '<tr>' +
        // F(L-10): NO patientTRX here — INV-134: coaching notifications are
        // PHI-minimal (severity only, never the patient/TRX or narrative).
        // The manager opens the team-scoped Coaching tab for the detail.
        '<td style="padding:6px 10px;color:' + P.ink + ';font-size:13px;"><strong>' + esc_(oc.empName) + '</strong> · ' + esc_(oc.item.severity) + '</td>' +
        '<td style="padding:6px 10px;font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:' + P.warnDeep + ';white-space:nowrap;text-align:right;">since ' + esc_(String(oc.item.createdAt).substring(0, 10)) + '</td>' +
        '</tr>';
    }).join('');
    html += section_('Un-acknowledged coaching (' + coaching.length + ')', rows);
    text += '\n\nUn-acknowledged coaching:\n' + coaching.map(function (oc) { return '  ' + oc.empName + ' · ' + oc.item.severity + ' (since ' + String(oc.item.createdAt).substring(0, 10) + ')'; }).join('\n');
  }
  html += '<p style="margin:14px 0 0;">Open the web app → <strong>Training &amp; Employee Docs → Team Training / Issue Docs / Coaching</strong> to follow up.</p>';
  text += '\n\nOpen the web app → Training & Employee Docs to follow up.';
  const htmlBody = buildBrandedEmailHtml_('Overdue training, documents & coaching', html, { accent: P.warnDeep });
  MailApp.sendEmail({ to: toEmail, subject: '⏰ Overdue training, documents & coaching', body: text, htmlBody: htmlBody });
}

/** Branded reminder to ONE employee about their own overdue documents (v2 —
 *  the deadline reminds both sides). INV-105 — every field esc_'d, plain-text
 *  fallback. */
function sendEmployeeOverdueDocsEmail_(toEmail, empName, docs, todayIso) {
  const P = CN_EMAIL_PALETTE;
  const rows = docs.map(function (d) {
    const action = d.requiresSignature ? 'sign' : 'complete';
    return '<tr>' +
      '<td style="padding:6px 10px;color:' + P.ink + ';font-size:13px;"><strong>' + esc_(d.title) + '</strong> · ' + esc_(action) + '</td>' +
      '<td style="padding:6px 10px;font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:' + P.warnDeep + ';white-space:nowrap;text-align:right;">due ' + esc_(d.dueAt) + '</td>' +
      '</tr>';
  }).join('');
  const html = '<p style="margin:0 0 4px;">Hi ' + esc_(empName) + ', these documents are past their due date and still need your attention.</p>' +
    '<table style="width:100%;border-collapse:collapse;">' + rows + '</table>' +
    '<p style="margin:14px 0 0;">Open the web app → <strong>Training &amp; Employee Docs → My Docs</strong> to complete them.</p>';
  const text = 'Hi ' + empName + ', these documents are overdue (as of ' + todayIso + '):\n' +
    docs.map(function (d) { return '  ' + d.title + ' (due ' + d.dueAt + ')'; }).join('\n') +
    '\n\nOpen the web app → Training & Employee Docs → My Docs to complete them.';
  const htmlBody = buildBrandedEmailHtml_('Documents need your attention', html, { accent: P.warnDeep });
  MailApp.sendEmail({ to: toEmail, subject: '⏰ Your documents are overdue', body: text, htmlBody: htmlBody });
}

// ════════════════════════════════════════════════════════════════════════════
//  CONSOLIDATED MANAGER DAILY BRIEF (#2, INV-151)
//  ────────────────────────────────────────────────────────────────────────
//  One branded morning email (manager-tz 8am) replacing up to four separate
//  daily manager emails — the missed-punch summary, the urgent digest, the
//  training/docs/coaching overdue nudge, and the dept-request SLA reminder —
//  behind the `managerDailyBrief` feature flag (default OFF = every stream
//  behaves exactly as before). While ON, those four suppress their MANAGER
//  sends (each notes the suppression in its own handler); employee-facing
//  reminders, the WEEKLY training/review digests, and the automation-failure
//  watchdog (the independent silent-when-healthy watchdog — deliberately NOT
//  consolidated, so a dead brief trigger still gets reported) all send
//  unchanged. Data comes from the SAME factored computations the standalone
//  digests use (computeMissedClockOuts_, managerAggregateUrgent_,
//  trainOverdueForRoster_, empDocsOverdueAll_, coachUnackedAll_,
//  deptRequestsOverdueOpen_) — no parallel source to drift.
// ════════════════════════════════════════════════════════════════════════════

/** Pure — which brief sections have content, in render order. Drives the
 *  subject line, the section loop, and the send/skip decision (no sections =
 *  silent all-clear morning). Node-pinned via extractRawFunction. */
function managerBriefSections_(data) {
  const d = data || {};
  const defs = [
    { key: 'urgent',      label: 'Urgent notes' },
    { key: 'missed',      label: 'Missed clock-outs' },
    { key: 'training',    label: 'Overdue training' },
    { key: 'docs',        label: 'Unsigned documents' },
    { key: 'coaching',    label: 'Un-acknowledged coaching' },
    { key: 'deptOverdue', label: 'Dept requests past SLA' },
  ];
  const out = [];
  for (let i = 0; i < defs.length; i++) {
    const items = d[defs[i].key];
    if (Array.isArray(items) && items.length > 0) {
      out.push({ key: defs[i].key, label: defs[i].label, count: items.length });
    }
  }
  return out;
}

/** One branded brief email to ONE manager. Rows mirror the standalone digests
 *  (INV-105 — every user field esc_'d; coaching rows stay PHI-minimal per
 *  INV-134: severity only, never the patient/TRX or narrative). Plain-text
 *  fallback throughout. */
function sendManagerBriefEmail_(toEmail, sections, d, todayIso) {
  const P = CN_EMAIL_PALETTE;
  const secLabel = function (label) {
    return '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;color:' + P.muted +
      ';letter-spacing:.12em;text-transform:uppercase;margin:16px 0 6px;">' + esc_(label) + '</div>';
  };
  const row2 = function (leftHtml, rightText) {
    return '<tr>' +
      '<td style="padding:6px 10px;color:' + P.ink + ';font-size:13px;">' + leftHtml + '</td>' +
      '<td style="padding:6px 10px;font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:' + P.warnDeep + ';white-space:nowrap;text-align:right;vertical-align:top;">' + esc_(rightText) + '</td>' +
      '</tr>';
  };
  const table = function (rowsHtml) {
    return '<table style="width:100%;border-collapse:collapse;">' + rowsHtml + '</table>';
  };
  const totalItems = sections.reduce(function (s, x) { return s + x.count; }, 0);

  let html = '<p style="margin:0 0 4px;">Your consolidated morning brief — <strong>' + totalItems +
    '</strong> item(s) across ' + sections.length + ' area(s).</p>';
  let text = 'Team Tools daily brief (' + todayIso + ') — ' + totalItems + ' item(s):\n';

  sections.forEach(function (s) {
    html += secLabel(s.label + ' (' + s.count + ')');
    text += '\n' + s.label + ' (' + s.count + '):\n';
    if (s.key === 'urgent') {
      html += table(d.urgent.map(function (n) {
        return row2('<strong>' + esc_(n.repName) + '</strong> · ' + esc_(n.caller || n.patientAndTrx || '—') +
          (n.issue ? '<br><span style="color:' + P.muted + ';font-size:12px;">' + esc_(n.issue) + '</span>' : ''),
          n.dateLocal || '');
      }).join(''));
      text += d.urgent.map(function (n) {
        return '  ' + (n.dateLocal || '') + '  ' + n.repName + ' · ' + (n.caller || n.patientAndTrx || '—') + (n.issue ? ' — ' + n.issue : '');
      }).join('\n');
    } else if (s.key === 'missed') {
      html += table(d.missed.map(function (e) {
        return row2('<strong>' + esc_(e.name) + '</strong> (' + esc_(e.id) + ')',
          'missed ' + e.yesterdayStr + ' ' + tzAbbr_(e.timezone));
      }).join(''));
      text += d.missed.map(function (e) {
        return '  ' + e.name + ' (' + e.id + ') — missed ' + e.yesterdayStr + ' ' + tzAbbr_(e.timezone);
      }).join('\n');
    } else if (s.key === 'training') {
      html += table(d.training.map(function (t) {
        return row2('<strong>' + esc_(t.empName) + '</strong> · ' + esc_(t.title), 'due ' + t.dueDate);
      }).join(''));
      text += d.training.map(function (t) { return '  ' + t.empName + ' · ' + t.title + ' (due ' + t.dueDate + ')'; }).join('\n');
    } else if (s.key === 'docs') {
      html += table(d.docs.map(function (od) {
        return row2('<strong>' + esc_(od.empName) + '</strong> · ' + esc_(od.doc.title), 'due ' + od.doc.dueAt);
      }).join(''));
      text += d.docs.map(function (od) { return '  ' + od.empName + ' · ' + od.doc.title + ' (due ' + od.doc.dueAt + ')'; }).join('\n');
    } else if (s.key === 'coaching') {
      html += table(d.coaching.map(function (oc) {
        return row2('<strong>' + esc_(oc.empName) + '</strong> · ' + esc_(oc.item.severity),
          'since ' + String(oc.item.createdAt).substring(0, 10));
      }).join(''));
      text += d.coaching.map(function (oc) {
        return '  ' + oc.empName + ' · ' + oc.item.severity + ' (since ' + String(oc.item.createdAt).substring(0, 10) + ')';
      }).join('\n');
    } else if (s.key === 'deptOverdue') {
      html += table(d.deptOverdue.map(function (o) {
        return row2('<strong>' + esc_(o.dept) + '</strong> · ' + esc_(o.label || 'request') + ' — ' + esc_(o.byName || 'unknown'),
          o.ageHours + 'h open');
      }).join(''));
      text += d.deptOverdue.map(function (o) {
        return '  ' + o.dept + ' · ' + (o.label || 'request') + ' — ' + (o.byName || 'unknown') + ' · ' + o.ageHours + 'h open';
      }).join('\n');
    }
  });

  html += '<p style="margin:16px 0 0;">Open the web app for detail — the separate digest emails for these streams are suppressed while the brief is on.</p>';
  text += '\n\nOpen the web app for detail.';
  MailApp.sendEmail({
    to: toEmail,
    subject: 'Team Tools daily brief — ' + totalItems + ' item(s) · ' + todayIso,
    body: text,
    htmlBody: buildBrandedEmailHtml_('Daily brief · ' + todayIso, html, { tone: 'info', subLabel: 'Daily brief' }),
  });
}

/** Top-level trigger handler (daily manager-tz 8am; reachable via
 *  google.script.run) → gated with assertManagerCaller_ (INV-44). Best-effort
 *  end to end: every data source is individually try/catch'd (one broken
 *  store must not kill the brief) and the whole body never throws past the
 *  catch (INV-14). Docs + coaching are TEAM-SCOPED (INV-122/134 fail-closed),
 *  so the brief builds PER MANAGER — the sendTrainingOverdueDigest model. An
 *  all-clear morning sends nothing (house style: silent when healthy). */
function sendManagerDailyBrief() {
  assertManagerCaller_('sendManagerDailyBrief');  // see sendDailyMissedPunchAlerts note
  try {
    // Heartbeat stamps even while the flag is off — the trigger ran; the
    // Automation Health caption explains the flag gate.
    stampDigestLastRun_('managerBrief');
    if (!getFlag_('managerDailyBrief')) { Logger.log('managerDailyBrief flag is off — brief not sent.'); return; }
    const mgrEmails = getManagerEmails_();
    if (!mgrEmails.length) { Logger.log('No manager emails — skipping daily brief.'); return; }
    const mgrTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
    const now = new Date();
    const todayIso = Utilities.formatDate(now, mgrTz, 'yyyy-MM-dd');
    const back = new Date(now); back.setDate(back.getDate() - 1);
    const dateRange = { start: Utilities.formatDate(back, mgrTz, 'yyyy-MM-dd'), end: todayIso };

    let missed = [];
    try { missed = computeMissedClockOuts_(); } catch (e) { Logger.log('brief: missed-punch source failed: ' + e.message); }
    let urgent = [];
    try { urgent = managerAggregateUrgent_(dateRange).results || []; } catch (e) { Logger.log('brief: urgent source failed: ' + e.message); }
    let training = [];
    try { training = trainOverdueForRoster_(todayIso); } catch (e) { Logger.log('brief: training source failed: ' + e.message); }
    let docs = [];
    try { docs = empDocsOverdueAll_(todayIso); } catch (e) { Logger.log('brief: docs source failed: ' + e.message); }
    let coaching = [];
    try { coaching = coachUnackedAll_(Date.now()); } catch (e) { Logger.log('brief: coaching source failed: ' + e.message); }
    let deptOverdue = [];
    try { deptOverdue = deptRequestsOverdueOpen_(); } catch (e) { Logger.log('brief: dept-request source failed: ' + e.message); }

    let sent = 0;
    mgrEmails.forEach(function (email) {
      const mgr = { email: email, isManager: true };
      const d = {
        missed: missed,
        urgent: urgent,
        training: training,
        docs: docs.filter(function (od) { return empDocCanManagerSee_(mgr, od.doc); }),
        coaching: coaching.filter(function (oc) { return coachCanManagerSee_(mgr, oc.item); }),
        deptOverdue: deptOverdue,
      };
      const sections = managerBriefSections_(d);
      if (!sections.length) return;   // all clear for this manager — silent
      try { sendManagerBriefEmail_(email, sections, d, todayIso); sent++; }
      catch (e) { console.warn('daily brief to ' + email + ' failed: ' + e.message); }
    });
    Logger.log('sendManagerDailyBrief: managersEmailed=' + sent +
      ' missed=' + missed.length + ' urgent=' + urgent.length +
      ' training=' + training.length + ' docs=' + docs.length +
      ' coaching=' + coaching.length + ' deptOverdue=' + deptOverdue.length);
  } catch (err) {
    Logger.log('sendManagerDailyBrief failed: ' + err.message);
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
  // F(H-2): createPinnedSpreadsheet_ pins the new spreadsheet's tz (+locale)
  // to the ADP sheet's. The rows below are raw getValues() output whose
  // DATE/TIME cells are Sheets-coerced Date objects (wall time in the ADP
  // sheet's tz); a bare SpreadsheetApp.create() inherits the SCRIPT tz
  // (America/Chicago), so a differing ADP-sheet tz shifted every exported
  // date/time on display — the payroll .xlsx could carry the previous
  // calendar day.
  const newSs = createPinnedSpreadsheet_(name);
  const sh = newSs.getActiveSheet();
  sh.setName('Timesheet');
  sh.getRange(1, 1, 2, 9).setValues([rows[0].slice(0, 9), rows[1].slice(0, 9)]);
  sh.getRange(3, 1, matched.length, 9).setValues(matched);
  sh.getRange(1, 1, 1, 9).setFontWeight('bold');
  sh.setFrozenRows(2);
  SpreadsheetApp.flush();

  // The new Sheet is owned by the deployer (the web app runs as
  // USER_DEPLOYING); share it with the calling manager so the returned URL
  // opens without a Drive access request (L3). Best-effort — a sharing
  // failure never fails the export, and the deployer can always open it.
  try {
    const viewer = getActiveUserEmail_();
    const owner = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
    if (viewer && viewer !== owner) newSs.addEditor(viewer);
  } catch (shareErr) { console.warn('Export share failed: ' + shareErr.message); }

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
        // Doubles as the cancelTimeOffRequest match key — normalized like the
        // matcher (M1).
        submittedAt: normalizeAuditTs_(toRows[i][TO.SUBMITTED_AT]) });
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
      submittedAt: normalizeAuditTs_(toRows[i][TO.SUBMITTED_AT]),
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
  const list = [
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
  // F(L-3): when NEXT year's Jan 1 falls on a Saturday, its observance is
  // Dec 31 of THIS year — but every consumer builds its holiday map from
  // getUsHolidays_(yearOfTheDateViewed), so the observed day was invisible in
  // all December views (next occurrence: Fri Dec 31 2027 for NYD 2028).
  const nextNy = fixedHoliday_(year + 1, 0, 1, "New Year's Day (observed)");
  if (nextNy.date.substring(0, 4) === String(year)) list.push(nextNy);
  return list;
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
// 'Sick Leave' was removed (deferred #2 / C1 — employees have no sick days), so
// no new sick request can be created via ANY path (UI select + this submit
// whitelist). The sick BUCKET intentionally remains in getLeaveDeduction_ /
// adjustLeaveBalance_ / the reconciliation + decision-email code so HISTORICAL
// Approved-sick rows still revert/reconcile to the correct (sick) balance —
// removing it would restore legacy sick reverts into the annual bucket. Roster
// column J (SICK_LEAVE) is likewise kept (dormant, never surfaced in the UI).
const TIME_OFF_TYPES = [
  'Full Day', 'Half Day - Morning', 'Half Day - Afternoon',
  'Personal Day', 'Unpaid Leave', 'Other',
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
    // Per-employee PTO opt-out (column K). Contractors marked FALSE don't
    // accrue or spend paid leave — skip the balance math entirely so an
    // approval (or a manager filing on their behalf) can't drive their
    // balance negative. The global enablePtoTracking flag is the master
    // switch (checked above); this is the per-row gate that S15 / INV-27
    // promise. Sheets coerces 'TRUE'/'FALSE' to native booleans on read, so
    // parse defensively (mirrors getEmployeeInfo_ / lookupEmployeeById_).
    const ptoVal = rows[i][EMP.PTO_ENABLED];
    const ptoRaw = (ptoVal === null || ptoVal === undefined || ptoVal === '')
      ? '' : String(ptoVal).trim().toLowerCase();
    if (ptoRaw === 'false' || ptoRaw === 'no' || ptoRaw === 'n' || ptoRaw === '0') return null;
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
  { key: 'employeeImmediateAdjust', label: 'Employee immediate punch fix',
    description: 'Let employees apply punch adjustments instantly (an "Apply now" button alongside the approval-request flow). Off = all employee adjustments require manager approval (#4a).',
    default: false, scope: 'both' },
  { key: 'managerDailyBrief', label: 'Consolidated manager daily brief',
    description: 'One branded morning email (manager-tz 8am) consolidating the daily manager streams — urgent notes, missed clock-outs, overdue training / unsigned docs / un-acknowledged coaching, and dept requests past SLA. While ON, the separate manager emails for those streams are suppressed (employee-facing reminders, the weekly training/review digests, and the automation-failure watchdog still send independently). Run installAutomationTriggers() once after first enabling so the 8am trigger exists. Silent on an all-clear morning.',
    default: false, scope: 'server' },
  { key: 'kbAiGuidance', label: 'AI guidance (Reference drawer)',
    description: 'Show an AI-generated guidance card in the Reference drawer, built from whitelisted call facets (department / update type / tags / flag) + excerpts from your own KB articles. Configure the cap + model in the "AI Guidance" section below; set Script Property KB_AI_API_KEY first.',
    default: false, scope: 'both',
    danger: 'External AI vendor — whitelisted facet enums + your own (PHI-free-by-policy) KB excerpts are sent to the Anthropic API. No free-typed note text or patient data ever enters the payload (INV-119), but confirm the org’s stance on the vendor before enabling.' },
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
 *  (Pure 'server' flags aren't shipped to the client; managerDailyBrief is the
 *  first — it gates only email routing, no client UI depends on it.)
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

/** Manager-curated quick links (surveys / reviews) for the external composer.
 *  Script Property CN_EXTERNAL_LINKS first, CONFIG fallback; sanitize-on-read
 *  (corrupt blob → fallback, never throws), keeping only entries with a label
 *  and an http(s) url. */
function getExternalLinks_() {
  const prop = PropertiesService.getScriptProperties().getProperty('CN_EXTERNAL_LINKS');
  let raw = CONFIG.CALL_NOTES.EXTERNAL_LINKS || [];
  if (prop) {
    try {
      const parsed = JSON.parse(prop);
      if (Array.isArray(parsed)) raw = parsed;
    } catch (_) {}
  }
  return raw.map(function (l) {
    // Quick-links are the OFFICIAL external-collection path (the in-app ?form
    // route is admin-blocked on this domain). `category` groups them in the
    // composer picker — back-compat: absent/unknown → 'other'.
    const cat = String((l && l.category) || '').trim().toLowerCase();
    return {
      label: String((l && l.label) || '').trim(),
      url: String((l && l.url) || '').trim(),
      category: CN_EXTERNAL_LINK_CATEGORIES.indexOf(cat) >= 0 ? cat : 'other',
    };
  }).filter(function (l) { return l.label && /^https?:\/\//i.test(l.url); });
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

/** Admin tier — a distinct, above-manager role for config/system surfaces (the
 *  Manage module's Admin tab). When Script Property ADMIN_EMAILS is SET (comma-
 *  separated), admins are EXACTLY that email list. When UNSET/empty, EVERY
 *  manager is an admin — so a fresh deploy and the test suite behave exactly as
 *  before (admin == manager, keyed off the SAME roster `isManager` source the
 *  endpoints already use — NOT the MANAGER_EMAILS property, avoiding the F5
 *  roster-vs-property mismatch). Admins are always a SUBSET of managers.
 *  Designating admins is operator state (no roster column). */
function empIsAdmin_(email, isManager) {
  // F(M-10): admins are a SUBSET of managers (INV-136) — ENFORCED, not just
  // documented. Previously ADMIN_EMAILS membership alone granted admin, so a
  // non-manager email in the property became an undocumented privilege tier
  // (all 30 admin endpoints accepted them while manager surfaces rejected
  // them). Non-managers can never be admins regardless of the property.
  if (!isManager) return false;
  const prop = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS');
  const arr = prop ? prop.split(',').map(s => s.trim()).filter(s => s.length > 0) : null;
  if (arr && arr.length) {
    const e = String(email || '').toLowerCase().trim();
    return arr.map(x => String(x).toLowerCase()).indexOf(e) >= 0;
  }
  return true;   // ADMIN_EMAILS unset → every manager is an admin
}

/** Throws if the active user is not in MANAGER_EMAILS. Used by trigger-handler
 *  endpoints (sendDailyMissedPunchAlerts, runDailyExportCheck,
 *  sendCallNotesEodDigest, sendCallNotesWeeklyDigests) that must be public
 *  for time-based triggers and are therefore also reachable via
 *  google.script.run — without this gate, any logged-in rep could fire them.
 *
 *  F5 — NOTE the two "who is a manager" sources: this gate (trigger/digest
 *  endpoints) keys off the MANAGER_EMAILS Script Property, while the in-app
 *  endpoints gate off `emp.isManager` (Employees roster column). They are
 *  intentionally distinct (triggers run as the installer, not a roster lookup),
 *  but a person who is a manager in ONE source and not the OTHER gets
 *  inconsistent capability — keep the roster column and MANAGER_EMAILS in sync
 *  when onboarding/offboarding a manager. */
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
/** Pure (Node-pinned) — parse a per-rep shift override cell (roster column O,
 *  Turn D): 'H:mm-H:mm' (or 'H-H', spaces tolerated), times in the REP's own
 *  timezone. Returns { startMin, lengthMin } or null on blank/garbage/
 *  overnight (end must be strictly after start; minutes 0-59; within 00:00-
 *  24:00) — null falls back to the per-tz CONFIG.SHIFT_SCHEDULE, so a typo'd
 *  cell can never break the ribbon/coverage/punctuality (fail-safe, the
 *  sanitizeFlagType_ posture). Overnight shifts are deliberately unsupported
 *  (no consumer models a shift crossing midnight). */
function parseShiftOverride_(raw) {
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*$/.exec(String(raw == null ? '' : raw));
  if (!m) return null;
  const sH = parseInt(m[1], 10), sM = m[2] ? parseInt(m[2], 10) : 0;
  const eH = parseInt(m[3], 10), eM = m[4] ? parseInt(m[4], 10) : 0;
  if (sM > 59 || eM > 59) return null;
  const startMin = sH * 60 + sM, endMin = eH * 60 + eM;
  if (startMin < 0 || endMin > 24 * 60) return null;
  if (endMin <= startMin) return null;   // overnight/zero-length → fallback
  return { startMin: startMin, lengthMin: endMin - startMin };
}

/** Turn D — the per-rep schedule resolver every schedule consumer routes
 *  through: a valid roster column-O override wins (start/length only; breaks +
 *  reminder still come from the per-tz schedule), else the per-tz
 *  CONFIG.SHIFT_SCHEDULE. `empLike` needs only { scheduleRaw }; `tz` is the
 *  caller's already-resolved rep timezone. */
function empShiftSchedule_(empLike, tz) {
  const base = getShiftSchedule_(tz);
  const ov = parseShiftOverride_(empLike && empLike.scheduleRaw);
  if (!ov) return base;
  return { startMin: ov.startMin, lengthMin: ov.lengthMin,
           breaks: base.breaks, breakReminderMin: base.breakReminderMin, override: true };
}

function fmtDateTz_(d, tz) { return Utilities.formatDate(d, tz, 'yyyy-MM-dd'); }
function fmtTimeTz_(d, tz) { return Utilities.formatDate(d, tz, 'HH:mm:ss'); }

// ── #3 Coverage planner (manager, forward staffing view) ────────────────────
// getCoveragePlan(from,to): for each manager-tz day, lists every rep's shift
// (per-tz schedule, converted to the manager's tz) with a PTO overlay
// (Approved = off, Pending = tentative), plus an hourly concurrency strip that
// flags understaffed hours (< CONFIG.COVERAGE_MIN_STAFF). Manager-gated,
// read-only, PHI-free (names + schedule + PTO status only — never balances).
// v1 LIMITATION: schedules are per-TIMEZONE, not per-rep (CLAUDE.md — there's
// no per-rep schedule UI), so coverage assumes everyone in a tz works that tz's
// shift. The hourly math is the pure, Node-pinned coverageBucketHours_.

/** PURE: buckets shift intervals (minutes from the manager-tz midnight of the
 *  range's first day) into a per-day × 24-hour concurrency grid, counting
 *  DISTINCT reps per slot. Returns days[numDays] each = [24]{hour, confirmed,
 *  tentative}; a rep with a confirmed interval in a slot isn't double-counted
 *  as tentative there. Intervals outside [0, numDays*24h) are clipped. */
function coverageBucketHours_(intervals, numDays) {
  const days = [];
  for (let d = 0; d < numDays; d++) {
    const hours = [];
    for (let h = 0; h < 24; h++) hours.push({ confirmed: {}, tentative: {} });
    days.push(hours);
  }
  (intervals || []).forEach(function (iv) {
    const rep = String(iv && iv.rep == null ? '' : iv.rep);
    const s = iv && iv.absStart, e = iv && iv.absEnd;
    if (!(e > s)) return;
    const firstSlot = Math.floor(s / 60);
    const lastSlot = Math.ceil(e / 60) - 1;
    for (let slot = firstSlot; slot <= lastSlot; slot++) {
      if (slot < 0) continue;
      const d = Math.floor(slot / 24);
      if (d >= numDays) break;
      const h = slot % 24;
      (iv.tentative ? days[d][h].tentative : days[d][h].confirmed)[rep] = true;
    }
  });
  return days.map(function (hours) {
    return hours.map(function (hh, h) {
      const confirmed = Object.keys(hh.confirmed).length;
      let tentative = 0;
      Object.keys(hh.tentative).forEach(function (r) { if (!hh.confirmed[r]) tentative++; });
      return { hour: h, confirmed: confirmed, tentative: tentative };
    });
  });
}

function getCoveragePlan(fromDate, toDate) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { error: 'Manager access required.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fromDate)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(toDate)))
      return { error: 'Invalid date (expected yyyy-MM-dd).' };
    if (toDate < fromDate) { const t = fromDate; fromDate = toDate; toDate = t; }
    const numDays = daysBetween_(fromDate, toDate) + 1;
    if (numDays < 1 || numDays > 14) return { error: 'Range must be 1–14 days.' };

    const mgrTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
    const minStaff = (CONFIG.COVERAGE_MIN_STAFF != null) ? CONFIG.COVERAGE_MIN_STAFF : 2;
    const goodStaff = (CONFIG.COVERAGE_STAFF_GOOD != null) ? CONFIG.COVERAGE_STAFF_GOOD : minStaff;
    const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Roster → reps (name + tz + resolved per-tz shift).
    const roster = getEmployeeRosterRows_();
    const reps = [];
    for (let i = 1; i < roster.length; i++) {
      const name = String(roster[i][EMP.NAME] || '').trim();
      if (!name) continue;
      const tz = safeTimezone_(String(roster[i][EMP.TIMEZONE] || '').trim() || CONFIG.TIMEZONE);
      // Turn D: per-rep column-O override (INV-127's per-tz-only limitation removed).
      const schedRaw = String(roster[i][EMP.SCHEDULE] || '').trim();
      reps.push({ id: String(roster[i][EMP.ID]).trim(), name: name, tz: tz,
        sched: empShiftSchedule_({ scheduleRaw: schedRaw }, tz) });
    }

    // PTO overlay map {empId: {dateIso: 'Approved'|'Pending'}} over a padded
    // window (a shift's local date can straddle into an adjacent manager day).
    const padStart = addDaysIso_(fromDate, -1);
    const padEnd = addDaysIso_(toDate, 1);
    const ptoMap = {};
    try {
      const trows = getOrCreateTimeOffSheet_().getDataRange().getValues();
      for (let i = 1; i < trows.length; i++) {
        const eid = String(trows[i][TO.EMP_ID]).trim();
        const dt = normalizeDate_(trows[i][TO.DATE]);
        const st = String(trows[i][TO.STATUS] || '').trim().toLowerCase();
        if (!eid || !dt || dt < padStart || dt > padEnd) continue;
        if (st !== 'approved' && st !== 'pending') continue;
        if (!ptoMap[eid]) ptoMap[eid] = {};
        if (ptoMap[eid][dt] !== 'Approved') ptoMap[eid][dt] = (st === 'approved') ? 'Approved' : 'Pending';
      }
    } catch (e) { /* PTO overlay best-effort — coverage still renders */ }

    // Holidays for the years spanned.
    const holMap = {};
    const yrs = {}; yrs[fromDate.substring(0, 4)] = true; yrs[toDate.substring(0, 4)] = true;
    Object.keys(yrs).forEach(function (y) {
      try { getUsHolidays_(parseInt(y, 10)).forEach(function (h) { if (h && h.date) holMap[h.date] = h.name; }); }
      catch (e) { /* ignore */ }
    });

    const hhmm = function (mins) {
      const m = ((mins % 1440) + 1440) % 1440;
      return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2) + ':00';
    };

    const weekdaysOnly = CONFIG.COVERAGE_WEEKDAYS_ONLY !== false;
    const days = [];
    for (let d = 0; d < numDays; d++) {
      const dateIso = addDaysIso_(fromDate, d);
      const dow = new Date(dateIso + 'T12:00:00Z').getUTCDay();
      // Weekends are closed (we're only open weekdays) — shown but never flagged.
      const closed = weekdaysOnly && (dow === 0 || dow === 6);
      days.push({ date: dateIso, weekday: DOW[dow], holidayName: holMap[dateIso] || null, closed: closed, reps: [] });
    }

    // For each rep × each padded local date, convert the shift to the manager
    // tz, push an absolute interval for the hourly strip, and (when the local
    // date is one of the displayed days) add the rep row.
    const intervals = [];
    reps.forEach(function (r) {
      const startHH = hhmm(r.sched.startMin);
      const endHH = hhmm(r.sched.startMin + r.sched.lengthMin);
      for (let dd = -1; dd <= numDays; dd++) {
        const localDate = addDaysIso_(fromDate, dd);
        const pto = (ptoMap[r.id] && ptoMap[r.id][localDate]) || '';
        const off = (pto === 'Approved');
        const tentative = (pto === 'Pending');
        const conv = convertDateTime_(localDate, startHH, r.tz, mgrTz);
        const dayDelta = daysBetween_(fromDate, conv.date);
        const absStart = dayDelta * 1440 + timeToMins_(conv.time);
        if (!off) intervals.push({ rep: r.id, absStart: absStart, absEnd: absStart + r.sched.lengthMin, tentative: tentative });
        if (dd >= 0 && dd < numDays) {
          const endConv = convertDateTime_(localDate, endHH, r.tz, mgrTz);
          days[dd].reps.push({
            name: r.name, tz: r.tz,
            status: off ? 'off' : (tentative ? 'tentative' : 'working'),
            ptoType: pto || null,
            startMgr: conv.displayTime,
            endMgr: endConv.displayTime,
            // F(cycle-8): an IST rep's local Jul-10 shift converts to mgr-tz
            // Jul-9 21:30 → Jul-10 06:30 — the Jul-10 card showed a bare
            // "9:30 PM – 6:30 AM" that read as Jul-10 EVENING coverage. The
            // hourly strip was always right (absolute minutes); this flag lets
            // the client label the row "(from prev. day)".
            startsPrevDay: daysBetween_(localDate, conv.date) < 0,
          });
        }
      }
    });

    const bucketed = coverageBucketHours_(intervals, numDays);
    for (let d = 0; d < numDays; d++) days[d].hours = bucketed[d];

    const bizStart = (CONFIG.COVERAGE_BUSINESS_START_HOUR != null) ? CONFIG.COVERAGE_BUSINESS_START_HOUR : 8;
    const bizEnd = (CONFIG.COVERAGE_BUSINESS_END_HOUR != null) ? CONFIG.COVERAGE_BUSINESS_END_HOUR : 17;
    return { from: fromDate, to: toDate, managerTz: mgrTz, minStaff: minStaff, goodStaff: goodStaff, days: days,
             businessStartHour: bizStart, businessEndHour: bizEnd, weekdaysOnly: weekdaysOnly };
  } catch (err) { return { error: err.message }; }
}

/** Punctuality report (manager-gated, read-only): per-rep start-time adherence
 *  over a date range — first ClockIn vs the rep's scheduled shift start (per-tz,
 *  CONFIG.SHIFT_SCHEDULE), with a grace window. Also a secondary lunch-adherence
 *  stat (first LunchOut vs scheduled lunch). PHI-free (names + minute deltas).
 *  Only days the rep actually clocked in are counted (PTO/off days excluded). */
function getPunctualityReport(fromDate, toDate) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { error: 'Manager access required.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fromDate)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(toDate)))
      return { error: 'Invalid date (expected yyyy-MM-dd).' };
    if (toDate < fromDate) { const t = fromDate; fromDate = toDate; toDate = t; }
    const grace = (CONFIG.PUNCTUALITY_GRACE_MIN != null) ? CONFIG.PUNCTUALITY_GRACE_MIN : 5;

    const roster = getEmployeeRosterRows_();
    const repMap = {};
    for (let i = 1; i < roster.length; i++) {
      const id = String(roster[i][EMP.ID]).trim(); if (!id) continue;
      const name = String(roster[i][EMP.NAME] || '').trim(); if (!name) continue;
      const tz = safeTimezone_(String(roster[i][EMP.TIMEZONE] || '').trim() || CONFIG.TIMEZONE);
      // Turn D: per-rep column-O override (late-start grading uses the rep's REAL shift).
      const sched = empShiftSchedule_({ scheduleRaw: String(roster[i][EMP.SCHEDULE] || '').trim() }, tz);
      let lunchMin = null;
      (sched.breaks || []).forEach(function (b) { if (/lunch/i.test(b.label)) lunchMin = b.startMin; });
      if (lunchMin === null) {
        let longest = -1;
        (sched.breaks || []).forEach(function (b) { if (b.lenMin > longest) { longest = b.lenMin; lunchMin = b.startMin; } });
      }
      repMap[id] = { id: id, name: name, tz: tz, startMin: sched.startMin, lunchMin: lunchMin, days: {} };
    }

    const rows = getAdpSS_().getSheetByName(CONFIG.ADP_TAB).getDataRange().getValues();
    for (let i = 2; i < rows.length; i++) {
      const id = String(rows[i][ADP.EMP_ID]).trim();
      const r = repMap[id]; if (!r) continue;
      const d = normalizeDate_(rows[i][ADP.DATE]);
      if (!d || d < fromDate || d > toDate) continue;
      const type = normalizeType_(String(rows[i][ADP.COMMENTS]));
      if (type !== 'ClockIn' && type !== 'LunchOut') continue;
      const mins = timeToMins_(normalizeTime_(rows[i][ADP.TIME]));
      if (!r.days[d]) r.days[d] = {};
      if (type === 'ClockIn') { if (r.days[d].in == null || mins < r.days[d].in) r.days[d].in = mins; }
      else { if (r.days[d].lunch == null || mins < r.days[d].lunch) r.days[d].lunch = mins; }
    }

    const reps = [];
    Object.keys(repMap).forEach(function (id) {
      const r = repMap[id];
      const dates = Object.keys(r.days).filter(function (d) { return r.days[d].in != null; });
      if (!dates.length) return;
      let onTime = 0, late = 0, totLate = 0, worst = 0, lunchDays = 0, lunchOnTime = 0;
      dates.forEach(function (d) {
        const lateMin = r.days[d].in - r.startMin;
        if (lateMin > grace) { late++; totLate += lateMin; if (lateMin > worst) worst = lateMin; }
        else onTime++;
        if (r.lunchMin != null && r.days[d].lunch != null) {
          lunchDays++;
          if (r.days[d].lunch <= r.lunchMin + grace) lunchOnTime++;   // early/within-grace lunch is fine
        }
      });
      reps.push({
        id: r.id, name: r.name, tz: r.tz, startMin: r.startMin,
        days: dates.length, onTime: onTime, late: late,
        onTimePct: Math.round((onTime / dates.length) * 100),
        avgLate: late ? Math.round(totLate / late) : 0,
        worst: worst,
        lunchOnTimePct: lunchDays ? Math.round((lunchOnTime / lunchDays) * 100) : null,
      });
    });
    reps.sort(function (a, b) { return a.onTimePct - b.onTimePct || b.late - a.late; });   // least punctual first
    return { from: fromDate, to: toDate, grace: grace, reps: reps };
  } catch (err) { return { error: err.message }; }
}

// ── Spanish-inbox efficiency (Gmail) ────────────────────────────────────────
function getSpanishInboxAddress_() {
  try {
    const p = PropertiesService.getScriptProperties().getProperty('SPANISH_INBOX_ADDRESS');
    if (p && p.trim()) return p.trim().toLowerCase();
  } catch (e) {}
  return String(CONFIG.SPANISH_INBOX_ADDRESS || '').trim().toLowerCase();
}
/** Set of lowercased bilingual group-member emails (resolution = a reply from one). */
function getSpanishInboxMembers_() {
  let raw = '';
  try { raw = PropertiesService.getScriptProperties().getProperty('SPANISH_INBOX_MEMBERS') || ''; } catch (e) {}
  if (!raw) raw = String(CONFIG.SPANISH_INBOX_MEMBERS || '');
  const set = {};
  raw.split(',').forEach(function (s) { const e = s.trim().toLowerCase(); if (e) set[e] = true; });
  return set;
}

/** Spanish Inbox access predicate — managers OR a bilingual rep listed in
 *  SPANISH_INBOX_MEMBERS (the same roster used to detect "resolved by a member";
 *  the reps who actually action the inbox). INV-31 amendment: the four Spanish
 *  endpoints gate on THIS, not isManager. Reps get the FULL feature (pending
 *  list + bodies + stats) — they're the responders. Bodies stay live-read /
 *  never stored (the PHI-adjacent posture is unchanged). */
function canSeeSpanishInbox_(emp) {
  if (!emp) return false;
  if (emp.isManager) return true;
  var members = getSpanishInboxMembers_();
  return !!members[String(emp.email || '').trim().toLowerCase()];
}
/** Stable short hash of the inbox address + member set, used to scope the stats
 *  cache key so editing SPANISH_INBOX_ADDRESS / SPANISH_INBOX_MEMBERS isn't masked
 *  by a stale (wrong-resolution) aggregate for up to the 5-min TTL. Mirrors cdrRosterHash_. */
function spanishCacheHash_(addr, members) {
  const basis = String(addr || '') + '|' + Object.keys(members || {}).sort().join(',');
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, basis)
    .map(function (b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0'); }).join('');
}
/** Extract the bare email from a "Name <email@x>" / "email@x" From header. */
function emailAddrOnly_(from) {
  const s = String(from || '');
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim().toLowerCase();
}

/** F(cycle-8): exact-address membership test for a To/Cc header list. The
 *  prior scope guards did a raw substring `indexOf(addr)`, so ANY recipient
 *  string merely CONTAINING the inbox address (xspanishcalls@…, the address
 *  inside a display name) passed. Splits on commas, extracts each bare
 *  address (the emailAddrOnly_ rules), compares exactly. Pure — Node-pinned. */
function spanishAddrListIncludes_(headerList, addr) {
  const want = String(addr || '').trim().toLowerCase();
  if (!want) return false;
  return String(headerList || '').split(',').some(function (part) {
    return emailAddrOnly_(part) === want;
  });
}

/** F(cycle-8): the Gmail scan query. `to:` matches the To header only, so a
 *  request where the group inbox was Cc'd (a rep looping the group into an
 *  existing thread) never entered stats/pending/resolved. Brace-OR covers
 *  both headers. */
function spanishSearchQuery_(addr, days) {
  return '{to:' + addr + ' cc:' + addr + '} newer_than:' + days + 'd';
}

/** One-shot operator helper to FORCE the Gmail OAuth consent prompt.
 *  The Spanish-inbox features call GmailApp, but `appsscript.json` auto-detects
 *  scopes and NO test exercises GmailApp — so `runAllTests` never needs the
 *  Gmail scope and never prompts, leaving the deployed app unauthorized
 *  ("script does not have permission … gmail.readonly …"). Run THIS function
 *  from the Apps Script editor (Run ▶) as the deploying account, accept the
 *  Gmail permission, THEN re-deploy a New version so the web app picks up the
 *  scope. Read-only (a 1-result search) — gated like the other Gmail funcs. */
function authorizeGmailScope() {
  assertManagerCaller_('authorizeGmailScope');
  const n = GmailApp.search('to:me', 0, 1).length;   // forces the gmail.readonly grant
  Logger.log('Gmail scope OK — search returned ' + n + ' thread(s). Now redeploy a New version.');
  return { ok: true, threads: n };
}

/** Spanish-inbox resolution stats (manager-gated, read-only). Scans the
 *  DEPLOYER's Gmail for threads addressed to the group inbox over the last
 *  `days` and computes time-to-resolution (first inbound → first reply from a
 *  bilingual group member). PHI-free: returns counts + durations + requester
 *  email + age only — never the subject/body. 5-min cached. Requires the deploy
 *  account to be a member of the group (so it receives the threads). */
function getSpanishInboxStats(days) {
  try {
    const emp = getEmployeeInfo_();
    if (!canSeeSpanishInbox_(emp)) return { error: 'Spanish Inbox access required.' };
    let d = parseInt(days, 10); if (!d || d < 1) d = 30; if (d > 90) d = 90;
    const addr = getSpanishInboxAddress_();
    if (!addr) return { error: 'Spanish inbox not configured (set Script Property SPANISH_INBOX_ADDRESS).' };
    if (typeof GmailApp === 'undefined') return { error: 'Gmail is not available in this deployment.' };

    const cache = CacheService.getScriptCache();
    const members = getSpanishInboxMembers_();
    const haveMembers = Object.keys(members).length > 0;
    // Cache key is scoped by address + member set (not just `days`) so an operator
    // editing SPANISH_INBOX_ADDRESS / SPANISH_INBOX_MEMBERS isn't served a stale
    // aggregate computed under the old config for the TTL.
    const ckey = 'spanish_inbox_v1:' + d + ':' + spanishCacheHash_(addr, members);
    const hit = cache.get(ckey);
    if (hit) { try { return JSON.parse(hit); } catch (e) {} }

    const threads = GmailApp.search(spanishSearchQuery_(addr, d), 0, 200);
    const manual = spanishManualResolvedMap_();
    const durations = [], pending = [];
    let resolvedCount = 0;
    const nowMs = Date.now();
    threads.forEach(function (th) {
      const msgs = th.getMessages();
      if (!msgs.length) return;
      const req = msgs[0];
      const reqMs = req.getDate().getTime();
      const requester = emailAddrOnly_(req.getFrom());
      let resolveMs = null;
      for (let i = 1; i < msgs.length; i++) {
        const from = emailAddrOnly_(msgs[i].getFrom());
        // Resolved = a reply from a configured bilingual member; if no member
        // list is set, fall back to "first reply from someone else".
        const isResolver = haveMembers ? !!members[from] : (from && from !== requester);
        if (isResolver) { resolveMs = msgs[i].getDate().getTime(); break; }
      }
      // Manual mark-resolved (handled outside the thread) counts as resolved;
      // an in-thread reply wins when both exist. max() guards a skewed stamp.
      if (resolveMs == null && manual[th.getId()]) {
        resolveMs = Math.max(reqMs, manual[th.getId()].ms || reqMs);
      }
      if (resolveMs != null) {
        resolvedCount++;
        durations.push(Math.max(0, Math.round((resolveMs - reqMs) / 60000)));   // minutes
      } else {
        pending.push({ requester: requester, ageHours: Math.round((nowMs - reqMs) / 3600000) });
      }
    });
    durations.sort(function (a, b) { return a - b; });
    const avg = durations.length ? Math.round(durations.reduce(function (s, x) { return s + x; }, 0) / durations.length) : null;
    const median = durations.length ? durations[Math.floor(durations.length / 2)] : null;
    pending.sort(function (a, b) { return b.ageHours - a.ageHours; });
    const result = {
      address: addr, days: d,
      resolved: resolvedCount, pending: pending.length,
      avgMinutes: avg, medianMinutes: median,
      pendingList: pending.slice(0, 25),
      membersConfigured: Object.keys(members).length,
      threadsScanned: threads.length,
    };
    cache.put(ckey, JSON.stringify(result), 300);
    return result;
  } catch (err) { return { error: 'Spanish inbox read failed: ' + err.message }; }
}

/** Pending (unresolved) Spanish-inbox requests as task cards — manager-gated,
 *  live-read (NOT cached/stored, since it carries request content). Returns
 *  subject + a short snippet + an Open-in-Gmail permalink per open thread; the
 *  full body is fetched on demand via getSpanishInboxThreadBody. PHI note: the
 *  body may reference a patient/call — that's why it's manager-gated + never
 *  persisted. */
function getSpanishInboxPending(days) {
  try {
    const emp = getEmployeeInfo_();
    if (!canSeeSpanishInbox_(emp)) return { error: 'Spanish Inbox access required.' };
    let d = parseInt(days, 10); if (!d || d < 1) d = 30; if (d > 90) d = 90;
    const addr = getSpanishInboxAddress_();
    if (!addr) return { error: 'Spanish inbox not configured (set Script Property SPANISH_INBOX_ADDRESS).' };
    if (typeof GmailApp === 'undefined') return { error: 'Gmail is not available in this deployment.' };
    const members = getSpanishInboxMembers_();
    const haveMembers = Object.keys(members).length > 0;
    const threads = GmailApp.search(spanishSearchQuery_(addr, d), 0, 200);
    const manual = spanishManualResolvedMap_();
    const out = [];
    const nowMs = Date.now();
    threads.forEach(function (th) {
      if (manual[th.getId()]) return;   // manually marked resolved — not pending
      const msgs = th.getMessages();
      if (!msgs.length) return;
      const req = msgs[0];
      const requester = emailAddrOnly_(req.getFrom());
      let resolved = false;
      for (let i = 1; i < msgs.length; i++) {
        const from = emailAddrOnly_(msgs[i].getFrom());
        if (haveMembers ? !!members[from] : (from && from !== requester)) { resolved = true; break; }
      }
      if (resolved) return;   // only pending
      const bodyRaw = String(req.getPlainBody() || '').replace(/\s+/g, ' ').trim();
      out.push({
        threadId: th.getId(),
        requester: requester,
        ageHours: Math.round((nowMs - req.getDate().getTime()) / 3600000),
        subject: req.getSubject() || '(no subject)',
        snippet: bodyRaw.slice(0, 240),
        hasMore: bodyRaw.length > 240,
        permalink: th.getPermalink(),
      });
    });
    out.sort(function (a, b) { return b.ageHours - a.ageHours; });
    return { address: addr, days: d, pending: out };
  } catch (err) { return { error: 'Spanish inbox read failed: ' + err.message }; }
}

/** Resolved Spanish-inbox requests over the window (manager-gated, live-read,
 *  never stored — same posture as the pending list). For each resolved thread
 *  returns who resolved it + how long it took, newest-resolved first. PHI-lean:
 *  subject only (no body snippet — the on-demand getSpanishInboxThreadBody expand
 *  is the body path if ever needed). */
function getSpanishInboxResolved(days) {
  try {
    const emp = getEmployeeInfo_();
    if (!canSeeSpanishInbox_(emp)) return { error: 'Spanish Inbox access required.' };
    let d = parseInt(days, 10); if (!d || d < 1) d = 30; if (d > 90) d = 90;
    const addr = getSpanishInboxAddress_();
    if (!addr) return { error: 'Spanish inbox not configured (set Script Property SPANISH_INBOX_ADDRESS).' };
    if (typeof GmailApp === 'undefined') return { error: 'Gmail is not available in this deployment.' };
    const members = getSpanishInboxMembers_();
    const haveMembers = Object.keys(members).length > 0;
    const threads = GmailApp.search(spanishSearchQuery_(addr, d), 0, 200);
    const manual = spanishManualResolvedMap_();
    const out = [];
    threads.forEach(function (th) {
      const msgs = th.getMessages();
      if (!msgs.length) return;
      const req = msgs[0];
      const reqMs = req.getDate().getTime();
      const requester = emailAddrOnly_(req.getFrom());
      let resolveMs = null, resolver = '', wasManual = false;
      for (let i = 1; i < msgs.length; i++) {
        const from = emailAddrOnly_(msgs[i].getFrom());
        const isResolver = haveMembers ? !!members[from] : (from && from !== requester);
        if (isResolver) { resolveMs = msgs[i].getDate().getTime(); resolver = from; break; }
      }
      // Manual mark-resolved — an in-thread reply wins when both exist.
      if (resolveMs == null && manual[th.getId()]) {
        const man = manual[th.getId()];
        resolveMs = Math.max(reqMs, man.ms || reqMs);
        resolver = man.by;
        wasManual = true;
      }
      if (resolveMs == null) return;   // only resolved
      out.push({
        threadId: th.getId(),
        requester: requester,
        resolver: resolver,
        manual: wasManual,
        resolveMinutes: Math.max(0, Math.round((resolveMs - reqMs) / 60000)),
        resolvedAtMs: resolveMs,
        subject: req.getSubject() || '(no subject)',
        permalink: th.getPermalink(),
      });
    });
    out.sort(function (a, b) { return b.resolvedAtMs - a.resolvedAtMs; });   // newest resolved first
    return { address: addr, days: d, resolved: out };
  } catch (err) { return { error: 'Spanish inbox read failed: ' + err.message }; }
}

/** Full body of one Spanish-inbox request thread (manager-gated, on-demand
 *  expand). Scope-guarded: only returns the body if the thread is actually
 *  addressed to the configured inbox, so a manager can't pull arbitrary thread
 *  bodies by id. Live-read, never stored. */
function getSpanishInboxThreadBody(threadId) {
  try {
    const emp = getEmployeeInfo_();
    if (!canSeeSpanishInbox_(emp)) return { error: 'Spanish Inbox access required.' };
    if (typeof GmailApp === 'undefined') return { error: 'Gmail is not available.' };
    const addr = getSpanishInboxAddress_();
    // Fail closed: without a configured inbox there's no scope to guard against,
    // so refuse rather than letting an arbitrary thread id be read by id.
    if (!addr) return { error: 'Spanish inbox not configured.' };
    const th = GmailApp.getThreadById(String(threadId || ''));
    if (!th) return { error: 'Thread not found.' };
    const msgs = th.getMessages();
    if (!msgs.length) return { error: 'Empty thread.' };
    const first = msgs[0];
    if (!spanishAddrListIncludes_(String(first.getTo() || '') + ',' + String(first.getCc() || ''), addr))
      return { error: 'Not a Spanish-inbox thread.' };   // F(cycle-8): exact address match, not substring
    return {
      threadId: String(threadId),
      subject: first.getSubject() || '(no subject)',
      body: String(first.getPlainBody() || '').trim().slice(0, 8000),
      permalink: th.getPermalink(),
    };
  } catch (err) { return { error: 'Read failed: ' + err.message }; }
}

// ── Spanish inbox — manual mark-resolved (operator feedback 2026-07-09) ─────
// A request handled OUTSIDE the thread (phone call, walked over, done in the
// CRM) never gets a member reply, so it sat "pending" forever with no way to
// clear it. Members/managers can now mark a thread resolved manually. The
// record is PHI-FREE — threadId + who + when only, never subject/body (the
// same minimization as every Spanish surface) — in a small append-only
// SpanishManualResolved tab on the ADP spreadsheet. The resolved-at ms is
// stored as a NUMBER cell (immune to the Sheets date-coercion class).
const SPANISH_RESOLVED_TAB = 'SpanishManualResolved';
const SPANISH_RESOLVED_SCAN = 1000;   // bounded tail — the map read stays cheap

function getOrCreateSpanishResolvedSheet_() {
  const ss = getAdpSS_();
  let sh = ss.getSheetByName(SPANISH_RESOLVED_TAB);
  if (!sh) {
    sh = ss.insertSheet(SPANISH_RESOLVED_TAB);
    sh.appendRow([`Timestamp (${tzAbbr_(CONFIG.TIMEZONE)})`, 'ThreadId', 'ResolvedBy', 'ResolvedAtMs']);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Bounded-tail map of manually-resolved threads: { threadId: { by, ms } }.
 *  Best-effort — no tab yet (nothing ever marked) reads as empty. */
function spanishManualResolvedMap_() {
  const out = {};
  try {
    const sh = getAdpSS_().getSheetByName(SPANISH_RESOLVED_TAB);
    if (!sh) return out;
    const last = sh.getLastRow();
    if (last < 2) return out;
    const start = Math.max(2, last - SPANISH_RESOLVED_SCAN + 1);
    const rows = sh.getRange(start, 1, last - start + 1, 4).getValues();
    for (let i = 0; i < rows.length; i++) {
      const tid = String(rows[i][1] || '').trim();
      if (!tid || out[tid]) continue;
      out[tid] = { by: String(rows[i][2] || ''), ms: Number(rows[i][3]) || 0 };
    }
  } catch (e) { Logger.log('spanishManualResolvedMap_ skipped: ' + e.message); }
  return out;
}

/** Manual resolve — gated on canSeeSpanishInbox_ (the members who action the
 *  inbox + managers), SCOPE-GUARDED like getSpanishInboxThreadBody (the thread
 *  must be addressed to the configured inbox, so an arbitrary Gmail thread id
 *  can't be probed), locked (INV-01 — it appends), and idempotent. The pending
 *  list drops the thread immediately (live-read); the cached stats aggregate
 *  reflects it within its 5-min TTL (the INV-43 posture). PHI-free audit row
 *  (threadId only). */
function resolveSpanishThread(threadId) {
  try {
    const emp = getEmployeeInfo_();
    if (!canSeeSpanishInbox_(emp)) return { error: 'Spanish Inbox access required.' };
    if (typeof GmailApp === 'undefined') return { error: 'Gmail is not available.' };
    const addr = getSpanishInboxAddress_();
    if (!addr) return { error: 'Spanish inbox not configured.' };
    const tid = String(threadId || '').trim();
    if (!tid) return { error: 'Missing thread id.' };
    const th = GmailApp.getThreadById(tid);
    if (!th) return { error: 'Thread not found.' };
    const msgs = th.getMessages();
    if (!msgs.length) return { error: 'Empty thread.' };
    if (!spanishAddrListIncludes_(String(msgs[0].getTo() || '') + ',' + String(msgs[0].getCc() || ''), addr))
      return { error: 'Not a Spanish-inbox thread.' };   // F(cycle-8): exact address match, not substring
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      if (spanishManualResolvedMap_()[tid]) return { success: true, already: true };
      getOrCreateSpanishResolvedSheet_().appendRow([
        fmtDate_(new Date()) + ' ' + fmtTime_(new Date()), tid, emp.email, Date.now(),
      ]);
    } finally { lock.releaseLock(); }
    writeAuditLog_(emp, 'SpanishInboxResolve', '', '', false, 0, 'threadId=' + tid);
    return { success: true };
  } catch (err) { return { error: 'Resolve failed: ' + err.message }; }
}

// ── Inter-department request tracking (Part B) ──────────────────────────────
function getDeptRequestsSS_() {
  try {
    const id = PropertiesService.getScriptProperties().getProperty('DEPT_REQUESTS_SS_ID');
    if (id && id.trim()) return SpreadsheetApp.openById(id.trim());
  } catch (e) {}
  return getAdpSS_();   // back-compat: PHI-free, so co-locating on the ADP sheet is fine
}
function getOrCreateDeptRequestsSheet_() {
  const ss = getDeptRequestsSS_();
  let sh = ss.getSheetByName('DeptRequests');
  if (!sh) { sh = ss.insertSheet('DeptRequests'); sh.appendRow(DR_HEADERS); }
  return sh;
}
function drNowTs_() { return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss"); }

/** Pure (Node-pinned) — parse a roster Departments cell (col N) into canonical
 *  dept names. Splits on `;`/`,`, matches each token case-insensitively against
 *  the known department keys (`validKeys`) and returns the CANONICAL key casing,
 *  deduped; UNKNOWN names are dropped (a typo can't route an inbox to nowhere).
 *  DeptRequests v2 membership (INV-138). */
function drParseDepartments_(raw, validKeys) {
  const lc = {};
  (validKeys || []).forEach(function (k) { lc[String(k).toLowerCase().trim()] = k; });
  const out = [], seen = {};
  String(raw || '').split(/[;,]/).forEach(function (tok) {
    const t = String(tok).toLowerCase().trim();
    if (!t || !lc[t] || seen[lc[t]]) return;
    seen[lc[t]] = true; out.push(lc[t]);
  });
  return out;
}

/** The caller's resolved department memberships (canonical names), validated
 *  against the LIVE department map. Empty for reps not on a dept desk. */
function empDepartments_(emp) {
  if (!emp || !emp.departmentsRaw) return [];
  return drParseDepartments_(emp.departmentsRaw, Object.keys(getDepartmentEmails_() || {}));
}

/** Pure (Node-pinned) — SLA status from elapsed minutes vs an SLA in hours
 *  (wall-clock): `ontime` / `atrisk` (≥75% of SLA) / `overdue` (≥100%). A null
 *  age or non-positive SLA → null (no badge). DeptRequests v2 (INV-138). */
function drSlaStatus_(ageMin, slaHours) {
  if (ageMin == null || !(slaHours > 0)) return null;
  const frac = ageMin / (slaHours * 60);
  if (frac >= 1) return 'overdue';
  if (frac >= 0.75) return 'atrisk';
  return 'ontime';
}

/** Per-department SLA target map ({dept: hours}) from Script Property
 *  DR_SLA_TARGETS, sanitized on read (bad blob → {}). */
function getDeptRequestSlaConfig_() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('DR_SLA_TARGETS');
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
  } catch (_) { return {}; }
}

/** SLA (hours) for a department — per-dept override (case-insensitive) from the
 *  config map, else CONFIG.CALL_NOTES.DR_SLA_DEFAULT_HOURS. Pass an already-read
 *  `map` to avoid a Script-Property read per row in a loop. */
function getDeptRequestSla_(dept, map) {
  const def = CONFIG.CALL_NOTES.DR_SLA_DEFAULT_HOURS || 48;
  const cfg = map || getDeptRequestSlaConfig_();
  const want = String(dept || '').toLowerCase().trim();
  for (const k in cfg) {
    if (String(k).toLowerCase().trim() === want) { const h = parseInt(cfg[k], 10); return (h > 0) ? h : def; }
  }
  return def;
}

/** F(cycle-8 M-5): a multi-department send stores the JOINED label
 *  ("Billing, Shipping" — emailFromCallNote's drDeptKey) in ToDept. Every
 *  per-dept consumer did an exact whole-string match, so such a request
 *  appeared in NO department's Incoming inbox, a receiving-dept member could
 *  not resolve it in-app, and the SLA lookup fell through to the default.
 *  Split the stored value into its component department names ('Other' is
 *  dropped — the untracked free-text pseudo-department); callers fall back to
 *  the raw string when nothing remains (legacy 'Other'-only rows). Pure —
 *  Node-pinned in test/client/run.js. */
function drSplitDepts_(toDept) {
  return String(toDept || '').split(',')
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s && s.toLowerCase() !== 'other'; });
}

/** Strictest (minimum-hours) SLA across a request's component departments —
 *  every listed department is expected to respond, so the tightest target
 *  governs a multi-dept request. Single-dept values behave exactly as before
 *  (the split is the identity); empty splits fall back to the raw lookup. */
function drSlaForToDept_(toDept, map) {
  const parts = drSplitDepts_(toDept);
  if (!parts.length) return getDeptRequestSla_(toDept, map);
  let min = null;
  parts.forEach(function (d) {
    const h = getDeptRequestSla_(d, map);
    if (min === null || h < min) min = h;
  });
  return min;
}

/** Minimize a recipient list to its unique domain(s) for the PHI-free
 *  DeptRequests ToEmail column. The "Other" department lets a rep enter a
 *  free-text (possibly external/customer) address, and the store can fall back
 *  to the ADP/payroll sheet, so we persist only the domain(s) — the same PII
 *  minimization as the ExternalEmailSent audit row. The column is write-only
 *  (never read back by any endpoint), so domain-only loses no functionality. */
function drRecipientDomains_(toList) {
  const seen = {}, out = [];
  String(toList || '').split(',').forEach(function (a) {
    const dom = intakeEmailDomain_(a.trim());
    if (dom && dom !== '(none)' && !seen[dom]) { seen[dom] = 1; out.push(dom); }
  });
  return out.join(', ') || '(none)';
}

/** Dedup lookup (A5): the ReqId of an existing OPEN DeptRequests row for this
 *  (noteId, deptLabel), else null — so a note re-send to the same dept REUSES
 *  the prior token instead of opening a second request. Bounded tail (the
 *  DR_MAX_SCAN philosophy): a request older than the window is treated as absent
 *  and a re-send legitimately reopens it. Newest-first so the most recent open
 *  row wins. Legacy rows (no NoteId) never match. Best-effort — the caller falls
 *  back to a fresh token on any throw. */
function drFindOpenRequest_(noteId, deptLabel) {
  if (!noteId) return null;
  const sh = getOrCreateDeptRequestsSheet_();
  const lastRow = sh.getLastRow();
  const firstData = Math.max(2, lastRow - DR_MAX_SCAN + 1);
  const numRows = lastRow - firstData + 1;
  if (numRows <= 0) return null;
  const rows = sh.getRange(firstData, 1, numRows, DR_HEADERS.length).getValues();
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (String(r[DR.STATUS]) === 'open' &&
        String(r[DR.NOTE_ID] || '') === String(noteId) &&
        String(r[DR.TO_DEPT] || '') === String(deptLabel)) {
      return String(r[DR.REQ_ID]);
    }
  }
  return null;
}

/** "Mark resolved" CTA appended to a tracked department email's SENT body
 *  (added AFTER the INV-41 hash check so the preview/hash contract is unchanged).
 *  esc_'s the URL — same email-escape discipline as the call-note builder. */
function drResolveCtaHtml_(resolveUrl) {
  const P = CN_EMAIL_PALETTE;
  return '<div style="margin:18px 0 4px;text-align:center;">' +
      '<a href="' + esc_(resolveUrl) + '" style="display:inline-block;background:' + P.accent + ';color:#ffffff;' +
      'text-decoration:none;font-weight:600;padding:10px 20px;border-radius:8px;font-size:13px;">&#10003; Mark this request resolved</a>' +
    '</div>' +
    '<p style="margin:6px 0 0;font-size:11px;color:' + P.muted + ';text-align:center;">Click once you’ve actioned this request (or reply to let the sender know).</p>';
}

// sendDeptRequest (the legacy standalone dept-request composer endpoint) was
// retired (audit A6/F6): it had no caller anywhere — inter-department request
// tracking is now AUTOMATIC via emailFromCallNote (auto-logs the DeptRequests
// row + appends the resolve CTA). drResolveCtaHtml_ above is still used by that
// auto-log path.

/** Mark a request resolved (the receiver clicked the email link). Idempotent. */
function markDeptRequestResolved_(token, byEmail) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = getOrCreateDeptRequestsSheet_();
    const rows = sh.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][DR.REQ_ID]) !== String(token)) continue;
      if (String(rows[i][DR.STATUS]) === 'resolved') {
        return { found: true, already: true, dept: rows[i][DR.TO_DEPT],
                 resolvedAt: rows[i][DR.RESOLVED_AT], resolvedBy: rows[i][DR.RESOLVED_BY] };
      }
      sh.getRange(i + 1, DR.STATUS + 1).setValue('resolved');
      sh.getRange(i + 1, DR.RESOLVED_AT + 1).setValue(drNowTs_());
      sh.getRange(i + 1, DR.RESOLVED_BY + 1).setValue(byEmail || 'unknown');
      try { writeAuditLog_({ id: rows[i][DR.BY_ID], name: rows[i][DR.BY_NAME] }, 'DeptRequestResolved',
        '', '', false, 0, 'reqId=' + token + '; by=' + (byEmail || 'unknown'), byEmail || ''); } catch (e) {}
      return { found: true, already: false, dept: rows[i][DR.TO_DEPT] };
    }
    return { found: false };
  } finally { lock.releaseLock(); }
}

/** In-app resolve (the manual path that complements the email link): the
 *  request's CREATOR or any manager can mark it resolved from the Metrics tab —
 *  e.g. when the recipient replied "done" without clicking the email link.
 *  Rep-callable; ownership/manager-checked before the resolve. */
function resolveDeptRequest(requestId) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Your account is not registered.' };
    const rows = getOrCreateDeptRequestsSheet_().getDataRange().getValues();
    let owner = null, toDept = '';
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][DR.REQ_ID]) === String(requestId)) {
        owner = String(rows[i][DR.BY_ID]).trim();
        toDept = String(rows[i][DR.TO_DEPT] || '').toLowerCase().trim();
        break;
      }
    }
    if (owner === null) return { success: false, error: 'Request not found.' };
    // v2: a member of the RECEIVING department can also resolve in-app (the
    // "receiving agent marks resolved" path), alongside the sender + any manager.
    // F(cycle-8 M-5): match against each component department of a multi-dept
    // send ("Billing, Shipping"), not just the whole stored string.
    const partsLc = {};
    drSplitDepts_(toDept).forEach(function (d) { partsLc[d.toLowerCase()] = true; });
    const isDeptMember = empDepartments_(emp).some(function (d) {
      const k = String(d).toLowerCase();
      return k === toDept || partsLc[k];
    });
    if (owner !== emp.id && !emp.isManager && !isDeptMember)
      return { success: false, error: 'Only the sender, a member of the receiving department, or a manager can resolve this request.' };
    const res = markDeptRequestResolved_(requestId, emp.email || getActiveUserEmail_() || '');
    if (!res.found) return { success: false, error: 'Request not found.' };
    return { success: true, already: !!res.already };
  } catch (err) { return { success: false, error: err.message }; }
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
      const res = markDeptRequestResolved_(token, by);
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

/** Inter-department requests for the caller (rep: own; manager: all) + a
 *  per-department resolution-time aggregate for managers. Manager-gated fields
 *  (the aggregate + cross-rep rows) only return for managers. */
function getDeptRequests() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Your account is not registered.' };
    // Bounded tail read — never the whole sheet. Rows append chronologically, so
    // the most-recent DR_MAX_SCAN rows are the relevant ones for the list/aggregate.
    // (resolveDeptRequest / markDeptRequestResolved_ keep their FULL scans so an
    // old token still resolves — only this LIST read is bounded; F1/A4.)
    const sh = getOrCreateDeptRequestsSheet_();
    const lastRow = sh.getLastRow();
    const firstData = Math.max(2, lastRow - DR_MAX_SCAN + 1);
    const numRows = lastRow - firstData + 1;
    const rows = numRows > 0 ? sh.getRange(firstData, 1, numRows, DR_HEADERS.length).getValues() : [];
    const truncated = (lastRow - 1) > DR_MAX_SCAN;   // data rows exceed the cap
    const mine = [], all = [];
    // CreatedAt/ResolvedAt are written in the ISO 'T' form (drNowTs_) so Sheets
    // keeps them as strings — but tolerate a legacy space-form row that Sheets
    // coerced to a Date (the AuditLog/TO.SUBMITTED_AT coercion gotcha).
    const parseMs = function (v) {
      if (v instanceof Date) return v.getTime();
      const ms = parseTimestampMs_(String(v || ''), CONFIG.TIMEZONE);
      return ms || null;
    };
    const fmtTs = function (ms) {
      return ms ? Utilities.formatDate(new Date(ms), CONFIG.TIMEZONE, 'MMM d, yyyy h:mm a') : '';
    };
    // SLA config read ONCE (not per row); each item carries slaHours + slaStatus
    // (ontime/atrisk/overdue) — for open rows it's current age, for resolved rows
    // whether resolution beat the SLA (v2 phase 3).
    const slaCfg = getDeptRequestSlaConfig_();
    for (let i = 0; i < rows.length; i++) {   // i=0: tail slice has no header row
      const r = rows[i];
      if (!r[DR.REQ_ID]) continue;
      const createdMs = parseMs(r[DR.CREATED_AT]);
      const resolvedMs = r[DR.STATUS] === 'resolved' ? parseMs(r[DR.RESOLVED_AT]) : null;
      const elapsedMin = (resolvedMs && createdMs) ? Math.round((resolvedMs - createdMs) / 60000)
                        : (createdMs ? Math.round((Date.now() - createdMs) / 60000) : null);
      const slaHours = drSlaForToDept_(String(r[DR.TO_DEPT] || ''), slaCfg);   // F(cycle-8 M-5): strictest across a multi-dept send
      const item = {
        requestId: String(r[DR.REQ_ID]), byName: String(r[DR.BY_NAME] || ''),
        toDept: String(r[DR.TO_DEPT] || ''), createdAt: fmtTs(createdMs),
        status: String(r[DR.STATUS] || 'open'), resolvedAt: fmtTs(resolvedMs),
        resolvedBy: String(r[DR.RESOLVED_BY] || ''), label: String(r[DR.LABEL] || ''),
        elapsedMin: elapsedMin,
        slaHours: slaHours, slaStatus: drSlaStatus_(elapsedMin, slaHours),
      };
      all.push(item);
      if (String(r[DR.BY_ID]).trim() === emp.id) mine.push(item);
    }
    mine.sort(function (a, b) { return (a.status === b.status) ? 0 : (a.status === 'open' ? -1 : 1); });
    // Departments the composer can target — only those with a resolvable email.
    const deptMap = getDepartmentEmails_() || {};
    const departments = Object.keys(deptMap).filter(function (d) { return !!deptMap[d]; });
    // DeptRequests v2 — the "Incoming" inbox: OPEN requests addressed to a
    // department the caller staffs (roster column N). PHI-free (requester name +
    // label + age). A rep on no dept desk gets []. Managers also get allOpen below.
    const myDepts = empDepartments_(emp);
    const myDeptsLc = {};
    myDepts.forEach(function (d) { myDeptsLc[String(d).toLowerCase()] = true; });
    // F(cycle-8 M-5): a multi-dept send matches the inbox of EACH component
    // department (whole-string kept for back-compat with single-dept rows).
    const incoming = myDepts.length
      ? all.filter(function (it) {
              if (it.status !== 'open') return false;
              if (myDeptsLc[String(it.toDept).toLowerCase().trim()]) return true;
              return drSplitDepts_(it.toDept).some(function (d) { return myDeptsLc[d.toLowerCase()]; });
            })
            .sort(function (a, b) { return (b.elapsedMin || 0) - (a.elapsedMin || 0); }).slice(0, 100)
      : [];
    const result = { mine: mine.slice(0, 100), isManager: !!emp.isManager, departments: departments,
                     myDepts: myDepts, incoming: incoming, truncated: truncated };
    if (emp.isManager) {
      const byDept = {};
      all.forEach(function (it) {
        // F(cycle-8 M-5): count a multi-dept request under EACH component
        // department (it awaits each of them) instead of inventing a
        // "Billing, Shipping" pseudo-department bucket.
        const parts = drSplitDepts_(it.toDept);
        (parts.length ? parts : [it.toDept || '—']).forEach(function (k) {
          if (!byDept[k]) byDept[k] = { dept: k, open: 0, resolved: 0, overdueOpen: 0, durations: [] };
          if (it.status === 'resolved') { byDept[k].resolved++; if (it.elapsedMin != null) byDept[k].durations.push(it.elapsedMin); }
          else { byDept[k].open++; if (it.slaStatus === 'overdue') byDept[k].overdueOpen++; }
        });
      });
      result.deptStats = Object.keys(byDept).map(function (k) {
        const b = byDept[k];
        b.durations.sort(function (x, y) { return x - y; });
        const avg = b.durations.length ? Math.round(b.durations.reduce(function (s, x) { return s + x; }, 0) / b.durations.length) : null;
        const med = b.durations.length ? b.durations[Math.floor(b.durations.length / 2)] : null;
        return { dept: b.dept, open: b.open, resolved: b.resolved, overdueOpen: b.overdueOpen,
                 slaHours: getDeptRequestSla_(b.dept, slaCfg), avgMinutes: avg, medianMinutes: med };
      }).sort(function (a, b) { return b.open - a.open; });
      result.allOpen = all.filter(function (it) { return it.status === 'open'; })
        .sort(function (a, b) { return (b.elapsedMin || 0) - (a.elapsedMin || 0); }).slice(0, 100);
    }
    return result;
  } catch (err) { return { error: err.message }; }
}

/** Admin-gated (INV-136): read the DeptRequests SLA config for the editor —
 *  the per-dept overrides + the default + the known departments. */
function getDeptRequestSla() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { error: 'Admin access required.' };
    return {
      defaultHours: CONFIG.CALL_NOTES.DR_SLA_DEFAULT_HOURS || 48,
      targets: getDeptRequestSlaConfig_(),
      departments: Object.keys(getDepartmentEmails_() || {}),
    };
  } catch (err) { return { error: err.message }; }
}

/** Admin-gated (INV-136 / INV-57 family): persist the per-dept SLA target map to
 *  Script Property DR_SLA_TARGETS. Each value is whole hours 1–720; unknown depts
 *  and entries equal to the default are dropped (keeps the map lean). Writes an
 *  AdminConfigChange audit row. */
function saveDeptRequestSla(map) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { success: false, error: 'Admin access required.' };
    if (map == null || typeof map !== 'object' || Array.isArray(map)) return { success: false, error: 'Invalid SLA map.' };
    const validDepts = {};
    Object.keys(getDepartmentEmails_() || {}).forEach(function (d) { validDepts[String(d).toLowerCase().trim()] = d; });
    const def = CONFIG.CALL_NOTES.DR_SLA_DEFAULT_HOURS || 48;
    const clean = {};
    for (const k in map) {
      const canon = validDepts[String(k).toLowerCase().trim()];
      if (!canon) continue;                          // drop unknown departments
      const h = parseInt(map[k], 10);
      if (!(h > 0)) continue;                         // blank/0 → fall back to default (omit)
      if (h > 720) return { success: false, error: 'SLA for "' + canon + '" must be 1–720 hours.' };
      if (h === def) continue;                        // equals default → omit (lean map)
      clean[canon] = h;
    }
    PropertiesService.getScriptProperties().setProperty('DR_SLA_TARGETS', JSON.stringify(clean));
    writeAuditLog_(emp, 'AdminConfigChange', '', '', false, 0,
      'Updated Dept-Request SLA targets (' + Object.keys(clean).length + ' override(s))', emp.email);
    return { success: true, targets: clean };
  } catch (err) { return { success: false, error: err.message }; }
}

/** Daily manager-tz reminder of OPEN department requests past their SLA — a
 *  PHI-free summary push to MANAGER_EMAILS (the operator chose a manager summary
 *  over per-dept member nudges). Silent when nothing is overdue (the urgent-digest
 *  posture). Top-level trigger handler (assertManagerCaller_ INV-44, best-effort
 *  INV-14, never throws past the catch). Heartbeat-stamped. DeptRequests v2 phase 4. */
/** OPEN dept requests past their resolution SLA (bounded DR tail scan),
 *  factored from sendDeptRequestReminderDigest so the consolidated daily brief
 *  (#2, INV-151) shares ONE computation. Read-only.
 *  Returns [{ dept, byName, label, ageHours }]. */
function deptRequestsOverdueOpen_() {
  const sh = getOrCreateDeptRequestsSheet_();
  const lastRow = sh.getLastRow();
  const firstData = Math.max(2, lastRow - DR_MAX_SCAN + 1);
  const numRows = lastRow - firstData + 1;
  const rows = numRows > 0 ? sh.getRange(firstData, 1, numRows, DR_HEADERS.length).getValues() : [];
  const slaCfg = getDeptRequestSlaConfig_();
  const overdue = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r[DR.REQ_ID] || String(r[DR.STATUS]) === 'resolved') continue;
    const cv = r[DR.CREATED_AT];
    const createdMs = (cv instanceof Date) ? cv.getTime() : parseTimestampMs_(String(cv || ''), CONFIG.TIMEZONE);
    if (!createdMs) continue;
    const ageMin = Math.round((Date.now() - createdMs) / 60000);
    const dept = String(r[DR.TO_DEPT] || '');
    if (drSlaStatus_(ageMin, drSlaForToDept_(dept, slaCfg)) !== 'overdue') continue;   // F(cycle-8 M-5)
    overdue.push({ dept: dept || '—', byName: String(r[DR.BY_NAME] || ''),
                   label: String(r[DR.LABEL] || ''), ageHours: Math.round(ageMin / 60) });
  }
  return overdue;
}

function sendDeptRequestReminderDigest() {
  assertManagerCaller_('sendDeptRequestReminderDigest');
  try {
    // #2 (INV-151): while the consolidated daily brief is on, the SLA overdue
    // list rides the 8am brief instead. Stamp the heartbeat first — the
    // trigger ran; a dead trigger stays detectable.
    // F(cycle-8 M-11): suppression requires a LIVE brief heartbeat, not just the flag.
    if (managerBriefSuppressionActive_()) {
      stampDigestLastRun_('deptReqReminder');
      Logger.log('Dept-request reminder: consolidated into the daily brief.');
      return;
    }
    const mgrEmails = getManagerEmails_();
    if (!mgrEmails.length) { Logger.log('No manager emails — skipping dept-request reminder.'); return; }
    const overdue = deptRequestsOverdueOpen_();
    stampDigestLastRun_('deptReqReminder');
    if (!overdue.length) { Logger.log('dept-request reminder: nothing overdue.'); return; }

    const byDept = {};
    overdue.forEach(function (o) { (byDept[o.dept] = byDept[o.dept] || []).push(o); });
    const depts = Object.keys(byDept).sort();
    let bodyHtml = '<p style="margin:0 0 10px;">' + overdue.length +
      ' open department request(s) are past their resolution SLA. Open Metrics → Dept Requests for the full list + to mark them resolved.</p>';
    depts.forEach(function (dept) {
      bodyHtml += '<div style="margin:10px 0 4px;font-weight:700;">' + esc_(dept) + ' (' + byDept[dept].length + ')</div><ul style="margin:0;padding-left:18px;">';
      byDept[dept].slice(0, 25).forEach(function (o) {
        bodyHtml += '<li style="margin:3px 0;">' + esc_(o.label || 'request') + ' — ' + esc_(o.byName || 'unknown') + ' · ' + o.ageHours + 'h open</li>';
      });
      bodyHtml += '</ul>';
    });
    const textBody = overdue.length + ' overdue department request(s):\n\n' + depts.map(function (dept) {
      return dept + ' (' + byDept[dept].length + '):\n' + byDept[dept].slice(0, 25).map(function (o) {
        return '  • ' + (o.label || 'request') + ' — ' + (o.byName || 'unknown') + ' · ' + o.ageHours + 'h open';
      }).join('\n');
    }).join('\n\n') + '\n\nOpen Metrics → Dept Requests for the full list.';
    try {
      MailApp.sendEmail({
        to: mgrEmails.join(','),
        subject: 'Team Tools — ' + overdue.length + ' department request(s) past SLA',
        body: textBody,
        htmlBody: buildBrandedEmailHtml_('Department requests past SLA', bodyHtml, { tone: 'warn', subLabel: 'Dept Requests' }),
      });
    } catch (mailErr) { Logger.log('dept-request reminder send failed: ' + mailErr.message); }
    Logger.log('sendDeptRequestReminderDigest: ' + overdue.length + ' overdue emailed to ' + mgrEmails.length + ' manager(s).');
  } catch (err) {
    Logger.log('sendDeptRequestReminderDigest failed: ' + err.message);
  }
}

// IANA timezone aliases that resolve to the SAME zone (identical offset + rules).
// Google Sheets often STORES the legacy alias (e.g. "Asia/Calcutta") for what
// CONFIG names canonically ("Asia/Kolkata"). They're functionally identical at
// runtime — Utilities.formatDate treats them the same, so the coercion-recovery
// helpers (normalizeDate_/normalizeAuditTs_) round-trip correctly across an
// alias. ONLY string-EQUALITY checks (the S1.1 tripwire, Storage Health's tz
// badge) need to canonicalize first, so a correctly-configured GMT+5:30 sheet
// stored as "Asia/Calcutta" isn't falsely flagged as drifted.
const TZ_CANONICAL = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Rangoon': 'Asia/Yangon',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Ulan_Bator': 'Asia/Ulaanbaatar',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'Pacific/Ponape': 'Pacific/Pohnpei',
};
function tzCanonical_(tz) {
  const t = String(tz || '').trim();
  return TZ_CANONICAL[t] || t;
}
/** Equality across known IANA aliases (Asia/Calcutta ≡ Asia/Kolkata, etc.). */
function tzEquivalent_(a, b) { return tzCanonical_(a) === tzCanonical_(b); }

function safeTimezone_(tz) {
  if (!tz) return CONFIG.TIMEZONE;
  const t = String(tz).trim();
  // Shape gate first: the V8 runtime's formatDate no longer throws on an
  // unknown tz id (it silently resolves it to GMT), so the try/catch probe
  // alone can't catch a roster typo like "NotATimezone". Require an IANA
  // Area/Location id or an explicit UTC/GMT token before probing.
  const shapeOk = /^[A-Za-z]+(\/[A-Za-z0-9_+\-]+)+$/.test(t) ||
                  /^(UTC|GMT([+-]\d{1,2}(:\d{2})?)?)$/i.test(t);
  if (!shapeOk) {
    Logger.log('Invalid timezone "' + t + '" — falling back to ' + CONFIG.TIMEZONE);
    return CONFIG.TIMEZONE;
  }
  try { Utilities.formatDate(new Date(), t, 'z'); return t; }
  catch (_) { Logger.log('Invalid timezone "' + t + '" — falling back to ' + CONFIG.TIMEZONE); return CONFIG.TIMEZONE; }
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
        payCycle: cycle, payAnchor: anchor, isManager, isAdmin: empIsAdmin_(email, isManager), timezone, ptoEnabled,
        annualLeave: parseFloat(rows[i][EMP.ANNUAL_LEAVE]) || 0,
        sickLeave:   parseFloat(rows[i][EMP.SICK_LEAVE])   || 0,
        managerEmail: String(rows[i][EMP.MANAGER_EMAIL] || '').toLowerCase().trim(),
        departmentsRaw: String(rows[i][EMP.DEPARTMENTS] || '').trim(),   // parsed lazily via empDepartments_
        scheduleRaw: String(rows[i][EMP.SCHEDULE] || '').trim(),          // per-rep shift override (Turn D)
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
      managerEmail: String(rows[i][EMP.MANAGER_EMAIL] || '').toLowerCase().trim(),
      departmentsRaw: String(rows[i][EMP.DEPARTMENTS] || '').trim(),
      scheduleRaw: String(rows[i][EMP.SCHEDULE] || '').trim(),
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
  // Sheet rows are in APPEND order, not time order — a same-day back-fill
  // (approved adjustment request, manager Day Edit, immediate adjust) lands
  // last and would otherwise scramble every order-sensitive consumer
  // (getNextActions_, the client's status sentence / day ribbon / hours).
  // Normalized times are "HH:mm:ss", so a lexicographic sort is chronological.
  punches.sort((a, b) => a.time.localeCompare(b.time));
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

// ── #4a Punch-adjustment requests (employee batch → manager approval) ─────
// Parallels TimeOffRequests: employees submit adjustment REQUESTS (no immediate
// punch change); a manager approves (writes the ADJ- punch for the target emp)
// or denies. Distinct from the manager Day Edit (managerSaveDay), which is an
// immediate full-day reconcile and must NOT be reused here (it would delete
// punch types not present in its slots).
const PAR = { REQ_ID:0, EMP_ID:1, EMP_NAME:2, DATE:3, PUNCH_TYPE:4, REQ_TIME:5, REASON:6, STATUS:7, SUBMITTED_AT:8 };

function getOrCreatePunchAdjustSheet_() {
  const ss = getAdpSS_();
  let sheet = ss.getSheetByName(CONFIG.PUNCH_ADJUST_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.PUNCH_ADJUST_TAB);
    sheet.appendRow(['ReqId','EmpId','EmpName','Date','PunchType','RequestedTime','Reason','Status','SubmittedAt']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Employee batch submit of punch-adjustment requests (#4a). No punch is
 *  written — each lands as a Pending row for manager approval. Atomic: the
 *  whole batch is rejected if any entry is invalid (same guards as
 *  recordPunch's adjustment path: date/time shape, known punch type, future
 *  reject, adjust window, reason beyond OLD_ADJUST_ALERT_DAYS). Caller-scoped,
 *  locked. */
function submitPunchAdjustRequests(requests) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Employee not found.' };
    if (!Array.isArray(requests) || requests.length === 0) return { success: false, error: 'No adjustments to submit.' };
    if (requests.length > 20) return { success: false, error: 'Too many adjustments in one submission (max 20).' };
    const empTz = empTz_(emp);
    const todayStr = fmtDateTz_(new Date(), empTz);
    const clean = [];
    for (let i = 0; i < requests.length; i++) {
      const r = requests[i] || {};
      const label = 'Adjustment #' + (i + 1);
      const date = String(r.date || '').trim();
      const time = String(r.time || '').trim();
      const punchType = String(r.punchType || '').trim();
      const reason = String(r.reason || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false, error: label + ': invalid date.' };
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { success: false, error: label + ': invalid time (expected HH:mm).' };
      if (PUNCH_LABELS_.indexOf(punchType) < 0) return { success: false, error: label + ': invalid punch type.' };
      if (date > todayStr) return { success: false, error: label + ': cannot request a future date.' };
      // F(L-2): same-day future-TIME reject — INV-106 claims parity with
      // recordPunch's adjustment guards, but a request for TODAY at a
      // not-yet-reached time (e.g. a 23:59 ClockOut filed at 2pm) slipped
      // through, and approval wrote it with no time re-check.
      if (date === todayStr && (time + ':00') > fmtTimeTz_(new Date(), empTz)) {
        return { success: false, error: label + ': cannot request a time that has not happened yet.' };
      }
      const daysBack = daysBetween_(date, todayStr);
      if (daysBack > CONFIG.ADJUST_WINDOW_DAYS) return { success: false, error: label + ': older than the ' + CONFIG.ADJUST_WINDOW_DAYS + '-day adjust window.' };
      if (daysBack > CONFIG.OLD_ADJUST_ALERT_DAYS && !reason) return { success: false, error: label + ': a reason is required for dates more than ' + CONFIG.OLD_ADJUST_ALERT_DAYS + ' days back.' };
      clean.push({ date: date, time: time, punchType: punchType, reason: reason });
    }
    // Duplicate guards (same family as INV-94's time-off dup-guard): reject a
    // batch carrying two entries for the same (date, punchType), and reject an
    // entry that duplicates an EXISTING Pending request — a double-submit
    // would otherwise queue twin rows that each write a punch on approval
    // (benign-ish since approve updates-in-place, but it clutters the queue
    // and invites a double-approve race).
    const batchSeen = {};
    for (let i = 0; i < clean.length; i++) {
      const key = clean[i].date + '|' + clean[i].punchType;
      if (batchSeen[key]) return { success: false, error: 'Duplicate adjustment in this batch: ' + clean[i].punchType + ' on ' + clean[i].date + '.' };
      batchSeen[key] = true;
    }
    const sheet = getOrCreatePunchAdjustSheet_();
    const existing = sheet.getDataRange().getValues();
    for (let i = 1; i < existing.length; i++) {
      if (String(existing[i][PAR.EMP_ID]).trim() !== emp.id) continue;
      if (String(existing[i][PAR.STATUS]).trim().toLowerCase() !== 'pending') continue;
      const key = normalizeDate_(existing[i][PAR.DATE]) + '|' + String(existing[i][PAR.PUNCH_TYPE]).trim();
      if (batchSeen[key]) {
        return { success: false, error: 'You already have a pending ' +
          String(existing[i][PAR.PUNCH_TYPE]).trim() + ' adjustment for ' +
          normalizeDate_(existing[i][PAR.DATE]) + ' awaiting approval.' };
      }
    }
    const submittedAt = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
    clean.forEach(function (c) {
      sheet.appendRow([Utilities.getUuid(), emp.id, emp.name, c.date, c.punchType, c.time, c.reason, 'Pending', submittedAt]);
    });
    writeAuditLog_(emp, 'PunchAdjustRequest', clean[0].date, '', false, 0,
      'requested ' + clean.length + ' punch adjustment(s) pending approval');
    return { success: true, count: clean.length };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** The caller's own adjustment requests, newest-first (employee status list).
 *  Caller-scoped, read-only. */
function getMyPunchAdjustRequests() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    const rows = getOrCreatePunchAdjustSheet_().getDataRange().getValues();
    const out = [];
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][PAR.EMP_ID]).trim() !== emp.id) continue;
      out.push({
        reqId: String(rows[i][PAR.REQ_ID]).trim(),
        date: normalizeDate_(rows[i][PAR.DATE]),
        punchType: String(rows[i][PAR.PUNCH_TYPE]).trim(),
        time: normalizeTime_(rows[i][PAR.REQ_TIME]).trim().substring(0, 5),
        reason: String(rows[i][PAR.REASON] || ''),
        status: String(rows[i][PAR.STATUS]).trim(),
        submittedAt: normalizeAuditTs_(rows[i][PAR.SUBMITTED_AT]),
      });
    }
    out.sort(function (a, b) { return String(b.submittedAt).localeCompare(String(a.submittedAt)); });
    return { requests: out };
  } catch (err) { return { error: err.message }; }
}

/** Manager-gated, read-only — all Pending adjustment requests across reps, for
 *  the manager dashboard approval queue. */
function managerGetPendingAdjustments() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const rows = getOrCreatePunchAdjustSheet_().getDataRange().getValues();
    const out = [];
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][PAR.STATUS]).trim().toLowerCase() !== 'pending') continue;
      out.push({
        reqId: String(rows[i][PAR.REQ_ID]).trim(),
        empId: String(rows[i][PAR.EMP_ID]).trim(),
        empName: String(rows[i][PAR.EMP_NAME]).trim(),
        date: normalizeDate_(rows[i][PAR.DATE]),
        punchType: String(rows[i][PAR.PUNCH_TYPE]).trim(),
        time: normalizeTime_(rows[i][PAR.REQ_TIME]).trim().substring(0, 5),
        reason: String(rows[i][PAR.REASON] || ''),
        submittedAt: normalizeAuditTs_(rows[i][PAR.SUBMITTED_AT]),
      });
    }
    out.sort(function (a, b) { return (a.date + a.empName).localeCompare(b.date + b.empName); });
    return { requests: out };
  } catch (err) { return { error: err.message }; }
}

/** Manager-gated, locked. Approve → writes the ADJ-{punchType} punch for the
 *  target emp and marks Approved. Deny → marks Denied (no punch). Transition-
 *  guarded: only acts on a Pending row (so a double-click can't re-approve). */
function updatePunchAdjustStatus(reqId, newStatus) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    if (newStatus !== 'Approved' && newStatus !== 'Denied') return { success: false, error: 'Invalid status.' };
    const id = String(reqId || '').trim();
    if (!id) return { success: false, error: 'Missing request id.' };
    const sheet = getOrCreatePunchAdjustSheet_();
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][PAR.REQ_ID]).trim() !== id) continue;
      const status = String(rows[i][PAR.STATUS]).trim();
      if (status.toLowerCase() !== 'pending') return { success: false, error: 'This request is no longer pending.' };
      const empId = String(rows[i][PAR.EMP_ID]).trim();
      const empName = String(rows[i][PAR.EMP_NAME]).trim();
      const date = normalizeDate_(rows[i][PAR.DATE]);
      const punchType = String(rows[i][PAR.PUNCH_TYPE]).trim();
      const reqTime = normalizeTime_(rows[i][PAR.REQ_TIME]).trim().substring(0, 5);
      const reason = String(rows[i][PAR.REASON] || '');
      if (newStatus === 'Approved') {
        const targetEmp = lookupEmployeeById_(empId);
        if (!targetEmp) return { success: false, error: 'Employee not found.' };
        // Re-validate the adjust window at APPROVAL time — the submit-time
        // check (INV-106) doesn't cover a request that sat in the queue past
        // the window. Writing it would bypass the same bound recordPunch /
        // managerSaveDay enforce; the manager should deny instead.
        const ageDays = daysBetween_(date, fmtDateTz_(new Date(), empTz_(targetEmp)));
        if (ageDays > CONFIG.ADJUST_WINDOW_DAYS) {
          return { success: false, error:
            'This request is now older than the ' + CONFIG.ADJUST_WINDOW_DAYS +
            '-day adjust window — deny it (the rep can re-submit if still needed).' };
        }
        writeAdjustPunchForEmployee_(targetEmp, date, punchType, reqTime, callerEmp.email, reason);
      } else {
        const targetForAudit = lookupEmployeeById_(empId) || { id: empId, name: empName, email: '' };
        writeAuditLog_(targetForAudit, 'PunchAdjustStatusChange', date, '', false, 0,
          `${punchType} ${reqTime} request denied`, callerEmp.email);
      }
      sheet.getRange(i + 1, PAR.STATUS + 1).setValue(newStatus);
      return { success: true };
    }
    return { success: false, error: 'Request not found.' };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Writes a single ADJ-{punchType} punch for a TARGET employee (the approve
 *  path). Find-existing-of-that-type-for-date → update, else append; mirrors
 *  recordPunch's adjustment write + the personal-sheet mirror (INV-09/26/59).
 *  Touches ONLY that punch type — unlike managerSaveDay's full-day reconcile.
 *  Writes the `ADJ-` audit row with the approving manager as actor. */
function writeAdjustPunchForEmployee_(targetEmp, date, punchType, time, actorEmail, reason) {
  const timeFull = time + ':00';
  const dir = ['ClockIn', 'LunchIn'].indexOf(punchType) >= 0 ? 'IN' : 'OUT';
  const commentLabel = 'ADJ-' + punchType;
  const existing = findExistingPunch_(targetEmp.id, date, punchType);
  if (existing) {
    existing.sheet.getRange(existing.rowIndex, ADP.TIME + 1).setValue(timeFull);
    existing.sheet.getRange(existing.rowIndex, ADP.COMMENTS + 1).setValue(commentLabel);
  } else {
    appendToAdpSheet_(targetEmp, date, timeFull, dir, commentLabel);
  }
  if (targetEmp.sheetId) {
    try { writeToEmployeeSheet_(targetEmp, date, timeFull, dir, punchType); } catch (e) {}
  }
  const daysBack = Math.abs(daysBetween_(date, fmtDateTz_(new Date(), empTz_(targetEmp))));
  writeAuditLog_(targetEmp, punchType, date, timeFull, true, daysBack,
    'approved adjustment request' + (reason ? ' — ' + reason : ''), actorEmail);
}

/** #4b — manager multi-day adjust. Applies the given punch times to EVERY date
 *  in [fromDate, toDate] for one rep, ADDITIVELY: each non-empty slot is
 *  set/updated for that day via writeAdjustPunchForEmployee_ (touches only that
 *  punch type). Unlike managerSaveDay (a single-day full reconcile), this never
 *  deletes unspecified punch types — a blank slot leaves that punch untouched
 *  across the range. Manager-gated, locked, window-bounded, span capped at 31. */
function managerSaveDayRange(targetEmpId, fromDate, toDate, slots, reason) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    if (!targetEmpId) return { success: false, error: 'No employee specified.' };
    if (!fromDate || !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !toDate || !/^\d{4}-\d{2}-\d{2}$/.test(toDate))
      return { success: false, error: 'Invalid date range (expected yyyy-MM-dd).' };
    if (fromDate > toDate) return { success: false, error: 'From date must be on or before To date.' };
    const targetEmp = lookupEmployeeById_(targetEmpId);
    if (!targetEmp) return { success: false, error: 'Employee not found.' };

    const cleanSlots = {};
    let anyTime = false;
    for (let k = 0; k < PUNCH_LABELS_.length; k++) {
      const type = PUNCH_LABELS_[k];
      const raw = String((slots && slots[type]) || '').trim();
      if (raw && !/^([01]\d|2[0-3]):[0-5]\d$/.test(raw))
        return { success: false, error: `Invalid time for ${type}: "${raw}" (expected HH:mm, 24-hour)` };
      cleanSlots[type] = raw;
      if (raw) anyTime = true;
    }
    if (!anyTime) return { success: false, error: 'Enter at least one punch time to apply across the range.' };

    const dates = [];
    let d = fromDate;
    while (d <= toDate && dates.length <= 366) { dates.push(d); d = addDaysIso_(d, 1); }
    if (dates.length > 31) return { success: false, error: 'Range too large (max 31 days).' };

    const empTz = empTz_(targetEmp);
    const todayStr = fmtDateTz_(new Date(), empTz);
    for (let i = 0; i < dates.length; i++) {
      const db = daysBetween_(dates[i], todayStr);
      if (db < 0) return { success: false, error: 'Range includes a future date.' };
      if (db > CONFIG.ADJUST_WINDOW_DAYS) return { success: false, error: `Range includes dates older than the ${CONFIG.ADJUST_WINDOW_DAYS}-day adjust window.` };
    }
    const trimmedReason = String(reason || '').trim();
    if (daysBetween_(dates[0], todayStr) > CONFIG.OLD_ADJUST_ALERT_DAYS && !trimmedReason) {
      return { success: false, error: `A reason is required when the range goes more than ${CONFIG.OLD_ADJUST_ALERT_DAYS} days back.` };
    }

    let punchesWritten = 0;
    dates.forEach(function (date) {
      PUNCH_LABELS_.forEach(function (type) {
        const t = cleanSlots[type];
        if (!t) return;
        writeAdjustPunchForEmployee_(targetEmp, date, type, t, callerEmp.email, trimmedReason || 'multi-day edit');
        punchesWritten++;
      });
    });
    return { success: true, daysTouched: dates.length, punchesWritten: punchesWritten };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
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
    // Show the balance of the bucket this request actually deducts from —
    // a Sick Leave decision must report the SICK balance, not annual (and an
    // Unpaid Leave decision has no balance line at all, bucket=null).
    let balanceDays = null;
    let balanceLabel = 'annual';
    if (getFlag_('enablePtoTracking')) {
      const dedu = getLeaveDeduction_(type);
      if (dedu.bucket) {
        // Re-fetch fresh balances (cache was invalidated by adjustLeaveBalance_)
        const fresh = lookupEmployeeById_(emp.id);
        if (fresh && fresh.ptoEnabled !== false) {
          balanceDays = dedu.bucket === 'sick' ? fresh.sickLeave : fresh.annualLeave;
          balanceLabel = dedu.bucket === 'sick' ? 'sick' : 'annual';
        }
      }
    }
    // Plain-text fallback
    let body = `Hi ${emp.name},\n\n` +
               `Your time off request has been ${verb}:\n\n` +
               `Date:    ${date}\n` +
               `Type:    ${type}\n`;
    if (hasNotes) body += `Notes:   ${notes}\n`;
    body += `Status:  ${newStatus}\n\n`;
    if (balanceDays !== null) body += `Your current ${balanceLabel} leave balance: ${balanceDays} day(s)\n\n`;
    body += `Please contact your manager with any questions.\n\n— UMS Time Clock (automated)\n`;
    // Branded HTML (item 2) — green/red/navy header by decision
    const accent = newStatus === 'Approved' ? CN_EMAIL_PALETTE.accent
                 : newStatus === 'Denied'   ? CN_EMAIL_PALETTE.danger
                 : CN_EMAIL_PALETTE.brand;
    const kv = [['Date', date], ['Type', type]];
    if (hasNotes) kv.push(['Notes', notes]);
    kv.push(['Status', newStatus]);
    const balLine = (balanceDays !== null)
      ? '<p style="margin:12px 0 0;">Current ' + esc_(balanceLabel) + ' leave balance: <b>' + esc_(balanceDays) + '</b> day(s)</p>' : '';
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
/** Advance a yyyy-MM-dd string by n days (UTC math → no tz drift). */
function addDaysIso_(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
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
/** AuditLog timestamp cells are written as "yyyy-MM-dd HH:mm:ss" strings
 *  (CONFIG.TIMEZONE wall time) but Sheets coerces them to datetime values on
 *  write. String(date) yields "Tue Jun 10 2026 ..." — which silently fails
 *  every substring(0,10) date filter and convertAuditTs_ parse downstream.
 *  Formatting the coerced Date back in the SAME tz the sheet used to parse it
 *  (the audit/ADP sheet's own tz) recovers the as-written digits. Plain-text
 *  cells pass through untouched. Same family as normalizeDate_/normalizeTime_. */
function normalizeAuditTs_(val) {
  if (val instanceof Date) {
    const ssTz = getAdpSS_().getSpreadsheetTimeZone();
    return Utilities.formatDate(val, ssTz, 'yyyy-MM-dd HH:mm:ss');
  }
  return String(val == null ? '' : val).trim();
}

/** Typed AuditLog row reader — the SINGLE coercion-recovery point for the shared
 *  AuditLog (Batch 3, cycle-8). Sheets coerces the Timestamp, PunchDate
 *  (yyyy-MM-dd), PunchTime (HH:mm:ss), and IsAdjustment (TRUE/FALSE) cells to
 *  Date/boolean values on read — a raw `String(row[i])` renders "Wed Jul 15 2026
 *  …" / "Sat Dec 30 1899 …" / the-always-false `=== 'TRUE'` (the M-3/M-4/F1
 *  class). This recovers ALL of them ONCE via the established normalize helpers,
 *  so no caller re-derives a raw read. Returns canonical fields keyed by role;
 *  callers add their own display/derived fields (timestampMgr via convertAuditTs_,
 *  the `dateLocal` alias, noteId parsed from `notes`). PHI-free by the AuditLog's
 *  own contract (INV-32) — this only re-shapes what the row already holds. */
function auditRowObj_(row) {
  row = row || [];
  return {
    ts:           normalizeAuditTs_(row[AUDIT.TS]),
    empId:        String(row[AUDIT.EMP_ID] == null ? '' : row[AUDIT.EMP_ID]),
    empName:      String(row[AUDIT.EMP_NAME] == null ? '' : row[AUDIT.EMP_NAME]),
    actor:        String(row[AUDIT.ACTOR] == null ? '' : row[AUDIT.ACTOR]),
    action:       String(row[AUDIT.ACTION] == null ? '' : row[AUDIT.ACTION]),
    punchDate:    normalizeDate_(row[AUDIT.PUNCH_DATE]),
    punchTime:    normalizeTime_(row[AUDIT.PUNCH_TIME]),
    isAdjustment: String(row[AUDIT.IS_ADJUSTMENT] == null ? '' : row[AUDIT.IS_ADJUSTMENT]).toUpperCase() === 'TRUE',
    daysBack:     parseInt(row[AUDIT.DAYS_BACK], 10) || 0,
    notes:        String(row[AUDIT.NOTES] == null ? '' : row[AUDIT.NOTES]),
  };
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
  var offRoster = {};   // F(M-11): canonical in-range agent names NOT on the roster
  var rowsMatched = 0;

  for (var i = 0; i < values.length; i++) {
    var rawAgent = String(values[i][CDR.AGENT - 1] || '').trim();
    if (!rawAgent) continue;
    if (isCdrQueueSentinel_(rawAgent)) continue;
    // F(M-11): date-filter BEFORE the roster drop, and record dropped
    // (alias-canonicalized) agents. The roster filter previously discarded
    // off-roster rows outright, so getTeamMetrics' "unmatchedAgents"
    // diagnostic iterated a set that was a subset of the roster by
    // construction — it could NEVER be non-empty (a new CDR agent or a
    // renamed rep never surfaced, INV-66/S42 silently dead).
    var dateIso = cdrRowDateIso_(values[i][CDR.DATE - 1], tz);
    if (!dateIso || dateIso < from || dateIso > to) continue;
    var agent = (aliasMap[rawAgent] && useRoster && nameSet[aliasMap[rawAgent]])
      ? aliasMap[rawAgent] : rawAgent;
    if (useRoster && !nameSet[agent]) { offRoster[aliasMap[rawAgent] || rawAgent] = true; continue; }

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

  var result = { agents: agents, meta: { rowsScanned: values.length, rowsMatched: rowsMatched, columnWarning: colWarning,
    offRosterAgents: Object.keys(offRoster).sort() } };   // F(M-11)
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
  var perRepDaily = {};   // T4 #5/#6: { dateIso: { agent: {rung,answered,missed,pctAnswered,attSeconds} } }

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

    // T4 #5/#6 — per-rep-per-day matrix for the anonymized team-avg + own
    // trend (metricsTeamAvgSeries_ / metricsBuildKpiSeries_ consume this).
    if (!perRepDaily[dateIso]) perRepDaily[dateIso] = {};
    var prd = perRepDaily[dateIso][agent] ||
      (perRepDaily[dateIso][agent] = { rung: 0, answered: 0, missed: 0, _attSum: 0, _attCount: 0 });
    prd.rung += rung; prd.answered += ans; prd.missed += missed;
    if (attSec > 0) { prd._attSum += attSec; prd._attCount++; }
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
  Object.keys(perRepDaily).forEach(function (d) {
    Object.keys(perRepDaily[d]).forEach(function (ag) {
      var p = perRepDaily[d][ag];
      p.pctAnswered = p.rung > 0 ? Math.round((p.answered / p.rung) * 1000) / 10 : 0;
      p.attSeconds = p._attCount > 0 ? Math.round(p._attSum / p._attCount) : 0;
      delete p._attSum; delete p._attCount;
    });
  });

  return { daily: daily, agents: agents, perRepDaily: perRepDaily };
}

// ── T4 #5/#6: anonymized team-avg + Transfers data layer ──────────────────
// All NEW metrics surfaces (the rep-facing team benchmark + the 5-KPI trends)
// build on these. The two pure helpers are Node-pinned; the reader is the
// isolated parallel to getCdrDailyBreakdown_ for the separate Transfer sheet.

/** Pure — parse a "29.79%" (or bare "29.79", or number) into a Number, else
 *  null. Pinned by a Node test. */
function metricsParsePercent_(s) {
  if (s == null || s === '') return null;
  const str = String(s).replace('%', '').replace(/,/g, '').trim();
  if (str === '') return null;
  const n = Number(str);
  return isFinite(n) ? n : null;
}

/** Pure — anonymized team-average series with a minimum-cohort guard (the #5
 *  privacy boundary). `perRepDaily` is { dateIso: { repName: {<valueKey>:num} } };
 *  for each date in `dates` it averages valueKey over the reps that reported,
 *  returning { date, cohort, avg } with avg=null when cohort < minCohort so a
 *  small team can't be back-solved to an individual. Pinned by a Node test. */
function metricsTeamAvgSeries_(perRepDaily, dates, valueKey, minCohort) {
  const min = minCohort || 3;
  return (dates || []).map(function (d) {
    const byRep = (perRepDaily && perRepDaily[d]) || {};
    let sum = 0, count = 0;
    Object.keys(byRep).forEach(function (rep) {
      const v = byRep[rep] ? byRep[rep][valueKey] : null;
      if (v != null && isFinite(v)) { sum += Number(v); count++; }
    });
    return { date: d, cohort: count, avg: count >= min ? Math.round((sum / count) * 10) / 10 : null };
  });
}

/** Pure — combine the rep's OWN per-day value with the anonymized team-avg
 *  (metricsTeamAvgSeries_) for one KPI, aligned to `dates`. Returns
 *  [{ date, own, team, cohort }] (own/team null when absent / cohort-suppressed).
 *  Pinned by a Node test. */
function metricsBuildKpiSeries_(perRepDaily, dates, empName, key, minCohort) {
  var team = metricsTeamAvgSeries_(perRepDaily, dates, key, minCohort);
  return (dates || []).map(function (d, i) {
    var byRep = (perRepDaily && perRepDaily[d]) || {};
    var raw = byRep[empName] ? byRep[empName][key] : null;
    var own = (raw != null && isFinite(raw)) ? Number(raw) : null;
    return { date: d, own: own, team: team[i].avg, cohort: team[i].cohort };
  });
}

/** Isolated reader for the CSR Transfer Historical Data tab — the
 *  getCdrDailyBreakdown_ parallel for transfers. Returns per-rep-per-day
 *  { perRepDaily: { dateIso: { agent: {totalCalls, transferred, transferPct} } },
 *  agents: { agent: {totalCalls, transferred, transferPct, daysActive} } }.
 *  Reads via getDisplayValues() (Date is M/D/YYYY, Transfer % is a string —
 *  the CDR spreadsheet-tz gotcha, INV-64), parses the date with the shared
 *  cdrRowDateIso_, canonicalizes names through the alias map, and filters to
 *  rosterNames when supplied. A future data-source swap touches only this. */
function getCsrTransferPerRepDaily_(from, to, rosterNames) {
  const ss = getCdrSS_();
  const sheet = ss.getSheetByName(CSR_TRANSFER_TAB);
  if (!sheet) return { perRepDaily: {}, agents: {}, meta: { error: 'CSR Transfer Historical Data sheet not found' } };
  const tz = ss.getSpreadsheetTimeZone();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { perRepDaily: {}, agents: {} };
  const range = sheet.getRange(2, 1, lastRow - 1, CSR_TRANSFER_NUM_COLS);
  const displays = range.getDisplayValues();
  const aliasMap = getCdrNameMap_();
  const useRoster = rosterNames && rosterNames.length > 0;
  const nameSet = {};
  if (useRoster) for (let n = 0; n < rosterNames.length; n++) nameSet[rosterNames[n]] = true;
  const perRepDaily = {};
  const agents = {};
  for (let i = 0; i < displays.length; i++) {
    const rawName = String(displays[i][CSRT.NAME] || '').trim();
    if (!rawName) continue;
    const name = (aliasMap[rawName] && useRoster && nameSet[aliasMap[rawName]]) ? aliasMap[rawName] : rawName;
    if (useRoster && !nameSet[name]) continue;
    const dateIso = cdrRowDateIso_(displays[i][CSRT.DATE], tz);
    if (!dateIso || dateIso < from || dateIso > to) continue;
    const totalCalls = Number(String(displays[i][CSRT.TOTAL_CALLS] || '').replace(/,/g, '')) || 0;
    const transferred = Number(String(displays[i][CSRT.TRANSFERRED] || '').replace(/,/g, '')) || 0;
    let pct = metricsParsePercent_(displays[i][CSRT.TRANSFER_PCT]);
    if (pct == null) pct = totalCalls > 0 ? Math.round((transferred / totalCalls) * 1000) / 10 : null;
    if (!perRepDaily[dateIso]) perRepDaily[dateIso] = {};
    perRepDaily[dateIso][name] = { totalCalls: totalCalls, transferred: transferred, transferPct: pct };
    if (!agents[name]) agents[name] = { agent: name, totalCalls: 0, transferred: 0, daysActive: 0, _days: {} };
    const a = agents[name];
    a.totalCalls += totalCalls; a.transferred += transferred;
    if (!a._days[dateIso]) { a._days[dateIso] = true; a.daysActive++; }
  }
  Object.keys(agents).forEach(function (k) {
    const a = agents[k];
    a.transferPct = a.totalCalls > 0 ? Math.round((a.transferred / a.totalCalls) * 1000) / 10 : null;
    delete a._days;
  });
  return { perRepDaily: perRepDaily, agents: agents };
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


// ════════════════════════════════════════════════════════════════════════════
//  DASHBOARD METRICS (Time Clock → Dashboard)
//  Period-aggregated own + cohort-guarded team CDR for the Dashboard carousels.
//  Reuses the CDR layer (getCdrAgentMetrics_ / getCsrTransferPerRepDaily_) over a
//  SERVER-resolved period (Yesterday / MTD / YTD), so the 92-day getMyMetricsRange
//  cap (INV-129) doesn't apply — the period is server-controlled, not arbitrary
//  user input. Caller-scoped own; team is ANONYMIZED via the N=3 cohort guard
//  (INV-124). Result-cached per (emp, period) like getMyMetrics.
// ════════════════════════════════════════════════════════════════════════════
var DASHBOARD_PERIOD_KEYS = ['yesterday', 'mtd', 'ytd'];

/** Pure (Node-pinned) — resolve a period key to {from,to,label} given today's
 *  ISO date (yyyy-MM-dd, in the caller's tz). String/UTC math only. */
function dashboardPeriodRange_(periodKey, todayIso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(todayIso || ''))) return null;
  var y = todayIso.slice(0, 4), m = todayIso.slice(5, 7);
  if (periodKey === 'yesterday') {
    var yi = new Date(Date.parse(todayIso + 'T00:00:00Z') - 86400000);
    var iso = yi.getUTCFullYear() + '-' + String(yi.getUTCMonth() + 1).padStart(2, '0') + '-' + String(yi.getUTCDate()).padStart(2, '0');
    return { from: iso, to: iso, label: 'Yesterday' };
  }
  if (periodKey === 'mtd') return { from: y + '-' + m + '-01', to: todayIso, label: 'Month to date' };
  if (periodKey === 'ytd') return { from: y + '-01-01', to: todayIso, label: 'Year to date' };
  return null;
}

/** Pure (Node-pinned) — team CDR aggregate from getCdrAgentMetrics_'s .agents
 *  map. Cohort = agents with totalRung > 0; team is null below minCohort
 *  (INV-124 — a small team can't be back-solved to an individual). ATT is
 *  answered-weighted across agents. */
function dashboardTeamAggregate_(agentsMap, minCohort) {
  var rung = 0, answered = 0, missed = 0, attWeighted = 0, attDenom = 0, cohort = 0;
  Object.keys(agentsMap || {}).forEach(function (k) {
    var a = agentsMap[k];
    if (!a || !(a.totalRung > 0)) return;
    cohort++;
    rung += a.totalRung; answered += a.totalAnswered || 0; missed += a.totalMissed || 0;
    if (a.attSeconds > 0 && a.totalAnswered > 0) { attWeighted += a.attSeconds * a.totalAnswered; attDenom += a.totalAnswered; }
  });
  if (cohort < minCohort) return { cohort: cohort, team: null };
  return {
    cohort: cohort,
    team: {
      rung: rung, answered: answered, missed: missed,
      pctAnswered: rung > 0 ? Math.round((answered / rung) * 1000) / 10 : 0,
      attSeconds: attDenom > 0 ? Math.round(attWeighted / attDenom) : 0,
    },
  };
}

/** Pure (Node-pinned) — team transfer aggregate from getCsrTransferPerRepDaily_'s
 *  .agents map. Cohort = agents with totalCalls > 0; null below minCohort. */
function dashboardTeamTransfer_(transferAgentsMap, minCohort) {
  var calls = 0, transferred = 0, cohort = 0;
  Object.keys(transferAgentsMap || {}).forEach(function (k) {
    var a = transferAgentsMap[k];
    if (!a || !(a.totalCalls > 0)) return;
    cohort++; calls += a.totalCalls; transferred += a.transferred || 0;
  });
  if (cohort < minCohort) return { cohort: cohort, transfer: null };
  return { cohort: cohort, transfer: { totalCalls: calls, transferred: transferred, transferPct: calls > 0 ? Math.round((transferred / calls) * 1000) / 10 : null } };
}

/** Dashboard carousels — period-aggregated own + cohort-guarded team CDR.
 *  Rep-callable (own is the caller's; team is anonymized per INV-124).
 *  periodKey ∈ DASHBOARD_PERIOD_KEYS. Result-cached per (emp, period) for
 *  CDR_CACHE_TTL, bypassed under the CDR test override (the getMyMetrics
 *  discipline). Returns own:null / team:null when there's no data / cohort < 3. */
function getDashboardMetrics(periodKey) {
  try {
    var emp = getEmployeeInfo_();
    if (!emp) return { error: 'Account not registered.' };
    periodKey = String(periodKey || '');
    if (DASHBOARD_PERIOD_KEYS.indexOf(periodKey) < 0) return { error: 'Unknown period.' };

    var useCache = !(typeof _TEST_OVERRIDE_CDR_SS_ID !== 'undefined' && _TEST_OVERRIDE_CDR_SS_ID);
    var cache = CacheService.getScriptCache();
    var cacheKey = 'dash_metrics_v1:' + emp.id + ':' + periodKey;
    if (useCache) {
      try { var hit = cache.get(cacheKey); if (hit) { var co = JSON.parse(hit); co.cached = true; return co; } } catch (_) {}
    }

    var todayIso = Utilities.formatDate(new Date(), empTz_(emp), 'yyyy-MM-dd');
    var range = dashboardPeriodRange_(periodKey, todayIso);
    if (!range) return { error: 'Unknown period.' };
    var from = range.from, to = range.to;

    var roster = getEmployeeRosterRows_();
    var allNames = [];
    for (var r = 1; r < roster.length; r++) { var nm = String(roster[r][EMP.NAME] || '').trim(); if (nm) allNames.push(nm); }

    var MIN_COHORT = 3;
    var ownDq = (getCdrAgentMetrics_(from, to, [emp.name]).agents || {})[emp.name] || null;
    var teamDqMap = getCdrAgentMetrics_(from, to, allNames).agents || {};
    var ownTr = (getCsrTransferPerRepDaily_(from, to, [emp.name]).agents || {})[emp.name] || null;
    var teamTrMap = getCsrTransferPerRepDaily_(from, to, allNames).agents || {};

    var teamAgg = dashboardTeamAggregate_(teamDqMap, MIN_COHORT);
    var teamTr = dashboardTeamTransfer_(teamTrMap, MIN_COHORT);
    var noteCount = countCallNotesInRange_(emp, from, to);

    var result = {
      periodKey: periodKey, from: from, to: to, label: range.label,
      own: ownDq ? {
        rung: ownDq.totalRung, answered: ownDq.totalAnswered, missed: ownDq.totalMissed,
        pctAnswered: ownDq.pctAnswered, attSeconds: ownDq.attSeconds, attFormatted: ownDq.attFormatted,
        transferPct: ownTr ? ownTr.transferPct : null, calls: ownTr ? ownTr.totalCalls : null,
      } : null,
      team: teamAgg.team ? {
        rung: teamAgg.team.rung, answered: teamAgg.team.answered, missed: teamAgg.team.missed,
        pctAnswered: teamAgg.team.pctAnswered, attSeconds: teamAgg.team.attSeconds,
        transferPct: teamTr.transfer ? teamTr.transfer.transferPct : null,
      } : null,
      cohort: teamAgg.cohort,
      noteCount: noteCount,
      noteCoverage: cnNoteCoverage_(noteCount, ownDq ? ownDq.totalAnswered : 0),
      kpiMinCohort: MIN_COHORT,
    };
    if (useCache) { try { cache.put(cacheKey, JSON.stringify(result), CONFIG.CDR_CACHE_TTL); } catch (_) {} }
    return result;
  } catch (err) { return { error: err.message }; }
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

    // L-1 — this self-view is the only rep-facing CDR read, and it scans the
    // WHOLE roster's per-rep matrix (INV-124 team average) PLUS the Transfer
    // sheet, UNCACHED, on every open. Cache the assembled result per
    // (rep, date) for CDR_CACHE_TTL so a tab re-enter / date toggle doesn't
    // re-scan. Same staleness tradeoff as getMetricsAmbient and the Clock
    // coverage strip — a just-filed note surfaces within the TTL. Keyed by
    // emp.id so no rep ever reads another rep's cached self-view.
    var metricsCache = CacheService.getScriptCache();
    var myCacheKey = 'metrics_my_v1:' + emp.id + ':' + date;
    // Bypass the endpoint cache whenever a test points the CDR reader at a
    // fixture/bogus id (the getCdrSS_ override pattern) — otherwise a stale
    // entry from a prior fixture read would mask a later test's CDR state
    // (e.g. the cdrUnavailableErrors error-path test). Always active in prod
    // (the override is undefined there).
    var useMetricsCache = !(typeof _TEST_OVERRIDE_CDR_SS_ID !== 'undefined' && _TEST_OVERRIDE_CDR_SS_ID);
    if (useMetricsCache) {
      try {
        var cachedMy = metricsCache.get(myCacheKey);
        if (cachedMy) { var co = JSON.parse(cachedMy); co.cached = true; return co; }
      } catch (_) {}
    }

    // Compute 30-day window ending on `date`
    var endD = new Date(date + 'T12:00:00Z');
    var startD = new Date(endD.getTime() - 29 * 86400000);
    var trendFrom = isoFromUtc_(startD);
    var trendTo = date;

    // T4 #5/#6 — read the WHOLE roster's per-rep-per-day matrix so the team
    // average can be computed (anonymized, cohort-guarded). Only AGGREGATES
    // leave the server; no individual rep's row is ever returned to the caller.
    var roster = getEmployeeRosterRows_();
    var allNames = [];
    for (var r = 1; r < roster.length; r++) {
      var nm = String(roster[r][EMP.NAME] || '').trim();
      if (nm) allNames.push(nm);
    }
    var breakdown = getCdrDailyBreakdown_(trendFrom, trendTo, allNames);
    var transfer = getCsrTransferPerRepDaily_(trendFrom, trendTo, allNames);
    var dqPRD = breakdown.perRepDaily || {};
    var trPRD = transfer.perRepDaily || {};

    var todayResult = getCdrAgentMetrics_(date, date, [emp.name]);
    var todayCdr = todayResult.agents[emp.name] || null;

    // Date axis for the 30-day window.
    var dates = [];
    for (var d = new Date(startD); d <= endD; d.setUTCDate(d.getUTCDate() + 1)) dates.push(isoFromUtc_(d));

    // Legacy own % Answered trend (back-compat for the current client) — now
    // sourced from the rep's own row in the all-reps perRepDaily matrix.
    var trend = dates.map(function (iso) {
      var own = dqPRD[iso] && dqPRD[iso][emp.name];
      return {
        date: iso,
        pctAnswered: own ? own.pctAnswered : null,
        rung: own ? own.rung : 0,
        answered: own ? own.answered : 0,
        missed: own ? own.missed : 0,
      };
    });

    // 5-KPI own-vs-team series (#6); team values are anonymized via the N=3
    // cohort guard (#5). Transfers come from the separate Transfer sheet.
    var MIN_COHORT = 3;
    var series = {
      pctAnswered: metricsBuildKpiSeries_(dqPRD, dates, emp.name, 'pctAnswered', MIN_COHORT),
      answered:    metricsBuildKpiSeries_(dqPRD, dates, emp.name, 'answered', MIN_COHORT),
      missed:      metricsBuildKpiSeries_(dqPRD, dates, emp.name, 'missed', MIN_COHORT),
      attSeconds:  metricsBuildKpiSeries_(dqPRD, dates, emp.name, 'attSeconds', MIN_COHORT),
      transferPct: metricsBuildKpiSeries_(trPRD, dates, emp.name, 'transferPct', MIN_COHORT),
    };

    var noteCount = countCallNotesInRange_(emp, date, date);

    var result = {
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
      series: series,
      kpiMinCohort: MIN_COHORT,
    };
    if (useMetricsCache) {
      try { metricsCache.put(myCacheKey, JSON.stringify(result), CONFIG.CDR_CACHE_TTL); } catch (_) {}
    }
    return result;
  } catch (err) { return { error: err.message }; }
}

/**
 * My Stats over a date RANGE (deferred #1). Caller-scoped self-view: aggregates
 * the calling rep's own CDR over [from, to] (reusing getCdrAgentMetrics_ for the
 * rep's name) + a per-day trend (getCdrDailyBreakdown_) for the hero/rail
 * sparklines + the rep's note count/coverage over the range. Range-capped at 92
 * days. Returns ONLY the rep's own aggregates (no team/other-rep data and no
 * own-vs-team series — that anonymized series is a single-day-anchored concept,
 * INV-124). Shape mirrors getMyMetrics's cdr block so the client renderer is shared.
 */
function getMyMetricsRange(from, to) {
  try {
    var emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    if (!from || !/^\d{4}-\d{2}-\d{2}$/.test(from)) return { error: 'Invalid start date (expected yyyy-MM-dd).' };
    if (!to || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return { error: 'Invalid end date (expected yyyy-MM-dd).' };
    if (from > to) return { error: 'Start date must be on or before end date.' };
    var spanDays = Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000) + 1;
    if (spanDays > 92) return { error: 'Range capped at 92 days.' };

    var agg = getCdrAgentMetrics_(from, to, [emp.name]);
    var c = (agg && agg.agents && agg.agents[emp.name]) || null;

    // Per-day trend across the range for the sparklines (own row only).
    var trend = [];
    try {
      var bd = getCdrDailyBreakdown_(from, to, [emp.name]);
      var prd = (bd && bd.perRepDaily) || {};
      var endD = new Date(to + 'T12:00:00Z');
      for (var d = new Date(from + 'T12:00:00Z'); d <= endD; d.setUTCDate(d.getUTCDate() + 1)) {
        var iso = isoFromUtc_(d);
        var own = prd[iso] && prd[iso][emp.name];
        trend.push({
          date: iso,
          pctAnswered: own ? own.pctAnswered : null,
          answered: own ? own.answered : 0,
          missed: own ? own.missed : 0,
        });
      }
    } catch (e) { trend = []; }

    var noteCount = countCallNotesInRange_(emp, from, to);
    return {
      from: from, to: to, repName: emp.name,
      cdr: c ? {
        totalRung:    c.totalRung,
        totalAnswered: c.totalAnswered,
        totalMissed:  c.totalMissed,
        pctAnswered:  c.pctAnswered,
        tttFormatted: c.tttFormatted,
        attFormatted: c.attFormatted,
        tttSeconds:   c.tttSeconds,
        attSeconds:   c.attSeconds,
      } : null,
      noteCount: noteCount,
      noteCoverage: cnNoteCoverage_(noteCount, c ? c.totalAnswered : 0),
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

    // Direction 1: CDR agents NOT on the team-tools roster. F(M-11): sourced
    // from the reader's offRosterAgents (recorded BEFORE its roster filter) —
    // cdrResult.agents is roster-filtered by construction, so the old loop
    // over its keys could never find an unmatched agent.
    unmatchedAgents = ((cdrResult.meta && cdrResult.meta.offRosterAgents) || []).slice();
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
    // Threshold rides in the cache key (INV-85 versioned-key discipline) so a
    // CDR_ALERT_THRESHOLD change takes effect on the next poll instead of
    // serving a badge computed against the old cutoff for up to the TTL.
    var ambientThreshold = CONFIG.CDR_ALERT_THRESHOLD || 85;
    var ck = 'metrics_ambient_v1:' + ambientThreshold;
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
    var badge = (pct !== null && pct < ambientThreshold)
      ? { type: 'warn', label: pct + '%', date: yIso } : null;
    var out = { badge: badge, pctAnswered: pct, date: yIso, threshold: ambientThreshold };
    try { cache.put(ck, JSON.stringify(out), CONFIG.CDR_CACHE_TTL); } catch (_) {}
    return out;
  } catch (_) { return { badge: null }; }
}

// ════════════════════════════════════════════════════════════════════════════
//  INTAKE MODULE  —  PPD + PMD/PAP account-creation forms
//  Ported from the bound "form-generator" Apps Script (incoming/form-generator).
//  Web-app rewrite: the bound tool used the active sheet's cells as the form;
//  here each form is a web form whose answers arrive as a payload, render a
//  branded email (esc_'d throughout — closing the original's raw-interpolation
//  XSS hole), persist a PHI backup row to the Intake spreadsheet, and write a
//  PHI-free audit row. Two-stage (preview→send), bodyHash-guarded like the
//  Call Notes email flow (INV-41). The PPD recommendation engine
//  (intakeFilterRecommendations_) is server-authoritative + Node-tested.
// ════════════════════════════════════════════════════════════════════════════

const INTAKE_PPD_SUB_HEADERS  = ['SubmissionId','Timestamp','RepId','RepName','PatientInfo','Language','AnswersJSON','Recommendations','Selections','Recipient'];
const INTAKE_ACCT_SUB_HEADERS = ['SubmissionId','Timestamp','RepId','RepName','PatientInfo','DOB','Language','AnswersJSON','Recipient','ImageCount'];

// Per-form structural layout (0-based FORM_RANGE row index → role). Ported from
// the bound tool's AC_CONFIG / PAP_CONFIG. The question LABELS arrive from the
// client (EN/ES, so no parallel server-side question bank to drift); these
// fixed structural rules stay server-side so styling can't be spoofed.
const INTAKE_PMD_LAYOUT = {
  HEADER_ROWS:             [1, 8, 12, 22],          // 1-based offset rows (matches original HEADER_ROWS check i+1)
  CHECKBOX_ROWS:           [22, 24, 25],
  SECONDARY_QUESTION_ROWS: [2, 10, 19, 20, 23, 26, 28],
  CHECKBOX_WARN_ROWS:      [22],                     // amber check instead of green
  CONDITIONAL_FORMATTING_ROWS: {},
};
const INTAKE_PAP_LAYOUT = {
  HEADER_ROWS:             [1, 8, 12, 19],
  CHECKBOX_ROWS:           [24, 26],
  SECONDARY_QUESTION_ROWS: [3, 10, 20, 21, 22, 25, 27],
  CHECKBOX_WARN_ROWS:      [],
  // 2nd-pass email_styling.md: green=accentSoft/accentDeep, amber=warnSoft/warnDeep.
  CONDITIONAL_FORMATTING_ROWS: {
    19: { 'No': { bg: '#e4f5ec', fg: '#0b6e40' }, 'Yes': { bg: '#fbf1d9', fg: '#8a4500' } },
    21: { 'Less than 5 years': { bg: '#fbf1d9', fg: '#8a4500' }, 'More than 5 years': { bg: '#e4f5ec', fg: '#0b6e40' } },
  },
};

// ── Isolated spreadsheet + config getters (Script Property first) ──────────
function getIntakeSS_() {
  if (typeof _TEST_OVERRIDE_INTAKE_SS_ID !== 'undefined' && _TEST_OVERRIDE_INTAKE_SS_ID) {
    return SpreadsheetApp.openById(_TEST_OVERRIDE_INTAKE_SS_ID);
  }
  const id = PropertiesService.getScriptProperties().getProperty('INTAKE_SS_ID') || CONFIG.INTAKE.SS_ID;
  return SpreadsheetApp.openById(id);
}
function getIntakeSalesEmail_()     { return PropertiesService.getScriptProperties().getProperty('INTAKE_SALES_EMAIL')      || CONFIG.INTAKE.SALES_EMAIL; }
function getIntakeSleepEmail_()     { return PropertiesService.getScriptProperties().getProperty('INTAKE_SLEEP_EMAIL')      || CONFIG.INTAKE.SLEEP_EMAIL; }
function getIntakeBccEmail_()       { return PropertiesService.getScriptProperties().getProperty('INTAKE_BCC_EMAIL')        || CONFIG.INTAKE.BCC_EMAIL; }
function getIntakeAllAgentsEmail_() { return PropertiesService.getScriptProperties().getProperty('INTAKE_ALL_AGENTS_EMAIL') || CONFIG.INTAKE.ALL_AGENTS_EMAIL; }

let _intakeOfferingsCache = null;
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
  }
  return sheet;
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
      if (!rows[i][EMP.EMAIL]) continue;
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

      if (patient.weight > 0) {
        let minCap = 0, maxCap = 999;
        if (product.weightCapacityStr.includes('-')) {
          [minCap, maxCap] = product.weightCapacityStr.split('-').map(n => parseInt(n, 10));
          if (patient.weight < minCap) return false;
          if (patient.weight > maxCap) return false;
        } else {
          maxCap = parseInt(product.weightCapacityStr, 10);
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
function intakeEmailShell_(title, innerHtml) {
  const P = CN_EMAIL_PALETTE;
  return (
    '<div style="margin:0;padding:0;background:' + P.paper + ';">' +
    '<div style="max-width:680px;margin:0 auto;padding:20px 12px;font-family:\'Helvetica Neue\',Arial,sans-serif;color:' + P.ink + ';">' +
      '<table style="width:100%;border-collapse:collapse;margin-bottom:14px;"><tr>' +
        '<td style="width:60px;vertical-align:middle;"><img src="' + P.logoUrl + '" alt="UMS" style="height:46px;display:block;"></td>' +
        '<td style="vertical-align:middle;padding-left:14px;"><h2 style="margin:0;text-align:left;color:' + P.brand + ';font-size:18px;">' + esc_(title) + '</h2></td>' +
      '</tr></table>' +
      '<div style="background:' + P.paperCard + ';border:1px solid ' + P.line + ';border-radius:8px;padding:18px;">' +
        innerHtml +
      '</div>' +
      '<div style="text-align:center;color:' + P.muted + ';font-size:11px;padding:14px 0 0;">UMS Team Tools · Intake</div>' +
    '</div></div>'
  );
}

const INTAKE_PPD_YESNO_QS = ['14','15','16','17','18','19','20','21','22','23','26','27','28','30','31','33','35','36','44'];
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

// rows: [{ qNum, label, value, isHeader, isSecondary }]
function intakeBuildPpdBodyHtml_(patientInfo, rows, recData, selections) {
  const P = CN_EMAIL_PALETTE;
  const s = intakePpdAnswerStyles_();
  let html = '<table style="border-collapse:collapse;width:100%;font-size:14px;">';
  let fieldIdx = 0;
  (rows || []).forEach(function (r) {
    const label = esc_(r.label || '');
    if (r.isHeader) {
      html += '<tr><td colspan="2" style="height:14px;"></td></tr><tr style="background:' + P.brand + ';"><td colspan="2" style="padding:10px;border:1px solid ' + P.line + ';text-align:center;font-weight:bold;color:#ffffff;">' + label + '</td></tr>';
      return;
    }
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
    const qStyle = r.isSecondary ? 'font-weight:normal;font-style:italic;color:' + P.muted2 + ';padding-left:25px;' : 'font-weight:bold;color:' + P.ink + ';';
    const bg = (fieldIdx % 2 === 0) ? P.paperCard : P.brandSoft;
    fieldIdx++;
    html += '<tr style="background:' + bg + ';"><td style="padding:8px;border:1px solid ' + P.line + ';width:50%;' + qStyle + '">' + label + '</td><td style="padding:8px;border:1px solid ' + P.line + ';text-align:center;vertical-align:middle;font-weight:bold;">' + displayAnswer + '</td></tr>';
  });

  // --- Recommendations ---
  html += '<tr><td colspan="2" style="padding:20px 10px 5px 10px;border-top:2px solid ' + P.line + ';"><h3 style="margin:0 0 8px;color:' + P.brand + ';">Recommended HCPCS:</h3>';
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
function intakeRecListHtml_(items, selections) {
  selections = selections || {};
  const P = CN_EMAIL_PALETTE;
  // 2nd-pass email_styling.md: each product is a 2-cell TABLE row (image cell +
  // content cell) — NOT a flex <li> with filter:grayscale, both of which Outlook
  // drops. Rejected rows grey explicitly (bg + muted text), no filter.
  let out = '<table style="width:100%;border-collapse:collapse;font-size:14px;">';
  (items || []).forEach(function (product) {
    const itemId = String(product.hcpcs).replace(/\s+/g, '-');
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
    const title = product.pdfLink
      ? '<a href="' + esc_(product.pdfLink) + '" target="_blank" style="text-decoration:none;color:' + P.info + ';">' + esc_(product.hcpcs) + '</a>'
      : esc_(product.hcpcs);

    const imgCell = product.imageUrl
      ? '<td style="width:110px;padding:10px;border-bottom:1px solid ' + P.line + ';vertical-align:top;background:' + rowBg + ';"><img src="' + esc_(product.imageUrl) + '?v=' + esc_(product.hcpcs) + '" alt="' + esc_(product.hcpcs) + '" style="width:100px;height:auto;border:1px solid ' + P.line + ';display:block;"></td>'
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
      html += '<tr><td colspan="2" style="height:14px;"></td></tr><tr style="background:' + P.brand + ';"><td colspan="2" style="padding:10px;border:1px solid ' + P.line + ';text-align:center;font-weight:bold;color:#ffffff;">' + label + '</td></tr>';
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
      ? 'font-weight:normal;font-style:italic;color:' + P.muted2 + ';padding-left:25px;'
      : 'font-weight:bold;color:' + P.ink + ';';
    const bg = (fieldIdx % 2 === 0) ? P.paperCard : P.brandSoft;
    fieldIdx++;
    html += '<tr style="background:' + bg + ';"><td style="padding:8px;border:1px solid ' + P.line + ';width:50%;' + qStyle + '">' + label + '</td><td style="padding:8px;border:1px solid ' + P.line + ';text-align:center;vertical-align:middle;">' + displayAnswer + '</td></tr>';
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
function intakePreviewPPD(payload) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    payload = payload || {};
    const patientInfo = String(payload.patientInfo || '').trim();
    if (!patientInfo) return { error: 'Enter the Patient Name & Trx# before previewing.' };
    const recData = intakeFilterRecommendations_(payload.answers || {}, getIntakeOfferings_());
    const subject = 'PPD for ' + patientInfo;
    const body = intakeBuildPpdBodyHtml_(patientInfo, payload.rows || [], recData, null);
    const html = intakeEmailShell_(subject, body);
    return { success: true, html: html, subject: subject, recommendations: recData, bodyHash: intakeBodyHash_(body, subject) };
  } catch (err) { return { error: err.message }; }
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
    const baseBody = intakeBuildPpdBodyHtml_(patientInfo, payload.rows || [], recData, null);
    // The hash is REQUIRED (L2 — parity with emailFromCallNote/INV-41): a
    // direct RPC without it must not bypass the preview gate.
    if (!expectedBodyHash) {
      return { success: false, error: 'Missing preview hash — open Preview and send from there.' };
    }
    if (intakeBodyHash_(baseBody, subject) !== expectedBodyHash) {
      return { success: false, error: 'The form changed since you previewed it. Please preview again before sending.' };
    }
    const recipient = intakeResolveRecipient_('PPD', recipientSpec);
    const finalBody = intakeBuildPpdBodyHtml_(patientInfo, payload.rows || [], recData, payload.selections || {});
    const html = intakeEmailShell_(subject, finalBody);

    MailApp.sendEmail({ to: recipient, bcc: getIntakeBccEmail_(), subject: subject, htmlBody: html });

    const submissionId = Utilities.getUuid();
    try {
      getIntakeSubmissionSheet_('PPD').appendRow([
        submissionId, fmtDate_(new Date()) + ' ' + fmtTime_(new Date()), emp.id, emp.name,
        patientInfo, String(payload.language || 'EN'),
        JSON.stringify(payload.answers || {}), JSON.stringify(recData),
        JSON.stringify(payload.selections || {}), recipient,
      ]);
    } catch (e) { console.warn('intake PPD submission store failed: ' + e.message); }

    writeAuditLog_(emp, 'IntakeSent', fmtDate_(new Date()), '', false, 0,
      'type=PPD; submissionId=' + submissionId + '; recipientDomain=' + intakeEmailDomain_(recipient), emp.email);

    return { success: true, recipient: recipient, submissionId: submissionId };
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
  const body = intakeBuildAcctBodyHtml_(payload.rows || [], layout);
  const html = intakeEmailShell_(subject, body);
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

  const body = intakeBuildAcctBodyHtml_(payload.rows || [], layout);
  // Hash REQUIRED (L2) — same preview-gate parity as intakeSendPPD.
  if (!expectedBodyHash) {
    return { success: false, error: 'Missing preview hash — open Preview and send from there.' };
  }
  if (intakeBodyHash_(body, subject) !== expectedBodyHash) {
    return { success: false, error: 'The form changed since you previewed it. Please preview again before sending.' };
  }
  const recipient = intakeResolveRecipient_(formType, recipientSpec);

  // Images ride at send only (not part of the preview hash). Append the image
  // section to the inner body, then wrap — no brittle string surgery.
  let innerBody = body;
  let inlineImagesObj = {};
  const imgCount = (images && images.length) ? Math.min(images.length, CONFIG.INTAKE.MAX_IMAGES) : 0;
  if (imgCount > 0) {
    const decoded = intakeDecodeImages_(images);
    inlineImagesObj = decoded.inlineImagesObj;
    innerBody += decoded.sectionHtml;
  }
  const htmlBody = intakeEmailShell_(subject, innerBody);

  MailApp.sendEmail({ to: recipient, bcc: getIntakeBccEmail_(), subject: subject, htmlBody: htmlBody, inlineImages: inlineImagesObj });

  const submissionId = Utilities.getUuid();
  try {
    getIntakeSubmissionSheet_(formType).appendRow([
      submissionId, fmtDate_(new Date()) + ' ' + fmtTime_(new Date()), emp.id, emp.name,
      patientInfo, dob, String(payload.language || 'EN'),
      JSON.stringify(payload.answers || {}), recipient, imgCount,
    ]);
  } catch (e) { console.warn('intake ' + formType + ' submission store failed: ' + e.message); }

  writeAuditLog_(emp, 'IntakeSent', fmtDate_(new Date()), '', false, 0,
    'type=' + formType + '; submissionId=' + submissionId + '; recipientDomain=' + intakeEmailDomain_(recipient) + '; images=' + imgCount, emp.email);

  return { success: true, recipient: recipient, submissionId: submissionId };
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

const INTAKE_FORM_TYPES_ = ['PPD', 'PMD', 'PAP'];
const INTAKE_LIST_CAP_ = 100;

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
      const width = isPpd ? INTAKE_PPD_SUB_HEADERS.length : INTAKE_ACCT_SUB_HEADERS.length;
      const rows = sheet.getRange(2, 1, last - 1, width).getValues();
      for (let i = 0; i < rows.length; i++) {
        const repId = String(rows[i][2] || '').trim();
        if (!emp.isManager && repId !== emp.id) continue;
        out.push({
          formType: ft,
          submissionId: String(rows[i][0] || ''),
          timestamp: intakeTsString_(rows[i][1]),
          repId: repId,
          repName: String(rows[i][3] || ''),
          patientInfo: String(rows[i][4] || ''),
          language: isPpd ? String(rows[i][5] || 'EN') : String(rows[i][6] || 'EN'),
          recipient: isPpd ? String(rows[i][9] || '') : String(rows[i][8] || ''),
        });
      }
    });
    out.sort(function (a, b) { return b.timestamp.localeCompare(a.timestamp); });
    if (out.length > INTAKE_LIST_CAP_) out.length = INTAKE_LIST_CAP_;
    return { submissions: out, isManager: !!emp.isManager };
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
    const result = {
      formType: ft,
      submissionId: id,
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

// ════════════════════════════════════════════════════════════════════════════
//  REFERENCE / KNOWLEDGE BASE  (Phase 1)
//  Per-department reference articles (markdown source, rendered client-side) +
//  embedded Drive items (Doc/Sheet/file preview) — a navigable, searchable
//  in-app KB. PHI-free by policy. Backed by a dedicated KB spreadsheet
//  (KB_SS_ID), read by the server; reps never open the sheet directly.
// ════════════════════════════════════════════════════════════════════════════
const KB = { ID:0, DEPARTMENT:1, TITLE:2, TYPE:3, BODY_MD:4, DRIVE_KIND:5, DRIVE_FILE_ID:6, SORT_ORDER:7, UPDATED_AT:8, UPDATED_BY:9, REVIEWED_AT:10, REVIEWED_BY:11, STATUS:12 };
const KB_HEADERS = ['Id','Department','Title','Type','BodyMd','DriveKind','DriveFileId','SortOrder','UpdatedAt','UpdatedBy','ReviewedAt','ReviewedBy','Status'];
// #4 — draft→publish: a blank/absent Status cell (legacy rows) reads as published.
const KB_STATUS_DRAFT = 'draft';
const KB_STATUS_PUBLISHED = 'published';
function kbRowStatus_(v) { return String(v || '').trim().toLowerCase() === KB_STATUS_DRAFT ? KB_STATUS_DRAFT : KB_STATUS_PUBLISHED; }
const KB_CACHE_KEY = 'kb_tree_v2';   // v2 — items now carry `status` (#4 draft→publish)
const KB_CACHE_TTL = 300;
const KB_BODY_MAX = 49000; // under the 50k Sheets cell limit

function getKbSS_() {
  if (typeof _TEST_OVERRIDE_KB_SS_ID !== 'undefined' && _TEST_OVERRIDE_KB_SS_ID) {
    return SpreadsheetApp.openById(_TEST_OVERRIDE_KB_SS_ID);
  }
  const id = PropertiesService.getScriptProperties().getProperty('KB_SS_ID') || CONFIG.KB.SS_ID;
  return SpreadsheetApp.openById(id);
}
function getOrCreateKbSheet_() {
  const ss = getKbSS_();
  let sheet = ss.getSheetByName(CONFIG.KB.TAB);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.KB.TAB);
    sheet.appendRow(KB_HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, KB_HEADERS.length).setFontWeight('bold');
  } else {
    // #4 back-compat — widen the header row if new trailing columns
    // (ReviewedAt/ReviewedBy) were appended to KB_HEADERS since this sheet was
    // provisioned. Code indexes by the KB enum so header names are decorative,
    // but this keeps the sheet self-documenting. One-time + self-healing (the
    // guard passes once migrated) — same "provision on first touch" pattern as
    // getCallNotesSheet_.
    const hdr = sheet.getRange(1, 1, 1, KB_HEADERS.length).getValues()[0];
    if (String(hdr[KB_HEADERS.length - 1]) !== KB_HEADERS[KB_HEADERS.length - 1]) {
      sheet.getRange(1, 1, 1, KB_HEADERS.length).setValues([KB_HEADERS]).setFontWeight('bold');
    }
  }
  return sheet;
}
function invalidateKbCache_() {
  try { CacheService.getScriptCache().remove(KB_CACHE_KEY); } catch (_) {}
  // Phase A — bump the AI-guidance generation salt so cached guidance built
  // on the pre-edit KB content stops being served (the cache key embeds it).
  try {
    const p = PropertiesService.getScriptProperties();
    const g = parseInt(p.getProperty(KB_AI_GEN_PROP) || '0', 10) || 0;
    p.setProperty(KB_AI_GEN_PROP, String(g + 1));
  } catch (_) {}
}

// Parse a Google Drive/Docs/Sheets share URL into { kind, fileId }. kind ∈
// doc | sheet | file. Returns null when no file id can be extracted.
function kbParseDriveUrl_(url) {
  const u = String(url || '').trim();
  if (!u) return null;
  let m;
  if ((m = u.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/))) return { kind: 'sheet', fileId: m[1] };
  if ((m = u.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/)))     return { kind: 'doc',   fileId: m[1] };
  if ((m = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)))        return { kind: 'file',  fileId: m[1] };
  if ((m = u.match(/[?&]id=([a-zA-Z0-9_-]+)/)))                              return { kind: 'file',  fileId: m[1] };
  return null;
}
function kbEmbedUrl_(kind, fileId) {
  const id = encodeURIComponent(String(fileId || ''));
  if (kind === 'sheet') return 'https://docs.google.com/spreadsheets/d/' + id + '/preview';
  if (kind === 'file')  return 'https://drive.google.com/file/d/' + id + '/preview';
  return 'https://docs.google.com/document/d/' + id + '/preview';
}
function kbOpenUrl_(kind, fileId) {
  const id = encodeURIComponent(String(fileId || ''));
  if (kind === 'sheet') return 'https://docs.google.com/spreadsheets/d/' + id + '/edit';
  if (kind === 'file')  return 'https://drive.google.com/file/d/' + id + '/view';
  return 'https://docs.google.com/document/d/' + id + '/edit';
}

// ── Rep-callable reads (require an enrolled employee; read-only) ──────────
function getReferenceTree() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const cache = CacheService.getScriptCache();
    let cached = null;
    try { cached = cache.get(KB_CACHE_KEY); } catch (_) {}
    // The cache holds ALL items (incl. drafts, each tagged with status); the
    // draft filter is applied per-viewer below so one cache blob serves both.
    const filterForViewer = function (all) {
      return emp.isAdmin ? all : all.filter(function (it) { return it.status !== KB_STATUS_DRAFT; });
    };
    if (cached) {
      const o = JSON.parse(cached);
      return { items: filterForViewer(o.items || []), isManager: !!emp.isManager, isAdmin: !!emp.isAdmin };
    }
    const sheet = getOrCreateKbSheet_();
    const last = sheet.getLastRow();
    const items = [];
    if (last >= 2) {
      const rows = sheet.getRange(2, 1, last - 1, KB_HEADERS.length).getValues();
      rows.forEach(function (r) {
        if (!r[KB.ID]) return;
        items.push({
          id: String(r[KB.ID]), department: String(r[KB.DEPARTMENT] || 'General'),
          title: String(r[KB.TITLE] || '(untitled)'), type: String(r[KB.TYPE] || 'article'),
          driveKind: String(r[KB.DRIVE_KIND] || ''), sortOrder: Number(r[KB.SORT_ORDER] || 0),
          status: kbRowStatus_(r[KB.STATUS]),   // #4 — 'published' | 'draft'
        });
      });
    }
    items.sort(function (a, b) { return a.department.localeCompare(b.department) || (a.sortOrder - b.sortOrder) || a.title.localeCompare(b.title); });
    try { cache.put(KB_CACHE_KEY, JSON.stringify({ items: items }), KB_CACHE_TTL); } catch (_) {}
    return { items: filterForViewer(items), isManager: !!emp.isManager, isAdmin: !!emp.isAdmin };
  } catch (err) { return { error: err.message }; }
}

function getReferenceItem(id) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    id = String(id || '').trim();
    const sheet = getOrCreateKbSheet_();
    const last = sheet.getLastRow();
    if (last < 2) return { error: 'Not found.' };
    const rows = sheet.getRange(2, 1, last - 1, KB_HEADERS.length).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][KB.ID]) !== id) continue;
      // #4 — a draft is invisible to reps/non-admins (indistinguishable from
      // not-found so its existence doesn't leak).
      const status = kbRowStatus_(rows[i][KB.STATUS]);
      if (status === KB_STATUS_DRAFT && !emp.isAdmin) return { error: 'Not found.' };
      const type = String(rows[i][KB.TYPE] || 'article');
      const base = { id: id, title: String(rows[i][KB.TITLE] || ''), department: String(rows[i][KB.DEPARTMENT] || ''), status: status };
      if (type === 'embed') {
        const kind = String(rows[i][KB.DRIVE_KIND] || 'doc');
        const fid = String(rows[i][KB.DRIVE_FILE_ID] || '');
        base.type = 'embed'; base.driveKind = kind; base.embedUrl = kbEmbedUrl_(kind, fid); base.openUrl = kbOpenUrl_(kind, fid);
        return base;
      }
      base.type = 'article'; base.bodyMd = String(rows[i][KB.BODY_MD] || '');
      return base;
    }
    return { error: 'Not found.' };
  } catch (err) { return { error: err.message }; }
}

// ── "What's new" panel (#4, INV-152) ─────────────────────────────────────────
// A dismissible in-app changelog: Script Property WHATSNEW_KB_ID points at a
// PUBLISHED KB *article* (the operator maintains it in Reference like any other
// article — same kbMd_ authoring + escape boundary); the shell auto-opens it
// once per content change via a localStorage seen-stamp (umsWhatsNew, the
// umsTour pattern). Rep-callable, read-only; every quiet-failure path (unset
// property, missing/draft/embed item, any throw) returns { none: true } so the
// feature is dormant until configured and can never break boot.
function getWhatsNew() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { none: true };
    const id = String(PropertiesService.getScriptProperties().getProperty('WHATSNEW_KB_ID') || '').trim();
    if (!id) return { none: true };
    const sheet = getOrCreateKbSheet_();
    const last = sheet.getLastRow();
    if (last < 2) return { none: true };
    const ssTz = getKbSS_().getSpreadsheetTimeZone();
    // F(cycle-8): id-COLUMN scan + one full-row fetch (the findCallNoteRow_
    // pattern). This fires on every Dashboard load for every rep, and the old
    // full-tab read pulled all 13 columns INCLUDING every article's BodyMd —
    // read volume that grew with total KB body size × page loads.
    const ids = sheet.getRange(2, KB.ID + 1, last - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) !== id) continue;
      const row = sheet.getRange(i + 2, 1, 1, KB_HEADERS.length).getValues()[0];
      // A DRAFT stays invisible to EVERYONE here (INV-140/147 — this is a
      // broadcast surface; an admin previews drafts in Reference, not here),
      // and only native articles render (an embed has no body for kbMd_).
      if (kbRowStatus_(row[KB.STATUS]) === KB_STATUS_DRAFT) return { none: true };
      if (String(row[KB.TYPE] || 'article') !== 'article') return { none: true };
      return {
        id: id,
        title: String(row[KB.TITLE] || 'What\'s new'),
        bodyMd: String(row[KB.BODY_MD] || ''),
        // The edit-time stamp drives the client seen-flag — editing the
        // article re-surfaces the panel for everyone (datetime-granular via
        // kbCellTs_, recovered in the KB sheet's own tz).
        stamp: kbCellTs_(row[KB.UPDATED_AT], ssTz),
      };
    }
    return { none: true };
  } catch (err) { return { none: true }; }
}

// ── Section-aware search ──────────────────────────────────────────────────
// Results are heading-delimited CHUNKS of articles (read inline, jump to the
// section in the full doc), not just doc titles — multiple chunks from
// multiple docs surface side by side. Embeds have no stored content, so they
// match on title only (another native-first nudge).
const KB_SEARCH_MAX_RESULTS = 20;
const KB_SEARCH_MAX_PER_ITEM = 3;
const KB_CHUNK_MAX_CHARS = 1200;
// #8 — search synonym groups (Script Property `KB_SEARCH_SYNONYMS`, JSON array
// of arrays of equivalent lowercase terms, e.g. [["cpap","pap"],["pmd","power
// chair"]]). Token-level: a query token in a group pulls in the other members'
// tokens so "cpap" also matches "pap". Admin-editable via kbSaveSearchConfig.
const KB_SYNONYMS_PROP = 'KB_SEARCH_SYNONYMS';
const KB_SYNONYM_GROUPS_MAX = 100;
const KB_SYNONYM_TERMS_MAX = 20;      // per group
const KB_SYNONYM_TERM_MAXLEN = 40;
const KB_SEARCH_TOKENS_MAX = 40;      // cap after synonym expansion
// #7 — "See also" from KbViews co-occurrence (no AI, just counting): items a rep
// opened in the same (rep, day) session as the current one, ranked by co-views.
const KB_RELATED_MIN_COVIEWS = 2;     // silent below this — thin data shows nothing
const KB_RELATED_TOP = 5;

/** Shared anchor slug — MUST stay identical to the client `kbSlug_` in
 *  kb/script_kb.html (kbMd_ stamps id="kb-h-<slug>" on headings; search
 *  results carry the server-computed anchor for the jump-to-section link).
 *  The entity de-escape keeps the two identical even though the client slugs
 *  ESCAPED source (kbMd_ escapes &/</> up front) while the server slugs raw
 *  markdown. Pinned by a Node parity test. */
function kbSlug_(text) {
  return String(text || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** PURE: split article markdown into heading-delimited sections —
 *  [{heading, anchor, md}]. `md` EXCLUDES its heading line (chunk cards
 *  render the heading separately). The preamble before the first heading is
 *  a section with heading ''. Headings inside ``` fences don't split (kbMd_
 *  masks fences before its heading rule — same contract). Duplicate-heading
 *  anchors dedupe with -2/-3… in document order, matching kbMd_'s ids. */
function kbSplitSections_(bodyMd) {
  const lines = String(bodyMd || '').split(/\r?\n/);
  const sections = [];
  let cur = { heading: '', anchor: '', md: [] };
  let inFence = false;
  const seen = {};
  const push = function () {
    if (cur.heading || cur.md.join('\n').trim()) {
      sections.push({ heading: cur.heading, anchor: cur.anchor, md: cur.md.join('\n').trim() });
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*```/.test(ln)) inFence = !inFence;
    const h = !inFence && ln.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      push();
      let anchor = kbSlug_(h[2]);
      if (anchor) {
        seen[anchor] = (seen[anchor] || 0) + 1;
        if (seen[anchor] > 1) anchor += '-' + seen[anchor];
      }
      cur = { heading: h[2].trim(), anchor: anchor, md: [] };
    } else {
      cur.md.push(ln);
    }
  }
  push();
  return sections;
}

/** PURE: cap a chunk at a paragraph boundary; repair an odd fence count so a
 *  truncated chunk never renders a runaway <pre>. */
function kbChunkTruncate_(md, cap) {
  md = String(md || '');
  cap = cap || KB_CHUNK_MAX_CHARS;
  if (md.length <= cap) return { md: md, truncated: false };
  let cut = md.lastIndexOf('\n\n', cap);
  if (cut < cap * 0.4) cut = cap;
  let out = md.substring(0, cut).trim();
  const fences = (out.match(/^\s*```/gm) || []).length;
  if (fences % 2 === 1) out += '\n```';
  return { md: out, truncated: true };
}

/** PURE: weighted token score for one section. 0 unless the section's own
 *  text (heading or body) matches at least one token — a title-only match
 *  must NOT flood every section of that doc into the results (the caller
 *  emits a single doc-level hit for that case instead). Heading hits (2)
 *  outrank body hits (1); title hits add 3 per token on qualifying sections;
 *  an exact-phrase hit adds 2. */
function kbSearchScore_(tokens, q, titleLc, headLc, bodyLc) {
  let score = 0;
  let sectionHit = false;
  tokens.forEach(function (t) {
    if (headLc.indexOf(t) >= 0) { score += 2; sectionHit = true; }
    else if (bodyLc.indexOf(t) >= 0) { score += 1; sectionHit = true; }
  });
  if (!sectionHit) return 0;
  tokens.forEach(function (t) { if (titleLc.indexOf(t) >= 0) score += 3; });
  if (q.length >= 4 && (headLc.indexOf(q) >= 0 || bodyLc.indexOf(q) >= 0)) score += 2;
  return score;
}

function searchReference(query, opts) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    // F(M-12): publishedOnly forces the draft skip REGARDLESS of caller role.
    // Public-callable and narrowing-only, so it can't widen anyone's access.
    // Used by kbGetFacetGuidance — its result caches ORG-WIDE (no viewer role
    // in the key), so admin-triggered retrieval must never include drafts or
    // reps get guidance text + source titles derived from unpublished content.
    const publishedOnly = !!(opts && opts.publishedOnly);
    const q = String(query || '').trim().toLowerCase();
    if (q.length < 2) return { results: [] };
    const tokens = [];
    (q.match(/[a-z0-9]{2,}/g) || []).forEach(function (t) { if (tokens.indexOf(t) < 0) tokens.push(t); });
    if (!tokens.length) return { results: [] };
    kbExpandSynonymTokens_(tokens);   // #8 — pull in synonym-group siblings
    const sheet = getOrCreateKbSheet_();
    const last = sheet.getLastRow();
    if (last < 2) return { results: [] };
    const rows = sheet.getRange(2, 1, last - 1, KB_HEADERS.length).getValues();
    const hits = [];
    const snippetOf = function (md) {
      return md.replace(/[#*`>|\[\]()!]/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 120);
    };
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i][KB.ID]) continue;
      // #4 — drafts never surface in search to non-admins (nor to ANY caller
      // when publishedOnly is forced — the org-wide-cached AI retrieval path).
      if (kbRowStatus_(rows[i][KB.STATUS]) === KB_STATUS_DRAFT && (publishedOnly || !emp.isAdmin)) continue;
      const id = String(rows[i][KB.ID]);
      const title = String(rows[i][KB.TITLE] || '');
      const dept = String(rows[i][KB.DEPARTMENT] || '');
      const type = String(rows[i][KB.TYPE] || 'article');
      const titleLc = title.toLowerCase();
      let titleScore = 0;
      tokens.forEach(function (t) { if (titleLc.indexOf(t) >= 0) titleScore += 3; });
      if (type === 'embed') {
        // No stored content to chunk — title-only hit.
        if (titleScore > 0) {
          hits.push({ id: id, title: title, department: dept, type: 'embed',
            heading: '', anchor: '', chunkMd: '', truncated: false, score: titleScore, snippet: '' });
        }
        continue;
      }
      const sections = kbSplitSections_(String(rows[i][KB.BODY_MD] || ''));
      const secHits = [];
      sections.forEach(function (s) {
        const score = kbSearchScore_(tokens, q, titleLc, s.heading.toLowerCase(), s.md.toLowerCase());
        if (score > 0) secHits.push({ section: s, score: score });
      });
      if (!secHits.length) {
        if (titleScore > 0) {
          hits.push({ id: id, title: title, department: dept, type: 'article',
            heading: '', anchor: '', chunkMd: '', truncated: false, score: titleScore, snippet: '' });
        }
        continue;
      }
      secHits.sort(function (a, b) { return b.score - a.score; });
      secHits.slice(0, KB_SEARCH_MAX_PER_ITEM).forEach(function (sh) {
        const cut = kbChunkTruncate_(sh.section.md, KB_CHUNK_MAX_CHARS);
        hits.push({ id: id, title: title, department: dept, type: 'article',
          heading: sh.section.heading, anchor: sh.section.anchor,
          chunkMd: cut.md, truncated: cut.truncated, score: sh.score,
          snippet: snippetOf(cut.md) });
      });
    }
    hits.sort(function (a, b) { return b.score - a.score; });
    if (hits.length > KB_SEARCH_MAX_RESULTS) hits.length = KB_SEARCH_MAX_RESULTS;
    return { results: hits, sectioned: true };
  } catch (err) { return { error: err.message }; }
}

// #8 — search synonym groups. Read the Script Property, sanitize to an array of
// ≥2-term lowercase groups (never throws — corrupt blob degrades to []).
function getKbSearchSynonyms_() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty(KB_SYNONYMS_PROP);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const groups = [];
    parsed.forEach(function (g) {
      if (!Array.isArray(g)) return;
      const terms = [];
      g.forEach(function (t) {
        const s = String(t == null ? '' : t).trim().toLowerCase();
        if (s && terms.indexOf(s) < 0) terms.push(s);
      });
      if (terms.length >= 2) groups.push(terms);
    });
    return groups;
  } catch (e) { return []; }
}

/** #8 — expand a query's token set in place: if any token is in a synonym group,
 *  pull in the group's other tokens (multi-word terms split into alnum tokens),
 *  capped at KB_SEARCH_TOKENS_MAX. So "cpap" also matches "pap". */
function kbExpandSynonymTokens_(tokens) {
  const groups = getKbSearchSynonyms_();
  if (!groups.length) return tokens;
  const have = {}; tokens.forEach(function (t) { have[t] = 1; });
  groups.forEach(function (g) {
    const set = [];
    g.forEach(function (term) {
      (term.match(/[a-z0-9]{2,}/g) || []).forEach(function (tk) { if (set.indexOf(tk) < 0) set.push(tk); });
    });
    if (!set.some(function (tk) { return have[tk]; })) return;   // no query token in this group
    set.forEach(function (tk) {
      if (!have[tk] && tokens.length < KB_SEARCH_TOKENS_MAX) { tokens.push(tk); have[tk] = 1; }
    });
  });
  return tokens;
}

/** #8 — admin-gated read/write of the search synonym groups. */
function kbGetSearchConfig() {
  const emp = getEmployeeInfo_();
  if (!emp || !emp.isAdmin) return { error: 'Admin access required.' };
  return { synonyms: getKbSearchSynonyms_() };
}
function kbSaveSearchConfig(groups) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { success: false, error: 'Admin access required.' };
    if (!Array.isArray(groups)) return { success: false, error: 'Invalid synonyms.' };
    if (groups.length > KB_SYNONYM_GROUPS_MAX) return { success: false, error: 'Too many synonym groups (max ' + KB_SYNONYM_GROUPS_MAX + ').' };
    const clean = [];
    for (let i = 0; i < groups.length; i++) {
      if (!Array.isArray(groups[i])) continue;
      const terms = [];
      for (let j = 0; j < groups[i].length && terms.length < KB_SYNONYM_TERMS_MAX; j++) {
        const s = String(groups[i][j] == null ? '' : groups[i][j]).trim().toLowerCase().substring(0, KB_SYNONYM_TERM_MAXLEN);
        if (s && terms.indexOf(s) < 0) terms.push(s);
      }
      if (terms.length >= 2) clean.push(terms);   // a group needs ≥2 terms to be meaningful
    }
    PropertiesService.getScriptProperties().setProperty(KB_SYNONYMS_PROP, JSON.stringify(clean));
    writeAuditLog_(emp, 'AdminConfigChange', '', '', false, 0, 'KB search synonyms: ' + clean.length + ' group(s)', emp.email);
    return { success: true, synonyms: clean };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

// ── Usage feedback loop (drawer + Reference reader) ───────────────────────
// Append-only KbViews tab in the KB spreadsheet: one tiny PHI-free row per
// article/embed open (timestamp, itemId, repId, context). Written
// fire-and-forget from the client; aggregated on demand for managers so the
// "most referenced during calls" signal drives conversion/curation priority.
const KB_VIEWS_TAB = 'KbViews';
const KB_VIEWS_HEADERS = ['Timestamp', 'ItemId', 'RepId', 'Context'];
const KB_VIEWS_MAX_SCAN = 4000;   // bounded tail scan, INV-13 spirit
const KB_USAGE_WINDOW_DAYS = 30;
const KB_USAGE_TOP_N = 5;

// ── Self-improving-KB loop: rep freshness signal (#2) + content-gap requests
// (#1). Both feed the manager review workflow. Two new PHI-free-by-policy tabs
// in the KB spreadsheet (the KbViews posture — deployer-only, append-only, zero
// new operator state).
const KB_FEEDBACK_TAB = 'KbFeedback';
const KB_FEEDBACK_HEADERS = ['Timestamp', 'ItemId', 'RepId', 'RepName', 'Kind', 'Note'];
const KBF = { TS: 0, ITEM_ID: 1, REP_ID: 2, REP_NAME: 3, KIND: 4, NOTE: 5 };
const KB_FEEDBACK_KINDS = { helpful: 1, notHelpful: 1, stale: 1 };
const KB_FEEDBACK_NOTE_MAX = 500;
const KB_FEEDBACK_MAX_SCAN = 4000;

const KB_REQUESTS_TAB = 'KbContentRequests';
const KB_REQUESTS_HEADERS = ['Timestamp', 'ReqId', 'RepId', 'RepName', 'Topic', 'Note', 'Query', 'Status', 'ResolvedAt', 'ResolvedBy'];
const KBR = { TS: 0, REQ_ID: 1, REP_ID: 2, REP_NAME: 3, TOPIC: 4, NOTE: 5, QUERY: 6, STATUS: 7, RESOLVED_AT: 8, RESOLVED_BY: 9 };
const KB_REQUEST_TOPIC_MAX = 200;
const KB_REQUEST_NOTE_MAX = 1000;
const KB_REQUESTS_MAX_SCAN = 2000;
const KB_REQUESTS_RESOLVED_TAIL = 10;
const KB_EMBED_SCAN_CAP = 150;   // #3 — max embeds Drive-probed per Storage Health run

// #4 — article revision history. One append-only snapshot of the PRIOR content
// per edit/revert (so a manager can view history + roll back). PHI-free by policy.
const KB_REVISIONS_TAB = 'KbRevisions';
const KB_REVISIONS_HEADERS = ['CapturedAt', 'RevId', 'ItemId', 'Title', 'Type', 'BodyMd', 'DriveKind', 'DriveFileId', 'PriorUpdatedAt', 'PriorUpdatedBy', 'ReplacedBy', 'Action'];
const KBREV = { CAPTURED_AT: 0, REV_ID: 1, ITEM_ID: 2, TITLE: 3, TYPE: 4, BODY_MD: 5, DRIVE_KIND: 6, DRIVE_FILE_ID: 7, PRIOR_UPDATED_AT: 8, PRIOR_UPDATED_BY: 9, REPLACED_BY: 10, ACTION: 11 };
const KB_REVISIONS_MAX_SCAN = 4000;
const KB_REVISIONS_PER_ITEM = 30;   // most-recent snapshots surfaced per item

function getOrCreateKbViewsSheet_() {
  const ss = getKbSS_();
  let sheet = ss.getSheetByName(KB_VIEWS_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(KB_VIEWS_TAB);
    sheet.appendRow(KB_VIEWS_HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, KB_VIEWS_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

/** Rep-callable, append-only, locked (INV-01). Records one view event —
 *  PHI-free by construction (itemId + repId + a sanitized context token).
 *  The client fires it best-effort; an error here never surfaces. */
function kbRecordView(itemId, context) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Not authorized.' };
    const id = String(itemId || '').trim().substring(0, 100);
    if (!id) return { success: false, error: 'Missing item id.' };
    const ctx = String(context || '').replace(/[^a-zA-Z0-9:_-]/g, '').substring(0, 40);
    getOrCreateKbViewsSheet_().appendRow([
      fmtDate_(new Date()) + ' ' + fmtTime_(new Date()), id, emp.id, ctx,
    ]);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Manager-gated, read-only. Top KB_USAGE_TOP_N items by opens in the last
 *  KB_USAGE_WINDOW_DAYS, with the in-call (drawer) share broken out. Bounded
 *  tail scan of KbViews (the tab is append-only/chronological). Timestamp
 *  cells are Sheets-coerced Dates — recovered in the KB spreadsheet's OWN tz
 *  (the tz that coerced them; same discipline as normalizeAuditTs_). */
/** KbViews open-counts per item id over the last `windowDays`. Bounded tail
 *  scan (KB_VIEWS_MAX_SCAN). Returns { id: {count, drawerCount} } (empty map
 *  when the tab is missing/empty or on any failure). Shared by kbGetUsageStats
 *  and kbGetReviewDue (#4 prioritizes review-due items by usage). */
function kbUsageCounts_(windowDays) {
  const out = {};
  try {
    const ss = getKbSS_();
    const sheet = ss.getSheetByName(KB_VIEWS_TAB);
    if (!sheet || sheet.getLastRow() < 2) return out;
    const ssTz = ss.getSpreadsheetTimeZone();
    const lastRow = sheet.getLastRow();
    const startRow = Math.max(2, lastRow - KB_VIEWS_MAX_SCAN + 1);
    const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, KB_VIEWS_HEADERS.length).getValues();
    const cutD = new Date();
    cutD.setDate(cutD.getDate() - windowDays);
    // L-5 — build the cutoff in the KB spreadsheet's OWN tz, the same tz the
    // coerced-Date row timestamps are recovered in below; mixing tzs here
    // could shift the 30-day boundary by a day for rows near the edge.
    const cutoff = fmtDateTz_(cutD, ssTz);
    for (let i = 0; i < data.length; i++) {
      const tsRaw = (data[i][0] instanceof Date)
        ? Utilities.formatDate(data[i][0], ssTz, 'yyyy-MM-dd')
        : String(data[i][0] || '').substring(0, 10);
      if (tsRaw < cutoff) continue;
      const id = String(data[i][1] || '').trim();
      if (!id) continue;
      if (!out[id]) out[id] = { count: 0, drawerCount: 0 };
      out[id].count++;
      if (String(data[i][3] || '').indexOf('drawer') === 0) out[id].drawerCount++;
    }
  } catch (e) { /* best-effort — empty map on any failure */ }
  return out;
}

/** #7 PURE (Node-pinned) — "See also" from co-views. `events` is
 *  [{rep, day, id}] (KbViews rows). Two items are co-viewed when they appear in
 *  the same (rep, day) session; the score is the count of DISTINCT sessions that
 *  co-viewed them with `targetId`. Returns [{id, coviews}] with coviews ≥
 *  minCoviews, ranked desc, capped topN. Below the threshold it's silent, so
 *  thin data shows nothing rather than spurious links. */
function kbCoViewRelated_(events, targetId, minCoviews, topN) {
  minCoviews = minCoviews || 2; topN = topN || 5;
  targetId = String(targetId || '');
  const sessions = {};   // (rep|day) → { id: 1 }  (distinct ids per session)
  (events || []).forEach(function (e) {
    if (!e) return;
    const id = String(e.id || '');
    if (!id) return;
    const key = String(e.rep || '') + '|' + String(e.day || '');
    if (!sessions[key]) sessions[key] = {};
    sessions[key][id] = 1;
  });
  const counts = {};
  Object.keys(sessions).forEach(function (key) {
    const ids = sessions[key];
    if (!ids[targetId]) return;
    Object.keys(ids).forEach(function (id) {
      if (id === targetId) return;
      counts[id] = (counts[id] || 0) + 1;
    });
  });
  return Object.keys(counts)
    .filter(function (id) { return counts[id] >= minCoviews; })
    .map(function (id) { return { id: id, coviews: counts[id] }; })
    .sort(function (a, b) { return (b.coviews - a.coviews) || a.id.localeCompare(b.id); })
    .slice(0, topN);
}

/** #7 — "See also" for the reader. Rep-callable, read-only, bounded KbViews tail
 *  scan. Ranks co-viewed items via the pure kbCoViewRelated_, joins titles from
 *  the KB sheet, drops deleted items + (for non-admins) drafts. PHI-free. */
function kbGetRelated(itemId) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const targetId = String(itemId || '').trim();
    if (!targetId) return { items: [] };
    const ss = getKbSS_();
    const viewsSheet = ss.getSheetByName(KB_VIEWS_TAB);
    if (!viewsSheet || viewsSheet.getLastRow() < 2) return { items: [] };
    const ssTz = ss.getSpreadsheetTimeZone();
    const lastRow = viewsSheet.getLastRow();
    const startRow = Math.max(2, lastRow - KB_VIEWS_MAX_SCAN + 1);
    const data = viewsSheet.getRange(startRow, 1, lastRow - startRow + 1, KB_VIEWS_HEADERS.length).getValues();
    const events = [];
    for (let i = 0; i < data.length; i++) {
      const id = String(data[i][1] || '').trim();
      if (!id) continue;
      const day = (data[i][0] instanceof Date)
        ? Utilities.formatDate(data[i][0], ssTz, 'yyyy-MM-dd')
        : String(data[i][0] || '').substring(0, 10);
      events.push({ rep: String(data[i][2] || ''), day: day, id: id });
    }
    const related = kbCoViewRelated_(events, targetId, KB_RELATED_MIN_COVIEWS, KB_RELATED_TOP);
    if (!related.length) return { items: [] };
    const kbSheet = getOrCreateKbSheet_();
    const kbLast = kbSheet.getLastRow();
    const meta = {};
    if (kbLast >= 2) {
      const krows = kbSheet.getRange(2, 1, kbLast - 1, KB_HEADERS.length).getValues();
      krows.forEach(function (r) {
        const id = String(r[KB.ID] || '');
        if (!id) return;
        meta[id] = { title: String(r[KB.TITLE] || '(untitled)'), department: String(r[KB.DEPARTMENT] || ''),
          type: String(r[KB.TYPE] || 'article'), status: kbRowStatus_(r[KB.STATUS]) };
      });
    }
    const items = [];
    related.forEach(function (rel) {
      const m = meta[rel.id];
      if (!m) return;   // deleted item drops out
      if (m.status === KB_STATUS_DRAFT && !emp.isAdmin) return;   // draft hidden from reps
      items.push({ id: rel.id, title: m.title, department: m.department, type: m.type, coviews: rel.coviews });
    });
    return { items: items };
  } catch (err) { return { error: err.message }; }
}

function kbGetUsageStats() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const counts = kbUsageCounts_(KB_USAGE_WINDOW_DAYS);
    const ids = Object.keys(counts);
    if (!ids.length) return { items: [] };
    // Join titles from the KB sheet (small — one bounded read).
    const titles = {};
    const kbSheet = getOrCreateKbSheet_();
    const kbLast = kbSheet.getLastRow();
    if (kbLast >= 2) {
      const rows = kbSheet.getRange(2, 1, kbLast - 1, 3).getValues();   // Id, Department, Title
      rows.forEach(function (r) { if (r[0]) titles[String(r[0])] = String(r[2] || '(untitled)'); });
    }
    const fb = kbFeedbackCounts_();   // #2 — surface rep helpful/notHelpful tallies
    const items = ids
      .filter(function (id) { return !!titles[id]; })   // deleted items drop out
      .map(function (id) {
        return {
          id: id, title: titles[id], count: counts[id].count, drawerCount: counts[id].drawerCount,
          helpful: (fb[id] && fb[id].helpful) || 0, notHelpful: (fb[id] && fb[id].notHelpful) || 0,
        };
      })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, KB_USAGE_TOP_N);
    return { items: items, windowDays: KB_USAGE_WINDOW_DAYS };
  } catch (err) { return { error: err.message }; }
}

/** Recovers a KB timestamp cell to a yyyy-MM-dd string. Sheets coerces the
 *  'yyyy-MM-dd HH:mm:ss' strings kbSaveItem writes into Date objects on read,
 *  so recover Dates in the KB SPREADSHEET's own tz (the tz that coerced them —
 *  the kbGetUsageStats / normalizeAuditTs_ discipline; NOT the ADP tz). */
function kbCellDateIso_(v, ssTz) {
  if (v instanceof Date) return Utilities.formatDate(v, ssTz, 'yyyy-MM-dd');
  return String(v == null ? '' : v).substring(0, 10);
}

/** Recover a KB timestamp cell to a full 'yyyy-MM-dd HH:mm:ss' string (Sheets
 *  coerces the stored string to a Date on read — recover in the KB sheet's own
 *  tz, the kbCellDateIso_ discipline). Datetime granularity is needed to compare
 *  a stale flag against an item's last-review time (#2 — a same-day review must
 *  clear a stale flag raised earlier that day; a date-only compare couldn't). */
function kbCellTs_(v, ssTz) {
  if (v instanceof Date) return Utilities.formatDate(v, ssTz, 'yyyy-MM-dd HH:mm:ss');
  return String(v == null ? '' : v);
}

/** #4 — manager "Mark reviewed": bumps ReviewedAt/ReviewedBy without touching
 *  content (the "still accurate, no edit needed" path). Manager-gated (INV-02),
 *  locked (INV-01), audited (KbItemReviewed). No cache invalidation needed —
 *  the tree cache doesn't carry review state and kbGetReviewDue reads live. */
function kbMarkReviewed(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { success: false, error: 'Manager access required.' };
    id = String(id || '').trim();
    if (!id) return { success: false, error: 'Missing item id.' };
    const sheet = getOrCreateKbSheet_();
    const last = sheet.getLastRow();
    let found = -1;
    if (last >= 2) {
      const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]) === id) { found = i + 2; break; } }
    }
    if (found < 0) return { success: false, error: 'Item not found.' };
    const now = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
    sheet.getRange(found, KB.REVIEWED_AT + 1, 1, 2).setValues([[now, emp.email]]);
    writeAuditLog_(emp, 'KbItemReviewed', '', '', false, 0, 'id=' + id, emp.email);
    return { success: true, reviewedAt: now };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** #4 — manager review-due queue: KB items whose last review (or, for legacy
 *  rows with no ReviewedAt, last edit) is older than CONFIG.KB.REVIEW_DUE_DAYS,
 *  sorted by 30-day usage desc (polish the most-leaned-on stale guides first).
 *  Manager-gated (INV-02), read-only, PHI-free. */
function kbGetReviewDue() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { error: 'Manager access required.' };
    const dueDays = (CONFIG.KB && CONFIG.KB.REVIEW_DUE_DAYS) || 90;
    const ss = getKbSS_();
    const ssTz = ss.getSpreadsheetTimeZone();
    const sheet = getOrCreateKbSheet_();
    const last = sheet.getLastRow();
    if (last < 2) return { items: [], dueDays: dueDays };
    const rows = sheet.getRange(2, 1, last - 1, KB_HEADERS.length).getValues();
    const usage = kbUsageCounts_(KB_USAGE_WINDOW_DAYS);
    // #2 — a rep "flag as out of date" surfaces the item here regardless of age
    // and sorts it to the top. Build the full-ts last-review map first so
    // kbStaleFlags_ can clear a flag that a later review superseded (the same
    // strictly-newer reset as INV-120, no status column to maintain).
    const reviewedTsByItem = {};
    rows.forEach(function (r) {
      const id = String(r[KB.ID] || '').trim();
      if (id) reviewedTsByItem[id] = kbCellTs_(r[KB.REVIEWED_AT], ssTz);
    });
    const stale = kbStaleFlags_(reviewedTsByItem);
    const fb = kbFeedbackCounts_();
    const todayNum = cnIsoToDayNum_(fmtDate_(new Date()));
    const items = [];
    rows.forEach(function (r) {
      const id = String(r[KB.ID] || '').trim();
      if (!id) return;
      if (kbRowStatus_(r[KB.STATUS]) === KB_STATUS_DRAFT) return;   // #4 — drafts aren't live content to review
      const reviewedIso = kbCellDateIso_(r[KB.REVIEWED_AT], ssTz);
      const updatedIso  = kbCellDateIso_(r[KB.UPDATED_AT], ssTz);
      const baseIso = reviewedIso || updatedIso;   // legacy rows fall back to last edit
      let ageDays = null;
      if (baseIso) { const n = cnIsoToDayNum_(baseIso); if (n != null && todayNum != null) ageDays = todayNum - n; }
      const ageDue = (ageDays == null) || (ageDays >= dueDays);
      const staleCount = (stale[id] && stale[id].count) || 0;
      if (!ageDue && !staleCount) return;
      items.push({
        id: id,
        title: String(r[KB.TITLE] || '(untitled)'),
        department: String(r[KB.DEPARTMENT] || ''),
        type: String(r[KB.TYPE] || 'article'),
        lastReviewedIso: reviewedIso || null,
        basedOnUpdate: !reviewedIso,     // true = never explicitly reviewed (age is since last edit)
        ageDays: ageDays,
        views: (usage[id] && usage[id].count) || 0,
        staleFlags: staleCount,          // #2 — open "out of date" flags from reps
        staleNote: (stale[id] && stale[id].lastNote) || '',
        helpful: (fb[id] && fb[id].helpful) || 0,
        notHelpful: (fb[id] && fb[id].notHelpful) || 0,
      });
    });
    items.sort(function (a, b) {
      // Rep-flagged-stale first (then by flag count), then most-used, then oldest.
      return ((b.staleFlags ? 1 : 0) - (a.staleFlags ? 1 : 0)) ||
             (b.staleFlags - a.staleFlags) ||
             (b.views - a.views) || ((b.ageDays || 0) - (a.ageDays || 0)) ||
             a.title.localeCompare(b.title);
    });
    return { items: items.slice(0, 50), dueDays: dueDays };
  } catch (err) { return { error: err.message }; }
}

// ── Self-improving-KB loop (#1 content-gap requests + #2 rep freshness) ─────

function getOrCreateKbFeedbackSheet_() {
  const ss = getKbSS_();
  let sheet = ss.getSheetByName(KB_FEEDBACK_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(KB_FEEDBACK_TAB);
    sheet.appendRow(KB_FEEDBACK_HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, KB_FEEDBACK_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}
function getOrCreateKbRequestsSheet_() {
  const ss = getKbSS_();
  let sheet = ss.getSheetByName(KB_REQUESTS_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(KB_REQUESTS_TAB);
    sheet.appendRow(KB_REQUESTS_HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, KB_REQUESTS_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

/** #2 — open stale flags per item id. An item is "flagged stale" when it has a
 *  KbFeedback 'stale' row NEWER than its last review (reviewedTsByItem[id], a
 *  full 'yyyy-MM-dd HH:mm:ss' string; '' = never reviewed → any flag counts).
 *  This mirrors INV-120's strictly-newer completion-vs-assignment reset — a
 *  manager's kbMarkReviewed bumps ReviewedAt and the flag clears with NO status
 *  column to maintain. Bounded tail scan. Returns { id: {count, lastNote} }. */
function kbStaleFlags_(reviewedTsByItem) {
  const out = {};
  try {
    const ss = getKbSS_();
    const sheet = ss.getSheetByName(KB_FEEDBACK_TAB);
    if (!sheet || sheet.getLastRow() < 2) return out;
    const ssTz = ss.getSpreadsheetTimeZone();
    const lastRow = sheet.getLastRow();
    const startRow = Math.max(2, lastRow - KB_FEEDBACK_MAX_SCAN + 1);
    const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, KB_FEEDBACK_HEADERS.length).getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][KBF.KIND] || '') !== 'stale') continue;
      const id = String(data[i][KBF.ITEM_ID] || '').trim();
      if (!id) continue;
      const flagTs = kbCellTs_(data[i][KBF.TS], ssTz);
      const reviewedTs = (reviewedTsByItem && reviewedTsByItem[id]) || '';
      if (reviewedTs && flagTs <= reviewedTs) continue;   // a later review cleared this flag
      if (!out[id]) out[id] = { count: 0, lastNote: '' };
      out[id].count++;
      const note = String(data[i][KBF.NOTE] || '').trim();
      if (note) out[id].lastNote = note;   // chronological append order → latest note wins
    }
  } catch (e) { /* best-effort — empty map on any failure */ }
  return out;
}

/** #2 — cumulative helpful/notHelpful tallies per item id over the bounded
 *  feedback tail (KB_FEEDBACK_MAX_SCAN — KbFeedback is low-volume, so an
 *  unwindowed count is the more useful cumulative signal, same tail as
 *  kbStaleFlags_). Returns { id: {helpful, notHelpful} }; empty on any failure.
 *  Folded into the manager Most-used + Review-due blocks. */
function kbFeedbackCounts_() {
  const out = {};
  try {
    const ss = getKbSS_();
    const sheet = ss.getSheetByName(KB_FEEDBACK_TAB);
    if (!sheet || sheet.getLastRow() < 2) return out;
    const lastRow = sheet.getLastRow();
    const startRow = Math.max(2, lastRow - KB_FEEDBACK_MAX_SCAN + 1);
    const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, KB_FEEDBACK_HEADERS.length).getValues();
    for (let i = 0; i < data.length; i++) {
      const kind = String(data[i][KBF.KIND] || '');
      if (kind !== 'helpful' && kind !== 'notHelpful') continue;
      const id = String(data[i][KBF.ITEM_ID] || '').trim();
      if (!id) continue;
      if (!out[id]) out[id] = { helpful: 0, notHelpful: 0 };
      if (kind === 'helpful') out[id].helpful++; else out[id].notHelpful++;
    }
  } catch (e) { /* best-effort — empty map on any failure */ }
  return out;
}

/** #3 — probe KB embeds for Drive reachability (deleted/moved file or lost
 *  deployer access — a silently-broken embed that renders a dead /preview iframe
 *  with no error anywhere). Bounded (cap) + best-effort; PHI-free (KB is PHI-free
 *  by policy — returns title/department/kind/openUrl + a short reason, never
 *  content). Surfaced in the admin Storage Health panel (getStorageHealth), the
 *  established reachability-probe home. Uses DriveApp (already a project scope —
 *  KB images/converter), so no new OAuth scope. Returns
 *  { total, reachable, broken: [...], truncated }. */
function kbScanBrokenEmbeds_(cap) {
  const out = { total: 0, reachable: 0, probed: 0, broken: [], truncated: false };
  try {
    const sheet = getOrCreateKbSheet_();
    const last = sheet.getLastRow();
    if (last < 2) return out;
    const rows = sheet.getRange(2, 1, last - 1, KB_HEADERS.length).getValues();
    let probed = 0;
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][KB.TYPE] || 'article') !== 'embed') continue;
      const fid = String(rows[i][KB.DRIVE_FILE_ID] || '').trim();
      if (!fid) continue;
      out.total++;
      if (probed >= cap) { out.truncated = true; continue; }
      probed++;
      const kind = String(rows[i][KB.DRIVE_KIND] || 'doc');
      try {
        // getFileById is lazy — getName() forces the existence/access check.
        DriveApp.getFileById(fid).getName();
        out.reachable++;
      } catch (e) {
        out.broken.push({
          id: String(rows[i][KB.ID] || ''),
          title: String(rows[i][KB.TITLE] || '(untitled)'),
          department: String(rows[i][KB.DEPARTMENT] || ''),
          driveKind: kind,
          openUrl: kbOpenUrl_(kind, fid),
          reason: (e && e.message) ? String(e.message).substring(0, 140) : 'unreachable',
        });
      }
    }
    out.probed = probed;
  } catch (e) { /* best-effort — partial/empty result on any failure */ }
  return out;
}

/** #2 — rep freshness signal. kind ∈ helpful | notHelpful | stale. Rep-callable,
 *  append-only, locked (INV-01). PHI-free-by-policy (the KB store; a 'stale' note
 *  describes the doc, not a patient). A 'stale' flag surfaces the item at the top
 *  of the manager review-due queue (kbGetReviewDue) until a manager marks it
 *  reviewed. Only the actionable 'stale' kind writes an audit row (helpful /
 *  notHelpful are lightweight signal, un-audited like KbViews); the audit row is
 *  PHI-free (id only — the rep's note never enters the shared AuditLog). */
function kbFlagItem(itemId, kind, note) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Not authorized.' };
    const id = String(itemId || '').trim().substring(0, 100);
    if (!id) return { success: false, error: 'Missing item id.' };
    const k = String(kind || '').trim();
    if (!KB_FEEDBACK_KINDS[k]) return { success: false, error: 'Unknown feedback kind.' };
    const n = (k === 'stale') ? String(note || '').trim().substring(0, KB_FEEDBACK_NOTE_MAX) : '';
    getOrCreateKbFeedbackSheet_().appendRow([
      fmtDate_(new Date()) + ' ' + fmtTime_(new Date()), id, emp.id, emp.name, k, n,
    ]);
    if (k === 'stale') writeAuditLog_(emp, 'KbItemFlagged', '', '', false, 0, 'id=' + id, emp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** #1 — content-gap request. Rep-callable, append-only, locked (INV-01). A
 *  DELIBERATE "please write an article about X" (typically fired from a
 *  zero-result Reference search) — the deliberate rep action is what keeps it
 *  PHI-free-by-policy (the rep describes a topic, not patient specifics). Lands
 *  in the manager KbContentRequests queue. Audit row is PHI-free (reqId only —
 *  the topic/note text never enters the shared AuditLog). */
function kbRequestArticle(topic, note, query) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Not authorized.' };
    const t = String(topic || '').trim().substring(0, KB_REQUEST_TOPIC_MAX);
    if (!t) return { success: false, error: 'Describe what you were looking for.' };
    const n = String(note || '').trim().substring(0, KB_REQUEST_NOTE_MAX);
    const q = String(query || '').trim().substring(0, KB_REQUEST_TOPIC_MAX);
    const reqId = Utilities.getUuid();
    getOrCreateKbRequestsSheet_().appendRow([
      fmtDate_(new Date()) + ' ' + fmtTime_(new Date()), reqId, emp.id, emp.name, t, n, q, 'open', '', '',
    ]);
    writeAuditLog_(emp, 'KbContentRequest', '', '', false, 0, 'reqId=' + reqId, emp.email);
    return { success: true, reqId: reqId };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** #1 — manager content-gap queue. Manager-gated (INV-02), read-only, bounded
 *  tail scan (KB_REQUESTS_MAX_SCAN). Returns open requests newest-first + a small
 *  recent-resolved tail for context. PHI-free-by-policy. */
function kbGetContentRequests() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { error: 'Manager access required.' };
    const ss = getKbSS_();
    const sheet = ss.getSheetByName(KB_REQUESTS_TAB);
    if (!sheet || sheet.getLastRow() < 2) return { open: [], resolved: [], openCount: 0 };
    const ssTz = ss.getSpreadsheetTimeZone();
    const lastRow = sheet.getLastRow();
    const startRow = Math.max(2, lastRow - KB_REQUESTS_MAX_SCAN + 1);
    const rows = sheet.getRange(startRow, 1, lastRow - startRow + 1, KB_REQUESTS_HEADERS.length).getValues();
    const todayNum = cnIsoToDayNum_(fmtDate_(new Date()));
    const open = [], resolved = [];
    for (let i = rows.length - 1; i >= 0; i--) {   // newest-first
      const r = rows[i];
      const reqId = String(r[KBR.REQ_ID] || '').trim();
      if (!reqId) continue;
      const status = String(r[KBR.STATUS] || 'open').trim() || 'open';
      const iso = kbCellDateIso_(r[KBR.TS], ssTz);
      let ageDays = null;
      if (iso) { const nDay = cnIsoToDayNum_(iso); if (nDay != null && todayNum != null) ageDays = todayNum - nDay; }
      const item = {
        reqId: reqId, repName: String(r[KBR.REP_NAME] || ''),
        topic: String(r[KBR.TOPIC] || ''), note: String(r[KBR.NOTE] || ''),
        query: String(r[KBR.QUERY] || ''), createdIso: iso, ageDays: ageDays, status: status,
      };
      if (status === 'open') open.push(item);
      else if (resolved.length < KB_REQUESTS_RESOLVED_TAIL) resolved.push(item);
    }
    return { open: open, resolved: resolved, openCount: open.length };
  } catch (err) { return { error: err.message }; }
}

/** #1 — manager resolve/dismiss a content request. Manager-gated (INV-02),
 *  locked (INV-01), audited (PHI-free — reqId + action only). Bounded
 *  ReqId-column scan → single-row status/resolution write. */
function kbResolveContentRequest(reqId, action) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { success: false, error: 'Manager access required.' };
    reqId = String(reqId || '').trim();
    if (!reqId) return { success: false, error: 'Missing request id.' };
    const act = (action === 'dismissed') ? 'dismissed' : 'resolved';
    const ss = getKbSS_();
    const sheet = ss.getSheetByName(KB_REQUESTS_TAB);
    const last = sheet ? sheet.getLastRow() : 0;
    if (last < 2) return { success: false, error: 'Request not found.' };
    const ids = sheet.getRange(2, KBR.REQ_ID + 1, last - 1, 1).getValues();
    let found = -1;
    for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]).trim() === reqId) { found = i + 2; break; } }
    if (found < 0) return { success: false, error: 'Request not found.' };
    const now = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
    sheet.getRange(found, KBR.STATUS + 1, 1, 1).setValue(act);
    sheet.getRange(found, KBR.RESOLVED_AT + 1, 1, 2).setValues([[now, emp.email]]);
    writeAuditLog_(emp, 'KbContentRequestResolve', '', '', false, 0, 'reqId=' + reqId + '; action=' + act, emp.email);
    return { success: true, action: act };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

// ── Manager-gated writes (locked + audited) ──────────────────────────────
function kbSaveItem(payload) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { success: false, error: 'Admin access required.' };
    payload = payload || {};
    const department = String(payload.department || '').trim() || 'General';
    const title = String(payload.title || '').trim();
    const type = (payload.type === 'embed') ? 'embed' : 'article';
    if (!title) return { success: false, error: 'Title is required.' };
    let bodyMd = '', driveKind = '', driveFileId = '';
    let imagesExported = 0, imageWarnings = [];
    if (type === 'embed') {
      const parsed = kbParseDriveUrl_(payload.driveUrl);
      if (!parsed) return { success: false, error: 'Could not read that Drive link — paste a Google Doc, Sheet, or file share URL.' };
      driveKind = parsed.kind; driveFileId = parsed.fileId;
    } else {
      bodyMd = String(payload.body || '');
      // Phase 2b — resolve converter image tokens (kbdoc:<fileId>:<n>) to
      // Drive-hosted URLs BEFORE acquiring the lock: the Doc re-walk + blob
      // exports can take seconds and must not stall the global ScriptLock
      // (every punch / call-note write shares it). Length-check the RESOLVED
      // body — that's what the cell stores.
      if (bodyMd.indexOf('](kbdoc:') >= 0) {
        const resolved = kbResolveDocImages_(bodyMd);
        bodyMd = resolved.bodyMd;
        imagesExported = resolved.exported;
        imageWarnings = resolved.warnings;
      }
      if (bodyMd.length > KB_BODY_MAX) return { success: false, error: 'Article is too long (max ~49,000 chars). Split it into multiple articles.' };
    }
    const sortOrder = Number(payload.sortOrder || 0) || 0;
    // #4 — draft→publish. An explicit payload.status wins; on a plain re-save
    // (status absent) the existing row's status is PRESERVED (so editing a draft
    // doesn't silently publish it, and vice-versa). New items default published.
    const requestedStatus = payload.status
      ? (payload.status === KB_STATUS_DRAFT ? KB_STATUS_DRAFT : KB_STATUS_PUBLISHED)
      : null;
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const sheet = getOrCreateKbSheet_();
      const id = String(payload.id || '').trim() || Utilities.getUuid();
      const now = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
      const last = sheet.getLastRow();
      let found = -1, prior = null;
      if (last >= 2 && payload.id) {
        const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
        for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]) === id) { found = i + 2; break; } }
        if (found > 0) prior = sheet.getRange(found, 1, 1, KB_HEADERS.length).getValues()[0];
      }
      const status = requestedStatus || (prior ? kbRowStatus_(prior[KB.STATUS]) : KB_STATUS_PUBLISHED);
      // #4 — saving an item (new or edited) counts as reviewing it: stamp
      // ReviewedAt/ReviewedBy alongside UpdatedAt/UpdatedBy so a fresh edit
      // clears the staleness clock. A no-edit "still accurate" confirmation
      // goes through kbMarkReviewed instead.
      const rowVals = [id, department, title, type, bodyMd, driveKind, driveFileId, sortOrder, now, emp.email, now, emp.email, status];
      if (found > 0) {
        // #4 — snapshot the PRIOR content to the revision log before overwriting.
        kbAppendRevision_(prior, emp.email, 'edit');
        sheet.getRange(found, 1, 1, KB_HEADERS.length).setValues([rowVals]);
      } else {
        sheet.appendRow(rowVals);
      }
      invalidateKbCache_();
      writeAuditLog_(emp, 'KbItemSave', '', '', false, 0,
        'id=' + id + '; dept=' + department + '; type=' + type + '; status=' + status +
        (imagesExported ? '; imagesExported=' + imagesExported : ''), emp.email);
      return { success: true, id: id, status: status, imagesExported: imagesExported, imageWarnings: imageWarnings };
    } finally { lock.releaseLock(); }
  } catch (err) { return { success: false, error: err.message }; }
}

function kbDeleteItem(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { success: false, error: 'Admin access required.' };
    id = String(id || '').trim();
    const sheet = getOrCreateKbSheet_();
    const last = sheet.getLastRow();
    if (last >= 2) {
      const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]) === id) { sheet.deleteRow(i + 2); break; } }
    }
    invalidateKbCache_();
    writeAuditLog_(emp, 'KbItemDelete', '', '', false, 0, 'id=' + id, emp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

// ── #4 — article revision history + draft→publish ──────────────────────────

function getOrCreateKbRevisionsSheet_() {
  const ss = getKbSS_();
  let sheet = ss.getSheetByName(KB_REVISIONS_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(KB_REVISIONS_TAB);
    sheet.appendRow(KB_REVISIONS_HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, KB_REVISIONS_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

/** #4 — append a snapshot of a PRIOR KB row's content to KbRevisions before it's
 *  overwritten. `prior` is a full KB row (KB_HEADERS-wide). Best-effort — a
 *  revision-log failure must NEVER fail the save/revert that triggered it. */
function kbAppendRevision_(prior, replacedBy, action) {
  try {
    if (!prior) return;
    const sheet = getOrCreateKbRevisionsSheet_();
    const ssTz = sheet.getParent().getSpreadsheetTimeZone();
    sheet.appendRow([
      fmtDate_(new Date()) + ' ' + fmtTime_(new Date()),
      Utilities.getUuid(),
      String(prior[KB.ID] || ''),
      String(prior[KB.TITLE] || ''),
      String(prior[KB.TYPE] || 'article'),
      String(prior[KB.BODY_MD] || ''),
      String(prior[KB.DRIVE_KIND] || ''),
      String(prior[KB.DRIVE_FILE_ID] || ''),
      kbCellTs_(prior[KB.UPDATED_AT], ssTz),   // coerced-Date safe
      String(prior[KB.UPDATED_BY] || ''),
      replacedBy,
      action,
    ]);
  } catch (e) { /* best-effort */ }
}

/** #4 — admin-gated, read-only. The revision history for one item, newest-first,
 *  bounded. PHI-free by policy (KB content). Each entry carries a preview + the
 *  prior author/timestamp; `revId` is the key kbRevertItem restores. */
function kbGetRevisions(id) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { error: 'Admin access required.' };
    id = String(id || '').trim();
    if (!id) return { error: 'Missing item id.' };
    const ss = getKbSS_();
    const sheet = ss.getSheetByName(KB_REVISIONS_TAB);
    if (!sheet || sheet.getLastRow() < 2) return { items: [] };
    const ssTz = ss.getSpreadsheetTimeZone();
    const lastRow = sheet.getLastRow();
    const startRow = Math.max(2, lastRow - KB_REVISIONS_MAX_SCAN + 1);
    const rows = sheet.getRange(startRow, 1, lastRow - startRow + 1, KB_REVISIONS_HEADERS.length).getValues();
    const items = [];
    for (let i = rows.length - 1; i >= 0; i--) {   // newest snapshot first
      if (String(rows[i][KBREV.ITEM_ID] || '').trim() !== id) continue;
      const type = String(rows[i][KBREV.TYPE] || 'article');
      const body = String(rows[i][KBREV.BODY_MD] || '');
      items.push({
        revId: String(rows[i][KBREV.REV_ID] || ''),
        capturedAt: kbCellTs_(rows[i][KBREV.CAPTURED_AT], ssTz),
        title: String(rows[i][KBREV.TITLE] || ''),
        type: type,
        priorUpdatedAt: kbCellTs_(rows[i][KBREV.PRIOR_UPDATED_AT], ssTz),
        priorUpdatedBy: String(rows[i][KBREV.PRIOR_UPDATED_BY] || ''),
        replacedBy: String(rows[i][KBREV.REPLACED_BY] || ''),
        action: String(rows[i][KBREV.ACTION] || 'edit'),
        preview: (type === 'embed')
          ? ('[embed] ' + String(rows[i][KBREV.DRIVE_KIND] || ''))
          : body.replace(/\s+/g, ' ').trim().substring(0, 160),
        chars: body.length,
      });
      if (items.length >= KB_REVISIONS_PER_ITEM) break;
    }
    return { items: items };
  } catch (err) { return { error: err.message }; }
}

/** #4 — admin-gated, locked, audited. Restore a prior revision's CONTENT
 *  (title/type/body/drive fields) into the live row; department, sortOrder,
 *  status, and id stay as they are now. The current content is snapshotted first
 *  (action='revert'), so a revert is itself reversible. */
function kbRevertItem(id, revId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { success: false, error: 'Admin access required.' };
    id = String(id || '').trim(); revId = String(revId || '').trim();
    if (!id || !revId) return { success: false, error: 'Missing id.' };
    const ss = getKbSS_();
    const revSheet = ss.getSheetByName(KB_REVISIONS_TAB);
    if (!revSheet || revSheet.getLastRow() < 2) return { success: false, error: 'Revision not found.' };
    const revLast = revSheet.getLastRow();
    const revStart = Math.max(2, revLast - KB_REVISIONS_MAX_SCAN + 1);
    const revRows = revSheet.getRange(revStart, 1, revLast - revStart + 1, KB_REVISIONS_HEADERS.length).getValues();
    let snap = null;
    for (let i = revRows.length - 1; i >= 0; i--) {
      if (String(revRows[i][KBREV.REV_ID] || '').trim() === revId && String(revRows[i][KBREV.ITEM_ID] || '').trim() === id) { snap = revRows[i]; break; }
    }
    if (!snap) return { success: false, error: 'Revision not found.' };
    const kbSheet = getOrCreateKbSheet_();
    const last = kbSheet.getLastRow();
    let found = -1;
    if (last >= 2) {
      const ids = kbSheet.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]) === id) { found = i + 2; break; } }
    }
    if (found < 0) return { success: false, error: 'Item not found.' };
    const cur = kbSheet.getRange(found, 1, 1, KB_HEADERS.length).getValues()[0];
    kbAppendRevision_(cur, emp.email, 'revert');   // current content is reversible too
    const now = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
    const restored = [
      id,
      String(cur[KB.DEPARTMENT] || 'General'),
      String(snap[KBREV.TITLE] || ''),
      String(snap[KBREV.TYPE] || 'article'),
      String(snap[KBREV.BODY_MD] || ''),
      String(snap[KBREV.DRIVE_KIND] || ''),
      String(snap[KBREV.DRIVE_FILE_ID] || ''),
      Number(cur[KB.SORT_ORDER] || 0) || 0,
      now, emp.email, now, emp.email,
      kbRowStatus_(cur[KB.STATUS]),
    ];
    kbSheet.getRange(found, 1, 1, KB_HEADERS.length).setValues([restored]);
    invalidateKbCache_();
    writeAuditLog_(emp, 'KbItemRevert', '', '', false, 0, 'id=' + id + '; revId=' + revId, emp.email);
    return { success: true, id: id };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** #4 — admin-gated, locked, audited. Flip a draft to published (the "Release"
 *  action, mirroring EmpDocs releaseDoc). No content change. */
function kbPublishItem(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { success: false, error: 'Admin access required.' };
    id = String(id || '').trim();
    if (!id) return { success: false, error: 'Missing item id.' };
    const sheet = getOrCreateKbSheet_();
    const last = sheet.getLastRow();
    let found = -1;
    if (last >= 2) {
      const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
      for (let i = 0; i < ids.length; i++) { if (String(ids[i][0]) === id) { found = i + 2; break; } }
    }
    if (found < 0) return { success: false, error: 'Item not found.' };
    sheet.getRange(found, KB.STATUS + 1, 1, 1).setValue(KB_STATUS_PUBLISHED);
    invalidateKbCache_();
    writeAuditLog_(emp, 'KbItemPublish', '', '', false, 0, 'id=' + id, emp.email);
    return { success: true, id: id };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

// ── KB Phase 2 — Google-Doc → markdown article converter ───────────────────
// Per-item, review-before-save migration off Drive embeds: kbConvertDriveDoc
// reads a Google Doc via DocumentApp and emits ONLY the markdown subset kbMd_
// renders (headings, bold/italic, links, ul/ol, hr, paragraphs). The result is
// returned to the editor for the manager to REVIEW (live preview) — nothing is
// saved until they press Save (the existing kbSaveItem path), and the Drive
// file is never modified. A blind "convert all embeds" batch was deliberately
// NOT built: unreviewed conversions could silently replace working embeds with
// degraded articles (images/tables don't survive).
//
// The walker compares String(getType()) / String(getHeading()) /
// String(getGlyphType()) against enum NAMES (DocumentApp enums stringify to
// their names) so the Node harness can drive it with plain-object stubs —
// see the "kb — Doc→markdown converter" tests in test/client/run.js.

// ── KB Phase 2b — converter image export ────────────────────────────────────
// The converter emits kbdoc:<fileId>:<n> image tokens (read-only, INV-115);
// kbSaveItem resolves them at save: re-walk the Doc in the SAME order, export
// the blobs to a deployer-owned "KB Images" Drive folder (Script Property
// KB_IMAGES_FOLDER_ID, auto-provisioned, domain-link-viewable), and swap each
// token for the Drive thumbnail URL kbMd_ renders. Exported files use the
// deterministic name kbdoc-<fileId>-<n> and are REUSED on re-save (idempotent,
// no folder litter) — delete the exported file to force a refresh after the
// Doc's image changed.
const KB_IMAGES_FOLDER_PROP = 'KB_IMAGES_FOLDER_ID';
const KB_DOC_IMAGE_CAP = 20;   // per-doc export cap — extras stay placeholders

/** PURE: unique {fileId, ord} refs from kbdoc image tokens in an article body. */
function kbExtractDocImageRefs_(bodyMd) {
  const out = [];
  const seen = {};
  const re = /!\[[^\]]*\]\(kbdoc:([a-zA-Z0-9_-]+):(\d+)\)/g;
  let m;
  while ((m = re.exec(String(bodyMd || ''))) !== null) {
    const key = m[1] + ':' + m[2];
    if (seen[key]) continue;
    seen[key] = true;
    out.push({ fileId: m[1], ord: parseInt(m[2], 10) });
  }
  return out;
}

/** PURE: swap each kbdoc image token via resolve(fileId, ord) → https URL.
 *  null / a throwing resolver degrades that token to the italic placeholder;
 *  the caller reports `failed` as a warning. */
function kbReplaceDocImageTokens_(bodyMd, resolve) {
  let failed = 0;
  const out = String(bodyMd || '').replace(
    /!\[([^\]]*)\]\(kbdoc:([a-zA-Z0-9_-]+):(\d+)\)/g,
    function (whole, alt, fileId, ordStr) {
      let url = null;
      try { url = resolve(fileId, parseInt(ordStr, 10)); } catch (e) { url = null; }
      if (!url) { failed++; return '*[image — see the original Doc]*'; }
      return '![' + alt + '](' + url + ')';
    });
  return { bodyMd: out, failed: failed };
}

/** Collects a Doc body's INLINE_IMAGE blobs in the SAME walk order the
 *  converter assigns ordinals: paragraph children, document order. Drawings
 *  and images inside tables/list items are never tokenized, so they are not
 *  collected either — the two walks MUST stay mirrored or ordinals drift and
 *  the wrong image exports. 1-based ordinal ord reads blobs[ord-1]. */
function kbCollectDocInlineImages_(body, cap) {
  const blobs = [];
  const n = body.getNumChildren();
  for (let i = 0; i < n && blobs.length < cap; i++) {
    const el = body.getChild(i);
    if (String(el.getType()) !== 'PARAGRAPH') continue;
    const m = el.getNumChildren();
    for (let c = 0; c < m && blobs.length < cap; c++) {
      const child = el.getChild(c);
      if (String(child.getType()) !== 'INLINE_IMAGE') continue;
      blobs.push(child.getBlob());
    }
  }
  return blobs;
}

/** KB Images folder: Script Property first, else create + share domain-link-
 *  viewable (so <img> tags render for any signed-in rep) + store the id.
 *  Workspace policy may forbid link sharing — degrades with a console warning;
 *  images then render only for accounts the folder is visible to, and the
 *  kbMd_ image anchor still gives every rep the open-in-Drive path. */
function getOrCreateKbImagesFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(KB_IMAGES_FOLDER_PROP);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* fall through — recreate */ }
  }
  const folder = DriveApp.createFolder('KB Images');
  try { folder.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (e) { console.warn('KB Images folder sharing failed (' + e.message + ') — images may not render for reps until shared.'); }
  props.setProperty(KB_IMAGES_FOLDER_PROP, folder.getId());
  return folder;
}

/** Resolves kbdoc image tokens at SAVE time. Runs OUTSIDE the script lock —
 *  Drive exports are slow and only the sheet write needs the lock. Every
 *  failure degrades per-token to the placeholder (warned), never throws. */
function kbResolveDocImages_(bodyMd) {
  const refs = kbExtractDocImageRefs_(bodyMd);
  if (refs.length === 0) return { bodyMd: bodyMd, exported: 0, warnings: [] };
  const warnings = [];
  let folder = null;
  try { folder = getOrCreateKbImagesFolder_(); }
  catch (e) {
    const r0 = kbReplaceDocImageTokens_(bodyMd, function () { return null; });
    warnings.push('Could not open or create the KB Images folder (' + e.message + ') — image(s) left as placeholders.');
    return { bodyMd: r0.bodyMd, exported: 0, warnings: warnings };
  }
  const blobsByDoc = {};   // fileId → blobs[] | null (Doc unreachable)
  const urlCache = {};     // "fileId:ord" → resolved URL
  let exported = 0;
  const resolve = function (fileId, ord) {
    const key = fileId + ':' + ord;
    if (urlCache[key]) return urlCache[key];
    if (!(fileId in blobsByDoc)) {
      try {
        blobsByDoc[fileId] = kbCollectDocInlineImages_(DocumentApp.openById(fileId).getBody(), KB_DOC_IMAGE_CAP);
      } catch (e) {
        blobsByDoc[fileId] = null;
        warnings.push('Could not open the source Doc to export its image(s): ' + e.message);
      }
    }
    const blobs = blobsByDoc[fileId];
    if (!blobs || ord < 1 || ord > blobs.length) return null;
    const name = 'kbdoc-' + fileId + '-' + ord;
    let file = null;
    const existing = folder.getFilesByName(name);
    if (existing.hasNext()) {
      file = existing.next();   // reuse — idempotent re-saves, stable URLs
    } else {
      file = folder.createFile(blobs[ord - 1].copyBlob().setName(name));
      exported++;
    }
    const url = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200';
    urlCache[key] = url;
    return url;
  };
  const r = kbReplaceDocImageTokens_(bodyMd, resolve);
  if (r.failed > 0) warnings.push(r.failed + ' image token(s) could not be resolved — left as placeholders.');
  return { bodyMd: r.bodyMd, exported: exported, warnings: warnings };
}

// ── KB Phase 3 — paste-a-screenshot upload (article editor) ─────────────────
// The editor textarea accepts a pasted image: the client reads it as a data
// URL and calls kbUploadImage, which exports the blob to the same KB Images
// folder Phase 2b provisions and returns the thumbnail URL the editor inserts
// as markdown. The KB is PHI-free BY POLICY — the editor reminds the manager
// to scrub patient data before pasting. Orphaned uploads (pasted but never
// saved into an article) stay in the folder — trim manually if it bothers you
// (same posture as KbViews growth).
const KB_IMG_UPLOAD_MAX_CHARS = 4 * 1024 * 1024;   // base64 chars ≈ 3MB binary
const KB_IMG_UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

/** PURE: parse a data:image/…;base64,… URL → { contentType, base64 } or null.
 *  The whitelist check happens at the caller (this just shape-parses). */
function kbParseImageDataUrl_(dataUrl) {
  const m = String(dataUrl || '').match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+\/=\s]+)$/i);
  if (!m) return null;
  return { contentType: m[1].toLowerCase(), base64: m[2].replace(/\s+/g, '') };
}

/** Manager-gated (INV-02 — the editor is manager-only). Validates the data
 *  URL (type whitelist + size cap), writes the blob to the KB Images folder
 *  as kbpaste-<stamp>-<rand>, audits a PHI-free KbImageUpload row, and
 *  returns the thumbnail URL. Deliberately NO ScriptLock: this writes only a
 *  Drive file (atomic, no shared-sheet state) — holding the global lock
 *  through a multi-second blob upload would stall every punch/note write. */
function kbUploadImage(dataUrl) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { success: false, error: 'Admin access required.' };
    const raw = String(dataUrl || '');
    if (raw.length > KB_IMG_UPLOAD_MAX_CHARS) {
      return { success: false, error: 'Image too large (max ~3MB) — crop or downscale the screenshot.' };
    }
    const parsed = kbParseImageDataUrl_(raw);
    if (!parsed || KB_IMG_UPLOAD_TYPES.indexOf(parsed.contentType) < 0) {
      return { success: false, error: 'Paste a PNG/JPEG/GIF/WebP image.' };
    }
    const folder = getOrCreateKbImagesFolder_();
    const stamp = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss');
    const name = 'kbpaste-' + stamp + '-' + Utilities.getUuid().substring(0, 8);
    const blob = Utilities.newBlob(Utilities.base64Decode(parsed.base64), parsed.contentType, name);
    const file = folder.createFile(blob);
    writeAuditLog_(emp, 'KbImageUpload', '', '', false, 0,
      'fileId=' + file.getId() + '; name=' + name + '; type=' + parsed.contentType, emp.email);
    return { success: true, url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200' };
  } catch (err) { return { success: false, error: err.message }; }
}

// ── KB AI Phase A — facet-based guidance (Reference drawer) ─────────────────
// kbGetFacetGuidance(facets): rep-callable. Sends ONLY whitelisted enum
// facets (department / update type / tags / flag type) plus excerpts from our
// own PHI-free-by-policy KB articles to the Anthropic Messages API, and
// returns a short guidance blurb with section sources for the drawer's
// Guidance card. The load-bearing privacy invariant (INV-119): no free-typed
// note text, patient data, or any non-enum value ever enters the vendor
// payload — every facet is validated against the server-side vocabularies
// (novel values DROPPED, never errored), and the prompt builder takes only
// the sanitized facets + KB chunks, so there is no parameter through which
// free text could reach the wire. Best-effort posture throughout: ANY
// failure (flag off, no key, thin retrieval, daily cap reached, vendor
// error) returns { none: true } and the drawer silently falls back to its
// existing suggestions. Results are cached org-wide for 6h per canonical
// facet hash; the cache key embeds a generation salt bumped by every KB
// save/delete (invalidateKbCache_) so edited articles invalidate at once.
const KB_AI_CACHE_PREFIX = 'kb_ai_guid_v1:';
const KB_AI_CACHE_TTL = 21600;            // 6h — the CacheService maximum
const KB_AI_GEN_PROP = 'KB_AI_GENERATION';
const KB_AI_SPEND_PROP = 'KB_AI_SPEND';   // {date, usd, calls} — daily org spend
const KB_AI_MAX_CHUNKS = 4;
const KB_AI_SCORE_FLOOR = 4;              // top-chunk minimum — thin matches never hit the API
const KB_AI_DEFAULT_MODEL = 'claude-haiku-4-5';
const KB_AI_DEFAULT_DAILY_CAP = 3;        // USD/day org-wide; Admin-adjustable (KB_AI_DAILY_CAP)
const KB_AI_CALL_RESERVE_USD = 0.02;      // L-2 — conservative per-call reservation held while a
                                          // vendor call is in flight, reconciled to actual cost
                                          // after. Bounds concurrent-miss overshoot of the daily cap.
// $/MTok per model — the Admin model <select> renders from these keys (via
// getAdminConfig), so client and server can't drift. An unknown model id
// (operator typo in KB_AI_MODEL) is costed at the most expensive known rates
// so the daily cap can never be silently undercounted.
const KB_AI_MODEL_PRICES = {
  'claude-haiku-4-5':  { input: 1.0,  output: 5.0  },
  'claude-sonnet-4-6': { input: 3.0,  output: 15.0 },
  'claude-opus-4-8':   { input: 5.0,  output: 25.0 },
};

/** PURE: whitelist-validate raw client facets against the server-side
 *  vocabularies. Anything not in the vocab is DROPPED (never an error), so
 *  the result can only contain values the server already knows — the vendor
 *  payload is enum-only by construction (INV-119). Matching is
 *  case-insensitive; the canonical (vocab) casing is returned. Tags dedupe
 *  and cap at 8. */
function kbAiSanitizeFacets_(facets, vocab) {
  facets = facets || {}; vocab = vocab || {};
  const out = { department: '', updateType: '', flagType: '', tags: [] };
  const deptIn = String(facets.department || '').trim().toLowerCase();
  (vocab.departments || []).forEach(function (d) {
    if (deptIn && String(d).trim().toLowerCase() === deptIn) out.department = String(d);
  });
  const updIn = String(facets.updateType || '').trim().toLowerCase();
  (vocab.updateTypes || []).forEach(function (u) {
    if (updIn && String(u).trim().toLowerCase() === updIn) out.updateType = String(u);
  });
  const flagIn = String(facets.flagType || '').trim().toLowerCase();
  if ((vocab.flagTypes || []).indexOf(flagIn) >= 0) out.flagType = flagIn;
  const known = {};
  (vocab.tags || []).forEach(function (t) { known[String(t).trim().toLowerCase()] = true; });
  const seen = {};
  (Array.isArray(facets.tags) ? facets.tags : []).forEach(function (t) {
    const tag = String(t || '').trim().toLowerCase();
    if (tag && known[tag] && !seen[tag] && out.tags.length < 8) { seen[tag] = true; out.tags.push(tag); }
  });
  return out;
}

/** PURE: canonical, order-insensitive serialization of sanitized facets —
 *  the cache-key payload (and the client's collapse-after-seen key). Tags
 *  sort; casing lowers; empty facets are omitted. */
function kbAiCanonicalFacets_(clean) {
  clean = clean || {};
  const parts = [];
  if (clean.department) parts.push('dept=' + String(clean.department).toLowerCase());
  if (clean.updateType) parts.push('update=' + String(clean.updateType).toLowerCase());
  if (clean.flagType) parts.push('flag=' + String(clean.flagType).toLowerCase());
  const tags = (clean.tags || []).map(function (t) { return String(t).toLowerCase(); }).sort();
  if (tags.length) parts.push('tags=' + tags.join(','));
  return parts.join('|');
}

/** PURE: search-query terms derived from sanitized facets — feeds the
 *  existing section search (kebab-case tags split into words). */
function kbAiQueryTerms_(clean) {
  clean = clean || {};
  const parts = [];
  if (clean.updateType) parts.push(String(clean.updateType));
  (clean.tags || []).forEach(function (t) { parts.push(String(t).replace(/-/g, ' ')); });
  if (clean.flagType) parts.push(String(clean.flagType));
  if (clean.department) parts.push(String(clean.department));
  return parts.join(' ').trim();
}

/** PURE: assemble the vendor prompt from sanitized facets + KB chunks ONLY.
 *  Deliberately takes no other inputs (INV-119) — there is no parameter
 *  through which free-typed note text could reach the payload. */
function kbAiBuildPrompt_(clean, chunks) {
  const facetLines = [];
  if (clean.department) facetLines.push('Department: ' + clean.department);
  if (clean.updateType) facetLines.push('Update type: ' + clean.updateType);
  if (clean.flagType) facetLines.push('Flag: ' + clean.flagType);
  if (clean.tags && clean.tags.length) facetLines.push('Tags: ' + clean.tags.join(', '));
  let excerpts = '';
  (chunks || []).forEach(function (c, i) {
    excerpts += '\n--- Excerpt ' + (i + 1) + ' — "' + c.title + '"' +
      (c.heading ? ' § "' + c.heading + '"' : '') + ' ---\n' + c.chunkMd + '\n';
  });
  return {
    system: 'You are a concise assistant for a medical-supply customer-service team’s internal knowledge base. ' +
      'You receive call attributes (enums only) and excerpts from the team’s own reference articles. ' +
      'Write 2-4 short sentences of practical guidance for the rep handling this kind of call, based ONLY on the excerpts. ' +
      'If the excerpts do not cover the situation, reply with exactly: NOT_COVERED. ' +
      'Plain text only — no markdown, no preamble.',
    user: 'Call attributes:\n' + facetLines.join('\n') + '\n\nReference excerpts:\n' + excerpts,
  };
}

/** Script-Property-backed runtime config. The API key is the only secret;
 *  model + daily cap are Admin-adjustable (saveKbAiSettings). */
function getKbAiConfig_() {
  const props = PropertiesService.getScriptProperties();
  const cap = parseFloat(props.getProperty('KB_AI_DAILY_CAP'));
  return {
    apiKey: props.getProperty('KB_AI_API_KEY') || '',
    model: String(props.getProperty('KB_AI_MODEL') || KB_AI_DEFAULT_MODEL),
    dailyCap: (isFinite(cap) && cap >= 0) ? cap : KB_AI_DEFAULT_DAILY_CAP,
  };
}

function kbAiGeneration_() {
  try { return PropertiesService.getScriptProperties().getProperty(KB_AI_GEN_PROP) || '0'; }
  catch (_) { return '0'; }
}

/** Today's org-wide vendor spend — {date, usd, calls}; resets on date roll. */
function kbAiReadSpend_() {
  const today = fmtDate_(new Date());
  try {
    const raw = PropertiesService.getScriptProperties().getProperty(KB_AI_SPEND_PROP);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && o.date === today) return { date: today, usd: Number(o.usd) || 0, calls: Number(o.calls) || 0 };
    }
  } catch (_) {}
  return { date: today, usd: 0, calls: 0 };
}

/** Atomically applies a spend delta under a brief lock: usdDelta (clamped so
 *  the counter never goes negative) and callDelta. Used for reconcile
 *  (actualCost − reserve, +1 call) and refund (−reserve, 0 calls). On lock
 *  contention the write still applies best-effort — the cap is a soft budget
 *  guard, and the vendor-console hard spend cap is the backstop (set one
 *  there too). */
function kbAiApplySpend_(usdDelta, callDelta) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try { locked = lock.tryLock(3000); } catch (_) {}
  try {
    const s = kbAiReadSpend_();
    s.usd = Math.max(0, s.usd + usdDelta);
    s.calls += (callDelta || 0);
    PropertiesService.getScriptProperties().setProperty(KB_AI_SPEND_PROP, JSON.stringify(s));
  } catch (e) {
    // F2 — surface the degradation: if this write fails the daily spend
    // counter freezes while real spend continues (the soft cap stops
    // counting). Best-effort by design — never block the caller — but log
    // it so the silent drift is visible. The Anthropic-console hard cap is
    // the true backstop.
    console.warn('kbAiApplySpend_ failed (spend counter not updated): ' + (e && e.message));
  }
  finally { if (locked) { try { lock.releaseLock(); } catch (_) {} } }
}

/** L-2 — atomic cap check + reservation. Reads today's spend and, in the SAME
 *  lock, reserves `reserve` USD if under the cap. Returns true if the caller
 *  may proceed (reservation applied), false if the cap is already reached.
 *  Doing the read+check+reserve atomically closes the lost-update window where
 *  several concurrent cache misses each read spend < cap and all call the
 *  vendor before any increment lands. The caller reconciles to the real cost
 *  (or refunds the reservation on a failed/empty call) via kbAiApplySpend_.
 *  On lock contention it fails OPEN (returns true) — matching the prior
 *  best-effort posture; the vendor-console hard cap remains the true backstop. */
function kbAiTryReserveSpend_(cap, reserve) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try { locked = lock.tryLock(3000); } catch (_) {}
  try {
    const s = kbAiReadSpend_();
    if (s.usd >= cap) return false;
    s.usd += reserve;
    PropertiesService.getScriptProperties().setProperty(KB_AI_SPEND_PROP, JSON.stringify(s));
    return true;
  } catch (_) { return true; }
  finally { if (locked) { try { lock.releaseLock(); } catch (_) {} } }
}

/** Estimated cost (USD) of one call from the response's usage tokens.
 *  Unknown model → most expensive known rates (never undercounts the cap). */
function kbAiEstimateCostUsd_(model, usage) {
  let price = KB_AI_MODEL_PRICES[model];
  if (!price) {
    price = { input: 0, output: 0 };
    Object.keys(KB_AI_MODEL_PRICES).forEach(function (k) {
      price.input = Math.max(price.input, KB_AI_MODEL_PRICES[k].input);
      price.output = Math.max(price.output, KB_AI_MODEL_PRICES[k].output);
    });
  }
  const inTok = (usage && Number(usage.input_tokens)) || 0;
  const outTok = (usage && Number(usage.output_tokens)) || 0;
  return (inTok * price.input + outTok * price.output) / 1e6;
}

/** One UrlFetchApp POST to the Anthropic Messages API. Returns
 *  { text, usage } or null on any failure (the caller degrades to none). */
function kbAiCallVendor_(cfg, prompt) {
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: cfg.model,
      max_tokens: 400,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    }),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    Logger.log('kbAiCallVendor_ HTTP ' + res.getResponseCode() + ': ' + String(res.getContentText()).substring(0, 300));
    return null;
  }
  const body = JSON.parse(res.getContentText());
  let text = '';
  (body.content || []).forEach(function (b) { if (b && b.type === 'text') text += b.text; });
  return { text: text.trim(), usage: body.usage || {} };
}

/** Rep-callable (requires an enrolled employee), gated by the kbAiGuidance
 *  feature flag (scope both — the server check here is the enforcement).
 *  See the section comment above for the full posture. Never throws to the
 *  client: every failure path returns { none: true, reason }. */
function kbGetFacetGuidance(facets) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    if (!getFlag_('kbAiGuidance')) return { none: true, reason: 'disabled' };

    // Vocabularies: departments + update types are org config; tags are the
    // CALLER's own established tag vocabulary (tags already on their saved
    // notes — the same source as the tag-autocomplete datalist), so a novel
    // tag typed this minute never reaches the vendor.
    const updByDept = getUpdateSuggestions_() || {};
    const updateTypes = (CONFIG.CALL_NOTES.UPDATE_SUGGESTIONS_DEFAULT || []).slice();
    Object.keys(updByDept).forEach(function (d) {
      (updByDept[d] || []).forEach(function (u) { if (updateTypes.indexOf(u) < 0) updateTypes.push(u); });
    });
    let ownTags = [];
    try { const ts = getCallNoteTagSuggestions(); ownTags = (ts && ts.tags) || []; } catch (_) {}
    const clean = kbAiSanitizeFacets_(facets, {
      departments: Object.keys(getDepartmentEmails_() || {}),
      updateTypes: updateTypes,
      flagTypes: CN_FLAG_TYPES.concat(['urgent']),
      tags: ownTags,
    });
    // Department alone is too generic to guide on — require a real signal.
    if (!clean.updateType && !clean.flagType && !clean.tags.length) {
      return { none: true, reason: 'no-facets' };
    }

    const canonical = kbAiCanonicalFacets_(clean);
    const cacheKey = KB_AI_CACHE_PREFIX + kbAiGeneration_() + ':' +
      Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, canonical)
        .map(function (b) { return ((b & 0xff) + 0x100).toString(16).substring(1); }).join('');
    const cache = CacheService.getScriptCache();
    try {
      const hit = cache.get(cacheKey);
      if (hit) { const o = JSON.parse(hit); o.cached = true; return o; }
    } catch (_) {}
    const noneOut = function (reason, cacheIt) {
      const o = { none: true, reason: reason, facetHash: canonical };
      if (cacheIt) { try { cache.put(cacheKey, JSON.stringify(o), KB_AI_CACHE_TTL); } catch (_) {} }
      return o;
    };

    // Retrieval over our own KB (the existing section search). A thin match
    // never reaches the vendor — the score floor keeps low-signal facet
    // combos free, and the none is cached so they STAY free. A search ERROR
    // (KB sheet unreachable) is NOT cached — transient outages shouldn't
    // pin a 6h none.
    // F(M-12): publishedOnly — guidance caches org-wide, so retrieval must
    // exclude drafts even when the triggering caller is an admin.
    const search = searchReference(kbAiQueryTerms_(clean), { publishedOnly: true });
    if (search && search.error) return noneOut('search-failed', false);
    const chunks = (((search && search.results) || [])
      .filter(function (r) { return r.type === 'article' && r.chunkMd; })
      .slice(0, KB_AI_MAX_CHUNKS));
    if (!chunks.length || chunks[0].score < KB_AI_SCORE_FLOOR) return noneOut('thin', true);

    const cfg = getKbAiConfig_();
    if (!cfg.apiKey) return noneOut('no-key', false);
    // Atomic cap check + reservation (L-2). Holding the lock across the slow
    // vendor fetch is deliberately avoided (the kbResolveDocImages_ lesson);
    // instead we reserve up front so concurrent misses see the bump, then
    // reconcile to the real cost / refund the reservation below.
    if (!kbAiTryReserveSpend_(cfg.dailyCap, KB_AI_CALL_RESERVE_USD)) return noneOut('cap', false);

    let vendor = null;
    try { vendor = kbAiCallVendor_(cfg, kbAiBuildPrompt_(clean, chunks)); }
    catch (e) { Logger.log('kbGetFacetGuidance vendor: ' + e.message); }
    if (!vendor) { kbAiApplySpend_(-KB_AI_CALL_RESERVE_USD, 0); return noneOut('vendor-failed', false); }

    const cost = kbAiEstimateCostUsd_(cfg.model, vendor.usage);
    kbAiApplySpend_(cost - KB_AI_CALL_RESERVE_USD, 1);
    // PHI-free audit row — facets are validated enums, never note content.
    writeAuditLog_(emp, 'KbAiGuidance', '', '', false, 0,
      'facets=' + canonical + '; model=' + cfg.model + '; usd=' + cost.toFixed(4), emp.email);
    if (!vendor.text || vendor.text.indexOf('NOT_COVERED') >= 0) return noneOut('not-covered', true);

    const out = {
      guidance: vendor.text.substring(0, 2000),
      sources: chunks.map(function (c) { return { id: c.id, title: c.title, heading: c.heading, anchor: c.anchor }; }),
      facetHash: canonical,
    };
    try { cache.put(cacheKey, JSON.stringify(out), KB_AI_CACHE_TTL); } catch (_) {}
    return out;
  } catch (err) { return { none: true, reason: 'error', error: err.message }; }
}

const KB_DOC_HEADING_PREFIX = {
  TITLE: '# ', HEADING1: '# ', HEADING2: '## ', HEADING3: '### ',
  HEADING4: '#### ', HEADING5: '##### ', HEADING6: '###### ', SUBTITLE: '## ',
};

/** Extracts formatting runs from a DocumentApp Text element:
 *  [{ text, bold, italic, link }]. */
function kbTextToRuns_(textEl) {
  const s = textEl.getText();
  if (!s) return [];
  const idx = textEl.getTextAttributeIndices();
  if (!idx || idx.length === 0) {
    return [{ text: s, bold: !!textEl.isBold(0), italic: !!textEl.isItalic(0),
              link: textEl.getLinkUrl(0) || '' }];
  }
  const runs = [];
  for (let i = 0; i < idx.length; i++) {
    const start = idx[i];
    const end = (i + 1 < idx.length) ? idx[i + 1] : s.length;
    runs.push({
      text: s.substring(start, end),
      bold: !!textEl.isBold(start),
      italic: !!textEl.isItalic(start),
      link: textEl.getLinkUrl(start) || '',
    });
  }
  return runs;
}

/** PURE: formats runs into inline markdown. Render-safe for kbMd_:
 *  bold+italic collapses to bold (kbMd_ has no *** handling); links are
 *  emitted only for http(s)/mailto, with `()`/whitespace percent-encoded in
 *  the URL (kbMd_'s link regex stops at `)` / whitespace) and `[]` stripped
 *  from the link text; Docs soft line-breaks (\r) become spaces. */
function kbRunsToMarkdown_(runs) {
  return (runs || []).map(function (r) {
    let t = String(r.text == null ? '' : r.text).replace(/\r/g, ' ');
    if (!t) return '';
    const m = t.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const pre = m[1], post = m[3];
    let core = m[2];
    if (!core) return t;   // whitespace-only run
    if (r.bold) core = '**' + core + '**';
    else if (r.italic) core = '*' + core + '*';
    const link = String(r.link || '');
    if (link && /^(https?:|mailto:)/i.test(link)) {
      const safeUrl = link.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\s/g, '%20');
      core = '[' + core.replace(/[\[\]]/g, '') + '](' + safeUrl + ')';
    }
    return pre + core + post;
  }).join('');
}

/** Walks a DocumentApp Body and returns { markdown, warnings }. Paragraphs,
 *  headings, bullet/numbered lists, horizontal rules, and tables convert
 *  faithfully (tables → GFM, row 0 as the header; cell formatting goes
 *  through the runs pipeline so bold/links survive); images become an
 *  italic placeholder — each lossy conversion adds a warning so the reviewing
 *  manager knows to keep the original Doc when visuals matter. */
function kbDocBodyToMarkdown_(body, docId) {
  const out = [];
  const warnings = [];
  let imageCount = 0;   // placeholder-degraded: drawings, over-cap, or no docId
  let imageTokens = 0;  // kbdoc:<docId>:<n> tokens emitted (exported on save)
  let imageOrd = 0;     // document-order INLINE_IMAGE ordinal — MUST match
                        // kbCollectDocInlineImages_'s walk (paragraphs only)
  let tableCellLineBreaks = false, nestedTables = false;
  const skippedTypes = {};
  let listBuf = [];
  const flushList = function () {
    if (listBuf.length) { out.push(listBuf.join('\n')); listBuf = []; }
  };
  const n = body.getNumChildren();
  for (let i = 0; i < n; i++) {
    const el = body.getChild(i);
    const t = String(el.getType());
    if (t === 'PARAGRAPH') {
      flushList();
      let isHr = false;
      let parImages = 0;        // → italic placeholder
      const parTokens = [];     // → kbdoc image tokens (Phase 2b)
      const m = el.getNumChildren();
      for (let c = 0; c < m; c++) {
        const ct = String(el.getChild(c).getType());
        if (ct === 'HORIZONTAL_RULE') isHr = true;
        else if (ct === 'INLINE_IMAGE') {
          // Phase 2b — emit an export token instead of a placeholder. The
          // token resolves to a Drive-hosted image when the manager SAVES
          // (kbSaveItem → kbResolveDocImages_); the converter stays
          // read-only. Drawings keep the placeholder (no blob API), as do
          // images past the per-doc cap or a docId-less call (Node stubs).
          imageOrd++;
          if (docId && imageOrd <= KB_DOC_IMAGE_CAP) parTokens.push(imageOrd);
          else parImages++;
        }
        else if (ct === 'INLINE_DRAWING') parImages++;
      }
      if (isHr) { out.push('---'); continue; }
      const text = kbRunsToMarkdown_(kbTextToRuns_(el.editAsText())).trim();
      const prefix = KB_DOC_HEADING_PREFIX[String(el.getHeading())] || '';
      let line = text ? prefix + text : '';
      if (parTokens.length > 0) {
        imageTokens += parTokens.length;
        line = (line ? line + ' ' : '') + parTokens.map(function (ord) {
          return '![Doc image ' + ord + '](kbdoc:' + docId + ':' + ord + ')';
        }).join(' ');
      }
      if (parImages > 0) {
        imageCount += parImages;
        line = (line ? line + ' ' : '') + '*[image — see the original Doc]*';
      }
      if (line) out.push(line);
    } else if (t === 'LIST_ITEM') {
      const glyph = String(el.getGlyphType());
      const ordered = glyph === 'NUMBER' || glyph.indexOf('LATIN') === 0 || glyph.indexOf('ROMAN') === 0;
      const indent = new Array(Math.max(0, el.getNestingLevel()) + 1).join('  ');
      const text = kbRunsToMarkdown_(kbTextToRuns_(el.editAsText())).trim();
      if (text) listBuf.push(indent + (ordered ? '1. ' : '- ') + text);
    } else if (t === 'TABLE') {
      flushList();
      // GFM table: row 0 = header (Docs tables have no header concept), then
      // the |---| separator, then body rows. Literal pipes in cells escape as
      // \| (kbMd_'s tableCells understands that); a cell's internal line
      // breaks join with spaces (GFM cells are single-line). Cell text goes
      // through the runs pipeline so bold/links convert too. Nested tables
      // flatten into the parent cell's text via editAsText() — warned.
      const rowsOut = [];
      let maxCols = 0;
      const numRows = el.getNumRows();
      for (let r = 0; r < numRows; r++) {
        const row = el.getRow(r);
        const cells = [];
        for (let c = 0; c < row.getNumCells(); c++) {
          const cell = row.getCell(c);
          try {
            const cn = cell.getNumChildren ? cell.getNumChildren() : 0;
            for (let k = 0; k < cn; k++) {
              if (String(cell.getChild(k).getType()) === 'TABLE') nestedTables = true;
            }
          } catch (e) {}
          let text = kbRunsToMarkdown_(kbTextToRuns_(cell.editAsText()));
          if (/\n/.test(text)) tableCellLineBreaks = true;
          text = text.replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|');
          cells.push(text);
        }
        rowsOut.push(cells);
        if (cells.length > maxCols) maxCols = cells.length;
      }
      const hasContent = rowsOut.some(function (cells) { return cells.join('') !== ''; });
      if (maxCols > 0 && hasContent) {
        const pad = function (cells) {
          const padded = cells.slice();
          while (padded.length < maxCols) padded.push('');
          return '| ' + padded.join(' | ') + ' |';
        };
        const lines = [pad(rowsOut[0])];
        lines.push('|' + new Array(maxCols + 1).join(' --- |'));
        for (let r2 = 1; r2 < rowsOut.length; r2++) lines.push(pad(rowsOut[r2]));
        out.push(lines.join('\n'));
      }
    } else {
      skippedTypes[t] = true;
    }
  }
  flushList();
  if (imageTokens > 0) {
    warnings.push(imageTokens + ' image(s) marked for export — they upload to the KB Images Drive folder when you press Save (the preview shows their alt text until then).');
  }
  if (imageCount > 0) {
    warnings.push(imageCount + ' image(s)/drawing(s) could not be converted — placeholders inserted; keep the original Doc if the visuals matter.');
  }
  if (nestedTables) {
    warnings.push('Nested table(s) flattened into their parent cell — review the converted table(s).');
  }
  if (tableCellLineBreaks) {
    warnings.push('Some table cell(s) had multiple lines — joined with spaces.');
  }
  const skipped = Object.keys(skippedTypes);
  if (skipped.length > 0) {
    warnings.push('Skipped unsupported element(s): ' + skipped.join(', ') + '.');
  }
  const markdown = out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  return { markdown: markdown, warnings: warnings };
}

/** Manager-gated, READ-ONLY converter endpoint. Accepts { itemId } (an
 *  existing doc-embed KB item — title/department come back for the editor) or
 *  { driveUrl } (editor embed mode, pre-save). Opens the Doc with the
 *  DEPLOYER's access (same trust model as embedding it) and returns
 *  { markdown, warnings, docTitle, title, department }. Never writes — the
 *  manager reviews in the editor and saves via the existing kbSaveItem,
 *  which is what flips the row to type=article in place. */
function kbConvertDriveDoc(payload) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { error: 'Admin access required.' };
    payload = payload || {};
    let fileId = '', title = '', department = '', status = '';
    const itemId = String(payload.itemId || '').trim();
    if (itemId) {
      const sheet = getOrCreateKbSheet_();
      const last = sheet.getLastRow();
      let row = null;
      if (last >= 2) {
        const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
        for (let i = 0; i < ids.length; i++) {
          if (String(ids[i][0]) === itemId) {
            row = sheet.getRange(i + 2, 1, 1, KB_HEADERS.length).getValues()[0];
            break;
          }
        }
      }
      if (!row) return { error: 'Item not found.' };
      if (String(row[KB.TYPE]) !== 'embed' || String(row[KB.DRIVE_KIND] || 'doc') !== 'doc') {
        return { error: 'Only embedded Google Docs can be converted to articles.' };
      }
      fileId = String(row[KB.DRIVE_FILE_ID] || '');
      title = String(row[KB.TITLE] || '');
      department = String(row[KB.DEPARTMENT] || '');
      // F(M-13): carry the item's status so the editor's "Save as draft"
      // checkbox seeds correctly — converting a DRAFT embed then saving used
      // to silently flip it published (the editor always sends an explicit
      // status, which wins over the stored row).
      status = kbRowStatus_(row[KB.STATUS]);
    } else {
      const parsed = kbParseDriveUrl_(payload.driveUrl);
      if (!parsed) return { error: 'Could not read that Drive link — paste a Google Doc share URL.' };
      if (parsed.kind !== 'doc') return { error: 'Only Google Docs convert to articles — Sheets and files stay as embeds.' };
      fileId = parsed.fileId;
    }
    if (!fileId) return { error: 'No Doc id on this item.' };
    let doc;
    try { doc = DocumentApp.openById(fileId); }
    catch (e) {
      return { error: 'Could not open the Doc — the deploying account needs at least Viewer access. (' + e.message + ')' };
    }
    const res = kbDocBodyToMarkdown_(doc.getBody(), fileId);
    if (res.markdown.length > KB_BODY_MAX) {
      res.warnings.push('Converted article is over the ~49,000-character limit — trim it before saving, or split into multiple articles.');
    }
    return {
      success: true,
      markdown: res.markdown,
      warnings: res.warnings,
      docTitle: String(doc.getName() || ''),
      title: title,
      department: department,
      status: status,   // F(M-13): '' on the driveUrl (no-row) path
    };
  } catch (err) { return { error: err.message }; }
}

// ════════════════════════════════════════════════════════════════════════════
//  TRAINING & EMPLOYEE DOCS — T1: training assignments + completion tracking
//  (docs/training-employee-docs-spec.md). Training CONTENT is KB items; the
//  tracking tabs live in the KB spreadsheet (PHI-free, deployer-only sheet
//  access, server-mediated reads — the KbViews posture). Quizzes are T2;
//  per-employee signable docs (HR_DOCS_SS_ID) are T3.
// ════════════════════════════════════════════════════════════════════════════
const TRAIN_ASSIGN_TAB = 'TrainingAssignments';
const TRAIN_COMPLETE_TAB = 'TrainingCompletions';
const TRAIN_ASSIGN_HEADERS = ['AssignId','ItemType','ItemId','EmpId','AssignedBy','AssignedAt','DueDate','RevokedAt'];
const TRAIN_COMPLETE_HEADERS = ['EmpId','ItemType','ItemId','CompletedAt','Via','QuizAttemptId'];
const TA = { ASSIGN_ID:0, ITEM_TYPE:1, ITEM_ID:2, EMP_ID:3, ASSIGNED_BY:4, ASSIGNED_AT:5, DUE_DATE:6, REVOKED_AT:7 };
const TCMP = { EMP_ID:0, ITEM_TYPE:1, ITEM_ID:2, COMPLETED_AT:3, VIA:4, QUIZ_ATTEMPT_ID:5 };
const TRAIN_ASSIGN_MAX_EMPS = 100;   // per saveTrainingAssignment call

function getOrCreateTrainSheet_(tabName, headers) {
  const ss = getKbSS_();
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

// ── Sheets-coercion read guards ───────────────────────────────────────────
// AssignedAt / CompletedAt are written as 'yyyy-MM-dd HH:mm:ss' strings
// (CONFIG.TIMEZONE wall time, the writeAuditLog_ convention) and DueDate as
// 'yyyy-MM-dd' — Sheets coerces both to Dates on read. Recover them in the
// KB spreadsheet's OWN tz (the tz that coerced them — the normalizeAuditTs_
// / kbGetUsageStats discipline). String compares on the recovered values
// are chronological (lexicographic == chronological for these formats).
function trainCellTs_(v, ssTz) {
  if (v instanceof Date) return Utilities.formatDate(v, ssTz, 'yyyy-MM-dd HH:mm:ss');
  return String(v || '').trim();
}
function trainCellDate_(v, ssTz) {
  if (v instanceof Date) return Utilities.formatDate(v, ssTz, 'yyyy-MM-dd');
  return String(v || '').trim().substring(0, 10);
}

/** Pure status derivation — shared by getMyTraining + getTrainingDashboard
 *  and pinned by a Node test. */
function trainDeriveStatus_(completed, dueDate, todayIso) {
  if (completed) return 'done';
  if (dueDate && todayIso > dueDate) return 'overdue';
  return 'pending';
}

/** Reads every assignment row into plain objects (small tab — assignments
 *  are rare; full read like the KB tree). */
function trainReadAssignments_() {
  const sheet = getOrCreateTrainSheet_(TRAIN_ASSIGN_TAB, TRAIN_ASSIGN_HEADERS);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const ssTz = getKbSS_().getSpreadsheetTimeZone();
  const rows = sheet.getRange(2, 1, last - 1, TRAIN_ASSIGN_HEADERS.length).getValues();
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i][TA.ASSIGN_ID]) continue;
    out.push({
      assignId: String(rows[i][TA.ASSIGN_ID]).trim(),
      itemType: String(rows[i][TA.ITEM_TYPE] || 'kb').trim(),
      itemId: String(rows[i][TA.ITEM_ID] || '').trim(),
      empId: String(rows[i][TA.EMP_ID] || '').trim(),
      assignedBy: String(rows[i][TA.ASSIGNED_BY] || '').trim(),
      assignedAt: trainCellTs_(rows[i][TA.ASSIGNED_AT], ssTz),
      dueDate: trainCellDate_(rows[i][TA.DUE_DATE], ssTz),
      revoked: !!trainCellTs_(rows[i][TA.REVOKED_AT], ssTz),
    });
  }
  return out;
}

function trainReadCompletions_(empIdFilter) {
  const sheet = getOrCreateTrainSheet_(TRAIN_COMPLETE_TAB, TRAIN_COMPLETE_HEADERS);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const ssTz = getKbSS_().getSpreadsheetTimeZone();
  const rows = sheet.getRange(2, 1, last - 1, TRAIN_COMPLETE_HEADERS.length).getValues();
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const empId = String(rows[i][TCMP.EMP_ID] || '').trim();
    if (!empId) continue;
    if (empIdFilter && empId !== empIdFilter) continue;
    out.push({
      empId: empId,
      itemType: String(rows[i][TCMP.ITEM_TYPE] || 'kb').trim(),
      itemId: String(rows[i][TCMP.ITEM_ID] || '').trim(),
      completedAt: trainCellTs_(rows[i][TCMP.COMPLETED_AT], ssTz),
      via: String(rows[i][TCMP.VIA] || '').trim(),
    });
  }
  return out;
}

/** Effective assignment per item for one employee: rows matching the empId
 *  or '*', non-revoked; the LATEST assignedAt wins (re-assign = reset, the
 *  re-certification mechanism — spec §3a). Returns { itemKey: {itemType,
 *  itemId, assignedAt, dueDate} }. */
function trainEffectiveForEmp_(assignments, empId) {
  const eff = {};
  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i];
    if (a.revoked || !a.itemId) continue;
    if (a.empId !== empId && a.empId !== '*') continue;
    const key = a.itemType + ':' + a.itemId;
    if (!eff[key] || a.assignedAt > eff[key].assignedAt) {
      eff[key] = { itemType: a.itemType, itemId: a.itemId, assignedAt: a.assignedAt, dueDate: a.dueDate };
    }
  }
  return eff;
}

/** Bounded KB title join: id → {title, kbType}. */
function trainKbTitles_() {
  const sheet = getOrCreateKbSheet_();
  const last = sheet.getLastRow();
  const map = {};
  if (last < 2) return map;
  // F(L-9): read the full row width so `status` rides along — training must
  // not treat a DRAFT KB item like a published one (draft titles leaked to
  // reps via the checklist, and the item was unopenable for them anyway).
  const rows = sheet.getRange(2, 1, last - 1, KB_HEADERS.length).getValues();
  rows.forEach(function (r) {
    if (r[0]) map[String(r[0])] = {
      title: String(r[2] || '(untitled)'),
      kbType: String(r[3] || 'article'),
      status: kbRowStatus_(r[KB.STATUS]),
    };
  });
  return map;
}

/** Rep-callable, caller-scoped, read-only — the rep's training checklist. */
function getMyTraining() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const assignments = trainReadAssignments_();
    const eff = trainEffectiveForEmp_(assignments, emp.id);
    const keys = Object.keys(eff);
    if (!keys.length) return { items: [] };
    const completions = trainReadCompletions_(emp.id);
    const titles = trainKbTitles_();
    const quizzes = trainReadQuizzes_();
    let attempts = null;   // lazy — only read when a quiz item is assigned
    const todayIso = Utilities.formatDate(new Date(), safeTimezone_(emp.timezone), 'yyyy-MM-dd');
    const items = [];
    keys.forEach(function (key) {
      const a = eff[key];
      let title, kbType = '', quizMeta = null;
      if (a.itemType === 'kb') {
        const kb = titles[a.itemId];
        if (!kb) return;                          // KB item deleted — unactionable, drop
        // F(L-9): a DRAFT is invisible to reps across every read path
        // (INV-140) — getReferenceItem would 404 the reader anyway, so an
        // assigned-then-drafted item drops off the checklist until published.
        if (kb.status === KB_STATUS_DRAFT) return;
        title = kb.title; kbType = kb.kbType;
      } else if (a.itemType === 'quiz') {
        const q = quizzes[a.itemId];
        if (!q) return;                           // quiz deleted — drop (same rule)
        title = q.title;
        if (attempts === null) attempts = trainReadAttempts_(emp.id);
        const stats = trainAttemptStats_(attempts, a.itemId, a.assignedAt);
        // F(cycle-8): the L-9 draft rule applied to the LINKED material too —
        // saveQuiz rejects a draft kbItemId at save time, but flipping the
        // article to draft LATER left the checklist's "Review the material
        // first" link 404ing (getReferenceItem → 'Not found.'). Null the link
        // when the item is gone or drafted; the quiz itself stays assigned.
        const linkedKb = q.kbItemId ? titles[q.kbItemId] : null;
        const linkedKbId = (linkedKb && linkedKb.status !== KB_STATUS_DRAFT) ? q.kbItemId : '';
        quizMeta = { questionCount: q.questionCount, passPct: q.passPct, kbItemId: linkedKbId, attempts: stats.count, lastScorePct: stats.lastScorePct };
      } else return;
      let completedAt = '';
      for (let i = 0; i < completions.length; i++) {
        const c = completions[i];
        if (c.itemType === a.itemType && c.itemId === a.itemId && c.completedAt > a.assignedAt) {
          if (c.completedAt > completedAt) completedAt = c.completedAt;
        }
      }
      items.push({
        itemType: a.itemType, itemId: a.itemId,
        title: title, kbType: kbType, quiz: quizMeta,
        assignedAt: a.assignedAt, dueDate: a.dueDate,
        completed: !!completedAt, completedAt: completedAt,
        status: trainDeriveStatus_(!!completedAt, a.dueDate, todayIso),
      });
    });
    const rank = { overdue: 0, pending: 1, done: 2 };
    items.sort(function (x, y) {
      if (rank[x.status] !== rank[y.status]) return rank[x.status] - rank[y.status];
      const dx = x.dueDate || '9999', dy = y.dueDate || '9999';
      return dx < dy ? -1 : dx > dy ? 1 : x.title.localeCompare(y.title);
    });
    return { items: items };
  } catch (err) { return { error: err.message }; }
}

/** Rep-callable, locked (INV-01). Marks a kb-type training item complete for
 *  the CALLER (via='read' — honor system; kbRecordView rows corroborate).
 *  Requires a live effective assignment; idempotent on an already-complete
 *  item. Audit: TrainingComplete (itemId only — never content). */
function markTrainingComplete(itemId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Not authorized.' };
    itemId = String(itemId || '').trim();
    if (!itemId) return { success: false, error: 'Missing item id.' };
    const eff = trainEffectiveForEmp_(trainReadAssignments_(), emp.id);
    if (eff['quiz:' + itemId]) return { success: false, error: 'This item is completed by passing its quiz.' };
    const a = eff['kb:' + itemId];
    if (!a) return { success: false, error: 'That item is not assigned to you.' };
    const completions = trainReadCompletions_(emp.id);
    for (let i = 0; i < completions.length; i++) {
      const c = completions[i];
      if (c.itemType === 'kb' && c.itemId === itemId && c.completedAt > a.assignedAt) {
        return { success: true, alreadyComplete: true, completedAt: c.completedAt };
      }
    }
    const now = new Date();
    const ts = fmtDate_(now) + ' ' + fmtTime_(now);
    getOrCreateTrainSheet_(TRAIN_COMPLETE_TAB, TRAIN_COMPLETE_HEADERS)
      .appendRow([emp.id, 'kb', itemId, ts, 'read', '']);
    writeAuditLog_(emp, 'TrainingComplete', fmtDate_(now), '', false, 0,
      'itemId=' + itemId + '; via=read');
    return { success: true, completedAt: ts };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Manager-gated (INV-02), read-only. Completion matrix (reps × items) +
 *  the active assignment list for the revoke UI. Deliberately NOT
 *  team-scoped — training visibility matches every other manager surface
 *  (managerGetShiftStats, getTeamMetrics); only Employee Docs (T3) carry
 *  the elevated per-team confidentiality (spec §3b). */
function getTrainingDashboard() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const assignments = trainReadAssignments_();
    const completions = trainReadCompletions_(null);
    const titles = trainKbTitles_();
    const quizzes = trainReadQuizzes_();
    const allAttempts = trainReadAttempts_(null);
    function itemTitle_(a) {
      if (a.itemType === 'kb') return titles[a.itemId] ? titles[a.itemId].title : null;
      if (a.itemType === 'quiz') return quizzes[a.itemId] ? quizzes[a.itemId].title : null;
      return null;
    }
    const rows = getEmployeeRosterRows_();
    const emps = [];
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][EMP.EMAIL]) continue;
      emps.push({ id: String(rows[i][EMP.ID]).trim(), name: String(rows[i][EMP.NAME]).trim() });
    }
    emps.sort(function (a, b) { return a.name.localeCompare(b.name); });
    const todayIso = Utilities.formatDate(new Date(), CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE, 'yyyy-MM-dd');
    // Items = distinct itemKeys across live assignments that still exist in the KB.
    const itemMap = {};
    const reps = [];
    emps.forEach(function (e) {
      const eff = trainEffectiveForEmp_(assignments, e.id);
      const cell = {};
      const attemptsByKey = {};
      Object.keys(eff).forEach(function (key) {
        const a = eff[key];
        const title = itemTitle_(a);
        if (!title) return;   // kb item / quiz deleted — drop (same rule as the checklist)
        if (!itemMap[key]) itemMap[key] = { key: key, itemType: a.itemType, itemId: a.itemId, title: title, assigned: 0, done: 0, overdue: 0 };
        let completedAt = '';
        for (let i = 0; i < completions.length; i++) {
          const c = completions[i];
          if (c.empId === e.id && c.itemType === a.itemType && c.itemId === a.itemId && c.completedAt > a.assignedAt) {
            if (c.completedAt > completedAt) completedAt = c.completedAt;
          }
        }
        const status = trainDeriveStatus_(!!completedAt, a.dueDate, todayIso);
        cell[key] = status;
        if (a.itemType === 'quiz') {
          const stats = trainAttemptStats_(allAttempts.filter(function (at) { return at.empId === e.id; }), a.itemId, a.assignedAt);
          if (stats.count) attemptsByKey[key] = stats.count;
        }
        itemMap[key].assigned++;
        if (status === 'done') itemMap[key].done++;
        if (status === 'overdue') itemMap[key].overdue++;
      });
      if (Object.keys(cell).length) reps.push({ id: e.id, name: e.name, items: cell, attempts: attemptsByKey });
    });
    const items = Object.keys(itemMap).map(function (k) { return itemMap[k]; })
      .sort(function (a, b) { return a.title.localeCompare(b.title); });
    // Active (non-revoked) assignment rows for the revoke UI.
    const empName = {};
    emps.forEach(function (e) { empName[e.id] = e.name; });
    const active = assignments.filter(function (a) { return !a.revoked && itemTitle_(a); })
      .map(function (a) {
        return {
          assignId: a.assignId, itemType: a.itemType, itemId: a.itemId, title: itemTitle_(a),
          empId: a.empId, empLabel: a.empId === '*' ? 'All employees' : (empName[a.empId] || a.empId),
          assignedBy: a.assignedBy, assignedAt: a.assignedAt, dueDate: a.dueDate,
        };
      })
      .sort(function (x, y) { return x.assignedAt < y.assignedAt ? 1 : -1; });
    return { items: items, reps: reps, assignments: active };
  } catch (err) { return { error: err.message }; }
}

/** Manager-gated (INV-02), locked (INV-01). Assigns one KB item to one or
 *  more employees (or '*' = everyone). Always APPENDS — a duplicate
 *  assignment for the same (item, emp) is the deliberate "reset" path (the
 *  newer assignedAt requires a fresh completion, spec §3a). Best-effort
 *  branded notification per employee (INV-14). Audit: TrainingAssign. */
function saveTrainingAssignment(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    payload = payload || {};
    const itemType = payload.itemType === 'quiz' ? 'quiz' : 'kb';
    const itemId = String(payload.itemId || '').trim();
    if (!itemId) return { success: false, error: 'Pick an item to assign.' };
    let itemTitle;
    if (itemType === 'quiz') {
      const q = trainReadQuizzes_()[itemId];
      if (!q) return { success: false, error: 'That quiz no longer exists.' };
      itemTitle = q.title;
    } else {
      const kb = trainKbTitles_()[itemId];
      if (!kb) return { success: false, error: 'That Reference item no longer exists.' };
      // F(L-9): a draft is rep-invisible (INV-140) — assigning it would leak
      // its title into every target's checklist and the reader would 404.
      if (kb.status === KB_STATUS_DRAFT) {
        return { success: false, error: 'That Reference item is a draft — publish it before assigning it as training.' };
      }
      itemTitle = kb.title;
    }
    const dueDate = String(payload.dueDate || '').trim();
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { success: false, error: 'Invalid due date.' };
    // Resolve targets: '*' or a validated, deduped list of roster ids.
    let targets = [];
    let allMode = false;
    if (payload.empIds === '*' || (Array.isArray(payload.empIds) && payload.empIds.indexOf('*') >= 0)) {
      allMode = true;
    } else if (Array.isArray(payload.empIds)) {
      const rows = getEmployeeRosterRows_();
      const valid = {};
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][EMP.EMAIL]) valid[String(rows[i][EMP.ID]).trim()] = true;
      }
      const seen = {};
      payload.empIds.forEach(function (id) {
        id = String(id || '').trim();
        if (id && valid[id] && !seen[id]) { seen[id] = true; targets.push(id); }
      });
    }
    if (!allMode && !targets.length) return { success: false, error: 'Pick at least one employee.' };
    if (targets.length > TRAIN_ASSIGN_MAX_EMPS) return { success: false, error: 'Too many employees in one assignment (max ' + TRAIN_ASSIGN_MAX_EMPS + ').' };
    const sheet = getOrCreateTrainSheet_(TRAIN_ASSIGN_TAB, TRAIN_ASSIGN_HEADERS);
    const now = new Date();
    const ts = fmtDate_(now) + ' ' + fmtTime_(now);
    const writeIds = allMode ? ['*'] : targets;
    writeIds.forEach(function (empId) {
      sheet.appendRow([Utilities.getUuid(), itemType, itemId, empId, callerEmp.email, ts, dueDate, '']);
    });
    writeAuditLog_(callerEmp, 'TrainingAssign', fmtDate_(now), '', false, 0,
      'itemType=' + itemType + '; itemId=' + itemId + '; targets=' + (allMode ? 'all' : targets.length) + (dueDate ? '; due=' + dueDate : ''),
      callerEmp.email);
    notifyTrainingAssigned_(allMode ? null : targets, itemTitle, dueDate);
    return { success: true, assigned: allMode ? 'all' : targets.length };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Manager-gated (INV-02), locked (INV-01). Revokes one assignment row
 *  (sets RevokedAt — never deletes; the history stays legible). Idempotent.
 *  Audit: TrainingRevoke. */
function revokeTrainingAssignment(assignId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    assignId = String(assignId || '').trim();
    if (!assignId) return { success: false, error: 'Missing assignment id.' };
    const sheet = getOrCreateTrainSheet_(TRAIN_ASSIGN_TAB, TRAIN_ASSIGN_HEADERS);
    const last = sheet.getLastRow();
    if (last < 2) return { success: false, error: 'Assignment not found.' };
    const ids = sheet.getRange(2, TA.ASSIGN_ID + 1, last - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() !== assignId) continue;
      const rowIdx = i + 2;
      const revokedCell = sheet.getRange(rowIdx, TA.REVOKED_AT + 1);
      const ssTz = getKbSS_().getSpreadsheetTimeZone();
      if (trainCellTs_(revokedCell.getValue(), ssTz)) return { success: true, alreadyRevoked: true };
      const now = new Date();
      revokedCell.setValue(fmtDate_(now) + ' ' + fmtTime_(now));
      writeAuditLog_(callerEmp, 'TrainingRevoke', fmtDate_(now), '', false, 0,
        'assignId=' + assignId, callerEmp.email);
      return { success: true };
    }
    return { success: false, error: 'Assignment not found.' };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Best-effort (INV-14): branded "training assigned" email to each target
 *  employee (null targets = everyone on the roster with an email). Failures
 *  log and never block the assignment. */
function notifyTrainingAssigned_(targetIds, itemTitle, dueDate) {
  try {
    const rows = getEmployeeRosterRows_();
    const wanted = targetIds ? {} : null;
    if (targetIds) targetIds.forEach(function (id) { wanted[id] = true; });
    for (let i = 1; i < rows.length; i++) {
      const email = String(rows[i][EMP.EMAIL] || '').trim();
      const id = String(rows[i][EMP.ID] || '').trim();
      if (!email) continue;
      if (wanted && !wanted[id]) continue;
      try {
        const name = String(rows[i][EMP.NAME] || '').trim();
        const body = 'Hi ' + name + ',\n\nNew training has been assigned to you: ' + itemTitle +
          (dueDate ? '\nDue: ' + dueDate : '') +
          '\n\nOpen the web app → Training & Employee Docs → My Training to review and mark it complete.';
        const htmlBody = buildBrandedEmailHtml_('New training assigned',
          '<p style="margin:0 0 12px;">Hi ' + esc_(name) + ',</p>' +
          brandedKvRows_([['Training item', itemTitle]].concat(dueDate ? [['Due', dueDate]] : [])) +
          '<p style="margin:12px 0 0;">Open the web app → <strong>Training &amp; Employee Docs → My Training</strong> to review and mark it complete.</p>');
        MailApp.sendEmail({ to: email, subject: '📚 New training assigned: ' + itemTitle, body: body, htmlBody: htmlBody });
      } catch (e) { console.warn('notifyTrainingAssigned_ to one recipient failed: ' + e.message); }
    }
  } catch (e) { console.warn('notifyTrainingAssigned_ failed: ' + e.message); }
}

// ── T2: Quizzes (server-graded; answer keys NEVER ship to the client) ──────
// docs/training-employee-docs-spec.md §5 + §9.4 (unlimited retries, never
// reveal correct answers — only per-question right/wrong; attempts tracked).
const TRAIN_QUIZ_TAB = 'Quizzes';
const TRAIN_ATTEMPT_TAB = 'QuizAttempts';
const TRAIN_QUIZ_HEADERS = ['QuizId','Title','KbItemId','PassPct','QuestionsJson','UpdatedBy','UpdatedAt'];
const TRAIN_ATTEMPT_HEADERS = ['AttemptId','QuizId','EmpId','SubmittedAt','ScorePct','Passed','PerQuestionJson'];
const TQ = { QUIZ_ID:0, TITLE:1, KB_ITEM_ID:2, PASS_PCT:3, QUESTIONS_JSON:4, UPDATED_BY:5, UPDATED_AT:6 };
const TQA = { ATTEMPT_ID:0, QUIZ_ID:1, EMP_ID:2, SUBMITTED_AT:3, SCORE_PCT:4, PASSED:5, PER_QUESTION_JSON:6 };
const TRAIN_QUIZ_MAX_QUESTIONS = 50;
const TRAIN_QUIZ_MAX_OPTIONS = 6;
const TRAIN_QUIZ_JSON_MAX = 45000;   // under the 50k Sheets cell limit (INV-96 spirit)

/** Pure — validates + normalizes a quiz definition. Returns { ok, quiz } or
 *  { ok:false, error }. Whitelist-built: only known fields survive. */
function trainValidateQuizDef_(def) {
  def = def || {};
  const title = String(def.title || '').trim();
  if (!title || title.length > 120) return { ok: false, error: 'Quiz title is required (max 120 chars).' };
  const passPct = Math.round(Number(def.passPct));
  if (!(passPct >= 0 && passPct <= 100)) return { ok: false, error: 'Pass threshold must be 0–100.' };
  const kbItemId = String(def.kbItemId || '').trim();
  if (!Array.isArray(def.questions) || def.questions.length < 1 || def.questions.length > TRAIN_QUIZ_MAX_QUESTIONS) {
    return { ok: false, error: 'A quiz needs 1–' + TRAIN_QUIZ_MAX_QUESTIONS + ' questions.' };
  }
  const questions = [];
  for (let i = 0; i < def.questions.length; i++) {
    const q = def.questions[i] || {};
    const text = String(q.q || '').trim();
    if (!text || text.length > 500) return { ok: false, error: 'Question ' + (i + 1) + ': text is required (max 500 chars).' };
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > TRAIN_QUIZ_MAX_OPTIONS) {
      return { ok: false, error: 'Question ' + (i + 1) + ': needs 2–' + TRAIN_QUIZ_MAX_OPTIONS + ' options.' };
    }
    const options = [];
    for (let j = 0; j < q.options.length; j++) {
      const opt = String(q.options[j] || '').trim();
      if (!opt || opt.length > 200) return { ok: false, error: 'Question ' + (i + 1) + ', option ' + (j + 1) + ': text is required (max 200 chars).' };
      options.push(opt);
    }
    const correct = Math.round(Number(q.correct));
    if (!(correct >= 0 && correct < options.length)) return { ok: false, error: 'Question ' + (i + 1) + ': pick the correct option.' };
    questions.push({ q: text, options: options, correct: correct });
  }
  return { ok: true, quiz: { title: title, kbItemId: kbItemId, passPct: passPct, questions: questions } };
}

/** Pure — grades answers (option indices; missing/invalid = wrong) against
 *  the full question defs. Returns { scorePct, passed-less data }: right,
 *  total, perQuestion booleans. NEVER returns the correct indices. */
function trainGradeQuiz_(questions, answers) {
  const perQuestion = [];
  let right = 0;
  for (let i = 0; i < questions.length; i++) {
    const a = (answers && answers.length > i) ? Math.round(Number(answers[i])) : -1;
    const ok = a === questions[i].correct;
    perQuestion.push(ok);
    if (ok) right++;
  }
  const total = questions.length || 1;
  return { right: right, total: questions.length, perQuestion: perQuestion, scorePct: Math.round(100 * right / total) };
}

/** Pure — the rep-facing shape. WHITELIST-constructed (never a delete-key
 *  copy), so `correct` cannot leak through a missed field (the privacy
 *  boundary — pinned by a Node test + a getQuiz source tripwire). */
function trainStripQuizForRep_(quizId, quiz) {
  return {
    quizId: quizId, title: quiz.title, passPct: quiz.passPct,
    kbItemId: quiz.kbItemId || '',
    questions: (quiz.questions || []).map(function (q) { return { q: q.q, options: q.options.slice() }; }),
  };
}

/** All quiz rows as { quizId: {title, kbItemId, passPct, questions[], questionCount} }.
 *  Corrupt QuestionsJson → quiz skipped (callNoteRowToObject_ discipline). */
function trainReadQuizzes_() {
  const sheet = getOrCreateTrainSheet_(TRAIN_QUIZ_TAB, TRAIN_QUIZ_HEADERS);
  const last = sheet.getLastRow();
  const map = {};
  if (last < 2) return map;
  const rows = sheet.getRange(2, 1, last - 1, TRAIN_QUIZ_HEADERS.length).getValues();
  for (let i = 0; i < rows.length; i++) {
    const id = String(rows[i][TQ.QUIZ_ID] || '').trim();
    if (!id) continue;
    let questions = null;
    try { questions = JSON.parse(String(rows[i][TQ.QUESTIONS_JSON] || '')); } catch (_) {}
    if (!Array.isArray(questions) || !questions.length) continue;
    map[id] = {
      title: String(rows[i][TQ.TITLE] || '(untitled quiz)'),
      kbItemId: String(rows[i][TQ.KB_ITEM_ID] || '').trim(),
      passPct: Math.round(Number(rows[i][TQ.PASS_PCT])) || 0,
      questions: questions,
      questionCount: questions.length,
      rowIdx: i + 2,
    };
  }
  return map;
}

/** Attempts for one rep (or all when empIdFilter is null), coercion-guarded. */
function trainReadAttempts_(empIdFilter) {
  const sheet = getOrCreateTrainSheet_(TRAIN_ATTEMPT_TAB, TRAIN_ATTEMPT_HEADERS);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const ssTz = getKbSS_().getSpreadsheetTimeZone();
  const rows = sheet.getRange(2, 1, last - 1, TRAIN_ATTEMPT_HEADERS.length).getValues();
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const empId = String(rows[i][TQA.EMP_ID] || '').trim();
    if (!empId) continue;
    if (empIdFilter && empId !== empIdFilter) continue;
    out.push({
      quizId: String(rows[i][TQA.QUIZ_ID] || '').trim(),
      empId: empId,
      submittedAt: trainCellTs_(rows[i][TQA.SUBMITTED_AT], ssTz),
      scorePct: Math.round(Number(rows[i][TQA.SCORE_PCT])) || 0,
      passed: String(rows[i][TQA.PASSED]).toLowerCase() === 'true',
    });
  }
  return out;
}

/** Attempts since the current assignment round (the §3a reset semantics —
 *  a re-assign starts the attempt count over too). */
function trainAttemptStats_(attempts, quizId, assignedAt) {
  let count = 0, lastScore = null;
  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i];
    if (a.quizId !== quizId || a.submittedAt <= assignedAt) continue;
    count++;
    if (lastScore === null || a.submittedAt >= lastScore.at) lastScore = { at: a.submittedAt, scorePct: a.scorePct };
  }
  return { count: count, lastScorePct: lastScore ? lastScore.scorePct : null };
}

/** Rep-callable — the quiz WITHOUT its answer key (trainStripQuizForRep_ is
 *  the only shape that leaves the server; the caller must hold a live
 *  assignment, same scoping rule as markTrainingComplete). */
function getQuiz(quizId) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    quizId = String(quizId || '').trim();
    const quiz = trainReadQuizzes_()[quizId];
    if (!quiz) return { error: 'Quiz not found.' };
    const eff = trainEffectiveForEmp_(trainReadAssignments_(), emp.id);
    if (!eff['quiz:' + quizId] && !emp.isManager) return { error: 'That quiz is not assigned to you.' };
    return trainStripQuizForRep_(quizId, quiz);
  } catch (err) { return { error: err.message }; }
}

/** Rep-callable, locked (INV-01). Grades server-side, appends the attempt,
 *  and on a pass appends the TrainingCompletions row (via='quiz'). Returns
 *  score + per-question right/wrong ONLY — never the correct options
 *  (spec §9.4). Unlimited retries; attempt # rides back for display. */
function submitQuizAttempt(quizId, answers) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Not authorized.' };
    quizId = String(quizId || '').trim();
    const quiz = trainReadQuizzes_()[quizId];
    if (!quiz) return { success: false, error: 'Quiz not found.' };
    const eff = trainEffectiveForEmp_(trainReadAssignments_(), emp.id);
    const a = eff['quiz:' + quizId];
    if (!a) return { success: false, error: 'That quiz is not assigned to you.' };
    if (!Array.isArray(answers)) answers = [];
    const graded = trainGradeQuiz_(quiz.questions, answers);
    const passed = graded.scorePct >= quiz.passPct;
    const now = new Date();
    const ts = fmtDate_(now) + ' ' + fmtTime_(now);
    const attemptId = Utilities.getUuid();
    getOrCreateTrainSheet_(TRAIN_ATTEMPT_TAB, TRAIN_ATTEMPT_HEADERS).appendRow([
      attemptId, quizId, emp.id, ts, graded.scorePct, passed ? 'TRUE' : 'FALSE',
      JSON.stringify(graded.perQuestion),
    ]);
    const stats = trainAttemptStats_(trainReadAttempts_(emp.id), quizId, a.assignedAt);
    // Completion: only on a pass, and only once per assignment round.
    let alreadyComplete = false;
    if (passed) {
      const completions = trainReadCompletions_(emp.id);
      for (let i = 0; i < completions.length; i++) {
        const c = completions[i];
        if (c.itemType === 'quiz' && c.itemId === quizId && c.completedAt > a.assignedAt) { alreadyComplete = true; break; }
      }
      if (!alreadyComplete) {
        getOrCreateTrainSheet_(TRAIN_COMPLETE_TAB, TRAIN_COMPLETE_HEADERS)
          .appendRow([emp.id, 'quiz', quizId, ts, 'quiz', attemptId]);
      }
    }
    writeAuditLog_(emp, 'QuizAttempt', fmtDate_(now), '', false, 0,
      'quizId=' + quizId + '; score=' + graded.scorePct + '; passed=' + passed + '; attempt=' + stats.count);
    return {
      success: true, scorePct: graded.scorePct, passed: passed,
      right: graded.right, total: graded.total,
      perQuestion: graded.perQuestion, attempt: stats.count, passPct: quiz.passPct,
    };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Manager-gated — full quiz defs INCLUDING answer keys (managers author
 *  them); feeds the editor + the assignment form's quiz picker. */
function getQuizzes() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const map = trainReadQuizzes_();
    const quizzes = Object.keys(map).map(function (id) {
      const q = map[id];
      return { quizId: id, title: q.title, kbItemId: q.kbItemId, passPct: q.passPct, questionCount: q.questionCount, questions: q.questions };
    }).sort(function (a, b) { return a.title.localeCompare(b.title); });
    return { quizzes: quizzes };
  } catch (err) { return { error: err.message }; }
}

/** Manager-gated (INV-02), locked (INV-01). Create-or-update by quizId.
 *  Validates via the pure trainValidateQuizDef_; bounds the stored JSON
 *  (INV-96 spirit). Audit: QuizSave (id + question count — never text). */
function saveQuiz(def) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const v = trainValidateQuizDef_(def);
    if (!v.ok) return { success: false, error: v.error };
    if (v.quiz.kbItemId) {
      const linkedKb = trainKbTitles_()[v.quiz.kbItemId];
      if (!linkedKb) return { success: false, error: 'The linked Reference item no longer exists.' };
      // Turn A (L-9 sibling): a DRAFT is rep-invisible (INV-140) — the quiz's
      // "Review the material first" link would 404 for every rep.
      if (linkedKb.status === KB_STATUS_DRAFT) {
        return { success: false, error: 'The linked Reference item is a draft — publish it before linking it to a quiz.' };
      }
    }
    const qJson = JSON.stringify(v.quiz.questions);
    if (qJson.length > TRAIN_QUIZ_JSON_MAX) return { success: false, error: 'Quiz is too large — split it into two quizzes.' };
    const sheet = getOrCreateTrainSheet_(TRAIN_QUIZ_TAB, TRAIN_QUIZ_HEADERS);
    const quizId = String((def && def.quizId) || '').trim() || Utilities.getUuid();
    const now = new Date();
    const ts = fmtDate_(now) + ' ' + fmtTime_(now);
    const rowVals = [quizId, v.quiz.title, v.quiz.kbItemId, v.quiz.passPct, qJson, callerEmp.email, ts];
    const existing = trainReadQuizzes_()[quizId];
    if (existing) sheet.getRange(existing.rowIdx, 1, 1, TRAIN_QUIZ_HEADERS.length).setValues([rowVals]);
    else sheet.appendRow(rowVals);
    writeAuditLog_(callerEmp, 'QuizSave', fmtDate_(now), '', false, 0,
      'quizId=' + quizId + '; questions=' + v.quiz.questions.length + '; passPct=' + v.quiz.passPct, callerEmp.email);
    return { success: true, quizId: quizId };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Manager-gated (INV-02), locked (INV-01). Deletes the quiz ROW (attempts
 *  + completions stay — append-only history); live assignments referencing
 *  it drop off checklists/dashboards via the title join, same as a deleted
 *  KB item. Audit: QuizDelete. */
function deleteQuiz(quizId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    quizId = String(quizId || '').trim();
    const existing = trainReadQuizzes_()[quizId];
    if (!existing) return { success: false, error: 'Quiz not found.' };
    getOrCreateTrainSheet_(TRAIN_QUIZ_TAB, TRAIN_QUIZ_HEADERS).deleteRow(existing.rowIdx);
    const now = new Date();
    writeAuditLog_(callerEmp, 'QuizDelete', fmtDate_(now), '', false, 0, 'quizId=' + quizId, callerEmp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

// ── T4: Quiz analytics (manager-gated, read-only aggregate) ────────────────
// docs/training-employee-docs-spec.md §5 ("quiz score summaries"). A bounded
// full read of the small Quizzes + QuizAttempts tabs, aggregated per quiz.
// Returns ONLY counts/averages — no answer keys, no per-question booleans, no
// rep-identifying detail beyond distinct counts (INV-121 stays intact: the
// answer key never leaves the server, and this surface adds nothing per-rep).

/** Pure — per-quiz aggregate over all attempt rows. Pinned by a Node test.
 *  `quizzesMap` is trainReadQuizzes_()'s shape ({id:{title,passPct,...}});
 *  `attempts` is trainReadAttempts_(null)'s shape ([{quizId,empId,scorePct,
 *  passed}]). Quizzes with zero attempts still appear (passRate/avgScore
 *  null) so the manager sees an assigned-but-untaken quiz. */
function trainQuizAnalytics_(quizzesMap, attempts) {
  const acc = {};
  Object.keys(quizzesMap || {}).forEach(function (id) {
    acc[id] = {
      quizId: id, title: quizzesMap[id].title, passPct: quizzesMap[id].passPct,
      attemptCount: 0, scoreSum: 0,
      attemptedReps: {}, passedReps: {},
    };
  });
  (attempts || []).forEach(function (a) {
    const e = acc[a.quizId];
    if (!e) return;                       // attempt for a since-deleted quiz — drop
    e.attemptCount++;
    e.scoreSum += (Number(a.scorePct) || 0);
    if (a.empId) {
      e.attemptedReps[a.empId] = true;
      if (a.passed) e.passedReps[a.empId] = true;
    }
  });
  return Object.keys(acc).map(function (id) {
    const e = acc[id];
    const repsAttempted = Object.keys(e.attemptedReps).length;
    const repsPassed = Object.keys(e.passedReps).length;
    return {
      quizId: e.quizId, title: e.title, passPct: e.passPct,
      attemptCount: e.attemptCount,
      repsAttempted: repsAttempted,
      repsPassed: repsPassed,
      passRate: repsAttempted ? Math.round(100 * repsPassed / repsAttempted) : null,
      avgScore: e.attemptCount ? Math.round(e.scoreSum / e.attemptCount) : null,
      avgAttemptsPerRep: repsAttempted ? Math.round(10 * e.attemptCount / repsAttempted) / 10 : null,
    };
  }).sort(function (a, b) { return a.title.localeCompare(b.title); });
}

/** Manager-gated (INV-02), read-only. Quiz score summaries for the Team
 *  Training analytics panel. Aggregate-only — no answer keys, no per-rep
 *  rows (INV-121). */
function getQuizAnalytics() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    return { quizzes: trainQuizAnalytics_(trainReadQuizzes_(), trainReadAttempts_(null)) };
  } catch (err) { return { error: err.message }; }
}


// ── T3: Employee Docs (per-employee signable documents) ────────────────────
// docs/training-employee-docs-spec.md §3b/§4/§5. A DEDICATED spreadsheet
// (Script Property HR_DOCS_SS_ID — NEVER co-located with the KB, ADP, or PHI
// sheets; there is deliberately NO fallback store) holds per-employee docs
// (reviews, PIPs, policy acks). Content is FROZEN at issue (markdown +
// contentHash in the row); signatures are append-only + tamper-evident
// (hash excludes the timestamp — the INV-113 lesson; the audit row is the
// independent witness). Manager visibility is PER-TEAM and FAIL-CLOSED
// (§9.3): owner + issuer + the employee's roster ManagerEmail (column M) —
// a blank column M narrows to owner+issuer, never widens. These tabs are
// EXCLUDED from every retention purge: HR records are keep-forever.
const EMPDOC_TAB = 'EmpDocs';
const EMPDOC_SIG_TAB = 'DocSignatures';
const EMPDOC_HEADERS = ['DocId','EmpId','DocType','Title','BodyMd','ContentHash','RequiresSignature','Status','IssuedBy','IssuedAt','DueAt','SignedAt','VoidReason','FieldsJson','ResponsesJson'];
const EMPDOC_SIG_HEADERS = ['DocId','EmpId','SignedAt','SignatureDataUrl','AckVersion','SignatureHash','Certificate'];
const ED = { DOC_ID:0, EMP_ID:1, DOC_TYPE:2, TITLE:3, BODY_MD:4, CONTENT_HASH:5, REQUIRES_SIG:6, STATUS:7, ISSUED_BY:8, ISSUED_AT:9, DUE_AT:10, SIGNED_AT:11, VOID_REASON:12, FIELDS:13, RESPONSES:14 };
const EDS = { DOC_ID:0, EMP_ID:1, SIGNED_AT:2, SIGNATURE:3, ACK_VERSION:4, SIG_HASH:5, CERTIFICATE:6 };
const EMPDOC_TYPES = ['review','pip','policy','other'];
// v2 — manager-curated reusable templates (e.g. "Annual Performance Review").
// Org-wide + PHI-free (form shells, not employee data) → not team-scoped.
const EMPDOC_TPL_TAB = 'EmpDocTemplates';
const EMPDOC_TPL_HEADERS = ['TemplateId','Name','DocType','BodyMd','FieldsJson','RequiresSignature','CreatedBy','CreatedAt'];
const EDT = { TPL_ID:0, NAME:1, DOC_TYPE:2, BODY_MD:3, FIELDS:4, REQUIRES_SIG:5, CREATED_BY:6, CREATED_AT:7 };
// v2 — employee-completable fields on a doc (in addition to the signature).
const EMPDOC_FIELD_TYPES = ['text','textarea','date'];
const EMPDOC_FIELD_CAP = 40;              // max fields per doc/template
const EMPDOC_FIELD_LABEL_MAX = 200;
const EMPDOC_RESPONSE_MAX = 8000;         // per free-text response
const EMPDOC_TPL_NAME_MAX = 120;
const EMPDOC_TITLE_MAX = 200;
const EMPDOC_BODY_MAX = 49000;        // under the 50k Sheets cell limit
const EMPDOC_SIG_MAX_CHARS = 45000;   // INV-96 cap; the pad export downscales to <=600px
// Bump when the acknowledgment copy below changes, so stored signatures
// prove which language the signer saw (the FORM_CONSENT_VERSION pattern).
const EMPDOC_ACK_VERSION = 1;
const EMPDOC_ACK_TEXT = 'I acknowledge that I have read and understood this document. ' +
  'I understand this electronic acknowledgment has the same effect as a handwritten signature.';

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
    sheet.appendRow(headers);
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
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  }
  return sheet;
}

function empDocSha256Hex_(payload) {
  const buf = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, payload);
  let out = '';
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i] < 0 ? buf[i] + 256 : buf[i];
    out += (b < 16 ? '0' : '') + b.toString(16);
  }
  return out;
}
/** Content hash — freezes what was issued (body+title+type+empId, + the v2
 *  fillable-field SCHEMA when present). `fieldsJson` is appended ONLY when
 *  non-empty so legacy 4-arg callers / fieldless rows hash identically to
 *  before (back-compat — old stored hashes stay valid). Callers MUST pass the
 *  RAW stored FieldsJson cell string (not a re-serialized object) so recompute
 *  is byte-stable. */
function empDocContentHash_(bodyMd, title, docType, empId, fieldsJson) {
  let base = String(bodyMd || '') + ' ' + String(title || '') + ' ' + String(docType || '') + ' ' + String(empId || '');
  if (fieldsJson) base += ' ' + String(fieldsJson);
  return empDocSha256Hex_(base);
}
/** Signature hash — covers the frozen content hash + identity + the ack
 *  version. Deliberately NOT the timestamp (Sheets coerces datetime cells to
 *  Dates on read, which would break recompute — INV-113); the EmpDocSigned
 *  audit row is the independent timestamp witness. */
function empDocSignatureHash_(contentHash, empId, docId, signatureDataUrl, ackVersion, responsesJson) {
  let base = String(contentHash || '') + ' ' + String(empId || '') + ' ' + String(docId || '') + ' ' + String(signatureDataUrl || '') + ' ' + String(ackVersion || '');
  if (responsesJson) base += ' ' + String(responsesJson);   // v2 — the signed responses are attested too (back-compat: appended only when present)
  return empDocSha256Hex_(base);
}

/** Pure — issueDoc payload validation (Node-pinned). Returns {ok, doc} or
 *  {ok:false, error}. Whitelist-built. */
function empDocValidateIssue_(payload) {
  payload = payload || {};
  const empId = String(payload.empId || '').trim();
  if (!empId) return { ok: false, error: 'Pick an employee.' };
  const docType = String(payload.docType || '').trim().toLowerCase();
  if (EMPDOC_TYPES.indexOf(docType) < 0) return { ok: false, error: 'Invalid document type.' };
  const title = String(payload.title || '').trim();
  if (!title || title.length > EMPDOC_TITLE_MAX) return { ok: false, error: 'Title is required (max ' + EMPDOC_TITLE_MAX + ' chars).' };
  const bodyMd = String(payload.bodyMd || '');
  if (!bodyMd.trim()) return { ok: false, error: 'Document body is required.' };
  if (bodyMd.length > EMPDOC_BODY_MAX) return { ok: false, error: 'Document is too long (max ~49,000 chars).' };
  const dueAt = String(payload.dueAt || '').trim();
  if (dueAt && !/^\d{4}-\d{2}-\d{2}$/.test(dueAt)) return { ok: false, error: 'Invalid due date.' };
  const fv = empDocValidateFields_(payload.fields);
  if (!fv.ok) return { ok: false, error: fv.error };
  return { ok: true, doc: {
    empId: empId, docType: docType, title: title, bodyMd: bodyMd, dueAt: dueAt,
    requiresSignature: payload.requiresSignature !== false,
    fields: fv.fields,
    // v2 — manager can save as a DRAFT (invisible to the employee) and Release
    // later; default behavior (no flag) is to issue immediately (back-compat).
    status: payload.release === false ? 'draft' : 'issued',
  } };
}

/** Pure (Node-pinned) — normalize + validate a fillable-field schema. Returns
 *  {ok, fields:[{id,label,type,required}]} or {ok:false,error}. Auto-derives a
 *  stable slug id from the label when absent; dedupes ids. */
function empDocValidateFields_(fields) {
  if (fields == null) return { ok: true, fields: [] };
  if (!Array.isArray(fields)) return { ok: false, error: 'Fields must be a list.' };
  if (fields.length > EMPDOC_FIELD_CAP) return { ok: false, error: 'Too many fields (max ' + EMPDOC_FIELD_CAP + ').' };
  const out = [];
  const seen = {};
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i] || {};
    const label = String(f.label || '').trim();
    if (!label) return { ok: false, error: 'Each field needs a label.' };
    if (label.length > EMPDOC_FIELD_LABEL_MAX) return { ok: false, error: 'A field label is too long.' };
    const type = String(f.type || 'text').trim().toLowerCase();
    if (EMPDOC_FIELD_TYPES.indexOf(type) < 0) return { ok: false, error: 'Invalid field type "' + type + '".' };
    let id = String(f.id || f.label || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!id) id = 'f' + (i + 1);
    let base = id, n = 2;
    while (seen[id]) { id = base + '-' + (n++); }
    seen[id] = true;
    out.push({ id: id, label: label, type: type, required: f.required !== false });
  }
  return { ok: true, fields: out };
}

/** Pure (Node-pinned) — validate the employee's responses against the doc's
 *  field schema. Every required field must be non-empty; sizes are bounded.
 *  Returns {ok, responses} (keyed by field id, only known fields kept) or
 *  {ok:false,error}. */
function empDocValidateResponses_(fields, responses) {
  fields = Array.isArray(fields) ? fields : [];
  responses = (responses && typeof responses === 'object') ? responses : {};
  const out = {};
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const raw = responses[f.id];
    const val = raw == null ? '' : String(raw).trim();
    if (f.required && !val) return { ok: false, error: 'Please complete: ' + f.label };
    if (val.length > EMPDOC_RESPONSE_MAX) return { ok: false, error: 'A response is too long (max ' + EMPDOC_RESPONSE_MAX + ' chars).' };
    if (f.type === 'date' && val && !/^\d{4}-\d{2}-\d{2}$/.test(val)) return { ok: false, error: 'Invalid date for: ' + f.label };
    if (val) out[f.id] = val;
  }
  return { ok: true, responses: out };
}

/** Pure (Node-pinned) — does this doc still need employee action? (an
 *  unsigned signature OR an unfilled required field). Drives "overdue". */
function empDocNeedsAction_(doc) {
  if (!doc || doc.status !== 'issued') return false;
  if (doc.requiresSignature) return true;
  const fields = Array.isArray(doc.fields) ? doc.fields : [];
  return fields.some(function (f) { return f.required; });
}

/** Pure (Node-pinned) — saveEmpDocTemplate validation. */
function empDocTemplateValidate_(payload) {
  payload = payload || {};
  const name = String(payload.name || '').trim();
  if (!name || name.length > EMPDOC_TPL_NAME_MAX) return { ok: false, error: 'Template name is required (max ' + EMPDOC_TPL_NAME_MAX + ' chars).' };
  const docType = String(payload.docType || 'review').trim().toLowerCase();
  if (EMPDOC_TYPES.indexOf(docType) < 0) return { ok: false, error: 'Invalid document type.' };
  const bodyMd = String(payload.bodyMd || '');
  if (!bodyMd.trim()) return { ok: false, error: 'Template body is required.' };
  if (bodyMd.length > EMPDOC_BODY_MAX) return { ok: false, error: 'Template body is too long.' };
  const fv = empDocValidateFields_(payload.fields);
  if (!fv.ok) return { ok: false, error: fv.error };
  return { ok: true, tpl: {
    name: name, docType: docType, bodyMd: bodyMd, fields: fv.fields,
    requiresSignature: payload.requiresSignature !== false,
  } };
}

function empDocRowToObj_(row, ssTz) {
  return {
    docId: String(row[ED.DOC_ID] || '').trim(),
    empId: String(row[ED.EMP_ID] || '').trim(),
    docType: String(row[ED.DOC_TYPE] || '').trim(),
    title: String(row[ED.TITLE] || ''),
    bodyMd: String(row[ED.BODY_MD] || ''),
    contentHash: String(row[ED.CONTENT_HASH] || '').trim(),
    requiresSignature: String(row[ED.REQUIRES_SIG]).toLowerCase() === 'true',
    status: String(row[ED.STATUS] || 'issued').trim(),
    issuedBy: String(row[ED.ISSUED_BY] || '').toLowerCase().trim(),
    issuedAt: trainCellTs_(row[ED.ISSUED_AT], ssTz),
    dueAt: trainCellDate_(row[ED.DUE_AT], ssTz),
    signedAt: trainCellTs_(row[ED.SIGNED_AT], ssTz),
    voidReason: String(row[ED.VOID_REASON] || ''),
    // v2 — keep BOTH the raw cell string (for byte-stable hash recompute) and
    // the parsed shape (for rendering). Legacy rows have undefined cells → ''/[]/{}.
    fieldsRaw: String(row[ED.FIELDS] || ''),
    fields: empDocParseJson_(row[ED.FIELDS], []),
    responsesRaw: String(row[ED.RESPONSES] || ''),
    responses: empDocParseJson_(row[ED.RESPONSES], {}),
  };
}

/** Defensive JSON parse — corrupt blob never throws (returns the fallback). */
function empDocParseJson_(cell, fallback) {
  const s = String(cell || '').trim();
  if (!s) return fallback;
  try { const v = JSON.parse(s); return v == null ? fallback : v; } catch (e) { return fallback; }
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

/** The §9.3 FAIL-CLOSED team-scoping rule: a manager sees a doc only when
 *  they ISSUED it or they are the employee's roster ManagerEmail (column M).
 *  Membership in MANAGER_EMAILS alone grants NOTHING here; a blank column M
 *  narrows visibility to owner+issuer. */
function empDocCanManagerSee_(callerEmp, doc) {
  if (!callerEmp || !callerEmp.isManager) return false;
  const caller = String(callerEmp.email || '').toLowerCase().trim();
  if (caller && caller === doc.issuedBy) return true;
  const target = lookupEmployeeById_(doc.empId);
  return !!(target && target.managerEmail && target.managerEmail === caller);
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
    // Integrity gate: the row must still hash to what was issued (incl. fields).
    const expect = empDocContentHash_(d.bodyMd, d.title, d.docType, d.empId, d.fieldsRaw);
    if (d.contentHash && d.contentHash !== expect) {
      return { success: false, error: 'Integrity check failed — this document was altered after issue. Ask your manager to re-issue it.' };
    }
    const now = new Date();
    const ts = fmtDate_(now) + ' ' + fmtTime_(now);
    const sheet = getOrCreateEmpDocSheet_(EMPDOC_TAB, EMPDOC_HEADERS);
    // Persist responses first (so a signed doc's responses are what was attested).
    if (hasFields) sheet.getRange(found.rowIdx, ED.RESPONSES + 1).setValue(responsesRaw);
    if (d.requiresSignature) {
      const sigHash = empDocSignatureHash_(d.contentHash || expect, d.empId, d.docId, sig, EMPDOC_ACK_VERSION, responsesRaw);
      const cert = JSON.stringify({
        docId: d.docId, empId: d.empId, ackVersion: EMPDOC_ACK_VERSION,
        alg: 'SHA-256', covers: 'contentHash|empId|docId|signature|ackVersion' + (responsesRaw ? '|responses' : ''),
      });
      getOrCreateEmpDocSheet_(EMPDOC_SIG_TAB, EMPDOC_SIG_HEADERS)
        .appendRow([d.docId, d.empId, ts, sig, EMPDOC_ACK_VERSION, sigHash, cert]);
      sheet.getRange(found.rowIdx, ED.STATUS + 1).setValue('signed');
      sheet.getRange(found.rowIdx, ED.SIGNED_AT + 1).setValue(ts);
      writeAuditLog_(emp, 'EmpDocSigned', fmtDate_(now), '', false, 0,
        'docId=' + d.docId + '; hash=' + sigHash + '; signedAt=' + ts);
    } else {
      // Fields-only doc (no signature): completing the fields is the action.
      sheet.getRange(found.rowIdx, ED.STATUS + 1).setValue('completed');
      sheet.getRange(found.rowIdx, ED.SIGNED_AT + 1).setValue(ts);
      writeAuditLog_(emp, 'EmpDocCompleted', fmtDate_(now), '', false, 0,
        'docId=' + d.docId + '; completedAt=' + ts);
    }
    notifyEmpDocSigned_(d, emp);
    return { success: true, signedAt: ts };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Manager-gated (INV-02), locked (INV-01). Issues a doc with FROZEN
 *  markdown content + contentHash. Any manager may issue to any employee
 *  (issuing reveals nothing); READING stays team-scoped. Audit: EmpDocIssue
 *  (docId/empId/type — never the title or body). */
function issueDoc(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
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
    getOrCreateEmpDocSheet_(EMPDOC_TAB, EMPDOC_HEADERS).appendRow([
      docId, v.doc.empId, v.doc.docType, v.doc.title, v.doc.bodyMd, contentHash,
      v.doc.requiresSignature ? 'TRUE' : 'FALSE', v.doc.status,
      String(callerEmp.email).toLowerCase().trim(), ts, v.doc.dueAt, '', '', fieldsRaw, '',
    ]);
    writeAuditLog_(callerEmp, 'EmpDocIssue', fmtDate_(now), '', false, 0,
      'docId=' + docId + '; empId=' + v.doc.empId + '; type=' + v.doc.docType + '; status=' + v.doc.status, callerEmp.email);
    // Only a RELEASED (issued) doc is visible to the employee — drafts stay silent.
    if (v.doc.status === 'issued') notifyEmpDocIssued_(target, v.doc);
    return { success: true, docId: docId, status: v.doc.status };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Manager-gated + team-scoped, locked. Releases a DRAFT to the employee
 *  (draft → issued) and notifies them. The frozen content/hash is untouched —
 *  release only flips the gate. Audit: EmpDocRelease. */
function releaseDoc(docId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const found = findEmpDocRow_(docId);
    if (!found || !empDocCanManagerSee_(callerEmp, found.doc)) return { success: false, error: 'Document not found.' };
    if (found.doc.status !== 'draft') return { success: false, error: 'Only a draft can be released.' };
    const sheet = getOrCreateEmpDocSheet_(EMPDOC_TAB, EMPDOC_HEADERS);
    sheet.getRange(found.rowIdx, ED.STATUS + 1).setValue('issued');
    const now = new Date();
    writeAuditLog_(callerEmp, 'EmpDocRelease', fmtDate_(now), '', false, 0,
      'docId=' + found.doc.docId + '; empId=' + found.doc.empId, callerEmp.email);
    const target = lookupEmployeeById_(found.doc.empId);
    if (target) notifyEmpDocIssued_(target, found.doc);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
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
    sheet.getRange(found.rowIdx, ED.STATUS + 1).setValue('void');
    sheet.getRange(found.rowIdx, ED.VOID_REASON + 1).setValue(String(reason || '').substring(0, 500));
    const now = new Date();
    writeAuditLog_(callerEmp, 'EmpDocVoid', fmtDate_(now), '', false, 0,
      'docId=' + found.doc.docId, callerEmp.email);
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
    const contentMatch = !d.contentHash ? null : (expectContent === d.contentHash);
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
    if (!sigRow) return { signed: false, contentMatch: contentMatch, tampered: (contentMatch === false) };
    const storedHash = String(sigRow[EDS.SIG_HASH] || '').trim();
    // F(cycle-8): mirror acknowledgeDoc's blank-stored-hash fallback — the
    // sign path hashes with `d.contentHash || <freshly computed>`, so a
    // legitimately-signed hand-entered/legacy row (blank ContentHash cell)
    // used to recompute against '' here and report a FALSE tampered:true.
    const recomputed = empDocSignatureHash_(
      d.contentHash || expectContent, d.empId, d.docId,
      String(sigRow[EDS.SIGNATURE] || ''), String(sigRow[EDS.ACK_VERSION] || ''), d.responsesRaw);
    const match = storedHash ? storedHash === recomputed : null;
    // L-4 — a body-only rewrite trips `contentMatch` (body↔stored hash); a
    // consistent body+contentHash rewrite trips `match` (the signature hash
    // bound the sign-time contentHash). EITHER being false means tamper, so
    // expose a single definitive flag — a consumer checking `match` alone
    // would miss the body-only case. The append-only `EmpDocSigned` audit row
    // remains the deeper independent witness. (legacy/unsigned → null, not
    // tampered.)
    return {
      signed: true,
      contentMatch: contentMatch,
      match: match,
      tampered: (contentMatch === false || match === false),
      signedAt: trainCellTs_(sigRow[EDS.SIGNED_AT], getHrDocsSS_().getSpreadsheetTimeZone()),
      ackVersion: String(sigRow[EDS.ACK_VERSION] || ''),
    };
  } catch (err) { return { error: err.message }; }
}

// ── EmpDocs v2 — reusable templates (manager-curated form shells) ───────────
function empDocTemplateRowToObj_(row) {
  return {
    templateId: String(row[EDT.TPL_ID] || '').trim(),
    name: String(row[EDT.NAME] || ''),
    docType: String(row[EDT.DOC_TYPE] || 'review').trim().toLowerCase(),
    bodyMd: String(row[EDT.BODY_MD] || ''),
    fields: empDocParseJson_(row[EDT.FIELDS], []),
    requiresSignature: String(row[EDT.REQUIRES_SIG]).toLowerCase() !== 'false',
    createdBy: String(row[EDT.CREATED_BY] || '').toLowerCase().trim(),
  };
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
      sheet.getRange(r, EDT.NAME + 1).setValue(v.tpl.name);
      sheet.getRange(r, EDT.DOC_TYPE + 1).setValue(v.tpl.docType);
      sheet.getRange(r, EDT.BODY_MD + 1).setValue(v.tpl.bodyMd);
      sheet.getRange(r, EDT.FIELDS + 1).setValue(fieldsRaw);
      sheet.getRange(r, EDT.REQUIRES_SIG + 1).setValue(v.tpl.requiresSignature ? 'TRUE' : 'FALSE');
    } else {
      templateId = Utilities.getUuid();
      const now = new Date();
      sheet.appendRow([templateId, v.tpl.name, v.tpl.docType, v.tpl.bodyMd, fieldsRaw,
        v.tpl.requiresSignature ? 'TRUE' : 'FALSE', callerEmp.email, fmtDate_(now) + ' ' + fmtTime_(now)]);
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
      '<p style="margin:12px 0 0;">Open the web app &rarr; <strong>Training &amp; Employee Docs &rarr; My Docs</strong> to ' + action + ' it.</p>');
    MailApp.sendEmail({ to: target.email, subject: 'Document for your ' + (doc.requiresSignature ? 'signature' : 'review') + ': ' + doc.title, body: body, htmlBody: htmlBody });
  } catch (e) { console.warn('notifyEmpDocIssued_ failed: ' + e.message); }
}

/** Best-effort (INV-14) — issuer notification on signature. */
function notifyEmpDocSigned_(doc, signer) {
  try {
    if (!doc.issuedBy) return;
    const body = signer.name + ' signed "' + doc.title + '".';
    const htmlBody = buildBrandedEmailHtml_('Document signed',
      brandedKvRows_([['Document', doc.title], ['Signed by', signer.name]]));
    MailApp.sendEmail({ to: doc.issuedBy, subject: 'Signed: ' + doc.title, body: body, htmlBody: htmlBody });
  } catch (e) { console.warn('notifyEmpDocSigned_ failed: ' + e.message); }
}


// ════════════════════════════════════════════════════════════════════════════
//  COACHING — granular, NON-routine manager coaching feedback on a specific
//  interaction (patient/TRX). Severity praise→critical; rep acknowledges; the
//  daily overdue digest nudges the manager on un-acked items. Lives in the HR
//  store (keep-forever, team-scoped per roster column M — the EmpDocs posture),
//  the per-rep coaching record that feeds reviews/PIPs. Tied to the call-note
//  'training' flag via the "Coach on this" prefill.
// ════════════════════════════════════════════════════════════════════════════
const COACH_TAB = 'Coaching';
// F(cycle-8 M-6): trailing VoidReason column (back-compat like the EmpDocs v2
// columns — getOrCreateEmpDocSheet_ self-heals the header width; legacy rows
// read ''). The void reason is manager free text about a specific patient/TRX
// interaction, so it belongs ONLY in this team-scoped HR store — the shared
// AuditLog row must stay content-free (INV-134/INV-32), exactly like voidDoc's
// VoidReason column.
const COACH_HEADERS = ['CoachId','EmpId','EmpName','PatientTRX','Severity','WhatHappened','WhatShould','NoteId','Status','CreatedBy','CreatedAt','AcknowledgedAt','AckBy','VoidReason'];
const CO = { COACH_ID:0, EMP_ID:1, EMP_NAME:2, PATIENT_TRX:3, SEVERITY:4, WHAT_HAPPENED:5, WHAT_SHOULD:6, NOTE_ID:7, STATUS:8, CREATED_BY:9, CREATED_AT:10, ACK_AT:11, ACK_BY:12, VOID_REASON:13 };
const COACH_SEVERITIES = ['praise','minor','major','critical'];
const COACH_TEXT_MAX = 4000;
const COACH_TRX_MAX = 200;

/** Pure (Node-pinned) — createCoaching payload validation. Whitelist-built;
 *  references COACH_SEVERITIES / COACH_TEXT_MAX (injected in the Node harness,
 *  the isValidTimeOffType_ pattern). 'whatShould' is optional (praise rarely
 *  needs it); 'whatHappened' is always required. */
function coachValidate_(payload) {
  payload = payload || {};
  var empId = String(payload.empId || '').trim();
  if (!empId) return { ok: false, error: 'Pick an employee.' };
  var severity = String(payload.severity || '').trim().toLowerCase();
  if (COACH_SEVERITIES.indexOf(severity) < 0) return { ok: false, error: 'Pick a severity (praise / minor / major / critical).' };
  var whatHappened = String(payload.whatHappened || '').trim();
  if (!whatHappened) return { ok: false, error: 'Describe what happened.' };
  if (whatHappened.length > COACH_TEXT_MAX) return { ok: false, error: 'What happened is too long (max ' + COACH_TEXT_MAX + ' chars).' };
  var whatShould = String(payload.whatShould || '').trim();
  if (whatShould.length > COACH_TEXT_MAX) return { ok: false, error: 'What should have happened is too long (max ' + COACH_TEXT_MAX + ' chars).' };
  var patientTRX = String(payload.patientTRX || '').trim();
  if (patientTRX.length > COACH_TRX_MAX) return { ok: false, error: 'Patient/TRX reference is too long.' };
  var noteId = String(payload.noteId || '').trim();
  return { ok: true, item: { empId: empId, severity: severity, whatHappened: whatHappened, whatShould: whatShould, patientTRX: patientTRX, noteId: noteId } };
}

/** Pure (Node-pinned) — the open, non-praise coaching items older than `days`
 *  that should nudge the manager. Items carry a precomputed `createdAtMs`. */
function coachUnackedOverdue_(items, nowMs, days) {
  var cutoff = nowMs - (days || 0) * 86400000;
  var out = [];
  (items || []).forEach(function (it) {
    if (!it || it.status !== 'open') return;
    if (it.severity === 'praise') return;            // praise never nags
    if (it.createdAtMs && it.createdAtMs <= cutoff) out.push(it);
  });
  return out;
}

/** Pure (Node-pinned) — parse a 'yyyy-MM-dd HH:mm:ss' (or 'T'-form) stamp to
 *  ms as UTC. Only used for DIFFERENCES (ack − created), so the fixed-UTC
 *  interpretation cancels out and tz never skews a day-count. NaN on garbage. */
function coachParseTs_(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(String(s || ''));
  if (!m) return NaN;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}
/** Pure — median of a numeric array (0 when empty), 1-decimal rounded. */
function coachMedian_(arr) {
  const a = (arr || []).filter(function (x) { return typeof x === 'number' && !isNaN(x); }).sort(function (x, y) { return x - y; });
  if (!a.length) return 0;
  const mid = Math.floor(a.length / 2);
  const v = a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  return Math.round(v * 10) / 10;
}

/** Pure (Node-pinned) — manager coaching analytics over the team-scoped items.
 *  Aggregates: totals, by-severity, acknowledged + ack-rate, overdue-unacked,
 *  median days-to-acknowledge, and a per-rep breakdown (most-overdue first).
 *  No PHI — counts + the empName already in the items. */
function coachAnalytics_(items, nowMs, reminderDays) {
  items = items || [];
  const cutoff = nowMs - (reminderDays || 0) * 86400000;
  const sev = { praise: 0, minor: 0, major: 0, critical: 0 };
  const ackDays = [];
  const perRep = {};
  let acknowledged = 0, overdue = 0;
  items.forEach(function (it) {
    if (sev[it.severity] != null) sev[it.severity]++;
    const isAck = it.status === 'acknowledged';
    if (isAck) acknowledged++;
    const isOverdue = it.status === 'open' && it.severity !== 'praise' && (function () {
      const c = coachParseTs_(it.createdAt); return !isNaN(c) && c <= cutoff;
    })();
    if (isOverdue) overdue++;
    let d = NaN;
    if (isAck && it.acknowledgedAt) {
      const c = coachParseTs_(it.createdAt), a = coachParseTs_(it.acknowledgedAt);
      if (!isNaN(c) && !isNaN(a) && a >= c) { d = (a - c) / 86400000; ackDays.push(d); }
    }
    const r = perRep[it.empId] || (perRep[it.empId] = { empId: it.empId, empName: it.empName, total: 0, acknowledged: 0, overdue: 0, _ackDays: [] });
    r.total++;
    if (isAck) r.acknowledged++;
    if (isOverdue) r.overdue++;
    if (!isNaN(d)) r._ackDays.push(d);
  });
  const reps = Object.keys(perRep).map(function (id) {
    const r = perRep[id];
    return {
      empId: r.empId, empName: r.empName, total: r.total, acknowledged: r.acknowledged,
      overdue: r.overdue,
      ackRatePct: r.total ? Math.round((r.acknowledged / r.total) * 100) : 0,
      medianDaysToAck: coachMedian_(r._ackDays),
    };
  }).sort(function (a, b) {
    if (b.overdue !== a.overdue) return b.overdue - a.overdue;
    return b.total - a.total;
  });
  return {
    total: items.length, bySeverity: sev,
    acknowledged: acknowledged, overdueUnacked: overdue,
    ackRatePct: items.length ? Math.round((acknowledged / items.length) * 100) : 0,
    medianDaysToAck: coachMedian_(ackDays),
    perRep: reps,
  };
}

function coachRowToObj_(row, ssTz) {
  return {
    coachId: String(row[CO.COACH_ID] || '').trim(),
    empId: String(row[CO.EMP_ID] || '').trim(),
    empName: String(row[CO.EMP_NAME] || ''),
    patientTRX: String(row[CO.PATIENT_TRX] || ''),
    severity: String(row[CO.SEVERITY] || '').trim().toLowerCase(),
    whatHappened: String(row[CO.WHAT_HAPPENED] || ''),
    whatShould: String(row[CO.WHAT_SHOULD] || ''),
    noteId: String(row[CO.NOTE_ID] || '').trim(),
    status: String(row[CO.STATUS] || 'open').trim(),
    createdBy: String(row[CO.CREATED_BY] || '').toLowerCase().trim(),
    createdAt: trainCellTs_(row[CO.CREATED_AT], ssTz),
    acknowledgedAt: trainCellTs_(row[CO.ACK_AT], ssTz),
    ackBy: String(row[CO.ACK_BY] || '').toLowerCase().trim(),
  };
}

/** Bounded id-column lookup → { rowIdx, item } or null (the findEmpDocRow_ pattern). */
function findCoachingRow_(coachId) {
  coachId = String(coachId || '').trim();
  if (!coachId) return null;
  const sheet = getOrCreateEmpDocSheet_(COACH_TAB, COACH_HEADERS);
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const ids = sheet.getRange(2, CO.COACH_ID + 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() !== coachId) continue;
    const row = sheet.getRange(i + 2, 1, 1, COACH_HEADERS.length).getValues()[0];
    return { rowIdx: i + 2, item: coachRowToObj_(row, getHrDocsSS_().getSpreadsheetTimeZone()) };
  }
  return null;
}

/** FAIL-CLOSED team scoping (the empDocCanManagerSee_ rule): a manager sees a
 *  coaching item only when they CREATED it or they are the employee's roster
 *  ManagerEmail (column M). MANAGER_EMAILS membership alone grants nothing. */
function coachCanManagerSee_(callerEmp, item) {
  if (!callerEmp || !callerEmp.isManager) return false;
  const caller = String(callerEmp.email || '').toLowerCase().trim();
  if (caller && caller === String(item.createdBy || '').toLowerCase().trim()) return true;
  const target = lookupEmployeeById_(item.empId);
  return !!(target && target.managerEmail && target.managerEmail === caller);
}

/** Manager-gated (INV-02), locked (INV-01). Creates a coaching item for an
 *  employee. Any manager may issue (issuing reveals nothing); READING stays
 *  team-scoped. The patient/TRX + free text are HR-class PHI-adjacent and live
 *  ONLY in the HR store; the audit row is content-free (coachId/empId/severity
 *  — never the patient/TRX or the narrative). */
function createCoaching(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const v = coachValidate_(payload);
    if (!v.ok) return { success: false, error: v.error };
    const target = lookupEmployeeById_(v.item.empId);
    if (!target) return { success: false, error: 'Unknown employee.' };
    const coachId = Utilities.getUuid();
    const now = new Date();
    const ts = fmtDate_(now) + ' ' + fmtTime_(now);
    getOrCreateEmpDocSheet_(COACH_TAB, COACH_HEADERS).appendRow([
      coachId, target.id, target.name, v.item.patientTRX, v.item.severity,
      v.item.whatHappened, v.item.whatShould, v.item.noteId, 'open',
      callerEmp.email, ts, '', '',
    ]);
    writeAuditLog_(callerEmp, 'CoachingCreate', fmtDate_(now), '', false, 0,
      'coachId=' + coachId + '; empId=' + target.id + '; severity=' + v.item.severity, callerEmp.email);
    notifyRepOfCoaching_(target, v.item, callerEmp);
    return { success: true, coachId: coachId };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Rep-callable, caller-scoped, read-only — the caller's OWN coaching items
 *  (full content; it's their own record). Newest first; excludes voided. */
function getMyCoaching() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    const sheet = getOrCreateEmpDocSheet_(COACH_TAB, COACH_HEADERS);
    const last = sheet.getLastRow();
    if (last < 2) return { items: [] };
    const ssTz = getHrDocsSS_().getSpreadsheetTimeZone();
    const rows = sheet.getRange(2, 1, last - 1, COACH_HEADERS.length).getValues();
    const items = [];
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][CO.EMP_ID]).trim() !== emp.id) continue;
      const c = coachRowToObj_(rows[i], ssTz);
      if (c.status === 'void') continue;
      items.push(c);
    }
    items.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
    return { items: items };
  } catch (err) { return { error: err.message }; }
}

/** Rep-callable, locked (INV-01), OWNER-only — the employee acknowledges they
 *  have read the coaching. Idempotent (already-acked → friendly no-op). Audit
 *  CoachingAck (content-free). */
function acknowledgeCoaching(coachId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Not authorized.' };
    const found = findCoachingRow_(coachId);
    if (!found || found.item.empId !== emp.id) return { success: false, error: 'Coaching item not found.' };
    if (found.item.status === 'void') return { success: false, error: 'This item is no longer active.' };
    if (found.item.status === 'acknowledged') return { success: true, alreadyAcknowledged: true, acknowledgedAt: found.item.acknowledgedAt };
    const now = new Date();
    const ts = fmtDate_(now) + ' ' + fmtTime_(now);
    const sheet = getOrCreateEmpDocSheet_(COACH_TAB, COACH_HEADERS);
    sheet.getRange(found.rowIdx, CO.STATUS + 1).setValue('acknowledged');
    sheet.getRange(found.rowIdx, CO.ACK_AT + 1).setValue(ts);
    sheet.getRange(found.rowIdx, CO.ACK_BY + 1).setValue(emp.email);
    writeAuditLog_(emp, 'CoachingAck', fmtDate_(now), '', false, 0,
      'coachId=' + found.item.coachId + '; ackAt=' + ts);
    notifyManagerOfCoachingAck_(found.item, emp);
    return { success: true, acknowledgedAt: ts };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** Manager-gated (INV-02), read-only, TEAM-SCOPED (coachCanManagerSee_).
 *  Returns the coaching items the manager may see + summary counts (open /
 *  acknowledged / overdue-unacked / praise). */
function getCoachingDashboard() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const sheet = getOrCreateEmpDocSheet_(COACH_TAB, COACH_HEADERS);
    const last = sheet.getLastRow();
    if (last < 2) return { items: [], counts: { open: 0, acknowledged: 0, overdueUnacked: 0, praise: 0 } };
    const ssTz = getHrDocsSS_().getSpreadsheetTimeZone();
    const rows = sheet.getRange(2, 1, last - 1, COACH_HEADERS.length).getValues();
    const nowMs = Date.now();
    const reminderDays = CONFIG.COACHING_UNACK_REMINDER_DAYS || 7;
    const items = [];
    const counts = { open: 0, acknowledged: 0, overdueUnacked: 0, praise: 0 };
    for (let i = 0; i < rows.length; i++) {
      const c = coachRowToObj_(rows[i], ssTz);
      if (!c.coachId || c.status === 'void') continue;
      if (!coachCanManagerSee_(callerEmp, c)) continue;
      // F(H-1): CreatedAt is stamped in SPACE form ('yyyy-MM-dd HH:mm:ss');
      // parseTimestampMs_ expects the 'T' form and returned null for every row,
      // so overdueUnacked was permanently false. coachParseTs_ accepts both.
      const createdMs = coachParseTs_(c.createdAt);
      c.overdueUnacked = (c.status === 'open' && c.severity !== 'praise' && createdMs && createdMs <= (nowMs - reminderDays * 86400000));
      if (c.status === 'open') counts.open++;
      if (c.status === 'acknowledged') counts.acknowledged++;
      if (c.severity === 'praise') counts.praise++;
      if (c.overdueUnacked) counts.overdueUnacked++;
      items.push(c);
    }
    items.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
    return { items: items, counts: counts, reminderDays: reminderDays,
      analytics: coachAnalytics_(items, nowMs, reminderDays) };
  } catch (err) { return { error: err.message }; }
}

/** Manager-gated (INV-02), locked (INV-01). Soft-voids a coaching item (a
 *  mistaken/duplicate entry) — never deletes. Audit CoachingVoid. */
function voidCoaching(coachId, reason) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const found = findCoachingRow_(coachId);
    if (!found) return { success: false, error: 'Coaching item not found.' };
    if (!coachCanManagerSee_(callerEmp, found.item)) return { success: false, error: 'Coaching item not found.' };
    const sheet = getOrCreateEmpDocSheet_(COACH_TAB, COACH_HEADERS);
    sheet.getRange(found.rowIdx, CO.STATUS + 1).setValue('void');
    // F(cycle-8 M-6): the reason (free text plausibly naming a patient/TRX —
    // "logged against wrong patient, TRX 4482…") persists in the team-scoped
    // HR store's VoidReason column, NEVER in the shared PHI-free AuditLog
    // (INV-134/INV-32 — the row previously carried `reason=` and surfaced in
    // the compliance panel + admin sheet viewer). Mirrors voidDoc.
    if (reason) sheet.getRange(found.rowIdx, CO.VOID_REASON + 1).setValue(String(reason).slice(0, 500));
    writeAuditLog_(callerEmp, 'CoachingVoid', '', '', false, 0,
      'coachId=' + found.item.coachId, callerEmp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}

/** All open, non-praise coaching items older than the reminder window, as
 *  [{ item, empName }] for per-manager scoping in the digest. Returns []
 *  (never throws) when the HR store is unavailable. */
function coachUnackedAll_(nowMs) {
  try {
    const sheet = getOrCreateEmpDocSheet_(COACH_TAB, COACH_HEADERS);
    const last = sheet.getLastRow();
    if (last < 2) return [];
    const ssTz = getHrDocsSS_().getSpreadsheetTimeZone();
    const rows = sheet.getRange(2, 1, last - 1, COACH_HEADERS.length).getValues();
    const items = [];
    for (let i = 0; i < rows.length; i++) {
      const c = coachRowToObj_(rows[i], ssTz);
      if (!c.coachId) continue;
      // F(H-1): coachParseTs_ (both stamp forms), NOT parseTimestampMs_ ('T'-only
      // — it nulled every space-form stamp and the digest nudge never fired).
      c.createdAtMs = coachParseTs_(c.createdAt);
      items.push(c);
    }
    return coachUnackedOverdue_(items, nowMs, CONFIG.COACHING_UNACK_REMINDER_DAYS || 7)
      .map(function (c) { return { item: c, empName: c.empName }; });
  } catch (e) {
    Logger.log('coachUnackedAll_ skipped (HR docs store unavailable): ' + e.message);
    return [];
  }
}

/** Best-effort (INV-14) — notify the rep of new coaching. PHI-adjacent content
 *  (patient/TRX + narrative) stays OUT of the email; it names only the severity
 *  + a link to open the app. The detail lives behind their authenticated
 *  "My Coaching" view. */
function notifyRepOfCoaching_(target, item, manager) {
  try {
    if (!target.email) return;
    const sev = item.severity === 'praise' ? 'praise' : (item.severity + ' coaching');
    const body = manager.name + ' left you ' + sev + '. Open the web app → Training & Employee Docs → My Coaching to read and acknowledge it.';
    const htmlBody = buildBrandedEmailHtml_(item.severity === 'praise' ? 'You received praise' : 'New coaching feedback',
      brandedKvRows_([['From', manager.name], ['Type', item.severity]]) +
      '<p style="margin:12px 0 0;">Open <strong>Training &amp; Employee Docs → My Coaching</strong> to read and acknowledge it.</p>',
      { accent: item.severity === 'critical' ? CN_EMAIL_PALETTE.danger : (item.severity === 'praise' ? CN_EMAIL_PALETTE.brand : CN_EMAIL_PALETTE.warnDeep) });
    MailApp.sendEmail({ to: target.email, subject: (item.severity === 'praise' ? '⭐ Praise from ' : '📋 Coaching from ') + manager.name, body: body, htmlBody: htmlBody });
  } catch (e) { console.warn('notifyRepOfCoaching_ failed: ' + e.message); }
}

/** Best-effort — tell the issuing manager their coaching was acknowledged. */
function notifyManagerOfCoachingAck_(item, rep) {
  try {
    if (!item.createdBy) return;
    const body = rep.name + ' acknowledged your coaching (' + item.severity + ').';
    MailApp.sendEmail({ to: item.createdBy, subject: 'Acknowledged: coaching for ' + rep.name,
      body: body, htmlBody: buildBrandedEmailHtml_('Coaching acknowledged',
        brandedKvRows_([['Employee', rep.name], ['Type', item.severity]])) });
  } catch (e) { console.warn('notifyManagerOfCoachingAck_ failed: ' + e.message); }
}


// ── T2 extension: import a quiz from a Google Forms quiz ──────────────────
// Operator feedback (2026-06-15): managers have existing quizzes in Google
// Forms. READ-ONLY, review-before-save (the kbConvertDriveDoc pattern): this
// returns a quiz def for the editor; the manager reviews and the normal
// saveQuiz persists it. FormApp is the project's first Forms call — the
// deploy adds the Forms OAuth scope (one-time re-auth, like the Docs scope).

/** Pure (Node-pinned) — resolve a Google Forms reference to its file id.
 *  Returns { id } on success, { error:'published-link' } for a /forms/d/e/
 *  published URL (that id is the response endpoint, NOT openable by
 *  FormApp.openById), or { id:'' } when nothing parses. */
function trainParseFormId_(ref) {
  const s = String(ref || '').trim();
  if (!s) return { id: '' };
  if (/\/forms\/d\/e\//.test(s)) return { error: 'published-link' };
  let m = s.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return { id: m[1] };
  // A bare id pasted on its own (no slashes, Drive-id shaped).
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return { id: s };
  return { id: '' };
}

function importQuizFromForm(formRef) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const parsed = trainParseFormId_(formRef);
    if (parsed.error === 'published-link') {
      return { error: 'That is a published form link. Open the form in EDIT mode and copy the URL from the address bar — it contains /forms/d/<id>/edit.' };
    }
    if (!parsed.id) return { error: 'Could not read a Google Form ID from that — paste the form’s edit URL.' };
    let form;
    try { form = FormApp.openById(parsed.id); }
    catch (e) {
      return { error: 'Could not open that form — the deploying account needs at least view access to it. (' + e.message + ')' };
    }
    const warnings = [];
    const questions = [];
    const items = form.getItems();
    for (let i = 0; i < items.length; i++) {
      if (questions.length >= TRAIN_QUIZ_MAX_QUESTIONS) {
        warnings.push('Only the first ' + TRAIN_QUIZ_MAX_QUESTIONS + ' questions were imported.');
        break;
      }
      const type = String(items[i].getType());
      let mc = null;
      if (type === 'MULTIPLE_CHOICE') mc = items[i].asMultipleChoiceItem();
      else if (type === 'CHECKBOX') mc = items[i].asCheckboxItem();
      else continue;   // TEXT / PARAGRAPH / SCALE / GRID / layout items — skip silently
      let title = String(mc.getTitle() || '').trim();
      if (title.length > 500) { title = title.substring(0, 500); }
      const choices = mc.getChoices();
      const options = [];
      let correctIdx = -1, correctCount = 0;
      for (let j = 0; j < choices.length; j++) {
        let v = String(choices[j].getValue() || '').trim();
        if (v.length > 200) v = v.substring(0, 200);
        options.push(v);
        let isC = false;
        try { isC = choices[j].isCorrectAnswer(); } catch (_) {}
        if (isC) { correctCount++; if (correctIdx < 0) correctIdx = j; }
      }
      if (options.length < 2) { warnings.push('Skipped "' + title + '" — fewer than 2 options.'); continue; }
      if (options.length > TRAIN_QUIZ_MAX_OPTIONS) {
        warnings.push('"' + title + '" had ' + options.length + ' options; kept the first ' + TRAIN_QUIZ_MAX_OPTIONS + '.');
        options.length = TRAIN_QUIZ_MAX_OPTIONS;
        if (correctIdx >= TRAIN_QUIZ_MAX_OPTIONS) correctIdx = -1;
      }
      if (type === 'CHECKBOX' && correctCount > 1) {
        warnings.push('"' + title + '" allows multiple correct answers; this tool grades ONE answer — set the right one after import.');
      }
      if (correctIdx < 0) {
        warnings.push('"' + title + '" had no correct answer marked — defaulted to the first option; set it after import.');
        correctIdx = 0;
      }
      questions.push({ q: title || ('Question ' + (questions.length + 1)), options: options, correct: correctIdx });
    }
    if (!questions.length) {
      return { error: 'No multiple-choice questions found. Only multiple-choice and single-answer checkbox questions can be imported (text, scale, and grid items are skipped).' };
    }
    let title = String(form.getTitle() || '').trim();
    if (title.length > 120) title = title.substring(0, 120);
    return { success: true, title: title, passPct: 80, questions: questions, warnings: warnings };
  } catch (err) { return { error: err.message }; }
}
