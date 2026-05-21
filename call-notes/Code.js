// ════════════════════════════════════════════════════════════════════════════
//  UMS CALL NOTES  —  Code.gs
//   Workspace Add-on that runs inside each rep's call-template Google Sheet.
//   Replaces the legacy "CSR Tools" library (script ID
//   1DCxq0OPsHtGBBuuHAcFlslxJymO_3fAgmPnWQOh2NirFgkLAKIUm01qd) with a
//   single-install Workspace Marketplace deployment — no per-rep bound-
//   script shim required.
//
//   Dual UX preserved:
//     1. Custom menu via onOpen simple trigger ("CSR Tools" → Update Order,
//        Special → OOP Order; plus auto-navigation to today's column on
//        sheet open) — matches the legacy library exactly.
//     2. Sidebar card via onSheetsHomepage (newer Workspace Add-on UX);
//        same two actions surfaced as filled buttons.
//   Both surfaces invoke the same handler functions.
//
//   Behavior parity with legacy library: 2×7 highlighted range schema,
//   smart "self"-relationship patient-name logic, missing-TRX prompt,
//   multi-recipient department selection with "Other" override, dynamic
//   update-type datalist by department, conditional Verified Shipping /
//   Repeat Resupply / Close Order / OOP Order subforms, state tax calc,
//   MailApp send from the rep's account, OOP write-back to resolution
//   cell — all unchanged.
// ════════════════════════════════════════════════════════════════════════════

const CN_CONFIG = {
  // Cell range expected to be highlighted before any action runs.
  NOTE_TEMPLATE_ROWS: 7,  // rows in the 2×7 (7 fields stacked)
  NOTE_TEMPLATE_COLS: 2,  // cols (label | value)

  // CC on every outbound email. Mirrors legacy hardcoded recipient.
  CC_EMAIL: 'robin.choudhury@universalmedsupply.com',

  // Forward-looking: HCPCS reference sheet ID, set via Script Properties.
  // Not wired into any handler yet; preserved for future expansion.
  HCPCS_REF_SS_ID: 'YOUR_HCPCS_REFERENCE_SPREADSHEET_ID',
};

// Department → email recipient. Selected via multi-pick in UpdateOrderForm.html.
// "Other" is handled inline in the form (user types one or more addresses).
const departmentEmails = {
  'Sales':            'sales@universalmedsupply.com',
  'Eligibility MM&R': 'eligibility@universalmedsupply.com',
  'Manual Mobility':  'patientintake@universalmedsupply.com',
  'Resupply':         'resupply@universalmedsupply.com',
  'Power':            'power@universalmedsupply.com',
  'Field Ops':        'routing@universalmedsupply.com',
  'Service':          'service@universalmedsupply.com',
  'Billing':          'billing@universalmedsupply.com',
  'Denials':          'denials@universalmedsupply.com',
  'CSR':              'robin.choudhury@universalmedsupply.com',
  'Spanish':          'spanishcalls@universalmedsupply.com',
};

const UPDATE_ORDER_CONFIG = {
  LOGO_URL: "https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/UMS%20Presentation%20Logo.jpg",
  BACKGROUND_IMAGE_URL: "https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/Patient%20Portal%20Background_portrait.png",
  HEADER_COLOR: "#223b5d",
  HEADER_TEXT_COLOR: "#ffffff"
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

/**
 * Simple-trigger custom menu + same-day column auto-navigation.
 * Mirrors legacy menuCSRtools.js onOpen exactly: menu first (so it
 * appears even if date-nav fails), then date-nav inside a try/catch.
 *
 * Menu uses createAddonMenu() when installed as an Add-on (production
 * deployment); falls back to createMenu() in container-bound dev mode
 * so it still works during local testing.
 */
function onOpen(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // --- 1. MENU CREATION (FIRST so it appears even if the nav block fails) ---
  const menu = (e && e.authMode === ScriptApp.AuthMode.NONE)
    ? ui.createMenu('CSR Tools')
    : ui.createAddonMenu();
  menu.addItem('Update Order', 'createUpdateOrderEmail')
      .addSubMenu(ui.createMenu('Special')
          .addItem('OOP Order', 'createOOPOrderEmail'))
      .addToUi();

  // --- 2. DATE NAVIGATION LOGIC ---
  try {
    const today = new Date();

    // Format the current date to match the sheet name format (e.g., "JUL '25")
    const month = today.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const year = today.getFullYear().toString().slice(-2);
    const sheetName = `${month} '${year}`;

    // Find and activate the sheet for the current month
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      console.warn(`Sheet named "${sheetName}" was not found.`);
      return;  // Stops here, but the menu is already created
    }
    sheet.activate();

    // Find the column with today's date in the first row
    today.setHours(0, 0, 0, 0);
    const todayValue = today.getTime();

    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    const headerValues = headerRange.getValues()[0];

    let targetColumn = -1;
    for (let i = 0; i < headerValues.length; i++) {
      const cellValue = headerValues[i];
      if (cellValue instanceof Date) {
        cellValue.setHours(0, 0, 0, 0);
        if (cellValue.getTime() === todayValue) {
          targetColumn = i + 1;
          break;
        }
      }
    }

    if (targetColumn !== -1) {
      sheet.getRange(1, targetColumn).activate();
    }
  } catch (err) {
    // Navigation crash never breaks the sheet load — menu is already in
    console.error("Error in auto-navigation: " + err.message);
  }
}


// ════════════════════════════════════════════════════════════════════════════
//  SIDEBAR CARD  —  Workspace Add-on UX
// ════════════════════════════════════════════════════════════════════════════

function buildHomepageCard_() {
  const builder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('CSR Tools')
      .setSubtitle('Highlight a 2×7 note before clicking an action'));

  const mainSection = CardService.newCardSection().setHeader('Email Department');
  mainSection.addWidget(CardService.newTextButton()
    .setText('Update Order')
    .setOnClickAction(CardService.newAction().setFunctionName('card_updateOrder'))
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED));
  builder.addSection(mainSection);

  const specialSection = CardService.newCardSection().setHeader('Special');
  specialSection.addWidget(CardService.newTextButton()
    .setText('OOP Order')
    .setOnClickAction(CardService.newAction().setFunctionName('card_oopOrder')));
  builder.addSection(specialSection);

  return builder.build();
}

/** Card-action dispatcher — opens the Update Order modal via the same
 *  function the menu item calls. CardService action handlers can invoke
 *  SpreadsheetApp.getUi().showModalDialog() against the host sheet. */
function card_updateOrder(e) {
  try {
    createUpdateOrderEmail();
    return CardService.newActionResponseBuilder().build();
  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Failed: ' + err.message))
      .build();
  }
}

function card_oopOrder(e) {
  try {
    createOOPOrderEmail();
    return CardService.newActionResponseBuilder().build();
  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Failed: ' + err.message))
      .build();
  }
}


// ════════════════════════════════════════════════════════════════════════════
//  EMAIL FLOWS  —  ported verbatim from legacy library
// ════════════════════════════════════════════════════════════════════════════

function createUpdateOrderEmail() {
  const ui = SpreadsheetApp.getUi();
  const range = SpreadsheetApp.getActiveRange();
  if (range.getNumRows() !== 7 || range.getNumColumns() !== 2) {
    ui.alert('Selection Error', 'Please highlight a note template (2x7 range of cells) before running.', ui.ButtonSet.OK);
    return;
  }

  const values = range.getValues();

  // --- SMART PATIENT NAME LOGIC ---
  // If the caller IS the patient ("self") and the patient/TRX cell is just
  // a TRX number, prepend the caller's name so downstream emails / subject
  // lines have a usable identifier.
  const callerName = values[1][1];
  const relationship = String(values[2][1]).trim().toLowerCase();
  let patientAndTrx = String(values[3][1]).trim();

  const isOnlyNumber = /^[\d\s#]+$/.test(patientAndTrx);

  if (relationship === 'self' && isOnlyNumber) {
    patientAndTrx = `${callerName} ${patientAndTrx}`;
  }

  // --- MISSING TRX CHECK ---
  // Block the form open if no digits at all were detected in the
  // patient/TRX cell — the rep gets a chance to add one inline or
  // proceed deliberately.
  if (!/\d/.test(patientAndTrx)) {
    const promptResult = ui.prompt(
      '⚠️ Missing TRX Number',
      'The system could not detect a TRX # in the note.\n\n' +
      '• To ADD one: Type it below and click OK.\n' +
      '• To CONTINUE without one: Leave blank and click OK.',
      ui.ButtonSet.OK_CANCEL
    );

    if (promptResult.getSelectedButton() === ui.Button.OK) {
      const inputTrx = promptResult.getResponseText().trim();
      if (inputTrx) patientAndTrx = `${patientAndTrx} ${inputTrx}`;
    } else {
      return;
    }
  }

  const callData = {
    callBackNumber: formatPhoneNumber(values[0][1]),
    callerName: callerName,
    relationship: values[2][1],
    patientAndTrx: patientAndTrx,
    issue: values[4][1],
    transferredTo: values[5][1],
    resolution: values[6][1]
  };

  const htmlTemplate = HtmlService.createTemplateFromFile('UpdateOrderForm');
  htmlTemplate.callData = callData;
  htmlTemplate.config = UPDATE_ORDER_CONFIG;
  htmlTemplate.initialState = null;

  const htmlOutput = htmlTemplate.evaluate().setWidth(600).setHeight(700);
  ui.showModalDialog(htmlOutput, 'Update Order Details');
}

function createOOPOrderEmail() {
  const ui = SpreadsheetApp.getUi();
  const range = SpreadsheetApp.getActiveRange();

  if (range.getNumRows() !== 7 || range.getNumColumns() !== 2) {
    ui.alert('Selection Error', 'Please highlight a note template (2x7 range of cells) before running.', ui.ButtonSet.OK);
    return;
  }

  const values = range.getValues();

  const callerName = values[1][1];
  const relationship = String(values[2][1]).trim().toLowerCase();
  let patientAndTrx = String(values[3][1]).trim();
  const isOnlyNumber = /^[\d\s#]+$/.test(patientAndTrx);

  if (relationship === 'self' && isOnlyNumber) {
    patientAndTrx = `${callerName} ${patientAndTrx}`;
  }

  const callData = {
    callBackNumber: formatPhoneNumber(values[0][1]),
    callerName: callerName,
    relationship: values[2][1],
    patientAndTrx: patientAndTrx,
    issue: values[4][1],
    transferredTo: values[5][1],
    resolution: values[6][1]
  };

  const htmlTemplate = HtmlService.createTemplateFromFile('UpdateOrderForm');
  htmlTemplate.callData = callData;
  htmlTemplate.config = UPDATE_ORDER_CONFIG;

  // Pre-populate the form for the OOP variant: departments preselected,
  // update type fixed to "OOP Order", which auto-reveals both the OOP
  // subform AND the Verified Shipping subform via checkConditionalLogic.
  htmlTemplate.initialState = {
    mode: "OOP Order",
    departments: ["Eligibility MM&R", "Manual Mobility", "Field Ops"],
    overwriteResolution: true
  };

  const htmlOutput = htmlTemplate.evaluate().setWidth(600).setHeight(700);
  ui.showModalDialog(htmlOutput, 'Update Order Details (OOP)');
}


// ════════════════════════════════════════════════════════════════════════════
//  PREVIEW / SEND  —  wrappers retained at legacy names because
//  UpdateOrderForm.html invokes them via google.script.run by name.
// ════════════════════════════════════════════════════════════════════════════

function generateUpdateOrderPreviewWrapper(formData) {
  return generatePreviewHtml(formData);
}

function sendUpdateOrderEmailWrapper(formData) {
  sendFinalEmail(formData);
}

function showUpdateOrderFailureDialog(errorMessage) {
  const ui = SpreadsheetApp.getUi();
  ui.alert('Error', errorMessage, ui.ButtonSet.OK);
}

function generatePreviewHtml(formData) {
  const callData = formData.callData;
  const selections = formData.selections;

  const fromEmail = getActiveUserEmail_();
  const ccEmail = CN_CONFIG.CC_EMAIL;

  const subject = buildSubjectLine(selections, callData.patientAndTrx);

  const recipientEmails = selections.departments.map(dept => {
    const cleanDept = dept.trim();
    if (cleanDept === 'Other') return selections.individualEmail;
    return departmentEmails[cleanDept] || "";
  });

  const validEmails = recipientEmails.filter(email => email && email.length > 0);
  const toEmails = validEmails.join(', ');

  const previewHeaderHtml = `
    <div style="font-size: 13px; color: #5f6368; background-color: #f1f3f4; padding: 12px 15px; border-bottom: 1px solid #dadce0; border-radius: 8px 8px 0 0;">
      <p style="margin: 3px 0;"><strong>From:</strong> ${fromEmail}</p>
      <p style="margin: 3px 0;"><strong>To:</strong> ${toEmails}</p>
      <p style="margin: 3px 0;"><strong>CC:</strong> ${ccEmail}</p>
      <p style="margin: 3px 0;"><strong>Subject:</strong> ${subject}</p>
    </div>
  `;

  const emailBodyHtml = buildUpdateEmailBody(callData, selections);

  return previewHeaderHtml + emailBodyHtml;
}

function sendFinalEmail(formData) {
  const callData = formData.callData;
  const selections = formData.selections;

  if (!selections.departments || selections.departments.length === 0) {
    throw new Error("No recipient selected.");
  }

  const subject = buildSubjectLine(selections, callData.patientAndTrx);

  const recipientEmails = selections.departments.map(dept => {
    const cleanDept = dept.trim();
    if (cleanDept === 'Other') return selections.individualEmail;
    return departmentEmails[cleanDept];
  });

  if (recipientEmails.includes(undefined) || recipientEmails.includes("")) {
    throw new Error("One or more selected recipients are invalid.");
  }

  const recipients = recipientEmails.join(',');

  MailApp.sendEmail({
    to: recipients,
    cc: CN_CONFIG.CC_EMAIL,
    subject: subject,
    htmlBody: buildUpdateEmailBody(callData, selections)
  });

  // --- WRITE-BACK TO SHEET FOR OOP ORDERS ---
  // Overwrites the highlighted note's Resolution cell (row 7, col 2) with
  // a generated summary line so the in-sheet record reflects the OOP
  // breakdown that just went out. Wrapped in try/catch — the email send
  // is the source of truth; write-back failure is a soft warning.
  if (selections.updateInfo === 'OOP Order' && selections.oopDetails && selections.shippingDetails) {
    try {
      const range = SpreadsheetApp.getActiveRange();
      if (range.getNumRows() === 7 && range.getNumColumns() === 2) {
        const resolutionCell = range.getCell(7, 2);
        const newResolutionText = generateOOPResolutionText(selections);
        resolutionCell.setValue(newResolutionText);
      }
    } catch (e) {
      console.error("Failed to update resolution cell: " + e.message);
    }
  }

  const successMessage = `Email sent to ${selections.departments.join(', ')} ✅`;
  SpreadsheetApp.getActiveSpreadsheet().toast(successMessage, "Success!", 5);
}


// ════════════════════════════════════════════════════════════════════════════
//  EMAIL BUILDERS  —  subject line, OOP resolution text, full HTML body
// ════════════════════════════════════════════════════════════════════════════

function buildSubjectLine(selections, patientName) {
  let subjectUpdate = selections.updateInfo;

  if (!subjectUpdate || subjectUpdate.trim() === "") subjectUpdate = "Update";

  // Title-case the canonical update types so the subject always reads cleanly
  if (subjectUpdate.toLowerCase() === 'close order')      subjectUpdate = "Close Order";
  if (subjectUpdate.toLowerCase() === 'verified shipping') subjectUpdate = "Verified Shipping";
  if (subjectUpdate.toLowerCase() === 'oop order')        subjectUpdate = "OOP Order";

  // Repeat Resupply: enrich the subject with category + month + DOB
  if (subjectUpdate.toLowerCase() === 'repeat resupply' && selections.resupplyDetails) {
    const details = selections.resupplyDetails;
    const cat = details.itemCategory;
    const month = details.resupplyMonth;
    const dob = details.dob;

    const prefix = (cat === 'Other') ? "" : `${cat} `;
    const middle = (month) ? `${month} ` : "";

    subjectUpdate = `${prefix}${middle}Resupply`.trim();
    subjectUpdate = subjectUpdate.charAt(0).toUpperCase() + subjectUpdate.slice(1);

    let fullSubject = `${subjectUpdate}: ${patientName}`;
    if (dob) fullSubject += `, DOB: ${dob}`;
    return fullSubject;
  }

  return `${subjectUpdate}: ${patientName}`;
}

function generateOOPResolutionText(selections) {
  const oop = selections.oopDetails;
  const ship = selections.shippingDetails;

  let paymentStatus = "Need to Collect Total";
  if (ship.patResp === "Collected")  paymentStatus = "Collected Total";
  else if (ship.patResp === "N/A")    paymentStatus = "Total (N/A)";

  // Line 1
  let text = `OOP Order Processed`;

  // Line 2 — oop.taxAmt may already include "(Rx Exempt)" or be a number
  text += `\n${paymentStatus}: $${oop.totalCost} (Base: $${oop.baseCost} + Est. Sales Tax: ${oop.taxAmt.startsWith('$') ? oop.taxAmt : '$' + oop.taxAmt} + Ship: $${oop.shippingCost})`;

  // Line 3
  text += `\nVerified Addr: ${ship.verifiedAddr ? "Yes" : "No"}`;
  if (ship.verifiedAddrText) text += ` (${ship.verifiedAddrText})`;
  text += ` | Loc: ${ship.patientLoc}`;
  text += ` | Docs: ${ship.docsTo}`;
  if (ship.deliveryEmail) text += ` (${ship.deliveryEmail})`;

  // Line 4
  if (ship.specialNote) text += `\nNote: ${ship.specialNote}`;

  return text;
}

function buildUpdateEmailBody(callData, selections) {
  let updateInfo = selections.updateInfo;
  if (updateInfo.toLowerCase() === 'close order')      updateInfo = 'Close Order';
  if (updateInfo.toLowerCase() === 'verified shipping') updateInfo = 'Verified Shipping';
  if (updateInfo.toLowerCase() === 'repeat resupply')   updateInfo = 'Repeat Resupply';
  if (updateInfo.toLowerCase() === 'oop order')         updateInfo = 'OOP Order';

  const callbackNeeded   = selections.callbackNeeded;
  const shippingDetails  = selections.shippingDetails;
  const closeDetails     = selections.closeDetails;
  const resupplyDetails  = selections.resupplyDetails;
  const oopDetails       = selections.oopDetails;

  let callbackHtml = '';
  if (callbackNeeded) {
    callbackHtml = `<div style="background:#fff7cc; color:#333; padding:12px; border:1px solid #ffe58f; margin: 15px 0; border-radius: 4px;"><span style="font-weight:bold;">☎️ Callback Requested</span></div>`;
  }

  const boxStyle = "background:#e6f2ff; border:1px solid #cce5ff; padding:12px; margin: 15px 0; border-radius: 4px; font-size: 16px;";
  const darkBlue = "#0056b3";
  const red = "#cf1322";

  let updateLineHtml = '';

  if (updateInfo === 'Close Order' && closeDetails) {
    updateLineHtml = `
      <span style="font-weight:bold; color: ${darkBlue};">Update: </span>
      <span style="font-weight:bold; color: ${red};">Close Order</span>
      <span style="font-weight:bold; color: ${darkBlue};"> - ${closeDetails.reason}</span>
    `;
  } else if (updateInfo === 'OOP Order' && oopDetails) {
    updateLineHtml = `
      <span style="font-weight:bold; color: ${darkBlue};">Update: </span>
      <span style="font-weight:bold; color: #d46b08;">OOP Order</span>
      <span style="font-weight:bold; color: ${darkBlue};"> - Total: $${oopDetails.totalCost}</span>
    `;
  } else {
    updateLineHtml = `
      <span style="font-weight:bold; color: ${darkBlue};">Update: </span>
      <span style="font-weight:bold; color: #333;">${updateInfo}</span>
    `;
  }

  // --- Verified Shipping HTML ---
  let shippingHtml = '';
  if (shippingDetails) {
    const verifiedDisplay = shippingDetails.verifiedAddr
      ? `✅ Yes: <span style="font-weight:normal;">${shippingDetails.verifiedAddrText}</span>`
      : "❌ No";

    let mapLink = "";
    if (shippingDetails.verifiedAddrText) {
      const encodedAddr = encodeURIComponent(shippingDetails.verifiedAddrText);
      mapLink = ` <a href="https://www.google.com/maps/search/?api=1&query=$${encodedAddr}" target="_blank" style="text-decoration:none; font-size:0.9em;">📍 View Map</a>`;
    }

    const docsToDisplay = (shippingDetails.docsTo === 'Email' && shippingDetails.deliveryEmail)
      ? `Email: <span style="font-weight:normal;">${shippingDetails.deliveryEmail}</span>`
      : shippingDetails.docsTo;

    const noteRow = shippingDetails.specialNote
      ? `<tr><td style="padding: 5px 0; font-weight: bold;">Note:</td><td style="padding: 5px 0; font-style: italic;">${shippingDetails.specialNote}</td></tr>`
      : "";

    shippingHtml = `
      <div style="background-color: #f6ffed; border: 1px solid #b7eb8f; padding: 15px; border-radius: 4px; margin: 15px 0;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #389e0d; border-bottom: 1px solid #b7eb8f; padding-bottom: 5px;">Verified Shipping Details</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
           <tr><td style="padding: 5px 0; font-weight: bold; width: 40%;">Verified Address?</td><td style="padding: 5px 0;">${verifiedDisplay}${mapLink}</td></tr>
           <tr><td style="padding: 5px 0; font-weight: bold;">Patient Location:</td><td style="padding: 5px 0;">${shippingDetails.patientLoc}</td></tr>
           <tr><td style="padding: 5px 0; font-weight: bold;">Docs To:</td><td style="padding: 5px 0;">${docsToDisplay}</td></tr>
           <tr><td style="padding: 5px 0; font-weight: bold;">Pat. Resp:</td><td style="padding: 5px 0;">${shippingDetails.patResp}</td></tr>
           ${noteRow}
        </table>
      </div>`;
  }

  // --- Repeat Resupply HTML ---
  let resupplyHtml = '';
  if (resupplyDetails) {
    const formattedPhone = formatProviderPhone(resupplyDetails.newMdoPh);
    const categoryDisplay = (resupplyDetails.itemCategory === 'Other') ? "Resupply" : resupplyDetails.itemCategory;
    const itemsQtyDisplay = resupplyDetails.sameItems ? "✅ Yes" : "❌ No";

    const addrDisplay = (resupplyDetails.addrStatus === 'Different')
      ? `<span style="color:#d9534f;">New:</span> ${resupplyDetails.newAddr}`
      : "✅ Same as previous";

    const insDisplay = (resupplyDetails.insStatus === 'Changed')
      ? `<span style="color:#d9534f;">New:</span> ${resupplyDetails.newIns} (ID: ${resupplyDetails.newMemId})`
      : "✅ Same as previous";

    const provDisplay = (resupplyDetails.provStatus === 'Changed')
      ? `<span style="color:#d9534f;">New:</span> ${resupplyDetails.newProv} (Ph: ${formattedPhone})`
      : "✅ Same as previous";

    const rrNoteRow = resupplyDetails.specialNote
      ? `<tr><td style="padding: 5px 0; font-weight: bold;">Note:</td><td style="padding: 5px 0; font-style: italic;">${resupplyDetails.specialNote}</td></tr>`
      : "";

    const dobRow = resupplyDetails.dob
      ? `<tr><td style="padding: 5px 0; font-weight: bold;">D.O.B.:</td><td style="padding: 5px 0;">${resupplyDetails.dob}</td></tr>`
      : "";

    const monthRow = resupplyDetails.resupplyMonth
      ? `<tr><td style="padding: 5px 0; font-weight: bold;">Requesting Month:</td><td style="padding: 5px 0;">${resupplyDetails.resupplyMonth}</td></tr>`
      : "";

    resupplyHtml = `
      <div style="background-color: #f6ffed; border: 1px solid #b7eb8f; padding: 15px; border-radius: 4px; margin: 15px 0;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #389e0d; border-bottom: 1px solid #b7eb8f; padding-bottom: 5px;">Repeat Resupply Details</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
           <tr><td style="padding: 5px 0; font-weight: bold; width: 40%;">Item Category:</td><td style="padding: 5px 0;">${categoryDisplay}</td></tr>
           ${dobRow}
           ${monthRow}
           <tr><td style="padding: 5px 0; font-weight: bold;">Last Date Scheduled:</td><td style="padding: 5px 0;">${resupplyDetails.lastDate}</td></tr>
           <tr><td style="padding: 5px 0; font-weight: bold;">Items/Qty Same?</td><td style="padding: 5px 0;">${itemsQtyDisplay}</td></tr>
           <tr><td style="padding: 5px 0; font-weight: bold;">Verified Address?</td><td style="padding: 5px 0;">${addrDisplay}</td></tr>
           <tr><td style="padding: 5px 0; font-weight: bold;">Verified Insurance?</td><td style="padding: 5px 0;">${insDisplay}</td></tr>
           <tr><td style="padding: 5px 0; font-weight: bold;">Verified Provider?</td><td style="padding: 5px 0;">${provDisplay}</td></tr>
           ${rrNoteRow}
        </table>
      </div>`;
  }

  // --- OOP HTML ---
  let oopHtml = '';
  if (oopDetails) {
    let taxDisplay = oopDetails.taxAmt;
    if (!taxDisplay.toString().startsWith('$') && !isNaN(parseFloat(taxDisplay))) {
      taxDisplay = '$' + taxDisplay;
    }

    oopHtml = `
      <div style="background-color: #fff7e6; border: 1px solid #ffd591; padding: 15px; border-radius: 4px; margin: 15px 0;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #d46b08; border-bottom: 1px solid #ffd591; padding-bottom: 5px;">OOP Order Breakdown</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
           <tr><td style="padding: 5px 0; font-weight: bold; width: 40%;">Base Cost:</td><td style="padding: 5px 0;">$${oopDetails.baseCost}</td></tr>
           <tr><td style="padding: 5px 0; font-weight: bold;">Est. Sales Tax:</td><td style="padding: 5px 0;">${taxDisplay}</td></tr>
           <tr><td style="padding: 5px 0; font-weight: bold;">Shipping:</td><td style="padding: 5px 0;">$${oopDetails.shippingCost} <span style="font-size:0.85em; color:#666;">(${oopDetails.shippingLabel})</span></td></tr>
           <tr><td style="padding: 5px 0; font-weight: bold; border-top:1px solid #ffd591; margin-top:5px;">Total Customer Cost:</td><td style="padding: 5px 0; border-top:1px solid #ffd591; font-weight:bold;">$${oopDetails.totalCost}</td></tr>
        </table>
      </div>`;
  }

  // --- RESOLUTION TEXT LOGIC ---
  let resolutionText = callData.resolution;
  if (updateInfo === 'OOP Order' && oopDetails && shippingDetails) {
    resolutionText = generateOOPResolutionText(selections).replace(/\n/g, '<br>');
  }

  return `
    <div style="background-image: url('${UPDATE_ORDER_CONFIG.BACKGROUND_IMAGE_URL}'); background-color: #e9ecef; background-size: cover; padding: 40px; font-family: sans-serif;">
      <div style="background-color: rgba(255, 255, 255, 0.85); padding: 25px; border-radius: 8px;">
        <table style="width:100%; border-collapse:collapse; margin-bottom:15px;">
          <tr>
            <td style="width:60px; vertical-align:middle;"><img src="${UPDATE_ORDER_CONFIG.LOGO_URL}" alt="Company Logo" style="height:50px; display:block;"></td>
            <td style="vertical-align:middle; padding-left:15px;"><h2 style="margin:0; text-align:left; color:#333;">Update for ${callData.patientAndTrx}</h2></td>
          </tr>
        </table>
        <p>Hello Team, please see the following update for this order.</p>
        ${callbackHtml}

        <div style="${boxStyle}">
          ${updateLineHtml}
        </div>

        ${oopHtml}
        ${shippingHtml}
        ${resupplyHtml}

        <table style="border-collapse:collapse; width:100%; font-size:14px;">
          <tr style="background:${UPDATE_ORDER_CONFIG.HEADER_COLOR};"><td colspan="2" style="padding:10px; border:1px solid #ccc; text-align:center; font-weight:bold; color:${UPDATE_ORDER_CONFIG.HEADER_TEXT_COLOR};">Call Details</td></tr>
          <tr style="background:#ffffff;"><td style="padding:8px;border:1px solid #ddd;font-weight:bold;width:35%;">Callback Number:</td><td style="padding:8px;border:1px solid #ddd;">${callData.callBackNumber}</td></tr>
          <tr style="background:#f7f7f7;"><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Caller Name:</td><td style="padding:8px;border:1px solid #ddd;">${callData.callerName}</td></tr>
          <tr style="background:#ffffff;"><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Relationship:</td><td style="padding:8px;border:1px solid #ddd;">${callData.relationship}</td></tr>
          <tr style="background:#f7f7f7;"><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Patient Name & TRX:</td><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${callData.patientAndTrx}</td></tr>
          <tr style="background:#ffffff;"><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Issue:</td><td style="padding:8px;border:1px solid #ddd;">${callData.issue}</td></tr>
          <tr style="background:#f7f7f7;"><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Transferred to:</td><td style="padding:8px;border:1px solid #ddd;">${callData.transferredTo}</td></tr>
          <tr style="background:#ffffff;"><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Resolution:</td><td style="padding:8px;border:1px solid #ddd;">${resolutionText}</td></tr>
        </table>
      </div>
    </div>
  `;
}


// ════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════════════════════

function formatPhoneNumber(input) {
  if (!input) return "";
  const digits = input.toString().replace(/\D/g, '');
  if (digits.length >= 10) {
    const main = digits.substring(0, 10);
    const ext = digits.substring(10);
    const formattedMain = `(${main.slice(0,3)}) ${main.slice(3,6)}-${main.slice(6)}`;
    if (ext.length > 0) return `${formattedMain} x${ext}`;
    return formattedMain;
  }
  return input;
}

function formatProviderPhone(input) {
  if (!input) return "";
  let digits = input.toString().replace(/\D/g, '');
  let prefix = "";
  if (digits.length >= 11 && digits.startsWith('1')) {
    prefix = "1 ";
    digits = digits.substring(1);
  }
  if (digits.length >= 10) {
    const main = digits.substring(0, 10);
    const ext = digits.substring(10);
    const formattedMain = `${main.slice(0,3)}-${main.slice(3,6)}-${main.slice(6)}`;
    if (ext.length > 0) return `${prefix}${formattedMain} x${ext}`;
    return `${prefix}${formattedMain}`;
  }
  return input;
}

/** Same Script-Properties precedence pattern as web-app/Code.js's
 *  getAdpSS_(). Set HCPCS_REF_SS_ID in Apps Script editor → Project
 *  Settings → Script Properties; the placeholder in CN_CONFIG is
 *  inert. Currently no caller — preserved for future HCPCS lookup. */
function getHcpcsRefSS_() {
  const id = PropertiesService.getScriptProperties().getProperty('HCPCS_REF_SS_ID')
          || CN_CONFIG.HCPCS_REF_SS_ID;
  return SpreadsheetApp.openById(id);
}

/** Mirrors web-app/Code.js getActiveUserEmail_ — the _TEST_OVERRIDE_EMAIL
 *  global lets unit tests impersonate any user. Production reads
 *  Session.getActiveUser() (works in this Add-on context because the
 *  installing user IS the acting user). */
function getActiveUserEmail_() {
  if (typeof _TEST_OVERRIDE_EMAIL !== 'undefined' && _TEST_OVERRIDE_EMAIL) {
    return String(_TEST_OVERRIDE_EMAIL).toLowerCase();
  }
  return Session.getActiveUser().getEmail().toLowerCase();
}
