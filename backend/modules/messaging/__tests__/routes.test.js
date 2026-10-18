const express = require('express');
const request = require('supertest');

jest.mock('../../../middleware/authMiddleware', () => (req, res, next) => {
  req.user = { _id: '507f1f77bcf86cd799439011', role: req.headers['x-test-role'] || 'student', username: 'u' };
  next();
});

const handlers = {};
jest.mock('../controllers/threadController', () => new Proxy({}, {
  get: (_, name) => (req, res) => { handlers[name] = (handlers[name] || 0) + 1; res.json({ ok: true, handler: name }); },
}));

const routes = require('../routes');
const { errorHandler } = require('../../../middleware/errorMiddleware');

const app = express();
app.use(express.json());
app.use('/api/v2/messaging', routes);
app.use(errorHandler);

const get = (url, role) => request(app).get(url).set('x-test-role', role);
const post = (url, role, body = {}) => request(app).post(url).set('x-test-role', role).send(body);

const TID = '507f1f77bcf86cd799439099';

describe('coarse role gates', () => {
  it('students cannot claim, assign, escalate, or manage templates', async () => {
    expect((await post(`/api/v2/messaging/threads/${TID}/claim`, 'student')).status).toBe(403);
    expect((await post(`/api/v2/messaging/threads/${TID}/assign`, 'student', { userId: TID })).status).toBe(403);
    expect((await post(`/api/v2/messaging/threads/${TID}/escalate`, 'student', { toTeam: 'billing' })).status).toBe(403);
    expect((await get('/api/v2/messaging/templates', 'student')).status).toBe(403);
    expect((await get('/api/v2/messaging/stats', 'student')).status).toBe(403);
  });

  it('educators can read templates but not manage them; stats are admin-only', async () => {
    expect((await get('/api/v2/messaging/templates', 'educator')).status).toBe(200);
    expect((await get('/api/v2/messaging/templates/all', 'educator')).status).toBe(403);
    expect((await get('/api/v2/messaging/stats', 'educator')).status).toBe(403);
    expect((await get('/api/v2/messaging/stats', 'admin')).status).toBe(200);
  });

  it('every role can list/create threads and read config', async () => {
    for (const role of ['student', 'educator', 'admin']) {
      expect((await get('/api/v2/messaging/threads', role)).status).toBe(200);
      expect((await get('/api/v2/messaging/config', role)).status).toBe(200);
    }
  });
});

describe('validation', () => {
  it('rejects malformed thread ids and bodies with 400 + message', async () => {
    const bad = await get('/api/v2/messaging/threads/not-an-id', 'admin');
    expect(bad.status).toBe(400);
    expect(bad.body.message).toMatch(/Invalid id/);

    const noBody = await post('/api/v2/messaging/threads', 'student', { subject: 'x' });
    expect(noBody.status).toBe(400);

    const badKind = await post('/api/v2/messaging/threads', 'student', { subject: 'Help me', body: 'pls', kind: 'weird' });
    expect(badKind.status).toBe(400);
    expect(badKind.body.message).toMatch(/Unknown kind/);

    const badStatus = await request(app).patch(`/api/v2/messaging/threads/${TID}`).set('x-test-role', 'admin').send({ status: 'pending-admin' });
    expect(badStatus.status).toBe(400);
  });

  it('unknown box is rejected', async () => {
    const res = await get('/api/v2/messaging/threads?box=everything', 'admin');
    expect(res.status).toBe(400);
  });

  it('passes clean requests through to the controller', async () => {
    const res = await post('/api/v2/messaging/threads', 'student', { subject: 'Help me', body: 'please', category: 'billing' });
    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('create');
  });
});
