// --- Configuration for PAP Account Creation Template ---
const PAP_CONFIG = {
  SHEET_NAME: "PAP Account Creation Template",
  FORM_RANGE: "A2:B29",
  CLEAR_RANGE: "B3:B29",
  LANGUAGE_CELL: "A1",
  PATIENT_INFO_CELL: "B3",
  DOB_CELL: "B7",
  
  LOGO_URL: "https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/UMS%20Presentation%20Logo.jpg",
  BACKGROUND_IMAGE_URL: "https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/Patient%20Portal%20Background_portrait.png",
  
  DEFAULT_EMAIL: "sleep@universalmedsupply.com", //sleep@universalmedsupply.com
  BCC_EMAIL: "robin.choudhury@universalmedsupply.com",
  
  HEADER_ROWS: [1, 8, 12, 19], // For A2, A9, A13, A20
  
  CHECKBOX_ROWS: [
    24, // For sheet row 25
    26  // For sheet row 27
  ],
  
  SECONDARY_QUESTION_ROWS: [
    3,  // For sheet row 5
    10, // For sheet row 12
    20, // For sheet row 22
    21, // For sheet row 23
    22, // For sheet row 24
    25, // For sheet row 26
    27  // For sheet row 28
  ],

 CONDITIONAL_FORMATTING_ROWS: {
    // 0-based index for the row to check
    19: { // Example for "Have you done a Sleep Study in the past?" on row 25
      "No": { bgColor: "#d4edda", textColor: "#155724" }, // Light Green
      "Yes":  { bgColor: "#F7E891", textColor: "#7A6C21" }  // Light Red/Yellow
    },
    21: {
      "Less than 5 years": { bgColor: "#F7E891", textColor: "#7A6C21" },
      "More than 5 years": { bgColor: "#d4edda", textColor: "#155724"}
     }
 }
};

// --- This function launches the entire process ---
function showPAP_Dialog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- NEW VALIDATION CHECK ---
  const papSheet = ss.getSheetByName(PAP_CONFIG.SHEET_NAME);
  // PAP_CONFIG.PATIENT_INFO_CELL is already set to "B3" in your config
  const patientInfo = papSheet.getRange(PAP_CONFIG.PATIENT_INFO_CELL).getValue();

  if (!patientInfo || patientInfo.toString().trim() === "") {
    SpreadsheetApp.getUi().alert(
      "⚠️ Missing Patient Information",
      `Please enter the Patient Name in cell ${PAP_CONFIG.PATIENT_INFO_CELL} before generating the form.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return; // STOP execution here
  }
  const htmlTemplate = HtmlService.createTemplateFromFile("PAP_Dialog");
  htmlTemplate.formPreview = generatePAP_Html();
  htmlTemplate.PAP_CONFIG = PAP_CONFIG; 

  const html = htmlTemplate.evaluate().setWidth(800).setHeight(650);
  SpreadsheetApp.getUi().showModalDialog(html, "PAP Account Creation Form Preview & Send");
}

// --- This function is called from the dialog to send the email ---
// --- Updated Email Function for Multiple Images ---
function processPAP_Email(recipientInfo) {
  const recipientEmail = recipientInfo.useDefault ? PAP_CONFIG.DEFAULT_EMAIL : recipientInfo.customEmail;

  if (!recipientEmail || !validateEmail(recipientEmail)) {
    throw new Error(`Invalid recipient email address provided: ${recipientEmail}`);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PAP_CONFIG.SHEET_NAME);
  const patientInfo = sheet.getRange(PAP_CONFIG.PATIENT_INFO_CELL).getDisplayValue() || "(No patient name)";
  const dob = sheet.getRange(PAP_CONFIG.DOB_CELL).getDisplayValue() || "(No DOB)";
  
  let htmlBody = generatePAP_Html();
  let inlineImagesObj = {};

  // --- Process Multiple Images ---
  // We expect recipientInfo.images to be an array of Base64 strings
  if (recipientInfo.images && recipientInfo.images.length > 0) {
    try {
      let imageSectionHtml = `
        <div style="margin-top: 20px; border-top: 2px dashed #ccc; padding-top: 20px; text-align: center;">
          <h3 style="color: #444;">Attached Images</h3>`;

      recipientInfo.images.forEach((base64String, index) => {
        // Create a unique Content-ID (CID) for each image
        const cid = "attachedImage" + index; 
        
        const contentType = base64String.substring(5, base64String.indexOf(';'));
        const data = base64String.split(",")[1];
        const decoded = Utilities.base64Decode(data);
        const blob = Utilities.newBlob(decoded, contentType, cid);
        
        // Add blob to the email object
        inlineImagesObj[cid] = blob;
        
        // Add HTML tag referencing that CID
        imageSectionHtml += `<img src="cid:${cid}" style="max-width: 100%; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto;" />`;
      });

      imageSectionHtml += `</div>`;
      
      // Inject before the end of the main container
      htmlBody = htmlBody.replace('</table></div></div>', '</table>' + imageSectionHtml + '</div></div>');

    } catch (e) {
      console.error("Error processing images: " + e.toString());
      htmlBody += `<p style="color:red; text-align:center;">(System Error attaching images: ${e.message})</p>`;
    }
  }

  MailApp.sendEmail({
    to: recipientEmail,
    bcc: PAP_CONFIG.BCC_EMAIL,
    subject: `PAP Account Creation for ${patientInfo} ${dob}`,
    htmlBody: htmlBody,
    inlineImages: inlineImagesObj // Attach all blobs
  });

  sheet.getRange(PAP_CONFIG.CLEAR_RANGE).clearContent();

  const successMessage = `PAP form for ${patientInfo} emailed successfully! ✅`;
  SpreadsheetApp.getActiveSpreadsheet().toast(successMessage, "Success", 5);
}


function showPAP_FailureDialog(errorMessage) {
    const ui = SpreadsheetApp.getUi();
    ui.alert('Error', errorMessage, ui.ButtonSet.OK);
}

// --- This helper function builds the HTML for the preview and email ---
function generatePAP_Html() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PAP_CONFIG.SHEET_NAME);
  
  const patientName = sheet.getRange(PAP_CONFIG.PATIENT_INFO_CELL).getDisplayValue() || "(No name)";
  const dob = sheet.getRange(PAP_CONFIG.DOB_CELL).getDisplayValue() || "(No DOB)";
  const data = sheet.getRange(PAP_CONFIG.FORM_RANGE).getDisplayValues();
  const englishQuestions = getPAPEnglishQuestions();
  
  let html = `
    <div style="background-image: url('${PAP_CONFIG.BACKGROUND_IMAGE_URL}'); background-color: #e9ecef; background-size: cover; padding: 50px; font-family: sans-serif;">
      <style> a, a:visited { color: #333333 !important; text-decoration: none !important; } </style>
      <div style="background-color: rgba(255, 255, 255, 0.85); padding: 20px; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <tr>
            <td style="width: 60px; vertical-align: middle;"><img src="${PAP_CONFIG.LOGO_URL}" alt="Company Logo" style="height:50px; display: block;"></td>
            <td style="vertical-align: middle; padding-left: 15px;"><h2 style="margin: 0; text-align: left; color: #333;">PAP Account Creation for ${patientName} ${dob}</h2></td>
          </tr>
        </table>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
  `;
  
  const headerColor = "#223b5d";
  const headerTextColor = "#ffffff";
  data.forEach((row, i) => {
    const question = englishQuestions[i];
    const answer = row[1];
    let displayAnswer;

    const formattingRules = PAP_CONFIG.CONDITIONAL_FORMATTING_ROWS[i];

    if (formattingRules && formattingRules[answer]) {
      const rule = formattingRules[answer];
      displayAnswer = `<div style="background-color:${rule.bgColor}; color:${rule.textColor}; border:1px solid ${rule.bgColor}; border-radius:4px; padding: 5px 8px; font-weight:bold; display:inline-block;">${answer}</div>`;
    } 
    else if (PAP_CONFIG.CHECKBOX_ROWS.includes(i)) {
      displayAnswer = (answer === "TRUE") 
        ? `<div style="width:16px; height:16px; border:1px solid #777; background-color:#fff; text-align:center; line-height:16px; font-weight:bold; color:#00875A; display:inline-block;">&#10003;</div>`
        : `<div style="width:16px; height:16px; border:1px solid #ccc; background-color:#f4f4f4; display:inline-block;"></div>`;
    } 
    else {
      displayAnswer = !answer ? `<span style="color: #999; font-style: italic;">N/A</span>` : answer;
    }
    
    let questionStyle = "font-weight:bold; color:#333333;";
    if (PAP_CONFIG.SECONDARY_QUESTION_ROWS.includes(i)) {
      questionStyle = "font-weight:normal; font-style:italic; color:#444; padding-left:25px;";
    }
    if (PAP_CONFIG.HEADER_ROWS.includes(i + 1)) {
      html += `<tr><td colspan="2" style="height:20px;"></td></tr><tr style="background:${headerColor};"><td colspan="2" style="padding:10px;border:1px solid #ccc;text-align:center;font-weight:bold;color:${headerTextColor};">${question}</td></tr>`;
    } else if (question || answer) {
      let bg = i % 2 === 0 ? "#ffffff" : "#e6f2ff";
      html += `<tr style="background:${bg};"><td style="padding:8px;border:1px solid #ddd;width:50%;${questionStyle}">${question}</td><td style="padding:8px;border:1px solid #ddd;text-align:center;vertical-align:middle;">${displayAnswer}</td></tr>`;
    }
  });
  html += `</table></div></div>`;
  return html;
}

// --- Trigger function for language switching ---
function onPAP_Edit(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== PAP_CONFIG.SHEET_NAME || e.range.getA1Notation() !== PAP_CONFIG.LANGUAGE_CELL) {
    return;
  }
  const lang = sheet.getRange(PAP_CONFIG.LANGUAGE_CELL).getValue();
  const questions = (lang === "Account Creation (Spanish)") ? getPAPSpanishQuestions() : getPAPEnglishQuestions();
  sheet.getRange("A2:A29").setValues(questions.map(q => [q]));
}

// --- English Questions Database ---
function getPAPEnglishQuestions() {
  return [
    "Demographics", // A2
    "Patient Full Name", "Patient Primary Contact Phone #", "Secondary Contact Ph#", "Patient Email Address", "DOB", "Home Address", // A3-A8
    "Insurance", // A9
    "Primary Insurance & Member ID#", "Secondary Insurance & Member ID#", "SSN # (if insurance details N/A)", // A10-A12
    "Clinical Information", // A13
    "PCP Name", "MDO Ph#", "MDO Fax#", "MDO Address", "Height", "Weight (lbs)", // A14-A19
    "PAP Details", // A20
    "Already have a CPAP?","Make & Model of current CPAP (if applicable)?", "How long have you had the current CPAP (if applicable)?", "What kind of mask are you using (make/model/size)?","Looking for Machine, PAP Supplies, or Both?", "Have you done a Sleep Study in the past?", "If so please provide Sleep Study details (approx. date & provider details)", "Informed that we will reach out to MDO for the information required by insurance, and work with both to process your order efficiently.", "Other Notes" // A21-A29
  ];
}

// --- Spanish Questions Database ---
function getPAPSpanishQuestions() {
  return [
    "Datos Demográficos", // A2
    "Nombre Completo del Paciente", "Teléfono de Contacto Primario", "Teléfono de Contacto Secundario", "Correo Electrónico del Paciente", "Fecha de Nacimiento", "Dirección de Casa", // A3-A8
    "Seguro", // A9
    "Seguro Primario y ID de Miembro", "Seguro Secundario y ID de Miembro", "SSN (si no hay detalles de seguro)", // A10-A12
    "Información Clínica", // A13
    "Nombre del doctor primario", "Teléfono de la oficina del doctor", "Numero de Fax del doctor", "Dirección del oficina", "Estatura", "Peso (libras)", // A14-A19
    "Detalles de PAP/máquina", // A20
    "¿Ya tienes una CPAP/máquina?", "¿Marca y Modelo del CPAP (si aplica)?", "¿Cuánto tiempo ha tenido el CPAP (si aplica)?", "¿Qué tipo de mascarilla usa (marca/modelo/tamaño)?","¿Busca Máquina, Suministros de PAP, o Ambos?", "¿Ha tenido un Estudio del Sueño en el pasado?", "Si es así, proporcione detalles (fecha y doctor)", "Se le informó que contactaremos al doctor para la información requerida por el seguro para aceptar su orden.", "Otras notas" // A21-A29
  ];
}