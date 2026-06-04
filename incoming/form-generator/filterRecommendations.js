function getFilteredRecommendations() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const templateSheet = ss.getSheetByName("PPD Template");
  const offeringsSheet = ss.getSheetByName("PMD Offerings");

  if (!templateSheet || !offeringsSheet) {
    return { standard: [], complex: [] };
  }

  // ======================================================
  // 1. DATA GATHERING
  // ======================================================
  const lastRow = templateSheet.getLastRow();
  const dataRange = templateSheet.getRange(1, 1, lastRow, 2).getValues(); 
  
  // ROBUST FINDER
  const getAnswerText = (qNumber, uniqueText) => {
    let row = dataRange.find(r => r[0] && r[0].toString().trim().startsWith(qNumber));
    if (!row && uniqueText) {
      row = dataRange.find(r => r[0] && r[0].toString().toLowerCase().includes(uniqueText.toLowerCase()));
    }
    return row && row[1] ? row[1].toString().toLowerCase().trim() : "";
  };

  const isPositive = (qNumber, uniqueText) => {
    const ans = getAnswerText(qNumber, uniqueText);
    return ans.includes('yes') || ans.includes('true'); 
  };

  const patient = {
    weight: parseInt(getAnswerText("38.", "Weight (lbs)").replace(/\D/g, ''), 10) || 0,
    neuroCondition: getAnswerText("43.", "neurological conditions"), 
    numbnessAnswer: getAnswerText("25.", "numbness/tingling"),
    amputationStatus: getAnswerText("34.", "any amputations"),
    strokeDetails: getAnswerText("31a.", "weakness or paralysis"),

    hasSpineCurvature: isPositive("35.", "curvature of the spine"),
    isOnOxygen: isPositive("44.", "are you on oxygen"),
    hasPressureUlcers: isPositive("33.", "pressure ulcers"),
    hasSpasticity: isPositive("32.", "spasticity"),
    hasSwelling: isPositive("36.", "consistent swelling"),   
    hasFallHistory: isPositive("13.", "have you fallen"),
    usesCatheters: isPositive("30.", "intermittent catheters"),
  };

  patient.hasLowerExtremityNumbness = patient.numbnessAnswer.includes('feet') || 
                                      patient.numbnessAnswer.includes('legs');

  patient.hasAmputation = (patient.amputationStatus.includes("knee") || 
                          patient.amputationStatus.includes("left") || 
                          patient.amputationStatus.includes("right")) && 
                          !patient.amputationStatus.includes("no");

  // --- DIAGNOSTICS TOAST (Updated) ---
const fmt = (isValid, text) => isValid ? (text.length > 10 ? text.substring(0, 10) + ".." : text) : "❌";
  const bool = (val) => val ? "Yes" : "❌"; // Helper for checkboxes

  const hasNeuro = patient.neuroCondition && !['no', 'n/a', 'none', '', 'no.'].includes(patient.neuroCondition);
  const hasStroke = patient.strokeDetails && !patient.strokeDetails.includes("no");
  
  const debugMsg = `Wt:${patient.weight} | Amp:${bool(patient.hasAmputation)} | Swell:${bool(patient.hasSwelling)} | Spine:${bool(patient.hasSpineCurvature)} | Numb:${bool(patient.hasLowerExtremityNumbness)} | Neuro:${fmt(hasNeuro, patient.neuroCondition)} | CVA:${fmt(hasStroke, patient.strokeDetails)}`;
  
  SpreadsheetApp.getActiveSpreadsheet().toast(debugMsg, "Diagnostic", 20);

  // --- STROKE ANALYSIS ---
  let qualifiesForHemiplegia = false;
  let hasStrokeWeakness = false;
  let hemiplegiaSide = ""; 

  if (patient.strokeDetails && !patient.strokeDetails.includes("no")) {
    const parts = patient.strokeDetails.split(/[,;\n\r]+/);
    let rightParaCount = 0;
    let leftParaCount = 0;

    parts.forEach(part => {
      const p = part.trim();
      if (p.includes("weakness") || p.includes("paralysis")) {
        hasStrokeWeakness = true;
      }
      if (p.includes("paralysis")) {
        if (p.includes("right arm")) rightParaCount++;
        if (p.includes("right leg")) rightParaCount++;
        if (p.includes("right side")) rightParaCount += 2; 
        if (p.includes("left arm")) leftParaCount++;
        if (p.includes("left leg")) leftParaCount++;
        if (p.includes("left side")) leftParaCount += 2; 
      }
    });

    if (rightParaCount >= 2) {
      qualifiesForHemiplegia = true;
      hemiplegiaSide = "Right";
    } else if (leftParaCount >= 2) {
      qualifiesForHemiplegia = true;
      hemiplegiaSide = "Left";
    }
  }

  const hasValidNeuroDiagnosis = patient.neuroCondition && 
                                 !['no', 'n/a', 'none', '', 'no.'].includes(patient.neuroCondition);

  // --- ELIGIBILITY FLAGS ---
  const isNeuroEligible = hasValidNeuroDiagnosis || patient.hasSpasticity || qualifiesForHemiplegia;
  
  const isSPOEligible = patient.hasSwelling || 
                        patient.hasPressureUlcers || 
                        isNeuroEligible || 
                        patient.usesCatheters ||
                        patient.hasSpineCurvature || 
                        patient.hasAmputation;

  const isMPOEligible = patient.usesCatheters || isNeuroEligible; 

  // ======================================================
  // 2. FILTER LOGIC
  // ======================================================
  const allProducts = offeringsSheet.getRange("A2:F" + offeringsSheet.getLastRow()).getValues();

  const inherentlySolidCodes = [
    'K0822', 'K0824', 'K0826', 'K0828', 
    'K0835', 'K0837', 'K0839',          
    'K0840', 'K0841', 'K0843',          
    'K0848', 'K0849', 'K0850', 'K0851', 
    'K0856', 'K0857', 'K0858', 'K0859', 
    'K0861', 'K0862', 'K0863', 'K0864'  
  ];

  const eligibleProducts = allProducts
    .map(productRow => {
       const [features, hcpcs, weightCapacityStr, seatType, pdfLink, imageUrl] = productRow.map(p => p.toString());
       return { features, hcpcs, weightCapacityStr, seatType, pdfLink, imageUrl };
    })
    .filter(product => {
      const hcpcs = product.hcpcs.trim(); 
      const hcpcsNum = parseInt(hcpcs.replace(/\D/g, ''), 10) || 0;
      if (hcpcsNum === 0) return false;

      const seatCode = product.seatType.toLowerCase().trim();
      const isKnownSolid = inherentlySolidCodes.includes(hcpcs);
      const sheetSaysSolid = seatCode.includes("s");
      const offersSolid = isKnownSolid || sheetSaysSolid;
      const offersCaptain = seatCode.includes("c") && !isKnownSolid && !sheetSaysSolid;

      if (patient.weight > 0) {
        let minCap = 0, maxCap = 999;
        if (product.weightCapacityStr.includes('-')) {
          [minCap, maxCap] = product.weightCapacityStr.split('-').map(n => parseInt(n, 10));
          if (patient.weight < minCap) return false; 
          if (patient.weight > maxCap) return false;
        } else {
          maxCap = parseInt(product.weightCapacityStr, 10);
          if (patient.weight > maxCap) return false; 
        }
      }

      const isGroup3 = hcpcsNum >= 848; 
      const isMPO = (hcpcsNum >= 840 && hcpcsNum <= 843) || (hcpcsNum >= 861 && hcpcsNum <= 864);
      const isSPO = (hcpcsNum >= 835 && hcpcsNum <= 839) || (hcpcsNum >= 856 && hcpcsNum <= 859);

      const needsSolidSeat = patient.hasSpineCurvature || 
                             patient.hasPressureUlcers ||
                             patient.hasSpasticity ||
                             hasValidNeuroDiagnosis ||
                             qualifiesForHemiplegia || 
                             hasStrokeWeakness ||
                             patient.hasLowerExtremityNumbness || 
                             patient.usesCatheters || 
                             patient.hasAmputation;

      if (needsSolidSeat) {
         if (!offersSolid) return false; 
      } else {
         if (!isGroup3 && !offersCaptain) return false;
      }

      if (patient.isOnOxygen && (hcpcs === 'K0837' || hcpcs === 'K0838')) return false;

      if (isGroup3 && !isNeuroEligible) return false;
      if (isMPO && !isMPOEligible) return false;
      if (isSPO && !isSPOEligible) return false;
      
      return true;
    });

  // ======================================================
  // 3. SUBSTITUTION
  // ======================================================
  const substitutions = {
    'K0856': 'K0861', 
    'K0838': 'K0837'  
  };

  const processedMap = new Map();

  eligibleProducts.forEach(product => {
    let finalHcpcs = product.hcpcs.trim(); 
    let finalProduct = { ...product }; 

    if (['K0841', 'K0842', 'K0843'].includes(finalHcpcs)) {
       if (isNeuroEligible) {
          if (finalHcpcs === 'K0843') finalHcpcs = 'K0862'; 
          else finalHcpcs = 'K0861'; 
          
          const targetDetails = allProducts.find(r => r[1].trim() === finalHcpcs); 
          if (targetDetails) {
            finalProduct.hcpcs = finalHcpcs;
            finalProduct.pdfLink = targetDetails[4]; 
            finalProduct.imageUrl = targetDetails[5];
          }
       } 
    } 
    else if (substitutions[finalHcpcs]) {
      const targetHcpcs = substitutions[finalHcpcs];
      const targetIsGroup3 = parseInt(targetHcpcs.replace(/\D/g, ''), 10) >= 848;
      const originalIsGroup2 = parseInt(finalHcpcs.replace(/\D/g, ''), 10) < 848;

      if (originalIsGroup2 && targetIsGroup3 && !isNeuroEligible) {
         finalHcpcs = product.hcpcs.trim(); 
      } else {
         finalHcpcs = targetHcpcs;
         const targetDetails = allProducts.find(r => r[1].trim() === targetHcpcs); 
         if (targetDetails) {
            finalProduct.hcpcs = finalHcpcs;
            finalProduct.pdfLink = targetDetails[4]; 
            finalProduct.imageUrl = targetDetails[5];
         }
      }
    }

    if (!processedMap.has(finalHcpcs)) {
      processedMap.set(finalHcpcs, finalProduct);
    }
  });

  // ======================================================
  // 4. SORT & JUSTIFY
  // ======================================================
  
  const finalResults = Array.from(processedMap.values()).map(p => {
    const hcpcsNum = parseInt(p.hcpcs.replace(/\D/g, ''), 10) || 0;
    
    // --- KEY FIX: DEFINE VARIABLES AT TOP LEVEL OF MAP ---
    // This makes them available to both Group 3 and Group 2 blocks
    const isGroup3 = hcpcsNum >= 848;
    const isComplex = hcpcsNum >= 835;
    const isMPO = (hcpcsNum >= 840 && hcpcsNum <= 843) || (hcpcsNum >= 861 && hcpcsNum <= 864);
    const isSPO = (hcpcsNum >= 835 && hcpcsNum <= 839) || (hcpcsNum >= 856 && hcpcsNum <= 859);

    const isKnownSolid = inherentlySolidCodes.includes(p.hcpcs);
    const seatCode = p.seatType.toLowerCase();
    const sheetSaysSolid = seatCode.includes("s");
    const offersSolid = isKnownSolid || sheetSaysSolid;
    const isCaptainOnly = seatCode.includes("c") && !offersSolid; // NOW DEFINED GLOBALLY
    
    let displayHcpcs = p.hcpcs;
    let justification = "Eligible option";
    
    if (isGroup3) {
      const reasons = [];
      if (hasValidNeuroDiagnosis) reasons.push("Neuro Dx");
      if (patient.hasSpasticity) reasons.push("Spasticity");
      if (qualifiesForHemiplegia) reasons.push(`Hemiplegia (${hemiplegiaSide} Side)`);
      if (patient.hasAmputation) reasons.push("Amputation");
      
      justification = `Medically Necessary Upgrade due to: ${reasons.join(", ")}`;
    } else {
      const solidReasons = [];
      if (patient.hasPressureUlcers) solidReasons.push("Pressure Ulcers");
      if (patient.hasSpineCurvature) solidReasons.push("Spinal Curvature");
      if (patient.hasLowerExtremityNumbness) solidReasons.push("Impaired Sensation");
      if (patient.hasSpasticity) solidReasons.push("Spasticity");
      if (hasValidNeuroDiagnosis) solidReasons.push("Neuro Dx"); 
      if (hasStrokeWeakness && !qualifiesForHemiplegia) solidReasons.push("CVA/Stroke Weakness");
      if (patient.hasAmputation) solidReasons.push("Amputation (Center of Gravity/Pressure Relief)");
      if (patient.usesCatheters) solidReasons.push("Intermittent Catheterization");

      // -- JUSTIFICATION BUILDER --
      
      if (isSPO) {
        const spoReasons = [];
        if (patient.hasSwelling) spoReasons.push("Power Legs (Edema)");
        if (patient.hasPressureUlcers) spoReasons.push("Power Tilt (Pressure Relief)");
        if (patient.hasSpineCurvature || patient.hasAmputation || isNeuroEligible) spoReasons.push("Power Tilt (Positioning/Stability)");
        if (patient.usesCatheters) spoReasons.push("Power Tilt (Catheterization)");
        
        const spoText = spoReasons.length > 0 ? spoReasons.join(", ") : "Power Accessory";
        justification = `Indicated for: ${spoText}`;
      }
      
      if (solidReasons.length > 0 && offersSolid) {
           if (justification === "Eligible option") justification = "";
           else justification += " | ";
           justification += `Solid Seat indicated for: ${solidReasons.join(", ")}`;
      } 
      else if (!isSPO && offersSolid) {
           if (justification === "Eligible option") justification = "Solid Seat";
           else justification += " (Solid Seat)";
      } 
      else if (isCaptainOnly && !isSPO) {
           justification = "Captain's Seat";
      }
      
      if (['K0841', 'K0842', 'K0843'].includes(p.hcpcs)) {
         let subTarget = (p.hcpcs === 'K0843') ? 'K0862' : 'K0861';
         displayHcpcs = `${p.hcpcs} (substitute ${subTarget})`;

         let reason = "MPO";
         if (patient.usesCatheters) reason += " (for Intermittent Cath)";
         
         justification = `${reason} - <span style="text-decoration: underline;">Provide <strong>${subTarget}</strong> as free upgrade</span>`;
      }
      if (['K0800', 'K0801'].includes(p.hcpcs)) {
         justification += " | (if POV eligible)";
      }
    }

    return {
      hcpcs: displayHcpcs, 
      pdfLink: p.pdfLink,
      imageUrl: p.imageUrl,
      category: isComplex ? "Complex" : "Standard",
      sortOrder: hcpcsNum,
      justification: justification
    };
  });

  finalResults.sort((a, b) => b.sortOrder - a.sortOrder);

  return {
    standard: finalResults.filter(p => p.category === "Standard"),
    complex: finalResults.filter(p => p.category === "Complex")
  };
}