#!/usr/bin/env python3
"""The handbook's feedback as a worklist for the people who edit this source.

The app is read-only for handbook sections, so what the reps say about one —
a suggested edit, an "out of date" flag, a vote — only helps once it reaches
the file the section is built from. Admin → Reference → Handbook → Export
feedback writes it to a Google Sheet; download its Feedback tab as CSV and run

    python3 feedback_report.py handbook-feedback.csv > feedback.md

The worklist groups the sections with open items by source file (`src/p5.md`),
in the file's own order, quoting each item; then the sections reps voted not
helpful that carry no open item. Open = raised after the section was last
reviewed; importing a section whose text changed counts as its review, so a
fixed section drops off the next export by itself.

Standard library only (any Python 3). `--check` runs the built-in self-test.
"""
import csv
import io
import sys

HEADERS = ['Section', 'Chapter', 'Source', 'Id', 'Open suggestions', 'Open out of date',
           'Helpful', 'Not helpful', 'Comments', 'Last reviewed', 'Open items']


def _int(v):
    try:
        return int(str(v).strip() or 0)
    except ValueError:
        return 0


def read_rows(text):
    """Rows from the exported CSV. Refuses a file that is not the export —
    a worklist built from the wrong columns would quote the wrong text."""
    rd = csv.reader(io.StringIO(text))
    try:
        head = next(rd)
    except StopIteration:
        raise ValueError('the file is empty')
    head = [h.strip().lstrip('﻿') for h in head]
    missing = [h for h in HEADERS if h not in head]
    if missing:
        raise ValueError('not the handbook feedback export (missing column(s): ' + ', '.join(missing) + ')')
    at = {h: head.index(h) for h in HEADERS}
    rows = []
    for raw in rd:
        if not any(c.strip() for c in raw):
            continue
        raw = raw + [''] * (len(head) - len(raw))
        r = {h: raw[at[h]] for h in HEADERS}
        src = r['Source'].strip()
        rows.append({
            'section': r['Section'].strip(), 'chapter': r['Chapter'].strip(), 'source': src,
            'file': src.split(' §')[0] if src else '(source unknown)', 'id': r['Id'].strip(),
            'suggest': _int(r['Open suggestions']), 'stale': _int(r['Open out of date']),
            'helpful': _int(r['Helpful']), 'not_helpful': _int(r['Not helpful']),
            'comments': _int(r['Comments']), 'reviewed': r['Last reviewed'].strip(),
            'items': [ln.strip() for ln in r['Open items'].splitlines() if ln.strip()],
        })
    return rows


def _md(s):
    """Text from the app, made inert in Markdown: no raw HTML, no accidental
    heading or list from a rep's note."""
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def report(rows):
    open_rows = [r for r in rows if r['items']]
    files = []
    for r in open_rows:
        if r['file'] not in files:
            files.append(r['file'])
    out = ['# Handbook feedback worklist', '']
    n_items = sum(len(r['items']) for r in open_rows)
    out.append('%d open item%s in %d section%s across %d file%s.' % (
        n_items, '' if n_items == 1 else 's', len(open_rows), '' if len(open_rows) == 1 else 's',
        len(files), '' if len(files) == 1 else 's'))
    out.append('')
    for f in files:
        out.append('## `%s`' % f)
        out.append('')
        for r in [x for x in open_rows if x['file'] == f]:
            where = r['source'].split(' §', 1)
            out.append('### %s%s' % (_md(r['section'] or r['id']), (' — §' + where[1]) if len(where) == 2 else ''))
            meta = ['%d helpful / %d not helpful' % (r['helpful'], r['not_helpful'])]
            if r['comments']:
                meta.append('%d comment%s in the app' % (r['comments'], '' if r['comments'] == 1 else 's'))
            meta.append('last reviewed ' + (r['reviewed'] or 'never'))
            out.append('_' + ' · '.join(meta) + '_')
            out.append('')
            for it in r['items']:
                out.append('- [ ] ' + _md(it))
            out.append('')
    quiet = [r for r in rows if not r['items'] and r['not_helpful'] > 0]
    if quiet:
        quiet.sort(key=lambda r: (-r['not_helpful'], r['source']))
        out.append('## Voted not helpful, with no open item')
        out.append('')
        for r in quiet:
            out.append('- %s (`%s`) — %d not helpful / %d helpful' % (
                _md(r['section'] or r['id']), r['source'] or r['id'], r['not_helpful'], r['helpful']))
        out.append('')
    if not open_rows and not quiet:
        out.append('Nothing to act on.')
        out.append('')
    return '\n'.join(out)


def _self_test():
    text = ('Section,Chapter,Source,Id,Open suggestions,Open out of date,Helpful,Not helpful,Comments,Last reviewed,Open items\r\n'
            '5.1 Scope,Chapter 05 — Power,src/p5.md §5-1,man-5-1,1,0,3,1,0,2026-10-01,"2026-10-14 · suggested edit · fee is <b>$85</b>"\r\n'
            '5.2 PAK,Chapter 05 — Power,src/p5.md §5-2,man-5-2,0,0,0,4,0,2026-10-01,\r\n'
            'Card 5 — Oxygen,Appendix C,src/appendix_c.md §C-5,man-c-5,1,1,0,0,2,,"2026-10-12 · out of date · (no note)\n2026-10-13 · suggested edit · # not a heading"\r\n')
    rows = read_rows(text)
    md = report(rows)
    assert '3 open items in 2 sections across 2 files.' in md, md
    assert md.index('## `src/p5.md`') < md.index('## `src/appendix_c.md`'), 'files keep the export order'
    assert '### 5.1 Scope — §5-1' in md and '### Card 5 — Oxygen — §C-5' in md
    assert '- [ ] 2026-10-14 · suggested edit · fee is &lt;b&gt;$85&lt;/b&gt;' in md, 'a note is inert'
    assert '- [ ] 2026-10-13 · suggested edit · # not a heading' in md
    assert '_0 helpful / 0 not helpful · 2 comments in the app · last reviewed never_' in md
    assert '- 5.2 PAK (`src/p5.md §5-2`) — 4 not helpful / 0 helpful' in md
    assert '5.2 PAK —' not in md.split('## Voted')[0], 'a section with no open item is not in the worklist'
    try:
        read_rows('Title,Note\r\nx,y\r\n')
        raise AssertionError('a file that is not the export must be refused')
    except ValueError as e:
        assert 'missing column' in str(e)
    assert 'Nothing to act on.' in report(read_rows(text.split('\r\n')[0] + '\r\n'))
    print('feedback_report: self-test passed')


def main(argv):
    if len(argv) == 2 and argv[1] == '--check':
        _self_test()
        return 0
    if len(argv) != 2:
        sys.stderr.write('usage: feedback_report.py <handbook-feedback.csv>   (or --check)\n')
        return 2
    with open(argv[1], encoding='utf-8-sig', newline='') as fh:
        text = fh.read()
    try:
        rows = read_rows(text)
    except ValueError as e:
        sys.stderr.write('feedback_report: ' + str(e) + '\n')
        return 1
    sys.stdout.write(report(rows))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
