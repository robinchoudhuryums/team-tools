import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
function cp(){for(const r of [process.env.PLAYWRIGHT_BROWSERS_PATH,'/opt/pw-browsers'].filter(Boolean)){try{const h=fs.readdirSync(r).filter(d=>/^chromium-\d+$/.test(d)).sort().pop();if(h){const e=path.join(r,h,'chrome-linux','chrome');if(fs.existsSync(e))return e;}}catch(e){}}return undefined;}
const b=await chromium.launch({executablePath:cp()});
const page=await b.newPage({viewport:{width:1440,height:900}});
await page.addInitScript(()=>{try{localStorage.clear();localStorage.setItem('umsTour',JSON.stringify({seenVersion:1}));localStorage.setItem('umsTzWarnedDay',new Date().toLocaleDateString('sv-SE'));}catch(e){}});
await page.goto('file://'+path.join(HERE,'page.html')); await page.waitForTimeout(900);
const probe = () => page.evaluate(() => {
  const name = (el) => {
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim();
    const lb = el.getAttribute('aria-labelledby');
    if (lb) return lb.split(/\s+/).map(id=>{const n=document.getElementById(id);return n?n.textContent.trim():'';}).join(' ').trim();
    if (el.labels && el.labels.length) return Array.from(el.labels).map(l=>l.textContent.trim()).join(' ');
    return '';
  };
  const out={named:[],unnamed:[]};
  document.querySelectorAll('input,select,textarea').forEach((el)=>{
    if (/hidden|submit|button|checkbox|radio/i.test(el.type||'')) return;
    const n=name(el);
    (n?out.named:out.unnamed).push((el.id||el.className||el.tagName)+(n?' => "'+n.replace(/\s+/g,' ').slice(0,44)+'"':''));
  });
  return out;
});
for (const [tool,tab] of [['timeClock','timeoff'],['callNotes','callNotes'],['metrics',null],['manage','manage'],['intake','intakePpd'],['develop','training']]) {
  await page.evaluate(([t,b])=>window.enterTool(t,b||undefined),[tool,tab]); await page.waitForTimeout(700);
  const r=await probe();
  console.log((tab||tool).padEnd(12), 'named', String(r.named.length).padStart(3), ' unnamed', String(r.unnamed.length).padStart(3), r.unnamed.length?('  <- '+r.unnamed.slice(0,4).join(', ')):'');
  if (tool==='timeClock') r.named.slice(0,4).forEach(x=>console.log('      ',x));
}
await b.close();
