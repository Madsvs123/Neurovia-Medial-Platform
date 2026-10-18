const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const { validationResult } = require('express-validator');
const { notify } = require('../utils/notify');

// @desc    Record a new payment
// @route   POST /api/payments
// @access  Private (Admin)
const recordPayment = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to record payments'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      userId, 
      subscriptionId, 
      amount, 
      currency = 'USD', 
      provider, 
      transactionId, 
      status = 'completed',
      receiptUrl = ''
    } = req.body;

    // Create payment record
    const payment = new Payment({
      userId,
      subscriptionId,
      amount,
      currency,
      provider,
      transactionId,
      status,
      receiptUrl
    });

    await payment.save();

    // Update subscription status if payment is successful
    if (status === 'completed' && subscriptionId) {
      await Subscription.findByIdAndUpdate(subscriptionId, {
        status: 'active'
      });
    }

    res.status(201).json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ 
      message: 'Server error recording payment',
      error: error.message 
    });
  }
};

// @desc    Get all payments (Admin only)
// @route   GET /api/payments
// @access  Private (Admin)
const getAllPayments = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view payments'
      });
    }

    const { userId, status, provider, search } = req.query;

    let query = {};

    if (userId) {
      query.userId = userId;
    }

    if (status) {
      query.status = status;
    }

    if (provider) {
      query.provider = provider;
    }

    if (search) {
      query.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { receiptUrl: { $regex: search, $options: 'i' } }
      ];
    }

    const payments = await Payment.find(query)
      .populate('userId', 'username email')
      .populate('subscriptionId', 'status')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ 
      message: 'Server error fetching payments',
      error: error.message 
    });
  }
};

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private (Admin)
const getPaymentById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view payment details'
      });
    }

    const payment = await Payment.findById(req.params.id)
      .populate('userId', 'username email')
      .populate('subscriptionId', 'status startDate expiresAt');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Get payment by ID error:', error);
    res.status(500).json({ 
      message: 'Server error fetching payment',
      error: error.message 
    });
  }
};

// @desc    Get payments by user
// @route   GET /api/payments/user/:userId
// @access  Private (Admin)
const getPaymentsByUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view user payments'
      });
    }

    const payments = await Payment.find({ userId: req.params.userId })
      .populate('subscriptionId', 'status')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    console.error('Get payments by user error:', error);
    res.status(500).json({ 
      message: 'Server error fetching user payments',
      error: error.message 
    });
  }
};

// @desc    Update payment status
// @route   PUT /api/payments/:id/status
// @access  Private (Admin)
const updatePaymentStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to update payment status'
      });
    }

    const { status } = req.body;

    if (!['pending', 'completed', 'failed', 'refunded'].includes(status)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    payment.status = status;
    await payment.save();

    // Notify the payment user about status change
    try {
      await notify({
        userId: payment.userId,
        title: 'Payment Status Updated',
        message: `Your payment (${payment.transactionId || payment._id}) status has been updated to '${status}'`,
        type: 'payment',
        link: `/payments/${payment._id}`,
        entityType: 'payment',
        entityId: payment._id,
        actorId: req.user.id,
      });
    } catch (notifyErr) {
      console.error('Failed to notify user about payment status change:', notifyErr.message);
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ 
      message: 'Server error updating payment status',
      error: error.message 
    });
  }
};

// @desc    Get payment statistics
// @route   GET /api/payments/stats
// @access  Private (Admin)
const getPaymentStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view payment statistics'
      });
    }

    const totalPayments = await Payment.countDocuments();
    const completedPayments = await Payment.countDocuments({ status: 'completed' });
    const failedPayments = await Payment.countDocuments({ status: 'failed' });
    const pendingPayments = await Payment.countDocuments({ status: 'pending' });

    // Calculate total revenue
    const revenueStats = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        avgPayment: { $avg: '$amount' }
      }}
    ]);

    const totalRevenue = revenueStats[0]?.totalRevenue || 0;
    const avgPayment = revenueStats[0]?.avgPayment || 0;

    res.json({
      success: true,
      stats: {
        totalPayments,
        completedPayments,
        failedPayments,
        pendingPayments,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        avgPayment: parseFloat(avgPayment.toFixed(2)),
        successRate: totalPayments > 0 ? (completedPayments / totalPayments * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ 
      message: 'Server error fetching payment stats',
      error: error.message 
    });
  }
};

// @desc    Get recent payments
// @route   GET /api/payments/recent
// @access  Private (Admin)
const getRecentPayments = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view recent payments'
      });
    }

    const { limit = 10 } = req.query;

    const recentPayments = await Payment.find()
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: recentPayments.length,
      payments: recentPayments
    });
  } catch (error) {
    console.error('Get recent payments error:', error);
    res.status(500).json({ 
      message: 'Server error fetching recent payments',
      error: error.message 
    });
  }
};

// @desc    Get payment statistics by date range
// @route   GET /api/payments/stats-by-date
// @access  Private (Admin)
const getPaymentStatsByDate = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view payment statistics by date'
      });
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Both startDate and endDate are required' });
    }

    const dateQuery = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      status: 'completed'
    };

    const payments = await Payment.find(dateQuery);
    
    const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const paymentCount = payments.length;

    res.json({
      success: true,
      stats: {
        period: `${startDate} to ${endDate}`,
        totalPayments: paymentCount,
        totalRevenue: parseFloat(totalAmount.toFixed(2)),
        avgPayment: paymentCount > 0 ? parseFloat((totalAmount / paymentCount).toFixed(2)) : 0
      }
    });
  } catch (error) {
    console.error('Get payment stats by date error:', error);
    res.status(500).json({ 
      message: 'Server error fetching payment stats by date',
      error: error.message 
    });
  }
};

module.exports = {
  recordPayment,
  getAllPayments,
  getPaymentById,
  getPaymentsByUser,
  updatePaymentStatus,
  getPaymentStats,
  getRecentPayments,
  getPaymentStatsByDate
};