// ════════════════════════════════════════════════════════════════════════════
//  UMS CALL NOTES  —  Code.gs
//   Workspace Add-on that augments each rep's call-template Google Sheet
//   with department-targeted email composers. Surfaces are dual:
//     1. Custom menu (added by onOpen) — matches the legacy UX so reps
//        don't have to relearn anything.
//     2. Sidebar card (rendered by onSheetsHomepage) — newer Workspace
//        Add-on UX; both surfaces dispatch to the same composeForDept_
//        / promptForExtraDetails_ / lookupHcpcs_ underlying handlers.
//
//   SCAFFOLD ONLY — the DEPARTMENTS / EMAIL_TEMPLATES / HCPCS_REF_SS_ID
//   constants below are placeholders. Real department addresses, body
//   templates, and the reference-sheet ID get filled in once the
//   existing call-template script is pasted in for porting.
// ════════════════════════════════════════════════════════════════════════════

const CN_CONFIG = {
  // Secrets via Script Properties (same pattern as web-app/Code.js):
  //   HCPCS_REF_SS_ID → spreadsheet ID of the reference sheet that
  //                     holds HCPCS codes + out-of-pocket costs.
  //   <ADDITIONAL_KEYS_AS_NEEDED>
  // Set in Apps Script editor → Project Settings → Script Properties.
  // Code paths fall back to the placeholder below; production must override.
  HCPCS_REF_SS_ID: 'YOUR_HCPCS_REFERENCE_SPREADSHEET_ID',

  // Per-department config. Each entry powers one menu item AND one card
  // button. requiresExtraForm:true means the composer first shows a
  // modal dialog asking for extra fields before sending.
  DEPARTMENTS: [
    { key: 'DEPT_A', label: 'Dept A', email: 'dept-a@umsupply.com', requiresExtraForm: false },
    { key: 'DEPT_B', label: 'Dept B', email: 'dept-b@umsupply.com', requiresExtraForm: true  },
    { key: 'DEPT_C', label: 'Dept C', email: 'dept-c@umsupply.com', requiresExtraForm: false },
  ],

  // Cell range expected to be highlighted by the rep before they pick a
  // dept (the canonical "call note template" shape). The composer reads
  // exactly this shape relative to the active range's top-left cell.
  NOTE_TEMPLATE_ROWS: 2,
  NOTE_TEMPLATE_COLS: 7,
};


// ════════════════════════════════════════════════════════════════════════════
//  ENTRY POINTS  —  registered in appsscript.json
// ════════════════════════════════════════════════════════════════════════════

/** Sheets-host homepage trigger — returns the sidebar card. */
function onSheetsHomepage(e) {
  return buildHomepageCard_();
}

/** Generic add-on homepage trigger (when opened outside Sheets context). */
function onHomepage(e) {
  return buildHomepageCard_();
}

/** Fired when the user grants file-scope access via the prompt card. */
function onScopeGranted(e) {
  return buildHomepageCard_();
}

/** Simple-trigger custom menu — matches legacy UX. Reps still see a
 *  "Call Notes" entry in the Sheets menu bar in addition to the
 *  Workspace Add-on sidebar. */
function onOpen(e) {
  const ui = SpreadsheetApp.getUi();
  // createAddonMenu() shows under Extensions → Add-ons when installed as
  // an add-on; falls back to a top-level "Call Notes" menu when running
  // as a container-bound script (dev / local testing).
  const menu = (e && e.authMode === ScriptApp.AuthMode.NONE)
    ? ui.createMenu('Call Notes')
    : ui.createAddonMenu();
  CN_CONFIG.DEPARTMENTS.forEach(d => {
    menu.addItem('Email ' + d.label, 'menu_email_' + d.key);
  });
  menu.addSeparator();
  menu.addItem('Look up HCPCS code…', 'menu_lookupHcpcs');
  menu.addToUi();
}

// Per-department menu shims. Apps Script's menu API requires each item
// to point to a no-arg global function, so we generate one wrapper per
// department here rather than building them dynamically. If you add a
// new department to CN_CONFIG.DEPARTMENTS, add a matching menu_email_*
// wrapper below — onOpen will surface it automatically.
function menu_email_DEPT_A() { composeForDept_('DEPT_A'); }
function menu_email_DEPT_B() { composeForDept_('DEPT_B'); }
function menu_email_DEPT_C() { composeForDept_('DEPT_C'); }
function menu_lookupHcpcs()  { lookupHcpcsPrompt_(); }


// ════════════════════════════════════════════════════════════════════════════
//  SIDEBAR CARD  —  Workspace Add-on UX
// ════════════════════════════════════════════════════════════════════════════

function buildHomepageCard_() {
  const builder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('UMS Call Notes')
      .setSubtitle('Highlight a ' + CN_CONFIG.NOTE_TEMPLATE_ROWS + '×' +
                   CN_CONFIG.NOTE_TEMPLATE_COLS + ' note, then pick a department')
      .setImageStyle(CardService.ImageStyle.SQUARE));

  const deptSection = CardService.newCardSection().setHeader('Email Department');
  CN_CONFIG.DEPARTMENTS.forEach(d => {
    deptSection.addWidget(CardService.newTextButton()
      .setText('Email ' + d.label + (d.requiresExtraForm ? ' (form)' : ''))
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('card_composeForDept')
          .setParameters({ deptKey: d.key })
      )
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED));
  });
  builder.addSection(deptSection);

  const toolsSection = CardService.newCardSection().setHeader('Reference');
  toolsSection.addWidget(CardService.newTextButton()
    .setText('Look up HCPCS code')
    .setOnClickAction(CardService.newAction().setFunctionName('card_lookupHcpcs')));
  builder.addSection(toolsSection);

  return builder.build();
}

/** Card-action dispatcher — receives the deptKey via setParameters and
 *  delegates to the same composeForDept_ used by the menu items. */
function card_composeForDept(e) {
  const deptKey = e.parameters.deptKey;
  try {
    composeForDept_(deptKey);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Email composed for ' + deptKey))
      .build();
  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Failed: ' + err.message))
      .build();
  }
}

function card_lookupHcpcs(e) {
  lookupHcpcsPrompt_();
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText('Opened HCPCS lookup'))
    .build();
}


// ════════════════════════════════════════════════════════════════════════════
//  HANDLERS  —  shared business logic for both menu and card
//  ────────────────────────────────────────────────────────────────────────
//  STUBS: real bodies come from the existing call-template Apps Script
//  (to be pasted in for porting). The structure here just shows the
//  intended shape so the menu + card wiring is verifiable today.
// ════════════════════════════════════════════════════════════════════════════

function composeForDept_(deptKey) {
  const dept = CN_CONFIG.DEPARTMENTS.find(d => d.key === deptKey);
  if (!dept) throw new Error('Unknown department: ' + deptKey);

  const range = SpreadsheetApp.getActiveRange();
  const noteData = readNoteTemplate_(range);  // 2×7 grid → structured object

  let extra = null;
  if (dept.requiresExtraForm) {
    extra = promptForExtraDetails_(dept);   // null if user cancelled
    if (extra === null) return;
  }

  const body = formatEmailBody_(dept, noteData, extra);
  const subject = formatEmailSubject_(dept, noteData, extra);

  // Send via MailApp (immediate) for now — switch to GmailApp.createDraft
  // if reps need to review before send. The legacy script's behavior
  // (paste from menu) is closer to immediate-send, so default that way.
  MailApp.sendEmail({ to: dept.email, subject: subject, body: body });
}

/** Reads the highlighted 2×7 range into a structured object. Stub: just
 *  returns the raw values as a 2D array for now. Port: map cells to the
 *  team's canonical fields (date, caller, item, HCPCS code, qty, etc.). */
function readNoteTemplate_(range) {
  if (!range) throw new Error('Highlight your ' + CN_CONFIG.NOTE_TEMPLATE_ROWS + '×' +
                              CN_CONFIG.NOTE_TEMPLATE_COLS + ' note before picking a department.');
  const rows = range.getNumRows(), cols = range.getNumColumns();
  if (rows < CN_CONFIG.NOTE_TEMPLATE_ROWS || cols < CN_CONFIG.NOTE_TEMPLATE_COLS) {
    throw new Error('Highlighted range is ' + rows + '×' + cols + ', expected ' +
                    CN_CONFIG.NOTE_TEMPLATE_ROWS + '×' + CN_CONFIG.NOTE_TEMPLATE_COLS + '.');
  }
  // Stub return — replace with real field mapping during port.
  return {
    values: range.getValues(),
    a1: range.getA1Notation(),
  };
}

/** Stub: shows an HtmlService modal asking for the dept's extra fields,
 *  returns the user-entered object or null on cancel. Port: implement
 *  the real form per dept (different forms have different fields). */
function promptForExtraDetails_(dept) {
  const html = HtmlService.createHtmlOutput(
    '<p><b>TODO:</b> form for ' + dept.label + ' goes here.</p>' +
    '<p>This modal is a scaffold — the real form will collect the ' +
    'department-specific extra fields. Cancel to abort send.</p>'
  ).setWidth(420).setHeight(280);
  SpreadsheetApp.getUi().showModalDialog(html, 'Extra Details — ' + dept.label);
  // Stub: pretend the user submitted an empty form. Real port will use
  // google.script.run.withSuccessHandler from the modal to return data.
  return {};
}

function formatEmailSubject_(dept, noteData, extra) {
  // Stub — port should use the team's real subject conventions.
  return '[Call Notes] ' + dept.label + ' — ' + noteData.a1;
}

function formatEmailBody_(dept, noteData, extra) {
  // Stub — port should use the team's real body template.
  const lines = ['Call note from ' + getActiveUserEmail_() + ':', ''];
  noteData.values.forEach(row => lines.push(row.join('\t')));
  if (extra && Object.keys(extra).length) {
    lines.push('', 'Extra details:');
    Object.keys(extra).forEach(k => lines.push('  ' + k + ': ' + extra[k]));
  }
  lines.push('', '— UMS Call Notes (automated)');
  return lines.join('\n');
}


// ── HCPCS reference lookup ──────────────────────────────────────────────

function lookupHcpcsPrompt_() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt('HCPCS Lookup', 'Enter HCPCS code:', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const code = String(resp.getResponseText() || '').trim().toUpperCase();
  if (!code) { ui.alert('No code entered.'); return; }
  const row = lookupHcpcs_(code);
  if (!row) { ui.alert('HCPCS code not found: ' + code); return; }
  ui.alert('HCPCS ' + code, JSON.stringify(row, null, 2), ui.ButtonSet.OK);
}

/** Reads the HCPCS reference sheet by ID and returns the row for the
 *  given code, or null if not found. Stub: assumes the reference sheet
 *  has headers in row 1 and the code lives in column A. Port can wire
 *  this up to the real columns. */
function lookupHcpcs_(code) {
  const ss = getHcpcsRefSS_();
  const sheet = ss.getSheets()[0];
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return null;
  const headers = rows[0].map(h => String(h).trim());
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toUpperCase() === code) {
      const obj = {};
      headers.forEach((h, j) => { obj[h] = rows[i][j]; });
      return obj;
    }
  }
  return null;
}


// ════════════════════════════════════════════════════════════════════════════
//  PRIVATE HELPERS
// ════════════════════════════════════════════════════════════════════════════

function getHcpcsRefSS_() {
  // Script Properties precedence — same pattern as web-app/Code.js's
  // getAdpSS_(). Set HCPCS_REF_SS_ID in Apps Script editor → Project
  // Settings → Script Properties; the placeholder in CN_CONFIG is inert.
  const id = PropertiesService.getScriptProperties().getProperty('HCPCS_REF_SS_ID')
          || CN_CONFIG.HCPCS_REF_SS_ID;
  return SpreadsheetApp.openById(id);
}

/** Mirrors web-app/Code.js getActiveUserEmail_ — the _TEST_OVERRIDE_EMAIL
 *  global lets unit tests impersonate any user without going through real
 *  Workspace auth. Production code reads Session.getActiveUser(). */
function getActiveUserEmail_() {
  if (typeof _TEST_OVERRIDE_EMAIL !== 'undefined' && _TEST_OVERRIDE_EMAIL) {
    return String(_TEST_OVERRIDE_EMAIL).toLowerCase();
  }
  return Session.getActiveUser().getEmail().toLowerCase();
}
