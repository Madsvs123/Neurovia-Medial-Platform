const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const educatorMiddleware = require('../middleware/educatorMiddleware');
const userController = require('../controllers/userController');

// @route   POST /api/users/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  check('username', 'Username is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
], userController.registerUser);

// @route   POST /api/users/login
// @desc    Login user
// @access  Public
router.post('/login', [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists()
], userController.loginUser);

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authMiddleware, userController.getUserProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authMiddleware, userController.updateUserProfile);

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get('/', [authMiddleware, educatorMiddleware], userController.getAllUsers);

// @route   GET /api/users/my-programs
// @desc    Get user's enrolled programs  (MUST be before /:id to avoid route capture)
// @access  Private
router.get('/my-programs', authMiddleware, userController.getMyPrograms);

// @route   GET /api/users/my-completed-quizzes
// @desc    Get completed quiz IDs for the current user
// @access  Private
router.get('/my-completed-quizzes', authMiddleware, userController.getMyCompletedQuizzes);

// @route   GET /api/users/educators
// @desc    Get all educators
// @access  Private
router.get('/educators', authMiddleware, userController.getEducators);

// @route   POST /api/users/enroll-program/:programId
// @desc    Enroll user in a program
// @access  Private
router.post('/enroll-program/:programId', authMiddleware, userController.enrollInProgram);

// @route   GET /api/users/:id
// @desc    Get user by ID (Admin only)
// @access  Private/Admin
router.get('/:id', [authMiddleware, adminMiddleware], userController.getUserById);

// @route   PUT /api/users/:id
// @desc    Update user (Admin only)
// @access  Private/Admin
router.put('/:id', [authMiddleware, adminMiddleware], userController.updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete user (Admin only)
// @access  Private/Admin
router.delete('/:id', [authMiddleware, adminMiddleware], userController.deleteUser);

// @route   POST /api/users/google-login
// @desc    Google OAuth login/register
// @access  Public
router.post('/google-login', userController.googleAuth);

module.exports = router;