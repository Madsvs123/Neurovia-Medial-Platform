const Program = require('../models/Program');
const ProgramResource = require('../models/ProgramResource');
const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const ClinicalCase = require('../models/ClinicalCase');
const Flashcard = require('../models/Flashcard');
const User = require('../models/User');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const { validationResult } = require('express-validator');
const { notify, notifyMany } = require('../utils/notify');

// @desc    Create a new program
// @route   POST /api/programs
// @access  Private (Admin/Educator)
const createProgram = async (req, res) => {
  try {
    // Educators can create their own programs, admins can create any programs
    if (req.user.role !== 'admin' && req.user.role !== 'educator') {
      return res.status(403).json({ 
        message: 'Not authorized to create programs'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      title, 
      description, 
      code, 
      programType, 
      discountPercentage = 0, 
      freeAccess = false, 
      maxUsers, 
      expiresAt
    } = req.body;

    // Check if program code already exists
    const existingProgram = await Program.findOne({ code });
    if (existingProgram) {
      return res.status(400).json({ message: 'Program code already exists' });
    }

    // Determine owner based on user role
    let owner, ownerType, isEditableByEducator;
    
    if (req.user.role === 'educator') {
      // Educator creates their own program
      owner = req.user.id;
      ownerType = 'educator';
      isEditableByEducator = true;
    } else if (req.user.role === 'admin') {
      // Admin can create programs owned by site or assign to educators
      const { educatorId } = req.body;
      if (educatorId) {
        // Verify educator exists - try by ID first, then by username
        let educator = await User.findById(educatorId);
        if (!educator) {
          // Try to find by username if not found by ID
          educator = await User.findOne({ username: educatorId });
        }
        if (!educator || educator.role !== 'educator') {
          return res.status(400).json({ message: 'Invalid educator ID or username' });
        }
        owner = educator._id;
        ownerType = 'educator';
        isEditableByEducator = true;
      } else {
        // Site ownership
        owner = null;
        ownerType = 'site';
        isEditableByEducator = false;
      }
    }
    
    // Create program
    const program = new Program({
      title,
      description,
      code,
      programType,
      discountPercentage,
      freeAccess,
      maxUsers,
      expiresAt,
      createdBy: req.user.id,
      owner,
      ownerType,
      isEditableByEducator
    });

    await program.save();

    res.status(201).json({
      success: true,
      program
    });
  } catch (error) {
    console.error('Create program error:', error);
    res.status(500).json({ 
      message: 'Server error creating program',
      error: error.message 
    });
  }
};

// @desc    Get all programs
// @route   GET /api/programs
// @access  Public
const getAllPrograms = async (req, res) => {
  try {
    const { programType, active, search, educatorMode } = req.query;

    let query = {};

    if (programType) {
      query.programType = programType;
    }

    if (active) {
      query.active = active === 'true';
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    // If user is an educator (not admin) AND educatorMode is true, only show their own programs
    // This allows educators to see all programs when in user mode (educatorMode=false or not set)
    if (req.user && req.user.role === 'educator' && educatorMode === 'true') {
      query.owner = req.user._id;
    }
    // Admin sees all — no filter

    const programs = await Program.find(query)
      .populate('owner', 'username email role')
      .populate('createdBy', 'username email role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: programs.length,
      programs
    });
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({ 
      message: 'Server error fetching programs',
      error: error.message 
    });
  }
};

// @desc    Get current educator's programs
// @route   GET /api/programs/my-programs
// @access  Private (Educators)
const getMyPrograms = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'educator') {
      return res.status(403).json({
        message: 'Not authorized to view educator programs'
      });
    }

    const { search, programType, active } = req.query;
    let query = {
      $or: [
        { owner: req.user._id },
        { createdBy: req.user._id }
      ]
    };

    if (programType) {
      query.programType = programType;
    }

    if (active !== undefined) {
      query.active = active === 'true';
    }

    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const programs = await Program.find(query)
      .populate('owner', 'username email role')
      .populate('createdBy', 'username email role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: programs.length,
      programs
    });
  } catch (error) {
    console.error('Get my programs error:', error);
    res.status(500).json({
      message: 'Server error fetching your programs',
      error: error.message
    });
  }
};

// @desc    Get program by ID
// @route   GET /api/programs/:id
// @access  Public
const getProgramById = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id)
      .populate('owner', 'username email role')
      .populate('createdBy', 'username email role');

    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Check if program is inactive — allow access only for owner, educators, and admin
    if (!program.active) {
      const isOwner = program.owner && program.owner._id.toString() === req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      const isEducator = req.user?.role === 'educator';
      if (!isOwner && !isAdmin && !isEducator) {
        return res.status(403).json({ 
          message: 'This program is inactive and cannot be accessed.' 
        });
      }
    }

    res.json({
      success: true,
      program
    });
  } catch (error) {
    console.error('Get program by ID error:', error);
    res.status(500).json({ 
      message: 'Server error fetching program',
      error: error.message 
    });
  }
};

// @desc    Get program by code
// @route   GET /api/programs/code/:code
// @access  Public
const getProgramByCode = async (req, res) => {
  try {
    const program = await Program.findOne({ code: req.params.code });

    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    res.json({
      success: true,
      program
    });
  } catch (error) {
    console.error('Get program by code error:', error);
    res.status(500).json({ 
      message: 'Server error fetching program',
      error: error.message 
    });
  }
};

// @desc    Update program
// @route   PUT /api/programs/:id
// @access  Private (Admin)
const updateProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Check ownership permissions
    if (req.user.role === 'admin') {
      // Admin can update any program
      // Allow updating owner information
      const { educatorId } = req.body;
      if (educatorId !== undefined) {
        if (educatorId) {
          // Try to find educator by ID first, then by username
          let educator = await User.findById(educatorId);
          if (!educator) {
            educator = await User.findOne({ username: educatorId });
          }
          if (!educator || educator.role !== 'educator') {
            return res.status(400).json({ message: 'Invalid educator ID or username' });
          }
          req.body.owner = educator._id;
          req.body.ownerType = 'educator';
          req.body.isEditableByEducator = true;
        } else {
          req.body.owner = null;
          req.body.ownerType = 'site';
          req.body.isEditableByEducator = false;
        }
      }
    } else if (req.user.role === 'educator') {
      // Educators can update their own programs or programs they're assigned to
      const isOwner = program.owner && program.owner.toString() === req.user._id.toString();
      const isAssigned = program.educators && program.educators.some((e) => e.toString() === req.user._id.toString());
      if (!isOwner && !isAssigned) {
        return res.status(403).json({ 
          message: 'Not authorized to update this program'
        });
      }
      // Educators cannot change ownership
      delete req.body.owner;
      delete req.body.ownerType;
      delete req.body.isEditableByEducator;
    } else {
      return res.status(403).json({ 
        message: 'Not authorized to update this program'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updatedProgram = await Program.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      program: updatedProgram
    });
  } catch (error) {
    console.error('Update program error:', error);
    res.status(500).json({ 
      message: 'Server error updating program',
      error: error.message 
    });
  }
};

// @desc    Toggle program active status
// @route   PUT /api/programs/:id/toggle
// @access  Private (Admin)
const toggleProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Check ownership permissions for toggling
    if (req.user.role === 'admin') {
      // Admin can toggle any program
    } else if (req.user.role === 'educator') {
      // Educators can only toggle their own programs that are editable
      if (!program.owner || program.owner.toString() !== req.user._id.toString() || !program.isEditableByEducator) {
        return res.status(403).json({ 
          message: 'Not authorized to toggle this program'
        });
      }
    } else {
      return res.status(403).json({ 
        message: 'Not authorized to toggle this program'
      });
    }

    // Toggle active status
    program.active = !program.active;
    await program.save();

    // Notify all enrolled users when program toggles
    try {
      const enrollments = await ProgramEnrollment.find({ programId: program._id }).populate('userId');
      const enrolledUsers = enrollments
        .filter(e => e.userId)
        .map(e => e.userId);
      if (enrolledUsers.length > 0) {
        await notifyMany(enrolledUsers, {
          title: `Program ${program.active ? 'Activated' : 'Deactivated'}`,
          message: `The program '${program.title}' has been ${program.active ? 'activated' : 'deactivated'} by ${req.user.username || req.user.email}`,
          type: 'program',
          link: `/programs/${program._id}`,
          entityType: 'program',
          entityId: program._id,
          actorId: req.user.id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify enrolled users about program toggle:', notifyErr.message);
    }

    res.json({
      success: true,
      program,
      message: `Program ${program.active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Toggle program error:', error);
    res.status(500).json({ 
      message: 'Server error toggling program',
      error: error.message 
    });
  }
};

// @desc    Delete program
// @route   DELETE /api/programs/:id
// @access  Private (Admin)
const deleteProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Check ownership permissions for deletion
    if (req.user.role === 'admin') {
      // Admin can delete any program
    } else if (req.user.role === 'educator') {
      // Educators can only delete their own programs that are editable
      if (!program.owner || program.owner.toString() !== req.user._id.toString() || !program.isEditableByEducator) {
        return res.status(403).json({ 
          message: 'Not authorized to delete this program'
        });
      }
    } else {
      return res.status(403).json({ 
        message: 'Not authorized to delete this program'
      });
    }

    // Delete associated program resources
    await ProgramResource.deleteMany({ programId: program._id });

    // Notify all enrolled users about program deletion
    try {
      const enrollments = await ProgramEnrollment.find({ programId: program._id }).populate('userId');
      const enrolledUsers = enrollments
        .filter(e => e.userId)
        .map(e => e.userId);
      if (enrolledUsers.length > 0) {
        await notifyMany(enrolledUsers, {
          title: 'Program Deleted',
          message: `The program '${program.title}' has been deleted`,
          type: 'program',
          entityType: 'program',
          entityId: program._id,
          actorId: req.user.id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify enrolled users about program deletion:', notifyErr.message);
    }

    await Program.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Program and associated resources deleted successfully'
    });
  } catch (error) {
    console.error('Delete program error:', error);
    res.status(500).json({ 
      message: 'Server error deleting program',
      error: error.message 
    });
  }
};

// @desc    Add resource to program
// @route   POST /api/programs/:id/resources
// @access  Private (Admin)
const addProgramResource = async (req, res) => {
  try {
    const { resourceType, resourceId } = req.body;

    // Check if program exists
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Check authorization: admin can add to any program, educator can add only to their own
    if (req.user.role === 'admin') {
      // Admins can add any resource to any program
    } else if (req.user.role === 'educator') {
      // Educators can only add to their own programs
      if (program.owner.toString() !== req.user.id && program.createdBy.toString() !== req.user.id) {
        return res.status(403).json({ 
          message: 'Not authorized to add resources to this program'
        });
      }

      // Educators can only add resources they own
      let owned = false;
      if (resourceType === 'course') {
        const course = await Course.findById(resourceId).select('instructorId');
        if (course && course.instructorId.toString() === req.user.id) owned = true;
      } else if (resourceType === 'quiz') {
        const quiz = await Quiz.findById(resourceId).select('createdBy');
        if (quiz && quiz.createdBy.toString() === req.user.id) owned = true;
      } else if (resourceType === 'clinical_case') {
        const cc = await ClinicalCase.findById(resourceId).select('createdBy');
        if (cc && cc.createdBy.toString() === req.user.id) owned = true;
      } else if (resourceType === 'flashcard') {
        const card = await Flashcard.findById(resourceId).select('userId');
        if (card && card.userId.toString() === req.user.id) owned = true;
      }

      if (!owned) {
        return res.status(403).json({ 
          message: 'Not authorized — you can only add resources you created'
        });
      }
    } else {
      return res.status(403).json({ 
        message: 'Not authorized to add program resources'
      });
    }

    // Create program resource
    const programResource = new ProgramResource({
      programId: program._id,
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

// @desc    Get program resources
// @route   GET /api/programs/:id/resources
// @access  Public
const getProgramResources = async (req, res) => {
  try {
    // Fetch the program to check if it's active
    const program = await Program.findById(req.params.id).select('active owner');
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Check if program is inactive — allow access only for owner, educators, and admin
    if (!program.active) {
      const isOwner = program.owner && program.owner.toString() === req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      const isEducator = req.user?.role === 'educator';
      if (!isOwner && !isAdmin && !isEducator) {
        return res.status(403).json({ 
          message: 'This program is inactive and its resources cannot be accessed.' 
        });
      }
    }

    const programResources = await ProgramResource.find({
      programId: req.params.id
    });

    // Manually populate resourceId based on resourceType since schema has no ref
    const populated = await Promise.all(programResources.map(async (res) => {
      const doc = res.toObject();
      if (res.resourceType === 'course') {
        const course = await Course.findById(res.resourceId).select('title slug');
        doc.resourceId = course || { _id: res.resourceId, title: 'Course (removed)' };
      } else if (res.resourceType === 'quiz') {
        const quiz = await Quiz.findById(res.resourceId).select('title');
        doc.resourceId = quiz || { _id: res.resourceId, title: 'Quiz (removed)' };
      } else if (res.resourceType === 'clinical_case') {
        const cc = await ClinicalCase.findById(res.resourceId).select('title');
        doc.resourceId = cc || { _id: res.resourceId, title: 'Clinical Case (removed)' };
      } else if (res.resourceType === 'flashcard') {
        const card = await Flashcard.findById(res.resourceId).select('topic front');
        if (card) {
          doc.resourceId = { _id: card._id, title: card.topic };
        } else {
          doc.resourceId = { _id: res.resourceId, title: 'Flashcard (removed)' };
        }
      }
      return doc;
    }));

    res.json({
      success: true,
      count: populated.length,
      programResources: populated
    });
  } catch (error) {
    console.error('Get program resources error:', error);
    res.status(500).json({ 
      message: 'Server error fetching program resources',
      error: error.message 
    });
  }
};

// @desc    Remove resource from program
// @route   DELETE /api/programs/resources/:resourceId
// @access  Private (Admin)
const removeProgramResource = async (req, res) => {
  try {
    const programResource = await ProgramResource.findById(req.params.resourceId);

    if (!programResource) {
      return res.status(404).json({ message: 'Program resource not found' });
    }

    // Get the program to check authorization
    const program = await Program.findById(programResource.programId);
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Check authorization: admin can remove from any program, educator can remove only from their own
    if (req.user.role === 'admin') {
      // Admins can remove any resource from any program
    } else if (req.user.role === 'educator') {
      // Educators can only remove from their own programs
      if (program.owner.toString() !== req.user._id.toString() && program.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ 
          message: 'Not authorized to remove resources from this program'
        });
      }
    } else {
      return res.status(403).json({ 
        message: 'Not authorized to remove program resources'
      });
    }

    await ProgramResource.findByIdAndDelete(req.params.resourceId);

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

// @desc    Get program statistics
// @route   GET /api/programs/:id/stats
// @access  Private (Admin)
const getProgramStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view program stats'
      });
    }

    const program = await Program.findById(req.params.id);

    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    const resourceCount = await ProgramResource.countDocuments({
      programId: program._id
    });

    res.json({
      success: true,
      stats: {
        programType: program.programType,
        discountPercentage: program.discountPercentage,
        freeAccess: program.freeAccess,
        maxUsers: program.maxUsers,
        currentUsers: program.currentUsers,
        resourceCount,
        active: program.active,
        createdAt: program.createdAt,
        expiresAt: program.expiresAt
      }
    });
  } catch (error) {
    console.error('Get program stats error:', error);
    res.status(500).json({ 
      message: 'Server error fetching program stats',
      error: error.message 
    });
  }
};

// @desc    Get programs owned by a specific educator
// @route   GET /api/programs/educator/:educatorId
// @access  Private
const getEducatorPrograms = async (req, res) => {
  try {
    const educatorId = req.params.educatorId;
    
    // Check if requesting user has permission
    if (req.user.role !== 'admin' && req.user._id.toString() !== educatorId) {
      return res.status(403).json({ 
        message: 'Not authorized to view these programs'
      });
    }
    
    // Verify educator exists
    const educator = await User.findById(educatorId);
    if (!educator || educator.role !== 'educator') {
      return res.status(404).json({ message: 'Educator not found' });
    }
    
    // Get programs owned by this educator
    const programs = await Program.find({ 
      owner: educatorId,
      ownerType: 'educator'
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: programs.length,
      programs
    });
  } catch (error) {
    console.error('Get educator programs error:', error);
    res.status(500).json({ 
      message: 'Server error fetching educator programs',
      error: error.message 
    });
  }
};

// @desc    Add educator to a program
// @route   POST /api/programs/:id/educators
// @access  Private (Admin or Educator owner/assigned)
const addEducator = async (req, res) => {
  try {
    const { educatorId } = req.body;
    if (!educatorId) {
      return res.status(400).json({ message: 'Educator ID is required' });
    }

    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Authorization: admin always allowed; educators allowed if owner or assigned
    if (req.user.role !== 'admin') {
      const isOwner = program.owner && program.owner.toString() === req.user._id.toString();
      const isAssigned = program.educators && program.educators.some((e) => e.toString() === req.user._id.toString());
      if (!isOwner && !isAssigned) {
        return res.status(403).json({ message: 'Not authorized to manage educators for this program' });
      }
    }

    const educator = await User.findById(educatorId);
    if (!educator || educator.role !== 'educator') {
      return res.status(400).json({ message: 'User not found or not an educator' });
    }

    // Check if already added
    if (program.educators.some((e) => e.toString() === educatorId)) {
      return res.status(400).json({ message: 'Educator already assigned to this program' });
    }

    // Check if trying to add the program owner
    if (program.owner && program.owner.toString() === educatorId) {
      return res.status(400).json({ message: 'Educator is already the program owner' });
    }

    program.educators.push(educator._id);
    program.isEditableByEducator = true;
    if (program.ownerType !== 'educator') {
      program.ownerType = 'educator';
    }
    await program.save();

    const populated = await Program.findById(program._id).populate('educators', 'username name email');

    res.json({
      success: true,
      educators: populated.educators,
      message: 'Educator added to program'
    });

    // Notify educator being added
    try {
      await notify({
        userId: educatorId,
        title: 'Assigned to Program',
        message: `You have been assigned as an educator to program "${program.title}"`,
        type: 'program',
        link: `/educator/programs/${program._id}`,
        entityType: 'program',
        entityId: program._id,
        actorId: req.user.id,
      });
    } catch (notifyErr) {
      console.error('Failed to notify educator about program assignment:', notifyErr.message);
    }
  } catch (error) {
    console.error('Add educator error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Remove educator from a program
// @route   DELETE /api/programs/:id/educators/:educatorId
// @access  Private (Admin or Educator owner only)
const removeEducator = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Authorization: admin always allowed; educators can remove themselves or be removed by owner
    if (req.user.role !== 'admin') {
      const isOwner = program.owner && program.owner.toString() === req.user._id.toString();
      const isSelf = educatorId === req.user._id.toString();
      if (!isOwner && !isSelf) {
        return res.status(403).json({ message: 'Not authorized to remove this educator' });
      }
    }

    const educatorId = req.params.educatorId;
    program.educators = program.educators.filter((e) => e.toString() !== educatorId);
    await program.save();

    res.json({
      success: true,
      message: 'Educator removed from program'
    });

    // Notify educator being removed
    try {
      await notify({
        userId: educatorId,
        title: 'Removed from Program',
        message: `You have been removed from program "${program.title}"`,
        type: 'program',
        entityType: 'program',
        entityId: program._id,
        actorId: req.user.id,
      });
    } catch (notifyErr) {
      console.error('Failed to notify educator about program removal:', notifyErr.message);
    }
  } catch (error) {
    console.error('Remove educator error:', error);
    console.error('Remove educator error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createProgram,
  getAllPrograms,
  getMyPrograms,
  getProgramById,
  getProgramByCode,
  updateProgram,
  toggleProgram,
  deleteProgram,
  addProgramResource,
  getProgramResources,
  removeProgramResource,
  getProgramStats,
  getEducatorPrograms,
  addEducator,
  removeEducator
};