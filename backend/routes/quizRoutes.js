const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const educatorMiddleware = require('../middleware/educatorMiddleware');
const programAccess = require('../middleware/programAccessMiddleware');
const optionalAuth = require('../middleware/optionalAuth');
const quizController = require('../controllers/quizController');

// @route   POST /api/quizzes
// @desc    Create a new quiz
// @access  Private (Educator/Admin)
router.post('/', [
  authMiddleware,
  educatorMiddleware,
  check('title', 'Title is required').not().isEmpty(),
], quizController.createQuiz);

// @route   GET /api/quizzes
// @desc    Get all quizzes (educators see only their own)
// @access  Public (with optional auth for role-based filtering)
router.get('/', optionalAuth, quizController.getAllQuizzes);

// @route   GET /api/quizzes/:id
// @desc    Get quiz by ID (program-restricted if linked to a program)
// @access  Public (with program enrollment check)
router.get('/:id', programAccess('quiz'), quizController.getQuizById);

// @route   GET /api/quizzes/course/:courseId
// @desc    Get quizzes by course
// @access  Public
router.get('/course/:courseId', quizController.getQuizzesByCourse);

// @route   GET /api/quizzes/lesson/:lessonId
// @desc    Get quizzes by lesson
// @access  Public
router.get('/lesson/:lessonId', quizController.getQuizzesByLesson);

// @route   PUT /api/quizzes/:id
// @desc    Update quiz
// @access  Private (Educator/Admin)
router.put('/:id', [authMiddleware, educatorMiddleware], quizController.updateQuiz);

// @route   DELETE /api/quizzes/:id
// @desc    Delete quiz
// @access  Private (Educator/Admin)
router.delete('/:id', [authMiddleware, educatorMiddleware], quizController.deleteQuiz);

// @route   POST /api/quizzes/:id/submit
// @desc    Submit quiz answers and get results
// @access  Private
router.post('/:id/submit', authMiddleware, quizController.submitQuiz);

// @route   GET /api/quizzes/:id/stats
// @desc    Get quiz statistics
// @access  Private (Educator/Admin)
router.get('/:id/stats', [authMiddleware, educatorMiddleware], quizController.getQuizStats);

module.exports = router;
