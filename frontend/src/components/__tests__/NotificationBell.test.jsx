import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';
import NotificationBell from '../NotificationBell';

const renderBell = (api) => render(<MemoryRouter><ChakraProvider><NotificationBell api={api} /></ChakraProvider></MemoryRouter>);

const makeApi = (notifs) => ({
  getUnreadCount: vi.fn().mockResolvedValue({ data: { unreadCount: notifs.filter(n => !n.read).length } }),
  getNotifications: vi.fn().mockResolvedValue({ data: { notifications: notifs, unreadCount: notifs.filter(n => !n.read).length } }),
  markNotificationAsRead: vi.fn().mockResolvedValue({}),
  markAllNotificationsAsRead: vi.fn().mockResolvedValue({}),
});

describe('NotificationBell', () => {
  it('renders mixed read/unread lists and survives list changes (hook-order regression)', async () => {
    const notifs = [
      { _id: '1', title: 'First', message: 'a', type: 'course', read: false, createdAt: new Date().toISOString() },
      { _id: '2', title: 'Second', message: 'b', type: 'system', read: true, createdAt: new Date().toISOString() },
    ];
    const api = makeApi(notifs);
    renderBell(api);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    await waitFor(() => expect(screen.getByText('First')).toBeInTheDocument());
    expect(screen.getByText('Second')).toBeInTheDocument();

    api.getNotifications.mockResolvedValue({ data: { notifications: [notifs[0]], unreadCount: 1 } });
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    await waitFor(() => expect(screen.queryByText('Second')).not.toBeInTheDocument());
  });

  it('refreshes instantly on the socket-driven DOM event', async () => {
    const api = makeApi([]);
    renderBell(api);
    await waitFor(() => expect(api.getUnreadCount).toHaveBeenCalledTimes(1));
    await act(async () => { window.dispatchEvent(new CustomEvent('neurovia:notification')); });
    await waitFor(() => expect(api.getUnreadCount).toHaveBeenCalledTimes(2));
  });
});
