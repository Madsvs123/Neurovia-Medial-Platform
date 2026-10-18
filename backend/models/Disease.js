const mongoose = require('mongoose');

const diseaseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  icd10Code: { type: String, trim: true },
  specialty: { type: String, required: true, trim: true },
  bodySystem: { type: String, trim: true },
  severity: { type: String, enum: ['acute', 'chronic', 'both'], default: 'acute' },
  description: { type: String, required: true, trim: true },
  epidemiology: { type: String, trim: true },
  symptoms: [{ type: String, trim: true }],
  causes: { type: String, trim: true },
  riskFactors: [{ type: String, trim: true }],
  diagnosis: { type: String, trim: true },
  diagnosticTests: [{ type: String, trim: true }],
  differentialDiagnosis: [{ type: String, trim: true }],
  treatment: { type: String, trim: true },
  medications: [{ type: String, trim: true }],
  relatedMedicationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Medication' }],
  prognosis: { type: String, trim: true },
  prevention: { type: String, trim: true },
  complications: { type: String, trim: true },
  redFlags: [{ type: String, trim: true }],
  references: [{ title: String, url: String }],
  imageUrl: { type: String, trim: true },
  tags: [{ type: String, trim: true }]
}, { timestamps: true });

diseaseSchema.index({ specialty: 1 }); diseaseSchema.index({ tags: 1 }); diseaseSchema.index({ bodySystem: 1 });
diseaseSchema.index({ icd10Code: 1 });

const Disease = mongoose.model('Disease', diseaseSchema);
module.exports = Disease;
