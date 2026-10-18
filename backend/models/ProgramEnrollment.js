const mongoose = require('mongoose');

const programEnrollmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program',
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  accessExpiration: {
    type: Date
  },
  unlockedResources: [{
    resourceType: {
      type: String,
      enum: ['quiz', 'clinical_case', 'course']
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId
    }
  }]
}, {
  timestamps: true
});

// Compound index
programEnrollmentSchema.index({ userId: 1, programId: 1 }, { unique: true });

const ProgramEnrollment = mongoose.model('ProgramEnrollment', programEnrollmentSchema);

module.exports = ProgramEnrollment;