const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const educatorMiddleware = require('../middleware/educatorMiddleware');
const optionalAuth = require('../middleware/optionalAuth');
const programController = require('../controllers/programController');

// @route   POST /api/programs
// @desc    Create a new program
// @access  Private (Admin/Educator)
router.post('/', [
  authMiddleware,
  check('title', 'Title is required').not().isEmpty(),
  check('description', 'Description is required').not().isEmpty(),
  check('code', 'Program code is required').not().isEmpty(),
  check('programType', 'Program type is required').not().isEmpty()
], programController.createProgram);

// @route   GET /api/programs
// @desc    Get all programs (educators see only their own)
// @access  Public (with optional auth for role-based filtering)
router.get('/', optionalAuth, programController.getAllPrograms);

// @route   GET /api/programs/my-programs
// @desc    Get current educator's programs
// @access  Private (Educators)
router.get('/my-programs', [authMiddleware], programController.getMyPrograms);

// @route   GET /api/programs/:id
// @desc    Get program by ID
// @access  Public
router.get('/:id', programController.getProgramById);

// @route   GET /api/programs/code/:code
// @desc    Get program by code
// @access  Public
router.get('/code/:code', programController.getProgramByCode);

// @route   GET /api/programs/educator/:educatorId
// @desc    Get programs owned by a specific educator
// @access  Private (Admin) or Public for own programs
router.get('/educator/:educatorId', [authMiddleware], programController.getEducatorPrograms);

// @route   PUT /api/programs/:id
// @desc    Update program
// @access  Private (Admin/Educator with ownership check)
router.put('/:id', [authMiddleware], programController.updateProgram);

// @route   PUT /api/programs/:id/toggle
// @desc    Toggle program active status
// @access  Private (Admin/Educator with ownership check)
router.put('/:id/toggle', [authMiddleware], programController.toggleProgram);

// @route   DELETE /api/programs/:id
// @desc    Delete program
// @access  Private (Admin/Educator with ownership check)
router.delete('/:id', [authMiddleware], programController.deleteProgram);

// @route   POST /api/programs/:id/resources
// @desc    Add resource to program
// @access  Private (Admin/Educator)
router.post('/:id/resources', [
  authMiddleware,
  educatorMiddleware,
  check('resourceType', 'Resource type is required').not().isEmpty(),
  check('resourceId', 'Resource ID is required').not().isEmpty()
], programController.addProgramResource);

// @route   GET /api/programs/:id/resources
// @desc    Get program resources
// @access  Public
router.get('/:id/resources', programController.getProgramResources);

// @route   DELETE /api/programs/resources/:resourceId
// @desc    Remove resource from program
// @access  Private (Admin/Educator)
router.delete('/resources/:resourceId', [authMiddleware, educatorMiddleware], programController.removeProgramResource);

// @route   POST /api/programs/:id/educators
// @desc    Add educator to program
// @access  Private (Admin or Educator owner/assigned)
router.post('/:id/educators', [authMiddleware, educatorMiddleware], programController.addEducator);

// @route   DELETE /api/programs/:id/educators/:educatorId
// @desc    Remove educator from program
// @access  Private (Admin or Educator owner only)
router.delete('/:id/educators/:educatorId', [authMiddleware], programController.removeEducator);

// @route   GET /api/programs/:id/stats
// @desc    Get program statistics
// @access  Private (Admin)
router.get('/:id/stats', [authMiddleware, adminMiddleware], programController.getProgramStats);

module.exports = router;
