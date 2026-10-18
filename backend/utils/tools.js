// ───────────────────────────────────────────────────────
// Medical Algorithms & Calculation Tools
// Used by Doctor Tools in the backend and available for
// frontend import for client-side calculations.
// ───────────────────────────────────────────────────────

// ── Risk Scores ────────────────────────────

/** CHA2DS2‑VASc — Atrial Fibrillation Stroke Risk */
exports.calcCha2ds2Vasc = ({ age, sex, chf, hypertension, strokeTia, vascularDisease, diabetes }) => {
  let s = (age >= 75 ? 2 : age >= 65 ? 1 : 0) + (sex === 'female' ? 1 : 0);
  if (chf) s += 1; if (hypertension) s += 1; if (strokeTia) s += 2;
  if (vascularDisease) s += 1; if (diabetes) s += 1;
  return { score: s, risk: s >= 2 ? 'High (anticoagulate)' : s === 1 ? 'Moderate' : 'Low', maxScore: 9 };
};

/** HAS‑BLED — Bleeding Risk (Atrial Fibrillation) */
exports.calcHasBled = ({ hypertension, renal, liver, stroke, bleeding, labileInr, elderly, drugs, alcohol }) =>
  [hypertension, renal, liver, stroke, bleeding, labileInr, elderly, drugs, alcohol]
    .filter(Boolean).reduce((s, v) => s + (v === true ? 1 : 0), 0);

/** CURB‑65 — Pneumonia Severity */
exports.calcCurb65 = ({ confusion, bun, respRate, bp, age65 }) => {
  let s = 0;
  if (confusion) s += 1; if (bun > 19) s += 1; if (respRate >= 30) s += 1;
  if (bp?.systolic < 90 || bp?.diastolic <= 60) s += 1; if (age65) s += 1;
  const risk = s === 0 ? 'Low (outpatient)' : s <= 2 ? 'Moderate (admit)' : 'Severe (ICU)';
  return { score: s, risk, maxScore: 5 };
};

/** Glasgow Coma Scale (GCS) */
exports.calcGCS = ({ eye, verbal, motor }) => {
  const eyeScore = { none: 1, pain: 2, speech: 3, spontaneous: 4 }[eye] || 0;
  const verbalScore = { none: 1, sounds: 2, words: 3, confused: 4, oriented: 5 }[verbal] || 0;
  const motorScore = { none: 1, extension: 2, flexion: 3, withdraw: 4, localize: 5, obeys: 6 }[motor] || 0;
  const total = eyeScore + verbalScore + motorScore;
  const severity = total >= 13 ? 'Mild' : total >= 9 ? 'Moderate' : 'Severe';
  return { total, eye: eyeScore, verbal: verbalScore, motor: motorScore, severity };
};

/** Wells Criteria — DVT Probability */
exports.calcWellsDVT = ({ activeCancer, paralysisPlegia, recentSurgery, calfSwelling, collateralVeins, pittingEdema, entireLegSwollen, pain, alternativeDxMoreLikely }) => {
  let s = 0;
  if (activeCancer) s += 1; if (paralysisPlegia || recentSurgery) s += 1.5;
  if (calfSwelling) s += 1; if (collateralVeins) s += 1; if (pittingEdema) s += 1;
  if (entireLegSwollen) s += 1; if (pain) s += 1; if (alternativeDxMoreLikely) s -= 2;
  const risk = s === 0 ? 'Low' : s <= 2 ? 'Moderate' : 'High';
  return { score: s, risk };
};

/** Wells Criteria — PE Probability */
exports.calcWellsPE = ({ dvtSymptoms, peMostLikely, hr100, immobilization, hemoptysis, cancer, alternativeDxLessLikely }) => {
  let s = 0;
  if (dvtSymptoms) s += 3; if (peMostLikely) s += 3; if (hr100) s += 1.5;
  if (immobilization) s += 1.5; if (hemoptysis) s += 1; if (cancer) s += 1;
  if (alternativeDxLessLikely) s += 3;
  const risk = s <= 4 ? 'PE unlikely' : 'PE likely';
  return { score: s, risk, maxScore: 12.5 };
};

/** NIH Stroke Scale (simplified) */
exports.calcNIHSS = ({ loc, locQuestions, locCommands, gaze, visual, facial, motorArm, motorLeg, ataxia, sensory, language, dysarthria, extinction }) => {
  const fields = [loc, locQuestions, locCommands, gaze, visual, facial, motorArm, motorLeg, ataxia, sensory, language, dysarthria, extinction];
  const total = fields.reduce((s, v) => s + (Number(v) || 0), 0);
  const severity = total <= 4 ? 'Minor' : total <= 15 ? 'Moderate' : total <= 20 ? 'Moderate–Severe' : 'Severe';
  return { total, severity, maxScore: 42 };
};

// ── Predictive Formulas ────────────────────

/** eGFR — CKD‑EPI (creatinine) */
exports.calcEGFR = ({ creatinine, age, sex }) => {
  const cr = Number(creatinine) || 1;
  const ag = Number(age) || 40;
  const isMale = sex === 'male';
  const kappa = isMale ? 0.9 : 0.7;
  const alpha = isMale ? -0.411 : -0.329;
  const ratio = cr / kappa;
  const minTerm = Math.pow(Math.min(ratio, 1), alpha);
  const maxTerm = Math.pow(Math.max(ratio, 1), -1.209);
  const sexFactor = isMale ? 1 : 1.018;
  return { egfr: Math.round(141 * minTerm * maxTerm * 0.993 ** ag * sexFactor * 100) / 100 };
};

/** BMI */
exports.calcBMI = ({ weightKg, heightCm }) => {
  const h = Number(heightCm) / 100;
  const w = Number(weightKg);
  if (!h || !w) return { error: 'Invalid height or weight' };
  const bmi = w / (h * h);
  const category = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : bmi < 35 ? 'Obese I' : bmi < 40 ? 'Obese II' : 'Obese III';
  return { bmi: Math.round(bmi * 10) / 10, category };
};

/** Anion Gap */
exports.calcAnionGap = ({ na, cl, hco3 }) => ({
  anionGap: Number(na) - (Number(cl) + Number(hco3)),
  interpretation: (Number(na) - (Number(cl) + Number(hco3))) > 12 ? 'Elevated (high anion gap metabolic acidosis)' : 'Normal'
});

/** MELD Score (liver) */
exports.calcMELD = ({ bilirubin, inr, creatinine, dialysis }) => {
  const b = Math.max(Number(bilirubin) || 1, 1);
  const i = Math.max(Number(inr) || 1, 1);
  let cr = Math.max(Number(creatinine) || 1, 1);
  if (dialysis) cr = 4;
  const score = Math.round(3.78 * Math.log(b) + 11.2 * Math.log(i) + 9.57 * Math.log(cr) + 6.43);
  return { meld: Math.min(score, 40), mortality: score >= 25 ? 'High' : score >= 19 ? 'Moderate' : 'Low' };
};

/** APACHE II Simplified Mortality */
exports.calcApacheMortality = ({ apacheScore, age, chronicHealthPoints }) => {
  const s = (Number(apacheScore) || 0) + (Number(age) || 0) + (Number(chronicHealthPoints) || 0);
  const mortality = s < 10 ? '<15%' : s < 20 ? '15-40%' : s < 30 ? '40-70%' : '>70%';
  return { total: s, mortality };
};

/** TIMI Score — NSTEMI */
exports.calcTIMI = ({ age65, cadRisk, sten50, ecgSt, angina2, aspirin7d, cardiacEnzymes }) => {
  let s = 0;
  if (age65) s += 1; if (cadRisk >= 3) s += 1; if (sten50) s += 1;
  if (ecgSt) s += 1; if (angina2) s += 1; if (aspirin7d) s += 1; if (cardiacEnzymes) s += 1;
  const risk = s <= 2 ? 'Low' : s <= 4 ? 'Moderate' : 'High';
  return { score: s, risk, maxScore: 7 };
};

/** qSOFA — Sepsis */
exports.calcqSOFA = ({ rr, sbp, mentalStatus }) => {
  let s = 0;
  if (rr >= 22) s += 1; if (sbp <= 100) s += 1; if (mentalStatus) s += 1;
  return { score: s, risk: s >= 2 ? 'High (suspect sepsis)' : 'Low', maxScore: 3 };
};

/** FRAX 10‑year fracture probability (simplified) */
exports.summaryFraxCategories = () => ({
  majorFracture: 'Age, sex, BMI, prior fracture, parental hip fracture, smoking, glucocorticoids, RA, secondary osteoporosis, alcohol ≥3 units/day',
  hipFracture: 'Same + BMD at femoral neck',
  note: 'Use actual FRAX online tool for precise calculation: https://www.sheffield.ac.uk/FRAX/'
});

// ── Unit Converters ────────────────────────

exports.convertUnits = (value, from, to) => {
  // Temperature
  if (from === 'c' && to === 'f') return { value: value * 9 / 5 + 32, unit: '°F' };
  if (from === 'f' && to === 'c') return { value: (value - 32) * 5 / 9, unit: '°C' };
  // Pressure
  if (from === 'mmHg' && to === 'kPa') return { value: value * 0.133322, unit: 'kPa' };
  if (from === 'kPa' && to === 'mmHg') return { value: value / 0.133322, unit: 'mmHg' };
  // Glucose
  if (from === 'mgdL' && to === 'mmolL') return { value: value / 18.0182, unit: 'mmol/L' };
  if (from === 'mmolL' && to === 'mgdL') return { value: value * 18.0182, unit: 'mg/dL' };
  // Creatinine
  if (from === 'mgdL' && to === 'umolL') return { value: value * 88.4, unit: 'µmol/L' };
  if (from === 'umolL' && to === 'mgdL') return { value: value / 88.4, unit: 'mg/dL' };
  // Length
  if (from === 'cm' && to === 'in') return { value: value / 2.54, unit: 'in' };
  if (from === 'in' && to === 'cm') return { value: value * 2.54, unit: 'cm' };
  // Weight
  if (from === 'kg' && to === 'lb') return { value: value * 2.20462, unit: 'lb' };
  if (from === 'lb' && to === 'kg') return { value: value / 2.20462, unit: 'kg' };
  return { error: 'Unsupported conversion' };
};

// ── Clinical Decision Rules ────────────────

/** CENTOR criteria — Strep Pharyngitis */
exports.calcCentor = ({ fever, tonsillarExudate, tenderLymph, noCough, ageCat }) => {
  let s = 0;
  if (fever) s += 1; if (tonsillarExudate) s += 1; if (tenderLymph) s += 1; if (noCough) s += 1;
  if (ageCat === '3-14') s += 1; else if (ageCat === '15-44') s += 0; else if (ageCat >= 45) s -= 1;
  const rec = s <= 1 ? 'No antibiotic / test' : s <= 2 ? 'Culture / rapid test' : s >= 3 ? 'Treat empirically' : '';
  return { score: s, recommendation: rec, maxScore: 5 };
};

/** Ottawa Ankle Rules */
exports.calcOttawaAnkle = ({ malleolarPain, inabilityWeightBear, boneTenderness, age55 }) => {
  const needsXRay = age55 || inabilityWeightBear || boneTenderness || malleolarPain;
  return { needsXRay: !!needsXRay, recommendation: needsXRay ? 'X-ray indicated' : 'X-ray not needed' };
};

// ── Drug Dosage Calculators ─────────────────

exports.calcCreatinineClearance = ({ age, weightKg, creatinine, sex }) => {
  const cr = Number(creatinine) || 1; const w = Number(weightKg) || 70; const a = Number(age) || 40;
  const crCl = ((140 - a) * w) / (72 * cr);
  return { creatinineClearance: sex === 'female' ? Math.round(crCl * 0.85) : Math.round(crCl), unit: 'mL/min' };
};

// ── Meta ────────────────────────────────────

/** Returns metadata for all available tools */
exports.getToolsMetadata = () => ({
  riskScores: [
    { id: 'cha2ds2vasc', name: 'CHA₂DS₂‑VASc', specialty: 'Cardiology', inputs: 7, category: 'risk' },
    { id: 'hasBled', name: 'HAS‑BLED', specialty: 'Cardiology', inputs: 9, category: 'risk' },
    { id: 'curb65', name: 'CURB‑65', specialty: 'Pulmonology', inputs: 5, category: 'risk' },
    { id: 'gcs', name: 'Glasgow Coma Scale', specialty: 'Neurology', inputs: 3, category: 'risk' },
    { id: 'wellsDVT', name: 'Wells DVT', specialty: 'Vascular', inputs: 9, category: 'risk' },
    { id: 'wellsPE', name: 'Wells PE', specialty: 'Pulmonology', inputs: 7, category: 'risk' },
    { id: 'nihss', name: 'NIH Stroke Scale', specialty: 'Neurology', inputs: 13, category: 'risk' },
    { id: 'timi', name: 'TIMI (NSTEMI)', specialty: 'Cardiology', inputs: 7, category: 'risk' },
    { id: 'qsofa', name: 'qSOFA', specialty: 'Emergency', inputs: 3, category: 'risk' },
    { id: 'centor', name: 'CENTOR (Strep)', specialty: 'ENT', inputs: 5, category: 'risk' },
    { id: 'ottawaAnkle', name: 'Ottawa Ankle', specialty: 'Orthopedics', inputs: 4, category: 'decision' },
  ],
  formulas: [
    { id: 'egfr', name: 'eGFR (CKD‑EPI)', specialty: 'Nephrology', inputs: 3, category: 'formula' },
    { id: 'bmi', name: 'BMI', specialty: 'General', inputs: 2, category: 'formula' },
    { id: 'anionGap', name: 'Anion Gap', specialty: 'General', inputs: 3, category: 'formula' },
    { id: 'meld', name: 'MELD Score', specialty: 'Hepatology', inputs: 4, category: 'formula' },
    { id: 'creatinineClearance', name: 'CrCl (Cockcroft‑Gault)', specialty: 'Nephrology', inputs: 4, category: 'formula' },
  ],
  converters: [
    { id: 'temp', name: 'Temperature (°C ↔ °F)', category: 'converter' },
    { id: 'pressure', name: 'Pressure (mmHg ↔ kPa)', category: 'converter' },
    { id: 'glucose', name: 'Glucose (mg/dL ↔ mmol/L)', category: 'converter' },
    { id: 'creatinineConvert', name: 'Creatinine (mg/dL ↔ µmol/L)', category: 'converter' },
    { id: 'height', name: 'Height (cm ↔ in)', category: 'converter' },
    { id: 'weight', name: 'Weight (kg ↔ lb)', category: 'converter' },
  ],
});
