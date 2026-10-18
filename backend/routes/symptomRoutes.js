const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const educatorMiddleware = require('../middleware/educatorMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const symptomController = require('../controllers/symptomController');

// @route   POST /api/symptoms
// @desc    Create a new symptom entry
// @access  Private (Admin/Educator)
router.post('/', [
  authMiddleware,
  educatorMiddleware,
  check('name', 'Name is required').not().isEmpty()
], symptomController.createSymptom);

// @route   GET /api/symptoms
// @desc    Get all symptoms
// @access  Public
router.get('/', symptomController.getAllSymptoms);

// @route   GET /api/symptoms/:id
// @desc    Get symptom by ID
// @access  Public
router.get('/:id', symptomController.getSymptomById);

// @route   GET /api/symptoms/specialty/:specialty
// @desc    Get symptoms by specialty
// @access  Public
router.get('/specialty/:specialty', symptomController.getSymptomsBySpecialty);

// @route   GET /api/symptoms/search
// @desc    Search symptoms by name
// @access  Public
router.get('/search', symptomController.searchSymptoms);

// @route   PUT /api/symptoms/:id
// @desc    Update symptom
// @access  Private (Admin/Educator)
router.put('/:id', [authMiddleware, educatorMiddleware], symptomController.updateSymptom);

// @route   DELETE /api/symptoms/:id
// @desc    Delete symptom
// @access  Private (Admin)
router.delete('/:id', [authMiddleware, adminMiddleware], symptomController.deleteSymptom);

// @route   GET /api/symptoms/stats
// @desc    Get symptom statistics
// @access  Private (Admin)
router.get('/stats', [authMiddleware, adminMiddleware], symptomController.getSymptomStats);

// @route   GET /api/symptoms/disease/:diseaseName
// @desc    Get symptoms by disease
// @access  Public
router.get('/disease/:diseaseName', symptomController.getSymptomsByDisease);

module.exports = router;