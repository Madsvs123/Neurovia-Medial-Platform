/**
 * Pure mapping of a legacy `conversations` document (+ its `messages`) to a
 * Thread document (minus `team`, which needs the routing service). Kept
 * separate from the script so it can be unit-tested without a database.
 *
 * @param {object} c       legacy conversation document (raw)
 * @param {object[]} msgs  legacy messages for it, oldest first (raw)
 * @param {Record<string,string|null>} roles  userId -> role
 */
const STATUS_MAP = (c) => {
  switch (c.status) {
    case 'pending-admin': return c.assignedTo ? 'open' : 'new';
    case 'pending-user': return 'waiting_requester';
    case 'in-progress':
    case 'open': return 'open';
    case 'resolved': return 'resolved';
    case 'closed': return 'closed';
    default: return 'new';
  }
};

const CATEGORY_MAP = (c) => {
  const known = ['general', 'billing', 'technical', 'clinical', 'course', 'other'];
  if (c === 'support') return 'general';
  return known.includes(c) ? c : 'general';
};


function mapLegacyConversation(c, msgs, roles) {
  const participantIds = (c.participants || []).map((p) => p.toString());
  if (!participantIds.length) return { error: 'no participants' };

  const creator = c.createdBy ? c.createdBy.toString() : participantIds[0];
  const creatorRole = roles[creator] || null;
  const isStaff = (id) => ['admin', 'educator'].includes(roles[id]);
  const staffIds = participantIds.filter(isStaff);
  const nonStaffIds = participantIds.filter((id) => !isStaff(id));

  let kind;
  if (creatorRole === 'student') kind = 'support';
  else if (isStaff(creator) && nonStaffIds.length === 1 && staffIds.length === 1) kind = 'direct';
  else if (isStaff(creator) && nonStaffIds.length === 0) kind = 'internal';
  else if (isStaff(creator)) kind = 'direct';
  else kind = 'support';

  const assignee = c.assignedTo ? c.assignedTo.toString() : (kind !== 'direct' && staffIds.find((id) => id !== creator)) || null;
  const deletedFor = new Set((c.deletedFor || []).map((d) => d.toString()));

  const participants = participantIds.map((id) => {
    const readByMe = msgs.filter((m) => m.read && m.sender?.toString() !== id).map((m) => m.readAt || m.createdAt);
    const lastReadAt = readByMe.length ? new Date(Math.max(...readByMe.map((d) => new Date(d).getTime()))) : null;
    let role = 'collaborator';
    if (id === creator) role = 'requester';
    else if (assignee && id === assignee) role = 'assignee';
    return { user: id, role, joinedAt: c.createdAt || new Date(), lastReadAt, deletedAt: deletedFor.has(id) ? new Date() : null };
  });
  if (!participants.some((p) => p.role === 'requester')) participants[0].role = 'requester';

  const status = kind === 'direct' ? 'open' : STATUS_MAP(c);
  const firstStaffMsg = msgs.find((m) => ['admin', 'educator'].includes(m.senderRole) && m.sender?.toString() !== creator);

  return {
    warning: creatorRole ? null : 'creator user missing — defaulted by participants',
    thread: {
      kind,
      subject: c.subject || '(no subject)',
      category: CATEGORY_MAP(c.category),
      priority: 'normal',
      status,
      requester: creator,
      assignee: kind === 'direct' ? null : assignee,
      context: {},
      participants,
      lastMessage: { text: c.lastMessage?.text || '', senderId: c.lastMessage?.senderId || null, at: c.lastMessageAt || c.updatedAt || c.createdAt },
      messageCount: msgs.length,
      firstResponseAt: firstStaffMsg ? firstStaffMsg.createdAt : null,
      resolvedAt: c.resolvedAt || null,
      closedAt: c.status === 'closed' ? (c.resolvedAt || c.updatedAt) : null,
      legacyConversationId: c._id,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    },
    messages: msgs.map((m) => ({ sender: m.sender, kind: 'text', body: m.message, createdAt: m.createdAt, updatedAt: m.updatedAt })),
  };
}

module.exports = { mapLegacyConversation, STATUS_MAP, CATEGORY_MAP };
