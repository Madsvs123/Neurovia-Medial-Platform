/**
 * Messaging domain constants + default routing/SLA configuration.
 *
 * Everything the UI needs to render statuses, kinds, teams and transitions
 * is exported from here and served by GET /api/v2/messaging/config so the
 * three portals never hard-code these values.
 *
 * Routing + SLA defaults can be overridden per-deployment by an admin via
 * the MessagingSettings document (see models/MessagingSettings.js).
 */

const THREAD_KINDS = ['support', 'direct', 'internal'];

const THREAD_STATUSES = ['new', 'open', 'waiting_requester', 'resolved', 'closed'];

const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const CATEGORIES = ['general', 'billing', 'technical', 'clinical', 'course', 'other'];

const TEAMS = ['support', 'billing', 'technical', 'clinical'];

const PARTICIPANT_ROLES = ['requester', 'assignee', 'collaborator', 'observer'];

const MESSAGE_KINDS = ['text', 'note', 'system'];

const STAFF_ROLES = ['admin', 'educator'];

/** Auto-close resolved threads after this many days without a reply. */
const AUTO_CLOSE_RESOLVED_AFTER_DAYS = 14;

/** A requester can reopen a closed thread by replying within this window. */
const REOPEN_WINDOW_DAYS = 14;

/**
 * Default routing table. `roles` = who may claim/be assigned; `team` = which
 * team inbox the thread lands in; `preferEducatorsOf` = for clinical/course
 * questions, prefer the educators of the program in the thread's context.
 */
const DEFAULT_ROUTING = {
  support: {
    billing: { team: 'billing', roles: ['admin'] },
    technical: { team: 'technical', roles: ['admin'] },
    clinical: { team: 'clinical', roles: ['educator', 'admin'], preferEducatorsOf: 'context.programId' },
    course: { team: 'clinical', roles: ['educator', 'admin'], preferEducatorsOf: 'context.programId' },
    general: { team: 'support', roles: ['admin'] },
    other: { team: 'support', roles: ['admin'] },
  },
  internal: {
    '*': { team: 'support', roles: ['admin'] },
  },
};

/** First-response targets in hours, by priority. */
const DEFAULT_SLA = {
  firstResponseHours: { urgent: 2, high: 8, normal: 24, low: 72 },
};

/** Human labels shared with the frontend (i18n keys are derived from these). */
const STATUS_META = {
  new: { label: 'New', requesterLabel: 'Received', color: 'orange', active: true },
  open: { label: 'Open', requesterLabel: "We're on it", color: 'blue', active: true },
  waiting_requester: { label: 'Waiting on requester', requesterLabel: 'Waiting for you', color: 'purple', active: true },
  resolved: { label: 'Resolved', requesterLabel: 'Solved', color: 'green', active: false },
  closed: { label: 'Closed', requesterLabel: 'Closed', color: 'gray', active: false },
};

const KIND_META = {
  support: { label: 'Support ticket', color: 'teal' },
  direct: { label: 'Direct message', color: 'blue' },
  internal: { label: 'Internal request', color: 'purple' },
};

module.exports = {
  THREAD_KINDS,
  THREAD_STATUSES,
  PRIORITIES,
  CATEGORIES,
  TEAMS,
  PARTICIPANT_ROLES,
  MESSAGE_KINDS,
  STAFF_ROLES,
  AUTO_CLOSE_RESOLVED_AFTER_DAYS,
  REOPEN_WINDOW_DAYS,
  DEFAULT_ROUTING,
  DEFAULT_SLA,
  STATUS_META,
  KIND_META,
};
