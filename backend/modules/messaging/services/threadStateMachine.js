/**
 * The one place that knows how a thread's status may change.
 *
 * Used by the API (to guard PATCH /status and to derive the status implied
 * by a new message) and shipped to the clients via GET /messaging/config so
 * the three UIs render exactly the buttons the server will accept.
 *
 *   new ──(staff claims/replies)──▶ open ──(staff replies)──▶ waiting_requester
 *    ▲                               ▲  ◀──(requester replies)──┘
 *    │                               │
 *    └──(requester replies in window)── resolved ──(auto / manual)──▶ closed
 *                                    └──(staff marks)──────────▲
 *
 * `direct` threads only ever sit in `open` (archiving is per participant).
 */
const STATUSES = ['new', 'open', 'waiting_requester', 'resolved', 'closed'];

const STAFF = ['admin', 'educator'];

// kind → from → to → roles allowed to make that explicit transition
const TRANSITIONS = {
  support: {
    new:               { open: STAFF, resolved: STAFF, closed: ['admin'] },
    open:              { waiting_requester: STAFF, resolved: [...STAFF, 'requester'], closed: ['admin'] },
    waiting_requester: { open: STAFF, resolved: [...STAFF, 'requester'], closed: ['admin'] },
    resolved:          { open: [...STAFF, 'requester'], closed: STAFF },
    closed:            { open: STAFF },
  },
  internal: {
    new:               { open: ['admin'], resolved: ['admin'], closed: ['admin'] },
    open:              { waiting_requester: ['admin'], resolved: ['admin', 'requester'], closed: ['admin'] },
    waiting_requester: { open: ['admin'], resolved: ['admin', 'requester'], closed: ['admin'] },
    resolved:          { open: ['admin', 'requester'], closed: ['admin'] },
    closed:            { open: ['admin'] },
  },
  direct: {
    open: {},
  },
};

/**
 * @param {'support'|'direct'|'internal'} kind
 * @param {string} from
 * @param {string} to
 * @param {{ role: string, isRequester: boolean }} actor
 */
function canTransition(kind, from, to, actor) {
  if (from === to) return false;
  const allowedRoles = TRANSITIONS[kind]?.[from]?.[to];
  if (!allowedRoles) return false;
  if (allowedRoles.includes(actor.role)) return true;
  return actor.isRequester && allowedRoles.includes('requester');
}

/** All statuses the actor may move the thread to from its current status. */
function availableTransitions(kind, from, actor) {
  return Object.keys(TRANSITIONS[kind]?.[from] || {}).filter(to => canTransition(kind, from, to, actor));
}

/**
 * Status implied by a new message (no explicit status change requested).
 * Returns the same status when nothing should change.
 */
function statusAfterMessage(kind, status, { senderIsStaff, senderIsRequester, withinReopenWindow }) {
  if (kind === 'direct') return 'open';

  if (senderIsStaff) {
    if (status === 'new' || status === 'open') return 'waiting_requester';
    return status; // staff replying to resolved/closed keeps it that way (they can reopen explicitly)
  }

  if (senderIsRequester) {
    if (status === 'waiting_requester' || status === 'new') return status === 'new' ? 'new' : 'open';
    if ((status === 'resolved' || status === 'closed') && withinReopenWindow) return 'open';
    return status;
  }

  return status;
}

function initialStatus(kind) {
  return kind === 'direct' ? 'open' : 'new';
}

function isTerminal(status) {
  return status === 'resolved' || status === 'closed';
}

module.exports = {
  STATUSES,
  TRANSITIONS,
  canTransition,
  availableTransitions,
  statusAfterMessage,
  initialStatus,
  isTerminal,
};
