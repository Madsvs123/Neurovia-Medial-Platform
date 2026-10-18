const Notification = require('../models/Notification');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
const getMyNotifications = async (req, res) => {
  try {
    const { read, type, limit = 20, page = 1 } = req.query;

    let query = { userId: req.user.id };
    if (read) query.read = read === 'true';
    if (type) query.type = type;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const notifications = await Notification.find(query)
      .populate('actorId', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId: req.user.id, read: false });

    res.json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      message: 'Server error fetching notifications',
      error: error.message
    });
  }
};

// @desc    Get unread count only (lightweight)
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user.id, read: false });
    res.json({ success: true, unreadCount: count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    const unreadCount = await Notification.countDocuments({ userId: req.user.id, read: false });
    res.json({ success: true, notification, unreadCount });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a single notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete all notifications for current user
// @route   DELETE /api/notifications/delete-all
// @access  Private
const deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });
    res.json({ success: true, message: 'All notifications deleted' });
  } catch (error) {
    console.error('Delete all error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create notification (admin only)
// @route   POST /api/notifications
// @access  Private (Admin)
const createNotification = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { userId, title, message, type, link, entityType, entityId } = req.body;
    const notification = await Notification.create({ userId, title, message, type, link, entityType, entityId, actorId: req.user.id });
    res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Broadcast notification to all / filtered users
// @route   POST /api/notifications/broadcast
// @access  Private (Admin)
const broadcastNotification = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const { title, message, type, roleFilter } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }
    let query = {};
    if (roleFilter) query.role = roleFilter;
    const users = await User.find(query);
    const notifications = users.map(user => ({
      userId: user._id, title, message,
      type: type || 'system',
      actorId: req.user.id
    }));
    await Notification.insertMany(notifications);
    res.json({ success: true, count: notifications.length, message: `Sent to ${notifications.length} users` });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get notification statistics (admin only)
// @route   GET /api/notifications/stats
// @access  Private (Admin)
const getStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const totalNotifications = await Notification.countDocuments();
    const unreadNotifications = await Notification.countDocuments({ read: false });
    const readNotifications = await Notification.countDocuments({ read: true });
    const typeStats = await Notification.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json({
      success: true,
      stats: {
        totalNotifications,
        unreadNotifications,
        readNotifications,
        readPercentage: totalNotifications > 0 ? ((readNotifications / totalNotifications) * 100).toFixed(2) : 0,
        types: typeStats
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  createNotification,
  broadcastNotification,
  getStats
};
