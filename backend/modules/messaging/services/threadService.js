const mongoose = require('mongoose');
const Thread = require('../models/Thread');
const ThreadMessage = require('../models/ThreadMessage');
const User = require('../../../models/User');
const policy = require('./threadPolicy');
const routingService = require('./routingService');
const relationships = require('./relationshipService');
const stateMachine = require('./threadStateMachine');
const { addSystemMessage } = require('./systemMessages');
const { POPULATE, PUBLIC_USER_FIELDS, serializeThread, serializeThreads, unreadCounts } = require('./threadSerializer');
const { safeEmit } = require('./messagingEvents');
const { httpError } = require('./errors');

const oid = (id) => new mongoose.Types.ObjectId(String(id));

const loadThread = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(400, 'Invalid thread id');
  const thread = await Thread.findById(id).populate(POPULATE);
  if (!thread) throw httpError(404, 'Thread not found');
  return thread;
};

/** Load + authorize in one step. */
const loadFor = async (user, id, action = 'view') => {
  const thread = await loadThread(id);
  policy.assertCan(user, action, thread);
  return thread;
};

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

/**
 * @param {object} user     the authenticated user (req.user)
 * @param {object} input    { kind, subject, body, category, priority, to, context }
 */
async function createThread(user, input) {
  const { subject, body, category = 'general', priority = 'normal', context = {} } = input;
  const { to } = input;
  let { kind } = input;

  if (!subject?.trim() || !body?.trim()) throw httpError(400, 'Subject and message are required');

  // Default kind by role if the client didn't pick one.
  if (!kind) kind = user.role === 'student' ? 'support' : (to ? 'direct' : 'internal');

  const participants = [{ user: user._id, role: 'requester', lastReadAt: new Date() }];
  let team = null;
  let assignee = null;
  let targetUser = null;

  if (kind === 'support') {
    if (policy.isStaff(user)) throw httpError(400, 'Staff open internal requests, not support tickets');
    team = routingService.teamFor({ kind, category });
  } else if (kind === 'internal') {
    if (!policy.isStaff(user)) throw httpError(403, 'Only staff can open internal requests');
    team = routingService.teamFor({ kind, category });
    if (user.role === 'admin' && to) {
      // admin → educator task: direct assignment
      targetUser = await User.findById(to);
      if (!targetUser || targetUser.role !== 'educator') throw httpError(400, 'Internal tasks can only be sent to educators');
      participants.push({ user: targetUser._id, role: 'assignee' });
      assignee = targetUser._id;
    }
  } else if (kind === 'direct') {
    if (!to || !mongoose.Types.ObjectId.isValid(to)) throw httpError(400, 'Please choose a recipient');
    targetUser = await User.findById(to);
    if (!targetUser) throw httpError(404, 'Recipient not found');
    if (targetUser.role === 'admin' && user.role !== 'admin') {
      throw httpError(400, 'Admins are reached through a support request, not a direct message');
    }
    const allowed = await relationships.canDirectMessage(user, targetUser);
    if (!allowed) throw httpError(403, 'You can only message people you share a program with');
    participants.push({ user: targetUser._id, role: 'collaborator' });

    // Pre-fill program context for educator↔student DMs when unambiguous
    if (!context.programId) {
      const edu = user.role === 'educator' ? user : (targetUser.role === 'educator' ? targetUser : null);
      const stu = user.role === 'student' ? user : (targetUser.role === 'student' ? targetUser : null);
      if (edu && stu) {
        const shared = await relationships.sharedProgramIds(edu._id, stu._id);
        if (shared.length === 1) context.programId = shared[0];
      }
    }
  } else {
    throw httpError(400, 'Unknown thread kind');
  }

  const thread = await Thread.create({
    kind,
    subject: subject.trim(),
    category,
    priority,
    status: stateMachine.initialStatus(kind),
    requester: user._id,
    assignee,
    team,
    context: {
      programId: context.programId || null,
      courseId: context.courseId || null,
      lessonId: context.lessonId || null,
      clinicalCaseId: context.clinicalCaseId || null,
    },
    participants,
    lastMessage: { text: body.trim(), senderId: user._id, at: new Date() },
    lastActivityAt: new Date(),
    messageCount: 1,
  });

  const message = await ThreadMessage.create({
    thread: thread._id,
    sender: user._id,
    kind: 'text',
    body: body.trim(),
  });

  if (assignee) {
    thread.status = 'open';
    await addSystemMessage(thread, 'assigned', { assigneeId: assignee, assigneeName: targetUser.username }, user);
    await thread.save();
  }

  const populated = await loadThread(thread._id);

  const candidateIds = (kind === 'support' || (kind === 'internal' && !assignee))
    ? await routingService.candidateAssignees({ team, context: populated.context })
    : [];

  safeEmit('thread.created', { thread: populated, actor: user, candidateIds, firstMessage: message });

  return serializeThread(populated, user);
}

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

/**
 * Boxes:
 *  inbox     – threads I'm an active participant of (not archived)
 *  assigned  – support/internal threads assigned to me
 *  direct    – my direct threads
 *  support   – support threads I'm part of (as requester for students)
 *  internal  – internal threads I'm part of (admins: all internal)
 *  queue     – unassigned support/internal threads in teams I can work (not mine)
 *  team      – every thread of a team I can work (needs ?team=)
 *  archived  – threads I archived
 *  all       – every thread on the platform (admin)
 */
async function listThreads(user, query = {}) {
  const { box = 'inbox', kind, status, team, q, cursor, assignee, priority } = query;
  const limit = Math.min(parseInt(query.limit, 10) || 30, 100);
  const me = oid(user._id);

  const mine = { participants: { $elemMatch: { user: me, deletedAt: null, archivedAt: null } } };
  const filter = {};

  switch (box) {
    case 'inbox':
      Object.assign(filter, mine);
      break;
    case 'assigned':
      filter.assignee = me;
      break;
    case 'direct':
      Object.assign(filter, mine, { kind: 'direct' });
      break;
    case 'support':
      Object.assign(filter, mine, { kind: 'support' });
      break;
    case 'internal':
      if (!policy.isStaff(user)) throw httpError(403, 'Not allowed');
      filter.kind = 'internal';
      if (!policy.isAdmin(user)) Object.assign(filter, mine);
      break;
    case 'queue': {
      if (!policy.isStaff(user)) throw httpError(403, 'Not allowed');
      const teams = routingService.teamsFor(user);
      Object.assign(filter, {
        kind: { $in: ['support', 'internal'] },
        assignee: null,
        status: { $in: ['new', 'open'] },
        team: { $in: team ? [team].filter(t => teams.includes(t)) : teams },
        'participants.user': { $ne: me },
      });
      break;
    }
    case 'team': {
      if (!policy.isStaff(user)) throw httpError(403, 'Not allowed');
      if (!team || !routingService.canWorkTeam(user, team)) throw httpError(403, 'Not allowed to view this team');
      filter.team = team;
      break;
    }
    case 'archived':
      filter.participants = { $elemMatch: { user: me, deletedAt: null, archivedAt: { $ne: null } } };
      break;
    case 'all':
      if (!policy.isAdmin(user)) throw httpError(403, 'Not allowed');
      break;
    default:
      throw httpError(400, `Unknown box "${box}"`);
  }

  if (kind && box !== 'direct' && box !== 'support' && box !== 'internal') filter.kind = kind;
  if (status) filter.status = { $in: String(status).split(',') };
  if (priority) filter.priority = priority;
  if (assignee && box !== 'assigned') filter.assignee = assignee === 'none' ? null : oid(assignee);
  if (team && box !== 'queue' && box !== 'team') filter.team = team;
  if (q) {
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ subject: rx }, { 'lastMessage.text': rx }];
  }
  if (cursor) {
    const at = new Date(cursor);
    if (!Number.isNaN(at.getTime())) filter.lastActivityAt = { $lt: at };
  }

  // Students must never see internal threads even via filters.
  if (!policy.isStaff(user)) filter.kind = filter.kind && filter.kind !== 'internal' ? filter.kind : { $in: ['support', 'direct'] };

  const threads = await Thread.find(filter)
    .sort({ lastActivityAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate(POPULATE);

  const hasMore = threads.length > limit;
  const page = hasMore ? threads.slice(0, limit) : threads;
  const items = await serializeThreads(page, user);

  return {
    items,
    nextCursor: hasMore ? page[page.length - 1].lastActivityAt.toISOString() : null,
  };
}

/** Per-box unread/open counters for badges. One round trip. */
async function counts(user) {
  const me = oid(user._id);
  const mine = { participants: { $elemMatch: { user: me, deletedAt: null, archivedAt: null } } };
  const staff = policy.isStaff(user);
  const teams = staff ? routingService.teamsFor(user) : [];

  const [inboxThreads, queueCount, assignedCount, internalCount] = await Promise.all([
    Thread.find(mine).select('participants kind').populate({ path: 'participants.user', select: '_id' }),
    staff ? Thread.countDocuments({
      kind: { $in: ['support', 'internal'] }, assignee: null, status: { $in: ['new', 'open'] },
      team: { $in: teams }, 'participants.user': { $ne: me },
    }) : 0,
    staff ? Thread.countDocuments({ assignee: me, status: { $in: ['new', 'open'] } }) : 0,
    staff ? Thread.countDocuments(policy.isAdmin(user)
      ? { kind: 'internal', status: { $in: ['new', 'open'] } }
      : { ...mine, kind: 'internal', status: { $in: ['new', 'open'] } }) : 0,
  ]);

  const unread = await unreadCounts(inboxThreads, user);
  let inboxUnread = 0;
  let directUnread = 0;
  let supportUnread = 0;
  inboxThreads.forEach(t => {
    const n = unread.get(String(t._id)) || 0;
    inboxUnread += n;
    if (t.kind === 'direct') directUnread += n;
    if (t.kind === 'support') supportUnread += n;
  });

  return {
    inbox: inboxUnread,
    direct: directUnread,
    support: supportUnread,
    queue: queueCount,
    assigned: assignedCount,
    internal: internalCount,
  };
}

/* ------------------------------------------------------------------ */
/* Read / update                                                       */
/* ------------------------------------------------------------------ */

async function getThread(user, id) {
  const thread = await loadFor(user, id, 'view');
  const [serialized] = await serializeThreads([thread], user);
  return serialized;
}

async function updateThread(user, id, patch) {
  const thread = await loadFor(user, id, 'view');
  const changes = {};

  if (patch.status && patch.status !== thread.status) {
    policy.assertCan(user, 'changeStatus', thread);
    const actor = policy.actorFor(user, thread);
    if (!stateMachine.canTransition(thread.kind, thread.status, patch.status, actor)) {
      throw httpError(400, `Cannot move this thread from "${thread.status}" to "${patch.status}"`);
    }
    const from = thread.status;
    thread.status = patch.status;
    if (patch.status === 'resolved') { thread.resolvedAt = new Date(); thread.closedAt = null; }
    else if (patch.status === 'closed') { thread.closedAt = new Date(); if (!thread.resolvedAt) thread.resolvedAt = new Date(); }
    else { thread.resolvedAt = null; thread.closedAt = null; }
    await addSystemMessage(thread, 'status', { from, to: patch.status }, user);
    changes.status = patch.status;
  }

  if (patch.priority && patch.priority !== thread.priority) {
    policy.assertCan(user, 'setPriority', thread);
    await addSystemMessage(thread, 'priority', { from: thread.priority, to: patch.priority }, user);
    thread.priority = patch.priority;
    changes.priority = patch.priority;
  }

  if (patch.subject && patch.subject.trim() && patch.subject.trim() !== thread.subject) {
    if (!policy.isStaff(user) && !policy.isRequester(thread, user)) throw httpError(403, 'Not allowed');
    thread.subject = patch.subject.trim();
    changes.subject = thread.subject;
  }

  if (patch.category && patch.category !== thread.category && thread.kind !== 'direct') {
    if (!policy.isStaff(user)) throw httpError(403, 'Not allowed');
    thread.category = patch.category;
    thread.team = routingService.teamFor({ kind: thread.kind, category: patch.category });
    changes.category = patch.category;
    changes.team = thread.team;
  }

  if (Object.keys(changes).length === 0) return serializeThread(thread, user);

  await thread.save();
  const fresh = await loadThread(thread._id);
  safeEmit('thread.updated', { thread: fresh, actor: user, changes });
  return serializeThread(fresh, user);
}

async function markRead(user, id) {
  const thread = await loadFor(user, id, 'readMessages');
  const me = policy.participantOf(thread, user);
  me.lastReadAt = new Date();
  await thread.save();
  safeEmit('thread.read', { thread, userId: user._id, at: me.lastReadAt });
  return { lastReadAt: me.lastReadAt };
}

async function setArchived(user, id, archived) {
  const thread = await loadFor(user, id, 'archive');
  const me = policy.participantOf(thread, user);
  me.archivedAt = archived ? new Date() : null;
  await thread.save();
  return { archivedAt: me.archivedAt };
}

/**
 * "Delete" hides the thread for the caller. Once every participant has
 * hidden it (or an admin hard-deletes), the thread and its messages go away.
 */
async function deleteThread(user, id, { hard = false } = {}) {
  const thread = await loadFor(user, id, 'delete');

  if (hard) {
    if (!policy.isAdmin(user)) throw httpError(403, 'Only admins can permanently delete threads');
    await ThreadMessage.deleteMany({ thread: thread._id });
    await thread.deleteOne();
    return { deleted: true, hard: true };
  }

  const me = policy.participantOf(thread, user);
  if (me) me.deletedAt = new Date();

  const everyoneGone = thread.participants.every(p => p.deletedAt);
  if (everyoneGone) {
    await ThreadMessage.deleteMany({ thread: thread._id });
    await thread.deleteOne();
    return { deleted: true, hard: true };
  }

  await thread.save();
  return { deleted: true, hard: false };
}

/* ------------------------------------------------------------------ */
/* Participants                                                        */
/* ------------------------------------------------------------------ */

async function addParticipant(user, id, { userId, role = 'collaborator' }) {
  const thread = await loadFor(user, id, 'addParticipant');
  if (!['collaborator', 'observer'].includes(role)) throw httpError(400, 'Invalid participant role');
  const target = await User.findById(userId).select(PUBLIC_USER_FIELDS);
  if (!target) throw httpError(404, 'User not found');
  if (thread.kind === 'internal' && target.role === 'student') throw httpError(400, 'Students cannot be added to internal threads');

  const existing = policy.participantOf(thread, target);
  if (existing) {
    existing.deletedAt = null;
    existing.archivedAt = null;
    existing.role = existing.role === 'requester' || existing.role === 'assignee' ? existing.role : role;
  } else {
    thread.participants.push({ user: target._id, role });
  }
  await addSystemMessage(thread, 'participant_added', { userId: target._id, username: target.username, role }, user);
  await thread.save();
  const fresh = await loadThread(thread._id);
  safeEmit('thread.updated', { thread: fresh, actor: user, changes: { participantAdded: String(target._id) } });
  return serializeThread(fresh, user);
}

async function removeParticipant(user, id, userId) {
  const thread = await loadFor(user, id, 'removeParticipant');
  const target = policy.participantOf(thread, { _id: userId });
  if (!target) throw httpError(404, 'Participant not found');
  if (target.role === 'requester') throw httpError(400, 'The requester cannot be removed');
  if (String(thread.assignee) === String(userId)) thread.assignee = null;
  thread.participants = thread.participants.filter(p => String(p.user?._id || p.user) !== String(userId));
  await addSystemMessage(thread, 'participant_removed', { userId, username: target.user?.username }, user);
  await thread.save();
  const fresh = await loadThread(thread._id);
  safeEmit('thread.updated', { thread: fresh, actor: user, changes: { participantRemoved: String(userId) } });
  return serializeThread(fresh, user);
}

/* ------------------------------------------------------------------ */
/* Directory / config                                                  */
/* ------------------------------------------------------------------ */

async function recipients(user, { q, limit = 20 } = {}) {
  const filter = await relationships.recipientFilterFor(user);
  if (!filter) return [];
  if (q) {
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$and = [...(filter.$and || []), { $or: [{ username: rx }, { email: rx }] }];
  }
  const users = await User.find(filter).select(PUBLIC_USER_FIELDS).sort({ username: 1 }).limit(Math.min(limit, 50));
  return users.map(u => ({ _id: u._id, username: u.username, email: u.email, role: u.role, status: u.status, avatar: u.avatar }));
}

function config(user) {
  const staff = policy.isStaff(user);
  return {
    role: user.role,
    isStaff: staff,
    teams: routingService.teamsFor(user),
    canCreate: user.role === 'student'
      ? ['support', 'direct']
      : user.role === 'educator' ? ['direct', 'internal'] : ['direct', 'internal'],
    statuses: stateMachine.STATUSES,
    transitions: stateMachine.TRANSITIONS,
    routing: routingService.publicConfig(),
  };
}

module.exports = {
  loadThread,
  loadFor,
  createThread,
  listThreads,
  counts,
  getThread,
  updateThread,
  markRead,
  setArchived,
  deleteThread,
  addParticipant,
  removeParticipant,
  recipients,
  config,
};
