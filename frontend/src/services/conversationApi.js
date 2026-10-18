/**
 * Single definition of the conversation / messaging API surface.
 *
 * Each portal has its own axios instance (different cookie preferences and
 * 401 handling), so the endpoints are defined once here and bound to an
 * instance via `createConversationApi(API)`.
 */
export const createConversationApi = (API) => ({
  // Lists
  getMyConversations: (params) => API.get('/api/conversations/my', { params }),
  getAllConversations: (params) => API.get('/api/conversations', { params: { scope: 'all', ...(params || {}) } }), // admin only
  getSupportQueue: () => API.get('/api/conversations/queue'),                                                     // staff only
  getConversationStats: () => API.get('/api/conversations/stats'),                                                // admin only

  // Single conversation
  getConversation: (id) => API.get(`/api/conversations/${id}`),
  getNewConversationForm: () => API.get('/api/conversations/new'),                                                // staff only
  createConversation: (data) => API.post('/api/conversations', data),
  updateConversationStatus: (id, status) => API.put(`/api/conversations/${id}/status`, { status }),
  joinConversation: (id) => API.post(`/api/conversations/${id}/join`),
  deleteConversation: (id) => API.delete(`/api/conversations/${id}`),                                             // admin only (soft delete)

  // Messages
  getConversationMessages: (id) => API.get(`/api/conversations/${id}/messages`),
  sendMessage: (id, data) => API.post(`/api/conversations/${id}/messages`, data),
  markConversationRead: (id) => API.put(`/api/conversations/${id}/read`),
  markAllConversationsRead: () => API.put('/api/conversations/mark-all-read'),
  markMessageRead: (id) => API.put(`/api/messages/${id}/read`),
  deleteMessage: (id) => API.delete(`/api/messages/${id}`),
});

/** Polling cadence shared by every portal (ms). Kept well inside the API's polling rate budget. */
export const POLL_INTERVALS = {
  conversations: 30000,
  messages: 8000,
  queue: 30000,
  stats: 60000,
};
