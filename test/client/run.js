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
  'train/script_training.html',
  'train/script_empdocs.html',
  'script_tour.html',
].forEach((f) => {
  test(f + ' parses', () => {
    const src = extractScript(f);
    assert.ok(src.trim().length > 0, 'has a <script> block');
    new vm.Script(src, { filename: f });  // throws on a syntax error
  });
});

// Design-token hygiene tripwire: every `var(--x)` in the SHARED design-token
// partials must resolve to a custom property defined somewhere in those same
// partials. Catches the `--accent-deep` bug class (an undefined token that
// silently falls back to a flatter shade / its `var(...)` fallback, so dark
// mode never inverts and the intended deeper tone never renders) — it shipped
// undetected precisely because nothing scanned for it.
//   • `form_public.html` is a STANDALONE page with its own complete :root
//     palette (it does NOT include styles_design_tokens.html), so it neither
//     contributes definitions to the shared set nor is checked against it.
//   • TOKEN_ALLOWLIST holds intentional, pending exceptions (each with a
//     literal fallback so it renders correctly until removed).
console.log('\nclient — design-token hygiene (no undefined var(--x) in shared partials)');
test('every var(--token) resolves to a defined custom property', () => {
  const WEB_APP = path.resolve(__dirname, '../../web-app');
  const STANDALONE = new Set(['form_public.html']); // own palette — excluded
  // Pending-removal exceptions. Remove an entry when its module migration lands.
  // (--brand was removed when the Intake redesign dropped the bespoke navy header.)
  const TOKEN_ALLOWLIST = {};
  const htmlFiles = [];
  (function walk(dir, rel) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(abs, r);
      else if (e.name.endsWith('.html')) htmlFiles.push(r);
    }
  })(WEB_APP, '');
  const shared = htmlFiles.filter((f) => !STANDALONE.has(f));
  const defined = new Set();
  const defRe = /(--[a-z0-9-]+)\s*:/gi;
  const srcByFile = {};
  for (const f of shared) {
    const t = fs.readFileSync(path.join(WEB_APP, f), 'utf8');
    srcByFile[f] = t;
    let m; while ((m = defRe.exec(t))) defined.add(m[1]);
  }
  const useRe = /var\(\s*(--[a-z0-9-]+)/gi;
  const violations = [];
  for (const f of shared) {
    let m; while ((m = useRe.exec(srcByFile[f]))) {
      const name = m[1];
      if (defined.has(name)) continue;
      if (Object.prototype.hasOwnProperty.call(TOKEN_ALLOWLIST, name)) continue;
      violations.push(name + '  <-  ' + f);
    }
  }
  assert.strictEqual(
    violations.length, 0,
    'undefined design tokens used in shared partials (define them in ' +
    'styles_design_tokens.html, or fix the name):\n      ' +
    [...new Set(violations)].join('\n      '));
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
});
test('rejects unknown / empty / malformed types', () => {
  assert.strictEqual(isValidTimeOffType_('Half Day'), false); // missing - Morning/Afternoon
  assert.strictEqual(isValidTimeOffType_('Sick Leave'), false); // #2 — sick deprecated, no longer creatable
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

console.log('\ntc/script_clock — dashProjection_() (run-rate projection)');
const dashProjection_ = loadFunction(sb, 'tc/script_clock.html', 'dashProjection_');
test('projects MTD/YTD counts by elapsed fraction; null for yesterday / <3d / complete', () => {
  const m = dashProjection_(100, '2026-06-01', '2026-06-10', 'mtd');   // 10 of 30 days → ~300 by EOM
  assert.strictEqual(m.projected, 300); assert.strictEqual(m.endLabel, 'Jun 30');
  const y = dashProjection_(1000, '2026-01-01', '2026-03-01', 'ytd');  // 60 of 365 days
  assert.strictEqual(y.endLabel, 'Dec 31'); assert.ok(y.projected > 6000 && y.projected < 6200);
  assert.strictEqual(dashProjection_(100, '2026-06-25', '2026-06-25', 'yesterday'), null); // not a range period
  assert.strictEqual(dashProjection_(100, '2026-06-01', '2026-06-02', 'mtd'), null);        // < 3 days elapsed
  assert.strictEqual(dashProjection_(null, '2026-06-01', '2026-06-10', 'mtd'), null);       // null value
  assert.strictEqual(dashProjection_(100, '2026-06-01', '2026-06-30', 'mtd'), null);        // complete period
});

console.log('\nCode.js — formTokenCellMs_() (coercion-safe form-token expiry read)');
// Regression for the "every fresh token reads as expired" bug: when FORMS_SS_ID
// points at a sheet that coerces the ISO-T ExpiresAt string to a datetime,
// getValues() returns a Date — the old String()+strict-parse fail-closed it to
// "expired". formTokenCellMs_ must accept a Date directly. Stub its deps
// (CONFIG.TIMEZONE + parseTimestampMs_) so the helper unit-tests in isolation.
vm.runInContext(
  'var CONFIG = { TIMEZONE: "Asia/Kolkata" };' +
  'function parseTimestampMs_(s, tz) { return /^\\d{4}-\\d{2}-\\d{2}T/.test(s) ? 1700000000000 : null; }' +
  'var Utilities = { formatDate: function (d, tz, fmt) { return "ISO:" + d.getTime() + ":" + tz; } };',
  sb, { filename: 'test#formTokenCellMs_deps' });
vm.runInContext(extractRawFunction('Code.js', 'formTokenCellMs_'), sb,
  { filename: 'Code.js#formTokenCellMs_' });
const formTokenCellMs_ = sb.formTokenCellMs_;

// Field-wise asserts (the helper returns a sandbox-realm object, so a whole-
// object deepStrictEqual trips on prototype identity across vm realms).
const expectCell = (r, present, ms) => {
  assert.strictEqual(r.present, present);
  assert.strictEqual(r.ms, ms);
};
test('a coerced Date cell is valid (the bug) — present, ms = getTime()', () => {
  const d = new Date(Date.UTC(2026, 5, 27, 13, 0, 0));
  expectCell(formTokenCellMs_(d), true, d.getTime());
});
test('an empty / null cell is absent (no expiry → skip the check)', () => {
  expectCell(formTokenCellMs_(''), false, null);
  expectCell(formTokenCellMs_(null), false, null);
  expectCell(formTokenCellMs_(undefined), false, null);
});
test('a valid ISO-T string parses; a non-empty garbage string fail-closes (ms=null)', () => {
  expectCell(formTokenCellMs_('2026-06-27T19:00:00'), true, 1700000000000);
  expectCell(formTokenCellMs_('not-a-date'), true, null);
});

// formTokenIsoString_ is the display sibling — the source of the #90 regression
// (two return sites referenced a removed var). Pin its three branches so a
// future refactor of the returned expiresAt/createdAt values can't silently
// leak a coerced-Date blob or break.
vm.runInContext(extractRawFunction('Code.js', 'formTokenIsoString_'), sb,
  { filename: 'Code.js#formTokenIsoString_' });
const formTokenIsoString_ = sb.formTokenIsoString_;
test('formTokenIsoString_: Date + parseable string → reformatted ISO; empty → ""; garbage → raw', () => {
  const d = new Date(Date.UTC(2026, 5, 27, 13, 0, 0));
  assert.strictEqual(formTokenIsoString_(d), 'ISO:' + d.getTime() + ':Asia/Kolkata');       // coerced Date → clean ISO
  assert.strictEqual(formTokenIsoString_('2026-06-27T19:00:00'), 'ISO:1700000000000:Asia/Kolkata');
  assert.strictEqual(formTokenIsoString_(''), '');                                          // empty stays empty
  assert.strictEqual(formTokenIsoString_('garbage'), 'garbage');                            // unparseable passes through
});

console.log('\nCode.js — adminAuditRowTone_() + sheet-view allowlist (Tier 2)');
vm.runInContext(extractRawFunction('Code.js', 'adminAuditRowTone_'), sb,
  { filename: 'Code.js#adminAuditRowTone_' });
const adminAuditRowTone_ = sb.adminAuditRowTone_;
test('row tone: destructive / degradation / automation / neutral', () => {
  ['FormDataPurge', 'CallNoteDelete', 'EmpDocVoid'].forEach((a) =>
    assert.strictEqual(adminAuditRowTone_(a), 'danger', a));
  ['PersonalSheetSyncFail', 'PtoReconciliationFix'].forEach((a) =>
    assert.strictEqual(adminAuditRowTone_(a), 'warn', a));
  ['CallNotesReconcile', 'AdpExport', 'CallNotesArchive', 'CallNotesProvision'].forEach((a) =>
    assert.strictEqual(adminAuditRowTone_(a), 'info', a));
  ['CallNoteCreate', '', null, undefined].forEach((a) =>
    assert.strictEqual(adminAuditRowTone_(a), '', String(a)));
});
// 2b — KB review-due tone (mirrors the kbGetReviewDue staleness rule, INV-126).
vm.runInContext(extractRawFunction('Code.js', 'adminKbReviewTone_'), sb,
  { filename: 'Code.js#adminKbReviewTone_' });
const adminKbReviewTone_ = sb.adminKbReviewTone_;
test('KB review tone: null age or age ≥ dueDays → warn; fresher → neutral', () => {
  assert.strictEqual(adminKbReviewTone_(null, 90), 'warn');   // never reviewed/edited
  assert.strictEqual(adminKbReviewTone_(120, 90), 'warn');
  assert.strictEqual(adminKbReviewTone_(90, 90), 'warn');     // boundary inclusive
  assert.strictEqual(adminKbReviewTone_(30, 90), '');
  assert.strictEqual(adminKbReviewTone_(0, 90), '');
});
// Coupling tripwire: the client view picker must never offer a view the server
// allowlist doesn't honor — the KEY is the security boundary (INV-32/121/122).
test('client CN_SHEET_VIEWS keys ⊆ server adminSheetViewKeys_()', () => {
  const cnSrc = fs.readFileSync(path.join(__dirname, '../../web-app/cn/script_callnotes.html'), 'utf8');
  const serverKeys = (codeSrc.match(/function adminSheetViewKeys_\(\)\s*\{\s*return\s*(\[[^\]]*\])/) || [])[1];
  const clientBlock = (cnSrc.match(/var CN_SHEET_VIEWS\s*=\s*(\[[\s\S]*?\]);/) || [])[1];
  assert.ok(serverKeys && clientBlock, 'found both view lists');
  const sk = JSON.parse(serverKeys.replace(/'/g, '"'));
  const ck = [...clientBlock.matchAll(/key:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(ck.length >= 1, 'parsed client view keys');
  ck.forEach((k) => assert.ok(sk.includes(k), `client offers "${k}" but server allowlist omits it`));
});

console.log('\nCode.js — dashboard metrics pure helpers (period range + cohort-guarded team)');
['dashboardPeriodRange_', 'dashboardTeamAggregate_', 'dashboardTeamTransfer_'].forEach((fn) =>
  vm.runInContext(extractRawFunction('Code.js', fn), sb, { filename: 'Code.js#' + fn }));
const dashboardPeriodRange_ = sb.dashboardPeriodRange_;
const dashboardTeamAggregate_ = sb.dashboardTeamAggregate_;
const dashboardTeamTransfer_ = sb.dashboardTeamTransfer_;
test('dashboardPeriodRange_: yesterday/mtd/ytd resolve from today (UTC string math)', () => {
  const y = dashboardPeriodRange_('yesterday', '2026-03-01');
  assert.strictEqual(y.from, '2026-02-28'); assert.strictEqual(y.to, '2026-02-28'); // month + leap-safe rollback
  const m = dashboardPeriodRange_('mtd', '2026-06-17');
  assert.strictEqual(m.from, '2026-06-01'); assert.strictEqual(m.to, '2026-06-17');
  const yt = dashboardPeriodRange_('ytd', '2026-06-17');
  assert.strictEqual(yt.from, '2026-01-01'); assert.strictEqual(yt.to, '2026-06-17');
  assert.strictEqual(dashboardPeriodRange_('bogus', '2026-06-17'), null);
  assert.strictEqual(dashboardPeriodRange_('mtd', 'not-a-date'), null);
});
test('dashboardTeamAggregate_: sums, recomputes pct, answered-weighted ATT; null below cohort', () => {
  const agents = {
    A: { totalRung: 100, totalAnswered: 90, totalMissed: 10, attSeconds: 200 },
    B: { totalRung: 100, totalAnswered: 80, totalMissed: 20, attSeconds: 100 },
    C: { totalRung: 0,   totalAnswered: 0,  totalMissed: 0,  attSeconds: 0 },   // no data → not in cohort
  };
  const below = dashboardTeamAggregate_(agents, 3);   // only A,B qualify → cohort 2 < 3
  assert.strictEqual(below.team, null); assert.strictEqual(below.cohort, 2);
  const ok = dashboardTeamAggregate_(agents, 2);
  assert.strictEqual(ok.cohort, 2);
  assert.strictEqual(ok.team.rung, 200); assert.strictEqual(ok.team.answered, 170);
  assert.strictEqual(ok.team.pctAnswered, 85);  // 170/200
  assert.strictEqual(ok.team.attSeconds, Math.round((200 * 90 + 100 * 80) / 170)); // answered-weighted
});
test('dashboardTeamTransfer_: sums calls/transferred, recomputes pct; null below cohort', () => {
  const t = { A: { totalCalls: 50, transferred: 10 }, B: { totalCalls: 50, transferred: 20 }, C: { totalCalls: 0, transferred: 0 } };
  assert.strictEqual(dashboardTeamTransfer_(t, 3).transfer, null);   // cohort 2 < 3
  const ok = dashboardTeamTransfer_(t, 2);
  assert.strictEqual(ok.transfer.totalCalls, 100); assert.strictEqual(ok.transfer.transferred, 30);
  assert.strictEqual(ok.transfer.transferPct, 30);  // 30/100
});

console.log('\nCode.js — coaching pure helpers (coachValidate_ / coachUnackedOverdue_)');
// Source the validator + its whitelist/caps from Code.js (no local re-declare).
const coachSevMatch = codeSrc.match(/const (COACH_SEVERITIES\s*=\s*\[[\s\S]*?\]);/);
const coachTmaxMatch = codeSrc.match(/const (COACH_TEXT_MAX\s*=\s*\d+);/);
const coachTrxMatch = codeSrc.match(/const (COACH_TRX_MAX\s*=\s*\d+);/);
assert.ok(coachSevMatch && coachTmaxMatch && coachTrxMatch, 'COACH_* consts found in Code.js');
vm.runInContext(coachSevMatch[1] + ';' + coachTmaxMatch[1] + ';' + coachTrxMatch[1] + ';', sb,
  { filename: 'Code.js#COACH_consts' });
vm.runInContext(extractRawFunction('Code.js', 'coachValidate_'), sb, { filename: 'Code.js#coachValidate_' });
vm.runInContext(extractRawFunction('Code.js', 'coachUnackedOverdue_'), sb, { filename: 'Code.js#coachUnackedOverdue_' });
const coachValidate_ = sb.coachValidate_;
const coachUnackedOverdue_ = sb.coachUnackedOverdue_;

test('coachValidate_ accepts a well-formed payload, trims + lowercases severity', () => {
  const r = coachValidate_({ empId: ' E1 ', severity: 'Major', whatHappened: ' did x ', whatShould: 'do y', patientTRX: 'TRX1', noteId: 'n1' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.item.empId, 'E1');
  assert.strictEqual(r.item.severity, 'major');
  assert.strictEqual(r.item.whatHappened, 'did x');
  assert.strictEqual(r.item.noteId, 'n1');
});
test('coachValidate_ allows empty whatShould (praise often has none)', () => {
  const r = coachValidate_({ empId: 'E1', severity: 'praise', whatHappened: 'great job' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.item.whatShould, '');
});
test('coachValidate_ rejects missing emp / bad severity / empty narrative / oversize', () => {
  assert.strictEqual(coachValidate_({ severity: 'minor', whatHappened: 'x' }).ok, false);
  assert.strictEqual(coachValidate_({ empId: 'E1', severity: 'nope', whatHappened: 'x' }).ok, false);
  assert.strictEqual(coachValidate_({ empId: 'E1', severity: 'minor', whatHappened: '  ' }).ok, false);
  assert.strictEqual(coachValidate_({ empId: 'E1', severity: 'minor', whatHappened: 'x'.repeat(sb.COACH_TEXT_MAX + 1) }).ok, false);
  assert.strictEqual(coachValidate_({ empId: 'E1', severity: 'minor', whatHappened: 'x', patientTRX: 't'.repeat(sb.COACH_TRX_MAX + 1) }).ok, false);
});
test('coachUnackedOverdue_ returns only open, non-praise items older than N days', () => {
  const now = 1000 * 86400000, day = 86400000;
  const items = [
    { status: 'open', severity: 'major', createdAtMs: now - 10 * day },          // overdue → in
    { status: 'open', severity: 'major', createdAtMs: now - 2 * day },           // too recent → out
    { status: 'acknowledged', severity: 'major', createdAtMs: now - 30 * day },  // acked → out
    { status: 'open', severity: 'praise', createdAtMs: now - 30 * day },         // praise → out
    { status: 'open', severity: 'critical', createdAtMs: now - 8 * day },        // overdue → in
  ];
  const due = coachUnackedOverdue_(items, now, 7);
  assert.strictEqual(due.length, 2);
  assert.ok(due.every((d) => d.status === 'open' && d.severity !== 'praise'));
});
test('coachUnackedOverdue_ never throws on empty / missing input', () => {
  assert.strictEqual(coachUnackedOverdue_(null, 0, 7).length, 0);
  assert.strictEqual(coachUnackedOverdue_([], 0, 7).length, 0);
});

vm.runInContext(extractRawFunction('Code.js', 'coachParseTs_'), sb, { filename: 'Code.js#coachParseTs_' });
vm.runInContext(extractRawFunction('Code.js', 'coachMedian_'), sb, { filename: 'Code.js#coachMedian_' });
vm.runInContext(extractRawFunction('Code.js', 'coachAnalytics_'), sb, { filename: 'Code.js#coachAnalytics_' });
const coachAnalytics_ = sb.coachAnalytics_;
test('coachMedian_ handles even/odd/empty', () => {
  assert.strictEqual(sb.coachMedian_([]), 0);
  assert.strictEqual(sb.coachMedian_([3]), 3);
  assert.strictEqual(sb.coachMedian_([1, 3]), 2);
  assert.strictEqual(sb.coachMedian_([5, 1, 3]), 3);
});
test('coachAnalytics_ aggregates severity / ack-rate / median-days / per-rep', () => {
  const now = Date.UTC(2026, 0, 20, 0, 0, 0); // 2026-01-20
  const items = [
    // acked 3 days after creation
    { empId: 'A', empName: 'Ana', severity: 'major', status: 'acknowledged', createdAt: '2026-01-01 09:00:00', acknowledgedAt: '2026-01-04 09:00:00' },
    // acked 1 day after creation
    { empId: 'A', empName: 'Ana', severity: 'minor', status: 'acknowledged', createdAt: '2026-01-10 09:00:00', acknowledgedAt: '2026-01-11 09:00:00' },
    // open + old → overdue (non-praise)
    { empId: 'B', empName: 'Bo', severity: 'critical', status: 'open', createdAt: '2026-01-01 09:00:00', acknowledgedAt: '' },
    // praise open + old → NOT overdue
    { empId: 'B', empName: 'Bo', severity: 'praise', status: 'open', createdAt: '2026-01-01 09:00:00', acknowledgedAt: '' },
  ];
  const a = coachAnalytics_(items, now, 7);
  assert.strictEqual(a.total, 4);
  assert.strictEqual(a.bySeverity.praise, 1);
  assert.strictEqual(a.bySeverity.minor, 1);
  assert.strictEqual(a.bySeverity.major, 1);
  assert.strictEqual(a.bySeverity.critical, 1);
  assert.strictEqual(a.acknowledged, 2);
  assert.strictEqual(a.ackRatePct, 50);
  assert.strictEqual(a.overdueUnacked, 1, 'critical open+old overdue; praise excluded');
  assert.strictEqual(a.medianDaysToAck, 2, 'median of [3,1] days = 2');
  const ana = a.perRep.find((r) => r.empId === 'A');
  assert.strictEqual(ana.ackRatePct, 100);
  assert.strictEqual(ana.medianDaysToAck, 2);
  // most-overdue rep sorts first
  assert.strictEqual(a.perRep[0].empId, 'B');
});
test('coachAnalytics_ empty input → zeroed shape', () => {
  const a = coachAnalytics_([], Date.now(), 7);
  assert.strictEqual(a.total, 0);
  assert.strictEqual(a.ackRatePct, 0);
  assert.strictEqual(a.perRep.length, 0);
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
    'intake/script_intake.html', 'kb/script_kb.html', 'train/script_training.html', 'train/script_empdocs.html', 'script_core.html'];
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

console.log('\nscript_core — Manage module gating (admin tier)');
// tabVisibleForUser_ reads the `empState` free var; inject it via a factory
// closure (the shared sandbox's lexical empState can't be overridden per-call).
const _tabVisSrc = extractRawFunction('script_core.html', 'tabVisibleForUser_');
const tabVisFactory = new Function('empState', _tabVisSrc + '; return tabVisibleForUser_;');
const tabVisWith = (emp, t) => tabVisFactory(emp)(t);
test('tabVisibleForUser_: adminOnly→isAdmin, managerOnly→isManager|also, plain→all', () => {
  // before state loads, only ungated tabs show
  assert.equal(tabVisWith(null, {}), true);
  assert.equal(tabVisWith(null, { managerOnly: true }), false);
  assert.equal(tabVisWith(null, { adminOnly: true }), false);
  // plain rep
  const rep = { isManager: false, isAdmin: false };
  assert.equal(tabVisWith(rep, { managerOnly: true }), false, 'rep: no manager tab');
  assert.equal(tabVisWith(rep, { adminOnly: true }), false, 'rep: no admin tab');
  assert.equal(tabVisWith(rep, { managerOnly: true, also: 'canSeeSpanish' }), false, 'rep without also');
  // Spanish rep reaches a managerOnly tab via its `also` flag
  assert.equal(tabVisWith({ isManager: false, isAdmin: false, canSeeSpanish: true },
    { managerOnly: true, also: 'canSeeSpanish' }), true, 'also grants the tab');
  // manager (not admin): manager tabs yes, admin tab NO
  const mgr = { isManager: true, isAdmin: false };
  assert.equal(tabVisWith(mgr, { managerOnly: true }), true, 'manager: manager tab');
  assert.equal(tabVisWith(mgr, { adminOnly: true }), false, 'NON-admin manager: NO admin tab');
  // admin sees the admin tab
  assert.equal(tabVisWith({ isManager: true, isAdmin: true }, { adminOnly: true }), true, 'admin: admin tab');
});
test('registry reorg: Manage hosts the moved tabs; Admin is adminOnly; old tools cleared', () => {
  const coreSrc = fs.readFileSync(path.join(__dirname, '../../web-app/script_core.html'), 'utf8');
  const manageBlock = coreSrc.match(/\n  manage:\s*\{[\s\S]*?\n  \},/);
  assert.ok(manageBlock, 'manage tool block found');
  ['manage:', 'coverage:', 'punctuality:', 'callNotesAdmin:'].forEach((k) =>
    assert.ok(manageBlock[0].indexOf(k) >= 0, 'manage tool hosts ' + k));
  assert.ok(/callNotesAdmin:\s*\{[^}]*adminOnly:\s*true/.test(manageBlock[0]), 'Admin tab is adminOnly');
  const timeClockBlock = coreSrc.match(/\n  timeClock:\s*\{[\s\S]*?\n  \},/);
  assert.ok(timeClockBlock && timeClockBlock[0].indexOf('coverage:') < 0 &&
    timeClockBlock[0].indexOf('punctuality:') < 0 && /\bmanage:/.test(timeClockBlock[0]) === false,
    'timeClock no longer hosts manage/coverage/punctuality');
  const callNotesBlock = coreSrc.match(/\n  callNotes:\s*\{[\s\S]*?\n  \},/);
  assert.ok(callNotesBlock && callNotesBlock[0].indexOf('callNotesAdmin:') < 0,
    'callNotes no longer hosts callNotesAdmin');
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
  KB_DOC_IMAGE_CAP: 20,   // mirrors Code.js (Phase 2b export cap)
});
['kbTextToRuns_', 'kbRunsToMarkdown_', 'kbDocBodyToMarkdown_',
 'kbExtractDocImageRefs_', 'kbReplaceDocImageTokens_', 'kbCollectDocInlineImages_'].forEach((fn) => {
  vm.runInContext(extractRawFunction('Code.js', fn), _kbConvCtx, { filename: 'Code.js#' + fn });
});
const kbRunsToMarkdown_ = _kbConvCtx.kbRunsToMarkdown_;
const kbDocBodyToMarkdown_ = _kbConvCtx.kbDocBodyToMarkdown_;
const kbExtractDocImageRefs_ = _kbConvCtx.kbExtractDocImageRefs_;
const kbReplaceDocImageTokens_ = _kbConvCtx.kbReplaceDocImageTokens_;
const kbCollectDocInlineImages_ = _kbConvCtx.kbCollectDocInlineImages_;

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

test('converts tables to GFM (row 0 = header); images placeholder + warn WITHOUT a docId', () => {
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

console.log('\nkb — Phase 2b converter image export (tokens, resolution, walk mirror)');
test('with a docId, INLINE_IMAGE emits a kbdoc token; INLINE_DRAWING stays a placeholder', () => {
  const res = kbDocBodyToMarkdown_(mkBody([
    mkPara({ runs: [{ text: 'pic' }], children: ['INLINE_IMAGE'] }),
    mkPara({ runs: [{ text: 'sketch' }], children: ['INLINE_DRAWING'] }),
  ]), 'DOC123_-x');
  assert.ok(res.markdown.indexOf('pic ![Doc image 1](kbdoc:DOC123_-x:1)') >= 0, 'image token emitted');
  assert.ok(res.markdown.indexOf('sketch *[image — see the original Doc]*') >= 0, 'drawing keeps placeholder (no blob API)');
  assert.ok(res.warnings.some((w) => /1 image\(s\) marked for export/.test(w)), 'export warning');
  assert.ok(res.warnings.some((w) => /could not be converted/.test(w)), 'drawing placeholder warning');
});
test('per-doc cap: images past KB_DOC_IMAGE_CAP degrade to placeholders', () => {
  const paras = [];
  for (let i = 0; i < 21; i++) paras.push(mkPara({ runs: [{ text: 'p' + i }], children: ['INLINE_IMAGE'] }));
  const res = kbDocBodyToMarkdown_(mkBody(paras), 'CAPDOC');
  const tokens = res.markdown.match(/kbdoc:CAPDOC:\d+/g) || [];
  assert.strictEqual(tokens.length, 20, '20 tokens');
  assert.strictEqual((res.markdown.match(/\[image — see the original Doc\]/g) || []).length, 1, '21st is a placeholder');
});
test('kbExtractDocImageRefs_ dedupes and parses {fileId, ord}', () => {
  const refs = kbExtractDocImageRefs_(
    '![a](kbdoc:F1:1) text ![b](kbdoc:F1:2) ![dup](kbdoc:F1:1) ![c](kbdoc:F2_x-9:3) ![not](http://x/y.png) kbdoc:F9:9');
  // JSON compare — the refs are vm-realm objects, so deepStrictEqual fails
  // on cross-realm prototypes even when the values match.
  assert.strictEqual(JSON.stringify(refs),
    JSON.stringify([{ fileId: 'F1', ord: 1 }, { fileId: 'F1', ord: 2 }, { fileId: 'F2_x-9', ord: 3 }]),
    'unique image tokens only — bare kbdoc text and http images ignored');
});
test('kbReplaceDocImageTokens_ swaps resolved tokens, degrades failures to placeholders', () => {
  const r = kbReplaceDocImageTokens_(
    '![Doc image 1](kbdoc:F1:1) and ![two](kbdoc:F1:2) and ![boom](kbdoc:F1:3)',
    (fileId, ord) => {
      if (ord === 1) return 'https://drive.google.com/thumbnail?id=ABC&sz=w1200';
      if (ord === 3) throw new Error('nope');
      return null;
    });
  assert.ok(r.bodyMd.indexOf('![Doc image 1](https://drive.google.com/thumbnail?id=ABC&sz=w1200)') >= 0, 'alt preserved, URL swapped');
  assert.strictEqual((r.bodyMd.match(/\[image — see the original Doc\]/g) || []).length, 2, 'null + throw both degrade');
  assert.strictEqual(r.failed, 2);
});
test('kbCollectDocInlineImages_ mirrors the converter walk (paragraph images only, in order, capped)', () => {
  const img = (tag) => ({ getType: () => 'INLINE_IMAGE', getBlob: () => ({ tag }) });
  const para = (kids) => ({
    getType: () => 'PARAGRAPH', getHeading: () => 'NORMAL',
    getNumChildren: () => kids.length, getChild: (i) => kids[i],
    editAsText: () => mkText([]),
  });
  const body = mkBody([
    para([img('a'), { getType: () => 'INLINE_DRAWING' }, img('b')]),
    mkList({ runs: [{ text: 'li' }] }),                     // list images never tokenized → never collected
    mkTable([['x']]),                                        // table images likewise
    para([img('c')]),
  ]);
  const blobs = kbCollectDocInlineImages_(body, 20);
  assert.strictEqual(Array.prototype.map.call(blobs, (b) => b.tag).join(','), 'a,b,c',
    'document order, drawings skipped (string compare — vm-realm array)');
  assert.strictEqual(kbCollectDocInlineImages_(body, 2).length, 2, 'cap respected');
});
test('kbParseImageDataUrl_: shape-parses image data URLs, rejects everything else', () => {
  const parse = (() => {
    const ctx = vm.createContext({});
    vm.runInContext(extractRawFunction('Code.js', 'kbParseImageDataUrl_'), ctx);
    return ctx.kbParseImageDataUrl_;
  })();
  const ok = parse('data:image/png;base64,iVBOR\nw0KGgo=');
  assert.strictEqual(ok.contentType, 'image/png');
  assert.strictEqual(ok.base64, 'iVBORw0KGgo=', 'whitespace stripped from base64');
  assert.strictEqual(parse('data:image/svg+xml;base64,AAAA').contentType, 'image/svg+xml',
    'parser shape-accepts svg — the TYPE WHITELIST at the caller is what rejects it');
  assert.strictEqual(parse('data:text/html;base64,AAAA'), null, 'non-image scheme rejected');
  assert.strictEqual(parse('https://x/y.png'), null);
  assert.strictEqual(parse('data:image/png;base64,!!!'), null, 'non-base64 payload rejected');
  assert.strictEqual(parse(''), null);
});
test('kbMd_: kbdoc tokens demote to alt text in preview; the Drive thumbnail URL renders an <img>', () => {
  const prev = kbMd_('![Doc image 1](kbdoc:F1:1)');
  assert.strictEqual(prev.indexOf('<img'), -1, 'unresolved token never renders an img (non-http scheme)');
  assert.ok(prev.indexOf('Doc image 1') >= 0, 'alt text shows in the editor preview');
  const final = kbMd_('![Doc image 1](https://drive.google.com/thumbnail?id=ABC&sz=w1200)');
  assert.ok(/<img[^>]+src="https:\/\/drive\.google\.com\/thumbnail\?id=ABC&(amp;)?sz=w1200"/.test(final), 'resolved URL renders');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nkb — AI Phase A facet guidance (whitelist / canonical hash / prompt — INV-119)');
// The pure pipeline between the client's raw facets and the vendor payload.
// kbAiSanitizeFacets_ is the privacy boundary: only vocabulary values
// survive, so the prompt builder (which takes ONLY sanitized facets + KB
// chunks) cannot carry free-typed note text to the vendor.
const _aiCtx = vm.createContext({});
['kbAiSanitizeFacets_', 'kbAiCanonicalFacets_', 'kbAiQueryTerms_', 'kbAiBuildPrompt_'].forEach((fn) => {
  vm.runInContext(extractRawFunction('Code.js', fn), _aiCtx, { filename: 'Code.js#' + fn });
});
const _aiVocab = {
  departments: ['Sales', 'Billing'],
  updateTypes: ['Verified Shipping', 'Close Order'],
  flagTypes: ['action', 'training', 'review', 'urgent'],
  tags: ['battery-swap', 'warranty'],
};
test('kbAiSanitizeFacets_: drops every non-vocabulary value (novel facets never survive)', () => {
  const clean = _aiCtx.kbAiSanitizeFacets_({
    department: 'NotADept',
    updateType: 'PATIENT JOHN DOE called about TRX-12345',   // free text masquerading as a facet
    flagType: 'banana',
    tags: ['warranty', 'totally-new-tag', 'warranty'],
  }, _aiVocab);
  assert.strictEqual(clean.department, '');
  assert.strictEqual(clean.updateType, '');
  assert.strictEqual(clean.flagType, '');
  assert.strictEqual(JSON.stringify(clean.tags), '["warranty"]', 'novel tag dropped, dup deduped (vm-realm array — string compare)');
});
test('kbAiSanitizeFacets_: case-insensitive match returns canonical vocab casing; tags cap at 8', () => {
  const clean = _aiCtx.kbAiSanitizeFacets_(
    { department: 'sales', updateType: 'close order', flagType: 'URGENT', tags: ['Battery-Swap'] }, _aiVocab);
  assert.strictEqual(clean.department, 'Sales');
  assert.strictEqual(clean.updateType, 'Close Order');
  assert.strictEqual(clean.flagType, 'urgent');
  assert.strictEqual(JSON.stringify(clean.tags), '["battery-swap"]');
  const manyVocab = { tags: 'abcdefghij'.split('').map((c) => 't-' + c) };
  const many = _aiCtx.kbAiSanitizeFacets_({ tags: manyVocab.tags }, manyVocab);
  assert.strictEqual(many.tags.length, 8, 'tag cap');
});
test('kbAiCanonicalFacets_: order-insensitive, lowercased, empties omitted', () => {
  const a = _aiCtx.kbAiCanonicalFacets_({ department: 'Sales', updateType: 'Close Order', flagType: 'action', tags: ['warranty', 'battery-swap'] });
  const b = _aiCtx.kbAiCanonicalFacets_({ tags: ['battery-swap', 'warranty'], flagType: 'action', updateType: 'Close Order', department: 'Sales' });
  assert.strictEqual(a, b, 'tag order does not change the hash payload');
  assert.strictEqual(a, 'dept=sales|update=close order|flag=action|tags=battery-swap,warranty');
  assert.strictEqual(_aiCtx.kbAiCanonicalFacets_({ flagType: 'action' }), 'flag=action', 'empty facets omitted');
});
test('kbAiQueryTerms_: kebab tags split to words; joins update/flag/dept', () => {
  const q = _aiCtx.kbAiQueryTerms_({ department: 'Sales', updateType: 'Close Order', flagType: 'action', tags: ['battery-swap'] });
  assert.strictEqual(q, 'Close Order battery swap action Sales');
});
test('kbAiBuildPrompt_: payload = sanitized facets + chunks only (INV-119 — free text cannot pass through)', () => {
  const raw = { department: 'Sales', flagType: 'action', tags: ['warranty'],
                issue: 'PATIENT JOHN DOE TRX-9 wheelchair broke', updateType: '' };
  const clean = _aiCtx.kbAiSanitizeFacets_(raw, _aiVocab);
  const prompt = _aiCtx.kbAiBuildPrompt_(clean, [
    { title: 'Warranty guide', heading: 'Swaps', chunkMd: 'Always file a swap ticket first.' },
  ]);
  const all = prompt.system + '\n' + prompt.user;
  assert.ok(all.indexOf('Department: Sales') >= 0 && all.indexOf('Tags: warranty') >= 0, 'facets present');
  assert.ok(all.indexOf('Always file a swap ticket first.') >= 0, 'KB chunk present');
  assert.strictEqual(all.indexOf('JOHN DOE'), -1, 'free-typed text never reaches the prompt');
  assert.strictEqual(all.indexOf('TRX-9'), -1);
});
test('kbGetFacetGuidance source tripwire: the vendor prompt is built from (clean, chunks) only', () => {
  const src = extractRawFunction('Code.js', 'kbGetFacetGuidance');
  assert.ok(src.indexOf('kbAiBuildPrompt_(clean, chunks)') >= 0,
    'prompt builder must be fed the SANITIZED facets, never the raw client payload');
  assert.strictEqual(/kbAiBuildPrompt_\((?!clean, chunks\))/.test(src), false,
    'no alternate kbAiBuildPrompt_ callsite with different inputs');
});

// ─────────────────────────────────────────────────────────────────────────────
// Training & Employee Docs — T1 (docs/training-employee-docs-spec.md).
// trainDeriveStatus_ is the pure status rule shared by getMyTraining +
// getTrainingDashboard (server); trainChipHtml_ is its client render twin.
// ─────────────────────────────────────────────────────────────────────────────
console.log('\ntraining — status derivation + chip render (T1)');
vm.runInContext(extractRawFunction('Code.js', 'trainDeriveStatus_'), sb,
  { filename: 'Code.js#trainDeriveStatus_' });
const trainDeriveStatus_ = sb.trainDeriveStatus_;
const trainChipHtml_ = loadFunction(sb, 'train/script_training.html', 'trainChipHtml_');
test('trainDeriveStatus_: done wins regardless of due date', () => {
  assert.strictEqual(trainDeriveStatus_(true, '2026-01-01', '2026-06-12'), 'done');
  assert.strictEqual(trainDeriveStatus_(true, '', '2026-06-12'), 'done');
});
test('trainDeriveStatus_: overdue only past a non-empty due date', () => {
  assert.strictEqual(trainDeriveStatus_(false, '2026-06-11', '2026-06-12'), 'overdue');
  assert.strictEqual(trainDeriveStatus_(false, '2026-06-12', '2026-06-12'), 'pending', 'due today is not overdue');
  assert.strictEqual(trainDeriveStatus_(false, '', '2026-06-12'), 'pending', 'no due date never goes overdue');
});
test('trainChipHtml_: renders the three statuses; unknown degrades to pending', () => {
  assert.ok(trainChipHtml_('done').indexOf('tr-chip done') >= 0);
  assert.ok(trainChipHtml_('overdue').indexOf('Overdue') >= 0);
  assert.ok(trainChipHtml_('<script>').indexOf('tr-chip pending') >= 0, 'unknown status falls back to pending (no injection)');
});

// T2 — quizzes. The three pure helpers (validate / grade / strip) plus the
// answer-key privacy boundary: the rep-facing shape is WHITELIST-built and
// getQuiz must route through it (source tripwire).
console.log('\ntraining — quiz validate / grade / strip (T2)');
['TRAIN_QUIZ_MAX_QUESTIONS', 'TRAIN_QUIZ_MAX_OPTIONS'].forEach((name) => {
  const m = codeSrc.match(new RegExp('const (' + name + '\\s*=\\s*\\d+);'));
  assert.ok(m, name + ' declaration found in Code.js');
  vm.runInContext(m[1] + ';', sb, { filename: 'Code.js#' + name });
});
['trainValidateQuizDef_', 'trainGradeQuiz_', 'trainStripQuizForRep_'].forEach((fn) => {
  vm.runInContext(extractRawFunction('Code.js', fn), sb, { filename: 'Code.js#' + fn });
});
const Q2 = { title: 'T', passPct: 80, questions: [
  { q: 'A?', options: ['x', 'y', 'z'], correct: 2 },
  { q: 'B?', options: ['t', 'f'], correct: 0 },
] };
test('trainValidateQuizDef_: normalizes a good def; rejects bad shapes', () => {
  const ok = sb.trainValidateQuizDef_(Q2);
  assert.ok(ok.ok, 'valid def accepted');
  assert.strictEqual(ok.quiz.questions.length, 2);
  assert.strictEqual(sb.trainValidateQuizDef_({ ...Q2, title: '' }).ok, false, 'empty title rejected');
  assert.strictEqual(sb.trainValidateQuizDef_({ ...Q2, passPct: 101 }).ok, false, 'passPct > 100 rejected');
  assert.strictEqual(sb.trainValidateQuizDef_({ ...Q2, questions: [] }).ok, false, 'no questions rejected');
  assert.strictEqual(sb.trainValidateQuizDef_({ ...Q2, questions: [{ q: 'A?', options: ['x'], correct: 0 }] }).ok, false, '1 option rejected');
  assert.strictEqual(sb.trainValidateQuizDef_({ ...Q2, questions: [{ q: 'A?', options: ['x', 'y'], correct: 5 }] }).ok, false, 'correct out of range rejected');
});
test('trainGradeQuiz_: grades right/wrong; missing answers count wrong; never returns correct indices', () => {
  const g = sb.trainGradeQuiz_(Q2.questions, [2, 1]);
  assert.strictEqual(g.scorePct, 50);
  // JSON-compare: sandbox arrays have a different realm prototype, which
  // deepStrictEqual rejects.
  assert.strictEqual(JSON.stringify(g.perQuestion), '[true,false]');
  const g2 = sb.trainGradeQuiz_(Q2.questions, [2]);   // second unanswered
  assert.strictEqual(JSON.stringify(g2.perQuestion), '[true,false]');
  assert.strictEqual(JSON.stringify(g).indexOf('correct'), -1, 'graded result carries no answer key');
});
test('trainStripQuizForRep_: whitelist-built — no correct key anywhere in the rep shape', () => {
  const stripped = sb.trainStripQuizForRep_('q1', sb.trainValidateQuizDef_(Q2).quiz);
  assert.strictEqual(JSON.stringify(stripped).indexOf('correct'), -1, 'answer key never leaves the server');
  assert.strictEqual(stripped.questions.length, 2);
  assert.strictEqual(JSON.stringify(stripped.questions[0].options), '["x","y","z"]');
});
test('trainParseFormId_: edit URL → id; bare id; /d/e/ published → error; junk → empty', () => {
  vm.runInContext(extractRawFunction('Code.js', 'trainParseFormId_'), sb, { filename: 'Code.js#trainParseFormId_' });
  const f = sb.trainParseFormId_;
  assert.strictEqual(f('https://docs.google.com/forms/d/1AbC_dEF-23/edit').id, '1AbC_dEF-23');
  assert.strictEqual(f('https://docs.google.com/forms/d/1AbC_dEF-23/viewform').id, '1AbC_dEF-23');
  assert.strictEqual(f('1AbCdefGhiJklmnopqrstuv').id, '1AbCdefGhiJklmnopqrstuv', 'bare drive-id-shaped string');
  assert.strictEqual(f('https://docs.google.com/forms/d/e/1FAIpQLSxxxxxxxxxxxx/viewform').error, 'published-link');
  assert.strictEqual(f('not a url').id, '');
  assert.strictEqual(f('').id, '');
});
test('getQuiz source tripwire: the rep response is built ONLY by trainStripQuizForRep_', () => {
  const src = extractRawFunction('Code.js', 'getQuiz');
  assert.ok(src.indexOf('return trainStripQuizForRep_(') >= 0, 'getQuiz returns the stripped shape');
  assert.strictEqual(src.indexOf('questionsJson'), -1, 'raw questions JSON never returned');
});

// T4 — quiz analytics aggregate (pure; manager-gated endpoint wraps it).
console.log('\ntraining — quiz analytics aggregate (T4)');
vm.runInContext(extractRawFunction('Code.js', 'trainQuizAnalytics_'), sb,
  { filename: 'Code.js#trainQuizAnalytics_' });
test('trainQuizAnalytics_: per-quiz counts, distinct reps, pass rate, averages; no answer keys', () => {
  const quizzes = { q1: { title: 'Safety', passPct: 80 }, q2: { title: 'Billing', passPct: 70 } };
  const attempts = [
    { quizId: 'q1', empId: 'A', scorePct: 100, passed: true },
    { quizId: 'q1', empId: 'A', scorePct: 60, passed: false },   // same rep, second try
    { quizId: 'q1', empId: 'B', scorePct: 50, passed: false },
    { quizId: 'qX', empId: 'C', scorePct: 90, passed: true },    // attempt for a deleted quiz — dropped
  ];
  const out = sb.trainQuizAnalytics_(quizzes, attempts);
  assert.strictEqual(out.length, 2, 'one row per existing quiz; deleted-quiz attempts dropped');
  const billing = out[0], safety = out[1];            // sorted by title: Billing, Safety
  assert.strictEqual(safety.title, 'Safety');
  assert.strictEqual(safety.attemptCount, 3);
  assert.strictEqual(safety.repsAttempted, 2, 'distinct reps');
  assert.strictEqual(safety.repsPassed, 1, 'A passed (once is enough), B did not');
  assert.strictEqual(safety.passRate, 50);
  assert.strictEqual(safety.avgScore, 70, '(100+60+50)/3 rounded');
  assert.strictEqual(safety.avgAttemptsPerRep, 1.5);
  assert.strictEqual(billing.attemptCount, 0, 'a quiz with no attempts still appears');
  assert.strictEqual(billing.passRate, null);
  assert.strictEqual(billing.avgScore, null);
  assert.strictEqual(JSON.stringify(out).indexOf('correct'), -1, 'aggregate carries no answer key');
});

// T4 #5/#6 — metrics anonymized team-avg + transfers data layer (pure helpers).
console.log('\nmetrics — percent parse + anonymized team-avg cohort guard (T4 #5/#6)');
['metricsParsePercent_', 'metricsTeamAvgSeries_', 'metricsBuildKpiSeries_'].forEach((fn) => {
  vm.runInContext(extractRawFunction('Code.js', fn), sb, { filename: 'Code.js#' + fn });
});
test('metricsParsePercent_: strips %, commas; null on empty/garbage', () => {
  assert.strictEqual(sb.metricsParsePercent_('29.79%'), 29.79);
  assert.strictEqual(sb.metricsParsePercent_('10.00%'), 10);
  assert.strictEqual(sb.metricsParsePercent_('5'), 5, 'bare number ok');
  assert.strictEqual(sb.metricsParsePercent_('1,234'), 1234, 'commas stripped');
  assert.strictEqual(sb.metricsParsePercent_(''), null);
  assert.strictEqual(sb.metricsParsePercent_(null), null);
  assert.strictEqual(sb.metricsParsePercent_('n/a'), null, 'garbage → null');
});
test('metricsTeamAvgSeries_: per-day mean, suppressed below the cohort minimum (N=3)', () => {
  const perRepDaily = {
    '2026-05-15': { a: { v: 80 }, b: { v: 90 }, c: { v: 100 } },   // cohort 3 → avg 90
    '2026-05-16': { a: { v: 60 }, b: { v: 80 } },                  // cohort 2 → suppressed
    '2026-05-17': { a: { v: 50 }, b: { v: null }, c: { v: 70 }, d: { v: 60 } },  // null skipped → cohort 3
  };
  const dates = ['2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18'];
  const out = sb.metricsTeamAvgSeries_(perRepDaily, dates, 'v', 3);
  assert.strictEqual(out[0].avg, 90); assert.strictEqual(out[0].cohort, 3);
  assert.strictEqual(out[1].avg, null, 'cohort 2 < 3 → suppressed (anonymity)'); assert.strictEqual(out[1].cohort, 2);
  assert.strictEqual(out[2].avg, 60, '(50+70+60)/3, null skipped'); assert.strictEqual(out[2].cohort, 3);
  assert.strictEqual(out[3].avg, null, 'no data → null'); assert.strictEqual(out[3].cohort, 0);
});
test('metricsBuildKpiSeries_: own value alongside the cohort-guarded team avg', () => {
  const perRepDaily = {
    '2026-05-15': { me: { v: 70 }, b: { v: 90 }, c: { v: 100 } },   // team cohort 3 → avg 86.7
    '2026-05-16': { me: { v: 55 }, b: { v: 65 } },                  // team cohort 2 → suppressed; own still shown
    '2026-05-17': { b: { v: 80 }, c: { v: 60 }, d: { v: 40 } },     // own absent
  };
  const dates = ['2026-05-15', '2026-05-16', '2026-05-17'];
  const out = sb.metricsBuildKpiSeries_(perRepDaily, dates, 'me', 'v', 3);
  assert.strictEqual(out[0].own, 70); assert.ok(Math.abs(out[0].team - 86.7) < 0.05); assert.strictEqual(out[0].cohort, 3);
  assert.strictEqual(out[1].own, 55, 'own shown even when team is suppressed'); assert.strictEqual(out[1].team, null);
  assert.strictEqual(out[2].own, null, 'own null when the rep had no data that day'); assert.strictEqual(out[2].team, 60);
});

// Operator feedback round (2026-06-12) — heuristic tag suggester (Call
// Notes) + search-term highlight tokenizer (KB drawer/Reference).
console.log('\noperator feedback — tag suggest + highlight tokenizer');
const cnSuggestTagsFromText_ = loadFunction(sb, 'cn/script_callnotes.html', 'cnSuggestTagsFromText_');
test('cnSuggestTagsFromText_: matches own-vocabulary tags whose words appear; skips current; caps 4', () => {
  const vocab = ['battery-swap', 'warranty', 'shipping-delay', 'oop', 'a-b'];
  const got = cnSuggestTagsFromText_('Customer asked about a battery swap under warranty', vocab, []);
  assert.strictEqual(JSON.stringify(got), '["battery-swap","warranty"]');
  assert.strictEqual(cnSuggestTagsFromText_('battery swap', vocab, ['battery-swap']).indexOf('battery-swap'), -1, 'already-added tag skipped');
  assert.strictEqual(cnSuggestTagsFromText_('a b', vocab, []).length, 0, 'sub-3-char tag words never match');
  assert.strictEqual(cnSuggestTagsFromText_('', vocab, []).length, 0);
});
const kbHlRegex_ = loadFunction(sb, 'kb/script_kb.html', 'kbHlRegex_');
test('kbHlRegex_: token regex matches case-insensitively; escapes regex chars; null on empty', () => {
  const re = kbHlRegex_('Battery c(1)');
  assert.ok(re.test('the BATTERY light'), 'case-insensitive token');
  re.lastIndex = 0;
  assert.ok(re.test('code c(1) here'), 'regex metachars escaped, matched literally');
  assert.strictEqual(kbHlRegex_('   '), null);
  assert.strictEqual(kbHlRegex_('a'), null, 'single 1-char token yields no regex');
});

// T3 — Employee Docs: issue-payload validator (pure, from Code.js), the
// status-chip renderer, and the signature-pad export-cap parity tripwire.
console.log('\nempdocs — validator / chip / pad export cap (T3)');
['EMPDOC_TYPES', 'EMPDOC_TITLE_MAX', 'EMPDOC_BODY_MAX',
 'EMPDOC_FIELD_TYPES', 'EMPDOC_FIELD_CAP', 'EMPDOC_FIELD_LABEL_MAX', 'EMPDOC_RESPONSE_MAX'].forEach((name) => {
  const m = codeSrc.match(new RegExp('const (' + name + '\\s*=\\s*[^;]+);'));
  assert.ok(m, name + ' declaration found in Code.js');
  vm.runInContext(m[1] + ';', sb, { filename: 'Code.js#' + name });
});
vm.runInContext(extractRawFunction('Code.js', 'empDocValidateFields_'), sb, { filename: 'Code.js#empDocValidateFields_' });
vm.runInContext(extractRawFunction('Code.js', 'empDocValidateResponses_'), sb, { filename: 'Code.js#empDocValidateResponses_' });
vm.runInContext(extractRawFunction('Code.js', 'empDocNeedsAction_'), sb, { filename: 'Code.js#empDocNeedsAction_' });
vm.runInContext(extractRawFunction('Code.js', 'empDocValidateIssue_'), sb,
  { filename: 'Code.js#empDocValidateIssue_' });
test('empDocValidateFields_: normalizes, slugs ids, dedupes, whitelists type, caps', () => {
  const r = sb.empDocValidateFields_([{ label: 'Your Goals' }, { label: 'Your Goals', type: 'textarea' }, { label: 'When', type: 'date', required: false }]);
  assert.ok(r.ok);
  assert.strictEqual(r.fields.length, 3);
  assert.strictEqual(r.fields[0].id, 'your-goals');
  assert.strictEqual(r.fields[1].id, 'your-goals-2', 'dedupes ids');
  assert.strictEqual(r.fields[0].required, true, 'required defaults on');
  assert.strictEqual(r.fields[2].required, false);
  assert.strictEqual(sb.empDocValidateFields_(null).ok, true, 'null → no fields');
  assert.strictEqual(sb.empDocValidateFields_([{ label: '' }]).ok, false, 'blank label rejected');
  assert.strictEqual(sb.empDocValidateFields_([{ label: 'x', type: 'email' }]).ok, false, 'bad type rejected');
});
test('empDocValidateResponses_: requires required fields, bounds, validates dates', () => {
  const fields = [{ id: 'a', label: 'A', type: 'text', required: true }, { id: 'b', label: 'B', type: 'date', required: false }];
  assert.strictEqual(sb.empDocValidateResponses_(fields, { a: 'hi' }).ok, true);
  assert.strictEqual(sb.empDocValidateResponses_(fields, { a: '' }).ok, false, 'missing required → fail');
  assert.strictEqual(sb.empDocValidateResponses_(fields, { a: 'hi', b: '07/01/2026' }).ok, false, 'bad date → fail');
  const big = sb.empDocValidateResponses_(fields, { a: 'x'.repeat(sb.EMPDOC_RESPONSE_MAX + 1) });
  assert.strictEqual(big.ok, false, 'oversize response → fail');
  // only known field ids are kept
  const kept = sb.empDocValidateResponses_(fields, { a: 'hi', zzz: 'ignored' });
  assert.ok(kept.ok && kept.responses.zzz === undefined);
});
test('empDocNeedsAction_: issued + (signature OR required field) needs action', () => {
  assert.strictEqual(sb.empDocNeedsAction_({ status: 'issued', requiresSignature: true, fields: [] }), true);
  assert.strictEqual(sb.empDocNeedsAction_({ status: 'issued', requiresSignature: false, fields: [{ required: true }] }), true);
  assert.strictEqual(sb.empDocNeedsAction_({ status: 'issued', requiresSignature: false, fields: [{ required: false }] }), false);
  assert.strictEqual(sb.empDocNeedsAction_({ status: 'draft', requiresSignature: true, fields: [] }), false, 'draft → no action');
  assert.strictEqual(sb.empDocNeedsAction_({ status: 'signed', requiresSignature: true, fields: [] }), false);
});
test('empDocValidateIssue_: release flag maps to draft/issued status', () => {
  assert.strictEqual(sb.empDocValidateIssue_({ empId: 'E1', docType: 'review', title: 'T', bodyMd: 'b' }).doc.status, 'issued', 'default issues');
  assert.strictEqual(sb.empDocValidateIssue_({ empId: 'E1', docType: 'review', title: 'T', bodyMd: 'b', release: false }).doc.status, 'draft');
});
test('empDocValidateIssue_: accepts a good payload; whitelists type; bounds title/body/date', () => {
  const ok = sb.empDocValidateIssue_({ empId: 'E1', docType: 'review', title: 'T', bodyMd: 'body', dueAt: '2026-07-01' });
  assert.ok(ok.ok);
  assert.strictEqual(ok.doc.requiresSignature, true, 'signature defaults on');
  assert.strictEqual(sb.empDocValidateIssue_({ empId: 'E1', docType: 'memo', title: 'T', bodyMd: 'b' }).ok, false, 'unknown docType rejected');
  assert.strictEqual(sb.empDocValidateIssue_({ empId: 'E1', docType: 'pip', title: '', bodyMd: 'b' }).ok, false, 'empty title rejected');
  assert.strictEqual(sb.empDocValidateIssue_({ empId: 'E1', docType: 'pip', title: 'T', bodyMd: '' }).ok, false, 'empty body rejected');
  assert.strictEqual(sb.empDocValidateIssue_({ empId: 'E1', docType: 'pip', title: 'T', bodyMd: 'b', dueAt: '07/01/2026' }).ok, false, 'bad date shape rejected');
  assert.strictEqual(sb.empDocValidateIssue_({ empId: '', docType: 'pip', title: 'T', bodyMd: 'b' }).ok, false, 'missing empId rejected');
});
const edChipHtml_ = loadFunction(sb, 'train/script_empdocs.html', 'edChipHtml_');
test('edChipHtml_: signed/void/needs-signature/for-review chips', () => {
  assert.ok(edChipHtml_({ status: 'signed' }).indexOf('Signed') >= 0);
  assert.ok(edChipHtml_({ status: 'void' }).indexOf('Void') >= 0);
  assert.ok(edChipHtml_({ status: 'issued', requiresSignature: true }).indexOf('Needs signature') >= 0);
  assert.ok(edChipHtml_({ status: 'issued', requiresSignature: true, overdue: true }).indexOf('Overdue') >= 0);
  assert.ok(edChipHtml_({ status: 'issued', requiresSignature: false }).indexOf('For review') >= 0);
});
test('popOutCurrentView opens SERVER_WEB_APP_URL, never the iframe location (INV-78 class)', () => {
  // The iframe's own window.location is a session-bound googleusercontent
  // URL that renders BLANK as a top-level window — the pop-out shipped
  // broken on exactly this until the operator caught it. Pin: the function
  // must consult the doGet-injected real /exec URL, and index.html must
  // inject it via the unescaped scriptlet.
  const core = fs.readFileSync(path.join(__dirname, '../../web-app/script_core.html'), 'utf8');
  const fn = core.match(/function popOutCurrentView\(\) \{[\s\S]*?\n\}/);
  assert.ok(fn, 'popOutCurrentView found');
  assert.ok(fn[0].indexOf('SERVER_WEB_APP_URL') >= 0, 'pop-out uses the injected deploy URL');
  const idx = fs.readFileSync(path.join(__dirname, '../../web-app/index.html'), 'utf8');
  assert.ok(idx.indexOf('window.SERVER_WEB_APP_URL = <?!=') >= 0, 'index.html injects SERVER_WEB_APP_URL unescaped (INV-78)');
});
// #4 — pop-out geometry persistence: the pure parse/range-guard helper.
const popoutParseGeom_ = loadFunction(sb, 'script_core.html', 'popoutParseGeom_');
test('popoutParseGeom_: parses valid geometry, range-guards, drops bad position', () => {
  // JSON-compare: sandbox objects have a different realm prototype (deepStrictEqual rejects).
  assert.strictEqual(JSON.stringify(popoutParseGeom_('{"w":520,"h":820,"x":100,"y":40}')), '{"w":520,"h":820,"x":100,"y":40}');
  assert.strictEqual(JSON.stringify(popoutParseGeom_('{"w":480,"h":800}')), '{"w":480,"h":800}', 'position optional');
  assert.strictEqual(popoutParseGeom_(null), null, 'missing → null');
  assert.strictEqual(popoutParseGeom_('not json'), null, 'corrupt → null');
  assert.strictEqual(popoutParseGeom_('{"w":100,"h":800}'), null, 'too-narrow width rejected');
  assert.strictEqual(popoutParseGeom_('{"w":9999,"h":800}'), null, 'absurd width rejected');
  // valid size but negative position → keep size, drop position (fail-safe)
  assert.strictEqual(JSON.stringify(popoutParseGeom_('{"w":480,"h":800,"x":-5,"y":10}')), '{"w":480,"h":800}');
});
test('signature-pad export cap parity: both pads cap the export at 600px (INV-96)', () => {
  // The empdocs pad is adapted (parameterized) from form_public's — the
  // load-bearing shared rule is the <=600px export downscale that keeps the
  // base64 under the per-cell cap. Pin it in BOTH files.
  ['form_public.html', 'train/script_empdocs.html'].forEach((f) => {
    const src = fs.readFileSync(path.join(__dirname, '../../web-app/' + f), 'utf8');
    assert.ok(/MAX_W = 600/.test(src), f + ' caps the signature export at 600px');
  });
});

// Onboarding tour — every step's `view` must be a registered TOOLS tab key
// (a tab-key rename would otherwise silently orphan a step). The selector is
// resolved at runtime against the live DOM; the view key is the static
// coupling we can pin here, mirroring the M3 view-key tripwire.
console.log('\nscript_tour — every step view is a registered TOOLS tab key');
test('TOUR_STEPS view keys all resolve in the TOOLS registry', () => {
  const coreSrc = fs.readFileSync(path.join(__dirname, '../../web-app/script_core.html'), 'utf8');
  const toolsBlock = coreSrc.match(/const TOOLS = \{[\s\S]*?\n\};/);
  assert.ok(toolsBlock, 'TOOLS registry block found');
  // [^{}]* (not [^}]*) so the match can't cross into a nested object — it
  // captures the leaf TAB keys (clock, timeoff, …), not the tool wrappers.
  const validKeys = [...toolsBlock[0].matchAll(/(\w+):\s*\{[^{}]*enter:\s*'/g)].map((m) => m[1]);
  const tourSrc = fs.readFileSync(path.join(__dirname, '../../web-app/script_tour.html'), 'utf8');
  const block = tourSrc.match(/const TOUR_STEPS = \[[\s\S]*?\n\];/);
  assert.ok(block, 'TOUR_STEPS block found');
  const views = [...block[0].matchAll(/view:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(views.length >= 10, 'parsed the step view keys (got ' + views.length + ')');
  views.forEach((v) => {
    assert.ok(validKeys.indexOf(v) >= 0, "TOUR step view '" + v + "' is not a TOOLS tab key");
  });
});

// Tag-trend bucketing (#5) — the pure week-bucketing math behind the manager
// Admin "Tag Trends" panel. Factored out of getCallNotesTagTrends so the
// boundary + bucketing + sort logic is pinnable without a spreadsheet.
console.log('\nCode.js — tag-trend bucketing (#5: cnTrendWeekStarts_ / cnTagTrendsFromEvents_)');
['cnIsoToDayNum_', 'cnDayNumToIso_', 'cnTrendWeekStarts_', 'cnTagTrendsFromEvents_'].forEach((fn) =>
  vm.runInContext(extractRawFunction('Code.js', fn), sb, { filename: 'Code.js#' + fn }));
const cnTrendWeekStarts_ = sb.cnTrendWeekStarts_;
const cnTagTrendsFromEvents_ = sb.cnTagTrendsFromEvents_;

test('cnTrendWeekStarts_ returns N Monday-anchored, 7-apart, ascending starts', () => {
  // 2026-06-17 is a Wednesday → its week's Monday is 2026-06-15.
  const ws = cnTrendWeekStarts_('2026-06-17', 4);
  assert.strictEqual(ws.length, 4);
  for (let i = 1; i < ws.length; i++) assert.strictEqual(ws[i] - ws[i - 1], 7, 'weeks are 7 days apart');
  assert.strictEqual(sb.cnDayNumToIso_(ws[ws.length - 1]), '2026-06-15', 'last start = Monday of ref week');
});

test('cnTagTrendsFromEvents_ buckets by week, sorts by total, computes delta, drops out-of-window', () => {
  const ref = '2026-06-17';                  // week Monday = 2026-06-15 (idx 3 of 4)
  const events = [
    { tag: 'shipping', date: '2026-06-16' }, // this week
    { tag: 'shipping', date: '2026-06-15' }, // this week
    { tag: 'shipping', date: '2026-06-09' }, // prior week
    { tag: 'billing',  date: '2026-06-16' }, // this week
    { tag: 'old',      date: '2026-01-01' }, // outside the 4-week window → dropped
    { tag: '',         date: '2026-06-16' }, // blank tag → ignored
  ];
  const out = cnTagTrendsFromEvents_(events, ref, 4, 12);
  assert.strictEqual(out.weekStarts.length, 4);
  assert.strictEqual(out.series.length, 2, 'only in-window, non-blank tags');
  assert.strictEqual(out.series[0].tag, 'shipping', 'highest total sorts first');
  assert.strictEqual(out.series[0].total, 3);
  assert.strictEqual(out.series[0].counts[3], 2, 'this-week bucket');
  assert.strictEqual(out.series[0].counts[2], 1, 'prior-week bucket');
  assert.strictEqual(out.series[0].delta, 1, 'delta = this wk − prior wk');
  assert.ok(!out.series.some((s) => s.tag === 'old' || s.tag === ''), 'out-of-window / blank excluded');
});

test('cnTagTrendsFromEvents_ honors topK and tolerates empty input', () => {
  assert.deepStrictEqual(cnTagTrendsFromEvents_([], '2026-06-17', 4, 12).series, []);
  const many = [];
  for (let i = 0; i < 20; i++) many.push({ tag: 'tag' + ('0' + i).slice(-2), date: '2026-06-16' });
  assert.strictEqual(cnTagTrendsFromEvents_(many, '2026-06-17', 4, 5).series.length, 5, 'topK caps the series');
});

// Coverage planner bucketing (#3) — the pure hour-concurrency math behind the
// manager Coverage view (the tz conversion + PTO overlay stay in the endpoint).
console.log('\nCode.js — coverage bucketing (#3: coverageBucketHours_)');
vm.runInContext(extractRawFunction('Code.js', 'coverageBucketHours_'), sb, { filename: 'Code.js#coverageBucketHours_' });
const coverageBucketHours_ = sb.coverageBucketHours_;

test('counts distinct reps per manager-tz hour slot', () => {
  // Day 0: rep A 08:00–17:00 (min 480–1020), rep B 09:00–12:00 (540–720).
  const out = coverageBucketHours_([
    { rep: 'A', absStart: 480, absEnd: 1020, tentative: false },
    { rep: 'B', absStart: 540, absEnd: 720, tentative: false },
  ], 1);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0][7].confirmed, 0, '07:00 — nobody yet');
  assert.strictEqual(out[0][8].confirmed, 1, '08:00 — A only');
  assert.strictEqual(out[0][9].confirmed, 2, '09:00 — A + B');
  assert.strictEqual(out[0][16].confirmed, 1, '16:00 — A only (B ended)');
  assert.strictEqual(out[0][17].confirmed, 0, '17:00 — done');
});

test('a confirmed rep is not double-counted as tentative in the same slot; clips out-of-range', () => {
  const out = coverageBucketHours_([
    { rep: 'A', absStart: 540, absEnd: 600, tentative: false },  // 09:00 confirmed
    { rep: 'A', absStart: 540, absEnd: 600, tentative: true },   // same rep tentative — must not add
    { rep: 'C', absStart: 540, absEnd: 600, tentative: true },   // distinct tentative rep
    { rep: 'D', absStart: -120, absEnd: 60, tentative: false },  // straddles before day 0 → counts hour 0 only
    { rep: 'E', absStart: 1440 * 2, absEnd: 1440 * 2 + 60, tentative: false }, // beyond numDays → clipped
  ], 1);
  assert.strictEqual(out[0][9].confirmed, 1, 'A confirmed at 09:00');
  assert.strictEqual(out[0][9].tentative, 1, 'only C is tentative (A already confirmed)');
  assert.strictEqual(out[0][0].confirmed, 1, 'D spillover covers hour 0');
});

// ─────────────────────────────────────────────────────────────────────────────
// Spanish Inbox → tools cross-navigation (metrics suggestion map + shared hint).
// `sb` already has script_core (appTakeNavHint_/appNavHintBannerHtml_) + metrics
// (SPANISH_TOOL_SUGGESTIONS/spanishSuggestHtml_) + esc/icon loaded.
//   • spanishSuggestHtml_  → keyword→destination routing (EN + ES), CN-collapse,
//                            3-chip cap, data-* contract, no-match empties.
//   • appTakeNavHint_      → one-shot read+null + tool/source gating.
//   • appNavHintBannerHtml_→ esc() of email-derived text (the XSS/PHI boundary —
//                            the banner is injected via innerHTML).
// ─────────────────────────────────────────────────────────────────────────────
console.log('\ncross-nav — Spanish Inbox suggestion routing + shared nav hint');

const spanishSuggestHtml_ = sb.spanishSuggestHtml_;
const appTakeNavHint_ = sb.appTakeNavHint_;
const appNavHintBannerHtml_ = sb.appNavHintBannerHtml_;

test('spanishSuggestHtml_: empty / whitespace / no-keyword text → no chips', () => {
  assert.strictEqual(spanishSuggestHtml_(''), '');
  assert.strictEqual(spanishSuggestHtml_('   '), '');
  assert.strictEqual(spanishSuggestHtml_(null), '');
  assert.strictEqual(spanishSuggestHtml_('hello, can you call me back please'), '',
    'generic text matches no destination');
});

test('spanishSuggestHtml_: shipping keywords (EN + ES) → Verified Shipping CN chip', () => {
  ['where is my shipping', 'tracking number?', '¿dónde está mi envío?', 'rastreo del paquete', 'estado de la entrega']
    .forEach((t) => {
      const html = spanishSuggestHtml_(t);
      assert.ok(/data-tool="callNotes"/.test(html), `${t}: routes to callNotes`);
      assert.ok(/data-template="Verified Shipping"/.test(html), `${t}: carries the Verified Shipping template`);
      assert.ok(/data-tab="callNotes"/.test(html), `${t}: lands on the Log tab`);
    });
});

test('spanishSuggestHtml_: resupply keywords → Repeat Resupply template', () => {
  ['need a resupply', 'resurtido de máscara', 'monthly refill', 'reorder supplies'].forEach((t) => {
    assert.ok(/data-template="Repeat Resupply"/.test(spanishSuggestHtml_(t)), `${t}: Repeat Resupply`);
  });
});

test('spanishSuggestHtml_: order keywords → Close Order template', () => {
  ['order status', 'estado del pedido', 'cancel my order', 'cancelar la orden'].forEach((t) => {
    assert.ok(/data-template="Close Order"/.test(spanishSuggestHtml_(t)), `${t}: Close Order`);
  });
});

test('spanishSuggestHtml_: mobility keywords → PPD intake (distinct intake destination)', () => {
  ['need a wheelchair', 'silla de ruedas', 'problemas de movilidad', 'a power chair'].forEach((t) => {
    const html = spanishSuggestHtml_(t);
    assert.ok(/data-tool="intake"/.test(html), `${t}: intake tool`);
    assert.ok(/data-tab="intakePpd"/.test(html), `${t}: PPD tab`);
    assert.ok(/data-template=""/.test(html), `${t}: intake chips carry no CN template`);
  });
});

test('spanishSuggestHtml_: CPAP keywords → PAP intake; PMD keywords → PMD account', () => {
  ['cpap mask', 'sleep apnea', 'mascarilla resmed airsense'].forEach((t) => {
    assert.ok(/data-tab="intakePapAccount"/.test(spanishSuggestHtml_(t)), `${t}: PAP`);
  });
  ['need a pmd', 'power mobility device'].forEach((t) => {
    assert.ok(/data-tab="intakePmdAccount"/.test(spanishSuggestHtml_(t)), `${t}: PMD`);
  });
});

test('spanishSuggestHtml_: multiple CN matches collapse to ONE chip (same Log destination)', () => {
  // "shipping" + "resupply" + "order" all route to Call Notes Log — only one chip.
  const html = spanishSuggestHtml_('shipping for my resupply order');
  const cnChips = (html.match(/data-tool="callNotes"/g) || []).length;
  assert.strictEqual(cnChips, 1, 'CN matches dedupe to a single chip');
  // The first matching rule (Verified Shipping) wins the single slot.
  assert.ok(/data-template="Verified Shipping"/.test(html), 'first CN rule order wins');
});

test('spanishSuggestHtml_: caps at 3 chips even when more rules match', () => {
  // wheelchair (PPD) + cpap (PAP) + pmd (PMD) + shipping (CN) = 4 distinct → 3.
  const html = spanishSuggestHtml_('wheelchair cpap pmd shipping');
  const chips = (html.match(/class="sp-suggest"/g) || []).length;
  assert.strictEqual(chips, 3, 'hard cap of 3 chips');
});

test('spanishSuggestHtml_: distinct intake destinations are NOT collapsed', () => {
  const html = spanishSuggestHtml_('wheelchair and cpap'); // PPD + PAP — two intake chips
  assert.ok(/data-tab="intakePpd"/.test(html) && /data-tab="intakePapAccount"/.test(html),
    'PPD and PAP both surface (different tabs)');
});

test('appTakeNavHint_: returns null when no hint pending', () => {
  sb.APP_NAV_HINT = null;
  assert.strictEqual(appTakeNavHint_('callNotes'), null);
});

test('appTakeNavHint_: gated by source AND tool; non-match leaves hint intact', () => {
  sb.APP_NAV_HINT = { source: 'spanishInbox', tool: 'callNotes', subject: 'x' };
  assert.strictEqual(appTakeNavHint_('intake'), null, 'wrong tool → null');
  assert.ok(sb.APP_NAV_HINT, 'a non-matching take does NOT consume the hint');
  sb.APP_NAV_HINT = { source: 'coverageStrip', tool: 'callNotes' };
  assert.strictEqual(appTakeNavHint_('callNotes'), null, 'wrong source → null');
});

test('appTakeNavHint_: one-shot — matching take returns the hint then nulls it', () => {
  const hint = { source: 'spanishInbox', tool: 'callNotes', template: 'Verified Shipping', subject: 's' };
  sb.APP_NAV_HINT = hint;
  const got = appTakeNavHint_('callNotes');
  assert.strictEqual(got, hint, 'first take returns the hint');
  assert.strictEqual(sb.APP_NAV_HINT, null, 'hint is consumed (nulled)');
  assert.strictEqual(appTakeNavHint_('callNotes'), null, 'second take returns null — no stale re-fire');
});

test('appNavHintBannerHtml_: escapes email-derived requester/subject/snippet/permalink', () => {
  const html = appNavHintBannerHtml_({
    requester: '<img src=x onerror=alert(1)>',
    subject: '<script>steal()</script>',
    snippet: 'a & b < c',
    permalink: 'https://mail.google.com/"><img onerror=alert(2)>',
  });
  assert.ok(!/<img src=x onerror/.test(html), 'requester markup is escaped');
  assert.ok(!/<script>steal/.test(html), 'subject markup is escaped');
  assert.ok(/&lt;script&gt;/.test(html), 'subject angle-brackets entity-encoded');
  assert.ok(/a &amp; b &lt; c/.test(html), 'snippet ampersand + bracket escaped');
  assert.ok(!/"><img onerror/.test(html), 'permalink attribute breakout escaped');
});

test('appNavHintBannerHtml_: empty hint → empty string', () => {
  assert.strictEqual(appNavHintBannerHtml_(null), '');
});

// ─────────────────────────────────────────────────────────────────────────────
// Intake PPD section structure — the per-section side-rail stepper. intakePpdSections_
// is the SINGLE source the renderer (section ids), the stepper (steps/goto), and
// the progress updater (per-section + overall counts) all consume; pin that the
// three stay in lockstep and that the overall main-question count (the ring
// denominator) is unchanged by the refactor.
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nintake — PPD per-section stepper (intakePpdSections_ single source)');
const sbIntake = buildSandbox(['script_icons.html', 'script_core.html', 'intake/script_intake.html']);

['EN', 'ES'].forEach((lang) => {
  test('intakePpdSections_(' + lang + '): well-formed sections; mainQNums are bare numbers, unique', () => {
    const secs = sbIntake.intakePpdSections_(lang);
    assert.ok(Array.isArray(secs) && secs.length > 0, 'has sections');
    secs.forEach((s, i) => {
      assert.ok(s.title || s.rows.length, 'section ' + i + ' has a title or rows');
      s.mainQNums.forEach((q) => assert.ok(/^\d+$/.test(q), 'mainQNum "' + q + '" is a bare number (no 31a/33a)'));
    });
    const flat = secs.reduce((a, s) => a.concat(s.mainQNums), []);
    assert.strictEqual(new Set(flat).size, flat.length, 'no duplicate main question across sections');
  });

  test('intakePpdSections_(' + lang + '): total mainQNums == the ring denominator (progress count unchanged)', () => {
    const secs = sbIntake.intakePpdSections_(lang);
    const total = secs.reduce((a, s) => a + s.mainQNums.length, 0);
    // Independent recount of the prior progress filter directly off INTAKE_PPD_Q.
    const qs = sbIntake.INTAKE_PPD_Q[lang] || sbIntake.INTAKE_PPD_Q.EN;
    let expected = 0;
    for (let i = 1; i < qs.length; i++) {
      const raw = qs[i];
      if (!raw || !String(raw).trim()) continue;
      if (/^(\d+)\./.test(String(raw).trim())) expected++;
    }
    assert.strictEqual(total, expected, 'stepper main-count matches the legacy /^(\\d+)\\./ progress count');
  });

  test('intakePpdSections_(' + lang + '): renderer, stepper, and section list agree on count + indices', () => {
    const secs = sbIntake.intakePpdSections_(lang);
    const render = sbIntake.intakeRenderPpdSections_(lang);
    const stepper = sbIntake.intakePpdStepperHtml_(lang);
    const renderIds = (render.match(/id="intk-ppd-sec-(\d+)"/g) || []);
    const steps = (stepper.match(/class="intk-step"/g) || []);
    assert.strictEqual(renderIds.length, secs.length, 'one rendered panel id per section');
    assert.strictEqual(steps.length, secs.length, 'one stepper step per section');
    // Section ids + stepper data-sec/onclick run 0..n-1 in order.
    for (let s = 0; s < secs.length; s++) {
      assert.ok(render.indexOf('id="intk-ppd-sec-' + s + '"') >= 0, 'panel id ' + s + ' present');
      assert.ok(stepper.indexOf('data-sec="' + s + '"') >= 0, 'step data-sec ' + s + ' present');
      assert.ok(stepper.indexOf('intakePpdGotoSection_(' + s + ')') >= 0, 'step ' + s + ' wired to goto');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// View instant-paint (stale-while-revalidate) — viewCacheFresh_ is the pure TTL
// decision behind the Metrics/Call-Notes instant repaint. (script_core, on sb.)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\ncross-nav — view instant-paint TTL (viewCacheFresh_)');
const viewCacheFresh_ = sb.viewCacheFresh_;

test('viewCacheFresh_: null / malformed entry → not fresh (fail-safe to fetch)', () => {
  assert.strictEqual(viewCacheFresh_(null, 45000, 1000), false);
  assert.strictEqual(viewCacheFresh_(undefined, 45000, 1000), false);
  assert.strictEqual(viewCacheFresh_({}, 45000, 1000), false, 'no .at → not fresh');
  assert.strictEqual(viewCacheFresh_({ at: 'x' }, 45000, 1000), false, 'non-number .at → not fresh');
});

test('viewCacheFresh_: within TTL → fresh; past TTL → stale', () => {
  assert.strictEqual(viewCacheFresh_({ at: 1000 }, 45000, 1000), true, 'age 0 is fresh');
  assert.strictEqual(viewCacheFresh_({ at: 1000 }, 45000, 1000 + 45000), true, 'exactly at TTL is fresh');
  assert.strictEqual(viewCacheFresh_({ at: 1000 }, 45000, 1000 + 45001), false, 'past TTL is stale');
  assert.strictEqual(viewCacheFresh_({ at: 1000 }, 45000, 1000 + 20000), true, 'mid-window is fresh');
});

test('viewCacheFresh_: a future stamp (clock skew) → not fresh', () => {
  assert.strictEqual(viewCacheFresh_({ at: 5000 }, 45000, 1000), false, 'negative age → not fresh');
});

test('viewCacheFresh_: defaults ttl to VIEW_CACHE_TTL_MS when omitted', () => {
  assert.strictEqual(typeof sb.VIEW_CACHE_TTL_MS, 'number', 'default TTL constant present');
  const now = 1000000;
  assert.strictEqual(viewCacheFresh_({ at: now }, undefined, now), true);
  assert.strictEqual(viewCacheFresh_({ at: now - sb.VIEW_CACHE_TTL_MS - 1 }, undefined, now), false);
});

console.log('\nCode.js — buildPatientTimeline_() (#3 patient/TRX timeline merge)');
// Pure server helper: stitches notes + intake submissions + sent forms for one
// TRX into a newest-first timeline. Substring TRX match; forms linked by noteId.
vm.runInContext(extractRawFunction('Code.js', 'buildPatientTimeline_'), sb,
  { filename: 'Code.js#buildPatientTimeline_' });
const buildPatientTimeline_ = sb.buildPatientTimeline_;
test('merges + sorts newest-first; matches TRX as a substring; links forms by noteId', () => {
  const notes = [
    { noteId: 'n1', timestamp: '2026-06-01T09:00:00', caller: 'A', patientAndTrx: 'Jane Doe TRX12345', issue: 'i1' },
    { noteId: 'n2', timestamp: '2026-06-03T11:00:00', caller: 'B', patientAndTrx: 'Other TRX99999', issue: 'i2' },
  ];
  const subs = [
    { formType: 'PPD', submissionId: 's1', timestamp: '2026-06-02 10:00:00', patientInfo: 'Jane Doe TRX12345', repId: 'r1' },
  ];
  const forms = [
    { token: 't1', formName: 'EAA', status: 'submitted', createdAt: '2026-06-04T08:00:00', noteId: 'n1' },
    { token: 't2', formName: 'EAA', status: 'pending', createdAt: '2026-06-05T08:00:00', noteId: 'nX' }, // unlinked
  ];
  const ev = buildPatientTimeline_(notes, subs, forms, 'trx12345');
  // n2 excluded (different TRX); t2 excluded (noteId not matched)
  assert.strictEqual(ev.length, 3, 'note n1 + intake s1 + form t1');
  assert.strictEqual(ev[0].kind, 'form', 'newest first = the 06-04 form');
  assert.strictEqual(ev[ev.length - 1].kind, 'note', 'oldest = the 06-01 note');
  assert.ok(ev.every((e) => e.noteId !== 'n2' && e.token !== 't2'), 'non-matches excluded');
});
test('empty / missing inputs never throw; blank trx returns all notes', () => {
  // (cross-realm: the helper runs in the vm sandbox, so assert on .length, not deepStrictEqual)
  assert.strictEqual(buildPatientTimeline_(null, null, null, 'x').length, 0);
  const all = buildPatientTimeline_([{ noteId: 'n', timestamp: '2026-01-01T00:00:00', patientAndTrx: 'anything' }], [], [], '');
  assert.strictEqual(all.length, 1, 'blank trx → no filter');
});

console.log('\nCode.js — deployReadinessItems_() (#1 pre-deploy checklist)');
vm.runInContext(extractRawFunction('Code.js', 'deployReadinessItems_'), sb,
  { filename: 'Code.js#deployReadinessItems_' });
const deployReadinessItems_ = sb.deployReadinessItems_;
test('required store unset → fail; optional unset → warn; tz mismatch → warn; manager-count 0 → fail', () => {
  const storage = {
    configTimezone: 'Asia/Kolkata',
    stores: [
      { label: 'ADP', prop: 'ADP_SS_ID', configured: false },                          // required → fail
      { label: 'KB', prop: 'KB_SS_ID', configured: true, reachable: true, tzMatch: true }, // ok
      { label: 'CDR', prop: 'CDR_SS_ID', configured: false },                          // optional → warn
      { label: 'Intake', prop: 'INTAKE_SS_ID', configured: true, reachable: true, tzMatch: false, tz: 'America/Los_Angeles' }, // tz → warn
      { label: 'HR', prop: 'HR_DOCS_SS_ID', configured: true, reachable: false },      // unreachable → fail
    ],
  };
  const automation = { digests: [{ key: 'eod', last: '2026-06-23 07:00:00', stale: false }], cdr: { ok: true } };
  const out = deployReadinessItems_(storage, automation, 0);
  const byKey = {};
  out.items.forEach((it) => { byKey[it.key] = it.status; });
  assert.strictEqual(byKey['managers'], 'fail', 'no manager emails → fail');
  assert.strictEqual(byKey['store_ADP_SS_ID'], 'fail', 'required ADP unset → fail');
  assert.strictEqual(byKey['store_KB_SS_ID'], 'ok');
  assert.strictEqual(byKey['store_CDR_SS_ID'], 'warn', 'optional CDR unset → warn');
  assert.strictEqual(byKey['store_INTAKE_SS_ID'], 'warn', 'tz mismatch → warn');
  assert.strictEqual(byKey['store_HR_DOCS_SS_ID'], 'fail', 'configured-but-unreachable → fail');
  assert.strictEqual(byKey['triggers'], 'ok', 'fresh heartbeat → ok');
  assert.strictEqual(byKey['cdr'], 'ok');
  assert.ok(out.summary.fail >= 3 && out.summary.warn >= 2, 'summary tallies statuses');
});
test('no heartbeats → triggers warn; cdr down → warn; clean → all ok', () => {
  const clean = deployReadinessItems_(
    { configTimezone: 'X', stores: [{ label: 'ADP', prop: 'ADP_SS_ID', configured: true, reachable: true, tzMatch: true }] },
    { digests: [{ key: 'eod', last: null, stale: false }], cdr: { ok: false } }, 2);
  const byKey = {};
  clean.items.forEach((it) => { byKey[it.key] = it.status; });
  assert.strictEqual(byKey['managers'], 'ok');
  assert.strictEqual(byKey['triggers'], 'warn', 'no heartbeat yet → warn');
  assert.strictEqual(byKey['cdr'], 'warn', 'cdr down → warn');
});

console.log('\nCode.js — retentionWarnings_() (Admin Retention panel safety ordering)');
vm.runInContext(extractRawFunction('Code.js', 'retentionWarnings_'), sb,
  { filename: 'Code.js#retentionWarnings_' });
const retentionWarnings_ = sb.retentionWarnings_;
test('clean configs warn-free; unsafe orderings each warn', () => {
  // archive-only (recommended) — no warnings
  assert.strictEqual(retentionWarnings_(90, 0, 0).length, 0);
  // all disabled — no warnings
  assert.strictEqual(retentionWarnings_(0, 0, 0).length, 0);
  // safe 3-tier: archive 90 ≤ purge 365, cold 730 ≥ archive 90 — no warnings
  assert.strictEqual(retentionWarnings_(90, 365, 730).length, 0);
  // purge ON but archive OFF → warn
  assert.strictEqual(retentionWarnings_(0, 90, 0).length, 1);
  // archive window > purge window → warn (loss before archive)
  assert.ok(retentionWarnings_(365, 90, 0).some((w) => w.indexOf('LARGER') >= 0));
  // cold purge shorter than archive window → warn
  assert.ok(retentionWarnings_(90, 0, 30).some((w) => w.indexOf('Cold-store') >= 0));
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);