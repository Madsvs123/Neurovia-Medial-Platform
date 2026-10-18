const { mockQuery, ID, users, makeThread } = require('./testUtils');

jest.mock('../../../models/User');
jest.mock('../../../models/Notification');
jest.mock('../../../utils/notify', () => ({ notify: jest.fn().mockResolvedValue({}) }));

const User = require('../../../models/User');
const Notification = require('../../../models/Notification');
const { notify } = require('../../../utils/notify');
const { bus } = require('../services/messagingEvents');
const subscriber = require('../../notifications/messagingSubscriber');

const flush = () => new Promise(r => setTimeout(r, 0));

beforeAll(() => subscriber.subscribe());
beforeEach(() => {
  jest.clearAllMocks();
  User.find.mockImplementation((filter) => mockQuery(
    (filter._id?.$in || []).map(id => ({ _id: id, role: Object.values(users).find(u => u._id === String(id))?.role || 'student' }))
  ));
  Notification.findOne.mockResolvedValue(null);
});

describe('linkFor', () => {
  it('is role-aware so every bell click lands on a real page', () => {
    expect(subscriber.linkFor('admin', 'T')).toBe('/admin/messages/T');
    expect(subscriber.linkFor('educator', 'T')).toBe('/educator/messages/T');
    expect(subscriber.linkFor('student', 'T')).toBe('/messages/T');
  });
});

describe('thread.created', () => {
  it('notifies only routing candidates, never the creator, with role-aware links', async () => {
    const thread = makeThread({ team: 'clinical' });
    bus.emit('thread.created', { thread, actor: users.student, candidateIds: [ID.educator, ID.admin, ID.student] });
    await flush(); await flush();

    const targets = notify.mock.calls.map(c => c[0]);
    expect(targets.map(t => t.userId).sort()).toEqual([ID.admin, ID.educator].sort());
    expect(targets.find(t => t.userId === ID.educator).link).toBe(`/educator/messages/${ID.thread}`);
    expect(targets.find(t => t.userId === ID.admin).link).toBe(`/admin/messages/${ID.thread}`);
  });
});

describe('message.created', () => {
  const thread = makeThread({
    participants: [{ user: ID.student, role: 'requester' }, { user: ID.educator, role: 'assignee' }],
  });

  it('notifies the other participants only', async () => {
    bus.emit('message.created', { thread, message: { kind: 'text' }, actor: users.educator });
    await flush(); await flush();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toMatchObject({ userId: ID.student, link: `/messages/${ID.thread}` });
  });

  it('internal notes never notify students', async () => {
    bus.emit('message.created', { thread, message: { kind: 'note' }, actor: users.educator });
    await flush(); await flush();
    expect(notify).not.toHaveBeenCalled();
  });

  it('digests repeated messages into the existing unread notification', async () => {
    const existing = { message: 'old', save: jest.fn().mockResolvedValue({}) };
    Notification.findOne.mockResolvedValue(existing);
    bus.emit('message.created', { thread, message: { kind: 'text' }, actor: users.educator });
    await flush(); await flush();
    expect(notify).not.toHaveBeenCalled();
    expect(existing.save).toHaveBeenCalled();
  });
});
