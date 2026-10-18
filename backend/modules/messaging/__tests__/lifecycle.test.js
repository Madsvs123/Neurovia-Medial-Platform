/**
 * End-to-end service tests against the in-memory fake models:
 * student opens a ticket → routed → educator/admin claim → reply → note →
 * escalate → resolve → reopen, plus the policy matrix for who can DM whom.
 */
const harness = require('../../../tests/messagingHarness');

const threadService = require('../services/threadService');
const messageService = require('../services/messageService');
const assignmentService = require('../services/assignmentService');
const policy = require('../services/threadPolicy');
const events = require('../services/messagingEvents');
const { models, resetAll, user, program } = harness;

let admin; let edu; let edu2; let student; let stranger; let prog;

beforeEach(async () => {
  resetAll();
  admin = await user('admin', 'alice_admin');
  edu = await user('educator', 'ed_one');
  edu2 = await user('educator', 'ed_two');
  student = await user('student', 'sam_student');
  stranger = await user('student', 'other_student');
  prog = await program({ owner: edu, students: [student] });
});

describe('support ticket lifecycle', () => {
  it('routes a clinical ticket to the program educators and lets them claim it; billing is admin-only', async () => {
    const created = [];
    const handler = (e) => created.push(e);
    events.on('thread.created', handler);

    const clinical = await threadService.create(student, {
      kind: 'support', subject: 'Dosage question', body: 'Is 5mg right?', category: 'clinical', context: { programId: prog._id },
    });
    const billing = await threadService.create(student, { kind: 'support', subject: 'Charged twice', body: 'help', category: 'billing' });
    events.off('thread.created', handler);

    expect(clinical.team).toBe('clinical');
    expect(billing.team).toBe('billing');
    expect(clinical.status).toBe('new');

    // Candidates: program educator + admins (fallback); not edu2, not the student.
    const clinicalEvent = created.find((e) => e.thread._id.toString() === clinical._id.toString());
    expect(clinicalEvent.candidates.sort()).toEqual([admin._id.toString(), edu._id.toString()].sort());
    const billingEvent = created.find((e) => e.thread._id.toString() === billing._id.toString());
    expect(billingEvent.candidates).toEqual([admin._id.toString()]);

    // Educator queue shows only the clinical ticket; admin queue shows both.
    const eduQueue = await threadService.list(edu, { box: 'queue' });
    expect(eduQueue.items.map((t) => t.subject)).toEqual(['Dosage question']);
    const adminQueue = await threadService.list(admin, { box: 'queue' });
    expect(adminQueue.items.map((t) => t.subject).sort()).toEqual(['Charged twice', 'Dosage question']);

    // edu2 teaches no program with this student → cannot claim even by id.
    await expect(assignmentService.claim(edu2, clinical._id)).rejects.toMatchObject({ statusCode: 403 });
    // educator cannot claim billing
    await expect(assignmentService.claim(edu, billing._id)).rejects.toMatchObject({ statusCode: 403 });

    const claimed = await assignmentService.claim(edu, clinical._id);
    expect(claimed.assignee._id.toString()).toBe(edu._id.toString());
    expect(claimed.status).toBe('open');
    // second claimant loses the race
    await expect(assignmentService.claim(admin, clinical._id)).rejects.toMatchObject({ statusCode: 403 }); // already assigned → policy denies
    expect((await threadService.list(admin, { box: 'queue' })).items.map((t) => t.subject)).toEqual(['Charged twice']);
  });

  it('tracks first response, implicit status moves, notes visibility and reopen', async () => {
    const t = await threadService.create(student, { kind: 'support', subject: 'Video broken', body: 'Lesson 3 will not play', category: 'technical' });
    await assignmentService.claim(admin, t._id);

    // Student sees no notes; staff do.
    await messageService.send(admin, t._id, { body: 'Checking with infra', kind: 'note' });
    const forStudent = await messageService.list(student, t._id);
    expect(forStudent.items.some((m) => m.kind === 'note')).toBe(false);
    const forAdmin = await messageService.list(admin, t._id);
    expect(forAdmin.items.some((m) => m.kind === 'note')).toBe(true);

    // Staff reply → waiting_requester + firstResponseAt set
    const { thread: afterReply } = await messageService.send(admin, t._id, { body: 'Can you retry?' });
    expect(afterReply.status).toBe('waiting_requester');
    expect(afterReply.firstResponseAt).toBeInstanceOf(Date);

    // Student reply → open
    const { thread: afterStudent } = await messageService.send(student, t._id, { body: 'Still broken' });
    expect(afterStudent.status).toBe('open');

    // Resolve, then student reply reopens; staff cannot reply into closed.
    await threadService.update(admin, t._id, { status: 'resolved' });
    expect((await threadService.get(admin, t._id)).status).toBe('resolved');
    const { thread: reopened } = await messageService.send(student, t._id, { body: 'It broke again' });
    expect(reopened.status).toBe('open');
    expect(reopened.resolvedAt).toBeNull();

    await threadService.update(admin, t._id, { status: 'closed' });
    await expect(messageService.send(admin, t._id, { body: 'late reply' })).rejects.toMatchObject({ statusCode: 403 });
    // requester may still reopen by replying (within window)
    const { thread: reopened2 } = await messageService.send(student, t._id, { body: 'hello?' });
    expect(reopened2.status).toBe('open');

    // Audit trail: system messages recorded the transitions
    const all = await messageService.list(admin, t._id, { limit: 100 });
    const systemEvents = all.items.filter((m) => m.kind === 'system').map((m) => m.meta?.event);
    expect(systemEvents).toEqual(expect.arrayContaining(['claimed', 'status']));
  });

  it('unread counts are per participant and cleared by markRead', async () => {
    const t = await threadService.create(student, { kind: 'support', subject: 'Hi', body: 'first', category: 'general' });
    await assignmentService.claim(admin, t._id);
    await messageService.send(admin, t._id, { body: 'reply 1' });
    await messageService.send(admin, t._id, { body: 'reply 2' });

    const forStudent = await threadService.get(student, t._id);
    expect(forStudent.unreadCount).toBe(2);
    const forAdmin = await threadService.get(admin, t._id);
    expect(forAdmin.unreadCount).toBe(0); // admin sent the last messages

    await messageService.markRead(student, t._id);
    expect((await threadService.get(student, t._id)).unreadCount).toBe(0);
    expect((await threadService.counts(student)).unread).toBe(0);
  });

  it('escalation creates a linked internal thread for the admin team', async () => {
    const t = await threadService.create(student, { kind: 'support', subject: 'Weird case', body: 'Q', category: 'clinical', context: { programId: prog._id } });
    await assignmentService.claim(edu, t._id);
    const { thread, child } = await assignmentService.escalate(edu, t._id, { toTeam: 'support', note: 'Need admin to check enrollment' });

    expect(child.kind).toBe('internal');
    expect(child.parentThread._id.toString()).toBe(t._id.toString());
    expect(thread.childThreads.map((c) => c._id.toString())).toContain(child._id.toString());
    expect(child.requester._id.toString()).toBe(edu._id.toString());
    // shows up in the admin queue (internal routed to support team/admin)
    const adminQueue = await threadService.list(admin, { box: 'queue' });
    expect(adminQueue.items.some((x) => x._id.toString() === child._id.toString())).toBe(true);
    // the student can't see the internal thread
    await expect(threadService.get(student, child._id)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('admins observe everything but must join before reading; the join is a visible system message', async () => {
    const t = await threadService.create(student, { kind: 'direct', subject: 'Office hours?', body: 'When?', to: edu._id });
    const all = await threadService.list(admin, { box: 'all' });
    expect(all.items.map((x) => x.subject)).toContain('Office hours?');

    const meta = await threadService.get(admin, t._id);
    expect(meta.capabilities.viewMessages).toBe(false);
    expect(meta.capabilities.join).toBe(true);
    await expect(messageService.list(admin, t._id)).rejects.toMatchObject({ statusCode: 403 });

    await threadService.join(admin, t._id);
    const msgs = await messageService.list(student, t._id);
    expect(msgs.items.some((m) => m.kind === 'system' && /joined/.test(m.body))).toBe(true);
    expect((await threadService.get(admin, t._id)).capabilities.reply).toBe(true);
  });
});

describe('direct message policy', () => {
  it('student ↔ educator only within a shared program; student → admin must use a ticket', async () => {
    expect((await policy.canMessageDirectly(student, edu)).ok).toBe(true);
    expect((await policy.canMessageDirectly(student, edu2)).ok).toBe(false);
    expect((await policy.canMessageDirectly(student, admin)).ok).toBe(false);
    expect((await policy.canMessageDirectly(student, stranger)).ok).toBe(false);
  });

  it('educator → own students / other educators; educator → admin must use an internal request', async () => {
    expect((await policy.canMessageDirectly(edu, student)).ok).toBe(true);
    expect((await policy.canMessageDirectly(edu2, student)).ok).toBe(false);
    expect((await policy.canMessageDirectly(edu, edu2)).ok).toBe(true);
    expect((await policy.canMessageDirectly(edu, admin)).ok).toBe(false);
    expect((await policy.canMessageDirectly(admin, student)).ok).toBe(true);
  });

  it('educator internal request lands with the admin team; admin can address an educator directly', async () => {
    const req = await threadService.create(edu, { kind: 'internal', subject: 'Please fix enrollment', body: 'Student X missing', category: 'general' });
    expect(req.team).toBe('support');
    expect((await threadService.list(admin, { box: 'queue' })).items.map((t) => t.subject)).toContain('Please fix enrollment');
    await expect(threadService.create(edu, { kind: 'internal', subject: 'x', body: 'y', to: edu2._id })).rejects.toMatchObject({ statusCode: 400 });

    const task = await threadService.create(admin, { kind: 'internal', subject: 'Review module 2', body: 'Please', to: edu._id });
    expect(task.assignee._id.toString()).toBe(edu._id.toString());
    expect(task.status).toBe('open');
  });

  it('students cannot open internal threads; staff cannot open support tickets', async () => {
    await expect(threadService.create(student, { kind: 'internal', subject: 'x', body: 'y' })).rejects.toMatchObject({ statusCode: 403 });
    await expect(threadService.create(admin, { kind: 'support', subject: 'x', body: 'y' })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('recipient directory is role-scoped', async () => {
    const forStudent = await threadService.recipients(student, { kind: 'direct' });
    expect(forStudent.users.map((u) => u.username)).toEqual(['ed_one']);
    const forEdu = await threadService.recipients(edu, { kind: 'direct' });
    expect(forEdu.users.map((u) => u.username).sort()).toEqual(['ed_two', 'sam_student']);
    const forEduInternal = await threadService.recipients(edu, { kind: 'internal' });
    expect(forEduInternal.users.map((u) => u.username)).toEqual(['alice_admin']);
    expect((await threadService.recipients(admin, { kind: 'direct' })).users.length).toBe(4);
  });
});

describe('soft delete / archive', () => {
  it('archiving hides from inbox, new activity un-archives', async () => {
    const t = await threadService.create(student, { kind: 'direct', subject: 'Hi', body: 'yo', to: edu._id });
    await threadService.setArchived(student, t._id, true);
    expect((await threadService.list(student, { box: 'inbox' })).items.length).toBe(0);
    expect((await threadService.list(student, { box: 'archived' })).items.length).toBe(1);
    await messageService.send(edu, t._id, { body: 'new activity' });
    expect((await threadService.list(student, { box: 'inbox' })).items.length).toBe(1);
  });

  it('per-user delete; hard delete only once everyone deleted (or admin)', async () => {
    const t = await threadService.create(student, { kind: 'direct', subject: 'Hi', body: 'yo', to: edu._id });
    expect(await threadService.remove(student, t._id)).toMatchObject({ hidden: true });
    expect(await models.Thread.countDocuments({})).toBe(1);
    await expect(threadService.get(student, t._id)).rejects.toMatchObject({ statusCode: 404 });
    expect(await threadService.remove(edu, t._id)).toMatchObject({ deleted: true });
    expect(await models.Thread.countDocuments({})).toBe(0);
    expect(await models.ThreadMessage.countDocuments({})).toBe(0);
  });
});
