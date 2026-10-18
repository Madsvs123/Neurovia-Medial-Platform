const ReplyTemplate = require('../models/ReplyTemplate');
const policy = require('./threadPolicy');
const { httpError } = require('./errors');

const DEFAULT_TEMPLATES = [
  { category: 'Greeting', title: 'Welcome', audience: ['admin', 'educator'], body: 'Hello! Thank you for reaching out to Neurovia support. How can I help you today?' },
  { category: 'Course Access', title: 'Access restored', audience: ['admin', 'educator'], body: "I've checked your enrollment and restored access to the course. Please refresh the page and try opening the lesson again." },
  { category: 'Course Access', title: 'Where to find courses', audience: ['admin', 'educator'], body: 'You can find all your enrolled courses under "My Programs" in your dashboard. Let me know if a specific course is still missing.' },
  { category: 'Subscription & Billing', title: 'Subscription status', audience: ['admin'], body: 'Your subscription is active and renews automatically. You can manage or cancel it anytime from the Subscription page in your account.' },
  { category: 'Subscription & Billing', title: 'Refund issued', audience: ['admin'], body: "I've reviewed the payment on your account and issued a refund. Please allow 3–5 business days for it to appear on your statement." },
  { category: 'Technical Issue', title: 'Ask for details', audience: ['admin', 'educator'], body: "Sorry you're running into this. Could you tell me which browser and device you're using, and share a screenshot of the error if possible?" },
  { category: 'Technical Issue', title: 'First steps', audience: ['admin', 'educator'], body: 'As a first step, please try logging out and back in, or clearing your browser cache. Let me know if the problem persists after that.' },
  { category: 'Clinical Content', title: 'Forwarded to review', audience: ['admin', 'educator'], body: "Thank you for flagging this clinical content. I've forwarded it to our medical review team, who will verify it against the latest guidelines." },
  { category: 'Clinical Content', title: 'Great question', audience: ['educator'], body: "That's a great clinical question. Our content is based on standard references — I'll clarify this section for you." },
  { category: 'Follow-up', title: 'Checking in', audience: ['admin', 'educator'], body: "Just checking in — were you able to try the steps I suggested? I'm happy to keep helping until this is sorted." },
  { category: 'Closing', title: 'Anything else?', audience: ['admin', 'educator'], body: "Is there anything else I can help you with? If not, I'll mark this conversation as resolved." },
  { category: 'Closing', title: 'Glad to help', audience: ['admin', 'educator'], body: 'Glad I could help! Good luck with your studies, and feel free to reach out anytime.' },
];

async function seedIfEmpty() {
  const count = await ReplyTemplate.estimatedDocumentCount();
  if (count > 0) return;
  await ReplyTemplate.insertMany(DEFAULT_TEMPLATES.map((t, i) => ({ ...t, order: i })));
}

/** Templates the caller may use — filtered by audience. */
async function listForUser(user) {
  if (!policy.isStaff(user)) throw httpError(403, 'Not allowed');
  await seedIfEmpty();
  return ReplyTemplate.find({ active: true, audience: user.role }).sort({ order: 1, createdAt: 1 });
}

/** Admin management view: everything, including inactive. */
async function listAll(user) {
  if (!policy.isAdmin(user)) throw httpError(403, 'Not allowed');
  await seedIfEmpty();
  return ReplyTemplate.find({}).sort({ order: 1, createdAt: 1 });
}

async function create(user, data) {
  if (!policy.isAdmin(user)) throw httpError(403, 'Not allowed');
  return ReplyTemplate.create({ ...pick(data), createdBy: user._id });
}

async function update(user, id, data) {
  if (!policy.isAdmin(user)) throw httpError(403, 'Not allowed');
  const tpl = await ReplyTemplate.findByIdAndUpdate(id, pick(data), { new: true, runValidators: true });
  if (!tpl) throw httpError(404, 'Template not found');
  return tpl;
}

async function remove(user, id) {
  if (!policy.isAdmin(user)) throw httpError(403, 'Not allowed');
  const tpl = await ReplyTemplate.findByIdAndDelete(id);
  if (!tpl) throw httpError(404, 'Template not found');
  return { deleted: true };
}

function pick(data) {
  const out = {};
  ['title', 'body', 'category', 'audience', 'order', 'active'].forEach(k => {
    if (data[k] !== undefined) out[k] = data[k];
  });
  return out;
}

module.exports = { DEFAULT_TEMPLATES, seedIfEmpty, listForUser, listAll, create, update, remove };
