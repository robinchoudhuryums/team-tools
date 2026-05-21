function createCloseOrderEmail() { 
  const ui = SpreadsheetApp.getUi();

  // 1. Validate the selected range first.
  const range = SpreadsheetApp.getActiveRange();
  if (range.getNumRows() !== 7 || range.getNumColumns() !== 2) {
    ui.alert('Selection Error', 'Please highlight a 2x7 range of cells before running this command.', ui.ButtonSet.OK);
    return;
  }
  
  // 2. Get data from the spreadsheet.
  const values = range.getValues();
  const callData = {
    callBackNumber: formatPhoneNumber(values[0][1]),
    callerName: values[1][1],
    relationship: values[2][1],
    patientAndTrx: values[3][1],
    issue: values[4][1],
    transferredTo: values[5][1],
    resolution: values[6][1]
  };

  // 3. Show the initial input form with dropdowns.
  const htmlTemplate = HtmlService.createTemplateFromFile('UserInputForm');
  htmlTemplate.callData = callData;
  const htmlOutput = htmlTemplate.evaluate().setWidth(400).setHeight(300);
  ui.showModalDialog(htmlOutput, 'Select Reason and Department');
}

function processAndGeneratePreview(formData) {
  
  const departmentEmails = {
    'Sales': 'sales@universalmedsupply.com',
    'Manual Mobility': 'patientintake@universalmedsupply.com', 
    'Resupply': 'resupply@universalmedsupply.com',
    'Power': 'power@universalmedsupply.com',
    'Field Ops': 'routing@universalmedsupply.com',
    'Service': 'service@universalmedsupply.com',
    'CSR': 'robin.choudhury@universalmedsupply.com'
  };

  // Get the call data and selections from the formData object
  const callData = formData.callData; 
  const selections = formData.selections;


const selectedDept = selections.department.trim();
const recipient = departmentEmails[selectedDept];
  if (!recipient) {
    SpreadsheetApp.getUi().alert("Invalid department selected.");
    return;
  }
  
  // Assemble all email parts.
  const emailArgs = {
    recipient: recipient,
    ccRecipient: "robin.choudhury@universalmedsupply.com",
    subject: `Close Order: ${callData.patientAndTrx}`,
    htmlBody: buildHtmlBody(callData, selections.reason, callData.patientAndTrx) 
  };
  
  // Create and show the HTML preview dialog.
  const htmlTemplate = HtmlService.createTemplateFromFile('CloseEmailPreview');
  htmlTemplate.emailArgs = emailArgs; // Pass the data to the HTML file
  const htmlOutput = htmlTemplate.evaluate().setWidth(600).setHeight(450);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Email Preview');
}


function buildHtmlBody(callData, reason, patientInfo) {
  const logoUrl = "https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/UMS%20Presentation%20Logo.jpg"; // <-- LOGO URL
  const headerColor = "#223b5d";
  const headerTextColor = "#ffffff";

  return `
    <div style="font-family: sans-serif; font-size: 14px; color: #333;">
      <div style="text-align:left;">
        <img src="${logoUrl}" alt="Company Logo" style="height:50px;">
      </div>
      <h2 style="color: ${headerColor};">Order Close Request for ${patientInfo}</h2>
      <p>Hello Team,</p>
      <p>Please close the order for the following patient.</p>
      <div style="background:#e6f2ff; padding:10px; border:1px solid #ddd; margin: 15px 0;">
        <span style="font-weight:bold;">Reason for Close:</span> ${reason}
      </div>
      <table style="border-collapse:collapse; width:100%; font-size:14px;">
        <tr style="background:${headerColor};">
          <td colspan="2" style="padding:10px; border:1px solid #ccc; text-align:center; font-weight:bold; color:${headerTextColor};">
            Call Details
          </td>
        </tr>
        <tr style="background:#ffffff;"><td style="padding:8px;border:1px solid #ddd;font-weight:bold;width:50%;">Patient Name & TRX:</td><td style="padding:8px;border:1px solid #ddd;">${callData.patientAndTrx}</td></tr>
        <tr style="background:#e6f2ff;"><td style="padding:8px;border:1px solid #ddd;font-weight:bold;width:50%;">Caller Name:</td><td style="padding:8px;border:1px solid #ddd;">${callData.callerName}</td></tr>
        <tr style="background:#ffffff;"><td style="padding:8px;border:1px solid #ddd;font-weight:bold;width:50%;">Relationship:</td><td style="padding:8px;border:1px solid #ddd;">${callData.relationship}</td></tr>
        <tr style="background:#e6f2ff;"><td style="padding:8px;border:1px solid #ddd;font-weight:bold;width:50%;">Callback Number:</td><td style="padding:8px;border:1px solid #ddd;">${callData.callBackNumber}</td></tr>
        <tr style="background:#ffffff;"><td style="padding:8px;border:1px solid #ddd;font-weight:bold;width:50%;">Resolution:</td><td style="padding:8px;border:1px solid #ddd;">${callData.resolution}</td></tr>
      </table>
    </div>`;
}


function sendEmail(emailArgs) {
  if (!emailArgs || !emailArgs.recipient) {
    throw new Error("sendEmail function was called without the necessary email data.");
  }

    const message = {
    to: emailArgs.recipient,
    cc: emailArgs.ccRecipient,
    subject: emailArgs.subject,
    htmlBody: emailArgs.htmlBody,
    attachments: [] // Initialize attachments array
  };

   if (emailArgs.fileData && emailArgs.fileData.bytes) {
    const attachmentBlob = Utilities.newBlob(
      Utilities.base64Decode(emailArgs.fileData.bytes),
      emailArgs.fileData.mimeType,
      emailArgs.fileData.fileName
    );
    message.attachments.push(attachmentBlob);
  }

  // Using MailApp as a workaround for the GmailApp issue.
  MailApp.sendEmail(message);
}

function showSuccessToast() {
  const successMessage = `Email sent to ${selections.departments.join(', ')} ✅`;
  SpreadsheetApp.getActiveSpreadsheet().toast(successMessage, "Success!", 5);
}


function formatPhoneNumber(phoneString) {
  if (!phoneString) return phoneString;
  
  const cleaned = ('' + phoneString).replace(/\D/g, ''); // Remove all non-digit characters

  // Check for 11-digit number starting with '1'
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const match = cleaned.match(/^1(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '+1 (' + match[1] + ') ' + match[2] + '-' + match[3];
    }
  }

  // Check for 10-digit number
  if (cleaned.length === 10) {
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
  }

  return phoneString; // Return original if it doesn't match expected formats
}