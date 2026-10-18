const mongoose = require('mongoose');
const slugify = require('slugify');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    unique: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  specialty: {
    type: String,
    required: true,
    trim: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  thumbnail: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program'
  },
  published: {
    type: Boolean,
    default: false
  },
  videoUrl: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  language: {
    type: String,
    default: 'en'
  },
  estimatedDuration: {
    type: Number, // in minutes
    min: 1
  },
  enrollmentCount: {
    type: Number,
    default: 0,
    min: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  }
}, {
  timestamps: true
});

// Create slug before saving
courseSchema.pre('save', function(next) {
  if (!this.slug || this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

// Indexes (slug is already indexed via unique: true)
courseSchema.index({ category: 1 });
courseSchema.index({ specialty: 1 });
courseSchema.index({ tags: 1 });

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;