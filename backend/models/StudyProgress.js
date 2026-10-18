const mongoose = require('mongoose');

const studyProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  completedLessons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  }],
  completedQuizzes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  }],
  progressPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  timeSpent: {
    type: Number, // in minutes
    default: 0,
    min: 0
  },
  lastStudiedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index
studyProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const StudyProgress = mongoose.model('StudyProgress', studyProgressSchema);

module.exports = StudyProgress;