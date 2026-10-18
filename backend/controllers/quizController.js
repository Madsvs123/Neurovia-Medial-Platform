const Quiz = require('../models/Quiz');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { validationResult } = require('express-validator');
const { notify, notifyMany } = require('../utils/notify');

// @desc    Create a new quiz
// @route   POST /api/quizzes
// @access  Private (Educator/Admin)
const createQuiz = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId, lessonId, programId, title, description, difficulty, specialty, questions, passingScore = 70, timeLimit, premiumOnly = false } = req.body;

    // If courseId is provided, validate course and authorization
    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Check if lesson exists (if provided)
      if (lessonId) {
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
          return res.status(404).json({ message: 'Lesson not found' });
        }
      }

      // Check if user is authorized for this course
      if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ 
          message: 'Not authorized to create quizzes for this course'
        });
      }
    }

    // Validate questions
    if (!questions || questions.length === 0) {
      return res.status(400).json({ message: 'At least one question is required' });
    }

    // For standalone quizzes (no courseId), set basic questions as placeholder
    const quizQuestions = questions && questions.length > 0 ? questions : [
      { question: 'Sample question?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A', explanation: '' }
    ];

    // Create quiz
    const quiz = new Quiz({
      courseId,
      lessonId,
      programId,
      title,
      description,
      difficulty,
      specialty,
      questions: quizQuestions,
      passingScore,
      timeLimit,
      premiumOnly,
      createdBy: req.user.id
    });

    await quiz.save();

    // Notify admin when educator creates a quiz
    if (req.user.role === 'educator') {
      try {
        const admins = await User.find({ role: 'admin' });
        if (admins.length > 0) {
          await notifyMany(admins, {
            title: 'New Quiz Created',
            message: `A new quiz '${title}' was created by educator ${req.user.username || req.user.email}`,
            type: 'quiz',
            link: `/admin/quizzes/${quiz._id}`,
            entityType: 'quiz',
            entityId: quiz._id,
            actorId: req.user.id,
          });
        }
      } catch (notifyErr) {
        console.error('Failed to notify admins about new quiz:', notifyErr.message);
      }
    }

    res.status(201).json({
      success: true,
      quiz
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ 
      message: 'Server error creating quiz',
      error: error.message 
    });
  }
};

// @desc    Get all quizzes
// @route   GET /api/quizzes
// @access  Public
const getAllQuizzes = async (req, res) => {
  try {
    const { courseId, difficulty, premiumOnly, search, mine } = req.query;

    let query = {};

    if (courseId) {
      query.courseId = courseId;
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (premiumOnly) {
      query.premiumOnly = premiumOnly === 'true';
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // If mine=true is passed, filter to only show quizzes created by the current user
    if (mine === 'true' && req.user) {
      query.createdBy = req.user._id;
    }

    const quizzes = await Quiz.find(query)
      .populate('courseId', 'title specialty')
      .populate('createdBy', 'username')
      .populate('programId', 'title code');

    res.json({
      success: true,
      count: quizzes.length,
      quizzes
    });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ 
      message: 'Server error fetching quizzes',
      error: error.message 
    });
  }
};

// @desc    Get quiz by ID
// @route   GET /api/quizzes/:id
// @access  Public
const getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('courseId', 'title specialty')
      .populate('createdBy', 'username')
      .populate('programId', 'title code');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if quiz is premium and user doesn't have access
    if (quiz.premiumOnly && !req.user) {
      return res.status(403).json({ 
        message: 'This quiz requires premium access',
        isPremium: true
      });
    }

    res.json({
      success: true,
      quiz
    });
  } catch (error) {
    console.error('Get quiz by ID error:', error);
    res.status(500).json({ 
      message: 'Server error fetching quiz',
      error: error.message 
    });
  }
};

// @desc    Get quizzes by course
// @route   GET /api/quizzes/course/:courseId
// @access  Public
const getQuizzesByCourse = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ courseId: req.params.courseId })
      .populate('createdBy', 'username')
      .populate('programId', 'title code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: quizzes.length,
      quizzes
    });
  } catch (error) {
    console.error('Get quizzes by course error:', error);
    res.status(500).json({ 
      message: 'Server error fetching course quizzes',
      error: error.message 
    });
  }
};

// @desc    Get quizzes by lesson
// @route   GET /api/quizzes/lesson/:lessonId
// @access  Public
const getQuizzesByLesson = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ lessonId: req.params.lessonId })
      .populate('createdBy', 'username')
      .populate('programId', 'title code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: quizzes.length,
      quizzes
    });
  } catch (error) {
    console.error('Get quizzes by lesson error:', error);
    res.status(500).json({ 
      message: 'Server error fetching lesson quizzes',
      error: error.message 
    });
  }
};

// @desc    Update quiz
// @route   PUT /api/quizzes/:id
// @access  Private (Educator/Admin)
const updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check authorization: admin, quiz creator, or course instructor
    let isAuthorized = false;
    if (req.user.role === 'admin' || (quiz.createdBy && quiz.createdBy.toString() === req.user.id)) {
      isAuthorized = true;
    } else if (quiz.courseId) {
      const course = await Course.findById(quiz.courseId);
      if (course && course.instructorId.toString() === req.user.id) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ 
        message: 'Not authorized to update this quiz'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updatedQuiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Notify educator when admin edits a quiz
    if (req.user.role === 'admin' && quiz.createdBy && quiz.createdBy.toString() !== req.user.id) {
      try {
        await notify({
          userId: quiz.createdBy,
          title: 'Quiz Updated by Admin',
          message: `The quiz '${quiz.title}' was updated by an admin`,
          type: 'quiz',
          link: `/educator/quizzes/${quiz._id}`,
          entityType: 'quiz',
          entityId: quiz._id,
          actorId: req.user.id,
        });
      } catch (notifyErr) {
        console.error('Failed to notify educator about quiz update:', notifyErr.message);
      }
    }

    res.json({
      success: true,
      quiz: updatedQuiz
    });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ 
      message: 'Server error updating quiz',
      error: error.message 
    });
  }
};

// @desc    Delete quiz
// @route   DELETE /api/quizzes/:id
// @access  Private (Educator/Admin)
const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check authorization: admin, quiz creator, or course instructor
    let isAuthorized = false;
    if (req.user.role === 'admin' || (quiz.createdBy && quiz.createdBy.toString() === req.user.id)) {
      isAuthorized = true;
    } else if (quiz.courseId) {
      const course = await Course.findById(quiz.courseId);
      if (course && course.instructorId.toString() === req.user.id) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ 
        message: 'Not authorized to delete this quiz'
      });
    }

    // Notify educator when admin deletes a quiz
    if (req.user.role === 'admin' && quiz.createdBy && quiz.createdBy.toString() !== req.user.id) {
      try {
        await notify({
          userId: quiz.createdBy,
          title: 'Quiz Deleted',
          message: `The quiz '${quiz.title}' has been deleted by an admin`,
          type: 'quiz',
          entityType: 'quiz',
          entityId: quiz._id,
          actorId: req.user.id,
        });
      } catch (notifyErr) {
        console.error('Failed to notify educator about quiz deletion:', notifyErr.message);
      }
    }

    await quiz.remove();

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ 
      message: 'Server error deleting quiz',
      error: error.message 
    });
  }
};

// @desc    Submit quiz answers and get results
// @route   POST /api/quizzes/:id/submit
// @access  Private
const submitQuiz = async (req, res) => {
  try {
    const { answers } = req.body;

    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if quiz is premium and user doesn't have premium access
    if (quiz.premiumOnly && req.user.subscriptionPlan !== 'premium') {
      return res.status(403).json({ 
        message: 'This quiz requires premium subscription'
      });
    }

    if (!answers || answers.length !== quiz.questions.length) {
      return res.status(400).json({ 
        message: 'Please provide answers for all questions'
      });
    }

    // Calculate score
    let score = 0;
    const results = [];

    quiz.questions.forEach((question, index) => {
      const isCorrect = answers[index] === question.correctAnswer;
      if (isCorrect) {
        score++;
      }

      results.push({
        question: question.question,
        userAnswer: answers[index],
        correctAnswer: question.correctAnswer,
        isCorrect,
        explanation: question.explanation
      });
    });

    const percentage = (score / quiz.questions.length) * 100;
    const passed = percentage >= quiz.passingScore;

    // Track completion on the user
    try {
      const user = await User.findById(req.user.id);
      if (user && !user.completedQuizzes.includes(quiz._id)) {
        user.completedQuizzes.push(quiz._id);
        await user.save();
      }
    } catch (trackErr) {
      console.error('Failed to track quiz completion:', trackErr);
      // Non-blocking — don't fail the submission
    }

    // Log quiz completion activity so the quiz card can render the latest pass/fail state
    try {
      await ActivityLog.create({
        userId: req.user.id,
        action: 'quiz_completed',
        resourceType: 'Quiz',
        resourceId: quiz._id,
        metadata: {
          passed,
          score: percentage
        }
      });
    } catch (logErr) {
      console.error('Failed to log quiz activity:', logErr);
    }

    res.json({
      success: true,
      quizId: quiz._id,
      quizTitle: quiz.title,
      totalQuestions: quiz.questions.length,
      correctAnswers: score,
      percentage,
      passingScore: quiz.passingScore,
      passed,
      results
    });

    // Notify student of quiz result
    try {
      await notify({
        userId: req.user.id,
        title: `Quiz Result: ${passed ? 'Passed' : 'Failed'}`,
        message: `You scored ${percentage.toFixed(1)}% on "${quiz.title}". You ${passed ? 'passed' : 'failed'}.`,
        type: 'quiz',
        link: `/quizzes/${quiz._id}`,
        entityType: 'quiz',
        entityId: quiz._id,
      });
    } catch (notifyErr) {
      console.error('Failed to notify student about quiz result:', notifyErr.message);
    }

    // Notify quiz creator (if exists and isn't the student)
    if (quiz.createdBy && quiz.createdBy.toString() !== req.user.id) {
      try {
        await notify({
          userId: quiz.createdBy,
          title: 'Quiz Completed',
          message: `A student scored ${percentage.toFixed(1)}% on "${quiz.title}"`,
          type: 'quiz',
          link: `/educator/quizzes/${quiz._id}`,
          entityType: 'quiz',
          entityId: quiz._id,
        });
      } catch (notifyErr) {
        console.error('Failed to notify quiz creator about completion:', notifyErr.message);
      }
    }
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ 
      message: 'Server error submitting quiz',
      error: error.message 
    });
  }
};

// @desc    Get quiz statistics
// @route   GET /api/quizzes/:id/stats
// @access  Private (Educator/Admin)
const getQuizStats = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check authorization: admin, quiz creator, or course instructor
    let isAuthorized = false;
    if (req.user.role === 'admin' || (quiz.createdBy && quiz.createdBy.toString() === req.user.id)) {
      isAuthorized = true;
    } else if (quiz.courseId) {
      const course = await Course.findById(quiz.courseId);
      if (course && course.instructorId.toString() === req.user.id) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ 
        message: 'Not authorized to view this quiz stats'
      });
    }

    res.json({
      success: true,
      stats: {
        questionCount: quiz.questions.length,
        difficulty: quiz.difficulty,
        passingScore: quiz.passingScore,
        timeLimit: quiz.timeLimit,
        createdAt: quiz.createdAt,
        updatedAt: quiz.updatedAt
      }
    });
  } catch (error) {
    console.error('Get quiz stats error:', error);
    res.status(500).json({ 
      message: 'Server error fetching quiz stats',
      error: error.message 
    });
  }
};

module.exports = {
  createQuiz,
  getAllQuizzes,
  getQuizById,
  getQuizzesByCourse,
  getQuizzesByLesson,
  updateQuiz,
  deleteQuiz,
  submitQuiz,
  getQuizStats
};