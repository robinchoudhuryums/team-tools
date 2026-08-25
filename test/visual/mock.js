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
// seams-18 F3 (INV-185): the pay-statement fixture used to PARAPHRASE this
// function's monthly branch (getUTCMonth() - off) — one drift away from
// screenshots the server cannot produce. Verbatim copy; the derived F4 mirror
// pin holds it byte-identical to Code.js automatically.
function payPeriodRange_(cycle, currentBiweekly, todayStr, offset) {
  let off = parseInt(offset, 10);
  if (isNaN(off) || off < 0) off = 0;
  if (off > 6) off = 6;
  if (String(cycle || '').toLowerCase() === 'biweekly') {
    if (!currentBiweekly || !currentBiweekly.start || !currentBiweekly.end) return null;
    const shift = function (iso) {
      const d = new Date(iso + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - off * 14);
      return d.toISOString().substring(0, 10);
    };
    return { start: shift(currentBiweekly.start), end: shift(currentBiweekly.end), offset: off };
  }
  const y = parseInt(String(todayStr).substring(0, 4), 10);
  const m = parseInt(String(todayStr).substring(5, 7), 10);
  if (!y || !m) return null;
  const first = new Date(Date.UTC(y, m - 1 - off, 1, 12));
  const last  = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12));
  return { start: first.toISOString().substring(0, 10), end: last.toISOString().substring(0, 10), offset: off };
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
      // F2 (cycle 18) — the reminder ticker's day-off gate. Mirrors the server
      // field (INV-185); false = a normal working day, the scenario's intent.
      offToday: false,
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
    // Operator 2026-08-25 — the composer's editable Note Reference + the
    // Preview loader. BOTH are FUNCTIONS of their arguments (the F14 rule):
    // updateCallNote's response ECHOES the edited fields (the client re-points
    // its held note at it), and previewCallNoteEmail's body is built FROM the
    // note as edited, so a frozen object would render a preview the server
    // could not produce.
    updateCallNote: function (noteId, payload) {
      return { success: true, note: Object.assign(note(0), { noteId: noteId }, payload || {}) };
    },
    previewCallNoteEmail: function (noteId, sel) {
      var s = sel || {};
      return {
        from: 'Avery Blake · Universal Medical Supply <teamtools@umsupply.com>',
        to: (s.departments || []).join(', ') || 'shipping@umsupply.com',
        cc: 'csr@umsupply.com',
        subject: (s.updateInfo || 'Update') + ' — TRX-100 · P. Sample',
        bodyHash: 'a'.repeat(64),
        htmlBody: '<div style="font-family:Arial,sans-serif;font-size:13px">' +
          '<div style="background:#223b5d;color:#fff;padding:8px 12px;font-weight:600">Call Details</div>' +
          '<table style="width:100%;border-collapse:collapse">' +
          '<tr style="background:#e6f2ff"><td style="padding:6px 10px;width:130px"><b>Update</b></td><td style="padding:6px 10px">' + (s.updateInfo || '') + '</td></tr>' +
          '<tr><td style="padding:6px 10px"><b>Patient &amp; TRX</b></td><td style="padding:6px 10px">TRX-100 · P. Sample</td></tr>' +
          '<tr style="background:#e6f2ff"><td style="padding:6px 10px"><b>Issue</b></td><td style="padding:6px 10px">Asking about resupply timing.</td></tr>' +
          '</table></div>',
      };
    },
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
    // F14 (cycle 18) — a FUNCTION, because this endpoint's response ECHOES the
    // date it was asked for and the client's hero kicker branches on it
    // ("Today" vs "Yesterday" vs the bare date). A static `date: todayIso`
    // ignored the argument, so the default shot rendered "TODAY · % ANSWERED"
    // beneath a pressed "YESTERDAY" chip — a combination the server cannot
    // produce (the client's label logic is correct; the FIXTURE was lying).
    // Fifth instance of the INV-185 drift class, so: a fixture whose response
    // shape depends on its arguments must BE a function of them.
    getMyMetrics: function (date) {
      return { date: date || todayIso, repName: 'Avery Blake', cdr: kpis, trend: trend30(), series: kpiSeries(), kpiMinCohort: 3, noteCount: 35, noteCoverage: 85, missingCount: 6, intakeNotes: 3,
        transfer: { transferred: 4, transferPct: 9.8 }, alertThreshold: 85 };
    },
    // Batch 8 — the Catalog browse tab. Mirrors intakeListOfferings exactly:
    // named string fields (the server String()+trim()s every cell), the
    // pre-slice `total` + `cap` (INV-169), and rows sorted by HCPCS as the
    // server sorts them. One row DELIBERATELY has a blank weightCapacity —
    // that is the F9 fail-closed state the card must render as "capacity not
    // recorded" rather than as a value, and it is unshootable without it.
    intakeListOfferings: {
      offerings: [
        { hcpcs: 'K0821', features: 'Standard power wheelchair, captain seat, 18" width', weightCapacity: '300', seatType: 'Captain', pdfLink: 'https://example.com/k0821.pdf', imageUrl: '' },
        { hcpcs: 'K0823', features: 'Group 2 standard, captain seat, sealed batteries', weightCapacity: '300-450', seatType: 'Captain', pdfLink: 'https://example.com/k0823.pdf', imageUrl: '' },
        { hcpcs: 'K0856', features: 'Group 3 single power option, solid seat pan', weightCapacity: '300', seatType: 'Solid', pdfLink: 'https://example.com/k0856.pdf', imageUrl: '' },
        { hcpcs: 'K0861', features: 'Group 3 multiple power option, solid seat, tilt-capable', weightCapacity: '300-600', seatType: 'Solid', pdfLink: 'https://example.com/k0861.pdf', imageUrl: '' },
        { hcpcs: 'K0864', features: 'Group 3 heavy duty, multiple power options', weightCapacity: '', seatType: 'Solid', pdfLink: '', imageUrl: '' },
      ],
      total: 5, cap: 200,
    },
    // V-14: the range endpoint returns its OWN cdr totals for the span, so the
    // fixture needs weekly-scale numbers — reusing the single-day `kpis` made
    // "31 notes / 41 answered / 81%" (the real ratio is 76%). 7 weekdays at the
    // single-day volume: 254 answered, 218 notes -> round(218/254*100) = 86.
    getMyMetricsRange: { from: daysAgo(6), to: todayIso, repName: 'Avery Blake',
      cdr: { totalRung: 287, totalAnswered: 254, totalMissed: 33, pctAnswered: 88.5,
             tttFormatted: '19:54:20', attFormatted: '0:04:42', tttSeconds: 71660, attSeconds: 282 },
      noteCount: 218, noteCoverage: 86, intakeNotes: 17, trend: trend30(),
      transfer: { transferred: 23, transferPct: 9.1 }, alertThreshold: 85 },
    // Cycle-14 Phase 2 — Team Metrics with the per-queue transfer split. The
    // shape mirrors getTeamMetrics exactly, INCLUDING the INV-180 contract:
    // queueTotal is the SUM of `queues` and queueUnattributed is the remainder
    // against `transferred`, never a free-floating number. Getting that wrong
    // is how V-14 produced a screenshot the server could not have produced.
    // Batch 6 (operator 2026-08-25): the Team Metrics intake-volume block.
    getIntakeVolumeStats: { months: [
      { month: '2026-08', ppd: 14, pmd: 6, pap: 4, total: 24 },
      { month: '2026-07', ppd: 18, pmd: 9, pap: 5, total: 32 },
      { month: '2026-06', ppd: 11, pmd: 7, pap: 3, total: 21 },
      { month: '2026-05', ppd: 16, pmd: 4, pap: 6, total: 26 },
      { month: '2026-04', ppd: 9, pmd: 8, pap: 2, total: 19 },
      { month: '2026-03', ppd: 13, pmd: 5, pap: 4, total: 22 },
    ], failedTypes: [] },
    getTeamMetrics: (function () {
      var mk = function (id, name, rung, ans, missed, att, notes, cov, transferred, queues) {
        var qt = 0; Object.keys(queues).forEach(function (q) { qt += queues[q]; });
        return { repId: id, repName: name, totalRung: rung, totalAnswered: ans,
          totalMissed: missed, pctAnswered: Math.round((ans / rung) * 1000) / 10,
          tttFormatted: '3:12:44', attFormatted: att, tttSeconds: 11564, attSeconds: 281,
          noteCount: notes, noteCoverage: cov, noteCountUnavailable: false, intakeNotes: Math.max(0, Math.round(notes / 9) - (rung % 2)), hasCdrData: true,
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
    // The dashboard payload mirrors the server contract, INCLUDING the
    // 2026-08-12 additions (prev / alertThreshold / transferTarget) — a fixture
    // that omits them makes the banded + delta render unshootable (INV-185).
    // Values are chosen to put a GOOD card beside a WARN/CRIT one in one shot.
    getDashboardMetrics: function (period) {
      var mtd = (period === 'mtd');
      return { period: period, label: period === 'yesterday' ? 'Yesterday' : (mtd ? 'Month to date' : 'Year to date'),
        own: { answered: 41, missed: 5, pctAnswered: 89.1, attSeconds: 281, attFormatted: '4:41', noteCount: 35, noteCoverage: 85, transferPct: 8.2 },   // V-14: 35/41 = 85%
        team: { answered: 388, missed: 41, pctAnswered: 78.4, attSeconds: 252, attFormatted: '4:12', transferPct: 24.1 },
        // MTD compares against the prior month's SAME elapsed days.
        prev: mtd ? { from: daysAgo(53), to: daysAgo(31), label: 'Jul 1–23',
          own: { answered: 36, missed: 8, pctAnswered: 81.8, attSeconds: 295, transferPct: 9.4 },
          team: { answered: 402, missed: 33, pctAnswered: 82.1, attSeconds: 248, transferPct: 21.7 } } : null,
        prevUnavailable: false, alertThreshold: 85, transferTarget: 20,
        cohort: 8, kpiMinCohort: 1, from: daysAgo(period === 'ytd' ? 200 : (mtd ? 23 : 1)), to: daysAgo(1) };   // kpiMinCohort mirrors the operator-2026-08-06 MIN_COHORT=1
    },
    getTeammateStatus: { enabled: true, teammates: [
      { name: 'Avery Blake', status: 'clocked_in', isSelf: true },
      { name: 'Sam Ortiz', status: 'on_lunch', isSelf: false },
      { name: 'Nina Patel', status: 'clocked_in', isSelf: false },
      { name: 'Leo Kim', status: 'not_in', isSelf: false }] },
    // A FUNCTION fixture (the dispatcher supports them). Shape mirrors
    // resolveDeptRequest's own return ({success, already}) AND its write:
    // the server flips the row and bumps the DR cache generation
    // (drBumpCacheGen_ in markDeptRequestResolved_), so the next
    // getDeptRequests read reflects it — resolved stays in `mine`, and leaves
    // `incoming`/`allOpen`, which are OPEN-only lists. A static {success:true}
    // would hand the manager reconcile an OPEN row back and visibly revert the
    // card: a fixture artifact that reads exactly like a product bug (INV-185
    // — a fixture must mirror the server, not merely satisfy the caller).
    resolveDeptRequest: function (id) {
      const dr = FIXTURES.getDeptRequests;
      (dr.mine || []).forEach(function (r) {
        if (String(r.requestId) === String(id)) { r.status = 'resolved'; r.resolvedBy = 'avery@umsupply.com'; }
      });
      ['incoming', 'allOpen'].forEach(function (k) {
        if (dr[k]) dr[k] = dr[k].filter(function (r) { return String(r.requestId) !== String(id); });
      });
      return { success: true, already: false };
    },
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
    // Pilot round 2 — the pending payload carries `claim` per item (shape
    // {by, assignedBy, atMs} — Code.js getSpanishInboxPending) + `members` +
    // `self`. All THREE claim states are on camera: unclaimed (Claim button),
    // claimed-by-other (name pill + manager Release/Assign), claimed-by-you
    // ("you" pill). The fixture predating these fields was the round-2 block's
    // named INV-185 gap.
    getSpanishInboxPending: { pending: [
      // Oldest-first (the tab's own sort) — and the CLAIMED item leads, so the
      // Dashboard Spanish card's slide 1 (index 0) carries the pill on camera.
      { threadId: 't2', requester: 'mgarcia@umsupply.com', ageHours: 29, subject: 'Ayuda con formulario de admisión', snippet: 'El paciente necesita ayuda para completar el formulario…', hasMore: true, permalink: 'https://mail.google.com/mail/u/0/#inbox/t2', claim: { by: 'sam@umsupply.com', assignedBy: 'avery@umsupply.com', atMs: Date.now() - 3600000 } },
      { threadId: 't1', requester: 'jrivera@umsupply.com', ageHours: 3.2, subject: 'Paciente pregunta por su pedido', snippet: 'La paciente llama para preguntar cuándo llega…', permalink: 'https://mail.google.com/mail/u/0/#inbox/t1', claim: null },
      { threadId: 't5', requester: 'lchen@umsupply.com', ageHours: 1.1, subject: 'Verificación de seguro', snippet: 'El paciente quiere verificar la cobertura antes de la cita…', permalink: 'https://mail.google.com/mail/u/0/#inbox/t5', claim: { by: 'avery@umsupply.com', atMs: Date.now() - 600000 } },
      // Operator 2026-08-25: an 8x8 voicemail item (kind:'voicemail' — the
      // sender+subject fold) so the VM pill is on camera.
      { threadId: 't7', kind: 'voicemail', requester: 'David Dhruv Mishra', ageHours: 0.6, subject: 'New voicemail from David Dhruv Mishra via A_Q_Spanish', snippet: 'You have a new voicemail. Duration: 1:42…', hasMore: true, permalink: 'https://mail.google.com/mail/u/0/#inbox/t7', claim: null }],
      medianMinutes: 45, truncated: false,
      members: ['avery@umsupply.com', 'sam@umsupply.com', 'ines@umsupply.com'],
      self: 'avery@umsupply.com' },
    // Pilot round 2 — scheduled-call reminders. One upcoming item + one 2h
    // overdue (PAST the 30-min schedTick_ fire window, so the sched-modal
    // scenario shows the overdue tone WITHOUT a sticky toast covering the
    // shot). Shape mirrors getMyScheduledCalls' return map (pinned).
    getMyScheduledCalls: { calls: [
      { id: 'sc-2', whenMs: Date.now() - 2 * 3600000, leadMin: 5, label: 'Call back — J. Rivera · insurance question', status: 'active' },
      { id: 'sc-1', whenMs: Date.now() + 3600000, leadMin: 5, label: 'Translated call — Maria G · TRX 12345', status: 'active' }] },
    // Pilot round 3 — scratchpad + Reference comments (shapes mirror the
    // server returns; pinned like the sched fixture above).
    getMyScratchpad: { content: 'Ext for Dr. Alvarez: x4102\nPAR escalations → Sam\nSpanish glossary doc — bookmark', updatedAtMs: Date.now() - 5400000, maxChars: 40000 },
    // The reader scenario opens this article via the post hook — shape
    // mirrors getReferenceItem's article return (id/title/department/status/
    // type/bodyMd; INV-185).
    getReferenceItem: { id: 'kb-1', title: 'HIPAA refresher', department: 'Billing', status: 'published', type: 'article',
      bodyMd: '# HIPAA refresher\n\nMinimum-necessary rule: share only what the task needs.\n\n- Verify the caller before any PHI\n- Fax cover sheets on every outbound fax' },
    kbGetComments: { comments: [
      { commentId: 'c-1', empId: 'E-1090', name: 'Leo Kim', text: 'The PAR fax number changed last month — worth updating the table.', atMs: Date.now() - 86400000, mine: false },
      { commentId: 'c-2', empId: 'E-1042', name: 'Avery Blake', text: 'Updated — thanks for flagging.', atMs: Date.now() - 3600000, mine: true }],
      total: 2, cap: 100, canModerate: true },
    kbAddComment: { success: true, commentId: 'c-new' },
    kbDeleteComment: { success: true },
    kbEditComment: { success: true },
    getSpanishInboxResolved: { resolved: [
      { threadId: 't3', requester: 'jrivera@umsupply.com', resolver: 'avery@umsupply.com', manual: false, resolveMinutes: 45, resolvedAtMs: Date.now() - 7200000, subject: 'Pregunta sobre facturación', permalink: 'https://mail.google.com/mail/u/0/#inbox/t3' },
      { threadId: 't4', requester: 'lchen@umsupply.com', resolver: 'sam@umsupply.com', manual: true, resolveMinutes: 260, resolvedAtMs: Date.now() - 86400000, subject: 'Cita de seguimiento', permalink: 'https://mail.google.com/mail/u/0/#inbox/t4' }],
      // Resolution-share chart (2026-08-17): members incl. one who resolved
      // nothing, so the zero-bar row is on camera.
      members: ['avery@umsupply.com', 'sam@umsupply.com', 'ines@umsupply.com'],
      truncated: false },
    getSpanishInboxStats: { address: 'spanishcalls@universalmedsupply.com', days: 30, pending: 3, resolved: 12, avgMinutes: 78, medianMinutes: 45, membersConfigured: 3, threadsScanned: 15, truncated: false },
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
      // INV-185: the client reads `workedHoursByDate` (the server's field name)
      // — this fixture shipped as `hoursByDate` and the calendar's corner hour
      // badges silently never rendered in any timeoff screenshot.
      return { year: year, month: month, monthName: monthNames[month - 1] + ' ' + year, firstDayOfWeek: firstDow, lastDay: lastDay, today: todayLocal, workedHoursByDate: hours, workedDates: worked,
        timeOffRequests: [{ date: year + '-' + m2 + '-28', type: 'Full Day', status: 'Approved', submittedAt: todayLocal + ' 09:00:00', notes: 'Family visit' },
                          { date: year + '-' + m2 + '-30', type: 'Half Day - Morning', status: 'Pending', submittedAt: todayLocal + ' 10:00:00', notes: '' }],
        allRequests: [{ date: year + '-' + m2 + '-28', type: 'Full Day', status: 'Approved', submittedAt: todayLocal + ' 09:00:00' },
                      { date: year + '-' + m2 + '-30', type: 'Half Day - Morning', status: 'Pending', submittedAt: todayLocal + ' 10:00:00' }],
        teammates: [], holidays: [], annualLeave: 11.5, sickLeave: 10, ptoEnabled: true, annualLeaveMax: 15,
        // Accrual variant on camera (operator 2026-08-19): a positive column-Q
        // rate flips the tile to the accruing framing — the rate in its real
        // terms plus the server-computed month-to-date earning. Field names
        // mirror the server payload exactly (INV-185); the legacy
        // fixed-allotment tile is source-pinned (blank Q = byte-identical).
        ptoAccrualPer80: 3.08, ptoAccrualBasisHours: 80, ptoHoursPerDay: 8,
        ptoAccrualMtd: { hours: 96, days: 0.46 } };
    },
    // Pay-period side-rail block (always-on since the 2026-08-18 Time/PTO
    // consolidation). Shape mirrors buildTimesheetForEmployee_'s return:
    // {startDate, endDate, days[{date, dayLabel, isWeekend, isToday, isFuture,
    // hasData, clockIn/adjClockIn, lunchOut/adjLunchOut, lunchIn/adjLunchIn,
    // clockOut/adjClockOut, hoursWorked, isIncomplete, inProgress}],
    // totalHours, daysWorked, incompleteCount, payCycle, payAnchor, timezone}.
    getTimesheetData: function (startDate, endDate) {
      var days = []; var total = 0; var worked = 0; var incomplete = 0;
      var DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      var MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      var cur = new Date(startDate + 'T00:00:00Z');
      var end = new Date(endDate + 'T00:00:00Z');
      while (cur <= end) {
        var ds = cur.toISOString().slice(0, 10);
        var dow = cur.getUTCDay(); var wk = dow === 0 || dow === 6;
        var future = ds > todayIso; var isToday = ds === todayIso;
        var has = !wk && !future && !isToday;
        var inc = has && cur.getUTCDate() % 9 === 0;   // one incomplete day on camera
        var hrs = (has && !inc) ? 8.5 : null;
        if (hrs != null) { total += hrs; worked++; }
        if (inc) incomplete++;
        days.push({ date: ds, dayLabel: DAY_ABBR[dow] + ', ' + MN[cur.getUTCMonth()] + ' ' + cur.getUTCDate(),
          isWeekend: wk, isToday: isToday, isFuture: future, hasData: has,
          clockIn: has ? '08:02:00' : null, adjClockIn: false,
          lunchOut: has ? '12:00:00' : null, adjLunchOut: false,
          lunchIn: has ? '12:30:00' : null, adjLunchIn: false,
          clockOut: (has && !inc) ? '17:02:00' : null, adjClockOut: false,
          hoursWorked: hrs, isIncomplete: inc, inProgress: false });
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      return { startDate: startDate, endDate: endDate, days: days, totalHours: total, daysWorked: worked,
        incompleteCount: incomplete, payCycle: 'Monthly', payAnchor: '', timezone: 'America/Chicago' };
    },
    // Pay statement (cycle-18 batch 8 — the manager branch finally has a UI, and
    // the statement had never had a fixture at all, so it was unmeasurable).
    // A FUNCTION of BOTH arguments per the F14 rule (INV-185): the period
    // shifts with `offset` and `viewingOther` appears only when a repEmpId is
    // passed — a static object would render "current" under a pressed "2 back"
    // and would make the manager view unshootable. Shape mirrors
    // getMyPayStatement's return exactly; days come from the getTimesheetData
    // fixture so there is ONE day-row generator, not two that can disagree.
    getMyPayStatement: function (offset, repEmpId) {
      // seams-18 F3: the period comes from the VERBATIM payPeriodRange_ copy
      // above — never a hand-rolled month arithmetic (INV-185).
      var range = payPeriodRange_('Monthly', null, todayIso, offset);
      var ts = FIXTURES.getTimesheetData(range.start, range.end);
      var rate = 18.5;
      var rid = String(repEmpId || '').trim();
      return {
        period: { start: ts.startDate, end: ts.endDate, cycle: 'Monthly', offset: range.offset },
        days: ts.days, totalHours: ts.totalHours, daysWorked: ts.daysWorked,
        incompleteCount: ts.incompleteCount, timezone: ts.timezone,
        pto: [{ date: range.start.substring(0, 8) + '12', type: 'Full Day', days: 1 }],
        rate: rate, estGross: Math.round(ts.totalHours * rate * 100) / 100,
        archiveNote: false, maxOffset: 6,
        viewingOther: rid ? { id: rid, name: 'Priya Raman' } : null,
      };
    },
    getManagerDashboard: (function () {
      function spark(n, base) { var a = []; for (var i = n; i >= 1; i--) a.push({ date: daysAgo(i), count: (i * base) % 4 }); return a; }
      function rh() { var a = []; for (var i = 7; i >= 1; i--) a.push({ date: daysAgo(i), hours: [8.5, 9, 0, 8.75, 9, 8.5, 4][i - 1] }); return a; }
      // The server's liveStatus rows carry `id`, NOT `empId` (getManagerDashboard's
      // return block) — the drift made every Day-Edit button in every manager
      // screenshot render data-emp-id="undefined", and surfaced only when the
      // batch-8 pay-statement button was clicked in a real browser. INV-185.
      function ls(name, status, t, tz, abbr) { return { id: 'E-' + name.length + '0' + t, name: name, status: status,
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
    // Punctuality (operator 2026-08-18 width round — the tab had never been
    // shot). Shape mirrors getPunctualityReport's return block: {from, to,
    // grace, reps[{id,name,tz,startMin,days,onTime,late,onTimePct,avgLate,
    // worst,lunchOnTimePct}]}, least punctual first.
    getPunctualityReport: {
      from: daysAgo(29), to: todayIso, grace: 5,
      reps: [
        { id: 'E-1090', name: 'Leo Kim',     tz: 'America/Chicago', startMin: 480, days: 18, onTime: 12, late: 6, onTimePct: 67, avgLate: 14, worst: 41, lunchOnTimePct: 88 },
        { id: 'E-1088', name: 'Sam Ortiz',   tz: 'Asia/Manila',     startMin: 510, days: 20, onTime: 17, late: 3, onTimePct: 85, avgLate: 6,  worst: 12, lunchOnTimePct: 95 },
        { id: 'E-1042', name: 'Avery Blake', tz: 'Asia/Kolkata',    startMin: 480, days: 21, onTime: 20, late: 1, onTimePct: 95, avgLate: 4,  worst: 4,  lunchOnTimePct: null },
        { id: 'E-1077', name: 'Nina Patel',  tz: 'America/Chicago', startMin: 480, days: 19, onTime: 19, late: 0, onTimePct: 100, avgLate: 0, worst: 0,  lunchOnTimePct: 100 },
      ],
    },
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
    kbGetReviewDue: { items: [{ id: 'kb-2', title: 'OOP payment policy', department: 'Billing', ageDays: 120, views: 14, staleFlags: 1, staleNote: 'Rates changed in July', comments: 2 }], total: 1, cap: 40, dueDays: 90 },
    kbGetUsageStats: { items: [{ id: 'kb-1', title: 'HIPAA refresher', count: 22, drawerCount: 9, helpful: 4, notHelpful: 0, comments: 2 }], windowDays: 30 },
    kbGetContentRequests: { open: [], resolved: [], openCount: 0 },
    kbGetRelated: { items: [] },
    kbRecordView: { ok: true },
    // Pre-pilot observability (operator 2026-08-13) — fire-and-forget beacons
    // + the Admin Overview usage aggregate (INV-185: field names mirror the
    // server's viewUsageAggregate_ / getViewUsageStats shapes).
    recordClientError: { success: true },
    recordViewEnter: { success: true },
    getViewUsageStats: { url: '', truncated: false, stats: {
      views: [
        { view: 'callNotes', n7: 61, n30: 240, reps30: 7 },
        { view: 'clock', n7: 44, n30: 180, reps30: 8 },
        { view: 'metricsMyStats', n7: 12, n30: 55, reps30: 6 },
        { view: 'timeoff', n7: 8, n30: 31, reps30: 5 },
      ],
      reps: [
        { empId: 'E-101', n30: 88, topView: 'callNotes' },
        { empId: 'E-102', n30: 64, topView: 'clock' },
      ],
      totals: { n7: 125, n30: 506, reps7: 8, reps30: 8 },
    } },
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
    // getOnboardingPanel's return site (INV-185). Covers every roster
    // readiness state: fully-ready, needs-provisioning, blank manager, and
    // unknown manager email. CDR readiness rides the sibling fixture below.
    getOnboardingPanel: {
      reps: [
        { id: 'E-1042', name: 'Avery Blake', email: 'avery@example.invalid', timezone: 'Asia/Kolkata',
          tzValid: true, enrolled: true, managerEmail: 'robin@example.invalid', managerEmailKnown: true,
          isManager: true },
        { id: 'E-1090', name: 'Leo Kim', email: 'leo@example.invalid', timezone: 'Asia/Manila',
          tzValid: true, enrolled: false, managerEmail: 'robin@example.invalid', managerEmailKnown: true,
          isManager: false },
        { id: 'E-1091', name: 'Nina Patel', email: 'nina@example.invalid', timezone: 'America/Chicago',
          tzValid: true, enrolled: true, managerEmail: '', managerEmailKnown: false,
          isManager: false },
        { id: 'E-1088', name: 'Sam Ortiz', email: 'sam@example.invalid', timezone: 'America/Chicago',
          tzValid: true, enrolled: true, managerEmail: 'ghost@example.invalid', managerEmailKnown: false,
          isManager: false },
      ],
      // {id,name,incomplete} since 2026-08-08 — an offboarded row (kept its
      // roster data) vs a hand-stubbed one (ID reserved, never usable).
      offboarded: [{ id: 'E-1099', name: 'Jo Tran', incomplete: false },
                   { id: 'E-1120', name: 'Pat Rivera', incomplete: true }],
      managers: ['robin@example.invalid'],
      departments: ['Billing', 'Shipping', 'Resupply', 'Intake'],
      timezones: ['America/Chicago', 'Asia/Kolkata', 'Asia/Manila'],
      hasBiweeklyAnchor: true, anchorOwner: 'Avery Blake',
      // The panel no longer carries CDR readiness — it is a second-stage read
      // (getOnboardingCdrReadiness) so the roster panel paints immediately.
      cdr: { deferred: true },
      callerEmail: 'avery@example.invalid',
    },
    // Mirrors getOnboardingCdrReadiness's return site (INV-185): seen names +
    // an alias suggestion for the one the phone system spells differently.
    getOnboardingCdrReadiness: {
      ok: true, from: daysAgo(6), to: todayIso,
      seen: { 'Avery Blake': true, 'Sam Ortiz': true },
      alias: { 'Leo Kim': 'Kim, Leo' },
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
        { action: 'TimesheetArchive', last: null },
        { action: 'PtoAccrualCredit', last: { timestampMgr: daysAgo(0) + ' 06:00:03', ms: Date.now() - 7200000, notes: 'credited=2' } }],
      // F4: stamped last-errors for jobs that catch their own failure. Empty on
      // a healthy deployment — the shape, not a fault, is what the panel reads.
      automationErrors: {},
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
