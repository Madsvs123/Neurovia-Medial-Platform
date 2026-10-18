const sm = require('../services/threadStateMachine');

const staff = { role: 'educator', isRequester: false };
const admin = { role: 'admin', isRequester: false };
const requester = { role: 'student', isRequester: true };
const stranger = { role: 'student', isRequester: false };

describe('threadStateMachine.canTransition', () => {
  test.each([
    // kind, from, to, actor, expected
    ['support', 'new', 'open', staff, true],
    ['support', 'new', 'open', requester, false],
    ['support', 'open', 'waiting_requester', staff, true],
    ['support', 'open', 'resolved', requester, true],
    ['support', 'open', 'resolved', stranger, false],
    ['support', 'open', 'closed', staff, false],       // only admin may close directly
    ['support', 'open', 'closed', admin, true],
    ['support', 'resolved', 'open', requester, true],  // reopen
    ['support', 'closed', 'open', requester, false],   // closed needs staff
    ['support', 'closed', 'open', staff, true],
    ['support', 'open', 'open', staff, false],         // no-op is not a transition
    ['internal', 'new', 'open', staff, false],         // educators don't work internal
    ['internal', 'new', 'open', admin, true],
    ['direct', 'open', 'resolved', admin, false],      // direct threads have no lifecycle
  ])('%s: %s → %s by %o = %s', (kind, from, to, actor, expected) => {
    expect(sm.canTransition(kind, from, to, actor)).toBe(expected);
  });
});

describe('threadStateMachine.statusAfterMessage', () => {
  it('staff reply moves new/open → waiting_requester', () => {
    expect(sm.statusAfterMessage('support', 'new', { senderIsStaff: true })).toBe('waiting_requester');
    expect(sm.statusAfterMessage('support', 'open', { senderIsStaff: true })).toBe('waiting_requester');
  });

  it('requester reply moves waiting_requester → open', () => {
    expect(sm.statusAfterMessage('support', 'waiting_requester', { senderIsRequester: true })).toBe('open');
  });

  it('requester reply reopens resolved/closed only inside the reopen window', () => {
    expect(sm.statusAfterMessage('support', 'resolved', { senderIsRequester: true, withinReopenWindow: true })).toBe('open');
    expect(sm.statusAfterMessage('support', 'closed', { senderIsRequester: true, withinReopenWindow: true })).toBe('open');
    expect(sm.statusAfterMessage('support', 'resolved', { senderIsRequester: true, withinReopenWindow: false })).toBe('resolved');
  });

  it('staff reply on resolved does not reopen', () => {
    expect(sm.statusAfterMessage('support', 'resolved', { senderIsStaff: true })).toBe('resolved');
  });

  it('direct threads are always open', () => {
    expect(sm.statusAfterMessage('direct', 'open', { senderIsStaff: true })).toBe('open');
  });
});

describe('availableTransitions', () => {
  it('lists only what the actor may do', () => {
    expect(sm.availableTransitions('support', 'open', requester)).toEqual(['resolved']);
    expect(sm.availableTransitions('support', 'open', admin)).toEqual(['waiting_requester', 'resolved', 'closed']);
    expect(sm.availableTransitions('direct', 'open', admin)).toEqual([]);
  });
});
