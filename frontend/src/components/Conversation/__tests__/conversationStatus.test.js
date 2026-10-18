import { describe, it, expect } from 'vitest';
import { getUserDisplayName, getConversationPartner } from '../conversationStatus';

describe('getUserDisplayName — identity fix (User has no `name` field)', () => {
  it('falls back to username, not an empty "name"', () => {
    expect(getUserDisplayName({ username: 'janedoe', email: 'jane@x.com' })).toBe('janedoe');
  });

  it('falls back to email when username is missing', () => {
    expect(getUserDisplayName({ email: 'jane@x.com' })).toBe('jane@x.com');
  });

  it('falls back to "Unknown User" when nothing is available', () => {
    expect(getUserDisplayName({})).toBe('Unknown User');
  });
});

describe('getConversationPartner', () => {
  it('returns the otherParticipant when present', () => {
    const conv = { otherParticipant: { _id: 'a' }, participants: [{ _id: 'a' }, { _id: 'b' }] };
    expect(getConversationPartner(conv, 'b')._id).toBe('a');
  });

  it('falls back to the first non-self participant', () => {
    const conv = { participants: [{ _id: 'a' }, { _id: 'b' }] };
    expect(getConversationPartner(conv, 'b')._id).toBe('a');
  });
});
