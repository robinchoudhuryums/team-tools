function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("CSR Tools")
    //.addItem("Switch Language", "switchLanguage") Redundant/ineffective
    .addItem("Send PPD", "showPpdPreviewDialog")
    .addSeparator()
    .addItem("Send PMD Account Creation Form", "showAccountCreationDialog")
    .addItem("Send PAP Account Creation Form","showPAP_Dialog")
    .addToUi();
}

