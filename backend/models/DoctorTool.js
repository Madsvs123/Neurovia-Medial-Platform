const mongoose = require('mongoose');

const doctorToolSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  category: { type: String, required: true, trim: true },
  subcategory: { type: String, enum: ['risk', 'formula', 'converter', 'decision', 'algorithm'], default: 'risk' },
  specialty: { type: String, trim: true },
  description: { type: String, required: true, trim: true },
  algorithmId: { type: String, trim: true },
  inputs: [{
    key: String,
    label: String,
    type: { type: String, enum: ['number', 'select', 'boolean', 'text'], default: 'boolean' },
    options: [String],
    required: Boolean,
    defaultValue: mongoose.Schema.Types.Mixed,
    min: Number, max: Number,
  }],
  outputSchema: { type: mongoose.Schema.Types.Mixed },
  documentation: { type: String, trim: true },
  references: [{ title: String, url: String }],
  aiEnabled: { type: Boolean, default: false },
  premiumOnly: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
}, { timestamps: true });

doctorToolSchema.index({ category: 1 }); doctorToolSchema.index({ specialty: 1 }); doctorToolSchema.index({ subcategory: 1 });
doctorToolSchema.index({ algorithmId: 1 });

const DoctorTool = mongoose.model('DoctorTool', doctorToolSchema);
module.exports = DoctorTool;
