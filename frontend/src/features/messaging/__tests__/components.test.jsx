import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, student, educator, admin, thread } from './testUtils';
import { ThreadListItem } from '../components/ThreadList';
import Composer from '../components/Composer';
import ThreadSidebar from '../components/ThreadSidebar';
import NewThreadForm from '../components/NewThreadForm';
import { slaInfo, buildRows, statusLabel } from '../model/meta';
import { adminPortal, educatorPortal, studentPortal } from '../portal';
import i18n from '../../../i18n';

vi.mock('../api/messagingApi', () => {
  const api = {
    config: vi.fn(),
    recipients: vi.fn(),
    templates: vi.fn().mockResolvedValue([]),
    createThread: vi.fn(),
    counts: vi.fn().mockResolvedValue({}),
  };
  return { messagingApi: api, default: api };
});
import { messagingApi } from '../api/messagingApi';

beforeEach(() => { vi.clearAllMocks(); });

describe('model helpers', () => {
  it('renders requester-friendly status labels for students and staff labels for staff', () => {
    const t = i18n.t.bind(i18n);
    expect(statusLabel(t, 'open', { asRequester: true })).toBe("We're on it");
    expect(statusLabel(t, 'open')).toBe('Open');
    expect(statusLabel(t, 'waiting_requester', { asRequester: true })).toBe('Waiting for you');
  });

  it('computes SLA state from priority targets', () => {
    const sla = { firstResponseHours: { normal: 24, urgent: 2 } };
    const fresh = { kind: 'support', priority: 'normal', createdAt: new Date().toISOString(), firstResponseAt: null };
    expect(slaInfo(fresh, sla).state).toBe('pending');
    const old = { ...fresh, createdAt: new Date(Date.now() - 48 * 3600e3).toISOString() };
    expect(slaInfo(old, sla).state).toBe('breached');
    const answered = { ...old, firstResponseAt: new Date(Date.now() - 40 * 3600e3).toISOString() };
    expect(slaInfo(answered, sla)).toMatchObject({ state: 'met', tookHours: 8 });
    expect(slaInfo({ kind: 'direct' }, sla)).toBeNull();
  });

  it('groups consecutive messages and inserts day dividers', () => {
    const t = i18n.t.bind(i18n);
    const now = Date.now();
    const msgs = [
      { _id: '1', kind: 'text', sender: student, createdAt: new Date(now - 2 * 86400e3).toISOString() },
      { _id: '2', kind: 'text', sender: educator, createdAt: new Date(now - 60e3).toISOString() },
      { _id: '3', kind: 'text', sender: educator, createdAt: new Date(now - 30e3).toISOString() },
      { _id: '4', kind: 'system', sender: null, createdAt: new Date(now).toISOString() },
    ];
    const rows = buildRows(msgs, 'e1', t);
    expect(rows[0].dayDivider).toBeTruthy();
    expect(rows[1].dayDivider).toBe('Today');
    expect(rows[1].isOwn).toBe(true);
    expect(rows[2].showHeader).toBe(false); // grouped with previous
    expect(rows[3].showHeader).toBe(true);
  });
});

describe('ThreadListItem', () => {
  it('shows plain-language status to the requester and staff labels + team to staff', () => {
    const th = thread({ status: 'waiting_requester' });
    const { unmount } = renderWithProviders(<ThreadListItem thread={th} currentUser={student} onClick={() => {}} />);
    expect(screen.getByText('Waiting for you')).toBeInTheDocument();
    expect(screen.queryByText('Technical')).not.toBeInTheDocument();
    unmount();
    renderWithProviders(<ThreadListItem thread={th} currentUser={educator} onClick={() => {}} sla={{ firstResponseHours: { normal: 24 } }} />);
    expect(screen.getByText('Waiting on requester')).toBeInTheDocument();
    expect(screen.getByText('Technical')).toBeInTheDocument();
  });

  it('flags unassigned tickets for staff and shows the unread count', () => {
    renderWithProviders(<ThreadListItem thread={thread({ assignee: null, unreadCount: 3 })} currentUser={admin} onClick={() => {}} />);
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('is keyboard operable', () => {
    const onClick = vi.fn();
    renderWithProviders(<ThreadListItem thread={thread()} currentUser={admin} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('Composer', () => {
  it('sends text on Enter and notes via the note toggle', () => {
    const onSend = vi.fn();
    renderWithProviders(<Composer onSend={onSend} allowNotes />);
    const box = screen.getByPlaceholderText('Type a message…');
    fireEvent.change(box, { target: { value: 'hello' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith({ body: 'hello', kind: 'text' });

    fireEvent.click(screen.getByRole('button', { name: 'Note' }));
    const note = screen.getByPlaceholderText('Internal note — only staff can see this');
    fireEvent.change(note, { target: { value: 'secret' } });
    fireEvent.keyDown(note, { key: 'Enter' });
    expect(onSend).toHaveBeenLastCalledWith({ body: 'secret', kind: 'note' });
  });

  it('hides the note toggle for non-staff and shows the locked banner with an unlock CTA', () => {
    const onUnlock = vi.fn();
    const { unmount } = renderWithProviders(<Composer onSend={() => {}} allowNotes={false} />);
    expect(screen.queryByRole('button', { name: 'Note' })).not.toBeInTheDocument();
    unmount();
    renderWithProviders(<Composer onSend={() => {}} locked lockedMessage="This thread is closed. Reopen it to reply." onUnlock={onUnlock} unlockLabel="Reopen" />);
    expect(screen.getByText('This thread is closed. Reopen it to reply.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Type a message…')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    expect(onUnlock).toHaveBeenCalled();
  });
});

describe('ThreadSidebar', () => {
  const noop = () => {};
  const actions = { claim: noop, setCategory: noop, setPriority: noop, linkTo: (id) => `/admin/messages/${id}` };

  it('renders the admin card set including assignment + escalate for a capable staff member', () => {
    renderWithProviders(<ThreadSidebar thread={thread({ assignee: null, capabilities: { ...thread().capabilities, claim: true, assign: true } })} currentUser={admin} config={{ categories: ['general', 'technical'], priorities: ['low', 'normal'], sla: { firstResponseHours: { normal: 24 } } }} cards={adminPortal.sidebarCards} actions={actions} onAssign={noop} onEscalate={noop} onAddParticipant={noop} profileLinkFor={adminPortal.profileLinkFor} />);
    expect(screen.getByText('Requester')).toBeInTheDocument();
    expect(screen.getByText('Pick up')).toBeInTheDocument();
    expect(screen.getByText('Escalate')).toBeInTheDocument();
    expect(screen.getByText('Assign')).toBeInTheDocument();
  });

  it('renders the student card set without staff-only controls', () => {
    renderWithProviders(<ThreadSidebar thread={thread({ capabilities: { ...thread().capabilities, note: false, escalate: false, assign: false, claim: false, addParticipant: false } })} currentUser={student} config={{ categories: ['general'], priorities: ['normal'] }} cards={studentPortal.sidebarCards} actions={actions} />);
    expect(screen.queryByText('Requester')).not.toBeInTheDocument();
    expect(screen.queryByText('Escalate')).not.toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
  });
});

describe('NewThreadForm — kind-aware', () => {
  it('offers students Support + Ask my instructor, and routes support to a team (no recipient)', async () => {
    messagingApi.config.mockResolvedValue({ me: { creatableKinds: ['support', 'direct'], role: 'student' }, categories: ['general', 'billing'], priorities: ['normal'] });
    messagingApi.recipients.mockResolvedValue({ users: [], programs: [] });
    renderWithProviders(<NewThreadForm currentUser={student} />);
    expect(await screen.findByText('Support ticket')).toBeInTheDocument();
    expect(screen.getByText('Ask your instructor')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Support ticket'));
    expect(await screen.findByText('Your ticket is routed to the right team automatically.')).toBeInTheDocument();
    expect(screen.queryByText('Recipient')).not.toBeInTheDocument();
  });

  it('offers educators Direct + Internal request; internal needs no recipient', async () => {
    messagingApi.config.mockResolvedValue({ me: { creatableKinds: ['direct', 'internal'], role: 'educator' }, categories: ['general'], priorities: ['normal', 'high'] });
    messagingApi.recipients.mockResolvedValue({ users: [{ _id: 's1', username: 'sam', role: 'student', email: 's@x' }], programs: [] });
    renderWithProviders(<NewThreadForm currentUser={educator} />);
    expect(await screen.findByText('Internal request')).toBeInTheDocument();
    expect(screen.queryByText('Support ticket')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Internal request'));
    expect(await screen.findByText('Goes to the admin team. You can also address a specific person.')).toBeInTheDocument();
  });

  it('submits a direct thread with the chosen recipient', async () => {
    messagingApi.config.mockResolvedValue({ me: { creatableKinds: ['direct'], role: 'student' }, categories: ['general'], priorities: ['normal'] });
    messagingApi.recipients.mockResolvedValue({ users: [{ _id: 'e1', username: 'ed', role: 'educator', email: 'e@x' }], programs: [{ _id: 'p1', title: 'Neuro 101' }] });
    messagingApi.createThread.mockResolvedValue({ _id: 'new1' });
    const onCreated = vi.fn();
    renderWithProviders(<NewThreadForm currentUser={student} onCreated={onCreated} />);
    fireEvent.click(await screen.findByText('ed'));
    fireEvent.change(screen.getByPlaceholderText('What is this about?'), { target: { value: 'Office hours' } });
    fireEvent.change(screen.getByPlaceholderText(/Describe your question/), { target: { value: 'When are they?' } });
    fireEvent.click(screen.getByRole('button', { name: /Start conversation/ }));
    await waitFor(() => expect(messagingApi.createThread).toHaveBeenCalled());
    expect(messagingApi.createThread.mock.calls[0][0]).toMatchObject({ kind: 'direct', to: 'e1', subject: 'Office hours', body: 'When are they?' });
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ _id: 'new1' }));
  });
});

describe('portal configs', () => {
  it('give each role the right boxes and capabilities', () => {
    expect(adminPortal.boxes.map((b) => b.key)).toContain('all');
    expect(educatorPortal.boxes.map((b) => b.key)).not.toContain('all');
    expect(studentPortal.boxes.map((b) => b.key)).toEqual(['inbox', 'direct', 'archived']);
    expect(adminPortal.newPath({ kind: 'direct', to: 'u1', programId: '' })).toBe('/admin/messages/new?kind=direct&to=u1');
    expect(studentPortal.threadPath('abc')).toBe('/messages/abc');
  });
});
