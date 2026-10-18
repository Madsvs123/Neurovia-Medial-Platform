import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Cookies from 'js-cookie';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Real-time layer for the conversation/notification system.
 *
 * `socket.io-client` was already a dependency but nothing ever used it —
 * every conversation list, message thread and notification bell updated
 * purely by polling (every 5-30s). This hook connects once per logged-in
 * user and invalidates the relevant React Query caches the moment the
 * server pushes an event, so the UI updates in near real time. Polling
 * stays in place everywhere as a fallback for when the socket is
 * disconnected, so nothing breaks if this hook fails to connect.
 *
 * @param {boolean} enabled - only connect when the user is authenticated.
 */
export const useConversationSocket = (enabled = true) => {
    const queryClient = useQueryClient();
    const socketRef = useRef(null);

    useEffect(() => {
        if (!enabled) return undefined;

        const token = Cookies.get('userToken') || Cookies.get('adminToken');
        if (!token) return undefined;

        const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const socket = io(baseURL, {
            auth: { token },
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnectionDelay: 2000,
        });
        socketRef.current = socket;

        const invalidate = (keys) => keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));

        socket.on('message:new', ({ conversationId }) => {
            invalidate([
                ['conversation-messages', conversationId],
                ['my-conversations'],
                ['conversation', conversationId],
            ]);
        });

        socket.on('conversation:created', () => invalidate([['my-conversations']]));
        socket.on('conversation:new-ticket', () => invalidate([['support-queue']]));
        socket.on('conversation:updated', ({ conversationId }) => {
            invalidate([['my-conversations'], ['support-queue'], ['conversation', conversationId]]);
        });
        socket.on('queue:updated', () => invalidate([['support-queue'], ['my-conversations']]));
        // NotificationBell doesn't use React Query (plain useState/poll), so
        // it listens for this DOM event instead to refresh instantly.
        socket.on('notification:new', () => window.dispatchEvent(new CustomEvent('neurovia:notification')));

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    return socketRef;
};

export default useConversationSocket;
