/** Centralised React Query keys so hooks and the socket layer agree. */
export const qk = {
  config: ['messaging', 'config'],
  counts: ['messaging', 'counts'],
  stats: ['messaging', 'stats'],
  recipients: (params) => ['messaging', 'recipients', params],
  templates: (params) => ['messaging', 'templates', params],
  settings: ['messaging', 'settings'],
  threads: (params) => ['messaging', 'threads', params],
  threadsAll: ['messaging', 'threads'],
  thread: (id) => ['messaging', 'thread', id],
  messages: (id) => ['messaging', 'messages', id],
};
