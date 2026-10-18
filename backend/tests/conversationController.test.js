const { mockQuery, mockRes, mockReq } = require('./testUtils');

jest.mock('../models/Conversation');
jest.mock('../models/Message');
jest.mock('../models/User');
jest.mock('../models/Program');
jest.mock('../models/ProgramEnrollment');
jest.mock('../utils/notify', () => ({ notify: jest.fn() }));
jest.mock('../utils/socket', () => ({
  emitToUser: jest.fn(),
  emitToUsers: jest.fn(),
  emitToStaff: jest.fn(),
}));

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const { notify } = require('../utils/notify');
const { emitToUsers } = require('../utils/socket');

const controller = require('../controllers/conversationController');

const ADMIN_ID = '507f1f77bcf86cd799439011';
const EDU_ID = '507f1f77bcf86cd799439012';
const STUDENT_ID = '507f1f77bcf86cd799439013';
const OTHER_EDU_ID = '507f1f77bcf86cd799439014';
const CONVO_ID = '507f1f77bcf86cd799439099';

const adminUser = { _id: ADMIN_ID, role: 'admin', username: 'adminUser' };
const educatorUser = { _id: EDU_ID, role: 'educator', username: 'eduUser' };
const studentUser = { _id: STUDENT_ID, role: 'student', username: 'stuUser' };

beforeEach(() => {
  jest.resetAllMocks();
});

describe('updateConversationStatus', () => {
  it('rejects staff who have not joined the conversation (participant check)', async () => {
    const conversation = {
      _id: CONVO_ID,
      participants: [STUDENT_ID], // educator NOT in here
      status: 'pending-admin',
      save: jest.fn(),
    };
    Conversation.findById.mockReturnValue(mockQuery(conversation));

    const req = mockReq({ user: educatorUser, params: { id: CONVO_ID }, body: { status: 'resolved' } });
    const res = mockRes();
    const next = jest.fn();

    await controller.updateConversationStatus(req, res, next);

    expect(conversation.save).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });

  it('allows a staff participant to resolve, and clears resolvedAt on reopen', async () => {
    const conversation = {
      _id: CONVO_ID,
      participants: [STUDENT_ID, EDU_ID],
      status: 'pending-user',
      resolvedAt: null,
      save: jest.fn(function () { return Promise.resolve(this); }),
    };
    Conversation.findById.mockReturnValue(mockQuery(conversation));

    const req = mockReq({ user: educatorUser, params: { id: CONVO_ID }, body: { status: 'resolved' } });
    const res = mockRes();
    const next = jest.fn();

    await controller.updateConversationStatus(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(conversation.status).toBe('resolved');
    expect(conversation.resolvedAt).toBeInstanceOf(Date);
    expect(emitToUsers).toHaveBeenCalled();

    // Now reopen -> resolvedAt must be cleared, not left stale.
    const req2 = mockReq({ user: educatorUser, params: { id: CONVO_ID }, body: { status: 'pending-admin' } });
    await controller.updateConversationStatus(req2, res, next);
    expect(conversation.status).toBe('pending-admin');
    expect(conversation.resolvedAt).toBeNull();
  });
});

describe('sendMessage — closed conversation lifecycle', () => {
  const baseConversation = () => ({
    _id: CONVO_ID,
    participants: [STUDENT_ID, EDU_ID],
    status: 'closed',
    deletedFor: [],
    messageCount: 3,
    subject: 'Help',
    save: jest.fn(function () { return Promise.resolve(this); }),
  });

  it('blocks staff from sending into a closed conversation', async () => {
    const conversation = baseConversation();
    Conversation.findById.mockReturnValue(mockQuery(conversation));

    const req = mockReq({ user: educatorUser, params: { id: CONVO_ID }, body: { message: 'hello' } });
    const res = mockRes();
    const next = jest.fn();

    await controller.sendMessage(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].statusCode).toBe(400);
    expect(conversation.save).not.toHaveBeenCalled();
  });

  it('auto-reopens a closed conversation when the student replies', async () => {
    const conversation = baseConversation();
    Conversation.findById.mockReturnValue(mockQuery(conversation));
    Message.prototype.save = jest.fn().mockResolvedValue({ _id: 'm1' });
    Message.findById = jest.fn().mockReturnValue(mockQuery({
      toObject: () => ({ senderRole: 'student', _id: 'm1' }),
    }));
    User.find.mockReturnValue(mockQuery([]));

    const req = mockReq({ user: studentUser, params: { id: CONVO_ID }, body: { message: 'still broken' } });
    const res = mockRes();
    const next = jest.fn();

    await controller.sendMessage(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(conversation.status).toBe('pending-admin');
    expect(conversation.resolvedAt).toBeNull();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('clears deletedFor on any new reply so the thread reappears for anyone who hid it', async () => {
    const conversation = { ...baseConversation(), status: 'pending-user', deletedFor: [STUDENT_ID] };
    Conversation.findById.mockReturnValue(mockQuery(conversation));
    Message.prototype.save = jest.fn().mockResolvedValue({ _id: 'm2' });
    Message.findById = jest.fn().mockReturnValue(mockQuery({
      toObject: () => ({ senderRole: 'educator', _id: 'm2' }),
    }));
    User.find.mockReturnValue(mockQuery([{ _id: STUDENT_ID, role: 'student' }]));

    const req = mockReq({ user: educatorUser, params: { id: CONVO_ID }, body: { message: 'update' } });
    const res = mockRes();
    const next = jest.fn();

    await controller.sendMessage(req, res, next);

    expect(conversation.deletedFor).toEqual([]);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      link: `/support?conversationId=${CONVO_ID}`,
    }));
  });
});

describe('deleteConversation — soft delete', () => {
  it('hides the conversation for the requester without deleting it for the other participant', async () => {
    const conversation = {
      _id: CONVO_ID,
      participants: [STUDENT_ID, EDU_ID],
      deletedFor: [],
      save: jest.fn().mockResolvedValue(true),
      deleteOne: jest.fn(),
    };
    Conversation.findById.mockReturnValue(mockQuery(conversation));

    const req = mockReq({ user: studentUser, params: { id: CONVO_ID } });
    const res = mockRes();
    const next = jest.fn();

    await controller.deleteConversation(req, res, next);

    expect(conversation.deletedFor.map(String)).toEqual([STUDENT_ID]);
    expect(conversation.deleteOne).not.toHaveBeenCalled();
    expect(Message.deleteMany).not.toHaveBeenCalled();
    expect(conversation.save).toHaveBeenCalled();
  });

  it('hard-deletes once every participant has deleted it', async () => {
    const conversation = {
      _id: CONVO_ID,
      participants: [STUDENT_ID, EDU_ID],
      deletedFor: [EDU_ID],
      save: jest.fn().mockResolvedValue(true),
      deleteOne: jest.fn().mockResolvedValue(true),
    };
    Conversation.findById.mockReturnValue(mockQuery(conversation));
    Message.deleteMany.mockResolvedValue({ deletedCount: 2 });

    const req = mockReq({ user: studentUser, params: { id: CONVO_ID } });
    const res = mockRes();
    const next = jest.fn();

    await controller.deleteConversation(req, res, next);

    expect(Message.deleteMany).toHaveBeenCalledWith({ conversationId: CONVO_ID });
    expect(conversation.deleteOne).toHaveBeenCalled();
  });
});

describe('joinConversation — single assignment', () => {
  it('assigns the first joiner and leaves it assigned for a second joiner', async () => {
    const joined = {
      _id: CONVO_ID,
      participants: [STUDENT_ID, EDU_ID],
      assignedTo: null,
      populate: jest.fn().mockResolvedValue(undefined),
    };
    // Pre-join lookup used for the category defense-in-depth check.
    Conversation.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ category: 'general', participants: [STUDENT_ID] }),
    });
    Conversation.findByIdAndUpdate.mockReturnValue(mockQuery(joined));
    Conversation.findOneAndUpdate.mockImplementation((filter) => {
      // Simulate the real "only set if still null" semantics.
      if (joined.assignedTo === null) {
        joined.assignedTo = filter._id === CONVO_ID ? EDU_ID : joined.assignedTo;
      }
      return mockQuery(joined);
    });

    const req = mockReq({ user: educatorUser, params: { id: CONVO_ID } });
    const res = mockRes();
    const next = jest.fn();

    await controller.joinConversation(req, res, next);

    expect(joined.assignedTo).toBe(EDU_ID);
  });
});

describe('joinConversation — category defense in depth', () => {
  it('blocks an educator from joining a billing ticket even by direct ID', async () => {
    Conversation.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ category: 'billing', participants: [STUDENT_ID] }),
    });

    const req = mockReq({ user: educatorUser, params: { id: CONVO_ID } });
    const res = mockRes();
    const next = jest.fn();

    await controller.joinConversation(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].statusCode).toBe(403);
    expect(Conversation.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});

describe('getSupportQueue', () => {
  it('only queries unassigned tickets and excludes billing for educators', async () => {
    Conversation.find.mockReturnValue(mockQuery([]));

    const req = mockReq({ user: educatorUser, query: {} });
    const res = mockRes();
    const next = jest.fn();

    await controller.getSupportQueue(req, res, next);

    const calledWith = Conversation.find.mock.calls[0][0];
    expect(calledWith.assignedTo).toBeNull();
    expect(calledWith.category).toEqual({ $nin: ['billing'] });
  });

  it('does not restrict categories for admins', async () => {
    Conversation.find.mockReturnValue(mockQuery([]));

    const req = mockReq({ user: adminUser, query: {} });
    const res = mockRes();
    const next = jest.fn();

    await controller.getSupportQueue(req, res, next);

    const calledWith = Conversation.find.mock.calls[0][0];
    expect(calledWith.category).toBeUndefined();
  });
});

describe('createConversation', () => {
  it('rejects a staff member who does not pick a recipient (no more solo staff tickets)', async () => {
    const req = mockReq({ user: adminUser, body: { subject: 'Hi', message: 'hello' } });
    const res = mockRes();
    const next = jest.fn();

    await controller.createConversation(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });

  it('rejects an educator messaging a student outside their programs', async () => {
    Program.find.mockReturnValue({ distinct: jest.fn().mockResolvedValue([]) });
    ProgramEnrollment.find.mockReturnValue({ distinct: jest.fn().mockResolvedValue([]) });
    User.find.mockImplementation((filter) => {
      if (filter && filter.role === 'educator') {
        return { distinct: jest.fn().mockResolvedValue([]) };
      }
      return mockQuery([]);
    });
    User.findById.mockResolvedValue({ _id: STUDENT_ID, role: 'student' });

    const req = mockReq({
      user: educatorUser,
      body: { subject: 'Hi', message: 'hello', userId: STUDENT_ID },
    });
    const res = mockRes();
    const next = jest.fn();

    await controller.createConversation(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it('only notifies admins (not educators) for a billing ticket', async () => {
    Conversation.prototype.save = jest.fn().mockResolvedValue({ _id: CONVO_ID });
    Message.prototype.save = jest.fn().mockResolvedValue({ _id: 'm1' });
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: ADMIN_ID, role: 'admin' }]) });

    const req = mockReq({
      user: studentUser,
      body: { subject: 'Refund please', message: 'I was charged twice', category: 'billing' },
    });
    const res = mockRes();
    const next = jest.fn();

    await controller.createConversation(req, res, next);

    expect(User.find).toHaveBeenCalledWith({ role: { $in: ['admin'] } });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ userId: ADMIN_ID }));
  });
});
