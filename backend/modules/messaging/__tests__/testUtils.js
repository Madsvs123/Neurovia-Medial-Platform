/** Chainable, awaitable stand-in for a Mongoose query. */
function mockQuery(result) {
  const chain = {
    populate: jest.fn(() => chain),
    sort: jest.fn(() => chain),
    select: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    skip: jest.fn(() => chain),
    lean: jest.fn(() => chain),
    distinct: jest.fn(() => Promise.resolve(result)),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject),
  };
  return chain;
}

const ID = {
  admin: '507f1f77bcf86cd799439011',
  educator: '507f1f77bcf86cd799439012',
  educator2: '507f1f77bcf86cd799439015',
  student: '507f1f77bcf86cd799439013',
  student2: '507f1f77bcf86cd799439016',
  thread: '507f1f77bcf86cd799439099',
  program: '507f1f77bcf86cd799439077',
};

const users = {
  admin: { _id: ID.admin, role: 'admin', username: 'root' },
  educator: { _id: ID.educator, role: 'educator', username: 'drsmith' },
  educator2: { _id: ID.educator2, role: 'educator', username: 'drjones' },
  student: { _id: ID.student, role: 'student', username: 'jane' },
  student2: { _id: ID.student2, role: 'student', username: 'bob' },
};

/** A thread-like object with the methods services rely on. */
function makeThread(overrides = {}) {
  const t = {
    _id: ID.thread,
    kind: 'support',
    subject: 'Help',
    category: 'general',
    priority: 'normal',
    status: 'new',
    team: 'support',
    requester: ID.student,
    assignee: null,
    context: {},
    participants: [{ user: ID.student, role: 'requester', lastReadAt: null, deletedAt: null, archivedAt: null }],
    lastMessage: { text: 'hi' },
    lastActivityAt: new Date(),
    messageCount: 1,
    resolvedAt: null,
    closedAt: null,
    firstResponseAt: null,
    createdAt: new Date(),
    save: jest.fn(function () { return Promise.resolve(this); }),
    deleteOne: jest.fn(() => Promise.resolve()),
    toObject: function () { const rest = { ...this }; delete rest.save; delete rest.deleteOne; delete rest.toObject; return rest; },
    ...overrides,
  };
  return t;
}

function mockRes() {
  const res = { statusCode: 200 };
  res.status = jest.fn((c) => { res.statusCode = c; return res; });
  res.json = jest.fn((b) => { res.body = b; return res; });
  return res;
}

module.exports = { mockQuery, ID, users, makeThread, mockRes };
