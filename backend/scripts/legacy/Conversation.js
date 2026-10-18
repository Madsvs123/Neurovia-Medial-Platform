const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  subject: { type: String, required: true, trim: true, maxlength: 200 },
  category: { type: String, enum: ['general', 'support', 'clinical', 'technical', 'billing', 'other'], default: 'general' },
  status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed', 'pending-user', 'pending-admin'], default: 'open' },
  lastMessage: {
    text: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  lastMessageAt: { type: Date, default: Date.now },
  messageCount: { type: Number, default: 0 },
  resolvedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // The staff member (admin/educator) who owns this ticket. Set the first
  // time a staff member joins/is added; used to remove a ticket from the
  // shared queue as soon as someone picks it up (instead of waiting for a
  // reply), preventing two agents from working the same ticket.
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // Soft delete: per-user hide list. A conversation is only hard-deleted
  // (together with its messages) once every participant has deleted it.
  // Any new message clears this list, so a conversation "comes back" for
  // anyone who had hidden it when there is new activity.
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ assignedTo: 1, status: 1 });
module.exports = mongoose.model('Conversation', conversationSchema);
