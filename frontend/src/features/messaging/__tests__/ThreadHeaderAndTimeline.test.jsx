import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, thread, users } from './testUtils';
import ThreadHeader from '../components/ThreadView/ThreadHeader';
import MessageTimeline from '../components/ThreadView/MessageTimeline';
import ThreadListItem from '../components/ThreadList/ThreadListItem';

describe('ThreadHeader — buttons come from server capabilities', () => {
  it('renders Claim for a queue ticket and nothing destructive the policy forbids', () => {
    const onAction = vi.fn();
    const t = thread({ assignee: null, me: null, capabilities: { claim: true, join: true, reply: false, transitions: [] } });
    renderWithProviders(<ThreadHeader thread={t} isStaff onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Claim' }));
    expect(onAction).toHaveBeenCalledWith('claim');
    expect(screen.queryByRole('button', { name: 'Mark resolved' })).not.toBeInTheDocument();
  });

  it('shows the student-friendly "solved" wording for requesters', () => {
    const t = thread({ me: { role: 'requester' }, capabilities: { reply: true, changeStatus: true, transitions: ['resolved'] } });
    renderWithProviders(<ThreadHeader thread={t} isStaff={false} onAction={() => {}} />);
    expect(screen.getByRole('button', { name: 'This solved my problem' })).toBeInTheDocument();
    expect(screen.getByText("We're on it")).toBeInTheDocument(); // student status label
  });

  it('offers Reopen on resolved threads when the transition exists', () => {
    const onAction = vi.fn();
    const t = thread({ status: 'resolved', capabilities: { reply: true, changeStatus: true, transitions: ['open', 'closed'] } });
    renderWithProviders(<ThreadHeader thread={t} isStaff onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    expect(onAction).toHaveBeenCalledWith('status', 'open');
  });
});

describe('MessageTimeline', () => {
  const now = Date.now();
  const messages = [
    { _id: 'm1', kind: 'text', body: 'Hi, lesson 3 is broken', sender: users.student, createdAt: new Date(now - 60000).toISOString() },
    { _id: 'm2', kind: 'system', meta: { event: 'claimed', actorName: 'root' }, createdAt: new Date(now - 50000).toISOString() },
    { _id: 'm3', kind: 'note', body: 'Checking the CDN', sender: users.admin, createdAt: new Date(now - 40000).toISOString() },
    { _id: 'm4', kind: 'text', body: 'Fixed — please retry', sender: users.admin, createdAt: new Date(now - 30000).toISOString() },
  ];

  it('renders text, system and note entries with the right semantics', () => {
    renderWithProviders(<MessageTimeline messages={messages} currentUserId="a1" thread={thread()} />);
    expect(screen.getByText('Hi, lesson 3 is broken')).toBeInTheDocument();
    expect(screen.getByText(/root picked up this request/)).toBeInTheDocument();
    expect(screen.getByTestId('message-note')).toBeInTheDocument();
    expect(screen.getByText('Fixed — please retry')).toBeInTheDocument();
    expect(screen.getAllByTestId('message-system')).toHaveLength(1);
  });

  it('shows read receipts on the last own message from participants who read it', () => {
    const t = thread({ participants: [
      { user: users.student, role: 'requester', lastReadAt: new Date(now).toISOString() },
      { user: users.admin, role: 'assignee' },
    ] });
    renderWithProviders(<MessageTimeline messages={messages} currentUserId="a1" thread={t} />);
    expect(screen.getByText('Seen by jane')).toBeInTheDocument();
  });

  it('offers "load older" when more pages exist', () => {
    const onLoadOlder = vi.fn();
    renderWithProviders(<MessageTimeline messages={messages} currentUserId="a1" thread={thread()} hasOlder onLoadOlder={onLoadOlder} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load older messages' }));
    expect(onLoadOlder).toHaveBeenCalled();
  });
});

describe('ThreadListItem', () => {
  it('shows counterpart, unread badge and is keyboard-activatable', () => {
    const onClick = vi.fn();
    renderWithProviders(<ThreadListItem thread={thread({ unreadCount: 3 })} isStaff onClick={onClick} />);
    expect(screen.getByText('Cannot open lesson 3')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalled();
  });
});
