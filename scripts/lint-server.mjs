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
/* HB1.2 (2026-10-28): handbook-app/ is a second Apps Script project — its own
 * global scope, its own manifest. Each project is linted alone, so a name only
 * Team Tools declares is undeclared in the handbook (and throws there). */
const PROJECTS = [WEB_APP, path.join(ROOT, 'handbook-app')].filter((d) => fs.existsSync(path.join(d, '.clasp.json')));

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
function advancedServiceGlobals(dir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'appsscript.json'), 'utf8'));
  const svcs = (manifest.dependencies && manifest.dependencies.enabledAdvancedServices) || [];
  return svcs.map((s) => s && s.userSymbol).filter(Boolean);
}


/** Server files in the order Apps Script would see them: filePushOrder first,
 *  then everything else clasp pushes, sorted. Membership is the DIRECTORY, not
 *  filePushOrder — a new .js file is covered the moment it lands. */
function serverFiles(dir) {
  const clasp = JSON.parse(fs.readFileSync(path.join(dir, '.clasp.json'), 'utf8'));
  const ordered = (clasp.filePushOrder || []).filter((f) => f.endsWith('.js'));
  const all = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
  const rest = all.filter((f) => !ordered.includes(f));
  const gone = ordered.filter((f) => !all.includes(f));
  if (gone.length) {
    console.error('lint-server: filePushOrder names ' + gone.join(', ') + ', which do(es) not exist.');
    process.exit(1);
  }
  return ordered.concat(rest);
}

/* SHEET-SAFE (cycle 22 S2). Sheets parses a string written by setValue /
 * setValues / appendRow as if a person typed it, so `=…` (and `+…`/`-…` that is
 * not a number) becomes a FORMULA whose computed result getValues() hands back
 * — a rep's time-off note could read the whole Employees tab, pay rates
 * included, into their own calendar. Every server write therefore passes its
 * value through the matching helper in 10_core.js, and this rule refuses one
 * that does not, by AST, in every pushed file except the Tests.js fixtures.
 * The formula-writing APIs are banned outright: the app never writes one. */
// A plain-text ('@') cell is the one exception: it never evaluates, but it
// stores sheetSafe_'s apostrophe literally, so a writer into '@' cells uses the
// sheetText_ / sheetTextRows_ pass-throughs — and run.js's SHEET-SAFE pin holds
// that each such use sits after a setNumberFormat('@') in the same function.
const SHEET_SAFE = [
  ['appendRow', 'sheetSafeRow_'], ['setValue', 'sheetSafe_|sheetText_'], ['setValues', 'sheetSafeRows_|sheetTextRows_'],
].map(([m, h]) => ({
  selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='" + m + "']" +
    ":not([arguments.length=1][arguments.0.type='CallExpression'][arguments.0.callee.name=/^(" + h + ")$/])",
  message: 'SHEET-SAFE: .' + m + '(…) must write ' + h.split('|').join('(…) or ') + '(…) — an unwrapped string starting with = + - is stored as a formula',
})).concat([{
  selector: "CallExpression[callee.property.name=/^(setFormula|setFormulas|setFormulaR1C1|setFormulasR1C1|setRichTextValue|setRichTextValues)$/]",
  message: 'SHEET-SAFE: the app never writes a formula or rich text — this API bypasses the sheet-safe boundary',
}]);
const SHEET_SAFE_EXEMPT_FILES = ['Tests.js'];   // fixture writes of constant TEST_ data


/** Lint ONE project: its pushed .js files concatenated in the order Apps
 *  Script loads them, against the platform's globals and its own manifest's
 *  advanced services. Returns the problems, each located to file:line. */
function lintProject(dir) {
  const files = serverFiles(dir);
  /* Concatenate, remembering where each file starts so a reported line number
   * can be translated back to file:line. A single combined lint is the point:
   * per-file linting would report every cross-file helper as undeclared. */
  const offsets = [];
  let combined = '', line = 1;
  for (const f of files) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    offsets.push({ file: f, start: line });
    combined += src + '\n';
    line += src.split('\n').length;   // +1 for the joining newline is implicit
  }
  const globals = {};
  for (const g of APPS_SCRIPT_BUILTINS.concat(advancedServiceGlobals(dir))) globals[g] = 'readonly';
  const locateHit = (ln) => {
    let hit = offsets[0];
    for (const o of offsets) if (o.start <= ln) hit = o; else break;
    return hit;
  };
  const project = path.relative(ROOT, dir);
  const messages = new Linter().verify(combined, {
    languageOptions: { ecmaVersion: 2020, sourceType: 'script', globals },
    rules: { 'no-undef': 'error', 'no-restricted-syntax': ['error'].concat(SHEET_SAFE) },
  }).filter((m) => !(m.ruleId === 'no-restricted-syntax' &&
    SHEET_SAFE_EXEMPT_FILES.indexOf(locateHit(m.line).file) >= 0));
  return {
    files: files.length,
    problems: messages.map((m) => {
      const hit = locateHit(m.line);
      return project + '/' + hit.file + ':' + (m.line - hit.start + 1) + '  ' + m.message;
    }),
  };
}

let fileCount = 0;
const problems = [];
for (const dir of PROJECTS) {
  const r = lintProject(dir);
  fileCount += r.files;
  problems.push(...r.problems);
}

if (problems.length === 0) {
  console.log('lint-server: no undeclared identifiers and no unwrapped sheet write across ' + fileCount + ' server files in ' +
    PROJECTS.length + ' project(s).');
  process.exit(0);
}
console.error('lint-server: ' + problems.length + ' problem(s) —');
for (const p of problems) console.error('  ' + p);
console.error('\nA SHEET-SAFE line writes a value Sheets may store as a FORMULA: wrap it in the\n' +
  'helper the message names (10_core.js). Any other line is an undeclared name.\n' +
  'Every such name resolves to nothing at runtime: the line throws ReferenceError\n' +
  'when reached. If the name IS real, it is either an Apps Script platform global\n' +
  '(add it to APPS_SCRIPT_GLOBALS in this file) or a declaration that belongs in a\n' +
  'web-app/*.js file — or, in handbook-app/, in Handbook.js or the sync\'s copy.');
process.exit(1);
