'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Client-side unit tests for the web-app's pure helper functions.
// Run: `node test/client/run.js`  (no dependencies)
//
// Seeds regression coverage for the client layer, which otherwise has none
// (every client fix — F1/F2/F5/F6/F7/F20 — was guarded only by manual scenarios
// because there was no harness). Start with the pure helpers; extend as more
// pure functions are added. DOM-driving / RPC functions stay out of scope.
// ─────────────────────────────────────────────────────────────────────────────
const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { buildSandbox, loadFunction, extractScript, extractRawFunction } = require('./harness');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n      ' + (e && e.message)); }
}

// Parse-guard: every JS-bearing HtmlService partial's <script> block must
// parse. The per-function harness only brace-matches the slices it loads, so a
// syntax error elsewhere in a partial (e.g. a stray token) would otherwise slip
// past CI — this is the cheap net that catches it across the whole client.
console.log('\nclient — all partials parse (<script> syntax guard)');
[
  'script_core.html', 'script_icons.html', 'metrics/script_metrics.html',
  'cn/script_callnotes.html', 'tc/script_clock.html', 'tc/script_timesheet.html',
  'tc/script_timeoff.html', 'tc/script_manager.html', 'index.html', 'form_public.html',
  'intake/script_intake.html',
  'kb/script_kb.html',
].forEach((f) => {
  test(f + ' parses', () => {
    const src = extractScript(f);
    assert.ok(src.trim().length > 0, 'has a <script> block');
    new vm.Script(src, { filename: f });  // throws on a syntax error
  });
});

// Foundational partials: script_icons (icon), script_core (esc, empTz,
// isoDateTz, __URL_PARAMS), metrics (mTodayIso_, mDaysAgo_). These eval cleanly
// because their top-level is declarations + an init listener (stubbed).
const sb = buildSandbox([
  'script_icons.html',
  'script_core.html',
  'metrics/script_metrics.html',
]);
// cnExtEmailPillHtml_ is extracted standalone rather than loading the whole
// 6500-line Call Notes partial — it only needs esc (core) + icon (icons).
const cnExtEmailPillHtml_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnExtEmailPillHtml_');
// Card-level urgent flag (Round 2 deferred 8e). cnUrgentPillHtml_ depends on
// cnIsUrgent_ (free var) + icon (from script_icons), so load cnIsUrgent_ into
// the sandbox first.
const cnIsUrgent_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnIsUrgent_');
const cnUrgentPillHtml_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnUrgentPillHtml_');
// #2 — external-email template picker filter logic. These read CN_STATE
// (a free var) + esc (sandbox); load the three helpers and seed CN_STATE.
sb.CN_STATE = { deptConfig: { emailTemplates: [] } };
const cnExtTemplatesAll_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnExtTemplatesAll_');
const cnExtTemplatesFor_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnExtTemplatesFor_');
const cnExtTemplateOptionsHtml_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnExtTemplateOptionsHtml_');
// Quick-link picker (surveys/reviews) — reads CN_STATE.deptConfig.externalLinks + esc.
const cnExtLinksAll_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnExtLinksAll_');
const cnExtLinkOptionsHtml_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnExtLinkOptionsHtml_');
// Win-back nudge pure logic (reason matcher + template finder).
const cnIsSwitchingSuppliersReason_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnIsSwitchingSuppliersReason_');
const cnFindWinbackTemplate_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnFindWinbackTemplate_');

// Helper: today's date in a given tz, computed independently of the code under
// test (the oracle).
function isoInTz(tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
}

console.log('\nscript_core — esc()');
test('escapes &, <, >, ", \'', () => {
  assert.strictEqual(sb.esc('a & b'), 'a &amp; b');
  assert.strictEqual(sb.esc('<img src=x onerror=1>'), '&lt;img src=x onerror=1&gt;');
  assert.strictEqual(sb.esc(`"q" 'q'`), '&quot;q&quot; &#39;q&#39;');
});

console.log('\nscript_core — empTz() / isoDateTz()');
test('empTz falls back to a default when empState is unset', () => {
  assert.strictEqual(typeof sb.empTz(), 'string');
  assert.ok(sb.empTz().length > 0);
});
test('isoDateTz returns YYYY-MM-DD for a tz', () => {
  assert.match(sb.isoDateTz('America/Chicago'), /^\d{4}-\d{2}-\d{2}$/);
});

console.log('\nmetrics — mTodayIso_() / mDaysAgo_() use the EMPLOYEE tz, not browser-local (F6)');
// Override the global empTz() (a free-variable reference inside the metrics
// functions) so the date helpers resolve to a known offshore tz.
sb.empTz = () => 'Asia/Kolkata';
test('mTodayIso_ returns today in the employee tz', () => {
  assert.strictEqual(sb.mTodayIso_(), isoInTz('Asia/Kolkata'));
});
test('mDaysAgo_(0) equals mTodayIso_', () => {
  assert.strictEqual(sb.mDaysAgo_(0), sb.mTodayIso_());
});
test('mDaysAgo_(7) is exactly 7 days before the employee-tz today', () => {
  const today = isoInTz('Asia/Kolkata');
  const d = new Date(today + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 7);
  const expected = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  assert.strictEqual(sb.mDaysAgo_(7), expected);
});
test('mTodayIso_ tracks the tz (PHT vs a deliberately different tz)', () => {
  sb.empTz = () => 'Pacific/Kiritimati'; // UTC+14 — almost always a different calendar day than UTC-ish
  const viaCode = sb.mTodayIso_();
  assert.strictEqual(viaCode, isoInTz('Pacific/Kiritimati'));
  sb.empTz = () => 'Asia/Kolkata'; // restore
});

console.log('\ncn — cnExtEmailPillHtml_() (F20 manager-only recipient lookup)');
test('returns empty string when the note has no external emails', () => {
  assert.strictEqual(cnExtEmailPillHtml_({ subformData: {} }), '');
  assert.strictEqual(cnExtEmailPillHtml_({}), '');
  assert.strictEqual(cnExtEmailPillHtml_(null), '');
});
test('renders the recipient address(es) in the pill tooltip', () => {
  const html = cnExtEmailPillHtml_({
    subformData: { externalEmails: [
      { type: 'customer', to: 'patient@example.com' },
      { type: 'provider', to: 'dr@clinic.org' },
    ] },
  });
  assert.ok(html.includes('cn-ext-email-pill'), 'has the pill class');
  assert.ok(html.includes('patient@example.com'), 'shows recipient 1');
  assert.ok(html.includes('dr@clinic.org'), 'shows recipient 2');
  assert.ok(html.includes('>2<'), 'shows the count');
});
test('escapes a malicious recipient (no raw < survives into the markup)', () => {
  const html = cnExtEmailPillHtml_({
    subformData: { externalEmails: [{ type: 'customer', to: '<img src=x onerror=alert(1)>' }] },
  });
  assert.ok(!html.includes('<img src=x'), 'raw <img must be escaped');
  assert.ok(html.includes('&lt;img'), 'escaped form present');
});

console.log('\ncn — cnIsUrgent_() / cnUrgentPillHtml_() (card-level urgent flag)');
test('cnIsUrgent_ is true only when subformData.flags includes "urgent"', () => {
  assert.strictEqual(cnIsUrgent_({ subformData: { flags: ['urgent'] } }), true);
  assert.strictEqual(cnIsUrgent_({ subformData: { flags: ['action', 'urgent'] } }), true);
  assert.strictEqual(cnIsUrgent_({ subformData: { flags: ['action'] } }), false);
  assert.strictEqual(cnIsUrgent_({ subformData: { flags: [] } }), false);
  assert.strictEqual(cnIsUrgent_({ subformData: {} }), false);
  assert.strictEqual(cnIsUrgent_({}), false);
  assert.strictEqual(cnIsUrgent_(null), false);
});
test('cnUrgentPillHtml_ renders the danger pill only when urgent', () => {
  assert.strictEqual(cnUrgentPillHtml_({ subformData: { flags: ['action'] } }), '');
  const html = cnUrgentPillHtml_({ subformData: { flags: ['urgent'] } });
  assert.ok(html.includes('cn-urgent-pill'), 'has the pill class');
  assert.ok(/urgent/i.test(html), 'shows the urgent label');
});

console.log('\ncn — email template picker filtering (#2)');
test('cnExtTemplatesFor_ returns "any" + matching-type templates only', () => {
  sb.CN_STATE.deptConfig.emailTemplates = [
    { name: 'Generic', recipientType: 'any', body: 'Hi {name}' },
    { name: 'Cust only', recipientType: 'customer', body: 'c' },
    { name: 'Prov only', recipientType: 'provider', body: 'p' },
  ];
  const forCust = cnExtTemplatesFor_('customer').map((t) => t.name);
  assert.deepStrictEqual(forCust, ['Generic', 'Cust only']);
  const forProv = cnExtTemplatesFor_('provider').map((t) => t.name);
  assert.deepStrictEqual(forProv, ['Generic', 'Prov only']);
});
test('cnExtTemplateOptionsHtml_ tags non-any templates and escapes names', () => {
  sb.CN_STATE.deptConfig.emailTemplates = [
    { name: '<b>x</b>', recipientType: 'customer', body: 'c' },
  ];
  const html = cnExtTemplateOptionsHtml_('customer');
  assert.ok(html.includes('Insert a template…'), 'has placeholder option');
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'), 'name is escaped');
  assert.ok(html.includes('(customer)'), 'tags the recipient type');
  assert.ok(!html.includes('<b>x</b>'), 'no raw HTML survives');
});
test('cnExtTemplatesAll_ tolerates a missing deptConfig', () => {
  const saved = sb.CN_STATE;
  sb.CN_STATE = {};
  const all = cnExtTemplatesAll_();
  assert.ok(Array.isArray(all) && all.length === 0, 'returns an empty array');
  sb.CN_STATE = saved;
});

console.log('\ncn — quick-link picker (surveys / reviews)');
test('cnExtLinkOptionsHtml_ lists labels + escapes them, with a placeholder', () => {
  sb.CN_STATE.deptConfig.externalLinks = [
    { label: 'Satisfaction Survey', url: 'https://survey.example/abc' },
    { label: '<b>Review</b>', url: 'https://g.page/r/xyz' },
  ];
  const html = cnExtLinkOptionsHtml_();
  assert.ok(html.includes('Insert a link…'), 'has placeholder option');
  assert.ok(html.includes('Satisfaction Survey'), 'lists the label');
  assert.ok(html.includes('&lt;b&gt;Review&lt;/b&gt;') && !html.includes('<b>Review</b>'), 'escapes labels');
});
test('cnExtLinksAll_ tolerates a missing deptConfig', () => {
  const saved = sb.CN_STATE;
  sb.CN_STATE = {};
  assert.ok(Array.isArray(cnExtLinksAll_()) && cnExtLinksAll_().length === 0);
  sb.CN_STATE = saved;
});

console.log('\ncn — win-back nudge (close reason = changing suppliers)');
test('cnIsSwitchingSuppliersReason_ matches switch/change-supplier phrasings', () => {
  ['changing suppliers', 'Changed supplier', 'switching to another provider',
   'going with a different supplier', 'moving to a competitor', 'found supplies elsewhere',
  ].forEach((r) => assert.ok(cnIsSwitchingSuppliersReason_(r), 'should match: ' + r));
});
test('cnIsSwitchingSuppliersReason_ ignores unrelated / empty reasons', () => {
  ['', 'duplicate order', 'patient deceased', 'insurance denied', 'no longer needs equipment',
  ].forEach((r) => assert.ok(!cnIsSwitchingSuppliersReason_(r), 'should NOT match: ' + r));
});
test('cnFindWinbackTemplate_ self-gates on a configured win-back template', () => {
  const saved = sb.CN_STATE;
  sb.CN_STATE = { deptConfig: { emailTemplates: [{ name: 'Feedback', recipientType: 'customer', body: 'x' }] } };
  assert.strictEqual(cnFindWinbackTemplate_(), null, 'no win-back template → null (nudge stays silent)');
  sb.CN_STATE.deptConfig.emailTemplates.push({ name: 'Win-Back Survey', recipientType: 'customer', body: 'Hi {name}' });
  assert.strictEqual((cnFindWinbackTemplate_() || {}).name, 'Win-Back Survey');
  sb.CN_STATE = saved;
});

console.log('\nCode.js — cnExtractAuditNoteId_() (#3 audit noteId parser)');
// Pure server helper both audit endpoints depend on. Extracted from Code.js
// (raw, not a <script> partial) and run in the sandbox.
vm.runInContext(extractRawFunction('Code.js', 'cnExtractAuditNoteId_'), sb,
  { filename: 'Code.js#cnExtractAuditNoteId_' });
const cnExtractAuditNoteId_ = sb.cnExtractAuditNoteId_;
test('extracts the uuid from a CallNote audit Notes field', () => {
  assert.strictEqual(
    cnExtractAuditNoteId_('noteId=3f2504e0-4f89-41d3-9a0c-0305e82c3301; urgent=on'),
    '3f2504e0-4f89-41d3-9a0c-0305e82c3301');
  assert.strictEqual(
    cnExtractAuditNoteId_('noteId=abc12345; depts=Shipping'), 'abc12345');
});
test('returns empty string when no noteId is present', () => {
  assert.strictEqual(cnExtractAuditNoteId_('Updated department emails (3 depts)'), '');
  assert.strictEqual(cnExtractAuditNoteId_(''), '');
  assert.strictEqual(cnExtractAuditNoteId_(null), '');
  assert.strictEqual(cnExtractAuditNoteId_(undefined), '');
});

console.log('\ncn — cnLatestManagerReply_() (L4/L5 feedback[] vs legacy precedence)');
// Pure helper behind both the Training Answers tray and the manager read-only
// card — resolves the latest manager reply, preferring the multi-turn
// feedback[] thread and falling back to the legacy trainingReply field.
const cnLatestManagerReply_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnLatestManagerReply_');
test('prefers the latest manager reply in feedback[] over legacy trainingReply', () => {
  const r = cnLatestManagerReply_({
    trainingReply: 'legacy', trainingReplyBy: 'old@x',
    feedback: [
      { role: 'manager', kind: 'reply', message: 'first', by: 'm1@x' },
      { role: 'agent', kind: 'ack', message: '' },
      { role: 'manager', kind: 'reply', message: 'latest', by: 'm2@x' },
    ],
  });
  assert.strictEqual(r.message, 'latest');
  assert.strictEqual(r.by, 'm2@x');
});
test('falls back to legacy trainingReply when feedback[] has no manager reply', () => {
  const legacy = cnLatestManagerReply_({ trainingReply: 'legacy', trainingReplyBy: 'm@x' });
  assert.strictEqual(legacy.message, 'legacy');
  assert.strictEqual(legacy.by, 'm@x');
  // agent-only feedback with no manager entry → empty
  const agentOnly = cnLatestManagerReply_({ feedback: [{ role: 'agent', kind: 'ack', message: '' }] });
  assert.strictEqual(agentOnly.message, '');
  // missing / null subformData → empty, never throws
  assert.strictEqual(cnLatestManagerReply_({}).message, '');
  assert.strictEqual(cnLatestManagerReply_(null).message, '');
});

console.log('\nCode.js — isValidTimeOffType_() (M1 leave-type whitelist)');
// Pure server helper guarding submitTimeOffRequest / managerSubmitTimeOff.
// Source BOTH the validator and its canonical TIME_OFF_TYPES set from Code.js
// (no local re-declaration → no Category-B drift). Strip the `const` so the
// array lands as a sandbox global the extracted function reads as a free var.
const codeSrc = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
const totMatch = codeSrc.match(/const (TIME_OFF_TYPES\s*=\s*\[[\s\S]*?\]);/);
assert.ok(totMatch, 'TIME_OFF_TYPES declaration found in Code.js');
vm.runInContext(totMatch[1] + ';', sb, { filename: 'Code.js#TIME_OFF_TYPES' });
vm.runInContext(extractRawFunction('Code.js', 'isValidTimeOffType_'), sb,
  { filename: 'Code.js#isValidTimeOffType_' });
const isValidTimeOffType_ = sb.isValidTimeOffType_;

test('accepts every canonical type, case- and whitespace-insensitive', () => {
  sb.TIME_OFF_TYPES.forEach((t) => assert.strictEqual(isValidTimeOffType_(t), true, t));
  assert.strictEqual(isValidTimeOffType_('  full day  '), true);
  assert.strictEqual(isValidTimeOffType_('SICK LEAVE'), true);
});
test('rejects unknown / empty / malformed types', () => {
  assert.strictEqual(isValidTimeOffType_('Half Day'), false); // missing - Morning/Afternoon
  assert.strictEqual(isValidTimeOffType_('Vacation'), false);
  assert.strictEqual(isValidTimeOffType_(''), false);
  assert.strictEqual(isValidTimeOffType_(null), false);
  assert.strictEqual(isValidTimeOffType_(undefined), false);
});
// Coupling tripwire: every leave type the UI <select> offers must be accepted
// by the server validator, or a legitimate request would now be rejected (the
// new failure mode M1 introduced — TIME_OFF_TYPES ↔ modal options must agree).
test('every day-type <select> option is an accepted leave type', () => {
  const modalsSrc = fs.readFileSync(path.join(__dirname, '../../web-app/modals.html'), 'utf8');
  const block = modalsSrc.slice(modalsSrc.indexOf('id="day-type"'));
  const sel = block.slice(0, block.indexOf('</select>'));
  const opts = [...sel.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(opts.length >= 5, 'parsed the day-type option list');
  opts.forEach((v) => assert.strictEqual(isValidTimeOffType_(v), true,
    `UI offers "${v}" but the server validator rejects it`));
});

console.log('\nCode.js — feature-flag registry + getFlag_ (Plan A)');
// These server helpers reference CONFIG (registry defaults) + PropertiesService
// (the override store). Build a dedicated vm context with minimal stubs, then
// load the FEATURE_FLAGS const + the flag helpers straight from Code.js.
const flagCtx = {
  Object, Array, JSON, String, Boolean, console,
  CONFIG: {
    SHOW_TEAMMATE_STATUS: true, SHOW_TEAMMATE_TYPE: true, ENABLE_PTO_TRACKING: true,
    CALL_NOTES: { VOICE_INPUT_ENABLED: false },
  },
  _props: {},
};
flagCtx.PropertiesService = {
  getScriptProperties: function () {
    return { getProperty: function (k) {
      return Object.prototype.hasOwnProperty.call(flagCtx._props, k) ? flagCtx._props[k] : null;
    } };
  },
};
vm.createContext(flagCtx);
const ffSrc = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
const ffConst = ffSrc.match(/const (FEATURE_FLAGS\s*=\s*\[[\s\S]*?\];)/);
assert.ok(ffConst, 'FEATURE_FLAGS declaration found in Code.js');
vm.runInContext(ffConst[1] + ';', flagCtx, { filename: 'Code.js#FEATURE_FLAGS' });
['featureFlagDef_', 'getFlagOverrides_', 'getFlag_', 'getFeatureFlagsResolved_'].forEach(function (fn) {
  vm.runInContext(extractRawFunction('Code.js', fn), flagCtx, { filename: 'Code.js#' + fn });
});

test('registry integrity: unique keys, boolean defaults, valid scope, labelled', () => {
  const seen = {};
  flagCtx.FEATURE_FLAGS.forEach(function (f) {
    assert.ok(f.key && !seen[f.key], 'unique key: ' + f.key); seen[f.key] = 1;
    assert.strictEqual(typeof f.default, 'boolean', f.key + ' default must be boolean');
    assert.ok(['client', 'server', 'both'].indexOf(f.scope) >= 0, f.key + ' scope must be valid');
    assert.ok(f.label, f.key + ' must have a label');
  });
});
test('getFlag_ returns the registry default when no override is set', () => {
  flagCtx._props = {};
  assert.strictEqual(flagCtx.getFlag_('oopSalesTax'), true);
  assert.strictEqual(flagCtx.getFlag_('voiceInput'), false);
});
test('getFlag_ honors a Script-Property override (both directions, string + bool)', () => {
  flagCtx._props = { CN_FEATURE_FLAGS: JSON.stringify({ oopSalesTax: false, voiceInput: true }) };
  assert.strictEqual(flagCtx.getFlag_('oopSalesTax'), false);
  assert.strictEqual(flagCtx.getFlag_('voiceInput'), true);
});
test('getFlag_ fails safe: corrupt blob → defaults, unknown key → false', () => {
  flagCtx._props = { CN_FEATURE_FLAGS: '{not valid json' };
  assert.strictEqual(flagCtx.getFlag_('oopSalesTax'), true);   // corrupt → registry default
  flagCtx._props = {};
  assert.strictEqual(flagCtx.getFlag_('totallyUnknownFlag'), false);  // unknown → fail-safe false
});
test('getFeatureFlagsResolved_ returns a boolean for every registry key', () => {
  flagCtx._props = {};
  const r = flagCtx.getFeatureFlagsResolved_();
  flagCtx.FEATURE_FLAGS.forEach(function (f) {
    assert.strictEqual(typeof r[f.key], 'boolean', f.key + ' resolved to a boolean');
  });
});

console.log('\nCode.js — branded email builders escape user data (#2 INV-105)');
// buildBrandedEmailHtml_ embeds bodyHtml raw (callers pre-esc_ it) but esc_'s
// the heading; brandedKvRows_ esc_'s both label and value. A new field added
// without esc_ is stored XSS in the sent email — these pin that discipline.
// Source esc_ + CN_EMAIL_PALETTE + the two builders straight from Code.js.
const palMatch = codeSrc.match(/const (CN_EMAIL_PALETTE\s*=\s*\{[\s\S]*?\});/);
assert.ok(palMatch, 'CN_EMAIL_PALETTE declaration found in Code.js');
vm.runInContext(palMatch[1] + ';', sb, { filename: 'Code.js#CN_EMAIL_PALETTE' });
['esc_', 'buildBrandedEmailHtml_', 'brandedKvRows_'].forEach(function (fn) {
  vm.runInContext(extractRawFunction('Code.js', fn), sb, { filename: 'Code.js#' + fn });
});
const buildBrandedEmailHtml_ = sb.buildBrandedEmailHtml_;
const brandedKvRows_ = sb.brandedKvRows_;

test('buildBrandedEmailHtml_ escapes the heading, embeds caller-escaped body raw', () => {
  const html = buildBrandedEmailHtml_('<img src=x onerror=alert(1)>', '<p>trusted body</p>');
  assert.strictEqual(html.indexOf('<img src=x onerror=alert(1)>'), -1, 'raw heading must not appear');
  assert.ok(html.indexOf('&lt;img src=x onerror=alert(1)&gt;') >= 0, 'heading is HTML-escaped');
  assert.ok(html.indexOf('<p>trusted body</p>') >= 0, 'bodyHtml embeds raw by design (caller esc_s it)');
});
test('brandedKvRows_ escapes BOTH label and value', () => {
  const rows = brandedKvRows_([['Re<b>ason', 'a"<script>x']]);
  assert.strictEqual(rows.indexOf('<b>ason'), -1, 'no raw label markup');
  assert.strictEqual(rows.indexOf('<script>'), -1, 'no raw value markup');
  assert.ok(rows.indexOf('Re&lt;b&gt;ason') >= 0, 'label escaped');
  assert.ok(rows.indexOf('a&quot;&lt;script&gt;x') >= 0, 'value escaped');
});
test('branded builders never throw on null / empty inputs', () => {
  assert.doesNotThrow(() => buildBrandedEmailHtml_('', ''));
  assert.doesNotThrow(() => brandedKvRows_([['x', null], [null, undefined]]));
});

console.log('\nCode.js — automation trigger wiring is self-consistent (#3 coupling tripwire)');
// Guards the class of bug that bit purgeOldCallNotes: a ScriptApp.newTrigger('X')
// whose handler is missing from the TARGETS arrays. TARGETS drives BOTH the
// pre-install dedupe loop AND removeAutomationTriggers, so a missing entry means
// re-running install DUPLICATES that trigger and remove can't clean it up.
const installSrc = extractRawFunction('Code.js', 'installAutomationTriggers');
const removeSrc  = extractRawFunction('Code.js', 'removeAutomationTriggers');
function targetsSet_(fnSrc) {
  const m = fnSrc.match(/const TARGETS = \[([\s\S]*?)\]/);
  assert.ok(m, 'TARGETS array found');
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
}
const newTriggerHandlers = [...installSrc.matchAll(/newTrigger\('([^']+)'\)/g)].map((x) => x[1]).sort();
const installTargets = targetsSet_(installSrc);
const removeTargets  = targetsSet_(removeSrc);

test('every installed trigger handler is in the install TARGETS dedupe list', () => {
  assert.ok(newTriggerHandlers.length >= 8, 'parsed the newTrigger handlers (got ' + newTriggerHandlers.length + ')');
  newTriggerHandlers.forEach((h) => assert.ok(installTargets.indexOf(h) >= 0,
    'newTrigger("' + h + '") is missing from install TARGETS → re-install would duplicate it'));
});
test('install TARGETS lists nothing it does not also create', () => {
  installTargets.forEach((t) => assert.ok(newTriggerHandlers.indexOf(t) >= 0,
    'TARGETS lists "' + t + '" but no newTrigger creates it'));
});
test('removeAutomationTriggers TARGETS matches the install set (cleans up all it adds)', () => {
  assert.deepStrictEqual(removeTargets, installTargets,
    'install and remove TARGETS must list the same handlers');
});

console.log('\nCode.js — Sheets-coerced timestamp columns are read via normalizeAuditTs_ (M1 tripwire)');
// The Sheets-coercion class has now bitten twice (AuditLog timestamps, then
// TO.SUBMITTED_AT flattening the pending-trend sparkline to zero). Every read
// of a "yyyy-MM-dd HH:mm:ss" column in the ADP spreadsheet must route through
// normalizeAuditTs_ — a raw String(...) read of a coerced Date yields
// "Thu Jun 11 2026 ...", which silently fails every parse / date filter /
// chronological sort downstream.
test('no raw String() reads of TO/PAR.SUBMITTED_AT remain in Code.js', () => {
  const tsSrc = fs.readFileSync(path.join(__dirname, '../../web-app/Code.js'), 'utf8');
  const raw = [...tsSrc.matchAll(/String\(\s*\w+\[i\]\[(TO|PAR)\.SUBMITTED_AT\]/g)];
  assert.deepStrictEqual(raw.map((m) => m[0]), [],
    'found raw String() read(s) of a SUBMITTED_AT cell — route through normalizeAuditTs_ (M1)');
  // And the normalized reads actually exist (the tripwire stays armed).
  const normalized = [...tsSrc.matchAll(/normalizeAuditTs_\(\s*\w+\[i\]\[(TO|PAR)\.SUBMITTED_AT\]/g)];
  assert.ok(normalized.length >= 8, 'expected ≥8 normalizeAuditTs_ SUBMITTED_AT reads, got ' + normalized.length);
});
test('Tests.js reads SUBMITTED_AT through normalizeAuditTs_ too', () => {
  const tSrc = fs.readFileSync(path.join(__dirname, '../../web-app/Tests.js'), 'utf8');
  const raw = [...tSrc.matchAll(/String\(\s*\w+\[i\]\[(TO|PAR)\.SUBMITTED_AT\]/g)];
  assert.deepStrictEqual(raw.map((m) => m[0]), [], 'test helper must match the production read');
});

console.log('\nscript_core — view-key literals match the TOOLS registry (M3 tripwire)');
// refreshViewIfCurrent('<tabKey>', …) guards every mutation refresh; a typo'd
// key silently skips the refresh forever (the Manage tab's key is 'manage',
// not 'manager' — exactly that mistake was caught in review). Check every
// literal in the view partials against the LIVE registry from the sandbox.
test("every refreshViewIfCurrent('…') literal is a registered tab key", () => {
  const partials = ['tc/script_clock.html', 'tc/script_timesheet.html', 'tc/script_timeoff.html',
    'tc/script_manager.html', 'cn/script_callnotes.html', 'metrics/script_metrics.html',
    'intake/script_intake.html', 'kb/script_kb.html', 'script_core.html'];
  // TOOLS / VIEW_TO_TOOL are top-level consts (lexical, not on the sandbox
  // global), so parse the tab keys from the registry source: every tab entry
  // carries an `enter:` handler.
  const coreSrc = fs.readFileSync(path.join(__dirname, '../../web-app/script_core.html'), 'utf8');
  const toolsBlock = coreSrc.match(/const TOOLS = \{[\s\S]*?\n\};/);
  assert.ok(toolsBlock, 'TOOLS registry block found');
  const validKeys = [...toolsBlock[0].matchAll(/(\w+):\s*\{[^}]*enter:\s*'/g)].map((m) => m[1]);
  assert.ok(validKeys.length >= 10, 'TOOLS registry tab keys parsed (got ' + validKeys.length + ')');
  partials.forEach((f) => {
    const src = fs.readFileSync(path.join(__dirname, '../../web-app/' + f), 'utf8');
    [...src.matchAll(/refreshViewIfCurrent\('([^']+)'/g)].forEach((m) => {
      assert.ok(validKeys.indexOf(m[1]) >= 0,
        f + ": refreshViewIfCurrent('" + m[1] + "') is not a TOOLS tab key");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Intake module — recommendation engine (PPD crown jewel) + layout coupling.
// ─────────────────────────────────────────────────────────────────────────────

// extract a top-level `const NAME = {...};` object literal from a source file
function extractConstObject(file, name) {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'web-app', file), 'utf8');
  const start = src.indexOf('const ' + name);
  if (start < 0) throw new Error('const ' + name + ' not found in ' + file);
  const open = src.indexOf('{', start);
  let depth = 0, i = open;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(open, i); // the {...} text
}
// same for a client partial: read its <script> and slice a `var NAME = {...}`
function extractClientObject(file, name) {
  const src = extractScript(file);
  const start = src.indexOf(name + ' = {');
  if (start < 0) throw new Error(name + ' not found in ' + file);
  const open = src.indexOf('{', start);
  let depth = 0, i = open;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(open, i);
}

console.log('\nCode.js — intakeFilterRecommendations_() (PPD engine)');
const engineCtx = vm.createContext({});
vm.runInContext(extractRawFunction('Code.js', 'intakeFilterRecommendations_'), engineCtx,
  { filename: 'Code.js#intakeFilterRecommendations_' });
const intakeFilterRecommendations_ = engineCtx.intakeFilterRecommendations_;

// fixture catalog: [features, hcpcs, weightCap, seatType, pdfLink, imageUrl]
const CAT = [
  ['Std Captain', 'K0823', '350', 'C', 'pdf-823', 'img-823'],
  ['SPO solid',   'K0856', '350', 'S', 'pdf-856', 'img-856'],
  ['G3 solid',    'K0861', '350', 'S', 'pdf-861', 'img-861'],
  ['MPO solid',   'K0843', '450', 'S', 'pdf-843', 'img-843'],
  ['G3 wide',     'K0862', '600', 'S', 'pdf-862', 'img-862'],
];

// NOTE: engine outputs are created inside the vm context (different realm), so
// assert.deepStrictEqual against main-realm literals would fail the prototype
// check. Compare via primitives (join/length) instead.
test('no complex conditions → standard captain chair only, no Group-3/SPO/MPO', () => {
  const r = intakeFilterRecommendations_({ '38': '250 lbs' }, CAT);
  assert.strictEqual(r.standard.map((p) => p.hcpcs).join(','), 'K0823');
  assert.strictEqual(r.complex.length, 0, 'group-3/SPO/MPO require eligibility');
});

test('neuro Dx → solid-seat required (captain dropped) + K0856→K0861 & K0843→K0862 substitutions', () => {
  const r = intakeFilterRecommendations_({ '38': '250', '43': 'multiple sclerosis' }, CAT);
  assert.strictEqual(r.standard.length, 0, 'captain chair fails the solid-seat requirement');
  assert.strictEqual(r.complex.map((p) => p.hcpcs).join(','), 'K0862,K0861', 'substituted + sorted desc');
  // substitution must carry the TARGET code's pdf/image, not the source's
  const k0861 = r.complex.find((p) => p.hcpcs === 'K0861');
  assert.strictEqual(k0861.pdfLink, 'pdf-861');
});

test('weight cap excludes products below the patient weight ceiling', () => {
  const r = intakeFilterRecommendations_({ '38': '500 lbs', '43': 'ALS' }, CAT);
  const all = r.complex.concat(r.standard).map((p) => p.hcpcs);
  assert.ok(all.indexOf('K0862') >= 0, 'the 600-cap chair survives at 500 lbs');
  assert.ok(all.indexOf('K0861') < 0, 'the 350-cap chair is excluded at 500 lbs');
  assert.ok(all.indexOf('K0843') < 0, 'the 450-cap chair is excluded at 500 lbs');
});

test('oxygen excludes K0837 (an inherently-solid SPO chair)', () => {
  const oxyCat = [['SPO', 'K0837', '350', 'S', 'p', 'i']];
  const onOxy = intakeFilterRecommendations_({ '38': '250', '32': 'yes', '44': 'yes' }, oxyCat);
  const offOxy = intakeFilterRecommendations_({ '38': '250', '32': 'yes', '44': 'no' }, oxyCat);
  assert.strictEqual(onOxy.complex.concat(onOxy.standard).length, 0, 'K0837 dropped when on oxygen');
  assert.ok(offOxy.complex.concat(offOxy.standard).map((p) => p.hcpcs).indexOf('K0837') >= 0);
});

test('engine never throws on empty answers / empty catalog', () => {
  const e1 = intakeFilterRecommendations_({}, []);
  assert.strictEqual(e1.standard.length + e1.complex.length, 0);
  const e2 = intakeFilterRecommendations_(null, null);
  assert.strictEqual(e2.standard.length + e2.complex.length, 0);
});

console.log('\nintake — client render layout mirrors the server (coupling tripwire)');
const _lcx = vm.createContext({});
vm.runInContext('var SRV_PMD = ' + extractConstObject('Code.js', 'INTAKE_PMD_LAYOUT') + ';', _lcx);
vm.runInContext('var SRV_PAP = ' + extractConstObject('Code.js', 'INTAKE_PAP_LAYOUT') + ';', _lcx);
vm.runInContext('var CLI_PMD = ' + extractClientObject('intake/script_intake.html', 'INTAKE_PMD_CLIENT') + ';', _lcx);
vm.runInContext('var CLI_PAP = ' + extractClientObject('intake/script_intake.html', 'INTAKE_PAP_CLIENT') + ';', _lcx);

[['PMD', _lcx.SRV_PMD, _lcx.CLI_PMD], ['PAP', _lcx.SRV_PAP, _lcx.CLI_PAP]].forEach(([form, srv, cli]) => {
  test(form + ' headers: client (0-based) +1 === server HEADER_ROWS (1-based)', () => {
    assert.deepStrictEqual(cli.headers.map((x) => x + 1), srv.HEADER_ROWS);
  });
  test(form + ' checkbox rows match server CHECKBOX_ROWS', () => {
    assert.deepStrictEqual(cli.checkboxes, srv.CHECKBOX_ROWS);
  });
  test(form + ' secondary rows match server SECONDARY_QUESTION_ROWS', () => {
    assert.deepStrictEqual(cli.secondary, srv.SECONDARY_QUESTION_ROWS);
  });
});

console.log('\nforms — interactive form IDs: client mirrors the server (coupling tripwire)');
test('CN_INTERACTIVE_FORM_IDS (cn partial) === INTERACTIVE_FORM_TYPES (Code.js)', () => {
  const grabArr = (src, name, where) => {
    const m = src.match(new RegExp(name + "\\s*=\\s*\\[([^\\]]*)\\]"));
    assert.ok(m, name + ' not found in ' + where);
    return m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  };
  assert.deepStrictEqual(
    grabArr(extractScript('cn/script_callnotes.html'), 'CN_INTERACTIVE_FORM_IDS', 'cn/script_callnotes.html'),
    grabArr(codeSrc, 'INTERACTIVE_FORM_TYPES', 'Code.js'),
    'the client fillable-form ID list must mirror the server list');
});

console.log('\nforms — invite email builders carry no prefilled patient data (hardening Fix 6)');
['buildCustomerEmailHtml_', 'buildProviderEmailHtml_', 'buildCustomerEmailText_', 'buildProviderEmailText_'].forEach((fn) => {
  test(fn + ' takes only (recipientName, message, formNames, formLinks) and never reads prefill', () => {
    const src = extractRawFunction('Code.js', fn);
    const sig = src.match(/function\s+\w+\s*\(([^)]*)\)/)[1].split(',').map((s) => s.trim());
    assert.deepStrictEqual(sig, ['recipientName', 'message', 'formNames', 'formLinks']);
    // Prefill (patient identifiers) must stay in the token store, never the
    // email body — so the invite stays PHI-minimal in cleartext transit.
    assert.ok(!/prefill/i.test(src), fn + ' must not reference prefill data');
  });
});

console.log('\nforms — normalizeWebAppExecUrl_() produces the canonical public /exec link');
const _urlCtx = vm.createContext({});
vm.runInContext(extractRawFunction('Code.js', 'normalizeWebAppExecUrl_'), _urlCtx, { filename: 'Code.js#normalizeWebAppExecUrl_' });
const normalizeWebAppExecUrl_ = _urlCtx.normalizeWebAppExecUrl_;
test('strips the /a/<domain>/ Workspace prefix (the customer-blocking bug)', () => {
  assert.strictEqual(
    normalizeWebAppExecUrl_('https://script.google.com/a/universalmedsupply.com/macros/s/AKfycbABC/exec'),
    'https://script.google.com/macros/s/AKfycbABC/exec');
});
test('rewrites a trailing /dev to /exec', () => {
  assert.strictEqual(
    normalizeWebAppExecUrl_('https://script.google.com/macros/s/AKfycbABC/dev'),
    'https://script.google.com/macros/s/AKfycbABC/exec');
});
test('leaves an already-canonical /exec URL unchanged', () => {
  const u = 'https://script.google.com/macros/s/AKfycbABC/exec';
  assert.strictEqual(normalizeWebAppExecUrl_(u), u);
});

console.log('\nkb — markdown renderer (kbMd_) escapes HTML + sanitizes links');
loadFunction(sb, 'kb/script_kb.html', 'kbSlug_');   // kbMd_ heading ids depend on it
const kbMd_ = loadFunction(sb, 'kb/script_kb.html', 'kbMd_');
test('renders headings (with anchor ids), bold, and lists', () => {
  assert.ok(kbMd_('# Title').indexOf('<h1 id="kb-h-title">Title</h1>') >= 0);
  assert.ok(kbMd_('**b**').indexOf('<strong>b</strong>') >= 0);
  assert.ok(kbMd_('- one\n- two').indexOf('<li>one</li>') >= 0);
  // duplicate headings get -2/-3 suffixed ids (same walk as kbSplitSections_)
  const dup = kbMd_('## Dup\n\n## Dup');
  assert.ok(dup.indexOf('id="kb-h-dup"') >= 0 && dup.indexOf('id="kb-h-dup-2"') >= 0);
});
test('escapes raw HTML / script in the source (no injection)', () => {
  const out = kbMd_('<script>alert(1)</script>');
  assert.ok(out.indexOf('<script') < 0, 'no raw <script>');
  assert.ok(out.indexOf('&lt;script&gt;') >= 0, 'angle brackets escaped');
});
test('allows http(s)/mailto links, strips javascript: URLs to plain text', () => {
  assert.ok(kbMd_('[x](https://a.com)').indexOf('<a href="https://a.com"') >= 0);
  const js = kbMd_('[x](javascript:alert(1))');
  assert.ok(js.indexOf('href="javascript') < 0 && js.indexOf('<a ') < 0, 'javascript: URL not linked');
});
test('percent-encodes quotes in link URLs (no href attribute breakout)', () => {
  // A `"` in the URL would otherwise close the href attribute and inject an
  // event handler (the top-level escape covers &/</> but not quotes).
  const out = kbMd_('[x](https://e.com/"onmouseover=alert`1`)');
  assert.ok(out.indexOf('"onmouseover') < 0, 'quote must not terminate the href attribute');
  assert.ok(out.indexOf('%22') >= 0, 'double quote percent-encoded');
  const single = kbMd_("[x](https://e.com/'q)");
  assert.ok(single.indexOf('%27') >= 0, 'single quote percent-encoded');
});
test('renders GFM tables (header, body, alignment, pipe escape)', () => {
  const out = kbMd_('| H1 | H2 |\n| --- | :---: |\n| a | b |\n| c | d |');
  assert.ok(out.indexOf('<table>') >= 0 && out.indexOf('</table>') >= 0, 'table element emitted');
  assert.ok(out.indexOf('<th>H1</th>') >= 0, 'header cell');
  assert.ok(out.indexOf('<th style="text-align:center">H2</th>') >= 0, 'alignment honored');
  assert.ok(out.indexOf('<td>a</td>') >= 0, 'body cell (unaligned column)');
  assert.ok(out.indexOf('<td style="text-align:center">d</td>') >= 0, 'body cell inherits column alignment');
  // inline formatting works inside cells
  const fmt = kbMd_('| H |\n| --- |\n| **b** |');
  assert.ok(fmt.indexOf('<td><strong>b</strong></td>') >= 0, 'bold inside a cell');
  // \| is a literal pipe inside a cell, not a column break
  const esc2 = kbMd_('| H |\n| --- |\n| a \\| b |');
  assert.ok(esc2.indexOf('<td>a | b</td>') >= 0, 'escaped pipe stays in the cell');
  // body rows clamp to the header column count (extra cells dropped)
  const clamp = kbMd_('| H |\n| --- |\n| a | extra |');
  assert.ok(clamp.indexOf('<td>extra</td>') < 0, 'extra cell beyond the header is dropped');
  // a lone |-line with no separator is NOT a table (renders as a paragraph)
  const notTable = kbMd_('| just text |');
  assert.ok(notTable.indexOf('<table>') < 0, 'no separator → no table');
});
test('renders images (http(s) only) with escaped alt + URL quotes', () => {
  const out = kbMd_('![cap](https://e.com/i.png)');
  assert.ok(out.indexOf('<img src="https://e.com/i.png"') >= 0, 'img emitted');
  assert.ok(out.indexOf('alt="cap"') >= 0, 'alt carried');
  assert.ok(out.indexOf('loading="lazy"') >= 0, 'lazy loading');
  assert.ok(out.indexOf('<a href="https://e.com/i.png"') >= 0, 'wrapped in an open-full-size anchor');
  // scheme restriction: javascript:/data:/mailto demote to plain alt text
  const js = kbMd_('![x](javascript:alert(1))');
  assert.ok(js.indexOf('<img') < 0 && js.indexOf('javascript:') < 0, 'javascript: image not rendered');
  assert.ok(js.indexOf('x') >= 0, 'alt text kept as plain text');
  assert.ok(kbMd_('![x](data:image/svg+xml,abc)').indexOf('<img') < 0, 'data: image not rendered');
  // attribute breakout guards: quotes encoded in src, entity-escaped in alt
  const q = kbMd_('![a" onerror=alert(1)](https://e.com/i.png)');
  assert.ok(q.indexOf('" onerror') < 0, 'quote in alt must not terminate the attribute');
  assert.ok(q.indexOf('&quot;') >= 0, 'alt quote entity-escaped');
  const uq = kbMd_('![x](https://e.com/"o.png)');
  assert.ok(uq.indexOf('"o.png') < 0 && uq.indexOf('%22') >= 0, 'quote in src percent-encoded');
});

console.log('\nkb — section-aware search helpers (split / truncate / score / slug parity)');
const _kbSearchCtx = vm.createContext({});
['kbSlug_', 'kbSplitSections_', 'kbChunkTruncate_', 'kbSearchScore_'].forEach((fn) => {
  vm.runInContext(extractRawFunction('Code.js', fn), _kbSearchCtx, { filename: 'Code.js#' + fn });
});
const srvKbSlug_ = _kbSearchCtx.kbSlug_;
const kbSplitSections_ = _kbSearchCtx.kbSplitSections_;
const kbChunkTruncate_ = _kbSearchCtx.kbChunkTruncate_;
const kbSearchScore_ = _kbSearchCtx.kbSearchScore_;

test('kbSplitSections_: preamble + heading sections, heading excluded from md', () => {
  const secs = kbSplitSections_('intro text\n\n# One\nbody one\n\n## Two\nbody two');
  assert.strictEqual(secs.length, 3);
  assert.strictEqual(secs[0].heading, '');
  assert.strictEqual(secs[0].md, 'intro text');
  assert.strictEqual(secs[1].heading, 'One');
  assert.strictEqual(secs[1].anchor, 'one');
  assert.strictEqual(secs[1].md, 'body one');
  assert.strictEqual(secs[2].anchor, 'two');
});
test('kbSplitSections_: fenced # lines do not split; duplicate anchors dedupe', () => {
  const secs = kbSplitSections_('# Real\n```\n# not a heading\n```\nafter\n\n# Real\nx');
  assert.strictEqual(secs.length, 2, 'fenced # stays inside its section');
  assert.ok(secs[0].md.indexOf('# not a heading') >= 0);
  assert.strictEqual(secs[0].anchor, 'real');
  assert.strictEqual(secs[1].anchor, 'real-2', 'duplicate heading anchor suffixed');
});
test('anchor slugs: server kbSlug_ matches kbMd_\'s heading ids (parity pair)', () => {
  // The server slugs RAW markdown; kbMd_ slugs the ESCAPED source — the
  // entity de-escape inside both copies keeps them identical.
  assert.strictEqual(srvKbSlug_('Q&A / Setup'), 'q-a-setup');
  assert.ok(kbMd_('# Q&A / Setup').indexOf('id="kb-h-q-a-setup"') >= 0);
  // and the dedup walks agree
  const anchors = kbSplitSections_('## Dup\nx\n\n## Dup\ny').map((s) => s.anchor);
  assert.strictEqual(anchors.join(','), 'dup,dup-2');
});
test('kbChunkTruncate_: paragraph-boundary cut + odd-fence repair', () => {
  const short = kbChunkTruncate_('small', 100);
  assert.strictEqual(short.truncated, false);
  // boundary at ~44 chars is past the 40%-of-cap floor, so the cut lands there
  const long = kbChunkTruncate_('p '.repeat(22) + '\n\n' + 'x'.repeat(200), 60);
  assert.strictEqual(long.truncated, true);
  assert.ok(long.md.indexOf('x') < 0, 'cut lands on the paragraph boundary before the cap');
  const fence = kbChunkTruncate_('```\ncode\n' + 'y'.repeat(200), 50);
  assert.ok((fence.md.match(/^\s*```/gm) || []).length % 2 === 0, 'odd fence count repaired');
});
test('kbSearchScore_: section-text hit required; heading > body; title + phrase boost', () => {
  // title-only match scores 0 — the caller emits a doc-level hit instead of
  // flooding every section of a title-matched doc into the results
  assert.strictEqual(kbSearchScore_(['war'], 'war', 'warranty guide', 'intro', 'nothing here'), 0);
  // (3-char query → below the 4-char phrase-bonus floor, isolating the weights)
  assert.strictEqual(kbSearchScore_(['war'], 'war', '', '', 'warranty info'), 1, 'body hit = 1');
  assert.strictEqual(kbSearchScore_(['war'], 'war', '', 'warranty terms', 'x'), 2, 'heading hit = 2');
  assert.strictEqual(kbSearchScore_(['war'], 'war', 'warranty guide', '', 'warranty info'), 4, 'body 1 + title 3');
  // a 4+ char single-token query that matches IS its own exact phrase (+2)
  assert.strictEqual(kbSearchScore_(['warranty'], 'warranty', '', '', 'warranty info'), 3, 'body 1 + phrase 2');
  // multi-token: each distinct token scores its best location (no phrase
  // bonus here — the exact phrase appears in neither heading nor body)
  assert.strictEqual(kbSearchScore_(['wheelchair', 'repair'], 'wheelchair repair', '', 'repair process', 'wheelchair steps'),
    3, 'heading hit 2 + body hit 1');
  // exact-phrase bonus when the full query appears
  assert.strictEqual(kbSearchScore_(['return', 'policy'], 'return policy', '', '', 'our return policy is simple'),
    1 + 1 + 2, 'two body hits + phrase bonus');
});

console.log('\nkb — drawer pure helpers (recents list + title-match suggestions)');
const kbRecentsPush_ = loadFunction(sb, 'kb/script_kb.html', 'kbRecentsPush_');
const kbSuggestMatches_ = loadFunction(sb, 'kb/script_kb.html', 'kbSuggestMatches_');
test('kbRecentsPush_: prepends, dedupes by id, caps at 5', () => {
  const l1 = kbRecentsPush_([], { id: 'a', title: 'A' });
  assert.strictEqual(l1.length, 1);
  assert.strictEqual(l1[0].id, 'a');
  // re-opening an item moves it to the front (no duplicate)
  const l2 = kbRecentsPush_([{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }], { id: 'b', title: 'B' });
  assert.strictEqual(l2.map((r) => r.id).join(','), 'b,a');
  // cap: 5 entries max, oldest dropped
  let list = [];
  for (let i = 0; i < 8; i++) list = kbRecentsPush_(list, { id: 'i' + i, title: 'T' + i });
  assert.strictEqual(list.length, 5);
  assert.strictEqual(list[0].id, 'i7');
  assert.strictEqual(list[4].id, 'i3');
});
test('kbSuggestMatches_: 4+ char tokens, scored by distinct title hits, capped', () => {
  const tree = [
    { id: '1', title: 'Wheelchair repair process' },
    { id: '2', title: 'Repair escalation policy' },
    { id: '3', title: 'PTO calendar' },
  ];
  const m = kbSuggestMatches_(tree, 'patient needs wheelchair repair asap', 3);
  assert.strictEqual(m[0].id, '1', 'two token hits ranks first (wheelchair + repair)');
  assert.strictEqual(m[1].id, '2', 'one token hit second');
  assert.strictEqual(m.length, 2, 'non-matching items excluded');
  // short words never match (no 1-3 char token noise like "pto" mid-word)
  assert.strictEqual(kbSuggestMatches_(tree, 'the a of is to', 3).length, 0);
  assert.strictEqual(kbSuggestMatches_(tree, '', 3).length, 0, 'empty text → no suggestions');
  assert.strictEqual(kbSuggestMatches_(null, 'wheelchair', 3).length, 0, 'no tree → no suggestions');
  // repeated tokens count once (distinct-token scoring)
  const rep = kbSuggestMatches_(tree, 'repair repair repair', 3);
  assert.strictEqual(rep.length, 2, 'duplicate tokens deduped before scoring');
});

console.log('\nCode.js — kbParseDriveUrl_() extracts {kind,fileId} from Drive URLs');
const _kbCtx = vm.createContext({});
vm.runInContext(extractRawFunction('Code.js', 'kbParseDriveUrl_'), _kbCtx, { filename: 'Code.js#kbParseDriveUrl_' });
const kbParseDriveUrl_ = _kbCtx.kbParseDriveUrl_;
test('parses Doc / Sheet / file URLs and rejects junk', () => {
  assert.strictEqual(kbParseDriveUrl_('https://docs.google.com/document/d/ABC123/edit').kind, 'doc');
  assert.strictEqual(kbParseDriveUrl_('https://docs.google.com/spreadsheets/d/SHEET9/edit#gid=0').kind, 'sheet');
  assert.strictEqual(kbParseDriveUrl_('https://drive.google.com/file/d/FILE7/view').fileId, 'FILE7');
  assert.strictEqual(kbParseDriveUrl_('not a url'), null);
});

// ── KB Phase 2 — Doc→markdown converter ─────────────────────────────────────
// kbDocBodyToMarkdown_ compares String(getType()) etc. against enum NAMES
// (DocumentApp enums stringify to their names), so plain-object stubs can
// drive the whole walker here. The stubs mirror exactly the DocumentApp
// surface the converter touches.
console.log('\nkb — Doc→markdown converter (kbDocBodyToMarkdown_ via DocumentApp stubs)');
const _kbConvCtx = vm.createContext({
  KB_DOC_HEADING_PREFIX: {
    TITLE: '# ', HEADING1: '# ', HEADING2: '## ', HEADING3: '### ',
    HEADING4: '#### ', HEADING5: '##### ', HEADING6: '###### ', SUBTITLE: '## ',
  },
});
['kbTextToRuns_', 'kbRunsToMarkdown_', 'kbDocBodyToMarkdown_'].forEach((fn) => {
  vm.runInContext(extractRawFunction('Code.js', fn), _kbConvCtx, { filename: 'Code.js#' + fn });
});
const kbRunsToMarkdown_ = _kbConvCtx.kbRunsToMarkdown_;
const kbDocBodyToMarkdown_ = _kbConvCtx.kbDocBodyToMarkdown_;

function mkText(runs) {  // runs: [{text, bold, italic, link}]
  const full = runs.map((r) => r.text).join('');
  const starts = [];
  let pos = 0;
  runs.forEach((r) => { starts.push(pos); pos += r.text.length; });
  const runAt = (off) => {
    for (let i = runs.length - 1; i >= 0; i--) if (off >= starts[i]) return runs[i];
    return runs[0];
  };
  return {
    getText: () => full,
    getTextAttributeIndices: () => starts,
    isBold: (o) => !!runAt(o).bold,
    isItalic: (o) => !!runAt(o).italic,
    getLinkUrl: (o) => runAt(o).link || null,
  };
}
function mkPara(opts) {  // {heading?, runs?, children?: [elementTypeNames]}
  const kids = (opts.children || []).map((t) => ({ getType: () => t }));
  return {
    getType: () => 'PARAGRAPH',
    getHeading: () => opts.heading || 'NORMAL',
    getNumChildren: () => kids.length,
    getChild: (i) => kids[i],
    editAsText: () => mkText(opts.runs || []),
  };
}
function mkList(opts) {  // {glyph?, nest?, runs}
  return {
    getType: () => 'LIST_ITEM',
    getGlyphType: () => (opts.glyph === undefined ? 'BULLET' : opts.glyph),
    getNestingLevel: () => opts.nest || 0,
    editAsText: () => mkText(opts.runs || []),
  };
}
function mkTable(rows) {  // rows: [[cell, ...], ...] — cell: string | {runs, nested?}
  const mkCell = (def) => {
    const runs = (def && typeof def === 'object') ? (def.runs || []) : [{ text: String(def == null ? '' : def) }];
    const kids = (def && typeof def === 'object' && def.nested) ? [{ getType: () => 'TABLE' }] : [];
    return {
      getText: () => runs.map((r) => r.text).join(''),
      editAsText: () => mkText(runs),
      getNumChildren: () => kids.length,
      getChild: (i) => kids[i],
    };
  };
  return {
    getType: () => 'TABLE',
    getNumRows: () => rows.length,
    getRow: (r) => ({
      getNumCells: () => rows[r].length,
      getCell: (c) => mkCell(rows[r][c]),
    }),
  };
}
function mkBody(els) { return { getNumChildren: () => els.length, getChild: (i) => els[i] }; }

test('kbRunsToMarkdown_: bold/italic/link emission is kbMd_-render-safe', () => {
  assert.strictEqual(kbRunsToMarkdown_([{ text: 'plain ' }, { text: 'bold', bold: true }]), 'plain **bold**');
  assert.strictEqual(kbRunsToMarkdown_([{ text: 'it', italic: true }]), '*it*');
  // bold+italic collapses to bold (kbMd_ can't render ***)
  assert.strictEqual(kbRunsToMarkdown_([{ text: 'both', bold: true, italic: true }]), '**both**');
  // trailing run whitespace stays OUTSIDE the markers
  assert.strictEqual(kbRunsToMarkdown_([{ text: 'b ', bold: true }, { text: 'after' }]), '**b** after');
  // links: http(s)/mailto only; parens/spaces percent-encoded; [] stripped from text
  assert.strictEqual(kbRunsToMarkdown_([{ text: 'go', link: 'https://e.com/a(1) b' }]),
    '[go](https://e.com/a%281%29%20b)');
  assert.strictEqual(kbRunsToMarkdown_([{ text: 'x[y]', link: 'https://e.com' }]), '[xy](https://e.com)');
  assert.strictEqual(kbRunsToMarkdown_([{ text: 'js', link: 'javascript:alert(1)' }]), 'js');
  // Docs soft line-break (\r) becomes a space
  assert.strictEqual(kbRunsToMarkdown_([{ text: 'a\rb' }]), 'a b');
});

test('converts headings, paragraphs, lists, and hr', () => {
  const res = kbDocBodyToMarkdown_(mkBody([
    mkPara({ heading: 'HEADING1', runs: [{ text: 'Title' }] }),
    mkPara({ runs: [{ text: 'Body with ' }, { text: 'bold', bold: true }, { text: '.' }] }),
    mkList({ runs: [{ text: 'one' }] }),
    mkList({ runs: [{ text: 'two' }] }),
    mkList({ glyph: 'NUMBER', runs: [{ text: 'first' }] }),
    mkPara({ children: ['HORIZONTAL_RULE'] }),
    mkPara({ heading: 'HEADING2', runs: [{ text: 'Sub' }] }),
  ]));
  assert.strictEqual(res.markdown,
    '# Title\n\nBody with **bold**.\n\n- one\n- two\n1. first\n\n---\n\n## Sub');
  // strictEqual on length (not deepStrictEqual on the array) — the result
  // array comes from the vm context, whose Array prototype differs.
  assert.strictEqual(res.warnings.length, 0);
});

test('converts tables to GFM (row 0 = header); images still placeholder + warn', () => {
  const res = kbDocBodyToMarkdown_(mkBody([
    mkTable([['H1', 'H2'], ['a', 'b']]),
    mkPara({ runs: [{ text: 'caption' }], children: ['INLINE_IMAGE'] }),
  ]));
  assert.ok(res.markdown.indexOf('| H1 | H2 |\n| --- | --- |\n| a | b |') >= 0, 'GFM table emitted');
  assert.ok(res.markdown.indexOf('caption *[image — see the original Doc]*') >= 0, 'image placeholder appended');
  assert.strictEqual(res.warnings.length, 1, 'tables no longer warn — only the image does');
  assert.ok(/1 image/.test(res.warnings.join(' ')));
});

test('table cells: formatting survives, pipes escape, ragged rows pad, lossy cases warn', () => {
  const res = kbDocBodyToMarkdown_(mkBody([
    mkTable([
      [{ runs: [{ text: 'Bold', bold: true }] }, 'A | B'],
      [{ runs: [{ text: 'line1\nline2' }] }],                       // ragged + multi-line
      ['x', { runs: [{ text: 'nest' }], nested: true }],            // nested table
    ]),
  ]));
  assert.ok(res.markdown.indexOf('| **Bold** | A \\| B |') >= 0, 'bold survives; literal pipe escaped');
  assert.ok(res.markdown.indexOf('| line1 line2 |  |') >= 0, 'multi-line cell joined; short row padded');
  assert.ok(/multiple lines/.test(res.warnings.join(' ')), 'line-break cells warned');
  assert.ok(/Nested table/.test(res.warnings.join(' ')), 'nested tables warned');
  // Round-trip tripwire: the converter's GFM must be renderable by kbMd_ —
  // the two formats are a parallel source-of-truth pair.
  const html = kbMd_(res.markdown);
  assert.ok(html.indexOf('<table>') >= 0, 'kbMd_ parses the converter output as a table');
  assert.ok(html.indexOf('<th>A | B</th>') >= 0, 'escaped pipe round-trips through kbMd_ (header row)');
  assert.ok(html.indexOf('<th><strong>Bold</strong></th>') >= 0, 'bold round-trips inside a header cell');
});

test('empty table emits nothing (no stray separator)', () => {
  const res = kbDocBodyToMarkdown_(mkBody([mkTable([['', ''], ['', '']])]));
  assert.strictEqual(res.markdown, '');
});

test('skips unsupported elements with a warning; null glyph defaults to bullet', () => {
  const res = kbDocBodyToMarkdown_(mkBody([
    { getType: () => 'TABLE_OF_CONTENTS' },
    mkList({ glyph: null, runs: [{ text: 'item' }] }),
  ]));
  assert.strictEqual(res.markdown, '- item');
  assert.ok(/TABLE_OF_CONTENTS/.test(res.warnings.join(' ')), 'skipped type named in warnings');
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
