/**
 * Notification endpoints, bound to the shared http client. Exported through
 * each portal's `services/api.js` so `NotificationBell` can keep taking an
 * `api` prop.
 */
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
