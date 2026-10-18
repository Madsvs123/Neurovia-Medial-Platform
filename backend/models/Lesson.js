const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  attachments: [{
    type: String,
    trim: true
  }],
  aiSummary: {
    type: String,
    trim: true
  },
  references: [{
    title: String,
    url: String
  }],
  videoUrl: {
    type: String,
    trim: true
  },
  videoDescription: {
    type: String,
    trim: true,
    maxlength: 500
  },
  estimatedReadTime: {
    type: Number, // in minutes
    min: 1
  },
  order: {
    type: Number,
    required: true,
    min: 0
  },
  published: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
lessonSchema.index({ courseId: 1 });
lessonSchema.index({ order: 1 });

const Lesson = mongoose.model('Lesson', lessonSchema);

module.exports = Lesson;