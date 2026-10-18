const mongoose = require('mongoose');
const ThreadMessage = require('../models/ThreadMessage');
const policy = require('./threadPolicy');

const PUBLIC_USER_FIELDS = 'username email role status avatar';

const POPULATE = [
  { path: 'participants.user', select: PUBLIC_USER_FIELDS },
  { path: 'requester', select: PUBLIC_USER_FIELDS },
  { path: 'assignee', select: PUBLIC_USER_FIELDS },
  { path: 'context.programId', select: 'title code' },
  { path: 'context.courseId', select: 'title' },
  { path: 'parentThread', select: 'subject kind status' },
];

/**
 * Unread counts for many threads in ONE query: messages newer than each
 * participant's own lastReadAt, not sent by them, and (for students) not
 * internal notes.
 */
async function unreadCounts(threads, user) {
  const clauses = threads.map(t => {
    const me = policy.participantOf(t, user);
    if (!me) return null;
    const clause = { thread: t._id };
    if (me.lastReadAt) clause.createdAt = { $gt: me.lastReadAt };
    return clause;
  }).filter(Boolean);

  if (!clauses.length) return new Map();

  const match = {
    $or: clauses,
    sender: { $ne: new mongoose.Types.ObjectId(String(user._id)) },
    kind: policy.isStaff(user) ? { $in: ['text', 'note', 'system'] } : { $in: ['text', 'system'] },
    deletedAt: null,
  };

  const rows = await ThreadMessage.aggregate([
    { $match: match },
    { $group: { _id: '$thread', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map(r => [String(r._id), r.count]));
}

const plainUser = (u) => {
  if (!u) return null;
  if (!u._id) return { _id: u };
  return { _id: u._id, username: u.username, email: u.email, role: u.role, status: u.status, avatar: u.avatar };
};

/** The "other side" to show in list rows, from the viewer's perspective. */
function counterpartFor(thread, user) {
  const others = (thread.participants || [])
    .filter(p => !p.deletedAt && String(p.user?._id || p.user) !== String(user._id))
    .map(p => plainUser(p.user));

  if (thread.kind === 'direct') return others[0] || null;

  if (policy.isRequester(thread, user)) {
    // requester sees who's handling it, or the team
    const assignee = thread.assignee ? plainUser(thread.assignee) : null;
    return assignee || others[0] || null;
  }
  return plainUser(thread.requester);
}

function serializeThread(thread, user, unreadMap = null) {
  const obj = thread.toObject ? thread.toObject({ virtuals: false }) : { ...thread };
  const me = policy.participantOf(thread, user);

  return {
    _id: obj._id,
    kind: obj.kind,
    subject: obj.subject,
    category: obj.category,
    priority: obj.priority,
    status: obj.status,
    team: obj.team,
    requester: plainUser(thread.requester),
    assignee: plainUser(thread.assignee),
    context: {
      programId: obj.context?.programId?._id || obj.context?.programId || null,
      program: obj.context?.programId?._id ? { _id: obj.context.programId._id, title: obj.context.programId.title, code: obj.context.programId.code } : null,
      courseId: obj.context?.courseId?._id || obj.context?.courseId || null,
      course: obj.context?.courseId?._id ? { _id: obj.context.courseId._id, title: obj.context.courseId.title } : null,
      lessonId: obj.context?.lessonId || null,
      clinicalCaseId: obj.context?.clinicalCaseId || null,
    },
    participants: (thread.participants || []).filter(p => !p.deletedAt).map(p => ({
      user: plainUser(p.user),
      role: p.role,
      joinedAt: p.joinedAt,
      lastReadAt: p.lastReadAt,
    })),
    me: me ? { role: me.role, lastReadAt: me.lastReadAt, archivedAt: me.archivedAt } : null,
    counterpart: counterpartFor(thread, user),
    lastMessage: obj.lastMessage,
    lastActivityAt: obj.lastActivityAt,
    messageCount: obj.messageCount,
    firstResponseAt: obj.firstResponseAt,
    slaBreachedAt: obj.slaBreachedAt,
    resolvedAt: obj.resolvedAt,
    closedAt: obj.closedAt,
    parentThread: obj.parentThread ? {
      _id: obj.parentThread._id || obj.parentThread,
      subject: obj.parentThread.subject,
      kind: obj.parentThread.kind,
      status: obj.parentThread.status,
    } : null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    unreadCount: unreadMap ? (unreadMap.get(String(obj._id)) || 0) : 0,
    capabilities: policy.capabilities(user, thread),
  };
}

async function serializeThreads(threads, user) {
  const unread = await unreadCounts(threads, user);
  return threads.map(t => serializeThread(t, user, unread));
}

function serializeMessage(message) {
  const obj = message.toObject ? message.toObject() : { ...message };
  return {
    _id: obj._id,
    thread: obj.thread,
    sender: plainUser(message.sender),
    kind: obj.kind,
    body: obj.deletedAt ? '' : obj.body,
    meta: obj.meta || null,
    attachments: obj.attachments || [],
    editedAt: obj.editedAt,
    deletedAt: obj.deletedAt,
    createdAt: obj.createdAt,
  };
}

module.exports = {
  PUBLIC_USER_FIELDS,
  POPULATE,
  unreadCounts,
  serializeThread,
  serializeThreads,
  serializeMessage,
  plainUser,
};
