import { chromium } from 'playwright';
import fs from 'fs';
function cp(){const r='/opt/pw-browsers';const h=fs.readdirSync(r).filter(d=>/^chromium-\d+$/.test(d)).sort().pop();return `${r}/${h}/chrome-linux/chrome`;}
const b = await chromium.launch({ executablePath: cp() });
const p = await b.newPage({ viewport: { width: 820, height: 1000 } });
p.on('pageerror', e => console.log('PAGE ERROR:', e.message));
await p.goto('file:///tmp/roster/gloss.html');
await p.waitForTimeout(300);
console.log(JSON.stringify(await p.evaluate(() => {
  const marks = [...document.querySelectorAll('.kb-gloss-mark')];
  return {
    terms: document.querySelectorAll('.kb-gloss-row').length,
    annotated: marks.map(m => m.textContent),
    insideGlossary: marks.filter(m => m.closest('.kb-glossary')).length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}), null, 1));
await p.screenshot({ path: '/tmp/roster/gloss.png', fullPage: true });
await b.close();
