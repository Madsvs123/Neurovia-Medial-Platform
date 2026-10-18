const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topic: {
    type: String,
    required: true,
    trim: true
  },
  front: {
    type: String,
    required: true,
    trim: true
  },
  back: {
    type: String,
    required: true,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  nextReviewDate: {
    type: Date
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  masteryLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes
flashcardSchema.index({ userId: 1 });
flashcardSchema.index({ topic: 1 });

const Flashcard = mongoose.model('Flashcard', flashcardSchema);

module.exports = Flashcard;