const ProgramResource = require('../models/ProgramResource');
const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const { validationResult } = require('express-validator');

// @desc    Add resource to program
// @route   POST /api/program-resources
// @access  Private (Admin)
const addProgramResource = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to add program resources'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { programId, resourceType, resourceId } = req.body;

    // Check if program exists
    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Check if resource already exists in program
    const existingResource = await ProgramResource.findOne({
      programId,
      resourceType,
      resourceId
    });

    if (existingResource) {
      return res.status(400).json({ message: 'Resource already exists in program' });
    }

    // Create program resource
    const programResource = new ProgramResource({
      programId,
      resourceType,
      resourceId
    });

    await programResource.save();

    res.status(201).json({
      success: true,
      programResource
    });
  } catch (error) {
    console.error('Add program resource error:', error);
    res.status(500).json({ 
      message: 'Server error adding program resource',
      error: error.message 
    });
  }
};

// @desc    Get all resources for a program
// @route   GET /api/program-resources/program/:programId
// @access  Public
const getResourcesByProgram = async (req, res) => {
  try {
    const programResources = await ProgramResource.find({
      programId: req.params.programId
    }).populate('resourceId');

    res.json({
      success: true,
      count: programResources.length,
      programResources
    });
  } catch (error) {
    console.error('Get resources by program error:', error);
    res.status(500).json({ 
      message: 'Server error fetching program resources',
      error: error.message 
    });
  }
};

// @desc    Get program resource by ID
// @route   GET /api/program-resources/:id
// @access  Public
const getProgramResourceById = async (req, res) => {
  try {
    const programResource = await ProgramResource.findById(req.params.id)
      .populate('programId', 'title code')
      .populate('resourceId');

    if (!programResource) {
      return res.status(404).json({ message: 'Program resource not found' });
    }

    res.json({
      success: true,
      programResource
    });
  } catch (error) {
    console.error('Get program resource by ID error:', error);
    res.status(500).json({ 
      message: 'Server error fetching program resource',
      error: error.message 
    });
  }
};

// @desc    Get resources by type
// @route   GET /api/program-resources/type/:resourceType
// @access  Public
const getResourcesByType = async (req, res) => {
  try {
    const programResources = await ProgramResource.find({
      resourceType: req.params.resourceType
    }).populate('programId', 'title code')
    .populate('resourceId');

    res.json({
      success: true,
      count: programResources.length,
      programResources
    });
  } catch (error) {
    console.error('Get resources by type error:', error);
    res.status(500).json({ 
      message: 'Server error fetching resources by type',
      error: error.message 
    });
  }
};

// @desc    Update program resource
// @route   PUT /api/program-resources/:id
// @access  Private (Admin)
const updateProgramResource = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to update program resources'
      });
    }

    const programResource = await ProgramResource.findById(req.params.id);

    if (!programResource) {
      return res.status(404).json({ message: 'Program resource not found' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updatedProgramResource = await ProgramResource.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      programResource: updatedProgramResource
    });
  } catch (error) {
    console.error('Update program resource error:', error);
    res.status(500).json({ 
      message: 'Server error updating program resource',
      error: error.message 
    });
  }
};

// @desc    Remove resource from program
// @route   DELETE /api/program-resources/:id
// @access  Private (Admin)
const removeProgramResource = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to remove program resources'
      });
    }

    const programResource = await ProgramResource.findById(req.params.id);

    if (!programResource) {
      return res.status(404).json({ message: 'Program resource not found' });
    }

    await programResource.remove();

    res.json({
      success: true,
      message: 'Program resource removed successfully'
    });
  } catch (error) {
    console.error('Remove program resource error:', error);
    res.status(500).json({ 
      message: 'Server error removing program resource',
      error: error.message 
    });
  }
};

// @desc    Get program resource statistics
// @route   GET /api/program-resources/stats
// @access  Private (Admin)
const getProgramResourceStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view program resource statistics'
      });
    }

    const totalResources = await ProgramResource.countDocuments();

    // Get resource distribution by type
    const resourceTypeStats = await ProgramResource.aggregate([
      { $group: {
        _id: '$resourceType',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]);

    // Get resource distribution by program
    const programStats = await ProgramResource.aggregate([
      { $group: {
        _id: '$programId',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      success: true,
      stats: {
        totalResources,
        resourceTypes: resourceTypeStats,
        topPrograms: programStats
      }
    });
  } catch (error) {
    console.error('Get program resource stats error:', error);
    res.status(500).json({ 
      message: 'Server error fetching program resource stats',
      error: error.message 
    });
  }
};

// @desc    Check if resource is unlocked for user
// @route   GET /api/program-resources/check-unlocked
// @access  Private
const checkResourceUnlocked = async (req, res) => {
  try {
    const { resourceType, resourceId } = req.query;

    if (!resourceType || !resourceId) {
      return res.status(400).json({ message: 'Resource type and ID are required' });
    }

    // Find all programs user is enrolled in
    const enrollments = await ProgramEnrollment.find({ userId: req.user.id });

    // Check if resource is unlocked in any of the programs
    let isUnlocked = false;
    let unlockingProgram = null;

    for (const enrollment of enrollments) {
      const unlockedResource = enrollment.unlockedResources.find(r =>
        r.resourceType === resourceType && 
        r.resourceId.toString() === resourceId.toString()
      );

      if (unlockedResource) {
        isUnlocked = true;
        unlockingProgram = enrollment.programId;
        break;
      }
    }

    res.json({
      success: true,
      isUnlocked,
      unlockingProgram
    });
  } catch (error) {
    console.error('Check resource unlocked error:', error);
    res.status(500).json({ 
      message: 'Server error checking resource access',
      error: error.message 
    });
  }
};

module.exports = {
  addProgramResource,
  getResourcesByProgram,
  getProgramResourceById,
  getResourcesByType,
  updateProgramResource,
  removeProgramResource,
  getProgramResourceStats,
  checkResourceUnlocked
};