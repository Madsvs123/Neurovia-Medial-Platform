const { body, param, query, validationResult } = require('express-validator');
const { THREAD_KINDS, THREAD_STATUSES, CATEGORIES, PRIORITIES, TEAMS } = require('../config');

/** Turn express-validator errors into a 400 with a readable message. */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const first = errors.array()[0];
  return res.status(400).json({
    success: false,
    message: `${first.msg}${first.path ? ` (${first.path})` : ''}`,
    errors: errors.array(),
    statusCode: 400,
  });
};

const objectId = (field, where = param) => where(field).isMongoId().withMessage('Invalid id');

const listThreads = [
  query('box').optional().isIn(['inbox', 'assigned', 'queue', 'team', 'internal', 'direct', 'archived', 'all']).withMessage('Unknown box'),
  query('kind').optional().isIn(THREAD_KINDS),
  query('team').optional().isIn(TEAMS),
  query('category').optional().isIn(CATEGORIES),
  query('priority').optional().isIn(PRIORITIES),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('q').optional().isString().isLength({ max: 120 }),
  validate,
];

const createThread = [
  body('kind').isIn(THREAD_KINDS).withMessage('Invalid thread kind'),
  body('subject').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Subject is required (max 200 chars)'),
  body('body').isString().trim().isLength({ min: 1, max: 10000 }).withMessage('Message is required'),
  body('category').optional().isIn(CATEGORIES),
  body('priority').optional().isIn(PRIORITIES),
  body('to').optional({ nullable: true }).isMongoId(),
  body('context').optional().isObject(),
  validate,
];

const updateThread = [
  objectId('id'),
  body('status').optional().isIn(THREAD_STATUSES),
  body('priority').optional().isIn(PRIORITIES),
  body('category').optional().isIn(CATEGORIES),
  body('subject').optional().isString().trim().isLength({ min: 1, max: 200 }),
  validate,
];

const threadId = [objectId('id'), validate];

const assign = [objectId('id'), body('userId').optional({ nullable: true }).isMongoId(), validate];

const escalate = [
  objectId('id'),
  body('toTeam').optional().isIn(TEAMS),
  body('note').isString().trim().isLength({ min: 1, max: 5000 }).withMessage('A note is required'),
  validate,
];

const addParticipant = [
  objectId('id'),
  body('userId').isMongoId(),
  body('role').optional().isIn(['collaborator', 'observer']),
  validate,
];

const listMessages = [
  objectId('id'),
  query('before').optional().isMongoId(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
];

const sendMessage = [
  objectId('id'),
  body('body').isString().trim().isLength({ min: 1, max: 10000 }).withMessage('Message body is required'),
  body('kind').optional().isIn(['text', 'note']),
  validate,
];

const messageId = [objectId('id'), objectId('mid'), validate];

const editMessage = [objectId('id'), objectId('mid'), body('body').isString().trim().isLength({ min: 1, max: 10000 }), validate];

const template = [
  body('category').isString().trim().isLength({ min: 1, max: 60 }),
  body('title').isString().trim().isLength({ min: 1, max: 80 }),
  body('body').isString().trim().isLength({ min: 1, max: 2000 }),
  body('roles').optional().isArray(),
  body('order').optional().isInt(),
  body('active').optional().isBoolean(),
  validate,
];

const settings = [
  body('routing').optional().isObject(),
  body('sla').optional().isObject(),
  validate,
];

module.exports = {
  validate, listThreads, createThread, updateThread, threadId, assign, escalate, addParticipant,
  listMessages, sendMessage, messageId, editMessage, template, settings,
};
