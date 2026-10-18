import { useEffect, useMemo, useRef } from 'react';
import {
  useQuery, useInfiniteQuery, useMutation, useQueryClient,
} from '@tanstack/react-query';
import { useToast } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { messagingApi as api } from '../api/messagingApi';
import { qk } from '../model/queryKeys';
import { getErrorMessage } from '../../../lib/http';
import { useMessagingSocket } from '../realtime/MessagingSocketProvider';

const POLL_FALLBACK_MS = 60000;

/* ------------------------------------------------------------------ */
/* Meta                                                                */
/* ------------------------------------------------------------------ */

export const useMessagingConfig = (enabled = true) => useQuery({
  queryKey: qk.config,
  queryFn: api.config,
  enabled,
  staleTime: 5 * 60 * 1000,
});

export const useThreadCounts = (enabled = true) => useQuery({
  queryKey: qk.counts,
  queryFn: api.counts,
  enabled,
  refetchInterval: POLL_FALLBACK_MS,
});

export const useMessagingStats = (enabled = true) => useQuery({
  queryKey: qk.stats,
  queryFn: api.stats,
  enabled,
  refetchInterval: 2 * POLL_FALLBACK_MS,
});

export const useRecipients = (params, enabled = true) => useQuery({
  queryKey: qk.recipients(params),
  queryFn: () => api.recipients(params),
  enabled,
  staleTime: 60 * 1000,
});

export const useTemplates = (params = {}, enabled = true) => useQuery({
  queryKey: qk.templates(params),
  queryFn: () => api.templates(params),
  enabled,
  staleTime: 5 * 60 * 1000,
});

/* ------------------------------------------------------------------ */
/* Threads                                                             */
/* ------------------------------------------------------------------ */

export const useThreads = (params) => {
  const query = useInfiniteQuery({
    queryKey: qk.threads(params),
    queryFn: ({ pageParam }) => api.listThreads({ ...params, cursor: pageParam || undefined }),
    initialPageParam: null,
    getNextPageParam: (last) => last?.nextCursor || undefined,
    refetchInterval: POLL_FALLBACK_MS,
  });
  const items = useMemo(() => (query.data?.pages || []).flatMap((p) => p.items), [query.data]);
  return { ...query, items };
};

export const useThread = (id) => useQuery({
  queryKey: qk.thread(String(id)),
  queryFn: () => api.getThread(id),
  enabled: !!id,
});

/** Messages: infinite, oldest→newest in display order; "load older" prepends. */
export const useMessages = (id, enabled = true) => {
  const query = useInfiniteQuery({
    queryKey: qk.messages(String(id)),
    queryFn: ({ pageParam }) => api.listMessages(id, { before: pageParam || undefined, limit: 50 }),
    initialPageParam: null,
    // older pages are fetched with `before`; we store them as "previous" pages
    getPreviousPageParam: (first) => first?.nextCursor || undefined,
    getNextPageParam: () => undefined,
    enabled: !!id && enabled,
    refetchInterval: POLL_FALLBACK_MS,
  });
  const messages = useMemo(() => (query.data?.pages || []).flatMap((p) => p.items), [query.data]);
  return { ...query, messages };
};

/** Keep the socket room + read receipt in sync with the thread on screen. */
export const useThreadPresence = (thread) => {
  const { subscribeThread, unsubscribeThread } = useMessagingSocket();
  const queryClient = useQueryClient();
  const id = thread?._id;
  const unread = thread?.unreadCount || 0;
  const canView = thread?.capabilities?.viewMessages;
  const markedFor = useRef(null);

  useEffect(() => {
    if (!id || !canView) return undefined;
    subscribeThread(id);
    return () => unsubscribeThread(id);
  }, [id, canView, subscribeThread, unsubscribeThread]);

  useEffect(() => {
    if (!id || !canView || unread === 0) return;
    const key = `${id}:${unread}`;
    if (markedFor.current === key) return;
    markedFor.current = key;
    api.markRead(id).then(() => {
      queryClient.invalidateQueries({ queryKey: qk.thread(String(id)) });
      queryClient.invalidateQueries({ queryKey: qk.counts });
      queryClient.invalidateQueries({ queryKey: qk.threadsAll });
    }).catch(() => {});
  }, [id, unread, canView, queryClient]);
};

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

const useToasts = () => {
  const toast = useToast();
  const { t } = useTranslation();
  return {
    ok: (title) => toast({ title, status: 'success', duration: 2500, isClosable: true }),
    fail: (err) => toast({ title: t('toasts.error'), description: getErrorMessage(err), status: 'error', duration: 5000, isClosable: true }),
  };
};

export const useSendMessage = (threadId, currentUser) => {
  const queryClient = useQueryClient();
  const { fail } = useToasts();
  return useMutation({
    mutationFn: ({ body, kind = 'text' }) => api.sendMessage(threadId, { body, kind }),
    // Optimistic append
    onMutate: async ({ body, kind = 'text' }) => {
      const key = qk.messages(String(threadId));
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      const optimistic = {
        _id: `tmp-${Date.now()}`,
        thread: threadId,
        kind,
        body,
        createdAt: new Date().toISOString(),
        sender: { _id: currentUser?._id || currentUser?.id, username: currentUser?.username, role: currentUser?.role },
        pending: true,
      };
      queryClient.setQueryData(key, (old) => {
        if (!old) return { pages: [{ items: [optimistic], nextCursor: null }], pageParams: [null] };
        const pages = old.pages.slice();
        const last = pages[pages.length - 1];
        pages[pages.length - 1] = { ...last, items: [...last.items, optimistic] };
        return { ...old, pages };
      });
      return { previous, tmpId: optimistic._id };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(qk.messages(String(threadId)), ctx.previous);
      fail(err);
    },
    onSuccess: (data, _vars, ctx) => {
      queryClient.setQueryData(qk.messages(String(threadId)), (old) => {
        if (!old) return old;
        const pages = old.pages.map((p) => ({ ...p, items: p.items.map((m) => (m._id === ctx?.tmpId ? data.message : m)) }));
        return { ...old, pages };
      });
      queryClient.invalidateQueries({ queryKey: qk.thread(String(threadId)) });
      queryClient.invalidateQueries({ queryKey: qk.threadsAll });
    },
  });
};

export const useThreadActions = (threadId) => {
  const queryClient = useQueryClient();
  const { ok, fail } = useToasts();
  const { t } = useTranslation();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.thread(String(threadId)) });
    queryClient.invalidateQueries({ queryKey: qk.messages(String(threadId)) });
    queryClient.invalidateQueries({ queryKey: qk.threadsAll });
    queryClient.invalidateQueries({ queryKey: qk.counts });
  };
  // Custom-hook helper (called a fixed number of times per render — hook order is stable).
  const useAction = (fn, successKey) => useMutation({
    mutationFn: fn,
    onSuccess: () => { refresh(); if (successKey) ok(t(successKey)); },
    onError: fail,
  });

  return {
    claim: useAction(() => api.claim(threadId), 'toasts.claimed'),
    join: useAction(() => api.join(threadId), 'toasts.joined'),
    setStatus: useAction((status) => api.updateThread(threadId, { status }), 'toasts.statusUpdated'),
    setPriority: useAction((priority) => api.updateThread(threadId, { priority })),
    setCategory: useAction((category) => api.updateThread(threadId, { category })),
    assign: useAction((userId) => api.assign(threadId, userId), 'toasts.assigned'),
    escalate: useAction((body) => api.escalate(threadId, body)),
    addParticipant: useAction((body) => api.addParticipant(threadId, body)),
    removeParticipant: useAction((userId) => api.removeParticipant(threadId, userId)),
    archive: useAction(() => api.archive(threadId), 'toasts.archived'),
    unarchive: useAction(() => api.unarchive(threadId), 'toasts.unarchived'),
    remove: useAction((hard) => api.deleteThread(threadId, hard), 'toasts.deleted'),
    editMessage: useAction(({ mid, body }) => api.editMessage(threadId, mid, { body })),
    deleteMessage: useAction((mid) => api.deleteMessage(threadId, mid)),
  };
};

export const useCreateThread = () => {
  const queryClient = useQueryClient();
  const { fail } = useToasts();
  return useMutation({
    mutationFn: (body) => api.createThread(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.threadsAll });
      queryClient.invalidateQueries({ queryKey: qk.counts });
    },
    onError: fail,
  });
};

export const useTyping = (threadId) => {
  const { emitTyping, typingByThread } = useMessagingSocket();
  const timer = useRef(null);
  const typing = typingByThread[String(threadId)] || {};
  const names = Object.values(typing);
  const notifyTyping = () => {
    emitTyping(threadId, true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => emitTyping(threadId, false), 2500);
  };
  const stopTyping = () => { clearTimeout(timer.current); emitTyping(threadId, false); };
  return { names, notifyTyping, stopTyping };
};

/* ---- admin ---- */
export const useMessagingSettings = (enabled = true) => useQuery({ queryKey: qk.settings, queryFn: api.settings, enabled });
export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  const { ok, fail } = useToasts();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body) => api.updateSettings(body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk.settings }); queryClient.invalidateQueries({ queryKey: qk.config }); ok(t('settings.saved')); },
    onError: fail,
  });
};
export const useTemplateMutations = () => {
  const queryClient = useQueryClient();
  const { fail } = useToasts();
  const done = () => queryClient.invalidateQueries({ queryKey: ['messaging', 'templates'] });
  return {
    seed: useMutation({ mutationFn: api.seedTemplates, onSuccess: done, onError: fail }),
    create: useMutation({ mutationFn: api.createTemplate, onSuccess: done, onError: fail }),
    update: useMutation({ mutationFn: ({ id, ...body }) => api.updateTemplate(id, body), onSuccess: done, onError: fail }),
    remove: useMutation({ mutationFn: api.deleteTemplate, onSuccess: done, onError: fail }),
  };
};
