const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const programResourceController = require('../controllers/programResourceController');

// @route   POST /api/program-resources
// @desc    Add resource to program
// @access  Private (Admin)
router.post('/', [
  authMiddleware,
  adminMiddleware,
  check('programId', 'Program ID is required').not().isEmpty(),
  check('resourceType', 'Resource type is required').not().isEmpty(),
  check('resourceId', 'Resource ID is required').not().isEmpty()
], programResourceController.addProgramResource);

// @route   GET /api/program-resources/program/:programId
// @desc    Get all resources for a program
// @access  Public
router.get('/program/:programId', programResourceController.getResourcesByProgram);

// @route   GET /api/program-resources/:id
// @desc    Get program resource by ID
// @access  Public
router.get('/:id', programResourceController.getProgramResourceById);

// @route   GET /api/program-resources/type/:resourceType
// @desc    Get resources by type
// @access  Public
router.get('/type/:resourceType', programResourceController.getResourcesByType);

// @route   PUT /api/program-resources/:id
// @desc    Update program resource
// @access  Private (Admin)
router.put('/:id', [authMiddleware, adminMiddleware], programResourceController.updateProgramResource);

// @route   DELETE /api/program-resources/:id
// @desc    Remove resource from program
// @access  Private (Admin)
router.delete('/:id', [authMiddleware, adminMiddleware], programResourceController.removeProgramResource);

// @route   GET /api/program-resources/stats
// @desc    Get program resource statistics
// @access  Private (Admin)
router.get('/stats', [authMiddleware, adminMiddleware], programResourceController.getProgramResourceStats);

// @route   GET /api/program-resources/check-unlocked
// @desc    Check if resource is unlocked for user
// @access  Private
router.get('/check-unlocked', authMiddleware, programResourceController.checkResourceUnlocked);

module.exports = router;