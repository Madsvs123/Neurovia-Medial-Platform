const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const educatorMiddleware = require('../middleware/educatorMiddleware');
const lessonController = require('../controllers/lessonController');

// @route   POST /api/lessons
// @desc    Create a new lesson
// @access  Private (Educator/Admin)
router.post('/', [
  authMiddleware,
  educatorMiddleware,
  check('courseId', 'Course ID is required').not().isEmpty(),
  check('title', 'Title is required').not().isEmpty(),
  check('content', 'Content is required').not().isEmpty(),
  check('order', 'Order is required').isNumeric()
], lessonController.createLesson);

// @route   GET /api/lessons/course/:courseId
// @desc    Get all lessons for a course
// @access  Public
router.get('/course/:courseId', lessonController.getLessonsByCourse);

// @route   GET /api/lessons/:id
// @desc    Get lesson by ID
// @access  Public
router.get('/:id', lessonController.getLessonById);

// @route   PUT /api/lessons/:id
// @desc    Update lesson
// @access  Private (Educator/Admin)
router.put('/:id', [authMiddleware, educatorMiddleware], lessonController.updateLesson);

// @route   PUT /api/lessons/:id/publish
// @desc    Publish/unpublish lesson
// @access  Private (Educator/Admin)
router.put('/:id/publish', [authMiddleware, educatorMiddleware], lessonController.toggleLessonPublish);

// @route   DELETE /api/lessons/:id
// @desc    Delete lesson
// @access  Private (Educator/Admin)
router.delete('/:id', [authMiddleware, educatorMiddleware], lessonController.deleteLesson);

// @route   PUT /api/lessons/reorder
// @desc    Reorder lessons in a course
// @access  Private (Educator/Admin)
router.put('/reorder', [authMiddleware, educatorMiddleware], lessonController.reorderLessons);

// @route   POST /api/lessons/:id/generate-ai-summary
// @desc    Generate AI summary for lesson
// @access  Private (Educator/Admin)
router.post('/:id/generate-ai-summary', [authMiddleware, educatorMiddleware], lessonController.generateAISummary);

module.exports = router;