import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders, student, educator, admin, thread } from './testUtils';
import ThreadView from '../components/ThreadView';
import { adminPortal, studentPortal } from '../portal';

vi.mock('../api/messagingApi', () => {
  const api = {
    getThread: vi.fn(), listMessages: vi.fn(), markRead: vi.fn().mockResolvedValue({}), templates: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn(), updateThread: vi.fn(), claim: vi.fn(), join: vi.fn(), recipients: vi.fn().mockResolvedValue({ users: [] }),
  };
  return { messagingApi: api, default: api };
});
import { messagingApi } from '../api/messagingApi';

const config = { teams: ['support', 'clinical'], categories: ['general', 'technical'], priorities: ['low', 'normal', 'high'], sla: { firstResponseHours: { normal: 24 } }, statuses: {}, kinds: {} };
const messagesPage = { items: [
  { _id: 'm1', kind: 'text', body: 'Lesson 3 will not play', sender: student, createdAt: new Date().toISOString() },
  { _id: 'm2', kind: 'system', body: 'ed picked up this ticket', meta: { event: 'claimed' }, createdAt: new Date().toISOString() },
], nextCursor: null };

beforeEach(() => { vi.clearAllMocks(); messagingApi.listMessages.mockResolvedValue(messagesPage); });

describe('ThreadView', () => {
  it('renders header, badges and the composer for an assignee; primary action is Mark solved', async () => {
    messagingApi.getThread.mockResolvedValue(thread());
    renderWithProviders(<ThreadView threadId="t1" currentUser={educator} config={config} portal={adminPortal} />);
    expect(await screen.findByText('Video broken')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark solved' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type a message…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Note' })).toBeInTheDocument();
    await waitFor(() => expect(messagingApi.listMessages).toHaveBeenCalledWith('t1', { before: undefined, limit: 50 }));
  });

  it('observe mode: admin who has not joined sees the banner, no messages fetch, and a Join CTA', async () => {
    messagingApi.getThread.mockResolvedValue(thread({ capabilities: { ...thread().capabilities, viewMessages: false, reply: false, note: false, isMember: false, join: true, changeStatus: false, transitions: [] } }));
    renderWithProviders(<ThreadView threadId="t1" currentUser={admin} config={config} portal={adminPortal} />);
    expect((await screen.findAllByText('Observing — join to read and reply')).length).toBeGreaterThan(0);
    expect(messagingApi.listMessages).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('Type a message…')).not.toBeInTheDocument();
    const joinButtons = screen.getAllByRole('button', { name: 'Join thread' });
    expect(joinButtons.length).toBeGreaterThan(0);
    messagingApi.join.mockResolvedValue(thread());
    fireEvent.click(joinButtons[0]);
    await waitFor(() => expect(messagingApi.join).toHaveBeenCalledWith('t1'));
  });

  it('closed ticket: staff composer is locked with a Reopen CTA; requester can still type', async () => {
    messagingApi.getThread.mockResolvedValue(thread({ status: 'closed', capabilities: { ...thread().capabilities, reply: false, transitions: ['open'] } }));
    const { unmount } = renderWithProviders(<ThreadView threadId="t1" currentUser={educator} config={config} portal={adminPortal} />);
    expect(await screen.findByText('This thread is closed. Reopen it to reply.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Type a message…')).not.toBeInTheDocument();
    unmount();

    messagingApi.getThread.mockResolvedValue(thread({ status: 'closed', capabilities: { ...thread().capabilities, reply: true, note: false, isRequester: true, isAssignee: false, transitions: ['open'] } }));
    renderWithProviders(<ThreadView threadId="t1" currentUser={student} config={config} portal={studentPortal} />);
    expect(await screen.findByPlaceholderText('Type a message…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
  });

  it('sends a message through the API', async () => {
    messagingApi.getThread.mockResolvedValue(thread());
    messagingApi.sendMessage.mockResolvedValue({ message: { _id: 'm3', kind: 'text', body: 'On it', sender: educator, createdAt: new Date().toISOString() } });
    renderWithProviders(<ThreadView threadId="t1" currentUser={educator} config={config} portal={adminPortal} />);
    const box = await screen.findByPlaceholderText('Type a message…');
    fireEvent.change(box, { target: { value: 'On it' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(messagingApi.sendMessage).toHaveBeenCalledWith('t1', { body: 'On it', kind: 'text' }));
  });
});
