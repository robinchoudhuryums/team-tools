const fs = require('fs');
const path = require('path');
const d = require('docx');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, convertInchesToTwip,
  Header, Footer, PageNumber, TableOfContents, LevelFormat, PositionalTab,
  PositionalTabAlignment, PositionalTabLeader, ImageRun, ExternalHyperlink, InternalHyperlink,
  Bookmark,
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
    children: [new Paragraph({ children: kids, spacing: { after: 0, line: 252 } })],
  });
}

function table(b) {
  const n = Math.max(b.head.length, ...b.rows.map(r => r.length));
  const w = Math.floor(CONTENT_W / n);
  const widths = Array(n).fill(w);
  widths[n - 1] = CONTENT_W - w * (n - 1);
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
    rows.push(new TableRow({ children: cells }));
  });
  return new Table({ rows, columnWidths: widths, width: { size: CONTENT_W, type: WidthType.DXA } });
}

function calloutBlock(b) {
  const s = CO[b.kind] || CO.Note;
  const inner = [];
  inner.push(new Paragraph({
    children: [new TextRun({ text: b.kind.toUpperCase(), bold: true, size: 15,
                             color: s.ink, characterSpacing: 20 })],
    spacing: { after: 60 },
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
    rows: [new TableRow({ children: [new TableCell({
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
const children = [];
let first = true;
const blocks = model.blocks;
// a page-starting heading follows: no spacer, which could land alone on a page
const breakNext = (k) => {
  let j = k + 1;
  while (blocks[j] && blocks[j].k === 'rule') j++;     // a rule draws nothing in Word
  const n = blocks[j];
  return !n || (n.k === 'h' && n.pb);
};
const spacer = () => new Paragraph({ text: '', spacing: { after: 120, line: 200 } });
const CONTENT_PX = Math.floor(CONTENT_W / 15);   // twips -> px at 96 dpi
blocks.forEach((b, k) => {
  if (b.k === 'h') {
    const accent = C[b.part] || C.navy;
    let kids = runs(b.runs, b.lvl === 1 ? { bold: true, size: 40, color: accent }
      : { bold: true, size: b.lvl === 2 ? 26 : 22, color: b.lvl === 2 ? C.navy : C.accent });
    if (b.bm) kids = [new Bookmark({ id: b.bm, children: kids })];
    const pb = b.pb && !first;
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
        pageBreakBefore: pb,
        spacing: { before: 0, after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: accent, space: 8 },
                  left: { style: BorderStyle.SINGLE, size: 36, color: accent, space: 10 } },
      }));
    } else {
      children.push(new Paragraph({
        children: kids,
        heading: b.lvl === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
        pageBreakBefore: pb,
        spacing: { before: pb ? 0 : (b.lvl === 2 ? 320 : 240), after: 100 },
        keepNext: true,
      }));
    }
  } else if (b.k === 'p') {
    children.push(b.small ? para(b.runs, { size: 16, color: C.muted, after: 60 }) : para(b.runs));
  } else if (b.k === 'list') {
    b.items.forEach(it => children.push(new Paragraph({
      children: runs(it),
      bullet: b.ordered ? undefined : { level: 0 },
      numbering: b.ordered ? { reference: 'num', level: 0 } : undefined,
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
      const buf = fs.readFileSync(f);
      children.push(new Paragraph({ children: [imageRun({ buf, type: 'png', size: imgSize(buf) }, CONTENT_PX, 860)],
                                    alignment: AlignmentType.CENTER, spacing: { after: 160 } }));
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
               style: { paragraph: { indent: { left: 400, hanging: 240 } } } }],
  }] },
  styles: { default: { document: { run: { font: 'Aptos', size: 20, color: C.ink } } } },
  sections: [{
    properties: {
      page: { size: { width: PAGE_W, height: PAGE_H },
              margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } },
    },
    headers: { default: new Header({ children: [new Paragraph({
      spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.accent, space: 6 } },
      children: [
        new TextRun({ text: 'UniversalMed Supply', bold: true, size: 16, color: C.navy }),
        new TextRun({ text: '   ' + TITLE, size: 16, color: C.muted }),
      ],
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      tabStops: [{ type: d.TabStopType.RIGHT, position: CONTENT_W }],
      children: [
        new TextRun({ text: 'Confidential \u2014 Internal Use Only' +
                      (model.meta && model.meta.owner ? '  \u00b7  Owner: ' + model.meta.owner : ''),
                      size: 15, color: C.muted }),
        new TextRun({ text: '\t', size: 15 }),
        new TextRun({ children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
                      size: 15, color: C.muted }),
      ],
    })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log(`${OUT}  ${(buf.length / 1024).toFixed(0)} KB  ${children.length} elements`);
});
