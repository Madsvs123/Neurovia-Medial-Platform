const asyncHandler = require('express-async-handler');
const APIResponse = require('../../../utils/apiResponse');
const threadService = require('../services/threadService');
const messageService = require('../services/messageService');
const assignmentService = require('../services/assignmentService');
const templateService = require('../services/templateService');
const statsService = require('../services/statsService');

/**
 * Controllers are deliberately thin: validation happened in the validators,
 * authorization + rules live in the services. Errors carry `statusCode` and
 * are rendered by errorMiddleware.
 */
const ok = (res, data) => APIResponse.success(res, data);
const created = (res, data) => APIResponse.created(res, data);

// ─── Threads ─────────────────────────────────────────────────────────
const list = asyncHandler(async (req, res) => ok(res, await threadService.listThreads(req.user, req.query)));
const counts = asyncHandler(async (req, res) => ok(res, await threadService.counts(req.user)));
const config = asyncHandler(async (req, res) => ok(res, threadService.config(req.user)));
const recipients = asyncHandler(async (req, res) => ok(res, await threadService.recipients(req.user, req.query)));
const stats = asyncHandler(async (req, res) => ok(res, await statsService.overview(req.user)));

const create = asyncHandler(async (req, res) => created(res, await threadService.createThread(req.user, req.body)));
const get = asyncHandler(async (req, res) => ok(res, await threadService.getThread(req.user, req.params.id)));
const update = asyncHandler(async (req, res) => ok(res, await threadService.updateThread(req.user, req.params.id, req.body)));
const markRead = asyncHandler(async (req, res) => ok(res, await threadService.markRead(req.user, req.params.id)));
const archive = asyncHandler(async (req, res) => ok(res, await threadService.setArchived(req.user, req.params.id, true)));
const unarchive = asyncHandler(async (req, res) => ok(res, await threadService.setArchived(req.user, req.params.id, false)));
const remove = asyncHandler(async (req, res) => ok(res, await threadService.deleteThread(req.user, req.params.id, { hard: req.query.hard === 'true' })));

const claim = asyncHandler(async (req, res) => ok(res, await assignmentService.claim(req.user, req.params.id)));
const join = asyncHandler(async (req, res) => ok(res, await assignmentService.join(req.user, req.params.id)));
const assign = asyncHandler(async (req, res) => ok(res, await assignmentService.assign(req.user, req.params.id, req.body)));
const unassign = asyncHandler(async (req, res) => ok(res, await assignmentService.unassign(req.user, req.params.id)));
const escalate = asyncHandler(async (req, res) => created(res, await assignmentService.escalate(req.user, req.params.id, req.body)));

const addParticipant = asyncHandler(async (req, res) => ok(res, await threadService.addParticipant(req.user, req.params.id, req.body)));
const removeParticipant = asyncHandler(async (req, res) => ok(res, await threadService.removeParticipant(req.user, req.params.id, req.params.userId)));

// ─── Messages ────────────────────────────────────────────────────────
const listMessages = asyncHandler(async (req, res) => ok(res, await messageService.listMessages(req.user, req.params.id, req.query)));
const sendMessage = asyncHandler(async (req, res) => created(res, await messageService.sendMessage(req.user, req.params.id, req.body)));
const editMessage = asyncHandler(async (req, res) => ok(res, await messageService.editMessage(req.user, req.params.id, req.params.mid, req.body)));
const deleteMessage = asyncHandler(async (req, res) => ok(res, await messageService.deleteMessage(req.user, req.params.id, req.params.mid)));

// ─── Templates ───────────────────────────────────────────────────────
const listTemplates = asyncHandler(async (req, res) => ok(res, await templateService.listForUser(req.user)));
const listAllTemplates = asyncHandler(async (req, res) => ok(res, await templateService.listAll(req.user)));
const createTemplate = asyncHandler(async (req, res) => created(res, await templateService.create(req.user, req.body)));
const updateTemplate = asyncHandler(async (req, res) => ok(res, await templateService.update(req.user, req.params.id, req.body)));
const deleteTemplate = asyncHandler(async (req, res) => ok(res, await templateService.remove(req.user, req.params.id)));

module.exports = {
  list, counts, config, recipients, stats,
  create, get, update, markRead, archive, unarchive, remove,
  claim, join, assign, unassign, escalate,
  addParticipant, removeParticipant,
  listMessages, sendMessage, editMessage, deleteMessage,
  listTemplates, listAllTemplates, createTemplate, updateTemplate, deleteTemplate,
};
