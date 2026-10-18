const mongoose = require('mongoose');

const medicalTemplateSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, unique: true },
  specialty: { type: String, trim: true },
  templateType: { type: String, required: true, trim: true,
    enum: ['examination', 'history', 'soap', 'note', 'referral', 'discharge', 'prescription', 'procedure']
  },
  category: { type: String, trim: true },
  content: { type: String, required: true, trim: true },
  sections: [{
    heading: String,
    body: String,
    order: Number,
  }],
  variables: [{
    name: String,
    label: String,
    dataType: { type: String, enum: ['text', 'number', 'select', 'boolean', 'date'], default: 'text' },
    options: [String],
    required: Boolean,
  }],
  version: { type: Number, default: 1 },
  tags: [{ type: String, trim: true }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  public: { type: Boolean, default: false },
}, { timestamps: true });

medicalTemplateSchema.index({ specialty: 1 }); medicalTemplateSchema.index({ templateType: 1 });
medicalTemplateSchema.index({ tags: 1 }); medicalTemplateSchema.index({ category: 1 });

const MedicalTemplate = mongoose.model('MedicalTemplate', medicalTemplateSchema);
module.exports = MedicalTemplate;
