const ProgramEnrollment = require('../models/ProgramEnrollment');
const Program = require('../models/Program');
const User = require('../models/User');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const { notify, notifyMany } = require('../utils/notify');

// @desc    Enroll user in a program using access code
// @route   POST /api/program-enrollments
// @access  Private
const enrollInProgram = async (req, res) => {
  try {
    const { programCode } = req.body;

    if (!programCode) {
      return res.status(400).json({ message: 'Program code is required' });
    }

    // Find program by code
    const program = await Program.findOne({ code: programCode });

    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    if (!program.active) {
      return res.status(400).json({ message: 'Program is not active' });
    }

    if (program.expiresAt && new Date() > program.expiresAt) {
      return res.status(400).json({ message: 'Program has expired' });
    }

    if (program.maxUsers && program.currentUsers >= program.maxUsers) {
      return res.status(400).json({ message: 'Program has reached maximum capacity' });
    }

    // Check if user is program owner - prevent self-enrollment
    if (program.owner && program.owner.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: 'You cannot enroll in your own program' });
    }
    if (program.createdBy && program.createdBy.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: 'You cannot enroll in your own program' });
    }

    // Check if user is already enrolled
    const existingEnrollment = await ProgramEnrollment.findOne({
      userId: req.user.id,
      programId: program._id
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: 'You are already enrolled in this program' });
    }

    // Create enrollment
    const enrollment = new ProgramEnrollment({
      userId: req.user.id,
      programId: program._id,
      joinedAt: new Date(),
      accessExpiration: program.expiresAt
    });

    await enrollment.save();

    // Update program user count
    program.currentUsers += 1;
    await program.save();

    // Notify the enrolled user
    try {
      await notify({
        userId: req.user.id,
        title: 'Enrolled in Program',
        message: `You have successfully enrolled in the program '${program.title}'`,
        type: 'program',
        link: `/programs/${program._id}`,
        entityType: 'program',
        entityId: program._id,
        actorId: req.user.id,
      });
    } catch (notifyErr) {
      console.error('Failed to notify enrolled user:', notifyErr.message);
    }

    // Notify admins about enrollment
    try {
      const admins = await User.find({ role: 'admin' });
      if (admins.length > 0) {
        await notifyMany(admins, {
          title: 'New Program Enrollment',
          message: `User ${req.user.username || req.user.email} has enrolled in program '${program.title}'`,
          type: 'program',
          link: `/admin/programs/${program._id}/enrollments`,
          entityType: 'program',
          entityId: program._id,
          actorId: req.user.id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins about enrollment:', notifyErr.message);
    }

    res.status(201).json({
      success: true,
      enrollment,
      program,
      message: 'Successfully enrolled in program'
    });
  } catch (error) {
    console.error('Enroll in program error:', error);
    res.status(500).json({ 
      message: 'Server error enrolling in program',
      error: error.message 
    });
  }
};

// @desc    Get all enrollments for current user
// @route   GET /api/program-enrollments/me
// @access  Private
const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await ProgramEnrollment.find({ userId: req.user.id })
      .populate('programId', 'title description code programType expiresAt')
      .sort({ joinedAt: -1 });

    res.json({
      success: true,
      count: enrollments.length,
      enrollments
    });
  } catch (error) {
    console.error('Get my enrollments error:', error);
    res.status(500).json({ 
      message: 'Server error fetching enrollments',
      error: error.message 
    });
  }
};

// @desc    Get all enrollments for a program (Admin only)
// @route   GET /api/program-enrollments/program/:programId
// @access  Private (Admin)
const getEnrollmentsByProgram = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'educator') {
      return res.status(403).json({ 
        message: 'Not authorized to view program enrollments'
      });
    }

    const programId = req.params.programId;

    // Get ProgramEnrollment records
    const enrollments = await ProgramEnrollment.find({ programId })
      .populate('userId', 'username email role status')
      .sort({ joinedAt: -1 });

    // Also get legacy enrollments (users who enrolled via user.enrolledPrograms without a ProgramEnrollment doc)
    const enrolledUserIds = enrollments.filter(e => e.userId).map(e => e.userId._id);
    const legacyUsers = await User.find({
      enrolledPrograms: programId,
      _id: { $nin: enrolledUserIds }
    }).select('username email role status');

    const legacyEnrollments = legacyUsers.map(u => ({
      _id: u._id + '_legacy',
      userId: u,
      programId,
      joinedAt: u.createdAt || new Date()
    }));

    const all = [...enrollments, ...legacyEnrollments].sort(
      (a, b) => new Date(b.joinedAt) - new Date(a.joinedAt)
    );

    res.json({
      success: true,
      count: all.length,
      enrollments: all
    });
  } catch (error) {
    console.error('Get enrollments by program error:', error);
    res.status(500).json({ 
      message: 'Server error fetching program enrollments',
      error: error.message 
    });
  }
};

// @desc    Get enrollment by ID
// @route   GET /api/program-enrollments/:id
// @access  Private
const getEnrollmentById = async (req, res) => {
  try {
    const enrollment = await ProgramEnrollment.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('programId', 'title description code programType')
    .populate('unlockedResources.resourceId');

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    res.json({
      success: true,
      enrollment
    });
  } catch (error) {
    console.error('Get enrollment by ID error:', error);
    res.status(500).json({ 
      message: 'Server error fetching enrollment',
      error: error.message 
    });
  }
};

// @desc    Check if user is enrolled in a program
// @route   GET /api/program-enrollments/check/:programId
// @access  Private
const checkEnrollment = async (req, res) => {
  try {
    const enrollment = await ProgramEnrollment.findOne({
      userId: req.user.id,
      programId: req.params.programId
    });

    const isEnrolled = !!enrollment;
    const hasAccess = isEnrolled && (!enrollment.accessExpiration || new Date() <= enrollment.accessExpiration);

    res.json({
      success: true,
      isEnrolled,
      hasAccess,
      enrollment
    });
  } catch (error) {
    console.error('Check enrollment error:', error);
    res.status(500).json({ 
      message: 'Server error checking enrollment',
      error: error.message 
    });
  }
};

// @desc    Update enrollment (Admin only)
// @route   PUT /api/program-enrollments/:id
// @access  Private (Admin)
const updateEnrollment = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to update enrollments'
      });
    }

    const enrollment = await ProgramEnrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updatedEnrollment = await ProgramEnrollment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      enrollment: updatedEnrollment
    });
  } catch (error) {
    console.error('Update enrollment error:', error);
    res.status(500).json({ 
      message: 'Server error updating enrollment',
      error: error.message 
    });
  }
};

// @desc    Unenroll from program (User)
// @route   DELETE /api/program-enrollments/me/:programId
// @access  Private
const unenrollFromProgram = async (req, res) => {
  try {
    const programId = req.params.programId;

    // Find and remove enrollment
    const enrollment = await ProgramEnrollment.findOneAndDelete({
      userId: req.user.id,
      programId: programId
    });

    // Remove program from user's enrolledPrograms
    const user = await User.findById(req.user.id);
    let wasEnrolledInUser = false;
    if (user && user.enrolledPrograms.some(id => id.toString() === programId.toString())) {
      user.enrolledPrograms = user.enrolledPrograms.filter(id => id.toString() !== programId.toString());
      await user.save();
      wasEnrolledInUser = true;
    }

    if (!enrollment && !wasEnrolledInUser) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Update program user count
    const program = await Program.findById(programId);
    if (program && program.currentUsers > 0 && (enrollment || wasEnrolledInUser)) {
      // Only decrement if we actually removed an enrollment
      program.currentUsers = Math.max(0, program.currentUsers - 1);
      await program.save();
    }

    res.json({
      success: true,
      message: 'Successfully unenrolled from program'
    });
  } catch (error) {
    console.error('Unenroll from program error:', error);
    res.status(500).json({ 
      message: 'Server error unenrolling from program',
      error: error.message 
    });
  }
};

// @desc    Remove user from program (Admin or Educator for their own programs)
// @route   DELETE /api/program-enrollments/:id
// @access  Private (Admin or Educator)
const removeFromProgram = async (req, res) => {
  try {
    const id = req.params.id;

    // Handle legacy enrollment IDs created in getEnrollmentsByProgram (e.g. "<userId>_legacy").
    if (!mongoose.Types.ObjectId.isValid(id) || String(id).endsWith('_legacy')) {
      const parts = String(id).split('_');
      const realUserId = parts[0];

      if (!mongoose.Types.ObjectId.isValid(realUserId)) {
        return res.status(400).json({ message: 'Invalid legacy enrollment id' });
      }

      // Find the user and the program they are enrolled in that the requester owns
      const user = await User.findById(realUserId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Find a program from the user's enrolledPrograms that is owned by the requester (educator)
      const program = await Program.findOne({ _id: { $in: user.enrolledPrograms }, owner: req.user._id });
      if (!program) {
        return res.status(404).json({ message: 'Program not found or not owned by you' });
      }

      // Authorization: admins can remove; educators only for their own programs
      const userId = req.user && (req.user._id ? req.user._id.toString() : (req.user.id ? req.user.id.toString() : null));
      const ownerId = program && program.owner ? (program.owner._id ? program.owner._id.toString() : program.owner.toString()) : null;
      const isAuthorized = req.user.role === 'admin' || (req.user.role === 'educator' && ownerId && userId && ownerId === userId);
      if (!isAuthorized) {
        return res.status(403).json({ message: 'Not authorized to remove users from this program' });
      }

      // Remove program from user's enrolledPrograms
      const wasEnrolled = user.enrolledPrograms.some(pid => pid.toString() === program._id.toString());
      if (wasEnrolled) {
        user.enrolledPrograms = user.enrolledPrograms.filter(pid => pid.toString() !== program._id.toString());
        await user.save();
      } else {
        return res.status(404).json({ message: 'Enrollment not found' });
      }

      // Notify the removed user
      try {
        await notify({
          userId: user._id.toString(),
          title: 'Removed from Program',
          message: `You have been removed from the program '${program.title}'`,
          type: 'program',
          entityType: 'program',
          entityId: program._id,
          actorId: req.user.id || (req.user._id && req.user._id.toString()),
        });
      } catch (notifyErr) {
        console.error('Failed to notify removed user:', notifyErr.message);
      }

      // Decrement program count
      if (program.currentUsers && program.currentUsers > 0) {
        program.currentUsers = Math.max(0, program.currentUsers - 1);
        await program.save();
      }

      return res.json({ success: true, message: 'User removed from program successfully' });
    }

    // Normal (ProgramEnrollment document) flow
    const enrollment = await ProgramEnrollment.findById(id);

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Check authorization
    const program = await Program.findById(enrollment.programId);
    
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Allow admin to remove any user
    // Allow educator to remove users from their own programs
    // Normalize IDs to strings for reliable comparison (req.user may be a Mongoose doc)
    const userId = req.user && (req.user._id ? req.user._id.toString() : (req.user.id ? req.user.id.toString() : null));
    const ownerId = program && program.owner ? (program.owner._id ? program.owner._id.toString() : program.owner.toString()) : null;
    const isAuthorized = req.user.role === 'admin' || 
                        (req.user.role === 'educator' && ownerId && userId && ownerId === userId);
    
    if (!isAuthorized) {
      return res.status(403).json({ 
        message: 'Not authorized to remove users from this program'
      });
    }

    // Notify the removed user (handle both ObjectId and populated user)
    const removedUserId = enrollment.userId?._id?.toString() || enrollment.userId?.toString();
    try {
      if (removedUserId) {
        await notify({
          userId: removedUserId,
          title: 'Removed from Program',
          message: `You have been removed from the program '${program.title}'`,
          type: 'program',
          entityType: 'program',
          entityId: program._id,
          actorId: req.user.id || req.user._id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify removed user:', notifyErr.message);
    }

    // Update program user count
    program.currentUsers = Math.max(0, (program.currentUsers || 0) - 1);
    await program.save();

    await ProgramEnrollment.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'User removed from program successfully'
    });
  } catch (error) {
    console.error('Remove from program error:', error);
    res.status(500).json({ 
      message: 'Server error removing user from program',
      error: error.message 
    });
  }
};

// @desc    Get enrollment statistics (Admin only)
// @route   GET /api/program-enrollments/stats
// @access  Private (Admin)
const getEnrollmentStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view enrollment statistics'
      });
    }

    const totalEnrollments = await ProgramEnrollment.countDocuments();
    const activeEnrollments = await ProgramEnrollment.countDocuments({
      accessExpiration: { $gte: new Date() }
    });

    // Get enrollment distribution by program type
    const programTypeStats = await ProgramEnrollment.aggregate([
      { $lookup: {
        from: 'programs',
        localField: 'programId',
        foreignField: '_id',
        as: 'program'
      }},
      { $unwind: '$program' },
      { $group: {
        _id: '$program.programType',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      stats: {
        totalEnrollments,
        activeEnrollments,
        expiredEnrollments: totalEnrollments - activeEnrollments,
        programTypes: programTypeStats
      }
    });
  } catch (error) {
    console.error('Get enrollment stats error:', error);
    res.status(500).json({ 
      message: 'Server error fetching enrollment stats',
      error: error.message 
    });
  }
};

// @desc    Enroll a user directly in a program
// @route   POST /api/program-enrollments/admin/:programId
// @access  Private (Admin or Educator for their own programs)
const adminEnrollUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const { programId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Verify program exists
    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Check authorization: admin always allowed; educator only for own programs
    if (req.user.role !== 'admin') {
      const isOwner = program.owner && program.owner.toString() === req.user._id.toString();
      const isAssigned = program.educators && program.educators.some((e) => e.toString() === req.user._id.toString());
      if (!isOwner && !isAssigned) {
        return res.status(403).json({ message: 'Not authorized to enroll users in this program' });
      }
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already enrolled
    const existing = await ProgramEnrollment.findOne({ userId, programId });
    if (existing) {
      return res.status(400).json({ message: 'User is already enrolled in this program' });
    }

    // Create enrollment
    const enrollment = new ProgramEnrollment({
      userId,
      programId,
      joinedAt: new Date(),
      accessExpiration: program.expiresAt
    });
    await enrollment.save();

    // Update program user count
    program.currentUsers += 1;
    await program.save();

    // Notify the enrolled user
    try {
      await notify({
        userId,
        title: 'Enrolled in Program',
        message: `You have been enrolled in the program '${program.title}' by ${req.user.username || req.user.email}`,
        type: 'program',
        link: `/programs/${program._id}`,
        entityType: 'program',
        entityId: program._id,
        actorId: req.user.id,
      });
    } catch (notifyErr) {
      console.error('Failed to notify enrolled user:', notifyErr.message);
    }

    res.status(201).json({
      success: true,
      enrollment,
      message: 'User enrolled successfully'
    });
  } catch (error) {
    console.error('Admin enroll user error:', error);
    res.status(500).json({
      message: 'Server error enrolling user',
      error: error.message
    });
  }
};

// @desc    Add unlocked resources to enrollment
// @route   POST /api/program-enrollments/:id/resources
// @access  Private (Admin)
const addUnlockedResources = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to add unlocked resources'
      });
    }

    const { resources } = req.body;

    if (!resources || !Array.isArray(resources)) {
      return res.status(400).json({ message: 'Resources array is required' });
    }

    const enrollment = await ProgramEnrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    // Add resources to unlocked list
    resources.forEach(resource => {
      const exists = enrollment.unlockedResources.some(r => 
        r.resourceType === resource.resourceType && 
        r.resourceId.toString() === resource.resourceId.toString()
      );
      
      if (!exists) {
        enrollment.unlockedResources.push(resource);
      }
    });

    await enrollment.save();

    res.json({
      success: true,
      enrollment,
      message: 'Resources added to enrollment successfully'
    });
  } catch (error) {
    console.error('Add unlocked resources error:', error);
    res.status(500).json({ 
      message: 'Server error adding unlocked resources',
      error: error.message 
    });
  }
};

module.exports = {
  enrollInProgram,
  getMyEnrollments,
  getEnrollmentsByProgram,
  getEnrollmentById,
  checkEnrollment,
  updateEnrollment,
  unenrollFromProgram,
  removeFromProgram,
  getEnrollmentStats,
  addUnlockedResources,
  adminEnrollUser
};