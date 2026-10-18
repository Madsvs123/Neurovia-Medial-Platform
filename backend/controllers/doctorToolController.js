const DoctorTool = require('../models/DoctorTool');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const medicalTools = require('../utils/tools');
const { notify, notifyMany } = require('../utils/notify');

// @desc    Create a new doctor tool
// @route   POST /api/doctor-tools
// @access  Private (Admin)
const createDoctorTool = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to create doctor tools'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      name, category, subcategory, specialty, description, algorithmId,
      inputs, outputSchema, documentation, references, aiEnabled, premiumOnly
    } = req.body;

    const doctorTool = new DoctorTool({
      name, category, subcategory, specialty, description, algorithmId,
      inputs: inputs || [], outputSchema, documentation, references: references || [],
      aiEnabled: aiEnabled || false, premiumOnly: premiumOnly || false
    });

    await doctorTool.save();

    // Notify admins about new doctor tool
    try {
      const admins = await User.find({ role: 'admin' });
      if (admins.length > 0) {
        await notifyMany(admins, {
          title: 'New Doctor Tool Created',
          message: `A new doctor tool '${name}' was created by ${req.user.username || req.user.email}`,
          type: 'doctor_tool',
          link: `/admin/doctor-tools/${doctorTool._id}`,
          entityType: 'doctor_tool',
          entityId: doctorTool._id,
          actorId: req.user.id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins about new doctor tool:', notifyErr.message);
    }

    res.status(201).json({
      success: true,
      doctorTool
    });
  } catch (error) {
    console.error('Create doctor tool error:', error);
    res.status(500).json({ 
      message: 'Server error creating doctor tool',
      error: error.message 
    });
  }
};

// @desc    Get all doctor tools
// @route   GET /api/doctor-tools
// @access  Public
const getAllDoctorTools = async (req, res) => {
  try {
    const { category, aiEnabled, premiumOnly, search } = req.query;

    let query = { enabled: true };

    if (category) {
      query.category = category;
    }

    if (aiEnabled) {
      query.aiEnabled = aiEnabled === 'true';
    }

    if (premiumOnly) {
      query.premiumOnly = premiumOnly === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const doctorTools = await DoctorTool.find(query)
      .sort({ name: 1 });

    res.json({
      success: true,
      count: doctorTools.length,
      doctorTools
    });
  } catch (error) {
    console.error('Get doctor tools error:', error);
    res.status(500).json({ 
      message: 'Server error fetching doctor tools',
      error: error.message 
    });
  }
};

// @desc    Get doctor tool by ID
// @route   GET /api/doctor-tools/:id
// @access  Public
const getDoctorToolById = async (req, res) => {
  try {
    const doctorTool = await DoctorTool.findById(req.params.id);

    if (!doctorTool) {
      return res.status(404).json({ message: 'Doctor tool not found' });
    }

    // Check if tool is premium and user doesn't have access
    if (doctorTool.premiumOnly && req.user && req.user.subscriptionPlan === 'free') {
      return res.status(403).json({ 
        message: 'This tool requires premium subscription',
        isPremium: true
      });
    }

    res.json({
      success: true,
      doctorTool
    });
  } catch (error) {
    console.error('Get doctor tool by ID error:', error);
    res.status(500).json({ 
      message: 'Server error fetching doctor tool',
      error: error.message 
    });
  }
};

// @desc    Get doctor tools by category
// @route   GET /api/doctor-tools/category/:category
// @access  Public
const getDoctorToolsByCategory = async (req, res) => {
  try {
    const doctorTools = await DoctorTool.find({
      category: req.params.category,
      enabled: true
    }).sort({ name: 1 });

    res.json({
      success: true,
      count: doctorTools.length,
      doctorTools
    });
  } catch (error) {
    console.error('Get doctor tools by category error:', error);
    res.status(500).json({ 
      message: 'Server error fetching doctor tools by category',
      error: error.message 
    });
  }
};

// @desc    Update doctor tool
// @route   PUT /api/doctor-tools/:id
// @access  Private (Admin)
const updateDoctorTool = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to update doctor tools'
      });
    }

    const doctorTool = await DoctorTool.findById(req.params.id);

    if (!doctorTool) {
      return res.status(404).json({ message: 'Doctor tool not found' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updatedDoctorTool = await DoctorTool.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Notify admins about doctor tool update
    try {
      const admins = await User.find({ role: 'admin' });
      if (admins.length > 0) {
        await notifyMany(admins, {
          title: 'Doctor Tool Updated',
          message: `The doctor tool '${doctorTool.name}' was updated by ${req.user.username || req.user.email}`,
          type: 'doctor_tool',
          link: `/admin/doctor-tools/${doctorTool._id}`,
          entityType: 'doctor_tool',
          entityId: doctorTool._id,
          actorId: req.user.id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins about doctor tool update:', notifyErr.message);
    }

    res.json({
      success: true,
      doctorTool: updatedDoctorTool
    });
  } catch (error) {
    console.error('Update doctor tool error:', error);
    res.status(500).json({ 
      message: 'Server error updating doctor tool',
      error: error.message 
    });
  }
};

// @desc    Toggle doctor tool availability
// @route   PUT /api/doctor-tools/:id/toggle
// @access  Private (Admin)
const toggleDoctorTool = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to toggle doctor tools'
      });
    }

    const doctorTool = await DoctorTool.findById(req.params.id);

    if (!doctorTool) {
      return res.status(404).json({ message: 'Doctor tool not found' });
    }

    // Toggle enabled status
    doctorTool.enabled = !doctorTool.enabled;
    await doctorTool.save();

    res.json({
      success: true,
      doctorTool,
      message: `Doctor tool ${doctorTool.enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Toggle doctor tool error:', error);
    res.status(500).json({ 
      message: 'Server error toggling doctor tool',
      error: error.message 
    });
  }
};

// @desc    Delete doctor tool
// @route   DELETE /api/doctor-tools/:id
// @access  Private (Admin)
const deleteDoctorTool = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to delete doctor tools'
      });
    }

    const doctorTool = await DoctorTool.findById(req.params.id);

    if (!doctorTool) {
      return res.status(404).json({ message: 'Doctor tool not found' });
    }

    // Notify admins about doctor tool deletion
    try {
      const admins = await User.find({ role: 'admin' });
      if (admins.length > 0) {
        await notifyMany(admins, {
          title: 'Doctor Tool Deleted',
          message: `The doctor tool '${doctorTool.name}' was deleted by ${req.user.username || req.user.email}`,
          type: 'doctor_tool',
          entityType: 'doctor_tool',
          entityId: doctorTool._id,
          actorId: req.user.id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins about doctor tool deletion:', notifyErr.message);
    }

    await doctorTool.remove();

    res.json({
      success: true,
      message: 'Doctor tool deleted successfully'
    });
  } catch (error) {
    console.error('Delete doctor tool error:', error);
    res.status(500).json({ 
      message: 'Server error deleting doctor tool',
      error: error.message 
    });
  }
};

// @desc    Get doctor tool statistics
// @route   GET /api/doctor-tools/stats
// @access  Private (Admin)
const getDoctorToolStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view doctor tool statistics'
      });
    }

    const totalTools = await DoctorTool.countDocuments();
    const aiTools = await DoctorTool.countDocuments({ aiEnabled: true });
    const premiumTools = await DoctorTool.countDocuments({ premiumOnly: true });
    const enabledTools = await DoctorTool.countDocuments({ enabled: true });

    res.json({
      success: true,
      stats: {
        totalTools,
        aiTools,
        premiumTools,
        enabledTools,
        disabledTools: totalTools - enabledTools
      }
    });
  } catch (error) {
    console.error('Get doctor tool stats error:', error);
    res.status(500).json({ 
      message: 'Server error fetching doctor tool stats',
      error: error.message 
    });
  }
};

// @desc    Use a doctor tool (placeholder for actual tool implementation)
// @route   POST /api/doctor-tools/:id/use
// @access  Private
const useDoctorTool = async (req, res) => {
  try {
    const doctorTool = await DoctorTool.findById(req.params.id);

    if (!doctorTool) {
      return res.status(404).json({ message: 'Doctor tool not found' });
    }

    if (!doctorTool.enabled) {
      return res.status(400).json({ message: 'This tool is currently disabled' });
    }

    // Check premium access
    if (doctorTool.premiumOnly && req.user.subscriptionPlan === 'free') {
      return res.status(403).json({ 
        message: 'This tool requires premium subscription'
      });
    }

    // TODO: Implement actual tool functionality based on tool type
    // This is a placeholder response (the helper referenced here previously
    // did not exist, so this endpoint threw a ReferenceError at runtime).
    const mockResponse = {
      tool: doctorTool.name,
      category: doctorTool.category,
      input: req.body,
      result: null,
      message: 'Tool execution is not implemented yet'
    };

    res.json({
      success: true,
      tool: doctorTool.name,
      result: mockResponse,
      message: 'Tool executed successfully (mock response)'
    });
  } catch (error) {
    console.error('Use doctor tool error:', error);
    res.status(500).json({ 
      message: 'Server error using doctor tool',
      error: error.message 
    });
  }
};

// @desc    Get all available medical algorithms metadata
// @route   GET /api/doctor-tools/algorithms
// @access  Public
const getAlgorithms = async (req, res) => {
  try {
    res.json({ success: true, algorithms: medicalTools.getToolsMetadata() });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching algorithms', error: error.message });
  }
};

// @desc    Execute a medical algorithm calculation
// @route   POST /api/doctor-tools/calculate
// @access  Private
const calculateTool = async (req, res) => {
  try {
    const { algorithmId, inputs } = req.body;
    if (!algorithmId || !inputs) {
      return res.status(400).json({ message: 'algorithmId and inputs required' });
    }
    if (typeof medicalTools[algorithmId] !== 'function') {
      return res.status(400).json({ message: `Unknown algorithm: ${algorithmId}` });
    }
    const result = medicalTools[algorithmId](inputs);
    res.json({ success: true, algorithmId, inputs, result });
  } catch (error) {
    res.status(500).json({ message: 'Calculation error', error: error.message });
  }
};

module.exports = {
  createDoctorTool,
  getAllDoctorTools,
  getDoctorToolById,
  getDoctorToolsByCategory,
  updateDoctorTool,
  toggleDoctorTool,
  deleteDoctorTool,
  getDoctorToolStats,
  useDoctorTool,
  getAlgorithms,
  calculateTool
};