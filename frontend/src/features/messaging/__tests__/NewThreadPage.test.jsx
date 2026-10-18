import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, users } from './testUtils';
import NewThreadPage from '../pages/NewThreadPage';
import { studentPortal, educatorPortal, adminPortal } from '../portal/portalConfig';

const mutateAsync = vi.fn().mockResolvedValue({ _id: 'new1' });
vi.mock('../hooks/useMessaging', () => ({
  useMessagingConfig: () => ({ data: { routing: { categories: { general: 'support', billing: 'billing', technical: 'technical', clinical: 'clinical', other: 'support' } } } }),
  useCreateThread: () => ({ mutateAsync, isPending: false }),
  useRecipients: () => ({ data: [{ _id: 'e1', username: 'drsmith', email: 'dr@x.com', role: 'educator' }], isLoading: false }),
}));

describe('NewThreadPage — kind picker per portal', () => {
  it('student chooses between platform help and asking an instructor', () => {
    renderWithProviders(<NewThreadPage portal={studentPortal} currentUser={users.student} />);
    expect(screen.getByText('Help with the platform')).toBeInTheDocument();
    expect(screen.getByText('Ask my instructor')).toBeInTheDocument();
    expect(screen.queryByText('Request from admins')).not.toBeInTheDocument();
  });

  it('educator chooses between a direct message and a request to admins', () => {
    renderWithProviders(<NewThreadPage portal={educatorPortal} currentUser={users.educator} />);
    expect(screen.getByText('Direct message')).toBeInTheDocument();
    expect(screen.getByText('Request from admins')).toBeInTheDocument();
    expect(screen.queryByText('Help with the platform')).not.toBeInTheDocument();
  });

  it('admin gets "send a task to an educator" instead of a request', () => {
    renderWithProviders(<NewThreadPage portal={adminPortal} currentUser={users.admin} />);
    expect(screen.getByText('Send a task to an educator')).toBeInTheDocument();
  });

  it('support ticket shows the routed team for the chosen topic and submits', async () => {
    renderWithProviders(<NewThreadPage portal={studentPortal} currentUser={users.student} />);
    fireEvent.click(screen.getByText('Help with the platform'));

    fireEvent.change(screen.getByRole('combobox', { name: /topic/i }), { target: { value: 'billing' } });
    expect(screen.getAllByText('Billing').length).toBeGreaterThanOrEqual(2); // option + routed-team helper

    fireEvent.change(screen.getByPlaceholderText('What is this about?'), { target: { value: 'Charged twice' } });
    fireEvent.change(screen.getByPlaceholderText(/Describe your question/), { target: { value: 'Please refund' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ kind: 'support', category: 'billing', subject: 'Charged twice', body: 'Please refund' });
  });

  it('direct message requires picking a recipient', async () => {
    mutateAsync.mockClear();
    renderWithProviders(<NewThreadPage portal={studentPortal} currentUser={users.student} />);
    fireEvent.click(screen.getByText('Ask my instructor'));
    fireEvent.change(screen.getByPlaceholderText('What is this about?'), { target: { value: 'Question' } });
    fireEvent.change(screen.getByPlaceholderText(/Describe your question/), { target: { value: 'About lesson 2' } });
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();

    fireEvent.click(screen.getByText('drsmith'));
    expect(screen.getByRole('button', { name: 'Send' })).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ kind: 'direct', to: 'e1' });
  });
});
