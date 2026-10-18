import http, { unwrap } from '../../../lib/http';

const BASE = '/api/v2/messaging';

/**
 * Messaging v2 client. Every call returns the unwrapped `data` payload.
 * Used by every portal — there is exactly one of these.
 */
export const messagingApi = {
  // meta
  getConfig: () => http.get(`${BASE}/config`).then(unwrap),
  getStats: () => http.get(`${BASE}/stats`).then(unwrap),
  getRecipients: (params) => http.get(`${BASE}/recipients`, { params }).then(unwrap),
  getCounts: () => http.get(`${BASE}/threads/counts`).then(unwrap),

  // threads
  listThreads: (params) => http.get(`${BASE}/threads`, { params }).then(unwrap),
  getThread: (id) => http.get(`${BASE}/threads/${id}`).then(unwrap),
  createThread: (data) => http.post(`${BASE}/threads`, data).then(unwrap),
  updateThread: (id, patch) => http.patch(`${BASE}/threads/${id}`, patch).then(unwrap),
  deleteThread: (id, { hard = false } = {}) => http.delete(`${BASE}/threads/${id}`, { params: hard ? { hard: true } : undefined }).then(unwrap),
  markRead: (id) => http.post(`${BASE}/threads/${id}/read`).then(unwrap),
  archive: (id) => http.post(`${BASE}/threads/${id}/archive`).then(unwrap),
  unarchive: (id) => http.post(`${BASE}/threads/${id}/unarchive`).then(unwrap),

  claim: (id) => http.post(`${BASE}/threads/${id}/claim`).then(unwrap),
  join: (id) => http.post(`${BASE}/threads/${id}/join`).then(unwrap),
  assign: (id, userId) => http.post(`${BASE}/threads/${id}/assign`, { userId }).then(unwrap),
  unassign: (id) => http.post(`${BASE}/threads/${id}/unassign`).then(unwrap),
  escalate: (id, data) => http.post(`${BASE}/threads/${id}/escalate`, data).then(unwrap),
  addParticipant: (id, data) => http.post(`${BASE}/threads/${id}/participants`, data).then(unwrap),
  removeParticipant: (id, userId) => http.delete(`${BASE}/threads/${id}/participants/${userId}`).then(unwrap),

  // messages
  listMessages: (id, params) => http.get(`${BASE}/threads/${id}/messages`, { params }).then(unwrap),
  sendMessage: (id, data) => http.post(`${BASE}/threads/${id}/messages`, data).then(unwrap),
  editMessage: (id, mid, data) => http.patch(`${BASE}/threads/${id}/messages/${mid}`, data).then(unwrap),
  deleteMessage: (id, mid) => http.delete(`${BASE}/threads/${id}/messages/${mid}`).then(unwrap),

  // templates
  listTemplates: () => http.get(`${BASE}/templates`).then(unwrap),
  listAllTemplates: () => http.get(`${BASE}/templates/all`).then(unwrap),
  createTemplate: (data) => http.post(`${BASE}/templates`, data).then(unwrap),
  updateTemplate: (id, data) => http.patch(`${BASE}/templates/${id}`, data).then(unwrap),
  deleteTemplate: (id) => http.delete(`${BASE}/templates/${id}`).then(unwrap),
};

export default messagingApi;
