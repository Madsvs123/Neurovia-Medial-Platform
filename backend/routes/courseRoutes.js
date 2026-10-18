const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const educatorMiddleware = require('../middleware/educatorMiddleware');
const programAccess = require('../middleware/programAccessMiddleware');
const optionalAuth = require('../middleware/optionalAuth');
const courseController = require('../controllers/courseController');

// @route   POST /api/courses
// @desc    Create a new course
// @access  Private (Admin only)
router.post('/', [
  authMiddleware,
  adminMiddleware,
  check('title', 'Title is required').not().isEmpty(),
  check('description', 'Description is required').not().isEmpty(),
  check('category', 'Category is required').not().isEmpty(),
  check('specialty', 'Specialty is required').not().isEmpty()
], courseController.createCourse);

// @route   GET /api/courses
// @desc    Get all courses (with optional auth for mine=true filtering)
// @access  Public
router.get('/', optionalAuth, courseController.getAllCourses);

// @route   GET /api/courses/instructor/:instructorId
// @desc    Get courses by instructor
// @access  Public
router.get('/instructor/:instructorId', courseController.getCoursesByInstructor);

// @route   GET /api/courses/my-courses
// @desc    Get my courses (for instructors)  (MUST be before /:id)
// @access  Private (Educator/Admin)
router.get('/my-courses', [authMiddleware, educatorMiddleware], courseController.getMyCourses);

// @route   GET /api/courses/:id
// @desc    Get course by ID (program-restricted if linked to a program)
// @access  Public (with program enrollment check)
router.get('/:id', programAccess('course'), courseController.getCourseById);

// @route   PUT /api/courses/:id
// @desc    Update course
// @access  Private (Admin only)
router.put('/:id', [authMiddleware, adminMiddleware], courseController.updateCourse);

// @route   PUT /api/courses/:id/publish
// @desc    Publish/unpublish course
// @access  Private (Admin only)
router.put('/:id/publish', [authMiddleware, adminMiddleware], courseController.toggleCoursePublish);

// @route   DELETE /api/courses/:id
// @desc    Delete course
// @access  Private (Admin only)
router.delete('/:id', [authMiddleware, adminMiddleware], courseController.deleteCourse);

// @route   GET /api/courses/:id/stats
// @desc    Get course statistics
// @access  Private (Admin only)
router.get('/:id/stats', [authMiddleware, adminMiddleware], courseController.getCourseStats);

module.exports = router;
