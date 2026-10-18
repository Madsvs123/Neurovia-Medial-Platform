const harness = require('../../../tests/messagingHarness');

jest.mock('../../../utils/socket', () => ({ emitToUser: jest.fn() }));

const threadService = require('../services/threadService');
const messageService = require('../services/messageService');
const assignmentService = require('../services/assignmentService');
const adminService = require('../services/adminService');
const slaJob = require('../jobs/slaJob');
const subscriber = require('../../notifications/messagingSubscriber');
const { models, user, program, resetAll } = harness;

let admin; let admin2; let edu; let edu2; let student; let prog;
let registered = false;

beforeEach(async () => {
  resetAll();
  if (!registered) { subscriber.register(); registered = true; }
  admin = await user('admin', 'admin1');
  admin2 = await user('admin', 'admin2');
  edu = await user('educator', 'edu1');
  edu2 = await user('educator', 'edu2');
  student = await user('student', 'stu1');
  prog = await program({ owner: edu, students: [student] });
});

const flush = () => new Promise((r) => setTimeout(r, 20));
const notifsFor = (u) => models.Notification.docs.filter((n) => n.userId.toString() === u._id.toString());

describe('notification fan-out', () => {
  it('new clinical ticket notifies the program educator + admins, not unrelated educators', async () => {
    await threadService.create(student, { kind: 'support', subject: 'Q', body: 'x', category: 'clinical', context: { programId: prog._id } });
    await flush();
    expect(notifsFor(edu).length).toBe(1);
    expect(notifsFor(admin).length).toBe(1);
    expect(notifsFor(admin2).length).toBe(1);
    expect(notifsFor(edu2).length).toBe(0);
    expect(notifsFor(student).length).toBe(0);
    expect(notifsFor(edu)[0].link).toBe(`/educator/messages/${models.Thread.docs[0]._id}`);
    expect(notifsFor(admin)[0].link).toBe(`/admin/messages/${models.Thread.docs[0]._id}`);
  });

  it('billing tickets notify admins only', async () => {
    await threadService.create(student, { kind: 'support', subject: 'Refund', body: 'x', category: 'billing' });
    await flush();
    expect(notifsFor(admin).length).toBe(1);
    expect(notifsFor(edu).length).toBe(0);
  });

  it('digests rapid messages into one notification per thread and uses student links', async () => {
    const t = await threadService.create(student, { kind: 'support', subject: 'Q', body: 'x', category: 'general' });
    await assignmentService.claim(admin, t._id);
    await messageService.send(admin, t._id, { body: 'one' });
    await messageService.send(admin, t._id, { body: 'two' });
    await messageService.send(admin, t._id, { body: 'three' });
    await flush();
    const mine = notifsFor(student).filter((n) => n.type === 'new_message');
    expect(mine.length).toBe(1);
    expect(mine[0].link).toBe(`/messages/${t._id}`);
    expect(mine[0].message).toMatch(/new messages/);
  });

  it('internal notes never notify the student', async () => {
    const t = await threadService.create(student, { kind: 'support', subject: 'Q', body: 'x', category: 'general' });
    await assignmentService.claim(admin, t._id);
    await threadService.addParticipant(admin, t._id, { userId: edu._id });
    models.Notification.reset();
    await messageService.send(admin, t._id, { body: 'secret', kind: 'note' });
    await flush();
    expect(notifsFor(student).length).toBe(0);
    expect(notifsFor(edu).length).toBe(1);
  });
});

describe('SLA job', () => {
  it('flags breached tickets, bumps priority and auto-closes stale resolved ones', async () => {
    const breached = await threadService.create(student, { kind: 'support', subject: 'Old', body: 'x', category: 'general' });
    const doc = models.Thread.docs.find((d) => d._id.toString() === breached._id.toString());
    doc.createdAt = new Date(Date.now() - 48 * 3600 * 1000); // normal SLA = 24h

    const fresh = await threadService.create(student, { kind: 'support', subject: 'Fresh', body: 'x', category: 'general' });

    const stale = await threadService.create(student, { kind: 'support', subject: 'Stale resolved', body: 'x', category: 'general' });
    await assignmentService.claim(admin, stale._id);
    await threadService.update(admin, stale._id, { status: 'resolved' });
    models.Thread.docs.find((d) => d._id.toString() === stale._id.toString()).resolvedAt = new Date(Date.now() - 20 * 24 * 3600 * 1000);

    const result = await slaJob.runOnce();
    expect(result).toEqual({ breaches: 1, closed: 1 });

    const b = await threadService.get(admin, breached._id);
    expect(b.slaBreachedAt).toBeTruthy();
    expect(b.priority).toBe('high');
    expect((await threadService.get(admin, fresh._id)).slaBreachedAt).toBeNull();
    expect((await threadService.get(admin, stale._id)).status).toBe('closed');

    // idempotent
    expect(await slaJob.runOnce()).toEqual({ breaches: 0, closed: 0 });
    await flush();
    expect(notifsFor(admin).some((n) => n.title === 'SLA breached')).toBe(true);
  });
});

describe('admin service: templates + settings', () => {
  it('serves role-filtered built-ins until seeded, then DB templates', async () => {
    const eduList = await adminService.listTemplates(edu);
    expect(eduList.every((t) => t.builtin && t.roles.includes('educator'))).toBe(true);
    expect(eduList.some((t) => t.category === 'Subscription & Billing')).toBe(false);
    const adminList = await adminService.listTemplates(admin);
    expect(adminList.some((t) => t.category === 'Subscription & Billing')).toBe(true);

    expect((await adminService.seedTemplates(admin)).inserted).toBeGreaterThan(0);
    expect((await adminService.seedTemplates(admin)).inserted).toBe(0);
    const after = await adminService.listTemplates(edu);
    expect(after.every((t) => !t.builtin)).toBe(true);
    await expect(adminService.createTemplate(edu, { category: 'x', title: 'y', body: 'z' })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('validates routing updates and invalidates the cache', async () => {
    await expect(adminService.updateSettings(admin, { routing: { support: { billing: { team: 'nope', roles: ['admin'] } } } })).rejects.toMatchObject({ statusCode: 400 });
    await adminService.updateSettings(admin, { routing: { support: { general: { team: 'technical', roles: ['admin', 'educator'] } } } });
    const t = await threadService.create(student, { kind: 'support', subject: 'Q', body: 'x', category: 'general' });
    expect(t.team).toBe('technical');
    expect((await threadService.list(edu, { box: 'queue' })).items.length).toBe(1);
  });
});
