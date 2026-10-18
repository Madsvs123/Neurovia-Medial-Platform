const { body, param, query, validationResult } = require('express-validator');
const { STATUSES } = require('../services/threadStateMachine');

const KINDS = ['support', 'direct', 'internal'];
const CATEGORIES = ['general', 'support', 'clinical', 'technical', 'billing', 'other'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const TEAMS = ['support', 'billing', 'technical', 'clinical'];
const BOXES = ['inbox', 'assigned', 'direct', 'support', 'internal', 'queue', 'team', 'archived', 'all'];

/** Turns express-validator results into a single 400 with the first message. */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({
    success: false,
    message: errors.array()[0].msg,
    errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    statusCode: 400,
  });
};

const objectId = (field, where = param) => where(field).isMongoId().withMessage(`Invalid ${field}`);

const list = [
  query('box').optional().isIn(BOXES).withMessage('Unknown box'),
  query('kind').optional().isIn(KINDS),
  query('team').optional().isIn(TEAMS),
  query('priority').optional().isIn(PRIORITIES),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('q').optional().isString().isLength({ max: 120 }).trim(),
  validate,
];

const create = [
  body('subject').isString().trim().isLength({ min: 2, max: 200 }).withMessage('Subject must be 2–200 characters'),
  body('body').isString().trim().isLength({ min: 1, max: 10000 }).withMessage('Message is required'),
  body('kind').optional().isIn(KINDS).withMessage('Unknown kind'),
  body('category').optional().isIn(CATEGORIES).withMessage('Unknown category'),
  body('priority').optional().isIn(PRIORITIES).withMessage('Unknown priority'),
  body('to').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid recipient'),
  body('context.programId').optional({ values: 'falsy' }).isMongoId(),
  body('context.courseId').optional({ values: 'falsy' }).isMongoId(),
  body('context.lessonId').optional({ values: 'falsy' }).isMongoId(),
  body('context.clinicalCaseId').optional({ values: 'falsy' }).isMongoId(),
  validate,
];

const update = [
  objectId('id'),
  body('status').optional().isIn(STATUSES).withMessage('Unknown status'),
  body('priority').optional().isIn(PRIORITIES).withMessage('Unknown priority'),
  body('subject').optional().isString().trim().isLength({ min: 2, max: 200 }),
  body('category').optional().isIn(CATEGORIES),
  validate,
];

const idOnly = [objectId('id'), validate];

const assign = [objectId('id'), body('userId').isMongoId().withMessage('Invalid user'), validate];

const escalate = [
  objectId('id'),
  body('toTeam').isIn(TEAMS).withMessage('Unknown team'),
  body('note').optional().isString().trim().isLength({ max: 5000 }),
  validate,
];

const participant = [
  objectId('id'),
  body('userId').isMongoId().withMessage('Invalid user'),
  body('role').optional().isIn(['collaborator', 'observer']),
  validate,
];

const removeParticipant = [objectId('id'), objectId('userId'), validate];

const listMessages = [
  objectId('id'),
  query('before').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  validate,
];

const sendMessage = [
  objectId('id'),
  body('body').isString().trim().isLength({ min: 1, max: 10000 }).withMessage('Message is required'),
  body('kind').optional().isIn(['text', 'note']).withMessage('Invalid message kind'),
  validate,
];

const editMessage = [
  objectId('id'),
  objectId('mid'),
  body('body').isString().trim().isLength({ min: 1, max: 10000 }).withMessage('Message is required'),
  validate,
];

const messageId = [objectId('id'), objectId('mid'), validate];

const recipients = [
  query('q').optional().isString().isLength({ max: 80 }).trim(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  validate,
];

const template = [
  body('title').isString().trim().isLength({ min: 1, max: 80 }).withMessage('Title is required'),
  body('body').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Body is required'),
  body('category').optional().isString().trim().isLength({ max: 40 }),
  body('audience').optional().isArray({ min: 1 }),
  body('audience.*').optional().isIn(['admin', 'educator']),
  body('order').optional().isInt(),
  body('active').optional().isBoolean(),
  validate,
];

const templateUpdate = [
  objectId('id'),
  body('title').optional().isString().trim().isLength({ min: 1, max: 80 }),
  body('body').optional().isString().trim().isLength({ min: 1, max: 2000 }),
  body('category').optional().isString().trim().isLength({ max: 40 }),
  body('audience').optional().isArray({ min: 1 }),
  body('audience.*').optional().isIn(['admin', 'educator']),
  body('order').optional().isInt(),
  body('active').optional().isBoolean(),
  validate,
];

module.exports = {
  validate,
  list, create, update, idOnly, assign, escalate, participant, removeParticipant,
  listMessages, sendMessage, editMessage, messageId, recipients, template, templateUpdate,
};
