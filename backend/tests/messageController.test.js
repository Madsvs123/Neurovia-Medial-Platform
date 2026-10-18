const { mockQuery, mockRes, mockReq } = require('./testUtils');

jest.mock('../models/Message');
jest.mock('../models/Conversation');

const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const controller = require('../controllers/messageController');

const AUTHOR_ID = '507f1f77bcf86cd799439021';
const OTHER_PARTICIPANT_ID = '507f1f77bcf86cd799439022';
const ADMIN_ID = '507f1f77bcf86cd799439023';
const MESSAGE_ID = '507f1f77bcf86cd799439099';

beforeEach(() => {
  jest.resetAllMocks();
});

describe('deleteMessage', () => {
  it('lets the author delete their own message', async () => {
    const message = { _id: MESSAGE_ID, sender: AUTHOR_ID, conversationId: 'c1', deleteOne: jest.fn() };
    Message.findById.mockReturnValue(mockQuery(message));
    Conversation.findById.mockReturnValue(mockQuery({
      participants: [AUTHOR_ID, OTHER_PARTICIPANT_ID],
      messageCount: 2,
      save: jest.fn(),
    }));

    const req = mockReq({ user: { _id: AUTHOR_ID, role: 'student' }, params: { id: MESSAGE_ID } });
    const res = mockRes();
    const next = jest.fn();

    await controller.deleteMessage(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(message.deleteOne).toHaveBeenCalled();
  });

  it('blocks a different participant from deleting someone else\'s message', async () => {
    const message = { _id: MESSAGE_ID, sender: AUTHOR_ID, conversationId: 'c1', deleteOne: jest.fn() };
    Message.findById.mockReturnValue(mockQuery(message));
    Conversation.findById.mockReturnValue(mockQuery({
      participants: [AUTHOR_ID, OTHER_PARTICIPANT_ID],
      save: jest.fn(),
    }));

    const req = mockReq({ user: { _id: OTHER_PARTICIPANT_ID, role: 'student' }, params: { id: MESSAGE_ID } });
    const res = mockRes();
    const next = jest.fn();

    await controller.deleteMessage(req, res, next);

    expect(message.deleteOne).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it('lets an admin delete any participant message for moderation', async () => {
    const message = { _id: MESSAGE_ID, sender: AUTHOR_ID, conversationId: 'c1', deleteOne: jest.fn() };
    Message.findById.mockReturnValue(mockQuery(message));
    Conversation.findById.mockReturnValue(mockQuery({
      participants: [AUTHOR_ID, ADMIN_ID],
      save: jest.fn(),
    }));

    const req = mockReq({ user: { _id: ADMIN_ID, role: 'admin' }, params: { id: MESSAGE_ID } });
    const res = mockRes();
    const next = jest.fn();

    await controller.deleteMessage(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(message.deleteOne).toHaveBeenCalled();
  });
});
