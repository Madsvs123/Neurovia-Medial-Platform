const SubscriptionPlan = require('../models/SubscriptionPlan');
const { validationResult } = require('express-validator');

// @desc    Create a new subscription plan
// @route   POST /api/subscription-plans
// @access  Private (Admin)
const createSubscriptionPlan = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to create subscription plans'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      name, 
      description, 
      price, 
      currency = 'USD', 
      billingCycle, 
      features = [], 
      aiLimits = 100, 
      quizAccess = true, 
      clinicalCaseAccess = true, 
      doctorToolsAccess = false
    } = req.body;

    // Create subscription plan
    const subscriptionPlan = new SubscriptionPlan({
      name,
      description,
      price,
      currency,
      billingCycle,
      features,
      aiLimits,
      quizAccess,
      clinicalCaseAccess,
      doctorToolsAccess
    });

    await subscriptionPlan.save();

    res.status(201).json({
      success: true,
      subscriptionPlan
    });
  } catch (error) {
    console.error('Create subscription plan error:', error);
    res.status(500).json({ 
      message: 'Server error creating subscription plan',
      error: error.message 
    });
  }
};

// @desc    Get all subscription plans
// @route   GET /api/subscription-plans
// @access  Public
const getAllSubscriptionPlans = async (req, res) => {
  try {
    const subscriptionPlans = await SubscriptionPlan.find({ active: true })
      .sort({ price: 1 });

    res.json({
      success: true,
      count: subscriptionPlans.length,
      subscriptionPlans
    });
  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({ 
      message: 'Server error fetching subscription plans',
      error: error.message 
    });
  }
};

// @desc    Get subscription plan by ID
// @route   GET /api/subscription-plans/:id
// @access  Public
const getSubscriptionPlanById = async (req, res) => {
  try {
    const subscriptionPlan = await SubscriptionPlan.findById(req.params.id);

    if (!subscriptionPlan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    res.json({
      success: true,
      subscriptionPlan
    });
  } catch (error) {
    console.error('Get subscription plan by ID error:', error);
    res.status(500).json({ 
      message: 'Server error fetching subscription plan',
      error: error.message 
    });
  }
};

// @desc    Update subscription plan
// @route   PUT /api/subscription-plans/:id
// @access  Private (Admin)
const updateSubscriptionPlan = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to update subscription plans'
      });
    }

    const subscriptionPlan = await SubscriptionPlan.findById(req.params.id);

    if (!subscriptionPlan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updatedSubscriptionPlan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      subscriptionPlan: updatedSubscriptionPlan
    });
  } catch (error) {
    console.error('Update subscription plan error:', error);
    res.status(500).json({ 
      message: 'Server error updating subscription plan',
      error: error.message 
    });
  }
};

// @desc    Toggle subscription plan active status
// @route   PUT /api/subscription-plans/:id/toggle
// @access  Private (Admin)
const toggleSubscriptionPlan = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to toggle subscription plans'
      });
    }

    const subscriptionPlan = await SubscriptionPlan.findById(req.params.id);

    if (!subscriptionPlan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    // Toggle active status
    subscriptionPlan.active = !subscriptionPlan.active;
    await subscriptionPlan.save();

    res.json({
      success: true,
      subscriptionPlan,
      message: `Subscription plan ${subscriptionPlan.active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Toggle subscription plan error:', error);
    res.status(500).json({ 
      message: 'Server error toggling subscription plan',
      error: error.message 
    });
  }
};

// @desc    Delete subscription plan
// @route   DELETE /api/subscription-plans/:id
// @access  Private (Admin)
const deleteSubscriptionPlan = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to delete subscription plans'
      });
    }

    const subscriptionPlan = await SubscriptionPlan.findById(req.params.id);

    if (!subscriptionPlan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    await subscriptionPlan.remove();

    res.json({
      success: true,
      message: 'Subscription plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete subscription plan error:', error);
    res.status(500).json({ 
      message: 'Server error deleting subscription plan',
      error: error.message 
    });
  }
};

// @desc    Get subscription plan statistics
// @route   GET /api/subscription-plans/:id/stats
// @access  Private (Admin)
const getSubscriptionPlanStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view subscription plan stats'
      });
    }

    const subscriptionPlan = await SubscriptionPlan.findById(req.params.id);

    if (!subscriptionPlan) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }

    res.json({
      success: true,
      stats: {
        name: subscriptionPlan.name,
        price: subscriptionPlan.price,
        currency: subscriptionPlan.currency,
        billingCycle: subscriptionPlan.billingCycle,
        aiLimits: subscriptionPlan.aiLimits,
        quizAccess: subscriptionPlan.quizAccess,
        clinicalCaseAccess: subscriptionPlan.clinicalCaseAccess,
        doctorToolsAccess: subscriptionPlan.doctorToolsAccess,
        active: subscriptionPlan.active,
        createdAt: subscriptionPlan.createdAt,
        updatedAt: subscriptionPlan.updatedAt
      }
    });
  } catch (error) {
    console.error('Get subscription plan stats error:', error);
    res.status(500).json({ 
      message: 'Server error fetching subscription plan stats',
      error: error.message 
    });
  }
};

module.exports = {
  createSubscriptionPlan,
  getAllSubscriptionPlans,
  getSubscriptionPlanById,
  updateSubscriptionPlan,
  toggleSubscriptionPlan,
  deleteSubscriptionPlan,
  getSubscriptionPlanStats
};