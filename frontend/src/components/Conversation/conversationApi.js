/**
 * Single source of truth for the conversation/message/notification REST
 * calls. Previously this exact list of ~20 functions was copy-pasted
 * verbatim into `services/api.js` (student), `admin/services/api.js` and
 * `educator/services/api.js`. Each portal still has its own axios instance
 * (different auth cookie / interceptor behaviour), so this factory takes
 * that instance and returns the bound functions instead of duplicating them.
 */
export const createConversationApi = (API) => ({
  // Conversations
  getConversations: (params) => API.get('/api/conversations', { params }),
  getAllConversations: () => API.get('/api/conversations', { params: { all: true } }),
  getMyConversations: () => API.get('/api/conversations/my'),
  getConversation: (id) => API.get(`/api/conversations/${id}`),
  getNewConversationForm: () => API.get('/api/conversations/new'),
  createConversation: (data) => API.post('/api/conversations', data),
  updateConversationStatus: (id, status) => API.put(`/api/conversations/${id}/status`, { status }),
  deleteConversation: (id) => API.delete(`/api/conversations/${id}`),
  markConversationRead: (id) => API.put(`/api/conversations/${id}/read`),
  markAllConversationsRead: () => API.put('/api/conversations/mark-all-read'),
  getSupportQueue: () => API.get('/api/conversations/queue'),
  joinConversation: (id) => API.post(`/api/conversations/${id}/join`),
  getConversationMessages: (id) => API.get(`/api/conversations/${id}/messages`),
  sendMessage: (id, data) => API.post(`/api/conversations/${id}/messages`, data),

  // Messages
  markMessageRead: (id) => API.put(`/api/messages/${id}/read`),
});

export const createNotificationApi = (API) => ({
  getNotifications: (params) => API.get('/api/notifications', { params }),
  getUnreadCount: () => API.get('/api/notifications/unread-count'),
  getNotificationStats: () => API.get('/api/notifications/stats'),
  createNotification: (data) => API.post('/api/notifications', data),
  broadcastNotification: (data) => API.post('/api/notifications/broadcast', data),
  markNotificationAsRead: (id) => API.put(`/api/notifications/${id}/read`),
  markAllNotificationsAsRead: () => API.put('/api/notifications/mark-all-read'),
  deleteNotification: (id) => API.delete(`/api/notifications/${id}`),
  deleteAllNotifications: () => API.delete('/api/notifications/delete-all'),
});
