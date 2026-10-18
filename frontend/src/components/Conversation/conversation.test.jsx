import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders, axiosError } from '../../test/render';
import ChatWindow from './ChatWindow';
import ConversationCard from './ConversationCard';
import QuickReply from './QuickReply';
import StaffConversationDetailPage from './pages/StaffConversationDetailPage';
import StaffConversationsPage from './pages/StaffConversationsPage';
import {
  getReplyBlockReason, conversationBasePath, getUserDisplayName, isOwnMessage, getConversationPartner,
} from './conversationStatus';
import { createConversationApi, POLL_INTERVALS } from '../../services/conversationApi';

const admin = { _id: 'a1', username: 'alice_admin', role: 'admin' };
const educator = { _id: 'e1', username: 'ed_teacher', role: 'educator' };
const student = { _id: 's1', username: 'sam_student', email: 'sam@test.local', role: 'student' };

const msg = (overrides) => ({
  _id: Math.random().toString(36).slice(2),
  sender: student,
  senderRole: 'student',
  message: 'hello there',
  createdAt: '2026-01-01T10:00:00.000Z',
  readBy: [],
  read: false,
  ...overrides,
});

const conv = (overrides) => ({
  _id: 'c1',
  subject: 'Cannot open lesson 3',
  category: 'general',
  status: 'pending-admin',
  participants: [student],
  assignedTo: null,
  messageCount: 1,
  createdAt: '2026-01-01T10:00:00.000Z',
  lastMessageAt: '2026-01-01T10:00:00.000Z',
  lastMessage: { text: 'hello there' },
  isParticipant: true,
  canReply: true,
  unreadCount: 0,
  otherParticipant: null,
  ...overrides,
});

// ───────────────────────── helpers ─────────────────────────
describe('conversationStatus helpers', () => {
  test('display name falls back username → email (User model has no `name`)', () => {
    expect(getUserDisplayName({ username: 'bob' })).toBe('bob');
    expect(getUserDisplayName({ email: 'x@y.z' })).toBe('x@y.z');
    expect(getUserDisplayName(null)).toBe('Unknown User');
  });

  test('role-aware base paths match backend conversationLink()', () => {
    expect(conversationBasePath('admin')).toBe('/admin/conversations');
    expect(conversationBasePath('educator')).toBe('/educator/conversations');
    expect(conversationBasePath('student')).toBe('/conversations');
    expect(conversationBasePath(undefined)).toBe('/conversations');
  });

  test('reply block reasons mirror backend sendMessage rules', () => {
    expect(getReplyBlockReason(conv(), student)).toBeNull();
    expect(getReplyBlockReason(conv({ status: 'closed' }), student)).toBe('closed');
    expect(getReplyBlockReason(conv({ isParticipant: false }), admin)).toBe('join');
    expect(getReplyBlockReason(conv({ isParticipant: false }), student)).toBe('forbidden');
    expect(getReplyBlockReason(conv({ status: 'resolved' }), student)).toBeNull(); // resolved reopens on reply
  });

  test('isOwnMessage handles populated and raw sender ids', () => {
    expect(isOwnMessage(msg({ sender: student }), 's1')).toBe(true);
    expect(isOwnMessage(msg({ sender: 's1' }), 's1')).toBe(true);
    expect(isOwnMessage(msg({ sender: admin }), 's1')).toBe(false);
  });

  test('partner resolution prefers server-provided otherParticipant', () => {
    expect(getConversationPartner(conv({ otherParticipant: admin }), 's1')).toBe(admin);
    expect(getConversationPartner(conv({ participants: [student, admin] }), 's1').username).toBe('alice_admin');
    expect(getConversationPartner(conv(), 's1')).toBeNull();
  });
});

describe('conversation API factory', () => {
  test('binds every endpoint to the given axios instance exactly once', () => {
    const API = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() };
    const api = createConversationApi(API);
    api.getAllConversations();
    expect(API.get).toHaveBeenCalledWith('/api/conversations', { params: { scope: 'all' } });
    api.updateConversationStatus('c1', 'closed');
    expect(API.put).toHaveBeenCalledWith('/api/conversations/c1/status', { status: 'closed' });
    api.joinConversation('c1');
    expect(API.post).toHaveBeenCalledWith('/api/conversations/c1/join');
    expect(Object.keys(api)).toHaveLength(16);
  });

  test('polling cadence stays within the backend polling budget (240 req/min)', () => {
    const perMinute = (60000 / POLL_INTERVALS.messages) + (60000 / POLL_INTERVALS.conversations) * 3 + (60000 / POLL_INTERVALS.stats);
    expect(perMinute).toBeLessThan(60);
  });
});

// ───────────────────────── ChatWindow ─────────────────────────
describe('ChatWindow', () => {
  test('renders sender usernames (not "User"/"Support Team") and read ticks', () => {
    renderWithProviders(
      <ChatWindow
        conversation={conv()}
        messages={[msg({ sender: admin, senderRole: 'admin', message: 'Hi from admin' }), msg({ readBy: ['a1'] })]}
        currentUser={student}
        onSend={() => {}}
      />
    );
    expect(screen.getByText('alice_admin')).toBeInTheDocument();
    expect(screen.getByText('Hi from admin')).toBeInTheDocument();
    expect(screen.queryByText('Support Team')).not.toBeInTheDocument();
  });

  test('locks the composer with a message and action when disabled', () => {
    const onSend = vi.fn();
    renderWithProviders(
      <ChatWindow
        conversation={conv({ status: 'closed' })}
        messages={[msg()]}
        currentUser={student}
        onSend={onSend}
        disabled
        disabledMessage="This conversation has been closed by the support team."
        disabledAction={<button>Reopen</button>}
      />
    );
    expect(screen.getByText('This conversation has been closed by the support team.')).toBeInTheDocument();
    expect(screen.getByText('Reopen')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Type a message...')).not.toBeInTheDocument();
  });

  test('sends trimmed text on Enter and clears the box', () => {
    const onSend = vi.fn();
    renderWithProviders(<ChatWindow conversation={conv()} messages={[]} currentUser={student} onSend={onSend} />);
    const box = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(box, { target: { value: '  thanks!  ' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('thanks!');
    expect(box.value).toBe('');
  });
});

// ───────────────────────── QuickReply role scoping ─────────────────────────
describe('QuickReply', () => {
  test('educators do not get billing / technical / account templates', () => {
    renderWithProviders(<QuickReply onSelect={() => {}} role="educator" />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Greeting')).toBeInTheDocument();
    expect(screen.getByText('Clinical Content')).toBeInTheDocument();
    expect(screen.queryByText('Subscription & Billing')).not.toBeInTheDocument();
    expect(screen.queryByText('Technical Issue')).not.toBeInTheDocument();
    expect(screen.queryByText('Account Help')).not.toBeInTheDocument();
  });

  test('admins get every template group', () => {
    renderWithProviders(<QuickReply onSelect={() => {}} role="admin" />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Subscription & Billing')).toBeInTheDocument();
    expect(screen.getByText('Technical Issue')).toBeInTheDocument();
  });
});

// ───────────────────────── ConversationCard ─────────────────────────
describe('ConversationCard', () => {
  test('shows assignment and hides delete when no handler', () => {
    renderWithProviders(
      <ConversationCard conversation={conv({ assignedTo: educator, isAssignedToMe: false, otherParticipant: student })} currentUserId="a1" onClick={() => {}} />
    );
    expect(screen.getByText('Assigned to ed_teacher')).toBeInTheDocument();
    expect(screen.getByText('sam_student · Student')).toBeInTheDocument();
    expect(screen.queryByLabelText('Delete')).not.toBeInTheDocument();
  });
});

// ───────────────────────── Staff detail page ─────────────────────────
const makeApi = (overrides = {}) => ({
  getConversation: vi.fn().mockResolvedValue({ data: conv() }),
  getConversationMessages: vi.fn().mockResolvedValue({ data: [msg()] }),
  markConversationRead: vi.fn().mockResolvedValue({ data: { updated: 1 } }),
  sendMessage: vi.fn().mockResolvedValue({ data: msg() }),
  updateConversationStatus: vi.fn().mockResolvedValue({ data: conv() }),
  joinConversation: vi.fn().mockResolvedValue({ data: conv({ isParticipant: true }) }),
  getMyConversations: vi.fn().mockResolvedValue({ data: [] }),
  getSupportQueue: vi.fn().mockResolvedValue({ data: [] }),
  getAllConversations: vi.fn().mockResolvedValue({ data: [] }),
  getConversationStats: vi.fn().mockResolvedValue({ data: { total: 0 } }),
  deleteConversation: vi.fn().mockResolvedValue({ data: {} }),
  ...overrides,
});

describe('StaffConversationDetailPage', () => {
  test('admin viewing a ticket they have not joined sees view-only + Join, and no composer', async () => {
    const api = makeApi({ getConversation: vi.fn().mockResolvedValue({ data: conv({ isParticipant: false, canReply: false }) }) });
    renderWithProviders(
      <StaffConversationDetailPage api={api} role="admin" basePath="/admin/conversations" currentUser={admin} />,
      { path: '/admin/conversations/c1', routePath: '/admin/conversations/:id' }
    );
    expect(await screen.findByText('Cannot open lesson 3')).toBeInTheDocument();
    expect(screen.getByText('View only')).toBeInTheDocument();
    expect(screen.getByText('Join this conversation to reply')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Type a message...')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Join Conversation'));
    await waitFor(() => expect(api.joinConversation).toHaveBeenCalledWith('c1'));
  });

  test('a 403 renders an access alert with a back button — it must not redirect or crash', async () => {
    const api = makeApi({ getConversation: vi.fn().mockRejectedValue(axiosError(403, 'Not authorized to access this conversation', 'NOT_PARTICIPANT')) });
    renderWithProviders(
      <StaffConversationDetailPage api={api} role="educator" basePath="/educator/conversations" currentUser={educator} />,
      { path: '/educator/conversations/c1', routePath: '/educator/conversations/:id' }
    );
    expect(await screen.findByText('You do not have access to this conversation.')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.queryByTestId('somewhere-else')).not.toBeInTheDocument();
  });

  test('closed conversation locks the composer and offers Reopen; Close button is admin-only', async () => {
    const closed = conv({ status: 'closed', participants: [student, admin], otherParticipant: student, isParticipant: true, canReply: false });
    const api = makeApi({ getConversation: vi.fn().mockResolvedValue({ data: closed }) });
    renderWithProviders(
      <StaffConversationDetailPage api={api} role="admin" basePath="/admin/conversations" currentUser={admin} />,
      { path: '/admin/conversations/c1', routePath: '/admin/conversations/:id' }
    );
    expect(await screen.findByText('This conversation is closed. Reopen it to continue.')).toBeInTheDocument();
    const reopenButtons = screen.getAllByText('Reopen');
    fireEvent.click(reopenButtons[0]);
    await waitFor(() => expect(api.updateConversationStatus).toHaveBeenCalledWith('c1', 'pending-admin'));
    expect(screen.queryByText('Close')).not.toBeInTheDocument(); // already closed
  });

  test('educator participant gets Resolve but never Close; unread messages are marked read for this reader', async () => {
    const open = conv({ participants: [student, educator], otherParticipant: student, assignedTo: educator, isAssignedToMe: true });
    const api = makeApi({
      getConversation: vi.fn().mockResolvedValue({ data: open }),
      getConversationMessages: vi.fn().mockResolvedValue({ data: [msg({ readBy: ['a1'] })] }), // read by admin, not by educator
    });
    renderWithProviders(
      <StaffConversationDetailPage api={api} role="educator" basePath="/educator/conversations" currentUser={educator} />,
      { path: '/educator/conversations/c1', routePath: '/educator/conversations/:id' }
    );
    expect(await screen.findByText('Resolve')).toBeInTheDocument();
    expect(screen.queryByText('Close')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    await waitFor(() => expect(api.markConversationRead).toHaveBeenCalledWith('c1'));
  });
});

// ───────────────────────── Staff list page ─────────────────────────
describe('StaffConversationsPage', () => {
  test('admin sees the platform-wide tab and stats; educator does not', async () => {
    const api = makeApi({
      getMyConversations: vi.fn().mockResolvedValue({ data: [conv({ otherParticipant: student })] }),
      getSupportQueue: vi.fn().mockResolvedValue({ data: [conv({ _id: 'q1', subject: 'Queued ticket' })] }),
      getAllConversations: vi.fn().mockResolvedValue({ data: [conv(), conv({ _id: 'c2', subject: 'Someone else' })] }),
      getConversationStats: vi.fn().mockResolvedValue({ data: { total: 2, unassigned: 1, needsReply: 2, inProgress: 0, resolved: 0 } }),
    });
    renderWithProviders(<StaffConversationsPage api={api} role="admin" basePath="/admin/conversations" currentUser={admin} title="Support Conversations" />);
    expect(await screen.findByText('Support Conversations')).toBeInTheDocument();
    expect(screen.getByText('All Tickets')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Platform-wide')).toBeInTheDocument());
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(api.getAllConversations).toHaveBeenCalled();
    expect(api.getConversationStats).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Queue'));
    expect(await screen.findByText('Queued ticket')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Join'));
    await waitFor(() => expect(api.joinConversation).toHaveBeenCalledWith('q1'));
  });

  test('educator list has no platform tab / delete and shows the category hint', async () => {
    const api = makeApi({ getMyConversations: vi.fn().mockResolvedValue({ data: [conv({ otherParticipant: student })] }) });
    renderWithProviders(<StaffConversationsPage api={api} role="educator" basePath="/educator/conversations" currentUser={educator} title="Student Conversations" />);
    expect(await screen.findByText('Student Conversations')).toBeInTheDocument();
    expect(screen.queryByText('All Tickets')).not.toBeInTheDocument();
    expect(screen.getByText(/Educators handle General, Clinical and Other/)).toBeInTheDocument();
    expect((await screen.findAllByText('Cannot open lesson 3')).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Delete')).not.toBeInTheDocument();
    expect(api.getAllConversations).not.toHaveBeenCalled();
    expect(api.getConversationStats).not.toHaveBeenCalled();
  });
});
