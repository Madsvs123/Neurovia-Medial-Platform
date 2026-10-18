const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * A message inside a Thread.
 *
 *  kind = 'text'   — a normal message visible to every participant
 *  kind = 'note'   — internal staff note; NEVER returned to students (filtered
 *                    in messageService, not in the UI)
 *  kind = 'system' — generated audit entries ("Alice joined", "status → resolved",
 *                    "escalated to Billing"), rendered inline in the timeline
 *
 * Deleting a message leaves a tombstone (deletedAt set, body cleared) so the
 * conversation history stays coherent for the other party.
 */
const threadMessageSchema = new Schema({
  thread: { type: Schema.Types.ObjectId, ref: 'Thread', required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // null for system messages
  kind: { type: String, enum: ['text', 'note', 'system'], default: 'text' },
  body: { type: String, default: '', trim: true, maxlength: 10000 },
  // structured payload for system messages, e.g. { event: 'status', from: 'open', to: 'resolved' }
  meta: { type: Schema.Types.Mixed, default: null },
  attachments: [{
    url: String,
    name: String,
    size: Number,
    mimeType: String,
  }],
  editedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

threadMessageSchema.index({ thread: 1, createdAt: -1 });

module.exports = mongoose.model('ThreadMessage', threadMessageSchema);
