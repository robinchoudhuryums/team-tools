// --- Configuration for Account Creation Template ---
const AC_CONFIG = {
  SHEET_NAME: "PMD Account Creation Template",
  FORM_RANGE: "A2:B30",
  CLEAR_RANGE: "B3:B30",
  LANGUAGE_CELL: "A1",
  PATIENT_INFO_CELL: "B3",
  DOB_CELL: "B7",
  
  LOGO_URL: "https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/UMS%20Presentation%20Logo.jpg",
  BACKGROUND_IMAGE_URL: "https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/Patient%20Portal%20Background_portrait.png",
  
  DEFAULT_EMAIL: "sales@universalmedsupply.com",
  BCC_EMAIL: "robin.choudhury@universalmedsupply.com",
  
  HEADER_ROWS: [1, 8, 12, 22], 
  CHECKBOX_ROWS: [22, 24, 25],
  SECONDARY_QUESTION_ROWS: [2, 10, 19, 20, 23, 26, 28],

  TEAM_SPREADSHEET_ID: "11XtmVd6d94STWMyNViSYcd3P8goZBtY4S2hrZ7BDSEA", 
  TEAM_NAME_RANGE: "DO NOT EDIT!!G3:G",

};

// --- This function launches the entire process ---
function showAccountCreationDialog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // --- NEW VALIDATION CHECK ---
  const acSheet = ss.getSheetByName(AC_CONFIG.SHEET_NAME);
  const patientInfo = acSheet.getRange(AC_CONFIG.PATIENT_INFO_CELL).getValue();

  if (!patientInfo || patientInfo.toString().trim() === "") {
    SpreadsheetApp.getUi().alert(
      "⚠️ Missing Patient Information",
      `Please enter the Patient Name in cell ${AC_CONFIG.PATIENT_INFO_CELL} before generating the form.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return; // STOP execution here
  } 
  let teamNames = [];
  try {
    const teamSpreadsheet = SpreadsheetApp.openById(AC_CONFIG.TEAM_SPREADSHEET_ID);
    const teamSheet = teamSpreadsheet.getRange(AC_CONFIG.TEAM_NAME_RANGE).getDisplayValues();
    
    teamNames = teamSheet
      .flat()
      .filter(name => name) // Filter out any empty rows
      .map(name => {
        // KEY CHANGE: This line removes any text in parentheses, e.g., " (Akash)"
        return name.replace(/\s*\(.*\)\s*/g, ' ').trim(); 
      });

  } catch (e) {
    Logger.log("Could not fetch team names: " + e.message);
  }

  const htmlTemplate = HtmlService.createTemplateFromFile("AccountCreationDialog");
  htmlTemplate.formPreview = generateAccountCreationHtml();
  htmlTemplate.AC_CONFIG = AC_CONFIG;
  htmlTemplate.teamMembers = teamNames; // Pass the CLEANED list of names to the dialog

  const html = htmlTemplate.evaluate().setWidth(800).setHeight(650);
  SpreadsheetApp.getUi().showModalDialog(html, "Account Creation Form Preview & Send");
}

// --- This function is called from the dialog to send the email ---
// --- Updated Email Function with Image Support ---
function processAccountCreationEmail(recipientInfo) {
  // Use the calculated email passed from the frontend
  const recipientEmail = recipientInfo.useDefault ? AC_CONFIG.DEFAULT_EMAIL : recipientInfo.customEmail;

  if (!recipientEmail || !validateEmail(recipientEmail)) {
    throw new Error(`Invalid recipient email address provided: ${recipientEmail}`);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(AC_CONFIG.SHEET_NAME);
  const patientInfo = sheet.getRange(AC_CONFIG.PATIENT_INFO_CELL).getDisplayValue() || "(No patient name)";
  const dob = sheet.getRange(AC_CONFIG.DOB_CELL).getDisplayValue() || "(No DOB)";
  
  // 1. Get Base HTML
  let htmlBody = generateAccountCreationHtml();
  let inlineImagesObj = {};

  // 2. Process Multiple Images
  if (recipientInfo.images && recipientInfo.images.length > 0) {
    try {
      let imageSectionHtml = `
        <div style="margin-top: 20px; border-top: 2px dashed #ccc; padding-top: 20px; text-align: center;">
          <h3 style="color: #444;">Attached Images</h3>`;

      recipientInfo.images.forEach((base64String, index) => {
        // Create unique CID
        const cid = "attachedImage" + index; 
        
        // Decode
        const contentType = base64String.substring(5, base64String.indexOf(';'));
        const data = base64String.split(",")[1];
        const decoded = Utilities.base64Decode(data);
        const blob = Utilities.newBlob(decoded, contentType, cid);
        
        // Add to object
        inlineImagesObj[cid] = blob;
        
        // Add HTML tag
        imageSectionHtml += `<img src="cid:${cid}" style="max-width: 100%; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto;" />`;
      });

      imageSectionHtml += `</div>`;
      
      // Inject into HTML
      htmlBody = htmlBody.replace('</table></div></div>', '</table>' + imageSectionHtml + '</div></div>');

    } catch (e) {
      console.error("Error processing images: " + e.toString());
      htmlBody += `<p style="color:red; text-align:center;">(System Error attaching images: ${e.message})</p>`;
    }
  }

  MailApp.sendEmail({
    to: recipientEmail,
    bcc: AC_CONFIG.BCC_EMAIL,
    subject: `PMD Account Creation for ${patientInfo} ${dob}`,
    htmlBody: htmlBody,
    inlineImages: inlineImagesObj
  });

  sheet.getRange(AC_CONFIG.CLEAR_RANGE).clearContent();
  const successMessage = `PMD Account Creation form for ${patientInfo} emailed successfully! ✅`;
  SpreadsheetApp.getActiveSpreadsheet().toast(successMessage, "Success", 5);
}

// --- This helper function builds the HTML for the preview and email ---
function generateAccountCreationHtml() {
    // ... (This function remains the same as your current working version)
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(AC_CONFIG.SHEET_NAME);
    const patientName = sheet.getRange(AC_CONFIG.PATIENT_INFO_CELL).getDisplayValue() || "(No name)";
    const dob = sheet.getRange(AC_CONFIG.DOB_CELL).getDisplayValue() || "(No DOB)";
    const data = sheet.getRange(AC_CONFIG.FORM_RANGE).getDisplayValues();
    const englishQuestions = getAccountCreationEnglishQuestions();
    let html = `
    <div style="background-image: url('${AC_CONFIG.BACKGROUND_IMAGE_URL}'); background-color: #e9ecef; background-size: cover; padding: 50px; font-family: sans-serif;">
      <style> a, a:visited { color: #333333 !important; text-decoration: none !important; } </style>
      <div style="background-color: rgba(255, 255, 255, 0.85); padding: 20px; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <tr>
            <td style="width: 60px; vertical-align: middle;"><img src="${AC_CONFIG.LOGO_URL}" alt="Company Logo" style="height:50px; display: block;"></td>
            <td style="vertical-align: middle; padding-left: 15px;"><h2 style="margin: 0; text-align: left; color: #333;">PMD Account Creation Form for ${patientName} ${dob}</h2></td>
          </tr>
        </table>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
  `;
    const headerColor = "#223b5d";
    const headerTextColor = "#ffffff";
    data.forEach((row, i) => {
        const question = englishQuestions[i];
        const answer = row[1];
        let displayAnswer = "";
        if (AC_CONFIG.CHECKBOX_ROWS.includes(i)) {
            let checkColor = "#00875A";
            if (i === 22) {
                checkColor = "#FFC107";
            }
            if (answer === "TRUE") {
                displayAnswer = `<div style="width:16px; height:16px; border:1px solid #777; background-color:#fff; text-align:center; line-height:16px; font-weight:bold; color:${checkColor}; display:inline-block;">&#10003;</div>`;
            } else {
                displayAnswer = `<div style="width:16px; height:16px; border:1px solid #ccc; background-color:#f4f4f4; display:inline-block;"></div>`;
            }
        } else {
            if (!answer) {
                displayAnswer = `<span style="color: #999; font-style: italic;">N/A</span>`;
            } else {
                displayAnswer = answer;
            }
        }
        let questionStyle = "font-weight:bold; color:#333333;";
        if (AC_CONFIG.SECONDARY_QUESTION_ROWS.includes(i)) {
            questionStyle = "font-weight:normal; font-style:italic; color:#444; padding-left:25px;";
        }
        if (AC_CONFIG.HEADER_ROWS.includes(i + 1)) {
            html += `<tr><td colspan="2" style="height:20px;"></td></tr><tr style="background:${headerColor};"><td colspan="2" style="padding:10px;border:1px solid #ccc;text-align:center;font-weight:bold;color:${headerTextColor};">${question}</td></tr>`;
        } else if (question || answer) {
            let bg = i % 2 === 0 ? "#ffffff" : "#e6f2ff";
            html += `<tr style="background:${bg};"><td style="padding:8px;border:1px solid #ddd;width:50%;${questionStyle}">${question}</td><td style="padding:8px;border:1px solid #ddd;text-align:center;vertical-align:middle;">${displayAnswer}</td></tr>`;
        }
    });
    html += `</table></div></div>`;
    return html;
}

// --- Language Switching Logic ---
function switchAccountCreationLanguage() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(AC_CONFIG.SHEET_NAME);
  if (!sheet) return;
  
  const lang = sheet.getRange(AC_CONFIG.LANGUAGE_CELL).getValue();
  const questions = (lang === "Account Creation (Spanish)") ? getAccountCreationSpanishQuestions() : getAccountCreationEnglishQuestions();
  
  const range = sheet.getRange("A2:A30"); // The column where questions are displayed
  range.setValues(questions.map(q => [q]));
}

// --- Trigger function for language switching ---
function onAccountCreationEdit(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== AC_CONFIG.SHEET_NAME || e.range.getA1Notation() !== AC_CONFIG.LANGUAGE_CELL) {
    return;
  }
  switchAccountCreationLanguage();
}

// --- Helper function for basic email validation ---
function validateEmail(email) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

// --- English Questions Database ---
function getAccountCreationEnglishQuestions() {
  return [
    "Demographics", // A2 Header
    "Patient Full Name",
    "Patient Primary Contact Phone #",
    "Secondary Contact Ph#",
    "Patient Email Address",
    "DOB",
    "Home Address", // A8
    "Insurance", // A9 Header
    "Primary Insurance & Member ID#",
    "Secondary Insurance & Member ID#",
    "SSN # (if insurance details N/A)", // A12
    "Clinical Information", // A13 Header
    "PCP Name",
    "MDO Ph#",
    "MDO Fax#",
    "Height",
    "Weight (lbs)",
    "Currently used mobility devices",
    "Diagnoses",
    "Currently staying at Home or Facility?",
    "If in facility what is the approximate discharge date?", // A22
    "Mobility Evaluation & Scheduling", // A23 Header
    "Already had a Power Mobility Evaluation in last 6 months?",
    "If so please provide appointment details",
    "Explained mobility evaluation with doctor is needed for insurance purposes and that we will send MDO paperwork to be filled out during the appointment to be sent back to us",
    "Permission to call & schedule Mobility Evaluation with MDO?",
    "ME Availability",
    "PPD Availability",
    "Other Notes"
  ];
}

// --- Spanish Questions Database ---
function getAccountCreationSpanishQuestions() {
  return [
    "Información del Paciente", // A2
    "Nombre Completo del Paciente",
    "Número de Teléfono de Contacto Primario",
    "Número de Teléfono de Contacto Secundario",
    "Correo Electrónico del Paciente",
    "Fecha de Nacimiento (DOB)",
    "Dirección de Casa", // A8
    "Información del Seguro", // A9
    "Seguro Primario y Número de ID de Miembro",
    "Seguro Secundario y Número de ID de Miembro",
    "Número de Seguro Social (SSN) (si no hay detalles de seguro)", // A12
    "Información de Clínica", // A13
    "Nombre del Doctor Primario (PCP)",
    "Teléfono de clínica",
    "Fax de clínica",
    "Estatura",
    "Peso (libras)",
    "Dispositivos de movilidad que utilizas",
    "Diagnósticos",
    "¿Está en casa o en un centro médico?",
    "Si está en un centro, ¿cuál es la fecha aproximada de salida?", // A22
    "Evaluación de Movilidad y Programación", // A23
    "¿Ya tuvo una Evaluación de Movilidad en los últimos 6 meses?",
    "Si es así, por favor proporcione los detalles de la cita",
    "Explicó que la evaluación de movilidad con el médico es necesaria según el seguro, y que le enviaremos al médico la documentación para que la finalice durante la cita y nos la devuelva.",
    "¿Tenemos permiso para programar una cita con su médico?",
    "Disponibilidad para Evaluación de Movilidad (ME)",
    "Disponibilidad para PPD",
    "Otras Notas"
  ];
}

