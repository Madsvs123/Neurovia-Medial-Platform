const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const educatorMiddleware = require('../middleware/educatorMiddleware');
const messageController = require('../controllers/messageController');

// Platform-wide message views are staff-only — previously these only required
// `authMiddleware`, so any authenticated student could read the last 100
// messages (and read/unread stats) across every conversation on the site.
router.get('/', authMiddleware, educatorMiddleware, messageController.getAllMessages);
router.get('/stats', authMiddleware, educatorMiddleware, messageController.getMessageStats);
router.get('/:id', authMiddleware, messageController.getMessageById);
router.put('/:id/read', authMiddleware, messageController.markMessageAsRead);
router.delete('/:id', authMiddleware, messageController.deleteMessage);

module.exports = router;
