const { availableTransitions } = require('./threadStateMachine');
const routingService = require('./routingService');

/**
 * The ONLY place authorization rules for messaging live.
 *
 * `can(user, action, thread)` is used by every service method, and
 * `capabilities(user, thread)` is returned with each thread so the clients
 * render buttons from data instead of re-implementing these rules.
 */

const isStaff = (user) => ['admin', 'educator'].includes(user.role);
const isAdmin = (user) => user.role === 'admin';

const participantOf = (thread, user) => {
  const id = String(user._id);
  return (thread.participants || []).find(p => String(p.user?._id || p.user) === id) || null;
};

const isActiveParticipant = (thread, user) => {
  const p = participantOf(thread, user);
  return !!p && !p.deletedAt;
};

const isRequester = (thread, user) => String(thread.requester?._id || thread.requester) === String(user._id);
const isAssignee = (thread, user) => !!thread.assignee && String(thread.assignee?._id || thread.assignee) === String(user._id);

/** An unassigned support/internal ticket sitting in a queue this user may work. */
const isQueueVisible = (user, thread) =>
  isStaff(user)
  && thread.kind !== 'direct'
  && !thread.assignee
  && routingService.canWorkTeam(user, thread.team);

/**
 * Actions:
 *  view, reply, note, claim, assign, unassign, escalate, changeStatus,
 *  addParticipant, removeParticipant, archive, delete, viewAll, setPriority
 */
function can(user, action, thread) {
  const participant = isActiveParticipant(thread, user);
  const staff = isStaff(user);
  const admin = isAdmin(user);

  switch (action) {
    case 'viewAll':
      return admin;

    case 'view':
      // internal threads are never visible to students, even by link
      if (thread.kind === 'internal' && !staff) return false;
      // admins may observe metadata of any thread; message bodies still
      // require joining — except for queue tickets (see readMessages)
      return participant || admin || isQueueVisible(user, thread);

    case 'readMessages':
      if (thread.kind === 'internal' && !staff) return false;
      // Staff may read an unassigned ticket in a team they work, so they can
      // decide whether to claim it. Everything else requires participation.
      return participant || isQueueVisible(user, thread);

    case 'reply':
      if (!participant) return false;
      if (thread.kind === 'internal' && !staff) return false;
      return true;

    case 'note':
      return participant && staff;

    case 'claim':
      if (thread.kind === 'direct') return false;
      if (thread.assignee) return false;
      if (!staff) return false;
      return routingService.canWorkTeam(user, thread.team);

    case 'join':
      // Admins can join anything (auditable via system message). Educators
      // can only join unassigned tickets in a queue they are allowed to work.
      if (participant) return false;
      if (admin) return true;
      if (!staff) return false;
      if (thread.kind === 'direct') return false;
      return !thread.assignee && routingService.canWorkTeam(user, thread.team);

    case 'assign':
    case 'unassign':
    case 'setPriority':
      if (thread.kind === 'direct') return false;
      return admin || (isAssignee(thread, user));

    case 'escalate':
      if (thread.kind !== 'support') return false;
      return participant && staff;

    case 'changeStatus':
      if (thread.kind === 'direct') return false;
      if (!participant) return false;
      return staff || isRequester(thread, user);

    case 'addParticipant':
    case 'removeParticipant':
      if (thread.kind === 'direct') return admin;
      return admin || isAssignee(thread, user);

    case 'archive':
      return participant;

    case 'delete':
      // "delete" is a per-participant hide; admins may hard-delete
      return participant || admin;

    default:
      return false;
  }
}

function actorFor(user, thread) {
  return { role: user.role, isRequester: isRequester(thread, user) };
}

/** Capability map shipped with every thread payload. */
function capabilities(user, thread) {
  const caps = {};
  ['view', 'readMessages', 'reply', 'note', 'claim', 'join', 'assign', 'unassign', 'setPriority',
    'escalate', 'changeStatus', 'addParticipant', 'removeParticipant', 'archive', 'delete']
    .forEach(action => { caps[action] = can(user, action, thread); });

  caps.transitions = caps.changeStatus
    ? availableTransitions(thread.kind, thread.status, actorFor(user, thread))
    : [];

  return caps;
}

function assertCan(user, action, thread) {
  if (!can(user, action, thread)) {
    const err = new Error(`Not allowed to ${action} this thread`);
    err.statusCode = 403;
    throw err;
  }
}

module.exports = {
  isStaff,
  isAdmin,
  participantOf,
  isActiveParticipant,
  isRequester,
  isAssignee,
  can,
  assertCan,
  capabilities,
  actorFor,
};
