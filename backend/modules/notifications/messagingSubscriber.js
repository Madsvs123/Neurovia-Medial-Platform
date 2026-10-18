const User = require('../../models/User');
const Notification = require('../../models/Notification');
const { notify } = require('../../utils/notify');
const { bus } = require('../messaging/services/messagingEvents');

/**
 * Turns messaging domain events into in-app notifications.
 *
 * Rules:
 *  - links are role-aware so every bell click lands on a page that exists
 *  - new support/internal threads notify only the routing candidates
 *    (team members / the program's educators), never "every educator"
 *  - new messages are digested: if the recipient already has an unread
 *    notification for the same thread from the last 10 minutes, we update it
 *    instead of stacking N notifications
 */
const DIGEST_WINDOW_MS = 10 * 60 * 1000;

function linkFor(role, threadId) {
  if (role === 'admin') return `/admin/messages/${threadId}`;
  if (role === 'educator') return `/educator/messages/${threadId}`;
  return `/messages/${threadId}`;
}

async function rolesFor(userIds) {
  const users = await User.find({ _id: { $in: userIds } }).select('role');
  return new Map(users.map(u => [String(u._id), u.role]));
}

async function notifyMany(userIds, build) {
  const ids = [...new Set(userIds.map(String))];
  if (!ids.length) return;
  const roles = await rolesFor(ids);
  await Promise.all(ids.map(id => notify({ userId: id, ...build(id, roles.get(id) || 'student') })));
}

const participantIds = (thread, exceptId) => (thread.participants || [])
  .filter(p => !p.deletedAt && String(p.user?._id || p.user) !== String(exceptId))
  .map(p => String(p.user?._id || p.user));

function subscribe() {
  bus.on('thread.created', async ({ thread, actor, candidateIds = [] }) => {
    try {
      // Participants other than the creator (direct/internal with explicit assignee)
      await notifyMany(participantIds(thread, actor._id), (id, role) => ({
        title: thread.kind === 'direct' ? 'New message' : 'New request',
        message: `${actor.username} started: ${thread.subject}`,
        type: 'new_conversation',
        link: linkFor(role, thread._id),
        entityType: 'thread',
        entityId: thread._id,
        actorId: actor._id,
      }));

      // Routing candidates for queued tickets
      const queued = candidateIds.filter(id => String(id) !== String(actor._id) && !participantIds(thread).includes(String(id)));
      await notifyMany(queued, (id, role) => ({
        title: thread.kind === 'internal' ? 'New internal request' : 'New support ticket',
        message: `${actor.username}: ${thread.subject}`,
        type: 'new_conversation',
        link: linkFor(role, thread._id),
        entityType: 'thread',
        entityId: thread._id,
        actorId: actor._id,
      }));
    } catch (err) {
      console.error('[notifications] thread.created failed:', err.message);  
    }
  });

  bus.on('message.created', async ({ thread, message, actor }) => {
    try {
      if (message.kind === 'system') return;
      let recipients = participantIds(thread, actor._id);
      if (message.kind === 'note') {
        const roles = await rolesFor(recipients);
        recipients = recipients.filter(id => ['admin', 'educator'].includes(roles.get(id)));
      }
      const roles = await rolesFor(recipients);

      await Promise.all(recipients.map(async (id) => {
        const role = roles.get(id) || 'student';
        const existing = await Notification.findOne({
          userId: id, entityId: thread._id, type: 'new_message', read: false,
          createdAt: { $gte: new Date(Date.now() - DIGEST_WINDOW_MS) },
        });
        if (existing) {
          existing.message = `${actor.username} sent new messages in: ${thread.subject}`;
          existing.createdAt = new Date();
          await existing.save();
          return;
        }
        await notify({
          userId: id,
          title: message.kind === 'note' ? 'New internal note' : 'New message',
          message: `${actor.username} in: ${thread.subject}`,
          type: 'new_message',
          link: linkFor(role, thread._id),
          entityType: 'thread',
          entityId: thread._id,
          actorId: actor._id,
        });
      }));
    } catch (err) {
      console.error('[notifications] message.created failed:', err.message);  
    }
  });

  bus.on('thread.updated', async ({ thread, actor, changes }) => {
    try {
      if (changes.assignee && String(changes.assignee) !== String(actor._id)) {
        const roles = await rolesFor([changes.assignee]);
        await notify({
          userId: changes.assignee,
          title: 'Thread assigned to you',
          message: `${actor.username} assigned: ${thread.subject}`,
          type: 'thread_assigned',
          link: linkFor(roles.get(String(changes.assignee)) || 'admin', thread._id),
          entityType: 'thread', entityId: thread._id, actorId: actor._id,
        });
      }
      if (changes.status) {
        const requesterId = String(thread.requester?._id || thread.requester);
        if (requesterId !== String(actor._id)) {
          const roles = await rolesFor([requesterId]);
          await notify({
            userId: requesterId,
            title: changes.status === 'resolved' ? 'Your request was resolved' : `Status: ${changes.status.replace('_', ' ')}`,
            message: thread.subject,
            type: 'thread_status',
            link: linkFor(roles.get(requesterId) || 'student', thread._id),
            entityType: 'thread', entityId: thread._id, actorId: actor._id,
          });
        }
      }
    } catch (err) {
      console.error('[notifications] thread.updated failed:', err.message);  
    }
  });

  bus.on('thread.escalated', async ({ thread, child, actor }) => {
    try {
      const requesterId = String(thread.requester?._id || thread.requester);
      if (child.kind === 'support' && requesterId !== String(actor._id)) {
        const roles = await rolesFor([requesterId]);
        await notify({
          userId: requesterId,
          title: 'Your request was escalated',
          message: `${actor.username} escalated "${thread.subject}" for specialist review`,
          type: 'thread_escalated',
          link: linkFor(roles.get(requesterId) || 'student', child._id),
          entityType: 'thread', entityId: child._id, actorId: actor._id,
        });
      }
    } catch (err) {
      console.error('[notifications] thread.escalated failed:', err.message);  
    }
  });

  bus.on('thread.sla_breached', async ({ thread }) => {
    try {
      const admins = await User.find({ role: 'admin', status: 'active' }).select('_id');
      await Promise.all(admins.map(a => notify({
        userId: a._id,
        title: 'SLA breached',
        message: `No first response yet: ${thread.subject}`,
        type: 'sla_breach',
        link: linkFor('admin', thread._id),
        entityType: 'thread', entityId: thread._id,
      })));
    } catch (err) {
      console.error('[notifications] sla_breached failed:', err.message);  
    }
  });
}

module.exports = { subscribe, linkFor };
