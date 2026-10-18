const Thread = require('../models/Thread');
const routing = require('../services/routingService');
const messageService = require('../services/messageService');
const events = require('../services/messagingEvents');
const { AUTO_CLOSE_RESOLVED_AFTER_DAYS } = require('../config');

/**
 * Periodic housekeeping (no external scheduler dependency — a plain
 * interval, safe to run on every instance because each step is idempotent):
 *
 *  1. SLA: tickets with no first response older than their target get
 *     `slaBreachedAt` set, priority bumped to `high` (if lower) and an event
 *     for the notifications module.
 *  2. Auto-close: `resolved` tickets untouched for N days → `closed`.
 */
async function checkSlaBreaches(now = new Date()) {
  const { sla } = await routing.getSettings();
  const hours = sla.firstResponseHours || {};
  let flagged = 0;
  for (const [priority, h] of Object.entries(hours)) {
    const cutoff = new Date(now.getTime() - h * 3600 * 1000);
     
    const breached = await Thread.find({
      kind: 'support',
      status: { $in: ['new', 'open'] },
      firstResponseAt: null,
      slaBreachedAt: null,
      priority,
      createdAt: { $lte: cutoff },
    });
    for (const t of breached) {
      t.slaBreachedAt = now;
      if (['low', 'normal'].includes(t.priority)) t.priority = 'high';
       
      await messageService.systemMessage(t, 'First-response SLA breached', { event: 'sla.breached' });
       
      await t.save();
      events.emit('thread.sla.breached', { thread: t });
      flagged += 1;
    }
  }
  return flagged;
}

async function autoCloseResolved(now = new Date()) {
  const cutoff = new Date(now.getTime() - AUTO_CLOSE_RESOLVED_AFTER_DAYS * 24 * 3600 * 1000);
  const stale = await Thread.find({ kind: { $in: ['support', 'internal'] }, status: 'resolved', resolvedAt: { $lte: cutoff } });
  for (const t of stale) {
    messageService.applyStatus(t, 'closed', now);
     
    await messageService.systemMessage(t, `Automatically closed after ${AUTO_CLOSE_RESOLVED_AFTER_DAYS} days without activity`, { event: 'status', from: 'resolved', to: 'closed', auto: true });
     
    await t.save();
    events.emit('thread.updated', { thread: t, actor: null, changes: { status: 'closed' } });
  }
  return stale.length;
}

async function runOnce() {
  try {
    const [breaches, closed] = await Promise.all([checkSlaBreaches(), autoCloseResolved()]);
    return { breaches, closed };
  } catch (err) {
     
    console.error('[messaging/slaJob] failed:', err.message);
    return null;
  }
}

let timer = null;
function start({ intervalMs = 5 * 60 * 1000 } = {}) {
  if (timer) return timer;
  timer = setInterval(runOnce, intervalMs);
  if (timer.unref) timer.unref(); // never keep the process alive just for this
  return timer;
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { checkSlaBreaches, autoCloseResolved, runOnce, start, stop };
