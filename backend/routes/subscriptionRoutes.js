const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const subscriptionController = require('../controllers/subscriptionController');

// Specific routes MUST come before parameterized routes

// @route   GET /api/subscriptions/stats
// @desc    Get subscription statistics (Admin only)
// @access  Private (Admin)
router.get('/stats', [authMiddleware, adminMiddleware], subscriptionController.getSubscriptionStats);

// @route   GET /api/subscriptions/check-premium
// @desc    Check if user has access to premium content
// @access  Private
router.get('/check-premium', authMiddleware, subscriptionController.checkPremiumAccess);

// @route   GET /api/subscriptions/me
// @desc    Get current user's subscription
// @access  Private
router.get('/me', authMiddleware, subscriptionController.getMySubscription);

// @route   POST /api/subscriptions
// @desc    Create a new subscription
// @access  Private
router.post('/', [
  authMiddleware,
  check('planId', 'Plan ID is required').not().isEmpty()
], subscriptionController.createSubscription);

// @route   GET /api/subscriptions
// @desc    Get all subscriptions (Admin only)
// @access  Private (Admin)
router.get('/', [authMiddleware, adminMiddleware], subscriptionController.getAllSubscriptions);

// @route   GET /api/subscriptions/:id
// @desc    Get subscription by ID
// @access  Private (Admin)
router.get('/:id', [authMiddleware, adminMiddleware], subscriptionController.getSubscriptionById);

// @route   PUT /api/subscriptions/:id/cancel
// @desc    Cancel subscription
// @access  Private
router.put('/:id/cancel', authMiddleware, subscriptionController.cancelSubscription);

// @route   PUT /api/subscriptions/:id/auto-renew
// @desc    Update subscription auto-renewal
// @access  Private
router.put('/:id/auto-renew', [
  authMiddleware,
  check('autoRenew', 'Auto renew status is required').isBoolean()
], subscriptionController.updateAutoRenew);

// @route   PUT /api/subscriptions/:id/status
// @desc    Update subscription status (Admin only)
// @access  Private (Admin)
router.put('/:id/status', [
  authMiddleware,
  adminMiddleware,
  check('status', 'Status is required').not().isEmpty()
], subscriptionController.updateSubscriptionStatus);

module.exports = router;