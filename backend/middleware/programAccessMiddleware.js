const ProgramResource = require('../models/ProgramResource');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Middleware that checks if a resource (course/quiz/clinical case) is part of a program.
 * If it is, only users enrolled in that program can access it.
 * Admins and educators bypass the check entirely.
 * If not linked to any program, access is allowed (public resource).
 */
const programAccess = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;

      // Extract user ID from request if available (already authed via previous middleware)
      let userId = req.user?._id || req.user?.id || null;

      if (!userId) {
        // Try from auth header
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (authHeader && authHeader.startsWith('Bearer')) {
          try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded.id || decoded.userId;
          } catch (e) { /* ignore */ }
        } else if (req.cookies) {
          const token = req.cookies.userToken || req.cookies.adminToken || req.cookies.token;
          if (token) {
            try {
              const decoded = jwt.verify(token, process.env.JWT_SECRET);
              userId = decoded.id || decoded.userId;
            } catch (e) { /* ignore */ }
          }
        }
      }

      // If we have a user, check if they're admin/educator — they get full access
      if (userId) {
        try {
          const user = await User.findById(userId).select('role');
          if (user && (user.role === 'admin' || user.role === 'educator')) {
            return next();
          }
        } catch (e) { /* ignore */ }
      }

      // Validate resourceId is a valid ObjectId before querying
      let programLinks = [];
      try {
        const mongoose = require('mongoose');
        if (mongoose.Types.ObjectId.isValid(resourceId)) {
          programLinks = await ProgramResource.find({ resourceType, resourceId }).populate('programId');
        }
      } catch (e) {
        // Ignore query errors — treat as no links
      }

      // Not linked to any program → public access
      if (programLinks.length === 0) {
        return next();
      }

      // Resource is part of a program — check enrollment
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'This content requires enrollment in a program. Please log in.',
          code: 'PROGRAM_ACCESS_REQUIRED'
        });
      }

      const user = await User.findById(userId).select('enrolledPrograms');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const programIds = programLinks.map(link => link.programId._id.toString());
      const userEnrolledIds = user.enrolledPrograms.map(id => id.toString());
      const hasAccess = programIds.some(pid => userEnrolledIds.includes(pid));

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'This content is part of a program. Enroll in the program to access it.',
          code: 'PROGRAM_ENROLLMENT_REQUIRED',
          programIds
        });
      }

      // Check if any linked program is inactive
      const inactiveProgram = programLinks.find(link => !link.programId.active);
      if (inactiveProgram) {
        return res.status(403).json({
          success: false,
          message: 'This content is part of an inactive program and cannot be accessed.',
          code: 'PROGRAM_INACTIVE'
        });
      }

      next();
    } catch (error) {
      console.error('Program access check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking program access'
      });
    }
  };
};

module.exports = programAccess;
