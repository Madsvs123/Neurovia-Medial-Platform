/** React Query keys for the messaging feature — one place, no typos. */
export const queryKeys = {
  config: () => ['messaging', 'config'],
  counts: () => ['messaging', 'counts'],
  stats: () => ['messaging', 'stats'],
  threads: (params) => (params ? ['messaging', 'threads', params] : ['messaging', 'threads']),
  thread: (id) => ['messaging', 'thread', String(id)],
  messages: (id) => ['messaging', 'messages', String(id)],
  recipients: (q) => ['messaging', 'recipients', q || ''],
  templates: () => ['messaging', 'templates'],
  templatesAll: () => ['messaging', 'templates', 'all'],
};
