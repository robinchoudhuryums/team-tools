// Accessible-name measurement (batch 5B). The pure harness can only see
// whether a NAME SOURCE exists in the source text; it cannot resolve a
// for=/id association, and it cannot see a for= attribute built in a separate
// string literal. Only an engine can. This reads back the name Chromium
// actually computes, for every rendered control in every landed view AND for
// all three public-form templates (which the visual matrix cannot shoot,
// being their own standalone page).
//   node build.mjs && node a11y-names.mjs
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
function chromiumPath() {
  for (const root of [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers'].filter(Boolean)) {
    try {
      const hit = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
      if (hit) { const exe = path.join(root, hit, 'chrome-linux', 'chrome'); if (fs.existsSync(exe)) return exe; }
    } catch (e) {}
  }
  return undefined;
}
const NAME_FN = `(el) => {
  if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim();
  const lb = el.getAttribute('aria-labelledby');
  if (lb) return lb.split(/\\s+/).map((id) => { const n = document.getElementById(id); return n ? n.textContent.trim() : ''; }).join(' ').trim();
  if (el.labels && el.labels.length) return Array.from(el.labels).map((l) => l.textContent.trim()).join(' ');
  return '';
}`;
const browser = await chromium.launch({ executablePath: chromiumPath() });
let bad = 0;

// ── 1. Every landed in-app view ──────────────────────────────────────────
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('umsTour', JSON.stringify({ seenVersion: 1 })); localStorage.setItem('umsTzWarnedDay', new Date().toLocaleDateString('sv-SE')); } catch (e) {} });
await page.goto('file://' + path.join(HERE, 'page.html'));
await page.waitForTimeout(900);
const VIEWS = [['timeClock','clock'],['timeClock','timeoff'],['callNotes','callNotes'],['metrics',null],
               ['manage','manage'],['intake','intakePpd'],['intake','intakeCatalog'],['reference',null],['develop','training']];
for (const [tool, tab] of VIEWS) {
  await page.evaluate(([t, b]) => window.enterTool(t, b || undefined), [tool, tab]);
  await page.waitForTimeout(700);
  const r = await page.evaluate((fnSrc) => {
    const name = eval(fnSrc); const out = { named: 0, unnamed: [] };
    document.querySelectorAll('input,select,textarea').forEach((el) => {
      if (/hidden|submit|button|checkbox|radio/i.test(el.type || '')) return;
      if (name(el)) out.named++; else out.unnamed.push(el.id || el.className || el.tagName);
    });
    return out;
  }, NAME_FN);
  bad += r.unnamed.length;
  console.log((tab || tool).padEnd(14), 'named', String(r.named).padStart(3), ' unnamed', String(r.unnamed.length).padStart(2),
    r.unnamed.length ? ('  <- ' + r.unnamed.join(', ')) : '');
}
await page.close();

// ── 2. The public form's three templates ─────────────────────────────────
const tmp = path.join(HERE, '_pubform.tmp.html');
fs.writeFileSync(tmp, fs.readFileSync(path.join(HERE, '../../web-app/form_public.html'), 'utf8')
  .replace(/<\?!=[\s\S]*?\?>/g, "'TEST-TOKEN'"));
const p2 = await browser.newPage({ viewport: { width: 900, height: 1000 } });
await p2.goto('file://' + tmp); await p2.waitForTimeout(400);
for (const form of ['eaa', 'pt-ot-rx', 'seating-eval']) {
  const r = await p2.evaluate(([f, fnSrc]) => {
    const name = eval(fnSrc);
    const host = document.getElementById('form-fields') || document.body;
    host.innerHTML = { 'eaa': renderEaaForm, 'pt-ot-rx': renderPtOtRxForm, 'seating-eval': renderSeatingEvalForm }[f]();
    const out = { named: 0, unnamed: [], names: [] };
    host.querySelectorAll('input,select,textarea').forEach((el) => {
      if (/hidden|submit|button|checkbox|radio/i.test(el.type || '')) return;
      const n = name(el);
      if (n) { out.named++; out.names.push(n.replace(/\s+/g, ' ').replace(/\s*\*$/, '')); } else out.unnamed.push(el.id || el.className || el.tagName);
    });
    // Two controls sharing a name is its own defect — a screen-reader user
    // cannot tell which field they are in.
    out.dupes = [...new Set(out.names.filter((v, i, a) => a.indexOf(v) !== i))];
    return out;
  }, [form, NAME_FN]);
  bad += r.unnamed.length + r.dupes.length;
  console.log(('form:' + form).padEnd(14), 'named', String(r.named).padStart(3), ' unnamed', String(r.unnamed.length).padStart(2),
    r.unnamed.length ? ('  <- ' + r.unnamed.join(', ')) : '', r.dupes.length ? ('  DUPLICATE NAMES: ' + r.dupes.join(', ')) : '');
}
fs.unlinkSync(tmp);
await browser.close();
console.log(bad === 0 ? '\nAll rendered controls carry an accessible name.' : `\n${bad} problem(s) — see above.`);
process.exit(bad === 0 ? 0 : 1);
