const fs = require('fs');
const path = require('path');
const d = require('docx');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, convertInchesToTwip,
  Header, Footer, PageNumber, TableOfContents, LevelFormat, PositionalTab,
  PositionalTabAlignment, PositionalTabLeader, ImageRun, ExternalHyperlink, InternalHyperlink,
  Bookmark, PageReference, PageOrientation, TabStopType, TabStopPosition, LeaderType,
} = d;

// ---------------------------------------------------------------- palette --
const C = {
  navy: '1C3A5E', accent: '3D72A4', tint: 'EBF2FA', ink: '1F1F1F',
  muted: '5D6B7A', rule: 'DCE3EB', white: 'FFFFFF',
  ap: '5D6B7A',
};
// the part colours are data/chapter_style.json's LIGHT ones (Word has no dark theme)
const CHAPTERS = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'chapter_style.json'), 'utf8'));
Object.keys(CHAPTERS.parts).forEach(k => { C[k] = CHAPTERS.parts[k].light.slice(1).toUpperCase(); });
// a column headed \u2713 / \u2717 (the Do's & Don'ts tables), as the HTML draws it
const TONE = { ok: { bg: 'E7F4EC', ink: '1E6B43' }, no: { bg: 'FCEBEA', ink: 'A1281F' } };
const CO = {
  Critical:  { bg: 'FDECEA', ink: 'B3261E' },
  Policy:    { bg: 'EBF2FA', ink: '1C3A5E' },
  'Watch-out': { bg: 'FFF3CD', ink: '856404' },
  Script:    { bg: 'E3F2F1', ink: '0F6E6E' },
  Note:      { bg: 'F4F4F4', ink: '555555' },
};

const argv = process.argv.slice(2);
const model = JSON.parse(fs.readFileSync(argv[0], 'utf8'));
const OUT = argv[1];
const TITLE = argv[2] || 'CSR Procedures Manual v3.0';

const PAGE_W = 12240, PAGE_H = 15840, MARGIN = 1080;
const CONTENT_W = PAGE_W - MARGIN * 2;

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 2, color: C.rule },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: C.rule },
  left: noBorder, right: noBorder,
};

// ---------------------------------------------------------------- images --
// The pixel size of a PNG or JPEG, read from its header.
function imgSize(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xFF) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
      return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return { w: 100, h: 100 };
}
function dataImage(uri) {
  const m = /^data:image\/(png|jpe?g);base64,(.*)$/s.exec(uri || '');
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  return { buf, type: m[1] === 'png' ? 'png' : 'jpg', size: imgSize(buf) };
}
// An image scaled to fit maxW × maxH pixels (96 per inch), aspect kept.
function imageRun(img, maxW, maxH) {
  const k = Math.min(1, maxW / img.size.w, maxH / img.size.h);
  return new ImageRun({ type: img.type, data: img.buf,
    transformation: { width: Math.round(img.size.w * k), height: Math.round(img.size.h * k) } });
}

function runs(list, opts = {}) {
  const out = [];
  for (const r of (list || [])) {
    if (r.img) {
      const img = dataImage(r.img);
      if (img) out.push(imageRun(img, r.h * 4, r.h));
      continue;
    }
    const tr = new TextRun({
      text: r.t,
      bold: !!r.b || !!opts.bold,
      italics: !!r.i || !!opts.italics,
      font: r.c ? 'Consolas' : undefined,
      size: opts.size || 20,
      color: (r.link || r.anchor) && !opts.color ? C.accent : (opts.color || C.ink),
      underline: r.link ? {} : undefined,
    });
    if (r.link) out.push(new ExternalHyperlink({ link: r.link, children: [tr] }));
    else if (r.anchor) out.push(new InternalHyperlink({ anchor: r.anchor, children: [tr] }));
    else out.push(tr);
  }
  return out;
}

function para(list, opts = {}) {
  return new Paragraph({
    children: runs(list, opts),
    spacing: { after: opts.after === undefined ? 120 : opts.after, line: 276 },
    alignment: opts.align,
    indent: opts.indent,
    keepNext: opts.keepNext,
  });
}

function cell(list, o = {}) {
  let kids = runs(list, { bold: o.head, color: o.head ? C.white : (o.color || undefined), size: 18 });
  if (o.bm) kids = [new Bookmark({ id: o.bm, children: kids })];
  return new TableCell({
    width: { size: o.w, type: WidthType.DXA },
    shading: o.bg ? { type: ShadingType.CLEAR, fill: o.bg, color: 'auto' } : undefined,
    borders: o.borders || cellBorders,
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    // a cell holding a photo gets plain single spacing: a set line height is how a renderer
    // that reads it as exact clips the photo to a strip (change list 2026-10-08 C1)
    children: [new Paragraph({ children: kids,
      spacing: (list || []).some(r => r.img) ? { after: 0 } : { after: 0, line: 252 } })],
  });
}

// A column's share of the width follows what it holds — a long "How to reach" or "Notes"
// column gets room, a short code column doesn't — and no column is narrower than its longest
// word (a date or a phone number never wraps mid-way) (change list C5).
const MIN_COL = 1000;
const TW_PER_CHAR = 100, CELL_PAD = 240;          // 9 pt text, the cell's side margins
function cellLen(c) {
  return (c || []).reduce((s, r) => s + (r.img ? 14 : (r.t || '').length), 0);
}
function colWidths(b, n) {
  const all = [b.head].concat(b.rows);
  const mins = [], weight = [];
  for (let i = 0; i < n; i++) {
    const lens = all.map(r => cellLen(r[i])).filter(x => x > 0);
    const longestWord = Math.max(0, ...all.map(r => Math.max(0, ...(r[i] || []).map(x =>
      x.img ? 10 : Math.max(0, ...((x.t || '').split(/\s+/).map(w => w.length)))))));
    const mean = lens.length ? lens.reduce((s, x) => s + x, 0) / lens.length : 0;
    const max = lens.length ? Math.max(...lens) : 0;
    mins.push(Math.min(3700, Math.max(MIN_COL, longestWord * TW_PER_CHAR + CELL_PAD)));   // an email address fits whole
    weight.push(Math.max(6, Math.min(60, 0.5 * mean + 0.5 * Math.min(max, 80))));
  }
  const total = weight.reduce((s, x) => s + x, 0);
  let widths = weight.map((x, i) => Math.max(mins[i], CONTENT_W * x / total));
  for (let pass = 0; pass < 4; pass++) {                // shrink the roomy columns to fit
    const over = widths.reduce((s, x) => s + x, 0) - CONTENT_W;
    if (over <= 0.5) break;
    const flex = widths.map((x, i) => x - mins[i]), room = flex.reduce((s, x) => s + x, 0);
    if (room <= 0) { widths = widths.map(x => x * CONTENT_W / (CONTENT_W + over)); break; }
    widths = widths.map((x, i) => x - Math.min(flex[i], over * flex[i] / room));
  }
  widths = widths.map(Math.floor);
  widths[n - 1] = CONTENT_W - widths.slice(0, n - 1).reduce((s, x) => s + x, 0);
  return widths;
}

function table(b) {
  const n = Math.max(b.head.length, ...b.rows.map(r => r.length));
  const widths = n * MIN_COL > CONTENT_W ? Array(n).fill(Math.floor(CONTENT_W / n)) : colWidths(b, n);
  if (n * MIN_COL > CONTENT_W) widths[n - 1] = CONTENT_W - widths[0] * (n - 1);
  const pad = r => { const c = r.slice(); while (c.length < n) c.push([]); return c.slice(0, n); };
  const hasHead = b.head.some(c => c && c.length);
  const headText = b.head.map(c => (c || []).map(r => r.t || '').join('').trim());
  // \u2713 / \u2717 headers tint their column; a first header "Step" makes a step table
  const tone = headText.map(t => t.startsWith('\u2713') ? TONE.ok : (t.startsWith('\u2717') ? TONE.no : null));
  const steps = /^step$/i.test(headText[0] || '');
  const rows = [];
  if (hasHead) rows.push(new TableRow({
    tableHeader: true,
    children: pad(b.head).map((c, i) => cell(c, { w: widths[i], bg: tone[i] ? tone[i].ink : C.navy, head: true })),
  }));
  b.rows.forEach((r, ri) => {
    const cells = pad(r).map((c, i) => {
      if (steps && i === 0 && ri < b.rows.length - 1) c = c.concat([{ t: '  \u2193' }]);
      return cell(c, { w: widths[i], bg: tone[i] ? tone[i].bg : (ri % 2 && !steps ? C.tint : undefined),
                       bm: i === 0 && b.bm ? b.bm[ri] : undefined });
    });
    rows.push(new TableRow({ cantSplit: true, children: cells }));   // a row never breaks across a page (C4)
  });
  return new Table({ rows, columnWidths: widths, width: { size: CONTENT_W, type: WidthType.DXA } });
}

function calloutBlock(b) {
  const s = CO[b.kind] || CO.Note;
  const inner = [];
  inner.push(new Paragraph({
    children: [new TextRun({ text: b.kind.toUpperCase(), bold: true, size: 15,
                             color: s.ink, characterSpacing: 20 })],
    spacing: { after: 60 }, keepNext: true,
  }));
  b.body.forEach(x => {

    if (x.k === 'table') {
      inner.push(table(x));
      inner.push(new Paragraph({ text: '', spacing: { after: 40 } }));
    } else if (x.k === 'li') {
      inner.push(new Paragraph({
        children: runs(x.runs, { color: s.ink, size: 19 }),
        bullet: { level: 0 }, spacing: { after: 40, line: 264 },
      }));
    } else {
      inner.push(new Paragraph({
        children: runs(x.runs, { color: s.ink, size: 19 }),
        spacing: { after: 60, line: 264 },
      }));
    }
  });
  return new Table({
    columnWidths: [CONTENT_W],
    width: { size: CONTENT_W, type: WidthType.DXA },
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({
      width: { size: CONTENT_W, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: s.bg, color: 'auto' },
      borders: {
        top: noBorder, bottom: noBorder, right: noBorder,
        left: { style: BorderStyle.SINGLE, size: 18, color: s.ink },
      },
      margins: { top: 120, bottom: 120, left: 180, right: 160 },
      children: inner,
    })] })],
  });
}

// ------------------------------------------------------------------ build --
// The document is a run of SECTIONS: portrait text, and a landscape page for each diagram, so
// a diagram prints at the landscape width (~7.4 pt text) rather than shrunk into a portrait
// column (~5 pt) — change list C8. A section break starts a page by itself, so a heading that
// opens a section takes no page break of its own.
const sections = [];
let children = [];
function openSection(landscape, extra) {
  children = [];
  sections.push(Object.assign({ landscape, children }, extra || {}));
}
let first = true;
const blocks = model.blocks;
const meta = model.meta || {};
// every heading the contents lists needs a bookmark: a chapter title carries none of its own
blocks.forEach((b, k) => { if (b.k === 'h' && b.lvl === 1 && !b.bm) b.bm = 'x_ch_' + k; });
// a page-starting heading follows: no spacer, which could land alone on a page
const breakNext = (k) => {
  let j = k + 1;
  while (blocks[j] && blocks[j].k === 'rule') j++;     // a rule draws nothing in Word
  const n = blocks[j];
  return !n || (n.k === 'h' && n.pb);
};
const spacer = () => new Paragraph({ text: '', spacing: { after: 120, line: 200 } });
const CONTENT_PX = Math.floor(CONTENT_W / 15);   // twips -> px at 96 dpi
const LAND_PX = Math.floor((PAGE_H - MARGIN * 2) / 15);              // a landscape page's width
const LAND_PX_H = Math.floor((PAGE_W - MARGIN * 2 - 1100) / 15);     // and its height, less header and footer

// ---- the cover and the contents (A6): the full manual only; a department guide opens on its banner
if (meta.full) {
  const accent = C.navy;
  const coverKids = [
    new Paragraph({ spacing: { before: 2600, after: 0 }, children: [] }),
    new Paragraph({ children: [new TextRun({ text: 'UniversalMed Supply', bold: true, size: 28, color: C.accent })],
                    spacing: { after: 120 } }),
    new Paragraph({ children: [new TextRun({ text: 'CSR Procedures Manual', bold: true, size: 64, color: accent })],
                    spacing: { after: 240 },
                    border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: accent, space: 12 } } }),
    new Paragraph({ children: [new TextRun({ text: 'What a customer service representative needs to know, department by department',
                                             size: 26, color: C.muted })], spacing: { after: 1600 } }),
    new Paragraph({ children: [new TextRun({ text: 'Version ' + (meta.version || ''), bold: true, size: 22, color: C.ink }),
                               new TextRun({ text: '   \u00b7   Built ' + (meta.built || ''), size: 22, color: C.ink })],
                    spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: 'Owner: ' + (meta.owner || ''), size: 22, color: C.ink })], spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: 'Confidential \u2014 Internal Use Only', size: 20, color: C.muted })] }),
  ];
  openSection(false, { cover: true });
  coverKids.forEach(p => children.push(p));
  // a contents list linked to every chapter and section; Word fills the page numbers when the
  // document opens (updateFields), and a PDF of it keeps the links
  children.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 240 },
    children: [new TextRun({ text: 'Contents', bold: true, size: 40, color: accent })] }));
  blocks.forEach(b => {
    if (b.k !== 'h' || b.lvl > 2 || !b.bm) return;
    let text = (b.runs || []).map(r => r.t || '').join('').trim();
    if (!text) return;
    if (b.lvl === 1 && text === 'CSR Procedures Manual') text = 'How to use this manual';   // the front matter, not the cover's title again
    const top = b.lvl === 1;
    children.push(new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W, leader: LeaderType.DOT }],
      indent: { left: top ? 0 : 360 },
      spacing: { before: top ? 160 : 0, after: top ? 60 : 20 },
      keepNext: top,
      children: [new InternalHyperlink({ anchor: b.bm, children: [new TextRun({ text, bold: top, size: top ? 21 : 19,
                   color: top ? (C[b.part] || C.navy) : C.ink })] }),
                 new TextRun({ text: '\t', size: 19 }),
                 new PageReference(b.bm, { size: 19 })],
    }));
  });
  first = false;
}
openSection(false);
let listNo = 0;   // each numbered list is its own instance, so it restarts at 1 (C2)
blocks.forEach((b, k) => {
  if (b.k === 'h') {
    const accent = C[b.part] || C.navy;
    let kids = runs(b.runs, b.lvl === 1 ? { bold: true, size: 40, color: accent }
      : { bold: true, size: b.lvl === 2 ? 26 : 22, color: b.lvl === 2 ? C.navy : C.accent });
    if (b.bm) kids = [new Bookmark({ id: b.bm, children: kids })];
    const pb = b.pb && !first && children.length > 0;   // a fresh section already starts a page
    first = false;
    if (b.lvl === 1) {
      // a chapter's badge (rasterize_diagrams.py draws it) leads its title, as in the HTML
      const badge = path.join('out', 'icons', (b.part || '') + '.png');
      if (CHAPTERS.parts[b.part] && fs.existsSync(badge)) {
        const buf = fs.readFileSync(badge);
        kids = [new ImageRun({ type: 'png', data: buf, transformation: { width: 30, height: 30 } }), new TextRun({ text: '  ' })].concat(kids);
      }
      children.push(new Paragraph({
        children: kids,
        heading: HeadingLevel.HEADING_1,
        outlineLevel: 0,   // the outline a PDF's bookmarks and Word's navigation pane are built from (A6)
        pageBreakBefore: pb,
        spacing: { before: 0, after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: accent, space: 8 },
                  left: { style: BorderStyle.SINGLE, size: 36, color: accent, space: 10 } },
      }));
    } else {
      children.push(new Paragraph({
        children: kids,
        heading: b.lvl === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
        outlineLevel: Math.min(b.lvl - 1, 3),
        pageBreakBefore: pb,
        spacing: { before: pb ? 0 : (b.lvl === 2 ? 320 : 240), after: 100 },
        keepNext: true,
      }));
    }
  } else if (b.k === 'p') {
    children.push(b.small ? para(b.runs, { size: 16, color: C.muted, after: 60 }) : para(b.runs));
  } else if (b.k === 'list') {
    const inst = b.ordered ? ++listNo : 0;
    b.items.forEach(it => children.push(new Paragraph({
      children: runs(it),
      bullet: b.ordered ? undefined : { level: 0 },
      numbering: b.ordered ? { reference: 'num', level: 0, instance: inst } : undefined,
      spacing: { after: 60, line: 276 },
    })));
  } else if (b.k === 'table') {
    children.push(table(b));
    if (!breakNext(k)) children.push(spacer());
  } else if (b.k === 'callout') {
    children.push(calloutBlock(b));
    if (!breakNext(k)) children.push(spacer());
  } else if (b.k === 'image') {
    const img = dataImage(b.src);
    if (img) children.push(new Paragraph({ children: [imageRun(img, Math.min(CONTENT_PX, 560), 520)],
                                           alignment: AlignmentType.CENTER, keepNext: true, spacing: { after: 60 } }));
    if (b.cap && b.cap.length) children.push(para(b.cap, { size: 17, color: C.muted, align: AlignmentType.CENTER, after: 160 }));
  } else if (b.k === 'diagram') {
    const f = path.join('out', 'diagrams', (b.name || '') + '.png');
    if (b.name && fs.existsSync(f)) {
      // its own landscape page (C8), then the text resumes on a portrait one
      const buf = fs.readFileSync(f);
      openSection(true);
      children.push(new Paragraph({ children: [imageRun({ buf, type: 'png', size: imgSize(buf) }, LAND_PX, LAND_PX_H)],
                                    alignment: AlignmentType.CENTER, spacing: { after: 0 } }));
      openSection(false);
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: '[ Diagram — see the online manual ]', italics: true,
                                 color: C.muted, size: 18 })],
        spacing: { after: 160 },
      }));
    }
  }
});

const doc = new Document({
  creator: 'UniversalMed Supply',
  title: TITLE,
  numbering: { config: [{
    reference: 'num',
    levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.',
               alignment: AlignmentType.START,
               style: { paragraph: { indent: { left: 480, hanging: 360 } } } }],   // room for "10."
  }] },
  styles: { default: { document: { run: { font: 'Aptos', size: 20, color: C.ink } } } },
  features: meta.full ? { updateFields: true } : undefined,   // the contents' page numbers fill in on open
  sections: sections.filter(s => s.children.length).map(s => ({
    properties: {
      titlePage: !!s.cover,            // the cover carries no running header or footer
      page: { size: { width: PAGE_W, height: PAGE_H,
                      orientation: s.landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
              margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } },
    },
    headers: { first: new Header({ children: [new Paragraph({ children: [] })] }),
               default: new Header({ children: [new Paragraph({
      spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.accent, space: 6 } },
      children: [
        new TextRun({ text: 'UniversalMed Supply', bold: true, size: 16, color: C.navy }),
        new TextRun({ text: '   ' + TITLE, size: 16, color: C.muted }),
      ],
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      tabStops: [{ type: d.TabStopType.RIGHT, position: s.landscape ? PAGE_H - MARGIN * 2 : CONTENT_W }],
      children: [
        new TextRun({ text: 'Confidential \u2014 Internal Use Only' +
                      (model.meta && model.meta.owner ? '  \u00b7  Owner: ' + model.meta.owner : ''),
                      size: 15, color: C.muted }),
        new TextRun({ text: '\t', size: 15 }),
        // each field in its own run at the label's size, so no renderer draws "Page" and the
        // numbers at different sizes (C7)
        new TextRun({ text: 'Page ', size: 15, color: C.muted }),
        new TextRun({ children: [PageNumber.CURRENT], size: 15, color: C.muted }),
        new TextRun({ text: ' of ', size: 15, color: C.muted }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: C.muted }),
      ],
    })] }),
               first: new Footer({ children: [new Paragraph({ children: [] })] }) },
    children: s.children,
  })),
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log(`${OUT}  ${(buf.length / 1024).toFixed(0)} KB  ${sections.reduce((n, s) => n + s.children.length, 0)} elements in ${sections.length} sections`);
});
