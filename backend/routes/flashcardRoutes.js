const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const flashcardController = require('../controllers/flashcardController');

// @route   POST /api/flashcards
// @desc    Create a new flashcard
// @access  Private
router.post('/', [
  authMiddleware,
  check('topic', 'Topic is required').not().isEmpty(),
  check('front', 'Front content is required').not().isEmpty(),
  check('back', 'Back content is required').not().isEmpty()
], flashcardController.createFlashcard);

// @route   GET /api/flashcards
// @desc    Get all flashcards for current user
// @access  Private
router.get('/', authMiddleware, flashcardController.getMyFlashcards);

// @route   GET /api/flashcards/due
// @desc    Get flashcards due for review
// @access  Private
router.get('/due', authMiddleware, flashcardController.getDueFlashcards);

// @route   GET /api/flashcards/topic/:topic
// @desc    Get flashcards by topic
// @access  Private
router.get('/topic/:topic', authMiddleware, flashcardController.getFlashcardsByTopic);

// @route   GET /api/flashcards/stats
// @desc    Get flashcard statistics
// @access  Private
router.get('/stats', authMiddleware, flashcardController.getFlashcardStats);

// @route   GET /api/flashcards/:id
// @desc    Get flashcard by ID
// @access  Private
router.get('/:id', authMiddleware, flashcardController.getFlashcardById);

// @route   PUT /api/flashcards/:id
// @desc    Update flashcard
// @access  Private
router.put('/:id', [
  authMiddleware,
  check('topic', 'Topic is required').not().isEmpty(),
  check('front', 'Front content is required').not().isEmpty(),
  check('back', 'Back content is required').not().isEmpty()
], flashcardController.updateFlashcard);

// @route   DELETE /api/flashcards/:id
// @desc    Delete flashcard
// @access  Private
router.delete('/:id', authMiddleware, flashcardController.deleteFlashcard);

// @route   POST /api/flashcards/:id/review
// @desc    Update flashcard review status
// @access  Private
router.post('/:id/review', [
  authMiddleware,
  check('performance', 'Performance is required (easy, medium, hard)').isIn(['easy', 'medium', 'hard'])
], flashcardController.reviewFlashcard);

module.exports = router;