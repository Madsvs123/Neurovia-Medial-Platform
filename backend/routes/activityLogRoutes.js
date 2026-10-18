const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const activityLogController = require('../controllers/activityLogController');

// @route   POST /api/activity-logs
// @desc    Log user activity
// @access  Private (System)
router.post('/', [
  authMiddleware,
  check('action', 'Action is required').not().isEmpty()
], activityLogController.logActivity);

// @route   GET /api/activity-logs/me
// @desc    Get activity logs for current user
// @access  Private
router.get('/me', authMiddleware, activityLogController.getMyActivityLogs);

// @route   GET /api/activity-logs/user/:userId
// @desc    Get activity logs for a specific user (Admin only)
// @access  Private (Admin)
router.get('/user/:userId', [authMiddleware, adminMiddleware], activityLogController.getActivityLogsByUser);

// @route   GET /api/activity-logs/resource/:resourceType/:resourceId
// @desc    Get activity logs for a specific resource
// @access  Private (Admin)
router.get('/resource/:resourceType/:resourceId', [authMiddleware, adminMiddleware], activityLogController.getActivityLogsByResource);

// @route   GET /api/activity-logs/recent
// @desc    Get recent activity logs (Admin only)
// @access  Private (Admin)
router.get('/recent', [authMiddleware, adminMiddleware], activityLogController.getRecentActivityLogs);

// @route   GET /api/activity-logs/stats
// @desc    Get activity statistics (Admin only)
// @access  Private (Admin)
router.get('/stats', [authMiddleware, adminMiddleware], activityLogController.getActivityStats);

// @route   GET /api/activity-logs/engagement
// @desc    Get user engagement statistics (Admin only)
// @access  Private (Admin)
router.get('/engagement', [authMiddleware, adminMiddleware], activityLogController.getUserEngagementStats);

// @route   GET /api/activity-logs/export
// @desc    Export activity logs (Admin only)
// @access  Private (Admin)
router.get('/export', [authMiddleware, adminMiddleware], activityLogController.exportActivityLogs);

module.exports = router;