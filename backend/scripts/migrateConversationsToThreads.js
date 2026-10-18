#!/usr/bin/env node
/**
 * One-off, idempotent migration: legacy `conversations` + `messages`
 * collections  →  `threads` + `threadmessages`.
 *
 *   node scripts/migrateConversationsToThreads.js --dry-run   # report only
 *   node scripts/migrateConversationsToThreads.js             # migrate
 *   node scripts/migrateConversationsToThreads.js --drop      # migrate, then drop legacy collections
 *
 * Mapping
 *   participants: [ids]          → participants: [{ user, role, lastReadAt, deletedAt }]
 *                                  createdBy → requester, assignedTo → assignee, others → collaborator
 *   status  pending-admin        → new (no assignee) | open (assignee)
 *           in-progress / open   → open
 *           pending-user         → waiting_requester
 *           resolved / closed    → unchanged
 *   kind    requester is student → support   (team from category)
 *           otherwise            → direct (staff-started 1:1) or internal (staff-only)
 *   per-message `read`           → per-participant lastReadAt (max readAt of others' messages)
 *   deletedFor[]                 → participants[].deletedAt
 *   senderRole                   → dropped (derived from the user at render time)
 *
 * Re-running is safe: threads are keyed by the legacy conversation id
 * (same _id), and messages by the legacy message id.
 */
const path = require('path');
const mongoose = require('mongoose');

const { config } = require(path.join(__dirname, '..', 'config', 'config'));
const Conversation = require('./legacy/Conversation');
const Message = require('./legacy/Message');
const User = require('../models/User');
const Thread = require('../modules/messaging/models/Thread');
const ThreadMessage = require('../modules/messaging/models/ThreadMessage');
const { teamFor } = require('../modules/messaging/services/routingService');

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const DROP = args.has('--drop');

const STATUS_MAP = (status, hasAssignee) => {
  switch (status) {
    case 'pending-admin': return hasAssignee ? 'open' : 'new';
    case 'in-progress':
    case 'open': return 'open';
    case 'pending-user': return 'waiting_requester';
    case 'resolved': return 'resolved';
    case 'closed': return 'closed';
    default: return 'new';
  }
};

async function main() {
  await mongoose.connect(config.database.uri, { dbName: config.database.dbName, ...config.database.options });
  console.log(`Connected. Mode: ${DRY ? 'DRY RUN' : 'MIGRATE'}${DROP ? ' + DROP LEGACY' : ''}`);

  const conversations = await Conversation.find({}).lean();
  const userIds = new Set();
  conversations.forEach(c => (c.participants || []).forEach(p => userIds.add(String(p))));
  const users = await User.find({ _id: { $in: [...userIds] } }).select('role username').lean();
  const roleOf = new Map(users.map(u => [String(u._id), u.role]));

  const report = { total: conversations.length, migrated: 0, skipped: 0, kinds: {}, unmapped: [] };

  for (const c of conversations) {
    const existing = await Thread.findById(c._id).select('_id');
    if (existing) { report.skipped += 1; continue; }

    const participantIds = (c.participants || []).map(String);
    const creator = c.createdBy ? String(c.createdBy) : participantIds[0];
    const assignee = c.assignedTo ? String(c.assignedTo) : null;
    const deletedFor = new Set((c.deletedFor || []).map(String));

    if (!creator || !roleOf.has(creator)) {
      report.unmapped.push({ id: String(c._id), reason: 'no requester / requester user missing' });
      continue;
    }

    const creatorRole = roleOf.get(creator);
    const everyoneStaff = participantIds.every(id => ['admin', 'educator'].includes(roleOf.get(id)));
    let kind;
    if (creatorRole === 'student') kind = 'support';
    else if (everyoneStaff) kind = 'internal';
    else kind = 'direct';

    const messages = await Message.find({ conversationId: c._id }).sort({ createdAt: 1 }).lean();

    // lastReadAt per participant: latest readAt among messages they didn't send
    const lastRead = new Map();
    for (const m of messages) {
      if (!m.read || !m.readAt) continue;
      participantIds.forEach(pid => {
        if (pid === String(m.sender)) return;
        const prev = lastRead.get(pid);
        if (!prev || m.readAt > prev) lastRead.set(pid, m.readAt);
      });
    }

    const participants = participantIds.map(pid => ({
      user: pid,
      role: pid === creator ? 'requester' : (pid === assignee ? 'assignee' : 'collaborator'),
      joinedAt: c.createdAt,
      lastReadAt: lastRead.get(pid) || null,
      deletedAt: deletedFor.has(pid) ? c.updatedAt : null,
    }));

    const firstStaffReply = messages.find(m => m.senderRole !== 'student' && String(m.sender) !== creator);

    const threadDoc = {
      _id: c._id,
      kind,
      subject: c.subject || 'Conversation',
      category: c.category || 'general',
      priority: 'normal',
      status: kind === 'direct' ? 'open' : STATUS_MAP(c.status, !!assignee),
      requester: creator,
      assignee: kind === 'direct' ? null : assignee,
      team: kind === 'direct' ? null : teamFor({ kind, category: c.category || 'general' }),
      participants,
      lastMessage: { text: c.lastMessage?.text || '', senderId: c.lastMessage?.senderId || null, at: c.lastMessageAt || c.updatedAt },
      lastActivityAt: c.lastMessageAt || c.updatedAt || c.createdAt,
      messageCount: messages.length,
      firstResponseAt: firstStaffReply ? firstStaffReply.createdAt : null,
      resolvedAt: c.resolvedAt || null,
      closedAt: c.status === 'closed' ? (c.resolvedAt || c.updatedAt) : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };

    report.kinds[kind] = (report.kinds[kind] || 0) + 1;

    if (!DRY) {
      await Thread.collection.insertOne(threadDoc);
      if (messages.length) {
        await ThreadMessage.collection.insertMany(messages.map(m => ({
          _id: m._id,
          thread: c._id,
          sender: m.sender,
          kind: 'text',
          body: m.message,
          meta: null,
          attachments: [],
          editedAt: null,
          deletedAt: null,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        })), { ordered: false });
      }
    }
    report.migrated += 1;
  }

  if (!DRY && DROP) {
    await Conversation.collection.drop().catch(() => {});
    await Message.collection.drop().catch(() => {});
    console.log('Legacy collections dropped.');
  }

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
