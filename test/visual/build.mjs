// Static-render visual audit — composes the production index.html (with every
// include() inlined) into a standalone page.html that runs in a real browser
// with a fixture-backed google.script.run mock. See README.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', 'web-app');

let html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');

// Inline every include() exactly where production evaluates it (scriptlets
// inside partials stripped — none are load-bearing outside doGet templates).
html = html.replace(/<\?!=\s*include\('([^']+)'\)\s*\?>/g, (m, f) =>
  fs.readFileSync(path.join(WEB, f + '.html'), 'utf8').replace(/<\?[\s\S]*?\?>/g, ''));

// The two doGet template values: query params come from the page's own URL so
// scenarios can pass ?compact=1 / ?tool=...; the web-app URL is a dummy.
html = html.replace(/<\?!=\s*JSON\.stringify\(serverQueryParams[\s\S]*?\?>/,
  'Object.fromEntries(new URLSearchParams(location.search))');
html = html.replace(/<\?!=\s*JSON\.stringify\(webAppUrl[\s\S]*?\?>/,
  "'https://example.test/exec'");
// Empty stamp disables the deploy-version beacon in the harness (no polling,
// no reload prompt in screenshots). Must precede the straggler strip, which
// would otherwise leave `window.SERVER_BUILD_STAMP = ;` — a head SyntaxError.
html = html.replace(/<\?!=\s*JSON\.stringify\(buildStamp[\s\S]*?\?>/, "''");
// Any straggler scriptlets
html = html.replace(/<\?[\s\S]*?\?>/g, '');

// Inject the google.script.run mock before any partial script runs.
const mock = fs.readFileSync(path.join(HERE, 'mock.js'), 'utf8');
html = html.replace('</head>', '<script>\n' + mock + '\n</script>\n</head>');

fs.writeFileSync(path.join(HERE, 'page.html'), html);
console.log('page.html written:', html.length, 'bytes');
