#!/usr/bin/env node
/* Undeclared-identifier net for the Apps Script server.
 *
 * WHY THIS EXISTS (g118): every Node pin in test/client/ reads the server as
 * TEXT and asserts on its SHAPE. A shape assertion cannot see a ReferenceError.
 * `creditMonthlyPtoAccruals` shipped reading a `perDay` that no scope declared
 * — the accrual credit threw on every run for a day, and four structural pins
 * over that exact function stayed green, because the identifier LOOKED right.
 * Only executing it, or resolving its scopes, can catch that. This resolves.
 *
 * THE MODEL: Apps Script loads every .js/.gs file in the project into ONE
 * global scope, so a name declared in 00_config.js is in scope in 90_qa.js.
 * We reproduce that by linting the concatenation of every web-app/*.js file —
 * the fourteen `filePushOrder` names PLUS DevTools.js and Tests.js, which
 * clasp pushes too (filePushOrder sets ORDER, not membership). That makes the
 * cross-file globals DERIVED rather than hand-listed: adding a helper to
 * Tests.js needs no edit here.
 *
 * The ONLY hand-maintained list is APPS_SCRIPT_GLOBALS — the platform's own
 * services, which live in no file we can read.
 *
 * Exit 1 and name file:line on any undeclared identifier.
 */
import { Linter } from 'eslint';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB_APP = path.join(ROOT, 'web-app');

/** Apps Script BUILT-IN globals — the ones the V8 runtime provides to every
 *  project with no manifest entry. Not derivable: they come from the runtime,
 *  not from a file in this repo. Add a name here only after checking it
 *  against the Apps Script reference; a wrong entry silences a real bug.
 *
 *  ADVANCED services are deliberately NOT in this list — see below. */
const APPS_SCRIPT_BUILTINS = [
  'SpreadsheetApp', 'DriveApp', 'GmailApp', 'MailApp', 'CalendarApp',
  'DocumentApp', 'FormApp', 'SlidesApp', 'ContactsApp', 'GroupsApp',
  'HtmlService', 'ContentService', 'CacheService', 'PropertiesService',
  'LockService', 'ScriptApp', 'UrlFetchApp', 'Utilities', 'Session',
  'Logger', 'console', 'Browser',
  'XmlService', 'Charts', 'Maps', 'LanguageApp',
  'JSON', 'Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean',
  'RegExp', 'Error', 'TypeError', 'RangeError', 'Map', 'Set', 'WeakMap',
  'WeakSet', 'Promise', 'Symbol', 'Infinity', 'NaN', 'undefined',
  'isNaN', 'isFinite', 'parseInt', 'parseFloat', 'encodeURIComponent',
  'decodeURIComponent', 'encodeURI', 'decodeURI', 'globalThis',
];

/** An ADVANCED service is a global ONLY while appsscript.json enables it, and
 *  only under the `userSymbol` the manifest names. Six of them — Drive, Docs,
 *  Sheets, Gmail, BigQuery, People — were hardcoded above while the manifest
 *  read `"dependencies": {}`, so a use of any one would have thrown
 *  ReferenceError on the first call in production and been GREEN here (F-50,
 *  cycle 20). This is the g118 shape one level down: the static net that exists
 *  to catch an undefined name was itself pre-declaring names the runtime does
 *  not define. Derive them from the manifest instead, so enabling a service is
 *  what makes it lintable and disabling one puts its uses back under the net. */
function advancedServiceGlobals() {
  const manifest = JSON.parse(fs.readFileSync(path.join(WEB_APP, 'appsscript.json'), 'utf8'));
  const svcs = (manifest.dependencies && manifest.dependencies.enabledAdvancedServices) || [];
  return svcs.map((s) => s && s.userSymbol).filter(Boolean);
}

const APPS_SCRIPT_GLOBALS = APPS_SCRIPT_BUILTINS.concat(advancedServiceGlobals());

/** Server files in the order Apps Script would see them: filePushOrder first,
 *  then everything else clasp pushes, sorted. Membership is the DIRECTORY, not
 *  filePushOrder — a new .js file is covered the moment it lands. */
function serverFiles() {
  const clasp = JSON.parse(fs.readFileSync(path.join(WEB_APP, '.clasp.json'), 'utf8'));
  const ordered = (clasp.filePushOrder || []).filter((f) => f.endsWith('.js'));
  const all = fs.readdirSync(WEB_APP).filter((f) => f.endsWith('.js')).sort();
  const rest = all.filter((f) => !ordered.includes(f));
  const gone = ordered.filter((f) => !all.includes(f));
  if (gone.length) {
    console.error('lint-server: filePushOrder names ' + gone.join(', ') + ', which do(es) not exist.');
    process.exit(1);
  }
  return ordered.concat(rest);
}

const files = serverFiles();
/* Concatenate, remembering where each file starts so a reported line number
 * can be translated back to file:line. A single combined lint is the point:
 * per-file linting would report every cross-file helper as undeclared. */
const offsets = [];
let combined = '', line = 1;
for (const f of files) {
  const src = fs.readFileSync(path.join(WEB_APP, f), 'utf8');
  offsets.push({ file: f, start: line });
  combined += src + '\n';
  line += src.split('\n').length;   // +1 for the joining newline is implicit
}

const globals = {};
for (const g of APPS_SCRIPT_GLOBALS) globals[g] = 'readonly';

const messages = new Linter().verify(combined, {
  languageOptions: { ecmaVersion: 2020, sourceType: 'script', globals },
  rules: { 'no-undef': 'error' },
});

function locate(ln) {
  let hit = offsets[0];
  for (const o of offsets) if (o.start <= ln) hit = o; else break;
  return hit.file + ':' + (ln - hit.start + 1);
}

if (messages.length === 0) {
  console.log('lint-server: no undeclared identifiers across ' + files.length + ' server files.');
  process.exit(0);
}
console.error('lint-server: ' + messages.length + ' undeclared identifier(s) —');
for (const m of messages) console.error('  ' + locate(m.line) + '  ' + m.message);
console.error('\nEvery name above resolves to nothing at runtime: the line throws ReferenceError\n' +
  'when reached. If the name IS real, it is either an Apps Script platform global\n' +
  '(add it to APPS_SCRIPT_GLOBALS in this file) or a declaration that belongs in a\n' +
  'web-app/*.js file.');
process.exit(1);
