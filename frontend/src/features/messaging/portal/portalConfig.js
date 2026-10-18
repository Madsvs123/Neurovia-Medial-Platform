/**
 * Per-portal configuration for the shared messaging UI.
 *
 * Each portal renders exactly the same <InboxPage/> / <ThreadPage/> /
 * <NewThreadPage/>; what differs (routes, which boxes appear, which kinds
 * can be created, which sidebar cards show) is data, defined here.
 *
 * box: { key, labelKey, params: { box, ...filters }, badge?: counts-field }
 */
export const studentPortal = {
  role: 'student',
  basePath: '/messages',
  isStaff: false,
  boxes: [
    { key: 'inbox', labelKey: 'boxes.inbox', params: { box: 'inbox' }, badge: 'inbox' },
    { key: 'support', labelKey: 'boxes.support', params: { box: 'support' }, badge: 'support' },
    { key: 'direct', labelKey: 'boxes.direct', params: { box: 'direct' }, badge: 'direct' },
    { key: 'archived', labelKey: 'boxes.archived', params: { box: 'archived' } },
  ],
  createKinds: ['support', 'direct'],
  sidebar: ['context', 'details', 'participants', 'linked'],
  showFilters: false,
};

export const educatorPortal = {
  role: 'educator',
  basePath: '/educator/messages',
  isStaff: true,
  boxes: [
    { key: 'inbox', labelKey: 'boxes.inbox', params: { box: 'inbox' }, badge: 'inbox' },
    { key: 'students', labelKey: 'boxes.students', params: { box: 'direct' }, badge: 'direct' },
    { key: 'assigned', labelKey: 'boxes.assigned', params: { box: 'assigned' }, badge: 'assigned' },
    { key: 'queue', labelKey: 'boxes.clinicalQueue', params: { box: 'queue' }, badge: 'queue' },
    { key: 'internal', labelKey: 'boxes.requests', params: { box: 'internal' }, badge: 'internal' },
    { key: 'archived', labelKey: 'boxes.archived', params: { box: 'archived' } },
  ],
  createKinds: ['direct', 'internal'],
  sidebar: ['requester', 'context', 'assignment', 'details', 'participants', 'linked'],
  showFilters: true,
};

export const adminPortal = {
  role: 'admin',
  basePath: '/admin/messages',
  isStaff: true,
  boxes: [
    { key: 'queue', labelKey: 'boxes.queue', params: { box: 'queue' }, badge: 'queue' },
    { key: 'assigned', labelKey: 'boxes.assigned', params: { box: 'assigned' }, badge: 'assigned' },
    { key: 'inbox', labelKey: 'boxes.inbox', params: { box: 'inbox' }, badge: 'inbox' },
    { key: 'team-support', labelKey: 'team.support', params: { box: 'team', team: 'support' }, group: 'teams' },
    { key: 'team-billing', labelKey: 'team.billing', params: { box: 'team', team: 'billing' }, group: 'teams' },
    { key: 'team-technical', labelKey: 'team.technical', params: { box: 'team', team: 'technical' }, group: 'teams' },
    { key: 'team-clinical', labelKey: 'team.clinical', params: { box: 'team', team: 'clinical' }, group: 'teams' },
    { key: 'internal', labelKey: 'boxes.internal', params: { box: 'internal' }, badge: 'internal' },
    { key: 'all', labelKey: 'boxes.all', params: { box: 'all' } },
    { key: 'archived', labelKey: 'boxes.archived', params: { box: 'archived' } },
  ],
  createKinds: ['direct', 'internal'],
  sidebar: ['requester', 'context', 'assignment', 'details', 'participants', 'linked'],
  showFilters: true,
};

export const portalFor = (role) => {
  if (role === 'admin') return adminPortal;
  if (role === 'educator') return educatorPortal;
  return studentPortal;
};

export const threadPath = (portal, id) => `${portal.basePath}/${id}`;
