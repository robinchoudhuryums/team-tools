// ── VERBATIM copies from web-app/Code.js — DO NOT EDIT BY HAND ──────────────
// A fixture that reimplements server logic drifts silently and produces a
// screenshot the server could not have produced (see README). These two are
// pinned byte-identical to Code.js by the F4 mirror test in test/client/run.js.
const CDR_QUEUE_UNGROUPED = 'Ungrouped';
const MOCK_CDR_QUEUE_GROUPS = {
    'Sales':            ['A_Q_Sales', 'A_Q_PAP', 'A_Q_Sales_MWC'],
    'Customer Success': ['A_Q_CSR', 'A_Q_Intake', 'Backup CSR', 'A_Q_Spanish'],
    'Field Operations': ['A_Q_FieldOps', 'A_Q_FieldOps_Power'],
    'Power':            ['A_Q_PowerChairs', 'A_Q_PAK', 'A_Q_BackUp_Power'],
};
function groupQueueRows_(queueRows, groups) {
  var rows = queueRows || [];
  var map = groups || {};
  var owner = {};
  Object.keys(map).forEach(function (g) {
    map[g].forEach(function (q) { if (!(q in owner)) owner[q] = g; });
  });
  var acc = {}, order = [];
  rows.forEach(function (r) {
    var g = owner[r.queue] || CDR_QUEUE_UNGROUPED;
    if (!acc[g]) { acc[g] = { group: g, transferred: 0, reps: 0, queues: [] }; order.push(g); }
    acc[g].transferred += (r.transferred || 0);
    acc[g].reps = Math.max(acc[g].reps, r.reps || 0);   // see below
    acc[g].queues.push({ queue: r.queue, transferred: r.transferred || 0, reps: r.reps || 0 });
  });
  // `reps` per queue is a COUNT, not a roster, so a true union is not
  // recoverable here — max() is the tightest correct LOWER bound (the group has
  // at least as many reps as its busiest queue). Labelled as such in the UI so
  // it is never read as a total.
  return order.map(function (g) {
    var e = acc[g];
    e.queues.sort(function (a, b) { return b.transferred - a.transferred; });
    return e;
  }).sort(function (a, b) {
    // Ungrouped always sorts last, whatever its volume — it is a gap to close,
    // not a department to compare against.
    if (a.group === CDR_QUEUE_UNGROUPED) return 1;
    if (b.group === CDR_QUEUE_UNGROUPED) return -1;
    return b.transferred - a.transferred;
  });
}
function cnNoteCoverage_(noteCount, answeredCalls) {
  return (answeredCalls && answeredCalls > 0)
    ? Math.round((noteCount / answeredCalls) * 100) : null;
}
// ── end verbatim copies ─────────────────────────────────────────────────────

// google.script.run mock + fixtures for the visual audit. Unknown endpoints
// resolve through the failure handler and are logged to window.__MISSING__.
(function () {
  var todayIso = new Date().toISOString().slice(0, 10);
  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
  function ts(dIso, hms) { return dIso + 'T' + hms; }

  function note(i, over) {
    return Object.assign({
      noteId: 'note-' + i, timestamp: ts(todayIso, String(9 + i).padStart(2, '0') + ':1' + i + ':00'),
      dateLocal: todayIso, callback: '(555) 123-456' + i, caller: ['Maria Lopez', 'John Carter', 'Priya Shah'][i % 3],
      relationship: ['Patient', 'Caregiver', 'Provider office'][i % 3],
      patientAndTrx: 'TRX-10' + i + ' · P. Sample', issue: 'Asking about resupply timing for CPAP masks and when the next shipment goes out.',
      transferredTo: i === 1 ? 'Billing' : '', resolution: 'Confirmed the order ships Friday; updated the callback number on file.',
      flagType: i === 0 ? 'action' : (i === 1 ? 'training' : ''), resolved: false,
      emailedAt: i === 2 ? ts(todayIso, '10:44:12') : '', emailDepartments: i === 2 ? 'Shipping' : '',
      subformData: { flags: i === 0 ? ['action'] : [], tags: i === 0 ? ['resupply'] : [], trainingQuestion: i === 1 ? 'Should we escalate mask-fit questions to clinical?' : '' },
    }, over || {});
  }

  var kpis = { totalRung: 46, totalAnswered: 41, totalMissed: 5, pctAnswered: 89.1, tttFormatted: '3:12:44', attFormatted: '0:04:41', tttSeconds: 11564, attSeconds: 281 };
  function trend30(own) {
    var out = [];
    for (var i = 29; i >= 0; i--) out.push({ date: daysAgo(i), pctAnswered: 80 + (i * 7) % 15, answered: 30 + (i * 3) % 12, missed: (i * 2) % 5, own: 80 + (i * 7) % 15, team: 84 + (i * 5) % 9, cohort: 6 });
    return out;
  }
  function kpiSeries() {
    var mk = function (base) { var s = []; for (var i = 29; i >= 0; i--) s.push({ date: daysAgo(i), own: base + (i * 7) % 12, team: base + 2 + (i * 5) % 8, cohort: 6 }); return s; };
    return { pctAnswered: mk(82), answered: mk(30), missed: mk(2), attSeconds: mk(240), transferPct: mk(9) };
  }

  var FIXTURES = {
    getEmployeeState: {
      id: 'E-1042', name: 'Avery Blake', email: 'avery@umsupply.com',
      today: todayIso,
      punches: [{ type: 'ClockIn', time: '08:04:00', direction: 'IN' }, { type: 'LunchOut', time: '12:30:00', direction: 'OUT' }, { type: 'LunchIn', time: '13:02:00', direction: 'IN' }],
      nextActions: ['ClockOut', 'LunchOut'],
      adjustWindowDays: 30, adjustReasonThresholdDays: 7, selfUndoWindowSeconds: 300,
      payCycle: 'biweekly', payAnchor: daysAgo(12),
      isManager: true, isAdmin: true, canSeeSpanish: true, departments: ['Billing'],
      timezone: 'Asia/Kolkata', timezoneAbbr: 'IST',
      schedule: { startMin: 480, lengthMin: 540, breaks: [{ label: 'B1', startMin: 630, lenMin: 15 }, { label: 'Lunch', startMin: 750, lenMin: 30 }, { label: 'B2', startMin: 900, lenMin: 15 }], breakReminderMin: 5 },
      ptoEnabled: true, annualLeaveBalance: 11.5, sickLeaveBalance: 10, annualLeaveMax: 15,
      flags: { showTeammateStatus: true, showTeammateType: true, enablePtoTracking: true },
      instanceLabel: '',
    },
    getWhatsNew: { none: true },
    getCallNotesAmbient: { enrolled: true, unresolvedActionCount: 1, staleActionCount: 1, todayTotal: 7, weekTotal: 32, flagCounts: { all: 7, action: 1, training: 1, review: 0, unresolved: 1, qa: 1 }, staleFlagHours: 6, flagsVersion: 'v1' },
    getMetricsAmbient: { badge: null },
    getAutomationHealthBadge: { failing: false, count: 0 },
    getCallNotesDepartments: {
      departments: ['Billing', 'Shipping', 'Resupply', 'Intake', 'Other'],
      suggestionsByDept: { Billing: ['Close Order', 'OOP Order'], Shipping: ['Verified Shipping'] },
      defaultSuggestions: ['Close Order', 'Verified Shipping', 'Repeat Resupply'],
      flags: {}, emailTemplates: [], externalLinks: [], voiceInputEnabled: false,
      stateTaxRates: {}, stateAbbrToName: {}, deleteWindowSeconds: 300, autoCopyFormat: '',
    },
    getMyCallNotes: { notes: [note(0), note(1), note(2)], autoCopyFormat: '', timezone: 'Asia/Kolkata' },
    getMyPinnedCallNotes: { notes: [note(9, { subformData: { pinned: true, pinnedAt: ts(daysAgo(2), '15:00:00'), flags: [], tags: ['complex-case'] }, dateLocal: daysAgo(2), timestamp: ts(daysAgo(2), '14:58:00'), flagType: '' })] },
    getMyTrainingQA: { items: [], notes: [] },
    getCallNoteTagSuggestions: { tags: ['resupply', 'billing', 'mask-fit'] },
    getMyNoteHourBuckets: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 1, 0, 2, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0],
    // V-14 (cycle 12): these three MUST agree with the server's own arithmetic —
    // cnNoteCoverage_(noteCount, totalAnswered) = round(35/41*100) = 85, and the
    // Clock strip derives `missing` as answered - noteCount = 6. The old fixture
    // said 7 notes / 41 answered / 85% (the real ratio is 17%) and missingCount
    // 3, so every screenshot rendered "85% logged · File 34 missing" — data the
    // server cannot produce. The harness README's first rule is that fixtures
    // mirror the real server contract; two prior violations produced convincing
    // FAKE defects, so this is a correctness issue for the harness itself.
    // Operator #4/#5 (2026-08-06): alertThreshold mirrors the server's
    // CONFIG.CDR_ALERT_THRESHOLD ship; `transfer` is the own-day scalar
    // ({transferred, transferPct}, null = absent — INV-180 zero-vs-absence).
    getMyMetrics: { date: todayIso, repName: 'Avery Blake', cdr: kpis, trend: trend30(), series: kpiSeries(), kpiMinCohort: 3, noteCount: 35, noteCoverage: 85, missingCount: 6,
      transfer: { transferred: 4, transferPct: 9.8 }, alertThreshold: 85 },
    // V-14: the range endpoint returns its OWN cdr totals for the span, so the
    // fixture needs weekly-scale numbers — reusing the single-day `kpis` made
    // "31 notes / 41 answered / 81%" (the real ratio is 76%). 7 weekdays at the
    // single-day volume: 254 answered, 218 notes -> round(218/254*100) = 86.
    getMyMetricsRange: { from: daysAgo(6), to: todayIso, repName: 'Avery Blake',
      cdr: { totalRung: 287, totalAnswered: 254, totalMissed: 33, pctAnswered: 88.5,
             tttFormatted: '19:54:20', attFormatted: '0:04:42', tttSeconds: 71660, attSeconds: 282 },
      noteCount: 218, noteCoverage: 86, trend: trend30(),
      transfer: { transferred: 23, transferPct: 9.1 }, alertThreshold: 85 },
    // Cycle-14 Phase 2 — Team Metrics with the per-queue transfer split. The
    // shape mirrors getTeamMetrics exactly, INCLUDING the INV-180 contract:
    // queueTotal is the SUM of `queues` and queueUnattributed is the remainder
    // against `transferred`, never a free-floating number. Getting that wrong
    // is how V-14 produced a screenshot the server could not have produced.
    getTeamMetrics: (function () {
      var mk = function (id, name, rung, ans, missed, att, notes, cov, transferred, queues) {
        var qt = 0; Object.keys(queues).forEach(function (q) { qt += queues[q]; });
        return { repId: id, repName: name, totalRung: rung, totalAnswered: ans,
          totalMissed: missed, pctAnswered: Math.round((ans / rung) * 1000) / 10,
          tttFormatted: '3:12:44', attFormatted: att, tttSeconds: 11564, attSeconds: 281,
          noteCount: notes, noteCoverage: cov, noteCountUnavailable: false, hasCdrData: true,
          transferred: transferred, transferPct: Math.round((transferred / ans) * 1000) / 10,
          queues: queues, queueTotal: qt, queueUnattributed: Math.max(0, transferred - qt),
          hasTransferData: true };
      };
      var reps = [
        mk('E-1042', 'Avery Blake', 46, 41, 5, '0:04:41', 35, 85, 14, { A_Q_Sales: 6, A_Q_PAP: 3 }),
        mk('E-1077', 'Sam Ortiz', 38, 36, 2, '0:05:02', 30, 83, 9, { A_Q_PowerChairs: 5, A_Q_FieldOps: 2, A_Q_Spanish: 1 }),
        mk('E-1091', 'Nina Patel', 52, 44, 8, '0:03:58', 41, 93, 21, { A_Q_CSR: 12, A_Q_Legacy_Unmapped: 4 }),
        mk('E-1104', 'Leo Kim', 29, 27, 2, '0:04:20', 18, 67, 3, {}),
      ];
      var tq = {};
      reps.forEach(function (r) {
        Object.keys(r.queues).forEach(function (q) {
          if (!tq[q]) tq[q] = { queue: q, transferred: 0, reps: {} };
          tq[q].transferred += r.queues[q]; tq[q].reps[r.repName] = true;
        });
      });
      var totals = { rung: 0, answered: 0, missed: 0, tttSeconds: 0, noteCount: 0, transferred: 0, queueTotal: 0, transferCalls: 0 };
      reps.forEach(function (r) {
        totals.rung += r.totalRung; totals.answered += r.totalAnswered; totals.missed += r.totalMissed;
        totals.tttSeconds += r.tttSeconds; totals.noteCount += r.noteCount;
        totals.transferred += r.transferred; totals.queueTotal += r.queueTotal;
        // #5 — the Transfer sheet's own Total Calls denominator (the fixture
        // approximates it with answered, which is what the mk() pct used).
        totals.transferCalls += r.totalAnswered;
      });
      totals.pctAnswered = Math.round((totals.answered / totals.rung) * 1000) / 10;
      totals.attFormatted = '0:04:30'; totals.tttFormatted = '12:50:56';
      totals.noteCoverage = cnNoteCoverage_(totals.noteCount, totals.answered);
      // #5 — mirrors the server: null unless the Transfer read succeeded AND
      // its own denominator is positive.
      totals.transferPct = totals.transferCalls > 0
        ? Math.round((totals.transferred / totals.transferCalls) * 1000) / 10 : null;
      var qRows = Object.keys(tq).map(function (q) {
        return { queue: q, transferred: tq[q].transferred, reps: Object.keys(tq[q].reps).length };
      }).sort(function (a, b) { return b.transferred - a.transferred; });
      return {
        from: todayIso, to: todayIso, date: todayIso, reps: reps, teamTotals: totals,
        // Name-match diagnostics. On a shared CDR feed BOTH raw lists are
        // normally non-empty (other departments; non-phone staff / PTO), so an
        // all-empty fixture would never show the states a real manager sees.
        // `likelyMismatches` is the DERIVED intersection — exactly what
        // cdrLikelyNameMismatches_ returns for the two lists below: only
        // "Smith, Bob" ↔ "Bob Smith" share 2 name tokens. "Jo Tran" shares
        // just a surname with "Ada Tran" and must NOT pair.
        unmatchedAgents: ['Ada Tran', 'Casey Lund', 'Dana Wu', 'Smith, Bob'],
        rosterWithNoCdr: ['Bob Smith', 'Jo Tran', 'Robin Choudhury'],
        likelyMismatches: [{ roster: 'Bob Smith', cdr: 'Smith, Bob' }],
        trend: trend30(),
        transferMeta: { available: true, error: null, queueColumns: Object.keys(tq) },
        queueRows: qRows,
        alertThreshold: 85,   // #4 — mirrors CONFIG.CDR_ALERT_THRESHOLD
        // F4 (cycle 15): this fixture used to REIMPLEMENT the grouping fold by
        // hand, and had already drifted — it omitted the per-group queues.sort()
        // the server does, so the screenshot showed a group's queues in the
        // wrong order. It now calls a VERBATIM copy of groupQueueRows_ (pinned
        // byte-identical by the F4 mirror test), fed by the real CONFIG seed.
        groupRows: groupQueueRows_(qRows, MOCK_CDR_QUEUE_GROUPS),
        meta: { rowsScanned: 900, rowsMatched: 120, columnWarning: null, computeMs: 84 },
      };
    })(),
    getDashboardMetrics: function (period) {
      return { period: period, label: period === 'yesterday' ? 'Yesterday' : (period === 'mtd' ? 'Month to date' : 'Year to date'),
        own: { answered: 41, missed: 5, pctAnswered: 89.1, attFormatted: '4:41', noteCount: 35, noteCoverage: 85, transferPct: 8.2 },   // V-14: 35/41 = 85%
        team: { answered: 388, missed: 41, pctAnswered: 90.4, attFormatted: '4:12', transferPct: 9.9 },
        cohort: 8, kpiMinCohort: 1, from: daysAgo(period === 'ytd' ? 200 : (period === 'mtd' ? 23 : 1)), to: daysAgo(1) };   // kpiMinCohort mirrors the operator-2026-08-06 MIN_COHORT=1
    },
    getTeammateStatus: { enabled: true, teammates: [
      { name: 'Avery Blake', status: 'clocked_in', isSelf: true },
      { name: 'Sam Ortiz', status: 'on_lunch', isSelf: false },
      { name: 'Nina Patel', status: 'clocked_in', isSelf: false },
      { name: 'Leo Kim', status: 'not_in', isSelf: false }] },
    getDeptRequests: { isManager: true, myDepts: ['Billing'],
      mine: [
        { requestId: 'r1', toDept: 'Shipping', label: 'Verified Shipping', createdAt: daysAgo(0) + ' 09:12', byName: 'Avery Blake', status: 'open', elapsedMin: 190, slaStatus: 'ontime', slaHours: 48 },
        { requestId: 'r2', toDept: 'Billing', label: 'Close Order', createdAt: daysAgo(2) + ' 10:40', byName: 'Avery Blake', status: 'open', elapsedMin: 2900, slaStatus: 'overdue', slaHours: 24 },
        { requestId: 'r3', toDept: 'Resupply', label: 'Repeat Resupply', createdAt: daysAgo(1) + ' 14:05', byName: 'Avery Blake', status: 'open', elapsedMin: 1450, slaStatus: 'atrisk', slaHours: 48 },
        { requestId: 'r4', toDept: 'Billing', label: 'OOP Order', createdAt: daysAgo(3) + ' 11:20', byName: 'Avery Blake', status: 'resolved', elapsedMin: 220, resolvedBy: 'sam@umsupply.com' }],
      incoming: [
        { requestId: 'r5', toDept: 'Billing', label: 'Close Order', createdAt: daysAgo(0) + ' 08:30', byName: 'Nina Patel', status: 'open', elapsedMin: 320, slaStatus: 'ontime', slaHours: 24 }],
      allOpen: [
        { requestId: 'r6', toDept: 'Resupply', label: 'Repeat Resupply', createdAt: daysAgo(4) + ' 09:00', byName: 'Leo Kim', status: 'open', elapsedMin: 5800, slaStatus: 'overdue', slaHours: 48 }],
      truncated: false, mineTotal: 4, incomingTotal: 1, allOpenTotal: 1, listCap: 100,
      deptStats: [{ dept: 'Billing', open: 2, resolved: 14, overdueOpen: 1, slaHours: 24, avgMinutes: 340, medianMinutes: 220 }] },
    getMyTraining: { items: [
      { itemId: 'kb-1', title: 'HIPAA refresher', type: 'article', itemType: 'kb', status: 'pending', dueDate: daysAgo(-6), assignedAt: ts(daysAgo(3), '09:00:00'), attempts: 0 },
      { itemId: 'quiz-1', title: 'CPAP resupply quiz', type: 'quiz', itemType: 'quiz', status: 'done', quiz: { questionCount: 5, passPct: 80 }, attempts: 2, completedAt: ts(daysAgo(1), '11:00:00') }] },
    getSpanishInboxPending: { pending: [
      { threadId: 't1', requester: 'jrivera@umsupply.com', ageHours: 3.2, subject: 'Paciente pregunta por su pedido', snippet: 'La paciente llama para preguntar cuándo llega…', permalink: 'https://mail.google.com/mail/u/0/#inbox/t1' },
      { threadId: 't2', requester: 'mgarcia@umsupply.com', ageHours: 29, subject: 'Ayuda con formulario de admisión', snippet: 'El paciente necesita ayuda para completar el formulario…', hasMore: true, permalink: 'https://mail.google.com/mail/u/0/#inbox/t2' }],
      medianMinutes: 45, truncated: false },
    getSpanishInboxResolved: { resolved: [
      { threadId: 't3', requester: 'jrivera@umsupply.com', resolver: 'avery@umsupply.com', manual: false, resolveMinutes: 45, resolvedAtMs: Date.now() - 7200000, subject: 'Pregunta sobre facturación', permalink: 'https://mail.google.com/mail/u/0/#inbox/t3' },
      { threadId: 't4', requester: 'lchen@umsupply.com', resolver: 'sam@umsupply.com', manual: true, resolveMinutes: 260, resolvedAtMs: Date.now() - 86400000, subject: 'Cita de seguimiento', permalink: 'https://mail.google.com/mail/u/0/#inbox/t4' }],
      truncated: false },
    getSpanishInboxStats: { address: 'spanishcalls@universalmedsupply.com', days: 30, pending: 2, resolved: 12, avgMinutes: 78, medianMinutes: 45, membersConfigured: 3, threadsScanned: 14, truncated: false },
    getPatientTimeline: { events: [], partial: false, failedSources: [] },
    cnPing: { ok: true },
    getCalendarData: function (year, month) {
      var m2 = String(month).padStart(2, '0');
      var hours = {}; var worked = [];
      for (var d = 1; d <= 24; d++) { var ds = year + '-' + m2 + '-' + String(d).padStart(2, '0');
        var dow = new Date(year, month - 1, d).getDay();
        if (dow > 0 && dow < 6) { hours[ds] = 8.5 + (d % 3) * 0.25; worked.push(ds); } }
      var todayLocal = year + '-' + m2 + '-24';
      var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      var firstDow = new Date(year, month - 1, 1).getDay();
      var lastDay = new Date(year, month, 0).getDate();
      return { year: year, month: month, monthName: monthNames[month - 1] + ' ' + year, firstDayOfWeek: firstDow, lastDay: lastDay, today: todayLocal, hoursByDate: hours, workedDates: worked,
        timeOffRequests: [{ date: year + '-' + m2 + '-28', type: 'Full Day', status: 'Approved', submittedAt: todayLocal + ' 09:00:00', notes: 'Family visit' },
                          { date: year + '-' + m2 + '-30', type: 'Half Day - Morning', status: 'Pending', submittedAt: todayLocal + ' 10:00:00', notes: '' }],
        allRequests: [{ date: year + '-' + m2 + '-28', type: 'Full Day', status: 'Approved', submittedAt: todayLocal + ' 09:00:00' },
                      { date: year + '-' + m2 + '-30', type: 'Half Day - Morning', status: 'Pending', submittedAt: todayLocal + ' 10:00:00' }],
        teammates: [], holidays: [], annualLeave: 11.5, sickLeave: 10, ptoEnabled: true, annualLeaveMax: 15 };
    },
    getManagerDashboard: (function () {
      function spark(n, base) { var a = []; for (var i = n; i >= 1; i--) a.push({ date: daysAgo(i), count: (i * base) % 4 }); return a; }
      function rh() { var a = []; for (var i = 7; i >= 1; i--) a.push({ date: daysAgo(i), hours: [8.5, 9, 0, 8.75, 9, 8.5, 4][i - 1] }); return a; }
      function ls(name, status, t, tz, abbr) { return { empId: 'E-' + name.length + '0' + t, name: name, status: status,
        lastPunchType: t, lastPunchTime: '08:0' + (name.length % 6) + ':00', lastPunchTimeMgr: '21:3' + (name.length % 6) + ':00',
        timezone: tz, tzAbbr: abbr, empTzAbbr: abbr, mgrTzAbbr: 'CST', recentHours: rh(), recentTotal: 47.75, recentDays: 6 }; }
      return {
        today: todayIso,
        liveStatus: [ls('Avery Blake', 'clocked_in', 'LunchIn', 'Asia/Kolkata', 'IST'),
                     ls('Sam Ortiz', 'on_lunch', 'LunchOut', 'Asia/Manila', 'PHT'),
                     ls('Nina Patel', 'clocked_in', 'ClockIn', 'America/Chicago', 'CST'),
                     ls('Leo Kim', 'not_in', 'ClockOut', 'America/Chicago', 'CST')],
        pending: [{ empId: 'E-1088', empName: 'Sam Ortiz', name: 'Sam Ortiz', date: daysAgo(-4), type: 'Full Day', notes: 'Wedding',
                    submittedAt: daysAgo(1) + ' 10:12:00', conflictsOff: [{ name: 'Nina Patel', status: 'Approved', type: 'Full Day' }],
                    holidayName: null, balanceAfter: 7.5, ptoEnabled: true, annualLeave: 8.5, tzAbbr: 'PHT' }],
        missedPunches: [{ empId: 'E-1090', empName: 'Leo Kim', date: daysAgo(2) }],
        recentPunches: [{ empId: 'E-1042', empName: 'Avery Blake', date: todayIso, time: '08:04:00', type: 'ClockIn', isAdjustment: false, empTzAbbr: 'IST', canDelete: true },
                        { empId: 'E-1088', empName: 'Sam Ortiz', date: daysAgo(1), time: '17:02:00', type: 'ClockOut', isAdjustment: true, empTzAbbr: 'PHT', canDelete: true }],
        recentAudits: [{ timestamp: daysAgo(0) + ' 08:04:12', empName: 'Avery Blake', action: 'PunchIn', actor: '', notes: '', punchDate: todayIso, punchTime: '08:04:00', isAdjustment: false },
                       { timestamp: daysAgo(1) + ' 17:03:40', empName: 'Sam Ortiz', action: 'TimeOffStatusChange', actor: 'mgr@umsupply.com', notes: 'Pending->Approved (Full Day)', punchDate: daysAgo(-4), punchTime: '', isAdjustment: false }],
        missedLookbackDays: 7, mgrDeleteWindowDays: 7, adjustWindowDays: 30, ptoEnabled: true, mgrTzAbbr: 'CST',
        punchTrend: spark(8, 3).map(function (x) { return { date: x.date, count: 10 + x.count * 3 }; }),
        toSummary: { approved: 6, pending: 1, denied: 1 },
        pendingTrend: spark(14, 1), missedTrend: spark(14, 2),
      };
    })(),
    getPtoReconciliation: { reps: [] },
    managerGetPendingAdjustments: { requests: [] },
    getTimesheetDoctor: { duplicates: [], inverted: [], windowDays: 92 },
    getReferenceTree: { isManager: true, isAdmin: true, items: [
      { id: 'kb-1', department: 'Billing', title: 'HIPAA refresher', type: 'article', status: 'published', sortOrder: 1 },
      { id: 'kb-2', department: 'Billing', title: 'OOP payment policy', type: 'article', status: 'published', sortOrder: 2 },
      { id: 'kb-3', department: 'Shipping', title: 'Carrier escalation matrix', type: 'embed', driveKind: 'doc', status: 'published', sortOrder: 1 },
      { id: 'kb-4', department: 'Resupply', title: 'CPAP mask sizing guide', type: 'article', status: 'draft', sortOrder: 1 }] },
    // C17 batch-3 (INV-185): FIELD NAMES mirror the server return sites —
    // `views` (a prior fixture key had drifted to a name the client never
    // reads), plus total/cap/dueDays so the F18 cap-note path is renderable;
    // contentRequests uses the real {open, resolved, openCount} shape; the
    // coaching rows carry the server's exact TRX field casing (the drifted
    // lowercase form meant no screenshot could ever render the TRX chip).
    kbGetReviewDue: { items: [{ id: 'kb-2', title: 'OOP payment policy', department: 'Billing', ageDays: 120, views: 14, staleFlags: 1, staleNote: 'Rates changed in July' }], total: 1, cap: 40, dueDays: 90 },
    kbGetUsageStats: { items: [{ id: 'kb-1', title: 'HIPAA refresher', count: 22, drawerCount: 9, helpful: 4, notHelpful: 0 }], windowDays: 30 },
    kbGetContentRequests: { open: [], resolved: [], openCount: 0 },
    kbGetRelated: { items: [] },
    kbRecordView: { ok: true },
    getCoachingDashboard: { items: [
      { coachId: 'c1', empId: 'E-1088', empName: 'Sam Ortiz', patientTRX: 'TRX-208', severity: 'minor', status: 'open',
        whatHappened: 'Quoted the wrong resupply window to the caller.', whatShould: 'Confirm the 90-day window in the CRM before quoting.',
        createdBy: 'avery@umsupply.com', createdAt: daysAgo(3) + ' 10:00:00', acknowledgedAt: '', ackBy: '' },
      { coachId: 'c2', empId: 'E-1090', empName: 'Leo Kim', patientTRX: 'TRX-311', severity: 'praise', status: 'acknowledged',
        whatHappened: 'Great de-escalation on a billing dispute.', whatShould: '', createdBy: 'avery@umsupply.com',
        createdAt: daysAgo(6) + ' 15:20:00', acknowledgedAt: daysAgo(5) + ' 09:00:00', ackBy: 'leo@umsupply.com' }],
      counts: { open: 1, acknowledged: 1, overdueUnacked: 0, praise: 1 },
      analytics: { total: 2, acknowledged: 1, ackRatePct: 50, medianDaysToAck: 1, overdueUnacked: 0,
        bySeverity: { praise: 1, minor: 1, major: 0, critical: 0 },
        perRep: [
          { empId: 'E-1088', empName: 'Sam Ortiz', total: 1, acknowledged: 0, overdue: 0, ackRatePct: 0, medianDaysToAck: 0 },
          { empId: 'E-1090', empName: 'Leo Kim', total: 1, acknowledged: 1, overdue: 0, ackRatePct: 100, medianDaysToAck: 1 }] } },
    getMyCoaching: { items: [] },
    // ── Batch-7 (cycle 17): the Admin panel scenario. Field names mirror the
    // server return sites (INV-185): getAdminConfig's config bag, the
    // computeAutomationHealth_ report (syncFails/automationLastRuns/digests/
    // cdr/detectors/clientErrors/witnessFails/selfTest/intakeCatalog), the
    // getStorageHealth probe rows, deployReadinessItems_'s {items, summary},
    // getRetentionConfig's {value, source} pairs, and the taxonomy/trends/
    // audit-log walk outcomes (skippedReps — cycle-17 batch 2).
    getAdminConfig: {
      departmentEmails: { Billing: 'billing@umsupply.com', Shipping: 'shipping@umsupply.com', Resupply: 'resupply@umsupply.com' },
      stateTaxRates: { TX: 0.0825, OK: 0.045 },
      updateSuggestions: { Billing: ['Close Order', 'OOP Order'] },
      defaultSuggestions: ['Close Order', 'Verified Shipping', 'Repeat Resupply'],
      emailTemplates: [{ name: 'Win-Back Survey', recipientType: 'customer', body: 'Hi {name}, we would love your feedback.' }],
      externalLinks: [{ label: 'Google review', url: 'https://g.page/r/example', category: 'review' }],
      deptSla: { defaultHours: 48, targets: { Billing: 24 }, departments: ['Billing', 'Shipping', 'Resupply'] },
      featureFlags: {
        registry: [
          { key: 'showTeammateStatus', label: 'Teammate status card', description: 'Show the teammate status card on the Clock page.', default: true, scope: 'both' },
          { key: 'voiceInput', label: 'Voice dictation (Call Notes)', description: 'Mic-to-text on the Issue / Resolution fields.', default: false, scope: 'client', danger: 'Routes audio outside the BAA boundary.' },
          { key: 'managerDailyBrief', label: 'Manager daily brief', description: 'One consolidated morning email per manager.', default: false, scope: 'server' }],
        values: { showTeammateStatus: true, voiceInput: false, managerDailyBrief: false },
      },
      kbAi: { dailyCap: 3, model: 'claude-haiku-4-5', models: ['claude-haiku-4-5', 'claude-sonnet-5'], hasKey: false, spend: { date: todayIso, usd: 0, calls: 0 } },
    },
    getEnrolledCallNotesReps: { reps: [
      { id: 'E-1042', name: 'Avery Blake' }, { id: 'E-1088', name: 'Sam Ortiz' }, { id: 'E-1090', name: 'Leo Kim' }] },
    getCallNotesTagTaxonomy: {
      tags: [
        { tag: 'resupply', count: 41, lastSeen: daysAgo(0), archived: false },
        { tag: 'billing', count: 26, lastSeen: daysAgo(1), archived: false },
        { tag: 'mask-fit', count: 12, lastSeen: daysAgo(4), archived: false }],
      archivedOnlyTags: [{ tag: 'legacy-tag', count: 0, lastSeen: '', archived: true }],
      repsScanned: 3, skippedReps: [],
    },
    getCallNotesTagTrends: (function () {
      var mk = function (tag, base) {
        var c = []; for (var i = 0; i < 12; i++) c.push((i * base + tag.length) % 7);
        var total = 0; c.forEach(function (x) { total += x; });
        return { tag: tag, counts: c, total: total, delta: c[11] - c[10] };
      };
      return { weekStarts: [], series: [mk('resupply', 3), mk('billing', 2), mk('mask-fit', 1)], weeks: 12, skippedReps: [] };
    })(),
    getCallNotesAuditLog: {
      rows: [
        { timestamp: daysAgo(0) + ' 10:44:12', timestampMgr: daysAgo(0) + ' 00:14:12', repId: 'E-1042', repName: 'Avery Blake', actorEmail: 'avery@umsupply.com', action: 'CallNoteEmail', noteId: 'note-2', dateLocal: daysAgo(0) },
        { timestamp: daysAgo(1) + ' 16:02:40', timestampMgr: daysAgo(1) + ' 05:32:40', repId: 'E-1088', repName: 'Sam Ortiz', actorEmail: 'mgr@umsupply.com', action: 'CallNoteTrainingReply', noteId: 'note-9', dateLocal: daysAgo(1) }],
      truncated: false,
    },
    getRetentionConfig: {
      archiveDays: { value: 0, source: 'default' },
      retentionDays: { value: 0, source: 'default' },
      archiveRetentionDays: { value: 0, source: 'default' },
      warnings: [], archiveTab: 'NotesArchive',
    },
    getCallNotesEnrollment: { enrolled: [
      { id: 'E-1042', name: 'Avery Blake' }, { id: 'E-1088', name: 'Sam Ortiz' }],
      unenrolled: [{ id: 'E-1090', name: 'Leo Kim' }] },
    // Team-member onboarding (2026-08-07) — field names mirror
    // getOnboardingPanel's return site (INV-185). Covers every readiness
    // state: fully-ready, needs-provisioning + alias suggestion, blank
    // manager + no CDR rows, and unknown manager email.
    getOnboardingPanel: {
      reps: [
        { id: 'E-1042', name: 'Avery Blake', email: 'avery@example.invalid', timezone: 'Asia/Kolkata',
          tzValid: true, enrolled: true, managerEmail: 'robin@example.invalid', managerEmailKnown: true,
          isManager: true, cdrSeen: true },
        { id: 'E-1090', name: 'Leo Kim', email: 'leo@example.invalid', timezone: 'Asia/Manila',
          tzValid: true, enrolled: false, managerEmail: 'robin@example.invalid', managerEmailKnown: true,
          isManager: false, cdrSeen: false, cdrAlias: 'Kim, Leo' },
        { id: 'E-1091', name: 'Nina Patel', email: 'nina@example.invalid', timezone: 'America/Chicago',
          tzValid: true, enrolled: true, managerEmail: '', managerEmailKnown: false,
          isManager: false, cdrSeen: false },
        { id: 'E-1088', name: 'Sam Ortiz', email: 'sam@example.invalid', timezone: 'America/Chicago',
          tzValid: true, enrolled: true, managerEmail: 'ghost@example.invalid', managerEmailKnown: false,
          isManager: false, cdrSeen: true },
      ],
      offboarded: [{ id: 'E-1099', name: 'Jo Tran' }],   // {id,name} since 2026-08-08 — the ID stays reserved
      managers: ['robin@example.invalid'],
      departments: ['Billing', 'Shipping', 'Resupply', 'Intake'],
      timezones: ['America/Chicago', 'Asia/Kolkata', 'Asia/Manila'],
      hasBiweeklyAnchor: true, anchorOwner: 'Avery Blake',
      cdr: { ok: true, from: daysAgo(6), to: todayIso },
      callerEmail: 'avery@example.invalid',
    },
    managerGetUnresolvedActionCount: { count: 1, partial: false },
    getDeployReadiness: {
      items: [
        { key: 'managers', label: 'Manager emails configured', status: 'ok', detail: '2 configured' },
        { key: 'ADP_SS_ID', label: 'Time Clock / ADP', status: 'ok', detail: 'Reachable · tz matches' },
        { key: 'KB_SS_ID', label: 'Knowledge Base + Training', status: 'ok', detail: 'Reachable · tz matches' },
        { key: 'INTAKE_SS_ID', label: 'Intake (PHI)', status: 'ok', detail: 'Reachable · tz matches' },
        { key: 'FORMS_SS_ID', label: 'Forms (PHI)', status: 'warn', detail: 'Optional — unset (falls back to the ADP sheet)' },
        { key: 'digests', label: 'Digest heartbeats', status: 'warn', detail: 'No heartbeat recorded yet (fresh deploy)' }],
      summary: { ok: 4, warn: 2, fail: 0 },
      configTimezone: 'Asia/Kolkata',
    },
    getAutomationHealth: {
      syncFails: { count: 0, recent: [], windowDays: 30 },
      automationLastRuns: [
        { action: 'CallNotesReconcile', last: { timestampMgr: daysAgo(0) + ' 05:00:12', ms: Date.now() - 3600000, notes: 'rowsBackfilled=0' } },
        { action: 'AdpExportAuto', last: null },
        { action: 'FormDataPurge', last: null },
        { action: 'CallNotesPurge', last: null },
        { action: 'CallNotesArchive', last: null },
        { action: 'CallNotesArchivePurge', last: null },
        { action: 'TimesheetArchive', last: null }],
      digests: [
        { key: 'eod', last: daysAgo(0) + ' 17:00:04', stale: false },
        { key: 'urgent', last: daysAgo(0) + ' 08:00:11', stale: false },
        { key: 'weekly', last: daysAgo(3) + ' 08:00:09', stale: false },
        { key: 'trainingOverdue', last: daysAgo(0) + ' 07:00:08', stale: false },
        { key: 'deptReqReminder', last: daysAgo(0) + ' 10:00:14', stale: false },
        { key: 'managerBrief', last: null, stale: false },
        { key: 'selfTest', last: daysAgo(0) + ' 01:00:21', stale: false }],
      cdr: {
        ok: true, from: daysAgo(7), to: todayIso, rowsMatched: 96, columnWarning: null,
        transferColumnWarning: null,
        unmatchedAgents: ['Ada Tran', 'Casey Lund', 'Smith, Bob'],
        rosterWithNoCdr: ['Bob Smith', 'Robin Choudhury'],
        likelyMismatches: [{ roster: 'Bob Smith', cdr: 'Smith, Bob' }],
        queueInventory: {
          ok: true, from: daysAgo(7), to: todayIso,
          queues: [{ queue: '103,108', rows: 44, agents: 6 }, { queue: '108,103', rows: 31, agents: 5 }],
          sentinels: [{ name: 'A_Q_Sales', rows: 6 }, { name: 'Backup CSR', rows: 2 }],
          transferCols: [{ name: 'A_Q_Sales', nonEmpty: 34 }, { name: 'A_Q_PAP', nonEmpty: 18 }],
          rowsScanned: 900, rowsInWindow: 120,
          agentDateRows: { max: 1, multiCount: 0, sampleMulti: [] },
          truncated: false, error: null,
        },
      },
      detectors: [
        { key: 'coachingOverdue', label: 'Coaching overdue stamp round-trip', ok: true, detail: '' },
        { key: 'auditStaleness', label: 'Audit staleness stamp round-trip', ok: true, detail: '' },
        { key: 'drSla', label: 'DeptRequests SLA stamp round-trip', ok: true, detail: '' },
        { key: 'cnTimestamp', label: 'CN timestamp boundary round-trip', ok: true, detail: '' },
        { key: 'formTokenCells', label: 'Form-token cell shapes', ok: true, detail: '' },
        { key: 'briefConfig', label: 'Manager-brief config coherence', ok: true, detail: '' },
        { key: 'managerSource', label: 'MANAGER_EMAILS ↔ roster drift', ok: true, detail: '' },
        { key: 'cdrOffRoster', label: 'CDR off-roster diagnostic channel present', ok: true, detail: '' }],
      clientErrors: { count: 0, recent: [], windowDays: 7, url: '' },
      witnessFails: { count: 0, lastAt: null, lastAction: '', recent: false },
      selfTest: { date: daysAgo(0), mode: 'smoke', pass: 74, fail: 0, skip: 0, error: '', note: '', running: false, startedAt: null, stuck: false },
      intakeCatalog: { ok: true, totalRows: 22, errors: [], warnings: [] },
      auditScanComplete: true,
      managerTzAbbr: 'CST',
      auditLogUrl: 'https://docs.google.com/spreadsheets/d/example#gid=3',
    },
    getStorageHealth: (function () {
      var store = function (label, role, cls, retention, prop, over) {
        return Object.assign({
          label: label, role: role, cls: cls, retention: retention, prop: prop,
          source: 'Script Property', note: '', configured: true, reachable: true,
          name: label + ' (live)', tz: 'Asia/Kolkata', tzMatch: true,
          locale: 'en_US', url: 'https://docs.google.com/spreadsheets/d/example',
        }, over || {});
      };
      return {
        configTimezone: 'Asia/Kolkata', adpLocale: 'en_US',
        stores: [
          store('Time Clock / ADP', 'Roster, Timesheet, TimeOffRequests, shared AuditLog, punch-adjust', 'Payroll', 'Kept', 'ADP_SS_ID'),
          store('CDR Report', 'DQE + CSR Transfer + Agent Alias Overrides (read-only)', 'External', 'n/a — owned by call-data-reporting', 'CDR_SS_ID'),
          store('Intake (PHI)', 'Offerings + PPD/PMD/PAP submissions', 'PHI', 'Optional purge', 'INTAKE_SS_ID'),
          store('Forms (PHI)', 'FormTokens + FormSubmissions', 'PHI', '90-day purge (if enabled)', 'FORMS_SS_ID',
            { configured: false, reachable: false, name: '', tz: '', tzMatch: null, url: '', source: 'unset',
              note: 'Falls back to the ADP sheet — set FORMS_SS_ID to segregate form PHI.' }),
          store('Knowledge Base + Training', 'KB, KbViews, Training/Quiz tabs', 'PHI-free', 'Kept', 'KB_SS_ID'),
          store('Employee Docs (HR)', 'EmpDocs + DocSignatures', 'HR — keep-forever', 'Never purged', 'HR_DOCS_SS_ID'),
          {
            label: 'Call Notes (per-rep)', role: '2 enrolled rep Sheet(s)', cls: 'PHI', retention: 'Optional purge',
            prop: 'Employees col L (CallNotesSheetId)', source: 'roster', note: '', configured: true, reachable: true,
            name: '', tz: '', tzMatch: null, url: '',
            perRep: { enrolled: 2, reachable: 2, tzMismatch: 0, problems: [] },
          }],
        kbEmbeds: { total: 1, probed: 1, reachable: 1, broken: [], truncated: false },
      };
    })(),
    getEmployeesList: { employees: [
      { id: 'E-1042', name: 'Avery Blake', timezone: 'Asia/Kolkata', tzAbbr: 'IST' },
      { id: 'E-1088', name: 'Sam Ortiz', timezone: 'Asia/Manila', tzAbbr: 'PHT' },
      { id: 'E-1090', name: 'Leo Kim', timezone: 'America/Chicago', tzAbbr: 'CST' }] },
  };

  window.__MISSING__ = [];
  window.__RPC_LOG__ = [];
  // Batch-7 (cycle 17) — forced-failure hook for ERROR-STATE scenarios:
  // `?failrpc=name1,name2` makes those RPCs invoke the FAILURE handler
  // instead of resolving, so the errorStateHtml_ paths (A12/INV-175) become
  // shootable. A forced-fail RPC is NOT a missing fixture.
  var FAIL_RPCS = (function () {
    try {
      var m = /[?&]failrpc=([^&]+)/.exec(window.location.search);
      return m ? decodeURIComponent(m[1]).split(',') : [];
    } catch (e) { return []; }
  })();
  function makeChain(succ, fail) {
    return new Proxy(function () {}, {
      get: function (_t, prop) {
        if (prop === 'withSuccessHandler') return function (f) { return makeChain(f, fail); };
        if (prop === 'withFailureHandler') return function (f) { return makeChain(succ, f); };
        if (prop === 'withUserObject') return function () { return makeChain(succ, fail); };
        return function () {
          var args = Array.prototype.slice.call(arguments);
          var name = String(prop);
          window.__RPC_LOG__.push(name);
          setTimeout(function () {
            if (FAIL_RPCS.indexOf(name) >= 0) {
              if (fail) { try { fail(new Error('[visual-mock] forced failure: ' + name)); } catch (e) {} }
              return;
            }
            var fx = FIXTURES[name];
            if (fx === undefined) {
              window.__MISSING__.push(name);
              if (fail) { try { fail(new Error('[visual-mock] no fixture: ' + name)); } catch (e) {} }
              return;
            }
            var val;
            try { val = (typeof fx === 'function') ? fx.apply(null, args) : JSON.parse(JSON.stringify(fx)); }
            catch (e) { if (fail) fail(e); return; }
            if (succ) { try { succ(val); } catch (e) { console.error('[visual-mock] success handler threw for ' + name + ': ' + (e && e.message)); } }
          }, 30);
        };
      },
    });
  }
  window.google = { script: { get run() { return makeChain(null, null); }, host: { close: function () {} }, history: { push: function () {}, replace: function () {} } } };
})();
