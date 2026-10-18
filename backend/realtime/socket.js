/**
 * Socket.IO layer for live in-app notifications.
 * One authenticated socket per session, joined to `user:<id>`.
 */
const jwt = require('jsonwebtoken');

let io = null;

function initSocket(server, { jwtSecret } = {}) {
  const { Server } = require('socket.io');
  const User = require('../models/User');

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
    socket.join(`user:${socket.user._id}`);
  });

  return io;
}

function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${String(userId)}`).emit(event, payload);
}

module.exports = { initSocket, emitToUser };
