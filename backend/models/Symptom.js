const mongoose = require('mongoose');

const symptomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  description: { type: String, trim: true },
  severity: { type: String, enum: ['mild', 'moderate', 'severe', 'variable'], default: 'variable' },
  duration: { type: String, trim: true },
  specialty: { type: String, trim: true },
  bodySystem: { type: String, trim: true },
  associatedSigns: [{ type: String, trim: true }],
  redFlags: [{ type: String, trim: true }],
  relatedDiseases: [{ type: String, trim: true }],
  relatedDiseaseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Disease' }],
  differentialDiagnosis: [{ type: String, trim: true }],
  relatedSymptoms: [{ type: String, trim: true }],
  references: [{ title: String, url: String }],
  tags: [{ type: String, trim: true }]
}, { timestamps: true });

symptomSchema.index({ specialty: 1 }); symptomSchema.index({ bodySystem: 1 });
symptomSchema.index({ tags: 1 });

const Symptom = mongoose.model('Symptom', symptomSchema);
module.exports = Symptom;
