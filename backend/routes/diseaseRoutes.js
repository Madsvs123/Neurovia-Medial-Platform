const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const educatorMiddleware = require('../middleware/educatorMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const diseaseController = require('../controllers/diseaseController');

// @route   POST /api/diseases
// @desc    Create a new disease entry
// @access  Private (Admin/Educator)
router.post('/', [
  authMiddleware,
  educatorMiddleware,
  check('name', 'Name is required').not().isEmpty(),
  check('specialty', 'Specialty is required').not().isEmpty(),
  check('description', 'Description is required').not().isEmpty()
], diseaseController.createDisease);

// @route   GET /api/diseases
// @desc    Get all diseases
// @access  Public
router.get('/', diseaseController.getAllDiseases);

// @route   GET /api/diseases/:id
// @desc    Get disease by ID
// @access  Public
router.get('/:id', diseaseController.getDiseaseById);

// @route   GET /api/diseases/specialty/:specialty
// @desc    Get diseases by specialty
// @access  Public
router.get('/specialty/:specialty', diseaseController.getDiseasesBySpecialty);

// @route   GET /api/diseases/search-by-symptoms
// @desc    Search diseases by symptoms
// @access  Public
router.get('/search-by-symptoms', diseaseController.searchDiseasesBySymptoms);

// @route   PUT /api/diseases/:id
// @desc    Update disease
// @access  Private (Admin/Educator)
router.put('/:id', [authMiddleware, educatorMiddleware], diseaseController.updateDisease);

// @route   DELETE /api/diseases/:id
// @desc    Delete disease
// @access  Private (Admin)
router.delete('/:id', [authMiddleware, adminMiddleware], diseaseController.deleteDisease);

// @route   GET /api/diseases/stats
// @desc    Get disease statistics
// @access  Private (Admin)
router.get('/stats', [authMiddleware, adminMiddleware], diseaseController.getDiseaseStats);

// @route   GET /api/diseases/:id/related
// @desc    Get related diseases
// @access  Public
router.get('/:id/related', diseaseController.getRelatedDiseases);

module.exports = router;