import { http as API } from '../../lib/http';

/** Notification endpoints — shared by all portals (one definition). */
export const getNotifications = (params) => API.get('/api/notifications', { params });
export const getUnreadCount = () => API.get('/api/notifications/unread-count');
export const getNotificationStats = () => API.get('/api/notifications/stats');
export const createNotification = (data) => API.post('/api/notifications', data);
export const broadcastNotification = (data) => API.post('/api/notifications/broadcast', data);
export const markNotificationAsRead = (id) => API.put(`/api/notifications/${id}/read`);
export const markAllNotificationsAsRead = () => API.put('/api/notifications/mark-all-read');
export const deleteNotification = (id) => API.delete(`/api/notifications/${id}`);
export const deleteAllNotifications = () => API.delete('/api/notifications/delete-all');
