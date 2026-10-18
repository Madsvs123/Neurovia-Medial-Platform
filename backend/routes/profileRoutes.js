const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const profileController = require('../controllers/profileController');

// Specific routes MUST come before parameterized routes

// @route   GET /api/profiles/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', authMiddleware, profileController.getMyProfile);

// @route   PUT /api/profiles/me
// @desc    Update profile
// @access  Private
router.put('/me', [
  authMiddleware,
  check('fullName', 'Full name is required').not().isEmpty(),
  check('profession', 'Profession is required').not().isEmpty()
], profileController.updateProfile);

// @route   GET /api/profiles/search
// @desc    Search profiles by profession or specialization
// @access  Public
router.get('/search', profileController.searchProfiles);

// @route   GET /api/profiles/profession/:profession
// @desc    Get profiles by profession
// @access  Public
router.get('/profession/:profession', profileController.getProfilesByProfession);

// @route   GET /api/profiles/specialization/:specialization
// @desc    Get profiles by specialization
// @access  Public
router.get('/specialization/:specialization', profileController.getProfilesBySpecialization);

// @route   GET /api/profiles/doctors
// @desc    Get doctor profiles
// @access  Public
router.get('/doctors', profileController.getDoctorProfiles);

// @route   GET /api/profiles/:userId
// @desc    Get profile by user ID (must be last)
// @access  Public
router.get('/:userId', profileController.getProfileByUserId);

module.exports = router;