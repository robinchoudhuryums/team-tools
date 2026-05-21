// --- SPECIALIZED TOOLS ---

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
  
  htmlTemplate.initialState = {
    mode: "OOP Order",
    departments: ["Eligibility MM&R", "Manual Mobility", "Field Ops"],
    overwriteResolution: true
  };

  const htmlOutput = htmlTemplate.evaluate().setWidth(600).setHeight(700); 
  ui.showModalDialog(htmlOutput, 'Update Order Details (OOP)');
}