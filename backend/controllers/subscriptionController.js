const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { notify } = require('../utils/notify');

// @desc    Create a new subscription
// @route   POST /api/subscriptions
// @access  Private
const createSubscription = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { planId, paymentProvider = 'stripe', autoRenew = true } = req.body;

    // Check if subscription plan exists
    const subscriptionPlan = await SubscriptionPlan.findById(planId);
    if (!subscriptionPlan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    if (!subscriptionPlan.active) {
      return res.status(400).json({ message: 'Subscription plan is not active' });
    }

    // Calculate expiration date based on billing cycle
    const startDate = new Date();
    let expiresAt = new Date();

    if (subscriptionPlan.billingCycle === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else if (subscriptionPlan.billingCycle === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // Create subscription
    const subscription = new Subscription({
      userId: req.user.id,
      planId,
      status: 'active',
      startDate,
      expiresAt,
      paymentProvider,
      autoRenew
    });

    await subscription.save();

    // Update user's subscription plan
    await User.findByIdAndUpdate(req.user.id, {
      subscriptionPlan: subscriptionPlan.name
    });

    res.status(201).json({
      success: true,
      subscription
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ 
      message: 'Server error creating subscription',
      error: error.message 
    });
  }
};

// @desc    Get current user's subscription
// @route   GET /api/subscriptions/me
// @access  Private
const getMySubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ userId: req.user.id })
      .populate('planId', 'name description price billingCycle features');

    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    res.json({
      success: true,
      subscription
    });
  } catch (error) {
    console.error('Get my subscription error:', error);
    res.status(500).json({ 
      message: 'Server error fetching subscription',
      error: error.message 
    });
  }
};

// @desc    Get all subscriptions (Admin only)
// @route   GET /api/subscriptions
// @access  Private (Admin)
const getAllSubscriptions = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view all subscriptions'
      });
    }

    const { status, planId, search } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (planId) {
      query.planId = planId;
    }

    if (search) {
      // Search by user email or plan name
      const users = await User.find({
        email: { $regex: search, $options: 'i' }
      });
      const userIds = users.map(user => user._id);
      
      if (userIds.length > 0) {
        query.userId = { $in: userIds };
      }
    }

    const subscriptions = await Subscription.find(query)
      .populate('userId', 'username email')
      .populate('planId', 'name price')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: subscriptions.length,
      subscriptions
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ 
      message: 'Server error fetching subscriptions',
      error: error.message 
    });
  }
};

// @desc    Get subscription by ID
// @route   GET /api/subscriptions/:id
// @access  Private (Admin)
const getSubscriptionById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view subscription details'
      });
    }

    const subscription = await Subscription.findById(req.params.id)
      .populate('userId', 'username email')
      .populate('planId', 'name description price billingCycle');

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.json({
      success: true,
      subscription
    });
  } catch (error) {
    console.error('Get subscription by ID error:', error);
    res.status(500).json({ 
      message: 'Server error fetching subscription',
      error: error.message 
    });
  }
};

// @desc    Cancel subscription
// @route   PUT /api/subscriptions/:id/cancel
// @access  Private
const cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    if (subscription.status === 'canceled') {
      return res.status(400).json({ message: 'Subscription is already canceled' });
    }

    // Set status to canceled and keep until expiration
    subscription.status = 'canceled';
    subscription.autoRenew = false;
    await subscription.save();

    // Update user's subscription plan to free
    await User.findByIdAndUpdate(req.user.id, {
      subscriptionPlan: 'free'
    });

    res.json({
      success: true,
      subscription,
      message: 'Subscription canceled successfully. Access will continue until expiration date.'
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ 
      message: 'Server error canceling subscription',
      error: error.message 
    });
  }
};

// @desc    Update subscription auto-renewal
// @route   PUT /api/subscriptions/:id/auto-renew
// @access  Private
const updateAutoRenew = async (req, res) => {
  try {
    const { autoRenew } = req.body;

    const subscription = await Subscription.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    subscription.autoRenew = autoRenew;
    await subscription.save();

    res.json({
      success: true,
      subscription,
      message: `Auto-renewal ${autoRenew ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Update auto-renew error:', error);
    res.status(500).json({ 
      message: 'Server error updating auto-renewal',
      error: error.message 
    });
  }
};

// @desc    Update subscription status (Admin only)
// @route   PUT /api/subscriptions/:id/status
// @access  Private (Admin)
const updateSubscriptionStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to update subscription status'
      });
    }

    const { status } = req.body;

    if (!['active', 'canceled', 'expired', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid subscription status' });
    }

    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    subscription.status = status;
    await subscription.save();

    // Notify the subscription user about status change
    try {
      await notify({
        userId: subscription.userId,
        title: 'Subscription Status Updated',
        message: `Your subscription status has been updated to '${status}' by an admin`,
        type: 'subscription',
        link: `/subscriptions/${subscription._id}`,
        entityType: 'subscription',
        entityId: subscription._id,
        actorId: req.user.id,
      });
    } catch (notifyErr) {
      console.error('Failed to notify user about subscription status change:', notifyErr.message);
    }

    res.json({
      success: true,
      subscription
    });
  } catch (error) {
    console.error('Update subscription status error:', error);
    res.status(500).json({ 
      message: 'Server error updating subscription status',
      error: error.message 
    });
  }
};

// @desc    Get subscription statistics (Admin only)
// @route   GET /api/subscriptions/stats
// @access  Private (Admin)
const getSubscriptionStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view subscription statistics'
      });
    }

    const totalSubscriptions = await Subscription.countDocuments();
    const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
    const canceledSubscriptions = await Subscription.countDocuments({ status: 'canceled' });
    const expiredSubscriptions = await Subscription.countDocuments({ status: 'expired' });

    // Get revenue statistics
    const revenueStats = await Subscription.aggregate([
      { $match: { status: 'active' } },
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' }
      }}
    ]);

    const totalRevenue = revenueStats[0]?.totalRevenue || 0;

    res.json({
      success: true,
      stats: {
        totalSubscriptions,
        activeSubscriptions,
        canceledSubscriptions,
        expiredSubscriptions,
        totalRevenue,
        monthlyRecurringRevenue: totalRevenue // Simplified for demo
      }
    });
  } catch (error) {
    console.error('Get subscription stats error:', error);
    res.status(500).json({ 
      message: 'Server error fetching subscription stats',
      error: error.message 
    });
  }
};

// @desc    Check if user has access to premium content
// @route   GET /api/subscriptions/check-premium
// @access  Private
const checkPremiumAccess = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user.id,
      status: 'active'
    }).populate('planId');

    if (!subscription) {
      return res.json({
        success: true,
        hasPremiumAccess: false,
        message: 'No active subscription found'
      });
    }

    // Check if plan includes premium features
    const hasPremiumAccess = subscription.planId && 
      (subscription.planId.name !== 'free' || 
       subscription.planId.price > 0);

    res.json({
      success: true,
      hasPremiumAccess,
      subscriptionPlan: subscription.planId.name,
      expiresAt: subscription.expiresAt
    });
  } catch (error) {
    console.error('Check premium access error:', error);
    res.status(500).json({ 
      message: 'Server error checking premium access',
      error: error.message 
    });
  }
};

module.exports = {
  createSubscription,
  getMySubscription,
  getAllSubscriptions,
  getSubscriptionById,
  cancelSubscription,
  updateAutoRenew,
  updateSubscriptionStatus,
  getSubscriptionStats,
  checkPremiumAccess
};