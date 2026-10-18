/**
 * Single source of truth for the support / conversation role rules.
 *
 *  - Admins are the support team: they see every ticket, every category, and
 *    can view/join/moderate any conversation.
 *  - Educators handle learning-related tickets (general / clinical / other)
 *    raised by students enrolled in programs they own or are assigned to.
 *    Billing, technical and generic "support" tickets are admin-only.
 *  - Students only ever see conversations they participate in.
 */
const mongoose = require('mongoose');
const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');

const STAFF_ROLES = ['admin', 'educator'];

/** Categories an educator is allowed to pick up from the queue / be notified about. */
const EDUCATOR_CATEGORIES = ['general', 'clinical', 'other'];

/** Categories reserved for the admin support team. */
const ADMIN_ONLY_CATEGORIES = ['support', 'technical', 'billing'];

const isAdmin = (user) => !!user && user.role === 'admin';
const isEducator = (user) => !!user && user.role === 'educator';
const isStaff = (user) => !!user && STAFF_ROLES.includes(user.role);

/** Role stored on Message.senderRole */
const senderRole = (user) => (isAdmin(user) ? 'admin' : isEducator(user) ? 'educator' : 'student');

/** Can this role work tickets of this category? */
const canHandleCategory = (role, category) => {
  if (role === 'admin') return true;
  if (role === 'educator') return EDUCATOR_CATEGORIES.includes(category || 'general');
  return false;
};

/** Frontend route to a conversation, per portal. */
const conversationLink = (role, conversationId) => {
  const id = String(conversationId);
  if (role === 'admin') return `/admin/conversations/${id}`;
  if (role === 'educator') return `/educator/conversations/${id}`;
  return `/conversations/${id}`;
};

/** Display name for a user document (User has `username`, not `name`). */
const displayName = (user) =>
  (user && (user.name || user.username || user.email)) || 'A user';

/** Program ids the educator owns or is assigned to. */
const getEducatorProgramIds = async (educatorId) => {
  const eid = new mongoose.Types.ObjectId(String(educatorId));
  return Program.find({ $or: [{ owner: eid }, { educators: eid }] }).distinct('_id');
};

/** Student ids enrolled in any of the educator's programs. */
const getEducatorStudentIds = async (educatorId) => {
  const programIds = await getEducatorProgramIds(educatorId);
  if (programIds.length === 0) return [];
  return ProgramEnrollment.find({ programId: { $in: programIds } }).distinct('userId');
};

/** Is `studentId` one of this educator's students? */
const isEducatorsStudent = async (educatorId, studentId) => {
  const ids = await getEducatorStudentIds(educatorId);
  const target = String(studentId);
  return ids.some(id => String(id) === target);
};

/** Educator ids whose programs include `studentId` (used to fan-out notifications). */
const getEducatorsForStudent = async (studentId) => {
  const programIds = await ProgramEnrollment.find({ userId: studentId }).distinct('programId');
  if (programIds.length === 0) return [];
  const programs = await Program.find({ _id: { $in: programIds } }).select('owner ownerType educators');
  const set = new Set();
  programs.forEach(p => {
    if (p.ownerType === 'educator' && p.owner) set.add(String(p.owner));
    (p.educators || []).forEach(e => set.add(String(e)));
  });
  return Array.from(set);
};

module.exports = {
  STAFF_ROLES,
  EDUCATOR_CATEGORIES,
  ADMIN_ONLY_CATEGORIES,
  isAdmin,
  isEducator,
  isStaff,
  senderRole,
  canHandleCategory,
  conversationLink,
  displayName,
  getEducatorProgramIds,
  getEducatorStudentIds,
  isEducatorsStudent,
  getEducatorsForStudent,
};
