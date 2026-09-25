// ════════════════════════════════════════════════════════════════════════════
//  UMS TEAM TOOLS — 00_config.js
//  CONFIG, the column enums and every top-level constant. Loads FIRST so a
//  constant is defined before any file that reads one at load time.
//
//  ONE Apps Script project, ONE global scope: these files are the SERVER, in
//  the load order `web-app/.clasp.json` filePushOrder declares. Batch F2 split
//  them out of Code.js as a MOVE — every declaration below is byte-identical to
//  the one it replaced, and the SPLIT-MANIFEST pin proves it.
// ════════════════════════════════════════════════════════════════════════════

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
  // Cycle-18 F11 follow-on (2026-09-11): the two append-only DIAGNOSTICS tabs
  // on the ADP spreadsheet — ViewUsage (feature-usage telemetry) and
  // ClientErrors (the client error beacon) — were the only growing stores with
  // no retention tier; "trim manually" was an operator obligation nobody was
  // reminded of. Two INDEPENDENT windows in days; 0 = DISABLED (the safe
  // committed default). Script Properties VIEW_USAGE_RETENTION_DAYS /
  // CLIENT_ERR_RETENTION_DAYS override without a redeploy; the Admin → Config →
  // Retention panel edits them. Both tabs are PHI-free by construction
  // (INV-150 / the observability KDD), so the delete is irreversible but never
  // a PHI question. Enforced by the daily purgeOldDiagnostics trigger.
  VIEW_USAGE_RETENTION_DAYS: 0,
  CLIENT_ERR_RETENTION_DAYS: 0,

  // #7 (INV-153) — Timesheet cold-archive window: rows whose DATE is older than
  // this many days MOVE to a TimesheetArchive tab in the same ADP spreadsheet
  // (never deleted — payroll is keep-forever; this bounds the LIVE tab that
  // getManagerDashboard / exports / calendars read whole). 0 = DISABLED (the
  // safe committed default). Set Script Property TIMESHEET_ARCHIVE_DAYS to
  // enable (recommended 365+); values below TIMESHEET_ARCHIVE_MIN_DAYS clamp
  // UP so an operator typo can never rip current-period payroll rows out of
  // the live tab. Enforced by the daily archiveOldTimesheetRows trigger.
  TIMESHEET_ARCHIVE_DAYS: 0,

  // QA review-record retention (Phase-3 follow-on, 2026-08-28): QaComments +
  // QaScorecards rows older than this many days are irreversibly deleted by
  // the daily purgeOldQaReviews trigger. 0 = DISABLED (the safe committed
  // default — the window CHOICE is the operator's policy call; the QA store
  // is HR-adjacent and stays keep-forever until they set Script Property
  // QA_REVIEW_RETENTION_DAYS). The QaRecordings INDEX and the Drive audio
  // files are NEVER touched by this tier.
  QA_REVIEW_RETENTION_DAYS: 0,

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
  // PR 3 (M2): the punctuality report is per-rep PER-DAY, so its range is
  // capped server-side (the QTR preset is 90 days).
  PUNCT_MAX_RANGE_DAYS: 92,
  // Coaching (Training module): un-acknowledged coaching items older than this
  // many days are nudged to the issuing/team manager in the daily overdue
  // digest (the "now a meeting is warranted" reminder). 'praise' never nags.
  COACHING_UNACK_REMINDER_DAYS: 7,
  COACHING_RECAP_DAYS: 7,               // K8 — the weekly agent recap's lookback window (the cadence itself is the Friday trigger)
  QA_AUDIT_TARGET_PER_PERIOD: 3,        // Q4 (design handoff PR 5) — sampled calls owed per employee per audit period (Script Property QA_AUDIT_TARGET_PER_PERIOD overrides, 1..50)
  // Spanish-inbox efficiency tracking (Gmail). All bilingual-assistance requests
  // are sent to this group address; "resolved" = first reply from a configured
  // bilingual group MEMBER (SPANISH_INBOX_MEMBERS, comma-separated emails, via
  // Script Property). The deploying account must be a member of the group so its
  // mailbox receives the threads to scan. Script Properties override these.
  SPANISH_INBOX_ADDRESS:        'spanishcalls@universalmedsupply.com',
  SPANISH_INBOX_MEMBERS:        '',
  // 8x8 A_Q_Spanish voicemail notifications (operator 2026-08-25): 8x8 emails
  // each MEMBER's individual inbox, never the group address — so the scanner
  // (which reads the DEPLOYER's mailbox) folds them in via a sender + subject
  // filter instead. Script Properties SPANISH_VM_SENDER /
  // SPANISH_VM_SUBJECT_FILTER override without a redeploy; blanking EITHER
  // property disables the voicemail fold entirely (fail-quiet, not fail-wide).
  SPANISH_VM_SENDER:            'no-reply@8x8.com',
  SPANISH_VM_SUBJECT_FILTER:    'via A_Q_Spanish',
  // SP4 (operator 2026-09-16) — a voicemail shorter than this many SECONDS is a
  // hang-up, not a request, and never becomes a task card. Read from the 8x8
  // body's `Duration: MM:SS`. Script Property SPANISH_VM_MIN_SECONDS overrides;
  // 0 disables the gate — the escape hatch if 8x8 restyles the body and the
  // operator wants the noise back while the parser is fixed. An UNPARSEABLE
  // duration always SHOWS (fail open): the body belongs to the vendor, and the
  // failure that costs a patient a callback is the silent one.
  SPANISH_VM_MIN_SECONDS:       5,

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
  // PTO accrual (operator 2026-08-19). The real entitlement rule is stated as
  // "N PTO hours per 80 hours WORKED" (PH team: 3.08). Column Q holds the N;
  // these two turn it into the DAYS the balance column stores. Changing
  // PTO_HOURS_PER_DAY re-scales every future credit — it is the operator's
  // definition of one PTO day (8, confirmed 2026-08-19), NOT a shift length.
  PTO_ACCRUAL_BASIS_HOURS:   80,
  PTO_HOURS_PER_DAY:         8,

  SHOW_TEAMMATE_TYPE:        true,
  MISSED_PUNCH_LOOKBACK_DAYS:7,

  AUTO_MISSED_ALERT_HOUR_IST: 6,
  AUTO_EXPORT_HOUR_IST:       12,

  // ── Clock-view shift schedule ─────────────────────────────────────────
  // Drives the day-ribbon scheduled band + the "until end of shift"
  // countdown BEFORE a rep clocks in (once they clock in, both re-anchor to
  // their actual ClockIn + the scheduled length — see INV-71). DEFAULT is the
  // 8:00 AM–5:00 PM CST shift most agents work (C3). ALL-CST policy
  // (operator 2026-08-28): every agent, regardless of location, operates on
  // the CST work schedule, so every roster Timezone cell is America/Chicago
  // and schedule times are read in that one frame. BY_TIMEZONE stays as the
  // MECHANISM (a per-tz exception would be legitimate again if the policy
  // ever changed) but ships EMPTY — the old 'Asia/Manila': 8:30 entry was
  // written as a Manila-LOCAL shift, which under the policy is wrong twice
  // over (the PH team works 8:30–5 CST, ~9:30 PM–6 AM Manila). The PH 8:30
  // start now lives in roster column O ('8:30-17:00', read in the rep's tz =
  // CST under the policy); India's 8:00–5 is DEFAULT. Resolved by
  // getShiftSchedule_ and shipped to the client via getEmployeeState.
  SHIFT_SCHEDULE: {
    DEFAULT:     { start: '08:00', end: '17:00',
      // Scheduled breaks (item 1) — drive the Clock-view "next break" chip +
      // the X-min reminder toast. These are the SEED: the Admin → Config
      // "Break schedules" editor (Script Property SHIFT_BREAK_SCHEDULES, no
      // redeploy) overrides them when set — see getBreakSchedules_. A tz entry
      // without its own `breaks` inherits DEFAULT.breaks.
      breaks: [
        { label: 'Morning break',   start: '10:30', len: 15 },
        { label: 'Lunch',           start: '12:30', len: 60 },
        { label: 'Afternoon break', start: '15:00', len: 15 },
      ],
    },
    BY_TIMEZONE: {},   // empty under the ALL-CST policy — see the comment above
    BREAK_REMINDER_MINUTES: 10,         // lead time for the upcoming-break reminder toast
  },

  // ── Metrics module (CDR integration) ──────────────────────────────────
  // Reads the CDR Report spreadsheet (same one backing the Department
  // Dashboard in call-data-reporting) to surface call-volume metrics
  // inside team-tools. The deployer account must have view access to
  // the CDR Report spreadsheet.
  CDR_SS_ID:         'YOUR_CDR_SPREADSHEET_ID',
  CDR_CACHE_TTL:     300,  // 5 min — this app's OWN tier. (The dashboard's report cache is 6 h since its R24; nothing here tracks it, INV-85 keys carry the rate version.)
  // Break coverage planner (operator 2026-09-03, the Admin "Break schedules"
  // card). The demand layer reads the CDR Report's `Inbound Calls` export tab
  // (written by call-data-reporting's inboundCallsExport.js — Op State #49
  // there; one row per inbound call, Call Start stored RAW PST 'HH:MM:SS').
  CDR_INBOUND_TAB:   'Inbound Calls',
  // PST(stored) → CST(anchor). A HAND-MIRROR of call-data-reporting's
  // INBOUND_HEATMAP_CST_SHIFT_HOURS (both zones observe DST together, so a
  // fixed 2h holds year-round). Change both or the two dashboards disagree.
  CDR_INBOUND_PST_TO_CST_HOURS: 2,
  // Company holidays (H1, 2026-09-17). The CDR Report workbook carries a
  // `Company Holidays` tab (call-data-reporting's setup() creates it; its
  // Operator State #27 is the grammar: one range per row, `2026-12-25` or
  // `2026-11-26..2026-11-27`, a comma list in one cell also parses, Active
  // FALSE parks a row). getCdrCompanyHolidayRanges_ (40_metrics.js) reads it
  // by HEADER NAME and getCompanyHolidays_ (10_core.js) layers it over the
  // computed US-federal list: the tab WINS the moment it holds one range
  // (never a union), the federal list is only the fail-open when the tab is
  // absent, empty or unreadable. The point is ONE calendar for both apps --
  // Metrics "previous workday" used to walk weekends only and landed on the
  // holiday the morning after every one.
  CDR_HOLIDAYS_TAB:  'Company Holidays',
  BREAK_COVERAGE_SLOT_MIN: 15,        // strip granularity — breaks land on quarter hours
  BREAK_COVERAGE_VOLUME_DAYS: 28,     // trailing window the demand layer averages over
  BREAK_COVERAGE_VOLUME_MAX_ROWS: 40000,  // tail-scan bound on the export tab (truncation REPORTED)
  BREAK_COVERAGE_VOLUME_CACHE_SEC: 3600,  // the average moves once a day; a live-edit strip must not re-scan per keystroke
  // Entry queues that count as THIS team's demand (the export covers the whole
  // phone system). Empty = every non-internal inbound call.
  BREAK_COVERAGE_VOLUME_QUEUES: ['A_Q_CSR', 'A_Q_Intake', 'Backup CSR', 'A_Q_Spanish'],
  CDR_CACHE_KEY:     'cdr_metrics_v5',   // v5 — cycle 22 M3: range ATT is answered-weighted. v4 — H2: pctAnswered = answered/(answered+missed) (INV-85: bump on shape change)
  // H2 (2026-09-17): the answer STANDARD is the Department Dashboard's, read
  // from the CDR Report workbook's `Dashboard Standards` tab (call-data-
  // reporting's setup() creates and republishes it: one row per dashboard
  // dept + a `*` global row -- Answer Target / Amber Band / Team Avg
  // Excludes). CDR_DASHBOARD_DEPT names THIS team's row (the dashboard's
  // roster header, not team-tools' own dept labels); Script Property
  // CDR_DASHBOARD_DEPT overrides it. No tab / no row / unreadable → NO
  // target, NO tone and NO badge, never a hand-carried number (the old
  // CDR_ALERT_THRESHOLD=85 was exactly that, and the CSR manager's dashboard
  // was tinting the same rate against 92 with a 2-pt band).
  CDR_STANDARDS_TAB: 'Dashboard Standards',
  CDR_DASHBOARD_DEPT: 'CSR',
  // Dashboard KPI banding (operator 2026-08-12). % Answered is judged against
  // the published standard above; Transfer % had NO threshold anywhere in the app, so this one is a
  // starting number the operator should confirm — set it to null to render
  // Transfer % with NO tone rather than a tone nobody chose (a colour is a
  // verdict, and a verdict on a number nobody set is worse than no colour).
  // The band is: at/better than target = good, within the slack = warn, beyond
  // = crit -- the slack is the published Amber Band for % Answered (H2) and
  // DASH_TONE_SLACK_PP for Transfer %. LOWER Transfer % is treated as better.
  CDR_TRANSFER_TARGET_PCT: 20,
  // Cycle-14 Phase 4 — queue → department grouping for the Metrics
  // "By department" view. OPERATOR-SUPPLIED (2026-07-31), not inferred: Phase 1
  // deliberately shipped no grouping because guessing it from queue names would
  // have been a guess about the business. Seeded here (the DEPARTMENT_EMAILS /
  // DR_SLA_TARGETS pattern) so it works on deploy with no operator action;
  // Script Property `CDR_QUEUE_GROUPS` overrides without a redeploy.
  //
  // Sub-queues are DISJOINT from their parent (operator-confirmed): a transfer
  // lands in exactly one column, so a group total is a plain SUM of its
  // members. If that ever changes, `groupQueueRows_` must stop summing — see
  // its comment.
  CDR_QUEUE_GROUPS: {
    'Sales':            ['A_Q_Sales', 'A_Q_PAP', 'A_Q_Sales_MWC'],
    'Customer Success': ['A_Q_CSR', 'A_Q_Intake', 'Backup CSR', 'A_Q_Spanish'],
    'Field Operations': ['A_Q_FieldOps', 'A_Q_FieldOps_Power'],
    'Power':            ['A_Q_PowerChairs', 'A_Q_PAK', 'A_Q_BackUp_Power'],
  },

  // ── Call Notes module ────────────────────────────────────────────────
  // The rolling-note panel; per-rep notes write to the rep's own Sheet
  // (EMP.CALL_NOTES_SHEET_ID, column L), email composer/preview gate is a
  // separate action from log-on-submit. See helper getCallNotesSheet_().
  CALL_NOTES: {
    NOTES_TAB:           'Notes',
    ARCHIVE_TAB:         'NotesArchive', // cold-archive tab in each per-rep Sheet (archiveOldCallNotes moves old rows here)
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
    // Auto-tag rules (operator 2026-08-13): keyword → tag, matched
    // case-insensitively against the Issue + Resolution text CLIENT-side as
    // the rep types (never sent anywhere — the INV-119 posture; this is why
    // the AI version was deliberately not built). A matching rule ADDS its
    // tag as a normal removable chip; removing it dismisses that rule for
    // the rest of the form session. Admin-editable via the Admin tab
    // (Script Property CN_AUTO_TAG_RULES, read first by getAutoTagRules_ —
    // this seed serves fresh deploys). SEEDED FROM THE UPDATE-TYPE
    // VOCABULARY as a starting point — the operator should review the list
    // (their offer: "if a set list of eligible tags and keywords is needed,
    // let me know").
    AUTO_TAG_RULES: [
      { tag: 'close-order',   keywords: ['close order', 'closing order', 'cancel order', 'cancelled order', 'canceled order'] },
      { tag: 'shipping',      keywords: ['shipping', 'shipped', 'tracking number', 'delivery date'] },
      { tag: 'resupply',      keywords: ['resupply', 're-supply', 'supplies order'] },
      { tag: 'oop',           keywords: ['out of pocket', 'oop order'] },
      { tag: 'billing',       keywords: ['billing', 'invoice', 'charged', 'refund'] },
      { tag: 'insurance',     keywords: ['insurance', 'medicare', 'medicaid', 'payer'] },
      { tag: 'transfer',      keywords: ['transferred to', 'transferred the call', 'warm transfer'] },
      { tag: 'callback',      keywords: ['call back', 'callback requested', 'will call back'] },
    ],
    EOD_WARNING_HOUR:    17,             // 5pm; trigger walks roster, sends per-rep tz match
    // DEAD — retained deliberately, read NOWHERE. The EOD gate is local-hour
    // EQUALITY against EOD_WARNING_HOUR (an hourly trigger), not a ± window.
    EOD_WARNING_WINDOW_MINUTES: 30,
    DR_SLA_DEFAULT_DAYS: 2,              // DeptRequests — default resolution SLA in WORKING DAYS (M6, cycle 22: elapsed time is business time since 2026-08-31, so an hours figure silently meant ~2.5x longer); per-dept overrides via DR_SLA_TARGETS
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
    FEEDBACK_TAB:        'IntakeFeedback',   // recommendation feedback (operator 2026-08-13)
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
  PAY_RATE:15,        // column P — optional hourly pay rate (operator 2026-08-17; blank = pay statement shows hours only). Read ONLY via empPayRateById_ inside getMyPayStatement — never spread onto emp objects (leak surface).
  PTO_ACCRUAL:16,     // column Q — optional PTO accrual rate: PTO HOURS EARNED PER `CONFIG.PTO_ACCRUAL_BASIS_HOURS` HOURS WORKED (operator 2026-08-19; PH team = 3.08 per 80). HOURS-DRIVEN, not calendar-driven: creditMonthlyPtoAccruals (daily trigger) credits `hoursWorked(month) × rate / basis / PTO_HOURS_PER_DAY` days into the col-I balance, in arrears. IDEMPOTENT ON HOURS PAID FOR, not on "this month was processed" (INV-205, 2026-09-15): col R still decides which months are OWED, but it no longer closes a month against correction — every run re-values the last PTO_ACCRUAL_RECONCILE_MONTHS completed months against the PtoAccrualCredit audit rows and credits the difference, so a punch approved after the month closed is picked up instead of lost. A month with no worked hours accrues NOTHING *at the time* — that is the rule, not a failure — and it accrues later if hours appear. Blank/garbage = no accrual at all (fixed-allotment tile, no credits). Col I REMAINS the balance of record — manual edits still compose (the credit is a delta, not a recompute).
  ACCRUED_THROUGH:17, // column R — AUTO-MANAGED 'yyyy-MM' stamp: the last month whose accrual has been credited (in arrears — month M lands on/after the 1st of M+1). Written only by creditMonthlyPtoAccruals; blank = SEEDS on the next run (stamps last month, credits nothing — the operator's balance is presumed current through the end of last month at enable time). Hand-edit only to deliberately re-credit / skip months. Sheets may coerce it to a Date — read via accrualStampYm_.
};
/** Pure month arithmetic for the accrual credit (Node-pinned). IN ARREARS:
 *  month M's accrual is owed on/after the 1st of M+1, so a run in nowYm owes
 *  the months stamp+1 .. nowYm-1. A blank/garbage/future stamp SEEDS — owes
 *  nothing and restamps to nowYm-1 (the hand-maintained balance is presumed
 *  current through the end of last month at enable time, so enabling never
 *  dumps a surprise back-credit). Catch-up caps at
 *  PTO_ACCRUAL_CATCHUP_MAX_MONTHS with the overflow RETURNED, not silently
 *  absorbed (INV-187 — the audit row names what the cap dropped). */
const PTO_ACCRUAL_CATCHUP_MAX_MONTHS = 12;
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
// Inter-department request tracking (DeptRequests tab). No email body is ever
// stored; since operator testing note 6 (2026-09-10) the row DOES carry the
// note's patient name & TRX (PATIENT_TRX, col 13) — see that column's note.
// NOTE_ID (col 11) is a back-compat trailing add (A5): legacy rows read '' for it
// and never dedupe; new auto-logged rows carry the source noteId so a re-send of
// the same note to the same dept reuses the open row's token instead of opening a
// second request. Same back-compat posture as CN_HEADERS / FS_HEADERS.
const DR = { REQ_ID:0, BY_ID:1, BY_NAME:2, BY_EMAIL:3, TO_DEPT:4, TO_EMAIL:5, CREATED_AT:6, STATUS:7, RESOLVED_AT:8, RESOLVED_BY:9, LABEL:10, NOTE_ID:11, RESOLVED_VIA:12, PATIENT_TRX:13 };
// RESOLVED_VIA (trailing, operator 2026-09-10 — back-compat like NOTE_ID; the
// header self-heals): HOW the row was resolved — 'email' = the recipient
// clicked the resolve link in the department email (a real response time),
// 'app' = someone pressed "Mark resolved" in the tracker (a manual clear —
// NOT a response time). A blank cell is a row resolved before the source was
// recorded, and by operator decision it is excluded from the timing stats
// too, reported as "resolved before source tracking".
// PATIENT_TRX (trailing, operator testing note 6, 2026-09-10 — back-compat like
// NOTE_ID; the header self-heals): the source note's "Patient Name & TRX" as
// typed, capped at DR_PATIENT_TRX_MAX. This is the ONE patient-identifying
// cell in the store, added by OPERATOR DECISION: the constructed email subject
// is "<update type> · <patient & trx>", and a collapsed tracker card that
// shows only the update type is unidentifiable to the desk working it. The
// store stays inside the Workspace (the ADP sheet, or DEPT_REQUESTS_SS_ID);
// the daily SLA reminder EMAIL and the shared AuditLog stay LABEL-ONLY —
// `deptRequestsOverdueOpen_` deliberately never reads this column, and no
// audit row carries it (INV-32's discipline for the shared trail).
const DR_HEADERS = ['RequestId','CreatedById','CreatedByName','CreatedByEmail','ToDept','ToEmail','CreatedAt','Status','ResolvedAt','ResolvedBy','Label','NoteId','ResolvedVia','PatientTrx'];
const DR_RESOLVED_VIA_VALUES = ['email', 'app'];
const DR_PATIENT_TRX_MAX = 120;
// Bounded tail scan for the getDeptRequests LIST read only (rows append
// chronologically; the sheet grows one row per dept email with no retention).
// The resolve-by-token scans (resolveDeptRequest / markDeptRequestResolved_)
// stay FULL so an old token still resolves. INV-13 spirit, mirrors CN_AUDIT_MAX_SCAN.
const DR_MAX_SCAN = 4000;
// F18 (cycle 12): the per-LIST payload cap (mine / incoming / allOpen). Distinct
// from DR_MAX_SCAN (the sheet-read bound) — a run can scan 4000 rows and still
// have >100 open requests to show. Reported alongside the lists as listCap +
// *Total so the client can render "showing N of M" instead of implying N is all.
const DR_LIST_CAP = 100;
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
  'FormTokenCreated', 'FormTokenVoided', 'FormSubmissionReceived',
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
// Cycle-11 L-1 — combined serialized cap on the four email-composer subform
// detail objects (shipping/close/resupply/oop). They were the one
// client-writable subformData input with NO size bound: a huge pasted
// specialNote rode into the ~50k-cap SubformData cell, where the post-send
// stamp failure is swallowed (INV-42) and a near-cap blob makes every LATER
// pin/flag/feedback write on that note throw. 16k leaves headroom for the
// rest of subformData; legitimate details run a few hundred chars.
const CN_EMAIL_DETAILS_MAX_CHARS = 16000;
// Cycle-12 F11 — the L-1 class one surface over. L-1 bounded each email-detail
// object's SIZE, but the two APPEND-ONLY arrays in the same cell were unbounded
// in LENGTH: subformData.feedback[] grows by one entry per manager reply /
// comment / rep ack / clarification (each ≤2000 chars), and
// subformData.externalEmails[] by one per external send. A long-running
// coaching thread on one note, or a note emailed to a customer many times,
// therefore walks the cell toward its ~50k Sheets limit — and at that point
// EVERY later write on that note throws, including the flag/pin/resolve ops a
// rep would use day to day. Two guards per append: an entry-count cap (a
// pathological loop can't get near the byte limit) and a serialized-size check
// that REFUSES the append with an actionable error rather than writing a blob
// that bricks the note (the INV-96 posture — reject, never silently truncate a
// record). Deliberately applied ONLY at the two GROWING appends: the
// flag/resolve/pin writes set scalar fields and must stay writable so an
// already-oversized note can still be un-flagged / edited back down.
const CN_SUBFORM_MAX_CHARS = 45000;          // under the 50k Sheets cell limit
const CN_FEEDBACK_MAX_ENTRIES = 200;         // a Q&A thread this long is pathological
const CN_EXTERNAL_EMAILS_MAX_ENTRIES = 100;  // sends logged per note
const CN_TEMPLATE_RECIPIENT_TYPES = ['customer', 'provider', 'any'];
const CN_EXTERNAL_LINK_LIMIT = 50;
const CN_AUTO_TAG_RULE_LIMIT = 50;   // auto-tag rules (operator 2026-08-13)
// Quick-link categories (the official external-collection path — #2). Order is
// the composer-picker optgroup order; 'other' is the back-compat default.
const CN_EXTERNAL_LINK_CATEGORIES = ['survey', 'review', 'feedback', 'other'];
// COUPLING ALERT: These positions MUST match HISTORICAL_COLS in
// call-data-reporting/apps-script/department-dashboard/Config.gs.
// validateCdrColumns_() checks at runtime. On mismatch, update
// here AND bump CDR_CACHE_KEY. Last verified: 2026-05-28.
// Duration columns (TTT, ATT) MUST be read via getDisplayValues() — see
// the "Spreadsheet TZ ≠ script TZ" gotcha in call-data-reporting/CLAUDE.md.
// AvgAbdWait (col AG / index 33) and CsrAvgAbdWait (col AH / index 34) are
// also duration columns, but are intentionally NOT read by any metric today,
// so they are omitted from this enum to avoid a dead-but-tempting entry —
// `QUEUE_EXT` below was exactly such an entry for years (declared, read
// NOWHERE) until cycle 14's Phase 0 queue inventory finally consumed it. If
// you ever wire them in: re-add them here AND to CDR_EXPECTED_HEADERS, and
// read them through getDisplayValues() (never getValue()) or the phantom
// timezone offset (INV-64) will silently corrupt the parsed seconds.
const CDR = {
  DATE: 2, AGENT: 3, QUEUE_EXT: 4,
  TOTAL_UNIQUE: 5, TOTAL_RUNG: 6, TOTAL_MISSED: 7, TOTAL_ANSWERED: 8,
  TTT: 9, ATT: 10,
};
const CDR_EXPECTED_HEADERS = {
  // F2 (cycle 15) — col 4 (QUEUE_EXT) is READ by cdrQueueInventory_ but is
  // deliberately NOT validated here yet, and that is a KNOWN, bounded gap.
  // Validation is substring-based, so an entry whose text does not appear in
  // the real header raises a FALSE "Column drift" warning and flips the
  // Automation Health CDR card amber — the exact class of always-wrong health
  // signal cycle 15 removed elsewhere. The header text of col 4 in the
  // `call-data-reporting`-owned sheet has never been recorded here, so adding
  // one would be a guess. TO CLOSE: read the real col-4 header from the DQE
  // tab and add `4: '<that text>',` below. Meanwhile the exposure is small —
  // a column INSERTED at 4 shifts 5..10 and IS caught by the entries below;
  // only an in-place repurpose of col 4 slips through, and the inventory that
  // reads it is a manual diagnostic, not a metric.
  2: 'Date', 3: 'Agent', 5: 'Unique', 6: 'Rung', 7: 'Missed',
  8: 'Answered', 9: 'TTT', 10: 'ATT',
};
// CSR Transfer Historical Data — a SEPARATE tab in the CDR Report spreadsheet
// (T4 #6 transfers trend). Headers A1:S1: Month-Year, Week, Date, CSR Rep Name,
// Transfer %, Total Calls, Total Calls Transferred, then per-queue A_Q_* counts
// (H:R), Comments. Date is M/D/YYYY (handled by cdrRowDateIso_) and Transfer %
// is a "29.79%" string — both read via getDisplayValues() per the CDR
// spreadsheet-tz gotcha (INV-64). The first columns feed the trend; the
// per-queue H:R block is read on demand by this same reader via
// `opts.withQueues` (cycle-14 Phase 1) — it is the ONLY place per-queue REP
// attribution exists, because Phase 0 proved DQE carries one row per
// (agent, date). Phase 0's `cdrQueueInventory_` also reports which of those
// columns carry data. The range is fetched either way, so reading them costs
// nothing extra.
const CSR_TRANSFER_TAB = 'CSR Transfer Historical Data';
const CSRT = { DATE: 2, NAME: 3, TRANSFER_PCT: 4, TOTAL_CALLS: 5, TRANSFERRED: 6 };
const CSR_TRANSFER_NUM_COLS = 19;   // A:S
// Phase 1 (sub-queue, transfer-only) — the per-queue block. Phase 0's inventory
// confirmed DQE carries ONE row per (agent, date), so answered/missed/talk-time
// can NEVER be split by queue. The Transfer tab is the one place per-queue REP
// attribution exists: it is keyed by `CSR Rep Name` and columns H:R hold a
// per-queue transferred count. Those columns are read BY HEADER NAME, not by a
// hardcoded list — the headers are written by the operator-owned
// call-data-reporting repo, so name-reading is self-correcting under a reorder
// and needs no parallel source of truth to drift. (0-indexed 7..17.)
const CSRT_QUEUE_COL_FIRST = 7;
const CSRT_QUEUE_COL_LAST = 17;
// Phase 0 (sub-queue discovery) — bounds for the READ-ONLY queue inventory
// rendered in Admin → Automation Health. Tail-bounded like every other
// diagnostic reader here; the payload cap keeps a sheet with dozens of queues
// from bloating the panel (it reports `truncated` rather than silently
// describing only part of itself).
const CDR_QUEUE_SCAN_MAX = 4000;
const CDR_QUEUE_LIST_CAP = 40;
// Phase 4 — the bucket for a queue that no group claims. A gap to close, not
// a department, so it always sorts last.
const CDR_QUEUE_UNGROUPED = 'Ungrouped';
// Cycle-11 L-2 — expected headers for the columns CSRT actually reads
// (1-indexed, so each key = the CSRT index + 1; a Node pin holds the two
// aligned). The Transfer tab is written by the operator-owned
// call-data-reporting repo — the same cross-repo seam validateCdrColumns_
// guards for the DQE tab; without this, a column insert/reorder there fed
// wrong cells into the Transfer KPI with no warning anywhere.
const CSR_TRANSFER_EXPECTED_HEADERS = {
  3: 'Date', 4: 'CSR Rep Name', 5: 'Transfer %',
  6: 'Total Calls', 7: 'Total Calls Transferred',
};
const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DAY_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const ROSTER_CACHE_KEY = 'employee_roster_v11';   // bumped: AccruedThrough column R (automated accrual credits, operator 2026-08-18)
const ROSTER_CACHE_TTL = 300;
// Per-rep call-notes ambient cache: caches the {unresolvedActionCount,
// staleActionCount, todayTotal} aggregate so the 60s sidebar polling doesn't
// re-scan the full per-rep sheet on every tick. TTL-ONLY freshness (INV-43):
// the TTL matches the 60s polling interval, so the badge can be at most 60s
// stale — the same ceiling eager invalidation would give. Mutating endpoints
// deliberately do NOT invalidate (invalidateCnAmbientCache_ is retained for
// manual operator use only; a cycle-17 doc fix — an earlier copy of this
// comment claimed the mutation hot path invalidates, which stopped being
// true when INV-43 landed).
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
/** Day Edit break-row cap (A4). Not a policy limit — a payload bound, so a
 *  crafted slots.breaks cannot make the reconcile loop unbounded. */
const MANAGER_DAY_MAX_BREAKS = 12;
// ── Deploy-version beacon (operator 2026-08-27) ─────────────────────────────
// A New-version deploy updates the SERVER half instantly, but an open tab
// keeps the client it booted with until reload — which for most agents means
// the next morning. The beacon lets open clients notice: doGet stamps the
// page with a fingerprint of the client files being served, and the shell
// re-asks every ~15 min (getDeployStamp); a mismatch means a newer client
// exists and the shell shows a sticky reload PROMPT (never a forced reload —
// yanking the page mid-call is worse than a stale UI; the sticky drafts make
// a chosen reload safe).
// The fingerprint is DERIVED (INV-179): MD5 over index.html's raw template
// content plus every include('...') target it names, so a new partial is
// covered the day it ships and there is no version constant for a deploy to
// forget to bump. Reads go through the same channels production serves —
// getRawContent() for index (createHtmlOutputFromFile would choke nothing,
// but raw keeps the scriptlets in the hash) and include()'s own read for
// partials. Memoised per EXECUTION only (U4, cycle 22): a ScriptCache entry is
// shared by HEAD and every versioned deployment, so it could serve another
// version's hash — a false "updated" prompt, or a masked real one. Prompt lag is
// now the client poll alone (≤ 15 min).
let _clientBuildHashMemo = null;
/** Multi-day time-off request (operator 2026-08-18). ONE row per WEEKDAY in
 *  [startDate, endDate] — the store's one-row-per-date model is unchanged, so
 *  every downstream reader (calendar, dashboards, approval queue, INV-03
 *  transitions, bulk approve) works on the rows as if filed singly. ATOMIC
 *  (the INV-106 posture): every weekday is validated — INV-94 dup-date guard,
 *  INV-95 type whitelist, the L-11 horizon — and NOTHING is written unless
 *  all pass; a conflict rejects the whole batch NAMING the dates. Weekends
 *  inside the range are skipped silently (a Mon–Fri×2 range naturally spans
 *  them); a range of only weekend days is rejected. Rows stay Pending — no
 *  balance change until approval (INV-03), each carrying the same submittedAt
 *  (cancel/update match on (date, submittedAt), and dates differ per row). */
const TIMEOFF_RANGE_MAX_DAYS = 31;
// ── Batch L (sheet doctor) — Timesheet duplicate/inversion detector ─────────
// The getPtoReconciliation/fixPtoReconciliation pattern applied to the
// Timesheet: a read-only detector + a locked, idempotent one-click collapse.
// Two detectable signatures over the last TS_DOCTOR_WINDOW_DAYS:
//   • DUPLICATES — >1 row for one (emp, date, punch type). New ones are
//     prevented by the live sequence guard (INV-155), so these are pre-guard
//     rows; the fix keeps the LAST row in append order — the SAME row
//     findExistingPunch_ updates and managerSaveDay's snapshot displays —
//     and deletes the rest with `duplicate collapsed` audit rows.
//   • INVERTED PAIRS — a day whose last ClockOut is at-or-before its first
//     ClockIn. calcHours_ deliberately wraps out<in as an overnight +24h
//     (the pinned C3 decision; an EQUAL minute pair is zero hours since
//     2026-09-17, not a wrap), so a mis-keyed AM/PM pair silently computes
//     a huge day. REPORT-ONLY: the doctor can't know intent — the fix is a
//     manager Day Edit, never an auto-swap.
var TS_DOCTOR_WINDOW_DAYS = 92;   // ~a quarter — covers every open export period
var TS_DOCTOR_MAX_GROUPS = 200;   // payload bound; narrow by fixing + re-running
// Cycle-12 F2 — work bound on the DESTRUCTIVE collapse. Each collapsed row is
// a deleteRow + an audit appendRow (~0.5s), and the whole run holds the ONE
// project-wide ScriptLock, so every rep punch fails on waitLock(15000) for the
// duration. 200 rows ≈ 100s worst case; the op is idempotent, so a larger
// backlog drains over successive clicks instead of starving the floor (the
// same reasoning that moved the Timesheet archive off 1am — INV-153).
var TS_DOCTOR_FIX_MAX_ROWS = 200;
/* ── Timesheet timezone repair (operator 2026-09-02) ─────────────────────────
 * The ALL-CST roster flip (Timezone column → America/Chicago) changes how
 * EXISTING Timesheet rows are READ, not what they hold: every punch was
 * stamped as the rep's local DATE + wall TIME at the moment it was recorded,
 * so a CST shift worked under `Asia/Manila` sits in the sheet as ClockIn on
 * date D at 21:30 and ClockOut on date D+1 at 06:00. Read as Chicago digits,
 * both halves are INCOMPLETE days — excluded from timesheet totals, pay
 * statements, the team calendar and the hours-driven accrual (INV-176/194).
 *
 * This ONE-TIME repair rewrites those rows: each (date, time) is parsed as an
 * instant in the OLD tz and re-formatted in the NEW tz, so a split shift
 * collapses back onto one CST date and every reader recomputes on its own.
 * Design rules, each load-bearing:
 *  - `flippedAt` is REQUIRED (a wall time in the NEW tz): rows stamped at or
 *    after that instant were already written under the new tz and are left
 *    alone. Without it a post-flip punch would be shifted a second time.
 *  - DRY RUN BY DEFAULT — a bare call writes nothing; the plan (every row's
 *    before → after) is logged, and the collision report NAMES rows that
 *    would land on a (date, type) another row already occupies, which is
 *    what a hand-edited or double-punched day looks like after the move.
 *  - It reads THROUGH `TimesheetArchive` (INV-153/F1) and writes only the
 *    DATE and TIME cells in place — never appends or deletes a punch, so a
 *    row's COMMENTS (the `ADJ-` marker, INV-09) and its position survive.
 *  - Bounded (`TZ_REPAIR_MAX_ROWS`), locked while applying (INV-01), one
 *    counts-only `TimesheetTzRepair` audit row per employee (INV-08), and the
 *    personal-sheet mirror is re-pointed best-effort (INV-59).
 *  - It is a repair for the TIMESHEET only. Time-off dates were chosen by the
 *    rep and need nothing; call-note DateLocal stamps are cosmetic (which day
 *    History lists a note under) and are deliberately not touched.
 * Run from the editor with an opts object (dryRun defaults TRUE): read the
 * execution log first, then run again with { dryRun: false }. The 2026-09-02
 * PH flip (Anne Garcia + Margie Ingay, Asia/Manila → America/Chicago,
 * flippedAt '2026-09-02 15:00') was applied on 2026-09-03 — 14 rows moved,
 * four self-colliding clock-in pairs (the midnight-PHT re-clock-ins) reported
 * for Day Edit; its one-time wrappers were deleted afterwards. */
const TZ_REPAIR_MAX_ROWS = 2000;
/* ── Split-day punch repair (operator 2026-09-03) ─────────────────────────
 * The follow-up to repairTimesheetTimezone. A PH agent whose roster row still
 * read Asia/Manila hit the rep-local midnight MID-SHIFT, saw "no Clock In
 * today", and clocked in again — so once the repair collapsed each shift onto
 * its Chicago date, four dates carried TWO ClockIn rows: the real morning one
 * (≈08:xx) and the spurious ~noon re-clock (the old PHT midnight). The tz
 * repair REPORTED those as duplicates and stopped, because which row is real
 * is a judgement; here the judgement is settled by construction — the
 * artifact is always the LATER ClockIn, so the EARLIEST is kept.
 *  - ClockIn ONLY. A duplicate of any other type (or a pair with an
 *    unparseable time) is COUNTED and NAMED in the result, never touched —
 *    nothing about this artifact says which ClockOut/lunch row is real.
 *    (`otherDuplicates`, INV-187.)
 *  - The sheet doctor is the wrong tool for this: its collapse keeps the LAST
 *    appended row (INV-155), and the tz repair wrote the noon row last.
 *  - `adds` is the optional second half — punches the agents CONFIRMED for
 *    the days that lost a lunch pair or clock-out to the split. Each is
 *    validated (date inside the window, HH:mm, a PUNCH_LABELS_ type, exactly
 *    one roster target) and written through writeAdjustPunchForEmployee_,
 *    the manager-approval writer: an ADJ- row, the mirror, an audit row with
 *    the caller as actor (INV-09/26/59). An add whose (employee, date, type)
 *    is a duplicate group in the same run is refused — collapse first.
 *  - Live Timesheet tab only (the artifact lives in the current period; Day
 *    Edit is live-only too). Adds are written BEFORE deletes (an append lands
 *    below every planned row, so row indices stay valid); deletes run
 *    BOTTOM-UP; the mirror is re-pointed at the kept time afterwards
 *    (INV-59) because the tz repair's last mirror write was the noon row.
 *  - dryRun defaults TRUE. Apply is MANAGER_EMAILS-gated (INV-44 — editor-run
 *    but google.script.run-reachable), locked (INV-01), bounded, and writes
 *    one `PunchDelete` audit row per removed row naming the kept time.
 * Editor use:
 *   repairSplitDayPunches({ employees: ['Anne Garcia','Margie Ingay'], from: '2026-08-27', to: '2026-09-02' })
 *   repairSplitDayPunches({ ...same, dryRun: false, adds: [
 *     { employee: 'Anne Garcia', date: '2026-08-27', type: 'ClockOut', time: '17:00' } ] }) */
const SPLIT_REPAIR_MAX_SPAN_DAYS = 92;
// ── Presence signal (operator testing note 10, 2026-09-10) ──────────────────
// "Team Right Now" flags a teammate who appears NOT clocked in but is using
// the app. The signal is a per-rep CacheService stamp written by
// recordPresence(), which the SHELL fires on a real user GESTURE (pointerdown /
// keydown) at most once per 10 minutes per window — deliberately NOT from the
// background polls reps already hit (getEmployeeState's 3-min reconcile, the
// 60s Call Notes ambient poll): a pinned pop-out left open overnight polls all
// night, and stamping there would read a rep as "active" at 7am before they
// arrived — the false positive that teaches reps to ignore the chip. A gesture
// is the one thing a left-open window cannot produce. The stamp's TTL bounds
// the claim: "seen in the app within the last ~30 minutes".
//
// INV-24 amendment: getTeammateStatus carries ONE additive boolean
// (`activeNotIn`) derived from the stamp — never the stamp's timestamp, never
// a last-seen time — so the low-privilege view still leaks nothing a
// teammate could not infer from the chip itself. A failed cache read yields
// NO flags (presenceMap_ → {}): a false "active but not clocked in" is worse
// than a missed one, the INV-190 direction for a nudge.
//
// v1 limits, stated on the chip's tooltip: shift hours and PTO are NOT
// checked — a rep on a day off who opens the app reads as active, which is
// true. Gating on the rep's schedule/PTO is a logged follow-on.
const PRESENCE_CACHE_PREFIX = 'presence_v1:';
const PRESENCE_TTL_SEC = 1800;   // ~30 min — the window the chip's tooltip names
const CN_PIN_LIMIT = 3;  // max personal pins per rep — keeps the pinned tray a focus tool, not a second inbox
// ── Tag-trend analytics (#5 — manager Admin "Tag Trends" panel) ─────────────
// Turns the same per-rep tag scan the taxonomy uses into a weekly time series
// so a manager can see which issue types are spiking. Manager-gated, read-only,
// cached, PHI-free (tags + dates only). The week-bucketing math is factored
// into the pure cnTrendWeekStarts_ / cnTagTrendsFromEvents_ (Node-pinned).
const CN_TAG_TRENDS_CACHE_KEY = 'cn_tag_trends_v1';
const CN_TAG_TRENDS_CACHE_TTL = 300;   // 5 min — same cadence as the taxonomy
const CN_TAG_TRENDS_WEEKS = 12;        // trailing window
const CN_TAG_TRENDS_TOPK = 12;         // top tags by total (bounds payload + chart)
const CN_ARCHIVED_TAGS_PROP = 'CN_ARCHIVED_TAGS';
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
// ── Pre-pilot observability (operator 2026-08-13): IMMEDIATE spike alert ────
// The ClientErrors tab was panel-only — a pilot rep hitting errors was
// invisible until the operator happened to open Admin → Automation Health.
// This sends managers ONE branded email when errors SPIKE (an org-wide count
// threshold inside a rolling window), cooldown-deduped so a bad hour can't
// flood inboxes. The threshold is what preserves INV-150's original
// "deliberately not pushed" rationale — a single benign browser quirk still
// never emails anyone; a burst that means real breakage does, immediately.
const CLIENT_ERR_ALERT_MIN = 5;                 // org-wide errors in the window
const CLIENT_ERR_ALERT_WINDOW_SEC = 3600;       // rolling ~1h counter
const CLIENT_ERR_ALERT_COOLDOWN_SEC = 6 * 3600; // at most one alert email per 6h
const CLIENT_ERR_PROBLEM_MIN = 10;              // 24h count that trips the health dot/digest
// ── Pre-pilot observability: view-usage telemetry (operator 2026-08-13) ─────
// "What parts of the web app are priorities" needs DATA, and the app had none:
// the AuditLog records state-changing actions and KbViews records article
// opens, but nothing recorded which TABS reps actually spend time in. The
// client fires a throttled, fire-and-forget beacon on each tab enter (the
// kbRecordView posture — PHI-free row: timestamp, empId, tab key, full/compact)
// into a ViewUsage tab in the ADP spreadsheet; the Admin Overview renders the
// aggregate. View-as previews are SKIPPED client-side so an admin exploring
// roles doesn't pollute the numbers.
const VIEW_USAGE_TAB = 'ViewUsage';
const VIEW_USAGE_RATE_MAX_PER_HOUR = 120;   // per rep — navigation, not a firehose
const VIEW_USAGE_SCAN_MAX = 8000;           // stats tail bound (INV-13 spirit)
// Boot-timing beacon (operator 2026-09-04 — "can the app be pre-warmed
// before each shift?"). Nothing measured which phase of a cold start a rep
// actually waits on, so a warm-up would have been a guess. The client's boot
// send now carries three durations — `shell` (navigation start → shell painted
// after getEmployeeState), `state` (the getEmployeeState round trip alone) and
// `view` (navigation start → the landing view's FIRST real data paint) — as a
// JSON cell on the SAME ViewUsage row (no second endpoint, no second row).
// Bounded per value so a garbage client cannot skew the medians.
const VIEW_USAGE_WIDTH = 5;
const VIEW_USAGE_TIMING_MAX_MS = 300000;   // five minutes — beyond that it is not a boot, it is a stall
const VIEW_USAGE_TIMING_KEYS = ['shell', 'state', 'view'];
// ── Diagnostics retention (cycle-18 F11 follow-on, 2026-09-11) ─────────────
// ViewUsage + ClientErrors were the ONLY two growing stores with no retention
// tier — append-only diagnostics that nothing aged out, and neither surfaced
// in Storage Health, so the "trim manually" obligation lived only in CLAUDE.md.
// Two independent windows (Script Property first, then CONFIG — the
// FORM_DATA_RETENTION_DAYS shape), both DISABLED by default, a single daily
// trigger. The rows are PHI-free by construction (INV-150 / the observability
// KDD): the delete is irreversible, never a PHI question — but it is still a
// top-level trigger handler reachable via google.script.run, so it carries the
// INV-44 gate, the INV-01 lock, and a counts-only audit row (the INV-161
// liveness heartbeat). It reads with getSheetByName (never provisions — a
// missing tab means nothing was ever recorded) and is bounded per run so a
// large first enable drains over successive nights (the INV-153/F3 bound).
const VIEW_USAGE_RETENTION_PROP = 'VIEW_USAGE_RETENTION_DAYS';
const CLIENT_ERR_RETENTION_PROP = 'CLIENT_ERR_RETENTION_DAYS';
const DIAG_PURGE_MAX_ROWS_PER_RUN = 2000;   // across BOTH tabs, oldest first
// Audit actions written by the automation jobs. Purges write a row only when
// retention is enabled (a disabled purge returns before the audit write), and
// AdpExportAuto only fires at period end — the client captions each
// accordingly so "never seen" isn't misread as "broken".
const AUTOMATION_AUDIT_ACTIONS = [
  'CallNotesReconcile', 'AdpExportAuto', 'FormDataPurge', 'CallNotesPurge',
  'CallNotesArchive', 'CallNotesArchivePurge', 'TimesheetArchive',
  'PtoAccrualCredit', 'QaReviewPurge', 'DiagnosticsPurge',
];
const AUTOMATION_SYNCFAIL_WINDOW_DAYS = 30;
// A1 (cycle 22) — the per-job RUN LEDGER. Liveness used to read only the last
// CN_AUDIT_MAX_SCAN AuditLog rows, so the monthly accrual row scrolled out of
// that window within days of the 1st (a daily false "has not run this month")
// and a dead daily job went SILENT the moment its last row scrolled out.
// writeAuditLog_ now stamps one Script Property per automation action —
// AUTOMATION_RUN_<action> = {ts, notes} — on every automation audit row. One key
// per job, so two jobs finishing together never race a shared read-modify-write.
// Auto-managed; delete a key to forget that job's last run.
const AUTOMATION_RUN_PROP_PREFIX = 'AUTOMATION_RUN_';
// S7 (cycle 22) — who has been offboarded, lowercased, newest last. Offboarding
// clears the roster EMAIL cell, so afterwards nothing on the roster can say an
// address in MANAGER_EMAILS / ADMIN_EMAILS belongs to someone who left; the
// managerSource detector keys on this list instead. Auto-managed (capped at
// OFFBOARDED_EMAILS_MAX, oldest dropped first); re-onboarding the same address
// clears the flag by itself (the detector ignores an address back on the roster).
const OFFBOARDED_EMAILS_PROP = 'OFFBOARDED_EMAILS';
const OFFBOARDED_EMAILS_MAX = 100;
// Follow-up to S7 (cycle 22): who last ran installAutomationTriggers, and when
// ({email, at}). Installable triggers run AS their installer and stop when that
// account is disabled, so offboarding the installer silently stops every job.
// Stamped by the installer; read by the triggerOwner detector. Auto-managed.
const AUTOMATION_TRIGGER_OWNER_PROP = 'AUTOMATION_TRIGGER_OWNER';
// The two gate lists offboarding edits. An address is REMOVED from each, except
// when it is the list's LAST entry: an empty ADMIN_EMAILS makes EVERY manager an
// admin (empIsAdmin_), and an empty MANAGER_EMAILS stops every trigger handler
// (assertManagerCaller_) — so the removal is refused and named instead.
const OFFBOARD_GATE_LISTS = ['MANAGER_EMAILS', 'ADMIN_EMAILS'];
// ── Per-JOB liveness, derived rather than accumulated (Gap4 / INV-186) ───────
// automationProblems_ grew one hand-written check per SIGNAL, so a job added
// later got an audit row and no alarm: only CallNotesReconcile was ever checked
// for staleness, while the PTO accrual credit — which writes leave BALANCES —
// failed to nobody (F4). This table is the derivation instead.
//
// The `enabled` predicate is the load-bearing part, and it is INV-186 in code:
// "before toning a health indicator off a count, ask what that count reads on a
// healthy production system". Most of these jobs legitimately write NO audit row
// on a correctly-configured deployment (retention disabled, no accruing reps), so
// a bare staleness check would nag every such deployment forever. A job whose
// `enabled()` is false is simply not checked.
//
// `cadence` is 'daily' (expect a row every run) or 'monthly' (expect one per
// calendar month, in arrears — see INV-194). AdpExportAuto is DELIBERATELY
// ABSENT: it fires only at a pay-period boundary, so neither cadence describes
// it, and a check that is wrong most of the month is worse than none.
const AUTOMATION_JOB_CHECKS = [
  { action: 'CallNotesReconcile', label: 'nightly Sheets reconcile',
    cadence: 'daily', staleHours: 30, enabled: function () { return true; } },
  { action: 'PtoAccrualCredit', label: 'monthly PTO accrual credit',
    cadence: 'monthly', graceDays: 3,
    enabled: function () { return !!getFlag_('enablePtoTracking') && rosterHasAccruingRep_(); } },
  { action: 'TimesheetArchive', label: 'Timesheet cold-archive',
    cadence: 'daily', staleHours: 30,
    enabled: function () { return getTimesheetArchiveDays_() > 0; } },
  { action: 'CallNotesArchive', label: 'call-note cold-archive',
    cadence: 'daily', staleHours: 30,
    enabled: function () { return getNoteArchiveDays_() > 0; } },
  { action: 'CallNotesPurge', label: 'call-note retention purge',
    cadence: 'daily', staleHours: 30,
    enabled: function () { return getNoteRetentionDays_() > 0; } },
  { action: 'CallNotesArchivePurge', label: 'archived-note purge',
    cadence: 'daily', staleHours: 30,
    enabled: function () { return getArchiveRetentionDays_() > 0; } },
  { action: 'FormDataPurge', label: 'form-data retention purge',
    cadence: 'daily', staleHours: 30,
    enabled: function () { return getFormRetentionDays_() > 0; } },
  { action: 'QaReviewPurge', label: 'QA review-record retention purge',
    cadence: 'daily', staleHours: 30,
    enabled: function () { return qaReviewRetentionDays_() > 0 && qaStoreConfigured_(); } },
  { action: 'DiagnosticsPurge', label: 'diagnostics retention purge (ViewUsage / ClientErrors)',
    cadence: 'daily', staleHours: 30,
    enabled: function () { return viewUsageRetentionDays_() > 0 || clientErrRetentionDays_() > 0; } },
];
// A trigger handler that CATCHES its own error reports failure to nobody:
// Apps Script's own failure email fires on a THROW, not on a returned error
// object (F4). Each such job stamps its last error here and clears it on a
// clean run, so the panel and the daily digest can see it.
const AUTOMATION_ERROR_PROP = 'AUTOMATION_LAST_ERRORS';
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
/** Round-1 #8 follow-on — the NEUTRAL shared sender, dormant until configured
 *  (the WHATSNEW_KB_ID posture). Script Property `REP_SENDER_FROM` names a
 *  Gmail "Send mail as" alias of the DEPLOYING account (the operator creates
 *  it in Gmail settings first); when set AND registered, rep-initiated emails
 *  send from that address via GmailApp (which honors `from` for registered
 *  aliases — MailApp cannot). Validated against GmailApp.getAliases() so a
 *  typo'd/unregistered property FALLS BACK to the deployer identity with a
 *  console warning instead of throwing every send (fail-safe — a bad property
 *  can never break email). Cached per execution; any throw resolves to ''. */
let _repSenderFromResolved = null;
/* Operator 2026-09-03: "any email the app sends, BCC me". Script Property
 * MAIL_BCC_ALL — a comma-separated list; unset = no change. Applied in ONE
 * place (appSendMail_, which every automated sender now calls, plus
 * sendRepEmail_'s two branches) so none of the ~26 senders carries its own
 * copy of the rule. It APPENDS to a caller's bcc, never clobbers it; dedupes
 * case-insensitively against to/cc/bcc so a manager already addressed does
 * not get a second copy; a malformed entry is dropped; memoized per execution. */
let _mailBccAllCache = null;
/** What MAIL_BCC_ALL is currently doing, for the Admin System tab (F3,
 *  2026-09-09). The property is merged into EVERY email the app sends —
 *  intake PPD/PMD/PAP bodies carry full patient answers, department emails
 *  carry the patient name + TRX — and until this shipped it appeared NOWHERE
 *  in the app: not Admin, not Storage Health, not Automation Health, not the
 *  feature-flag surface. Its documented purpose is transient ("set it while
 *  testing, clear it after"), which is exactly the setting most likely to be
 *  left on, and a silent standing PHI copy is the kind of thing an audit
 *  finds rather than an operator remembers.
 *
 *  It REPORTS, it does not enforce. An address outside the deploying
 *  account's own domain is escalated to a blocking finding rather than
 *  dropped: silently discarding an address the operator deliberately typed
 *  would leave them believing they are getting copies they are not — a worse
 *  failure than the one being guarded (INV-187's direction). The domain comes
 *  from Session.getEffectiveUser(), the account that owns every store and
 *  sends every message, so there is no second copy of the org domain to
 *  drift from doGet's own check. `external` is null when that account cannot
 *  be read: unknown, never "all clear". */
// ════════════════════════════════════════════════════════════════════════════
//  SCRIPT PROPERTY SIZE GUARD (Batch Q, 2026-09-11)
//  Apps Script caps a Script Property VALUE at 9KB and the whole store at
//  500KB, and until this batch no code or doc accounted for either: the email
//  template caps alone (CN_EMAIL_TEMPLATE_LIMIT × CN_EMAIL_TEMPLATE_BODY_MAX)
//  admit ~200KB, so a validator could pass a blob the platform then refused
//  with an opaque "Argument too large" — after the audit row, or mid-write.
//  ONE writer for every JSON-blob property: `propSetBounded_`. Operator-edited
//  blobs REFUSE by name with nothing written (the INV-96 posture); auto-managed
//  blobs DEGRADE by name through a caller-supplied shrinker (a cache resets on
//  BYTES, a stamp map drops its oldest entry). Scalar writers (a day count,
//  a model key, a folder id, a generation counter) stay on setProperty and are
//  allowlisted BY NAME in the Q-1 pin with a reason each.
// ════════════════════════════════════════════════════════════════════════════
const PROP_VALUE_MAX = 9000;         // bytes — under the platform's 9KB per-value cap
const PROP_STORE_MAX = 500 * 1024;   // bytes — the platform's per-store cap
const PROP_WARN_PCT = 80;            // Storage Health warns past this share of either cap
/** The operator-edited JSON-blob properties whose editors show a budget —
 *  every key here is written through propSetBounded_ in refuse mode. */
const ADMIN_PROP_KEYS_ = ['CN_DEPARTMENT_EMAILS', 'CN_STATE_TAX_RATES', 'CN_UPDATE_SUGGESTIONS', 'CN_EMAIL_TEMPLATES',
  'CN_EXTERNAL_LINKS', 'CN_AUTO_TAG_RULES', 'DR_SLA_TARGETS', 'SPANISH_INBOX_MEMBERS', 'SHIFT_BREAK_SCHEDULES',
  'QA_SCORECARD_CRITERIA', 'QA_MEMBERS', 'CN_FEATURE_FLAGS', 'CN_ARCHIVED_TAGS'];
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
// Cycle-12 F3-sibling: rows moved per nightly archiveOldCallNotes run, shared
// across ALL reps (the walk is one execution + one global ScriptLock, so a
// per-rep cap would not bound the run). Same order as the Timesheet twin's cap
// — sized for "drains a multi-year backlog over a couple of weeks of quiet 3am
// runs" while staying comfortably inside the 6-minute execution ceiling.
const CN_NOTE_ARCHIVE_MAX_ROWS_PER_RUN = 2000;
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
// Cycle-12 F3 — rows moved per nightly run. The move holds the global
// ScriptLock and deletes row-by-row, so an unbounded first enable (a year is
// ~20k rows here) cannot finish inside the 6-minute ceiling — and a killed run
// re-appends whatever it failed to delete, duplicating payroll into the archive
// run after run. 2000 rows/night drains a multi-year backlog in a couple of
// weeks of quiet 6pm runs while keeping each run comfortably finite.
const TIMESHEET_ARCHIVE_MAX_ROWS_PER_RUN = 2000;
// ── Automation trigger quota + same-slot dispatchers (operator 2026-09-11) ──
// Apps Script allows at most AUTOMATION_TRIGGER_QUOTA installable triggers per
// USER per SCRIPT. The follow-ons round took this installer to 21, and the
// operator's install threw "This script has too many triggers" on the LAST
// create — AFTER the dedupe loop had deleted every existing trigger — so the
// deployment was left with 20 of 21 and NO creditMonthlyPtoAccruals. Two
// fixes: (a) a trigger per SLOT rather than per job — same-slot jobs run
// inside one of the dispatchers below, driven by TRIGGER_GROUPS (the ONE
// source for the dispatcher bodies, the retired-handler dedupe list, the
// install email and the Node pins); (b) the installer COUNTS before it
// deletes and refuses when the total would exceed the quota, so a future
// overflow fails with nothing removed.
const AUTOMATION_TRIGGER_QUOTA = 20;

// How many COMPLETED months the accrual credit re-examines on every run
// (operator 2026-09-15). The column-R stamp closes a month permanently, but the
// Timesheet is not final on the 1st — an adjustment approved days later used to
// be lost behind the stamp, and was, for all three PH reps in 2026-08. Three
// months is the window in which late payroll corrections actually arrive; the
// reconcile pass re-values those months on every run and credits the
// difference, so nothing is lost and nothing is credited twice. Widening this
// costs nothing at read time (the range index reads the whole tab regardless)
// and lengthens only the in-memory per-month slicing.
const PTO_ACCRUAL_RECONCILE_MONTHS = 3;
// Dispatcher → the top-level handlers it runs, IN ORDER. Every name must be a
// defined top-level function that carries its own assertManagerCaller_ gate
// (INV-44) — each stays reachable via google.script.run and keeps its own
// audit rows / heartbeats, so Automation Health's per-job liveness is
// unchanged. Order inside a group: the cheapest / bounded jobs first, the
// cross-rep walk last, so a job that runs long cannot starve the others.
const TRIGGER_GROUPS = {
  runHourlyJobs:    ['sendCallNotesEodDigest', 'autoAssignSpanishThreadsScheduled'],
  runWeeklyDigests: ['sendCallNotesWeeklyDigests', 'sendCoachingRecapDigest'],
  runNightlyPurges: ['purgeOldDiagnostics', 'purgeOldQaReviews', 'purgeExpiredFormData', 'purgeArchivedCallNotes'],
  // 8am manager-tz. checkOpenPunches STAMPS and sendAutomationHealthDigest
  // (9am) reads that stamp, so an open punch reaches a manager by email the
  // same morning without this group sending mail of its own — the hour gap is
  // the wiring, not a coincidence. sendCallNotesUrgentDigest moved in here from
  // a standalone trigger of its own, so the group is COUNT-NEUTRAL against the
  // quota that already bit this deployment once (RETIRED_TRIGGER_HANDLERS is
  // derived from these lists, so a re-install removes its old trigger).
  runDailyChecks:   ['checkOpenPunches', 'sendCallNotesUrgentDigest'],
};
// Handlers that USED to own a trigger of their own. Both delete loops consult
// this list so a re-install removes the standalone triggers a previous install
// created (the 2026-09-11 deployment holds eight of them). DERIVED from the
// groups — never a second list. A name here is never also in TARGETS (pinned).
const RETIRED_TRIGGER_HANDLERS = Object.keys(TRIGGER_GROUPS)
  .reduce(function (acc, k) { return acc.concat(TRIGGER_GROUPS[k]); }, []);
// Synthetic "employee" identity for system-initiated audit rows (no real actor).
const _SYSTEM_AUDIT_EMP_ = { id: 'SYSTEM', name: 'Automation', email: 'automation@system' };
// ── Digest last-run heartbeats (Automation Health) ──────────────────────────
// The three digest jobs deliberately write NO audit rows: the EOD digest runs
// hourly, and 24 rows/day would crowd the bounded AuditLog tail scans that
// back the compliance + health panels. Each run instead stamps a Script
// Property heartbeat; getAutomationHealth surfaces it with a staleness flag —
// closing the "silently dead digest trigger" blind spot.
const DIGEST_LAST_RUN_PROP = 'AUTOMATION_DIGEST_LAST_RUNS';
const SELF_TEST_RESULT_PROP = 'SELF_TEST_LAST_RESULT';   // {date, mode, pass, fail, skip[, error]} — nightly self-test outcome
// F15 (cycle 12): how long a {running:true} sentinel may persist before it means
// "the last run never finished". Apps Script kills an execution at 6 minutes and
// the kill is not reliably catchable, so a killed run leaves the sentinel behind;
// 2h is far beyond any real suite and well inside the daily cadence.
const SELF_TEST_STUCK_MS = 2 * 3600000;
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
  { key: 'spanishAutoAssign', label: 'Scheduled Spanish Inbox auto-assign',
    description: 'Every hour during business hours (weekdays inside the Coverage business window, US holidays excluded), hand every UNCLAIMED pending Spanish Inbox request — voicemails included — to the least-loaded configured bilingual member, exactly as the manager "Auto-assign N unclaimed" button does. Needs the Spanish bilingual members list; existing claims are never reassigned. Run installAutomationTriggers() once after first enabling so the hourly trigger exists; it heartbeats even while off.',
    default: false, scope: 'server' },
  { key: 'kbAiGuidance', label: 'AI guidance (Reference drawer)',
    description: 'Show an AI-generated guidance card in the Reference drawer, built from whitelisted call facets (department / update type / tags / flag) + excerpts from your own KB articles. Configure the cap + model in the "AI Guidance" section below; set Script Property KB_AI_API_KEY first.',
    default: false, scope: 'both',
    danger: 'External AI vendor — whitelisted facet enums + your own (PHI-free-by-policy) KB excerpts are sent to the Anthropic API. No free-typed note text or patient data ever enters the payload (INV-119), but confirm the org’s stance on the vendor before enabling.' },
];
/** Roster employee-id shape for a per-employee break key (the EMP.ID column's
 *  own vocabulary: letters/digits/_/-; TEST_ ids included so the suite can
 *  drive it). */
const BREAK_EMP_KEY_RE = /^[A-Za-z0-9_\-]{1,40}$/;
const BREAK_EMP_MAX_KEYS = 200;
/** Memoized per execution — getShiftSchedule_ runs per-rep-per-day inside the
 *  coverage/punctuality walks, so the property read must not repeat (the
 *  adpSheetTz_/L-3 pattern). undefined = not read this execution; null =
 *  property unset or corrupt (CONFIG.SHIFT_SCHEDULE stays the source). */
let _breakSchedulesCache;
/** Walk bound — an absurd pair (a corrupt stamp, a decade-old open request)
 *  must not spin a per-day loop through the execution budget. Beyond this the
 *  answer is "unknown", not a number. */
const BIZ_MAX_SPAN_DAYS = 400;
// Batch-6 (cycle 17): the three Spanish-inbox readers share ONE scan cap —
// GmailApp.search silently returns at most this many threads, so a window
// busier than the cap under-reported with no signal (the INV-169 class). Each
// reader now returns `truncated` (threads.length >= the cap ⇒ possibly more)
// and the Spanish tab renders a "narrow the window" warning.
const SPANISH_THREAD_SCAN_MAX = 200;
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
// ── Spanish inbox — claim / assign (pilot round 2, 2026-08-24) ──────────────
// Pilot ask #4: agents mark that they are WORKING a pending request so
// teammates don't duplicate the work, and managers can assign one to a
// specific agent. ADVISORY by design — a claim locks nothing (two agents
// racing resolves socially), which keeps the concurrency story trivial.
// Same store posture as SpanishManualResolved: a small APPEND-ONLY tab on the
// ADP sheet, PHI-free (threadId + internal emails + ms-number only — never
// subject/body), latest row per thread wins, a 'release' row clears it.
const SPANISH_CLAIMS_TAB = 'SpanishClaims';
const SPANISH_CLAIMS_SCAN = 1000;   // bounded tail — the map read stays cheap
/** The SCHEDULED twin of the button (operator testing note 4's "might follow",
 *  2026-09-11): an hourly trigger that runs the SAME spanishAutoAssignCore_
 *  — one scope rule, one voicemail fold, one picker, one claim-row shape —
 *  behind the `spanishAutoAssign` feature flag (server scope, default OFF,
 *  the managerDailyBrief posture), so a fresh deploy is a behavioural no-op
 *  and the operator turns it on from Manage → Admin → Feature Toggles.
 *
 *  Trigger handler: top-level, MANAGER_EMAILS-gated (INV-44), heartbeat
 *  `spanishAutoAssign` stamped BEFORE the flag check so the trigger's
 *  liveness stays observable while the feature is off (INV-151). It acts
 *  ONLY inside business hours — the ONE definition the app has
 *  (`businessMinutesBetween_`: the Coverage window, weekdays, US holidays),
 *  never a second weekday/hour arithmetic — because a request auto-assigned
 *  at 2am sits on somebody's plate all night reading as "claimed", which is
 *  worse than unclaimed. The actor is the INSTALLER's roster row (the
 *  claim's `assignedBy` and the audit actor), falling back to the SYSTEM
 *  placeholder when the installer is not on the roster (the
 *  reconcileCallNotes precedent). A failed run — no members configured, a
 *  Gmail read that threw — is stamped into AUTOMATION_LAST_ERRORS (the F4
 *  rule: a handler that merely RETURNS an error reaches nobody) and cleared
 *  on the next clean run. The core's own audit row (`SpanishInboxAutoAssign`,
 *  counts only) is written only when something was unclaimed, so an idle
 *  hour adds nothing to the bounded AuditLog tail scans. */
const SPANISH_AUTO_ASSIGN_DAYS = 7;   // the pending window the button uses by default
// ── Scheduled-call reminders (pilot round 2, 2026-08-24) ────────────────────
// Pilot ask #3: "sometimes a translated call is scheduled for a certain time"
// — a rep schedules a reminder for a specific call and the SHELL reminder
// ticker (chime + sticky toast, every open window incl. the pinned pop-out)
// fires it at lead time. CALLER-SCOPED v1: a rep sees/edits only their own.
// STORE: the forms PHI store (getFormsSS_ — the label plausibly names a
// patient, so it belongs beside FormTokens/FormSubmissions, never the KB or
// a PHI-free tab). Times are EPOCH-MS NUMBER cells (the SpanishManualResolved
// discipline — immune to the whole Sheets date/locale-coercion class).
// DELIVERY LIMIT (documented, not fixable here): Apps Script web apps have no
// background push — a closed browser gets nothing. The reminder serves a rep
// with the app open, which is the pilot's case (the pinned pop-out).
const SCHED_CALLS_TAB = 'ScheduledCalls';
const SCHED_CALLS_SCAN = 2000;      // bounded tail — the read stays cheap
const SCHED_ACTIVE_CAP = 20;        // per-rep active bound (stale ones surface in the list)
const SCHED_LABEL_MAX = 300;
const SCHED_MAX_DAYS_AHEAD = 60;
const SC = { ID: 0, EMP_ID: 1, WHEN_MS: 2, LEAD_MIN: 3, LABEL: 4, STATUS: 5, CREATED_MS: 6 };
// ── Per-rep scratchpad (pilot round 3 #5 — server-backed sticky notes) ──────
// Personal scratch space that follows the rep across browsers/devices —
// operator decision: stored in the rep's OWN per-rep Call Notes spreadsheet
// (a `Scratchpad` tab beside their Notes), so it inherits that store's
// PHI-class handling and per-rep isolation BY CONSTRUCTION (no cross-rep
// read path exists — the resolver is the caller's own callNotesSheetId, the
// INV-167-guarded field the employee builders populate).
const SCRATCHPAD_TAB = 'Scratchpad';
const SCRATCHPAD_MAX_CHARS = 40000;   // comfortably under the ~50k cell limit
/** Inter-department requests for the caller (rep: own; manager: all) + a
 *  per-department resolution-time aggregate for managers. Manager-gated fields
 *  (the aggregate + cross-rep rows) only return for managers. */
// Result cache for getDeptRequests (operator 2026-08-18 load-time sweep). The
// DR store is PHI-free by design (labels + categories only), so unlike the
// Spanish pending list — deliberately uncached because it carries request
// content — a short CacheService result cache is safe here. Keyed per CALLER
// (the response is caller-scoped) + a generation salt bumped by every DR
// mutation (new auto-tracked request, either resolve path), so a resolve is
// visible on the next read rather than aging out; the 90s TTL only bounds
// the open-request ages' staleness (the INV-43 posture). Cache-only-on-success
// (INV-129); an evicted gen key just means a cache miss.
const DR_RESULT_CACHE_TTL = 90;
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
// C17-9 — per-execution personal-spreadsheet handle memo (the L-3 getAdpSS_
// pattern): a 31-day range edit mirrored up to 124 punches, each re-opening
// the SAME per-rep spreadsheet by id inside the global lock. A handle is
// stable within one execution; the month-sheet DATA is still re-read per
// write (a personal month grid is tiny — the openById round-trip was the
// cost). An openById throw is never cached.
let _personalSsCache = Object.create(null);
// ── #4a Punch-adjustment requests (employee batch → manager approval) ─────
// Parallels TimeOffRequests: employees submit adjustment REQUESTS (no immediate
// punch change); a manager approves (writes the ADJ- punch for the target emp)
// or denies. Distinct from the manager Day Edit (managerSaveDay), which is an
// immediate full-day reconcile and must NOT be reused here (it would delete
// punch types not present in its slots).
// B3 (2026-09-01): ACTION is a TRAILING add — a legacy row reads '' and means
// 'set', the ordinary "write this punch" request. The only other value is
// 'resume' (reopen a clocked-out day). Back-compat like every other trailing
// column here (CN_HEADERS, FS_HEADERS, AmendsId).
// T3 (cycle 22): END_TIME is a second trailing add — a RESUME request's
// finish time. A resume reopens a day, and the rep cannot clock out of it live
// once that day has ended, so the finish rides the request: filed with Adjust →
// Clock Out while the resume is pending, written as the day's Clock Out when the
// resume is approved. HH:mm, a coerced column (g10) — read via normalizeTime_.
const PAR = { REQ_ID:0, EMP_ID:1, EMP_NAME:2, DATE:3, PUNCH_TYPE:4, REQ_TIME:5, REASON:6, STATUS:7, SUBMITTED_AT:8, ACTION:9, END_TIME:10 };
const PAR_HEADERS = ['ReqId','EmpId','EmpName','Date','PunchType','RequestedTime','Reason','Status','SubmittedAt','Action','EndTime'];
const PUNCH_ADJUST_BULK_MAX = 50;
// Cycle-11 L-11 — time-off date sanity horizon (see the submit paths).
const TIMEOFF_MAX_DAYS_AHEAD = 370;   // ~a year of planned leave + slop
const TIMEOFF_MAX_DAYS_BACK  = 90;    // retroactive filing window
let _adpSsMemo = null;
let _adpTzMemo = null;
// ── Host-sheet timezone for CN coercion recovery (Part A, operator 2026-08-27) ──
// A per-rep sheet whose LOCALE coerces a stored string interprets the digits in
// ITS OWN timezone, so recovery must format in that SAME tz or the digits shift
// by the tz delta. The live failure this closed: the operator's sheet (tz
// America/Chicago) coerced "…T14:16:xx" to 14:16 Chicago wall time, and
// recovery in the ADP tz (Asia/Kolkata) rendered it as 00:46 the NEXT day; a
// PH rep's DateLocal cell (midnight Asia/Manila) recovered in IST as 21:30 the
// PREVIOUS day, so their just-logged note vanished from the rolling stack and
// surfaced under yesterday in History. Recovering in the HOST sheet's own tz
// returns the as-written digits BY CONSTRUCTION for any sheet tz — a no-op on
// sheets pinned to the ADP tz (INV-110), and retroactively correct for every
// historical row on a drifted sheet (the stored strings were never wrong).
// "Last-opened wins" is safe because getCallNotesSheet_ is the single per-rep
// opener (the INV-167 boundary) and every cross-rep walk converts rows INLINE
// within its own rep's iteration — no deferred cross-rep conversion exists
// (verified across all callNoteRowToObject_ call sites). The NotesArchive
// readers reach the cold tab via sheet.getParent() off the same handle, so the
// memo covers them too.
let _cnHostTz = null;
const _cnHostTzById = {};
var _cdrColumnsValidated = false;
var _cdrColumnWarning = null;
var _cdrNameMapCache = null;
var _cdrNameMapExpiry = 0;
// H1: the Company Holidays tab, memoized per execution (the CacheService tier
// is inside getCdrCompanyHolidayRanges_); _resetCdrCaches_ clears it.
var _cdrHolidaysMemo = null;
// H2: the Dashboard Standards tab, memoized per execution likewise.
var _cdrStandardsMemo = null;
// Once-per-session like _cdrColumnsValidated (the validateCdrColumns_ pattern).
var _csrTransferValidated = false;
var _csrTransferWarning = null;
/** Intake volume per month (manager-gated, read-only, PHI-free — counts
 *  only). Sourced from the SUBMISSION tabs' Timestamp column (every send =
 *  one row), bounded tail per tab. Answers "average occurrences per month"
 *  with real monthly counts rather than a single averaged number. */
const INTAKE_VOLUME_MONTHS = 6;
const INTAKE_VOLUME_SCAN_MAX = 4000;
// ════════════════════════════════════════════════════════════════════════════
//  DASHBOARD METRICS (Time Clock → Dashboard)
//  Period-aggregated own + cohort-guarded team CDR for the Dashboard carousels.
//  Reuses the CDR layer (getCdrAgentMetrics_ / getCsrTransferPerRepDaily_) over a
//  SERVER-resolved period (Yesterday / MTD / YTD), so the 92-day getMyMetricsRange
//  cap (INV-129) doesn't apply — the period is server-controlled, not arbitrary
//  user input. Caller-scoped own; team is the whole-roster aggregate (the N=3
//  cohort hide was DROPPED for this card by operator decision 2026-08-06 —
//  INV-124's per-day My Stats series guard is unchanged). Result-cached per
//  (emp, period) like getMyMetrics.
// ════════════════════════════════════════════════════════════════════════════
var DASHBOARD_PERIOD_KEYS = ['yesterday', 'mtd', 'ytd'];
// Dashboard payload TTL (v4, operator 2026-08-18) — see the cacheKey comment
// in getDashboardMetrics for the staleness reasoning. Raised 1800 → 21600
// (the CacheService MAX) the same day, operator-approved: the CDR data will
// not change for the rest of the day once the daily import lands, and the
// day-scoped key still rolls the cache at the rep-local midnight. Worst case
// stays the documented trade: a load BEFORE the import pins the pre-import
// aggregate for up to 6h (the Metrics tabs keep their 5-min caches).
var DASHBOARD_CACHE_TTL = 21600;
var DASH_MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// ── Dashboard "Needs you" — one rep-callable aggregate of pending tasks ─────
// (design handoff PR 6, T1). The dashboard already pays ~3 RPCs for the
// carousels + 2 for the extras on every focus wake past the SWR window; five
// more per-source fetches would be felt on the Apps Script webview, so the
// client asks ONE question. Six sources, each try/catch'd INDIVIDUALLY: a
// source that could not be read is NAMED in `unavailable` so the client
// renders "couldn't check", never a confident zero (INV-187) — and a degraded
// round is never cached (INV-129). Operator decisions (2026-09-02, #3): the QA
// source is OMITTED (there is no ack on a QA review, and agents do not see the
// tool), Requests = dept requests open + incoming (what the extras card
// shows; a rep's own pending punch-edit already renders as the chip above the
// punch buttons and their pending PTO waits on the MANAGER), and signable docs
// are the sixth kind. Every route below names a REGISTERED TOOLS tab (pinned
// like safeWebAppUrl_'s keys); the notes route carries the CLK_NAV_HINT
// payload fileMissingCalls_ already speaks.
var PENDING_TASKS_CACHE_TTL = 120;         // seconds, per rep
var PENDING_TASKS_CACHE_PREFIX = 'pending_tasks_v1:';
var PENDING_TASKS_CAP = 30;                // items returned; `total` carries the pre-slice count (INV-169)
var PENDING_TASKS_KINDS = ['training', 'coaching', 'notes', 'requests', 'sched', 'docs'];
const INTAKE_PPD_SUB_HEADERS  = ['SubmissionId','Timestamp','RepId','RepName','PatientInfo','Language','AnswersJSON','Recommendations','Selections','Recipient','AmendsId'];
const INTAKE_ACCT_SUB_HEADERS = ['SubmissionId','Timestamp','RepId','RepName','PatientInfo','DOB','Language','AnswersJSON','Recipient','ImageCount','AmendsId'];
// ── F-27 (2026-09-18): the ENGLISH question banks, server-held ─────────────
// The email is ALWAYS English whatever language the form was completed in
// (g43), and until Batch 5 the server rendered whatever LABEL text the client
// sent beside each answer — the English rule was enforced on the client only,
// and a client that sent Spanish (or anything) labels put them in the Power
// dept's inbox. The server now builds the email rows from these banks + the
// client's ANSWERS (keyed by question number / form index) and ignores
// client-sent labels entirely. These three arrays and the notes pair are a
// BYTE-FOR-BYTE MIRROR of the client's `INTAKE_PPD_Q.EN` / `INTAKE_PMD_Q.EN` /
// `INTAKE_PAP_Q.EN` / `INTAKE_PPD_NOTES.EN` (script_intake.html) — a drift
// costs a wrong label in an email, never a refused send (g120), and the F-27
// pin holds them equal. Edit the client bank, then copy it here.
const INTAKE_PPD_Q_EN = [
    "PPD (English)", "", "", "MRADL",
    "1. Do you currently use a cane, walker, manual wheelchair, scooter, or PWC?",
    "2. Going to the restroom and using the toilet", "3. Preparing meals in the kitchen",
    "4. Getting fully dressed", "5. Grooming (fixing hair, shaving, etc.)",
    "6. Bathing (getting in & out of shower/tub, washing all areas)", "",
    "Extremity Strength", "7. Can you move both arms at all?",
    "8. Can you raise both arms straight out in front of you, as if pointing?",
    "9. Can you raise both hands straight above your head?", "10. Can you move your legs at all?",
    "11. While sitting, can you extend your legs straight out in front of you?",
    "12. Could you push an unlocked door open with your feet?",
    "13. Have you fallen, nearly fallen, or experienced dizziness in the past six months? If so, how many times?", "",
    "Consistent Pain", "14. Neck?", "15. Shoulder?", "16. Elbows?", "17. Arms?",
    "18. Hands?", "19. Back?", "20. Hips?", "21. Knees?", "22. Legs?", "23. Ankles?", "",
    "Additional Information", "24. Do you take pain medications (over the counter or prescribed)?",
    "25. Do you have consistent or frequent numbness/tingling in hands, feet or legs?",
    "26. Do you use caloric/nutritional supplements like Ensure or Boost?",
    "27. Do you ever have the need for incontinence supplies?",
    "28. Do you have diabetes?",
    "29. Do you have any peripheral vascular disease?",
    "30. Do you use intermittent catheters?",
    "31. Have you had a stroke in the past?",
    "        31a. Did it result in weakness or paralysis in either side?",
    "32. Do you have spasticity?",
    "33. History of pressure ulcers or “bedsores”?",
    "        33a. If so, where and do you have absent or impaired sensation in that area?",
    "34. Any amputations? If so, where and is it above or below the knee?",
    "35. Any curvature of the spine (like scoliosis or humpback)?",
    "36. Consistent swelling in feet, ankles, or legs?",
    "37. Height (inches):",
    "38. Weight (lbs):",
    "39. Live alone or w/ friends/family?",
    "39a. Does the patient live in a House, Apartment, or Mobile Home?",
    "40. Do you have a home health attendant at your home for a few hours per week?",
    "41. What diagnoses do you have that would qualify you for the PWC?",
    "42. Any heart or lung conditions not already mentioned?",
    "43. Any neurological conditions not already mentioned?",
    "44. Are you on Oxygen?",
    "45. Do you have arthritis? If so, where and what type (Rheumatoid, Osteo, Psoriatic)?",
];
const INTAKE_PPD_NOTES_EN = { title: 'Additional Notes', label: 'Additional notes (optional)' };
const INTAKE_PMD_Q_EN = [
    "Demographics", "Patient Full Name", "Patient Primary Contact Phone #", "Secondary Contact Ph#",
    "Patient Email Address", "DOB", "Home Address",
    "Insurance", "Primary Insurance & Member ID#", "Secondary Insurance & Member ID#", "SSN # (if insurance details N/A)",
    "Clinical Information", "PCP Name", "MDO Ph#", "MDO Fax#", "Height", "Weight (lbs)",
    "Currently used mobility devices", "Diagnoses", "Currently staying at Home or Facility?",
    "If in facility what is the approximate discharge date?",
    "Mobility Evaluation & Scheduling", "Already had a Power Mobility Evaluation in last 6 months?",
    "If so please provide appointment details",
    "Explained mobility evaluation with doctor is needed for insurance purposes and that we will send MDO paperwork to be filled out during the appointment to be sent back to us",
    "Permission to call & schedule Mobility Evaluation with MDO?", "ME Availability", "PPD Availability", "Other Notes",
];
const INTAKE_PAP_Q_EN = [
    "Demographics", "Patient Full Name", "Patient Primary Contact Phone #", "Secondary Contact Ph#", "Patient Email Address", "DOB", "Home Address",
    "Insurance", "Primary Insurance & Member ID#", "Secondary Insurance & Member ID#", "SSN # (if insurance details N/A)",
    "Clinical Information", "PCP Name", "MDO Ph#", "MDO Fax#", "MDO Address", "Height", "Weight (lbs)",
    "PAP Details", "Already have a CPAP?", "Make & Model of current CPAP (if applicable)?", "How long have you had the current CPAP (if applicable)?",
    "What kind of mask are you using (make/model/size)?", "Looking for Machine, PAP Supplies, or Both?", "Have you done a Sleep Study in the past?",
    "If so please provide Sleep Study details (approx. date & provider details)",
    "Informed that we will reach out to MDO for the information required by insurance, and work with both to process your order efficiently.", "Other Notes",
];
// Per-form structural layout (0-based FORM_RANGE row index → role). Ported from
// the bound tool's AC_CONFIG / PAP_CONFIG. The question LABELS come from the
// server-held English banks above since F-27 (they used to arrive from the
// client); these fixed structural rules stay server-side so styling can't be
// spoofed.
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
var _intakeSsMemo = null;
let _intakeOfferingsCache = null;
// ── Intake recommendation feedback (operator 2026-08-13) ─────────────────────
// The PPD/PMD/PAP emails carry a "Send feedback" button so the RECIPIENT (an
// internal agent — intakeResolveRecipient_ resolves from the roster) can flag
// a recommendation the engine got wrong, and that feedback lands back in the
// web app instead of a reply nobody sees. An email client can't host a live
// comment box (forms in email are stripped by most clients), so the button
// links to a tiny signed-in page served by doGet (?intakefb=…), the
// serveResolvePage_ pattern with a textarea. Rows are append-only in the
// Intake spreadsheet (feedback may reference the patient, so it stays in the
// PHI store — never the shared AuditLog).
const INTAKE_FEEDBACK_HEADERS = ['Timestamp', 'SubmissionId', 'FormType', 'FromEmail', 'FromName', 'Feedback'];
const INTAKE_FEEDBACK_MAX_CHARS = 4000;
const INTAKE_FEEDBACK_SCAN_MAX = 2000;   // bounded tail — feedback is recent-biased
const INTAKE_PPD_YESNO_QS = ['14','15','16','17','18','19','20','21','22','23','26','27','28','30','31','33','35','36','44'];
// M-5 (cycle 10) — intake PHI-store integrity helpers.
// The store append is deliberately best-effort AFTER a successful send (the
// email can't be unsent), but a failure must be LOUD, not a console.warn: the
// rep gets a storeWarning toast and the shared AuditLog gains a PHI-free
// IntakeStoreFail row (submissionId + type + trimmed error — the
// PersonalSheetSyncFail pattern) so the gap is investigable. Oversized
// payloads are rejected BEFORE the send so no email ever lacks a record.
const INTAKE_STORE_CELL_MAX = 45000;   // under the 50k Sheets cell limit (INV-96)
const INTAKE_FORM_TYPES_ = ['PPD', 'PMD', 'PAP'];
const INTAKE_LIST_CAP_ = 100;
/** Rep-facing READ-ONLY browse of the PMD Offerings catalog (cycle-18 batch 8).
 *
 *  WHY: the catalog is the clinical product list the PPD engine recommends
 *  FROM, and until now the only way to see what a HCPCS code means, what a
 *  chair's weight capacity is, or which brochure to send was to open the
 *  Intake SPREADSHEET — which also holds the PPD/PMD/PAP PHI submission tabs.
 *  So "what does K0861 support?" cost a rep a trip into a PHI store, or a
 *  message to a manager. This surfaces the same six columns the engine reads,
 *  and NOTHING else from that spreadsheet.
 *
 *  PHI-free by construction: `getIntakeOfferings_` reads only `Offerings!A2:F`
 *  (product data — the same rationale `intakeCatalogIssues_` records), so no
 *  submission tab is touched and no patient value can enter the payload.
 *
 *  Rep-callable (an enrolled employee, like every other Intake read) and
 *  strictly read-only. Payload-capped with the pre-slice `total` reported
 *  (INV-169) so a future catalog past the cap reads as capped, not as
 *  complete. A row with no HCPCS is dropped — the engine already treats it as
 *  inert (`hcpcsNum === 0`), so listing it would advertise a product the
 *  recommendation engine can never return. */
const INTAKE_OFFERINGS_LIST_CAP_ = 200;
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
const KB_CACHE_KEY = 'kb_tree_v2';   // v2 — items now carry `status` (#4 draft→publish)
const KB_CACHE_TTL = 300;
const KB_BODY_MAX = 49000; // under the 50k Sheets cell limit
// ── Section-aware search ──────────────────────────────────────────────────
// Results are heading-delimited CHUNKS of articles (read inline, jump to the
// section in the full doc), not just doc titles — multiple chunks from
// multiple docs surface side by side. Embeds have no stored content, so they
// match on title only (another native-first nudge).
const KB_SEARCH_MAX_RESULTS = 20;
const KB_SEARCH_MAX_PER_ITEM = 3;
/** A fenced block is atomic, so a chunk may exceed KB_CHUNK_MAX_CHARS by up
 *  to this factor to keep one whole rather than emit half of it. */
const KB_CHUNK_FENCE_OVERAGE = 4;
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
// ── Usage feedback loop (drawer + Reference reader) ───────────────────────
// Append-only KbViews tab in the KB spreadsheet: one tiny PHI-free row per
// article/embed open (timestamp, itemId, repId, context). Written
// fire-and-forget from the client; aggregated on demand for managers so the
// "most referenced during calls" signal drives conversion/curation priority.
const KB_VIEWS_TAB = 'KbViews';
const KB_VIEWS_HEADERS = ['Timestamp', 'ItemId', 'RepId', 'Context'];
const KB_VIEWS_MAX_SCAN = 4000;   // bounded tail scan, INV-13 spirit
// F18: review-due payload cap, reported with the pre-slice total so a long
// backlog does not render as "exactly 50 items are due".
const KB_REVIEW_DUE_CAP = 50;
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
// ── Insurance payor lookup (operator 2026-08-25 — batch 3) ──────────────────
// A ~1,000-row payor/HCPCS acceptance sheet lives with another dept and was
// too slow to reference mid-call. The operator's cleaned CSV imports into an
// `InsurancePayors` tab in the KB spreadsheet (PHI-free by policy — plan
// names + acceptance criteria only, never a patient), and this endpoint is a
// DETERMINISTIC search over it: a wrong in/out-of-network answer is a billing
// error, and deterministic matching's failure mode is "no match" (visible),
// not a confident wrong answer. Reps read via the server and never open the
// sheet (the KB posture).
//
// Bounded read (the INV-46 family): the NAME column is scanned for scoring;
// only the top-N matched rows are fetched full-width. Column semantics are
// discovered BY HEADER NAME (the csrTransferQueueColumns_ precedent — the
// operator's other CSV pages vary in shape, so fixed positions would drift):
// waystar/network/qualif/reimbur match the known fields; EVERY other
// non-empty header is a generic attribute column (the per-HCPCS acceptance
// grid, the Hawaii marker, whatever a future import adds) passed through
// VERBATIM — the operator rule: unknown tokens render as-is in neutral tone,
// never guessed at.
// ── OOP pricing lookup (operator 2026-09-16) ────────────────────────────────
// Out-of-pocket prices for items a patient is most likely to order OOP. The
// operator maintains them in a tab of the KB spreadsheet, read LIVE on every
// lookup — NOT imported the way the payor table is.
//
// WHY LIVE, and it is the whole design: the payor table is ADVISORY (an
// unlisted plan falls through to the TRY rules, and a stale copy costs a
// re-check), but a rep QUOTES an OOP price and TAKES PAYMENT on that call.
// Under an import model the app's copy lags the operator's sheet by however
// long since the last upload, and the failure is a rep collecting a superseded
// price — discovered from the customer, never from the app.
//
// Columns are discovered BY HEADER NAME, not by position (the
// searchInsurancePayors discipline): the operator owns the file and may
// reorder it. The FIRST column is the item name the search scans. Anything
// the role matcher does not recognise rides along as a verbatim attribute —
// unknown tokens render as-is, never guessed at.
// WHERE IT LIVES (operator 2026-09-16, revised same day): a NAMED TAB in the
// KB spreadsheet, not a store of its own. `InsurancePayors` is already an
// operator-imported, read-only lookup table in that store — same class
// (PHI-free by policy), same maintainer, same access pattern, and the OOP
// search literally reuses the payor scorer. A second spreadsheet bought a
// Script Property and a Storage Health row and nothing else.
//
// It is NOT in the Intake store, which was the other candidate: Intake is PHI
// and the app WRITES to it, so pricing there would mean anyone maintaining
// prices needs edit access to patient submissions.
const OOP_PRICING_TAB = 'OopPricing';
const OOP_MAX_ROWS = 5000;      // bounded tail — the INV-46 family
const OOP_TOP = 8;              // top-N fetched full-width; ties ride along so the REP judges
// NO result cache, deliberately — searchInsurancePayors has none either, and
// here a cache is the staleness this whole design exists to remove. The plan
// said "cache SHORT"; the honest answer on a price someone collects on is
// "do not cache at all". One openById per lookup is what every other resolver
// already costs.
// OOP-B — the most price lines one external email may carry. A quote is a
// COMMITMENT (the rep takes payment on that call), so every inserted line is
// re-verified against the live sheet at send time and every one of them lands
// in the audit row. The cap bounds both: the verification read and the audit
// details string. Ten is far above any real quote and well under either limit.
const OOP_QUOTE_MAX = 10;

// ── ELIG (operator 2026-09-16) — area eligibility off the same column ───────
// The OOP sheet's "Area Eligibility" column states the rule for an order going
// THROUGH INSURANCE. Paying out of pocket TRANSFORMS it, and the transform is
// not a lookup table — it is one rule that keeps working on values nobody has
// written yet:
//
//   A restriction that exists because of WHO IS PAYING lifts when nobody is
//   billing insurance. A restriction that exists because of HOW IT PHYSICALLY
//   GETS THERE does not.
//
// A state limit is licensure and network: it lifts. A delivery radius is a van:
// it does not. So `TX` means Texas through insurance and the whole US out of
// pocket, while `100 miles of Dallas` means 100 miles either way. Both verdicts
// are shown, labelled — a rep mid-call is usually deciding BETWEEN the two, and
// a payment-method toggle would make them ask the question twice.
//
// UNKNOWN never lifts. A value the parser cannot read might be a delivery
// constraint, and guessing in the permissive direction is the one guess that
// puts an undeliverable order in the system.
const OOP_ELIG_MAX_ITEMS = 60;      // items returned by one eligibility check
// Straight-line distance is never LONGER than the drive, so a radius verdict of
// NO is certain while a YES near the boundary is provisional. This is the band
// (as a fraction of the limit) inside which a YES says so rather than implying
// a precision the measurement does not have.
const OOP_ELIG_NEAR_BAND = 0.8;
// The delivery-reach table, a NAMED TAB beside the pricing one. It carries TWO
// row kinds under a `Type` column, because they answer the same question from
// two directions:
//   warehouse | Name + Address  → the vocabulary the radius grammar matches,
//                                 and the address that gets geocoded
//   city      | Name + State + Accepts → places we deliver POVs/scooters to
//
// A SHEET, not a Script Property, and the reason is a failure mode rather than
// convenience: a malformed JSON property fell back to a CONFIG seed of bare
// city names, which geocode to city CENTRES — so a warehouse twenty miles out
// of town made every near-boundary radius answer wrong by up to twenty miles,
// silently. That is the plausible-substitute failure (g114) the radius verdict
// exists to avoid. **There is deliberately NO SEED and NO FALLBACK:** a missing
// or empty tab makes radius rules read UNKNOWN and says so in the diagnostics.
const LOCATION_ACCEPTANCE_TAB = 'LocationAcceptance';
const LOC_MAX_ROWS = 2000;      // bounded tail — the INV-46 family
// Two-letter codes the STATES grammar accepts. The 50 states plus DC and PR —
// a token outside this list is not a state code, and a value made only of
// tokens outside it parses as UNKNOWN rather than as a state rule.
const US_STATE_CODES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC','PR',
];
// K4 (cycle 22): the FULL names a LocationAcceptance State cell may carry
// instead of a code ("Texas"). `locStateCode_` reads either; anything else is
// UNREADABLE, never a mismatch — a State cell of "Texas" used to compare as
// unequal to the geocoder's "TX" and turned a listed city into a confident NO.
const US_STATE_NAMES = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district of columbia': 'DC', 'washington dc': 'DC', 'puerto rico': 'PR',
};
const INS_PAYOR_TAB = 'InsurancePayors';
const INS_PAYOR_TOP = 8;
const INS_PAYOR_MAX_ROWS = 5000;
// ════════════════════════════════════════════════════════════════════════════
//  REFERENCE DATA TABLES — operator-uploaded CSV → a NAMED KB sheet tab
//  (operator 2026-08-25)
//
//  The insurance lookup queries a sheet TAB, not an article: it has its own
//  search endpoint, tone legend and column semantics, so the payor CSV is a
//  QUERYABLE DATASET, not prose. Updating it meant File → Import → "Insert new
//  sheet(s)" → rename the tab by hand, every time — the one manual step left in
//  that feature. This replaces it with an upload.
//
//  THE ALLOWLIST IS THE SECURITY BOUNDARY. `KB_DATA_TABLES` names the only tabs
//  an upload may write, and each entry says what the app expects of the file.
//  Without it this would be an arbitrary sheet-writer aimed at the KB store —
//  an admin-gated endpoint that can overwrite ANY tab is a different (and much
//  worse) thing than one that can refresh a known dataset. A tab not in the map
//  is refused BY NAME, and adding one is a deliberate code change beside the
//  reader that consumes it.
const KB_DATA_TABLES = {
  InsurancePayors: {
    tab: INS_PAYOR_TAB,
    label: 'Insurance payor acceptance',
    describe: 'Payor / plan rows behind the Reference insurance lookup',
    // The FIRST column is the name column searchInsurancePayors scans — a CSV
    // whose first column is something else would silently search the wrong
    // field and return nothing for every real query, which reads as "we do not
    // take that plan". Warn, do not block: the operator owns the source file
    // and may legitimately re-title the column.
    // Measured against the operator's real export, whose first column is
    // titled 'Insurance' — a warning that fires on the actual file is a
    // false alarm, and false alarms are how a check stops being read
    // (INV-186 applied to a one-off validator).
    nameHeader: /payor|plan|name|insur/i,
    minCols: 2,
  },
};
const KB_DATA_TABLE_MAX_ROWS = 5000;
const KB_DATA_TABLE_MAX_COLS = 60;
const KB_DATA_TABLE_MAX_CHARS = 6000000;   // ~4.5MB of CSV after base64 decode
// ── Reference comments, Phase A (pilot round 3 #6) ──────────────────────────
// A visible per-article comment thread — the DISCUSSION complement to the
// private kbFlagItem signal (INV-139). Append-only `KbComments` tab in the KB
// spreadsheet (PHI-free-by-policy like every KB store — the UI carries the
// reminder); moderation is SOFT-delete (Status='deleted', the append-only
// posture — rows are never removed), author-or-manager. Phase A surfaces
// comments in the Reference TAB reader only — the Ctrl/⌘+K drawer is the
// mid-call surface and stays comment-free (the INV-139 drawer-parity
// follow-on shape; add it there only if reps ask).
const KB_COMMENTS_TAB = 'KbComments';
const KB_COMMENTS_HEADERS = ['CommentId', 'ItemId', 'EmpId', 'EmpName', 'Text', 'AtMs', 'Status'];
const KBC = { ID: 0, ITEM_ID: 1, EMP_ID: 2, EMP_NAME: 3, TEXT: 4, AT_MS: 5, STATUS: 6 };
const KB_COMMENT_MAX_CHARS = 2000;
const KB_COMMENTS_SCAN = 2000;      // bounded tail — reads stay cheap as the tab grows
const KB_COMMENTS_LIST_CAP = 100;   // payload cap; pre-slice total reported (INV-169)
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
// --- Drive capability (operator 2026-09-09) --------------------------------
// Every Drive call in this project runs on ONE grant: the web app is
// executeAs USER_DEPLOYING, so the token is the DEPLOYING account's. A
// `clasp push` + New version NEVER re-prompts for consent, so a deploy that
// widens the auto-detected scope set leaves that grant short and every Drive
// call fails with Apps Script's missing-SCOPE refusal — raised by the runtime
// before any request reaches Drive, which is why the execution log carries
// nothing further. Nothing surfaced it: the editor suite makes ZERO DriveApp
// calls, so a green runAllTests says nothing about Drive.
const DRIVE_WRITE_SCOPE = 'https://www.googleapis.com/auth/drive';
const DRIVE_ACCESS_CACHE_KEY = 'drive_access_v1';
const DRIVE_ACCESS_CACHE_SEC = 300;
const DRIVE_REAUTH_HINT = 'the DEPLOYING account must re-authorize — open the Apps Script editor, run any function, and accept the Drive permission (a clasp push + New version never re-prompts). If Google refuses the consent screen, the scope is blocked by Workspace admin policy.';
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
// ── Article-image fallback: serve KB Images through the app ─────────────────
// (Operator 2026-08-13.) The Drive thumbnail URLs kbMd_ renders load only for
// accounts the KB Images folder is visible to — and on this domain Workspace
// policy blocks the domain-link sharing getOrCreateKbImagesFolder_ attempts,
// so reps see the alt text plus a Workspace "blocked" page behind the anchor.
// The web app runs as the DEPLOYER, who owns the folder — so the server can
// read the bytes any rep's browser cannot. The client's onerror fallback
// (kb/script_kb.html) swaps a blocked thumbnail <img> for a data URL fetched
// here. Progressive enhancement: when the thumbnail loads (folder shared, or
// policy relaxed), this endpoint is never called.
const KB_IMG_FETCH_MAX_BYTES = 4 * 1024 * 1024;   // response cap — degrade past it
// ── Warehouse-distance lookups (` ```map ` KB block — Tier A, no billing) ────
// (Operator 2026-08-13: "don't want any cost/billing for this".) Apps Script's
// BUILT-IN Maps.newGeocoder() is the whole geo stack — free, no API key, no
// billing account, bounded by a daily courtesy quota. The endpoint geocodes
// the operator's warehouse addresses (cached PERMANENTLY in a Script Property
// — static addresses, and the cache keeps steady-state quota use at ~ONE
// geocode per lookup) plus the rep's query, and returns straight-line miles
// per warehouse. THE QUERY IS NEVER PERSISTED — no cache entry, no audit row,
// no log line: a looked-up address may be a patient's (the client UI asks for
// a ZIP for exactly that reason). Straight-line is stated as such; the
// client's Directions link is the honest path to a drive figure (INV-187).
const KB_MAP_MAX_WH = 20;
const KB_MAP_QUERY_MAX = 200;
const KB_MAP_GEOCODE_CACHE_PROP = 'KB_MAP_GEOCODE_CACHE';
const KB_MAP_GEOCODE_CACHE_MAX = 200;   // hygiene bound — the property must stay small
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
const KB_DOC_HEADING_PREFIX = {
  TITLE: '# ', HEADING1: '# ', HEADING2: '## ', HEADING3: '### ',
  HEADING4: '#### ', HEADING5: '##### ', HEADING6: '###### ', SUBTITLE: '## ',
};
/** Manager-gated, READ-ONLY converter endpoint. Accepts { itemId } (an
 *  existing doc-embed KB item — title/department come back for the editor) or
 *  { driveUrl } (editor embed mode, pre-save). Opens the Doc with the
 *  DEPLOYER's access (same trust model as embedding it) and returns
 *  { markdown, warnings, docTitle, title, department }. Never writes — the
 *  manager reviews in the editor and saves via the existing kbSaveItem,
 *  which is what flips the row to type=article in place. */
// ── Sheet → article conversion (operator 2026-08-11) ───────────────────────
// A Drive SHEET embed is the weakest item type in the KB: searchReference
// treats every embed as a title-only hit, and the Ctrl/⌘+K drawer can't host
// an iframe at 400px, so a roster embedded as a sheet is invisible at exactly
// the moment a rep needs it mid-call. Converting it to a native article makes
// it full-text searchable, readable in the drawer, and independent of whether
// each rep personally has Drive access to the file.
//
// Bounds — a spreadsheet's used range can be enormous, and this runs behind an
// admin click, not a poll. Truncation is REPORTED, never silent (INV-169).
const KB_SHEET_MAX_ROWS = 400;
const KB_SHEET_MAX_COLS = 30;
// ════════════════════════════════════════════════════════════════════════════
//  KB FILE INGEST — drag/drop or pick a LOCAL file in the editor
//  (operator 2026-08-25)
//
//  Until now a document could only enter Reference two ways: paste markdown,
//  or put the file in Drive by hand and paste its share URL. This takes the
//  file directly. It is READ-ONLY with respect to the KB sheet — like the two
//  converters (INV-115), it returns content for REVIEW and the normal
//  kbSaveItem persists it.
//
//  WHAT HAPPENS DEPENDS ON THE FILE, and the split is a capability fact, not a
//  preference:
//   • .md/.markdown/.txt — the bytes ARE the article body. No Drive round trip.
//   • .csv — parsed and handed to the PRODUCTION sheet converter
//     (kbSheetGridToMarkdown_), so a CSV becomes the same GFM table an
//     imported Sheet would. No second markdown generator to drift.
//   • anything else (.docx/.pdf/.xlsx/…) — Apps Script cannot parse these
//     natively. The file is uploaded to the KB Drive folder and, when the
//     format is convertible, we ASK DRIVE to convert it (see below) and run
//     the existing converter over the result. If that is refused, the file
//     still lands in Drive and comes back as an EMBED — the thing the
//     operator would have created by hand — with the reason NAMED (INV-187).
//
//  THE CONVERSION DELIBERATELY DOES NOT USE THE ADVANCED DRIVE SERVICE. That
//  would mean declaring a dependency in appsscript.json, and if the domain
//  restricts the API the whole project's authorization is at risk — a bad
//  trade for a convenience. Instead we call the Drive REST endpoint with the
//  token the script ALREADY holds (DriveApp is authorized today for the KB
//  images folder — same scope), inside a try/catch that degrades to the embed
//  path. Nothing new is declared and nothing new must be granted.
const KB_INGEST_MAX_CHARS = 6000000;          // ~4.5MB after base64 decode
const KB_INGEST_TEXT_EXT = /\.(md|markdown|txt|text)$/i;
const KB_INGEST_CSV_EXT = /\.csv$/i;
// Formats Drive can convert to a native Google file. Anything outside this map
// goes straight to the embed path — we never pretend a .pdf became an article.
const KB_INGEST_CONVERT = {
  docx: { mime: 'application/vnd.google-apps.document',    kind: 'doc' },
  doc:  { mime: 'application/vnd.google-apps.document',    kind: 'doc' },
  rtf:  { mime: 'application/vnd.google-apps.document',    kind: 'doc' },
  odt:  { mime: 'application/vnd.google-apps.document',    kind: 'doc' },
  xlsx: { mime: 'application/vnd.google-apps.spreadsheet', kind: 'sheet' },
  xls:  { mime: 'application/vnd.google-apps.spreadsheet', kind: 'sheet' },
  ods:  { mime: 'application/vnd.google-apps.spreadsheet', kind: 'sheet' },
};
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
// Cycle-9 L-21 — tail bounds for the two append-only-forever training tabs
// (they sit on hot paths: every getMyTraining open, the dashboard, every quiz
// submit, the daily overdue digest). Completions are STATE (complete = the
// newest row strictly after the assignment, INV-120), so their cap is a
// deliberately-generous quota backstop, not an analytics window: a completion
// older than the newest 10,000 completion rows would read as Pending again —
// at realistic volume (tens of reps × dozens of items × annual re-certs)
// that horizon is decades out. Attempts are display/analytics only (the
// pass→completion write checks completions, never attempts), so they take
// the standard 4,000 KbViews-style window.
const TRAIN_COMPLETE_MAX_SCAN = 10000;
const TRAIN_ATTEMPT_MAX_SCAN = 4000;
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
/** Content hash — freezes what was issued (body+title+type+empId, + the v2
 *  fillable-field SCHEMA when present). `fieldsJson` is appended ONLY when
 *  non-empty so legacy 4-arg callers / fieldless rows hash identically to
 *  before (back-compat — old stored hashes stay valid). Callers MUST pass the
 *  RAW stored FieldsJson cell string (not a re-serialized object) so recompute
 *  is byte-stable. */
// C13 (batch L) — NEW hashes join fields with a '\u0000' delimiter (the
// computeFormSubmissionHash_ discipline): the old ' ' join was field-boundary
// ambiguous, since titles/bodies themselves contain spaces. Legacy stored
// hashes keep validating via DUAL-VERIFY — every recompute site tries the
// NUL form first, then the legacy space form (EMPDOC_HASH_DELIM_LEGACY),
// through the *HashMatches_ helpers below. The conditional trailing append
// (INV-135 back-compat) is preserved unchanged in both forms.
var EMPDOC_HASH_DELIM_LEGACY = ' ';
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
// Design handoff PR 4 (2026-09-02): FIVE more trailing columns, same
// self-healing back-compat — RepResponse (the rep's optional reply on ack,
// K2), FollowUpAt (a calendar DATE for the 1-on-1 — "Revisit on", K10),
// NudgedAt (the once-per-day reminder stamp, K11), NoteDate (the linked call
// note's DateLocal — the drill-through is date-keyed, so the id alone could
// never open it, K5) and QaFileId (the QA recording's Drive id, K13). All of
// them stay in the HR store; none reaches the shared AuditLog.
const COACH_HEADERS = ['CoachId','EmpId','EmpName','PatientTRX','Severity','WhatHappened','WhatShould','NoteId','Status','CreatedBy','CreatedAt','AcknowledgedAt','AckBy','VoidReason','RepResponse','FollowUpAt','NudgedAt','NoteDate','QaFileId'];
const CO = { COACH_ID:0, EMP_ID:1, EMP_NAME:2, PATIENT_TRX:3, SEVERITY:4, WHAT_HAPPENED:5, WHAT_SHOULD:6, NOTE_ID:7, STATUS:8, CREATED_BY:9, CREATED_AT:10, ACK_AT:11, ACK_BY:12, VOID_REASON:13, REP_RESPONSE:14, FOLLOW_UP_AT:15, NUDGED_AT:16, NOTE_DATE:17, QA_FILE_ID:18 };
const COACH_SEVERITIES = ['praise','minor','major','critical'];
// K4 — DISPLAY labels only. The stored enum is untouched (`major` stays
// `major` in every row, every audit line, `coachSevTone_` and the analytics
// keys); the word the UI shows is "Moderate". Mirrored byte-for-byte by the
// client's COACH_SEV_LABELS (a MIRROR_INDEX entry) so the emails and the cards
// cannot name one severity two ways.
const COACH_SEV_LABELS = { praise: 'Praise', minor: 'Minor', major: 'Moderate', critical: 'Critical' };
const COACH_TEXT_MAX = 4000;
const COACH_TRX_MAX = 200;
const COACH_RESPONSE_MAX = 2000;
const COACH_VOIDED_CAP = 50;
const QA_RECORDINGS_TAB = 'QaRecordings';
// Phase 2 added the trailing Agent column (which agent the call belongs to —
// feeds the per-agent stats); Phase 3 added SharedMs (the explicit
// release-to-agent stamp — 0/blank = not shared). Both extended IN PLACE
// rather than self-healed: the QA module is merged but NOT deployed and
// QA_SS_ID is unset everywhere, so no QaRecordings tab exists to migrate.
// Design handoff PR 5 (2026-09-02) added DurationSec (written back once by the
// client on loadedmetadata — the queue's Length column) and SkipReason (the
// free-text reason a recording was skipped; plain-text-pinned). These two
// self-heal: getOrCreateQaSheet_ extends a short header in place.
// F-16 (2026-09-18): the trailing AgentId column — the ROSTER ID resolved when
// the reviewer attributes a recording (qaSetRecordingAgent), so the agent-
// facing reads scope by id rather than by a free-text name that any two roster
// rows could share. A legacy row (blank AgentId) still matches by name, but
// ONLY when that name is unique on the roster. Header self-heals (PR 5).
const QA_RECORDINGS_HEADERS = ['FileId', 'Name', 'SizeBytes', 'MimeType', 'DriveCreatedMs', 'AddedMs', 'Status', 'Assignee', 'StatusMs', 'Url', 'Agent', 'SharedMs', 'DurationSec', 'SkipReason', 'AgentId'];
const QAR = { FILE_ID: 0, NAME: 1, SIZE: 2, MIME: 3, CREATED_MS: 4, ADDED_MS: 5, STATUS: 6, ASSIGNEE: 7, STATUS_MS: 8, URL: 9, AGENT: 10, SHARED_MS: 11, DURATION_SEC: 12, SKIP_REASON: 13, AGENT_ID: 14 };
// The PLAIN-TEXT ('@') columns of each QA tab — ONE list per tab, read both by
// getOrCreateQaSheet_ (which formats them) and by every writer into them
// (cycle 22 S2: a '@' cell takes its value literally, so those writers skip
// sheetSafe_'s apostrophe and re-assert the format instead).
const QA_RECORDINGS_TEXT_IDX = [QAR.FILE_ID, QAR.NAME, QAR.AGENT, QAR.SKIP_REASON, QAR.AGENT_ID];
const QA_SKIP_REASON_MAX = 500;
const QA_DURATION_MAX_SEC = 86400;
// Q4 — audit-period exemptions (operator decision 6): a manager grants an
// employee a pass for ONE period; latest row per (name, period) wins.
const QA_EXEMPTIONS_TAB = 'QaExemptions';
const QA_EXEMPTIONS_HEADERS = ['EmpName', 'Period', 'GrantedBy', 'GrantedMs', 'Active'];
const QAE = { EMP_NAME: 0, PERIOD: 1, GRANTED_BY: 2, GRANTED_MS: 3, ACTIVE: 4 };
const QA_EXEMPTIONS_TEXT_IDX = [QAE.EMP_NAME, QAE.PERIOD, QAE.GRANTED_BY];
const QA_EXEMPTIONS_SCAN = 2000;
const QA_EXEMPT_AVG_MIN = 4.5;        // eligibility: avg ≥ 4.5 this period AND last
const QA_EXEMPT_CRIT_MIN = 4;         // eligibility: no criterion under 4 in either period
const QA_MY_REVIEWS_CAP = 50;         // agent-facing list cap (newest shared first)
const QA_COMMENTS_TAB = 'QaComments';
const QA_COMMENTS_HEADERS = ['CommentId', 'FileId', 'EmpId', 'EmpName', 'AtSec', 'Text', 'CreatedMs', 'Status'];
const QAC = { ID: 0, FILE_ID: 1, EMP_ID: 2, EMP_NAME: 3, AT_SEC: 4, TEXT: 5, CREATED_MS: 6, STATUS: 7 };
const QA_COMMENTS_TEXT_IDX = [QAC.TEXT];
// Phase 2 — structured scorecards (append-only; a re-score by the same
// reviewer appends a NEW row and the latest per (recording, reviewer) wins,
// so a mis-entry is corrected by re-scoring, never by editing a review row).
const QA_SCORECARDS_TAB = 'QaScorecards';
const QA_SCORECARDS_HEADERS = ['ScorecardId', 'FileId', 'ReviewerEmpId', 'ReviewerName', 'RatingsJson', 'Notes', 'CreatedMs'];
const QSC = { ID: 0, FILE_ID: 1, EMP_ID: 2, EMP_NAME: 3, RATINGS: 4, NOTES: 5, CREATED_MS: 6 };
const QA_SCORECARDS_TEXT_IDX = [QSC.NOTES];
const QA_SCORECARDS_SCAN = 4000;      // bounded tail over QaScorecards
const QA_SCORECARD_NOTES_MAX = 2000;
// Rubric criterion TYPES (operator 2026-09-04 — the QA Log round). `scale` is
// the 1–5 rating every criterion was until now; `check` is a Yes/No; `choice`
// is a dropdown over operator-defined options. THE STORAGE RULE THAT KEEPS
// EVERY NUMERIC FOLD TYPE-BLIND: a non-scale answer is stored as a NON-NUMERIC
// string ('yes'/'no', or the option text — which the criteria editor refuses
// when it is a bare number), so qaCardStats_ / qaStatsAggregate_ /
// qaCalibration_ / the coverage join keep averaging exactly the 1–5 values
// they always did without knowing a criterion's type. The canonical criterion
// shape carries `type` ONLY when it is not `scale` (and `options` only for
// `choice`), so the CONFIG seed, every stored property blob and the
// save-the-seed-deletes-the-property rule stay byte-identical.
const QA_CRITERION_TYPES = ['scale', 'check', 'choice'];
const QA_CHOICE_OPTIONS_MIN = 2;
const QA_CHOICE_OPTIONS_MAX = 12;
const QA_CHOICE_OPTION_MAX_CHARS = 40;
const QA_CHECK_YES = 'yes';
const QA_CHECK_NO = 'no';
// QA Log (operator 2026-09-04): the reviewer-centred ledger over the SAME
// scorecard store — one entry per recording audited, never a second table.
const QA_LOG_CAP = 300;               // payload cap; pre-slice total reported (INV-169)
const QA_LOG_MAX_SPAN_DAYS = 92;      // the QTR preset fits
const QA_LOG_DEFAULT_DAYS = 30;
const QA_LOG_PENDING_CAP = 50;        // "Log an audit" picker — the caller's open assignments
const QA_MANUAL_ID_PREFIX = 'manual-';   // a recording-less audit's synthetic FileId (never a Drive id)
const QA_MANUAL_LABEL_MAX = 120;
// The scorecard criteria SEED — Script Property QA_SCORECARD_CRITERIA
// (JSON [{key,label}], sanitize-on-read via qaCriteriaSanitize_) overrides
// without a redeploy. Keys ride stored RatingsJson, so renaming a key orphans
// old ratings from that column (they still count toward each card's own
// average) — prefer adding/removing criteria over renaming.
const QA_SCORECARD_CRITERIA = [
  { key: 'greeting',      label: 'Greeting & opening' },
  { key: 'communication', label: 'Communication & tone' },
  { key: 'accuracy',      label: 'Accuracy & process' },
  { key: 'resolution',    label: 'Resolution & next steps' },
  { key: 'compliance',    label: 'Compliance (verification, disclosures)' },
];
const QA_STATUSES = ['new', 'in_review', 'done', 'skipped'];
const QA_LIST_SCAN = 2000;            // bounded tail over QaRecordings
const QA_LIST_CAP = 200;              // payload cap; pre-slice total reported (INV-169)
const QA_COMMENTS_SCAN = 4000;        // bounded tail over QaComments
const QA_COMMENT_MAX_CHARS = 2000;
const QA_COMMENT_MAX_AT_SEC = 86400;  // sanity bound on the timestamp anchor
const QA_SYNC_MAX_FILES = 500;        // folder files SCANNED per sync run; truncated reported
// D3 (cycle 22) — the resume point of a capped sync: {folderId, token}. Auto-managed;
// cleared by a completed walk. Delete it to make the next sync start from the top.
const QA_SYNC_TOKEN_PROP = 'QA_SYNC_CONTINUATION';
// 3 MB raw per chunk (~4 MB base64 on the wire) — a 15-min ~64kbps MP3 is
// 2-3 chunks. DriveApp has no ranged reads, so each chunk call re-reads the
// blob; the size cap bounds that.
const QA_AUDIO_CHUNK_BYTES = 3145728;
const QA_AUDIO_MAX_BYTES = 41943040;  // 40 MB — over it, the client offers the Drive link instead
