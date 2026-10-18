import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, getAuthToken } from '../../../lib/http';
import { qk } from '../model/queryKeys';

/**
 * ONE socket per authenticated session, mounted once at the app root and
 * shared by every portal. Pushes server events into the React Query cache
 * (so every list/thread on screen updates) and re-broadcasts notification
 * events as a DOM event for the NotificationBell.
 *
 * Exposes: { connected, subscribeThread, unsubscribeThread, emitTyping, typingByThread }
 */
const Ctx = createContext({
  connected: false,
  subscribeThread: () => {},
  unsubscribeThread: () => {},
  emitTyping: () => {},
  typingByThread: {},
});

export const useMessagingSocket = () => useContext(Ctx);

export const MessagingSocketProvider = ({ enabled, children }) => {
  const queryClient = useQueryClient();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [typingByThread, setTypingByThread] = useState({});
  const typingTimers = useRef({});

  useEffect(() => {
    if (!enabled) return undefined;
    const token = getAuthToken();
    if (!token) return undefined;

    const socket = io(API_BASE_URL, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    const invalidate = (...keys) => keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    const invalidateLists = () => invalidate(qk.threadsAll, qk.counts);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('message:created', ({ threadId, message }) => {
      // Append to the open thread's cache if present (instant), then refresh lists.
      queryClient.setQueryData(qk.messages(String(threadId)), (old) => {
        if (!old) return old;
        const exists = old.pages.some((p) => p.items.some((m) => m._id === message._id));
        if (exists) return old;
        const pages = old.pages.slice();
        const last = { ...pages[pages.length - 1], items: [...pages[pages.length - 1].items, message] };
        pages[pages.length - 1] = last;
        return { ...old, pages };
      });
      invalidate(qk.thread(String(threadId)));
      invalidateLists();
    });
    socket.on('message:updated', ({ threadId }) => invalidate(qk.messages(String(threadId))));
    socket.on('thread:created', invalidateLists);
    socket.on('thread:updated', ({ thread }) => { invalidate(qk.thread(String(thread._id))); invalidateLists(); });
    socket.on('thread:removed', invalidateLists);
    socket.on('queue:updated', invalidateLists);
    socket.on('thread:read', ({ threadId }) => invalidate(qk.thread(String(threadId))));
    socket.on('notification:new', () => window.dispatchEvent(new CustomEvent('neurovia:notification')));

    socket.on('thread:typing', ({ threadId, userId, username, typing }) => {
      const key = String(threadId);
      clearTimeout(typingTimers.current[`${key}:${userId}`]);
      setTypingByThread((prev) => {
        const cur = { ...(prev[key] || {}) };
        if (typing) cur[userId] = username; else delete cur[userId];
        return { ...prev, [key]: cur };
      });
      if (typing) {
        typingTimers.current[`${key}:${userId}`] = setTimeout(() => {
          setTypingByThread((prev) => {
            const cur = { ...(prev[key] || {}) };
            delete cur[userId];
            return { ...prev, [key]: cur };
          });
        }, 4000);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [enabled, queryClient]);

  const subscribeThread = useCallback((threadId) => { socketRef.current?.emit('thread:subscribe', threadId, () => {}); }, []);
  const unsubscribeThread = useCallback((threadId) => { socketRef.current?.emit('thread:unsubscribe', threadId); }, []);
  const emitTyping = useCallback((threadId, typing) => { socketRef.current?.emit('thread:typing', { threadId, typing }); }, []);

  const value = useMemo(() => ({ connected, subscribeThread, unsubscribeThread, emitTyping, typingByThread }),
    [connected, subscribeThread, unsubscribeThread, emitTyping, typingByThread]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export default MessagingSocketProvider;
