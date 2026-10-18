const Flashcard = require('../models/Flashcard');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { notify, notifyMany } = require('../utils/notify');

// @desc    Create a new flashcard
// @route   POST /api/flashcards
// @access  Private
const createFlashcard = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { topic, front, back, difficulty = 'medium', tags = [] } = req.body;

    // Create flashcard
    const flashcard = new Flashcard({
      userId: req.user.id,
      topic,
      front,
      back,
      difficulty,
      tags,
      nextReviewDate: calculateNextReviewDate(difficulty)
    });

    await flashcard.save();

    // Notify admins about new flashcard
    try {
      const admins = await User.find({ role: 'admin' });
      if (admins.length > 0) {
        await notifyMany(admins, {
          title: 'New Flashcard Created',
          message: `A new flashcard on topic '${topic}' was created by ${req.user.username || req.user.email}`,
          type: 'flashcard',
          link: `/admin/flashcards/${flashcard._id}`,
          entityType: 'flashcard',
          entityId: flashcard._id,
          actorId: req.user.id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins about new flashcard:', notifyErr.message);
    }

    res.status(201).json({
      success: true,
      flashcard
    });
  } catch (error) {
    console.error('Create flashcard error:', error);
    res.status(500).json({ 
      message: 'Server error creating flashcard',
      error: error.message 
    });
  }
};

// @desc    Get all flashcards for current user
// @route   GET /api/flashcards
// @access  Private
const getMyFlashcards = async (req, res) => {
  try {
    const { topic, difficulty, tags, dueOnly = false } = req.query;

    let query = { userId: req.user.id };

    if (topic) {
      query.topic = { $regex: topic, $options: 'i' };
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (tags) {
      query.tags = { $in: tags.split(',') };
    }

    if (dueOnly) {
      query.nextReviewDate = { $lte: new Date() };
    }

    const flashcards = await Flashcard.find(query)
      .sort({ nextReviewDate: 1 });

    res.json({
      success: true,
      count: flashcards.length,
      flashcards
    });
  } catch (error) {
    console.error('Get flashcards error:', error);
    res.status(500).json({ 
      message: 'Server error fetching flashcards',
      error: error.message 
    });
  }
};

// @desc    Get flashcard by ID
// @route   GET /api/flashcards/:id
// @access  Private
const getFlashcardById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    const flashcard = await Flashcard.findById(req.params.id);

    if (!flashcard) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    res.json({
      success: true,
      flashcard
    });
  } catch (error) {
    console.error('Get flashcard by ID error:', error);
    res.status(500).json({ 
      message: 'Server error fetching flashcard',
      error: error.message 
    });
  }
};

// @desc    Update flashcard
// @route   PUT /api/flashcards/:id
// @access  Private
const updateFlashcard = async (req, res) => {
  try {
    const flashcard = await Flashcard.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!flashcard) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updatedFlashcard = await Flashcard.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Notify admins about flashcard update
    try {
      const admins = await User.find({ role: 'admin' });
      if (admins.length > 0) {
        await notifyMany(admins, {
          title: 'Flashcard Updated',
          message: `A flashcard on topic '${flashcard.topic}' was updated by ${req.user.username || req.user.email}`,
          type: 'flashcard',
          link: `/admin/flashcards/${flashcard._id}`,
          entityType: 'flashcard',
          entityId: flashcard._id,
          actorId: req.user.id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins about flashcard update:', notifyErr.message);
    }

    res.json({
      success: true,
      flashcard: updatedFlashcard
    });
  } catch (error) {
    console.error('Update flashcard error:', error);
    res.status(500).json({ 
      message: 'Server error updating flashcard',
      error: error.message 
    });
  }
};

// @desc    Delete flashcard
// @route   DELETE /api/flashcards/:id
// @access  Private
const deleteFlashcard = async (req, res) => {
  try {
    const flashcard = await Flashcard.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!flashcard) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    // Notify admins about flashcard deletion
    try {
      const admins = await User.find({ role: 'admin' });
      if (admins.length > 0) {
        await notifyMany(admins, {
          title: 'Flashcard Deleted',
          message: `A flashcard on topic '${flashcard.topic}' was deleted by ${req.user.username || req.user.email}`,
          type: 'flashcard',
          entityType: 'flashcard',
          entityId: flashcard._id,
          actorId: req.user.id,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify admins about flashcard deletion:', notifyErr.message);
    }

    await flashcard.remove();

    res.json({
      success: true,
      message: 'Flashcard deleted successfully'
    });
  } catch (error) {
    console.error('Delete flashcard error:', error);
    res.status(500).json({ 
      message: 'Server error deleting flashcard',
      error: error.message 
    });
  }
};

// @desc    Update flashcard review status
// @route   POST /api/flashcards/:id/review
// @access  Private
const reviewFlashcard = async (req, res) => {
  try {
    const { performance } = req.body; // 'easy', 'medium', 'hard'

    if (!['easy', 'medium', 'hard'].includes(performance)) {
      return res.status(400).json({ 
        message: 'Performance must be easy, medium, or hard'
      });
    }

    const flashcard = await Flashcard.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!flashcard) {
      return res.status(404).json({ message: 'Flashcard not found' });
    }

    // Update review statistics
    flashcard.reviewCount += 1;
    
    // Update mastery level based on performance
    const masteryIncrease = performance === 'easy' ? 20 : performance === 'medium' ? 10 : 5;
    flashcard.masteryLevel = Math.min(100, flashcard.masteryLevel + masteryIncrease);

    // Calculate next review date based on spaced repetition algorithm
    flashcard.nextReviewDate = calculateNextReviewDate(performance, flashcard.reviewCount);

    // Update difficulty based on performance
    if (performance === 'easy' && flashcard.difficulty !== 'easy') {
      flashcard.difficulty = 'easy';
    } else if (performance === 'hard') {
      flashcard.difficulty = 'hard';
    }

    await flashcard.save();

    res.json({
      success: true,
      flashcard,
      nextReview: flashcard.nextReviewDate
    });
  } catch (error) {
    console.error('Review flashcard error:', error);
    res.status(500).json({ 
      message: 'Server error reviewing flashcard',
      error: error.message 
    });
  }
};

// @desc    Get flashcards due for review
// @route   GET /api/flashcards/due
// @access  Private
const getDueFlashcards = async (req, res) => {
  try {
    const dueFlashcards = await Flashcard.find({
      userId: req.user.id,
      nextReviewDate: { $lte: new Date() }
    }).sort({ nextReviewDate: 1 });

    res.json({
      success: true,
      count: dueFlashcards.length,
      flashcards: dueFlashcards
    });
  } catch (error) {
    console.error('Get due flashcards error:', error);
    res.status(500).json({ 
      message: 'Server error fetching due flashcards',
      error: error.message 
    });
  }
};

// @desc    Get flashcards by topic
// @route   GET /api/flashcards/topic/:topic
// @access  Private
const getFlashcardsByTopic = async (req, res) => {
  try {
    const flashcards = await Flashcard.find({
      userId: req.user.id,
      topic: req.params.topic
    }).sort({ nextReviewDate: 1 });

    res.json({
      success: true,
      count: flashcards.length,
      flashcards
    });
  } catch (error) {
    console.error('Get flashcards by topic error:', error);
    res.status(500).json({ 
      message: 'Server error fetching flashcards by topic',
      error: error.message 
    });
  }
};

// @desc    Get flashcard statistics
// @route   GET /api/flashcards/stats
// @access  Private
const getFlashcardStats = async (req, res) => {
  try {
    const totalFlashcards = await Flashcard.countDocuments({ userId: req.user.id });
    const dueFlashcards = await Flashcard.countDocuments({
      userId: req.user.id,
      nextReviewDate: { $lte: new Date() }
    });

    const masteryStats = await Flashcard.aggregate([
      { $match: { userId: req.user._id } },
      { $group: {
        _id: null,
        avgMastery: { $avg: '$masteryLevel' },
        topics: { $addToSet: '$topic' }
      }}
    ]);

    res.json({
      success: true,
      stats: {
        totalFlashcards,
        dueFlashcards,
        avgMastery: masteryStats[0]?.avgMastery || 0,
        topicsCount: masteryStats[0]?.topics?.length || 0
      }
    });
  } catch (error) {
    console.error('Get flashcard stats error:', error);
    res.status(500).json({ 
      message: 'Server error fetching flashcard stats',
      error: error.message 
    });
  }
};

// Helper function to calculate next review date based on spaced repetition
const calculateNextReviewDate = (performance, reviewCount = 0) => {
  const now = new Date();
  
  // Base intervals (in days) based on performance and review count
  const intervals = {
    easy: [1, 3, 7, 14, 30, 60, 90],
    medium: [1, 2, 4, 8, 15, 30, 45],
    hard: [1, 1, 2, 3, 5, 10, 20]
  };
  
  const index = Math.min(reviewCount, intervals[performance].length - 1);
  const daysToAdd = intervals[performance][index];
  
  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(now.getDate() + daysToAdd);
  
  return nextReviewDate;
};

module.exports = {
  createFlashcard,
  getMyFlashcards,
  getFlashcardById,
  updateFlashcard,
  deleteFlashcard,
  reviewFlashcard,
  getDueFlashcards,
  getFlashcardsByTopic,
  getFlashcardStats
};