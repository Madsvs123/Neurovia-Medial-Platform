const ReplyTemplate = require('../models/ReplyTemplate');
const MessagingSettings = require('../models/MessagingSettings');
const routing = require('./routingService');
const policy = require('./threadPolicy');
const { DEFAULT_ROUTING, DEFAULT_SLA, TEAMS, STAFF_ROLES, THREAD_KINDS, CATEGORIES } = require('../config');
const { badRequest, forbidden, notFound } = require('../errors');

/* ---------------- Reply templates ---------------- */

const DEFAULT_TEMPLATES = [
  { category: 'Greeting', title: 'Welcome', body: 'Hello! Thank you for reaching out to Neurovia support. How can I help you with your learning today?', roles: ['admin', 'educator'] },
  { category: 'Course Access', title: 'Access restored', body: "I've checked your enrollment and restored access to the course. Please refresh the page and try opening the lesson again.", roles: ['admin', 'educator'] },
  { category: 'Course Access', title: 'Where to find courses', body: 'You can find all your enrolled courses under "My Programs" in your dashboard. Let me know if a specific course is still missing.', roles: ['admin', 'educator'] },
  { category: 'Subscription & Billing', title: 'Subscription status', body: 'Your subscription is active and renews automatically. You can manage or cancel it anytime from the Subscription page in your account.', roles: ['admin'] },
  { category: 'Subscription & Billing', title: 'Refund issued', body: "I've reviewed the payment on your account and issued a refund. Please allow 3–5 business days for it to appear on your statement.", roles: ['admin'] },
  { category: 'Technical Issue', title: 'Ask for details', body: "Sorry you're running into this. Could you tell me which browser and device you're using, and share a screenshot of the error if possible?", roles: ['admin', 'educator'] },
  { category: 'Technical Issue', title: 'First steps', body: 'As a first step, please try logging out and back in, or clearing your browser cache. Let me know if the problem persists after that.', roles: ['admin', 'educator'] },
  { category: 'Clinical Content', title: 'Forwarded for review', body: "Thank you for flagging this clinical content. I've forwarded it to our medical review team, who will verify it against the latest guidelines.", roles: ['admin', 'educator'] },
  { category: 'Clinical Content', title: 'Good question', body: "That's a great clinical question. Our content is based on standard references — I'll clarify this section for you.", roles: ['educator', 'admin'] },
  { category: 'Follow-up', title: 'Checking in', body: "Just checking in — were you able to try the steps I suggested? I'm happy to keep helping until this is sorted.", roles: ['admin', 'educator'] },
  { category: 'Closing', title: 'Anything else?', body: "Is there anything else I can help you with? If not, I'll mark this conversation as resolved.", roles: ['admin', 'educator'] },
  { category: 'Closing', title: 'Glad to help', body: 'Glad I could help! Good luck with your studies, and feel free to reach out anytime.', roles: ['admin', 'educator'] },
];

async function listTemplates(user, { all = false } = {}) {
  if (!policy.isStaff(user)) throw forbidden('Staff only');
  const filter = all && policy.isAdmin(user) ? {} : { active: true, roles: user.role };
  const docs = await ReplyTemplate.find(filter).sort({ category: 1, order: 1, createdAt: 1 });
  if (docs.length === 0 && !all) {
    // Nothing configured yet: serve the built-ins (read-only) so the UI isn't empty.
    return DEFAULT_TEMPLATES.filter((t) => t.roles.includes(user.role)).map((t, i) => ({ ...t, _id: `builtin-${i}`, builtin: true }));
  }
  return docs;
}

async function seedTemplates(user) {
  if (!policy.isAdmin(user)) throw forbidden('Admins only');
  const count = await ReplyTemplate.countDocuments();
  if (count > 0) return { inserted: 0 };
  const docs = await ReplyTemplate.insertMany(DEFAULT_TEMPLATES.map((t, i) => ({ ...t, order: i, createdBy: user._id })));
  return { inserted: docs.length };
}

async function createTemplate(user, data) {
  if (!policy.isAdmin(user)) throw forbidden('Admins only');
  const roles = (data.roles || ['admin', 'educator']).filter((r) => STAFF_ROLES.includes(r));
  if (!roles.length) throw badRequest('At least one role is required');
  return ReplyTemplate.create({ ...data, roles, createdBy: user._id });
}

async function updateTemplate(user, id, data) {
  if (!policy.isAdmin(user)) throw forbidden('Admins only');
  const doc = await ReplyTemplate.findById(id);
  if (!doc) throw notFound('Template not found');
  ['category', 'title', 'body', 'order', 'active'].forEach((k) => { if (data[k] !== undefined) doc[k] = data[k]; });
  if (data.roles) doc.roles = data.roles.filter((r) => STAFF_ROLES.includes(r));
  await doc.save();
  return doc;
}

async function deleteTemplate(user, id) {
  if (!policy.isAdmin(user)) throw forbidden('Admins only');
  const doc = await ReplyTemplate.findByIdAndDelete(id);
  if (!doc) throw notFound('Template not found');
  return { deleted: true };
}

/* ---------------- Settings (routing + SLA) ---------------- */

async function getSettings(user) {
  if (!policy.isAdmin(user)) throw forbidden('Admins only');
  const { routing: rules, sla } = await routing.getSettings(true);
  return { routing: rules, sla, defaults: { routing: DEFAULT_ROUTING, sla: DEFAULT_SLA }, teams: TEAMS, kinds: THREAD_KINDS, categories: CATEGORIES };
}

function validateRouting(rules) {
  if (!rules || typeof rules !== 'object') throw badRequest('routing must be an object');
  Object.entries(rules).forEach(([kind, byCat]) => {
    if (!['support', 'internal'].includes(kind)) throw badRequest(`Unknown kind "${kind}" in routing`);
    Object.entries(byCat).forEach(([cat, rule]) => {
      if (cat !== '*' && !CATEGORIES.includes(cat)) throw badRequest(`Unknown category "${cat}"`);
      if (!TEAMS.includes(rule.team)) throw badRequest(`Unknown team "${rule.team}" for ${kind}/${cat}`);
      if (!Array.isArray(rule.roles) || !rule.roles.length || rule.roles.some((r) => !STAFF_ROLES.includes(r))) {
        throw badRequest(`Invalid roles for ${kind}/${cat}`);
      }
    });
  });
}

async function updateSettings(user, { routing: rules, sla }) {
  if (!policy.isAdmin(user)) throw forbidden('Admins only');
  const doc = await MessagingSettings.getSingleton();
  if (rules) { validateRouting(rules); doc.routing = rules; }
  if (sla) {
    const hrs = sla.firstResponseHours || {};
    Object.entries(hrs).forEach(([p, h]) => { if (typeof h !== 'number' || h <= 0) throw badRequest(`Invalid SLA for ${p}`); });
    doc.sla = { ...DEFAULT_SLA, ...sla };
  }
  doc.updatedBy = user._id;
  doc.markModified('routing');
  doc.markModified('sla');
  await doc.save();
  routing.invalidateCache();
  return getSettings(user);
}

module.exports = {
  DEFAULT_TEMPLATES, listTemplates, seedTemplates, createTemplate, updateTemplate, deleteTemplate,
  getSettings, updateSettings,
};
