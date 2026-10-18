const { mapLegacyConversation } = require('../../../scripts/lib/mapLegacyConversation');

const S = 'stu', E = 'edu', A = 'adm', E2 = 'edu2';
const roles = { [S]: 'student', [E]: 'educator', [A]: 'admin', [E2]: 'educator' };
const d = (h) => new Date(Date.UTC(2026, 0, 1, h));

describe('legacy conversation → thread mapping', () => {
  it('student ticket picked up by an educator → support, assignee, waiting_requester, per-user lastReadAt', () => {
    const c = { _id: 'c1', subject: 'Help', category: 'support', status: 'pending-user', createdBy: S, participants: [S, E], assignedTo: E, createdAt: d(0), updatedAt: d(3), lastMessage: { text: 'ok', senderId: E }, lastMessageAt: d(3) };
    const msgs = [
      { sender: S, senderRole: 'student', message: 'hi', createdAt: d(0), read: true, readAt: d(1) },
      { sender: E, senderRole: 'educator', message: 'hello', createdAt: d(2), read: false },
    ];
    const { thread, messages } = mapLegacyConversation(c, msgs, roles);
    expect(thread.kind).toBe('support');
    expect(thread.category).toBe('general');
    expect(thread.status).toBe('waiting_requester');
    expect(thread.assignee).toBe(E);
    expect(thread.requester).toBe(S);
    expect(thread.firstResponseAt).toEqual(d(2));
    const byUser = Object.fromEntries(thread.participants.map((p) => [p.user, p]));
    expect(byUser[S].role).toBe('requester');
    expect(byUser[E].role).toBe('assignee');
    expect(byUser[E].lastReadAt).toEqual(d(1)); // educator read the student's message
    expect(byUser[S].lastReadAt).toBeNull(); // student hasn't read the reply
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ kind: 'text', body: 'hi' });
  });

  it('unassigned pending-admin ticket → new; closed keeps closedAt; deletedFor → deletedAt', () => {
    const c = { _id: 'c2', subject: 'x', status: 'pending-admin', createdBy: S, participants: [S], createdAt: d(0), updatedAt: d(0), deletedFor: [S] };
    expect(mapLegacyConversation(c, [], roles).thread).toMatchObject({ kind: 'support', status: 'new', assignee: null });
    expect(mapLegacyConversation(c, [], roles).thread.participants[0].deletedAt).toBeInstanceOf(Date);
    const closed = { ...c, status: 'closed', resolvedAt: d(5), deletedFor: [] };
    expect(mapLegacyConversation(closed, [], roles).thread).toMatchObject({ status: 'closed', closedAt: d(5), resolvedAt: d(5) });
  });

  it('staff-initiated 1:1 with a student → direct/open; staff-only → internal', () => {
    const dm = { _id: 'c3', subject: 'dm', status: 'pending-user', createdBy: E, participants: [S, E], createdAt: d(0), updatedAt: d(0) };
    expect(mapLegacyConversation(dm, [], roles).thread).toMatchObject({ kind: 'direct', status: 'open', assignee: null });
    const internal = { _id: 'c4', subject: 'int', status: 'pending-user', createdBy: E, participants: [E, A], createdAt: d(0), updatedAt: d(0) };
    expect(mapLegacyConversation(internal, [], roles).thread).toMatchObject({ kind: 'internal', status: 'waiting_requester', assignee: A });
  });

  it('three-party legacy thread (student + two staff) stays a support ticket with collaborators', () => {
    const c = { _id: 'c5', subject: 'multi', status: 'in-progress', createdBy: S, participants: [S, E, A], assignedTo: A, createdAt: d(0), updatedAt: d(0) };
    const { thread } = mapLegacyConversation(c, [], roles);
    expect(thread.kind).toBe('support');
    expect(thread.status).toBe('open');
    expect(thread.participants.map((p) => p.role).sort()).toEqual(['assignee', 'collaborator', 'requester']);
  });

  it('flags conversations without participants and unknown creators', () => {
    expect(mapLegacyConversation({ _id: 'c6', participants: [] }, [], roles).error).toMatch(/no participants/);
    const orphan = mapLegacyConversation({ _id: 'c7', subject: 'o', status: 'open', createdBy: 'ghost', participants: ['ghost', E], createdAt: d(0), updatedAt: d(0) }, [], roles);
    expect(orphan.warning).toMatch(/creator user missing/);
    expect(orphan.thread.kind).toBe('support');
  });
});
