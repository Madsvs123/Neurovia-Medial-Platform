/**
 * Socket.IO layer.
 *
 * One socket per session, JWT-authenticated with the same token the REST
 * API uses. Rooms:
 *   user:<id>     – private, for targeted events and notifications
 *   team:<name>   – staff who may work that team's queue
 *   thread:<id>   – joined/left by clients while a thread is open
 *                   (typing indicators, read receipts, live messages)
 *
 * The server side only *reacts* to messaging domain events
 * (see `subscribe()` below); services never import this module.
 */
const jwt = require('jsonwebtoken');

let io = null;

function initSocket(server, { jwtSecret } = {}) {
  const { Server } = require('socket.io');
  const User = require('../models/User');
  const Thread = require('../modules/messaging/models/Thread');
  const policy = require('../modules/messaging/services/threadPolicy');
  const routingService = require('../modules/messaging/services/routingService');
  const { bus } = require('../modules/messaging/services/messagingEvents');

  io = new Server(server, { cors: { origin: true, credentials: true } });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, jwtSecret);
      const userId = decoded?.id || decoded?.userId;
      if (!userId) return next(new Error('Invalid token'));

      const user = await User.findById(userId).select('role status username');
      if (!user || user.status === 'suspended') return next(new Error('Not authorized'));

      socket.user = { _id: String(user._id), role: user.role, username: user.username };
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket;
    socket.join(`user:${user._id}`);
    if (policy.isStaff(user)) {
      routingService.teamsFor(user).forEach(team => socket.join(`team:${team}`));
      socket.join('staff');
    }

    // Clients join a thread room while it is open on screen.
    socket.on('thread:join', async (threadId, ack) => {
      try {
        const thread = await Thread.findById(threadId).select('kind participants requester assignee team');
        if (thread && policy.can(user, 'readMessages', thread)) {
          socket.join(`thread:${threadId}`);
          ack?.({ ok: true });
        } else {
          ack?.({ ok: false });
        }
      } catch {
        ack?.({ ok: false });
      }
    });

    socket.on('thread:leave', (threadId) => socket.leave(`thread:${threadId}`));

    socket.on('thread:typing', ({ threadId, isTyping }) => {
      if (!threadId) return;
      socket.to(`thread:${threadId}`).emit('thread:typing', {
        threadId, userId: user._id, username: user.username, isTyping: !!isTyping,
      });
    });
  });

  subscribe(bus);
  return io;
}

/* ------------------------------------------------------------------ */

const participantIds = (thread) => (thread.participants || [])
  .filter(p => !p.deletedAt)
  .map(p => String(p.user?._id || p.user));

const summary = (thread) => ({
  _id: String(thread._id),
  kind: thread.kind,
  subject: thread.subject,
  status: thread.status,
  team: thread.team,
  assignee: thread.assignee ? String(thread.assignee._id || thread.assignee) : null,
  lastActivityAt: thread.lastActivityAt,
});

function subscribe(bus) {
  bus.on('thread.created', ({ thread, candidateIds = [] }) => {
    const payload = { thread: summary(thread) };
    emitToUsers(participantIds(thread), 'thread:created', payload);
    emitToUsers(candidateIds, 'queue:updated', payload);
    if (thread.team) emitToRoom(`team:${thread.team}`, 'queue:updated', payload);
  });

  bus.on('thread.updated', ({ thread, changes }) => {
    const payload = { thread: summary(thread), changes };
    emitToUsers(participantIds(thread), 'thread:updated', payload);
    emitToRoom(`thread:${thread._id}`, 'thread:updated', payload);
    if (thread.team) emitToRoom(`team:${thread.team}`, 'queue:updated', payload);
  });

  bus.on('thread.escalated', ({ thread, child }) => {
    emitToUsers(participantIds(thread), 'thread:updated', { thread: summary(thread), changes: { escalatedTo: String(child._id) } });
  });

  bus.on('message.created', ({ thread, message, actor }) => {
    const payload = { threadId: String(thread._id), message, thread: summary(thread) };
    // everyone with the thread open gets the message instantly…
    emitToRoom(`thread:${thread._id}`, 'message:created', payload);
    // …and every other participant gets a lighter "thread changed" ping for lists/badges
    participantIds(thread)
      .filter(id => id !== String(actor._id))
      .forEach(id => emitToUser(id, 'thread:activity', payload));
  });

  bus.on('message.updated', ({ thread, message }) => {
    emitToRoom(`thread:${thread._id}`, 'message:updated', { threadId: String(thread._id), message });
  });

  bus.on('thread.read', ({ thread, userId, at }) => {
    emitToRoom(`thread:${thread._id}`, 'thread:read', { threadId: String(thread._id), userId: String(userId), at });
  });
}

function getIO() { return io; }

function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${String(userId)}`).emit(event, payload);
}

function emitToUsers(userIds = [], event, payload) {
  if (!io) return;
  [...new Set(userIds.filter(Boolean).map(String))].forEach(id => emitToUser(id, event, payload));
}

function emitToRoom(room, event, payload) {
  if (!io || !room) return;
  io.to(room).emit(event, payload);
}

function emitToStaff(event, payload) { emitToRoom('staff', event, payload); }

module.exports = { initSocket, getIO, emitToUser, emitToUsers, emitToRoom, emitToStaff, subscribe };
