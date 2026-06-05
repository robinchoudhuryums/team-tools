const PPD_CONFIG = {
  SHEET_NAME: "PPD Template",
  LANGUAGE_CELL: "A1",
  QUESTIONS_RANGE: "A3:A59", 
  FORM_RANGE: "A3:B59",
  CLEAR_RANGE: "B2:B59",
  PATIENT_INFO_CELL: "B2",
  
  LOGO_URL: "https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/UMS%20Presentation%20Logo.jpg",
  LOGO_OPACITY: 0.7,
  BACKGROUND_IMAGE_URL: "https://cdn.jsdelivr.net/gh/robinchoudhuryums/marketing-images@main/Patient%20Portal%20Background_portrait.png",
  
  AGENT_LIST_SHEET: "PPD Template", // Confirmed this matches your sheet name
  AGENT_NAME_COL: "E",
  AGENT_EMAIL_COL: "F",
  AGENT_LIST_START_ROW: 2,
  
  ALL_AGENTS_EMAIL: "robin.choudhury@universalmedsupply.com",
  BCC_EMAIL: "robin.choudhury@universalmedsupply.com",

  HEADER_ROWS: [2, 10, 19, 31],
  SECONDARY_QUESTION_ROWS: [39, 42] 
};

// --- Main Dialog Function ---
function showPpdPreviewDialog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ppdSheet = ss.getSheetByName(PPD_CONFIG.SHEET_NAME);
  const patientInfo = ppdSheet.getRange(PPD_CONFIG.PATIENT_INFO_CELL).getValue();

  if (!patientInfo || patientInfo.toString().trim() === "") {
    SpreadsheetApp.getUi().alert(
      "⚠️ Missing Patient Information",
      `Please enter the Patient Name and Trx# in cell ${PPD_CONFIG.PATIENT_INFO_CELL} before generating the preview.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return; 
  }
  
  // Get Agent List
  const agentSheet = ss.getSheetByName(PPD_CONFIG.AGENT_LIST_SHEET);
  if (!agentSheet) {
    SpreadsheetApp.getUi().alert(`Sheet "${PPD_CONFIG.AGENT_LIST_SHEET}" for agent list not found.`);
    return;
  }
  
  const lastRow = agentSheet.getLastRow();
  const agentNames = lastRow < PPD_CONFIG.AGENT_LIST_START_ROW ? [] : agentSheet.getRange(`${PPD_CONFIG.AGENT_NAME_COL}${PPD_CONFIG.AGENT_LIST_START_ROW}:${PPD_CONFIG.AGENT_NAME_COL}${lastRow}`)
    .getValues().flat().filter(name => name);

  const htmlTemplate = HtmlService.createTemplateFromFile("PPD_Dialog");
  
  // Pass "null" to indicate we are in PREVIEW mode
  htmlTemplate.ppdPreview = generatePpdHtml(null); 
  htmlTemplate.agentOptions = agentNames;
  htmlTemplate.PPD_CONFIG = PPD_CONFIG;

  const html = htmlTemplate.evaluate().setWidth(850).setHeight(700);
  SpreadsheetApp.getUi().showModalDialog(html, "PPD Preview & Send");
}

// --- Email Sending Function ---
function processEmailToSend(selectedAgent, userSelections) {
  let finalRecipientEmail;
  
  if (selectedAgent === "All") {
    finalRecipientEmail = PPD_CONFIG.ALL_AGENTS_EMAIL;
  } else {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- RESTORED TO ORIGINAL WORKING LOGIC ---
    // We strictly use PPD_CONFIG.AGENT_LIST_SHEET here
    const agentSheet = ss.getSheetByName(PPD_CONFIG.AGENT_LIST_SHEET);
    
    // Original lookup logic that worked for you before:
    const agentData = agentSheet.getRange(`${PPD_CONFIG.AGENT_NAME_COL}${PPD_CONFIG.AGENT_LIST_START_ROW}:${PPD_CONFIG.AGENT_EMAIL_COL}${agentSheet.getLastRow()}`).getValues();
    const agentRecord = agentData.find(row => row[0] === selectedAgent);
    
    if (agentRecord && agentRecord[1]) {
      finalRecipientEmail = agentRecord[1];
    } else {
      throw new Error(`Could not find an email for the agent: ${selectedAgent}.`);
    }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PPD_CONFIG.SHEET_NAME);
  const patientInfo = sheet.getRange(PPD_CONFIG.PATIENT_INFO_CELL).getDisplayValue() || "(No patient info)";
  
  // Generate STATIC HTML using the selections passed from the wrapper
  const html = generatePpdHtml(userSelections);

  MailApp.sendEmail({
    to: finalRecipientEmail, 
    bcc: PPD_CONFIG.BCC_EMAIL,
    subject: `PPD for ${patientInfo}`, 
    htmlBody: html
  });

  sheet.getRange(PPD_CONFIG.CLEAR_RANGE).clearContent();

  const successMessage = `PPD for ${patientInfo} emailed successfully! ✅`;
  SpreadsheetApp.getActiveSpreadsheet().toast(successMessage, "Success", 5);
}

// --- HTML Generation Function ---
function generatePpdHtml(selections = null) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PPD_CONFIG.SHEET_NAME);
  
  const patientInfo = sheet.getRange(PPD_CONFIG.PATIENT_INFO_CELL).getDisplayValue() || "(No patient info)";
  const data = sheet.getRange(PPD_CONFIG.FORM_RANGE).getDisplayValues();
  const englishQuestions = getEnglishQuestions();
  
  const isPreviewMode = (selections === null);

  let html = `
    <div style="background-image: url('${PPD_CONFIG.BACKGROUND_IMAGE_URL}'); background-color: #e9ecef; background-size: cover; padding: 50px; font-family: sans-serif;">
      <style> a, a:visited { color: #333333 !important; text-decoration: none !important; } </style>
      <div style="background-color: rgba(255, 255, 255, 0.85); padding: 20px; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <tr>
            <td style="width: 60px; vertical-align: middle;"><img src="${PPD_CONFIG.LOGO_URL}" alt="Company Logo" style="height:50px; display: block; opacity: ${PPD_CONFIG.LOGO_OPACITY};"></td>
            <td style="vertical-align: middle; padding-left: 15px;"><h2 style="margin: 0; text-align: left; color: #333;">PPD for ${patientInfo}</h2></td>
          </tr>
        </table>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
  `;
  
  const headerColor = "#223b5d";
  const headerTextColor = "#ffffff";
  const s = {
    green: "background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; font-weight: bold; border-radius: 4px; padding: 4px 8px; display: inline-block;",
    red:   "background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; font-weight: bold; border-radius: 4px; padding: 4px 8px; display: inline-block;",
    gray:  "background-color: #e2e3e5; color: #383d41; border: 1px solid #d6d8db; border-radius: 4px; padding: 4px 8px; display: inline-block;",
    yellow: "background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; font-weight: bold; border-radius: 4px; padding: 4px 8px; display: inline-block;"
  };

  data.forEach((row, i) => {
    const question = englishQuestions[i + 2] || "";
    const answer = row[1] ? row[1].toString() : "";
    const qNumMatch = question.match(/^\s*(\d+[a-z]?)\./);
    const qNum = qNumMatch ? qNumMatch[1] : null;

    let displayAnswer = !answer ? `<span style="color: #999; font-style: italic; font-weight: normal;">N/A</span>` : answer;
    let cellStyle = "padding:8px;border:1px solid #ddd;text-align:center;vertical-align:middle;font-weight:bold;";
    
    if (answer && qNum) {
       const lowerAns = answer.toLowerCase();
       const yesNoQs = ["14","15","16","17","18","19","20","21","22","23", "26","27","28", "30","31", "33", "35", "36", "44"];

       if (yesNoQs.includes(qNum)) {
         if (lowerAns.includes("no")) { displayAnswer = `<div style="${s.red}">${answer}</div>`; } 
         else { displayAnswer = `<div style="${s.green}">${answer}</div>`; }
       }
       else if (qNum === "34") {
         if (lowerAns.includes("no")) { displayAnswer = `<div style="${s.gray}">${answer}</div>`; } 
         else { displayAnswer = `<div style="${s.yellow}">${answer}</div>`; }
       }
       else if (qNum === "25" || qNum === "31a") {
           if (lowerAns.includes("no") && !lowerAns.includes("weakness") && !lowerAns.includes("paralysis") && !lowerAns.includes("feet") && !lowerAns.includes("hands")) {
              displayAnswer = `<div style="${s.gray}">${answer}</div>`;
           } else {
              const parts = answer.split(',');
              const styledParts = parts.map(part => `<span style="${s.yellow} margin: 2px;">${part.trim()}</span>`);
              displayAnswer = styledParts.join(" ");
           }
       }
    }

    let questionStyle = "font-weight:bold; color:#333333;";
    if (PPD_CONFIG.SECONDARY_QUESTION_ROWS.includes(i)) {
      questionStyle = "font-weight:normal; font-style:italic; color:#444; padding-left:25px;";
    }
    if (PPD_CONFIG.HEADER_ROWS.includes(i + 1)) {
      html += `<tr><td colspan="2" style="height:20px;"></td></tr><tr style="background:${headerColor};"><td colspan="2" style="padding:10px;border:1px solid #ccc;text-align:center;font-weight:bold;color:${headerTextColor};">${question}</td></tr>`;
    } else if (question || answer) {
      let bg = i % 2 === 0 ? "#ffffff" : "#e6f2ff";
      html += `<tr style="background:${bg};"><td style="padding:8px;border:1px solid #ddd;width:50%;${questionStyle}">${question}</td><td style="${cellStyle}">${displayAnswer}</td></tr>`;
    }
  });

  // --- RECOMMENDATION SECTION ---
  const recData = getFilteredRecommendations(); 

  html += `<tr><td colspan="2" style="padding:20px 10px 5px 10px; border-top: 2px solid #ccc;"><h3>Recommended HCPCS:</h3>`;
  const hasComplex = recData.complex && recData.complex.length > 0;
  const hasStandard = recData.standard && recData.standard.length > 0;

  if (!hasComplex && !hasStandard) {
     html += `<p style="color: #666; font-style: italic;">No products matched all criteria based on the provided answers.</p>`;
  } else {
     const generateListHtml = (items) => {
       let listHtml = `<ul style="list-style-type: none; padding-left: 0;">`;
       items.forEach(product => {
         const itemId = product.hcpcs.replace(/\s+/g, '-'); 
         
         let isPreferred = false;
         let status = 'none'; 
         
         if (!isPreviewMode && selections && selections[itemId]) {
           isPreferred = selections[itemId].preferred;
           status = selections[itemId].status;
         }

         // FROSTED REJECTED
         let rowStyle = "padding: 10px; border-bottom: 1px solid #ddd; display: flex; align-items: flex-start; gap: 15px;";
         if (status === 'rejected') {
           rowStyle += " background-color: #f8f9fa; opacity: 0.6; filter: grayscale(100%);";
         }

         listHtml += `<li class="rec-item" data-id="${itemId}" style="${rowStyle}">`;
         
         // 1. STAR
         listHtml += `<div style="padding-top: 5px;">`;
         if (isPreviewMode) {
           listHtml += `<label class="star-container" style="cursor: pointer; font-size: 20px;">
              <input type="radio" name="preferred_product" value="${itemId}" style="display:none;">
              <span class="star-icon">★</span>
           </label>`;
         } else {
           if (isPreferred) {
             listHtml += `<span style="font-size: 24px; color: #FFD700; line-height: 1;">★</span>`;
           } else {
             listHtml += `<span style="width: 24px; display:inline-block;"></span>`; 
           }
         }
         listHtml += `</div>`;

         // 2. IMAGE
         if (product.imageUrl) { 
             listHtml += `<img src="${product.imageUrl}?v=${product.hcpcs}" alt="${product.hcpcs}" style="width:100px; height:auto; vertical-align:middle; border: 1px solid #eee; margin-right: 10px;">`; 
         }
         
         // 3. CONTENT
         listHtml += `<div style="font-size: 14px; flex-grow: 1;">`;
         listHtml += `<div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">`;
         
         let titleHtml = product.pdfLink ? `<a href="${product.pdfLink}" target="_blank" style="text-decoration:none; color: #1a73e8;">${product.hcpcs}</a>` : product.hcpcs;
         listHtml += `<span>${titleHtml}</span>`;
         
         // --- BADGE/INPUT AREA ---
         listHtml += `<div style="font-weight: normal; margin-left: 15px;">`; 
         
         if (isPreviewMode) {
            listHtml += `<select class="status-select" data-for="${itemId}" style="padding: 2px; font-size: 12px; border-radius: 4px; border: 1px solid #ccc;">
              <option value="none">-- No Selection --</option>
              <option value="accepted">Accepted (Yes)</option>
              <option value="undecided">Undecided/Maybe</option> <option value="rejected">Rejected (No)</option>
            </select>`;
         } else {
            // Email Badges
            if (status === 'accepted') {
              listHtml += `<span style="background:#e6fffa; color:#00875A; border:1px solid #b3f5e1; padding:2px 6px; border-radius:4px; font-size:12px;">✅ Accepted</span>`;
            } else if (status === 'rejected') {
              listHtml += `<span style="background:#ffebe6; color:#DE350B; border:1px solid #ffbdad; padding:2px 6px; border-radius:4px; font-size:12px;">❌ Rejected</span>`;
            } else if (status === 'undecided') {
               // UPDATED: Blue-Gray styling
               listHtml += `<span style="background:#e2e8f0; color:#334155; border:1px solid #94a3b8; padding:2px 6px; border-radius:4px; font-size:12px;">🤔 Undecided/Maybe</span>`;
            } else {
               listHtml += `<span style="background:#f4f5f7; color:#888; border:1px solid #dfe1e6; padding:2px 6px; border-radius:4px; font-size:12px;">Unconfirmed</span>`;
            }
         }
         listHtml += `</div>`; 
         listHtml += `</div>`; 

         listHtml += `<div style="color: #555;">${product.justification || "Eligible match."}</div>`;
         listHtml += `</div></li>`;
       });
       listHtml += `</ul>`;
       return listHtml;
     };

     if (hasComplex) {
       html += `<h4 style="margin-bottom: 5px; color: #b71c1c; padding-bottom: 5px;">Complex Rehab</h4>`;
       html += generateListHtml(recData.complex);
     }
     if (hasStandard) {
       if (hasComplex) { html += `<div style="height: 20px;"></div>`; } 
       html += `<h4 style="margin-bottom: 5px; color: #1565c0; padding-bottom: 5px;">Standard Powerchair</h4>`;
       html += generateListHtml(recData.standard);
     }
  }

  html += `</td></tr></table></div></div>`;
  return html;
}

// ... Rest of the functions (switchPpdLanguage, dialog helpers, getters) remain exactly as they were ...

// ... (Rest of existing functions remain identical) ...

function onPpdSheetEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  if (
    sheet.getName() !== PPD_CONFIG.SHEET_NAME ||
    range.getA1Notation() !== PPD_CONFIG.LANGUAGE_CELL
  ) {
    return;
  }
  switchPpdLanguage();
}

function switchPpdLanguage() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PPD_CONFIG.SHEET_NAME);
  const lang = sheet.getRange(PPD_CONFIG.LANGUAGE_CELL).getValue();
  const questions = (lang === "PPD (Spanish)") ? getSpanishQuestions() : getEnglishQuestions();
  
  const questionsForSheet = questions.slice(2);
  const data = questionsForSheet.map(q => [q]);
  
  const startRow = 3; 
  const maxRows = sheet.getMaxRows();
  
  sheet.getRange(startRow, 1, maxRows - startRow + 1, 1).clearContent();
  sheet.getRange(startRow, 1, data.length, 1).setValues(data);
}

function showCustomAlert(message) {
  SpreadsheetApp.getUi().alert(message);
}

function showSuccessDialog(message) {
  const html = `
    <div style="font-family: Arial, sans-serif; text-align: center; padding-top: 20px;">
      <p style="font-size: 16px; color: #00875A; font-weight: bold;">${message}</p>
    </div>
  `;
  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(400).setHeight(120);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Success');
}

function showFailureDialog(message) {
  const html = `
    <div style="font-family: Arial, sans-serif; text-align: center; padding-top: 20px;">
      <p style="font-size: 16px; color: #DE350B; font-weight: bold;">${message}</p>
    </div>
  `;
  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(400).setHeight(120);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Error');
}

function getEnglishQuestions() {
  return [
    "PPD (English)", "", "", "MRADL",
    "1. Do you currently use a cane, walker, manual wheelchair, scooter, or PWC?",
    "2. Going to the restroom and using the toilet", "3. Preparing meals in the kitchen",
    "4. Getting fully dressed", "5. Grooming (fixing hair, shaving, etc.)",
    "6. Bathing (getting in & out of shower/tub, washing all areas)", "",
    "Extremity Strength", "7. Can you move both arms at all?",
    "8. Can you raise both arms straight out in front of you, as if pointing?",
    "9. Can you raise both hands straight above your head?", "10. Can you move your legs at all?",
    "11. While sitting, can you extend your legs straight out in front of you?",
    "12. Could you push an unlocked door open with your feet?",

    "13. Have you fallen, nearly fallen, or experienced dizziness in the past six months? If so, how many times?", "",
    "Consistent Pain", "14. Neck?", "15. Shoulder?", "16. Elbows?", "17. Arms?",
    "18. Hands?", "19. Back?", "20. Hips?", "21. Knees?", "22. Legs?", "23. Ankles?", "",
    "Additional Information", "24. Do you take pain medications (over the counter or prescribed)?",
    "25. Do you have consistent or frequent numbness/tingling in hands, feet or legs?",

    "26. Do you use caloric/nutritional supplements like Ensure or Boost?",

    "27. Do you ever have the need for incontinence supplies?",

    "28. Do you have diabetes?",
    "29. Do you have any peripheral vascular disease?",
    "30. Do you use intermittent catheters?",
    "31. Have you had a stroke in the past?",
    "        31a. Did it result in weakness or paralysis in either side?",
    "32. Do you have spasticity?",
    "33. History of pressure ulcers or “bedsores”?",
    "        33a. If so, where and do you have absent or impaired sensation in that area?",
    "34. Any amputations? If so, where and is it above or below the knee?",
    "35. Any curvature of the spine (like scoliosis or humpback)?",
    "36. Consistent swelling in feet, ankles, or legs?",
    "37. Height (inches):",
    "38. Weight (lbs):",
    "39. Live alone or w/ friends/family?",
    "40. Do you have a home health attendant at your home for a few hours per week?",

    "41. What diagnoses do you have that would qualify you for the PWC?",
    "42. Any heart or lung conditions not already mentioned?",
    "43. Any neurological conditions not already mentioned?",
    "44. Are you on Oxygen?",
    "45. Do you have arthritis? If so, where and what type (Rheumatoid, Osteo, Psoriatic)?",
  ];
}

function getSpanishQuestions() {
  return [
    "PPD (Español)", "", "", "MRADL (Movilidad y Actividades de la Vida Diaria)",
    "1. ¿Usa actualmente un bastón, andador, silla de ruedas manual, scooter o silla de ruedas motorizada (PWC)?",
    "2. Ir al baño y usar el inodoro", "3. Preparar comidas en la cocina",
    "4. Vestirse por completo", "5. Asearse (peinarse, afeitarse, etc.)",
    "6. Bañarse (entrar y salir de la ducha/bañera, lavarse todas las áreas)", "",
    "Fuerza de las extremidades", "7. ¿Puede mover ambos brazos?",
    "8. ¿Puede levantar ambos brazos rectos al frente, como si estuviera apuntando?",
    "9. ¿Puede levantar ambas manos por encima de la cabeza?", "10. ¿Puede mover las piernas?",
    "11. Sentado/a, ¿puede extender las piernas rectas al frente?",
    "12. ¿Podría empujar una puerta sin seguro con los pies?",

    "13. ¿Se ha caído, casi se ha caído o se ha mareado en los últimos seis meses? Si es así, ¿cuántas veces?", "",
    "Dolor Constante", "14. ¿Cuello?", "15. ¿Hombro?", "16. ¿Codos?", "17. ¿Brazos?",
    "18. ¿Manos?", "19. ¿Espalda?", "20. ¿Caderas?", "21. ¿Rodillas?", "22. ¿Piernas?", "23. ¿Tobillos?", "",
    "Información Adicional", "24. ¿Toma medicamentos para el dolor (de venta libre o recetados)?",
    "25. ¿Tiene entumecimiento u hormigueo en las manos, pies o piernas?",

    "26. ¿Usa suplementos calóricos/nutricionales como Ensure o Boost?",

    "27. ¿Alguna vez necesita productos para la incontinencia?",

    "28. ¿Tiene diabetes?",
    "29. ¿Tiene alguna enfermedad vascular periférica?",
    "30. ¿Usa catéteres intermitentes?",
    "31. ¿Ha tenido un derrame cerebral (stroke) en el pasado?",
    "        31a. ¿Resultó en debilidad o parálisis en alguno de los lados?",
    "32. ¿Tiene espasticidad?",
    "33. ¿Historial de úlceras por presión o “escaras”?",
    "        33a. Si es así, ¿dónde? ¿Y tiene la sensación ausente o disminuida en esa área?",
    "34. ¿Alguna amputación? Si es así, ¿dónde y es arriba o abajo de la rodilla?",
    "35. ¿Alguna curvatura en la columna (como escoliosis o joroba)?",
    "36. ¿Hinchazón constante en pies, tobillos o piernas?",
    "37. Estatura (pulgadas):",
    "38. Peso (libras):",
    "39. ¿Vive solo/a o con amigos/familia?",
    "40. ¿Tiene un/a asistente de salud en casa algunas horas a la semana?",

    "41. ¿Qué diagnósticos tiene que lo/la calificarían para la PWC?",
    "42. ¿Alguna condición cardíaca o pulmonar no mencionada?",
    "43. ¿Alguna condición neurológica no mencionada?",
    "44. ¿Usa oxígeno?",
    "45. ¿Tiene artritis? Si es así, ¿dónde y de qué tipo (Reumatoide, Osteoartritis, Psoriásica)?",
  ];
}