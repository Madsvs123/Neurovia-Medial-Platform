const Thread = require('../models/Thread');
const routingService = require('./routingService');
const { addSystemMessage } = require('./systemMessages');
const { safeEmit } = require('./messagingEvents');

/**
 * Periodic housekeeping:
 *  1. Flag support/internal threads with no first staff response past their
 *     SLA (by priority) — bumps priority to `high` once and notifies admins.
 *  2. Auto-close threads that have been `resolved` with no activity for
 *     `autoCloseResolvedAfterDays`.
 */
async function flagSlaBreaches(now = new Date()) {
  const candidates = await Thread.find({
    kind: { $in: ['support', 'internal'] },
    firstResponseAt: null,
    slaBreachedAt: null,
    status: { $in: ['new', 'open'] },
  }).select('priority createdAt subject team requester');

  const breached = [];
  for (const t of candidates) {
    const hours = routingService.slaHoursFor(t.priority);
    if (now.getTime() - t.createdAt.getTime() > hours * 3600e3) {
      t.slaBreachedAt = now;
      if (t.priority === 'low' || t.priority === 'normal') t.priority = 'high';
      await addSystemMessage(t, 'sla_breached', { hours }, null);
      await t.save();
      breached.push(t);
      safeEmit('thread.sla_breached', { thread: t });
    }
  }
  return breached.length;
}

async function autoCloseResolved(now = new Date()) {
  const cutoff = new Date(now.getTime() - routingService.routing.autoCloseResolvedAfterDays * 864e5);
  const stale = await Thread.find({ status: 'resolved', lastActivityAt: { $lt: cutoff } }).select('status');
  for (const t of stale) {
    t.status = 'closed';
    t.closedAt = now;
    await addSystemMessage(t, 'status', { from: 'resolved', to: 'closed', auto: true }, null);
    await t.save();
  }
  return stale.length;
}

async function runOnce() {
  const [breaches, closed] = await Promise.all([flagSlaBreaches(), autoCloseResolved()]);
  return { breaches, closed };
}

let timer = null;
function start(intervalMs = 15 * 60 * 1000) {
  if (timer) return timer;
  timer = setInterval(() => {
    runOnce().catch(err => console.error('[sla] job failed:', err.message));  
  }, intervalMs);
  if (timer.unref) timer.unref();
  return timer;
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { flagSlaBreaches, autoCloseResolved, runOnce, start, stop };
