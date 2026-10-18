const Thread = require('../models/Thread');
const ThreadMessage = require('../models/ThreadMessage');
const User = require('../../../models/User');
const policy = require('./threadPolicy');
const routingService = require('./routingService');
const { addSystemMessage } = require('./systemMessages');
const { loadFor, loadThread } = require('./threadService');
const { serializeThread, PUBLIC_USER_FIELDS } = require('./threadSerializer');
const { safeEmit } = require('./messagingEvents');
const { httpError } = require('./errors');

const ensureParticipant = (thread, userId, role) => {
  const existing = policy.participantOf(thread, { _id: userId });
  if (existing) {
    existing.deletedAt = null;
    existing.archivedAt = null;
    if (role === 'assignee') existing.role = 'assignee';
  } else {
    thread.participants.push({ user: userId, role });
  }
};

/**
 * Claim from the queue. Atomic: the filtered update only succeeds if the
 * thread is still unassigned, so two agents clicking at once can't both win.
 */
async function claim(user, id) {
  const thread = await loadFor(user, id, 'view');
  policy.assertCan(user, 'claim', thread);

  const updated = await Thread.findOneAndUpdate(
    { _id: thread._id, assignee: null },
    {
      $set: { assignee: user._id, status: thread.status === 'new' ? 'open' : thread.status },
      $pull: { participants: { user: user._id } },
    },
    { new: true }
  );
  if (!updated) throw httpError(409, 'Someone else just claimed this thread');

  updated.participants.push({ user: user._id, role: 'assignee', lastReadAt: new Date() });
  await addSystemMessage(updated, 'claimed', { assigneeId: user._id, assigneeName: user.username }, user);
  await updated.save();

  const fresh = await loadThread(updated._id);
  safeEmit('thread.updated', { thread: fresh, actor: user, changes: { assignee: String(user._id), claimed: true } });
  return serializeThread(fresh, user);
}

/** Admin (or current assignee) hands the thread to a specific staff member. */
async function assign(user, id, { userId }) {
  const thread = await loadFor(user, id, 'view');
  policy.assertCan(user, 'assign', thread);

  const target = await User.findById(userId).select(PUBLIC_USER_FIELDS);
  if (!target || !policy.isStaff(target)) throw httpError(400, 'Assignee must be an admin or educator');
  if (thread.team && !routingService.canWorkTeam(target, thread.team)) {
    throw httpError(400, `${target.username} cannot work ${thread.team} threads`);
  }

  const previous = thread.assignee ? String(thread.assignee._id || thread.assignee) : null;
  if (previous && previous !== String(target._id)) {
    const prev = policy.participantOf(thread, { _id: previous });
    if (prev && prev.role === 'assignee') prev.role = 'collaborator';
  }

  thread.assignee = target._id;
  if (thread.status === 'new') thread.status = 'open';
  ensureParticipant(thread, target._id, 'assignee');
  await addSystemMessage(thread, 'assigned', { assigneeId: target._id, assigneeName: target.username }, user);
  await thread.save();

  const fresh = await loadThread(thread._id);
  safeEmit('thread.updated', { thread: fresh, actor: user, changes: { assignee: String(target._id) } });
  return serializeThread(fresh, user);
}

async function unassign(user, id) {
  const thread = await loadFor(user, id, 'view');
  policy.assertCan(user, 'unassign', thread);
  if (!thread.assignee) return serializeThread(thread, user);

  const prev = policy.participantOf(thread, { _id: thread.assignee._id || thread.assignee });
  if (prev && prev.role === 'assignee') prev.role = 'collaborator';
  const prevId = thread.assignee._id || thread.assignee;
  thread.assignee = null;
  if (thread.status === 'open' || thread.status === 'waiting_requester') thread.status = 'new';
  await addSystemMessage(thread, 'unassigned', { previousAssigneeId: prevId }, user);
  await thread.save();

  const fresh = await loadThread(thread._id);
  safeEmit('thread.updated', { thread: fresh, actor: user, changes: { assignee: null } });
  return serializeThread(fresh, user);
}

/**
 * Admin observe/join: adds the admin as a collaborator (or an educator to an
 * unassigned ticket in their team). Always recorded as a system message so
 * the requester can see who entered the conversation.
 */
async function join(user, id) {
  const thread = await loadFor(user, id, 'view');
  policy.assertCan(user, 'join', thread);

  const role = policy.isAdmin(user) ? 'collaborator' : 'assignee';
  if (role === 'assignee') return claim(user, id);

  ensureParticipant(thread, user._id, role);
  await addSystemMessage(thread, 'joined', { userId: user._id, username: user.username, role }, user);
  await thread.save();

  const fresh = await loadThread(thread._id);
  safeEmit('thread.updated', { thread: fresh, actor: user, changes: { participantAdded: String(user._id) } });
  return serializeThread(fresh, user);
}

/**
 * Escalation creates a linked child thread:
 *  - support thread handled by an educator → `internal` thread to the admin team
 *  - admin wants clinical input → child `support` thread routed to the
 *    clinical team with the requester kept as a participant
 * The original stays visible to everyone with a system message.
 */
async function escalate(user, id, { toTeam, note }) {
  const thread = await loadFor(user, id, 'view');
  policy.assertCan(user, 'escalate', thread);
  if (!toTeam || !routingService.routing.teams[toTeam]) throw httpError(400, 'Unknown team');
  if (toTeam === thread.team) throw httpError(400, 'The thread is already with that team');

  const targetRoles = routingService.rolesForTeam(toTeam);
  const adminOnlyTeam = targetRoles.length === 1 && targetRoles[0] === 'admin';
  const kind = adminOnlyTeam ? 'internal' : 'support';

  const participants = [{ user: user._id, role: 'requester', lastReadAt: new Date() }];
  if (kind === 'support') {
    // clinical: keep the original requester in the loop
    participants.push({ user: thread.requester._id || thread.requester, role: 'collaborator' });
  }

  const child = await Thread.create({
    kind,
    subject: `[Escalated] ${thread.subject}`,
    category: kind === 'internal' ? thread.category : 'clinical',
    priority: thread.priority,
    status: 'new',
    requester: user._id,
    team: toTeam,
    context: thread.context,
    participants,
    parentThread: thread._id,
    lastMessage: { text: note?.trim() || `Escalated from ${thread.team || 'thread'}`, senderId: user._id, at: new Date() },
    messageCount: 1,
  });

  await ThreadMessage.create({
    thread: child._id,
    sender: user._id,
    kind: 'text',
    body: note?.trim() || `Escalated from "${thread.subject}" for ${toTeam} review.`,
  });

  await addSystemMessage(thread, 'escalated', { toTeam, childThreadId: child._id }, user);
  await thread.save();

  const freshParent = await loadThread(thread._id);
  const freshChild = await loadThread(child._id);
  const candidateIds = await routingService.candidateAssignees({ team: toTeam, context: freshChild.context });

  safeEmit('thread.escalated', { thread: freshParent, child: freshChild, actor: user, candidateIds });
  safeEmit('thread.created', { thread: freshChild, actor: user, candidateIds });

  return { parent: serializeThread(freshParent, user), child: serializeThread(freshChild, user) };
}

module.exports = { claim, assign, unassign, join, escalate };
