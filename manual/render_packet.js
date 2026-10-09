// Render a review packet (JSON block model from packet_model.py) as a .docx.
// Built to survive conversion to Google Docs: DXA widths everywhere, CLEAR shading, no nested tables.
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  BorderStyle, HeadingLevel, AlignmentType, Header, Footer, PageNumber, LevelFormat, HeightRule, ImageRun, LineRuleType,
} = require("docx");

const [, , inPath, outPath] = process.argv;
const M = JSON.parse(fs.readFileSync(inPath, "utf8"));

const W = 9360;                         // text width: US Letter less 1" margins, in DXA
const NAVY = "1C3A5E", MUTED = "5B6B7B", RULE = "C9D2DC", PANEL = "F3F5F8", ACCENT = "2F6E9E";
const CALLOUT = {                        // fill, rule
  critical: ["FBE9E7", "B3261E"], policy: ["E8F0F8", "2F6E9E"], "watch-out": ["FDF3DC", "9A6700"],
  script: ["EAF4EE", "2E7D5B"], note: ["F1F3F5", "7A8794"],
};

const run = (r, extra = {}) => new TextRun({
  text: r.text, bold: r.b || extra.bold, italics: r.i || extra.italics,
  font: r.code ? "Consolas" : undefined, color: extra.color, size: extra.size,
});
const runsOf = (rs, extra) => (rs || []).map(r => run(r, extra));

const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const line = (c = RULE, s = 6) => ({ style: BorderStyle.SINGLE, size: s, color: c });

// ---------------------------------------------------------------- excerpt blocks
function excerptParagraph(children, opts = {}) {
  return new Paragraph({
    children, spacing: { before: 40, after: 80 },
    indent: { left: 320 },
    border: { left: line(ACCENT, 12) },
    ...opts,
  });
}

function table(rows, indent = 320) {
  const n = Math.max(...rows.map(r => r.length));
  const width = W - indent;
  // first column narrower when it's a label column
  const txt = rs => (rs || []).map(r => r.text).join("");
  const weight = Array.from({ length: n }, (_, c) => {
    const lens = rows.map(r => txt(r[c]).length);
    const avg = lens.reduce((a, b) => a + b, 0) / Math.max(lens.length, 1);
    const head = txt(rows[0] && rows[0][c]).length;
    return Math.min(Math.max(avg, 10, Math.max(...lens) * 0.35, head * 2.5), 90);
  });
  const total = weight.reduce((a, b) => a + b, 0);
  const widths = weight.map(w => Math.floor(width * w / total));
  widths[widths.length - 1] += width - widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: width, type: WidthType.DXA }, columnWidths: widths,
    indent: { size: indent, type: WidthType.DXA },
    rows: rows.map((r, ri) => new TableRow({
      tableHeader: ri === 0,
      children: widths.map((w, ci) => new TableCell({
        width: { size: w, type: WidthType.DXA },
        shading: ri === 0 ? { type: ShadingType.CLEAR, color: "auto", fill: "E4E9EF" } : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        borders: { top: line(), bottom: line(), left: line(), right: line() },
        children: [new Paragraph({ children: runsOf(r[ci] || [], { size: 18, bold: ri === 0 ? true : undefined }) })],
      })),
    })),
  });
}

function excerptBlocks(bs) {
  const out = [];
  for (const b of bs) {
    if (b.t === "p") out.push(excerptParagraph(runsOf(b.runs, { size: 20 })));
    else if (b.t === "h4") out.push(excerptParagraph(runsOf(b.runs, { bold: true, size: 20, color: NAVY })));
    else if (b.t === "bullet") out.push(new Paragraph({
      numbering: { reference: "bullets", level: 0 }, children: runsOf(b.runs, { size: 20 }),
      spacing: { after: 40 }, indent: { left: 700, hanging: 260 }, border: { left: line(ACCENT, 12) },
    }));
    else if (b.t === "image") {
      const w = 600, h = Math.round(w * b.h / b.w);        // 6.25" wide
      out.push(new Paragraph({ spacing: { before: 80, after: 120, line: 240, lineRule: LineRuleType.AUTO }, alignment: AlignmentType.CENTER, children: [
        new ImageRun({ type: "png", data: fs.readFileSync(b.path), transformation: { width: w, height: h },
                       altText: { title: b.alt, description: b.alt, name: b.alt } })] }));
    }
    else if (b.t === "table") { out.push(table(b.rows)); out.push(new Paragraph({ spacing: { after: 60 } })); }
    else if (b.t === "callout") {
      const [fill, rule] = CALLOUT[b.kind] || CALLOUT.note;
      b.paras.forEach(p => out.push(new Paragraph({
        children: runsOf(p, { size: 20 }), spacing: { before: 40, after: 60 },
        indent: { left: 320 }, shading: { type: ShadingType.CLEAR, color: "auto", fill },
        border: { left: line(rule, 18) },
      })));
    }
  }
  return out;
}

// ---------------------------------------------------------------- answer boxes
function answerBox(open, n) {
  const cell = (children, fill) => new TableCell({
    width: { size: W, type: WidthType.DXA },
    shading: fill ? { type: ShadingType.CLEAR, color: "auto", fill } : undefined,
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    borders: { top: line("8A9AAB", 8), bottom: line("8A9AAB", 8), left: line("8A9AAB", 8), right: line("8A9AAB", 8) },
    children,
  });
  const rows = [];
  if (!open) rows.push(new TableRow({ cantSplit: true, children: [cell([new Paragraph({ keepNext: true, keepLines: true, children: [
    new TextRun({ text: "☐  Correct", bold: true, size: 21 }), new TextRun({ text: "          " }),
    new TextRun({ text: "☐  Needs change", bold: true, size: 21 }),
    new TextRun({ text: "          Question " + n, size: 17, color: MUTED }),
  ] })], "EEF2F6")] }));
  rows.push(new TableRow({
    cantSplit: true,
    height: { value: open ? 1500 : 1100, rule: HeightRule.ATLEAST },
    children: [cell([new Paragraph({ children: [new TextRun({ text: (open ? "Your answer" : "Notes") + (open ? " — question " + n : "") + ":", bold: true, size: 20, color: MUTED })] }),
                     new Paragraph({ children: [] })])],
  }));
  return [new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [W], rows }),
          new Paragraph({ spacing: { after: 160 } })];
}

// ---------------------------------------------------------------- document
const children = [];
for (const b of M.blocks) {
  switch (b.t) {
    case "title": children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: b.text })], spacing: { after: 120 } })); break;
    case "meta": children.push(new Paragraph({ children: runsOf(b.runs, { size: 21 }), spacing: { after: 40 } })); break;
    case "h2": children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: b.text })],
                 border: { bottom: line(RULE, 6) }, spacing: { before: 360, after: 160 } })); break;
    case "h3": children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: runsOf(b.runs), keepNext: true, spacing: { before: 280, after: 100 } })); break;
    case "why": children.push(new Paragraph({ keepNext: true, spacing: { after: 100 }, children: [
                 new TextRun({ text: "Why we're asking: ", italics: true, bold: true, color: MUTED, size: 20 }),
                 ...runsOf(b.runs, { italics: true, color: MUTED, size: 20 })] })); break;
    case "pointer": children.push(new Paragraph({ keepNext: true, spacing: { after: 100 }, children: runsOf(b.runs, { italics: true, color: MUTED, size: 20 }) })); break;
    case "excerpt":
      children.push(new Paragraph({ keepNext: true, spacing: { before: 60, after: 60 }, indent: { left: 320 },
        shading: { type: ShadingType.CLEAR, color: "auto", fill: PANEL }, border: { left: line(ACCENT, 12) },
        children: [new TextRun({ text: "FROM THE MANUAL — ", bold: true, size: 17, color: ACCENT }),
                   new TextRun({ text: b.title, bold: true, size: 19, color: NAVY })] }));
      children.push(...excerptBlocks(b.blocks));
      children.push(new Paragraph({ spacing: { after: 80 } }));
      break;
    case "answer": children.push(...answerBox(false, b.n)); break;
    case "answer_open": children.push(...answerBox(true, b.n)); break;
    case "closing": children.push(new Paragraph({ spacing: { before: 360 }, border: { top: line(RULE, 6) },
                     children: runsOf(b.runs, { italics: true, color: MUTED }) })); break;
    default: children.push(new Paragraph({ children: runsOf(b.runs), spacing: { after: 140 } }));
  }
}

const doc = new Document({
  creator: "UniversalMed Supply — Customer Service", title: M.title,
  styles: {
    default: { document: { run: { font: "Arial", size: 21 }, paragraph: { spacing: { line: 276 } } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", run: { size: 40, bold: true, color: NAVY } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 30, bold: true, color: NAVY }, paragraph: { outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 23, bold: true, color: "1F2933" }, paragraph: { outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT }] }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ children: [PageNumber.CURRENT], size: 18, color: MUTED })] })] }) },
    children,
  }],
});
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(outPath, buf); console.log("wrote", outPath, buf.length, "bytes"); });
