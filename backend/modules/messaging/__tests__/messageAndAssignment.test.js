const { mockQuery, ID, users, makeThread } = require('./testUtils');

jest.mock('../models/Thread');
jest.mock('../models/ThreadMessage');
jest.mock('../../../models/User');
jest.mock('../../../models/Program');
jest.mock('../../../models/ProgramEnrollment');
jest.mock('../services/messagingEvents', () => ({ safeEmit: jest.fn(), bus: { on: jest.fn() } }));

const Thread = require('../models/Thread');
const ThreadMessage = require('../models/ThreadMessage');
const User = require('../../../models/User');
const { safeEmit } = require('../services/messagingEvents');
const messageService = require('../services/messageService');
const assignmentService = require('../services/assignmentService');

beforeEach(() => {
  jest.resetAllMocks();
  ThreadMessage.aggregate.mockResolvedValue([]);
  ThreadMessage.create.mockImplementation(async (doc) => ({ _id: 'm-new', createdAt: new Date(), ...doc }));
  ThreadMessage.findById.mockImplementation(() => mockQuery({
    _id: 'm-new', kind: 'text', body: 'x', createdAt: new Date(), sender: { _id: ID.educator, username: 'drsmith' },
    toObject() { return { _id: 'm-new', kind: 'text', body: 'x', createdAt: this.createdAt }; },
  }));
});

const stubLoad = (thread) => Thread.findById.mockReturnValue(mockQuery(thread));

const claimed = (status = 'open') => makeThread({
  status, assignee: ID.educator, team: 'clinical', category: 'clinical',
  participants: [{ user: ID.student, role: 'requester' }, { user: ID.educator, role: 'assignee' }],
});

describe('messageService.listMessages', () => {
  it('strips internal notes for students at the service layer', async () => {
    stubLoad(claimed());
    ThreadMessage.find.mockReturnValue(mockQuery([]));
    await messageService.listMessages(users.student, ID.thread, {});
    expect(ThreadMessage.find.mock.calls[0][0].kind).toEqual({ $ne: 'note' });

    ThreadMessage.find.mockClear();
    await messageService.listMessages(users.educator, ID.thread, {});
    expect(ThreadMessage.find.mock.calls[0][0].kind).toBeUndefined();
  });

  it('refuses non-participants', async () => {
    stubLoad(claimed());
    await expect(messageService.listMessages(users.educator2, ID.thread, {})).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('messageService.sendMessage', () => {
  it('staff reply sets firstResponseAt and moves status to waiting_requester', async () => {
    const t = claimed('open');
    stubLoad(t);
    await messageService.sendMessage(users.educator, ID.thread, { body: 'On it' });
    expect(t.status).toBe('waiting_requester');
    expect(t.firstResponseAt).toBeInstanceOf(Date);
    expect(safeEmit).toHaveBeenCalledWith('message.created', expect.anything());
  });

  it('requester reply reopens a resolved ticket and records a system message', async () => {
    const t = claimed('resolved');
    t.resolvedAt = new Date();
    stubLoad(t);
    await messageService.sendMessage(users.student, ID.thread, { body: 'still broken' });
    expect(t.status).toBe('open');
    expect(t.resolvedAt).toBeNull();
    const kinds = ThreadMessage.create.mock.calls.map(c => c[0].kind);
    expect(kinds).toContain('system');
  });

  it('staff cannot reply into a closed ticket', async () => {
    stubLoad(claimed('closed'));
    await expect(messageService.sendMessage(users.educator, ID.thread, { body: 'x' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('students cannot write internal notes', async () => {
    stubLoad(claimed());
    await expect(messageService.sendMessage(users.student, ID.thread, { body: 'x', kind: 'note' })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('a note does not change status or the visible preview', async () => {
    const t = claimed('open');
    stubLoad(t);
    await messageService.sendMessage(users.educator, ID.thread, { body: 'internal', kind: 'note' });
    expect(t.status).toBe('open');
    expect(t.lastMessage.text).toBe('hi');
  });

  it('a reply un-hides the thread for anyone who deleted it', async () => {
    const t = claimed('open');
    t.participants[0].deletedAt = new Date();
    stubLoad(t);
    await messageService.sendMessage(users.educator, ID.thread, { body: 'hello again' });
    expect(t.participants[0].deletedAt).toBeNull();
  });
});

describe('assignmentService.claim', () => {
  it('is atomic: a lost race returns 409', async () => {
    stubLoad(makeThread({ team: 'clinical', category: 'clinical' }));
    Thread.findOneAndUpdate.mockResolvedValue(null);
    await expect(assignmentService.claim(users.educator, ID.thread)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('winner becomes assignee, status new → open, system message recorded', async () => {
    const t = makeThread({ team: 'clinical', category: 'clinical' });
    stubLoad(t);
    const updated = makeThread({ team: 'clinical', assignee: ID.educator, status: 'open', participants: [{ user: ID.student, role: 'requester' }] });
    Thread.findOneAndUpdate.mockResolvedValue(updated);
    const out = await assignmentService.claim(users.educator, ID.thread);
    expect(Thread.findOneAndUpdate.mock.calls[0][0]).toEqual({ _id: ID.thread, assignee: null });
    expect(updated.participants.find(p => p.user === ID.educator).role).toBe('assignee');
    expect(ThreadMessage.create.mock.calls[0][0].meta.event).toBe('claimed');
    expect(out.capabilities).toBeDefined();
  });

  it('educators cannot claim billing tickets', async () => {
    stubLoad(makeThread({ team: 'billing', category: 'billing' }));
    await expect(assignmentService.claim(users.educator, ID.thread)).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('assignmentService.join (admin observe)', () => {
  it('admin joins a DM as collaborator with an audit message', async () => {
    const t = makeThread({ kind: 'direct', team: null, status: 'open', requester: ID.educator,
      participants: [{ user: ID.educator, role: 'requester' }, { user: ID.student, role: 'collaborator' }] });
    stubLoad(t);
    await assignmentService.join(users.admin, ID.thread);
    expect(t.participants.some(p => p.user === ID.admin && p.role === 'collaborator')).toBe(true);
    expect(ThreadMessage.create.mock.calls[0][0].meta.event).toBe('joined');
  });
});

describe('assignmentService.escalate', () => {
  it('educator escalating a clinical ticket to support creates a linked internal thread', async () => {
    const parent = claimed('open');
    stubLoad(parent);
    const CHILD = '507f1f77bcf86cd799439098';
    const child = makeThread({ _id: CHILD, kind: 'internal', team: 'support', requester: ID.educator, parentThread: ID.thread });
    Thread.create.mockResolvedValue(child);
    User.find.mockReturnValue(mockQuery([{ _id: ID.admin }]));
    // loadThread is called for parent then child — return by id
    Thread.findById.mockImplementation((id) => mockQuery(String(id) === CHILD ? child : parent));

    const out = await assignmentService.escalate(users.educator, ID.thread, { toTeam: 'support', note: 'Needs refund' });

    const doc = Thread.create.mock.calls[0][0];
    expect(doc.kind).toBe('internal');
    expect(doc.parentThread).toBe(ID.thread);
    expect(doc.subject).toMatch(/^\[Escalated\]/);
    expect(out.child.kind).toBe('internal');
    expect(safeEmit).toHaveBeenCalledWith('thread.escalated', expect.anything());
  });

  it('escalating to the same team is rejected', async () => {
    stubLoad(claimed());
    await expect(assignmentService.escalate(users.educator, ID.thread, { toTeam: 'clinical' })).rejects.toMatchObject({ statusCode: 400 });
  });
});
