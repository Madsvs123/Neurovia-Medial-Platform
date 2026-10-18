const ThreadMessage = require('../models/ThreadMessage');

/**
 * System messages are the audit trail of a thread: every join, assignment,
 * status change and escalation is recorded inline so all parties see the
 * same history.
 *
 * `meta.event` values: joined, left, claimed, assigned, unassigned, status,
 * priority, escalated, reopened, participant_added, participant_removed
 */
async function addSystemMessage(thread, event, meta = {}, actor = null) {
  const message = await ThreadMessage.create({
    thread: thread._id,
    sender: actor ? actor._id : null,
    kind: 'system',
    body: '',
    meta: { event, ...meta, actorName: actor?.username || null },
  });
  thread.messageCount = (thread.messageCount || 0) + 1;
  thread.lastActivityAt = new Date();
  return message;
}

module.exports = { addSystemMessage };
