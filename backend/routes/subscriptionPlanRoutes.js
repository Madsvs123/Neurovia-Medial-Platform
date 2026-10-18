const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const subscriptionPlanController = require('../controllers/subscriptionPlanController');

// @route   POST /api/subscription-plans
// @desc    Create a new subscription plan
// @access  Private (Admin)
router.post('/', [
  authMiddleware,
  adminMiddleware,
  check('name', 'Name is required').not().isEmpty(),
  check('description', 'Description is required').not().isEmpty(),
  check('price', 'Price is required').isNumeric({ min: 0 }),
  check('billingCycle', 'Billing cycle is required').not().isEmpty()
], subscriptionPlanController.createSubscriptionPlan);

// @route   GET /api/subscription-plans
// @desc    Get all subscription plans
// @access  Public
router.get('/', subscriptionPlanController.getAllSubscriptionPlans);

// @route   GET /api/subscription-plans/:id
// @desc    Get subscription plan by ID
// @access  Public
router.get('/:id', subscriptionPlanController.getSubscriptionPlanById);

// @route   PUT /api/subscription-plans/:id
// @desc    Update subscription plan
// @access  Private (Admin)
router.put('/:id', [authMiddleware, adminMiddleware], subscriptionPlanController.updateSubscriptionPlan);

// @route   PUT /api/subscription-plans/:id/toggle
// @desc    Toggle subscription plan active status
// @access  Private (Admin)
router.put('/:id/toggle', [authMiddleware, adminMiddleware], subscriptionPlanController.toggleSubscriptionPlan);

// @route   DELETE /api/subscription-plans/:id
// @desc    Delete subscription plan
// @access  Private (Admin)
router.delete('/:id', [authMiddleware, adminMiddleware], subscriptionPlanController.deleteSubscriptionPlan);

// @route   GET /api/subscription-plans/:id/stats
// @desc    Get subscription plan statistics
// @access  Private (Admin)
router.get('/:id/stats', [authMiddleware, adminMiddleware], subscriptionPlanController.getSubscriptionPlanStats);

module.exports = router;