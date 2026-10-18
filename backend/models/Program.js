const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  programType: {
    type: String,
    enum: ['free_access', 'discount_access', 'quiz_bundle', 'clinical_cases_bundle', 'premium_unlock'],
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  freeAccess: {
    type: Boolean,
    default: false
  },
  maxUsers: {
    type: Number,
    min: 1
  },
  currentUsers: {
    type: Number,
    default: 0,
    min: 0
  },
  expiresAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerType: {
    type: String,
    enum: ['educator', 'site'],
    required: true,
    default: 'site'
  },
  isEditableByEducator: {
    type: Boolean,
    default: false
  },
  educators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Indexes (code is already indexed via unique: true)
programSchema.index({ active: 1 });
programSchema.index({ expiresAt: 1 });

const Program = mongoose.model('Program', programSchema);

module.exports = Program;