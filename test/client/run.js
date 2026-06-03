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

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
