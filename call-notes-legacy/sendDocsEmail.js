// ------------------------------
// 1. Start email process
// ------------------------------
function startDocumentEmailProcess() {
  const ui = SpreadsheetApp.getUi();
  const range = SpreadsheetApp.getActiveRange();
  
  if (range.getNumRows() !== 7 || range.getNumColumns() !== 2) {
    ui.alert('Selection Error', 'Please highlight a 2x7 range of cells before running.', ui.ButtonSet.OK);
    return;
  }

  const values = range.getValues();
  const callData = { patientAndTrx: values[3][1] };

  const htmlTemplate = HtmlService.createTemplateFromFile('DocsEmailForm');
  htmlTemplate.callData = callData;
  const htmlOutput = htmlTemplate.evaluate().setWidth(500).setHeight(480);
  ui.showModalDialog(htmlOutput, 'Email Details');
}

// ------------------------------
// 3. Show "Attach PDF" prompt
// ------------------------------
function processDocFormAndShowUpload(formData) {
  // Save formData globally
  PropertiesService.getUserProperties().setProperty('tempFormData', JSON.stringify(formData));

  const htmlTemplate = HtmlService.createTemplateFromFile('FileUploadForm');
  return htmlTemplate.evaluate()
    .setTitle("Attach PDF")
    .setWidth(450)
    .setHeight(300)
    .getContent();
}


// ------------------------------
// 4. Resources
// ------------------------------
const PATIENT_RESOURCES = [
  { text: 'Insurance Coverage for Power Mobility Devices', url: 'https://universalmedsupply.com/are-power-wheelchairs-covered-by-medicare-medicaid-or-private-health-insurance/', imageUrl: 'https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/a-woman-using-a-tdx-sp2-power-chair-laughs-in-a-cafe-with-her-friends-932.jpg' },
  { text: 'Explore Our Products', url: 'https://universalmedsupply.com/about/', imageUrl: 'https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/CPAP%20in%20use.jpg' },
  { text: 'Frequently Asked Questions', url: 'https://universalmedsupply.com/ums-blog/', imageUrl: 'https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/airfit-f10-full-face-cpap-mask-at-home-2.jpg?raw=true' }
];

const MDO_RESOURCES = [
  { text: 'Referral Forms', url: 'https://universalmedsupply.com/partners-clinicians/', imageUrl: 'https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/rx%20sending.jpg?raw=true' },
  { text: 'Products & Services', url: 'https://universalmedsupply.com/about/', imageUrl: 'https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/pt%20in%20pmd%20at%20home.jpg?raw=true' },
  { text: 'Contact Us', url: 'https://universalmedsupply.com/contact/', imageUrl: 'https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/contact%20us.jpg?raw=true' }
];

// ------------------------------
// 5. Process uploaded PDF and preview email
// ------------------------------
// Library function only processes the data given
function processFileUploadAndCreatePreview(fileUploadData) {
  // Retrieve the stored form selections
  const storedData = PropertiesService.getUserProperties().getProperty('tempFormData');
  if (!storedData) throw new Error("Session expired. Please restart the process.");

  const formData = JSON.parse(storedData);
  const selections = formData.selections;

  // Determine email body and resources based on recipient type
  let bodyText = "";
  let resources = [];

  if (selections.type === 'Patient') {
    bodyText = "Please see the attached document for your order, and let us know if we can assist further. Thank you!";
    resources = PATIENT_RESOURCES;
  } else {
    bodyText = "Please see the attached document for this patient's order, and let us know if we can assist further. Thank you!";
    resources = MDO_RESOURCES;
  }

  // Generate the actual email HTML body using DocsEmailTemplate.html
  const emailBodyTemplate = HtmlService.createTemplateFromFile('DocsEmailTemplate.html');
  emailBodyTemplate.logoUrl = "https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/UMS%20Presentation%20Logo.jpg";
  emailBodyTemplate.headerColor = "#223b5d";
  emailBodyTemplate.headerTextColor = "#ffffff";
  emailBodyTemplate.subject = "Documentation Request";
  emailBodyTemplate.bodyText = bodyText;
  emailBodyTemplate.signatureText = "UMS Patient Care Team";
  emailBodyTemplate.fileData = fileUploadData;
  emailBodyTemplate.resources = resources;

  const htmlBody = emailBodyTemplate.evaluate().getContent();

  // Pass selections + email body to the preview dialog (DocsEmailPreview.html)
  const previewTemplate = HtmlService.createTemplateFromFile('DocsEmailPreview.html');
  previewTemplate.emailArgs = {
    recipient: selections.recipient,
    ccRecipient: "robin.choudhury@universalmedsupply.com",
    subject: "Documentation Request",
    fileData: fileUploadData,
    htmlBody: htmlBody
  };

  // Return the preview dialog content
  return previewTemplate.evaluate()
    .setWidth(700)
    .setHeight(550)
    .getContent();
}




// Wrapper for library call
function processFileUploadAndCreatePreviewWrapper(fileUploadData) {
  return processFileUploadAndCreatePreview(fileUploadData);
}

// ------------------------------
// 6. Send email from preview
// ------------------------------
function sendEmailFromPreview(emailArgs) {
  const recipient = emailArgs.recipient;
  const subject = emailArgs.subject;
  const body = emailArgs.htmlBody;

  const options = { htmlBody: body, cc: emailArgs.ccRecipient };

  if (emailArgs.fileData && emailArgs.fileData.data) {
    const fileBlob = Utilities.newBlob(
      Utilities.base64Decode(emailArgs.fileData.data),
      emailArgs.fileData.mimeType,
      emailArgs.fileData.fileName
    );
    options.attachments = [fileBlob];
  }

  GmailApp.sendEmail(recipient, subject, '', options);
}

// Wrapper for library call
function sendEmailFromPreviewWrapper(emailArgs) {
  return sendEmailFromPreview(emailArgs);
}
