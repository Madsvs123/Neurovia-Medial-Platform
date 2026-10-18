const {
  connect, clearDb, disconnect, makeUser, makeProgram, enroll, as, notificationsFor, mongoose,
} = require('./setup');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

let admin, admin2, educator, educator2, student, student2, outsider;

beforeAll(connect);
afterAll(disconnect);

beforeEach(async () => {
  await clearDb();
  admin = await makeUser('admin');
  admin2 = await makeUser('admin');
  educator = await makeUser('educator');
  educator2 = await makeUser('educator');
  student = await makeUser('student');
  student2 = await makeUser('student');
  outsider = await makeUser('student');

  // educator owns a program; student + student2 are enrolled. educator2 has nothing.
  const program = await makeProgram(educator);
  await enroll(student, program);
  await enroll(student2, program);
});

const openTicket = async (who, body = {}) => {
  const res = await as(who).post('/api/conversations').send({
    subject: 'Cannot open lesson 3',
    message: 'The video never loads.',
    category: 'general',
    ...body,
  });
  expect(res.status).toBe(201);
  return res.body;
};

// ───────────────────────────── authorization guards ─────────────────────────────
describe('authorization guards', () => {
  test('students cannot list platform-wide messages or message stats', async () => {
    expect((await as(student).get('/api/messages')).status).toBe(403);
    expect((await as(student).get('/api/messages/stats')).status).toBe(403);
    expect((await as(educator).get('/api/messages')).status).toBe(403);
    expect((await as(admin).get('/api/messages')).status).toBe(200);
  });

  test('students cannot read the user directory via /conversations/new', async () => {
    const res = await as(student).get('/api/conversations/new');
    expect(res.status).toBe(403);
  });

  test('students cannot see the queue or stats; educators cannot see stats', async () => {
    expect((await as(student).get('/api/conversations/queue')).status).toBe(403);
    expect((await as(student).get('/api/conversations/stats')).status).toBe(403);
    expect((await as(educator).get('/api/conversations/stats')).status).toBe(403);
    expect((await as(admin).get('/api/conversations/stats')).status).toBe(200);
  });

  test('only admins may list all conversations (?scope=all)', async () => {
    await openTicket(student);
    expect((await as(educator).get('/api/conversations?scope=all')).status).toBe(403);
    expect((await as(student).get('/api/conversations?scope=all')).status).toBe(403);
    const res = await as(admin).get('/api/conversations?scope=all');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    // admin is not a participant, yet can see it (oversight)
    expect(res.body[0].isParticipant).toBe(false);
  });

  test('error responses expose a top-level message for the frontend', async () => {
    const res = await as(student).get('/api/conversations/queue');
    expect(res.body.message).toMatch(/Not authorized/);
  });
});

// ───────────────────────────── student ticket lifecycle ─────────────────────────────
describe('student support ticket', () => {
  test('creating a ticket: solo participant, pending-admin, staff notified with role-aware links', async () => {
    const conv = await openTicket(student);
    expect(conv.status).toBe('pending-admin');
    expect(conv.participants).toHaveLength(1);
    expect(conv.participants[0].username).toBe(student.username);
    expect(conv.assignedTo).toBeNull();
    expect(conv.otherParticipant).toBeNull();

    const [adminNotif] = await notificationsFor(admin);
    expect(adminNotif.link).toBe(`/admin/conversations/${conv._id}`);
    expect(adminNotif.message).toContain(student.username); // no more "A student"

    const [eduNotif] = await notificationsFor(educator);
    expect(eduNotif.link).toBe(`/educator/conversations/${conv._id}`);

    // educator2 has no program with this student → not notified
    expect(await notificationsFor(educator2)).toHaveLength(0);
  });

  test('billing tickets notify admins only (educators never handle billing)', async () => {
    await openTicket(student, { category: 'billing' });
    expect(await notificationsFor(admin)).toHaveLength(1);
    expect(await notificationsFor(educator)).toHaveLength(0);
  });

  test('a student cannot target a user (userId ignored) nor change status nor delete', async () => {
    const conv = await openTicket(student, { userId: student2._id });
    expect(conv.participants).toHaveLength(1);

    expect((await as(student).put(`/api/conversations/${conv._id}/status`).send({ status: 'resolved' })).status).toBe(403);
    expect((await as(student).delete(`/api/conversations/${conv._id}`)).status).toBe(403);
    expect((await as(educator).delete(`/api/conversations/${conv._id}`)).status).toBe(403);
  });

  test('non-participants cannot read a ticket, admins can', async () => {
    const conv = await openTicket(student);
    expect((await as(outsider).get(`/api/conversations/${conv._id}`)).status).toBe(403);
    expect((await as(outsider).get(`/api/conversations/${conv._id}/messages`)).status).toBe(403);
    expect((await as(educator2).get(`/api/conversations/${conv._id}`)).status).toBe(403);
    const res = await as(admin).get(`/api/conversations/${conv._id}`);
    expect(res.status).toBe(200);
    expect(res.body.canReply).toBe(false);
  });
});

// ───────────────────────────── queue + join ─────────────────────────────
describe('support queue and assignment', () => {
  test('admin sees every unassigned ticket; educator only their students in allowed categories', async () => {
    const t1 = await openTicket(student, { category: 'general' });
    const t2 = await openTicket(student, { category: 'billing' });
    const t3 = await openTicket(outsider, { category: 'general' });

    const adminQueue = (await as(admin).get('/api/conversations/queue')).body;
    expect(adminQueue.map(c => c._id).sort()).toEqual([t1._id, t2._id, t3._id].sort());

    const eduQueue = (await as(educator).get('/api/conversations/queue')).body;
    expect(eduQueue.map(c => c._id)).toEqual([t1._id]);

    const edu2Queue = (await as(educator2).get('/api/conversations/queue')).body;
    expect(edu2Queue).toEqual([]);
  });

  test('join assigns the ticket, removes it from the queue, and notifies the student', async () => {
    const conv = await openTicket(student);

    const joined = await as(educator).post(`/api/conversations/${conv._id}/join`);
    expect(joined.status).toBe(200);
    expect(joined.body.assignedTo._id).toBe(String(educator._id));
    expect(joined.body.participants).toHaveLength(2);
    expect(joined.body.otherParticipant.username).toBe(student.username);

    // no longer in anyone's queue
    expect((await as(admin).get('/api/conversations/queue')).body).toEqual([]);

    // second educator cannot grab it
    const second = await as(educator2).post(`/api/conversations/${conv._id}/join`);
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('ALREADY_ASSIGNED');

    // admin can still join for oversight without stealing assignment
    const adminJoin = await as(admin).post(`/api/conversations/${conv._id}/join`);
    expect(adminJoin.status).toBe(200);
    expect(adminJoin.body.assignedTo._id).toBe(String(educator._id));

    const studentNotifs = await notificationsFor(student);
    expect(studentNotifs.some(n => n.title === 'Support Joined' && n.link === `/conversations/${conv._id}`)).toBe(true);

    // join is idempotent
    const again = await as(educator).post(`/api/conversations/${conv._id}/join`);
    expect(again.body.participants).toHaveLength(3);
  });

  test('educators cannot join tickets outside their categories or from other students', async () => {
    const billing = await openTicket(student, { category: 'billing' });
    const res1 = await as(educator).post(`/api/conversations/${billing._id}/join`);
    expect(res1.status).toBe(403);
    expect(res1.body.code).toBe('CATEGORY_FORBIDDEN');

    const other = await openTicket(outsider, { category: 'general' });
    const res2 = await as(educator).post(`/api/conversations/${other._id}/join`);
    expect(res2.status).toBe(403);
    expect(res2.body.code).toBe('NOT_YOUR_STUDENT');
  });

  test('educators cannot join resolved tickets', async () => {
    const conv = await openTicket(student);
    await as(admin).put(`/api/conversations/${conv._id}/status`).send({ status: 'resolved' });
    const res = await as(educator).post(`/api/conversations/${conv._id}/join`);
    expect(res.status).toBe(409);
  });
});

// ───────────────────────────── messaging + status machine ─────────────────────────────
describe('messaging and status transitions', () => {
  test('staff must join before replying; replying flips status and notifies the student', async () => {
    const conv = await openTicket(student);

    const blocked = await as(admin).post(`/api/conversations/${conv._id}/messages`).send({ message: 'hi' });
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('NOT_PARTICIPANT');

    await as(admin).post(`/api/conversations/${conv._id}/join`);
    const reply = await as(admin).post(`/api/conversations/${conv._id}/messages`).send({ message: 'Looking into it' });
    expect(reply.status).toBe(201);
    expect(reply.body.sender.username).toBe(admin.username);
    expect(reply.body.senderRole).toBe('admin');
    expect(reply.body.conversationStatus).toBe('pending-user');

    const studentNotifs = await notificationsFor(student);
    const msgNotif = studentNotifs.find(n => n.title === 'New Message');
    expect(msgNotif.message).toContain(admin.username);
    expect(msgNotif.link).toBe(`/conversations/${conv._id}`);

    // student replies → pending-admin
    const back = await as(student).post(`/api/conversations/${conv._id}/messages`).send({ message: 'thanks' });
    expect(back.body.conversationStatus).toBe('pending-admin');
    const adminNotifs = await notificationsFor(admin);
    expect(adminNotifs.at(-1).link).toBe(`/admin/conversations/${conv._id}`);
  });

  test('resolved reopens on either side; closed blocks replies until reopened', async () => {
    const conv = await openTicket(student);
    await as(admin).post(`/api/conversations/${conv._id}/join`);

    let res = await as(admin).put(`/api/conversations/${conv._id}/status`).send({ status: 'resolved' });
    expect(res.body.resolvedAt).not.toBeNull();

    // student reply reopens
    res = await as(student).post(`/api/conversations/${conv._id}/messages`).send({ message: 'still broken' });
    expect(res.body.conversationStatus).toBe('pending-admin');
    expect((await Conversation.findById(conv._id)).resolvedAt).toBeNull();

    // staff reply into resolved reopens as pending-user
    await as(admin).put(`/api/conversations/${conv._id}/status`).send({ status: 'resolved' });
    res = await as(admin).post(`/api/conversations/${conv._id}/messages`).send({ message: 'one more thing' });
    expect(res.body.conversationStatus).toBe('pending-user');

    // closed is terminal
    await as(admin).put(`/api/conversations/${conv._id}/status`).send({ status: 'closed' });
    res = await as(student).post(`/api/conversations/${conv._id}/messages`).send({ message: 'hello?' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONVERSATION_CLOSED');
    expect((await Conversation.findById(conv._id)).status).toBe('closed');

    // reopen clears resolvedAt and re-enables replies
    res = await as(admin).put(`/api/conversations/${conv._id}/status`).send({ status: 'pending-admin' });
    expect(res.body.resolvedAt).toBeNull();
    res = await as(student).post(`/api/conversations/${conv._id}/messages`).send({ message: 'hello again' });
    expect(res.status).toBe(201);
  });

  test('status updates: educator must be a participant, admin may update anything, in-progress assigns', async () => {
    const conv = await openTicket(student);
    const denied = await as(educator).put(`/api/conversations/${conv._id}/status`).send({ status: 'resolved' });
    expect(denied.status).toBe(403);

    const ok = await as(admin2).put(`/api/conversations/${conv._id}/status`).send({ status: 'in-progress' });
    expect(ok.status).toBe(200);
    expect(ok.body.assignedTo._id).toBe(String(admin2._id));

    const bad = await as(admin).put(`/api/conversations/${conv._id}/status`).send({ status: 'bogus' });
    expect(bad.status).toBe(400);
  });

  test('message validation: empty and oversized bodies are rejected', async () => {
    const conv = await openTicket(student);
    expect((await as(student).post(`/api/conversations/${conv._id}/messages`).send({ message: '   ' })).status).toBe(400);
    expect((await as(student).post(`/api/conversations/${conv._id}/messages`).send({ message: 'x'.repeat(5001) })).status).toBe(400);
  });
});

// ───────────────────────────── read receipts ─────────────────────────────
describe('per-reader read receipts', () => {
  test('unread counts are tracked per participant, not globally', async () => {
    const conv = await openTicket(student);
    await as(educator).post(`/api/conversations/${conv._id}/join`);
    await as(admin).post(`/api/conversations/${conv._id}/join`);
    await as(student).post(`/api/conversations/${conv._id}/messages`).send({ message: 'second message' });

    const eduList = (await as(educator).get('/api/conversations/my')).body;
    expect(eduList[0].unreadCount).toBe(2);
    const adminList = (await as(admin).get('/api/conversations')).body;
    expect(adminList[0].unreadCount).toBe(2);

    // educator reads → only educator's count drops
    const marked = await as(educator).put(`/api/conversations/${conv._id}/read`);
    expect(marked.body.updated).toBe(2);
    expect((await as(educator).get('/api/conversations/my')).body[0].unreadCount).toBe(0);
    expect((await as(admin).get('/api/conversations/my')).body[0].unreadCount).toBe(2);

    // sender sees "read" tick once anyone else has read it
    const msgs = (await as(student).get(`/api/conversations/${conv._id}/messages`)).body;
    expect(msgs.every(m => m.read === true)).toBe(true);
    expect(msgs[0].readBy).toEqual([String(educator._id)]);

    // student's own messages never count as unread for the student
    expect((await as(student).get('/api/conversations/my')).body[0].unreadCount).toBe(0);
  });

  test('legacy read:true messages are treated as read by everyone', async () => {
    const conv = await openTicket(student);
    await Message.updateMany({ conversationId: conv._id }, { $set: { read: true } });
    await as(admin).post(`/api/conversations/${conv._id}/join`);
    expect((await as(admin).get('/api/conversations/my')).body[0].unreadCount).toBe(0);
  });

  test('mark-all-read covers every conversation of the requester', async () => {
    const c1 = await openTicket(student);
    const c2 = await openTicket(student2);
    await as(admin).post(`/api/conversations/${c1._id}/join`);
    await as(admin).post(`/api/conversations/${c2._id}/join`);
    const res = await as(admin).put('/api/conversations/mark-all-read');
    expect(res.body.modifiedCount).toBe(2);
  });
});

// ───────────────────────────── staff-initiated conversations ─────────────────────────────
describe('staff-initiated conversations', () => {
  test('admin form lists all non-admin users (with status) and every category', async () => {
    const res = await as(admin).get('/api/conversations/new');
    expect(res.status).toBe(200);
    expect(res.body.users.every(u => u.role !== 'admin')).toBe(true);
    expect(res.body.users.every(u => typeof u.status === 'string')).toBe(true);
    expect(res.body.users.some(u => u.role === 'educator')).toBe(true);
    expect(res.body.categories).toEqual(Conversation.CATEGORIES);
  });

  test('educator form lists only their enrolled students and educator categories', async () => {
    const res = await as(educator).get('/api/conversations/new');
    expect(res.body.users.map(u => u.username).sort()).toEqual([student.username, student2.username].sort());
    expect(res.body.categories).toEqual(['general', 'clinical', 'other']);
    expect((await as(educator2).get('/api/conversations/new')).body.users).toEqual([]);
  });

  test('staff without a recipient get a validation error (no more solo staff tickets)', async () => {
    const res = await as(admin).post('/api/conversations').send({ subject: 'x', message: 'y' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('RECIPIENT_REQUIRED');
  });

  test('educator → student in own program works and assigns; other targets are refused', async () => {
    const ok = await as(educator).post('/api/conversations').send({
      subject: 'Quiz feedback', message: 'Great work', userId: student._id, category: 'general',
    });
    expect(ok.status).toBe(201);
    expect(ok.body.status).toBe('pending-user');
    expect(ok.body.assignedTo._id).toBe(String(educator._id));
    expect(ok.body.otherParticipant.username).toBe(student.username);
    const [n] = await notificationsFor(student);
    expect(n.link).toBe(`/conversations/${ok.body._id}`);

    const notMine = await as(educator).post('/api/conversations').send({ subject: 'x', message: 'y', userId: outsider._id });
    expect(notMine.status).toBe(403);
    expect(notMine.body.code).toBe('NOT_YOUR_STUDENT');

    const billing = await as(educator).post('/api/conversations').send({ subject: 'x', message: 'y', userId: student._id, category: 'billing' });
    expect(billing.status).toBe(403);
    expect(billing.body.code).toBe('CATEGORY_FORBIDDEN');

    const toEducator = await as(educator).post('/api/conversations').send({ subject: 'x', message: 'y', userId: educator2._id });
    expect(toEducator.status).toBe(403);

    const toAdmin = await as(admin).post('/api/conversations').send({ subject: 'x', message: 'y', userId: admin2._id });
    expect(toAdmin.status).toBe(400);
    const toSelf = await as(admin).post('/api/conversations').send({ subject: 'x', message: 'y', userId: admin._id });
    expect(toSelf.status).toBe(400);
  });
});

// ───────────────────────────── soft delete + stats + payload hygiene ─────────────────────────────
describe('soft delete, stats and payload hygiene', () => {
  test('admin delete is a soft delete: hidden everywhere, messages preserved', async () => {
    const conv = await openTicket(student);
    const res = await as(admin).delete(`/api/conversations/${conv._id}`);
    expect(res.status).toBe(200);

    expect((await as(student).get('/api/conversations/my')).body).toEqual([]);
    expect((await as(admin).get('/api/conversations?scope=all')).body).toEqual([]);
    expect((await as(admin).get('/api/conversations/queue')).body).toEqual([]);
    expect((await as(student).get(`/api/conversations/${conv._id}`)).status).toBe(404);
    expect((await as(student).post(`/api/conversations/${conv._id}/messages`).send({ message: 'x' })).status).toBe(404);

    const stored = await Conversation.findById(conv._id);
    expect(stored.isDeleted).toBe(true);
    expect(String(stored.deletedBy)).toBe(String(admin._id));
    expect(await Message.countDocuments({ conversationId: conv._id })).toBe(1);

    const stats = (await as(admin).get('/api/conversations/stats')).body;
    expect(stats.deleted).toBe(1);
    expect(stats.total).toBe(0);
  });

  test('platform stats aggregate by status and category', async () => {
    const c1 = await openTicket(student, { category: 'general' });
    await openTicket(student2, { category: 'billing' });
    await as(admin).put(`/api/conversations/${c1._id}/status`).send({ status: 'resolved' });

    const stats = (await as(admin).get('/api/conversations/stats')).body;
    expect(stats.total).toBe(2);
    expect(stats.byStatus['pending-admin']).toBe(1);
    expect(stats.byStatus.resolved).toBe(1);
    expect(stats.byCategory.billing).toBe(1);
    expect(stats.unassigned).toBe(1);
    expect(stats.resolved).toBe(1);
  });

  test('participants in list payloads only expose safe fields', async () => {
    const conv = await openTicket(student);
    await as(admin).post(`/api/conversations/${conv._id}/join`);
    const list = (await as(student).get('/api/conversations/my')).body;
    const p = list[0].participants.find(x => x.role === 'admin');
    expect(Object.keys(p).sort()).toEqual(['_id', 'avatar', 'email', 'role', 'status', 'username'].sort());
    expect(p.passwordHash).toBeUndefined();
    expect(p.enrolledPrograms).toBeUndefined();
  });

  test('list ordering puts action-required conversations first', async () => {
    const a = await openTicket(student, { subject: 'A' });
    const b = await openTicket(student, { subject: 'B' });
    const c = await openTicket(student, { subject: 'C' });
    await as(admin).put(`/api/conversations/${c._id}/status`).send({ status: 'resolved' });
    await as(admin).post(`/api/conversations/${b._id}/join`);
    await as(admin).post(`/api/conversations/${b._id}/messages`).send({ message: 'hello' }); // → pending-user

    const list = (await as(student).get('/api/conversations/my')).body;
    expect(list.map(x => x.subject)).toEqual(['A', 'B', 'C']);
  });

  test('invalid ids yield 400, unknown ids 404', async () => {
    expect((await as(admin).get('/api/conversations/not-an-id')).status).toBe(400);
    expect((await as(admin).get(`/api/conversations/${new mongoose.Types.ObjectId()}`)).status).toBe(404);
  });
});

// ───────────────────────────── /api/messages ─────────────────────────────
describe('message endpoints', () => {
  test('educators can delete only their own messages; admins any; students none', async () => {
    const conv = await openTicket(student);
    await as(educator).post(`/api/conversations/${conv._id}/join`);
    const eduMsg = (await as(educator).post(`/api/conversations/${conv._id}/messages`).send({ message: 'edu' })).body;
    const studentMsg = (await Message.findOne({ conversationId: conv._id, senderRole: 'student' }));

    expect((await as(student).delete(`/api/messages/${eduMsg._id}`)).status).toBe(403);
    expect((await as(educator).delete(`/api/messages/${studentMsg._id}`)).status).toBe(403);
    expect((await as(educator).delete(`/api/messages/${eduMsg._id}`)).status).toBe(200);

    const after = await Conversation.findById(conv._id);
    expect(after.messageCount).toBe(1);
    expect(after.lastMessage.text).toBe('The video never loads.');

    await as(admin).post(`/api/conversations/${conv._id}/join`);
    expect((await as(admin).delete(`/api/messages/${studentMsg._id}`)).status).toBe(200);
  });

  test('single message read + get honour participation', async () => {
    const conv = await openTicket(student);
    const msg = await Message.findOne({ conversationId: conv._id });
    expect((await as(outsider).get(`/api/messages/${msg._id}`)).status).toBe(403);
    expect((await as(student).put(`/api/messages/${msg._id}/read`)).status).toBe(400); // own message
    await as(admin).post(`/api/conversations/${conv._id}/join`);
    const res = await as(admin).put(`/api/messages/${msg._id}/read`);
    expect(res.status).toBe(200);
    expect(res.body.readBy).toEqual([String(admin._id)]);
  });
});
