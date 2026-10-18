const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, enum: ['admin', 'educator', 'student'], required: true },
  message: { type: String, required: true, trim: true, maxlength: 5000 },

  // Per-reader receipts: every participant (other than the sender) who has
  // opened the conversation since this message was sent.
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Legacy single-flag receipt kept for documents created before `readBy`
  // existed. New code only writes `readBy`; `read === true` is treated as
  // "read by everyone" when computing unread counts.
  read: { type: Boolean, default: false },
  readAt: { type: Date, default: null }
}, { timestamps: true });

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ conversationId: 1, sender: 1, readBy: 1 });

module.exports = mongoose.model('Message', messageSchema);
