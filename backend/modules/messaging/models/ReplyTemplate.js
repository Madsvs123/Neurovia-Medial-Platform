const mongoose = require('mongoose');

/**
 * Quick-reply templates for staff. Previously hard-coded in the frontend;
 * now managed by admins from Settings → Messaging and filtered per role
 * (`audience`) so, e.g., billing/refund language never reaches educators.
 */
const replyTemplateSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 80 },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
  category: { type: String, default: 'General', trim: true, maxlength: 40 },
  audience: { type: [String], enum: ['admin', 'educator'], default: ['admin', 'educator'] },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

replyTemplateSchema.index({ active: 1, order: 1 });

module.exports = mongoose.model('ReplyTemplate', replyTemplateSchema);
