const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { notify, notifyMany } = require('../utils/notify');

// @desc    Create a new lesson
// @route   POST /api/lessons
// @access  Private (Educator/Admin)
const createLesson = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId, title, content, attachments = [], aiSummary = '', references = [], estimatedReadTime, order, videoUrl, videoDescription } = req.body;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is authorized
    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to add lessons to this course'
      });
    }

    // Create lesson
    const lesson = new Lesson({
      courseId,
      title,
      content,
      attachments,
      aiSummary,
      references,
      estimatedReadTime,
      order,
      videoUrl,
      videoDescription
    });

    await lesson.save();

    // Notify the course creator about the new lesson
    try {
      await notify({
        userId: course.instructorId,
        title: 'New Lesson Created',
        message: `A new lesson '${title}' was added to the course '${course.title}' by ${req.user.username || req.user.email}`,
        type: 'lesson',
        link: `/educator/courses/${courseId}`,
        entityType: 'lesson',
        entityId: lesson._id,
        actorId: req.user.id,
      });
    } catch (notifyErr) {
      console.error('Failed to notify course creator about new lesson:', notifyErr.message);
    }

    res.status(201).json({
      success: true,
      lesson
    });
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ 
      message: 'Server error creating lesson',
      error: error.message 
    });
  }
};

// @desc    Get all lessons for a course
// @route   GET /api/lessons/course/:courseId
// @access  Public
const getLessonsByCourse = async (req, res) => {
  try {
    const lessons = await Lesson.find({ courseId: req.params.courseId })
      .sort({ order: 1 });

    res.json({
      success: true,
      count: lessons.length,
      lessons
    });
  } catch (error) {
    console.error('Get lessons by course error:', error);
    res.status(500).json({ 
      message: 'Server error fetching lessons',
      error: error.message 
    });
  }
};

// @desc    Get lesson by ID
// @route   GET /api/lessons/:id
// @access  Public
const getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Check if course is published or user is authorized
    const course = await Course.findById(lesson.courseId);
    if (!course.published && course.instructorId.toString() !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Course is not published' });
    }

    res.json({
      success: true,
      lesson
    });
  } catch (error) {
    console.error('Get lesson by ID error:', error);
    res.status(500).json({ 
      message: 'Server error fetching lesson',
      error: error.message 
    });
  }
};

// @desc    Update lesson
// @route   PUT /api/lessons/:id
// @access  Private (Educator/Admin)
const updateLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Check if course exists and user is authorized
    const course = await Course.findById(lesson.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to update this lesson'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updatedLesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Notify the course creator about the updated lesson
    try {
      await notify({
        userId: course.instructorId,
        title: 'Lesson Updated',
        message: `The lesson '${lesson.title}' in '${course.title}' was updated by ${req.user.username || req.user.email}`,
        type: 'lesson',
        link: `/educator/courses/${course._id}`,
        entityType: 'lesson',
        entityId: lesson._id,
        actorId: req.user.id,
      });
    } catch (notifyErr) {
      console.error('Failed to notify course creator about lesson update:', notifyErr.message);
    }

    res.json({
      success: true,
      lesson: updatedLesson
    });
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ 
      message: 'Server error updating lesson',
      error: error.message 
    });
  }
};

// @desc    Publish/unpublish lesson
// @route   PUT /api/lessons/:id/publish
// @access  Private (Educator/Admin)
const toggleLessonPublish = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Check if course exists and user is authorized
    const course = await Course.findById(lesson.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to publish this lesson'
      });
    }

    // Toggle publish status
    lesson.published = !lesson.published;
    await lesson.save();

    // Notify the course creator about publish/unpublish
    try {
      await notify({
        userId: course.instructorId,
        title: `Lesson ${lesson.published ? 'Published' : 'Unpublished'}`,
        message: `The lesson '${lesson.title}' in '${course.title}' has been ${lesson.published ? 'published' : 'unpublished'} by ${req.user.username || req.user.email}`,
        type: 'lesson',
        link: `/educator/courses/${course._id}`,
        entityType: 'lesson',
        entityId: lesson._id,
        actorId: req.user.id,
      });
    } catch (notifyErr) {
      console.error('Failed to notify course creator about lesson publish toggle:', notifyErr.message);
    }

    // Notify enrolled students on publish
    if (lesson.published) {
      try {
        const students = await User.find({ enrolledPrograms: course.programId });
        if (students.length > 0) {
          await notifyMany(students, {
            title: 'New Lesson Published',
            message: `A new lesson '${lesson.title}' has been published in the course '${course.title}'`,
            type: 'lesson',
            link: `/courses/${course._id}`,
            entityType: 'lesson',
            entityId: lesson._id,
            actorId: req.user.id,
          });
        }
      } catch (notifyErr) {
        console.error('Failed to notify students about published lesson:', notifyErr.message);
      }
    }

    res.json({
      success: true,
      lesson,
      message: `Lesson ${lesson.published ? 'published' : 'unpublished'} successfully`
    });
  } catch (error) {
    console.error('Toggle lesson publish error:', error);
    res.status(500).json({ 
      message: 'Server error toggling lesson publish status',
      error: error.message 
    });
  }
};

// @desc    Delete lesson
// @route   DELETE /api/lessons/:id
// @access  Private (Educator/Admin)
const deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Check if course exists and user is authorized
    const course = await Course.findById(lesson.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to delete this lesson'
      });
    }

    await lesson.remove();

    // Notify the course creator about the deleted lesson
    try {
      await notify({
        userId: course.instructorId,
        title: 'Lesson Deleted',
        message: `The lesson '${lesson.title}' has been deleted from '${course.title}' by ${req.user.username || req.user.email}`,
        type: 'lesson',
        entityType: 'lesson',
        entityId: lesson._id,
        actorId: req.user.id,
      });
    } catch (notifyErr) {
      console.error('Failed to notify course creator about lesson deletion:', notifyErr.message);
    }

    res.json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ 
      message: 'Server error deleting lesson',
      error: error.message 
    });
  }
};

// @desc    Reorder lessons in a course
// @route   PUT /api/lessons/reorder
// @access  Private (Educator/Admin)
const reorderLessons = async (req, res) => {
  try {
    const { courseId, lessonOrders } = req.body;

    // Check if course exists and user is authorized
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to reorder lessons in this course'
      });
    }

    // Update lesson orders
    for (const { lessonId, order } of lessonOrders) {
      await Lesson.findByIdAndUpdate(lessonId, { order });
    }

    res.json({
      success: true,
      message: 'Lessons reordered successfully'
    });
  } catch (error) {
    console.error('Reorder lessons error:', error);
    res.status(500).json({ 
      message: 'Server error reordering lessons',
      error: error.message 
    });
  }
};

// @desc    Generate AI summary for lesson (placeholder for AI integration)
// @route   POST /api/lessons/:id/generate-ai-summary
// @access  Private (Educator/Admin)
const generateAISummary = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Check if course exists and user is authorized
    const course = await Course.findById(lesson.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to generate AI summary for this lesson'
      });
    }

    // TODO: Integrate with actual AI service
    // This is a placeholder - in production, this would call an AI API
    const mockAISummary = `AI-generated summary of ${lesson.title}: This lesson covers key concepts about ${lesson.content.substring(0, 50)}...`;

    lesson.aiSummary = mockAISummary;
    await lesson.save();

    res.json({
      success: true,
      aiSummary: lesson.aiSummary,
      message: 'AI summary generated successfully (mock)'
    });
  } catch (error) {
    console.error('Generate AI summary error:', error);
    res.status(500).json({ 
      message: 'Server error generating AI summary',
      error: error.message 
    });
  }
};

module.exports = {
  createLesson,
  getLessonsByCourse,
  getLessonById,
  updateLesson,
  toggleLessonPublish,
  deleteLesson,
  reorderLessons,
  generateAISummary
};