/**
 * Single source of truth for conversation status & category presentation.
 * Used by all three panels (student / admin / educator).
 * Labels pair with the t() keys in ../conversationText (statusOpen, needsReply, ...).
 */
import { t } from '../conversationText';

export const STATUS_META = {
    open: { label: 'Open', colorScheme: 'gray', tKey: 'statusOpen' },
    'pending-admin': { label: 'Needs Reply', colorScheme: 'orange', tKey: 'needsReply' },
    'in-progress': { label: 'In Progress', colorScheme: 'blue', tKey: 'inProgress' },
    'pending-user': { label: 'Waiting on User', colorScheme: 'purple', tKey: 'waitingOnUser' },
    resolved: { label: 'Resolved', colorScheme: 'green', tKey: 'resolved' },
    closed: { label: 'Closed', colorScheme: 'gray', tKey: 'closed' },
};

export const CATEGORY_LABELS = {
    general: 'General',
    support: 'Support',
    clinical: 'Clinical',
    technical: 'Technical',
    billing: 'Billing',
    other: 'Other',
};

/** Display ordering: most action-required first. */
export const STATUS_ORDER = ['pending-admin', 'open', 'in-progress', 'pending-user', 'resolved', 'closed'];

export const ACTIVE_STATUSES = ['open', 'pending-admin', 'in-progress', 'pending-user'];
export const RESOLVED_STATUSES = ['resolved', 'closed'];

/** Mirrors backend utils/conversationPolicy.js — categories educators may handle. */
export const EDUCATOR_CATEGORIES = ['general', 'clinical', 'other'];
export const STAFF_ROLES = ['admin', 'educator'];

export const isStaffRole = (role) => STAFF_ROLES.includes(role);

/** Route prefix of the portal a role lives in. */
export const conversationBasePath = (role) =>
    role === 'admin' ? '/admin/conversations' : role === 'educator' ? '/educator/conversations' : '/conversations';

/**
 * Why the composer should be disabled for `user` on `conversation`, or null
 * when replying is allowed. Mirrors the backend rules in sendMessage().
 */
export const getReplyBlockReason = (conversation, user) => {
    if (!conversation) return null;
    if (conversation.status === 'closed') return 'closed';
    if (conversation.isParticipant === false) return isStaffRole(user?.role) ? 'join' : 'forbidden';
    return null;
};

export const getStatusMeta = (status) =>
    STATUS_META[status] || { label: status || 'Unknown', colorScheme: 'gray', tKey: null };

/** t()-aware label — falls back to the plain label when no t-key exists. */
export const getStatusLabel = (status) => {
    const meta = getStatusMeta(status);
    return meta.tKey ? t(meta.tKey) : meta.label;
};

export const getCategoryLabel = (category) =>
    CATEGORY_LABELS[category] || CATEGORY_LABELS.general;

export const statusRank = (status) => {
    const idx = STATUS_ORDER.indexOf(status);
    return idx === -1 ? STATUS_ORDER.length : idx;
};

/** Sort by STATUS_ORDER, then by most recent activity within each status. */
export const sortByStatusOrder = (conversations = []) =>
    [...conversations].sort((a, b) =>
        statusRank(a.status) - statusRank(b.status) ||
        new Date(b.lastMessageAt || b.createdAt || 0) - new Date(a.lastMessageAt || a.createdAt || 0)
    );

/**
 * The person on the other side of the conversation from `currentUserId`.
 * Falls back to the first participant that is not the requester
 * (covers queue conversations the staff member has not joined yet).
 * Returns null for solo conversations.
 */
export const getConversationPartner = (conversation, currentUserId) => {
    if (!conversation) return null;
    if (conversation.otherParticipant) return conversation.otherParticipant;
    const myId = currentUserId ? String(currentUserId) : null;
    const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
    const others = participants.filter(p => p && p._id && String(p._id) !== myId);
    return others[0] || null;
};

export const getUserDisplayName = (user) =>
    user?.name || user?.username || user?.email || 'Unknown User';

export const getRoleLabel = (role) => {
    if (!role) return 'User';
    return role.charAt(0).toUpperCase() + role.slice(1);
};

/** True when a message was sent by someone other than `currentUserId`. */
export const isOwnMessage = (msg, currentUserId) => {
    const senderId = msg?.sender?._id || msg?.sender;
    return String(senderId) === String(currentUserId);
};
