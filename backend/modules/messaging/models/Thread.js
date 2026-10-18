const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * A Thread is the single unit of conversation for the whole platform.
 *
 *  kind = 'support'  — a student asking the platform for help. Routed to a
 *                      team, sits in a queue until a staff member claims it,
 *                      has a status lifecycle and SLA.
 *  kind = 'direct'   — peer messaging (educator ↔ student in a shared program,
 *                      admin ↔ anyone). No queue, no assignment, no status UI.
 *  kind = 'internal' — staff-only (educator → admin escalation / request).
 *                      Students can never see these.
 *
 * Per-participant state (role, lastReadAt, archive/delete) lives on the
 * participant sub-document instead of on messages, so unread counts and
 * "hide for me" work correctly for any number of parties.
 */
const participantSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['requester', 'assignee', 'collaborator', 'observer'], required: true },
  joinedAt: { type: Date, default: Date.now },
  lastReadAt: { type: Date, default: null },
  archivedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
}, { _id: false });

const threadSchema = new Schema({
  kind: { type: String, enum: ['support', 'direct', 'internal'], required: true, index: true },
  subject: { type: String, required: true, trim: true, maxlength: 200 },
  category: {
    type: String,
    enum: ['general', 'support', 'clinical', 'technical', 'billing', 'other'],
    default: 'general',
  },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  status: {
    type: String,
    enum: ['new', 'open', 'waiting_requester', 'resolved', 'closed'],
    default: 'new',
    index: true,
  },

  requester: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  assignee: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  team: { type: String, enum: ['support', 'billing', 'technical', 'clinical', null], default: null, index: true },

  context: {
    programId: { type: Schema.Types.ObjectId, ref: 'Program', default: null },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', default: null },
    clinicalCaseId: { type: Schema.Types.ObjectId, ref: 'ClinicalCase', default: null },
  },

  participants: { type: [participantSchema], default: [] },

  lastMessage: {
    text: { type: String, default: '' },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, default: Date.now },
  },
  lastActivityAt: { type: Date, default: Date.now, index: true },
  messageCount: { type: Number, default: 0 },

  firstResponseAt: { type: Date, default: null },
  slaBreachedAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
  closedAt: { type: Date, default: null },

  parentThread: { type: Schema.Types.ObjectId, ref: 'Thread', default: null },
}, { timestamps: true });

threadSchema.index({ 'participants.user': 1, lastActivityAt: -1 });
threadSchema.index({ kind: 1, team: 1, status: 1, assignee: 1 });
threadSchema.index({ subject: 'text', 'lastMessage.text': 'text' });

threadSchema.methods.participantFor = function participantFor(userId) {
  const id = String(userId);
  return this.participants.find(p => String(p.user?._id || p.user) === id) || null;
};

threadSchema.methods.isParticipant = function isParticipant(userId) {
  return !!this.participantFor(userId);
};

module.exports = mongoose.model('Thread', threadSchema);
