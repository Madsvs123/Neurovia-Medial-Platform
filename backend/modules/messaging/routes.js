const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const educatorMiddleware = require('../../middleware/educatorMiddleware');
const adminMiddleware = require('../../middleware/adminMiddleware');
const v = require('./validators/threadValidators');
const c = require('./controllers/threadController');

/**
 * Mounted at /api/v2/messaging
 *
 * Role gates here are coarse (auth / staff / admin); fine-grained rules
 * (participant, team, state machine) live in threadPolicy + services.
 */
const router = express.Router();
router.use(authMiddleware);

// ─── meta ────────────────────────────────────────────────────────────
router.get('/config', c.config);
router.get('/stats', adminMiddleware, c.stats);
router.get('/recipients', v.recipients, c.recipients);

// ─── templates (staff read, admin manage) ────────────────────────────
router.get('/templates', educatorMiddleware, c.listTemplates);
router.get('/templates/all', adminMiddleware, c.listAllTemplates);
router.post('/templates', adminMiddleware, v.template, c.createTemplate);
router.patch('/templates/:id', adminMiddleware, v.templateUpdate, c.updateTemplate);
router.delete('/templates/:id', adminMiddleware, v.idOnly, c.deleteTemplate);

// ─── threads ─────────────────────────────────────────────────────────
router.get('/threads', v.list, c.list);
router.get('/threads/counts', c.counts);
router.post('/threads', v.create, c.create);

router.get('/threads/:id', v.idOnly, c.get);
router.patch('/threads/:id', v.update, c.update);
router.delete('/threads/:id', v.idOnly, c.remove);

router.post('/threads/:id/read', v.idOnly, c.markRead);
router.post('/threads/:id/archive', v.idOnly, c.archive);
router.post('/threads/:id/unarchive', v.idOnly, c.unarchive);

router.post('/threads/:id/claim', educatorMiddleware, v.idOnly, c.claim);
router.post('/threads/:id/join', educatorMiddleware, v.idOnly, c.join);
router.post('/threads/:id/assign', educatorMiddleware, v.assign, c.assign);
router.post('/threads/:id/unassign', educatorMiddleware, v.idOnly, c.unassign);
router.post('/threads/:id/escalate', educatorMiddleware, v.escalate, c.escalate);

router.post('/threads/:id/participants', educatorMiddleware, v.participant, c.addParticipant);
router.delete('/threads/:id/participants/:userId', educatorMiddleware, v.removeParticipant, c.removeParticipant);

// ─── messages ────────────────────────────────────────────────────────
router.get('/threads/:id/messages', v.listMessages, c.listMessages);
router.post('/threads/:id/messages', v.sendMessage, c.sendMessage);
router.patch('/threads/:id/messages/:mid', v.editMessage, c.editMessage);
router.delete('/threads/:id/messages/:mid', v.messageId, c.deleteMessage);

module.exports = router;
