# New icons for `script_icons.html`

Add these keys to the `ICONS` object in `web-app/script_icons.html`. They follow the
existing convention exactly: inner SVG markup only, drawn on a 24×24 grid, no
`<svg>` wrapper (the `icon()` helper adds it), `stroke="currentColor"` so they
inherit text color in light/dark/status contexts.

```js
// ── Intake tabs ───────────────────────────────────────────────────────
// PPD — clipboard with lines (the patient-profile questionnaire)
clipboardList: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M8 11h8"/><path d="M8 15h6"/>',
// PMD — accessibility figure (power-mobility device)
accessibility: '<circle cx="16" cy="4" r="1"/><path d="m18 19 1-7-6 1"/><path d="m5 8 3-3 5.5 3-2.36 3.5"/><path d="M4.24 14.5a5 5 0 0 0 6.88 6"/><path d="M13.76 17.5a5 5 0 0 0-6.88-6"/>',
// PAP — airflow / breathing (CPAP / sleep therapy)
airflow: '<path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/>',
// Sent — outbox tray with up-arrow (log of forms you've sent)
outbox: '<path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"/><path d="M3 8l2-4h14l2 4"/><path d="M12 17V9"/><path d="m8.5 12.5 3.5-3.5 3.5 3.5"/>',
// Reference — article/document (distinct from list/grid/paperclip already used)
fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/>',
```

## Tab → icon mapping (Intake)

| Tab | Old key | New key |
|-----|---------|---------|
| PPD | `send` | `clipboardList` |
| PMD Account | `user` | `accessibility` |
| PAP Account | `user` | `airflow` |
| Sent | `list` | `outbox` |

The four Intake tab icons are registered wherever the Intake tool's sub-tabs are
defined (the TOOLS/tab registry). Update those four references.

## Reference tree item icons
In `web-app/kb/script_kb.html`, `kbItemIcon_(it)` currently returns `'list'` for
articles. Return `'fileText'` for articles instead (keep `'grid'` for sheets,
`'paperclip'` for files).

## Alternatives considered (not required)
- PPD: `clipboardCheck` (✓ instead of lines) if you'd rather emphasize the recommendation step.
- PAP: existing `moon` if you'd rather signal "sleep" than "airflow".
- Sent: existing `send` (paper-plane) or a `mailCheck` (envelope + ✓).
