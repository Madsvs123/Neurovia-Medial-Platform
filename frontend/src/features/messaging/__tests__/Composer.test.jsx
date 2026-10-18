import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, thread } from './testUtils';
import Composer from '../components/ThreadView/Composer';

vi.mock('../hooks/useMessaging', () => ({
  useTemplates: () => ({ data: [{ _id: 'tpl1', title: 'Welcome', body: 'Hello there!', category: 'Greeting' }] }),
}));

describe('Composer — capability-driven states', () => {
  it('shows the observe/join notice when the viewer cannot reply', () => {
    const onJoin = vi.fn();
    renderWithProviders(
      <Composer thread={thread()} capabilities={{ reply: false, note: false, join: true }} isStaff onJoin={onJoin} />
    );
    expect(screen.getByText('Join this thread to reply.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect(onJoin).toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('Write a message…')).not.toBeInTheDocument();
  });

  it('locks staff out of closed threads but offers reopen', () => {
    const onReopen = vi.fn();
    renderWithProviders(
      <Composer thread={thread({ status: 'closed' })} capabilities={{ reply: true, note: true, transitions: ['open'] }} isStaff onReopen={onReopen} />
    );
    expect(screen.getByText('This thread is closed. Reopen it to reply.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    expect(onReopen).toHaveBeenCalled();
  });

  it('lets a requester reply on a resolved thread with a soft notice', () => {
    renderWithProviders(
      <Composer thread={thread({ status: 'resolved', me: { role: 'requester' } })} capabilities={{ reply: true, note: false }} isStaff={false} onSend={() => {}} />
    );
    expect(screen.getByText(/marked solved/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Write a message…')).toBeInTheDocument();
  });

  it('sends text with Enter and notes via the note toggle', () => {
    const onSend = vi.fn();
    renderWithProviders(<Composer thread={thread()} capabilities={{ reply: true, note: true }} isStaff onSend={onSend} />);

    const box = screen.getByPlaceholderText('Write a message…');
    fireEvent.change(box, { target: { value: 'On it' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith({ body: 'On it', kind: 'text' });

    fireEvent.click(screen.getByRole('button', { name: 'Internal note' }));
    const noteBox = screen.getByPlaceholderText('Internal note — visible to staff only');
    fireEvent.change(noteBox, { target: { value: 'refund pending' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add note' }));
    expect(onSend).toHaveBeenLastCalledWith({ body: 'refund pending', kind: 'note' });
  });

  it('hides the note toggle and templates for students', () => {
    renderWithProviders(<Composer thread={thread()} capabilities={{ reply: true, note: false }} isStaff={false} onSend={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Internal note' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Templates' })).not.toBeInTheDocument();
  });
});
