const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware that optionally extracts the authenticated user.
 * Unlike authMiddleware, it does NOT fail if no token is provided.
 * If a valid token is present, req.user is populated.
 * If not, req.user remains undefined and the request continues.
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;

    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies) {
      token = req.cookies.userToken || req.cookies.adminToken || req.cookies.token;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id || decoded.userId;
      if (userId) {
        const user = await User.findById(userId).select('-passwordHash -refreshToken');
        if (user) {
          req.user = user;
        }
      }
    }
  } catch (e) {
    // Invalid token — just continue without req.user
  }

  next();
};

module.exports = optionalAuth;
