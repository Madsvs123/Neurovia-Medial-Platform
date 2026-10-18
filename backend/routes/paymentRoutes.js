const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const paymentController = require('../controllers/paymentController');

// Specific routes MUST come before parameterized routes

// @route   GET /api/payments/stats
// @desc    Get payment statistics
// @access  Private (Admin)
router.get('/stats', [authMiddleware, adminMiddleware], paymentController.getPaymentStats);

// @route   GET /api/payments/recent
// @desc    Get recent payments
// @access  Private (Admin)
router.get('/recent', [authMiddleware, adminMiddleware], paymentController.getRecentPayments);

// @route   GET /api/payments/stats-by-date
// @desc    Get payment statistics by date range
// @access  Private (Admin)
router.get('/stats-by-date', [authMiddleware, adminMiddleware], paymentController.getPaymentStatsByDate);

// @route   GET /api/payments/user/:userId
// @desc    Get payments by user
// @access  Private (Admin)
router.get('/user/:userId', [authMiddleware, adminMiddleware], paymentController.getPaymentsByUser);

// @route   POST /api/payments
// @desc    Record a new payment
// @access  Private (Admin)
router.post('/', [
  authMiddleware,
  adminMiddleware,
  check('userId', 'User ID is required').not().isEmpty(),
  check('amount', 'Amount is required').isNumeric({ min: 0 }),
  check('provider', 'Provider is required').not().isEmpty(),
  check('transactionId', 'Transaction ID is required').not().isEmpty()
], paymentController.recordPayment);

// @route   GET /api/payments
// @desc    Get all payments (Admin only)
// @access  Private (Admin)
router.get('/', [authMiddleware, adminMiddleware], paymentController.getAllPayments);

// @route   GET /api/payments/:id
// @desc    Get payment by ID
// @access  Private (Admin)
router.get('/:id', [authMiddleware, adminMiddleware], paymentController.getPaymentById);

// @route   PUT /api/payments/:id/status
// @desc    Update payment status
// @access  Private (Admin)
router.put('/:id/status', [
  authMiddleware,
  adminMiddleware,
  check('status', 'Status is required').not().isEmpty()
], paymentController.updatePaymentStatus);

module.exports = router;
