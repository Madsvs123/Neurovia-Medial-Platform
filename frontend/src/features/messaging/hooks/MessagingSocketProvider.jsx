import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, getAuthToken } from '../../../lib/http';
import { queryKeys } from './queryKeys';

const SocketContext = createContext({ socket: null, connected: false });

/**
 * One Socket.IO connection per logged-in session, shared by every portal
 * (mounted once in main.jsx). Server events invalidate the right React
 * Query caches so lists, threads and badges update live. Polling stays as a
 * slow fallback in the hooks.
 *
 *  thread:created / thread:updated / queue:updated / thread:activity
 *  message:created / message:updated / thread:read / thread:typing
 *  notification:new
 */
export const MessagingSocketProvider = ({ enabled = true, children }) => {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!enabled || !token) return undefined;

    const s = io(API_BASE_URL, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionDelay: 2000,
    });
    socketRef.current = s;
    setSocket(s);

    const invalidate = (...keys) => keys.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    s.on('thread:created', () => invalidate(queryKeys.threads(), queryKeys.counts()));
    s.on('queue:updated', () => invalidate(queryKeys.threads(), queryKeys.counts()));
    s.on('thread:updated', ({ thread }) => invalidate(queryKeys.threads(), queryKeys.counts(), queryKeys.thread(thread._id)));
    s.on('thread:activity', ({ threadId }) => invalidate(queryKeys.threads(), queryKeys.counts(), queryKeys.thread(threadId), queryKeys.messages(threadId)));
    s.on('message:created', ({ threadId, message }) => {
      // Append instantly to the open thread, then let the list/thread refresh.
      queryClient.setQueryData(queryKeys.messages(threadId), (old) => {
        if (!old) return old;
        // pages[0] is the NEWEST page (see useMessages), so append there
        const pages = old.pages.map((p) => ({ ...p }));
        if (pages[0].items.some((m) => m._id === message._id)) return old;
        pages[0].items = [...pages[0].items, message];
        return { ...old, pages };
      });
      invalidate(queryKeys.thread(threadId), queryKeys.threads(), queryKeys.counts());
    });
    s.on('message:updated', ({ threadId, message }) => {
      queryClient.setQueryData(queryKeys.messages(threadId), (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((p) => ({ ...p, items: p.items.map((m) => (m._id === message._id ? message : m)) })),
        };
      });
    });
    s.on('thread:read', ({ threadId }) => invalidate(queryKeys.thread(threadId)));
    s.on('notification:new', () => window.dispatchEvent(new CustomEvent('neurovia:notification')));

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const value = useMemo(() => ({ socket, connected }), [socket, connected]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useMessagingSocket = () => useContext(SocketContext);

/** Join/leave the thread room while a thread is on screen; exposes typing. */
export const useThreadRoom = (threadId) => {
  const { socket } = useMessagingSocket();
  const [typing, setTyping] = useState(null);

  useEffect(() => {
    if (!socket || !threadId) return undefined;
    socket.emit('thread:join', threadId);
    const onTyping = (payload) => {
      if (payload.threadId !== threadId) return;
      setTyping(payload.isTyping ? payload : null);
    };
    socket.on('thread:typing', onTyping);
    return () => {
      socket.emit('thread:leave', threadId);
      socket.off('thread:typing', onTyping);
      setTyping(null);
    };
  }, [socket, threadId]);

  const sendTyping = (isTyping) => {
    if (socket && threadId) socket.emit('thread:typing', { threadId, isTyping });
  };

  return { typing, sendTyping };
};
