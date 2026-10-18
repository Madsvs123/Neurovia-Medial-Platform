const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const programEnrollmentController = require('../controllers/programEnrollmentController');

// @route   POST /api/program-enrollments
// @desc    Enroll user in a program using access code
// @access  Private
router.post('/', [
  authMiddleware,
  check('programCode', 'Program code is required').not().isEmpty()
], programEnrollmentController.enrollInProgram);

// @route   GET /api/program-enrollments/me
// @desc    Get all enrollments for current user
// @access  Private
router.get('/me', authMiddleware, programEnrollmentController.getMyEnrollments);

// @route   GET /api/program-enrollments/program/:programId
// @desc    Get all enrollments for a program
// @access  Private (Admin/Educator)
router.get('/program/:programId', authMiddleware, programEnrollmentController.getEnrollmentsByProgram);

// @route   GET /api/program-enrollments/:id
// @desc    Get enrollment by ID
// @access  Private
router.get('/:id', authMiddleware, programEnrollmentController.getEnrollmentById);

// @route   GET /api/program-enrollments/check/:programId
// @desc    Check if user is enrolled in a program
// @access  Private
router.get('/check/:programId', authMiddleware, programEnrollmentController.checkEnrollment);

// @route   PUT /api/program-enrollments/:id
// @desc    Update enrollment (Admin only)
// @access  Private (Admin)
router.put('/:id', [authMiddleware, adminMiddleware], programEnrollmentController.updateEnrollment);

// @route   DELETE /api/program-enrollments/me/:programId
// @desc    Unenroll from program (User)
// @access  Private
router.delete('/me/:programId', authMiddleware, programEnrollmentController.unenrollFromProgram);

// @route   DELETE /api/program-enrollments/:id
// @desc    Remove user from program (Admin or Educator for their own programs)
// @access  Private (Admin/Educator)
router.delete('/:id', authMiddleware, programEnrollmentController.removeFromProgram);

// @route   GET /api/program-enrollments/stats
// @desc    Get enrollment statistics (Admin only)
// @access  Private (Admin)
router.get('/stats', [authMiddleware, adminMiddleware], programEnrollmentController.getEnrollmentStats);

// @route   POST /api/program-enrollments/admin/:programId
// @desc    Admin or Educator enroll user directly in program
// @access  Private (Admin or Educator for own programs)
router.post('/admin/:programId', [authMiddleware], programEnrollmentController.adminEnrollUser);

// @route   POST /api/program-enrollments/:id/resources
// @desc    Add unlocked resources to enrollment
// @access  Private (Admin)
router.post('/:id/resources', [authMiddleware, adminMiddleware], programEnrollmentController.addUnlockedResources);

module.exports = router;