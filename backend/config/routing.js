/**
 * Messaging routing rules — data, not code.
 *
 * Every "who handles what" question (queue visibility, who gets notified when
 * a ticket is opened, who may claim it, SLA targets) is answered from this
 * single table via `routingService`. Nothing else in the codebase branches on
 * category names.
 *
 * Decisions encoded here:
 *  - billing / technical / general support are handled by admins.
 *  - clinical questions go to educators first (the educators of the program
 *    the thread is about, when known), admins can also see/claim them.
 *  - internal (educator → admin) requests go to the admin support team.
 */
module.exports = {
  teams: {
    support:   { label: 'Support',   roles: ['admin'] },
    billing:   { label: 'Billing',   roles: ['admin'] },
    technical: { label: 'Technical', roles: ['admin'] },
    clinical:  { label: 'Clinical',  roles: ['educator', 'admin'], preferEducatorsOf: 'programId' },
  },

  // category → team
  categories: {
    general:   'support',
    support:   'support',
    billing:   'billing',
    technical: 'technical',
    clinical:  'clinical',
    other:     'support',
  },

  internal: { team: 'support' },

  sla: {
    // hours until first staff response, by priority
    firstResponseHours: { urgent: 2, high: 8, normal: 24, low: 72 },
  },

  // resolved threads auto-close after this many days with no activity
  autoCloseResolvedAfterDays: 14,
  // a requester can reopen a resolved/closed thread by replying within this window
  reopenWindowDays: 14,
};
