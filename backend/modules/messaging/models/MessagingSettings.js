const mongoose = require('mongoose');
const { DEFAULT_ROUTING, DEFAULT_SLA } = require('../config');

/**
 * Singleton document holding admin-editable routing rules and SLA targets.
 * Falls back to the code defaults in config.js when absent, so a fresh
 * deployment works with zero setup.
 */
const messagingSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  routing: { type: mongoose.Schema.Types.Mixed, default: () => DEFAULT_ROUTING },
  sla: { type: mongoose.Schema.Types.Mixed, default: () => DEFAULT_SLA },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

messagingSettingsSchema.statics.getSingleton = async function getSingleton() {
  let doc = await this.findOne({ key: 'default' });
  if (!doc) doc = await this.create({ key: 'default' });
  return doc;
};

module.exports = mongoose.models.MessagingSettings
  || mongoose.model('MessagingSettings', messagingSettingsSchema);
