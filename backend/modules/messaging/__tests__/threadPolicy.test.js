const policy = require('../services/threadPolicy');
const { ID, users, makeThread } = require('./testUtils');

const supportTicket = () => makeThread();
const claimedTicket = () => makeThread({
  status: 'open', assignee: ID.educator,
  participants: [
    { user: ID.student, role: 'requester' },
    { user: ID.educator, role: 'assignee' },
  ],
});
const billingTicket = () => makeThread({ category: 'billing', team: 'billing' });
const direct = () => makeThread({
  kind: 'direct', status: 'open', team: null, requester: ID.educator,
  participants: [{ user: ID.educator, role: 'requester' }, { user: ID.student, role: 'collaborator' }],
});
const internal = () => makeThread({
  kind: 'internal', requester: ID.educator, team: 'support',
  participants: [{ user: ID.educator, role: 'requester' }],
});

describe('threadPolicy.can — visibility', () => {
  it('students never see internal threads, even by link', () => {
    expect(policy.can(users.student, 'view', internal())).toBe(false);
    expect(policy.can(users.student, 'readMessages', internal())).toBe(false);
  });

  it('admins may view metadata of any thread but must join to read messages', () => {
    const t = direct();
    expect(policy.can(users.admin, 'view', t)).toBe(true);
    expect(policy.can(users.admin, 'readMessages', t)).toBe(false);
    expect(policy.can(users.admin, 'join', t)).toBe(true);
  });

  it('a non-participant educator cannot view a DM between others', () => {
    expect(policy.can(users.educator2, 'view', direct())).toBe(false);
    expect(policy.can(users.educator2, 'join', direct())).toBe(false);
  });
});

describe('threadPolicy.can — queue & assignment', () => {
  it('educators can claim general support tickets but not billing', () => {
    expect(policy.can(users.educator, 'claim', supportTicket())).toBe(false); // general → support team = admin only
    expect(policy.can(users.educator, 'claim', billingTicket())).toBe(false);
    expect(policy.can(users.admin, 'claim', billingTicket())).toBe(true);
  });

  it('educators can claim clinical tickets', () => {
    const clinical = makeThread({ category: 'clinical', team: 'clinical' });
    expect(policy.can(users.educator, 'claim', clinical)).toBe(true);
  });

  it('nobody can claim an already-assigned ticket', () => {
    expect(policy.can(users.admin, 'claim', claimedTicket())).toBe(false);
  });

  it('only admins or the current assignee can reassign', () => {
    expect(policy.can(users.educator2, 'assign', claimedTicket())).toBe(false);
    expect(policy.can(users.educator, 'assign', claimedTicket())).toBe(true);
    expect(policy.can(users.admin, 'assign', claimedTicket())).toBe(true);
  });
});

describe('threadPolicy.can — replying & notes', () => {
  it('only participants can reply', () => {
    expect(policy.can(users.student, 'reply', supportTicket())).toBe(true);
    expect(policy.can(users.educator, 'reply', supportTicket())).toBe(false);
    expect(policy.can(users.educator, 'reply', claimedTicket())).toBe(true);
  });

  it('notes are staff-only', () => {
    expect(policy.can(users.student, 'note', claimedTicket())).toBe(false);
    expect(policy.can(users.educator, 'note', claimedTicket())).toBe(true);
  });

  it('status changes require participation; requester may resolve', () => {
    const t = claimedTicket();
    expect(policy.can(users.student, 'changeStatus', t)).toBe(true);
    expect(policy.capabilities(users.student, t).transitions).toEqual(['resolved']);
    expect(policy.can(users.admin, 'changeStatus', t)).toBe(false); // admin not in this thread
    expect(policy.can(users.student, 'changeStatus', direct())).toBe(false);
  });
});

describe('threadPolicy.capabilities', () => {
  it('returns a full boolean map plus transitions', () => {
    const caps = policy.capabilities(users.educator, claimedTicket());
    expect(caps.reply).toBe(true);
    expect(caps.note).toBe(true);
    expect(caps.escalate).toBe(true);
    expect(caps.claim).toBe(false);
    expect(caps.transitions).toEqual(['waiting_requester', 'resolved']);
  });
});
