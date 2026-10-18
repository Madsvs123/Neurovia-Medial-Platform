// utils/medicalAlgorithms.js

/**
 * Comprehensive Medical Algorithms for Doctors
 * Covers multiple specialties: Cardiology, Pulmonology, Nephrology, Endocrinology, 
 * Emergency Medicine, Pediatrics, Hematology, Hepatology, Neurology, and more
 */

const medicalAlgorithms = {
  // ==================== CARDIOLOGY ====================
  
  // CHA2DS2-VASc Score for Stroke Risk in Atrial Fibrillation
  cha2ds2Vasc: (inputs) => {
    const { congestiveHeartFailure, hypertension, age, diabetes, strokeTia, vascularDisease, female } = inputs;
    let score = 0;
    if (congestiveHeartFailure) score += 1;
    if (hypertension) score += 1;
    if (age >= 75) score += 2;
    else if (age >= 65) score += 1;
    if (diabetes) score += 1;
    if (strokeTia) score += 2;
    if (vascularDisease) score += 1;
    if (female) score += 1;
    
    let risk = '';
    if (score === 0) risk = 'Low risk - No anticoagulation recommended';
    else if (score === 1) risk = 'Moderate risk - Consider anticoagulation';
    else risk = 'High risk - Anticoagulation recommended';
    
    return { score, risk, annualStrokeRisk: ['0%', '1.3%', '2.2%', '3.2%', '4.0%', '6.7%', '9.8%', '11.2%', '15.8%'][Math.min(score, 8)] };
  },

  // HAS-BLED Score for Bleeding Risk
  hasBled: (inputs) => {
    const { hypertension, abnormalRenalFunction, abnormalLiverFunction, stroke, bleedingHistory, labileInr, elderly, drugsAlcohol } = inputs;
    let score = 0;
    if (hypertension) score += 1;
    if (abnormalRenalFunction) score += 1;
    if (abnormalLiverFunction) score += 1;
    if (stroke) score += 1;
    if (bleedingHistory) score += 1;
    if (labileInr) score += 1;
    if (elderly) score += 1;
    if (drugsAlcohol) score += 1;
    
    return { score, risk: score >= 3 ? 'High bleeding risk - Caution with anticoagulation' : 'Low bleeding risk' };
  },

  // HEART Score for Major Adverse Cardiac Events
  heartScore: (inputs) => {
    const { history, ecg, age, riskFactors, troponin } = inputs;
    let score = 0;
    if (history === 'highly_suspicious') score += 2;
    else if (history === 'moderately_suspicious') score += 1;
    if (ecg === 'significant_st_depression') score += 2;
    else if (ecg === 'non_specific_repolarization') score += 1;
    if (age >= 65) score += 2;
    else if (age >= 45) score += 1;
    if (riskFactors >= 3) score += 2;
    else if (riskFactors === 1 || riskFactors === 2) score += 1;
    if (troponin >= 3) score += 2;
    else if (troponin === 1 || troponin === 2) score += 1;
    
    let risk = '';
    let recommendation = '';
    if (score <= 3) { risk = 'Low'; recommendation = 'Consider early discharge or observation'; }
    else if (score <= 6) { risk = 'Moderate'; recommendation = 'Observation and stress testing'; }
    else { risk = 'High'; recommendation = 'Consider early invasive strategy'; }
    
    return { score, risk, recommendation, maceRisk6Weeks: score <= 3 ? '1.7%' : score <= 6 ? '12-16.6%' : '>50%' };
  },

  // TIMI Score for NSTEMI/UA
  timiScore: (inputs) => {
    const { age65, cadRiskFactors, knownCad, aspirinUse, anginaSevere, elevatedCardiacMarkers, ecgChanges } = inputs;
    let score = 0;
    if (age65) score += 1;
    if (cadRiskFactors >= 3) score += 1;
    if (knownCad) score += 1;
    if (aspirinUse) score += 1;
    if (anginaSevere >= 2) score += 1;
    if (elevatedCardiacMarkers) score += 1;
    if (ecgChanges) score += 1;
    
    let risk = '';
    let mortalityRisk = '';
    if (score <= 2) { risk = 'Low'; mortalityRisk = '4.7%'; }
    else if (score <= 4) { risk = 'Moderate'; mortalityRisk = '8.3%'; }
    else { risk = 'High'; mortalityRisk = '14.5%'; }
    
    return { score, risk, mortalityRisk14Days: mortalityRisk };
  },

  // Wells Score for DVT
  wellsDvt: (inputs) => {
    const { activeCancer, paralysis, bedridden, tenderness, entireLegSwollen, calfSwelling, pittingEdema, superficialCollaterals, priorDvt, alternativeDiagnosis } = inputs;
    let score = 0;
    if (activeCancer) score += 1;
    if (paralysis || bedridden) score += 1;
    if (tenderness) score += 1;
    if (entireLegSwollen) score += 1;
    if (calfSwelling) score += 1;
    if (pittingEdema) score += 1;
    if (superficialCollaterals) score += 1;
    if (priorDvt) score += 1;
    if (alternativeDiagnosis) score -= 2;
    
    let probability = '';
    if (score <= 0) probability = 'Low (<5%)';
    else if (score <= 2) probability = 'Moderate (17%)';
    else probability = 'High (>50%)';
    
    return { score, probability, recommendation: score >= 2 ? 'Consider ultrasound' : 'Consider D-dimer' };
  },

  // Wells Score for PE
  wellsPe: (inputs) => {
    const { clinicalSymptomsPe, alternativeDiagnosis, tachycardia, immobilization, priorDvtPe, hemoptysis, cancer } = inputs;
    let score = 0;
    if (clinicalSymptomsPe) score += 3;
    if (alternativeDiagnosis) score += 3;
    if (tachycardia) score += 1.5;
    if (immobilization) score += 1.5;
    if (priorDvtPe) score += 1.5;
    if (hemoptysis) score += 1;
    if (cancer) score += 1;
    
    let probability = '';
    if (score <= 2) probability = 'Low (<10%)';
    else if (score <= 6) probability = 'Moderate (30%)';
    else probability = 'High (>60%)';
    
    return { score, probability, recommendation: score > 4 ? 'CTPA recommended' : 'Consider D-dimer' };
  },

  // Framingham Risk Score for 10-year CVD Risk
  framinghamRisk: (inputs) => {
    const { age, gender, totalCholesterol, hdlCholesterol, systolicBp, hypertensionTreatment, smoking, diabetes } = inputs;
    
    // Simplified version - actual Framingham is more complex
    let points = 0;
    // Age points
    if (gender === 'male') {
      if (age >= 20 && age <= 34) points += -9;
      else if (age <= 39) points += -4;
      else if (age <= 44) points += 0;
      else if (age <= 49) points += 3;
      else if (age <= 54) points += 6;
      else if (age <= 59) points += 8;
      else if (age <= 64) points += 10;
      else points += 11;
    } else {
      if (age >= 20 && age <= 34) points += -7;
      else if (age <= 39) points += -3;
      else if (age <= 44) points += 0;
      else if (age <= 49) points += 3;
      else if (age <= 54) points += 6;
      else if (age <= 59) points += 8;
      else if (age <= 64) points += 10;
      else points += 12;
    }
    
    // Total cholesterol points (simplified)
    if (totalCholesterol < 160) points += -3;
    else if (totalCholesterol < 200) points += 0;
    else if (totalCholesterol < 240) points += 2;
    else points += 5;
    
    // HDL points
    if (hdlCholesterol >= 60) points += -2;
    else if (hdlCholesterol >= 50) points += 0;
    else if (hdlCholesterol >= 40) points += 2;
    else points += 4;
    
    // Blood pressure and treatment
    let bpPoints = 0;
    if (systolicBp < 120) bpPoints = 0;
    else if (systolicBp < 130) bpPoints = 1;
    else if (systolicBp < 140) bpPoints = 2;
    else if (systolicBp < 160) bpPoints = 3;
    else bpPoints = 4;
    
    if (hypertensionTreatment) bpPoints += 1;
    points += bpPoints;
    
    if (smoking) points += (gender === 'male' ? 8 : 6);
    if (diabetes) points += (gender === 'male' ? 5 : 4);
    
    let risk = '';
    if (points < 0) risk = '<1%';
    else if (points < 10) risk = '1-5%';
    else if (points < 15) risk = '5-10%';
    else risk = '>10%';
    
    return { score: points, tenYearRisk: risk, pointsBreakdown: { age, cholesterol: totalCholesterol, hdl: hdlCholesterol, smoking, diabetes } };
  },

  // ==================== PULMONOLOGY ====================
  
  // GOLD COPD Classification
  goldCopd: (inputs) => {
    const { fev1Percent, exacerbationsLastYear, mrcDyspneaScore, catScore } = inputs;
    
    let goldGrade = '';
    if (fev1Percent >= 80) goldGrade = 'GOLD 1 - Mild';
    else if (fev1Percent >= 50) goldGrade = 'GOLD 2 - Moderate';
    else if (fev1Percent >= 30) goldGrade = 'GOLD 3 - Severe';
    else goldGrade = 'GOLD 4 - Very Severe';
    
    let exacerbationRisk = '';
    if (exacerbationsLastYear >= 2 || (fev1Percent >= 30 && fev1Percent < 50)) exacerbationRisk = 'High risk (E)';
    else exacerbationRisk = 'Low risk (A/B)';
    
    let symptomLevel = '';
    if ((mrcDyspneaScore >= 2) || (catScore >= 10)) symptomLevel = 'More symptoms (B/D)';
    else symptomLevel = 'Fewer symptoms (A/C)';
    
    let goldGroup = '';
    if (exacerbationRisk === 'Low risk (A/B)' && symptomLevel === 'Fewer symptoms (A/C)') goldGroup = 'A';
    else if (exacerbationRisk === 'Low risk (A/B)' && symptomLevel === 'More symptoms (B/D)') goldGroup = 'B';
    else if (exacerbationRisk === 'High risk (E)' && symptomLevel === 'Fewer symptoms (A/C)') goldGroup = 'C';
    else goldGroup = 'D';
    
    const treatment = {
      'A': 'Bronchodilator (LABA or LAMA)',
      'B': 'LABA + LAMA',
      'C': 'LAMA, consider ICS if frequent exacerbations',
      'D': 'LABA + LAMA + Consider ICS'
    }[goldGroup];
    
    return { goldGrade, goldGroup, exacerbationRisk, symptomLevel, treatmentRecommendation: treatment, fev1Percent };
  },

  // CURB-65 for Pneumonia Severity
  curb65: (inputs) => {
    const { confusion, urea, respiratoryRate, systolicBp, age65 } = inputs;
    let score = 0;
    if (confusion) score += 1;
    if (urea > 7) score += 1;
    if (respiratoryRate >= 30) score += 1;
    if (systolicBp < 90) score += 1;
    if (age65) score += 1;
    
    let mortality = '';
    let disposition = '';
    if (score === 0) { mortality = '0.6%'; disposition = 'Outpatient treatment'; }
    else if (score === 1) { mortality = '2.7%'; disposition = 'Consider hospital admission'; }
    else if (score === 2) { mortality = '6.8%'; disposition = 'Hospital admission recommended'; }
    else { mortality = '>15%'; disposition = 'ICU admission strongly recommended'; }
    
    return { score, mortality30Day: mortality, disposition, urea, respiratoryRate, age65 };
  },

  // PSI/PORT Score for Pneumonia
  psiScore: (inputs) => {
    const { age, gender, nursingHome, comorbidities, alteredMentalStatus, respiratoryRate, systolicBp, temperature, pulse, ph, bun, sodium, glucose, hematocrit, paO2, pleuralEffusion } = inputs;
    
    let score = 0;
    // Demographics
    score += age;
    if (gender === 'female') score -= 10;
    if (nursingHome) score += 10;
    
    // Comorbidities
    if (comorbidities?.liverDisease) score += 20;
    if (comorbidities?.heartFailure) score += 10;
    if (comorbidities?.cerebrovascular) score += 10;
    if (comorbidities?.renalDisease) score += 10;
    
    // Physical exam findings
    if (alteredMentalStatus) score += 20;
    if (respiratoryRate >= 30) score += 20;
    if (systolicBp < 90) score += 20;
    if (temperature < 35 || temperature >= 40) score += 15;
    if (pulse >= 125) score += 10;
    
    // Lab findings
    if (ph < 7.35) score += 30;
    if (bun >= 30) score += 20;
    if (sodium < 130) score += 20;
    if (glucose >= 250) score += 10;
    if (hematocrit < 30) score += 10;
    if (paO2 < 60) score += 10;
    if (pleuralEffusion) score += 10;
    
    let riskClass = '';
    let mortality = '';
    let disposition = '';
    
    if (score <= 50) { riskClass = 'I'; mortality = '0.1%'; disposition = 'Outpatient'; }
    else if (score <= 70) { riskClass = 'II'; mortality = '0.6%'; disposition = 'Outpatient/Short stay'; }
    else if (score <= 90) { riskClass = 'III'; mortality = '2.8%'; disposition = 'Hospital admission'; }
    else if (score <= 130) { riskClass = 'IV'; mortality = '8.2%'; disposition = 'Hospital admission'; }
    else { riskClass = 'V'; mortality = '29.2%'; disposition = 'ICU admission'; }
    
    return { score, riskClass, mortality30Day: mortality, disposition };
  },

  // Asthma Control Test (ACT)
  asthmaControlTest: (inputs) => {
    const { workLimitations, shortnessOfBreath, nocturnalSymptoms, rescueMedicationUse, selfRatedControl } = inputs;
    const score = (workLimitations || 0) + (shortnessOfBreath || 0) + (nocturnalSymptoms || 0) + (rescueMedicationUse || 0) + (selfRatedControl || 0);
    
    let control = '';
    if (score >= 20) control = 'Well controlled';
    else if (score >= 16) control = 'Not well controlled';
    else control = 'Poorly controlled';
    
    return { score, control, recommendation: control === 'Poorly controlled' ? 'Consider step-up therapy' : control === 'Not well controlled' ? 'Review treatment plan' : 'Continue current management' };
  },

  // BODE Index for COPD Prognosis
  bodeIndex: (inputs) => {
    const { bmi, fev1Percent, mrcDyspneaScore, sixMinWalkDistance } = inputs;
    let points = 0;
    
    // BMI points
    if (bmi > 21) points += 0;
    else points += 1;
    
    // FEV1 points
    if (fev1Percent >= 65) points += 0;
    else if (fev1Percent >= 50) points += 1;
    else if (fev1Percent >= 36) points += 2;
    else points += 3;
    
    // MRC points
    if (mrcDyspneaScore === 0 || mrcDyspneaScore === 1) points += 0;
    else if (mrcDyspneaScore === 2) points += 1;
    else if (mrcDyspneaScore === 3) points += 2;
    else points += 3;
    
    // 6MWD points
    if (sixMinWalkDistance >= 350) points += 0;
    else if (sixMinWalkDistance >= 250) points += 1;
    else if (sixMinWalkDistance >= 150) points += 2;
    else points += 3;
    
    let fourYearSurvival = '';
    if (points <= 2) fourYearSurvival = '80%';
    else if (points <= 4) fourYearSurvival = '67%';
    else if (points <= 6) fourYearSurvival = '57%';
    else fourYearSurvival = '18%';
    
    return { score: points, fourYearSurvival, tenYearMortality: points >= 7 ? 'High' : points >= 5 ? 'Moderate' : 'Low' };
  },

  // ==================== NEPHROLOGY ====================
  
  // CKD-EPI eGFR Calculation
  ckdEpi: (inputs) => {
    const { serumCreatinine, age, gender, race } = inputs;
    let gfr = 141;
    let kappa = gender === 'female' ? 0.7 : 0.9;
    let alpha = gender === 'female' ? -0.329 : -0.411;
    
    const scKappa = Math.min(serumCreatinine / kappa, 1);
    const maxScKappa = Math.max(serumCreatinine / kappa, 1);
    
    gfr = gfr * Math.pow(scKappa, alpha) * Math.pow(maxScKappa, -1.209) * Math.pow(0.993, age);
    if (gender === 'female') gfr = gfr * 1.018;
    if (race === 'african_american') gfr = gfr * 1.159;
    
    let stage = '';
    if (gfr >= 90) stage = 'Stage 1 - Normal or high';
    else if (gfr >= 60) stage = 'Stage 2 - Mildly decreased';
    else if (gfr >= 45) stage = 'Stage 3a - Mild to moderate';
    else if (gfr >= 30) stage = 'Stage 3b - Moderate to severe';
    else if (gfr >= 15) stage = 'Stage 4 - Severely decreased';
    else stage = 'Stage 5 - Kidney failure';
    
    return { egfr: Math.round(gfr), stage, serumCreatinine, age };
  },

  // MDRD eGFR
  mdrd: (inputs) => {
    const { serumCreatinine, age, gender, race } = inputs;
    let gfr = 186 * Math.pow(serumCreatinine, -1.154) * Math.pow(age, -0.203);
    if (gender === 'female') gfr = gfr * 0.742;
    if (race === 'african_american') gfr = gfr * 1.212;
    
    return { egfr: Math.round(gfr), method: 'MDRD' };
  },

  // Urine Protein to Creatinine Ratio (UPCR) Interpretation
  upcrInterpretation: (inputs) => {
    const { proteinMg, creatinineMg } = inputs;
    const ratio = proteinMg / creatinineMg;
    
    let severity = '';
    if (ratio < 0.15) severity = 'Normal';
    else if (ratio < 0.5) severity = 'Microalbuminuria';
    else if (ratio < 1) severity = 'Mild proteinuria';
    else if (ratio < 3) severity = 'Moderate proteinuria';
    else severity = 'Nephrotic range proteinuria';
    
    let recommendation = '';
    if (ratio >= 3) recommendation = 'Consider nephrology referral, rule out nephrotic syndrome';
    else if (ratio >= 1) recommendation = 'Monitor renal function, consider ACE inhibitor/ARB';
    else if (ratio >= 0.3) recommendation = 'Early kidney disease, optimize blood pressure and glucose control';
    else recommendation = 'No intervention needed';
    
    return { ratio: ratio.toFixed(2), severity, recommendation };
  },

  // Corrected Calcium Formula
  correctedCalcium: (inputs) => {
    const { serumCalcium, albumin } = inputs;
    const corrected = serumCalcium + 0.8 * (4 - albumin);
    
    let status = '';
    if (corrected < 8.5) status = 'Hypocalcemia';
    else if (corrected > 10.2) status = 'Hypercalcemia';
    else status = 'Normal';
    
    return { correctedCalcium: corrected.toFixed(1), status, formula: `${serumCalcium} + 0.8 × (4 - ${albumin})` };
  },

  // Anion Gap
  anionGap: (inputs) => {
    const { sodium, chloride, bicarbonate } = inputs;
    const gap = sodium - (chloride + bicarbonate);
    
    let interpretation = '';
    if (gap < 7) interpretation = 'Low anion gap - Check for hypoalbuminemia, paraproteins';
    else if (gap <= 12) interpretation = 'Normal anion gap';
    else interpretation = 'High anion gap metabolic acidosis - Consider MUDPILES';
    
    const deltaRatio = gap > 12 && bicarbonate < 22 ? (gap - 12) / (24 - bicarbonate) : null;
    
    let mixedDisorder = '';
    if (deltaRatio && deltaRatio < 0.4) mixedDisorder = 'Hyperchloremic metabolic acidosis';
    else if (deltaRatio && deltaRatio < 0.8) mixedDisorder = 'Mixed high anion gap + hyperchloremic acidosis';
    else if (deltaRatio && deltaRatio < 2) mixedDisorder = 'Pure high anion gap acidosis';
    else if (deltaRatio && deltaRatio > 2) mixedDisorder = 'Concomitant metabolic alkalosis';
    
    return { anionGap: gap, interpretation, deltaRatio: deltaRatio ? deltaRatio.toFixed(2) : null, mixedDisorder };
  },

  // ==================== ENDOCRINOLOGY ====================
  
  // HOMA-IR for Insulin Resistance
  homaIr: (inputs) => {
    const { fastingGlucose, fastingInsulin } = inputs;
    const homaIr = (fastingGlucose * fastingInsulin) / 405;
    
    let insulinResistance = '';
    if (homaIr < 1) insulinResistance = 'Highly sensitive - Below normal';
    else if (homaIr < 2) insulinResistance = 'Normal insulin sensitivity';
    else if (homaIr < 3) insulinResistance = 'Mild insulin resistance';
    else insulinResistance = 'Significant insulin resistance - Metabolic syndrome risk';
    
    return { homaIr: homaIr.toFixed(2), insulinResistance };
  },

  // QUICKI (Quantitative Insulin Sensitivity Check Index)
  quicki: (inputs) => {
    const { fastingGlucose, fastingInsulin } = inputs;
    const quicki = 1 / (Math.log(fastingInsulin) + Math.log(fastingGlucose));
    
    let insulinSensitivity = '';
    if (quicki > 0.45) insulinSensitivity = 'Excellent sensitivity';
    else if (quicki > 0.35) insulinSensitivity = 'Normal sensitivity';
    else if (quicki > 0.3) insulinSensitivity = 'Mild resistance';
    else insulinSensitivity = 'Severe insulin resistance';
    
    return { quicki: quicki.toFixed(3), insulinSensitivity };
  },

  // Thyroid Storm Diagnostic Criteria
  thyroidStorm: (inputs) => {
    const { temperature, tachycardia, heartFailure, atrialFibrillation, giSymptoms, cnsSymptoms, precipitant } = inputs;
    
    let score = 0;
    
    // Temperature
    if (temperature >= 39.4) score += 30;
    else if (temperature >= 38.9) score += 25;
    else if (temperature >= 38.3) score += 20;
    else if (temperature >= 37.8) score += 15;
    
    // Tachycardia
    if (tachycardia >= 140) score += 25;
    else if (tachycardia >= 130) score += 20;
    else if (tachycardia >= 120) score += 15;
    else if (tachycardia >= 100) score += 10;
    
    // Heart failure
    if (heartFailure === 'severe') score += 25;
    else if (heartFailure === 'mild') score += 15;
    
    // Atrial fibrillation
    if (atrialFibrillation) score += 10;
    
    // GI symptoms
    if (giSymptoms === 'severe') score += 20;
    else if (giSymptoms === 'moderate') score += 15;
    
    // CNS symptoms
    if (cnsSymptoms === 'severe') score += 30;
    else if (cnsSymptoms === 'moderate') score += 20;
    else if (cnsSymptoms === 'mild') score += 10;
    
    // Precipitant
    if (precipitant) score += 10;
    
    let diagnosis = '';
    if (score >= 45) diagnosis = 'Thyroid Storm - Strongly Consider';
    else if (score >= 25) diagnosis = 'Impending Storm';
    else diagnosis = 'Unlikely Thyroid Storm';
    
    return { score, diagnosis, recommendation: score >= 45 ? 'Admit to ICU, treat aggressively' : score >= 25 ? 'Monitor closely, consider treatment' : 'Routine management' };
  },

  // ADA Diabetes Classification
  adaDiabetesClassification: (inputs) => {
    const { fastingGlucose, twoHourGlucose, a1c, randomGlucose, symptoms } = inputs;
    
    let diagnosis = '';
    let criteria = [];
    
    // Fasting glucose
    if (fastingGlucose >= 126) {
      diagnosis = 'Diabetes';
      criteria.push('Fasting glucose ≥ 126 mg/dL');
    } else if (fastingGlucose >= 100) {
      diagnosis = diagnosis === '' ? 'Prediabetes (IFG)' : diagnosis;
      criteria.push('Impaired fasting glucose: 100-125 mg/dL');
    }
    
    // 2-hour glucose
    if (twoHourGlucose >= 200) {
      diagnosis = 'Diabetes';
      criteria.push('2-hour OGTT ≥ 200 mg/dL');
    } else if (twoHourGlucose >= 140) {
      diagnosis = diagnosis === '' ? 'Prediabetes (IGT)' : diagnosis;
      criteria.push('Impaired glucose tolerance: 140-199 mg/dL');
    }
    
    // A1C
    if (a1c >= 6.5) {
      diagnosis = 'Diabetes';
      criteria.push('A1C ≥ 6.5%');
    } else if (a1c >= 5.7) {
      diagnosis = diagnosis === '' ? 'Prediabetes' : diagnosis;
      criteria.push('A1C 5.7-6.4%');
    }
    
    // Random glucose with symptoms
    if (randomGlucose >= 200 && symptoms) {
      diagnosis = 'Diabetes';
      criteria.push('Random glucose ≥ 200 mg/dL with symptoms');
    }
    
    if (diagnosis === '') diagnosis = 'Normal';
    
    return { diagnosis, criteria, recommendations: {
      'Normal': 'Routine screening every 3 years',
      'Prediabetes': 'Lifestyle modification, metformin if BMI > 35 or age < 60, screen annually',
      'Prediabetes (IFG)': 'Focus on hepatic glucose production, consider metformin',
      'Prediabetes (IGT)': 'Focus on peripheral insulin resistance, emphasize exercise',
      'Diabetes': 'Start metformin, lifestyle changes, target A1C < 7%'
    }[diagnosis] };
  },

  // ==================== EMERGENCY MEDICINE ====================
  
  // PERC Rule for PE Exclusion
  percRule: (inputs) => {
    const { age50, pulseRate100, o2Sat95, hemoptysis, priorDvtPe, surgeryTrauma, hormoneUse, unilateralLegSwelling } = inputs;
    
    let percPositive = false;
    const percCriteria = [];
    
    if (age50) { percPositive = true; percCriteria.push('Age ≥ 50'); }
    if (pulseRate100) { percPositive = true; percCriteria.push('Pulse ≥ 100'); }
    if (o2Sat95) { percPositive = true; percCriteria.push('O2 sat < 95%'); }
    if (hemoptysis) { percPositive = true; percCriteria.push('Hemoptysis'); }
    if (priorDvtPe) { percPositive = true; percCriteria.push('Prior DVT/PE'); }
    if (surgeryTrauma) { percPositive = true; percCriteria.push('Surgery/trauma within 4 weeks'); }
    if (hormoneUse) { percPositive = true; percCriteria.push('Hormone use'); }
    if (unilateralLegSwelling) { percPositive = true; percCriteria.push('Unilateral leg swelling'); }
    
    return { 
      percRuleMet: percPositive, 
      criteria: percCriteria,
      recommendation: percPositive ? 'PERC positive - Further testing needed' : 'PERC negative - PE unlikely, can defer D-dimer'
    };
  },

  // Canadian CT Head Rule
  canadianCtHead: (inputs) => {
    const { gcs15, vomiting, age65, amnesia, dangerousMechanism, severeHeadache, signsBasilarSkull, focalNeuro, openDepressedSkull, seizure } = inputs;
    
    let ctRequired = false;
    let reasons = [];
    
    // High risk for neurosurgical intervention
    if (gcs15 === false) { ctRequired = true; reasons.push('GCS < 15 at 2 hours'); }
    if (openDepressedSkull) { ctRequired = true; reasons.push('Open/depressed skull fracture'); }
    if (signsBasilarSkull) { ctRequired = true; reasons.push('Signs of basilar skull fracture'); }
    if (focalNeuro) { ctRequired = true; reasons.push('Focal neurologic deficit'); }
    if (seizure) { ctRequired = true; reasons.push('≥ 2 episodes of vomiting'); }
    
    // Medium risk for brain injury
    if (!ctRequired) {
      if (age65) { ctRequired = true; reasons.push('Age ≥ 65'); }
      if (amnesia) { ctRequired = true; reasons.push('Amnesia before impact > 30 min'); }
      if (dangerousMechanism) { ctRequired = true; reasons.push('Dangerous mechanism'); }
      if (severeHeadache) { ctRequired = true; reasons.push('Severe headache'); }
    }
    
    return { ctRequired, reasons, recommendation: ctRequired ? 'CT head recommended' : 'CT may not be necessary, consider observation' };
  },

  // NEXUS Criteria for C-Spine Clearance
  nexusCriteria: (inputs) => {
    const { posteriorMidlineTenderness, intoxication, alteredMentalStatus, focalNeuro, distractingInjury } = inputs;
    
    const meetsCriteria = !posteriorMidlineTenderness && !intoxication && !alteredMentalStatus && !focalNeuro && !distractingInjury;
    
    return {
      cSpineCleared: meetsCriteria,
      criteria: { posteriorMidlineTenderness, intoxication, alteredMentalStatus, focalNeuro, distractingInjury },
      recommendation: meetsCriteria ? 'C-spine clinically cleared, no imaging needed' : 'C-spine imaging required (X-ray or CT)'
    };
  },

  // Ottawa Ankle Rules
  ottawaAnkleRules: (inputs) => {
    const { malMalleolusPain, boneTendernessA, boneTendernessB, unableToBearWeight } = inputs;
    
    let xrayRequired = false;
    let reasons = [];
    
    if (malMalleolusPain) {
      if (boneTendernessA) { xrayRequired = true; reasons.push('Tenderness at lateral malleolus (A)'); }
      if (boneTendernessB) { xrayRequired = true; reasons.push('Tenderness at medial malleolus (B)'); }
      if (unableToBearWeight) { xrayRequired = true; reasons.push('Unable to bear weight for 4 steps'); }
    }
    
    return { xrayRequired, reasons, recommendation: xrayRequired ? 'Ankle X-ray series recommended' : 'X-ray not indicated' };
  },

  // ==================== PEDIATRICS ====================
  
  // NICU Bilirubin Nomogram (Simplified)
  bilirubinRisk: (inputs) => {
    const { ageHours, totalBilirubin, riskFactors } = inputs;
    
    let riskLevel = '';
    let phototherapyThreshold = 0;
    
    // Simplified AAP thresholds (mg/dL)
    const thresholds = {
      '24': { low: 8, medium: 10, high: 12 },
      '36': { low: 10, medium: 13, high: 15 },
      '48': { low: 12, medium: 14, high: 17 },
      '72': { low: 13, medium: 15, high: 18 },
      '96': { low: 14, medium: 16, high: 19 }
    };
    
    const nearestTime = Object.keys(thresholds).reduce((prev, curr) => {
      return Math.abs(curr - ageHours) < Math.abs(prev - ageHours) ? curr : prev;
    });
    
    const threshold = thresholds[nearestTime];
    
    if (totalBilirubin >= threshold.high) riskLevel = 'High risk - Phototherapy indicated';
    else if (totalBilirubin >= threshold.medium) riskLevel = 'Medium risk - Consider phototherapy';
    else if (totalBilirubin >= threshold.low) riskLevel = 'Low risk - Monitor';
    else riskLevel = 'Minimal risk - Routine care';
    
    if (riskFactors) {
      if (riskLevel === 'Low risk - Monitor') riskLevel = 'Medium-high risk - Phototherapy indicated';
    }
    
    return { riskLevel, ageHours, totalBilirubin, phototherapyThreshold: threshold.high };
  },

  // PALS Pediatric Septic Shock
  palsSepticShock: (inputs) => {
    const { hypotension, alteredMentalStatus, delayedCapRefill, weakPeripheralPulses, decreasedUrineOutput, lactate } = inputs;
    
    let shockType = '';
    let management = [];
    
    if (hypotension) {
      shockType = 'Cold shock (hypotensive)';
      management = ['IV/IO access', '20 mL/kg fluid bolus', 'Consider vasoactive support', 'Broad spectrum antibiotics'];
    } else if (alteredMentalStatus || delayedCapRefill) {
      shockType = 'Cold shock (normotensive)';
      management = ['IV/IO access', '20 mL/kg fluid bolus', 'Monitor response', 'Broad spectrum antibiotics'];
    } else if (weakPeripheralPulses) {
      shockType = 'Warm shock';
      management = ['IV/IO access', '20 mL/kg fluid bolus', 'Consider vasopressors', 'Broad spectrum antibiotics'];
    }
    
    if (decreasedUrineOutput) management.push('Place foley catheter, monitor UOP');
    if (lactate && lactate > 2) management.push('Monitor lactate, consider further resuscitation');
    
    return { shockType, management, recommendation: 'Immediate PALS protocol activation' };
  },

  // Pediatric Asthma Score (PRAM)
  pramScore: (inputs) => {
    const { o2Saturation, suprasternalRetractions, scaleneContraction, airEntry, wheezing } = inputs;
    let score = 0;
    
    // Oxygen saturation
    if (o2Saturation <= 92) score += 3;
    else if (o2Saturation <= 95) score += 2;
    
    // Suprasternal retractions
    if (suprasternalRetractions === 'present') score += 2;
    
    // Scalene muscle contraction
    if (scaleneContraction === 'present') score += 2;
    
    // Air entry
    if (airEntry === 'decreased') score += 1;
    else if (airEntry === 'minimal') score += 2;
    
    // Wheezing
    if (wheezing === 'expiratory') score += 1;
    else if (wheezing === 'inspiratory') score += 2;
    else if (wheezing === 'absent') score += 3;
    
    let severity = '';
    let treatment = '';
    if (score <= 3) { severity = 'Mild'; treatment = 'Inhaled SABA, consider discharge'; }
    else if (score <= 7) { severity = 'Moderate'; treatment = 'SABA + ipratropium, oral steroids'; }
    else { severity = 'Severe'; treatment = 'Nebulized SABA q20min, IV steroids, consider mag sulfate'; }
    
    return { score, severity, treatment };
  },

  // ==================== HEMATOLOGY ====================
  
  // DIC Score (International Society on Thrombosis and Haemostasis)
  dicScore: (inputs) => {
    const { plateletCount, fibrinogen, dDimer, ptProlongation } = inputs;
    let score = 0;
    
    // Platelet count
    if (plateletCount > 100) score += 0;
    else if (plateletCount > 50) score += 1;
    else score += 2;
    
    // Fibrinogen
    if (fibrinogen > 100) score += 0;
    else score += 1;
    
    // D-dimer
    if (!dDimer || dDimer === 'no_increase') score += 0;
    else if (dDimer === 'moderate') score += 2;
    else score += 3;
    
    // PT prolongation
    if (ptProlongation < 3) score += 0;
    else if (ptProlongation < 6) score += 1;
    else score += 2;
    
    let probability = '';
    if (score >= 5) probability = 'Overt DIC - Present';
    else if (score >= 3) probability = 'Possible DIC - Repeat scoring';
    else probability = 'Unlikely DIC';
    
    return { score, probability, recommendation: score >= 5 ? 'Treat underlying cause, consider blood products' : 'Monitor closely' };
  },

  // Wells Score for DVT (Duplicate of above but included for completeness)
  
  // CHADS2 Score for Stroke Risk
  chads2Score: (inputs) => {
    const { heartFailure, hypertension, age75, diabetes, strokeTia } = inputs;
    let score = 0;
    if (heartFailure) score += 1;
    if (hypertension) score += 1;
    if (age75) score += 1;
    if (diabetes) score += 1;
    if (strokeTia) score += 2;
    
    let risk = '';
    let recommendation = '';
    if (score === 0) { risk = 'Low'; recommendation = 'Aspirin or no therapy'; }
    else if (score === 1) { risk = 'Moderate'; recommendation = 'Aspirin or warfarin'; }
    else { risk = 'High'; recommendation = 'Warfarin or DOAC'; }
    
    return { score, risk, recommendation, annualStrokeRisk: score === 0 ? '1.9%' : score === 1 ? '2.8%' : '4.0-18.2%' };
  },

  // ==================== HEPATOLOGY ====================
  
  // MELD Score for Liver Transplant Prioritization
  meldScore: (inputs) => {
    const { bilirubin, inr, creatinine, sodium, dialysis } = inputs;
    
    let meld = 0;
    let labScore = 0;
    
    if (dialysis) {
      labScore = 0.957 * Math.log(4) + 0.378 * Math.log(bilirubin) + 1.12 * Math.log(inr);
    } else {
      labScore = 0.957 * Math.log(Math.max(creatinine, 1)) + 0.378 * Math.log(bilirubin) + 1.12 * Math.log(inr);
    }
    
    meld = 10 * (0.8 * labScore + 0.643);
    
    // Sodium adjustment for MELD-Na
    let meldNa = meld;
    if (sodium) {
      if (sodium >= 125 && sodium <= 135) {
        meldNa = meld + 1.32 * (135 - sodium) - 0.282 * (135 - sodium) * sodium / 100;
      } else if (sodium < 125) {
        meldNa = meld + 1.32 * (135 - 125) - 0.282 * (135 - 125) * 125 / 100;
      }
    }
    
    let mortalityRisk = '';
    if (meld <= 9) mortalityRisk = '1.9%';
    else if (meld <= 19) mortalityRisk = '6.0%';
    else if (meld <= 29) mortalityRisk = '19.6%';
    else if (meld <= 39) mortalityRisk = '52.6%';
    else mortalityRisk = '71.3%';
    
    return { meld: Math.round(meld), meldNa: Math.round(meldNa), threeMonthMortality: mortalityRisk };
  },

  // Child-Pugh Score for Cirrhosis
  childPughScore: (inputs) => {
    const { bilirubin, albumin, inr, ascites, encephalopathy } = inputs;
    let score = 0;
    
    // Bilirubin (mg/dL)
    if (bilirubin < 2) score += 1;
    else if (bilirubin < 3) score += 2;
    else score += 3;
    
    // Albumin (g/dL)
    if (albumin > 3.5) score += 1;
    else if (albumin > 2.8) score += 2;
    else score += 3;
    
    // INR
    if (inr < 1.7) score += 1;
    else if (inr < 2.3) score += 2;
    else score += 3;
    
    // Ascites
    if (ascites === 'none') score += 1;
    else if (ascites === 'mild') score += 2;
    else score += 3;
    
    // Encephalopathy
    if (encephalopathy === 'none') score += 1;
    else if (encephalopathy === 'grade1_2') score += 2;
    else score += 3;
    
    let class_ = '';
    let oneYearSurvival = '';
    if (score <= 6) { class_ = 'A'; oneYearSurvival = '100%'; }
    else if (score <= 9) { class_ = 'B'; oneYearSurvival = '80%'; }
    else { class_ = 'C'; oneYearSurvival = '45%'; }
    
    return { score, class: class_, oneYearSurvival, recommendation: class_ === 'C' ? 'Consider liver transplant evaluation' : 'Continue monitoring' };
  },

  // ==================== NEUROLOGY ====================
  
  // NIH Stroke Scale (Simplified)
  nihssSimplified: (inputs) => {
    const { levelOfConsciousness, gaze, visual, facialPalsy, motorArm, motorLeg, ataxia, sensory, language, dysarthria, neglect } = inputs;
    const score = (levelOfConsciousness || 0) + (gaze || 0) + (visual || 0) + (facialPalsy || 0) + 
                  (motorArm || 0) + (motorLeg || 0) + (ataxia || 0) + (sensory || 0) + 
                  (language || 0) + (dysarthria || 0) + (neglect || 0);
    
    let severity = '';
    if (score === 0) severity = 'No stroke';
    else if (score <= 4) severity = 'Minor stroke';
    else if (score <= 15) severity = 'Moderate stroke';
    else if (score <= 20) severity = 'Moderate to severe stroke';
    else severity = 'Severe stroke';
    
    return { score, severity, recommendation: score >= 10 ? 'Consider thrombolytics if within window' : 'Evaluate for intervention' };
  },

  // ABCD2 Score for TIA Stroke Risk
  abcd2Score: (inputs) => {
    const { age60, bp14090, clinicalFeatures, duration, diabetes } = inputs;
    let score = 0;
    
    // Age
    if (age60) score += 1;
    
    // Blood pressure
    if (bp14090) score += 1;
    
    // Clinical features
    if (clinicalFeatures === 'speech_disturbance') score += 1;
    else if (clinicalFeatures === 'unilateral_weakness') score += 2;
    
    // Duration
    if (duration === 10) score += 1;
    else if (duration === 15) score += 2;
    
    // Diabetes
    if (diabetes) score += 1;
    
    let twoDayStrokeRisk = '';
    if (score <= 3) twoDayStrokeRisk = '1.0%';
    else if (score === 4) twoDayStrokeRisk = '4.1%';
    else twoDayStrokeRisk = '8.1%';
    
    let recommendation = '';
    if (score <= 3) recommendation = 'Outpatient management, antiplatelet therapy';
    else if (score === 4) recommendation = 'Consider admission, urgent workup';
    else recommendation = 'Admit to hospital, urgent vascular imaging';
    
    return { score, twoDayStrokeRisk, recommendation };
  }
};

// Get all available algorithms metadata
const getToolsMetadata = () => {
  return Object.keys(medicalAlgorithms).map(key => ({
    algorithmId: key,
    name: key.split(/(?=[A-Z])/).join(' '),
    available: typeof medicalAlgorithms[key] === 'function'
  }));
};

module.exports = medicalAlgorithms;