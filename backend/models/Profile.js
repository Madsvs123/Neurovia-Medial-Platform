const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500
  },
  country: {
    type: String,
    trim: true
  },
  languages: [{
    type: String,
    trim: true
  }],
  profession: {
    type: String,
    required: true,
    trim: true
  },
  specialization: {
    type: String,
    trim: true
  },
  university: {
    type: String,
    trim: true
  },
  yearsExperience: {
    type: Number,
    min: 0,
    max: 100
  },
  skills: [{
    type: String,
    trim: true
  }],
  interests: [{
    type: String,
    trim: true
  }],
  socialLinks: {
    twitter: String,
    linkedin: String,
    facebook: String,
    instagram: String
  }
}, {
  timestamps: true
});

// Indexes
profileSchema.index({ profession: 1 });
profileSchema.index({ specialization: 1 });

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;