const fs = require('fs');
const d = require('docx');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, convertInchesToTwip,
  Header, Footer, PageNumber, TableOfContents, LevelFormat, PositionalTab,
  PositionalTabAlignment, PositionalTabLeader,
} = d;

// ---------------------------------------------------------------- palette --
const C = {
  navy: '1C3A5E', accent: '3D72A4', tint: 'EBF2FA', ink: '1F1F1F',
  muted: '5D6B7A', rule: 'DCE3EB', white: 'FFFFFF',
  p0: '1C3A5E', p1: '3E5C76', p2: '2E7D5B', p3: '3D72A4', p4: 'A34A3C', p5: '8A6D1B', p6: '5C7A4A', p7: '2E7D8C', p8: '7D4E6B', p9: 'A0662B', p10: '5B4B8A', ap: '5D6B7A',
};
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

function runs(list, opts = {}) {
  return (list || []).map(r => new TextRun({
    text: r.t,
    bold: !!r.b || !!opts.bold,
    italics: !!r.i || !!opts.italics,
    font: r.c ? 'Consolas' : undefined,
    size: opts.size || 20,
    color: opts.color || C.ink,
  }));
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
  return new TableCell({
    width: { size: o.w, type: WidthType.DXA },
    shading: o.bg ? { type: ShadingType.CLEAR, fill: o.bg, color: 'auto' } : undefined,
    borders: o.borders || cellBorders,
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    children: [new Paragraph({
      children: runs(list, { bold: o.head, color: o.head ? C.white : (o.color || C.ink), size: 18 }),
      spacing: { after: 0, line: 252 },
    })],
  });
}

function table(b) {
  const n = Math.max(b.head.length, ...b.rows.map(r => r.length));
  const w = Math.floor(CONTENT_W / n);
  const widths = Array(n).fill(w);
  widths[n - 1] = CONTENT_W - w * (n - 1);
  const pad = r => { const c = r.slice(); while (c.length < n) c.push([]); return c.slice(0, n); };
  const hasHead = b.head.some(c => c && c.length);
  const rows = [];
  if (hasHead) rows.push(new TableRow({
    tableHeader: true,
    children: pad(b.head).map((c, i) => cell(c, { w: widths[i], bg: C.navy, head: true })),
  }));
  b.rows.forEach((r, ri) => rows.push(new TableRow({
    children: pad(r).map((c, i) => cell(c, { w: widths[i], bg: ri % 2 ? C.tint : undefined })),
  })));
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
for (const b of model.blocks) {
  if (b.k === 'h') {
    const accent = C[b.part] || C.navy;
    if (b.lvl === 1) {
      if (!first) children.push(new Paragraph({ children: [new PageBreak()] }));
      first = false;
      children.push(new Paragraph({
        children: runs(b.runs, { bold: true, size: 40, color: accent }),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 0, after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: accent, space: 8 } },
      }));
    } else {
      children.push(new Paragraph({
        children: runs(b.runs, { bold: true, size: b.lvl === 2 ? 26 : 22,
                                 color: b.lvl === 2 ? C.navy : C.accent }),
        heading: b.lvl === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
        spacing: { before: b.lvl === 2 ? 320 : 240, after: 100 },
        keepNext: true,
      }));
    }
  } else if (b.k === 'p') {
    children.push(para(b.runs));
  } else if (b.k === 'list') {
    b.items.forEach(it => children.push(new Paragraph({
      children: runs(it),
      bullet: b.ordered ? undefined : { level: 0 },
      numbering: b.ordered ? { reference: 'num', level: 0 } : undefined,
      spacing: { after: 60, line: 276 },
    })));
  } else if (b.k === 'table') {
    children.push(table(b));
    children.push(new Paragraph({ text: '', spacing: { after: 160 } }));
  } else if (b.k === 'callout') {
    children.push(calloutBlock(b));
    children.push(new Paragraph({ text: '', spacing: { after: 160 } }));
  } else if (b.k === 'pagebreak') {
    children.push(new Paragraph({ children: [new PageBreak()] }));
  } else if (b.k === 'figure') {
    children.push(new Paragraph({
      children: [new TextRun({ text: '[ Diagram — see the online manual ]', italics: true,
                               color: C.muted, size: 18 })],
      spacing: { after: 160 },
    }));
  }
}

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
        new TextRun({ text: 'Confidential \u2014 Internal Use Only', size: 15, color: C.muted }),
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
