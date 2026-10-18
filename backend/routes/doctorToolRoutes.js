const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const doctorToolController = require('../controllers/doctorToolController');

// @route   POST /api/doctor-tools
// @desc    Create a new doctor tool
// @access  Private (Admin)
router.post('/', [
  authMiddleware, adminMiddleware,
  check('name', 'Name is required').not().isEmpty(),
  check('category', 'Category is required').not().isEmpty(),
  check('description', 'Description is required').not().isEmpty()
], doctorToolController.createDoctorTool);

// @route   GET /api/doctor-tools
// @desc    Get all doctor tools
// @access  Public
router.get('/', doctorToolController.getAllDoctorTools);

// -- Static routes must come before /:id --

// @route   GET /api/doctor-tools/algorithms
// @desc    Get all medical algorithm metadata
// @access  Public
router.get('/algorithms', doctorToolController.getAlgorithms);

// @route   POST /api/doctor-tools/calculate
// @desc    Execute a medical algorithm calculation
// @access  Private
router.post('/calculate', authMiddleware, doctorToolController.calculateTool);

// @route   GET /api/doctor-tools/stats
// @desc    Get doctor tool statistics
// @access  Private (Admin)
router.get('/stats', [authMiddleware, adminMiddleware], doctorToolController.getDoctorToolStats);

// @route   GET /api/doctor-tools/category/:category
// @desc    Get doctor tools by category
// @access  Public
router.get('/category/:category', doctorToolController.getDoctorToolsByCategory);

// -- Param-based routes below --

// @route   GET /api/doctor-tools/:id
// @desc    Get doctor tool by ID
// @access  Public
router.get('/:id', doctorToolController.getDoctorToolById);

// @route   PUT /api/doctor-tools/:id
// @desc    Update doctor tool
// @access  Private (Admin)
router.put('/:id', [authMiddleware, adminMiddleware], doctorToolController.updateDoctorTool);

// @route   PUT /api/doctor-tools/:id/toggle
// @desc    Toggle doctor tool availability
// @access  Private (Admin)
router.put('/:id/toggle', [authMiddleware, adminMiddleware], doctorToolController.toggleDoctorTool);

// @route   DELETE /api/doctor-tools/:id
// @desc    Delete doctor tool
// @access  Private (Admin)
router.delete('/:id', [authMiddleware, adminMiddleware], doctorToolController.deleteDoctorTool);

// @route   POST /api/doctor-tools/:id/use
// @desc    Use a doctor tool (client-side calculation wrapper)
// @access  Private
router.post('/:id/use', authMiddleware, doctorToolController.useDoctorTool);

module.exports = router;
