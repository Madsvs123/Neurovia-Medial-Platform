/**
 * Wires the in-memory fake models into the messaging module (via jest.mock)
 * and provides fixture helpers. Require this at the top of a test file
 * BEFORE requiring any service.
 */
const { makeModel, ObjectId } = require('./fakeMongoose');
const { DEFAULT_ROUTING, DEFAULT_SLA } = require('../modules/messaging/config');

const mockUser = makeModel('User', { defaults: { status: 'active', role: 'student' } });
const mockProgram = makeModel('Program', { defaults: { educators: [] }, refs: {} });
const mockProgramEnrollment = makeModel('ProgramEnrollment');
const mockNotification = makeModel('Notification', { defaults: { read: false } });
const mockMessagingSettings = makeModel('MessagingSettings', { defaults: { routing: () => JSON.parse(JSON.stringify(DEFAULT_ROUTING)), sla: () => JSON.parse(JSON.stringify(DEFAULT_SLA)) } });
const mockReplyTemplate = makeModel('ReplyTemplate', { defaults: { active: true, roles: ['admin', 'educator'], order: 0 } });

const mockThread = makeModel('Thread', {
  defaults: {
    category: 'general', priority: 'normal', status: 'new', assignee: null, team: null,
    context: {}, participants: [], childThreads: [], parentThread: null,
    lastMessage: () => ({ text: '', senderId: null, at: new Date() }),
    messageCount: 0, firstResponseAt: null, resolvedAt: null, closedAt: null, slaBreachedAt: null,
  },
  methods: {
    participantOf(userId) {
      const id = userId?.toString();
      return this.participants.find((p) => (p.user?._id || p.user)?.toString() === id) || null;
    },
    isParticipant(userId) { return !!this.participantOf(userId); },
  },
  refs: {
    requester: 'User', assignee: 'User', 'participants.user': 'User',
    'context.programId': 'Program', parentThread: 'Thread', childThreads: 'Thread',
  },
});

const mockThreadMessage = makeModel('ThreadMessage', {
  defaults: { kind: 'text', sender: null, meta: null, attachments: [], editedAt: null, deletedAt: null },
  refs: { sender: 'User' },
});

jest.mock('../models/User', () => mockUser);
jest.mock('../models/Program', () => mockProgram);
jest.mock('../models/ProgramEnrollment', () => mockProgramEnrollment);
jest.mock('../models/Notification', () => mockNotification);
jest.mock('../modules/messaging/models/Thread', () => mockThread);
jest.mock('../modules/messaging/models/ThreadMessage', () => mockThreadMessage);
jest.mock('../modules/messaging/models/MessagingSettings', () => mockMessagingSettings);
jest.mock('../modules/messaging/models/ReplyTemplate', () => mockReplyTemplate);

const models = { User: mockUser, Program: mockProgram, ProgramEnrollment: mockProgramEnrollment, Notification: mockNotification, MessagingSettings: mockMessagingSettings, ReplyTemplate: mockReplyTemplate, Thread: mockThread, ThreadMessage: mockThreadMessage };

function resetAll() {
  Object.values(models).forEach((m) => m.reset());
  // routing cache
   
  require('../modules/messaging/services/routingService').invalidateCache();
}

async function user(role, username = `${role}_${Math.random().toString(36).slice(2, 6)}`) {
  return mockUser.create({ _id: new ObjectId(), username, email: `${username}@x.com`, role, status: 'active' });
}

async function program({ owner, educators = [], students = [] }) {
  const p = await mockProgram.create({ _id: new ObjectId(), title: 'Prog', code: `P${Math.random()}`, owner: owner._id, educators: educators.map((e) => e._id) });
  for (const s of students) await mockProgramEnrollment.create({ userId: s._id, programId: p._id });  
  return p;
}

module.exports = { models, resetAll, user, program, ObjectId };
