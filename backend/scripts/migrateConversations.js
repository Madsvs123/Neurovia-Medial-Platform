/**
 * One-off migration for the support/conversation overhaul.
 *
 *   node scripts/migrateConversations.js [--dry-run]
 *
 * 1. Conversations: back-fill `assignedTo` with the first staff participant
 *    so already-handled tickets do not reappear in the queue, and default
 *    `isDeleted: false`.
 * 2. Messages: ensure `readBy` exists. Legacy `read: true` documents are left
 *    as-is (the API treats them as read by everyone).
 * 3. Notifications: rewrite legacy `/conversations/:id` links for admin and
 *    educator recipients to their panel paths.
 */
const { config } = require('../config/config');
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { conversationLink } = require('../utils/conversationPolicy');

const dryRun = process.argv.includes('--dry-run');

async function run() {
  await mongoose.connect(config.database.uri, { dbName: config.database.dbName, ...config.database.options });
  console.log(`Connected. ${dryRun ? '(dry run — no writes)' : ''}`);

  // 1. Conversations
  const staffIds = new Set((await User.find({ role: { $in: ['admin', 'educator'] } }).select('_id')).map(u => String(u._id)));
  const conversations = await Conversation.find({ $or: [{ assignedTo: { $exists: false } }, { assignedTo: null }, { isDeleted: { $exists: false } }] });
  let assigned = 0;
  for (const c of conversations) {
    const staff = (c.participants || []).find(p => staffIds.has(String(p)));
    const update = {};
    if (!c.assignedTo && staff) { update.assignedTo = staff; assigned += 1; }
    if (c.isDeleted === undefined) update.isDeleted = false;
    if (Object.keys(update).length && !dryRun) await Conversation.updateOne({ _id: c._id }, { $set: update });
  }
  console.log(`Conversations scanned: ${conversations.length}, assignedTo back-filled: ${assigned}`);

  // 2. Messages
  const msgResult = dryRun
    ? { modifiedCount: await Message.countDocuments({ readBy: { $exists: false } }) }
    : await Message.updateMany({ readBy: { $exists: false } }, { $set: { readBy: [] } });
  console.log(`Messages given readBy[]: ${msgResult.modifiedCount}`);

  // 3. Notifications
  const legacy = await Notification.find({ link: /^\/conversations\/[a-f0-9]{24}$/ }).populate('userId', 'role');
  let rewritten = 0;
  for (const n of legacy) {
    const role = n.userId?.role;
    if (!role || role === 'student') continue;
    const id = n.link.split('/').pop();
    const link = conversationLink(role, id);
    if (link !== n.link) {
      rewritten += 1;
      if (!dryRun) await Notification.updateOne({ _id: n._id }, { $set: { link } });
    }
  }
  console.log(`Notifications scanned: ${legacy.length}, links rewritten: ${rewritten}`);

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => { console.error(err); process.exit(1); });
