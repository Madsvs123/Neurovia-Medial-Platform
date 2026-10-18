const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const educatorMiddleware = require('../middleware/educatorMiddleware');
const conversationController = require('../controllers/conversationController');

// Must be before parameterized routes
// Only staff (admin/educator) start conversations on someone else's behalf —
// this also returns the full user directory, so it must not be open to students.
router.get('/new', authMiddleware, educatorMiddleware, conversationController.getNewConversationForm);
router.get('/queue', authMiddleware, educatorMiddleware, conversationController.getSupportQueue);
router.put('/mark-all-read', authMiddleware, conversationController.markAllAsRead);

// CRUD
router.get('/', authMiddleware, conversationController.getConversations);
router.post('/', authMiddleware, conversationController.createConversation);
router.get('/my', authMiddleware, conversationController.getMyConversations);
router.get('/:id', authMiddleware, conversationController.getConversation);
router.put('/:id/status', authMiddleware, conversationController.updateConversationStatus);
router.put('/:id/read', authMiddleware, conversationController.markConversationAsRead);
router.post('/:id/join', authMiddleware, educatorMiddleware, conversationController.joinConversation);
router.delete('/:id', authMiddleware, conversationController.deleteConversation);

// Messages within conversation
router.get('/:id/messages', authMiddleware, conversationController.getConversationMessages);
router.post('/:id/messages', authMiddleware, conversationController.sendMessage);

module.exports = router;
