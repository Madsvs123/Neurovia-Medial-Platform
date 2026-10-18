const Thread = require('../models/Thread');
const policy = require('./threadPolicy');
const routingService = require('./routingService');
const { httpError } = require('./errors');

/**
 * Admin dashboard numbers: open work by team/status, SLA breaches and
 * first-response timing, all computed from real thread data.
 */
async function overview(user) {
  if (!policy.isAdmin(user)) throw httpError(403, 'Not allowed');

  const since30d = new Date(Date.now() - 30 * 864e5);

  const [byTeam, byStatus, slaBreaches, unassigned, responseTimes, volume] = await Promise.all([
    Thread.aggregate([
      { $match: { kind: { $in: ['support', 'internal'] }, status: { $in: ['new', 'open', 'waiting_requester'] } } },
      { $group: { _id: '$team', count: { $sum: 1 } } },
    ]),
    Thread.aggregate([
      { $match: { kind: { $in: ['support', 'internal'] } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Thread.countDocuments({ slaBreachedAt: { $ne: null }, status: { $in: ['new', 'open'] } }),
    Thread.countDocuments({ kind: { $in: ['support', 'internal'] }, assignee: null, status: { $in: ['new', 'open'] } }),
    Thread.aggregate([
      { $match: { kind: 'support', firstResponseAt: { $ne: null }, createdAt: { $gte: since30d } } },
      { $project: { ms: { $subtract: ['$firstResponseAt', '$createdAt'] } } },
      { $sort: { ms: 1 } },
      { $group: { _id: null, values: { $push: '$ms' }, avg: { $avg: '$ms' } } },
    ]),
    Thread.aggregate([
      { $match: { createdAt: { $gte: since30d } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const rt = responseTimes[0];
  const median = rt && rt.values.length ? rt.values[Math.floor(rt.values.length / 2)] : null;

  const openByTeam = Object.fromEntries(Object.keys(routingService.routing.teams).map(t => [t, 0]));
  byTeam.forEach(r => { openByTeam[r._id || 'none'] = r.count; });

  return {
    openByTeam,
    byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
    slaBreaches,
    unassigned,
    firstResponse: {
      medianMinutes: median != null ? Math.round(median / 60000) : null,
      avgMinutes: rt ? Math.round(rt.avg / 60000) : null,
      sampleSize: rt ? rt.values.length : 0,
    },
    volumeLast30Days: volume.map(v => ({ date: v._id, count: v.count })),
  };
}

module.exports = { overview };
