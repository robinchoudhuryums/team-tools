// ════════════════════════════════════════════════════════════════════════════
//  UMS TEAM TOOLS — 10_core.js
//  Shared infrastructure: the web-app entry point, instance markers, admin
//  config, diagnostics, automation health, the trigger dispatchers, email
//  chrome, the Script-Property budget, tz/date normalization and the audit log.
//
//  ONE Apps Script project, ONE global scope: these files are the SERVER, in
//  the load order `web-app/.clasp.json` filePushOrder declares. Batch F2 split
//  them out of Code.js as a MOVE — every declaration below is byte-identical to
//  the one it replaced, and the SPLIT-MANIFEST pin proves it.
// ════════════════════════════════════════════════════════════════════════════

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
  // ── Intake recommendation-feedback route ───────────────────────────
  // The "Send feedback" button in a PPD/PMD/PAP email lands here. The
  // recipient is an internal agent; submitIntakeFeedback re-authenticates
  // via getEmployeeInfo_, so this page only COLLECTS the text.
  if (e && e.parameter && e.parameter.intakefb) {
    return serveIntakeFeedbackPage_(e.parameter.intakefb, e.parameter.ft);
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
      '<p>This tool is available only to UniversalMed Supply team members. ' +
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
  // Deploy-version beacon — '' on any failure: the client skips the check
  // entirely on an empty stamp, so a hash problem can never break boot.
  try { tpl.buildStamp = clientBuildHash_(); } catch (_) { tpl.buildStamp = ''; }
  return tpl
    .evaluate()
    .setTitle('UMS Team Tools')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
function clientBuildHash_() {
  if (_clientBuildHashMemo) return _clientBuildHashMemo;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(BUILD_HASH_CACHE_KEY);
  if (cached) { _clientBuildHashMemo = cached; return cached; }
  const idx = HtmlService.createTemplateFromFile('index').getRawContent();
  let all = idx;
  const re = /include\('([^']+)'\)/g;
  let m;
  while ((m = re.exec(idx)) !== null) {
    try { all += include(m[1]); } catch (e) { all += '[missing:' + m[1] + ']'; }
  }
  const buf = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, all, Utilities.Charset.UTF_8);
  let hex = '';
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i] < 0 ? buf[i] + 256 : buf[i];
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  try { cache.put(BUILD_HASH_CACHE_KEY, hex, BUILD_HASH_CACHE_TTL_SEC); } catch (e) {}
  _clientBuildHashMemo = hex;
  return hex;
}
/** The beacon read the shell polls (~15 min). Rep-callable, read-only — a
 *  READ gate returns the bare {error} shape (the GATE-SHAPE contract). */
function getDeployStamp() {
  const emp = getEmployeeInfo_();
  if (!emp) return { error: 'Not authorized.' };
  return { stamp: clientBuildHash_() };
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
/**
 * THE dev-instance predicate (A5, cycle 13). An instance counts as DEV only
 * when it carries BOTH markers: an `INSTANCE_LABEL` **and** an `INSTANCE_IS_PROD`
 * that is explicitly present and not 'true'.
 *
 * WHY the second half is load-bearing: the old test was
 * `label set && !isProdInstance_()`, and `isProdInstance_()` is false whenever
 * the property is UNSET — which is the DEFAULT state of production (both
 * properties are documented as optional, and prod today has neither). So the
 * old predicate inferred "dev" from the mere PRESENCE of a banner label, and
 * labelling prod — something the docs actively recommend so the two tabs can't
 * be confused — silently flipped prod into dev:
 *   • `runNightlySelfTest` would run the FULL `runAllTests` suite against live
 *     payroll / audit / PHI sheets every night at 1am. `assertNotProdInstance_`
 *     does NOT catch this: it only throws when INSTANCE_IS_PROD === 'true'.
 *     `cleanupTestData()` sweeps at the end, but a run killed by the 6-minute
 *     ceiling (exactly what F15's sentinel exists to detect) leaves `TEST_`
 *     rows behind in the Timesheet and AuditLog.
 *   • `devScrubRoster_` would ANONYMIZE THE LIVE ROSTER — replacing every
 *     employee email with `@example.invalid` and blanking column L.
 * An absent marker is now AMBIGUOUS and resolves to NOT-dev, so the failure
 * direction is "a dev tool refuses until you finish configuring dev" instead of
 * "a prod instance quietly behaves like dev".
 */
function isDevInstance_() {
  if (!instanceLabel_()) return false;
  let raw = null;
  try { raw = PropertiesService.getScriptProperties().getProperty('INSTANCE_IS_PROD'); }
  catch (e) { return false; }
  if (raw === null || String(raw).trim() === '') return false;   // unset = ambiguous = not dev
  return String(raw).trim().toLowerCase() !== 'true';
}
/** Throws UNLESS `isDevInstance_()` — the bulletproof guard for dev-only tooling
 *  that MUTATES sheets (the roster scrubber). */
function assertDevInstance_(label) {
  if (!isDevInstance_()) {
    throw new Error((label || 'This dev tool') + ' refuses to run: this is not a confirmed DEV instance. ' +
      'A dev project needs BOTH Script Properties — INSTANCE_LABEL (e.g. "DEV") and ' +
      'INSTANCE_IS_PROD set explicitly to "false". An UNSET INSTANCE_IS_PROD is treated as ' +
      'production, because that is prod\'s default state. See docs/deployment.md.');
  }
}


// ════════════════════════════════════════════════════════════════════════════
//  EMPLOYEE API
// ════════════════════════════════════════════════════════════════════════════
/** Admin-gated, read-only — everything the "Team members" Admin panel needs
 *  from the ROSTER: per-rep readiness (Call Notes enrolled / ManagerEmail
 *  set+known / timezone shape), the form's option lists (managers,
 *  departments, roster timezones), the biweekly-anchor state, and the
 *  email-less rows.
 *
 *  CDR readiness is DELIBERATELY NOT HERE (operator report 2026-08-11: the
 *  panel took seconds to appear). It needs a 7-day read of the whole CDR
 *  Report — the slowest thing on the Admin tab and the only part that touches
 *  a foreign spreadsheet — while everything above comes off the 5-min-cached
 *  roster. Blocking the panel on it made a cheap read wait for an expensive
 *  one; `getOnboardingCdrReadiness` supplies it separately and the client
 *  patches the chips in when it lands. */
function getOnboardingPanel() {
  try {
    var callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    var rows = getEmployeeRosterRows_();
    var managerEmails = getManagerEmails_().map(function (e) { return String(e).toLowerCase(); });
    var reps = [], offboarded = [], tzSeen = {};
    var hasBiweeklyAnchor = false, anchorOwner = '';
    for (var i = 1; i < rows.length; i++) {
      var name = String(rows[i][EMP.NAME] || '').trim();
      var email = empRosterEmail_(rows[i]);   // F3: the one inclusion predicate
      if (!email) {
        // Carry the ID: an offboarded row still RESERVES its employee ID, and
        // an admin hunting an "already in use" conflict needs to see it
        // (operator report 2026-08-08 — these rows are invisible in the
        // active list, which is exactly where the ID hides).
        if (name || String(rows[i][EMP.ID] || '').trim()) {
          // OFFBOARDED vs INCOMPLETE: offboardEmployee clears ONLY column A,
          // so a real offboarded row keeps its timezone / pay cycle /
          // balances. A row with none of those was never onboarded — it is a
          // hand-stubbed placeholder (operator 2026-08-08). Calling it
          // "offboarded" sent an admin looking for departed staff that do not
          // exist; the two states resolve differently, so name them apart.
          var hasRosterData = !!(String(rows[i][EMP.TIMEZONE] || '').trim() ||
                                 String(rows[i][EMP.PAY_CYCLE] || '').trim() ||
                                 String(rows[i][EMP.ANNUAL_LEAVE] || '').trim() ||
                                 String(rows[i][EMP.SICK_LEAVE] || '').trim());
          offboarded.push({ id: String(rows[i][EMP.ID] || '').trim(), name: name,
                            incomplete: !hasRosterData });
        }
        continue;
      }
      var tz = String(rows[i][EMP.TIMEZONE] || '').trim();
      if (tz) tzSeen[tz] = true;
      var mgr = String(rows[i][EMP.MANAGER_EMAIL] || '').trim().toLowerCase();
      if (String(rows[i][EMP.PAY_CYCLE] || '').trim().toLowerCase() === 'biweekly' &&
          String(rows[i][EMP.PAY_ANCHOR] || '').trim() && !hasBiweeklyAnchor) {
        hasBiweeklyAnchor = true; anchorOwner = name;
      }
      reps.push({
        id: String(rows[i][EMP.ID] || '').trim(),
        name: name,
        email: email,
        timezone: tz,
        tzValid: safeTimezone_(tz) === tz || tz === CONFIG.TIMEZONE,
        enrolled: !!cnEnrolledSheetId_(rows[i]),
        managerEmail: mgr,
        managerEmailKnown: !!mgr && managerEmails.indexOf(mgr) >= 0,
        isManager: /^(true|yes|y|1)$/i.test(String(rows[i][EMP.IS_MANAGER] || '').trim()),
      });
    }
    reps.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return {
      reps: reps,
      offboarded: offboarded,
      managers: getManagerEmails_(),
      departments: Object.keys(getDepartmentEmails_()),
      timezones: Object.keys(tzSeen).sort(),
      hasBiweeklyAnchor: hasBiweeklyAnchor,
      anchorOwner: anchorOwner,
      // The client renders "cdr: checking…" for this shape and patches the
      // chips when getOnboardingCdrReadiness lands. Distinct from ok:false,
      // which means the CDR read was ATTEMPTED and failed.
      cdr: { deferred: true },
      callerEmail: String(callerEmp.email || '').toLowerCase(),
    };
  } catch (err) { return { error: err.message }; }
}
function arraysEqual_(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
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
      autoTagRules: getAutoTagRules_(),
      spanishMembers: Object.keys(getSpanishInboxMembers_()).sort(),
      qaMembers: Object.keys(getQaMembers_()).sort(),   // operator testing note 8 — the QA reviewers editor
      breakSchedules: breakSchedulesAdminView_(),
      qaCriteria: { live: getQaScorecardCriteria_(), seed: QA_SCORECARD_CRITERIA },
      deptSla: { defaultHours: CONFIG.CALL_NOTES.DR_SLA_DEFAULT_HOURS || 48,
                 targets: getDeptRequestSlaConfig_(),
                 departments: Object.keys(getDepartmentEmails_() || {}) },
      featureFlags: { registry: FEATURE_FLAGS, values: getFeatureFlagsResolved_() },
      propBudget: propBudgetsFor_(ADMIN_PROP_KEYS_),   // Q2 — "N of 9,000 bytes" per editor, from the STORED value
      propValueMax: PROP_VALUE_MAX,
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
    // Cycle-18 F11 follow-on: the two PHI-free diagnostics windows ride the
    // same panel (additive fields — an older client ignores them).
    const vu = viewUsageRetentionDays_(), ce = clientErrRetentionDays_();
    return {
      archiveDays:          { value: a,  source: srcOf('CN_NOTE_ARCHIVE_DAYS', CONFIG.CALL_NOTES.NOTE_ARCHIVE_DAYS) },
      retentionDays:        { value: r,  source: srcOf('CN_NOTE_RETENTION_DAYS', CONFIG.CALL_NOTES.NOTE_RETENTION_DAYS) },
      archiveRetentionDays: { value: ar, source: srcOf('CN_ARCHIVE_RETENTION_DAYS', CONFIG.CALL_NOTES.ARCHIVE_RETENTION_DAYS) },
      viewUsageDays:        { value: vu, source: srcOf(VIEW_USAGE_RETENTION_PROP, CONFIG.VIEW_USAGE_RETENTION_DAYS) },
      clientErrDays:        { value: ce, source: srcOf(CLIENT_ERR_RETENTION_PROP, CONFIG.CLIENT_ERR_RETENTION_DAYS) },
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
    // Cycle-18 F11 follow-on: the two diagnostics windows are OPTIONAL in the
    // payload — written only when the client sent them, so a client that
    // predates them (or omits them) can never silently reset a window to 0.
    const hasVu = Object.prototype.hasOwnProperty.call(settings, 'viewUsageDays');
    const hasCe = Object.prototype.hasOwnProperty.call(settings, 'clientErrDays');
    const vu = hasVu ? parse(settings.viewUsageDays) : 0, ce = hasCe ? parse(settings.clientErrDays) : 0;
    if (vu === null || ce === null) {
      return { success: false, error: 'Each window must be a whole number of days ≥ 0 (0 = disabled).' };
    }
    const props = PropertiesService.getScriptProperties();
    props.setProperty('CN_NOTE_ARCHIVE_DAYS', String(a));
    props.setProperty('CN_NOTE_RETENTION_DAYS', String(r));
    props.setProperty('CN_ARCHIVE_RETENTION_DAYS', String(ar));
    if (hasVu) props.setProperty(VIEW_USAGE_RETENTION_PROP, String(vu));
    if (hasCe) props.setProperty(CLIENT_ERR_RETENTION_PROP, String(ce));
    writeAuditLog_(callerEmp, 'AdminConfigChange', '', '', false, 0,
      'Updated call-note retention windows (archive=' + a + 'd, purge=' + r + 'd, archivePurge=' + ar + 'd)' +
      (hasVu || hasCe ? '; diagnostics (viewUsage=' + (hasVu ? vu + 'd' : 'unchanged') + ', clientErrors=' + (hasCe ? ce + 'd' : 'unchanged') + ')' : ''),
      callerEmp.email);
    return { success: true, warnings: retentionWarnings_(a, r, ar) };
  } catch (err) { return { success: false, error: err.message }; }
}
/** Manager-gated read of the feature-toggle registry + resolved values
 *  (also embedded in getAdminConfig; kept standalone for testability). */
// NOTE (cycle-11 L-18, kept by decision): no client calls this today — the
// Admin UI reads flags via getAdminConfig().featureFlags. Kept as the
// symmetric read API beside saveFeatureFlags; it delegates to the SAME
// helpers getAdminConfig uses (no parallel logic to drift) and stays
// admin-gated. Same note on getDeptRequestSla.
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
    propSetBounded_('CN_FEATURE_FLAGS', JSON.stringify(clean), { hint: 'the registry is bounded — this cannot happen' });
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
    propSetBounded_('CN_UPDATE_SUGGESTIONS', JSON.stringify(suggestionsJson), { hint: 'remove some suggestions' });
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
    // Q2: the count cap x the body cap advertises ~200KB, but the platform
    // enforces the SERIALIZED size (~9KB), so that is what is checked here.
    propSetBounded_('CN_EMAIL_TEMPLATES', JSON.stringify(clean), { hint: 'shorten or remove a template' });
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
    propSetBounded_('CN_EXTERNAL_LINKS', JSON.stringify(clean), { hint: 'remove a link' });
    writeAuditLog_(callerEmp, 'AdminConfigChange', '', '', false, 0,
      'Updated external quick links (' + clean.length + ')', callerEmp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
}
/** Admin-gated (INV-136 tier — CN config, the saveExternalLinks family).
 *  Persists the auto-tag rules the client matcher runs against Issue +
 *  Resolution text. Validation mirrors getAutoTagRules_'s read-side rebuild
 *  so a rejected save and a sanitized read can never disagree about what a
 *  valid rule is; each error names its rule. */
function saveAutoTagRules(rules) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { success: false, error: 'Admin access required.' };
    if (!Array.isArray(rules)) return { success: false, error: 'Invalid rules list.' };
    if (rules.length > CN_AUTO_TAG_RULE_LIMIT) {
      return { success: false, error: 'Too many rules (max ' + CN_AUTO_TAG_RULE_LIMIT + ').' };
    }
    const clean = [];
    const seen = {};
    for (var i = 0; i < rules.length; i++) {
      const r = rules[i] || {};
      const tag = String(r.tag || '').trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (tag.length < 2 || tag.length > 24) {
        return { success: false, error: 'Rule ' + (i + 1) + ': the tag must normalize to 2–24 kebab-case characters.' };
      }
      if (seen[tag]) return { success: false, error: 'Tag "' + tag + '" appears twice — merge the keyword lists.' };
      seen[tag] = true;
      const kws = (Array.isArray(r.keywords) ? r.keywords : [])
        .map(function (k) { return String(k || '').trim().toLowerCase(); })
        .filter(function (k) { return k.length > 0; });
      for (var j = 0; j < kws.length; j++) {
        if (kws[j].length < 3 || kws[j].length > 60) {
          return { success: false, error: 'Tag "' + tag + '": each keyword needs 3–60 characters.' };
        }
      }
      if (!kws.length) return { success: false, error: 'Tag "' + tag + '" needs at least one keyword.' };
      clean.push({ tag: tag, keywords: kws });
    }
    propSetBounded_('CN_AUTO_TAG_RULES', JSON.stringify(clean), { hint: 'remove a rule or some keywords' });
    writeAuditLog_(callerEmp, 'AdminConfigChange', '', '', false, 0,
      'Updated auto-tag rules (' + clean.length + ')', callerEmp.email);
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
      // C17 batch-5 — a dept name containing a comma (or semicolon) silently
      // corrupts the DeptRequests round-trip: emailFromCallNote stores
      // `departments.join(', ')` in ToDept and every per-dept consumer
      // (drSplitDepts_, the Incoming inbox, SLA-min, deptStats) splits that
      // on ','. "Billing, West" round-trips as two phantom departments.
      // Nothing enforced the comma-free rule the INTAKE_CONDITION_LISTS
      // already documents for the same join-on-comma shape.
      if (/[,;]/.test(keys[i])) return { success: false, error: 'Department name "' + keys[i] + '" cannot contain a comma or semicolon — it would split into two departments everywhere the joined list is parsed.' };
      if (String(keys[i]).trim().length === 0 || keys[i].length > 60) return { success: false, error: 'Department name must be 1–60 characters.' };
      var email = String(deptJson[keys[i]] || '').trim();
      if (!email || email.indexOf('@') < 1) return { success: false, error: 'Invalid email for ' + keys[i] + ': ' + email };
    }
    propSetBounded_('CN_DEPARTMENT_EMAILS', JSON.stringify(deptJson), { hint: 'remove a department' });
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
    propSetBounded_('CN_STATE_TAX_RATES', JSON.stringify(ratesJson), { hint: 'remove a state' });
    writeAuditLog_(callerEmp, 'AdminConfigChange', '', '', false, 0,
      'Updated state tax rates (' + keys.length + ' states)', callerEmp.email);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
}

// ── Compliance audit panel (manager-gated) ──────────────────────────────
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
    // 'errorState' (pre-pilot observability, operator 2026-08-13): the client
    // also beacons from errorStateHtml_ — the one choke point where a HANDLED
    // failure (server {error} response / RPC failure) becomes a warn card a
    // rep can see. Before this, only unhandled exceptions reached the tab.
    const source = (p.source === 'unhandledrejection' || p.source === 'errorState')
      ? p.source : 'onerror';
    // Approximate per-rep hourly rate cap. CacheService isn't atomic — close
    // enough for flood protection on a diagnostics (not audit) channel.
    const cache = CacheService.getScriptCache();
    const rateKey = 'client_err_rate:' + emp.id;
    const n = parseInt(cache.get(rateKey), 10) || 0;
    if (n >= CLIENT_ERR_RATE_MAX_PER_HOUR) return { success: false };
    cache.put(rateKey, String(n + 1), 3600);
    // Batch K (B) — USER lock, not the global script lock: this is a
    // fire-and-forget single-appendRow diagnostics log, and holding the ONE
    // script lock made punch/note writes queue behind error beacons. The
    // user lock still serializes a rep's own double-fires; appendRow itself
    // is atomic, and a rare first-touch tab-create race just fails one
    // best-effort call.
    const lock = LockService.getUserLock();
    lock.waitLock(15000);
    try {
      getOrCreateClientErrorsSheet_().appendRow([
        fmtDate_(new Date()) + ' ' + fmtTime_(new Date()),
        emp.id, view, source, message, stack,
      ]);
    } finally { lock.releaseLock(); }
    // Post-lock (the M-7 no-mail-in-lock rule): the spike alert may send an
    // email, so it runs only after the user lock is released. Best-effort —
    // the beacon's own success never depends on it.
    clientErrSpikeAlert_();
    return { success: true };
  } catch (e) {
    Logger.log('recordClientError failed: ' + e.message);
    return { success: false };
  }
}
/** Best-effort, post-lock. Counts beacons in a rolling CacheService window;
 *  at the threshold (and outside the cooldown) emails MANAGER_EMAILS a
 *  branded alert with the most recent distinct messages. Never throws. */
function clientErrSpikeAlert_() {
  try {
    const cache = CacheService.getScriptCache();
    const n = (parseInt(cache.get('client_err_spike_n'), 10) || 0) + 1;
    cache.put('client_err_spike_n', String(n), CLIENT_ERR_ALERT_WINDOW_SEC);
    if (n < CLIENT_ERR_ALERT_MIN) return;
    if (cache.get('client_err_spike_sent')) return;   // cooldown — one email per window
    cache.put('client_err_spike_sent', '1', CLIENT_ERR_ALERT_COOLDOWN_SEC);
    const recipients = getManagerEmails_();
    if (!recipients.length) return;
    // A small, bounded tail of the tab for the email body — distinct messages
    // only (metadata the beacon already minimized; never form values, INV-150).
    const P = CN_EMAIL_PALETTE;
    let rowsHtml = '', rowsText = '';
    try {
      const sheet = getAdpSS_().getSheetByName(CLIENT_ERRORS_TAB);
      if (sheet && sheet.getLastRow() >= 2) {
        const lastRow = sheet.getLastRow();
        const startRow = Math.max(2, lastRow - 30 + 1);
        const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, 5).getValues();
        const seen = {};
        for (let i = data.length - 1; i >= 0 && Object.keys(seen).length < 5; i--) {
          const msg = String(data[i][4] || '').trim();
          if (!msg || seen[msg]) continue;
          seen[msg] = true;
          rowsHtml += '<li style="padding:3px 0;color:' + P.ink + ';font-size:13px;">' +
            '<span style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:' + P.muted + ';">' +
            esc_(String(data[i][2] || '?')) + '</span> · ' + esc_(msg) + '</li>';
          rowsText += '  [' + String(data[i][2] || '?') + '] ' + msg + '\n';
        }
      }
    } catch (e) { /* body detail is best-effort — the alert still sends */ }
    const inner =
      '<p style="color:' + P.muted + ';font-size:13px;margin:0 0 10px;">' + n +
        ' client error(s) were reported in the last hour across the team&rsquo;s browsers. ' +
        'Most recent distinct messages:</p>' +
      (rowsHtml ? '<ul style="margin:0;padding-left:18px;">' + rowsHtml + '</ul>'
                : '<p style="color:' + P.muted + ';font-size:13px;margin:0;">(could not read the tab for detail)</p>') +
      '<p style="color:' + P.muted + ';font-size:12px;margin:12px 0 0;">Full detail: Manage &rarr; Admin &rarr; Automation Health &rarr; Client errors. ' +
        'At most one of these emails is sent per ' + Math.round(CLIENT_ERR_ALERT_COOLDOWN_SEC / 3600) + 'h.</p>';
    const htmlBody = buildBrandedEmailHtml_('Client errors are spiking', inner,
      { tone: 'danger', subLabel: 'Diagnostics',
        ctaUrl: safeWebAppUrl_('callNotesAdmin'), ctaLabel: 'Open Automation Health' });
    appSendMail_({
      to: recipients.join(','),
      subject: '⚠ UMS Team Tools — client errors spiking (' + n + ' in the last hour)',
      body: n + ' client error(s) in the last hour.\n\n' + rowsText +
        '\nFull detail: Manage → Admin → Automation Health → Client errors.',
      htmlBody: htmlBody,
    });
  } catch (e) { Logger.log('clientErrSpikeAlert_ skipped: ' + e.message); }
}
function getOrCreateViewUsageSheet_() {
  const ss = getAdpSS_();
  let sheet = ss.getSheetByName(VIEW_USAGE_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(VIEW_USAGE_TAB);
    sheet.appendRow([
      `Timestamp (${tzAbbr_(CONFIG.TIMEZONE)})`,
      'EmployeeId', 'View', 'Mode', 'BootTiming',
    ]);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastColumn() < VIEW_USAGE_WIDTH) {
    // Trailing column added 2026-09-04 (boot timing) — the header self-heals
    // like CN_HEADERS; pre-existing rows read a blank cell (no timing).
    sheet.getRange(1, VIEW_USAGE_WIDTH).setValue('BootTiming');
  }
  return sheet;
}
/** PURE (Node-pinned): the stored cell for a client-supplied timing object.
 *  Each phase → a whole non-negative ms count ≤ VIEW_USAGE_TIMING_MAX_MS, else
 *  dropped; nothing usable → '' (the row stays a plain view-enter row). */
function viewUsageTimingCell_(timing) {
  if (!timing || typeof timing !== 'object' || Array.isArray(timing)) return '';
  const out = {};
  let any = false;
  VIEW_USAGE_TIMING_KEYS.forEach(function (k) {
    // null/blank = "this phase was not measured" (the fallback send carries
    // view:null) — Number(null) is 0, which would record a confident 0 ms.
    if (timing[k] === null || timing[k] === undefined || timing[k] === '') return;
    const v = Number(timing[k]);
    if (!isFinite(v) || v < 0 || v > VIEW_USAGE_TIMING_MAX_MS) return;
    out[k] = Math.round(v);
    any = true;
  });
  return any ? JSON.stringify(out) : '';
}
/** Inverse of the cell writer — a blank/corrupt cell reads as no timing. */
function viewUsageTimingParse_(cell) {
  const raw = String(cell || '').trim();
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    return (o && typeof o === 'object') ? o : null;
  } catch (e) { return null; }
}
/** Rep-callable, USER-locked (the recordClientError reasoning — a telemetry
 *  append must never queue punch/note writes behind the ONE script lock),
 *  append-only, shape-validated + rate-capped. Fire-and-forget end to end. */
function recordViewEnter(viewKey, mode, timing) {
  try {
    const emp = getEmployeeInfo_();
    if (!emp) return { success: false };
    const v = String(viewKey || '').trim();
    // Tab keys are ASCII identifiers; the server has no TOOLS registry (it is
    // client-side), so shape + length is the validation.
    if (!/^[A-Za-z][A-Za-z0-9]{1,39}$/.test(v)) return { success: false };
    const m = mode === 'compact' ? 'compact' : 'full';
    const cache = CacheService.getScriptCache();
    const rateKey = 'view_usage_rate:' + emp.id;
    const n = parseInt(cache.get(rateKey), 10) || 0;
    if (n >= VIEW_USAGE_RATE_MAX_PER_HOUR) return { success: false };
    cache.put(rateKey, String(n + 1), 3600);
    const lock = LockService.getUserLock();
    lock.waitLock(15000);
    try {
      getOrCreateViewUsageSheet_().appendRow([
        fmtDate_(new Date()) + ' ' + fmtTime_(new Date()),
        emp.id, v, m, viewUsageTimingCell_(timing),
      ]);
    } finally { lock.releaseLock(); }
    return { success: true };
  } catch (e) {
    Logger.log('recordViewEnter failed: ' + e.message);
    return { success: false };
  }
}
/** PURE (Node-pinned): fold recovered usage events into per-view and per-rep
 *  aggregates. `events` = [{ts, empId, view, mode}] with ts already recovered
 *  to the as-written 'yyyy-MM-dd HH:mm:ss' form; cut7/cut30 are cutoff strings
 *  in the SAME tz+format, so lexicographic compare is chronological. */
function viewUsageAggregate_(events, cut7, cut30) {
  const byView = {}, reps7 = {}, reps30 = {}, byRep = {};
  const boot = { shell: [], state: [], view: [] };
  let n7 = 0, n30 = 0, boot7 = 0;
  (events || []).forEach(function (e) {
    if (!e || !e.ts || e.ts < cut30) return;
    // Boot timings ride the 7-day window only — a startup figure from a month
    // ago describes a build that may no longer be deployed.
    if (e.ts >= cut7 && e.timing && typeof e.timing === 'object') {
      let counted = false;
      VIEW_USAGE_TIMING_KEYS.forEach(function (k) {
        if (e.timing[k] === null || e.timing[k] === undefined || e.timing[k] === '') return;
        const v = Number(e.timing[k]);
        if (isFinite(v) && v >= 0) { boot[k].push(v); counted = true; }
      });
      if (counted) boot7++;
    }
    const v = String(e.view || '?');
    const r = String(e.empId || '?');
    if (!byView[v]) byView[v] = { view: v, n7: 0, n30: 0, reps: {} };
    byView[v].n30++; byView[v].reps[r] = true;
    n30++; reps30[r] = true;
    if (!byRep[r]) byRep[r] = { empId: r, n30: 0, viewCounts: {} };
    byRep[r].n30++;
    byRep[r].viewCounts[v] = (byRep[r].viewCounts[v] || 0) + 1;
    if (e.ts >= cut7) { byView[v].n7++; n7++; reps7[r] = true; }
  });
  const views = Object.keys(byView).map(function (v) {
    return { view: v, n7: byView[v].n7, n30: byView[v].n30, reps30: Object.keys(byView[v].reps).length };
  }).sort(function (a, b) { return b.n30 - a.n30 || a.view.localeCompare(b.view); });
  const reps = Object.keys(byRep).map(function (r) {
    const vc = byRep[r].viewCounts;
    let top = '', topN = 0;
    Object.keys(vc).forEach(function (v) { if (vc[v] > topN) { top = v; topN = vc[v]; } });
    return { empId: r, n30: byRep[r].n30, topView: top };
  }).sort(function (a, b) { return b.n30 - a.n30 || a.empId.localeCompare(b.empId); });
  const stat = function (arr) {
    if (!arr.length) return null;
    const a = arr.slice().sort(function (x, y) { return x - y; });
    const at = function (q) { return a[Math.min(a.length - 1, Math.max(0, Math.ceil(q * a.length) - 1))]; };
    const mid = a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
    return { n: a.length, median: Math.round(mid), p90: Math.round(at(0.9)) };
  };
  return {
    views: views,
    reps: reps,
    totals: { n7: n7, n30: n30, reps7: Object.keys(reps7).length, reps30: Object.keys(reps30).length },
    // Startup: per-phase median + p90 over the trailing 7 days (null = no
    // timed boot in the window — never a 0, INV-187).
    boot: { n7: boot7, shell: stat(boot.shell), state: stat(boot.state), view: stat(boot.view) },
  };
}
/** Admin-gated (INV-136 tier — an operator-priorities surface), read-only,
 *  bounded tail scan. Timestamps recover via normalizeAuditTs_ (same writer
 *  form as ClientErrors); a missing tab (nothing recorded yet) is an EMPTY
 *  aggregate, not an error. */
function getViewUsageStats() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isAdmin) return { error: 'Admin access required.' };
    const empty = viewUsageAggregate_([], '', '');
    const ss = getAdpSS_();
    const sheet = ss.getSheetByName(VIEW_USAGE_TAB);
    if (!sheet || sheet.getLastRow() < 2) return { stats: empty, url: '' };
    let url = '';
    try { url = ss.getUrl() + '#gid=' + sheet.getSheetId(); } catch (e) {}
    const lastRow = sheet.getLastRow();
    const startRow = Math.max(2, lastRow - VIEW_USAGE_SCAN_MAX + 1);
    const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, VIEW_USAGE_WIDTH).getValues();
    const events = [];
    for (let i = 0; i < data.length; i++) {
      const ts = normalizeAuditTs_(data[i][0]);
      if (!ts) continue;
      events.push({ ts: ts, empId: String(data[i][1]), view: String(data[i][2]), mode: String(data[i][3]),
                    timing: viewUsageTimingParse_(data[i][4]) });
    }
    const cut7 = Utilities.formatDate(new Date(Date.now() - 7 * 86400000), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    const cut30 = Utilities.formatDate(new Date(Date.now() - 30 * 86400000), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    return { stats: viewUsageAggregate_(events, cut7, cut30), url: url,
             truncated: (lastRow - 1) > VIEW_USAGE_SCAN_MAX };
  } catch (err) { return { error: err.message }; }
}
/** Bounded ClientErrors tail summary for the Automation Health panel.
 *  Read-only + best-effort — no tab yet (no error ever reported) reads as
 *  zero; timestamps recover via normalizeAuditTs_ (the writer uses the same
 *  'yyyy-MM-dd HH:mm:ss' CONFIG.TIMEZONE form as writeAuditLog_). */
function clientErrorsSummary_(mgrTz) {
  const out = { count: 0, last24h: 0, recent: [], windowDays: CLIENT_ERR_WINDOW_DAYS, url: '' };
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
    // Cycle-9 L-15: the cutoff must be formatted in the tz the rows are
    // STAMPED in (recordClientError writes fmtDate_/fmtTime_ = CONFIG.TIMEZONE)
    // — comparing IST-stamped dates against a manager-tz (CST) cutoff
    // over-included up to ~a day of older rows (the mixed-tz date-compare
    // class INV-92 normalizes the same way).
    const cutoff = fmtDateTz_(cutD, CONFIG.TIMEZONE);
    // Pre-pilot observability: a 24h count feeds automationProblems_ (health
    // dot + failure digest) at a threshold. Same tz-consistent lexicographic
    // compare — both sides are 'yyyy-MM-dd HH:mm:ss' in CONFIG.TIMEZONE.
    const cut24 = Utilities.formatDate(new Date(Date.now() - 24 * 3600000),
      CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    for (let i = data.length - 1; i >= 0; i--) {   // newest-first; append-only tab
      const tsRaw = normalizeAuditTs_(data[i][0]);
      // C6 (cycle 10): a blank/hand-mangled Timestamp cell normalizes to ''
      // (< cutoff), and the old `break` hid every OLDER-INDEXED row above it
      // from the panel with no signal. Skip the malformed row and keep
      // scanning; only a genuinely-older parsed date ends the tail walk.
      if (!tsRaw) continue;
      if (tsRaw.substring(0, 10) < cutoff) break;  // chronological — older rows follow
      out.count++;
      if (tsRaw >= cut24) out.last24h++;
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
/** Shared window resolver: Script Property first (non-empty wins), else the
 *  CONFIG fallback. 0 / negative / unparseable → 0 (disabled — never NaN). */
function retentionWindowDays_(propName, cfgVal) {
  const prop = PropertiesService.getScriptProperties().getProperty(propName);
  const raw = (prop != null && prop !== '') ? prop : (cfgVal || 0);
  const v = parseInt(raw, 10);
  return (isNaN(v) || v < 0) ? 0 : v;
}
function viewUsageRetentionDays_() { return retentionWindowDays_(VIEW_USAGE_RETENTION_PROP, CONFIG.VIEW_USAGE_RETENTION_DAYS); }
function clientErrRetentionDays_() { return retentionWindowDays_(CLIENT_ERR_RETENTION_PROP, CONFIG.CLIENT_ERR_RETENTION_DAYS); }
/** The one-line summary Storage Health shows on the ADP store row, so the two
 *  windows are visible where every other store's policy is (INV-186: unset is
 *  a FACT — "kept" — never a warning). */
function diagRetentionText_() {
  const vu = viewUsageRetentionDays_(), ce = clientErrRetentionDays_();
  return 'diagnostics tabs — ViewUsage ' + (vu > 0 ? vu + 'd purge' : 'kept') +
    ' · ClientErrors ' + (ce > 0 ? ce + 'd purge' : 'kept');
}
/** Epoch ms of a diagnostics Timestamp cell. Both tabs are written
 *  'yyyy-MM-dd HH:mm:ss' in CONFIG.TIMEZONE (recordClientError /
 *  recordViewEnter); Sheets coerces the cell to a Date on read, which
 *  normalizeAuditTs_ recovers in the sheet's own tz. NULL on a blank or
 *  unparseable cell — such a row is never "old" and is NEVER deleted (the
 *  parseRetentionDateMs_ fail-safe). */
function diagTsMs_(cell) {
  const s = normalizeAuditTs_(cell);
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return null;
  try { return Utilities.parseDate(s, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss').getTime(); }
  catch (e) { return null; }
}
/** PURE (Node-pinned): 1-based sheet row indices, any order, duplicates
 *  tolerated → contiguous runs [{start, count}] sorted DESCENDING by start, so
 *  deleting them in order never shifts a run still to be deleted. One
 *  deleteRows per run instead of one deleteRow per row: the tabs are
 *  append-only, so the purgeable rows are one long prefix and a 2000-row run
 *  is ONE call (~0.5s per row otherwise — the INV-153 lock-starvation class). */
function contiguousRowRunsDesc_(rowIdxs) {
  const seen = {};
  const sorted = (rowIdxs || []).map(Number).filter(function (n) {
    if (!isFinite(n) || n < 1 || seen[n]) return false;
    seen[n] = true; return true;
  }).sort(function (a, b) { return a - b; });
  const runs = [];
  sorted.forEach(function (n) {
    const last = runs[runs.length - 1];
    if (last && n === last.start + last.count) last.count++;
    else runs.push({ start: n, count: 1 });
  });
  return runs.reverse();
}
/** Delete rows of `sheet` whose column-A stamp is older than cutoffMs —
 *  OLDEST first (append order), at most `budget` rows. Returns
 *  {removed, hitCap}. Caller holds the lock. */
function diagPurgeTab_(sheet, cutoffMs, budget) {
  const out = { removed: 0, hitCap: false };
  if (!sheet || !(budget > 0)) return out;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return out;
  const col = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const idx = [];
  for (let i = 0; i < col.length && idx.length < budget; i++) {
    const ms = diagTsMs_(col[i][0]);
    if (ms !== null && ms < cutoffMs) idx.push(i + 2);
  }
  if (!idx.length) return out;
  // Sheets REFUSES to delete every non-frozen row of a grid ("not possible to
  // delete all non-frozen rows" — the archive mover's spare-row guard and the
  // _clearTestCallNotes lesson). A window that covers the whole tab would
  // throw on the last run; keep one spare row so the final delete is never
  // "all non-frozen rows".
  if (idx.length >= sheet.getMaxRows() - 1) sheet.insertRowAfter(sheet.getMaxRows());
  contiguousRowRunsDesc_(idx).forEach(function (r) { sheet.deleteRows(r.start, r.count); });
  out.removed = idx.length;
  out.hitCap = idx.length >= budget;
  return out;
}
/** Daily diagnostics purge (trigger #20). No-ops while BOTH windows are 0
 *  (the default) — the early return precedes the lock, so installing the
 *  trigger is harmless. Counts-only audit on every enabled run; a thrown run
 *  stamps AUTOMATION_LAST_ERRORS (a handler that only RETURNS reaches nobody —
 *  the F4 rule) and a clean one clears it. */
function purgeOldDiagnostics() {
  assertManagerCaller_('purgeOldDiagnostics');
  try {
    const vuDays = viewUsageRetentionDays_(), ceDays = clientErrRetentionDays_();
    if (!vuDays && !ceDays) {
      Logger.log('purgeOldDiagnostics: both windows disabled (VIEW_USAGE_RETENTION_DAYS=0, CLIENT_ERR_RETENTION_DAYS=0) — nothing purged.');
      return;
    }
    const ss = getAdpSS_();
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    let vu = { removed: 0, hitCap: false }, ce = { removed: 0, hitCap: false };
    try {
      let budget = DIAG_PURGE_MAX_ROWS_PER_RUN;
      if (vuDays) {
        vu = diagPurgeTab_(ss.getSheetByName(VIEW_USAGE_TAB), Date.now() - vuDays * 86400000, budget);
        budget -= vu.removed;
      }
      if (ceDays) {
        ce = diagPurgeTab_(ss.getSheetByName(CLIENT_ERRORS_TAB), Date.now() - ceDays * 86400000, budget);
      }
    } finally {
      lock.releaseLock();
    }
    const capped = vu.hitCap || ce.hitCap;
    writeAuditLog_(_SYSTEM_AUDIT_EMP_, 'DiagnosticsPurge', '', '', false, 0,
      `viewUsageDays=${vuDays}; clientErrDays=${ceDays}; viewUsageRemoved=${vu.removed}; clientErrorsRemoved=${ce.removed}` +
      (capped ? `; hitPerRunCap=${DIAG_PURGE_MAX_ROWS_PER_RUN}` : ''));
    clearAutomationError_('DiagnosticsPurge');
    Logger.log(`purgeOldDiagnostics: removed ${vu.removed} ViewUsage + ${ce.removed} ClientErrors row(s)` +
      (capped ? ' (per-run cap hit — the backlog drains over successive runs)' : '') + '.');
  } catch (err) {
    stampAutomationError_('DiagnosticsPurge', err.message);
    Logger.log('purgeOldDiagnostics failed: ' + err.message);
  }
}

// ── Automation Health (Admin tab) ────────────────────────────────────────
// Operationalizes the "monitor AuditLog for PersonalSheetSyncFail" gotcha and
// the silent-degradation posture: one manager-gated, read-only aggregate that
// surfaces (a) personal-sheet sync failures, (b) CDR reachability / column
// drift / roster↔agent name mismatches, and (c) the last-seen audit row per
// automation job — so a missing trigger or a drifting external sheet shows up
// in the Admin tab instead of only in Logger / the raw AuditLog.
function stampAutomationError_(job, message) {
  try {
    const props = PropertiesService.getScriptProperties();
    let map = {};
    try { map = JSON.parse(props.getProperty(AUTOMATION_ERROR_PROP)) || {}; } catch (_) {}
    if (!map || typeof map !== 'object' || Array.isArray(map)) map = {};
    map[job] = { at: fmtDate_(new Date()) + ' ' + fmtTime_(new Date()),
                 message: String(message || '').slice(0, 300) };
    propSetBounded_(AUTOMATION_ERROR_PROP, JSON.stringify(map), { mode: 'degrade', shrink: propShrinkDropOldest_ });   // Q1 — drops the OLDEST stamped job first
  } catch (e) { /* best-effort — never break the job's own error path */ }
}
function clearAutomationError_(job) {
  try {
    const props = PropertiesService.getScriptProperties();
    let map = {};
    try { map = JSON.parse(props.getProperty(AUTOMATION_ERROR_PROP)) || {}; } catch (_) {}
    if (!map || typeof map !== 'object' || Array.isArray(map) || !map[job]) return;
    delete map[job];
    propSetBounded_(AUTOMATION_ERROR_PROP, JSON.stringify(map), { mode: 'degrade', shrink: propShrinkDropOldest_ });
  } catch (e) { /* best-effort */ }
}
function readAutomationErrors_() {
  try {
    const map = JSON.parse(PropertiesService.getScriptProperties()
      .getProperty(AUTOMATION_ERROR_PROP)) || {};
    return (map && typeof map === 'object' && !Array.isArray(map)) ? map : {};
  } catch (e) { return {}; }
}
/** PURE-ish: the per-job problem lines for `automationLastRuns`, given the
 *  table above. `nowMs`/`todayDom`/`thisMonth` are passed so the decision is
 *  testable without a clock. */
function automationJobProblems_(lastRuns, errors, nowMs, todayDom, thisMonthPrefix) {
  const out = [];
  const byAction = {};
  (lastRuns || []).forEach(function (a) { if (a && a.action) byAction[a.action] = a.last || null; });
  AUTOMATION_JOB_CHECKS.forEach(function (job) {
    let on = false;
    try { on = !!job.enabled(); } catch (e) { on = false; }
    if (!on) return;                       // not expected to run — never nags
    const last = byAction[job.action];
    if (job.cadence === 'monthly') {
      // In arrears: a row is expected on/just after the 1st. Before the grace
      // day the absence is normal, so the check simply does not apply yet.
      if (todayDom < (job.graceDays || 3)) return;
      const ranThisMonth = !!(last && last.timestampMgr &&
        String(last.timestampMgr).indexOf(thisMonthPrefix) === 0);
      if (!ranThisMonth) {
        out.push('The ' + job.label + ' has not run this month (expected on the 1st) — ' +
          'the trigger may be missing. Re-run installAutomationTriggers().');
      }
    } else if (last && last.ms && (nowMs - last.ms) > job.staleHours * 3600000) {
      out.push('The ' + job.label + ' last ran ' + last.timestampMgr +
        ' (over ' + job.staleHours + 'h ago) — the trigger may be disabled.');
    }
    const err = errors && errors[job.action];
    if (err) {
      out.push('The ' + job.label + ' FAILED on ' + err.at + ': ' + err.message);
    }
  });
  return out;
}
/** Manager-gated, read-only. One bounded AuditLog tail scan (CN_AUDIT_MAX_SCAN
 *  rows, INV-13 spirit) + the 5-min-cached CDR aggregate. Never throws — CDR
 *  unreachability degrades to { cdr: { ok:false, error } } so the rest of the
 *  panel still renders (same best-effort posture as the shift-stats overlay). */
function getAutomationHealth(opts) {
  try {
    const callerEmp = getEmployeeInfo_();
    if (!callerEmp || !callerEmp.isAdmin) return { error: 'Admin access required.' };
    // Phase 0: the panel wants the queue inventory; the 10-min-per-manager
    // BADGE and the daily digest call computeAutomationHealth_ directly and so
    // never pay for it. getDeployReadiness opts out explicitly (it only bands
    // store config — the getStorageHealth({scanEmbeds:false}) precedent).
    const scanQueues = !(opts && opts.scanQueues === false);
    // F9 (cycle 16) — the Offerings catalog check rides the SAME opt-in gate as
    // the queue scan, for the same reason: it opens the Intake spreadsheet, and
    // the badge/digest callers must not pay for a diagnostic.
    return computeAutomationHealth_({ scanQueues: scanQueues, scanCatalog: scanQueues });
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
function computeAutomationHealth_(opts) {
    const mgrTz = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
    // Default OFF: the three direct callers (badge, digest, deploy-readiness)
    // must not pay for a diagnostic scan. Only getAutomationHealth() opts in.
    const scanQueues = !!(opts && opts.scanQueues);
    // F9 (cycle 16) — same gate, same reason (this one opens the Intake store).
    const scanCatalog = !!(opts && opts.scanCatalog);

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
    // F4: a job that catches its own error reports failure to nobody unless the
    // error is stamped somewhere the panel and the digest can read.
    const automationErrors = readAutomationErrors_();

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
        // L-2 (cycle 11): probe the CSR Transfer tab's header layout too — a
        // header-row read only (no data scan). The tab is optional (absent →
        // the Transfer KPI is simply missing, not a drift warning).
        let transferColumnWarning = null;
        try {
          const trSheet = getCdrSS_().getSheetByName(CSR_TRANSFER_TAB);
          if (trSheet) transferColumnWarning = validateCsrTransferColumns_(trSheet);
        } catch (trErr) { transferColumnWarning = null; }
        cdr = {
          ok: true, from: from, to: to,
          rowsMatched: (result.meta && result.meta.rowsMatched) || 0,
          columnWarning: (result.meta && result.meta.columnWarning) || null,
          transferColumnWarning: transferColumnWarning,
          unmatchedAgents: Object.keys(canonicalAgents).filter(function (a) { return !rosterSet[a]; }).sort(),
          rosterWithNoCdr: Object.keys(rosterSet).filter(function (n) { return !canonicalAgents[n]; }).sort(),
        };
        // The ACTIONABLE subset — neither raw direction can drive the status
        // card without pinning it amber forever (see cdrLikelyNameMismatches_).
        cdr.likelyMismatches = cdrLikelyNameMismatches_(cdr.rosterWithNoCdr, cdr.unmatchedAgents);
        // Phase 0 (sub-queue discovery) — opt-in, panel only. Best-effort: a
        // failure here must never take down a health report that is otherwise
        // fine, so it degrades to an error string inside its own field.
        if (scanQueues) {
          try { cdr.queueInventory = cdrQueueInventory_(from, to); }
          catch (qErr) { cdr.queueInventory = { ok: false, error: qErr.message }; }
        }
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
    const DIGEST_STALE_HOURS = { eod: 2, urgent: 26, weekly: 192, trainingOverdue: 26, deptReqReminder: 26, managerBrief: 26, selfTest: 26, coachingRecap: 192, spanishAutoAssign: 2 };
    let digestMap = {};
    try {
      digestMap = JSON.parse(PropertiesService.getScriptProperties()
        .getProperty(DIGEST_LAST_RUN_PROP)) || {};
    } catch (_) {}
    if (!digestMap || typeof digestMap !== 'object' || Array.isArray(digestMap)) digestMap = {};
    // The reported set is DERIVED from the staleness map (INV-179) — a
    // heartbeat with a window but no row here would be stamped and never read.
    const digestHealth = Object.keys(DIGEST_STALE_HOURS).map(function (k) {
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

    // C4 (cycle 10) — lost witness-row counter (WITNESS_AUDIT_FAILS, stamped
    // by writeWitnessAuditLog_ after a failed retry). `recent` = a loss in the
    // last 48h (what the failure digest pushes); the panel shows the total.
    let witnessFails = { count: 0, lastAt: null, lastAction: '', recent: false };
    try {
      const wf = JSON.parse(PropertiesService.getScriptProperties()
        .getProperty('WITNESS_AUDIT_FAILS') || '{}') || {};
      if (Number(wf.count) > 0) {
        witnessFails = {
          count: Number(wf.count), lastAt: Number(wf.lastAt) || null,
          lastAction: String(wf.lastAction || ''),
          recent: !!(Number(wf.lastAt) && (Date.now() - Number(wf.lastAt)) < 48 * 3600000),
        };
      }
    } catch (_) {}

    // K-A alternative — last nightly self-test outcome (SELF_TEST_LAST_RESULT
    // Script Property; null = never ran, the fresh-deploy posture).
    let selfTest = null;
    try {
      const st = JSON.parse(PropertiesService.getScriptProperties().getProperty(SELF_TEST_RESULT_PROP));
      if (st && typeof st === 'object') {
        selfTest = {
          date: String(st.date || ''), mode: String(st.mode || ''),
          pass: Number(st.pass) || 0, fail: Number(st.fail) || 0, skip: Number(st.skip) || 0,
          error: String(st.error || ''),
          // A5: a half-configured instance (labelled, but no explicit
          // INSTANCE_IS_PROD) runs SMOKE and says why, so the downgrade is
          // visible in the panel instead of looking like a settled choice.
          note: String(st.note || ''),
          // F15: the RUNNING sentinel. A run that was KILLED (execution-time
          // limit — not catchable, so the outcome write never happens) leaves
          // this set. `stuck` = it has been "running" far longer than any real
          // suite takes, which means the last run never finished.
          running: !!st.running,
          startedAt: Number(st.startedAt) || null,
          stuck: !!(st.running && Number(st.startedAt) &&
                    (Date.now() - Number(st.startedAt)) > SELF_TEST_STUCK_MS),
        };
      }
    } catch (_) {}

    return {
      syncFails: syncFails,
      automationLastRuns: automationLastRuns,
      automationErrors: automationErrors,
      digests: digestHealth,
      cdr: cdr,
      detectors: detectors,   // Turn C — detector-liveness checks
      clientErrors: clientErrorsSummary_(mgrTz),   // #1 — client error beacon (INV-150)
      witnessFails: witnessFails,   // C4 — lost tamper-witness audit rows
      selfTest: selfTest,     // K-A alternative — nightly self-test outcome
      // F9 (cycle 16) — Offerings catalog shape. null when not scanned (the
      // badge/digest path), so the client can tell "not checked" from "clean".
      intakeCatalog: scanCatalog ? getIntakeCatalogHealth_() : null,
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
/** Batch K (E) — the ONE derivation of "which automation checks are failing",
 *  shared by the daily failure digest AND the shell health-badge endpoint so
 *  the two can never drift (the K-D single-source discipline). Takes a
 *  computeAutomationHealth_() report; returns human-readable problem strings.
 *  Failure classes: (a) stale digest heartbeats (never-ran is NOT a problem —
 *  fresh-deploy posture), (b) stale nightly reconcile (the F1 dead-trigger
 *  signal; only when a prior run EXISTS), (c) personal-sheet sync failures,
 *  (c2) a RECENT lost tamper-witness row (48h window, C4/INV-158), (d) dead
 *  detectors (Turn C — "the job ran" ≠ "the job's detector works"). CDR
 *  reachability is deliberately EXCLUDED (not a trigger; an unset CDR_SS_ID
 *  would false-nag a non-CDR deployment — the panels surface it). */
function automationProblems_(report) {
  const problems = [];
  if (!report) return problems;
  (report.digests || []).forEach(function (d) {
    if (d && d.stale) problems.push('The "' + d.key + '" digest last ran ' + (d.last || 'too long ago') + ' — the trigger may be disabled.');
  });
  // Per-JOB liveness + last-error, DERIVED from AUTOMATION_JOB_CHECKS rather
  // than hand-listed here (Gap4). This block used to check exactly one job
  // (CallNotesReconcile), which is why the PTO accrual credit could fail every
  // month in silence — see F4 and the table's own comment.
  const mgrTzNow = CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE;
  const nowD = new Date();
  automationJobProblems_(
    report.automationLastRuns,
    report.automationErrors,
    Date.now(),
    parseInt(Utilities.formatDate(nowD, mgrTzNow, 'd'), 10),
    Utilities.formatDate(nowD, mgrTzNow, 'yyyy-MM')
  ).forEach(function (m) { problems.push(m); });
  if (report.syncFails && report.syncFails.count > 0) {
    problems.push(report.syncFails.count + ' personal-sheet sync failure(s) in the last ' + report.syncFails.windowDays + ' day(s).');
  }
  if (report.witnessFails && report.witnessFails.recent) {
    problems.push('A tamper-witness audit row was LOST in the last 48h (' +
      report.witnessFails.lastAction + '; ' + report.witnessFails.count +
      ' total) — a signed/submitted record has no independent audit witness. See INV-113/122.');
  }
  (report.detectors || []).forEach(function (c) {
    if (c && c.ok === false) problems.push('Detector dead: ' + c.label + ' — ' + c.detail);
  });
  // (e) K-A alternative — the last nightly self-test reported failures (or
  // crashed). null = never ran, NOT a problem (fresh-deploy posture).
  if (report.selfTest && report.selfTest.fail > 0) {
    problems.push('The nightly self-test (' + (report.selfTest.mode || '?') + ') reported ' +
      report.selfTest.fail + ' failing test(s) on ' + (report.selfTest.date || '?') +
      (report.selfTest.error ? ' — ' + report.selfTest.error : '') + '.');
  }
  // (g) Pre-pilot observability (operator 2026-08-13): a client-error BURST in
  // the last 24h rides the health dot + daily failure digest. THRESHOLDED —
  // INV-150's "a single benign browser quirk must not nag daily" rationale is
  // preserved by the floor, not abandoned; a burst this size means reps are
  // hitting real breakage.
  if (report.clientErrors && report.clientErrors.last24h >= CLIENT_ERR_PROBLEM_MIN) {
    problems.push(report.clientErrors.last24h + ' client error(s) in the last 24h — reps are hitting ' +
      'real breakage. See Admin → Automation Health → Client errors.');
  }
  // (f) F15 — the self-test STARTED and never finished (a stuck {running:true}
  // sentinel). An execution-time-limit kill is not catchable, so without this
  // the run's outcome stayed at the PREVIOUS value — a chronically
  // timing-out suite reported green beside a fresh heartbeat. A run in flight
  // right now is NOT a problem; only a stale sentinel is.
  if (report.selfTest && report.selfTest.stuck) {
    problems.push('The nightly self-test (' + (report.selfTest.mode || '?') +
      ') started on ' + (report.selfTest.date || '?') +
      ' and never finished — it was almost certainly killed by the 6-minute execution limit, ' +
      'so its last reported result is stale. Run it from the editor to see where it stalls.');
  }
  return problems;
}
/** Batch K (E) — lightweight manager health badge behind the shell's Manage
 *  health dot. MANAGER-gated (the failure digest's audience — the Admin-gated
 *  panels stay the detail surface; this returns only a count, no config
 *  detail). Whole-result cached 10 min org-wide; best-effort throughout —
 *  any failure returns {failing:false} silently (the daily digest and the
 *  Admin Automation Health panel are the backstops, so a broken badge must
 *  never noise the shell). */
function getAutomationHealthBadge() {
  try {
    const emp = getEmployeeInfo_();
    if (!emp || !emp.isManager) return { error: 'Manager access required.' };
    const cache = CacheService.getScriptCache();
    const KEY = 'auto_health_badge_v1';
    const hit = cache.get(KEY);
    if (hit) { try { return JSON.parse(hit); } catch (e) {} }
    let res = { failing: false, count: 0 };
    try {
      const problems = automationProblems_(computeAutomationHealth_());
      res = { failing: problems.length > 0, count: problems.length };
    } catch (e) { Logger.log('getAutomationHealthBadge compute failed: ' + e.message); }
    try { cache.put(KEY, JSON.stringify(res), 600); } catch (e) {}
    return res;
  } catch (err) {
    return { failing: false, count: 0 };
  }
}
/** K-A alternative (operator-approved) — nightly IN-PROJECT self-test, the
 *  credential-free stand-in for editor-suite CI. Runs where the code lives:
 *  on the DEV blue-green instance (INSTANCE_LABEL set, INSTANCE_IS_PROD not
 *  'true') the FULL runAllTests suite executes against the copy sheets; on
 *  any other instance (incl. plain prod) only runSmokeTests runs — pure
 *  logic, zero spreadsheet writes, safe on the live store by construction
 *  (and runAllTests' own assertNotProdInstance_ guard stays the backstop).
 *  Outcome lands in the SELF_TEST_LAST_RESULT Script Property, which
 *  computeAutomationHealth_/automationProblems_ surface (Admin panel, shell
 *  health dot, failure digest); a failing run ALSO emails MANAGER_EMAILS
 *  directly (best-effort) with the failed test names. Heartbeat-stamped
 *  BEFORE the run (trigger liveness observable even if the suite crashes,
 *  the INV-151 posture). INV-44 trigger-handler gate. Silent when green. */
function runNightlySelfTest() {
  assertManagerCaller_('runNightlySelfTest');
  stampDigestLastRun_('selfTest');
  const props = PropertiesService.getScriptProperties();
  try {
    if (typeof runSmokeTests !== 'function' || typeof _TEST_STATE === 'undefined') {
      Logger.log('runNightlySelfTest: test suite not present in this project — skipping.');
      return;
    }
    // A5 (cycle 13): the full suite runs ONLY on a CONFIRMED dev instance —
    // both markers present (isDevInstance_). The old inline test inferred dev
    // from the presence of INSTANCE_LABEL alone, so labelling prod (which the
    // docs recommend, to tell the two tabs apart) silently promoted this to
    // `runAllTests` against live payroll every night; assertNotProdInstance_
    // does not catch it, because it only fires on INSTANCE_IS_PROD === 'true'.
    const isDev = isDevInstance_();
    const mode = isDev ? 'full' : 'smoke';
    // …and say so when a HALF-configured dev instance gets downgraded, rather
    // than silently running smoke forever. A labelled instance with no explicit
    // INSTANCE_IS_PROD is exactly the ambiguous case; the note rides the stored
    // result into Automation Health so the operator can finish the setup.
    const needsMarker = !isDev && !!instanceLabel_();
    const note = needsMarker
      ? 'Full suite skipped: INSTANCE_LABEL is set but INSTANCE_IS_PROD is not. ' +
        'Set it explicitly ("false" on dev, "true" on prod) — an unset value is treated as production.'
      : '';
    // F15 (cycle 12) — RUNNING sentinel. The heartbeat above proves the TRIGGER
    // fired, but the outcome below is written only on a normal return or a
    // CATCHABLE throw. An Apps Script execution-time-limit kill is not
    // reliably catchable, and on the dev instance this branch runs the FULL
    // 281-test suite against live spreadsheets — plausibly over the 6-minute
    // ceiling. In that case the heartbeat was fresh while
    // SELF_TEST_LAST_RESULT still held the PREVIOUS result, so a chronically
    // timing-out suite reported GREEN and nothing surfaced it: the mechanism
    // built to catch post-deploy regressions could silently stop running (the
    // cycle-7 "detector that can never fire" class, in the newest detector).
    // Stamping {running:true} first means a killed run leaves the sentinel
    // behind, and automationProblems_ treats a STALE one as a failure.
    try {
      propSetBounded_(SELF_TEST_RESULT_PROP, JSON.stringify({
        running: true, startedAt: Date.now(), mode: mode,
        date: fmtDate_(new Date()) + ' ' + fmtTime_(new Date()),
        pass: 0, fail: 0, skip: 0,
      }), { mode: 'degrade', shrink: propShrinkStripFields_(['note', 'error']) });
    } catch (e) {}
    // Batch S: runAllTests runs the sharded list (smoke, then integration A,
    // then B) SEQUENTIALLY in this one execution — the ~6-min quiet-window
    // runtime sits far under the 30-min ceiling; the Part A/B entry points
    // exist for a mid-shift manual run, not for the nightly.
    if (isDev) runAllTests(); else runSmokeTests();
    const res = {
      date: fmtDate_(new Date()) + ' ' + fmtTime_(new Date()),
      mode: mode, pass: _TEST_STATE.pass, fail: _TEST_STATE.fail, skip: _TEST_STATE.skip,
      note: note,   // A5 — surfaced in the Admin panel; '' on a settled instance
    };
    try { propSetBounded_(SELF_TEST_RESULT_PROP, JSON.stringify(res), { mode: 'degrade', shrink: propShrinkStripFields_(['note', 'error']) }); } catch (e) {}
    if (res.fail > 0) {
      const names = (_TEST_STATE.results || [])
        .filter(function (r) { return r.status === 'FAIL'; })
        .map(function (r) { return r.name; }).slice(0, 20);
      selfTestFailureEmail_(mode, res, names);
    }
    Logger.log('runNightlySelfTest (' + mode + '): ' + res.pass + ' passed, ' + res.fail + ' failed, ' + res.skip + ' skipped.');
  } catch (err) {
    // A crashed run IS a failure — record + email best-effort.
    const res = {
      date: fmtDate_(new Date()) + ' ' + fmtTime_(new Date()),
      mode: 'error', pass: 0, fail: 1, skip: 0,
      error: String(err && err.message || err).substring(0, 300),
    };
    try { propSetBounded_(SELF_TEST_RESULT_PROP, JSON.stringify(res), { mode: 'degrade', shrink: propShrinkStripFields_(['note', 'error']) }); } catch (e) {}
    selfTestFailureEmail_('error', res, [res.error]);
    Logger.log('runNightlySelfTest failed: ' + (err && err.message));
  }
}
/** Best-effort failure notification for the nightly self-test (INV-14 —
 *  never throws). PHI-free: test names / a truncated error only. */
function selfTestFailureEmail_(mode, res, names) {
  try {
    const mgrEmails = getManagerEmails_();
    if (!mgrEmails.length) return;
    const items = (names || []).map(function (n) {
      return '<li style="margin:3px 0;">' + esc_(String(n)) + '</li>';
    }).join('');
    const bodyHtml = '<p style="margin:0 0 10px;">The nightly self-test (' + esc_(mode) + ' mode) reported ' +
      esc_(String(res.fail)) + ' failure(s) — ' + esc_(String(res.pass)) + ' passed, ' +
      esc_(String(res.skip)) + ' skipped.</p>' +
      (items ? '<ul style="margin:0;padding-left:18px;">' + items + '</ul>' : '') +
      '<p style="margin:10px 0 0;">Open the Apps Script editor and run the suite for detail.</p>';
    appSendMail_({
      to: mgrEmails.join(','),
      subject: 'Team Tools — nightly self-test: ' + res.fail + ' failure(s)',
      body: 'Nightly self-test (' + mode + '): ' + res.fail + ' failure(s).\n\n' + (names || []).join('\n'),
      htmlBody: buildBrandedEmailHtml_('Nightly self-test failed', bodyHtml, { tone: 'warn', subLabel: 'Self-Test' }),
    });
  } catch (e) { Logger.log('selfTestFailureEmail_ failed: ' + e.message); }
}
function sendAutomationHealthDigest() {
  assertManagerCaller_('sendAutomationHealthDigest');
  try {
    const mgrEmails = getManagerEmails_();
    if (!mgrEmails.length) { Logger.log('No manager emails — skipping automation-health digest.'); return; }
    let report = null;
    try { report = computeAutomationHealth_(); } catch (e) { Logger.log('automation-health digest: report failed: ' + e.message); }
    if (!report) return;

    const problems = automationProblems_(report);

    if (!problems.length) { Logger.log('automation-health digest: all clear, nothing to send.'); return; }

    const itemsHtml = '<ul style="margin:0;padding-left:18px;">' +
      problems.map(function (p) { return '<li style="margin:4px 0;">' + esc_(p) + '</li>'; }).join('') + '</ul>';
    const bodyHtml = '<p style="margin:0 0 10px;">Automated checks found ' + problems.length +
      ' issue(s) with the Team Tools automation. Open Call Notes → Admin → Automation Health for detail.</p>' + itemsHtml;
    const textBody = 'Automation health — ' + problems.length + ' issue(s):\n\n' +
      problems.map(function (p) { return '• ' + p; }).join('\n') +
      '\n\nOpen Call Notes → Admin → Automation Health for detail.';
    try {
      appSendMail_({
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
    // Drive capability probe — same opt-out posture as the embed scan, so
    // getDeployReadiness keeps its documented "composes, never scans"
    // property (it makes no network call of its own).
    const checkDrive = !opts || opts.checkDrive !== false;
    const props = PropertiesService.getScriptProperties();
    const cfgTz = CONFIG.TIMEZONE;
    const isPlaceholder = storePlaceholder_;

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
      cls: 'Payroll', retention: 'Kept · ' + diagRetentionText_(), prop: 'ADP_SS_ID', id: adpId,
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

    // QA (recordings) store — operator 2026-08-28 #3: the retention field
    // reflects the LIVE review-record window (qaReviewRetentionDays_), so an
    // enabled purge is visible where every other store's policy already is.
    // Review RECORDS only — the QaRecordings index + Drive audio files are
    // never purged (INV-196).
    const qaProp = props.getProperty('QA_SS_ID');
    const qaDays = qaReviewRetentionDays_();
    stores.push(probe({ label: 'QA (recordings)', role: 'QaRecordings index + QaComments + QaScorecards',
      cls: 'QA/HR-adjacent', prop: 'QA_SS_ID', id: qaProp || '',
      retention: qaDays > 0
        ? ('Review-record purge ENABLED — ' + qaDays + ' days (QaComments + QaScorecards only; recordings index + Drive files never touched)')
        : 'Review-record purge disabled (QA_REVIEW_RETENTION_DAYS unset/0) — review records kept',
      source: qaProp ? 'Script Property' : 'unset',
      note: qaProp ? '' : 'Unset → the QA tool shows its not-configured screen (no fallback store, by design — INV-196).' }));

    // Per-rep Call Notes Sheets — probe each enrolled rep (the established
    // cross-rep walk cost, e.g. managerGetUnresolvedActionCount). Summarize
    // reachability + tz drift; list up to 20 problem Sheets.
    const roster = getEmployeeRosterRows_();
    let enrolled = 0, reachable = 0, tzMismatch = 0;
    const problems = [];
    for (let i = 1; i < roster.length; i++) {
      const sid = cnEnrolledSheetId_(roster[i]);   // F14: trimmed predicate
      if (!sid) continue;
      enrolled++;
      const nm = String(roster[i][EMP.NAME] || '').trim();
      try {
        const rss = SpreadsheetApp.openById(sid);
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

    // Drive is the ONE capability every store probe above cannot see: the
    // stores are Sheets, and a missing /auth/drive grant breaks the KB image
    // export, the embed reachability scan and QA recording playback while
    // every row here still reads OK. driveAccessStatus_ is total (it swallows
    // its own failures into granted:null), but keep the call defensive so a
    // surprise can never take down the inventory.
    let drive = null;
    if (checkDrive) {
      try { drive = driveAccessStatus_(); }
      catch (e) { drive = { scope: DRIVE_WRITE_SCOPE, granted: null, error: String((e && e.message) || e),
                            reauthHint: DRIVE_REAUTH_HINT, folderProp: KB_IMAGES_FOLDER_PROP,
                            folderId: '', folderOk: null, folderError: '' }; }
    }
    // F3 — the SECOND app-wide fact no store row can see: where copies of
    // every outgoing email are going. One property read, already memoized;
    // no probe, so it rides every call (unlike the Drive check).
    let mailBcc = null;
    try { mailBcc = mailBccStatus_(); } catch (e) { mailBcc = null; }
    // Q3 — the THIRD app-wide fact no store row can see: the Script Property
    // store itself (a 500KB store, 9KB per value — every operator blob lives
    // there). One read, values counted and never returned.
    let propStore = null;
    try { propStore = scriptPropertiesStatus_(); } catch (e) { propStore = null; }
    return { configTimezone: cfgTz, adpLocale: adpLocale, stores: stores, kbEmbeds: kbEmbeds,
             drive: drive, mailBcc: mailBcc, propStore: propStore };
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
    const storage = getStorageHealth({ scanEmbeds: false, checkDrive: false });   // #3 — deploy-readiness bands store config only; no Drive scan, no network probe
    if (storage && storage.error) return { error: storage.error };
    let automation = {};
    try { automation = getAutomationHealth({ scanQueues: false }) || {}; } catch (e) { automation = {}; }
    const managerCount = getManagerEmails_().length;
    const res = deployReadinessItems_(storage, automation, managerCount);
    return {
      items: res.items, summary: res.summary,
      configTimezone: (storage && storage.configTimezone) || CONFIG.TIMEZONE,
    };
  } catch (err) { return { error: err.message }; }
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
/** Parse a "yyyy-MM-dd'T'HH:mm:ss" timestamp string back to epoch ms in the rep's tz. */
function parseTimestampMs_(tsStr, tz) {
  if (!tsStr) return null;
  try {
    const d = Utilities.parseDate(tsStr, tz, "yyyy-MM-dd'T'HH:mm:ss");
    return d.getTime();
  } catch (e) { return null; }
}
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
  const TONE_WORD = { success: 'Complete', danger: 'Action needed', warn: 'Needs attention', info: 'Update' };
  const statusWord = opts.statusLabel || TONE_WORD[tone];
  // The eyebrow names the MODULE this came from ('Time Clock', 'Payroll', …).
  // It defaults to EMPTY rather than the old generic 'Notification', which said
  // nothing on any email — and repeating the wordmark here would be worse than
  // blank, since it sits directly beside the wordmark.
  const cta = (opts.ctaUrl && opts.ctaLabel)
    ? '<tr><td style="padding:6px 26px 22px;"><a href="' + esc_(opts.ctaUrl) + '" style="display:inline-block;' +
        'font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#ffffff;background:' + P.accent +
        ';text-decoration:none;border-radius:8px;padding:11px 20px;">' + esc_(opts.ctaLabel) + ' &#8594;</a></td></tr>'
    : '';
  return (
    '<div style="margin:0;padding:0;background:' + P.paper + ';">' +
    '<div style="max-width:600px;margin:0 auto;padding:22px 12px;font-family:Arial,Helvetica,sans-serif;color:' + P.ink + ';">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + P.paperCard +
        ';border:1px solid ' + P.line + ';border-radius:12px;overflow:hidden;">' +
        // ── Logo bar. The dept / Intake / form emails all lead with the UMS
        // mark over a navy rule ON THE CARD — leading these with a text
        // wordmark instead was the biggest break in continuity across the
        // app's mail. The mark stays on the light card rather than on a navy
        // band: logoUrl is a JPEG (no transparency), so a navy band would
        // frame a white rectangle.
        '<tr><td style="padding:20px 26px 0;">' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
            // The alt text is STYLED, not incidental: many clients block remote
            // images by default, and an unstyled alt leaves a hole where the
            // identity should be. Blocked -> a navy wordmark; loaded -> the mark.
            '<td style="padding-bottom:14px;border-bottom:2px solid ' + P.brand + ';vertical-align:bottom;' +
              'font-size:15px;font-weight:700;letter-spacing:.4px;color:' + P.brand + ';">' +
              '<img src="' + P.logoUrl + '" alt="UMS Team Tools" style="display:block;border:0;height:40px;width:auto;">' +
            '</td>' +
            '<td align="right" style="padding-bottom:14px;border-bottom:2px solid ' + P.brand + ';' +
              'vertical-align:bottom;font-family:\'Courier New\',monospace;font-size:9px;' +
              'font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:' + P.muted3 + ';">' +
              esc_(opts.subLabel || '') + '</td>' +
          '</tr></table></td></tr>' +
        // ── Status pill + the heading as a REAL heading. The heading used to
        // be an 11px mono chip, which made the one line saying what happened
        // the least prominent thing in the message.
        '<tr><td style="padding:18px 26px 0;">' +
          '<table role="presentation" cellpadding="0" cellspacing="0" style="background:' + T.bg +
            ';border:1px solid ' + T.border + ';border-radius:999px;"><tr><td style="padding:4px 12px;' +
            'font-family:\'Courier New\',monospace;font-size:10px;font-weight:700;letter-spacing:1.2px;' +
            'text-transform:uppercase;color:' + T.text + ';">' + esc_(statusWord) + '</td></tr></table>' +
        '</td></tr>' +
        '<tr><td style="padding:10px 26px 0;font-size:22px;line-height:1.25;font-weight:700;' +
          'letter-spacing:-.01em;color:' + P.ink + ';">' + esc_(heading) + '</td></tr>' +
        // A short tone-coloured rule under the heading carries the semantic
        // state at a size that is actually visible (the old cue was a 9px dot).
        '<tr><td style="padding:12px 26px 0;"><div style="width:46px;height:3px;border-radius:2px;background:' + T.dot + ';"></div></td></tr>' +
        // ── Body
        '<tr><td style="padding:16px 26px 6px;font-size:14px;line-height:1.6;color:' + P.ink + ';">' + bodyHtml + '</td></tr>' +
        cta +
        // ── Footer
        '<tr><td style="padding:0 26px 20px;"><div style="border-top:1px solid ' + P.line +
          ';padding-top:14px;font-family:\'Courier New\',monospace;font-size:10px;letter-spacing:1px;' +
          'text-transform:uppercase;color:' + P.muted3 + ';">UMS Team Tools &middot; automated &middot; do not reply</div></td></tr>' +
      '</table>' +
    '</div></div>'
  );
}
/** Renders an array of [label, value] pairs as the app's detail table for
 *  branded emails — hairline-separated rows with a pale navy tint on
 *  alternating rows, matching the Call Details table in the department emails
 *  (the two used to look like different products). Both label and value are
 *  esc_'d (INV-105). */
function brandedKvRows_(pairs) {
  const P = CN_EMAIL_PALETTE;
  return '<table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;' +
    'margin:6px 0 4px;border:1px solid ' + P.line + ';border-radius:8px;overflow:hidden;">' +
    pairs.map(function (p, idx) {
      const bg = (idx % 2) ? P.navyTint : P.paperCard;
      return '<tr style="background:' + bg + ';">' +
        '<td style="padding:9px 14px;border-top:' + (idx ? '1px solid ' + P.line : 'none') +
          ';color:' + P.muted + ';font-size:11px;font-family:\'Courier New\',monospace;font-weight:700;' +
          'letter-spacing:.8px;text-transform:uppercase;white-space:nowrap;vertical-align:top;width:38%;">' +
          esc_(p[0]) + '</td>' +
        '<td style="padding:9px 14px;border-top:' + (idx ? '1px solid ' + P.line : 'none') +
          ';color:' + P.ink + ';vertical-align:top;">' + esc_(p[1]) + '</td></tr>';
    }).join('') +
  '</table>';
}
/** Round-1 pilot feedback #8 (2026-08-21) — rep-initiated correspondence
 *  should read as coming from the AGENT, not the deploying account. The web
 *  app runs as USER_DEPLOYING, so the true From ADDRESS cannot change (MailApp
 *  always sends as the deployer; a neutral shared sender needs a Workspace
 *  "Send mail as" alias on the deployer account — an operator action, not
 *  code). What code controls is the display NAME recipients see and where a
 *  reply lands: name = the agent's name ALONE, replyTo = the agent's own
 *  inbox. (Operator correction 2026-08-27: the former "· Universal Medical
 *  Supply" org suffix was the WRONG company name — it fired live on a pilot
 *  agent's send — and is unnecessary anyway: dept emails never leave the org,
 *  and the external/intake emails carry the brand in their body chrome. Do
 *  not re-add an org suffix here without the operator supplying the exact
 *  string.) Returns {} for a missing/partial emp so Object.assign is a no-op
 *  and the send proceeds with the system identity rather than failing.
 *  SCOPE: rep-initiated sends ONLY (dept email, external email, the three
 *  intake sends) — automated digests/alerts/exports deliberately keep the
 *  system identity, and the notifyAfter/best-effort senders are untouched. */
function repSenderOpts_(emp) {
  const opts = {};
  if (emp && emp.name) opts.name = String(emp.name);
  if (emp && emp.email) opts.replyTo = String(emp.email);
  return opts;
}
function repSenderFrom_() {
  if (_repSenderFromResolved !== null) return _repSenderFromResolved;
  let resolved = '';
  try {
    const want = String(PropertiesService.getScriptProperties().getProperty('REP_SENDER_FROM') || '').trim();
    if (want) {
      const aliases = GmailApp.getAliases() || [];
      const ok = aliases.some(function (a) { return String(a).toLowerCase() === want.toLowerCase(); });
      if (ok) resolved = want;
      else console.warn('REP_SENDER_FROM="' + want + '" is not a registered Send-mail-as alias of the deploying account — falling back to the deployer identity. Add the alias in Gmail settings (Accounts → Send mail as) first.');
    }
  } catch (e) { console.warn('repSenderFrom_ failed: ' + e.message); }
  _repSenderFromResolved = resolved;
  return resolved;
}
/** Sends ONE rep-initiated email with the agent identity applied (round-1 #8):
 *  display name + replyTo always (repSenderOpts_), and the neutral From
 *  address too when REP_SENDER_FROM is configured (repSenderFrom_). `opts` is
 *  the MailApp single-object form ({to, subject, body?, htmlBody?, cc?, bcc?,
 *  attachments?, inlineImages?}). Throws exactly like MailApp.sendEmail on a
 *  genuine send failure, so every caller's existing try/catch semantics are
 *  unchanged. GmailApp adds no new OAuth scope here (the Spanish-inbox
 *  feature already uses it) and shares the MailApp send quota. */
function sendRepEmail_(emp, opts) {
  const merged = mailMergeBcc_(Object.assign({}, opts, repSenderOpts_(emp)));   // MAIL_BCC_ALL rides both branches
  // Operator ask 2026-08-27: the sending agent gets their own copy of every
  // email they send from the app. A true Sent-folder entry in the AGENT's
  // mailbox is impossible — the app sends as USER_DEPLOYING, so only the
  // deployer's Sent folder records the send (which GmailApp does when the
  // REP_SENDER_FROM alias is active) — so the copy is a self-BCC into the
  // agent's inbox. APPENDED, never clobbering a caller's own bcc (the intake
  // routes set INTAKE_BCC_EMAIL), and skipped when the agent is already a
  // bcc recipient.
  if (emp && emp.email) {
    const self = String(emp.email);
    const bcc = String(merged.bcc || '');
    if (bcc.toLowerCase().indexOf(self.toLowerCase()) < 0) {
      merged.bcc = bcc ? bcc + ',' + self : self;
    }
  }
  const from = repSenderFrom_();
  if (from) {
    // GmailApp's signature is positional (to, subject, body, options) — the
    // options object must NOT repeat to/subject/body.
    const gOpts = Object.assign({}, merged, { from: from });
    delete gOpts.to; delete gOpts.subject; delete gOpts.body;
    GmailApp.sendEmail(merged.to, merged.subject, merged.body || '', gOpts);
  } else {
    MailApp.sendEmail(merged);
  }
}
function mailBccAll_() {
  if (_mailBccAllCache !== null) return _mailBccAllCache;
  let v = '';
  try { v = String(PropertiesService.getScriptProperties().getProperty('MAIL_BCC_ALL') || ''); } catch (e) { v = ''; }
  _mailBccAllCache = v.split(',').map((x) => x.trim()).filter((x) => /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(x));
  return _mailBccAllCache;
}
/** UTF-8 byte length of a string — the unit the platform caps in, which a
 *  `.length` in UTF-16 code units under-counts for anything non-ASCII. Pure. */
function utf8Len_(str) {
  const s = String(str == null ? '' : str);
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length && (s.charCodeAt(i + 1) & 0xFC00) === 0xDC00) { n += 4; i++; }
    else n += 3;
  }
  return n;
}
/** Pure — the serialized budget of one value: {key, bytes, max, pct}. */
function propValueBudget_(key, value) {
  const bytes = utf8Len_(value);
  return { key: String(key), bytes: bytes, max: PROP_VALUE_MAX, pct: Math.round(bytes * 100 / PROP_VALUE_MAX) };
}
/** The ONE writer for a JSON-blob Script Property.
 *  opts.mode: 'refuse' (default — operator-edited: throw a NAMED error, write
 *  nothing) | 'degrade' (auto-managed: apply opts.shrink(str) → str | null
 *  until the value fits; null = delete the property and log why).
 *  opts.hint: what the operator can do about a refusal ("shorten or remove a
 *  template"). Returns the value's byte count that was written (0 on delete).
 *  A refusal is an Error whose message names the key, the size and the cap,
 *  so every admin save endpoint's catch turns it into {success:false, error}. */
function propSetBounded_(key, value, opts) {
  const o = opts || {};
  const props = PropertiesService.getScriptProperties();
  let str = String(value == null ? '' : value);
  let bytes = utf8Len_(str);
  if (bytes <= PROP_VALUE_MAX) { props.setProperty(key, str); return bytes; }
  if (o.mode !== 'degrade' || typeof o.shrink !== 'function') {
    throw new Error(key + ' would be ' + bytes.toLocaleString() + ' bytes; Script Properties hold ~' +
      PROP_VALUE_MAX.toLocaleString() + ' per value — ' + (o.hint || 'shorten or remove an entry') + '. Nothing was saved.');
  }
  for (let i = 0; i < 50 && bytes > PROP_VALUE_MAX; i++) {
    const next = o.shrink(str, PROP_VALUE_MAX);
    if (next == null) {
      try { props.deleteProperty(key); } catch (_) {}
      Logger.log('propSetBounded_: ' + key + ' could not be shrunk under ' + PROP_VALUE_MAX + ' bytes (' + bytes + ') — property cleared.');
      return 0;
    }
    str = String(next);
    bytes = utf8Len_(str);
  }
  if (bytes > PROP_VALUE_MAX) {
    try { props.deleteProperty(key); } catch (_) {}
    Logger.log('propSetBounded_: ' + key + ' still ' + bytes + ' bytes after shrinking — property cleared.');
    return 0;
  }
  Logger.log('propSetBounded_: ' + key + ' degraded to fit (' + bytes + ' bytes).');
  props.setProperty(key, str);
  return bytes;
}
/** Shrinker for a {name: {at: 'yyyy-MM-dd HH:mm:ss', …}} or {name: 'stamp'}
 *  map: drops the entry with the OLDEST stamp (insertion order when no `at`);
 *  null once the map is empty. Pure. */
function propShrinkDropOldest_(str, max) {
  let map;
  try { map = JSON.parse(str); } catch (_) { return null; }
  if (!map || typeof map !== 'object' || Array.isArray(map)) return null;
  const stampOf = function (k) { const v = map[k]; return typeof v === 'string' ? v : (v && typeof v.at === 'string') ? v.at : ''; };
  // Oldest first — the NEWEST stamp is the one worth keeping. Drop until it
  // FITS rather than one-per-call: a caller's retry loop is a safety net, not
  // the mechanism (a 400-entry blob would exhaust it and clear the property).
  const order = Object.keys(map).sort(function (a, b) {
    const sa = stampOf(a), sb = stampOf(b);
    return sa < sb ? -1 : sa > sb ? 1 : (a < b ? -1 : 1);
  });
  const cap = (typeof max === 'number' && max > 0) ? max : PROP_VALUE_MAX;
  for (let i = 0; i < order.length; i++) {
    delete map[order[i]];
    if (!Object.keys(map).length) return null;
    const next = JSON.stringify(map);
    if (utf8Len_(next) <= cap) return next;
  }
  return null;
}
/** Shrinker that strips the named free-text fields from a fixed-shape object;
 *  null once none of them is left to strip. Pure. */
function propShrinkStripFields_(fields) {
  return function (str) {
    let o;
    try { o = JSON.parse(str); } catch (_) { return null; }
    if (!o || typeof o !== 'object') return null;
    let stripped = false;
    (fields || []).forEach(function (f) { if (o[f] != null && o[f] !== '') { delete o[f]; stripped = true; } });
    return stripped ? JSON.stringify(o) : null;
  };
}
/** {key: {bytes, max, pct, set}} for the STORED values of the given keys —
 *  the "N of 9,000 bytes" badge every Admin editor shows. One read. */
function propBudgetsFor_(keys) {
  const out = {};
  let props = null;
  try { props = PropertiesService.getScriptProperties(); } catch (e) { props = null; }
  (keys || []).forEach(function (k) {
    let v = null;
    try { v = props ? props.getProperty(k) : null; } catch (e) { v = null; }
    const b = propValueBudget_(k, v == null ? '' : v);
    b.set = v != null && v !== '';
    out[k] = b;
  });
  return out;
}
/** Storage Health's Script Properties line (Q3): bytes used of the 500KB
 *  store and the largest value against the 9KB per-value cap. READ-ONLY;
 *  `bytes: null` means the store could not be read (unknown, never OK —
 *  INV-187). Values are counted, never returned. */
function scriptPropertiesStatus_() {
  const out = { valueMax: PROP_VALUE_MAX, storeMax: PROP_STORE_MAX, warnPct: PROP_WARN_PCT,
                count: null, bytes: null, largestKey: '', largestBytes: null, error: '' };
  try {
    const all = PropertiesService.getScriptProperties().getProperties() || {};
    const keys = Object.keys(all);
    let total = 0, bigKey = '', big = 0;
    keys.forEach(function (k) {
      const vb = utf8Len_(all[k]);
      total += utf8Len_(k) + vb;
      if (vb > big) { big = vb; bigKey = k; }
    });
    out.count = keys.length; out.bytes = total; out.largestKey = bigKey; out.largestBytes = keys.length ? big : 0;
  } catch (e) { out.error = String((e && e.message) || e); }
  return out;
}
function mailBccStatus_() {
  const list = mailBccAll_();
  const out = { prop: 'MAIL_BCC_ALL', enabled: list.length > 0, addresses: list, external: null, ownDomain: '' };
  if (!out.enabled) return out;
  let own = '';
  try { own = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (e) { own = ''; }
  const at = own.lastIndexOf('@');
  if (at < 0) return out;                       // can't tell whose domain is ours → external stays null
  out.ownDomain = own.slice(at + 1);
  out.external = list.filter((a) => String(a).toLowerCase().slice(String(a).lastIndexOf('@') + 1) !== out.ownDomain);
  return out;
}
function mailMergeBcc_(opts) {
  const extra = mailBccAll_();
  if (!extra.length || !opts) return opts;
  const split = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean);
  const have = split(opts.bcc);
  const seen = {};
  [].concat(split(opts.to), split(opts.cc), have).forEach((x) => { seen[x.toLowerCase()] = true; });
  extra.forEach((e) => { if (!seen[e.toLowerCase()]) { have.push(e); seen[e.toLowerCase()] = true; } });
  return Object.assign({}, opts, { bcc: have.join(',') });
}
/** The ONE MailApp call for every automated (system-identity) send. */
function appSendMail_(opts) {
  MailApp.sendEmail(mailMergeBcc_(opts));
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
// Runs a dispatcher's jobs one after another, each in its own try/catch, so a
// job that throws never starves the ones after it. The jobs already catch
// their own failures and stamp / audit them; this backstop only catches a
// throw none of them expected, and stamps it under the JOB's name so the
// health dot + failure digest see it (INV-161) — a clean run clears it.
// KNOWN LIMIT: the group shares ONE six-minute execution. All eight grouped
// jobs are cheap by default (the purges no-op while their windows are 0), but
// a purge enabled against a large backlog that runs long is killed by the
// execution limit WITH the jobs after it — each job's own liveness row then
// reads stale on Automation Health, which is the signal to re-order or split.
function runTriggerGroup_(label) {
  const jobs = TRIGGER_GROUPS[label] || [];
  const results = [];
  jobs.forEach(function (name) {
    const fn = globalThis[name];
    if (typeof fn !== 'function') {
      results.push({ job: name, ok: false, error: 'not a defined function' });
      stampAutomationError_(name, label + ': "' + name + '" is not a defined top-level function');
      return;
    }
    try {
      const r = fn();
      clearAutomationError_(name);
      results.push({ job: name, ok: true, result: r });
    } catch (e) {
      const msg = (e && e.message) ? e.message : String(e);
      Logger.log(label + ': ' + name + ' threw: ' + msg);
      stampAutomationError_(name, msg);
      results.push({ job: name, ok: false, error: msg });
    }
  });
  return { success: results.every(function (r) { return r.ok; }), label: label, results: results };
}
// Hourly: the Call Notes EOD reminder (matches each rep's local EOD hour) and
// the flag-gated Spanish Inbox auto-assign (business hours only).
function runHourlyJobs() {
  assertManagerCaller_('runHourlyJobs');
  return runTriggerGroup_('runHourlyJobs');
}
// Friday manager-tz 8am: the manager training/review digests and the agent
// coaching recap. Agent-facing mail never consults the manager brief flag.
function runWeeklyDigests() {
  assertManagerCaller_('runWeeklyDigests');
  return runTriggerGroup_('runWeeklyDigests');
}
// Daily manager-tz 2am, BEFORE the 3am cold-archive: the four delete-only
// retention purges (diagnostics, QA review records, form PHI, archived call
// notes). Every window defaults to 0, so each no-ops before its lock; the
// row-MOVING archive (3am) and the live-notes purge (4am) keep their own
// triggers because their ORDER after this slot is load-bearing (archive-first).
function runNightlyPurges() {
  assertManagerCaller_('runNightlyPurges');
  return runTriggerGroup_('runNightlyPurges');
}
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
  // ONE trigger per SLOT. Same-slot jobs run inside the three dispatchers
  // (TRIGGER_GROUPS); the handlers they run are in RETIRED_TRIGGER_HANDLERS,
  // never here. TARGETS.length is the number of triggers this install creates
  // (pinned equal to the newTrigger set), which the quota pre-flight relies on.
  const TARGETS = [
    'sendDailyMissedPunchAlerts',
    'runDailyExportCheck',
    'runHourlyJobs',
    'runWeeklyDigests',
    'sendCallNotesUrgentDigest',
    'runNightlyPurges',
    'archiveOldCallNotes',
    'purgeOldCallNotes',
    'reconcileCallNotes',
    'sendTrainingOverdueDigest',
    'sendAutomationHealthDigest',
    'sendDeptRequestReminderDigest',
    'sendManagerDailyBrief',
    'archiveOldTimesheetRows',
    'runNightlySelfTest',
    'creditMonthlyPtoAccruals',
  ];
  // QUOTA PRE-FLIGHT — BEFORE anything is deleted. Apps Script caps installable
  // triggers per user per script; the 2026-09-11 install hit the cap on the
  // last create after the dedupe loop had removed every existing trigger, and
  // left the deployment with no accrual trigger. Count what would exist after
  // this run (our set + any trigger this account owns that is not ours) and
  // refuse with nothing touched when it would not fit.
  const existing = ScriptApp.getProjectTriggers();
  const isOurs = function (h) {
    return TARGETS.indexOf(h) >= 0 || RETIRED_TRIGGER_HANDLERS.indexOf(h) >= 0;
  };
  const foreign = existing.filter(function (t) { return !isOurs(t.getHandlerFunction()); });
  if (foreign.length + TARGETS.length > AUTOMATION_TRIGGER_QUOTA) {
    throw new Error(
      'Refusing to install: ' + TARGETS.length + ' automation trigger(s) plus ' + foreign.length +
      ' other trigger(s) this account owns on this script (' +
      foreign.map(function (t) { return t.getHandlerFunction(); }).join(', ') +
      ') would exceed Apps Script\'s limit of ' + AUTOMATION_TRIGGER_QUOTA +
      ' per user per script. NOTHING was deleted. Remove the other trigger(s) in the ' +
      'editor\'s Triggers panel, or fold a job into a same-slot dispatcher (TRIGGER_GROUPS), then re-run.');
  }
  existing.forEach(function (t) {
    if (isOurs(t.getHandlerFunction())) ScriptApp.deleteTrigger(t);
  });
  try {
    ScriptApp.newTrigger('sendDailyMissedPunchAlerts')
      .timeBased().atHour(CONFIG.AUTO_MISSED_ALERT_HOUR_IST).everyDays(1)
      .inTimezone(CONFIG.TIMEZONE).create();
    ScriptApp.newTrigger('runDailyExportCheck')
      .timeBased().atHour(CONFIG.AUTO_EXPORT_HOUR_IST).everyDays(1)
      .inTimezone(CONFIG.TIMEZONE).create();
    // HOURLY dispatcher — sendCallNotesEodDigest (G4: the handler walks the
    // roster and emails each enrolled rep only during the run that lands in
    // their LOCAL EOD hour, so one hourly trigger reaches every timezone; most
    // runs send nothing) + autoAssignSpanishThreadsScheduled (acts only inside
    // business hours and only while the `spanishAutoAssign` flag is on,
    // default OFF — it heartbeats regardless so its liveness shows on
    // Automation Health). Both ran on their own hourly trigger until
    // 2026-09-11 (the quota).
    ScriptApp.newTrigger('runHourlyJobs')
      .timeBased().everyHours(1).create();
    // WEEKLY dispatcher, Friday manager-tz 8am — sendCallNotesWeeklyDigests
    // (the manager training-queue + review-candidate digests) and
    // sendCoachingRecapDigest (K8 — the per-AGENT recap of non-critical
    // coaching; agent-facing, never consults the manager-brief flag, INV-151).
    // Weekday is HARDCODED here on purpose. Two CONFIG knobs (TRAINING_/
    // REVIEW_DIGEST_WEEKDAY) used to imply it was configurable while being read
    // nowhere — editing them was a silent no-op — so they were removed (F1).
    // To move BOTH digests, change the day here and re-run installAutomationTriggers().
    ScriptApp.newTrigger('runWeeklyDigests')
      .timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(8)
      .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
    // Daily urgent-flag digest (manager-tz 8am) — recent urgent-flagged notes.
    ScriptApp.newTrigger('sendCallNotesUrgentDigest')
      .timeBased().atHour(8).everyDays(1)
      .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
    // NIGHTLY PURGES dispatcher, manager-tz 2am — the four DELETE-ONLY
    // retention purges: purgeOldDiagnostics (ViewUsage + ClientErrors past
    // VIEW_USAGE_/CLIENT_ERR_RETENTION_DAYS), purgeOldQaReviews (QaComments +
    // QaScorecards past QA_REVIEW_RETENTION_DAYS; the recordings index + Drive
    // never touched), purgeExpiredFormData (FormSubmissions + FormTokens past
    // FORM_DATA_RETENTION_DAYS — ran at 3am until 2026-09-11; the hour was
    // never load-bearing) and purgeArchivedCallNotes (the 3rd-tier cold-store
    // purge past CN_ARCHIVE_RETENTION_DAYS). EVERY window defaults to 0, so
    // each no-ops before its lock — installing this is harmless. 2am is BEFORE
    // the 3am archive so the cold-store purge operates on the settled cold
    // store from prior runs.
    ScriptApp.newTrigger('runNightlyPurges')
      .timeBased().atHour(2).everyDays(1)
      .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
    // Cold-archive tier (SAFE retention) — moves old notes to a NotesArchive tab
    // (data preserved, live tab bounded). No-ops while CN_NOTE_ARCHIVE_DAYS=0 (the
    // default), so installing it is harmless. Staggered to 3am, AFTER the 2am
    // purges and BEFORE the 4am live purge, so if both are enabled the safe
    // archive-first ordering holds. Keeps its OWN trigger: it MOVES rows
    // (append-then-delete), and its place in the order is load-bearing.
    ScriptApp.newTrigger('archiveOldCallNotes')
      .timeBased().atHour(3).everyDays(1)
      .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
    // Rolling note retention (item 7) — also no-ops while CN_NOTE_RETENTION_DAYS=0
    // (the default), so installing it is harmless. Staggered to 4am, after the
    // archive, so the live purge never runs ahead of the move. Own trigger for
    // the same ordering reason.
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
    // daily manager emails those handlers suppress. Keeps its OWN trigger:
    // managerBriefSuppressionActive_({checkTrigger:true}) looks for a live
    // trigger on THIS handler name, so folding it into a dispatcher would
    // silently un-suppress the digests it replaces.
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
    // installing it is harmless. NOT folded into a dispatcher with the accrual
    // credit below: both hold the ONE project lock and either can run long on
    // the night that matters, and a shared six-minute execution would raise
    // the duplicate-append hazard F3 (cycle 12) exists to prevent.
    ScriptApp.newTrigger('archiveOldTimesheetRows')
      .timeBased().atHour(18).everyDays(1)
      .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
    // Nightly self-test (K-A alternative) — daily manager-tz 1am. Smoke-only on
    // prod (no writes, no locks); the FULL suite only on the DEV instance.
    ScriptApp.newTrigger('runNightlySelfTest')
      .timeBased().atHour(1).everyDays(1)
      .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
    // Monthly PTO accrual credit (operator 2026-08-18) — daily manager-tz 18:00,
    // alongside the Timesheet cold-archive. NOT 6am (F10, cycle 18): 6am CT is
    // ~4:30pm IST / 7pm PHT, the tail of the offshore shift, and on the 1st of
    // the month this run holds the ONE project ScriptLock through a full
    // Timesheet read — the exact starvation reasoning that moved
    // archiveOldTimesheetRows off 1am (INV-153). "Both take the lock briefly"
    // was true on 29 days a month and false on the one that matters. 18:00 CT is
    // the all-team quiet window; the daily-with-idempotence cadence is unchanged,
    // so a missed run still catches up via the col-R stamp.
    // Daily-with-idempotence rather than a monthly trigger: if the 1st's run is
    // missed (dead trigger, quota), the next day's run catches up via the col-R
    // stamp instead of silently losing the month. No-ops for reps with a blank
    // column-Q rate, so installing it is harmless on a roster with no accruers.
    ScriptApp.newTrigger('creditMonthlyPtoAccruals')
      .timeBased().atHour(18).everyDays(1)
      .inTimezone(CONFIG.MANAGER_TIMEZONE || CONFIG.TIMEZONE).create();
  } catch (e) {
    // A throw here lands AFTER the dedupe loop deleted the previous set, so say
    // exactly what is and is not installed instead of leaving the operator to
    // count the Triggers panel (the 2026-09-11 shape: 20 of 21, accrual missing).
    const installed = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
    const missing = TARGETS.filter(function (t) { return installed.indexOf(t) < 0; });
    throw new Error('Trigger install FAILED part-way: ' + (TARGETS.length - missing.length) + ' of ' +
      TARGETS.length + ' installed; NOT installed: ' + (missing.join(', ') || '(none)') +
      '. Cause: ' + ((e && e.message) ? e.message : String(e)) +
      '. Fix the cause and re-run installAutomationTriggers() — the dedupe loop makes a re-run safe.');
  }
  Logger.log('Automation triggers installed by ' + userEmail + ' (' + TARGETS.length + ' of the ' +
             AUTOMATION_TRIGGER_QUOTA + ' Apps Script allows).');

  // Trigger-ownership warning: Apps Script time-triggers are owned by the
  // installing user, and ScriptApp.getProjectTriggers() only returns triggers
  // owned by the *current* user. If a different account previously installed
  // these triggers, they are still firing under that account but invisible
  // here — leading to duplicate emails / exports. We can't detect that
  // programmatically, so surface the risk via email instead.
  try {
    const recipients = getManagerEmails_();
    if (recipients.length > 0) {
      appSendMail_({
        to: recipients.join(','),
        subject: `UMS Team Tools — automation triggers installed by ${userEmail}`,
        body:
          `installAutomationTriggers() ran as ${userEmail}.\n\n` +
          `Triggers installed (${TARGETS.length} of the ${AUTOMATION_TRIGGER_QUOTA} Apps Script allows):\n` +
          TARGETS.map(function (t) {
            const grp = TRIGGER_GROUPS[t];
            return '  • ' + t + (grp ? ' → runs ' + grp.join(', ') : '');
          }).join('\n') + '\n\n' +
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
  // Mirrors the install TARGETS (pinned equal); RETIRED_TRIGGER_HANDLERS covers
  // the standalone triggers an older install created for jobs that now run
  // inside a dispatcher.
  const TARGETS = [
    'sendDailyMissedPunchAlerts',
    'runDailyExportCheck',
    'runHourlyJobs',
    'runWeeklyDigests',
    'sendCallNotesUrgentDigest',
    'runNightlyPurges',
    'archiveOldCallNotes',
    'purgeOldCallNotes',
    'reconcileCallNotes',
    'sendTrainingOverdueDigest',
    'sendAutomationHealthDigest',
    'sendDeptRequestReminderDigest',
    'sendManagerDailyBrief',
    'archiveOldTimesheetRows',
    'runNightlySelfTest',
    'creditMonthlyPtoAccruals',
  ];
  ScriptApp.getProjectTriggers().forEach(t => {
    const h = t.getHandlerFunction();
    if (TARGETS.indexOf(h) >= 0 || RETIRED_TRIGGER_HANDLERS.indexOf(h) >= 0) ScriptApp.deleteTrigger(t);
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
/** Best-effort heartbeat stamp ({ key: "yyyy-MM-dd HH:mm:ss" in
 *  CONFIG.TIMEZONE }) — never blocks or fails the digest itself. */
function stampDigestLastRun_(key) {
  // Cycle-9 L-19: the read-modify-write of the shared heartbeat blob runs
  // under a brief tryLock (the kbAiTryReserveSpend_ pattern) — the urgent
  // digest and the brief both fire at manager-tz 8am, and two concurrent
  // unlocked RMWs could drop each other's stamp (a ~24h-stale value = a false
  // "stale digest" line in the failure digest, or a fail-safe doubled email
  // via suppression reading stale). Fail-OPEN on lock contention: a missed
  // stamp beats a digest blocked on its own best-effort heartbeat.
  const lock = LockService.getScriptLock();
  let locked = false;
  try { locked = lock.tryLock(3000); } catch (_) {}
  try {
    const props = PropertiesService.getScriptProperties();
    let map = {};
    try { map = JSON.parse(props.getProperty(DIGEST_LAST_RUN_PROP)) || {}; } catch (_) {}
    if (!map || typeof map !== 'object' || Array.isArray(map)) map = {};
    map[key] = fmtDate_(new Date()) + ' ' + fmtTime_(new Date());
    propSetBounded_(DIGEST_LAST_RUN_PROP, JSON.stringify(map), { mode: 'degrade', shrink: propShrinkDropOldest_ });   // Q1 — a fixed key set; the oldest heartbeat goes first
  } catch (e) { /* heartbeat is best-effort */ }
  finally { if (locked) { try { lock.releaseLock(); } catch (_) {} } }
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
function managerBriefSuppressionActive_(opts) {
  if (!getFlag_('managerDailyBrief')) return false;
  try {
    let map = {};
    try { map = JSON.parse(PropertiesService.getScriptProperties().getProperty(DIGEST_LAST_RUN_PROP)) || {}; } catch (_) {}
    const raw = String((map && map.managerBrief) || '');
    if (!raw) return false;
    const ms = Utilities.parseDate(raw, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss').getTime();
    if (!((Date.now() - ms) < 26 * 3600000)) return false;
    // Cycle-9 L-18: the heartbeat proves "the handler RAN", not "a trigger
    // exists" — a manual editor/console run of sendManagerDailyBrief stamps
    // it, opening a ~26h window where the four digests suppress but no 8am
    // brief will ever fire (the silent-outage class M-11 closed, re-opened by
    // a manual run; the briefConfig detector can't see it because suppression
    // reads active). The four DIGEST call sites pass {checkTrigger:true}: in
    // their trigger context the runner IS the installer, so
    // ScriptApp.getProjectTriggers() sees the brief trigger. The PANEL
    // detector must NOT pass it — a viewing manager isn't the installer, so
    // every trigger is invisible in that context and the check would false-
    // alarm. Fail direction on any trigger-check miss/error: NOT suppressed
    // (a doubled manager email beats a silent outage — the M-11 decision).
    if (opts && opts.checkTrigger) {
      try {
        const trigs = ScriptApp.getProjectTriggers();
        let found = false;
        for (let i = 0; i < trigs.length; i++) {
          if (String(trigs[i].getHandlerFunction()) === 'sendManagerDailyBrief') { found = true; break; }
        }
        if (!found) return false;
      } catch (e) { return false; }
    }
    return true;
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
  // A source that could not be read is NOT an all-clear for that area, and this
  // brief suppresses the standalone digest that would otherwise have covered it
  // (INV-187). Say so at the TOP, where an absent section would be read.
  const failed = (d && d.failedSources) || [];
  if (failed.length) {
    html += '<p style="margin:8px 0;padding:8px 10px;border-left:3px solid ' + P.warnDeep +
      ';background:' + P.warnBorder + ';font-size:12px;color:' + P.ink + ';">' +
      '<strong>Incomplete brief.</strong> ' + esc_(failed.join(', ')) +
      ' could not be read this morning, so ' + (failed.length === 1 ? 'that area is' : 'those areas are') +
      ' missing below — treat their absence as unknown, not as clear.</p>';
    text += '! INCOMPLETE — could not read: ' + failed.join(', ') +
      ' (their absence below is unknown, not clear)\n';
  }

  sections.forEach(function (s) {
    html += secLabel(s.label + ' (' + s.count + ')');
    text += '\n' + s.label + ' (' + s.count + '):\n';
    if (s.key === 'urgent') {
      html += table(d.urgent.map(function (n) {
        return row2('<strong>' + esc_(n.repName) + '</strong> · ' + esc_(n.caller || n.patientAndTrx || '—') +
          (n.issue ? '<br><span style="color:' + P.muted + ';font-size:12px;">' + cnFmtEmailHtml_(esc_(n.issue)) + '</span>' : ''),
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
        return row2('<strong>' + esc_(oc.empName) + '</strong> · ' + esc_(COACH_SEV_LABELS[oc.item.severity] || oc.item.severity),
          'since ' + String(oc.item.createdAt).substring(0, 10));
      }).join(''));
      text += d.coaching.map(function (oc) {
        return '  ' + oc.empName + ' · ' + (COACH_SEV_LABELS[oc.item.severity] || oc.item.severity) + ' (since ' + String(oc.item.createdAt).substring(0, 10) + ')';
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
  appSendMail_({
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

    // Each source is best-effort so one broken store cannot cost a manager the
    // whole brief — but a source that fails must not simply VANISH from it.
    // The brief SUPPRESSES the four standalone digests it replaces, so a
    // silently-omitted section means that signal reached nobody at all, and an
    // all-clear brief is indistinguishable from a brief that could not look
    // (INV-187). `failedSources` rides into the email, and the whole run stamps
    // an automation error so the health panel and failure digest see it too.
    const failedSources = [];
    const src = function (label, fn) {
      try { return fn() || []; }
      catch (e) {
        Logger.log('brief: ' + label + ' source failed: ' + e.message);
        failedSources.push(label);
        return [];
      }
    };
    const missed      = src('missed punches', function () { return computeMissedClockOuts_(); });
    const urgent      = src('urgent notes', function () { return managerAggregateUrgent_(dateRange).results; });
    const training    = src('overdue training', function () { return trainOverdueForRoster_(todayIso); });
    const docs        = src('unsigned documents', function () { return empDocsOverdueAll_(todayIso); });
    const coaching    = src('un-acknowledged coaching', function () { return coachUnackedAll_(Date.now()); });
    const deptOverdue = src('overdue department requests', function () { return deptRequestsOverdueOpen_(); });
    if (failedSources.length) {
      stampAutomationError_('ManagerDailyBrief',
        failedSources.length + ' source(s) unreadable: ' + failedSources.join(', '));
    } else {
      clearAutomationError_('ManagerDailyBrief');
    }

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
      d.failedSources = failedSources;
      const sections = managerBriefSections_(d);
      // Silent ONLY on a genuine all-clear. If a source could not be read, the
      // absence of sections is not an all-clear and the brief says so.
      if (!sections.length && !failedSources.length) return;
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
function invalidateRosterCache_() {
  CacheService.getScriptCache().remove(ROSTER_CACHE_KEY);
}
function getDepartmentEmails_() {
  // C17 batch-5 — sanitize-on-read (the cycle-9 L-12 rule this one getter
  // skipped): a hand-edited Script Property holding an array / non-string
  // values previously fed Object.keys() surfaces unfiltered — the composer
  // dept list, drParseDepartments_ validKeys, empDepartments_, and
  // resolveEmailRecipients_, where a non-string value rode raw into the
  // MailApp `to`. Whitelist-rebuild: keep only non-empty string keys mapping
  // to plausible email strings; anything else degrades to the CONFIG
  // fallback entry-wise (an empty rebuilt map falls back whole).
  const prop = PropertiesService.getScriptProperties().getProperty('CN_DEPARTMENT_EMAILS');
  if (prop) {
    try {
      const raw = JSON.parse(prop);
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const clean = {};
        Object.keys(raw).forEach(function (k) {
          const name = String(k || '').trim();
          const email = (typeof raw[k] === 'string') ? raw[k].trim() : '';
          if (name && email && email.indexOf('@') > 0) clean[name] = email;
        });
        if (Object.keys(clean).length > 0) return clean;
      }
    } catch (_) {}
  }
  return CONFIG.CALL_NOTES.DEPARTMENT_EMAILS;
}
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
function getStateTaxRates_() {
  const prop = PropertiesService.getScriptProperties().getProperty('CN_STATE_TAX_RATES');
  if (prop) {
    // Cycle-9 L-12: SANITIZE on read, matching getEmailTemplates_/
    // getExternalLinks_ — a hand-edited property holding a JSON scalar/array
    // was returned as-is to getCallNotesDepartments/getAdminConfig and the
    // OOP tax path (the documented "corrupt blob degrades" claim didn't hold
    // for these two getters). Keep only string→finite-number entries.
    try {
      const parsed = JSON.parse(prop);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const clean = {};
        Object.keys(parsed).forEach(function (k) {
          const v = Number(parsed[k]);
          if (isFinite(v) && v >= 0 && v <= 1) clean[String(k)] = v;
        });
        // C5 (cycle 10): a deliberately-cleared config ({} saved via the
        // Admin tab) must stay empty — the old non-empty gate silently
        // resurrected the CONFIG defaults, making "no tax rates" an
        // unrepresentable state. An object whose entries ALL failed
        // validation still degrades to CONFIG (the L-12 corrupt-blob intent).
        if (Object.keys(parsed).length === 0 || Object.keys(clean).length > 0) return clean;
      }
    } catch (_) {}
  }
  return CONFIG.CALL_NOTES.STATE_TAX_RATES;
}
function getUpdateSuggestions_() {
  const prop = PropertiesService.getScriptProperties().getProperty('CN_UPDATE_SUGGESTIONS');
  if (prop) {
    // Cycle-9 L-12: sanitize on read (see getStateTaxRates_) — keep only
    // deptName → array-of-strings entries.
    try {
      const parsed = JSON.parse(prop);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const clean = {};
        Object.keys(parsed).forEach(function (k) {
          if (Array.isArray(parsed[k])) {
            clean[String(k)] = parsed[k].filter(function (s) { return typeof s === 'string'; });
          }
        });
        // C5 (cycle 10): a cleared {} stays empty (see getStateTaxRates_).
        if (Object.keys(parsed).length === 0 || Object.keys(clean).length > 0) return clean;
      }
    } catch (_) {}
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
/** Auto-tag rules — Script Property CN_AUTO_TAG_RULES first (Admin-edited),
 *  else the CONFIG seed. Sanitize-on-read (the L-12 rule): each entry is
 *  whitelist-rebuilt — the tag through the same normalization the client
 *  applies (kebab, 2–24 chars), keywords as non-empty lowercased strings —
 *  and a malformed entry is dropped rather than shipped to every rep's
 *  matcher. A corrupt blob degrades to the CONFIG seed. */
function getAutoTagRules_() {
  const prop = PropertiesService.getScriptProperties().getProperty('CN_AUTO_TAG_RULES');
  let raw = CONFIG.CALL_NOTES.AUTO_TAG_RULES || [];
  if (prop) {
    try {
      const parsed = JSON.parse(prop);
      if (Array.isArray(parsed)) raw = parsed;
    } catch (_) {}
  }
  const out = [];
  raw.forEach(function (r) {
    const tag = String((r && r.tag) || '').trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (tag.length < 2 || tag.length > 24) return;
    const kws = (Array.isArray(r.keywords) ? r.keywords : [])
      .map(function (k) { return String(k || '').trim().toLowerCase(); })
      .filter(function (k) { return k.length >= 3 && k.length <= 60; });
    if (kws.length) out.push({ tag: tag, keywords: kws });
  });
  return out;
}
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
function fmtDateTz_(d, tz) { return Utilities.formatDate(d, tz, 'yyyy-MM-dd'); }
function fmtTimeTz_(d, tz) { return Utilities.formatDate(d, tz, 'HH:mm:ss'); }

// ── Business-hours elapsed (operator 2026-08-31) ────────────────────────────
// Response-time figures were RAW WALL CLOCK: a request arriving Friday 4pm and
// answered Monday 9am counted as ~41 hours, not the ~1 hour of working time it
// actually took. Because nobody replies overnight or at the weekend, those
// spans dominated the AVERAGE and pulled the MEDIAN on any window containing a
// weekend — and the per-department SLA targets are chosen against exactly
// those numbers, so the distortion fed back into the thresholds.
//
// The business calendar is the app's EXISTING one (the `COVERAGE_BUSINESS_*`
// CONFIG the Coverage planner bands against — the prefix is historical; there
// is one business calendar, not two) plus the US holidays the calendar already
// stars. Deliberate consequence: retuning those CONFIG values moves BOTH the
// coverage bands and these figures, which is the correct coupling.
//
// This is tractable precisely because of the ALL-CST policy — every agent
// shares one business calendar, so there is a single frame to subtract
// against instead of a per-rep timezone question.
/** The business window, read once. */
function businessHours_() {
  return {
    startMin: ((CONFIG.COVERAGE_BUSINESS_START_HOUR != null) ? CONFIG.COVERAGE_BUSINESS_START_HOUR : 8) * 60,
    endMin:   ((CONFIG.COVERAGE_BUSINESS_END_HOUR   != null) ? CONFIG.COVERAGE_BUSINESS_END_HOUR   : 17) * 60,
    weekdaysOnly: CONFIG.COVERAGE_WEEKDAYS_ONLY !== false,
  };
}
/** PURE core (Node-pinned). `start`/`end` are {date:'yyyy-MM-dd', min:0..1439}
 *  ALREADY expressed in the business timezone; `opts` carries the window, the
 *  holiday set, and the weekday rule. Returns business minutes, or NULL when
 *  the pair cannot be computed honestly — a reversed pair is corrupt data, and
 *  a plausible substitute is worse than a gap (the F8 rule).
 *
 *  Per-day overlap, which handles every clamp uniformly: a start before the
 *  window opens counts from the open, a start after it closes contributes
 *  nothing that day, and a weekend/holiday day contributes nothing at all. A
 *  span lying wholly outside business hours legitimately yields 0 — that is a
 *  real answer (nothing was owed during it), not a missing one. */
function bizMinutesLocal_(start, end, opts) {
  if (!start || !end || !opts) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(start.date)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(end.date))) return null;
  const sMin = Number(start.min), eMin = Number(end.min);
  if (!isFinite(sMin) || !isFinite(eMin)) return null;
  if (end.date < start.date || (end.date === start.date && eMin < sMin)) return null;   // reversed → unknown
  const span = daysBetween_(start.date, end.date);
  if (!isFinite(span) || span < 0 || span > BIZ_MAX_SPAN_DAYS) return null;             // absurd range → unknown
  const openMin = Number(opts.startMin), closeMin = Number(opts.endMin);
  if (!isFinite(openMin) || !isFinite(closeMin) || closeMin <= openMin) return null;
  const hol = opts.holidays || {};
  let total = 0;
  for (let i = 0; i <= span; i++) {
    // UTC-anchored day walk — no tz drift, and no Utilities dependency, which
    // is what keeps this core testable off-platform.
    const d = new Date(start.date + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().substring(0, 10);
    const dow = d.getUTCDay();
    if (opts.weekdaysOnly !== false && (dow === 0 || dow === 6)) continue;
    if (hol[iso]) continue;
    const segStart = (iso === start.date) ? sMin : 0;
    const segEnd   = (iso === end.date)   ? eMin : 1440;
    const overlap = Math.min(segEnd, closeMin) - Math.max(segStart, openMin);
    if (overlap > 0) total += overlap;
  }
  return Math.round(total);
}
/** One instant → {date, min} in the business timezone. */
function bizPointInTz_(ms, tz) {
  const d = new Date(ms);
  return {
    date: Utilities.formatDate(d, tz, 'yyyy-MM-dd'),
    min: parseInt(Utilities.formatDate(d, tz, 'H'), 10) * 60 + parseInt(Utilities.formatDate(d, tz, 'm'), 10),
  };
}
/** Business minutes between two epoch-ms instants, in the manager timezone
 *  (the app's operating anchor — MANAGER_TIMEZONE, not CONFIG.TIMEZONE, which
 *  is the storage frame). NULL on any unusable input, so a caller renders
 *  "unknown" instead of a confident zero (INV-187). */
function businessMinutesBetween_(startMs, endMs, tz) {
  try {
    if (!(Number(startMs) > 0) || !(Number(endMs) > 0)) return null;
    const zone = tz || CONFIG.MANAGER_TIMEZONE;
    const s = bizPointInTz_(Number(startMs), zone);
    const e = bizPointInTz_(Number(endMs), zone);
    const hol = {};
    const y0 = parseInt(s.date.substring(0, 4), 10), y1 = parseInt(e.date.substring(0, 4), 10);
    for (let y = y0; y <= y1 && (y - y0) <= 2; y++) {
      getUsHolidays_(y).forEach(function (h) { hol[h.date] = true; });
    }
    const win = businessHours_();
    return bizMinutesLocal_(s, e, { startMin: win.startMin, endMin: win.endMin,
      holidays: hol, weekdaysOnly: win.weekdaysOnly });
  } catch (e) {
    Logger.log('businessMinutesBetween_ failed: ' + e.message);
    return null;
  }
}

// ── #3 Coverage planner (manager, forward staffing view) ────────────────────
// getCoveragePlan(from,to): for each manager-tz day, lists every rep's shift
// (per-tz schedule, converted to the manager's tz) with a PTO overlay
// (Approved = off, Pending = tentative), plus an hourly concurrency strip that
// flags understaffed hours (< CONFIG.COVERAGE_MIN_STAFF). Manager-gated,
// read-only, PHI-free (names + schedule + PTO status only — never balances).
// v1 LIMITATION: schedules are per-TIMEZONE, not per-rep (CLAUDE.md — there's
// no per-rep schedule UI), so coverage assumes everyone in a tz works that tz's
// shift. The hourly math is the pure, Node-pinned coverageBucketHours_.
/** PURE (Node-pinned): average inbound calls per weekday per slot from the
 *  CDR `Inbound Calls` export rows (DISPLAY values). Columns are found BY
 *  HEADER NAME (the Phase-1 rule — self-correcting under a reorder, no parallel
 *  header map to drift): Call Date / Call Start / Is Internal / Entry Queue.
 *  Mirrors call-data-reporting's heatmap fallback: Call Start is RAW PST
 *  'HH:MM:SS' shifted by `opts.shiftHours` (% 1440 wrap), internal calls
 *  excluded, weekends excluded, an optional lowercase entry-queue set. The
 *  denominator is the number of DISTINCT weekday dates that carried ANY
 *  counted row (a day with no export is not a quiet day). A missing column is
 *  NAMED in `missing` and yields no slots — never a strip of zeros. */
function inboundVolumeBuckets_(headers, rows, opts) {
  const need = { date: 'call date', start: 'call start', internal: 'is internal', queue: 'entry queue' };
  const col = {};
  (headers || []).forEach(function (h, i) {
    const k = String(h == null ? '' : h).trim().toLowerCase();
    Object.keys(need).forEach(function (key) { if (k === need[key] && col[key] === undefined) col[key] = i; });
  });
  const missing = Object.keys(need).filter(function (k) { return col[k] === undefined; }).map(function (k) { return need[k]; });
  const slotMin = Math.max(5, Number(opts && opts.slotMin) || 15);
  const startMin = (Number(opts && opts.startHour) || 0) * 60;
  const endMin = (Number(opts && opts.endHour) || 24) * 60;
  const nSlots = Math.max(0, Math.ceil((endMin - startMin) / slotMin));
  const shift = (Number(opts && opts.shiftHours) || 0) * 60;
  const qset = opts && opts.queues;
  const counts = []; for (let i = 0; i < nSlots; i++) counts.push(0);
  if (missing.length) return { slots: [], counts: counts, weekdays: 0, counted: 0, missing: missing };
  const days = {};
  let counted = 0;
  (rows || []).forEach(function (r) {
    const iso = cdrRowDateIso_(r[col.date], (opts && opts.tz) || 'UTC');
    if (!iso || (opts && opts.fromIso && iso < opts.fromIso) || (opts && opts.toIso && iso > opts.toIso)) return;
    if (String(r[col.internal] == null ? '' : r[col.internal]).trim().toUpperCase() === 'TRUE') return;
    if (qset && !qset[String(r[col.queue] == null ? '' : r[col.queue]).trim().toLowerCase()]) return;
    const wd = new Date(iso + 'T00:00:00Z').getUTCDay();
    if (wd === 0 || wd === 6) return;
    const cs = String(r[col.start] == null ? '' : r[col.start]).trim();
    const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(cs);
    if (!m) return;
    days[iso] = true;
    const mins = (((+m[1]) * 60 + (+m[2])) + shift) % 1440;
    if (mins < startMin || mins >= endMin) return;
    counts[Math.floor((mins - startMin) / slotMin)]++;
    counted++;
  });
  const nDays = Object.keys(days).length;
  return { slots: nDays ? counts.map(function (c) { return Math.round((c / nDays) * 10) / 10; }) : [],
           counts: counts, weekdays: nDays, counted: counted, missing: [] };
}
/** Extract the bare email from a "Name <email@x>" / "email@x" From header. */
function emailAddrOnly_(from) {
  const s = String(from || '');
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim().toLowerCase();
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
    return true;   // C4 (cycle 10) — witness-class callers need the outcome
  } catch (e) { console.warn('writeAuditLog_ failed: ' + e.message); return false; }
}
// C4 (cycle 10) — the WITNESS-class audit writes. Three audit rows are
// documented as tamper-evidence witnesses (FormSubmissionReceived per
// INV-113; EmpDocSigned / EmpDocCompleted per INV-122/135): the docs said
// "the audit row IS the witness", but writeAuditLog_ swallows failures, so a
// transient ADP-spreadsheet outage could silently drop a witness while the
// attested mutation (on a DIFFERENT store) succeeded — and nothing counted
// the gap. This wrapper retries once, then stamps the WITNESS_AUDIT_FAILS
// Script Property (best-effort — the PersonalSheetSyncFail posture: the
// witness store itself just failed, so a same-store signal can't work);
// computeAutomationHealth_ surfaces it and the failure digest pushes a
// RECENT failure (48h window, so an old blip doesn't nag forever).
function writeWitnessAuditLog_(targetEmp, action, punchDate, punchTime, isAdjustment, daysBack, notes, actorEmail) {
  if (writeAuditLog_(targetEmp, action, punchDate, punchTime, isAdjustment, daysBack, notes, actorEmail)) return true;
  if (writeAuditLog_(targetEmp, action, punchDate, punchTime, isAdjustment, daysBack, notes, actorEmail)) return true;
  try {
    const props = PropertiesService.getScriptProperties();
    let rec = {};
    try { rec = JSON.parse(props.getProperty('WITNESS_AUDIT_FAILS') || '{}') || {}; } catch (_) { rec = {}; }
    rec.count = (Number(rec.count) || 0) + 1;
    rec.lastAt = Date.now();
    rec.lastAction = String(action || '');
    propSetBounded_('WITNESS_AUDIT_FAILS', JSON.stringify(rec), { mode: 'degrade', shrink: propShrinkStripFields_(['lastAction']) });
  } catch (e) { console.error('WITNESS_AUDIT_FAILS stamp failed: ' + e.message); }
  console.error('WITNESS audit row lost after retry: ' + action);
  return false;
}
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
function fmtDate_(d)    { return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd'); }
function fmtTime_(d)    { return Utilities.formatDate(d, CONFIG.TIMEZONE, 'HH:mm:ss'); }
function normalizeDate_(val) {
  if (val instanceof Date) {
    const ssTz = adpSheetTz_();
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
    const ssTz = adpSheetTz_();
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
    const ssTz = adpSheetTz_();
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
/** Previous WORKDAY (Mon–Fri) before an ISO date — the server twin of the
 *  client's mPrevWorkdayIso_ (operator 2026-08-17: CDR data is never
 *  populated same-day, so "calls without a note" is a previous-workday
 *  question). Pure; a bad input yields ''. */
function prevWorkdayIso_(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return '';
  var d = new Date(iso + 'T12:00:00Z');
  if (isNaN(d.getTime())) return '';
  do { d.setUTCDate(d.getUTCDate() - 1); } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
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
/** PURE: is this error Apps Script's own missing-SCOPE refusal (the runtime
 *  declining locally) rather than a failure Drive itself returned? The ONE
 *  rule, shared by the folder helper and the Admin diagnostic so the two
 *  cannot disagree about what a scope error looks like. */
function driveScopeError_(msg) {
  const s = String(msg || '');
  if (/authorization is required to perform that action/i.test(s)) return true;
  return /do not have permission to call/i.test(s) && /googleapis\.com\/auth\/drive/i.test(s);
}
/** Is the Drive scope the KB image export needs actually GRANTED to the
 *  identity this app runs as? SIDE-EFFECT FREE BY CONSTRUCTION: it
 *  introspects the OAuth token instead of attempting a write, so opening the
 *  Admin tab never creates a folder or a file — and it probes the stored
 *  folder id with getFolderById, NEVER getOrCreateKbImagesFolder_, which
 *  would provision one as a side effect of looking.
 *  granted:null means the PROBE failed and is reported as unknown, never as
 *  OK (INV-187). Only a fully-clean round is cached (INV-129), so the panel
 *  updates immediately while an operator is fixing the grant. */
function driveAccessStatus_() {
  const out = {
    scope: DRIVE_WRITE_SCOPE, granted: null, error: '', reauthHint: DRIVE_REAUTH_HINT,
    folderProp: KB_IMAGES_FOLDER_PROP, folderId: '', folderOk: null, folderError: '',
  };
  const cache = CacheService.getScriptCache();
  try {
    const hit = cache.get(DRIVE_ACCESS_CACHE_KEY);
    if (hit) {
      const prev = JSON.parse(hit);
      if (prev && typeof prev.granted !== 'undefined') return prev;
    }
  } catch (e) { /* cache is best-effort */ }

  try {
    const resp = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo', {
      method: 'post',
      payload: { access_token: ScriptApp.getOAuthToken() },
      muteHttpExceptions: true,
    });
    if (resp.getResponseCode() !== 200) {
      out.error = 'token introspection returned HTTP ' + resp.getResponseCode();
    } else {
      const scopes = String((JSON.parse(resp.getContentText()) || {}).scope || '').split(/\s+/);
      out.granted = scopes.indexOf(DRIVE_WRITE_SCOPE) >= 0;
    }
  } catch (e) { out.error = String((e && e.message) || e); }

  try {
    const fid = String(PropertiesService.getScriptProperties().getProperty(KB_IMAGES_FOLDER_PROP) || '').trim();
    out.folderId = fid;
    if (fid) {
      try { DriveApp.getFolderById(fid).getName(); out.folderOk = true; }
      catch (e) { out.folderOk = false; out.folderError = String((e && e.message) || e); }
    }
  } catch (e) { out.folderError = String((e && e.message) || e); }

  if (!out.error && out.granted === true && out.folderOk !== false) {
    try { cache.put(DRIVE_ACCESS_CACHE_KEY, JSON.stringify(out), DRIVE_ACCESS_CACHE_SEC); } catch (e) {}
  }
  return out;
}
/** A store id that is absent or still the shipped CONFIG placeholder — i.e.
 *  the store is NOT configured on this deployment. Hoisted out of
 *  getStorageHealth (F2, 2026-09-09) so "is this store set up?" has ONE
 *  definition: getMyPendingTasks now asks the same question to tell a
 *  deliberately-unset feature apart from a read that failed. */
function storePlaceholder_(v) { return !v || /^YOUR_/.test(String(v)); }
/** Is a spreadsheet store CONFIGURED here? A Script Property, a non-placeholder
 *  CONFIG fallback, or an active test override all count. Answering this is the
 *  only way to distinguish "this deployment does not have the feature" from
 *  "the feature is set up and the read failed" — the cnCountNotesResult_
 *  unenrolled-vs-unavailable rule (INV-35), applied to a store. */
function storeConfigured_(prop, configFallback, testOverride) {
  if (testOverride) return true;
  try {
    if (PropertiesService.getScriptProperties().getProperty(prop)) return true;
  } catch (e) { return true; }   // can't tell → assume configured (a real read failure then reports itself)
  return !storePlaceholder_(configFallback);
}
