// --- Configuration for Update Order Emails ---
const UPDATE_ORDER_CONFIG = {
  LOGO_URL: "https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/UMS%20Presentation%20Logo.jpg",
  BACKGROUND_IMAGE_URL: "https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/Patient%20Portal%20Background_portrait.png",
  HEADER_COLOR: "#223b5d",
  HEADER_TEXT_COLOR: "#ffffff"
};

function createUpdateOrderEmail() {
  const ui = SpreadsheetApp.getUi();
  const range = SpreadsheetApp.getActiveRange();
  if (range.getNumRows() !== 7 || range.getNumColumns() !== 2) {
    ui.alert('Selection Error', 'Please highlight a note template (2x7 range of cells) before running.', ui.ButtonSet.OK);
    return;
  }
  
  const values = range.getValues();
  
  // --- SMART PATIENT NAME LOGIC ---
  const callerName = values[1][1];
  const relationship = String(values[2][1]).trim().toLowerCase(); 
  let patientAndTrx = String(values[3][1]).trim(); 

  const isOnlyNumber = /^[\d\s#]+$/.test(patientAndTrx);

  if (relationship === 'self' && isOnlyNumber) {
     patientAndTrx = `${callerName} ${patientAndTrx}`;
  }

  // --- MISSING TRX CHECK ---
  if (!/\d/.test(patientAndTrx)) {
     const promptResult = ui.prompt(
       '⚠️ Missing TRX Number',
       'The system could not detect a TRX # in the note.\n\n' +
       '• To ADD one: Type it below and click OK.\n' +
       '• To CONTINUE without one: Leave blank and click OK.',
       ui.ButtonSet.OK_CANCEL
     );

     if (promptResult.getSelectedButton() == ui.Button.OK) {
        const inputTrx = promptResult.getResponseText().trim();
        if (inputTrx) {
           patientAndTrx = `${patientAndTrx} ${inputTrx}`;
        }
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

// --- WRAPPERS ---
function generateUpdateOrderPreviewWrapper(formData) {
  return generatePreviewHtml(formData);
}

function sendUpdateOrderEmailWrapper(formData) {
  sendFinalEmail(formData);
}

// --- HELPER: Construct Dynamic Subject Line ---
function buildSubjectLine(selections, patientName) {
  let subjectUpdate = selections.updateInfo;

  if (!subjectUpdate || subjectUpdate.trim() === "") {
      subjectUpdate = "Update";
  }
  
  if (subjectUpdate.toLowerCase() === 'close order') subjectUpdate = "Close Order";
  if (subjectUpdate.toLowerCase() === 'verified shipping') subjectUpdate = "Verified Shipping";
  if (subjectUpdate.toLowerCase() === 'oop order') subjectUpdate = "OOP Order"; 
  
  if (subjectUpdate.toLowerCase() === 'repeat resupply' && selections.resupplyDetails) {
      const details = selections.resupplyDetails;
      const cat = details.itemCategory;
      const month = details.resupplyMonth; 
      const dob = details.dob; 

      let prefix = (cat === 'Other') ? "" : `${cat} `; 
      let middle = (month) ? `${month} ` : "";

      subjectUpdate = `${prefix}${middle}Resupply`.trim();
      subjectUpdate = subjectUpdate.charAt(0).toUpperCase() + subjectUpdate.slice(1);

      let fullSubject = `${subjectUpdate}: ${patientName}`;
      if (dob) fullSubject += `, DOB: ${dob}`;
      return fullSubject;
  } 
  
  return `${subjectUpdate}: ${patientName}`;
}

function generatePreviewHtml(formData) {
  const callData = formData.callData; 
  const selections = formData.selections;

  const fromEmail = Session.getActiveUser().getEmail();
  const ccEmail = "robin.choudhury@universalmedsupply.com";
  
  const subject = buildSubjectLine(selections, callData.patientAndTrx);
  
  const recipientEmails = selections.departments.map(dept => {
    const cleanDept = dept.trim(); 
    if (cleanDept === 'Other') {
      return selections.individualEmail; 
    }
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

// --- HELPER: Generate Resolution Note Text ---
function generateOOPResolutionText(selections) {
  const oop = selections.oopDetails;
  const ship = selections.shippingDetails;
  
  let paymentStatus = "Need to Collect Total";
  if (ship.patResp === "Collected") {
      paymentStatus = "Collected Total";
  } else if (ship.patResp === "N/A") {
      paymentStatus = "Total (N/A)";
  }

  // Line 1
  let text = `OOP Order Processed`;
  
  // Line 2 (Updated Label to Est. Sales Tax)
  // oop.taxAmt will now be "0.00 (Rx Exempt)" or a dollar amount
  text += `\n${paymentStatus}: $${oop.totalCost} (Base: $${oop.baseCost} + Est. Sales Tax: ${oop.taxAmt.startsWith('$') ? oop.taxAmt : '$' + oop.taxAmt} + Ship: $${oop.shippingCost})`;
  
  // Line 3
  text += `\nVerified Addr: ${ship.verifiedAddr ? "Yes" : "No"}`;
  if (ship.verifiedAddrText) text += ` (${ship.verifiedAddrText})`;
  
  text += ` | Loc: ${ship.patientLoc}`;
  text += ` | Docs: ${ship.docsTo}`;
  if (ship.deliveryEmail) text += ` (${ship.deliveryEmail})`;
  
  // Line 4
  if (ship.specialNote) {
      text += `\nNote: ${ship.specialNote}`;
  }
  
  return text;
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
    if (cleanDept === 'Other') {
       return selections.individualEmail;
    }
    return departmentEmails[cleanDept];
  });

  if (recipientEmails.includes(undefined) || recipientEmails.includes("")) {
    throw new Error("One or more selected recipients are invalid.");
  }

  const recipients = recipientEmails.join(',');

  const emailArgs = {
    to: recipients,
    cc: "robin.choudhury@universalmedsupply.com",
    subject: subject,
    htmlBody: buildUpdateEmailBody(callData, selections)
  };
  
  MailApp.sendEmail(emailArgs);
  
  // --- WRITE-BACK TO SHEET FOR OOP ORDERS ---
  if (selections.updateInfo === 'OOP Order' && selections.oopDetails && selections.shippingDetails) {
     try {
       const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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

function showUpdateOrderFailureDialog(errorMessage) {
  const ui = SpreadsheetApp.getUi();
  ui.alert('Error', errorMessage, ui.ButtonSet.OK);
}

function formatPhoneNumber(input) {
  if (!input) return "";
  let digits = input.toString().replace(/\D/g, '');
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

function buildUpdateEmailBody(callData, selections) {
  let updateInfo = selections.updateInfo; 
  if (updateInfo.toLowerCase() === 'close order') updateInfo = 'Close Order';
  if (updateInfo.toLowerCase() === 'verified shipping') updateInfo = 'Verified Shipping';
  if (updateInfo.toLowerCase() === 'repeat resupply') updateInfo = 'Repeat Resupply';
  if (updateInfo.toLowerCase() === 'oop order') updateInfo = 'OOP Order'; 

  const callbackNeeded = selections.callbackNeeded;
  const shippingDetails = selections.shippingDetails; 
  const closeDetails = selections.closeDetails;
  const resupplyDetails = selections.resupplyDetails; 
  const oopDetails = selections.oopDetails; 

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
    
    // Create Map Link if address exists
    let mapLink = "";
    if (shippingDetails.verifiedAddrText) {
        const encodedAddr = encodeURIComponent(shippingDetails.verifiedAddrText);
        // Official Google Maps Search URL
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
    // Check if taxAmt already has a '$' (custom text) or needs formatting
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
  let resolutionText = callData.resolution; // Default to existing sheet data

  // If OOP Order, overwrite resolution with the generated summary
  if (updateInfo === 'OOP Order' && oopDetails && shippingDetails) {
      // Replace newlines with <br> for HTML display in email
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