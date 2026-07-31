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
    getMyMetrics: { date: todayIso, repName: 'Avery Blake', cdr: kpis, trend: trend30(), series: kpiSeries(), kpiMinCohort: 3, noteCount: 35, noteCoverage: 85, missingCount: 6 },
    // V-14: the range endpoint returns its OWN cdr totals for the span, so the
    // fixture needs weekly-scale numbers — reusing the single-day `kpis` made
    // "31 notes / 41 answered / 81%" (the real ratio is 76%). 7 weekdays at the
    // single-day volume: 254 answered, 218 notes -> round(218/254*100) = 86.
    getMyMetricsRange: { from: daysAgo(6), to: todayIso, repName: 'Avery Blake',
      cdr: { totalRung: 287, totalAnswered: 254, totalMissed: 33, pctAnswered: 88.5,
             tttFormatted: '19:54:20', attFormatted: '0:04:42', tttSeconds: 71660, attSeconds: 282 },
      noteCount: 218, noteCoverage: 86, trend: trend30() },
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
      var totals = { rung: 0, answered: 0, missed: 0, tttSeconds: 0, noteCount: 0, transferred: 0, queueTotal: 0 };
      reps.forEach(function (r) {
        totals.rung += r.totalRung; totals.answered += r.totalAnswered; totals.missed += r.totalMissed;
        totals.tttSeconds += r.tttSeconds; totals.noteCount += r.noteCount;
        totals.transferred += r.transferred; totals.queueTotal += r.queueTotal;
      });
      totals.pctAnswered = Math.round((totals.answered / totals.rung) * 1000) / 10;
      totals.attFormatted = '0:04:30'; totals.tttFormatted = '12:50:56';
      totals.noteCoverage = Math.round((totals.noteCount / totals.answered) * 100);
      return {
        from: todayIso, to: todayIso, date: todayIso, reps: reps, teamTotals: totals,
        unmatchedAgents: [], rosterWithNoCdr: [], trend: trend30(),
        transferMeta: { available: true, error: null, queueColumns: Object.keys(tq) },
        queueRows: Object.keys(tq).map(function (q) {
          return { queue: q, transferred: tq[q].transferred, reps: Object.keys(tq[q].reps).length };
        }).sort(function (a, b) { return b.transferred - a.transferred; }),
        groupRows: (function () {
          var GROUPS = { 'Sales': ['A_Q_Sales', 'A_Q_PAP', 'A_Q_Sales_MWC'],
            'Customer Success': ['A_Q_CSR', 'A_Q_Intake', 'Backup CSR', 'A_Q_Spanish'],
            'Field Operations': ['A_Q_FieldOps', 'A_Q_FieldOps_Power'],
            'Power': ['A_Q_PowerChairs', 'A_Q_PAK', 'A_Q_BackUp_Power'] };
          var owner = {};
          Object.keys(GROUPS).forEach(function (g) { GROUPS[g].forEach(function (q) { if (!(q in owner)) owner[q] = g; }); });
          var acc = {}, order = [];
          Object.keys(tq).forEach(function (q) {
            var g = owner[q] || 'Ungrouped';
            if (!acc[g]) { acc[g] = { group: g, transferred: 0, reps: 0, queues: [] }; order.push(g); }
            acc[g].transferred += tq[q].transferred;
            acc[g].reps = Math.max(acc[g].reps, Object.keys(tq[q].reps).length);
            acc[g].queues.push({ queue: q, transferred: tq[q].transferred, reps: Object.keys(tq[q].reps).length });
          });
          return order.map(function (g) { return acc[g]; }).sort(function (a, b) {
            if (a.group === 'Ungrouped') return 1;
            if (b.group === 'Ungrouped') return -1;
            return b.transferred - a.transferred; });
        })(),
        meta: { rowsScanned: 900, rowsMatched: 120, columnWarning: null, computeMs: 84 },
      };
    })(),
    getDashboardMetrics: function (period) {
      return { period: period, label: period === 'yesterday' ? 'Yesterday' : (period === 'mtd' ? 'Month to date' : 'Year to date'),
        own: { answered: 41, missed: 5, pctAnswered: 89.1, attFormatted: '4:41', noteCount: 35, noteCoverage: 85, transferPct: 8.2 },   // V-14: 35/41 = 85%
        team: { answered: 388, missed: 41, pctAnswered: 90.4, attFormatted: '4:12', transferPct: 9.9 },
        cohort: 8, kpiMinCohort: 3, from: daysAgo(period === 'ytd' ? 200 : (period === 'mtd' ? 23 : 1)), to: daysAgo(1) };
    },
    getTeammateStatus: { enabled: true, teammates: [
      { name: 'Avery Blake', status: 'clocked_in', isSelf: true },
      { name: 'Sam Ortiz', status: 'on_lunch', isSelf: false },
      { name: 'Nina Patel', status: 'clocked_in', isSelf: false },
      { name: 'Leo Kim', status: 'not_in', isSelf: false }] },
    getDeptRequests: { isManager: true, myDepts: ['Billing'], mine: { open: [], resolved: [] }, incoming: [], allOpen: [], truncated: false,
      deptStats: [{ dept: 'Billing', open: 2, resolved: 14, overdueOpen: 0, slaHours: 48, avgMinutes: 340, medianMinutes: 220 }] },
    getMyTraining: { items: [
      { itemId: 'kb-1', title: 'HIPAA refresher', type: 'article', itemType: 'kb', status: 'pending', dueDate: daysAgo(-6), assignedAt: ts(daysAgo(3), '09:00:00'), attempts: 0 },
      { itemId: 'quiz-1', title: 'CPAP resupply quiz', type: 'quiz', itemType: 'quiz', status: 'done', quiz: { questionCount: 5, passPct: 80 }, attempts: 2, completedAt: ts(daysAgo(1), '11:00:00') }] },
    getSpanishInboxPending: { pending: [{ threadId: 't1', requester: 'jrivera@umsupply.com', ageHours: 3.2, subject: 'Paciente pregunta por su pedido', snippet: 'La paciente llama para preguntar cuándo llega…', permalink: 'https://mail.google.com/mail/u/0/#inbox/t1' }], medianMinutes: 45 },
    getSpanishInboxStats: { pending: 1, resolved: 12, medianMinutes: 45 },
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
    kbGetReviewDue: { items: [{ id: 'kb-2', title: 'OOP payment policy', department: 'Billing', ageDays: 120, usage30: 14, staleFlags: 1, staleNote: 'Rates changed in July' }] },
    kbGetUsageStats: { items: [{ id: 'kb-1', title: 'HIPAA refresher', count: 22, drawerCount: 9, helpful: 4, notHelpful: 0 }], windowDays: 30 },
    kbGetContentRequests: { requests: [] },
    kbGetRelated: { items: [] },
    kbRecordView: { ok: true },
    getCoachingDashboard: { items: [
      { coachId: 'c1', empId: 'E-1088', empName: 'Sam Ortiz', patientTrx: 'TRX-208', severity: 'minor', status: 'open',
        whatHappened: 'Quoted the wrong resupply window to the caller.', whatShould: 'Confirm the 90-day window in the CRM before quoting.',
        createdBy: 'avery@umsupply.com', createdAt: daysAgo(3) + ' 10:00:00', acknowledgedAt: '', ackBy: '' },
      { coachId: 'c2', empId: 'E-1090', empName: 'Leo Kim', patientTrx: 'TRX-311', severity: 'praise', status: 'acknowledged',
        whatHappened: 'Great de-escalation on a billing dispute.', whatShould: '', createdBy: 'avery@umsupply.com',
        createdAt: daysAgo(6) + ' 15:20:00', acknowledgedAt: daysAgo(5) + ' 09:00:00', ackBy: 'leo@umsupply.com' }],
      counts: { open: 1, acknowledged: 1, overdueUnacked: 0, praise: 1 },
      analytics: { total: 2, acknowledged: 1, ackRatePct: 50, medianDaysToAck: 1, overdueUnacked: 0,
        bySeverity: { praise: 1, minor: 1, major: 0, critical: 0 },
        perRep: [
          { empId: 'E-1088', empName: 'Sam Ortiz', total: 1, acknowledged: 0, overdue: 0, ackRatePct: 0, medianDaysToAck: 0 },
          { empId: 'E-1090', empName: 'Leo Kim', total: 1, acknowledged: 1, overdue: 0, ackRatePct: 100, medianDaysToAck: 1 }] } },
    getMyCoaching: { items: [] },
    getEmployeesList: { employees: [
      { id: 'E-1042', name: 'Avery Blake', timezone: 'Asia/Kolkata', tzAbbr: 'IST' },
      { id: 'E-1088', name: 'Sam Ortiz', timezone: 'Asia/Manila', tzAbbr: 'PHT' },
      { id: 'E-1090', name: 'Leo Kim', timezone: 'America/Chicago', tzAbbr: 'CST' }] },
  };

  window.__MISSING__ = [];
  window.__RPC_LOG__ = [];
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
