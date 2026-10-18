import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { messagingApi } from '../api/messagingApi';
import { errorMessage } from '../../../lib/http';
import { queryKeys } from './queryKeys';

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export const useMessagingConfig = (enabled = true) => useQuery({
  queryKey: queryKeys.config(),
  queryFn: messagingApi.getConfig,
  enabled,
  staleTime: 5 * 60 * 1000,
});

export const useThreadCounts = (enabled = true) => useQuery({
  queryKey: queryKeys.counts(),
  queryFn: messagingApi.getCounts,
  enabled,
  refetchInterval: 60000,
});

/** Cursor-paginated thread list for a box + filters. */
export const useThreads = (params, { enabled = true } = {}) => useInfiniteQuery({
  queryKey: queryKeys.threads(params),
  queryFn: ({ pageParam }) => messagingApi.listThreads({ ...params, cursor: pageParam || undefined }),
  initialPageParam: null,
  getNextPageParam: (last) => last.nextCursor,
  enabled,
  refetchInterval: 60000,
});

export const useThread = (id, { enabled = true } = {}) => useQuery({
  queryKey: queryKeys.thread(id),
  queryFn: () => messagingApi.getThread(id),
  enabled: enabled && !!id,
  retry: (count, err) => ![403, 404].includes(err?.response?.status) && count < 2,
});

/** Messages, newest page last; `fetchNextPage` loads OLDER messages. */
export const useMessages = (id, { enabled = true } = {}) => useInfiniteQuery({
  queryKey: queryKeys.messages(id),
  queryFn: ({ pageParam }) => messagingApi.listMessages(id, { before: pageParam || undefined, limit: 50 }),
  initialPageParam: null,
  // the API returns nextCursor = oldest createdAt of the page
  getNextPageParam: (last) => last.nextCursor,
  enabled: enabled && !!id,
  refetchInterval: 45000,
  select: (data) => ({
    ...data,
    // pages arrive newest-first (page[0] = latest). Flatten oldest→newest.
    flat: [...data.pages].reverse().flatMap((p) => p.items),
  }),
});

export const useRecipients = (q, { enabled = true } = {}) => useQuery({
  queryKey: queryKeys.recipients(q),
  queryFn: () => messagingApi.getRecipients({ q, limit: 30 }),
  enabled,
  staleTime: 30000,
});

export const useTemplates = (enabled = true) => useQuery({
  queryKey: queryKeys.templates(),
  queryFn: messagingApi.listTemplates,
  enabled,
  staleTime: 5 * 60 * 1000,
});

export const useMessagingStats = (enabled = true) => useQuery({
  queryKey: queryKeys.stats(),
  queryFn: messagingApi.getStats,
  enabled,
  refetchInterval: 120000,
});

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

const useInvalidator = () => {
  const qc = useQueryClient();
  return (id) => {
    qc.invalidateQueries({ queryKey: queryKeys.threads() });
    qc.invalidateQueries({ queryKey: queryKeys.counts() });
    if (id) qc.invalidateQueries({ queryKey: queryKeys.thread(id) });
  };
};

const useErrorToast = () => {
  const toast = useToast();
  const { t } = useTranslation('messaging');
  return (err) => toast({ title: t('toast.error'), description: errorMessage(err), status: 'error', duration: 4000, isClosable: true });
};

export const useSendMessage = (threadId) => {
  const qc = useQueryClient();
  const invalidate = useInvalidator();
  const onError = useErrorToast();

  return useMutation({
    mutationFn: ({ body, kind = 'text' }) => messagingApi.sendMessage(threadId, { body, kind }),
    onSuccess: ({ message }) => {
      qc.setQueryData(queryKeys.messages(threadId), (old) => {
        if (!old) return old;
        // pages[0] is the NEWEST page (see useMessages), so append there
        const pages = old.pages.map((p) => ({ ...p }));
        if (!pages[0].items.some((m) => m._id === message._id)) pages[0].items = [...pages[0].items, message];
        return { ...old, pages };
      });
      invalidate(threadId);
    },
    onError,
  });
};

export const useCreateThread = () => {
  const invalidate = useInvalidator();
  const onError = useErrorToast();
  return useMutation({
    mutationFn: (data) => messagingApi.createThread(data),
    onSuccess: () => invalidate(),
    onError,
  });
};

/** All the thread-level actions in one hook; every mutation refreshes the caches. */
export const useThreadActions = (threadId) => {
  const invalidate = useInvalidator();
  const onError = useErrorToast();
  const qc = useQueryClient();
  // eslint-disable-next-line react-hooks/rules-of-hooks -- called a fixed number of times below
  const useAction = (fn) => useMutation({ mutationFn: fn, onSuccess: () => invalidate(threadId), onError });

  return {
    update: useAction((patch) => messagingApi.updateThread(threadId, patch)),
    claim: useAction(() => messagingApi.claim(threadId)),
    join: useAction(() => messagingApi.join(threadId)),
    assign: useAction((userId) => messagingApi.assign(threadId, userId)),
    unassign: useAction(() => messagingApi.unassign(threadId)),
    escalate: useAction((data) => messagingApi.escalate(threadId, data)),
    addParticipant: useAction((data) => messagingApi.addParticipant(threadId, data)),
    removeParticipant: useAction((userId) => messagingApi.removeParticipant(threadId, userId)),
    archive: useAction(() => messagingApi.archive(threadId)),
    unarchive: useAction(() => messagingApi.unarchive(threadId)),
    remove: useAction((opts) => messagingApi.deleteThread(threadId, opts)),
    markRead: useMutation({
      mutationFn: () => messagingApi.markRead(threadId),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: queryKeys.counts() });
        qc.invalidateQueries({ queryKey: queryKeys.threads() });
      },
    }),
    editMessage: useMutation({
      mutationFn: ({ messageId, body }) => messagingApi.editMessage(threadId, messageId, { body }),
      onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.messages(threadId) }),
      onError,
    }),
    deleteMessage: useMutation({
      mutationFn: (messageId) => messagingApi.deleteMessage(threadId, messageId),
      onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.messages(threadId) }),
      onError,
    }),
  };
};

export const useTemplateAdmin = () => {
  const qc = useQueryClient();
  const onError = useErrorToast();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: queryKeys.templates() });
    qc.invalidateQueries({ queryKey: queryKeys.templatesAll() });
  };
  return {
    list: useQuery({ queryKey: queryKeys.templatesAll(), queryFn: messagingApi.listAllTemplates }),
    create: useMutation({ mutationFn: messagingApi.createTemplate, onSuccess: refresh, onError }),
    update: useMutation({ mutationFn: ({ id, ...data }) => messagingApi.updateTemplate(id, data), onSuccess: refresh, onError }),
    remove: useMutation({ mutationFn: messagingApi.deleteTemplate, onSuccess: refresh, onError }),
  };
};
