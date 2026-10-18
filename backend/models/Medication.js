const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  genericName: { type: String, required: true, trim: true },
  brandNames: [{ type: String, trim: true }],
  drugClass: { type: String, required: true, trim: true },
  mechanismOfAction: { type: String, trim: true },
  indications: { type: String, required: true, trim: true },
  relatedDiseaseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Disease' }],
  dosage: { type: String, trim: true },
  dosageForms: [{ type: String, trim: true }],
  route: { type: String, trim: true },
  halfLife: { type: String, trim: true },
  onsetOfAction: { type: String, trim: true },
  duration: { type: String, trim: true },
  contraindications: { type: String, trim: true },
  sideEffects: [{ type: String, trim: true }],
  seriousSideEffects: [{ type: String, trim: true }],
  interactions: [{ type: String, trim: true }],
  warnings: { type: String, trim: true },
  pregnancyCategory: { type: String, trim: true },
  pediatricDosage: { type: String, trim: true },
  geriatricDosage: { type: String, trim: true },
  renalDosage: { type: String, trim: true },
  hepaticDosage: { type: String, trim: true },
  monitoring: { type: String, trim: true },
  overdose: { type: String, trim: true },
  references: [{ title: String, url: String }],
  tags: [{ type: String, trim: true }]
}, { timestamps: true });

medicationSchema.index({ genericName: 1 }); medicationSchema.index({ drugClass: 1 });
medicationSchema.index({ tags: 1 });

const Medication = mongoose.model('Medication', medicationSchema);
module.exports = Medication;
