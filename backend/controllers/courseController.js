const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { notify, notifyMany } = require('../utils/notify');

// @desc    Create a new course
// @route   POST /api/courses
// @access  Private (Educator/Admin)
const createCourse = async (req, res) => {
  try {
    // Check if user is educator or admin
    if (req.user.role !== 'educator' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to create courses'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, category, specialty, level, price = 0, language = 'en', estimatedDuration, videoUrl, programId } = req.body;

    // Create course
    const course = new Course({
      title,
      description,
      category,
      specialty,
      level,
      instructorId: req.user.id,
      price,
      language,
      estimatedDuration,
      videoUrl,
      programId
    });

    await course.save();

    // Notify admin when an educator creates a course
    if (req.user.role === 'educator') {
      try {
        const admins = await User.find({ role: 'admin' });
        if (admins.length > 0) {
          await notifyMany(admins, {
            title: 'New Course Created',
            message: `A new course titled '${title}' was created by ${req.user.username || req.user.email}`,
            type: 'course',
            link: `/admin/courses/${course._id}`,
            entityType: 'course',
            entityId: course._id,
            actorId: req.user.id,
          });
        }
      } catch (notifyErr) {
        console.error('Failed to notify admins about new course:', notifyErr.message);
      }
    }

    res.status(201).json({
      success: true,
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ 
      message: 'Server error creating course',
      error: error.message 
    });
  }
};

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
const getAllCourses = async (req, res) => {
  try {
    const { category, specialty, level, search, mine, page = 1, limit = 10 } = req.query;

    let query = {};

    // If mine=true is passed (authenticated user), filter to only show courses they created
    if (mine === 'true' && req.user) {
      query.instructorId = req.user._id;
    } else {
      query.published = true;
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by specialty
    if (specialty) {
      query.specialty = specialty;
    }

    // Filter by level
    if (level) {
      query.level = level;
    }

    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const courses = await Course.find(query)
      .populate('instructorId', 'username email')
      .populate('programId', 'title code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Course.countDocuments(query);

    res.json({
      success: true,
      count: courses.length,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      courses
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ 
      message: 'Server error fetching courses',
      error: error.message 
    });
  }
};

// @desc    Get course by ID
// @route   GET /api/courses/:id
// @access  Public
const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructorId', 'username email')
      .populate('programId', 'title code');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if course is published or user is instructor/admin
    if (!course.published && course.instructorId.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Course is not published' });
    }

    // Get lessons for this course
    const lessons = await Lesson.find({ courseId: course._id })
      .sort({ order: 1 });

    res.json({
      success: true,
      course,
      lessons
    });
  } catch (error) {
    console.error('Get course by ID error:', error);
    res.status(500).json({ 
      message: 'Server error fetching course',
      error: error.message 
    });
  }
};

// @desc    Get courses by instructor
// @route   GET /api/courses/instructor/:instructorId
// @access  Public
const getCoursesByInstructor = async (req, res) => {
  try {
    const courses = await Course.find({ 
      instructorId: req.params.instructorId,
      published: true 
    }).populate('instructorId', 'username email')
      .populate('programId', 'title code');

    res.json({
      success: true,
      count: courses.length,
      courses
    });
  } catch (error) {
    console.error('Get courses by instructor error:', error);
    res.status(500).json({ 
      message: 'Server error fetching instructor courses',
      error: error.message 
    });
  }
};

// @desc    Get my courses (for instructors)
// @route   GET /api/courses/my-courses
// @access  Private (Educator/Admin)
const getMyCourses = async (req, res) => {
  try {
    if (req.user.role !== 'educator' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to access instructor courses'
      });
    }

    const courses = await Course.find({ instructorId: req.user.id })
      .populate('programId', 'title code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: courses.length,
      courses
    });
  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({ 
      message: 'Server error fetching my courses',
      error: error.message 
    });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Educator/Admin)
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is authorized
    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to update this course'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Notify admin when an educator edits a course
    if (req.user.role === 'educator') {
      try {
        const admins = await User.find({ role: 'admin' });
        if (admins.length > 0) {
          await notifyMany(admins, {
            title: 'Course Updated',
            message: `The course '${course.title}' was updated by ${req.user.username || req.user.email}`,
            type: 'course',
            link: `/admin/courses/${course._id}`,
            entityType: 'course',
            entityId: course._id,
            actorId: req.user.id,
          });
        }
      } catch (notifyErr) {
        console.error('Failed to notify admins about course update:', notifyErr.message);
      }
    }

    // Notify the course creator about the update (relevant when admin edits)
    if (req.user.role === 'admin' && course.instructorId.toString() !== req.user.id) {
      try {
        await notify({
          userId: course.instructorId,
          title: 'Course Updated by Admin',
          message: `Your course '${course.title}' was updated by an admin`,
          type: 'course',
          link: `/educator/courses/${course._id}`,
          entityType: 'course',
          entityId: course._id,
          actorId: req.user.id,
        });
      } catch (notifyErr) {
        console.error('Failed to notify course creator about update:', notifyErr.message);
      }
    }

    res.json({
      success: true,
      course: updatedCourse
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ 
      message: 'Server error updating course',
      error: error.message 
    });
  }
};

// @desc    Publish/unpublish course
// @route   PUT /api/courses/:id/publish
// @access  Private (Educator/Admin)
const toggleCoursePublish = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is authorized
    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to publish this course'
      });
    }

    // Toggle publish status
    course.published = !course.published;
    await course.save();

    // Notify the course creator when admin publishes/unpublishes
    if (req.user.role === 'admin' && course.instructorId.toString() !== req.user.id) {
      try {
        await notify({
          userId: course.instructorId,
          title: `Course ${course.published ? 'Published' : 'Unpublished'}`,
          message: `Your course '${course.title}' has been ${course.published ? 'published' : 'unpublished'} by an admin`,
          type: 'course',
          link: `/educator/courses/${course._id}`,
          entityType: 'course',
          entityId: course._id,
          actorId: req.user.id,
        });
      } catch (notifyErr) {
        console.error('Failed to notify course creator about publish toggle:', notifyErr.message);
      }
    }

    res.json({
      success: true,
      course,
      message: `Course ${course.published ? 'published' : 'unpublished'} successfully`
    });
  } catch (error) {
    console.error('Toggle course publish error:', error);
    res.status(500).json({ 
      message: 'Server error toggling course publish status',
      error: error.message 
    });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Educator/Admin)
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is authorized
    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to delete this course'
      });
    }

    // Delete associated lessons first
    await Lesson.deleteMany({ courseId: course._id });

    // Notify the course creator when admin deletes the course
    if (req.user.role === 'admin' && course.instructorId.toString() !== req.user.id) {
      try {
        await notify({
          userId: course.instructorId,
          title: 'Course Deleted',
          message: `Your course '${course.title}' has been deleted by an admin`,
          type: 'course',
          entityType: 'course',
          entityId: course._id,
          actorId: req.user.id,
        });
      } catch (notifyErr) {
        console.error('Failed to notify course creator about deletion:', notifyErr.message);
      }
    }

    await course.remove();

    res.json({
      success: true,
      message: 'Course and associated lessons deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ 
      message: 'Server error deleting course',
      error: error.message 
    });
  }
};

// @desc    Get course statistics
// @route   GET /api/courses/:id/stats
// @access  Private (Educator/Admin)
const getCourseStats = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is authorized
    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view this course stats'
      });
    }

    // Get lesson count
    const lessonCount = await Lesson.countDocuments({ courseId: course._id });

    // Calculate total estimated duration
    const lessons = await Lesson.find({ courseId: course._id });
    const totalDuration = lessons.reduce((sum, lesson) => sum + (lesson.estimatedReadTime || 0), 0);

    res.json({
      success: true,
      stats: {
        enrollmentCount: course.enrollmentCount,
        rating: course.rating,
        lessonCount,
        totalDuration, // in minutes
        createdAt: course.createdAt,
        updatedAt: course.updatedAt
      }
    });
  } catch (error) {
    console.error('Get course stats error:', error);
    res.status(500).json({ 
      message: 'Server error fetching course stats',
      error: error.message 
    });
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  getCoursesByInstructor,
  getMyCourses,
  updateCourse,
  toggleCoursePublish,
  deleteCourse,
  getCourseStats
};