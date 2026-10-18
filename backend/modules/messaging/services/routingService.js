const routing = require('../../../config/routing');
const User = require('../../../models/User');
const Program = require('../../../models/Program');

/**
 * Answers every "who handles this?" question from config/routing.js.
 */

/** Team a new thread belongs to, from its kind + category. */
function teamFor({ kind, category }) {
  if (kind === 'direct') return null;
  if (kind === 'internal') return routing.internal.team;
  return routing.categories[category] || routing.categories.general;
}

/** Roles allowed to work a given team's queue. */
function rolesForTeam(team) {
  return routing.teams[team]?.roles || ['admin'];
}

/** Teams whose queue this user may see/claim from. */
function teamsFor(user) {
  return Object.entries(routing.teams)
    .filter(([, cfg]) => cfg.roles.includes(user.role))
    .map(([name]) => name);
}

function canWorkTeam(user, team) {
  return !!team && rolesForTeam(team).includes(user.role);
}

/**
 * Users who should be notified / may claim a freshly created thread.
 * For teams with `preferEducatorsOf`, the program's own educators come
 * first (and are the only educators notified); admins are always included
 * for teams that list them.
 */
async function candidateAssignees({ team, context = {} }) {
  const cfg = routing.teams[team];
  if (!cfg) return [];

  const ids = new Set();

  if (cfg.preferEducatorsOf && context[cfg.preferEducatorsOf]) {
    const program = await Program.findById(context[cfg.preferEducatorsOf]).select('owner educators');
    if (program) {
      if (program.owner) ids.add(String(program.owner));
      (program.educators || []).forEach(e => ids.add(String(e)));
    }
  }

  // If the team includes educators but no program context narrowed it down,
  // fall back to all educators so the ticket is still reachable.
  const rolesToBroadcast = cfg.roles.filter(r => {
    if (r === 'educator' && cfg.preferEducatorsOf && ids.size > 0) return false;
    return true;
  });

  if (rolesToBroadcast.length) {
    const users = await User.find({ role: { $in: rolesToBroadcast }, status: 'active' }).select('_id');
    users.forEach(u => ids.add(String(u._id)));
  }

  return Array.from(ids);
}

function slaHoursFor(priority) {
  return routing.sla.firstResponseHours[priority] || routing.sla.firstResponseHours.normal;
}

function publicConfig() {
  return {
    teams: Object.fromEntries(Object.entries(routing.teams).map(([k, v]) => [k, { label: v.label, roles: v.roles }])),
    categories: routing.categories,
    sla: routing.sla,
    reopenWindowDays: routing.reopenWindowDays,
    autoCloseResolvedAfterDays: routing.autoCloseResolvedAfterDays,
  };
}

module.exports = {
  teamFor,
  rolesForTeam,
  teamsFor,
  canWorkTeam,
  candidateAssignees,
  slaHoursFor,
  publicConfig,
  routing,
};
