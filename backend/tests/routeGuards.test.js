/**
 * Route-wiring tests: confirm the previously-missing `educatorMiddleware`
 * guards are actually attached to the routes that leaked data to any
 * authenticated student (GET /api/messages, /api/messages/stats,
 * GET /api/conversations/new).
 *
 * `authMiddleware` is replaced with a tiny stand-in that trusts an
 * `x-test-role` header, so we can drive the role-based branching without a
 * real database or JWT.
 */
const express = require('express');
const request = require('supertest');

jest.mock('../middleware/authMiddleware', () => (req, res, next) => {
  req.user = { _id: 'u1', role: req.headers['x-test-role'] || 'student' };
  next();
});

jest.mock('../controllers/messageController', () => ({
  getAllMessages: (req, res) => res.json({ ok: true }),
  getMessageStats: (req, res) => res.json({ ok: true }),
  getMessageById: (req, res) => res.json({ ok: true }),
  markMessageAsRead: (req, res) => res.json({ ok: true }),
  deleteMessage: (req, res) => res.json({ ok: true }),
}));

jest.mock('../controllers/conversationController', () => ({
  getConversations: (req, res) => res.json({ ok: true }),
  createConversation: (req, res) => res.json({ ok: true }),
  getMyConversations: (req, res) => res.json({ ok: true }),
  getConversation: (req, res) => res.json({ ok: true }),
  getNewConversationForm: (req, res) => res.json({ ok: true }),
  updateConversationStatus: (req, res) => res.json({ ok: true }),
  markConversationAsRead: (req, res) => res.json({ ok: true }),
  markAllAsRead: (req, res) => res.json({ ok: true }),
  joinConversation: (req, res) => res.json({ ok: true }),
  deleteConversation: (req, res) => res.json({ ok: true }),
  getConversationMessages: (req, res) => res.json({ ok: true }),
  sendMessage: (req, res) => res.json({ ok: true }),
  getSupportQueue: (req, res) => res.json({ ok: true }),
}));

const messageRoutes = require('../routes/messageRoutes');
const conversationRoutes = require('../routes/conversationRoutes');

const app = express();
app.use(express.json());
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);

describe('message routes are staff-only for platform-wide views', () => {
  it('blocks a student from GET /api/messages', async () => {
    const res = await request(app).get('/api/messages').set('x-test-role', 'student');
    expect(res.status).toBe(403);
  });

  it('blocks a student from GET /api/messages/stats', async () => {
    const res = await request(app).get('/api/messages/stats').set('x-test-role', 'student');
    expect(res.status).toBe(403);
  });

  it('allows an educator through to GET /api/messages', async () => {
    const res = await request(app).get('/api/messages').set('x-test-role', 'educator');
    expect(res.status).toBe(200);
  });

  it('allows an admin through to GET /api/messages/stats', async () => {
    const res = await request(app).get('/api/messages/stats').set('x-test-role', 'admin');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/conversations/new is staff-only', () => {
  it('blocks a student (previously leaked the full user directory)', async () => {
    const res = await request(app).get('/api/conversations/new').set('x-test-role', 'student');
    expect(res.status).toBe(403);
  });

  it('allows an educator', async () => {
    const res = await request(app).get('/api/conversations/new').set('x-test-role', 'educator');
    expect(res.status).toBe(200);
  });

  it('allows an admin', async () => {
    const res = await request(app).get('/api/conversations/new').set('x-test-role', 'admin');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/conversations/queue remains staff-only', () => {
  it('blocks a student', async () => {
    const res = await request(app).get('/api/conversations/queue').set('x-test-role', 'student');
    expect(res.status).toBe(403);
  });
});
