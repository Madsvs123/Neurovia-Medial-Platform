const Program = require('../../../models/Program');
const ProgramEnrollment = require('../../../models/ProgramEnrollment');
const User = require('../../../models/User');

/**
 * "Who is allowed to talk to whom" is grounded in program membership:
 *  - an educator "teaches" a program they own or are assigned to
 *  - a student "attends" a program they are enrolled in
 *  - two users are related when they share at least one such program
 */

async function programIdsTaughtBy(userId) {
  return Program.find({ $or: [{ owner: userId }, { educators: userId }] }).distinct('_id');
}

async function programIdsAttendedBy(userId) {
  return ProgramEnrollment.find({ userId }).distinct('programId');
}

/** Student ids enrolled in any program the educator teaches. */
async function studentIdsOf(educatorId) {
  const programIds = await programIdsTaughtBy(educatorId);
  if (!programIds.length) return [];
  return ProgramEnrollment.find({ programId: { $in: programIds } }).distinct('userId');
}

/** Educator ids (owner + assigned) of every program the student attends. */
async function educatorIdsOf(studentId) {
  const programIds = await programIdsAttendedBy(studentId);
  if (!programIds.length) return [];
  const programs = await Program.find({ _id: { $in: programIds } }).select('owner educators');
  const ids = new Set();
  programs.forEach(p => {
    if (p.owner) ids.add(String(p.owner));
    (p.educators || []).forEach(e => ids.add(String(e)));
  });
  return Array.from(ids);
}

/** Programs shared between an educator and a student (used to pre-fill thread context). */
async function sharedProgramIds(educatorId, studentId) {
  const taught = (await programIdsTaughtBy(educatorId)).map(String);
  if (!taught.length) return [];
  const attended = (await programIdsAttendedBy(studentId)).map(String);
  return taught.filter(id => attended.includes(id));
}

/**
 * Mongo filter for the recipient directory of a given user.
 * Returns null when the user may not start direct threads with anyone.
 */
async function recipientFilterFor(user) {
  const notMe = { _id: { $ne: user._id }, status: 'active' };

  if (user.role === 'admin') {
    return { ...notMe };
  }

  if (user.role === 'educator') {
    const studentIds = await studentIdsOf(user._id);
    return {
      ...notMe,
      $or: [
        { _id: { $in: studentIds } },
        { role: 'educator' },
      ],
    };
  }

  // student → only educators of programs they attend
  const educatorIds = await educatorIdsOf(user._id);
  if (!educatorIds.length) return { _id: { $in: [] } };
  return { ...notMe, _id: { $in: educatorIds, $ne: user._id }, role: 'educator' };
}

async function canDirectMessage(user, targetUser) {
  if (!targetUser || String(targetUser._id) === String(user._id)) return false;
  const filter = await recipientFilterFor(user);
  if (!filter) return false;
  const match = await User.exists({ ...filter, _id: targetUser._id });
  return !!match;
}

module.exports = {
  programIdsTaughtBy,
  programIdsAttendedBy,
  studentIdsOf,
  educatorIdsOf,
  sharedProgramIds,
  recipientFilterFor,
  canDirectMessage,
};
