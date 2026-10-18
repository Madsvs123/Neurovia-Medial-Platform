/**
 * Per-portal configuration for the shared messaging UI. Everything that
 * differs between student / educator / admin lives here — the components
 * themselves are role-agnostic and render from `thread.capabilities`.
 *
 *  boxes         : list tabs (key = API `box` param, countKey = counts field)
 *  sidebarCards  : which ThreadSidebar cards to render, in order
 *  bulkActions   : allow multi-select bulk status/priority changes
 *  settingsPath  : link to the messaging settings page (admin)
 *  profileLinkFor: link to a user's profile (staff)
 */

const base = (basePath) => ({
  basePath,
  threadPath: (id) => `${basePath}/${id}`,
  newPath: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString();
    return `${basePath}/new${qs ? `?${qs}` : ''}`;
  },
});

export const studentPortal = {
  ...base('/messages'),
  titleKey: 'nav.messages',
  role: 'student',
  fullHeight: false,
  filters: false,
  bulkActions: false,
  boxes: [
    { key: 'inbox', labelKey: 'boxes.inbox', countKey: 'unread' },
    { key: 'direct', labelKey: 'boxes.instructors' },
    { key: 'archived', labelKey: 'boxes.archived' },
  ],
  sidebarCards: ['details', 'context', 'participants', 'timeline'],
  settingsPath: null,
  profileLinkFor: null,
};

export const educatorPortal = {
  ...base('/educator/messages'),
  titleKey: 'nav.messages',
  role: 'educator',
  fullHeight: true,
  filters: true,
  bulkActions: false,
  boxes: [
    { key: 'inbox', labelKey: 'boxes.inbox', countKey: 'unread' },
    { key: 'direct', labelKey: 'boxes.myStudents' },
    { key: 'assigned', labelKey: 'boxes.assigned', countKey: 'assigned' },
    { key: 'queue', labelKey: 'boxes.queue', countKey: 'queue' },
    { key: 'internal', labelKey: 'boxes.requests', countKey: 'internal' },
    { key: 'archived', labelKey: 'boxes.archived' },
  ],
  sidebarCards: ['requester', 'context', 'assignment', 'details', 'participants', 'linked', 'timeline'],
  settingsPath: null,
  profileLinkFor: null,
};

export const adminPortal = {
  ...base('/admin/messages'),
  titleKey: 'nav.messages',
  role: 'admin',
  fullHeight: true,
  filters: true,
  bulkActions: true,
  boxes: [
    { key: 'queue', labelKey: 'boxes.queue', countKey: 'queue' },
    { key: 'assigned', labelKey: 'boxes.assigned', countKey: 'assigned' },
    { key: 'inbox', labelKey: 'boxes.inbox', countKey: 'unread' },
    { key: 'team', labelKey: 'boxes.team' },
    { key: 'internal', labelKey: 'boxes.internal', countKey: 'internal' },
    { key: 'all', labelKey: 'boxes.all' },
    { key: 'archived', labelKey: 'boxes.archived' },
  ],
  sidebarCards: ['requester', 'context', 'assignment', 'details', 'participants', 'linked', 'timeline'],
  settingsPath: '/admin/messages/settings',
  profileLinkFor: (user) => `/admin/users/${user._id}`,
};

export const portalForRole = (role) => (role === 'admin' ? adminPortal : role === 'educator' ? educatorPortal : studentPortal);
