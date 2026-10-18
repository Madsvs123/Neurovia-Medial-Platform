const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header or in cookies
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && (req.cookies.userToken || req.cookies.adminToken || req.cookies.token)) {
      token = req.cookies.userToken || req.cookies.adminToken || req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, no token provided',
        code: 'NO_TOKEN'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded?.id && !decoded?.userId) {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid token payload',
          code: 'INVALID_PAYLOAD'
        });
      }

      const userId = decoded.id || decoded.userId;

      // Get user from the token
      const user = await User.findById(userId).select('-passwordHash -refreshToken');

      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Check if user is active
      if (user.status === 'suspended') {
        return res.status(403).json({ 
          success: false,
          message: 'Account has been suspended',
          code: 'ACCOUNT_SUSPENDED'
        });
      }

      if (user.status !== 'active' && user.status !== 'pending') {
        return res.status(403).json({ 
          success: false,
          message: 'Account is inactive',
          code: 'ACCOUNT_INACTIVE'
        });
      }

      // Attach user and decoded info to request
      req.user = user;
      req.userId = userId;
      req.userRole = user.role;

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
          expiredAt: error.expiredAt
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }

      console.error('Token verification error:', error);
      return res.status(401).json({ 
        success: false,
        message: 'Authentication failed',
        code: 'AUTH_FAILED'
      });
    }
  } catch (error) {
    console.error('Middleware error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error during authentication',
      code: 'SERVER_ERROR'
    });
  }
};

module.exports = authMiddleware;