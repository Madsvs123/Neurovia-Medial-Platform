const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Log user activity
// @route   POST /api/activity-logs
// @access  Private (System)
const logActivity = async (req, res) => {
  try {
    const { action, resourceType, resourceId, metadata = {}, ipAddress, deviceInfo } = req.body;

    if (!action) {
      return res.status(400).json({ message: 'Action is required' });
    }

    // Create activity log
    const activityLog = new ActivityLog({
      userId: req.user.id,
      action,
      resourceType,
      resourceId,
      metadata,
      ipAddress: ipAddress || req.ip,
      deviceInfo: deviceInfo || req.get('User-Agent')
    });

    await activityLog.save();

    res.status(201).json({
      success: true,
      activityLog
    });
  } catch (error) {
    console.error('Log activity error:', error);
    res.status(500).json({ 
      message: 'Server error logging activity',
      error: error.message 
    });
  }
};

// @desc    Get activity logs for current user
// @route   GET /api/activity-logs/me
// @access  Private
const getMyActivityLogs = async (req, res) => {
  try {
    const { action, resourceType, limit = 10, page = 1 } = req.query;

    let query = { userId: req.user.id };

    if (action) {
      query.action = action;
    }

    if (resourceType) {
      query.resourceType = resourceType;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const activityLogs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await ActivityLog.countDocuments(query);

    res.json({
      success: true,
      count: activityLogs.length,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      activityLogs
    });
  } catch (error) {
    console.error('Get my activity logs error:', error);
    res.status(500).json({ 
      message: 'Server error fetching activity logs',
      error: error.message 
    });
  }
};

// @desc    Get activity logs for a specific user (Admin only)
// @route   GET /api/activity-logs/user/:userId
// @access  Private (Admin)
const getActivityLogsByUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view user activity logs'
      });
    }

    const { action, resourceType, limit = 10, page = 1 } = req.query;

    let query = { userId: req.params.userId };

    if (action) {
      query.action = action;
    }

    if (resourceType) {
      query.resourceType = resourceType;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const activityLogs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await ActivityLog.countDocuments(query);

    res.json({
      success: true,
      count: activityLogs.length,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      activityLogs
    });
  } catch (error) {
    console.error('Get activity logs by user error:', error);
    res.status(500).json({ 
      message: 'Server error fetching user activity logs',
      error: error.message 
    });
  }
};

// @desc    Get activity logs for a specific resource
// @route   GET /api/activity-logs/resource/:resourceType/:resourceId
// @access  Private (Admin)
const getActivityLogsByResource = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view resource activity logs'
      });
    }

    const activityLogs = await ActivityLog.find({
      resourceType: req.params.resourceType,
      resourceId: req.params.resourceId
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: activityLogs.length,
      activityLogs
    });
  } catch (error) {
    console.error('Get activity logs by resource error:', error);
    res.status(500).json({ 
      message: 'Server error fetching resource activity logs',
      error: error.message 
    });
  }
};

// @desc    Get recent activity logs (Admin only)
// @route   GET /api/activity-logs/recent
// @access  Private (Admin)
const getRecentActivityLogs = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view recent activity logs'
      });
    }

    const { limit = 20, hours = 24 } = req.query;

    const dateThreshold = new Date();
    dateThreshold.setHours(dateThreshold.getHours() - parseInt(hours));

    const activityLogs = await ActivityLog.find({
      createdAt: { $gte: dateThreshold }
    }).populate('userId', 'username email')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    res.json({
      success: true,
      count: activityLogs.length,
      activityLogs
    });
  } catch (error) {
    console.error('Get recent activity logs error:', error);
    res.status(500).json({ 
      message: 'Server error fetching recent activity logs',
      error: error.message 
    });
  }
};

// @desc    Get activity statistics (Admin only)
// @route   GET /api/activity-logs/stats
// @access  Private (Admin)
const getActivityStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view activity statistics'
      });
    }

    const { timeRange = '7' } = req.query;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - parseInt(timeRange));

    const totalActivities = await ActivityLog.countDocuments({
      createdAt: { $gte: dateThreshold }
    });

    // Get activity distribution by type
    const activityTypeStats = await ActivityLog.aggregate([
      { $match: { createdAt: { $gte: dateThreshold } } },
      { $group: {
        _id: '$action',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get activity distribution by resource type
    const resourceTypeStats = await ActivityLog.aggregate([
      { $match: { createdAt: { $gte: dateThreshold } } },
      { $group: {
        _id: '$resourceType',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get daily activity trends
    const dailyTrends = await ActivityLog.aggregate([
      { $match: { createdAt: { $gte: dateThreshold } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      stats: {
        timeRange: `${timeRange} days`,
        totalActivities,
        activityTypes: activityTypeStats,
        resourceTypes: resourceTypeStats,
        dailyTrends
      }
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({ 
      message: 'Server error fetching activity stats',
      error: error.message 
    });
  }
};

// @desc    Get user engagement statistics (Admin only)
// @route   GET /api/activity-logs/engagement
// @access  Private (Admin)
const getUserEngagementStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to view engagement statistics'
      });
    }

    const { timeRange = '30' } = req.query;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - parseInt(timeRange));

    // Get most active users
    const activeUsers = await ActivityLog.aggregate([
      { $match: { createdAt: { $gte: dateThreshold } } },
      { $group: {
        _id: '$userId',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }},
      { $unwind: '$user' },
      { $project: {
        userId: '$_id',
        username: '$user.username',
        email: '$user.email',
        activityCount: '$count',
        role: '$user.role'
      }}
    ]);

    // Get average activities per user
    const userCount = await User.countDocuments();
    const totalActivities = await ActivityLog.countDocuments({ createdAt: { $gte: dateThreshold } });
    const avgActivitiesPerUser = userCount > 0 ? totalActivities / userCount : 0;

    res.json({
      success: true,
      stats: {
        timeRange: `${timeRange} days`,
        activeUsers: activeUsers.length,
        avgActivitiesPerUser: parseFloat(avgActivitiesPerUser.toFixed(2)),
        topUsers: activeUsers
      }
    });
  } catch (error) {
    console.error('Get user engagement stats error:', error);
    res.status(500).json({ 
      message: 'Server error fetching engagement stats',
      error: error.message 
    });
  }
};

// @desc    Export activity logs (Admin only)
// @route   GET /api/activity-logs/export
// @access  Private (Admin)
const exportActivityLogs = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Not authorized to export activity logs'
      });
    }

    const { startDate, endDate, format = 'json' } = req.query;

    let query = {};
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const activityLogs = await ActivityLog.find(query)
      .populate('userId', 'username email role')
      .sort({ createdAt: -1 });

    if (format === 'json') {
      res.json({
        success: true,
        count: activityLogs.length,
        data: activityLogs
      });
    } else {
      // CSV format
      const csvHeader = 'User,Email,Role,Action,Resource Type,Resource ID,IP Address,Device,Timestamp\n';
      const csvRows = activityLogs.map(log => 
        `"${log.userId?.username || ''}","${log.userId?.email || ''}","${log.userId?.role || ''}","${log.action}","${log.resourceType}","${log.resourceId}","${log.ipAddress}","${log.deviceInfo}","${log.createdAt}"`
      ).join('\n');

      res.header('Content-Type', 'text/csv');
      res.attachment('activity_logs_export.csv');
      res.send(csvHeader + csvRows);
    }
  } catch (error) {
    console.error('Export activity logs error:', error);
    res.status(500).json({ 
      message: 'Server error exporting activity logs',
      error: error.message 
    });
  }
};

module.exports = {
  logActivity,
  getMyActivityLogs,
  getActivityLogsByUser,
  getActivityLogsByResource,
  getRecentActivityLogs,
  getActivityStats,
  getUserEngagementStats,
  exportActivityLogs
};