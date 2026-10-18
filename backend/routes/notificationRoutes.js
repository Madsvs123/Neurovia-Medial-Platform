const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const notificationController = require('../controllers/notificationController');

// Public (unauthenticated) — none; all notification endpoints require auth

// Lightweight unread count (used by bell badges)
router.get('/unread-count', authMiddleware, notificationController.getUnreadCount);

// Bulk actions (must come before /:id routes)
router.put('/mark-all-read', authMiddleware, notificationController.markAllAsRead);
router.delete('/delete-all', authMiddleware, notificationController.deleteAllNotifications);
router.post('/broadcast', [
  authMiddleware, adminMiddleware,
  check('title', 'Title is required').not().isEmpty(),
  check('message', 'Message is required').not().isEmpty()
], notificationController.broadcastNotification);
router.get('/stats', [authMiddleware, adminMiddleware], notificationController.getStats);

// CRUD
router.post('/', [authMiddleware, adminMiddleware], notificationController.createNotification);
router.get('/', authMiddleware, notificationController.getMyNotifications);
router.put('/:id/read', authMiddleware, notificationController.markAsRead);
router.delete('/:id', authMiddleware, notificationController.deleteNotification);

module.exports = router;
