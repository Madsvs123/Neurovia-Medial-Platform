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
const Program = require('../../../models/Program');
const ProgramEnrollment = require('../../../models/ProgramEnrollment');
const { safeEmit } = require('../services/messagingEvents');
const threadService = require('../services/threadService');

beforeEach(() => {
  jest.resetAllMocks();
  // serializer's unread aggregate
  ThreadMessage.aggregate.mockResolvedValue([]);
});

const stubLoad = (thread) => Thread.findById.mockReturnValue(mockQuery(thread));

describe('createThread', () => {
  it('student opens a support ticket routed to the team for its category', async () => {
    const created = makeThread({ category: 'billing', team: 'billing' });
    Thread.create.mockResolvedValue(created);
    ThreadMessage.create.mockResolvedValue({ _id: 'm1' });
    stubLoad(created);
    User.find.mockReturnValue(mockQuery([{ _id: ID.admin }]));

    const out = await threadService.createThread(users.student, { subject: 'Charged twice', body: 'help', category: 'billing' });

    const doc = Thread.create.mock.calls[0][0];
    expect(doc.kind).toBe('support');
    expect(doc.team).toBe('billing');
    expect(doc.status).toBe('new');
    expect(doc.participants[0]).toMatchObject({ user: ID.student, role: 'requester' });
    expect(out.kind).toBe('support');
    expect(safeEmit).toHaveBeenCalledWith('thread.created', expect.objectContaining({ candidateIds: [String(ID.admin)] }));
  });

  it('staff cannot open support tickets (they open internal requests)', async () => {
    await expect(threadService.createThread(users.educator, { kind: 'support', subject: 'x', body: 'y' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('educator → admin internal request is routed to the support team with no assignee', async () => {
    const created = makeThread({ kind: 'internal', requester: ID.educator, team: 'support' });
    Thread.create.mockResolvedValue(created);
    ThreadMessage.create.mockResolvedValue({ _id: 'm1' });
    stubLoad(created);
    User.find.mockReturnValue(mockQuery([{ _id: ID.admin }]));

    await threadService.createThread(users.educator, { kind: 'internal', subject: 'Need enrollment fix', body: 'please' });

    const doc = Thread.create.mock.calls[0][0];
    expect(doc.kind).toBe('internal');
    expect(doc.team).toBe('support');
    expect(doc.assignee).toBeNull();
  });

  it('direct message is refused when the two users share no program', async () => {
    User.findById.mockResolvedValue({ _id: ID.student2, role: 'student' });
    Program.find.mockReturnValue(mockQuery([]));          // educator teaches nothing
    ProgramEnrollment.find.mockReturnValue(mockQuery([]));
    User.exists.mockResolvedValue(null);

    await expect(threadService.createThread(users.educator, { kind: 'direct', to: ID.student2, subject: 'hi', body: 'yo' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('student cannot DM an admin directly', async () => {
    User.findById.mockResolvedValue({ _id: ID.admin, role: 'admin' });
    await expect(threadService.createThread(users.student, { kind: 'direct', to: ID.admin, subject: 'hi', body: 'yo' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('listThreads', () => {
  beforeEach(() => Thread.find.mockReturnValue(mockQuery([])));

  it('queue only shows unassigned tickets in teams the user can work', async () => {
    await threadService.listThreads(users.educator, { box: 'queue' });
    const filter = Thread.find.mock.calls[0][0];
    expect(filter.assignee).toBeNull();
    expect(filter.team).toEqual({ $in: ['clinical'] });
    expect(filter.kind).toEqual({ $in: ['support', 'internal'] });
  });

  it('admin queue spans every team', async () => {
    await threadService.listThreads(users.admin, { box: 'queue' });
    expect(Thread.find.mock.calls[0][0].team.$in.sort()).toEqual(['billing', 'clinical', 'support', 'technical']);
  });

  it('students are restricted to support/direct even when asking for internal', async () => {
    await expect(threadService.listThreads(users.student, { box: 'internal' })).rejects.toMatchObject({ statusCode: 403 });
    await threadService.listThreads(users.student, { box: 'inbox', kind: 'internal' });
    expect(Thread.find.mock.calls[0][0].kind).toEqual({ $in: ['support', 'direct'] });
  });

  it('"all" is admin-only', async () => {
    await expect(threadService.listThreads(users.educator, { box: 'all' })).rejects.toMatchObject({ statusCode: 403 });
    await threadService.listThreads(users.admin, { box: 'all' });
    expect(Thread.find.mock.calls[0][0]).toEqual({});
  });

  it('archived box uses the per-participant archive flag', async () => {
    await threadService.listThreads(users.student, { box: 'archived' });
    const f = Thread.find.mock.calls[0][0];
    expect(f.participants.$elemMatch.archivedAt).toEqual({ $ne: null });
  });
});

describe('updateThread — status', () => {
  it('rejects transitions the state machine does not allow', async () => {
    stubLoad(makeThread({ status: 'new' }));
    await expect(threadService.updateThread(users.student, ID.thread, { status: 'open' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('requester may resolve and resolvedAt is set; reopening clears it', async () => {
    const t = makeThread({ status: 'open', participants: [{ user: ID.student, role: 'requester' }] });
    stubLoad(t);
    ThreadMessage.create.mockResolvedValue({});

    await threadService.updateThread(users.student, ID.thread, { status: 'resolved' });
    expect(t.status).toBe('resolved');
    expect(t.resolvedAt).toBeInstanceOf(Date);

    await threadService.updateThread(users.student, ID.thread, { status: 'open' });
    expect(t.status).toBe('open');
    expect(t.resolvedAt).toBeNull();
    expect(safeEmit).toHaveBeenCalledWith('thread.updated', expect.objectContaining({ changes: { status: 'open' } }));
  });
});

describe('deleteThread — per-participant hide', () => {
  it('hides for me, hard-deletes once everyone hid it', async () => {
    const t = makeThread({
      participants: [
        { user: ID.student, role: 'requester', deletedAt: null },
        { user: ID.educator, role: 'assignee', deletedAt: new Date() },
      ],
    });
    stubLoad(t);
    ThreadMessage.deleteMany.mockResolvedValue({});

    const out = await threadService.deleteThread(users.student, ID.thread);
    expect(out.hard).toBe(true);
    expect(t.deleteOne).toHaveBeenCalled();
  });

  it('only admins can hard-delete explicitly', async () => {
    stubLoad(makeThread());
    await expect(threadService.deleteThread(users.student, ID.thread, { hard: true })).rejects.toMatchObject({ statusCode: 403 });
  });
});
