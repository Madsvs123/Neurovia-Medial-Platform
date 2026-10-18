const mongoose = require('mongoose');
const ThreadMessage = require('../models/ThreadMessage');
const policy = require('./threadPolicy');
const stateMachine = require('./threadStateMachine');
const { routing } = require('./routingService');
const { addSystemMessage } = require('./systemMessages');
const { loadFor, loadThread } = require('./threadService');
const { serializeMessage, serializeThread, PUBLIC_USER_FIELDS } = require('./threadSerializer');
const { safeEmit } = require('./messagingEvents');
const { httpError } = require('./errors');

const EDIT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Cursor-paginated messages, oldest→newest within the page.
 * `before` = ISO timestamp (exclusive) of the oldest message already loaded.
 * Internal notes are stripped for non-staff at this layer, never in the UI.
 */
async function listMessages(user, threadId, { before, limit } = {}) {
  const thread = await loadFor(user, threadId, 'readMessages');
  const pageSize = Math.min(parseInt(limit, 10) || 50, 200);

  const filter = { thread: thread._id };
  if (!policy.isStaff(user)) filter.kind = { $ne: 'note' };
  if (before) {
    const at = new Date(before);
    if (!Number.isNaN(at.getTime())) filter.createdAt = { $lt: at };
  }

  const rows = await ThreadMessage.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(pageSize + 1)
    .populate('sender', PUBLIC_USER_FIELDS);

  const hasMore = rows.length > pageSize;
  const page = (hasMore ? rows.slice(0, pageSize) : rows).reverse();

  return {
    items: page.map(serializeMessage),
    nextCursor: hasMore ? page[0].createdAt.toISOString() : null,
  };
}

async function sendMessage(user, threadId, { body, kind = 'text' }) {
  if (!body?.trim()) throw httpError(400, 'Message body is required');
  if (!['text', 'note'].includes(kind)) throw httpError(400, 'Invalid message kind');

  const thread = await loadFor(user, threadId, kind === 'note' ? 'note' : 'reply');
  const staff = policy.isStaff(user);
  const requester = policy.isRequester(thread, user);

  if (kind === 'text' && thread.status === 'closed' && staff) {
    throw httpError(400, 'This thread is closed. Reopen it before replying.');
  }

  const message = await ThreadMessage.create({
    thread: thread._id,
    sender: user._id,
    kind,
    body: body.trim(),
  });

  thread.messageCount += 1;
  thread.lastActivityAt = new Date();

  // A reply un-hides the thread for anyone who had hidden it.
  thread.participants.forEach(p => { p.deletedAt = null; });
  // and marks it read for the sender
  const me = policy.participantOf(thread, user);
  if (me) me.lastReadAt = new Date();

  if (kind === 'text') {
    thread.lastMessage = { text: body.trim().slice(0, 300), senderId: user._id, at: new Date() };

    const withinReopenWindow = !thread.resolvedAt
      || (Date.now() - new Date(thread.resolvedAt).getTime()) < routing.reopenWindowDays * 864e5;

    const next = stateMachine.statusAfterMessage(thread.kind, thread.status, {
      senderIsStaff: staff,
      senderIsRequester: requester,
      withinReopenWindow,
    });

    if (next !== thread.status) {
      const from = thread.status;
      thread.status = next;
      if (next === 'open' && (from === 'resolved' || from === 'closed')) {
        thread.resolvedAt = null;
        thread.closedAt = null;
        await addSystemMessage(thread, 'reopened', { from }, user);
      }
    }

    if (staff && !requester && !thread.firstResponseAt && thread.kind !== 'direct') {
      thread.firstResponseAt = new Date();
    }
  }

  await thread.save();

  const populated = await ThreadMessage.findById(message._id).populate('sender', PUBLIC_USER_FIELDS);
  const fresh = await loadThread(thread._id);
  const serialized = serializeMessage(populated);

  safeEmit('message.created', { thread: fresh, message: serialized, actor: user });

  return { message: serialized, thread: serializeThread(fresh, user) };
}

async function editMessage(user, threadId, messageId, { body }) {
  if (!body?.trim()) throw httpError(400, 'Message body is required');
  await loadFor(user, threadId, 'readMessages');
  const message = await ThreadMessage.findOne({ _id: messageId, thread: threadId });
  if (!message) throw httpError(404, 'Message not found');
  if (message.kind === 'system') throw httpError(400, 'System messages cannot be edited');
  if (String(message.sender) !== String(user._id)) throw httpError(403, 'You can only edit your own messages');
  if (Date.now() - message.createdAt.getTime() > EDIT_WINDOW_MS) throw httpError(400, 'Messages can only be edited within 15 minutes');

  message.body = body.trim();
  message.editedAt = new Date();
  await message.save();

  const populated = await ThreadMessage.findById(message._id).populate('sender', PUBLIC_USER_FIELDS);
  const thread = await loadThread(threadId);
  const serialized = serializeMessage(populated);
  safeEmit('message.updated', { thread, message: serialized, actor: user });
  return serialized;
}

/** Tombstone: keeps the timeline coherent, clears the body. */
async function deleteMessage(user, threadId, messageId) {
  await loadFor(user, threadId, 'readMessages');
  const message = await ThreadMessage.findOne({ _id: messageId, thread: threadId });
  if (!message) throw httpError(404, 'Message not found');
  if (message.kind === 'system') throw httpError(400, 'System messages cannot be deleted');
  const own = String(message.sender) === String(user._id);
  if (!own && !policy.isAdmin(user)) throw httpError(403, 'Not allowed to delete this message');

  message.deletedAt = new Date();
  message.body = '';
  await message.save();

  const thread = await loadThread(threadId);
  const serialized = serializeMessage(message);
  safeEmit('message.updated', { thread, message: serialized, actor: user });
  return serialized;
}

module.exports = { listMessages, sendMessage, editMessage, deleteMessage, EDIT_WINDOW_MS };

// keep mongoose referenced for ObjectId validation in callers that import this module
module.exports.isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
