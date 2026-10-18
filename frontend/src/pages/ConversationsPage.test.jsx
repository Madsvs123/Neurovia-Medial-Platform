import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { renderWithProviders } from '../test/render';

vi.mock('../services/api', () => ({
  conversationApi: {
    getMyConversations: vi.fn(),
    getConversation: vi.fn(),
    getConversationMessages: vi.fn(),
    markConversationRead: vi.fn().mockResolvedValue({ data: {} }),
    sendMessage: vi.fn().mockResolvedValue({ data: {} }),
    createConversation: vi.fn(),
  },
}));

import { conversationApi } from '../services/api';
import ConversationsPage from './ConversationsPage';

const student = { id: 's1', username: 'sam', role: 'student' };
const admin = { id: 'a1', username: 'alice', role: 'admin' };
const conv = (o) => ({
  _id: 'c1', subject: 'Lesson 3 broken', category: 'technical', status: 'pending-user',
  participants: [{ _id: 's1', username: 'sam', role: 'student' }, { _id: 'a1', username: 'alice', role: 'admin' }],
  otherParticipant: { _id: 'a1', username: 'alice', role: 'admin' },
  isParticipant: true, canReply: true, unreadCount: 1, lastMessage: { text: 'We are on it' },
  createdAt: '2026-01-01', lastMessageAt: '2026-01-01', ...o,
});
const withStore = (ui, user) => (
  <Provider store={configureStore({ reducer: { auth: () => ({ userInfo: user }) } })}>{ui}</Provider>
);

beforeEach(() => {
  conversationApi.getMyConversations.mockResolvedValue({ data: [conv()] });
  conversationApi.getConversationMessages.mockResolvedValue({
    data: [{ _id: 'm1', sender: { _id: 'a1', username: 'alice' }, senderRole: 'admin', message: 'We are on it', createdAt: '2026-01-01T10:00:00Z', readBy: [] }],
  });
});

describe('student /conversations page', () => {
  test('lists conversations and opens a thread from a deep link, marking it read', async () => {
    renderWithProviders(withStore(<ConversationsPage />, student), { path: '/conversations/c1', routePath: '/conversations/:id' });
    expect(await screen.findByText('Messages')).toBeInTheDocument();
    expect((await screen.findAllByText('Lesson 3 broken')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('We are on it')).length).toBeGreaterThan(0); // preview + bubble
    expect(screen.getByText('Support Team: alice')).toBeInTheDocument();
    await waitFor(() => expect(conversationApi.markConversationRead).toHaveBeenCalledWith('c1'));

    const box = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(box, { target: { value: 'thanks' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(conversationApi.sendMessage).toHaveBeenCalledWith('c1', { message: 'thanks' }));
  });

  test('closed thread shows the locked composer for students', async () => {
    conversationApi.getMyConversations.mockResolvedValue({ data: [conv({ status: 'closed', canReply: false })] });
    renderWithProviders(withStore(<ConversationsPage />, student), { path: '/conversations/c1', routePath: '/conversations/:id' });
    expect(await screen.findByText('This conversation has been closed by the support team.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Type a message...')).not.toBeInTheDocument();
  });

  test('staff landing on a legacy /conversations/:id link are redirected to their panel', async () => {
    renderWithProviders(withStore(<ConversationsPage />, admin), { path: '/conversations/c1', routePath: '/conversations/:id' });
    expect(await screen.findByTestId('somewhere-else')).toBeInTheDocument();
  });

  test('new-conversation form submits subject/category/message', async () => {
    conversationApi.createConversation.mockResolvedValue({ data: { _id: 'c9' } });
    renderWithProviders(withStore(<ConversationsPage />, student), { path: '/conversations', routePath: '/conversations' });
    fireEvent.click(await screen.findByText('Start New Chat'));
    fireEvent.change(screen.getByPlaceholderText('Subject *'), { target: { value: 'Refund please' } });
    fireEvent.change(screen.getByDisplayValue('General'), { target: { value: 'billing' } });
    fireEvent.change(screen.getByPlaceholderText('Message *'), { target: { value: 'Charged twice' } });
    fireEvent.click(screen.getByText('Start Conversation'));
    await waitFor(() => expect(conversationApi.createConversation).toHaveBeenCalledWith({ subject: 'Refund please', category: 'billing', message: 'Charged twice' }));
  });
});
