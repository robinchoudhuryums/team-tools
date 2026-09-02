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
      isManager: true, isAdmin: true, canSeeSpanish: true, canSeeQa: true, departments: ['Billing'],
      timezone: 'Asia/Kolkata', timezoneAbbr: 'IST',
      schedule: { startMin: 480, lengthMin: 540, breaks: [{ label: 'B1', startMin: 630, lenMin: 15 }, { label: 'Lunch', startMin: 750, lenMin: 30 }, { label: 'B2', startMin: 900, lenMin: 15 }], breakReminderMin: 5 },
      // F2 (cycle 18) — the reminder ticker's day-off gate. Mirrors the server
      // field (INV-185); false = a normal working day, the scenario's intent.
      offToday: false,
      // Operator 2026-08-31 — today's PENDING punch-adjustment requests. EMPTY
      // is the common case (and what every existing scenario should show); the
      // `?pendingadj=1` hook below seeds one so the Clock chip is shootable
      // without putting a rare state in every clock screenshot.
      pendingAdjustments: [],
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
    // The editor file-drop: a FUNCTION, because the response shape depends on
    // the file it was handed (text -> article, other -> embed) and the client
    // branches on `kind`.
    kbIngestFile: function (p) {
      var name = (p && p.name) || 'file';
      var title = name.replace(/\.[a-z0-9]+$/i, '');
      if (/\.(md|markdown|txt|text)$/i.test(name)) {
        return { success: true, kind: 'article', title: title, warnings: [],
          markdown: '# ' + title + '\n\nIngested from an uploaded file.' };
      }
      if (/\.csv$/i.test(name)) {
        return { success: true, kind: 'article', title: title,
          warnings: ['A CSV becomes a table for READING. If this is a lookup the app should QUERY (like the payor table), import it under Admin → Config → Reference data tables instead.'],
          markdown: '| Payor | Status |\n| --- | --- |\n| Aetna | In-Network |' };
      }
      if (/\.docx$/i.test(name)) {
        return { success: true, kind: 'article', title: title, converted: true,
          warnings: ['2 image(s) marked for export'], markdown: '# ' + title + '\n\nConverted from a Word document.' };
      }
      return { success: true, kind: 'embed', title: title,
        driveUrl: 'https://drive.google.com/file/d/mock-upload/view',
        warnings: ['Attached as an embedded file — readable in the app, but only its TITLE is searchable. Convert it to a Google Doc or Sheet in Drive and re-drop it to get a full article.'] };
    },
    // Operator 2026-08-25 — Reference data tables (Admin → Config). Shapes
    // mirror getKbDataTables / kbImportDataTable's dryRun summary exactly.
    getKbDataTables: { tables: [{ key: 'InsurancePayors', tab: 'InsurancePayors',
      label: 'Insurance payor acceptance', describe: 'Payor / plan rows behind the Reference insurance lookup',
      rows: 1035, cols: 25, present: true }] },
    kbImportDataTable: function (key, b64, opts) {
      var dry = !opts || opts.dryRun !== false;
      var base = { tab: 'InsurancePayors', label: 'Insurance payor acceptance', rows: 1035, cols: 25,
        headers: ['Payor / Plan', 'Waystar Payor ID', 'Network Status', 'Qualifaction', 'Reimbursement'],
        sample: [], duplicateNames: ['Wellcare (rows 656, 858)'], blankNameRows: [587], blankNameCount: 2,
        warnings: [], replacingRows: 1035 };
      return dry ? Object.assign(base, { dryRun: true }) : Object.assign(base, { imported: true });
    },
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
        from: 'Avery Blake <teamtools@umsupply.com>',
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
        { requestId: 'r1', toDept: 'Shipping', label: 'Verified Shipping', createdAt: daysAgo(0) + ' 09:12', byName: 'Avery Blake', status: 'open', elapsedMin: 72, elapsedWallMin: 190, slaBusiness: true, slaStatus: 'ontime', slaHours: 48 },
        { requestId: 'r2', toDept: 'Billing', label: 'Close Order', createdAt: daysAgo(2) + ' 10:40', byName: 'Avery Blake', status: 'open', elapsedMin: 1102, elapsedWallMin: 2900, slaBusiness: true, slaStatus: 'overdue', slaHours: 24 },
        { requestId: 'r3', toDept: 'Resupply', label: 'Repeat Resupply', createdAt: daysAgo(1) + ' 14:05', byName: 'Avery Blake', status: 'open', elapsedMin: 551, elapsedWallMin: 1450, slaBusiness: true, slaStatus: 'atrisk', slaHours: 48 },
        { requestId: 'r4', toDept: 'Billing', label: 'OOP Order', createdAt: daysAgo(3) + ' 11:20', byName: 'Avery Blake', status: 'resolved', elapsedMin: 84, elapsedWallMin: 220, slaBusiness: true, resolvedBy: 'sam@umsupply.com' }],
      incoming: [
        { requestId: 'r5', toDept: 'Billing', label: 'Close Order', createdAt: daysAgo(0) + ' 08:30', byName: 'Nina Patel', status: 'open', elapsedMin: 122, elapsedWallMin: 320, slaBusiness: true, slaStatus: 'ontime', slaHours: 24 }],
      allOpen: [
        { requestId: 'r6', toDept: 'Resupply', label: 'Repeat Resupply', createdAt: daysAgo(4) + ' 09:00', byName: 'Leo Kim', status: 'open', elapsedMin: 2204, elapsedWallMin: 5800, slaBusiness: true, slaStatus: 'overdue', slaHours: 48 }],
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
    // QA module Phase 1 (2026-08-27). Shape mirrors getQaQueue's return block
    // (INV-185): base {members, self, isManager, folderConfigured} +
    // {recordings, total, cap}. All three status tones + an assigned-to-you
    // and an assigned-to-other pill are on camera; one card carries a
    // comment count.
    getQaQueue: {
      members: ['qa.reviewer@umsupply.com', 'teamtools@umsupply.com'],
      self: 'teamtools@umsupply.com', isManager: true, folderConfigured: true,
      // Phase 2 additive fields: per-item `agent`, plus `agentOptions` (roster
      // names for the detail's datalist) + `criteria` (the scorecard seed) on
      // the base — shapes mirror the server's return block (INV-185).
      agentOptions: ['Ana Reyes', 'David Dhruv Mishra', 'Maria Garcia'],
      criteria: [
        { key: 'greeting',      label: 'Greeting & opening' },
        { key: 'communication', label: 'Communication & tone' },
        { key: 'accuracy',      label: 'Accuracy & process' },
        { key: 'resolution',    label: 'Resolution & next steps' },
        { key: 'compliance',    label: 'Compliance (verification, disclosures)' },
      ],
      // Phase 3 additive per-item field: `sharedMs` (0 = not shared).
      recordings: [
        { fileId: 'qaFileAaaaaaaa1', name: '2026-08-26 inbound 555-0141.mp3', sizeBytes: 6291456, mime: 'audio/mpeg', createdMs: Date.now() - 86400000, status: 'new', assignee: '', url: 'https://drive.google.com/file/d/qaFileAaaaaaaa1/view', agent: '', comments: 0, sharedMs: 0 },
        { fileId: 'qaFileBbbbbbbb2', name: '2026-08-25 resupply follow-up.mp3', sizeBytes: 11534336, mime: 'audio/mpeg', createdMs: Date.now() - 172800000, status: 'in_review', assignee: 'teamtools@umsupply.com', url: 'https://drive.google.com/file/d/qaFileBbbbbbbb2/view', agent: 'Ana Reyes', comments: 3, sharedMs: 0 },
        { fileId: 'qaFileCccccccc3', name: '2026-08-22 close order review.wav', sizeBytes: 28311552, mime: 'audio/wav', createdMs: Date.now() - 432000000, status: 'done', assignee: 'qa.reviewer@umsupply.com', url: 'https://drive.google.com/file/d/qaFileCccccccc3/view', agent: 'Maria Garcia', comments: 5, sharedMs: Date.now() - 86400000 },
      ],
      total: 3, cap: 200,
    },
    // QA Phase 2 — per-agent stats (shape mirrors getQaStats' return block:
    // agents rows from qaStatsAggregate_ incl. the visible '(unassigned)'
    // bucket and a null per-criterion average rendering as an em dash).
    getQaStats: {
      agents: [
        { agent: 'Maria Garcia', recordings: 4, reviewed: 3, scorecards: 3, avgScore: 4.3,
          perCriterion: { greeting: 4.7, communication: 4.3, accuracy: 4, resolution: 4.3, compliance: 4.5 } },
        { agent: 'Ana Reyes', recordings: 3, reviewed: 1, scorecards: 1, avgScore: 3.8,
          perCriterion: { greeting: 4, communication: 3.5, accuracy: 4, resolution: null, compliance: 3.5 } },
        { agent: '(unassigned)', recordings: 2, reviewed: 0, scorecards: 0, avgScore: null,
          perCriterion: { greeting: null, communication: null, accuracy: null, resolution: null, compliance: null } },
      ],
      criteria: [
        { key: 'greeting',      label: 'Greeting & opening' },
        { key: 'communication', label: 'Communication & tone' },
        { key: 'accuracy',      label: 'Accuracy & process' },
        { key: 'resolution',    label: 'Resolution & next steps' },
        { key: 'compliance',    label: 'Compliance (verification, disclosures)' },
      ],
      totalRecordings: 9, totalScorecards: 4, truncated: false,
      // Phase 3 — calibration rows (qaCalibration_ shape: recordings scored by
      // 2+ reviewers, spread desc, per-reviewer means + widest criterion gap).
      calibration: [
        { fileId: 'qaFileCccccccc3', name: '2026-08-22 close order review.wav',
          reviewers: [{ name: 'QA Reviewer', avg: 4.6 }, { name: 'Team Tools', avg: 3.4 }],
          spread: 1.2, maxCritSpread: 2, maxCritKey: 'compliance' },
        { fileId: 'qaFileBbbbbbbb2', name: '2026-08-25 resupply follow-up.mp3',
          reviewers: [{ name: 'QA Reviewer', avg: 4 }, { name: 'Team Tools', avg: 3.8 }],
          spread: 0.2, maxCritSpread: 1, maxCritKey: 'communication' },
      ],
    },
    // QA detail fixtures (follow-on 2026-08-28 — the standing "detail needs
    // chunked audio the mock cannot serve" gap, closed): ONE chunk of a real
    // 1-second 8 kHz 8-bit WAV (generated tone with a fade, so Chromium
    // decodes it and the Phase-2 waveform renders real shape). Shapes mirror
    // the server return blocks (INV-185): qaGetAudioChunk {success, b64,
    // chunkIndex, chunks, size, mime}; qaListComments {comments[],
    // canModerate}; qaListScorecards {scorecards[], criteria, selfEmpId}.
    qaGetAudioChunk: { success: true, b64: 'UklGRmQfAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUAfAAB/f39/f39/f39/fn5+fn5+fn5+f39/f39/f39/fn5+fX19fn5+f3+AgICAgH9/fn59fX19fX1+f4CAgYGBgIB/fn19fHx8fH1+f4CBgYKBgYB/fn18fHt7fHx9f4CBgoKCgoGAfn18e3p6e3x9foCBgoODg4KAf318e3p6ent8foCBg4OEg4KBf318enl5eXp8foCBg4SEhIOCgH58enl4eXp7fX+Bg4WFhYSCgH58enh4eHl6fX+Bg4WGhoWDgX58eXh3d3h6fH+BhIWGhoaEgn98eXd2dnd5e36BhIaHh4aFgn98eXd2dXZ4en2BhIaHiIeGg4B9end1dXV3eX2Ag4aIiYiHhIF9end1dHR2eXyAg4aIiYmIhYJ+end1c3R1eHt/g4aJioqJhoJ/e3d0c3N0d3p+goaJiouJh4N/e3d0cnJzdXl9goaJi4uKiISAfHd0cnFydHh8gYWJi4yLiYaBfHh0cXBxc3d7gIWJjI2MioeCfXh0cXBwcnZ6f4SJjI2Ni4iDfnl0cW9vcXV5f4SJjI6OjImEf3p1cW9ucHN4fYOIjI6PjYqGgHp1cW5ub3J3fIKIjI+Qj4uHgXt2cW5tbnF1e4GHjI+QkI2Ignx2cW5sbXB0eoCGjI+RkY6KhH13cm5sbG5zeX+Gi4+Sko+LhX54cm5ra21xd36Fi4+SkpCMh4B5c25ramxwdn2Eio+Sk5KOiIF6c25qaWtvdHuCiY+TlJOPiYN7dG5qaWptc3qBiI+TlZSQi4R8dW9qaGlscXiAiI6TlZWSjYZ+dm9qaGhrcHd+ho2TlpaTjod/d3BqZ2dpbnV9hY2SlpeUkImBeHFrZ2ZobXN7hIySlpeWkYuCenJrZ2Vna3J6gouSlpiXk4yEe3NsZ2VmaXB4gYqRlpmYlI6GfXRsZ2RkaG52f4iQlpmZlpCIfnVtZ2RkZ2x0foePlpmal5GKgHduZ2NjZWtzfIaOlZqbmZOLgnhvaGNiZGlxeoSNlZqcmpWNhHpwaWNhY2dveIKMlJqcm5ePhnxyaWNhYWZtdoCLk5qdnJiRiH5zamRgYGRrdH+JkpmdnZqTin91a2RgX2Jpcn2HkZmdnpuVjIJ3bWVgXmFncHqGkJidn52XjoR4bmVgXmBlbniEjpedoJ6ZkIZ6b2ZgXV5jbHaCjZadoJ+akoh8cWdgXV1ianSAi5WdoaCclYp+c2hhXFxgZ3J9iZScoaGel4yBdWphXFteZW97h5OboaKfmY+Dd2tiXFpdY215hZGboaOhm5GFeW1jXFpbYWt2g4+ZoaSinZOIe29kXVlaX2h0gY2YoKSjnpaKfXFlXVlZXmZyf4uXoKSkoJiNgHNnXllYXGRvfImVn6SlopqPgnVoX1lXWmJteoeUnqSmo5yShXdqYFlWWWBqd4WSnaSnpZ6Uh3lsYVlWV11odIKQm6SnpqGXinxuYlpVVlxlcoCOmqOop6KZjX5wZFpVVVpjb32MmKKoqaScj4FzZVtVVFhgbHqJl6GoqaaekoR1Z1xVU1ZeaniHlaCoqqiglYd4aV5WU1VcZ3WEk5+nq6mil4p6bF9WUlNaZHKBkJ2mq6qkmox9bmFXUlJYYm9+jpumq6ymnY+AcGJYUlFWX2x8i5qlq6yon5KDc2RZUlBUXWl5iZijq62qopWGdmdaUk9SWmZ2hpWiq66spJiJeWlcU09RWGRzg5Ogqq6tppuMe2tdU05PVmFwgJCfqa+uqJ6Pf25fVE5OVF5sfY6dqK+vqqCSgnFhVU5NUltpeoubp66wrKOVhXRkV09MUFlmd4iYpa6xrqaYiHdmWE9MTlZjc4WWpK2ysKibi3ppWlBLTVRgcIKToq2ysaqej31rXFFLS1JdbX+QoKyysqyhkoBuXlJLSk9aanuNnqqys6+klYRxYVNLSU5YZniKm6mxtLCnmId0Y1VMSUxVY3SHmaextbKpnIp4ZldNSEpSYHGElqWwtbSsn457aVlNSElQXW2Ak6OvtbWuopF+bFtPSEdOWmp9kKGutbawpZWCb11QSEZMV2Z5jZ6stbeyqJiGcmBSSEZKVGN2iZyrtLi0q5yJdmNTSUVIUWByhpmps7i2rZ+NeWZWSkVGTlxugpamsri3sKKRfWlYS0VFTFlrf5Kksbi5sqaUgGxaTUVESlZne4+hsLi6tKmYhHBdTkVDSFNjd4yfrri7tqybiHNgUEZCRlBgc4icrLe7uK6fjHdjUkdCRE1cb4SZqra7urGjkHtmVEhCQktZa4CVp7W7u7Smk35qV0lCQUhVaH2SpbO7vLapl4JtWktCQEZSZHmOorG7vbism4ZxXU1CP0RPYHWKn6+6vrqvn4p1YE9DP0JMXHGHnK25vryyo454Y1FEP0BJWW2DmKu4v761ppJ8Z1RGPz9HVWl/lai2vr+4qpaBalZHPz5EUmV6kaW1vsC6rZqFblpJPz1CTmF2jaKzvcG8sJ6Jcl1LQDxAS11yiZ+wvMG+s6KNdmBOQTw+SFluhZuuu8HAtqaRemRQQjw9RVVqgZerusHBuaqVfmdTRDw7Q1FlfJSouMHCu62ag2tWRjw6QE5heJCltsHDvrGeh29aSD05PktddIuitMDEwLSijHRdSj45PEdZb4eesb/EwremkHhhTT85O0VVa4Oar73Ew7qqlHxlUEE5OUJRZ3+WrLvExL2tmYFpU0M5OD9OYnqSqLnExr+xnYVtVkU6Nz1KXnaOpbfDxsG0oYpxWkc7NjtHWnGKobXCx8O4pY51Xko8NjlEVmyFnbLAx8W7qZN6Yk09NjdBUmiBma+/x8e+rZd+ZlA/NjY+TmN8lay9x8jAsZyDalNBNzU7Sl94kai7xsnDtaCIbldEODQ5R1tzjKW4xcnFuKWNc1pGOTQ3Q1ZuiKG1xMrHu6mRd15JOjM1QFJpg52ywsrIvq2WfGNMPDQ0PU5lf5ivwMnKwbGbgWdQPjQzOkpgepSrvsnLxLWfhmtTQDUyOEZcdY+ou8jMxriki3BXQzYxNkNXcIukucfMyLyoj3VbRjcxNEBTa4agtsXMyr+slHpfSTkxMjxPZoGbssPMzMKxmX5kTDsxMTpKYnyXr8HLzcW1noNoUD0yMDdHXXeSq7/Lzse4o4htVEAzLzVDWHKNp7zJzsq8p41yWEM0LzI/VG2Jo7nIzsu/rJJ3XEY2LjE8T2iEnrbGzs3DsJd8YUk4Ly85S2N+mrLEzs/GtJyBZU06Ly42R155la7CzdDIuKGGalE8MC00Q1l0kKq/zNDLvKaLb1U/MSwxP1Vvi6a8y9HNwKuQdFlCMywvPFBqhqK5ydHPw6+WeV5GNSwuOUxlgZ21x9HQxrObfmJJNy0sNkdgfJiyxdDRybighGdNOS4rM0Nbd5Ouws/Sy7yliWxSPC8rMD9WcY6pv87Tzr+pjnFWPzAqLjxRbImlvMzT0MOulHdaQzIqLDhNZ4SgucrT0cazmXxfRjQqKzVIYn6btcjS08m3noFkSjYrKjJEXHmWscXS1My7o4dpTjksKTBAV3SRrcLQ1c+/qIxuUzwtKC08U26MqL/P1dHDrZF0Vz8vKCs4TmmHo7zN1dPGspd5XEMxKCo1SWSBn7jL1dTKtpx/YUczKSgyRV58mrTI1NXMuqGEZks2KicvQFl2lLDG09bPv6aKa085KyctPFRxj6vC0dfRwquPcVQ8LCYqOU9riqe/0NfUxrCVdllALiYpNUpmhKK7ztfVyrWafF5EMScnMkZgf523y9bXzbqfgWNIMycmL0FbeZezydXY0L6lh2hMNiglLD1Wc5KvxdTY0sKqjW5ROSolKjlRbo2qwtLZ1MavknNWPSwkKDVMaIelvtDZ1sm0mHlbQS4lJjJHYoGgus7Y2M24nX9gRTAlJS9CXXybtsvX2dC9o4RlSTMmJCw+WHaVssjW2tLBqIprTjYoIyk6UnCQrcXV2tXFrZBwUjopIyc2TWqKqMHT2tfJspV2Vz0rIyUySGWEo77R2tjMt5t8XUEuIyQvRF9/nrnO2drQvKGBYkYwJCMsP1p5mLXL2NvSwKaHZ0ozJSIpO1Rzk7DI19vVxKuNbU83JyEnN09tjavE1dzXyLCTc1Q6KSElM0pnh6bB09zZzLWZeVk+KyIjL0VigaG80dvbz7qefl9DLiIiLEBcfJy4ztrc0r+khGRHMSMhKTxWdpazy9nd1cOpimpMNCUgJzhRcJCvx9fd18evkHBROCcgJTRMaoqpxNXd2cu0lnZWOykgIzBHZISkv9Pd28+5nHxcQCshIS1CXn+fu9Dc3NK9ooFhRC4iICo9WXmZt83b3dXCp4dnSTEjHyc5U3OTssrZ3tfGrY1tTjUkHyQ1Tm2NrcbY3trKspNyUzknHyIxSWeIp8LV3tvOt5l4WD0pHyEtRGGCor7T3t3RvJ9+XkEsIB8qP1t7nLrQ3d7UwaWFZEYvIR4nOlV1l7XN29/XxaqLaUsyIx4lNlBvkbDJ2t/aybCRb1A2JB4iMktpi6rF19/czbWXdVU6Jx4hLkVjhaXB1d/d0bqde1s+KR8fK0Fef5+80t7f1L+igmBDLB8eKDxYeJq4z93g18OoiGZIMCEdJTdScpSzzNvg2ciujmxNMyMdIzNNbI6uyNng28yzlHJSNyUdIS9IZoioxNfg3c+4mnhYOycdHyxCYIKjv9Tf39O9oH9dQCoeHik+Wnudu9He4NbCpoVjRS0fHSY5VXWXts7d4dnGq4tpSjEhHCM1T2+Rscrb4dvKsZFvTzUjHCExSmmLq8bZ4d3Otpd1VTklHB8tRWOFpsLW4N/Su517Wj0oHR4qQF1/oL3U4ODVwKOCYEIrHhwmO1d4mrnQ3uHYxKmIZkcuHxwkNlJylLTN3eHbya6ObEwyIRshMkxsjq7J2+LdzbSUclE2JBwfLkdmiKnF2OHf0bmaeFc7JhweK0JggqPA1eHg1L6gfl0/KR0cJz1ae5270t/h18OmhWNELB4cJThUdZe2z97i2sesi2lJMCAbIjRPb5Gxy9zi3MuxkW9PNCIbIDBJaYusx9ri3s+2l3VUOCQbHixEY4Wmw9fh4NO8nXtaPSccHSk/XX+gvtTg4dbAo4JgQSodHCY6V3iaudHf4tnFqYhmRi4fGyM2UXKUtM3d4tvJr45sTDIhGyEyTGyOr8nb4t3NtJRyUTYjGx8uRmaIqcXZ4t/RuZp4VzolGx0qQWCCo8HW4eHVvqB+XT8oHBwnPFp7nbzT4OLYw6aFY0QsHhskOFR1l7fP3uLax6yLaUkwHxsiNE5vkbHM3eLdzLGRb04zIhsfL0lpi6zH2uLfz7eXdVQ4JBseLERjhabD2OLg07yde1o8JxwcKD9df6C+1eHh1sGjgmBBKh0bJTpXeJq50d/i2cWpiGZGLh4bIzZRcpS0zt7i28qvjmxMMSAbIDFMbI6vydvi3s20lHJRNiMbHy5GZoipxdni39G5mnhXOiUbHSpBYIKjwdbh4dW+oH5dPygcHCc8WnudvNPg4tjDpoVjRCweGyQ4VHWXt8/e4trHrItpSTAgGyI0Tm+Rscvc4tzLsZFvTjQiGyAwSWmLrMfa4t7Pt5d1VDgkGx4sRGOFpsPX4eDTvJ17Wj0nHB0pP11/oL7U4OHWwKOCYEEqHRwmOld4mrnR3+LZxamIZkcuHxsjNlFylLTN3eLbya6ObEwyIRshMkxsjq7J2+LdzbSUclE2IxsfLkdmiKnF2OHf0bmaeFc6JhweK0JggqPA1uHg1L6gfl0/KR0cKD1ae5270t/h18KmhWNELB4cJThUdZe2z97h2cesi2lJMCAbIjRPb5Gxy9zi3MuxkW9PNCIcIDBJaYurx9nh3s+2l3VUOSUcHy1EY4Wmwtfh39K7nXtaPSgdHSlAXX+gvdPf4NXAo4JgQiseHSc7V3iauNDe4djEqIhmRy8gHCQ3UnKUs8zc4drIro5sTDMiHCIzTGyOrsja4dzMs5RyUjckHCAvR2aIqMTX4N7QuJp4VzsnHR8sQmCCo7/U39/TvaB+XUAqHh4pPlp7nbvR3uDWwqWFY0UuIB0mOVV1l7XO3ODYxquLaUoxIh0kNU9vkbDK2uDayrCRb081JB0iMUppi6vG2ODczbWXdVU6Jh0gLkVjhaXB1d/e0bqde1s+KR4fK0Fef5+80t7e1L+igmBDLCAeKDxYeJq4z9zf1sOoiGZIMCEeJjhTcpSyy9vf2cetjmxNNCMeIzRNbI6tx9jf2suylHJTOCYeIjBIZoiow9bf3M63mXhYPCkfIC1DYYKivtPe3dG8n39eQSwgHyo/W3ucudDc3tTApYVkRi8iHyg7VnWWtMzb3tbEqotqSzMjHyU3UHCQr8jZ3tnIr5BwUDcmHyQzS2qKqsTW3trMtJZ2VjsoICIwRmSEpMDT3dvPuZx8W0ArISEtQl5+n7vQ3NzSvaGBYUQuIiAqPll5mbbN2t3UwqeHZ0kyJCAoOVRzk7HJ2N3WxayNbU42JiAmNk5tjazF1t3YybGTc1Q6KCAkMkpnh6fB1NzazLaZeVk+KyEjL0VhgaG90dvbz7qef19DLiIiLEFcfJu4ztrb0r+khGRIMSQhKjxXdpazytjc1MOpimpNNSYhKDlScJCuxtbc1saukHBSOSgiJjVNaoqpwtTb2MqzlnZXPSsiJTJIZYSjvtHa2c23m3xcQS0jJC9EX3+euc7Z2s+8oIFiRjElIyw/WnmYtcvY2tLApodoSzQmIyo8VXOTsMfW2tTDq41tUDgoIyg4UG2Nq8PU2tXHr5JzVTwrIyc1S2iHpb/R2dfKtJh5WkAtJCYyR2KBoLvO2NjNuJ1/YEUwJSUvQ118m7bL19jPvKKEZUk0JyQtP1h2lbHI1dnRwKeKa043KSQrO1Nwj6zE09jTxKyPcFM7KyUpOE5riqfA0djVx7GVdlg/LSUoNEpmhKK8ztfWyrWafF5DMCYnMkZgfp23y9bWzLmfgWNIMygmL0JbeZezyNTXz72kh2hNNykmLT5Wc5KuxNPX0cGpjG5SOywmLDtSboypwdDW0sSuknNXPi4nKjdNaYekvc7W08eyl3lcQzEoKTVJY4GfuMvV1Mq2nH9hRzMpKDJFXnyZtMjT1cy6oYRmSzcqKDBBWnaUr8XS1c6+polsUDosKC4+VXGPqsHQ1dDBqo9xVT4uKC07UGyJpr3N1NHEr5R2WkIxKSs4TGeEobnL09LHs5l8X0Y0Kis1SGJ+m7XI0tPJt56BZEo3LCozRF15lrDF0dPLuqOGaU86LSoxQVh0kazBz9PNvqeMb1Q+LyovPlRvjKe+zdLOwauRdFhBMisuO09qhqK6ytLPxLCWeV1FNCwtOEtlgZ22x9HQxrSbfmJKNy0sNkhgfJixxM/RyLefhGdOOi4sNERbd5Otwc7RyrukiW1SPTAsMkFXco6ovszRzL6ojnJXQTItMT5TbYmkusnQzcGsk3dcRTUtMDtPaISftsfPzsOwmHxhSTcuLzlLY3+assTOzsW0nIFmTTowLzdHX3mVrsHMz8e3oYZrUT4yLzVEWnSQqb7Lzsm6pYtwVkEzLzRBVnCLpbrIzsq9qZB1WkU2LzI+UmuGoLbGzcvArZV6X0g4MDI8TmaBm7PDzMzCsZl/ZEw7MTE6S2J8l67By8zEtJ6DaVE+MzE4R113kqq9yczGt6KIblVBNTE2RFlyjaa6x8zHuqaNcllFNzE1QlVuiKG3xcvIvaqSd15IOTI0P1Jpg52zw8rJv62WfGJMPDM0PU5lfpivwMnJwbGagWdQPzUzO0tgepSrvcjKw7SfhmxUQjYzOUhcdY+nusbJxLejinBYRTg0OEVYcYqitsTJxbmmj3VdSDo0N0JVbIWes8LIxryqk3phTD01NkBRaIGar7/Hx76tl35mUD82Nj5OZHyVq7zGx8Cwm4NqVEI4Nj1LYHiRp7nEx8Gzn4hvWEU6NjtIXHOMo7bCx8K2o4xzXEk8NzpGWG+Hn7PAxsO4p5B4YEw+NzlEVWuDm6++xcS6qpR8ZFBAOTlCUWd/lqy7xMS8rZiBaVNDOjlATmN6kqi4wsS+sJyFbVdGOzk+TF92jqS2wcS/s6CJcVtJPTk9SVtyiaCyv8TAtaOOdl9MPzo8R1hthZyvvcPBt6eSemNQQjs8RVVpgZisusLBuaqWf2hTRDw8Q1JmfJOouMDBu62Zg2xXRz08Qk9ieI+ktb/BvK+dh3BbSj88QU1edIugsr3BvbKgi3RfTUE8QEpbcIecr7vAvrSjj3hjUEM9P0hYbIOYq7m/vrank3xnU0U+P0dVaH+UqLa+vreploFrV0g/PkVSZXqQpLS9vrmsmoVvWktBP0RQYXaMobG7vrqunYhzXk5DP0NOXnOIna65vruwoIx3YlFFQEJMW2+Emau3vbuyo5B7ZlRHQUJKWGuAlai1vLu0ppN+aldJQkJIVmh9kqSyu7u1qZeCbVpMQ0JHU2R5jqGwubu2q5qGcV5PRUJGUWF1ip2tt7u3rZ2KdWJRR0JFT15xhpqqtbq4r6CNeWVUSUNFTVxugpans7m4sKORfWlXS0RFTFlrf5Kksbi4sqWUgGxbTUZFS1dne4+hr7e4s6eXhHBeUEdFSlRkd4udrLW4tKqah3RhUklFSVJhdIeaqbO3taudi3dlVUtGSFFfcISXprG3ta2gjntoWE1HSE9cbYCTo6+2ta6ikX5sW09ISE5aan2QoK20tbCklIJvXlFJSE1YZ3mMnauztbCml4VzYVRLSExWZHaJmqixtLGomol2ZVZNSUxUYnOFl6WvtLKqnIx5aFlOSktTX3CCk6Ous7Krn499a1xRS0tRXW1/kKCrsrKsoZKAbl9TTEtQW2p7jZ2psLKto5SDcmJVTUtQWWd4ipqnr7GupZeGdWVXT0xPWGV1hpekrbGuppmJeGhaUU1PVmJyg5Siq7CvqJyMe2tdU05OVWBvgJGfqa+vqZ6Pfm5fVU9OVF5tfY2cp66vqqCSgnFiV1BPU11qeoqZpayuqqGUhHRlWVFPUltod4eXo6uuq6OWh3doW1NQUlpldISUoKmtq6SZinprXlVRUlhjcoGRnqesq6WbjX1uYFdRUldib3+Om6Wrq6acj4BxY1lTUldgbXyLmaOqq6eekYNzZltUUlZeanmIlqGoqqeflIV2aF1VU1VdaHaFk5+nqqihloh5a19XVFVcZnSDkZ2lqaiimIp8bmFZVFVbZXGAjpqjqKijmY1+cGRbVlVaY299i5ihp6ijm4+Bc2ZcV1ZZYm17iZWgpqeknJGEdmlfWFZZYGt4hpOdpKeknZOGeGthWldZX2l2g5Cbo6aknpWIe25jW1hZXmh0gY6ZoaWkn5aKfXBlXVlZXWZyfouXn6SkoJiMgHNnX1pZXWVwfImVnqOkoJmOgnVqYFtZXGRueoeSnKKjoZqQhHhsYlxaXGJseISQmqCjoZuShnpuZF5bXGJqdoKOmJ+ioZyTiHxxZl9cXGFpdICLlp2hoZyVin5zaGFdXGBocn2Jk5ugoJ2WjIF1a2NeXWBncHuHkZqfoJ2XjoN3bWRfXWBmb3mFj5idn52Yj4V5b2ZgXmBlbXeDjZacn52YkIZ7cWhiX2BkbHaAi5Sbnp2Zkoh+c2pjYGBka3R/iZKZnZ2Zk4p/dWxlYWBjanJ9h5CXnJyalIuBd25mYmFjaXF7hY6WmpyalI2DeXBoY2FjaHB5g4yUmZualY6Fe3JqZGJjaG93gYqSmJqalo+GfXNsZmNkZ252f4mRlpmZlpCIfnVtZ2RkZ211foePlZmZlpGJgHdvaWVkZ2xzfIWNlJeYlpGKgnlxamZlZ2tye4OLkpaYlpKLg3tybGdmZ2txeYKKkJWXlpKMhXx0bWlmZ2tweICIj5SWlpONhn52b2pnZ2pwd3+GjZKVlZOOh393cGtoaGpvdX2FjJGUlZOOiIF5cm1paGpudXyDipCTlJOPiYJ6dG5qaWpudHuCiY6SlJOPioN8dW9ramtuc3mAh42Rk5KPioR9dnFta2tucnh/hoyQkpKPi4V+eHJua2tucnd+hIqPkZGPi4aAeXNvbGxucXd9g4mNkJGPjIeBe3VwbW1ucXZ8goiMj5CPjIeCfHZybm1ucXV7gYaLjo+PjIiDfXdzcG5vcXV6gIWKjY+OjIiDfnl0cW9vcXR5f4SIjI6OjImEf3p1cnBwcXR5foOHi42NjImFgHt2c3FwcXR4fYKGioyNjImFgXx3dHJxcnR4fIGFiYuMi4mGgX15dXNycnR3e4CEiIqLi4mGgn56dnRyc3R3e3+DhomKiomGgn57d3Rzc3R3en6ChYiJioiGg397eHV0dHV3en2BhIeJiYiGg4B8eXZ1dHV3en2AhIaIiIiGg4B9end2dXZ3eXyAg4WHiIeGhIF+e3h3dnZ3eXx/goSGh4eGhIF+e3l3d3d4eXx/gYOFhoaFhIF/fHp4d3d4enx+gIOEhYWFg4F/fXt5eHh4enx+gIKDhIWEg4F/fXt6eXl5enx9f4GDhISEg4GAfnx7enl6enx9f4GCg4ODgoGAfn17enp6e3x9f4CBgoODgoGAfn18e3t7e3x9foCBgYKCgYGAf359fHx7fHx9fn+AgYGBgYCAf359fXx8fH19fn+AgICAgIB/f35+fX19fX1+fn9/f4CAgH9/f35+fn5+fn5+fn9/f39/f39/f35+fn5+fn5+fg==', chunkIndex: 0, chunks: 1, size: 8044, mime: 'audio/wav' },
    qaListComments: {
      comments: [
        { commentId: 'qc-1', empId: 'E-201', name: 'QA Reviewer', atSec: 12, text: 'Verified both identifiers unprompted — strong opening.', createdMs: Date.now() - 172800000, mine: false },
        { commentId: 'qc-2', empId: 'E-100', name: 'Team Tools', atSec: 41, text: 'Recap went by fast here; the patient asked for the tracking number twice.', createdMs: Date.now() - 86400000, mine: true },
      ],
      canModerate: true,
    },
    qaListScorecards: {
      scorecards: [
        { fileId: 'qaFileBbbbbbbb2', empId: 'E-201', name: 'QA Reviewer', createdMs: Date.now() - 86400000,
          notes: 'Great verification discipline — slow the shipping recap down.',
          ratings: { greeting: 5, communication: 4, accuracy: 5, resolution: 4, compliance: 5 } },
      ],
      criteria: [
        { key: 'greeting',      label: 'Greeting & opening' },
        { key: 'communication', label: 'Communication & tone' },
        { key: 'accuracy',      label: 'Accuracy & process' },
        { key: 'resolution',    label: 'Resolution & next steps' },
        { key: 'compliance',    label: 'Compliance (verification, disclosures)' },
      ],
      selfEmpId: 'E-100',
    },
    // QA Phase 3 — the agent-facing My Reviews tab (shape mirrors
    // getMyQaReviews' return block: shared+name-scoped recordings with folded
    // latest scorecards + active comments, plus the live criteria).
    getMyQaReviews: {
      recordings: [
        { fileId: 'qaFileCccccccc3', name: '2026-08-22 close order review.wav',
          createdMs: Date.now() - 432000000, sharedMs: Date.now() - 86400000,
          scorecards: [
            { name: 'QA Reviewer', createdMs: Date.now() - 172800000, notes: 'Great verification discipline — slow down on the shipping recap so the patient can write the tracking number down.',
              ratings: { greeting: 5, communication: 4, accuracy: 5, resolution: 4, compliance: 5 } },
          ],
          comments: [
            { atSec: 42, text: 'Strong opening — verified both identifiers unprompted.', name: 'QA Reviewer' },
            { atSec: 305, text: 'Recap went by fast here; the patient asked for the tracking number twice.', name: 'QA Reviewer' },
          ] },
        { fileId: 'qaFileDddddddd4', name: '2026-08-18 intake call.mp3',
          createdMs: Date.now() - 777600000, sharedMs: Date.now() - 604800000,
          scorecards: [], comments: [] },
      ],
      criteria: [
        { key: 'greeting',      label: 'Greeting & opening' },
        { key: 'communication', label: 'Communication & tone' },
        { key: 'accuracy',      label: 'Accuracy & process' },
        { key: 'resolution',    label: 'Resolution & next steps' },
        { key: 'compliance',    label: 'Compliance (verification, disclosures)' },
      ],
    },
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
      { threadId: 't3', requester: 'jrivera@umsupply.com', resolver: 'avery@umsupply.com', manual: false, resolveMinutes: 45, resolveWallMinutes: 1180, resolvedAtMs: Date.now() - 7200000, subject: 'Pregunta sobre facturación', permalink: 'https://mail.google.com/mail/u/0/#inbox/t3' },
      { threadId: 't4', requester: 'lchen@umsupply.com', resolver: 'sam@umsupply.com', manual: true, resolveMinutes: 260, resolveWallMinutes: 3040, resolvedAtMs: Date.now() - 86400000, subject: 'Cita de seguimiento', permalink: 'https://mail.google.com/mail/u/0/#inbox/t4' }],
      // Resolution-share chart (2026-08-17): members incl. one who resolved
      // nothing, so the zero-bar row is on camera.
      members: ['avery@umsupply.com', 'sam@umsupply.com', 'ines@umsupply.com'],
      truncated: false },
    getSpanishInboxStats: { address: 'spanishcalls@universalmedsupply.com', days: 30, pending: 3, resolved: 12, avgMinutes: 78, medianMinutes: 45,
      // Business-hours figures (operator 2026-08-31) — deliberately SMALLER
      // than the wall-clock pair beside them, which is the whole point of the
      // change and the thing a screenshot must show.
      avgBusinessMinutes: 52, medianBusinessMinutes: 31, businessCount: 12,
      businessHours: { startMin: 480, endMin: 1020, weekdaysOnly: true },
      membersConfigured: 3, threadsScanned: 15, truncated: false },
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
          // Every break pair, mirroring buildTimesheetForEmployee_ (INV-185).
          breaks: has ? [{ out: '12:00:00', in: '12:30:00' }] : [],
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
    // Day Edit's prefill read (A4, 2026-09-01). It had NO fixture, so the
    // modal was unshootable and the four-slot → N-pair rebuild would have gone
    // on camera empty. A FUNCTION of the date arguments per the F14 rule, and
    // the day shape mirrors buildTimesheetForEmployee_'s own push literal —
    // scalars for the legacy readers PLUS the `breaks` list (INV-185).
    // Deliberately a TWO-break day: that is the case the old modal collapsed.
    getEmployeeTimesheetForManager: function (empId, start, end) {
      return {
        days: [{
          date: start, dayName: 'Tue',
          clockIn: '08:00:00', clockOut: '21:00:00',
          lunchOut: '12:00:00', lunchIn: '12:30:00',
          breaks: [{ out: '12:00:00', in: '12:30:00' }, { out: '17:00:00', in: '19:00:00' }],
          hours: 11.5, incomplete: false, isAdjustment: false, timeOff: null,
        }],
        totalHours: 11.5, daysWorked: 1,
      };
    },
    managerGetPendingAdjustments: { requests: [] },
    // Team punches calendar (operator 2026-08-31). A FUNCTION of the month
    // argument (the F14 rule — the client asks for whatever month is on
    // screen, and a static object would only ever cover one). Rep-row keys
    // mirror getTeamCalendar's own repRows.push literal (INV-185; pinned).
    // Weekdays get the same three punched rows (Leo Kim stays absent so the
    // muted "no punches" merge row is on camera); every 5th day lists him off.
    getTeamCalendar: function (month) {
      var y = parseInt(month.slice(0, 4), 10), m = parseInt(month.slice(5, 7), 10);
      var reps = [
        { id: 'E-1042', name: 'Avery Blake', clockIn: '08:02:00', adjClockIn: false, lunchOut: '12:00:00', adjLunchOut: false, lunchIn: '12:30:00', adjLunchIn: false, clockOut: '17:01:00', adjClockOut: false, breaks: [{ out: '12:00:00', in: '12:30:00' }], hours: 8.48, incomplete: false, inProgress: false, punchCount: 4 },
        { id: 'E-1077', name: 'Nina Patel', clockIn: '07:58:00', adjClockIn: false, lunchOut: '11:45:00', adjLunchOut: false, lunchIn: '12:15:00', adjLunchIn: false, clockOut: '16:59:00', adjClockOut: true, breaks: [{ out: '11:45:00', in: '12:15:00' }, { out: '15:00:00', in: '15:10:00' }], hours: 8.35, incomplete: false, inProgress: false, punchCount: 6 },
        { id: 'E-1088', name: 'Sam Ortiz', clockIn: '08:31:00', adjClockIn: false, lunchOut: null, adjLunchOut: false, lunchIn: null, adjLunchIn: false, clockOut: null, adjClockOut: false, breaks: [], hours: null, incomplete: true, inProgress: false, punchCount: 1 },
      ];
      var days = {}, last = new Date(y, m, 0).getDate();
      for (var d = 1; d <= last; d++) {
        var dow = new Date(y, m - 1, d).getDay();
        if (dow === 0 || dow === 6) continue;
        // Most days are complete (green); only every 7th carries the
        // incomplete rep, so the amber tint reads as the EXCEPTION it is
        // rather than painting the whole month.
        var r = JSON.parse(JSON.stringify(reps));
        if (d % 7 !== 0) { r[2].clockOut = '17:04:00'; r[2].hours = 8.55; r[2].incomplete = false; r[2].punchCount = 2; }
        days[month + '-' + ('0' + d).slice(-2)] = {
          reps: r,
          off: (d % 5 === 0) ? [{ name: 'Leo Kim', type: 'Full Day', status: (d % 10 === 0) ? 'pending' : 'approved' }] : [],
        };
      }
      return { month: month, days: days, holidays: {}, rosterCount: 4, adjustWindowDays: 30, archiveNote: false };
    },
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
      // Break-schedule editor (operator 2026-08-27) — shape mirrors
      // breakSchedulesAdminView_'s return (INV-185): DEFAULT first, one
      // CUSTOM per-tz section (editable rows on camera) + one inherited.
      breakSchedules: {
        schedules: [
          { key: 'DEFAULT', custom: false, breaks: [
            { label: 'Morning break', start: '10:30', len: 15 },
            { label: 'Lunch', start: '12:30', len: 60 },
            { label: 'Afternoon break', start: '15:00', len: 15 }] },
          { key: 'Asia/Manila', custom: true, breaks: [
            { label: 'Merienda', start: '15:30', len: 20 },
            { label: 'Lunch', start: '12:00', len: 45 }] },
        ],
        reminderMin: 10, configReminderMin: 10,
        rosterTimezones: ['America/Chicago', 'Asia/Kolkata', 'Asia/Manila'],
      },
      featureFlags: {
        registry: [
          { key: 'showTeammateStatus', label: 'Teammate status card', description: 'Show the teammate status card on the Clock page.', default: true, scope: 'both' },
          { key: 'voiceInput', label: 'Voice dictation (Call Notes)', description: 'Mic-to-text on the Issue / Resolution fields.', default: false, scope: 'client', danger: 'Routes audio outside the BAA boundary.' },
          { key: 'managerDailyBrief', label: 'Manager daily brief', description: 'One consolidated morning email per manager.', default: false, scope: 'server' }],
        values: { showTeammateStatus: true, voiceInput: false, managerDailyBrief: false },
      },
      kbAi: { dailyCap: 3, model: 'claude-haiku-4-5', models: ['claude-haiku-4-5', 'claude-sonnet-5'], hasKey: false, spend: { date: todayIso, usd: 0, calls: 0 } },
    },
    // Team Notes (callNotesManage) — the manager surface, never shot until
    // 2026-08-31. Item keys MIRROR callNoteRowToObject_'s return plus the two
    // fields managerAggregateFlagged_ attaches (repId/repName) — INV-185: a
    // paraphrase here drifts and the screenshot then lies with confidence.
    managerGetTrainingQueue: { flagType: 'training', skippedReps: [], results: [
      { noteId: 'n-tq1', timestamp: daysAgo(0) + 'T09:14:00', dateLocal: daysAgo(0),
        callback: '(555) 123-4567', caller: 'Dana Reyes', relationship: 'Patient',
        patientAndTrx: 'M. Alvarez · TRX-88421', issue: 'Asked whether a replacement cushion needs a new order.',
        transferredTo: '', resolution: 'Told them I would check and call back.',
        flagType: 'training', emailedAt: '', emailDepartments: '',
        subform: { trainingQuestion: 'Does a cushion swap need a new order, or can it ride the existing one?' },
        rowIndex: 12, repId: 'E-1042', repName: 'Avery Blake' },
      { noteId: 'n-tq2', timestamp: daysAgo(1) + 'T15:02:00', dateLocal: daysAgo(1),
        callback: '(555) 998-2010', caller: 'Priya Nair', relationship: 'Caregiver',
        patientAndTrx: 'R. Okafor · TRX-90117', issue: 'Insurance changed mid-cycle.',
        transferredTo: 'Billing', resolution: 'Escalated to Billing.',
        flagType: 'training', emailedAt: daysAgo(1) + 'T15:20:00', emailDepartments: 'Billing',
        subform: { trainingQuestion: 'Which team owns a mid-cycle payor change?',
          trainingReply: 'Billing owns it — log the note and transfer.',
          trainingReplyBy: 'robin@umsupply.com', trainingReplyAt: daysAgo(0) + 'T08:40:00' },
        rowIndex: 31, repId: 'E-1088', repName: 'Sam Ortiz' }] },
    managerGetReviewCandidates: { flagType: 'review', skippedReps: [], results: [
      { noteId: 'n-rv1', timestamp: daysAgo(2) + 'T11:33:00', dateLocal: daysAgo(2),
        callback: '(555) 771-0044', caller: 'Marcus Webb', relationship: 'Patient',
        patientAndTrx: 'M. Webb · TRX-77310', issue: 'Long call — patient upset about a delayed shipment.',
        transferredTo: '', resolution: 'Apologised, confirmed the new ship date.',
        flagType: 'review', emailedAt: '', emailDepartments: '',
        subform: { reviewComment: 'Not sure I handled the escalation well — worth a listen.' },
        rowIndex: 44, repId: 'E-1090', repName: 'Leo Kim' }] },
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
    // Admin -> Sheets (2026-09-01 follow-on): the sub-tab had NO fixture at any
    // viewport, so its scenario rendered a loader and its "0 overflow" meant
    // nothing. A FUNCTION of viewKey, not a frozen object (INV-185's F14 rule):
    // the key decides label/columns/rows/legend, so a static fixture would show
    // the AuditLog rows under whichever label the picker last selected. Field
    // names mirror adminSheetView_auditLog_ / adminSheetViewBuild_'s return
    // sites; the rows cover all four row tones plus the neutral default.
    getAdminSheetView: function (viewKey) {
      var url = 'https://docs.google.com/spreadsheets/d/FIXTURE/edit#gid=0';
      var row = function (n, tone, cells) {
        return { cells: cells, tone: tone, rowUrl: url + '&range=A' + n };
      };
      if (viewKey === 'kb') {
        return {
          ok: true, viewKey: 'kb', label: 'Knowledge Base \u00b7 KB', storeUrl: url,
          columns: [
            { key: 'title', label: 'Title' }, { key: 'dept', label: 'Department' },
            { key: 'type', label: 'Type' }, { key: 'updated', label: 'Updated' },
            { key: 'reviewed', label: 'Reviewed' }],
          rows: [
            row(14, '', { title: 'Shipping escalation path', dept: 'Shipping', type: 'article', updated: daysAgo(3), reviewed: daysAgo(3) }),
            row(13, 'warn', { title: 'PAP resupply eligibility', dept: 'Resupply', type: 'article', updated: daysAgo(140), reviewed: '' }),
            row(12, '', { title: 'Payor acceptance legend', dept: 'Billing', type: 'embed', updated: daysAgo(9), reviewed: daysAgo(9) })],
          truncated: false,
          legend: [{ tone: 'warn', label: 'review due (90d+)' }],
        };
      }
      if (viewKey === 'trainingAssign' || viewKey === 'trainingComplete') {
        var isAssign = viewKey === 'trainingAssign';
        return {
          ok: true, viewKey: viewKey, storeUrl: url,
          label: isAssign ? 'Training \u00b7 Assignments' : 'Training \u00b7 Completions',
          columns: isAssign
            ? [{ key: 'item', label: 'Item' }, { key: 'target', label: 'Assigned to' },
               { key: 'assignedAt', label: 'Assigned' }, { key: 'due', label: 'Due' },
               { key: 'revoked', label: 'Revoked' }]
            : [{ key: 'item', label: 'Item' }, { key: 'emp', label: 'Employee' },
               { key: 'completedAt', label: 'Completed' }, { key: 'via', label: 'Via' }],
          rows: isAssign
            ? [row(8, '', { item: 'kb:kb-1', target: '*', assignedAt: daysAgo(6), due: daysAgo(-8), revoked: '' }),
               row(7, 'muted', { item: 'kb:kb-2', target: 'E-1088', assignedAt: daysAgo(30), due: daysAgo(-1), revoked: daysAgo(4) })]
            : [row(5, '', { item: 'kb:kb-1', emp: 'Avery Blake', completedAt: daysAgo(2), via: 'read' }),
               row(4, '', { item: 'quiz:q-1', emp: 'Sam Ortiz', completedAt: daysAgo(5), via: 'quiz' })],
          truncated: false,
          legend: isAssign ? [{ tone: 'muted', label: 'revoked' }] : [],
        };
      }
      return {
        ok: true, viewKey: 'auditLog', label: 'AuditLog \u00b7 ADP', storeUrl: url,
        mgrTzAbbr: 'CST',
        columns: [
          { key: 'ts', label: 'Time' }, { key: 'action', label: 'Action' },
          { key: 'rep', label: 'Employee' }, { key: 'actor', label: 'Actor' },
          { key: 'notes', label: 'Detail' }],
        rows: [
          row(982, 'danger', { ts: daysAgo(0) + ' 04:12:00', action: 'PunchDelete', rep: 'Sam Ortiz',
            actor: 'robin@umsupply.com', notes: 'duplicate collapsed (sheet doctor)' }),
          row(981, 'warn', { ts: daysAgo(0) + ' 03:58:41', action: 'PersonalSheetSyncFail', rep: 'Leo Kim',
            actor: 'system', notes: 'ClockIn: personal Sheet unreachable' }),
          row(980, 'info', { ts: daysAgo(0) + ' 02:00:07', action: 'CallNotesArchive', rep: '', actor: 'system',
            actorEmail: '', notes: 'rowsArchived=412; reps=7' }),
          row(979, '', { ts: daysAgo(1) + ' 17:44:19', action: 'TimeOffStatusChange', rep: 'Avery Blake',
            actor: 'robin@umsupply.com', notes: 'Pending -> Approved; annual -1.0' }),
          row(978, '', { ts: daysAgo(1) + ' 16:02:40', action: 'CallNoteTrainingReply', rep: 'Sam Ortiz',
            actor: 'robin@umsupply.com', notes: 'noteId=note-9' })],
        truncated: true,
        legend: [
          { tone: 'danger', label: 'destructive' },
          { tone: 'warn', label: 'degradation' },
          { tone: 'info', label: 'automation' }],
      };
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
        { key: 'QA_SS_ID', label: 'QA (recordings)', status: 'warn', detail: 'Optional — unset (no fallback store, by design — INV-196)' },
        { key: 'digests', label: 'Digest heartbeats', status: 'warn', detail: 'No heartbeat recorded yet (fresh deploy)' }],
      summary: { ok: 4, warn: 3, fail: 0 },
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
      clientErrors: { count: 0, last24h: 0, recent: [], windowDays: 7, url: '' },
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
          store('QA (recordings)', 'QaRecordings index + QaComments + QaScorecards', 'QA/HR-adjacent',
            'Review-record purge disabled (QA_REVIEW_RETENTION_DAYS unset/0) — review records kept', 'QA_SS_ID'),
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
  // The agent-facing scoped audio endpoint serves the SAME chunk shape as the
  // reviewer one (both delegate to qaAudioChunkFor_ server-side — INV-185),
  // so the fixture is an alias of the real WAV chunk above.
  FIXTURES.getMyQaReviewAudioChunk = FIXTURES.qaGetAudioChunk;

  // `?pendingadj=1` — seeds a pending punch-adjustment request so the Clock
  // view's awaiting-approval chip renders on camera (the state the operator
  // reported as invisible). Not a missing fixture; a deliberate variant.
  try {
    if (/[?&]pendingadj=1/.test(window.location.search)) {
      FIXTURES.getEmployeeState.pendingAdjustments = [{ punchType: 'ClockIn', time: '08:30' }];
      FIXTURES.getEmployeeState.punches = [];
      FIXTURES.getEmployeeState.nextActions = ['ClockIn', 'Adjust'];
    }
  } catch (e) {}

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
  // Design handoff C7 (2026-09-02) — the populated-AND-empty fixture rule:
  // `?fixture=empty` makes every RPC that has an entry in EMPTY_FIXTURES
  // return that (its genuinely-empty shape) instead of the populated fixture,
  // so a block's empty state is shootable without a second fixture object per
  // RPC. An RPC with NO empty entry keeps its populated fixture — so the mode
  // is additive and a scenario never turns into a loader. Entries land with
  // the block that owns them (Coaching / Needs-you / Admin all-clear …); a
  // Node pin lists the blocks that owe one. The rule exists because the same
  // gap surfaced three times (getMyCoaching `{items:[]}`, the Admin all-clear
  // path, the Needs-you empty state) — see CLAUDE.md's Visual Audit Stage.
  var FIXTURE_MODE = (function () {
    try {
      var m = /[?&]fixture=([^&]+)/.exec(window.location.search);
      return m ? decodeURIComponent(m[1]) : '';
    } catch (e) { return ''; }
  })();
  var EMPTY_FIXTURES = {
    // getCoachingDashboard / getMyCoaching / getMyPendingTasks join here with
    // their blocks (PRs 3-4). PR 2 (Admin): the two health payloads in their
    // ALL-CLEAR shape — every count zero, every store configured + reachable +
    // tz-matched, no likely name mismatches — so the System tab's "Nothing
    // needs attention" state is shootable. The populated fixtures above carry
    // one warning per area on purpose (a likely mismatch, an unset FORMS_SS_ID).
    getAutomationHealth: {
      syncFails: { count: 0, recent: [], windowDays: 30 },
      automationLastRuns: [{ action: 'CallNotesReconcile', last: { timestampMgr: daysAgo(0) + ' 05:00:12', ms: Date.now() - 3600000, notes: 'rowsBackfilled=0' } }],
      automationErrors: {},
      digests: [
        { key: 'eod', last: daysAgo(0) + ' 17:00:04', stale: false },
        { key: 'urgent', last: daysAgo(0) + ' 08:00:11', stale: false },
        { key: 'weekly', last: daysAgo(3) + ' 08:00:09', stale: false },
        { key: 'trainingOverdue', last: daysAgo(0) + ' 07:00:08', stale: false },
        { key: 'deptReqReminder', last: daysAgo(0) + ' 10:00:14', stale: false },
        { key: 'managerBrief', last: daysAgo(0) + ' 08:00:02', stale: false },
        { key: 'selfTest', last: daysAgo(0) + ' 01:00:21', stale: false }],
      cdr: { ok: true, from: daysAgo(7), to: todayIso, rowsMatched: 96, columnWarning: null, transferColumnWarning: null,
        unmatchedAgents: ['Ada Tran', 'Casey Lund'], rosterWithNoCdr: ['Robin Choudhury'], likelyMismatches: [],
        queueInventory: { ok: true, from: daysAgo(7), to: todayIso, queues: [], sentinels: [], transferCols: [], rowsScanned: 900, rowsInWindow: 120,
          agentDateRows: { max: 1, multiCount: 0, sampleMulti: [] }, truncated: false, error: null } },
      detectors: [{ key: 'cnTimestamp', label: 'CN timestamp boundary round-trip', ok: true, detail: '' }],
      clientErrors: { count: 0, last24h: 0, recent: [], windowDays: 7, url: '' },
      witnessFails: { count: 0, lastAt: null, lastAction: '', recent: false },
      selfTest: { date: daysAgo(0), mode: 'smoke', pass: 74, fail: 0, skip: 0, error: '', note: '', running: false, startedAt: null, stuck: false },
      intakeCatalog: { ok: true, totalRows: 22, errors: [], warnings: [] },
      auditScanComplete: true, managerTzAbbr: 'CST', auditLogUrl: 'https://docs.google.com/spreadsheets/d/example#gid=3',
    },
    getStorageHealth: {
      configTimezone: 'Asia/Kolkata', adpLocale: 'en_US',
      stores: [
        { label: 'Time Clock / ADP', role: 'Roster, Timesheet, TimeOffRequests, shared AuditLog', cls: 'Payroll', retention: 'Kept', prop: 'ADP_SS_ID',
          source: 'Script Property', note: '', configured: true, reachable: true, name: 'ADP (live)', tz: 'Asia/Kolkata', tzMatch: true, locale: 'en_US', url: 'https://docs.google.com/spreadsheets/d/example' },
        { label: 'Knowledge Base + Training', role: 'KB, KbViews, Training/Quiz tabs', cls: 'PHI-free', retention: 'Kept', prop: 'KB_SS_ID',
          source: 'Script Property', note: '', configured: true, reachable: true, name: 'KB (live)', tz: 'Asia/Kolkata', tzMatch: true, locale: 'en_US', url: 'https://docs.google.com/spreadsheets/d/example' },
        { label: 'Call Notes (per-rep)', role: '2 enrolled rep Sheet(s)', cls: 'PHI', retention: 'Optional purge', prop: 'Employees col L (CallNotesSheetId)',
          source: 'roster', note: '', configured: true, reachable: true, name: '', tz: '', tzMatch: null, url: '', perRep: { enrolled: 2, reachable: 2, tzMismatch: 0, problems: [] } }],
      kbEmbeds: { total: 1, probed: 1, reachable: 1, broken: [], truncated: false },
    },
  };
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
            var fx = (FIXTURE_MODE === 'empty' && Object.prototype.hasOwnProperty.call(EMPTY_FIXTURES, name))
              ? EMPTY_FIXTURES[name] : FIXTURES[name];
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
