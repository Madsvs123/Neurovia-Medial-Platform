const mongoose = require('mongoose');

const clinicalCaseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  specialty: {
    type: String,
    required: true,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  patientHistory: {
    type: String,
    required: true,
    trim: true
  },
  symptoms: [{
    type: String,
    trim: true
  }],
  physicalExam: [{
    type: String,
    trim: true
  }],
  labResults: [{
    type: String,
    trim: true
  }],
  diagnosis: {
    type: String,
    required: true,
    trim: true
  },
  treatmentPlan: {
    type: String,
    required: true,
    trim: true
  },
  discussion: {
    type: String,
    trim: true
  },
  references: [{
    title: String,
    url: String
  }],
  premiumOnly: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
clinicalCaseSchema.index({ specialty: 1 });
clinicalCaseSchema.index({ difficulty: 1 });
clinicalCaseSchema.index({ premiumOnly: 1 });

const ClinicalCase = mongoose.model('ClinicalCase', clinicalCaseSchema);

module.exports = ClinicalCase;
