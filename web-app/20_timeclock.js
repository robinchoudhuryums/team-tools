// ════════════════════════════════════════════════════════════════════════════
//  UMS TEAM TOOLS — 20_timeclock.js
//  Time Clock: punches, the timesheet, time off and PTO, accrual, shifts and
//  breaks, coverage, punctuality, the ADP export and the manager day editor.
//
//  ONE Apps Script project, ONE global scope: these files are the SERVER, in
//  the load order `web-app/.clasp.json` filePushOrder declares. Batch F2 split
//  them out of Code.js as a MOVE — every declaration below is byte-identical to
//  the one it replaced, and the SPLIT-MANIFEST pin proves it.
// ════════════════════════════════════════════════════════════════════════════

/** Parse the optional column-Q accrual rate — PTO HOURS earned per
 *  CONFIG.PTO_ACCRUAL_BASIS_HOURS hours worked (3.08 per 80 for the PH team).
 *  Fail-safe: a typo'd cell degrades to null = no accrual (the
 *  parseShiftOverride_ posture). The 40 ceiling is a sanity bound — half the
 *  basis would already be an extraordinary policy. */
function empPtoAccrual_(cell) {
  // Parse the FIRST numeric token, not a digit-strip. The old strip form was
  // safe only while the natural annotation carried no digits ("1.25 d/mo");
  // under the hours rule the obvious way to write this cell is "3.08 h/80h",
  // which digit-stripping turns into 3.0880 → parseFloat 3.088 — a silently
  // WRONG rate feeding real balance credits. Caught by the pin, fixed here.
  const m = /(\d+(?:\.\d+)?)/.exec(String(cell == null ? '' : cell));
  const n = m ? parseFloat(m[1]) : NaN;
  return (isFinite(n) && n > 0 && n <= 40) ? n : null;
}
/** PURE (Node-pinned): the days of PTO earned by `hoursWorked` at
 *  `ratePerBasis` hours per `basisHours` worked, converted to the DAYS the
 *  balance column stores. Returns {ptoHours, days} at 2dp, or null when any
 *  input is unusable — a caller must never turn "cannot compute" into 0
 *  (INV-187 / the INV-176 lesson). Zero hours worked is a legitimate 0. */
function accrualDaysForHours_(hoursWorked, ratePerBasis, basisHours, hoursPerDay) {
  // null / undefined / '' must NOT reach Number() — it coerces them to 0, which
  // is indistinguishable from a real "worked nothing" month and would be
  // credited (and audited) as an earned zero rather than an unreadable one
  // (INV-176 / INV-187). A genuine 0 stays valid below.
  if (hoursWorked === null || hoursWorked === undefined || hoursWorked === '') return null;
  const h = Number(hoursWorked), r = Number(ratePerBasis);
  const b = Number(basisHours), d = Number(hoursPerDay);
  if (!isFinite(h) || h < 0) return null;
  if (!isFinite(r) || r <= 0) return null;
  if (!isFinite(b) || b <= 0) return null;
  if (!isFinite(d) || d <= 0) return null;
  const ptoHours = h * (r / b);
  return { ptoHours: +ptoHours.toFixed(2), days: +(ptoHours / d).toFixed(2) };
}
/** Coercion-safe read of the column-R 'yyyy-MM' stamp: Sheets may coerce it
 *  to a Date (the normalizeDate_ class), and a coerced-then-cached copy reads
 *  back as 'yyyy-MM-dd' — both recover to the leading yyyy-MM. Garbage → ''. */
function accrualStampYm_(cell) {
  if (cell instanceof Date) return normalizeDate_(cell).slice(0, 7);
  const m = /^(\d{4}-\d{2})/.exec(String(cell == null ? '' : cell).trim());
  return m ? m[1] : '';
}
function accrualMonthsToCredit_(stampYm, nowYm) {
  const idx = (ym) => {
    const m = /^(\d{4})-(\d{2})$/.exec(String(ym == null ? '' : ym));
    if (!m) return null;
    const mo = +m[2];
    return (mo >= 1 && mo <= 12) ? (+m[1] * 12 + (mo - 1)) : null;
  };
  const now = idx(nowYm);
  if (now === null) return null;
  const prev = now - 1;
  const ymOf = (i) => Math.floor(i / 12) + '-' + String((i % 12) + 1).padStart(2, '0');
  const st = idx(stampYm);
  if (st === null) return { months: 0, newStamp: ymOf(prev), capped: 0, seeded: true };
  // A stamp AHEAD of last month is a DELIBERATE operator skip -- "treat these
  // months as already settled" -- and it is the ONE lever the operator has over
  // this feature (CLAUDE.md tells them to use it). Returning ymOf(prev) here
  // REWOUND it: the caller writes newStamp whenever it differs from the stored
  // stamp, so the same-day run rewrote the cell backwards and the next month's
  // run then saw an owed month and credited exactly what the operator had just
  // said to skip. Hand the stamp back unchanged so the write is a no-op.
  if (st > prev) return { months: 0, newStamp: ymOf(st), capped: 0, seeded: false };
  const owed = prev - st;
  return { months: Math.min(owed, PTO_ACCRUAL_CATCHUP_MAX_MONTHS),
           newStamp: ymOf(prev),
           capped: Math.max(0, owed - PTO_ACCRUAL_CATCHUP_MAX_MONTHS),
           seeded: false };
}
/** The NON-NUMERIC per-day outcomes the range index stores in perDayByEmp. A
 *  number is hours worked; these two say WHY a day contributed none, and they
 *  are distinct because they have different operator remedies: an INCOMPLETE
 *  day needs the missing clock-out (or an unparseable time fixed), an ORPHAN
 *  day is a clock-out with no clock-in at all. Both used to be indistinguishable
 *  — the orphan case left no trace whatsoever — which is how a rep with real
 *  punches produced an accrual row reading "no worked hours in the period"
 *  (operator 2026-09-14). */
const TIMESHEET_DAY_INCOMPLETE = 'incomplete';
const TIMESHEET_DAY_ORPHAN = 'orphan';

/** ONE Timesheet read for a whole date range → {empId: {hours, incompleteDays}}.
 *  Built for the accrual credit, which runs inside the global ScriptLock and
 *  needs every accruing rep's worked hours: calling buildTimesheetForEmployee_
 *  per rep would be N full-sheet reads inside that lock — the C17-9 / INV-153
 *  lock-amplification class. Groups punches by (empId, date) and computes each
 *  day with calcHours_, so lunch handling and the INV-176 null contract are the
 *  SAME arithmetic payroll and the pay statement use.
 *
 *  ARCHIVE READ-THROUGH (the INV-153/F1 precedent): a catch-up range can reach
 *  months the cold-archive has already moved out of the live tab. When the
 *  range predates the live tab this reads TimesheetArchive too, skipping rows
 *  that exist in both (INV-132 can duplicate, never lose). A FAILED archive
 *  read THROWS rather than returning short hours — crediting from a partial
 *  read would under-credit real earned PTO, and the export refuses the same
 *  way rather than emitting a short payroll file.
 *
 *  A day whose times are unparseable is counted as INCOMPLETE, never as 0
 *  hours (INV-176) — the caller reports it rather than silently under-crediting. */
function workedHoursByEmpForRange_(startIso, endIso) {
  const sheet = getAdpSS_().getSheetByName(CONFIG.ADP_TAB);
  const rows = sheet.getDataRange().getValues();
  const perDay = {};            // empId -> dateIso -> {ClockIn, ClockOut, LunchOut, LunchIn}
  const liveKeys = new Set();
  let oldestLiveDate = null;
  const put = (id, date, type, time, keyRow) => {
    if (!id || !date || date < startIso || date > endIso) return;
    if (!perDay[id]) perDay[id] = {};
    if (!perDay[id][date]) perDay[id][date] = {};
    punchDayAdd_(perDay[id][date], type, time);
    if (keyRow) liveKeys.add(keyRow);
  };
  for (let i = 2; i < rows.length; i++) {
    const id = String(rows[i][ADP.EMP_ID]).trim();
    const date = normalizeDate_(rows[i][ADP.DATE]);
    if (date && (oldestLiveDate === null || date < oldestLiveDate)) oldestLiveDate = date;
    if (!id || !date) continue;
    const key = id + '|' + date + '|' + normalizeTime_(rows[i][ADP.TIME]) + '|' + String(rows[i][ADP.COMMENTS]);
    put(id, date, normalizeType_(String(rows[i][ADP.COMMENTS])), normalizeTime_(rows[i][ADP.TIME]), key);
  }
  let archivedRows = 0;
  if (oldestLiveDate === null || startIso < oldestLiveDate) {
    const archive = getAdpSS_().getSheetByName(TIMESHEET_ARCHIVE_TAB);   // read-only, never create (INV-133)
    if (archive && archive.getLastRow() > 2) {
      const aRows = archive.getDataRange().getValues();
      for (let a = 2; a < aRows.length; a++) {
        const id = String(aRows[a][ADP.EMP_ID]).trim();
        const date = normalizeDate_(aRows[a][ADP.DATE]);
        if (!id || !date) continue;
        const time = normalizeTime_(aRows[a][ADP.TIME]);
        const key = id + '|' + date + '|' + time + '|' + String(aRows[a][ADP.COMMENTS]);
        if (liveKeys.has(key)) continue;                    // mid-run archive duplicate
        put(id, date, normalizeType_(String(aRows[a][ADP.COMMENTS])), time, null);
        archivedRows++;
      }
    }
  }
  const byEmp = {}, perDayByEmp = {};
  Object.keys(perDay).forEach((id) => {
    let hours = 0, incomplete = 0, orphan = 0, daysWorked = 0;
    perDayByEmp[id] = {};
    Object.keys(perDay[id]).forEach((date) => {
      const pm = perDay[id][date];
      if (!pm.ClockIn || !pm.ClockOut) {
        // An open day (clocked in, never out) is INCOMPLETE, not zero hours.
        // A clock-OUT with no clock-in is neither: it is an ORPHAN punch, and
        // it used to `return` here counted as nothing at all, so the rep's
        // month looked identical to a month they never worked.
        if (pm.ClockIn) { incomplete++; perDayByEmp[id][date] = TIMESHEET_DAY_INCOMPLETE; }
        else { orphan++; perDayByEmp[id][date] = TIMESHEET_DAY_ORPHAN; }
        return;
      }
      const h = calcHours_(pm.ClockIn, pm.ClockOut, pm.LunchOut || null, pm.LunchIn || null);
      if (h === null) { incomplete++; perDayByEmp[id][date] = TIMESHEET_DAY_INCOMPLETE; return; }   // INV-176 — never a silent 0
      hours += h; daysWorked++;
      perDayByEmp[id][date] = h;
    });
    byEmp[id] = { hours: +hours.toFixed(2), daysWorked: daysWorked,
                  incompleteDays: incomplete, orphanDays: orphan };
  });
  // perDayByEmp carries the same per-day outcome the totals were built from
  // (a sentinel = a day that contributed no hours, and which of the two it is),
  // so a multi-month catch-up can slice one month out WITHOUT a second
  // Timesheet read — see workedHoursForEmpMonth_.
  return { byEmp: byEmp, perDayByEmp: perDayByEmp, archivedRows: archivedRows };
}
/** THE accrual resolver: what a run WOULD do, with NOTHING written.
 *
 *  Both `creditMonthlyPtoAccruals` (which applies it) and `previewPtoAccruals`
 *  (which only reports it) go through this ONE function. That is the g59 rule
 *  applied to payroll: a DRAFT preview that re-implements the real resolver
 *  reassures the operator about arithmetic nobody runs, and the two drift on
 *  the first policy change. The split is deliberate and total — every DECISION
 *  (who accrues, which months are owed, how many hours were readable, what
 *  those hours earn) lives here; every WRITE lives in the credit.
 *
 *  `rows` is the Employees sheet as the caller already read it — the credit
 *  holds them under the lock, and re-reading here would be a second full read.
 *
 *  THROWS if the Timesheet (or the archive behind it) cannot be read: neither
 *  crediting nor previewing may report from a partial read, because a short
 *  read UNDER-states real earned PTO in the direction nobody checks.
 *
 *  Each returned entry carries the plan AND the evidence behind it:
 *    {rowIndex, rate, stamp, plan, months, emp,
 *     totalHours, incompleteDays, orphanDays, onTimesheet, earned} */
function planPtoAccrualRun_(rows, nowYm, inspectYm, reconcileMonths) {
  const basis = CONFIG.PTO_ACCRUAL_BASIS_HOURS, perDay = CONFIG.PTO_HOURS_PER_DAY;

  // Pass 1 — who owes what, and the widest month range any of them needs.
  const plans = [];
  let earliestYm = null;
  for (let i = 1; i < rows.length; i++) {
    if (!empRosterEmail_(rows[i])) continue;                 // INV-183 — the ONE inclusion predicate
    const rate = empPtoAccrual_(rows[i][EMP.PTO_ACCRUAL]);
    if (rate === null) continue;
    // Per-row PTO gate (INV-27). A FALSE rep is skipped WITHOUT advancing
    // the stamp, so re-enabling credits the (capped) missed months rather
    // than silently swallowing them.
    const ptoVal = rows[i][EMP.PTO_ENABLED];
    const ptoRaw = (ptoVal === null || ptoVal === undefined || ptoVal === '')
      ? '' : String(ptoVal).trim().toLowerCase();
    if (ptoRaw === 'false' || ptoRaw === 'no' || ptoRaw === 'n' || ptoRaw === '0') continue;
    const stamp = accrualStampYm_(rows[i][EMP.ACCRUED_THROUGH]);
    const plan = accrualMonthsToCredit_(stamp, nowYm);
    if (!plan) continue;
    // INSPECT mode (operator 2026-09-15): report what ONE named month yields,
    // ignoring the column-R stamp. The stamp closes a month permanently, so
    // once a month is settled the ordinary plan reports "nothing owed" — true,
    // and useless to an operator asking why that month came out at zero. The
    // rest of the walk (inclusion, rate, the per-row PTO gate) is UNCHANGED, so
    // an inspection sees exactly the population a credit would. `plan` is still
    // computed above and carried, so the report can say whether the real job
    // would act on this month or considers it settled.
    const months = inspectYm ? [inspectYm] : accrualMonthList_(stamp, plan);
    if (months.length > 0 && (earliestYm === null || months[0] < earliestYm)) earliestYm = months[0];
    plans.push({ rowIndex: i, rate: rate, stamp: stamp, plan: plan, months: months,
      emp: { id: String(rows[i][EMP.ID]).trim(), name: String(rows[i][EMP.NAME]).trim(), email: empRosterEmail_(rows[i]) },
      totalHours: 0, incompleteDays: 0, orphanDays: 0, onTimesheet: false, earned: null });
  }
  if (plans.length === 0) {
    return { entries: [], basis: basis, perDay: perDay, range: null, archivedRows: 0 };
  }

  // Pass 2 — ONE Timesheet read covering every owed month AND the reconcile
  // window (see the index's own comment for why this is not a per-rep call).
  // The window is folded into the SAME range on purpose: the reader already
  // pulls the whole tab and filters by date, so widening it costs nothing,
  // while a second `workedHoursByEmpForRange_` call would be a second full
  // read inside the credit's ScriptLock — the C17-9 / INV-153 amplification
  // rule this function exists to obey.
  let hoursIdx = null, range = null;
  const recMonths = reconcileMonths || [];
  let startYm = earliestYm;
  let endYm = earliestYm
    ? plans.reduce((acc, p) => (p.months.length && p.months[p.months.length - 1] > acc) ? p.months[p.months.length - 1] : acc, earliestYm)
    : null;
  recMonths.forEach((ym) => {
    if (startYm === null || ym < startYm) startYm = ym;
    if (endYm === null || ym > endYm) endYm = ym;
  });
  if (startYm && endYm) {
    const startIso = startYm + '-01';
    const endIso = monthEndIso_(endYm);
    range = { start: startIso, end: endIso };
    hoursIdx = workedHoursByEmpForRange_(startIso, endIso);   // throws — the caller decides what that means
  }

  // Pass 3 — the readable hours behind each plan, and what they earn. The
  // per-rep `onTimesheet` flag is the one the audit row could never tell you:
  // a rep with NO rows at all under their employee id is not the same thing as
  // a rep who took the month off, and both used to render as a bare zero.
  plans.forEach((p) => {
    if (p.months.length === 0 || !hoursIdx) return;
    const rec = hoursIdx.byEmp[p.emp.id];
    p.onTimesheet = !!rec;
    // `earned` is assigned BELOW the months walk, OUTSIDE this guard, on
    // purpose: a rep with no Timesheet rows at all still earned a legitimate
    // ZERO, and the credit writes its audit row on `earned` being non-null. An
    // early return here would leave earned === null and that rep would pass
    // through the whole run recorded NOWHERE — the exact silence this batch
    // exists to remove.
    p.byMonth = [];
    p.months.forEach((ym) => {
      if (!rec) return;
      // ALWAYS slice the month out of the index, never read the range-wide
      // total. That shortcut was correct only while the range WAS the single
      // owed month; the reconcile window widened it, and a fast path that is
      // right until an unrelated parameter changes is a defect waiting on a
      // schedule. Slicing is an in-memory walk of that rep's days.
      const m = workedHoursForEmpMonth_(hoursIdx, p.emp.id, ym + '-01', monthEndIso_(ym));
      p.totalHours += m.hours; p.incompleteDays += m.incompleteDays; p.orphanDays += m.orphanDays;
      // F-19 (2026-09-18): the per-MONTH slice is kept, because the credit
      // writes ONE ledger row per month (accrualMonthRows_) — a multi-month
      // catch-up used to write one row keyed `2026-06,2026-07`, and the
      // reconcile pass skipped that key every day for months once one member
      // left the window.
      p.byMonth.push({ ym: ym, hours: +m.hours.toFixed(2), incompleteDays: m.incompleteDays, orphanDays: m.orphanDays });
    });
    p.totalHours = +p.totalHours.toFixed(2);
    // The rep's earned total is the SUM of the per-month credits (each month
    // rounded as the ledger row will record it), so the preview and the job
    // promise exactly what the rows add up to — never a total rounded once.
    p.earned = accrualEarnedByMonth_(p.byMonth, p.rate, basis, perDay);
  });
  return { entries: plans, basis: basis, perDay: perDay, range: range,
           inspectYm: inspectYm || '', hoursIdx: hoursIdx,
           reconcileMonths: recMonths.slice(),
           archivedRows: hoursIdx ? hoursIdx.archivedRows : 0 };
}

/** PURE (Node-pinned): WHY an owed month earned nothing. The audit row used to
 *  say only "no worked hours in the period", which cannot tell a genuine month
 *  off from a rep whose punches are filed under a different employee id — the
 *  operator hit exactly that on the 2026-09-01 run and had to reconstruct the
 *  answer from the Timesheet by hand. Three distinct answers, three remedies. */
function accrualZeroReason_(entry) {
  if (!entry.onTimesheet) {
    return 'no Timesheet rows at all under employee id ' + entry.emp.id + ' in the period';
  }
  if (entry.incompleteDays || entry.orphanDays) {
    return 'punches exist but no day formed a complete clock-in/clock-out pair';
  }
  return 'no worked hours in the period';
}

/** PURE (Node-pinned): why an INSPECT month cannot be used, or '' when it can.
 *  Pure because the alternative is a pin that asserts the error MESSAGE exists
 *  in the source — which stays green when the `if` around it is deleted. That
 *  is not hypothetical: the first version of this guard was written inline, and
 *  the bite-check that removed its condition did not turn the harness red.
 *
 *  Both cases REFUSE rather than report something smaller than the truth. A
 *  malformed month would silently inspect nothing; a month still in progress
 *  would report real hours that are simply incomplete, under a rule that is
 *  explicitly in arrears — and an operator acts on either. */
function accrualInspectMonthError_(inspectYm, nowYm) {
  if (!inspectYm) return '';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(inspectYm)) {
    return 'month must be yyyy-MM (got "' + inspectYm + '")';
  }
  if (inspectYm >= nowYm) {
    return inspectYm + ' is not a COMPLETED month (it is ' + nowYm + ') — a partial month ' +
      'understates the hours, and the accrual rule is in arrears.';
  }
  return '';
}

/** PURE (Node-pinned): the "… NOT counted" tail BOTH accrual audit rows carry.
 *  One builder so the credited row and the zero row can never disagree about
 *  what was left out. */
function accrualUncountedNote_(entry) {
  return (entry.incompleteDays ? '; ' + entry.incompleteDays + ' incomplete day(s) NOT counted' : '') +
         (entry.orphanDays ? '; ' + entry.orphanDays + ' day(s) with a clock-out and no clock-in NOT counted' : '');
}

/** PURE (Node-pinned): the last day of a 'yyyy-MM' month, as 'yyyy-MM-dd'.
 *  ONE definition — the accrual code computed this inline in three places, and
 *  three copies of a month-end calculation is three chances to disagree about
 *  February. */
function monthEndIso_(ym) {
  const p = String(ym).split('-');
  return ym + '-' + String(new Date(+p[0], +p[1], 0).getDate()).padStart(2, '0');
}

/** PURE (Node-pinned): the K COMPLETED months before nowYm, newest first.
 *  The reconcile window. Never includes nowYm — a month still in progress has
 *  nothing to reconcile against, because its hours are not final. */
function accrualReconcileMonths_(nowYm, k) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(nowYm == null ? '' : nowYm));
  if (!m) return [];
  let y = +m[1], mo = +m[2];
  if (mo < 1 || mo > 12) return [];
  const out = [];
  for (let i = 0; i < k; i++) {
    mo -= 1; if (mo === 0) { mo = 12; y -= 1; }
    out.push(y + '-' + String(mo).padStart(2, '0'));
  }
  return out;
}

/** PURE (Node-pinned) — the LEDGER FIELDS, written by every accrual audit row
 *  and read back by `parseAccrualLedger_`. These two are a MIRROR PAIR and the
 *  pin round-trips them: the note format stopped being cosmetic the moment the
 *  audit row became the record of WHAT HAS BEEN PAID FOR. `hoursWorked` is the
 *  hours the credit was computed from; `months` is the month-set it covered. */
function accrualCreditNote_(p, basis, earned, newBal) {
  return 'hoursWorked=' + p.totalHours + '; rate=' + p.rate + '/' + basis + 'h; ptoHours=' + earned.ptoHours +
    '; days=' + earned.days + '; months=' + p.months.join(',') + '; through=' + p.plan.newStamp +
    '; balance=' + newBal +
    accrualUncountedNote_(p) +
    (p.plan.capped ? '; CAPPED — ' + p.plan.capped + ' older month(s) NOT credited (stamp advanced past them; hand-adjust if owed)' : '');
}
function accrualZeroNote_(p, basis) {
  return 'hoursWorked=' + p.totalHours + '; rate=' + p.rate + '/' + basis + 'h; days=0; months=' + p.months.join(',') +
    '; through=' + p.plan.newStamp + '; ' + accrualZeroReason_(p) +
    accrualUncountedNote_(p);
}
/** The TOP-UP row. Same action and the same ledger fields as a first credit —
 *  deliberately, so the ledger read needs no special case and a later
 *  reconcile sees the new total rather than the original one. */
function accrualTopUpNote_(r, basis, earnedNow, deltaDays, newBal) {
  return 'hoursWorked=' + r.hoursNow + '; rate=' + r.rate + '/' + basis + 'h; ptoHours=' + earnedNow.ptoHours +
    '; days=' + earnedNow.days + '; months=' + r.monthsKey +
    '; TOP-UP +' + deltaDays + ' day(s) — the Timesheet now reads ' + r.hoursNow + ' h where ' +
    r.ledgerHours + ' h had been credited (late punches, or an adjustment approved after the month closed)' +
    '; balance=' + newBal +
    accrualUncountedNote_(r);
}
/** PURE (Node-pinned): what each owed month earns, and the rep's total as the
 *  SUM of those (F-19, 2026-09-18). Each month is rounded exactly as its ledger
 *  row records it, so a two-month catch-up credits `days(June) + days(July)`,
 *  never `days(June + July)` — the two differ by rounding, and the ledger must
 *  add up to the balance moved. `byMonth[i].earned` is filled in place. With no
 *  month slices (a rep with no Timesheet rows) the total is the legitimate
 *  zero the old single call produced — or null on an unusable rate. */
function accrualEarnedByMonth_(byMonth, rate, basis, perDay) {
  let ptoHours = 0, days = 0, any = false;
  (byMonth || []).forEach((m) => {
    const e = accrualDaysForHours_(m.hours, rate, basis, perDay);
    m.earned = e;
    if (!e) return;
    any = true; ptoHours += e.ptoHours; days += e.days;
  });
  return any ? { ptoHours: +ptoHours.toFixed(2), days: +days.toFixed(2) }
             : accrualDaysForHours_(0, rate, basis, perDay);
}
/** PURE (Node-pinned): the per-MONTH ledger rows a credit writes for one plan
 *  (F-19, 2026-09-18). Each is shaped like a one-month plan entry, so the
 *  unchanged note builders (`accrualCreditNote_` / `accrualZeroNote_`) write a
 *  row whose `months=` is a SINGLE month — the key `readAccrualLedger_` and the
 *  reconcile pass want. A rep with no month slices (no Timesheet rows at all)
 *  still gets one zero row per owed month, each naming that reason. */
function accrualMonthRows_(p) {
  const slices = (p.byMonth && p.byMonth.length) ? p.byMonth
    : (p.months || []).map((ym) => ({ ym: ym, hours: 0, incompleteDays: 0, orphanDays: 0, earned: p.earned }));
  return slices.map((m) => ({
    emp: p.emp, rate: p.rate, plan: p.plan, onTimesheet: p.onTimesheet,
    months: [m.ym], totalHours: m.hours,
    incompleteDays: m.incompleteDays || 0, orphanDays: m.orphanDays || 0,
    earned: m.earned,
  }));
}
/** PURE (Node-pinned): the ledger fields back out of a note, or null when the
 *  row is not a readable ledger entry. Null is the FAIL-CLOSED answer — an
 *  unreadable row means "we do not know what was credited", which must never
 *  become "nothing was credited" (that would top up the whole month again). */
function parseAccrualLedger_(note) {
  const t = String(note == null ? '' : note);
  const h = /(?:^|;\s*)hoursWorked=(\d+(?:\.\d+)?)/.exec(t);
  const m = /(?:^|;\s*)months=(\d{4}-\d{2}(?:,\d{4}-\d{2})*)/.exec(t);
  if (!h || !m) return null;
  const hours = parseFloat(h[1]);
  if (!isFinite(hours) || hours < 0) return null;
  return { hours: hours, months: m[1].split(',') };
}

/** How many AuditLog rows the ledger read will look at, newest first. The
 *  AuditLog is kept forever, so an unbounded `getDataRange()` here would grow
 *  without limit inside the credit's ScriptLock. Reading the tail is bounded;
 *  the cost of the bound is that a very busy log could push a window row out of
 *  reach, which the read REPORTS (`truncated`) rather than silently treating as
 *  "never credited". */
const ACCRUAL_LEDGER_MAX_ROWS = 5000;

/** THE LEDGER — what each rep has already been credited FOR, per month-set,
 *  read back from the `PtoAccrualCredit` audit rows themselves.
 *
 *  WHY THE AUDIT LOG rather than a new tab: the row already records the hours
 *  and the months, the log is append-only and never purged, and a second store
 *  would be a second thing that can disagree with it. The cost is that the note
 *  format is now a CONTRACT — hence the mirror pair above and its round-trip
 *  pin — and that the accrual row is load-bearing, so it is written through
 *  `writeWitnessAuditLog_` (retry, then the WITNESS_AUDIT_FAILS stamp).
 *
 *  Rows are append-ordered by time, so this walks from the bottom and stops
 *  once it is past `sinceIso`. Within a (rep, month-set) it keeps the MAXIMUM
 *  hours seen, not the last: a re-run that somehow credited less must not lower
 *  the ledger and re-open a top-up that has already been paid. */
function readAccrualLedger_(sinceIso) {
  const sheet = getOrCreateAuditSheet_();
  const lastRow = sheet.getLastRow();
  const out = { byEmp: {}, rowsRead: 0, truncated: false };
  if (lastRow < 2) return out;
  const width = AUDIT.NOTES + 1;
  const take = Math.min(lastRow - 1, ACCRUAL_LEDGER_MAX_ROWS);
  const startRow = lastRow - take + 1;
  const rows = sheet.getRange(startRow, 1, take, width).getValues();
  out.rowsRead = take;
  let reachedBack = false;
  for (let i = rows.length - 1; i >= 0; i--) {
    const ts = normalizeAuditTs_(rows[i][AUDIT.TS]);
    if (ts && ts.length >= 10 && ts.slice(0, 10) < sinceIso) { reachedBack = true; break; }
    if (String(rows[i][AUDIT.ACTION]).trim() !== 'PtoAccrualCredit') continue;
    const led = parseAccrualLedger_(rows[i][AUDIT.NOTES]);
    if (!led) continue;
    const id = String(rows[i][AUDIT.EMP_ID]).trim();
    if (!id) continue;
    const key = led.months.join(',');
    if (!out.byEmp[id]) out.byEmp[id] = {};
    if (!out.byEmp[id][key] || led.hours > out.byEmp[id][key].hours) {
      out.byEmp[id][key] = { hours: led.hours, months: led.months };
    }
  }
  // Only a scan that actually reached PAST the window proves it saw all of it.
  out.truncated = !reachedBack && startRow > 2;
  return out;
}

/** PURE (Node-pinned): what the RECONCILE pass WOULD do. Reads nothing — the
 *  caller supplies the ledger and the hours index — so a pin can drive every
 *  branch without a spreadsheet.
 *
 *  THE RULE: the credit is idempotent on the HOURS ALREADY PAID FOR, not on
 *  "this month was processed". Late data (an adjustment approved after the
 *  month closed, a manager day edit, a direct Sheet edit) therefore heals
 *  itself on the next run instead of being lost behind the column-R stamp.
 *
 *  Three outcomes, and the two that are not a top-up matter more:
 *   • `topup`     — the Timesheet now reads MORE than was credited. Credit the
 *                   difference in DAYS (not hours), so the running total always
 *                   equals days(total hours) and re-running credits nothing.
 *   • `shortfall` — it now reads LESS. REPORTED, never clawed back: a script
 *                   must not quietly take PTO off someone's balance, and the
 *                   cause (a deleted punch) needs a human either way.
 *   • `skipped`   — a month-set reaching outside the window, or hours that will
 *                   not compute. FAIL CLOSED: no top-up, and it is reported. */
function planAccrualReconcile_(entries, ledger, hoursIdx, windowMonths, basis, perDay) {
  const out = [];
  (entries || []).forEach((p) => {
    const byKey = (ledger && ledger.byEmp && ledger.byEmp[p.emp.id]) || null;
    if (!byKey) return;
    Object.keys(byKey).forEach((key) => {
      const months = byKey[key].months;
      const base = { emp: p.emp, rate: p.rate, monthsKey: key, months: months,
                     ledgerHours: byKey[key].hours, hoursNow: null,
                     incompleteDays: 0, orphanDays: 0, deltaDays: 0 };
      const outside = months.filter((ym) => windowMonths.indexOf(ym) < 0);
      if (outside.length) {
        // F-19: since 2026-09-18 the credit writes one row per month, so only
        // a LEGACY catch-up row can carry a multi-month key — say so, because
        // this line repeats daily until the row leaves the ledger read.
        out.push(Object.assign(base, { action: 'skipped',
          why: 'covers ' + outside.join(',') + ', outside the ' + windowMonths.length + '-month reconcile window' +
            (months.length > 1 ? ' (a multi-month row written before per-month ledger rows, 2026-09-18 — it leaves the ledger read once the window moves past its write date)' : '') }));
        return;
      }
      let hoursNow = 0, incompleteDays = 0, orphanDays = 0;
      months.forEach((ym) => {
        const sl = workedHoursForEmpMonth_(hoursIdx, p.emp.id, ym + '-01', monthEndIso_(ym));
        hoursNow += sl.hours; incompleteDays += sl.incompleteDays; orphanDays += sl.orphanDays;
      });
      hoursNow = +hoursNow.toFixed(2);
      base.hoursNow = hoursNow; base.incompleteDays = incompleteDays; base.orphanDays = orphanDays;
      const earnedNow = accrualDaysForHours_(hoursNow, p.rate, basis, perDay);
      const earnedLedger = accrualDaysForHours_(base.ledgerHours, p.rate, basis, perDay);
      if (!earnedNow || !earnedLedger) {
        out.push(Object.assign(base, { action: 'skipped', why: 'hours did not compute (rate or basis unusable)' }));
        return;
      }
      base.earnedNow = earnedNow;
      const deltaDays = +(earnedNow.days - earnedLedger.days).toFixed(2);
      base.deltaDays = deltaDays;
      if (deltaDays > 0) { out.push(Object.assign(base, { action: 'topup' })); return; }
      // A hair under is float noise on two rounded figures, not a real drop.
      if (hoursNow + 0.005 < base.ledgerHours) {
        out.push(Object.assign(base, { action: 'shortfall',
          why: 'the Timesheet now reads ' + hoursNow + ' h where ' + base.ledgerHours + ' h was credited' }));
        return;
      }
      out.push(Object.assign(base, { action: 'ok' }));
    });
  });
  return out;
}

/** PURE (Node-pinned): which days in the window have no usable clock-in /
 *  clock-out pair, per rep, from the SAME range index the accrual reads.
 *
 *  WHY THIS EXISTS (operator 2026-09-15). The reconcile pass recovers PTO when
 *  a day is fixed after its month closed; it does nothing about the day sitting
 *  open for a week in the first place, which is what actually went wrong on
 *  2026-09-01. An open day is a payroll problem before it is a PTO problem —
 *  the ADP export, the pay statement and the punctuality report all read the
 *  same rows — so this walks the WHOLE roster, not just reps who accrue, and
 *  does not consult the PTO feature flag.
 *
 *  Two bounds, both chosen rather than inherited:
 *   • The window ENDS `graceDays` before today. A rep clocked in right now has
 *     an open day BY DEFINITION, and a rep twelve hours ahead of the manager
 *     anchor can look open for most of a manager's day. Reporting either would
 *     train the reader to ignore the report.
 *   • The window STARTS at the adjust window, because past it the remedy does
 *     not exist: `managerSaveDayRange` and the adjustment queue both refuse a
 *     date older than `CONFIG.ADJUST_WINDOW_DAYS`. A finding nobody can act on
 *     is noise — so the report states its own boundary instead of pretending
 *     the older days are fine, and flags the ones about to cross it.
 *
 *  `idx.perDayByEmp[id][date]` is a number for a counted day and one of the two
 *  TIMESHEET_DAY_* sentinels otherwise; the sentinel says WHICH remedy applies,
 *  so it is carried through rather than flattened to "broken". */
function planOpenPunchCheck_(roster, idx, startIso, endIso, expiringBeforeIso) {
  const out = [];
  (roster || []).forEach((emp) => {
    const days = (idx && idx.perDayByEmp && idx.perDayByEmp[emp.id]) || null;
    if (!days) return;
    const open = [];
    Object.keys(days).forEach((date) => {
      if (date < startIso || date > endIso) return;
      const v = days[date];
      if (v === TIMESHEET_DAY_INCOMPLETE) open.push({ date: date, kind: 'no clock-out' });
      else if (v === TIMESHEET_DAY_ORPHAN) open.push({ date: date, kind: 'clock-out with no clock-in' });
    });
    if (!open.length) return;
    open.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const expiring = open.filter((d) => d.date < expiringBeforeIso).map((d) => d.date);
    out.push({ id: emp.id, name: emp.name, days: open, count: open.length, expiring: expiring });
  });
  out.sort((a, b) => b.count - a.count);
  return out;
}

/** How many days at the END of the window are left alone — the in-flight
 *  buffer. One covers a rep mid-shift and the manager-anchor timezone skew; the
 *  second covers the rep who forgets at 6pm and fixes it next morning, which is
 *  self-healing and must not page anyone. */
const OPEN_PUNCH_GRACE_DAYS = 2;
/** A day this close to falling out of the adjust window is called out
 *  separately: after that the in-app remedy is gone and the only fix is a
 *  hand-edit of the Timesheet. */
const OPEN_PUNCH_EXPIRING_DAYS = 7;

/** DAILY CHECK (8am manager-tz, inside the runDailyChecks dispatcher) — reports
 *  every rep with a day the Timesheet cannot turn into hours, while the remedy
 *  still exists. Read-only: it takes NO ScriptLock (nothing is written but a
 *  diagnostic stamp) and writes no audit row, so it cannot queue behind or
 *  ahead of a live punch.
 *
 *  It runs at 8am and `sendAutomationHealthDigest` runs at 9am, deliberately:
 *  the stamp is an hour old when the digest reads it, so a finding reaches a
 *  manager by email the same morning WITHOUT this job sending mail of its own.
 *
 *  Top-level → reachable via google.script.run, so it carries the INV-44 gate. */
function checkOpenPunches() {
  assertManagerCaller_('checkOpenPunches');
  try {
    const tz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
    const todayIso = fmtDateTz_(new Date(), tz);
    const startIso = addDaysIso_(todayIso, -CONFIG.ADJUST_WINDOW_DAYS);
    const endIso = addDaysIso_(todayIso, -OPEN_PUNCH_GRACE_DAYS);
    if (endIso < startIso) return { success: true, reps: 0, days: 0, window: null };
    const expiringBeforeIso = addDaysIso_(startIso, OPEN_PUNCH_EXPIRING_DAYS);

    const rows = getAdpSS_().getSheetByName(CONFIG.EMPLOYEE_TAB).getDataRange().getValues();
    const roster = [];
    for (let i = 1; i < rows.length; i++) {
      if (!empRosterEmail_(rows[i])) continue;              // INV-183 — the ONE inclusion predicate
      roster.push({ id: String(rows[i][EMP.ID]).trim(), name: String(rows[i][EMP.NAME]).trim() });
    }
    const idx = workedHoursByEmpForRange_(startIso, endIso);   // throws → caught below, nothing stamped
    const found = planOpenPunchCheck_(roster, idx, startIso, endIso, expiringBeforeIso);
    const rec = {
      at: Date.now(),
      window: { start: startIso, end: endIso, adjustWindowDays: CONFIG.ADJUST_WINDOW_DAYS },
      reps: found.length,
      days: found.reduce((n, r) => n + r.count, 0),
      expiring: found.reduce((n, r) => n + r.expiring.length, 0),
      detail: found.map((r) => ({ id: r.id, name: r.name, count: r.count,
        first: r.days[0].date, last: r.days[r.days.length - 1].date,
        kinds: r.days.map((d) => d.kind).filter((k, i, a) => a.indexOf(k) === i),
        expiring: r.expiring.length })),
    };
    stampOpenPunchCheck_(rec);
    Logger.log('checkOpenPunches: ' + rec.days + ' open day(s) across ' + rec.reps +
      ' rep(s) in ' + startIso + '…' + endIso + (rec.expiring ? ' — ' + rec.expiring + ' about to leave the adjust window' : ''));
    return { success: true, reps: rec.reps, days: rec.days, expiring: rec.expiring, window: rec.window };
  } catch (err) {
    // A FAILED check must not read as "no open punches" — that is the reassuring
    // absence this whole batch exists to remove. Stamp the failure so the health
    // panel says the check could not run, rather than showing a clean board.
    // The failure rides THIS stamp rather than AUTOMATION_LAST_ERRORS: that map
    // is cleared by a job's own next clean run, and a job outside
    // AUTOMATION_JOB_CHECKS (this one writes no audit row, so it is correctly
    // not in that table) would leave an entry nothing ever clears. This stamp
    // is rewritten in full on every run, so it self-clears.
    stampOpenPunchCheck_({ at: Date.now(), error: err.message });
    return { success: false, error: err.message };
  }
}

/** Auto-managed diagnostic — the last open-punch scan. Bounded per INV-201:
 *  the per-rep detail degrades one entry at a time, newest-largest first, so a
 *  trimmed list still carries the counts that make the finding actionable. */
function stampOpenPunchCheck_(rec) {
  try {
    propSetBounded_('OPEN_PUNCH_CHECK', JSON.stringify(rec), {
      mode: 'degrade',
      shrink: function (str) {
        let o = {};
        try { o = JSON.parse(str) || {}; } catch (_) { return null; }
        if (Array.isArray(o.detail) && o.detail.length) {
          o.detail = o.detail.slice(0, o.detail.length - 1);
          o.detailTrimmed = true;
          return JSON.stringify(o);
        }
        return null;
      },
    });
  } catch (e) { Logger.log('stampOpenPunchCheck_ failed: ' + e.message); }
}
function readOpenPunchCheck_() {
  try {
    return JSON.parse(PropertiesService.getScriptProperties().getProperty('OPEN_PUNCH_CHECK') || 'null');
  } catch (_) { return null; }
}

/** Auto-managed diagnostic (the AUTOMATION_LAST_ERRORS pattern): the last
 *  reconcile pass's outcome, so Admin → Automation Health and the failure
 *  digest can surface a shortfall, a skipped month or a truncated ledger read
 *  WITHOUT re-running the reconciliation — which costs two full sheet reads and
 *  has no business running from a dashboard. Delete the property to clear a
 *  stale flag. Bounded per INV-201: the per-rep detail degrades one entry at a
 *  time, because a trimmed list is still a usable signal and an absent property
 *  is not. */
function stampAccrualReconcile_(rec) {
  try {
    propSetBounded_('PTO_ACCRUAL_RECONCILE', JSON.stringify(rec), {
      mode: 'degrade',
      shrink: function (str) {
        let o = {};
        try { o = JSON.parse(str) || {}; } catch (_) { return null; }
        const lists = ['skipped', 'incomplete', 'shortfalls'];
        for (let i = 0; i < lists.length; i++) {
          const k = lists[i];
          if (Array.isArray(o[k]) && o[k].length) {
            o[k] = o[k].slice(0, o[k].length - 1);
            o[k + 'Trimmed'] = true;
            return JSON.stringify(o);
          }
        }
        return null;
      },
    });
  } catch (e) { Logger.log('stampAccrualReconcile_ failed: ' + e.message); }
}
function readAccrualReconcile_() {
  try {
    return JSON.parse(PropertiesService.getScriptProperties().getProperty('PTO_ACCRUAL_RECONCILE') || 'null');
  } catch (_) { return null; }
}

/** TRIGGER HANDLER (daily, manager-tz — the automation anchor): credits each
 *  accruing rep's earned PTO into the col-I balance, IN ARREARS and driven by
 *  HOURS ACTUALLY WORKED (operator 2026-08-19: 3.08 PTO hours per 80 worked).
 *  Top-level → reachable via google.script.run, so it carries the INV-44
 *  MANAGER_EMAILS gate; locked (INV-01 — it mutates the payroll-adjacent
 *  Employees sheet). IDEMPOTENT via the col-R stamp: a re-run (or the daily
 *  cadence between month boundaries) owes nothing.
 *
 *  WHAT to credit is `planPtoAccrualRun_`'s decision, shared verbatim with the
 *  read-only `previewPtoAccruals`; this function is the WRITES and their order.
 *
 *  ORDER IS DELIBERATE — the credit (via adjustLeaveBalance_, THE balance
 *  mutator, so the INV-27 per-row gate and cache invalidation ride along) and
 *  its audit row land BEFORE the stamp advances: a mid-run failure re-credits
 *  next run, failing toward a VISIBLE over-credit (two audit rows for one
 *  month — investigable) rather than a silent lost month.
 *
 *  A month with ZERO worked hours credits ZERO and still advances the stamp —
 *  under an hours-driven rule that is the correct answer, not a failure. What
 *  is NOT tolerated is crediting from hours we could not read: a failed
 *  Timesheet/archive read aborts the whole run with no credits and no stamp
 *  movement, so tomorrow's run retries intact. */
/** F-46 (2026-09-18): the reconcile stamp and the job's error flag are
 *  REWRITTEN on every path the job takes, the early returns included. Until
 *  now only the full path reached `stampAccrualReconcile_` / the clear, so a
 *  shortfall stamped one month kept alarming Automation Health after PTO
 *  tracking was switched off or the last accruing rep left the roster — and a
 *  stamped failure never cleared on a run that had nothing to do. */
function accrualNothingToDo_(window, reason) {
  stampAccrualReconcile_({ at: Date.now(), window: (window || []).slice(), toppedUp: 0, days: 0,
                           shortfalls: [], skipped: [], incomplete: [], truncated: false, reason: reason });
  clearAutomationError_('PtoAccrualCredit');
}
function creditMonthlyPtoAccruals() {
  assertManagerCaller_('creditMonthlyPtoAccruals');
  if (!getFlag_('enablePtoTracking')) {
    accrualNothingToDo_([], 'PTO tracking disabled');   // F-46
    return { success: true, skipped: 'PTO tracking disabled' };
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const tz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
    const nowYm = Utilities.formatDate(new Date(), tz, 'yyyy-MM');
    const sheet = getAdpSS_().getSheetByName(CONFIG.EMPLOYEE_TAB);
    const rows = sheet.getDataRange().getValues();
    const recMonths = accrualReconcileMonths_(nowYm, PTO_ACCRUAL_RECONCILE_MONTHS);
    const run = planPtoAccrualRun_(rows, nowYm, '', recMonths);   // throws → caught below, nothing written
    // BOTH come from the resolver. `perDay` was left undeclared when the
    // resolver was extracted (the credit used to compute both itself), and the
    // reconcile call below threw ReferenceError on every run — see g118.
    const basis = run.basis, perDay = run.perDay;
    if (run.entries.length === 0) {
      accrualNothingToDo_(recMonths, 'no accruing reps');   // F-46
      return { success: true, credited: 0, seeded: 0 };
    }

    let credited = 0, seeded = 0, zeroHourReps = 0;
    run.entries.forEach((p) => {
      const earned = p.earned;
      if (p.months.length > 0 && earned) {
        // F-19 (2026-09-18): ONE ledger row PER MONTH. A catch-up (a first
        // credit, a re-enabled rep) used to write one row keyed by the whole
        // month-set, and the reconcile pass — which values months INSIDE its
        // window — reported that key as unreconcilable every day for months
        // once one member aged out. Per-month rows are per-month keys.
        const months = accrualMonthRows_(p);
        let repCredited = false;
        for (let mi = 0; mi < months.length; mi++) {
          const m = months[mi];
          if (m.earned && m.earned.days > 0) {
            const newBal = adjustLeaveBalance_(p.emp.id, 'annual', m.earned.days);
            if (newBal === null) return;      // gated away mid-run — leave the stamp for a clean retry
            // WITNESS-class since the reconcile ledger reads these rows back: a
            // dropped row would read as "never credited" and the next run would
            // top up the whole month again. Retry, then stamp WITNESS_AUDIT_FAILS.
            writeWitnessAuditLog_(p.emp, 'PtoAccrualCredit', '', '', false, 0,
              accrualCreditNote_(m, basis, m.earned, newBal));
            repCredited = true;
          } else {
            // Zero hours worked = zero accrual. Correct under an hours-driven
            // rule, but recorded — WITH the reason — so a month of unexpected
            // silence is something the operator can act on rather than re-derive.
            writeWitnessAuditLog_(p.emp, 'PtoAccrualCredit', '', '', false, 0,
              accrualZeroNote_(m, basis));
          }
        }
        if (repCredited) credited++; else zeroHourReps++;
      }
      if (p.stamp !== p.plan.newStamp) {
        sheet.getRange(p.rowIndex + 1, EMP.ACCRUED_THROUGH + 1).setValue(sheetSafe_(p.plan.newStamp));
        if (p.plan.seeded) seeded++;
      }
    });
    if (seeded > 0) invalidateRosterCache_();   // credits already invalidate via adjustLeaveBalance_

    // ── RECONCILE (operator 2026-09-15). The month-stamp made the credit
    // idempotent on "this month was processed", but the Timesheet is NOT final
    // on the 1st: a missing-punch adjustment approved on the 3rd, a manager day
    // edit, a direct Sheet edit all land later, and every one of them was lost
    // behind the stamp. It fired live — all three PH reps were credited ZERO
    // for 2026-08 on open days that were closed by approvals days afterwards.
    // The fix is to make the credit idempotent on the HOURS ALREADY PAID FOR,
    // which is what the ledger records, so late data heals itself here instead.
    const rec = { at: Date.now(), window: recMonths.slice(), toppedUp: 0, days: 0,
                  shortfalls: [], skipped: [], incomplete: [], truncated: false };
    if (recMonths.length && run.hoursIdx) {
      // Widen the ledger read a little past the window: the audit stamp is
      // written in CONFIG.TIMEZONE while the months are manager-tz, and a row
      // on a boundary day must not fall outside the scan (INV-51's class).
      const ledger = readAccrualLedger_(addDaysIso_(recMonths[recMonths.length - 1] + '-01', -10));
      rec.truncated = !!ledger.truncated;
      planAccrualReconcile_(run.entries, ledger, run.hoursIdx, recMonths, basis, perDay).forEach((r) => {
        if (r.incompleteDays || r.orphanDays) {
          rec.incomplete.push({ id: r.emp.id, months: r.monthsKey, days: (r.incompleteDays || 0) + (r.orphanDays || 0) });
        }
        if (r.action === 'topup') {
          const newBal = adjustLeaveBalance_(r.emp.id, 'annual', r.deltaDays);
          if (newBal === null) return;   // gated away mid-run — next run retries
          writeWitnessAuditLog_(r.emp, 'PtoAccrualCredit', '', '', false, 0,
            accrualTopUpNote_(r, basis, r.earnedNow, r.deltaDays, newBal));
          rec.toppedUp++; rec.days = +(rec.days + r.deltaDays).toFixed(2);
        } else if (r.action === 'shortfall') {
          // NEVER clawed back. A script does not quietly take PTO off a
          // balance, and the cause needs a person either way.
          rec.shortfalls.push({ id: r.emp.id, months: r.monthsKey, was: r.ledgerHours, now: r.hoursNow });
        } else if (r.action === 'skipped') {
          rec.skipped.push({ id: r.emp.id, months: r.monthsKey, why: r.why });
        }
      });
    }
    stampAccrualReconcile_(rec);

    clearAutomationError_('PtoAccrualCredit');
    return { success: true, credited: credited, seeded: seeded, zeroHourReps: zeroHourReps,
             toppedUp: rec.toppedUp, topUpDays: rec.days, shortfalls: rec.shortfalls.length };
  } catch (err) {
    // F4: this job writes LEAVE BALANCES, and a caught error reports failure to
    // nobody — Apps Script's trigger-failure email fires on a THROW, not on a
    // returned error object, and nothing else reads this return value. Stamp it
    // so Admin → Automation Health and the daily failure digest can see it.
    stampAutomationError_('PtoAccrualCredit', err.message);
    return { success: false, error: err.message };
  }
  finally { lock.releaseLock(); }
}

/** READ-ONLY dry run of the monthly accrual (operator 2026-09-14). Answers the
 *  two questions the audit row cannot: what will tonight's 6pm job credit, and
 *  why does THIS rep read zero? Nothing is written — no balance, no audit row,
 *  no stamp — and the single reason to trust the answer is that it shares
 *  `planPtoAccrualRun_` with the real job (g59: a DRAFT preview goes through
 *  the ONE resolver, or it is a second implementation wearing the first one's
 *  name).
 *
 *  Top-level → reachable via google.script.run, so it carries the INV-44
 *  MANAGER_EMAILS gate. Deliberately NOT locked: it only reads, and a 15s
 *  ScriptLock on a diagnostic would contend with live punches for no benefit.
 *  The trade is that a preview taken WHILE the credit runs can read half-
 *  applied state — so the preview is advisory and the job stays the record.
 *
 *  Deliberately does NOT short-circuit on the `enablePtoTracking` flag the way
 *  the credit does: "nothing will happen, and here is the switch that is off"
 *  is the more useful answer than an empty report. The flag is reported.
 *
 *  INSPECT MODE — `previewPtoAccruals('2026-08')`: report what ONE completed
 *  month is worth on the Timesheet AS IT READS NOW, ignoring the column-R
 *  stamp. The ordinary preview only reports OWED months, so once the stamp has
 *  closed a month it answers "nothing owed" — true, and useless to an operator
 *  asking why that month came out at zero (the 2026-09-15 round: all three PH
 *  reps were stamped through 2026-08, so the month in question was invisible).
 *  Ignoring the stamp is the whole point, so the report SAYS it is ignoring it
 *  and marks every rep whose stamp already settles that month — the numbers
 *  must not imply a credit that will never come. A month that is not yet
 *  complete is REFUSED rather than reported short.
 *
 *  Run it from the Apps Script editor (the summary lands in the execution log
 *  via `text`) or call it from a manager surface for the structured form. */
function previewPtoAccruals(monthYm) {
  assertManagerCaller_('previewPtoAccruals');
  const tz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
  const nowYm = Utilities.formatDate(new Date(), tz, 'yyyy-MM');
  // INSPECT mode: a named COMPLETED month, stamp ignored. Both guards refuse
  // rather than degrade — a preview that silently inspected the wrong month, or
  // a partial one, is worse than no preview, because the operator acts on it.
  const inspectYm = (monthYm === null || monthYm === undefined) ? '' : String(monthYm).trim();
  const monthErr = accrualInspectMonthError_(inspectYm, nowYm);
  if (monthErr) return { success: false, error: 'previewPtoAccruals: ' + monthErr + ' [' + tz + ']' };
  try {
    const sheet = getAdpSS_().getSheetByName(CONFIG.EMPLOYEE_TAB);
    const rows = sheet.getDataRange().getValues();
    // Reconciliation is reported only in the ORDINARY preview. In inspect mode
    // the per-rep SETTLED marker already answers the same question for the one
    // month being looked at, and two overlapping verdicts on one report is how
    // an operator ends up believing the wrong one.
    const recMonths = inspectYm ? [] : accrualReconcileMonths_(nowYm, PTO_ACCRUAL_RECONCILE_MONTHS);
    const run = planPtoAccrualRun_(rows, nowYm, inspectYm, recMonths);
    const out = {
      success: true,
      enabled: !!getFlag_('enablePtoTracking'),
      nowYm: nowYm,
      tz: tz,
      inspectYm: run.inspectYm,
      basis: run.basis,
      hoursPerDay: run.perDay,
      range: run.range,
      reconcileWindow: run.reconcileMonths,
      archivedRows: run.archivedRows,
      reps: run.entries.map((p) => ({
        id: p.emp.id,
        name: p.emp.name,
        rate: p.rate,
        stamp: p.stamp,
        months: p.months.slice(),
        seeds: !!p.plan.seeded,
        capped: p.plan.capped || 0,
        newStamp: p.plan.newStamp,
        // null (not 0) when no month is owed: there is nothing to read hours
        // for, which is not the same claim as "read them and they were zero".
        hours: p.months.length ? p.totalHours : null,
        incompleteDays: p.incompleteDays,
        orphanDays: p.orphanDays,
        onTimesheet: p.onTimesheet,
        wouldCreditDays: (p.months.length && p.earned) ? p.earned.days : 0,
        wouldCreditPtoHours: (p.months.length && p.earned) ? p.earned.ptoHours : 0,
        zeroReason: (p.months.length && p.earned && p.earned.days <= 0) ? accrualZeroReason_(p) : '',
        // INSPECT only: does column R already consider this month settled? If
        // it does, the real job will NEVER credit what this report shows
        // without a deliberate stamp rewind — the report must say so rather
        // than let the numbers imply a credit is coming.
        settled: !!(inspectYm && p.stamp && p.stamp >= inspectYm),
      })),
    };
    // What the next credit run WOULD reconcile — read-only, through the same
    // planner the job uses, so the preview cannot promise a top-up the job
    // would not make.
    out.reconcile = [];
    out.ledgerTruncated = false;
    if (recMonths.length && run.hoursIdx) {
      const ledger = readAccrualLedger_(addDaysIso_(recMonths[recMonths.length - 1] + '-01', -10));
      out.ledgerTruncated = !!ledger.truncated;
      out.reconcile = planAccrualReconcile_(run.entries, ledger, run.hoursIdx, recMonths, run.basis, run.perDay)
        .map((r) => ({ id: r.emp.id, name: r.emp.name, months: r.monthsKey, action: r.action,
                       ledgerHours: r.ledgerHours, hoursNow: r.hoursNow, deltaDays: r.deltaDays,
                       incompleteDays: r.incompleteDays, orphanDays: r.orphanDays, why: r.why || '' }));
    }
    out.text = formatPtoAccrualPreview_(out);
    Logger.log(out.text);
    return out;
  } catch (err) {
    // No stampAutomationError_ here: this is a DIAGNOSTIC, and a failed preview
    // must not light up the health dot for a job that has not itself failed.
    return { success: false, error: err.message };
  }
}

/** EDITOR ENTRY POINT — inspect the PREVIOUS completed month, one click.
 *
 *  The Apps Script editor's ▶ Run calls the selected function with NO
 *  arguments: there is no field for one in the picker. So `previewPtoAccruals`
 *  is runnable from the editor only in its no-argument form, and the INSPECT
 *  form — the half that can see a month the column-R stamp has closed — was
 *  unreachable from the one place an operator actually runs it. Shipping a
 *  function whose useful form cannot be invoked is not shipping it.
 *
 *  The previous completed month is the question that RECURS ("last month came
 *  out wrong — why?"), so it gets the entry point. An older or arbitrary month
 *  still needs an argument: call `previewPtoAccruals('2026-05')` from a scratch
 *  function, or from a manager surface.
 *
 *  The month is DERIVED, never composed here: `accrualMonthsToCredit_('', ym)`
 *  is the seed path, whose whole job is "the last month that is complete",
 *  including the year boundary. A second piece of month arithmetic would be a
 *  second definition of the accrual period (INV-179).
 *
 *  Top-level → reachable via google.script.run, so it carries the INV-44 gate
 *  in its own body rather than inheriting one: a reader must see the gate here,
 *  and the refusal should name the function the caller actually invoked. */
function previewPtoAccrualsLastMonth() {
  assertManagerCaller_('previewPtoAccrualsLastMonth');
  const tz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
  const nowYm = Utilities.formatDate(new Date(), tz, 'yyyy-MM');
  return previewPtoAccruals(accrualMonthsToCredit_('', nowYm).newStamp);
}

/** PURE (Node-pinned): the preview as a text block for the execution log.
 *  Pure so a pin can assert the wording — and the honesty of it — without a
 *  spreadsheet: a rep who will be credited nothing must SAY why, never render
 *  as a bare 0 (the whole reason this function exists). */
function formatPtoAccrualPreview_(o) {
  const L = [];
  L.push(o.inspectYm
    ? ('── PTO accrual INSPECTION of ' + o.inspectYm + ' — NOTHING WAS WRITTEN ──')
    : '── PTO accrual preview — NOTHING WAS WRITTEN ──');
  L.push('Now ' + o.nowYm + ' (' + o.tz + ') · rule: ' + o.basis + ' worked hours earns the rep\'s column-Q rate' +
    ' in PTO hours · ' + o.hoursPerDay + ' PTO hours = 1 day');
  if (o.inspectYm) {
    L.push('Column R is IGNORED below — this is what ' + o.inspectYm + ' is worth on the Timesheet as it reads NOW,' +
      ' which is not necessarily what was credited at the time.');
  }
  if (!o.enabled) L.push('!! enablePtoTracking is OFF — the real job will credit NOTHING until it is on.');
  L.push(o.range ? ('Timesheet read: ' + o.range.start + ' … ' + o.range.end +
    (o.archivedRows ? ' (incl. ' + o.archivedRows + ' archived row(s))' : ''))
    : 'Timesheet read: none needed — no rep owes a completed month.');
  if (!o.reps.length) {
    L.push('No accruing reps: no roster row carries a usable column-Q rate (or every one is PTO-disabled).');
    return L.join('\n');
  }
  let totalDays = 0;
  o.reps.forEach((r) => {
    totalDays += r.wouldCreditDays;
    const who = r.name + ' [' + r.id + ']';
    if (!o.inspectYm && r.seeds) {
      L.push('  · ' + who + ' — SEEDS to ' + r.newStamp + ' (blank column R): credits nothing, by design.');
      return;
    }
    if (!r.months.length) {
      L.push('  · ' + who + ' — nothing owed (column R already ' + (r.stamp || '(blank)') + ').');
      return;
    }
    const tail = (r.incompleteDays ? ' · ' + r.incompleteDays + ' incomplete day(s) NOT counted' : '') +
                 (r.orphanDays ? ' · ' + r.orphanDays + ' clock-out-only day(s) NOT counted' : '') +
                 (!o.inspectYm && r.capped ? ' · CAPPED: ' + r.capped + ' older month(s) will be SKIPPED' : '');
    L.push('  · ' + who + ' — ' + r.months.join(',') + ': ' + r.hours + ' h at ' + r.rate + '/' + o.basis +
      'h → ' + r.wouldCreditPtoHours + ' PTO hours = ' + r.wouldCreditDays + ' day(s)' + tail);
    if (r.zeroReason) L.push('      WHY ZERO: ' + r.zeroReason);
    if (r.settled) {
      L.push('      SETTLED: column R already reads ' + r.stamp + ', so the job will NOT credit this' +
        (r.wouldCreditDays > 0 ? ' — set column R to the month BEFORE ' + o.inspectYm + ' to re-credit it.' : '.'));
    }
  });
  const rec = o.reconcile || [];
  if (rec.length) {
    const open = rec.filter((r) => r.action !== 'ok');
    L.push('── Reconcile: ' + ((o.reconcileWindow || []).join(', ') || 'recent months') +
      ' vs what was already credited ──');
    if (!open.length) {
      L.push('  Nothing outstanding — every credited month still reads the hours it was paid for.');
    }
    open.forEach((r) => {
      const who = r.name + ' [' + r.id + ']';
      if (r.action === 'topup') {
        L.push('  · ' + who + ' — ' + r.months + ': credited for ' + r.ledgerHours + ' h, now reads ' +
          r.hoursNow + ' h → the next credit run TOPS UP ' + r.deltaDays + ' day(s)' +
          (r.incompleteDays || r.orphanDays ? ' (' + ((r.incompleteDays || 0) + (r.orphanDays || 0)) +
            ' day(s) still without a usable pair)' : ''));
      } else if (r.action === 'shortfall') {
        L.push('  · ' + who + ' — ' + r.months + ': ' + r.why +
          '. NOT clawed back — a deleted punch needs a person.');
      } else {
        L.push('  · ' + who + ' — ' + r.months + ': NOT reconciled (' + r.why + ').');
      }
    });
    if (o.ledgerTruncated) {
      L.push('  !! the ledger read hit its row cap — an older month may not have been checked.');
    }
  }
  L.push(o.inspectYm
    ? ('Total ' + o.inspectYm + ' is WORTH: ' + (Math.round(totalDays * 100) / 100) + ' day(s) across ' +
       o.reps.filter((r) => r.wouldCreditDays > 0).length + ' rep(s). Nothing was credited by this run.')
    : ('Total that WOULD be credited: ' + (Math.round(totalDays * 100) / 100) + ' day(s) across ' +
       o.reps.filter((r) => r.wouldCreditDays > 0).length + ' rep(s). Re-run creditMonthlyPtoAccruals to apply.'));
  return L.join('\n');
}
/** The month list a plan owes: stamp+1 .. newStamp, capped to plan.months
 *  (the newest ones — the cap drops the OLDEST, which the audit row names). */
function accrualMonthList_(stampYm, plan) {
  if (!plan || plan.months <= 0) return [];
  const out = [];
  const parts = plan.newStamp.split('-');
  let y = +parts[0], m = +parts[1];
  for (let k = 0; k < plan.months; k++) {
    out.unshift(y + '-' + String(m).padStart(2, '0'));
    m -= 1; if (m === 0) { m = 12; y -= 1; }
  }
  return out;
}
/** One month's slice out of a range-wide index. The index stores per-rep
 *  totals for the whole range, so a MULTI-month catch-up re-walks that rep's
 *  days; single-month runs (the daily norm) never call this. */
function workedHoursForEmpMonth_(idx, empId, startIso, endIso) {
  const days = (idx && idx.perDayByEmp && idx.perDayByEmp[empId]) || null;
  if (!days) return { hours: 0, incompleteDays: 0, orphanDays: 0 };
  let hours = 0, incomplete = 0, orphan = 0;
  Object.keys(days).forEach((date) => {
    if (date < startIso || date > endIso) return;
    const v = days[date];
    if (v === TIMESHEET_DAY_INCOMPLETE) incomplete++;
    else if (v === TIMESHEET_DAY_ORPHAN) orphan++;
    else hours += v;
  });
  return { hours: +hours.toFixed(2), incompleteDays: incomplete, orphanDays: orphan };
}
/**
 * The ONE roster-INCLUSION predicate: a row counts as a CURRENT employee iff
 * it carries a non-blank email. Returns the trimmed email, or '' — so a caller
 * writes `if (!empRosterEmail_(row)) continue;` and also has the value.
 *
 * WHY A PREDICATE (cycle-15 F3 — the INV-167 shape, on a second column):
 * offboarding here means clearing the email while KEEPING the name (so history
 * still reads), and a name-only row is not a person to count. FOURTEEN walks
 * each decided that for themselves, and they did not agree:
 *   • NINE tested raw truthiness  — `if (!rows[i][EMP.EMAIL]) continue;`
 *   • THREE tested trimmed        — `if (!String(...||'').trim()) continue;`
 *   • TWO tested nothing at all   — getTeamMetrics (acts on it) and
 *     getPunctualityReport (harmless — it self-filters on `!dates.length`).
 * So a WHITESPACE-ONLY email cell made the first two groups DISAGREE, exactly
 * as column L did before `cnEnrolledSheetId_` (INV-167), and getTeamMetrics
 * admitted an offboarded rep outright: its gate is
 * `if (cdr || noteCount > 0 || …)`, and an offboarded name still matching DQE
 * history satisfies it — so a departed employee got a full row in the
 * manager's team table AND their volume flowed into teamTotals.
 * Trimming here makes every walk agree on one answer; it can only NARROW the
 * four raw-truthiness call sites (a whitespace-only cell is now excluded),
 * which is the correct direction and matches INV-167's resolution.
 *
 * NOT an authorization check — `getEmployeeInfo_` still identifies the caller.
 * This governs only whether a roster ROW is counted in a team-wide walk.
 */
function empRosterEmail_(row) {
  return String((row && row[EMP.EMAIL]) || '').trim();
}
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
      // QA module access — managers OR a QA_MEMBERS rep (the same pattern);
      // gates the qaQueue tab. Agents stay outside in v1 (operator decision:
      // they do not see their reviews yet).
      canSeeQa: canSeeQa_(emp),
      // DeptRequests v2 — the rep's department memberships (canonical names);
      // gates the Dept Requests "Incoming" inbox section client-side.
      departments: empDepartments_(emp),
      timezone: empTz,
      timezoneAbbr: tzAbbr_(empTz),
      // ALL-CST policy (operator 2026-08-28): every agent, regardless of
      // location, operates on the CST work schedule — so the roster Timezone
      // column is the SCHEDULE FRAME and should equal this anchor for every
      // agent. The client's tzMismatchCheck_ warns when a profile drifts from
      // it (a blank cell falling back to CONFIG.TIMEZONE is the dangerous
      // case); the old browser-vs-profile comparison is retired, since an
      // offshore agent's browser disagreeing with a CST profile is
      // normal-by-policy, not a fault. Additive — an older client ignores it.
      workAnchorTz: CONFIG.MANAGER_TIMEZONE,
      schedule: empShiftSchedule_(emp, empTz),   // Turn D: column-O override wins
      // F2 (cycle 18) — the shell reminder ticker needs to know this is a day
      // OFF, not just what the shift shape is. Approved PTO only; a pending
      // request is not yet a day off.
      offToday: empIsOffToday_(emp.id, today),
      // Operator 2026-08-31: today's PENDING adjustment requests, so the Clock
      // view can say a fix is in flight instead of showing a bare punch button
      // to a rep who has already asked for one. Additive + client-guarded —
      // an older client ignores it.
      pendingAdjustments: empPendingAdjustments_(emp.id, today),
      ptoEnabled: !!(getFlag_('enablePtoTracking') && emp.ptoEnabled),
      annualLeave: emp.annualLeave,
      sickLeave: emp.sickLeave,
      annualLeaveMax: CONFIG.ANNUAL_LEAVE_MAX || 15,
      sickLeaveMax:   CONFIG.SICK_LEAVE_MAX   || 10,
      // Cycle-13 follow-on: `annualPlannedUpcoming` was REMOVED here, along with
      // its `getUpcomingAnnualPlanned_` helper. Its only reader was
      // `renderPtoMini_`, deleted in cycle 8 when the Dashboard redesign moved
      // Annual PTO to the Time/PTO tab — and that tile computes its own
      // pending-planned total client-side from `data.allRequests` (INV-72). The
      // field had been shipped on every getEmployeeState call, and a whole
      // TimeOffRequests read performed for it, with nobody reading either. Batch
      // 2's A8 hardened that helper's error path; this supersedes it — the
      // honest end state was that the whole path was dead. (INV-74 / the L11
      // "misleading dead code" class.)
      flags: getClientFeatureFlags_(),
      // Blue-green: a short label ('DEV') shown as a banner so an isolated dev
      // instance can't be mistaken for the team's live one. '' on prod → no banner.
      instanceLabel: instanceLabel_(),
    };
  } catch (err) { return { error: err.message }; }
}
function recordPunch(punchType, custom) {
  // Operator 2026-08-17 ("noticeable delay before the confirmation toast and
  // the buttons change"): the client used to make TWO sequential round trips —
  // the punch write, then a full getEmployeeState refetch — before anything on
  // screen moved. The fresh state now RIDES the punch response, computed here
  // in the wrapper AFTER the core's finally has released the global ScriptLock
  // (state assembly is reads-only — mostly the cached roster + one bounded
  // today-punches read — and holding the write lock through it would tax every
  // concurrent punch, the INV-153 starvation reasoning). Additive field: an
  // old client ignores it and refetches as before; a state-assembly failure
  // degrades the same way (the client falls back to its own refetch).
  const result = recordPunchCore_(punchType, custom);
  if (result && result.success) {
    try { result.state = getEmployeeState(); } catch (e) { /* client refetches */ }
  }
  return result;
}
function recordPunchCore_(punchType, custom) {
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
      // M-1 (cycle 10): enforce the SAME next-action state machine the client
      // renders its buttons from (getNextActions_ over today's sorted punches).
      // A fresh client can only offer valid actions, so this never rejects a
      // legitimate click; a STALE window (second browser / pinned pop-out that
      // missed a punch made elsewhere, or a direct RPC) could otherwise append
      // a duplicate ClockIn/ClockOut or an out-of-sequence lunch punch — rows
      // every downstream consumer (Day Edit's one-slot-per-type model, hours,
      // live status, the ADP export) mis-models. Multi-lunch stays legal:
      // getNextActions_ offers LunchOut again after LunchIn. Adjustments
      // bypass (back-fills are validated by their own window/format guards).
      const validNext = getNextActions_(todayPunches);
      if (validNext.indexOf(punchType) < 0) {
        const lastAny = todayPunches.length ? todayPunches[todayPunches.length - 1] : null;
        return { success: false, error:
          `Cannot record ${punchType} — ` +
          (lastAny ? `your last punch today is ${lastAny.type} at ${toDisplayTime_(lastAny.time)}.`
                   : `you haven't clocked in yet.`) +
          ` Refresh the page for current actions, or use Adjust to fix a mistake.` };
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
        existing.sheet.getRange(existing.rowIndex, ADP.TIME + 1).setValue(sheetSafe_(time));
        existing.sheet.getRange(existing.rowIndex, ADP.COMMENTS + 1).setValue(sheetSafe_(commentLabel));
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

// ── Pay statement (operator 2026-08-17) ────────────────────────────────────
// Detailed per-period payroll data so an agent can check their own hours for
// discrepancies without asking payroll. Own-data-only by construction (the
// caller's identity resolves the target); a manager/admin may view any rep via
// the optional repEmpId (the getEmployeeTimesheetForManager posture). Hourly
// pay rates live in roster column P (EMP.PAY_RATE) and are read ONLY here —
// never spread onto emp objects, so no other endpoint can leak a rate.
/** The ONE reader of roster column P: positive finite hourly rate, or null.
 *  Tolerates "$18.50" / "18.50/hr" (strips everything but digits + dot);
 *  a 15-col legacy row (no column P yet) reads as undefined → null. */
function empPayRate_(row) {
  const raw = String(row && row[EMP.PAY_RATE] != null ? row[EMP.PAY_RATE] : '').replace(/[^0-9.]/g, '');
  const v = parseFloat(raw);
  return (isFinite(v) && v > 0) ? v : null;
}
/** Rate lookup by employee id — the single consumer path for column P. */
function empPayRateById_(empId) {
  const rows = getEmployeeRosterRows_();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][EMP.ID]).trim() === String(empId).trim()) return empPayRate_(rows[i]);
  }
  return null;
}
/** PURE — the pay period `offset` periods before the current one (0 = current,
 *  clamped 0..6). Biweekly shifts the CURRENT range (the org-anchor boundary
 *  getCurrentBiweeklyRange_ resolves — INV-18: the same boundary the ADP
 *  export uses) back 14 days per period; monthly is calendar-month arithmetic
 *  off todayStr (UTC-noon anchors — DST-safe, year wrap handled). */
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
function getMyPayStatement(offset, repEmpId) {
  try {
    const caller = getEmployeeInfo_();
    if (!caller) return { error: 'Employee not found.' };
    let target = caller, viewingOther = null;
    const reqId = String(repEmpId || '').trim();
    if (reqId && reqId !== caller.id) {
      // Only the rep themself, a manager, or an admin sees a statement — the
      // operator's own-data rule. (isAdmin ⊆ isManager, so one check covers both.)
      if (!caller.isManager) return { error: 'Manager access required.' };
      target = lookupEmployeeById_(reqId);
      if (!target) return { error: 'Employee not found.' };
      viewingOther = { id: target.id, name: target.name };
    }
    const empTz = empTz_(target);
    const todayStr = fmtDateTz_(new Date(), empTz);
    const cycle = target.payCycle || 'Monthly';
    const currentBiweekly = String(cycle).toLowerCase() === 'biweekly'
      ? getCurrentBiweeklyRange_(todayStr) : null;
    if (String(cycle).toLowerCase() === 'biweekly' && !currentBiweekly)
      return { error: 'No biweekly pay anchor is configured — ask your manager.' };
    const range = payPeriodRange_(cycle, currentBiweekly, todayStr, offset);
    if (!range) return { error: 'Could not resolve the pay period.' };

    const ts = buildTimesheetForEmployee_(target, range.start, range.end);
    if (ts.error) return { error: ts.error };

    // Approved PTO in the period (deduction days via getLeaveDeduction_ — the
    // INV-72 authoritative map; status compared NORMALIZED, INV-183).
    const pto = [];
    const toRows = getOrCreateTimeOffSheet_().getDataRange().getValues();
    for (let i = 1; i < toRows.length; i++) {
      if (String(toRows[i][TO.EMP_ID]).trim() !== target.id) continue;
      if (String(toRows[i][TO.STATUS] || '').trim().toLowerCase() !== 'approved') continue;
      const d = normalizeDate_(toRows[i][TO.DATE]);
      if (d < range.start || d > range.end) continue;
      const type = String(toRows[i][TO.TYPE] || '');
      pto.push({ date: d, type: type, days: getLeaveDeduction_(type).days });
    }
    pto.sort(function (a, b) { return a.date < b.date ? -1 : 1; });

    const rate = empPayRateById_(target.id);
    // INV-153 honesty: buildTimesheetForEmployee_ reads the LIVE tab only, so
    // with archiving enabled an old period may be partially archived — say so
    // rather than presenting a short statement as complete (INV-187).
    const archiveDays = getTimesheetArchiveDays_();
    const archiveNote = !!(archiveDays > 0 &&
      daysBetween_(range.start, todayStr) > archiveDays);
    return {
      period: { start: ts.startDate, end: ts.endDate, cycle: cycle, offset: range.offset },
      days: ts.days, totalHours: ts.totalHours, daysWorked: ts.daysWorked,
      incompleteCount: ts.incompleteCount, timezone: ts.timezone,
      pto: pto,
      rate: rate,
      estGross: rate != null ? Math.round(ts.totalHours * rate * 100) / 100 : null,
      archiveNote: archiveNote,
      maxOffset: 6,
      viewingOther: viewingOther,
    };
  } catch (err) { return { error: err.message }; }
}
function submitTimeOffRequest(date, type, notes) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Employee not found.' };
    // C17 batch-5 — `notes` was the module's only unbounded client free text
    // (every sibling caps: INV-96 forms, INV-143 subformData, COACH_TEXT_MAX):
    // >50k threw mid-lock; ~45k wrote fine and was echoed whole into the
    // dashboard, calendar, decision email, and — on cancel — the shared
    // AuditLog row that every bounded tail scan reads. 1000 chars is generous
    // for a request note.
    notes = String(notes || '').slice(0, 1000);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return { success: false, error: 'Invalid date format.' };
    // Cycle-11 L-11 — sanity horizon. The time-off date was the module's only
    // unbounded date write: a typo'd year (e.g. 2062) created an approvable,
    // balance-deducting row that never surfaced in any month view a manager
    // browses. Bounds are generous (a year ahead for planned leave, 90 days
    // back for retroactive filing) and measured in the REP's own tz.
    {
      const todayRep = fmtDateTz_(new Date(), empTz_(emp));
      const ahead = daysBetween_(todayRep, date);
      if (ahead > TIMEOFF_MAX_DAYS_AHEAD)
        return { success: false, error: 'That date is more than a year ahead — double-check the year.' };
      if (ahead < -TIMEOFF_MAX_DAYS_BACK)
        return { success: false, error: 'That date is more than ' + TIMEOFF_MAX_DAYS_BACK + ' days in the past.' };
    }
    if (!isValidTimeOffType_(type))
      return { success: false, error: 'Invalid leave type.' };
    const toSheet = getOrCreateTimeOffSheet_();
    if (hasActiveTimeOffOnDate_(toSheet, emp.id, date))
      return { success: false, error: 'You already have a pending or approved time-off request for that date.' };
    const submittedAt = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
    toSheet.appendRow(sheetSafeRow_([emp.id, emp.name, date, type, notes || '', 'Pending', submittedAt]));
    writeAuditLog_(emp, 'TimeOffRequest', date, '', false, 0, type + (notes ? ' — ' + notes : ''));
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
function submitTimeOffRange(startDate, endDate, type, notes) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false, error: 'Employee not found.' };
    notes = String(notes || '').slice(0, 1000);   // the C17-⑤ bound, matching the single-day path
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
        !endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
      return { success: false, error: 'Invalid date format.' };
    if (startDate > endDate)
      return { success: false, error: 'Start date must be on or before the end date.' };
    if (daysBetween_(startDate, endDate) > TIMEOFF_RANGE_MAX_DAYS)
      return { success: false, error: 'Range too long (max ' + TIMEOFF_RANGE_MAX_DAYS + ' days) — split it into smaller requests.' };
    {
      const todayRep = fmtDateTz_(new Date(), empTz_(emp));
      if (daysBetween_(todayRep, endDate) > TIMEOFF_MAX_DAYS_AHEAD)
        return { success: false, error: 'That range ends more than a year ahead — double-check the year.' };
      if (daysBetween_(todayRep, startDate) < -TIMEOFF_MAX_DAYS_BACK)
        return { success: false, error: 'That range starts more than ' + TIMEOFF_MAX_DAYS_BACK + ' days in the past.' };
    }
    if (!isValidTimeOffType_(type))
      return { success: false, error: 'Invalid leave type.' };
    const span = daysBetween_(startDate, endDate);
    const days = [];
    for (let i = 0; i <= span; i++) {
      const d = addDaysIso_(startDate, i);
      const dow = new Date(d + 'T00:00:00Z').getUTCDay();
      if (dow !== 0 && dow !== 6) days.push(d);
    }
    if (days.length === 0)
      return { success: false, error: 'That range contains only weekend days.' };
    const toSheet = getOrCreateTimeOffSheet_();
    const conflicts = days.filter(d => hasActiveTimeOffOnDate_(toSheet, emp.id, d));
    if (conflicts.length > 0)
      return { success: false, error: 'You already have a pending or approved request on: ' + conflicts.join(', ') + '. Cancel it or adjust the range.' };
    const submittedAt = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
    days.forEach(d => {
      toSheet.appendRow(sheetSafeRow_([emp.id, emp.name, d, type, notes || '', 'Pending', submittedAt]));
      writeAuditLog_(emp, 'TimeOffRequest', d, '', false, 0,
        type + ' (range ' + startDate + '..' + endDate + ')' + (notes ? ' — ' + notes : ''));
    });
    return { success: true, count: days.length, skippedWeekendDays: (span + 1) - days.length };
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
      if (!empRosterEmail_(empRows[i])) continue;   // F3: one predicate
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
    // PTO1 (operator 2026-09-16) — read the feature flag ONCE. The map below
    // runs per rep, and the balance line needs the flag on every pass.
    const ptoTracking = getFlag_('enablePtoTracking');
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
        // M-2 (cycle 10): the rep's IANA tz, so the Day Edit modal can bound
        // its date picker on the TARGET's "today" (the server validates
        // daysBack in the target's tz — a manager-tz max blocked offshore
        // reps' in-progress local day every CT afternoon). Manager-only
        // surface, so no INV-24 low-privilege leak concern.
        timezone: e.timezone,
        // PTO1 (operator 2026-09-16) — the leave balance, which a manager
        // previously could only see on a rep who happened to have a PENDING
        // request (the `12 → 11 d` chip). The numbers were already built on
        // `employees` above; this projection simply did not carry them.
        //
        // `ptoEnabled` is the CONJUNCTION (the flag AND the per-row column),
        // the same one the pending-card projection makes below. A contractor
        // must render NO balance line rather than a zero — `adjustLeaveBalance_`
        // no-ops for them, so a 0 would read as "used it all" when the truth is
        // "this does not apply" (INV-187 / g114). The client asserts the
        // ABSENCE, not a value.
        //
        // This rides the MANAGER dashboard only. It must never reach
        // `getTeammateStatus`, which is the low-privilege peer view (g33) —
        // the same boundary the `timezone` note above records.
        ptoEnabled: !!(ptoTracking && e.ptoEnabled),
        annualLeave: e.annualLeave,
        sickLeave: e.sickLeave,
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
    const sparkIsos = mgrWorkdaysEnding_(now, mgrTz, 7, 1);    // 7 WORKDAYS, excluding today (operator 2026-09-03)
    const sparkStart = sparkIsos[0];
    const sparkEnd = sparkIsos[sparkIsos.length - 1];
    const sparkPunchMap = {}; // {empId}|{date} → { ClockIn, LunchOut, LunchIn, ClockOut }
    for (let i = 2; i < adpRows.length; i++) {
      const id = String(adpRows[i][ADP.EMP_ID]).trim();
      if (!empById[id]) continue;
      const rowDate = normalizeDate_(adpRows[i][ADP.DATE]);
      if (rowDate < sparkStart || rowDate > sparkEnd) continue;
      const key = `${id}|${rowDate}`;
      if (!sparkPunchMap[key]) sparkPunchMap[key] = {};
      const ptype = normalizeType_(String(adpRows[i][ADP.COMMENTS]));
      punchDayAdd_(sparkPunchMap[key], ptype, normalizeTime_(adpRows[i][ADP.TIME]));
    }
    const sparkHoursMap = {};
    Object.keys(sparkPunchMap).forEach(key => {
      const p = sparkPunchMap[key];
      if (p.ClockIn && p.ClockOut) {
        // A3: a null (unparseable) result is left OUT of the map, so the
        // sparkline reads that day as 0/no-data rather than plotting NaN.
        const h = calcHours_(p.ClockIn, p.ClockOut, p.LunchOut || null, p.LunchIn || null);
        if (h !== null) sparkHoursMap[key] = h;
      }
    });
    // F-48 (cycle 20): THREE states, not two. `|| 0` collapsed two different
    // days onto the same bar — a rep who did not work (a real zero, the V-10
    // dim bar) and a rep whose day could not be measured (still clocked in at
    // the moment of the read, or an unparseable stamp calcHours_ refused).
    // The second is an UNKNOWN, and an unknown is not an elapsed zero (g54):
    // painting it as one told a manager "0 hours worked" about a day the
    // server had no hours for. A day with NO punch rows keeps reading 0; a
    // day WITH punches and no computable total ships null, and the sparkline
    // renders it as a gap, not a bar.
    liveStatus.forEach(ls => {
      ls.recentHours = sparkIsos.map(ds => {
        const k = `${ls.id}|${ds}`;
        if (Object.prototype.hasOwnProperty.call(sparkHoursMap, k)) return { date: ds, hours: sparkHoursMap[k] };
        return { date: ds, hours: sparkPunchMap[k] ? null : 0 };
      });
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
      getCompanyHolidays_(parseInt(y, 10)).forEach(h => { holidayMap[h.date] = h.name; });
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
      // then rejects (or vice-versa) (L13). Cycle-11 L-14: backward-only
      // (no Math.abs), matching deletePunch's C7 semantics — a future-dated
      // garbage row stays deletable from the UI too.
      const dBack = daysBetween_(rowDate, e.todayStr);
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

    // Analytics: daily punch counts (today + the 7 prior days = 8 bars) +
    // time-off status summary. C11 (cycle 10): filtered to roster employees —
    // this was the ONE adpRows pass without the empById filter, so off-roster
    // / TEST_-remnant ids inflated the trend bars while every other dashboard
    // aggregate excluded them.
    // Operator 2026-09-03: WORKDAYS, not calendar days — the chart carried two
    // guaranteed-zero weekend bars every week (see mgrWorkdaysEnding_).
    const analyticsIsos = mgrWorkdaysEnding_(now, mgrTz, 8, 0);   // 8 bars: today + 7 prior workdays
    const punchCountsByDate = {};
    const analyticsStart = analyticsIsos[0];
    for (let i = 2; i < adpRows.length; i++) {
      if (!empById[String(adpRows[i][ADP.EMP_ID]).trim()]) continue;   // C11
      const d = normalizeDate_(adpRows[i][ADP.DATE]);
      if (d >= analyticsStart && d <= todayStr) {
        punchCountsByDate[d] = (punchCountsByDate[d] || 0) + 1;
      }
    }
    const punchTrend = analyticsIsos.map(ds => ({ date: ds, count: punchCountsByDate[ds] || 0 }));
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
    // missedTrend walks WORKDAYS (a weekend can never carry a missed clock-out
    // on this roster); pendingTrend stays on CALENDAR days — a PTO request can
    // be SUBMITTED on a Saturday, and that bar is data, not a structural zero.
    const missedIsos = mgrWorkdaysEnding_(now, mgrTz, trendDays, 1);
    const missedTrendStart = missedIsos[0];
    const missedTrendEnd = missedIsos[missedIsos.length - 1];

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
    const missedTrend = missedIsos.map(ds => ({ date: ds, count: missedByDate[ds] || 0 }));

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
/** Team punches calendar (operator 2026-08-31) — the one manager cut the app
 *  lacked: every rep's punch times for an ARBITRARY date in one place (Live
 *  Status is this view pinned to today; Day Edit is one rep at a time). One
 *  month per call so the client's calendar + day-table render from a single
 *  read, matching buildCalendarForEmployee_'s one-shot month model.
 *  READ-ONLY, manager-gated (read shape: bare {error} — the GATE-SHAPE rule).
 *  Per-day per-rep derivation MIRRORS buildTimesheetForEmployee_ exactly
 *  (last punch per type wins — the findExistingPunch_/Day-Edit convention;
 *  calcHours_ null → INCOMPLETE, never 0; a ClockIn with no ClockOut is
 *  in-progress on the rep's own today, incomplete on a past day) so this
 *  table can never disagree with the pay statement over the same rows.
 *  Live-tab-only by design (the calendar/Punctuality posture) — a month
 *  predating the live tab's oldest row carries archiveNote (INV-187). */
/* Operator 2026-09-03: the manager trends counted CALENDAR days, so the Punch
 * Activity chart and every live-status sparkline carried two guaranteed-zero
 * bars a week (no rep works Sat/Sun — operator-confirmed 2026-08-21; the
 * weekend is INFERRED, the same limit remindIsDayOff_ carries). Walks back
 * from (today − endOffset) in the manager tz collecting `n` weekdays, oldest
 * → newest. Bounded so a bad `n` can never spin. */
function mgrWorkdaysEnding_(now, tz, n, endOffset) {
  const out = [];
  const limit = endOffset + n * 2 + 7;
  for (let off = endOffset; out.length < n && off < limit; off++) {
    const d = new Date(now); d.setDate(d.getDate() - off);
    const iso = fmtDateTz_(d, tz);
    const dow = new Date(iso + 'T12:00:00Z').getUTCDay();
    if (dow === 0 || dow === 6) continue;
    out.unshift(iso);
  }
  return out;
}
function getTeamCalendar(monthIso) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { error: 'Manager access required.' };
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(monthIso || ''))) return { error: 'Invalid month (expected yyyy-MM).' };
    monthIso = String(monthIso);

    // Roster inclusion via the ONE predicate (INV-183/F3) — an offboarded
    // name-only row is not a person to list.
    const rosterRows = getEmployeeRosterRows_();
    const reps = {};                    // id -> { name, todayStr (rep-tz) }
    const todayByTz = {};               // memo — one Intl format per distinct tz
    for (let i = 1; i < rosterRows.length; i++) {
      if (!empRosterEmail_(rosterRows[i])) continue;
      const id = String(rosterRows[i][EMP.ID] || '').trim();
      if (!id) continue;
      const tz = safeTimezone_(String(rosterRows[i][EMP.TIMEZONE] || '').trim());
      if (todayByTz[tz] === undefined) todayByTz[tz] = fmtDateTz_(new Date(), tz);
      reps[id] = { name: String(rosterRows[i][EMP.NAME] || '').trim(), todayStr: todayByTz[tz] };
    }

    // ONE Timesheet read; rows are APPEND order, so per-(rep,date) the last
    // row per type wins (deliberately NOT time-sorted first — the Day Edit /
    // managerSaveDay last-row-wins snapshot is what a pencil click will edit).
    const adpRows = getAdpSS_().getSheetByName(CONFIG.ADP_TAB).getDataRange().getValues();
    const byDay = {};                   // dateIso -> id -> [{time, type, isAdjustment}]
    let oldestLiveIso = null;
    for (let i = 2; i < adpRows.length; i++) {
      const dateIso = normalizeDate_(adpRows[i][ADP.DATE]);
      if (!dateIso) continue;
      if (oldestLiveIso === null || dateIso < oldestLiveIso) oldestLiveIso = dateIso;
      if (dateIso.substring(0, 7) !== monthIso) continue;
      const id = String(adpRows[i][ADP.EMP_ID] || '').trim();
      if (!reps[id]) continue;
      const rawType = String(adpRows[i][ADP.COMMENTS] || '');
      const type = normalizeType_(rawType);
      if (PUNCH_LABELS_.indexOf(type) === -1) continue;   // garbage row ≠ a punch (the getNextActions_ lesson)
      if (!byDay[dateIso]) byDay[dateIso] = {};
      if (!byDay[dateIso][id]) byDay[dateIso][id] = [];
      byDay[dateIso][id].push({ time: normalizeTime_(adpRows[i][ADP.TIME]), type,
        isAdjustment: rawType.indexOf('ADJ-') === 0 });
    }

    const days = {};                    // dateIso -> { reps: [...], off: [...] }
    Object.keys(byDay).forEach(dateIso => {
      const repRows = [];
      Object.keys(byDay[dateIso]).forEach(id => {
        const punches = byDay[dateIso][id];
        const pm = {}, adjMap = {};
        punches.forEach(p => { punchDayAdd_(pm, p.type, p.time); adjMap[p.type] = adjMap[p.type] || p.isAdjustment; });
        let hours = null, incomplete = false, inProgress = false;
        if (pm.ClockIn) {
          if (pm.ClockOut) {
            hours = calcHours_(pm.ClockIn, pm.ClockOut, pm.LunchOut || null, pm.LunchIn || null);
            if (hours === null) incomplete = true;      // A3/INV-176: null, never 0
          } else if (dateIso === reps[id].todayStr) inProgress = true;
          else if (dateIso < reps[id].todayStr) incomplete = true;
        } else incomplete = true;                        // lunch rows with no ClockIn
        repRows.push({
          id, name: reps[id].name,
          clockIn: pm.ClockIn || null,    adjClockIn: !!adjMap.ClockIn,
          lunchOut: punchFirst_(pm.LunchOut),  adjLunchOut: !!adjMap.LunchOut,
          lunchIn: punchFirst_(pm.LunchIn),    adjLunchIn: !!adjMap.LunchIn,
          // Every break pair, in the order calcHours_ deducts them. Additive:
          // the two scalars above still carry the first stamp for older clients.
          breaks: breakPairs_(pm.LunchOut, pm.LunchIn, timeToMins_(pm.ClockIn))
            .map(b => ({ out: b.out, in: b.in })),
          clockOut: pm.ClockOut || null,  adjClockOut: !!adjMap.ClockOut,
          hours, incomplete, inProgress,
          punchCount: punches.length,     // > filled slots ⇒ collapsed extras (multi-lunch / pre-guard duplicates)
        });
      });
      repRows.sort((a, b) => a.name.localeCompare(b.name));
      days[dateIso] = { reps: repRows, off: [] };
    });

    // PTO overlay — normalize the status cell ONCE at the read (the INV-183
    // DR.STATUS/TO.STATUS family): trimmed + lowercased, approved/pending only.
    // F-49 (2026-09-18): through the provisioner — a fresh deployment with no
    // TimeOffRequests tab yet threw on `null.getDataRange` here, and the team
    // calendar failed to load until someone submitted the first request.
    const toRows = getOrCreateTimeOffSheet_().getDataRange().getValues();
    for (let i = 1; i < toRows.length; i++) {
      const dateIso = normalizeDate_(toRows[i][TO.DATE]);
      if (!dateIso || dateIso.substring(0, 7) !== monthIso) continue;
      const id = String(toRows[i][TO.EMP_ID] || '').trim();
      if (!reps[id]) continue;
      const st = String(toRows[i][TO.STATUS] || '').trim().toLowerCase();
      if (st !== 'approved' && st !== 'pending') continue;
      if (!days[dateIso]) days[dateIso] = { reps: [], off: [] };
      // PTO2 (operator 2026-09-16): `empId` so the client can join this chip to
      // the balance on `liveStatus` BY ID. The table above already merges
      // absent reps by NAME, which works until two people share one — an id is
      // here because it costs nothing and does not inherit that fragility.
      days[dateIso].off.push({ empId: id, name: reps[id].name,
        type: String(toRows[i][TO.TYPE] || '').trim(), status: st });
    }
    Object.keys(days).forEach(d => days[d].off.sort((a, b) => a.name.localeCompare(b.name)));

    const holidays = {};
    const calYear = parseInt(monthIso.substring(0, 4), 10);
    // December also consults year+1: a Jan 1 falling on a Saturday observes
    // on the PRIOR Dec 31 (fixedHoliday_'s shift), which lives in this month.
    let holidayList = getCompanyHolidays_(calYear);
    if (monthIso.substring(5) === '12') holidayList = holidayList.concat(getCompanyHolidays_(calYear + 1));
    holidayList.forEach(h => {
      if (h.date.substring(0, 7) === monthIso) holidays[h.date] = h.name;
    });

    return {
      month: monthIso, days, holidays,
      rosterCount: Object.keys(reps).length,
      adjustWindowDays: CONFIG.ADJUST_WINDOW_DAYS,
      // Live-tab-only read: a month wholly older than the live tab may have
      // been moved to TimesheetArchive — say so instead of rendering a
      // confident empty month (INV-187; the pay-statement archiveNote shape).
      archiveNote: !!(oldestLiveIso && monthIso < oldestLiveIso.substring(0, 7)),
    };
  } catch (err) { return { error: err.message }; }
}
function updateTimeOffStatus(empId, date, submittedAt, newStatus) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let notifyAfter = null;
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
        // Cycle-17 C17-2 — normalize the stored status ONCE (the F8 /
        // INV-183 pattern). Every sibling TO.STATUS reader lowercases, but
        // this — the ONE function that mutates balances — compared the raw
        // trimmed cell, so a hand-edited 'approved'/'APPROVED' row read as
        // approved everywhere else yet NOT-approved here (re-deduct on
        // approve, skipped restore on deny), and a lowercased 'reconciled'
        // defeated the S1.3 terminal guard. oldStatusRaw survives ONLY for
        // the compensating revert + the audit note, so the cell is written
        // back / recorded exactly as found.
        const oldStatusRaw = String(rows[i][TO.STATUS]).trim();
        const oldStatus = oldStatusRaw.toLowerCase();
        const type    = String(rows[i][TO.TYPE]);
        const notes   = String(rows[i][TO.NOTES]);
        const empName = String(rows[i][TO.EMP_NAME]);

        // S1.3 — 'Reconciled' rows are neutralized duplicates (fixPtoReconciliation
        // already credited their over-charge back). Re-approving one would
        // RE-DEDUCT via the transition below (oldStatus !== 'Approved' &&
        // newStatus === 'Approved'), undoing the credit. Treat Reconciled as
        // terminal — refuse any status change on it.
        if (oldStatus === 'reconciled') {
          return { success: false, error: 'This request was reconciled (a duplicate already credited back) and can no longer change status.' };
        }

        // Cycle-11 M-1 — the INV-94 duplicate-date guard applied to the
        // STATUS-CHANGE path: flipping an old Denied/Pending row to Approved
        // while ANOTHER Pending/Approved row exists for the same date was the
        // last creator of the double-deduct signature (two Approved rows, one
        // date) that getPtoReconciliation exists to detect after the fact.
        // The submit paths already carry this guard; this row's own index is
        // excluded so approving a lone Pending row is unaffected.
        if (oldStatus !== 'approved' && newStatus === 'Approved'
            && hasActiveTimeOffOnDate_(sheet, empId, date, i)) {
          return { success: false, error:
            'This employee already has another Pending or Approved request for ' + date +
            ' — approving this one would double-book (and double-deduct) the date. ' +
            'Deny or cancel the other request first.' };
        }

        sheet.getRange(i + 1, TO.STATUS + 1).setValue(sheetSafe_(newStatus));

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
              if (oldStatus !== 'approved' && newStatus === 'Approved') {
                newBalance = adjustLeaveBalance_(empId, dedu.bucket, -dedu.days);
              } else if (oldStatus === 'approved' && newStatus !== 'Approved') {
                newBalance = adjustLeaveBalance_(empId, dedu.bucket, dedu.days);
              }
            } catch (balErr) {
              try { sheet.getRange(i + 1, TO.STATUS + 1).setValue(sheetSafe_(oldStatusRaw)); } catch (revertErr) {
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
          `${oldStatusRaw}→${newStatus} (${type})`, callerEmp.email);

        // Email the employee (best-effort — cycle-9 M-7: fires post-lock in
        // the finally so the send never holds the global ScriptLock).
        if (oldStatus !== newStatus.toLowerCase() && targetEmp && targetEmp.email) {
          notifyAfter = function () { notifyEmployeeOfDecision_(targetEmp, date, type, notes, newStatus); };
        }

        return { success: true, newBalance };
      }
    }
    return { success: false, error: 'Request not found (may have been modified).' };
  } catch (err) { return { success: false, error: err.message }; }
  finally {
    lock.releaseLock();
    // M-7: best-effort mail fires only after the global lock is released.
    if (notifyAfter) { try { notifyAfter(); } catch (e) { console.warn('post-lock notify failed: ' + e.message); } }
  }
}
/** Manager files a time-off request on behalf of an employee.
 *  Optionally auto-approves it in the same call (skipping the Pending stage). */
function managerSubmitTimeOff(empId, date, type, notes, autoApprove) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let notifyAfter = null;
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager)
      return { success: false, error: 'Manager access required.' };

    if (!empId) return { success: false, error: 'No employee selected.' };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return { success: false, error: 'Invalid date format (expected yyyy-MM-dd).' };
    if (!isValidTimeOffType_(type)) return { success: false, error: 'Invalid leave type.' };
    notes = String(notes || '').slice(0, 1000);   // C17 batch-5 — same cap as submitTimeOffRequest

    const targetEmp = lookupEmployeeById_(empId);
    if (!targetEmp) return { success: false, error: 'Employee not found.' };

    // Cycle-11 L-11 — same sanity horizon as submitTimeOffRequest, in the
    // TARGET employee's tz (the sibling-surface discipline).
    {
      const todayTarget = fmtDateTz_(new Date(), empTz_(targetEmp));
      const ahead = daysBetween_(todayTarget, date);
      if (ahead > TIMEOFF_MAX_DAYS_AHEAD)
        return { success: false, error: 'That date is more than a year ahead — double-check the year.' };
      if (ahead < -TIMEOFF_MAX_DAYS_BACK)
        return { success: false, error: 'That date is more than ' + TIMEOFF_MAX_DAYS_BACK + ' days in the past.' };
    }

    const toSheet = getOrCreateTimeOffSheet_();
    if (hasActiveTimeOffOnDate_(toSheet, targetEmp.id, date))
      return { success: false, error: 'That employee already has a pending or approved request for that date.' };

    const status = autoApprove ? 'Approved' : 'Pending';
    const submittedAt = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
    toSheet
      .appendRow(sheetSafeRow_([targetEmp.id, targetEmp.name, date, type, notes || '', status, submittedAt]));

    // Apply leave deduction immediately if auto-approving
    let newBalance = null;
    if (autoApprove && getFlag_('enablePtoTracking')) {
      const dedu = getLeaveDeduction_(type);
      if (dedu.bucket) {
        try {
          newBalance = adjustLeaveBalance_(empId, dedu.bucket, -dedu.days);
        } catch (balErr) {
          // Cycle-9 M-2 (the updateTimeOffStatus compensating-revert pattern):
          // the Approved row is already appended — without removing it, a
          // retry is blocked by hasActiveTimeOffOnDate_ and the natural
          // Deny → re-Approve recovery CREDITS a deduction that never
          // happened (balance permanently one day high). Delete the
          // just-appended row so a retry starts clean — safe under the
          // ScriptLock (no concurrent appender can interleave).
          try { toSheet.deleteRow(toSheet.getLastRow()); } catch (revertErr) {
            Logger.log('managerSubmitTimeOff: row revert after balance failure ALSO failed (' +
              revertErr.message + ') — the TimeOffRequests last row may need manual removal.');
          }
          throw balErr;
        }
      }
    }

    writeAuditLog_(targetEmp, 'TimeOffRequest', date, '', false, 0,
      `${type}${notes ? ' — ' + notes : ''} (filed by manager${autoApprove ? ', auto-approved' : ''})`,
      callerEmp.email);

    // Only notify employee when auto-approving (Pending is just a queued item,
    // no need to email yet). Cycle-9 M-7: fires post-lock in the finally.
    if (autoApprove && targetEmp.email) {
      notifyAfter = function () { notifyEmployeeOfDecision_(targetEmp, date, type, notes || '', status); };
    }

    return { success: true, newBalance, status };
  } catch (err) { return { success: false, error: err.message }; }
  finally {
    lock.releaseLock();
    // M-7: best-effort mail fires only after the global lock is released.
    if (notifyAfter) { try { notifyAfter(); } catch (e) { console.warn('post-lock notify failed: ' + e.message); } }
  }
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
    const reconRows = { annual: [], sick: [] };   // 1-based row indices per bucket
    Object.keys(byDate).forEach(function (d) {
      const list = byDate[d];
      if (list.length < 2) return;
      if (ptoLegitHalfDayPair_(list)) return;   // F(L-4): legitimate pair — never neutralize
      list.sort(function (a, b) { return b.days - a.days; });   // canonical = list[0]
      for (let k = 1; k < list.length; k++) {
        if (list[k].bucket === 'annual') { creditAnnual += list[k].days; reconRows.annual.push(list[k].rowIndex); }
        else if (list[k].bucket === 'sick') { creditSick += list[k].days; reconRows.sick.push(list[k].rowIndex); }
      }
    });
    creditAnnual = Math.round(creditAnnual * 100) / 100;
    creditSick   = Math.round(creditSick * 100) / 100;

    if (reconRows.annual.length + reconRows.sick.length === 0) {
      return { success: true, fixed: false, message: 'No duplicate approved rows to reconcile.' };
    }

    // Cycle-9 M-2 — neutralize + credit PER BUCKET, each as its own
    // compensated unit (the updateTimeOffStatus revert pattern). The old
    // shape neutralized ALL rows first, then credited: a thrown credit left
    // the rows 'Reconciled' (no longer detectable) with the over-charge
    // never returned — permanently invisible to both the detector and a
    // re-run. Now a failed bucket reverts ITS rows to 'Approved' and
    // rethrows, so a re-run re-detects and re-credits cleanly; an earlier
    // bucket that already committed stays committed (its audit row is
    // written best-effort before the rethrow) and can never double-credit
    // because its rows are no longer 'Approved'. All inside the ScriptLock.
    //
    // Note (M-1 interaction): adjustLeaveBalance_ RETURNS NULL (no throw) for
    // a PtoEnabled=FALSE contractor, so their rows still neutralize with no
    // credit — the right call going forward (contractors no longer accrue
    // drift). Any pre-M-1 contractor over-charge needing an actual balance
    // credit remains a manual sheet edit.
    let newAnnual = null, newSick = null;
    let doneAnnual = 0, doneSick = 0, rowsDone = 0;
    [{ bucket: 'annual', rows: reconRows.annual, credit: creditAnnual },
     { bucket: 'sick',   rows: reconRows.sick,   credit: creditSick }].forEach(function (u) {
      if (u.rows.length === 0) return;
      u.rows.forEach(function (ri) { sheet.getRange(ri, TO.STATUS + 1).setValue(sheetSafe_('Reconciled')); });
      try {
        const nb = (u.credit > 0) ? adjustLeaveBalance_(empId, u.bucket, u.credit) : null;
        if (u.bucket === 'annual') { newAnnual = nb; doneAnnual = u.credit; }
        else { newSick = nb; doneSick = u.credit; }
        rowsDone += u.rows.length;
      } catch (balErr) {
        u.rows.forEach(function (ri) {
          try { sheet.getRange(ri, TO.STATUS + 1).setValue(sheetSafe_('Approved')); } catch (revertErr) {
            Logger.log('fixPtoReconciliation: row revert after credit failure ALSO failed (' +
              revertErr.message + ') — row ' + ri + ' may need a manual status fix.');
          }
        });
        if (rowsDone > 0) {
          writeAuditLog_(target, 'PtoReconciliationFix', '', '', false, 0,
            `creditedAnnual=${doneAnnual}; creditedSick=${doneSick}; rowsReconciled=${rowsDone}; partial=${u.bucket}-bucket-failed`,
            callerEmp.email);
        }
        throw balErr;
      }
    });

    writeAuditLog_(target, 'PtoReconciliationFix', '', '', false, 0,
      `creditedAnnual=${doneAnnual}; creditedSick=${doneSick}; rowsReconciled=${rowsDone}`,
      callerEmp.email);

    return {
      success: true, fixed: true,
      creditedAnnual: doneAnnual, creditedSick: doneSick,
      rowsReconciled: rowsDone,
      newAnnual: newAnnual, newSick: newSick,
    };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Is a duplicate group legitimate multi-break data rather than damage?
 *  ONE predicate, consulted by BOTH the detector and the collapse, so the card
 *  can never offer to delete something the repair would keep (or the reverse).
 *
 *  Breaks became legal on 2026-09-01 — calcHours_ deducts every pair — so a day
 *  carrying N LunchOut and N LunchIn stamps is a rep who took N breaks, and
 *  collapsing it would DELETE recorded unpaid time and silently start paying
 *  for it. Extras remain damage when the counts DISAGREE (a stray leave with no
 *  return is exactly what the doctor exists to surface), and a repeated
 *  ClockIn/ClockOut is ALWAYS damage: multi-shift is not supported, and
 *  managerSaveDay still collapses those too. */
function tsDoctorLegitBreaks_(days, empId, date, type) {
  if (type !== 'LunchOut' && type !== 'LunchIn') return false;
  const d = days[empId + '|' + date];
  if (!d) return false;
  // Cycle-19 follow-on: ANY day carrying two-plus stamps of BOTH break types
  // is off-limits to the collapse, whether or not the counts agree. The old
  // equal-count test let a day like leaves [12:00, 17:00] / returns [11:00,
  // 19:00] read as legal while the pairing silently produced ONE 7-hour
  // "break" — and once the counts disagreed on such a day (a double-punched
  // leave on a two-break day) the collapse would have kept the LAST leave and
  // deleted a real one. Those days are REPORTED instead (getTimesheetDoctor's
  // `unpaired` list — Day Edit is the fix); a day with at most one stamp of
  // the other type keeps the classic double-punch semantics (last row wins).
  return d.lo.length > 1 && d.li.length > 1;
}
/** Shared scan. Returns { byKey: { 'empId|date|type': {rows:[rowIdx…], times:[…]} },
 *  days: { 'empId|date': { in:[times], out:[times], name } } } over the window. */
function tsDoctorScan_() {
  const adpRows = getAdpSS_().getSheetByName(CONFIG.ADP_TAB).getDataRange().getValues();
  const mgrTz = CONFIG.MANAGER_TIMEZONE;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - TS_DOCTOR_WINDOW_DAYS);
  const cutoffStr = fmtDateTz_(cutoff, mgrTz);
  const byKey = {}, days = {};
  for (let i = 2; i < adpRows.length; i++) {   // two-row header
    const id = String(adpRows[i][ADP.EMP_ID]).trim();
    if (!id) continue;
    const date = normalizeDate_(adpRows[i][ADP.DATE]);
    if (!date || date < cutoffStr) continue;
    const type = normalizeType_(String(adpRows[i][ADP.COMMENTS]));
    if (!PUNCH_LABELS_.includes(type)) continue;
    const time = normalizeTime_(adpRows[i][ADP.TIME]);
    const key = id + '|' + date + '|' + type;
    if (!byKey[key]) byKey[key] = { rows: [], times: [], empId: id, date: date, type: type, name: String(adpRows[i][ADP.EMP_NAME] || '') };
    byKey[key].rows.push(i + 1);   // 1-indexed sheet row
    byKey[key].times.push(time);
    const dkey = id + '|' + date;
    if (!days[dkey]) days[dkey] = { in: [], out: [], lo: [], li: [], name: String(adpRows[i][ADP.EMP_NAME] || ''), empId: id, date: date };
    if (type === 'ClockIn') days[dkey].in.push(time);
    if (type === 'ClockOut') days[dkey].out.push(time);
    if (type === 'LunchOut') days[dkey].lo.push(time);
    if (type === 'LunchIn') days[dkey].li.push(time);
  }
  return { byKey: byKey, days: days };
}
/** Manager-gated, READ-ONLY detector. */
function getTimesheetDoctor() {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { error: 'Manager access required.' };
    const scan = tsDoctorScan_();
    const duplicates = [], inverted = [], unpaired = [];
    // F2 (cycle 12): count EVERY finding, not just the ones that fit the
    // payload cap — the old silent truncation made a 512-group backlog read as
    // exactly 200, and the card ("Scan of the last 92 days" + a count) looked
    // complete. Every sibling bounded reader returns a truncation signal
    // (getCallNotesAuditLog, getAdminSheetView, getStorageHealth's kbEmbeds).
    let totalDuplicates = 0, totalInverted = 0, totalDuplicateRows = 0, totalUnpaired = 0;
    Object.keys(scan.byKey).forEach(function (k) {
      const g = scan.byKey[k];
      if (tsDoctorLegitBreaks_(scan.days, g.empId, g.date, g.type)) return;   // legal multi-break, not damage
      if (g.rows.length > 1) {
        totalDuplicates++;
        totalDuplicateRows += g.rows.length - 1;   // rows a collapse would delete
        if (duplicates.length < TS_DOCTOR_MAX_GROUPS) {
          duplicates.push({ empId: g.empId, name: g.name, date: g.date, type: g.type,
            count: g.rows.length, times: g.times.slice() });
        }
      }
    });
    Object.keys(scan.days).forEach(function (k) {
      const d = scan.days[k];
      // HH:mm:ss lexicographic = chronological (the INV-155 convention) for
      // the PICK; the COMPARE is at minute granularity, because that is the
      // frame calcHours_ pays in — an equal-minute pair (09:00:10 → 09:00:45)
      // is a zero-hour day the manager should see here, not a valid shift.
      if (d.in.length && d.out.length) {
        const firstIn = d.in.slice().sort()[0];
        const lastOut = d.out.slice().sort()[d.out.length - 1];
        const inM = timeToMins_(firstIn), outM = timeToMins_(lastOut);
        if (inM !== null && outM !== null && outM <= inM) {
          totalInverted++;
          if (inverted.length < TS_DOCTOR_MAX_GROUPS) {
            inverted.push({ kind: 'clock', empId: d.empId, name: d.name, date: d.date, clockIn: firstIn, clockOut: lastOut });
          }
        }
      }
      // Lunch-pair inversion (operator ask): the lunch RETURN landing at or
      // before the lunch LEAVE — the same mis-keyed AM/PM class. Last-return
      // vs first-leave, so a legitimate multi-lunch day never false-flags.
      let lunchInverted = false;
      if (d.lo.length && d.li.length) {
        const firstLo = d.lo.slice().sort()[0];
        const lastLi = d.li.slice().sort()[d.li.length - 1];
        if (lastLi <= firstLo) {
          lunchInverted = true;
          totalInverted++;
          if (inverted.length < TS_DOCTOR_MAX_GROUPS) {
            inverted.push({ kind: 'lunch', empId: d.empId, name: d.name, date: d.date, lunchOut: firstLo, lunchIn: lastLi });
          }
        }
      }
      // Cycle-19 follow-on — UNPAIRABLE break stamps on a multi-break day. The
      // greedy pairing (breakPairs_, INV-176) DROPS a leave with no later
      // return or a return that precedes every open leave; on a day carrying
      // two-plus stamps of BOTH types that drop is invisible everywhere else:
      // the inverted test above passes it (leaves [12:00, 17:00] / returns
      // [11:00, 19:00] reads as one 7-hour break), and the collapse never
      // sees it because tsDoctorLegitBreaks_ protects such days. Report-only
      // — the stamps it names are the ones Day Edit should fix; the doctor
      // must never guess which half is real. Skipped when the day is already
      // listed as inverted (one finding per day).
      if (!lunchInverted && d.lo.length > 1 && d.li.length > 1) {
        const anchor = d.in.length ? timeToMins_(d.in.slice().sort()[0]) : null;
        const pairs = breakPairs_(d.lo, d.li, anchor);
        const used = {};
        pairs.forEach(function (b) { used['o' + b.out] = (used['o' + b.out] || 0) + 1; used['i' + b.in] = (used['i' + b.in] || 0) + 1; });
        const dropped = [];
        d.lo.forEach(function (t) { if (used['o' + t] > 0) used['o' + t]--; else dropped.push('leave ' + t); });
        d.li.forEach(function (t) { if (used['i' + t] > 0) used['i' + t]--; else dropped.push('return ' + t); });
        if (dropped.length) {
          totalUnpaired++;
          if (unpaired.length < TS_DOCTOR_MAX_GROUPS) {
            unpaired.push({ kind: 'unpaired', empId: d.empId, name: d.name, date: d.date,
              lunchOut: d.lo.slice().sort(), lunchIn: d.li.slice().sort(),
              pairs: pairs.map(function (b) { return b.out + '\u2192' + b.in; }), dropped: dropped });
          }
        }
      }
    });
    duplicates.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    inverted.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    unpaired.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    return { duplicates: duplicates, inverted: inverted, unpaired: unpaired, windowDays: TS_DOCTOR_WINDOW_DAYS,
      // F2: honest totals + the per-run collapse bound, so the client can say
      // "showing 200 of 512" and "collapses up to 200 rows per run".
      totalDuplicates: totalDuplicates, totalInverted: totalInverted, totalUnpaired: totalUnpaired,
      totalDuplicateRows: totalDuplicateRows,
      truncated: (totalDuplicates > duplicates.length) || (totalInverted > inverted.length) || (totalUnpaired > unpaired.length),
      fixMaxRows: TS_DOCTOR_FIX_MAX_ROWS };
  } catch (err) { return { error: err.message }; }
}
/** Manager-gated, locked, IDEMPOTENT collapse of every duplicate group found
 *  by a fresh server-side re-scan (never trusts client row indices). Keeps
 *  the LAST row per (emp, date, type) in append order — agreeing with
 *  findExistingPunch_'s last-match and managerSaveDay's collapse (INV-155) —
 *  and deletes the earlier rows bottom-up with a PunchDelete audit row each.
 *  The kept row is untouched, so the personal-sheet mirror stays correct.
 *  Inverted pairs are deliberately NOT auto-fixed (Day Edit is the path). */
function fixTimesheetDuplicates(empIdFilter) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    const filter = String(empIdFilter || '').trim();   // optional: one employee only
    const scan = tsDoctorScan_();
    const sheet = getAdpSS_().getSheetByName(CONFIG.ADP_TAB);
    const toDelete = [];   // {rowIdx, empId, name, date, type, time}
    Object.keys(scan.byKey).forEach(function (k) {
      const g = scan.byKey[k];
      if (g.rows.length < 2) return;
      if (tsDoctorLegitBreaks_(scan.days, g.empId, g.date, g.type)) return;   // never delete a matched break pair
      if (filter && g.empId !== filter) return;
      // Keep the LAST row (highest row index = latest append); delete the rest.
      for (let j = 0; j < g.rows.length - 1; j++) {
        toDelete.push({ rowIdx: g.rows[j], empId: g.empId, name: g.name,
          date: g.date, type: g.type, time: g.times[j] });
      }
    });
    if (!toDelete.length) return { success: true, collapsed: 0, remaining: 0 };
    // Bottom-up so earlier deletions don't shift later row indices.
    toDelete.sort(function (a, b) { return b.rowIdx - a.rowIdx; });
    // F2 (cycle 12): BOUND the run. Previously this collapsed every group the
    // 92-day scan found — regardless of what the button offered (the report is
    // capped at TS_DOCTOR_MAX_GROUPS, so "Collapse 200 group(s)" could delete
    // 500+ rows) — with no ceiling on how long the global ScriptLock was held.
    // Slice bottom-up so the kept row per group is still the LAST one
    // (INV-155: agreeing with findExistingPunch_ / managerSaveDay) whether or
    // not this run reaches every group; the op stays idempotent, so the
    // operator re-clicks until `remaining` is 0.
    const remaining = Math.max(0, toDelete.length - TS_DOCTOR_FIX_MAX_ROWS);
    const batch = toDelete.slice(0, TS_DOCTOR_FIX_MAX_ROWS);
    batch.forEach(function (d) {
      sheet.deleteRow(d.rowIdx);
      writeAuditLog_({ id: d.empId, name: d.name }, 'PunchDelete', d.date, d.time, false, 0,
        'duplicate collapsed (sheet doctor); type=' + d.type, callerEmp.email);
    });
    return { success: true, collapsed: batch.length, remaining: remaining };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
}
/** Manager deletes a single punch within the delete window. */
/** READ-ONLY operator report: which historical days change when calcHours_
 *  started deducting EVERY break pair instead of only the last (2026-09-01).
 *
 *  Run it from the Apps Script editor BEFORE deploying that change. It writes
 *  nothing — no sheet, no audit row, no cache — and reads the live Timesheet
 *  plus TimesheetArchive so a day that has already aged out of the live tab is
 *  still counted (the INV-153/F1 read-through rule).
 *
 *  "Old" hours are reproduced by passing only the LAST stamp of each break type
 *  through the SAME calcHours_ — which is exactly what the old last-wins map
 *  handed it — rather than re-implementing the removed arithmetic, so this
 *  report cannot drift from the behaviour it is describing.
 *
 *  Every listed day gets SHORTER: the earlier breaks were being paid. */
/** READ-ONLY shared reader for the two break-impact reports: every rep-day's
 *  punches from the live Timesheet PLUS TimesheetArchive (INV-153/F1 — an
 *  aged-out day still counts), accumulated through punchDayAdd_ so the
 *  reports see exactly the shape the hours builders see. A row present in
 *  BOTH tabs (a mid-run archive duplicate) is counted ONCE — the INV-132
 *  duplicate-not-lose rule the accrual index already applies; without it a
 *  duplicated LunchOut/LunchIn fabricates a phantom pair and puts a day on a
 *  report that never changes. Writes nothing; never provisions a tab.
 *  Returns { perDay: { 'empId|date': {empId, date, name, pm, source} },
 *            liveRows, archRows }. */
function tsPunchDaysWithArchive_() {
  const ss = getAdpSS_();
  const perDay = {};      // 'empId|date' -> { name, pm }
  const liveKeys = new Set();
  const readTab = (tabName, label) => {
    const sh = ss.getSheetByName(tabName);
    if (!sh) return 0;
    const rows = sh.getDataRange().getValues();
    let seen = 0;
    for (let i = 2; i < rows.length; i++) {
      const id = String(rows[i][ADP.EMP_ID] || '').trim();
      if (!id) continue;
      const date = normalizeDate_(rows[i][ADP.DATE]);
      if (!date) continue;
      const type = normalizeType_(String(rows[i][ADP.COMMENTS]));
      if (PUNCH_LABELS_.indexOf(type) < 0) continue;      // garbage is not a punch (C17 batch-6)
      const time = normalizeTime_(rows[i][ADP.TIME]);
      const rowKey = id + '|' + date + '|' + time + '|' + String(rows[i][ADP.COMMENTS]);
      if (label === 'live') liveKeys.add(rowKey);
      else if (liveKeys.has(rowKey)) continue;
      const key = id + '|' + date;
      if (!perDay[key]) perDay[key] = { empId: id, date: date,
        name: String(rows[i][ADP.EMP_NAME] || '').trim(), pm: {}, source: label };
      punchDayAdd_(perDay[key].pm, type, time);
      seen++;
    }
    return seen;
  };
  const liveRows = readTab(CONFIG.ADP_TAB, 'live');
  const archRows = readTab(TIMESHEET_ARCHIVE_TAB, 'archive');
  return { perDay: perDay, liveRows: liveRows, archRows: archRows };
}
/** The break pairing EXACTLY as it stood before cycle-19 F1 (commit 760c029
 *  replaced it) — kept ONLY so reportBreakPairingChanges can reproduce the old
 *  figure. Both lists walked on ONE index: outs[i] pairs with ins[i] when the
 *  return follows the leave, else the slot is dropped. That is the shape a
 *  single stray early LunchIn defeated — it shifted every later `in` one
 *  slot and un-paired the whole day, PAYING every real break. Never call it
 *  from anything but the report. */
function breakPairsPositional_(lunchOut, lunchIn, clockInMins) {
  const anchor = (typeof clockInMins === 'number') ? clockInMins : null;
  const list = (v) => (Array.isArray(v) ? v : (v === null || v === undefined || v === '' ? [] : [v]))
    .map((t) => ({ raw: t, mins: breakSortKey_(t, anchor) }))
    .filter((x) => x.mins !== null)
    .sort((a, b) => a.mins - b.mins);
  const outs = list(lunchOut), ins = list(lunchIn);
  const pairs = [];
  for (let i = 0; i < Math.min(outs.length, ins.length); i++) {
    if (ins[i].mins <= outs[i].mins) continue;             // malformed: in at/before out
    pairs.push({ out: outs[i].raw, in: ins[i].raw, minutes: ins[i].mins - outs[i].mins });
  }
  return pairs;
}
/** READ-ONLY operator report (cycle-19 F1 follow-on): which historical days
 *  change when breakPairs_ moved from the POSITIONAL pairing to the GREEDY
 *  one — each `out` takes the earliest `in` that can close it, and an `in`
 *  that cannot close the current `out` is skipped ALONE.
 *
 *  The twin of reportMultiBreakDays: same shared reader (live + archive,
 *  duplicates counted once), writes nothing, manager-gated because it walks
 *  the whole Timesheet. The old figure comes from the SAME calcHours_ plus the
 *  difference in deducted break minutes between the two pairings — the clock
 *  arithmetic is never re-implemented, only the removed pairing is (verbatim,
 *  in breakPairsPositional_). A day is listed only when the two pairings
 *  deduct different minutes; on every such day the greedy figure is LOWER —
 *  the old pairing had left a real break paid. */
function reportBreakPairingChanges() {
  assertManagerCaller_('reportBreakPairingChanges');
  const read = tsPunchDaysWithArchive_();
  const perDay = read.perDay;
  const sumMin = (pairs) => pairs.reduce((acc, b) => acc + b.minutes, 0);
  const affected = [];
  let totalDelta = 0;
  Object.keys(perDay).forEach((key) => {
    const d = perDay[key], pm = d.pm;
    if (!pm.ClockIn || !pm.ClockOut) return;              // incomplete days contribute no hours either way
    const inMins = timeToMins_(pm.ClockIn);
    const greedy = breakPairs_(pm.LunchOut, pm.LunchIn, inMins);
    const positional = breakPairsPositional_(pm.LunchOut, pm.LunchIn, inMins);
    const diffMin = sumMin(greedy) - sumMin(positional);
    if (diffMin === 0) return;
    const newH = calcHours_(pm.ClockIn, pm.ClockOut, pm.LunchOut, pm.LunchIn);
    if (newH === null) return;
    const oldH = newH + diffMin / 60;                      // the positional pairing deducted diffMin fewer minutes
    const delta = +(newH - oldH).toFixed(2);
    if (delta === 0) return;
    totalDelta += delta;
    affected.push({ empId: d.empId, name: d.name, date: d.date, source: d.source,
      oldHours: +oldH.toFixed(2), newHours: +newH.toFixed(2), deltaHours: delta,
      greedy: greedy.map((b) => b.out + '\u2192' + b.in).join(', ') || '(none)',
      positional: positional.map((b) => b.out + '\u2192' + b.in).join(', ') || '(none)' });
  });
  affected.sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name) : a.date.localeCompare(b.date)));

  Logger.log('=== Break-pairing impact report (positional → greedy, cycle-19 F1) ===');
  Logger.log('Scanned ' + read.liveRows + ' live + ' + read.archRows + ' archived punch rows across '
    + Object.keys(perDay).length + ' rep-days.');
  if (!affected.length) {
    Logger.log('NO historical day changes — both pairings deduct the same minutes on every completed day.');
  } else {
    Logger.log(affected.length + ' day(s) change; total ' + totalDelta.toFixed(2) + ' hours (always a reduction —'
      + ' the positional pairing had left a real break paid).');
    affected.forEach((a) => Logger.log('  ' + a.date + '  ' + a.name + ' (' + a.empId + ')  ['
      + a.source + ']  was: ' + a.positional + '  now: ' + a.greedy + '  ' + a.oldHours + 'h -> ' + a.newHours + 'h  ('
      + a.deltaHours.toFixed(2) + ')'));
  }
  return { liveRows: read.liveRows, archiveRows: read.archRows, repDays: Object.keys(perDay).length,
    affected: affected, totalDeltaHours: +totalDelta.toFixed(2) };
}
function reportMultiBreakDays() {
  assertManagerCaller_('reportMultiBreakDays');
  const read = tsPunchDaysWithArchive_();   // live + archive, duplicates counted once (INV-132/153)
  const perDay = read.perDay;
  const liveRows = read.liveRows, archRows = read.archRows;

  const lastOf = (v) => (Array.isArray(v) ? (v.length ? v.slice().sort()[v.length - 1] : null) : (v || null));
  const affected = [];
  let totalDelta = 0;
  Object.keys(perDay).forEach((key) => {
    const d = perDay[key], pm = d.pm;
    if (!pm.ClockIn || !pm.ClockOut) return;              // incomplete days contribute no hours either way
    const pairs = breakPairs_(pm.LunchOut, pm.LunchIn, timeToMins_(pm.ClockIn));
    if (pairs.length < 2) return;                          // only multi-pair days can move
    const newH = calcHours_(pm.ClockIn, pm.ClockOut, pm.LunchOut, pm.LunchIn);
    const oldH = calcHours_(pm.ClockIn, pm.ClockOut, lastOf(pm.LunchOut), lastOf(pm.LunchIn));
    if (newH === null || oldH === null) return;
    const delta = +(newH - oldH).toFixed(2);
    if (delta === 0) return;
    totalDelta += delta;
    affected.push({ empId: d.empId, name: d.name, date: d.date, source: d.source,
      breaks: pairs.length, oldHours: +oldH.toFixed(2), newHours: +newH.toFixed(2), deltaHours: delta,
      pairs: pairs.map((b) => b.out + '\u2192' + b.in).join(', ') });
  });
  affected.sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name) : a.date.localeCompare(b.date)));

  Logger.log('=== Multi-break impact report ===');
  Logger.log('Scanned ' + liveRows + ' live + ' + archRows + ' archived punch rows across '
    + Object.keys(perDay).length + ' rep-days.');
  if (!affected.length) {
    Logger.log('NO historical day changes — every completed day has at most one break pair.');
  } else {
    Logger.log(affected.length + ' day(s) change; total ' + totalDelta.toFixed(2) + ' hours (always a reduction —'
      + ' the earlier breaks were being paid).');
    affected.forEach((a) => Logger.log('  ' + a.date + '  ' + a.name + ' (' + a.empId + ')  ['
      + a.source + ']  breaks: ' + a.pairs + '  ' + a.oldHours + 'h -> ' + a.newHours + 'h  ('
      + a.deltaHours.toFixed(2) + ')'));
  }
  return { liveRows: liveRows, archiveRows: archRows, repDays: Object.keys(perDay).length,
    affected: affected, totalDeltaHours: +totalDelta.toFixed(2) };
}
/* Pure planner for one row: returns null (unparseable / no change), a
 * {skip} marker, or {newDate, newTime}. `toMs` parses a (date, time) pair in
 * the OLD tz to epoch ms; `fmtDate`/`fmtTime` format ms in the NEW tz —
 * injected so the rule is Node-testable off-platform. */
function tzRepairPlanRow_(dateStr, timeStr, flipMs, toMs, fmtDate, fmtTime) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return null;
  if (!/^\d{2}:\d{2}:\d{2}$/.test(timeStr || '')) return null;
  const ms = toMs(dateStr, timeStr);
  if (!isFinite(ms)) return null;
  if (ms >= flipMs) return { skip: 'after-flip' };
  const newDate = fmtDate(ms), newTime = fmtTime(ms);
  if (newDate === dateStr && newTime === timeStr) return { skip: 'unchanged' };
  return { newDate: newDate, newTime: newTime };
}
/* Resolve roster ids / exact names to emp objects for the editor-run repair
 * tools. A name must match EXACTLY ONE row (a name-only offboarded row still
 * counts as a match — its punches are the point). Ambiguity refuses rather
 * than guessing a payroll row. Shared by repairTimesheetTimezone and
 * repairSplitDayPunches so the two tools cannot resolve a name differently. */
function tzRepairResolveTargets_(wanted) {
  if (!wanted.length) throw new Error('employees is required — roster ids or exact names');
  const roster = getAdpSS_().getSheetByName(CONFIG.EMPLOYEE_TAB).getDataRange().getValues();
  const targets = {};
  wanted.forEach((w) => {
    const wl = w.toLowerCase();
    const hits = [];
    for (let i = 1; i < roster.length; i++) {
      const id = String(roster[i][EMP.ID] || '').trim();
      const nm = String(roster[i][EMP.NAME] || '').trim();
      if (!id) continue;
      if (id === w || nm.toLowerCase() === wl) hits.push({ id: id, name: nm });
    }
    if (hits.length !== 1) throw new Error('"' + w + '" matched ' + hits.length + ' roster rows — pass the employee ID instead');
    const emp = lookupEmployeeById_(hits[0].id) || { id: hits[0].id, name: hits[0].name, email: '' };
    targets[hits[0].id] = emp;
  });
  return targets;
}
function repairTimesheetTimezone(opts) {
  assertManagerCaller_('repairTimesheetTimezone');
  opts = opts || {};
  const dryRun = opts.dryRun !== false;                       // a bare call NEVER writes
  const fromTz = String(opts.fromTz || '').trim();
  const toTz   = String(opts.toTz || '').trim();
  if (!fromTz || safeTimezone_(fromTz) !== fromTz) throw new Error('fromTz must be a valid IANA zone, got "' + fromTz + '"');
  if (!toTz || safeTimezone_(toTz) !== toTz)       throw new Error('toTz must be a valid IANA zone, got "' + toTz + '"');
  if (fromTz === toTz) throw new Error('fromTz and toTz are the same zone — nothing to repair');
  const flippedAt = String(opts.flippedAt || '').trim();
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(flippedAt)) {
    throw new Error('flippedAt is required as "yyyy-MM-dd HH:mm" in the NEW zone (' + toTz + ') — the moment the roster cell was changed');
  }
  const flipMs = Utilities.parseDate(flippedAt + ':00', toTz, 'yyyy-MM-dd HH:mm:ss').getTime();
  const fromDate = String(opts.fromDate || '').trim();
  if (fromDate && !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) throw new Error('fromDate must be yyyy-MM-dd');
  const skipDates = (Array.isArray(opts.skipDates) ? opts.skipDates : []).map(String);
  const wanted = (Array.isArray(opts.employees) ? opts.employees : []).map(x => String(x || '').trim()).filter(Boolean);
  const targets = tzRepairResolveTargets_(wanted);            // id → emp object (shared with repairSplitDayPunches)
  const ids = Object.keys(targets);

  const toMs    = (d, t) => Utilities.parseDate(d + ' ' + t, fromTz, 'yyyy-MM-dd HH:mm:ss').getTime();
  const fmtDate = (ms) => Utilities.formatDate(new Date(ms), toTz, 'yyyy-MM-dd');
  const fmtTime = (ms) => Utilities.formatDate(new Date(ms), toTz, 'HH:mm:ss');

  const ss = getAdpSS_();
  const tabs = [CONFIG.ADP_TAB, TIMESHEET_ARCHIVE_TAB].filter(n => !!ss.getSheetByName(n));
  const changes = [];                                          // {tab, row, empId, type, dir, oldDate, oldTime, newDate, newTime}
  const occupied = {};                                         // 'id|date|type' → count of rows NOT moving
  const skipped = { afterFlip: 0, beforeFrom: 0, skipDate: 0, unparseable: 0, unchanged: 0 };
  tabs.forEach((tabName) => {
    const rows = ss.getSheetByName(tabName).getDataRange().getValues();
    for (let i = 2; i < rows.length; i++) {                    // two header rows
      const id = String(rows[i][ADP.EMP_ID] || '').trim();
      if (!targets[id]) continue;
      const date = normalizeDate_(rows[i][ADP.DATE]);
      const time = normalizeTime_(rows[i][ADP.TIME]);
      const type = normalizeType_(String(rows[i][ADP.COMMENTS]));
      const key  = id + '|' + date + '|' + type;
      const plan = tzRepairPlanRow_(date, time, flipMs, toMs, fmtDate, fmtTime);
      let reason = '';
      if (!plan) reason = 'unparseable';
      else if (plan.skip === 'after-flip') reason = 'afterFlip';
      else if (plan.skip === 'unchanged') reason = 'unchanged';
      else if (fromDate && date < fromDate) reason = 'beforeFrom';
      else if (skipDates.indexOf(date) >= 0) reason = 'skipDate';
      if (reason) { skipped[reason]++; occupied[key] = (occupied[key] || 0) + 1; continue; }
      changes.push({ tab: tabName, row: i + 1, empId: id, type: type, dir: String(rows[i][ADP.DIR] || ''),
        oldDate: date, oldTime: time, newDate: plan.newDate, newTime: plan.newTime });
    }
  });
  if (changes.length > TZ_REPAIR_MAX_ROWS) {
    throw new Error('Refusing: ' + changes.length + ' rows exceed TZ_REPAIR_MAX_ROWS (' + TZ_REPAIR_MAX_ROWS + ') — narrow fromDate or the employee list');
  }

  // Collision report: a moved row landing on a (date, type) that another row
  // already holds — either an unmoved row (a hand edit made after the flip)
  // or another moved row (a double punch across the old midnight). Reported,
  // never resolved: which of the two is the real punch is the manager's call.
  const landing = {};
  changes.forEach((c) => { const k = c.empId + '|' + c.newDate + '|' + c.type; landing[k] = (landing[k] || 0) + 1; });
  const warnings = [];
  changes.forEach((c) => {
    const k = c.empId + '|' + c.newDate + '|' + c.type;
    if ((occupied[k] || 0) > 0 || landing[k] > 1) {
      warnings.push(targets[c.empId].name + ' ' + c.type + ' → ' + c.newDate + ' ' + c.newTime +
        ' (from ' + c.oldDate + ' ' + c.oldTime + ') would DUPLICATE an existing ' + c.type + ' on that date — fix by hand after the run');
    }
  });

  const byEmp = {};
  changes.forEach((c) => {
    const e = byEmp[c.empId] || (byEmp[c.empId] = { name: targets[c.empId].name, rows: 0, dates: {} });
    e.rows++; e.dates[c.newDate] = true;
  });
  Logger.log('%s: %s row(s) to move for %s employee(s); skipped %s',
    dryRun ? 'DRY RUN' : 'APPLY', changes.length, ids.length, JSON.stringify(skipped));
  changes.forEach((c) => Logger.log('  %s | %s | %s %s | %s %s → %s %s', c.tab, targets[c.empId].name, c.type,
    c.dir, c.oldDate, c.oldTime, c.newDate, c.newTime));
  warnings.forEach((w) => Logger.log('  WARNING: ' + w));
  if (dryRun) {
    return { dryRun: true, planned: changes.length, skipped: skipped, warnings: warnings,
      byEmp: Object.keys(byEmp).map(id => ({ id: id, name: byEmp[id].name, rows: byEmp[id].rows, days: Object.keys(byEmp[id].dates).length })) };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let moved = 0;
  try {
    // T2: the plan was read before the lock — refuse if any row has moved.
    const drift = [];
    tabs.forEach((tabName) => {
      const mine = changes.filter((c) => c.tab === tabName)
        .map((c) => ({ row: c.row, empId: c.empId, date: c.oldDate, type: c.type, time: c.oldTime }));
      if (mine.length) Array.prototype.push.apply(drift, repairRowsMoved_(ss.getSheetByName(tabName).getDataRange().getValues(), mine));
    });
    if (drift.length) {
      throw new Error('Refusing: ' + drift.length + ' planned row(s) changed between the plan and the lock — nothing was written; re-run to plan afresh. ' + drift.slice(0, 5).join('; '));
    }
    changes.forEach((c) => {
      const sh = ss.getSheetByName(c.tab);
      sh.getRange(c.row, ADP.DATE + 1).setValue(sheetSafe_(c.newDate));
      sh.getRange(c.row, ADP.TIME + 1).setValue(sheetSafe_(c.newTime));
      moved++;
      const emp = targets[c.empId];
      if (emp && emp.sheetId && c.tab === CONFIG.ADP_TAB && PUNCH_LABELS_.indexOf(c.type) >= 0) {
        clearFromEmployeeSheet_(emp, c.oldDate, c.type);           // best-effort mirror (INV-59)
        writeToEmployeeSheet_(emp, c.newDate, c.newTime, c.dir, c.type);
      }
    });
    SpreadsheetApp.flush();
    ids.forEach((id) => {
      const e = byEmp[id]; if (!e) return;
      writeAuditLog_(targets[id], 'TimesheetTzRepair', '', '', false, 0,
        'fromTz=' + fromTz + '; toTz=' + toTz + '; flippedAt=' + flippedAt + '; rowsMoved=' + e.rows +
        '; days=' + Object.keys(e.dates).length + '; warnings=' + warnings.length);
    });
  } finally {
    lock.releaseLock();
  }
  return { dryRun: false, moved: moved, skipped: skipped, warnings: warnings,
    byEmp: Object.keys(byEmp).map(id => ({ id: id, name: byEmp[id].name, rows: byEmp[id].rows, days: Object.keys(byEmp[id].dates).length })) };
}
/* Pure planner. `punches` = [{row, empId, date, time, type}] already
 * normalized (row = 1-based sheet row). Returns deletes (bottom-up), the
 * kept row per collapsed group, and the duplicate groups it will NOT touch. */
function splitDayRepairPlan_(punches, from, to) {
  const groups = {};
  (punches || []).forEach((p) => {
    if (!p || !/^\d{4}-\d{2}-\d{2}$/.test(String(p.date || ''))) return;
    if (p.date < from || p.date > to) return;
    const k = p.empId + '|' + p.date + '|' + p.type;
    (groups[k] || (groups[k] = [])).push(p);
  });
  const deletes = [], kept = [], otherDuplicates = [];
  Object.keys(groups).sort().forEach((k) => {
    const g = groups[k];
    if (g.length < 2) return;
    const first = g[0];
    if (first.type !== 'ClockIn') {
      otherDuplicates.push({ empId: first.empId, date: first.date, type: first.type, count: g.length, reason: 'not a ClockIn — left alone' });
      return;
    }
    const parsed = g.map((p) => ({ p: p, min: timeToMins_(p.time) }));
    if (parsed.some((x) => x.min === null)) {
      otherDuplicates.push({ empId: first.empId, date: first.date, type: first.type, count: g.length, reason: 'unparseable time — left alone' });
      return;
    }
    parsed.sort((a, b) => (a.min - b.min) || (a.p.row - b.p.row));
    const keep = parsed[0].p;
    kept.push({ row: keep.row, empId: keep.empId, date: keep.date, time: keep.time });
    parsed.slice(1).forEach((x) => deletes.push({ row: x.p.row, empId: x.p.empId, date: x.p.date, time: x.p.time, keptTime: keep.time }));
  });
  deletes.sort((a, b) => b.row - a.row);                       // bottom-up: a delete never shifts a later planned row
  return { deletes: deletes, kept: kept, otherDuplicates: otherDuplicates };
}
/** T2 (cycle 22) — the two editor-run Timesheet repair tools PLAN from a read
 *  taken before the ScriptLock and then write BY ROW INDEX. Any locked writer
 *  that deletes a row above a planned one in between (a rep's self-undo, a
 *  manager's Day Edit delete, the cold archive — every one takes the lock, so
 *  the window is the tool's own waitLock of up to 15 s) shifts the rows, and
 *  the apply then rewrites or DELETES a different employee's punch. Rather
 *  than re-plan, the apply re-reads INSIDE the lock and refuses unless every
 *  planned row still holds exactly the punch the plan read (optimistic
 *  concurrency: nothing is written on a mismatch; a re-run plans afresh).
 *  Pure over the values array; `expected` = [{row (1-based), empId, date,
 *  type, time?}]. Returns the mismatches, [] when the plan still holds. */
function repairRowsMoved_(rows, expected) {
  const out = [];
  (expected || []).forEach(function (x) {
    const r = rows[x.row - 1];
    const now = r ? (String(r[ADP.EMP_ID] || '').trim() + '|' + normalizeDate_(r[ADP.DATE]) + '|' +
      normalizeType_(String(r[ADP.COMMENTS])) + (x.time !== undefined ? '|' + normalizeTime_(r[ADP.TIME]) : '')) : '(no row)';
    const want = x.empId + '|' + x.date + '|' + x.type + (x.time !== undefined ? '|' + x.time : '');
    if (now !== want) out.push('row ' + x.row + ': planned ' + want + ', now ' + now);
  });
  return out;
}
function repairSplitDayPunches(opts) {
  assertManagerCaller_('repairSplitDayPunches');
  opts = opts || {};
  const dryRun = opts.dryRun !== false;                       // a bare call NEVER writes
  const from = String(opts.from || '').trim(), to = String(opts.to || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new Error('from/to are required as yyyy-MM-dd');
  if (from > to) throw new Error('from must be on or before to');
  if (daysBetween_(from, to) > SPLIT_REPAIR_MAX_SPAN_DAYS) throw new Error('Refusing: the window exceeds ' + SPLIT_REPAIR_MAX_SPAN_DAYS + ' days');
  const wanted = (Array.isArray(opts.employees) ? opts.employees : []).map(x => String(x || '').trim()).filter(Boolean);
  const targets = tzRepairResolveTargets_(wanted);
  const ids = Object.keys(targets);
  const actorEmail = getActiveUserEmail_();
  const reason = String(opts.reason || 'split-day repair — agent-confirmed punch entered by manager').trim();

  const ss = getAdpSS_();
  const sheet = ss.getSheetByName(CONFIG.ADP_TAB);
  const rows = sheet.getDataRange().getValues();               // ONE read; every index below comes from it
  const punches = [];
  const lastRowByKey = {};                                     // id|date|type → last matching sheet row (the adjust writer's INV-155 rule)
  for (let i = 2; i < rows.length; i++) {                      // two header rows
    const id = String(rows[i][ADP.EMP_ID] || '').trim();
    if (!targets[id]) continue;
    const date = normalizeDate_(rows[i][ADP.DATE]);
    const type = normalizeType_(String(rows[i][ADP.COMMENTS]));
    punches.push({ row: i + 1, empId: id, date: date, time: normalizeTime_(rows[i][ADP.TIME]), type: type });
    lastRowByKey[id + '|' + date + '|' + type] = i + 1;
  }
  const plan = splitDayRepairPlan_(punches, from, to);
  const dupKeys = {};
  plan.deletes.forEach((d) => { dupKeys[d.empId + '|' + d.date + '|ClockIn'] = true; });

  // Validate every add BEFORE anything is written (atomic like the tz repair).
  const adds = (Array.isArray(opts.adds) ? opts.adds : []).map((a, n) => {
    a = a || {};
    const who = String(a.employee || '').trim();
    const t = tzRepairResolveTargets_(who ? [who] : []);
    const empId = Object.keys(t)[0];
    if (!targets[empId]) throw new Error('adds[' + n + ']: "' + who + '" is not in this run\'s employees list');
    const date = String(a.date || '').trim(), type = String(a.type || '').trim(), time = String(a.time || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < from || date > to) throw new Error('adds[' + n + ']: date must be yyyy-MM-dd inside [' + from + ', ' + to + ']');
    if (PUNCH_LABELS_.indexOf(type) < 0) throw new Error('adds[' + n + ']: type must be one of ' + PUNCH_LABELS_.join('/'));
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('adds[' + n + ']: time must be HH:mm (24h)');
    if (dupKeys[empId + '|' + date + '|' + type]) throw new Error('adds[' + n + ']: ' + targets[empId].name + ' ' + date + ' ' + type + ' is a duplicate group in this run — collapse it first');
    return { empId: empId, date: date, type: type, time: time, existingRow: lastRowByKey[empId + '|' + date + '|' + type] || 0 };
  });
  if (plan.deletes.length + adds.length > TZ_REPAIR_MAX_ROWS) {
    throw new Error('Refusing: ' + (plan.deletes.length + adds.length) + ' operations exceed TZ_REPAIR_MAX_ROWS (' + TZ_REPAIR_MAX_ROWS + ')');
  }

  Logger.log('%s: %s duplicate ClockIn row(s) to remove across %s date(s); %s add(s); %s duplicate group(s) left alone',
    dryRun ? 'DRY RUN' : 'APPLY', plan.deletes.length, plan.kept.length, adds.length, plan.otherDuplicates.length);
  plan.deletes.forEach((d) => Logger.log('  REMOVE %s | %s ClockIn %s (keeping %s)', targets[d.empId].name, d.date, d.time, d.keptTime));
  adds.forEach((a) => Logger.log('  ADD    %s | %s %s %s%s', targets[a.empId].name, a.date, a.type, a.time, a.existingRow ? ' (updates the existing row)' : ''));
  plan.otherDuplicates.forEach((o) => Logger.log('  LEFT   %s | %s %s ×%s — %s', targets[o.empId].name, o.date, o.type, o.count, o.reason));
  const summary = {
    dryRun: dryRun, deletes: plan.deletes.length, adds: adds.length,
    otherDuplicates: plan.otherDuplicates.map((o) => ({ name: targets[o.empId].name, date: o.date, type: o.type, count: o.count, reason: o.reason })),
    kept: plan.kept.map((k) => ({ name: targets[k.empId].name, date: k.date, time: k.time })),
  };
  if (dryRun) return summary;

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    // T2: the plan (row indices for the deletes AND for each add's existing
    // row) was read before the lock — refuse if any of them has moved.
    const expected = plan.deletes.map((d) => ({ row: d.row, empId: d.empId, date: d.date, type: 'ClockIn', time: d.time }))
      .concat(adds.filter((a) => a.existingRow).map((a) => ({ row: a.existingRow, empId: a.empId, date: a.date, type: a.type })));
    const drift = repairRowsMoved_(sheet.getDataRange().getValues(), expected);
    if (drift.length) {
      throw new Error('Refusing: ' + drift.length + ' planned row(s) changed between the plan and the lock — nothing was written; re-run to plan afresh. ' + drift.slice(0, 5).join('; '));
    }
    // Adds first: an update touches its own row and an append lands BELOW
    // every planned delete, so the delete indices read above stay valid.
    adds.forEach((a) => {
      const ctx = { sheet: sheet, idx: {} };
      if (a.existingRow) ctx.idx[a.date + '|' + a.type] = a.existingRow;
      writeAdjustPunchForEmployee_(targets[a.empId], a.date, a.type, a.time, actorEmail, reason, ctx);
    });
    plan.deletes.forEach((d) => {                              // already bottom-up
      sheet.deleteRow(d.row);
      writeAuditLog_(targets[d.empId], 'PunchDelete', d.date, d.time, false, 0,
        'duplicate ClockIn removed (split-day repair) — kept ' + d.keptTime, actorEmail);
    });
    SpreadsheetApp.flush();
    plan.kept.forEach((k) => {                                 // the mirror last saw the noon row (INV-59, best-effort)
      const emp = targets[k.empId];
      if (emp && emp.sheetId) writeToEmployeeSheet_(emp, k.date, k.time, 'IN', 'ClockIn');
    });
  } finally {
    lock.releaseLock();
  }
  return summary;
}
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
    // C7 (cycle 10): backward distance, not Math.abs — the symmetric window
    // let a FUTURE-dated punch row (pre-guard garbage / direct sheet edit) up
    // to 7 days ahead pass the "older than" check, contradicting INV-07's
    // backward-only semantics. Future rows within the window stay deletable
    // (daysBack negative but not > the window) — that's how a manager cleans
    // up future garbage; only genuinely-old punches are blocked.
    const daysBack = daysBetween_(date, today);
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

      // Cycle-11 L-14: dup-awareness parity with managerSaveDay's M-1 collapse —
      // if a legacy duplicate row of this same (emp, date, type) SURVIVES the
      // delete (pre-INV-155 leftovers), the personal-sheet mirror still shows a
      // live punch, so don't blank it.
      //
      // F12 (cycle 12): derived from the ALREADY-LOADED `rows` (every index
      // except the one being deleted) instead of a SECOND
      // getDataRange().getValues() after the delete. Exactly equivalent under
      // the lock — every mutating writer takes the same global ScriptLock
      // (INV-01), so no row can appear between the two reads — but it drops a
      // whole-Timesheet read from inside the lock, on the tab that grows
      // unboundedly until INV-153 archival is enabled. Computed BEFORE the
      // deleteRow so the index arithmetic needs no adjustment.
      let survivorExists = false;
      for (let k = 2; k < rows.length; k++) {
        if (k === i) continue;   // the row we are about to delete
        if (String(rows[k][ADP.EMP_ID]).trim() === empId
            && normalizeDate_(rows[k][ADP.DATE]) === date
            && normalizeType_(String(rows[k][ADP.COMMENTS])) === punchType) {
          survivorExists = true; break;
        }
      }
      sheet.deleteRow(i + 1);
      if (targetEmp && targetEmp.sheetId && !survivorExists) {
        try { clearFromEmployeeSheet_(targetEmp, date, punchType); }
        catch (e) { console.warn('clearFromEmployeeSheet_ failed: ' + e.message); }
      }
      const targetForAudit = targetEmp || { id: empId, name: empId, email: '' };
      writeAuditLog_(targetForAudit, 'PunchDelete', date, time, false, 0,
        `${punchType} removed by manager` + (survivorExists ? ' (duplicate remains; mirror kept)' : ''), callerEmp.email);
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
/** Rep-callable, fire-and-forget: stamp the caller as active. No lock (a
 *  CacheService put is atomic), no sheet write, no audit row — it is a
 *  volatile signal, not a record. Never throws. */
function recordPresence() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false };
    CacheService.getScriptCache().put(PRESENCE_CACHE_PREFIX + emp.id, '1', PRESENCE_TTL_SEC);
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}
/** Best-effort: { empId: true } for every id with a live presence stamp. ONE
 *  getAll over the roster's keys; any failure returns {} — no flags, never a
 *  thrown error into the teammate view (a missing chip is the safe failure). */
function presenceMap_(empIds) {
  const out = {};
  try {
    const keys = (empIds || []).map(id => PRESENCE_CACHE_PREFIX + id);
    if (!keys.length) return out;
    const hits = CacheService.getScriptCache().getAll(keys) || {};
    Object.keys(hits).forEach(k => {
      if (hits[k]) out[k.slice(PRESENCE_CACHE_PREFIX.length)] = true;
    });
  } catch (e) { /* best-effort — no flags */ }
  return out;
}
/** PURE (Node-pinned): the one rule behind the chip. Self is never flagged (a
 *  rep already knows they are using the app); a present rep is flagged only
 *  when the punch state says they are NOT working — not clocked in yet, or
 *  already clocked out. On lunch / clocked in are working states. */
function teammateActiveNotIn_(isSelf, present, status) {
  if (isSelf || !present) return false;
  return status === 'not_in' || status === 'clocked_out';
}
/** Lightweight teammate-status view for the Clock page.
 *  Returns name + status + the activeNotIn boolean only — no email, no
 *  internal IDs, no last-punch detail, no presence timestamp (INV-24). */
function getTeammateStatus() {
  try {
    // C8 (cycle 10): authenticate BEFORE evaluating the feature flag — the
    // old order let an unregistered/anonymous caller distinguish the flag's
    // on/off state by which response shape came back (a trivial config-state
    // disclosure, and the only pre-auth server-derived state in the API).
    const emp = getEmployeeInfo_();
    if (!emp) return { error: 'Employee not found.' };
    if (!getFlag_('showTeammateStatus')) return { enabled: false, teammates: [] };

    const rows = getEmployeeRosterRows_();
    const employees = [];
    for (let i = 1; i < rows.length; i++) {
      if (!empRosterEmail_(rows[i])) continue;   // F3: one predicate
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

    // Presence stamps (note 10) — one getAll, best-effort, ids only.
    const present = presenceMap_(employees.map(e => e.id));

    const teammates = employees.map(e => {
      const slot = todayByEmp[e.id];
      const last = slot ? slot.last : null;
      let status = 'not_in';
      if (last) {
        if (last.type === 'ClockIn' || last.type === 'LunchIn') status = 'clocked_in';
        else if (last.type === 'LunchOut') status = 'on_lunch';
        else if (last.type === 'ClockOut') status = 'clocked_out';
      }
      const isSelf = e.id === emp.id;
      return {
        name: e.name,
        status,
        isSelf,
        // INV-24: the boolean ONLY — the stamp's time never rides the row.
        activeNotIn: teammateActiveNotIn_(isSelf, !!present[e.id], status),
      };
    });
    // Sort: active first, then on lunch, then idle, then done — and within a
    // status, a flagged (active-but-not-in) rep ahead of the unflagged, so the
    // chip sits where the eye lands.
    const rank = { clocked_in: 0, on_lunch: 1, not_in: 2, clocked_out: 3 };
    teammates.sort((a, b) => rank[a.status] - rank[b.status]
      || (b.activeNotIn ? 1 : 0) - (a.activeNotIn ? 1 : 0)
      || a.name.localeCompare(b.name));
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
      if (!empRosterEmail_(rows[i])) continue;   // F3: one predicate
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
/** Parse and validate the Day Edit break list (A4, operator 2026-09-01).
 *
 *  Accepts the NEW `slots.breaks` array `[{out, in}]` and falls back to the
 *  legacy `{LunchOut, LunchIn}` scalars when it is absent, so an older client —
 *  and managerSaveDayRange, which deliberately stays single-pair — keeps
 *  working unchanged.
 *
 *  A pair must be COMPLETE (both stamps) and well-ordered, pairs must not
 *  OVERLAP, and each must fall inside the clock span when one is given. None of
 *  that could happen with four fixed slots; with N rows a manager can now type
 *  a break that starts before it ends, two that overlap, or one outside the
 *  shift — and calcHours_ would faithfully deduct the nonsense, quietly
 *  shortening a paid day. Refusing is the INV-187 direction: a stated error
 *  beats a plausible number.
 *
 *  Returns { breaks } or { error }. */
function managerParseBreakSlots_(slots) {
  const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
  let raw = (slots && Array.isArray(slots.breaks)) ? slots.breaks : null;
  if (!raw) {
    // Legacy single-pair shape, folded into the same list.
    const lo = String((slots && slots.LunchOut) || '').trim();
    const li = String((slots && slots.LunchIn) || '').trim();
    raw = (lo || li) ? [{ out: lo, in: li }] : [];
  }
  if (raw.length > MANAGER_DAY_MAX_BREAKS)
    return { error: `Too many breaks (${raw.length}); at most ${MANAGER_DAY_MAX_BREAKS} per day.` };

  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const o = String((raw[i] && raw[i].out) || '').trim();
    const n = String((raw[i] && raw[i].in) || '').trim();
    const label = 'Break ' + (i + 1);
    if (!o && !n) continue;                                  // a wholly blank row is "no break"
    // A TRAILING leave with no return is an IN-PROGRESS break, not damage: the
    // punch clock creates that state every day at lunch, and a rep who is out
    // right now has exactly this shape. Refusing it made Day Edit unsavable for
    // that rep — a manager could not fix a mistyped clock-in for anyone on
    // lunch (caught by test_managerSaveDay_mixedChanges, which had encoded the
    // pre-A4 behaviour correctly). It writes as a lone LunchOut, which is what
    // the sheet holds while the rep is away; breakPairs_ drops it from the
    // hours (nothing to pair with) and the sheet doctor flags it if it never
    // gets a return. Only the LAST row may be half, and only on the leave side
    // — a return with no leave is not producible by the punch flow, and a half
    // in the middle means the rows below it are mis-entered.
    const isLast = (i === raw.length - 1);
    const trailingOpen = isLast && o && !n;
    if (!trailingOpen && (!o || !n))
      return { error: `${label} needs BOTH a leave and a return time (got ${o || '(blank)'} / ${n || '(blank)'}).` };
    if (!HHMM.test(o) || (n && !HHMM.test(n)))
      return { error: `Invalid time for ${label} (expected HH:mm, 24-hour).` };
    if (n && n <= o)
      return { error: `${label} returns at or before it leaves (${o} → ${n}).` };
    out.push({ out: o, in: n });
  }
  // Overlap check on the SUBMITTED order-independent set: sort a copy by leave
  // time and require each to start at or after the previous one ended.
  const sorted = out.slice().sort((a, b) => a.out.localeCompare(b.out));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].out < sorted[i - 1].in)
      return { error: `Breaks overlap (${sorted[i - 1].out}–${sorted[i - 1].in} and ${sorted[i].out}–${sorted[i].in}).` };
  }
  // Inside the shift, when the shift is given. Skipped for an overnight span
  // (ClockOut <= ClockIn) — the clock pair wraps midnight there and a plain
  // string compare would reject every legitimate break on such a day.
  const ci = String((slots && slots.ClockIn) || '').trim();
  const co = String((slots && slots.ClockOut) || '').trim();
  if (ci && co && co > ci) {
    for (let i = 0; i < out.length; i++) {
      if (out[i].out < ci || out[i].in > co)
        return { error: `Break ${i + 1} (${out[i].out}–${out[i].in}) falls outside the shift ${ci}–${co}.` };
    }
  }
  return { breaks: out };
}
/** Plan one day's punch reconcile — the DECISION half of managerSaveDay,
 *  extracted so it can be driven directly (A4). Every pairing bug this feature
 *  has had lived in the decision rather than in the sheet writes, and the
 *  writes need a whole spreadsheet to exercise.
 *
 *  `rowsByType` is the day's existing rows grouped by punch type, each
 *  `{rowIndex, time}` in append order. `cleanSlots` carries the validated
 *  HH:mm clock stamps; `cleanBreaks` is the validated `[{out, in}]` list, which
 *  IS the day's break list (zero submitted removes every break row).
 *
 *  Returns `{updates, deletions, additions}` — pure, no sheet access.
 */
function managerPlanDay_(rowsByType, cleanSlots, cleanBreaks) {
  const updates = [], deletions = [], additions = [];

  // ── CLOCK punches: one slot each, semantics unchanged from S7 ──
  ['ClockIn', 'ClockOut'].forEach(type => {
    const newTime = cleanSlots[type];
    const list = rowsByType[type] || [];
    if (!newTime) {
      list.forEach(r => deletions.push({ rowIndex: r.rowIndex, type, oldTime: r.time, dup: false }));
      return;
    }
    if (!list.length) { additions.push({ type, time: newTime }); return; }
    // Duplicates collapse to the row the modal displayed (the last).
    list.slice(0, -1).forEach(r =>
      deletions.push({ rowIndex: r.rowIndex, type, oldTime: r.time, dup: true }));
    const cur = list[list.length - 1];
    // No-op compare on HH:mm, NOT HH:mm:ss (cycle-9 M-1): live punches store
    // real seconds while the modal can only express HH:mm, so an equal HH:mm
    // IS unchanged — a full-string compare rewrote every untouched punch.
    if (cur.time.substring(0, 5) !== newTime)
      updates.push({ rowIndex: cur.rowIndex, type, oldTime: cur.time, time: newTime });
  });

  // ── BREAKS: the submitted list IS the day (A4) ──
  // Existing break rows are paired positionally using the SAME shift-timeline
  // ordering breakPairs_ applies (breakSortKey_), so a manager's edit lands on
  // the row it was displayed against. Extra rows beyond the submitted list are
  // deleted; missing ones are added; a pair whose HH:mm is unchanged is a
  // genuine no-op and writes nothing.
  const anchorMins = timeToMins_((cleanSlots.ClockIn || '') + ':00');
  const orderRows = (type) => (rowsByType[type] || []).slice()
    .map(r => ({ ...r, key: breakSortKey_(r.time, anchorMins) }))
    .filter(r => r.key !== null)
    .sort((a, b) => a.key - b.key);
  const curOuts = orderRows('LunchOut'), curIns = orderRows('LunchIn');
  // Each HALF is matched independently at its own index, so the two sides need
  // not be balanced. That is what lets an OPEN break (a leave with no return —
  // the rep is out right now) round-trip: the submitted blank REMOVES the
  // return row instead of writing an empty time into it, and an existing lone
  // leave is left alone rather than deleted and re-added, which would have
  // written a spurious PunchDelete+PunchAdd pair for an untouched punch. A
  // stray half the submitted list does not cover is removed the same way.
  const n = Math.max(curOuts.length, curIns.length, cleanBreaks.length);
  for (let i = 0; i < n; i++) {
    const want = cleanBreaks[i] || null;
    const haveOut = curOuts[i] || null;
    const haveIn  = curIns[i]  || null;
    [['LunchOut', want ? want.out : '', haveOut],
     ['LunchIn',  want ? want.in  : '', haveIn]].forEach(([type, time, have]) => {
      if (!time) {
        if (have) deletions.push({ rowIndex: have.rowIndex, type, oldTime: have.time, dup: false });
        return;
      }
      if (!have) { additions.push({ type, time }); return; }
      if (have.time.substring(0, 5) !== time)
        updates.push({ rowIndex: have.rowIndex, type, oldTime: have.time, time });
    });
  }
  return { updates, deletions, additions };
}
/**
 * Manager commits a "desired state" for one employee's day. `slots` carries
 * the two clock stamps (ClockIn / ClockOut, HH:mm or empty) plus `breaks`:
 * an array of `{out, in}` pairs that IS the day's break list — zero submitted
 * removes every break row, N submitted leaves exactly N pairs. The legacy
 * `{LunchOut, LunchIn}` scalars are still accepted (an older client, and
 * managerSaveDayRange, which stays deliberately single-pair). The server diffs
 * against current state and applies add/edit/delete, one audit row per change.
 */
/** PURE (Node-pinned): the ONE clock-order rule the manager writers apply
 *  after format validation. An equal Clock In / Clock Out is refused — it is
 *  not a shift, and calcHours_ used to pay it as 24 hours — while a reversed
 *  pair is still accepted as the C3 overnight wrap. Returns an error string
 *  or null. Both slots blank, or only one present, is not this rule's call. */
function managerClockOrderError_(cleanSlots) {
  const ci = String((cleanSlots && cleanSlots.ClockIn) || '').trim();
  const co = String((cleanSlots && cleanSlots.ClockOut) || '').trim();
  if (!ci || !co) return null;
  const a = timeToMins_(ci), b = timeToMins_(co);
  if (a === null || b === null) return null;   // format errors are reported before this
  if (a === b) return 'Clock Out must differ from Clock In (' + ci + ') — an equal pair is not a shift.';
  return null;
}
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

    // Validate slot time formats. A4 (operator 2026-09-01): the CLOCK punches
    // are still one slot each, but breaks arrive as a LIST — the modal can now
    // express N pairs, because calcHours_ deducts all of them (INV-176) and
    // collapsing the extras here was the last path that destroyed legal data.
    const cleanSlots = {};
    ['ClockIn', 'ClockOut'].forEach((type) => {
      const raw = String((slots && slots[type]) || '').trim();
      if (raw && !/^([01]\d|2[0-3]):[0-5]\d$/.test(raw))
        cleanSlots[type] = { bad: raw };
      else cleanSlots[type] = raw;
    });
    for (const t of ['ClockIn', 'ClockOut']) {
      if (cleanSlots[t] && cleanSlots[t].bad !== undefined)
        return { success: false, error: `Invalid time for ${t}: "${cleanSlots[t].bad}" (expected HH:mm, 24-hour)` };
    }
    const orderErr = managerClockOrderError_(cleanSlots);
    if (orderErr) return { success: false, error: orderErr };
    const parsedBreaks = managerParseBreakSlots_(slots);
    if (parsedBreaks.error) return { success: false, error: parsedBreaks.error };
    const cleanBreaks = parsedBreaks.breaks;   // [{out, in}] in submitted order

    // Cycle-9 L-4 — same-day future times: recordPunch and the employee
    // adjust queue both reject them (INV-05 / cycle-7 L-2) but the manager
    // writers didn't, so a Day Edit could write a mid-afternoon 23:00
    // ClockOut that immediately feeds live-status ("clocked_out" while the
    // rep is working) and today's-hours. HH:mm-vs-HH:mm:ss lexicographic
    // compare is correct ('17:01' > '17:00:33'; '17:00' < '17:00:33').
    // Edge: a PRE-EXISTING future punch (written before this guard) now
    // blocks even a no-op re-save of its slot — deliberate; blank or fix it.
    if (daysBack === 0) {
      const nowTime = fmtTimeTz_(new Date(), empTz);
      const futureChecks = [['ClockIn', cleanSlots.ClockIn], ['ClockOut', cleanSlots.ClockOut]];
      cleanBreaks.forEach((b, i) => {
        futureChecks.push(['Break ' + (i + 1) + ' out', b.out], ['Break ' + (i + 1) + ' return', b.in]);
      });
      for (let k = 0; k < futureChecks.length; k++) {
        const t = futureChecks[k][1];
        if (t && t > nowTime)
          return { success: false, error: `Cannot set a future time today (${futureChecks[k][0]} ${t}).` };
      }
    }

    // Reason requirement
    const trimmedReason = String(reason || '').trim();
    if (daysBack > CONFIG.OLD_ADJUST_ALERT_DAYS && !trimmedReason) {
      return { success: false, error:
        `A reason is required for edits more than ${CONFIG.OLD_ADJUST_ALERT_DAYS} days back.` };
    }
    const noteSuffix = trimmedReason ? ` — ${trimmedReason}` : '';

    // Snapshot current state for this employee/date. M-1 (cycle 10): collect
    // ALL rows per type, not just the last — duplicate same-type rows (stale-
    // window double punches written before the recordPunch sequence guard,
    // multi-lunch days, direct sheet edits) made the old single-slot snapshot
    // silently disagree with the write paths: a "delete" removed one duplicate
    // and left the other, and updates (first-match findExistingPunch_) landed
    // on a different row than the one displayed (last-match snapshot). The Day
    // Edit contract is a full-day reconcile to the 4 displayed slots (S7), so
    // the save now collapses duplicates: a blank slot deletes EVERY row of
    // that type, and a kept slot deletes all but the last row (the one the
    // modal displayed) before the update pass runs.
    const sheet = getAdpSS_().getSheetByName(CONFIG.ADP_TAB);
    const allRows = sheet.getDataRange().getValues();
    const rowsByType = {};   // type → [{rowIndex, time}, …] in sheet order
    for (let i = 2; i < allRows.length; i++) {
      if (String(allRows[i][ADP.EMP_ID]).trim() !== targetEmp.id) continue;
      if (normalizeDate_(allRows[i][ADP.DATE]) !== date) continue;
      const type = normalizeType_(String(allRows[i][ADP.COMMENTS]));
      if (PUNCH_LABELS_.indexOf(type) < 0) continue;
      if (!rowsByType[type]) rowsByType[type] = [];
      rowsByType[type].push({
        rowIndex: i + 1,
        time: normalizeTime_(allRows[i][ADP.TIME]).trim(),
      });
    }
    const changes = [];

    // A4: PLAN first, then apply UPDATES (by row index) → DELETES (descending)
    // → ADDS. The old order deleted first and re-located each update through
    // findExistingPunch_, which only works while a type has ONE surviving row —
    // no longer true now that a day can carry N break pairs. Planning first
    // also means a delete can never shift a row an update still needs.
    const plan = managerPlanDay_(rowsByType, cleanSlots, cleanBreaks);
    const updates = plan.updates, deletions = plan.deletions, additions = plan.additions;

    // Apply: updates by row index first (nothing has shifted yet).
    updates.forEach(u => {
      const timeFull = u.time + ':00';
      sheet.getRange(u.rowIndex, ADP.TIME + 1).setValue(sheetSafe_(timeFull));
      sheet.getRange(u.rowIndex, ADP.COMMENTS + 1).setValue(sheetSafe_(`ADJ-${u.type}`));
      if (targetEmp.sheetId) {
        try {
          const dir = ['ClockIn', 'LunchIn'].indexOf(u.type) >= 0 ? 'IN' : 'OUT';
          writeToEmployeeSheet_(targetEmp, date, timeFull, dir, u.type);
        } catch (e) {}
      }
      writeAuditLog_(targetEmp, 'PunchEdit', date, timeFull, true, daysBack,
        `${u.type}: ${u.oldTime} → ${timeFull} (manager edit)${noteSuffix}`, callerEmp.email);
      changes.push({ type: u.type, action: 'update' });
    });

    // Then deletions, descending, so earlier removals don't shift later indices.
    deletions.sort((a, b) => b.rowIndex - a.rowIndex);
    deletions.forEach(d => {
      sheet.deleteRow(d.rowIndex);
      if (!d.dup) { try { clearFromEmployeeSheet_(targetEmp, date, d.type); } catch (e) {} }
      writeAuditLog_(targetEmp, 'PunchDelete', date, d.oldTime, false, 0,
        `${d.type} ${d.dup ? 'duplicate collapsed' : 'removed'} by manager${noteSuffix}`, callerEmp.email);
      changes.push({ type: d.type, action: d.dup ? 'collapse-dup' : 'delete' });
    });

    // Then additions (appends — unaffected by either).
    additions.forEach(a => {
      const timeFull = a.time + ':00';
      const dir = ['ClockIn', 'LunchIn'].indexOf(a.type) >= 0 ? 'IN' : 'OUT';
      appendToAdpSheet_(targetEmp, date, timeFull, dir, `ADJ-${a.type}`);
      if (targetEmp.sheetId) {
        try { writeToEmployeeSheet_(targetEmp, date, timeFull, dir, a.type); } catch (e) {}
      }
      writeAuditLog_(targetEmp, 'PunchAdd', date, timeFull, true, daysBack,
        `${a.type} at ${timeFull} (manager add)${noteSuffix}`, callerEmp.email);
      changes.push({ type: a.type, action: 'add' });
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
    // C2 (cycle 10): validate like every sibling range endpoint — with both
    // args undefined the date filter's relational compares were always false,
    // so a bare google.script.run.exportAdpRange() silently exported the
    // ENTIRE timesheet history and wrote an "undefined..undefined" audit row.
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate))
      return { error: 'Invalid start date (expected yyyy-MM-dd).' };
    if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
      return { error: 'Invalid end date (expected yyyy-MM-dd).' };
    if (startDate > endDate) return { error: 'Start date must be on or before end date.' };
    const result = generateExportSheet_(startDate, endDate, null);
    if (result.error) return result;
    // F1 (cycle 12): record how many rows came from the cold archive, so the
    // audit trail distinguishes "this export reached into archived payroll"
    // from a normal current-period run.
    writeAuditLog_(emp, 'AdpExport', startDate + '..' + endDate, '', false, 0,
      `${result.rowCount} rows → ${result.fileId}` +
      (result.archivedRowCount ? `; archivedRows=${result.archivedRowCount}` : ''));
    return { success: true, url: result.url, fileName: result.fileName, rowCount: result.rowCount,
      archivedRowCount: result.archivedRowCount || 0 };
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
/** PURE (Node-pinned) — validate a new-employee payload and build the 15-cell
 *  roster row in EMP-enum order. `ctx` carries everything sheet-derived:
 *  {existingEmails[], existingIds[], existingNames[] (all lowercased+trimmed),
 *   managerEmails[] (lowercased), deptKeys[], hasBiweeklyAnchor}.
 *  Returns {ok:false, error} on the FIRST failure (the Admin form shows one
 *  actionable message at a time) or {ok:true, row:[15]}.
 *  Validation notes, each load-bearing:
 *  - NAME uniqueness is required, not cosmetic: getTeamMetrics keys repMap by
 *    name and CDR matching is name-based — two "Ana Cruz" rows would merge
 *    into one metrics row.
 *  - IDs must never start with TEST_ (the cleanupTestData sweep key).
 *  - The timezone SHAPE check mirrors safeTimezone_'s gate (IANA
 *    Area/Location or a UTC/GMT token) — the V8 runtime silently resolves
 *    unknown ids to GMT, so shape is the only reliable reject.
 *  - A biweekly PAY_ANCHOR is rejected when one already exists on the roster:
 *    getCurrentBiweeklyRange_ reads the FIRST anchored biweekly row, so a
 *    second anchor is at best ignored and at worst becomes the boundary when
 *    the first row is later blanked (the documented INV-18 hazard).
 *  - SCHEDULE must be the full H:mm-H:mm form: parseShiftOverride_ accepts
 *    bare hours, but Sheets date-coerces a bare `9-17` typed into the cell —
 *    and setValue of the same string risks the same coercion. */
function empValidateNewEmployee_(p, ctx) {
  p = p || {}; ctx = ctx || {};
  var bad = function (msg) { return { ok: false, error: msg }; };
  var email = String(p.email || '').trim();
  var emailLc = email.toLowerCase();
  if (!email) return bad('Email is required — it is the login identity.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('That email does not look valid: ' + email);
  // Conflict messages NAME the row that owns the value (ctx.owners maps a
  // lowercased key → "Name (row N)"). Operator report 2026-08-08: a bare
  // "already in use" left an admin hunting a roster they had already
  // checked — the conflict is usually a row the panel does not show
  // prominently (an offboarded row, or one appended below a gap).
  var owner = function (kind, key) {
    var m = (ctx.owners && ctx.owners[kind]) || {};
    return m[key] ? ' — used by ' + m[key] : '';
  };
  if ((ctx.existingEmails || []).indexOf(emailLc) >= 0) {
    return bad('An employee with that email already exists' + owner('email', emailLc) + '.');
  }
  var id = String(p.id || '').trim();
  if (!id) return bad('Employee ID is required.');
  if (id.length > 40) return bad('Employee ID is too long (max 40 characters).');
  if (/^test_/i.test(id)) return bad('IDs must not start with TEST_ — that prefix is the test-data cleanup key.');

  if ((ctx.existingIds || []).indexOf(id.toLowerCase()) >= 0) {
    return bad('Employee ID "' + id + '" is already in use' + owner('id', id.toLowerCase()) +
      '. IDs stay reserved after offboarding, so the row may not be in the active list above.');
  }
  var name = String(p.name || '').trim();
  if (!name) return bad('Name is required.');
  if (name.length > 80) return bad('Name is too long (max 80 characters).');
  if ((ctx.existingNames || []).indexOf(name.toLowerCase()) >= 0) {
    return bad('An employee named "' + name + '" already exists' + owner('name', name.toLowerCase()) +
      ' — metrics and CDR matching are name-keyed, so names must be unique.');
  }

  var tz = String(p.timezone || '').trim();
  if (!tz) return bad('Timezone is required (e.g. America/Chicago, Asia/Manila).');
  var tzShapeOk = /^[A-Za-z]+(\/[A-Za-z0-9_+\-]+)+$/.test(tz) ||
                  /^(UTC|GMT([+-]\d{1,2}(:\d{2})?)?)$/i.test(tz);
  if (!tzShapeOk) return bad('"' + tz + '" is not a valid timezone id (use the Area/Location form, e.g. America/Chicago).');
  var cycle = String(p.payCycle || '').trim().toLowerCase();
  if (cycle && cycle !== 'biweekly' && cycle !== 'monthly') return bad('Pay cycle must be biweekly or monthly (or blank).');
  var anchor = String(p.payAnchor || '').trim();
  if (anchor) {
    if (cycle !== 'biweekly') return bad('A pay anchor only applies to the biweekly cycle.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor)) return bad('Pay anchor must be yyyy-MM-dd.');
    if (ctx.hasBiweeklyAnchor) {
      return bad('A biweekly anchor already exists on the roster and governs the shared period boundary — leave the anchor blank.');
    }
  }
  var annual = Number(p.annual);
  var sick = Number(p.sick);
  if (!isFinite(annual) || annual < 0 || annual > 365) return bad('Annual leave balance must be 0–365.');
  if (!isFinite(sick) || sick < 0 || sick > 365) return bad('Sick leave balance must be 0–365.');
  var mgrEmail = String(p.managerEmail || '').trim().toLowerCase();
  if (mgrEmail && (ctx.managerEmails || []).indexOf(mgrEmail) < 0) {
    return bad('"' + mgrEmail + '" is not in MANAGER_EMAILS — column M must name a real manager or doc/coaching visibility fails closed (INV-122).');
  }
  var deptsOut = '';
  var deptsRaw = String(p.departments || '').trim();
  if (deptsRaw) {
    var keys = ctx.deptKeys || [];
    var keyByLc = {};
    for (var k = 0; k < keys.length; k++) keyByLc[String(keys[k]).toLowerCase()] = keys[k];
    var seen = {}, canon = [];
    var parts = deptsRaw.split(/[;,]/);
    for (var d = 0; d < parts.length; d++) {
      var dn = parts[d].trim();
      if (!dn) continue;
      var hit = keyByLc[dn.toLowerCase()];
      if (!hit) return bad('Unknown department "' + dn + '" — departments must match the configured list (unknown names are silently dropped at read time).');
      if (!seen[hit]) { seen[hit] = true; canon.push(hit); }
    }
    deptsOut = canon.join('; ');
  }
  var sched = String(p.schedule || '').trim();
  if (sched) {
    if (!/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(sched)) {
      return bad('Schedule must be the full H:mm-H:mm form (e.g. 9:00-17:30) — a bare 9-17 gets date-coerced by Sheets.');
    }
    if (parseShiftOverride_(sched) === null) {
      return bad('"' + sched + '" is not a usable schedule (start must be before end, within 0:00–23:59).');
    }
  }
  // The 15-cell row in EMP-enum order (A–O). Blank SHEET_ID (the optional
  // legacy personal mirror) and blank CALL_NOTES_SHEET_ID (provisioning fills
  // it). PtoEnabled is written EXPLICITLY ('TRUE'/'FALSE') — blank means
  // enabled by back-compat, and an explicit cell can't be misread later.
  var row = [];
  row[EMP.EMAIL] = email;
  row[EMP.ID] = id;
  row[EMP.NAME] = name;
  row[EMP.SHEET_ID] = '';
  row[EMP.PAY_CYCLE] = cycle;
  row[EMP.PAY_ANCHOR] = anchor;
  row[EMP.IS_MANAGER] = p.isManager ? 'TRUE' : '';
  row[EMP.TIMEZONE] = tz;
  row[EMP.ANNUAL_LEAVE] = annual;
  row[EMP.SICK_LEAVE] = sick;
  row[EMP.PTO_ENABLED] = p.ptoEnabled ? 'TRUE' : 'FALSE';
  row[EMP.CALL_NOTES_SHEET_ID] = '';
  row[EMP.MANAGER_EMAIL] = mgrEmail;
  row[EMP.DEPARTMENTS] = deptsOut;
  row[EMP.SCHEDULE] = sched;
  return { ok: true, row: row };
}
/** Admin-gated, locked — append a VALIDATED roster row, then (optionally)
 *  auto-provision the rep's Call Notes Sheet. Validation runs INSIDE the lock
 *  against a fresh sheet read so uniqueness can't race a concurrent add. The
 *  provisioning step reuses provisionCallNotesSheet AFTER the lock is
 *  released (it takes the same lock itself); a provisioning failure leaves
 *  the employee created and reports the warning rather than failing the add. */
function addEmployee(payload) {
  try {
    var callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    if (!payload || typeof payload !== 'object') return { error: 'No employee data supplied.' };
    var check;
    // Operator report 2026-08-08: EVERY step after the append used to sit
    // under the one outer catch, so a throw in a FOLLOW-UP step (most
    // reachably provisionCallNotesSheet, whose waitLock sits OUTSIDE its own
    // try and throws on timeout) returned a bare {error} while the roster row
    // already existed. The admin saw "failed", retried, and hit "Employee ID
    // already in use" for an ID nothing visibly owned. Once the row is
    // appended the call MUST report success-with-warning, never failure —
    // the INV-187 rule applied to a WRITE: the response has to describe what
    // actually happened to the store.
    var appended = false;
    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var sheet = getAdpSS_().getSheetByName(CONFIG.EMPLOYEE_TAB);
      var rows = sheet.getDataRange().getValues();
      var existingEmails = [], existingIds = [], existingNames = [];
      var owners = { email: {}, id: {}, name: {} };
      var hasBiweeklyAnchor = false;
      for (var i = 1; i < rows.length; i++) {
        // The conflict label names the row the way an admin can find it in
        // the sheet: display name + 1-based sheet row. Operator report
        // 2026-08-08 (second round): the blocking row was a HAND-STUBBED one
        // (ID + name, no email) — invisible in every in-app list because
        // empRosterEmail_ excludes it, so "already in use" pointed at
        // nothing the admin could see. Say so in the label, with the two
        // clean resolutions.
        var label = (String(rows[i][EMP.NAME] || '').trim() || '(no name)') + ' (row ' + (i + 1) + ')';
        if (!empRosterEmail_(rows[i])) {
          label += ' — that row has NO login email, so it is not in the list above; ' +
            'clear its Employee ID, or fill in its email to reactivate it';
        }
        var em = empRosterEmail_(rows[i]);   // F3: the one inclusion predicate
        if (em) { existingEmails.push(em.toLowerCase()); owners.email[em.toLowerCase()] = label; }
        var exId = String(rows[i][EMP.ID] || '').trim();
        if (exId) { existingIds.push(exId.toLowerCase()); owners.id[exId.toLowerCase()] = label; }
        var exNm = String(rows[i][EMP.NAME] || '').trim();
        if (exNm) { existingNames.push(exNm.toLowerCase()); owners.name[exNm.toLowerCase()] = label; }
        if (String(rows[i][EMP.PAY_CYCLE] || '').trim().toLowerCase() === 'biweekly' &&
            String(rows[i][EMP.PAY_ANCHOR] || '').trim()) hasBiweeklyAnchor = true;
      }
      check = empValidateNewEmployee_(payload, {
        existingEmails: existingEmails, existingIds: existingIds, existingNames: existingNames,
        owners: owners,
        managerEmails: getManagerEmails_().map(function (e) { return String(e).toLowerCase(); }),
        deptKeys: Object.keys(getDepartmentEmails_()),
        hasBiweeklyAnchor: hasBiweeklyAnchor,
      });
      if (!check.ok) return { error: check.error };
      sheet.appendRow(sheetSafeRow_(check.row));
      appended = true;
      // Post-append bookkeeping is best-effort INDIVIDUALLY: neither of these
      // may turn a completed add into a reported failure.
      try { invalidateRosterCache_(); } catch (eCache) {   // INV-10 — the new rep can log in immediately
        console.warn('addEmployee: roster cache invalidation failed: ' + eCache.message);
      }
      writeAuditLog_(callerEmp, 'EmployeeAdd', String(payload.id).trim(), '', false, 0,
        'id=' + String(payload.id).trim() + '; name=' + String(payload.name).trim() +
        '; tz=' + String(payload.timezone).trim(), callerEmp.email);
    } finally {
      lock.releaseLock();
    }
    var result = { success: true, id: String(payload.id).trim(), name: String(payload.name).trim() };
    if (payload.provisionNotes) {
      // Sequential lock re-acquire (never nested) — see the docstring. The
      // try/catch is load-bearing: provisionCallNotesSheet's own waitLock is
      // outside its try, so a lock timeout THROWS rather than returning
      // {error}, and that throw must not unwind a completed add.
      var prov = null;
      try { prov = provisionCallNotesSheet(result.id); }
      catch (eProv) { prov = { error: eProv.message }; }
      if (prov && prov.success) result.provision = { sheetId: prov.sheetId, url: prov.url || '' };
      else result.provisionWarning = (prov && prov.error) || 'Call Notes provisioning failed — use the Enrollment panel to retry.';
    }
    return result;
  } catch (err) {
    // The row is already on the roster — reporting a bare failure here is what
    // created the phantom "ID already in use" on retry. Report the truth.
    if (appended) {
      return { success: true, id: String(payload.id).trim(), name: String(payload.name).trim(),
        provisionWarning: 'the employee WAS created, but a follow-up step failed: ' + err.message +
          ' — do not re-add them; check the Team Members list.' };
    }
    return { error: err.message };
  }
}
/** Admin-gated, locked — offboard by the ROSTER CONVENTION (INV-183): clear
 *  the EMAIL cell, keep the name and every other cell, so history still reads
 *  while every inclusion walk stops counting the row. Never deletes the row,
 *  never touches the per-rep Sheets. Self-offboarding is rejected (it would
 *  lock the caller out of the app mid-session). */
function offboardEmployee(repEmpId) {
  try {
    var callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    repEmpId = String(repEmpId || '').trim();
    if (!repEmpId) return { error: 'No employee specified.' };
    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var sheet = getAdpSS_().getSheetByName(CONFIG.EMPLOYEE_TAB);
      var rows = sheet.getDataRange().getValues();
      var targetRow = -1, repName = '', repEmail = '';
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][EMP.ID] || '').trim() !== repEmpId) continue;
        targetRow = i;
        repName = String(rows[i][EMP.NAME] || '').trim();
        repEmail = empRosterEmail_(rows[i]);
        break;
      }
      if (targetRow < 0) return { error: 'Employee not found: ' + repEmpId };
      if (!repEmail) return { error: (repName || repEmpId) + ' is already offboarded (no email on the row).' };
      if (repEmail.toLowerCase() === String(callerEmp.email).toLowerCase()) {
        return { error: 'You cannot offboard yourself — another admin has to do that.' };
      }
      sheet.getRange(targetRow + 1, EMP.EMAIL + 1).setValue(sheetSafe_(''));
      invalidateRosterCache_();
      writeAuditLog_(callerEmp, 'EmployeeOffboard', repEmpId, '', false, 0,
        'id=' + repEmpId + '; name=' + repName, callerEmp.email);
      return { success: true, id: repEmpId, name: repName };
    } finally {
      lock.releaseLock();
    }
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
      const sheetId = cnEnrolledSheetId_(roster[r]);   // F14: trimmed predicate
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
        // F1 (cycle 16): the read OUTCOME rides with the numbers — see the catch.
        notesUnavailable: false,
      };
      const completionTimes = [];
      const noteTimes = [];
      try {
        const sheet = getCallNotesSheet_({ id: repId, name: repName, callNotesSheetId: sheetId });
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
            if (cnDateLocalString_(dateCol[d][0]) === date) {
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
        // F1 (cycle 16) — this catch used to swallow the failure and fall
        // through, so the rep was pushed below with totalNotes:0, every
        // flagCount 0 and emailsSent:0, and line ~4159 then computed
        // noteCoverage from that zero against their REAL CDR answered count.
        // The manager's end-of-shift Stats table therefore rendered a rep
        // whose Sheet could not be opened identically to a rep who logged
        // nothing all shift — a CRIT-toned 0% coverage badge drawn from a
        // failed read. Exactly the cycle-12 F5 class (INV-129: "a failed
        // note-count read must be SURFACED, never rendered as 0"), in the one
        // surface F5 missed because this function counts inline (it needs
        // flags/emails/median too, not just the count) rather than through
        // cnCountNotesResult_. Carry the outcome instead.
        console.warn('managerGetShiftStats skipped rep ' + repId + ': ' + e.message);
        stats.notesUnavailable = true;
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
        // F1 (cycle 16): coverage is a ratio over a note count we may not have.
        // With an unreadable Sheet the numerator is unknown, not zero, so the
        // ratio is null and the client renders an em dash (INV-129).
        reps[ri].noteCoverage = reps[ri].notesUnavailable
          ? null : cnNoteCoverage_(reps[ri].totalNotes, cdr ? cdr.totalAnswered : 0);
      }
    } catch (cdrErr) {
      console.warn('managerGetShiftStats CDR enrichment failed: ' + cdrErr.message);
    }

    reps.sort(function (a, b) { return a.repName.localeCompare(b.repName); });
    return { date: date, reps: reps };
  } catch (err) { return { error: err.message }; }
}
/** Is any roster row carrying a column-Q accrual rate? Decides whether the
 *  accrual credit is EXPECTED to write rows at all (see the table above). */
function rosterHasAccruingRep_() {
  try {
    const rows = getEmployeeRosterRows_();
    for (let i = 1; i < rows.length; i++) {
      if (!empRosterEmail_(rows[i])) continue;
      if (empPtoAccrual_(rows[i][EMP.PTO_ACCRUAL]) !== null) return true;
    }
  } catch (e) { /* unreadable roster — treated as "not expected", never nags */ }
  return false;
}
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
    sheet.getRange(1, 1, 2, width).setValues(sheetSafeRows_(liveSheet.getRange(1, 1, 2, width).getValues()));
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
        { headerRows: 2, width: Math.max(live.getLastColumn(), 9),
          // F3 (cycle 12): bounded per run — see the constant.
          maxRows: TIMESHEET_ARCHIVE_MAX_ROWS_PER_RUN });
    } finally {
      lock.releaseLock();
    }
    // Written on every ENABLED run (the CN archive convention) — a zero-moved
    // row is the Automation Health "last seen" heartbeat proving the job ran.
    // F3: flag a run that hit the per-run bound, so a draining backlog is
    // visible in the audit trail instead of looking like a normal small run.
    const hitCap = (moved >= TIMESHEET_ARCHIVE_MAX_ROWS_PER_RUN);
    writeAuditLog_(_SYSTEM_AUDIT_EMP_, 'TimesheetArchive', '', '', false, 0,
      `archiveDays=${days}; rowsArchived=${moved}` +
      (hitCap ? `; hitPerRunCap=${TIMESHEET_ARCHIVE_MAX_ROWS_PER_RUN} (more remain — continues tomorrow)` : ''));
    Logger.log(`archiveOldTimesheetRows: moved ${moved} row(s) older than ${days} day(s) to ${TIMESHEET_ARCHIVE_TAB}.` +
      (hitCap ? ' Hit the per-run cap — more rows remain for the next run.' : ''));
  } catch (err) {
    Logger.log('archiveOldTimesheetRows failed: ' + err.message);
  }
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
    if (!empRosterEmail_(empRows[i])) continue;   // F3: one predicate
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
    // F-20 (2026-09-18): this job writes no audit row, so a dead trigger was
    // invisible — the heartbeat (stale > 26h) is the liveness signal, stamped
    // once the read succeeded and BEFORE the no-work early return.
    stampDigestLastRun_('missedPunch');
    clearAutomationError_('MissedPunchAlerts');
    if (missed.length === 0) { Logger.log('No missed clock-outs.'); return; }

    missed.forEach(emp => {
      try {
        appSendMail_({
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
            '<p style="margin:0 0 12px;">Our records show you clocked in on <b>' + esc_(emp.yesterdayStr) + '</b> (' + esc_(tzAbbr_(emp.timezone)) + ') but didn\'t clock out. Use <b>Adjust</b> to record your clock-out time so your timesheet is right.</p>' +
            '<p style="margin:14px 0 0;color:' + CN_EMAIL_PALETTE.muted + ';">If you have any questions, please contact your manager.</p>',
            { accent: CN_EMAIL_PALETTE.warn, subLabel: 'Time Clock', statusLabel: 'Action needed',
              ctaUrl: safeWebAppUrl_('clock'), ctaLabel: 'Fix it in Time Clock' }),
        });
      } catch (e) { Logger.log('Failed to email employee ' + emp.email + ': ' + e.message); }
    });

    // #2 (INV-151): while the consolidated daily brief is on, the manager
    // summary rides the 8am brief instead — the EMPLOYEE reminders above are
    // never suppressed (the rep still needs the nudge to fix their punch).
    // F(cycle-8 M-11): suppression requires a LIVE brief heartbeat, not just the flag.
    if (managerBriefSuppressionActive_({ checkTrigger: true })) {
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
        appSendMail_({
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
            '<p style="margin:0;"><a href="https://docs.google.com/spreadsheets/d/' + getAdpSS_().getId() + '/edit" style="color:' + CN_EMAIL_PALETTE.info + ';font-weight:600;">Open the audit log →</a></p>',
            { accent: CN_EMAIL_PALETTE.warn, subLabel: 'Time Clock',
              ctaUrl: safeWebAppUrl_('manage'), ctaLabel: 'Open the manager dashboard' }),
        });
      } catch (e) { Logger.log('Manager missed-punch digest email failed: ' + e.message); }
    }
  } catch (err) {
    // F-20: a caught failure reaches nobody unless stamped (the F4 rule).
    stampAutomationError_('MissedPunchAlerts', err.message);
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
    // F-20 (2026-09-18): the AdpExportAuto audit row lands only at a period
    // end, so the daily CHECK itself had no liveness signal — a dead trigger
    // meant a silently missing payroll export. The heartbeat is the signal.
    stampDigestLastRun_('exportCheck');
    clearAutomationError_('DailyExportCheck');
  } catch (err) {
    stampAutomationError_('DailyExportCheck', err.message);
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
  let createdSheet = null;   // C12 (cycle 10) — see the catch branch
  try {
    const result = generateExportSheet_(range.start, range.end, payCycleFilter);
    if (!result.error) createdSheet = result;
    if (result.error) {
      appSendMail_({
        to: recipients.join(','),
        subject: `${subjectPrefix}: ${result.error}`,
        body: `No export generated for ${range.start} to ${range.end}.\nReason: ${result.error}`,
        htmlBody: buildBrandedEmailHtml_('No export generated',
          '<p style="margin:0 0 12px;">No export was generated for <b>' + esc_(range.start) + '</b> to <b>' + esc_(range.end) + '</b>.</p>' +
          brandedKvRows_([['Reason', result.error]]),
          { accent: CN_EMAIL_PALETTE.warn, subLabel: 'Payroll', statusLabel: 'Nothing to send' }),
      });
      writeAuditLog_(_SYSTEM_AUDIT_EMP_, 'AdpExportAuto', rangeLabel, '', false, 0,
        `${payCycleFilter} skipped — ${result.error}`);
      return;
    }
    const xlsxUrl = `https://docs.google.com/spreadsheets/d/${result.fileId}/export?format=xlsx`;
    const blob = UrlFetchApp.fetch(xlsxUrl, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    }).getBlob().setName(result.fileName + '.xlsx');

    appSendMail_({
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
        '',
        { accent: CN_EMAIL_PALETTE.brand, subLabel: 'Payroll', statusLabel: 'Ready',
          ctaUrl: result.url, ctaLabel: 'Open as a Google Sheet' }),
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
      appSendMail_({
        to: recipients.join(','),
        subject: `❌ ${subjectPrefix} FAILED`,
        // C12 (cycle 10): the export SHEET is usually already created when
        // this catch fires (the .xlsx Drive fetch is the realistic thrower) —
        // the old email said "run it manually" without mentioning the valid
        // sheet, so the manager re-ran and created a duplicate.
        body: `Automated export failed: ${err.message}\n\nRange: ${range.start} to ${range.end}\n\n` +
              (createdSheet
                ? `NOTE: the export Google Sheet WAS created successfully — only the .xlsx attachment step failed.\n` +
                  `Open it here (no need to re-run):\n${createdSheet.url}\n`
                : `Please run the export manually from the Manage tab in the UMS Time Clock app.`),
        htmlBody: buildBrandedEmailHtml_('Automated export failed',
          '<p style="margin:0 0 12px;">The automated export did not complete.</p>' +
          brandedKvRows_([
            ['Error', err.message],
            ['Range', range.start + ' to ' + range.end],
          ]) +
          (createdSheet
            ? '<p style="margin:14px 0 0;">The export Google Sheet <b>was created successfully</b> — only the .xlsx attachment step failed. ' +
              '<a href="' + esc_(createdSheet.url) + '" style="color:' + CN_EMAIL_PALETTE.brand + ';font-weight:600;">Open it →</a> (no need to re-run).</p>'
            : '<p style="margin:14px 0 0;color:' + CN_EMAIL_PALETTE.muted + ';">Please run the export manually from the Manage tab in the UMS Time Clock app.</p>'),
          { accent: CN_EMAIL_PALETTE.danger, subLabel: 'Payroll', statusLabel: 'Failed' }),
      });
    } catch (e) {}
  }
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
  const htmlBody = buildBrandedEmailHtml_('Documents need your attention', html,
    { accent: P.warnDeep, subLabel: 'Employee Docs', ctaUrl: safeWebAppUrl_('myDocs'), ctaLabel: 'Open My Docs' });
  appSendMail_({ to: toEmail, subject: '⏰ Your documents are overdue', body: text, htmlBody: htmlBody });
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
function generateExportSheet_(startDate, endDate, cycleFilter) {
  const sourceSheet = getAdpSS_().getSheetByName(CONFIG.ADP_TAB);
  const rows = sourceSheet.getDataRange().getValues();
  // A7 (cycle 13): this used to be `if (rows.length < 3) return {error}` — an
  // early return that fired BEFORE the F1 cold-archive read-through below, so
  // once INV-153 archival had drained the live tab a retroactive payroll export
  // refused with a misleading "no data" instead of reading the archive that
  // holds it. Only the HEADER is genuinely required from the live tab (the
  // export copies its two header rows verbatim); zero DATA rows is a legitimate
  // state that the archive can still satisfy.
  if (rows.length < 2) {
    return { error: 'The Timesheet tab has no header rows — the export cannot be built. ' +
                    'Check the ' + CONFIG.ADP_TAB + ' tab in the ADP spreadsheet.' };
  }

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
  // Cycle-12 F1: the live-tab key set, used to drop an archive row that is
  // byte-identical to a live one (see the archive read-through below).
  const liveKeys = new Set();
  let oldestLiveDate = null;
  const rowKey = function (r) {
    return String(r[ADP.EMP_ID]).trim() + '|' + normalizeDate_(r[ADP.DATE]) + '|' +
      normalizeTime_(r[ADP.TIME]) + '|' + normalizeType_(String(r[ADP.COMMENTS]));
  };
  for (let i = 2; i < rows.length; i++) {
    const rowDate = normalizeDate_(rows[i][ADP.DATE]);
    // Track the live tab's coverage floor BEFORE the range filter — it decides
    // whether the cold archive has to be consulted at all (F1).
    if (rowDate && (oldestLiveDate === null || rowDate < oldestLiveDate)) oldestLiveDate = rowDate;
    if (rowDate < startDate || rowDate > endDate) continue;
    const rowId = String(rows[i][ADP.EMP_ID]).trim();
    if (allowedIds && !allowedIds.has(rowId)) continue;
    seenIds.add(rowId);
    liveKeys.add(rowKey(rows[i]));
    const cleaned = rows[i].slice(0, 9);
    cleaned[ADP.COMMENTS] = '';
    matched.push(cleaned);
  }

  // ── Cold-archive read-through (cycle-12 F1) ───────────────────────────────
  // TIMESHEET_ARCHIVE_DAYS (INV-153) MOVES old payroll rows to a
  // TimesheetArchive tab. That tab had NO reader anywhere, so once archiving
  // was enabled a retroactive export (a payroll dispute, a corrected period)
  // silently produced a PARTIAL .xlsx with {success:true} and an audit row
  // that reported the truncated count as authoritative. Read the archive
  // whenever the requested window reaches past the live tab's oldest row.
  // Bounded by design: the common case (current period, inside the ≥120-day
  // floor) never touches the archive, so it stays byte-identical to before.
  // Read-only w.r.t. tab existence (getSheetByName, never create — the
  // INV-133 discipline).
  let archivedRowCount = 0;
  if (oldestLiveDate === null || startDate < oldestLiveDate) {
    try {
      const archiveSheet = getAdpSS_().getSheetByName(TIMESHEET_ARCHIVE_TAB);
      if (archiveSheet && archiveSheet.getLastRow() > 2) {
        const aRows = archiveSheet.getDataRange().getValues();
        for (let a = 2; a < aRows.length; a++) {
          const aDate = normalizeDate_(aRows[a][ADP.DATE]);
          if (!aDate || aDate < startDate || aDate > endDate) continue;
          const aId = String(aRows[a][ADP.EMP_ID]).trim();
          if (!aId) continue;
          if (allowedIds && !allowedIds.has(aId)) continue;
          // A mid-run archive failure appends before it deletes, so the SAME
          // row can exist in both tabs (INV-132 "can only duplicate, never
          // lose"). Exporting it twice would overstate payroll, so skip an
          // exact live match. Genuine duplicate punch rows inside ONE tab are
          // untouched — the sheet doctor (INV-159) is that fix.
          if (liveKeys.has(rowKey(aRows[a]))) continue;
          seenIds.add(aId);
          const aCleaned = aRows[a].slice(0, 9);
          aCleaned[ADP.COMMENTS] = '';
          matched.push(aCleaned);
          archivedRowCount++;
        }
      }
    } catch (archErr) {
      // REFUSE rather than return a short file. Producing a partial payroll
      // export behind {success:true} is the exact F1 failure mode being fixed,
      // so a broken archive read must be loud even though it costs the manager
      // a retry. Ranges that do NOT reach the archive never get here.
      console.warn('generateExportSheet_: archive read failed: ' + archErr.message);
      return { error: 'The Timesheet cold archive could not be read (' + archErr.message +
        '), and this date range reaches into it — the export would be incomplete. ' +
        'Re-try, or narrow the range to ' + (oldestLiveDate || startDate) + ' or later.' };
    }
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
  sh.getRange(1, 1, 2, 9).setValues(sheetSafeRows_([rows[0].slice(0, 9), rows[1].slice(0, 9)]));
  sh.getRange(3, 1, matched.length, 9).setValues(sheetSafeRows_(matched));
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
    rowCount: matched.length, employeeCount,
    // F1: how many of rowCount came from the cold archive (0 in the normal
    // current-period case). Additive — existing callers ignore it.
    archivedRowCount: archivedRowCount };
}


// ════════════════════════════════════════════════════════════════════════════
//  TIMESHEET / CALENDAR BUILDERS
// ════════════════════════════════════════════════════════════════════════════
function buildTimesheetForEmployee_(emp, startDate, endDate) {
  // Cycle-9 L-1: shape-validate + span-cap the range — this was the only
  // range read with neither (every sibling caps: CN history 90d, metrics
  // range 92d, coverage 14d). The per-day while-loop below builds one object
  // per day, so a garbage/hostile range ('2000-01-01'…'9999-12-31') spun
  // ~2.9M iterations into the 6-min execution budget. 370 days covers every
  // legitimate caller (the client requests pay-period / month windows).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(startDate)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(endDate)))
    return { error: 'Invalid date range (expected yyyy-MM-dd).' };
  if (startDate > endDate) return { error: 'Start date must be on or before end date.' };
  if (daysBetween_(startDate, endDate) > 370) return { error: 'Range too large (max ~1 year).' };
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
    punches.forEach(p => { punchDayAdd_(pm, p.type, p.time); adjMap[p.type] = adjMap[p.type] || p.isAdjustment; });

    let hoursWorked = null, isIncomplete = false, inProgress = false;
    if (pm.ClockIn) {
      if (pm.ClockOut) {
        hoursWorked = calcHours_(pm.ClockIn, pm.ClockOut, pm.LunchOut || null, pm.LunchIn || null);
        // A3: a null (unparseable time cell) reads as an INCOMPLETE day rather
        // than adding NaN to the period total — `totalHours += NaN` used to
        // turn the whole timesheet's total into NaN off one bad cell.
        if (hoursWorked === null) { isIncomplete = true; incompleteCount++; }
        else { totalHours += hoursWorked; daysWorked++; }
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
      lunchOut: punchFirst_(pm.LunchOut),  adjLunchOut: !!adjMap.LunchOut,
      lunchIn: punchFirst_(pm.LunchIn),    adjLunchIn: !!adjMap.LunchIn,
      // Every break pair, in the order calcHours_ deducts them. Additive:
      // the two scalars above still carry the first stamp for older clients.
      breaks: breakPairs_(pm.LunchOut, pm.LunchIn, timeToMins_(pm.ClockIn))
        .map(b => ({ out: b.out, in: b.in })),
      // T1 (cycle 22): the leave with no return yet — Day Edit renders it as
      // a half row so a save round-trips it instead of deleting it.
      openBreak: breakOpenLeave_(pm.LunchOut, pm.LunchIn, timeToMins_(pm.ClockIn)),
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
    punchDayAdd_(punchesByDate[rowDate], type, time);
    if (type === 'ClockIn') workedDates.add(rowDate);
  }
  // Compute hours per worked date (when both ClockIn and ClockOut are present)
  const hoursByDate = {};
  Object.keys(punchesByDate).forEach(dateStr => {
    const p = punchesByDate[dateStr];
    if (p.ClockIn && p.ClockOut) {
      // A3: leave an unparseable day OUT of the map (calendar shows no hours
      // badge) rather than writing NaN into it.
      const h = calcHours_(p.ClockIn, p.ClockOut, p.LunchOut || null, p.LunchIn || null);
      if (h !== null) hoursByDate[dateStr] = h;
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
    // F5 (cycle 18) — TRIM as well as lowercase. Every sibling TO.STATUS reader
    // trims (INV-183); this one did not, so a padded cell fell through the
    // teammate filter below AND rode to the client raw, where the calendar's
    // `st === 'approved'` cell-class test missed it and painted a rep's own
    // APPROVED day as pending. The trimmed value is what ships, so the client
    // comparison and the server filter can no longer disagree.
    const status  = String(toRows[i][TO.STATUS]).trim();
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
  const holidays = getCompanyHolidays_(year).filter(h => h.date >= startDate && h.date <= endDate);
  // MTD accrual preview — see the field comment on ptoAccrualMtd below.
  let ptoAccrualMtd = null;
  if (emp.ptoAccrualPerBasis && todayStr >= startDate && todayStr <= endDate) {
    let mtdHours = 0;
    Object.keys(hoursByDate).forEach((d) => {
      const v = hoursByDate[d];
      if (typeof v === 'number' && d <= todayStr) mtdHours += v;
    });
    const earned = accrualDaysForHours_(mtdHours, emp.ptoAccrualPerBasis,
      CONFIG.PTO_ACCRUAL_BASIS_HOURS, CONFIG.PTO_HOURS_PER_DAY);
    if (earned) ptoAccrualMtd = { hours: +mtdHours.toFixed(2), days: earned.days };
  }
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
    // Accrual (operator 2026-08-19): the column-Q rate in its REAL terms —
    // PTO hours per basis hours worked — plus the conversion the credit uses.
    // null rate = lump-grant rep, the fixed-allotment tile.
    ptoAccrualPer80: emp.ptoAccrualPerBasis || null,
    ptoAccrualBasisHours: CONFIG.PTO_ACCRUAL_BASIS_HOURS,
    ptoHoursPerDay: CONFIG.PTO_HOURS_PER_DAY,
    // Month-to-date EARNING preview, from the punches this calendar already
    // read — no extra sheet access. Only when the VIEWED month is the current
    // one (the balance is current, so an MTD line for a past month browsed
    // through would be a different month's number beside today's balance).
    // Not a credit: the trigger credits in arrears on the 1st.
    ptoAccrualMtd: ptoAccrualMtd,
  };
}


// ════════════════════════════════════════════════════════════════════════════
//  US HOLIDAYS
// ════════════════════════════════════════════════════════════════════════════
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
/**
 * Is this rep on APPROVED time off on `dateIso`? (cycle-18 F2.)
 *
 * BOUNDED on purpose: `getEmployeeState` is the app's hottest endpoint (boot,
 * every punch via the recordPunch wrapper, the reminder ticker's <=1/10min
 * refresh), so this reads the three columns it needs — EmpId / Date / Status —
 * not the full row (the INV-46 discipline). Status is compared NORMALIZED
 * (INV-183); the date is coercion-recovered (INV-29).
 *
 * Best-effort by construction: any read failure returns FALSE, i.e. "not known
 * to be off". That is the safe direction here — the ONLY consumer is the
 * reminder ticker, and a false NEGATIVE costs a reminder on a day off (the
 * pre-fix behaviour), while a false POSITIVE would silence a real reminder for
 * a rep who IS working.
 */
function empIsOffToday_(empId, dateIso) {
  try {
    const sheet = getOrCreateTimeOffSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return false;
    const width = Math.max(TO.DATE, TO.STATUS, TO.EMP_ID) + 1;
    const rows = sheet.getRange(2, 1, lastRow - 1, width).getValues();
    const id = String(empId).trim();
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][TO.EMP_ID]).trim() !== id) continue;
      if (normalizeDate_(rows[i][TO.DATE]) !== dateIso) continue;
      if (String(rows[i][TO.STATUS] || '').trim().toLowerCase() === 'approved') return true;
    }
    return false;
  } catch (e) {
    Logger.log('empIsOffToday_ failed: ' + e.message);
    return false;
  }
}
/** Today's PENDING punch-adjustment requests for one rep (operator
 *  2026-08-31). Until this shipped a submitted request was visible ONLY inside
 *  the Adjust modal — close it and the Clock view showed no trace, so a rep who
 *  had already asked for a fix saw a bare "Clock In" button and the natural
 *  next move was to punch again "to be safe". (That second punch is not lost —
 *  writeAdjustPunchForEmployee_ updates the existing row on approval — but
 *  nobody was told that is what would happen.)
 *
 *  Scoped to TODAY because the chip lives beside today's punch buttons; the
 *  Adjust modal still lists every pending request. READ-ONLY and bounded (the
 *  empIsOffToday_ precedent — a projected range, never getDataRange), and it
 *  NEVER provisions the tab: a deployment with no adjustment requests yet must
 *  not have getEmployeeState create a sheet. Best-effort — a failed read
 *  yields [], which is exactly the pre-fix behaviour, never worse. */
function empPendingAdjustments_(empId, dateIso) {
  try {
    const sheet = getAdpSS_().getSheetByName(CONFIG.PUNCH_ADJUST_TAB);
    if (!sheet) return [];
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    const width = Math.max(PAR.EMP_ID, PAR.DATE, PAR.PUNCH_TYPE, PAR.REQ_TIME, PAR.STATUS, PAR.ACTION) + 1;
    const rows = sheet.getRange(2, 1, lastRow - 1, width).getValues();
    const id = String(empId).trim();
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][PAR.EMP_ID]).trim() !== id) continue;
      if (normalizeDate_(rows[i][PAR.DATE]) !== dateIso) continue;
      // Status is normalized at the ONE read (the TO/DR.STATUS family) — a
      // hand-edited " Pending " cell must not read as a decided request.
      if (String(rows[i][PAR.STATUS] || '').trim().toLowerCase() !== 'pending') continue;
      out.push({
        punchType: String(rows[i][PAR.PUNCH_TYPE] || '').trim(),
        time: normalizeTime_(rows[i][PAR.REQ_TIME]).trim().substring(0, 5),
        // B3: additive. A pending RESUME must not read as "Clock Out 19:30" —
        // that is the punch it converts, not the one it adds. An older client
        // ignores the field and renders as before.
        action: String(rows[i][PAR.ACTION] || '').trim().toLowerCase() === 'resume' ? 'resume' : 'set',
        endTime: parEndTime_(rows[i]),   // T3
      });
    }
    return out;
  } catch (e) {
    Logger.log('empPendingAdjustments_ failed: ' + e.message);
    return [];
  }
}
function hasActiveTimeOffOnDate_(sheet, empId, date, excludeRowIndex) {
  const rows = sheet.getDataRange().getValues();
  const id = String(empId).trim();
  for (let i = 1; i < rows.length; i++) {
    // Cycle-11 M-1: the status-change re-check passes its own row's index
    // (same getDataRange indexing, inside the same lock) so a Pending row
    // being approved doesn't collide with itself.
    if (excludeRowIndex !== undefined && i === excludeRowIndex) continue;
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
    sheet.getRange(i + 1, col + 1).setValue(sheetSafe_(next));
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
  // Breaks (item 1): the Admin-edited SHIFT_BREAK_SCHEDULES property wins when
  // it has an applicable entry — the tz's own key, else its DEFAULT key. An
  // EXPLICITLY EMPTY array is honored ("no breaks for this key"), which is why
  // the applicability check is `!== undefined`, never truthiness. Only when the
  // property has NO applicable entry does the CONFIG chain apply: the shift
  // entry's own breaks, else inherit DEFAULT's. Resolved to minutes-from-
  // midnight + length so the client can compute the next break.
  const prop = getBreakSchedules_();
  let rawBreaks;
  if (prop) {
    if (prop.schedules[timezone] !== undefined) rawBreaks = prop.schedules[timezone];
    else if (prop.schedules.DEFAULT !== undefined) rawBreaks = prop.schedules.DEFAULT;
  }
  if (rawBreaks === undefined) {
    rawBreaks = Array.isArray(sched.breaks) ? sched.breaks
              : (Array.isArray(def.breaks) ? def.breaks : []);
  }
  return {
    startMin: startMin, lengthMin: endMin - startMin,
    breaks: breakListResolve_(rawBreaks),
    breakReminderMin: (prop && prop.reminderMin) || parseInt(cfg.BREAK_REMINDER_MINUTES, 10) || 10,
  };
}
/** Pure — a stored break list [{label, start 'H:mm', len}] → the resolved
 *  shape every consumer reads ({label, startMin, lenMin}); zero-length rows
 *  drop. ONE conversion for the tz layer and the per-employee layer, so the
 *  two cannot drift (INV-72 family). */
function breakListResolve_(raw) {
  const toMin = function (hm) {
    const p = String(hm || '').split(':');
    return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
  };
  return (Array.isArray(raw) ? raw : []).map(function (b) {
    return { label: String(b.label || 'Break'), startMin: toMin(b.start), lenMin: parseInt(b.len, 10) || 0 };
  }).filter(function (b) { return b.lenMin > 0; });
}
/** Pure — the lenient per-break whitelist-rebuild shared by every key of the
 *  SHIFT_BREAK_SCHEDULES blob (timezone keys AND employee ids): a bad break is
 *  dropped, survivors kept, label trim + cap 40 + default, at most 10. */
function breakListSanitize_(arr) {
  const clean = [];
  for (let j = 0; j < arr.length && clean.length < 10; j++) {
    const b = arr[j] || {};
    const start = String(b.start || '').trim();
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(start)) continue;
    const len = parseInt(b.len, 10);
    if (!(len >= 1 && len <= 240)) continue;
    const label = String(b.label || '').trim().substring(0, 40) || 'Break';
    clean.push({ label: label, start: start, len: len });
  }
  return clean;
}
/** Pure (Node-pinned) — lenient sanitize of the SHIFT_BREAK_SCHEDULES Script
 *  Property blob (the L-12 sanitize-on-read rule: a hand-edited property
 *  degrades, never throws). Shape: { schedules: { DEFAULT|<IANA tz>: [
 *  { label, start 'H:mm', len 1-240 } ] }, reminderMin 1-120 }. Whitelist-
 *  rebuilt: a bad key / non-array value is dropped, a bad BREAK inside a valid
 *  key is dropped (the key keeps its surviving breaks — an all-junk key reads
 *  as explicitly EMPTY, the quieter failure: a missed reminder over a
 *  wrong-time one), labels trim + cap 40 + default. Caps: 20 keys, 10 breaks
 *  per key. reminderMin out of range = absent (CONFIG fallback). Returns null
 *  for a non-object blob. Anything saveBreakSchedules ACCEPTS round-trips
 *  through this unchanged (pinned), so a rejected save and a sanitized read
 *  can never disagree. */
function breakSchedSanitize_(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const src = (obj.schedules && typeof obj.schedules === 'object' && !Array.isArray(obj.schedules)) ? obj.schedules : {};
  const schedules = {};
  let keyCount = 0;
  const keys = Object.keys(src);
  for (let i = 0; i < keys.length; i++) {
    const key = String(keys[i]).trim();
    if (key !== 'DEFAULT' && !/^[A-Za-z]+(\/[A-Za-z0-9_\-+]+)+$/.test(key)) continue;
    if (keyCount >= 20) break;
    const arr = src[keys[i]];
    if (!Array.isArray(arr)) continue;
    schedules[key] = breakListSanitize_(arr);   // EMPTY is meaningful — "no breaks for this key"
    keyCount++;
  }
  const out = { schedules: schedules };
  // Per-employee layer (operator 2026-09-02): { employees: { <empId>: [...] } }.
  // Same per-break rule, keyed by ROSTER ID (never a name — names are edited,
  // ids are reserved for life, INV-183). Emitted ONLY when non-empty so a
  // pre-existing blob round-trips byte-identically. An explicitly EMPTY list
  // is "no breaks for this agent" — honoured downstream via !== undefined.
  const esrc = (obj.employees && typeof obj.employees === 'object' && !Array.isArray(obj.employees)) ? obj.employees : {};
  const employees = {};
  let eCount = 0;
  const ekeys = Object.keys(esrc);
  for (let i = 0; i < ekeys.length; i++) {
    const id = String(ekeys[i]).trim();
    if (!BREAK_EMP_KEY_RE.test(id)) continue;
    if (eCount >= BREAK_EMP_MAX_KEYS) break;
    const arr = esrc[ekeys[i]];
    if (!Array.isArray(arr)) continue;
    employees[id] = breakListSanitize_(arr);
    eCount++;
  }
  if (eCount > 0) out.employees = employees;
  const rm = parseInt(obj.reminderMin, 10);
  if (rm >= 1 && rm <= 120) out.reminderMin = rm;
  return out;
}
function getBreakSchedules_() {
  if (_breakSchedulesCache !== undefined) return _breakSchedulesCache;
  let out = null;
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('SHIFT_BREAK_SCHEDULES');
    if (raw && raw.trim()) out = breakSchedSanitize_(JSON.parse(raw));
  } catch (e) { out = null; }
  _breakSchedulesCache = out;
  return out;
}
/** Run `fn` with a DRAFT property in place of the stored one, then restore.
 *  The break coverage planner previews UNSAVED editor state, and every
 *  consumer of the property — the tz layer in getShiftSchedule_ and the
 *  per-agent layer in empShiftSchedule_ — reads it through the per-execution
 *  memo above, so swapping the memo is how the ONE resolver (INV-149) sees the
 *  draft without a second code path that could drift. Read-only callers only;
 *  the finally restores the pre-swap state (undefined = re-read on demand). */
function withBreakSchedulesProp_(prop, fn) {
  const prev = _breakSchedulesCache;
  _breakSchedulesCache = prop;
  try { return fn(); } finally { _breakSchedulesCache = prev; }
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
  // Per-employee breaks (operator 2026-09-02): the property's `employees`
  // map, keyed by roster id, wins over the tz layer for that agent — the
  // real dimension once every row shares one zone under the ALL-CST policy
  // (staggered breaks so the whole team is never away at once). Times are
  // wall times in the AGENT's roster tz, the same frame as column O and the
  // tz layer. `!== undefined` so an explicitly EMPTY list is honoured.
  let breaks = base.breaks, perEmployee = false;
  const id = String((empLike && empLike.id) || '').trim();
  if (id) {
    const prop = getBreakSchedules_();
    if (prop && prop.employees && prop.employees[id] !== undefined) {
      breaks = breakListResolve_(prop.employees[id]);
      perEmployee = true;
    }
  }
  if (!ov && !perEmployee) return base;
  return { startMin: ov ? ov.startMin : base.startMin, lengthMin: ov ? ov.lengthMin : base.lengthMin,
           breaks: breaks, breakReminderMin: base.breakReminderMin,
           override: !!ov, perEmployee: perEmployee };
}
/** PURE (Node-pinned): split one shift interval [absStart, absEnd) at its
 *  breaks — `breaks` are {offsetMin, lenMin} RELATIVE to the shift start (an
 *  offset is tz-free: the same instant arithmetic in any zone). Returns the
 *  on-desk sub-intervals; a break outside the shift is ignored, one straddling
 *  an edge is clipped, overlapping breaks union. Before this (operator
 *  2026-09-03) the Coverage planner counted a rep on lunch as PRESENT — a
 *  break was never subtracted anywhere the bands were drawn. */
function coverageSplitAtBreaks_(absStart, absEnd, breaks) {
  if (!(absEnd > absStart)) return [];
  const cuts = (breaks || []).map(function (b) {
    const s = absStart + (Number(b && b.offsetMin) || 0);
    const e = s + (Number(b && b.lenMin) || 0);
    return { s: Math.max(absStart, s), e: Math.min(absEnd, e) };
  }).filter(function (c) { return c.e > c.s; }).sort(function (a, b) { return a.s - b.s; });
  const out = [];
  let cursor = absStart;
  cuts.forEach(function (c) {
    if (c.s > cursor) out.push({ absStart: cursor, absEnd: c.s });
    if (c.e > cursor) cursor = c.e;
  });
  if (absEnd > cursor) out.push({ absStart: cursor, absEnd: absEnd });
  return out;
}
/** PURE (Node-pinned): the break coverage strip. `agents` = [{id, name,
 *  startMin, lengthMin, breaks:[{label, startMin, lenMin}]}] with every minute
 *  ALREADY in the work-anchor frame (minutes from that day's midnight); `opts`
 *  = {slotMin, startHour, endHour}. One slot per `slotMin` across the business
 *  window; an agent is ON SHIFT in a slot when the shift overlaps it and AWAY
 *  when any break overlaps it (a partial overlap counts as away — the desk
 *  sees them gone for part of the slot, and over-reporting absence is the safe
 *  direction for a staffing planner). onDesk = onShift − away. Names travel
 *  because the strip's whole point is "WHO is away at 12:15". */
function breakCoverageSlots_(agents, opts) {
  const slotMin = Math.max(5, Number(opts && opts.slotMin) || 15);
  const startMin = (Number(opts && opts.startHour) || 0) * 60;
  const endMin = (Number(opts && opts.endHour) || 24) * 60;
  const slots = [];
  for (let t = startMin; t < endMin; t += slotMin) {
    const tEnd = t + slotMin;
    let onShift = 0;
    const away = [];
    (agents || []).forEach(function (a) {
      const s0 = Number(a.startMin), e0 = s0 + Number(a.lengthMin);
      if (!(e0 > s0) || !(s0 < tEnd && e0 > t)) return;
      onShift++;
      let gone = null;
      (a.breaks || []).forEach(function (b) {
        const bs = Number(b.startMin), be = bs + Number(b.lenMin);
        if (be > bs && bs < tEnd && be > t && gone === null) gone = String(b.label || 'Break');
      });
      if (gone !== null) away.push({ id: String(a.id || ''), name: String(a.name || ''), label: gone });
    });
    slots.push({ startMin: t, onShift: onShift, onDesk: onShift - away.length, away: away });
  }
  return slots;
}
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
      // Cycle-9 L-2: skip rows with no email — every sibling roster walk
      // (getManagerDashboard, getTeammateStatus, getEmployeesList,
      // computeMissedClockOuts_) does. Coverage assumes presence from the
      // SCHEDULE alone, so an offboarded/placeholder row (name kept, email
      // cleared) silently counted as a full working shift every day,
      // inflating the confirmed band against COVERAGE_MIN_STAFF/GOOD.
      if (!empRosterEmail_(roster[i])) continue;   // F3: one predicate
      const tz = safeTimezone_(String(roster[i][EMP.TIMEZONE] || '').trim() || CONFIG.TIMEZONE);
      // Turn D: per-rep column-O override (INV-127's per-tz-only limitation removed).
      const schedRaw = String(roster[i][EMP.SCHEDULE] || '').trim();
      reps.push({ id: String(roster[i][EMP.ID]).trim(), name: name, tz: tz,
        sched: empShiftSchedule_({ id: String(roster[i][EMP.ID]).trim(), scheduleRaw: schedRaw }, tz) });
    }

    // PTO overlay map {empId: {dateIso: 'Approved'|'Pending'}} over a padded
    // window (a shift's local date can straddle into an adjacent manager day).
    const padStart = addDaysIso_(fromDate, -1);
    const padEnd = addDaysIso_(toDate, 1);
    const ptoMap = {};
    // F4 (cycle 16): the read OUTCOME, not just the data. See the catch.
    let ptoUnavailable = false;
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
    } catch (e) {
      // F4 (cycle 16) — best-effort is right (a coverage grid with no PTO
      // overlay still beats no grid at all), but SILENT was not. With ptoMap
      // empty every rep counts as working, so the hourly strip renders green /
      // adequate on a day half the team is off: this planner exists to flag
      // understaffing, and its failure mode was the single most reassuring
      // answer it can give. Same class as INV-129 — degrade, but say so.
      ptoUnavailable = true;
      console.warn('getCoveragePlan: PTO overlay unavailable — ' + e.message);
    }

    // Holidays for the years spanned.
    const holMap = {};
    const yrs = {}; yrs[fromDate.substring(0, 4)] = true; yrs[toDate.substring(0, 4)] = true;
    Object.keys(yrs).forEach(function (y) {
      try { getCompanyHolidays_(parseInt(y, 10)).forEach(function (h) { if (h && h.date) holMap[h.date] = h.name; }); }
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
        const convMins = timeToMins_(conv.time);
        // A3: timeToMins_ now returns null (not NaN) on an unparseable time.
        // `dayDelta * 1440 + null` would COERCE to 0 and place the rep's shift
        // at midnight — worse than the old NaN, which merely dropped them from
        // the buckets. conv.time comes from convertDateTime_ so this is
        // defensive, but the coercion makes an explicit guard mandatory.
        const absStart = (convMins === null) ? null : dayDelta * 1440 + convMins;
        // Operator 2026-09-03: subtract the rep's breaks (tz + per-agent layers
        // via the one resolver) so an hour where the whole desk is at lunch no
        // longer reads as staffed. Offsets are shift-relative, so no second
        // tz conversion; at hourly granularity a 15-min break inside an hour
        // still leaves the rep "present" that hour — the strip on the Admin
        // card is the 15-min view.
        if (!off && absStart !== null) {
          const cuts = (r.sched.breaks || []).map(function (b) { return { offsetMin: b.startMin - r.sched.startMin, lenMin: b.lenMin }; });
          coverageSplitAtBreaks_(absStart, absStart + r.sched.lengthMin, cuts).forEach(function (iv) {
            intervals.push({ rep: r.id, absStart: iv.absStart, absEnd: iv.absEnd, tentative: tentative });
          });
        }
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
             businessStartHour: bizStart, businessEndHour: bizEnd, weekdaysOnly: weekdaysOnly,
             // F4: additive — a client on an older deploy ignores it and renders
             // exactly as before; the current client renders a warn banner.
             ptoUnavailable: ptoUnavailable };
  } catch (err) { return { error: err.message }; }
}
/** Punctuality report (manager-gated, read-only): per-rep start-time adherence
 *  over a date range — first ClockIn vs the rep's scheduled shift start (per-tz,
 *  CONFIG.SHIFT_SCHEDULE), with a grace window. Also a secondary lunch-adherence
 *  stat (first LunchOut vs scheduled lunch). PHI-free (names + minute deltas).
 *  Only days the rep actually clocked in are counted (PTO/off days excluded). */
/** Design handoff PR 3 (M2) — the per-day STATE of one attendance-record
 *  cell. Pure so the client's day strip and the manager's read of it are
 *  pinned to one rule. A day with a clock-in is graded (on time within the
 *  grace window, else late) EVEN on a holiday or a PTO day — the punch is the
 *  fact. With no clock-in: a holiday reads `holiday`, approved PTO reads
 *  `off`, a weekday reads `nopunch` (an absent weekday drawn as a GAP would
 *  read as an untracked absence — the doc's own rule, INV-187), and a weekend
 *  is not a day in the record at all (`null` — the roster works no Sat/Sun). */
function punctDayState_(hasIn, lateMin, grace, holidayName, ptoType, isWeekend) {
  if (hasIn) return (lateMin > grace) ? 'late' : 'ontime';
  if (holidayName) return 'holiday';
  if (ptoType) return 'off';
  return isWeekend ? null : 'nopunch';
}
/** Design handoff PR 3 (M2) — four consecutive 7-day buckets ending at
 *  `toIso` (oldest first), clipped to `fromIso`. Only graded days (ontime /
 *  late) count; a bucket with none reads `onTimePct: null`, never 0, and a
 *  bucket wholly before the range still appears (with 0 days) so the client's
 *  four bars keep their positions. Pure — `addDays(iso, n)` is injected. */
function punctWeeklyBuckets_(dayDetail, fromIso, toIso, addDays) {
  const out = [];
  for (let w = 3; w >= 0; w--) {
    const bTo = addDays(toIso, -(w * 7));
    let bFrom = addDays(bTo, -6);
    if (bFrom < fromIso) bFrom = fromIso;
    let days = 0, onTime = 0;
    (dayDetail || []).forEach(function (d) {
      if (d.date < bFrom || d.date > bTo) return;
      if (d.state === 'ontime') { days++; onTime++; }
      else if (d.state === 'late') { days++; }
    });
    out.push({ from: bFrom, to: bTo, days: days, onTime: onTime,
      onTimePct: days ? Math.round((onTime / days) * 100) : null });
  }
  return out;
}
function getPunctualityReport(fromDate, toDate) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { error: 'Manager access required.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fromDate)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(toDate)))
      return { error: 'Invalid date (expected yyyy-MM-dd).' };
    if (toDate < fromDate) { const t = fromDate; fromDate = toDate; toDate = t; }
    // PR 3 (M2): the payload is now per-rep PER-DAY, so the range is bounded
    // server-side — the QTR preset is 90 days × roster size, and an unbounded
    // hand-typed range would also double the Timesheet scan for the
    // previous-range comparison below.
    const numDays = daysBetween_(fromDate, toDate) + 1;
    if (numDays > CONFIG.PUNCT_MAX_RANGE_DAYS) return { error: 'Range must be at most ' + CONFIG.PUNCT_MAX_RANGE_DAYS + ' days.' };
    const grace = (CONFIG.PUNCTUALITY_GRACE_MIN != null) ? CONFIG.PUNCTUALITY_GRACE_MIN : 5;
    // The previous EQUIVALENT range (same length, immediately before) — the
    // summary strip's delta and each rep's prevOnTimePct read from it.
    const prevTo = addDaysIso_(fromDate, -1);
    const prevFrom = addDaysIso_(prevTo, -(numDays - 1));

    const roster = getEmployeeRosterRows_();
    const repMap = {};
    for (let i = 1; i < roster.length; i++) {
      const id = String(roster[i][EMP.ID]).trim(); if (!id) continue;
      const name = String(roster[i][EMP.NAME] || '').trim(); if (!name) continue;
      // F3: joins the other eight walks on ONE predicate. Behaviour here is
      // unchanged in practice — an offboarded row has no punches in range, so
      // the `if (!dates.length) return` below already dropped it — but relying
      // on that is relying on a coincidence downstream, not on a rule.
      if (!empRosterEmail_(roster[i])) continue;
      const tz = safeTimezone_(String(roster[i][EMP.TIMEZONE] || '').trim() || CONFIG.TIMEZONE);
      // Turn D: per-rep column-O override (late-start grading uses the rep's REAL shift).
      const sched = empShiftSchedule_({ id: id, scheduleRaw: String(roster[i][EMP.SCHEDULE] || '').trim() }, tz);
      let lunchMin = null;
      (sched.breaks || []).forEach(function (b) { if (/lunch/i.test(b.label)) lunchMin = b.startMin; });
      if (lunchMin === null) {
        let longest = -1;
        (sched.breaks || []).forEach(function (b) { if (b.lenMin > longest) { longest = b.lenMin; lunchMin = b.startMin; } });
      }
      repMap[id] = { id: id, name: name, tz: tz, startMin: sched.startMin, lunchMin: lunchMin, days: {}, prevDays: {} };
    }

    const rows = getAdpSS_().getSheetByName(CONFIG.ADP_TAB).getDataRange().getValues();
    for (let i = 2; i < rows.length; i++) {
      const id = String(rows[i][ADP.EMP_ID]).trim();
      const r = repMap[id]; if (!r) continue;
      const d = normalizeDate_(rows[i][ADP.DATE]);
      if (!d || d < prevFrom || d > toDate) continue;
      const bucket = (d < fromDate) ? r.prevDays : r.days;
      const type = normalizeType_(String(rows[i][ADP.COMMENTS]));
      if (type !== 'ClockIn' && type !== 'LunchOut') continue;
      const mins = timeToMins_(normalizeTime_(rows[i][ADP.TIME]));
      // A3 (cycle 13): SKIP an unparseable time outright. It used to be NaN,
      // and because every NaN comparison is false it (a) never lost the
      // earliest-punch race, so one bad row pinned the day at NaN even when a
      // valid ClockIn existed on it, and (b) fell through the `lateMin > grace`
      // test into the else, scoring the day ON TIME.
      if (mins === null) continue;
      if (!bucket[d]) bucket[d] = {};
      if (type === 'ClockIn') { if (bucket[d].in == null || mins < bucket[d].in) bucket[d].in = mins; }
      else { if (bucket[d].lunch == null || mins < bucket[d].lunch) bucket[d].lunch = mins; }
    }

    // Approved PTO in range (the `off` state) — BEST-EFFORT, and the outcome
    // is REPORTED (the cycle-16 F4 rule): with the overlay missing an absent
    // day would read `nopunch`, which is the less reassuring direction, but
    // the client still needs to say the record is incomplete.
    const ptoMap = {};
    let ptoUnavailable = false;
    try {
      const trows = getOrCreateTimeOffSheet_().getDataRange().getValues();
      for (let i = 1; i < trows.length; i++) {
        const eid = String(trows[i][TO.EMP_ID]).trim();
        const dt = normalizeDate_(trows[i][TO.DATE]);
        if (!eid || !dt || dt < fromDate || dt > toDate) continue;
        if (String(trows[i][TO.STATUS] || '').trim().toLowerCase() !== 'approved') continue;
        if (!ptoMap[eid]) ptoMap[eid] = {};
        ptoMap[eid][dt] = String(trows[i][TO.TYPE] || 'Time off').trim() || 'Time off';
      }
    } catch (e) {
      ptoUnavailable = true;
      console.warn('getPunctualityReport: PTO overlay unavailable — ' + e.message);
    }
    // Holidays from the SAME source the Coverage grid reads.
    const holMap = {};
    const yrs = {}; yrs[fromDate.substring(0, 4)] = true; yrs[toDate.substring(0, 4)] = true;
    Object.keys(yrs).forEach(function (y) {
      try { getCompanyHolidays_(parseInt(y, 10)).forEach(function (h) { if (h && h.date) holMap[h.date] = h.name; }); }
      catch (e) { /* ignore */ }
    });

    const reps = [];
    Object.keys(repMap).forEach(function (id) {
      const r = repMap[id];
      const dates = Object.keys(r.days).filter(function (d) { return r.days[d].in != null; });
      if (!dates.length) return;
      let onTime = 0, late = 0, totLate = 0, worst = 0, worstDate = null, lunchDays = 0, lunchOnTime = 0;
      dates.forEach(function (d) {
        const lateMin = r.days[d].in - r.startMin;
        if (lateMin > grace) { late++; totLate += lateMin; if (lateMin > worst) { worst = lateMin; worstDate = d; } }
        else onTime++;
        if (r.lunchMin != null && r.days[d].lunch != null) {
          lunchDays++;
          if (r.days[d].lunch <= r.lunchMin + grace) lunchOnTime++;   // early/within-grace lunch is fine
        }
      });
      // The previous equivalent range — same grading, no day detail.
      let prevOn = 0, prevN = 0;
      Object.keys(r.prevDays).forEach(function (d) {
        if (r.prevDays[d].in == null) return;
        prevN++;
        if ((r.prevDays[d].in - r.startMin) <= grace) prevOn++;
      });
      // M2 — the attendance record, one entry per day in range (the client's
      // day strip, late-day chips, timeline and weekly bars all draw from it).
      const dayDetail = [];
      for (let k = 0; k < numDays; k++) {
        const dIso = addDaysIso_(fromDate, k);
        const dow = new Date(dIso + 'T12:00:00Z').getUTCDay();
        const hasIn = !!(r.days[dIso] && r.days[dIso].in != null);
        const lateMin = hasIn ? (r.days[dIso].in - r.startMin) : null;
        const ptoType = (ptoMap[id] && ptoMap[id][dIso]) || null;
        const state = punctDayState_(hasIn, lateMin, grace, holMap[dIso] || null, ptoType, dow === 0 || dow === 6);
        if (!state) continue;
        dayDetail.push({ date: dIso, schedStartMin: r.startMin, actualMin: hasIn ? r.days[dIso].in : null,
          lateMin: (hasIn && lateMin > grace) ? lateMin : (hasIn ? 0 : null), state: state,
          ptoType: ptoType, holidayName: holMap[dIso] || null });
      }
      reps.push({
        id: r.id, name: r.name, tz: r.tz, startMin: r.startMin,
        days: dates.length, onTime: onTime, late: late,
        onTimePct: Math.round((onTime / dates.length) * 100),
        avgLate: late ? Math.round(totLate / late) : 0,
        worst: worst,
        lunchOnTimePct: lunchDays ? Math.round((lunchOnTime / lunchDays) * 100) : null,
        // PR 3 (M2) — ADDITIVE. `days` stays the day COUNT the client + fixture
        // consume; the per-day array is `dayDetail` (never rename `days`).
        worstDate: worstDate,
        prevDays: prevN, prevOnTime: prevOn,
        prevOnTimePct: prevN ? Math.round((prevOn / prevN) * 100) : null,
        weekly: punctWeeklyBuckets_(dayDetail, fromDate, toDate, addDaysIso_),
        dayDetail: dayDetail,
      });
    });
    reps.sort(function (a, b) { return a.onTimePct - b.onTimePct || b.late - a.late; });   // least punctual first
    return { from: fromDate, to: toDate, grace: grace, reps: reps,
             prevFrom: prevFrom, prevTo: prevTo, ptoUnavailable: ptoUnavailable };
  } catch (err) { return { error: err.message }; }
}
/** The caller's resolved department memberships (canonical names), validated
 *  against the LIVE department map. Empty for reps not on a dept desk. */
function empDepartments_(emp) {
  if (!emp || !emp.departmentsRaw) return [];
  return drParseDepartments_(emp.departmentsRaw, Object.keys(getDepartmentEmails_() || {}));
}
/** Every roster rep's shift + breaks in the WORK-ANCHOR frame (minutes from
 *  that day's midnight), resolved through empShiftSchedule_ under `prop` (a
 *  sanitized draft, or null for the stored property). Conversion goes through
 *  convertDateTime_ on `dateIso` (a DST-correct instant, the getCoveragePlan
 *  pattern); a rep whose conversion fails is NAMED in `skipped`, never dropped
 *  silently (INV-187). */
function breakCoverageAgents_(prop, dateIso) {
  const anchor = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
  const rows = getEmployeeRosterRows_();
  const agents = [], skipped = [];
  const hhmm = function (m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0') + ':00'; };
  withBreakSchedulesProp_(prop, function () {
    for (let i = 1; i < rows.length; i++) {
      if (!empRosterEmail_(rows[i])) continue;   // F3: one predicate
      const id = String(rows[i][EMP.ID] || '').trim();
      const name = String(rows[i][EMP.NAME] || '').trim();
      if (!id || !name) continue;
      const tz = safeTimezone_(String(rows[i][EMP.TIMEZONE] || '').trim() || CONFIG.TIMEZONE);
      const sched = empShiftSchedule_({ id: id, scheduleRaw: rows[i][EMP.SCHEDULE] }, tz);
      const conv = convertDateTime_(dateIso, hhmm(sched.startMin), tz, anchor);
      const startMin = timeToMins_(conv.time);
      if (startMin === null) { skipped.push(name); continue; }
      const dayDelta = daysBetween_(dateIso, conv.date);
      const absStart = dayDelta * 1440 + startMin;
      agents.push({
        id: id, name: name, tz: tz, startMin: absStart, lengthMin: sched.lengthMin,
        perEmployee: !!sched.perEmployee,
        breaks: (sched.breaks || []).map(function (b) {
          return { label: b.label, startMin: absStart + (b.startMin - sched.startMin), lenMin: b.lenMin };
        }),
      });
    }
  });
  return { agents: agents, skipped: skipped, anchor: anchor };
}
/** Break coverage planner — ADMIN-gated (INV-136: it lives on the Admin card
 *  and previews an unsaved admin draft), READ-ONLY, bare `{error}` read shape.
 *  `payload.draft` (optional) = the editor's unsaved {schedules, employees,
 *  reminderMin} run through breakSchedSanitize_ — the SAME lenient read the
 *  stored property gets, so what the strip previews is exactly what a save
 *  would store; absent = the stored property. `payload.withVolume` adds the
 *  demand layer (the client fetches it ONCE per card open; a draft keystroke
 *  refresh leaves it off). Nothing here writes. */
function getBreakCoverage(payload) {
  const emp = getEmployeeInfo_();
  if (!emp) return { error: 'Not authorized.' };
  if (!emp.isAdmin) return { error: 'Admin access required.' };
  try {
    const p = payload || {};
    const draft = (p.draft && typeof p.draft === 'object' && !Array.isArray(p.draft)) ? breakSchedSanitize_(p.draft) : null;
    const anchor = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
    const dateIso = Utilities.formatDate(new Date(), anchor, 'yyyy-MM-dd');
    const slotMin = Math.max(5, Number(CONFIG.BREAK_COVERAGE_SLOT_MIN) || 15);
    const startHour = (CONFIG.COVERAGE_BUSINESS_START_HOUR != null) ? CONFIG.COVERAGE_BUSINESS_START_HOUR : 8;
    const endHour = (CONFIG.COVERAGE_BUSINESS_END_HOUR != null) ? CONFIG.COVERAGE_BUSINESS_END_HOUR : 17;
    const minStaff = (CONFIG.COVERAGE_MIN_STAFF != null) ? CONFIG.COVERAGE_MIN_STAFF : 2;
    const goodStaff = (CONFIG.COVERAGE_STAFF_GOOD != null) ? CONFIG.COVERAGE_STAFF_GOOD : minStaff;
    const built = breakCoverageAgents_(draft, dateIso);
    const slots = breakCoverageSlots_(built.agents, { slotMin: slotMin, startHour: startHour, endHour: endHour });
    const volume = p.withVolume ? getCdrInboundVolume_({ slotMin: slotMin, startHour: startHour, endHour: endHour }) : null;
    return {
      workAnchorTz: anchor, date: dateIso, slotMin: slotMin, startHour: startHour, endHour: endHour,
      minStaff: minStaff, goodStaff: goodStaff, draft: !!draft,
      agents: built.agents.length, perEmployee: built.agents.filter(function (a) { return a.perEmployee; }).length,
      skipped: built.skipped, slots: slots, volume: volume,
    };
  } catch (err) { return { error: err.message }; }
}
function breakSchedulesAdminView_() {
  const cfg = CONFIG.SHIFT_SCHEDULE || {};
  const prop = getBreakSchedules_();
  const keySet = { DEFAULT: true };
  Object.keys(cfg.BY_TIMEZONE || {}).forEach(function (k) { keySet[k] = true; });
  if (prop) Object.keys(prop.schedules).forEach(function (k) { keySet[k] = true; });
  const rosterTz = [];
  const rosterMap = {};   // id → { id, name, timezone, scheduleRaw } (INV-183-included rows only)
  try {
    const rows = getEmployeeRosterRows_();
    for (let i = 1; i < rows.length; i++) {
      if (!empRosterEmail_(rows[i])) continue;   // INV-183: one inclusion predicate
      const tz = String(rows[i][EMP.TIMEZONE] || '').trim();
      if (tz && rosterTz.indexOf(tz) < 0) rosterTz.push(tz);
      const id = String(rows[i][EMP.ID] || '').trim();
      if (id) rosterMap[id] = { id: id, name: String(rows[i][EMP.NAME] || '').trim(),
        timezone: tz || CONFIG.TIMEZONE, scheduleRaw: String(rows[i][EMP.SCHEDULE] || '').trim() };
    }
  } catch (e) { /* best-effort */ }
  const hm = function (m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); };
  const workAnchorTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
  // Per-employee sections (operator 2026-09-02): every agent with a custom
  // entry, resolved through the SAME resolver the Clock chip and reminders
  // use, so the editor shows what ships. An entry whose id is no longer on
  // the roster (offboarded, or a typo'd hand edit) is listed as such so it
  // can be removed — never silently hidden. `tzMismatch` flags a roster tz
  // that differs from the CST work anchor (the profile-vs-anchor class):
  // the times shown are in THAT zone, which is the trap this week taught.
  const employees = Object.keys((prop && prop.employees) || {}).map(function (id) {
    const r = rosterMap[id];
    const tz = r ? safeTimezone_(r.timezone) : workAnchorTz;
    const eff = empShiftSchedule_({ id: id, scheduleRaw: r ? r.scheduleRaw : '' }, tz);
    return { id: id, name: r ? r.name : '', onRoster: !!r, timezone: tz,
      tzMismatch: !r ? false : !tzEquivalent_(tz, workAnchorTz),
      breaks: eff.breaks.map(function (b) { return { label: b.label, start: hm(b.startMin), len: b.lenMin }; }) };
  }).sort(function (a, b) { return (a.name || a.id).localeCompare(b.name || b.id); });
  const roster = Object.keys(rosterMap).map(function (id) {
    return { id: id, name: rosterMap[id].name, timezone: rosterMap[id].timezone,
      tzMismatch: !tzEquivalent_(safeTimezone_(rosterMap[id].timezone), workAnchorTz) };
  }).sort(function (a, b) { return a.name.localeCompare(b.name); });
  const schedules = Object.keys(keySet).sort(function (a, b) {
    return a === 'DEFAULT' ? -1 : (b === 'DEFAULT' ? 1 : a.localeCompare(b));
  }).map(function (key) {
    // 'DEFAULT' is not a timezone — resolve it via a tz no BY_TIMEZONE/property
    // key can match (sanitized property keys are trimmed; a leading space can
    // never survive), which lands on the DEFAULT entries at every layer.
    // Routed through the INV-149 resolver — a null empLike has no column-O
    // override, so this IS the tz-level schedule.
    const eff = empShiftSchedule_(null, key === 'DEFAULT' ? ' none' : key);
    return {
      key: key,
      custom: !!(prop && prop.schedules[key] !== undefined),
      breaks: eff.breaks.map(function (b) { return { label: b.label, start: hm(b.startMin), len: b.lenMin }; }),
    };
  });
  return {
    schedules: schedules,
    employees: employees,
    roster: roster,
    workAnchorTz: workAnchorTz,
    reminderMin: (prop && prop.reminderMin) || parseInt(cfg.BREAK_REMINDER_MINUTES, 10) || 10,
    configReminderMin: parseInt(cfg.BREAK_REMINDER_MINUTES, 10) || 10,
    rosterTimezones: rosterTz.sort(),
  };
}
/** Strict per-break validation for saveBreakSchedules — names the first
 *  problem (the editor should say what is wrong, not silently drop).
 *  Everything it accepts round-trips through breakListSanitize_ unchanged. */
function breakListValidate_(arr, label) {
  if (!Array.isArray(arr)) return { error: 'Breaks for "' + label + '" must be a list.' };
  if (arr.length > 10) return { error: 'Too many breaks for "' + label + '" (max 10).' };
  const clean = [];
  for (let j = 0; j < arr.length; j++) {
    const b = arr[j] || {};
    const start = String(b.start || '').trim();
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(start)) {
      return { error: 'Break start time for "' + label + '" must be H:mm (got "' + start + '").' };
    }
    const len = parseInt(b.len, 10);
    if (!(len >= 1 && len <= 240)) {
      return { error: 'Break length for "' + label + '" must be 1–240 minutes.' };
    }
    clean.push({ label: String(b.label || '').trim().substring(0, 40) || 'Break', start: start, len: len });
  }
  return { breaks: clean };
}
/** Admin-gated (INV-136 / INV-57 family): persist the break-schedule overrides
 *  to Script Property SHIFT_BREAK_SCHEDULES (operator 2026-08-27 — "where does
 *  the break schedule information go?": previously ONLY editable in
 *  CONFIG.SHIFT_SCHEDULE, i.e. a redeploy). Payload:
 *  { reminderMin, schedules: { DEFAULT|<IANA tz>: [{label,start,len}] },
 *    employees?: { <rosterId>: [{label,start,len}] } } (per-agent layer, 2026-09-02).
 *  STRICT validation with named errors (an editor should say what is wrong,
 *  not silently drop — the saveSpanishInboxMembers posture); everything
 *  accepted here round-trips through breakSchedSanitize_ unchanged (pinned),
 *  so the read side can never disagree with a save. An EMPTY breaks array is
 *  valid ("no breaks for this key" — e.g. turning reminders off for one tz);
 *  a key ABSENT from the map inherits (tz → DEFAULT → CONFIG). Saving zero
 *  keys at the CONFIG reminder DELETES the property (the umsTheme posture: an
 *  untouched deployment and a deliberately-reset one look identical). Writes
 *  an AdminConfigChange audit row; resets the per-execution memo. */
function saveBreakSchedules(payload) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { success: false, error: 'Admin access required.' };
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { success: false, error: 'Expected a break-schedule payload.' };
    }
    const src = payload.schedules;
    if (!src || typeof src !== 'object' || Array.isArray(src)) {
      return { success: false, error: 'Expected a schedules map.' };
    }
    const keys = Object.keys(src);
    if (keys.length > 20) return { success: false, error: 'Too many timezone schedules (max 20).' };
    const schedules = {};
    for (let i = 0; i < keys.length; i++) {
      const key = String(keys[i]).trim();
      if (key !== 'DEFAULT' && !/^[A-Za-z]+(\/[A-Za-z0-9_\-+]+)+$/.test(key)) {
        return { success: false, error: 'Not a valid timezone key: "' + key + '" — use DEFAULT or an IANA id like America/Chicago.' };
      }
      const v = breakListValidate_(src[keys[i]], key);
      if (v.error) return { success: false, error: v.error };
      schedules[key] = v.breaks;   // EMPTY is valid — "no breaks for this key"
    }
    // Per-employee layer (operator 2026-09-02): { employees: { <id>: [...] } },
    // optional (absent = none). Keys are ROSTER IDS and must exist on the
    // roster — a typo'd id would be a silent no-op forever, so it is refused
    // by name; an OFFBOARDED id (name kept, email cleared) still resolves,
    // because the editor lists it as off-roster precisely so it can be
    // removed. An explicitly EMPTY list = "no breaks for this agent".
    const esrc = payload.employees;
    const employees = {};
    if (esrc !== undefined && esrc !== null) {
      if (typeof esrc !== 'object' || Array.isArray(esrc)) return { success: false, error: 'Expected an employees map.' };
      const ekeys = Object.keys(esrc);
      if (ekeys.length > BREAK_EMP_MAX_KEYS) return { success: false, error: 'Too many per-agent schedules (max ' + BREAK_EMP_MAX_KEYS + ').' };
      let known = null;
      if (ekeys.length) {
        known = {};
        const rows = getEmployeeRosterRows_();
        for (let i = 1; i < rows.length; i++) {
          const rid = String(rows[i][EMP.ID] || '').trim();
          if (rid) known[rid] = String(rows[i][EMP.NAME] || '').trim();
        }
      }
      for (let i = 0; i < ekeys.length; i++) {
        const id = String(ekeys[i]).trim();
        if (!BREAK_EMP_KEY_RE.test(id)) return { success: false, error: 'Not a valid employee id: "' + id + '".' };
        if (!(id in known)) return { success: false, error: 'Employee id "' + id + '" is not on the roster.' };
        const v = breakListValidate_(esrc[ekeys[i]], known[id] || id);
        if (v.error) return { success: false, error: v.error };
        employees[id] = v.breaks;
      }
    }
    const rm = parseInt(payload.reminderMin, 10);
    if (!(rm >= 1 && rm <= 120)) return { success: false, error: 'Reminder lead must be 1–120 minutes.' };
    const props = PropertiesService.getScriptProperties();
    const configReminder = parseInt((CONFIG.SHIFT_SCHEDULE || {}).BREAK_REMINDER_MINUTES, 10) || 10;
    const empCount = Object.keys(employees).length;
    if (Object.keys(schedules).length === 0 && empCount === 0 && rm === configReminder) {
      props.deleteProperty('SHIFT_BREAK_SCHEDULES');
    } else {
      const blob = { schedules: schedules };
      if (empCount > 0) blob.employees = employees;   // absent when empty — a pre-existing blob stays byte-identical
      blob.reminderMin = rm;                          // key order mirrors breakSchedSanitize_ so read ≡ write byte-for-byte
      propSetBounded_('SHIFT_BREAK_SCHEDULES', JSON.stringify(blob), { hint: 'remove a customized section or per-agent schedule' });
    }
    _breakSchedulesCache = undefined;   // re-read within this execution
    writeAuditLog_(emp, 'AdminConfigChange', '', '', false, 0,
      'Updated break schedules (' + Object.keys(schedules).length + ' schedule(s), ' + empCount + ' per-agent, reminder ' + rm + 'm)', emp.email);
    return { success: true, breakSchedules: breakSchedulesAdminView_() };
  } catch (err) { return { success: false, error: err.message }; }
}
// M-1 (cycle 10): returns the LAST matching row, not the first. When duplicate
// same-(emp, date, type) rows exist (pre-guard stale-window double punches,
// direct sheet edits), the last row is the one a manager was shown — so an
// update MUST target it or they edit a row different from the one displayed.
// Single-row days (the normal case) are unaffected. A4 note: managerSaveDay no
// longer routes through here (it plans against row INDICES, because a day can
// now carry N break pairs and this returns one row per TYPE); the remaining
// caller is the adjust-queue writer, which is single-punch by construction.
function findExistingPunch_(empId, date, punchType) {
  const sheet = getAdpSS_().getSheetByName(CONFIG.ADP_TAB);
  const rows = sheet.getDataRange().getValues();
  let found = null;
  for (let i = 2; i < rows.length; i++) {
    if (String(rows[i][ADP.EMP_ID]).trim() !== empId) continue;
    if (normalizeDate_(rows[i][ADP.DATE]) !== date) continue;
    if (normalizeType_(String(rows[i][ADP.COMMENTS])) !== punchType) continue;
    // `time` is additive (B3, 2026-09-01) — the resume path needs the existing
    // ClockOut's stamp to validate the resume time against it and to state the
    // unpaid gap. Every prior caller reads only sheet/rowIndex.
    found = { sheet, rowIndex: i + 1, time: normalizeTime_(rows[i][ADP.TIME]) };
  }
  return found;
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
        callNotesSheetId: cnEnrolledSheetId_(rows[i]) || null,
        payCycle: cycle, payAnchor: anchor, isManager, isAdmin: empIsAdmin_(email, isManager), timezone, ptoEnabled,
        annualLeave: parseFloat(rows[i][EMP.ANNUAL_LEAVE]) || 0,
        sickLeave:   parseFloat(rows[i][EMP.SICK_LEAVE])   || 0,
        managerEmail: String(rows[i][EMP.MANAGER_EMAIL] || '').toLowerCase().trim(),
        departmentsRaw: String(rows[i][EMP.DEPARTMENTS] || '').trim(),   // parsed lazily via empDepartments_
        scheduleRaw: String(rows[i][EMP.SCHEDULE] || '').trim(),          // per-rep shift override (Turn D)
        ptoAccrualPerBasis: empPtoAccrual_(rows[i][EMP.PTO_ACCRUAL]),   // column Q — PTO hours per basis hours worked (INV-194)
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
      callNotesSheetId: cnEnrolledSheetId_(rows[i]) || null,
      annualLeave: parseFloat(rows[i][EMP.ANNUAL_LEAVE]) || 0,
      sickLeave:   parseFloat(rows[i][EMP.SICK_LEAVE])   || 0,
      ptoEnabled,
      managerEmail: String(rows[i][EMP.MANAGER_EMAIL] || '').toLowerCase().trim(),
      departmentsRaw: String(rows[i][EMP.DEPARTMENTS] || '').trim(),
      scheduleRaw: String(rows[i][EMP.SCHEDULE] || '').trim(),
      ptoAccrualPerBasis: empPtoAccrual_(rows[i][EMP.PTO_ACCRUAL]),
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
  // C17 batch-6: derive the state from the last RECOGNIZED punch type. A
  // hand-edited/garbage COMMENTS value is not a state — treating it as one
  // fell through to ['Adjust'] and, via the INV-155 live sequence guard,
  // locked the rep out of live punching for the rest of the day.
  let last = null;
  for (let i = punches.length - 1; i >= 0; i--) {
    if (PUNCH_LABELS_.indexOf(punches[i].type) >= 0) { last = punches[i].type; break; }
  }
  if (!last) return ['ClockIn','Adjust'];
  if (last === 'ClockOut') return ['Adjust'];
  if (last === 'ClockIn' || last === 'LunchIn') return ['LunchOut','ClockOut','Adjust'];
  if (last === 'LunchOut') return ['LunchIn','ClockOut','Adjust'];
  return ['Adjust'];
}
function appendToAdpSheet_(emp, date, time, dir, commentValue) {
  getAdpSS_().getSheetByName(CONFIG.ADP_TAB)
    .appendRow(sheetSafeRow_([emp.id, emp.name, date, time, dir, 'None', 'Missing punch', 'SUBMIT', commentValue]));
}
function openPersonalSs_(sheetId) {
  if (!_personalSsCache[sheetId]) _personalSsCache[sheetId] = SpreadsheetApp.openById(sheetId);
  return _personalSsCache[sheetId];
}
function writeToEmployeeSheet_(emp, date, time, dir, punchType) {
  const ROW_LABEL_MAP = { ClockIn:'Clock In', LunchOut:'Lunch Out', LunchIn:'Lunch Return', ClockOut:'Clock Out' };
  try {
    const ss        = openPersonalSs_(emp.sheetId);
    const empTz     = empTz_(emp);
    const dateObj   = Utilities.parseDate(date + 'T12:00:00', empTz, "yyyy-MM-dd'T'HH:mm:ss");
    const monthName = Utilities.formatDate(dateObj, empTz, 'MMMM yyyy');
    const sheet     = ss.getSheetByName(monthName);
    if (!sheet) return;
    const dayNum = parseInt(Utilities.formatDate(dateObj, empTz, 'd'), 10);
    const data   = sheet.getDataRange().getValues();
    const rowIdx = data.findIndex(r => String(r[0]).trim() === ROW_LABEL_MAP[punchType]);
    const colIdx = data[0].findIndex(h => Number(h) === dayNum);
    if (rowIdx !== -1 && colIdx !== -1) sheet.getRange(rowIdx + 1, colIdx + 1).setValue(sheetSafe_(time));
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
    const ss        = openPersonalSs_(emp.sheetId);
    const empTz     = empTz_(emp);
    const dateObj   = Utilities.parseDate(date + 'T12:00:00', empTz, "yyyy-MM-dd'T'HH:mm:ss");
    const monthName = Utilities.formatDate(dateObj, empTz, 'MMMM yyyy');
    const sheet     = ss.getSheetByName(monthName);
    if (!sheet) return;
    const dayNum = parseInt(Utilities.formatDate(dateObj, empTz, 'd'), 10);
    const data   = sheet.getDataRange().getValues();
    const rowIdx = data.findIndex(r => String(r[0]).trim() === ROW_LABEL_MAP[punchType]);
    const colIdx = data[0].findIndex(h => Number(h) === dayNum);
    if (rowIdx !== -1 && colIdx !== -1) sheet.getRange(rowIdx + 1, colIdx + 1).setValue(sheetSafe_(''));
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
    sheet.appendRow(sheetSafeRow_(['EmployeeId','EmployeeName','Date','Type','Notes','Status','SubmittedAt']));
    sheet.setFrozenRows(1);
  }
  return sheet;
}
function getOrCreatePunchAdjustSheet_() {
  const ss = getAdpSS_();
  let sheet = ss.getSheetByName(CONFIG.PUNCH_ADJUST_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.PUNCH_ADJUST_TAB);
    sheet.appendRow(sheetSafeRow_(PAR_HEADERS));
    sheet.setFrozenRows(1);
    return sheet;
  }
  // Self-heal a short header once (the getOrCreateEmpDocSheet_ / KB pattern):
  // an existing tab predates the trailing Action column.
  try {
    if (sheet.getLastColumn() < PAR_HEADERS.length) {
      sheet.getRange(1, 1, 1, PAR_HEADERS.length).setValues(sheetSafeRows_([PAR_HEADERS]));
    }
  } catch (e) { /* best-effort — a read still works, ACTION just reads '' */ }
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
  let notifyAfter = null;
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
      // B3: 'resume' reopens a day the rep has already clocked out of. It is
      // NOT a punch write — on approval the trailing ClockOut is CONVERTED to a
      // break and the requested time becomes the break's end, so the hours the
      // rep was away are unpaid. Any other value reads as the ordinary 'set'.
      const action = String(r.action || '').trim().toLowerCase() === 'resume' ? 'resume' : 'set';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false, error: label + ': invalid date.' };
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { success: false, error: label + ': invalid time (expected HH:mm).' };
      if (PUNCH_LABELS_.indexOf(punchType) < 0) return { success: false, error: label + ': invalid punch type.' };
      if (action === 'resume' && punchType !== 'ClockOut') {
        return { success: false, error: label + ': a resume request converts the Clock Out — it cannot target ' + punchType + '.' };
      }
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
      clean.push({ date: date, time: time, punchType: punchType, reason: reason, action: action });
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
    // B3: a resume request is only meaningful against a REAL trailing
    // ClockOut, and the resume time must come after it — otherwise approval
    // would convert a punch that is not there, or fabricate a break that ends
    // before it began. Checked at submit AND re-checked at approval (the day
    // can be edited while the request waits).
    for (let i = 0; i < clean.length; i++) {
      if (clean[i].action !== 'resume') continue;
      const co = findExistingPunch_(emp.id, clean[i].date, 'ClockOut');
      if (!co) {
        return { success: false, error: 'Adjustment #' + (i + 1) +
          ': there is no Clock Out on ' + clean[i].date + ' to resume from.' };
      }
      const coHm = String(co.time || '').substring(0, 5);
      if (!(clean[i].time > coHm)) {
        return { success: false, error: 'Adjustment #' + (i + 1) +
          ': the resume time must be after the Clock Out (' + coHm + ').' };
      }
      clean[i].clockOutTime = coHm;
    }
    const sheet = getOrCreatePunchAdjustSheet_();
    const existing = sheet.getDataRange().getValues();
    // T3 (cycle 22): a Clock Out for a day whose RESUME is still pending is the
    // rep's FINISH time for that resumed day — the one thing they cannot punch
    // live once the day has ended, and the dup guard below used to refuse it,
    // so an approval that landed the next day left the day with no Clock Out
    // at all (INCOMPLETE, 0 h). It is attached to the resume request instead of
    // queued beside it: two requests could be approved in either order, and a
    // Clock Out approved first would move the stamp the resume converts.
    const attach = {};   // clean index -> sheet row (1-based) of the pending resume
    for (let i = 1; i < existing.length; i++) {
      if (String(existing[i][PAR.EMP_ID]).trim() !== emp.id) continue;
      if (String(existing[i][PAR.STATUS]).trim().toLowerCase() !== 'pending') continue;
      const key = normalizeDate_(existing[i][PAR.DATE]) + '|' + String(existing[i][PAR.PUNCH_TYPE]).trim();
      if (batchSeen[key]) {
        const isResume = String(existing[i][PAR.ACTION] || '').trim().toLowerCase() === 'resume';
        const ci = clean.findIndex(function (c) { return c.date + '|' + c.punchType === key; });
        if (isResume && ci >= 0 && clean[ci].action === 'set' && clean[ci].punchType === 'ClockOut') {
          const backAt = normalizeTime_(existing[i][PAR.REQ_TIME]).trim().substring(0, 5);
          if (!(clean[ci].time > backAt)) {
            return { success: false, error: 'Your finish time must be after the time you resumed (' + backAt + ').' };
          }
          attach[ci] = i + 1;
          continue;
        }
        return { success: false, error: 'You already have a pending ' +
          String(existing[i][PAR.PUNCH_TYPE]).trim() + ' adjustment for ' +
          normalizeDate_(existing[i][PAR.DATE]) + ' awaiting approval.' };
      }
    }
    const submittedAt = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
    let attached = 0;
    clean.forEach(function (c, ci) {
      if (attach[ci]) {
        sheet.getRange(attach[ci], PAR.END_TIME + 1).setValue(sheetSafe_(c.time));
        attached++;
        return;
      }
      sheet.appendRow(sheetSafeRow_([Utilities.getUuid(), emp.id, emp.name, c.date, c.punchType, c.time, c.reason, 'Pending', submittedAt, c.action, '']));
    });
    writeAuditLog_(emp, 'PunchAdjustRequest', clean[0].date, '', false, 0,
      'requested ' + clean.length + ' punch adjustment(s) pending approval');
    // B2: tell the managers. Deferred past releaseLock (M-7) — a MailApp send
    // inside the ONE project lock stalls every rep's punch.
    notifyAfter = function () { notifyManagersOfAdjustRequests_(emp, clean); };
    return { success: true, count: clean.length, attachedToResume: attached };
  } catch (err) { return { success: false, error: err.message }; }
  finally {
    lock.releaseLock();
    if (notifyAfter) { try { notifyAfter(); } catch (e) { console.warn('post-lock notify failed: ' + e.message); } }
  }
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
        action: String(rows[i][PAR.ACTION] || '').trim().toLowerCase() === 'resume' ? 'resume' : 'set',
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
        // B3: the manager must see WHICH kind of request this is — a resume
        // converts an existing clock-out and leaves an unpaid gap, which is a
        // materially different decision from adding a missed punch.
        action: String(rows[i][PAR.ACTION] || '').trim().toLowerCase() === 'resume' ? 'resume' : 'set',
        // T3: a resume's filed finish ('' when none) — the manager sees whether
        // approving closes the day or leaves it for the rep to clock out.
        endTime: parEndTime_(rows[i]),
        submittedAt: normalizeAuditTs_(rows[i][PAR.SUBMITTED_AT]),
      });
    }
    out.sort(function (a, b) { return (a.date + a.empName).localeCompare(b.date + b.empName); });
    return { requests: out };
  } catch (err) { return { error: err.message }; }
}
/** Manager-gated, locked. Approve → writes the ADJ-{punchType} punch for the
 *  target emp and marks Approved. Deny → marks Denied (no punch). Transition-
 *  guarded: only acts on a Pending row (so a double-click can't re-approve).
 *  The single-id public wrapper below keeps its {success, error} shape. */
function updatePunchAdjustStatus(reqId, newStatus) {
  const r = punchAdjustDecideAll_([reqId], newStatus);
  if (r.results && r.results.length === 1) {
    return r.results[0].success ? { success: true } : { success: false, error: r.results[0].error };
  }
  return { success: false, error: r.error || 'Action failed.' };
}
/** Operator 2026-09-03: multi-select approve/deny. ONE lock, ONE queue read,
 *  ONE Timesheet index per target employee (the C17-9 ctx) instead of a full
 *  Timesheet read per request, and every decision email deferred past the
 *  lock. Per-id outcomes ride back so the client can remove exactly the rows
 *  that landed and restore the ones that did not. */
function updatePunchAdjustStatusBulk(reqIds, newStatus) {
  return punchAdjustDecideAll_(reqIds, newStatus);
}
function punchAdjustDecideAll_(reqIds, newStatus) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  const later = [];                                            // post-lock notifications (M-7)
  let notifyAfter = null;
  const results = [];
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isManager) return { success: false, error: 'Manager access required.' };
    if (newStatus !== 'Approved' && newStatus !== 'Denied') return { success: false, error: 'Invalid status.' };
    const ids = [];
    (Array.isArray(reqIds) ? reqIds : [reqIds]).forEach((x) => {
      const id = String(x || '').trim();
      if (id && ids.indexOf(id) < 0) ids.push(id);
    });
    if (!ids.length) return { success: false, error: 'Missing request id.' };
    if (ids.length > PUNCH_ADJUST_BULK_MAX) return { success: false, error: 'At most ' + PUNCH_ADJUST_BULK_MAX + ' requests per batch.' };
    const sheet = getOrCreatePunchAdjustSheet_();
    const rows = sheet.getDataRange().getValues();
    const rowById = {};
    for (let i = 1; i < rows.length; i++) rowById[String(rows[i][PAR.REQ_ID]).trim()] = i;
    // One Timesheet index per target employee, over the dates this batch
    // touches — the adjust writer then never re-reads the sheet per request.
    const datesByEmp = {};
    ids.forEach((id) => {
      const i = rowById[id];
      if (i === undefined) return;
      const e = String(rows[i][PAR.EMP_ID]).trim();
      (datesByEmp[e] || (datesByEmp[e] = {}))[normalizeDate_(rows[i][PAR.DATE])] = true;
    });
    const ctxByEmp = {};
    const ctxFor = (empId) => ctxByEmp[empId] || (ctxByEmp[empId] = buildAdjustPunchIndex_(empId, datesByEmp[empId] || {}));
    const fail = (id, error) => { results.push({ reqId: id, success: false, error: error }); };
    ids.forEach((id) => {
      const i = rowById[id];
      if (i === undefined) { fail(id, 'Request not found.'); return; }
      const status = String(rows[i][PAR.STATUS]).trim();
      if (status.toLowerCase() !== 'pending') { fail(id, 'This request is no longer pending.'); return; }
      const empId = String(rows[i][PAR.EMP_ID]).trim();
      const empName = String(rows[i][PAR.EMP_NAME]).trim();
      const date = normalizeDate_(rows[i][PAR.DATE]);
      const punchType = String(rows[i][PAR.PUNCH_TYPE]).trim();
      const reqTime = normalizeTime_(rows[i][PAR.REQ_TIME]).trim().substring(0, 5);
      const reason = String(rows[i][PAR.REASON] || '');
      // B3: '' on a legacy row means the ordinary punch write.
      const action = String(rows[i][PAR.ACTION] || '').trim().toLowerCase() === 'resume' ? 'resume' : 'set';
      if (newStatus === 'Approved') {
        const targetEmp = lookupEmployeeById_(empId);
        if (!targetEmp) { fail(id, 'Employee not found.'); return; }
        // Re-validate the adjust window at APPROVAL time — the submit-time
        // check (INV-106) doesn't cover a request that sat in the queue past
        // the window. Writing it would bypass the same bound recordPunch /
        // managerSaveDay enforce; the manager should deny instead.
        const ageDays = daysBetween_(date, fmtDateTz_(new Date(), empTz_(targetEmp)));
        if (ageDays > CONFIG.ADJUST_WINDOW_DAYS) {
          fail(id, 'This request is now older than the ' + CONFIG.ADJUST_WINDOW_DAYS +
            '-day adjust window — deny it (the rep can re-submit if still needed).');
          return;
        }
        const endTime = parEndTime_(rows[i]);   // T3 — '' when none was filed
        if (action === 'resume') {
          const res = resumeShiftForEmployee_(targetEmp, date, reqTime, callerEmp.email, reason, endTime);
          if (res && res.error) { fail(id, res.error); return; }
          // F6: a resume writes OUTSIDE the ctx — it retypes the ClockOut row
          // to ADJ-LunchOut and appends an ADJ-LunchIn — so this employee's
          // cached index no longer describes the sheet. Drop it; the next
          // request for them rebuilds from the sheet as it now stands. Today's
          // (date, punchType) dup guard makes the worst read (a later ClockOut
          // set landing on the row the resume just converted, undoing the
          // unpaid gap) unreachable, but that guard is a distant invariant to
          // rest a payroll write on. Cost is one extra read, only in a batch
          // that actually contains a resume.
          delete ctxByEmp[empId];
        } else {
          writeAdjustPunchForEmployee_(targetEmp, date, punchType, reqTime, callerEmp.email, reason, ctxFor(empId));
        }
        // M-7: the decision email is DEFERRED to the post-lock finally — a
        // MailApp send inside the ONE project lock stalls every rep's punch.
        notifyAfter = function () { notifyEmployeeOfAdjustDecision_(targetEmp, date, punchType, reqTime, reason, 'Approved', action, endTime); };
        later.push(notifyAfter);
      } else {
        const targetForAudit = lookupEmployeeById_(empId) || { id: empId, name: empName, email: '' };
        writeAuditLog_(targetForAudit, 'PunchAdjustStatusChange', date, '', false, 0,
          `${punchType} ${reqTime} request denied`, callerEmp.email);
        notifyAfter = function () { notifyEmployeeOfAdjustDecision_(targetForAudit, date, punchType, reqTime, reason, 'Denied', action); };
        later.push(notifyAfter);
      }
      sheet.getRange(i + 1, PAR.STATUS + 1).setValue(sheetSafe_(newStatus));
      results.push({ reqId: id, success: true });
    });
    const failed = results.filter((r) => !r.success).length;
    return { success: failed === 0, results: results, done: results.length - failed, failed: failed,
      error: failed ? (failed + ' of ' + results.length + ' could not be ' + newStatus.toLowerCase()) : undefined };
  } catch (err) { return { success: false, error: err.message, results: results }; }
  finally {
    lock.releaseLock();
    // M-7: best-effort mail fires only after the global lock is released.
    later.forEach((fn) => { try { fn(); } catch (e) { console.warn('post-lock notify failed: ' + e.message); } });
  }
}
/** Tells the MANAGERS a rep has filed punch-adjustment request(s) (B2,
 *  2026-09-01). Until this shipped, `submitPunchAdjustRequests` wrote its
 *  Pending rows, audited, and told NOBODY — the queue lives inside the manager
 *  dashboard, so a request was seen only if a manager happened to look. The
 *  rep waits, believing it is with their manager; the manager has no idea it
 *  exists. Every other request type in the app notifies somebody.
 *
 *  Best-effort (INV-14) and PHI-free — a punch time is not clinical data.
 *  Deferred past the ScriptLock by the caller (M-7). */
function notifyManagersOfAdjustRequests_(emp, entries) {
  try {
    const to = getManagerEmails_();
    if (!to || !to.length || !entries || !entries.length) return;
    const n = entries.length;
    const subj = `${emp.name} requested ${n} punch adjustment${n === 1 ? '' : 's'}`;
    const lines = entries.map(function (c) {
      return `  ${c.date}  ${c.punchType} ${c.time}` + (c.reason ? `  — ${c.reason}` : '');
    }).join('\n');
    const body = `${emp.name} submitted ${n} punch adjustment request${n === 1 ? '' : 's'} ` +
      `for your approval:\n\n${lines}\n\n` +
      `Approve or deny from Manage \u2192 Manage Time. Nothing changes on their ` +
      `timesheet until you do.\n\n\u2014 UMS Time Clock (automated)\n`;
    const rows = entries.map(function (c) {
      return [c.date, c.punchType + ' ' + c.time + (c.reason ? ' \u2014 ' + c.reason : '')];
    });
    const html = buildBrandedEmailHtml_('Punch adjustment' + (n === 1 ? '' : 's') + ' awaiting approval',
      '<p style="margin:0 0 12px;"><b>' + esc_(emp.name) + '</b> submitted ' + n +
      ' punch adjustment request' + (n === 1 ? '' : 's') + ' for your approval:</p>' +
      brandedKvRows_(rows) +
      '<p style="margin:14px 0 0;">Nothing changes on their timesheet until you approve it.</p>',
      { accent: CN_EMAIL_PALETTE.warn, subLabel: 'Time Clock', statusLabel: 'Pending',
        ctaUrl: safeWebAppUrl_('manage'), ctaLabel: 'Open Manage Time' });
    appSendMail_({ to: to.join(','), subject: subj, body: body, htmlBody: html });
  } catch (e) { console.warn('Adjust request notification failed: ' + e.message); }
}
/** Tells the REP their punch-adjustment request was approved or denied
 *  (operator 2026-08-31). Until this shipped, `updatePunchAdjustStatus` wrote
 *  the punch and returned — the rep learned the outcome only by noticing their
 *  Clock buttons change (which, before the periodic reconcile, they often did
 *  not) or by reopening the Adjust modal to find the row gone. A DENIAL was
 *  worse: indistinguishable from an approval that had not propagated yet.
 *  Time-off decisions have always emailed (notifyEmployeeOfDecision_); punch
 *  adjustments were the one request type with no notification at all.
 *  Best-effort (INV-14) — a failed send never affects the approval, which is
 *  already committed — and PHI-free (a punch time is not clinical data). */
function notifyEmployeeOfAdjustDecision_(emp, date, punchType, reqTime, reason, newStatus, action, endTime) {
  if (!emp || !emp.email) return;
  try {
    const approved = newStatus === 'Approved';
    const verb = approved ? 'approved' : 'denied';
    const resume = String(action || '') === 'resume';
    const label = resume ? 'Resume shift'
      : (PUNCH_LABELS_.indexOf(punchType) >= 0 ? punchType : String(punchType || ''));
    const subj = resume
      ? `Your request to resume your ${date} shift was ${verb}`
      : `Your punch adjustment for ${date} was ${verb}`;
    const hasReason = !!String(reason || '').trim();
    let body = `Hi ${emp.name},\n\n` +
               `Your punch adjustment request has been ${verb}:\n\n` +
               `Date:    ${date}\n` +
               `Punch:   ${label}\n` +
               `Time:    ${reqTime}\n`;
    if (hasReason) body += `Reason:  ${reason}\n`;
    body += `Status:  ${newStatus}\n\n`;
    // T3: "clock out as usual" is only true while the day is still today and
    // no finish was filed — the live path cannot clock out of an ended day.
    const approvedLine = resume
      ? (endTime
          ? `Your shift was reopened. Your earlier clock-out is now a break, so the time ` +
            `you were away is unpaid, and your ${endTime} finish is recorded as your clock-out.`
          : `Your shift is open again. Your earlier clock-out is now a break, so the time ` +
            `you were away is unpaid — clock out as usual when you finish.`)
      : `The punch has been added to your timesheet.`;
    const deniedLine = `No change was made to your timesheet. Contact your manager if you still need this fixed.`;
    body += (approved ? approvedLine : deniedLine) + `\n\n`;
    body += `— UMS Time Clock (automated)\n`;
    const kv = [['Date', date], ['Punch', label], [resume ? 'Back at' : 'Time', reqTime]];
    if (hasReason) kv.push(['Reason', reason]);
    kv.push(['Status', newStatus]);
    const html = buildBrandedEmailHtml_('Punch adjustment ' + verb,
      '<p style="margin:0 0 10px;">Hi ' + esc_(emp.name) + ',</p>' +
      '<p style="margin:0 0 12px;">Your punch adjustment request has been <b>' + esc_(verb) + '</b>:</p>' +
      brandedKvRows_(kv) +
      '<p style="margin:14px 0 0;">' + esc_(approved ? approvedLine : deniedLine) + '</p>',
      { accent: approved ? CN_EMAIL_PALETTE.accent : CN_EMAIL_PALETTE.danger,
        subLabel: 'Time Clock',
        statusLabel: approved ? 'Approved' : 'Denied',
        ctaUrl: safeWebAppUrl_('clock'), ctaLabel: 'Open Time Clock' });
    appSendMail_({ to: emp.email, subject: subj, body: body, htmlBody: html });
  } catch (e) { console.warn('Adjust decision email failed: ' + e.message); }
}
/** Reopens a day the rep has already clocked out of (B3, 2026-09-01).
 *
 *  THE MODEL, and why it is not a delete. The obvious implementation — remove
 *  the ClockOut so the day is open again — silently PAYS the rep for the hours
 *  between clocking out and coming back. That is fine for the one case where
 *  the clock-out was a mistake and the rep resumed a minute later, and wrong
 *  for the case the operator actually described (finished, went home, was
 *  asked to come back for a few hours). One of those is a payroll error, and
 *  nothing on screen would show it.
 *
 *  So the ClockOut is CONVERTED to a break instead: its row keeps its time and
 *  becomes an `ADJ-LunchOut`, and an `ADJ-LunchIn` is written at the requested
 *  resume time. The away gap is a break, which is unpaid — the truth in both
 *  cases, exact to the minute in both, and needing no new arithmetic, because
 *  `calcHours_` deducts EVERY break pair since the 2026-09-01 multi-break round
 *  (INV-176). The day is then in the on-shift state and the rep clocks out
 *  again normally.
 *
 *  A genuine SECOND SHIFT (a distinct clock-in/clock-out pair on one date) is
 *  still not supported — `getNextActions_` collapses it and both repair paths
 *  treat a repeated clock punch as damage. This is deliberately the resume of
 *  ONE shift, not a multi-shift model.
 *
 *  Returns {} on success or {error} — the caller surfaces it to the manager
 *  rather than marking the request approved.
 */
/** T3 — a PunchAdjustRequests row's filed finish (HH:mm), or ''. The column is
 *  a trailing add: a row read from a tab whose header has not self-healed yet
 *  is SHORT, and normalizeTime_(undefined) is the string "undefined" — which
 *  would read as a finish time. Absent and blank are both "none". */
function parEndTime_(row) {
  const v = row ? row[PAR.END_TIME] : null;
  if (v === undefined || v === null || v === '') return '';
  const hm = normalizeTime_(v).trim().substring(0, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hm) ? hm : '';
}
function resumeShiftForEmployee_(targetEmp, date, resumeTime, actorEmail, reason, endTime) {
  // Re-validate at APPROVAL time: the day can be edited while the request
  // waits, and converting a ClockOut that is no longer there would leave the
  // rep with a LunchIn and no matching leave (an unpaired half, which
  // breakPairs_ correctly drops — silently costing them the whole reopening).
  const co = findExistingPunch_(targetEmp.id, date, 'ClockOut');
  if (!co) {
    return { error: 'There is no Clock Out on ' + date + ' any more — deny this request ' +
      '(the day was edited since it was filed).' };
  }
  const coHm = String(co.time || '').substring(0, 5);
  if (!(resumeTime > coHm)) {
    return { error: 'The resume time (' + resumeTime + ') is not after the Clock Out (' + coHm + ').' };
  }
  // T3 (cycle 22): a resume approved after its day has ENDED must carry the
  // finish. Converting the Clock Out without one leaves the day with a break and
  // no Clock Out — INCOMPLETE, 0 hours, in the timesheet, the pay statement and
  // the accrual — and the rep cannot clock out of a past day live. Refuse with
  // the way out instead; the whole check runs BEFORE any write.
  const end = String(endTime || '').trim().substring(0, 5);
  const dayOver = date < fmtDateTz_(new Date(), empTz_(targetEmp));
  if (end && !(end > resumeTime)) {
    return { error: 'The finish time (' + end + ') is not after the resume time (' + resumeTime + ').' };
  }
  if (dayOver && !end) {
    return { error: 'The day this resume reopens (' + date + ') has ended and no finish time was filed, ' +
      'so approving it would leave the day with no Clock Out. Ask the rep to add their finish with ' +
      'Adjust → Clock Out (it attaches to this request), then approve.' };
  }
  const outFull = coHm + ':00';
  const inFull = resumeTime + ':00';
  // Convert in place — the row keeps its TIME and changes only what it means.
  co.sheet.getRange(co.rowIndex, ADP.COMMENTS + 1).setValue(sheetSafe_('ADJ-LunchOut'));
  appendToAdpSheet_(targetEmp, date, inFull, 'IN', 'ADJ-LunchIn');
  if (targetEmp.sheetId) {
    // Best-effort mirror (INV-59): drop the stale Clock Out, write the pair.
    try { clearFromEmployeeSheet_(targetEmp, date, 'ClockOut'); } catch (e) {}
    try { writeToEmployeeSheet_(targetEmp, date, outFull, 'OUT', 'LunchOut'); } catch (e) {}
    try { writeToEmployeeSheet_(targetEmp, date, inFull, 'IN', 'LunchIn'); } catch (e) {}
  }
  const daysBack = Math.abs(daysBetween_(date, fmtDateTz_(new Date(), empTz_(targetEmp))));
  const note = 'shift resumed — Clock Out ' + coHm + ' converted to a break, back at ' +
    resumeTime + ' (unpaid gap)' + (reason ? ' — ' + reason : '');
  writeAuditLog_(targetEmp, 'LunchOut', date, outFull, true, daysBack, note, actorEmail);
  writeAuditLog_(targetEmp, 'LunchIn', date, inFull, true, daysBack, note, actorEmail);
  // The filed finish becomes the day's Clock Out. The old one was just
  // converted, so this APPENDS (writeAdjustPunchForEmployee_ finds no ClockOut).
  if (end) {
    writeAdjustPunchForEmployee_(targetEmp, date, 'ClockOut', end, actorEmail,
      'finish of a resumed shift' + (reason ? ' — ' + reason : ''));
  }
  return {};
}
/** Writes a single ADJ-{punchType} punch for a TARGET employee (the approve
 *  path). Find-existing-of-that-type-for-date → update, else append; mirrors
 *  recordPunch's adjustment write + the personal-sheet mirror (INV-09/26/59).
 *  Touches ONLY that punch type — unlike managerSaveDay's full-day reconcile.
 *  Writes the `ADJ-` audit row with the approving manager as actor. */
function writeAdjustPunchForEmployee_(targetEmp, date, punchType, time, actorEmail, reason, ctx) {
  const timeFull = time + ':00';
  const dir = ['ClockIn', 'LunchIn'].indexOf(punchType) >= 0 ? 'IN' : 'OUT';
  const commentLabel = 'ADJ-' + punchType;
  // C17-9 (batch 6): the range caller passes a prebuilt ctx — ONE Timesheet
  // read for the whole range. Without it a 31-day × 4-slot range ran up to
  // 124 findExistingPunch_ FULL-sheet reads inside the ONE project ScriptLock
  // (every rep's punch waits out the 15s waitLock meanwhile — the INV-153
  // starvation reasoning). Single-punch callers keep findExistingPunch_.
  const existing = ctx
    ? (ctx.idx[date + '|' + punchType] ? { sheet: ctx.sheet, rowIndex: ctx.idx[date + '|' + punchType] } : null)
    : findExistingPunch_(targetEmp.id, date, punchType);
  if (existing) {
    existing.sheet.getRange(existing.rowIndex, ADP.TIME + 1).setValue(sheetSafe_(timeFull));
    existing.sheet.getRange(existing.rowIndex, ADP.COMMENTS + 1).setValue(sheetSafe_(commentLabel));
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
/** C17-9 — one Timesheet read for a whole managerSaveDayRange run. Builds
 *  {date|type: rowIndex} for the target emp over the range's dates. The LAST
 *  matching row wins — agreeing with findExistingPunch_ and managerSaveDay's
 *  snapshot (INV-155).
 *
 *  THE PRECONDITION, which a caller owes and must re-derive (F6, 2026-09-09):
 *  every write during the index's lifetime goes THROUGH the index, and each
 *  (date, type) is written at most once — so an append can never collide with
 *  a later lookup and the index never needs updating mid-run.
 *  `managerSaveDayRange` satisfies it by construction (one slot per type per
 *  day). `punchAdjustDecideAll_` satisfies it only for `set` requests: a
 *  `resume` decision writes through resumeShiftForEmployee_ instead — it
 *  RETYPES the ClockOut row to ADJ-LunchOut and appends an ADJ-LunchIn — so
 *  three keys for that date are stale the moment it lands, and that caller
 *  DISCARDS the employee's cached index rather than reasoning about which of
 *  them a later request in the same batch might read. Any new write path added
 *  to a ctx-bearing loop owes the same. */
function buildAdjustPunchIndex_(empId, dateSet) {
  const sheet = getAdpSS_().getSheetByName(CONFIG.ADP_TAB);
  const rows = sheet.getDataRange().getValues();
  const idx = {};
  for (let i = 2; i < rows.length; i++) {
    if (String(rows[i][ADP.EMP_ID]).trim() !== empId) continue;
    const d = normalizeDate_(rows[i][ADP.DATE]);
    if (!dateSet[d]) continue;
    idx[d + '|' + normalizeType_(String(rows[i][ADP.COMMENTS]))] = i + 1;
  }
  return { sheet: sheet, idx: idx };
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

    // A4 (operator decision, 2026-09-01): range mode REFUSES a multi-break
    // payload rather than guessing what "additive" means for a list. Adding the
    // pairs to each day is not idempotent — re-running the same range doubles
    // them — and replacing that day's breaks contradicts this endpoint's whole
    // contract, which the modal's own hint states: a blank slot is left
    // UNCHANGED, not removed. Neither reading is safe to pick on the operator's
    // behalf for a write that touches up to 31 days of payroll at once, so the
    // combination is rejected by name and multi-break days are edited singly.
    if (slots && Array.isArray(slots.breaks) && slots.breaks.filter(
          b => String((b && b.out) || '').trim() || String((b && b.in) || '').trim()).length > 1) {
      return { success: false, error:
        'Range apply supports one break pair. Applying several across a range is ambiguous — ' +
        'adding them would double on a re-run, and replacing a day\'s breaks would contradict ' +
        'range mode leaving blank slots unchanged. Edit multi-break days one date at a time.' };
    }
    // A single submitted pair maps onto the legacy scalars so everything below
    // — validation, the additive per-day write — is untouched.
    const rangeSlots = Object.assign({}, slots);
    if (slots && Array.isArray(slots.breaks)) {
      const one = slots.breaks.filter(
        b => String((b && b.out) || '').trim() || String((b && b.in) || '').trim())[0] || {};
      rangeSlots.LunchOut = String(one.out || '').trim();
      rangeSlots.LunchIn  = String(one.in  || '').trim();
    }

    const cleanSlots = {};
    let anyTime = false;
    for (let k = 0; k < PUNCH_LABELS_.length; k++) {
      const type = PUNCH_LABELS_[k];
      const raw = String((rangeSlots && rangeSlots[type]) || '').trim();
      if (raw && !/^([01]\d|2[0-3]):[0-5]\d$/.test(raw))
        return { success: false, error: `Invalid time for ${type}: "${raw}" (expected HH:mm, 24-hour)` };
      cleanSlots[type] = raw;
      if (raw) anyTime = true;
    }
    if (!anyTime) return { success: false, error: 'Enter at least one punch time to apply across the range.' };
    const orderErrRange = managerClockOrderError_(cleanSlots);
    if (orderErrRange) return { success: false, error: orderErrRange };

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
    // Cycle-9 L-4 — the slots apply to EVERY date incl. a range ending today;
    // reject a same-day future time atomically like the other validations
    // (see managerSaveDay's guard for the compare rationale).
    if (dates[dates.length - 1] === todayStr) {
      const nowTime = fmtTimeTz_(new Date(), empTz);
      for (let k = 0; k < PUNCH_LABELS_.length; k++) {
        const t = cleanSlots[PUNCH_LABELS_[k]];
        if (t && t > nowTime)
          return { success: false, error: `Cannot set a future time today (${PUNCH_LABELS_[k]} ${t}). End the range yesterday or clear that slot.` };
      }
    }
    const trimmedReason = String(reason || '').trim();
    if (daysBetween_(dates[0], todayStr) > CONFIG.OLD_ADJUST_ALERT_DAYS && !trimmedReason) {
      return { success: false, error: `A reason is required when the range goes more than ${CONFIG.OLD_ADJUST_ALERT_DAYS} days back.` };
    }

    const dateSet = {};
    dates.forEach(function (dd) { dateSet[dd] = true; });
    const ctx = buildAdjustPunchIndex_(targetEmp.id, dateSet);
    let punchesWritten = 0;
    dates.forEach(function (date) {
      PUNCH_LABELS_.forEach(function (type) {
        const t = cleanSlots[type];
        if (!t) return;
        writeAdjustPunchForEmployee_(targetEmp, date, type, t, callerEmp.email, trimmedReason || 'multi-day edit', ctx);
        punchesWritten++;
      });
    });
    return { success: true, daysTouched: dates.length, punchesWritten: punchesWritten };
  } catch (err) { return { success: false, error: err.message }; }
  finally { lock.releaseLock(); }
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
      '',
      { accent: CN_EMAIL_PALETTE.warn, subLabel: 'Time Clock', statusLabel: 'Review',
        ctaUrl: 'https://docs.google.com/spreadsheets/d/' + getAdpSS_().getId() + '/edit',
        ctaLabel: 'Open the audit log' });
    appSendMail_({ to: recipients.join(','), subject: subj, body: body, htmlBody: html });
  } catch (e) { console.warn('Manager alert email failed: ' + e.message); }
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
      { accent: accent, subLabel: 'Time Off',
        statusLabel: newStatus === 'Approved' ? 'Approved' : newStatus === 'Denied' ? 'Denied' : 'Updated',
        ctaUrl: safeWebAppUrl_('timeoff'), ctaLabel: 'Open Time / PTO' });
    appSendMail_({ to: emp.email, subject: subj, body: body, htmlBody: html });
  } catch (e) { console.warn('Employee notification email failed: ' + e.message); }
}
/** The chronologically-first stamp of an accumulated punch type, for the
 *  BACK-COMPAT scalar fields (`lunchOut`/`lunchIn`) every existing client still
 *  reads. Identical to the pre-2026-09-01 value on a single-break day, which is
 *  the overwhelming majority; on a multi-break day it now names the FIRST break
 *  (the real lunch) rather than the last. Deliberately independent of
 *  breakPairs_ so an UNPAIRED stamp still renders — a rep who is on lunch right
 *  now has a LunchOut and no LunchIn, and that must keep showing. */
function punchFirst_(v) {
  if (Array.isArray(v)) return v.length ? v.slice().sort()[0] : null;
  return v || null;
}
/** The ordering key a break stamp takes on the SHIFT's timeline: a time at or
 *  before the clock-in belongs to the next calendar day, the same wrap the
 *  clock pair uses. Extracted so breakPairs_ (which pairs TIMES) and the Day
 *  Edit reconcile (which pairs SHEET ROWS) sort identically — two orderings
 *  would silently pair a manager's edit against the wrong existing row. */
function breakSortKey_(time, anchorMins) {
  const m = timeToMins_(time);
  if (m === null) return null;
  return (typeof anchorMins === 'number' && anchorMins !== null && m <= anchorMins) ? m + 1440 : m;
}
/** THE break-pairing rule — one implementation, shared by calcHours_ (which
 *  sums the pairs) and by the display builders (which render them), so the
 *  arithmetic and the UI can never disagree about which stamps form a pair.
 *
 *  `lunchOut`/`lunchIn` accept a single time string OR an array of them: a rep
 *  may legitimately take more than one break (getNextActions_ has always
 *  re-offered Lunch Out after Lunch In), and before 2026-09-01 only the LAST
 *  pair was deducted, so every earlier break was silently paid.
 *
 *  Stamps are normalized onto the SHIFT's own timeline before sorting — a time
 *  at or before the clock-in belongs to the next calendar day, the same wrap
 *  the clock pair uses — so an overnight shift's 02:00 break correctly sorts
 *  AFTER its 23:50 one instead of ahead of it. Pairing is then GREEDY over
 *  two INDEPENDENT cursors: each `out` takes the earliest `in` that can close
 *  it, and an `in` that cannot close the current `out` is skipped ALONE.
 *  Walking both lists on ONE index (the original shape, F1 2026-09-09) made a
 *  single stray early LunchIn shift every later `in` a slot and un-pair the
 *  whole day — so the rep was PAID for every real break they took, the exact
 *  over-payment the 2026-09-01 multi-break round exists to prevent.
 *
 *  An UNPAIRED extra (more outs than ins, a corrupt stamp, or an in that does
 *  not follow its out) is DROPPED rather than guessed at: the same shape as a
 *  missing lunch, so one bad break can never void an otherwise-good clock pair
 *  (INV-176). The sheet doctor is what surfaces those rows as damage.
 *
 *  DROPPING IT DROPS IT ALONE (F1, 2026-09-09). Pairing walks the two sorted
 *  lists with independent cursors: an `in` that cannot close the current `out`
 *  is skipped and the NEXT one is tried against the same out. The original
 *  index-locked loop advanced both cursors together, so one stray early `in`
 *  (a hand-entered row, a mis-keyed AM/PM, the LunchIn half of a break whose
 *  LunchOut was deleted) shifted every later `in` one slot and silently
 *  un-paired the whole day — the rep was then PAID for every real break they
 *  took, which is the exact over-payment the multi-break round exists to
 *  prevent, arriving through the other door. Greedy is also the conservative
 *  reading: each out takes the EARLIEST in that can close it. */
/** THE per-day punch accumulator every hours consumer builds through (A2,
 *  operator 2026-09-01). ClockIn/ClockOut stay LAST-WINS — a second CLOCK pair
 *  is multi-shift support, a different feature, deliberately out of scope and
 *  still collapsed by managerSaveDay / the sheet doctor. LunchOut/LunchIn
 *  ACCUMULATE into arrays, because calcHours_ now deducts every pair.
 *
 *  Five builders feed hours off this shape — the accrual index, the timesheet,
 *  the employee calendar, the team calendar and the dashboard sparkline — and
 *  they each used to inline `map[type] = time`, so a change like this one had
 *  five places to miss. Route new ones through here. */
function punchDayAdd_(pm, type, time) {
  if (type === 'LunchOut' || type === 'LunchIn') {
    if (!pm[type]) pm[type] = [];
    pm[type].push(time);
  } else {
    pm[type] = time;
  }
  return pm;
}
function breakPairs_(lunchOut, lunchIn, clockInMins) {
  const anchor = (typeof clockInMins === 'number') ? clockInMins : null;
  const list = (v) => (Array.isArray(v) ? v : (v === null || v === undefined || v === '' ? [] : [v]))
    .map((t) => ({ raw: t, mins: breakSortKey_(t, anchor) }))
    .filter((x) => x.mins !== null)
    .sort((a, b) => a.mins - b.mins);
  const outs = list(lunchOut), ins = list(lunchIn);
  const pairs = [];
  let j = 0;
  for (let i = 0; i < outs.length; i++) {
    while (j < ins.length && ins[j].mins <= outs[i].mins) j++;  // drop an in that can't close this out
    if (j >= ins.length) break;                                 // outs are sorted: no later out can pair
    pairs.push({ out: outs[i].raw, in: ins[j].raw, minutes: ins[j].mins - outs[i].mins });
    j++;
  }
  return pairs;
}
/** The OPEN break of a day, if it has one: the latest leave (LunchOut) that
 *  comes after every return (LunchIn) — the rep is out right now, or forgot to
 *  punch back. Returns that leave's raw stamp, or null. Pure; the same
 *  clock-in anchor as breakPairs_, so an overnight shift orders the same way.
 *
 *  WHY it exists (cycle 22 T1): breakPairs_ ships PAIRS only, which is right
 *  for the hours — an open leave deducts nothing yet — but Day Edit prefilled
 *  its break list from those pairs alone. A manager opening the day of a rep
 *  who was on lunch saw no break, and saving (to fix a mistyped clock-in, say)
 *  submitted an empty list, which DELETES the lone LunchOut: the rep flipped
 *  back to "clocked in", the state machine then refused their LunchIn, and the
 *  lunch was paid. The server already accepts a trailing half row for exactly
 *  this case; the client simply never received one to send back. */
function breakOpenLeave_(lunchOut, lunchIn, clockInMins) {
  const anchor = (typeof clockInMins === 'number') ? clockInMins : null;
  const keyed = (v) => (Array.isArray(v) ? v : (v === null || v === undefined || v === '' ? [] : [v]))
    .map((t) => ({ raw: t, mins: breakSortKey_(t, anchor) }))
    .filter((x) => x.mins !== null);
  const outs = keyed(lunchOut).sort((a, b) => a.mins - b.mins);
  if (!outs.length) return null;
  const last = outs[outs.length - 1];
  const lastIn = keyed(lunchIn).reduce((m, x) => Math.max(m, x.mins), -Infinity);
  return last.mins > lastIn ? last.raw : null;
}
function calcHours_(clockIn, clockOut, lunchOut, lunchIn) {
  let inMins = timeToMins_(clockIn), outMins = timeToMins_(clockOut);
  // A3 (cycle 13): an unparseable clock pair yields NULL, not NaN. Callers all
  // already have a "hours not computed" branch (the incomplete-day path), so
  // null routes a corrupt cell there instead of poisoning a running total.
  if (inMins === null || outMins === null) return null;
  // Overnight wrap on a STRICT reversal only (2026-09-17). timeToMins_ drops
  // seconds, so a clock-in at 09:00:10 and a clock-out at 09:00:45 — legal on
  // the live path once the 30s debounce clears — compared EQUAL and the old
  // `<=` paid a 24-hour day into timesheet totals, the pay statement, the
  // accrual index and the sparkline. An equal-minute pair is zero hours, not a
  // shift that ended a day later; the manager writers refuse it outright
  // (managerClockOrderError_) and the sheet doctor reports it.
  if (outMins < inMins) outMins += 1440;
  // EVERY break pair is deducted, not just the last (operator 2026-09-01).
  let lunchMins = 0;
  breakPairs_(lunchOut, lunchIn, inMins).forEach((b) => { lunchMins += b.minutes; });
  return (outMins - inMins - lunchMins) / 60;
}
/**
 * "HH:mm[:ss]" → minutes past midnight, or NULL when the cell can't be parsed
 * (A3, cycle 13). It used to return NaN, which is the worst possible sentinel
 * here because NaN comparisons are all FALSE and NaN arithmetic is contagious:
 *   • getPunctualityReport did `if (lateMin > grace) late++; else onTime++;` —
 *     so a NaN day fell through to the ELSE and was scored ON TIME, inflating a
 *     metric managers use in performance conversations. Its earliest-punch pick
 *     (`mins < r.days[d].in`) is also false against NaN, so ONE bad row poisoned
 *     the whole day even when a valid ClockIn existed on it.
 *   • calcHours_ returned NaN, and `totalHours += NaN` turned an entire
 *     timesheet's total into NaN.
 * Returning null makes both callers' explicit null checks fire instead. The
 * guarded writers can't produce such a cell — this is recovery from a
 * hand-edited / corrupted Timesheet TIME cell, which the two-way-Sheet-entry
 * design makes a real (if uncommon) case.
 */
function timeToMins_(t) {
  const p = String(t == null ? '' : t).split(':');
  if (p.length < 2) return null;
  const h = parseInt(p[0], 10), m = parseInt(p[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}
function getAdpSS_() {
  // Script Properties takes precedence over CONFIG.ADP_SS_ID so the deployed
  // Apps Script project can hold the real spreadsheet ID without committing it
  // to the repo. Set it once in Apps Script editor → Project Settings →
  // Script Properties → add ADP_SS_ID = <real ID>. clasp pull/push leaves
  // Script Properties untouched, so the placeholder in CONFIG stays inert.
  // Cycle-9 L-3: memoized per execution — the coercion-recovery helpers
  // (normalizeDate_/normalizeTime_/normalizeAuditTs_/cnTimestampString_)
  // call this PER COERCED CELL inside whole-sheet loops (getManagerDashboard
  // makes five passes over adpRows), which was thousands of un-memoized
  // openById calls per dashboard load. Safe: the resolved ID cannot change
  // mid-execution, and V8 globals reset per execution.
  if (_adpSsMemo) return _adpSsMemo;
  const id = PropertiesService.getScriptProperties().getProperty('ADP_SS_ID')
          || CONFIG.ADP_SS_ID;
  _adpSsMemo = SpreadsheetApp.openById(id);
  return _adpSsMemo;
}
/** Cycle-9 L-3 — the ADP sheet's tz, memoized per execution (each
 *  getSpreadsheetTimeZone() is its own round-trip even on a held object;
 *  the normalize helpers read it per coerced cell). */
function adpSheetTz_() {
  if (!_adpTzMemo) _adpTzMemo = getAdpSS_().getSpreadsheetTimeZone();
  return _adpTzMemo;
}
/** Drop a rep's cached Needs-you list (F4, 2026-09-09). The block is the first
 *  thing on the Dashboard, and a rep who has just DONE the thing it names goes
 *  back to look — so a 2-minute stale entry telling them it is still
 *  outstanding is the one staleness this cache cannot afford. Every completing
 *  flow calls this after its write lands; the key is the rep's own id, so a
 *  targeted delete is enough and no generation salt is needed (the
 *  drCacheGen_ salt exists because a dept request may be resolved by someone
 *  OTHER than its owner — that flow busts both ids for the same reason).
 *  Best-effort by construction: a cache miss is the correct fallback, so this
 *  must never throw into a write that already succeeded. */
function pendingTasksBust_(empId) {
  try {
    var id = String(empId || '').trim();
    if (id) CacheService.getScriptCache().remove(PENDING_TASKS_CACHE_PREFIX + id);
  } catch (e) {}
}
/** Pure sort: overdue first, then by due date (blank due LAST), then title. */
function pendingTasksSort_(items) {
  return (items || []).slice().sort(function (a, b) {
    var ao = a.overdue ? 0 : 1, bo = b.overdue ? 0 : 1;
    if (ao !== bo) return ao - bo;
    var ad = a.dueIso || '9999-99-99', bd = b.dueIso || '9999-99-99';
    if (ad !== bd) return ad < bd ? -1 : 1;
    return String(a.title || '').localeCompare(String(b.title || ''));
  });
}
function getMyPendingTasks() {
  try {
    var emp = getEmployeeInfo_();
    if (!emp) return { error: 'Not authorized.' };
    var cache = CacheService.getScriptCache();
    var key = PENDING_TASKS_CACHE_PREFIX + emp.id;
    try {
      var hit = cache.get(key);
      if (hit) { var c = JSON.parse(hit); c.cached = true; return c; }
    } catch (_) {}
    var tz = safeTimezone_(emp.timezone);
    var todayIso = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    var prev = prevWorkdayIso_(todayIso);
    var nowMs = Date.now();
    var items = [];
    var unavailable = [];
    // F2 (2026-09-09) — a store the operator has deliberately NOT configured is
    // not a failed read, and reporting it as one costs twice. On a deployment
    // with no HR_DOCS_SS_ID (no fallback store, by design — INV-122) the two
    // HR-backed sources threw on EVERY call, so every rep saw "Couldn't check
    // coaching, employee docs" forever — an indicator that can never be clean
    // (INV-186) — the block never reached its clean-empty state and so never
    // disappeared, and `!unavailable.length` meant the 2-minute cache was NEVER
    // written: six reads on every Dashboard paint and every focus wake, for the
    // life of the deployment. These kinds ride `notConfigured` instead: honest
    // in the payload, silent in the UI (an unset store is Storage Health's to
    // report, and it already does), and never a reason to skip the cache.
    var notConfigured = [];
    var hrOk = storeConfigured_('HR_DOCS_SS_ID', '',
      typeof _TEST_OVERRIDE_HRDOCS_SS_ID !== 'undefined' && _TEST_OVERRIDE_HRDOCS_SS_ID);
    var kbOk = storeConfigured_('KB_SS_ID', CONFIG.KB.SS_ID,
      typeof _TEST_OVERRIDE_KB_SS_ID !== 'undefined' && _TEST_OVERRIDE_KB_SS_ID);
    var pushDate = function (iso) { return String(iso || '').slice(0, 10); };

    // training — getMyTraining's own status rule (trainDeriveStatus_) decides
    // overdue; a done item is not a task.
    try {
      var tr = getMyTraining();
      if (!tr || tr.error) throw new Error((tr && tr.error) || 'unreadable');
      (tr.items || []).forEach(function (it) {
        if (it.status === 'done') return;
        var due = pushDate(it.dueDate);
        items.push({
          kind: 'training', title: String(it.title || 'Training item'),
          detail: (it.itemType === 'quiz' ? 'Quiz' : 'Training module') + (due ? ' · due ' + due : ''),
          dueIso: due, overdue: it.status === 'overdue', action: 'Start',
          route: { tool: 'develop', tab: 'trainingHome' },
        });
      });
    } catch (e) { (kbOk ? unavailable : notConfigured).push('training'); }

    // coaching — open, NON-praise (praise needs no acknowledgement — PR 4,
    // decision 8). Overdue = ageDays (BUSINESS days, server-computed; null =
    // unknown and never overdue) at or past the reminder window.
    try {
      var co = getMyCoaching();
      if (!co || co.error) throw new Error((co && co.error) || 'unreadable');
      var remind = CONFIG.COACHING_UNACK_REMINDER_DAYS || 7;
      (co.items || []).forEach(function (it) {
        if (it.status !== 'open' || it.severity === 'praise') return;
        var sev = COACH_SEV_LABELS[it.severity] || String(it.severity || '');
        items.push({
          kind: 'coaching', title: 'Coaching note to acknowledge',
          detail: sev + ' · logged ' + pushDate(it.createdAt) + (it.createdByName ? ' by ' + it.createdByName : ''),
          dueIso: '', overdue: (it.ageDays != null) && Number(it.ageDays) >= remind, action: 'Open',
          route: { tool: 'develop', tab: 'coaching' },
        });
      });
    } catch (e) { (hrOk ? unavailable : notConfigured).push('coaching'); }

    // notes — answered minus logged for the PREVIOUS workday, off getMyMetrics'
    // 5-min result cache (L-1). A failed notes read (noteCountUnavailable) is
    // "couldn't check", never "0 missing" (F5 / INV-187).
    try {
      var m = prev ? getMyMetrics(prev) : null;
      // F-47: cdrUnavailable is the CALL side's noteCountUnavailable — a DQE
      // read that failed is "couldn't check", never "0 answered, 0 missing".
      if (!m || m.error || m.noteCountUnavailable || m.cdrUnavailable) throw new Error('unreadable');
      var answered = (m.cdr && m.cdr.totalAnswered) ? Number(m.cdr.totalAnswered) : 0;
      var logged = Number(m.noteCount) || 0;
      var missing = answered - logged;
      if (missing > 0) {
        items.push({
          kind: 'notes', title: missing + ' call' + (missing === 1 ? '' : 's') + ' without a note',
          detail: 'Answered ' + prev + (m.noteCoverage != null ? ' · notes at ' + m.noteCoverage + '%' : ''),
          dueIso: prev, overdue: false, action: 'File',
          route: { tool: 'callNotes', tab: 'callNotes', hint: { date: prev, missingCount: missing } },
        });
      }
    } catch (e) { unavailable.push('notes'); }

    // requests — the rep's own OPEN dept requests + the incoming ones their
    // desk owes (getDeptRequests already scopes both). Overdue = the SLA band.
    try {
      var dr = getDeptRequests();
      if (!dr || dr.error) throw new Error((dr && dr.error) || 'unreadable');
      var reqRoute = { tool: 'metrics', tab: 'metricsDeptReq' };
      (dr.mine || []).forEach(function (r) {
        if (r.status === 'resolved') return;
        items.push({
          kind: 'requests', title: 'Request to ' + String(r.toDept || '—') + (r.label ? ' · ' + r.label : ''),
          detail: 'Sent ' + pushDate(r.createdAt) + (r.slaStatus === 'overdue' ? ' · past its ' + r.slaHours + 'h SLA' : ''),
          dueIso: '', overdue: r.slaStatus === 'overdue', action: 'Open', route: reqRoute,
        });
      });
      (dr.incoming || []).forEach(function (r) {
        items.push({
          kind: 'requests', title: 'Incoming from ' + String(r.byName || 'a teammate') + (r.label ? ' · ' + r.label : ''),
          detail: 'For ' + String(r.toDept || '—') + ' · sent ' + pushDate(r.createdAt) + (r.slaStatus === 'overdue' ? ' · past its ' + r.slaHours + 'h SLA' : ''),
          dueIso: '', overdue: r.slaStatus === 'overdue', action: 'Open', route: reqRoute,
        });
      });
    } catch (e) { unavailable.push('requests'); }

    // sched — the rep's own scheduled call-backs due TODAY (rep tz); a past
    // due time today is overdue.
    try {
      var sc = getMyScheduledCalls();
      if (!sc || sc.error) throw new Error((sc && sc.error) || 'unreadable');
      (sc.calls || []).forEach(function (c) {
        if (!(c.whenMs > 0)) return;
        if (Utilities.formatDate(new Date(c.whenMs), tz, 'yyyy-MM-dd') !== todayIso) return;
        items.push({
          kind: 'sched', title: String(c.label || 'Scheduled call'),
          detail: 'Call-back at ' + Utilities.formatDate(new Date(c.whenMs), tz, 'h:mm a'),
          dueIso: todayIso, overdue: c.whenMs < nowMs, action: 'Open',
          route: { tool: 'callNotes', tab: 'callNotes' },
        });
      });
    } catch (e) { unavailable.push('sched'); }

    // docs — signable / fillable employee docs (getMyDocs' needsAction);
    // overdue = past dueAt (date compare in the rep's own frame).
    try {
      var dc = getMyDocs();
      if (!dc || dc.error) throw new Error((dc && dc.error) || 'unreadable');
      (dc.docs || []).forEach(function (d) {
        if (!d.needsAction) return;
        var due = pushDate(d.dueAt);
        items.push({
          kind: 'docs', title: String(d.title || 'Document'),
          detail: String(d.docType || 'Document') + (d.requiresSignature ? ' · needs your signature' : ' · needs your answers') + (due ? ' · due ' + due : ''),
          dueIso: due, overdue: !!(due && due < todayIso), action: 'Sign',
          route: { tool: 'develop', tab: 'myDocs' },
        });
      });
    } catch (e) { (hrOk ? unavailable : notConfigured).push('docs'); }

    var sorted = pendingTasksSort_(items);
    var result = {
      items: sorted.slice(0, PENDING_TASKS_CAP), total: sorted.length, cap: PENDING_TASKS_CAP,
      overdue: sorted.filter(function (i) { return i.overdue; }).length,
      unavailable: unavailable, notConfigured: notConfigured,
      todayIso: todayIso, prevWorkday: prev,
    };
    // INV-129: cache only a round where every CONFIGURED source was readable —
    // a pinned degraded round would hide a task for the full TTL. A source
    // whose store is unset is not degraded: it will answer the same way on
    // every call, so caching it is correct rather than a pinned failure.
    if (!unavailable.length) {
      try { cache.put(key, JSON.stringify(result), PENDING_TASKS_CACHE_TTL); } catch (_) {}
    }
    return result;
  } catch (err) { return { error: err.message }; }
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
function empDocContentHash_(bodyMd, title, docType, empId, fieldsJson, delim) {
  const d = (delim === undefined) ? '\u0000' : delim;
  let base = String(bodyMd || '') + d + String(title || '') + d + String(docType || '') + d + String(empId || '');
  if (fieldsJson) base += d + String(fieldsJson);
  return empDocSha256Hex_(base);
}
/** Dual-verify: does `stored` match the content fields under the NEW (NUL)
 *  form OR the legacy (space) form? Callers pass the RAW stored cell strings
 *  (INV-135 byte-stability). Returns a boolean; a blank `stored` is the
 *  caller's legacy/no-hash case, not this helper's. */
function empDocContentHashMatches_(stored, bodyMd, title, docType, empId, fieldsJson) {
  const s = String(stored || '');
  if (!s) return false;
  if (empDocContentHash_(bodyMd, title, docType, empId, fieldsJson) === s) return true;
  return empDocContentHash_(bodyMd, title, docType, empId, fieldsJson, EMPDOC_HASH_DELIM_LEGACY) === s;
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
