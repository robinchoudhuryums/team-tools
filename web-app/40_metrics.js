// ════════════════════════════════════════════════════════════════════════════
//  UMS TEAM TOOLS — 40_metrics.js
//  Metrics: the CDR Report reads and the per-rep / team aggregates.
//
//  ONE Apps Script project, ONE global scope: these files are the SERVER, in
//  the load order `web-app/.clasp.json` filePushOrder declares. Batch F2 split
//  them out of Code.js as a MOVE — every declaration below is byte-identical to
//  the one it replaced, and the SPLIT-MANIFEST pin proves it.
// ════════════════════════════════════════════════════════════════════════════

/** Admin-gated, read-only — the CDR half of the Team-members panel, split out
 *  of `getOnboardingPanel` so the roster-backed panel paints immediately.
 *  Over the trailing 7 days: has the phone system reported this NAME at all,
 *  and if not, does an off-roster CDR agent look like the same person spelled
 *  differently (the INV-186 pairing)? BEST-EFFORT (the INV-67 posture): an
 *  unreachable CDR Report returns ok:false and every rep reads "unknown",
 *  never "missing" — an unread name is not an absent one (INV-187). */
function getOnboardingCdrReadiness() {
  try {
    var callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    var rows = getEmployeeRosterRows_();
    var names = [];
    for (var i = 1; i < rows.length; i++) {
      if (!empRosterEmail_(rows[i])) continue;          // F3: the one predicate
      var nm = String(rows[i][EMP.NAME] || '').trim();
      if (nm) names.push(nm);
    }
    var to = Utilities.formatDate(new Date(), CONFIG.MANAGER_TIMEZONE, 'yyyy-MM-dd');
    var fromD = new Date(Date.parse(to + 'T12:00:00Z') - 6 * 86400000);
    var from = isoFromUtc_(fromD);
    var agg = getCdrAgentMetrics_(from, to, names);
    var seenSet = cdrAgentsOrThrow_(agg);   // M7: an unread DQE tab reads unknown, never missing
    var noCdr = names.filter(function (n) { return !seenSet[n]; });
    var likely = cdrLikelyNameMismatches_(noCdr, (agg.meta && agg.meta.offRosterAgents) || []);
    var seen = {}, alias = {};
    names.forEach(function (n) { if (seenSet[n]) seen[n] = true; });
    likely.forEach(function (m) { alias[m.roster] = m.cdr; });
    return { ok: true, from: from, to: to, seen: seen, alias: alias };
  } catch (err) { return { ok: false, error: err.message }; }
}
/** Trailing-window average inbound volume per slot from the CDR export tab.
 *  Best-effort by contract: any failure returns {unavailable: <reason>} and
 *  the strip renders WITHOUT the layer (decoration — INV-187 says name the
 *  gap, never draw zeros). Read with getDisplayValues throughout (INV-64: a
 *  time-shaped column in a foreign sheet is never reinterpreted); widening
 *  TAIL scan on the date column (the tab is date-ascending) bounded by
 *  BREAK_COVERAGE_VOLUME_MAX_ROWS with truncation reported. Cached
 *  BREAK_COVERAGE_VOLUME_CACHE_SEC on a CLEAN round only (INV-129); bypassed
 *  under the CDR test override like every sibling CDR cache. */
function getCdrInboundVolume_(opts) {
  const slotMin = opts.slotMin, startHour = opts.startHour, endHour = opts.endHour;
  const days = Math.max(7, Number(CONFIG.BREAK_COVERAGE_VOLUME_DAYS) || 28);
  const anchor = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
  const toIso = Utilities.formatDate(new Date(), anchor, 'yyyy-MM-dd');
  const fromIso = addDaysIso_(toIso, -days);
  const queues = (CONFIG.BREAK_COVERAGE_VOLUME_QUEUES || []).map(function (q) { return String(q).trim().toLowerCase(); }).filter(Boolean);
  const qset = queues.length ? queues.reduce(function (m, q) { m[q] = true; return m; }, {}) : null;
  const useCache = !(typeof _TEST_OVERRIDE_CDR_SS_ID !== 'undefined' && _TEST_OVERRIDE_CDR_SS_ID);
  const cacheKey = 'brk_volume_v1:' + fromIso + ':' + toIso + ':' + slotMin + ':' + startHour + ':' + endHour + ':' + queues.join('|');
  const cache = CacheService.getScriptCache();
  if (useCache) { try { const hit = cache.get(cacheKey); if (hit) return JSON.parse(hit); } catch (_) {} }
  let out;
  try {
    const ss = getCdrSS_();
    const sheet = ss.getSheetByName(CONFIG.CDR_INBOUND_TAB);
    if (!sheet) return { unavailable: 'The "' + CONFIG.CDR_INBOUND_TAB + '" tab is not in the CDR Report spreadsheet (call-data-reporting exports it — its "Inbound Calls tab export" trigger must be installed).' };
    const lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
    if (lastRow < 2) return { unavailable: 'The "' + CONFIG.CDR_INBOUND_TAB + '" tab is empty.' };
    const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    const maxRows = Math.max(1000, Number(CONFIG.BREAK_COVERAGE_VOLUME_MAX_ROWS) || 40000);
    let win = 4000, startRow, dates, truncated = false;
    for (;;) {
      startRow = Math.max(2, lastRow - win + 1);
      dates = sheet.getRange(startRow, 1, lastRow - startRow + 1, 1).getDisplayValues();
      const oldest = cdrRowDateIso_(dates[0][0], anchor);
      if (startRow === 2 || (oldest && oldest < fromIso)) break;
      if (win >= maxRows) { truncated = true; break; }
      win = Math.min(maxRows, win * 4);
    }
    let first = -1, last = -1, through = null;
    for (let i = 0; i < dates.length; i++) {
      const d = cdrRowDateIso_(dates[i][0], anchor);
      if (!d) continue;
      if (through === null || d > through) through = d;
      if (d >= fromIso && d <= toIso) { if (first < 0) first = i; last = i; }
    }
    const rows = (first < 0) ? [] : sheet.getRange(startRow + first, 1, last - first + 1, lastCol).getDisplayValues();
    const b = inboundVolumeBuckets_(headers, rows, { fromIso: fromIso, toIso: toIso, slotMin: slotMin, startHour: startHour, endHour: endHour,
      shiftHours: Number(CONFIG.CDR_INBOUND_PST_TO_CST_HOURS) || 0, queues: qset, tz: anchor });
    if (b.missing.length) return { unavailable: 'The "' + CONFIG.CDR_INBOUND_TAB + '" tab is missing column(s): ' + b.missing.join(', ') + ' (a pre-extension export — re-run the export in call-data-reporting).' };
    if (!b.weekdays) return { unavailable: 'No inbound rows between ' + fromIso + ' and ' + toIso + ' in the "' + CONFIG.CDR_INBOUND_TAB + '" tab (through ' + (through || '—') + ').' };
    out = { slots: b.slots, weekdays: b.weekdays, counted: b.counted, from: fromIso, to: toIso, through: through,
            queues: queues, truncated: truncated, slotMin: slotMin, startHour: startHour, endHour: endHour };
  } catch (err) {
    return { unavailable: 'Could not read the CDR Report: ' + (err && err.message ? err.message : String(err)) };
  }
  if (useCache && !out.truncated) { try { cache.put(cacheKey, JSON.stringify(out), Number(CONFIG.BREAK_COVERAGE_VOLUME_CACHE_SEC) || 3600); } catch (_) {} }
  return out;
}
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
  // H3 (2026-09-17): a Sheets SERIAL -- a date cell under a NUMBER format
  // reads as e.g. 46000 (days since 1899-12-30). Before this branch the
  // String() below produced '46000', matched neither shape, and the row was
  // DROPPED with no error (the dashboard's F-8 class). The derived instant
  // is UTC MIDNIGHT of the calendar date, so it MUST be formatted in UTC: a
  // west-of-UTC tz (the CDR workbook's America/Mexico_City) renders the
  // previous evening and silently shifts the row back a day. The plausible
  // range (~1982..~2100) keeps a small integer from reading as a date.
  if (typeof val === 'number' && val > 30000 && val < 100000) {
    var serial = new Date(Math.round((val - 25569) * 86400000));
    return isNaN(serial.getTime()) ? '' : Utilities.formatDate(serial, 'UTC', 'yyyy-MM-dd');
  }
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
/** Normalize a person-name to comparable lowercase alpha tokens.
 *  "Smith, Bob J." -> ['bob','j','smith'] (sorted, deduped, empties dropped). */
function cdrNameTokens_(name) {
  var toks = String(name || '').toLowerCase()
    .replace(/[^a-z]+/g, ' ').trim().split(/\s+/)
    .filter(function (t) { return !!t; });
  var seen = {}, out = [];
  for (var i = 0; i < toks.length; i++) {
    if (!seen[toks[i]]) { seen[toks[i]] = true; out.push(toks[i]); }
  }
  return out.sort();
}
/**
 * Pair the two CDR name-mismatch directions into the ACTIONABLE subset.
 *
 * Neither raw direction is a usable health signal on its own, and toning a
 * status card off either one leaves it permanently amber:
 *   • `unmatchedAgents` — the CDR Report covers the WHOLE phone system (it is
 *     owned by `call-data-reporting`), while our roster is one team, so every
 *     other department's agents sit in it forever. There is no department
 *     filter — CONFIG.CDR_DEPARTMENT is declared and read nowhere.
 *   • `rosterWithNoCdr` — the roster set is every NAMED employee row, so
 *     managers, admin staff, and anyone on PTO across the whole window are in
 *     it forever.
 *
 * The intersection IS meaningful: a roster rep with no call data whose name
 * closely resembles an unmatched CDR agent is almost certainly one person
 * spelled two ways, which means their calls are silently missing from every
 * metric. That set is normally EMPTY and clears itself once an alias is added.
 *
 * Match rule: normalized-equal, OR >= 2 shared name tokens. Two shared tokens
 * (not one) because a shared SURNAME alone is a coincidence on any real
 * roster. A nickname that shares only a surname ("Robert Smith" vs "Bob
 * Smith") is therefore a deliberate false NEGATIVE — under-reporting is the
 * safe direction for something that drives a warning, and the raw lists are
 * still rendered beneath it for the human to scan.
 *
 * PURE: no sheet/Session access, so the Node harness drives it directly.
 */
function cdrLikelyNameMismatches_(rosterWithNoCdr, unmatchedAgents) {
  var roster = Array.isArray(rosterWithNoCdr) ? rosterWithNoCdr : [];
  var agents = Array.isArray(unmatchedAgents) ? unmatchedAgents : [];
  if (!roster.length || !agents.length) return [];

  var agentToks = agents.map(function (a) {
    var t = cdrNameTokens_(a);
    return { name: a, toks: t, key: t.join(' ') };
  });

  var out = [];
  for (var i = 0; i < roster.length; i++) {
    var rTok = cdrNameTokens_(roster[i]);
    if (!rTok.length) continue;
    var rKey = rTok.join(' ');
    for (var j = 0; j < agentToks.length; j++) {
      var a = agentToks[j];
      if (!a.toks.length) continue;
      var shared = 0;
      for (var k = 0; k < rTok.length; k++) {
        if (a.toks.indexOf(rTok[k]) !== -1) shared++;
      }
      if (rKey === a.key || shared >= 2) {
        out.push({ roster: roster[i], cdr: a.name });
      }
    }
  }
  return out;
}
/** H3 (2026-09-17): the SPAN-bounded DQE read, ported from the dashboard's
 *  `dqeWindowRowSpan_` (its R41). Scan the DATE column alone, find the FIRST
 *  and LAST row inside [fromIso, toIso], and let the caller read only that row
 *  span at full width. Before this both DQE readers read the WHOLE sheet at
 *  full width TWICE (getValues + getDisplayValues) on every call -- ~31k rows
 *  and growing daily, shielded only by the 5-min / 6-h caches.
 *  A span is correct whatever the row order is: an out-of-order row WIDENS it
 *  and can never fall outside it, which is why the per-row date filter in
 *  every caller STAYS -- the span bounds the read, it does not replace the
 *  filter. A TAIL scan would be the trap: DQE Historical Data is appended at
 *  getLastRow()+1 and only re-sorted after the fact, so a backfill of older
 *  dates can sit below newer rows and a tail scan stops early and silently
 *  drops them. Returns null when no row is in the window. */
function cdrDqeWindowSpan_(sheet, lastRow, fromIso, toIso, tz) {
  if (lastRow < 2) return null;
  var dates = sheet.getRange(2, CDR.DATE, lastRow - 1, 1).getValues();
  var first = -1, last = -1;
  for (var i = 0; i < dates.length; i++) {
    var iso = cdrRowDateIso_(dates[i][0], tz);
    if (!iso || iso < fromIso || iso > toIso) continue;
    if (first < 0) first = i;
    last = i;
  }
  return first < 0 ? null : { startRow: 2 + first, numRows: last - first + 1 };
}
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
// ── Company holidays (H1, 2026-09-17) ────────────────────────────────────
// The dashboard repo publishes its holiday list as a `Company Holidays` tab in
// the CDR Report workbook (its Operator State #27; the tab replaced a Script
// Property nothing outside that project could read). This reader is the one
// place team-tools consumes it. Read BY HEADER NAME (the Inbound / Transfer
// tab discipline -- a column added on the owner's side cannot shift ours),
// one range per row in the owner's Skip Dates grammar, Active FALSE parked.
// A Dates cell Sheets coerced to a Date is keyed in the SPREADSHEET's tz
// (the CDR sheet is America/Mexico_City; the g00/INV-64 twin for dates).
// Fail-OPEN by shape: `source` says what happened -- 'sheet' (ranges came
// from the tab), 'empty' (tab present, no active range), 'no-tab' (a pre-H1
// workbook), 'unavailable' (the read threw; NOT cached, so the next request
// retries) -- and getCompanyHolidays_ falls back to the federal list on
// anything but 'sheet'. Cached one hour (a holiday edit is not urgent to
// the minute; a page load must not open a second workbook every time), and
// the CacheService tier is BYPASSED under _TEST_OVERRIDE_CDR_SS_ID like the
// other CDR readers, so a fixture read never serves prod's list or vice versa.
var CDR_HOLIDAYS_CACHE_KEY_ = 'cdr_holidays_v1';
var CDR_HOLIDAYS_CACHE_TTL_ = 3600;
var CDR_HOLIDAYS_MAX_RANGES_ = 400;   // a runaway tab must not become a runaway payload

/** PURE (Node-pinned): the owner's Skip Dates grammar -- single ISO dates,
 *  inclusive `a..b` ranges, comma lists, whitespace anywhere; malformed tokens
 *  dropped, reversed ranges swapped. Mirrors call-data-reporting's
 *  parseSkipDateRanges_ so the two apps read one cell the same way. */
function cdrParseDateRanges_(raw) {
  if (!raw) return [];
  var iso = /^\d{4}-\d{2}-\d{2}$/;
  var out = [];
  String(raw).split(',').forEach(function (tok) {
    tok = tok.trim();
    if (!tok) return;
    var parts = tok.split('..').map(function (x) { return x.trim(); });
    var from = '', to = '';
    if (parts.length === 1 && iso.test(parts[0])) { from = to = parts[0]; }
    else if (parts.length === 2 && iso.test(parts[0]) && iso.test(parts[1])) {
      from = parts[0]; to = parts[1];
      if (from > to) { var t = from; from = to; to = t; }
    } else return;
    out.push({ from: from, to: to });
  });
  return out;
}

/** { ranges: [{from, to, name}], source } -- see the block comment above. */
function getCdrCompanyHolidayRanges_() {
  if (_cdrHolidaysMemo) return _cdrHolidaysMemo;
  var useCache = !(typeof _TEST_OVERRIDE_CDR_SS_ID !== 'undefined' && _TEST_OVERRIDE_CDR_SS_ID);
  if (useCache) {
    try {
      var hit = CacheService.getScriptCache().get(CDR_HOLIDAYS_CACHE_KEY_);
      if (hit) { _cdrHolidaysMemo = JSON.parse(hit); return _cdrHolidaysMemo; }
    } catch (_) {}
  }
  var out = { ranges: [], source: 'no-tab' };
  try {
    var ss = getCdrSS_();
    var sheet = ss.getSheetByName(CONFIG.CDR_HOLIDAYS_TAB);
    if (sheet) {
      var rows = sheet.getDataRange().getValues();
      out.source = 'empty';
      if (rows.length >= 2) {
        var hdr = rows[0].map(function (h) { return String(h == null ? '' : h).trim().toLowerCase(); });
        var iDates = hdr.indexOf('dates');
        if (iDates < 0) iDates = hdr.findIndex(function (h) { return /^date/.test(h); });
        if (iDates < 0) iDates = 0;
        var iLabel = hdr.indexOf('label');
        var iActive = hdr.indexOf('active');
        var tz = ss.getSpreadsheetTimeZone();
        for (var i = 1; i < rows.length && out.ranges.length < CDR_HOLIDAYS_MAX_RANGES_; i++) {
          var r = rows[i];
          if (iActive >= 0) {
            var a = r[iActive];
            if (a === false || String(a == null ? '' : a).trim().toLowerCase() === 'false') continue;
          }
          var cell = r[iDates];
          if (cell instanceof Date) {
            if (isNaN(cell.getTime())) continue;
            cell = Utilities.formatDate(cell, tz, 'yyyy-MM-dd');
          }
          var spec = String(cell == null ? '' : cell).trim();
          if (!spec) continue;
          var name = iLabel >= 0 ? String(r[iLabel] == null ? '' : r[iLabel]).trim() : '';
          cdrParseDateRanges_(spec).forEach(function (rg) {
            out.ranges.push({ from: rg.from, to: rg.to, name: name || 'Company holiday' });
          });
        }
        if (out.ranges.length) out.source = 'sheet';
      }
    }
  } catch (e) {
    out = { ranges: [], source: 'unavailable', error: String(e && e.message || e) };
    Logger.log('getCdrCompanyHolidayRanges_ unavailable (federal list serves): ' + out.error);
  }
  if (useCache && out.source !== 'unavailable') {
    try { CacheService.getScriptCache().put(CDR_HOLIDAYS_CACHE_KEY_, JSON.stringify(out), CDR_HOLIDAYS_CACHE_TTL_); } catch (_) {}
  }
  _cdrHolidaysMemo = out;
  return out;
}

// ── Answer % (H2, 2026-09-17) ─────────────────────────────────────────────
// PURE (Node-pinned): the ONE Answer % formula, and it is the Department
// Dashboard's -- answered / (answered + missed). `totalRung` counts EVERY
// window leg in the DQE build (call-data-reporting's
// buildDQEHistoricalData.js), while answered and missed are two specific
// dispositions, so `answered / rung` -- what this app computed until H2 --
// is a DIFFERENT number whenever a leg carries a third disposition, and a
// rep saw one rate here and their manager another for the same DQE row.
// Rounded to a WHOLE percent, because that is what the dashboard's Answer %
// cell prints (script-5-dept.html: `Math.round(pa / pt * 100)`) -- a 91.7
// here against a 92 there would tint amber vs green on the same row, which
// is the disagreement H2 exists to remove. NULL when there is nothing to
// divide (F-32, 2026-09-17): a window with rung calls but no answered or
// missed leg has no answer rate, and the 0 this returned read as "every call
// missed" -- a red row, a crit card and a badge on a day nobody missed a call.
// Every consumer already renders null as a dash and skips it in an average.
function cdrAnswerPct_(answered, missed) {
  var a = Number(answered) || 0, m = Number(missed) || 0;
  var denom = a + m;
  return denom > 0 ? Math.round((a / denom) * 100) : null;
}

// ── Dashboard Standards (H2) ─────────────────────────────────────────────
// The dashboard repo publishes its RESOLVED display standards as a
// `Dashboard Standards` tab in the CDR Report workbook (its Operator State
// #37): one row per dashboard dept plus a `*` global row -- the answer
// target + amber band every dept-context tint resolves through there, and
// the effective team-average exclusions (its INV-26). Read BY HEADER NAME;
// THIS team's row is CONFIG.CDR_DASHBOARD_DEPT (Script Property override),
// with the `*` row as the fallback when the dept has no row. Fail-OPEN by
// shape: `source` says what happened ('sheet' | 'global' (the `*` row served)
// | 'no-row' | 'empty' | 'no-tab' | 'unavailable'), and on anything but
// 'sheet' / 'global' `target` is NULL -- the consumers then render NO target
// line, NO tone and NO badge rather than a number nobody set (g122's rule; a
// colour is a verdict). 'unavailable' is never cached. One-hour tier, bypassed
// under _TEST_OVERRIDE_CDR_SS_ID like every other CDR reader.
var CDR_STANDARDS_CACHE_KEY_ = 'cdr_standards_v1';
var CDR_STANDARDS_CACHE_TTL_ = 3600;

function cdrDashboardDept_() {
  try {
    var p = PropertiesService.getScriptProperties().getProperty('CDR_DASHBOARD_DEPT');
    if (p && String(p).trim()) return String(p).trim();
  } catch (_) {}
  return String(CONFIG.CDR_DASHBOARD_DEPT || '').trim();
}

/** { dept, target, band, teamAvgExcludes: [], source } -- see the block comment. */
function getCdrDashboardStandard_() {
  if (_cdrStandardsMemo) return _cdrStandardsMemo;
  var useCache = !(typeof _TEST_OVERRIDE_CDR_SS_ID !== 'undefined' && _TEST_OVERRIDE_CDR_SS_ID);
  var dept = cdrDashboardDept_();
  var key = CDR_STANDARDS_CACHE_KEY_ + ':' + dept;
  if (useCache) {
    try {
      var hit = CacheService.getScriptCache().get(key);
      if (hit) { _cdrStandardsMemo = JSON.parse(hit); return _cdrStandardsMemo; }
    } catch (_) {}
  }
  var out = { dept: dept, target: null, band: null, teamAvgExcludes: [], source: 'no-tab' };
  try {
    var ss = getCdrSS_();
    var sheet = ss.getSheetByName(CONFIG.CDR_STANDARDS_TAB);
    if (sheet) {
      var rows = sheet.getDataRange().getValues();
      out.source = 'empty';
      if (rows.length >= 2) {
        var hdr = rows[0].map(function (h) { return String(h == null ? '' : h).trim().toLowerCase(); });
        var iDept = hdr.indexOf('department'), iTarget = hdr.indexOf('answer target'),
            iBand = hdr.indexOf('amber band'), iEx = hdr.indexOf('team avg excludes');
        if (iDept < 0 || iTarget < 0) {
          out.source = 'unavailable';
          out.error = 'header drift: Department / Answer Target not found';
        } else {
          var own = null, star = null;
          for (var i = 1; i < rows.length; i++) {
            var d = String(rows[i][iDept] == null ? '' : rows[i][iDept]).trim();
            if (!d) continue;
            if (d === dept && !own) own = rows[i];
            else if (d === '*' && !star) star = rows[i];
          }
          var row = own || star;
          if (!row) out.source = 'no-row';
          else {
            var t = Number(row[iTarget]);
            var b = iBand >= 0 ? Number(row[iBand]) : NaN;
            if (isFinite(t) && t > 0 && t <= 100) {
              out.target = Math.round(t * 10) / 10;
              out.band = (isFinite(b) && b >= 0 && b <= 50) ? Math.round(b * 10) / 10 : null;
              out.teamAvgExcludes = iEx >= 0
                ? String(row[iEx] == null ? '' : row[iEx]).split(',').map(function (x) { return x.trim(); }).filter(Boolean)
                : [];
              out.source = own ? 'sheet' : 'global';
            } else {
              out.source = 'unavailable';
              out.error = 'row for ' + (own ? dept : '*') + ' has no usable Answer Target';
            }
          }
        }
      }
    }
  } catch (e) {
    out = { dept: dept, target: null, band: null, teamAvgExcludes: [], source: 'unavailable', error: String(e && e.message || e) };
    Logger.log('getCdrDashboardStandard_ unavailable (no target served): ' + out.error);
  }
  if (useCache && out.source !== 'unavailable') {
    try { CacheService.getScriptCache().put(key, JSON.stringify(out), CDR_STANDARDS_CACHE_TTL_); } catch (_) {}
  }
  _cdrStandardsMemo = out;
  return out;
}

/** PURE (Node-pinned): the standard's fields as the endpoints ship them --
 *  null target/band when the standard is not available, so a client renders
 *  nothing rather than a number nobody set. */
function cdrStandardShip_(std) {
  return {
    alertThreshold: (std && std.target != null) ? std.target : null,
    alertBand: (std && std.target != null && std.band != null) ? std.band : null,
    standardSource: (std && std.source) || 'unavailable',
  };
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
/** M7 (cycle 22): the agents map of a getCdrAgentMetrics_ result, or a THROW
 *  when the reader NAMED a failure (meta.error — the DQE tab missing or
 *  renamed). The reader returns agents:{} beside that error, and a caller that
 *  read only .agents drew — and cached — "nobody took a call". A throw lands in
 *  each caller's existing failure path, none of which caches. */
function cdrAgentsOrThrow_(res) {
  if (res && res.meta && res.meta.error) throw new Error('Call data unavailable: ' + res.meta.error);
  return (res && res.agents) || {};
}
/**
 * Core CDR data reader. Fetches per-agent DQE metrics for a date range,
 * filtered to the `rosterNames` passed in (pass null/[] for an unfiltered
 * read). NOTE: there is no department filter — CONFIG.CDR_DEPARTMENT is
 * declared and read NOWHERE; this comment used to claim otherwise. Agents
 * dropped by the roster filter are reported in `meta.offRosterAgents`.
 * Isolated so a future Neon swap replaces only this function.
 */
function getCdrAgentMetrics_(from, to, rosterNames) {
  var rHash = cdrRosterHash_(rosterNames);
  var cacheKey = CONFIG.CDR_CACHE_KEY + ':' + rHash + ':' + from + ':' + to;
  var cache = CacheService.getScriptCache();
  // F-31 (cycle 20): bypass the cache whenever a test points the CDR reader at
  // a fixture spreadsheet — the getMyMetrics pattern, which every OTHER cached
  // CDR reader here already follows. This is the LOWEST tier, the one all of
  // them sit on, and it was the one still serving production's numbers to a
  // fixture read (and writing the fixture's numbers back under a key
  // production reads). The editor suite cleared two guessed keys by hand
  // instead; a bypass needs no guessing.
  var useCache = !(typeof _TEST_OVERRIDE_CDR_SS_ID !== 'undefined' && _TEST_OVERRIDE_CDR_SS_ID);
  var cached = useCache ? cache.get(cacheKey) : null;
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

  // H3: span-bounded -- the date column decides which rows are read at full
  // width; the per-row date filter below still decides which rows COUNT.
  var span = cdrDqeWindowSpan_(sheet, lastRow, from, to, tz);
  var range = span ? sheet.getRange(span.startRow, 1, span.numRows, 34) : null;
  var values = range ? range.getValues() : [];
  var displays = range ? range.getDisplayValues() : [];

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
    var ansRow = Number(values[i][CDR.TOTAL_ANSWERED - 1]) || 0;
    a.totalAnswered += ansRow;
    a.tttSeconds   += cdrParseHms_(displays[i][CDR.TTT - 1]);
    var att = cdrParseHms_(displays[i][CDR.ATT - 1]);
    // M3 (cycle 22): each DQE row is ONE DAY's average, so a range's ATT is
    // the ANSWERED-WEIGHTED mean of them. The plain mean gave a 2-call day the
    // same vote as a 60-call day (and disagreed with the team aggregate,
    // which was already answered-weighted).
    if (att > 0 && ansRow > 0) { a.attSum += att * ansRow; a.attCount += ansRow; }
    if (!a._dates[dateIso]) { a._dates[dateIso] = true; a.daysActive++; }
  }

  Object.keys(agents).forEach(function (k) {
    var a = agents[k];
    a.attSeconds = a.attCount > 0 ? Math.round(a.attSum / a.attCount) : 0;
    a.pctAnswered = cdrAnswerPct_(a.totalAnswered, a.totalMissed);   // H2: the dashboard's formula
    a.tttFormatted = cdrFmtHms_(a.tttSeconds);
    a.attFormatted = cdrFmtHms_(a.attSeconds);
    delete a._dates; delete a.attSum; delete a.attCount;
  });

  var result = { agents: agents, meta: { rowsScanned: values.length, rowsMatched: rowsMatched, columnWarning: colWarning,
    offRosterAgents: Object.keys(offRoster).sort() } };   // F(M-11)
  try {
    if (!useCache) return result;   // F-31: a fixture read never writes prod's key
    var payload = JSON.stringify(result);
    // C10 (cycle 10): CacheService hard-caps values at 100KB — an oversized
    // put THROWS (caught below, but every subsequent read then re-reads the
    // DQE window twice per open). Skip the doomed put explicitly with a
    // headroom margin so the behavior is deliberate + logged, not an
    // exception path; a large-team YTD aggregate is the realistic trigger.
    if (payload.length > 95000) {
      console.warn('CDR cache SKIPPED (payload ' + payload.length + ' bytes > 95KB headroom) for ' +
        cacheKey + ' — every read of this range re-scans the DQE tab until the range narrows.');
    } else {
      if (payload.length > 90000) {
        console.warn('CDR cache payload near 100KB limit: ' + payload.length + ' bytes for ' + cacheKey);
      }
      cache.put(cacheKey, payload, CONFIG.CDR_CACHE_TTL);
    }
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

  // H3: span-bounded (see cdrDqeWindowSpan_); the per-row filter below stays.
  var span = cdrDqeWindowSpan_(sheet, lastRow, from, to, tz);
  var range = span ? sheet.getRange(span.startRow, 1, span.numRows, 34) : null;
  var values = range ? range.getValues() : [];
  var displays = range ? range.getDisplayValues() : [];

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
    if (attSec > 0 && ans > 0) { a.attSum += attSec * ans; a.attCount += ans; }   // M3: answered-weighted
    if (!a._dates[dateIso]) { a._dates[dateIso] = true; a.daysActive++; }

    // T4 #5/#6 — per-rep-per-day matrix for the anonymized team-avg + own
    // trend (metricsTeamAvgSeries_ / metricsBuildKpiSeries_ consume this).
    if (!perRepDaily[dateIso]) perRepDaily[dateIso] = {};
    var prd = perRepDaily[dateIso][agent] ||
      (perRepDaily[dateIso][agent] = { rung: 0, answered: 0, missed: 0, _attSum: 0, _attCount: 0 });
    prd.rung += rung; prd.answered += ans; prd.missed += missed;
    if (attSec > 0 && ans > 0) { prd._attSum += attSec * ans; prd._attCount += ans; }   // M3
  }

  Object.keys(daily).forEach(function (d) {
    daily[d].pctAnswered = cdrAnswerPct_(daily[d].answered, daily[d].missed);   // H2
  });
  Object.keys(agents).forEach(function (k) {
    var a = agents[k];
    a.attSeconds = a.attCount > 0 ? Math.round(a.attSum / a.attCount) : 0;
    a.pctAnswered = cdrAnswerPct_(a.totalAnswered, a.totalMissed);   // H2
    a.tttFormatted = cdrFmtHms_(a.tttSeconds);
    a.attFormatted = cdrFmtHms_(a.attSeconds);
    delete a._dates; delete a.attSum; delete a.attCount;
  });
  Object.keys(perRepDaily).forEach(function (d) {
    Object.keys(perRepDaily[d]).forEach(function (ag) {
      var p = perRepDaily[d][ag];
      p.pctAnswered = cdrAnswerPct_(p.answered, p.missed);   // H2
      // C17-4 (cycle 17) — a rep-day with zero answered calls has NO average
      // talk time, not an average of 0 (the INV-180 zero-is-absence rule).
      // The literal 0 here fed metricsTeamAvgSeries_ (`v != null` — 0 passes),
      // dragging the anonymized team Avg-Talk benchmark toward 0 on any day a
      // rep answered nothing, while every sibling aggregate already treats
      // att<=0 as absence (`if (att > 0)`). null is skipped by both the team
      // mean and the own-point builder (`raw != null && isFinite(raw)`).
      p.attSeconds = p._attCount > 0 ? Math.round(p._attSum / p._attCount) : null;
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
/** PURE (Node-pinned) — the yyyy-MM-dd WORKDAYS (Mon–Fri, UTC-noon anchored
 *  like every metrics date walk) from `fromIso` to `toIso` inclusive. The
 *  Metrics trends walk THIS instead of every calendar day (operator 2026-09-03
 *  follow-on, shipped 2026-09-04): CDR carries no weekend rows, so a calendar
 *  walk rendered two gaps per week on every sparkline. Weekends only — the
 *  manager trends (mgrWorkdaysEnding_) draw the same line. A reversed range
 *  yields []. */
function metricsWorkdayIsos_(fromIso, toIso, holidays) {
  const out = [];
  // H1: company holidays are not workdays either -- a holiday in the axis is
  // an empty CDR day that reads as a zero. `holidays` is an {iso:true} map;
  // omitted, the company calendar is consulted (federal fallback inside it).
  // The typeof guard keeps the function PURE for the Node pin's bare vm.
  let hol = holidays;
  if (!hol) {
    try { hol = (typeof companyHolidayMap_ === 'function') ? companyHolidayMap_(fromIso, toIso) : {}; }
    catch (e) { hol = {}; }
  }
  const endD = new Date(toIso + 'T12:00:00Z');
  for (let d = new Date(fromIso + 'T12:00:00Z'); d <= endD; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const iso = isoFromUtc_(d);
    if (hol && hol[iso]) continue;
    out.push(iso);
  }
  return out;
}
/** PURE: an {name: true} set from the dashboard's Team Avg Excludes list. */
function cdrExcludeSet_(excludes) {
  var ex = {};
  (excludes || []).forEach(function (n) { var k = String(n == null ? '' : n).trim(); if (k) ex[k] = true; });
  return ex;
}
function metricsTeamAvgSeries_(perRepDaily, dates, valueKey, minCohort, excludes) {
  const min = minCohort || 3;
  const ex = cdrExcludeSet_(excludes);   // H2: INV-26 exclusions leave the benchmark
  return (dates || []).map(function (d) {
    const byRep = (perRepDaily && perRepDaily[d]) || {};
    let sum = 0, count = 0;
    Object.keys(byRep).forEach(function (rep) {
      if (ex[rep]) return;
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
function metricsBuildKpiSeries_(perRepDaily, dates, empName, key, minCohort, excludes) {
  var team = metricsTeamAvgSeries_(perRepDaily, dates, key, minCohort, excludes);
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
/** Pure core of the Transfer-tab header check (Node-pinned). Same matching
 *  rule as validateCdrColumns_: case-insensitive substring at the expected
 *  1-indexed position. Returns an array of mismatch strings (empty = OK). */
function csrTransferHeaderMismatches_(headers) {
  const mismatches = [];
  Object.keys(CSR_TRANSFER_EXPECTED_HEADERS).forEach(function (colStr) {
    const col = Number(colStr);
    const expected = CSR_TRANSFER_EXPECTED_HEADERS[col].toLowerCase();
    const actual = String((headers && headers[col - 1]) || '').toLowerCase().trim();
    if (actual.indexOf(expected) === -1) {
      mismatches.push('col ' + col + ': expected "' + CSR_TRANSFER_EXPECTED_HEADERS[col] + '", got "' + ((headers && headers[col - 1]) || '') + '"');
    }
  });
  return mismatches;
}
function validateCsrTransferColumns_(sheet) {
  if (_csrTransferValidated) return _csrTransferWarning;
  _csrTransferValidated = true;
  try {
    const headers = sheet.getRange(1, 1, 1, CSR_TRANSFER_NUM_COLS).getValues()[0];
    const mismatches = csrTransferHeaderMismatches_(headers);
    if (mismatches.length > 0) {
      _csrTransferWarning = mismatches.join('; ');
      Logger.log('CSR Transfer column validation WARNING: ' + _csrTransferWarning);
    }
  } catch (e) {
    Logger.log('CSR Transfer column validation skipped: ' + e.message);
  }
  return _csrTransferWarning;
}
/** Reads the H:R header row into `[{col, queue}]`, skipping blanks. Pure given
 *  the header array so it unit-tests without a sheet. Reading by NAME is what
 *  makes a reorder inside the block self-correcting. */
function csrTransferQueueColumns_(headers) {
  const out = [];
  if (!headers) return out;
  for (let c = CSRT_QUEUE_COL_FIRST; c <= CSRT_QUEUE_COL_LAST; c++) {
    const name = String(headers[c] == null ? '' : headers[c]).trim();
    if (name) out.push({ col: c, queue: name });
  }
  return out;
}
/** Phase 1 — `opts.withQueues` adds per-queue transfer counts. DEFAULT OFF, so
 *  the three existing 3-arg callers (getDashboardMetrics ×2, getMyMetrics's
 *  trend) are byte-identical and their cached payloads keep their shape (no
 *  INV-85 bump needed). */
function getCsrTransferPerRepDaily_(from, to, rosterNames, opts) {
  const withQueues = !!(opts && opts.withQueues);
  const ss = getCdrSS_();
  const sheet = ss.getSheetByName(CSR_TRANSFER_TAB);
  if (!sheet) return { perRepDaily: {}, agents: {}, meta: { error: 'CSR Transfer Historical Data sheet not found' } };
  const colWarning = validateCsrTransferColumns_(sheet);   // L-2: advisory, never blocks
  const tz = ss.getSpreadsheetTimeZone();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { perRepDaily: {}, agents: {}, meta: { columnWarning: colWarning } };
  const range = sheet.getRange(2, 1, lastRow - 1, CSR_TRANSFER_NUM_COLS);
  const displays = range.getDisplayValues();
  // Header row is a separate 1-row read — the data range starts at row 2.
  const queueCols = withQueues
    ? csrTransferQueueColumns_(sheet.getRange(1, 1, 1, CSR_TRANSFER_NUM_COLS).getDisplayValues()[0])
    : [];
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
    // Cycle-9 L-14: ACCUMULATE like the aggregate below (and the DQE
    // sibling's `prd.rung +=`) instead of overwriting — two rows collapsing
    // to one canonical (rep, date) (an alias row + a raw row, a duplicate
    // import) made the per-day series keep only the LAST row while the range
    // aggregate double-counted: the two shapes silently disagreed. The
    // single-row path keeps the sheet's stored pct byte-identical (the
    // fixture pins 29.79); only a genuine collision recomputes from the
    // accumulated counts (stored pcts can't be averaged).
    const prdT = perRepDaily[dateIso][name];
    if (!prdT) {
      perRepDaily[dateIso][name] = { totalCalls: totalCalls, transferred: transferred, transferPct: pct };
    } else {
      prdT.totalCalls += totalCalls;
      prdT.transferred += transferred;
      if (prdT.totalCalls > 0) prdT.transferPct = Math.round((prdT.transferred / prdT.totalCalls) * 1000) / 10;
    }
    if (!agents[name]) agents[name] = { agent: name, totalCalls: 0, transferred: 0, daysActive: 0, _days: {} };
    const a = agents[name];
    a.totalCalls += totalCalls; a.transferred += transferred;
    if (!a._days[dateIso]) { a._days[dateIso] = true; a.daysActive++; }
    // Phase 1 — per-queue counts, ACCUMULATED on collision exactly like the
    // two totals above (the cycle-9 L-14 rule: an alias row + a raw row
    // collapsing to one canonical (rep, date) must not make the per-day shape
    // and the range aggregate disagree).
    if (withQueues && queueCols.length) {
      const prd = perRepDaily[dateIso][name];
      if (!prd.queues) prd.queues = {};
      if (!a.queues) a.queues = {};
      for (let q = 0; q < queueCols.length; q++) {
        const qn = queueCols[q].queue;
        const cell = String(displays[i][queueCols[q].col] || '').replace(/,/g, '').trim();
        if (cell === '') continue;
        const n = Number(cell);
        if (!isFinite(n) || n === 0) continue;
        prd.queues[qn] = (prd.queues[qn] || 0) + n;
        a.queues[qn] = (a.queues[qn] || 0) + n;
      }
    }
  }
  Object.keys(agents).forEach(function (k) {
    const a = agents[k];
    a.transferPct = a.totalCalls > 0 ? Math.round((a.transferred / a.totalCalls) * 1000) / 10 : null;
    delete a._days;
    // TRANSPARENCY (the operator's actual ask): the per-queue counts are a
    // COMPONENT of `transferred`, not a partition of it — the sheet may route
    // transfers somewhere that has no A_Q_ column. Reporting the attributed
    // subtotal alongside the total lets the UI say "N of M attributed" rather
    // than implying the breakdown is complete. NEVER derive `transferred` by
    // summing queues.
    if (withQueues) {
      a.queues = a.queues || {};
      let qt = 0;
      Object.keys(a.queues).forEach(function (q) { qt += a.queues[q]; });
      a.queueTotal = qt;
      a.queueUnattributed = Math.max(0, a.transferred - qt);
    }
  });
  const meta = { columnWarning: colWarning };
  if (withQueues) {
    meta.queueColumns = queueCols.map(function (q) { return q.queue; });
    // An empty block is worth surfacing: it means the H:R headers are blank,
    // which reads identically to "no transfers" unless we say so.
    if (!queueCols.length) meta.queueWarning = 'No per-queue headers found in columns H:R of ' + CSR_TRANSFER_TAB + '.';
  }
  return { perRepDaily: perRepDaily, agents: agents, meta: meta };
}
/** Phase 4 — resolved queue→department map. Script Property `CDR_QUEUE_GROUPS`
 *  first, else the CONFIG seed. SANITIZE-ON-READ (the getStateTaxRates_ / L-12
 *  rule): a hand-edited property holding anything but {string: [string]}
 *  degrades to the CONFIG fallback rather than being returned as-is, and a
 *  queue listed under two groups is kept only in the FIRST — the grouping is a
 *  partition, and silently double-counting a queue is exactly the class INV-180
 *  exists to prevent. */
function getCdrQueueGroups_() {
  var fallback = CONFIG.CDR_QUEUE_GROUPS || {};
  var raw = null;
  try { raw = PropertiesService.getScriptProperties().getProperty('CDR_QUEUE_GROUPS'); } catch (e) { raw = null; }
  var src = fallback;
  if (raw) {
    try {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) src = parsed;
    } catch (e) { /* corrupt blob → CONFIG fallback */ }
  }
  var out = {}, claimed = {};
  Object.keys(src).forEach(function (g) {
    var name = String(g || '').trim();
    if (!name || !Array.isArray(src[g])) return;
    var members = [];
    src[g].forEach(function (q) {
      var qn = String(q == null ? '' : q).trim();
      if (!qn || claimed[qn]) return;   // first group wins — never double-count
      claimed[qn] = true;
      members.push(qn);
    });
    if (members.length) out[name] = members;
  });
  return out;
}
/** Phase 4 — fold per-queue rows into department rows. PURE (given rows +
 *  groups) so it unit-tests without a sheet.
 *
 *  Sub-queues are DISJOINT from their parents (operator-confirmed 2026-07-31),
 *  so a group total is a plain SUM of its members. If 8x8 ever rolls sub-queue
 *  traffic up into the parent column, this MUST change — summing would then
 *  report a group at roughly 1.5x its real volume. The `reps` count is a UNION,
 *  not a sum: one rep working two queues in a group is one rep.
 *
 *  A queue in no group lands in a single trailing "Ungrouped" row rather than
 *  being dropped or exploded into pseudo-groups — an unmapped queue must stay
 *  visible and legible as unmapped. */
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
/** PHASE 0 (sub-queue work) — READ-ONLY queue inventory over the CDR feed.
 *
 *  The app has always had queue data and has always thrown it away: DQE rows
 *  whose Agent cell is `A_Q_*` (or 'Backup CSR') are dropped by
 *  isCdrQueueSentinel_, `CDR.QUEUE_EXT` (col 4) is declared but read NOWHERE,
 *  and the CSR Transfer tab's per-queue H:R block is fetched into memory on
 *  every read and ignored. Before building any per-queue UI we need FACTS
 *  about the operator's actual sheet, because the whole design rests on one
 *  assumption this repo cannot verify: that DQE carries one row per
 *  (agent, queue, date) rather than one row per (agent, date). If it is the
 *  latter, per-queue REP attribution does not exist in the data at all and the
 *  feature has to change shape.
 *
 *  Cost: ONE narrow read of DQE (3 columns, not the sibling's 34) plus a
 *  bounded tail of the Transfer tab. It is deliberately NOT folded into
 *  getCdrAgentMetrics_'s meta — that result is cached and consumed by every
 *  Metrics call, so widening it would tax the hot path and force an INV-85
 *  cache bump for a diagnostic. Gated OFF by default for the same reason: the
 *  10-minute-per-manager health BADGE and the daily digest call
 *  computeAutomationHealth_ directly and must not pay for this.
 *
 *  PHI-free by construction: queue identifiers, agent-name counts, and row
 *  tallies only — never call content.
 */
function cdrQueueInventory_(from, to) {
  const out = {
    ok: false, from: from, to: to,
    queues: [], sentinels: [], transferCols: [],
    rowsScanned: 0, rowsInWindow: 0,
    agentDateRows: { max: 0, multiCount: 0, sampleMulti: [] },
    truncated: false, error: null,
  };
  try {
    const ss = getCdrSS_();
    const sheet = ss.getSheetByName('DQE Historical Data');
    if (!sheet) { out.error = 'DQE Historical Data sheet not found'; return out; }
    const tz = ss.getSpreadsheetTimeZone();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) { out.ok = true; return out; }

    // F-33 (cycle 20): SPAN-bound, not tail-bound — the H3 posture the two
    // sibling DQE readers already use. The tail scan read the last
    // CDR_QUEUE_SCAN_MAX rows whatever the window asked for, and set
    // `truncated` from the SHEET's length rather than the window's: on a tab
    // longer than the cap the diagnostic said "possibly incomplete" on every
    // single run, for ever, including the runs that had read every row in the
    // window. A caution that is always on is a caution nobody reads (g02).
    // Now the date column decides the rows, and `truncated` means what it
    // says: the WINDOW itself was wider than the cap and the newest `cap` rows
    // of it are what this describes (INV-169).
    const cap = CDR_QUEUE_SCAN_MAX;
    const span = cdrDqeWindowSpan_(sheet, lastRow, from, to, tz);
    if (!span) { out.ok = true; return out; }   // no row in the window
    let startRow = span.startRow, nRows = span.numRows;
    if (nRows > cap) { startRow = span.startRow + (nRows - cap); nRows = cap; out.truncated = true; }
    // Columns 2..4 = DATE, AGENT, QUEUE_EXT. Reading 3 columns instead of 34.
    // Offsets are DERIVED from the enum rather than written as 0/1/2, so the
    // read follows a column move instead of silently reading its neighbour.
    const qFirst = CDR.DATE;
    const qWidth = (CDR.QUEUE_EXT - CDR.DATE) + 1;
    const oDate = CDR.DATE - qFirst, oAgent = CDR.AGENT - qFirst, oQueue = CDR.QUEUE_EXT - qFirst;
    const vals = sheet.getRange(startRow, qFirst, nRows, qWidth).getValues();
    out.rowsScanned = nRows;

    const queues = {};      // queue ext -> {rows, agents:{}}
    const sentinels = {};   // A_Q_* / Backup CSR -> rows
    const agentDate = {};   // "agent|date" -> row count
    for (let i = 0; i < vals.length; i++) {
      const agent = String(vals[i][oAgent] || '').trim();
      if (!agent) continue;
      const dateIso = cdrRowDateIso_(vals[i][oDate], tz);
      if (!dateIso || dateIso < from || dateIso > to) continue;
      out.rowsInWindow++;
      const queueRaw = String(vals[i][oQueue] == null ? '' : vals[i][oQueue]).trim();
      if (isCdrQueueSentinel_(agent)) {
        sentinels[agent] = (sentinels[agent] || 0) + 1;
        continue;   // queue-AGGREGATE row: not a rep row, never an agent/date key
      }
      // The gate question. If DQE is one row per (agent, date), every count
      // here is 1 and per-queue rep attribution is not in the data.
      const key = agent + '|' + dateIso;
      agentDate[key] = (agentDate[key] || 0) + 1;
      const qk = queueRaw || '(blank)';
      if (!queues[qk]) queues[qk] = { queue: qk, rows: 0, agents: {} };
      queues[qk].rows++;
      queues[qk].agents[agent] = true;
    }

    Object.keys(agentDate).forEach(function (k) {
      const n = agentDate[k];
      if (n > out.agentDateRows.max) out.agentDateRows.max = n;
      if (n > 1) {
        out.agentDateRows.multiCount++;
        if (out.agentDateRows.sampleMulti.length < 3) {
          out.agentDateRows.sampleMulti.push({ key: k, rows: n });
        }
      }
    });
    out.queues = Object.keys(queues).map(function (k) {
      return { queue: k, rows: queues[k].rows, agents: Object.keys(queues[k].agents).length };
    }).sort(function (a, b) { return b.rows - a.rows; }).slice(0, CDR_QUEUE_LIST_CAP);
    out.sentinels = Object.keys(sentinels).map(function (k) {
      return { name: k, rows: sentinels[k] };
    }).sort(function (a, b) { return b.rows - a.rows; }).slice(0, CDR_QUEUE_LIST_CAP);

    // The Transfer tab's per-queue block (H:R). Header text tells us what the
    // queues are CALLED there; the populated count tells us whether the
    // columns actually carry data or are a reserved-but-empty block.
    try {
      const trSheet = ss.getSheetByName(CSR_TRANSFER_TAB);
      if (trSheet) {
        const trLast = trSheet.getLastRow();
        const headers = trSheet.getRange(1, 1, 1, CSR_TRANSFER_NUM_COLS).getDisplayValues()[0];
        if (trLast >= 2) {
          const trCap = Math.min(trLast - 1, CDR_QUEUE_SCAN_MAX);
          const trStart = trLast - trCap + 1;
          const trVals = trSheet.getRange(trStart, 1, trCap, CSR_TRANSFER_NUM_COLS).getDisplayValues();
          // Columns H..R are 0-indexed 7..17 — everything between the counts
          // CSRT reads and the trailing Comments column.
          // C17 batch-3: derived from the CSRT constants — this scan
          // re-hardcoded 7..17 thirty lines below a comment calling bare
          // positional offsets the F1 class (INV-184); a block move updated
          // via the constants would have silently split the two halves of
          // the same Automation Health card.
          for (let c = CSRT_QUEUE_COL_FIRST; c <= CSRT_QUEUE_COL_LAST; c++) {
            let populated = 0;
            for (let r = 0; r < trVals.length; r++) {
              const cell = String(trVals[r][c] == null ? '' : trVals[r][c]).trim();
              if (cell !== '' && cell !== '0') populated++;
            }
            out.transferCols.push({
              col: c + 1, header: String(headers[c] || '').trim(), populated: populated, scanned: trVals.length,
            });
          }
        }
      }
    } catch (trErr) {
      out.transferError = trErr.message;   // best-effort — the DQE half still reports
    }

    // PHASE 1 consumer. The occupancy counts above answer "do these columns
    // carry data at all" over a long tail; this answers "how many transfers
    // landed in each queue IN THE WINDOW, and how many reps contributed" —
    // and it does so through the REAL reader, so the production code path is
    // exercised on live data rather than only by fixtures. Costs one extra
    // read of the Transfer tab on an admin panel that already does a
    // 34-column span-bounded DQE read; best-effort like everything else here.
    try {
      const tr = getCsrTransferPerRepDaily_(from, to, null, { withQueues: true });
      const totals = {}, reps = {};
      const ag = tr.agents || {};
      Object.keys(ag).forEach(function (nm) {
        const qs = ag[nm].queues || {};
        Object.keys(qs).forEach(function (q) {
          totals[q] = (totals[q] || 0) + qs[q];
          if (!reps[q]) reps[q] = {};
          reps[q][nm] = true;
        });
      });
      out.transferQueueTotals = Object.keys(totals).map(function (q) {
        return { queue: q, transferred: totals[q], reps: Object.keys(reps[q]).length };
      }).sort(function (a, b) { return b.transferred - a.transferred; }).slice(0, CDR_QUEUE_LIST_CAP);
      out.transferQueueMeta = {
        columns: (tr.meta && tr.meta.queueColumns) || [],
        warning: (tr.meta && tr.meta.queueWarning) || null,
      };
    } catch (qErr) {
      out.transferQueueError = qErr.message;
    }

    out.ok = true;
    return out;
  } catch (e) {
    out.error = e.message;
    return out;
  }
}

// ── Metrics public endpoints ──────────────────────────────────────────
/** Pure (Node-pinned) — resolve a period key to {from,to,label} given today's
 *  ISO date (yyyy-MM-dd, in the caller's tz). String/UTC math only.
 *
 *  M2 (cycle 22): 'yesterday' is the previous WORKDAY (prevWorkdayIso_ — skips
 *  weekends and company holidays), not the calendar day. The CDR has no rows
 *  for a Sunday or a holiday, so the calendar form was an empty card every
 *  Monday and every morning after a holiday. The label names the date when it
 *  is not literally yesterday, so "Yesterday" never sits over Friday's calls.
 *  `holidays` is an {iso:true} map (Node pins pass one); omitted, the company
 *  calendar is consulted by prevWorkdayIso_.
 *
 *  M8 (cycle 22): MTD/YTD carry `dataThrough` — the last day the CDR can hold
 *  (calendar yesterday; CDR data is never populated same-day), or null when
 *  the period has no complete day yet. The run-rate projection divides by the
 *  days that HAVE data, not by a today that never does. */
function dashboardPeriodRange_(periodKey, todayIso, holidays) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(todayIso || ''))) return null;
  var y = todayIso.slice(0, 4), m = todayIso.slice(5, 7);
  var fmt = function (x) { return x.getUTCFullYear() + '-' + String(x.getUTCMonth() + 1).padStart(2, '0') + '-' + String(x.getUTCDate()).padStart(2, '0'); };
  var yi = new Date(Date.parse(todayIso + 'T00:00:00Z') - 86400000);
  var calYesterday = fmt(yi);
  if (periodKey === 'yesterday') {
    var iso = prevWorkdayIso_(todayIso, holidays);
    if (!iso) return null;
    var wd = new Date(iso + 'T12:00:00Z');
    var label = (iso === calYesterday) ? 'Yesterday'
      : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][wd.getUTCDay()] + ' ' + DASH_MONTH_ABBR[wd.getUTCMonth()] + ' ' + wd.getUTCDate();
    return { from: iso, to: iso, label: label };
  }
  var through = function (from) { return calYesterday >= from ? calYesterday : null; };
  if (periodKey === 'mtd') { var mf = y + '-' + m + '-01'; return { from: mf, to: todayIso, label: 'Month to date', dataThrough: through(mf) }; }
  if (periodKey === 'ytd') { var yf = y + '-01-01'; return { from: yf, to: todayIso, label: 'Year to date', dataThrough: through(yf) }; }
  return null;
}
/** Pure (Node-pinned) — the LIKE-FOR-LIKE prior window for a period, used for
 *  the MTD deltas (operator 2026-08-12: "show the delta from last month").
 *
 *  MTD compares against the PRIOR MONTH'S SAME ELAPSED DAYS OF DATA, not the whole
 *  prior month. That choice is load-bearing for the VOLUME metrics: on the 12th,
 *  12 days of answered calls against a full 31-day month is not a delta, it is
 *  an arithmetic artifact that would read as a collapse every month and recover
 *  on the 31st. The day is CLAMPED to the prior month's length (Mar 31 → Feb 28
 *  / 29), which makes the comparison SHORTER, never longer — under-reporting is
 *  the safe direction for a figure a rep is judged by. Returns null for periods
 *  we do not compare (yesterday / ytd — deliberately out of scope). */
function dashboardPrevRange_(periodKey, todayIso) {
  if (periodKey !== 'mtd' || !/^\d{4}-\d{2}-\d{2}$/.test(String(todayIso || ''))) return null;
  var y = +todayIso.slice(0, 4), m = +todayIso.slice(5, 7), d = +todayIso.slice(8, 10);
  var py = (m === 1) ? y - 1 : y, pm = (m === 1) ? 12 : m - 1;
  var pLen = new Date(Date.UTC(py, pm, 0)).getUTCDate();
  // M8 (cycle 22): LAG-ALIGNED. The current window runs to today but the CDR
  // holds nothing for today, so it carries d-1 days of data; comparing it with
  // days 1..d of last month gave the prior window a whole extra day (every
  // volume delta read ~1/d low). On the 1st there is no complete day to
  // compare, so there is no comparison.
  var have = d - 1;
  if (have < 1) return null;
  var pd = Math.min(have, pLen);
  var pad = function (n) { return String(n).padStart(2, '0'); };
  return {
    from: py + '-' + pad(pm) + '-01',
    to: py + '-' + pad(pm) + '-' + pad(pd),
    label: DASH_MONTH_ABBR[pm - 1] + (pd === 1 ? ' 1' : ' 1–' + pd),
    clamped: pd < have,
  };
}
/** Pure (Node-pinned) — team CDR aggregate from getCdrAgentMetrics_'s .agents
 *  map. Cohort = agents with totalRung > 0; team is null below minCohort
 *  (INV-124 — a small team can't be back-solved to an individual). ATT is
 *  answered-weighted across agents. */
function dashboardTeamAggregate_(agentsMap, minCohort, excludes) {
  var rung = 0, answered = 0, missed = 0, attWeighted = 0, attDenom = 0, cohort = 0;
  // H2: the dashboard's INV-26 exclusions (a manager on the roster who takes
  // a token number of calls) leave the BENCHMARK, exactly as they leave the
  // dashboard's team average; dept TOTALS (getTeamMetrics.teamTotals) keep
  // everyone, matching its R18 ruling.
  var ex = cdrExcludeSet_(excludes);
  Object.keys(agentsMap || {}).forEach(function (k) {
    var a = agentsMap[k];
    if (!a || !(a.totalRung > 0) || ex[k]) return;
    cohort++;
    rung += a.totalRung; answered += a.totalAnswered || 0; missed += a.totalMissed || 0;
    if (a.attSeconds > 0 && a.totalAnswered > 0) { attWeighted += a.attSeconds * a.totalAnswered; attDenom += a.totalAnswered; }
  });
  if (cohort < minCohort) return { cohort: cohort, team: null };
  return {
    cohort: cohort,
    team: {
      rung: rung, answered: answered, missed: missed,
      pctAnswered: cdrAnswerPct_(answered, missed),   // H2
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
    // v2 (operator 2026-08-06): the team field's semantics changed (cohort
    // guard dropped for this card — see MIN_COHORT below), so stale v1
    // entries must not serve the old hidden-team payload for the TTL.
    // v3 (operator 2026-08-12): the payload gained prev/thresholds, so a stale
    // v2 entry would serve delta-less cards for the TTL after the deploy.
    // v4 (operator 2026-08-18, load-time sweep): the key now carries the
    // rep-local DAY and the TTL rose 300s → DASHBOARD_CACHE_TTL (21600s —
    // the CacheService max, operator-approved same day). The
    // underlying CDR data changes at most once a day (yesterday-and-earlier
    // aggregates), so the 5-min TTL re-paid the whole-roster MTD/YTD scans
    // ~12×/hour per rep for identical answers; the day in the key makes a new
    // rep-local day a natural miss, so a payload can never straddle midnight.
    // Bounded-staleness trade (INV-43 posture): a load BEFORE the daily CDR
    // import can pin the pre-import aggregate for up to the TTL (the Metrics
    // tabs keep their 5-min caches); after the import lands, the data does
    // not change again that day — the operator's stated acceptance.
    var todayIso = Utilities.formatDate(new Date(), empTz_(emp), 'yyyy-MM-dd');
    // v5 (H2, 2026-09-17): pctAnswered = answered/(answered+missed); the
    // standard (alertThreshold/alertBand/standardSource) rides the payload
    // from the published Dashboard Standards tab; the benchmark applies the
    // dashboard's team-avg excludes.
    // v6 (cycle 22 M2/M8): 'yesterday' is the previous workday, the MTD prior
    // window is lag-aligned, and the payload carries dataThrough.
    var cacheKey = 'dash_metrics_v6:' + emp.id + ':' + periodKey + ':' + todayIso;
    if (useCache) {
      try { var hit = cache.get(cacheKey); if (hit) { var co = JSON.parse(hit); co.cached = true; return co; } } catch (_) {}
    }

    var range = dashboardPeriodRange_(periodKey, todayIso);
    var std = getCdrDashboardStandard_();   // H2 -- one read per execution (memo)
    var ship = cdrStandardShip_(std);
    if (!range) return { error: 'Unknown period.' };
    var from = range.from, to = range.to;

    var roster = getEmployeeRosterRows_();
    var allNames = [];
    for (var r = 1; r < roster.length; r++) {
      var nm = String(roster[r][EMP.NAME] || '').trim();
      if (!nm) continue;
      // F4 (cycle 12): skip rows with no email — the skip every sibling roster
      // walk applies (getManagerDashboard, getTeammateStatus, getEmployeesList,
      // computeMissedClockOuts_, and getCoveragePlan since cycle-9 L-2). These
      // names are the cohort for INV-124's N=3 anonymization guard AND the
      // team benchmark, so an offboarded/placeholder row (name kept, email
      // cleared) whose name still appears in DQE history both inflated the
      // cohort — un-hiding the team line on a day fewer than 3 CURRENT reps
      // reported — and contaminated the average reps compare themselves to.
      if (!empRosterEmail_(roster[r])) continue;   // F3: one predicate
      allNames.push(nm);
    }

    // OPERATOR DECISION (2026-08-06): the Dashboard Team/Department card shows
    // the team aggregate whenever ANY rep reported — the N=3 hide is dropped
    // HERE ONLY. INV-124's per-day anonymized SERIES guard in getMyMetrics
    // (the peer-benchmark surface a small cohort can be back-solved from) is
    // UNCHANGED and must stay 3. team:null now means "no data at all".
    var MIN_COHORT = 1;
    // ONE shaper for the period and its comparison window, so the delta can
    // never be computed from a differently-shaped figure than the value it
    // sits under (the LEAVE_DEDUCTION_CLIENT lesson, inside one function).
    var shapeWindow = function (wFrom, wTo) {
      // ONE pair of reads per window (operator 2026-08-13 — "the cards take a
      // while to load initially"): the caller's own row is DERIVED from the
      // team maps rather than read again. The old shape issued a second
      // [emp.name]-filtered scan of each sheet per window — same rows, same
      // alias map, different roster filter — which doubled the cold-start
      // cost across the 3 periods (and the MTD prev window). emp.name is in
      // allNames by construction: the caller passed getEmployeeInfo_, so
      // their roster row has an email and survives the F3/F4 skip above.
      var dqMap = cdrAgentsOrThrow_(getCdrAgentMetrics_(wFrom, wTo, allNames));   // M7: never cached as no calls
      var trMap = getCsrTransferPerRepDaily_(wFrom, wTo, allNames).agents || {};
      var dq = dqMap[emp.name] || null;
      var tr = trMap[emp.name] || null;
      var agg = dashboardTeamAggregate_(dqMap, MIN_COHORT, std.teamAvgExcludes);   // H2
      var trAgg = dashboardTeamTransfer_(trMap, MIN_COHORT);
      return {
        ownDq: dq,
        own: dq ? {
          rung: dq.totalRung, answered: dq.totalAnswered, missed: dq.totalMissed,
          pctAnswered: dq.pctAnswered, attSeconds: dq.attSeconds, attFormatted: dq.attFormatted,
          transferPct: tr ? tr.transferPct : null, calls: tr ? tr.totalCalls : null,
        } : null,
        team: agg.team ? {
          rung: agg.team.rung, answered: agg.team.answered, missed: agg.team.missed,
          pctAnswered: agg.team.pctAnswered, attSeconds: agg.team.attSeconds,
          transferPct: trAgg.transfer ? trAgg.transfer.transferPct : null,
        } : null,
        cohort: agg.cohort,
      };
    };
    var cur = shapeWindow(from, to);
    var ownDq = cur.ownDq;

    // Prior like-for-like window (MTD only) for the KPI deltas. BEST-EFFORT:
    // a failed comparison read drops the DELTAS, never the numbers — but it is
    // reported (prevUnavailable) rather than rendering as "no change", which is
    // the reassuring-silence failure INV-187 exists to stop.
    var prevRange = dashboardPrevRange_(periodKey, todayIso), prev = null, prevUnavailable = false;
    if (prevRange) {
      try {
        var pShaped = shapeWindow(prevRange.from, prevRange.to);
        prev = {
          from: prevRange.from, to: prevRange.to, label: prevRange.label,
          clamped: !!prevRange.clamped, own: pShaped.own, team: pShaped.team,
        };
      } catch (e) { prevUnavailable = true; }
    }

    // F5: a failed Sheet read must not read as "0 notes filed".
    var noteRes = cnCountNotesResult_(emp, from, to);
    var noteCount = noteRes.count;

    var result = {
      periodKey: periodKey, from: from, to: to, label: range.label,
      dataThrough: range.dataThrough || null,   // M8: the projection's denominator
      own: cur.own,
      team: cur.team,
      cohort: cur.cohort,
      noteCount: noteCount,
      noteCoverage: noteRes.unavailable
        ? null : cnNoteCoverage_(noteCount, ownDq ? ownDq.totalAnswered : 0),
      noteCountUnavailable: !!noteRes.unavailable,   // F5
      kpiMinCohort: MIN_COHORT,
      // Operator 2026-08-12: the KPI banding thresholds ride the payload so the
      // client never mirrors a number the operator can change (INV-186 shape).
      // transferTarget is null when CONFIG leaves it unset → the client renders
      // Transfer % with no tone at all rather than one nobody chose.
      alertThreshold: ship.alertThreshold,   // H2: the published dashboard standard, null = none
      alertBand: ship.alertBand,
      standardSource: ship.standardSource,
      transferTarget: (CONFIG.CDR_TRANSFER_TARGET_PCT == null) ? null : CONFIG.CDR_TRANSFER_TARGET_PCT,
      prev: prev,
      prevUnavailable: prevUnavailable,
    };
    // F5: never stamp a degraded round as fresh — a failed notes read would
    // otherwise be pinned for the full TTL (the L-3 / INV-129 rule). A failed
    // COMPARISON read is the same class: caching it would pin "no deltas" for
    // the TTL after the underlying blip cleared.
    // M2 (cycle 22): a window NOBODY reported in is not cached either. Before
    // the daily CDR import lands, the previous workday is empty for everyone;
    // cached, that empty card was pinned for the whole TTL after the import.
    // A genuinely empty window is cheap to re-read, so the cost is nil.
    if (useCache && !noteRes.unavailable && !prevUnavailable && cur.team) {
      try { cache.put(cacheKey, JSON.stringify(result), DASHBOARD_CACHE_TTL); } catch (_) {}
    }
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
    var myCacheKey = 'metrics_my_v3:' + emp.id + ':' + date;   // v3 (H2): the dashboard's rate formula + published standard + excluded benchmark (INV-85)
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
      if (!nm) continue;
      // F4 (cycle 12): same no-email skip as getDashboardMetrics — this list is
      // the cohort for the INV-124 N=3 anonymization guard and the team
      // average. See the comment there for the full rationale.
      if (!empRosterEmail_(roster[r])) continue;   // F3: one predicate
      allNames.push(nm);
    }
    var breakdown = getCdrDailyBreakdown_(trendFrom, trendTo, allNames);
    var transfer = getCsrTransferPerRepDaily_(trendFrom, trendTo, allNames);
    var dqPRD = breakdown.perRepDaily || {};
    var trPRD = transfer.perRepDaily || {};

    var todayResult = getCdrAgentMetrics_(date, date, [emp.name]);
    var todayCdr = todayResult.agents[emp.name] || null;
    // F-47 (2026-09-17): a reader-returned meta.error (the DQE tab missing or
    // renamed) came back as agents:{} and shipped cdr:null — indistinguishable
    // from "no calls that day". Carry the failure so a consumer can refuse to
    // treat it as zero (the pending-tasks "calls without a note" row did).
    var cdrUnavailable = !!(todayResult.meta && todayResult.meta.error);

    // Date axis for the 30-day window — WORKDAYS only (weekends carry no CDR
    // rows and rendered as gaps).
    var dates = metricsWorkdayIsos_(trendFrom, trendTo);

    // Legacy own % Answered trend (back-compat for the current client) — now
    // sourced from the rep's own row in the all-reps perRepDaily matrix.
    var trend = dates.map(function (iso) {
      var own = dqPRD[iso] && dqPRD[iso][emp.name];
      // M9 (cycle 22): a workday with no CDR row is NO DATA, not zero calls —
      // the rail sparklines drew a PTO day as a dive to 0 (g136's class).
      // Every consumer (mMiniSparkSvg_, mTrendAvg_) skips null.
      return {
        date: iso,
        pctAnswered: own ? own.pctAnswered : null,
        rung: own ? own.rung : null,
        answered: own ? own.answered : null,
        missed: own ? own.missed : null,
      };
    });

    // 5-KPI own-vs-team series (#6); team values are anonymized via the N=3
    // cohort guard (#5). Transfers come from the separate Transfer sheet.
    var MIN_COHORT = 3;
    var std = getCdrDashboardStandard_();   // H2: the published standard + its team-avg excludes
    var ship = cdrStandardShip_(std);
    var series = {
      pctAnswered: metricsBuildKpiSeries_(dqPRD, dates, emp.name, 'pctAnswered', MIN_COHORT, std.teamAvgExcludes),
      answered:    metricsBuildKpiSeries_(dqPRD, dates, emp.name, 'answered', MIN_COHORT, std.teamAvgExcludes),
      missed:      metricsBuildKpiSeries_(dqPRD, dates, emp.name, 'missed', MIN_COHORT, std.teamAvgExcludes),
      attSeconds:  metricsBuildKpiSeries_(dqPRD, dates, emp.name, 'attSeconds', MIN_COHORT, std.teamAvgExcludes),
      transferPct: metricsBuildKpiSeries_(trPRD, dates, emp.name, 'transferPct', MIN_COHORT, std.teamAvgExcludes),
    };

    // F5: distinguish "couldn't read the rep's Sheet" from "zero notes" — this
    // result feeds the Clock coverage strip's "File N missing" CTA.
    var noteRes = cnCountNotesResult_(emp, date, date);
    var noteCount = noteRes.count;
    // Operator 2026-08-25 (batch 6): intake-flagged note count — additive,
    // null on a failed read (absence ≠ 0, INV-180/187).
    var intakeRes = cnCountIntakeNotesResult_(emp, date, date);

    var result = {
      date: date,
      repName: emp.name,
      intakeNotes: intakeRes.unavailable ? null : intakeRes.count,
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
      noteCoverage: noteRes.unavailable
        ? null : cnNoteCoverage_(noteCount, todayCdr ? todayCdr.totalAnswered : 0),
      noteCountUnavailable: !!noteRes.unavailable,   // F5
      cdrUnavailable: cdrUnavailable,                // F-47 — cdr:null by IGNORANCE, not by fact
      trend: trend,
      series: series,
      kpiMinCohort: MIN_COHORT,
      // #5 (operator 2026-08-06) — own transfer scalar for the day (the series
      // carries only the pct; the rail row wants the count too). Null when the
      // Transfer sheet has no row for this rep+date — absence, not zero
      // (INV-180), so the client renders no row rather than a confident 0.
      transfer: (trPRD[date] && trPRD[date][emp.name])
        ? { transferred: trPRD[date][emp.name].transferred,
            transferPct: trPRD[date][emp.name].transferPct }
        : null,
      // #4 / H2 — the answer standard, shipped so the client draws the target
      // line + bands the table off the SAME number the manager's dashboard
      // uses (the published Dashboard Standards tab). No client mirror: a null
      // target renders no line, no tone.
      alertThreshold: ship.alertThreshold,
      alertBand: ship.alertBand,
      standardSource: ship.standardSource,
    };
    // F5: a failed notes read must not be cached as fresh — the Clock coverage
    // strip reads this endpoint, so a 5-minute-pinned degraded result would
    // outlive the transient failure that caused it (the L-3 rule).
    if (useMetricsCache && !noteRes.unavailable) {
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

    // Cycle-9 L-13 — the L-1 endpoint-cache pattern: getCdrDailyBreakdown_ is
    // deliberately uncached (INV-67) and read the full DQE tab with BOTH
    // getValues + getDisplayValues (span-bounded since H3, but still two
    // reads of the window), so every Today/7D/30D preset toggle re-scanned. Keyed by emp.id (no cross-rep reads);
    // error results never cached; bypassed under the CDR test override for
    // the same fixture-masking reason as getMyMetrics.
    var rangeCache = CacheService.getScriptCache();
    var rangeKey = 'metrics_range_v3:' + emp.id + ':' + from + ':' + to;   // v3 (H2): rate formula + published standard (INV-85)
    var useRangeCache = !(typeof _TEST_OVERRIDE_CDR_SS_ID !== 'undefined' && _TEST_OVERRIDE_CDR_SS_ID);
    if (useRangeCache) {
      try {
        var cachedR = rangeCache.get(rangeKey);
        if (cachedR) { var ro = JSON.parse(cachedR); ro.cached = true; return ro; }
      } catch (_) {}
    }

    var std = getCdrDashboardStandard_();   // H2 -- the published standard (memoized per execution)
    var ship = cdrStandardShip_(std);
    var agg = getCdrAgentMetrics_(from, to, [emp.name]);
    var c = (agg && agg.agents && agg.agents[emp.name]) || null;

    // Per-day trend across the range for the sparklines (own row only).
    // L-3 (cycle 11): a thrown breakdown read degrades to trend=[] for THIS
    // response, but the degraded result must never be CACHED as fresh — the
    // "error results never cached" rule applied to the partial-failure case
    // (a transient CDR read failure used to pin an empty sparkline beside a
    // healthy aggregate for the full CDR_CACHE_TTL).
    var trend = [];
    var trendFailed = false;
    try {
      var bd = getCdrDailyBreakdown_(from, to, [emp.name]);
      var prd = (bd && bd.perRepDaily) || {};
      metricsWorkdayIsos_(from, to).forEach(function (iso) {   // workdays only
        var own = prd[iso] && prd[iso][emp.name];
        trend.push({
          date: iso,
          pctAnswered: own ? own.pctAnswered : null,
          answered: own ? own.answered : null,   // M9: no row is no data
          missed: own ? own.missed : null,
        });
      });
    } catch (e) { trend = []; trendFailed = true; }

    // #5 (operator 2026-08-06) — own transfer aggregate over the range.
    // Best-effort like the trend read above: a THROWN read degrades to null
    // for this response and skips the cache put (the L-3 partial-failure
    // rule); a reader-returned meta.error (Transfer tab absent — a steady
    // config state, not transient) also yields null but still caches, per
    // the documented "missing tab → the Transfer trend is simply absent"
    // posture.
    var trTotals = null;
    var transferThrew = false;
    try {
      var trAgg = getCsrTransferPerRepDaily_(from, to, [emp.name]);
      var ta = trAgg && trAgg.agents && trAgg.agents[emp.name];
      if (ta) trTotals = { transferred: ta.transferred, transferPct: ta.transferPct };
    } catch (eTr) { trTotals = null; transferThrew = true; }

    var noteRes = cnCountNotesResult_(emp, from, to);   // F5
    var noteCount = noteRes.count;
    var intakeRes = cnCountIntakeNotesResult_(emp, from, to);   // batch 6 — additive
    var rangeResult = {
      from: from, to: to, repName: emp.name,
      intakeNotes: intakeRes.unavailable ? null : intakeRes.count,
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
      noteCoverage: noteRes.unavailable
        ? null : cnNoteCoverage_(noteCount, c ? c.totalAnswered : 0),
      noteCountUnavailable: !!noteRes.unavailable,   // F5
      trend: trend,
      transfer: trTotals,                                   // #5 — null = absent, never 0
      alertThreshold: ship.alertThreshold,     // #4 / H2 — see getMyMetrics
      alertBand: ship.alertBand,
      standardSource: ship.standardSource,
    };
    if (trendFailed) rangeResult.trendUnavailable = true;   // L-3: honest partial, client-ignorable
    // F5: a failed note read is the same class of partial as a failed trend
    // read (L-3) — never stamp it into the cache as a fresh, confident 0.
    if (useRangeCache && !trendFailed && !transferThrew && !noteRes.unavailable) {
      try { rangeCache.put(rangeKey, JSON.stringify(rangeResult), CONFIG.CDR_CACHE_TTL); } catch (_) {}
    }
    return rangeResult;
  } catch (err) { return { error: err.message }; }
}
/**
 * Manager view: per-rep CDR metrics + note counts for a date range.
 * Accepts either a single date or from/to. Also returns a 30-day team
 * % Answered trend when viewing a single date.
 */
/** The REP view of the team aggregate (operator 2026-08-18: "users should
 *  have the team metrics available as well") — whitelist-BUILT, the
 *  trainStripQuizForRep_ discipline: a field missed by a delete-key copy
 *  can't leak here because nothing rides unless named. Reps get the
 *  TEAM-LEVEL aggregate the Dashboard Team card already summarizes (totals,
 *  trend, the queue/department transfer folds — queue rows carry counts,
 *  never names) and NEVER the per-rep `reps[]` rows or the roster↔CDR name
 *  diagnostics: INV-124's posture is that individual peers' numbers stay
 *  manager-only (My Stats anonymizes the team line for the same reason), and
 *  the reps table names every colleague. `repView: true` tells the client
 *  which shape it holds. */
function teamMetricsRepView_(full) {
  return {
    repView: true,
    from: full.from, to: full.to, date: full.date,
    teamTotals: full.teamTotals,
    trend: full.trend,
    transferMeta: full.transferMeta,
    queueRows: full.queueRows,
    groupRows: full.groupRows,
    alertThreshold: full.alertThreshold,
    alertBand: full.alertBand,             // H2: the amber band rides with the target
    standardSource: full.standardSource,
  };
}
function getTeamMetrics(dateOrFrom, to) {
  try {
    var t0 = Date.now();
    var callerEmp = getEmployeeInfo_();
    // Operator 2026-08-18: enrolled REPS may read the TEAM AGGREGATE (the
    // whitelist-built teamMetricsRepView_ above — applied on BOTH return
    // paths, cache hit included, because the cache stores the FULL manager
    // payload under a caller-free key). Managers keep the full response.
    if (!callerEmp) return { error: 'Your account is not registered.' };

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
    // F3 (cycle 18) — SPAN CAP. Every sibling range endpoint is capped
    // (getMyMetricsRange 92, getMyCallNotesRange 90, buildTimesheetForEmployee_
    // 370); this one was the outlier, and on 2026-08-18 it was opened to every
    // enrolled REP as the whitelist-built aggregate (INV-66). The threat model
    // changed and the cap did not follow: a rep could ask for a decade, driving
    // the full cross-rep note walk plus a per-day CDR breakdown, and mint
    // arbitrarily many distinct org-wide cache keys (`team_metrics_v2:<from>:<to>`)
    // that evict managers' warm entries LRU. 92 matches getMyMetricsRange —
    // the same window the multi-day trend below already refuses to exceed.
    var teamSpanDays = Math.round((Date.parse(toDate + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000) + 1;
    if (teamSpanDays > 92) return { error: 'Range capped at 92 days.' };

    // Endpoint result cache (operator 2026-08-13 "Team Metrics takes a while"):
    // the assembled response for a (from, to) range, org-wide — every manager
    // sees the same aggregate, so the key carries no caller id. Same TTL and
    // test-override bypass as the getMyMetrics/getMyMetricsRange siblings
    // (L-1/INV-129); the WRITE below skips any degraded round, so a partial
    // aggregate is never pinned for the TTL.
    var teamCacheKey = 'team_metrics_v3:' + from + ':' + toDate;   // v3 (H2): rate formula + published standard (INV-85)
    var teamMetricsCache = CacheService.getScriptCache();
    var useTeamCache = !(typeof _TEST_OVERRIDE_CDR_SS_ID !== 'undefined' && _TEST_OVERRIDE_CDR_SS_ID);
    if (useTeamCache) {
      try {
        var cachedTeam = teamMetricsCache.get(teamCacheKey);
        if (cachedTeam) {
          var cto = JSON.parse(cachedTeam); cto.cached = true;
          return callerEmp.isManager ? cto : teamMetricsRepView_(cto);
        }
      } catch (_) {}
    }

    var isSingleDay = (from === toDate);
    var std = getCdrDashboardStandard_();   // H2 -- the published standard (memoized per execution)
    var ship = cdrStandardShip_(std);

    var roster = getEmployeeRosterRows_();
    var rosterNames = [];
    var repMap = {};
    for (var r = 1; r < roster.length; r++) {
      var name = String(roster[r][EMP.NAME]).trim();
      // F3 (cycle 15): an offboarded row keeps its NAME and clears its email.
      // Without this skip such a row still matched DQE history by name, so a
      // departed employee got a full row in the manager's team table and their
      // volume flowed into teamTotals. Seven sibling walks already skipped;
      // this one did not.
      if (!empRosterEmail_(roster[r])) continue;
      var cnSheetId = cnEnrolledSheetId_(roster[r]);   // F14: trimmed predicate
      if (name) {
        rosterNames.push(name);
        repMap[name] = {
          repId: String(roster[r][EMP.ID]).trim(),
          repName: name,
          cnSheetId: cnSheetId || null,
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
      metricsWorkdayIsos_(trendFrom, from).forEach(function (iso) {   // workdays only
        var day = trendBreakdown.daily[iso];
        trendData.push({
          date: iso,
          pctAnswered: day ? day.pctAnswered : null,
          rung: day ? day.rung : null,            // M9: no row is no data
          answered: day ? day.answered : null,
          missed: day ? day.missed : null,
        });
      });
    } else {
      // #8 (operator 2026-08-06) — per-day TEAM trend over the selected range,
      // so a multi-day range gets the hero sparkline instead of a bare number.
      // BEST-EFFORT (the INV-67 posture): a failed read leaves trend null and
      // the client renders the pre-#8 shape — a missing chart is not a
      // reassuring degradation (INV-187's test). Span-capped at 92 days like
      // getMyMetricsRange: getTeamMetrics has no overall span cap, and an
      // unbounded manual range must not trigger this extra per-day span
      // read (the aggregate read above still serves it).
      var rangeSpan = Math.round((Date.parse(toDate + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000) + 1;
      if (rangeSpan >= 2 && rangeSpan <= 92) {
        try {
          var rangeBreakdown = getCdrDailyBreakdown_(from, toDate, rosterNames);
          trendData = [];
          metricsWorkdayIsos_(from, toDate).forEach(function (rIso) {   // workdays only
            var rDay = rangeBreakdown.daily[rIso];
            trendData.push({
              date: rIso,
              pctAnswered: rDay ? rDay.pctAnswered : null,
              rung: rDay ? rDay.rung : null,      // M9: no row is no data
              answered: rDay ? rDay.answered : null,
              missed: rDay ? rDay.missed : null,
            });
          });
        } catch (eRt) { trendData = null; }
      }
    }

    var cdrResult = getCdrAgentMetrics_(from, toDate, rosterNames);
    cdrAgentsOrThrow_(cdrResult);   // M7: a missing DQE tab is an error, not a team that took no calls
    // Cycle-14 Phase 2 — per-queue TRANSFER attribution. BEST-EFFORT, the same
    // posture as the CDR overlay in managerGetShiftStats (INV-67): the Transfer
    // tab is optional, and a manager's whole team table must not disappear
    // because one auxiliary tab is unreachable. On failure `transferMeta.error`
    // is set and the client renders an error strip (INV-175) while the rest of
    // the table stands.
    var trAgents = {}, transferMeta = { available: false, error: null, queueColumns: [] };
    try {
      var trRes = getCsrTransferPerRepDaily_(from, toDate, rosterNames, { withQueues: true });
      if (trRes.meta && trRes.meta.error) {
        transferMeta.error = trRes.meta.error;
      } else {
        trAgents = trRes.agents || {};
        transferMeta.available = true;
        transferMeta.queueColumns = (trRes.meta && trRes.meta.queueColumns) || [];
        transferMeta.queueWarning = (trRes.meta && trRes.meta.queueWarning) || null;
      }
    } catch (trErr) {
      transferMeta.error = trErr.message;
    }
    var reps = [];
    var teamTotals = { rung: 0, answered: 0, missed: 0, tttSeconds: 0, noteCount: 0,
      transferred: 0, queueTotal: 0, transferCalls: 0 };
    var teamQueues = {};        // queue -> {transferred, reps:{}}
    var unmatchedAgents = [];

    Object.keys(repMap).forEach(function (name) {
      var rm = repMap[name];
      var cdr = cdrResult.agents[name] || null;
      // F5: an unreadable per-rep Sheet must not render as "0 notes / 0%
      // coverage" in a manager's team table — that reads as a rep who logged
      // nothing, which is a performance judgement drawn from a failed read.
      var noteRes = cnCountNotesResult_(
        { id: rm.repId, name: rm.repName, callNotesSheetId: rm.cnSheetId }, from, toDate);
      var noteCount = noteRes.count;
      // Batch 6 (2026-08-25): intake-flagged count per rep — the visual
      // correlation beside ATT ("this rep's long talk time carried N intake
      // calls"), never a modeled adjustment. Null on a failed read.
      var intakeRes = cnCountIntakeNotesResult_(
        { id: rm.repId, name: rm.repName, callNotesSheetId: rm.cnSheetId }, from, toDate);

      var rep = {
        intakeNotes: intakeRes.unavailable ? null : intakeRes.count,
        repId: rm.repId, repName: rm.repName,
        totalRung:    cdr ? cdr.totalRung    : 0,
        totalAnswered: cdr ? cdr.totalAnswered : 0,
        totalMissed:  cdr ? cdr.totalMissed  : 0,
        // M1 (cycle 22): no call-data row is NO rate, not 0% — a rep who took
        // no calls in the range (PTO, non-phone day, the lagged Today) rendered
        // as a red "0%" beside colleagues who answered nine in ten. The table
        // draws null as "—" and sorts it lowest; the H2 formula
        // (cdrAnswerPct_) already returns null when there is no denominator.
        pctAnswered:  cdr ? cdr.pctAnswered  : null,
        tttFormatted: cdr ? cdr.tttFormatted : '0:00:00',
        attFormatted: cdr ? cdr.attFormatted : '0:00:00',
        tttSeconds:   cdr ? cdr.tttSeconds   : 0,
        attSeconds:   cdr ? cdr.attSeconds   : 0,
        noteCount: noteCount,
        noteCoverage: noteRes.unavailable
          ? null : cnNoteCoverage_(noteCount, cdr ? cdr.totalAnswered : 0),
        noteCountUnavailable: !!noteRes.unavailable,   // F5
        hasCdrData: !!cdr,
      };
      // Phase 2 — transfers + their per-queue split. INV-180: `queues` is a
      // COMPONENT of `transferred`, so `queueUnattributed` rides along and the
      // total is never derived by summing queues.
      var tr = trAgents[name] || null;
      rep.transferred = tr ? tr.transferred : 0;
      rep.transferPct = tr ? tr.transferPct : null;
      rep.queues = (tr && tr.queues) || {};
      rep.queueTotal = tr ? (tr.queueTotal || 0) : 0;
      rep.queueUnattributed = tr ? (tr.queueUnattributed || 0) : 0;
      rep.hasTransferData = !!tr;
      // F5: a rep whose Sheet failed to read is still listed (their CDR row is
      // real) — the row just says "—" for notes instead of "0".
      if (cdr || noteCount > 0 || noteRes.unavailable) {
        reps.push(rep);
        teamTotals.rung += rep.totalRung;
        teamTotals.answered += rep.totalAnswered;
        teamTotals.missed += rep.totalMissed;
        teamTotals.tttSeconds += rep.tttSeconds;
        teamTotals.noteCount += noteCount;
        if (noteRes.unavailable) teamTotals.noteCountPartial = true;   // F5
        // Batch 6: intake total — sum of the KNOWN counts; any failed rep
        // read marks the total partial (the client renders ≥, INV-187).
        if (rep.intakeNotes != null) teamTotals.intakeNotes = (teamTotals.intakeNotes || 0) + rep.intakeNotes;
        else teamTotals.intakeNotesPartial = true;
        // Phase 2 — team roll-up + the by-queue view's rows. Only reps that
        // made the table contribute, so the two modes always describe the same
        // population.
        teamTotals.transferred += rep.transferred;
        teamTotals.queueTotal += rep.queueTotal;
        // #5 — the team Transfer-% denominator (the Transfer sheet's own
        // Total Calls figure, summed over the same population as the rest of
        // teamTotals). Kept separate from `rung`: the two sheets count calls
        // differently, and pct must use its OWN sheet's denominator.
        teamTotals.transferCalls += (tr && tr.totalCalls) || 0;
        Object.keys(rep.queues).forEach(function (q) {
          if (!teamQueues[q]) teamQueues[q] = { queue: q, transferred: 0, reps: {} };
          teamQueues[q].transferred += rep.queues[q];
          teamQueues[q].reps[rep.repName] = true;
        });
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

    teamTotals.pctAnswered = cdrAnswerPct_(teamTotals.answered, teamTotals.missed);   // H2
    teamTotals.tttFormatted = cdrFmtHms_(teamTotals.tttSeconds);
    // F5 (cycle 16): the PER-REP coverage is already nulled when that rep's
    // Sheet failed (see the rep block above), but the TEAM total was computed
    // unconditionally from the understated sum — so the rail row said "partial"
    // while the hint four lines below it in the client rendered a confident
    // "Team-wide coverage below 80%" from the same contaminated number. A
    // coverage figure assembled from an incomplete numerator is not a coverage
    // figure (INV-129); noteCount still rides so the count itself is visible
    // beside its `noteCountPartial` warning.
    teamTotals.noteCoverage = teamTotals.noteCountPartial
      ? null : cnNoteCoverage_(teamTotals.noteCount, teamTotals.answered);
    // #5 — null (not 0) when the Transfer read failed or produced no calls:
    // a pct assembled without its denominator is not a pct (the INV-129 rule).
    teamTotals.transferPct = (transferMeta.available && teamTotals.transferCalls > 0)
      ? Math.round((teamTotals.transferred / teamTotals.transferCalls) * 1000) / 10 : null;

    reps.sort(function (a, b) { return a.repName.localeCompare(b.repName); });

    // Phase 2/4 — computed once so the by-queue and by-department views are
    // literally the same numbers folded two ways.
    var qRows = Object.keys(teamQueues).map(function (q) {
      return { queue: q, transferred: teamQueues[q].transferred,
               reps: Object.keys(teamQueues[q].reps).length };
    }).sort(function (a, b) { return b.transferred - a.transferred; });

    var teamResult = {
      from: from,
      to: toDate,
      date: from,
      reps: reps,
      teamTotals: teamTotals,
      unmatchedAgents: unmatchedAgents,
      rosterWithNoCdr: rosterWithNoCdr,
      // The actionable intersection of the two directions above — see
      // cdrLikelyNameMismatches_ for why neither list alone is a signal.
      likelyMismatches: cdrLikelyNameMismatches_(rosterWithNoCdr, unmatchedAgents),
      trend: trendData,
      // Phase 2 — the "By queue" mode's rows, largest first, and the metadata
      // the client needs to tell "no transfer data" apart from "the read
      // failed" (INV-175).
      transferMeta: transferMeta,
      queueRows: qRows,
      alertThreshold: ship.alertThreshold,   // #4 / H2 — see getMyMetrics
      alertBand: ship.alertBand,
      standardSource: ship.standardSource,

      // Phase 4 — the "By department" mode. Derived server-side from the same
      // qRows the by-queue mode uses, so the two views can never disagree.
      groupRows: groupQueueRows_(qRows, getCdrQueueGroups_()),
      meta: { rowsScanned: cdrResult.meta.rowsScanned, rowsMatched: cdrResult.meta.rowsMatched,
              columnWarning: cdrResult.meta.columnWarning, computeMs: Date.now() - t0 },
    };
    // Cache ONLY a fully-successful round (INV-129): a per-rep-Sheet failure
    // (noteCountPartial) or ANY transfer-read error would pin a degraded
    // aggregate as authoritative for the TTL. On a deployment with no Transfer
    // tab this endpoint simply stays uncached — the pre-cache behaviour.
    if (useTeamCache && !teamTotals.noteCountPartial && !transferMeta.error) {
      try { teamMetricsCache.put(teamCacheKey, JSON.stringify(teamResult), CONFIG.CDR_CACHE_TTL || 300); }
      catch (_) { /* >100KB or transient — the cache is a convenience */ }
    }
    return callerEmp.isManager ? teamResult : teamMetricsRepView_(teamResult);
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
    // H2: the cutoff is the published dashboard standard. Threshold rides in
    // the cache key (INV-85 versioned-key discipline) so a republished
    // standard takes effect on the next poll instead of serving a badge
    // computed against the old cutoff for up to the TTL. No standard → no
    // badge, and the response SAYS so (never a hand-carried cutoff).
    var ambientStd = getCdrDashboardStandard_();
    var ambientThreshold = ambientStd.target;
    if (ambientThreshold == null) return { badge: null, unavailable: 'standard', standardSource: ambientStd.source };
    var ck = 'metrics_ambient_v2:' + ambientThreshold;
    var cached = cache.get(ck);
    if (cached) { try { return JSON.parse(cached); } catch (_) {} }

    // The badge day is the PREVIOUS WORKDAY before the manager-tz "today"
    // (F-35, 2026-09-17) -- the same prevWorkdayIso_ the rep's pending-tasks
    // card and the shift-stats overlay use, stepping over weekends AND the
    // company holidays (H1). Calendar-yesterday went silent every Sunday and
    // Monday (a weekend yesterday) and judged the morning after a holiday on
    // an empty CDR day. Manager tz, not the script's, so the date does not
    // drift near midnight / DST when the two differ.
    var now = new Date();
    var mgrTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
    var todayMgr = Utilities.formatDate(now, mgrTz, 'yyyy-MM-dd');
    var yIso = prevWorkdayIso_(todayMgr);
    if (!yIso) return { badge: null };

    var roster = getEmployeeRosterRows_();
    var names = [];
    for (var r = 1; r < roster.length; r++) {
      // C17-3 (cycle 17) — INV-183: this was the fifteenth roster walk, and
      // the one with NO inclusion guard at all (a shape the F3 tripwire's
      // banned-pattern scan can't see). An offboarded row (name kept, email
      // cleared) whose name still matches DQE history contaminated the team
      // answer rate behind the manager alert badge.
      if (!empRosterEmail_(roster[r])) continue;
      var n = String(roster[r][EMP.NAME]).trim();
      if (n) names.push(n);
    }

    var result = getCdrAgentMetrics_(yIso, yIso, names);
    var totalAns = 0, totalMissed = 0, anyRung = false;
    Object.keys(result.agents).forEach(function (k) {
      totalAns += result.agents[k].totalAnswered;
      totalMissed += result.agents[k].totalMissed;
      if (result.agents[k].totalRung > 0) anyRung = true;
    });
    var pct = (anyRung && (totalAns + totalMissed) > 0) ? cdrAnswerPct_(totalAns, totalMissed) : null;   // H2
    var badge = (pct !== null && pct < ambientThreshold)
      ? { type: 'warn', label: pct + '%', date: yIso } : null;
    var out = { badge: badge, pctAnswered: pct, date: yIso, threshold: ambientThreshold };
    try { cache.put(ck, JSON.stringify(out), CONFIG.CDR_CACHE_TTL); } catch (_) {}
    return out;
  } catch (err) {
    // C17-3 — a permanently failing CDR read makes the badge's ABSENCE
    // indistinguishable from a healthy team (INV-187's reassuring-degradation
    // test). The badge surface has no error affordance, so the DESIGNATED
    // detector for a broken CDR read stays the Automation Health CDR card +
    // failure digest; this catch now at least logs instead of `catch (_)`.
    try { console.warn('getMetricsAmbient failed: ' + err.message); } catch (_) {}
    return { badge: null };
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  INTAKE MODULE  —  PPD + PMD/PAP account-creation forms
//  Ported from the bound "form-generator" Apps Script. That reference copy was
//  DELETED in cycle 13 once the port was settled — it lives in git history at
//  incoming/form-generator/, last present as of commit 9586b29.
//  Web-app rewrite: the bound tool used the active sheet's cells as the form;
//  here each form is a web form whose answers arrive as a payload, render a
//  branded email (esc_'d throughout — closing the original's raw-interpolation
//  XSS hole), persist a PHI backup row to the Intake spreadsheet, and write a
//  PHI-free audit row. Two-stage (preview→send), bodyHash-guarded like the
//  Call Notes email flow (INV-41). The PPD recommendation engine
//  (intakeFilterRecommendations_) is server-authoritative + Node-tested.
// ════════════════════════════════════════════════════════════════════════════
