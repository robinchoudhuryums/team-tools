// Global variable - defined outside so other scripts can see it if needed
const departmentEmails = {
  'Sales': 'sales@universalmedsupply.com',
  'Eligibility MM&R': 'eligibility@universalmedsupply.com',
  'Manual Mobility': 'patientintake@universalmedsupply.com',
  'Resupply': 'resupply@universalmedsupply.com',
  'Power': 'power@universalmedsupply.com',
  'Field Ops': 'routing@universalmedsupply.com',
  'Service': 'service@universalmedsupply.com',
  'Billing': 'billing@universalmedsupply.com',
  'Denials': 'denials@universalmedsupply.com',
  'CSR': 'robin.choudhury@universalmedsupply.com',
  'Spanish':'spanishcalls@universalmedsupply.com'
};

function onOpen() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // --- 1. MENU CREATION (MOVED TO TOP) ---
  // We create the menu first so it appears immediately, 
  // even if the sheet/date logic below encounters an issue.
  ui.createMenu('CSR Tools')
    .addItem('Update Order', 'createUpdateOrderEmail')
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
      // It is safer to just log this to the console rather than Alerting every time 
      // someone opens the sheet, but an alert is fine if you prefer it.
      console.warn(`Sheet named "${sheetName}" was not found.`);
      return; // Stops here, but Menu is already created!
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

    // Activate the cell if the date was found
    if (targetColumn !== -1) {
      sheet.getRange(1, targetColumn).activate();
    } else {
      // Optional: ui.alert(`Today's date not found on "${sheetName}".`);
    }

  } catch (e) {
    // This ensures that if the navigation logic crashes, it doesn't break the whole sheet load
    console.error("Error in auto-navigation: " + e.message);
  }
}