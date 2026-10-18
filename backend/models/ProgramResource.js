const mongoose = require('mongoose');

const programResourceSchema = new mongoose.Schema({
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program',
    required: true
  },
  resourceType: {
    type: String,
    enum: ['quiz', 'clinical_case', 'course', 'flashcard'],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  }
}, {
  timestamps: true
});

// Indexes
programResourceSchema.index({ programId: 1 });
programResourceSchema.index({ resourceType: 1 });

const ProgramResource = mongoose.model('ProgramResource', programResourceSchema);

module.exports = ProgramResource;