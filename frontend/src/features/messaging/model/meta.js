/**
 * Presentation metadata for thread status / priority / kind / team.
 * Labels come from i18n (see locales/en/messaging.json); this file only
 * maps values to colours and icons so every portal renders them alike.
 */
export const STATUS_COLOR = {
  new: 'orange',
  open: 'blue',
  waiting_requester: 'purple',
  resolved: 'green',
  closed: 'gray',
};

export const PRIORITY_COLOR = {
  low: 'gray',
  normal: 'blue',
  high: 'orange',
  urgent: 'red',
};

export const KIND_COLOR = {
  support: 'teal',
  direct: 'blue',
  internal: 'purple',
};

export const TEAM_COLOR = {
  support: 'teal',
  billing: 'yellow',
  technical: 'cyan',
  clinical: 'green',
};

export const ROLE_COLOR = {
  admin: 'red',
  educator: 'purple',
  student: 'blue',
};

export const ACTIVE_STATUSES = ['new', 'open', 'waiting_requester'];
export const DONE_STATUSES = ['resolved', 'closed'];

export const isDone = (status) => DONE_STATUSES.includes(status);

/** Status label key, with the friendlier student wording for non-staff. */
export const statusLabelKey = (status, { isStaff, isRequester } = {}) => {
  if (!isStaff) return `status.student.${status}`;
  if (status === 'waiting_requester' && !isRequester) return 'status.waiting_requester_staff';
  return `status.${status}`;
};

export const displayName = (user) => user?.username || user?.email || 'Unknown';

export const initials = (user) => displayName(user).slice(0, 2).toUpperCase();

export const idOf = (x) => (x && typeof x === 'object' ? x._id : x);

/** SLA deadline for a thread (null when not applicable / already answered). */
export const slaDueAt = (thread, config) => {
  if (!thread || thread.kind === 'direct' || thread.firstResponseAt) return null;
  const hours = config?.routing?.sla?.firstResponseHours?.[thread.priority];
  if (!hours) return null;
  return new Date(new Date(thread.createdAt).getTime() + hours * 3600e3);
};
