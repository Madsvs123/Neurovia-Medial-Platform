const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const educatorMiddleware = require('../middleware/educatorMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const medicationController = require('../controllers/medicationController');

// @route   POST /api/medications
// @desc    Create a new medication entry
// @access  Private (Admin/Educator)
router.post('/', [
  authMiddleware,
  educatorMiddleware,
  check('name', 'Name is required').not().isEmpty(),
  check('genericName', 'Generic name is required').not().isEmpty(),
  check('drugClass', 'Drug class is required').not().isEmpty(),
  check('indications', 'Indications are required').not().isEmpty()
], medicationController.createMedication);

// @route   GET /api/medications
// @desc    Get all medications
// @access  Public
router.get('/', medicationController.getAllMedications);

// @route   GET /api/medications/:id
// @desc    Get medication by ID
// @access  Public
router.get('/:id', medicationController.getMedicationById);

// @route   GET /api/medications/class/:drugClass
// @desc    Get medications by drug class
// @access  Public
router.get('/class/:drugClass', medicationController.getMedicationsByClass);

// @route   GET /api/medications/search-by-indication
// @desc    Search medications by indication
// @access  Public
router.get('/search-by-indication', medicationController.searchMedicationsByIndication);

// @route   PUT /api/medications/:id
// @desc    Update medication
// @access  Private (Admin/Educator)
router.put('/:id', [authMiddleware, educatorMiddleware], medicationController.updateMedication);

// @route   DELETE /api/medications/:id
// @desc    Delete medication
// @access  Private (Admin)
router.delete('/:id', [authMiddleware, adminMiddleware], medicationController.deleteMedication);

// @route   GET /api/medications/stats
// @desc    Get medication statistics
// @access  Private (Admin)
router.get('/stats', [authMiddleware, adminMiddleware], medicationController.getMedicationStats);

// @route   GET /api/medications/:id/interactions
// @desc    Get medication interactions
// @access  Public
router.get('/:id/interactions', medicationController.getMedicationInteractions);

module.exports = router;