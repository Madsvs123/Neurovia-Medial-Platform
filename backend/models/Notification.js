const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['subscription', 'education', 'program', 'clinical_case', 'flashcard', 'doctor_tool', 'quiz', 'course', 'lesson', 'system', 'user', 'payment', 'new_message', 'new_conversation', 'thread_assigned', 'thread_escalated', 'thread_status', 'sla_breach'],
    required: true
  },
  link: {
    type: String,
    default: null
  },
  entityType: {
    type: String,
    default: null
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
